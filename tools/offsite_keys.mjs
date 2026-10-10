// Triple check: recovery keys, tank codes, sign-in tokens and friends all survive the server losing its disk. Uses a fake bucket on :9100.
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const GH = process.env.BACKEND === 'github', store = new Map(); let nsha = 0;
const bucket = GH ? http.createServer((req, res) => {          // a stand-in for GitHub's contents API: files with a sha, raw downloads, updates that must carry the current sha
  const u = new URL(req.url, 'http://x'), key = decodeURIComponent(u.pathname.replace('/repos/me/data/contents/', ''));
  if (req.headers.authorization !== 'Bearer tok') { res.writeHead(401); return res.end(); }
  if (req.method === 'PUT') { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => { const b = JSON.parse(Buffer.concat(c)), ex = store.get(key); if (ex && b.sha !== ex.sha) { res.writeHead(409); return res.end(); } store.set(key, { sha: 'sha' + ++nsha, bytes: Buffer.from(b.content, 'base64') }); res.writeHead(200); res.end('{}'); }); }
  else { const f = store.get(key); if (!f) { res.writeHead(404); return res.end(); } if (/raw/.test(req.headers.accept ?? '')) { res.writeHead(200); res.end(f.bytes); } else { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ sha: f.sha })); } }
}).listen(9100) : http.createServer((req, res) => { const k = req.url; if (req.method === 'PUT') { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => { store.set(k, Buffer.concat(c)); res.writeHead(200); res.end(); }); } else if (store.has(k)) { res.writeHead(200); res.end(store.get(k)); } else { res.writeHead(404); res.end(); } }).listen(9100);
const env = (db) => ({ ...process.env, PORT: '8125', DB: db, ...(GH ? { GITHUB_BACKUP_TOKEN: 'tok', GITHUB_BACKUP_REPO: 'me/data', GITHUB_API: 'http://localhost:9100' } : { S3_ENDPOINT: 'http://localhost:9100', S3_BUCKET: 'bk', S3_KEY: 'K', S3_SECRET: 'S' }) });
const up = async (db) => { for (const x of ['', '-wal', '-shm', '.backup']) fs.rmSync(db + x, { force: true }); const p = spawn('node', ['server/server.mjs'], { env: env(db), stdio: ['ignore', 'pipe', 'pipe'] }); let log = ''; p.stdout.on('data', (d) => (log += d)); p.stderr.on('data', (d) => (log += d)); for (let i = 0; i < 60; i++) { try { if ((await fetch('http://localhost:8125/healthz')).ok) return { p, log: () => log }; } catch { /* waiting */ } await new Promise((r) => setTimeout(r, 200)); } throw new Error('no server: ' + log); };
const call = async (path, body, token) => { const r = await fetch('http://localhost:8125' + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json() }; };
const av = { skin: '#e8b890', hair: '#5a3ad0', hat: null }; let bad = 0; const ck = (n, ok, d = '') => { console.log((ok ? '  ok  ' : '  FAIL ') + n + (d ? ' — ' + d : '')); if (!ok) bad++; };
for (const mode of ['graceful stop (SIGTERM, as on a redeploy)', 'crash (SIGKILL, only the 5-minute copy exists)']) {
  console.log('\n' + mode); store.clear();
  const s1 = await up('/tmp/k1.db');
  const ana = (await call('/api/users', { name: 'Ana', avatar: av })).body, ben = (await call('/api/users', { name: 'Ben', avatar: av })).body;
  const tank = (await call('/api/tanks', { name: 'Kept' }, ana.token)).body; await call('/api/join', { code: tank.code }, ben.token);
  const benKey2 = (await call('/api/recovery', {}, ben.token)).body.key;           // a second key issued later
  if (mode.startsWith('graceful')) { s1.p.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 2500)); } else { await new Promise((r) => setTimeout(r, 24000)); s1.p.kill('SIGKILL'); await new Promise((r) => setTimeout(r, 500)); }
  ck('the ' + (GH ? 'GitHub repo' : 'bucket') + ' holds a copy', [...store.values()].some((b) => (b.length ?? b.bytes?.length) > 500), [...store.values()].map((b) => (b.length ?? b.bytes.length) + ' bytes').join());
  const s2 = await up('/tmp/k2.db');                                              // a new server with an empty disk
  const oldMe = await call('/api/me', null, ana.token); ck("Ana's old sign-in token still works on the new server", oldMe.status === 200 && oldMe.body.tank?.code === tank.code);
  const rec = await call('/api/recover', { key: ana.recoveryKey.toLowerCase() }); ck("Ana's original recovery key signs in", rec.status === 200 && rec.body.userId === ana.userId);
  const me = await call('/api/me', null, rec.body.token); ck('and lands in her tank, same code', me.body.tank?.code === tank.code, me.body.tank?.code);
  ck('using the recovery key retires the old token, as designed', (await call('/api/me', null, ana.token)).status === 401);
  const rec2 = await call('/api/recover', { key: benKey2 }); ck("Ben's later key works", rec2.status === 200 && rec2.body.userId === ben.userId);
  const bm = await call('/api/me', null, rec2.body.token); ck("Ben is still in Ana's tank", bm.body.tank?.code === tank.code);
  const prev = await call('/api/join/preview', { code: tank.code }, rec.body.token); ck('the tank code still finds the tank with both members', prev.status === 200 && prev.body.members.length === 2, prev.body.members?.map((m) => m.name).join(', '));
  ck('a made-up key is still refused', (await call('/api/recover', { key: 'AAAA-BBBB-CCCC-DDDD' })).status === 404);
  s2.p.kill(); await new Promise((r) => setTimeout(r, 500));
}
console.log(bad ? `\n${bad} PROBLEM(S)` : '\nAll keys, codes and members survived both ways'); bucket.close(); process.exit(bad ? 1 : 0);

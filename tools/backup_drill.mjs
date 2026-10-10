// Rehearses what Render does to the server, against a stand-in for GitHub: a restart with a wiped disk, and a redeploy where the new server
// starts before the old one stops (the old one sends its last copy after the new one has already restored the older copy).
// Run: node tools/backup_drill.mjs   (takes about a minute)
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const files = new Map(); let puts = 0;
const gh = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://x').pathname.replace(/^\/repos\/me\/ourtank-data\/contents\//, ''));
  if (req.headers.authorization !== 'Bearer drill') { res.writeHead(401); return res.end(); }
  if (req.method === 'GET') {
    const f = files.get(name); if (!f) { res.writeHead(404); return res.end('{}'); }
    if (/raw/.test(req.headers.accept)) { res.writeHead(200); return res.end(f.bytes); }
    res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ sha: f.sha }));
  }
  if (req.method === 'PUT') { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    const j = JSON.parse(b), cur = files.get(name);
    if (cur && j.sha !== cur.sha) { res.writeHead(409); return res.end('{}'); }                                   // GitHub refuses an update made from an old sha
    const bytes = Buffer.from(j.content, 'base64'), sha = crypto.createHash('sha1').update(bytes).digest('hex'); files.set(name, { sha, bytes }); if (!name.includes('-')) puts++;
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ content: { sha } }));
  }); return; }
  res.writeHead(405); res.end();
});
await new Promise((ok) => gh.listen(0, ok));
const api = `http://127.0.0.1:${gh.address().port}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let nextPort = 18300;
const servers = [];
async function boot(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'drill-')), port = nextPort++, log = [];
  const p = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/server.mjs'], { env: { ...process.env, PORT: String(port), DB: path.join(dir, 'ourtank.db'), GITHUB_BACKUP_TOKEN: 'drill', GITHUB_BACKUP_REPO: 'me/ourtank-data', GITHUB_API: api, HANDOVER_MS: '3000', NO_PROXY: '*' }, stdio: ['ignore', 'pipe', 'pipe'] });
  p.stdout.on('data', (d) => log.push(...d.toString().trim().split('\n').map((l) => `[${label}] ${l}`))); p.stderr.on('data', (d) => log.push(`[${label}] ! ${d.toString().trim()}`));
  const s = { label, port, p, log, url: `http://127.0.0.1:${port}` }; servers.push(s);
  for (let i = 0; i < 100; i++) { try { if ((await fetch(s.url + '/healthz')).ok) return s; } catch { /* still starting */ } await sleep(100); }
  throw new Error(label + ' did not start\n' + log.join('\n'));
}
const stop = (s) => new Promise((ok) => { s.p.once('exit', ok); s.p.kill('SIGTERM'); });
const call = async (s, p, body, token) => { const r = await fetch(s.url + p, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
async function player(s, name) { const u = (await call(s, '/api/users', { name, avatar: { skin: '#e8b890', hair: '#5a3ad0', hat: null } })).body; const t = (await call(s, '/api/tanks', { name: name + ' tank' }, u.token)).body; return { token: u.token, code: t.code ?? t.tank?.code }; }
async function has(s, pl) { const r = await call(s, '/api/me', null, pl.token); return r.status === 200 && r.body?.tank?.code === pl.code; }
const results = []; const check = (what, ok) => { results.push([what, ok]); console.log((ok ? 'PASS ' : 'FAIL ') + what); };

try {
  // 1. A restart on a wiped disk
  const A = await boot('A');
  const p1 = await player(A, 'Ana'); await sleep(9000);                                      // the first copy goes out after the handover
  check('the first copy is sent a few seconds after the first player', puts >= 1);
  const p2 = await player(A, 'Ben');                                                          // made after that copy: only the shutdown copy has it
  await stop(A);
  const B = await boot('B');
  check('after a restart with a wiped disk, the first tank is back under its code', await has(B, p1));
  check('and so is the tank made just before the restart (sent when the server stopped)', await has(B, p2));

  // 2. A redeploy: the new server starts while the old one still runs, and the old one sends its last copy afterwards
  await sleep(9000); const p3 = await player(B, 'Cleo');                                      // after B's first copy, so only B's shutdown copy has Cleo
  const C = await boot('C');
  check('the new server first restores the copy it found (without the newest tank)', !(await has(C, p3)) && await has(C, p1));
  await stop(B);                                                                              // Render stops the old server once the new one is live
  let ok = false; for (let i = 0; i < 60 && !ok; i++) { await sleep(500); try { ok = await has(C, p3); } catch { /* reloading */ } }
  check('the new server notices the old server\'s last copy and loads it: the newest tank is there', ok);
  const p4 = await player(C, 'Dev');
  await stop(C);
  const D = await boot('D');
  check('one more restart: every tank is still there', (await has(D, p1)) && (await has(D, p2)) && (await has(D, p3)) && (await has(D, p4)));
  await stop(D);
} catch (e) { check('drill ran without errors: ' + e.message, false); }
finally { for (const s of servers) if (s.p.exitCode === null) s.p.kill('SIGKILL'); gh.close(); }
const failed = results.filter(([, ok]) => !ok).length;
if (failed) console.log('\n' + servers.flatMap((s) => s.log).join('\n'));
console.log(failed ? `\n${failed} failed` : '\nAll backup checks passed'); process.exit(failed ? 1 : 0);

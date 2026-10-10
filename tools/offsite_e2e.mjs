// Redeploy without a disk: the server stops, the next one starts with an empty folder, and the tank is still there. Uses a fake bucket on :9100.
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const store = new Map();
const bucket = http.createServer((req, res) => { const k = req.url; if (req.method === 'PUT') { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => { store.set(k, Buffer.concat(c)); res.writeHead(200); res.end(); }); } else if (store.has(k)) { res.writeHead(200); res.end(store.get(k)); } else { res.writeHead(404); res.end(); } }).listen(9100);
const env = (db) => ({ ...process.env, PORT: '8125', DB: db, S3_ENDPOINT: 'http://localhost:9100', S3_BUCKET: 'bk', S3_KEY: 'K', S3_SECRET: 'S' });
const up = async (db) => { for (const x of ['', '-wal', '-shm', '.backup']) fs.rmSync(db + x, { force: true }); const p = spawn('node', ['server/server.mjs'], { env: env(db), stdio: ['ignore', 'pipe', 'pipe'] }); let log = ''; p.stdout.on('data', (d) => (log += d)); p.stderr.on('data', (d) => (log += d)); for (let i = 0; i < 60; i++) { try { if ((await fetch('http://localhost:8125/healthz')).ok) return { p, log: () => log }; } catch { /* waiting */ } await new Promise((r) => setTimeout(r, 200)); } throw new Error('no server: ' + log); };
const call = async (path, body, token) => (await fetch('http://localhost:8125' + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined })).json();
let s1 = await up('/tmp/off1.db');
const u = await call('/api/users', { name: 'Ana', avatar: { skin: '#e8b890', hair: '#5a3ad0', hat: null } }); const t = await call('/api/tanks', { name: 'Kept' }, u.token);
console.log('made tank', t.code); s1.p.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 2500));
console.log('bucket holds', [...store.values()].map((b) => b.length + ' bytes').join(', '));
const s2 = await up('/tmp/off2.db');                          // a brand new empty server
const me = await call('/api/me', null, u.token); console.log('after the restart: signed in as', me.user?.name, 'tank', me.tank?.code, me.tank?.name);
console.log(s2.log().split('\n').filter((l) => /offsite/.test(l)).join('\n'));
s2.p.kill(); bucket.close();

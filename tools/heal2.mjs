// The hard cases after the server loses everything. Starts its own server on :8124.
//  1. a phone whose ordinary storage was wiped but whose second store survived
//  2. a phone that lost its sign-in but still has the tank copy, using its recovery key
//  3. a friend's brand-new phone with nothing, joining with the tank code
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import * as R from '../web/src/game/rules.js';
const base = 'http://localhost:8124'; let srv;
const start = async (db) => { for (const x of ['', '-wal', '-shm']) fs.rmSync(db + x, { force: true }); srv = spawn('node', ['server/server.mjs'], { env: { ...process.env, PORT: '8124', DB: db, DEV: '1' }, stdio: 'ignore' }); for (let i = 0; i < 50; i++) { try { if ((await fetch(base + '/healthz')).ok) return; } catch { /* waiting */ } await new Promise((r) => setTimeout(r, 200)); } throw new Error('server did not start'); };
const stop = async () => { srv.kill(); await new Promise((r) => setTimeout(r, 600)); };
const api = async (path, body, token) => (await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) })).json();
let bad = 0; const ck = (n, ok, d = '') => { console.log((ok ? '  ok  ' : '  FAIL ') + n + (d ? ' — ' + d : '')); if (!ok) bad++; };
await start('/tmp/h2a.db');
const av = { skin: '#e8b890', hair: '#5a3ad0', hat: null };
const A = await api('/api/users', { name: 'Ana', avatar: av }), B = await api('/api/users', { name: 'Ben', avatar: av });
const now = Date.now(), world = R.newWorld(now, 3, { empty: true }); world.flags.tut = 5; world.level = 3; world.shells = 77;
['goldfish', 'neon'].forEach((sp, i) => world.fish.push(R.ensureFish({ id: 'f' + (i + 1), name: ['Coral', 'Spark'][i], species: sp, seed: 3 + i, born: now - 9e8, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, appetite: 0.05, owner: null })));
await api('/api/profile', { name: 'Ana', avatar: av }, A.token);
const tank = await api('/api/import', { app: 'our-tank', tank: { name: 'Hard' }, world }, A.token); await api('/api/join', { code: tank.code }, B.token);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const phone = async (u, extra = []) => { const ctx = await b.newContext({ viewport: { width: 390, height: 760 } }); const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('pageerror', e.message)); await p.goto(base + '/?q=1&dev=1'); if (u) { await p.evaluate((s) => { localStorage.setItem('ourtank.session', JSON.stringify(s)); }, { token: u.token, userId: u.userId, recoveryKey: u.recoveryKey }); await p.reload(); await p.waitForFunction(() => window.__game?.state && window.__fishes, null, { timeout: 180000 }); } return p; };
const pa = await phone(A), pb = await phone(B);
await new Promise((r) => setTimeout(r, 7000));                      // let both phones save their copies
const info = (p) => p.evaluate(() => ({ code: window.__game.code, fish: window.__game.state.fish.map((f) => f.name).join(), members: window.__game.members.map((m) => m.name).join() }));
console.log('before:', JSON.stringify(await info(pa)));
// the server forgets everything
await stop(); await start('/tmp/h2b.db');
// 1. Ana's ordinary storage is wiped (as if cleared); only the second store is left
await pa.evaluate(() => { localStorage.clear(); document.cookie = 'ourtank_s=; max-age=0; path=/'; });
await pa.reload(); await pa.waitForFunction(() => window.__game?.state && window.__fishes, null, { timeout: 180000 }).catch(() => {}); await new Promise((r) => setTimeout(r, 3000));
const ia = await pa.evaluate(() => window.__game?.code ? { code: window.__game.code, fish: window.__game.state.fish.map((f) => f.name).join() } : null);
ck("1. Ana's phone (ordinary storage wiped) got the tank back under the same code", ia?.code === tank.code && /Coral/.test(ia?.fish), JSON.stringify(ia));
// 2. Ben lost his sign-in everywhere but the tank copy is still on the phone: he types his recovery key
await pb.evaluate(() => { localStorage.removeItem('ourtank.session'); document.cookie = 'ourtank_s=; max-age=0; path=/'; return new Promise((res) => { const r = indexedDB.open('ourtank', 1); r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); tx.objectStore('kv').delete('ourtank.session'); tx.oncomplete = () => res(); }; r.onerror = () => res(); }); });
await pb.reload(); await pb.waitForSelector('#welcome.on [data-a=recover]', { timeout: 60000 }); await pb.click('[data-a=recover]'); await pb.fill('#rk', B.recoveryKey); await pb.click('#go');
await pb.waitForFunction(() => window.__game?.state && window.__fishes, null, { timeout: 60000 }).catch(() => {}); await new Promise((r) => setTimeout(r, 3000));
const ib = await pb.evaluate(() => window.__game?.code ? { code: window.__game.code, fish: window.__game.state.fish.map((f) => f.name).join(), members: window.__game.members.map((m) => m.name).join() } : null);
ck("2. Ben (signed out, key not known to the new server) got the same tank by his phone's copy", ib?.code === tank.code && /Spark/.test(ib?.fish ?? ''), JSON.stringify(ib));
// 3. a friend on a brand-new phone with nothing joins with the code
const C = await api('/api/users', { name: 'Cleo', avatar: av }); const pc = await phone(null);
await pc.evaluate((s) => { localStorage.setItem('ourtank.session', JSON.stringify(s)); }, { token: C.token, userId: C.userId, recoveryKey: C.recoveryKey });
const join = await api('/api/join', { code: tank.code }, C.token); ck('3. a brand-new phone joins the restored tank with the old code', !!join.id || join.already, JSON.stringify(join).slice(0, 80));
const pv = await api('/api/join/preview', { code: tank.code }, C.token); ck('   and the tank has everyone in it', pv.members?.length === 3, pv.members?.map((m) => m.name).join(', '));
console.log(bad ? `\n${bad} PROBLEM(S)` : '\nAll hard cases recovered'); await b.close(); await stop(); process.exit(bad ? 1 : 0);

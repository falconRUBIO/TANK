// The server loses all its data while two phones are playing: do both phones get the same tank back? (starts its own server on 8124)
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
const base = 'http://localhost:8124'; let srv;
const start = async (db) => { try { fs.rmSync(db, { force: true }); } catch { /* none */ } srv = spawn('node', ['server/server.mjs'], { env: { ...process.env, PORT: '8124', DB: db, DEV: '1' }, stdio: 'ignore' }); for (let i = 0; i < 50; i++) { try { if ((await fetch(base + '/healthz')).ok) return; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 200)); } throw new Error('server did not start'); };
const stop = async () => { srv.kill(); await new Promise((r) => setTimeout(r, 600)); };
const api = async (path, body, token) => (await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) })).json();
await start('/tmp/heal1.db');
const av = { skin: '#e8b890', hair: '#5a3ad0', hat: null };
const A = await api('/api/users', { name: 'Ana', avatar: av }), B = await api('/api/users', { name: 'Ben', avatar: av });
const tank = await api('/api/tanks', { name: 'Heal' }, A.token); await api('/api/join', { code: tank.code }, B.token);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const open = async (u) => { const ctx = await b.newContext({ viewport: { width: 390, height: 760 } }); await ctx.addInitScript(([s, first]) => { if (first) localStorage.setItem('ourtank.session', JSON.stringify(s)); }, [{ token: u.token, userId: u.userId }, true]); const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('pageerror', e.message)); await p.goto(base + '/?q=1&dev=1'); await p.waitForFunction(() => window.__game?.state && window.__fishes, null, { timeout: 180000 }); return p; };
const pa = await open(A); const pb = await open(B);
await pa.evaluate(async () => { const g = window.__game; await g.dispatch({ t: 'tut', step: 5 }); await g.dispatch({ t: 'firstFish', species: 'clownfish', name: 'Coral', seed: 4 }); });
await new Promise((r) => setTimeout(r, 6000));
console.log('before: code', await pa.evaluate(() => window.__game.code), 'fish', await pa.evaluate(() => window.__game.state.fish.length));
await stop(); await start('/tmp/heal2.db');                    // the server forgets everything
await Promise.all([pa.reload(), pb.reload()]);
await Promise.all([pa, pb].map((p) => p.waitForFunction(() => window.__game?.state && window.__fishes, null, { timeout: 180000 })));
await new Promise((r) => setTimeout(r, 4000));
const info = (p) => p.evaluate(() => ({ code: window.__game.code, fish: window.__game.state.fish.map((f) => f.name), members: window.__game.members.map((m) => m.name), modal: document.getElementById('modal').classList.contains('on') }));
console.log('Ana after:', JSON.stringify(await info(pa))); console.log('Ben after:', JSON.stringify(await info(pb)));
await b.close(); await stop();

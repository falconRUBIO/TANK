// The octopus walking (plant, peel, swing) and catching a crab (reach, grip, carry to the beak). Steps the simulation by hand so slow rendering does not matter. OUT=dir node tools/shots_gait.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/gait'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.fish.length = 0; s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: 5, born: Date.now() - 12 * 864e5, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, appetite: 0.05, owner: 'me', ownerName: 'You' }); g.emit('state'); document.querySelectorAll('#goal,#coach,.coach,#toast').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(3000);
const step = (n, dt = 0.05) => p.evaluate(([n, dt]) => { const F = window.__fishes; for (let i = 0; i < n; i++) { F.update(dt, i * dt); F.list.forEach((f) => f.update(dt, Math.random, F.list)); } }, [n, dt]);
// walking
await p.evaluate(() => { const f = window.__fishes.list[0]; f.pos.set(-2.2, 0.6, 1.6); f.vel.set(0, 0, 0); f.heading = 0; f.camoWill = false; for (const m of f.minds) { m.k = 0; m.next = 999; } f.st = { s: 'crawl', t: 999, n: 0, pulse: 0 }; f.target.set(3.5, 0.6, 1.6); window.__cam = [-0.4, 1.6, 6.5, -0.4, 0.8, 1.6]; });
for (let i = 0; i < 4; i++) { await step(14); await p.evaluate(() => { const f = window.__fishes.list[0]; window.__cam = [f.pos.x, 2.0, 12, f.pos.x, 0.9, 1.6]; }); await p.waitForTimeout(2200); await p.screenshot({ path: `${out}/walk_${i}.png` }); }
// the crab
await p.evaluate(() => { const f = window.__fishes.list[0]; f.pos.set(0, 0.6, 1.6); f.vel.set(0, 0, 0); f.heading = 0; f.target.copy(f.pos); f.st = { s: 'rest', t: 999, n: 0, pulse: 0 }; window.__fishes.dropCrab('x1'); const h = f.hunt; h.y = 0.13; h.mesh.position.set(0.9, 0.13, 1.7); h.x = 0.9; h.z = 1.7; window.__cam = [0.5, 2.0, 12, 0.5, 0.9, 1.6]; });
await step(40, 0.05); console.log('state', await p.evaluate(() => { const f = window.__fishes.list[0]; return JSON.stringify([f.st.s, f.st.mode, f.rs.grab && +f.rs.grab.t.toFixed(2), !!f.hunt]); }));
for (let i = 0; i < 6; i++) { await step(i === 0 ? 16 : 8, 0.05); const info = await p.evaluate(() => { const f = window.__fishes.list[0]; return JSON.stringify([f.st.s, f.st.mode, f.rs.grab && +f.rs.grab.t.toFixed(2), !!f.hunt, f.hunt?.held]); }); console.log(i, info); await p.waitForTimeout(2200); await p.screenshot({ path: `${out}/crab_${i}.png` }); }
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

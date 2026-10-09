// Swimming (steer, push, glide, cruise, landing), the dash on two arms, the shell carried in an arm, and the jar's lid gripped. Steps the simulation by hand. OUT=dir node tools/shots_swim.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/swim'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 6; s.shells = 300; s.fish.length = 0; s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: 5, born: Date.now() - 12 * 864e5, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, appetite: 0.05, owner: 'me', ownerName: 'You', bond: { me: 4 } }); g.emit('state'); document.querySelectorAll('#goal,#coach,.coach,#toast').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(3000);
const step = (n, dt = 0.05) => p.evaluate(([n, dt]) => { const F = window.__fishes; for (let i = 0; i < n; i++) { F.update(dt, i * dt); F.list.forEach((f) => f.update(dt, Math.random, F.list)); } }, [n, dt]);
const cam = (x, y) => p.evaluate(([x, y]) => { window.__cam = [x, y + 0.7, 12, x, y, 1.6]; }, [x, y]);
const info = (l) => p.evaluate((l) => { const f = window.__fishes.list[0]; return JSON.stringify([l, f.st.s, f.st.mode, +f.glideK.toFixed(2), +f.cruiseK.toFixed(2), +f.landK.toFixed(2), +f.dashK.toFixed(2), +f.heading.toFixed(2), f.pos.toArray().map((v) => +v.toFixed(2))]); }, l);
const quiet = () => p.evaluate(() => { const f = window.__fishes.list[0]; f.camoWill = false; for (const m of f.minds) { m.k = 0; m.next = 999; } f.blinkNext = 999; });
await quiet();
// swim: facing away, he turns, pushes, glides
await p.evaluate(() => { const f = window.__fishes.list[0]; f.pos.set(-2.4, 3, 1.6); f.vel.set(0, 0, 0); f.heading = Math.PI; f.seeking = false; f.target.set(2.4, 5, 1.6); f.st = { s: 'jet', t: 20, n: 3, pulse: 0 }; });
for (let i = 0; i < 6; i++) { await step(i < 2 ? 8 : 10); console.log(await info('swim' + i)); await cam(await p.evaluate(() => window.__fishes.list[0].pos.x), await p.evaluate(() => window.__fishes.list[0].pos.y)); await p.waitForTimeout(2000); await p.screenshot({ path: `${out}/swim_${i}.png` }); }
// cruise + landing
await step(60); console.log(await info('later'));
await p.evaluate(() => { const f = window.__fishes.list[0]; f.pos.set(0, 2.2, 1.6); f.vel.set(0, -0.5, 0); f.st = { s: 'drift', t: 8, n: 0, pulse: 0 }; }); await step(6); console.log(await info('sinking')); await cam(0, 1.6); await p.waitForTimeout(2000); await p.screenshot({ path: `${out}/cruise.png` });
await p.evaluate(() => { const f = window.__fishes.list[0]; f.pos.set(0, 0.9, 1.6); f.vel.set(0, -0.6, 0); f.st = { s: 'drift', t: 8, n: 0, pulse: 0 }; }); await step(5); console.log(await info('landing')); await cam(0, 0.9); await p.waitForTimeout(2000); await p.screenshot({ path: `${out}/landing.png` });
// dash
await p.evaluate(() => { const f = window.__fishes.list[0]; f.pos.set(-2.4, 0.6, 1.6); f.vel.set(0, 0, 0); f.heading = 0; f.st = { s: 'dash', t: 20, n: 0, pulse: 0 }; f.target.set(3.6, 0.6, 1.6); });
for (let i = 0; i < 3; i++) { await step(14); console.log(await info('dash' + i)); await cam(await p.evaluate(() => window.__fishes.list[0].pos.x), 1.1); await p.waitForTimeout(2000); await p.screenshot({ path: `${out}/dash_${i}.png` }); }
// carrying a shell
await p.evaluate(() => { const f = window.__fishes.list[0]; f.pos.set(-1, 0.6, 1.6); f.vel.set(0, 0, 0); f.heading = 0; f.den = { x: 2.5, z: 1.2, id: 'd' }; f.hoard = 3; f.st = { s: 'crawl', t: 30, n: 0, pulse: 0, mode: 'carry2' }; f.target.set(2.5, 0.6, 2); });
await step(16); console.log(await info('carry')); await cam(await p.evaluate(() => window.__fishes.list[0].pos.x), 1.0); await p.waitForTimeout(2000); await p.screenshot({ path: `${out}/carry.png` });
// the jar lid
await p.evaluate(async () => { await window.__game.dispatch({ t: 'puzzle', id: 'x1' }); });
await p.waitForTimeout(1500);
await p.evaluate(() => { const f = window.__fishes.list[0], j = [...window.__fishes.jars.values()][0]; f.den = null; f.pos.set(j.pos.x - 0.55, 0.6, j.pos.z + 0.7); f.vel.set(0, 0, 0); f.heading = 0; f.st = { s: 'work', t: 1e9, mode: 'jar', n: 0, pulse: 0 }; f.workK = 1; f.restK = 0.7; });
await step(30); console.log(await info('jar')); await p.evaluate(() => { const j = [...window.__fishes.jars.values()][0]; window.__cam = [j.pos.x - 0.3, 1.9, 10, j.pos.x - 0.3, 0.9, j.pos.z]; }); await p.waitForTimeout(2200); await p.screenshot({ path: `${out}/jar.png` });
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

// The octopus's living body: arms with minds, pressing on the glass, moods, den and hoard, and the crab. OUT=dir node tools/shots_octo2.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/octo2'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(async () => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 6; s.shells = 300; s.fish.length = 0; s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: 5, born: Date.now() - 12 * 864e5, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, appetite: 0.05, owner: 'me', ownerName: 'You', bond: { me: 4 }, crabs: 3, solved: 2 }); await g.dispatch({ t: 'buyDecor', type: 'boulder', x: -2.2, z: 0.6, ry: 0 }); await g.dispatch({ t: 'buyDecor', type: 'rock', x: 2.6, z: 1.2, ry: 0 }); g.emit('state'); document.querySelectorAll('#goal,#coach,.coach,#toast').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(3500);
const shot = async (name, cam) => { if (cam !== undefined) await p.evaluate((c) => { window.__cam = c; }, cam); await p.waitForTimeout(2200); await p.screenshot({ path: `${out}/${name}.png` }); };
const info = (label) => p.evaluate((label) => { const f = window.__fishes.list[0]; return JSON.stringify([label, f.st.s, f.st.mode, f.hoard, !!f.den, +f.glassNear.toFixed(2), +f.bump.toFixed(2), Object.fromEntries(Object.entries(f.mw).map(([k, v]) => [k, +v.toFixed(2)]))]); }, label);
// 1. a den with a hoard
await p.evaluate(() => { const f = window.__fishes.list[0]; f.pos.set(1.6, 0.6, 2.2); f.vel.set(0, 0, 0); f.st = { s: 'rest', t: 999, n: 0, pulse: 0 }; f.heading = 0; f.camoWill = false; }); console.log(await info('den')); await shot('1_den', [2.6, 1.8, 6.5, 2.6, 0.5, 1.6]); console.log(await p.evaluate(() => { const f = window.__fishes.list[0]; return JSON.stringify([f.den, !!f.hoardGroup, f.hoardGroup?.children.length, f.hoardGroup?.position.toArray()]); }));
// 2. an arm exploring on its own, one reaching out
await p.evaluate(() => { const f = window.__fishes.list[0]; f.pos.set(0, 0.6, 1.4); f.heading = 0; f.st = { s: 'rest', t: 999, n: 0, pulse: 0 }; f.camoWill = false; f.restK = 1; for (const [i, m] of f.minds.entries()) { if (i === 0 || i === 1 || i === 7) { m.k = 1; m.until = 99; m.x = 3 + 22 * Math.cos(f.rig.arms[i].th + 0.2); m.y = -8.4; m.z = 22 * Math.sin(f.rig.arms[i].th + 0.2); } } }); await shot('2_minds', [0, 2.6, 9, 0, 0.9, 1.4]);
// 3. pressed on the glass
await p.evaluate(() => { const f = window.__fishes.list[0]; for (const m of f.minds) { m.k = 0; m.until = 0; m.next = 99; } f.glassAt = { x: 0.4, y: 4.6, until: performance.now() + 120000 }; f.pos.set(0.3, 4.4, 2.9); f.vel.set(0, 0, 0); window.__cam = null; }); await p.waitForTimeout(6000); console.log(await info('glass')); await shot('3_glass', null);
await p.evaluate(() => { window.__cam = [0.4, 4.8, 12, 0.4, 4.6, 3]; }); await shot('3b_glass_close', [0.4, 4.6, 9.5, 0.4, 4.5, 3]);
// 4. moods
await p.evaluate(() => { const f = window.__fishes.list[0]; f.glassAt = null; f.pos.set(0, 0.6, 1.4); f.st = { s: 'rest', t: 999, n: 0, pulse: 0 }; f.glassNear = 0; f.roll = 0; });
for (const [name, set] of [['scared', (f) => { f.scareT = 30; }], ['annoyed', (f) => { f.scareT = 0; f.annoyT = 30; }], ['hunting', (f) => { f.annoyT = 0; f.hunt = { x: 1, z: 2, mesh: null }; f.st.s = 'rest'; f.st.mode = 'x'; }], ['fond', (f) => { f.hunt = null; f.fondFocus = true; f.st.mode = null; }]]) {
  await p.evaluate(([set]) => { const f = window.__fishes.list[0]; (new Function('f', 'return (' + set + ')(f)'))(f); f.pos.set(0, 0.6, 1.4); f.vel.set(0, 0, 0); f.st.s = 'rest'; f.st.t = 999; f.camoWill = false; window.__cam = [0, 2.2, 8, 0, 0.9, 1.4]; }, [set.toString()]); await p.waitForTimeout(3500); console.log(await info(name)); await p.screenshot({ path: `${out}/4_${name}.png` });
}
// 5. the crab
await p.evaluate(() => { const f = window.__fishes.list[0]; f.hunt = null; f.fondFocus = false; f.scareT = 0; f.annoyT = 0; f.st = { s: 'rest', t: 999, n: 0, pulse: 0 }; f.pos.set(-1, 0.6, 1.2); window.__cam = null; });
const cr = await p.evaluate(() => window.__game.dispatch({ t: 'crab', id: 'x1' })); console.log('crab', JSON.stringify(cr.applied), cr.id); await p.waitForTimeout(3000); await p.screenshot({ path: `${out}/5_crab_falling.png` });
await p.evaluate(() => { const h = window.__fishes.list[0].hunt; if (h) { h.y = 0.13; h.mesh.position.y = 0.13; const f = window.__fishes.list[0]; f.pos.set(h.x - 0.8, 0.6, h.z + 0.3); } window.__cam = h ? [h.x - 0.4, 2.2, 8, h.x - 0.4, 0.8, h.z] : null; }); await p.waitForTimeout(3000); console.log(await info('hunt')); await p.screenshot({ path: `${out}/5_crab_hunt.png` });
await p.waitForTimeout(6000); console.log(await info('after'));
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

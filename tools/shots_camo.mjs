// The octopus matching the ground it rests on, on each floor and beside a rock and a plant. OUT=dir node tools/shots_camo.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/octo'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(async () => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 6; s.shells = 500; s.fish.length = 0; s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: 5, born: Date.now() - 5 * 864e5, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, appetite: 0.05, owner: 'me', ownerName: 'You', bond: { me: 4 } });
  await g.dispatch({ t: 'buyDecor', type: 'rock', x: 2.4, z: 1.2, ry: 0 }).catch(() => {}); g.emit('state'); });
await p.waitForTimeout(2500);
await p.evaluate(() => { document.querySelectorAll('#goal,#coach,.coach,#toast').forEach((e) => (e.style.display = 'none')); });
const spots = await p.evaluate(() => window.__tank.decor.spots().map((s) => [s.type, s.x, s.z])); console.log('decor', JSON.stringify(spots));
for (const fl of ['sand', 'gravel', 'black', 'coral', 'pearl']) {
  await p.evaluate((fl) => { const g = window.__game, s = g.state; s.style = { floor: fl, backdrop: 'candy' }; g.emit('state'); const f = window.__fishes.list[0]; f.pos.set(-1, 0.6, 1.2); f.vel.set(0, 0, 0); f.st = { s: 'rest', t: 80, n: 0, pulse: 0 }; f.restFor = 20; f.camoHold = 40; f.camoNext = 99; f.shy = false; f.inspect = null; f.camoK = 0.94; f.camoKey = null; window.__cam = [-1, 2.2, 9, -1, 0.9, 1.2]; }, fl);
  await p.waitForTimeout(5500); console.log(fl, await p.evaluate(() => { const f = window.__fishes.list[0]; return JSON.stringify([f.camoK, f.camoKey, f.st.s, f.camoApplied, f.camoHold]); })); await p.screenshot({ path: `${out}/camo_${fl}.png` });
}
const sp = spots[0]; if (sp) { await p.evaluate(([x, z]) => { const g = window.__game; g.state.style = { floor: 'sand', backdrop: 'candy' }; g.emit('state'); const f = window.__fishes.list[0]; f.pos.set(x - 0.4, 0.6, z + 0.3); f.vel.set(0, 0, 0); f.st = { s: 'rest', t: 80, n: 0, pulse: 0 }; f.restFor = 20; f.camoHold = 40; f.inspect = null; f.camoK = 0.94; f.camoKey = null; window.__cam = [x, 2.2, 9, x, 0.9, z]; }, [sp[1], sp[2]]); await p.waitForTimeout(5500); await p.screenshot({ path: `${out}/camo_decor.png` }); }
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

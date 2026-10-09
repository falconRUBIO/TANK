// Two seahorses greeting at a plant. OUT=dir node tools/shots_greet.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/octo'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=1&dev=1&tod=morning'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(async () => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 6; s.shells = 200; s.fish.length = 0; for (const [i, n] of ['Ari', 'Bo'].entries()) s.fish.push({ id: 's' + i, name: n, species: 'seahorse', seed: 4 + i * 3, born: Date.now() - 5 * 864e5, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, appetite: 0.05, owner: 'me', ownerName: 'You' }); await g.dispatch({ t: 'buyDecor', type: 'grass', x: 0, z: 1.2, ry: 0 }).catch(() => {}); g.emit('state'); });
await p.waitForTimeout(3000);
await p.evaluate(() => { document.querySelectorAll('#goal,#coach,.coach,#toast').forEach((e) => (e.style.display = 'none')); const F = window.__fishes; F.shT = 0; F.seahorseTick(0.1); window.__cam = [0, 3.2, 12, 0, 2.2, 1.2]; });
await p.waitForTimeout(4500); await p.screenshot({ path: out + '/greet_1.png' });
await p.waitForTimeout(3000); await p.screenshot({ path: out + '/greet_2.png' });
console.log(await p.evaluate(() => JSON.stringify(window.__fishes.list.map((f) => [f.name, !!f.greet, +f.glowK.toFixed(2)]))));
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

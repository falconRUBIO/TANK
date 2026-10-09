// Close side views of chosen species, one at a time. SP=platy,betta OUT=dir node tools/shots_fish1.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/fish1'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
for (const sp of (process.env.SP || 'platy,betta').split(',')) {
  await p.evaluate((sp) => { const g = window.__game, s = g.state; s.flags.tut = 5; s.fish.length = 0; s.fish.push({ id: 'z' + sp, name: 'Zed', species: sp, seed: +(window.__seed || 6), born: Date.now() - 5 * 864e5, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, appetite: 0.05, owner: 'me', ownerName: 'You' }); g.emit('state'); document.querySelectorAll('#goal,#coach,.coach,#toast').forEach((e) => (e.style.display = 'none')); }, sp);
  await p.waitForTimeout(2500);
  await p.evaluate(() => { const f = window.__fishes.list[0]; f.pos.set(0, 5, 1.2); f.vel.set(0, 0, 0); f.heading = 0; f.pitch = 0; f.roll = 0; f.mul = 0; f.target.set(0, 5, 1.2); f.retarget = 999; f.idle = 999; window.__cam = [0, 5.2, 8.2, 0, 5, 1.2]; });
  await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${sp}.png` });
}
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

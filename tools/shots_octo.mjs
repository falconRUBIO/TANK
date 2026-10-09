// The octopus up close in each state: rest, crawl, jet, drift. OUT=dir node tools/shots_octo.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/octo'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate((SEED) => { const g = window.__game, s = g.state; s.flags.tut = 5; s.fish.length = 0; s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: SEED, born: Date.now() - 5 * 864e5, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, appetite: 0.05, owner: 'me', ownerName: 'You' }); g.emit('state'); }, +(process.env.SEED || 7));
await p.waitForTimeout(3000);
await p.evaluate(() => { document.querySelectorAll('#goal,#coach,.coach,#toast').forEach((e) => (e.style.display = 'none')); });
for (const st of (process.env.STATES || 'rest,crawl,jet,drift,wide').split(',')) {
  await p.evaluate((st0) => { const st = st0 === 'wide' ? 'rest' : st0; const f = window.__fishes.list[0]; f.pos.set(0, st === 'jet' ? 4 : 0.6, 1.2); f.vel.set(st === 'jet' ? 1.5 : 0, st === 'jet' ? 0.6 : 0, 0); f.heading = 0; f.st = { s: st, t: 60, n: 0, pulse: 0 }; if (st === 'jet') { f.restK = 0; f.crawlK = 0; f.sq = 0.7; } if (st === 'rest') { f.restK = 1; f.crawlK = 0; } if (st === 'crawl') { f.restK = 0.25; f.crawlK = 1; f.target.set(3, 0.6, 1.2); } if (st === 'drift') { f.restK = 0.2; f.pos.y = 3; }
    window.__cam = st0 === 'wide' ? null : [f.pos.x + 0.3, f.pos.y + 1.0, 13, f.pos.x, f.pos.y + 0.5, 0]; if (st0 === 'wide') { f.pos.set(-1, 0.6, 1.4); f.heading = 0.5; } }, st);
  await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/octo_${process.env.SEED || ''}${st}.png` });
}
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

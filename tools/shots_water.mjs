// The water-change scene at several moments. OUT=dir node tools/shots_water.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/water'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 8; s.water = 0.35; g.emit('state'); document.querySelectorAll('#goal,#coach,.coach,#toast').forEach((e) => e.remove()); window.__changeWater(); });
for (const t of [0.6, 1.1, 1.6, 2.4, 3.3, 4.3, 5.5, 6.3]) { await p.waitForFunction((t) => window.__wc.t >= t || window.__wc.t < 0, t, { timeout: 120000, polling: 50 }); await p.screenshot({ path: `${out}/t${String(t).replace('.', '_')}.png` }); }
await p.waitForFunction(() => !window.__wc.active, null, { timeout: 60000 }); console.log('water after', await p.evaluate(() => window.__game.state.water));
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

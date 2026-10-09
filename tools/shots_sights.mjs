// Screens for the rare passers-by (software WebGL is slow, so each is parked mid-water). OUT=dir node tools/shots_sights.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/shots';
import fs from 'node:fs'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=1&dev=1&tod=' + (process.env.TOD || 'afternoon')); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { document.querySelectorAll('#tip,.tip,#goal').forEach((e) => (e.style.display = 'none')); });
for (const k of ['whale', 'jelly', 'turtle', 'shoal']) {
  await p.evaluate((k) => { window.__sight(k); const s = window.__sights.cur; s.age = 10; s.root.position.x = k === 'shoal' ? -1 : 0; if (k === 'jelly') s.root.position.y = 7; }, k);
  await p.waitForTimeout(1800); await p.screenshot({ path: `${out}/sight_${k}.png` });
}
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

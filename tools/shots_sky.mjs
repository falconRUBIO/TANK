// The sky events: full moon, new moon, spawning night, rain. OUT=dir node tools/shots_sky.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/sky'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const errors = [];
for (const [name, tod, sky] of [['fullmoon', 'night', 'fullmoon'], ['darkmoon', 'night', 'darkmoon'], ['spawn', 'night', 'spawn'], ['rain', 'afternoon', 'rain']]) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`${base}/?q=1&dev=1&tod=${tod}&sky=${sky}`); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
  await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
  await p.evaluate(async () => { const g = window.__game; await g.dispatch({ t: 'tut', step: 5 }); g.state.flags.tut = 5; g.emit('state'); document.querySelectorAll('#goal,#coach,.coach,#toast').forEach((e) => (e.style.display = 'none')); });
  await p.waitForTimeout(9000); await p.screenshot({ path: `${out}/sky_${name}.png` }); await p.context().close();
}
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

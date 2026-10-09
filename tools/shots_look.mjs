// Full tank screens for the look of the scene at each time of day, with a few decorations and two extra fish. OUT=dir node tools/shots_look.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/shots', tods = (process.env.TODS || 'afternoon,evening').split(',');
import fs from 'node:fs'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(async () => { const g = window.__game; await g.dispatch({ t: 'tut', step: 5 }); const s = g.state; s.level = 6; s.shells = 900; s.flags.tut = 5;
  for (const [t, x, z] of [['fern', -3, 1.5], ['grass', -2, 0.8], ['torii', 2.4, 0.4], ['lantern', 3.4, 1.6]]) await g.dispatch({ t: 'buyDecor', type: t, x, z, ry: 0 });
  for (const sp of ['seahorse', 'neon', 'angelfish']) await g.dispatch({ t: 'dev', what: 'fish', species: sp }, { dev: true }).catch(() => {}); g.emit('state'); });
for (const tod of tods) { await p.evaluate((t) => window.__setTod(t), tod); await p.waitForTimeout(6000); await p.evaluate(() => document.querySelectorAll('#goal,#coach,.coach').forEach((e) => (e.style.display = 'none'))); await p.screenshot({ path: `${out}/look_${tod}.png` }); }
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

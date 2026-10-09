// One screenshot per bottom style (solo game). OUT=dir node tools/shots_floors.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/floors'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
for (const f of ['sand', 'pearl', 'gravel', 'black', 'coral']) { await p.evaluate((f) => window.__game.dispatch({ t: 'style', floor: f }), f); await p.waitForTimeout(1800); await p.screenshot({ path: `${out}/${f}.png`, clip: { x: 0, y: 380, width: 390, height: 300 } }); }
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

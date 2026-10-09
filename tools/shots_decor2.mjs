// Close views of chosen decorations. DECOR=pot,coconut OUT=dir node tools/shots_decor2.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/decor2'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(async () => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 8; s.shells = 900; s.fish.length = 0; g.emit('state'); document.querySelectorAll('#goal,#coach,.coach,#toast').forEach((e) => (e.style.display = 'none')); });
for (const t of (process.env.DECOR || 'pot,coconut').split(',')) {
  await p.evaluate(async (t) => { const g = window.__game; g.state.decor.length = 0; await g.dispatch({ t: 'buyDecor', type: t, x: 0, z: 1.4, ry: 0 }); g.emit('state'); window.__cam = [0, 2.2, 7.5, 0, 0.5, 1.4]; }, t);
  await p.waitForTimeout(3500); await p.screenshot({ path: `${out}/${t}.png` });
}
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

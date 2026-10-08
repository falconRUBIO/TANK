import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const out = process.env.OUT || '.';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
for (const tod of ['afternoon']) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 1 })).newPage(); p.on('pageerror', (e) => console.log('pageerror:', e.message));
  await p.goto('http://localhost:8123/?q=1&dev=1&tod=' + tod); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForTimeout(800);
  const d = (a) => p.evaluate((a) => window.__game.dispatch(a, { dev: true }), a);
  await d({ t: 'tut', step: 5 }); for (let i = 0; i < 3; i++) await d({ t: 'dev', what: 'shells' });
  for (const s of [3, 41, 77]) await d({ t: 'buyFish', species: 'goldfish', name: 'G' + s, seed: s, rush: true });
  for (const sp of ['cory', 'betta']) await d({ t: 'buyFish', species: sp, name: 'S' + sp, seed: 9, rush: true });
  for (const [t, x, z] of [['fern', -2.4, 1.5], ['grass', 2.4, 1.5], ['rock', 0.4, 2.7]]) await d({ t: 'buyDecor', type: t, x, z, ry: 0, free: true });
  await d({ t: 'dev', what: 'egg' }); await d({ t: 'dev', what: 'visitor' });
  await p.waitForTimeout(3000); await p.evaluate(() => document.getElementById('mok')?.click()); await p.waitForTimeout(9000);
  await p.screenshot({ path: `${out}/n_${tod}.png` });
  await p.close();
}
await b.close(); console.log('FINISHED');

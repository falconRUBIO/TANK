import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const out = process.env.OUT || '.';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
for (const tod of ['afternoon']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('pageerror:', e.message));
  await p.goto('http://localhost:8123/?q=1&dev=1&tod=' + tod); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForTimeout(800);
  await p.evaluate(() => window.__game.dispatch({ t: 'tut', step: 5 }));
  await p.waitForTimeout(5000); await p.screenshot({ path: `${out}/bg_${tod}_empty.png` });
  if (tod === 'afternoon') {
    const placed = await p.evaluate(async () => { const g = window.__game, o = []; for (const [t, x, z] of [['fern', -2.4, 1.5], ['grass', 2.4, 1.5], ['rock', 0.4, 2.7], ['starfish', -0.8, 2.7], ['moss', 3.2, 2.7]]) o.push((await g.dispatch({ t: 'buyDecor', type: t, x, z, ry: 0, free: true })).ok); return [o, g.state.shells]; });
    console.log('starter placed', JSON.stringify(placed)); await p.waitForTimeout(4000); await p.screenshot({ path: `${out}/bg_${tod}_starter.png` });
  }
  await ctx.close();
}
await b.close(); console.log('FINISHED');

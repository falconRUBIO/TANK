import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:8123/?lite=1&dev=1'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForTimeout(600);
await p.evaluate(async () => { const g = window.__game; g.state.level = 8; for (let i = 0; i < 6; i++) await g.dispatch({ t: 'dev', what: 'shells' }, { dev: true }); for (const sp of ['neon', 'goldfish', 'cory', 'blue', 'betta', 'guppy']) await g.dispatch({ t: 'buyFish', species: sp, name: 'T', seed: 3, rush: true }, { dev: true });
  for (const [t, x, z] of [['fern', -2.4, 1.5], ['rock', 0.4, 2.7], ['wood', 2.4, 0.3]]) await g.dispatch({ t: 'buyDecor', type: t, x, z, ry: 0, free: false }, { dev: true }); });
await p.waitForTimeout(1500);
const r = await p.evaluate(() => { const o = window.__sim(1800, 1 / 30, [[5, 0]]); o.tr = window.__tank.fishes.map((f) => [f.name, f.profile.traits.join('+'), f.tmul?.toFixed(2), f.pos.z.toFixed(1), f.pos.y.toFixed(1)].join(' ')); return o; });
console.log(JSON.stringify(r)); console.log('errors', errs.length, errs.slice(0, 2).join('|')); console.log('FINISHED'); await b.close();

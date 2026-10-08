import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage();
p.on('pageerror', (e) => console.log('pageerror:', e.message));
await p.goto('http://localhost:8123/?lite=1&dev=1'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForTimeout(600);
await p.evaluate(async () => { const g = window.__game; g.state.level = 8; for (let i = 0; i < 4; i++) await g.dispatch({ t: 'dev', what: 'shells' }, { dev: true }); for (const sp of ['neon', 'goldfish', 'guppy', 'betta']) await g.dispatch({ t: 'buyFish', species: sp, name: 'T', seed: 3, rush: true }, { dev: true }); });
await p.waitForTimeout(1500);
const r = await p.evaluate(() => { const o = []; for (const at of [0, 120, 240]) { o.push(null); } return window.__sim(600, 1 / 30, [[5, 0]]); });
console.log(JSON.stringify(r)); await b.close();

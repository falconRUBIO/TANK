import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const [,, url, file, w = '1000', h = '900', full = '1'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }).catch(async () => chromium.launch());
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
p.on('console', (m) => console.log('console:', m.text()));
p.on('pageerror', (e) => console.log('pageerror:', e.message));
await p.goto(url); await p.waitForTimeout(1500);
await p.screenshot({ path: file, fullPage: full === '1' });
await b.close();

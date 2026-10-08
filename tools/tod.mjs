import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:8123/?lite=1'); await p.waitForSelector('#modal.on #mok', { timeout: 60000 }); await p.click('#mok'); await p.waitForTimeout(800);
console.log('picker visible:', await p.evaluate(() => { const e = document.querySelector('.tod'); return !!(e.offsetWidth || e.offsetHeight); }), 'errors:', errs.length);
await b.close(); console.log('FINISHED');

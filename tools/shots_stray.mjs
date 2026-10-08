import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage();
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForTimeout(6000);
await p.screenshot({ path: (process.env.OUT || '.') + '/stray_fixed.png', clip: { x: 0, y: 420, width: 390, height: 300 } }); console.log('FINISHED'); await b.close();

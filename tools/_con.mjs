const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const logs = []; p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.text().slice(0, 900)); }); p.on('pageerror', (e) => logs.push('PAGEERR ' + e.message));
await p.goto('http://localhost:8123/?q=2&dev=1'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForFunction(() => window.__booted, null, { timeout: 120000 }); await p.waitForTimeout(6000);
console.log(logs.filter((l) => !/favicon|404/.test(l)).slice(0, 6).join('\n---\n')); await b.close();

const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 640, height: 480 }, deviceScaleFactor: 2 })).newPage();
const svg = (await import('node:fs')).readFileSync('web/logo.svg', 'utf8');
await p.setContent(`<body style="margin:0;background:linear-gradient(#fdf3e4,#f6e3c8);display:flex;align-items:center;justify-content:center;height:480px">${svg}</body>`);
await p.waitForTimeout(500); await p.screenshot({ path: 'docs/audit/logo_v1.png' }); await b.close();

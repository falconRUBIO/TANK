// the app icons from logo.svg: cream ground, the mark centered, at 512, 192 and 180 (apple touch)
const fs = await import('node:fs'); const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const svg = fs.readFileSync('web/logo.svg', 'utf8').replace(/viewBox="[^"]+" width="\d+" height="\d+"/, 'viewBox="36 -14 448 420" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"');      // cropped to the mark
for (const [size, out] of [[512, 'web/icon-512.png'], [192, 'web/icon-192.png'], [180, 'web/apple-touch-icon.png']]) {
  const p = await (await b.newContext({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })).newPage();
  await p.setContent(`<body style="margin:0;width:${size}px;height:${size}px;background:radial-gradient(90% 70% at 50% 30%,#fff6e6,#f4dfc0);display:flex;align-items:center;justify-content:center;overflow:hidden"><div style="width:${Math.round(size * 0.9)}px;height:${Math.round(size * 0.9)}px">${svg}</div></body>`);
  await p.waitForTimeout(300); await p.screenshot({ path: out, omitBackground: false }); await p.close(); }
await b.close(); console.log('icons');

// A sheet of caretakers: every hair style, hat, top and extra, for checking the people art. Needs the server on 8124. OUT=file node tools/gallery_people.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const out = process.env.OUT || '/tmp/people_gallery.png';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 1000, height: 900 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://localhost:8124/privacy.html');
await p.evaluate(async () => {
  const { drawAvatar } = await import('/src/people.js'); const A = await import('/src/game/avatar.js');
  document.body.innerHTML = ''; document.body.style.cssText = 'margin:0;background:#16314a;display:flex;flex-wrap:wrap;gap:6px;padding:8px';
  const looks = [];
  A.HAIR_STYLES.forEach(([k], i) => looks.push({ hairStyle: k, skin: A.SKINS[i + 1], hair: A.HAIR_COLORS[i], top: A.PALETTE[i], topStyle: 'tee' }));
  A.HAT_STYLES.forEach(([k], i) => looks.push({ hatStyle: k, hat: A.PALETTE[(i * 5) % 12], skin: A.SKINS[(i * 3) % 8], hair: A.HAIR_COLORS[(i + 2) % 10], hairStyle: ['short', 'long', 'curly', 'bun', 'spiky', 'buzz', 'short', 'long'][i], top: A.PALETTE[(i * 7 + 3) % 12] }));
  A.TOP_STYLES.forEach(([k], i) => looks.push({ topStyle: k, top: A.PALETTE[(i * 4 + 1) % 12], skin: A.SKINS[(i * 2 + 1) % 8], hair: A.HAIR_COLORS[(i + 4) % 10], hairStyle: ['bun', 'short', 'long', 'buzz', 'curly', 'spiky'][i] }));
  A.EXTRAS.forEach(([k], i) => looks.push({ extra: k, skin: A.SKINS[(i * 3 + 2) % 8], hairStyle: ['short', 'long', 'curly', 'bun', 'spiky'][i], hair: A.HAIR_COLORS[(i * 3) % 10], top: A.PALETTE[(i * 5 + 2) % 12] }));
  looks.push({ skin: '#b06a42', hair: '#222222', hat: '#56703a' });                       // an old look
  for (const l of looks) { const c = document.createElement('canvas'); drawAvatar(c, l); c.style.cssText = `width:${c.width * 2.4}px;height:${c.height * 2.4}px;image-rendering:pixelated;background:radial-gradient(circle at 50% 35%,#4fa6c8,#1d4a6a);border-radius:18px`; document.body.append(c); }
});
await p.waitForTimeout(500); await p.screenshot({ path: out, fullPage: true }); console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

// Makes the home-screen icons from the game's own octopus sprite: a coral octopus over lit water and sand.
// Needs the server on 8124. MODE=try OUT=file shows angle choices; without MODE it writes web/icon-512.png, web/icon-192.png and web/apple-touch-icon.png.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 1100, height: 600 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://localhost:8124/privacy.html');
const yaw = +(process.env.YAW ?? -0.785), pitch = +(process.env.PITCH ?? 0);
const urls = await p.evaluate(async ({ mode, yaw, pitch }) => {
  const { Fish } = await import('/src/voxel.js'); const { SPECIES } = await import('/src/species.js');
  const octo = new Fish(SPECIES.octopus, 7, { pal: 0 });
  const icon = (S, y, pt) => {
    const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, S); bg.addColorStop(0, '#7fd6ec'); bg.addColorStop(0.45, '#2f8fb8'); bg.addColorStop(1, '#14507a'); g.fillStyle = bg; g.fillRect(0, 0, S, S);
    g.save(); g.globalAlpha = 0.13; g.fillStyle = '#ffffff'; for (const [x, w] of [[0.12, 0.09], [0.36, 0.06], [0.6, 0.1], [0.84, 0.05]]) { g.beginPath(); g.moveTo(S * x, 0); g.lineTo(S * (x + w), 0); g.lineTo(S * (x + w - 0.16), S); g.lineTo(S * (x - 0.16), S); g.fill(); } g.restore();
    const sand = g.createLinearGradient(0, S * 0.8, 0, S); sand.addColorStop(0, '#f2d9a0'); sand.addColorStop(1, '#d9b46e'); g.fillStyle = sand; g.beginPath(); g.moveTo(0, S * 0.84); g.quadraticCurveTo(S * 0.5, S * 0.76, S, S * 0.86); g.lineTo(S, S); g.lineTo(0, S); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; for (const [x, yy, r] of [[0.16, 0.3, 0.025], [0.2, 0.2, 0.016], [0.83, 0.26, 0.02], [0.8, 0.16, 0.013]]) { g.beginPath(); g.arc(S * x, S * yy, S * r, 0, 7); g.fill(); }
    const f = octo.frame({ yaw: y, pitch: pt }); const d = f.getContext('2d').getImageData(0, 0, f.width, f.height).data; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let yy = 0; yy < f.height; yy++) for (let x = 0; x < f.width; x++) if (d[(yy * f.width + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); }
    const w = x1 - x0 + 1, h = y1 - y0 + 1, k = Math.max(1, Math.floor(Math.min((S * 1.02) / w, (S * 0.64) / h))), dx = Math.round((S - w * k) / 2), dy = Math.round(S * 0.86 - h * k);
    g.fillStyle = 'rgba(10,40,60,.25)'; g.beginPath(); g.ellipse(S / 2, S * 0.87, w * k * 0.42, S * 0.03, 0, 0, 7); g.fill();
    g.imageSmoothingEnabled = false; g.drawImage(f, x0, y0, w, h, dx, dy, w * k, h * k); return c.toDataURL('image/png');
  };
  if (mode === 'try') return [-1.57, -1.18, -0.785, -0.39, 0, 0.785].map((y) => icon(256, y, 0));
  return [icon(512, yaw, pitch), icon(192, yaw, pitch), icon(180, yaw, pitch)];
}, { mode: process.env.MODE, yaw, pitch });
if (process.env.MODE === 'try') { await p.setContent(`<body style="margin:0;background:#222;display:flex;gap:8px;flex-wrap:wrap">${urls.map((u, i) => `<div style="color:#fff;font:12px sans-serif"><img src="${u}" width="256"><br>${[-1.57, -1.18, -0.785, -0.39, 0, 0.785][i]}</div>`).join('')}</body>`); await p.screenshot({ path: process.env.OUT || '/tmp/icon_try.png' }); }
else { const save = (u, f) => fs.writeFileSync(f, Buffer.from(u.split(',')[1], 'base64')); save(urls[0], 'web/icon-512.png'); save(urls[1], 'web/icon-192.png'); save(urls[2], 'web/apple-touch-icon.png'); console.log('icons written'); }
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

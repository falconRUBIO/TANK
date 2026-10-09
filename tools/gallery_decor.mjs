// Thumbnails of decorations, to look at the set. OUT=file node tools/gallery_decor.mjs [types...]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/decor.png', only = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 1000, height: 700 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=1&dev=1'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 });
const imgs = await p.evaluate(async (only) => { const m = await import('/src/w3/thumbs.js'), r = await import('/src/game/rules.js'); const o = []; for (const k of Object.keys(r.DECOR_DEF)) { if (only.length && !only.includes(k)) continue; try { o.push([k, r.DECOR_DEF[k].label, m.decorThumb(k)]); } catch (e) { o.push([k, k + ' FAILED', '']); } } return o; }, only);
await p.setContent(`<body style="margin:0;background:#2a7aa8;display:grid;grid-template-columns:repeat(7,140px);gap:4px;padding:6px;font:11px sans-serif;color:#fff">${imgs.map(([k, l, u]) => `<div style="text-align:center"><img src="${u}" width=130 height=130><br>${l}</div>`).join('')}</body>`);
await p.setViewportSize({ width: 1000, height: Math.ceil(imgs.length / 7) * 160 + 20 }); await p.screenshot({ path: out }); console.log(errors.length ? 'errors: ' + errors.join('; ') : 'ok', imgs.length); await b.close();

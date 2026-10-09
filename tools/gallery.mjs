// Every species as a sprite on one sheet, to look at the roster. OUT=file node tools/gallery.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/gallery.png';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 900, height: 640 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=1&dev=1'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 });
const urls = await p.evaluate(async () => { const m = await import('/src/w3/thumbs.js'), sp = await import('/src/species.js'); const o = {}; for (const k of Object.keys(sp.SPECIES)) { try { o[k] = [sp.SPECIES[k].label, m.fishThumb(k)]; } catch (e) { o[k] = [k + ' FAILED ' + e.message, '']; } } return o; });
await p.setContent(`<body style="margin:0;background:#2a7aa8;display:grid;grid-template-columns:repeat(5,170px);gap:6px;padding:10px;font:12px sans-serif;color:#fff">${Object.entries(urls).map(([k, [l, u]]) => `<div style="text-align:center"><img src="${u}" width=160 height=160 style="image-rendering:pixelated"><br>${l}</div>`).join('')}</body>`);
await p.screenshot({ path: out }); console.log(errors.length ? 'errors: ' + errors.join('; ') : 'ok', Object.keys(urls).length); await b.close();

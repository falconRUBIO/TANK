// The hatch reveal and rare-color thumbnails, on screen: a golden baby starts dark and comes up gold; its thumbnail is gold too.
// Needs the solo game on 8123.   node tools/reveal_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/reveal'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; s.level = 6; s.fish.length = 0; s.visitAt = s.eggAt = now + 9e9; s.dilemmaAt = now + 9e9; s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] }; s.goalOffer = []; s.goal = null;
  s.fish.push({ id: 'k1', name: 'Sunny', species: 'goldfish', sex: 'm', seed: 5, born: now - 12 * D, stage: 'adult', traits: ['Calm'], gen: 1, parents: [{ id: 'x', name: 'Amy' }], happy: 0.9, health: 1, genes: { dh: 0, ds: 1, dl: 1, size: 1, m: ['gold', 'gold'] } });
  s.decor.length = 0; g.emit('state'); document.querySelectorAll('#coach,#toast,#goal,#quest').forEach((e) => (e.style.display = 'none')); for (const b of document.querySelectorAll('#modal.on #mok')) b.click(); });
await p.waitForTimeout(2500); await p.evaluate(() => { window.__cam = [0, 4, 9, 0, 4, 0]; const f = window.__fishes.byId.get('k1'); f.pos.set(0, 4, 2); f.target.set(0, 4, 2); f.retarget = 30; });
await p.waitForTimeout(1500);
const lum = async () => p.evaluate(() => { const f = window.__fishes.byId.get('k1'), a = f.mesh.instanceColor.array; let s = 0; for (const v of a) s += v; return +(s / a.length).toFixed(3); });
const before = await lum(); await p.evaluate(() => window.__reveal('k1', 15000)); await p.waitForTimeout(1500); const dark = await lum(); await p.screenshot({ path: `${out}/dark.png`, timeout: 120000 }).catch(() => {});
await p.waitForTimeout(22000); const after = await lum(); await p.screenshot({ path: `${out}/gold.png`, timeout: 120000 }).catch(() => {});
ck('the baby starts as a dark little shape and its colors come back up', dark < before * 0.3 && Math.abs(after - before) < 0.02, { before, dark, after });
const th = await p.evaluate(async () => { const { fishThumb } = await import('/src/w3/thumbs.js'); const plain = fishThumb('goldfish'), gold = fishThumb('goldfish', null, 'gold'); const px = (url) => new Promise((ok) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, 160, 160).data; let r = 0, b = 0, n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { r += d[i]; b += d[i + 2]; n++; } ok({ r: Math.round(r / n), b: Math.round(b / n) }); }; im.src = url; }); return { plain: await px(plain), gold: await px(gold), differ: plain !== gold }; });
ck('a golden fish has a golden thumbnail', th.differ && th.gold.r > th.gold.b, th);
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Reveal checks passed'); process.exit(fails ? 1 : 0);

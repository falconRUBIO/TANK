// The journal's photographer, in the real game: for each kind of moment (one fish, two friends, the octopus, a seahorse, the eggs) the
// photo is staged from the animal's good side, sharp on the subject with the background soft, never dark or blown out, and never empty.
// Saves the pictures for a look. Needs the solo game on 8123.   node tools/photo_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/photos'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5, A = { born: now - 20 * D, stage: 'adult', happy: 0.9, health: 1, hunger: 0.1 }; s.flags.tut = 5; s.level = 8; s.visitAt = s.eggAt = now + 9e9; s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] }; s.fish.length = 0;
  s.fish.push({ ...A, id: 'f1', name: 'Goldie', species: 'goldfish', seed: 3, traits: ['Calm'] }, { ...A, id: 'f2', name: 'Bubbles', species: 'angelfish', seed: 9, traits: ['Social'], pal: 'f1' }, { ...A, id: 'o1', name: 'Inky', species: 'octopus', seed: 5, traits: ['Curious'], owner: 'me', home: 'c1' }, { ...A, id: 's1', name: 'Coral', species: 'seahorse', seed: 4, sex: 'm', traits: ['Calm'] }, { ...A, id: 'f3', name: 'Neo', species: 'neon', seed: 2, traits: [] });
  s.decor.length = 0; s.decor.push({ id: 'c1', type: 'coconut', x: 2, z: 0.6, ry: 0 }, { id: 'p1', type: 'grass', x: -2.4, z: 0.2, ry: 0 }, { id: 'p2', type: 'kelp', x: -0.4, z: -1.6, ry: 0 }, { id: 'r1', type: 'rock', x: 3.4, z: -1.2, ry: 0 }); g.emit('state');
  document.querySelectorAll('#goal,#coach,#toast').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(6000);
const lines = [['one', 'Goldie spent most of the day by the grass, as if keeping it company.'], ['two', 'Goldie and Bubbles are friends now.'], ['octo', 'Inky worked out the puzzle jar.'], ['sea', 'Coral tried a new holdfast today: the grass.'], ['small', 'Neo swam right up to Inky and looked it in the eye.']];
for (const [k, text] of lines) {
  const r = await p.evaluate(async (text) => { const img = window.__shootText(text); if (!img) return { why: (window.__shotWhy ?? []).join(',') }; const im = new Image(); im.src = img; await im.decode(); const c = document.createElement('canvas'); c.width = 48; c.height = 36; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 48, 36); const d = g.getImageData(0, 0, 48, 36).data; let L = 0, hi = 0, lo = 0; for (let i = 0; i < d.length; i += 4) { const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; L += l; if (l > 245) hi++; if (l < 12) lo++; } const n = d.length / 4; return { img, mean: Math.round(L / n), blown: +(hi / n).toFixed(2), black: +(lo / n).toFixed(2) }; }, text);
  if (r?.img) fs.writeFileSync(`${out}/${k}.jpg`, Buffer.from(r.img.split(',')[1], 'base64'));
  ck(`${k}: a staged photo, well exposed`, r && r.img && r.mean > 60 && r.mean < 215 && r.blown < 0.2 && r.black < 0.2, r && (r.img ? { mean: r.mean, blown: r.blown, black: r.black } : r));
  await p.waitForTimeout(1500);
}
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Photo checks passed'); process.exit(fails ? 1 : 0);

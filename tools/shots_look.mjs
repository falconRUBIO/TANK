// A furnished tank at each time of day, plus a close look at the sand and a zoomed fish, for art review. OUT=dir node tools/shots_look.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const OUT = process.env.OUT || '/tmp/look'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.addInitScript(() => setInterval(() => { const m = document.getElementById('modal'); if (m && m.classList.contains('on') && /^A GIFT FOR YOU|^LEVEL/.test(m.querySelector('h2')?.textContent || '')) document.getElementById('mok').click(); }, 500));
await p.goto('http://localhost:8123/?q=2&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state && window.__fishes?.list?.length, null, { timeout: 120000 }); await p.waitForTimeout(1500);
await p.evaluate(async () => {
  const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 6; s.shells = 100;
  const add = (sp, i, tr) => s.fish.push({ id: 'x' + i, name: 'F' + i, species: sp, seed: 11 + i * 7, born: Date.now() - 9 * 864e5, stage: 'adult', traits: tr, happy: 0.85, health: 1, appetite: 0 });
  ['goldfish', 'guppy', 'angelfish', 'blue', 'seahorse', 'neon', 'neon', 'platy'].forEach((sp, i) => add(sp, i, ['Curious']));
  s.decor.length = 0; [['grass', -3.6, 0.6], ['fern', 3.4, 0.4], ['rock', -2.2, 2.0], ['starfish', 0.6, 2.6], ['starfish', -1.2, 2.9], ['coconut', 2.4, 1.2], ['anemone', -0.4, 1.0], ['table', 1.2, -0.4], ['lantern', -3.2, 2.4], ['bubbler', 3.6, 2.2], ['brain', -1.6, -0.6], ['kelp', 0.2, -0.8]].forEach(([t, x, z], i) => s.decor.push({ id: 'd' + i, type: t, x, z, ry: 0 }));
  g.emit('state'); await new Promise((r) => setTimeout(r, 2500)); for (const id of ['coach', 'goal', 'settle', 'toast']) document.getElementById(id).style.visibility = 'hidden';
});
for (const tod of ['morning', 'afternoon', 'evening', 'night']) { await p.evaluate((tod) => document.querySelector(`[data-tod=${tod}]`)?.click(), tod); await p.waitForTimeout(3500); await p.screenshot({ path: `${OUT}/tod_${tod}.png` }); }
await p.evaluate(() => document.querySelector('[data-tod=afternoon]')?.click()); await p.evaluate(() => { window.__cam = [0, 2.6, 12, 0, 0.9, 1.2]; }); await p.waitForTimeout(3000); await p.screenshot({ path: `${OUT}/sand_close.png` });
await p.evaluate(() => { window.__cam = [2.2, 1.6, 8, 0.6, 0.4, 2.4]; }); await p.waitForTimeout(3000); await p.screenshot({ path: `${OUT}/starfish.png` });
await p.evaluate(() => { window.__cam = null; window.__focus(2); }); await p.waitForTimeout(3000); await p.screenshot({ path: `${OUT}/fish_zoom.png` });
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

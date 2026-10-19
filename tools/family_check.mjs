// The family gallery, in the real game: the Field Guide lists every animal bred here by generation, with its color and parents, and
// Share makes one picture of it. Needs the solo game on 8123.   node tools/family_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/family'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; s.level = 6; s.fish.length = 0; s.visitAt = s.eggAt = now + 9e9; s.dilemmaAt = now + 9e9; s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] };
  const P = [{ id: 'a1', name: 'Amy' }, { id: 'b1', name: 'Bob' }];
  s.fish.push({ id: 'a1', name: 'Amy', species: 'goldfish', sex: 'f', seed: 3, born: now - 30 * D, stage: 'adult', traits: ['Calm'], happy: 0.9, health: 1 }, { id: 'b1', name: 'Bob', species: 'goldfish', sex: 'm', seed: 4, born: now - 30 * D, stage: 'adult', traits: ['Calm'], happy: 0.9, health: 1 },
    { id: 'k1', name: 'Sunny', species: 'goldfish', sex: 'm', seed: 5, born: now - 12 * D, stage: 'adult', traits: ['Playful'], raisedAs: 'Playful', gen: 1, parents: P, happy: 0.9, health: 1, genes: { dh: 0, ds: 1, dl: 1, size: 1, m: ['gold', 'gold'] } }, { id: 'k2', name: 'Pip', species: 'goldfish', sex: 'f', seed: 6, born: now - 2 * D, stage: 'baby', traits: [], gen: 2, parents: [{ id: 'k1', name: 'Sunny' }, { id: 'a1', name: 'Amy' }], happy: 0.9, health: 1 });
  s.decor.length = 0; g.emit('state'); document.querySelectorAll('#coach,#toast').forEach((e) => (e.style.display = 'none')); for (const b of document.querySelectorAll('#modal.on #mok')) b.click(); });
await p.waitForTimeout(2500); await p.evaluate(() => document.querySelectorAll('#modal').forEach((m) => m.classList.remove('on')));
await p.evaluate(() => { window.__ui.open('friends'); }); await p.waitForTimeout(400); await p.evaluate(() => document.querySelector('#sheet [data-sub="book"]')?.click()); await p.waitForTimeout(900);
const f = await p.evaluate(() => ({ gens: [...document.querySelectorAll('#sheet small.gen')].map((x) => x.textContent), cards: [...document.querySelectorAll('#sheet .fam div')].map((x) => x.className + ':' + x.textContent) }));
ck('the Field Guide lists everyone bred here, by generation, with color, raising and parents', f.gens.join() === 'Generation 1,Generation 2' && f.cards.some((x) => /rare/.test(x) && /Sunny/.test(x) && /Golden/.test(x) && /playful/.test(x) && /Amy & Bob/.test(x)) && f.cards.some((x) => /Pip/.test(x) && /Sunny & Amy/.test(x)), f);
await p.evaluate(() => document.querySelector('#sheet .fam')?.scrollIntoView()); await p.screenshot({ path: `${out}/family.png`, timeout: 120000 }).catch(() => {});
await p.evaluate(() => document.querySelector('#sheet [data-act="famshare"]')?.click()); await p.waitForSelector('#modal.on .pcprev img', { timeout: 60000 }).catch(() => {});
const sh = await p.evaluate(() => ({ modal: document.getElementById('modal').classList.contains('on'), img: !!document.querySelector('#modal .pcprev img') }));
ck('Share makes one picture of the family', sh.modal && sh.img, sh);
await p.screenshot({ path: `${out}/share.png`, timeout: 120000 }).catch(() => {});
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Family checks passed'); process.exit(fails ? 1 : 0);

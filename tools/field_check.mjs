// The Field Guide, in the real game: a behavior seen while the tank is open fills its page once, with the photo of that very moment, and the
// Collection tab shows the pages seen first and the rest as hints. Needs the solo game on 8123.   node tools/field_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/field'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; s.level = 6; s.fish.length = 0; s.visitAt = s.eggAt = now + 9e9; s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] };
  s.fish.push({ id: 'o1', name: 'Inky', species: 'octopus', seed: 5, born: now - 20 * D, stage: 'adult', traits: ['Curious'], happy: 0.9, health: 1, hunger: 0.1, owner: 'me' }, { id: 'g1', name: 'Goldie', species: 'goldfish', seed: 3, born: now - 20 * D, stage: 'adult', traits: ['Calm'], happy: 0.9, health: 1 });
  s.decor.length = 0; s.decor.push({ id: 'p1', type: 'grass', x: -2, z: 0.2, ry: 0 }); g.emit('state'); document.querySelectorAll('#goal,#coach,#toast').forEach((e) => (e.style.display = 'none')); for (const b of document.querySelectorAll('#modal.on #mok')) b.click(); });
await p.waitForTimeout(3000);
const r = await p.evaluate(async () => { const g = window.__game, r1 = await g.dispatch({ t: 'octoMoment', fish: 'o1', kind: 'lion' }); const r2 = await g.dispatch({ t: 'moment', fish: 'g1', kind: 'glass' }); return { f: g.state.field, j: g.journal.slice(-6).map((e) => e.text) }; });
ck('two behaviors seen: two pages filled, with who and the line', r.f?.lion?.name === 'Inky' && !r.f.lion.by && r.f?.glass?.name === 'Goldie' && /stiff/.test(r.f.lion.text ?? ''), r.f);
ck('the journal says which page', r.j.some((x) => /Field Guide, page 1 of 21: Lionfish impression\.$/.test(x)) && r.j.some((x) => /page 2 of 21: Face at the glass/.test(x)), r.j);
const again = await p.evaluate(async () => { const g = window.__game; g.state.fish[0].moments = {}; await g.dispatch({ t: 'octoMoment', fish: 'o1', kind: 'lion' }); return g.journal.filter((e) => /Field Guide/.test(e.text)).length; });
ck('seen again: no second page', again === 2, again);
await p.waitForTimeout(6000);
await p.evaluate(() => { window.__ui.open('book'); }); await p.waitForTimeout(400); await p.evaluate(() => 0); await p.waitForTimeout(800);
const page = await p.evaluate(() => ({ head: document.querySelector('#sheet .fghead span')?.textContent, seen: [...document.querySelectorAll('#sheet .fg:not(.nope)')].map((c) => ({ t: c.querySelector('b').textContent, img: !!c.querySelector('img') })), hints: document.querySelectorAll('#sheet .fg.nope').length }));
await p.screenshot({ path: `${out}/guide.png`, timeout: 120000 }).catch(() => {});
ck('Collection shows the Field Guide: 2 of 21, the seen pages first with their photos, the rest as hints', page.head === '2 of 21 seen' && page.seen.length === 2 && page.seen.some((x) => x.img) && page.hints === 19, page);
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Field Guide checks passed'); process.exit(fails ? 1 : 0);

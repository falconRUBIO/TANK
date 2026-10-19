// Breeding, in the real game: a golden fish shows its color, a carrier's card says what it carries and offers to pair it, with the odds,
// and pairing them is accepted. Needs the solo game on 8123.   node tools/breed_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/breed'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; s.level = 6; s.fish.length = 0; s.visitAt = s.eggAt = now + 9e9; s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] };
  const G = (m) => ({ dh: 0, ds: 1, dl: 1, size: 1, m }); s.fish.push({ id: 'a1', name: 'Amy', species: 'goldfish', sex: 'f', seed: 3, born: now - 20 * D, stage: 'adult', traits: ['Calm'], happy: 0.9, health: 1, genes: G(['gold', 'n']) }, { id: 'b1', name: 'Bob', species: 'goldfish', sex: 'm', seed: 4, born: now - 20 * D, stage: 'adult', traits: ['Calm'], happy: 0.9, health: 1, genes: G(['gold', 'n']) }, { id: 'c1', name: 'Sunny', species: 'goldfish', sex: 'm', seed: 5, born: now - 20 * D, stage: 'adult', traits: ['Calm'], happy: 0.9, health: 1, genes: G(['gold', 'gold']) });
  s.decor.length = 0; g.emit('state'); document.querySelectorAll('#goal,#coach,#toast').forEach((e) => (e.style.display = 'none')); for (const b of document.querySelectorAll('#modal.on #mok')) b.click(); });
await p.waitForTimeout(3000);
await p.evaluate(() => { window.__game.profTab = 'over'; window.__focus(window.__fishes.list.indexOf(window.__fishes.byId.get('a1'))); }); await p.waitForTimeout(1500);
const c = await p.evaluate(() => ({ genes: document.querySelector('#card .genes')?.textContent ?? '', pairs: [...document.querySelectorAll('#card [data-pair]')].map((b) => b.textContent) }));
ck('a carrier says what it carries, and offers its mates with the odds', /Carries golden/.test(c.genes) && c.pairs.some((x) => /Bob.*25% golden/.test(x)) && c.pairs.some((x) => /Sunny.*50% golden/.test(x)), c);
await p.screenshot({ path: `${out}/card.png`, timeout: 120000 }).catch(() => {});
await p.evaluate(() => [...document.querySelectorAll('#card [data-pair]')].find((b) => /Bob/.test(b.textContent))?.click()); await p.waitForTimeout(800);
const m = await p.evaluate(() => window.__game.state.match); ck('pairing them is accepted', m?.a === 'a1' && m?.b === 'b1', m);
await p.evaluate(() => { window.__focus(window.__fishes.list.indexOf(window.__fishes.byId.get('c1'))); }); await p.waitForTimeout(1500);
const g2 = await p.evaluate(() => document.querySelector('#card .genes')?.textContent ?? ''); ck('a golden fish says so', /Golden/.test(g2), g2);
await p.screenshot({ path: `${out}/golden.png`, timeout: 120000 }).catch(() => {});
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Breeding checks passed'); process.exit(fails ? 1 : 0);

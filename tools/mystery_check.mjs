// The daily mystery, in the real game: a glow on the sand where today's mystery is, a tap on it plays it out once (a journal line, the
// glow goes), and Care's Coming up says what it was. Needs the solo game on 8123.   node tools/mystery_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/mystery'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; s.level = 6; s.fish.length = 0; s.visitAt = s.eggAt = now + 9e9; s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] };
  s.fish.push({ id: 'o1', name: 'Inky', species: 'octopus', seed: 5, born: now - 20 * D, stage: 'adult', traits: ['Curious'], happy: 0.9, health: 1, hunger: 0.1, owner: 'me' }, { id: 'g1', name: 'Goldie', species: 'goldfish', seed: 3, born: now - 20 * D, stage: 'adult', traits: ['Calm'], happy: 0.9, health: 1 });
  s.decor.length = 0; s.decor.push({ id: 'p1', type: 'grass', x: -2, z: 0.2, ry: 0 }); g.emit('state'); document.querySelectorAll('#goal,#coach,#toast').forEach((e) => (e.style.display = 'none')); for (const b of document.querySelectorAll('#modal.on #mok')) b.click(); });
await p.waitForTimeout(3000);
await p.evaluate(() => { const g = window.__game; g.state.myst = null; g.state.mystNext = null; return g.dispatch({ t: 'observe', key: 'watch' }); }).catch(() => {});
await p.waitForFunction(() => window.__mystery?.().v, null, { timeout: 60000 }).catch(() => {});
const a = await p.evaluate(() => window.__mystery()); ck('today has a mystery, glowing on the sand where it is', a.v && a.m && !a.m.done && Math.abs(a.at[0] - a.m.x) < 0.01 && a.at[1] > 0, a);
await p.evaluate(() => { window.__ui.open('care'); }); await p.waitForTimeout(600);
const c1 = await p.evaluate(() => document.querySelector('#sheet .soon')?.textContent ?? ''); ck('Coming up points to it', /Tap the glow to find out/.test(c1), c1.slice(0, 160));
await p.evaluate(() => window.__ui.close?.()); await p.keyboard.press('Escape');
await p.evaluate(() => window.__openMystery()); await p.waitForFunction(() => window.__game.state.myst?.done, null, { timeout: 60000 });
const r = await p.evaluate(() => ({ m: window.__game.state.myst, j: window.__game.journal.slice(-3).map((e) => e.text) })); ck('tapped: it plays out once, in the journal', r.m.done && r.m.line && r.j.includes(r.m.line), r);
const again = await p.evaluate(async () => (await window.__game.dispatch({ t: 'mystery' })).applied); ck('only once', again === false, again);
await p.waitForFunction(() => !window.__mystery().v, null, { timeout: 60000 }).catch(() => {}); ck('the glow fades away', !(await p.evaluate(() => window.__mystery().v)));
await p.evaluate(() => { window.__ui.open('care'); }); await p.waitForTimeout(600);
const c2 = await p.evaluate(() => document.querySelector('#sheet .soon')?.textContent ?? ''); ck('Coming up says what it was', c2.includes(r.m.line) && /found/.test(c2), c2.slice(0, 200));
await p.screenshot({ path: `${out}/care.png`, timeout: 120000 }).catch(() => {});
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Daily mystery checks passed'); process.exit(fails ? 1 : 0);

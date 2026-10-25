// Decisions, in the real game: one arrives in Care with its three choices, choosing one plays it out in the journal and it goes.
// Needs the solo game on 8123.   node tools/dilemma_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/dilemma'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; s.level = 6; s.fish.length = 0; s.visitAt = s.eggAt = now + 9e9; s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] }; s.shells = 40;
  s.fish.push({ id: 'g1', name: 'Goldie', species: 'goldfish', seed: 3, born: now - 20 * D, stage: 'adult', traits: ['Calm'], happy: 0.9, health: 1, ail: 2 * 86400 }, { id: 'g2', name: 'Pip', species: 'goldfish', seed: 4, born: now - 20 * D, stage: 'adult', traits: ['Calm'], happy: 0.9, health: 1 });
  s.decor.length = 0; s.dilemma = null; s.dilemmaAt = now - 1; s.omen = { kind: 'sick', fish: ['g1'], at: now - 864e5 }; g.emit('state'); document.querySelectorAll('#goal,#coach,#toast').forEach((e) => (e.style.display = 'none')); for (const b of document.querySelectorAll('#modal.on #mok')) b.click(); });
await p.evaluate(() => window.__game.dispatch({ t: 'observe', key: 'watch' })).catch(() => {});
await p.waitForFunction(() => window.__game.state.dilemma, null, { timeout: 60000 }).catch(() => {});
await p.evaluate(() => { window.__ui.open('care'); }); await p.waitForTimeout(800);
const c = await p.evaluate(() => ({ text: document.querySelector('#sheet .dcard .dq')?.textContent, opts: [...document.querySelectorAll('#sheet [data-dpick]')].map((b) => b.textContent) }));
ck('a decision waits in Care with three choices', !!c.text && c.opts.length === 3, c);
await p.screenshot({ path: `${out}/care.png`, timeout: 120000 }).catch(() => {});
await p.evaluate(() => { const g = window.__game, o = g.dispatch.bind(g); window.__decided = []; g.dispatch = async (a) => { const r = await o(a); if (a.t === 'decide') window.__decided.push({ a, r }); return r; }; document.querySelector('#sheet [data-dpick]')?.click(); }); await p.waitForTimeout(300);
const conf = await p.evaluate(() => { const c = document.querySelector('#sheet .dconfirm'); const st = c ? { decide: c.dataset.decide, disabled: c.disabled, text: c.textContent } : 'no confirm button'; c?.click(); return st; }); await p.waitForFunction(() => window.__game.state.dilemma?.done, null, { timeout: 60000 }).catch(() => {});
console.log('  confirm:', JSON.stringify(conf), 'decided:', JSON.stringify(await p.evaluate(() => window.__decided)));
const r = await p.evaluate(() => ({ d: window.__game.state.dilemma, j: window.__game.journal.slice(-2).map((e) => e.text), card: !!document.querySelector('#sheet .dilemma') }));
ck('choosing plays it out in the journal, and the card goes', r.d?.done && r.j.some((x) => /You chose|chose/.test(x)) && !r.card, r);
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Decision checks passed'); process.exit(fails ? 1 : 0);

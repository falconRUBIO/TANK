// The Field Guide is back (Daily Discovery and the living Field Guide): a remarkable moment writes its own journal line and fills its Field
// Guide page with the animal that did it, and the Guide tab shows the Field Guide beside the kinds met. Needs the solo game on 8123.   node tools/field_check.mjs
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
ck('two moments seen: each writes its journal line and fills its Field Guide page with the animal that did it', r.f?.lion?.fish === 'o1' && r.f?.glass?.fish === 'g1' && r.j.some((x) => /stiff/.test(x)) && r.j.some((x) => /up to the glass/.test(x)), r);
ck('nothing mentions the Field Guide', !r.j.some((x) => /Field Guide/.test(x)), r.j);
await p.waitForTimeout(1500);
await p.evaluate(() => { window.__ui.open('book'); }); await p.waitForTimeout(1200);
const page = await p.evaluate(() => ({ text: document.querySelector('#sheet')?.innerText ?? '', fg: document.querySelectorAll('#sheet .fg').length }));
await p.screenshot({ path: `${out}/collection.png`, timeout: 120000 }).catch(() => {});
ck('the Guide tab shows the Field Guide beside the kinds met', /Field Guide/i.test(page.text) && /Species and decorations/.test(page.text), page.text.slice(0, 300));
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Field Guide checks passed'); process.exit(fails ? 1 : 0);

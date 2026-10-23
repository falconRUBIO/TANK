// The everyday loop, the way a player meets it: what Care says first, feeding an octopus from its card, what a greyed-out button says,
// a hungry octopus coming to the glass, and the octopus's own moments in the welcome back. Needs the solo game on 8123. node tools/loop_check.mjs OUTDIR
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');      // (CI points PW_MODULE at its own playwright)
import fs from 'node:fs';
const out = process.argv[2] || '/tmp/loop'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 760 } }); const p = await ctx.newPage(); const errors = []; let fails = 0;
p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && /^(fish|tank|frame|sync|water change) error/.test(m.text())) errors.push(m.text()); });
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto('http://localhost:8123/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
const setup = (hunger) => p.evaluate((hunger) => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 4; s.fish.length = 0; s.hunger = 0; s.water = 1; s.glass = 0; const born = Date.now() - 12 * 864e5;
  s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: 5, born, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, owner: 'me', ownerName: 'You', hunger, puzzleAt: Date.now() - 3600e3 });
  g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); }, hunger);
const careText = async () => { await p.evaluate(() => window.__ui.open('care')); await p.waitForTimeout(400); return p.evaluate(() => { const rows = (q) => [...document.querySelectorAll(q)].map((r) => r.querySelector('b')?.textContent + ' | ' + (r.querySelector('small')?.textContent ?? '')); return { due: rows('#sheet .crow.due, #sheet .crow.hot'), later: rows('#sheet .crow:not(.due):not(.hot)'), treat: /Crab treat/.test(document.querySelector('#sheet')?.textContent ?? '') }; }); };      // (Care is rows now: what needs you, then what is fine and when it is next due; the old one-line headline is gone)
// 1. Care leads with the one thing that matters, and there is no separate crab treat
await setup(0.6); let c = await careText(); await p.screenshot({ path: `${out}/care_hungry.png` });
ck('Care leads with feeding when the octopus is hungry, as a row that needs you', c.due.some((x) => /^Feed \| /.test(x)), JSON.stringify(c));
ck('there is no separate "crab treat" any more', !c.treat);
await setup(0.02); c = await careText(); await p.screenshot({ path: `${out}/care_done.png` });
ck('when all is done, nothing needs you and Feed says when it is next due', !c.due.some((x) => /^Feed/.test(x)) && c.later.some((x) => /^Feed \| .*next/.test(x)), JSON.stringify(c));
// 2. feeding from the card
await setup(0.6); await p.evaluate(() => window.__ui.open('tank')); await p.waitForTimeout(300);
await p.evaluate(() => { window.__focus(window.__fishes.list.indexOf(window.__fishes.byId.get('x1'))); document.getElementById('fishpill')?.onclick?.(); }); await p.waitForTimeout(900);
let card = await p.evaluate(() => ({ feed: document.querySelector('#crabt')?.textContent ?? null, treat: /Crab treat/.test(document.querySelector('#card')?.textContent ?? ''), puzzle: [...document.querySelectorAll('#card .act2')].map((x) => x.textContent).find((t) => /Puzzle/.test(t)) ?? null }));
await p.screenshot({ path: `${out}/card_hungry.png` });
ck('a hungry octopus\'s card offers "Feed Inky a crab"', /Feed Inky a crab/.test(card.feed ?? '') && /hungry now/.test(card.feed ?? '') && !card.treat, JSON.stringify(card));
ck('a resting puzzle jar says why and when, not just "resting"', /tired of puzzles · next in/.test(card.puzzle ?? ''), card.puzzle);
const before = await p.evaluate(() => { const f = window.__game.state.fish.find((x) => x.id === 'x1'); return { hunger: f.hunger, crabs: f.crabs ?? 0, shells: window.__game.state.shells }; });
await p.evaluate(() => { document.getElementById('modal')?.classList.remove('on'); document.getElementById('crabt')?.click(); }); await p.waitForTimeout(1500);
const after = await p.evaluate(() => { const f = window.__game.state.fish.find((x) => x.id === 'x1'); return { hunger: f.hunger, crabs: f.crabs ?? 0, shells: window.__game.state.shells, crabsInTank: (window.__fishes.crabs ?? []).length, journal: window.__game.journal.slice(-3).map((e) => e.text) }; });
ck('tapping it feeds the octopus a crab in front of it: less hungry, a crab caught, a shell earned, nothing spent', after.hunger < before.hunger - 0.3 && after.crabs === before.crabs + 1 && after.shells >= before.shells && after.crabsInTank >= 1, JSON.stringify({ before, after }));
ck('its first crab is written in the journal', after.journal.some((t) => /caught its first crab/.test(t)), JSON.stringify(after.journal));
await p.evaluate(() => { const g = window.__game; g.state.fish.find((x) => x.id === 'x1').hunger = 0.02; g.emit('state'); window.__focus(null); }); await p.waitForTimeout(300);
await p.evaluate(() => { window.__focus(window.__fishes.list.indexOf(window.__fishes.byId.get('x1'))); document.getElementById('fishpill')?.onclick?.(); }); await p.waitForTimeout(900);
card = await p.evaluate(() => [...document.querySelectorAll('#card .act2')].map((x) => [x.textContent, x.disabled]).find(([t]) => /Crab/.test(t)) ?? null);
ck('fed, the card says it is not hungry yet and when it will be', !!card && card[1] && /not hungry yet · in/.test(card[0]), JSON.stringify(card));
// 3. Feed when it is not hungry: says when it will be, not just "full"
const msg = await p.evaluate(async () => { const said = []; const was = window.__ui.toast; window.__ui.toast = (t, ...a) => { said.push(t); return was(t, ...a); }; await window.__dropFoodForTest?.(0); window.__ui.toast = was; return said.find((t) => /hungry/.test(t)) ?? said.join(' | '); });
ck('feeding a crab to an octopus that is not hungry says when it will be', /isn't hungry yet\. Ready for a crab/.test(msg ?? ''), msg);
// 4. a hungry octopus comes to the front and watches you
await setup(0.78); await p.waitForTimeout(1500);      // hungry: it asks at the glass first (badly starved, past about 0.8, it only lies listless)
const beg = await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('x1'); f.profile = F.profileOf(window.__game.state.fish.find((x) => x.id === 'x1'), window.__game.state); f.begCool = 0; f.glassAt = null; f.st = { s: 'rest', t: 0, n: 0, pulse: 0, mode: null }; let got = null;
  for (let i = 0; i < 2400 && !got; i++) { if (f.st?.s === 'rest' && f.st.t > 0.5) f.st.t = 0; F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); if (f.glassAt && /Watching you for a crab/.test(f.actText ?? '')) got = { i, mood: f.profile.mood }; }
  return got ?? { mood: f.profile?.mood, s: f.st?.s, mode: f.st?.mode, hunt: !!f.hunt, crabs: (F.crabs ?? []).length, inspect: !!f.inspect, task: !!f.task, shy: f.shy, lead: f.lead, glass: f.glassAt, beg: f.begCool, at: [+f.pos.x.toFixed(1), +f.pos.y.toFixed(1), +f.pos.z.toFixed(1)] }; });
ck('a hungry octopus comes to the glass and watches you for a crab', beg?.i != null, JSON.stringify(beg));
// 5. the welcome back leads with the octopus's moments
await setup(0.02);
await p.evaluate(() => { const g = window.__game, now = Date.now(); g.journal.push({ day: 1, text: 'A plant grew a little.', ts: now - 60e3, userId: 'me' }, { day: 1, text: 'Inky smacked Nori with an arm for coming too close.', ts: now - 50e3, userId: 'me' }, { day: 1, text: 'Inky put its arms out stiff and passed for a lionfish.', ts: now - 40e3, userId: 'me' }); g.save?.(); for (const k of Object.keys(localStorage)) if (/seen/.test(k)) localStorage.setItem(k, String(now - 3 * 3600e3)); });
await p.addInitScript(() => { try { localStorage.setItem('ourtank.seen.solo', String(Date.now() - 3 * 3600e3)); } catch { /* none */ } }); await p.reload(); await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 });
await p.waitForFunction(() => window.__booted, null, { timeout: 120000 }).catch(() => {}); await p.waitForTimeout(3000); const tankFree = await p.evaluate(() => !document.querySelector('#modal.on, #reunion.on')); await p.evaluate(() => window.__ui.open('notices')); await p.waitForTimeout(800);
const rj = await p.evaluate(() => document.querySelector('#sheet .awayl')?.textContent ?? null);      // (the news is in Today now; nothing replays it over the tank)
ck('coming back, nothing covers the tank', tankFree);
await p.screenshot({ path: `${out}/welcome_back.png` });
ck('Today\'s While you were away has what the octopus got up to', !!rj && /smacked Nori/.test(rj) && /lionfish/.test(rj), (rj ?? '').slice(0, 220));
ck('no page errors', errors.length === 0, errors.join('; '));
console.log(fails ? `${fails} failed` : 'Loop checks passed'); await b.close(); process.exit(fails ? 1 : 0);

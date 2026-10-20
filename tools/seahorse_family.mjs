// Seahorse families in the real game (solo, on the real clock): a paired male part way through his pregnancy has a brood pouch as full as
// his pregnancy (and the female has none); on his due time he gives birth while the phone watches: he lets go, his pouch contracts and the
// brood comes out of it; the birth is written once; the nursery shows three tracked babies and a light swarm; when they are ready the choice
// comes up, needs a confirmation, and keeps exactly one baby, with its parents and birth date on its profile; the others leave.
// Only the times in the tank record are moved forward for the drill; the lifecycle itself is the game's own.
// Needs the solo game on 8123. OUT=dir node tools/seahorse_family.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');      // (CI points PW_MODULE at its own playwright)
import fs from 'node:fs';
const OUT = process.env.OUT || '/tmp/family'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 })).newPage(); const errors = []; let fails = 0;
p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && /error/.test(m.text()) && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 200)); });
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
const until = async (fn, secs = 90) => { for (let i = 0; i < secs * 2; i++) { const v = await p.evaluate(fn).catch(() => null); if (v) return v; await p.waitForTimeout(500); } return null; };      // (a machine without a graphics chip draws about one frame a second: wait for things rather than for a fixed time)
const hide = async () => { for (let i = 0; i < 4; i++) { const t = await p.evaluate(() => document.querySelector('#modal.on h2')?.textContent || (/A GIFT FOR YOU/i.test(document.querySelector('#modal.on')?.textContent ?? '') ? 'GIFT' : '')); if (!t || /READY|KEEP/i.test(t)) break; await p.evaluate(() => document.querySelector('#modal.on #mok')?.click()); await p.waitForTimeout(400); } await p.evaluate(() => document.querySelectorAll('#coach,#toast,#settle,#reunion,#goal').forEach((e) => (e.style.display = 'none'))); };      // (a daily gift may show first)
await p.goto('http://localhost:8123/?q=1&dev=1&tod=noon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(1500);
await p.evaluate(() => document.querySelector('#modal')?.classList.remove('on'));
const D = 864e5;
await p.evaluate((D) => { const g = window.__game, s = g.state, now = Date.now(); s.flags.tut = 5; s.level = 8; s.hunger = 0.1; s.fish.length = 0; s.decor.length = 0; const born = now - 20 * D;
  s.fish.push({ id: 'h1', name: 'Sunny', species: 'seahorse', seed: 4, born, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, sex: 'm', mate: 'h2', pairedAt: now - 6 * D, preg: { start: now - 3.5 * D, due: now + 3.5 * D, mother: 'h2', ma: { id: 'h2', name: 'Pearl', seed: 11, traits: ['Shy'], genes: null, gen: 0, parents: [] }, seed: 123457, n: 13 } },
    { id: 'h2', name: 'Pearl', species: 'seahorse', seed: 11, born, stage: 'adult', traits: ['Shy'], happy: 0.8, health: 1, sex: 'f', mate: 'h1', pairedAt: now - 6 * D });
  s.decor.push({ id: 'p1', type: 'kelp', x: -2.4, z: 2.0, ry: 0 }, { id: 'p2', type: 'grass', x: -0.6, z: 2.2, ry: 0 }, { id: 'p3', type: 'sword', x: 1.2, z: 2.1, ry: 0 }, { id: 'p4', type: 'fern', x: 2.6, z: 1.8, ry: 0 }, { id: 'p5', type: 'red', x: 0.3, z: 0.4, ry: 0 });
  g.emit('state'); }, D);
await hide(); await until(() => window.__fishes.byId.get('h1')?.brood != null);
// the pouch, half way and nearly full; none on the female
const pouch = () => p.evaluate(() => { const F = window.__fishes, out = {}; for (const id of ['h1', 'h2']) { const f = F.byId.get(id); out[id] = { brood: +(f?.brood ?? 0).toFixed(2), shown: f ? f.vox.filter((v) => v.tag === 'pouch' && (f.brood ?? 0) >= v.pk).length : -1, all: f ? f.vox.filter((v) => v.tag === 'pouch').length : -1 }; } return out; });
const half = await pouch();
await p.evaluate(() => window.__focus(window.__fishes.list.indexOf(window.__fishes.byId.get('h1')))); await p.waitForTimeout(1800); await hide(); await p.screenshot({ path: `${OUT}/1_pouch_half.png` });
await p.evaluate((D) => { const s = window.__game.state, m = s.fish.find((f) => f.id === 'h1'), now = Date.now(); m.preg.start = now - 6.8 * D; m.preg.due = now + 0.2 * D; window.__game.emit('state'); }, D); await until(() => (window.__fishes.byId.get('h1')?.brood ?? 0) > 0.9);
const full = await pouch(); await hide(); await p.screenshot({ path: `${OUT}/2_pouch_full.png` });
console.log('  pouch', JSON.stringify({ half, full }));
ck('a pregnant male has a brood pouch, fuller as his pregnancy goes on', half.h1.shown > 0 && full.h1.shown > half.h1.shown && half.h1.brood > 0.4 && half.h1.brood < 0.6 && full.h1.brood > 0.9, { half: half.h1, full: full.h1 });
ck('the female has none', half.h2.shown === 0 && full.h2.shown === 0, { half: half.h2, full: full.h2 });
// the birth, on his due time, while this phone watches
await p.evaluate(() => { const s = window.__game.state, m = s.fish.find((f) => f.id === 'h1'); m.preg.due = Date.now() + 2500; window.__game.emit('state'); });
await until(() => window.__nursery?.id && (window.__nursery.fry.some((f) => f.out) || window.__fishes.byId.get('h1')?.birthT > 0)); await until(() => window.__nursery.fry.filter((f) => f.out).length >= 3, 60); await hide(); await p.screenshot({ path: `${OUT}/3_birth.png` });
const b1 = await p.evaluate(() => { const g = window.__game, s = g.state, F = window.__fishes, dad = F.byId.get('h1'); return { nursery: s.nursery && { id: s.nursery.id, n: s.nursery.n, cands: s.nursery.cands.length, ready: s.nursery.readyAt - s.nursery.born }, preg: s.fish.find((f) => f.id === 'h1').preg, births: g.journal.filter((j) => /gave birth/.test(j.text)).length, birthT: +(dad?.birthT ?? 0).toFixed(1), held: !!dad?.holdfast?.on, sawBirth: !!window.__sawBirth, tracked: F.list.filter((f) => f.nursery).map((f) => +(f.growth ?? 0).toFixed(2)) }; });
await until(() => window.__nursery.fry.every((f) => f.out), 240); await p.evaluate(() => window.__focus(null)); await p.waitForTimeout(1500); await hide(); await p.screenshot({ path: `${OUT}/4_nursery.png` });
const b2 = await p.evaluate(() => { const g = window.__game, s = g.state; return { id: s.nursery?.id, births: g.journal.filter((j) => /gave birth/.test(j.text)).length, fry: window.__nursery?.fry?.length ?? -1, out: (window.__nursery?.fry ?? []).filter((f) => f.out).length }; });
console.log('  birth', JSON.stringify({ b1, b2 }));
ck('he gives birth on his due time: the pregnancy ends, the nursery begins with three tracked babies and the rest of the brood', b1.nursery && b1.nursery.cands === 3 && b1.preg == null && b1.nursery.n >= 10 && b1.nursery.n <= 15 && b1.nursery.ready === 5 * 864e5, b1);
ck('this phone sees it happen: he lets go and the brood comes out of his pouch', (b1.birthT > 0 || b1.sawBirth) && !b1.held && b2.fry === b1.nursery.n - 3 && b2.out === b2.fry, { birthT: b1.birthT, saw: b1.sawBirth, held: b1.held, fry: b2.fry, out: b2.out });
ck('the three tracked babies swim in the tank, tiny', b1.tracked.length === 3 && b1.tracked.every((k) => k < 0.4), b1.tracked);
ck('the birth is written once, and never happens twice', b1.births === 1 && b2.births === 1 && b2.id === b1.nursery.id, { first: b1.births, later: b2.births });
// the babies eat: food dropped near them, and the tracked ones catch the tiniest bits themselves (stepped quickly, without drawing)
const fed = await p.evaluate(() => { const F = window.__fishes, kids = F.list.filter((f) => f.nursery); for (const k of kids) k.meals = 0;
  const drops = []; for (let i = 0; i < 6; i++) for (const k of kids) drops.push([i * 200, k.pos.x]); window.__sim(1400, 1 / 30, drops);
  return kids.map((k) => ({ role: k.role, meals: k.meals ?? 0 })); });
ck('the tracked babies catch food themselves', fed.filter((k) => k.meals > 0).length >= 2, fed);
// (the three characters are measured in tools/baby_personality.mjs)
// the choice: when they are ready it comes up by itself, a baby is picked, confirmed, and kept
await p.evaluate(() => { const s = window.__game.state; s.nursery.readyAt = Date.now() + 1500; window.__game.emit('state'); });
for (let i = 0; i < 12; i++) { await p.waitForTimeout(700); const t = await p.evaluate(() => document.querySelector('#modal.on h2')?.textContent ?? ''); if (/READY/i.test(t)) break; if (t) await p.evaluate(() => document.querySelector('#modal.on #mok')?.click()); }      // (a daily gift may be showing first)
const ask = await p.evaluate(() => ({ on: document.querySelector('#modal')?.classList.contains('on'), title: document.querySelector('#modal h2')?.textContent, opts: [...document.querySelectorAll('#modal [data-i]')].map((x) => x.textContent) }));
await p.screenshot({ path: `${OUT}/5_ready.png` });
ck("when they are ready: THEY'RE READY, with the three babies to choose from", ask.on && /READY/i.test(ask.title ?? '') && ask.opts.length === 3, ask);
await p.click('#modal [data-i="1"]'); await p.waitForFunction(() => /KEEP/i.test(document.querySelector('#modal.on h2')?.textContent ?? ''), null, { timeout: 8000, polling: 200 }).catch(() => {});      // (the confirmation comes once the choice has closed)
const conf = await p.evaluate(() => ({ title: document.querySelector('#modal h2')?.textContent, ok: document.querySelector('#mok')?.textContent }));
ck('choosing asks for a confirmation first', /KEEP/i.test(conf.title ?? ''), conf);
const pick = await p.evaluate(() => window.__game.state.nursery?.cands[1]);
await p.click('#mok'); await p.waitForTimeout(3000);
const kept = await p.evaluate((id) => { const s = window.__game.state, f = s.fish.find((x) => x.id === id), F = window.__fishes; return { f: f && { name: f.name, bornHere: f.bornHere, birthDate: !!f.birthDate, parents: (f.parents ?? []).map((q) => q.name), stage: f.stage }, nursery: s.nursery, seahorses: s.fish.filter((x) => x.species === 'seahorse').length, onScreen: F.list.filter((x) => x.nursery).length, same: !!F.byId.get(id), fry: window.__nursery?.mesh?.count ?? -1 }; }, pick.id);
const dep = await p.evaluate(() => { const N = window.__nursery, out = { departed: window.__departed ?? null, going: !!N.going, count: N.mesh.count, ys: [] }; let t = 0;
  while (N.going && t < 10) { N.update(0.05, t, window.__game.state, window.__fishes); t += 0.05; if (Math.abs(t % 1) < 0.05) out.ys.push(+(N.fry.reduce((a, f) => a + f.pos.y, 0) / Math.max(1, N.fry.length)).toFixed(1)); }
  out.secs = +t.toFixed(1); out.after = N.mesh.count; return out; });
ck('the others gather, swim up together and fade into the water, briefly', dep.departed && dep.going && dep.count > 0 && dep.after === 0 && dep.secs < 6 && dep.ys.at(-1) > dep.ys[0], dep);
ck('one baby is kept, with its own name, parents and birth date; the others leave', kept.f && kept.f.name === pick.name && kept.f.bornHere && kept.f.birthDate && kept.f.parents.join() === 'Sunny,Pearl' && kept.nursery === null && kept.seahorses === 3 && kept.onScreen === 0 && kept.same && dep.after === 0, kept);
await p.evaluate((id) => { window.__game.profTab = 'over'; window.__focus(window.__fishes.list.indexOf(window.__fishes.byId.get(id))); }, pick.id); await p.waitForTimeout(600);
await p.evaluate(() => document.getElementById('fishpill')?.click()); await p.waitForTimeout(900);
const prof = await p.evaluate(() => document.querySelector('#card .tpane')?.innerText ?? '');
await p.screenshot({ path: `${OUT}/6_profile.png` });
ck('its profile says it was born here, with its mother, father and birth date', /BORN IN YOUR AQUARIUM/i.test(prof) && /Mother: Pearl/.test(prof) && /Father: Sunny/.test(prof) && /Birth date/.test(prof), prof.slice(0, 160).replace(/\s+/g, ' '));
await p.reload(); await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(3000);
const again = await p.evaluate(() => ({ departed: window.__departed ?? null, going: !!window.__nursery?.going, kept: window.__game.state.fish.filter((f) => f.bornHere).length }));
ck('after a reload it does not play again, and still one baby', !again.departed && !again.going && again.kept === 1, again);
ck('no page errors', errors.length === 0, errors.slice(0, 5));
console.log(fails ? `${fails} failed` : 'Seahorse family checks passed'); await b.close(); process.exit(fails ? 1 : 0);

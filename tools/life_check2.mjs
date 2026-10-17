// Emergent Life, part two, in the real game: the octopus's wrong entrance, a hauled decoration that snags, a seahorse missing its grip and
// drifting, fish startled by bubbles / turning back / falling behind the school / shying from a bigger animal, a shy fish following a bold
// one, an octopus copying what another handled, the octopus coming to the glass when you look at someone else, an owner checking a keepsake
// someone moved, night owls staying out, and the profile showing the record. Each check counts what the animal really did.
//   node tools/life_check2.mjs    (needs the solo game on 8123)
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/life2'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
const seeds = await p.evaluate(async () => { const R = await import('/src/game/rules.js'), f = (ty) => { for (let s = 1; s < 5000; s++) if (R.octoMind({ seed: s }).type === ty) return s; }; return { showoff: f('showoff'), explorer: f('explorer'), homebody: f('homebody') }; });
await p.evaluate((S) => { const g = window.__game, s = g.state, now = Date.now(), A = { born: now - 12 * 864e5, stage: 'adult', happy: 0.9, health: 1 }; s.flags.tut = 5; s.createdAt = now - 30 * 864e5; s.fish.length = 0;
  s.fish.push({ ...A, id: 'oA', name: 'Biscuit', species: 'octopus', seed: S.explorer, traits: ['Curious'], hunger: 0.1, owner: 'me', ownerName: 'You', home: 'c1', bond: { me: 40 } },
    { ...A, id: 'oB', name: 'Sly', species: 'octopus', seed: S.showoff, traits: ['Curious'], hunger: 0.1, owner: 'me', ownerName: 'You', bond: { me: 40 }, habits: [{ id: 'b1', tod: 1, days: 4 }], mem: { fav: null, fam: { b1: { k: 0.6, n: 6, x: -2.4, z: 0.6, at: now } }, likes: ['b1'], fish: {} } },
    { ...A, id: 'fS', name: 'Shy', species: 'goldfish', seed: 3, traits: ['Shy'] }, { ...A, id: 'fB', name: 'Bold', species: 'goldfish', seed: 4, traits: ['Brave'] }, { ...A, id: 'fC', name: 'Nosy', species: 'blue', seed: 5, traits: ['Curious'] },
    { ...A, id: 'fN', name: 'Neons', species: 'neon', seed: 6, traits: ['Social'] }, { ...A, id: 'sH', name: 'Coral', species: 'seahorse', seed: 4, traits: ['Calm'] });
  s.decor.length = 0; s.decor.push({ id: 'c1', type: 'coconut', x: 1.0, z: 1.2, ry: 0 }, { id: 'b1', type: 'boulder', x: -2.4, z: 0.6, ry: 0, h: { first: { id: 'oB', name: 'Sly', at: now - 9 * 864e5 }, by: { oB: [5, 0, 'Sly'] }, moves: [] } }, { id: 'g1', type: 'grass', x: -3.0, z: 2.0, ry: 0 }, { id: 'g2', type: 'fern', x: 3.0, z: 1.6, ry: 0 }, { id: 'u1', type: 'bubbler', x: 2.4, z: 0.2, ry: 0 }, { id: 'r1', type: 'rock', x: -0.5, z: 2.4, ry: 0 });
  s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] }; s.keeps = [{ id: 'k1', k: 'cap', adv: 'a1', by: 'oA', byName: 'Biscuit', at: now - 864e5, x: -1.0, z: 2.8, h: { carries: 1, days: [1], places: [], movedBy: { id: 'oB', name: 'Sly', at: now - 60e3 } } }]; g.emit('state'); }, seeds);
await p.waitForTimeout(3000);
const step = (n) => p.evaluate((n) => { window.__simClock(true); const F = window.__fishes; for (let i = 0; i < n; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((f) => f.update(0.05, Math.random, F.list)); } }, n);
const get = (id, k) => p.evaluate(([id, k]) => window.__fishes.byId.get(id)?.[k] ?? 0, [id, k]);
// the owner checks on the keepsake someone else moved
if (process.env.DBG) console.log(JSON.stringify(await p.evaluate(() => { const F = window.__fishes, a = F.byId.get('oA'), h = F.byId.get('sH'), sf = F.byId.get('fS'); return { den: a.den, insp: a.inspect, task: !!a.task, kc: !!a.keepCarry, ks: (F.keepSpots?.() ?? []).map((k) => ({ id: k.id, rec: !!k.rec, mb: k.rec?.h?.movedBy })), hf: h.holdfast, sk: h.sk, shyTr: sf.profile?.traits }; })));
let own = false; for (let i = 0; i < 6 && !own; i++) own = await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('oA'); f.inspect = null; f.task = null; f.keepCarry = null; f.checked = null; if (f.st) f.st.mode = null; F.qT = 0; F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); return f.inspect?.id === 'k1'; });
ck('the owner goes to check on the keepsake another octopus moved', own);
// wrong entrance: tired, it heads home; with a clumsy rng it tries the wrong side, backs out and goes round
const wr = await p.evaluate(() => { window.__simClock(true); const F = window.__fishes, f = F.byId.get('oA'); F.rng = () => 0.05; f.inspect = null; f.task = null; f.keepCarry = null; f.denTry = false; f.wrong = null; f.pos.set(f.den.x + 1.3, 0.6, f.den.z + 0.2); f.st = { s: 'crawl', t: 8, n: 0, pulse: 0, mode: 'den' }; F.qT = 0;
  const d = () => Math.hypot(f.pos.x - f.den.x, f.pos.z - f.den.z), d0 = d(); F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); const started = !!f.wrong; let dMax = d0;
  for (let i = 0; i < 26; i++) { F.update(0.05, (window.__t += 0.05)); f.update(0.05, Math.random, F.list); dMax = Math.max(dMax, d()); } F.rng = Math.random; return { started, backed: dMax > d0 + 0.2, d0, dMax }; });
ck('wrong entrance: it backs out of the den and goes round', wr.started && wr.backed, JSON.stringify(wr));
// stubborn object: a hauled rock catches, the octopus stops and backs off, the rock does not move meanwhile
const snag = await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('oA'), it = window.__decor.items.get('r1'); F.rng = () => 0.05; const T = { stage: 'haul', id: 'r1', ux: 1, uz: 0, hold: 0.6, kind: 'push' }; f.task = T; const x0 = it.group.position.x, xs = [];
  for (let i = 0; i < 60; i++) { F.haulTick(0.05, i * 0.05); xs.push(+it.group.position.x.toFixed(3)); } f.task = null; window.__decor.haulEnd?.('r1'); return { snags: f.snags ?? 0, still: xs.slice(25, 45).every((x) => x === xs[25]), x0 }; });
ck('stubborn: the hauled rock catches and the octopus stops pulling for a moment', snag.snags > 0 && snag.still, JSON.stringify(snag));
// fish accidents
await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('fN'); F.rng = () => 0.001; f.pos.set(2.4, 3, 0.2); }); await step(30);
ck('a sudden bubble startles a fish', (await get('fN', 'startles')) > 0); ck('a schooling fish falls behind and hurries to catch up', (await get('fN', 'lags')) > 0);
await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('fC'); F.rng = () => 0.01; f.pos.set(-0.5, 1.6, 3.2); f.target.set(-0.5, 1.5, 3.0); f.backAt = 0; f.seeking = false; F.qT = 0; F.update(0.05, (window.__t += 0.05)); }); ck('a curious fish goes up to something, then turns back', (await get('fC', 'retreats')) > 0);
await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('fS'), o = F.byId.get('oB'); f.pos.set(o.pos.x + 0.5, o.pos.y + 0.3, o.pos.z); f.shyAt = 0; F.qT = 0; }); await step(1); if (process.env.DBG) console.log(JSON.stringify(await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('fS'), o = F.byId.get('oB'); return { d: f.pos.distanceTo(o.pos), fp: f.pos, op: o.pos, shyAt: f.shyAt, now: Date.now(), list: F.list.includes(f), oj: o.species?.move }; })));
ck('a shy fish turns away from a bigger animal', (await get('fS', 'turns')) > 0);
const fol = await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('fS'), b0 = F.byId.get('fB'); F.rng = Math.random; f.pos.copy(b0.pos).add({ x: 1, y: 0, z: 0 }); let n = 0; for (let i = 0; i < 300; i++) { f.retarget = 0; f.pick?.(Math.random); } return f.followed ?? 0; });
ck('a shy fish follows a bold one now and then', fol > 10, `${fol} of 300 choices`);
// an octopus copies what another handled
await p.evaluate(() => { const F = window.__fishes, a = F.byId.get('oB'), c = F.byId.get('oA'); F.rng = () => 0.01; c.inspect = null; c.task = null; c.keepCarry = null; c.copyLook = null; c.sawAt = 0; c.pos.set(-1.0, 0.6, 1.0); a.pos.set(-2.0, 0.6, 0.9); a.inspect = { x: -2.4, z: 0.6, id: 'b1', type: 'boulder', r: 0.6 }; a.st = { s: 'work', t: 6, n: 0, pulse: 0, mode: 'inspect' }; });
await step(14); const cp = await p.evaluate(() => { const c = window.__fishes.byId.get('oA'); return { copy: !!c.copyLook, id: c.copyLook?.id }; });
await p.evaluate(() => { const F = window.__fishes, c = F.byId.get('oA'); if (c.copyLook) c.copyLook.after = 0; c.inspect = null; c.task = null; c.keepCarry = null; if (c.st) c.st.mode = null; F.qT = 0; F.update(0.05, (window.__t += 0.05)); });
ck('an octopus that watched another handle the boulder goes to look at it itself', cp.copy && (await get('oA', 'copied')) > 0, JSON.stringify(cp));
// attention: looking at a fish brings the octopus that knows you to the glass
await p.evaluate(() => { const F = window.__fishes; F.rng = () => 0.01; for (const o of F.list) o.lookCool = 0; window.__showCard(F.byId.get('fB')); }); await p.waitForTimeout(500);
ck('you look at another animal, and the octopus that knows you best comes to the glass', (await get('oB', 'noticed')) > 0 && await p.evaluate(() => !!window.__fishes.byId.get('oB').glassAt));
await p.evaluate(() => document.querySelector('#card .x, .card .x, [data-act="close"]')?.click());
// night owls: at night an explorer stays out, a homebody goes home
const night = await p.evaluate(async () => { const F = window.__fishes; F.rng = Math.random; F.setNight(true); const r = {}; for (const id of ['oA', 'oB']) { const f = F.byId.get(id); r[id] = { owl: !!f.nightOwl }; } return r; });
await step(20); const owl = await p.evaluate(() => { const F = window.__fishes; return { a: F.byId.get('oA').nightOwl, b: F.byId.get('oB').nightOwl }; }); await p.evaluate(() => window.__fishes.setNight(false));
ck('night owls: the explorer is about at night, the show-off goes home', owl.a === true && owl.b === false, JSON.stringify(owl));
// the profile: habits and the favourite place's own history, from the record
await p.evaluate(() => { window.__game.profTab = 'over'; window.__showCard(window.__fishes.byId.get('oB')); }); await p.waitForTimeout(800);
const prof = await p.evaluate(() => document.body.innerText); await p.screenshot({ path: `${out}/profile.png` });
ck('the profile shows its habit and its favourite place\'s history', /Every afternoon: the reef boulder/i.test(prof) && /Reef Boulder: Sly found it first/.test(prof), prof.match(/Every[^\n]*|Reef Boulder:[^\n]*/g)?.join(' | ') ?? '');
// (the seahorse on its own with the plants: with octopuses about it keeps clear of the stems)
await p.evaluate(() => { const g = window.__game, s = g.state; s.fish = s.fish.filter((f) => f.id === 'sH'); s.decor = [{ id: 'p1', type: 'grass', x: -2.6, z: 2.3, ry: 0 }, { id: 'p2', type: 'fern', x: 1.2, z: 2.4, ry: 0 }, { id: 'p3', type: 'sword', x: -1.0, z: -0.3, ry: 0 }, { id: 'p4', type: 'brain', x: 2.6, z: 2.2, ry: 0 }]; g.emit('state');      /* (the seahorse drill's own plants) */ }); await p.waitForTimeout(2500);
// seahorse: it picks a stem (its own choice, the real picker) and swims to it; this time its tail slips off once before it holds; then, a
// clumsy moment later, it lets go and drifts before finding another stem
for (let i = 0; i < 40 && !(await p.evaluate(() => { const h = window.__fishes.byId.get('sH'); return (h.getSpots?.() ?? []).length > 0 && !!h.pickHold; })); i++) await step(20);
let sea = { misses: 0, on: false };
for (let k = 0; k < 6 && !(sea.misses && sea.on); k++) sea = await p.evaluate(() => { window.__simClock(true); const F = window.__fishes, h = F.byId.get('sH'); if (!h.holdfast) h.pickHold(Math.random, h.getSpots()); const mr = Math.random;
  for (let i = 0; i < 1600 && !(h.holdfast?.on); i++) { Math.random = h.holdfast && !h.holdfast.missed ? () => 0.05 : mr; F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); } Math.random = mr; return { misses: h.misses ?? 0, on: !!h.holdfast?.on }; });
ck('a seahorse misses its first grip and curls round again, then holds', sea.misses > 0 && sea.on, JSON.stringify(sea));
const dr = await p.evaluate(() => { const F = window.__fishes, h = F.byId.get('sH'); F.rng = () => 0.0002; F.qT = 0; F.update(0.05, (window.__t += 0.05)); F.rng = Math.random; return { drifts: h.drifts ?? 0, held: !!h.holdfast }; });
ck('a seahorse lets go and drifts before finding another stem', dr.drifts > 0 && !dr.held, JSON.stringify(dr));
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Emergent Life part two checks passed'); process.exit(fails ? 1 : 0);

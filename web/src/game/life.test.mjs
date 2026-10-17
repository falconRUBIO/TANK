// Emergent Life: node web/src/game/life.test.mjs
import assert from 'node:assert/strict';
import * as R from './rules.js';
const DAY = 864e5, H = 3600e3; let n = 0; const ok = (name, fn) => { fn(); n++; console.log('  ✓', name); };
const seedFor = (type) => { for (let s = 1; s < 5000; s++) if (R.octoMind({ seed: s }).type === type) return s; };
const T0 = Date.UTC(2026, 3, 6, 0);      // a Monday, midnight UTC (the tank's time zone is UTC unless a phone says otherwise)
function tank(type = 'collector') {
  const t = R.newWorld(T0 - 10 * DAY, 4); R.norm(t, T0 - 10 * DAY); t.id = 'life-' + type; t.flags.tut = 5; t.shells = 100; t.level = 6; t.adv = { octoAt: 9e15, smallAt: 9e15, hist: [] };
  t.fish = [R.ensureFish({ id: 'o1', name: 'Biscuit', species: 'octopus', seed: seedFor(type), born: T0 - 9 * DAY, stage: 'adult', traits: [], happy: 0.85, owner: 'me', hunger: 0.1 }),
    R.ensureFish({ id: 'f1', name: 'Dot', species: 'neon', seed: 2, born: T0 - 9 * DAY, stage: 'adult', traits: [], happy: 0.8 }), R.ensureFish({ id: 'f2', name: 'Pip', species: 'goldfish', seed: 3, born: T0 - 9 * DAY, stage: 'adult', traits: [], happy: 0.8 })];
  t.decor = [['coconut', 1.2, 0.4], ['boulder', -1.5, -0.8], ['shell', 0.2, 1.4], ['grass', -2.5, 1], ['fern', 2.4, -1]].map(([type, x, z], i) => ({ id: 'd' + i, type, x, z, ry: 0 }));
  t.fish[0].home = 'd0'; t.simTs = T0 - DAY; R.advance(t, T0 - DAY + 1); return t;
}
const feed = (t) => { for (const f of t.fish) if (f.hunger != null) f.hunger = 0.1; };
const touch = (t, decor, at, fish = 'o1') => R.applyAction(t, { t: 'octoTouch', fish, decor, kind: 'revisit' }, { now: at, uid: 'me' });
const days = (t, from, to, each) => { for (let d = from; d < to; d++) { feed(t); each?.(d, T0 + d * DAY); R.advance(t, T0 + d * DAY + 23 * H); } };
console.log('Emergent Life');

ok('a habit forms only from real visits at the same time of day on several days, and is said once', () => { const t = tank(), ev = [];
  touch(t, 'd1', T0 + 8 * H); R.advance(t, T0 + DAY + H); assert.ok(!t.fish[0].habits, 'one visit is not a habit');
  days(t, 1, 6, (d, at) => { ev.push(...touch(t, 'd1', at + 8 * H).events, ...touch(t, 'd1', at + 9 * H).events); ev.push(...R.advance(t, at + DAY + 60e3)); });
  const h = t.fish[0].habits; assert.ok(h && h[0].id === 'd1' && R.TOD[h[0].tod] === 'morning', JSON.stringify(h));
  assert.equal(ev.filter((e) => e.life === 'habit').length, 1); assert.ok(ev.find((e) => e.life === 'habit').journal.includes('every morning')); });
ok('habits fade when the visits stop, and a new routine can replace it', () => { const t = tank(); days(t, 1, 6, (d, at) => touch(t, 'd1', at + 8 * H)); assert.ok(t.fish[0].habits);
  const k0 = t.fish[0].mem.fam.d1.k; days(t, 6, 16); assert.ok(!t.fish[0].habits, 'gone after days without'); assert.ok(t.fish[0].mem.fam.d1.k < k0, 'and it matters a little less');
  days(t, 16, 22, (d, at) => touch(t, 'd4', at + 19 * H)); assert.ok(t.fish[0].habits?.some((h) => h.id === 'd4' && R.TOD[h.tod] === 'evening')); });
ok('habits follow the tank\'s own time zone', () => { const t = tank(); t.tzMin = -8 * 60; assert.equal(R.TOD[R.todOf(t, T0 + 16 * H)], 'morning'); t.tzMin = 0; assert.equal(R.TOD[R.todOf(t, T0 + 16 * H)], 'afternoon'); });
ok('personality: a curious nature learns a thing faster than a homebody (the existing familiarity, now with habits on top)', () => { const a = tank('explorer'), b = tank('homebody'); touch(a, 'd1', T0 + H); touch(b, 'd1', T0 + H); assert.ok(a.fish[0].mem.fam.d1.k > b.fish[0].mem.fam.d1.k); });
ok('no two animals end up with the same routine just because they share a tank', () => { const t = tank(); t.fish.push(R.ensureFish({ id: 'o2', name: 'Sly', species: 'octopus', seed: seedFor('explorer'), born: T0 - 9 * DAY, stage: 'adult', traits: [], happy: 0.9, owner: 'me', hunger: 0.1 }));
  days(t, 1, 7, (d, at) => { touch(t, 'd1', at + 8 * H, 'o1'); touch(t, 'd4', at + 20 * H, 'o2'); }); assert.notDeepEqual(t.fish[0].habits, t.fish[3].habits); });
ok('keepsake history: carried on three days and left by the den is a milestone, said once; drops and moves are kept, bounded', () => { const t = tank(); t.keeps = [{ id: 'k1', k: 'pebble', adv: 'a1', by: 'o1', byName: 'Biscuit', at: T0, x: -3, z: 2 }]; const ev = [];
  for (let d = 0; d < 3; d++) { ev.push(...R.applyAction(t, { t: 'keepMove', id: 'k1', x: -2 + d * 0.2, z: 2, how: 'drop', fish: 'o1', idk: 'x' + d }, { now: T0 + d * DAY + H, uid: 'me' }).events); }
  ev.push(...R.applyAction(t, { t: 'keepMove', id: 'k1', x: 1.3, z: 0.9, how: 'carry', fish: 'o1', idk: 'y' }, { now: T0 + 3 * DAY + H, uid: 'me' }).events);
  const k = t.keeps[0]; assert.equal(k.h.carries, 4); assert.ok(k.h.denAt); assert.ok(k.h.places.length <= 4);
  const m = ev.filter((e) => e.life === 'keepsake'); assert.equal(m.length, 1); assert.match(m[0].journal, /Biscuit has been carrying the smooth pebble around for 4 days\. It finally left it beside the coconut/);
  assert.equal(R.applyAction(t, { t: 'keepMove', id: 'k1', x: 1.3, z: 0.9, how: 'carry', fish: 'o1', idk: 'y' }, { now: T0 + 3 * DAY + H + 5, uid: 'me' }).applied, false, 'the same report twice counts once');
  assert.ok(R.applyAction(t, { t: 'keepMove', id: 'k1', x: 1.2, z: 1, how: 'carry', fish: 'o1', idk: 'z' }, { now: T0 + 4 * DAY, uid: 'me' }).events.every((e) => e.life !== 'keepsake'), 'never said twice'); });
ok('a keepsake story only says what is recorded, and outlives the octopus', () => { const t = tank(); t.keeps = [{ id: 'k1', k: 'pebble', adv: 'a1', by: 'o1', byName: 'Biscuit', at: T0 + 24 * DAY, x: 1.2, z: 0.9, h: { carries: 3, days: [1, 2, 3], places: [], denAt: T0 + 30 * DAY } }];
  t.memorial.push({ id: 'o1', name: 'Biscuit', died: T0 + 91 * DAY }); t.fish = t.fish.filter((f) => f.id !== 'o1'); const s = R.keepStory(t, t.keeps[0], R);
  assert.match(s, /^Smooth pebble: Biscuit found it on day \d+, carried 3 times, kept beside its den for 61 days\.$/, s); R.advance(t, T0 + 92 * DAY); assert.equal(t.keeps.length, 1, 'it stays in the tank'); });
ok('a moved or removed decoration: the octopus still knows it was moved; one taken out is forgotten in time and its habit goes', () => { const t = tank(); days(t, 1, 6, (d, at) => touch(t, 'd1', at + 8 * H));
  R.applyAction(t, { t: 'moveDecor', id: 'd1', x: 2, z: 2 }, { now: T0 + 6 * DAY, uid: 'me' }); assert.ok(t.fish[0].mem.fam.d1.mv);
  R.applyAction(t, { t: 'sellDecor', id: 'd1' }, { now: T0 + 6 * DAY + H, uid: 'me' }); days(t, 7, 12); assert.ok(!(t.fish[0].habits ?? []).some((h) => h.id === 'd1')); });
ok('a young seahorse that comes to love its parent\'s plant on its own is noticed, once; one that has not is not', () => { const t = tank(); const dad = R.ensureFish({ id: 's1', name: 'Apollo', species: 'seahorse', seed: 4, sex: 'm', born: T0 - 40 * DAY, stage: 'adult', traits: [] }); dad.log = { fav: 'd3', hitch: { d3: [900, 9, -2.5, 1] } };
  const kid = R.ensureFish({ id: 's2', name: 'Luna', species: 'seahorse', seed: 5, sex: 'f', born: T0 - 2 * DAY, stage: 'juvenile', traits: [], parents: [{ id: 's1', name: 'Apollo' }] }); t.fish.push(dad, kid);
  let ev = R.advance(t, T0 + DAY + H); assert.ok(!ev.some((e) => e.life === 'family'));
  kid.log = { fav: 'd4', hitch: { d4: [300, 3] } }; ev = R.advance(t, T0 + 2 * DAY + H); assert.ok(!ev.some((e) => e.life === 'family'), 'a different plant: nothing');
  kid.log = { fav: 'd3', hitch: { d3: [300, 3] } }; ev = R.advance(t, T0 + 3 * DAY + H); const f = ev.filter((e) => e.life === 'family'); assert.equal(f.length, 1); assert.equal(f[0].journal, "Apollo's daughter Luna has taken a liking to the same sea grass.");
  assert.ok(!R.advance(t, T0 + 4 * DAY + H).some((e) => e.life === 'family')); });
ok('the parent\'s place is remembered in its memorial, so it still counts after it has died', () => { const t = tank(); const dad = R.ensureFish({ id: 's1', name: 'Apollo', species: 'seahorse', seed: 4, sex: 'm', born: T0 - 200 * DAY, stage: 'adult', traits: [] }); dad.log = { fav: 'd3', hitch: { d3: [900, 9] } }; t.fish.push(dad);
  for (let d = 0; d < 300 && t.fish.includes(dad); d++) R.advance(t, T0 + d * DAY); assert.ok(!t.fish.includes(dad)); const m = t.memorial.find((x) => x.id === 's1'); assert.equal(m.place?.id, 'd3'); });
ok('a companion that dies: its friend keeps going back to their place for a few days, quietly (no journal line), then it passes', () => { const t = tank(); t.fish[1].pal = 'f2'; t.fish[2].pal = 'f1'; t.fish[2].spotId = 'd3'; t.fish[2].born = T0 - 500 * DAY; R.advance(t, T0 + H);
  let ev = []; for (let d = 1; d < 200 && t.fish.some((f) => f.id === 'f2'); d++) { feed(t); ev.push(...R.advance(t, T0 + d * DAY)); } const at = t.memorial.find((m) => m.id === 'f2')?.died; assert.ok(at, 'died of old age');
  ev = R.advance(t, at + DAY + H); const dot = t.fish.find((f) => f.id === 'f1'); assert.ok(dot.loss && dot.loss.name === 'Pip', JSON.stringify(dot.loss)); assert.ok(!ev.some((e) => e.journal && /Pip/.test(e.journal) && /back/.test(e.journal)));
  for (let d = 2; d < 6; d++) R.advance(t, at + d * DAY + H); assert.ok(!dot.loss, 'it passes'); });
ok('a returning visitor: remembered, comes back to the same place, stays longer, and is told once at the 2nd, 5th and 10th visit', () => { const t = tank(); let lines = 0; for (let i = 0; i < 12; i++) { t.visitor = null; t.visitAt = T0 + i * 4 * DAY; t.flags.tut = 5; const ev = R.advance(t, T0 + i * 4 * DAY + 1); lines += ev.filter((e) => /is back/.test(e.journal ?? '')).length; R.advance(t, T0 + i * 4 * DAY + 7 * H); }
  const M = Object.values(t.visitMem); assert.ok(M.length >= 1 && M.every((m) => m.spot && m.met.length && m.first <= m.last)); const many = M.sort((a, b) => b.n - a.n)[0]; assert.ok(many.n >= 2); assert.ok(lines >= 1 && lines <= 3 * M.length); });
ok('a returning visitor stays longer than on its first visit (up to double)', () => { const t = tank(), v1 = { id: 'v1', species: 'sunangel', until: T0 + 3 * H }; R.ADV; const L = { ...R }; const a = { ...v1 }; t.visitMem = { sunangel: { first: T0 - 9 * DAY, n: 3, last: T0 - DAY, met: [], spot: 'd1' } };
  t.visitor = null; t.visitAt = T0; t.seen.fish = ['sunangel']; const ev = R.advance(t, T0 + 1); if (t.visitor?.species === 'sunangel') { assert.ok(t.visitor.until - T0 > 3 * H); assert.equal(t.visitor.spot, 'd1'); } assert.ok(a && L); });
ok('an older save gets the new state quietly: nothing about the past is announced', () => { const t = tank(); delete t.life; t.memorial.push({ id: 'old', name: 'Old', died: T0 - 5 * DAY }); t.fish[1].pal = 'old'; const ev = R.advance(t, T0 + 2 * DAY); assert.ok(t.life); assert.ok(!t.fish[1].loss); assert.ok(!ev.some((e) => e.life)); });
ok('everything is bounded: 120 days of daily visits and carries keep the records small', () => { const t = tank(); t.keeps = [{ id: 'k1', k: 'cap', by: 'o1', byName: 'Biscuit', at: T0, x: -3, z: 2 }];
  days(t, 1, 120, (d, at) => { for (const id of ['d1', 'd2', 'd3', 'd4']) touch(t, id, at + (8 + d % 12) * H); R.applyAction(t, { t: 'keepMove', id: 'k1', x: d % 2 ? -3 : 1.2, z: d % 2 ? 2 : 0.9, how: 'carry', fish: 'o1', idk: 'k' + d }, { now: at + 12 * H, uid: 'me' }); });
  const f = t.fish[0], sz = JSON.stringify({ mem: f.mem, habits: f.habits, keeps: t.keeps, life: t.life }).length; assert.ok((f.habits ?? []).length <= 3 && t.keeps[0].h.days.length <= 7 && t.keeps[0].h.places.length <= 4 && sz < 6000, `${sz} bytes`); });
ok('two copies of a tank given the same reports stay identical (shared tanks, a handoff, a restart from the saved copy)', () => { const a = tank(), b = JSON.parse(JSON.stringify(a)); for (const t of [a, b]) days(t, 1, 10, (d, at) => { touch(t, 'd1', at + 8 * H); touch(t, 'd4', at + 20 * H); });
  assert.equal(JSON.stringify(a.fish.map((f) => [f.habits, f.mem])), JSON.stringify(b.fish.map((f) => [f.habits, f.mem]))); const c = JSON.parse(JSON.stringify(a)); R.advance(c, T0 + 10 * DAY); R.advance(a, T0 + 10 * DAY); assert.equal(JSON.stringify(c.fish[0].habits), JSON.stringify(a.fish[0].habits)); });
ok('a day is looked at once however often the tank is opened (no duplicate lines), and a tank closed for a week catches up with one look', () => { const a = tank(); days(a, 1, 5, (d, at) => touch(a, 'd1', at + 8 * H)); const ev = []; for (let m = 0; m < 60; m++) ev.push(...R.advance(a, T0 + 6 * DAY + m * 60e3)); assert.ok(ev.filter((e) => e.life === 'habit').length <= 1);
  const lines = R.advance(a, T0 + 14 * DAY); assert.ok(lines.filter((e) => e.life === 'habit').length <= 1); });
ok('a decoration keeps its own small history: who found it, who keeps coming (by days), where it has stood', () => { const t = tank(); days(t, 1, 5, (d, at) => { touch(t, 'd1', at + 8 * H); touch(t, 'd1', at + 9 * H); });
  R.applyAction(t, { t: 'moveDecor', id: 'd1', x: 2, z: 2 }, { now: T0 + 5 * DAY, uid: 'me' }); const h = t.decor.find((d) => d.id === 'd1').h;
  assert.equal(h.first.name, 'Biscuit'); assert.equal(h.by.o1[0], 4, 'one count a day, not per touch'); assert.equal(h.moves.length, 1); assert.match(R.decorStory(t, t.decor.find((d) => d.id === 'd1'), R), /^Reef Boulder: Biscuit found it first, on day \d+; Biscuit has come back on 4 days; moved 1 time\.$/); });
ok('two generations at one decoration: a young fish that comes on its own on several days, where its parent came too, is noticed once', () => { const t = tank(); const kid = R.ensureFish({ id: 'k1', name: 'Nemo', species: 'goldfish', seed: 9, born: T0, stage: 'baby', traits: [], parents: [{ id: 'f2', name: 'Pip' }] }); t.fish.push(kid); const ev = [];
  const log = (fish, at) => ev.push(...R.applyAction(t, { t: 'fishLog', logs: [{ fish, places: ['d2'] }] }, { now: at, uid: 'me' }).events);
  for (let d = 0; d < 3; d++) log('f2', T0 + d * DAY + H); for (let d = 0; d < 2; d++) log('k1', T0 + d * DAY + 2 * H); assert.ok(!ev.some((e) => e.life === 'generations'));
  for (let d = 2; d < 5; d++) log('k1', T0 + d * DAY + 2 * H); const g = ev.filter((e) => e.life === 'generations'); assert.equal(g.length, 1); assert.equal(g[0].journal, 'The giant clam has seen two generations now: first Pip, and now Nemo.'); });
ok('a young fish that makes its family\'s spot its own is noticed once (and only if it really did)', () => { const t = tank(); t.fish[2].spotId = 'd3'; const kid = R.ensureFish({ id: 'k1', name: 'Nemo', species: 'goldfish', seed: 9, born: T0, stage: 'baby', traits: [], parents: [{ id: 'f2', name: 'Pip' }] }); t.fish.push(kid);
  let ev = R.advance(t, T0 + DAY + H); assert.ok(!ev.some((e) => e.life === 'family')); kid.spotId = 'd3'; ev = R.advance(t, T0 + 2 * DAY + H); assert.equal(ev.filter((e) => e.life === 'family').length, 1); });
ok('a keepsake moved by another octopus: recorded, and its owner notices (in its story, not the journal)', () => { const t = tank(); t.fish.push(R.ensureFish({ id: 'o2', name: 'Sly', species: 'octopus', seed: 7, born: T0 - 9 * DAY, stage: 'adult', traits: [], happy: 0.9, hunger: 0.1 })); t.keeps = [{ id: 'k1', k: 'cap', by: 'o1', byName: 'Biscuit', at: T0, x: 1, z: 1 }];
  const r = R.applyAction(t, { t: 'keepMove', id: 'k1', x: -1, z: 2, how: 'carry', fish: 'o2', idk: 'm1' }, { now: T0 + H, uid: 'me' }); assert.equal(t.keeps[0].h.movedBy.id, 'o2'); assert.ok(r.events.some((e) => e.story === 'o1' && /Sly moved its bottle cap/.test(e.text))); assert.ok(!r.events.some((e) => e.journal && /moved its/.test(e.journal))); assert.ok(!t.keeps[0].h.denAt, 'not its den'); });
ok('some visitors only come at night: a daytime arrival waits for the tank\'s evening, then comes', () => { const t = tank(); t.visitor = null; let came = null; for (let k = 0; k < 40 && !came; k++) { const at = T0 + 100 * DAY + k * 37 * H; t.visitAt = at; t.visitWait = false; R.advance(t, at + 1); if (t.visitWait) { const w = t.visitAt; R.advance(t, w + 1); came = { tod: R.todOf(t, w + 1), v: !!t.visitor }; } else t.visitor = null; }
  assert.ok(came && came.v && came.tod >= 2, JSON.stringify(came)); });
console.log(`All ${n} Emergent Life tests passed`);

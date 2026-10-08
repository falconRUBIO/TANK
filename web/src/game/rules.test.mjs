import assert from 'node:assert/strict';
import * as R from './rules.js';
const DAY = 864e5; let n = 0; const ok = (name, fn) => { fn(); n++; console.log('  ✓', name); };
console.log('Rules');
ok('fish get hungry at their own pace', () => { const t = R.newWorld(0); t.fish.push(R.ensureFish({ id: 'g', name: 'Greedy', species: 'goldfish', seed: 3, born: 0, stage: 'baby', traits: ['Greedy'] }), R.ensureFish({ id: 'l', name: 'Lazy', species: 'goldfish', seed: 3, born: 0, stage: 'baby', traits: ['Lazy'] })); t.hunger = 0.5;
  const g = R.needsOf(t.fish[1], t), l = R.needsOf(t.fish[2], t); assert.ok(g.fed < l.fed, `${g.fed} < ${l.fed}`); });
ok('a clean, fed tank with things the fish like makes them happier', () => { const a = R.newWorld(0), b = R.newWorld(0); a.fish[0].traits = ['Shy']; b.fish[0].traits = ['Shy']; a.water = b.water = 1; b.water = 0.45; b.glass = 0.8; b.hunger = 0.85;
  R.advance(a, 6 * 3600e3 + 1); R.advance(b, 6 * 3600e3 + 1); assert.ok(a.fish[0].happy > b.fish[0].happy + 0.1, `${a.fish[0].happy} vs ${b.fish[0].happy}`); });
ok('neglect makes fish unwell but never kills them', () => { const t = R.newWorld(0); t.water = 0.45; t.hunger = 0.85; R.advance(t, 30 * DAY); assert.ok(t.fish[0].health >= 0.35 && t.fish[0].health < 0.8, String(t.fish[0].health)); assert.equal(t.fish.length, 1); });
ok('care brings them back', () => { const t = R.newWorld(0); t.water = 0.45; t.hunger = 0.85; R.advance(t, 5 * DAY); const low = t.fish[0].health; t.water = 1; t.hunger = 0.1; t.simTs = 5 * DAY; R.advance(t, 5 * DAY + 3 * 3600e3); assert.ok(t.fish[0].health > low + 0.2, `${low} → ${t.fish[0].health}`); });
ok('moods read the real state', () => { const t = R.newWorld(0); t.hunger = 0.9; assert.equal(R.needsOf(t.fish[0], t).mood, 'Hungry'); t.hunger = 0.1; t.fish[0].happy = 0.9; assert.ok(['Happy', 'Sleepy'].includes(R.needsOf(t.fish[0], t, 13 * 3600e3).mood)); });
ok('old saves without per-fish needs still load', () => { const t = R.newWorld(0); for (const f of t.fish) { delete f.happy; delete f.health; delete f.appetite; } R.advance(t, 3600e3); assert.ok(t.fish[0].happy > 0 && t.fish[0].health > 0.5); });
ok('a fish finds a favourite spot only when the tank really has one, once, and it pays', () => { const t = R.newWorld(0); t.fish[0].traits = ['Shy']; t.decor = []; t.shells = 0; R.advance(t, 5 * 3600e3);
  assert.ok(!t.fish[0].found?.includes('spot')); for (let i = 0; i < 4; i++) t.decor.push({ id: 'p' + i, type: 'grass', x: 0, z: 1, ry: 0 }); const ev = R.advance(t, 9 * 3600e3);
  assert.equal(ev.filter((e) => e.discovery).length, 1); assert.ok(t.shells >= 2); assert.equal(R.advance(t, 12 * 3600e3).filter((e) => e.discovery).length, 0); });
ok('two social fish become friends once', () => { const t = R.newWorld(0); t.fish[0].traits = ['Social']; t.fish.push(R.ensureFish({ id: 'x', name: 'Mango', species: 'goldfish', seed: 3, born: 0, stage: 'baby', traits: ['Social'] })); t.decor = []; t.fish.forEach((f) => { f.happy = 0.9; }); t.hunger = 0.05;
  const ev = R.advance(t, 3 * 3600e3); assert.equal(ev.filter((e) => /time together/.test(e.journal ?? '')).length, 1); assert.equal(R.advance(t, 8 * 3600e3).filter((e) => /time together/.test(e.journal ?? '')).length, 0); });
ok('every fifth glass cleaning turns up a pearl', () => { const t = R.newWorld(0); const d = []; for (let i = 0; i < 5; i++) { t.glass = 0.6; d.push(R.applyAction(t, { t: 'glass' }, { now: 1000 + i }).delta); } assert.deepEqual(d, [1, 1, 1, 1, 3]); });
ok('growth countdown reads in hours then days', () => { const f = { born: 0 }; assert.equal(R.nextStage(f, 19 * 3600e3).label, '5h'); assert.equal(R.nextStage(f, 2 * DAY).to, 'adult'); assert.equal(R.nextStage(f, 4 * DAY), null); });
ok('a new fish is ordered, takes its delivery time, then arrives and fills a seat', () => { const t = R.newWorld(0); t.shells = 50; const r = R.applyAction(t, { t: 'buyFish', species: 'goldfish', name: 'Gus' }, { now: 1000 });
  assert.ok(r.ok && t.fish.length === 1 && t.orders.length === 1 && R.pending(t) === 1); const ev = R.advance(t, 1000 + 11 * 60e3); assert.equal(t.fish.length, 2); assert.equal(t.orders.length, 0); assert.ok(ev.some((e) => e.arrival?.length === 1)); assert.ok(t.seen.fish.includes('goldfish')); });
ok('ordered fish count against capacity', () => { const t = R.newWorld(0); t.shells = 500; t.level = 1; let last; for (let i = 0; i < 9; i++) last = R.applyAction(t, { t: 'buyFish', species: 'goldfish' }, { now: 1000 + i }); assert.equal(last.reason, 'TANK_FULL'); });
ok('something washes in, anyone can collect it once, and the next one waits', () => { const t = R.newWorld(0); R.advance(t, 30 * 60e3); assert.ok(t.drift); const g = t.drift, s0 = t.shells;
  const r = R.applyAction(t, { t: 'collect', id: g.id }, { now: 31 * 60e3 }); assert.ok(r.ok && r.applied); assert.ok(g.kind === 'treat' || t.shells > s0); assert.equal(t.drift, null);
  assert.equal(R.applyAction(t, { t: 'collect', id: g.id }, { now: 32 * 60e3 }).applied, false); R.advance(t, 3 * 3600e3); assert.equal(t.drift, null); R.advance(t, 7 * 3600e3); assert.ok(t.drift); });
ok('gifts never pile up: one waits at a time', () => { const t = R.newWorld(0); R.advance(t, 30 * 60e3); const id = t.drift.id; R.advance(t, 30 * 3600e3); assert.equal(t.drift.id, id); });
ok('petting builds a bond per player, has a cooldown, and a fish learns to know you', () => { const t = R.newWorld(0); const f = t.fish[0]; let got = 0;
  for (let i = 0; i < 12; i++) { const r = R.applyAction(t, { t: 'pet', id: f.id }, { now: 1e6 + i * 5 * 60e3, uid: 'u1', name: 'Sam' }); got += r.delta; }
  assert.equal(f.bond.u1, 12); assert.equal(got, 2); assert.equal(R.applyAction(t, { t: 'pet', id: f.id }, { now: 1e6 + 11 * 5 * 60e3 + 60e3, uid: 'u1' }).applied, false);
  assert.ok(R.applyAction(t, { t: 'pet', id: f.id }, { now: 1e6 + 11 * 5 * 60e3 + 61e3, uid: 'u2' }).applied); assert.equal(f.bond.u2, 1); });
ok('the tank wish completes once and pays', () => { const t = R.newWorld(0); R.norm(t); t.fish.push(R.ensureFish({ id: 'a', name: 'A', species: 'goldfish', seed: 1, born: 0, stage: 'baby', traits: [] }), R.ensureFish({ id: 'b', name: 'B', species: 'goldfish', seed: 2, born: 0, stage: 'baby', traits: [] })); const s0 = t.shells; const ev = R.advance(t, 60e3);
  assert.equal(t.wishIdx >= 1, true); assert.ok(ev.some((e) => e.wish)); assert.ok(t.shells >= s0 + 4); });
ok('the collection book pays every five discoveries', () => { const t = R.newWorld(0); R.norm(t); t.seen.fish = ['goldfish', 'neon', 'cory']; t.seen.decor = ['grass', 'fern', 'rock']; t.flags.collMs = 0; t.wishIdx = 99; t.level = 8; const s0 = t.shells; R.advance(t, 60e3); assert.equal(t.flags.collMs, 1); assert.equal(t.shells, s0 + 3); R.advance(t, 120e3); assert.equal(t.flags.collMs, 1); });
ok('a tank birthday pays once per week of tank age', () => { const t = R.newWorld(0); R.norm(t); const s0 = t.shells; R.advance(t, 7 * 864e5 + 1000); assert.equal(t.flags.weeks, 1); assert.ok(t.shells >= s0 + 8); const s1 = t.shells; R.advance(t, 7 * 864e5 + 2000); assert.equal(t.shells, s1); });
ok('one fish is cheaper each day and the price is charged', () => { const now = 5 * 864e5; const id = R.dailyFish(now); assert.ok(R.fishPrice(id, now) < R.SPECIES_DEF[id].price); const t = R.newWorld(now); R.norm(t, now); t.level = 8; t.shells = 100; R.applyAction(t, { t: 'buyFish', species: id, name: 'X', seed: 1 }, { now }); assert.equal(t.shells, 100 - R.fishPrice(id, now)); });
ok('a rare visitor drops by, saying hello pays and adds it to the book, and it leaves otherwise', () => {
  const now = 1e9, t = R.newWorld(now - 3 * 864e5); R.norm(t, now); t.flags.tut = 5; t.visitAt = now - 1;
  R.advance(t, now); assert.ok(t.visitor, 'visitor arrived'); const v = t.visitor, sp = v.species; assert.ok(R.SPECIES_DEF[sp].visitor);
  const s0 = t.shells, r = R.applyAction(t, { t: 'greet', id: v.id }, { now: now + 1000 }); assert.ok(r.applied); assert.equal(t.shells, s0 + 4); assert.ok(t.seen.fish.includes(sp)); assert.equal(t.visitor, null);
  assert.equal(R.applyAction(t, { t: 'greet', id: v.id }, { now: now + 2000 }).applied, false);
  const t2 = R.newWorld(now - 864e5); R.norm(t2, now); t2.flags.tut = 5; t2.visitAt = now - 1; R.advance(t2, now); assert.ok(t2.visitor); R.advance(t2, now + 3 * 3600e3 + 1000); assert.equal(t2.visitor, null);
});
ok('two adults of one species lay an egg that hatches into a blend of both', () => {
  const t = R.newWorld(0); R.norm(t, 0); t.level = 4; t.flags.tut = 5;
  t.fish = [R.ensureFish({ id: 'a', name: 'A', species: 'goldfish', seed: 10, born: -5 * 864e5, stage: 'adult', traits: ['Shy'] }), R.ensureFish({ id: 'b', name: 'B', species: 'goldfish', seed: 20, born: -5 * 864e5, stage: 'adult', traits: ['Brave'] })];
  const now = 20 * 3600e3; t.eggAt = 0; R.advance(t, now); assert.equal(t.eggs.length, 1, 'egg laid');
  R.advance(t, now + 5 * 3600e3); assert.equal(t.eggs.length, 0); assert.equal(t.fish.length, 3); const c = t.fish[2];
  assert.equal(c.species, 'goldfish'); assert.equal(c.stage, 'baby'); assert.ok(c.seed >= 15 && c.seed <= 25, 'seed blends the parents ' + c.seed); assert.ok(c.traits.every((x) => ['Shy', 'Brave'].includes(x)));
});
ok('the journal tells a small true story now and then', () => {
  const t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.storyAt = 0; t.fish[0].traits = ['Lazy']; const ev = R.advance(t, 3600e3);
  assert.ok(ev.some((e) => /napped low/.test(e.journal ?? '')), JSON.stringify(ev)); assert.ok(t.storyAt > 3600e3);
});
ok('a bottle goes to one friend, costs two shells, once per six hours, and pays when opened', () => {
  const t = R.newWorld(0); R.norm(t, 0); t.shells = 20; const members = [{ id: 'u1', name: 'Alex' }, { id: 'u2', name: 'Sam' }], now = 1e6;
  assert.equal(R.applyAction(t, { t: 'bottle', to: 'u1', note: 'hi' }, { uid: 'u1', name: 'Alex', members, now }).reason, 'NOT_A_FRIEND');
  assert.equal(R.applyAction(t, { t: 'bottle', to: 'u2', note: '' }, { uid: 'u1', name: 'Alex', members, now }).ok, false);
  assert.ok(R.applyAction(t, { t: 'bottle', to: 'u2', note: 'love the tank' }, { uid: 'u1', name: 'Alex', members, now }).ok); assert.equal(t.shells, 18);
  assert.equal(R.applyAction(t, { t: 'bottle', to: 'u2', note: 'again' }, { uid: 'u1', name: 'Alex', members, now: now + 1000 }).reason, 'TOO_SOON');
  const id = t.bottles[0].id; assert.equal(R.applyAction(t, { t: 'openBottle', id }, { uid: 'u1', now: now + 2000 }).applied, false);
  const r = R.applyAction(t, { t: 'openBottle', id }, { uid: 'u2', name: 'Sam', now: now + 3000 }); assert.ok(r.applied); assert.equal(t.shells, 22); assert.equal(t.bottles.length, 0);
});
ok('neglect is slow, warned about, shared out fairly: a fish floats after five days, never all at once, never the last, never in a new tank', () => {
  const D = 864e5, mk = () => { const t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.fish = ['A', 'B', 'C'].map((n, i) => R.ensureFish({ id: 'f' + i, name: n, species: 'goldfish', seed: i, born: -9 * D, stage: 'adult', traits: ['Greedy'] })); return t; };
  const young = mk(); R.advance(young, 2 * D); R.advance(young, 2.9 * D); assert.equal(young.floaters.length, 0, 'a new tank is protected');
  const t = mk(); t.createdAt = -20 * D; t.simTs = 0; t.visitAt = t.eggAt = t.storyAt = 1e15;
  let ev = []; for (let h = 12; h <= 24 * 3; h += 12) ev.push(...R.advance(t, h * 3600e3)); assert.ok(ev.some((e) => e.warn), 'a warning arrives before anyone dies'); assert.equal(t.floaters.length, 0);
  for (let h = 3 * 24 + 12; h <= 24 * 12; h += 12) R.advance(t, h * 3600e3);
  assert.ok(t.floaters.length >= 1 && t.fish.length >= 1, `deaths ${t.floaters.length}, alive ${t.fish.length}`); assert.ok(t.floaters.every((f) => f.died > 0));
  const alive = t.fish.length; for (let h = 24 * 12 + 12; h <= 24 * 40; h += 12) R.advance(t, h * 3600e3); assert.ok(t.fish.length >= 1, 'the last fish never dies');
  const f1 = t.floaters[0], r1 = R.applyAction(t, { t: 'scoop', id: f1.id }, { now: 40 * D, name: 'Sam' }); assert.ok(r1.applied); assert.equal(t.memorial.at(-1).name, f1.name); assert.equal(R.applyAction(t, { t: 'scoop', id: f1.id }, { now: 40 * D }).applied, false);
  // care wins the time back
  const c = mk(); c.createdAt = -20 * D; c.simTs = 0; c.visitAt = c.eggAt = c.storyAt = 1e15; R.advance(c, 3 * D); assert.ok(c.fish[0].ail > 0); R.applyAction(c, { t: 'feed', x: 0 }, { now: 3 * D + 1000 }); R.applyAction(c, { t: 'water' }, { now: 3 * D + 2000 });
  const before = c.fish[0].ail; R.advance(c, 3 * D + 1800e3); assert.ok(c.fish[0].ail < before, 'ail ' + before + ' -> ' + c.fish[0].ail);
});
console.log(`All ${n} rule tests passed`);

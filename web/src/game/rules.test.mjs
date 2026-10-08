import assert from 'node:assert/strict';
import * as R from './rules.js';
const DAY = 864e5; let n = 0; const ok = (name, fn) => { fn(); n++; console.log('  ✓', name); };
console.log('Rules');
ok('fish get hungry at their own pace', () => { const t = R.newWorld(0); t.fish.push(R.ensureFish({ id: 'g', name: 'Greedy', species: 'goldfish', seed: 3, born: 0, stage: 'baby', traits: ['Greedy'] }), R.ensureFish({ id: 'l', name: 'Lazy', species: 'goldfish', seed: 3, born: 0, stage: 'baby', traits: ['Lazy'] })); t.hunger = 0.5;
  const g = R.needsOf(t.fish[1], t), l = R.needsOf(t.fish[2], t); assert.ok(g.fed < l.fed, `${g.fed} < ${l.fed}`); });
ok('a clean, fed tank with things the fish like makes them happier', () => { const a = R.newWorld(0), b = R.newWorld(0); a.fish[0].traits = ['Shy']; b.fish[0].traits = ['Shy']; a.water = b.water = 1; b.water = 0.45; b.glass = 0.8; b.hunger = 0.85;
  R.advance(a, 6 * 3600e3 + 1); R.advance(b, 6 * 3600e3 + 1); assert.ok(a.fish[0].happy > b.fish[0].happy + 0.1, `${a.fish[0].happy} vs ${b.fish[0].happy}`); });
ok('long neglect drives health critical, but the last fish never dies', () => { const t = R.newWorld(0); t.water = 0.45; t.hunger = 0.85; R.advance(t, 30 * DAY); assert.ok(t.fish[0].health >= 0.2 && t.fish[0].health <= 0.4, String(t.fish[0].health)); assert.equal(t.fish.length, 1); });
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
  assert.equal(c.species, 'goldfish'); assert.equal(c.stage, 'baby'); assert.ok(c.seed === 10 || c.seed === 20, 'pattern from one parent ' + c.seed); assert.ok(c.genes && c.gen === 1 && c.parents.length === 2); assert.ok(c.traits.every((x) => ['Shy', 'Brave'].includes(x)));
});
ok('the journal no longer invents stories on a timer, and routine care goes to the activity list', () => {
  const t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.storyAt = 0; t.fish[0].traits = ['Lazy']; const ev = R.advance(t, 20 * 3600e3);
  assert.ok(!ev.some((e) => /napped|chased|swam together/.test(e.journal ?? '')), 'no artificial stories');
  const r = R.applyAction(t, { t: 'feed', x: 0 }, { now: 20 * 3600e3 + 1000, name: 'Alex', uid: 'u1' }); assert.ok(r.events.some((e) => e.activity && /fed the fish/.test(e.activity.text)) && !r.events.some((e) => e.journal));
  const w = R.applyAction(t, { t: 'water' }, { now: 20 * 3600e3 + 2000, name: 'Alex', uid: 'u1' }); assert.ok(w.events.some((e) => e.activity) && !w.events.some((e) => e.journal));
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
  let ev = []; for (let h = 12; h <= 24 * 4; h += 12) ev.push(...R.advance(t, h * 3600e3)); assert.ok(ev.some((e) => e.warn), 'a warning arrives before anyone dies'); assert.equal(t.floaters.length, 0);
  for (let h = 4 * 24 + 12; h <= 24 * 12; h += 12) R.advance(t, h * 3600e3);
  assert.ok(t.floaters.length >= 1 && t.fish.length >= 1, `deaths ${t.floaters.length}, alive ${t.fish.length}`); assert.ok(t.floaters.every((f) => f.died > 0));
  const alive = t.fish.length; for (let h = 24 * 12 + 12; h <= 24 * 40; h += 12) R.advance(t, h * 3600e3); assert.ok(t.fish.length >= 1, 'the last fish never dies');
  const f1 = t.floaters[0], r1 = R.applyAction(t, { t: 'scoop', id: f1.id }, { now: 40 * D, name: 'Sam' }); assert.ok(r1.applied); assert.ok(t.memorial.some((x) => x.name === f1.name && x.rested)); assert.equal(R.applyAction(t, { t: 'scoop', id: f1.id }, { now: 40 * D }).applied, false);
  // care wins the time back
  const c = mk(); c.createdAt = -20 * D; c.simTs = 0; c.visitAt = c.eggAt = c.storyAt = 1e15; R.advance(c, 3 * D); assert.ok(c.fish[0].ail > 0); R.applyAction(c, { t: 'feed', x: 0 }, { now: 3 * D + 1000 }); R.applyAction(c, { t: 'water' }, { now: 3 * D + 2000 });
  const before = c.fish[0].ail; R.advance(c, 3 * D + 1800e3); assert.ok(c.fish[0].ail < before, 'ail ' + before + ' -> ' + c.fish[0].ail);
});
ok('a tank can opt out of death: fish pause growing instead', () => {
  const D = 864e5, t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.flags.mortality = false; t.createdAt = -30 * D; t.simTs = 0; t.visitAt = t.eggAt = t.storyAt = 1e15;
  t.fish = [R.ensureFish({ id: 'a', name: 'A', species: 'goldfish', seed: 1, born: 0, stage: 'baby', traits: ['Greedy'] }), R.ensureFish({ id: 'b', name: 'B', species: 'goldfish', seed: 2, born: 0, stage: 'baby', traits: ['Calm'] })];
  for (let h = 12; h <= 24 * 30; h += 12) R.advance(t, h * 3600e3);
  assert.equal(t.fish.length, 2); assert.equal(t.floaters.length, 0); assert.ok(t.fish[0].born > 5 * D, 'growth was paused');
});
ok('death needs both five days of neglect and critically low health, leaves a memorial and a floating fish, and lying to rest keeps the record', () => {
  const D = 864e5, mk = () => { const t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.createdAt = -20 * D; t.simTs = 0; t.visitAt = t.eggAt = t.storyAt = 1e15; t.fish = ['A', 'B', 'C'].map((n, i) => R.ensureFish({ id: 'f' + i, name: n, species: 'goldfish', seed: i, born: -9 * D, stage: 'adult', traits: ['Calm', 'Shy'], owner: 'u1', ownerName: 'Alex', found: ['spot'] })); return t; };
  const t = mk(); for (let h = 12; h <= 24 * 4; h += 12) R.advance(t, h * 3600e3); assert.equal(t.floaters.length, 0, 'nobody dies before day 5');
  const tired = t.fish.map((f) => f.ail); assert.ok(tired.every((x) => x >= R.AIL_WARN), 'critical by day 4');
  for (let h = 24 * 4 + 12; h <= 24 * 6; h += 12) R.advance(t, h * 3600e3); assert.equal(t.floaters.length, 1, 'one fish after five days, not all at once');
  const m = t.memorial[0]; assert.equal(m.ownerName, 'Alex'); assert.deepEqual(m.traits, ['Calm', 'Shy']); assert.ok(m.milestones.length >= 1 && m.died > 0 && m.born < 0 && m.rested === null);
  // a healthy-looking fish does not die just because time passed
  const h = mk(); h.fish.forEach((f) => { f.ail = R.AIL_DIE + 10; f.health = 1; }); R.advance(h, 1000); assert.equal(h.floaters.length, 0);
  const r = R.applyAction(t, { t: 'scoop', id: t.floaters[0].id }, { now: 6 * D + 1000, name: 'Sam' }); assert.ok(r.applied); assert.equal(t.floaters.length, 0); assert.equal(t.memorial[0].rested.by, 'Sam'); assert.equal(t.memorial.length, 1, 'the record stays');
  assert.equal(R.applyAction(t, { t: 'scoop', id: m.id }, { now: 6 * D + 2000 }).applied, false, 'no duplicate');
});
ok('regression: deaths are at least 24 hours apart, even after a month away in one jump', () => {
  const D = 864e5, mk = () => { const t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.createdAt = -20 * D; t.simTs = 0; t.visitAt = t.eggAt = t.storyAt = 1e15; t.fish = ['A', 'B', 'C', 'D'].map((n, i) => R.ensureFish({ id: 'f' + i, name: n, species: 'goldfish', seed: i, born: -9 * D, stage: 'adult', traits: ['Calm'] })); return t; };
  const a = mk(); for (let h = 12; h <= 24 * 20; h += 12) R.advance(a, h * 3600e3);
  for (let i = 1; i < a.floaters.length; i++) assert.ok(a.floaters[i].died - a.floaters[i - 1].died >= D - 1, 'gap between deaths ' + (a.floaters[i].died - a.floaters[i - 1].died) / 3600e3 + 'h');
  assert.ok(a.fish.length >= 1);
  const b = mk(); R.advance(b, 30 * D); assert.ok(b.floaters.length <= 1, 'one jump of 30 days: ' + b.floaters.length + ' deaths'); assert.ok(b.fish.length >= 3);
  const rt = JSON.parse(JSON.stringify(a)); assert.deepEqual(rt.memorial, a.memorial); assert.deepEqual(rt.floaters, a.floaters);
});
ok('discoveries come from real behaviour: right trait, real decoration, once per fish, saved in the journal', () => {
  const t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.level = 4; t.fish = [R.ensureFish({ id: 'a', name: 'Aya', species: 'goldfish', seed: 1, born: -864e5, stage: 'juvenile', traits: ['Shy', 'Social'] }), R.ensureFish({ id: 'b', name: 'Bo', species: 'goldfish', seed: 2, born: -864e5, stage: 'juvenile', traits: ['Brave'] })];
  t.decor = [{ id: 'd1', type: 'rock', x: 0, z: 1, ry: 0 }]; const now = 5e6, ob = (a) => R.applyAction(t, { t: 'observe', ...a }, { now: now + (ob.n = (ob.n ?? 0) + 1) * 1000, name: 'Sam', uid: 'u2' });
  assert.equal(ob({ key: 'hideaway', fish: 'a', spot: 'd1' }).applied, true); assert.equal(ob({ key: 'hideaway', fish: 'a', spot: 'd1' }).applied, false, 'no duplicate');
  assert.equal(ob({ key: 'hideaway', fish: 'b', spot: 'd1' }).applied, false, 'a brave fish does not hide'); assert.equal(ob({ key: 'hideaway', fish: 'a', spot: 'nope' }).applied, false, 'needs a real decoration');
  assert.equal(ob({ key: 'bubbles', fish: 'a' }).applied, false, 'no bubbler, no bubble play'); assert.equal(ob({ key: 'glass', fish: 'b' }).applied, true); assert.equal(ob({ key: 'made-up', fish: 'a' }).applied, false);
  assert.equal(ob({ key: 'together', fish: 'a', with: 'b' }).applied, true); assert.equal(ob({ key: 'together', fish: 'a', with: 'a' }).applied, false, 'not with itself');
  assert.ok(t.fish[0].disc.hideaway && t.fish[0].disc['together:b'] && t.fish[1].disc.glass); const r = ob({ key: 'routine', fish: 'a' }); assert.ok(r.events.some((e) => /routine/.test(e.journal ?? '') && e.noticed));
  assert.equal(Object.keys(R.DISCOVERIES).length, 14);
});
ok('one shared daily wish: feasible, replaced each day, paid once, never punishing', () => {
  const D = 864e5, t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.fish = [R.ensureFish({ id: 'a', name: 'A', species: 'goldfish', seed: 1, born: -D, stage: 'baby', traits: ['Calm'] })];
  R.advance(t, 2 * D + 10); const d1 = t.daily; assert.ok(d1 && d1.day === 2 && !d1.done); assert.ok(R.DAILY[d1.kind].ok(t), 'only wishes that can be done now');
  for (let day = 3; day < 40; day++) { R.advance(t, day * D + 10); assert.ok(R.DAILY[t.daily.kind].ok(t), 'feasible on day ' + day); if (day > 3) assert.notEqual(t.daily.kind, prev, 'no repeats back to back'); var prev = t.daily.kind; }
  const c = R.newWorld(0); R.norm(c, 0); c.flags.tut = 5; c.fish = t.fish; c.daily = { day: 50, kind: 'care', text: R.DAILY.care.text, need: 1, have: 0, ids: [], done: false }; R.advance(c, 50 * D + 500); const s0 = c.shells;
  R.applyAction(c, { t: 'feed', x: 0 }, { now: 50 * D + 1000, name: 'Sam', uid: 'u2' }); assert.ok(c.daily.done && c.daily.by === 'Sam'); const after = c.shells; assert.equal(after - s0, 1 + R.DAILY_REWARD, 'one shell for feeding, plus the wish');
  R.applyAction(c, { t: 'feed', x: 0 }, { now: 50 * D + 2000, name: 'Sam', uid: 'u2' }); R.applyAction(c, { t: 'water' }, { now: 50 * D + 3000, name: 'Sam' }); assert.ok(c.shells - after <= 3, 'the wish pays once a day');
  const g = R.newWorld(0); R.norm(g, 0); g.flags.tut = 5; g.fish = ['a', 'b', 'c'].map((n, i) => R.ensureFish({ id: n, name: n, species: 'goldfish', seed: i, born: -D, stage: 'baby', traits: [] })); g.simTs = 70 * D - 10; g.daily = { day: 70, kind: 'greet', text: R.DAILY.greet.text, need: 3, have: 0, ids: [], done: false };
  const seen = (id) => R.applyAction(g, { t: 'observe', key: 'inspect', fish: id }, { now: 70 * D + 500, name: 'Riley' }); seen('a'); seen('a'); seen('b'); assert.equal(g.daily.have, 2, 'the same fish twice counts once'); seen('c'); assert.ok(g.daily.done);
  const un = R.newWorld(0); R.norm(un, 0); un.flags.tut = 5; un.fish = []; un.simTs = 80 * D - 10; un.daily = { day: 80, kind: 'together', text: '', need: 1, have: 0, ids: [], done: false }; R.advance(un, 80 * D + 5); assert.ok(R.DAILY[un.daily.kind].ok(un), 'a wish that became impossible is swapped');
});
ok('family trees: hatchlings keep their parents, grandparents, generation and blended colours; the record outlives the fish', () => {
  const D = 864e5, t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.level = 5; t.createdAt = -50 * D; t.visitAt = t.storyAt = 1e15; const mk = (id, name, seed, extra = {}) => R.ensureFish({ id, name, species: 'goldfish', seed, born: -9 * D, stage: 'adult', traits: ['Calm'], owner: 'u1', ownerName: 'Alex', ...extra });
  t.fish = [mk('a', 'Ada', 4), mk('b', 'Bix', 9)]; t.eggAt = 0; let now = 20 * 3600e3; R.advance(t, now); assert.equal(t.eggs.length, 1); assert.equal(t.eggs[0].pa.name, 'Ada'); assert.ok(t.eggs[0].pa.genes && t.eggs[0].pb.genes);
  now += 5 * 3600e3; const ev = R.advance(t, now); const kid = t.fish.find((f) => f.parents); assert.ok(kid && kid.gen === 1 && kid.parents.length === 2 && kid.parents.map((p) => p.name).sort().join() === 'Ada,Bix'); assert.ok(kid.genes && kid.ownerName === 'Alex');
  assert.ok(ev.some((e) => /child of/.test(e.journal ?? ''))); assert.ok(ev.some((e) => /first generation/.test(e.journal ?? '')));
  const ga = R.genesOf(4), gb = R.genesOf(9); assert.ok(Math.abs(kid.genes.dh - (ga.dh + gb.dh) / 2) <= 0.016 && kid.genes.size >= 0.9 && kid.genes.size <= 1.1, 'colours blend the parents');
  // a second generation: grandparents are remembered by name even after the grandparents are gone
  kid.born = now - 9 * D; kid.stage = 'adult'; const kid2 = mk('k2', 'Kit', 5, { parents: [{ id: 'x', name: 'Zed', parents: [] }], gen: 1, genes: R.genesOf(5) }); t.fish = [kid, kid2]; t.eggAt = 0; t.eggs = []; now += 30 * 3600e3; R.advance(t, now); now += 5 * 3600e3; R.advance(t, now);
  const grand = t.fish.find((f) => f.gen === 2); assert.ok(grand, 'a second generation'); const names = grand.parents.map((p) => p.name); assert.ok(names.includes(kid.name) && names.includes('Kit'));
  assert.ok(grand.parents.find((p) => p.name === kid.name).parents.map((q) => q.name).sort().join() === 'Ada,Bix', 'grandparents survive in the record');
  assert.ok(R.childrenOf(t, kid.id).some((c) => c.id === grand.id)); const rt = JSON.parse(JSON.stringify(t)); assert.deepEqual(rt.fish.find((f) => f.gen === 2).parents, grand.parents);
});
ok('care is credited to the caretakers who helped a fish grow, without ranking anyone', () => {
  const D = 864e5, t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.visitAt = t.eggAt = t.storyAt = 1e15; R.applyAction(t, { t: 'feed', x: 0 }, { now: 0.9 * D, name: 'Alex', uid: 'u1' }); R.applyAction(t, { t: 'water' }, { now: 0.95 * D + 1, name: 'Sam', uid: 'u2' });
  const ev = R.advance(t, 1.01 * D); assert.ok(ev.some((e) => e.activity && /Alex and Sam helped Pip grow up/.test(e.activity.text)), JSON.stringify(ev.filter((e) => e.activity)));
});
console.log(`All ${n} rule tests passed`);

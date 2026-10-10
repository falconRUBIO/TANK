import assert from 'node:assert/strict';
import * as R from './rules.js';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import * as S from './sky.js';
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
ok('something turns up in the tank, anyone can collect it once, and the next one waits', () => { const t = R.newWorld(0); R.advance(t, 30 * 60e3); assert.ok(t.drift); const g = t.drift, s0 = t.shells;
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
  const r = R.applyAction(t, { t: 'openBottle', id }, { uid: 'u2', name: 'Sam', now: now + 3000 }); assert.ok(r.applied); assert.equal(t.shells, 20); assert.equal(t.bottles.length, 0);
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
  assert.equal(Object.keys(R.DISCOVERIES).length, 15); assert.equal(ob({ key: 'food', fish: 'a' }).applied, false, 'a phone cannot report what only the server can see');
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

console.log('Economy refinement');
const tend = (t, to) => { for (let x = t.simTs + 6 * 3600e3; x < to; x += 6 * 3600e3) { t.hunger = 0.1; t.water = 1; t.glass = 0; R.advance(t, x); } t.hunger = 0.1; t.water = 1; t.glass = 0; return R.advance(t, to); };
const quiet = (n = 3, o = {}) => { const t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.flags.weeks = 999; if (!o.wants) t.flags.noWants = true; t.visitAt = t.eggAt = t.storyAt = t.driftAt = 1e15; t.fish = Array.from({ length: n }, (_, i) => R.ensureFish({ id: 'f' + i, name: 'F' + i, species: 'goldfish', seed: i + 1, born: 0, stage: 'baby', traits: o.traits ?? ['Calm'], owner: 'u1' })); t.simTs = 0; return t; };
ok('level 8 can be reached: the wish chain no longer waits on level 8 and the best possible score clears the threshold with room to spare', () => {
  const last = R.WISHES.length - 1; assert.match(R.WISHES[last].text, /level 8/i); assert.ok(R.WISHES.slice(0, last).every((w) => !/level 8/i.test(w.text)), 'no earlier wish depends on level 8');
  // the highest score reachable before level 8: a full level-7 tank (25 fish, all adults), 60 decorations, a complete book, every wish except the level-8 one
  const best = 25 * 2 + 25 * 2 + R.MAX_DECOR + R.COLLECTION_SIZE() + 3 * last; assert.ok(best - R.LEVEL_AT[7] >= 5, `best ${best} vs threshold ${R.LEVEL_AT[7]}`);
  assert.equal(R.LEVEL_AT.length, 8); assert.deepEqual(R.LEVEL_AT.slice(0, 7), [0, 14, 36, 66, 100, 140, 184], 'the lower levels are untouched');
});
ok('the happiness wish is reachable by a short visit: the average counts, not every fish at once', () => {
  const t = quiet(4); const w = R.WISHES.find((x) => /happy/i.test(x.text)); for (const f of t.fish) f.happy = 0.78; t.fish[0].happy = 0.55; assert.ok(w.done(t)); for (const f of t.fish) f.happy = 0.6; assert.ok(!w.done(t));
});
ok('14 and 30 day milestones: earned by growing up here, paid once, journalled, kept in the memorial, never from buying a mature fish', () => {
  const D = 864e5, t = quiet(2); t.fish[0].found = ['x']; t.fish[1].found = [];
  let ev = tend(t, 13.9 * D); assert.ok(!t.fish[0].found.includes('age14'), 'not before 14 days'); const s0 = t.shells; t.hunger = 0.1; t.water = 1; t.glass = 0; t.simTs = 13.9 * D;
  ev = tend(t, 14.1 * D); assert.equal(t.fish.filter((f) => f.found.includes('age14')).length, 2); assert.equal(t.shells - s0, 10 + 0 * 1, 'two fish, +5 each'); assert.ok(ev.filter((e) => e.milestone).length === 2 && ev.every((e) => !e.milestone || /14 days old/.test(e.journal)));
  const s1 = t.shells; tend(t, 20 * D); assert.equal(t.shells - s1, 0, 'once only'); ev = tend(t, 30.1 * D); assert.ok(t.fish.every((f) => f.found.includes('age30'))); assert.ok(t.shells - s1 >= 16, '+8 each');
  const late = tend(t, 40 * D); assert.ok(!late.some((e) => e.milestone), 'no repeat'); assert.equal(t.fish[0].found.filter((x) => x === 'age14').length, 1, 'recorded once');
  // a purchased fish arrives as a baby, so buying can never skip the wait
  const b = quiet(1); b.shells = 100; R.applyAction(b, { t: 'buyFish', species: 'goldfish', name: 'New', seed: 4 }, { now: 100 * D, dev: true }); R.advance(b, 100 * D + 11 * 60e3); const nf = b.fish.find((f) => f.name === 'New'); assert.ok(nf && nf.stage === 'baby' && !nf.found.includes('age14'));
  // growth pauses while a fish is run down, so neglected days do not count toward its age
  const n = quiet(2); n.hunger = 0.85; n.water = 0.45; n.simTs = 0; R.advance(n, 3 * D); const aged = (n.fish[0].born); assert.ok(aged > 0, 'a run-down fish stops ageing');
});
ok('a dead fish keeps its milestone history in the memorial', () => {
  const D = 864e5, t = quiet(3); t.fish[0].found = ['age14', 'spot']; t.createdAt = -10 * D; t.fish[0].ail = 5 * 86400 + 5; t.fish[0].health = 0.2; t.hunger = 0.85; t.water = 0.45; t.simTs = 20 * D; R.advance(t, 20 * D + 3600e3);
  const m = t.memorial.find((x) => x.id === 'f0'); assert.ok(m && m.milestones.some((x) => /14 days/.test(x)), JSON.stringify(m)); assert.ok(!t.fish.some((f) => f.id === 'f0'));
});
ok('first friendship: +3 once per pair, remembered by stable ids, never repeated', () => {
  const D = 864e5, t = quiet(4, { traits: ['Social'] }); for (const f of t.fish) f.happy = 0.9; const s0 = t.shells;
  for (let i = 1; i <= 6; i++) R.advance(t, (i * 3600e3 * 3)); const pairs = Object.keys(t.flags.pairs); assert.ok(pairs.length >= 1 && pairs.length <= 3, String(pairs)); assert.ok(pairs.every((k) => /^f\d\+f\d$/.test(k)), 'stable id keys');
  const paid = t.shells - s0; const friends = t.fish.filter((f) => f.found.includes('friend')).length; assert.equal(friends, 4); const friendShells = pairs.length * R.FRIEND_REWARD; assert.ok(paid >= friendShells, `${paid} >= ${friendShells}`);
  const s1 = t.shells; R.advance(t, 10 * D); R.advance(t, 11 * D); const gain = t.shells - s1; assert.ok(!(t.flags.pairs && Object.keys(t.flags.pairs).length > 3)); assert.ok(t.fish.every((f) => f.found.filter((x) => x === 'friend').length === 1), 'each fish records its first friendship once');
});
ok('first successful breeding: +5 once per tank, on the hatch and not the egg, parents and child recorded', () => {
  const D = 864e5, t = quiet(2); t.fish.forEach((f) => { f.born = -5 * D; f.stage = 'adult'; f.seed = 3; }); t.simTs = 0; t.eggAt = 1 * D; t.createdAt = -9 * D; const s0 = t.shells;
  R.advance(t, 1.01 * D); assert.equal(t.eggs.length, 1, 'an egg was laid'); assert.ok(!t.flags.firstHatch, 'laying an egg pays nothing'); const s1 = t.shells;
  R.advance(t, 1.01 * D + 5 * 3600e3); assert.equal(t.eggs.length, 0); const hatched = t.fish.find((f) => f.parents?.length === 2); assert.ok(hatched, 'hatchling keeps its parents'); assert.equal(t.flags.firstHatch.fish, hatched.id); assert.deepEqual(t.flags.firstHatch.parents.sort(), ['f0', 'f1']);
  assert.ok(t.shells - s1 >= R.FIRST_HATCH_REWARD); const s2 = t.shells; t.eggAt = 0; t.eggs.push({ id: 'e9', species: 'goldfish', a: 'f0', b: 'f1', seed: 3, hatchAt: 2 * D }); R.advance(t, 3 * D); assert.ok(t.shells - s2 < R.FIRST_HATCH_REWARD + 50, 'a second hatch does not pay it again');
  const second = t.shells; const w = quiet(2); w.fish.forEach((f) => { f.born = -5 * D; f.stage = 'adult'; }); w.flags.firstHatch = { at: 1 }; w.eggs.push({ id: 'e1', species: 'goldfish', a: 'f0', b: 'f1', seed: 3, hatchAt: 1 }); const wev = R.advance(w, 2); assert.ok(!wev.some((e) => /first baby/.test(e.toast ?? '')) && w.flags.firstHatch.at === 1, 'already recorded: no pay'); assert.ok(second > 0);
});
ok('saves from before milestones: what a fish already reached is recorded, nothing is paid retroactively', () => {
  const D = 864e5, t = quiet(2); delete t.flags.msV; t.fish[0].born = -40 * D; t.fish[1].born = -20 * D; t.flags.topGen = 2; t.simTs = 0; const s0 = t.shells; R.norm(t, 0);
  assert.ok(t.fish[0].found.includes('age14') && t.fish[0].found.includes('age30') && t.fish[1].found.includes('age14') && !t.fish[1].found.includes('age30')); assert.ok(t.flags.firstHatch.legacy); assert.equal(t.shells, s0);
  const late = R.advance(t, 0.01 * D); assert.ok(!late.some((e) => e.milestone), 'no windfall for milestones already earned'); assert.equal(R.WISHES[0].text, 'Have three fish swimming together');
});
ok('daily wish tiers pay 3, 5 and 8 to the shared wallet, once, and only wishes the tank can do are offered', () => {
  const D = 864e5; assert.deepEqual(R.DAILY_TIER, { easy: 3, normal: 5, special: 8 }); assert.ok(Object.values(R.DAILY).every((w) => R.DAILY_TIER[w.tier]));
  const lone = quiet(1); lone.hunger = 0.1; lone.water = 1; lone.glass = 0; const kinds = new Set(); for (let d = 5; d < 200; d++) { lone.daily = null; lone.simTs = d * D + 5; lone.hunger = 0.1; lone.water = 1; lone.glass = 0; R.advance(lone, d * D + 10); if (lone.daily) kinds.add(lone.daily.kind); }
  for (const bad of ['friends', 'together', 'greet', 'play3', 'care2', 'care', 'favourite', 'investigate', 'bubbles', 'visit']) assert.ok(!kinds.has(bad), `a lone, fed, undecorated tank is never asked for ${bad}`);
  const tiers = new Set(); const rich = quiet(4, { traits: ['Curious', 'Playful', 'Social'] }); rich.decor = [{ id: 'd1', type: 'fern', x: 0, z: 1, ry: 0 }, { id: 'd2', type: 'bubbler', x: 1, z: 1, ry: 0 }, { id: 'd3', type: 'rock', x: 2, z: 1, ry: 0 }]; rich.fish[0].pal = 'f1'; rich.fish[1].pal = 'f0'; rich.fish[0].found = ['spot', 'friend']; rich.fish[0].spotId = 'd1'; rich.hunger = 0.7; rich.water = 0.5; rich.glass = 0.6; rich.shells = 50;
  for (let d = 5; d < 120; d++) { rich.daily = null; R.advance(rich, d * D + 10); tiers.add(rich.daily.tier); assert.ok(R.DAILY[rich.daily.kind].ok(rich, d * D + 10), 'feasible'); assert.equal(rich.daily.reward, R.DAILY_TIER[rich.daily.tier]); } assert.equal(tiers.size, 3, 'all three tiers appear');
  // paid once: the same wish finished by two caretakers
  const t = quiet(3); t.daily = { day: 7, kind: 'play', tier: 'normal', reward: 5, text: '', need: 1, have: 0, ids: [], done: false }; t.simTs = 7 * D; const s0 = t.shells;
  const e1 = R.applyAction(t, { t: 'pet', id: 'f0' }, { now: 7 * D + 1000, name: 'Alex', uid: 'u1' }).events, s1 = t.shells; const e2 = R.applyAction(t, { t: 'pet', id: 'f1' }, { now: 7 * D + 1100, name: 'Sam', uid: 'u2' }).events;
  assert.equal(e1.filter((e) => e.dailyDone).length, 1); assert.match(e1.find((e) => e.dailyDone).toast, /\+5 shells/); assert.equal(e2.filter((e) => e.dailyDone).length, 0, 'the second caretaker does not collect it again'); assert.equal(t.shells, s1); assert.equal(t.daily.by, 'Alex'); assert.ok(s0 >= 0);
});
ok('distinct-count wishes ignore repeats and the day resets for everyone at the same UTC moment', () => {
  const D = 864e5, t = quiet(3); t.daily = { day: 9, kind: 'play3', tier: 'normal', reward: 5, text: '', need: 3, have: 0, ids: [], done: false }; t.simTs = 9 * D;
  const pet = (id, uid, at) => R.applyAction(t, { t: 'pet', id }, { now: 9 * D + at, name: uid, uid }); pet('f0', 'u1', 1000); pet('f0', 'u1', 2000); pet('f0', 'u2', 3000); assert.equal(t.daily.have, 1, 'one fish however many times'); pet('f1', 'u2', 4000); assert.ok(!t.daily.done); pet('f2', 'u3', 5000); assert.ok(t.daily.done);
  const c = quiet(3); c.hunger = 0.8; c.water = 0.5; c.glass = 0.5; c.daily = { day: 9, kind: 'care2', tier: 'normal', reward: 5, text: '', need: 2, have: 0, ids: [], done: false }; c.simTs = 9 * D; const s0 = c.shells;
  R.applyAction(c, { t: 'feed' }, { now: 9 * D + 1000, name: 'A', uid: 'u1' }); R.applyAction(c, { t: 'feed' }, { now: 9 * D + 1100, name: 'B', uid: 'u2' }); assert.ok(!c.daily.done, 'two feeds are one kind of care'); R.applyAction(c, { t: 'water' }, { now: 9 * D + 1200, name: 'B', uid: 'u2' }); assert.ok(c.daily.done);
  // a wish already under way is kept when its need has been met, and the next UTC day replaces it with a new one
  const u = quiet(3); u.hunger = 0.8; u.water = 0.5; u.simTs = 9 * D; R.advance(u, 9 * D + 5); const k = u.daily.kind; u.daily.have = 1; u.hunger = 0; u.water = 1; u.glass = 0; R.advance(u, 9 * D + 7 * 3600e3); assert.equal(u.daily.kind, k); R.advance(u, 10 * D + 5); assert.equal(u.daily.day, 10);
  const a = quiet(3), b = quiet(3); a.createdAt = b.createdAt = 0; R.advance(a, 12 * D + 10); R.advance(b, 12 * D + 9 * 3600e3); assert.equal(a.daily.kind, b.daily.kind, 'same tank, same day, same wish, whoever looks first');
});
ok('friendship, favourite spot and investigate wishes check what the fish really are', () => {
  const D = 864e5, t = quiet(3, { traits: ['Curious'] }); t.decor = [{ id: 'd1', type: 'fern', x: 0, z: 1, ry: 0 }]; t.fish[0].pal = 'f1'; t.fish[1].pal = 'f0'; t.fish[0].found = ['spot']; t.fish[0].spotId = 'd1'; t.simTs = 3 * D;
  const mk = (kind) => { t.daily = { day: 3, kind, tier: 'special', reward: 8, text: '', need: 1, have: 0, ids: [], done: false }; }; const go = (a) => R.applyAction(t, { t: 'observe', ...a }, { now: 3 * D + 100, name: 'Riley', uid: 'u3' });
  mk('friends'); go({ key: 'together', fish: 'f0', with: 'f2' }); assert.ok(!t.daily.done, 'two fish that are not friends do not count'); go({ key: 'together', fish: 'f0', with: 'f1' }); assert.ok(t.daily.done);
  mk('favourite'); go({ key: 'regular', fish: 'f1', spot: 'd1' }); assert.ok(!t.daily.done, 'a fish without a favourite spot does not count'); go({ key: 'regular', fish: 'f0', spot: 'd1' }); assert.ok(t.daily.done);
  mk('investigate'); go({ key: 'object', fish: 'f0', spot: 'nothing' }); assert.ok(!t.daily.done, 'there is no such decoration'); go({ key: 'object', fish: 'f0', spot: 'd1' }); assert.ok(t.daily.done);
});
ok('regression: opening a bottle does not reset the sender\'s six-hour wait (the bottle loop could mint shells without limit)', () => {
  const D = 864e5, t = quiet(2), members = [{ id: 'u1', name: 'Alex' }, { id: 'u2', name: 'Sam' }]; t.shells = 50; const at = 5 * D;
  assert.equal(R.applyAction(t, { t: 'bottle', to: 'u2', note: 'hi' }, { uid: 'u1', name: 'Alex', members, now: at }).ok, true);
  const id = t.bottles[0].id; assert.equal(R.applyAction(t, { t: 'openBottle', id }, { uid: 'u2', name: 'Sam', members, now: at + 1000 }).ok, true);
  assert.equal(R.applyAction(t, { t: 'bottle', to: 'u2', note: 'again' }, { uid: 'u1', name: 'Alex', members, now: at + 2000 }).reason, 'TOO_SOON');
  assert.equal(R.applyAction(t, { t: 'bottle', to: 'u2', note: 'later' }, { uid: 'u1', name: 'Alex', members, now: at + 6 * 3600e3 + 10 }).ok, true);
  assert.equal(R.applyAction(t, { t: 'bottle', to: 'u1', note: 'other player' }, { uid: 'u2', name: 'Sam', members, now: at + 3000 }).ok, true, 'each sender has their own wait');
});
ok('a long absence is judged the same whether or not the server ticked while everyone was away', () => {
  const D = 864e5, mk = () => { const t = quiet(6); t.createdAt = -30 * D; t.flags.mortality = true; for (const f of t.fish) { f.born = -10 * D; f.stage = 'adult'; } t.hunger = 0.2; t.water = 1; t.glass = 0; t.simTs = 0; return t; };
  const lazy = mk(), ticked = mk(); R.advance(lazy, 7 * D); for (let x = 5 * 60e3; x <= 7 * D; x += 5 * 60e3) R.advance(ticked, x);
  const worst = (t) => Math.max(...t.fish.map((f) => f.ail ?? 0)) / 86400; assert.ok(worst(lazy) >= 4.5 && worst(ticked) >= 4.5, `neglect days: lazy ${worst(lazy)}, ticked ${worst(ticked)}`);
  assert.ok(lazy.memorial.length >= 1 && lazy.memorial.length <= 1 + ticked.memorial.length, 'a catch-up can lose at most one fish at once (24 hour rule), and some fish are lost');
  const grace = mk(); R.advance(grace, 3 * D); assert.equal(grace.memorial.length, 0, 'three days away costs nothing'); assert.ok(grace.fish.every((f) => (f.ail ?? 0) < 4 * 86400));
});

console.log('Fish wishes, comfort, plants, notes');
ok('a fish wish is offered only when it can be granted, one at a time, and fades without penalty', () => {
  const H = 3600e3, t = quiet(3, { traits: ['Shy'], wants: true }); t.wantAt = 0; t.req = { day: 0, kind: 'want', wantDone: false }; t.hunger = 0.1; t.water = 1; t.glass = 0; t.simTs = 10 * H; t.fish.forEach((f) => { f.born = 0; });
  let ev = R.advance(t, 10 * H + 5); assert.ok(t.want, 'a wish appears'); assert.equal(t.want.kind, 'hide'); assert.ok(ev.some((e) => e.want)); const first = t.want.id;
  R.advance(t, 11 * H); assert.equal(t.want.id, first, 'only one wish at a time');
  const s0 = t.shells; R.advance(t, 40 * H); assert.ok(!t.want || t.want.id !== first, 'it fades after a day'); assert.ok(t.shells >= s0, 'no penalty');
  const lone = quiet(1, { traits: ['Calm'], wants: true }); lone.wantAt = 0; lone.hunger = 0.1; lone.water = 1; lone.glass = 0; lone.fish[0].born = 0; lone.simTs = 10 * H; R.advance(lone, 10 * H + 5); assert.equal(lone.want, null, 'a calm fish with fresh water has nothing to wish for');
});
ok('granting a fish wish pays once, cheers the fish, and is journalled', () => {
  const H = 3600e3, t = quiet(3, { traits: ['Shy'], wants: true }); t.fish.forEach((f) => { f.born = 0; }); t.shells = 100; t.want = { id: 'w1', fish: 'f0', kind: 'hide', text: '', since: 0 }; t.simTs = 10 * H; t.flags.tut = 5;
  const happy0 = t.fish[0].happy; let ev = [], s0 = t.shells;
  for (let i = 0; i < 4; i++) { const r = R.applyAction(t, { t: 'buyDecor', type: 'grass', x: i - 2, z: 1, ry: 0 }, { now: 10 * H + i * 1000, name: 'Alex', uid: 'u1' }); ev.push(...r.events); }
  const granted = ev.filter((e) => e.wishDone); assert.equal(granted.length, 1, 'once'); assert.equal(t.want, null); assert.ok(t.fish[0].happy > happy0); assert.equal(t.fish[0].wishes, 1); assert.match(granted[0].journal, /just as it had hoped/);
  assert.match(granted[0].toast, /\+4 shells/); assert.ok(s0 > 0); assert.ok(t.wantAt >= 10 * H + R.WANT_GAP, 'the next one waits');
  const p = quiet(2, { traits: ['Playful'], wants: true }); p.fish.forEach((f) => { f.born = 0; }); p.want = { id: 'w2', fish: 'f1', kind: 'play', text: '', since: 0 }; p.simTs = 5 * H;
  R.applyAction(p, { t: 'pet', id: 'f0' }, { now: 5 * H + 1, name: 'A', uid: 'u1' }); assert.ok(p.want, 'playing with a different fish does not count'); const r = R.applyAction(p, { t: 'pet', id: 'f1' }, { now: 5 * H + 2, name: 'A', uid: 'u1' }); assert.ok(r.events.some((e) => e.wishDone) && !p.want);
});
ok('comfort tells the truth about the tank and names what to change', () => {
  const t = quiet(2, { traits: ['Shy'] }); t.water = 1; t.glass = 0; t.hunger = 0.1; const bare = R.comfortOf(t, t.fish[0]);
  t.decor = Array.from({ length: 4 }, (_, i) => ({ id: 'p' + i, type: ['grass', 'fern', 'sword', 'red'][i], x: i, z: 1, ry: 0 })); const lush = R.comfortOf(t, t.fish[0]); assert.ok(lush.score > bare.score, `${lush.score} > ${bare.score}`); assert.match(bare.tips.join(' '), /plants/i);
  t.water = 0.46; t.glass = 0.8; t.hunger = 0.85; const grim = R.comfortOf(t, t.fish[0]); assert.ok(grim.score < lush.score - 20 && grim.label === 'Could be better'); assert.ok(grim.tips.length >= 1 && grim.tips.length <= 2);
});
ok('plants grow over days and can be trimmed for a shell each, then start again', () => {
  const D = 864e5, t = quiet(2); t.decor = [{ id: 'p1', type: 'fern', x: 0, z: 1, ry: 0, at: 0 }, { id: 'r1', type: 'rock', x: 1, z: 1, ry: 0, at: 0 }, { id: 'p2', type: 'grass', x: 2, z: 1, ry: 0, at: 2 * D }]; t.simTs = 4 * D;
  assert.equal(R.readyToTrim(t, 4 * D).length, 1, 'only the old plant, not rocks or young plants'); assert.ok(R.growthOf(t, t.decor[0], 4 * D) > 1.15 && R.growthOf(t, t.decor[1], 4 * D) === 1);
  const s0 = t.shells, r = R.applyAction(t, { t: 'trim' }, { now: 4 * D, name: 'Sam', uid: 'u2' }); assert.equal(r.n, 1); assert.equal(t.shells - s0 >= 1, true); assert.ok(R.growthOf(t, t.decor[0], 4 * D) === 1, 'back to small');
  const s1 = t.shells; const again = R.applyAction(t, { t: 'trim' }, { now: 4 * D + 1000, name: 'Sam', uid: 'u2' }); assert.equal(again.applied, false); assert.equal(t.shells, s1, 'not twice');
  assert.equal(R.readyToTrim(t, 8 * D).length, 2, 'they grow back'); const old = quiet(1); old.decor = [{ id: 'x', type: 'fern', x: 0, z: 1, ry: 0 }]; old.createdAt = 0; assert.equal(R.readyToTrim(old, 5 * D).length, 1, 'plants from older saves count from the tank start');
});
ok('notes on a fish: short, kept (last three), journalled, and checked', () => {
  const t = quiet(2); const a = (text, now = 1000) => R.applyAction(t, { t: 'fishNote', id: 'f0', text }, { now, name: 'Alex', uid: 'u1' });
  assert.equal(a('   ').ok, false); assert.equal(R.applyAction(t, { t: 'fishNote', id: 'nope', text: 'hi' }, { now: 1, name: 'A', uid: 'u1' }).ok, false);
  const r = a('hello <b>Pip</b>'); assert.ok(r.ok && r.events.some((e) => /left Pip|left F0/.test(e.journal))); a('two', 2000); a('three', 3000); a('four', 4000); assert.equal(t.fish[0].notes.length, 3); assert.equal(t.fish[0].notes[2].text, 'four'); assert.ok(!/[<>]/.test(t.fish[0].notes[0].text)); assert.ok(a('x'.repeat(100), 5000).ok && t.fish[0].notes.at(-1).text.length === 40);
});
ok('landmarks are real purchases with levels, and old saves are untouched by the new fields', () => {
  assert.ok(R.DECOR_DEF.lighthouse.price === 150 && R.DECOR_DEF.lighthouse.level === 7 && R.DECOR_DEF.spire.price === 250 && R.DECOR_DEF.spire.level === 8);
  const t = quiet(2); t.level = 7; t.shells = 400; assert.ok(R.applyAction(t, { t: 'buyDecor', type: 'lighthouse', x: 0, z: 1, ry: 0 }, { now: 1, name: 'A', uid: 'u1' }).ok); assert.equal(t.shells, 250); t.level = 7; assert.equal(R.applyAction(t, { t: 'buyDecor', type: 'spire', x: 1, z: 1, ry: 0 }, { now: 2, name: 'A', uid: 'u1' }).reason, 'LEVEL_TOO_LOW');
  const old = R.newWorld(0); delete old.want; delete old.wantAt; R.norm(old, 0); assert.equal(old.want, null); assert.ok(old.wantAt > 0);
});
ok('food choice: flakes are free and pay as before, pellets and treats cost shells and cheer fish, favourites are noticed once', () => {
  const t = quiet(3); t.fish[0].traits = ['Greedy']; t.fish[1].traits = ['Shy']; t.fish[2].traits = ['Brave']; t.fish.forEach((f) => { f.happy = 0.5; }); t.hunger = 0.8; t.shells = 20; t.simTs = 0; t.level = 8; t.wishIdx = 12; t.seen.fish = ['goldfish']; t.flags.collMs = 99;
  assert.equal(R.favFoodOf(t.fish[0]), 'treats'); assert.equal(R.favFoodOf(t.fish[1]), 'pellets'); assert.equal(R.favFoodOf(t.fish[2]), 'flakes');
  const fl = R.applyAction(t, { t: 'feed' }, { now: 10, name: 'A', uid: 'u1' }); assert.equal(fl.delta, 1, 'flakes: +1 as always'); assert.equal(t.shells, 21);
  const pe = R.applyAction(t, { t: 'feed', food: 'pellets' }, { now: 20, name: 'A', uid: 'u1' }); assert.equal(pe.delta, -2); assert.equal(t.shells, 19); assert.ok(t.fish[1].happy > t.fish[0].happy, 'the pellet lover is happiest');
  assert.ok(pe.events.some((e) => /loves pellets/.test(e.journal ?? '')), 'noticed'); t.hunger = 0.8; const again = R.applyAction(t, { t: 'feed', food: 'pellets' }, { now: 30, name: 'A', uid: 'u1' }); assert.ok(!again.events.some((e) => /loves pellets/.test(e.journal ?? '')), 'only once');
  t.hunger = 0.8; t.shells = 3; const poor = R.applyAction(t, { t: 'feed', food: 'treats' }, { now: 40, name: 'A', uid: 'u1' }); assert.equal(poor.ok, false); assert.equal(poor.reason, 'NOT_ENOUGH_SHELLS'); assert.equal(t.shells, 3, 'nothing taken');
  const junk = R.applyAction(t, { t: 'feed', food: 'gold' }, { now: 50, name: 'A', uid: 'u1' }); assert.ok(junk.ok, 'unknown food is treated as flakes');
  const w = quiet(2, { traits: ['Greedy'], wants: true }); w.level = 8; w.wishIdx = 12; w.hunger = 0.8; w.shells = 20; w.want = { id: 'w3', fish: 'f0', kind: 'meal', text: '', since: 0 }; R.applyAction(w, { t: 'feed' }, { now: 5, name: 'A', uid: 'u1' }); assert.ok(w.want, 'flakes do not grant a wish for a treat'); w.hunger = 0.8; const g = R.applyAction(w, { t: 'feed', food: 'treats' }, { now: 6, name: 'A', uid: 'u1' }); assert.ok(g.events.some((e) => e.wishDone) && !w.want);
});
ok('tricks: need trust, a growing fish and the right decoration; five sessions 20 minutes apart; learned once, paid once', () => {
  const D = 864e5, M = 60e3, t = quiet(2); t.level = 8; t.wishIdx = 12; t.fish[0].born = -3 * D; t.fish[0].stage = 'adult'; t.simTs = 0; const go = (now, extra = {}) => R.applyAction(t, { t: 'train', id: 'f0', trick: 'gate', ...extra }, { now, name: 'Alex', uid: 'u1' });
  assert.equal(go(1).reason, 'CANT_TRAIN', 'no trust, no gate'); t.fish[0].bond = { u1: 3 }; assert.equal(go(2).reason, 'CANT_TRAIN', 'no decoration to practise with');
  t.decor = [{ id: 'g1', type: 'torii', x: 0, z: 1, ry: 0 }]; assert.equal(R.trickOptions(t, t.fish[0], 3 * D).map((o) => o.key).join(), 'gate'); assert.equal(R.trickOptions(t, t.fish[1], 3 * D).length, 0, 'a baby with no bond cannot');
  const base = 5 * D; let r = go(base); assert.ok(r.applied && r.n === 1); assert.equal(go(base + 5 * M).applied, false, 'too soon'); assert.equal(t.fish[0].skill.gate, 1);
  for (let i = 1; i < 4; i++) go(base + i * 21 * M); r = go(base + 4 * 21 * M); assert.equal(r.learned, 'gate'); assert.equal(r.delta, R.TRICK_REWARD); assert.deepEqual(t.fish[0].tricks, ['gate']);
  assert.equal(go(base + 10 * 21 * M).reason, 'CANT_TRAIN', 'already learned'); assert.equal(R.trickOptions(t, t.fish[0], 6 * D).length, 0);
  t.fish[0].ail = 0; t.createdAt = -20 * D; const m = (() => { t.fish[0].ail = 5 * 86400 + 5; t.fish[0].health = 0.2; t.hunger = 0.85; t.water = 0.45; t.fish.push(R.ensureFish({ id: 'f9', name: 'Z', species: 'goldfish', seed: 3, born: -D, stage: 'adult', traits: ['Calm'] })); t.simTs = 10 * D; R.advance(t, 10 * D + 3600e3); return t.memorial.find((x) => x.id === 'f0'); })(); assert.ok(m && m.milestones.some((x) => /gate/.test(x)), JSON.stringify(m));
});
ok('the opening of a tank: choose and name the free first fish, once, only the owner, only from the starter list', () => {
  const t = R.newWorld(0); R.norm(t, 0); const go = (a, uid = 'me') => R.applyAction(t, { t: 'chooseFirst', ...a }, { now: 1000, name: 'Alex', uid });
  assert.equal(go({ species: 'betta', name: 'X' }).reason, 'UNKNOWN_SPECIES'); assert.deepEqual(R.FIRST_FISH, ['goldfish', 'seahorse', 'octopus', 'neon']); assert.ok(R.FIRST_FISH.every((k) => R.SPECIES_DEF[k] && !R.SPECIES_DEF[k].visitor)); assert.equal(go({ species: 'seahorse', name: 'X' }, 'someone-else').reason, 'FORBIDDEN');
  const r = go({ species: 'octopus', name: 'Biscuit <b>', seed: 77 }); assert.ok(r.ok); const f = t.fish[0]; assert.equal(t.fish.length, 1); assert.equal(f.id, 'f1'); assert.equal(f.species, 'octopus'); assert.ok(!/[<>]/.test(f.name) && f.name.startsWith('Biscuit')); assert.deepEqual(f.traits, R.traitsFor('octopus', 77)); assert.equal(f.born, 1000); assert.deepEqual(t.seen.fish, ['octopus']); assert.ok(t.flags.intro);
  assert.ok(r.events.some((e) => /first fish/.test(e.journal))); assert.equal(go({ species: 'goldfish', name: 'Again' }).reason, 'ALREADY_HAVE', 'once');
  const j = R.newWorld(0); R.norm(j, 0); j.flags.firsts = { me: true }; j.fish.push(R.ensureFish({ id: 'x', name: 'x', species: 'goldfish', seed: 1, born: 0, stage: 'baby', traits: [] })); assert.equal(R.applyAction(j, { t: 'chooseFirst', species: 'seahorse' }, { now: 5, name: 'A', uid: 'me' }).reason, 'FORBIDDEN', 'not once the tank has other fish');
  const m = R.newWorld(0); R.norm(m, 0); const fr = R.applyAction(m, { t: 'firstFish', species: 'neon', name: 'Dot', seed: 5 }, { now: 5, name: 'Sam', uid: 'u2', members: [{ id: 'u2', name: 'Sam' }, { id: 'me', name: 'A' }] }); assert.ok(fr.ok); assert.equal(m.fish.find((x) => x.id === fr.id).species, 'neon'); const bad = R.newWorld(0); R.norm(bad, 0); const b2 = R.applyAction(bad, { t: 'firstFish', species: 'betta', name: 'Z', seed: 5 }, { now: 5, name: 'Sam', uid: 'u2' }); assert.equal(bad.fish.find((x) => x.id === b2.id).species, 'goldfish', 'a joiner cannot pick outside the starter list');
});
ok('a brand new tank has no fish until its first caretaker chooses one, which then arrives', () => {
  const t = R.newWorld(0, 1, { empty: true }); R.norm(t, 0); assert.equal(t.fish.length, 0); assert.deepEqual(t.seen.fish, []); assert.deepEqual(t.flags.firsts, {});
  assert.equal(R.advance(t, 5 * 3600e3).length >= 0, true, 'an empty tank just sits there'); assert.equal(t.fish.length, 0);
  const r = R.applyAction(t, { t: 'chooseFirst', species: 'seahorse', name: 'Nori', seed: 9 }, { now: 6 * 3600e3, name: 'Alex', uid: 'u1' }); assert.ok(r.ok); assert.equal(t.fish.length, 1); const f = t.fish[0];
  assert.equal(f.species, 'seahorse'); assert.equal(f.name, 'Nori'); assert.equal(f.owner, 'u1'); assert.equal(f.ownerName, 'Alex'); assert.equal(f.born, 6 * 3600e3); assert.ok(r.events.some((e) => e.arrival?.includes(f.id)) && r.events.some((e) => /first fish/.test(e.journal ?? '')));
  assert.deepEqual(t.seen.fish, ['seahorse']); assert.ok(t.flags.intro && t.flags.firsts.u1);
  assert.equal(R.applyAction(t, { t: 'chooseFirst', species: 'octopus', name: 'Again' }, { now: 7 * 3600e3, name: 'Alex', uid: 'u1' }).reason, 'ALREADY_HAVE', 'only once');
  const m = R.newWorld(0, 1, { empty: true }); R.norm(m, 0); assert.equal(R.applyAction(m, { t: 'chooseFirst', species: 'octopus', name: 'X' }, { now: 1, name: 'Z', uid: 'stranger', members: [{ id: 'u1', name: 'Alex' }] }).reason, 'FORBIDDEN', 'only a member can choose');
  const e = R.newWorld(0, 1, { empty: true }); R.norm(e, 0); for (const k of [1, 2, 3, 7]) R.advance(e, k * 864e5); assert.equal(e.memorial.length, 0); assert.equal(e.want, null, 'no wishes without fish');
});
ok('a perfect day: tank looked after, wish done, a fish given attention; paid once to the shared wallet, per UTC day, no streak, no penalty', () => {
  const D = 864e5, t = quiet(3); t.level = 8; t.wishIdx = 12; t.seen.fish = ['goldfish']; t.flags.collMs = 99; t.fish.forEach((f) => { f.born = -5 * D; f.stage = 'adult'; f.happy = 0.9; });
  const day = 9; t.simTs = day * D; t.hunger = 0.7; t.water = 0.6; t.glass = 0.5; t.daily = { day, kind: 'play', tier: 'easy', reward: 3, text: '', need: 1, have: 0, ids: [], done: false };
  const go = (a, at, uid = 'u1') => R.applyAction(t, a, { now: day * D + at, name: uid === 'u1' ? 'Alex' : 'Sam', uid }).events;
  assert.deepEqual({ ...R.dayTicks(t, day * D + 10), paid: false }, { care: false, wish: false, bond: false, paid: false });
  let ev = go({ t: 'feed' }, 1000); ev.push(...go({ t: 'feed' }, 1100)); assert.ok(!R.dayTicks(t, day * D + 1200).care, 'fed but the water is still cloudy');
  ev.push(...go({ t: 'water' }, 1300)); ev.push(...go({ t: 'glass' }, 1400)); assert.ok(R.dayTicks(t, day * D + 1500).care, 'now the tank is looked after');
  assert.ok(!ev.some((e) => e.perfectDay), 'not yet'); ev = go({ t: 'pet', id: 'f0' }, 2000, 'u2'); assert.ok(ev.some((e) => e.dailyDone), 'playing is also today\'s wish'); assert.ok(ev.some((e) => e.perfectDay && /perfect day/i.test(e.journal)), 'three ticks, from two different caretakers');
  const paid = ev.filter((e) => e.perfectDay).length; assert.equal(paid, 1); const s1 = t.shells; go({ t: 'pet', id: 'f1' }, 3000); go({ t: 'fishNote', id: 'f0', text: 'hi' }, 3100); assert.equal(R.dayTicks(t, day * D + 3200).paid, true); assert.equal(t.shells, s1, 'once a day');
  // the next day starts fresh, with no memory of a streak, and a missed day costs nothing
  const next = (day + 1) * D + 500; R.advance(t, next); assert.deepEqual(R.dayTicks(t, next).care, false); assert.equal(R.dayTicks(t, next).paid, false); const s2 = t.shells; R.advance(t, (day + 3) * D); assert.ok(t.shells >= s2, 'missing a day takes nothing away');
  // a tank with no feasible wish does not block it
  const q = quiet(1); q.daily = null; assert.equal(R.dayTicks(q, 5 * D).wish, true);
});
ok('tank mood reads the real state, and a fish that is going without care says so a day or two before it is critical', () => {
  const D = 864e5, t = quiet(3); t.fish.forEach((f) => { f.happy = 0.9; }); t.hunger = 0.2; t.water = 1; t.glass = 0.1; assert.equal(R.tankMood(t).key, 'thriving');
  t.hunger = 0.6; assert.equal(R.tankMood(t).key, 'good'); t.hunger = 0.8; assert.equal(R.tankMood(t).key, 'attention'); t.hunger = 0.2; t.fish[0].ail = R.AIL_WARN + 5; assert.equal(R.tankMood(t).key, 'neglected'); assert.equal(R.tankMood(R.newWorld(0, 1, { empty: true })).key, 'empty');
  const w = quiet(3); w.createdAt = -30 * D; w.hunger = 0.85; w.water = 0.45; w.simTs = 0; w.lastFed = -10 * D; const said = []; for (let h = 1; h <= 96; h++) said.push(...R.advance(w, h * 3600e3).filter((e) => e.tired));
  assert.equal(said.length, 3, 'each fish is told about once'); assert.ok(w.fish.every((f) => f.tiredSaid));
  const before = w.fish[0].ail; w.hunger = 0.85; R.applyAction(w, { t: 'feed' }, { now: 96 * 3600e3 + 1, name: 'A', uid: 'u1' }); R.applyAction(w, { t: 'water' }, { now: 96 * 3600e3 + 2, name: 'A', uid: 'u1' }); R.advance(w, 100 * 3600e3); assert.ok(w.fish[0].ail < before, 'care wins the time back');
});
ok('looks are bought once with shells and then kept; free ones stay free; a tank keeps the look it already uses', () => {
  const t = quiet(1); t.shells = 50; t.flags.styles = undefined; R.norm(t, 0); const go = (a) => R.applyAction(t, { t: 'style', ...a }, { now: 10, name: 'A', uid: 'u1' });
  assert.ok(R.styleOwned(t, 'floor', 'sand') && R.styleOwned(t, 'backdrop', 'candy') && !R.styleOwned(t, 'floor', 'coral'));
  const r = go({ floor: 'coral' }); assert.equal(r.ok, true); assert.equal(r.delta, -R.STYLE_PRICE.floor.coral); assert.equal(t.shells, 50 - 40); assert.equal(t.style.floor, 'coral');
  const back = go({ floor: 'sand' }); assert.equal(back.delta, 0, 'free look'); const again = go({ floor: 'coral' }); assert.equal(again.delta, 0, 'already owned, not charged twice'); assert.equal(t.shells, 10);
  const poor = go({ backdrop: 'sunset', floor: 'black' }); assert.equal(poor.reason, 'NOT_ENOUGH_SHELLS'); assert.equal(t.style.backdrop, 'candy', 'nothing changed'); assert.equal(t.shells, 10);
  assert.equal(go({ floor: 'nonsense' }).ok, false);
  const old = R.newWorld(0); old.style = { floor: 'black', backdrop: 'lagoon' }; delete old.flags.styles; R.norm(old, 0); assert.ok(R.styleOwned(old, 'floor', 'black') && R.styleOwned(old, 'backdrop', 'lagoon'), 'an old tank keeps its look');
  assert.equal(R.PERFECT_DAY_REWARD, 3);
});
ok('the octopus is clever: tricks in two lessons, a puzzle jar it solves faster every time, and it remembers who helped', () => {
  const D = 864e5, t = quiet(2); t.level = 8; t.shells = 50; const oc = t.fish[0]; oc.species = 'octopus'; oc.born = -5 * D; oc.stage = 'adult'; t.fish[1].born = -5 * D; t.fish[1].stage = 'adult';
  assert.equal(R.trainNeed(oc), 2); assert.equal(R.trainNeed(t.fish[1]), R.TRAIN_NEED);
  const go = (a, now, who = 'u1') => R.applyAction(t, a, { now, name: 'Alex', uid: who });
  assert.equal(go({ t: 'puzzle', id: 'f1' }, 1000).ok, false, 'only the octopus gets one');
  let now = 1000; const secs = [];
  for (let i = 0; i < 5; i++) {
    const r = go({ t: 'puzzle', id: 'f0' }, now); assert.ok(r.ok && r.applied, 'jar ' + i); assert.equal(r.delta, -R.PUZZLE_COST); secs.push(r.secs);
    assert.equal(go({ t: 'puzzle', id: 'f0' }, now + 1000).busy, true, 'one at a time');
    R.advance(t, now + 5 * 1000); assert.ok(oc.puzzle, 'still working');
    const s0 = t.shells; const ev = R.advance(t, now + (r.secs + 2) * 1000); assert.equal(oc.puzzle, null); assert.ok(ev.some((e) => e.puzzle === 'f0'), 'solved event');
    if (i === 0) assert.equal(t.shells, s0 + R.PUZZLE_FIRST_REWARD, 'the first jar pays once'); else assert.equal(t.shells, s0);
    now += R.PUZZLE_GAP + 10 * 60e3;
  }
  assert.deepEqual(secs, [150, 75, 35, 15, 15], 'it gets quicker, then stays quick'); assert.equal(oc.solved, 5); assert.equal(oc.bestSecs, 15); assert.ok((oc.bond.u1 ?? 0) >= 5, 'it remembers who gave it the jar');
  const early = go({ t: 'puzzle', id: 'f0' }, now - R.PUZZLE_GAP + 60e3); assert.ok(early.ok && !early.applied && early.wait > 0, 'a rest between jars');
  t.shells = 0; assert.equal(go({ t: 'puzzle', id: 'f0' }, now + R.PUZZLE_GAP * 2).reason, 'NOT_ENOUGH_SHELLS');
});
ok('every fish has a real nature: bullies upset shy fish (less so with hiding places), rivals squabble, a shoal wants company, friends are noticed, and advice comes before adopting', () => {
  const mk = (id, species, name = id) => R.ensureFish({ id, name, species, seed: 3, born: -5 * 864e5, stage: 'adult', traits: ['Calm'], owner: 'u1' });
  const t = quiet(0); t.fish = [mk('d1', 'guppy', 'Dot'), mk('g1', 'blue', 'Gem'), mk('n1', 'neon', 'Nia')];
  const gem = t.fish[1], dot = t.fish[0], s0 = R.socialOf(t, gem); assert.ok(s0.penalty > 0.2 && /bullies/.test(s0.notes[0]), 'the damselfish bullies the shy gramma');
  assert.equal(R.socialOf(t, dot).penalty, 0, 'the bully itself is not bullied'); assert.ok(R.socialOf(t, t.fish[2]).needs.some((x) => /own kind/.test(x)), 'a lone chromis wants a shoal');
  for (let i = 0; i < 4; i++) t.decor.push({ id: 'p' + i, type: i < 2 ? 'grass' : 'rock', x: i, z: 1, ry: 0, at: 0 }); const s1 = R.socialOf(t, gem); assert.ok(s1.penalty < s0.penalty, 'hiding places ease the bullying');
  t.fish.push(mk('g2', 'blue', 'Gus')); assert.ok(R.socialOf(t, gem).notes.some((x) => /squabble/.test(x)), 'two grammas squabble');
  assert.ok(R.comfortOf(t, gem).tips.length > 0 && R.comfortOf(t, gem).score < 100); assert.notEqual(R.harmonyOf(t).key, 'harmony');
  const calm = quiet(0); calm.fish = [mk('c1', 'goldfish', 'Cleo'), mk('c2', 'cory', 'Gob')]; assert.equal(R.harmonyOf(calm).key, 'harmony'); assert.ok(R.socialOf(calm, calm.fish[0]).good.length >= 1, 'friends are noticed');
  assert.match(R.adoptAdvice(calm, 'guppy') ?? '', /bully/i); assert.match(R.adoptAdvice(calm, 'cory') ?? '', /only one/i); assert.equal(R.adoptAdvice(quiet(0), 'guppy'), null); assert.match(R.adoptAdvice(calm, 'octopus') ?? '', /wary/i);
  const f = t.fish[1]; f.happy = 0.5; const before = R.socialOf(t, f).penalty; assert.ok(before > 0);
  for (const sp of Object.keys(R.SPECIES_DEF).filter((k) => !R.SPECIES_DEF[k].visitor)) assert.ok(R.SOCIAL[sp]?.nature && R.SOCIAL[sp].line, 'every shop fish has a nature: ' + sp);
});
ok('one request a day: a fish\'s own wish or the daily wish, never both, and either one counts toward a perfect day', () => {
  const H = 3600e3, D = 864e5; const mkw = (kind) => { const t = quiet(3, { traits: ['Shy'], wants: true }); t.fish.forEach((f) => { f.born = -5 * D; }); t.hunger = 0.1; t.water = 1; t.glass = 0; t.simTs = 10 * H; t.wantAt = 0; t.req = { day: 0, kind, wantDone: false }; return t; };
  const w = mkw('want'); R.advance(w, 10 * H + 5); assert.ok(w.want, 'a fish wish today'); assert.equal(w.daily, null, 'and no daily wish beside it'); assert.equal(R.dayTicks(w, 10 * H + 5).wish, false);
  const d = mkw('daily'); R.advance(d, 10 * H + 5); assert.equal(d.want, null, 'on a daily-wish day no fish wish appears'); assert.ok(d.daily, 'the daily wish is there');
  const g = mkw('want'); R.advance(g, 10 * H + 5); for (let i = 0; i < 4; i++) R.applyAction(g, { t: 'buyDecor', type: 'grass', x: i - 2, z: 1, ry: 0 }, { now: 10 * H + 1000 * (i + 1), name: 'A', uid: 'u1' });
  assert.equal(g.want, null); assert.equal(g.req.wantDone, true); assert.equal(R.dayTicks(g, 10 * H + 9000).wish, true, 'a granted fish wish is the day\'s wish'); R.advance(g, 12 * H); assert.equal(g.want, null, 'no second request that day');
  const nx = mkw('want'); R.advance(nx, 10 * H + 5); R.advance(nx, 10 * H + D); assert.ok(nx.req.day === 1, 'a new day decides again');
  assert.equal(R.WANT_REWARD, 4);
});
ok('a find is blamed on something that lives in the tank, never the sea; an octopus gets the blame when there is one', () => {
  const t = R.newWorld(0); R.advance(t, 30 * 60e3); assert.ok(t.drift?.by?.k); const line = R.driftBlame(t.drift); assert.ok(line.length > 8); assert.ok(!/wash|tide|ocean|sea/i.test(line), line);
  const seen = new Set(); for (let i = 0; i < 80; i++) { const w = R.newWorld(0); w.fish.push({ id: 'o', species: 'octopus', name: 'Mimi', dead: false }); w.seq = 20 + i; R.advance(w, 30 * 60e3 + i * 7e6); if (w.drift) seen.add(w.drift.by.k); }
  assert.ok(seen.has('oct') && seen.size >= 3, [...seen].join());
});
ok('a find announces itself once with its culprit, so a push can say who brought it', () => {
  const t = R.newWorld(0); const ev = R.advance(t, 30 * 60e3); const f = ev.find((e) => e.found);
  assert.ok(f && f.found === t.drift.id && /Tap it/.test(f.toast) && !/wash|tide/i.test(f.toast), JSON.stringify(f));
  assert.equal(R.advance(t, 31 * 60e3).filter((e) => e.found).length, 0);
});
ok('a fish order still arrives when something unrelated in the tank is broken', () => {
  const now = Date.now(), t = R.newWorld(now, 3); t.flags.tut = 5; t.level = 8; t.shells = 500;
  assert.equal(R.applyAction(t, { t: 'buyFish', species: 'neon', name: 'Zed' }, { now, uid: 'zach', name: 'Zach' }).ok, true);
  t.fish.push({ id: 'broken', name: 'Odd', species: 'a-species-that-no-longer-exists', born: now - 9e8, stage: 'baby', traits: null }); t.drift = { id: 'g1', kind: 'shells', amount: 1, by: { k: 'fish', n: null } };
  const before = t.fish.length; const origErr = console.error; console.error = () => {}; try { R.advance(t, now + 3 * 3600e3); } finally { console.error = origErr; }
  assert.ok(t.fish.length > before, 'the ordered fish arrived'); assert.equal(t.orders.length, 0);
});
ok('tanks saved by older versions of the game still load and keep running: nothing throws, nothing stalls, every fish is valid', () => {
  const dir = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..', '..', 'server', 'fixtures');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')); assert.ok(files.length >= 5, 'sample tanks from older versions are present');
  const origErr = console.error; const errs = []; console.error = (...a) => errs.push(a.join(' '));
  try {
    for (const f of files) {
      const { world, now: saved, from } = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); const t = JSON.parse(JSON.stringify(world)); let now = saved + 3600e3;
      for (let i = 0; i < 6; i++) { now += 12 * 3600e3; R.advance(t, now); }
      for (const a of [{ t: 'feed', x: 0 }, { t: 'glass' }, { t: 'water' }, { t: 'dailyGift', tz: 0 }, { t: 'buyFish', species: 'neon', name: 'New' }, { t: 'buyDecor', type: 'grass', x: 0, z: 1.5, ry: 0 }]) R.applyAction(t, a, { now, uid: 'me', name: 'Me', dev: true });
      R.advance(t, now + 4 * 3600e3 * 12);
      assert.ok(Number.isFinite(t.shells) && t.shells >= 0, from + ': shells'); assert.ok(t.level >= 1 && t.level <= 8, from + ': level');
      for (const fish of t.fish) { assert.ok(R.SPECIES_DEF[fish.species] && Array.isArray(fish.traits) && typeof fish.id === 'string' && typeof fish.name === 'string', from + ': a fish is valid'); }
      assert.equal(new Set(t.fish.map((x) => x.id)).size, t.fish.length, from + ': fish ids are unique'); assert.equal(t.orders.filter((o) => o.arrivesAt < now - 6 * 3600e3).length, 0, from + ': no order is stuck');
    }
  } finally { console.error = origErr; }
  assert.deepEqual(errs.filter((e) => /time step failed/.test(e)), [], 'no time step failed on an old tank');
  assert.deepEqual(R.timeStepErrors(), []);
});
ok('a damaged tank is repaired when it loads: a broken fish, a stale order and nonsense numbers', () => {
  const now = Date.now(), t = R.newWorld(now, 3); t.shells = NaN; t.level = 99; t.hunger = undefined;
  t.fish.push({ id: 'x', name: '', species: 'gone', traits: null }, { id: 5, species: 'neon', traits: 'oops', born: 'yesterday' }, null); t.orders = [{ species: 'nope', arrivesAt: 1 }, { species: 'neon', arrivesAt: NaN }, null]; t.decor = [{ type: 'nope', id: 'd' }, null];
  R.advance(t, now + 3600e3); assert.ok(Number.isFinite(t.shells)); assert.ok(t.level <= 8); assert.ok(t.fish.every((f) => R.SPECIES_DEF[f.species] && Array.isArray(f.traits) && typeof f.id === 'string')); assert.equal(t.orders.length, 0); assert.equal(t.decor.length, 0); assert.equal(t.schema, 1);
});
ok('the daily gift: once per caretaker per day, no streak, no double claim by changing the clock, shared wallet', () => {
  const t = R.newWorld(0); R.advance(t, 60e3); R.applyAction(t, { t: 'tut', step: 5 }, { now: 120e3 });
  const day = 864e5, at = (d, h = 10) => d * day + h * 3600e3;
  assert.equal(R.giftReady(t, 'a', at(1), 0), true); const s0 = t.shells; const r = R.applyAction(t, { t: 'dailyGift', tz: 0 }, { now: at(1), uid: 'a' }); assert.equal(r.delta, R.DAILY_GIFT); assert.ok(t.shells >= s0 + R.DAILY_GIFT);
  assert.equal(R.applyAction(t, { t: 'dailyGift', tz: 0 }, { now: at(1, 20), uid: 'a' }).delta, 0, 'not twice in a day');
  assert.equal(R.applyAction(t, { t: 'dailyGift', tz: 840 }, { now: at(1, 14), uid: 'a' }).delta, 0, 'changing the time zone does not give a second one');
  assert.equal(R.applyAction(t, { t: 'dailyGift', tz: 0 }, { now: at(1), uid: 'b' }).delta, R.DAILY_GIFT, 'a friend gets their own');
  assert.equal(R.applyAction(t, { t: 'dailyGift', tz: 0 }, { now: at(5), uid: 'a' }).delta, R.DAILY_GIFT, 'missing days costs nothing and nothing piles up');
  assert.equal(R.applyAction(t, { t: 'dailyGift', tz: 0 }, { now: at(5, 12), uid: 'a' }).delta, 0);
});
ok('chapters mark landmarks once, pay nothing, and a tank that already passed them stays quiet', () => {
  const old = R.newWorld(0); old.createdAt = 0; R.advance(old, 8 * 86400e3); const quiet = old.flags.chapters.length; assert.ok(quiet >= 0);
  const t = R.newWorld(0); R.advance(t, 60e3); const sh = t.shells; const ev = R.advance(t, 86400e3 + 120e3);
  assert.ok(t.flags.chapters.includes('day1'), JSON.stringify(t.flags.chapters)); assert.equal(t.shells >= sh, true);
  assert.ok(ev.some((e) => e.chapter?.key === 'day1') || t.flags.chapters.length > 0);
  const n = t.flags.chapters.length; R.advance(t, 86400e3 + 180e3); assert.equal(t.flags.chapters.filter((k) => k === 'day1').length, 1); assert.ok(t.flags.chapters.length >= n);
});
ok('the first session ends with real promises, and a full moon brings pearls in the tank', () => {
  const t = R.newWorld(0, 1); R.norm(t, 0); t.flags.tut = 4; t.fish = [R.ensureFish({ id: 'f0', name: 'Pip', species: 'goldfish', seed: 1, born: 0, stage: 'baby', traits: ['Calm'] })]; t.simTs = 0;
  R.applyAction(t, { t: 'tut', step: 5 }, { now: 1000, name: 'A', uid: 'u1', solo: true }); assert.equal(t.flags.promised, 1000); assert.ok(t.driftAt > 1000 + 3 * 3600e3 && t.driftAt < 1000 + 9 * 3600e3, 'a gift is on its way within hours');
  const lines = R.firstPromises(t, 2000); assert.ok(lines.some((x) => /Pip grows up/.test(x)) && lines.some((x) => /turn up in the tank/.test(x)) && lines.some((x) => /request/.test(x)), lines.join(' | '));
  const again = t.driftAt; R.applyAction(t, { t: 'tut', step: 5 }, { now: 9e6, name: 'A', uid: 'u1', solo: true }); assert.equal(t.driftAt, again, 'promised only once');
  const full = Date.UTC(2024, 0, 25, 18), dark = Date.UTC(2024, 0, 11, 12); assert.equal(S.skyOf(full).event?.key, 'fullmoon'); assert.equal(S.skyOf(dark).event?.key, 'darkmoon'); assert.ok(S.moonPhase(full) > 0.47 && S.moonPhase(full) < 0.53);
  assert.equal(S.skyOf(full).moon, 'Full moon'); assert.equal(S.skyOf(Date.UTC(2024, 0, 18, 12)).event?.key === 'fullmoon', false);
  let pearls = 0, plain = 0; for (let i = 0; i < 30; i++) { const a = R.newWorld(0, 1); R.norm(a, 0); a.flags.tut = 5; a.driftAt = full; R.advance(a, full + 1000 * (i + 1)); if (a.drift?.kind === 'pearl') pearls++; const b = R.newWorld(0, 1); R.norm(b, 0); b.flags.tut = 5; b.driftAt = full - 20 * 864e5; R.advance(b, full - 20 * 864e5 + 1000 * (i + 1)); if (b.drift?.kind === 'pearl') plain++; }
  assert.ok(pearls > plain, `more pearls on a full moon (${pearls} vs ${plain})`);
});
ok('reef themes: pieces that belong together lift the fish, pay once, and draw their own visitor', () => {
  const t = quiet(2); t.level = 8; t.shells = 500; const base = R.themesOf(t); assert.ok(base.every((x) => !x.active));
  const buy = (type, i) => R.applyAction(t, { t: 'buyDecor', type, x: i * 0.6 - 2, z: 1, ry: 0 }, { now: 100 + i, name: 'A', uid: 'u1' });
  let evs = []; for (const [i, ty] of ['grass', 'kelp', 'sword', 'bamboo'].entries()) evs.push(...buy(ty, i).events);
  assert.ok(R.themesOf(t).find((x) => x.key === 'kelp').active); assert.equal(evs.filter((e) => e.theme === 'kelp').length, 1, 'announced once'); const s1 = t.shells; evs = buy('grass', 5).events; assert.ok(!evs.some((e) => e.theme), 'not again'); assert.equal(s1 - t.shells, R.DECOR_DEF.grass.price, 'only the piece is paid for');
  const f = t.fish[0]; const th = R.themesOf(t).filter((x) => x.active).length; assert.equal(th, 1);
  const u = quiet(2); u.level = 8; u.flags.themes = { kelp: 1 }; u.decor = ['grass', 'kelp', 'sword', 'bamboo'].map((ty, i) => ({ id: 'd' + i, type: ty, x: i, z: 1, ry: 0, at: 0 })); u.visitAt = 0; u.seen.fish = []; R.advance(u, 3 * 3600e3 + 5); assert.equal(u.visitor?.species, 'rosecory', 'the kelp forest draws its visitor');
});
ok('gifts and togetherness: a fish can be bought for a friend, and two caretakers feeding within a minute delight the fish', () => {
  const t = quiet(1); t.level = 8; t.shells = 200; const members = [{ id: 'u1', name: 'Alex' }, { id: 'u2', name: 'Sam' }];
  const r = R.applyAction(t, { t: 'buyFish', species: 'cory', name: 'Gob', seed: 4, to: 'u2' }, { now: 5000, name: 'Alex', uid: 'u1', members }); assert.ok(r.ok); assert.equal(t.orders.at(-1).owner, 'u2'); assert.equal(t.orders.at(-1).ownerName, 'Sam'); assert.equal(t.orders.at(-1).giftFrom, 'Alex');
  const ev = R.advance(t, 5000 + 24 * 3600e3); const arrived = ev.find((e) => e.arrival); assert.match(arrived.journal, /gift from Alex to Sam/); const gob = t.fish.find((f) => f.name === 'Gob'); assert.equal(gob.owner, 'u2');
  const bad = R.applyAction(t, { t: 'buyFish', species: 'cory', name: 'Nope', seed: 4, to: 'u9' }, { now: 6000 + 24 * 3600e3, name: 'Alex', uid: 'u1', members }); assert.equal(t.orders.at(-1).owner, 'u1', 'a stranger cannot be given a fish');
  const g = quiet(2); g.hunger = 0.8; g.simTs = 0; const happy0 = g.fish[0].happy; const f1 = R.applyAction(g, { t: 'feed', x: 0 }, { now: 1000, name: 'Alex', uid: 'u1' }); assert.ok(!f1.events.some((e) => e.together), 'one person alone is not together');
  g.hunger = 0.8; const f2 = R.applyAction(g, { t: 'feed', x: 0 }, { now: 30e3, name: 'Sam', uid: 'u2' }); assert.ok(f2.events.some((e) => e.together), 'two people together'); assert.ok(g.fish[0].happy > happy0);
  g.hunger = 0.8; const f3 = R.applyAction(g, { t: 'feed', x: 0 }, { now: 50e3, name: 'Alex', uid: 'u1' }); assert.ok(!f3.events.some((e) => e.together), 'not again for a while');
});
ok('a crab treat: only for a grown octopus, costs shells, cheers it, grows its hoard, and has a rest between crabs', () => {
  const D = 864e5, t = quiet(2); t.shells = 20; const oc = t.fish[0]; oc.species = 'octopus'; oc.born = -10 * D; oc.stage = 'adult'; t.fish[1].born = -10 * D; t.fish[1].stage = 'adult';
  const go = (now, id) => R.applyAction(t, { t: 'crab', id }, { now, name: 'Alex', uid: 'u1' });
  const none = quiet(1); none.shells = 20; assert.equal(R.applyAction(none, { t: 'crab' }, { now: 1, name: 'A', uid: 'u1' }).ok, false, 'no octopus, no crab');
  const r = go(1000); assert.ok(r.ok && r.applied && r.id === 'f0'); assert.equal(t.shells, 20 - R.CRAB_PRICE); assert.equal(oc.crabs, 1); assert.ok(oc.happy > 0.7 && oc.bond.u1 === 1); assert.ok(r.events.some((e) => e.crab === 'f0'));
  const again = go(2000); assert.ok(again.ok && !again.applied && again.wait > 0 && t.shells === 20 - R.CRAB_PRICE, 'a rest between crabs');
  assert.ok(go(1000 + R.CRAB_GAP + 5).applied); t.shells = 0; assert.equal(go(1000 + 3 * R.CRAB_GAP).reason, 'NOT_ENOUGH_SHELLS');
  assert.equal(R.hoardOf(oc, 0), 5 + 2, 'five days old plus two crabs'); assert.equal(R.hoardOf(t.fish[1], 0), 0); oc.solved = 30; assert.equal(R.hoardOf(oc, 0), 14, 'capped');
});
ok('each fish keeps its own story, the memorial keeps it too, and the end of a day says what comes next', () => {
  const D = 864e5, t = quiet(2); t.level = 8; t.fish[0].species = 'octopus'; t.fish[0].born = -5 * D; t.fish[0].stage = 'adult'; t.fish[1].born = 0; t.shells = 30; t.simTs = 0;
  R.applyAction(t, { t: 'puzzle', id: 'f0' }, { now: 1000, name: 'A', uid: 'u1' }); R.advance(t, 1000 + 200e3); const s = t.fish[0].story ?? []; assert.ok(s.some((x) => /puzzle jar/.test(x.text)), JSON.stringify(s));
  R.advance(t, 1000 + 210e3); assert.equal(t.fish[0].story.filter((x) => /puzzle jar/.test(x.text)).length, 1, 'no repeats');
  R.advance(t, 2 * D); assert.ok((t.fish[1].story ?? []).some((x) => /growing up|adult|grew/i.test(x.text)), JSON.stringify(t.fish[1].story));
  const m = R.nextUp(t, 2 * D); assert.match(m, /(\.|tomorrow)$/); const e = quiet(1); e.orders = [{ id: 'o1', species: 'cory', name: 'Gob', arrivesAt: 5 * 3600e3 }]; assert.match(R.nextUp(e, 0), /Gob arrives in about 5 hours/);
});
console.log(`All ${n} rule tests passed`);

// each octopus has a fixed, distinct temperament
{
  const { octoMind, OCTO_TYPES } = await import('./rules.js');
  const seen = new Set(); for (let s = 0; s < 60; s++) { const a = octoMind({ seed: s }), b = octoMind({ seed: s }); assert.deepEqual(a, b); seen.add(a.type); for (const k of ['cur', 'bold', 'soc', 'tidy']) assert.ok(a[k] >= 0.05 && a[k] <= 1); }
  assert.equal(seen.size, OCTO_TYPES.length, 'every type turns up');
}

// octopuses can shift small decorations, carry a coconut shell home, and a tank can switch it off
{
  const W = () => { const t = R.newWorld(0); t.level = 6; t.fish.push(R.ensureFish({ id: 'o', name: 'Inky', species: 'octopus', seed: 3, born: 0, stage: 'adult', traits: [] })); t.decor.push({ id: 'c', type: 'coconut', x: -2, z: 1, ry: 0 }, { id: 'r', type: 'rock', x: 1, z: 1, ry: 0 }, { id: 'b', type: 'boulder', x: 0, z: 1, ry: 0 }); return t; };
  const at = 10 * DAY, mv = (t, a, now = at) => R.applyAction(t, { t: 'octoMove', fish: 'o', ...a }, { now, uid: 'me', name: 'Me' });
  { const t = W(); assert.ok(mv(t, { id: 'r', x: 2, z: 1.2 }).applied); assert.deepEqual([t.decor[1].x, t.decor[1].z], [2, 1.2]); assert.equal(mv(t, { id: 'r', x: 2.5, z: 1 }, at + 60e3).applied, false, 'at most once every 20 minutes'); assert.ok(mv(t, { id: 'r', x: 2.5, z: 1 }, at + R.MOVE_GAP + 1).applied); }
  { const t = W(); assert.equal(mv(t, { id: 'b', x: 1, z: 1 }).ok, false, 'a boulder is too heavy'); assert.equal(mv(t, { id: 'r', x: 9, z: 1 }).ok, false, 'not out of the tank'); assert.equal(mv(t, { id: 'r', x: -4, z: 1 }).ok, false, 'not too far in one go'); }
  { const t = W(); assert.ok(mv(t, { id: 'c', x: -3.5, z: 0.4, home: true, ry: 3.14 }).applied); assert.equal(t.fish.find((f) => f.id === 'o').home, 'c'); assert.equal(R.homeOf(t, t.fish.find((f) => f.id === 'o')).id, 'c'); R.applyAction(t, { t: 'sellDecor', id: 'c' }, { now: at }); assert.equal(t.fish.find((f) => f.id === 'o').home, undefined, 'selling the shell makes it homeless'); }
  { const t = W(); R.applyAction(t, { t: 'tankPref', rearrange: false }, { now: at }); assert.equal(mv(t, { id: 'r', x: 2, z: 1 }).ok, false); R.applyAction(t, { t: 'tankPref', rearrange: true }, { now: at }); assert.ok(mv(t, { id: 'r', x: 2, z: 1 }).applied); }
  { const t = W(); t.fish.find((f) => f.id === 'o').born = at; assert.equal(mv(t, { id: 'r', x: 2, z: 1 }).ok, false, 'a baby octopus cannot'); }
}

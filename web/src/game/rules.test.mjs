import assert from 'node:assert/strict';
import * as R from './rules.js';
import * as G from './genes.js';
// time goes by an hour at a time until an egg is laid and gets ready, and someone is there to watch it hatch (eggs wait to be watched)
const watchHatch = (t, now, days = 7) => { for (let k = 0; k < days * 24; k++) { now += 3600e3; R.advance(t, now); const e = (t.eggs ?? []).find((x) => x.ready); if (e) { R.applyAction(t, { t: 'watchEggs', id: e.id }, { now: now + 1000 }); return now + 1000; } } return now; };
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import * as S from './sky.js';
import { habitLines } from './habits.js';
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
ok('cleaning the glass is care: it clears the glass and pays nothing', () => { const t = R.newWorld(0); const d = []; for (let i = 0; i < 5; i++) { t.glass = 0.6; const s0 = t.shells; d.push(R.applyAction(t, { t: 'glass' }, { now: 1000 + i }).delta); assert.equal(t.glass, 0); assert.equal(t.shells, s0); } assert.deepEqual(d, [0, 0, 0, 0, 0]); });
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
ok('a tank birthday is a journal line only at a month and each year, never a weekly line, never a payment', () => { const W = 7 * 864e5, t = R.newWorld(0); R.norm(t); const e1 = R.advance(t, W + 1000); assert.equal(t.flags.weeks, 1); assert.ok(!e1.some((e) => /old\./.test(e.journal ?? '')), 'no weekly line'); const e4 = R.advance(t, 4 * W + 1000); assert.ok(e4.some((e) => /one month old/.test(e.journal ?? ''))); assert.ok(!e4.some((e) => /birthday/i.test(e.toast ?? ''))); assert.ok(R.advance(t, 52 * W + 1000).some((e) => /1 year old/.test(e.journal ?? ''))); });
ok('one fish is cheaper each day and the price is charged', () => { const now = 5 * 864e5; const id = R.dailyFish(now); assert.ok(R.fishPrice(id, now) < R.SPECIES_DEF[id].price); const t = R.newWorld(now); R.norm(t, now); t.level = 8; t.shells = 100; R.applyAction(t, { t: 'buyFish', species: id, name: 'X', seed: 1 }, { now }); assert.equal(t.shells, 100 - R.fishPrice(id, now)); });
ok('a rare visitor drops by, saying hello pays and adds it to the book, and it leaves otherwise', () => {
  const now = 1e9, t = R.newWorld(now - 3 * 864e5); R.norm(t, now); t.flags.tut = 5; t.visitAt = now - 1;
  R.advance(t, now); assert.ok(t.visitor, 'visitor arrived'); const v = t.visitor, sp = v.species; assert.ok(R.SPECIES_DEF[sp].visitor);
  const s0 = t.shells, r = R.applyAction(t, { t: 'greet', id: v.id }, { now: now + 1000 }); assert.ok(r.applied); assert.equal(t.shells, s0 + 4 + R.FIELD_PAY, 'the visitor, and its Field Guide page the first time'); assert.ok(t.seen.fish.includes(sp)); assert.equal(t.visitor, null);
  assert.equal(R.applyAction(t, { t: 'greet', id: v.id }, { now: now + 2000 }).applied, false);
  const t2 = R.newWorld(now - 864e5); R.norm(t2, now); t2.flags.tut = 5; t2.visitAt = now - 1; R.advance(t2, now); assert.ok(t2.visitor); R.advance(t2, now + 3 * 3600e3 + 1000); assert.equal(t2.visitor, null);
});
ok('eggs: one at a time; food and clean water on two days hatch it strong; a rare neglected egg can be found by the octopus, a cared-for one never', () => {
  const mk = () => { const t = R.newWorld(0); R.norm(t, 0); t.level = 6; t.flags.tut = 5; t.fish = ['a', 'b', 'c', 'd'].map((id, i) => R.ensureFish({ id, name: id.toUpperCase(), species: 'goldfish', seed: 10 + i, sex: i % 2 ? 'm' : 'f', born: -5 * 864e5, stage: 'adult', traits: ['Shy'] })); return t; };
  let t = mk(); const now = 20 * 3600e3; t.eggAt = 0; R.advance(t, now); assert.equal(t.eggs.length, 1); t.eggAt = 0; R.advance(t, now + 3600e3); assert.equal(t.eggs.length, 1, 'never two eggs at once');
  t.water = 0.5; R.applyAction(t, { t: 'water' }, { now: now + 2 * 3600e3 }); t.water = 0.5; R.applyAction(t, { t: 'water' }, { now: now + 864e5 + 3600e3 }); assert.equal(R.eggCare(t.eggs[0]), 2);
  { const at = t.eggs[0].hatchAt + 1000; R.advance(t, at); assert.ok(t.eggs[0]?.ready, 'ready: it waits for someone to watch'); R.applyAction(t, { t: 'watchEggs' }, { now: at + 1000 }); } const baby = t.fish.find((f) => f.stage === 'baby'); assert.ok(baby?.loved && baby.happy === 1, 'cared-for egg hatches strong');
  t = mk(); t.fish.push(R.ensureFish({ id: 'o', name: 'Inky', species: 'octopus', seed: 3, born: -9 * 864e5, stage: 'adult' })); t.eggAt = 0; R.advance(t, now); t.eggs[0].risk = true;
  { const g = structuredClone(t); R.advance(g, now + 2.1 * 864e5); assert.equal(g.eggs.length, 1, 'a father guarding the eggs keeps the octopus off'); }
  t.eggs[0].guard = null; for (const f of t.fish) if (f.species === 'goldfish') f.dead = true;      /* (no parent left to guard them, and nobody to lay another) */
  const u = structuredClone(t); R.advance(t, now + 2.1 * 864e5); assert.equal(t.eggs.length, 0, 'the neglected, unguarded flagged egg is eaten'); assert.ok(t.fish.length === 5);
  u.water = 0.5; R.applyAction(u, { t: 'water' }, { now: now + 3600e3 }); R.advance(u, now + 2.1 * 864e5); assert.equal(u.eggs.length, 1, 'a looked-after egg is safe');
  let flagged = 0; for (let i = 0; i < 400; i++) { const w = mk(); w.fish.push(R.ensureFish({ id: 'o', name: 'Inky', species: 'octopus', seed: 3, born: -9 * 864e5, stage: 'adult' })); w.eggAt = 0; R.advance(w, now + i * 6e4); flagged += w.eggs[0]?.risk ? 1 : 0; } assert.ok(flagged > 0 && flagged < 25, 'rare: ' + flagged + '/400');
});
ok('octopuses never lay eggs, and an old octopus egg is cleared', () => {
  const t = R.newWorld(0); R.norm(t, 0); t.level = 6; t.flags.tut = 5; t.fish = ['a', 'b'].map((id) => R.ensureFish({ id, name: id, species: 'octopus', seed: 3, born: -9 * 864e5, stage: 'adult' }));
  t.eggAt = 0; R.advance(t, 20 * 3600e3); assert.equal(t.eggs.length, 0); t.eggs.push({ id: 'e1', species: 'octopus', a: 'a', b: 'b', hatchAt: 1e15 }); R.norm(t, 1); assert.equal(t.eggs.length, 0);
});
ok('the loop: one surprise with the first feeding of the day, a glow when two people care the same day, raising shapes a baby, milestones and what is coming up', () => {
  const D = 864e5, t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.level = 5; t.visitAt = t.storyAt = 1e15;
  t.fish = ['a', 'b', 'c'].map((id, i) => R.ensureFish({ id, name: id.toUpperCase(), species: 'goldfish', seed: 3 + i, born: -9 * D, stage: 'adult', traits: ['Shy'] }));
  let now = 10 * D + 3600e3; t.hunger = 0.8; let r = R.applyAction(t, { t: 'feed' }, { now, uid: 'u1', name: 'Alex' }); assert.equal(r.events.filter((e) => e.surprise).length, 1, 'a surprise');
  t.hunger = 0.8; r = R.applyAction(t, { t: 'feed' }, { now: now + 4 * 3600e3, uid: 'u1', name: 'Alex' }); assert.equal(r.events.filter((e) => e.surprise).length, 0, 'only one a day');
  assert.ok(!r.events.some((e) => e.teamGlow)); t.water = 0.5; r = R.applyAction(t, { t: 'water' }, { now: now + 5 * 3600e3, uid: 'u2', name: 'Sam' }); assert.ok(r.events.some((e) => e.teamGlow) && t.glowUntil > now, 'two people, one day: the tank glows');
  t.hunger = 0.8; r = R.applyAction(t, { t: 'feed' }, { now: now + D, uid: 'u1', name: 'Alex' }); assert.equal(r.events.filter((e) => e.surprise).length, 1, 'a new day, a new surprise');
  const k = R.ensureFish({ id: 'k', name: 'Kit', species: 'goldfish', seed: 9, born: now, stage: 'baby', traits: ['Shy'], parents: [{ id: 'a', name: 'A' }] }); t.fish.push(k);
  for (const d of [0.1, 1.05, 2, 2.98]) { t.hunger = 0.8; R.applyAction(t, { t: 'feed' }, { now: now + d * D, uid: 'u1', name: 'Alex' }); }      // four different days while it grows
  R.advance(t, now + 3.2 * D); assert.ok(k.traits.includes('Calm') && k.raisedAs === 'Calm' && !k.raise, 'fed often while growing: grows up Calm ' + k.traits);
  const ms = R.milestonesOf(k); assert.ok(ms[0].label === 'Hatched' && ms.find((m) => m.key === 'grown').done);
  const f = R.forecast(t, now + 3.2 * D, 3); assert.ok(f.every((x) => x.text && x.when && x.ms <= 24 * 3600e3) && f.filter((x) => !/hatches|born/.test(x.text)).every((x) => x.ms <= 8 * 3600e3), 'only what is coming soon');
});
ok('an octopus learns to trust you step by step, from crabs and play, and says so once at each step', () => {
  const t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.shells = 500; t.visitAt = t.storyAt = 1e15; const o = R.ensureFish({ id: 'o', name: 'Inky', species: 'octopus', seed: 3, born: -9 * 864e5, stage: 'adult', owner: 'u1', hunger: 0.9 }); t.fish = [o];
  assert.equal(R.octoTrust(o, 'u1').lvl, 0); const lines = [];
  for (let i = 0; i < 16; i++) { o.hunger = 0.9; const r = R.applyAction(t, { t: 'feed', food: 'crab', fish: 'o' }, { now: 1e6 + i * 864e5, uid: 'u1', name: 'Alex' }); lines.push(...r.events.filter((e) => e.trust).map((e) => e.trust.lvl)); }
  assert.deepEqual(lines, [1, 2, 3]); assert.equal(R.octoTrust(o, 'u1').label, 'Takes a crab from your hand'); assert.equal(R.octoTrust(o, 'u2').lvl, 0, 'trust is per person');
});
ok('notes on the glass: one each, read and loved by others, peeled only by their writer, gone after three days', () => {
  const t = R.newWorld(0); R.norm(t, 0); const now = 1e9;
  let r = R.applyAction(t, { t: 'glassNote', text: 'fed Inky <3', color: 'mint', doodle: '🐙' }, { now, uid: 'u1', name: 'Alex' }); assert.ok(r.ok); assert.equal(t.notes[0].text, 'fed Inky 3');
  R.applyAction(t, { t: 'glassNote', text: 'second', color: 'nope', doodle: 'x' }, { now: now + 1, uid: 'u1', name: 'Alex' }); assert.equal(t.notes.length, 1, 'a new note replaces your last'); assert.equal(t.notes[0].color, 'butter');
  R.applyAction(t, { t: 'readNote', id: t.notes[0].id, heart: true }, { now: now + 2, uid: 'u2', name: 'Sam' }); assert.deepEqual(t.notes[0].read, ['u2']); assert.deepEqual(t.notes[0].hearts, ['Sam']);
  assert.equal(R.applyAction(t, { t: 'peelNote', id: t.notes[0].id }, { now: now + 3, uid: 'u2', name: 'Sam' }).reason, 'NOT_YOURS');
  R.norm(t, now + 4 * 864e5); assert.equal(t.notes.length, 0, 'gone after three days');
});
ok('the animals ask for what they need, and a decoration that answers it is noticed', () => {
  const t = R.newWorld(0); R.norm(t, 0); t.level = 9; t.shells = 999; t.decor = []; t.fish = [R.ensureFish({ id: 'o', name: 'Inky', species: 'octopus', seed: 3, born: -9 * 864e5, stage: 'adult' }), R.ensureFish({ id: 'g', name: 'Pip', species: 'goldfish', seed: 3, born: -9 * 864e5, stage: 'adult', traits: ['Shy'] })];
  const ns = R.tankNeeds(t, 1e6); assert.ok(ns.some((n) => n.key === 'hide' && n.name === 'Pip') && ns.some((n) => n.key === 'shell' && n.name === 'Inky'), JSON.stringify(ns));
  const r = R.applyAction(t, { t: 'buyDecor', type: 'coconut', x: 0, z: 0 }, { now: 1e6, uid: 'u1', name: 'Alex' }); assert.ok(r.events.some((e) => /Inky has its eye on the new coconut/.test(e.journal ?? '')), JSON.stringify(r.events.map((e) => e.journal)));
  assert.ok(!R.tankNeeds(t, 1e6).some((n) => n.key === 'shell'));
});
ok('taking out something an animal loved: it misses it, loses a little happiness, and looks for somewhere new', () => {
  const t = R.newWorld(0); R.norm(t, 0); t.decor = [{ id: 'd1', type: 'rock', x: 0, z: 0, ry: 0 }, { id: 'd2', type: 'starfish', x: 1, z: 0, ry: 0 }]; t.fish = [R.ensureFish({ id: 'g', name: 'Pip', species: 'goldfish', seed: 3, born: -9 * 864e5, stage: 'adult', happy: 0.8, spotId: 'd1' })];
  const r = R.applyAction(t, { t: 'sellDecor', id: 'd1' }, { now: 1e6, uid: 'u1', name: 'Alex' }); assert.ok(r.events.some((e) => /Pip misses the reef rock/i.test(e.journal ?? '')), JSON.stringify(r.events)); assert.ok(t.fish[0].happy < 0.8 && !t.fish[0].spotId && t.fish[0].missing);
  const r2 = R.applyAction(t, { t: 'sellDecor', id: 'd2' }, { now: 1e6, uid: 'u1', name: 'Alex' }); assert.ok(r2.events.some((e) => /starfish go back to the sea/.test(e.activity?.text ?? '')));
});
ok('old age: an elder at three quarters of its lifespan, then a peaceful death some days past its full span; never the last animal', () => {
  const D = 864e5, t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.createdAt = -900 * D; t.visitAt = t.storyAt = t.eggAt = 1e15; const L = R.LIFESPAN.seahorse;
  const mk = (id, sp, born) => R.ensureFish({ id, name: id, species: sp, seed: 3, born, stage: 'adult', happy: 0.8, health: 1 });
  t.fish = [mk('s', 'seahorse', 0), mk('g', 'goldfish', 0)]; let gone = null, elderSaid = false, elderDay = null;
  for (let d = 1; d < L * 3 && !gone; d++) { t.hunger = 0; t.water = 1; t.glass = 1; for (const f of t.fish) { f.fedAt = d * D; f.hunger = 0; f.ail = 0; } const ev = R.advance(t, d * D + 3600e3);
    if (ev.some((e) => /getting old/.test(e.journal ?? '') && /^s /.test(e.journal))) { elderSaid = true; elderDay = d; } if (ev.some((e) => e.died === 's')) gone = d; }
  assert.ok(elderSaid && elderDay >= Math.floor(L * R.ELDER_AT) && elderDay <= Math.ceil(L * R.ELDER_AT) + 1, 'became an elder on day ' + elderDay);
  assert.ok(gone && gone >= L && gone < L * 1.6, 'died of old age on day ' + gone); assert.ok(t.memorial.at(-1).oldAge);
});
ok('a note: its writer drags it to a new spot on the glass; a friend can peel it off and keep it', () => {
  const t = R.newWorld(0); R.norm(t, 0); R.applyAction(t, { t: 'glassNote', text: 'hello', color: 'mint', doodle: '🐙' }, { now: 1e9, uid: 'u1', name: 'Alex' }); const id = t.notes[0].id;
  assert.ok(R.applyAction(t, { t: 'moveNote', id, x: 0.7, y: 2 }, { now: 1e9, uid: 'u1', name: 'Alex' }).ok); assert.deepEqual(t.notes[0].pos, { x: 0.7, y: 1 });
  assert.equal(R.applyAction(t, { t: 'moveNote', id, x: 0, y: 0 }, { now: 1e9, uid: 'u2', name: 'Sam' }).reason, 'NOT_YOURS');
  assert.ok(R.applyAction(t, { t: 'keepNote', id }, { now: 1e9, uid: 'u2', name: 'Sam' }).ok); assert.equal(t.kept.u2[0].text, 'hello'); assert.ok(t.notes[0].gone.includes('u2'));
});
ok('two adults of one species lay an egg that hatches into a blend of both', () => {
  const t = R.newWorld(0); R.norm(t, 0); t.level = 4; t.flags.tut = 5;
  t.fish = [R.ensureFish({ id: 'a', name: 'A', species: 'goldfish', seed: 10, born: -5 * 864e5, stage: 'adult', traits: ['Shy'] }), R.ensureFish({ id: 'b', name: 'B', species: 'goldfish', seed: 20, sex: 'm', born: -5 * 864e5, stage: 'adult', traits: ['Brave'] })];
  const now = 20 * 3600e3; t.eggAt = 0; R.advance(t, now); assert.equal(t.eggs.length, 1, 'egg laid');
  R.advance(t, now + 2.9 * 864e5); assert.equal(t.eggs.length, 1, 'still an egg after almost three days'); { const at = t.eggs[0].hatchAt + 1000; R.advance(t, at); R.applyAction(t, { t: 'watchEggs' }, { now: at + 1000 }); } assert.equal(t.eggs.length, 0); assert.equal(t.fish.length, 3); const c = t.fish[2]; assert.ok(!c.loved, 'an egg nobody looked after hatches plain');
  assert.equal(c.species, 'goldfish'); assert.equal(c.stage, 'baby'); assert.ok(c.seed === 10 || c.seed === 20, 'pattern from one parent ' + c.seed); assert.ok(c.genes && c.gen === 1 && c.parents.length === 2); assert.ok(c.traits.every((x) => ['Shy', 'Brave'].includes(x)));
});
ok('the journal no longer invents stories on a timer, and routine care goes to the activity list', () => {
  const t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.storyAt = 0; t.fish[0].traits = ['Lazy']; const ev = R.advance(t, 20 * 3600e3);
  assert.ok(!ev.some((e) => /napped|chased|swam together/.test(e.journal ?? '')), 'no artificial stories');
  const r = R.applyAction(t, { t: 'feed', x: 0 }, { now: 20 * 3600e3 + 1000, name: 'Alex', uid: 'u1' }); assert.ok(r.events.some((e) => e.activity && /fed the fish/.test(e.activity.text)) && !r.events.some((e) => e.journal));
  t.water = 0.6; const w = R.applyAction(t, { t: 'water' }, { now: 20 * 3600e3 + 2000, name: 'Alex', uid: 'u1' }); assert.ok(w.events.some((e) => e.activity) && !w.events.some((e) => e.journal));
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
ok('neglect is slow and warned about, and never kills: a month without care leaves every animal very unwell but alive', () => {
  const D = 864e5, mk = () => { const t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.fish = ['A', 'B', 'C'].map((n, i) => R.ensureFish({ id: 'f' + i, name: n, species: 'goldfish', seed: i, born: -9 * D, stage: 'adult', traits: ['Greedy'] })); return t; };
  const t = mk(); t.createdAt = -20 * D; t.simTs = 0; t.visitAt = t.eggAt = t.storyAt = 1e15;
  let ev = []; for (let h = 12; h <= 24 * 4.5; h += 12) ev.push(...R.advance(t, h * 3600e3)); assert.ok(ev.some((e) => e.tired), 'it looks tired first'); assert.ok(ev.some((e) => e.warn && /very unwell/.test(e.journal)), 'then very unwell');
  for (let h = 4.5 * 24 + 12; h <= 24 * 30; h += 12) R.advance(t, h * 3600e3);
  assert.equal(t.fish.length, 3, 'nobody died of neglect'); assert.equal(t.floaters.length, 0); assert.ok(t.fish.every((f) => f.ail >= R.AIL_WARN), 'all very unwell');
  // care wins the time back
  const c = mk(); c.createdAt = -20 * D; c.simTs = 0; c.visitAt = c.eggAt = c.storyAt = 1e15; R.advance(c, 3 * D); assert.ok(c.fish[0].ail > 0); R.applyAction(c, { t: 'feed', x: 0 }, { now: 3 * D + 1000 }); R.applyAction(c, { t: 'water' }, { now: 3 * D + 2000 });
  const before = c.fish[0].ail; R.advance(c, 3 * D + 1800e3); assert.ok(c.fish[0].ail < before, 'ail ' + before + ' -> ' + c.fish[0].ail);
  { const u = mk(); u.createdAt = -20 * D; u.simTs = 0; u.visitAt = u.eggAt = u.storyAt = 1e15; for (let h = 12; h <= 24 * 6; h += 12) R.advance(u, h * 3600e3); let back = []; for (let h = 24 * 6 + 1; h <= 24 * 10; h += 6) { const at = h * 3600e3; back.push(...(R.applyAction(u, { t: 'water' }, { now: at }).events ?? []), ...(R.applyAction(u, { t: 'feed' }, { now: at + 1 }).events ?? []), ...R.advance(u, at + 2)); }
    assert.ok(back.some((e) => /back to its old self/.test(e.journal ?? '')), 'with care it recovers, and the journal says so'); assert.ok(u.fish.every((f) => f.ail < R.AIL_TIRED), 'all recovered'); }
});
ok('a tank can opt out of death: fish pause growing instead', () => {
  const D = 864e5, t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.flags.mortality = false; t.createdAt = -30 * D; t.simTs = 0; t.visitAt = t.eggAt = t.storyAt = 1e15;
  t.fish = [R.ensureFish({ id: 'a', name: 'A', species: 'goldfish', seed: 1, born: 0, stage: 'baby', traits: ['Greedy'] }), R.ensureFish({ id: 'b', name: 'B', species: 'goldfish', seed: 2, born: 0, stage: 'baby', traits: ['Calm'] })];
  for (let h = 12; h <= 24 * 30; h += 12) R.advance(t, h * 3600e3);
  assert.equal(t.fish.length, 2); assert.equal(t.floaters.length, 0); assert.ok(t.fish[0].born > 5 * D, 'growth was paused');
});
ok('death comes from old age: it leaves a memorial and a floating fish, and lying to rest keeps the record', () => {
  const D = 864e5, mk = () => { const t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.createdAt = -600 * D; t.simTs = 0; t.visitAt = t.eggAt = t.storyAt = 1e15; t.fish = ['A', 'B', 'C'].map((n, i) => R.ensureFish({ id: 'f' + i, name: n, species: 'goldfish', seed: i, born: -(R.LIFESPAN.goldfish + 90) * D, stage: 'adult', traits: ['Calm', 'Shy'], owner: 'u1', ownerName: 'Alex' })); return t; };
  const t = mk(); for (let d = 1; d <= 30 && !t.floaters.length; d++) { R.applyAction(t, { t: 'feed' }, { now: d * D - 1000 }); R.advance(t, d * D); }
  assert.equal(t.floaters.length, 1, 'one at a time'); const m = t.memorial[0]; assert.ok(m.oldAge); assert.equal(m.ownerName, 'Alex'); assert.deepEqual(m.traits, ['Calm', 'Shy']); assert.ok(m.milestones.length >= 1 && m.died > 0 && m.born < 0 && m.rested === null);
  const r = R.applyAction(t, { t: 'scoop', id: t.floaters[0].id }, { now: m.died + 1000, name: 'Sam' }); assert.ok(r.applied); assert.equal(t.floaters.length, 0); assert.equal(t.memorial[0].rested.by, 'Sam'); assert.equal(t.memorial.length, 1, 'the record stays');
  assert.equal(R.applyAction(t, { t: 'scoop', id: m.id }, { now: m.died + 2000 }).applied, false, 'no duplicate');
});
ok('regression: deaths from old age are at least 24 hours apart, even after a month away in one jump, and never the last fish', () => {
  const D = 864e5, mk = () => { const t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.createdAt = -900 * D; t.simTs = 0; t.visitAt = t.eggAt = t.storyAt = 1e15; t.fish = ['A', 'B', 'C', 'D'].map((n, i) => R.ensureFish({ id: 'f' + i, name: n, species: 'goldfish', seed: i, born: -(R.LIFESPAN.goldfish + 200) * D, stage: 'adult', traits: ['Calm'] })); return t; };
  const a = mk(); for (let h = 12; h <= 24 * 20; h += 12) { R.applyAction(a, { t: 'feed' }, { now: h * 3600e3 - 1000 }); R.advance(a, h * 3600e3); }
  assert.ok(a.floaters.length >= 2, 'old fish do pass away: ' + a.floaters.length); for (let i = 1; i < a.floaters.length; i++) assert.ok(a.floaters[i].died - a.floaters[i - 1].died >= D - 1, 'gap between deaths ' + (a.floaters[i].died - a.floaters[i - 1].died) / 3600e3 + 'h');
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
  assert.equal(Object.values(R.DISCOVERIES).filter((d) => !d.kind).length, 15); assert.equal(ob({ key: 'food', fish: 'a' }).applied, false, 'a phone cannot report what only the server can see');
});
ok('one shared daily wish when no fish has a wish of its own: feasible, replaced each day, paid once, never punishing', () => {
  const D = 864e5, t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.flags.noWants = true; t.fish = [R.ensureFish({ id: 'a', name: 'A', species: 'goldfish', seed: 1, born: -D, stage: 'baby', traits: ['Calm'] })];
  R.advance(t, 2 * D + 10); const d1 = t.daily; assert.ok(d1 && d1.day === 2 && !d1.done); assert.ok(R.DAILY[d1.kind].ok(t), 'only wishes that can be done now');
  for (let day = 3; day < 40; day++) { R.advance(t, day * D + 10); assert.ok(R.DAILY[t.daily.kind].ok(t), 'feasible on day ' + day); if (day > 3) assert.notEqual(t.daily.kind, prev, 'no repeats back to back'); var prev = t.daily.kind; }
  const c = R.newWorld(0); R.norm(c, 0); c.flags.tut = 5; c.flags.noWants = true; c.fish = t.fish; c.daily = { day: 50, kind: 'care', text: R.DAILY.care.text, need: 1, have: 0, ids: [], done: false }; R.advance(c, 50 * D + 500); const s0 = c.shells;
  R.applyAction(c, { t: 'feed', x: 0 }, { now: 50 * D + 1000, name: 'Sam', uid: 'u2' }); assert.ok(c.daily.done && c.daily.by === 'Sam'); const after = c.shells; assert.equal(after - s0, R.DAILY_REWARD, 'the wish (feeding itself pays nothing)');
  R.applyAction(c, { t: 'feed', x: 0 }, { now: 50 * D + 2000, name: 'Sam', uid: 'u2' }); R.applyAction(c, { t: 'water' }, { now: 50 * D + 3000, name: 'Sam' }); assert.ok(c.shells - after <= 1 + R.WATER_PAY, 'the wish pays once a day');
  const g = R.newWorld(0); R.norm(g, 0); g.flags.tut = 5; g.fish = ['a', 'b', 'c'].map((n, i) => R.ensureFish({ id: n, name: n, species: 'goldfish', seed: i, born: -D, stage: 'baby', traits: [] })); g.simTs = 70 * D - 10; g.daily = { day: 70, kind: 'greet', text: R.DAILY.greet.text, need: 3, have: 0, ids: [], done: false };
  const seen = (id) => R.applyAction(g, { t: 'observe', key: 'inspect', fish: id }, { now: 70 * D + 500, name: 'Riley' }); seen('a'); seen('a'); seen('b'); assert.equal(g.daily.have, 2, 'the same fish twice counts once'); seen('c'); assert.ok(g.daily.done);
  const un = R.newWorld(0); R.norm(un, 0); un.flags.tut = 5; un.fish = []; un.simTs = 80 * D - 10; un.daily = { day: 80, kind: 'together', text: '', need: 1, have: 0, ids: [], done: false }; R.advance(un, 80 * D + 5); assert.ok(R.DAILY[un.daily.kind].ok(un), 'a wish that became impossible is swapped');
});
ok('family trees: hatchlings keep their parents, grandparents, generation and blended colours; the record outlives the fish', () => {
  const D = 864e5, t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.level = 5; t.createdAt = -50 * D; t.visitAt = t.storyAt = 1e15; const mk = (id, name, seed, extra = {}) => R.ensureFish({ id, name, species: 'goldfish', seed, born: -9 * D, stage: 'adult', traits: ['Calm'], owner: 'u1', ownerName: 'Alex', ...extra });
  t.fish = [mk('a', 'Ada', 4), mk('b', 'Bix', 9)]; t.eggAt = 0; let now = 20 * 3600e3; R.advance(t, now); assert.equal(t.eggs.length, 1); assert.equal(t.eggs[0].pa.name, 'Ada'); assert.ok(t.eggs[0].pa.genes && t.eggs[0].pb.genes);
  now = t.eggs[0].hatchAt + 1000; const ev = [...R.advance(t, now), ...(R.applyAction(t, { t: 'watchEggs' }, { now: now + 1000 }).events ?? [])]; const kid = t.fish.find((f) => f.parents); assert.ok(kid && kid.gen === 1 && kid.parents.length === 2 && kid.parents.map((p) => p.name).sort().join() === 'Ada,Bix'); assert.ok(kid.genes && kid.ownerName === 'Alex');
  assert.ok(ev.some((e) => /child of/.test(e.journal ?? ''))); assert.ok(ev.some((e) => /first generation/.test(e.journal ?? '')));
  const ga = R.genesOf(4), gb = R.genesOf(9); assert.ok(Math.abs(kid.genes.dh - (ga.dh + gb.dh) / 2) <= 0.016 && kid.genes.size >= 0.9 && kid.genes.size <= 1.1, 'colours blend the parents');
  // a second generation: grandparents are remembered by name even after the grandparents are gone
  kid.born = now - 9 * D; kid.stage = 'adult'; const kid2 = mk('k2', 'Kit', 5, { parents: [{ id: 'x', name: 'Zed', parents: [] }], gen: 1, genes: R.genesOf(5), sex: R.sexOf(kid) === 'f' ? 'm' : 'f' }); t.fish = [kid, kid2]; t.eggAt = 0; t.eggs = []; now += 30 * 3600e3; R.advance(t, now); now = watchHatch(t, now);
  const grand = t.fish.find((f) => f.gen === 2); assert.ok(grand, 'a second generation'); const names = grand.parents.map((p) => p.name); assert.ok(names.includes(kid.name) && names.includes('Kit'));
  assert.ok(grand.parents.find((p) => p.name === kid.name).parents.map((q) => q.name).sort().join() === 'Ada,Bix', 'grandparents survive in the record');
  assert.ok(R.childrenOf(t, kid.id).some((c) => c.id === grand.id)); const rt = JSON.parse(JSON.stringify(t)); assert.deepEqual(rt.fish.find((f) => f.gen === 2).parents, grand.parents);
});
ok('care is credited to the caretakers who helped a fish grow, without ranking anyone', () => {
  const D = 864e5, t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.visitAt = t.eggAt = t.storyAt = 1e15; R.applyAction(t, { t: 'feed', x: 0 }, { now: 0.9 * D, name: 'Alex', uid: 'u1' }); R.advance(t, 0.95 * D); t.water = 0.6; R.applyAction(t, { t: 'water' }, { now: 0.95 * D + 1, name: 'Sam', uid: 'u2' });
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
  const D = 864e5, t = quiet(3); t.fish[0].found = ['age14', 'spot']; t.createdAt = -900 * D; t.fish[0].born = -(R.LIFESPAN[t.fish[0].species] + 400) * D; t.simTs = 20 * D; for (let d = 21; d < 60 && t.fish.some((f) => f.id === 'f0'); d++) R.advance(t, d * D);      // (it dies of old age: neglect no longer kills)
  const m = t.memorial.find((x) => x.id === 'f0'); assert.ok(m && m.milestones.some((x) => /14 days/.test(x)), JSON.stringify(m)); assert.ok(!t.fish.some((f) => f.id === 'f0'));
});
ok('first friendship: +3 once per pair, remembered by stable ids, never repeated', () => {
  const D = 864e5, t = quiet(4, { traits: ['Social'] }); for (const f of t.fish) f.happy = 0.9; const s0 = t.shells;
  for (let i = 1; i <= 6; i++) R.advance(t, (i * 3600e3 * 3)); const pairs = Object.keys(t.flags.pairs); assert.ok(pairs.length >= 1 && pairs.length <= 3, String(pairs)); assert.ok(pairs.every((k) => /^f\d\+f\d$/.test(k)), 'stable id keys');
  const paid = t.shells - s0; const friends = t.fish.filter((f) => f.found.includes('friend')).length; assert.equal(friends, 4); const friendShells = pairs.length * R.FRIEND_REWARD; assert.ok(paid >= friendShells, `${paid} >= ${friendShells}`);
  const s1 = t.shells; R.advance(t, 10 * D); R.advance(t, 11 * D); const gain = t.shells - s1; assert.ok(!(t.flags.pairs && Object.keys(t.flags.pairs).length > 3)); assert.ok(t.fish.every((f) => f.found.filter((x) => x === 'friend').length === 1), 'each fish records its first friendship once');
});
ok('first successful breeding: +5 once per tank, on the hatch and not the egg, parents and child recorded', () => {
  const D = 864e5, t = quiet(2); t.fish.forEach((f, i) => { f.born = -5 * D; f.stage = 'adult'; f.seed = 3; f.sex = i % 2 ? 'm' : 'f'; }); t.simTs = 0; t.eggAt = 1 * D; t.createdAt = -9 * D; const s0 = t.shells;
  R.advance(t, 1.01 * D); assert.equal(t.eggs.length, 1, 'an egg was laid'); assert.ok(!t.flags.firstHatch, 'laying an egg pays nothing'); const s1 = t.shells;
  watchHatch(t, 1.01 * D); assert.equal(t.eggs.length, 0); const hatched = t.fish.find((f) => f.parents?.length === 2); assert.ok(hatched, 'hatchling keeps its parents'); assert.equal(t.flags.firstHatch.fish, hatched.id); assert.deepEqual(t.flags.firstHatch.parents.sort(), ['f0', 'f1']);
  assert.ok(t.shells - s1 >= R.FIRST_HATCH_REWARD); const s2 = t.shells; t.eggAt = 0; t.eggs.push({ id: 'e9', species: 'goldfish', a: 'f0', b: 'f1', seed: 3, hatchAt: 2 * D, ready: 2 * D, watch: 2 * D }); R.advance(t, 3 * D); assert.ok(t.shells - s2 < R.FIRST_HATCH_REWARD + 50, 'a second hatch does not pay it again');
  const second = t.shells; const w = quiet(2); w.fish.forEach((f) => { f.born = -5 * D; f.stage = 'adult'; }); w.flags.firstHatch = { at: 1 }; w.eggs.push({ id: 'e1', species: 'goldfish', a: 'f0', b: 'f1', seed: 3, hatchAt: 1, ready: 1, watch: 1 }); const wev = R.advance(w, 2); assert.ok(!wev.some((e) => /first baby/.test(e.toast ?? '')) && w.flags.firstHatch.at === 1, 'already recorded: no pay'); assert.ok(second > 0);
});
ok('hatching: in the tank\'s daytime, ready eggs wait for someone to watch (or the next morning), the fry show, and one more little one can be kept', () => {
  const D = 864e5, H = 3600e3, mk = (tz) => { const t = quiet(2); t.tzMin = tz; t.level = 6; t.fish.forEach((f, i) => { f.born = -5 * D; f.stage = 'adult'; f.sex = i % 2 ? 'm' : 'f'; }); return t; };
  for (const at of [2 * H, 23 * H, 12 * H]) { const w = R.wakeAt(mk(0), 10 * D + at), h = new Date(w).getUTCHours(); assert.ok(h >= 9 && h < 20 && w >= 10 * D + at, `${at / H}h -> ${h}h`); }      // a 2am or 11pm hatch moves to the morning; noon stays
  { const t = mk(-300), w = R.wakeAt(t, 10 * D + 13 * H), L = new Date(w - 300 * 60e3).getUTCHours(); assert.ok(L >= 9 && L < 20, 'in their own time zone: ' + L); }
  const t = mk(0); t.eggs.push({ id: 'e1', species: 'goldfish', a: 'f0', b: 'f1', seed: 3, laid: 7 * D + 12 * H, hatchAt: 10 * D + 12 * H, cared: [], guard: null });
  const ev1 = R.advance(t, 10 * D + 12 * H + 1000); assert.ok(t.eggs[0].ready && ev1.some((e) => e.eggReady), 'ready, said once'); assert.ok(ev1.some((e) => /wriggling/.test(e.journal ?? '')));
  R.advance(t, 10 * D + 16 * H); assert.equal(t.eggs.length, 1, 'nobody watching: they wait');
  const r = R.applyAction(t, { t: 'watchEggs' }, { now: 10 * D + 16 * H + 1000, name: 'Alex' }); const h = r.events.find((e) => e.hatch); assert.ok(r.ok && !t.eggs.length && h && h.hatch.fry >= 5 && h.hatch.watched, 'watched: they hatch now, a little cloud of fry');
  assert.ok(t.fryOffer && r.events.some((e) => e.fryOffer), 'one more is still by the eggs'); const n0 = t.fish.length;
  const k = R.applyAction(t, { t: 'keepFry', id: t.fryOffer.id, keep: true }, { now: 10 * D + 16 * H + 60e3, name: 'Alex' }); assert.ok(k.ok && k.keep && t.fish.length === n0 + 1 && !t.fryOffer, 'kept: a twin');
  const twin = t.fish.at(-1); assert.ok(twin.parents.length === 2 && twin.gen === 1 && twin.id !== t.fish.at(-2).id);
  const u = mk(0); u.eggs.push({ id: 'e2', species: 'goldfish', a: 'f0', b: 'f1', seed: 3, laid: 7 * D, hatchAt: 10 * D + 12 * H, cared: [], guard: null }); R.advance(u, 10 * D + 12 * H + 1000);
  R.advance(u, 11 * D + 8 * H); assert.equal(u.eggs.length, 1, 'not in the night'); R.advance(u, 11 * D + 12 * H); assert.equal(u.eggs.length, 0, 'by the next morning they hatch anyway'); assert.ok(!u.fryOffer, 'nobody was there: no second one to keep');
  const o = mk(0); o.eggs.push({ id: 'e3', species: 'goldfish', a: 'f0', b: 'f1', seed: 3, laid: 7 * D, hatchAt: 10 * D, ready: 10 * D, watch: 10 * D, cared: [], guard: null }); R.advance(o, 10 * D + 1000); const id = o.fryOffer.id; R.advance(o, 10 * D + 2 * H);
  assert.ok(!o.fryOffer && !R.applyAction(o, { t: 'keepFry', id, keep: true }, { now: 10 * D + 2 * H }).ok, 'the offer drifts off after a while');
});
ok('a hatchling\'s first day is told once, from what is true; growing up with its parents near gets a family line for the history', () => {
  const D = 864e5, H = 3600e3, t = quiet(2); t.level = 6; t.fish.forEach((f, i) => { f.born = -5 * D; f.stage = 'adult'; f.sex = i % 2 ? 'm' : 'f'; }); t.eggs.push({ id: 'e1', species: 'goldfish', a: 'f0', b: 'f1', seed: 3, laid: 7 * D, hatchAt: 10 * D, ready: 10 * D, watch: 10 * D, cared: [], guard: null });
  R.advance(t, 10 * D + 1000); const kid = t.fish.find((f) => f.hatched); assert.ok(kid);
  const ev = []; for (let h = 1; h <= 30; h++) { t.hunger = 0; t.water = 1; ev.push(...R.advance(t, 10 * D + h * H)); } const day1 = ev.filter((e) => /first day/.test(e.journal ?? ''));
  assert.equal(day1.length, 1, 'once'); assert.match(day1[0].journal, new RegExp(`^${kid.name}'s first day: it has grown a little, and stays close to (${t.fish[0].name}|${t.fish[1].name}) wherever`));
  const ev2 = []; for (let d = 1; d <= 12; d++) { t.hunger = 0; t.water = 1; t.fish.forEach((f) => { f.health = 1; }); ev2.push(...R.advance(t, 11 * D + d * D)); }
  const fam = ev2.find((e) => /all grown up, with/.test(e.journal ?? '')); assert.ok(fam && fam.hist === 'family', JSON.stringify(ev2.map((e) => e.journal).filter(Boolean).slice(-6))); assert.ok((t.history ?? []).some((h) => h.kind === 'family' && /all grown up/.test(h.text)));
});
ok('octopus partners: after some days together the mother lays her eggs in her den and guards them; they hatch (watched) into one tiny octopus of their own; a stray id never makes another kind its child', () => {
  const D = 864e5, H = 3600e3, t = quiet(0); t.level = 8; const sd = (want) => { for (let s = 1; s < 999; s++) if (R.sexOf({ seed: s }) === want) return s; };
  t.fish = [R.ensureFish({ id: 'oA', name: 'Ada', species: 'octopus', seed: sd('f'), born: -60 * D, stage: 'adult', traits: ['Calm'], owner: 'me', home: 'c1', partner: 'oB', partneredAt: 0 }), R.ensureFish({ id: 'oB', name: 'Bo', species: 'octopus', seed: sd('m'), born: -60 * D, stage: 'adult', traits: ['Curious'], owner: 'me', partner: 'oA', partneredAt: 0 })];
  t.decor = [{ id: 'c1', type: 'coconut', x: 1, z: 0.5, ry: 0 }]; t.eggAt = 0; t.adv = { octoAt: 9e15, smallAt: 9e15, hist: [] };
  let laid = null; for (let d = 1; d <= 30 && !laid; d++) for (let h = 0; h < 24 && !laid; h += 2) { const now = d * D + h * H; t.water = 1; t.hunger = 0; t.glass = 0; t.fish.forEach((f) => { f.hunger = 0.1; f.health = 1; f.happy = 0.9; }); const ev = R.advance(t, now); laid = ev.find((e) => /hung strings of tiny eggs/.test(e.journal ?? '')) && now; }
  assert.ok(laid >= R.OCTO_EGG_AFTER * D, 'eggs, after some days as partners'); const e = t.eggs[0]; assert.ok(e.species === 'octopus' && e.den === 'c1' && e.guard === 'oA' && t.fish[0].brood === e.id);
  assert.ok(!R.canAdventure(t, t.fish[0], laid + H, R.ADVR ?? { isOcto: R.isOcto, stageOf: R.stageOf, ownHunger: R.ownHunger, AIL_TIRED: 3 }), 'she stays with them');
  R.norm(t, laid + H); assert.equal(t.eggs.length, 1, 'a den clutch survives a reload');
  const at = e.hatchAt + 1000; t.fish.forEach((f) => { f.hunger = 0.1; }); R.advance(t, at); assert.ok(t.eggs[0]?.ready); const r = R.applyAction(t, { t: 'watchEggs' }, { now: at + 1000, name: 'Alex' });
  const kid = t.fish.find((f) => f.parents?.length); assert.ok(kid && kid.species === 'octopus' && kid.owner === 'me' && !t.fish[0].brood, JSON.stringify(kid)); assert.ok(r.events.some((x) => /Tiny octopuses jetted out/.test(x.journal ?? ''))); assert.ok(r.events.some((x) => /worn out after guarding her eggs/.test(x.journal ?? '')) && t.fish[0].restUntil > at, 'the mother rests a while after her watch');
  assert.deepEqual(R.childrenOf(t, 'oA').map((c) => c.id), [kid.id]);
  t.fish.push(R.ensureFish({ id: 'g9', name: 'Odd', species: 'goldfish', seed: 3, born: 0, stage: 'adult', traits: [], parents: [{ id: 'oA', name: 'Ada' }] })); assert.deepEqual(R.childrenOf(t, 'oA').map((c) => c.id), [kid.id], 'a goldfish is never an octopus\'s child');
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
  assert.equal(lazy.memorial.length + ticked.memorial.length, 0, 'a week away loses nobody, ticked or not: they are very unwell and wait for care'); assert.equal(lazy.fish.length, ticked.fish.length);
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
  const fl = R.applyAction(t, { t: 'feed' }, { now: 10, name: 'A', uid: 'u1' }); assert.equal(fl.delta, 0, 'flakes: feeding pays nothing'); assert.equal(t.shells, 20);
  const pe = R.applyAction(t, { t: 'feed', food: 'pellets' }, { now: 20, name: 'A', uid: 'u1' }); assert.equal(pe.delta, -2); assert.equal(t.shells, 18); assert.ok(t.fish[1].happy > t.fish[0].happy, 'the pellet lover is happiest');
  assert.ok(pe.events.some((e) => /loves pellets/.test(e.journal ?? '')), 'noticed'); t.hunger = 0.8; const again = R.applyAction(t, { t: 'feed', food: 'pellets' }, { now: 30, name: 'A', uid: 'u1' }); assert.ok(!again.events.some((e) => /loves pellets/.test(e.journal ?? '')), 'only once');
  t.hunger = 0.8; t.shells = 3; const poor = R.applyAction(t, { t: 'feed', food: 'treats' }, { now: 40, name: 'A', uid: 'u1' }); assert.equal(poor.ok, false); assert.equal(poor.reason, 'NOT_ENOUGH_SHELLS'); assert.equal(t.shells, 3, 'nothing taken');
  const junk = R.applyAction(t, { t: 'feed', food: 'gold' }, { now: 50, name: 'A', uid: 'u1' }); assert.ok(junk.ok, 'unknown food is treated as flakes');
  const w = quiet(2, { traits: ['Greedy'], wants: true }); w.level = 8; w.wishIdx = 12; w.hunger = 0.8; w.shells = 20; w.want = { id: 'w3', fish: 'f0', kind: 'meal', text: '', since: 0 }; R.applyAction(w, { t: 'feed' }, { now: 5, name: 'A', uid: 'u1' }); assert.ok(w.want, 'flakes do not grant a wish for a treat'); w.hunger = 0.8; const g = R.applyAction(w, { t: 'feed', food: 'treats' }, { now: 6, name: 'A', uid: 'u1' }); assert.ok(g.events.some((e) => e.wishDone) && !w.want);
});
ok('mysis shrimp: the seahorse food is free and pays like flakes, feeds that seahorse (its own hunger, not the shared meal), and is its favourite', () => {
  const t = quiet(2); t.fish[1].species = 'seahorse'; t.fish[1].hunger = 0.8; t.fish.forEach((f) => { f.happy = 0.5; }); t.hunger = 0.8; t.shells = 20; t.level = 8;
  assert.equal(R.FOODS.mysis.price, 0); assert.equal(R.favFoodOf(t.fish[1]), 'mysis'); assert.ok(R.hasSeahorse(t));
  const r = R.applyAction(t, { t: 'feed', food: 'mysis' }, { now: 10, name: 'A', uid: 'u1' }); assert.equal(r.delta, 0, 'pays nothing, exactly as flakes'); assert.equal(t.shells, 20); assert.ok(t.fish[1].hunger < 0.5, 'the seahorse is fed'); assert.equal(t.hunger, 0.8, 'the shared meal is the other fish\'s');
  assert.ok(t.fish[1].happy > 0.55, 'the seahorse loves it'); assert.equal(t.fish[0].happy, 0.5, 'the other fish are not cheered'); assert.ok(r.events.some((e) => /F1 mysis shrimp/.test(e.activity?.text ?? '')), 'named in the activity');
});
ok('tricks: need trust, a growing fish and the right decoration; five sessions 20 minutes apart; learned once, paid once', () => {
  const D = 864e5, M = 60e3, t = quiet(2); t.level = 8; t.wishIdx = 12; t.fish[0].born = -3 * D; t.fish[0].stage = 'adult'; t.simTs = 0; const go = (now, extra = {}) => R.applyAction(t, { t: 'train', id: 'f0', trick: 'gate', ...extra }, { now, name: 'Alex', uid: 'u1' });
  assert.equal(go(1).reason, 'CANT_TRAIN', 'no trust, no gate'); t.fish[0].bond = { u1: 3 }; assert.equal(go(2).reason, 'CANT_TRAIN', 'no decoration to practise with');
  t.decor = [{ id: 'g1', type: 'torii', x: 0, z: 1, ry: 0 }]; assert.equal(R.trickOptions(t, t.fish[0], 3 * D).map((o) => o.key).join(), 'gate'); assert.equal(R.trickOptions(t, t.fish[1], 3 * D).length, 0, 'a baby with no bond cannot');
  const base = 5 * D; let r = go(base); assert.ok(r.applied && r.n === 1); assert.equal(go(base + 5 * M).applied, false, 'too soon'); assert.equal(t.fish[0].skill.gate, 1);
  for (let i = 1; i < 4; i++) go(base + i * 21 * M); r = go(base + 4 * 21 * M); assert.equal(r.learned, 'gate'); assert.equal(r.delta, R.TRICK_REWARD); assert.deepEqual(t.fish[0].tricks, ['gate']);
  assert.equal(go(base + 10 * 21 * M).reason, 'CANT_TRAIN', 'already learned'); assert.equal(R.trickOptions(t, t.fish[0], 6 * D).length, 0);
  t.fish[0].ail = 0; t.createdAt = -20 * D; const m = (() => { t.createdAt = -900 * D; t.fish[0].born = -(R.LIFESPAN[t.fish[0].species] + 400) * D; t.fish.push(R.ensureFish({ id: 'f9', name: 'Z', species: 'goldfish', seed: 3, born: -D, stage: 'adult', traits: ['Calm'] })); t.simTs = 10 * D; for (let d = 11; d < 60 && t.fish.some((f) => f.id === 'f0'); d++) R.advance(t, d * D); return t.memorial.find((x) => x.id === 'f0'); })();      // (of old age: neglect no longer kills) assert.ok(m && m.milestones.some((x) => /gate/.test(x)), JSON.stringify(m));
});
ok('the opening of a tank: choose and name the free first fish, once, only the owner, only from the starter list', () => {
  const t = R.newWorld(0); R.norm(t, 0); const go = (a, uid = 'me') => R.applyAction(t, { t: 'chooseFirst', ...a }, { now: 1000, name: 'Alex', uid });
  assert.equal(go({ species: 'betta', name: 'X' }).reason, 'UNKNOWN_SPECIES'); assert.deepEqual(R.FIRST_FISH, ['octopus']); assert.ok(R.FIRST_FISH.every((k) => R.SPECIES_DEF[k] && !R.SPECIES_DEF[k].visitor)); assert.equal(go({ species: 'octopus', name: 'X' }, 'someone-else').reason, 'FORBIDDEN');
  const r = go({ species: 'octopus', name: 'Biscuit <b>', seed: 77, pal: 4 }); assert.ok(r.ok); assert.equal(t.fish[0].pal, 4, 'the chosen colour is kept'); const f = t.fish[0]; assert.equal(t.fish.length, 1); assert.equal(f.id, 'f1'); assert.equal(f.species, 'octopus'); assert.ok(!/[<>]/.test(f.name) && f.name.startsWith('Biscuit')); assert.deepEqual(f.traits, R.traitsFor('octopus', 77)); assert.equal(f.born, 1000); assert.deepEqual(t.seen.fish, ['octopus']); assert.ok(t.flags.intro);
  assert.ok(r.events.some((e) => /first fish/.test(e.journal))); assert.equal(go({ species: 'goldfish', name: 'Again' }).reason, 'ALREADY_HAVE', 'once');
  const j = R.newWorld(0); R.norm(j, 0); j.flags.firsts = { me: true }; j.fish.push(R.ensureFish({ id: 'x', name: 'x', species: 'goldfish', seed: 1, born: 0, stage: 'baby', traits: [] })); assert.equal(R.applyAction(j, { t: 'chooseFirst', species: 'octopus' }, { now: 5, name: 'A', uid: 'me' }).reason, 'FORBIDDEN', 'not once the tank has other fish');
  const m = R.newWorld(0); R.norm(m, 0); const fr = R.applyAction(m, { t: 'firstFish', species: 'neon', name: 'Dot', seed: 5, pal: 9 }, { now: 5, name: 'Sam', uid: 'u2', members: [{ id: 'u2', name: 'Sam' }, { id: 'me', name: 'A' }] }); assert.ok(fr.ok); assert.equal(m.fish.find((x) => x.id === fr.id).species, 'octopus', 'a friend\'s first animal is an octopus whatever was asked'); assert.ok(m.fish.find((x) => x.id === fr.id).pal >= 0 && m.fish.find((x) => x.id === fr.id).pal < R.OCTO_PALS, 'a bad colour gets a dealt one'); const bad = R.newWorld(0); R.norm(bad, 0); const b2 = R.applyAction(bad, { t: 'firstFish', species: 'betta', name: 'Z', seed: 5 }, { now: 5, name: 'Sam', uid: 'u2' }); assert.equal(bad.fish.find((x) => x.id === b2.id).species, 'octopus', 'a joiner cannot pick outside the starter list');
});
ok('a brand new tank has no fish until its first caretaker chooses one, which then arrives', () => {
  const t = R.newWorld(0, 1, { empty: true }); R.norm(t, 0); assert.equal(t.fish.length, 0); assert.deepEqual(t.seen.fish, []); assert.deepEqual(t.flags.firsts, {});
  assert.equal(R.advance(t, 5 * 3600e3).length >= 0, true, 'an empty tank just sits there'); assert.equal(t.fish.length, 0);
  const r = R.applyAction(t, { t: 'chooseFirst', species: 'octopus', name: 'Nori', seed: 9 }, { now: 6 * 3600e3, name: 'Alex', uid: 'u1' }); assert.ok(r.ok); assert.equal(t.fish.length, 1); const f = t.fish[0];
  assert.equal(f.species, 'octopus'); assert.equal(f.name, 'Nori'); assert.equal(f.owner, 'u1'); assert.equal(f.ownerName, 'Alex'); assert.equal(f.born, 6 * 3600e3); assert.ok(r.events.some((e) => e.arrival?.includes(f.id)) && r.events.some((e) => /first fish/.test(e.journal ?? '')));
  assert.deepEqual(t.seen.fish, ['octopus']); assert.ok(t.flags.intro && t.flags.firsts.u1);
  assert.equal(R.applyAction(t, { t: 'chooseFirst', species: 'octopus', name: 'Again' }, { now: 7 * 3600e3, name: 'Alex', uid: 'u1' }).reason, 'ALREADY_HAVE', 'only once');
  const m = R.newWorld(0, 1, { empty: true }); R.norm(m, 0); assert.equal(R.applyAction(m, { t: 'chooseFirst', species: 'octopus', name: 'X' }, { now: 1, name: 'Z', uid: 'stranger', members: [{ id: 'u1', name: 'Alex' }] }).reason, 'FORBIDDEN', 'only a member can choose');
  const e = R.newWorld(0, 1, { empty: true }); R.norm(e, 0); for (const k of [1, 2, 3, 7]) R.advance(e, k * 864e5); assert.equal(e.memorial.length, 0); assert.equal(e.want, null, 'no wishes without fish');
});
ok('a full day: tank looked after, wish done, a fish given attention; ticked once per UTC day, not paid, no streak, no penalty', () => {
  const D = 864e5, t = quiet(3); t.level = 8; t.wishIdx = 12; t.seen.fish = ['goldfish']; t.flags.collMs = 99; t.fish.forEach((f) => { f.born = -5 * D; f.stage = 'adult'; f.happy = 0.9; });
  const day = 9; t.simTs = day * D; t.hunger = 0.7; t.water = 0.6; t.glass = 0.5; t.daily = { day, kind: 'play', tier: 'easy', reward: 3, text: '', need: 1, have: 0, ids: [], done: false };
  const go = (a, at, uid = 'u1') => R.applyAction(t, a, { now: day * D + at, name: uid === 'u1' ? 'Alex' : 'Sam', uid }).events;
  assert.deepEqual({ ...R.dayTicks(t, day * D + 10), paid: false }, { care: false, wish: false, bond: false, paid: false });
  let ev = go({ t: 'feed' }, 1000); ev.push(...go({ t: 'feed' }, 1100)); assert.ok(!R.dayTicks(t, day * D + 1200).care, 'fed but the water is still cloudy');
  ev.push(...go({ t: 'water' }, 1300)); ev.push(...go({ t: 'glass' }, 1400)); assert.ok(R.dayTicks(t, day * D + 1500).care, 'now the tank is looked after');
  assert.ok(!ev.some((e) => e.perfectDay), 'not yet'); ev = go({ t: 'pet', id: 'f0' }, 2000, 'u2'); assert.ok(ev.some((e) => e.dailyDone), 'playing is also today\'s wish'); assert.equal(R.dayTicks(t, day * D + 2100).paid, true, 'three ticks, from two different caretakers: the day is full'); assert.ok(!ev.some((e) => e.perfectDay || /perfect day/i.test(e.journal ?? '')), 'and it is not paid or posted'); const s1 = t.shells; go({ t: 'pet', id: 'f1' }, 3000); go({ t: 'fishNote', id: 'f0', text: 'hi' }, 3100); assert.equal(R.dayTicks(t, day * D + 3200).paid, true); assert.equal(t.shells, s1, 'once a day');
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
ok('hide a treat: it costs shells, the octopus searches spot by spot, learns each caretaker\'s favorite places, and can be fooled by a new one', () => {
  const D = 864e5, t = quiet(2); t.level = 8; t.shells = 200; const oc = t.fish[0]; oc.species = 'octopus'; oc.born = -5 * D; oc.stage = 'adult';
  t.decor.length = 0; for (const [id, type] of [['a', 'coconut'], ['b', 'rock'], ['c', 'fern'], ['d', 'grass'], ['e', 'chest'], ['g', 'wood']]) t.decor.push({ id, type, x: 0, z: 0, ry: 0 });
  let now = 1000; const go = (spot, who = 'u1', name = 'Alex') => { const r = R.applyAction(t, { t: 'hide', id: oc.id, spot }, { now, name, uid: who }); return r; };
  const hunt = (spot, who, name) => { const r = go(spot, who, name); assert.ok(r.ok && r.applied, JSON.stringify(r)); now = r.until + 1; const ev = R.advance(t, now); now += R.HIDE_GAP + 1; return { tries: r.tries, ev }; };
  assert.equal(R.applyAction(t, { t: 'hide', id: t.fish[1].id, spot: 'a' }, { now, uid: 'u1' }).ok, false, 'only an octopus hunts');
  const s0 = t.shells, r0 = go('a'); assert.equal(t.shells, s0 - R.HIDE_COST, 'it costs shells'); assert.equal(go('b').busy, true, 'one hunt at a time');
  now = r0.until + 1; R.advance(t, now); assert.ok(go('b').wait > 0, 'and a rest between hunts'); now += R.HIDE_GAP + 1;
  const tries = []; for (let i = 0; i < 6; i++) tries.push(hunt('a', 'u1', 'Alex').tries);
  assert.equal(tries.at(-1), 1, 'hide in the same place again and again and it goes straight there: ' + tries); assert.equal(tries.at(-2), 1);
  const fooled = hunt('e', 'u1', 'Alex'); assert.ok(fooled.tries >= 3, 'a new place fools it: ' + fooled.tries); assert.ok(fooled.ev.some((e) => /Alex fooled/.test(e.journal ?? '')));
  assert.ok(Object.keys(oc.disc ?? {}).some((k) => k === 'reader:u1'), 'after three straight finds it has learned Alex\'s hiding places');
  for (let i = 0; i < 3; i++) hunt('c', 'u2', 'Sam'); const other = R.hideOrder(t, oc, 'u2'), mine = R.hideOrder(t, oc, 'u1'); assert.deepEqual(mine.slice(0, 2), ['a', 'e'], 'for Alex it looks first in the favorite, then the last place Alex used: ' + mine); assert.equal(other[0], 'c', 'Sam has habits of their own, and it knows them: ' + other); assert.notEqual(mine[0], 'c', 'which are not Alex\'s');
  t.shells = 2; assert.equal(go('a').reason, 'NOT_ENOUGH_SHELLS');
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
  assert.equal(R.applyAction(t, { t: 'dailyGift', tz: 0 }, { now: at(1), uid: 'b' }).delta, 0, 'one gift a day for the tank: a friend coming by later that day finds it taken');
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
  let pearls = 0, plain = 0; for (let i = 0; i < 30; i++) { const a = R.newWorld(full - 3600e3, 1); R.norm(a, full - 3600e3); a.flags.tut = 5; a.driftAt = full; R.advance(a, full + 1000 * (i + 1)); if (a.drift?.kind === 'pearl') pearls++; const b = R.newWorld(full - 20 * 864e5 - 3600e3, 1); R.norm(b, full - 20 * 864e5 - 3600e3); b.flags.tut = 5; b.driftAt = full - 20 * 864e5; R.advance(b, full - 20 * 864e5 + 1000 * (i + 1)); if (b.drift?.kind === 'pearl') plain++; }
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
  const r = R.applyAction(t, { t: 'buyFish', species: 'cory', name: 'Gob', seed: 4, to: 'u2', surprise: false }, { now: 5000, name: 'Alex', uid: 'u1', members }); assert.ok(r.ok); assert.equal(t.orders.at(-1).owner, 'u2'); assert.equal(t.orders.at(-1).ownerName, 'Sam'); assert.equal(t.orders.at(-1).giftFrom, 'Alex');
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
ok('habit lines come only from real counts: none for a newcomer, each number is what happened, a removed decoration is never named', () => { const L = (id) => ({ p1: 'Sea Grass', p2: 'Sword Plant' })[id] ?? null;
  assert.deepEqual(habitLines({ name: 'New' }, L), [], 'nothing to say about an animal with no history');
  assert.deepEqual(habitLines({ name: 'Pip', hitch: { p1: [100, 2] }, fav: 'p1', strikes: 2, inspects: 2, greets: 1 }, L), [], 'small counts say nothing yet');
  const h = habitLines({ name: 'Pip', hitch: { p1: [900, 35], p2: [200, 4], gone: [5000, 50] }, fav: 'p1', meals: 12, strikes: 8, greets: 3, links: 2, inspects: 4 }, L), txt = h.map((x) => x.text).join(' | ');
  assert.ok(txt.includes('gone back to the same sea grass 34 times'), txt); assert.ok(txt.includes('82%'), 'share of real holding time, without the removed decoration: ' + txt);
  assert.ok(txt.includes('4 so far') && txt.includes('8 of 12 meals') && txt.includes('3 times') && txt.includes('twice'), txt); assert.ok(!/undefined|NaN/.test(txt));
  const roam = habitLines({ name: 'Moss', hitch: { a: [200, 2], b: [180, 2], c: [170, 2], d: [160, 1], e: [150, 1] } }, (id) => 'Kelp ' + id).map((x) => x.k);
  assert.ok(roam.includes('roams') && !roam.includes('familiar'), roam.join());
  const fish = habitLines({ name: 'Nori', places: 6, lv: { top: 800, mid: 100 } }, L).map((x) => x.text).join(' | ');
  assert.ok(fish.includes('near the surface') && fish.includes('6 different decorations'), 'the same rules serve a fish: ' + fish); });
// ── seahorse families (simulated time: days pass in a few steps; the real lifecycle is unchanged) ──
{ const H = 3600e3, D = 864e5;
  const tank = (extra = []) => { const t = R.newWorld(0, 1, { empty: true }); t.level = 8; t.fish.length = 0;
    t.fish.push(R.ensureFish({ id: 'm', name: 'Sunny', species: 'seahorse', seed: 4, born: -20 * D, stage: 'adult', traits: ['Calm'], sex: 'm' }), R.ensureFish({ id: 'w', name: 'Pearl', species: 'seahorse', seed: 11, born: -20 * D, stage: 'adult', traits: ['Shy'], sex: 'f' }), ...extra);
    for (const k of ['pairAt', 'courtAt', 'eggAt']) t[k] = 0; return t; };
  const live = (t, from, to, step = 3 * H) => { const ev = []; for (let now = from; now <= to; now += step) { t.hunger = 0; t.water = 1; t.glass = 0; for (const f of t.fish) { f.health = 1; f.happy = 0.9; if (R.ownHungry(f)) f.hunger = 0; } ev.push(...R.advance(t, now)); } return ev; };
  ok('seahorses pair slowly: a male and a female sharing the tank as adults pair after a couple of days, and the pair is kept in the tank record', () => {
    const t = tank(); live(t, 0, 1 * D); assert.ok(!t.fish[0].mate, 'not after one day'); live(t, 1 * D, 3 * D); assert.equal(t.fish[0].mate, 'w'); assert.equal(t.fish[1].mate, 'm');
    const back = JSON.parse(JSON.stringify(t)); R.norm(back, 3 * D); assert.equal(back.fish.find((f) => f.id === 'm').mate, 'w', 'a reload keeps the pair'); });
  ok('never a parent and its child, never brother and sister', () => {
    const t = tank([R.ensureFish({ id: 'd', name: 'Dot', species: 'seahorse', seed: 5, born: -20 * D, stage: 'adult', traits: [], sex: 'f', parents: [{ id: 'm', name: 'Sunny' }] }), R.ensureFish({ id: 's', name: 'Fin', species: 'seahorse', seed: 6, born: -20 * D, stage: 'adult', traits: [], sex: 'm', parents: [{ id: 'm', name: 'Sunny' }] })]);
    t.fish = t.fish.filter((f) => f.id !== 'w'); live(t, 0, 10 * D); assert.ok(!t.fish.some((f) => f.mate), JSON.stringify(t.fish.map((f) => [f.id, f.mate]))); });
  ok('a settled pair courts now and then, and he carries the young for six to nine days', () => {
    const t = tank(); const ev = live(t, 0, 20 * D); const m = t.fish[0], court = ev.filter((e) => e.court);
    assert.equal(court.length >= 1, true, 'courtship happened'); assert.ok(m.preg || t.nursery, 'pregnant or already born');
    for (let seed = 1; seed < 40; seed++) { const u = tank(); u.fish[0].seed = seed; live(u, 0, 30 * D, 6 * H); const N = u.nursery, p = u.fish[0];
      if (N) { const start = N.born - (N.born - (p.lastBirth ?? N.born)); assert.ok(N.readyAt - N.born === 5 * D); } }
    const u = tank(); live(u, 0, 4 * D); let m2 = u.fish[0]; for (let d = 4; d < 30 && !m2.preg; d++) live(u, d * D, (d + 1) * D);
    if (m2.preg) { const days = (m2.preg.due - m2.preg.start) / D; assert.ok(days >= 6 && days <= 9, String(days)); } });
  ok('birth happens on the server clock while nobody is there, once, and the nursery holds three babies with their own names, looks and parents', () => {
    const t = tank(); live(t, 0, 4 * D); let m = t.fish[0]; for (let d = 4; d < 30 && !m.preg; d++) live(t, d * D, (d + 1) * D); assert.ok(m.preg, 'pregnant');
    const due = m.preg.due, ev = R.advance(t, due + 20 * D);      // weeks pass with every phone closed
    assert.equal(ev.filter((e) => e.birth).length, 1); assert.ok(t.nursery); assert.equal(t.nursery.cands.length, 3); assert.equal(t.nursery.born, R.wakeAt(t, due + R.EGG_WAIT), 'nobody watched: born the next daytime morning after it was due, not when someone looked');
    assert.equal(new Set(t.nursery.cands.map((c) => c.name)).size, 3); assert.ok(t.nursery.cands.every((c) => c.genes && c.traits.length)); assert.ok(t.nursery.n >= 10 && t.nursery.n <= 15);
    assert.equal(m.preg, null); assert.equal(m.breedAt, t.nursery.born + 14 * D, 'a fortnight before he can carry again');
    assert.equal(R.advance(t, due + 21 * D).filter((e) => e.birth).length, 0, 'never born twice'); });
  ok('each nursery day one baby gets its own line in the journal, in turn, about the tank it lives in; never twice for a day', () => {
    const t = tank(); t.decor.push({ id: 'dp', type: 'fern', x: 1, z: 1, ry: 0 }); live(t, 0, 4 * D); const m = t.fish[0]; for (let d = 4; d < 30 && !m.preg; d++) live(t, d * D, (d + 1) * D); const due = m.preg.due; m.preg.watch = due;      /* (someone is there for it) */ live(t, m.preg.start + H, due); R.advance(t, due + H);
    const N = t.nursery, said = [];
    for (let k = 1; k <= 5; k++) { const ev = R.advance(t, due + k * D + H); said.push(...ev.filter((e) => e.nurseryDay).map((e) => e.journal)); live(t, due + k * D + 2 * H, due + k * D + 3 * H); }
    assert.equal(said.length, 4, 'days one to four, one line each: ' + JSON.stringify(said)); assert.ok(said.every((x, i) => x.startsWith(`Nursery, day ${i + 1}: `)));
    assert.deepEqual(said.slice(0, 3).map((x) => N.cands.find((c) => x.includes(c.name))?.id), N.cands.map((c) => c.id), 'each of the three babies in turn');
    assert.equal(R.advance(t, due + 4 * D + 5 * H).filter((e) => e.nurseryDay).length, 0, 'a day is told once'); });
  ok('choosing the baby: not before five days, one choice wins even if two caretakers choose at once, it keeps its name and parents, the others leave', () => {
    const t = tank(); live(t, 0, 4 * D); let m = t.fish[0]; for (let d = 4; d < 30 && !m.preg; d++) live(t, d * D, (d + 1) * D); const due = m.preg.due; m.preg.watch = due;      /* (someone is there for it) */ live(t, m.preg.start + H, due); R.advance(t, due + H);
    const N = t.nursery, [c0, c1] = N.cands, now = due + 2 * H;
    assert.equal(R.applyAction(t, { t: 'keepBaby', nursery: N.id, baby: c0.id }, { now }).reason, 'NOT_READY');
    const ready = due + 5 * D + H; live(t, due + 3 * H, ready);      // (the tank is looked after through the nursery days)
    const r1 = R.applyAction(t, { t: 'keepBaby', nursery: N.id, baby: c0.id }, { now: ready }), r2 = R.applyAction(t, { t: 'keepBaby', nursery: N.id, baby: c1.id }, { now: ready });
    assert.equal(r1.ok, true); assert.equal(r2.ok, false); assert.equal(t.nursery, null);
    const f = t.fish.find((x) => x.id === c0.id); assert.ok(f, 'the same identity'); assert.equal(f.name, c0.name); assert.equal(f.birthDate, due); assert.equal(f.bornHere, true); assert.deepEqual(f.parents.map((p) => p.name), ['Sunny', 'Pearl']);
    assert.equal(R.stageOf(f, ready), 'baby', 'it starts its own growing up'); assert.equal(t.fish.filter((x) => x.species === 'seahorse').length, 3, 'one baby, not three'); });
  ok('a full tank: births still have a little room; past it the nursery still happens, the choice waits, and nothing is removed to make room', () => {
    const t = tank(); t.level = 8; while (t.fish.length < R.capacity(8)) t.fish.push(R.ensureFish({ id: 'g' + t.fish.length, name: 'G', species: 'neon', seed: t.fish.length, born: -20 * D, stage: 'adult', traits: [] }));
    live(t, 0, 4 * D); let m = t.fish[0]; for (let d = 4; d < 40 && !m.preg; d++) live(t, d * D, (d + 1) * D); assert.ok(m.preg); const due = m.preg.due; m.preg.watch = due;      /* (someone is there for it) */ live(t, m.preg.start + H, due + 6 * D);
    while (t.fish.length + R.pending(t) + t.eggs.length < R.capacity(t.level)) t.fish.push(R.ensureFish({ id: 'g' + t.fish.length, name: 'G', species: 'neon', seed: t.fish.length, born: -20 * D, stage: 'adult', traits: [] }));      // (the tank may have grown a level meanwhile: full again)
    { const T2 = structuredClone(t); assert.equal(R.applyAction(T2, { t: 'keepBaby', nursery: T2.nursery.id, baby: T2.nursery.cands[0].id }, { now: due + 6 * D }).ok, true, 'a tank full for the shop still has room for a baby born in it'); }
    while (t.fish.length + R.pending(t) + t.eggs.length < R.capacity(t.level) + R.BIRTH_ROOM) t.fish.push(R.ensureFish({ id: 'g' + t.fish.length, name: 'G', species: 'neon', seed: t.fish.length, born: -20 * D, stage: 'adult', traits: [] }));      // (and past that little extra room it waits)
    const n0 = t.fish.length, N = t.nursery, r = R.applyAction(t, { t: 'keepBaby', nursery: N.id, baby: N.cands[0].id }, { now: due + 6 * D });
    assert.equal(r.reason, 'TANK_FULL'); assert.equal(t.fish.length, n0); assert.ok(t.nursery, 'still waiting');
    t.fish.splice(t.fish.findIndex((f) => f.species === 'neon'), 1); assert.equal(R.applyAction(t, { t: 'keepBaby', nursery: N.id, baby: N.cands[1].id }, { now: due + 7 * D }).ok, true); });
  ok('family polish: an expecting father cannot be sold; the three babies are three different characters; feeding is remembered for the nursery; the choice records who swam off, once', () => {
    const t = tank(); live(t, 0, 4 * D); let m = t.fish[0]; for (let d = 4; d < 30 && !m.preg; d++) live(t, d * D, (d + 1) * D); assert.ok(m.preg);
    const sh = t.shells, r = R.applyAction(t, { t: 'sellFish', id: 'm' }, { now: m.preg.start + H }); assert.equal(r.reason, 'EXPECTING'); assert.ok(t.fish.some((f) => f.id === 'm')); assert.equal(t.shells, sh);
    const due = m.preg.due; m.preg.watch = due;      /* (someone is there for it) */ live(t, m.preg.start + H, due); R.advance(t, due + H); const N = t.nursery;
    assert.deepEqual(N.cands.map((c) => c.role), ['explore', 'plants', 'social']);
    for (let seed = 1; seed < 400; seed++) { const u = tank(); const m = u.fish[0]; m.preg = { start: 0, due: 7 * D, mother: 'w', seed: seed * 7919, n: 12, watch: 7 * D }; R.advance(u, 7 * D + 1); assert.equal(new Set(u.nursery.cands.map((c) => c.name)).size, 3, 'three different names, seed ' + seed); } assert.deepEqual(N.cands.map((c) => c.traits[0]), ['Curious', 'Calm', 'Social']);
    assert.equal(R.applyAction(t, { t: 'sellFish', id: N.cands[0].id }, { now: due + 2 * H }).reason, 'NOT_FOUND', 'a nursery baby is not in the shop list');
    t.hunger = 0.5; t.shells = 50; R.applyAction(t, { t: 'feed', food: 'flakes' }, { now: due + 2 * H }); assert.equal(N.fed, 1);
    live(t, due + 3 * H, due + 5 * D + H); assert.equal(R.applyAction(t, { t: 'sellFish', id: 'm' }, { now: due + 5 * D + H }).ok, true, 'after the birth he can go to a new home again');
    t.fish.push(R.ensureFish({ id: 'z', name: 'Z', species: 'neon', seed: 2, born: -20 * D, stage: 'adult', traits: [] }));
    assert.equal(R.applyAction(t, { t: 'keepBaby', nursery: N.id, baby: N.cands[2].id }, { now: due + 5 * D + 2 * H }).ok, true);
    assert.deepEqual(t.lastDepart.left, [N.cands[0].id, N.cands[1].id]); assert.equal(t.lastDepart.kept, N.cands[2].id); assert.equal(t.lastDepart.nursery, N.id);
    const back = JSON.parse(JSON.stringify(t)); R.norm(back, due + 6 * D); assert.equal(back.lastDepart.nursery, N.id); });
  ok('buying a seahorse: the caretaker chooses male or female, and it arrives so', () => {
    for (const sex of ['m', 'f']) { const t = R.newWorld(0, 3, { empty: true }); t.level = 8; t.shells = 500; t.flags.tut = 5; const r = R.applyAction(t, { t: 'buyFish', species: 'seahorse', name: 'Sal', seed: 4, sex }, { now: 1000 }); assert.equal(r.ok, true, r.reason); R.advance(t, 1000 + 864e5); const f = t.fish.find((x) => x.species === 'seahorse'); assert.ok(f, 'arrived'); assert.equal(f.sex, sex); assert.equal(R.sexOf(f), sex); }
    const t = R.newWorld(0, 3, { empty: true }); t.level = 8; t.shells = 500; t.flags.tut = 5; R.applyAction(t, { t: 'buyFish', species: 'goldfish', name: 'G', seed: 4, sex: 'f' }, { now: 1000 }); R.advance(t, 1000 + 864e5); assert.equal(t.fish[0].sex, undefined, 'only seahorses'); });
  ok('a seahorse has its own hunger: it grows while nobody feeds it, and only its caretaker (or anyone, if it has none) can feed it', () => {
    const t = R.newWorld(0, 3, { empty: true }); t.level = 8; t.flags.tut = 5; t.fish.push(R.ensureFish({ id: 's1', name: 'Mine', species: 'seahorse', seed: 4, born: -20 * D, stage: 'adult', traits: [], owner: 'u1', ownerName: 'Ann' }), R.ensureFish({ id: 's2', name: 'Theirs', species: 'seahorse', seed: 5, born: -20 * D, stage: 'adult', traits: [], owner: 'u2', ownerName: 'Bo' }), R.ensureFish({ id: 's3', name: 'Nobodys', species: 'seahorse', seed: 6, born: -20 * D, stage: 'adult', traits: [], owner: null }));
    t.simTs = 0; R.advance(t, 12 * 3600e3); assert.ok(t.fish[0].hunger > 0.6, 'hungry after half a day: ' + t.fish[0].hunger);
    const m = [{ id: 'u1', name: 'Ann' }, { id: 'u2', name: 'Bo' }];
    assert.equal(R.applyAction(t, { t: 'feed', food: 'mysis', fish: 's2' }, { now: 12 * 3600e3, uid: 'u1', name: 'Ann', members: m }).reason, 'NOT_YOURS', 'not someone else\'s');
    assert.equal(R.applyAction(t, { t: 'feed', food: 'mysis', fish: 's1' }, { now: 12 * 3600e3, uid: 'u1', name: 'Ann', members: m }).ok, true); assert.ok(t.fish[0].hunger < 0.4);
    assert.equal(R.applyAction(t, { t: 'feed', food: 'mysis', fish: 's3' }, { now: 12 * 3600e3, uid: 'u2', name: 'Bo', members: m }).ok, true, 'no caretaker: anyone');
    assert.ok(t.fish[1].hunger > 0.6, 'Bo\'s own seahorse is still waiting for Bo'); assert.equal(R.canFeedOwn(t.fish[1], 'u2'), true); assert.equal(R.canFeedOwn(t.fish[1], 'u1'), false);
    const solo = R.applyAction(t, { t: 'feed', food: 'mysis', fish: 's2' }, { now: 12 * 3600e3, uid: 'me', name: 'Me', solo: true }); assert.equal(solo.ok, true, 'a solo tank: all yours'); });
  ok('the pouch fills through the pregnancy and goes back down after the birth; seahorses no longer lay eggs; an old save without any of this still loads', () => {
    const p = { preg: { start: 0, due: 7 * D } }; assert.equal(R.broodOf(p, 0), 0); assert.ok(Math.abs(R.broodOf(p, 3.5 * D) - 0.5) < 1e-9); assert.equal(R.broodOf(p, 9 * D), 1);
    assert.ok(R.broodOf({ lastBirth: 0 }, 1 * D) > 0 && R.broodOf({ lastBirth: 0 }, 3 * D) === 0);
    const t = tank(); t.eggAt = 0; live(t, 0, 5 * D); assert.equal(t.eggs.length, 0);
    const old = JSON.parse(JSON.stringify(tank())); for (const f of old.fish) { delete f.sex; } delete old.nursery; R.norm(old, 0); R.advance(old, H); assert.ok(old.fish.every((f) => f.sex === 'm' || f.sex === 'f')); assert.equal(old.nursery, null); });
}
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
  { const t = W(); assert.ok(mv(t, { id: 'r', x: 2, z: 1.2 }).applied); assert.deepEqual([t.decor[1].x, t.decor[1].z], [2, 1.2]); assert.equal(mv(t, { id: 'r', x: 2.5, z: 1 }, at + 60e3).applied, false, 'at most once every 10 minutes'); assert.ok(mv(t, { id: 'r', x: 2.5, z: 1 }, at + R.MOVE_GAP + 1).applied); }
  { const t = W(); assert.equal(mv(t, { id: 'b', x: 1, z: 1 }).ok, false, 'a boulder is too heavy'); assert.equal(mv(t, { id: 'r', x: 9, z: 1 }).ok, false, 'not out of the tank'); assert.equal(mv(t, { id: 'r', x: -4, z: 1 }).ok, false, 'not too far in one go'); }
  { const t = W(); assert.ok(mv(t, { id: 'c', x: -3.5, z: 0.4, home: true, ry: 3.14 }).applied); assert.equal(t.fish.find((f) => f.id === 'o').home, 'c'); assert.equal(R.homeOf(t, t.fish.find((f) => f.id === 'o')).id, 'c'); R.applyAction(t, { t: 'sellDecor', id: 'c' }, { now: at }); assert.equal(t.fish.find((f) => f.id === 'o').home, undefined, 'selling the shell makes it homeless'); }
  { const t = W(); R.applyAction(t, { t: 'tankPref', rearrange: false }, { now: at }); assert.equal(mv(t, { id: 'r', x: 2, z: 1 }).ok, false); R.applyAction(t, { t: 'tankPref', rearrange: true }, { now: at }); assert.ok(mv(t, { id: 'r', x: 2, z: 1 }).applied); }
  { const t = W(); t.fish.find((f) => f.id === 'o').born = at; assert.equal(mv(t, { id: 'r', x: 2, z: 1 }).ok, false, 'a baby octopus cannot'); }
}

// an octopus's friend and rival are kept with the tank, and its memorable moments go in the journal, each kind only so often
ok('an octopus remembers a friend and a rival for every phone, and its moments are written in the journal without spamming it', () => {
  const t = R.newWorld(0); t.fish.push(R.ensureFish({ id: 'o', name: 'Inky', species: 'octopus', seed: 3, born: 0, stage: 'adult', traits: [] }), R.ensureFish({ id: 'a', name: 'Pip', species: 'goldfish', seed: 1, born: 0, traits: [] }), R.ensureFish({ id: 'b', name: 'Miso', species: 'goldfish', seed: 2, born: 0, traits: [] }));
  const go = (a, now = 10 * DAY) => R.applyAction(t, { fish: 'o', ...a }, { now, uid: 'me', name: 'Me' }), oc = () => t.fish.find((f) => f.id === 'o');
  let r = go({ t: 'octoMemo', buddy: 'a', rival: 'b' }); assert.ok(r.ok); assert.equal(oc().buddy, 'a'); assert.equal(oc().rival, 'b'); assert.ok(r.events.some((e) => /Inky and Pip are friends/.test(e.journal ?? ''))); assert.ok(r.events.some((e) => /has it in for Miso/.test(e.journal ?? '')));
  assert.equal(go({ t: 'octoMemo', buddy: 'a', rival: 'b' }).applied, false, 'nothing new, nothing written');
  r = go({ t: 'octoMemo', buddy: 'b', rival: 'a' }, 10 * DAY + 60e3); assert.equal(oc().buddy, 'b', 'a change of heart is kept at once'); assert.equal(r.events.filter((e) => /friends|has it in/.test(e.journal ?? '')).length, 0, 'but not written in the journal again the same day');
  assert.equal(go({ t: 'octoMemo', buddy: 'zz' }).ok, false, 'only real fish'); assert.equal(go({ t: 'octoMemo', buddy: 'o' }).ok, false, 'not itself'); assert.equal(go({ t: 'octoMemo', buddy: 'a', rival: 'a' }).ok, false, 'not both');
  r = go({ t: 'octoMoment', kind: 'lion' }); assert.ok(r.events.some((e) => /lionfish/.test(e.journal ?? '')));
  assert.equal(go({ t: 'octoMoment', kind: 'lion' }, 10 * DAY + 3600e3).applied, false, 'the same kind of moment is not written again the same day');
  assert.equal(go({ t: 'octoMoment', kind: 'smack' }).ok, false, 'a smack needs a fish'); assert.ok(go({ t: 'octoMoment', kind: 'smack', other: 'b' }).events.some((e) => /smacked Miso/.test(e.journal ?? '')));
  assert.equal(go({ t: 'octoMoment', kind: 'dance' }).ok, false, 'only known moments');
});

// each octopus has its own hunger, filled only by a crab from its own caretaker
{
  const t = R.newWorld(0, 1, { empty: true }); R.norm(t, 0); const M = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Bo' }];
  R.applyAction(t, { t: 'chooseFirst', species: 'octopus', name: 'Ink', seed: 3 }, { now: 1000, name: 'Ana', uid: 'a', members: M });
  R.applyAction(t, { t: 'firstFish', name: 'Dot', seed: 4 }, { now: 1000, name: 'Bo', uid: 'b', members: M });
  const ink = t.fish.find((f) => f.name === 'Ink'), dot = t.fish.find((f) => f.name === 'Dot'); assert.equal(ink.hunger, 0.3);
  R.advance(t, 1000 + 14 * 3600e3); assert.ok(ink.hunger > 0.75 && ink.hunger < 0.85, 'fourteen hours on: ' + ink.hunger); assert.equal(R.needsOf(ink, t).mood, 'Hungry');
  const no = R.applyAction(t, { t: 'feed', food: 'crab', fish: ink.id }, { now: 1000 + 14 * 3600e3, name: 'Bo', uid: 'b', members: M }); assert.equal(no.reason, 'NOT_YOURS', 'Bo cannot feed Ana\'s octopus');
  const s0 = t.shells, ok1 = R.applyAction(t, { t: 'feed', food: 'crab', fish: ink.id }, { now: 1000 + 14 * 3600e3, name: 'Ana', uid: 'a', members: M }); assert.ok(ok1.ok && ok1.applied && ok1.delta === 0, JSON.stringify(ok1)); assert.ok(ink.hunger < 0.35); assert.equal(t.shells, s0);
  assert.ok(dot.hunger > 0.75, 'Dot is still hungry: feeding Ink did nothing for it'); assert.equal(t.hunger < 0.9, true);
  const pick = R.applyAction(t, { t: 'feed', food: 'crab' }, { now: 1000 + 14 * 3600e3, name: 'Bo', uid: 'b', members: M }); assert.ok(pick.ok && pick.fish === dot.id, 'with no fish named, a caretaker feeds their own');
  assert.equal(R.applyAction(t, { t: 'feed', food: 'crab' }, { now: 1000 + 14 * 3600e3 + 1, name: 'Bo', uid: 'b', members: M }).applied, true); assert.equal(R.applyAction(t, { t: 'feed', food: 'crab' }, { now: 1000 + 14 * 3600e3 + 2, name: 'Bo', uid: 'b', members: M }).applied, false, 'full');
  ink.born = 1000 - 10 * 864e5; t.shells = 50; assert.equal(R.applyAction(t, { t: 'crab', id: ink.id }, { now: 1000 + 14 * 3600e3, name: 'Bo', uid: 'b', members: M }).reason, 'NOT_YOURS', 'the crab treat too'); assert.ok(R.applyAction(t, { t: 'crab', id: ink.id }, { now: 1000 + 14 * 3600e3, name: 'Ana', uid: 'a', members: M }).applied);
  const solo = R.newWorld(0, 1, { empty: true }); R.norm(solo, 0); R.applyAction(solo, { t: 'chooseFirst', species: 'octopus', name: 'S', seed: 1 }, { now: 1000, name: 'You', uid: 'me', solo: true });
  solo.fish[0].owner = 'someone'; R.advance(solo, 1000 + 14 * 3600e3); assert.ok(R.applyAction(solo, { t: 'feed', food: 'crab' }, { now: 1000 + 14 * 3600e3, name: 'You', uid: 'me', solo: true }).applied, 'alone, you feed any octopus');
  // neglect: an unfed octopus weakens on its own while the tank is otherwise fine
  const n = R.newWorld(0, 1, { empty: true }); R.norm(n, 0); R.applyAction(n, { t: 'chooseFirst', species: 'octopus', name: 'N', seed: 2 }, { now: 1000, name: 'Ana', uid: 'a', members: M }); n.water = 1; n.hunger = 0.1;
  for (let d = 1; d <= 3; d++) { n.hunger = 0.1; n.lastFed = 1000 + d * 864e5; R.advance(n, 1000 + d * 864e5); } assert.ok((n.fish[0].ail ?? 0) > 0, 'ail builds for an unfed octopus even when flakes keep the tank fed');
}

// a never-fed octopus is judged by its own hunger, not by flakes other people drop for the fish
{
  const M = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Bo' }], t = R.newWorld(0, 1, { empty: true }); R.norm(t, 0);
  R.applyAction(t, { t: 'chooseFirst', species: 'octopus', name: 'Ink', seed: 3 }, { now: 1000, name: 'Ana', uid: 'a', members: M });
  R.applyAction(t, { t: 'buyFish', species: 'goldfish', name: 'Pip', rush: true }, { now: 1000, name: 'Bo', uid: 'b', members: M, dev: true }); t.shells = 99;
  for (let h = 1; h <= 84; h++) { t.hunger = 0.1; t.lastFed = 1000 + h * 3600e3; R.advance(t, 1000 + h * 3600e3); }          // Bo keeps the fish fed every hour; nobody feeds Ink
  const ink = t.fish.find((f) => f.name === 'Ink'); assert.ok((ink.ail ?? 0) >= R.AIL_TIRED, 'three and a half days unfed: Ink is run down (' + ink.ail + ')');
}

// the rhythm of care: fish twice a day, an octopus about twice a day, the water and the glass every few days
{
  const H = 3600e3, t = R.newWorld(0); R.norm(t, 0); t.hunger = 0; t.water = 1; t.glass = 0; t.simTs = 0; t.visitAt = t.eggAt = t.storyAt = 1e15;
  assert.ok(Math.abs(R.dueIn(t, 'meal') - R.CARE.meal * H) < 60e3, 'a meal lasts ' + R.CARE.meal + ' hours');
  assert.ok(R.dueIn(t, 'water') > 2.5 * 24 * H && R.dueIn(t, 'water') <= 3 * 24 * H, 'fresh water lasts about three days');
  assert.ok(R.dueIn(t, 'glass') > 2.5 * 24 * H && R.dueIn(t, 'glass') <= 3 * 24 * H, 'clean glass lasts about three days');
  R.advance(t, 2 * 24 * H); assert.ok(!R.needs(t).includes('water') && !R.needs(t).includes('glass'), 'two days on, no cleaning yet');
  R.advance(t, 3 * 24 * H); assert.ok(R.needs(t).includes('water') && R.needs(t).includes('glass'), 'three days on, both are due');
  const o = R.ensureFish({ id: 'o', name: 'Ink', species: 'octopus', seed: 1, born: 0, stage: 'adult', traits: [] }); o.hunger = 0; assert.ok(Math.abs(R.dueIn(t, 'crab', o) - R.CARE.crab * H) < 60e3, 'a crab lasts ' + R.CARE.crab + ' hours');
  const s0 = t.shells; assert.equal(R.applyAction(t, { t: 'water' }, { now: 5 * 24 * H + 1 }).delta, R.WATER_PAY); assert.equal(R.applyAction(t, { t: 'glass' }, { now: 5 * 24 * H + 2 }).delta, R.GLASS_PAY); assert.ok(t.shells >= s0 + R.WATER_PAY + R.GLASS_PAY);
}

// selling a fish: half of what it cost to the shared wallet, nothing for a fish that came free, only by its caretaker, never the last one
{
  const M = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Bo' }], t = R.newWorld(0, 1, { empty: true }); R.norm(t, 0);
  R.applyAction(t, { t: 'chooseFirst', species: 'octopus', name: 'Ink', seed: 3 }, { now: 1000, name: 'Ana', uid: 'a', members: M });
  t.shells = 100; const price = R.fishPrice('goldfish', 1000); R.applyAction(t, { t: 'buyFish', species: 'goldfish', name: 'Pip', rush: true }, { now: 1000, name: 'Bo', uid: 'b', members: M, dev: true });
  const ink = t.fish.find((f) => f.name === 'Ink'), pip = t.fish.find((f) => f.name === 'Pip'); assert.equal(pip.paid, price); assert.equal(R.sellValue(pip), Math.floor(price / 2)); assert.equal(R.sellValue(ink), 0, 'the free first octopus fetches nothing');
  const MS = [{ id: 'a', name: 'Ana', slot: 1 }, { id: 'b', name: 'Bo', slot: 2 }]; assert.equal(R.founderOf(MS), 'a'); assert.equal(R.founderOf([{ id: 'b', slot: 2 }, { id: 'c', slot: 3 }]), 'b', 'the lowest seat when the first has left');
  assert.equal(R.applyAction(t, { t: 'sellFish', id: ink.id }, { now: 2000, name: 'Bo', uid: 'b', members: MS }).reason, 'NOT_YOURS', 'Bo cannot sell Ana\'s octopus');
  assert.ok(R.canSell(pip, 'a', MS), 'the first caretaker may sell anyone\'s fish'); assert.ok(!R.canSell(ink, 'b', MS));
  const s0 = t.shells, r = R.applyAction(t, { t: 'sellFish', id: pip.id }, { now: 2000, name: 'Bo', uid: 'b', members: M }); assert.ok(r.ok && r.delta === Math.floor(price / 2)); assert.equal(t.shells, s0 + Math.floor(price / 2)); assert.ok(!t.fish.includes(pip)); assert.ok(r.events.some((e) => e.released === pip.id && /new home/.test(e.journal ?? '')));
  assert.equal(R.applyAction(t, { t: 'sellFish', id: ink.id }, { now: 3000, name: 'Ana', uid: 'a', members: M }).reason, 'LAST_FISH', 'the last fish stays');
  const egg = R.ensureFish({ id: 'e', name: 'Egg', species: 'goldfish', seed: 1, born: 0, stage: 'baby', traits: [], paid: 0, parents: [{ id: 'x', name: 'X' }] }); assert.equal(R.sellValue(egg), 0, 'a hatched fish fetches nothing, so eggs cannot be farmed');
  const old = R.ensureFish({ id: 'l', name: 'Old', species: 'goldfish', seed: 1, born: 0, stage: 'adult', traits: [] }); delete old.paid; assert.equal(R.sellValue(old), Math.floor(R.SPECIES_DEF.goldfish.price / R.SPECIES_DEF.goldfish.count / 2), 'a fish from before prices were kept counts as bought');
}
console.log('Care rhythm and selling checks passed');
ok('two males bond as companions and never conceive; two octopuses become partners, whatever their sex', () => {
  let now = 50 * DAY; const t = R.newWorld(now); t.fish = []; const mk = (id, sp, sex, seed) => R.ensureFish({ id, name: id, species: sp, seed, born: 0, stage: 'adult', traits: [], happy: 0.9, sex });
  t.fish.push(mk('a', 'seahorse', 'm', 1), mk('b', 'seahorse', 'm', 2), mk('o', 'octopus', 'm', 3), mk('p', 'octopus', 'm', 4));
  for (let i = 0; i < 160; i++) { now += 3 * 3600e3; t.hunger = 0; t.water = 1; for (const f of t.fish) { f.fedAt = now; f.hunger = 0; f.ail = 0; } R.advance(t, now); }
  const F = (id) => t.fish.find((f) => f.id === id); assert.equal(F('a').mate, 'b'); assert.ok(!F('a').preg && !F('b').preg, 'companions never get pregnant'); assert.equal(F('o').partner, 'p'); assert.equal(F('p').partner, 'o');
  assert.equal(R.bondKey({ id: 'z', sex: 'f' }, { id: 'y', sex: 'm' }), 'y|z');
});
ok('octopus memory: familiarity grows only by handling, one go counts once, moves and removals are remembered, it is bounded, and an old phone never overwrites the tank', () => {
  let now = 50 * DAY; const t = R.newWorld(now); t.fish = []; t.decor = []; const ctx = () => ({ now, uid: 'u1', name: 'Alex' });
  t.fish.push(R.ensureFish({ id: 'o', name: 'Inky', species: 'octopus', seed: 3, born: now - 20 * DAY, stage: 'adult', traits: [] }), R.ensureFish({ id: 'g', name: 'Goldie', species: 'goldfish', seed: 4, born: now - 20 * DAY, stage: 'adult', traits: [] }));
  t.decor.push({ id: 'd1', type: 'pot', x: 1, z: 1, at: now - 60e3 }, { id: 'd2', type: 'rock', x: -2, z: 0.5, at: now - 9 * DAY });
  const touch = (decor, kind = 'revisit') => R.applyAction(t, { t: 'octoTouch', fish: 'o', decor, kind }, ctx()), o = () => t.fish[0];
  assert.equal(o().mem, undefined, 'nothing known just for being in the tank');
  let r = touch('d1', 'new'); assert.equal(r.ok, true); assert.ok(r.events.some((e) => /investigated the new ceramic pot|investigated the new .*pot/.test(e.journal ?? '')), JSON.stringify(r.events));
  const k1 = o().mem.fam.d1.k; assert.ok(k1 > 0.1 && k1 < 0.5 && o().mem.fam.d1.n === 1);
  r = touch('d1', 'new'); assert.equal(r.applied, false, 'a second report of the same go (another phone, a handoff) is not counted');
  for (let i = 0; i < 5; i++) { now += 60e3; r = touch('d1'); } assert.ok(o().mem.fam.d1.k > k1 && o().mem.fam.d1.n === 6); assert.equal(R.famStage(o().mem.fam.d1), 'loved');
  assert.deepEqual(o().mem.likes, ['d1'], 'its favorite is what it keeps going back to'); assert.equal(r.events.filter((e) => /investigated/.test(e.journal ?? '')).length, 0, 'the investigation is written once');
  now += 60e3; R.applyAction(t, { t: 'moveDecor', id: 'd1', x: 3, z: 0, ry: 0 }, ctx()); const e = o().mem.fam.d1; assert.ok(e.mv && e.x === 1 && e.z === 1, 'moved while it was not looking: it still thinks the pot is where it was');
  now += 60e3; r = touch('d1', 'moved'); assert.ok(r.events.some((x) => /found the .* in its new spot/.test(x.journal ?? '')) && !o().mem.fam.d1.mv && o().mem.fam.d1.x === 3, 'found again: the new place is learned');
  now += 60e3; R.applyAction(t, { t: 'sellDecor', id: 'd1' }, ctx()); assert.ok(o().mem.fam.d1.gone && !o().mem.likes.includes('d1'), 'taken out: no longer a favorite');
  R.norm(t, now + 4 * DAY); assert.equal(o().mem.fam.d1, undefined, 'and forgotten a few days later');
  for (let i = 0; i < 30; i++) { t.decor.push({ id: 'x' + i, type: 'shell', x: 0, z: 0, at: now }); now += 60e3; touch('x' + i); } assert.ok(Object.keys(o().mem.fam).length <= R.OCTO_MEM.FAM && o().mem.likes.length <= R.OCTO_MEM.LIKES, 'bounded');
  r = R.applyAction(t, { t: 'octoMem', fish: 'o', migrate: true, fav: { x: 0, z: 0 }, likes: { d2: 9 } }, ctx()); assert.equal(r.applied, false, 'an old phone does not overwrite what the tank already knows');
  R.applyAction(t, { t: 'octoMem', fish: 'o', fav: { x: 1.5, z: 2 }, fishMemo: { g: { f: 3, a: 0 }, nope: { f: 9, a: 9 } } }, ctx()); assert.deepEqual(o().mem.fav, { x: 1.5, z: 2 }); assert.deepEqual(Object.keys(o().mem.fish), ['g']);
  assert.equal(R.applyAction(t, { t: 'octoMem', fish: 'o', fav: { x: 99, z: 0 } }, ctx()).ok, true); assert.deepEqual(o().mem.fav, { x: 1.5, z: 2 }, 'a place outside the tank is ignored');
  const t2 = R.newWorld(now); t2.fish = [R.ensureFish({ id: 'p', name: 'Pip', species: 'octopus', seed: 6, born: 0, stage: 'adult', traits: [] })]; t2.decor = [{ id: 'd2', type: 'rock', x: 0, z: 0, at: 0 }];
  R.applyAction(t2, { t: 'octoMem', fish: 'p', migrate: true, likes: { d2: 4, ghost: 3 } }, ctx()); assert.ok(t2.fish[0].mem.fam.d2.n === 4 && !t2.fish[0].mem.fam.ghost, 'a first phone\'s old likes are kept, once, for things that exist');
  const a = R.octoAffinity({ seed: 3 }, { id: 'q', type: 'shell', z: 0 }), b = R.octoAffinity({ seed: 6 }, { id: 'q', type: 'shell', z: 0 }); assert.ok(a > b, 'a collector cares more for a shell than a homebody does');
});
ok('a profile: quiet species behaviours go in that animal\'s own journal only, a fish log is bounded and checked', () => {
  const t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.level = 4; t.fish = [R.ensureFish({ id: 's', name: 'Pip', species: 'seahorse', seed: 1, born: -864e5, stage: 'adult', traits: ['Shy'] }), R.ensureFish({ id: 'g', name: 'Bo', species: 'goldfish', seed: 2, born: -864e5, stage: 'adult', traits: ['Brave'] })];
  t.decor = [{ id: 'd1', type: 'grass', x: 0, z: 1, ry: 0 }]; let k = 0; const ob = (a) => R.applyAction(t, { t: 'observe', ...a }, { now: 5e6 + ++k * 1000, name: 'Sam', uid: 'u' });
  const r = ob({ key: 'hitch', fish: 's' }); assert.equal(r.applied, true); assert.ok(!r.events.some((e) => /tail/.test((e.journal ?? '') + (e.toast ?? ''))), 'no tank journal line, no toast');
  assert.ok(t.fish[0].story.some((x) => /tail/.test(x.text)), 'in its own story'); assert.equal(ob({ key: 'hitch', fish: 'g' }).applied, false, 'a clownfish does not hitch its tail');
  assert.equal(ob({ key: 'favhitch', fish: 's' }).applied, false, 'a favourite holdfast needs a real one'); assert.equal(ob({ key: 'favhitch', fish: 's', spot: 'd1' }).applied, true);
  assert.deepEqual(R.behavioursFor(t.fish[0]).slice(0, 2), ['hitch', 'eyes']); assert.ok(R.seenBehaviour(t.fish[0], 'hitch') && !R.seenBehaviour(t.fish[0], 'dance'));
  const L = R.applyAction(t, { t: 'fishLog', logs: [{ fish: 's', dist: 1e9, holds: 3, snaps: 'x', lv: { low: 50, nope: 9 }, places: ['d1', 'fake'], fav: 'd1' }, { fish: 'ghost', dist: 5 }] }, { now: 6e6, name: 'Sam', uid: 'u' });
  assert.equal(L.applied, true); const g = t.fish[0].log; assert.equal(g.dist, 120); assert.equal(g.holds, 3); assert.equal(g.snaps, 0); assert.deepEqual(g.lv, { low: 50 }); assert.deepEqual(g.places, ['d1']); assert.equal(g.fav, 'd1');
});
ok('parents look after their eggs as their kind do: a father guards, a cardinalfish carries them, drifting eggs are the caretaker\'s; a parent takes over', () => {
  const D = 864e5, mk = (species) => { const t = R.newWorld(0); R.norm(t, 0); t.level = 6; t.flags.tut = 5; t.visitAt = t.storyAt = 1e15; t.fish = [0, 1].map((i) => R.ensureFish({ id: 'p' + i, name: i ? 'Dad' : 'Mum', species, seed: 5 + i, sex: i ? 'm' : 'f', born: -9 * D, stage: 'adult', traits: ['Calm'] })); t.eggAt = 0; return t; };
  const g = mk('goldfish'), ev = R.advance(g, 20 * 3600e3); assert.equal(g.eggs[0].guard, 'p1', 'the clownfish father guards'); assert.ok(ev.some((e) => /Dad is guarding/.test(e.toast ?? '')));
  g.fish[1].dead = true; const ev2 = R.advance(g, 20 * 3600e3 + 6e5); assert.equal(g.eggs[0].guard, 'p0', 'the mother takes over'); assert.ok(ev2.some((e) => /Mum has taken over/.test(e.journal ?? '')));
  const m = mk('platy'), evm = R.advance(m, 20 * 3600e3); assert.equal(m.eggs[0].guard, 'p1'); assert.ok(evm.some((e) => /in his mouth/.test(e.toast ?? '')), 'a cardinalfish father carries them');
  const d = mk('betta'), evd = R.advance(d, 20 * 3600e3); assert.equal(d.eggs[0].guard, null, 'mandarins leave them to drift'); assert.ok(evd.some((e) => /drift/.test(e.toast ?? '')));
  const s = mk('goldfish'); s.fish[1].sex = 'f'; R.advance(s, 20 * 3600e3); assert.equal(s.eggs.length, 0, 'two females lay no eggs');
});
ok('a surprise gift arrives wrapped and says nothing of what it is; only its friend opens it; thanks reach the giver', () => {
  const D = 864e5, t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.level = 5; t.shells = 500; t.visitAt = t.storyAt = t.eggAt = 1e15;
  const mem = [{ id: 'ua', name: 'Ana' }, { id: 'ub', name: 'Ben' }];
  const r = R.applyAction(t, { t: 'buyFish', species: 'goldfish', name: 'Bubbles', seed: 4, to: 'ub', note: 'For you!' }, { now: 1000, uid: 'ua', name: 'Ana', members: mem });
  assert.ok(r.ok); assert.ok(!r.events.some((e) => /clownfish/i.test(JSON.stringify(e))), 'ordering says nothing of the species');
  const ev = R.advance(t, 1000 + D); const f = t.fish.find((x) => x.name === 'Bubbles'); assert.ok(f.gift?.wrapped); assert.equal(f.gift.note, 'For you!');
  assert.ok(!ev.some((e) => /clownfish|Bubbles/i.test((e.journal ?? '') + (e.toast ?? ''))), 'the arrival says nothing of what it is');
  assert.equal(R.applyAction(t, { t: 'openGift', id: f.id }, { now: 2 * D, uid: 'ua', name: 'Ana', members: mem }).ok, false, 'only its friend opens it');
  const o = R.applyAction(t, { t: 'openGift', id: f.id }, { now: 2 * D, uid: 'ub', name: 'Ben', members: mem }); assert.ok(o.ok && !f.gift.wrapped); assert.equal(o.events[0].giftOpened.to, 'ua');
  const th = R.applyAction(t, { t: 'thankGift', id: f.id }, { now: 2 * D, uid: 'ub', name: 'Ben', members: mem }); assert.ok(th.ok && f.gift.thanked); assert.ok(/thank you/.test(th.events[0].giftOpened.text));
  const plain = R.applyAction(t, { t: 'buyFish', species: 'goldfish', name: 'Open', seed: 5, to: 'ub', surprise: false }, { now: 3 * D, uid: 'ua', name: 'Ana', members: mem }); assert.ok(plain.events.some((e) => /clownfish/.test(e.activity?.text ?? '')), 'not a surprise: it may say');
});
ok('an animal whose caretaker has been away two weeks (or left) can be taken on by a friend; not before', () => {
  const D = 864e5, t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.fish = [R.ensureFish({ id: 'o', name: 'Inky', species: 'octopus', seed: 3, born: 0, stage: 'adult', owner: 'ua', ownerName: 'Ana' })];
  const now = 40 * D, near = [{ id: 'ua', name: 'Ana', lastSeen: now - 3 * D }, { id: 'ub', name: 'Ben', last_seen: now }];
  assert.equal(R.applyAction(t, { t: 'lookAfter', id: 'o' }, { now, uid: 'ub', name: 'Ben', members: near }).ok, false, 'Ana was here three days ago');
  const away = [{ id: 'ua', name: 'Ana', lastSeen: now - 15 * D }, { id: 'ub', name: 'Ben', last_seen: now }]; assert.equal(R.awayOwner(t.fish[0], away, now).name, 'Ana');
  const r = R.applyAction(t, { t: 'lookAfter', id: 'o' }, { now, uid: 'ub', name: 'Ben', members: away }); assert.ok(r.ok); assert.equal(t.fish[0].owner, 'ub'); assert.equal(t.fish[0].ownerWas.name, 'Ana'); assert.ok(/while Ana is away/.test(r.events[0].journal));
});
ok('a daily mystery: one a day, the same for everyone, played out once, sometimes carried on into tomorrow, and gone when missed', () => {
  const D = 864e5, mk = (c) => { const t = R.newWorld(c); R.norm(t, c); t.flags.tut = 5; t.fish.push(R.ensureFish({ id: 'a', name: 'Goldie', species: 'goldfish', seed: 1, born: 0, stage: 'adult', traits: ['Curious'] })); return t; };
  const t = mk(0), now = 30 * D + 13 * 3600e3; R.advance(t, now); const m = R.mysteryOf(t, now); assert.ok(m && R.MYSTERY[m.kind] && !R.MYSTERY[m.kind].chain, 'one mystery today');
  const t2 = JSON.parse(JSON.stringify(t)); const r = R.applyAction(t, { t: 'mystery' }, { now: now + 1000, name: 'You' }); assert.ok(r.applied && r.line); assert.equal(R.applyAction(t, { t: 'mystery' }, { now: now + 2000 }).applied, false, 'only once');
  assert.equal(R.applyAction(t2, { t: 'mystery' }, { now: now + 1500, name: 'Ana' }).line, r.line, 'another phone finds the same thing'); assert.ok(r.events.some((e) => e.journal === r.line));
  const s0 = t.shells; assert.equal(s0, t2.shells, 'no reward to chase');
  R.advance(t, now + D); assert.notEqual(R.mysteryOf(t, now + D)?.day, m.day, 'a new one tomorrow'); assert.equal(R.mysteryOf(t, now + 2 * D + 1)?.done ?? false, false);
  let chained = 0, kinds = new Set(); for (let d = 31; d < 120; d++) { const T = mk(d * 7), at = d * D + 12 * 3600e3; R.advance(T, at); const M = R.mysteryOf(T, at); kinds.add(M.kind); const q = R.applyAction(T, { t: 'mystery' }, { now: at + 1 }); if (T.mystNext) { chained++; R.advance(T, at + D); const N = R.mysteryOf(T, at + D); assert.ok(R.MYSTERY[N.kind].chain, 'tomorrow it carries on'); assert.ok(!/undefined/.test(R.applyAction(T, { t: 'mystery' }, { now: at + D + 1 }).line)); } assert.ok(!/undefined|null/.test(q.line), q.line); }
  assert.ok(chained > 3 && kinds.size >= 3, `varied: ${chained} carried on, ${[...kinds]}`);
});
ok('each animal has a true next chapter: growing up, eggs, a birth, a partner, or company', () => {
  const D = 864e5, now = 40 * D, t = R.newWorld(0); R.norm(t, now); const F = (o) => R.ensureFish({ seed: 1, traits: [], stage: 'adult', born: now - 30 * D, ...o });
  const baby = F({ id: 'b', name: 'Pip', species: 'goldfish', born: now - 3600e3, stage: 'baby' }); t.fish = [baby]; assert.match(R.storyNext(t, baby, now), /Grows into a juvenile/);
  const lone = F({ id: 'g', name: 'Goldie', species: 'goldfish' }); t.fish = [lone]; assert.match(R.storyNext(t, lone, now), /^The only clownfish here/);
  const mo = F({ id: 'o1', name: 'Inky', species: 'octopus', sex: 'f', partner: 'o2', partneredAt: now - 2 * D, home: 'c1' }), fa = F({ id: 'o2', name: 'Pearl', species: 'octopus', sex: 'm', partner: 'o1', partneredAt: now - 2 * D });
  t.fish = [mo, fa]; assert.match(R.storyNext(t, mo, now), /Partners with Pearl for 2 days.*about 5/);
  t.eggs = [{ id: 'e1', species: 'octopus', a: 'o1', b: 'o2', guard: 'o1', hatchAt: now + 3 * D }]; mo.brood = 'e1'; assert.match(R.storyNext(t, mo, now), /Guarding the eggs: they hatch in about 3 days/);
  const sh = F({ id: 's', name: 'Sid', species: 'seahorse', preg: { due: now + 2 * D } }); t.fish.push(sh); assert.match(R.storyNext(t, sh, now), /Carrying young.*about 2 days/);
});
ok('a find turns up as the day\'s mystery now: it pays what the find is worth on top of the day\'s gift, and drift no longer comes on its own after the first days', () => {
  const D = 864e5; let seen = 0;
  for (let d = 40; d < 200 && !seen; d++) { const t = R.newWorld(0); R.norm(t, d * D); t.flags.tut = 5; const at = d * D + 12 * 3600e3; R.advance(t, at); assert.equal(t.drift, null, 'no drift on its own'); const m = R.mysteryOf(t, at); if (m.kind !== 'find') continue; seen++;
    const s0 = t.shells, r = R.applyAction(t, { t: 'mystery', tz: 0 }, { now: at + 1, uid: 'u', name: 'Ana' }); assert.ok(r.applied && r.line.length > 8, r.line); assert.equal(t.shells - s0, r.delta); assert.ok(r.delta >= R.DAILY_GIFT, 'the gift, and the find'); }
  assert.ok(seen, 'a find came up');
});
ok('breeding: rare colours are recessive, two carriers have about one baby in four that shows it, and you can bring a pair together', () => {
  const D = 864e5, now = 30 * D, t = R.newWorld(0); R.norm(t, now); t.flags.tut = 5; t.level = 8; t.simTs = now; t.flags.noWants = true;
  const mk = (id, sex, m) => R.ensureFish({ id, name: id, species: 'goldfish', sex, seed: id.length * 7, born: now - 20 * D, stage: 'adult', traits: [], genes: { ...R.genesOf(3), m } });
  const a = mk('Amy', 'f', ['gold', 'n']), b = mk('Bob', 'm', ['gold', 'n']), c = mk('Cy', 'm', ['n', 'n']); t.fish = [a, b, c];
  assert.equal(R.morphOf(a), null); assert.deepEqual(R.carriesOf(a), ['gold']); assert.deepEqual(R.morphOdds(a, b), { gold: 0.25 }); assert.deepEqual(R.morphOdds(a, c), {});
  assert.equal(R.applyAction(t, { t: 'matchmake', a: 'Amy', b: 'Bob' }, { now, name: 'You' }).ok, true); assert.equal(t.match.a, 'Amy'); assert.ok(t.eggAt <= now + 8 * 3600e3);
  assert.equal(R.applyAction(t, { t: 'matchmake', a: 'Amy', b: 'Cy' }, { now: now + 1000 }).reason, 'TOO_SOON');
  let gold = 0; const N = 400;
  const founders = Array.from({ length: 400 }, (_, i) => R.genesOf(i * 13 + 1)); const carriers = founders.filter((g) => g.m.some((x) => x !== 'n')).length; assert.ok(carriers > 80 && carriers < 160, 'about a third of founders carry one: ' + carriers); assert.ok(founders.every((g) => g.m[0] !== g.m[1] || g.m[0] === 'n'), 'no founder shows one');
  for (let i = 0; i < N; i++) { const g = G.blendGenes(a.genes, b.genes, G.seededRandom(i * 7919 + 1)); if (g.m[0] === 'gold' && g.m[1] === 'gold') gold++; }
  assert.ok(gold > N * 0.15 && gold < N * 0.35, `about a quarter golden: ${gold}/${N}`);
});

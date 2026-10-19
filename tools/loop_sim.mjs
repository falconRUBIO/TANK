// The whole loop, played by a simulated caretaker through the real rules: it opens the tank a few times a day, looks after everyone, solves
// the mystery, makes the decisions, chooses goals and works on them (pairs carriers, watches hatchings, plays with the young), and buys new
// fish and decorations as the shells allow. It reports the day each milestone first happens, so pacing can be tuned to real numbers.
//   node tools/loop_sim.mjs [days=60] [runs=6] [visitsPerDay=3]
import * as R from '../web/src/game/rules.js';
const DAYS = +(process.argv[2] || 60), RUNS = +(process.argv[3] || 6), VISITS = +(process.argv[4] || 3), H = 3600e3, DAY = 864e5;
const gapsOf = (v) => (v === 1 ? [19] : v === 2 ? [8, 19] : v === 3 ? [8, 13, 20] : [8, 11, 14, 18, 21]);
function run(seed) {
  const t0 = seed * 7 * DAY, t = R.newWorld(t0, seed + 2); R.norm(t, t0); t.flags.tut = 5; t.tzMin = 0; for (const f of t.fish) { f.born = t0 - (R.ADULT_DAYS - 2) * DAY; f.arrived = t0; f.stage = 'juvenile'; }      // (as from the shop: a real tank starts with a baby octopus and buys its first fish nearly grown)
  t.fish.push(R.ensureFish({ id: 'oct', name: 'Ink', species: 'octopus', seed: seed * 13 + 3, born: t0, stage: 'baby', traits: ['Curious'], owner: 'sim', ownerName: 'Sim' }));
  const M = {}, mark = (k, now) => { M[k] ??= +((now - t0) / DAY).toFixed(1); }, goals = [], counts = { mystery: 0, decisions: 0, shellsIn: 0, shellsOut: 0 };
  let now = t0; const act = (a) => R.applyAction(t, a, { now, name: 'Sim', uid: 'sim' });
  for (let day = 0; day < DAYS; day++) for (const hr of gapsOf(VISITS)) {
    now = t0 + day * DAY + hr * H + ((day * 7919 + seed * 31) % 37) * 60e3; const s0 = t.shells;
    const ev = R.advance(t, now);
    // what the tank asks for, first
    const m = R.mysteryOf(t, now); if (m && !m.done) { act({ t: 'mystery', tz: 0 }); counts.mystery++; mark('first mystery', now); }
    if (t.dilemma && !t.dilemma.done) { const o = t.dilemma.opts[(day + hr) % t.dilemma.opts.length]; const r = act({ t: 'decide', id: t.dilemma.id, k: o.k }); if (r.ok && r.applied) { counts.decisions++; mark('first decision', now); } }
    if (!t.goal && (t.goalOffer ?? []).length) { const pref = t.goalOffer[(t.goalsDone ?? []).length % t.goalOffer.length]; /* (a player picks differently each time) */ act({ t: 'pickGoal', id: pref }); mark('first goal chosen', now); }
    // care
    if (t.hunger > 0.3) act({ t: 'feed' }); for (const f of t.fish.filter((x) => !x.dead && x.species === 'octopus' && R.octoHunger(x) > R.OCTO_DUE)) act({ t: 'feed', food: 'crab', fish: f.id });
    for (const f of t.fish.filter((x) => !x.dead && x.species === 'seahorse' && R.ownHunger(x) > 0.4)) act({ t: 'feed', food: 'mysis', fish: f.id });
    if (t.water < 0.7) act({ t: 'water' }); if (t.glass > 0.3) act({ t: 'glass' });
    // eggs and babies
    for (const e of t.eggs ?? []) if (e.ready) act({ t: 'watchEggs', id: e.id }); if (t.fryOffer) act({ t: 'keepFry', id: t.fryOffer.id, keep: t.fish.length < R.capacity(t.level) });
    if (t.nursery && now >= t.nursery.readyAt) act({ t: 'keepBaby', nursery: t.nursery.id, id: t.nursery.cands[0]?.id });
    const young = t.fish.filter((f) => !f.dead && R.stageOf(f, now) !== 'adult'); for (const f of young) { act({ t: 'pet', id: f.id }); } if (young.length && hr === gapsOf(VISITS)[1]) act({ t: 'play', toy: 'ball', fish: young.map((f) => f.id) });
    // breeding: bring the best pair together, once a day
    const adults = t.fish.filter((f) => !f.dead && !f.away && R.stageOf(f, now) === 'adult' && f.species !== 'seahorse');
    let best = null; for (const a of adults) for (const b of adults) if (a.id < b.id && a.species === b.species && (R.isOcto(a) ? !a.partner && !b.partner : R.sexOf(a) !== R.sexOf(b))) { const o = Object.values(R.morphOdds(a, b)).reduce((x, y) => x + y, 0); if (!best || o > best.o) best = { a, b, o }; }
    if (best && hr === gapsOf(VISITS)[0]) { const r = act({ t: 'matchmake', a: best.a.id, b: best.b.id }); if (r.ok) mark('first pairing', now); }
    // layout: two plants together and a den each, once there is something to buy them with
    // spending: a den for the octopus, a second of a kind for a pair, a new kind, plants
    for (let g = 0; g < 4; g++) {
      const room = (sp) => t.fish.length + R.pending(t) + (R.SPECIES_DEF[sp]?.count ?? 1) <= R.capacity(t.level);
      const kinds = {}; for (const f of t.fish.filter((x) => !x.dead)) kinds[f.species] = (kinds[f.species] ?? 0) + 1;
      const dens = t.decor.filter((d) => ['coconut', 'pot'].includes(d.type)).length, octos = t.fish.filter((f) => !f.dead && R.isOcto(f)).length, plants = t.decor.filter((d) => R.DECOR_DEF[d.type]?.cat === 'PLANTS').length;
      const single = Object.entries(kinds).find(([k, n]) => n === 1 && !R.isOcto({ species: k }) && R.SPECIES_DEF[k]?.count === 1 && room(k) && t.shells >= R.fishPrice(k, now, t));
      const fresh = Object.entries(R.SPECIES_DEF).filter(([k, d]) => !d.visitor && d.count === 1 && k !== 'octopus' && !kinds[k] && d.level <= t.level && room(k)).sort((a, b) => a[1].price - b[1].price)[0];
      const SP = R.specialOf(t, now), sp = SP.species, want = t.goal && (R.MORPHS[t.goal.id] ? SP.color === t.goal.id : t.goal.id === 'rare'), mates = t.fish.filter((f) => !f.dead && f.species === sp).length;      // a player working on a color buys today's special when it carries what they need
      let r = null;
      if (want && sp !== 'octopus' && R.SPECIES_DEF[sp].count === 1 && R.SPECIES_DEF[sp].level <= t.level && room(sp) && t.shells >= R.specialPrice(sp) && !(t.flags.simSpecial === Math.floor(now / DAY))) { t.flags.simSpecial = Math.floor(now / DAY); const one = t.fish.find((f) => !f.dead && f.species === sp && R.allelesOf(f).includes(SP.color)); r = act({ t: 'buyFish', species: sp, name: 'Special', special: true, seed: now % 9973, ...(one ? { sex: R.sexOf(one) === 'm' ? 'f' : 'm' } : {}) }); if (r.ok) continue; }
      if (dens < octos && R.DECOR_DEF.coconut.level <= t.level && t.shells >= R.DECOR_DEF.coconut.price) r = act({ t: 'buyDecor', type: 'coconut', x: 2 + dens, z: 1.5, ry: 0 });
      else if (plants < 2 && R.DECOR_DEF.grass.level <= t.level && t.shells >= R.DECOR_DEF.grass.price) r = act({ t: 'buyDecor', type: 'grass', x: -2 + plants * 0.8, z: 1, ry: 0 });
      else if (single) { const one = t.fish.find((f) => !f.dead && f.species === single[0]); r = act({ t: 'buyFish', species: single[0], name: single[0] + '2', seed: now % 9973, sex: R.sexOf(one) === 'm' ? 'f' : 'm' }); }
      else if (fresh && t.shells >= R.fishPrice(fresh[0], now, t)) r = act({ t: 'buyFish', species: fresh[0], name: fresh[0], seed: now % 9973 });
      if (!r?.ok) break;
    }
    // a full tank lays no eggs: a player working on babies finds a shop fish a new home
    if (t.fish.length + R.pending(t) >= R.capacity(t.level) + 1 && hr === gapsOf(VISITS)[2]) { const o = t.fish.find((f) => !f.dead && !R.isOcto(f) && !(f.parents?.length) && !R.allelesOf(f).some((x) => R.MORPHS[x]) && f.id !== t.match?.a && f.id !== t.match?.b); if (o) { const r = act({ t: 'sellFish', id: o.id }); if (r.ok) counts.rehomed = (counts.rehomed ?? 0) + 1; } }
    // milestones
    if ((t.eggs ?? []).length) mark('first eggs', now); const bred = t.fish.filter((f) => f.parents?.length || f.bornHere);
    if (bred.length) mark('first baby', now); if (bred.some((f) => R.stageOf(f, now) === 'adult')) mark('first baby grown', now); if (bred.some((f) => (f.gen ?? 0) >= 2)) mark('second generation', now);
    if (Object.keys(t.morphs ?? {}).length) mark('first rare color', now); if (t.fish.some((f) => f.raisedAs)) mark('first raised temperament', now);
    if (t.fish.some((f) => R.isOcto(f) && f.partner)) mark('octopus partners', now);
    for (const d of t.goalsDone ?? []) if (!goals.some((g) => g.id === d.id && g.at === d.at)) goals.push({ id: d.id, at: d.at, day: +((d.at - t0) / DAY).toFixed(1) });
    for (const lv of [2, 3, 4, 5, 6]) if (t.level >= lv) mark('level ' + lv, now);
    const dS = t.shells - s0; if (dS > 0) counts.shellsIn += dS; else counts.shellsOut -= dS;
  }
  return { M, goals, counts, stuck: t.goal ? { id: t.goal.id, since: +((t.goal.at - t0) / DAY).toFixed(1), steps: R.goalOf(t).steps.map((x) => (x.done ? '✓' : x.have + '/' + x.need)).join(' ') } : null, end: { level: t.level, fish: t.fish.filter((f) => !f.dead).length, shells: t.shells, field: Object.keys(t.field ?? {}).length } };
}
const res = Array.from({ length: RUNS }, (_, i) => run(i + 1)), keys = [...new Set(res.flatMap((r) => Object.keys(r.M)))];
const med = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
console.log(`${RUNS} runs, ${DAYS} days, ${VISITS} visits a day. Median day of each milestone (and in how many runs it happened):`);
for (const k of keys.sort((a, b) => (med(res.map((r) => r.M[a])) ?? 999) - (med(res.map((r) => r.M[b])) ?? 999))) { const v = res.map((r) => r.M[k]); console.log(`  ${k.padEnd(26)} day ${String(med(v)).padStart(5)}   (${v.filter((x) => x != null).length}/${RUNS})`); }
const gd = res.flatMap((r) => r.goals.map((g, i) => ({ ...g, n: i }))); console.log(`Goals finished per run: ${res.map((r) => r.goals.length).join(', ')}; days between goals (median): ${med(res.flatMap((r) => r.goals.map((g, i) => g.day - (i ? r.goals[i - 1].day : 0))))}`);
const byId = {}; for (const g of gd) (byId[g.id] ||= []).push(g.day); console.log('Goal finish days by goal:', Object.entries(byId).map(([k, v]) => `${k} ${v.join('/')}`).join(' · '));
console.log(`Per day: shells in ${(med(res.map((r) => r.counts.shellsIn)) / DAYS).toFixed(1)}, out ${(med(res.map((r) => r.counts.shellsOut)) / DAYS).toFixed(1)}; decisions ${med(res.map((r) => r.counts.decisions))} in ${DAYS} days; mysteries ${med(res.map((r) => r.counts.mystery))}`);
console.log('End:', JSON.stringify(res.map((r) => r.end))); console.log('Goal in progress at the end:', res.map((r) => JSON.stringify(r.stuck)).join(' | '));

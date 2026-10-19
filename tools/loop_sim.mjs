// The loop, played through the real rules by a simulated household: one to four caretakers, each with their own habits, from the real
// opening (an empty tank, a first octopus each, the tutorial) for up to 120 days. Every change to the wallet is booked as its own entry
// (source or sink, amount, when, who, what, balance before and after), so earnings and spending are measured, never inferred.
//
//   node tools/loop_sim.mjs                          the full table: 1, 2 and 4 caretakers × five habits, 120 days, 6 seeds
//   node tools/loop_sim.mjs --crew 2 --profile regular --days 60 --seeds 8 [--json]
//
// What it cannot know: how often a person happens to see an animal do something remarkable while watching (that is the phone's animation,
// not the rules). Field Guide pages are filled at assumed rates per minute watched (FIELD_RATE below), by rarity. Treat those numbers as a
// stand-in. Nothing here predicts retention; it shows what the rules allow a household with these habits to reach, and when.
import * as R from '../web/src/game/rules.js';
const H = 3600e3, DAY = 864e5, MIN = 60e3;
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; }, JSON_OUT = process.argv.includes('--json');

// ── habits ── visits a day (a chance per slot), minutes watched per visit, how much they play with the young, how they shop
const PROFILES = {
  casual: { slots: [[19, 0.75]], watch: 2, play: 0.25, notice: 0.7, save: 0.5 },
  regular: { slots: [[8, 0.6], [19, 0.9]], watch: 3, play: 0.5, notice: 0.9, save: 0.6 },
  engaged: { slots: [[8, 0.95], [13, 0.85], [20, 0.95]], watch: 5, play: 0.9, notice: 1, save: 0.7 },
};
const HOUSE = { casual: ['casual'], regular: ['regular'], engaged: ['engaged'], mixed: ['engaged', 'casual', 'regular', 'casual'], returning: ['regular'] };
// Field Guide pages, by how often a watcher catches them (per minute watched, when the animal for it lives in the tank); an assumption
const FIELD_RATE = { glass: 0.02, camo: 0.012, ink: 0.006, squirt: 0.004, bury: 0.006, flat: 0.003, kelp: 0.003, lion: 0.002, jelly: 0.002, snake: 0.0015, fish: 0.002, smack: 0.004, arms: 0.003, ball: 0.004, eggchase: 0.01, chased: 0.004 };

const M_KEYS = ['first fish bought', 'first Field Guide page', 'first mystery', 'first decision', 'first pairing', 'first eggs', 'first hatching', 'first adult raised', 'first raised temperament', 'first octopus adventure', 'first rare color', 'first goal done', 'second generation adult', 'level 2', 'level 3', 'level 4', 'level 5', 'level 6', 'level 7', 'level 8'];
function rng(seed) { let x = seed * 2654435761 >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

function run({ crew, profile, days, seed }) {
  const rand = rng(seed * 97 + crew * 13 + profile.length), t0 = (100 + seed) * 7 * DAY + 6 * H, t = R.newWorld(t0, seed + 2, { empty: true }); R.norm(t, t0); t.tzMin = 0;
  const kinds = HOUSE[profile], people = Array.from({ length: crew }, (_, i) => ({ uid: 'u' + i, name: ['Ana', 'Ben', 'Cy', 'Dee'][i], ...PROFILES[kinds[i % kinds.length]], kind: kinds[i % kinds.length] }));
  const members = crew > 1 ? people.map((p, i) => ({ id: p.uid, name: p.name, slot: i })) : null;
  const ledger = [], M = {}, snaps = {}, count = { toasts: 0, journal: 0, neglect: 0, deaths: 0, decisions: 0, mysteries: 0, goalFails: 0 };
  let now = t0; const day = () => (now - t0) / DAY, mark = (k) => { M[k] ??= +day().toFixed(1); };
  const book = (who, what, fn) => { const before = t.shells, r = fn(), after = t.shells; if (after !== before) ledger.push({ at: +day().toFixed(2), who, what, amount: after - before, before, after }); tally(r?.events); return r; };
  const tally = (ev) => { for (const e of ev ?? []) { if (e.toast) count.toasts++; if (e.journal) count.journal++; } };
  const act = (p, a) => book(p.uid, a.t + (a.food ? ':' + a.food : '') + (a.species ? ':' + a.species : '') + (a.type ? ':' + a.type : ''), () => R.applyAction(t, a, { now, uid: p.uid, name: p.name, members, solo: crew === 1 }));
  // ── the real opening: the first caretaker chooses and names an octopus; each friend who joins gets their own; the tutorial runs its steps
  act(people[0], { t: 'chooseFirst', species: 'octopus', name: 'Inky', seed: seed * 7 + 1, pal: seed % 6 });
  for (const p of people.slice(1)) act(p, { t: 'firstFish', name: p.name + "'s octopus", seed: seed * 7 + p.uid.length * 31 + people.indexOf(p) * 101, pal: people.indexOf(p) });
  for (let s = 1; s <= 5; s++) act(people[0], { t: 'tut', step: s });
  const away = profile === 'returning' ? [12, 18] : null;
  for (let d = 0; d < days; d++) {
    const visits = []; for (const p of people) for (const [hr, pr] of p.slots) if (rand() < pr && !(away && d >= away[0] && d < away[1])) visits.push({ p, at: t0 + d * DAY + (hr - 6) * H + Math.floor(rand() * 50) * MIN });
    visits.sort((a, b) => a.at - b.at);
    for (const { p, at } of visits) { now = at; book('world', 'time passing', () => ({ events: R.advance(t, now) })); visit(p); readTank(); }
    now = t0 + (d + 1) * DAY - MIN; book('world', 'time passing', () => ({ events: R.advance(t, now) })); readTank();
    for (const f of t.fish) { if (!f.dead && (f.ail ?? 0) >= R.AIL_WARN && !f._warned) { f._warned = true; count.neglect++; } if ((f.ail ?? 0) < R.AIL_TIRED) f._warned = false; }
    count.deaths = t.fish.filter((f) => f.dead).length + (t.memorial?.length ?? 0);
    for (const k of [7, 30, 60, 120]) if (d + 1 === k) snaps[k] = snap();
    if (process.env.DBG && t.goal?.id === 'octo' && d % 5 === 0) { const os = t.fish.filter((f) => R.isOcto(f) && !f.dead); console.log(d, JSON.stringify(os.map((f) => [f.id, R.sexOf(f), f.partner ?? '-', f.home ?? '-', R.ownHunger(f).toFixed(2), (f.health ?? 1).toFixed(2), f.away ? 'away' : '', f.broodAt ? ((f.broodAt - t0) / DAY).toFixed(0) : '', f.puzzle ? 'pz' : '', f.seek ? 'sk' : ''])), 'full', t.fish.length + R.pending(t) + (t.eggs ?? []).length, '/', R.capacity(t.level) + R.BIRTH_ROOM, 'eggs', (t.eggs ?? []).map((e) => e.species).join()); }
  }
  function visit(p) {
    const live = () => t.fish.filter((f) => !f.dead && !f.away), mine = (f) => !members || !f.owner || f.owner === p.uid;
    // what is there to notice
    const m = R.mysteryOf(t, now); if (m && !m.done && rand() < p.notice) { const r = act(p, { t: 'mystery', tz: 0 }); if (r.ok && r.applied) { count.mysteries++; mark('first mystery'); } }
    const D = t.dilemma; if (D && !D.done && (!D.turn || D.turn.uid === p.uid || now > D.turn.until) && rand() < p.notice) { const r = act(p, { t: 'decide', id: D.id, k: D.opts[Math.floor(rand() * D.opts.length)].k }); if (r.ok && r.applied) { count.decisions++; mark('first decision'); } }
    if (!t.goal && (t.goalOffer ?? []).length) { const g = t.goalOffer[Math.floor(rand() * t.goalOffer.length)]; if (act(p, { t: 'pickGoal', id: g }).ok) mark('first goal chosen'); }
    // care
    if (t.hunger > 0.3) act(p, { t: 'feed' });
    for (const f of live().filter((x) => R.ownFood(x) && mine(x) && R.ownHunger(x) >= R.OCTO_DUE)) act(p, { t: 'feed', food: R.ownFood(f), fish: f.id });
    if (t.water < 0.7) act(p, { t: 'water' }); if (t.glass > 0.3) act(p, { t: 'glass' });
    for (const e of t.eggs ?? []) if (e.ready) act(p, { t: 'watchEggs', id: e.id });
    if (t.fryOffer) act(p, { t: 'keepFry', id: t.fryOffer.id, keep: rand() < 0.7 }); if (t.nursery && now >= t.nursery.readyAt) act(p, { t: 'keepBaby', nursery: t.nursery.id, id: t.nursery.cands?.[0]?.id });
    // the young: a pet or a game now and then, a puzzle sometimes (not every visit)
    const young = live().filter((f) => R.stageOf(f, now) !== 'adult'); if (young.length && rand() < p.play) { const r = rand(); if (r < 0.4) act(p, { t: 'pet', id: young[0].id }); else { const toys = R.toysOpen(t); act(p, { t: 'play', toy: toys[Math.floor(rand() * toys.length)] ?? 'ball', fish: young.map((f) => f.id) }); } }
    // watching: a page of the Field Guide, sometimes (see FIELD_RATE)
    const has = (w) => live().some((f) => (w === 'any' ? true : w === 'fish' ? !R.isOcto(f) && f.species !== 'seahorse' : f.species === w));
    for (const [id, rate] of Object.entries(FIELD_RATE)) if (!t.field?.[id] && R.FIELD[id] && has(R.FIELD[id].who) && rand() < rate * p.watch) { (t.field ||= {})[id] = { at: now, fish: null, name: null, by: p.name, text: null }; mark('first Field Guide page'); }
    // breeding: the goal says what; otherwise a pair of the same kind now and then
    if (rand() < 0.5) { const ad = live().filter((f) => R.stageOf(f, now) === 'adult' && f.species !== 'seahorse' && mine(f)); let best = null;
      const gc = t.goal && R.MORPHS[t.goal.id] ? t.goal.id : null;      /* (working on a color: the pair for that color, as the goal's hint says) */
      for (const a of ad) for (const b of ad) if (a.id < b.id && a.species === b.species && (R.isOcto(a) ? !a.partner && !b.partner : R.sexOf(a) !== R.sexOf(b))) { const od = R.morphOdds(a, b), o = (gc ? (od[gc] ?? 0) * 10 : 0) + Object.values(od).reduce((x, y) => x + y, 0) + rand() * 0.01; if (!best || o > best.o) best = { a, b, o }; }
      if (best && act(p, { t: 'matchmake', a: best.a.id, b: best.b.id }).ok) mark('first pairing'); }
    // what a watching phone reports: an octopus going up to test the lid (main.js: every 30 s of watching, a chance by its nature)
    { const NAT = { explorer: 1, trickster: 1, showoff: 0.6, watcher: 0.35, collector: 0.3, homebody: 0.1 }; for (const f of live().filter((x) => R.isOcto(x) && R.stageOf(x, now) !== 'baby' && !x.brood)) { const w = (NAT[R.octoMind(f).type] ?? 0.3) * (0.5 + R.octoMind(f).cur), kept = (t.adv?.lidUntil ?? 0) > now, pr = 1 - Math.pow(1 - (t.omen?.kind === 'lid' ? 0.35 : 0.035 * w * (kept ? 0.2 : 1)), p.watch * 2); if (rand() < pr) act(p, { t: 'octoLid', fish: f.id }); } }
    // what a watching phone reports: a grown octopus with no den of its own carries a free one off and moves in
    for (const f of live().filter((x) => R.isOcto(x) && !x.home && R.stageOf(x, now) !== 'baby')) { const den = t.decor.find((d) => ['coconut', 'pot'].includes(d.type) && !t.fish.some((o) => !o.dead && o.home === d.id)); if (den) act(p, { t: 'octoMove', fish: f.id, id: den.id, x: den.x + 0.3, z: den.z, home: true }); }
    // following the goal's hints, as a player does: the temperament still missing, room for a carrier
    if (t.goal?.id === 'raise') { const y = live().find((f) => R.stageOf(f, now) !== 'adult' && !R.isOcto(f)); if (y && rand() < p.play + 0.3) { const done = new Set(t.fish.filter((f) => f.raisedAs).map((f) => f.raisedAs)), want = ['Brave', 'Playful', 'Curious'].find((x) => !done.has(x)) ?? 'Brave', need = want; if (/Brave/.test(need)) act(p, { t: 'pet', id: y.id }); else if (/Playful/.test(need)) act(p, { t: 'play', toy: 'ball', fish: [y.id] }); else if (/Curious/.test(need)) { const toy = R.toysOpen(t).find((k) => k !== 'ball'); act(p, toy ? { t: 'play', toy, fish: [y.id] } : { t: 'play', toy: 'ball', fish: [y.id] }); } } }
    if (t.goal && (/Your tank is full/.test(R.goalOf(t)?.next?.hint ?? '') || ((R.MORPHS[t.goal.id] || t.goal.id === 'rare') && t.fish.length + R.pending(t) >= R.capacity(t.level))) && rand() < 0.5) { const ok = (f) => !R.isOcto(f) && f.species !== 'seahorse' && !f.preg && R.stageOf(f, now) === 'adult' && !R.allelesOf(f).some((x) => R.MORPHS[x]) && ![t.match?.a, t.match?.b].includes(f.id) && R.canSell(f, p.uid, members), o = live().find((f) => ok(f) && !(f.parents?.length || f.bornHere)) ?? live().find(ok); if (o && act(p, { t: 'sellFish', id: o.id }).ok) count.rehomed = (count.rehomed ?? 0) + 1; }      /* (a shop fish first, else a grown baby: a player would send that one to a friend) */
    shop(p);
  }
  function shop(p) {
    const lv = t.level, room = (sp) => t.fish.length + R.pending(t) + (R.SPECIES_DEF[sp]?.count ?? 1) <= R.capacity(lv), kindsOf = {}; for (const f of t.fish.filter((x) => !x.dead)) kindsOf[f.species] = (kindsOf[f.species] ?? 0) + 1;
    const dens = t.decor.filter((d) => ['coconut', 'pot'].includes(d.type)).length, octos = t.fish.filter((f) => !f.dead && R.isOcto(f)).length, plants = t.decor.filter((d) => R.DECOR_DEF[d.type]?.cat === 'PLANTS').length;
    const buyD = (type) => { const r = act(p, { t: 'buyDecor', type, x: -3 + rand() * 6, z: -1 + rand() * 3, ry: 0 }); if (r.ok) { mark('first decoration bought'); M['bought ' + type] ??= +day().toFixed(1); } return r.ok; };
    const buyF = (sp, extra = {}) => { const r = act(p, { t: 'buyFish', species: sp, name: sp, seed: Math.floor(rand() * 9973), ...extra }); if (r.ok) mark('first fish bought'); return r.ok; };
    if (!t.fish.some((f) => !f.dead && !R.isOcto(f)) && !R.pending(t)) { const first = Object.entries(R.SPECIES_DEF).filter(([k, d]) => !d.visitor && d.count === 1 && k !== 'octopus' && d.level <= lv && t.shells >= R.fishPrice(k, now, t)).sort((a, b) => a[1].price - b[1].price)[0]; if (first) return buyF(first[0]); }      /* (the first fish before anything else) */
    if (dens < octos && R.DECOR_DEF.coconut.level <= lv && t.shells >= R.DECOR_DEF.coconut.price) return buyD('coconut');
    if (plants < 2 && t.shells >= R.DECOR_DEF.grass.price) return buyD('grass');
    const SP = R.specialOf(t, now), wantColor = t.goal && (R.MORPHS[t.goal.id] ? SP.color === t.goal.id : t.goal.id === 'rare');
    if (wantColor && room(SP.species) && t.shells >= R.specialPrice(SP.species) && t.flags.simSp !== Math.floor(now / DAY)) { t.flags.simSp = Math.floor(now / DAY); const mate = t.fish.find((f) => !f.dead && f.species === SP.species); return buyF(SP.species, { special: true, sex: mate ? (R.sexOf(mate) === 'm' ? 'f' : 'm') : undefined }); }
    const single = Object.entries(kindsOf).find(([k, n]) => n === 1 && !R.isOcto({ species: k }) && R.SPECIES_DEF[k]?.count === 1 && room(k) && t.shells >= R.fishPrice(k, now, t));
    if (single) { const one = t.fish.find((f) => !f.dead && f.species === single[0]); return buyF(single[0], { sex: R.sexOf(one) === 'm' ? 'f' : 'm' }); }
    const fresh = Object.entries(R.SPECIES_DEF).filter(([k, d]) => !d.visitor && d.count === 1 && k !== 'octopus' && !kindsOf[k] && d.level <= lv && room(k)).sort((a, b) => a[1].price - b[1].price)[0];
    if (fresh && t.shells >= R.fishPrice(fresh[0], now, t) && rand() < 0.6) return buyF(fresh[0]);
    // decorations: the dearest unowned thing open at this level is what a saver saves for; others buy what they can afford now
    const owned = new Set(t.decor.map((d) => d.type)), open = Object.entries(R.DECOR_DEF).filter(([k, d]) => !d.earned && d.price > 0 && d.level <= lv && !owned.has(k)).sort((a, b) => b[1].price - a[1].price);
    const goalItem = open[0]; if (!goalItem) return; if (t.shells >= goalItem[1].price) { if (buyD(goalItem[0])) M['bought ' + goalItem[0]] ??= +day().toFixed(1); return; }
    if (rand() > p.save) { const cheap = open.filter(([, d]) => d.price <= t.shells).sort((a, b) => a[1].price - b[1].price)[0]; if (cheap) buyD(cheap[0]); }
  }
  function snap() {
    const L = ledger.filter((x) => x.who !== 'nobody'), earned = L.filter((x) => x.amount > 0).reduce((a, x) => a + x.amount, 0), spent = -L.filter((x) => x.amount < 0).reduce((a, x) => a + x.amount, 0);
    const by = {}; for (const x of L) { const k = x.what.split(':')[0] + (x.amount < 0 ? ':' + (x.what.split(':')[1] ?? '') : ''); by[k] = (by[k] ?? 0) + x.amount; }
    const openD = Object.values(R.DECOR_DEF).filter((d) => !d.earned && d.price > 0 && d.level <= t.level), owned = new Set(t.decor.map((d) => d.type));
    const St = t.stats ?? {}, n = (k) => St[k] ?? 0, raisedN = Object.keys(St).filter((k) => k.startsWith('raised_')).reduce((a, k) => a + St[k], 0);
    const W = R.SCORE_W, parts = { care: W.care * n('careDays'), mystery: W.myst * n('myst'), decisions: W.decided * n('decided'), hatched: W.hatched * n('hatched'), grown: W.grown * n('grewHere'), raised: W.raised * raisedN, morphs: W.morph * n('morphs'), goals: W.goal * (t.goalsDone ?? []).length, field: W.field * Object.keys(t.field ?? {}).length, species: W.species * (t.seen?.fish?.length ?? 0) };
    const G = R.goalOf(t), stuck = G ? `${G.id} since day ${((G.at - t0) / DAY).toFixed(0)}: ${G.steps.map((x) => (x.done ? '✓' : x.have + '/' + x.need)).join(' ')}` : (t.goalOffer ?? []).length ? 'choosing' : 'none';
    return { stuck, parts, centerpieces: Object.fromEntries(['spire', 'crystal', 'bridge', 'arch'].map((k) => [k, t.decor.some((d) => d.type === k) ? (M['bought ' + k] ?? 'yes') : null])), level: t.level, score: R.scoreOf(t, now), shells: t.shells, earned, spent, by, decorOwned: owned.size, decorOpen: openD.length, centerAfford: openD.length ? Math.max(...openD.map((d) => d.price)) <= t.shells : false, fish: t.fish.filter((f) => !f.dead).length, field: Object.keys(t.field ?? {}).length, goals: (t.goalsDone ?? []).length, ...count };
  }
  return { M, snaps, people: people.map((p) => p.kind) };
  // what the tank itself says has happened (read after every visit and at the end of each day)
  function readTank() {
    const S = t.stats ?? {}, live = t.fish.filter((f) => !f.dead);
    if ((t.eggs ?? []).length || S.octoEggs) mark('first eggs'); if (S.hatched) mark('first hatching'); if (S.grewHere) mark('first adult raised');
    if (t.fish.some((f) => f.raisedAs)) mark('first raised temperament'); if ((t.adv?.hist ?? []).some((h) => h.fish)) mark('first octopus adventure');
    if (S.morphs) mark('first rare color'); if ((t.goalsDone ?? []).length) mark('first goal done'); if (live.some((f) => (f.gen ?? 0) >= 2 && R.stageOf(f, now) === 'adult')) mark('second generation adult');
    for (let lv = 2; lv <= 8; lv++) if (t.level >= lv) mark('level ' + lv);
  }
}

// ── the table ──
const med = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; }, rangeOf = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? `${s[0]}–${s[s.length - 1]}` : '—'; };
const DAYS = +arg('days', 120), SEEDS = +arg('seeds', 6), CREWS = arg('crew') ? [+arg('crew')] : [1, 2, 4], PROFS = arg('profile') ? [arg('profile')] : ['casual', 'regular', 'engaged', 'mixed', 'returning'];
const out = [];
for (const crew of CREWS) for (const profile of PROFS) {
  if (profile === 'mixed' && crew === 1) continue;
  const runs = Array.from({ length: SEEDS }, (_, i) => run({ crew, profile, days: DAYS, seed: i + 1 }));
  const row = { crew, profile, milestones: {}, snaps: {} };
  for (const k of M_KEYS) { const v = runs.map((r) => r.M[k]); row.milestones[k] = { median: med(v), range: rangeOf(v), hit: v.filter((x) => x != null).length + '/' + SEEDS }; }
  for (const d of [7, 30, 60, 120].filter((d) => d <= DAYS)) { const S = runs.map((r) => r.snaps[d]).filter(Boolean), m = (k) => med(S.map((x) => x[k])); row.snaps[d] = { level: m('level'), score: m('score'), shells: m('shells'), earned: m('earned'), spent: m('spent'), perDayEarned: +(m('earned') / d).toFixed(1), decor: `${m('decorOwned')}/${m('decorOpen')}`, fish: m('fish'), field: m('field'), goals: m('goals'), decisions: m('decisions'), mysteries: m('mysteries'), toasts: m('toasts'), neglect: m('neglect'), deaths: m('deaths'), earnedBy: S[0]?.by, parts: S[0]?.parts, stuck: S.map((x) => x.stuck), centerpieces: S.map((x) => x.centerpieces) }; }
  out.push(row);
}
if (JSON_OUT) console.log(JSON.stringify(out, null, 1));
else for (const r of out) {
  console.log(`\n=== ${r.crew} caretaker${r.crew > 1 ? 's' : ''}, ${r.profile} (${SEEDS} seeds, ${DAYS} days) ===`);
  console.log('  milestone                     median day   range        reached');
  for (const [k, v] of Object.entries(r.milestones)) console.log(`  ${k.padEnd(28)} ${String(v.median ?? '—').padStart(8)}   ${v.range.padEnd(12)} ${v.hit}`);
  console.log('  day   level score shells earned spent  /day  decor  fish field goals decisions mysteries toasts neglect deaths');
  for (const [d, s] of Object.entries(r.snaps)) console.log(`  ${String(d).padStart(3)}   ${String(s.level).padStart(5)} ${String(s.score).padStart(5)} ${String(s.shells).padStart(6)} ${String(s.earned).padStart(6)} ${String(s.spent).padStart(5)} ${String(s.perDayEarned).padStart(5)} ${s.decor.padStart(6)} ${String(s.fish).padStart(5)} ${String(s.field).padStart(5)} ${String(s.goals).padStart(5)} ${String(s.decisions).padStart(9)} ${String(s.mysteries).padStart(9)} ${String(s.toasts).padStart(6)} ${String(s.neglect).padStart(7)} ${String(s.deaths).padStart(6)}`);
}

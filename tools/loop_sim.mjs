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
import { canAdventure } from '../web/src/game/adventures.js';
const H = 3600e3, DAY = 864e5, MIN = 60e3;
if (process.env.CAP) for (const kv of process.env.CAP.split(',')) { const [k, v] = kv.split('='); if (k in R.CAP) R.CAP[k] = isNaN(+v) ? v : +v; }      // CAP=sanct=turtle,release=2,breed=room : the capacity model under test (tools/loop_sim.mjs --cap for the comparison table)
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; }, JSON_OUT = process.argv.includes('--json');

// ── habits ── visits a day (a chance per slot), minutes watched per visit, how much they play with the young, how they shop
const PROFILES = {
  casual: { slots: [[19, 0.75]], watch: 2, play: 0.25, notice: 0.7, save: 0.5 },
  regular: { slots: [[8, 0.6], [19, 0.9]], watch: 3, play: 0.5, notice: 0.9, save: 0.6 },
  engaged: { slots: [[8, 0.95], [13, 0.85], [20, 0.95]], watch: 5, play: 0.9, notice: 1, save: 0.7 },
};
const HOUSE = { casual: ['casual'], regular: ['regular'], engaged: ['engaged'], mixed: ['engaged', 'casual', 'regular', 'casual'], returning: ['regular'], breeder: ['regular'], saver: ['regular'] };      /* (breeder: always takes a color goal; saver: saves every shell for the spire once it opens) */
// Field Guide pages, by how often a watcher catches them (per minute watched, when the animal for it lives in the tank); an assumption
const FIELD_RATE = { glass: 0.02, camo: 0.012, ink: 0.006, squirt: 0.004, bury: 0.006, flat: 0.003, kelp: 0.003, lion: 0.002, jelly: 0.002, snake: 0.0015, fish: 0.002, smack: 0.004, arms: 0.003, ball: 0.004, eggchase: 0.01, chased: 0.004 };

const M_KEYS = ['spire open', 'spire affordable', 'bought spire', 'first fish bought', 'first Field Guide page', 'first mystery', 'first decision', 'first pairing', 'first eggs', 'first hatching', 'first adult raised', 'first raised temperament', 'first octopus adventure', 'first rare color', 'first goal done', 'second generation adult', 'level 2', 'level 3', 'level 4', 'level 5', 'level 6', 'level 7', 'level 8', 'first hermit crab', 'first seahorse pair', 'first seahorse birth', 'second octopus', 'sanctuary done', 'first turtle bought', 'first turtle released', 'second turtle released', 'theme kelp', 'theme coral', 'theme ruins', 'theme lanterns'];
function rng(seed) { let x = seed * 2654435761 >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

function run({ crew, profile, days, seed }) {
  const rand = rng(seed * 97 + crew * 13 + profile.length), t0 = (100 + seed) * 7 * DAY + 6 * H, t = R.newWorld(t0, seed + 2, { empty: true }); R.norm(t, t0); t.tzMin = 0;
  const kinds = HOUSE[profile], people = Array.from({ length: crew }, (_, i) => ({ uid: 'u' + i, name: ['Ana', 'Ben', 'Cy', 'Dee'][i], ...PROFILES[kinds[i % kinds.length]], kind: kinds[i % kinds.length] }));
  const members = crew > 1 ? people.map((p, i) => ({ id: p.uid, name: p.name, slot: i })) : null;
  const goalLog = [], ledger = [], M = {}, snaps = {}, count = { toasts: 0, journal: 0, neglect: 0, deaths: 0, decisions: 0, mysteries: 0, goalFails: 0, overDays: 0, maxAnimals: 0, turtleRefused: 0, wellSum: 0, wellN: 0, lowWell: 0 }; R.CAP.stats.birthsHeld = 0; R.CAP.stats.fryHeld = 0;
  let now = t0; const day = () => (now - t0) / DAY, mark = (k) => { M[k] ??= +day().toFixed(1); };
  const book = (who, what, fn) => { const before = t.shells, r = fn(), after = t.shells; if (after !== before) ledger.push({ at: +day().toFixed(2), who, what, amount: after - before, before, after }); tally(r?.events); return r; };
  const trace = []; const tally = (ev) => { for (const e of ev ?? []) { if (e.toast) count.toasts++; if (e.journal) count.journal++; if (process.env.TRACE && (e.journal || e.toast)) trace.push([+day().toFixed(1), e.journal ?? e.toast]); } };      // TRACE=1: every journal line with its day, for the 30-day experience write-up
  const act = (p, a) => book(p.uid, a.t + (a.food ? ':' + a.food : '') + (a.species ? ':' + a.species : '') + (a.type ? ':' + a.type : ''), () => R.applyAction(t, a, { now, uid: p.uid, name: p.name, members, solo: crew === 1 }));
  // ── the real opening: the first caretaker chooses and names an octopus; each friend who joins gets their own; the tutorial runs its steps
  act(people[0], { t: 'chooseFirst', species: 'octopus', name: 'Inky', seed: seed * 7 + 1, pal: seed % 6 });
  for (const p of people.slice(1)) act(p, { t: 'firstFish', name: p.name + "'s octopus", seed: seed * 7 + p.uid.length * 31 + people.indexOf(p) * 101, pal: people.indexOf(p) });
  for (let s = 1; s <= 5; s++) act(people[0], { t: 'tut', step: s });
  const away = profile === 'returning' ? [12, 18] : null;
  for (let d = 0; d < days; d++) {
    const visits = []; for (const p of people) for (const [hr, pr] of p.slots) if (rand() < pr && !(away && d >= away[0] && d < away[1])) visits.push({ p, at: t0 + d * DAY + (hr - 6) * H + Math.floor(rand() * 50) * MIN });
    visits.sort((a, b) => a.at - b.at);
    for (const { p, at } of visits) { now = at; const oa = t.adv?.octoAt; book('world', 'time passing', () => ({ events: R.advance(t, now) })); if (process.env.DBGADV && oa && oa <= now) for (const f of t.fish.filter((x) => R.isOcto(x) && !x.dead)) console.log('ADV', d, f.name, R.octoMind(f).type, 'can', canAdventure(t, f, oa, R, now), JSON.stringify({ st: R.stageOf(f, oa), h: +R.ownHunger(f).toFixed(2), fed: f.fedAt ? +((oa - f.fedAt) / 3600e3).toFixed(1) : null, ail: +((f.ail ?? 0) / 86400).toFixed(2), hp: +(f.health ?? 1).toFixed(2), away: !!f.away, rest: !!f.restless, pz: !!f.puzzle, sk: !!f.seek, br: !!f.brood, ru: f.restUntil > oa, week: (t.adv.hist ?? []).filter((h) => oa - h.at < 7 * DAY).length })); visit(p); readTank(); }
    now = t0 + (d + 1) * DAY - MIN; book('world', 'time passing', () => ({ events: R.advance(t, now) })); readTank();
    { const cr = R.crowdOf(t); if (cr.r > 0.85) count.overDays++; count.maxAnimals = Math.max(count.maxAnimals, cr.n); for (const f of t.fish.filter((x) => !x.dead && !x.away)) { const w = R.wellOf(t, f, now).score; count.wellSum += w; count.wellN++; if (w < 60) count.lowWell++; } }      /* (the capacity report: crowded days, the most animals at once, every animal's wellbeing every evening) */
    for (const f of t.fish) { if (!f.dead && (f.ail ?? 0) >= R.AIL_WARN && !f._warned) { f._warned = true; count.neglect++; } if ((f.ail ?? 0) < R.AIL_TIRED) f._warned = false; }
    count.deaths = t.fish.filter((f) => f.dead).length + (t.memorial?.length ?? 0);
    for (const k of [7, 30, 60, 90, 120]) if (d + 1 === k) snaps[k] = snap();
    { const openD = Object.entries(R.DECOR_DEF).filter(([k, d]) => !d.earned && d.price > 0 && d.level <= t.level && !t.decor.some((x) => x.type === k)); if (t.level >= 8 && !openD.length) count.idleDays = (count.idleDays ?? 0) + 1; if (ledger.some((x) => x.amount < 0 && x.at >= d && x.at < d + 1)) count.spendDays = (count.spendDays ?? 0) + 1; }      /* (long-term economy: days at level 8 with nothing left to save for; days with any purchase) */
    if (process.env.DBG && t.goal?.id === 'octo' && d % 5 === 0) { const os = t.fish.filter((f) => R.isOcto(f) && !f.dead); console.log(d, JSON.stringify(os.map((f) => [f.id, R.sexOf(f), f.partner ?? '-', f.home ?? '-', R.ownHunger(f).toFixed(2), (f.health ?? 1).toFixed(2), f.away ? 'away' : '', f.broodAt ? ((f.broodAt - t0) / DAY).toFixed(0) : '', f.puzzle ? 'pz' : '', f.seek ? 'sk' : ''])), 'full', t.fish.length + R.pending(t) + (t.eggs ?? []).length, '/', R.capacity(t.level) + R.BIRTH_ROOM, 'eggs', (t.eggs ?? []).map((e) => e.species).join()); }
  }
  function visit(p) {
    const live = () => t.fish.filter((f) => !f.dead && !f.away), mine = (f) => !members || !f.owner || f.owner === p.uid;
    // what is there to notice
    const m = R.mysteryOf(t, now); if (m && !m.done && rand() < p.notice) { const r = act(p, { t: 'mystery', tz: 0 }); if (r.ok && r.applied) { count.mysteries++; mark('first mystery'); } }
    const D = t.dilemma; if (D && !D.done && (!D.turn || D.turn.uid === p.uid || now > D.turn.until) && rand() < p.notice) { const r = act(p, { t: 'decide', id: D.id, k: D.opts[Math.floor(rand() * D.opts.length)].k }); if (r.ok && r.applied) { count.decisions++; mark('first decision'); } }
    if (t.level >= 7 && t.goal && t.goal.id !== 'sanctuary' && !R.sanctuaryDone(t) && R.GOALS.sanctuary.ok(t) && !t.flags.simDrop) { t.flags.simDrop = 1; act(p, { t: 'pickGoal', drop: true }); }      /* (at level 7 a stuck goal is set aside once so the sanctuary goal can be taken, as the progression audit's sim does) */
    if (!t.goal && (t.goalOffer ?? []).length) { const col = t.goalOffer.filter((k) => R.MORPHS[k] || k === 'rare'), g = t.goalOffer.includes('sanctuary') ? 'sanctuary' : profile === 'breeder' && col.length ? col[0] : t.goalOffer[Math.floor(rand() * t.goalOffer.length)]; if (act(p, { t: 'pickGoal', id: g }).ok) { mark('first goal chosen'); goalLog.push({ id: g, from: day() }); } }
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
    if (t.goal && (/Your tank is full/.test(R.goalOf(t)?.next?.hint ?? '') || ((R.MORPHS[t.goal.id] || t.goal.id === 'rare') && t.fish.length + R.pending(t) >= R.capacityOf(t))) && rand() < 0.5) { const ok = (f) => !R.isOcto(f) && f.species !== 'seahorse' && !f.preg && R.stageOf(f, now) === 'adult' && !R.allelesOf(f).some((x) => R.MORPHS[x]) && ![t.match?.a, t.match?.b].includes(f.id) && R.canSell(f, p.uid, members), o = live().find((f) => ok(f) && !(f.parents?.length || f.bornHere)) ?? live().find(ok); if (o && act(p, { t: 'sellFish', id: o.id }).ok) count.rehomed = (count.rehomed ?? 0) + 1; }      /* (a shop fish first, else a grown baby: a player would send that one to a friend) */
    shop(p);
  }
  // the turtle route a prepared player takes: the sanctuary's ledge and grass at level 7, then saving, then the first turtle as soon as the shop allows (refusals are counted)
  function turtleRoute(p) {
    { const tu = t.fish.find((f) => !f.dead && R.TURTLES.has(f.species)); if (tu && R.turtleReady(tu, now)) { const r = act(p, { t: 'releaseTurtle', id: tu.id }); if (r.ok) { mark('first turtle released'); if (R.releasedCount(t) >= 2) mark('second turtle released'); } } }      /* (a grown turtle is let go, as the game intends; the places it earns are then the tank's) */
    if (t.level < 7 || R.turtleEver(t)) return false; const price = R.fishPrice('turtle', now, t);
    if (process.env.LATE && t.fish.length + R.pending(t) < R.capacity(t.level)) return false;      /* LATE=1: a player who fills the tank first and only then thinks of a turtle (the count gate is what they meet) */
    if (!t.decor.some((d) => d.type === 'ledge') && t.shells >= R.DECOR_DEF.ledge.price) { act(p, { t: 'buyDecor', type: 'ledge', x: 2.5, z: 1.5, ry: 0 }); return true; }
    if (!t.decor.some((d) => d.type === 'seagrass') && t.shells >= R.DECOR_DEF.seagrass.price) { act(p, { t: 'buyDecor', type: 'seagrass', x: 2.2, z: 0.6, ry: 0 }); return true; }
    if (t.level >= 8 && t.shells >= price) { const r = act(p, { t: 'buyFish', species: 'turtle', name: 'Shelly', seed: 11, rush: true }); if (r.ok) { mark('first turtle bought'); M['turtle room ok'] = R.turtleRoom(t).ok ? 1 : 0; M['turtle paid'] = price; } else if (r.reason === 'TANK_FULL') { count.turtleRefused++; M['first turtle refused'] ??= +day().toFixed(1); } return true; }
    return true;      /* (saving: nothing else is bought until the turtle is home) */
  }
  function shop(p) {
    if (turtleRoute(p)) return;
    const lv = t.level, room = (sp) => t.fish.length + R.pending(t) + (R.SPECIES_DEF[sp]?.count ?? 1) <= R.capacityOf(t, R.TURTLES.has(sp)), kindsOf = {};      /* (the model's places, so earned or sanctuary places are really used) */ for (const f of t.fish.filter((x) => !x.dead)) kindsOf[f.species] = (kindsOf[f.species] ?? 0) + 1;
    const dens = t.decor.filter((d) => ['coconut', 'pot'].includes(d.type)).length, octos = t.fish.filter((f) => !f.dead && R.isOcto(f)).length, plants = t.decor.filter((d) => R.DECOR_DEF[d.type]?.cat === 'PLANTS').length;
    const buyD = (type) => { const r = act(p, { t: 'buyDecor', type, x: -3 + rand() * 6, z: -1 + rand() * 3, ry: 0 }); if (r.ok) { mark('first decoration bought'); M['bought ' + type] ??= +day().toFixed(1); } return r.ok; };
    const buyF = (sp, extra = {}) => { const r = act(p, { t: 'buyFish', species: sp, name: sp, seed: Math.floor(rand() * 9973), ...extra }); if (r.ok) mark('first fish bought'); return r.ok; };
    if (!t.fish.some((f) => !f.dead && !R.isOcto(f)) && !R.pending(t)) { const first = Object.entries(R.SPECIES_DEF).filter(([k, d]) => !d.visitor && d.count === 1 && k !== 'octopus' && d.level <= lv && t.shells >= R.fishPrice(k, now, t)).sort((a, b) => a[1].price - b[1].price)[0]; if (first) return buyF(first[0]); }      /* (the first fish before anything else) */
    if (profile === 'saver' && R.DECOR_DEF.spire.level <= lv && !t.decor.some((d) => d.type === 'spire')) { mark('spire open'); if (t.shells >= R.DECOR_DEF.spire.price) { mark('spire affordable'); buyD('spire'); } return; }      /* (from the day it opens, every shell goes to the spire) */
    if (dens < octos && R.DECOR_DEF.coconut.level <= lv && t.shells >= R.DECOR_DEF.coconut.price) return buyD('coconut');
    if (plants < 2 && t.shells >= R.DECOR_DEF.grass.price) return buyD('grass');
    const SP = R.specialOf(t, now), wantColor = t.goal && (R.MORPHS[t.goal.id] ? SP.color === t.goal.id : t.goal.id === 'rare');
    if (wantColor && room(SP.species) && t.shells >= R.specialPrice(SP.species, t, now) && t.flags.simSp !== Math.floor(now / DAY)) { t.flags.simSp = Math.floor(now / DAY); const mate = t.fish.find((f) => !f.dead && f.species === SP.species); return buyF(SP.species, { special: true, sex: mate ? (R.sexOf(mate) === 'm' ? 'f' : 'm') : undefined }); }
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
    const diffs = [t.fish.filter((f) => !f.dead && !R.isOcto(f)).length > 0 && 'a new fish', t.decor.length > 0 && 'decorations', Object.keys(t.field ?? {}).length > 0 && 'a Field Guide page', (t.stats?.myst ?? 0) > 0 && 'a mystery found', t.fish.some((f) => R.isOcto(f) && f.home) && 'a den of its own', t.fish.some((f) => f.pal) && 'a friendship', t.fish.some((f) => R.isOcto(f) && R.stageOf(f, now) !== 'baby') && 'the octopus grew', (t.eggs ?? []).length + (t.stats?.hatched ?? 0) > 0 && 'eggs or babies', (t.adv?.hist ?? []).some((h) => h.fish) && 'an adventure', t.fish.some((f) => R.isOcto(f) && Object.values(f.bond ?? {}).some((n) => n >= 3)) && 'the octopus knows you'].filter(Boolean);
    const live = t.fish.filter((f) => !f.dead && !f.away), cr = R.crowdOf(t), tr = R.turtleRoom(t), byKind = {}; for (const f of live) byKind[R.isOcto(f) ? 'octopus' : R.TURTLES.has(f.species) ? 'turtle' : ['blueleg', 'scarlet', 'halloween'].includes(f.species) ? 'crab' : f.species === 'seahorse' ? 'seahorse' : 'fish'] = (byKind[R.isOcto(f) ? 'octopus' : R.TURTLES.has(f.species) ? 'turtle' : ['blueleg', 'scarlet', 'halloween'].includes(f.species) ? 'crab' : f.species === 'seahorse' ? 'seahorse' : 'fish'] ?? 0) + 1;
    const buysF = L.filter((x) => x.what.startsWith('buyFish')).length, buysD = L.filter((x) => x.what.startsWith('buyDecor')).length, bornHere = t.fish.filter((f) => f.bornHere || f.parents?.length).length, sold = L.filter((x) => x.what.startsWith('sellFish')).length;
    return { animals: live.length, byKind, well: count.wellN ? +(count.wellSum / count.wellN).toFixed(1) : null, lowWellPct: count.wellN ? Math.round(100 * count.lowWell / count.wellN) : null, overDays: count.overDays, maxAnimals: count.maxAnimals, birthsHeld: R.CAP.stats.birthsHeld, fryHeld: R.CAP.stats.fryHeld, turtleRefused: count.turtleRefused, turtleOkAt: M['turtle room ok'] ?? null, turtleWell: (() => { const tu = live.find((f) => R.TURTLES.has(f.species)); return tu ? R.wellOf(t, tu, now).score : null; })(), cap: cr.cap, load: +cr.load.toFixed(1), crowdPct: Math.round(cr.r * 100), turtleOk: t.level >= 8 ? !!tr.ok : null, turtleCount: t.level >= 8 ? (tr.places ?? 0) === 0 : null, turtlePlaces: tr.places, turtleFewer: tr.fewer, buysF, buysD, bornHere, sold, themes: Object.keys(t.flags?.themes ?? {}).length, idleDays: count.idleDays ?? 0, spendDays: count.spendDays ?? 0, diffs, stuck, parts, centerpieces: Object.fromEntries(['spire', 'crystal', 'bridge', 'arch'].map((k) => [k, t.decor.some((d) => d.type === k) ? (M['bought ' + k] ?? 'yes') : null])), level: t.level, score: R.scoreOf(t, now), shells: t.shells, earned, spent, by, decorOwned: owned.size, decorOpen: openD.length, centerAfford: openD.length ? Math.max(...openD.map((d) => d.price)) <= t.shells : false, fish: t.fish.filter((f) => !f.dead).length, field: Object.keys(t.field ?? {}).length, goals: (t.goalsDone ?? []).length, ...count };
  }
  for (const G of goalLog) { const d = (t.goalsDone ?? []).find((x) => x.id === G.id && (x.at - t0) / DAY >= G.from); G.days = d ? +((d.at - t0) / DAY - G.from).toFixed(1) : null; }
  return { M, snaps, goalLog, people: people.map((p) => p.kind), trace, final: { fish: t.fish.filter((f) => !f.dead).map((f) => ({ name: f.name, species: f.species, traits: f.traits, pal: f.pal, mate: f.mate, partner: f.partner, spot: f.spotId, story: (f.story ?? []).length, born: !!(f.parents?.length) })), decor: t.decor.length, level: t.level, shells: t.shells, goal: t.goal?.id, done: (t.goalsDone ?? []).map((g) => g.id) } };
  // what the tank itself says has happened (read after every visit and at the end of each day)
  function readTank() {
    const S = t.stats ?? {}, live = t.fish.filter((f) => !f.dead);
    if ((t.eggs ?? []).length || S.octoEggs) mark('first eggs'); if (S.hatched) mark('first hatching'); if (S.grewHere) mark('first adult raised');
    if (t.fish.some((f) => f.raisedAs)) mark('first raised temperament'); if ((t.adv?.hist ?? []).some((h) => h.fish)) mark('first octopus adventure');
    // the progression audit's milestones: crabs, seahorse pairs and births, a second octopus, the sanctuary goal, turtles and their releases, each reef theme
    if (live.some((f) => ['blueleg', 'scarlet', 'halloween'].includes(f.species))) mark('first hermit crab'); if (live.some((f) => f.species === 'seahorse' && f.mate)) mark('first seahorse pair'); if (t.nursery || live.some((f) => f.species === 'seahorse' && (f.parents?.length || f.bornHere))) mark('first seahorse birth');
    if (live.filter((f) => R.isOcto(f)).length >= 2) mark('second octopus'); if ((t.goalsDone ?? []).some((g) => g.id === 'sanctuary')) mark('sanctuary done'); if (live.some((f) => R.TURTLES.has(f.species)) || (t.orders ?? []).some((o) => R.TURTLES.has(o.species))) mark('first turtle bought'); if (R.releasedCount(t) >= 1) mark('first turtle released'); if (R.releasedCount(t) >= 2) mark('second turtle released');
    for (const k of Object.keys(t.flags?.themes ?? {})) mark('theme ' + k);
    if (S.morphs) mark('first rare color'); if ((t.goalsDone ?? []).length) mark('first goal done'); if (live.some((f) => (f.gen ?? 0) >= 2 && R.stageOf(f, now) === 'adult')) mark('second generation adult');
    for (let lv = 2; lv <= 8; lv++) if (t.level >= lv) mark('level ' + lv);
  }
}

// ── the table ──
const med = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; }, rangeOf = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? `${s[0]}–${s[s.length - 1]}` : '—'; };
const DAYS = +arg('days', 120), SEEDS = +arg('seeds', 6), CREWS = arg('crew') ? [+arg('crew')] : [1, 2, 4], PROFS = arg('profile') ? [arg('profile')] : ['casual', 'regular', 'engaged', 'mixed', 'returning', 'breeder', 'saver'];
const out = [];
for (const crew of CREWS) for (const profile of PROFS) {
  if (profile === 'mixed' && crew === 1) continue; if ((profile === 'breeder' || profile === 'saver') && crew === 4) continue;
  const runs = Array.from({ length: SEEDS }, (_, i) => run({ crew, profile, days: DAYS, seed: i + 1 }));
  const row = { crew, profile, milestones: {}, snaps: {} };
  for (const k of M_KEYS) { const v = runs.map((r) => r.M[k]); row.milestones[k] = { median: med(v), range: rangeOf(v), hit: v.filter((x) => x != null).length + '/' + SEEDS }; }
  for (const d of [7, 30, 60, 90, 120].filter((d) => d <= DAYS)) { const S = runs.map((r) => r.snaps[d]).filter(Boolean), m = (k) => med(S.map((x) => x[k])); row.snaps[d] = { level: m('level'), score: m('score'), shells: m('shells'), earned: m('earned'), spent: m('spent'), perDayEarned: +(m('earned') / d).toFixed(1), decor: `${m('decorOwned')}/${m('decorOpen')}`, fish: m('fish'), field: m('field'), goals: m('goals'), decisions: m('decisions'), mysteries: m('mysteries'), toasts: m('toasts'), neglect: m('neglect'), deaths: m('deaths'), earnedBy: S[0]?.by, animals: m('animals'), byKind: S[0]?.byKind, well: m('well'), lowWellPct: m('lowWellPct'), overDays: m('overDays'), maxAnimals: Math.max(...S.map((x) => x.maxAnimals)), birthsHeld: m('birthsHeld'), fryHeld: m('fryHeld'), turtleRefused: m('turtleRefused'), turtleOkAt: S.filter((x) => x.turtleOkAt === 1).length + '/' + S.filter((x) => x.turtleOkAt != null).length, turtleWell: m('turtleWell'), cap: m('cap'), load: m('load'), crowdPct: m('crowdPct'), turtleOk: S.filter((x) => x.turtleOk).length + '/' + S.filter((x) => x.turtleOk != null).length, turtleCount: S.filter((x) => x.turtleCount).length + '/' + S.filter((x) => x.turtleCount != null).length, buysF: m('buysF'), buysD: m('buysD'), bornHere: m('bornHere'), sold: m('sold'), themes: m('themes'), idleDays: m('idleDays'), spendDays: m('spendDays'), diffs: med(S.map((x) => x.diffs.length)), diffsEx: S[0]?.diffs, parts: S[0]?.parts, stuck: S.map((x) => x.stuck), centerpieces: S.map((x) => x.centerpieces) }; }
  row.goalTimes = {}; for (const r of runs) for (const G of r.goalLog) (row.goalTimes[G.id] ||= []).push(G.days);
  out.push(row);
}
if (process.env.TRACE) { const r = run({ crew: CREWS[0], profile: PROFS[0], days: DAYS, seed: +process.env.TRACE }); console.log(JSON.stringify({ trace: r.trace, final: r.final, M: r.M }, null, 0)); process.exit(0); }
if (JSON_OUT) console.log(JSON.stringify(out, null, 1));
else for (const r of out) {
  console.log(`\n=== ${r.crew} caretaker${r.crew > 1 ? 's' : ''}, ${r.profile} (${SEEDS} seeds, ${DAYS} days) ===`);
  console.log('  milestone                     median day   range        reached');
  for (const [k, v] of Object.entries(r.milestones)) console.log(`  ${k.padEnd(28)} ${String(v.median ?? '—').padStart(8)}   ${v.range.padEnd(12)} ${v.hit}`);
  console.log('  day   level score shells earned spent  /day  decor  fish field goals decisions mysteries toasts neglect deaths');
  for (const [d, s] of Object.entries(r.snaps)) console.log(`  ${String(d).padStart(3)}   ${String(s.level).padStart(5)} ${String(s.score).padStart(5)} ${String(s.shells).padStart(6)} ${String(s.earned).padStart(6)} ${String(s.spent).padStart(5)} ${String(s.perDayEarned).padStart(5)} ${s.decor.padStart(6)} ${String(s.fish).padStart(5)} ${String(s.field).padStart(5)} ${String(s.goals).padStart(5)} ${String(s.decisions).padStart(9)} ${String(s.mysteries).padStart(9)} ${String(s.toasts).padStart(6)} ${String(s.neglect).padStart(7)} ${String(s.deaths).padStart(6)}`);
}

// Turtle affordability on the production rules (web/src/game/rules.js, nothing overridden). A regular caretaker (visits at 9:00 and 20:00,
// skips one visit in ten, plays six visits in ten), 20 seeds per strategy, 120 days. Each visit: the daily mystery and gift, feeding, the
// octopus's own food, glass and water when due, pets and play, greeting a visitor, trimming grown plants, picking a goal, then shopping.
// Strategies: save (the shopping list until level 7, then nothing else until the first turtle), hoard (a starter set, then nothing), balanced (the shopping list with 15 kept in hand, turtle when
// affordable), spender (the list with nothing kept back, then any decoration it can afford, half of its visits).
//   node tools/sim/turtle_econ.mjs [seeds=20] [days=120]
import * as R from '../../web/src/game/rules.js';
if (process.env.CLAM) R.DECOR_DEF.clam.price = +process.env.CLAM;      // (the Maxima Clam price experiment: CLAM=110)
if (process.env.NODEAL) R.DEAL.on = false;      // (NODEAL=1: measure without the sanctuary adoption price)
const H = 3600e3, D = 24 * H, SEEDS = +(process.argv[2] ?? 20), DAYS = +(process.argv[3] ?? 120), TURTLE = 'turtle';
const START = ['grass', 'rock', 'coconut', 'cory', 'guppy', 'anemone'];
const LIST = [...START, 'bubbler', 'neongoby', 'grass', 'seafan', 'seahorse', 'seahorse', 'tang', 'boulder', 'liverock', 'betta', 'clam', 'puffer', 'ledge', 'seagrass'];
const EXTRA = ['fern', 'starfish', 'moss', 'shell', 'red', 'sword', 'kelp', 'urchin'];
const CRAB1 = [...START, 'bubbler', 'neongoby', 'blueleg', 'cshell_ivory', 'cshell_rose', 'grass', 'seafan', 'seahorse', 'seahorse', 'tang', 'boulder', 'liverock', 'betta', 'clam', 'puffer', 'ledge', 'seagrass'];      // (hermit crabs: one at level 3 with its free shell and one bought)
const CRAB2 = [...START, 'bubbler', 'neongoby', 'blueleg', 'cshell_ivory', 'cshell_rose', 'grass', 'seafan', 'scarlet', 'cshell_pearl', 'seahorse', 'seahorse', 'tang', 'boulder', 'liverock', 'betta', 'clam', 'puffer', 'ledge', 'seagrass'];
const STRAT = {
  save: { list: LIST, keep: 15, turtleFirst: true, saveFrom: 7 },      // shops as balanced, but from level 7 buys nothing else until the first turtle
  hoard: { list: START, keep: 0, turtleFirst: true },                    // (a reference point: a starter set, then nothing at all until the turtle)
  balanced: { list: LIST, keep: 15 },
  shared: { list: LIST, keep: 15, turtleFirst: true, saveFrom: 7, visits: { 8: 'a', 18: 'a', 12: 'b', 21: 'b', 10: 'c', 16: 'c' } },      // three caretakers, two visits each, saving from level 7 together
  spender: { list: LIST, keep: 0, extra: 0.5 },
  'save+1crab': { list: CRAB1, keep: 15, turtleFirst: true, saveFrom: 7 },
  'save+2crabs': { list: CRAB2, keep: 15, turtleFirst: true, saveFrom: 7 },
  turtles: { list: LIST, keep: 15, turtleFirst: true, saveFrom: 7, again: true },
  casual: { list: LIST, keep: 15, turtleFirst: true, saveFrom: 7, visits: { 20: 'a' }, skip: 0.25 },      // one evening visit, skipped one day in four, saving from level 7      // after the first release it saves for and raises the next turtle it can, and the next: when the other species would open
};
export function run(strat, seed0) {
  let seed = seed0; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const S = STRAT[strat], t = R.newWorld(0); R.norm(t, 0); t.flags.tut = 5; t.createdAt = seed0 * 7919;
  t.fish.push(R.ensureFish({ id: 'oc', name: 'Ink', species: 'octopus', seed: 5, born: -20 * D, stage: 'adult', traits: [], owner: 'a' }));
  const o = { l8: null, afford: null, bought: null, released: null, earned: 0, spent: 0, src: {}, seahorse: null, releases: [], buys: [], open: {} };
  let wi = 0; const price = R.SPECIES_DEF[TURTLE].price;
  for (let h = 1; h <= DAYS * 24; h++) { const now = h * H, day = h / 24;
    R.advance(t, now);
    const V = S.visits ?? { 9: 'a', 20: 'a' }, who = V[h % 24];
    if (!who || rnd() < (S.skip ?? 0.1)) { if (t.level >= 8) o.l8 ??= +day.toFixed(1); continue; }
    const u = { now: now + 1, name: who, uid: who }, act = (a, x = {}) => { const s0 = t.shells, r = R.applyAction(t, a, { ...u, ...x }); if (t.shells > s0) { o.earned += t.shells - s0; o.src[a.t] = (o.src[a.t] ?? 0) + t.shells - s0; } return r; };
    act({ t: 'mystery' });
    for (let k = 0; k < 3 && t.hunger > 0.25; k++) act({ t: 'feed', x: k - 1 }, { now: now + 1 + k * 1000 });
    for (const f of t.fish) if (R.ownHungry?.(f) && !f.dead && R.ownHunger(f) > 0.25) act({ t: 'feed', food: R.ownFood(f), fish: f.id, x: 0 });
    if (t.glass > 0.3) act({ t: 'glass' }); if (t.water < 0.7) act({ t: 'water' });
    if (rnd() < 0.6) { for (const f of t.fish.slice(0, 3)) act({ t: 'pet', id: f.id }); act({ t: 'play', toy: 'ball', fish: t.fish.map((f) => f.id) }); }
    if (t.visitor) act({ t: 'greet', id: t.visitor.id });
    act({ t: 'trim' });
    if (!t.goal && t.goalOffer?.length) act({ t: 'pickGoal', id: t.goalOffer.includes('sanctuary') ? 'sanctuary' : t.goalOffer[0] });
    if (t.level >= 8) o.l8 ??= +day.toFixed(1);
    if (t.level >= 8 && t.shells >= R.fishPrice(TURTLE, now, t)) o.afford ??= +day.toFixed(1); if ((t.goalsDone ?? []).some((g) => g.id === 'sanctuary')) o.sanct ??= +day.toFixed(1);
    const buy = (id) => { const isF = !!R.SPECIES_DEF[id], s0 = t.shells; const r = isF ? R.applyAction(t, { t: 'buyFish', species: id, name: id + wi, rush: true, ...(id === 'seahorse' ? { sex: wi % 2 ? 'm' : 'f', kind: 'erectus' } : {}) }, u) : R.applyAction(t, { t: 'buyDecor', type: id, x: ((wi % 7) - 3) * 0.8, z: 0, free: id === 'cshell_ivory' }, u); if (r.ok) o.spent += s0 - t.shells; if (r.ok && id === 'seahorse') o.seahorse ??= +(now / D).toFixed(1); return r; };
    if (!o.bought && t.level >= 8 && t.shells >= R.fishPrice(TURTLE, now, t) && (S.turtleFirst || wi >= S.list.length || S.keep === 0)) { const r = buy(TURTLE); if (r.ok) { o.bought = +day.toFixed(1); o.paid = t.flags.turtleDeal?.price ?? price; } }
    if (S.again && o.released && t.level >= 8 && !t.fish.some((f) => R.isTurtle?.(f) && !f.dead) && !t.orders?.some((q) => R.TURTLES.has(q.species))) {      // the next turtle: whichever kind is open and affordable (the cheapest first)
      const open = ['turtle', 'hawksbill', 'loggerhead', 'kemps'].filter((k) => R.releasedCount(t) >= (R.SPECIES_DEF[k].needRel ?? 0)).sort((a, b2) => R.SPECIES_DEF[a].price - R.SPECIES_DEF[b2].price);
      for (const k of open) if (t.shells >= R.SPECIES_DEF[k].price) { const r = buy(k); if (r.ok) { o.buys.push([k, +day.toFixed(1)]); break; } } }
    for (const k of ['hawksbill', 'loggerhead', 'kemps']) if (!o.open[k] && t.level >= 8 && R.releasedCount(t) >= (R.SPECIES_DEF[k].needRel ?? 0)) o.open[k] = +day.toFixed(1);
    const want = S.saveFrom && t.level >= S.saveFrom && !o.bought ? null : S.list[wi]; if (want) { const d = R.SPECIES_DEF[want] ?? R.DECOR_DEF[want]; if (t.level >= d.level && t.shells >= d.price + S.keep) { const r = buy(want); if (r.ok || !['NOT_ENOUGH_SHELLS', 'LEVEL_TOO_LOW'].includes(r.reason)) wi++; } }
    else if (!S.saveFrom && S.extra && rnd() < S.extra) { const id = EXTRA[Math.floor(rnd() * EXTRA.length)], d = R.DECOR_DEF[id]; if (d && t.level >= d.level && t.shells >= d.price) buy(id); }
    const tu = t.fish.find((f) => R.isTurtle?.(f) && !f.dead); if (tu && (!o.released || S.again)) { const r = act({ t: 'releaseTurtle', id: tu.id }); if (r.ok) { o.released ??= +day.toFixed(1); o.releases.push(+day.toFixed(1)); } }
  }
  return o;
}
const med = (a) => { const v = a.filter((x) => x != null).sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : null; };
const rng = (a) => { const v = a.filter((x) => x != null); return v.length ? `${Math.min(...v)}–${Math.max(...v)}` : '—'; };
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`| Strategy | First seahorse (median day) | Level 8 (median, range) | Sanctuary goal done | Can afford turtle | Buys turtle | Gap L8→buy | Paid (median) | Bought within ${DAYS}d | Shells earned (median) |`); console.log('|---|---|---|---|---|---|---|---|---|---|');
  const srcAll = {};
  for (const s of Object.keys(STRAT)) { const rs = []; for (let k = 0; k < SEEDS; k++) rs.push(run(s, 1000 + k * 37));
    for (const r of rs) for (const [k, v] of Object.entries(r.src)) srcAll[k] = (srcAll[k] ?? 0) + v / (rs.length * 3);
    const gap = rs.map((r) => r.afford != null && r.l8 != null ? +(r.afford - r.l8).toFixed(1) : null);
    const gapB = rs.map((r) => r.bought != null && r.l8 != null ? +(r.bought - r.l8).toFixed(1) : null); console.log(`| ${s} | ${med(rs.map((r) => r.seahorse)) ?? 'never'} | ${med(rs.map((r) => r.l8))} (${rng(rs.map((r) => r.l8))}) | ${med(rs.map((r) => r.sanct)) ?? 'never'} (${rs.filter((r) => r.sanct != null).length}/${rs.length}) | ${med(rs.map((r) => r.afford)) ?? 'never'} (${rng(rs.map((r) => r.afford))}) | ${med(rs.map((r) => r.bought)) ?? 'never'} (${rng(rs.map((r) => r.bought))}) | ${med(gapB) ?? '—'} (${rng(gapB)}) | ${med(rs.map((r) => r.paid)) ?? '—'} | ${rs.filter((r) => r.bought != null).length}/${rs.length} | ${med(rs.map((r) => Math.round(r.earned)))} |`); }
  if (process.env.GATES) { const rs = []; for (let k = 0; k < SEEDS; k++) rs.push(run('turtles', 1000 + k * 37));
    console.log(`\nTurtle progression (turtles strategy, ${DAYS} days, ${SEEDS} seeds): median day (range)`); const col = (f) => `${med(rs.map(f)) ?? 'never'} (${rng(rs.map(f))})`;
    console.log(`first turtle bought ${col((r) => r.bought)} · first release ${col((r) => r.releases[0] ?? null)} · second turtle bought ${col((r) => r.buys[0]?.[1] ?? null)} · second release ${col((r) => r.releases[1] ?? null)} · third release ${col((r) => r.releases[2] ?? null)}`);
    console.log(`hawksbill opens ${col((r) => r.open.hawksbill)} · gap L8→hawksbill ${col((r) => (r.open.hawksbill != null && r.l8 != null ? +(r.open.hawksbill - r.l8).toFixed(1) : null))} · releases within ${DAYS}d: ${rs.map((r) => r.releases.length).join(',')}`); }
  console.log('\nShells by action, average per run over all strategies:', JSON.stringify(Object.fromEntries(Object.entries(srcAll).map(([k, v]) => [k, Math.round(v)]))));
}

// Plays a simulated week-after-week player through the real rules and reports pacing.
//   node tools/econ.mjs [visitsPerDay=3] [days=60]
import * as R from '../web/src/game/rules.js';
const visits = +(process.argv[2] || 3), DAYS = +(process.argv[3] || 60), H = 3600e3, DAY = 864e5;
const sim = (visitsPerDay) => {
  const t = R.newWorld(0, 3); R.norm(t, 0); t.flags.tut = 5; let now = 0; const log = { level: {}, species: {}, shellsEarned: 0, fish: {}, wishes: {} }; let lastLevel = 1, lastWish = 0;
  const gaps = visitsPerDay === 1 ? [10] : visitsPerDay === 2 ? [8, 16] : visitsPerDay === 3 ? [8, 13, 20] : [8, 11, 14, 18, 21, 23];
  const want = () => [...Object.entries(R.SPECIES_DEF).map(([k, d]) => ({ kind: 'fish', k, ...d })), ...Object.entries(R.DECOR_DEF).map(([k, d]) => ({ kind: 'decor', k, ...d }))].filter((x) => x.level <= t.level).sort((a, b) => a.price - b.price);
  const bought = new Set();
  for (let day = 0; day < DAYS; day++) for (const hr of gaps) {
    now = day * DAY + hr * H + (day * 7919 % 31) * 60e3; const before = t.shells, act = (a) => { const r = R.applyAction(t, a, { now, name: 'Sim', uid: 'sim' }); return r; };
    act({ t: 'tut', step: 5 });
    if (t.drift) act({ t: 'collect', id: t.drift.id });
    if (t.hunger > 0.3) act({ t: 'feed' }); if (t.glass > 0.3) act({ t: 'glass' }); if (t.water < 0.7) act({ t: 'water' });
    for (const f of t.fish.slice(0, 3)) act({ t: 'pet', id: f.id });
    // spend like a goal-driven player: new fish first (saving up for them), then new decorations, then more of what is already liked
    for (let guard = 0; guard < 8; guard++) {
      const room = (x) => t.fish.length + R.pending(t) + x.count <= R.capacity(t.level), unlocked = want();
      const newFish = unlocked.filter((x) => x.kind === 'fish' && !bought.has(x.k) && room(x));
      const newDecor = unlocked.filter((x) => x.kind === 'decor' && !bought.has(x.k) && t.decor.length < R.MAX_DECOR);
      if (newFish.length && t.shells < newFish[0].price) break;                                           // saving up
      if (!newFish.length && newDecor.length && t.shells < newDecor[0].price) break;
      const order = [...newFish, ...unlocked.filter((x) => x.kind === 'decor' && !bought.has(x.k) && t.decor.length < R.MAX_DECOR), ...unlocked.filter((x) => x.kind === 'decor' && t.decor.length < R.MAX_DECOR), ...unlocked.filter((x) => x.kind === 'fish' && room(x))];
      const pick2 = order.find((x) => t.shells >= x.price); if (!pick2) break;
      const r = pick2.kind === 'fish' ? act({ t: 'buyFish', species: pick2.k, name: pick2.label, seed: now }) : act({ t: 'buyDecor', type: pick2.k, x: ((t.decor.length * 1.3) % 8) - 4, z: 1 + (t.decor.length % 3), ry: 0 });
      if (!r.ok) break; bought.add(pick2.k); if (pick2.kind === 'fish') log.species[pick2.k] ??= +(now / DAY).toFixed(1);
    }
    R.advance(t, now + 1000);
    if (t.level > lastLevel) { for (let l = lastLevel + 1; l <= t.level; l++) log.level[l] = +(now / DAY).toFixed(1); lastLevel = t.level; }
    if (t.wishIdx > lastWish) { for (let w = lastWish; w < t.wishIdx; w++) log.wishes[w + 1] = +(now / DAY).toFixed(1); lastWish = t.wishIdx; }
    log.shellsEarned += Math.max(0, t.shells - before);
  }
  log.final = { level: t.level, fish: t.fish.length, orders: t.orders.length, decor: t.decor.length, shells: t.shells, seen: t.seen.fish.length + t.seen.decor.length, of: R.COLLECTION_SIZE(), score: R.scoreOf(t, now) };
  log.perDay = +(log.shellsEarned / DAYS).toFixed(1); return log;
};
for (const v of [1, 3, 6]) { if (process.argv[2] && +process.argv[2] !== v) continue; const l = sim(v); console.log(`\n${v} visit${v > 1 ? 's' : ''}/day over ${DAYS} days`); console.log(' shells/day (net of spending, incl. rewards):', l.perDay); console.log(' level reached on day:', JSON.stringify(l.level)); console.log(' species unlocked/bought on day:', JSON.stringify(l.species)); console.log(' wishes done on day:', JSON.stringify(l.wishes)); console.log(' end state:', JSON.stringify(l.final)); }

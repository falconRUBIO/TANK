// Little Adventures simulator: tanks run through the real rules for 120 days with a caretaker who looks in three times a day, one tank per
// octopus nature (and a few seeds of each), and reports how often each adventure happens and that nothing unsafe ever does.
//   node tools/adventure_sim.mjs [--days=120] [--seeds=3] [--json] [--rate=1]
// Results are simulated behaviour, not player data.
import * as R from '../web/src/game/rules.js';
const H = 3600e3, DAY = 864e5, arg = (k, d) => Number((process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d);
const DAYS = arg('days', 120), SEEDS = arg('seeds', 3), RATE = arg('rate', 1), JSON_OUT = process.argv.includes('--json');
const TYPES = R.OCTO_TYPES.map((x) => x.id);
const seedFor = (type, k) => { let n = 0; for (let s = 1; s < 5000; s++) if (R.octoMind({ seed: s }).type === type && n++ === k) return s; throw new Error('no seed'); };

export function runTank(type, k, days = DAYS) {
  const start = Date.UTC(2026, 0, 5, 8) + k * 7.3 * H, t = R.newWorld(start, k + 3); R.norm(t, start); t.id = `sim-${type}-${k}`; t.flags.tut = 5; t.shells = 400; t.level = 6;
  if (RATE !== 1) t.flags.advRate = RATE;
  const oct = R.ensureFish({ id: 'o1', name: 'Inky', species: 'octopus', seed: seedFor(type, k), born: start - 4 * DAY, stage: 'adult', traits: ['Curious'], happy: 0.8, owner: 'me', ownerName: 'You', hunger: 0.2 });
  t.fish.push(oct, R.ensureFish({ id: 'f2', name: 'Dot', species: 'neon', seed: 7, born: start - 4 * DAY, stage: 'adult', traits: ['Social', 'Brave'], happy: 0.8, owner: 'me' }));
  let id = 0; for (const [type, x, z] of [['coconut', 1.2, 0.4], ['rock', -1.5, -0.8], ['shell', 0.2, 1.4], ['fern', -2.5, 1], ['grass', 2.6, -1.2], ['starfish', -0.6, 2.2]]) t.decor.push({ id: 'd' + ++id, type, x, z, ry: 0 });
  oct.home = 'd1';
  const st = { go: 0, back: 0, kinds: {}, outs: {}, keeps: 0, small: {}, feedWhileAway: 0, unsafe: 0, deaths: 0, maxAwayHunger: 0, journal: 0, dupReturns: 0, onboarding: 0 };
  const seen = new Set();
  const take = (ev) => { for (const e of ev) { if (e.journal) st.journal++; if (e.died) st.deaths++; const a = e.adventure; if (!a) continue;
    if (a.phase === 'go') { st.go++; st.kinds[a.kind] = (st.kinds[a.kind] ?? 0) + 1; }
    if (a.phase === 'back') { if (seen.has(a.id)) st.dupReturns++; seen.add(a.id); st.back++; st.outs[a.out] = (st.outs[a.out] ?? 0) + 1; if (a.keep) st.keeps++; }
    if (a.phase === 'small') st.small[a.kind] = (st.small[a.kind] ?? 0) + 1; } };
  for (let h = 0; h < days * 24; h++) {
    const now = start + h * H; take(R.advance(t, now));
    const o = t.fish.find((f) => f.id === 'o1');
    if (o?.away) { st.maxAwayHunger = Math.max(st.maxAwayHunger, R.ownHunger(o)); if ((o.ail ?? 0) >= R.AIL_TIRED || (o.health ?? 1) < 0.5) st.unsafe++; }
    if ([8, 13, 20].includes(h % 24)) {
      const r = R.applyAction(t, { t: 'feed', food: 'crab', fish: 'o1' }, { now, uid: 'me', solo: true }); if (o?.away && r.ok && r.applied) st.feedWhileAway++; take(r.events);
      take(R.applyAction(t, { t: 'feed', food: 'flakes' }, { now, uid: 'me', solo: true }).events);
      if (h % 72 === 8) { take(R.applyAction(t, { t: 'water' }, { now, uid: 'me', solo: true }).events); take(R.applyAction(t, { t: 'glass' }, { now, uid: 'me', solo: true }).events); }
    }
  }
  st.keepsOnSand = t.keeps.length; st.items = t.fish.find((f) => f.id === 'o1')?.advMem?.items.length ?? 0; st.disc = Object.keys(t.fish.find((f) => f.id === 'o1')?.disc ?? {}).filter((x) => ['escape1', 'collector', 'homeagain', 'favfind'].includes(x));
  return st;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = [];
  for (const type of TYPES) for (let k = 0; k < SEEDS; k++) rows.push({ type, k, ...runTank(type, k) });
  if (JSON_OUT) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }
  console.log(`Little Adventures: ${DAYS} days, ${SEEDS} tanks per nature${RATE !== 1 ? `, rate x${RATE}` : ''}\n`);
  console.log('nature     | out | hide short night long | keepsakes (sand/record) | small moments | unsafe feedAway deaths dupReturns');
  for (const r of rows) console.log(`${r.type.padEnd(10)} | ${String(r.go).padStart(3)} | ${[r.kinds.hide, r.kinds.short, r.kinds.night, r.kinds.long].map((x) => String(x ?? 0).padStart(4)).join(' ')}  | ${String(r.keepsOnSand).padStart(3)} / ${String(r.items).padEnd(3)}              | ${String(Object.values(r.small).reduce((a, b) => a + b, 0)).padStart(3)}           | ${r.unsafe} ${r.feedWhileAway} ${r.deaths} ${r.dupReturns}`);
  const outs = {}, small = {}; for (const r of rows) { for (const [k, v] of Object.entries(r.outs)) outs[k] = (outs[k] ?? 0) + v; for (const [k, v] of Object.entries(r.small)) small[k] = (small[k] ?? 0) + v; }
  console.log('\noutcomes:', JSON.stringify(outs)); console.log('small moments:', JSON.stringify(small));
}

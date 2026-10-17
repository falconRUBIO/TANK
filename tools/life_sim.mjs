// Emergent Life simulator: seeded tanks run through the real rules, with the reports a watching phone would send (an octopus handling
// things, carrying keepsakes, a seahorse's holdfasts) generated from each animal's own nature and memory. Measures habits, how varied they
// are, keepsake histories, family preferences, visitors, the journal, duplicates and memory size.
//   node tools/life_sim.mjs [--seeds=2] [--json]
// The reports are a model of the phone's behavior, not the phone itself; results are simulated behaviour, not player data.
import * as R from '../web/src/game/rules.js';
const H = 3600e3, DAY = 864e5, arg = (k, d) => Number((process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d);
const SEEDS = arg('seeds', 2), JSON_OUT = process.argv.includes('--json');
const rng = (s) => () => { s = (s + 0x6d2b79f5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const seedFor = (type, k = 0) => { let n = 0; for (let s = 1; s < 9000; s++) if (R.octoMind({ seed: s }).type === type && n++ === k) return s; };
// populations and how often someone looks in
const TANKS = {
  octo2: { octos: ['collector', 'explorer'], fish: 3, sea: 0 },
  octo1sea: { octos: ['homebody'], fish: 2, sea: 2 },
  mixed: { octos: ['trickster'], fish: 4, sea: 2 },
  watcher: { octos: ['watcher', 'showoff'], fish: 2, sea: 0 },
};
const ACTIVITY = { daily: [8, 13, 20], light: [19], weekly: null };

export function run(kind, act, days, seed) {
  const r = rng(seed * 7919 + days), P = TANKS[kind], T0 = Date.UTC(2026, 0, 5) + seed * 3.7 * H, t = R.newWorld(T0 - 5 * DAY, seed); R.norm(t, T0 - 5 * DAY); t.id = `${kind}-${act}-${seed}`; t.flags.tut = 5; t.shells = 500; t.level = 8;
  let id = 0; t.decor = [['coconut', 1.2, 0.4], ['pot', -2.6, 0.6], ['boulder', -1.5, -0.8], ['shell', 0.2, 1.4], ['grass', -2.5, 1.6], ['fern', 2.4, -1], ['kelp', 3.2, 1.2], ['rock', 0, -2], ['starfish', -0.6, 2.2], ['red', 1.8, 2]].map(([type, x, z]) => ({ id: 'd' + ++id, type, x, z, ry: 0 }));
  P.octos.forEach((ty, i) => t.fish.push(R.ensureFish({ id: 'o' + i, name: ['Biscuit', 'Inky', 'Sly'][i], species: 'octopus', seed: seedFor(ty, seed % 3), born: T0 - 8 * DAY, stage: 'adult', traits: [], happy: 0.85, owner: 'me', hunger: 0.1, home: i === 0 ? 'd1' : 'd2' })));
  t.fish = t.fish.filter((f) => f.species === 'octopus');
  for (let i = 0; i < P.fish; i++) t.fish.push(R.ensureFish({ id: 'f' + i, name: 'Fish' + i, species: ['neon', 'goldfish', 'guppy', 'blue'][i % 4], seed: 10 + i + seed, born: T0 - 8 * DAY, stage: 'adult', traits: i % 2 ? ['Brave'] : ['Shy'], happy: 0.8 }));
  for (let i = 0; i < P.sea; i++) t.fish.push(R.ensureFish({ id: 's' + i, name: ['Apollo', 'Coral'][i], species: 'seahorse', sex: i ? 'f' : 'm', seed: 20 + i + seed, born: T0 - 30 * DAY, stage: 'adult', traits: [], happy: 0.85, owner: 'me', hunger: 0.1 }));
  t.simTs = T0; R.advance(t, T0 + 1);
  const st = { journal: 0, life: {}, dups: 0, visitsBack: 0, carries: 0, drops: 0, ms: 0 }, said = new Set();
  const take = (ev) => { for (const e of ev) { if (e.journal) { st.journal++; if (said.has(e.journal) && e.life) st.dups++; said.add(e.journal); } if (e.life) st.life[e.life] = (st.life[e.life] ?? 0) + 1; if (/is back\. It has visited/.test(e.journal ?? '')) st.visitsBack++; if (e.stayAsk) st.stayAsks = (st.stayAsks ?? 0) + 1; if (e.anniv) st.anniv = (st.anniv ?? 0) + 1; if (e.capsule) st.capsules = (st.capsules ?? 0) + 1; } };
  const t0 = performance.now();
  for (let h = 0; h < days * 24; h++) {
    const now = T0 + h * H, hr = h % 24, d = Math.floor(h / 24), look = ACTIVITY[act] ? ACTIVITY[act].includes(hr) : hr === 19 && d % 7 === 0;
    if (look) { for (const f of t.fish) if (R.ownHungry(f) && !f.away) take(R.applyAction(t, { t: 'feed', food: R.ownFood(f), fish: f.id }, { now, uid: 'me' }).events); take(R.applyAction(t, { t: 'feed', food: 'flakes' }, { now, uid: 'me' }).events); if (d % 3 === 0 && hr === (ACTIVITY[act]?.[0] ?? 19)) { take(R.applyAction(t, { t: 'water' }, { now, uid: 'me' }).events); take(R.applyAction(t, { t: 'glass' }, { now, uid: 'me' }).events); } }
    if (!ACTIVITY[act]) for (const f of t.fish) if (R.ownHungry(f) && !f.away && f.hunger > 0.6) f.hunger = 0.3;      // (weekly: someone else keeps them fed; we only look once a week)
    // what the phone running the animals would report this hour: each octopus handles a thing or two, its nature and its memory deciding
    for (const f of t.fish.filter((x) => R.isOcto(x) && !x.away)) {
      const M = R.octoMind(f), fam = f.mem?.fam ?? {}, likes = f.mem?.likes ?? [], tod = R.todOf(t, now), hb = (f.habits ?? []).find((q) => q.tod === tod);
      if (r() > 0.35 + 0.4 * M.cur) continue; const pool = t.decor.filter((x) => x.type !== 'starfish'); let q;
      if (hb && r() < 0.6) q = pool.find((x) => x.id === hb.id);
      if (!q && likes.length && r() < 0.55) q = pool.find((x) => x.id === likes[Math.floor(r() * likes.length)]);
      if (!q) { const near = pool.filter((x) => Math.hypot(x.x - (M.type === 'homebody' ? 1.2 : 0), x.z - 0.4) < (M.type === 'explorer' ? 9 : M.type === 'homebody' ? 2.2 : 4)); q = near[Math.floor(r() * near.length)] ?? pool[0]; }
      // a slight preference for one time of day for each favourite (the animal's own rhythm, from its seed)
      if (q && (fam[q.id]?.tod ? r() < 0.75 : true)) take(R.applyAction(t, { t: 'octoTouch', fish: f.id, decor: q.id, kind: 'revisit' }, { now: now + Math.floor(r() * 50) * 60e3, uid: 'me' }).events);
      const ks = (t.keeps ?? []).filter((k) => k.by === f.id), den = t.decor.find((x) => x.id === f.home);
      if (ks.length && den && r() < (M.type === 'collector' ? 0.08 : 0.03)) { const k = ks[Math.floor(r() * ks.length)], drop = r() < 0.2, x = drop ? (k.x + den.x) / 2 : den.x + 0.4, z = drop ? (k.z + den.z) / 2 : den.z + 0.5; st[drop ? 'drops' : 'carries']++; take(R.applyAction(t, { t: 'keepMove', id: k.id, x, z, how: drop ? 'drop' : 'carry', fish: f.id, idk: `${h}` }, { now, uid: 'me' }).events);
        if (!drop && r() < 0.5) { k.x = den.x - 2 + r() * 4; k.z = den.z + 1.6; } }      // (and then it wanders off again, or another octopus moves it: the next carry starts from somewhere else)
    }
    for (const f of t.fish.filter((x) => x.species === 'seahorse')) { const pl = t.decor.filter((x) => ['grass', 'fern', 'kelp', 'red'].includes(x.type)), fav = f.log?.fav, q = fav && r() < 0.7 ? fav : pl[Math.floor(r() * pl.length)]?.id; if (q && r() < 0.5) take(R.applyAction(t, { t: 'fishLog', logs: [{ fish: f.id, hitch: { [q]: [60 + Math.floor(r() * 120), 1] } }] }, { now, uid: 'me' }).events); }
    take(R.advance(t, now + 59 * 60e3));
  }
  st.ms = Math.round(performance.now() - t0);
  const os = t.fish.filter((f) => R.isOcto(f)), habits = os.flatMap((f) => (f.habits ?? []).map((q) => `${t.decor.find((x) => x.id === q.id)?.type}@${R.TOD[q.tod]}`));
  st.habits = habits.length; st.distinct = new Set(habits).size; st.octos = os.length; st.sameRoutine = os.length > 1 && os.every((f) => JSON.stringify((f.habits ?? []).map((q) => [q.id, q.tod])) === JSON.stringify((os[0].habits ?? []).map((q) => [q.id, q.tod]))) && habits.length > 0;
  st.likesSpread = Math.max(0, ...os.map((f) => Object.values(f.mem?.fam ?? {}).filter((e) => e.n > 0).length)); st.keeps = (t.keeps ?? []).length; st.keepHist = (t.keeps ?? []).filter((k) => k.h?.carries).length;
  st.history = (t.history ?? []).length; st.histBytes = JSON.stringify({ h: t.history ?? [], c: t.capsules ?? [] }).length; st.denObjs = Math.max(0, ...t.fish.map((f) => f.denMem?.objs?.length ?? 0));
  st.decorHist = t.decor.filter((d) => d.h?.first).length; st.decorBytes = JSON.stringify(t.decor.map((d) => d.h ?? null)).length;
  st.visitMem = Object.values(t.visitMem ?? {}).reduce((a, m) => a + m.n, 0); st.bytes = JSON.stringify(t).length; st.perDayMs = +(st.ms / days).toFixed(2);
  return st;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = []; for (const days of [7, 30, 60, 120]) for (const kind of Object.keys(TANKS)) for (const act of Object.keys(ACTIVITY)) for (let s = 1; s <= SEEDS; s++) rows.push({ days, kind, act, seed: s, ...run(kind, act, days, s) });
  if (JSON_OUT) { console.log(JSON.stringify(rows)); process.exit(0); }
  for (const days of [7, 30, 60, 120]) {
    const R0 = rows.filter((x) => x.days === days), avg = (k) => +(R0.reduce((a, x) => a + (x[k] ?? 0), 0) / R0.length).toFixed(1), sum = (k) => R0.reduce((a, x) => a + (x[k] ?? 0), 0);
    const life = {}; for (const x of R0) for (const [k, v] of Object.entries(x.life)) life[k] = (life[k] ?? 0) + v;
    console.log(`${String(days).padStart(3)} days, ${R0.length} tanks: habits ${avg('habits')} (distinct ${avg('distinct')}), same routine in a two-octopus tank ${R0.filter((x) => x.sameRoutine).length}, things known ${avg('likesSpread')}, keepsakes with a history ${avg('keepHist')}, decorations with a history ${avg('decorHist')} (${Math.round(avg('decorBytes'))} B), journal ${avg('journal')} lines (${(avg('journal') / days).toFixed(2)}/day), life lines ${JSON.stringify(life)}, visitor returns told ${sum('visitsBack')}, stay offers ${sum('stayAsks')}, anniversaries ${avg('anniv')}, capsules ${avg('capsules')}, history ${avg('history')} items (${Math.round(avg('histBytes') / 1024 * 10) / 10} KB), duplicates ${sum('dups')}, saved size ${Math.round(avg('bytes') / 1024)} KB, ${avg('perDayMs')} ms/day`);
  }
  console.log('\nby caretaker activity (120 days):'); for (const act of Object.keys(ACTIVITY)) { const R0 = rows.filter((x) => x.days === 120 && x.act === act); console.log(`  ${act.padEnd(6)} habits ${(R0.reduce((a, x) => a + x.habits, 0) / R0.length).toFixed(1)}, journal ${(R0.reduce((a, x) => a + x.journal, 0) / R0.length / 120).toFixed(2)}/day`); }
}

// Three-player economy simulator. A bot plays a shared tank through the real rules for up to 90 days with a per-source shell ledger.
//   node tools/econ2.mjs                         all scenarios, baseline vs current rules, 5 seeds (markdown)
//   node tools/econ2.mjs --only=B,C --seeds=3    a subset
//   node tools/econ2.mjs --level8=216            what-if for the last level threshold (current rules only)
//   node tools/econ2.mjs --json                  machine-readable output
// "baseline" = tools/baseline/rules.js, a frozen copy of the rules before the fish-milestone / daily-wish / level-8 work.
// "current"  = web/src/game/rules.js. The bot is a bot: it cares whenever it visits, buys goal-first, plays with fish and completes the daily wish the way a watching phone would report it.
// Results are simulated behaviour, not retention data. Nothing here measures real players.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), H = 3600e3, DAY = 864e5;
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1];

async function load(which, level8) {
  const base = which === 'baseline' ? path.join(here, 'baseline') : path.join(here, '../web/src/game');
  if (!level8 || which === 'baseline') return import(pathToFileURL(path.join(base, 'rules.js')).href);
  const dir = path.join(here, '../.simcache'); fs.mkdirSync(dir, { recursive: true }); fs.copyFileSync(path.join(base, 'genes.js'), path.join(dir, 'genes.js'));
  const src = fs.readFileSync(path.join(base, 'rules.js'), 'utf8'); const m = /184, (\d+)\]/.exec(src); if (!m) throw new Error('level 8 threshold not found');
  fs.writeFileSync(path.join(dir, `rules_${level8}.js`), src.replace(m[0], `184, ${level8}]`));
  return import(pathToFileURL(path.join(dir, `rules_${level8}.js`)).href);
}

// players: visits per day, or { every: N } for one visit every N days
export const SCENARIOS = {
  A: { label: 'A. One of three active (3 visits/day)', players: [3] },
  B: { label: 'B. Three active (3 visits/day each)', players: [3, 3, 3] },
  C: { label: 'C. Unequal (3/day, 1/day, every 3 days)', players: [3, 1, { every: 3 }] },
  D: { label: 'D. Three active, all away days 20-27 (server idle)', players: [3, 3, 3], away: [20, 27] },
  Dt: { label: 'D2. Same, server ticking every 5 min (push on)', players: [3, 3, 3], away: [20, 27], tick: 5 },
  E: { label: 'E. High frequency (6 visits/day each)', players: [6, 6, 6] },
  Es: { label: 'E2. High frequency + bottle swapping at every chance', players: [6, 6, 6], bottles: 'max' },
  S: { label: 'S. Casual single caretaker (1 visit/day)', players: [1] },
  St: { label: 'S2. Casual single caretaker, server ticking every 5 min (push on)', players: [1], tick: 5 },
};
const GAPS = { 1: [10], 2: [8, 16], 3: [8, 13, 20], 6: [8, 11, 14, 18, 21, 23] };
const NAMES3 = ['Alex', 'Sam', 'Riley'];

export async function run(which, sc, DAYS = 90, seed = 1, level8 = null) {
  const R = await load(which, level8), start = seed * 5.3 * H;
  const t = R.newWorld(start, seed); R.norm(t, start); t.flags.tut = 5;
  const ledger = {}, ctx = { tag: 'other' }; let bal = t.shells;
  const category = () => {
    for (const fr of new Error().stack.split('\n')) {
      const m = /at (?:async )?(\w+) /.exec(fr); if (!m) continue; const n = m[1];
      if (n === 'progress') return 'dailyWish'; if (n === 'discover') return 'discovery'; if (n === 'milestones') return 'milestone'; if (n === 'ageMilestones') return 'age'; if (n === 'levelCheck') return 'levelUp'; if (n === 'advance') return 'advance'; if (n === 'eggs') return 'breeding';
    }
    return ctx.tag;
  };
  Object.defineProperty(t, 'shells', { configurable: true, enumerable: true, get: () => bal, set: (v) => {
    const d = v - bal; bal = v; if (!d) return; let c = category();
    if (d > 0 && c === 'advance') c = d === 8 ? 'birthday' : 'growth'; if (c === 'milestone') c = d === 3 ? 'collection' : 'tankWish'; if (c === 'applyAction' || c === 'other') c = ctx.tag;
    const k = (d > 0 ? '+' : '-') + c; ledger[k] = (ledger[k] ?? 0) + d;
  } });
  const members = sc.players.map((_, i) => ({ id: 'p' + (i + 1), name: NAMES3[i] }));
  const log = { level: {}, wishDays: new Set(), bought: { fish: 0, decor: 0 }, snaps: {}, visits: 0, away: null };
  const bought = new Set(), events = [], SNAP = [7, 14, 30, 60, 90].filter((d) => d <= DAYS);
  for (let d = 0; d < DAYS; d++) {
    if (sc.away && d >= sc.away[0] && d < sc.away[1]) continue;
    sc.players.forEach((spec, p) => {
      const every = typeof spec === 'object' ? spec.every : 1, perDay = typeof spec === 'object' ? 1 : spec;
      if (d % every !== (p % every)) return; const jit = ((seed * 37) % 5) / 4;
      for (const hr of GAPS[perDay]) events.push({ at: start + d * DAY + (hr + p * 0.8 + jit) * H + ((d * 7919 + p * 131 + seed * 977) % 31) * 60e3, p, first: hr === GAPS[perDay][0] });
    });
  }
  events.sort((a, b) => a.at - b.at);
  let lastTick = start, nextSnap = 0, lastLevel = 1;
  const rel = (x) => (x - start) / DAY;
  for (const e of events) {
    if (sc.tick) for (let x = lastTick + sc.tick * 60e3; x < e.at - 1000; x += sc.tick * 60e3) { R.advance(t, x); lastTick = x; if (t.daily?.done) log.wishDays.add(t.daily.day); }
    const now = e.at, m = members[e.p], uid = m.id;
    while (nextSnap < SNAP.length && rel(now) >= SNAP[nextSnap]) { log.snaps[SNAP[nextSnap]] = snap(R, t, start + SNAP[nextSnap] * DAY, ledger, log, start); nextSnap++; }
    if (sc.away && !log.away && rel(now) >= sc.away[1]) { const before = { fish: t.fish.length, deaths: (t.memorial ?? []).length, balance: bal }; R.advance(t, now); log.away = { before, arrival: { fish: t.fish.length, deaths: (t.memorial ?? []).length, floaters: (t.floaters ?? []).length, water: +t.water.toFixed(2), hunger: +t.hunger.toFixed(2), worstAilDays: +(Math.max(0, ...t.fish.map((f) => f.ail ?? 0)) / 86400).toFixed(1) } }; }
    const act = (a) => { ctx.tag = a.t; return R.applyAction(t, a, { now, name: m.name, uid, members }); };
    log.visits++;
    act({ t: 'tut', step: 5 });
    if (t.drift) act({ t: 'collect', id: t.drift.id });
    if (t.visitor) act({ t: 'greet', id: t.visitor.id });
    for (const f of [...(t.floaters ?? [])]) act({ t: 'scoop', id: f.id });
    for (const b of [...(t.bottles ?? [])].filter((b) => b.to === uid)) act({ t: 'openBottle', id: b.id });
    for (let i = 0; i < 3; i++) if (t.hunger > 0.3) act({ t: 'feed' }); if (t.glass > 0.3) act({ t: 'glass' }); if (t.water < 0.7) act({ t: 'water' });
    for (const f of [...t.fish].sort((a, b) => (a.bond?.[uid] ?? 0) - (b.bond?.[uid] ?? 0)).slice(0, 3)) act({ t: 'pet', id: f.id });
    dailyWish(R, t, act);
    if (sc.players.length > 1 && (sc.bottles === 'max' || e.first)) { const to = members[(e.p + 1) % members.length]; act({ t: 'bottle', to: to.id, note: 'hi' }); }
    spend(R, t, act, bought, now, log);
    R.advance(t, now + 1000);
    if (t.level > lastLevel) { for (let l = lastLevel + 1; l <= t.level; l++) log.level[l] = +rel(now).toFixed(1); lastLevel = t.level; }
    if (t.daily?.done) log.wishDays.add(t.daily.day);
  }
  while (nextSnap < SNAP.length) { log.snaps[SNAP[nextSnap]] = snap(R, t, start + SNAP[nextSnap] * DAY, ledger, log, start); nextSnap++; }
  return { R, t, log, ledger };
}

// do today's wish the way a watching phone would report it
function dailyWish(R, t, act) {
  const d = t.daily; if (!d || d.done) return; const fs_ = t.fish;
  const pair = fs_.find((f) => f.pal && fs_.some((o) => o.id === f.pal)), cur = fs_.find((f) => (f.traits ?? []).includes('Curious')), spotFish = fs_.find((f) => f.found?.includes('spot') && t.decor.some((x) => x.id === f.spotId));
  const decorId = t.decor.find((x) => !['starfish', 'moss', 'shell'].includes(x.type))?.id;
  switch (d.kind) {
    case 'watch': act({ t: 'observe', key: 'watch', fish: fs_[0]?.id }); break;
    case 'greet': for (const f of fs_.slice(0, 3)) act({ t: 'observe', key: 'inspect', fish: f.id }); break;
    case 'together': act({ t: 'observe', key: 'together', fish: fs_[0]?.id, with: fs_[1]?.id }); break;
    case 'visit': act({ t: 'observe', key: 'visit', fish: fs_[0]?.id, spot: decorId }); break;
    case 'bubbles': act({ t: 'observe', key: 'bubbles', fish: (fs_.find((f) => (f.traits ?? []).includes('Playful')) ?? fs_[0])?.id }); break;
    case 'friends': if (pair) act({ t: 'observe', key: 'together', fish: pair.id, with: pair.pal }); break;
    case 'investigate': if (cur) act({ t: 'observe', key: 'object', fish: cur.id, spot: decorId }); break;
    case 'favourite': if (spotFish) act({ t: 'observe', key: 'regular', fish: spotFish.id, spot: spotFish.spotId }); break;
    case 'plant': if (t.shells >= 6) act({ t: 'buyDecor', type: 'grass', x: ((t.decor.length * 1.3) % 8) - 4, z: 1 + (t.decor.length % 3), ry: 0 }); break;
    default: break;                                                  // play / play3 / care / care2 happen through the visit's normal play and care
  }
}

function spend(R, t, act, bought, now, log) {
  const want = () => [...Object.entries(R.SPECIES_DEF).map(([k, d]) => ({ kind: 'fish', k, ...d })), ...Object.entries(R.DECOR_DEF).map(([k, d]) => ({ kind: 'decor', k, ...d }))].filter((x) => x.level <= t.level).sort((a, b) => a.price - b.price);
  for (let guard = 0; guard < 10; guard++) {
    const room = (x) => t.fish.length + R.pending(t) + (t.eggs?.length ?? 0) + x.count <= R.capacity(t.level), unlocked = want();
    const newFish = unlocked.filter((x) => x.kind === 'fish' && !bought.has(x.k) && room(x)), free = t.decor.length < R.MAX_DECOR;
    const newDecor = unlocked.filter((x) => x.kind === 'decor' && !bought.has(x.k) && free);
    if (newFish.length && t.shells < newFish[0].price) break;
    if (!newFish.length && newDecor.length && t.shells < newDecor[0].price) break;
    const order = [...newFish, ...newDecor, ...unlocked.filter((x) => x.kind === 'decor' && free), ...unlocked.filter((x) => x.kind === 'fish' && room(x))];
    const pick = order.find((x) => t.shells >= x.price); if (!pick) break;
    const r = pick.kind === 'fish' ? act({ t: 'buyFish', species: pick.k, name: pick.label, seed: now }) : act({ t: 'buyDecor', type: pick.k, x: ((t.decor.length * 1.3) % 8) - 4, z: 1 + (t.decor.length % 3), ry: 0 });
    if (!r.ok) break; bought.add(pick.k); log.bought[pick.kind]++;
  }
}

function snap(R, t, at, ledger, log, start) {
  const sum = (sign) => Object.entries(ledger).filter(([k]) => k[0] === sign).reduce((n, [, v]) => n + v, 0), day = Math.round((at - start) / DAY);
  const found = (re) => t.fish.reduce((n, f) => n + (f.found ?? []).filter((x) => re.test(x)).length, 0);
  return { day, level: t.level, score: R.scoreOf(t, at), balance: t.shells, earned: sum('+'), spent: -sum('-'), fish: t.fish.length, fishBought: log.bought.fish, decorBought: log.bought.decor, decor: t.decor.length, deaths: (t.memorial ?? []).length, seen: t.seen.fish.length + t.seen.decor.length, of: R.COLLECTION_SIZE(), wishIdx: t.wishIdx, dailyDone: log.wishDays.size, milestones: found(/^(age14|age30)$/) + found(/^(spot|friend)$/), visits: log.visits, ledger: { ...ledger } };
}

const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1), f1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : '-'), f0 = (n) => (Number.isFinite(n) ? Math.round(n) : '-');
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const only = arg('only')?.split(','), SEEDS = +(arg('seeds') || 5), DAYS = +(arg('days') || 90), level8 = arg('level8') ? +arg('level8') : null, json = process.argv.includes('--json');
  const sets = level8 ? [['current', level8]] : [['baseline', null], ['current', null]], out = {}, K = (id, which, l8) => `${id}|${which}${l8 ? l8 : ''}`;
  for (const [id, sc] of Object.entries(SCENARIOS)) {
    if (only && !only.includes(id)) continue;
    for (const [which, l8] of sets) { const runs = []; for (let s = 1; s <= SEEDS; s++) runs.push(await run(which, sc, DAYS, s, l8)); out[K(id, which, l8)] = { sc, runs: runs.map((r) => ({ log: { ...r.log, wishDays: [...r.log.wishDays] } })) }; }
  }
  if (json) { console.log(JSON.stringify(out)); process.exit(0); }
  const days = [7, 14, 30, 60, 90].filter((d) => d <= DAYS);
  console.log(`Seeds: ${SEEDS}. Values are means across seeds. Earned/Spent are per day over the period.\n`);
  for (const [id, sc] of Object.entries(SCENARIOS)) {
    if (only && !only.includes(id)) continue; console.log(`### ${sc.label}\n`);
    console.log('| Rules | Day | Earned/day | Spent/day | Balance | Shells per visit | Level | Score | Fish | Fish bought | Decor bought | Deaths | Milestones | Daily wishes | Book |'); console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const [which, l8] of sets) for (const d of days) {
      const S = out[K(id, which, l8)].runs.map((r) => r.log.snaps[d]); const m = (k) => mean(S.map((x) => x[k]));
      console.log(`| ${which}${l8 ? ' L8=' + l8 : ''} | ${d} | ${f1(m('earned') / d)} | ${f1(m('spent') / d)} | ${f0(m('balance'))} | ${f1(m('earned') / Math.max(1, m('visits')))} | ${f1(m('level'))} | ${f0(m('score'))} | ${f0(m('fish'))} | ${f0(m('fishBought'))} | ${f0(m('decorBought'))} | ${f1(m('deaths'))} | ${f0(m('milestones'))} | ${f0(m('dailyDone'))} | ${f0(m('seen'))}/${S[0].of} |`);
    }
    for (const [which, l8] of sets) { const R_ = out[K(id, which, l8)].runs; const lv = (n) => { const v = R_.map((r) => r.log.level[n]).filter((x) => x != null); return v.length ? `${f1(mean(v))} (${v.length}/${R_.length} reached; ${f1(Math.min(...v))}-${f1(Math.max(...v))})` : `none of ${R_.length}`; };
      console.log(`\n${which}${l8 ? ' L8=' + l8 : ''}: level 5 day ${lv(5)}, level 7 day ${lv(7)}, **level 8 day ${lv(8)}**`); }
    for (const [which, l8] of sets) { const key = K(id, which, l8), L = {}; for (const r of out[key].runs) for (const [k, v] of Object.entries(r.log.snaps[DAYS].ledger)) L[k] = (L[k] ?? 0) + v / out[key].runs.length;
      const top = (sign) => Object.entries(L).filter(([k]) => k[0] === sign).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).map(([k, v]) => `${k.slice(1)} ${f1(Math.abs(v) / DAYS)}`).join(', ');
      console.log(`\n- ${which} income/day by source: ${top('+')}\n- ${which} spending/day: ${top('-')}`); }
    if (sc.away) for (const [which, l8] of sets) { const a = out[K(id, which, l8)].runs.map((r) => r.log.away).filter(Boolean); if (a.length) console.log(`- ${which} on return after 7 days (mean of ${a.length}): fish ${f1(mean(a.map((x) => x.before.fish)))} before, ${f1(mean(a.map((x) => x.arrival.fish)))} after; deaths ${f1(mean(a.map((x) => x.arrival.deaths)))}; floating ${f1(mean(a.map((x) => x.arrival.floaters)))}; water ${f1(mean(a.map((x) => x.arrival.water)))}; hunger ${f1(mean(a.map((x) => x.arrival.hunger)))}; worst neglect ${f1(mean(a.map((x) => x.arrival.worstAilDays)))} days`); }
    console.log('');
  }
}

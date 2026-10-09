// Lightweight usage tracking. Only random ids, event names and a number. No names, no IPs, no content of messages.
// Players (individual) and tanks (shared) are counted separately: three people opening one tank is three players and one tank.
const DAY = 864e5, dayOf = (ts) => Math.floor(ts / DAY);
export const CARE = new Set(['fish_fed', 'glass_cleaned', 'water_changed']);
export const FISH = new Set(['fish_played_with', 'fish_inspected']);
export const DECOR = new Set(['decoration_placed']);
export const SOCIAL = new Set(['nudge_sent', 'bottle_sent', 'bottle_opened', 'friend_thanked', 'friend_invited', 'friend_joined']);
export const CLIENT_EVENTS = new Set(['fish_inspected', 'journal_opened', 'friend_invited', 'book_opened', 'hidden', 'visible']);
export const ALL_EVENTS = ['session_started', 'session_ended', 'fish_fed', 'glass_cleaned', 'water_changed', 'fish_inspected', 'fish_played_with', 'decoration_placed', 'shells_earned', 'shells_spent', 'gift_collected', 'visitor_greeted', 'fish_arrived', 'egg_hatched', 'journal_opened', 'book_opened', 'daily_wish_completed', 'discovery_unlocked', 'friend_invited', 'friend_joined', 'nudge_sent', 'bottle_sent', 'bottle_opened', 'friend_thanked', 'fish_died', 'fish_laid_to_rest', 'level_up', 'fish_milestone', 'fish_wish_granted', 'plants_trimmed'];

export function makeAnalytics(db) {
  const ins = db.prepare('INSERT INTO events (ts,user_id,tank_id,type,n) VALUES (?,?,?,?,?)');
  const record = (userId, tankId, type, n = null, ts = Date.now()) => { try { ins.run(ts, userId ?? null, tankId ?? null, type, n); } catch { /* never let tracking break the game */ } };
  const prune = (now = Date.now()) => { try { db.prepare('DELETE FROM events WHERE ts<?').run(now - 400 * DAY); } catch { /* ignore */ } };
  // turn what happened in one action into tracked events
  function fromAction(userId, tankId, action, r, before, after, now = Date.now()) {
    if (!r.ok || r.dup) return;
    const applied = r.applied !== false, t = action.t;
    const map = { feed: 'fish_fed', glass: 'glass_cleaned', water: 'water_changed', buyDecor: 'decoration_placed', collect: 'gift_collected', greet: 'visitor_greeted', pet: 'fish_played_with', bottle: 'bottle_sent', openBottle: 'bottle_opened', scoop: 'fish_laid_to_rest', trim: 'plants_trimmed' };
    if (map[t] && applied) record(userId, tankId, map[t], null, now);
    if (after > before) record(userId, tankId, 'shells_earned', after - before, now); else if (after < before) record(userId, tankId, 'shells_spent', before - after, now);
    for (const e of r.events ?? []) { if (e.dailyDone) record(userId, tankId, 'daily_wish_completed', null, now); if (e.noticed || e.discovery) record(userId, tankId, 'discovery_unlocked', null, now); if (e.levelUp) record(userId, tankId, 'level_up', e.levelUp, now); if (e.milestone) record(userId, tankId, 'fish_milestone', null, now); if (e.wishDone) record(userId, tankId, 'fish_wish_granted', null, now); }
  }
  function fromTick(tankId, events, now = Date.now()) {
    for (const e of events) { if (e.arrival) record(null, tankId, /hatched/.test(e.toast ?? '') ? 'egg_hatched' : 'fish_arrived', e.arrival.length, now); if (e.died) record(null, tankId, 'fish_died', null, now); if (e.noticed || e.discovery) record(null, tankId, 'discovery_unlocked', null, now); if (e.levelUp) record(null, tankId, 'level_up', e.levelUp, now); if (e.milestone) record(null, tankId, 'fish_milestone', null, now); if (e.wishDone) record(null, tankId, 'fish_wish_granted', null, now); }
  }
  function stats(now = Date.now(), days = 30) {
    const since = now - days * DAY, rows = db.prepare('SELECT ts,user_id,tank_id,type,n FROM events WHERE ts>=? ORDER BY ts').all(since);
    const byDay = (pred) => { const m = new Map(); for (const r of rows) if (pred(r)) { const d = dayOf(r.ts); if (!m.has(d)) m.set(d, new Set()); m.get(d).add(r.user_id ?? '-'); } return m; };
    const dayRows = (m) => [...m.entries()].sort((a, b) => a[0] - b[0]).map(([d, s]) => ({ day: new Date(d * DAY).toISOString().slice(0, 10), n: s.size }));
    const sess = rows.filter((r) => r.type === 'session_ended' && r.user_id), starts = rows.filter((r) => r.type === 'session_started' && r.user_id);
    // players
    const activeUsersByDay = byDay((r) => r.user_id && r.type !== 'session_ended' || (r.type === 'session_started'));
    const dau = dayRows(activeUsersByDay), usersAll = new Set(rows.filter((r) => r.user_id).map((r) => r.user_id));
    const durations = sess.map((r) => r.n ?? 0).filter((x) => x > 0), avgDur = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const perUserDay = new Map(); for (const r of starts) { const k = r.user_id + ':' + dayOf(r.ts); perUserDay.set(k, (perUserDay.get(k) ?? 0) + 1); }
    const visitsPerPlayerDay = perUserDay.size ? [...perUserDay.values()].reduce((a, b) => a + b, 0) / perUserDay.size : 0;
    const gaps = []; const lastStart = new Map(); for (const r of starts) { const p = lastStart.get(r.user_id); if (p != null && r.ts - p > 60e3) gaps.push((r.ts - p) / 3600e3); lastStart.set(r.user_id, r.ts); }
    gaps.sort((a, b) => a - b); const medianGapH = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;
    // sessions: what happened inside each
    const sessWin = starts.map((st) => { const en = sess.find((e) => e.user_id === st.user_id && e.ts >= st.ts); return { user: st.user_id, a: st.ts, b: en ? en.ts : st.ts + 5 * 60e3 }; });
    const inWin = (w) => rows.filter((r) => r.user_id === w.user && r.ts >= w.a && r.ts <= w.b && !['session_started', 'session_ended', 'hidden', 'visible'].includes(r.type));
    let care = 0, fish = 0, decor = 0, social = 0, acts = 0; for (const w of sessWin) { const ev = inWin(w); acts += ev.length; if (ev.some((r) => CARE.has(r.type))) care++; if (ev.some((r) => FISH.has(r.type))) fish++; if (ev.some((r) => DECOR.has(r.type))) decor++; if (ev.some((r) => SOCIAL.has(r.type))) social++; }
    const nS = sessWin.length || 1, pct = (x) => Math.round((100 * x) / nS);
    // retention by first-seen day
    const first = new Map(); const seenDays = new Map(); for (const r of rows) if (r.user_id) { const d = dayOf(r.ts); if (!first.has(r.user_id) || first.get(r.user_id) > d) first.set(r.user_id, d); if (!seenDays.has(r.user_id)) seenDays.set(r.user_id, new Set()); seenDays.get(r.user_id).add(d); }
    const ret = (n) => { let elig = 0, back = 0; for (const [u, d0] of first) { if (dayOf(now) - d0 < n) continue; elig++; if (seenDays.get(u).has(d0 + n)) back++; } return { eligible: elig, returned: back, pct: elig ? Math.round((100 * back) / elig) : null }; };
    // usage per interaction
    const counts = Object.fromEntries(ALL_EVENTS.map((t) => [t, 0])); for (const r of rows) counts[r.type] = (counts[r.type] ?? 0) + 1;
    const used = Object.entries(counts).filter(([t]) => !['session_started', 'session_ended', 'hidden', 'visible'].includes(t)).sort((a, b) => b[1] - a[1]);
    // tanks (shared)
    const tankDay = byDay((r) => r.tank_id && r.type !== 'session_ended'); const tanksByDay = new Map(); for (const r of rows) if (r.tank_id) { const d = dayOf(r.ts); if (!tanksByDay.has(d)) tanksByDay.set(d, new Set()); tanksByDay.get(d).add(r.tank_id); }
    const activeTanks = [...tanksByDay.entries()].sort((a, b) => a[0] - b[0]).map(([d, s]) => ({ day: new Date(d * DAY).toISOString().slice(0, 10), n: s.size }));
    const caretakers = new Map(); for (const r of rows) if (r.tank_id && r.user_id) { const k = r.tank_id + ':' + dayOf(r.ts); if (!caretakers.has(k)) caretakers.set(k, new Set()); caretakers.get(k).add(r.user_id); }
    const cs = [...caretakers.values()].map((s) => s.size), avgCare = cs.length ? cs.reduce((a, b) => a + b, 0) / cs.length : 0, multi = cs.length ? Math.round((100 * cs.filter((x) => x >= 2).length) / cs.length) : 0;
    const levels = db.prepare('SELECT world FROM tanks').all().map((r) => { try { return JSON.parse(r.world)?.level ?? 1; } catch { return 1; } });
    const levelDist = {}; for (const l of levels) levelDist[l] = (levelDist[l] ?? 0) + 1;
    return {
      window: { days, from: new Date(since).toISOString().slice(0, 10), events: rows.length },
      players: { dailyActive: dau, distinctPlayers: usersAll.size, sessions: sessWin.length, avgSessionSeconds: Math.round(avgDur), visitsPerPlayerPerActiveDay: +visitsPerPlayerDay.toFixed(2), medianHoursBetweenVisits: +medianGapH.toFixed(1), actionsPerSession: +(acts / nS).toFixed(1), sessionsWithCarePct: pct(care), sessionsWithFishInteractionPct: pct(fish), sessionsWithDecorationPct: pct(decor), sessionsWithSocialPct: pct(social), retention: { day1: ret(1), day7: ret(7), day30: ret(30) } },
      interactions: { mostUsed: used.filter(([, n]) => n > 0).slice(0, 8), leastUsed: used.slice().reverse().slice(0, 8), all: Object.fromEntries(used) },
      tanks: { activeTanksPerDay: activeTanks, tanksTotal: levels.length, avgActiveCaretakersPerTankDay: +avgCare.toFixed(2), tankDaysWithTwoOrMorePlayersPct: multi, levelDistribution: levelDist, fishDeaths: counts.fish_died ?? 0, discoveries: counts.discovery_unlocked ?? 0, dailyWishesCompleted: counts.daily_wish_completed ?? 0, friendInteractions: SOCIAL ? [...SOCIAL].reduce((a, t) => a + (counts[t] ?? 0), 0) : 0 },
    };
  }
  return { record, prune, fromAction, fromTick, stats };
}

// Emergent Life: habits that grow out of what the animals really do, and fade when they stop; keepsakes that gather a history; young
// animals that take to the places their family used; companions that notice who is missing. Pure functions, run on the server for a
// shared tank and on the phone for a solo one (from rules.js), so every phone sees the same animal.
//
// What it builds on (nothing here is a second copy of it):
//   octopus  f.mem.fam[decorId] = { k, n, x, z, at, ... }  how well it knows each thing (rules.js octoTouch); here: when in the day it goes (tod),
//            on how many days (days, dl), and the slow fading of what it has stopped visiting
//   seahorse f.log.hitch[decorId] = [secs, visits, x, z]     its holdfasts (rules.js fishLog); here: the slow fading, and its family's plant
//   fish     f.log.lv (where it spends its time), f.spotId, f.pal, f.rival
//   keepsake t.keeps[i] (adventures.js); here: k.h = { carries, days, places, denAt, by }
// Bounded: at most three habits per animal, four past places per keepsake, seven carry days, a few lines of history.

const DAY = 864e5, HOUR = 3600e3;
export const LIFE = { HABIT_DAYS: 3, HABIT_GAP: 10 * DAY, FADE_AFTER: 3 * DAY, FAM_FADE: 0.96, HOLD_FADE: 0.97, AREA_FADE: 0.95, LOSS_DAYS: 3, CARRY_DAYS: 3 };
export const TOD = ['morning', 'afternoon', 'evening', 'night'];
// the tank's own local hour (the time zone its caretakers' phones report with the daily gift), so a "morning" habit is their morning
export const todOf = (t, now) => { const h = new Date(now + (Number(t.tzMin) || 0) * 60e3).getUTCHours(); return h >= 5 && h < 11 ? 0 : h < 17 ? 1 : h < 22 ? 2 : 3; };

// an octopus handled a decoration: when in its day, and on which day (the day count is what turns a few visits into a habit)
export function noteVisit(t, f, e, now) {
  const tod = todOf(t, now), d = Math.floor(now / DAY); e.tod ||= [0, 0, 0, 0]; e.tod[tod] = Math.min(99, e.tod[tod] + 1);
  if (e.dl !== d) { e.dl = d; e.days = Math.min(99, (e.days ?? 0) + 1); }
}

// Once a day: habits form or fade, families and companions are noticed. Only what the records show.
export function lifeDay(t, now, ev, R) {
  t.life ||= {}; const d = Math.floor(now / DAY); if (t.life.day === d) return; const first = t.life.day == null; t.life.day = d;
  if (first) { t.life.dead = (t.memorial ?? []).map((m) => m.id).slice(-30); return; }      // (an older tank: start counting from today, nothing is announced about the past)
  const label = (id) => { const x = t.decor.find((q) => q.id === id); return x ? (R.DECOR_DEF[x.type]?.label ?? 'decoration') : null; };
  for (const f of t.fish) {
    if (f.dead || f.away) continue;
    // octopus: what it no longer visits slowly matters less to it; a thing it goes to at the same time of day, on several days, is a habit
    if (R.isOcto(f) && f.mem?.fam) {
      for (const e of Object.values(f.mem.fam)) if (e && !e.gone && now - (e.at ?? 0) > LIFE.FADE_AFTER) { e.k = +Math.max(0.05, (e.k ?? 0) * LIFE.FAM_FADE).toFixed(3); if (e.tod) e.tod = e.tod.map((x) => Math.floor(x * 0.9)); }
      R.memCap(t, f, now);
      const H = Object.entries(f.mem.fam).filter(([id, e]) => e && !e.gone && label(id) && (e.days ?? 0) >= LIFE.HABIT_DAYS && now - (e.at ?? 0) < 4 * DAY && e.tod).map(([id, e]) => { const tot = e.tod.reduce((a, b) => a + b, 0), i = e.tod.indexOf(Math.max(...e.tod)); return { id, tod: i, share: tot ? e.tod[i] / tot : 0, days: e.days }; }).filter((h) => h.share >= 0.5).sort((a, b) => b.days - a.days).slice(0, 3);
      const was = new Set((f.habits ?? []).map((h) => h.id + ':' + h.tod)); f.habits = H.map((h) => ({ id: h.id, tod: h.tod, days: h.days }));
      const mo = (f.moments ||= {}), told = (mo.habits ||= []), fresh = H.find((h) => !was.has(h.id + ':' + h.tod) && !told.includes(h.id + ':' + h.tod));      // each habit is told once in its life, however often it fades and comes back
      if (fresh && now - (mo.habit ?? 0) > LIFE.HABIT_GAP) { mo.habit = now; told.push(fresh.id + ':' + fresh.tod); if (told.length > 8) told.shift(); const line = `${f.name} has taken to visiting the ${label(fresh.id).toLowerCase()} every ${TOD[fresh.tod]}.`; ev.push({ journal: line, story: f.id, text: line, life: 'habit' }); }
      if (!f.habits.length) delete f.habits;
    }
    // seahorse and fish: holdfasts and favourite areas fade a little each day, so a new favourite can win
    const L = f.log; if (L?.hitch) for (const h of Object.values(L.hitch)) h[0] = Math.round(h[0] * LIFE.HOLD_FADE);
    if (L?.lv) for (const k of Object.keys(L.lv)) L.lv[k] = Math.round(L.lv[k] * LIFE.AREA_FADE);
    // a young one that has, on its own, come to love the plant its parent loved
    const own = L?.fav ?? (!R.isOcto(f) && f.species !== 'seahorse' ? f.spotId : null);      // a seahorse's holdfast; a fish's favourite spot
    if (own && !(f.moments?.famPlace) && (f.parents ?? []).length) {
      const par = (f.parents ?? []).map((p) => t.fish.find((x) => x.id === p.id) ?? (t.memorial ?? []).find((m) => m.id === p.id)).find((p) => p && (p.log?.fav ?? p.spotId ?? p.place?.id) === own);
      if (par && label(own)) { (f.moments ||= {}).famPlace = now; const kin = f.species === 'seahorse' ? (f.sex === 'm' ? 'son' : 'daughter') : 'young one', line = `${par.name}'s ${kin} ${f.name} has taken a liking to the same ${label(own).toLowerCase()}.`; ev.push({ journal: line, story: f.id, text: line, life: 'family' }); }
    }
  }
  // someone it knew is gone (old age): for a few days a companion keeps going back to where they used to be together. No meter, no penalty.
  const known = new Set(t.life.dead ?? []);
  for (const m of (t.memorial ?? []).filter((x) => !known.has(x.id))) {
    known.add(m.id); const close = t.fish.filter((f) => !f.dead && (f.pal === m.id || f.mate === m.id || f.partner === m.id || f.buddy === m.id));
    for (const f of close) { const place = (m.place?.id && label(m.place.id)) ? m.place.id : f.spotId && label(f.spotId) ? f.spotId : null; f.loss = { id: m.id, name: m.name, at: now, until: now + LIFE.LOSS_DAYS * DAY, place };
      if (place) ev.push({ story: f.id, text: `Keeps going back to the ${label(place).toLowerCase()}, where it used to be with ${m.name}.` }); }
  }
  t.life.dead = [...known].slice(-30);
  for (const f of t.fish) if (f.loss && now > f.loss.until) delete f.loss;
}

// A keepsake carried or dropped (the phone running the animals reports it; one report per move, checked here). A thing carried on several
// different days and finally left by its den is a small milestone, said once.
// ── Decorations keep a small history of their own: who first came to it, who keeps coming (by days, not touches), where it has stood,
// and whether two generations of one family have both made it theirs. d.h = { first, by: { [id]: [days, lastDay, name] } ≤6, moves ≤3, gen } ──
export function decorVisit(t, d, f, now, ev, R) {
  if (!d || !f) return; const h = (d.h ||= { by: {}, moves: [] }), day = Math.floor(now / DAY); h.first ||= { id: f.id, name: f.name, at: now };
  const e = (h.by[f.id] ||= [0, -1, f.name]); if (e[1] === day) return; e[1] = day; e[0] = Math.min(999, e[0] + 1); e[2] = f.name;
  const ids = Object.keys(h.by); if (ids.length > 6) delete h.by[ids.sort((a, b) => h.by[a][0] - h.by[b][0])[0]];
  // a young one now comes here on its own, on several days, where its parent also came on several days: two generations
  if (h.gen || e[0] < 3) return; const par = (f.parents ?? []).find((p) => (h.by[p.id]?.[0] ?? 0) >= 3 || (t.memorial ?? []).find((m) => m.id === p.id)?.place?.id === d.id);
  if (!par) return; h.gen = { a: par.id, an: par.name, b: f.id, bn: f.name, at: now }; const lbl = (R.DECOR_DEF[d.type]?.label ?? 'decoration').toLowerCase();
  const line = `The ${lbl} has seen two generations now: first ${par.name}, and now ${f.name}.`; ev.push({ journal: line, story: f.id, text: line, life: 'generations' });
}
export function decorMoved(d, now, from = null) { const h = (d.h ||= { by: {}, moves: [] }); h.moves.push({ x: d.x, z: d.z, at: now, ...(from ? { from: { x: from.x, z: from.z } } : {}) }); if (h.moves.length > 3) h.moves.shift(); }
export function decorStory(t, d, R, day0 = t.createdAt ?? 0) {
  const h = d?.h; if (!h?.first) return null; const day = (ms) => Math.floor((ms - day0) / DAY) + 1, top = Object.entries(h.by).sort((a, b) => b[1][0] - a[1][0])[0];
  const out = [`${h.first.name} found it first, on day ${day(h.first.at)}`]; if (top && top[1][0] >= 3) out.push(`${top[1][2]} has come back on ${top[1][0]} days`); if (h.gen) out.push(`two generations: ${h.gen.an}, then ${h.gen.bn}`); if (h.moves?.length) out.push(`moved ${h.moves.length === 3 ? '3 or more' : h.moves.length} time${h.moves.length === 1 ? '' : 's'}`);
  return `${R.DECOR_DEF[d.type]?.label ?? 'Decoration'}: ${out.join('; ')}.`;
}

export function carried(t, k, f, how, now, ev, R) {
  const h = (k.h ||= { carries: 0, days: [], places: [] }), d = Math.floor(now / DAY);
  h.places.push({ x: k.x, z: k.z, at: now }); if (h.places.length > 4) h.places.shift();
  if (!f) return; h.by ||= {}; h.by[f.id] = Math.min(999, (h.by[f.id] ?? 0) + 1); const ids = Object.keys(h.by); if (ids.length > 4) delete h.by[ids.sort((a, b) => h.by[a] - h.by[b])[0]];
  if (how === 'carry' || how === 'drop') { h.carries++; if (!h.days.includes(d)) { h.days.push(d); if (h.days.length > 7) h.days.shift(); } }
  if (k.by && f.id !== k.by) { h.movedBy = { id: f.id, name: f.name, at: now }; const o = t.fish.find((x) => x.id === k.by && !x.dead); if (o) ev.push({ story: o.id, text: `${f.name} moved its ${(R.KEEPSAKES[k.k]?.label ?? 'keepsake').toLowerCase()}. It went straight over to check.` }); return; }      // someone else's: the owner notices (the phone sends it over to look)
  if (how === 'drop' || !R.isOcto(f)) return;
  const den = t.decor.find((x) => x.id === f.home), atDen = den && Math.hypot(den.x - k.x, den.z - k.z) < 2.0, name = R.KEEPSAKES[k.k]?.label.toLowerCase() ?? 'keepsake';
  if (atDen && !h.denAt) h.denAt = now;
  if (atDen && h.days.length >= LIFE.CARRY_DAYS && !h.said) { h.said = now; const line = `${f.name} has been carrying the ${name.replace(/^piece of /, '')} around for ${h.days.length} days. It finally left it beside the ${(R.DECOR_DEF[den.type]?.label ?? 'den').toLowerCase()}.`; ev.push({ journal: line, story: f.id, text: line, life: 'keepsake' }); }
}
// a keepsake's story, from its record only (shown on the profile of the animal that found it, and in its memorial)
export function keepStory(t, k, R, day0 = t.createdAt ?? 0) {
  const day = (ms) => Math.floor((ms - day0) / DAY) + 1, out = [], name = R.KEEPSAKES[k.k]?.label ?? 'Keepsake';
  out.push(k.byName ? `${k.byName} found it on day ${day(k.at)}` : `It turned up on day ${day(k.at)}`);
  if (k.h?.carries) out.push(`carried ${k.h.carries} time${k.h.carries === 1 ? '' : 's'}`);
  { const o = Object.entries(k.h?.visits ?? {}).filter(([id, v]) => id !== k.by && v[0] >= 2).sort((a, b) => b[1][0] - a[1][0])[0]; if (o) out.push(`${o[1][2]} has come to look at it on ${o[1][0]} days`); }      // someone else's interest in it, from the record
  if (k.h?.denAt) { const end = (t.memorial ?? []).find((m) => m.id === k.by)?.died ?? Date.now(); const n = Math.max(1, Math.round((end - k.h.denAt) / DAY)); out.push(`kept beside its den for ${n} day${n === 1 ? '' : 's'}`); }
  return `${name}: ${out.join(', ')}.`;
}

// A visitor that has been here before is remembered: when it first came, how often, who it met, the place it went to. It comes back to
// that place and stays a little longer each time (up to double).
export function visitorArrives(t, v, now, R) {
  const M = ((t.visitMem ||= {})[v.species] ||= { first: now, n: 0, last: null, met: [], spot: null }); M.n++; const back = M.n > 1;
  if (back) v.until = now + Math.min(2, 1 + 0.25 * (M.n - 1)) * 3 * HOUR;
  M.last = now; M.met = [...new Set([...M.met, ...t.fish.filter((f) => !f.dead && !f.away).map((f) => f.id)])].slice(-6);
  if (!M.spot || !t.decor.some((d) => d.id === M.spot)) M.spot = t.decor.length ? t.decor[Math.floor((now / 6e4) % t.decor.length)].id : null;
  v.spot = M.spot; v.n = M.n; return M;
}

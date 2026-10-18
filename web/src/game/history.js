// Living History: what the tank keeps of its own past. Pure functions, run on the server for a shared tank and on the phone for a solo one
// (from rules.js), so every caretaker sees the same history.
//
//   f.mem.keeps[keepId] = { k, n, at, first }   how well an octopus knows a keepsake (only from really handling it, reported like any touch)
//   f.denMem = { id, objs: [keepId ≤6], since, said }   its den and what lies beside it (from where things really are)
//   f.moments.anniv = [days told]                    anniversaries already written
//   t.capsules = [{ day, at, jid?, ... }]            time capsules: the tank as it was on day 1, 7, 30 and every 30 days (≤ 40 kept, metadata only)
//   t.history = [{ id, day, at, kind, text, ref }]   the tank's own timeline (≤ 200, oldest milestones thinned, never capsules or births/deaths)
//   t.visitMem[species].stay = { at, asked }         a visitor that may stay (life.js keeps the rest of its memory)

const DAY = 864e5;
export const HIST = { MAX: 200, CAPSULES: 40, KEEP_MEM: 6, KEEP_FADE: 0.985, KEEP_FLOOR: 0.15, DEN_OBJS: 6, DEN_R: 2.0, STAY_VISITS: 3, STAY_GAP: 30 * DAY };
export const dayOfTank = (t, now) => Math.floor((now - (t.createdAt ?? now)) / DAY) + 1;

// ── An octopus handled a keepsake (the phone reports it like any other touch). Familiarity grows with each go and never jumps. ──
export function touchKeep(t, f, k, now) {
  const m = (f.mem ||= { fav: null, fam: {}, likes: [], fish: {} }), K = (m.keeps ||= {}), e = (K[k.id] ||= { k: 0, n: 0, at: 0, first: now });
  if (now - e.at < 45e3) return false; e.k = +Math.min(1, e.k + (k.by === f.id ? 0.18 : 0.1) * (1 - e.k)).toFixed(3); e.n++; e.at = now;
  const ids = Object.keys(K).filter((i) => i !== k.id); if (ids.length >= HIST.KEEP_MEM) delete K[ids.sort((a, b) => K[a].k - K[b].k)[0]];      // (the least known other one goes, never the one in its arms)
  const h = (k.h ||= { carries: 0, days: [], places: [] }), V = (h.visits ||= {}), day = Math.floor(now / DAY), v = (V[f.id] ||= [0, -1, f.name]);      // the keepsake remembers who comes to it: days each, at most six
  if (v[1] !== day) { v[1] = day; v[0] = Math.min(999, v[0] + 1); v[2] = f.name; const vs = Object.keys(V); if (vs.length > 6) delete V[vs.sort((a, b) => V[a][0] - V[b][0])[0]]; }
  return true;
}
// does it know this keepsake? (a check the phone and the tests use: the same answer everywhere)
export const knowsKeep = (f, id) => (f?.mem?.keeps?.[id]?.k ?? 0) >= 0.3;

// ── Once a day ──
export function historyDay(t, now, ev, R) {
  const d = dayOfTank(t, now);
  for (const f of t.fish) {
    if (f.dead) continue;
    // keepsakes it has not handled for a week slowly matter less, but one of its own stays known
    for (const [id, e] of Object.entries(f.mem?.keeps ?? {})) { const k = (t.keeps ?? []).find((q) => q.id === id); if (!k) { delete f.mem.keeps[id]; continue; } if (now - e.at > 7 * DAY) e.k = +Math.max(k.by === f.id && e.k >= 0.3 ? 0.3 : 0, e.k * HIST.KEEP_FADE).toFixed(3);      /* (one of its own it once knew stays known) */ }
    // an octopus's den: the shelter it uses, and the keepsakes really lying beside it
    if (R.isOcto(f) && !f.away) { const den = t.decor.find((x) => x.id === f.home);
      if (!den) { if (f.denMem) f.denMem = { ...f.denMem, id: null, objs: [] }; }
      else { const objs = (t.keeps ?? []).filter((k) => Math.hypot(k.x - den.x, k.z - den.z) < HIST.DEN_R).map((k) => k.id).slice(0, HIST.DEN_OBJS); const D = (f.denMem && f.denMem.id === den.id) ? f.denMem : (f.denMem = { id: den.id, objs: [], since: now });
        D.objs = objs; if (objs.length >= 3 && !D.said && objs.slice(0, 3).some((id) => R.KEEPSAKES[(t.keeps.find((k) => k.id === id) ?? {}).k])) { D.said = now; const names = objs.slice(0, 3).map((id) => R.KEEPSAKES[(t.keeps.find((k) => k.id === id) ?? {}).k]?.label.toLowerCase()).filter(Boolean); const lbl = (R.DECOR_DEF[den.type]?.label ?? 'den').toLowerCase();
          const line = `${f.name}'s ${lbl} has ${names.length > 1 ? `${names.slice(0, -1).map((x) => `a ${x}`).join(', ')} and a ${names.at(-1)}` : `a ${names[0]}`} beside it now. It is starting to look like home.`; ev.push({ journal: line, story: f.id, text: line, hist: 'den' }); } } }
    // anniversaries: how long it has been part of the tank, at days that suit its kind of life; only facts that are recorded
    const days = Math.floor((now - (f.arrived ?? f.born)) / DAY), L = R.lifeOf(f), told = ((f.moments ||= {}).anniv ||= []);
    for (const a of [7, 60, 90, 180, 365]) if (days >= a && days < a + 7 && a < L * 0.95 && !told.includes(a)) { told.push(a); const line = anniversaryLine(t, f, a, R); ev.push({ journal: line, story: f.id, text: line, anniv: a, hist: 'anniv' }); }
  }
  // time capsules, by the tank's age: day 1, 7, 30 and every 30 days after. What it holds is what the tank really was that day.
  t.capsules ||= []; const due = [1, 7, 30].concat(d >= 60 ? [Math.floor(d / 30) * 30] : []).filter((x) => x <= d && x > d - 7 && !t.capsules.some((c) => c.day === x));
  { const all = [1, 7, 30]; for (let x = 60; x <= d; x += 30) all.push(x);      // a capsule day that went by while nobody opened the tank: said once, quietly, so the gap is not a mystery
    const miss = all.filter((x) => x <= d - 7 && x > d - 60 && !t.capsules.some((c) => c.day === x) && !(t.capMiss ?? []).includes(x)).at(-1);
    if (miss) { t.capMiss = [...(t.capMiss ?? []), miss].slice(-12); ev.push({ journal: `No time capsule for day ${miss}: the tank was quiet that week.`, hist: 'quiet', jat: Math.min(now, (t.createdAt ?? now) + (miss - 1) * DAY) }); } }
  for (const x of due.slice(-1)) { const c = capsule(t, now, x, R); t.capsules.push(c); if (t.capsules.length > HIST.CAPSULES) t.capsules.splice(1, 1);      // (the first one is always kept)
    ev.push({ journal: `Time capsule: day ${x}. ${c.line}`, capsule: x, hist: 'capsule' }); }
}
function anniversaryLine(t, f, a, R) {
  const day = (ms) => dayOfTank(t, ms), facts = [], m = f.advMem, pal = t.fish.find((x) => x.id === f.pal);
  facts.push(`It ${f.parents ? 'hatched' : 'arrived'} on day ${Math.max(1, day(f.arrived ?? f.born))}`);
  if (m?.items?.length) { const first = m.firstAt ?? m.items.reduce((a, x) => Math.min(a, x.at ?? Infinity), Infinity); if (Number.isFinite(first)) facts.push(`its first adventure was on day ${Math.max(1, day(first))}`); }
  const fav = (t.keeps ?? []).find((k) => k.by === f.id && R.KEEPSAKES[k.k]); if (fav) facts.push(`it keeps the ${R.KEEPSAKES[fav.k].label.toLowerCase()} it found`);
  const place = f.log?.fav ?? f.spotId ?? f.mem?.likes?.[0], d = place && t.decor.find((x) => x.id === place); if (d) facts.push(`its favorite place is the ${(R.DECOR_DEF[d.type]?.label ?? 'decoration').toLowerCase()}`);
  if (pal) facts.push(`it is best friends with ${pal.name}`);
  return `${a} days with ${f.name}. ${facts.slice(0, 3).join('; ')}.`.replace(/^(.)/, (c) => c.toUpperCase());
}
// the record of a capsule: who lived here, what stood here, what happened since the last one (from the tank's own timeline)
function capsule(t, now, day, R) {
  const prev = t.capsules.at(-1), since = prev?.at ?? 0, animals = t.fish.filter((f) => !f.dead).map((f) => ({ id: f.id, name: f.name, species: f.species, days: Math.max(0, Math.floor((now - f.born) / DAY)), away: !!f.away }));
  const events = (t.history ?? []).filter((h) => h.at > since && h.kind !== 'capsule').slice(-6).map((h) => ({ id: h.id, text: h.text }));
  const kinds = {}; for (const a of animals) kinds[a.species] = (kinds[a.species] ?? 0) + 1;
  const line = `${animals.length} animal${animals.length === 1 ? '' : 's'}, ${t.decor.length} decoration${t.decor.length === 1 ? '' : 's'}, level ${t.level}.`;
  return { day, at: now, level: t.level, decor: t.decor.length, decorTypes: [...new Set(t.decor.map((x) => x.type))].slice(0, 30), keeps: (t.keeps ?? []).length, animals: animals.slice(0, 30), n: animals.length, kinds, events, line };
}

// ── The tank's timeline: the lines that matter, with stable ids (the same event is never kept twice) ──
const KINDS = (e) => e.capsule ? 'capsule' : e.died ? 'death' : e.birth || e.hatched ? 'birth' : e.resident ? 'resident' : e.arrival ? 'arrival' : e.anniv ? 'anniversary' : e.hist === 'den' ? 'den' : e.hist === 'quiet' ? 'quiet' : e.adventure?.phase === 'back' && e.major ? 'adventure' : e.life === 'family' || e.life === 'generations' || e.hist === 'family' ? 'family' : e.life === 'keepsake' ? 'keepsake' : /are friends|best friends|time together/.test(e.journal ?? '') ? 'friendship' : e.hist === 'visitor' || /is back\. It has visited/.test(e.journal ?? '') ? 'visitor' : /became partners|are a pair now/.test(e.journal ?? '') ? 'pair' : null;
export function recordHistory(t, ev, now) {
  for (const e of ev) { if (!e.journal) continue; const kind = KINDS(e); if (!kind) continue; const at = Math.min(now, e.jat ?? now), id = `h${Math.floor(at / 1000)}:${e.journal.length}:${[...e.journal].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7).toString(36)}`;
    const H = (t.history ||= []); if (H.some((h) => h.id === id || (h.text === e.journal && Math.abs(h.at - at) < DAY))) continue;
    H.push({ id, day: dayOfTank(t, at), at, kind, text: e.journal, ref: e.story ?? e.died ?? e.birth ?? e.capsule ?? null });
    if (H.length > HIST.MAX) { const i = H.findIndex((h) => !['capsule', 'birth', 'death', 'arrival', 'resident'].includes(h.kind)); if (i >= 0) H.splice(i, 1); } }
}

// ── A visitor that keeps coming back may want to stay. Only for a kind of animal the tank can really keep (it lives as an ordinary fish:
// the shared meals, a lifespan, growing old), only when there is room, and the first answer from anyone decides. ──
export function stayOffer(t, v, now, R) {
  const M = t.visitMem?.[v.species], d = R.SPECIES_DEF[v.species]; if (!M || !d || d.resident === false) return false;
  if (M.n < HIST.STAY_VISITS || M.kept || (M.stay?.no && now - M.stay.no < HIST.STAY_GAP)) return false;
  if (t.fish.length + R.pending(t) >= R.capacity(t.level)) { if (!M.fullSaid || now - M.fullSaid > HIST.STAY_GAP) { M.fullSaid = now; v.full = true; } return false; }      // (it would like to stay, but there is no room: said once a month, so the reason is known)
  if (t.stayAskAt && now - t.stayAskAt < HIST.STAY_GAP) return false;      // one offer a month for the whole tank, answered or not: it stays special
  t.stayAskAt = now; M.asked = now; v.stay = true; return true;
}
export function decideStay(t, a, now, uid, name, R) {
  const v = t.visitor; if (!v || v.id !== a.id || !v.stay) return { ok: false, reason: v?.decided ? 'ALREADY' : 'NOT_FOUND' };
  if (v.decided) return { ok: true, applied: false, keep: v.decided === 'keep' };
  const M = t.visitMem[v.species], d = R.SPECIES_DEF[v.species];
  if (a.keep && t.fish.length + R.pending(t) >= R.capacity(t.level)) return { ok: false, reason: 'TANK_FULL' };
  M.stay = { at: now, by: uid };
  if (!a.keep) { v.decided = 'wander'; M.stay.no = now; return { ok: true, applied: true, keep: false, events: [{ journal: `The ${d.label} swam off again. It knows the way back.`, toast: 'It swam off. It may be back.', hist: 'visitor' }] }; }
  v.decided = 'keep'; M.kept = now; const id = `r${v.id}`;
  const f = R.ensureFish({ id, name: d.label.split(' ').pop(), species: v.species, seed: v.seed, born: now - 4 * DAY, arrived: now, stage: 'adult', traits: d.traits.slice(0, 2), happy: 0.8, health: 1, owner: null, resident: { from: v.id, visits: M.n, first: M.first } });
  t.fish.push(f); t.visitor = null; t.visitAt = now + 48 * 3600e3;      // it is not a visitor any more: it lives here now
  return { ok: true, applied: true, keep: true, fish: id, events: [{ journal: `The ${d.label} has decided to stay. After ${M.n} visits, this is its home now.`, toast: `The ${d.label} is staying!`, resident: id, story: id, text: `Came ${M.n} times as a visitor, then stayed${name ? ` (${name})` : ''}.`, arrival: [id] }] };
}

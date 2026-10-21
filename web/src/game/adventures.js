// Little Adventures: rare, quiet things that happen in the tank on their own. Pure functions, run on the server for a shared tank and on the
// phone for a solo one (from rules.js advance), so every phone sees the same thing and nothing depends on a phone being open.
//
// t.adv = { octoAt, smallAt, hist: [{ id, kind, fish, at, end?, out? }], visits: { [species]: n }, vseen, seq }
// f.restless = { id, at, until, kind, out }      the octopus is pacing the glass before it goes (phase A)
// f.away = { id, kind, at, until, out, inTank }  it is out of the tank, or hiding somewhere nobody can see (phases B to D)
// f.advMem = { n, kinds: {}, items: [{ k, at, adv }], fav, met: [], last }
// t.keeps = [{ id, k, adv, by, byName, at, x, z }]   keepsakes it brought back, sitting on the sand (no shell value)
//
// Everything is worked out from the tank's own numbers and the scheduled times, never from Math.random, so a return that happened while every
// phone was closed comes out the same whenever the tank is next opened. Times are the scheduled ones, not the time somebody looked.

const HOUR = 3600e3, DAY = 24 * HOUR, MIN = 60e3;
export const ADV = {
  OCTO_GAP: [4 * DAY, 8 * DAY],      // between one octopus adventure and the earliest chance of the next
  SMALL_GAP: [3 * DAY, 6 * DAY],     // between the smaller moments (fish, seahorses, mysteries)
  WEEK_BUDGET: 3,                    // at most this many adventures of any kind in a week, per tank
  SMALL_WEEK: 2,                     // of which at most this many are the smaller moments
  MAJOR_GAP: 6 * DAY,                // an absence longer than a short hide at most this often
  KEEP_MAX: 6,                       // keepsakes on the sand at once; beyond that the oldest are kept in the octopus's record only
  RESTLESS: [20 * MIN, 60 * MIN],
};
// how long each kind of absence lasts, and how likely each is when an octopus goes (extended ones need a lot more, see eligibleLong)
export const ADV_KINDS = {
  hide:  { dur: [5 * MIN, 20 * MIN], w: 0.6, label: 'a little hide' },
  short: { dur: [30 * MIN, 3 * HOUR], w: 0.3, label: 'a short adventure' },
  night: { dur: [6 * HOUR, 12 * HOUR], w: 0.08, label: 'a night away' },
  long:  { dur: [24 * HOUR, 48 * HOUR], w: 0.05, label: 'a long adventure' },
};
export const KEEPSAKES = {
  cap:   { label: 'Bottle cap' },
  key:   { label: 'Little brass key' },
  pebble:{ label: 'Smooth pebble' },
  scute: { label: 'Turtle shell scute' },
  glass: { label: 'Piece of sea glass' },
  shard: { label: 'Painted shard' },
  shell: { label: 'Tiny spiral shell' },
};
const H = (...n) => { let h = 0x9e3779b9; for (const x of n) { h = Math.imul(h ^ ((x | 0) >>> 0), 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; } return (h >>> 0) / 4294967296; };
const sid = (s) => [...String(s ?? '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
const span = ([a, b], r) => Math.round(a + (b - a) * r);
const rate = (t) => { const r = Number(t.flags?.advRate); return Number.isFinite(r) && r > 0 ? r : 1; };      // a developer setting: 10 makes everything ten times as often
// how much of an escape artist the tank's octopuses are: a common octopus is the famous one; a two-spot rarely bothers (it is the calm kind kept at home)
const escRate = (t) => { const os = (t.fish ?? []).filter((f) => f.species === 'octopus' && !f.dead); if (!os.length) return 1; const k = (f) => ({ bimac: 0.5, mimic: 0.8, cyanea: 1.1 })[f.kind] ?? 1.25; return Math.max(...os.map(k)); };
const pickW = (opts, r) => { const tot = opts.reduce((s, o) => s + o.w, 0); if (tot <= 0) return null; let x = r * tot; for (const o of opts) { if ((x -= o.w) < 0) return o; } return opts[opts.length - 1]; };

export const isAway = (f) => !!f?.away;
export const awayLine = (f) => (f?.away ? (f.away.inTank ? 'Hiding somewhere' : 'Out exploring') : null);
export const advMemOf = (f) => (f.advMem ||= { n: 0, kinds: {}, items: [], fav: null, met: [], last: null });

// The octopus's six natures decide what it tends to do and bring back.
const NATURE = {
  explorer:  { go: 1.5, long: 1.6, items: 1.2 },
  collector: { go: 1.0, long: 0.9, items: 2.0 },
  trickster: { go: 1.4, long: 1.0, items: 1.0 },
  homebody:  { go: 0.45, long: 0.3, items: 0.7 },
  watcher:   { go: 0.8, long: 0.7, items: 0.8 },
  showoff:   { go: 1.0, long: 0.8, items: 0.9 },
};

// The things that can happen on an adventure. w: how likely, by nature. kinds: which absences it fits. keep: what it brings back.
// ok(c): only offered when the tank really has what the line talks about.
const OUTCOMES = [
  { id: 'cap', kinds: ['short', 'night', 'long'], keep: 'cap', w: { explorer: 3, trickster: 3, collector: 2 }, line: (c) => `${c.n} came back holding a bottle cap and took it straight to its den.` },
  { id: 'key', kinds: ['night', 'long'], keep: 'key', w: { explorer: 2, collector: 2, trickster: 1 }, line: (c) => `${c.n} came home with a little brass key. Nobody knows what it opens.` },
  { id: 'pebble', kinds: ['short', 'night'], keep: 'pebble', w: { homebody: 2, watcher: 2, collector: 2 }, line: (c) => `${c.n} brought back a smooth pebble and turned it over and over.` },
  { id: 'prize', kinds: ['short', 'night', 'long'], keep: 'glass', w: { collector: 5 }, line: (c) => `${c.n} came back with a piece of sea glass and set it with the rest of its collection.` },
  { id: 'favfind', kinds: ['night', 'long'], keep: 'shard', fav: true, w: { explorer: 2, collector: 3, showoff: 1 }, line: (c) => `${c.n} found a painted shard on its adventure. It will not let it out of its sight.` },
  { id: 'spiral', kinds: ['short', 'long'], keep: 'shell', w: { collector: 2, watcher: 1, showoff: 1 }, line: (c) => `${c.n} came back with a tiny spiral shell, much smaller than any in the tank.` },
  { id: 'missing', kinds: ['short', 'night'], w: { collector: 3, trickster: 2 }, ok: (c) => !!c.collectible && !!c.den, line: (c) => `The ${c.collectible.label} went missing for a while. It turned up again beside ${c.n}'s den.` },
  { id: 'rearrange', kinds: ['hide', 'short'], w: { trickster: 3, collector: 2 }, ok: (c) => !!c.movable, line: (c) => `While ${c.n} was out of sight, the ${c.movable.label} moved a little. ${c.n} looks very pleased with itself.` },
  { id: 'wrong', kinds: ['short', 'night'], w: { explorer: 2, trickster: 2, watcher: 1 }, ok: (c) => !!c.otherDen, line: (c) => `${c.n} came back and settled into the ${c.otherDen.label} first, then went home to its own den as if nothing had happened.` },
  { id: 'late', kinds: ['short', 'night'], late: 1.5, w: { explorer: 2, homebody: 1 }, line: (c) => `${c.n} took its time coming home, and slipped back in later than usual.` },
  { id: 'nightout', kinds: ['night'], w: { explorer: 3, watcher: 2, trickster: 1 }, line: (c) => `${c.n} spent the night exploring and came back at first light, a little sandy.` },
  { id: 'quiet', kinds: ['hide', 'short', 'night', 'long'], w: { homebody: 4, watcher: 3, explorer: 1, collector: 1, trickster: 1, showoff: 1 }, line: (c) => `${c.n} came back from a quiet little adventure and settled into its den.` },
  { id: 'hiding', kinds: ['hide'], inTank: true, w: { homebody: 4, watcher: 3, trickster: 3, explorer: 1, collector: 1, showoff: 1 }, line: (c) => `${c.n}'s den was empty for a while. It was hiding all along${c.hideIn ? ` behind the ${c.hideIn.label}` : ''}.` },
  { id: 'familiar', kinds: ['short', 'night'], w: { collector: 2, homebody: 2 }, ok: (c) => !!c.keep, line: (c) => `${c.n} came home and checked on its ${c.keep.label.toLowerCase()} before anything else.` },
  { id: 'greet', kinds: ['short', 'night', 'long'], w: { showoff: 5, watcher: 2 }, ok: (c) => !!c.who, line: (c) => `${c.n} came back and went straight to the glass to greet ${c.who}.` },
  { id: 'unexplained', kinds: ['short', 'night', 'long'], w: { trickster: 2, explorer: 1, watcher: 1 }, line: (c) => `${c.n} came back. Where it went is anyone's guess.` },
];
export const OUTCOME_IDS = OUTCOMES.map((o) => o.id);

// What the tank holds that an adventure line can talk about (so every line names a real thing).
function context(t, f, now, R) {
  const label = (d) => R.DECOR_DEF[d.type]?.label ?? 'decoration', withL = (d) => (d ? { ...d, label: label(d).toLowerCase() } : null);      // (a name in the middle of a sentence)
  const r = (n) => H(sid(f.id), now / MIN | 0, n);
  const coll = t.decor.filter((d) => ['shell', 'starfish', 'chest', 'crystal', 'skull', 'lantern'].includes(d.type) && d.id !== f.home);
  const mov = t.decor.filter((d) => !['coconut', 'pot'].includes(d.type) && R.DECOR_DEF[d.type]?.cat !== 'PLANTS' && d.id !== f.home);
  const dens = t.decor.filter((d) => ['coconut', 'pot', 'rock', 'boulder', 'arch'].includes(d.type) && d.id !== f.home);
  const hides = t.decor.filter((d) => ['rock', 'boulder', 'wood', 'kelp', 'fern', 'grass', 'pillar'].includes(d.type));
  const mine = (t.keeps ?? []).filter((k) => k.by === f.id), who = Object.values(t.care ?? {}).filter((c) => now - c.ts < 2 * HOUR).map((c) => c.name).filter(Boolean);
  return {
    n: f.name, collectible: withL(coll[Math.floor(r(1) * coll.length)]), movable: withL(mov[Math.floor(r(2) * mov.length)]), otherDen: withL(dens[Math.floor(r(3) * dens.length)]),
    hideIn: withL(hides[Math.floor(r(4) * hides.length)]), keep: mine.length ? (() => { const k = mine.find((q) => q.id === advMemOf(f).fav) ?? mine[0]; return { ...k, label: KEEPSAKES[k.k]?.label ?? 'keepsake' }; })() : null, den: t.decor.some((d) => d.id === f.home), who: who[0] ?? null,
  };
}

// Who may go. Never a baby, never in the first days of a tank or before the tank is set up, never while hungry, unwell, busy, brooding, or
// about to have young; an elder only goes for a short while.
const hungerAt = (f, at, cur, R) => Math.max(0, R.ownHunger(f) - Math.max(0, (cur ?? at) - at) / 1000 * (R.OHR ?? 0));      // hunger as it was then (catching up after the tank was closed reads the past, not now)
export function canAdventure(t, f, now, R, cur) {
  if (!R.isOcto(f) || f.dead || f.away || f.restless) return false;
  if ((t.flags?.tut ?? 0) < 5 || now - (t.createdAt ?? now) < 3 * DAY) return false;
  if (R.stageOf(f, now) === 'baby' || (now - f.born) < 3 * DAY) return false;
  if ((hungerAt(f, now, cur, R) > 0.55 && !(f.fedAt && now - f.fedAt >= 0 && now - f.fedAt < DAY)) ||      /* (well fed: fed in the last day, as for eggs, so a once-a-day caretaker's octopus still goes) */ (f.ail ?? 0) > 0.25 * R.AIL_TIRED || (f.health ?? 1) < 0.55) return false;      /* (0.55: an octopus fed once a day settles near 0.6, and still goes; a neglected one does not) */
  if (f.puzzle || f.seek || f.preg || f.nursery || f.brood || now < (f.restUntil ?? 0)) return false;      // (a mother resting after her eggs stays home too)
  return true;
}
// an extended one: a settled adult in its prime that has come home safely from several shorter ones
export function eligibleLong(t, f, now, R) {
  const m = advMemOf(f), age = (now - f.born) / DAY;
  return !f.elder && age >= 10 && age < R.lifeOf(f) * 0.7 && (m.kinds.short ?? 0) + (m.kinds.night ?? 0) + (m.kinds.hide ?? 0) / 2 >= 2 && (f.happy ?? 0) >= 0.65 && now - (t.createdAt ?? now) >= 21 * DAY && !octoHist(t).some((h) => h.kind === 'long' && now - h.at < 30 * DAY);
}
const weekCount = (t, now, small = false) => (t.adv.hist ?? []).filter((h) => now - h.at < 7 * DAY && (!small || !h.fish)).length;
const octoHist = (t) => (t.adv.hist ?? []).filter((h) => h.fish && ADV_KINDS[h.kind]);
const remember = (t, h) => { (t.adv.hist ||= []).push(h); if (t.adv.hist.length > 60) t.adv.hist.splice(0, t.adv.hist.length - 60); };

function chooseKind(t, f, now, R, r) {
  const nat = NATURE[R.octoMind(f).type] ?? NATURE.watcher, m = advMemOf(f), majorOk = !octoHist(t).some((h) => h.kind !== 'hide' && now - h.at < ADV.MAJOR_GAP / rate(t));
  const pref = m.pref === 'long' ? 1.3 : m.pref === 'short' ? 0.75 : 1;      // what it has come to like, from what it chose before
  const opts = [{ id: 'hide', w: ADV_KINDS.hide.w }];
  if (majorOk) opts.push({ id: 'short', w: ADV_KINDS.short.w });
  if (majorOk && !f.elder) opts.push({ id: 'night', w: ADV_KINDS.night.w * nat.long * pref });
  if (majorOk && eligibleLong(t, f, now, R)) opts.push({ id: 'long', w: ADV_KINDS.long.w * nat.long * pref });
  return pickW(opts, r).id;
}
function chooseOutcome(t, f, kind, c, R, r) {
  const type = R.octoMind(f).type, nat = NATURE[type] ?? NATURE.watcher, m = advMemOf(f), recent = (t.adv.hist ?? []).filter((h) => h.fish === f.id).slice(-3).map((h) => h.out);
  const opts = OUTCOMES.filter((o) => o.kinds.includes(kind) && (!o.ok || o.ok(c))).map((o) => ({ o, w: (o.w[type] ?? 0.4) * (o.keep ? nat.items * (kind === 'night' || kind === 'long' ? 2 : 1.3) : 1) * (o.id === 'rearrange' || o.id === 'hiding' ? 0.7 : 1) * (recent.includes(o.id) ? 0.25 : 1) * (o.id === 'favfind' && m.fav ? 0.3 : 1) }));
  return pickW(opts, r)?.o ?? OUTCOMES.find((o) => o.id === 'quiet');
}

// Called from advance. Works through every step that was due, in order, at the time it was due (so a phone opened a day later sees the
// octopus get restless, go and come back exactly as if someone had watched).
export function adventures(t, now, ev, R) {
  t.adv ||= {}; t.keeps ||= [];
  if (!Number.isFinite(t.adv.octoAt)) t.adv.octoAt = Math.max(now, (t.createdAt ?? now) + 3 * DAY) + span(ADV.OCTO_GAP, H(sid(t.id), 1)) / (rate(t) * escRate(t));
  if (!Number.isFinite(t.adv.smallAt)) t.adv.smallAt = Math.max(now, (t.createdAt ?? now) + 2 * DAY) + span(ADV.SMALL_GAP, H(sid(t.id), 2)) / rate(t);
  // tidy anything left behind by an animal that is no longer here (sold, passed away, moved on)
  t.keeps = t.keeps.filter((k) => k && KEEPSAKES[k.k] && Number.isFinite(k.x) && Number.isFinite(k.z));
  for (const f of t.fish) {
    if (f.restless && now >= f.restless.until) leave(t, f, f.restless.until, ev, R, now);
    if (f.away && now >= f.away.until) back(t, f, f.away.until, ev, R, now);
    if (f.away && !R.isOcto(f)) delete f.away;
  }
  for (let i = 0; i < 6 && now >= t.adv.octoAt; i++) {       // catch up on missed chances (a long time closed), a few at most
    const at = t.adv.octoAt; t.adv.octoAt = at + span(ADV.OCTO_GAP, H(sid(t.id), at / MIN | 0, 3)) / (rate(t) * escRate(t));
    if (weekCount(t, at) >= ADV.WEEK_BUDGET || t.fish.some((f) => f.away || f.restless)) continue;
    const os = t.fish.filter((f) => canAdventure(t, f, at, R, now)); if (!os.length) continue;
    const f = os[Math.floor(H(sid(t.id), at / MIN | 0, 4) * os.length)], nat = NATURE[R.octoMind(f).type] ?? NATURE.watcher;
    if (H(sid(f.id), at / MIN | 0, 5) > Math.min(0.95, Math.max(0.4, 0.55 * nat.go))) continue;      // a homebody often stays in (but every octopus goes now and then)
    restless(t, f, at, ev, R);
    if (f.restless && now >= f.restless.until) leave(t, f, f.restless.until, ev, R, now);
    if (f.away && now >= f.away.until) back(t, f, f.away.until, ev, R, now);
  }
  for (let i = 0; i < 4 && now >= t.adv.smallAt; i++) {
    const at = t.adv.smallAt; t.adv.smallAt = at + span(ADV.SMALL_GAP, H(sid(t.id), at / MIN | 0, 6)) / rate(t);
    if (weekCount(t, at) >= ADV.WEEK_BUDGET || weekCount(t, at, true) >= ADV.SMALL_WEEK || (t.flags?.tut ?? 0) < 5 || t.fish.some((f) => f.away)) continue;
    small(t, at, ev, R);
  }
}

function restless(t, f, at, ev, R) {
  const id = 'a' + ((t.adv.seq = (t.adv.seq ?? 0) + 1)), r = H(sid(f.id), at / MIN | 0, 7);
  const kind = chooseKind(t, f, at, R, r), c = context(t, f, at, R), out = chooseOutcome(t, f, kind, c, R, H(sid(f.id), at / MIN | 0, 8));
  f.restless = { id, at, until: at + span(ADV.RESTLESS, H(sid(f.id), at / MIN | 0, 9)), kind, out: out.id };
  if (kind !== 'hide') ev.push({ story: f.id, text: 'Seemed restless, pacing along the glass.', jat: at });
}
function leave(t, f, at, ev, R, cur) {
  const { id, kind, out } = f.restless; delete f.restless; const h0 = hungerAt(f, at, cur, R);
  if (!R.isOcto(f) || f.dead || (h0 > 0.7 && !(f.fedAt && at - f.fedAt >= 0 && at - f.fedAt < DAY))) return;      // it got hungry while pacing: it stays (and nothing is lost)
  if (f.puzzle || f.seek || f.preg || f.nursery || f.brood || (f.health ?? 1) < 0.55) return;      // (something else came up while it paced: it stays for that)
  const o = OUTCOMES.find((x) => x.id === out) ?? OUTCOMES[0], dur = span(ADV_KINDS[kind].dur, H(sid(f.id), at / MIN | 0, 10)) * (o.late ?? 1);
  f.away = { id, kind, at, until: at + dur, out: o.id, inTank: !!o.inTank || kind === 'hide', hunger: h0, fedAt: f.fedAt ?? null };
  remember(t, { id, kind, fish: f.id, at, out: o.id });
  const major = kind !== 'hide';
  if (o.inTank || kind === 'hide') ev.push({ story: f.id, text: 'Disappeared from its den for a while.', jat: at, adventure: { phase: 'go', id, fish: f.id, kind } });
  else ev.push({ journal: [`${f.name} climbed out over the top of the tank and slipped away.`, `${f.name} squeezed through the gap by the lid and was gone.`, `${f.name} slid up the glass, over the rim, and out of sight.`, `${f.name} went over the top of the tank, quiet as anything.`][Math.floor(H(sid(f.id), at / MIN | 0, 11) * 4)], jat: at, story: f.id, text: 'Went out exploring.', adventure: { phase: 'go', id, fish: f.id, kind }, major, toast: major && kind !== 'short' ? `${f.name} has gone out exploring.` : undefined });
}
function back(t, f, at, ev, R, cur) {
  const a = f.away; delete f.away; const since = Math.max(0, (cur ?? at) - at) / 1000 * (R.OHR ?? 0);      // (home partway through a long catch-up: the time since it came back counts as usual)
  // the time away does not count: hunger is where it was, and the next meal is as far off as it was when it left
  if (R.ownHungry(f)) { f.hunger = Math.min(1, Math.min(f.hunger ?? a.hunger, a.hunger ?? 0.3) + since); if (a.fedAt != null) f.fedAt = a.fedAt + (at - a.at); }
  const m = advMemOf(f), c = context(t, f, at, R), o = OUTCOMES.find((x) => x.id === a.out) ?? OUTCOMES.find((x) => x.id === 'quiet');
  const okNow = !o.ok || o.ok(c), use = okNow ? o : OUTCOMES.find((x) => x.id === 'quiet');      // the thing it would have moved was taken away meanwhile
  m.n++; m.kinds[a.kind] = (m.kinds[a.kind] ?? 0) + 1; m.last = { id: a.id, kind: a.kind, at: a.at, end: at, out: use.id };
  const longs = (m.kinds.night ?? 0) + (m.kinds.long ?? 0), shorts = (m.kinds.hide ?? 0) + (m.kinds.short ?? 0); m.pref = longs * 3 > shorts ? 'long' : shorts > 4 * Math.max(1, longs) ? 'short' : m.pref ?? null;
  const h = (t.adv.hist ?? []).find((x) => x.id === a.id); if (h) { h.end = at; h.out = use.id; }
  if (c.who) { m.met = [...new Set([c.who, ...m.met])].slice(0, 6); if (h) h.who = c.who; }
  let keep = null;
  if (use.keep) keep = addKeep(t, f, use.keep, a.id, at, R, ev);
  if (use.fav && keep) m.fav = keep.id;
  if (use.id === 'missing' && c.collectible) { const d = t.decor.find((x) => x.id === c.collectible.id), den = t.decor.find((x) => x.id === f.home); if (d && den) { const p = near(den, H(sid(d.id), at / MIN | 0)); d.x = p.x; d.z = p.z; d.movedAt = at; } }
  if (use.id === 'rearrange' && c.movable) { const d = t.decor.find((x) => x.id === c.movable.id); if (d) { const p = nudge(d, H(sid(d.id), at / MIN | 0)); d.x = p.x; d.z = p.z; d.movedAt = at; const e = f.mem?.fam?.[d.id]; if (e) { e.x = d.x; e.z = d.z; } } }
  const text = use.line(c), major = a.kind !== 'hide';
  if (a.inTank || !major) ev.push({ story: f.id, text, jat: at, adventure: { phase: 'back', id: a.id, fish: f.id, kind: a.kind, out: use.id, keep: keep?.id ?? null } });
  else ev.push({ journal: text, jat: at, story: f.id, text, adventure: { phase: 'back', id: a.id, fish: f.id, kind: a.kind, out: use.id, keep: keep?.id ?? null }, major, toast: `${f.name} is home again.` });
  // what it is known for, in its profile (quiet: no shells, a line in its own story)
  if (!a.inTank) R.unlock(t, f, 'escape1', at, ev);
  if ((m.kinds.night ?? 0) + (m.kinds.long ?? 0) >= 1) R.unlock(t, f, 'homeagain', at, ev);
  if (m.items.length >= 3) R.unlock(t, f, 'collector', at, ev);
  if (keep && m.items.filter((x) => x.k === keep.k).length >= 2) R.unlock(t, f, 'favfind', at, ev);
}
const clampX = (x) => Math.max(-4.2, Math.min(4.2, x)), clampZ = (z) => Math.max(-3.4, Math.min(3.7, z));
function near(d, r) { const a = r * Math.PI * 2, rr = 0.55 + 0.25 * H(r * 1e6 | 0); return { x: +clampX(d.x + Math.cos(a) * rr).toFixed(2), z: +clampZ(d.z + Math.sin(a) * rr).toFixed(2) }; }
function nudge(d, r) { const a = r * Math.PI * 2; return { x: +clampX(d.x + Math.cos(a) * 0.35).toFixed(2), z: +clampZ(d.z + Math.sin(a) * 0.35).toFixed(2) }; }
function addKeep(t, f, k, adv, at, R, ev) {
  const den = t.decor.find((x) => x.id === f.home) ?? { x: 0, z: 0.5 }, p = near(den, H(sid(f.id), at / MIN | 0, 11)), m = advMemOf(f);
  const keep = { id: 'k' + ((t.adv.seq = (t.adv.seq ?? 0) + 1)), k, adv, by: f.id, byName: f.name, at, x: p.x, z: p.z };
  t.keeps.push(keep); m.items.push({ k, at, adv, id: keep.id }); m.firstAt ??= at; if (m.items.length > 60) m.items.splice(0, m.items.length - 60);
  m.keepAt = { x: p.x, z: p.z }; m.moved = false;
  while (t.keeps.length > ADV.KEEP_MAX) {       // the oldest that is nobody's favorite goes to the record only
    const i = t.keeps.findIndex((x) => !t.fish.some((g) => g.advMem?.fav === x.id)); const gone = t.keeps.splice(i < 0 ? 0 : i, 1)[0];
    const g = t.fish.find((x) => x.id === gone.by); const rec = g?.advMem?.items.find((x) => x.id === gone.id); if (rec) rec.stored = at;
  }
  return keep;
}
// the octopus carried a keepsake somewhere else (reported by the phone that runs the animals, checked here)
export function moveKeep(t, id, x, z, now) {
  const k = (t.keeps ?? []).find((q) => q.id === id); if (!k || !Number.isFinite(x) || !Number.isFinite(z)) return false;
  k.x = +clampX(x).toFixed(2); k.z = +clampZ(z).toFixed(2); k.movedAt = now; const f = t.fish.find((g) => g.id === k.by); if (f?.advMem) { f.advMem.keepAt = { x: k.x, z: k.z }; f.advMem.moved = true; }
  return true;
}

// ── The smaller moments: fish, seahorses and the tank itself. Each only when the tank really has what it talks about. ──
const sea = (f) => f.species === 'seahorse', fishy = (f, R) => !R.isOcto(f) && !sea(f) && !f.dead;
function small(t, at, ev, R) {
  const r = (n) => H(sid(t.id), at / MIN | 0, n), pick = (a, n) => a[Math.floor(r(n) * a.length)];
  const label = (d) => R.DECOR_DEF[d?.type]?.label ?? 'decoration', byId = (id) => t.fish.find((f) => f.id === id);
  const fish = t.fish.filter((f) => fishy(f, R) && R.stageOf(f, at) !== 'baby'), horses = t.fish.filter((f) => sea(f) && !f.dead), octos = t.fish.filter((f) => R.isOcto(f) && !f.dead && !f.away);
  const plants = t.decor.filter((d) => R.DECOR_DEF[d.type]?.cat === 'PLANTS'), done = new Set((t.adv.hist ?? []).filter((h) => at - h.at < 45 * DAY).map((h) => h.kind));
  const pool = [];
  const add = (kind, w, run) => { if (!done.has(kind)) pool.push({ kind, w, run }); };
  // fish
  { const a = fish.filter((f) => !f.pal), pairs = []; for (const x of a) for (const y of a) if (x.id < y.id && x.species !== y.species && x.rival !== y.id && y.rival !== x.id) pairs.push([x, y]);
    if (pairs.length) add('friendship', 2, () => { const [x, y] = pick(pairs, 20); return { line: `${x.name} and ${y.name} spent the afternoon side by side. Nobody expected that.`, who: [x, y] }; }); }
  { const a = fish.filter((f) => f.spotId && t.decor.some((d) => d.id === f.spotId));
    if (a.length) add('corner', 1.2, () => { const f = pick(a, 21), d = t.decor.find((x) => x.id === f.spotId); return { line: pick([`${f.name} spent most of the day by the ${label(d)}, as if keeping it company.`, `${f.name} hardly left the ${label(d)} all day.`, `Whenever anyone looked, ${f.name} was by the ${label(d)} again.`, `${f.name} kept circling back to the ${label(d)} today.`], 26), who: [f] }; }); }
  { const a = fish.filter((f) => f.pal && byId(f.pal));
    if (a.length) add('copycat', 1, () => { const f = pick(a, 22), o = byId(f.pal); return { line: pick([`${f.name} copied every turn ${o.name} made, all morning.`, `${f.name} followed ${o.name} so closely they swam as one.`, `Wherever ${o.name} went this afternoon, ${f.name} went too.`, `${f.name} and ${o.name} took the same lap of the tank, over and over.`], 27), who: [f, o] }; }); }
  { const a = fish.filter((f) => f.rival && byId(f.rival));
    if (a.length) add('rival', 1, () => { const f = pick(a, 23), o = byId(f.rival), d = pick(t.decor, 24); return { line: `${f.name} and ${o.name} had a small standoff${d ? ` over the ${label(d)}` : ''}. Neither would give way.`, who: [f, o] }; }); }
  { const a = fish.filter((f) => (f.traits ?? []).some((x) => x === 'Brave' || x === 'Curious'));
    const vis = t.visitor && at < t.visitor.until;      // (a visitor really here at that time)
    if (a.length && (octos.length || vis)) add('brave', 1, () => { const f = pick(a, 25), o = octos[0]; return { line: vis ? `${f.name} swam right up to the visitor to have a look.` : pick([`${f.name} swam right up to ${o.name} and looked it in the eye.`, `${f.name} went nose to nose with ${o.name}, and did not back off.`, `${f.name} was the only one brave enough to go and inspect ${o.name} today.`], 28), who: [f] }; }); }
  // seahorses
  if (horses.length && plants.length >= 2) add('holdfast', 2, () => { const f = pick(horses, 30), d = pick(plants, 31); return { line: `${f.name} tried a new holdfast today: the ${label(d)}.`, who: [f] }; });
  { const pr = horses.filter((f) => (f.mate || f.partner) && horses.some((g) => g.id === (f.mate ?? f.partner)));
    if (pr.length) add('dance', 2, () => { const f = pr[0], o = byId(f.mate ?? f.partner); return { line: `${f.name} and ${o.name} did their morning dance, circling each other and glowing.`, who: [f, o] }; }); }
  { const a = horses.filter((f) => f.disc?.favhitch);
    if (a.length) add('familiar', 1.5, () => { const f = pick(a, 32); return { line: `${f.name} went back to its favorite holdfast and stayed there all afternoon.`, who: [f] }; }); }
  { const a = horses.filter((f) => R.stageOf(f, at) !== 'adult');
    if (a.length || t.nursery?.cands?.length) add('curious', 1.5, () => { const f = a.length ? pick(a, 33) : null; return { line: f ? `Young ${f.name} let go of its holdfast to look at everything, one eye at a time.` : 'One of the babies in the nursery was watching everything, one eye at a time.', who: f ? [f] : [] }; }); }
  { const a = horses.filter((f) => (f.mate || f.partner) && horses.some((g) => g.id === (f.mate ?? f.partner)) && at - (f.pairedAt ?? f.partneredAt ?? at) > 7 * DAY);
    if (a.length) add('together', 1, () => { const f = a[0], o = byId(f.mate ?? f.partner); return { line: `${f.name} and ${o.name} drifted apart for the morning, then found each other again and held tails.`, who: [f, o] }; }); }
  // the tank's own little mysteries
  const stray = t.keeps.some((k) => !k.by), strayOk = !stray && t.keeps.length < ADV.KEEP_MAX && t.decor.length && !(t.adv.hist ?? []).some((h) => (h.kind === 'pebble' || h.kind === 'oddshell') && at - h.at < 30 * DAY);
  if (strayOk) add('pebble', 1, () => { const d = pick(t.decor, 40), p = near(d, r(41)); t.keeps.push({ id: 'k' + ((t.adv.seq = (t.adv.seq ?? 0) + 1)), k: 'pebble', adv: 'mystery', by: null, byName: null, at, x: p.x, z: p.z }); return { line: `A strange smooth pebble turned up near the ${label(d)}. Nobody saw it arrive.`, who: [] }; });
  if (strayOk && octos.length) add('oddshell', 0.6, () => { const d = pick(t.decor, 42), p = near(d, r(43)); t.keeps.push({ id: 'k' + ((t.adv.seq = (t.adv.seq ?? 0) + 1)), k: 'shell', adv: 'mystery', by: null, byName: null, at, x: p.x, z: p.z }); return { line: `An unusual little shell appeared by the ${label(d)}. ${octos[0].name} keeps glancing at it.`, who: [] }; });
  { const b = (t.bottles ?? []).filter((x) => !x.opened && at - x.at > 2 * DAY);
    if (b.length) add('bottle', 1.5, () => { const x = b[0]; return { line: `The bottle from ${x.fromName ?? 'a friend'} has drifted to the back corner. It is still waiting to be opened.`, who: [] }; }); }
  { const st = t.decor.filter((d) => d.type === 'starfish'), mv = st.length ? st : octos.length ? t.decor.filter((d) => !['coconut', 'pot'].includes(d.type) && R.DECOR_DEF[d.type]?.cat !== 'PLANTS') : [];
    if (mv.length) add('moved', 1, () => { const d = pick(mv, 44), p = nudge(d, r(45)); d.x = p.x; d.z = p.z; d.movedAt = at; for (const f of t.fish) { const e = f.mem?.fam?.[d.id]; if (e && !e.gone) e.mv = at; } return { line: d.type === 'starfish' ? pick(['The starfish is not where it was yesterday. It must have crept off in the night.', 'The starfish has wandered again. It is a few hand-widths from where it was.', 'Someone noticed the starfish had crept to a new spot overnight.'], 46) : `The ${label(d)} has moved a little overnight. Someone in the tank knows how.`, who: [] }; }); }
  if (t.fish.length && !(t.adv.hist ?? []).some((h) => at - h.at < 3 * DAY)) add('quietnight', 0.5, () => ({ line: 'A quiet night. Everyone slept, and the water was still.', who: [] }));
  const p = pickW(pool, r(50)); if (!p) return;
  const res = p.run(); remember(t, { id: 's' + ((t.adv.seq = (t.adv.seq ?? 0) + 1)), kind: p.kind, at, end: at });
  ev.push({ ...(p.kind === 'quietnight' ? { story: 'tank', text: res.line } : { journal: res.line }), jat: at, adventure: { phase: 'small', kind: p.kind } });      // (a quiet night is not news)
  for (const f of res.who) ev.push({ story: f.id, text: res.line, jat: at });
}

// for Coming up: an octopus that is away, without a time (nobody should be waiting on a timer)
export function advForecast(t) { return t.fish.filter((f) => f.away && !f.away.inTank).map((f) => ({ icon: '🐙', text: `${f.name} is out exploring` })); }

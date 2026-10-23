// ── Habitat ── what each decoration offers the animals, as plain numbers 0..1 the simulation reads and the player never sees:
// shelter (somewhere to tuck in or hide behind), climb (a crab or an octopus can get up it), hold (a seahorse can wrap its tail round it),
// rest (a good place to settle and sit), forage (something to pick over on or around it) and interest (worth a look, for a curious animal).
// The player reads the habitat by watching the animals; habitatNotes() turns what the animals really did into a few plain lines.
import { DECOR_DEF } from './rules.js';

const BY_CAT = {
  PLANTS: { shelter: 0.5, climb: 0, hold: 0.7, rest: 0.6, forage: 0.3, interest: 0.3 },
  ROCKS: { shelter: 0.4, climb: 0.7, hold: 0.1, rest: 0.6, forage: 0.5, interest: 0.4 },
  WOOD: { shelter: 0.5, climb: 0.6, hold: 0.4, rest: 0.5, forage: 0.5, interest: 0.4 },
  STRUCTURES: { shelter: 0.5, climb: 0.4, hold: 0.2, rest: 0.4, forage: 0.1, interest: 0.6 },
  SPECIAL: { shelter: 0.2, climb: 0.2, hold: 0.1, rest: 0.3, forage: 0.2, interest: 0.8 },
  SHELLS: { shelter: 0, climb: 0.1, hold: 0, rest: 0.2, forage: 0.1, interest: 0.5 },
};
const OWN = {      // where a decoration is unlike the rest of its kind
  cave: { shelter: 1, climb: 0.6, rest: 0.9 }, ledge: { shelter: 0.9, rest: 0.9 }, coconut: { shelter: 0.9, climb: 0.3 }, pot: { shelter: 1, climb: 0.2 }, arch: { shelter: 0.7, climb: 0.5 },
  table: { shelter: 0.7, climb: 0.8 }, liverock: { forage: 0.9, climb: 0.8, shelter: 0.6 }, rubble: { forage: 0.9, shelter: 0.5, climb: 0.3 }, brain: { forage: 0.7 }, sponge: { forage: 0.6 },
  seafan: { hold: 1, shelter: 0.3 }, seagrass: { hold: 0.9, forage: 0.6 }, mangrove: { hold: 0.9, shelter: 0.8 }, kelp: { hold: 0.8 }, anemone: { hold: 0, shelter: 0.6 }, moss: { hold: 0.2, forage: 0.6 },
  urchin: { shelter: 0.3, climb: 0, hold: 0 }, chest: { shelter: 0.6, interest: 1 }, skull: { shelter: 0.6, interest: 0.9 }, bubbler: { interest: 1, rest: 0 }, starfish: { interest: 0.7, shelter: 0 },
};
export const affordOf = (type) => ({ ...(BY_CAT[DECOR_DEF[type]?.cat] ?? BY_CAT.SPECIAL), ...(OWN[type] ?? {}) });

// what matters most to each kind of animal (how it weighs each affordance when it chooses where to spend its time)
export const WANTS = {
  octopus: { shelter: 1, climb: 0.5, interest: 0.8 }, seahorse: { hold: 1, rest: 0.4 }, crab: { climb: 0.7, forage: 1, shelter: 0.4 },
  turtle: { rest: 1, forage: 0.6 }, bottom: { forage: 1, shelter: 0.5 }, fish: { shelter: 0.6, rest: 0.4, interest: 0.3 },
};
const BOTTOM = new Set(['cory', 'neongoby']), TURTLE = new Set(['turtle', 'hawksbill', 'loggerhead', 'kemps', 'leatherback']), CRAB = new Set(['blueleg', 'scarlet', 'halloween']);
export const habitKind = (sp) => (sp === 'octopus' || sp === 'seahorse' ? sp : CRAB.has(sp) ? 'crab' : TURTLE.has(sp) ? 'turtle' : BOTTOM.has(sp) ? 'bottom' : 'fish');
// how well one decoration suits one animal, 0..1
export function suits(sp, type) { const W = WANTS[habitKind(sp)], A = affordOf(type); let s = 0, n = 0; for (const [k, w] of Object.entries(W)) { s += (A[k] ?? 0) * w; n += w; } return n ? s / n : 0; }

// ── each animal's temperament for its habitat, from its traits (the same traits its card shows): how strongly it keeps to a favorite place,
// how readily it tries a new one, and how quickly it takes cover ──
export function temperOf(f) {
  const T = new Set(f?.traits ?? []), k = habitKind(f?.species);
  const t = { keep: 0.5, roam: 0.5, cover: 0.3 };
  if (T.has('Lazy') || T.has('Calm')) { t.keep += 0.2; t.roam -= 0.15; }
  if (T.has('Curious') || T.has('Playful')) { t.roam += 0.25; t.keep -= 0.1; }
  if (T.has('Shy')) { t.cover += 0.45; t.keep += 0.1; }
  if (T.has('Brave')) { t.cover -= 0.2; t.roam += 0.1; }
  if (k === 'seahorse') { t.keep += 0.25; t.roam -= 0.2; }      // a seahorse keeps to a holdfast it knows
  if (k === 'turtle') t.roam += 0.1;
  for (const x of ['keep', 'roam', 'cover']) t[x] = Math.max(0.05, Math.min(1, t[x]));
  return t;
}

// ── a favorite place, from where it really spends its time. haunt: { decorId: score }, folded in from each report of seconds spent near each
// decoration; old time fades so a preference can change. Returns the decoration it now prefers (or null), never one that is gone ──
export function foldHaunt(f, secs, decor) {
  const H = (f.haunt ||= {}), T = temperOf(f), fade = 0.9 - 0.12 * T.roam + 0.08 * T.keep, here = new Set(decor.map((d) => d.id));
  for (const id of Object.keys(H)) { H[id] = +(H[id] * fade).toFixed(2); if (H[id] < 0.3 || !here.has(id)) delete H[id]; }
  for (const [id, s] of Object.entries(secs ?? {})) { if (!here.has(id)) continue; const d = decor.find((x) => x.id === id), fit = 0.4 + suits(f.species, d.type); H[id] = +((H[id] ?? 0) + (Math.min(180, Math.max(0, +s || 0)) / 60) * fit).toFixed(2); }
  const top = Object.entries(H).sort((a, b) => b[1] - a[1]); for (const [id] of top.slice(4)) delete H[id];      // (four places at most)
  const [best, sc] = top[0] ?? [null, 0], cur = f.spotId && H[f.spotId] != null ? H[f.spotId] : 0;
  return best && sc >= 4 && (best === f.spotId || sc > cur * (1.3 + 0.4 * T.keep)) ? best : null;      // a homebody needs a clearer winner to change
}

// ── what the habitat offers, read for the player from what is in the tank and what the animals have actually done with it ──
export function habitatNotes(t) {
  const live = t.fish.filter((f) => !f.dead && !f.away), decor = t.decor ?? [], out = [], kinds = new Set(live.map((f) => habitKind(f.species))), label = (id) => (DECOR_DEF[decor.find((d) => d.id === id)?.type]?.label ?? 'decoration').toLowerCase();
  const sum = (k) => decor.reduce((s, d) => s + (affordOf(d.type)[k] >= 0.7 ? 1 : 0), 0);
  if (kinds.has('octopus')) { const n = sum('shelter'); out.push(n >= 2 ? { ok: true, text: `Good shelter for an octopus: ${n} places to den.` } : { ok: false, text: n ? 'Only one good den spot. An octopus likes a choice.' : 'No real den for an octopus yet: a cave, a pot or a coconut.' }); }
  if (kinds.has('seahorse')) { const n = sum('hold'); out.push(n >= 3 ? { ok: true, text: `Seahorses have ${n} places to hold on.` } : { ok: false, text: 'Seahorses could use more to hold on to: sea fans, sea grass, kelp.' }); }
  if (kinds.has('crab')) { const n = sum('forage') + sum('climb'); out.push(n >= 3 ? { ok: true, text: 'Your hermit crabs have room to climb and pick about.' } : { ok: false, text: 'Hermit crabs would like rocks to climb and rubble to pick over.' }); }
  if (live.some((f) => temperOf(f).cover >= 0.6) && sum('shelter') < 2) out.push({ ok: false, text: 'A shy fish has little cover to dart into.' });
  const fans = {}; for (const f of live) if (f.spotId && decor.some((d) => d.id === f.spotId)) (fans[f.spotId] ||= []).push(f.name);
  const [hot, who] = Object.entries(fans).sort((a, b) => b[1].length - a[1].length)[0] ?? [];
  if (hot && who.length >= 2) out.push({ ok: true, text: `The ${label(hot)} is becoming a favorite: ${who.slice(0, 3).join(', ')}.` });
  const lost = live.filter((f) => f.missing && Date.now() - f.missing.at < 2 * 864e5); if (lost.length) out.push({ ok: false, text: `${lost.map((f) => f.name).slice(0, 2).join(' and ')} ${lost.length > 1 ? 'are' : 'is'} looking for a new favorite place.` });
  return out;
}

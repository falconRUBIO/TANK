// Heritable look of a fish: a hue, saturation, brightness and size nudge. Founders derive theirs from their seed; offspring blend their parents'.
// (Pure and dependency free: the browser draws with it, the server breeds with it.)
function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function genesOf(seed) { const r = rng((((seed | 0) * 2654435761 + 977) >>> 0)); const dh = (r() - 0.5) * 0.08, ds = 0.88 + r() * 0.24, dl = 0.95 + r() * 0.1, size = 0.93 + r() * 0.14;
  const k = r(), w = r(), m = k < 0.3 ? [RARE[Math.floor(w * RARE.length)], 'n'] : ['n', 'n'];      // (drawn after the others, so every fish's old look is unchanged; about one founder in three carries a rare color, hidden)
  return { dh, ds, dl, size, m }; }
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
export function blendGenes(a, b, r) {
  return { dh: cl((a.dh + b.dh) / 2 + (r() - 0.5) * 0.03, -0.06, 0.06), ds: cl((a.ds + b.ds) / 2 + (r() - 0.5) * 0.08, 0.85, 1.15), dl: cl((a.dl + b.dl) / 2 + (r() - 0.5) * 0.04, 0.93, 1.07), size: cl((a.size + b.size) / 2 + (r() - 0.5) * 0.05, 0.9, 1.1), m: inherit(a.m, b.m, r) };
}
export const seededRandom = rng;
// Color morphs: a rare color shows only when a fish has two copies of it (one from each parent); with one copy it is carried, unseen.
// Two carriers of the same color have about one baby in four that shows it. Now and then a copy appears on its own (a mutation).
export const MORPHS = {
  gold: { label: 'Golden', h: 0.12, s: 0.95, l: 0.6 },
  ghost: { label: 'Ghost', s: 0.12, l: 0.86 },
  blue: { label: 'Sapphire', h: 0.6, s: 0.85, l: 0.55 },
  ember: { label: 'Ember', h: 0.01, s: 0.95, l: 0.5 },
};
const RARE = Object.keys(MORPHS);
function inherit(a = ['n', 'n'], b = ['n', 'n'], r) { const m = [a[r() < 0.5 ? 0 : 1], b[r() < 0.5 ? 0 : 1]]; if (r() < 0.03) m[r() < 0.5 ? 0 : 1] = RARE[Math.floor(r() * RARE.length)]; return m; }
export const allelesOf = (f) => f?.genes?.m ?? genesOf(f?.seed ?? 0).m;
export const morphOf = (f) => { const m = allelesOf(f); return m[0] === m[1] && MORPHS[m[0]] ? m[0] : null; };
export const carriesOf = (f) => [...new Set(allelesOf(f).filter((x) => MORPHS[x]))].filter((x) => x !== morphOf(f));
// the chance that a baby of these two shows each color (for the hint on the card), exactly from their genes
export function morphOdds(a, b) { const A = allelesOf(a), B = allelesOf(b), out = {}; for (const x of A) for (const y of B) if (x === y && MORPHS[x]) out[x] = (out[x] ?? 0) + 0.25; return out; }


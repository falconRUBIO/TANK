// Heritable look of a fish: a hue, saturation, brightness and size nudge. Founders derive theirs from their seed; offspring blend their parents'.
// (Pure and dependency free: the browser draws with it, the server breeds with it.)
function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function genesOf(seed) { const r = rng((((seed | 0) * 2654435761 + 977) >>> 0)); const dh = (r() - 0.5) * 0.08, ds = 0.88 + r() * 0.24, dl = 0.95 + r() * 0.1, size = 0.93 + r() * 0.14; return { dh, ds, dl, size }; }
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
export function blendGenes(a, b, r) {
  return { dh: cl((a.dh + b.dh) / 2 + (r() - 0.5) * 0.03, -0.06, 0.06), ds: cl((a.ds + b.ds) / 2 + (r() - 0.5) * 0.08, 0.85, 1.15), dl: cl((a.dl + b.dl) / 2 + (r() - 0.5) * 0.04, 0.93, 1.07), size: cl((a.size + b.size) / 2 + (r() - 0.5) * 0.05, 0.9, 1.1) };
}
export const seededRandom = rng;

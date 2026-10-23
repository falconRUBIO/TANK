// Hermit crab shells: one voxel recipe for every kind, used for the empty shells in the tank (items.js) and the shell a crab carries (crab3d.js),
// so a crab that moves house is seen to take the very shell that was lying there. A shell lies on its side: the opening at the front (+x),
// low and round, and the spire coiling back and up to the apex. sz scales it (a roomier shell is a bigger one).
import { mulberry32, fbm, mix } from '../color.js';
import { Vox, topLit, hash } from './decor.js';

export const SHELL_U = 0.034;      // voxel size
// how each kind is painted: base colors and a pattern along the coil (t: 0 at the opening, 1 at the apex; a: angle round the coil; s: along the spiral)
const LOOK = {
  cshell_ivory: (t, a, s, n) => mix([238, 226, 196], [252, 244, 222], n) ,
  cshell_rose: (t, a, s, n) => (Math.sin(s * 9) > 0.35 ? mix([226, 120, 140], [240, 150, 166], n) : mix([248, 212, 214], [255, 232, 232], n)),
  cshell_moon: (t, a, s, n) => mix([52, 54, 62], [92, 94, 104], n * 0.8 + 0.2 * Math.sin(s * 4)),
  cshell_pearl: (t, a, s, n) => { const k = 0.5 + 0.5 * Math.sin(a * 2 + s * 3); return mix(mix([236, 230, 216], [214, 226, 240], k), [255, 250, 246], n * 0.5); },
  cshell_tiger: (t, a, s, n) => (Math.sin(s * 6 + n * 2) > 0.1 ? mix([120, 76, 40], [152, 98, 52], n) : mix([232, 214, 178], [246, 232, 200], n)),
  cshell_coral: (t, a, s, n) => mix([226, 108, 54], [246, 150, 84], n * 0.7 + 0.3 * (Math.sin(a * 7) > 0.5 ? 1 : 0)),
  cshell_ancient: (t, a, s, n) => (n > 0.72 ? [150, 140, 120] : n > 0.6 ? mix([92, 120, 80], [120, 140, 96], n) : mix([206, 196, 170], [222, 214, 190], n)),
  cshell_plain: (t, a, s, n) => mix([206, 186, 150], [226, 208, 172], n),
  cshell_worn: (t, a, s, n) => mix([150, 140, 122], [186, 174, 150], n),
};
const SHAPE = { cshell_moon: { turns: 1.6, fat: 1.22, len: 0.86 }, cshell_tiger: { turns: 2.4, fat: 0.95, len: 1.1 }, cshell_coral: { turns: 2.0, fat: 1.0, len: 1.0, ridge: 1 }, cshell_ancient: { turns: 2.8, fat: 0.95, len: 1.15, ridge: 1 }, cshell_rose: { turns: 2.2, fat: 0.95, len: 1.0 }, cshell_worn: { turns: 1.8, fat: 1.05, len: 0.9 } };
// a shell: the body whorl at the opening and smaller whorls stacked behind it, each a little higher, round a spiral seam
export function shellVox(type, sz = 1, seed = 1) {
  const v = new Vox(SHELL_U), S = SHAPE[type] ?? { turns: 2.2, fat: 1, len: 1 }, paint = LOOK[type] ?? LOOK.cshell_plain, rng = mulberry32(seed * 131 + 7);
  const L = (0.4 * sz * S.len) / SHELL_U, R0 = (0.19 * sz * S.fat) / SHELL_U, off = rng() * 9;
  for (let i = -2; i <= Math.ceil(L) + 2; i++) for (let j = -Math.ceil(R0) - 2; j <= Math.ceil(R0 * 2.5) + 2; j++) for (let k = -Math.ceil(R0) - 2; k <= Math.ceil(R0) + 2; k++) {
    const t = i / L; if (t < 0 || t > 1) continue;
    const r0 = R0 * Math.pow(1 - t, 0.8) + 0.8, cy = R0 * 1.35 * Math.pow(t, 0.8), y = j - cy, a = Math.atan2(y, k);      // the coil rises toward the apex
    const s = t * S.turns + a / (Math.PI * 2), fr = ((s % 1) + 1) % 1, seam = Math.abs(fr - 0.5) > 0.43, r = r0 * (0.78 + 0.22 * Math.sin(Math.PI * fr));      // each whorl bulges and pinches in at the seam, so the coil shows in its outline
    const d = Math.hypot(y, k) / r; if (d > 1 - (seam ? 0.07 : 0) + (S.ridge ? 0.05 * Math.sin(a * 9) : 0)) continue;
    if (t < 0.16 && Math.hypot(y + r * 0.18, k) < r * 0.62) continue;      // the opening: hollow, a little low
    const n = fbm(i * 0.3 + off, j * 0.3, k * 0.3); let c = paint(t, a, s, n); if (seam) c = mix(c, [60, 44, 36], 0.35); if (t < 0.17 && d > 0.8) c = mix(c, [255, 240, 232], 0.45);      // a pale lip round the opening
    v.set(i, j + Math.round(R0), k, c);
  }
  topLit(v); return v;
}
// the size of the shell's opening above the sand and its length, for placing a crab in it
export const shellDims = (sz = 1, type = '') => { const S = SHAPE[type] ?? { len: 1, fat: 1 }; return { len: 0.4 * sz * S.len, r: 0.19 * sz * S.fat, h: 0.19 * sz * S.fat }; };
export { hash };

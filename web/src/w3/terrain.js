// The sand: one continuous underwater landscape with three levels, the same for everyone who looks at the tank.
// A high bank at the back on the left, a middle terrace across the tank, and the open floor at the front. The banks are
// sand, so their faces slope (sand cannot stand in a wall), and each level is joined to the next by a long, gentle ramp:
// the back bank runs down to the terrace on the right, and the terrace runs down to the floor at the right-hand end.
// Everything that rests on or moves over the bottom asks this file how high the sand is: the sand mesh, the octopus, the
// fish, decorations, and the finger choosing where to put something. Pure numbers, no three.js, so it is cheap to call.
import { fbm } from '../color.js';

const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const wob = (x, k) => fbm(x * 0.55 + k, k * 1.7, 0.7) - 0.5;          // a slow, uneven wobble along a bank's edge, so no edge is a ruler line

// the shape of each level along the tank (x runs left to right, z from the back towards the glass)
const hRear = (x) => 3.6 - 0.45 * ss(-4, 0.5, x);                     // the back bank: highest on the left
const zRear = (x) => -1.95 - 0.45 * ss(-1.5, 1.5, x) + 0.35 * wob(x, 3);  // where the back bank's face is, receding to the right
const lRear = (x) => 1 - ss(-0.7, 3.4, x);                           // and to the right it runs down to the terrace: the upper ramp
const hMid = (x) => 1.6 - 0.4 * ss(-3, 3, x);                      // the middle terrace
const zMid = (x) => 1.15 - 0.3 * ss(-3, 3, x) + 0.3 * wob(x, 11);   // the terrace's face
const lMid = (x) => 1 - ss(2.1, 4.5, x);                            // at the right-hand end it runs down to the floor: the lower ramp
const W_REAR = 0.85, W_MID = 0.75;                                   // how deep each face is, front to back
const face = (z, edge, w) => ss(0, 1, (edge - z) / w + 0.5);        // 0 in front of a face, 1 on top behind it

// how high the sand is at x,z (0 is the open floor). Asked many times a frame, so over the tank it is read from a table worked out once
const GX0 = -7, GZ0 = -6, GS = 0.05, GNX = 281, GNZ = 261; let grid = null;
export function sandH(x, z) {
  const u = (x - GX0) / GS, v = (z - GZ0) / GS;
  if (u < 0 || v < 0 || u >= GNX - 1 || v >= GNZ - 1) return exactH(x, z);
  if (!grid) { grid = new Float32Array(GNX * GNZ); for (let j = 0; j < GNZ; j++) for (let i = 0; i < GNX; i++) grid[j * GNX + i] = exactH(GX0 + i * GS, GZ0 + j * GS); }
  const i = u | 0, j = v | 0, fu = u - i, fv = v - j, k = j * GNX + i;
  return (grid[k] * (1 - fu) + grid[k + 1] * fu) * (1 - fv) + (grid[k + GNX] * (1 - fu) + grid[k + GNX + 1] * fu) * fv;
}
function exactH(x, z) {
  const mid = hMid(x) * face(z, zMid(x), W_MID) * lMid(x);
  const top = mid + (hRear(x) - hMid(x)) * lRear(x) * face(z, zRear(x), W_REAR);      // the back bank stands on the terrace, so its face runs from the terrace up
  const back = ss(-4.9, -7.4, z + 0.5 * wob(x, 23));                 // behind the back bank the sand falls away into deep water, so the tank has water behind it, not an endless shelf
  return (top + top * 0.06 * (fbm(x * 0.9, z * 0.9, 5) - 0.5)) * (1 - back) - 3.5 * back;      // a little unevenness on the raised sand
}
// how steep the sand is at x,z (rise over run), and which way is uphill
export function slopeAt(x, z, e = 0.08) { const gx = (sandH(x + e, z) - sandH(x - e, z)) / (2 * e), gz = (sandH(x, z + e) - sandH(x, z - e)) / (2 * e); return { s: Math.hypot(gx, gz), gx, gz }; }
// the level x,z belongs to: 'front' (the open floor), 'middle' (the terrace) or 'rear' (the back bank)
export function levelAt(x, z) { const h = sandH(x, z), hm = hMid(x); return h > hm + 0.55 * (hRear(x) - hm) * Math.max(0.35, lRear(x)) && h > hm + 0.35 ? 'rear' : h > hm * 0.5 ? 'middle' : 'front'; }
// where something of radius r rests: mostly on the lowest sand under it, so it beds in on a slope rather than floating off it
export function restY(x, z, r = 0.3) { let lo = sandH(x, z), sum = lo; for (const [a, b] of [[r, 0], [-r, 0], [0, r], [0, -r]]) { const h = sandH(x + a, z + b); lo = Math.min(lo, h); sum += h; } return lo * 0.65 + (sum / 5) * 0.35; }
// the highest sand under something of radius r: what a body that wide has to stay above, so its edge does not sink into a slope or the face of a bank
export function sandUnder(x, z, r) { let m = sandH(x, z); for (let k = 0; k < 8; k++) { const a = k * 0.785398; m = Math.max(m, sandH(x + Math.cos(a) * r, z + Math.sin(a) * r)); } return m; }
// the front glass of the tank: the open floor runs right down to it, at the bottom of the screen
export const GLASS_Z = 4.2;
// too steep to stand a decoration on
export const STEEP = 0.85;
export const placeable = (x, z) => slopeAt(x, z).s <= STEEP && slopeAt(x, z, 0.3).s <= STEEP * 1.15;

// The ways between the levels. A crawling octopus goes from one level to another only along these: up or down the
// ramp, never straight over a face. Each ramp is two points, its low end and its high end, a little way in from the face.
const rampFoot = { x: 4.1, z: () => 1.8 }, rampLow = { x: 4.0, z: () => zMid(4.0) - 0.7 }, rampLowTop = { x: 1.7, z: () => zMid(1.7) - 0.7 };      // the foot is out on the open floor, clear of the end of the terrace's face
const rampUp = { x: 3.1, z: () => -3.3 }, rampUpTop = { x: 0.0, z: () => -3.3 };
const P = (q) => ({ x: q.x, z: q.z() });
export const RAMPS = { low: [P(rampFoot), P(rampLow), P(rampLowTop)], up: [P(rampUp), P(rampUpTop)] };
const ORDER = { front: 0, middle: 1, rear: 2 };
// the stops on the way from a to b, in order (empty when they are on the same level)
export function routeBetween(ax, az, bx, bz) {
  const from = ORDER[levelAt(ax, az)], to = ORDER[levelAt(bx, bz)], out = [];
  if (from === to) {
    // the same level at both ends but a face in between: it is part-way along a ramp, so it follows that ramp to the end on its goal's level
    if (!crossesFace(ax, az, bx, bz)) return out;
    let best = null, bd = 1.3; for (const R of Object.values(RAMPS)) R.forEach((q, i) => { const d = Math.hypot(q.x - ax, q.z - az); if (d < bd) { bd = d; best = { R, i }; } });
    if (!best) return out; const { R, i } = best, lb = levelAt(bx, bz);
    const seq = levelAt(R[0].x, R[0].z) === lb ? R.slice(0, i + 1).reverse() : levelAt(R.at(-1).x, R.at(-1).z) === lb ? R.slice(i) : [];
    return seq.map((q) => ({ ...q }));
  }
  if (to > from) { if (from === 0) out.push(...RAMPS.low); if (to === 2) out.push(...RAMPS.up); }
  else { if (from === 2) out.push(...[...RAMPS.up].reverse()); if (to === 0) out.push(...[...RAMPS.low].reverse()); }
  return out.map((p) => ({ ...p }));
}
// a straight crawl from a to b crosses a face too steep to walk (it should take the ramp instead)
export function crossesFace(ax, az, bx, bz) { const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.2); for (let i = 1; i < n; i++) { const t = i / n; if (slopeAt(ax + (bx - ax) * t, az + (bz - az) * t).s > 1.15) return true; } return false; }

// Where a ray from the camera first meets the sand (for choosing where to put something with a finger).
// o and d are {x,y,z}; returns {x,y,z} or null. Steps along the ray, then narrows down on the crossing.
export function raySand(o, d, max = 80) {
  let prev = 0, step = 0.12;
  for (let t = step; t < max; t += step) {
    const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
    if (y <= sandH(x, z)) { let lo = prev, hi = t; for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2, ym = o.y + d.y * m; if (ym <= sandH(o.x + d.x * m, o.z + d.z * m)) hi = m; else lo = m; } return { x: o.x + d.x * hi, y: o.y + d.y * hi, z: o.z + d.z * hi }; }
    prev = t; if (y < -1) return null;
  }
  return null;
}

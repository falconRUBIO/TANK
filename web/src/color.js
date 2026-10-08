// Small colour + noise helpers shared by the sprite builder.
export const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const smooth = (t) => t * t * (3 - 2 * t);

// Hue-shifted 5 step ramp: shadows drift to deep blue, highlights to warm cream.
const SHADOW_DEEP = [14, 20, 62];
const SHADOW = [34, 42, 104];
const LIGHT = [255, 236, 178];
const SPEC = [255, 252, 224];
const cache = new Map();
export function ramp(base) {
  const k = base.join(',');
  let r = cache.get(k);
  if (!r) {
    r = [
      mix(base, SHADOW_DEEP, 0.66),
      mix(base, SHADOW, 0.34),
      base,
      mix(base, LIGHT, 0.26),
      mix(base, SPEC, 0.55),
    ].map((c) => c.map((v) => Math.round(clamp(v, 0, 255))));
    cache.set(k, r);
  }
  return r;
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Piecewise smooth profile through [t, value] key points.
export function prof(pts) {
  return (t) => {
    if (t <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (t <= pts[i][0]) {
        const [t0, v0] = pts[i - 1];
        const [t1, v1] = pts[i];
        return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0));
      }
    }
    return pts[pts.length - 1][1];
  };
}

function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);
  let r = 0;
  for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    const w = (dx ? xf : 1 - xf) * (dy ? yf : 1 - yf) * (dz ? zf : 1 - zf);
    r += hash3(xi + dx, yi + dy, zi + dz) * w;
  }
  return r;
}
export const fbm = (x, y, z) => noise3(x, y, z) * 0.65 + noise3(x * 2.1, y * 2.1, z * 2.1) * 0.35;

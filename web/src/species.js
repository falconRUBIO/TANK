// Species definitions. Each `make(seed)` returns a voxel sampler: sample(x,y,z) -> {c,...} | null.
// x: tail(-) -> nose(+), y: up, z: toward the camera at yaw 0. Integer lattice, body centred on z=0.
import { hex, mix, clamp, prof, mulberry32, fbm } from './color.js';

const sgn = (v) => (v < 0 ? -1 : 1);

// Shared eye painter: returns a colour if (x,y,z) is on the surface layer inside the eye.
function eyePainter(body, ex, ey, r, iris, pupil = 0.95) {
  return (x, y, z) => {
    if (z === 0) return null;
    if (body(x, y, z + sgn(z))) return null; // not the outer shell
    const d = Math.hypot(x - ex, y - ey);
    if (d > r) return null;
    if (Math.hypot(x - (ex - 0.5), y - (ey + 0.7)) < 0.62) return { c: [255, 255, 255], em: 2 };
    if (d <= pupil) return { c: [10, 12, 22], em: 1 };
    return { c: iris, em: 1 };
  };
}

// ───────────────────────── Goldfish (Pip) ─────────────────────────
const goldfish = {
  id: 'goldfish', label: 'Goldfish', length: 40,
  make(seed = 1) {
    const rng = mulberry32(seed * 7919 + 13);
    const off = [rng() * 90, rng() * 90, rng() * 90];
    const whiteAmt = 0.22 + rng() * 0.2;
    const orange = mix(hex(0xea6a1c), hex(0xf08a24), rng());
    const X0 = 6, L = 28;
    const hy = prof([[0, 2.2], [0.1, 4.2], [0.28, 7.6], [0.5, 9.4], [0.72, 8.4], [0.9, 5.8], [1, 3]]);
    const hz = prof([[0, 1], [0.1, 2.2], [0.3, 4.2], [0.5, 5.2], [0.75, 4.6], [0.92, 3], [1, 1.4]]);
    const cy = prof([[0, 0], [0.5, 0.7], [1, -0.4]]);
    const body = (x, y, z) => {
      const t = (x - X0) / L;
      if (t < 0 || t > 1) return null;
      const h = hy(t), w = hz(t);
      const dy = (y - cy(t)) / h, dz = z / w;
      return dy * dy + dz * dz <= 1 ? { t, dy, dz } : null;
    };
    const eye = eyePainter(body, X0 + 0.82 * L, 2.6, 2.3, [250, 236, 200], 1.35);
    const cream = hex(0xfbebd0);
    const tailCol = (d, y) => {
      const ray = Math.floor(Math.atan2(y, d + 1) * 9) & 1;
      let c = mix(cream, hex(0xf6c9a0), clamp(1 - d / 5) * 0.8);
      if (ray) c = mix(c, [255, 255, 250], 0.35);
      return c;
    };
    return {
      bounds: { x: [-10, 40], y: [-20, 20], z: [-8, 8] },
      center: [17, 0],
      bend: { pivot: 12, len: 16, amp: 0.5, bob: 0.9 },
      sample(x, y, z) {
        const e = eye(x, y, z);
        if (e) return e;
        const b = body(x, y, z);
        if (b) {
          const { t, dy } = b;
          const n = fbm(x * 0.13 + off[0], y * 0.16 + off[1], Math.abs(z) * 0.1 + off[2]);
          const banded = fbm(x * 0.1 + off[1], 3 + off[2], 5) * 0.6 + n * 0.4;
          let c = orange;
          if (t > 0.78 && dy > -0.2) c = mix(orange, [255, 120, 40], 0.4); // orange head cap
          else if (banded > 0.76 - whiteAmt * 0.5) c = cream;
          if (dy > 0.45) c = mix(c, hex(0xc24a18), (dy - 0.45) * 0.9);
          if (dy < -0.45) c = mix(c, hex(0xffd9a6), (-dy - 0.45) * 1.1);
          if (t > 0.97 && Math.abs(dy) < 0.5) c = mix(c, hex(0xffb070), 0.5);
          return { c };
        }
        // tail: flowing forked fan
        const dT = 6 - x;
        if (dT >= 0 && dT <= 13 && z === 0) {
          const wob = Math.sin(dT * 0.55 + 0.5) * 1.1;
          const hh = 2.2 + dT * 0.68;
          const ay = Math.abs(y - wob * 0.5);
          if (ay <= hh && !(dT > 6 && ay < (dT - 6) * 0.7)) return { c: tailCol(dT, y), wave: 0.5 };
        }
        // dorsal fin, swept back
        const top = 0.7 + hy(clamp((x - X0) / L)) + 0.3;
        if (z === 0 && x >= 8 && x <= 34 && y >= top - 2) {
          const sx = x + 0.55 * (y - top);
          const s = (sx - 10) / 22;
          if (s > 0 && s < 1) {
            const h = 8 * (s < 0.72 ? Math.pow(s / 0.72, 1.3) : (1 - s) / 0.28);
            if (y - top <= h) {
              const ray = (Math.floor((x - y * 0.4) / 2) & 1);
              return { c: mix(cream, [255, 255, 248], ray ? 0.4 : 0), wave: 0.3 };
            }
          }
        }
        // anal + pelvic fins
        if (z === 0 && x >= 9 && x <= 18) {
          const bot = cy(0.3) - hy(clamp((x - X0) / L)) + 0.6;
          const s = (x - 9) / 9;
          if (y <= bot + 1 && y >= bot - 6 * Math.sin(Math.PI * s) * (1 - s * 0.3) && s >= 0) return { c: mix(cream, hex(0xf6c9a0), 0.4), wave: 0.3 };
        }
        // pectoral fins: lie against the flanks, flutter outward
        const pz = Math.abs(z);
        if (pz >= 1 && x >= 20 && x <= 29 && y >= -5 && y <= -1) {
          const bw = body(x, y, 0) ? hz(clamp((x - X0) / L)) : 0;
          const edge = Math.round(bw * 0.8) + 1;
          const s = (x - 20) / 9;
          if (pz === edge && y <= -1 - Math.abs(s - 0.2) * 3 && y >= -5 + s * 2) return { c: mix(cream, hex(0xf6c9a0), 0.3), flap: 1.4 };
        }
        return null;
      },
    };
  },
};

// ───────────────────────── Blue (electric blue cichlid) ─────────────────────────
const bluefish = {
  id: 'blue', label: 'Blue Ram', length: 34,
  make(seed = 1) {
    const rng = mulberry32(seed * 104729 + 5);
    const off = [rng() * 90, rng() * 90, rng() * 90];
    const blue = mix(hex(0x2450e0), hex(0x2a78f0), rng());
    const X0 = 4, L = 25;
    const hy = prof([[0, 2], [0.12, 4.2], [0.35, 7], [0.58, 7.8], [0.8, 6.6], [0.94, 4.6], [1, 2.6]]);
    const hz = prof([[0, 1], [0.15, 2.2], [0.4, 3.8], [0.6, 4.2], [0.85, 3.4], [1, 1.5]]);
    const cy = prof([[0, 0], [0.7, 0.4], [1, -0.6]]);
    const body = (x, y, z) => {
      const t = (x - X0) / L;
      if (t < 0 || t > 1) return null;
      const h = hy(t), w = hz(t);
      const dy = (y - cy(t)) / h, dz = z / w;
      return dy * dy + dz * dz <= 1 ? { t, dy } : null;
    };
    const eye = eyePainter(body, X0 + 0.8 * L, 2.0, 2.1, hex(0xf2c230), 1.05);
    const edge = hex(0x8ec8ff), deep = hex(0x14288f);
    return {
      bounds: { x: [-10, 34], y: [-16, 16], z: [-7, 7] },
      center: [15, 0],
      bend: { pivot: 8, len: 14, amp: 0.55, bob: 0.8 },
      sample(x, y, z) {
        const e = eye(x, y, z);
        if (e) return e;
        const b = body(x, y, z);
        if (b) {
          const { t, dy } = b;
          let c = mix(deep, blue, clamp(0.55 + dy * 0.5 + 0.2));
          const sc = fbm(x * 0.5 + off[0], y * 0.5 + off[1], z * 0.4 + off[2]);
          if (sc > 0.64) c = mix(c, hex(0x6fb4ff), 0.45);       // iridescent scale glints
          if (dy > 0.5) c = mix(c, hex(0x2c6bff), 0.5);
          if (t > 0.93 && dy < 0.1) c = hex(0xf0b830);          // golden lips
          if (t > 0.6 && t < 0.7 && Math.abs(dy) < 0.8 && ((x + y) & 1) === 0) c = mix(c, hex(0x1a2f9a), 0.45); // faint gill bar
          return { c };
        }
        const topAt = cy(clamp((x - X0) / L)) + hy(clamp((x - X0) / L));
        // long spiny dorsal
        if (z === 0 && x >= 6 && x <= 28 && y >= topAt - 1) {
          const s = (x - 6) / 22;
          const h = 6.5 * Math.sin(Math.PI * Math.pow(s, 0.75)) + 1.5 * (1 - s);
          if (y - topAt <= h) {
            const spike = ((x & 1) === 0);
            return { c: mix(blue, edge, spike ? 0.55 : 0.1), wave: 0.3 };
          }
        }
        // anal fin
        const botAt = cy(clamp((x - X0) / L)) - hy(clamp((x - X0) / L));
        if (z === 0 && x >= 9 && x <= 22 && y <= botAt + 1) {
          const s = (x - 9) / 13;
          if (botAt - y <= 5 * Math.sin(Math.PI * s) + 1) return { c: mix(deep, blue, 0.7), wave: 0.3 };
        }
        // rounded tail
        const dT = 4 - x;
        if (dT >= 0 && dT <= 11 && z === 0) {
          const hh = 2 + Math.sqrt(dT) * 3.1 * (1 - dT / 18);
          if (Math.abs(y) <= hh) {
            const rim = dT > 8.5 || Math.abs(y) > hh - 1.4;
            const ray = Math.floor(Math.atan2(y, dT + 1) * 7) & 1;
            return { c: mix(mix(deep, blue, 0.55), edge, rim ? 0.6 : ray ? 0.2 : 0), wave: 0.5 };
          }
        }
        // pectoral
        const pz = Math.abs(z);
        if (pz === 4 && x >= 18 && x <= 24 && y >= -3 && y <= 0 && Math.abs(y + 1.5) <= 2 - Math.abs(x - 21) * 0.4) return { c: mix(blue, edge, 0.45), flap: 1.2 };
        return null;
      },
    };
  },
};

// ───────────────────────── Angelfish ─────────────────────────
const angelfish = {
  id: 'angelfish', label: 'Angelfish', length: 46,
  make(seed = 1) {
    const rng = mulberry32(seed * 15485863 + 3);
    const off = [rng() * 90, rng() * 90, rng() * 90];
    const silver = mix(hex(0xe2e4da), hex(0xf2ecd2), rng() * 0.6);
    const X0 = 6, L = 22;
    const hy = prof([[0, 2.4], [0.14, 7], [0.38, 11.2], [0.6, 11.4], [0.82, 8], [0.95, 4.2], [1, 1.6]]);
    const hz = prof([[0, 1.2], [0.2, 2.6], [0.5, 3.6], [0.8, 3], [1, 1.2]]);
    const cy = prof([[0, 0], [1, -0.5]]);
    const body = (x, y, z) => {
      const t = (x - X0) / L;
      if (t < 0 || t > 1) return null;
      const h = hy(t), w = hz(t);
      const dy = (y - cy(t)) / h, dz = z / w;
      return dy * dy + dz * dz <= 1 ? { t, dy } : null;
    };
    const eye = eyePainter(body, X0 + 0.82 * L, 2.2, 1.9, hex(0xe8a53a), 1.0);
    const black = hex(0x23272c);
    const stripe = (t) => (Math.abs(t - 0.1) < 0.045 || Math.abs(t - 0.4) < 0.075 || Math.abs(t - 0.84) < 0.05);
    return {
      bounds: { x: [-6, 30], y: [-30, 28], z: [-6, 6] },
      center: [17, 0],
      bend: { pivot: 8, len: 12, amp: 0.4, bob: 0.4 },
      sample(x, y, z) {
        const e = eye(x, y, z);
        if (e) return e;
        const b = body(x, y, z);
        if (b) {
          const { t, dy } = b;
          let c = silver;
          if (dy > 0.55) c = mix(c, hex(0xd2c08a), (dy - 0.55) * 1.2);
          if (dy < -0.5) c = mix(c, hex(0xf7efe0), 0.5);
          if (stripe(t)) c = black;
          if (t > 0.9 && dy < 0.3) c = mix(c, hex(0xe0a090), 0.4);
          return { c };
        }
        const bt = (x) => clamp((x - X0) / L);
        // tall swept dorsal fin
        const top = cy(bt(x)) + hy(bt(x));
        if (z === 0 && y >= top - 4 && x >= 8 && x <= 30) {
          const sx = x + 0.9 * (y - top);   // lean back
          const s = (sx - 10) / 13;
          if (s > 0 && s < 1) {
            const h = 17 * (s < 0.55 ? s / 0.55 : (1 - s) / 0.45);
            if (y - top <= h) {
              const t = bt(sx);
              return { c: stripe(t * 0.9 + 0.05) ? mix(black, silver, 0.2) : mix(silver, hex(0xcfd8d4), 0.35), wave: 0.4 };
            }
          }
        }
        // anal fin, mirrored
        const bot = cy(bt(x)) - hy(bt(x));
        if (z === 0 && y <= bot + 4 && x >= 8 && x <= 28) {
          const sx = x + 0.9 * (bot - y);
          const s = (sx - 10) / 13;
          if (s > 0 && s < 1) {
            const h = 14 * (s < 0.5 ? s / 0.5 : (1 - s) / 0.5);
            if (bot - y <= h) return { c: stripe(bt(sx) * 0.9 + 0.1) ? mix(black, silver, 0.2) : mix(silver, hex(0xcfd8d4), 0.35), wave: 0.4 };
          }
        }
        // trailing pelvic filaments
        if (Math.abs(z) === 1 && x >= 18 && x <= 24) {
          const yy = bot + 1 - ((x - 18) * 0 + 0);
          const len = 15;
          const k = (24 - x);
          if (y <= yy - 1 && y >= yy - len + k * 1.2 && Math.abs(x - (20 - (yy - y) * 0.18)) < 0.9) return { c: mix(silver, [255, 255, 255], 0.3), flap: 0.7 };
        }
        // forked tail
        const dT = 6 - x;
        if (dT >= 0 && dT <= 7 && z === 0) {
          const hh = 2 + dT * 1.15;
          if (Math.abs(y) <= hh && !(dT > 4 && Math.abs(y) < (dT - 4) * 0.8)) return { c: mix(silver, hex(0xc7d4d0), dT / 8), wave: 0.5 };
        }
        return null;
      },
    };
  },
};

// ───────────────────────── Neon tetra ─────────────────────────
const neon = {
  id: 'neon', label: 'Neon Tetra', length: 20,
  make(seed = 1) {
    const X0 = 3, L = 14;
    const hy = prof([[0, 1.2], [0.2, 2.6], [0.45, 3.4], [0.75, 2.8], [1, 1.5]]);
    const hz = prof([[0, 0.8], [0.4, 1.8], [0.8, 1.5], [1, 0.8]]);
    const body = (x, y, z) => {
      const t = (x - X0) / L;
      if (t < 0 || t > 1) return null;
      const h = hy(t), w = hz(t);
      const dy = y / h, dz = z / w;
      return dy * dy + dz * dz <= 1 ? { t, dy } : null;
    };
    const eye = eyePainter(body, X0 + 0.84 * L, 0.7, 1.35, [200, 220, 235], 0.55);
    return {
      bounds: { x: [-6, 20], y: [-7, 7], z: [-4, 4] },
      center: [9, 0],
      bend: { pivot: 6, len: 8, amp: 0.55, bob: 0.4 },
      sample(x, y, z) {
        const e = eye(x, y, z);
        if (e) return e;
        const b = body(x, y, z);
        if (b) {
          const { t, dy } = b;
          if (t > 0.1 && t < 0.88 && y >= 0 && y <= 1.2 && Math.abs(z) >= 0 ) return { c: hex(0x32d2ff), em: 2 }; // neon stripe
          if (dy > 0.2) return { c: hex(0x4a5f68) };
          if (t < 0.58 && dy < 0) return { c: hex(0xe83a2a), em: 1 };           // red rear belly
          return { c: hex(0xcfd8dc) };
        }
        const dT = 3 - x;
        if (dT >= 0 && dT <= 5 && z === 0 && Math.abs(y) <= 1 + dT * 0.7 && !(dT > 3 && Math.abs(y) < 0.8)) return { c: [150, 190, 205], wave: 0.3 };
        if (z === 0 && x >= 6 && x <= 10 && y >= 3 && y <= 3 + (10 - x) * 0.5 + 0.4 && y > hy((x - X0) / L) - 0.5) return { c: hex(0x6a7f88) };
        if (z === 0 && x >= 6 && x <= 9 && y <= -2.8 && y >= -4.2) return { c: [220, 230, 235] };
        return null;
      },
    };
  },
};

// ───────────────────────── Corydoras ─────────────────────────
const cory = {
  id: 'cory', label: 'Corydoras', length: 30,
  make(seed = 1) {
    const rng = mulberry32(seed * 8191 + 7);
    const off = [rng() * 90, rng() * 90, rng() * 90];
    const X0 = 4, L = 20;
    const hy = prof([[0, 1.6], [0.15, 3.4], [0.45, 5.4], [0.75, 5.2], [0.95, 3.6], [1, 2.4]]);
    const hz = prof([[0, 1], [0.3, 3], [0.6, 3.8], [0.9, 3], [1, 1.5]]);
    const cyp = prof([[0, 0.5], [0.5, 1.2], [1, 0.2]]);
    const body = (x, y, z) => {
      const t = (x - X0) / L;
      if (t < 0 || t > 1) return null;
      const h = hy(t), w = hz(t);
      const dy = (y - cyp(t)) / h, dz = z / w;
      if (y < -3.6) return null; // flat belly
      return dy * dy + dz * dz <= 1 ? { t, dy } : null;
    };
    const eye = eyePainter(body, X0 + 0.8 * L, 2.4, 1.6, hex(0xd8c8a0), 0.95);
    const tan = hex(0xd5a572), brown = hex(0x6b4a30);
    return {
      bounds: { x: [-8, 28], y: [-8, 12], z: [-6, 6] },
      center: [13, 0],
      bend: { pivot: 6, len: 10, amp: 0.5, bob: 0.3 },
      sample(x, y, z) {
        const e = eye(x, y, z);
        if (e) return e;
        const b = body(x, y, z);
        if (b) {
          const { t, dy } = b;
          let c = tan;
          if (dy > 0.2) c = mix(c, hex(0x8a6540), (dy - 0.2) * 0.9);
          if (dy < -0.3) c = mix(c, hex(0xf2dcc0), 0.6);
          const n = fbm(x * 0.35 + off[0], y * 0.35 + off[1], Math.abs(z) * 0.3 + off[2]);
          if (n > 0.6 && dy > -0.2) c = mix(c, brown, 0.8);           // dark mottling
          if (Math.abs(dy - 0.15) < 0.14 && t > 0.15 && t < 0.8) c = mix(c, hex(0xa4713f), 0.45); // lateral plate seam
          return { c };
        }
        // barbels
        if (z !== 0 && Math.abs(z) === 1 && x >= 24 && x <= 27 && y <= -1.5 && y >= -3 - (x - 24) * 0.2) return { c: hex(0xe8c9a0), wave: 0.6 };
        const bt = (x) => clamp((x - X0) / L);
        // dorsal spine fin
        const top = cyp(bt(x)) + hy(bt(x));
        if (z === 0 && x >= 12 && x <= 19 && y >= top - 1) {
          const sx = x + 0.7 * (y - top);
          if (sx >= 12 && sx <= 18 && y - top <= 7 * (1 - Math.abs(sx - 13.5) / 5)) return { c: mix(tan, hex(0x8a6540), 0.4 + (y - top) * 0.08), wave: 0.2 };
        }
        // forked tail
        const dT = 5 - x;
        if (dT >= 0 && dT <= 8 && z === 0) {
          const hh = 1.5 + dT * 1.0;
          if (Math.abs(y - 0.5) <= hh && !(dT > 5 && Math.abs(y - 0.5) < (dT - 5) * 0.9)) return { c: Math.floor(dT / 2) % 2 ? mix(tan, brown, 0.55) : mix(tan, hex(0xf2dcc0), 0.4), wave: 0.4 };
        }
        // pectoral (broad, on the flank)
        if (Math.abs(z) === 4 && x >= 17 && x <= 23 && y >= -3 && y <= 0) return { c: mix(tan, hex(0xf2dcc0), 0.4), flap: 1.2 };
        return null;
      },
    };
  },
};

export const SPECIES = { goldfish, blue: bluefish, angelfish, neon, cory };

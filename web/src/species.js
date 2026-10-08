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

// ───────────────────────── Goldfish (Pip) – hero fish, high-res voxels ─────────────────────────
const goldfish = {
  id: 'goldfish', label: 'Goldfish', length: 62, vox: 0.04,
  make(seed = 1) {
    const rng = mulberry32(seed * 7919 + 13);
    const off = [rng() * 90, rng() * 90, rng() * 90];
    const orange = mix(hex(0xff7a10), hex(0xff9a1c), rng());
    const bands = [0.2 + rng() * 0.04, 0.43 + rng() * 0.04, 0.64 + rng() * 0.03].slice(0, 2 + (rng() < 0.7 ? 1 : 0));
    const X0 = 10, L = 42;
    const hy = prof([[0, 3.5], [0.1, 6], [0.25, 11], [0.45, 14], [0.65, 13.5], [0.85, 10.5], [0.95, 7], [1, 4.5]]);
    const hz = prof([[0, 2], [0.15, 4], [0.35, 7], [0.55, 8], [0.8, 6.8], [0.93, 4.5], [1, 2.5]]);
    const cy = prof([[0, 0], [0.5, 1], [1, -0.6]]);
    const body = (x, y, z) => {
      const t = (x - X0) / L;
      if (t < 0 || t > 1) return null;
      const h = hy(t), w = hz(t);
      const dy = (y - cy(t)) / h, dz = z / w;
      return dy * dy + dz * dz <= 1 ? { t, dy, dz } : null;
    };
    const ex = Math.round(X0 + 0.86 * L), ey = 4;
    const cream = hex(0xf6ecdc), pale = hex(0xd9d4d6), gray = hex(0xb4b2bc), deepO = hex(0xe85e0c);
    const bt = (x) => clamp((x - X0) / L);
    return {
      bounds: { x: [-14, 56], y: [-26, 26], z: [-12, 12] },
      center: [26, 0],
      bend: { pivot: 18, len: 26, amp: 0.42, bob: 1.2 },
      sample(x, y, z) {
        const b = body(x, y, z);
        if (b) {
          const { t, dy } = b;
          const surface = z !== 0 && !body(x, y, z + (z < 0 ? -1 : 1));
          // eye: black square with a white glint
          if (surface && Math.abs(x - ex) <= 1 && Math.abs(y - ey) <= 1) {
            if (x === ex - 1 && y === ey + 1) return { c: [255, 255, 255], em: 2 };
            return { c: [12, 12, 20], em: 1 };
          }
          // lips: pale upper lip, thin red mouth line
          if (t > 0.93 && dy < -0.12 && dy > -0.34) return { c: cream };
          if (t > 0.93 && dy <= -0.34 && dy > -0.47) return { c: [186, 44, 34] };
          const n = (fbm(x * 0.2 + off[0], y * 0.2 + off[1], Math.abs(z) * 0.12 + off[2]) - 0.5);
          let c = mix(orange, deepO, clamp((dy - 0.35) * 1.3));              // darker back
          // slanted white bands that wrap round the flank
          for (const cb of bands) {
            const wd = 0.034 + (cb > 0.5 ? 0.02 : 0.012) + n * 0.03;
            if (Math.abs(t - cb + dy * 0.09 + n * 0.05) < wd && dy < 0.82) c = cream;
          }
          if (t > 0.69 && t < 0.79 && dy < 0.15 && dy > -0.6 + n * 0.3) c = cream;            // cheek patch
          if (dy < -0.38 + n * 0.5 && t > 0.18) c = mix(cream, [255, 214, 176], clamp((t - 0.6) * 0.9));   // pale belly
          if (t < 0.17) c = mix(orange, cream, clamp((0.17 - t) * 5) * 0.5);                  // peduncle fades to tail
          return { c };
        }
        // ── tail: big forked fan, zig-zag stepped edges, two-tone rays ──
        const dT = 10 - x;
        if (dT >= 0 && dT <= 24 && Math.abs(z) <= (dT < 4 ? 1 : 0)) {
          const step = (Math.floor(dT / 3) & 1) ? 1.4 : -0.6;
          const hh = 3.5 + dT * 0.66 + step;
          const ay = Math.abs(y);
          const notch = dT > 9 ? (dT - 9) * 0.78 : -1;
          if (ay <= hh && ay > notch) {
            const ray = Math.floor((Math.atan2(y, dT + 2) * 11 + 40)) & 1;
            let c = mix(ray ? pale : cream, gray, clamp(dT / 26));
            if (dT < 4) c = mix(orange, cream, dT / 4);
            return { c, wave: 0.6 };
          }
        }
        // ── dorsal fin: swept back, jagged crest, orange base fading to white ──
        const top = cy(bt(x)) + hy(bt(x));
        if (z === 0 && x >= 18 && x <= 50 && y >= top - 3) {
          const sx = x + 0.5 * (y - top);
          const s = (sx - 20) / 28;
          if (s > 0 && s < 1) {
            const spike = 1 - 0.2 * ((Math.floor(sx / 3) & 1));
            const h = 13 * (s < 0.62 ? Math.pow(s / 0.62, 1.15) : (1 - s) / 0.38) * spike;
            const up = y - top;
            if (up <= h) {
              const ray = (Math.floor((sx + up * 0.2) / 2) & 1);
              return { c: up < h * 0.35 ? mix(orange, deepO, 0.2) : mix(ray ? pale : cream, gray, clamp(up / 16)), wave: 0.35 };
            }
          }
        }
        // ── anal + pelvic fins ──
        const bot = cy(bt(x)) - hy(bt(x));
        if (z === 0 && x >= 20 && x <= 32 && y <= bot + 1.5 && y >= bot - 9 * Math.sin(Math.PI * (x - 20) / 12) * (1 - (x - 20) / 24)) return { c: mix(orange, cream, clamp((bot - y) / 7)), wave: 0.3 };
        if (Math.abs(z) === 3 && x >= 34 && x <= 44 && y <= bot + 2 && y >= bot - 8 + (x - 34) * 0.7) return { c: mix(cream, pale, 0.4), wave: 0.4 };
        // ── pectoral fins hugging the flank ──
        const az = Math.abs(z);
        if (az >= 1 && x >= 34 && x <= 46 && y >= -9 && y <= -2) {
          const w = hz(bt(x)), edge = Math.round(w * 0.9) + 1;
          const s = (x - 34) / 12;
          if (az === edge && y <= -2 - Math.abs(s - 0.25) * 4 && y >= -9 + s * 4) return { c: mix(cream, pale, ((Math.floor((x - y) / 2)) & 1) ? 0.5 : 0), flap: 1.8 };
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

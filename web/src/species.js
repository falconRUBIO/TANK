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
    const orange = mix(hex(0xff7408), hex(0xff9412), rng());
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
    const cream = hex(0xfff6e8), pale = hex(0xf0e8e2), gray = hex(0xc4bfc8), deepO = hex(0xea600a);
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
            const wd = 0.05 + (cb > 0.5 ? 0.025 : 0.014) + n * 0.03;
            if (Math.abs(t - cb + dy * 0.09 + n * 0.05) < wd && dy < 0.82) c = cream;
          }
          if (t > 0.67 && t < 0.8 && dy < 0.25 && dy > -0.7 + n * 0.3) c = cream;            // cheek patch
          if (dy < -0.24 + n * 0.45 && t > 0.18) c = mix(cream, [255, 214, 176], clamp((t - 0.6) * 0.9));   // pale belly
          if (t < 0.17) c = mix(orange, cream, clamp((0.17 - t) * 5) * 0.5);                  // peduncle fades to tail
          return { c };
        }
        // ── tail: big forked fan, zig-zag stepped edges, two-tone rays ──
        const dT = 10 - x;
        if (dT >= 0 && dT <= 24 && Math.abs(z) <= 1) {
          const step = (Math.floor(dT / 3) & 1) ? 1.4 : -0.6;
          const hh = 3.5 + dT * 0.66 + step;
          const ay = Math.abs(y);
          const notch = dT > 9 ? (dT - 9) * 0.78 : -1;
          if (ay <= hh && ay > notch) {
            const ray = Math.floor((Math.atan2(y, dT + 2) * 11 + 40)) & 1;
            if (Math.abs(z) === 1 && (dT < 3 ? false : !ray)) return null;                  // ridged, rippled fin: rays stand proud of the membrane
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

// shared helpers for the high-res species below
const mkBody = (X0, L, hy, hz, cy) => (x, y, z) => {
  const t = (x - X0) / L;
  if (t < 0 || t > 1) return null;
  const h = hy(t), w = hz(t), dy = (y - cy(t)) / h, dz = z / w;
  return dy * dy + dz * dz <= 1 ? { t, dy, dz } : null;
};
// Square pupil + glint + optional ring on the outer shell of the head.
const mkEye = (body, ex, ey, ring = null, ringR = 2.4, r = 1) => (x, y, z) => {
  if (z === 0 || body(x, y, z + (z < 0 ? -1 : 1))) return null;
  const dx = x - ex, dy = y - ey;
  if (Math.abs(dx) <= r && Math.abs(dy) <= r) return dx === -r && dy === r ? { c: [255, 255, 255], em: 2 } : { c: [10, 12, 20], em: 1 };
  if (ring && Math.hypot(dx, dy) <= ringR) return { c: ring, em: 1 };
  return null;
};

// ───────────────────────── Blue ram ─────────────────────────
const bluefish = {
  id: 'blue', label: 'Blue Ram', length: 60, vox: 0.04,
  make(seed = 1) {
    const rng = mulberry32(seed * 104729 + 5);
    const off = [rng() * 90, rng() * 90, rng() * 90];
    const X0 = 8, L = 36;
    const hy = prof([[0, 3], [0.1, 6], [0.3, 11], [0.55, 13], [0.8, 11], [0.94, 7.5], [1, 4]]);
    const hz = prof([[0, 2], [0.15, 3.5], [0.4, 6], [0.6, 6.6], [0.85, 5.2], [1, 2.5]]);
    const cy = prof([[0, 0], [0.7, 0.8], [1, -1.2]]);
    const body = mkBody(X0, L, hy, hz, cy);
    const eye = mkEye(body, Math.round(X0 + 0.8 * L), 4, hex(0xf0b324), 2.7);
    const deep = mix(hex(0x2438c8), hex(0x2c44e0), rng()), royal = hex(0x3470f4), elec = hex(0x3aa2ff), cyan = hex(0x86dcff), gold = hex(0xf2b82a);
    const bt = (x) => clamp((x - X0) / L);
    return {
      bounds: { x: [-12, 48], y: [-24, 26], z: [-10, 10] },
      center: [22, 0],
      bend: { pivot: 14, len: 22, amp: 0.45, bob: 1.0 },
      sample(x, y, z) {
        const e = eye(x, y, z); if (e) return e;
        const b = body(x, y, z);
        if (b) {
          const { t, dy } = b, k = (dy + 1) / 2;
          if (t > 0.95 && dy < -0.1 && dy > -0.5) return { c: gold };
          let c = k > 0.68 ? mix(royal, deep, (k - 0.68) / 0.32) : mix(cyan, royal, k / 0.68);
          const row = Math.floor(y / 3);
          if (((x + (row & 1) * 2) % 4 === 0) && (y % 3 + 3) % 3 === 1) c = mix(c, cyan, 0.5);          // diamond scale glints
          if (t > 0.66 && t < 0.84 && dy < 0.35 && dy > -0.55) c = mix(c, [80, 230, 214], 0.4);          // iridescent cheek
          if (fbm(x * 0.25 + off[0], y * 0.25 + off[1], Math.abs(z) * 0.2) > 0.68) c = mix(c, deep, 0.35);
          return { c };
        }
        const top = cy(bt(x)) + hy(bt(x)), bot = cy(bt(x)) - hy(bt(x));
        if (z === 0 && x >= 14 && x <= 46 && y >= top - 3) {      // long spiny dorsal
          const s = (x - 14) / 32, up = y - top;
          let h = 9 * Math.sin(Math.PI * Math.pow(s, 0.7)) + 3 * (1 - s); if (Math.floor(x / 2) & 1) h += 1.5;
          if (up <= h) return { c: up > h - 2.2 ? cyan : mix(royal, elec, (Math.floor(x / 2) & 1) ? 0.55 : 0.15), wave: 0.35 };
        }
        if (z === 0 && x >= 18 && x <= 40 && y <= bot + 2) {      // anal fin
          const s = (x - 18) / 22, dn = bot - y;
          if (dn <= 8 * Math.sin(Math.PI * s) + 2 * (1 - s)) return { c: dn > 6 ? cyan : mix(royal, deep, 0.35), wave: 0.3 };
        }
        const dT = 8 - x;                                          // rounded fan tail, a touch thick at the root
        if (dT >= 0 && dT <= 17 && Math.abs(z) <= (dT < 5 ? 1 : 0)) {
          const hh = 3 + Math.sqrt(dT) * 3.3 * (1 - dT / 30);
          if (Math.abs(y) <= hh) {
            const ray = Math.floor(Math.atan2(y, dT + 2) * 9 + 40) & 1, rim = dT > 14 || Math.abs(y) > hh - 1.6;
            return { c: mix(mix(deep, royal, ray ? 0.7 : 0.25), cyan, rim ? 0.6 : 0), wave: 0.6 };
          }
        }
        const az = Math.abs(z);
        if (az >= 1 && x >= 30 && x <= 40 && y >= -7 && y <= -1) {   // pectoral
          const edge = Math.round(hz(bt(x)) * 0.9) + 1;
          if (az === edge && Math.abs(y + 4) <= 3 - Math.abs(x - 35) * 0.45) return { c: mix(cyan, elec, 0.3), flap: 1.6 };
        }
        return null;
      },
    };
  },
};

// ───────────────────────── Angelfish ─────────────────────────
const angelfish = {
  id: 'angelfish', label: 'Angelfish', length: 66, vox: 0.036,
  make(seed = 1) {
    const rng = mulberry32(seed * 15485863 + 3);
    const silver = mix(hex(0xe4e6dc), hex(0xf4eed4), rng() * 0.6), black = hex(0x1e2026);
    const X0 = 12, L = 30;
    const hy = prof([[0, 3], [0.12, 9], [0.35, 17], [0.58, 18.5], [0.8, 14], [0.94, 8], [1, 3]]);
    const hz = prof([[0, 1.6], [0.2, 3], [0.5, 4.2], [0.8, 3.4], [1, 1.5]]);
    const cy = prof([[0, 0], [1, -1]]);
    const body = mkBody(X0, L, hy, hz, cy);
    const eye = mkEye(body, Math.round(X0 + 0.83 * L), 5, hex(0xe2782a), 2.6);
    const bar = (t) => Math.abs(t - 0.1) < 0.05 || Math.abs(t - 0.42) < 0.07 || Math.abs(t - 0.86) < 0.045;
    const bt = (x) => clamp((x - X0) / L);
    return {
      bounds: { x: [-6, 50], y: [-42, 40], z: [-8, 8] },
      center: [28, 0],
      bend: { pivot: 15, len: 14, amp: 0.35, bob: 0.5 },
      sample(x, y, z) {
        const e = eye(x, y, z); if (e) return e;
        const b = body(x, y, z);
        if (b) {
          const { t, dy } = b;
          if (bar(t)) return { c: mix(black, silver, 0.06 + (Math.abs(dy) > 0.9 ? 0.2 : 0)) };
          let c = silver;
          if (dy > 0.5) c = mix(c, [214, 192, 120], (dy - 0.5) * 1.1);
          if (dy < -0.45) c = mix(c, [250, 245, 234], 0.6);
          if (t > 0.78 && dy > 0.15) c = mix(c, [244, 212, 130], 0.5);
          if (t > 0.9) c = mix(c, [236, 180, 160], 0.3);
          return { c };
        }
        const top = cy(bt(x)) + hy(bt(x)), bot = cy(bt(x)) - hy(bt(x));
        const finCol = (t, up, h) => bar(clamp(t)) ? mix(black, silver, 0.15) : mix(silver, [176, 190, 188], clamp(up / h) * 0.7);
        if (z === 0 && y >= top - 6 && x >= 14 && x <= 50) {      // tall swept dorsal sail
          const sx = x + 1.0 * (y - top), s = (sx - 18) / 20, up = y - top;
          if (s > 0 && s < 1) { const h = 26 * (s < 0.5 ? s / 0.5 : (1 - s) / 0.5); if (up <= h) return { c: finCol(bt(sx), up, h), wave: 0.4 }; }
        }
        if (z === 0 && y <= bot + 6 && x >= 14 && x <= 48) {      // anal sail
          const sx = x + 1.0 * (bot - y), s = (sx - 18) / 20, dn = bot - y;
          if (s > 0 && s < 1) { const h = 22 * (s < 0.5 ? s / 0.5 : (1 - s) / 0.5); if (dn <= h) return { c: finCol(bt(sx), dn, h), wave: 0.4 }; }
        }
        if (Math.abs(z) <= 1 && x >= 28 && x <= 36 && y < bot + 2 && y > bot - 30) {     // pelvic filaments
          const cx = 33 - (bot + 2 - y) * 0.1;
          if (Math.abs(x - cx) < 0.9) return { c: [248, 246, 240], flap: 0.8 };
        }
        const dT = 12 - x;
        if (dT >= 0 && dT <= 12 && Math.abs(z) <= (dT < 3 ? 1 : 0)) {
          const hh = 4 + dT * 1.3, ay = Math.abs(y);
          if (ay <= hh && !(dT > 5 && ay < (dT - 5) * 0.9)) return { c: Math.floor(dT / 3) & 1 ? mix(silver, [150, 160, 168], 0.5) : mix(silver, black, 0.12 * (ay < 2)), wave: 0.6 };
        }
        return null;
      },
    };
  },
};

// ───────────────────────── Neon tetra ─────────────────────────
const neon = {
  id: 'neon', label: 'Neon Tetra', length: 36, vox: 0.04,
  make(seed = 1) {
    const X0 = 6, L = 24;
    const hy = prof([[0, 2], [0.15, 4], [0.45, 5.6], [0.75, 4.6], [1, 2.4]]);
    const hz = prof([[0, 1], [0.4, 3.2], [0.8, 2.6], [1, 1.2]]);
    const cy = () => 0;
    const body = mkBody(X0, L, hy, hz, cy);
    const eye = mkEye(body, Math.round(X0 + 0.85 * L), 1, [214, 226, 236], 2.3);
    const bt = (x) => clamp((x - X0) / L);
    return {
      bounds: { x: [-10, 32], y: [-12, 12], z: [-6, 6] },
      center: [16, 0],
      bend: { pivot: 10, len: 14, amp: 0.55, bob: 0.6 },
      sample(x, y, z) {
        const e = eye(x, y, z); if (e) return e;
        const b = body(x, y, z);
        if (b) {
          const { t, dy } = b;
          if (t > 0.1 && t < 0.9 && y >= 1 && y <= 3) return { c: [60, 224, 255], em: 2 };               // neon stripe
          if (y > 3) return { c: mix([46, 68, 60], [76, 98, 86], t) };                                   // olive back
          if (t < 0.55) return { c: [238, 44, 36], em: 1 };                                              // red lower rear
          return { c: mix([214, 224, 230], [248, 250, 252], clamp(-dy)) };
        }
        const dT = 8 - x;
        if (dT >= 0 && dT <= 12 && z === 0) { const hh = 2.5 + dT * 0.8; if (Math.abs(y) <= hh && !(dT > 5 && Math.abs(y) < (dT - 5) * 0.8)) return { c: mix([176, 206, 220], [120, 150, 170], dT / 14), wave: 0.5 }; }
        const top = hy(bt(x)), bot = -hy(bt(x));
        if (z === 0 && x >= 16 && x <= 24 && y >= top - 1 && y <= top + 5 * (1 - Math.abs(x - 19) / 5)) return { c: [70, 92, 100], wave: 0.2 };
        if (z === 0 && x >= 14 && x <= 24 && y <= bot + 1 && y >= bot - 4 * Math.sin(Math.PI * (x - 14) / 10)) return { c: Math.floor(x / 2) & 1 ? [238, 60, 50] : [240, 240, 240], wave: 0.2 };
        return null;
      },
    };
  },
};

// ───────────────────────── Corydoras ─────────────────────────
const cory = {
  id: 'cory', label: 'Corydoras', length: 46, vox: 0.04,
  make(seed = 1) {
    const rng = mulberry32(seed * 8191 + 7);
    const off = [rng() * 90, rng() * 90, rng() * 90];
    const X0 = 8, L = 30;
    const hy = prof([[0, 2.5], [0.15, 5], [0.45, 8], [0.75, 8], [0.95, 5.5], [1, 3.5]]);
    const hz = prof([[0, 1.5], [0.3, 5], [0.6, 6], [0.9, 4.5], [1, 2.5]]);
    const cyp = prof([[0, 0.8], [0.5, 2], [1, 0.4]]);
    const raw = mkBody(X0, L, hy, hz, cyp);
    const body = (x, y, z) => (y < -5.5 ? null : raw(x, y, z));                // flat belly
    const eye = mkEye(body, Math.round(X0 + 0.82 * L), 5, [214, 190, 150], 2.4);
    const bt = (x) => clamp((x - X0) / L);
    return {
      bounds: { x: [-10, 46], y: [-12, 18], z: [-9, 9] },
      center: [20, 0],
      bend: { pivot: 12, len: 16, amp: 0.5, bob: 0.4 },
      sample(x, y, z) {
        const e = eye(x, y, z); if (e) return e;
        const b = body(x, y, z);
        if (b) {
          const { t, dy } = b;
          let c = dy > 0.3 ? mix([196, 150, 92], [146, 114, 64], (dy - 0.3) * 1.3) : mix([244, 226, 196], [214, 170, 112], clamp(dy + 0.9));
          const n = fbm(x * 0.3 + off[0], y * 0.3 + off[1], Math.abs(z) * 0.25 + off[2]);
          if (n > 0.6 && dy > -0.3) c = mix(c, [72, 50, 32], 0.8);              // dark mottling
          if (Math.abs(dy - 0.12) < 0.07 && t > 0.15 && t < 0.85) c = mix(c, [128, 92, 54], 0.5);   // plate seam
          return { c };
        }
        if (Math.abs(z) >= 1 && Math.abs(z) <= 2 && x >= 40 && x <= 46 && y <= -2.5 && y >= -5.5 + (x - 40) * 0.3) return { c: [238, 214, 176], wave: 0.7 };   // barbels
        const top = cyp(bt(x)) + hy(bt(x));
        if (z === 0 && x >= 20 && x <= 32 && y >= top - 1) { const sx = x + 0.8 * (y - top), h = 13 * (1 - Math.abs(sx - 25) / 6); if (h > 0 && y - top <= h) return { c: mix([208, 166, 108], [110, 80, 50], clamp((y - top) / 14)), wave: 0.2 }; }
        const dT = 8 - x;
        if (dT >= 0 && dT <= 12 && Math.abs(z) <= (dT < 3 ? 1 : 0)) { const hh = 2.5 + dT * 0.95; if (Math.abs(y - 0.5) <= hh && !(dT > 5 && Math.abs(y - 0.5) < (dT - 5) * 0.9)) return { c: Math.floor(dT / 3) & 1 ? [112, 80, 50] : [226, 188, 140], wave: 0.6 }; }
        const az = Math.abs(z);
        if (az >= 1 && x >= 30 && x <= 38 && y >= -6 && y <= -1) { const edge = Math.round(hz(bt(x)) * 0.9) + 1; if (az === edge && y <= -1 - Math.abs(x - 33) * 0.4) return { c: [232, 204, 164], flap: 1.5 }; }
        return null;
      },
    };
  },
};


// ───────────────────────── Guppy ─────────────────────────
const guppy = {
  id: 'guppy', label: 'Guppy', length: 34, vox: 0.04,
  make(seed = 1) {
    const rng = mulberry32(seed * 6151 + 11);
    const pals = this.pals ?? [[hex(0xff7a2a), hex(0xffd23a), hex(0x2a8ad8)], [hex(0x3a8ae8), hex(0x8ae0ff), hex(0xff5a9a)], [hex(0xe0409a), hex(0xff9ad0), hex(0x6a3ad0)], [hex(0x34c08a), hex(0xb8ff8a), hex(0xff8a3a)]];
    const [bodyC, bellyC, tailC] = pals[Math.floor(rng() * pals.length)];
    const X0 = 8, L = 18;
    const hy = prof([[0, 1.6], [0.2, 3.4], [0.5, 4.4], [0.8, 3.6], [1, 2]]);
    const hz = prof([[0, 0.8], [0.4, 2.6], [0.8, 2.2], [1, 1]]);
    const body = mkBody(X0, L, hy, hz, () => 0);
    const eye = mkEye(body, Math.round(X0 + 0.84 * L), 1, [248, 236, 200], 2.2);
    return {
      bounds: { x: [-14, 30], y: [-14, 14], z: [-6, 6] }, center: [14, 0],
      bend: { pivot: 10, len: 10, amp: 0.6, bob: 0.5 },
      sample(x, y, z) {
        const e = eye(x, y, z); if (e) return e;
        const b = body(x, y, z);
        if (b) { const { t, dy } = b; let c = mix(bellyC, bodyC, clamp((dy + 1) * 0.6 + 0.1)); if (t < 0.4) c = mix(c, tailC, 0.5 + (0.4 - t)); if (t > 0.45 && t < 0.6 && dy > -0.2 && dy < 0.5) c = mix(c, [255, 255, 255], 0.4); return { c }; }
        const dT = 8 - x;
        if (dT >= 0 && dT <= 13 && Math.abs(z) <= (dT < 3 ? 1 : 0)) {          // fan tail
          const hh = 2.4 + dT * 0.6;
          if (Math.abs(y) <= hh) { const spot = ((Math.floor(dT / 3) + Math.floor(y / 3)) & 1) === 0; const rim = dT > 11 || Math.abs(y) > hh - 1.5; return { c: mix(tailC, rim ? [255, 240, 200] : bodyC, 0.2 + (spot ? 0 : 0.08)), wave: 0.7 }; }
        }
        const bt = (x) => clamp((x - X0) / L);
        if (z === 0 && x >= 15 && x <= 22 && y >= hy(bt(x)) - 1 && y <= hy(bt(x)) + 4 * (1 - Math.abs(x - 18.5) / 4)) return { c: mix(tailC, bodyC, 0.4), wave: 0.3 };
        if (z === 0 && x >= 14 && x <= 20 && y <= -hy(bt(x)) + 1 && y >= -hy(bt(x)) - 3) return { c: mix(tailC, bellyC, 0.5), wave: 0.3 };
        return null;
      },
    };
  },
};

const platy = { ...guppy, id: 'platy', label: 'Platy', length: 30, pals: [[hex(0xf2542a), hex(0xffe08a), hex(0x2a2a3a)], [hex(0xf2c42a), hex(0xfff2b0), hex(0xd8402a)], [hex(0x2a9ae0), hex(0xbfeaff), hex(0xf2a42a)]] };

// ───────────────────────── Zebra danio ─────────────────────────
const danio = {
  id: 'danio', label: 'Zebra Danio', length: 34, vox: 0.04,
  make(seed = 1) {
    const X0 = 6, L = 24;
    const hy = prof([[0, 2], [0.15, 3.8], [0.45, 4.8], [0.75, 4], [1, 2.2]]);
    const hz = prof([[0, 1], [0.4, 3], [0.8, 2.4], [1, 1.2]]);
    const body = mkBody(X0, L, hy, hz, () => 0);
    const eye = mkEye(body, Math.round(X0 + 0.85 * L), 1, [240, 214, 120], 2.2);
    const bt = (x) => clamp((x - X0) / L);
    return {
      bounds: { x: [-10, 32], y: [-12, 12], z: [-6, 6] }, center: [16, 0],
      bend: { pivot: 10, len: 14, amp: 0.55, bob: 0.6 },
      sample(x, y, z) {
        const e = eye(x, y, z); if (e) return e;
        const b = body(x, y, z);
        if (b) { const stripe = ((Math.floor((y + 8) / 1.8)) & 1) === 0 && b.dy < 0.8 && b.dy > -0.7; let c = stripe ? [34, 56, 150] : mix([248, 214, 120], [255, 240, 190], clamp(-b.dy)); if (b.t > 0.88) c = mix(c, [255, 232, 180], 0.5); return { c, em: stripe ? 0 : 0 }; }
        const dT = 8 - x;
        if (dT >= 0 && dT <= 11 && z === 0) { const hh = 2.5 + dT * 0.8; if (Math.abs(y) <= hh && !(dT > 5 && Math.abs(y) < (dT - 5) * 0.8)) return { c: (Math.floor(Math.abs(y) / 1.8) & 1) ? [236, 214, 140] : [34, 56, 150], wave: 0.5 }; }
        const top = hy(bt(x)); if (z === 0 && x >= 16 && x <= 23 && y >= top - 1 && y <= top + 4 * (1 - Math.abs(x - 19.5) / 4)) return { c: [226, 200, 130], wave: 0.2 };
        if (z === 0 && x >= 14 && x <= 23 && y <= -top + 1 && y >= -top - 3) return { c: [226, 200, 130], wave: 0.2 };
        return null;
      },
    };
  },
};

// ───────────────────────── Betta ─────────────────────────
const betta = {
  id: 'betta', label: 'Betta', length: 54, vox: 0.04,
  make(seed = 1) {
    const rng = mulberry32(seed * 2713 + 5);
    const pals = [[hex(0xd01838), hex(0xff6a7a), hex(0x2a4ad8)], [hex(0x2a48e0), hex(0x7ab8ff), hex(0xd02a8a)], [hex(0x8a2ad0), hex(0xd88aff), hex(0x2ad0c0)]];
    const [bodyC, lightC, edgeC] = pals[Math.floor(rng() * pals.length)];
    const X0 = 12, L = 28;
    const hy = prof([[0, 2], [0.2, 4.6], [0.5, 6], [0.8, 4.8], [1, 3]]);
    const hz = prof([[0, 1], [0.4, 3.2], [0.8, 2.6], [1, 1.2]]);
    const body = mkBody(X0, L, hy, hz, () => 0);
    const eye = mkEye(body, Math.round(X0 + 0.84 * L), 2, [250, 220, 120], 2.4);
    const bt = (x) => clamp((x - X0) / L);
    return {
      bounds: { x: [-26, 44], y: [-22, 22], z: [-6, 6] }, center: [20, 0],
      bend: { pivot: 14, len: 24, amp: 0.5, bob: 1.0 },
      sample(x, y, z) {
        const e = eye(x, y, z); if (e) return e;
        const b = body(x, y, z);
        if (b) { const { t, dy } = b; let c = mix(lightC, bodyC, clamp((dy + 1) * 0.7)); if (fbm(x * 0.5, y * 0.5, Math.abs(z) * 0.4 + seed) > 0.66) c = mix(c, edgeC, 0.5); if (t > 0.9 && dy < 0) c = mix(c, [255, 220, 150], 0.5); return { c, em: 0 }; }
        const dT = 12 - x;
        if (dT >= 0 && dT <= 36 && Math.abs(z) <= (dT < 4 ? 1 : 0)) {          // flowing tail with a scalloped edge
          const hh = 3 + dT * 0.72 - (Math.sin(dT * 0.5) > 0.7 ? 1.5 : 0);
          if (Math.abs(y) <= hh) { const ray = Math.floor(Math.atan2(y, dT + 2) * 12 + 40) & 1; return { c: mix(mix(bodyC, edgeC, clamp(dT / 36)), lightC, ray ? 0.35 : 0), wave: 0.9 }; }
        }
        if (z === 0 && x >= 16 && x <= 38 && y >= hy(bt(x)) - 1) { const s = (x - 16) / 22, h = 14 * Math.sin(Math.PI * Math.pow(s, 0.8)) + 3 * (1 - s), up = y - hy(bt(x)); if (up <= h) return { c: mix(bodyC, edgeC, clamp(up / 14)), wave: 0.6 }; }
        if (z === 0 && x >= 14 && x <= 38 && y <= -hy(bt(x)) + 1) { const s = (x - 14) / 24, h = 12 * Math.sin(Math.PI * Math.pow(s, 0.8)) + 2 * (1 - s), dn = -hy(bt(x)) - y; if (dn <= h) return { c: mix(bodyC, edgeC, clamp(dn / 12)), wave: 0.6 }; }
        return null;
      },
    };
  },
};

// ───────────────────────── Saltwater roster ─────────────────────────
// Internal ids (goldfish, neon, cory …) are what saves and orders store, so they stay; what the player sees is the saltwater fish below.
// `skin` re-paints an existing body with a colour rule that also knows where the voxel is (x along the body, y up).
const lum = (c) => (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255;
const skin = (base, id, label, fn, extra = {}) => ({ ...base, ...extra, id, label, make(seed = 1) { const m = base.make.call(base, seed), inner = m.sample; return { ...m, sample: (x, y, z) => { const r = inner(x, y, z); return r ? (r.em && r.em > 0 && r.em < 3 && lum(r.c) < 0.12 || r.em > 1 ? r : { ...r, c: fn(r.c, x, y, z, seed, r) }) : r; } }; } });
const ramp3 = (c, lo, hi) => mix(lo, hi, clamp(lum(c) * 1.25));

// ── A parametric reef-fish builder: oval body, proper tail (round or forked), dorsal / anal / pectoral fins, eye with ring, and a paint rule per species. ──
const reef = (o) => ({
  id: o.id, label: o.label, length: o.length ?? 50, vox: o.vox ?? 0.045, move: o.move,
  make(seed = 1) {
    const rng = mulberry32(seed * 6469 + o.id.length * 31), P = o.pals ? o.pals[Math.floor(rng() * o.pals.length)] : null;
    const X0 = 10, L = o.L, hy = prof(o.hy), hz = prof(o.hz), body = mkBody(X0, L, hy, hz, () => 0), eye = mkEye(body, Math.round(X0 + o.eye[0] * L), o.eye[1], o.ring ?? null, o.ringR ?? 2.4, o.eyeR ?? 1);
    const bt = (x) => clamp((x - X0) / L), T = o.tail, len = T.len;
    const paint = (c) => o.paint({ ...c, P, seed, rng }), fin = (u, c) => o.fin({ ...c, u, P, seed });
    return {
      bounds: { x: [X0 - len - 4, X0 + L + 6], y: [-(Math.max(...o.hy.map((p) => p[1])) + 14), Math.max(...o.hy.map((p) => p[1])) + 14], z: [-9, 9] }, center: [X0 + L * 0.42, 0],
      bend: { pivot: X0 + L * 0.35, len: L * 0.4 + len, amp: o.amp ?? 0.5, bob: 0.7 },
      sample(x, y, z) {
        const e = eye(x, y, z); if (e) return e;
        const b = body(x, y, z);
        if (b) return { c: paint({ t: b.t, dy: b.dy, dz: b.dz, x, y, z }), em: 0 };
        // ── tail ──
        const dT = X0 - x;
        if (dT >= 0 && dT <= len && Math.abs(z) <= (dT < 3 ? 1 : 0)) {
          const u = dT / len; let hh;
          if (T.kind === 'fork') { hh = hy(0) + (T.spread - hy(0)) * Math.pow(u, 0.85); if (u > T.notch && Math.abs(y) < (u - T.notch) * T.depth) return null; }
          else { const r = Math.sin(Math.min(1, u * 1.15) * Math.PI / 2); hh = hy(0) + (T.spread - hy(0)) * r; if (u > 0.86) hh *= 1 - (u - 0.86) / 0.14 * 0.8; }
          if (Math.abs(y) <= hh) return { c: fin(u, { part: 'tail', y: y / hh, x }), wave: 0.5 + u * 0.5 };
        }
        // ── dorsal fin(s): optional spiny front ──
        for (const d of o.dorsal ?? []) {
          const x0 = X0 + d.a * L, x1 = X0 + d.b * L; if (z !== 0 || x < x0 || x > x1) continue;
          const s2 = (x - x0) / (x1 - x0), top = hy(bt(x)), h = d.h * (d.shape === 'sail' ? Math.sin(Math.PI * Math.pow(s2, 0.7)) : (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, s2 * 1.1)))) * (d.spiny && Math.floor(x) % 3 === 0 ? 1.18 : 1);
          if (y >= top - 1 && y <= top + h) return { c: fin(clamp((y - top) / Math.max(1, h)), { part: 'dorsal', x }), wave: 0.25 };
        }
        // ── anal fin + pelvic ──
        const A = o.anal; if (A && z === 0) { const x0 = X0 + A.a * L, x1 = X0 + A.b * L; if (x >= x0 && x <= x1) { const s2 = (x - x0) / (x1 - x0), bot = -hy(bt(x)), h = A.h * Math.sin(Math.PI * Math.pow(s2, 0.8)); if (y <= bot + 1 && y >= bot - h) return { c: fin(clamp((bot - y) / Math.max(1, h)), { part: 'anal', x }), wave: 0.25 }; } }
        if (o.pelvic && Math.abs(z) === 2 && x >= X0 + o.pelvic[0] * L && x <= X0 + o.pelvic[1] * L) { const bot = -hy(bt(x)); if (y <= bot + 1 && y >= bot - 4) return { c: fin(0.6, { part: 'pelvic', x }), flap: 0.8 }; }
        // ── pectoral fin hugging the flank ──
        if (o.pec && Math.abs(z) >= 1) { const px = X0 + o.pec[0] * L, w = hz(bt(x)), edge = Math.round(w * 0.88) + 1; if (Math.abs(z) === edge && x >= px - 3 && x <= px + 3 && Math.abs(y - o.pec[1]) <= 2.5 - Math.abs(x - px) * 0.3) return { c: fin(0.5, { part: 'pec', x }), flap: 1.2 }; }
        return null;
      },
    };
  },
});
const lerpc = (a, b, k) => mix(a, b, clamp(k));
const clownfish = reef({
  id: 'goldfish', label: 'Clownfish', L: 28, vox: 0.05, length: 52, eye: [0.8, 2], ring: [255, 190, 90], ringR: 2.2, amp: 0.45,
  hy: [[0, 3], [0.1, 5.4], [0.3, 8.6], [0.55, 9.4], [0.8, 7.6], [0.95, 5], [1, 3]], hz: [[0, 1.6], [0.3, 4], [0.6, 5.2], [0.9, 3.6], [1, 2]],
  tail: { kind: 'round', len: 11, spread: 7.5 }, dorsal: [{ a: 0.2, b: 0.9, h: 4.6, spiny: true }], anal: { a: 0.3, b: 0.58, h: 3.6 }, pelvic: [0.45, 0.6], pec: [0.62, -1],
  paint: ({ t, dy }) => { const band = (a, b) => t >= a && t <= b, edge = (a, b) => t >= a - 0.028 && t <= b + 0.028;
    if (band(0.69, 0.76) || band(0.38, 0.47) || band(0.08, 0.13)) return [252, 250, 244];
    if (edge(0.69, 0.76) || edge(0.38, 0.47) || edge(0.08, 0.13)) return [28, 20, 22];
    return lerpc([232, 76, 10], [255, 156, 40], (-dy + 0.4) * 0.8); },
  fin: (c) => { if (c.u > 0.9) return [24, 18, 22]; if (c.u > 0.8) return [250, 246, 238]; return lerpc([240, 92, 12], [255, 150, 36], c.u); },
});
const gramma = reef({
  id: 'blue', label: 'Royal Gramma', L: 32, vox: 0.045, length: 54, eye: [0.84, 2], ring: [255, 226, 90], ringR: 2.2, amp: 0.4,
  hy: [[0, 2.4], [0.15, 4.6], [0.4, 7], [0.65, 7.6], [0.9, 5.4], [1, 3]], hz: [[0, 1.4], [0.3, 3.4], [0.6, 4.6], [0.9, 3.2], [1, 1.8]],
  tail: { kind: 'round', len: 9, spread: 6.4 }, dorsal: [{ a: 0.18, b: 0.95, h: 4.2, shape: 'sail' }], anal: { a: 0.35, b: 0.7, h: 3.2 }, pelvic: [0.5, 0.65], pec: [0.66, -1],
  paint: ({ t, dy, y }) => { const k = clamp((t - 0.46) / 0.14); const purple = lerpc([120, 30, 180], [214, 104, 238], (-dy + 0.5) * 0.7), yellow = lerpc([255, 188, 24], [255, 238, 120], (-dy + 0.4) * 0.8); let c = lerpc(yellow, purple, k); if (t > 0.78 && t < 0.9 && Math.abs(y - 2) <= 1.6) c = [20, 16, 40]; return c; },
  fin: (c) => lerpc(c.x > 10 + 0.5 * 32 ? [150, 50, 210] : [255, 200, 40], c.x > 10 + 0.5 * 32 ? [220, 120, 240] : [255, 232, 110], c.u),
});
const damsel = reef({
  id: 'guppy', label: 'Damselfish', L: 22, vox: 0.045, length: 46, eye: [0.78, 2], ring: [255, 224, 120], ringR: 2.2, amp: 0.55,
  pals: [[[24, 96, 255], [150, 220, 255], [255, 214, 58]], [[255, 214, 40], [255, 246, 160], [40, 100, 240]]],
  hy: [[0, 2.6], [0.15, 5], [0.4, 8], [0.65, 8.6], [0.9, 6], [1, 3.6]], hz: [[0, 1.4], [0.3, 3.4], [0.6, 4.4], [0.9, 3], [1, 1.8]],
  tail: { kind: 'fork', len: 10, spread: 8.5, notch: 0.5, depth: 1.5 }, dorsal: [{ a: 0.12, b: 0.92, h: 5.2, spiny: true }], anal: { a: 0.3, b: 0.6, h: 3.4 }, pelvic: [0.4, 0.55], pec: [0.62, -1],
  paint: ({ dy, P }) => lerpc(P[0], P[1], (-dy - 0.1) * 0.9), fin: ({ u, P, part }) => (part === 'tail' ? lerpc(P[2], [255, 255, 255], u * 0.25) : part === 'pec' || part === 'pelvic' ? lerpc(P[1], [255, 255, 255], 0.3) : lerpc(P[0], P[2], 0.25 + u * 0.4)),
});
const cardinal = reef({                       // a Banggai-style cardinalfish: silver, three bold black bars, a big pale eye, long trailing fins with white spots
  id: 'platy', label: 'Cardinalfish', L: 22, vox: 0.045, length: 44, eye: [0.82, 2], ring: [232, 238, 244], ringR: 3.0, eyeR: 1.3, amp: 0.55,
  pals: [[[188, 200, 212], [248, 250, 255], [18, 20, 28]], [[222, 190, 146], [255, 244, 222], [44, 28, 22]]],
  hy: [[0, 2.2], [0.15, 4.6], [0.4, 7.6], [0.65, 8.0], [0.9, 6.0], [1, 3.6]], hz: [[0, 1.3], [0.3, 3.0], [0.6, 4.0], [0.9, 3], [1, 1.8]],
  tail: { kind: 'fork', len: 11, spread: 8.5, notch: 0.35, depth: 2.2 }, dorsal: [{ a: 0.3, b: 0.5, h: 4.6, spiny: true }, { a: 0.52, b: 0.9, h: 8 }], anal: { a: 0.4, b: 0.84, h: 7 }, pelvic: [0.4, 0.56], pec: [0.62, -1],
  paint: ({ t, dy, x, y, z, P }) => { if ((t > 0.74 && t < 0.86) || (t > 0.38 && t < 0.47) || (t > 0.02 && t < 0.1)) return P[2]; if (((x * 3 + y * 5 + z * 7) % 11 + 11) % 11 === 0) return [255, 255, 255]; return lerpc(P[0], P[1], (-dy + 0.15) * 0.9); },
  fin: ({ u, x, part, P }) => { if (part === 'pec' || part === 'pelvic') return lerpc(P[1], [255, 255, 255], 0.4); if (u > 0.82) return lerpc(P[1], P[2], (u - 0.82) / 0.18); return ((Math.floor(x * 1.7) + Math.floor(u * 9)) % 5 === 0) ? [255, 255, 255] : lerpc(P[0], P[1], 0.45); },
});
const anthias = reef({
  id: 'danio', label: 'Pink Anthias', L: 26, vox: 0.042, length: 48, eye: [0.84, 1], ring: [255, 224, 150], ringR: 2.2, amp: 0.6,
  hy: [[0, 2], [0.15, 3.8], [0.45, 5.6], [0.8, 4.6], [1, 2.8]], hz: [[0, 1.2], [0.4, 3], [0.8, 2.6], [1, 1.4]],
  tail: { kind: 'fork', len: 13, spread: 10, notch: 0.4, depth: 1.9 }, dorsal: [{ a: 0.2, b: 0.92, h: 6.2, spiny: true }], anal: { a: 0.35, b: 0.7, h: 3.6 }, pelvic: [0.45, 0.6], pec: [0.66, -1],
  paint: ({ t, dy }) => (t > 0.7 && dy > -0.2 && dy < 0.5 ? lerpc([255, 190, 90], [255, 140, 120], (0.9 - t) * 4) : lerpc([255, 86, 150], [255, 196, 186], (-dy + 0.3) * 0.9)), fin: ({ u }) => lerpc([255, 100, 160], [255, 214, 120], u),
});
const goby = reef({
  id: 'cory', label: 'Yellow Goby', L: 28, vox: 0.045, length: 48, eye: [0.82, 3], ring: [255, 150, 40], ringR: 2.2, amp: 0.4, move: undefined,
  hy: [[0, 1.8], [0.2, 3.6], [0.5, 4.6], [0.8, 4.4], [1, 3.4]], hz: [[0, 1.4], [0.3, 3.4], [0.6, 4.2], [0.9, 3.6], [1, 2.4]],
  tail: { kind: 'round', len: 8, spread: 5, }, dorsal: [{ a: 0.28, b: 0.5, h: 5, spiny: true }, { a: 0.54, b: 0.86, h: 4 }], anal: { a: 0.5, b: 0.8, h: 3 }, pelvic: [0.5, 0.66], pec: [0.68, -1],
  paint: ({ t, dy, x, y, z }) => (((x * 3 + y * 5 + z * 7) % 17 + 17) % 17 === 0 ? [90, 220, 240] : lerpc([232, 168, 20], [255, 236, 110], (-dy + 0.3) * 0.9)), fin: ({ u }) => lerpc([240, 190, 40], [255, 240, 150], u),
});
const chromis = skin(neon, 'neon', 'Blue Chromis', (c) => ramp3(c, [24, 84, 210], [140, 236, 230]));
const emperor = skin(angelfish, 'angelfish', 'Emperor Angelfish', (c, x, y) => (((Math.floor((x * 0.9 + y * 0.7) / 4.6) & 1) === 0) ? ramp3(c, [20, 56, 190], [70, 130, 255]) : ramp3(c, [244, 196, 30], [255, 236, 96])));
const swirl = (x, y, z, seed) => { const n = fbm(x * 0.1 + seed, y * 0.16, Math.abs(z) * 0.1 + 7), w = Math.sin(n * 8.5 + y * 0.22); return w > 0.38 ? [255, 118, 24] : w > 0.14 ? [255, 190, 54] : w > -0.3 ? [50, 190, 204] : [28, 108, 236]; };
const mandarin = reef({                         // a mandarin dragonet: long and low with a big sail of a first dorsal, swirled in blue, orange, yellow and green
  id: 'betta', label: 'Mandarin Dragonet', L: 30, vox: 0.046, length: 50, eye: [0.84, 3], ring: [255, 206, 90], ringR: 2.3, eyeR: 1.1, amp: 0.4,
  hy: [[0, 1.8], [0.15, 3.6], [0.4, 5.2], [0.75, 5.2], [1, 3.4]], hz: [[0, 1.2], [0.3, 3.0], [0.6, 4.0], [0.9, 3.2], [1, 1.8]],
  tail: { kind: 'round', len: 9, spread: 6 }, dorsal: [{ a: 0.34, b: 0.54, h: 11, shape: 'sail' }, { a: 0.54, b: 0.9, h: 4.2 }], anal: { a: 0.5, b: 0.84, h: 2.6 }, pelvic: [0.5, 0.66], pec: [0.62, -1],
  paint: ({ x, y, z, dy, seed }) => (dy < -0.62 ? [236, 232, 196] : swirl(x, y, z, seed)),
  fin: ({ u, x, part }) => (part === 'pec' || part === 'pelvic' ? [150, 218, 244] : part === 'dorsal' ? (u < 0.3 ? [255, 132, 28] : u < 0.62 ? [36, 116, 236] : [255, 170, 40]) : u > 0.55 ? [30, 110, 236] : [255, 150, 40]),
});

// ───────────────────────── Seahorse: drawn upright, nose forward, tail curled ─────────────────────────
const seahorse = {
  id: 'seahorse', label: 'Seahorse', move: 'hover', length: 54, vox: 0.044,
  make(seed = 1) {
    const rng = mulberry32(seed * 5099 + 17), pals = [[[250, 170, 50], [255, 224, 150], [196, 100, 30]], [[238, 96, 90], [255, 200, 180], [170, 50, 60]], [[230, 200, 60], [255, 244, 170], [160, 130, 30]], [[170, 120, 220], [236, 214, 255], [110, 70, 170]]];
    const [bodyC, bellyC, ridgeC] = pals[Math.floor(rng() * pals.length)];
    const P = [[7, 21], [5, 15], [4, 8], [3, 1], [2, -6], [1, -12], [2, -17], [5, -19], [8, -17], [8, -13]];
    const path = []; for (let i = 0; i < P.length - 1; i++) for (let k = 0; k < 10; k++) { const t = k / 10; path.push([P[i][0] + (P[i + 1][0] - P[i][0]) * t, P[i][1] + (P[i + 1][1] - P[i][1]) * t, (i + t) / (P.length - 1)]); }
    path.push([...P[P.length - 1], 1]);
    const rad = prof([[0, 4.6], [0.08, 4.2], [0.16, 3.0], [0.3, 6.2], [0.45, 6.0], [0.6, 3.6], [0.8, 2.2], [1, 1.1]]);
    const near = (x, y) => { let best = 1e9, bs = 0, bx = 0; for (const q of path) { const d = Math.hypot(x - q[0], y - q[1]); if (d < best) { best = d; bs = q[2]; bx = q[0]; } } return { d: best, s: bs, cx: bx }; };
    return {
      bounds: { x: [-14, 24], y: [-26, 30], z: [-9, 9] }, center: [4, 2],
      sample(x, y, z) {
        const { d, s, cx } = near(x, y), r = rad(s), inBody = (d / r) ** 2 + (z / (r * 0.8)) ** 2 <= 1;
        // snout: a short tube pointing forward from the head
        if (!inBody && x > 8 && x < 18 && Math.hypot(y - (21 - (x - 8) * 0.1), z) <= 1.7 - (x - 8) * 0.04) return { c: mix(bodyC, bellyC, 0.4) };
        // eye: a dark square with a glint on the outer shell of the head
        if (inBody && s < 0.1 && z !== 0 && (d / r) ** 2 + ((Math.abs(z) + 1) / (r * 0.8)) ** 2 > 1 && Math.abs(x - 8) <= 1 && Math.abs(y - 22) <= 1) return x === 7 && y === 23 ? { c: [255, 255, 255], em: 2 } : { c: [14, 12, 20], em: 1 };
        if (inBody) {
          let c = x > cx ? mix(bodyC, bellyC, 0.75) : bodyC; const ring = Math.floor((s * 36 + 0.3) % 2) === 0;
          if (s > 0.18 && ring) c = mix(c, ridgeC, 0.45); if (s < 0.1 && y > 24 && x < 6) c = ridgeC;                // little crown
          if (fbm(x * 0.4 + seed, y * 0.4, z * 0.4) > 0.68) c = mix(c, [255, 244, 210], 0.4);
          return { c, wave: s > 0.7 ? 0.25 : 0 };
        }
        // dorsal fin: a thin fluttering plate behind the back
        if (z === 0 && s > 0.27 && s < 0.5 && x < cx - r + 1 && x > cx - r - 5 * Math.sin((Math.PI * (s - 0.27)) / 0.23)) return { c: mix([255, 244, 220], bodyC, 0.2), wave: 1.1 };
        // tiny pectoral fin by the cheek
        if (Math.abs(z) === 2 && s > 0.12 && s < 0.2 && x < cx && x > cx - 4 && d < r + 3) return { c: [255, 240, 214], flap: 1.5 };
        return null;
      },
    };
  },
};

// ───────────────────────── Octopus: round head forward, eight trailing arms ─────────────────────────
// ── Octopus ──
// A rounded mantle leaning back over a head with two big side eyes, and eight tapering arms that radiate from under the head.
// Each arm is a rigged tube: a centre line pose(arm, t, state) plus every voxel's offset from it, so the arms can fan out and curl at rest,
// walk along the floor, and stream back together in a jet, each with its own phase. The same pose() builds the rest model and moves it.
const OCT = { ax: 3, ay: -3, floor: -9.5, rad0: 3.4, rad1: 1.1 };
const octoArms = (seed) => { const r = mulberry32(seed * 31 + 9); return Array.from({ length: 8 }, (_, i) => ({ i, th: i * Math.PI / 4 + 0.22 + (r() - 0.5) * 0.25, L: 21 + r() * 7, ph: r() * 6.28, curl: 0.6 + r() * 0.8 })); };
const GAIT = [0, 0.5, 0.25, 0.75, 0.5, 0, 0.75, 0.25];
const octoPose = (a, t, S, o = [0, 0, 0]) => {
  const c = Math.cos(a.th), s = Math.sin(a.th), ph = S.ph ?? 0, rear = c < -0.55; let rest = Math.max(0, Math.min(1, (S.rest ?? 1) + (S.crawl ?? 0) * 0.85)); if (S.dash > 0.02) rest = rear ? 1 : rest * (1 - S.dash);        // dashing on two back arms: the rest stream behind
  // resting: fan outward along the floor with a lazy lateral S-curve and a curled tip
  const sm = Math.max(0, (t - 0.6) / 0.4), curl = sm * sm * 7.5 * a.curl * (0.85 + 0.15 * Math.sin(ph * 0.5 + a.ph));
  let r = OCT.ax + 1.5 + a.L * Math.pow(t, 0.92), lat = Math.sin(t * 3.4 + a.ph) * 2.6 * t + Math.sin(ph * 0.9 + a.ph + t * 3) * 0.9 * t;
  let y = OCT.floor + 1.2 + (OCT.ay - OCT.floor) * Math.exp(-t * 6.2) + curl;
  let wrapW = 0, wx = 0, wy = 0, wz = 0;
  if (S.work > 0.4 && S.jr) {                                                                  // working a jar: the arms that face it reach out, close on it and spiral up around it
    const phi = Math.atan2(S.jz, S.jx - OCT.ax), df = Math.abs(Math.atan2(Math.sin(a.th - phi), Math.cos(a.th - phi)));
    if (df < 1.3) {
      wrapW = Math.min(1, (1 - df / 1.3) * 1.9) * Math.min(1, (S.work - 0.4) / 0.4); const side = Math.sin(a.th - phi) >= 0 ? 1 : -1, R = S.jr + 1.0, th0 = Math.atan2(OCT.ax * 0 + (s * 4.5 - S.jz), (OCT.ax + c * 4.5) - S.jx);
      if (t < 0.45) { const q = t / 0.45, ex = S.jx + Math.cos(th0) * R, ez = S.jz + Math.sin(th0) * R; wx = OCT.ax + c * 4.5 + (ex - (OCT.ax + c * 4.5)) * q; wz = s * 4.5 + (ez - s * 4.5) * q; wy = OCT.floor + 2 + Math.sin(q * Math.PI) * 2; }
      else { const u = (t - 0.45) / 0.55, ang = th0 + side * u * 1.9 + Math.sin(ph * 2 + a.ph) * 0.12; wx = S.jx + Math.cos(ang) * R; wz = S.jz + Math.sin(ang) * R; wy = OCT.floor + 2.2 + u * 10 + Math.sin(ph * 3 + a.ph) * 0.4; }
    }
  }
  if (S.work) { const w = S.work; lat += Math.sin(ph * 2 + a.ph + t * 4) * 2.6 * w * t; y += (0.5 + 0.5 * Math.sin(ph * 1.4 + a.ph)) * 3.4 * w * t; r *= 1 - 0.38 * w * (0.4 + 0.6 * Math.abs(Math.sin(a.ph))); }   // working on something: arms pulled in, probing and wrapping
  if (S.greet && c > -0.2) { const g = S.greet; y += g * t * t * 14 * (0.7 + 0.3 * Math.sin(a.ph)); lat += Math.sin(ph * 2.2 + a.ph) * 2.2 * g * t; }                                       // the arms that face the glass lift and wave
  if (S.land > 0.02) { r *= 1 + 0.2 * S.land * t; y -= 1.5 * S.land * Math.min(1, t * 3); lat += Math.sin(ph * 3 + a.ph) * 1.4 * S.land * t; }                  // landing: the arms spread wide to catch him
  if (S.glass > 0.02) { const gk = S.glass; y = OCT.floor + 1.2 + (y - OCT.floor - 1.2) * (1 - 0.85 * gk); lat += Math.sin(ph * 1.6 + a.ph) * 0.9 * gk * t; r *= 1 + 0.05 * Math.sin(ph * 1.2 + a.ph) * gk; }   // pressed flat on the glass, the suckers shifting a little
  // walking is a gait, not a wave: each arm plants its tip on the floor (it sticks, and the body moves over it), then peels up, curls and swings forward to plant again; the arms are out of step
  // with each other, the front ones reach and pull, the rear ones mostly drag, and each octopus has its own stride
  let gx = 0;
  if (S.crawl > 0.02) {
    const dsh = S.dash > 0.02 && rear, u = (ph * (dsh ? 0.2 : 0.15) + GAIT[a.i] + (a.ph * 0.02)) % 1, STANCE = dsh ? 0.5 : 0.6, stride = (dsh ? 17 : c > -0.3 ? 9 : 5.5) * (S.stride ?? 1); let dx, lift = 0;
    if (u < STANCE) dx = stride * (0.5 - u / STANCE); else { const q = (u - STANCE) / (1 - STANCE), e = q * q * (3 - 2 * q); dx = -stride / 2 + stride * e; lift = Math.sin(Math.PI * q) * (dsh ? 9 : c > -0.3 ? 6 : 3.4); }
    const w = Math.pow(t, 1.3) * S.crawl; gx = dx * w; y += lift * w * (1 + 0.6 * t) + (lift > 0 ? Math.pow(t, 3) * lift * 0.5 : 0) * S.crawl;      // the tip curls up as the arm lifts
  }
  const rx = OCT.ax + c * r - s * lat + gx, rz = s * r + c * lat;
  // jetting: every arm gathers back behind the body and flutters
  const jd = [c * 0.18 - 0.9, s * 1.05], jl = Math.hypot(jd[0], jd[1]), fl = Math.sin(t * 5 - ph * (2 - 0.9 * (S.cruise ?? 0)) + a.ph) * 1.2 * (1 + 1.5 * (S.cruise ?? 0) - 0.6 * (S.glide ?? 0)) * t;
  const gl = S.glide ?? 0, cr = S.cruise ?? 0, jr = OCT.ax + 3 + a.L * (1.12 + 0.24 * gl) * t * (1 + 0.05 * cr * Math.sin(ph * 2 + t * 4)), jx = OCT.ax + (jd[0] / jl) * jr * 0.98, jz = (jd[1] / jl) * jr + fl * 0.6 + s * t * t * 5, jy = OCT.ay + 1 - t * 5.5 + Math.sin(a.th * 2 + 0.6) * t * (2.6 + t * 2.4) + fl + (S.sq ?? 0) * -t * 1.5;
  o[0] = jx + (rx - jx) * rest; o[1] = jy + (y - jy) * rest; o[2] = jz + (rz - jz) * rest;
  if (wrapW > 0) { o[0] += (wx - o[0]) * wrapW; o[1] += (wy - o[1]) * wrapW; o[2] += (wz - o[2]) * wrapW; }
  const mind = S.minds?.[a.i];
  if (mind && mind.k > 0.01) {                                                                 // this arm is exploring on its own: its tip goes where it is curious about, the rest of the arm follows
    const tip = (a.tip ||= octoPose(a, 1, { rest: 1, crawl: 0, sq: 0, ph: 0 }, [0, 0, 0])), dx = mind.x - tip[0], dy = mind.y - tip[1], dz = mind.z - tip[2], L = Math.hypot(dx, dy, dz) || 1, cap = Math.min(1, 24 / L), q = Math.max(0, (t - 0.2) / 0.8), w = mind.k * q * q * (3 - 2 * q);
    o[0] += dx * cap * w; o[1] += dy * cap * w + Math.sin(Math.PI * t) * 3.4 * mind.k * (1 - rest * 0.3) * (1 - (S.glass ?? 0)); o[2] += dz * cap * w;
  }
  if (t > 0.22 && o[1] > -5.2) { const hx = o[0] - 3, hr = Math.hypot(hx, o[2]); if (hr < 6.4) { const k = 6.4 / Math.max(hr, 0.01); o[0] = 3 + hx * k; o[2] *= k; } }          // an arm never passes through the body
  const G = S.grab;                                                                            // catching something: the nearest arm reaches it, its neighbours cup in beside it
  if (G && G.w > 0.01) {
    let T = null, wt = 0; if (a.i === G.arm) { T = G.p; wt = 1; } else if (a.i === G.n1 || a.i === G.n2) { T = [G.p[0] - 0.6, G.p[1] + 0.4, G.p[2] + (a.i === G.n1 ? 2.6 : -2.6)]; wt = 0.55; }
    if (T) { const tip = (a.tip ||= octoPose(a, 1, { rest: 1, crawl: 0, sq: 0, ph: 0 }, [0, 0, 0])), q = Math.max(0, (t - 0.12) / 0.88), w = G.w * wt * q * q * (3 - 2 * q); o[0] += (T[0] - tip[0]) * w; o[1] += (T[1] - tip[1]) * w; o[2] += (T[2] - tip[2]) * w; }
  }
  return o;
};
const octopus = {
  id: 'octopus', label: 'Octopus', move: 'jet', length: 64, vox: 0.06,
  make(seed = 1) {
    const rng = mulberry32(seed * 7907 + 3), pals = [[[226, 92, 78], [255, 190, 170]], [[170, 90, 200], [236, 190, 255]], [[60, 150, 200], [180, 236, 255]], [[230, 140, 60], [255, 220, 170]]];
    const [skinC, pale] = pals[Math.floor(rng() * pals.length)], off = [rng() * 90, rng() * 90, rng() * 90], arms = octoArms(seed);
    // stamp every arm into a lookup of voxels: which arm, how far along it, and the offset from its centre line (so it can be re-posed)
    const armV = new Map(), P = [0, 0, 0], REST = { rest: 1, crawl: 0, sq: 0, ph: 0 };
    arms.forEach((a, i) => { for (let k = 0; k <= 90; k++) {
      const t = k / 90, rad = OCT.rad0 + (OCT.rad1 - OCT.rad0) * t, R = Math.ceil(rad); octoPose(a, t, REST, P);
      for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) for (let dz = -R; dz <= R; dz++) {
        const x = Math.round(P[0]) + dx, y = Math.round(P[1]) + dy, z = Math.round(P[2]) + dz, d = Math.hypot(x - P[0], y - P[1], z - P[2]);
        if (d > rad) continue; const key = x + ',' + y + ',' + z, q = d / rad, old = armV.get(key);
        if (!old || q < old.q) armV.set(key, { arm: i, at: t, q, off: [x - P[0], y - P[1], z - P[2]], dy: y - P[1], rad });
      } } });
    const mantleX = (y) => -5 - (y - 7) * 0.35;
    const mantle = (x, y, z) => ((x - mantleX(y)) / 9.5) ** 2 + ((y - 7) / 11.5) ** 2 + (z / 8.5) ** 2 <= 1;
    const head = (x, y, z) => { const lo = Math.max(0, (-1.5 - y) / 5), w = Math.max(0.25, 1 - lo * lo * 0.75); return ((x - 3) / (9 * w)) ** 2 + ((y - 0.5) / 7) ** 2 + (z / (8.4 * w)) ** 2 <= 1; };   // the underside tapers to a neck, so nothing flat hangs out when the arms are away
    const eyeAt = (x, y, z) => Math.hypot(x - 6.5, y - 3, Math.abs(z) - 7) <= 2.7;
    return {
      bounds: { x: [-36, 20], y: [-14, 24], z: [-32, 32] }, center: [0, 0], mantleC: [-3, 6],
      rig: { arms, pose: octoPose, tipPhase: (x) => x },
      bend: null,
      sample(x, y, z) {
        if (eyeAt(x, y, z)) {                                                // a protruding eye: gold ring, black horizontal pupil, tiny glint
          const az = Math.abs(z), ex = x - 6.5, ey = y - 3;
          if (az >= 8.6 && Math.abs(ex - 0.8) <= 1.5 && Math.abs(ey) <= 0.6) return { c: [10, 10, 18], em: 1, tag: 'eye', pupil: 1 };
          if (az >= 8.4 && ex > 0.2 && ey > 0.9 && ey < 1.9 && ex < 1.6) return { c: [255, 255, 255], em: 2, tag: 'eye' };
          return { c: az >= 8.2 ? [236, 178, 70] : mix(skinC, pale, 0.2), tag: 'eye' };
        }
        const inM = mantle(x, y, z), inH = head(x, y, z);
        if (inM || inH) {
          const n = fbm(x * 0.2 + off[0], y * 0.2 + off[1], Math.abs(z) * 0.2 + off[2]), spot = fbm(x * 0.7 + off[1], y * 0.7, Math.abs(z) * 0.7 + off[0]);
          let c = mix(skinC, pale, clamp((-(y - 4) / 14) * 0.55 + 0.05)); if (n > 0.6) c = mix(c, [255, 236, 214], 0.3); if (n < 0.34) c = mix(c, [96, 34, 46], 0.35);
          if (spot > 0.66) c = mix(c, [255, 232, 214], 0.45);                  // pale papillae
          c = mix(c, [c[0] * 0.66, c[1] * 0.6, c[2] * 0.62], clamp((y - 1) / 13) * 0.6);   // a darker back, so it stands out against pale sand
          return { c, tag: inM && !inH ? 'mantle' : 'head' };
        }
        // the underside of the head: a solid funnel of web that runs from the head down to the mouth (so nothing hollow shows between the arms), a ring of lips, and a small tan beak at the centre
        const kArm = armV.get(x + ',' + y + ',' + z);
        { const dx = x - 3, rr = Math.hypot(dx, z), ang = Math.atan2(z, dx);
          if (y <= -6 && y >= -8 && rr <= 3.0 - (y === -8 ? 1.0 : 0)) {                                                 // the mouth: lips around a small beak
            if (rr <= 1.35 && y <= -7) return { c: rr <= 0.7 ? [92, 54, 40] : [150, 98, 70], tag: 'beak', beak: 1 };      // beak: dark tip, tan sides
            if (rr <= 1.9 && y === -6) return { c: [226, 120, 118], tag: 'web' };                                          // pink mouth rim
            return { c: mix([232, 134, 120], pale, 0.12 + 0.12 * Math.sin(ang * 7)), tag: 'web' };                       // lips with little folds
          }
          const rmax = 8.6 - (-4 - y) * 1.55; if (!kArm && y <= -3 && y >= -7 && rr <= rmax) { const n2 = fbm(x * 0.5 + off[0], y * 0.5, z * 0.5 + off[2]); return { c: mix(mix(skinC, [240, 150, 120], 0.3), [255, 220, 200], n2 > 0.62 ? 0.25 : 0), tag: 'web' }; }   // webbing between the arm bases
          if (!kArm && x >= 8 && x <= 13 && Math.hypot(y - (-2.4 - (x - 8) * 0.2), z + 4.2) <= 1.6 - (x - 8) * 0.06) return { c: x >= 12 ? mix(skinC, pale, 0.15) : mix(skinC, pale, 0.3), tag: 'head' }; }
        const k = armV.get(x + ',' + y + ',' + z);
        if (k) {
          const tt = k.at, under = k.dy < -k.rad * 0.35, sucker = under && tt > 0.1 && (Math.round(tt * 26) % 2 === 0);
          let c = under ? mix(pale, [255, 196, 206], 0.35) : mix([skinC[0] * 0.82, skinC[1] * 0.78, skinC[2] * 0.8], pale, tt * 0.2);
          if (tt < 0.3) c = mix(c, mix(mix(skinC, [240, 150, 120], 0.3), pale, 0.35), 1 - tt / 0.3);                // where the arms join the head they blend into the webbing, not a dark collar
          if (sucker) c = Math.round(tt * 24) % 4 === 0 ? [255, 248, 242] : mix(c, [255, 206, 212], 0.65); if (tt > 0.93) c = mix(c, pale, 0.4);
          return { c, tag: 'arm', arm: k.arm, at: tt, off: k.off };
        }
        return null;
      },
    };
  },
};

// rare visitors: recoloured cousins of the shop fish
const recolor = (base, id, label, fn) => ({ ...base, id, label, make(seed = 1) { const m = base.make(seed), inner = m.sample; return { ...m, sample: (x, y, z) => { const r = inner(x, y, z); return r ? { ...r, c: fn(r.c), em: r.em } : r; } }; } });
const moonbetta = recolor(mandarin, 'moonbetta', 'Ghost Dragonet', (c) => mix(c, [214, 228, 255], 0.62));
const sunangel = recolor(emperor, 'sunangel', 'Golden Angelfish', (c) => [Math.min(255, c[0] * 0.5 + 150), Math.min(255, c[1] * 0.6 + 100), Math.max(0, c[2] * 0.25)]);
const rosecory = recolor(goby, 'rosecory', 'Rose Goby', (c) => mix(c, [255, 150, 190], 0.6));

export const SPECIES = { goldfish: clownfish, blue: gramma, angelfish: emperor, neon: chromis, cory: goby, guppy: damsel, platy: cardinal, danio: anthias, betta: mandarin, seahorse, octopus, moonbetta, sunangel, rosecory };

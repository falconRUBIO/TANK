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
    const pals = [[hex(0xff7a2a), hex(0xffd23a), hex(0x2a8ad8)], [hex(0x3a8ae8), hex(0x8ae0ff), hex(0xff5a9a)], [hex(0xe0409a), hex(0xff9ad0), hex(0x6a3ad0)], [hex(0x34c08a), hex(0xb8ff8a), hex(0xff8a3a)]];
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
        if (dT >= 0 && dT <= 18 && Math.abs(z) <= (dT < 3 ? 1 : 0)) {          // big fan tail with a spotted edge
          const hh = 2.5 + dT * 0.85;
          if (Math.abs(y) <= hh) { const spot = ((Math.floor(dT / 3) + Math.floor(y / 3)) & 1) === 0; const rim = dT > 15 || Math.abs(y) > hh - 1.5; return { c: mix(tailC, rim ? [255, 240, 200] : bodyC, spot ? 0.15 : 0.5), wave: 0.7 }; }
        }
        const bt = (x) => clamp((x - X0) / L);
        if (z === 0 && x >= 15 && x <= 22 && y >= hy(bt(x)) - 1 && y <= hy(bt(x)) + 4 * (1 - Math.abs(x - 18.5) / 4)) return { c: mix(tailC, bodyC, 0.4), wave: 0.3 };
        if (z === 0 && x >= 14 && x <= 20 && y <= -hy(bt(x)) + 1 && y >= -hy(bt(x)) - 3) return { c: mix(tailC, bellyC, 0.5), wave: 0.3 };
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

export const SPECIES = { goldfish, blue: bluefish, angelfish, neon, cory, guppy, betta };

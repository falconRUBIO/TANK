// Tank decorations: simple, clean, minimal and cute. Hard objects are chunky voxel builds (same
// language as the fish); plants are pixel-art cut-out sprites. Every solid piece also reports a
// collider so fish swim around it instead of through it.
import * as THREE from 'three';
import { mulberry32, fbm, mix } from '../color.js';
import { voxShading } from './voxshade.js';

const rgb = (c, k = 1) => new THREE.Color().setRGB(Math.min(1.6, c[0] / 255 * k), Math.min(1.6, c[1] / 255 * k), Math.min(1.6, c[2] / 255 * k), THREE.SRGBColorSpace);
const hash = (i, j, k, s = 0) => { let h = (i * 374761393 + j * 668265263 + k * 2147483647 + s * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vmat = voxShading(new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0 }));
const pmat = voxShading(new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0, side: THREE.DoubleSide }), { sway: true, boost: 1.1 });

// ── tiny voxel modeller ──
class Vox {
  constructor(u) { this.u = u; this.m = new Map(); }
  set(i, j, k, c, k2 = 1, sw, ph) { this.m.set(i + ',' + j + ',' + k, { i, j, k, c, k2, sw, ph }); }
  has(i, j, k) { return this.m.has(i + ',' + j + ',' + k); }
  fill(i0, j0, k0, i1, j1, k1, fn) { for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) this.set(i, j, k, typeof fn === 'function' ? fn(i, j, k) : fn); }
  ellipsoid(ci, cj, ck, ri, rj, rk, fn, seed = 0, rough = 0.22) {
    for (let i = Math.floor(ci - ri - 1); i <= ci + ri + 1; i++) for (let j = Math.floor(cj - rj - 1); j <= cj + rj + 1; j++) for (let k = Math.floor(ck - rk - 1); k <= ck + rk + 1; k++) {
      const d = ((i - ci) / ri) ** 2 + ((j - cj) / rj) ** 2 + ((k - ck) / rk) ** 2;
      if (d <= 1 + (fbm(i * 0.35 + seed, j * 0.35, k * 0.35) - 0.5) * rough * 2) this.set(i, j, k, fn(i, j, k));
    }
  }
  // Same recipe as the fish: smooth normals from a 5x5x5 neighbourhood, baked AO, tiny per-cube colour jitter
  mesh(sway = null) {
    const g = (i, j, k) => (this.m.has(i + ',' + j + ',' + k) ? 1 : 0);
    const cells = [...this.m.values()].filter((c) => !(g(c.i + 1, c.j, c.k) && g(c.i - 1, c.j, c.k) && g(c.i, c.j + 1, c.k) && g(c.i, c.j - 1, c.k) && g(c.i, c.j, c.k + 1) && g(c.i, c.j, c.k - 1)));
    const n = cells.length, nrm = new Float32Array(n * 3), swa = new Float32Array(n * 2);
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(this.u, this.u, this.u), sway ? pmat : vmat, n), mt = new THREE.Matrix4(), col = new THREE.Color();
    cells.forEach((c, id) => {
      let gx = 0, gy = 0, gz = 0, cnt = 0;
      for (let dz = -2; dz <= 2; dz++) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (!(dx | dy | dz) || !g(c.i + dx, c.j + dy, c.k + dz)) continue;
        const w = 1 / (1 + dx * dx + dy * dy + dz * dz); gx -= dx * w; gy -= dy * w; gz -= dz * w; if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) <= 3) cnt++;
      }
      const m = Math.hypot(gx, gy, gz); if (m > 0.08) { nrm[id * 3] = gx / m; nrm[id * 3 + 1] = gy / m; nrm[id * 3 + 2] = gz / m; }
      const ao = Math.max(0, Math.min(0.3, (cnt / 24 - 0.42) * 1.5)), jit = 0.95 + hash(c.i, c.j, c.k, 11) * 0.09;
      mt.makeTranslation(c.i * this.u, c.j * this.u, c.k * this.u); im.setMatrixAt(id, mt);
      const k = c.k2 * (1 - ao) * jit; col.setRGB(Math.min(1.6, c.c[0] / 255 * k), Math.min(1.6, c.c[1] / 255 * k), Math.min(1.6, c.c[2] / 255 * k), THREE.SRGBColorSpace); im.setColorAt(id, col);
      if (sway) { swa[id * 2] = c.sw ?? 0; swa[id * 2 + 1] = c.ph ?? 0; }
    });
    im.geometry.setAttribute('aN', new THREE.InstancedBufferAttribute(nrm, 3));
    if (sway) im.geometry.setAttribute('aSw', new THREE.InstancedBufferAttribute(swa, 2));
    im.castShadow = im.receiveShadow = true; im.frustumCulled = false; return im;
  }
}
// top faces catch a little light, like the reference's sun-warmed tops
const topLit = (v, c) => { for (const q of v.m.values()) if (!v.has(q.i, q.j + 1, q.k)) q.c = mix(q.c, [255, 244, 200], 0.16); };

// ── voxel plants: the same chunky cubes, smooth shading and warm palette as the fish, swaying with the current ──
const PU = 0.07;                                     // plant voxel size
function plantVox(v, rng, base, kind, o = {}) {
  const [bx, bz] = base, I = Math.round(bx / PU), K = Math.round(bz / PU), ph = rng() * 6.28;
  const put = (i, j, k, c, H, k2 = 1) => v.set(i, j, k, c, k2, Math.min(1, j / H), ph);
  const lerpc = (a, b, t) => mix(a, b, Math.max(0, Math.min(1, t)));
  if (kind === 'grass') {                                           // tall ribbon blades, lit on the left, dark on the right
    const n = o.n ?? 6, hues = o.hues ?? [[[38, 96, 44], [136, 196, 62]], [[54, 116, 40], [176, 208, 70]]];
    for (let b = 0; b < n; b++) {
      const H = Math.round((o.h ?? 52) * (0.55 + rng() * 0.6)), lean = (rng() - 0.5) * 0.55 + (o.lean ?? 0), x0 = I + Math.round((b - n / 2) * 2.2 + (rng() - 0.5) * 2), z0 = K + Math.round((rng() - 0.5) * 4), hue = hues[b % hues.length];
      for (let j = 0; j <= H; j++) {
        const t = j / H, cx = x0 + Math.round(lean * j * (0.25 + t * 0.8) + Math.sin(t * 3 + b) * 1.2), w = t < 0.78 ? 2 : 1;
        for (let q = 0; q < w; q++) put(cx + q, j, z0, q === 0 ? lerpc(hue[0], hue[1], 0.2 + t * 0.9) : lerpc(mix(hue[0], [20, 54, 36], 0.35), hue[1], t * 0.55), H, q === 0 ? 1.12 : 0.92);
        if (j % 11 === 5 && w === 2) put(cx, j, z0, [214, 236, 120], H, 1.1);               // pale midrib flecks
      }
    }
  } else if (kind === 'fern') {                                     // arching frond with paired leaflets, lime to gold
    const H = o.h ?? 56, side = o.side ?? 1, lowc = o.low ?? [70, 124, 44], hic = o.high ?? [196, 214, 78];
    const stem = (j) => [I + Math.round(side * Math.pow(j / H, 1.6) * 14), j];
    for (let j = 0; j <= H; j++) { const [x] = stem(j); put(x, j, K, [86, 118, 40], H); put(x + 1, j, K, [58, 84, 32], H, 0.9); }
    for (let j = 4; j < H; j += 2) {
      const t = j / H, L = Math.round(Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.05)) * 9 + 2), [sx] = stem(j);
      for (const sd of [-1, 1]) for (let s2 = 1; s2 <= L; s2++) {
        const f = s2 / L, x = sx + sd * s2, y = j + Math.round(s2 * 0.5 - f * f * 1.8), z = K + (j & 2 ? 1 : 0);
        put(x, y, z, lerpc(lowc, hic, t * 0.55 + (1 - f) * 0.4), H, f > 0.6 ? 1.1 : 1);
      }
    }
  } else if (kind === 'red') {                                      // bushy plume
    const H = o.h ?? 54;
    for (let j = 0; j <= H; j++) put(I, j, K, [128, 30, 40], H);
    for (let j = 6; j < H; j += 2) {
      const t = j / H, L = Math.round(Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.08)) * 9 + 2);
      for (const sd of [-1, 1]) for (let s2 = 1; s2 <= L; s2++) { const f = s2 / L; put(I + sd * s2, j + Math.round(s2 * 0.45 - f * f * 1.4), K + ((j >> 1) & 1), lerpc([170, 34, 46], [244, 92, 76], t * 0.5 + f * 0.45), H, f > 0.7 ? 1.12 : 1); }
    }
  } else if (kind === 'sword') {                                    // broad leaves arching outward
    for (let l = 0; l < 6; l++) {
      const ang = (l - 2.5) * 0.42, H = Math.round(26 + rng() * 14 - Math.abs(l - 2.5) * 3);
      for (let j = 0; j <= H; j++) {
        const t = j / H, cx = I + Math.round(Math.sin(ang) * j * 0.9 + Math.pow(t, 2) * (l - 2.5) * 5), w = Math.max(1, Math.round(Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.05)) * 3.2));
        for (let q = -w + 1; q <= w - 1; q++) put(cx + q, j, K + (l & 1), lerpc([44, 108, 48], [140, 192, 66], t * 0.7 + (q < 0 ? 0.2 : 0)), H, q < 0 ? 1.1 : 0.94);
      }
    }
  } else if (kind === 'kelp') {
    const H = o.h ?? 120, x0 = I;
    for (let j = 0; j <= H; j++) { const cx = x0 + Math.round(Math.sin(j * 0.05 + ph) * 3 * (j / H)); put(cx, j, K, lerpc([22, 66, 62], [64, 128, 100], j / H), H); put(cx + 1, j, K, [28, 80, 70], H, 0.85); }
  }
}

// Voxel-accurate collision: every solid voxel of every decoration is stamped into one coarse occupancy grid.
const G = 0.2, N = 128, OX = 64, OY = 8, OZ = 64;
export class Solids {
  constructor() { this.a = new Uint8Array(N * N * N); }
  idx(ix, iy, iz) { ix += OX; iy += OY; iz += OZ; return ix < 0 || iy < 0 || iz < 0 || ix >= N || iy >= N || iz >= N ? -1 : (ix * N + iy) * N + iz; }
  stamp(x, y, z) { const k = this.idx(Math.round(x / G), Math.round(y / G), Math.round(z / G)); if (k >= 0) this.a[k] = 1; }
  addVox(v, px, py, pz, ry = 0) {
    const c = Math.cos(ry), s = Math.sin(ry);
    for (const q of v.m.values()) { const x = q.i * v.u, y = q.j * v.u, z = q.k * v.u; this.stamp(px + x * c + z * s, py + y, pz - x * s + z * c); }
  }
  // sum of unit-ish push vectors away from solid cells within r of p; returns the number of touching cells
  push(p, r, out) {
    const cx = Math.round(p.x / G), cy = Math.round(p.y / G), cz = Math.round(p.z / G), R = Math.ceil(r / G) + 1; let n = 0;
    for (let i = cx - R; i <= cx + R; i++) for (let j = cy - R; j <= cy + R; j++) for (let k = cz - R; k <= cz + R; k++) {
      const id = this.idx(i, j, k); if (id < 0 || !this.a[id]) continue;
      const dx = p.x - i * G, dy = p.y - j * G, dz = p.z - k * G, d = Math.hypot(dx, dy, dz);
      if (d >= r + G * 0.5) continue; const w = (r + G * 0.5 - d) / (d || 0.05); out.x += dx * w; out.y += dy * w; out.z += dz * w; n++;
    }
    return n;
  }
}

export function buildDecor(seed = 21) {
  const solids = new Solids();
  const rng = mulberry32(seed);
  const group = new THREE.Group();
  const spheres = [], boxes = [];
  const place = (v, x, y, z, ry = 0, solid = true) => { const m = v.mesh(); m.position.set(x, y, z); m.rotation.y = ry; group.add(m); if (solid) solids.addVox(v, x, y, z, ry); return m; };

  // ── rocks: rounded, mossy on top ──
  const rock = (x, z, rx, ry, rz, sd, sink = 0.3) => {
    const u = 0.12, v = new Vox(u), R = [rx / u, ry / u, rz / u];
    v.ellipsoid(0, 0, 0, R[0], R[1], R[2], (i, j) => {
      const n = fbm(i * 0.22 + sd, j * 0.22, sd), top = j > R[1] * 0.25;
      if (top && fbm(i * 0.3 + sd * 3, j * 0.3, 5) > 0.44) return mix([92, 130, 52], [140, 160, 66], fbm(i * 0.5, j * 0.5, sd));
      return mix([104, 106, 96], [152, 150, 134], n);
    }, sd, 0.2);
    topLit(v);
    place(v, x, ry * sink, z, sd);
    spheres.push({ x, y: ry * 0.6, z, r: Math.max(rx, rz) * 0.95 });
  };
  rock(-4.0, 1.5, 1.45, 0.85, 1.0, 1);                      // big foreground rock, left
  rock(1.2, -0.9, 0.8, 0.5, 0.7, 2); rock(0.5, -2.6, 1.2, 0.7, 0.9, 5); rock(4.5, -1.3, 0.8, 0.9, 0.8, 6);
  rock(-1.5, 2.8, 0.55, 0.3, 0.45, 8, 0.1); rock(1.9, 2.9, 0.7, 0.34, 0.5, 9, 0.1); rock(-4.7, -0.3, 0.6, 0.5, 0.6, 7);

  // ── driftwood: one thick arch with a root branch, like the reference ──
  {
    const u = 0.1, v = new Vox(u);
    const path = new THREE.CatmullRomCurve3([[-5.4, 0.15, 1.5], [-4.9, 1.0, 1.6], [-4.3, 1.8, 1.55], [-3.7, 1.5, 1.6], [-3.1, 0.8, 1.7], [-2.4, 0.35, 1.8], [-1.6, 0.25, 1.9]].map((a) => new THREE.Vector3(...a)));
    const branch = new THREE.CatmullRomCurve3([[-4.3, 1.8, 1.55], [-3.9, 2.6, 1.5], [-3.6, 3.3, 1.45]].map((a) => new THREE.Vector3(...a)));
    const tube = (curve, r0, r1) => { const N = 70; for (let n = 0; n <= N; n++) { const t = n / N, p = curve.getPoint(t), r = (r0 + (r1 - r0) * t) / u; const ci = Math.round(p.x / u), cj = Math.round(p.y / u), ck = Math.round(p.z / u);
      for (let i = ci - Math.ceil(r); i <= ci + Math.ceil(r); i++) for (let j = cj - Math.ceil(r); j <= cj + Math.ceil(r); j++) for (let k = ck - Math.ceil(r); k <= ck + Math.ceil(r); k++) if ((i * u - p.x) ** 2 + (j * u - p.y) ** 2 + (k * u - p.z) ** 2 <= (r * u) ** 2 && !v.has(i, j, k)) { const t2 = fbm(i * 0.18, j * 0.5, k * 0.18); v.set(i, j, k, mix([52, 33, 20], [102, 68, 40], t2)); } } };
    tube(path, 0.5, 0.26); tube(branch, 0.2, 0.1);
    topLit(v);
    const mesh = v.mesh(); group.add(mesh); solids.addVox(v, 0, 0, 0, 0);
    for (let n = 0; n <= 16; n++) { const p = path.getPoint(n / 16); spheres.push({ x: p.x, y: p.y, z: p.z, r: 0.5 - 0.22 * (n / 16) }); }
    for (let n = 0; n <= 5; n++) { const p = branch.getPoint(n / 5); spheres.push({ x: p.x, y: p.y, z: p.z, r: 0.2 }); }
  }

  // ── stone lantern (ishidoro): base, shaft, lamp box with a glowing window, roof, cap ──
  const glow = new THREE.MeshStandardMaterial({ color: rgb([255, 214, 130]), emissive: rgb([255, 150, 50]), emissiveIntensity: 1.2, roughness: 0.6 });
  const lampPos = new THREE.Vector3();
  {
    const u = 0.115, v = new Vox(u), LX = 3.1, LZ = 0.55;
    const stone = (i, j, k) => mix([128, 130, 118], [160, 156, 138], hash(i, j, k, 3) * 0.7);
    v.fill(-4, 0, -4, 4, 1, 4, stone); v.fill(-1, 2, -1, 1, 8, 1, stone); v.fill(-3, 9, -3, 3, 10, 3, stone);
    v.fill(-2, 11, -2, 2, 15, 2, stone);
    v.fill(-5, 16, -5, 5, 16, 5, stone); v.fill(-4, 17, -4, 4, 17, 4, stone); v.fill(-3, 18, -3, 3, 18, 3, stone); v.fill(-1, 19, -1, 1, 20, 1, stone); v.set(0, 21, 0, stone(0, 21, 0));
    for (const q of v.m.values()) if (q.j >= 16 && !v.has(q.i, q.j + 1, q.k) && hash(q.i, q.j, q.k, 9) > 0.35) q.c = mix([96, 134, 54], [136, 160, 66], hash(q.i, q.k, 4)); // mossy roof
    for (const q of v.m.values()) if (q.j <= 1 && hash(q.i, q.j, q.k, 5) > 0.7) q.c = mix(q.c, [96, 134, 54], 0.6);
    topLit(v);
    const m = place(v, LX, 0.1, LZ, -0.25);
    for (const sd of [1, -1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(3 * u, 3 * u, 0.04), glow); w.position.set(0, 13 * u, sd * (2 * u + 0.03)); m.add(w); }   // window to the front and the back
    lampPos.set(LX, 0.1 + 13 * u, LZ + 0.4);
    boxes.push({ min: [LX - 0.55, 0, LZ - 0.55], max: [LX + 0.55, 2.7, LZ + 0.55] });
  }

  // ── torii gate (red, with moss at the feet) ──
  {
    const u = 0.14, v = new Vox(u), TX = 1.3, TZ = -3.3;
    const red = (i, j, k) => mix([192, 48, 38], [218, 70, 54], hash(i, j, k, 2) * 0.8);
    v.fill(-9, 0, -2, -6, 0, 1, [112, 112, 104]); v.fill(6, 0, -2, 9, 0, 1, [112, 112, 104]);
    v.fill(-8, 1, -1, -7, 15, 0, red); v.fill(7, 1, -1, 8, 15, 0, red);
    v.fill(-7, 12, -1, 7, 13, 0, red); v.fill(-10, 16, -1, 10, 16, 0, red);
    v.fill(-11, 17, -1, 11, 18, 1, red); v.fill(-12, 19, -1, -11, 19, 1, red); v.fill(11, 19, -1, 12, 19, 1, red);
    v.fill(-11, 19, -1, 11, 19, 1, [40, 36, 40]);
    for (const q of v.m.values()) if (q.j <= 3 && hash(q.i, q.j, q.k, 7) > 0.5) q.c = mix(q.c, [96, 134, 54], 0.55);
    topLit(v); place(v, TX, 0.05, TZ, 0.18);
    boxes.push({ min: [TX - 1.4, 0, TZ - 0.4], max: [TX - 0.95, 2.6, TZ + 0.4] }, { min: [TX + 0.95, 0, TZ - 0.4], max: [TX + 1.4, 2.6, TZ + 0.4] }, { min: [TX - 1.8, 2.3, TZ - 0.4], max: [TX + 1.8, 2.8, TZ + 0.4] });
  }

  // ── treasure chest, lid cracked open, gold inside ──
  {
    const u = 0.1, v = new Vox(u), CX = -1.5, CZ = 2.4;
    const wood = (i, j) => mix([116, 78, 42], [146, 100, 54], (j & 1) * 0.5 + hash(i, j, 1) * 0.3);
    v.fill(-5, 0, -3, 5, 4, 3, wood); v.fill(-5, 0, -3, -4, 4, 3, [60, 62, 70]); v.fill(4, 0, -3, 5, 4, 3, [60, 62, 70]);
    v.fill(-4, 4, -2, 4, 4, 2, [255, 206, 72]);
    for (let n = 0; n < 14; n++) v.set(-3 + ((rng() * 7) | 0), 5, -1 + ((rng() * 3) | 0), [255, 214, 90], 1.3);
    v.set(1, 5, 0, [230, 70, 90], 1.2); v.set(-2, 5, 1, [90, 200, 240], 1.2);
    const chest = place(v, CX, 0.12, CZ, 0.5);
    const lid = new Vox(u); lid.fill(-5, 0, 0, 5, 1, 6, wood); lid.fill(-4, 2, 0, 4, 2, 6, wood); lid.fill(-5, 0, 0, -4, 2, 6, [60, 62, 70]); lid.fill(4, 0, 0, 5, 2, 6, [60, 62, 70]);
    const lm = lid.mesh(); lm.position.set(0, 5 * u, -3 * u); lm.rotation.x = -0.9; chest.add(lm);
    spheres.push({ x: CX, y: 0.4, z: CZ, r: 0.65 });
  }

  // ── starfish ──
  {
    const u = 0.075, v = new Vox(u);
    for (let a = 0; a < 5; a++) { const an = a * 1.2566; for (let s = 0; s <= 5; s++) { const i = Math.round(Math.cos(an) * s), k = Math.round(Math.sin(an) * s); v.set(i, 0, k, mix([240, 122, 52], [252, 170, 90], s / 5)); if (s < 3) v.set(i, 1, k, [244, 130, 60]); } }
    place(v, 0.6, 0.06, 2.55, 0.3, false);
  }
  // ── air stones where the bubbles start ──
  for (const [x, z] of [[-3.6, 0.5], [3.3, -0.8]]) { const v = new Vox(0.06); v.fill(-2, 0, -2, 2, 1, 2, [150, 156, 150]); v.fill(-1, 2, -1, 1, 2, 1, [176, 182, 176]); place(v, x, 0.04, z, 0, false); }

  // ── plants: dense layered cut-outs, placed like the reference (ferns hugging the left, tall grass through the middle, red plume by the lantern) ──
  const L = (x0, x1, z0, z1, n) => Array.from({ length: n }, () => ({ x: x0 + rng() * (x1 - x0), z: z0 + rng() * (z1 - z0) }));
  // composition: ferns frame the left and right edges, tall grass in a back row, mid clumps around the lantern and ruin base, low plants in front
  {
    const pv = new Vox(PU);
    const at = (...pts) => pts;
    for (const p of at([-4.7, 1.1], [-4.2, 0.5], [4.4, 1.7], [4.9, 0.8])) plantVox(pv, rng, p, 'fern', { h: 54 + ((rng() * 12) | 0), side: p[0] < 0 ? 1 : -1 });
    for (const p of at([-3.9, 2.1], [3.9, 2.3], [-4.9, 0.2])) plantVox(pv, rng, p, 'fern', { h: 44, side: p[0] < 0 ? 1 : -1, low: [52, 108, 56], high: [150, 204, 96] });
    for (const p of at([-4.6, -2.7], [1.5, -2.2], [3.3, -2.6], [4.6, -1.6], [0.9, -1.2])) plantVox(pv, rng, p, 'grass', { h: 70, n: 7 });
    for (const p of at([-4.2, 0.0], [0.9, 0.6], [1.7, 0.1], [4.5, 0.3], [3.8, -0.9])) plantVox(pv, rng, p, 'grass', { h: 44, n: 5 });
    for (const p of at([-4.0, 2.9], [0.6, 2.9], [1.8, 2.6], [3.4, 2.9], [-4.6, 2.3])) plantVox(pv, rng, p, 'grass', { h: 24, n: 5, hues: [[[52, 112, 44], [150, 204, 70]], [[70, 128, 44], [190, 214, 80]]] });
    for (const p of at([-3.2, 2.4], [2.4, 1.3], [0.3, 2.2])) plantVox(pv, rng, p, 'sword');
    for (const p of at([2.0, 0.2], [2.6, -0.4], [1.6, -0.8])) plantVox(pv, rng, p, 'red', { h: 32 + ((rng() * 10) | 0) });
    const pm = pv.mesh(true); group.add(pm);
    const kv = new Vox(PU);
    for (let n = 0; n < 6; n++) plantVox(kv, rng, [-5 + n * 2 + rng(), -5 - rng() * 3], 'kelp', { h: 60 + ((rng() * 40) | 0) });
    group.add(kv.mesh(true));
  }

  // ── the big ruin, built from chunky voxels so it matches the rest: crenellated top, round arch, mossy courses ──
  const WX = -1.5, WZ = -1.4;
  {
    const u = 0.115, v = new Vox(u);
    const topOf = (i) => (i < -17 ? 58 : i < 11 ? 46 : -1) + ((Math.floor(i / 5) & 1) && i >= -17 ? -4 : 0);       // crenellations
    const inArch = (i, j) => { const dx = (i + 4) / 11; return j <= 18 ? Math.abs(i + 4) <= 11 : dx * dx + ((j - 18) / 12) ** 2 < 1; };
    const brick = (i, j, k) => {
      const course = Math.floor(j / 4), off = (course & 1) * 3, bi = Math.floor((i + off) / 6);
      const mortar = j % 4 === 0 || (i + off) % 6 === 0;
      let c = mix([150, 140, 112], [204, 190, 150], hash(bi, course, 1) * 0.85);
      c = mix(c, [96, 92, 70], fbm(i * 0.2, j * 0.2, k * 0.2) * 0.5);
      if (mortar) c = mix(c, [70, 62, 44], 0.62);
      if (hash(i, j, k, 4) > 0.9) c = mix(c, [60, 58, 44], 0.35);
      return c;
    };
    const solid = (i, j, k) => {
      if (j < 0) return false;
      if (i >= -26 && i <= 10) { if (j > topOf(i) + Math.round((fbm(i * 0.4, 3, 9) - 0.5) * 6)) return false; if (inArch(i, j) && Math.abs(k) < 8) return false; if (Math.abs(k) <= 6) return true; }
      if (i >= 13 && i <= 23 && Math.abs(k) <= 5) return j <= 44 - Math.floor((i - 13) / 3) * 3 + Math.round((fbm(i * 0.5, 1, 4) - 0.5) * 10);   // second tower
      if (i >= 29 && i <= 37 && Math.abs(k) <= 4) return j <= 14 + Math.round((fbm(i * 0.6, 2, 4) - 0.5) * 8);                                            // broken stub
      return false;
    };
    for (let i = -24; i <= 38; i++) for (let j = 0; j <= 60; j++) for (let k = -6; k <= 6; k++) if (solid(i, j, k)) v.set(i, j, k, brick(i, j, k));
    // moss: grows on tops and in patches, never uniform
    for (const q of v.m.values()) {
      const top = !v.has(q.i, q.j + 1, q.k), m = fbm(q.i * 0.16 + 7, q.j * 0.16, q.k * 0.16);
      if ((top && m > 0.55) || m > 0.72 || (q.j < 4 && m > 0.58)) q.c = mix([84, 128, 40], [150, 176, 64], hash(q.i, q.j, q.k, 8));
      else if (top) q.c = mix(q.c, [255, 244, 200], 0.14);
    }
    const m = v.mesh(); m.position.set(WX, 0.02, WZ); group.add(m); solids.addVox(v, WX, 0.02, WZ, 0);
    const X = (i) => WX + i * u;
    const Y = (j) => j * u + 0.02;
    boxes.push({ min: [X(-26), 0, WZ - 1.0], max: [X(-17), Y(56), WZ + 1.0] }, { min: [X(-17), 0, WZ - 1.0], max: [X(-15), Y(44), WZ + 1.0] },
      { min: [X(7), 0, WZ - 1.0], max: [X(10), Y(44), WZ + 1.0] }, { min: [X(-15), Y(30), WZ - 1.0], max: [X(7), Y(44), WZ + 1.0] },
      { min: [X(13), 0, WZ - 0.9], max: [X(23), Y(40), WZ + 0.9] });
  }
  return { group, spheres, boxes, solids, glow, lampPos, archX: WX - 4 * 0.115 };
}

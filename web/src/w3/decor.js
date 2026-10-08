// Tank decorations: simple, clean, minimal and cute. Hard objects are chunky voxel builds (same
// language as the fish); plants are pixel-art cut-out sprites. Every solid piece also reports a
// collider so fish swim around it instead of through it.
import * as THREE from 'three';
import { mulberry32, fbm, mix } from '../color.js';
import { voxShading } from './voxshade.js';

const rgb = (c, k = 1) => new THREE.Color().setRGB(Math.min(1.6, c[0] / 255 * k), Math.min(1.6, c[1] / 255 * k), Math.min(1.6, c[2] / 255 * k), THREE.SRGBColorSpace);
export const hash = (i, j, k, s = 0) => { let h = (i * 374761393 + j * 668265263 + k * 2147483647 + s * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vmat = voxShading(new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0 }));
const pmat = voxShading(new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0, side: THREE.DoubleSide }), { sway: true, boost: 1.1 });

// ── tiny voxel modeller ──
export class Vox {
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
export const topLit = (v, c) => { for (const q of v.m.values()) if (!v.has(q.i, q.j + 1, q.k)) q.c = mix(q.c, [255, 244, 200], 0.16); };

// ── voxel plants: the same chunky cubes, smooth shading and warm palette as the fish, swaying with the current ──
export const PU = 0.07;                                     // plant voxel size
export function plantVox(v, rng, base, kind, o = {}) {
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
    const H = o.h ?? 120, x0 = I, lo = o.lo ?? [22, 66, 62], hi = o.hi ?? [64, 128, 100];
    for (let j = 0; j <= H; j++) { const cx = x0 + Math.round(Math.sin(j * 0.05 + ph) * 3 * (j / H)); put(cx, j, K, lerpc(lo, hi, j / H), H, 1.1); put(cx + 1, j, K, mix(lo, [20, 60, 50], 0.4), H, 0.85); if (o.leaf && j % 9 === 4) { put(cx - 1, j, K, hi, H, 1.15); put(cx - 2, j + 1, K, hi, H, 1.2); put(cx + 2, j + 1, K, hi, H, 1.1); } }
  }
}

// Voxel-accurate collision: every solid voxel of every decoration is stamped into one coarse occupancy grid.
const G = 0.2, N = 128, OX = 64, OY = 8, OZ = 64;
export class Solids {
  constructor() { this.a = new Uint8Array(N * N * N); }
  idx(ix, iy, iz) { ix += OX; iy += OY; iz += OZ; return ix < 0 || iy < 0 || iz < 0 || ix >= N || iy >= N || iz >= N ? -1 : (ix * N + iy) * N + iz; }
  stamp(x, y, z, d = 1) { const k = this.idx(Math.round(x / G), Math.round(y / G), Math.round(z / G)); if (k >= 0) this.a[k] = Math.max(0, Math.min(255, this.a[k] + d)); }
  cells(v, px, py, pz, ry, fn) { const c = Math.cos(ry), s = Math.sin(ry); for (const q of v.m.values()) { const x = q.i * v.u, y = q.j * v.u, z = q.k * v.u; fn(px + x * c + z * s, py + y, pz - x * s + z * c); } }
  addVox(v, px, py, pz, ry = 0, d = 1) { this.cells(v, px, py, pz, ry, (x, y, z) => this.stamp(x, y, z, d)); }
  overlaps(v, px, py, pz, ry = 0) { let n = 0; this.cells(v, px, py, pz, ry, (x, y, z) => { const k = this.idx(Math.round(x / G), Math.round(y / G), Math.round(z / G)); if (k >= 0 && this.a[k]) n++; }); return n; }
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

  // hazy kelp far behind the tank
  { const kv = new Vox(PU), rk = mulberry32(3); for (let n = 0; n < 6; n++) plantVox(kv, rk, [-5 + n * 2 + rk(), -5 - rk() * 3], 'kelp', { h: 60 + ((rk() * 40) | 0) }); group.add(kv.mesh(true)); }
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
  return { group, solids, archX: WX - 4 * 0.115 };
}

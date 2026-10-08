// Purchasable decorations. Every item is a small voxel model built with the same recipe as the fish
// (chunky cubes, smooth normals, baked AO, warm shade). Builders return a group centred on its own origin
// on the sand, plus the voxel lists that become solid collision for the fish.
import * as THREE from 'three';
import { mulberry32, fbm, mix } from '../color.js';
import { Vox, plantVox, topLit, hash, PU } from './decor.js';

const GLOW = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(1, 0.84, 0.5, THREE.SRGBColorSpace), emissive: new THREE.Color().setRGB(1, 0.6, 0.2, THREE.SRGBColorSpace), emissiveIntensity: 1.2, roughness: 0.6 });
export const lanternGlow = GLOW;

function rock(rx, ry, rz, sd) {
  const u = 0.1, v = new Vox(u), R = [rx / u, ry / u, rz / u];
  v.ellipsoid(0, 0, 0, R[0], R[1], R[2], (i, j) => {
    const n = fbm(i * 0.2 + sd, j * 0.2, sd), top = j > R[1] * 0.2;
    if (top && fbm(i * 0.3 + sd * 3, j * 0.3, 5) > 0.42) return mix([96, 134, 54], [150, 170, 70], fbm(i * 0.5, j * 0.5, sd));
    return mix([112, 112, 100], [168, 160, 138], n);
  }, sd, 0.2);
  topLit(v); return v;
}

const B = {
  grass: (g, seed) => { const v = new Vox(PU), r = mulberry32(seed); plantVox(v, r, [0, 0], 'grass', { h: 44 + ((r() * 18) | 0), n: 6 }); g.add(v.mesh(true)); return []; },
  fern: (g, seed) => { const v = new Vox(PU), r = mulberry32(seed); plantVox(v, r, [0, 0], 'fern', { h: 50 + ((r() * 12) | 0), side: seed & 1 ? 1 : -1 }); g.add(v.mesh(true)); return []; },
  sword: (g, seed) => { const v = new Vox(PU), r = mulberry32(seed); plantVox(v, r, [0, 0], 'sword'); g.add(v.mesh(true)); return []; },
  red: (g, seed) => { const v = new Vox(PU), r = mulberry32(seed); plantVox(v, r, [0, 0], 'red', { h: 34 + ((r() * 10) | 0) }); g.add(v.mesh(true)); return []; },
  rock: (g, seed) => { const v = rock(0.55, 0.36, 0.5, seed % 9 + 1); const m = v.mesh(); m.position.y = 0.1; g.add(m); return [{ v, x: 0, y: 0.1, z: 0, ry: 0 }]; },
  boulder: (g, seed) => { const v = rock(1.2, 0.78, 0.9, seed % 9 + 1); const m = v.mesh(); m.position.y = 0.2; g.add(m); return [{ v, x: 0, y: 0.2, z: 0, ry: 0 }]; },
  starfish: (g) => {
    const v = new Vox(0.075);
    for (let a = 0; a < 5; a++) { const an = a * 1.2566; for (let s = 0; s <= 5; s++) { const i = Math.round(Math.cos(an) * s), k = Math.round(Math.sin(an) * s); v.set(i, 0, k, mix([240, 122, 52], [252, 170, 90], s / 5)); if (s < 3) v.set(i, 1, k, [244, 130, 60]); if (s === 4) v.set(i, 1, k, [255, 214, 150], 1.2); } }
    const m = v.mesh(); m.position.y = 0.06; g.add(m); return [];
  },
  wood: (g) => {
    const u = 0.1, v = new Vox(u);
    const path = new THREE.CatmullRomCurve3([[-2.8, 0.15, 0], [-2.3, 1.0, 0.1], [-1.6, 1.9, 0], [-0.9, 1.6, 0.1], [-0.2, 0.9, 0], [0.5, 0.4, 0.1], [1.4, 0.25, 0]].map((a) => new THREE.Vector3(...a)));
    const branch = new THREE.CatmullRomCurve3([[-1.6, 1.9, 0], [-1.2, 2.6, 0], [-0.9, 3.3, 0.05]].map((a) => new THREE.Vector3(...a)));
    const tube = (curve, r0, r1) => { const N = 70; for (let n = 0; n <= N; n++) { const t = n / N, p = curve.getPoint(t), r = (r0 + (r1 - r0) * t) / u, ci = Math.round(p.x / u), cj = Math.round(p.y / u), ck = Math.round(p.z / u);
      for (let i = ci - Math.ceil(r); i <= ci + Math.ceil(r); i++) for (let j = cj - Math.ceil(r); j <= cj + Math.ceil(r); j++) for (let k = ck - Math.ceil(r); k <= ck + Math.ceil(r); k++) if ((i * u - p.x) ** 2 + (j * u - p.y) ** 2 + (k * u - p.z) ** 2 <= (r * u) ** 2 && !v.has(i, j, k)) v.set(i, j, k, mix([52, 33, 20], [112, 76, 44], fbm(i * 0.18, j * 0.5, k * 0.18))); } };
    tube(path, 0.46, 0.24); tube(branch, 0.19, 0.09); topLit(v); g.add(v.mesh()); return [{ v, x: 0, y: 0, z: 0, ry: 0 }];
  },
  pillar: (g, seed) => {
    const u = 0.1, v = new Vox(u), H = 30 + (seed % 8);
    const stone = (i, j, k) => { const course = Math.floor(j / 4); let c = mix([160, 150, 120], [204, 190, 150], hash(Math.floor((i + 8) / 4), course, 1)); if (j % 4 === 0) c = mix(c, [70, 62, 44], 0.55); return c; };
    v.fill(-5, 0, -5, 5, 2, 5, stone);
    for (let j = 3; j <= H; j++) for (let i = -3; i <= 3; i++) for (let k = -3; k <= 3; k++) { if (Math.abs(i) + Math.abs(k) > 5) continue; if (j > H - 4 && hash(i, j, k, 6) > 0.45) continue; if ((i === -3 || i === 3) && (j & 3) === 0 && false) continue; v.set(i, j, k, stone(i, j, k)); }
    for (const q of v.m.values()) if (!v.has(q.i, q.j + 1, q.k) && hash(q.i, q.j, q.k, 8) > 0.35) q.c = mix([96, 134, 54], [150, 176, 64], hash(q.i, q.k, 4));
    topLit(v); g.add(v.mesh()); return [{ v, x: 0, y: 0, z: 0, ry: 0 }];
  },
  lantern: (g) => {
    const u = 0.115, v = new Vox(u), stone = (i, j, k) => mix([140, 140, 124], [176, 170, 146], hash(i, j, k, 3) * 0.7);
    v.fill(-4, 0, -4, 4, 1, 4, stone); v.fill(-1, 2, -1, 1, 8, 1, stone); v.fill(-3, 9, -3, 3, 10, 3, stone); v.fill(-2, 11, -2, 2, 15, 2, stone);
    v.fill(-5, 16, -5, 5, 16, 5, stone); v.fill(-4, 17, -4, 4, 17, 4, stone); v.fill(-3, 18, -3, 3, 18, 3, stone); v.fill(-1, 19, -1, 1, 20, 1, stone); v.set(0, 21, 0, stone(0, 21, 0));
    for (const q of v.m.values()) if (q.j >= 16 && !v.has(q.i, q.j + 1, q.k) && hash(q.i, q.j, q.k, 9) > 0.35) q.c = mix([96, 134, 54], [136, 160, 66], hash(q.i, q.k, 4));
    topLit(v); const m = v.mesh(); m.position.y = 0.1; g.add(m);
    for (const sd of [1, -1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(3 * u, 3 * u, 0.04), GLOW); w.position.set(0, 0.1 + 13 * u, sd * (2 * u + 0.03)); g.add(w); }
    g.userData.lamp = new THREE.Vector3(0, 0.1 + 13 * u, 0.5); return [{ v, x: 0, y: 0.1, z: 0, ry: 0 }];
  },
  chest: (g) => {
    const u = 0.1, v = new Vox(u), r = mulberry32(7), wood = (i, j) => mix([116, 78, 42], [146, 100, 54], (j & 1) * 0.5 + hash(i, j, 1) * 0.3);
    v.fill(-5, 0, -3, 5, 4, 3, wood); v.fill(-5, 0, -3, -4, 4, 3, [70, 72, 80]); v.fill(4, 0, -3, 5, 4, 3, [70, 72, 80]); v.fill(-4, 4, -2, 4, 4, 2, [255, 206, 72]);
    for (let n = 0; n < 14; n++) v.set(-3 + ((r() * 7) | 0), 5, -1 + ((r() * 3) | 0), [255, 214, 90], 1.3);
    v.set(1, 5, 0, [230, 70, 90], 1.2); v.set(-2, 5, 1, [90, 200, 240], 1.2);
    const m = v.mesh(); m.position.y = 0.12; g.add(m);
    const lid = new Vox(u); lid.fill(-5, 0, 0, 5, 1, 6, wood); lid.fill(-4, 2, 0, 4, 2, 6, wood); lid.fill(-5, 0, 0, -4, 2, 6, [70, 72, 80]); lid.fill(4, 0, 0, 5, 2, 6, [70, 72, 80]);
    const lm = lid.mesh(); lm.position.set(0, 0.12 + 5 * u, -3 * u); lm.rotation.x = -0.9; g.add(lm); return [{ v, x: 0, y: 0.12, z: 0, ry: 0 }];
  },
  torii: (g) => {
    const u = 0.14, v = new Vox(u), red = (i, j, k) => mix([192, 48, 38], [218, 70, 54], hash(i, j, k, 2) * 0.8);
    v.fill(-9, 0, -2, -6, 0, 1, [120, 120, 108]); v.fill(6, 0, -2, 9, 0, 1, [120, 120, 108]); v.fill(-8, 1, -1, -7, 15, 0, red); v.fill(7, 1, -1, 8, 15, 0, red);
    v.fill(-7, 12, -1, 7, 13, 0, red); v.fill(-10, 16, -1, 10, 16, 0, red); v.fill(-11, 17, -1, 11, 18, 1, red); v.fill(-12, 19, -1, -11, 19, 1, red); v.fill(11, 19, -1, 12, 19, 1, red); v.fill(-11, 19, -1, 11, 19, 1, [44, 40, 44]);
    for (const q of v.m.values()) if (q.j <= 3 && hash(q.i, q.j, q.k, 7) > 0.5) q.c = mix(q.c, [96, 134, 54], 0.55);
    topLit(v); const m = v.mesh(); m.position.y = 0.05; g.add(m); return [{ v, x: 0, y: 0.05, z: 0, ry: 0 }];
  },
};

// build one item: returns { group, parts, lamp }
export function buildItem(type, seed = 1) {
  const group = new THREE.Group(), parts = B[type](group, seed);
  return { group, parts, lamp: group.userData.lamp ?? null, type };
}
const world = (it, x, z, ry, p) => { const c = Math.cos(ry), s = Math.sin(ry); return [x + p.x * c + p.z * s, p.y, z - p.x * s + p.z * c, ry + p.ry]; };
export function stampItem(it, solids, x, z, ry, d = 1) { for (const p of it.parts) { const [wx, wy, wz, r] = world(it, x, z, ry, p); solids.addVox(p.v, wx, wy, wz, r, d); } }
export function itemOverlaps(it, solids, x, z, ry) { let n = 0; for (const p of it.parts) { const [wx, wy, wz, r] = world(it, x, z, ry, p); n += solids.overlaps(p.v, wx, wy, wz, r); } return n; }
export function placeGroup(it, x, z, ry) { it.group.position.set(x, 0, z); it.group.rotation.y = ry; }
export function disposeItem(it) { it.group.traverse((o) => { if (o.isInstancedMesh) { o.geometry.dispose(); o.dispose?.(); } }); }

// Tank decorations: simple, clean, minimal and cute. Hard objects are chunky voxel builds (same
// language as the fish); plants are pixel-art cut-out sprites. Every solid piece also reports a
// collider so fish swim around it instead of through it.
import * as THREE from 'three';
import { mulberry32, fbm, mix } from '../color.js';
import { swayTime } from './env.js';

const rgb = (c, k = 1) => new THREE.Color().setRGB(Math.min(1.6, c[0] / 255 * k), Math.min(1.6, c[1] / 255 * k), Math.min(1.6, c[2] / 255 * k), THREE.SRGBColorSpace);
const hash = (i, j, k, s = 0) => { let h = (i * 374761393 + j * 668265263 + k * 2147483647 + s * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vmat = new THREE.MeshStandardMaterial({ roughness: 0.93, metalness: 0 });

// ── tiny voxel modeller ──
class Vox {
  constructor(u) { this.u = u; this.m = new Map(); }
  set(i, j, k, c, k2 = 1) { this.m.set(i + ',' + j + ',' + k, { i, j, k, c, k2 }); }
  has(i, j, k) { return this.m.has(i + ',' + j + ',' + k); }
  fill(i0, j0, k0, i1, j1, k1, fn) { for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) this.set(i, j, k, typeof fn === 'function' ? fn(i, j, k) : fn); }
  ellipsoid(ci, cj, ck, ri, rj, rk, fn, seed = 0, rough = 0.22) {
    for (let i = Math.floor(ci - ri - 1); i <= ci + ri + 1; i++) for (let j = Math.floor(cj - rj - 1); j <= cj + rj + 1; j++) for (let k = Math.floor(ck - rk - 1); k <= ck + rk + 1; k++) {
      const d = ((i - ci) / ri) ** 2 + ((j - cj) / rj) ** 2 + ((k - ck) / rk) ** 2;
      if (d <= 1 + (fbm(i * 0.35 + seed, j * 0.35, k * 0.35) - 0.5) * rough * 2) this.set(i, j, k, fn(i, j, k));
    }
  }
  mesh() {
    const cells = [...this.m.values()].filter((c) => !(this.has(c.i + 1, c.j, c.k) && this.has(c.i - 1, c.j, c.k) && this.has(c.i, c.j + 1, c.k) && this.has(c.i, c.j - 1, c.k) && this.has(c.i, c.j, c.k + 1) && this.has(c.i, c.j, c.k - 1)));
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(this.u, this.u, this.u), vmat, cells.length);
    const mt = new THREE.Matrix4();
    cells.forEach((c, n) => { mt.makeTranslation(c.i * this.u, c.j * this.u, c.k * this.u); im.setMatrixAt(n, mt); im.setColorAt(n, rgb(c.c, c.k2)); });
    im.castShadow = im.receiveShadow = true; im.frustumCulled = false; return im;
  }
}
// top faces catch a little light, like the reference's sun-warmed tops
const topLit = (v, c) => { for (const q of v.m.values()) if (!v.has(q.i, q.j + 1, q.k)) q.c = mix(q.c, [255, 244, 200], 0.16); };

// ── pixel-art cut-out plants ──
function pixTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const P = (x, y, col) => { g.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`; g.fillRect(x | 0, y | 0, 1, 1); };
  draw(P, w, h);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Pixel-art plant cards. Blades are 2-3px ribbons with a lit left edge, a dark right edge and a pale midrib.
const rb = mulberry32(5);
function blade(P, x0, y0, len, lean, wMax, hue) {
  for (let s = 0; s < len; s++) {
    const t = s / len, cx = x0 + lean * Math.pow(t, 1.6) * 6 + Math.sin(t * 3 + x0) * 0.8, y = y0 - s;
    const w = Math.max(0.5, wMax * (t < 0.7 ? 1 - t * 0.25 : (1 - t) / 0.3 * 0.82));
    for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) {
      const d = (x + 0.5 - cx) / Math.max(w, 0.6); if (Math.abs(d) > 1.05) continue;
      let c = mix(hue[0], hue[1], 0.25 + t * 0.7);
      if (d < -0.35) c = mix(c, [214, 236, 110], 0.4); else if (d > 0.4) c = mix(c, [24, 60, 34], 0.5);
      if (Math.abs(d) < 0.2 && s % 5 < 3) c = mix(c, [220, 240, 140], 0.3);
      P(x, y, c);
    }
  }
}
const grassTex = (variant = 0) => pixTex(40, 96, (P) => {
  const hues = [[[40, 92, 40], [128, 186, 56]], [[52, 110, 38], [150, 196, 60]], [[30, 80, 44], [96, 160, 62]]];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const x0 = 8 + i * 4 + (rb() - 0.5) * 3, len = 40 + rb() * 54, lean = (rb() - 0.5) * 2.6;
    blade(P, x0, 95, len, lean, 2.2 + rb() * 1.2, hues[(i + variant) % 3]);
  }
});
const fernTex = () => pixTex(56, 96, (P) => {
  // upright frond like the reference: slim curved rachis, many short chevron leaflets, lime to gold
  const stem = (t) => [28 + Math.sin(t * 2.4) * 5 - t * 3, 95 - t * 90];
  for (let n = 0; n <= 160; n++) { const [x, y] = stem(n / 160); P(x, y, [88, 118, 40]); P(x + 1, y, [60, 86, 32]); }
  for (let k = 1; k < 34; k++) {
    const t = k / 34, [bx, by] = stem(t), L = Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.04)) * 14 + 2;
    for (const sd of [-1, 1]) for (let s = 1; s <= L; s++) {
      const f = s / L, x = bx + sd * s * 0.95, y = by - s * 0.55 + f * f * 2.2 + (k & 1) * 0.6;
      const c = mix([86, 128, 40], [190, 208, 76], t * 0.55 + (1 - f) * 0.35);
      P(x, y, c); P(x, y + 1, mix(c, [48, 84, 30], 0.5)); if (f < 0.5) P(x, y - 1, mix(c, [226, 232, 130], 0.3));
    }
  }
});
const swordTex = () => pixTex(48, 80, (P) => {
  for (let l = 0; l < 7; l++) {
    const an = (l - 3) * 0.3, len = 62 - Math.abs(l - 3) * 7;
    for (let s = 0; s < len; s++) {
      const t = s / len, cx = 24 + Math.sin(an) * s * 0.9 + Math.pow(t, 2) * (l - 3) * 3, y = 79 - s * Math.cos(an) * 0.98, w = Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.04)) * 4.4 + 0.5;
      for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) { const d = (x + 0.5 - cx) / Math.max(w, 0.6); if (Math.abs(d) > 1.05) continue; let c = mix([40, 104, 44], [132, 188, 62], t * 0.7 + 0.15); if (d < -0.3) c = mix(c, [200, 232, 110], 0.35); else if (d > 0.4) c = mix(c, [24, 60, 36], 0.5); if (Math.abs(d) < 0.15) c = mix(c, [210, 236, 130], 0.4); P(x, y, c); }
    }
  }
});
const redTex = () => pixTex(40, 80, (P) => {
  for (let y = 79; y >= 4; y--) P(20 + Math.sin(y * 0.07) * 1.2, y, [118, 30, 38]);
  for (let k = 0; k < 26; k++) {
    const t = k / 26, y0 = 77 - k * 2.8, L = Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.1)) * 13 + 2;
    for (const sd of [-1, 1]) for (let s = 1; s <= L; s++) { const f = s / L, x = 20 + sd * s, y = y0 - s * 0.6 + f * f * 2; const c = mix([176, 36, 46], [244, 90, 74], t * 0.5 + f * 0.4); P(x, y, c); P(x, y + 1, mix(c, [90, 18, 28], 0.5)); }
  }
});

function plantMesh(tex, items, rng, { w, hMin, hMax, alphaTest = 0.5 }) {
  const g = new THREE.PlaneGeometry(1, 1, 1, 6); g.translate(0, 0.5, 0);
  const sway = new Float32Array(g.attributes.uv.count); for (let i = 0; i < sway.length; i++) sway[i] = g.attributes.uv.getY(i);
  g.setAttribute('aSway', new THREE.BufferAttribute(sway, 1));
  const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest, side: THREE.DoubleSide, roughness: 0.85 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = swayTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float aSway;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = float(gl_InstanceID) * 1.31;
        transformed.x += (sin(uTime * 1.15 + ph + position.y * 0.6) * 0.13 + sin(uTime * 2.1 + ph * 2.0) * 0.025) * aSway * aSway;`);
  };
  const n = items.length * 2, im = new THREE.InstancedMesh(g, mat, n), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  let i = 0;
  for (const it of items) {
    const h = hMin + rng() * (hMax - hMin), yaw = rng() * 3.14, wd = w * (0.85 + rng() * 0.4);
    for (let k = 0; k < 2; k++) {                                              // two crossed cards read as a full little plant
      q.setFromEuler(e.set(0, yaw + k * 1.5708, (rng() - 0.5) * 0.12)); m.compose(p.set(it.x + (rng() - 0.5) * 0.15, it.y ?? -0.02, it.z + (rng() - 0.5) * 0.15), q, sc.set(wd, h, 1));
      im.setMatrixAt(i, m); im.setColorAt(i, new THREE.Color().setScalar(0.82 + rng() * 0.3)); i++;
    }
  }
  im.castShadow = im.receiveShadow = true; im.frustumCulled = false; return im;
}

export function buildDecor(seed = 21) {
  const rng = mulberry32(seed);
  const group = new THREE.Group();
  const spheres = [], boxes = [];
  const place = (v, x, y, z, ry = 0) => { const m = v.mesh(); m.position.set(x, y, z); m.rotation.y = ry; group.add(m); return m; };

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
    const path = new THREE.CatmullRomCurve3([[-5.2, 0.15, 0.9], [-4.5, 1.2, 1.0], [-3.6, 2.2, 0.95], [-2.6, 1.9, 1.0], [-1.5, 1.0, 1.1], [-0.2, 0.45, 1.25], [1.2, 0.3, 1.3]].map((a) => new THREE.Vector3(...a)));
    const branch = new THREE.CatmullRomCurve3([[-3.6, 2.2, 0.95], [-3.1, 2.9, 0.9], [-2.7, 3.7, 0.85]].map((a) => new THREE.Vector3(...a)));
    const tube = (curve, r0, r1) => { const N = 70; for (let n = 0; n <= N; n++) { const t = n / N, p = curve.getPoint(t), r = (r0 + (r1 - r0) * t) / u; const ci = Math.round(p.x / u), cj = Math.round(p.y / u), ck = Math.round(p.z / u);
      for (let i = ci - Math.ceil(r); i <= ci + Math.ceil(r); i++) for (let j = cj - Math.ceil(r); j <= cj + Math.ceil(r); j++) for (let k = ck - Math.ceil(r); k <= ck + Math.ceil(r); k++) if ((i * u - p.x) ** 2 + (j * u - p.y) ** 2 + (k * u - p.z) ** 2 <= (r * u) ** 2 && !v.has(i, j, k)) { const t2 = fbm(i * 0.18, j * 0.5, k * 0.18); v.set(i, j, k, mix([52, 33, 20], [102, 68, 40], t2)); } } };
    tube(path, 0.5, 0.26); tube(branch, 0.2, 0.1);
    topLit(v);
    const mesh = v.mesh(); group.add(mesh);
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
    place(v, 0.6, 0.06, 2.55, 0.3);
  }
  // ── air stones where the bubbles start ──
  for (const [x, z] of [[-3.6, 0.5], [3.3, -0.8]]) { const v = new Vox(0.06); v.fill(-2, 0, -2, 2, 1, 2, [150, 156, 150]); v.fill(-1, 2, -1, 1, 2, 1, [176, 182, 176]); place(v, x, 0.04, z); }

  // ── plants: dense layered cut-outs, placed like the reference (ferns hugging the left, tall grass through the middle, red plume by the lantern) ──
  const L = (x0, x1, z0, z1, n) => Array.from({ length: n }, () => ({ x: x0 + rng() * (x1 - x0), z: z0 + rng() * (z1 - z0) }));
  group.add(plantMesh(fernTex(), [...L(-5.3, -4.0, 0.2, 1.9, 7), ...L(-4.0, -3.0, 1.8, 2.6, 2), ...L(1.2, 2.6, 1.4, 2.3, 2)], rng, { w: 2.5, hMin: 3, hMax: 4.8 }));
  group.add(plantMesh(grassTex(0), [...L(-5, -0.5, -2.4, -1.8, 3), ...L(0.2, 4.8, -2.4, -0.4, 5), ...L(3.6, 4.9, 0.3, 1.8, 4), ...L(-5.2, -4.4, 0.4, 1.4, 3)], rng, { w: 1.9, hMin: 3.4, hMax: 5.4 }));
  group.add(plantMesh(grassTex(1), [...L(0.3, 2.8, 0.6, 1.6, 3), ...L(-1, 0.5, 2.6, 3.4, 2), ...L(1.8, 4, 2.4, 3.3, 3), ...L(-5, -4, 1.8, 2.8, 2)], rng, { w: 1.6, hMin: 1.4, hMax: 3 }));
  group.add(plantMesh(swordTex(), [{ x: -0.6, z: 1.9 }, { x: 2.4, z: 1.0 }, { x: -3.2, z: 2.6 }, { x: 0.6, z: -1.6 }], rng, { w: 2.1, hMin: 1.8, hMax: 2.7 }));
  group.add(plantMesh(redTex(), [{ x: 2.0, z: 0.3 }, { x: 1.5, z: -0.7 }, { x: 2.4, z: -0.4 }, { x: 1.7, z: 0.9 }], rng, { w: 1.7, hMin: 2.6, hMax: 3.8 }));

  // ── the big ruin, built from chunky voxels so it matches the rest: crenellated top, round arch, mossy courses ──
  const WX = -0.7, WZ = -1.2;
  {
    const u = 0.18, v = new Vox(u);
    const topOf = (i) => (i < -13 ? 58 : i < -4 ? 49 : i < 8 ? 36 : -1) + ((Math.floor(i / 5) & 1) && i < 8 ? -4 : 0);       // crenellations
    const inArch = (i, j) => { const dx = (i + 4) / 8.5; return j <= 14 ? Math.abs(i + 4) <= 8.5 : dx * dx + ((j - 14) / 9) ** 2 < 1; };
    const brick = (i, j, k) => {
      const course = Math.floor(j / 4), off = (course & 1) * 3, bi = Math.floor((i + off) / 6);
      const mortar = j % 4 === 0 || (i + off) % 6 === 0;
      let c = mix([136, 134, 118], [182, 176, 152], hash(bi, course, 1) * 0.8);
      c = mix(c, [96, 92, 70], fbm(i * 0.2, j * 0.2, k * 0.2) * 0.5);
      if (mortar) c = mix(c, [74, 70, 52], 0.5);
      if (hash(i, j, k, 4) > 0.9) c = mix(c, [60, 58, 44], 0.35);
      return c;
    };
    const solid = (i, j, k) => {
      if (j < 0) return false;
      if (i >= -22 && i <= 8) { if (j > topOf(i) + Math.round((fbm(i * 0.4, 3, 9) - 0.5) * 6)) return false; if (inArch(i, j) && Math.abs(k) < 8) return false; if (Math.abs(k) <= 6) return true; }
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
    const m = v.mesh(); m.position.set(WX, 0.02, WZ); group.add(m);
    const X = (i) => WX + i * u;
    const Y = (j) => j * u + 0.02;
    boxes.push({ min: [X(-22), 0, WZ - 1.0], max: [X(-13), Y(56), WZ + 1.0] }, { min: [X(-13), 0, WZ - 1.0], max: [X(-12), Y(46), WZ + 1.0] },
      { min: [X(-4) + 1.4, 0, WZ - 1.0], max: [X(8), Y(34), WZ + 1.0] }, { min: [X(-12), Y(23), WZ - 1.0], max: [X(-4) + 1.4, Y(36), WZ + 1.0] },
      { min: [X(13), 0, WZ - 0.9], max: [X(23), Y(40), WZ + 0.9] });
  }
  return { group, spheres, boxes, glow, lampPos, archX: WX - 4 * 0.18 };
}

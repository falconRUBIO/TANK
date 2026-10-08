// The tank environment, built from low-poly geometry: stone block ruins, rocks, driftwood,
// swaying plants, gravel and a stone lantern. Plants share one time uniform for vertex sway.
import * as THREE from 'three';
import { mulberry32, fbm, mix, hex } from '../color.js';
import { stoneTex, woodTex, gravelTex } from './textures.js';

export const swayTime = { value: 0 };
const C = (r, g, b) => new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
const tint = (c, k) => C(c[0] * k, c[1] * k, c[2] * k);

export function patch(mat, { sway = false } = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = swayTime;
    if (sway) {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float aSway;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
        float sw = aSway * aSway;
        transformed.x += sin(uTime * 1.1 + position.y * 0.55 + position.x * 1.9) * 0.2 * sw + sin(uTime * 2.3 + position.x * 3.0) * 0.03 * aSway;
        transformed.z += cos(uTime * 0.9 + position.y * 0.45 + position.z * 1.7) * 0.14 * sw;`);
    }
    // PS1 vertex wobble: snap clip-space positions to a coarse grid
    sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      { vec2 g = vec2(150.0, 266.0); vec4 pp = gl_Position; pp.xy = floor(pp.xy / pp.w * g + 0.5) / g * pp.w; gl_Position = pp; }`);
  };
  return mat;
}

// ── blade builder (grass, leaves, stems, vines) merged into one geometry ──
class Blades {
  constructor() { this.pos = []; this.col = []; this.sway = []; this.idx = []; }
  add({ x, y, z, h, w, lean = 0, dir = 0, curl = 0.5, base, tip, seg = 6, taper = 1, rib = null }) {
    const i0 = this.pos.length / 3;
    for (let s = 0; s <= seg; s++) {
      const k = s / seg;
      const off = (lean * k + curl * k * k) * h * 0.5;
      const cx = x + Math.cos(dir) * off, cz = z + Math.sin(dir) * off, cy = y + k * h * (1 - 0.15 * k);
      const ww = w * (taper === 1 ? (1 - k * 0.92) : Math.sin(Math.PI * Math.min(1, k * 1.1 + 0.05)) ** 0.7);
      const px = -Math.sin(dir), pz = Math.cos(dir);
      for (const side of [-1, 1]) {
        this.pos.push(cx + px * ww * side, cy, cz + pz * ww * side);
        const m = mix(base, tip, k);
        const edge = rib && side === 0 ? 1 : 0;
        const light = 1 + (side > 0 ? 0.12 : -0.08);
        this.col.push(m[0] / 255 * light, m[1] / 255 * light, m[2] / 255 * light);
        this.sway.push(k);
      }
      if (s > 0) { const a = i0 + (s - 1) * 2; this.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
  }
  mesh(material) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    // vertex colours are authored in sRGB; convert once so lighting stays linear
    const lin = this.col.map((v) => Math.pow(Math.min(1, Math.max(0, v)), 2.2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(lin, 3));
    g.setAttribute('aSway', new THREE.Float32BufferAttribute(this.sway, 1));
    g.setIndex(this.idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, material); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; return m;
  }
}
const leafMat = () => patch(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.75 }), { sway: true });

function lowPolyTube(points, radiusFn, radial, uvScale = 1) {
  const curve = new THREE.CatmullRomCurve3(points);
  const N = Math.max(8, points.length * 6);
  const pos = [], uv = [], idx = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = curve.getPoint(t), tan = curve.getTangent(t);
    const side = new THREE.Vector3().crossVectors(tan, up).normalize(); if (side.lengthSq() < 0.01) side.set(1, 0, 0);
    const nrm = new THREE.Vector3().crossVectors(side, tan).normalize();
    const r = radiusFn(t);
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2, wob = 1 + Math.sin(i * 1.7 + j * 2.3) * 0.12;
      pos.push(p.x + (side.x * Math.cos(a) + nrm.x * Math.sin(a)) * r * wob, p.y + (side.y * Math.cos(a) + nrm.y * Math.sin(a)) * r * wob, p.z + (side.z * Math.cos(a) + nrm.z * Math.sin(a)) * r * wob);
      uv.push(t * N * 0.25 * uvScale, j / radial);
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < radial; j++) { const a = i * radial + j, b = i * radial + (j + 1) % radial; idx.push(a, b, a + radial, b, b + radial, a + radial); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

export function buildEnvironment() {
  const root = new THREE.Group();
  const rng = mulberry32(7);
  const stoneA = new THREE.MeshStandardMaterial({ map: stoneTex(1, [126, 140, 130]), roughness: 0.92 });
  patch(stoneA);

  // ── ruins: staggered blocks, a keystone arch, mossy caps ──
  const blocks = [];
  const moss = [];
  const B = (x, y, z, w, h, d, ry = 0, rz = 0, mossy = rng() < 0.6) => blocks.push({ x, y, z, w, h, d, ry, rz, k: 0.82 + rng() * 0.3, mossy });
  const pillar = (cx, cz, w, d, top, ch = 0.46, jag = 0.5) => {
    let y = 0, c = 0;
    while (y < top) {
      const h = ch * (0.9 + rng() * 0.3);
      const off = (c & 1) ? w * 0.18 : -w * 0.1;
      const n = rng() < 0.5 ? 1 : 2;
      for (let i = 0; i < n; i++) {
        const bw = w / n * (0.92 + rng() * 0.12);
        const bx = cx - w / 2 + (i + 0.5) * (w / n) + off * (n === 1 ? 0.3 : 1);
        if (y + h > top - jag && rng() < 0.28) continue; // broken top
        B(bx, y + h / 2, cz + (rng() - 0.5) * 0.08, bw, h * 0.98, d * (0.94 + rng() * 0.1), (rng() - 0.5) * 0.06);
      }
      y += h; c++;
    }
  };
  const AX = -1.95, AY = 4.5, AR = 1.4;
  pillar(-3.85, -0.95, 1.2, 1.15, 6.9, 0.46, 0.8);     // left tower
  pillar(-0.2, -0.95, 1.2, 1.15, AY, 0.46, 0);          // right pier (springs the arch)
  // arch ring of wedge blocks
  const wedges = 11;
  for (let i = 0; i <= wedges; i++) {
    const a = Math.PI - (i / wedges) * Math.PI, x = AX + Math.cos(a) * AR, y = AY + Math.sin(a) * AR;
    if (i === 0 || i === wedges) continue;
    B(x, y, -0.95, 0.5, 0.62, 1.15, 0, a - Math.PI / 2 + Math.PI, true);
  }
  // wall above the arch + broken fragment on the right
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { if (r > 1 && rng() < 0.45) continue; B(-3.3 + c * 0.75 + (r & 1) * 0.2 + 0.4, AY + 1.5 + r * 0.5, -0.95, 0.74, 0.48, 1.05, (rng() - 0.5) * 0.05); }
  B(-3.85, 0.1, -0.95, 1.55, 0.22, 1.5, 0, 0, false); B(-0.2, 0.1, -0.95, 1.55, 0.22, 1.5, 0, 0, false); B(-0.2, AY + 0.13, -0.95, 1.5, 0.26, 1.4, 0, 0, true);
  pillar(2.9, -3.6, 1.1, 1.0, 5.4, 0.46, 1.2);           // second broken column, further back
  pillar(4.1, -2.4, 1.0, 1.0, 2.4, 0.46, 0.6);
  for (let i = 0; i < 16; i++) B(-4.4 + rng() * 9, 0.14 + rng() * 0.1, -2.5 + rng() * 4, 0.3 + rng() * 0.5, 0.25 + rng() * 0.2, 0.3 + rng() * 0.4, rng() * 3, 0, rng() < 0.4); // rubble
  const blockMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), stoneA, blocks.length);
  const mossMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), patch(new THREE.MeshStandardMaterial({ color: C(86, 150, 52), roughness: 1 })), blocks.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  let mc = 0;
  blocks.forEach((b, i) => {
    e.set(0, b.ry, b.rz); q.setFromEuler(e); m4.compose(v.set(b.x, b.y, b.z), q, s.set(b.w, b.h, b.d)); blockMesh.setMatrixAt(i, m4);
    blockMesh.setColorAt(i, new THREE.Color().setScalar(b.k));
    if (b.mossy) { m4.compose(v.set(b.x + (rng() - 0.5) * 0.1, b.y + b.h / 2 + 0.03, b.z), q.setFromEuler(e.set(0, b.ry, b.rz)), s.set(b.w * (0.5 + rng() * 0.5), 0.09, b.d * (0.6 + rng() * 0.4))); mossMesh.setMatrixAt(mc++, m4); }
  });
  mossMesh.count = mc;
  [blockMesh, mossMesh].forEach((m) => { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; root.add(m); });

  // far ruins (hazy silhouettes) – cheap copies pushed back
  const far = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), patch(new THREE.MeshStandardMaterial({ color: C(120, 140, 150), roughness: 1 })), 90);
  let fc = 0;
  const farPillar = (cx, cz, w, top, ch) => { for (let y = 0; y < top; y += ch) { if (y > top - 1 && rng() < 0.4) continue; m4.compose(v.set(cx + (rng() - 0.5) * 0.1, y + ch / 2, cz), q.identity(), s.set(w, ch * 0.97, w)); far.setMatrixAt(fc++, m4); } };
  farPillar(-6, -9, 1.6, 9, 0.7); farPillar(-1.5, -10, 1.6, 6, 0.7); farPillar(4.5, -9.5, 1.6, 10, 0.7); farPillar(8, -11, 1.8, 5, 0.7);
  for (let x = -6; x <= -1.5; x += 0.8) { m4.compose(v.set(x + 0.4, 6.4, -9.5), q.identity(), s.set(0.85, 0.7, 1.5)); far.setMatrixAt(fc++, m4); }
  far.count = fc; far.frustumCulled = false; root.add(far);

  // fallen column drums half-buried in the sand
  const drumMat = stoneA.clone(); patch(drumMat);
  [[1.9, 0.38, -1.4, 1.5, 0.3], [3.0, 0.3, -1.1, 1.2, -0.5], [2.4, 0.55, -1.25, 0.9, 0.9]].forEach(([x, y, z, len, ry], di) => {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.45 - di * 0.05, 0.45 - di * 0.05, len, 9), drumMat); d.rotation.z = Math.PI / 2; d.rotation.y = ry; d.position.set(x, y, z); d.castShadow = d.receiveShadow = true; root.add(d);
  });
  // ── rocks ──
  const rockMat = patch(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
  const rock = (x, y, z, sx, sy, sz, seed) => {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const p = g.attributes.position, cols = [];
    for (let i = 0; i < p.count; i++) {
      const n = fbm(p.getX(i) * 1.7 + seed, p.getY(i) * 1.7, p.getZ(i) * 1.7 + seed);
      const f = 0.75 + n * 0.5; p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f);
    }
    g.computeVertexNormals();
    const nrm = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const up = nrm.getY(i), n = fbm(p.getX(i) * 3 + seed, p.getZ(i) * 3, 2);
      let c = mix([92, 100, 98], [150, 158, 150], n);
      if (up > 0.55 && n > 0.45) c = mix(c, [74, 138, 52], 0.65);
      cols.push(...C(c[0], c[1], c[2]).toArray());
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const m = new THREE.Mesh(g, rockMat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.y = seed;
    m.castShadow = m.receiveShadow = true; root.add(m);
  };
  rock(-4.0, 0.4, 1.5, 1.5, 0.95, 1.1, 1); rock(1.2, 0.3, -0.9, 0.9, 0.6, 0.8, 2); rock(3.4, 0.35, 0.6, 1.15, 0.7, 0.9, 3);
  rock(-1.0, 0.18, 1.9, 0.5, 0.3, 0.45, 4); rock(0.4, 0.22, -2.6, 1.3, 0.8, 1.0, 5); rock(4.3, 0.5, -1.3, 0.8, 1.0, 0.8, 6); rock(-4.6, 0.25, -0.2, 0.6, 0.5, 0.6, 7);

  // ── driftwood ──
  const wood = patch(new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.9, flatShading: true }));
  const trunk = lowPolyTube([new THREE.Vector3(-4.8, 0.2, 1.0), new THREE.Vector3(-3.4, 0.6, 1.1), new THREE.Vector3(-2.2, 1.5, 1.0), new THREE.Vector3(-0.8, 1.9, 0.9), new THREE.Vector3(0.5, 1.2, 1.0), new THREE.Vector3(1.8, 0.35, 1.1)], (t) => 0.36 - t * 0.14 + Math.sin(t * 9) * 0.03, 6);
  const wm = new THREE.Mesh(trunk, wood); wm.castShadow = wm.receiveShadow = true; root.add(wm);
  for (const pts of [[[-2.2, 1.5, 1.0], [-2.6, 2.4, 0.9], [-2.4, 3.3, 0.8]], [[-0.8, 1.9, 0.9], [-0.2, 2.9, 0.8], [0.4, 3.6, 0.8]], [[-3.4, 0.6, 1.1], [-3.9, 1.4, 1.0], [-4.0, 2.2, 0.9]]]) {
    const b = new THREE.Mesh(lowPolyTube(pts.map((a) => new THREE.Vector3(...a)), (t) => 0.13 - t * 0.09, 5), wood); b.castShadow = true; root.add(b);
  }

  // ── gravel bed ──
  {
    const g = new THREE.PlaneGeometry(26, 14, 56, 30); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, cols = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const h = fbm(x * 0.35, z * 0.35, 8) * 0.34 + Math.max(0, (-z - 3) * 0.12) + Math.max(0, (Math.abs(x) - 6) * 0.1);
      p.setY(i, h - 0.1);
      const k = 0.78 + fbm(x * 1.2, z * 1.2, 3) * 0.4; cols.push(k, k, k);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
    const fl = new THREE.Mesh(g, patch(new THREE.MeshStandardMaterial({ map: gravelTex(), vertexColors: true, roughness: 1 })));
    fl.position.set(0, 0, -2.5); fl.receiveShadow = true; root.add(fl);
    const pebbles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 0), patch(new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 })), 420);
    for (let i = 0; i < 420; i++) {
      const x = (rng() - 0.5) * 12, z = -4 + rng() * 6.4, sc = 0.05 + rng() * rng() * 0.2;
      m4.compose(v.set(x, 0.05 + fbm(x * 0.35, (z + 2.5) * 0.35, 8) * 0.34 - 0.1 + sc * 0.2, z), q.setFromEuler(e.set(rng() * 3, rng() * 3, rng() * 3)), s.set(sc * 1.4, sc, sc * 1.2)); pebbles.setMatrixAt(i, m4);
      const k = rng(); pebbles.setColorAt(i, k < 0.3 ? C(112, 104, 94) : k < 0.55 ? C(232, 214, 176) : k < 0.8 ? C(156, 120, 84) : C(128, 138, 134));
    }
    pebbles.castShadow = pebbles.receiveShadow = true; pebbles.frustumCulled = false; root.add(pebbles);
  }

  // ── plants ──
  const grass = new Blades(), leaves = new Blades(), red = new Blades(), vines = new Blades();
  const clump = (x, z, n, hMin, hMax, spread, light = 0) => {
    for (let i = 0; i < n; i++) {
      const hh = hMin + rng() * (hMax - hMin), k = rng();
      grass.add({ x: x + (rng() - 0.5) * spread, y: 0, z: z + (rng() - 0.5) * spread * 0.6, h: hh, w: 0.07 + rng() * 0.05, dir: rng() * 6.28, lean: (rng() - 0.5) * 0.7, curl: (rng() - 0.5) * 0.9, seg: 7,
        base: mix([36, 70, 40], [58, 98, 46], k), tip: mix([104, 150, 60], [160, 190, 84], k + light) });
    }
  };
  [[-4.4, 0.3, 8, 3, 6.5, 0.9], [-3.4, 1.9, 7, 2.4, 5, 0.9], [1.8, 1.5, 9, 3, 7, 1.0], [4.0, 1.4, 8, 3.5, 7.5, 1.0], [3.0, -1.6, 7, 4, 7.5, 0.9], [-2.9, -2.2, 6, 3, 6, 0.9], [0.2, -3.2, 8, 3.5, 7, 1.2], [4.6, 0.3, 6, 2, 4, 0.8]].forEach(([x, z, n, a, b, sp]) => clump(x, z, n, a, b, sp));
  // broad sword leaves
  [[-0.9, 1.5, 0], [2.4, 0.8, 1], [-4.1, 2.2, 2], [1.0, -2.0, 3]].forEach(([x, z, si]) => {
    for (let l = 0; l < 9; l++) {
      const dir = (l / 9) * 6.28 + si; leaves.add({ x: x + Math.cos(dir) * 0.08, y: 0, z: z + Math.sin(dir) * 0.08, h: 1.7 + rng() * 1.1, w: 0.2 + rng() * 0.08, dir, lean: 0.9, curl: 0.9, seg: 6, taper: 2,
        base: [34, 94, 40], tip: mix([96, 146, 64], [140, 180, 80], rng()) });
    }
  });
  // red stem plants
  [[-0.2, 0.9], [3.7, 0.4], [1.2, -0.4]].forEach(([x, z], ri) => {
    const hh = 3 + ri * 0.6;
    red.add({ x, y: 0, z, h: hh, w: 0.03, lean: 0.1, curl: 0.5, dir: ri, seg: 10, base: [110, 30, 40], tip: [190, 60, 64] });
    for (let k = 1; k < 12; k++) { const yy = k * hh / 12; for (const s of [-1, 1]) red.add({ x: x + Math.sin(ri) * 0.02, y: yy, z, h: 0.45 * (1 - k / 14), w: 0.07, dir: s > 0 ? 0 : Math.PI, lean: 0.6, curl: 0.4, seg: 3, taper: 2, base: [150, 40, 50], tip: [244, 110, 90] }); }
  });
  // grass tufts rooted on top of the ruins
  const tuft = (x, y, z, n) => { for (let i = 0; i < n; i++) grass.add({ x: x + (rng() - 0.5) * 0.7, y, z: z + (rng() - 0.5) * 0.5, h: 0.35 + rng() * 0.7, w: 0.05, dir: rng() * 6.28, lean: (rng() - 0.5) * 0.9, curl: 0.5, seg: 4, base: [40, 100, 44], tip: [140, 196, 74] }); };
  tuft(-3.85, 6.95, -0.95, 9); tuft(-0.2, AY + 0.05, -0.95, 7); tuft(-3.0, AY + 3.1, -0.95, 6); tuft(2.9, 5.45, -3.6, 7); tuft(-1.95, AY + 1.62, -0.95, 5);
  // bushy green stem plants + moss mounds
  [[-2.2, 2.1], [2.0, 1.9], [4.2, 1.0], [-3.2, -1.0]].forEach(([x, z], bi) => {
    for (let st = 0; st < 5; st++) { const hh = 1.6 + rng() * 1.6, dir = st * 1.3 + bi; leaves.add({ x, y: 0, z, h: hh, w: 0.03, dir, lean: 0.3, curl: 0.4, seg: 8, base: [50, 110, 46], tip: [120, 190, 70] });
      for (let k = 1; k < 9; k++) for (const sd of [-1, 1]) leaves.add({ x: x + Math.cos(dir) * 0.3 * k / 9 * hh * 0.5, y: k * hh / 9, z: z + Math.sin(dir) * 0.3 * k / 9 * hh * 0.5, h: 0.32, w: 0.06, dir: dir + (sd > 0 ? 1.57 : -1.57), lean: 0.6, curl: 0.3, seg: 2, taper: 2, base: [60, 130, 52], tip: [150, 206, 84] }); }
  });
  const mossG = new THREE.IcosahedronGeometry(1, 1);
  [[-3.0, 0.3, 1.8, 0.5], [1.7, 0.25, 2.0, 0.4], [-0.3, 0.2, -1.8, 0.45]].forEach(([x, y, z, r], mi) => {
    const mm = new THREE.Mesh(mossG, patch(new THREE.MeshStandardMaterial({ color: C(70, 130, 56), flatShading: true, roughness: 1 })));
    mm.position.set(x, y, z); mm.scale.set(r * 1.6, r * 0.7, r * 1.2); mm.castShadow = mm.receiveShadow = true; root.add(mm);
  });
  // starfish + a couple of shells on the sand
  const starMat = patch(new THREE.MeshStandardMaterial({ color: C(238, 120, 52), roughness: 0.8 }));
  for (let a = 0; a < 5; a++) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.11), starMat); arm.rotation.y = a * 1.2566; arm.position.set(-1.6 + Math.cos(a * 1.2566) * 0.2, 0.1, 2.35 + Math.sin(a * 1.2566) * -0.2); arm.castShadow = true; root.add(arm); }
  // backdrop kelp forest (hazy, deep)
  const kelp = new Blades();
  for (let i = 0; i < 34; i++) kelp.add({ x: -7 + rng() * 14, y: 0, z: -5 - rng() * 4, h: 5 + rng() * 8, w: 0.12 + rng() * 0.1, dir: rng() * 6.28, lean: (rng() - 0.5) * 0.4, curl: 0.4, seg: 10, base: [24, 70, 62], tip: [58, 124, 96] });
  root.add(kelp.mesh(leafMat()));
  // hanging moss/vines off the ruin
  for (let i = 0; i < 26; i++) { const x = -4.4 + rng() * 4.6, top = 6.9 - rng() * 0.2; if (x > -3.2 && x < -0.8) { vines.add({ x, y: AY - 0.5, z: -0.4, h: -(0.4 + rng() * 1.2), w: 0.05, dir: 0, lean: 0.1, curl: 0.2, seg: 4, base: [90, 150, 56], tip: [50, 110, 44] }); } else vines.add({ x, y: 2 + rng() * 4.2, z: -0.38, h: -(0.3 + rng() * 1.0), w: 0.05, dir: 0, lean: 0.1, curl: 0.2, seg: 4, base: [90, 150, 56], tip: [50, 110, 44] }); }
  [grass, leaves, red, vines].forEach((b) => root.add(b.mesh(leafMat())));

  // ── stone lantern ──
  const lant = new THREE.Group();
  const lmat = stoneA.clone(); patch(lmat);
  const box = (w, h, d, y, mat = lmat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.y = y; m.castShadow = m.receiveShadow = true; lant.add(m); return m; };
  box(1.1, 0.25, 1.1, 0.12); box(0.4, 0.9, 0.4, 0.7); box(1.0, 0.18, 1.0, 1.24);
  const glow = new THREE.MeshStandardMaterial({ color: C(255, 190, 90), emissive: C(255, 150, 50), emissiveIntensity: 1.2, roughness: 0.6 });
  box(0.62, 0.55, 0.62, 1.6, glow);
  for (const [sx, sz] of [[0.36, 0.36], [-0.36, 0.36], [0.36, -0.36], [-0.36, -0.36]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.12), lmat); p.position.set(sx * 0.8, 1.6, sz * 0.8); p.castShadow = true; lant.add(p); }
  box(1.5, 0.16, 1.5, 2.0); box(1.1, 0.14, 1.1, 2.14); box(0.7, 0.14, 0.7, 2.28); box(0.3, 0.22, 0.3, 2.45);
  lant.position.set(3.35, 0.0, -0.4); lant.rotation.y = -0.25; root.add(lant);
  return { root, glow, lampPos: new THREE.Vector3(3.35, 1.6, -0.1), archX: AX };
}

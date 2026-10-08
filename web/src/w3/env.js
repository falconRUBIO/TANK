// The tank environment, built from low-poly geometry: stone block ruins, rocks, driftwood,
// swaying plants, gravel and a stone lantern. Plants share one time uniform for vertex sway.
import * as THREE from 'three';
import { mulberry32, fbm, mix, hex } from '../color.js';
import { stoneTex, woodTex, gravelTex } from './textures.js';
import { Solids } from './decor.js';

import { swayTime } from './voxshade.js';
export { swayTime };
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

// a soft, sweet backdrop: layered pastel sand dunes with round coral domes and little stars, all unlit so the water tint does the shading
function buildBackdrop() {
  const g = new THREE.Group(), r = mulberry32(31);
  const layers = [[-7, 0xf6b8c8, 2.4, 0.2], [-12, 0xc9b6f0, 3.6, 1.4], [-18, 0x9fd0f2, 4.8, 2.6], [-26, 0x86e0d0, 6.0, 3.8]];
  const domeCols = [0xff9ec4, 0xffd36e, 0xb89cff, 0x7fe3c8, 0xff9a7a];
  const dome = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff }), 90);
  const star = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 0.42 : 1; i ? star.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : star.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  const stars = new THREE.InstancedMesh(new THREE.ShapeGeometry(star), new THREE.MeshBasicMaterial({ color: 0xffffff }), 40);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); let nd = 0, ns = 0;
  layers.forEach(([z, col, amp, base], li) => {
    const sh = new THREE.Shape(), top = (x) => base + amp * (Math.sin(x * 0.13 + li * 1.7) * 0.5 + Math.sin(x * 0.29 + li * 3.1) * 0.3 + 0.55);
    sh.moveTo(-60, -6); for (let x = -60; x <= 60; x += 1.5) sh.lineTo(x, top(x)); sh.lineTo(60, -6); sh.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: col })); m.position.z = z; g.add(m);
    for (let i = 0; i < 18 && nd < 90; i++) { const x = -40 + r() * 80, sc = 0.5 + r() * 1.1 + li * 0.25; m4.compose(new THREE.Vector3(x, top(x) - 0.1, z + 0.2), q.identity(), new THREE.Vector3(sc, sc * (0.8 + r() * 0.5), sc)); dome.setMatrixAt(nd, m4); dome.setColorAt(nd++, new THREE.Color(domeCols[(r() * domeCols.length) | 0])); }
    for (let i = 0; i < 6 && ns < 40; i++) { const x = -34 + r() * 68, sc = 0.45 + r() * 0.5 + li * 0.15; m4.compose(new THREE.Vector3(x, top(x) + 0.35 + r() * 0.5, z + 0.3), q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), (r() - 0.5) * 0.8), new THREE.Vector3(sc, sc, 1)); stars.setMatrixAt(ns, m4); stars.setColorAt(ns++, new THREE.Color(r() < 0.5 ? 0xffe27a : 0xffb0d0)); }
  });
  dome.count = nd; stars.count = ns; dome.frustumCulled = stars.frustumCulled = false; g.add(dome, stars);
  return g;
}

export function buildEnvironment() {
  const root = new THREE.Group();
  const rng = mulberry32(7);
  const stoneA = new THREE.MeshStandardMaterial({ map: stoneTex(1, [170, 162, 128]), roughness: 0.92 });
  patch(stoneA);

  // ── ruins: staggered blocks, a keystone arch, mossy caps ──
  const blocks = [];
  const moss = [];
  const B = (x, y, z, w, h, d, ry = 0, rz = 0, mossy = rng() < 0.85) => blocks.push({ x, y, z, w, h, d, ry, rz, k: 0.5 + rng() * 0.26, mossy });
  const carve = [];
  // regular masonry: staggered courses of squarish blocks; only the crowns are broken
  const colBoxes = [];                                                         // solid volumes fish must swim around
  const wall = (cx, cz, w, d, y0, y1, { crown = 0, ornate = false, ch = 0.5 } = {}) => {
    colBoxes.push({ min: [cx - w / 2, y0, cz - d / 2], max: [cx + w / 2, y1 - crown * 0.4, cz + d / 2] });
    let y = y0, c = 0;
    while (y < y1 - 0.05) {
      if (ornate && c % 6 === 5) { B(cx, y + 0.15, cz, w * 1.1, 0.3, d * 1.1, 0, 0, true); y += 0.3; c++; continue; }   // cornice band
      const n = Math.max(1, Math.round(w / 0.95)), bn = w / n, half = c & 1;
      const cells = half ? [[0, bn / 2], ...Array.from({ length: n - 1 }, (_, i) => [bn / 2 + i * bn, bn]), [w - bn / 2, bn / 2]] : Array.from({ length: n }, (_, i) => [i * bn, bn]);
      for (const [x0, bw] of cells) {
        const bx = cx - w / 2 + x0 + bw / 2, hi = (y - y0) / Math.max(1, y1 - y0);
        if (y + ch > y1 - crown && rng() < 0.28 + hi * 0.22) continue;                       // broken crown
        const bz = cz + (rng() < 0.08 ? (rng() - 0.5) * 0.18 : 0);
        B(bx, y + ch / 2, bz, bw * 0.985, ch * 0.985, d, (rng() - 0.5) * 0.015, 0);
        if (ornate && c % 5 === 2 && cells.indexOf(cells.find((q2) => q2[0] === x0)) % 2 === 0) for (let k = -1; k <= 1; k++) carve.push({ x: bx + k * bw * 0.26, y: y + ch / 2, z: bz + d / 2 + 0.012, w: 0.13, h: 0.13 + (k === 0 ? 0.08 : 0) });
      }
      y += ch; c++;
    }
  };
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
  const carveMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), patch(new THREE.MeshStandardMaterial({ color: C(96, 90, 66), roughness: 1 })), Math.max(1, carve.length));
  carve.forEach((cv, i) => { m4.compose(v.set(cv.x, cv.y, cv.z), q.identity(), s.set(cv.w, cv.h, 0.05)); carveMesh.setMatrixAt(i, m4); });
  carveMesh.castShadow = false; carveMesh.receiveShadow = true; carveMesh.frustumCulled = false; root.add(carveMesh);
  [blockMesh, mossMesh].forEach((m) => { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; root.add(m); });

  // far ruins: hazy colonnades with real arches, fading into the water
  const far = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), patch(new THREE.MeshStandardMaterial({ color: C(120, 140, 150), roughness: 1 })), 700);
  let fc = 0;
  const fb = (x, y, z, w, h, d, rz = 0) => { m4.compose(v.set(x, y, z), q.setFromEuler(e.set(0, 0, rz)), s.set(w, h, d)); far.setMatrixAt(fc, m4); const k = 0.78 + rng() * 0.36; far.setColorAt(fc++, new THREE.Color(k * (y > 4 ? 0.95 : 1), k * (y > 4 ? 1.06 : 1), k)); };
  const farPier = (cx, cz, w, top, ch) => { for (let y = 0; y < top; y += ch) { if (y > top - 1.2 && rng() < 0.45) continue; fb(cx + (rng() - 0.5) * 0.12, y + ch / 2, cz, w * (0.94 + rng() * 0.1), ch * 0.97, w); } };
  const farArch = (cx, cz, span, spring, w) => {                              // two piers + a ring of wedges + a lintel course above
    farPier(cx - span / 2 - w / 2, cz, w, spring, 0.7); farPier(cx + span / 2 + w / 2, cz, w, spring + 0.7, 0.7);
    const R = span / 2;
    for (let i = 1; i < 8; i++) { const a = Math.PI - (i / 8) * Math.PI; fb(cx + Math.cos(a) * R, spring + Math.sin(a) * R, cz, 0.7, 0.9, w, a - Math.PI / 2 + Math.PI); }
    for (let x = cx - span / 2 - w; x <= cx + span / 2 + w; x += 0.85) if (rng() < 0.85) fb(x + 0.4, spring + R + 0.75, cz, 0.85, 0.6, w * 1.1);
  };
  far.count = fc; far.frustumCulled = false; root.add(far);

  // ── gravel bed ──
  {
    const g = new THREE.PlaneGeometry(30, 30, 64, 64); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, cols = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const h = fbm(x * 0.35, z * 0.35, 8) * 0.34 + Math.max(0, (-z - 3) * 0.12) + Math.max(0, (Math.abs(x) - 6) * 0.1);
      p.setY(i, h - 0.1);
      const k = 0.78 + fbm(x * 1.2, z * 1.2, 3) * 0.4; cols.push(k, k, k);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
    const fl = new THREE.Mesh(g, patch(new THREE.MeshStandardMaterial({ map: gravelTex(), vertexColors: true, roughness: 1 })));
    fl.position.set(0, 0, 5); fl.receiveShadow = true; root.add(fl);
    const pebbles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 0), patch(new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 })), 420);
    for (let i = 0; i < 420; i++) {
      const x = (rng() - 0.5) * 12, z = -4 + rng() * 6.4, sc = 0.05 + rng() * rng() * 0.2;
      m4.compose(v.set(x, 0.05 + fbm(x * 0.35, (z + 2.5) * 0.35, 8) * 0.34 - 0.1 + sc * 0.2, z), q.setFromEuler(e.set(rng() * 3, rng() * 3, rng() * 3)), s.set(sc * 1.4, sc, sc * 1.2)); pebbles.setMatrixAt(i, m4);
      const k = rng(); pebbles.setColorAt(i, k < 0.3 ? C(112, 104, 94) : k < 0.55 ? C(232, 214, 176) : k < 0.8 ? C(156, 120, 84) : C(128, 138, 134));
    }
    pebbles.castShadow = pebbles.receiveShadow = true; pebbles.frustumCulled = false; root.add(pebbles);
  }

  // ── growth on the ruins, hazy kelp and dark framing blades (all other decoration lives in decor.js) ──

  root.add(buildBackdrop());

  return { root, archX: 0, colliders: new Solids() };
}

// Tiny procedural textures, nearest-filtered so they stay chunky (PS1 style).
import * as THREE from 'three';
import { mulberry32, fbm, mix, hex } from '../color.js';

export function makeTex(size, draw, { repeat = [1, 1] } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const px = (g, x, y, c) => { g.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; g.fillRect(x, y, 1, 1); };

// Carved stone block face: Bayer-dithered 3-tone mottling, hard 1px speckle, mossy green flecks, bevelled edges.
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function stoneTex(seed = 1, base = [170, 162, 128]) {
  return makeTex(32, (g, S) => {
    const r = mulberry32(seed * 977), N = S / 2;                  // 16x16 cells drawn 2px wide: chunky, like the reference's big voxels
    const dark = mix(base, [60, 58, 40], 0.55), light = mix(base, [236, 226, 170], 0.42);
    const mossC = [[84, 122, 38], [122, 152, 48], [166, 174, 62]];
    const cell = (x, y, c) => { g.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; g.fillRect(x * 2, y * 2, 2, 2); };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const th = (BAY[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5;
      const n = fbm(x * 0.34 + seed * 9, y * 0.34, seed) * 1.12 + (r() - 0.5) * 0.22;
      let c = n < 0.4 + th * 0.24 ? dark : n > 0.62 + th * 0.24 ? light : base;
      const q = r();
      if (q > 0.95) c = mix(c, [40, 38, 28], 0.42); else if (q > 0.91) c = mix(c, [244, 232, 176], 0.34);
      const m = fbm(x * 0.28 + 40, y * 0.4 + seed, 3) + th * 0.3;
      if (m > 0.6 && y < N * 0.88) c = mossC[(r() * (m > 0.74 ? 3 : 2)) | 0];
      if (y < 1 || x < 1) c = mix(c, [246, 240, 200], 0.26);
      if (y > N - 2 || x > N - 2) c = mix(c, [20, 24, 20], 0.5);
      cell(x, y, c);
    }
    let cx = (r() * N) | 0, cy = 1; for (let i = 0; i < 6; i++) { cell(cx, cy, [34, 36, 28]); cy++; cx += r() < 0.5 ? 0 : (r() < 0.5 ? -1 : 1); }
  });
}
export function woodTex() {
  return makeTex(32, (g, S) => {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const n = fbm(x * 0.09, y * 0.55, 12);
      let c = mix([54, 32, 16], [158, 106, 58], n);
      if (((x * 7 + y * 3) % 11) === 0) c = mix(c, [30, 18, 10], 0.4);
      if (fbm(x * 0.2 + 5, y * 0.2, 41) > 0.7) c = mix(c, [74, 130, 54], 0.5);
      px(g, x, y, c);
    }
  });
}
export function gravelTex() {
  return makeTex(64, (g, S) => {
    const r = mulberry32(3);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) px(g, x, y, mix([214, 186, 126], [164, 134, 84], fbm(x * 0.1, y * 0.1, 4)));
    for (let i = 0; i < 260; i++) {
      const x = (r() * S) | 0, y = (r() * S) | 0, k = r(), w = 1 + ((r() * 2) | 0);
      const c = k < 0.3 ? [96, 90, 82] : k < 0.55 ? [226, 208, 170] : k < 0.8 ? [150, 116, 82] : [120, 128, 124];
      g.fillStyle = `rgb(${c})`; g.fillRect(x, y, w, w); g.fillStyle = 'rgba(255,255,240,.35)'; g.fillRect(x, y, 1, 1); g.fillStyle = 'rgba(10,20,30,.35)'; g.fillRect(x + w - 1, y + w - 1, 1, 1);
    }
  }, { repeat: [7, 4] });
}
// Caustic web, regenerated each tick and projected from the sun spot light.
export class CausticMap {
  constructor(n = 96) {
    this.n = n; this.c = document.createElement('canvas'); this.c.width = this.c.height = n; this.g = this.c.getContext('2d');
    this.img = this.g.createImageData(n, n);
    this.tex = new THREE.CanvasTexture(this.c);
    this.tex.magFilter = THREE.NearestFilter; this.tex.minFilter = THREE.NearestFilter; this.tex.generateMipmaps = false;
    this.tex.wrapS = this.tex.wrapT = THREE.RepeatWrapping; this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.repeat.set(2.5, 2.5);
  }
  update(t) {
    const n = this.n, d = this.img.data, TAU = Math.PI * 2;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const px0 = ((x / n) * TAU * 2) % TAU - 250, py0 = ((y / n) * TAU * 2) % TAU - 250;
      let ix = px0, iy = py0, c = 1;
      for (let k = 0; k < 4; k++) {
        const tt = t * (1 - 3.5 / (k + 1));
        ix = px0 + Math.cos(tt - ix) + Math.sin(tt + iy);
        iy = py0 + Math.sin(tt - iy) + Math.cos(tt + ix);
        c += 0.005 / Math.hypot(px0 / Math.sin(ix + tt), py0 / Math.cos(iy + tt)) ;
      }
      c /= 4; c = 1.17 - Math.pow(c, 1.4); c = Math.pow(Math.abs(c), 8);
      const v = Math.max(0, Math.min(255, 70 + c * 640));
      const i = (y * n + x) * 4; d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
    }
    this.g.putImageData(this.img, 0, 0); this.tex.needsUpdate = true;
  }
}

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

// Carved stone block face: bevelled edges, speckle, cracks, moss in the top rows.
export function stoneTex(seed = 1, base = [158, 166, 158]) {
  return makeTex(32, (g, S) => {
    const r = mulberry32(seed * 977);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const n = fbm(x * 0.22 + seed * 9, y * 0.22, seed);
      let c = mix(base, [96, 108, 106], (1 - n) * 0.8);
      if (r() > 0.93) c = mix(c, [60, 70, 72], 0.4); else if (r() > 0.96) c = mix(c, [225, 230, 215], 0.35);
      if (y < 2 || x < 2) c = mix(c, [240, 240, 220], y < 1 || x < 1 ? 0.28 : 0.12);
      if (y > S - 3 || x > S - 3) c = mix(c, [22, 30, 36], y > S - 2 || x > S - 2 ? 0.55 : 0.28);
      const m = fbm(x * 0.18 + 40, y * 0.3 + seed, 3);
      if (m > 0.64 && y < S * 0.55) c = mix(c, [78, 140, 56], Math.min(1, (m - 0.6) * 4));
      px(g, x, y, c);
    }
    let cx = (r() * S) | 0, cy = 2; for (let i = 0; i < 12; i++) { px(g, cx, cy, [40, 48, 50]); cy++; cx += r() < 0.5 ? 0 : (r() < 0.5 ? -1 : 1); }
  });
}
export function woodTex() {
  return makeTex(32, (g, S) => {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const n = fbm(x * 0.09, y * 0.55, 12);
      let c = mix([58, 36, 20], [138, 94, 58], n);
      if (((x * 7 + y * 3) % 11) === 0) c = mix(c, [30, 18, 10], 0.4);
      if (fbm(x * 0.2 + 5, y * 0.2, 41) > 0.7) c = mix(c, [74, 130, 54], 0.5);
      px(g, x, y, c);
    }
  });
}
export function gravelTex() {
  return makeTex(64, (g, S) => {
    const r = mulberry32(3);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) px(g, x, y, mix([188, 168, 132], [150, 128, 96], fbm(x * 0.1, y * 0.1, 4)));
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

// Voxel fish renderer: builds a small voxel model from a species description and
// rasterises it to pixel-art sprites at any yaw / pitch / tail phase, with
// hue-shifted toon shading and selective outlines. Everything is cached.
import { ramp, clamp, mix } from './color.js';

const LIGHT = (() => { const l = [-0.32, 0.86, 0.42]; const m = Math.hypot(...l); return l.map((v) => v / m); })();
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function buildModel(sp) {
  const { x: [x0, x1], y: [y0, y1], z: [z0, z1] } = sp.bounds;
  const W = x1 - x0 + 1, H = y1 - y0 + 1, D = z1 - z0 + 1;
  const occ = new Uint8Array(W * H * D);
  const idx = (x, y, z) => ((z - z0) * H + (y - y0)) * W + (x - x0);
  const list = [];
  for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const s = sp.sample(x, y, z);
    if (!s) continue;
    occ[idx(x, y, z)] = 1;
    list.push({ x, y, z, tag: s.tag, c: s.c, em: s.em || 0, flap: s.flap || 0, wave: s.wave || 0, arm: s.arm ?? -1, pupil: s.pupil ?? 0, at: s.at ?? 0, off: s.off, nx: 0, ny: 0, nz: 1, thin: false });
  }
  // Smooth normals from a 5x5x5 occupancy gradient so bodies shade like rounded forms.
  const R = 2;
  for (const v of list) {
    let gx = 0, gy = 0, gz = 0, sw = 0;
    for (let dz = -R; dz <= R; dz++) for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const w = 1 / (1 + dx * dx + dy * dy + dz * dz);
      sw += w;
      const X = v.x + dx, Y = v.y + dy, Z = v.z + dz;
      if (X < x0 || X > x1 || Y < y0 || Y > y1 || Z < z0 || Z > z1 || !occ[idx(X, Y, Z)]) continue;
      gx -= dx * w; gy -= dy * w; gz -= dz * w;
    }
    gx /= sw; gy /= sw; gz /= sw;
    const m = Math.hypot(gx, gy, gz);
    if (m < 0.05) { v.thin = true; v.nx = 0; v.ny = 0; v.nz = 1; } else { v.nx = gx / m; v.ny = gy / m; v.nz = gz / m; v.thin = Math.abs(gz) / m < 0.2 && v.flap + v.wave > 0 ? true : m < 0.1; }
  }
  const cx = sp.center?.[0] ?? 0, cyy = sp.center?.[1] ?? 0;
  let r = 0;
  for (const v of list) { v.x -= cx; v.y -= cyy; r = Math.max(r, Math.hypot(v.x, v.y, v.z)); }
  return { sp, list, radius: r, size: 2 * Math.ceil(r + 2) };
}

export function renderSprite(model, { yaw = 0, pitch = 0, phase = 0, scale = 1 } = {}) {
  const { sp, list } = model;
  const S = Math.ceil(model.size * scale / 2) * 2 + 2;
  const buf = new Uint8ClampedArray(S * S * 4);
  const zb = new Float32Array(S * S).fill(-1e9);
  const cyaw = Math.cos(yaw), syaw = Math.sin(yaw), cp = Math.cos(pitch), sp_ = Math.sin(pitch);
  const bend = sp.bend;
  const cxs = sp.center?.[0] ?? 0;
  const pxl = new Int16Array(S * S).fill(-1);
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    let x = v.x, y = v.y, z = v.z;
    if (bend) {
      const piv = bend.pivot - cxs;
      if (x < piv) {
        const d = piv - x, t = Math.min(1, d / bend.len);
        const th = bend.amp * Math.sin(phase) * Math.pow(t, 1.15);
        x = piv - d * Math.cos(th);
        z += d * Math.sin(th);
        y += bend.bob * Math.sin(phase + 1.3) * t;
      }
    }
    if (v.flap) z += Math.sign(v.z || 1) * v.flap * (0.55 + 0.45 * Math.sin(phase * 2 + x * 0.25));
    if (v.wave) z += v.wave * Math.sin(phase + x * 0.45);
    // pitch (about the fish's lateral axis), then yaw (about world up)
    let x2 = x * cp - y * sp_, y2 = x * sp_ + y * cp;
    let nx = v.nx * cp - v.ny * sp_, ny = v.nx * sp_ + v.ny * cp, nz = v.nz;
    const X = x2 * cyaw - z * syaw, Z = x2 * syaw + z * cyaw;
    let NX = nx * cyaw - nz * syaw, NZ = nx * syaw + nz * cyaw;
    if (v.thin && NZ < 0) { NX = -NX; NZ = -NZ; ny = -ny; }
    const fx = X * scale + S / 2, fy = S / 2 - y2 * scale;
    const ix = Math.floor(fx), iy = Math.floor(fy);
    if (ix < 0 || iy < 0 || ix >= S || iy >= S) continue;
    const p = iy * S + ix;
    if (Z <= zb[p]) continue;
    zb[p] = Z;
    let s = NX * LIGHT[0] + ny * LIGHT[1] + NZ * LIGHT[2];
    s += (BAYER[(iy & 3) * 4 + (ix & 3)] / 16 - 0.5) * 0.07;
    let lvl = s < -0.12 ? 0 : s < 0.28 ? 1 : s < 0.6 ? 2 : s < 0.86 ? 3 : 4;
    if (v.em) lvl = Math.max(lvl, v.em > 1 ? 3 : 2);
    const col = ramp(v.c)[lvl];
    buf[p * 4] = col[0]; buf[p * 4 + 1] = col[1]; buf[p * 4 + 2] = col[2]; buf[p * 4 + 3] = 255;
  }
  // hole fill: transparent pixel with >=3 opaque 4-neighbours takes a neighbour's colour
  const copy = buf.slice();
  const op = (i) => copy[i * 4 + 3] === 255;
  for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
    const i = y * S + x;
    if (op(i)) continue;
    const ns = [i - 1, i + 1, i - S, i + S].filter(op);
    if (ns.length >= 3) { const n = ns[0] * 4; buf[i * 4] = copy[n]; buf[i * 4 + 1] = copy[n + 1]; buf[i * 4 + 2] = copy[n + 2]; buf[i * 4 + 3] = 255; }
  }
  // selective outline: darken pixels that touch empty space (upper rim stays softer)
  const src = buf.slice();
  const a = (x, y) => (x < 0 || y < 0 || x >= S || y >= S ? 0 : src[(y * S + x) * 4 + 3]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    if (src[i + 3] !== 255) continue;
    const up = !a(x, y - 1), side = !a(x - 1, y) || !a(x + 1, y), down = !a(x, y + 1);
    if (!(up || side || down)) continue;
    const c = [src[i], src[i + 1], src[i + 2]];
    const o = mix(c, [8, 14, 40], up && !side && !down ? 0.38 : 0.62);
    buf[i] = o[0]; buf[i + 1] = o[1]; buf[i + 2] = o[2];
  }
  return { w: S, h: S, data: buf };
}

const cacheKey = (o) => `${Math.round(o.yaw * 20)}|${Math.round(o.pitch * 20)}|${Math.round(o.phase * 10)}|${o.scale}`;
export function toCanvas(spr) {
  const c = document.createElement('canvas');
  c.width = spr.w; c.height = spr.h;
  c.getContext('2d').putImageData(new ImageData(spr.data, spr.w, spr.h), 0, 0);
  return c;
}

export class Fish {
  constructor(species, seed) {
    this.species = species; this.seed = seed;
    this.model = buildModel(species.make(seed));
    this.frames = new Map();
  }
  get size() { return this.model.size; }
  frame(o) {
    const q = { yaw: 0, pitch: 0, phase: 0, scale: 1, ...o };
    // quantise so the cache stays small: 16 yaw, 7 pitch, 8 tail phases
    q.yaw = Math.round(q.yaw / (Math.PI / 8)) * (Math.PI / 8);
    q.pitch = Math.round(clamp(q.pitch, -0.5, 0.5) / 0.15) * 0.15;
    q.phase = Math.round(q.phase / (Math.PI / 4)) * (Math.PI / 4);
    const k = cacheKey(q);
    let f = this.frames.get(k);
    if (!f) { f = toCanvas(renderSprite(this.model, q)); this.frames.set(k, f); }
    return f;
  }
}

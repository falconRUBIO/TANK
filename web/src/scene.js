// Pixel-art scene painter. Everything is drawn at low internal resolution into paired buffers:
//   color  – the albedo the player sees
//   aux    – R: occluder (blocks light)  G: depth (0 near … 1 far)  B: emissive
// The WebGL lighting pass (light.js) reads both, so the pixel art stays chunky while the
// lighting on top of it is modern and smooth.
import { mulberry32, fbm, mix, hex, clamp } from './color.js';

export const W = 216, H = 384;
export const GROUND = 322;                       // average gravel line

const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export class Buf {
  constructor() { this.c = new Uint8ClampedArray(W * H * 4); this.a = new Uint8ClampedArray(W * H * 4); }
  put(x, y, col, occ = 0, depth = 0.5, emis = 0) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    this.c[i] = col[0]; this.c[i + 1] = col[1]; this.c[i + 2] = col[2]; this.c[i + 3] = 255;
    this.a[i] = occ * 255; this.a[i + 1] = depth * 255; this.a[i + 2] = emis * 255; this.a[i + 3] = 255;
  }
  has(x, y) { return x >= 0 && y >= 0 && x < W && y < H && this.c[(y * W + x) * 4 + 3] === 255; }
  canvases() {
    const mk = (d) => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').putImageData(new ImageData(d, W, H), 0, 0); return c; };
    return { color: mk(this.c), aux: mk(this.a) };
  }
}

// Shade a boolean mask like a lit chunk of stone: bright top rims, soft left light, dark right/bottom.
function paintMask(buf, mask, colorFn, { occ = 1, depth = 0.5, rim = 1 } = {}) {
  const m = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!mask[y * W + x]) continue;
    let c = colorFn(x, y);
    const up = !m(x, y - 1), up2 = !m(x, y - 2), left = !m(x - 1, y), right = !m(x + 1, y), down = !m(x, y + 1);
    if (up) c = mix(c, [255, 244, 210], 0.34 * rim);
    else if (up2) c = mix(c, [255, 244, 210], 0.14 * rim);
    if (left && !up) c = mix(c, [255, 244, 210], 0.14 * rim);
    if (right) c = mix(c, [10, 22, 48], 0.34 * rim);
    if (down) c = mix(c, [10, 22, 48], 0.45 * rim);
    buf.put(x, y, c, occ, depth);
  }
}
const newMask = () => new Uint8Array(W * H);

// ── water backdrop ──
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function paintWater() {
  const b = new Buf();
  const top = hex(0x4f8db0), mid = hex(0x2a5a7d), deep = hex(0x13304a);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5;
    const k = clamp(y / H * 1.1 + d * 0.07);
    const n = fbm(x * 0.03, y * 0.05, 3) - 0.5;
    const kk = clamp(k + n * 0.16);
    b.put(x, y, kk < 0.5 ? mix(top, mid, kk * 2) : mix(mid, deep, (kk - 0.5) * 2), 0, 1.0);
  }
  return b.canvases();
}

// ── stone (brick coursing, moss) ──
function stoneColor(base, seed, mossy = 0.6) {
  return (x, y) => {
    const course = Math.floor(y / 6), off = (course & 1) * 5;
    const col = Math.floor((x + off) / 10);
    const mortar = y % 6 === 0 || (x + off) % 10 === 0;
    const t = hash(col, course, seed);
    let c = mix(base, [t < 0.5 ? 70 : 150, t < 0.5 ? 80 : 160, t < 0.5 ? 82 : 150], Math.abs(t - 0.5) * 0.35);
    if (mortar) c = mix(c, [30, 40, 44], 0.45);
    else if ((x + off) % 10 === 1 || y % 6 === 1) c = mix(c, [210, 218, 205], 0.12);
    const n = fbm(x * 0.12, y * 0.09, seed);
    if (n > 0.6 - mossy * 0.1) c = mix(c, hex(0x4e8a38), clamp((n - 0.55) * 3.2));
    if (hash(x, y, seed + 9) > 0.93) c = mix(c, [20, 30, 34], 0.25);
    return c;
  };
}

function ruinMask(opts) {
  const m = newMask();
  const { lp, rp, lintelY, lintelH, top, base, arch } = opts;
  for (let y = 0; y < base; y++) for (let x = 0; x < W; x++) {
    const jag = fbm(x * 0.2, 1, opts.seed) * 14;
    let solid = false;
    if (x >= lp[0] && x <= lp[1] && y >= top + jag) solid = true;
    if (x >= rp[0] && x <= rp[1] && y >= opts.rtop + jag * 1.4) solid = true;
    if (y >= lintelY && y <= lintelY + lintelH && x >= lp[0] && x <= rp[1] && y >= top + jag * 0.6 - 4 + (x - lp[0]) * 0.12) solid = true;
    if (arch) {
      const [ax, ay, rx, ry] = arch;
      const inside = y < ay ? ((x - ax) / rx) ** 2 + ((y - ay) / ry) ** 2 < 1 : x > lp[1] && x < rp[0];
      if (inside && y > lintelY + lintelH - 6) solid = false;
    }
    if (solid) m[y * W + x] = 1;
  }
  return m;
}

function blob(mask, cx, cy, rx, ry, seed, flatBottom = true) {
  for (let y = Math.floor(cy - ry - 4); y <= cy + ry + 4; y++) for (let x = Math.floor(cx - rx - 4); x <= cx + rx + 4; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    const r = 1 + (fbm(x * 0.2, y * 0.2, seed) - 0.5) * 0.45;
    if (dx * dx + dy * dy < r * r && (!flatBottom || y < cy + ry * 0.55)) mask[y * W + x] = 1;
  }
}
function rockColor(cx, cy, rx, ry, base, seed) {
  return (x, y) => {
    const nx = (x - cx) / rx, ny = (y - cy) / ry;
    const l = clamp(0.5 - nx * 0.28 - ny * 0.42);
    let c = mix(mix(base, [18, 28, 36], 0.55), mix(base, [215, 220, 205], 0.35), l);
    const n = fbm(x * 0.4, y * 0.4, seed);
    c = mix(c, [24, 34, 38], clamp((0.45 - n) * 1.3));
    if (n > 0.64) c = mix(c, hex(0x56903c), 0.5);
    if (hash(x, y, seed) > 0.95) c = mix(c, [235, 235, 220], 0.2);
    return c;
  };
}

function vines(buf, mask, seed, count, depth) {
  const r = mulberry32(seed);
  const xs = [];
  for (let x = 0; x < W; x++) for (let y = 1; y < H; y++) if (mask[y * W + x] && !mask[(y - 1) * W + x]) { xs.push([x, y]); break; }
  for (let i = 0; i < count; i++) {
    const [x, y] = xs[(r() * xs.length) | 0] || [0, 0];
    const len = 4 + r() * 16;
    for (let k = 0; k < len; k++) {
      const px = x + Math.round(Math.sin(k * 0.5 + i) * 1.2), py = y + k;
      if (buf.has(px, py) && mask[py * W + px] === 0 && k > 1) continue;
      const c = mix(hex(0x3f7a30), hex(0x8ec04a), (1 - k / len) * 0.5);
      if (!mask[py * W + px]) buf.put(px, py, c, 0.25, depth);
      if (k % 4 === 2) buf.put(px + 1, py, mix(c, [200, 230, 110], 0.25), 0.2, depth);
    }
  }
}

export function paintBackStatic() {
  const b = new Buf();
  // far ruins: pale, hazy
  {
    const m = ruinMask({ lp: [128, 146], rp: [176, 198], lintelY: 168, lintelH: 14, top: 160, rtop: 200, base: GROUND - 8, seed: 21, arch: [161, 214, 15, 46] });
    paintMask(b, m, stoneColor(hex(0x5c7b92), 4, 0.2), { occ: 0.55, depth: 0.92, rim: 0.55 });
    const m2 = newMask();
    for (let y = 250; y < GROUND - 8; y++) for (let x = 100; x < 116; x++) if (y > 252 + fbm(x * 0.3, 2, 5) * 16) m2[y * W + x] = 1;
    paintMask(b, m2, stoneColor(hex(0x587890), 7, 0.2), { occ: 0.5, depth: 0.95, rim: 0.5 });
    // distant kelp
    for (let k = 0; k < 7; k++) for (let s = 0; s < 70 + k * 6; s++) b.put(8 + k * 28 + Math.round(Math.sin(s * 0.07 + k) * 3), GROUND - 6 - s, mix(hex(0x2f6a52), hex(0x1d4a5a), s / 120), 0.15, 0.93);
  }
  // main ruin: big arch on the left
  const RM = ruinMask({ lp: [0, 34], rp: [88, 118], lintelY: 112, lintelH: 24, top: 96, rtop: 168, base: GROUND + 14, seed: 11, arch: [61, 168, 29, 58] });
  paintMask(b, RM, stoneColor(hex(0x8d968d), 3), { occ: 1, depth: 0.6 });
  vines(b, RM, 5, 22, 0.6);
  // broken column
  const CM = newMask();
  for (let y = 262; y < GROUND + 12; y++) for (let x = 142; x < 166; x++) if (y > 262 + fbm(x * 0.4, 5, 2) * 18) CM[y * W + x] = 1;
  paintMask(b, CM, stoneColor(hex(0x7f8a85), 8), { occ: 1, depth: 0.62 });
  vines(b, CM, 6, 6, 0.62);
  // rocks
  const rocks = [[104, GROUND + 4, 22, 16, 31, 0x6f7a78], [186, GROUND + 8, 26, 20, 32, 0x77817c], [12, GROUND + 10, 26, 18, 33, 0x6a7673], [128, GROUND + 14, 12, 8, 34, 0x7b8480]];
  for (const [cx, cy, rx, ry, seed, base] of rocks) {
    const m = newMask(); blob(m, cx, cy, rx, ry, seed);
    paintMask(b, m, rockColor(cx, cy, rx, ry, hex(base), seed), { occ: 1, depth: 0.55 });
  }
  // driftwood
  {
    const pts = [[-6, GROUND + 24], [22, GROUND + 6], [50, GROUND - 14], [82, GROUND - 24], [112, GROUND - 14], [138, GROUND + 6], [166, GROUND + 16]];
    const m = newMask();
    const seg = [];
    for (let i = 0; i < pts.length - 1; i++) for (let t = 0; t < 1; t += 0.02) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const tt = t, t2 = tt * tt, t3 = t2 * tt;
      const px = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * tt + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const py = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * tt + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      seg.push([px, py, 8.5 - (i + t) * 0.9]);
    }
    for (const [px, py, r] of seg) for (let y = Math.floor(py - r); y <= py + r; y++) for (let x = Math.floor(px - r); x <= px + r; x++) if ((x - px) ** 2 + (y - py) ** 2 <= r * r && x >= 0 && x < W && y >= 0 && y < H) m[y * W + x] = 1;
    // side branches
    for (const [bx, by, ex, ey, r] of [[60, GROUND - 22, 52, GROUND - 52, 3.4], [96, GROUND - 22, 110, GROUND - 50, 3], [110, GROUND - 14, 128, GROUND - 32, 2.6]]) {
      for (let t = 0; t <= 1; t += 0.03) { const px = bx + (ex - bx) * t, py = by + (ey - by) * t; const rr = r * (1 - t * 0.6); for (let y = Math.floor(py - rr); y <= py + rr; y++) for (let x = Math.floor(px - rr); x <= px + rr; x++) if ((x - px) ** 2 + (y - py) ** 2 <= rr * rr) m[y * W + x] = 1; }
    }
    paintMask(b, m, (x, y) => {
      const grain = fbm(x * 0.9, y * 0.18, 12);
      let c = mix(hex(0x3a2616), hex(0x7a5232), grain);
      if (hash(x, y, 3) > 0.9) c = mix(c, hex(0xb08454), 0.4);
      if (fbm(x * 0.15, y * 0.15, 40) > 0.68) c = mix(c, hex(0x4a8a3a), 0.55);
      return c;
    }, { occ: 1, depth: 0.5, rim: 1.1 });
  }
  // gravel bed
  {
    const m = newMask();
    for (let x = 0; x < W; x++) { const h = Math.round(GROUND + 20 + Math.sin(x * 0.05) * 3 + fbm(x * 0.1, 7, 7) * 5); for (let y = h; y < H; y++) m[y * W + x] = 1; }
    paintMask(b, m, (x, y) => {
      const n = hash(x >> 1, y >> 1, 77);
      let c = mix(hex(0xd4be94), hex(0x9c8a68), clamp((y - GROUND - 20) / 28));
      if (n > 0.8) c = mix(c, hex(0x5b5148), 0.6); else if (n < 0.2) c = mix(c, hex(0xe8d8b0), 0.55); else if (n > 0.6) c = mix(c, hex(0x8a6c4c), 0.4);
      return c;
    }, { occ: 1, depth: 0.5, rim: 0.7 });
  }
  // stone lantern (emissive window)
  {
    const lx = 176, ly = GROUND + 16;
    const lm = newMask();
    const rect = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) lm[y * W + x] = 1; };
    rect(lx - 9, ly - 4, lx + 9, ly);            // base
    rect(lx - 3, ly - 22, lx + 3, ly - 4);       // pillar
    rect(lx - 9, ly - 40, lx + 9, ly - 22);      // lamp box
    for (let k = 0; k < 6; k++) rect(lx - 14 + k * 1, ly - 46 + (5 - k) * 1, lx + 14 - k * 1, ly - 40 - (5 - k) * 0 - (5 - k) + 1); // roof
    rect(lx - 3, ly - 52, lx + 3, ly - 46);      // cap
    paintMask(b, lm, stoneColor(hex(0x7f8a85), 14, 0.9), { occ: 1, depth: 0.45 });
    for (let y = ly - 37; y < ly - 25; y++) for (let x = lx - 5; x < lx + 5; x++) {
      const e = 1 - Math.abs(y - (ly - 31)) / 7;
      b.put(x, y, mix(hex(0xff9a2e), hex(0xffe9a8), clamp(e)), 0, 0.45, 1);
    }
  }
  return { ...b.canvases(), lamp: [176, GROUND - 15] };
}

export function paintFrontStatic() {
  const b = new Buf();
  const r = mulberry32(5);
  // foreground pebbles + stones
  for (let i = 0; i < 26; i++) {
    const cx = r() * W, cy = H - 6 + r() * 10, rx = 3 + r() * 7, ry = 2 + r() * 3.5;
    const m = newMask(); blob(m, cx, cy, rx, ry, 100 + i, false);
    paintMask(b, m, rockColor(cx, cy, rx, ry, mix(hex(0x6a645a), hex(0xa09070), r()), 100 + i), { occ: 0.7, depth: 0.04 });
  }
  const m = newMask(); blob(m, 22, H - 10, 34, 20, 201, true); blob(m, 190, H - 8, 26, 14, 202, true);
  paintMask(b, m, rockColor(22, H - 10, 34, 20, hex(0x77817c), 201), { occ: 1, depth: 0.05 });
  return b.canvases();
}

// ── animated plants (drawn per frame to both color + aux contexts) ──
export function drawPlants(ctxC, ctxA, t, layer) {
  const dot = (x, y, c, occ, depth) => {
    x = Math.round(x); y = Math.round(y);
    ctxC.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; ctxC.fillRect(x, y, 1, 1);
    ctxA.fillStyle = `rgb(${(occ * 255) | 0},${(depth * 255) | 0},0)`; ctxA.fillRect(x, y, 1, 1);
  };
  const back = layer === 'back';
  const depth = back ? 0.58 : 0.12;
  const occ = back ? 0.22 : 0.3;
  const shade = (c, k) => back ? mix(c, [14, 40, 60], 0.28 * (1 - k)) : c;
  // vallisneria blades
  const grass = back
    ? [[40, GROUND + 8, 120], [118, GROUND + 14, 100], [140, GROUND + 6, 130], [200, GROUND + 4, 110], [8, GROUND + 18, 90]]
    : [[8, H - 4, 82], [30, H - 2, 56], [96, H - 2, 44], [150, H - 4, 70], [206, H - 6, 90], [180, H - 2, 50]];
  grass.forEach(([x0, y0, hgt], gi) => {
    for (let b = 0; b < 6; b++) {
      const lean = (b - 2.5) * 5.5 + Math.sin(gi * 2.1) * 4, ph = gi * 1.7 + b * 0.9, len = hgt * (0.7 + 0.3 * hashf(gi, b));
      const col = mix(hex(0x3f8a34), hex(0x9ac84a), hashf(gi + 3, b));
      for (let s = 0; s < len; s++) {
        const k = s / len;
        const sway = Math.sin(t * 0.85 + ph + k * 2.6) * 6.5 * k * k + Math.sin(t * 1.9 + ph * 2) * 0.8 * k;
        const px = x0 + lean * k + sway + b * 1.7, py = y0 - s;
        const w = k < 0.85 ? 2 : 1;
        for (let q = 0; q < w; q++) {
          const lit = q === 0 ? 0.28 : 0;
          dot(px + q, py, shade(mix(mix(col, [255, 240, 150], lit), [10, 40, 30], 0.25 * (1 - k)), k), occ, depth);
        }
      }
    }
  });
  // broad sword leaves + red stem plants (back only has red; front gets big sword)
  const sword = back ? [[62, GROUND + 22, 0], [148, GROUND + 22, 1]] : [[52, H - 6, 2], [170, H - 4, 3]];
  sword.forEach(([x0, y0, si]) => {
    for (let l = 0; l < 7; l++) {
      const ang = -Math.PI / 2 + (l - 3) * 0.36, len = (back ? 44 : 58) - Math.abs(l - 3) * 4;
      const ph = si * 2 + l;
      for (let s = 0; s < len; s++) {
        const k = s / len;
        const bend = k * k * 0.9 * Math.sign(l - 3 || 1);
        const a = ang + bend + Math.sin(t * 0.7 + ph) * 0.05 * k;
        const px = x0 + Math.cos(a) * s * 0.62 * 1.3, py = y0 + Math.sin(a) * s * 1.0 - k * k * 6;
        const wdt = Math.sin(Math.PI * Math.min(1, k * 1.15)) ** 0.8 * (back ? 3.4 : 4.4);
        for (let q = -wdt; q <= wdt; q++) {
          const edge = Math.abs(q) / (wdt + 0.1);
          let c = mix(hex(0x2f7a2c), hex(0x8cc443), 1 - edge);
          if (Math.abs(q) < 0.6) c = mix(c, [220, 245, 150], 0.5);
          if (q < -wdt * 0.5) c = mix(c, [255, 240, 150], 0.2);
          dot(px + q, py, shade(mix(c, [8, 30, 40], 0.2 * (1 - k)), k), occ + 0.1, depth);
        }
      }
    }
  });
  if (back) {
    // red stem plants
    [[78, GROUND + 18], [188, GROUND + 14], [172, GROUND + 16]].forEach(([x0, y0], ri) => {
      const hgt = 56 + ri * 10;
      for (let s = 0; s < hgt; s++) {
        const k = s / hgt, sway = Math.sin(t * 0.8 + ri * 2 + k * 2) * 4 * k * k;
        const px = x0 + sway, py = y0 - s;
        dot(px, py, mix(hex(0x7a1e2a), hex(0xd8454a), k), 0.25, depth);
        if (s % 3 === 0) for (let q = 1; q < 6 * (1 - k * 0.6); q++) { const c = mix(hex(0xb83040), hex(0xff7a5a), (q / 6) * 0.6); dot(px - q, py - q * 0.3, c, 0.25, depth); dot(px + q, py - q * 0.3, c, 0.25, depth); }
      }
    });
  }
}
const hashf = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };

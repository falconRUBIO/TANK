// Tank preview: low-res pixel scene (fixed side view, parallax layers, light rays) with
// steering-driven fish that turn through the voxel yaw frames.
import { Fish } from './voxel.js';
import { SPECIES } from './species.js';
import { mulberry32, fbm, mix, hex } from './color.js';

const W = 195, H = 400;                    // internal pixel resolution (scaled up by CSS)
const cv = document.getElementById('tank');
cv.width = W; cv.height = H;
const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
const rng = mulberry32(42);

// ── static backdrop, rendered once to an offscreen canvas ──
function pix(ctx, x, y, c, a = 1) { ctx.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; ctx.fillRect(x, y, 1, 1); }
function makeLayer(draw) { const c = document.createElement('canvas'); c.width = W; c.height = H; draw(c.getContext('2d')); return c; }
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const water = makeLayer((c) => {
  const top = hex(0x3f7aa0), mid = hex(0x1f4766), deep = hex(0x0f2438);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = y / H, d = BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5;
    const k = Math.min(1, Math.max(0, t * 1.15 + d * 0.06));
    pix(c, x, y, k < 0.5 ? mix(top, mid, k * 2) : mix(mid, deep, (k - 0.5) * 2));
  }
});

function ruin(ctx, x0, base, w, h, col, seed) {
  const r = mulberry32(seed);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = x0 + x, py = base - y;
    const arch = Math.hypot(x - w / 2, (y - h * 0.45) * 0.9) < w * 0.22 && y < h * 0.7;
    if (arch) continue;
    const inCol = x < w * 0.2 || x > w * 0.8;
    const lintel = y > h * 0.68 && y < h * 0.88;
    if (!(inCol || lintel || y < h * 0.12)) continue;
    const brick = (Math.floor((y + (Math.floor(x / 7) & 1) * 2) / 5) + Math.floor(x / 7)) & 1;
    const n = fbm(x * 0.3, y * 0.3, seed) ;
    let c = mix(col, [20, 40, 60], 0.15 + brick * 0.12);
    if (n > 0.62) c = mix(c, hex(0x4f7d3c), 0.55);   // moss
    pix(ctx, px, py, c);
  }
}
const farRuins = makeLayer((c) => {
  ruin(c, 100, 330, 80, 150, hex(0x2d4b63), 3); ruin(c, -8, 340, 60, 110, hex(0x2a465d), 9);
});
const midRuins = makeLayer((c) => { ruin(c, 10, 345, 96, 150, hex(0x56706f), 5); });

function drawPlants(ctx, t, layer) {
  const defs = layer === 'back'
    ? [[22, 340, 70, hex(0x3f6e3a)], [120, 345, 90, hex(0x35603a)], [170, 340, 60, hex(0x3f6e3a)]]
    : [[8, 392, 80, hex(0x62a03c)], [48, 396, 50, hex(0x7bb53e)], [150, 394, 95, hex(0x6aa83a)], [185, 398, 55, hex(0xb83a35)], [172, 396, 60, hex(0xc4423b)]];
  defs.forEach(([x, y, hgt, col], pi) => {
    for (let b = 0; b < 5; b++) {
      const lean = (b - 2) * 5, ph = pi * 1.7 + b;
      for (let s = 0; s < hgt; s++) {
        const k = s / hgt;
        const sway = Math.sin(t * 0.9 + ph + k * 2.4) * 5 * k * k;
        const px = Math.round(x + lean * k + sway + b * 1.5), py = Math.round(y - s);
        const lit = (s % 7 < 3) ? 0.2 : 0;
        const c = mix(col, [255, 240, 150], lit * k + 0.12);
        pix(ctx, px, py, mix(c, [10, 30, 50], 0.5 * (1 - k) * (layer === 'back' ? 0.9 : 0.2)));
        if (layer === 'front' || s % 3 === 0) pix(ctx, px + 1, py, mix(c, [10, 30, 50], 0.35));
      }
    }
  });
}

const ground = makeLayer((c) => {
  for (let y = 360; y < H; y++) for (let x = 0; x < W; x++) {
    const hgt = 372 + Math.sin(x * 0.07) * 3 + fbm(x * 0.12, 2, 1) * 4;
    if (y < hgt) continue;
    const n = fbm(x * 0.5, y * 0.5, 7);
    let col = mix(hex(0xb8a78b), hex(0x7e6f55), (y - hgt) / 28);
    if (n > 0.66) col = mix(col, hex(0x44504f), 0.7); else if (n < 0.34) col = mix(col, hex(0xe0cfa8), 0.5);
    pix(c, x, y, mix(col, [14, 36, 58], 0.35));
  }
});

// ── fish ──
const fishes = [];
function addFish(id, seed, x, y, scale, depth, speed) {
  const f = new Fish(SPECIES[id], seed);
  fishes.push({ f, x, y, vx: speed * (rng() < 0.5 ? -1 : 1), vy: 0, tx: x, ty: y, scale, depth, speed, phase: rng() * 6, face: 0, turn: 0, dir: 1, retarget: 0 });
}
addFish('goldfish', 1, 80, 180, 1, 1, 14);
addFish('blue', 2, 140, 130, 1, 0.9, 12);
addFish('angelfish', 3, 150, 250, 1, 0.8, 9);
for (let i = 0; i < 4; i++) addFish('neon', 4 + i, 70 + i * 8, 230 + (i % 2) * 8, 1, 1, 17);
addFish('cory', 9, 90, 350, 1, 1, 8);
addFish('goldfish', 5, 60, 290, 0.78, 1, 12);

function steer(o, dt, t) {
  const bottom = o.f.species.id === 'cory';
  o.retarget -= dt;
  if (o.retarget <= 0 || Math.hypot(o.tx - o.x, o.ty - o.y) < 8) {
    o.tx = 22 + rng() * (W - 44);
    o.ty = bottom ? 352 + rng() * 14 : 70 + rng() * 250;
    o.retarget = 3 + rng() * 5;
  }
  const dx = o.tx - o.x, dy = o.ty - o.y, d = Math.hypot(dx, dy) || 1;
  const sp = o.speed * (d < 30 ? 0.4 + d / 50 : 1);
  o.vx += (dx / d * sp - o.vx) * Math.min(1, dt * 1.6);
  o.vy += (dy / d * sp * 0.5 - o.vy) * Math.min(1, dt * 1.6);
  o.x += o.vx * dt; o.y += o.vy * dt;
  // facing: flip through the voxel yaw frames instead of snapping
  const want = o.vx >= 0 ? 0 : Math.PI;
  if (Math.abs(o.vx) > 2) {
    let diff = want - o.face;
    if (Math.abs(diff) > 1e-3) { o.face += Math.sign(diff) * Math.min(Math.abs(diff), dt * 5.5); }
  }
  o.phase += dt * (2.5 + Math.hypot(o.vx, o.vy) * 0.28);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
  g.clearRect(0, 0, W, H);
  g.drawImage(water, 0, 0);
  g.globalAlpha = 0.9; g.drawImage(farRuins, 0, 0); g.globalAlpha = 1;
  // light rays
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const x0 = 30 + i * 38 + Math.sin(t * 0.25 + i) * 6;
    g.fillStyle = `rgba(241,213,154,${0.035 + 0.015 * Math.sin(t * 0.5 + i * 2)})`;
    g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + 14, 0); g.lineTo(x0 - 40 + i * 6, 330); g.lineTo(x0 - 70 + i * 6, 330); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  g.drawImage(midRuins, 0, 0);
  drawPlants(g, t, 'back');
  g.drawImage(ground, 0, 0);
  // fish sorted by depth
  fishes.forEach((o) => steer(o, dt, t));
  for (const o of fishes) {
    const sp = o.f.frame({ yaw: o.face, pitch: Math.max(-0.45, Math.min(0.45, -Math.atan2(o.vy, Math.abs(o.vx) + 6) * (o.vx >= 0 ? -1 : 1) * -1)), phase: o.phase, scale: o.scale });
    g.drawImage(sp, Math.round(o.x - sp.width / 2), Math.round(o.y - sp.height / 2));
  }
  drawPlants(g, t, 'front');
  // surface shimmer + particles
  g.fillStyle = 'rgba(200,235,255,0.25)';
  for (let x = 0; x < W; x += 3) { const y = 3 + Math.round(Math.sin(x * 0.2 + t * 1.5) * 1.5 + Math.sin(x * 0.07 - t)); g.fillRect(x, y, 2, 1); }
  for (let i = 0; i < 40; i++) {
    const px = (i * 53.7 + Math.sin(t * 0.2 + i) * 6) % W, py = (i * 91.3 + t * (2 + (i % 3))) % H;
    g.fillStyle = 'rgba(210,235,255,0.35)'; g.fillRect(Math.round(px), Math.round(py), 1, 1);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__tank = { fishes };

// Main loop: layered pixel scene + steering fish -> WebGL lighting.
import { Fish } from './voxel.js';
import { SPECIES } from './species.js';
import { mulberry32 } from './color.js';
import { W, H, GROUND, paintWater, paintBackStatic, paintFrontStatic, drawPlants } from './scene.js';
import { Lighting } from './light.js';

const rng = mulberry32(42);
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
const [cvC, gC] = mk(), [cvA, gA] = mk();

const water = paintWater(), back = paintBackStatic(), front = paintFrontStatic();

// ── time of day presets ──
const TOD = {
  morning:   { sun: [W * 0.22, -100], sunCol: [0.80, 0.92, 1.0], sunI: 0.95, beamI: 0.5, causI: 0.9, amb: [0.42, 0.56, 0.72], fog: [0.17, 0.37, 0.52], fogI: 1, lampI: 0.0, lampCol: [1, 0.62, 0.28], night: 0, bloom: 0.5, exposure: 0.95, tint: [0.97, 1.0, 1.04] },
  afternoon: { sun: [W * 0.60, -120], sunCol: [1.0, 0.86, 0.58], sunI: 1.25, beamI: 0.62, causI: 1.15, amb: [0.40, 0.54, 0.70], fog: [0.15, 0.33, 0.48], fogI: 1, lampI: 0.12, lampCol: [1, 0.62, 0.28], night: 0, bloom: 0.55, exposure: 0.98, tint: [1.02, 1.0, 0.98] },
  evening:   { sun: [W * 0.95, -35], sunCol: [1.0, 0.52, 0.26], sunI: 1.05, beamI: 0.6, causI: 0.8, amb: [0.42, 0.34, 0.5], fog: [0.24, 0.17, 0.33], fogI: 1, lampI: 1.0, lampCol: [1, 0.62, 0.28], night: 0.25, bloom: 0.7, exposure: 0.95, tint: [1.04, 0.98, 1.0] },
  night:     { sun: [W * 0.45, -120], sunCol: [0.45, 0.58, 1.0], sunI: 0.22, beamI: 0.28, causI: 0.55, amb: [0.17, 0.26, 0.45], fog: [0.03, 0.07, 0.15], fogI: 1, lampI: 2.6, lampCol: [1, 0.66, 0.32], night: 1, bloom: 1.0, exposure: 1.18, tint: [0.96, 1.0, 1.06] },
};
const cur = structuredClone(TOD.afternoon);
let target = 'afternoon';
const qs = new URLSearchParams(location.search);
if (TOD[qs.get('tod')]) { target = qs.get('tod'); Object.assign(cur, structuredClone(TOD[target])); }
const lerp = (a, b, k) => (Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], k)) : a + (b - a) * k);
export function setTod(name) { if (TOD[name]) { target = name; document.querySelectorAll('[data-tod]').forEach((b) => b.classList.toggle('on', b.dataset.tod === name)); } }
window.__setTod = setTod;

const canvas = document.getElementById('tank');
const light = new Lighting(canvas, W, H, 3);
cur.lamp = back.lamp;

// ── fish ──
const sil = new WeakMap();
function silhouette(fr, depth) {
  let s = sil.get(fr);
  if (!s) { s = document.createElement('canvas'); s.width = fr.width; s.height = fr.height; const g = s.getContext('2d'); g.drawImage(fr, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = `rgb(0,${depth * 255 | 0},0)`; g.fillRect(0, 0, s.width, s.height); sil.set(fr, s); }
  return s;
}
const fishes = [];
function addFish(id, seed, x, y, scale, speed, band) {
  const f = new Fish(SPECIES[id], seed);
  fishes.push({ f, x, y, vx: speed * (rng() < 0.5 ? -1 : 1), vy: 0, tx: x, ty: y, scale, speed, phase: rng() * 6, face: 0, retarget: 0, band, id });
}
addFish('goldfish', 1, 100, 190, 1, 14, [60, 280]);
addFish('blue', 2, 150, 140, 1, 12, [50, 250]);
addFish('angelfish', 3, 130, 240, 1, 9, [80, 300]);
const school = [];
for (let i = 0; i < 5; i++) addFish('neon', 4 + i, 80 + i * 7, 215 + (i % 2) * 7, 1, 17, [150, 290]);
addFish('cory', 9, 100, GROUND + 12, 1, 8, [GROUND + 8, GROUND + 20]);
addFish('goldfish', 5, 60, 290, 0.8, 12, [100, 300]);

function steer(o, dt) {
  o.retarget -= dt;
  if (o.retarget <= 0 || Math.hypot(o.tx - o.x, o.ty - o.y) < 8) {
    o.tx = 26 + rng() * (W - 52); o.ty = o.band[0] + rng() * (o.band[1] - o.band[0]);
    o.retarget = 3 + rng() * 5;
  }
  // neon tetras school loosely toward the group's centre
  if (o.id === 'neon') { const n = fishes.filter((f) => f.id === 'neon'); const cx = n.reduce((s, f) => s + f.x, 0) / n.length, cy = n.reduce((s, f) => s + f.y, 0) / n.length; o.tx = o.tx * 0.995 + cx * 0.005; o.ty = o.ty * 0.995 + cy * 0.005; }
  const dx = o.tx - o.x, dy = o.ty - o.y, d = Math.hypot(dx, dy) || 1;
  const sp = o.speed * (d < 30 ? 0.4 + d / 50 : 1);
  o.vx += (dx / d * sp - o.vx) * Math.min(1, dt * 1.6);
  o.vy += (dy / d * sp * 0.5 - o.vy) * Math.min(1, dt * 1.6);
  o.x += o.vx * dt; o.y += o.vy * dt;
  const want = o.vx >= 0 ? 0 : Math.PI;
  if (Math.abs(o.vx) > 2) { const diff = want - o.face; if (Math.abs(diff) > 1e-3) o.face += Math.sign(diff) * Math.min(Math.abs(diff), dt * 8); }
  o.phase += dt * (2.5 + Math.hypot(o.vx, o.vy) * 0.28);
}

// ── bubbles from the air stone ──
const bubbles = [];
function bubbleStep(dt, t) {
  if (Math.random() < dt * 3) bubbles.push({ x: 96 + Math.random() * 4, y: GROUND + 14, r: Math.random() < 0.3 ? 2 : 1, s: 16 + Math.random() * 16, ph: Math.random() * 6 });
  for (const b of bubbles) { b.y -= b.s * dt; b.x += Math.sin(t * 3 + b.ph) * 4 * dt; }
  while (bubbles.length && bubbles[0].y < 6) bubbles.shift();
}
function drawBubbles() {
  for (const b of bubbles) {
    const x = Math.round(b.x), y = Math.round(b.y);
    gC.fillStyle = 'rgb(190,225,245)'; gA.fillStyle = 'rgb(0,100,60)';
    if (b.r === 1) { gC.fillRect(x, y, 2, 2); gA.fillRect(x, y, 2, 2); gC.fillStyle = 'rgb(255,255,255)'; gC.fillRect(x, y, 1, 1); }
    else { gC.fillRect(x - 1, y, 4, 3); gC.fillRect(x, y - 1, 2, 5); gA.fillRect(x - 1, y - 1, 4, 5); gC.fillStyle = 'rgb(255,255,255)'; gC.fillRect(x, y, 1, 1); }
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
  // ease lighting toward the target preset
  const tg = TOD[target], k = Math.min(1, dt * 2.2);
  for (const key of Object.keys(tg)) cur[key] = lerp(cur[key], tg[key], k);

  gC.clearRect(0, 0, W, H); gA.clearRect(0, 0, W, H);
  gC.drawImage(water.color, 0, 0); gA.drawImage(water.aux, 0, 0);
  gC.drawImage(back.color, 0, 0); gA.drawImage(back.aux, 0, 0);
  drawPlants(gC, gA, t, 'back');
  fishes.forEach((o) => steer(o, dt));
  for (const o of fishes) {
    const fr = o.f.frame({ yaw: o.face, pitch: -Math.max(-0.45, Math.min(0.45, Math.atan2(o.vy, Math.abs(o.vx) + 6))) * (o.vx >= 0 ? 1 : -1) * -1, phase: o.phase, scale: o.scale });
    const px = Math.round(o.x - fr.width / 2), py = Math.round(o.y - fr.height / 2);
    gC.drawImage(fr, px, py); gA.drawImage(silhouette(fr, 0.32), px, py);
  }
  bubbleStep(dt, t); drawBubbles();
  drawPlants(gC, gA, t, 'front');
  gC.drawImage(front.color, 0, 0); gA.drawImage(front.aux, 0, 0);
  // marine snow
  for (let i = 0; i < 46; i++) {
    const px = ((i * 53.7 + Math.sin(t * 0.2 + i) * 7) % W + W) % W, py = (i * 91.3 + t * (2 + (i % 3))) % H;
    gC.fillStyle = 'rgb(200,225,240)'; gC.fillRect(Math.round(px), Math.round(py), 1, 1);
    gA.fillStyle = 'rgb(0,90,30)'; gA.fillRect(Math.round(px), Math.round(py), 1, 1);
  }
  light.render(cvC, cvA, cur, t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.querySelectorAll('[data-tod]').forEach((b) => b.addEventListener('click', () => setTod(b.dataset.tod)));
setTod(target);
window.__tank = { fishes };

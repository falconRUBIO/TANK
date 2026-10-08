import { Fish } from './voxel.js';
import { SPECIES } from './species.js';

const out = document.getElementById('out');
function canvasFor(w, h, scale) {
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  c.style.width = c.width + 'px'; c.style.height = c.height + 'px';
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  return [c, g];
}
function strip(title, items, scale) {
  const wrap = document.createElement('div');
  const t = document.createElement('div'); t.className = 'cap'; t.textContent = title; wrap.append(t);
  const s = document.createElement('div'); s.className = 'strip';
  for (const it of items) {
    const [c, g] = canvasFor(it.f.width, it.f.height, scale);
    g.drawImage(it.f, 0, 0, c.width, c.height);
    s.append(c);
  }
  wrap.append(s);
  return wrap;
}
const P = Math.PI;
for (const sp of Object.values(SPECIES)) {
  const row = document.createElement('div'); row.className = 'row';
  const h = document.createElement('h2'); h.textContent = sp.label; row.append(h);
  const fish = new Fish(sp, 1);
  row.append(strip('side view ×6', [{ f: fish.frame({ yaw: 0, phase: 0 }) }], 6));
  row.append(strip('turning (yaw 0 → 360, ×2)', Array.from({ length: 16 }, (_, i) => ({ f: fish.frame({ yaw: i * P / 8 }) })), 2));
  row.append(strip('tail cycle ×3', Array.from({ length: 8 }, (_, i) => ({ f: fish.frame({ phase: i * P / 4 }) })), 3));
  row.append(strip('pitch ×3', [-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45].map((p) => ({ f: fish.frame({ pitch: p }) })), 3));
  row.append(strip('individuals (seeds) ×3', [1, 2, 3, 4, 5, 6].map((s) => ({ f: new Fish(sp, s).frame({}) })), 3));
  row.append(strip('growth: baby / juvenile / adult ×3', [0.55, 0.78, 1].map((s) => ({ f: fish.frame({ scale: s }) })), 3));
  out.append(row);
}

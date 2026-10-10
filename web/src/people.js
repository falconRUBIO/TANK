// Caretakers drawn the way the octopus and the fish are: a small voxel model (rounded normals, toon shading, the soft dark outline) rasterised to pixel art.
// A head-and-shoulders bust, built from simple shapes and painted per voxel: face, hair style, hat, top and an extra.
import { Fish } from './voxel.js';
import { normAvatar } from './game/avatar.js';

const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const dark = (c, k) => mix(c, [20, 18, 34], k), light = (c, k) => mix(c, [255, 255, 255], k);
const se = (x, y, z, rx, ry, rz, p) => Math.abs(x / rx) ** p + Math.abs(y / ry) ** p + Math.abs(z / rz) ** p;
const hsh = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

const HY = 9, RX = 10, RY = 10.5, RZ = 9.5;                   // head centre and size, in voxels
function inHeadAt(x, y, z, g = 0) { const dy = y - HY, t = Math.max(0, -dy / RY), j = 1 - 0.17 * t * t; return se(x / j, dy, z + 0.5, RX + g, RY + g, RZ + g, 2.5) <= 1; }
const inEar = (x, y, z) => ((Math.abs(x) - RX + 0.2) / 1.5) ** 2 + ((y - (HY - 1)) / 2.5) ** 2 + ((z + 0.5) / 1.7) ** 2 <= 1;
const inNeck = (x, y, z) => y <= HY - RY + 3 && y >= -7 && Math.hypot(x, z + 0.5) <= 3.6;
function inTorso(x, y, z) {
  if (y < -27 || y > -2) return false; const sh = y > -12 ? 1 - ((y + 12) / 10) ** 2 * 0.5 : 1;                      // the shoulders round in towards the neck
  return se(x / sh, y + 16.5, z + 0.5, 17, 14, 8.6, 2.4) <= 1;
}
// the frontmost voxel of a shape at (x, y), for painting faces and fronts
const frontOf = (fn) => { const m = new Map(); return (x, y) => { const k = x * 1000 + y; if (!m.has(k)) { let z = 16; while (z > -16 && !fn(x, y, z)) z--; m.set(k, z); } return m.get(k); }; };

function person(av) {
  const A = normAvatar(av), skin = rgb(A.skin), hair = rgb(A.hair), hc = rgb(A.hat), tc = rgb(A.top);
  const headFront = frontOf(inHeadAt), torsoFront = frontOf(inTorso);
  const hs = A.hairStyle, hat = A.hatStyle, top = A.topStyle, ex = A.extra;
  const lip = mix(skin, [110, 28, 40], 0.62), cheek = mix(skin, [255, 120, 130], ex === 'blush' ? 0.45 : 0.18), eyeC = [26, 22, 40];
  // ── hats (drawn over everything, hair stays underneath) ──
  const hatBase = { beanie: HY + 3.2, cap: HY + 4, bucket: HY + 3.4, captain: HY + 4, phones: 99, snorkel: 99, flower: 99, none: 99 }[hat];
  function hatAt(x, y, z) {
    if (hat === 'none') return null;
    const shell = (g) => !inHeadAt(x, y, z) && inHeadAt(x, y, z, g);
    if (hat === 'beanie') {
      if (Math.hypot(x, y - (HY + RY + 3.6), z + 0.5) <= 2.7) return light(hc, 0.6 + 0.2 * hsh(x, y, z));                                   // pom-pom
      const top = se(x, y - HY, z + 0.5, RX + 2.2, RY + 3.4, RZ + 2.2, 2.4) <= 1 && !inHeadAt(x, y, z);
      if (top && y >= HY + 3.2 - Math.max(0, -z) * 0.22) return y < HY + 5.6 - Math.max(0, -z) * 0.22 ? (x & 1 ? dark(hc, 0.12) : dark(hc, 0.04)) : (((x + 40) % 3) === 0 ? dark(hc, 0.08) : hc);   // the folded, ribbed cuff, then knit
    }
    if (hat === 'cap') {
      const dome = shell(1.6) && y >= HY + 4 - Math.max(0, -z) * 0.15;
      if (dome) return Math.abs(x) < 0.6 || Math.abs(x - (z * 0.0)) < 0.4 ? dark(hc, 0.12) : hc;
      if (Math.hypot(x, y - (HY + RY + 1.6), z + 0.5) <= 1.1) return dark(hc, 0.2);
      if (y >= HY + 3 && y <= HY + 4 && z > RZ - 4 && (x / 7.8) ** 2 + ((z - (RZ - 4)) / 9.5) ** 2 <= 1) return dark(hc, 0.18);          // the brim, forward
    }
    if (hat === 'bucket') {
      const crown = shell(2) && y >= HY + 3.4 && y <= HY + RY + 1.2;
      if (crown) return y < HY + 5.2 ? dark(hc, 0.22) : hc;
      const ru = Math.hypot(x / RX, (z + 0.5) / RZ); if (ru >= 0.92 && ru <= 1.5) { const by = HY + 3.6 - (ru - 0.92) * 5.2; if (Math.abs(y - by) <= 0.6) return mix(hc, [255, 255, 255], 0.08); }
    }
    if (hat === 'captain') {
      const r = Math.hypot(x / (RX + 1.4), (z + 0.5) / (RZ + 1.4));
      if (y >= HY + 4 && y <= HY + RY + 3 && r <= 1 + (y - HY - 4) * 0.012 && !inHeadAt(x, y, z)) {
        if (y <= HY + 6) { if (Math.abs(x) <= 1.2 && z > RZ - 1 && y >= HY + 5) return [246, 204, 80]; return hc; }                         // the band and its gold badge
        return y >= HY + RY + 2 ? [250, 250, 246] : [238, 238, 232];
      }
      if (y >= HY + 3 && y <= HY + 4 && z > RZ - 3 && (x / 7) ** 2 + ((z - (RZ - 3)) / 6.5) ** 2 <= 1) return [32, 34, 46];
    }
    if (hat === 'snorkel') {
      const fz = headFront(x, y); const inBox = Math.abs(x) <= 8 && y >= HY - 4 && y <= HY + 2;
      if (inBox && fz > 0 && z > fz && z <= fz + 2) { const edge = Math.abs(x) >= 7 || y <= HY - 4 || y >= HY + 2 || Math.abs(x) <= 1; if (edge) return z === fz + 2 ? dark(hc, 0.1) : hc; }   // the mask frame, standing off the face
      if (y >= HY - 1 && y <= HY + 1 && shell(1.2) && z < 3) return dark(hc, 0.3);                                                           // the strap
      if (Math.hypot(x - (RX + 2.2), z + 0.5) <= 1.2 && y >= HY - 2 && y <= HY + RY + 5) return y >= HY + RY + 3 ? [250, 220, 70] : hc;      // the snorkel
    }
    if (hat === 'flower') {
      const cx = -(RX - 0.6), cy = HY + 3.6, cz = 2.2, nx = -0.72, nz = 0.69, px = x - cx, py = y - cy, pz = z - cz, d = px * nx + pz * nz;
      if (Math.abs(d) <= 1.1) { const ux = px - d * nx, uz = pz - d * nz, u = Math.hypot(ux, uz) * Math.sign(ux + uz), r = Math.hypot(u, py), a = Math.atan2(py, u);
        if (r <= 1.3) return [255, 220, 80]; if (r <= 4.2 + 0.9 * Math.cos(a * 5)) return r > 3.2 ? light(hc, 0.15) : hc; }
      if (Math.abs(d + 1.4) <= 0.6 && Math.hypot(x - cx - 2, y - cy + 3.5) <= 2.2) return [70, 150, 80];
    }
    if (hat === 'phones') {
      if (inHeadAt(x, y, z, 2.4) && !inHeadAt(x, y, z, 1.2) && Math.abs(z + 0.5) <= 1.3 && y >= HY + 1) return [44, 46, 58];
      const ax = Math.abs(x); if (ax >= RX - 0.5 && ax <= RX + 2.6 && Math.hypot(y - (HY - 1), z + 0.5) <= 3.8) return ax >= RX + 1.8 ? hc : Math.hypot(y - (HY - 1), z + 0.5) > 2.6 ? dark(hc, 0.35) : [44, 46, 58];
    }
    return null;
  }
  // ── hair ──
  const hairline = (x, y, z) => { const nz = Math.max(-1, Math.min(1, (z + 0.5) / RZ)); return HY + (hs === 'buzz' ? 5.2 : 4.4 + 0.1 * x) + (nz < 0 ? nz * 12 : (nz - 1) * 6.2 * (1 - nz) * 1.6); };
  const tone = (x, y, z) => { const n = hsh(x, y, z); return n > 0.82 ? light(hair, 0.16) : n < 0.18 ? dark(hair, 0.14) : hair; };
  function hairAt(x, y, z) {
    if (y >= hatBase + (hat === 'beanie' ? 0 : 0.5)) return null;
    if (inHeadAt(x, y, z)) return null;
    const th = { buzz: 0.8, short: 1.7, long: 1.7, curly: 1.4, bun: 1.2, spiky: 1.5 }[hs];
    if (inHeadAt(x, y, z, th) && y >= hairline(x, y, z)) return tone(x, y, z);
    if (hs === 'long') {
      const r = Math.hypot(x / (RX + 2.3), (z + 0.8) / (RZ + 2.3));
      if (r <= 1 && z <= 2.5 && y <= HY + 1 && y >= HY - 16 + Math.sin(x * 0.9) * 1.2 && !inEar(x, y, z) && (z < -1 || Math.abs(x) > RX - 1.5)) return tone(x, y, z);
    }
    if (hs === 'curly') {
      const bump = 0.85 + 0.15 * Math.sin(x * 1.3) * Math.sin(y * 1.1 + 1) * Math.sin(z * 1.2 + 2);
      if (se(x, y - HY - 1.6, z + 0.8, RX + 3.8, RY + 3.2, RZ + 3.6, 2.2) <= bump && y >= Math.min(hairline(x, y, z), HY - 3 + (z > 3 ? 7 : 0))) return hsh(x >> 1, y >> 1, z >> 1) > 0.6 ? light(hair, 0.12) : hair;
    }
    if (hs === 'bun' && (Math.hypot(x, y - (HY + RY + 2.4), z + 3) <= 4.4)) return tone(x, y, z);
    if (hs === 'spiky') for (const [sx, sz, h, lx] of [[-5, 2, 5, -0.4], [0, 3, 6.5, 0], [5, 2, 5, 0.4], [-3, -3, 5, -0.2], [3, -3, 5, 0.2], [0, -6, 4, 0]]) {
      const by = HY + RY - 2.2, u = (y - by) / h; if (u < 0 || u > 1) continue; const cx = sx + lx * u * h, cz = sz - u * 2.4;
      if (Math.hypot(x - cx, z - cz) <= 2.8 * (1 - u) + 0.3) return u > 0.7 ? light(hair, 0.15) : hair;
    }
    return null;
  }
  // ── face, on the front of the head ──
  function faceAt(x, y, z) {
    const fz = headFront(x, y); if (z < fz - 1) return null; const ax = Math.abs(x), dy = y - HY;
    const glassBox = (ex === 'glasses' || ex === 'shades') && hat !== 'snorkel' && ax >= 2 && ax <= 7 && dy >= -3 && dy <= 1;
    if (ax >= 4 && ax <= 5 && dy >= -2 && dy <= 0) { if (ex === 'shades' && hat !== 'snorkel') return null; const glint = dy === 0 && x === (x < 0 ? -5 : 4); return { c: glint ? [255, 255, 255] : eyeC, em: glint ? 2 : 1 }; }
    if (glassBox && ex === 'shades') return null;
    if (hat !== 'cap' && hat !== 'captain' && ax >= 3 && ax <= 6 && dy === 2 && hs !== 'curly') return { c: dark(hair, 0.1) };   // brows
    if (ax <= 2 && dy === -6) return { c: lip }; if (ax === 3 && dy === -5) return { c: lip };                           // a small smile
    if (ax >= 6 && ax <= 7 && dy >= -4 && dy <= -3) return { c: cheek };
    if (ex === 'freckles' && [[-6, -2], [-7, -3], [-5, -3], [6, -2], [7, -3], [5, -3], [-1, -3], [1, -3]].some(([a, b]) => a === x && b === dy)) return { c: mix(skin, [120, 60, 40], 0.45) };
    if (hat === 'snorkel' && Math.abs(x) <= 8 && dy >= -4 && dy <= 2) return { c: mix(skin, [120, 210, 240], 0.3) };
    return null;
  }
  function extraAt(x, y, z) {
    if ((ex !== 'glasses' && ex !== 'shades') || hat === 'snorkel') return null;
    const ax = Math.abs(x), dy = y - HY, fz = headFront(x, y);
    if (z === fz + 1 && ax >= 2 && ax <= 7 && dy >= -3 && dy <= 1) {
      const edge = ax === 2 || ax === 7 || dy === -3 || dy === 1; if (edge) return ex === 'shades' ? [30, 32, 44] : [24, 22, 34];
      if (ex === 'glasses' && ax === 6 && dy === 0) return [214, 236, 255];
      if (ex === 'shades') return ax === 6 && dy === 0 ? [180, 200, 230] : [24, 26, 40];
    }
    if (z <= fz + 1 && ax <= 1 && dy === 0 && z >= fz) return [40, 36, 52];
    if (dy === 0 && ax >= RX - 1.2 && ax <= RX + 0.6 && z > -4 && z < fz - 1 && !inHeadAt(x, y, z)) return [40, 36, 52];
    return null;
  }
  // ── the top ──
  function topAt(x, y, z) {
    const fz = torsoFront(x, y), front = z >= fz - 1, ax = Math.abs(x);
    if (Math.hypot(x, z + 0.5) <= 5.4 && y >= -8) return dark(top === 'wetsuit' ? [36, 40, 58] : tc, 0.22);                              // the neckline
    if (top === 'stripes') return Math.floor((y + 40) / 2) % 2 ? [244, 242, 236] : tc;
    if (top === 'wetsuit') { if (front && ax <= 0.5 && y < -7) return [190, 196, 210]; return ax >= 8 && ax <= 10.5 || (y > -10 && ax > 5) ? tc : [36, 40, 58]; }
    if (top === 'hoodie') {
      if (front && (x === -2 || x === 2) && y >= -15 && y <= -8) return [246, 246, 246];
      if (front && ax <= 7 && y >= -25 && y <= -19) return ax === 7 || y === -19 ? dark(tc, 0.3) : dark(tc, 0.1);
      return tc;
    }
    if (top === 'aloha') {
      if (front && ax <= (y + 13) * 0.55 && y > -13) return y > -9 ? skin : light(tc, 0.35);
      const p = Math.sin(x * 0.62 + z * 0.25) * Math.sin(y * 0.62 + 1.3); return p > 0.86 ? [255, 250, 236] : p > 0.74 ? light(tc, 0.45) : tc;
    }
    if (top === 'overalls') {
      if (y < -20) return tc;
      if (front && ax <= 7 && y <= -12) return ax === 5 && y === -13 ? [246, 204, 80] : tc;
      if (ax >= 4 && ax <= 6.5 && y > -12 && z > -2) return dark(tc, 0.12);
      return [244, 240, 230];
    }
    return Math.abs(x) >= 13.5 && y > -17 ? dark(tc, 0.08) : tc;                                                                  // a plain tee, the sleeves a shade darker
  }
  return {
    bounds: { x: [-19, 19], y: [-27, 27], z: [-15, 17] }, center: [0, 0], dither: false,
    sample(x, y, z) {
      const h = hatAt(x, y, z); if (h) return { c: h, tag: 'hat' };
      const e = extraAt(x, y, z); if (e) return { c: e, tag: 'extra' };
      if (!inHeadAt(x, y, z) && inHeadAt(x, y, z - 1) && x === 0 && (y === HY - 3 || y === HY - 2) && z >= headFront(x, y) + 1 - 0.01) return { c: mix(skin, [180, 90, 70], 0.12), tag: 'nose' };
      const hr = hairAt(x, y, z); if (hr) return { c: hr, tag: 'hair' };
      if (inHeadAt(x, y, z)) { const f = faceAt(x, y, z); if (f) return { c: f.c, em: f.em, tag: 'face' }; return { c: y < HY - 6 ? mix(skin, [255, 230, 210], 0.05) : skin, tag: 'head' }; }
      if (inEar(x, y, z)) return { c: mix(skin, [200, 100, 90], 0.12), tag: 'ear' };
      if (inNeck(x, y, z)) return { c: dark(skin, y > HY - RY ? 0.05 : 0.14), tag: 'neck' };
      if (inTorso(x, y, z)) return { c: topAt(x, y, z), tag: 'top' };
      return null;
    },
  };
}
const species = { id: 'person', make: (seed, look) => person(look) };
// models are kept for the last few looks drawn, frames per model per angle
const models = new Map();
export function personSprite(av, yaw = -Math.PI / 8) {
  const A = normAvatar(av), key = JSON.stringify(A); let m = models.get(key);
  if (!m) { m = new Fish(species, 1, A); models.set(key, m); if (models.size > 40) models.delete(models.keys().next().value); }
  return tight(m.frame({ yaw }));
}
// the sprite canvas is square around the model's centre; cut it down to the pixels actually drawn
const tights = new WeakMap();
function tight(f) {
  let t = tights.get(f); if (t) return t;
  const g = f.getContext('2d'), d = g.getImageData(0, 0, f.width, f.height).data; let x0 = f.width, y0 = f.height, x1 = -1, y1 = -1;
  for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) if (d[(y * f.width + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) { tights.set(f, f); return f; }
  t = document.createElement('canvas'); t.width = x1 - x0 + 1; t.height = y1 - y0 + 1; t.getContext('2d').drawImage(f, -x0, -y0); tights.set(f, t); return t;
}
// draws a caretaker into a canvas: a square with the bust standing on its bottom edge (CSS scales it up, pixelated)
export function drawAvatar(c, av, { yaw = -Math.PI / 8 } = {}) {
  const f = personSprite(av, yaw), pad = 3, S = Math.max(f.width, f.height) + pad * 2;
  c.width = S; c.height = S; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, S, S); g.drawImage(f, Math.round((S - f.width) / 2), S - f.height);
}
// playing offline there is no server profile: your look is kept on this phone
const SOLO = 'ourtank.look';
export function soloLook() { try { const l = JSON.parse(localStorage.getItem(SOLO) || 'null'); if (l) return normAvatar(l); } catch { /* storage unavailable */ } return normAvatar({ skin: '#c98d5e', hair: '#26232e', hairStyle: 'short', hatStyle: 'beanie', hat: '#7cc96a', top: '#2fae9a' }); }
export function saveSoloLook(l) { try { localStorage.setItem(SOLO, JSON.stringify(normAvatar(l))); } catch { /* storage unavailable */ } }

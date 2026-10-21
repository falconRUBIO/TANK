// Caretakers, drawn as voxel busts in the same pixel style as the fish (see bustModel). `yaw` turns them, for the editor's drag.
import { normAvatar } from './game/avatar.js';
import { Fish } from './voxel.js';
import { mix } from './color.js';

const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const INK = [28, 24, 44], WHITE = [255, 255, 255];
const dk = (c, k) => mixc(c, INK, k), lt = (c, k) => mixc(c, WHITE, k);

// ── The caretaker as a voxel bust, built and shaded like the fish: chunky cubes, toon light and an outline, so people and animals look made of
// the same stuff. The bust faces +z (toward you); `yaw` turns it, as in the editor's drag. Everything about a look is its own little shape. ──
const hash3 = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function bustModel(A) {
  const skin = rgb(A.skin), hair = rgb(A.hair), hc = rgb(A.hat), tc = rgb(A.top), hs = A.hairStyle, hat = A.hatStyle, top = A.topStyle, ex = A.extra;
  const HY = 21, RX = 9.4, RY = 10, RZ = 8.8;                                  // the head: center height and its three radii
  const inHead = (x, y, z, g = 0) => { const yy = y - HY, sq = yy < 0 ? 1 + (-yy / RY) * 0.12 : 1; return ((x * sq) / (RX + g)) ** 2 + (yy / (RY + g)) ** 2 + (z / (RZ + g)) ** 2 <= 1; };      // a little squarer at the jaw
  const inBody = (x, y, z) => y >= 0 && y <= 9 && (x / 17) ** 2 + ((y - 1) / 10.5) ** 2 <= 1 && Math.abs(z) <= 6.8 - Math.max(0, y - 6) * 0.6;      // shoulders and chest
  const inNeck = (x, y, z) => y > 7 && y < HY - 7 && x * x + z * z <= 13;
  const shirt = top === 'wetsuit' ? [38, 44, 64] : top === 'stripes' || top === 'overalls' ? [246, 244, 238] : tc;
  const front = (x, y, z) => z > 0 && !inHead(x, y, z + 1);                     // a voxel on the face's surface
  const eyeY = HY, eyeX = 3.5;
  return { bounds: { x: [-19, 19], y: [0, 42], z: [-14, 16] }, center: [0, 19], bend: null,
    sample(x, y, z) {
      const head = inHead(x, y, z);
      // ── hats (over everything on top) ──
      if (hat === 'beanie') { const cuff = y >= HY + 3 && y <= HY + 5 && inHead(x, y, z, 1.6) && !inHead(x, y, z, -0.4); if (cuff) return { c: lt(hc, 0.12) };
        if (y > HY + 5 && inHead(x, y, z, 1.4)) return { c: (x + 40) % 2 ? hc : dk(hc, 0.12) }; if (Math.hypot(x, y - (HY + RY + 2), z) <= 2.6) return { c: lt(hc, 0.6) }; }
      if (hat === 'cap') { if (y > HY + 4 && inHead(x, y, z, 1.2) && !(y > HY + 4 && y < HY + 6 && z < -4)) return { c: hc };
        if (y >= HY + 4 && y <= HY + 5 && z > 3 && z <= RZ + 6 && Math.abs(x) <= 7.5 - Math.max(0, z - RZ) * 0.5) return { c: dk(hc, 0.15) }; if (Math.hypot(x, y - (HY + RY + 1), z) < 1.2) return { c: dk(hc, 0.3) }; }
      if (hat === 'bucket') { if (y >= HY + 3 && y <= HY + 4 && x * x / 225 + z * z / 196 <= 1) return { c: dk(hc, 0.12) }; if (y > HY + 4 && inHead(x, y, z, 1.4)) return { c: y === HY + 6 ? dk(hc, 0.35) : hc }; }
      if (hat === 'captain') { if (y > HY + 4 && y <= HY + 12 && (x / (10 + (y - HY - 4) * 0.3)) ** 2 + (z / (9.4 + (y - HY - 4) * 0.25)) ** 2 <= 1) { if (z > 7 && Math.abs(x) <= 1.5 && y >= HY + 7 && y <= HY + 9) return { c: [250, 206, 70], em: 0 }; return { c: y <= HY + 6 ? dk(hc, 0.4) : y >= HY + 11 ? lt(hc, 0.15) : [246, 246, 240] }; }
        if (y === HY + 4 && z > 4 && z <= RZ + 4 && Math.abs(x) <= 7) return { c: [24, 26, 40] }; }
      if (hat === 'phones') { if (y > HY + 6 && inHead(x, y, z, 2.2) && !inHead(x, y, z, 0.8) && Math.abs(z) <= 1.5) return { c: [50, 52, 66] }; if (Math.abs(x) >= RX - 0.5 && Math.abs(x) <= RX + 3 && Math.hypot(y - HY, z) <= 4) return { c: Math.abs(x) > RX + 1.5 ? hc : [50, 52, 66] }; }
      if (hat === 'flower') { const fx = -6, fy = HY + 8, fz = 5; const d = Math.hypot(x - fx, y - fy, (z - fz) * 1.6); if (d <= 1.3) return { c: [250, 210, 80] }; if (d <= 3.4 && Math.abs(z - fz) <= 1.5) return { c: hc }; }
      if (hat === 'snorkel') { if (z > 3 && y >= eyeY - 3 && y <= eyeY + 3 && Math.abs(x) <= 7 && front(x, y, z - 1)) { const lens = Math.abs(x) <= 6 && y >= eyeY - 2 && y <= eyeY + 2; return { c: lens ? (Math.abs(Math.abs(x) - eyeX) <= 1 && Math.abs(y - eyeY) <= 0.6 ? [20, 20, 30] : [150, 210, 240]) : hc, em: lens ? 1 : 0 }; }
        if (x >= RX - 1 && x <= RX + 1 && y >= HY - 2 && y <= HY + 15 && Math.abs(z) <= 1) return { c: y > HY + 13 ? [250, 214, 80] : hc }; }
      // ── hair ──
      const hairUp = hat === 'none' || hat === 'flower' || hat === 'phones' || hat === 'snorkel';
      if (hs === 'bun' && hairUp && Math.hypot(x, y - (HY + RY + 1), z + 3) <= 4) return { c: (x + y) % 2 ? hair : dk(hair, 0.1) };
      if (hs === 'spiky' && hairUp && y > HY + RY - 2 && y < HY + RY + 5 && Math.abs(z) <= 6) { const sp = Math.round((x + 9) / 4.5); const cxp = sp * 4.5 - 9, hgt = HY + RY + 5 - Math.abs(x - cxp) * 1.6; if (y <= hgt && Math.abs(x) <= 10) return { c: hair }; }
      if (hs === 'long' && !head && z < 1 && y >= 6 && y <= HY + 4 && Math.abs(x) <= RX + 1.6 && z >= -RZ - 1 && (inHead(x, Math.max(y, HY), z, 1.6) || y < HY)) { if (Math.abs(x) >= RX - 2 || z < -3) return { c: (y % 3 === 0) ? dk(hair, 0.12) : hair }; }
      if (hs === 'curly' && inHead(x, y, z, 2.6) && !head && (y > HY + 4 || z < -2 || (Math.abs(x) > RX - 1 && z < 4)) && hash3(x, y, z) > 0.25) return { c: hash3(x, y, z + 7) > 0.5 ? hair : dk(hair, 0.15) };
      if (head) {
        const yy = y - HY, onTop = yy > (hs === 'buzz' ? 4.5 : 3), behind = z < -1 && yy > -4, sides = Math.abs(x) > RX - 2.2 && yy > -1 && z < 3;
        const fringe = hs !== 'buzz' && z >= 3 && yy > 3 + Math.sin(x * 0.7) * 1.2 + (x > 0 ? 1 : 0);
        if (hairUp || hs === 'long' || hs === 'curly') { if (onTop && (z < RZ - 1 || fringe) || behind || (sides && hs !== 'buzz') || fringe) return { c: hs === 'buzz' ? mix(hair, skin, 0.25) : (x * 3 + y) % 5 === 0 ? dk(hair, 0.14) : hair }; }
        else if (behind || (sides && yy > 1) || fringe) return { c: hair };       // under a beanie, captain's or bucket hat a little hair shows at the sides and back
        // ── the face ──
        if (front(x, y, z)) {
          const shades = ex === 'shades' && hat !== 'snorkel', glasses = ex === 'glasses' && hat !== 'snorkel';
          for (const s2 of [-1, 1]) { const dx = x - s2 * eyeX, dy = y - eyeY;
            if ((glasses || shades) && Math.abs(dx) <= 2.2 && Math.abs(dy) <= 1.7 && (shades || Math.abs(dx) >= 1.6 || Math.abs(dy) >= 1.3)) return { c: shades ? [24, 26, 42] : [44, 40, 58], em: shades && dx === -1 && dy === 1 ? 2 : 0 };
            if (!shades && dx >= -0.5 && dx <= 1.5 && dy >= -1 && dy <= 1) return dx > 0.5 && dy === 1 ? { c: [255, 255, 255], em: 2, tag: 'eye' } : { c: [26, 22, 38], tag: 'eye', pupil: 1 };      // eyes: two tall dark voxels with a catch-light
            if (!shades && hat !== 'cap' && hat !== 'captain' && hat !== 'snorkel' && dy === 3 && Math.abs(dx) <= 1.2) return { c: dk(hair, 0.15) };      // brows
            if ((ex === 'blush' ? Math.abs(dx - s2 * 0.8) <= 1.4 : false) && dy >= -4 && dy <= -3) return { c: mix(skin, [255, 110, 120], 0.55) };
            if (ex === 'freckles' && dy >= -3 && dy <= -2 && Math.abs(dx) <= 1.6 && hash3(x, y, 3) > 0.45) return { c: mix(skin, [120, 60, 40], 0.5) }; }
          if (Math.abs(x) <= 0 && y === eyeY - 2) return { c: dk(skin, 0.22) };                                                  // the nose
          if (y === eyeY - 4 && Math.abs(x) <= 1 || (y === eyeY - 3 && Math.abs(x) === 2)) return { c: mix(dk(skin, 0.45), [150, 40, 60], 0.45) };      // a smile
        }
        if (Math.abs(x) >= RX - 0.8 && Math.abs(y - HY) <= 2 && z > -2 && z < 2) return { c: mix(skin, [220, 120, 110], 0.15) };      // ears
        return { c: skin };
      }
      if (inNeck(x, y, z)) return { c: dk(skin, 0.12) };
      if (inBody(x, y, z)) {
        if (top === 'hoodie' && z < -3 && y > 6) return { c: dk(tc, 0.12) };
        const fr = z > 3;
        if (top === 'stripes' && y % 3 === 0) return { c: tc };
        if (top === 'wetsuit') return { c: Math.abs(x) > 11 ? tc : x === 0 && fr ? [200, 206, 220] : shirt };
        if (top === 'aloha' && hash3(x, y, z) > 0.84) return { c: lt(tc, 0.6) };
        if (top === 'overalls' && (Math.abs(x) <= 6 && y <= 6 && fr || (Math.abs(Math.abs(x) - 5) <= 1 && y > 5))) return { c: Math.abs(x) <= 6 && y === 6 && Math.abs(Math.abs(x) - 5) <= 0.5 ? [250, 210, 90] : tc };
        if (top === 'hoodie' && fr && Math.abs(Math.abs(x) - 2) < 0.5 && y > 3) return { c: [245, 245, 245] };
        if ((top === 'tee' || top === 'aloha') && fr && y >= 8 && Math.abs(x) <= 3 - (y - 8)) return { c: skin };      // the open neck
        return { c: (x + 40) % 7 === 0 && top === 'tee' ? dk(shirt, 0.08) : shirt };
      }
      return null; } };
}
const bustSpecies = (A) => ({ id: 'person', label: 'Caretaker', length: 40, vox: 0.05, make: () => bustModel(A) });
function personCanvas(A, yaw) { const f = new Fish(bustSpecies(A), 1, null); return f.frame({ yaw, pitch: 0 }); }
// portraits are kept for the last few looks drawn, one per look and angle
const models = new Map();
export function personSprite(av, yaw = -Math.PI / 8) {
  const A = normAvatar(av), key = JSON.stringify(A) + '|' + yaw.toFixed(2); let m = models.get(key);
  if (!m) { m = tight(personCanvas(A, yaw)); models.set(key, m); if (models.size > 60) models.delete(models.keys().next().value); }
  return m;
}
// the sprite canvas is square around the model's center; cut it down to the pixels actually drawn
const tights = new WeakMap();
function tight(f) {
  let t = tights.get(f); if (t) return t;
  const g = f.getContext('2d'), d = g.getImageData(0, 0, f.width, f.height).data; let x0 = f.width, y0 = f.height, x1 = -1, y1 = -1;
  for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) if (d[(y * f.width + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) { tights.set(f, f); return f; }
  t = document.createElement('canvas'); t.width = x1 - x0 + 1; t.height = y1 - y0 + 1; t.getContext('2d').drawImage(f, -x0, -y0); tights.set(f, t); return t;
}
// draws a caretaker into a canvas: a square with the bust standing on its bottom edge
export function drawAvatar(c, av, { yaw = -Math.PI / 8 } = {}) {
  const f = personSprite(av, yaw), pad = 8, Q = Math.max(f.width, f.height) + pad * 2;
  c.width = Q; c.height = Q; c.style.imageRendering = 'pixelated'; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, Q, Q); g.drawImage(f, Math.round((Q - f.width) / 2), Q - f.height);
}
// playing offline there is no server profile: your look is kept on this phone
const SOLO = 'ourtank.look';
export function soloLook() { try { const l = JSON.parse(localStorage.getItem(SOLO) || 'null'); if (l) return normAvatar(l); } catch { /* storage unavailable */ } return normAvatar({ skin: '#c98d5e', hair: '#26232e', hairStyle: 'short', hatStyle: 'beanie', hat: '#7cc96a', top: '#2fae9a' }); }
export function saveSoloLook(l) { try { localStorage.setItem(SOLO, JSON.stringify(normAvatar(l))); } catch { /* storage unavailable */ } }

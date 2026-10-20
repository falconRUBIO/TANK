// Caretakers, drawn as small illustrated portraits: a head-and-shoulders bust with soft shading, a thin darker outline round every shape,
// eyes with a catch-light, and hair, hat, top and extra each drawn as its own clean shape. Drawn at a high resolution, so it stays crisp
// at any size. `yaw` turns the face a little to one side (the features slide across and the far side narrows), for the editor's drag.
import { normAvatar } from './game/avatar.js';

const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const INK = [28, 24, 44], WHITE = [255, 255, 255];
const dk = (c, k) => mixc(c, INK, k), lt = (c, k) => mixc(c, WHITE, k);

const S = 256;                                        // drawing size; the bust stands on the bottom edge
function portrait(g, A, yaw) {
  const skin = rgb(A.skin), hair = rgb(A.hair), hc = rgb(A.hat), tc = rgb(A.top);
  const tw = Math.max(-1, Math.min(1, Math.sin(yaw))) * 0.9, back = Math.cos(yaw) < -0.2;      // how far the face is turned (-1 left, 1 right), and whether we see the back of the head
  const cx = S / 2, cy = 104, rx = 62, ry = 66, fx = cx + tw * 20;                           // head center and size; fx: where the face's middle is
  const LW = 5;
  const fillStroke = (fill, line, w = LW) => { g.fillStyle = fill; g.fill(); g.lineWidth = w; g.strokeStyle = line; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); };
  const shade = (c, x0, y0, r) => { const gr = g.createRadialGradient(x0, y0, r * 0.1, x0, y0, r); gr.addColorStop(0, css(lt(c, 0.18))); gr.addColorStop(0.65, css(c)); gr.addColorStop(1, css(dk(c, 0.16))); return gr; };
  const headPath = (grow = 0) => { g.beginPath(); const n = 48; for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); const jaw = sa > 0 ? 1 - 0.14 * sa * sa : 1;      // a softly squared head, narrowing a little to the chin
      const x = cx + Math.sign(ca) * Math.abs(ca) ** 0.82 * (rx + grow) * jaw * (ca * tw > 0 ? 1 : 1 - Math.abs(tw) * 0.08), y = cy + Math.sign(sa) * Math.abs(sa) ** 0.9 * (ry + grow); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); };
  const ell = (x, y, a, b, r = 0) => { g.beginPath(); g.ellipse(x, y, a, b, r, 0, Math.PI * 2); };
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };

  // ── long hair falls behind the shoulders ──
  if (A.hairStyle === 'long') { g.beginPath(); g.moveTo(cx - rx - 6, cy - 10); g.quadraticCurveTo(cx - rx - 16, cy + 70, cx - rx + 4, S - 34); g.lineTo(cx + rx - 4, S - 34); g.quadraticCurveTo(cx + rx + 16, cy + 70, cx + rx + 6, cy - 10); g.closePath(); fillStroke(shade(dk(hair, 0.12), cx, cy, 140), css(dk(hair, 0.5))); }
  if (A.topStyle === 'hoodie') { ell(cx, S - 64, 70, 26); fillStroke(css(dk(tc, 0.12)), css(dk(tc, 0.5))); }        // the hood, bunched behind the neck

  // ── shoulders and top ──
  const body = () => { g.beginPath(); g.moveTo(cx - 118, S + 4); g.bezierCurveTo(cx - 118, S - 52, cx - 92, S - 70, cx - 40, S - 76); g.lineTo(cx + 40, S - 76); g.bezierCurveTo(cx + 92, S - 70, cx + 118, S - 52, cx + 118, S + 4); g.closePath(); };
  const top = A.topStyle, base = top === 'wetsuit' ? [38, 44, 64] : top === 'stripes' ? [246, 244, 238] : top === 'overalls' ? [246, 242, 232] : tc;
  body(); fillStroke(shade(base, cx - 30, S - 70, 170), css(dk(base, 0.55)));
  g.save(); body(); g.clip();
  if (top === 'stripes') { g.fillStyle = css(tc); for (let y = S - 70; y < S; y += 22) g.fillRect(0, y, S, 10); }
  if (top === 'wetsuit') { g.fillStyle = css(tc); g.fillRect(cx - 120, S - 80, 44, 90); g.fillRect(cx + 76, S - 80, 44, 90); g.fillStyle = css([200, 206, 220]); g.fillRect(cx - 2 + tw * 10, S - 74, 4, 80); }
  if (top === 'aloha' && !back) { for (const [x, y, r] of [[-70, 28, 9], [-34, 52, 8], [40, 30, 9], [76, 54, 8], [-6, 64, 7], [92, 20, 6], [-96, 60, 7]]) { g.fillStyle = css(lt(tc, 0.55)); for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; ell(cx + x + Math.cos(a) * r * 0.7, S - 78 + y + Math.sin(a) * r * 0.7, r * 0.55, r * 0.55); g.fill(); } g.fillStyle = css([255, 214, 90]); ell(cx + x, S - 78 + y, r * 0.35, r * 0.35); g.fill(); }
    g.beginPath(); g.moveTo(cx - 34 + tw * 10, S - 78); g.lineTo(cx + tw * 10, S - 30); g.lineTo(cx + 34 + tw * 10, S - 78); g.closePath(); g.fillStyle = css(skin); g.fill(); g.strokeStyle = css(dk(tc, 0.35)); g.lineWidth = 4; g.stroke(); }
  if (top === 'overalls' && !back) { g.fillStyle = css(tc); rr(cx - 46 + tw * 10, S - 44, 92, 60, 10); g.fill(); g.fillRect(cx - 52 + tw * 10, S - 80, 18, 44); g.fillRect(cx + 34 + tw * 10, S - 80, 18, 44); g.fillStyle = css([250, 210, 90]); for (const x of [-42, 42]) { ell(cx + x + tw * 10, S - 40, 6, 6); g.fill(); } g.strokeStyle = css(dk(tc, 0.35)); g.lineWidth = 3; rr(cx - 22 + tw * 10, S - 30, 44, 24, 6); g.stroke(); }
  if (top === 'hoodie' && !back) { g.strokeStyle = css([245, 245, 245]); g.lineWidth = 4; for (const x of [-14, 14]) { g.beginPath(); g.moveTo(cx + x + tw * 10, S - 74); g.lineTo(cx + x + tw * 10 + (x > 0 ? 3 : -3), S - 38); g.stroke(); ell(cx + x + tw * 10 + (x > 0 ? 3 : -3), S - 36, 3.5, 3.5); g.fillStyle = css([245, 245, 245]); g.fill(); } g.strokeStyle = css(dk(tc, 0.3)); g.lineWidth = 4; rr(cx - 44 + tw * 10, S - 26, 88, 40, 12); g.stroke(); }
  if (top === 'tee') { g.strokeStyle = css(dk(tc, 0.18)); g.lineWidth = 3; for (const s2 of [-1, 1]) { g.beginPath(); g.moveTo(cx + s2 * 78, S - 66); g.quadraticCurveTo(cx + s2 * 86, S - 30, cx + s2 * 82, S + 2); g.stroke(); } }
  g.restore();
  // the neck, and its shadow under the chin
  g.beginPath(); g.moveTo(cx - 24 + tw * 8, cy + ry - 22); g.lineTo(cx - 26 + tw * 8, S - 70); g.quadraticCurveTo(cx + tw * 8, S - 58, cx + 26 + tw * 8, S - 70); g.lineTo(cx + 24 + tw * 8, cy + ry - 22); g.closePath(); fillStroke(css(dk(skin, 0.1)), css(dk(skin, 0.5)));
  { const nc = top === 'wetsuit' ? [38, 44, 64] : top === 'overalls' ? [246, 242, 232] : top === 'stripes' ? [246, 244, 238] : tc; g.beginPath(); g.moveTo(cx - 34 + tw * 8, S - 76); g.quadraticCurveTo(cx + tw * 8, S - 52, cx + 34 + tw * 8, S - 76); g.lineWidth = 7; g.strokeStyle = css(dk(nc, 0.3)); g.stroke(); }

  // ── ears, then the head ──
  if (!back) for (const s2 of [-1, 1]) { const vis = 1 - Math.max(0, s2 * tw) * 0.9; if (vis < 0.2) continue; const ex = cx + s2 * (rx - 4) - tw * 8; ell(ex, cy + 6, 12 * vis, 17); fillStroke(css(mixc(skin, [210, 110, 100], 0.12)), css(dk(skin, 0.5))); ell(ex, cy + 6, 6 * vis, 10); g.fillStyle = css(dk(skin, 0.14)); g.fill(); }
  headPath(); fillStroke(shade(skin, cx - 18 + tw * 10, cy - 26, 120), css(dk(skin, 0.52)));

  if (back) { g.save(); headPath(); g.clip(); g.fillStyle = shade(hair, cx, cy - 40, 120); g.fillRect(0, cy - ry - 10, S, A.hairStyle === 'buzz' ? ry * 1.2 : ry * 2.4); g.restore(); headPath(); g.lineWidth = LW; g.strokeStyle = css(dk(skin, 0.52)); g.stroke(); }      // from behind: the back of the head is hair
  // ── the face ──
  if (!back) {
    const eY = cy + 6, eS = 23, squash = (s2) => 1 - Math.max(0, -s2 * tw) * 0.28;
    const shades = A.extra === 'shades' && A.hatStyle !== 'snorkel';
    if (A.extra === 'blush' || true) for (const s2 of [-1, 1]) { ell(fx + s2 * 34 * squash(s2), eY + 24, 11 * squash(s2), 6.5); g.fillStyle = css([255, 120, 130], A.extra === 'blush' ? 0.55 : 0.2); g.fill(); }
    if (!shades) for (const s2 of [-1, 1]) { const k = squash(s2), x = fx + s2 * eS * k; ell(x, eY, 8.5 * k, 11); g.fillStyle = css(INK); g.fill(); ell(x + 3 * k, eY - 4.5, 3.4 * k, 3.6); g.fillStyle = '#fff'; g.fill(); ell(x - 2.5 * k, eY + 4.5, 1.6 * k, 1.6); g.fill(); }
    // brows
    if (A.hatStyle !== 'cap' && A.hatStyle !== 'captain' && A.hatStyle !== 'snorkel') for (const s2 of [-1, 1]) { const k = squash(s2); g.beginPath(); g.moveTo(fx + s2 * (eS - 11) * k, eY - 19); g.quadraticCurveTo(fx + s2 * eS * k, eY - 24, fx + s2 * (eS + 10) * k, eY - 19); g.lineWidth = 4.5; g.strokeStyle = css(dk(hair, 0.15)); g.stroke(); }
    // nose and smile
    g.beginPath(); g.moveTo(fx + tw * 4 - 3, eY + 18); g.quadraticCurveTo(fx + tw * 7 + 1, eY + 22, fx + tw * 4 + 4, eY + 17); g.lineWidth = 3.5; g.strokeStyle = css(dk(skin, 0.32)); g.stroke();
    g.beginPath(); g.moveTo(fx - 12, eY + 31); g.quadraticCurveTo(fx, eY + 41, fx + 12, eY + 31); g.lineWidth = 4; g.strokeStyle = css(mixc(dk(skin, 0.5), [140, 30, 50], 0.4)); g.stroke();
    if (A.extra === 'freckles') { g.fillStyle = css(mixc(skin, [120, 60, 40], 0.5)); for (const [x, y] of [[-30, 18], [-38, 22], [-24, 23], [30, 18], [38, 22], [24, 23], [-6, 16], [6, 16]]) { ell(fx + x, eY + y, 2.2, 2.2); g.fill(); } }
    if ((A.extra === 'glasses' || shades) && A.hatStyle !== 'snorkel') { for (const s2 of [-1, 1]) { const k = squash(s2); rr(fx + s2 * eS * k - 16 * k, eY - 13, 32 * k, 25, 9); g.fillStyle = shades ? css([24, 26, 42], 0.94) : 'rgba(210,235,255,.22)'; g.fill(); g.lineWidth = 4.5; g.strokeStyle = css(shades ? [16, 16, 26] : [40, 36, 54]); g.stroke(); if (shades) { g.beginPath(); g.moveTo(fx + s2 * eS * k + 2 * k, eY - 8); g.lineTo(fx + s2 * eS * k + 9 * k, eY - 8); g.lineWidth = 3; g.strokeStyle = 'rgba(190,210,240,.8)'; g.stroke(); } }
      g.beginPath(); g.moveTo(fx - eS + 16, eY - 4); g.quadraticCurveTo(fx, eY - 9, fx + eS - 16, eY - 4); g.lineWidth = 4; g.strokeStyle = css([40, 36, 54]); g.stroke(); }
  }

  // ── hair over the head ──
  const hs = A.hairStyle, hat = A.hatStyle, hairFill = shade(hair, cx - 20, cy - 60, 110), hairLine = css(dk(hair, 0.55));
  const cap = (depth, fringe) => { g.save(); headPath(5); g.clip(); g.beginPath(); g.moveTo(0, 0); g.lineTo(S, 0); g.lineTo(S, cy - ry * depth + 30);
      for (let i = 0; i <= 20; i++) { const u = i / 20, x = S - u * S, w = Math.sin(u * Math.PI * (fringe ?? 3)) * 9; g.lineTo(x, cy - ry * depth + (Math.abs(x - fx) < rx * 0.75 ? 0 : 26) + w); }
      g.closePath(); g.fillStyle = hairFill; g.fill(); g.lineWidth = LW * 2; g.strokeStyle = hairLine; g.stroke(); g.restore(); headPath(5); g.save(); g.clip(); g.restore(); };
  if (!(hat === 'beanie' || hat === 'captain' || hat === 'bucket') || hs === 'long' || hs === 'curly') {
    if (hs === 'curly') { for (const [a, r] of [[-2.9, 26], [-2.5, 28], [-2.0, 30], [-1.57, 30], [-1.1, 30], [-0.6, 28], [-0.2, 26], [0.15, 22], [-3.3, 22]]) { ell(cx + Math.cos(a) * rx * 0.95, cy - 6 + Math.sin(a) * ry * 0.95, r, r); fillStroke(hairFill, hairLine); } for (const [a, r] of [[-2.5, 20], [-1.57, 22], [-0.6, 20]]) { ell(cx + Math.cos(a) * rx * 0.62, cy - 12 + Math.sin(a) * ry * 0.62, r, r); g.fillStyle = css(lt(hair, 0.1)); g.fill(); } }
    else if (hs === 'buzz') { cap(0.62, 6); }
    else if (hs === 'spiky') { cap(0.5, 5); for (const [x, h, l] of [[-40, 34, -14], [-16, 44, -6], [10, 46, 4], [34, 38, 12], [52, 26, 18]]) { g.beginPath(); g.moveTo(cx + x - 18, cy - ry + 22); g.lineTo(cx + x + l, cy - ry + 18 - h); g.lineTo(cx + x + 18, cy - ry + 22); g.closePath(); fillStroke(hairFill, hairLine); } cap(0.5, 5); }
    else { cap(hs === 'bun' ? 0.5 : 0.42, 2.5);      // short, long and bun share a swept fringe
      g.beginPath(); g.moveTo(fx - rx * 0.85, cy - ry * 0.32); g.quadraticCurveTo(fx - 10, cy - ry * 0.05, fx + rx * 0.55, cy - ry * 0.55); g.quadraticCurveTo(fx + 6, cy - ry * 0.75, fx - rx * 0.85, cy - ry * 0.32); fillStroke(hairFill, hairLine, 4); }
    if (hs === 'bun') { ell(cx - tw * 6, cy - ry - 14, 24, 22); fillStroke(hairFill, hairLine); }
    if (hs === 'long') for (const s2 of [-1, 1]) { g.beginPath(); g.moveTo(cx + s2 * (rx - 6), cy - 30); g.quadraticCurveTo(cx + s2 * (rx + 12), cy + 40, cx + s2 * (rx - 2), cy + 84); g.lineTo(cx + s2 * (rx - 22), cy + 80); g.quadraticCurveTo(cx + s2 * (rx - 10), cy + 20, cx + s2 * (rx - 26), cy - 30); g.closePath(); fillStroke(hairFill, hairLine); }
  }

  // ── hats ──
  const dome = (lowY) => { g.beginPath(); g.moveTo(cx - rx - 8, lowY); g.bezierCurveTo(cx - rx - 8, cy - ry - 40, cx + rx + 8, cy - ry - 40, cx + rx + 8, lowY); g.closePath(); };
  if (hat === 'beanie') { if (hs === 'long' || hs === 'curly') {} dome(cy - 14); fillStroke(shade(hc, cx - 20, cy - 80, 110), css(dk(hc, 0.55)));
    g.save(); dome(cy - 14); g.clip(); g.strokeStyle = css(dk(hc, 0.12)); g.lineWidth = 3; for (let x = cx - rx - 10; x < cx + rx + 10; x += 12) { g.beginPath(); g.moveTo(x, cy - 40); g.lineTo(x + (x - cx) * 0.25, cy - ry - 30); g.stroke(); } g.restore();
    rr(cx - rx - 10, cy - 38, (rx + 10) * 2, 28, 12); fillStroke(css(dk(hc, 0.1)), css(dk(hc, 0.55))); g.save(); rr(cx - rx - 10, cy - 38, (rx + 10) * 2, 28, 12); g.clip(); g.strokeStyle = css(dk(hc, 0.25)); g.lineWidth = 3; for (let x = cx - rx - 6; x < cx + rx + 10; x += 9) { g.beginPath(); g.moveTo(x, cy - 36); g.lineTo(x, cy - 12); g.stroke(); } g.restore();
    ell(cx - tw * 8, cy - ry - 26, 18, 17); fillStroke(shade(lt(hc, 0.55), cx - 6, cy - ry - 32, 22), css(dk(hc, 0.4))); }
  if (hat === 'cap') { dome(cy - 26); fillStroke(shade(hc, cx - 20, cy - 80, 110), css(dk(hc, 0.55))); g.beginPath(); g.moveTo(cx, cy - ry - 18); g.lineTo(cx, cy - 26); g.lineWidth = 3; g.strokeStyle = css(dk(hc, 0.25)); g.stroke(); ell(cx, cy - ry - 18, 6, 4); g.fillStyle = css(dk(hc, 0.3)); g.fill();
    if (!back) ell(fx + tw * 30, cy - 26, rx * 0.78, 12, 0); if (!back) fillStroke(css(dk(hc, 0.18)), css(dk(hc, 0.6))); }
  if (hat === 'bucket') { ell(cx, cy - 26, rx + 32, 16); fillStroke(css(dk(hc, 0.12)), css(dk(hc, 0.55))); g.beginPath(); g.moveTo(cx - rx + 2, cy - 28); g.bezierCurveTo(cx - rx + 4, cy - ry - 36, cx + rx - 4, cy - ry - 36, cx + rx - 2, cy - 28); g.closePath(); fillStroke(shade(hc, cx - 20, cy - 80, 100), css(dk(hc, 0.55))); rr(cx - rx + 2, cy - 44, (rx - 2) * 2, 12, 4); g.fillStyle = css(dk(hc, 0.25)); g.fill(); }
  if (hat === 'captain') { g.beginPath(); g.moveTo(cx - rx - 4, cy - 40); g.lineTo(cx - rx - 14, cy - ry - 30); g.quadraticCurveTo(cx, cy - ry - 48, cx + rx + 14, cy - ry - 30); g.lineTo(cx + rx + 4, cy - 40); g.closePath(); fillStroke(shade([248, 248, 244], cx - 20, cy - 90, 120), css([90, 96, 110]));
    rr(cx - rx - 4, cy - 56, (rx + 4) * 2, 18, 6); fillStroke(css(hc), css(dk(hc, 0.5))); if (!back) { ell(cx + tw * 14, cy - 47, 9, 9); fillStroke(css([248, 204, 80]), css([150, 110, 30]), 3); ell(fx + tw * 24, cy - 36, rx * 0.7, 8); fillStroke(css([30, 32, 44]), css([10, 10, 18])); } }
  if (hat === 'flower') { const x0 = cx - rx + 10 - tw * 10, y0 = cy - ry + 26; for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 - 0.3; ell(x0 + Math.cos(a) * 14, y0 + Math.sin(a) * 14, 12, 12); fillStroke(css(hc), css(dk(hc, 0.45)), 3.5); } ell(x0, y0, 8, 8); fillStroke(css([255, 214, 90]), css([170, 120, 30]), 3); }
  if (hat === 'phones') { g.beginPath(); g.arc(cx, cy - 6, rx + 10, Math.PI * 1.08, Math.PI * 1.92); g.lineWidth = 12; g.strokeStyle = css([46, 48, 62]); g.stroke(); for (const s2 of [-1, 1]) { rr(cx + s2 * (rx + 4) - 14 - tw * 8, cy - 14, 28, 44, 12); fillStroke(shade(hc, cx + s2 * rx, cy, 40), css(dk(hc, 0.55))); } }
  if (hat === 'snorkel' && !back) { rr(fx - 50, cy - 16, 100, 42, 18); g.fillStyle = 'rgba(170,225,255,.45)'; g.fill(); g.lineWidth = 8; g.strokeStyle = css(hc); g.stroke(); g.beginPath(); g.moveTo(cx - rx - 2, cy + 4); g.lineTo(fx - 50, cy + 4); g.moveTo(fx + 50, cy + 4); g.lineTo(cx + rx + 2, cy + 4); g.lineWidth = 7; g.strokeStyle = css(dk(hc, 0.3)); g.stroke();
    for (const s2 of [-1, 1]) { const x = fx + s2 * 22; ell(x, cy + 5, 6, 8); g.fillStyle = css(INK); g.fill(); ell(x + 2, cy + 1, 2.4, 2.6); g.fillStyle = '#fff'; g.fill(); }
    rr(cx + rx + 4, cy - ry - 10, 12, ry + 24, 6); fillStroke(css(hc), css(dk(hc, 0.5)), 4); rr(cx + rx + 1, cy - ry - 18, 18, 14, 5); fillStroke(css([250, 214, 80]), css([160, 120, 30]), 4); }
}
function personCanvas(A, yaw) { const c = document.createElement('canvas'); c.width = S; c.height = S; const g = c.getContext('2d'); portrait(g, A, yaw); return c; }
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
  c.width = Q; c.height = Q; c.style.imageRendering = 'auto'; const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.clearRect(0, 0, Q, Q); g.drawImage(f, Math.round((Q - f.width) / 2), Q - f.height);
}
// playing offline there is no server profile: your look is kept on this phone
const SOLO = 'ourtank.look';
export function soloLook() { try { const l = JSON.parse(localStorage.getItem(SOLO) || 'null'); if (l) return normAvatar(l); } catch { /* storage unavailable */ } return normAvatar({ skin: '#c98d5e', hair: '#26232e', hairStyle: 'short', hatStyle: 'beanie', hat: '#7cc96a', top: '#2fae9a' }); }
export function saveSoloLook(l) { try { localStorage.setItem(SOLO, JSON.stringify(normAvatar(l))); } catch { /* storage unavailable */ } }

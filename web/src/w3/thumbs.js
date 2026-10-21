// Shop thumbnails that show the real in-game assets: decorations are rendered from their real models,
// fish from their real voxel sprites. Everything is cached after the first draw.
import * as THREE from 'three';
import { MORPHS } from '../game/genes.js';
import { buildItem } from './items.js';
import { Fish } from '../voxel.js';
import { SPECIES } from '../species.js';
import { Fish3D } from './fish3d.js';

const VIEW = { clam: [0.4, 0.8], ledge: [0.9, 2.6], seagrass: [1.0, 2.3], liverock: [0.3, 0.75], urchin: [0.55, 1.1], seafan: [1.4, 1.8], grass: [1.2, 1.7], fern: [1.3, 1.7], sword: [0.9, 1.3], red: [1.0, 1.5], rock: [0.3, 0.7], boulder: [0.5, 1.1], starfish: [0.3, 1.1], wood: [1.4, 2.2], pillar: [1.6, 2.0], lantern: [1.3, 1.6], chest: [0.5, 0.9], torii: [1.4, 2.4], bamboo: [1.8, 2.6], anchor: [1.2, 1.6], bridge: [1.0, 3.0], crystal: [1.2, 1.8], moss: [0.3, 0.6], kelp: [1.8, 2.4], bubbler: [0.5, 0.9], shell: [0.3, 0.7], skull: [0.5, 0.7], arch: [1.7, 2.2], lighthouse: [1.4, 3.6], spire: [1.4, 3.6], brain: [0.4, 0.9], table: [0.5, 1.0], anemone: [0.6, 1.2], coconut: [0.8, 1.6], pot: [1.1, 2.0] };
const cache = new Map(); let rr = null, sc = null, cam = null;
function setup() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 160;
  rr = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: false, preserveDrawingBuffer: true }); rr.setPixelRatio(1); rr.setSize(160, 160, false); rr.setClearColor(0x000000, 0);
  sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xcfe8ff, 0x5a4a38, 1.7)); const d = new THREE.DirectionalLight(0xfff0d0, 2.6); d.position.set(-3, 5, 6); sc.add(d);
  cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
}
// the item, cut to what was actually drawn and scaled up to fill the tile (with a little room), so a small shell is as easy to see as a pillar
function fitThumb(src, N = 160, pad = 0.1) {
  const w = src.width, h = src.height, a = document.createElement('canvas'); a.width = w; a.height = h; const ga = a.getContext('2d'); ga.drawImage(src, 0, 0);
  const d = ga.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return src.toDataURL();
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, k = Math.min(6, (N * (1 - 2 * pad)) / Math.max(bw, bh)), o = document.createElement('canvas'); o.width = o.height = N; const go = o.getContext('2d'); go.imageSmoothingEnabled = false;
  const dw = Math.round(bw * k), dh = Math.round(bh * k); go.drawImage(a, x0, y0, bw, bh, Math.round((N - dw) / 2), Math.round(N - N * pad - dh), dw, dh); return o.toDataURL();
}
export function decorThumb(type) {
  const key = 'd:' + type; if (cache.has(key)) return cache.get(key);
  try {
    if (!rr) setup();
    const [cy, s] = VIEW[type] ?? [1, 1.5], it = buildItem(type, 3); sc.add(it.group);
    it.group.rotation.y = type === 'wood' || type === 'torii' ? 0 : -0.5;
    cam.left = -s; cam.right = s; cam.top = cy + s; cam.bottom = cy - s; cam.updateProjectionMatrix(); cam.position.set(0, cy + 0.6, 10); cam.lookAt(0, cy, 0);
    rr.render(sc, cam); const url = fitThumb(rr.domElement); sc.remove(it.group); cache.set(key, url); return url;
  } catch (e) { console.warn('thumbnail failed', type, e); cache.set(key, ''); return ''; }
}
// a rare color (MORPHS) is painted over the colored parts, the same way the fish in the tank takes it on (whites, blacks and eyes stay)
function morphPaint(g, w, h, M) { const im = g.getImageData(0, 0, w, h), d = im.data;
  for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn) / 2, sat = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1)); if (sat <= 0.2) continue;
    let hh = 0; if (mx !== mn) { hh = mx === r ? ((gg - b) / (mx - mn)) % 6 : mx === gg ? (b - r) / (mx - mn) + 2 : (r - gg) / (mx - mn) + 4; hh /= 6; if (hh < 0) hh += 1; }
    const H = M.h ?? hh, S = M.s, L = Math.min(0.95, l * 0.4 + M.l * 0.6), C = (1 - Math.abs(2 * L - 1)) * S, X = C * (1 - Math.abs(((H * 6) % 2) - 1)), m = L - C / 2, sx = Math.floor(H * 6) % 6, [R, G, B] = [[C, X, 0], [X, C, 0], [0, C, X], [0, X, C], [X, 0, C], [C, 0, X]][sx];
    d[i] = (R + m) * 255; d[i + 1] = (G + m) * 255; d[i + 2] = (B + m) * 255; }
  g.putImageData(im, 0, 0); }
const trimFrame = (fr) => { const g = fr.getContext('2d'), d = g.getImageData(0, 0, fr.width, fr.height).data; let x0 = fr.width, y0 = fr.height, x1 = -1, y1 = -1; for (let y = 0; y < fr.height; y++) for (let x = 0; x < fr.width; x++) if (d[(y * fr.width + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } if (x1 < 0) return fr; const o = document.createElement('canvas'); o.width = x1 - x0 + 3; o.height = y1 - y0 + 3; o.getContext('2d').drawImage(fr, x0 - 1, y0 - 1, o.width, o.height, 0, 0, o.width, o.height); return o; };
export function fishThumb(id, pal = null, morph = null) {
  if (['turtle', 'hawksbill', 'loggerhead', 'kemps', 'leatherback'].includes(id) && !morph) { const key = 't:' + id + (pal ?? ''); if (cache.has(key)) return cache.get(key); try { if (!rr) setup();      // a sea turtle is drawn from its real 3D model, seen from a little above, mid-stroke, so its shell and flippers both show
      const f = new Fish3D(SPECIES[id], 3, { scale: 1 }); Object.assign(f, { strokeK: 0.6, flipPh: 1.3, glideK: 0, restK: 0, headYaw: 0.15, headPitch: 0.12, neckK: 0.75 }); f.setPose(0, true); f.group.position.set(0, 0, 0); f.group.rotation.set(0, 0, 0); f.group.rotateY(0.55); f.group.rotateX(0.62); sc.add(f.group);
      const box = new THREE.Box3().setFromObject(f.group), c = box.getCenter(new THREE.Vector3()), r = Math.max(box.max.x - box.min.x, box.max.y - box.min.y) * 0.56; cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r; cam.updateProjectionMatrix(); cam.position.set(c.x, c.y, 10); cam.lookAt(c.x, c.y, 0);
      rr.render(sc, cam); const url = fitThumb(rr.domElement); sc.remove(f.group); cache.set(key, url); return url; } catch (e) { console.warn('turtle thumbnail failed', e); } }
  const M = morph && MORPHS[morph], key = 'f:' + id + (pal != null ? ':' + pal : '') + (M ? ':' + morph : ''); if (cache.has(key)) return cache.get(key);
  let fr = new Fish(SPECIES[id], 2, pal != null ? { pal } : null).frame(id === 'turtle' ? { yaw: 0, pitch: 0 } : { yaw: 0 }); const c = document.createElement('canvas'); c.width = c.height = 160;
  if (id === 'turtle') fr = trimFrame(fr);      // a turtle is seen from a little above, so you see its shell and flippers, and cropped to itself (its flippers make its box much bigger than it looks)
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; const k = Math.floor(150 / Math.max(fr.width, fr.height) * 1.0) || 1;
  g.drawImage(fr, (160 - fr.width * k) / 2, (160 - fr.height * k) / 2, fr.width * k, fr.height * k); if (M) morphPaint(g, 160, 160, M); const url = c.toDataURL(); cache.set(key, url); return url;
}


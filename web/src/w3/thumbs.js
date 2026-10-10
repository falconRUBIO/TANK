// Shop thumbnails that show the real in-game assets: decorations are rendered from their real models,
// fish from their real voxel sprites. Everything is cached after the first draw.
import * as THREE from 'three';
import { buildItem } from './items.js';
import { Fish } from '../voxel.js';
import { SPECIES } from '../species.js';

const VIEW = { grass: [1.2, 1.7], fern: [1.3, 1.7], sword: [0.9, 1.3], red: [1.0, 1.5], rock: [0.3, 0.7], boulder: [0.5, 1.1], starfish: [0.3, 1.1], wood: [1.4, 2.2], pillar: [1.6, 2.0], lantern: [1.3, 1.6], chest: [0.5, 0.9], torii: [1.4, 2.4], bamboo: [1.8, 2.6], anchor: [1.2, 1.6], bridge: [1.0, 3.0], crystal: [1.2, 1.8], moss: [0.3, 0.6], kelp: [1.8, 2.4], bubbler: [0.5, 0.9], shell: [0.3, 0.7], skull: [0.5, 0.7], arch: [1.7, 2.2], lighthouse: [1.4, 3.6], spire: [1.4, 3.6], brain: [0.4, 0.9], table: [0.5, 1.0], anemone: [0.6, 1.2], coconut: [1.0, 2.0], pot: [0.9, 1.6] };
const cache = new Map(); let rr = null, sc = null, cam = null;
function setup() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 160;
  rr = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: false, preserveDrawingBuffer: true }); rr.setPixelRatio(1); rr.setSize(160, 160, false); rr.setClearColor(0x000000, 0);
  sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xcfe8ff, 0x5a4a38, 1.7)); const d = new THREE.DirectionalLight(0xfff0d0, 2.6); d.position.set(-3, 5, 6); sc.add(d);
  cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
}
export function decorThumb(type) {
  const key = 'd:' + type; if (cache.has(key)) return cache.get(key);
  try {
    if (!rr) setup();
    const [cy, s] = VIEW[type] ?? [1, 1.5], it = buildItem(type, 3); sc.add(it.group);
    it.group.rotation.y = type === 'wood' || type === 'torii' ? 0 : -0.5;
    cam.left = -s; cam.right = s; cam.top = cy + s; cam.bottom = cy - s; cam.updateProjectionMatrix(); cam.position.set(0, cy + 0.6, 10); cam.lookAt(0, cy, 0);
    rr.render(sc, cam); const url = rr.domElement.toDataURL(); sc.remove(it.group); cache.set(key, url); return url;
  } catch (e) { console.warn('thumbnail failed', type, e); cache.set(key, ''); return ''; }
}
export function fishThumb(id, pal = null) {
  const key = 'f:' + id + (pal != null ? ':' + pal : ''); if (cache.has(key)) return cache.get(key);
  const fr = new Fish(SPECIES[id], 2, pal != null ? { pal } : null).frame({ yaw: 0 }), c = document.createElement('canvas'); c.width = c.height = 160;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; const k = Math.floor(150 / Math.max(fr.width, fr.height) * 1.0) || 1;
  g.drawImage(fr, (160 - fr.width * k) / 2, (160 - fr.height * k) / 2, fr.width * k, fr.height * k); const url = c.toDataURL(); cache.set(key, url); return url;
}

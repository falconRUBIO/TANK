// Purchasable decorations. Every item is a small voxel model built with the same recipe as the fish
// (chunky cubes, smooth normals, baked AO, warm shade). Builders return a group centred on its own origin
// on the sand, plus the voxel lists that become solid collision for the fish.
import * as THREE from 'three';
import { mulberry32, fbm, mix } from '../color.js';
import { Vox, plantVox, topLit, hash, PU } from './decor.js';

const GLOW = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(1, 0.84, 0.5, THREE.SRGBColorSpace), emissive: new THREE.Color().setRGB(1, 0.6, 0.2, THREE.SRGBColorSpace), emissiveIntensity: 1.2, roughness: 0.6 });
export const lanternGlow = GLOW;

function rock(rx, ry, rz, sd) {
  const u = 0.1, v = new Vox(u), R = [rx / u, ry / u, rz / u];
  v.ellipsoid(0, 0, 0, R[0], R[1], R[2], (i, j) => {
    const n = fbm(i * 0.2 + sd, j * 0.2, sd), top = j > R[1] * 0.2;
    if (top && fbm(i * 0.3 + sd * 3, j * 0.3, 5) > 0.42) return mix([96, 134, 54], [150, 170, 70], fbm(i * 0.5, j * 0.5, sd));
    return mix([112, 112, 100], [168, 160, 138], n);
  }, sd, 0.2);
  topLit(v); return v;
}

function blob(rx, ry, rz, sd, colors) {
  const u = 0.07, v = new Vox(u); v.ellipsoid(0, 0, 0, rx / u, ry / u, rz / u, (i, j, k) => mix(colors[0], colors[1], fbm(i * 0.35 + sd, j * 0.35, k * 0.35)), sd, 0.18); topLit(v); return v;
}
const tint = (v, fn) => { for (const q of v.m.values()) q.c = fn(q.c); };
const B = {
  brain: (g, seed) => {
    const u = 0.09, v = new Vox(u); v.ellipsoid(0, 0, 0, 7.5, 5.2, 6.4, (i, j, k) => { const ridge = Math.sin((i + k * 1.3) * 1.5 + fbm(i * 0.2, k * 0.2, seed) * 4) > 0.15; return mix(ridge ? [226, 156, 132] : [180, 98, 100], [242, 196, 150], Math.max(0, Math.min(1, j / 6))); }, seed, 0.12);
    topLit(v); const m = v.mesh(); m.position.y = 0.12; g.add(m); return [{ v, x: 0, y: 0.12, z: 0, ry: 0 }];
  },
  table: (g, seed) => {
    const u = 0.1, v = new Vox(u), c = (i, j, k) => mix([236, 150, 190], [250, 214, 224], hash(i, j, k, 3) * 0.7);
    v.fill(-1, 0, -1, 1, 5, 1, [186, 104, 140]);
    for (let j = 6; j <= 8; j++) { const R = j === 6 ? 8 : j === 7 ? 9 : 7; for (let i = -R; i <= R; i++) for (let k = -R; k <= R; k++) if (i * i + k * k <= R * R + (hash(i, k, j, 5) > 0.7 ? 3 : 0)) v.set(i, j, k, c(i, j, k)); }
    topLit(v); const m = v.mesh(); m.position.y = 0.05; g.add(m); return [{ v, x: 0, y: 0.05, z: 0, ry: 0 }];
  },
  anemone: (g, seed) => {
    const u = 0.07, v = new Vox(u), r = mulberry32(seed), ph = r() * 6; for (let i = -3; i <= 3; i++) for (let k = -3; k <= 3; k++) if (i * i + k * k <= 10) for (let j = 0; j <= 3; j++) v.set(i, j, k, mix([140, 80, 108], [176, 110, 134], hash(i, j, k, 2)));
    for (let n = 0; n < 46; n++) { const a = r() * 6.283, rr = 0.4 + r() * 3.3, I = Math.round(Math.cos(a) * rr), K = Math.round(Math.sin(a) * rr), H = 12 + ((r() * 12) | 0), lean = (r() - 0.5) * 0.5, p2 = ph + r() * 3;
      for (let j = 3; j <= 3 + H; j++) { const t = (j - 3) / H, c = mix([226, 128, 170], [255, 214, 240], t); v.set(I + Math.round(lean * (j - 3) * 0.6 * Math.cos(a)), j, K + Math.round(lean * (j - 3) * 0.6 * Math.sin(a)), c, 1 + t * 0.2, Math.min(1, t * 1.2), p2); } }
    g.add(v.mesh(true)); return [];
  },

  bamboo: (g, seed) => {
    const v = new Vox(0.07), r = mulberry32(seed);
    for (const [x0, z0, H] of [[-4, 0, 70], [0, 2, 92], [4, -1, 80], [-1, -3, 56]]) {
      const ph = r() * 6; const I = Math.round(x0 * 1.2), K = z0;
      for (let j = 0; j <= H; j++) { const node = j % 17 === 0, bend = Math.round(Math.sin(j * 0.04 + ph) * 2 * (j / H)); const c = node ? [92, 124, 52] : mix([84, 160, 70], [150, 206, 96], (j % 17) / 17);
        for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) v.set(I + dx + bend, j, K + dz, mix(c, [30, 70, 40], dx ? 0.3 : 0), dx ? 0.9 : 1.1, Math.min(1, j / H), ph);
        if (node && j > 10 && j < H - 6) { v.set(I + 3 + bend, j + 1, K, [74, 150, 70], 1.1, j / H, ph); v.set(I + 4 + bend, j + 2, K, [120, 190, 84], 1.15, j / H, ph); v.set(I - 2 + bend, j + 1, K, [74, 150, 70], 1.1, j / H, ph); } }
    }
    tint(v, (c) => mix(c, [244, 152, 78], 0.78)); g.add(v.mesh(true)); return [];
  },
  lighthouse: (g) => {
    const u = 0.1, v = new Vox(u), stone = (i, j, k) => mix([112, 112, 100], [166, 158, 134], hash(i, j, k, 3)), H = 36;
    v.ellipsoid(0, 0, 0, 9, 3.5, 9, stone, 5, 0.22);
    for (let j = 3; j <= H; j++) { const r = Math.round(5 - (2 * (j - 3)) / (H - 3)), red = Math.floor((j - 3) / 6) % 2 === 0;
      for (let i = -r; i <= r; i++) for (let k = -r; k <= r; k++) { if (i * i + k * k > r * r + r * 0.8) continue; v.set(i, j, k, red ? mix([206, 58, 48], [236, 92, 74], hash(i, j, k, 2) * 0.8) : mix([232, 228, 214], [250, 246, 236], hash(i, j, k, 4) * 0.8)); } }
    for (let i = -5; i <= 5; i++) for (let k = -5; k <= 5; k++) if (i * i + k * k <= 26) v.set(i, H + 1, k, [58, 58, 66]);
    for (let a = 0; a < 6.28; a += 0.3) v.set(Math.round(Math.cos(a) * 5), H + 2, Math.round(Math.sin(a) * 5), [70, 70, 80]);
    for (let j = H + 3; j <= H + 7; j++) { const r = Math.max(0, Math.round(4.2 - (j - H - 3) * 0.95)); for (let i = -r; i <= r; i++) for (let k = -r; k <= r; k++) if (i * i + k * k <= r * r + 1) v.set(i, j + 3, k, mix([190, 52, 44], [226, 80, 66], hash(i, j, k, 6))); }
    topLit(v); const m = v.mesh(); m.position.y = 0.05; g.add(m);
    const ly = 0.05 + (H + 3.5) * u, win = new THREE.Mesh(new THREE.BoxGeometry(5 * u, 3 * u, 5 * u), GLOW); win.position.set(0, ly, 0); g.add(win);
    g.userData.lamp = new THREE.Vector3(0, ly, 0.6); return [{ v, x: 0, y: 0.05, z: 0, ry: 0 }];
  },
  spire: (g, seed) => {
    const u = 0.1, v = new Vox(u), r = mulberry32((seed | 0) + 3), pink = (i, j, k) => mix([226, 108, 144], [255, 176, 170], hash(i, j, k, 5)), H = 48;
    v.ellipsoid(0, 2, 0, 11, 4, 11, (i, j, k) => mix([200, 92, 128], [240, 140, 150], hash(i, j, k, 7)), 3, 0.3);
    for (let j = 3; j <= H; j++) { const rad = Math.max(1, Math.round(7.5 * (1 - j / (H + 6)) + Math.sin(j * 0.5) * 0.7));
      for (let i = -rad; i <= rad; i++) for (let k = -rad; k <= rad; k++) if (i * i + k * k <= rad * rad + 1) v.set(i, j, k, j > H - 4 ? mix([255, 200, 120], [255, 230, 160], hash(i, j, k, 8)) : pink(i, j, k)); }
    for (let n = 0; n < 7; n++) { const ang = n * 0.9 + r(), h0 = 10 + n * 5, len = 6 + ((r() * 5) | 0);
      for (let q = 1; q <= len; q++) { const ci = Math.round(Math.cos(ang) * (4 + q)), ck = Math.round(Math.sin(ang) * (4 + q)), cj = h0 + Math.round(q * 0.7); for (let di = -1; di <= 1; di++) for (let dk = -1; dk <= 1; dk++) for (let dj = -1; dj <= 1; dj++) if (Math.abs(di) + Math.abs(dk) + Math.abs(dj) <= 2) v.set(ci + di, cj + dj, ck + dk, mix([240, 130, 150], [255, 190, 160], hash(ci, cj, ck, 9))); } }
    topLit(v); const m = v.mesh(); m.position.y = 0.05; g.add(m); return [{ v, x: 0, y: 0.05, z: 0, ry: 0 }];
  },
  anchor: (g) => {
    const u = 0.075, v = new Vox(u), iron = (i, j, k) => mix([58, 66, 70], [96, 104, 100], hash(i, j, k, 3));
    for (let j = 0; j <= 30; j++) for (let k = -1; k <= 1; k++) for (const i of [-1, 0, 1]) v.set(i, j, k, iron(i, j, k));
    for (let i = -9; i <= 9; i++) for (let k = -1; k <= 1; k++) for (const j of [24, 25]) v.set(i, j, k, iron(i, j, k));
    for (let a = -Math.PI * 0.95; a <= -Math.PI * 0.05; a += 0.05) for (const th of [0, 1, 2]) for (let k = -1; k <= 1; k++) v.set(Math.round(Math.cos(a) * (11 - th)), Math.round(12 + Math.sin(a) * 10 - th * 0.2), k, iron(a * 10, th, k));
    for (let a = 0; a < 6.3; a += 0.15) for (let k = -1; k <= 0; k++) v.set(Math.round(Math.cos(a) * 3), 34 + Math.round(Math.sin(a) * 3), k, iron(a * 9, 2, k));
    for (const q of v.m.values()) { if (hash(q.i, q.j, q.k, 8) > 0.72) q.c = mix(q.c, [150, 96, 54], 0.6); if (!v.has(q.i, q.j + 1, q.k) && hash(q.i, q.j, q.k, 4) > 0.45) q.c = mix([96, 134, 54], [150, 176, 64], hash(q.i, q.k, 4)); }
    const m = v.mesh(); m.position.y = 0.0; g.add(m); return [{ v, x: 0, y: 0, z: 0, ry: 0 }];
  },
  bridge: (g) => {
    const u = 0.1, v = new Vox(u), wood = (i, j, k) => mix([112, 76, 44], [158, 110, 62], hash(Math.floor(i / 2), j, k, 6));
    for (let i = -16; i <= 16; i++) { const y = Math.round(9 * Math.cos((i / 16) * Math.PI / 2) ** 1.3) + 3; for (let k = -3; k <= 3; k++) { v.set(i, y, k, wood(i, y, k)); if (i % 3 === 0) v.set(i, y - 1, k, [70, 46, 28]); } }
    for (const k of [-3, 3]) for (let i = -16; i <= 16; i += 4) { const y = Math.round(9 * Math.cos((i / 16) * Math.PI / 2) ** 1.3) + 3; for (let h = 1; h <= 5; h++) v.set(i, y + h, k, wood(i, h, k)); }
    for (const k of [-3, 3]) for (let i = -16; i <= 16; i++) { const y = Math.round(9 * Math.cos((i / 16) * Math.PI / 2) ** 1.3) + 3; v.set(i, y + 5, k, wood(i, 5, k)); }
    for (const sx of [-16, 16]) for (let j = 0; j < 4; j++) for (const k of [-3, 3]) { v.set(sx, j, k, [96, 90, 80]); v.set(sx, j, k + (k > 0 ? -1 : 1), [96, 90, 80]); }
    for (const q of v.m.values()) if (!v.has(q.i, q.j + 1, q.k) && hash(q.i, q.j, q.k, 8) > 0.6) q.c = mix([96, 134, 54], [150, 176, 64], hash(q.i, q.k, 4));
    topLit(v); const m = v.mesh(); m.position.y = 0.05; g.add(m); return [{ v, x: 0, y: 0.05, z: 0, ry: 0 }];
  },
  crystal: (g, seed) => {
    const u = 0.07, v = new Vox(u), r = mulberry32(seed);
    for (const [x0, z0, H, lean] of [[0, 0, 38, 0.1], [-6, 3, 26, -0.35], [6, -2, 30, 0.4], [3, 5, 18, 0.2], [-3, -4, 22, -0.15]]) {
      for (let j = 0; j <= H; j++) { const t = j / H, w = Math.max(0, Math.round((1 - t * 0.85) * 3.4)); for (let i = -w; i <= w; i++) for (let k = -w; k <= w; k++) { if (Math.abs(i) + Math.abs(k) > w + 1) continue; const c = mix([20, 110, 240], [90, 220, 255], t * 0.8 + hash(i, j, k, 2) * 0.2); v.set(x0 + i + Math.round(lean * j), j, z0 + k, c, 1.45 + t * 0.9); } }
    }
    const m = v.mesh(); m.position.y = 0.04; g.add(m); g.userData.crystal = true; return [{ v, x: 0, y: 0.04, z: 0, ry: 0 }];
  },
  moss: (g, seed) => { const v = blob(0.38, 0.3, 0.36, seed % 7 + 1, [[160, 78, 138], [238, 152, 204]]); const m = v.mesh(); m.position.y = 0.16; g.add(m); return [{ v, x: 0, y: 0.16, z: 0, ry: 0 }]; },
  kelp: (g, seed) => { const v = new Vox(PU), r = mulberry32(seed); for (const [x, z, h] of [[-0.3, 0, 84], [0.05, 0.25, 104], [0.35, -0.1, 92]]) plantVox(v, r, [x, z], 'kelp', { h, lo: [40, 108, 56], hi: [150, 204, 84], leaf: true }); g.add(v.mesh(true)); return []; },
  bubbler: (g) => {
    const u = 0.07, v = new Vox(u); v.fill(-4, 0, -4, 4, 1, 4, [136, 140, 132]); v.fill(-3, 2, -3, 3, 3, 3, [168, 172, 164]); v.fill(-1, 4, -1, 1, 5, 1, [200, 205, 198]);
    for (const q of v.m.values()) if (hash(q.i, q.j, q.k, 5) > 0.82) q.c = mix(q.c, [96, 134, 54], 0.6); topLit(v); const m = v.mesh(); m.position.y = 0.05; g.add(m); g.userData.bubbler = new THREE.Vector3(0, 0.45, 0); return [{ v, x: 0, y: 0.05, z: 0, ry: 0 }];
  },
  shell: (g) => {
    const u = 0.07, R = 9, ridge = (i, k) => (Math.floor((Math.atan2(k, i) + Math.PI) / 0.45) & 1);
    const bot = new Vox(u), top = new Vox(u);
    for (let i = -R; i <= R; i++) for (let k = -R; k <= R; k++) { const r2 = (i * i + k * k) / (R * R); if (r2 > 1) continue; const h = Math.round(3.2 * (1 - r2)); for (let j = 0; j <= h; j++) { const c = ridge(i, k) ? [244, 196, 196] : [250, 224, 210]; bot.set(i, j, k, j === h && r2 > 0.6 ? [255, 244, 230] : c); if (k >= 0) top.set(i, j, k, ridge(i, k) ? [232, 170, 186] : [246, 206, 200]); } }
    bot.set(0, 4, 0, [255, 255, 255], 1.35); bot.set(0, 5, 0, [250, 250, 255], 1.4); bot.set(1, 4, 0, [235, 240, 255], 1.3);
    topLit(bot); const m = bot.mesh(); m.position.y = 0.05; g.add(m);
    const lm = top.mesh(); lm.position.set(0, 0.05 + 0.1, -0.25); lm.rotation.x = -1.0; g.add(lm); return [{ v: bot, x: 0, y: 0.05, z: 0, ry: 0 }];
  },
  coconut: (g, seed = 1) => {           // half a coconut lying on its side, the cut face (and its hollow) turned towards you: a dark fibrous husk with the three eyes at its far end, a ragged rim of white flesh, a deep hollow
    const u = 0.105, v = new Vox(u), R = 13, r = mulberry32(seed * 23 + 5), hole = R - 3.2, sink = 3;
    const fibre = (i, j, k) => { const a = Math.atan2(j, i), band = Math.round(a * 10 + k * 0.06), h = hash(band, Math.round(k * 0.35), 0, 3), n = hash(i, j, k, 4); return h > 0.74 ? [112, 74, 40] : h > 0.36 ? (n > 0.5 ? [80, 50, 27] : [70, 43, 23]) : [50, 30, 16]; };
    for (let i = -R - 1; i <= R + 1; i++) for (let j = -R + sink; j <= R + 1; j++) for (let k = -R - 1; k <= 1; k++) {
      const d = Math.hypot(i, j, k); if (d > R + 0.5 + (k < -2 && hash(i, j, k, 8) > 0.92 ? 1 : 0)) continue;     // a few stray fibres stand out from the husk
      if (d < hole) continue;                                                                                       // the hollow
      if (k >= 0) { if (k === 1 && hash(i, j, 0, 11) > 0.55) continue; v.set(i, j, k, d < hole + 1.6 ? (hash(i, j, 1, 12) > 0.8 ? [255, 250, 238] : [240, 232, 210]) : hash(i, j, k, 12) > 0.5 ? [150, 112, 72] : [126, 90, 56]); continue; }   // the cut rim: white flesh, then the husk in section, broken in places
      if (d < hole + 1.6) { v.set(i, j, k, hash(i, j, k, 13) > 0.85 ? [250, 244, 228] : [228, 218, 192]); continue; }   // the flesh lining the hollow
      v.set(i, j, k, d > R - 1.5 ? fibre(i, j, k) : [44, 28, 16]);
    }
    for (const [ei, ej] of [[-2.6, 2.2], [2.6, 2.2], [0, 5.4]]) for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const q = Math.hypot(i, j); if (q > 1.8) continue; const x = Math.round(ei) + i, y = Math.round(ej) + j, z = -Math.round(Math.sqrt(Math.max(0, R * R - x * x - y * y))); v.set(x, y, z, q < 0.9 ? [14, 9, 5] : [30, 20, 11]); }     // the three eyes, on the far end
    for (let n = 0; n < 12; n++) { const i = Math.round((r() - 0.5) * 16), k = -Math.round(1 + r() * 9), j = Math.round(Math.sqrt(Math.max(0, R * R - i * i - k * k))); if (j > 5) { v.set(i, j + 1, k, [96, 140, 60]); if (r() < 0.5) v.set(i + 1, j + 1, k, [122, 164, 76]); } }      // a little algae along the top
    const y0 = (R - sink) * u; const m = v.mesh(); m.position.y = y0; g.add(m); return [{ v, x: 0, y: y0, z: 0, ry: 0 }];      // it rests on the sand with the bottom of the husk just buried
  },
  pot: (g) => {                         // a clay pot lying on its side, mouth towards the front, big enough to curl up inside
    const u = 0.12, v = new Vox(u); const rad = (i) => 7 - Math.abs(i - 1) * 0.28 + (i < -3 ? (i + 3) * 0.6 : 0);
    for (let i = -9; i <= 8; i++) { const r = Math.max(2.5, rad(i)); for (let j = 0; j <= 14; j++) for (let k = -8; k <= 8; k++) { const d = Math.hypot(j - 7, k), inner = i > 3 && d < r - 2 || (i > -2 && d < r - 2.4); if (d > r || inner) continue; v.set(i, j, k, hash(i, j, k, 3) > 0.7 ? [150, 78, 48] : [128, 62, 40]); } }
    for (let k = -7; k <= 7; k++) for (let j = 0; j <= 14; j++) { const d = Math.hypot(j - 7, k); if (d <= 7 && d > 5.3 && hash(j, k, 1, 4) > 0.2) v.set(9, j, k, [104, 50, 34]); }
    topLit(v); const m = v.mesh(); m.position.y = 0.04; m.rotation.y = -Math.PI / 2; g.add(m); return [{ v, x: 0, y: 0.04, z: 0, ry: -Math.PI / 2 }];
  },
  skull: (g) => {
    const u = 0.065, v = new Vox(u), bone = (i, j, k) => mix([214, 206, 184], [240, 232, 208], hash(i, j, k, 2));
    v.ellipsoid(0, 7, 0, 6, 5.5, 5.2, bone, 3, 0.1); v.fill(-3, 1, -3, 3, 3, 3, bone); for (let i = -3; i <= 3; i += 2) v.set(i, 1, 3, [90, 84, 70]);
    for (const sx of [-3, 3]) v.fill(sx - 1, 6, 4, sx + 1, 8, 5, [34, 30, 28]); v.fill(0, 4, 5, 0, 5, 5, [50, 44, 40]);
    for (const q of v.m.values()) if (!v.has(q.i, q.j + 1, q.k) && hash(q.i, q.j, q.k, 8) > 0.45) q.c = mix([96, 134, 54], [150, 176, 64], hash(q.i, q.k, 4));
    topLit(v); const m = v.mesh(); m.position.y = 0.04; g.add(m); return [{ v, x: 0, y: 0.04, z: 0, ry: 0 }];
  },
  arch: (g) => {
    const u = 0.12, v = new Vox(u), br = (i, j, k) => { let c = mix([150, 140, 112], [204, 190, 150], hash(Math.floor((i + (Math.floor(j / 4) & 1) * 3) / 6), Math.floor(j / 4), 1)); if (j % 4 === 0 || (i + (Math.floor(j / 4) & 1) * 3) % 6 === 0) c = mix(c, [70, 62, 44], 0.55); return c; };
    for (let i = -13; i <= 13; i++) for (let j = 0; j <= 26; j++) for (let k = -3; k <= 3; k++) { const dx = i / 8, inside = j <= 12 ? Math.abs(i) <= 8 : dx * dx + ((j - 12) / 8) ** 2 < 1; if (inside) continue; if (j > 22 && hash(i, j, k, 4) > 0.5) continue; if (Math.abs(i) > 13 - Math.max(0, j - 18) * 0.7) continue; v.set(i, j, k, br(i, j, k)); }
    for (const q of v.m.values()) if (!v.has(q.i, q.j + 1, q.k) && hash(q.i, q.j, q.k, 8) > 0.4) q.c = mix([96, 134, 54], [150, 176, 64], hash(q.i, q.k, 4));
    topLit(v); const m = v.mesh(); m.position.y = 0.04; g.add(m); return [{ v, x: 0, y: 0.04, z: 0, ry: 0 }];
  },
  grass: (g, seed) => { const v = new Vox(PU), r = mulberry32(seed); plantVox(v, r, [0, 0], 'grass', { h: 32 + ((r() * 10) | 0), n: 5, low: [40, 112, 84], high: [150, 222, 150] }); g.add(v.mesh(true)); return []; },
  fern: (g, seed) => { const v = new Vox(PU), r = mulberry32(seed); plantVox(v, r, [0, 0], 'fern', { h: 50 + ((r() * 12) | 0), side: seed & 1 ? 1 : -1, low: [124, 48, 156], high: [246, 140, 210] }); tint(v, (c) => (c[1] > c[0] && c[1] > c[2] ? mix(c, [150, 70, 150], 0.7) : c)); g.add(v.mesh(true)); return []; },
  sword: (g, seed) => { const v = new Vox(PU), r = mulberry32(seed); plantVox(v, r, [0, 0], 'sword'); tint(v, (c) => mix(c, [168, 138, 56], 0.6)); g.add(v.mesh(true)); return []; },
  red: (g, seed) => { const v = new Vox(PU), r = mulberry32(seed); plantVox(v, r, [0, 0], 'red', { h: 34 + ((r() * 10) | 0) }); g.add(v.mesh(true)); return []; },
  rock: (g, seed) => { const v = rock(0.55, 0.36, 0.5, seed % 9 + 1); const m = v.mesh(); m.position.y = 0.1; g.add(m); return [{ v, x: 0, y: 0.1, z: 0, ry: 0 }]; },
  boulder: (g, seed) => { const v = rock(1.2, 0.78, 0.9, seed % 9 + 1); const m = v.mesh(); m.position.y = 0.2; g.add(m); return [{ v, x: 0, y: 0.2, z: 0, ry: 0 }]; },
  starfish: (g, seed = 1) => {                       // a proper sea star: five tapering arms with a ridge of pale knobs, a raised centre, a cream underside, in orange or violet
    const u = 0.09, v = new Vox(u), r = mulberry32(seed * 17 + 3), violet = r() < 0.3, hi = violet ? [150, 90, 200] : [244, 110, 44], lo = violet ? [96, 54, 140] : [196, 70, 30], knob = violet ? [228, 206, 255] : [255, 222, 160], under = [250, 232, 200], tilt = (r() - 0.5) * 0.5;
    for (let a = 0; a < 5; a++) { const an = a * 1.2566 + tilt + (r() - 0.5) * 0.15, L = 8 + Math.round(r() * 2);
      for (let s = 0; s <= L; s++) { const t = s / L, w = Math.max(0.6, 2.4 * (1 - t) + 0.3), cx = Math.cos(an) * s, cz = Math.sin(an) * s;
        for (let i = Math.floor(cx - w); i <= Math.ceil(cx + w); i++) for (let k = Math.floor(cz - w); k <= Math.ceil(cz + w); k++) { const d = Math.hypot(i - cx, k - cz); if (d > w) continue;
          const c = mix(lo, hi, 0.35 + 0.65 * (1 - d / w)); v.set(i, 0, k, under); v.set(i, 1, k, c); if (d < w * 0.5 && t < 0.92) v.set(i, 2, k, c); if (d < 0.6 && s % 2 === 0 && t > 0.1) v.set(i, 3, k, knob, 1.15); } } }
    for (let i = -2; i <= 2; i++) for (let k = -2; k <= 2; k++) if (Math.hypot(i, k) <= 2.2) { v.set(i, 2, k, hi); v.set(i, 3, k, Math.hypot(i, k) < 1.2 ? knob : hi); }
    topLit(v); const m = v.mesh(); m.position.y = 0.03; m.rotation.y = r() * 6.28; g.add(m); return [];
  },
  wood: (g) => {
    const u = 0.1, v = new Vox(u);
    const path = new THREE.CatmullRomCurve3([[-2.8, 0.15, 0], [-2.3, 1.0, 0.1], [-1.6, 1.9, 0], [-0.9, 1.6, 0.1], [-0.2, 0.9, 0], [0.5, 0.4, 0.1], [1.4, 0.25, 0]].map((a) => new THREE.Vector3(...a)));
    const branch = new THREE.CatmullRomCurve3([[-1.6, 1.9, 0], [-1.2, 2.6, 0], [-0.9, 3.3, 0.05]].map((a) => new THREE.Vector3(...a)));
    const tube = (curve, r0, r1) => { const N = 70; for (let n = 0; n <= N; n++) { const t = n / N, p = curve.getPoint(t), r = (r0 + (r1 - r0) * t) / u, ci = Math.round(p.x / u), cj = Math.round(p.y / u), ck = Math.round(p.z / u);
      for (let i = ci - Math.ceil(r); i <= ci + Math.ceil(r); i++) for (let j = cj - Math.ceil(r); j <= cj + Math.ceil(r); j++) for (let k = ck - Math.ceil(r); k <= ck + Math.ceil(r); k++) if ((i * u - p.x) ** 2 + (j * u - p.y) ** 2 + (k * u - p.z) ** 2 <= (r * u) ** 2 && !v.has(i, j, k)) v.set(i, j, k, mix([52, 33, 20], [112, 76, 44], fbm(i * 0.18, j * 0.5, k * 0.18))); } };
    tube(path, 0.46, 0.24); tube(branch, 0.19, 0.09); topLit(v); g.add(v.mesh()); return [{ v, x: 0, y: 0, z: 0, ry: 0 }];
  },
  pillar: (g, seed) => {
    const u = 0.1, v = new Vox(u), H = 30 + (seed % 8);
    const stone = (i, j, k) => { const course = Math.floor(j / 4); let c = mix([160, 150, 120], [204, 190, 150], hash(Math.floor((i + 8) / 4), course, 1)); if (j % 4 === 0) c = mix(c, [70, 62, 44], 0.55); return c; };
    v.fill(-5, 0, -5, 5, 2, 5, stone);
    for (let j = 3; j <= H; j++) for (let i = -3; i <= 3; i++) for (let k = -3; k <= 3; k++) { if (Math.abs(i) + Math.abs(k) > 5) continue; if (j > H - 4 && hash(i, j, k, 6) > 0.45) continue; if ((i === -3 || i === 3) && (j & 3) === 0 && false) continue; v.set(i, j, k, stone(i, j, k)); }
    for (const q of v.m.values()) if (!v.has(q.i, q.j + 1, q.k) && hash(q.i, q.j, q.k, 8) > 0.35) q.c = mix([96, 134, 54], [150, 176, 64], hash(q.i, q.k, 4));
    topLit(v); g.add(v.mesh()); return [{ v, x: 0, y: 0, z: 0, ry: 0 }];
  },
  lantern: (g) => {
    const u = 0.115, v = new Vox(u), stone = (i, j, k) => mix([140, 140, 124], [176, 170, 146], hash(i, j, k, 3) * 0.7);
    v.fill(-4, 0, -4, 4, 1, 4, stone); v.fill(-1, 2, -1, 1, 8, 1, stone); v.fill(-3, 9, -3, 3, 10, 3, stone); v.fill(-2, 11, -2, 2, 15, 2, stone);
    v.fill(-5, 16, -5, 5, 16, 5, stone); v.fill(-4, 17, -4, 4, 17, 4, stone); v.fill(-3, 18, -3, 3, 18, 3, stone); v.fill(-1, 19, -1, 1, 20, 1, stone); v.set(0, 21, 0, stone(0, 21, 0));
    for (const q of v.m.values()) if (q.j >= 16 && !v.has(q.i, q.j + 1, q.k) && hash(q.i, q.j, q.k, 9) > 0.35) q.c = mix([96, 134, 54], [136, 160, 66], hash(q.i, q.k, 4));
    topLit(v); const m = v.mesh(); m.position.y = 0.1; g.add(m);
    for (const sd of [1, -1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(3 * u, 3 * u, 0.04), GLOW); w.position.set(0, 0.1 + 13 * u, sd * (2 * u + 0.03)); g.add(w); }
    g.userData.lamp = new THREE.Vector3(0, 0.1 + 13 * u, 0.5); return [{ v, x: 0, y: 0.1, z: 0, ry: 0 }];
  },
  chest: (g) => {
    const u = 0.1, v = new Vox(u), r = mulberry32(7), wood = (i, j) => mix([116, 78, 42], [146, 100, 54], (j & 1) * 0.5 + hash(i, j, 1) * 0.3);
    v.fill(-5, 0, -3, 5, 4, 3, wood); v.fill(-5, 0, -3, -4, 4, 3, [70, 72, 80]); v.fill(4, 0, -3, 5, 4, 3, [70, 72, 80]); v.fill(-4, 4, -2, 4, 4, 2, [255, 206, 72]);
    for (let n = 0; n < 14; n++) v.set(-3 + ((r() * 7) | 0), 5, -1 + ((r() * 3) | 0), [255, 214, 90], 1.3);
    v.set(1, 5, 0, [230, 70, 90], 1.2); v.set(-2, 5, 1, [90, 200, 240], 1.2);
    const m = v.mesh(); m.position.y = 0.12; g.add(m);
    const lid = new Vox(u); lid.fill(-5, 0, 0, 5, 1, 6, wood); lid.fill(-4, 2, 0, 4, 2, 6, wood); lid.fill(-5, 0, 0, -4, 2, 6, [70, 72, 80]); lid.fill(4, 0, 0, 5, 2, 6, [70, 72, 80]);
    const lm = lid.mesh(); lm.position.set(0, 0.12 + 5 * u, -3 * u); lm.rotation.x = -0.9; g.add(lm); return [{ v, x: 0, y: 0.12, z: 0, ry: 0 }];
  },
  torii: (g) => {
    const u = 0.14, v = new Vox(u), red = (i, j, k) => mix([192, 48, 38], [218, 70, 54], hash(i, j, k, 2) * 0.8);
    v.fill(-9, 0, -2, -6, 0, 1, [120, 120, 108]); v.fill(6, 0, -2, 9, 0, 1, [120, 120, 108]); v.fill(-8, 1, -1, -7, 15, 0, red); v.fill(7, 1, -1, 8, 15, 0, red);
    v.fill(-7, 12, -1, 7, 13, 0, red); v.fill(-10, 16, -1, 10, 16, 0, red); v.fill(-11, 17, -1, 11, 18, 1, red); v.fill(-12, 19, -1, -11, 19, 1, red); v.fill(11, 19, -1, 12, 19, 1, red); v.fill(-11, 19, -1, 11, 19, 1, [44, 40, 44]);
    for (const q of v.m.values()) if (q.j <= 3 && hash(q.i, q.j, q.k, 7) > 0.5) q.c = mix(q.c, [96, 134, 54], 0.55);
    topLit(v); const m = v.mesh(); m.position.y = 0.05; g.add(m); return [{ v, x: 0, y: 0.05, z: 0, ry: 0 }];
  },
};

// build one item: returns { group, parts, lamp }
export function buildItem(type, seed = 1) {
  const group = new THREE.Group(), parts = B[type](group, seed);
  return { group, parts, lamp: group.userData.lamp ?? null, type };
}
const world = (it, x, z, ry, p) => { const c = Math.cos(ry), s = Math.sin(ry); return [x + p.x * c + p.z * s, p.y, z - p.x * s + p.z * c, ry + p.ry]; };
export function stampItem(it, solids, x, z, ry, d = 1) { for (const p of it.parts) { const [wx, wy, wz, r] = world(it, x, z, ry, p); solids.addVox(p.v, wx, wy, wz, r, d); } }
export function itemOverlaps(it, solids, x, z, ry) { let n = 0; for (const p of it.parts) { const [wx, wy, wz, r] = world(it, x, z, ry, p); n += solids.overlaps(p.v, wx, wy, wz, r); } return n; }
export function placeGroup(it, x, z, ry) { it.group.position.set(x, 0, z); it.group.rotation.y = ry; }
export function disposeItem(it) { it.group.traverse((o) => { if (o.isInstancedMesh) { o.geometry.dispose(); o.dispose?.(); } }); }

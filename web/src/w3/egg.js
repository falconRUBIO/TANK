// Fish eggs in the tank, laid the way each kind really lays them (see makeEgg), resting where nothing overlaps them.
import * as THREE from 'three';
import { sandH } from './terrain.js';

const RX = 0.4, RY = 0.5;                         // the room a clutch takes: half its width, and the height its middle sits above the sand

// A clutch, as real reef fish lay them: not one big egg but a patch of dozens of tiny ones, stuck down side by side on a rock or at the foot of
// a plant. Day by day they change as they would: bright and see-through, then a dark speck in each (the eyes), and at the end silvery, the
// little eyes plain to see, the whole patch trembling. mode 'drift': a loose cloud of clear eggs floating in the water instead (the kinds
// that spawn in open water); mode 'mouth': a few eggs showing at a father's lips (the cardinalfish carry theirs).
const EGG = 0.105, EYE = 0.04;
export function makeEgg(seed = 1, tint = 0xf06a9a, mode = 'guard') {
  let h = seed >>> 0; const rnd = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 4294967296);
  const group = new THREE.Group(), drift = mode === 'drift', mouth = mode === 'mouth', den = mode === 'den', N = mouth ? 7 : drift ? 34 : den ? 64 : 52, cells = [];
  for (let i = 0; i < N && cells.length < N; i++) {
    let x, y, z;
    if (den) { const k = i % 8, j = Math.floor(i / 8), a = -0.9 + k * 0.26 + (rnd() - 0.5) * 0.06; x = Math.sin(a) * 0.48; z = Math.cos(a) * 0.16 - 0.05; y = 0.5 - j * EGG * 0.78 - (k % 2) * 0.03; cells.push({ x, y, z, s: 0.85 + 0.3 * Math.sin((j / 7) * Math.PI) + rnd() * 0.1, ph: rnd() * 6.28, st: k, dn: j }); continue; }      // an octopus's eggs: strings of tiny teardrops hung in an arc from the roof of her den, fattest in the middle of each string
    if (mouth) { x = (rnd() - 0.5) * 0.14; y = (rnd() - 0.5) * 0.1; z = (rnd() - 0.5) * 0.12; }
    else if (drift) { const a = rnd() * Math.PI * 2, b = Math.acos(2 * rnd() - 1), r = 0.75 * Math.cbrt(rnd()); x = r * Math.sin(b) * Math.cos(a); y = r * Math.cos(b) * 0.8; z = r * Math.sin(b) * Math.sin(a); }
    else { const a = (i * 2.399963) % (Math.PI * 2), r = Math.sqrt(i / N) * 0.5; x = Math.cos(a) * r * 1.25; z = Math.sin(a) * r * 0.8; y = -RY + EGG * 0.5 + (r < 0.2 ? EGG * 0.75 : 0) + rnd() * 0.012; }      // packed side by side in a low oval mound
    cells.push({ x, y, z, s: (drift ? 0.55 : 0.8) + rnd() * (drift ? 0.2 : 0.35), ph: rnd() * 6.28 });      // (open-water eggs are tiny, and spread out)
  }
  const box = new THREE.BoxGeometry(EGG, EGG, EGG), tiny = new THREE.BoxGeometry(EYE, EYE, EYE);
  const base = new THREE.Color(tint), silver = new THREE.Color(0xdfe9f2);
  const shellMat = new THREE.MeshLambertMaterial({ color: base.clone(), transparent: true, opacity: drift ? 0.5 : den ? 0.78 : 0.92, depthWrite: false, emissive: base.clone().multiplyScalar(0.22) });
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x15121c, emissive: 0x050408 });
  const shell = new THREE.InstancedMesh(box, shellMat, cells.length), eyes = new THREE.InstancedMesh(tiny, eyeMat, cells.length); shell.renderOrder = 5;
  group.add(eyes, shell);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20), new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = -RY + 0.01; glow.visible = !drift && !mouth; if (den) { glow.position.y = -0.3; glow.scale.setScalar(0.6); } group.add(glow);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const pose = (t, shake) => { for (let i = 0; i < cells.length; i++) { const c = cells[i], sway = den ? Math.sin(t * 1.1 + c.st * 0.7) * 0.012 * c.dn : 0, w = shake * Math.sin(t * 17 + c.ph * 3) * 0.012 + sway, bob = drift ? Math.sin(t * 0.9 + c.ph) * 0.02 : 0;      /* (the strings sway in the current, more toward their tips) */
      v.set(c.x + w, c.y + bob, c.z); sc.setScalar(c.s); m.compose(v, q, sc); shell.setMatrixAt(i, m);
      v.y += EGG * 0.12 * c.s; v.z += EGG * 0.18 * c.s; sc.setScalar(c.s * Math.min(1, egg.eyeK ?? 0)); m.compose(v, q, sc); eyes.setMatrixAt(i, m); }
    shell.instanceMatrix.needsUpdate = eyes.instanceMatrix.needsUpdate = true; };
  const egg = { group, shell, eyes, glow, mode, t0: rnd() * 6, eyeK: 0,
    // p: how far along (0 just laid, 1 hatching); cared: days looked after
    set(p, cared) {
      egg.p = p; egg.eyeK = Math.max(0, Math.min(1, (p - 0.35) / 0.25));                         // eyes show from about the second day
      shellMat.color.copy(base).lerp(silver, Math.max(0, (p - 0.6) / 0.4) * 0.4); shellMat.emissive.copy(shellMat.color).multiplyScalar(0.18 + (cared >= 2 ? 0.08 : 0));      // turning silvery near the end
      glow.material.opacity = cared >= 2 ? 0.26 : cared === 1 ? 0.13 : 0;
    },
    tick(t) { const p = egg.p ?? 0, near = Math.max(0, (p - 0.85) / 0.15);
      if (egg.ready) { const beat = Math.max(0, Math.sin(t * 3.1 + egg.t0)); pose(t, 1.6 + 1.4 * beat * beat); glow.material.opacity = 0.22 + 0.2 * (0.5 + 0.5 * Math.sin(t * 2.2)); }      // ready: wriggling in little bursts, glowing softly in and out
      else pose(t, near * (Math.sin(t * 2.3 + egg.t0) > 0.3 ? 1 : 0.3)); if (drift) { group.rotation.y = t * 0.08 + egg.t0; } },
    dispose() { group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); },
  };
  egg.set(0, 0); pose(0, 0); return egg;
}

const PLANTS = ['grass', 'fern', 'sword', 'red', 'kelp', 'anemone', 'bamboo', 'seafan'];
// where to put it: at the foot of a plant (rocks next), beside it, at a depth the camera keeps sharp, clear of every other thing; else a clear patch of sand
export function eggSpot(spots, reach, hash, taken = [], on = 'plant') {
  const clear = (x, z) => Math.abs(x) < 6.2 && z > -1.8 && z < 1.1 && spots.every((s) => Math.hypot(s.x - x, s.z - z) >= reach(s.type) * 0.5 + RX) && taken.every((p) => Math.hypot(p.x - x, p.z - z) > 0.9);
  const plants = spots.filter((s) => PLANTS.includes(s.type)), rocks = spots.filter((s) => ['rock', 'boulder', 'shell', 'moss', 'wood', 'pillar'].includes(s.type)), homes = on === 'rock' ? [...rocks, ...plants] : [...plants, ...rocks];      // most lay on a rock face; a royal gramma by the weed
  for (let k = 0; k < homes.length; k++) { const s = homes[(hash + k) % homes.length], r = reach(s.type) * 0.75 + RX;
    // only beside it, never behind: a little toward you at most, so the leaves never hide it (sin > 0 is toward the camera)
    const R = [0.12, 0.35, -0.05], sides = hash & 1 ? [R, R.map((a) => Math.PI - a)] : [R.map((a) => Math.PI - a), R];
    for (const a of sides.flat()) { const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r; if (clear(x, z)) return { x, z, by: s.type }; } }
  for (let j = 0; j < 40; j++) { const x = -3 + (((hash >> (j % 16)) + j * 37) % 60) / 10, z = -0.8 + (((hash >> 3) + j * 53) % 18) / 10; if (clear(x, z)) return { x, z, by: null }; }
  return { x: -2 + (hash % 40) / 10, z: 0.6, by: null };
}
// resting on the sand: on the highest point under it, so it never sinks into a slope
export const eggY = (x, z) => Math.max(sandH(x, z), sandH(x + RX, z), sandH(x - RX, z), sandH(x, z + RX), sandH(x, z - RX)) + RY - 0.03;

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
  { const w = new THREE.Color(1, 1, 1); for (let i = 0; i < cells.length; i++) shell.setColorAt(i, w); }      // (each egg its own color: an empty case goes pale)
  group.add(eyes, shell);
  // the one that stays: a bigger egg in the middle of the patch, the baby's dark shape and its two eyes showing through near the end. It cracks last
  let big = null; if (!den && !mouth) { big = new THREE.Group(); const bm = new THREE.Mesh(new THREE.BoxGeometry(EGG * 2.1, EGG * 2.3, EGG * 2.1), shellMat), core = new THREE.Mesh(new THREE.BoxGeometry(EGG * 1.1, EGG * 0.8, EGG * 1.5), new THREE.MeshLambertMaterial({ color: 0x2a2030, transparent: true, opacity: 0 })), crack = new THREE.Mesh(new THREE.BoxGeometry(EGG * 0.18, EGG * 1.5, EGG * 2.16), new THREE.MeshBasicMaterial({ color: 0x1a1218, transparent: true, opacity: 0 }));
    crack.rotation.z = 0.5; bm.renderOrder = 6; big.add(core, bm, crack); for (const s of [-1, 1]) { const ey = new THREE.Mesh(tiny, eyeMat); ey.position.set(EGG * 0.55, EGG * 0.15, s * EGG * 0.35); ey.scale.setScalar(1.4); big.add(ey); }
    big.position.set(0, drift ? 0 : -RY + EGG * 1.5, 0); big.userData = { bm, core, crack }; group.add(big); }
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20), new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = -RY + 0.01; glow.visible = !drift && !mouth; if (den) { glow.position.y = -0.3; glow.scale.setScalar(0.6); } group.add(glow);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const HUSK = new THREE.Color(1.25, 1.22, 1.18), _c = new THREE.Color(); let recolor = false;
  const pose = (t, shake) => { const fk = egg.fadeK ?? 1;
    for (let i = 0; i < cells.length; i++) { const c = cells[i], sway = den ? Math.sin(t * 1.1 + c.st * 0.7) * 0.012 * c.dn : 0, bob = drift ? Math.sin(t * 0.9 + c.ph) * 0.02 : 0, age = c.popAt == null ? -1e9 : t - c.popAt;      /* (the strings sway in the current, more toward their tips) */
      if (c.gone) { m.makeScale(0, 0, 0); shell.setMatrixAt(i, m); eyes.setMatrixAt(i, m); continue; }      // (hatched before this phone looked: only the rest of the clutch is drawn)
      if (age >= 0.16) {      // hatched: an empty case, split and slumped on the sand, pale, its little eyes gone
        if (!c.husk) { c.husk = true; shell.setColorAt(i, HUSK); recolor = true; }
        v.set(c.x + sway, c.y + bob - EGG * 0.22 * c.s, c.z); sc.set(c.s * 1.12 * fk, c.s * 0.4 * fk, c.s * 1.12 * fk); m.compose(v, q, sc); shell.setMatrixAt(i, m); m.makeScale(0, 0, 0); eyes.setMatrixAt(i, m); continue; }
      const pre = age > -0.45 && age < 0 ? 1 + 3 * (1 + age / 0.45) : 1, pop = age >= 0 ? 1 + 2.2 * age : 1;      // the moment before: a hard little shiver, then it swells and bursts
      const w = (shake * pre) * Math.sin(t * 17 + c.ph * 3) * 0.012 + sway;
      v.set(c.x + w, c.y + bob, c.z); sc.setScalar(c.s * pop); m.compose(v, q, sc); shell.setMatrixAt(i, m);
      v.y += EGG * 0.12 * c.s; v.z += EGG * 0.18 * c.s; sc.setScalar(c.s * Math.min(1, egg.eyeK ?? 0) * (1 + 0.25 * (egg.build ?? 0))); m.compose(v, q, sc); eyes.setMatrixAt(i, m); }
    shell.instanceMatrix.needsUpdate = eyes.instanceMatrix.needsUpdate = true; if (recolor && shell.instanceColor) { shell.instanceColor.needsUpdate = true; recolor = false; }
    if (big && big.visible) { const U = big.userData, ca = egg.crackAt == null ? -1e9 : t - egg.crackAt, hard = ca >= 0 ? 1 + 4 * Math.min(1, ca / 0.7) : 1;      // the big egg rocks with the others, then, cracking, hard; the baby's shape darkens inside it
      big.rotation.z = shake * hard * 0.05 * Math.sin(t * 11 + 1.3); big.rotation.x = shake * hard * 0.03 * Math.sin(t * 7.7); big.scale.setScalar(1 + 0.04 * shake * Math.max(0, Math.sin(t * 5.2)) + (ca >= 0 ? 0.12 * Math.min(1, ca / 0.7) : 0));
      U.core.material.opacity = Math.min(0.85, Math.max(0, ((egg.p ?? 0) - 0.55) / 0.45) * 0.6 + (egg.build ?? 0) * 0.3); U.crack.material.opacity = ca >= 0 ? Math.min(1, ca / 0.25) : 0; U.crack.scale.y = ca >= 0 ? Math.min(1.25, 0.4 + ca * 1.4) : 0.4; } };
  const egg = { group, shell, eyes, glow, mode, big, t0: rnd() * 6, eyeK: 0, tNow: 0,
    // pop part of the clutch (frac of the eggs still whole), outer ones first, over span seconds starting in start seconds: returns where and when each one bursts
    popWave(frac = 1, span = 3, start = 0) { const live = cells.map((c, i) => [c, i]).filter(([c]) => c.popAt == null && !c.gone), n = Math.round(live.length * Math.max(0, Math.min(1, frac))), out = [];
      live.sort((a, b) => Math.hypot(b[0].x, b[0].z) + b[0].ph * 0.02 - (Math.hypot(a[0].x, a[0].z) + a[0].ph * 0.02));      // (from the edge in: the ones in the middle, where the baby lies, go last)
      for (let k = 0; k < n; k++) { const [c] = live[k], d = start + span * (k / Math.max(1, n)) * (0.85 + 0.3 * ((c.ph * 7) % 1)); c.popAt = egg.tNow + d; out.push({ x: c.x, y: c.y, z: c.z, delay: d }); }
      return out; },
    popSome(k = 1) { return egg.popWave(Math.min(1, k / Math.max(1, cells.filter((c) => c.popAt == null && !c.gone).length)), 0.01, 0.4); },      // one or two go early, while you watch
    preHatched(frac) { const live = cells.filter((c) => !c.gone).sort((a, b) => Math.hypot(b.x, b.z) - Math.hypot(a.x, a.z)); for (let k = 0; k < Math.round(live.length * frac); k++) live[k].gone = true; if (big) big.visible = false; },      // (opened on a clutch already part hatched)
    crackBig(delay = 0) { if (!big || !big.visible) return null; egg.crackAt = egg.tNow + delay; const p = new THREE.Vector3(); big.getWorldPosition(p); return p; },
    hideBig() { if (big) big.visible = false; },
    liveCount() { return cells.filter((c) => c.popAt == null && !c.gone).length; },
    // p: how far along (0 just laid, 1 hatching); cared: days looked after
    set(p, cared) {
      egg.p = p; egg.eyeK = Math.max(0, Math.min(1, (p - 0.35) / 0.25));                         // eyes show from about the second day
      shellMat.color.copy(base).lerp(silver, Math.max(0, (p - 0.6) / 0.4) * 0.4); shellMat.emissive.copy(shellMat.color).multiplyScalar(0.18 + (cared >= 2 ? 0.08 : 0));      // turning silvery near the end
      glow.material.opacity = cared >= 2 ? 0.26 : cared === 1 ? 0.13 : 0;
    },
    tick(t) { egg.tNow = t; const p = egg.p ?? 0, near = Math.max(0, (p - 0.85) / 0.15), b = egg.build ?? 0;
      if (egg.done) { pose(t, 0); glow.material.opacity = Math.max(0, glow.material.opacity - 0.01); }      // all hatched: the empty cases lie still
      else if (egg.ready) { const beat = Math.max(0, Math.sin(t * (3.1 + 2.5 * b) + egg.t0)); pose(t, (1.6 + 1.4 * beat * beat) * (1 + 1.3 * b)); glow.material.opacity = 0.22 + 0.2 * (0.5 + 0.5 * Math.sin(t * (2.2 + 2 * b))) + 0.15 * b; }      // ready: wriggling in little bursts, glowing softly in and out; while you watch it builds
      else pose(t, near * (Math.sin(t * 2.3 + egg.t0) > 0.3 ? 1 : 0.3)); if (drift) { group.rotation.y = t * 0.08 + egg.t0; } },
    dispose() { group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); },
  };
  egg.set(0, 0); pose(0, 0); return egg;
}

const PLANTS = ['grass', 'fern', 'sword', 'red', 'kelp', 'anemone', 'bamboo', 'seafan', 'seagrass', 'mangrove'];
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

// A fish egg in the tank: a small voxel egg with a clear, jelly-like shell and a little one growing inside it over three days.
// It is tucked in at the foot of a plant (or a rock) where nothing overlaps it, rests on the sand, and wobbles when it is nearly ready.
import * as THREE from 'three';
import { sandH } from './terrain.js';

const V = 0.08;                                   // one voxel
const RX = 0.4, RY = 0.5;                         // the egg's half width and half height

// one mesh from a set of voxels, only the faces that show
function voxMesh(cells, mat) {
  const key = (x, y, z) => x + ',' + y + ',' + z, has = new Set(cells.map((c) => key(c.x, c.y, c.z)));
  const pos = [], nor = [], col = [], F = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const c of cells) for (const [nx, ny, nz] of F) {
    if (has.has(key(c.x + nx, c.y + ny, c.z + nz))) continue;
    // four corners of the face, wound so the face points outward
    const cx = (c.x + nx / 2) * V, cy = (c.y + ny / 2) * V, cz = (c.z + nz / 2) * V, A = nx ? [0, 0, 1] : [1, 0, 0], B = nz ? [0, 1, 0] : ny ? [0, 0, 1] : [0, 1, 0];
    const p = (i, j) => [cx + (A[0] * i + B[0] * j) * V / 2, cy + (A[1] * i + B[1] * j) * V / 2, cz + (A[2] * i + B[2] * j) * V / 2], flip = (nx + ny) > 0 || nz < 0;      // (A × B points along -x, -y or +z)
    const q = !flip ? [p(-1, -1), p(1, -1), p(1, 1), p(-1, -1), p(1, 1), p(-1, 1)] : [p(-1, -1), p(1, 1), p(1, -1), p(-1, -1), p(-1, 1), p(1, 1)];
    for (const v of q) { pos.push(...v); nor.push(nx, ny, nz); col.push(c.c.r, c.c.g, c.c.b); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Mesh(g, mat);
}

const inEgg = (x, y, z, sx = 1) => { const px = (x * V) / (RX * sx), pz = (z * V) / (RX * sx), py = (y * V) / RY; const k = py > 0 ? 1 - py * 0.12 : 1; return px * px + pz * pz < k * k * (1 - py * py); };     // a real egg: a little narrower at the top

export function makeEgg(seed = 1, tint = 0xf06a9a) {
  const group = new THREE.Group(), base = new THREE.Color(tint), shell = [], R = Math.ceil(RY / V) + 1;
  let h = seed >>> 0; const rnd = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) for (let z = -R; z <= R; z++) {
    if (!inEgg(x, y, z) || inEgg(x, y, z, 0.78)) continue;                 // a shell a voxel or two thick
    const c = base.clone().offsetHSL((rnd() - 0.5) * 0.02, 0, (rnd() - 0.5) * 0.06 + (y > 2 ? 0.08 : 0) + (x < -1 && y > 0 ? 0.06 : 0));
    if (rnd() < 0.08) c.offsetHSL(0, 0.1, -0.18);                        // a few soft speckles
    shell.push({ x, y, z, c });
  }
  const shellMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.86, depthWrite: false, emissive: new THREE.Color(tint).multiplyScalar(0.12) });
  const shellMesh = voxMesh(shell, shellMat); shellMesh.renderOrder = 5;
  // inside: a yolk that gets used up, and the little one curled round it (a body, then eyes)
  const yolkCells = [], kidCells = [], eyeCells = [], Y = new THREE.Color(0xffa83a), K = new THREE.Color(tint).offsetHSL(0, 0.25, -0.3), E = new THREE.Color(0x1a1420);
  for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) for (let z = -4; z <= 4; z++) if (x * x + y * y + z * z <= 12) yolkCells.push({ x, y: y - 1, z, c: Y.clone().offsetHSL(0, 0, (rnd() - 0.5) * 0.05) });
  for (let i = 0; i < 14; i++) { const a = -0.6 + i * 0.32, r = 4; kidCells.push({ x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r) - 1, z: 2, c: K }, { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r) - 1, z: 1, c: K }); }
  eyeCells.push({ x: 3, y: 2, z: 3, c: E }, { x: 2, y: 3, z: 3, c: E });
  const opaque = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x3a2010 });
  const yolk = voxMesh(yolkCells, opaque), kid = voxMesh(kidCells.filter((c, i, a) => a.findIndex((d) => d.x === c.x && d.y === c.y && d.z === c.z) === i), opaque), eyes = voxMesh(eyeCells, opaque);
  group.add(yolk, kid, eyes, shellMesh);
  // a soft glow under an egg that is being looked after
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.62, 20), new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = -RY + 0.01; group.add(glow);
  const egg = { group, shell: shellMesh, yolk, kid, eyes, glow, t0: rnd() * 6,
    // p: how far along it is (0 just laid, 1 hatching); cared: days looked after
    set(p, cared) {
      yolk.scale.setScalar(Math.max(0.35, 1 - p * 0.65)); kid.visible = p > 0.22; kid.scale.setScalar(0.5 + Math.min(1, p) * 0.6); eyes.visible = p > 0.55; eyes.scale.copy(kid.scale);
      glow.material.opacity = cared >= 2 ? 0.28 : cared === 1 ? 0.14 : 0; egg.p = p;
    },
    tick(t) {
      const p = egg.p ?? 0, near = Math.max(0, (p - 0.85) / 0.15), w = near * (Math.sin(t * 9 + egg.t0) > 0.6 ? 1 : 0.25);      // nearly ready: little wobbles, now and then a real shake
      group.rotation.z = Math.sin(t * 13 + egg.t0) * 0.12 * w + Math.sin(t * 0.8 + egg.t0) * 0.02; group.rotation.x = Math.cos(t * 11 + egg.t0) * 0.06 * w;
      kid.rotation.y = Math.sin(t * 0.7 + egg.t0) * 0.25 * Math.min(1, p * 2);       // the little one stirs
    },
    dispose() { group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); },
  };
  egg.set(0, 0); return egg;
}

const PLANTS = ['grass', 'fern', 'sword', 'red', 'kelp', 'anemone', 'bamboo'];
// where to put it: at the foot of a plant (rocks next), beside it, at a depth the camera keeps sharp, clear of every other thing; else a clear patch of sand
export function eggSpot(spots, reach, hash, taken = []) {
  const clear = (x, z) => Math.abs(x) < 6.2 && z > -1.8 && z < 1.1 && spots.every((s) => Math.hypot(s.x - x, s.z - z) >= reach(s.type) * 0.5 + RX) && taken.every((p) => Math.hypot(p.x - x, p.z - z) > 0.9);
  const homes = [...spots.filter((s) => PLANTS.includes(s.type)), ...spots.filter((s) => ['rock', 'boulder', 'shell', 'moss'].includes(s.type))];
  for (let k = 0; k < homes.length; k++) { const s = homes[(hash + k) % homes.length], r = reach(s.type) * 0.55 + RX;
    for (let j = 0; j < 9; j++) { const a = (hash & 1 ? 0.35 : Math.PI - 0.35) + ((j % 2 ? 1 : -1) * Math.ceil(j / 2) * Math.PI) / 7, x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r; if (clear(x, z)) return { x, z, by: s.type }; } }
  for (let j = 0; j < 40; j++) { const x = -3 + (((hash >> (j % 16)) + j * 37) % 60) / 10, z = -0.8 + (((hash >> 3) + j * 53) % 18) / 10; if (clear(x, z)) return { x, z, by: null }; }
  return { x: -2 + (hash % 40) / 10, z: 0.6, by: null };
}
// resting on the sand: on the highest point under it, so it never sinks into a slope
export const eggY = (x, z) => Math.max(sandH(x, z), sandH(x + RX, z), sandH(x - RX, z), sandH(x, z + RX), sandH(x, z - RX)) + RY - 0.03;

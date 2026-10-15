// A message in a bottle, in the tank's voxel style: clear green-blue glass you can see into, a cork, and a rolled letter tied with a red ribbon inside.
// Built upright along y; the caller tips it over (it floats on its side).
import * as THREE from 'three';

const V = 0.1;
function vox(cells, mat) {
  const key = (x, y, z) => x + ',' + y + ',' + z, has = new Set(cells.map((c) => key(c.x, c.y, c.z))), pos = [], nor = [], col = [], F = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const c of cells) for (const [nx, ny, nz] of F) {
    if (has.has(key(c.x + nx, c.y + ny, c.z + nz))) continue;
    const cx = (c.x + nx / 2) * V, cy = (c.y + ny / 2) * V, cz = (c.z + nz / 2) * V, A = nx ? [0, 0, 1] : [1, 0, 0], B = nz ? [0, 1, 0] : ny ? [0, 0, 1] : [0, 1, 0];
    const p = (i, j) => [cx + (A[0] * i + B[0] * j) * V / 2, cy + (A[1] * i + B[1] * j) * V / 2, cz + (A[2] * i + B[2] * j) * V / 2], flip = (nx + ny) > 0 || nz < 0;
    const q = !flip ? [p(-1, -1), p(1, -1), p(1, 1), p(-1, -1), p(1, 1), p(-1, 1)] : [p(-1, -1), p(1, 1), p(1, -1), p(-1, -1), p(-1, 1), p(1, 1)];
    for (const v of q) { pos.push(...v); nor.push(nx, ny, nz); col.push(c.c.r, c.c.g, c.c.b); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Mesh(g, mat);
}

export function makeBottle() {
  const group = new THREE.Group(), glass = [], inner = [], cork = [], G = new THREE.Color(0x8fd8d0), Gd = new THREE.Color(0x5fb0a8), W = new THREE.Color(0xeafffb);
  const P = new THREE.Color(0xfff3d0), Pl = new THREE.Color(0xd9c08a), Rb = new THREE.Color(0xe0476b), C = new THREE.Color(0xb98a52), Cd = new THREE.Color(0x8a6034);
  const R = (y) => (y < 1 ? 3.2 : y < 10 ? 3.6 : y < 12 ? 2.6 : 1.7);      // the body, a rounded shoulder, then the neck
  for (let y = 0; y < 15; y++) { const r = R(y); for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) { const d = Math.hypot(x, z); if (d > r || (d < r - 1.05 && y > 0 && y < 15)) continue;
    glass.push({ x, y, z, c: (x < -1 && y > 1 && y < 10 ? W : y < 2 ? Gd : G).clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.04) }); } }      // a shell of glass a voxel thick, a highlight down one side
  for (let y = 15; y < 18; y++) for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) if (Math.hypot(x, z) <= 1.5) cork.push({ x, y, z, c: y === 17 ? Cd : C });
  for (let y = 2; y < 10; y++) for (let x = -1; x <= 1; x++) for (let z = -2; z <= 2; z++) { if (Math.hypot(x, z) > 2.1) continue; inner.push({ x, y, z, c: y === 6 ? Rb : (y === 3 || y === 8) && Math.abs(z) === 2 ? Pl : P }); }      // the rolled letter, a ribbon round its middle
  const glassM = vox(glass, new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false, emissive: 0x0c2a28 })); glassM.renderOrder = 6;
  const innerM = vox(inner, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x2a2010 })), corkM = vox(cork, new THREE.MeshLambertMaterial({ vertexColors: true }));
  group.add(innerM, corkM, glassM); for (const m of [innerM, corkM, glassM]) m.position.y = -0.6;      // (centred on its middle)
  return { group, glass: glassM, cork: corkM, letter: innerM, dispose() { group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); } };
}

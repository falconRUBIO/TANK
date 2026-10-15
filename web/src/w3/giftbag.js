// A gift waiting on the sand: a little voxel gift bag, tied with a ribbon and bow in the giver's color, glowing softly until its friend opens it.
// open() plays the unwrapping: the bow lets go, the bag shakes, and the sides fall open flat; the fish inside is let out by the caller.
import * as THREE from 'three';

const V = 0.09;
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
// the giver's color, always the same for the same person
export const RIBBONS = [0xe0476b, 0x3f8cff, 0x2fbf71, 0xf2a93b, 0x9b59f0, 0x18b5b5];
export const ribbonOf = (id = '') => RIBBONS[[...String(id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % RIBBONS.length];

export function makeGiftBag(ribbon = 0xe0476b) {
  const group = new THREE.Group(), body = [], band = [], bow = [], P = new THREE.Color(0xfff6ea), Pd = new THREE.Color(0xeadfce), R = new THREE.Color(ribbon), Rd = R.clone().offsetHSL(0, 0, -0.12);
  for (let x = -4; x <= 4; x++) for (let y = 0; y < 8; y++) for (let z = -3; z <= 3; z++) {
    if (Math.abs(x) < 4 && Math.abs(z) < 3 && y > 0) continue;                       // a bag: walls and a floor, open at the top
    const rib = x === 0 || z === 0; (rib ? band : body).push({ x, y, z, c: rib ? (y % 2 ? R : Rd) : (y > 5 ? Pd : P).clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.03) });
  }
  for (const [x, z] of [[-1, 0], [1, 0], [0, -1], [0, 1], [0, 0]]) band.push({ x, y: 8, z, c: R });      // the ribbon gathered over the top
  for (const s of [-1, 1]) for (let i = 1; i <= 3; i++) { bow.push({ x: s * i, y: 9 + (i === 2 ? 1 : 0), z: 0, c: i === 3 ? Rd : R }, { x: s * i, y: 9, z: 0, c: R }); }      // and a bow
  bow.push({ x: 0, y: 9, z: 0, c: Rd }, { x: -1, y: 7, z: 1, c: R }, { x: 1, y: 6, z: 1, c: R });
  const mat = () => new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x1a1410 });
  const bodyM = vox(body, mat()), bandM = vox(band, mat()), bowM = vox(bow, mat());
  const inner = new THREE.Group(); inner.add(bodyM, bandM, bowM); group.add(inner); group.scale.setScalar(1.35);      // (big enough to spot and tap)
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.25, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.02; group.add(glow);
  const bag = { group, inner, glow, opening: null, t0: Math.random() * 6,
    tick(t, dt) {
      if (!bag.opening) { inner.rotation.z = Math.sin(t * 1.3 + bag.t0) * 0.04; inner.position.y = Math.max(0, Math.sin(t * 2 + bag.t0)) * 0.03; glow.material.opacity = 0.18 + 0.12 * (0.5 + 0.5 * Math.sin(t * 2.4 + bag.t0)); return; }      // waiting: a little sway and a soft glow
      const k = (bag.opening.t += dt);
      if (k < 0.7) { inner.rotation.z = Math.sin(k * 40) * 0.12; }                                                     // it shakes
      else { const u = Math.min(1, (k - 0.7) / 0.6); bowM.position.y = u * 0.6; bowM.material.transparent = true; bowM.material.opacity = 1 - u; inner.rotation.z = 0;      // the bow lets go and floats up
        bodyM.scale.set(1 + u * 0.5, 1 - u * 0.85, 1 + u * 0.5); bandM.scale.copy(bodyM.scale); glow.material.opacity = 0.4 * (1 - u); }     // the bag falls open flat
      return k > 1.4;
    },
    open() { bag.opening = { t: 0 }; },
    dispose() { group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); },
  };
  return bag;
}

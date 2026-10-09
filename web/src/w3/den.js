// The octopus's den and its collection: little shells, clams, pebbles and the red remains of crabs gathered at the entrance of its den.
import * as THREE from 'three';

const M = {
  shell: new THREE.MeshStandardMaterial({ color: 0xf0c4c0, flatShading: true, roughness: 0.7 }),
  clam: new THREE.MeshStandardMaterial({ color: 0xf4ead2, flatShading: true, roughness: 0.75 }),
  pebble: new THREE.MeshStandardMaterial({ color: 0x8a8f94, flatShading: true, roughness: 0.9 }),
  crab: new THREE.MeshStandardMaterial({ color: 0xd9503a, flatShading: true, roughness: 0.7 }),
};
const G = {
  shell: new THREE.ConeGeometry(0.1, 0.24, 5), clam: new THREE.SphereGeometry(0.13, 6, 4), pebble: new THREE.IcosahedronGeometry(0.09, 0), crab: new THREE.BoxGeometry(0.2, 0.06, 0.14),
};
G.shell.rotateZ(Math.PI / 2); G.clam.scale(1, 0.4, 1);
export function shellMesh(kind = 'shell') { const m = new THREE.Mesh(G[kind], M[kind]); m.castShadow = true; return m; }
const h = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// `count` things in a loose arc in front of the den; the first `crabs` of them are crab shells
export function buildHoard(count, crabs, seed) {
  const g = new THREE.Group(), kinds = ['shell', 'clam', 'pebble', 'shell', 'pebble'];
  for (let i = 0; i < count; i++) {
    const kind = i < crabs ? 'crab' : kinds[i % kinds.length], m = shellMesh(kind), ang = -1.15 + ((i * 0.37 + h(seed + i) * 0.4) % 1) * 2.3, rad = 0.5 + (i % 3) * 0.17 + h(seed * 3 + i) * 0.1;
    m.position.set(Math.sin(ang) * rad * 1.3, 0.09 + (kind === 'pebble' ? 0.02 : 0), 0.78 + Math.cos(ang) * rad * 0.55); m.rotation.set(0, h(seed + i * 7) * 6.28, kind === 'shell' ? (h(i) - 0.5) * 0.6 : 0); g.add(m);
  }
  return g;
}

// The puzzle jar: a screw-top glass jar with a crab inside, set on the sand for the octopus to work open. Built from simple lit shapes.
import * as THREE from 'three';

const glass = new THREE.MeshStandardMaterial({ color: 0xbfe2f2, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.5, depthWrite: false });
const brass = new THREE.MeshStandardMaterial({ color: 0xb5823f, roughness: 0.5, metalness: 0.4, flatShading: true });
const shell = new THREE.MeshStandardMaterial({ color: 0xe0503a, roughness: 0.7, flatShading: true });
const eyeM = new THREE.MeshBasicMaterial({ color: 0x14141c });

export function buildJar() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.1, 10, 1, true), glass); jar.position.y = 0.55; body.add(jar);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 10), glass); base.position.y = 0.03; body.add(base);
  const lid = new THREE.Group(); lid.position.y = 1.14; root.add(lid);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.2, 10), brass); lid.add(cap);
  for (let i = 0; i < 10; i++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.06), brass); const a = (i / 10) * Math.PI * 2; rib.position.set(Math.cos(a) * 0.65, 0, Math.sin(a) * 0.65); rib.rotation.y = -a; lid.add(rib); }
  const crab = new THREE.Group(); crab.position.y = 0.2; root.add(crab);
  const bx = (w, h, d, x, y, z, m = shell) => { const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); q.position.set(x, y, z); crab.add(q); return q; };
  bx(0.38, 0.16, 0.28, 0, 0.12, 0); bx(0.3, 0.1, 0.2, 0, 0.22, 0);
  bx(0.14, 0.12, 0.12, -0.3, 0.16, 0.2); bx(0.14, 0.12, 0.12, 0.3, 0.16, 0.2); bx(0.08, 0.08, 0.16, -0.3, 0.16, 0.12); bx(0.08, 0.08, 0.16, 0.3, 0.16, 0.12);
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) bx(0.22, 0.04, 0.04, sx * 0.28, 0.06, -0.1 + k * 0.1);
  bx(0.04, 0.07, 0.04, -0.08, 0.31, 0.1, eyeM); bx(0.04, 0.07, 0.04, 0.08, 0.31, 0.1, eyeM);
  return { root, body, lid, crab, state: 'closed', t: 0 };
}
export function updateJar(j, dt, t, working) {
  if (j.state === 'closed') { j.crab.position.x = Math.sin(t * 1.3) * 0.12; j.crab.rotation.y = Math.sin(t * 0.9) * 0.5; j.body.rotation.z = working ? Math.sin(t * 17) * 0.035 : 0; j.lid.rotation.y = working ? Math.sin(t * 5) * 0.2 : 0; return; }
  j.t += dt; const k = j.t;
  j.lid.position.y = 1.14 + Math.min(1.4, k * 3.2) - Math.max(0, k - 0.5) * 0.2; j.lid.position.x = Math.min(0.9, k * 1.6); j.lid.rotation.z = -Math.min(1.4, k * 3);
  j.crab.position.y = 0.2 + Math.min(1.3, Math.max(0, k - 0.2) * 1.4); j.crab.scale.setScalar(Math.max(0.01, 1 - Math.max(0, k - 0.9) * 1.1));
  j.body.rotation.z = 0;
}

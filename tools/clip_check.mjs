// Does anything pass through anything? A busy tank (three octopuses, a mix of fish, plants, rocks, coral, a coconut shell and a pot on every level of
// the sand) is left alone for some minutes of tank time. Every second, each animal's voxels are checked in world space against the sand under them
// and against every decoration's voxels. A voxel counts as clipping when it is more than half inside the sand or more than half inside a decoration's voxel.
// Things an animal does on purpose are counted apart: an octopus buried in the sand, tucked under its own coconut shell, or wrapping its arms round something it holds.
// Needs the solo game on 8123 (or PORT). node tools/clip_check.mjs [minutes]; SEA=1 a tank of seahorses; DENSE=1 with SEA, a densely planted tank of 18 decorations
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const MIN = +(process.argv[2] || 5);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto(`http://localhost:${process.env.PORT || 8123}/?q=0&dev=1&tod=afternoon`); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2000);
await p.evaluate(([SEA, DENSE]) => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 8; s.fish.length = 0; const born = Date.now() - 12 * 864e5;
  for (const [i, pal] of [[1, 0], [2, 3], [3, 5]]) s.fish.push({ id: 'o' + i, name: 'Ink' + i, species: 'octopus', seed: 5 + i * 3, pal, born, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, owner: 'me', ownerName: 'You', hunger: 0.1, movedAt: Date.now() });
  ['goldfish', 'neon', 'blue', 'guppy', 'platy', 'danio', 'betta', 'cory', 'angelfish', 'seahorse'].forEach((sp, i) => s.fish.push({ id: 'g' + i, name: 'F' + i, species: sp, seed: 3 + i * 7, born, stage: 'adult', traits: [['Calm', 'Shy', 'Brave', 'Playful', 'Social', 'Lazy', 'Curious', 'Greedy'][i % 8]], happy: 0.8, health: 1 }));
  s.decor.length = 0; s.decor.push({ id: 'd1', type: 'coconut', x: 2.2, z: 2.3, ry: 0 }, { id: 'd2', type: 'grass', x: -3.0, z: 2.4, ry: 0 }, { id: 'd3', type: 'rock', x: 0.4, z: 2.0, ry: 0 }, { id: 'd4', type: 'fern', x: -2.4, z: -0.2, ry: 0 }, { id: 'd5', type: 'brain', x: 1.6, z: -0.4, ry: 0 },
    { id: 'd6', type: 'sword', x: -3.4, z: -3.2, ry: 0 }, { id: 'd7', type: 'pot', x: 2.6, z: -3.3, ry: 0 }, { id: 'd8', type: 'boulder', x: -0.6, z: -3.6, ry: 0 });
  if (SEA) { s.fish.length = 0; ['seahorse', 'seahorse', 'seahorse', 'seahorse'].forEach((sp, i) => s.fish.push({ id: 'h' + i, name: 'H' + i, species: sp, seed: 3 + i * 7, born, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1 }));
    s.decor.length = 0; s.decor.push({ id: 'd1', type: 'grass', x: -2.8, z: 2.2, ry: 0 }, { id: 'd2', type: 'fern', x: -0.8, z: 2.4, ry: 0 }, { id: 'd3', type: 'sword', x: 1.4, z: 2.2, ry: 0 }, { id: 'd4', type: 'red', x: 3.0, z: 1.8, ry: 0 }, { id: 'd5', type: 'kelp', x: -2.0, z: -0.3, ry: 0 }, { id: 'd6', type: 'bamboo', x: 1.6, z: -0.5, ry: 0 }, { id: 'd7', type: 'anemone', x: -0.2, z: 0.2, ry: 0 }, { id: 'd8', type: 'pillar', x: 2.8, z: -0.2, ry: 0 }); }
  if (DENSE) { s.decor.length = 0; [['grass', -3.2, 2.3], ['fern', -2.2, 2.0], ['sword', -1.2, 2.4], ['kelp', -0.3, 1.9], ['red', 0.7, 2.3], ['grass', 1.6, 2.0], ['anemone', 2.6, 2.3], ['bamboo', 3.3, 1.6],
    ['kelp', -2.8, 0.6], ['sword', -1.6, 0.3], ['fern', -0.4, 0.5], ['grass', 0.8, 0.2], ['red', 2.0, 0.6], ['anchor', 2.9, -0.4], ['kelp', -2.2, -1.3], ['fern', 0.2, -1.2], ['bridge', 1.6, -1.6], ['rock', -0.9, -0.8]]
    .forEach(([type, x, z], i) => s.decor.push({ id: 'n' + i, type, x, z, ry: (i * 0.7) % 3 })); }
  g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); }, [!!process.env.SEA, !!process.env.DENSE]);
await p.waitForTimeout(3000);
const r = await p.evaluate(async (MIN) => {
  const T = await import('/src/w3/terrain.js'), F = window.__fishes, D = window.__decor, THREE = window.__tank.camera.constructor;
  const M = new (window.__tank.camera.matrix.constructor)(), P = new (window.__tank.camera.position.constructor)(), Q = new (window.__tank.camera.quaternion.constructor)(), S = new (window.__tank.camera.position.constructor)();
  // every voxel of a thing in world space: [x, y, z, half size]
  const voxels = (root) => { const out = []; root.updateMatrixWorld(true); root.traverse((o) => { if (!o.isInstancedMesh || !o.visible) return; o.geometry.computeBoundingBox(); const gsz = o.geometry.boundingBox.max.x - o.geometry.boundingBox.min.x; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M); M.premultiply(o.matrixWorld); M.decompose(P, Q, S); S.multiplyScalar(gsz); const h = Math.max(S.x, S.y, S.z) / 2; if (h > 1e-4) out.push([P.x, P.y, P.z, h]); } }); return out; };
  // every decoration voxel as a box in the world (blades and stems are long thin boxes, so each is kept with its own rotation and size), filed in a grid by the cells it covers
  // a seahorse holding on presses the leaves round its coils aside in the plant shader (see voxshade.js), so those leaves are not where the plant's own matrices put them
  const { SEAHORSE_GRIP_R } = await import('/src/species.js'), pressed = (P, holds) => holds.some((h) => { const d = Math.hypot(P.x - h[0], P.z - h[2]); return Math.abs(P.y - h[1]) < 0.22 && d > 0.06 && d < h[3]; });
  const decor = () => { const holds = F.list.map((f) => [f.gripPoint?.(), f]).filter(([G]) => G).map(([G, f]) => [G[0], G[1], G[2], SEAHORSE_GRIP_R * f.scale + 0.09]); const g = new Map(), C = 0.4, Mi = new (window.__tank.camera.matrix.constructor)(); for (const [id, it] of D.items) { if (it.haul) continue; it.group.updateMatrixWorld(true); it.group.traverse((o) => { if (!o.isInstancedMesh || !o.visible) return; o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox, gs = new (window.__tank.camera.matrix.constructor)().makeScale(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z).setPosition((bb.max.x + bb.min.x) / 2, (bb.max.y + bb.min.y) / 2, (bb.max.z + bb.min.z) / 2); for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, M); M.premultiply(o.matrixWorld); M.multiply(gs); M.decompose(P, Q, S); const r = 0.5 * Math.hypot(S.x, S.y, S.z); if (r < 1e-4 || (PLANTS.has(it.type) && pressed(P, holds))) continue; Mi.copy(M).invert(); const box = { inv: Float32Array.from(Mi.elements), id, type: it.type ?? '', base: it.group.position.y, plant: PLANTS.has(it.type) };
      for (let a = Math.floor((P.x - r) / C); a <= Math.floor((P.x + r) / C); a++) for (let c = Math.floor((P.y - r) / C); c <= Math.floor((P.y + r) / C); c++) for (let e = Math.floor((P.z - r) / C); e <= Math.floor((P.z + r) / C); e++) { const k = a + ',' + c + ',' + e; (g.get(k) ?? g.set(k, []).get(k)).push(box); } } }); } return { g, C }; };
  const inside = (q, x, y, z) => { const m = q.inv, lx = m[0] * x + m[4] * y + m[8] * z + m[12], ly = m[1] * x + m[5] * y + m[9] * z + m[13], lz = m[2] * x + m[6] * y + m[10] * z + m[14]; const d = Math.max(Math.abs(lx), Math.abs(ly), Math.abs(lz)); return d < 0.5 ? 0.5 - d : 0; };
  const PLANTS = new Set(['grass', 'fern', 'sword', 'kelp', 'red', 'moss', 'bamboo', 'anemone']);
  const tally = {}, worst = [], add = (k) => { tally[k] = (tally[k] ?? 0) + 1; };
  let samples = 0, heldHits = 0, heldSamples = 0; const gridSeen = [0, 0], sizes = [];
  for (let i = 0; i < MIN * 60 * 20; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); D.tick?.(window.__t, 0.05);
    if (i % 20 === 0 && i > 200) {
      const G = decor();
      for (const f of F.list) { if (f.dead) continue; const oct = f.species.move === 'jet'; samples++; if (f.holdfast?.on) heldSamples++; const who = oct ? 'octopus' : 'fish';
        const why = oct ? (f.st?.s === 'bury' || f.st?.s === 'snake' ? 'bury' : f.den?.home && (f.tuckK ?? 0) > 0.2 ? 'den' : f.st?.mode === 'inspect' && f.st?.s === 'work' ? 'grab' : f.st?.mode === 'jar' ? 'jar' : null) : null;
        let sand = 0, sandD = 0, hit = new Map(), hitD = 0; const tags = {}, hitTags = {}; let vi = -1;
        for (const [x, y, z, h] of voxels(f.group)) { vi++; const g = T.sandH(x, z), d = g - y; if (d > h) { sand++; sandD = Math.max(sandD, d); const vv = f.vox?.[vi], tg = vv ? (vv.arm >= 0 ? 'arm' : vv.web ? 'web' : vv.tag ?? 'body') : '?'; tags[tg] = (tags[tg] ?? 0) + 1; }
          const cell = G.g.get(`${Math.floor(x / G.C)},${Math.floor(y / G.C)},${Math.floor(z / G.C)}`); if (cell) for (const q of cell) { const dd = inside(q, x, y, z); if (dd > 0 && q.plant && !f.holdfast?.on && Math.hypot(x - f.pos.x, z - f.pos.z) < f.radius * (oct ? 0.75 : 0.55) * (f.group.scale.x || 1) * 0.45 && y > q.base + 0.35) continue; if (dd > 0) { gridSeen[window.__tank.decor.solids.at(x, y, z) ? 1 : 0]++; hit.set(q.id, q.type); if (f.holdfast?.on) heldHits++; hitD = Math.max(hitD, dd); const vv = f.vox?.[vi]; hitTags[vv ? (vv.arm >= 0 ? 'arm' : vv.web ? 'web' : vv.tag ?? 'body') : '?'] = (hitTags[vv ? (vv.arm >= 0 ? 'arm' : vv.web ? 'web' : vv.tag ?? 'body') : '?'] ?? 0) + 1; break; } } }
        const tag = (what) => `${who}:${what}${why ? ':' + why : ''}`;
        if (sand > 3) { add(tag('sand')); if (!why) worst.push({ who: f.name, sp: f.species.id, what: 'sand', n: sand, tags, depth: +sandD.toFixed(2), pos: f.pos.toArray().map((v) => +v.toFixed(2)), lv: T.levelAt(f.pos.x, f.pos.z), s: f.st?.s, mode: f.st?.mode, act: f.act }); }
        if (hit.size && !why) { const nv = Object.values(hitTags).reduce((a2, c) => a2 + c, 0); sizes.push(nv); }
        const nHit = Object.values(hitTags).reduce((a2, c) => a2 + c, 0);
        if (hit.size && nHit > 3) { const types = [...new Set(hit.values())].join('+'); add(tag(types)); if (!why) worst.push({ who: f.name, sp: f.species.id, what: types, tags: hitTags, at: [...hit.keys()].map((id) => { const g = D.items.get(id)?.group; return g ? [id, +g.position.x.toFixed(2), +g.position.y.toFixed(2), +g.position.z.toFixed(2), +g.rotation.x.toFixed(2), +g.rotation.z.toFixed(2)] : id; }), solid: [...hit.keys()].map((id) => { const g = D.items.get(id)?.group?.position; return g ? !!window.__tank.decor.solids?.at?.(g.x, g.y + 0.2, g.z) : null; }), depth: +hitD.toFixed(2), pos: f.pos.toArray().map((v) => +v.toFixed(2)), s: f.st?.s, mode: f.st?.mode, act: f.act, hold: f.holdfast ? f.holdfast.type + (f.holdfast.on ? ':on' : f.holdfast.settle ? ':settle' : ':going') + ':' + (f.holdfast.held ?? 0).toFixed(1) + ':g' + (f.gripK ?? 0).toFixed(2) + ':p' + (f.pitch ?? 0).toFixed(2) : undefined, link: f.link ? (f.link.on ? 'on' : 'going') : undefined }); }
      } }
    if (i % 400 === 0) await new Promise((q) => setTimeout(q, 0)); }
  return { heldHits, heldSamples, sizes: [1, 3, 8, 20, 50, 1e9].map((m, j, A) => sizes.filter((v) => v <= m && v > (A[j - 1] ?? 0)).length), gridSeen, tally, samples, worst: worst.filter((w) => Object.values(w.tags ?? {}).reduce((a2, c) => a2 + c, 0) > 20 || (w.n ?? 0) > 20).slice(0, 30), nw: worst.length };
}, MIN);
console.log('  seahorses holding on:', r.heldSamples, 'samples,', r.heldHits, 'voxels inside a decoration');
console.log('  decor hit sizes (1,2-3,4-8,9-20,21-50,>50 voxels)', JSON.stringify(r.sizes), '  grid sees hits', r.gridSeen, '  samples', r.samples, JSON.stringify(r.tally));
for (const w of r.worst) console.log('   ', JSON.stringify(w));
ck('nothing passes through the sand or a decoration unless it means to (a touch of 1-3 voxels is contact)', r.nw / r.samples < 0.02, `${r.nw} of ${r.samples} samples`);
ck('no page errors', errors.length === 0, errors.join('; '));
console.log(fails ? `${fails} failed` : 'Clip checks passed'); await b.close(); process.exit(fails ? 1 : 0);

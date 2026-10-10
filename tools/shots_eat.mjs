// An octopus eating a crab, close up: the catch, the crab held out in front, each leg pulled off and taken to the beak, then the claws and the shell.
// Steps the simulation by hand so slow rendering does not matter. Needs the solo game on 8123. OUT=dir node tools/shots_eat.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/eat'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.fish.length = 0; s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: 5, born: Date.now() - 12 * 864e5, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, appetite: 0.05, owner: 'me', ownerName: 'You' }); g.emit('state'); document.querySelectorAll('#goal,#coach,.coach,#toast,header,nav,#modal,#settle,#reunion').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(3000);
const step = (n, dt = 0.05) => p.evaluate(([n, dt]) => { const F = window.__fishes; for (let i = 0; i < n; i++) { F.update(dt, i * dt); F.list.forEach((f) => f.update(dt, Math.random, F.list)); } }, [n, dt]);
await p.evaluate(() => { const f = window.__fishes.list[0]; f.pos.set(0, 0.6, 1.6); f.vel.set(0, 0, 0); f.heading = 0; f.target.copy(f.pos); f.camoWill = false; for (const m of f.minds) { m.k = 0; m.next = 999; } f.st = { s: 'rest', t: 999, n: 0, pulse: 0 }; window.__fishes.dropCrab('x1'); const h = f.hunt; h.y = 0.13; h.mesh.position.set(0.6, 0.13, 1.9); h.x = 0.6; h.z = 1.9; h.run = { dodges: 9, burst: -1, vx: 0, vz: 0, down: 99, face: 0 }; });
const probe = () => { const f = window.__fishes.list[0], h = f.hunt, G = f.rs.grab; const parts = h?.mesh?.userData?.parts ?? []; window.__cam = [f.pos.x + 1.6, f.pos.y + 1.6, f.pos.z + 9.5, f.pos.x + 0.9, f.pos.y + 0.1, f.pos.z];
    // clipping, voxel by voxel: every voxel of the octopus is tested against every visible piece of the crab (its box, shrunk a little), and every piece against the sand.
    // The tips of the two arms holding a piece are allowed to touch it, and a piece right at the beak is being swallowed.
    f.group.updateMatrixWorld(true); h?.mesh?.updateMatrixWorld?.(true);
    const V3 = f.pos.constructor, M4 = f.mesh.matrixWorld.constructor, inst = new M4(), boxes = [];
    const mouth = (() => { const sc = f.scale, ch = Math.cos(f.heading), sh = Math.sin(f.heading); return new V3(f.pos.x + 7.5 * sc * ch, f.pos.y + (f.lift ?? 0) - 8.6 * sc, f.pos.z - 7.5 * sc * sh); })();
    if (h?.mesh?.userData && !h.dropped) for (const pc of [h.mesh.userData.body, ...parts]) { if (!pc || !pc.visible || (pc.scale?.x ?? 1) < 0.35) continue; pc.traverse((o) => { if (!o.geometry || !o.visible) return; let b; if (o.isInstancedMesh) { o.computeBoundingBox(); b = o.boundingBox.clone().applyMatrix4(o.matrixWorld); } else { o.geometry.computeBoundingBox(); b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); } c = b.getCenter(new V3()), sz = b.getSize(new V3()).multiplyScalar(0.35); b.min.copy(c).sub(sz); b.max.copy(c).add(sz); boxes.push({ b, pc, nearMouth: c.distanceTo(mouth) < 0.32 }); }); }
    let clip = 0, floor = 0; const tags = {};
    const floorAt = []; for (const { b, nearMouth } of boxes) if (b.min.y < -0.02 && !nearMouth) { floor++; floorAt.push(+b.min.y.toFixed(3), +b.max.y.toFixed(3), h.mesh.position.y.toFixed(3), h.mesh.rotation.z.toFixed(2), h.mesh.scale.x.toFixed(2)); }
    for (let i = 0; i < f.vox.length; i++) { const v = f.vox[i]; if (G && v.arm >= 0 && (v.arm === G.arm || (v.at > 0.7 && [G.pk?.arm, G.n1, G.n2].includes(v.arm)))) continue; f.mesh.getMatrixAt(i, inst); const w = new V3().applyMatrix4(inst).applyMatrix4(f.mesh.matrixWorld);
      for (const { b, nearMouth } of boxes) if (!nearMouth && b.containsPoint(w)) { clip++; { const key = v.arm >= 0 ? `arm${v.arm}@${v.at.toFixed(1)}${v.arm === G?.arm ? "hold" : v.arm === G?.pk?.arm ? "pk" : v.arm === G?.n1 || v.arm === G?.n2 ? "nb" : ""}` : v.tag; tags[key] = (tags[key] ?? 0) + 1; } break; } }
    const inside = clip; if (window.__dbg) { let mn = [9, 9, 9], mx = [-9, -9, -9]; for (let i = 0; i < f.vox.length; i += 7) { f.mesh.getMatrixAt(i, inst); const w = new V3().applyMatrix4(inst).applyMatrix4(f.mesh.matrixWorld); mn = [Math.min(mn[0], w.x), Math.min(mn[1], w.y), Math.min(mn[2], w.z)]; mx = [Math.max(mx[0], w.x), Math.max(mx[1], w.y), Math.max(mx[2], w.z)]; } window.__dbgOut = { n: f.vox.length, inst: f.mesh.count, mn, mx, boxes: boxes.map((x) => [x.b.min.toArray().map((v) => +v.toFixed(2)), x.b.max.toArray().map((v) => +v.toFixed(2))]).slice(0, 3), pos: f.pos.toArray() }; }
    return { t: G ? +G.t.toFixed(2) : null, eaten: parts.filter((x) => !x.visible).length, of: parts.length, inside, tags, floor, floorAt, chew: +(f.chewK ?? 0).toFixed(2), pieces: boxes.length };
};
const gt = () => p.evaluate(() => { const f = window.__fishes.list[0]; return f.rs.grab ? f.rs.grab.t : -1; });
for (let i = 0; i < 200 && (await gt()) < 0; i++) await step(4);
const marks = Array.from({ length: 40 }, (_, i) => 0.4 + i * 0.4).filter((m) => m < 15.6); const shotAt = new Set([1.2, 2.8, 3.6, 4.0, 4.4, 4.8, 6.0, 8.4, 12.0, 13.2, 14.0, 14.8]); let n = 0;
const clips = [];
for (const m of marks) {
  while ((await gt()) >= 0 && (await gt()) < m) await step(2, 0.05);
  const info = await p.evaluate(probe);
  clips.push(info); if (info.inside || info.floor || process.env.VERBOSE) console.log(m.toFixed(1), JSON.stringify(info)); if ([...shotAt].some((x) => Math.abs(x - m) < 0.01)) { await p.waitForTimeout(2200); await p.screenshot({ path: `${out}/eat_${String(n++).padStart(2, '0')}.png` }); }
}
await step(40);
const done = await p.evaluate(() => { const f = window.__fishes.list[0]; return { hunting: !!f.hunt, crabs: (window.__fishes.crabs ?? []).length }; }); console.log('after', JSON.stringify(done));
// the checker must be able to see clipping: a crab placed inside the octopus's head has to be flagged
const sanity = await p.evaluate((probeSrc) => { window.__dbg = 1; const f = window.__fishes.list[0]; window.__fishes.dropCrab('x1'); const h = f.hunt; h.held = true; h.y = 0.2; h.mesh.scale.setScalar(1.1); h.mesh.position.set(f.pos.x + 3 * f.scale, f.pos.y + 1 * f.scale, f.pos.z); f.rs.grab = null; return (0, eval)('(' + probeSrc + ')')(); }, probe.toString());
console.log(JSON.stringify(await p.evaluate(() => window.__dbgOut))); console.log(sanity.inside > 0 ? `Checker works: a crab inside the head is flagged (${sanity.inside} voxels)` : 'CHECKER BLIND: a crab inside the head was not flagged');
const bad = clips.filter((c) => c.inside > 0 || c.floor > 0);
console.log(`${clips.length} moments checked, ${clips.reduce((n, c) => n + c.pieces, 0)} piece checks`); console.log(bad.length ? `CLIPPING at ${bad.map((c) => c.t).join(', ')}` : 'No clipping: no crab piece passes through the octopus or the sand');
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

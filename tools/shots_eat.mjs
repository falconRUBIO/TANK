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
await p.evaluate(() => { const f = window.__fishes.list[0]; f.pos.set(0, 0.6, 1.6); f.vel.set(0, 0, 0); f.heading = 0; f.target.copy(f.pos); f.camoWill = false; for (const m of f.minds) { m.k = 0; m.next = 999; } f.st = { s: 'rest', t: 999, n: 0, pulse: 0 }; window.__fishes.dropCrab('x1'); const h = f.hunt; h.y = 0.13; h.mesh.position.set(0.9, 0.13, 1.7); h.x = 0.9; h.z = 1.7; h.run = { dodges: 9, burst: -1, vx: 0, vz: 0, down: 99, face: 0 }; });
const gt = () => p.evaluate(() => { const f = window.__fishes.list[0]; return f.rs.grab ? f.rs.grab.t : -1; });
for (let i = 0; i < 200 && (await gt()) < 0; i++) await step(4);
const marks = [0.6, 1.5, 2.6, 3.6, 4.2, 5.0, 6.8, 9.0, 10.6, 11.6, 12.3]; let n = 0;
const clips = [];
for (const m of marks) {
  while ((await gt()) >= 0 && (await gt()) < m) await step(2, 0.05);
  const info = await p.evaluate(() => { const f = window.__fishes.list[0], h = f.hunt, G = f.rs.grab; const parts = h?.mesh?.userData?.parts ?? []; window.__cam = [f.pos.x + 1.6, f.pos.y + 1.6, f.pos.z + 9.5, f.pos.x + 0.9, f.pos.y + 0.1, f.pos.z];
    // is any part of the crab inside the octopus's head or mantle? (sampled at the crab's centre and each visible piece)
    let inside = 0; const sc = f.scale, ch = Math.cos(f.heading), sh = Math.sin(f.heading); const v = h?.mesh ? h.mesh.position.clone() : null;
    const local = (w) => { const dx = w.x - f.pos.x, dy = w.y - f.pos.y - (f.lift ?? 0), dz = w.z - f.pos.z; return [(dx * ch - dz * sh) / sc, dy / sc, (dx * sh + dz * ch) / sc]; };
    const inHead = ([x, y, z]) => ((x - 3) / 9) ** 2 + ((y - 0.5) / 7) ** 2 + (z / 8.4) ** 2 < 0.8 || ((x + 5) / 9.5) ** 2 + ((y - 7) / 11.5) ** 2 + (z / 8.5) ** 2 < 0.8;
    if (h?.mesh) { for (const pt of [h.mesh.userData.body, ...parts]) { if (!pt?.visible || pt.scale.x < 0.3) continue; pt.getWorldPosition(v); if (inHead(local(v))) inside++; } }
    return { t: G ? +G.t.toFixed(2) : null, eaten: parts.filter((x) => !x.visible).length, of: parts.length, inside, chew: +(f.chewK ?? 0).toFixed(2) };
  });
  clips.push(info); console.log(m, JSON.stringify(info)); await p.waitForTimeout(2200); await p.screenshot({ path: `${out}/eat_${String(n++).padStart(2, '0')}.png` });
}
await step(40); const done = await p.evaluate(() => { const f = window.__fishes.list[0]; return { hunting: !!f.hunt, crabs: (window.__fishes.crabs ?? []).length }; }); console.log('after', JSON.stringify(done));
const bad = clips.filter((c) => c.inside > 0);
console.log(bad.length ? `crab inside the body at ${bad.map((c) => c.t).join(', ')}` : 'The crab never passes through the octopus');
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

// Pictures of the sand banks: the empty tank (no decorations, three octopuses), and the same tank decorated on all three levels.
// Needs the solo game on 8123. node tools/shots_terrain.mjs OUTDIR [tod]
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');      // (CI points PW_MODULE at its own playwright)
import fs from 'node:fs';
const out = process.argv[2] || '/tmp/terrain_shots', tod = process.argv[3] || 'afternoon'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`http://localhost:8123/?q=1&dev=1&tod=${tod}`); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2000);
const DECOR = [{ id: 'd1', type: 'coconut', x: 2.2, z: 2.3, ry: 0 }, { id: 'd2', type: 'grass', x: -3.0, z: 2.4, ry: 0 }, { id: 'd3', type: 'rock', x: -0.8, z: 2.5, ry: 0 }, { id: 'd4', type: 'fern', x: -2.4, z: -0.2, ry: 0 }, { id: 'd5', type: 'brain', x: 0.4, z: 0.0, ry: 0 }, { id: 'd6', type: 'sword', x: -3.4, z: -3.2, ry: 0 }, { id: 'd7', type: 'boulder', x: -1.6, z: -3.4, ry: 0 }, { id: 'd8', type: 'anemone', x: 2.6, z: -1.2, ry: 0 }];
const shot = async (name, decor) => {
  await p.evaluate((decor) => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 8; s.fish.length = 0; const born = Date.now() - 12 * 864e5;
    for (const [i, pal] of [[1, 0], [2, 3], [3, 5]]) s.fish.push({ id: 'o' + i, name: 'Ink' + i, species: 'octopus', seed: 5 + i * 3, pal, born, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, owner: 'me', ownerName: 'You', hunger: 0.1 });
    s.decor.length = 0; s.decor.push(...decor); g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); }, decor);
  await p.waitForTimeout(1500);
  await p.evaluate(async () => { const T = await import('/src/w3/terrain.js'), F = window.__fishes; [[-2.4, -3.0], [-1.2, 0.0], [1.4, 2.3]].forEach(([x, z], i) => { const o = F.byId.get('o' + (i + 1)); if (!o) return; o.pos.set(x, T.sandH(x, z) + 0.55, z); o.vel.set(0, 0, 0); o.st = { s: 'rest', t: 30, n: 0, pulse: 0 }; o.heading = i === 2 ? Math.PI : 0.3; }); });
  await p.waitForTimeout(3500); await p.screenshot({ path: `${out}/${name}.png` });
};
await shot('empty', []); await shot('decorated', DECOR);
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

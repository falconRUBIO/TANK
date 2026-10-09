// The octopus's face and underside from several angles. OUT=dir node tools/shots_mouth.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/mouth'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.fish.length = 0; s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: +(new URLSearchParams(location.search).get('seed') || 5), born: Date.now() - 12 * 864e5, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, appetite: 0.05, owner: 'me', ownerName: 'You' }); g.emit('state'); document.querySelectorAll('#goal,#coach,.coach,#toast').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(3000);
for (const [name, heading, st, cam] of [['front', -Math.PI / 2, 'rest', [0, 1.3, 4.5, 0, 0.7, 1.4]], ['front3q', -Math.PI / 4, 'rest', [0, 1.4, 4.5, 0, 0.7, 1.4]], ['side', 0, 'rest', [0, 1.0, 5, 0, 0.7, 1.4]], ['jetfront', Math.PI / 2, 'jet', [0, 1.4, 9, 0, 4.0, 1.4]], ['jet3q', Math.PI / 4, 'jet', [-0.5, 2.0, 8, 0, 4.0, 1.4]], ['userview', -Math.PI / 2, 'jet', [0, 2.4, 7, 0, 4.4, 1.4]], ['below', Math.PI / 2, 'jet', [0.2, 0.9, 5.2, 0, 4.4, 1.4]], ['below2', 0.3, 'jet', [0.2, 1.0, 5.2, 0, 4.4, 1.4]]]) {
  await p.evaluate(([h, st]) => { const f = window.__fishes.list[0]; f.pos.set(0, st === 'jet' ? 4.2 : 0.6, 1.4); f.vel.set(0, 0, 0); f.heading = h; f.camoWill = false; f.mul = 0; f.target.copy(f.pos); f.st = { s: st === 'jet' ? 'drift' : 'rest', t: 9999, n: 0, pulse: 0 }; f.restK = st === 'jet' ? 0 : 1; f.mind = null; for (const m of f.minds) { m.k = 0; m.until = 0; m.next = 999; } f.blinkNext = 999; }, [heading, st]);
  await p.evaluate((c) => { window.__cam = c; }, cam); await p.waitForTimeout(2600); await p.screenshot({ path: `${out}/${name}.png` });
}
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

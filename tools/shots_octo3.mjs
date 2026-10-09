// Ink, sleep, new decor, curiosity about new things and the top-of-water limit. OUT=dir node tools/shots_octo3.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/octo3'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=1&dev=1&tod=night'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(async () => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 6; s.shells = 300; s.fish.length = 0;
  s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: 5, born: Date.now() - 12 * 864e5, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, appetite: 0.05, owner: 'me', ownerName: 'You', bond: { me: 4 } });
  s.fish.push({ id: 'x2', name: 'Ari', species: 'seahorse', seed: 4, born: Date.now() - 6 * 864e5, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, appetite: 0.05, owner: 'me', ownerName: 'You' });
  g.emit('state'); document.querySelectorAll('#goal,#coach,.coach,#toast').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(3500);
console.log('topY', await p.evaluate(() => { const T = window.__tank; return [window.innerHeight, document.querySelector('header').getBoundingClientRect().bottom]; }), await p.evaluate(async () => (await import('./src/w3/fish3d.js')).Fish3D.topY));
// sleep
await p.evaluate(() => { const f = window.__fishes.list[0]; f.pos.set(-0.5, 0.6, 1.4); f.vel.set(0, 0, 0); f.st = { s: 'rest', t: 999, n: 0, pulse: 0 }; f.restFor = 60; f.wakeT = 0; f.camoWill = false; f.isNight = true; window.__cam = [-0.5, 1.9, 7, -0.5, 0.8, 1.4]; });
await p.waitForTimeout(6000); console.log('sleepK', await p.evaluate(() => window.__fishes.list[0].sleepK)); await p.screenshot({ path: out + '/1_sleep.png' });
// ink
await p.evaluate(() => { const f = window.__fishes.list[0]; f.startle({ x: -3 }); window.__cam = [-0.5, 2.6, 9, -0.5, 1.4, 1.4]; });
await p.waitForTimeout(2500); await p.screenshot({ path: out + '/2_ink.png' });
// new decor: a coconut and a pot; the seahorse and octopus go to look
await p.evaluate(async () => { window.__cam = null; const g = window.__game; await g.dispatch({ t: 'buyDecor', type: 'pot', x: 2.4, z: 1.0, ry: 0 }); await g.dispatch({ t: 'buyDecor', type: 'coconut', x: -2.4, z: 1.4, ry: 0 }); });
await p.waitForTimeout(6000);
console.log('curious', await p.evaluate(() => JSON.stringify(window.__fishes.list.map((f) => [f.name, f.pos.x.toFixed(1), f.st?.mode ?? null, f.idle > 0 ? 'holding' : '', f.den?.id]))));
await p.evaluate(() => { window.__cam = [0, 2.4, 11, 0, 1.2, 1.2]; }); await p.waitForTimeout(2500); await p.screenshot({ path: out + '/3_decor.png' });
// top limit: send every fish to the surface
await p.evaluate(() => { for (const f of window.__fishes.list) { f.target.set(0, 30, 1.5); f.pos.y = 14.5; } window.__cam = null; }); await p.waitForTimeout(3000);
console.log('maxY', await p.evaluate(() => Math.max(...window.__fishes.list.map((f) => f.pos.y))));
await p.screenshot({ path: out + '/4_top.png' });
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

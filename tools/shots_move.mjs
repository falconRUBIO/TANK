// Watch the seahorse and octopus move: samples positions and states, and takes a few frames. OUT=dir node tools/shots_move.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/move'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(async () => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 8; s.shells = 500; for (const [t, x, z] of [['fern', -3, 2], ['rock', 2.5, 1.5], ['boulder', -1, 0.6]]) await g.dispatch({ t: 'buyDecor', type: t, x, z, ry: 0 });
  let n = 0; for (const k of ['seahorse', 'octopus']) s.fish.push({ id: 'x' + n++, name: k, species: k, seed: 11 + n, born: Date.now() - 5 * 864e5, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, appetite: 0.05, owner: 'me', ownerName: 'You' }); g.emit('state'); });
const log = [];
for (let i = 0; i < 14; i++) { await p.waitForTimeout(2500); const o = await p.evaluate(() => window.__fishes.list.filter((f) => ['seahorse', 'octopus'].includes(f.id)).map((f) => ({ id: f.id, x: +f.pos.x.toFixed(2), y: +f.pos.y.toFixed(2), z: +f.pos.z.toFixed(2), pitch: +f.pitch.toFixed(2), st: f.st?.s, sq: +(f.sq || 0).toFixed(2), rest: +(f.restK || 0).toFixed(2), sp: +f.vel.length().toFixed(2) }))); log.push(o); if (i % 4 === 1) await p.screenshot({ path: `${out}/f${i}.png` }); }
for (const id of ['seahorse', 'octopus']) { console.log(id); for (const o of log) { const f = o.find((q) => q.id === id); console.log(' ', JSON.stringify(f)); } }
const bad = log.flat().filter((f) => [f.x, f.y, f.z, f.pitch].some((v) => !Number.isFinite(v))); console.log(bad.length ? 'NaN positions!' : 'positions finite');
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

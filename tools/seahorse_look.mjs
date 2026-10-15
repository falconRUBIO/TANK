// The seahorse, close up for art review: four of them side by side with different colours, each frozen in a tail pose
// (swimming, resting curl, tight spiral, wrapped round a stem). OUT=dir node tools/seahorse_look.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');      // (CI points PW_MODULE at its own playwright)
import fs from 'node:fs';
const OUT = process.env.OUT || '/tmp/seahorse_look'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://localhost:8123/?q=2&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(1500);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 8; s.fish.length = 0; const born = Date.now() - 9 * 864e5;
  [3, 4, 11, 22].forEach((seed, i) => s.fish.push({ id: 'h' + i, name: 'H' + i, species: 'seahorse', seed, born, stage: 'adult', traits: ['Calm'], happy: 0.9, health: 1 }));
  s.decor.length = 0; g.emit('state'); document.querySelectorAll('header,nav,#goal,#coach,#toast,#modal,#settle,#reunion,#fishpill,#sub').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(1500);
const poses = [[-1, 0], [0, 0], [1, 0], [1, 1]];
await p.evaluate((poses) => { const F = window.__fishes; ['h0', 'h1', 'h2', 'h3'].forEach((id, i) => { const h = F.byId.get(id); h.update = () => {}; h.pos.set(-2.4 + i * 1.6, 6, 1); h.heading = 0; h.pitch = 0; h.roll = 0; h.curlK = poses[i][0]; h.gripK = poses[i][1]; h.group.position.copy(h.pos); h.group.rotation.set(0, 0, 0); h.setPose(0, true); }); window.__cam = [0, 5.6, 13, 0, 5.4, 1]; }, poses);
await p.waitForTimeout(2500); await p.screenshot({ path: `${OUT}/side.png` });
await p.evaluate(() => { const F = window.__fishes; ['h0', 'h1', 'h2', 'h3'].forEach((id) => { const h = F.byId.get(id); h.heading = 0.9; h.group.rotation.set(0, 0.9, 0); }); });
await p.waitForTimeout(1200); await p.screenshot({ path: `${OUT}/turned.png` });
await p.evaluate(() => { const h = window.__fishes.byId.get('h2'); window.__cam = [h.pos.x + 0.3, h.pos.y + 0.3, h.pos.z + 4.2, h.pos.x + 0.3, h.pos.y - 0.2, h.pos.z]; window.__fishes.byId.get('h2').group.rotation.set(0, 0, 0); });
await p.waitForTimeout(1500); await p.screenshot({ path: `${OUT}/close.png` });
console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'ok'); await b.close();

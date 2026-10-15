// How much CPU three octopuses cost per frame: pose work, simulation work and voxel counts. Needs the solo game on 8123. node tools/bench_octo.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');      // (CI points PW_MODULE at its own playwright)
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && /^(fish|tank|frame|sync|water change) error/.test(m.text())) errors.push(m.text()); });
await p.goto('http://localhost:8123/?q=2&dev=1&tod=afternoon&fps=1'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.fish.length = 0;
  for (let i = 0; i < 3; i++) s.fish.push({ id: 'x' + i, name: 'Octo' + i, species: 'octopus', seed: 5 + i, born: Date.now() - 12 * 864e5, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, owner: 'u' + i, ownerName: 'P' + i, home: i === 0 ? 'c1' : null, movedAt: 0 });
  s.decor.length = 0; s.decor.push({ id: 'c1', type: 'coconut', x: 2.4, z: 1.5, ry: 0 }, { id: 'r1', type: 'rock', x: -2.5, z: 1.2, ry: 0 }); g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(3000);
const r = await p.evaluate(() => {
  const F = window.__fishes, list = F.list.filter((f) => f.species.move === 'jet'), out = { octos: list.length, vox: list.map((f) => f.vox.length), mobile: list.map((f) => f.mobile.length) };
  // count centre-line evaluations per full pose
  const f = list[0], rig = f.rig, orig = rig.pose; let calls = 0; rig.pose = (...a) => { calls++; return orig(...a); }; f.setPose(f.phase); out.poseCalls = calls; rig.pose = orig;
  const N = 200; let t0 = performance.now(); for (let i = 0; i < N; i++) f.setPose(f.phase + i * 0.1); out.poseMs = +((performance.now() - t0) / N).toFixed(3);
  t0 = performance.now(); for (let i = 0; i < N; i++) window.__sim(1); out.simFrameMs = +((performance.now() - t0) / N).toFixed(3);
  return out;
});
console.log(JSON.stringify(r)); await p.waitForTimeout(3000); console.log('meter:', (await p.textContent('body')).match(/\d+ fps[^\n]*\n[^\n]*/)?.[0]);
console.log(errors.length ? 'errors: ' + errors.join('; ') : 'No page errors'); await b.close();

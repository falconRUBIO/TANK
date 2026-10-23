// the game's own octopus as it really looks in the tank: brought to the front glass, facing you, rendered alone on a clear background
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 600, height: 900 } })).newPage(); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:8123/?q=2&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForFunction(() => window.__booted, null, { timeout: 120000 });
const url = await p.evaluate(async ([yaw, tilt]) => { const THREE = await import('three'); const S = await import('/src/w3/stage.js'); const F = window.__fishes, o = F.list.find((x) => x.species?.move === 'jet'); window.__simHold = true;
  o.st = { s: 'rest', t: 999, mode: null }; o.hunt = null; o.inspect = null; o.task = null; o.glassAt = null; o.sleepK = 0;
  for (let i = 0; i < 160; i++) { o.pos.set(0, 4, 1.5); o.vel.set(0, 0, 0); o.heading = yaw; o.gazeT = 9; o.pitch = tilt; F.update(0.05, i * 0.05); o.update(0.05, Math.random, F.list); o.pos.set(0, 4, 1.5); o.heading = yaw; o.pitch = tilt; }
  o.setPose?.(0, true); o.group.updateMatrixWorld(true);
  const rr = S.renderer, sc = S.scene; const vis = []; sc.traverse((n) => { if (n.isMesh || n.isPoints || n.isSprite || n.isLine) { vis.push([n, n.visible]); n.visible = false; } }); o.group.traverse((n) => { n.visible = true; });
  const bg = sc.background, fog = sc.fog; sc.background = null; sc.fog = null; const box = new THREE.Box3().setFromObject(o.group), c = box.getCenter(new THREE.Vector3()), r = Math.max(box.max.x - box.min.x, box.max.y - box.min.y) * 0.58;
  const cam = new THREE.OrthographicCamera(-r, r, r, -r, 0.1, 100); cam.position.set(c.x, c.y + r * 0.35, c.z + 20); cam.lookAt(c.x, c.y, c.z);
  const rt = new THREE.WebGLRenderTarget(1024, 1024, { samples: 0 }); rr.setRenderTarget(rt); rr.setClearColor(0x000000, 0); rr.clear(); rr.render(sc, cam); const px = new Uint8Array(1024 * 1024 * 4); rr.readRenderTargetPixels(rt, 0, 0, 1024, 1024, px); rr.setRenderTarget(null);
  for (const [n, v] of vis) n.visible = v; sc.background = bg; sc.fog = fog; window.__simHold = false;
  const cv = document.createElement('canvas'); cv.width = cv.height = 1024; const g = cv.getContext('2d'), im = g.createImageData(1024, 1024); for (let y = 0; y < 1024; y++) im.data.set(px.subarray((1023 - y) * 4096, (1024 - y) * 4096), y * 4096); g.putImageData(im, 0, 0); return cv.toDataURL('image/png'); }, [+(process.env.YAW ?? -1.5708), +(process.env.TILT ?? 0)]);
(await import('node:fs')).writeFileSync(process.env.OUT ?? 'docs/audit/octo_logo.png', Buffer.from(url.split(',')[1], 'base64')); await b.close(); console.log('ok');

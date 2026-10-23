// a look at the tank as it renders now, at phone size, afternoon and evening, with a lived-in tank
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const tod of ['morning', 'night']) { const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 })).newPage();
  await p.goto(`http://localhost:8123/?q=2&dev=1&tod=${tod}`); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForFunction(() => window.__booted, null, { timeout: 120000 });
  await p.evaluate(async () => { const g = window.__game; window.__quietUntil = Date.now() + 1e9; g.state.flags.tut = 5; await g.dispatch({ t: 'dev', what: 'level', to: 8 }, { dev: true }); for (let i = 0; i < 30; i++) await g.dispatch({ t: 'dev', what: 'shells' }, { dev: true });
    for (const [sp, nm] of [['goldfish', 'Nemo'], ['tang', 'Blue'], ['seahorse', 'Sunny'], ['blueleg', 'Pebble'], ['neon', 'Zip'], ['angelfish', 'Regal']]) await g.dispatch({ t: 'buyFish', species: sp, name: nm }).catch(() => null); await g.dispatch({ t: 'dev', what: 'rush' }, { dev: true });
    for (const [type, x, z] of [['cave', -2.4, 0.3], ['seafan', 2.6, -0.2], ['liverock', 0.4, 1.6], ['grass', -0.8, 2.4], ['kelp', 3.4, 1.8], ['anemone', -3.2, 2.2], ['rubble', 1.8, 2.6]]) await g.dispatch({ t: 'buyDecor', type, x, z, ry: 0 }); for (const id of ['modal', 'coach', 'settle', 'toast', 'fishpill']) document.getElementById(id)?.classList.remove('on'); });
  await p.waitForTimeout(6000); await p.screenshot({ path: `docs/audit/gfx_after_${tod}.png`, timeout: 240000 }); await p.close(); }
await b.close();

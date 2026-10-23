// The keepsake pickup transition, directly: an octopus fetching a shell has arrived and is working at it, but its walk stopped ~1.3 from the
// shell (where the sand let it stand). It must pick it up, not give up and loop. Also: passing by at 1.5 without having arrived picks
// nothing up; after it drops or sets down a shell it does not grab that same shell straight back.
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const base = process.env.BASE || 'http://localhost:8123';
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, JSON.stringify(x).slice(0, 300)); if (!ok) fails++; };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForFunction(() => window.__game?.state && window.__booted, null, { timeout: 120000 });
await p.evaluate(async () => { const g = window.__game, s = g.state, now = Date.now(); window.__quietUntil = Date.now() + 1e9; s.flags.tut = 5; const o = s.fish.find((f) => f.species === 'octopus');
  s.decor.push({ id: 'c1', type: 'coconut', x: -2.4, z: 0.4, ry: 0 }); o.home = 'c1'; s.keeps = [{ id: 'k1', k: 'shell', adv: 'reef', by: o.id, byName: o.name, at: now - 864e5, x: 2.6, z: 0.6 }]; s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] }; g.emit('state'); });
await p.waitForTimeout(2500);
const T = async (code) => { await p.evaluate(() => { const F = window.__fishes, o = F.list.find((x) => x.species?.move === 'jet'); if (o.keepCarry?.it) o.keepCarry.it.carried = false; o.keepCarry = null; });      // (each check starts with the shell back on the sand)
  return p.evaluate(`(() => { const F = window.__fishes, o = F.list.find((x) => x.species?.move === 'jet'), k = (F.keepSpots?.() ?? []).find((q) => q.id === 'k1'), step = (n) => { for (let i = 0; i < n; i++) { F.update(0.05, i * 0.05); o.update(0.05, Math.random, F.list); } }; F.attnAt = Date.now() - 3e5; ${code} })()`); };
// 1. arrived and working at it, 1.3 away
const r1 = await T(`o.keepNo = null; o.keepCarry = { id: 'k1', phase: 'go', t: 0 }; o.pos.set(k.x - 1.3, o.pos.y, k.z); o.inspect = { x: k.x, z: k.z, id: 'k1', type: 'keep' }; o.st = { ...o.st, s: 'work', mode: 'inspect', t: 7 }; step(4); return { phase: o.keepCarry?.phase ?? null, d: +Math.hypot(o.pos.x - k.x, o.pos.z - k.z).toFixed(2) };`);
ck('arrived and working at a shell 1.3 away: it picks it up (no give-up loop)', r1.phase === 'carry', r1);
// 2. merely passing 1.5 away, not arrived: nothing picked up
const r2 = await T(`o.keepCarry = null; o.keepNo = null; for (const q of F.keepSpots()) if (q.it) q.it.carried = false; o.keepCarry = { id: 'k1', phase: 'go', t: 0 }; o.pos.set(k.x - 1.5, o.pos.y, k.z); o.inspect = { x: k.x, z: k.z, id: 'k1', type: 'keep' }; o.st = { ...o.st, s: 'crawl', mode: 'inspect', t: 7 }; F.update(0.05, 0); return { phase: o.keepCarry?.phase ?? null };`);
ck('crawling past 1.5 away (not arrived): no pickup from a distance', r2.phase === 'go', r2);
// 3. dropped: it does not grab the same shell straight back
const r3 = await T(`o.keepCarry = null; o.keepNo = null; o.keepCarry = { id: 'k1', phase: 'go', t: 0 }; o.pos.set(k.x - 0.5, o.pos.y, k.z); F.update(0.05, 0); const was = o.keepCarry?.phase; o.keepCarry.slip = 0.01; o.keepCarry.t = 1; F.update(0.05, 0); const dropped = !o.keepCarry; let again = 0; for (let n = 0; n < 30; n++) { F.keepT = 0; o.inspect = null; o.task = null; o.hunt = null; F.update(0.05, 0); if (o.keepCarry?.id === 'k1') again++; } return { was, dropped, again };`);
ck('after it drops a shell it does not go straight back for the same one (30 chances)', r3.was === 'carry' && r3.dropped && r3.again === 0, r3);
ck('no page errors', !errors.length, errors);
await b.close(); console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);

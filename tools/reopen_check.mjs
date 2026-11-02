// Reopening the tank after the app was closed: every animal is where it was left (kept on this phone a few hours), not dropped somewhere new;
// with nothing kept, a nursery brood starts together by its father, not scattered round the tank.   Needs the solo game on 8123.   node tools/reopen_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 393, height: 852 } }), p = await ctx.newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
const boot = async (first) => { if (first) { await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon&season=none'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); } else { await p.reload(); await p.evaluate(() => { window.__wantN = 4; }).catch(() => {}); } await p.waitForFunction(() => window.__game?.state && window.__booted && window.__fishes?.list?.length > (window.__wantN ?? 0), null, { timeout: 120000 }); };
await boot(true); await p.waitForTimeout(1500);
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; s.level = 8; s.fish.length = 0; s.decor.length = 0;
  s.fish.push({ id: 'h1', name: 'Sunny', species: 'seahorse', seed: 4, born: now - 30 * D, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, sex: 'm', mate: 'h2', lastBirth: now - D }, { id: 'h2', name: 'Pearl', species: 'seahorse', seed: 11, born: now - 30 * D, stage: 'adult', traits: ['Shy'], happy: 0.8, health: 1, sex: 'f', mate: 'h1' },
    { id: 'g1', name: 'Nemo', species: 'goldfish', seed: 3, born: now - 30 * D, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1 });
  s.decor.push({ id: 'p1', type: 'kelp', x: -2.4, z: 2.0, ry: 0 }, { id: 'p2', type: 'grass', x: 1.6, z: 1.6, ry: 0 });
  const k = { explore: 'Curious', plants: 'Calm', social: 'Social' }; s.nursery = { id: 'n5', father: 'h1', mother: 'h2', pa: { id: 'h1', name: 'Sunny', seed: 4 }, ma: { id: 'h2', name: 'Pearl', seed: 11 }, born: now - 3 * D, readyAt: now + 2 * D, n: 12, gen: 1, cands: ['explore', 'plants', 'social'].map((role, i) => ({ id: 'n5b' + i, name: ['Dot', 'Nori', 'Mango'][i], seed: 500 + i * 13, role, traits: [k[role]], sex: i ? 'f' : 'm' })) };
  g.emit('state'); for (const id of ['modal', 'coach', 'settle', 'toast']) document.getElementById(id)?.classList.remove('on'); });
await p.waitForTimeout(12000);      // (they settle in a while)
const where = () => p.evaluate(() => Object.fromEntries(window.__fishes.list.filter((f) => !f.dead && f.fid).map((f) => [f.fid, [f.pos.x, f.pos.y, f.pos.z]])));
await p.evaluate(() => window.dispatchEvent(new Event('pagehide'))); const before = await where();
await boot(false); await p.waitForTimeout(400); const after = await where();
const ids = Object.keys(before).filter((id) => after[id]), off = ids.map((id) => Math.hypot(...before[id].map((v, i) => v - after[id][i]))), worst = Math.max(...off);
ck('reopened, every animal is close to where it was left (babies included)', ids.length >= 10 && worst < 0.8, { animals: ids.length, worst: +worst.toFixed(2) });
await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('ourtank.pos.')) localStorage.removeItem(k); });      // (nothing kept: a phone that has not had the tank open lately)
await boot(false); await p.waitForTimeout(400);
const spread = await p.evaluate(() => { const L = window.__fishes.list.filter((f) => f.nursery && !f.dead), dad = window.__fishes.byId.get('h1'); return { n: L.length, far: +Math.max(...L.map((f) => f.pos.distanceTo(dad.pos))).toFixed(2) }; });
ck('with nothing kept, the brood starts together by its father', spread.n >= 10 && spread.far < 2.2, spread);
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Reopen checks passed'); process.exit(fails ? 1 : 0);

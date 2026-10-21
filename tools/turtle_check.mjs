// The sea turtle: it lives in the tank the way a real one does (comes up to breathe, rests low by the rock, grazes the sea grass), its card counts
// down to the ocean while it grows, and once grown it can be let go for shells and a keepsake. Needs the solo game on 8123. node tools/turtle_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const base = process.env.BASE || 'http://localhost:8123';
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.evaluate(() => document.querySelector('#mok').click());
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(); s.flags.tut = 5; s.level = 7;
  s.fish.push({ id: 'tA', name: 'Shelly', species: 'turtle', seed: 3, born: now - 20 * 864e5, arrived: now - 16 * 864e5, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, owner: 'me', ownerName: 'You' }, { id: 'tB', name: 'Pebble', species: 'turtle', seed: 5, born: now - 4 * 864e5, arrived: now - 4 * 864e5, stage: 'juvenile', traits: ['Calm'], happy: 0.8, health: 1, owner: 'me', ownerName: 'You' }, { id: 'aA', name: 'Major', species: 'angelfish', seed: 4, born: now - 20 * 864e5, stage: 'adult', traits: [], happy: 0.8, health: 1 });
  s.decor.push({ id: 'lA', type: 'ledge', x: -1.6, z: 0.9, ry: 0 }, { id: 'sA', type: 'seagrass', x: 2.2, z: 1.2, ry: 0 }); g.emit('state'); document.querySelectorAll('#modal').forEach((e) => e.classList.remove('on')); });
await p.waitForTimeout(3500);
ck('the turtles are in the water, with flippers that stroke', await p.evaluate(() => { const f = window.__fishes.byId.get('tA'); return !!f && f.vox.some((v) => v.flip) && f.vox.some((v) => v.tag === 'head'); }));
const life = await p.evaluate(async () => { const F = window.__fishes, f = F.byId.get('tA'), top = window.__Fish3D?.topY ?? 13, seen = new Set(); let hi = 0, low = 99; f.breathAt = performance.now() + 15e3; window.__simClock(true);
  for (let i = 0; i < 5400; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); hi = Math.max(hi, f.pos.y); low = Math.min(low, f.pos.y); if (f.thought) seen.add(f.thought.split(' ').slice(0, 2).join(' ')); if (i % 600 === 0) await new Promise((q) => setTimeout(q, 0)); }
  return { hi, low, seen: [...seen] }; });
ck('it comes right up to the surface to breathe', life.hi > 10, `highest ${life.hi.toFixed(1)}`);
ck('and goes down low to rest or graze', life.low < 3.2, `lowest ${life.low.toFixed(1)}`);
ck('it does several turtle things', life.seen.length >= 3, life.seen.join(', '));
const card = async (id) => { await p.evaluate((id) => window.__showCard(window.__fishes.byId.get(id)), id); await p.waitForTimeout(1200); return p.evaluate(() => document.getElementById('card').innerText); };
const young = await card('tB'); ck('a young turtle\'s card counts down to the ocean', /Ready for the ocean in about \d+ day/.test(young));
const grown = await card('tA'); ck('a grown one has its release button, and its milestone is the ocean', /Release Shelly to the ocean/.test(grown) && /Ready for the ocean/.test(grown) && !/Became a parent/.test(grown));
const sh0 = await p.evaluate(() => window.__game.state.shells);
await p.evaluate(() => document.getElementById('turtrel')?.click()); await p.waitForTimeout(1200); await p.evaluate(() => [...document.querySelectorAll('#modal.on button')].find((x) => /Let it go/.test(x.textContent))?.click());
await p.waitForFunction(() => !window.__game.state.fish.some((f) => f.id === 'tA'), null, { timeout: 30000 }).catch(() => {});
const after = await p.evaluate(() => ({ gone: !window.__game.state.fish.some((f) => f.id === 'tA'), scute: (window.__game.state.keeps ?? []).some((k) => k.k === 'scute'), shells: window.__game.state.shells, rel: window.__game.state.released?.length ?? 0 }));
ck('letting it go: it leaves, its keepers are paid, and it leaves a scute', after.gone && after.scute && after.shells >= sh0 + 100 && after.rel === 1, JSON.stringify({ ...after, paid: after.shells - sh0 }));
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Turtle checks passed'); process.exit(fails ? 1 : 0);

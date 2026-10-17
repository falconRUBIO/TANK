// The Biscuit proof in the real game: Biscuit climbs out of the tank while you watch, comes back with a bottle cap, goes and fetches it and
// carries it to its coconut shell (on screen), the page is reloaded (the game starts again from its saved tank), the clock moves on 30 days,
// and Biscuit still knows that same bottle cap: it fetches it as its own, its profile tells its story, the tank's history has it.
// Screenshots of each step go to OUT (default /tmp/biscuit). Needs the solo game on 8123.  node tools/biscuit_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/biscuit'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 760 } }), p = await ctx.newPage(); const errors = []; let fails = 0;
p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
const DAY = 864e5;
const boot = async () => { await p.waitForFunction(() => window.__game?.state && window.__fishes, null, { timeout: 120000 }); await p.waitForTimeout(2500); };
const clear = () => p.evaluate(() => { for (const b of document.querySelectorAll('button')) if (/^(Claim|OK|Not now|Later)$/i.test(b.textContent.trim()) && b.offsetParent) b.click(); document.querySelectorAll('#goal,#coach,#toast,#reunion,#settle').forEach((e) => (e.style.display = 'none')); });
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await boot();
const seed = await p.evaluate(async () => { const R = await import('/src/game/rules.js'); for (let s = 1; s < 5000; s++) if (R.octoMind({ seed: s }).type === 'collector') return s; });
await p.evaluate((seed) => { const g = window.__game, s = g.state, now = Date.now(); s.flags.tut = 5; s.createdAt = now - 20 * 864e5; s.level = 5; s.fish.length = 0;
  s.fish.push({ id: 'o1', name: 'Biscuit', species: 'octopus', seed, born: now - 15 * 864e5, arrived: now - 15 * 864e5, stage: 'adult', traits: ['Curious'], happy: 0.9, health: 1, hunger: 0.1, owner: 'me', ownerName: 'You', home: 'c1', bond: { me: 30 } });
  s.decor.length = 0; s.decor.push({ id: 'c1', type: 'coconut', x: 1.0, z: 1.2, ry: 0 }, { id: 'b1', type: 'boulder', x: -2.4, z: 0.4, ry: 0 }, { id: 'g1', type: 'grass', x: -3.0, z: 2.0, ry: 0 });
  s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] }; s.keeps = []; s.visitAt = now + 9e9; s.eggAt = now + 9e9; g.emit('state'); }, seed);
await p.waitForTimeout(2500);
const step = (n) => p.evaluate((n) => { window.__simClock(true); const F = window.__fishes; for (let i = 0; i < n; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((f) => f.update(0.05, Math.random, F.list)); } }, n);

// 1. the escape, watched
await p.evaluate(() => { const f = window.__game.state.fish[0], now = Date.now(); f.restless = { id: 'aB', at: now - 1000, until: now - 10, kind: 'short', out: 'cap' }; window.__game.emit('state'); });
await p.waitForFunction(() => window.__fishes.out?.get('o1'), null, { timeout: 30000 }).catch(() => {}); await step(40); await p.screenshot({ path: `${out}/1-climbing-out.png` });
ck('Biscuit climbs out over the rim while you watch', await p.evaluate(() => !!window.__game.state.fish[0].away && !!window.__fishes.out?.get('o1')));
await step(200); ck('…and is gone from the water', await p.evaluate(() => !window.__fishes.list.some((f) => f.fid === 'o1')));
// 2. home with a bottle cap
await p.evaluate(() => { window.__game.state.fish[0].away.until = Date.now() - 10; window.__game.emit('state'); });
await p.waitForFunction(() => window.__game.state.keeps?.length && window.__fishes.list.some((f) => f.fid === 'o1'), null, { timeout: 30000 }).catch(() => {});
await step(60); await p.screenshot({ path: `${out}/2-climbing-back.png` }); await step(200); await p.waitForTimeout(600);
const cap = await p.evaluate(() => window.__game.state.keeps.find((k) => k.by === 'o1'));
ck('it comes home with a bottle cap from that adventure, and the cap lies on the sand', !!cap && cap.k === 'cap' && cap.adv === 'aB' && await p.evaluate(() => (window.__decor.keeps?.size ?? 0) === 1), JSON.stringify(cap));
// 3. the cap ends up away from the den (a trickster fish nudged it, say); Biscuit fetches it and carries it home, on screen
await p.evaluate(() => { const k = window.__game.state.keeps[0]; k.x = -1.4; k.z = 2.6; window.__game.emit('state'); }); await p.waitForTimeout(800);
await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('o1'); F.attnAt = 0; F.rng = () => 0.6; f.inspect = null; f.task = null; f.keepCarry = { id: window.__game.state.keeps[0].id, phase: 'go', t: 0, slip: null }; });
let carried = false, home = false, shot = false; for (let i = 0; i < 40 && !home; i++) { await step(100); const s = await p.evaluate(() => window.__fishes.byId.get('o1').keepCarry?.phase ?? null); if (s === 'carry') { carried = true; if (!shot) { shot = true; await p.evaluate(() => { const f = window.__fishes.byId.get('o1'); window.__tank?.camera; }); await p.screenshot({ path: `${out}/3-carrying.png` }); } } if (!s && carried) home = true; }
await p.waitForTimeout(800); let k = await p.evaluate(() => window.__game.state.keeps[0]);
ck('it fetches the cap and carries it to its coconut shell (recorded by the tank)', carried && home && k.h?.carries >= 1 && Math.hypot(k.x - 1.0, k.z - 1.2) < 2, JSON.stringify({ carried, home, x: k.x, z: k.z, h: k.h }));
await p.screenshot({ path: `${out}/4-by-the-den.png` });
// it handles the cap a few times over the next days (each a real touch the game counts): it comes to know it
for (let d = 0; d < 3; d++) { const r = await p.evaluate(async () => { const g = window.__game, k = g.state.keeps[0]; return g.dispatch({ t: 'octoTouch', fish: 'o1', decor: k.id, kind: 'revisit' }); }); await p.evaluate(() => { window.__clockAdd = (window.__clockAdd ?? 0) + 3600e3; }); }
// the drill's clock: Date.now runs ahead by however much we have added (the game's own one-second tick then moves the tank on)
const clock = (ms) => p.evaluate((ms) => { if (!window.__realNow) { window.__realNow = Date.now.bind(Date); window.__clockAdd = window.__clockAdd ?? 0; Date.now = () => window.__realNow() + window.__clockAdd; } window.__clockAdd += ms; }, ms);
for (let d = 0; d < 3; d++) { await clock(3 * 3600e3); await p.evaluate(async () => { const k = window.__game.state.keeps[0]; await window.__game.dispatch({ t: 'octoTouch', fish: 'o1', decor: k.id, kind: 'revisit' }); }); }
ck('Biscuit knows the cap now (from handling it)', await p.evaluate(async () => { const R = await import('/src/game/rules.js'); return R.knowsKeep(window.__game.state.fish.find((f) => f.id === 'o1'), window.__game.state.keeps[0].id); }));
// 4. the game is closed and opened again (the saved tank is all there is)
await p.evaluate(() => window.__game.save()); const add = await p.evaluate(() => window.__clockAdd ?? 0);
await p.addInitScript((add) => { const real = Date.now.bind(Date); window.__clockAdd = add; window.__realNow = real; Date.now = () => real() + window.__clockAdd; }, add);
await p.reload(); await boot();
k = await p.evaluate(() => window.__game.state.keeps?.[0]);
ck('after a restart the same cap is there, with its history, by the den, and Biscuit still knows it', !!k && k.id === cap.id && k.h?.carries >= 1 && await p.evaluate(async () => { const R = await import('/src/game/rules.js'); return R.knowsKeep(window.__game.state.fish.find((f) => f.id === 'o1'), window.__game.state.keeps[0].id); }), JSON.stringify(k));
// 5. thirty days pass (the clock moves a day at a time; it is fed each day; it never touches the cap)
for (let d = 0; d < 30; d++) { await clock(DAY); await p.waitForTimeout(1300); await p.evaluate(async () => { const g = window.__game; for (const f of g.state.fish) if (f.species === 'octopus') await g.dispatch({ t: 'feed', food: 'crab', fish: f.id }); g.state.hunger = 0.1; g.state.water = 1; g.state.glass = 0; }); }
const after = await p.evaluate(async () => { const R = await import('/src/game/rules.js'), s = window.__game.state, f = s.fish.find((x) => x.id === 'o1'), k = s.keeps[0]; return { alive: !!f, knows: R.knowsKeep(f, k?.id), sameCap: k?.id, adv: k?.adv, denObjs: f?.denMem?.objs, story: k ? R.keepStory(s, k, R) : null, hist: (s.history ?? []).map((h) => `Day ${h.day}: ${h.text}`), caps: (s.capsules ?? []).map((c) => c.day) }; });
ck('30 days on, Biscuit is alive and still knows that same bottle cap', after.alive && after.knows && after.sameCap === cap.id && after.adv === 'aB', JSON.stringify({ knows: after.knows, adv: after.adv }));
ck('it is still part of Biscuit\'s den, and its story is told from the record', (after.denObjs ?? []).includes(cap.id) && /^Bottle cap: Biscuit found it on day \d+, carried \d+ times?, kept beside its den for (29|3\d) days\.$/.test(after.story ?? ''), after.story);
// and it acts on it: given the chance, it goes to its cap as its own
await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('o1'); F.keepT = 0; F.rng = () => 0.1; f.inspect = null; f.task = null; f.keepCarry = null; if (f.st) f.st.mode = null; }); await step(2);
const th = await p.evaluate(() => window.__fishes.byId.get('o1').keepWhy ?? null);
ck('Biscuit goes over to its bottle cap, as its own (not as something strange)', th?.id === cap.id && th.known && /its bottle cap/.test(th.thought ?? ''), JSON.stringify(th));
await clear(); await p.waitForTimeout(800); await p.screenshot({ path: `${out}/5-thirty-days-later.png` });
// 6. the tank's history page
await clear(); await p.waitForTimeout(800); await p.evaluate(() => { window.__ui.open('friends'); }); await p.waitForTimeout(400); await p.evaluate(() => document.querySelector('[data-sub="journal"]')?.click()); await p.waitForTimeout(400); await p.evaluate(() => document.querySelector('[data-sub="history"]')?.click()); await p.waitForTimeout(600);
const hv = await p.evaluate(() => document.querySelector('#sheet')?.innerText ?? ''); await p.screenshot({ path: `${out}/6-tank-history.png` });
ck('Tank history lists the adventure with the cap, and the time capsules, by day', /came back holding a bottle cap/.test(hv) && /Time capsule/.test(hv), hv.slice(0, 300).replace(/\n/g, ' | '));
await p.evaluate(() => document.querySelector('.hrow.cap')?.click()); await p.waitForTimeout(600); await p.screenshot({ path: `${out}/7-time-capsule.png` });
ck('a time capsule opens with its comparison', await p.evaluate(() => !!document.querySelector('.capcard .capcmp')));
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Biscuit checks passed'); process.exit(fails ? 1 : 0);

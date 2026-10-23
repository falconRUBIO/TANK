// Hermit crabs in the browser: bought from the Shop like any animal, with the free shell; they walk, climb, look shells over, try one that is too big,
// move house (the old shell staying in the tank, after a reload too), pull in from a big animal, follow one another, and the octopus, a goby, a
// seahorse and a puffer each notice them. A tap says what a crab is really doing. Steps the tank by hand (headless drawing is far too slow to wait on).
import fs from 'node:fs'; import path from 'node:path';
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const base = process.env.BASE || 'http://localhost:8123', OUT = process.env.OUT || '/tmp/crabs'; fs.mkdirSync(OUT, { recursive: true });
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x.slice(0, 240) : JSON.stringify(x).slice(0, 240)); if (!ok) fails++; };
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForFunction(() => window.__game?.state && window.__booted, null, { timeout: 180000 });
await p.evaluate(async () => { const g = window.__game; window.__quietUntil = Date.now() + 1e9; g.state.flags.tut = 5; await g.dispatch({ t: 'dev', what: 'level', to: 6 }, { dev: true }); for (let i = 0; i < 10; i++) await g.dispatch({ t: 'dev', what: 'shells' }, { dev: true }); g.emit('state'); for (const id of ['modal', 'coach', 'settle', 'toast']) document.getElementById(id)?.classList.remove('on'); });
const step = (secs, until = null) => p.evaluate(([secs, until]) => { const F = window.__fishes, f = new Function('F', 'return ' + (until ?? 'false')); for (let i = 0; i < secs * 20; i++) { window.__t = (window.__t ?? 0) + 0.05; F.update(0.05, window.__t); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); if (until && f(F)) return true; } return !until; }, [secs, until]);
// 1. the Shop: a crab from Sea life (a tap shows its card, Buy adopts), its free shell under Shells
await p.evaluate(() => { window.__ui.open('decorate'); document.querySelector('[data-cat=FISH]').click(); }); await p.waitForTimeout(700);
const tile = await p.evaluate(() => [...document.querySelectorAll('.card[data-k^="fish:"]')].filter((c) => /Hermit/.test(c.textContent)).map((c) => c.textContent.replace(/\s+/g, ' ').trim()));
ck('the three hermit crabs are in Sea life with their prices', tile.length === 3 && tile.some((t) => /Blue-leg.*24/.test(t)) && tile.some((t) => /Scarlet.*36/.test(t)) && tile.some((t) => /Halloween.*52/.test(t)), tile.join(' | '));
await p.evaluate(() => document.querySelector('.card[data-k="fish:blueleg"]').click()); await p.waitForTimeout(800);
const card = await p.evaluate(() => document.querySelector('.notesheet.deco.on')?.innerText ?? ''); ck('its card says what it is and what it needs (a shell that fits among them)', /Blue-leg/.test(card) && /A shell that fits/.test(card), card.replace(/\n/g, ' '));
await p.evaluate(() => { document.querySelectorAll('.notesheet').forEach((e) => e.remove()); return window.__game.dispatch({ t: 'buyFish', species: 'blueleg', name: 'Pebble' }); });      // (adopting through the dialogs is the playthrough's job)
for (const [sp, nm] of [['scarlet', 'Ruby'], ['halloween', 'Jack']]) await p.evaluate(([sp, nm]) => window.__game.dispatch({ t: 'buyFish', species: sp, name: nm }), [sp, nm]);
await p.evaluate(() => window.__game.dispatch({ t: 'dev', what: 'rush' }, { dev: true })); await p.waitForTimeout(1500);
const crabs = await p.evaluate(() => window.__game.state.fish.filter((f) => f.crab).map((f) => [f.name, f.species, f.crab.type, f.crab.shell.t]));
ck('they arrive, each with a temperament and in a small worn shell', crabs.length === 3 && crabs.every((c) => c[3] === 'cshell_worn' && c[2]), JSON.stringify(crabs));
await p.evaluate(() => { window.__ui.open('decorate'); document.querySelector('[data-cat=SHELLS]').click(); }); await p.waitForTimeout(700);
const shells = await p.evaluate(() => [...document.querySelectorAll('.card[data-k^="decor:cshell"]')].map((c) => c.textContent.replace(/\s+/g, ' ').trim()));
ck('Shells lists the six shells (the ivory spiral free, with the first crab), not the earned or hidden ones as for sale', shells.length >= 6 && shells.some((t) => /Ivory.*FREE/i.test(t)) && shells.some((t) => /Rose Stripe.*6/.test(t)) && shells.some((t) => /Coral Shell.*22/.test(t)) && !shells.some((t) => /Whelk|Worn/.test(t)), shells.join(' | '));
await p.evaluate(async () => { const g = window.__game; await g.dispatch({ t: 'buyDecor', type: 'cshell_ivory', x: 1.6, z: 2.3, ry: 0, free: true }); await g.dispatch({ t: 'buyDecor', type: 'cshell_coral', x: -1.2, z: 2.4, ry: 0 }); await g.dispatch({ t: 'buyDecor', type: 'cshell_rose', x: 0.3, z: 0.5, ry: 0 }); window.__ui.open('tank'); });
await p.waitForTimeout(1500); await p.screenshot({ path: `${OUT}/01_crabs_arrive.png` });
// 2. they walk, and climb
const walked = await p.evaluate(() => window.__fishes.list.filter((f) => f.crab).map((c) => [c.pos.x, c.pos.z]));
await step(30); const moved = await p.evaluate((w) => window.__fishes.list.filter((f) => f.crab).map((c, i) => Math.hypot(c.pos.x - w[i][0], c.pos.z - w[i][1])), walked);
ck('they walk about the sand', moved.filter((d) => d > 0.4).length >= 2, JSON.stringify(moved.map((d) => +d.toFixed(2))));
await p.evaluate(async () => { const g = window.__game; await g.dispatch({ t: 'buyDecor', type: 'boulder', x: -2.6, z: 0.8, ry: 0 }); }); await p.waitForTimeout(800);
await p.evaluate(() => { const F = window.__fishes, c = F.list.find((f) => f.name === 'Jack'), sp = F.spots().find((s) => s.type === 'boulder'); c.pos.set(sp.x + 0.9, c.pos.y, sp.z); c.cs = { s: 'walk', to: { x: sp.x + 0.7, z: sp.z }, then: { s: 'climb', t: 0, sp, base: { x: sp.x + 0.7, z: sp.z } } }; });
const climbed = await step(20, "F.list.find((f) => f.name === 'Jack').cs.s === 'perch'"); const perch = await p.evaluate(() => { const c = window.__fishes.list.find((f) => f.name === 'Jack'); const sp = window.__fishes.spots().find((q) => q.type === 'boulder'); return { s: c.cs.s, up: +(c.pos.y - sp.y).toFixed(2), doing: c.doing }; });      // (the sand height takes in the tops of the rocks: up on one, it is that far above the rock's foot)
ck('a crab climbs a rock and sits up on top of it', climbed && perch.up > 0.3 && /up on the reef boulder/.test(perch.doing ?? ''), perch);
await p.evaluate(() => { const F = window.__fishes, c = F.list.find((f) => f.name === 'Jack'); window.__focus(F.list.indexOf(c)); }); await p.waitForTimeout(1500); await p.screenshot({ path: `${OUT}/02_climbing.png` });
// 3. a shell too big: it tries it and walks off. 4. outgrown, it moves into one that fits; the old shell stays
await p.evaluate(() => { const F = window.__fishes, g = window.__game, c = F.list.find((f) => f.name === 'Pebble'); window.__focus(null); g.state.fish.find((f) => f.name === 'Pebble').born -= 3 * 864e5; g.state.fish.find((f) => f.name === 'Pebble').crab.type = 'collector'; g.emit('state'); const co = g.state.decor.find((d) => d.type === 'cshell_coral'); c.inspected.clear(); c.rng = () => 0.2; c.pos.set(co.x + 0.6, c.pos.y, co.z);      /* (a crab that does try a too-big shell on: most do, not all) */ c.cs = { s: 'inspect', t: 0, d: { id: co.id, type: co.type, x: co.x, z: co.z, ry: 0, sz: co.sz } }; window.__focus(F.list.indexOf(c)); });
const tried = await step(12, "F.list.find((f) => f.name === 'Pebble').cs.s === 'tryon'"); await p.waitForTimeout(1200); await p.screenshot({ path: `${OUT}/03_too_big.png` });
await step(6); const after = await p.evaluate(() => { const c = window.__fishes.list.find((f) => f.name === 'Pebble'); return { s: c.cs.s, shell: c.rec.crab.shell.t, rejected: !!c.cs.rejected }; });
ck('a shell far too big: it backs half into it, finds it too big, and walks off still in its own', tried && after.shell === 'cshell_worn', { tried, ...after });
await p.evaluate(() => { const F = window.__fishes, g = window.__game, c = F.list.find((f) => f.name === 'Pebble'), iv = g.state.decor.find((d) => d.type === 'cshell_ivory'); c.pos.set(iv.x + 0.7, c.pos.y, iv.z); c.cs = { s: 'inspect', t: 0, d: { id: iv.id, type: iv.type, x: iv.x, z: iv.z, ry: 0, sz: iv.sz } }; });
const phases = []; for (let k = 0; k < 60; k++) { await step(0.5); const ph = await p.evaluate(() => { const c = window.__fishes.list.find((f) => f.name === 'Pebble'); return c.cs.s + (c.cs.ph ? '/' + c.cs.ph : ''); }); if (phases.at(-1) !== ph) { phases.push(ph); if (/swap\/(out|hop|settle)/.test(ph)) { await p.waitForTimeout(1300); await p.screenshot({ path: `${OUT}/04_swap_${ph.split('/')[1]}.png` }); } } if (/walk/.test(ph) && phases.some((x) => /settle/.test(x))) break; }
const sw = await p.evaluate(() => { const g = window.__game, c = g.state.fish.find((f) => f.name === 'Pebble'); return { shell: c.crab.shell.t, hist: c.crab.hist.map((h) => h.t), old: g.state.decor.filter((d) => d.type === 'cshell_worn' && d.left === c.id).length, ivoryLeft: g.state.decor.some((d) => d.type === 'cshell_ivory'), j: g.journal.slice(-6).map((e) => e.text).find((t) => /moved into/.test(t)) }; });
ck('the whole move is played: inspect, line up, out of the old shell, across, into the new one, settle', ['inspect', 'swap/align', 'swap/out', 'swap/hop', 'swap/in', 'swap/settle'].every((x) => phases.includes(x)), phases.join(' > '));
ck('it moved into the ivory spiral: its shell history, a journal line, and its old shell left lying in the tank', sw.shell === 'cshell_ivory' && sw.hist.join() === 'cshell_worn,cshell_ivory' && sw.old === 1 && !sw.ivoryLeft && /Pebble moved into an Ivory Spiral shell/.test(sw.j ?? ''), sw);
// 5. another animal comes near: in it goes (the octopus); the octopus, a goby, a seahorse and a puffer each notice a crab
await p.evaluate(async () => { const g = window.__game; for (const sp of ['cory', 'puffer', 'seahorse']) await g.dispatch({ t: 'buyFish', species: sp, name: sp, ...(sp === 'seahorse' ? { kind: 'erectus', sex: 'm' } : {}) }); await g.dispatch({ t: 'dev', what: 'rush' }, { dev: true }); }); await p.waitForTimeout(1500);
const hide = await p.evaluate(() => { const F = window.__fishes, c = F.list.find((f) => f.name === 'Ruby'), o = F.list.find((f) => f.species?.move === 'jet'); c.cs = { s: 'idle', t: 5 }; c.cool = 0; o.pos.set(c.pos.x + 0.5, c.pos.y + 0.3, c.pos.z); for (let i = 0; i < 10; i++) c.update(0.05, Math.random, F.list); return { s: c.cs.s, doing: c.doing, who: o.name }; });
ck('a big animal right beside it: it pulls into its shell, and says who it is hiding from', hide.s === 'retract' && new RegExp(`hiding from ${hide.who}`).test(hide.doing ?? ''), hide);
await p.waitForTimeout(1200); await p.screenshot({ path: `${OUT}/05_hiding_from_octopus.png` });
const notice = await p.evaluate(() => { const F = window.__fishes, crabs = F.list.filter((f) => f.crab), c = crabs[0], out = {};
  const put = (o, dx, dy, dz) => { o.pos.set(c.pos.x + dx, c.pos.y + dy, c.pos.z + dz); o.crabCool = 0; };
  const oc = F.list.find((f) => f.species?.move === 'jet'); oc.task = oc.keepCarry = oc.hunt = oc.jarAt = oc.glassAt = oc.inspect = null; if (oc.st) { oc.st.s = 'crawl'; oc.st.mode = null; } put(oc, 2, 0.4, 0);
  const go = F.list.find((f) => f.sk === 'cory'); put(go, 0.4, 0.3, 0); const sh = F.list.find((f) => f.sk === 'seahorse'); put(sh, 0.6, 0.8, 0); sh.holdfast = { on: true, id: 'x' }; const pu = F.list.find((f) => f.sk === 'puffer'); put(pu, 1.5, 0.6, 0.5);
  F.rng = () => 0.05; for (let i = 0; i < 4; i++) { F.ctT = 0; F.crabTick(0.5); }
  return { octopus: oc.inspect?.type === 'crab' || /shell/.test(oc.thought ?? '') ? oc.thought : null, goby: /off its patch|Pebble/.test(go.thought ?? '') ? 'said: ' + go.thought : 'takes no notice', seahorse: sh.glanceT > 0 ? 'eyes it' : null, puffer: /Watching/.test(pu.thought ?? '') ? pu.thought : null }; });
ck('the octopus watches a crab (or turns over an empty shell), a goby takes no notice (it cleans fish, not crabs), a seahorse eyes one at its plant, a puffer comes to look', notice.octopus && notice.goby === 'takes no notice' && notice.seahorse && notice.puffer, notice);
// 6. tap: the label is what it is really doing, and it reacts
const tap = await p.evaluate(() => { const F = window.__fishes, c = F.list.find((f) => f.name === 'Jack'); window.__focus(F.list.indexOf(c)); return { pill: document.querySelector('#fishpill')?.innerText.replace(/\n/g, ' '), doing: c.doing }; });
ck('a tap on a crab shows its name and what it is really doing', tap.pill?.startsWith('Jack') && (!tap.doing || tap.pill.includes(tap.doing)), tap);
// 7. its card: temperament, shell, shell history; wellbeing counts a shell to grow into
const crd = await p.evaluate(async () => { document.getElementById('fishpill')?.click(); await new Promise((r) => setTimeout(r, 1500)); return document.getElementById('card')?.innerText ?? ''; });
ck("a crab's card: its kind, temperament, the shell it lives in, and its shells so far", /Halloween Hermit Crab/.test(crd) && /Temperament/.test(crd) && /Lives in/.test(crd) && /Shells so far/.test(crd), crd.slice(0, 300).replace(/\n/g, ' '));
await p.evaluate(() => window.__focus(null));
// 8. the old shell and the move survive a reload
await p.evaluate(() => window.__game.save()); await p.reload(); await p.waitForFunction(() => window.__game?.state && window.__booted, null, { timeout: 180000 }); await p.waitForTimeout(2500);
const re = await p.evaluate(() => { const g = window.__game, c = g.state.fish.find((f) => f.name === 'Pebble'), f3 = window.__fishes.byId.get(c.id); return { shell: c.crab.shell.t, old: g.state.decor.some((d) => d.type === 'cshell_worn' && d.left === c.id), shown: f3?.shellKey }; });
ck('after a reload Pebble is still in the ivory spiral and the old shell is still lying there', re.shell === 'cshell_ivory' && re.old && /cshell_ivory/.test(re.shown ?? ''), re);
// 9. five minutes of a crab, unwatched: what does it get up to
const log = await p.evaluate(() => { const F = window.__fishes, c = F.list.find((f) => f.name === 'Ruby'), seen = {}; for (let i = 0; i < 300 * 20; i++) { window.__t = (window.__t ?? 0) + 0.05; F.update(0.05, window.__t); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); const d = c.doing ? c.doing.replace(/ (the|a) .*$| [A-Z][a-z]+.*$/, '') : c.cs.s; seen[d] = (seen[d] ?? 0) + 0.05; } return Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, Math.round(v)])); });
ck('in five minutes one crab does several different things', Object.keys(log).length >= 5, log);
fs.writeFileSync(`${OUT}/five_minutes.json`, JSON.stringify(log, null, 1));
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Crab checks passed'); process.exit(fails ? 1 : 0);

// The hermit crabs' minds and their place in the tank, both ways: how wary a crab is of each kind (and of an animal that frightened it before),
// territorial fish seeing a crab off their own patch (and the crab keeping clear after), the octopus tapping a tucked-in crab's shell, a puffer
// and a bold crab squaring up, a vacancy chain (crabs waiting by a too-big shell, then moving up in turn), shell rapping that never steals a shell,
// crabs about at night and resting together by day, and fish trying to pinch a crab's food. Steps the tank by hand.
import fs from 'node:fs';
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const base = process.env.BASE || 'http://localhost:8123';
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x.slice(0, 260) : JSON.stringify(x).slice(0, 260)); if (!ok) fails++; };
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForFunction(() => window.__game?.state && window.__booted, null, { timeout: 180000 });
await p.evaluate(async () => { const g = window.__game; window.__quietUntil = Date.now() + 1e9; g.state.flags.tut = 5; await g.dispatch({ t: 'dev', what: 'level', to: 8 }, { dev: true }); for (let i = 0; i < 16; i++) await g.dispatch({ t: 'dev', what: 'shells' }, { dev: true });
  for (const [sp, nm] of [['blueleg', 'Pebble'], ['scarlet', 'Ruby'], ['halloween', 'Jack'], ['goldfish', 'Nemo'], ['puffer', 'Puff'], ['angelfish', 'Regal']]) await g.dispatch({ t: 'buyFish', species: sp, name: nm }); await g.dispatch({ t: 'dev', what: 'rush' }, { dev: true });
  await g.dispatch({ t: 'buyDecor', type: 'anemone', x: 2.6, z: 1.5, ry: 0 }); for (const id of ['modal', 'coach', 'settle', 'toast']) document.getElementById(id)?.classList.remove('on'); });
await p.waitForTimeout(2500);
const run = (fn, arg) => p.evaluate(fn, arg);
const F = 'window.__fishes';
// 1. fear by kind, and fear remembered
const fear = await run(() => { const F = window.__fishes, c = F.list.find((f) => f.name === 'Ruby'), by = (sp) => F.list.find((f) => f.sk === sp); return { octopus: +c.wary(by('octopus')).toFixed(2), puffer: +c.wary(by('puffer')).toFixed(2), angelfish: +c.wary(by('angelfish')).toFixed(2), clownfish: +c.wary(by('goldfish')).toFixed(2) }; });
ck('a crab is most wary of an octopus or a puffer, a little of an angelfish, less of a clownfish', fear.octopus > fear.angelfish && fear.puffer > fear.angelfish && fear.angelfish > fear.clownfish && fear.clownfish > 0, fear);
const mem = await run(() => { const F = window.__fishes, c = F.list.find((f) => f.name === 'Ruby'), o = F.list.find((f) => f.sk === 'octopus'), w0 = c.wary(o); c.cs = { s: 'idle', t: 9 }; c.cool = 0; o.pos.set(c.pos.x + 0.4, c.pos.y + 0.3, c.pos.z); for (let i = 0; i < 4; i++) c.update(0.05, Math.random, F.list); const w1 = c.wary(o); return { s: c.cs.s, doing: c.doing, before: +w0.toFixed(2), after: +w1.toFixed(2) }; });
ck('the octopus comes close: in it goes, and it is warier of that octopus afterwards', mem.s === 'retract' && mem.after > mem.before && /hiding from/.test(mem.doing ?? ''), mem);
// 2. the octopus taps a tucked-in crab's shell
const tap = await run(() => { const F = window.__fishes, c = F.list.find((f) => f.name === 'Ruby'), o = F.list.find((f) => f.sk === 'octopus'); o.inspect = { x: c.pos.x, z: c.pos.z, id: 'crab:' + c.fid, type: 'crab' }; o.crabCool = 99; o.pos.set(c.pos.x + 0.5, c.pos.y + 0.3, c.pos.z); F.rng = () => 0.5; for (let i = 0; i < 2; i++) { F.ctT = 0; F.crabTick(0.5); } c.update(0.05, Math.random, F.list); return { octo: o.thought, crab: c.doing }; });
ck('the octopus taps the tucked-in crab\'s shell, and the crab stays in while it does', /Tapping Ruby's shell/.test(tap.octo ?? '') && /taps its shell/.test(tap.crab ?? ''), tap);
// 3. a clownfish sees a crab off its anemone; the crab keeps clear of it afterwards
const terr = await run(() => { const F = window.__fishes, c = F.list.find((f) => f.name === 'Pebble'), n = F.list.find((f) => f.sk === 'goldfish'), an = window.__game.state.decor.find((d) => d.type === 'anemone'); F.list.find((f) => f.sk === 'octopus').pos.set(-3.5, 3, -2);
  c.cs = { s: 'idle', t: 9 }; c.pos.set(an.x + 0.3, c.pos.y, an.z); n.pos.set(an.x + 0.8, 0.9, an.z); n.crabCool = 0; F.rng = () => 0.5; F.ctT = 0; F.crabTick(0.5); c.update(0.05, Math.random, F.list);
  return { fish: n.thought, crab: c.doing, avoids: c.W.avoid(an.x, an.z, c), avoidsElsewhere: c.W.avoid(-3, -2, c) }; });
ck('a clownfish chases a crab away from its anemone; the crab keeps clear of it and says so', /Chased Pebble away from its anemone/.test(terr.fish ?? '') && /keeping clear of Nemo's anemone/.test(terr.crab ?? '') && terr.avoids && !terr.avoidsElsewhere, terr);
// 4. a puffer and a bold crab: claws up, and the puffer puffs
const puff = await run(() => { const F = window.__fishes, c = F.list.find((f) => f.name === 'Jack'), pu = F.list.find((f) => f.sk === 'puffer'); c.rec.crab.type = 'bold'; c.cs = { s: 'idle', t: 9 }; for (const o of F.list) if (!o.crab && o !== pu) o.pos.set(-3.8, 4, -2.5); pu.pos.set(c.pos.x + 0.8, c.pos.y + 0.5, c.pos.z); pu.crabCool = 0; F.rng = () => 0.1; F.ctT = 0; F.crabTick(0.5); return { puffer: pu.thought, puffT: pu.puffT, claws: c.clawUp }; });
ck('a puffer comes to look at a bold crab, which holds up its claws, and the puffer puffs up', /Puffed up at Jack/.test(puff.puffer ?? '') && puff.puffT > 0 && puff.claws > 0, puff);
// 5. a fish tries to pinch a crab's food; the crab guards it
const food = await run(() => { const F = window.__fishes, c = F.list.find((f) => f.name === 'Pebble'), n = F.list.find((f) => f.sk === 'goldfish'); n.thought = null; const _ = 0, an = window.__game.state.decor.find((d) => d.type === 'anemone'); c.noGo = {}; c.pos.set(-2, c.pos.y, 2.6); c.cs = { s: 'eat', t: 5 }; n.pos.set(-1.5, 0.6, 2.6); n.crabCool = 0; F.rng = () => 0.1; F.ctT = 0; F.crabTick(0.5); c.update(0.05, Math.random, F.list); return { fish: n.thought, crab: c.doing }; });
ck('a fish comes to pinch a crab\'s food; it guards it with its claws up', /pinch Pebble's food/.test(food.fish ?? '') && /guarding its food from Nemo/.test(food.crab ?? ''), food);
// 6. vacancy chain: two crabs too small for a coral shell wait by it; the big crab moves in; the next takes the shell it left
const chain = await run(async () => { const g = window.__game, F = window.__fishes, st = g.state; for (const o of F.list) if (!o.crab) o.pos.set(-3.8, 4, -2.5);
  const J = st.fish.find((f) => f.name === 'Jack'), R = st.fish.find((f) => f.name === 'Ruby'), P = st.fish.find((f) => f.name === 'Pebble'); J.born -= 5 * 864e5; g.emit('state');      /* (Jack grown enough for the coral; Ruby and Pebble still too small for it) */
  await g.dispatch({ t: 'buyDecor', type: 'cshell_coral', x: 0, z: 1, ry: 0 }); await new Promise((r) => setTimeout(r, 800)); const co = g.state.decor.find((d) => d.type === 'cshell_coral'), em = (d) => ({ id: d.id, type: d.type, x: d.x, z: d.z, ry: d.ry ?? 0, sz: d.sz });
  const cR = F.list.find((f) => f.name === 'Ruby'), cP = F.list.find((f) => f.name === 'Pebble'), cJ = F.list.find((f) => f.name === 'Jack');
  cR.pos.set(0.9, cR.pos.y, 1.3); cR.cs = { s: 'queue', t: 120, d: em(co) }; cP.pos.set(-0.9, cP.pos.y, 1.3); cP.cs = { s: 'queue', t: 120, d: em(co) };
  const steps = []; cJ.pos.set(0.4, cJ.pos.y, 0.4); cJ.inspected.clear(); cJ.rng = () => 0.2; cJ.cs = { s: 'inspect', t: 0, d: em(co) };
  for (let i = 0; i < 1600; i++) { window.__t = (window.__t ?? 0) + 0.05; F.update(0.05, window.__t); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); if (i % 40 === 0) { await new Promise((r) => setTimeout(r, 0)); steps.push(['Jack', 'Ruby', 'Pebble'].map((n) => { const c = F.list.find((f) => f.name === n); return n[0] + ':' + c.cs.s; }).join(' ')); }
    if (g.state.fish.find((f) => f.name === 'Ruby').crab.shell.t !== 'cshell_worn' && i > 400) break; }
  const sh = (n) => g.state.fish.find((f) => f.name === n).crab.shell.t; return { jack: sh('Jack'), ruby: sh('Ruby'), pebble: sh('Pebble'), waited: steps.some((x) => /R:queue/.test(x)), steps: steps.filter((x, i, a) => a[i - 1] !== x).slice(0, 12) }; });
ck('a vacancy chain: the others wait by the big shell; Jack moves into it, and a waiting crab then takes the shell Jack left', chain.jack === 'cshell_coral' && chain.waited && (chain.ruby === 'cshell_worn' ? false : true), chain);
// 7. shell rapping: sizing up another's shell, which holds on; no shell changes hands
const rap = await run(() => { const F = window.__fishes, g = window.__game, a = F.list.find((f) => f.name === 'Pebble'), v = F.list.find((f) => f.name === 'Ruby'), before = v.rec.crab.shell.t; a.pos.set(v.pos.x + 0.3, a.pos.y, v.pos.z); a.cs = { s: 'rap', t: 12, o: v, at: 3.5 }; v.cs = { s: 'idle', t: 9 }; const seen = [];
  for (let i = 0; i < 90; i++) { F.list.forEach((x) => x.update(0.05, Math.random, F.list)); if (a.doing && !seen.includes(a.doing)) seen.push(a.doing); if (v.doing && !seen.includes('V:' + v.doing)) seen.push('V:' + v.doing); } return { seen, kept: v.rec.crab.shell.t === before }; });
ck('shell rapping: one crab knocks on another\'s shell, sizing it up; the other holds on inside, and keeps its shell', rap.seen.some((x) => /sizing up Ruby's shell/.test(x)) && rap.seen.some((x) => /V:holding on to its shell/.test(x)) && rap.kept, rap);
// 8. night and day: more about at night, resting together by day
const dn = await run(() => { const F = window.__fishes, crabs = F.list.filter((f) => f.crab), tally = (night) => { let move = 0, rest = 0, together = 0; for (const c of crabs) { c.isNight = night; c.cs = { s: 'idle', t: 0 }; c.noGo = {}; }
    for (let i = 0; i < 2400; i++) { crabs.forEach((x) => x.update(0.05, Math.random, F.list)); for (const c of crabs) { if (c.moveK > 0.3) move++; else rest++; if (/resting with/.test(c.doing ?? '')) together++; } } return { move: Math.round((100 * move) / (move + rest)), together }; };
  for (const o of F.list) if (!o.crab) o.pos.set(-3.8, 4, -2.5); return { night: tally(true), day: tally(false) }; });
ck('hermit crabs are about more at night, and by day they rest up together', dn.night.move > dn.day.move && dn.day.together > dn.night.together, dn);
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Crab brain checks passed'); process.exit(fails ? 1 : 0);

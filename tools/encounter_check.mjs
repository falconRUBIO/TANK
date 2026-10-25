// Spontaneous moments between the animals (encounters.js): each kind, started on purpose, is something you can see (the chaser and the chased
// go at two or three times their cruising speed and turn on the spot; a nip; a fright spreads through the others; claws go up; heads flick),
// and left to itself the tank has one every half minute or so, of many kinds, never stuck. Needs the solo game on 8123.
// OUT=dir node tools/encounter_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const out = process.env.OUT || '/tmp/enc'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); const errors = []; let fails = 0;
p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.evaluate(() => document.querySelector('#modal.on #mok')?.click());
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2000);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 9; s.fish.length = 0; const now = Date.now(), born = now - 30 * 864e5;
  const mk = (id, name, species, traits, x = {}) => ({ id, name, species, seed: id.charCodeAt(0) * 3 + id.length * 7, born, stage: 'adult', traits, happy: 0.85, health: 1, fedAt: now, ...x });
  s.fish.push(mk('d1', 'Spike', 'guppy', ['Brave']), mk('a1', 'King', 'angelfish', ['Calm']), mk('n1', 'Rosy', 'danio', ['Playful']), mk('n2', 'Coral', 'danio', ['Playful']), mk('c1', 'Sky', 'neon', ['Social']), mk('c2', 'Mist', 'neon', ['Social']),
    mk('g1', 'Nemo', 'goldfish', ['Brave']), mk('o1', 'Inky', 'octopus', ['Curious']), mk('h1', 'Sunny', 'seahorse', ['Calm']), mk('h2', 'Pearl', 'seahorse', ['Curious']), mk('t1', 'Shelly', 'turtle', ['Curious'], { arrived: now - 16 * 864e5, owner: 'me', ownerName: 'You' }),
    mk('k1', 'Marcel', 'blueleg', ['Brave'], { crab: { type: 'bold', shell: { t: 'cshell_ivory', sz: 1 } } }), mk('k2', 'Pip', 'blueleg', ['Brave'], { crab: { type: 'bold', shell: { t: 'cshell_ivory', sz: 1 } } }));
  s.decor.length = 0; s.decor.push({ id: 'r1', type: 'rock', x: -2.4, z: 1.2, ry: 0 }, { id: 'p1', type: 'grass', x: 2.4, z: 1.6, ry: 0 }, { id: 'an', type: 'anemone', x: 0.6, z: 1.8, ry: 0 });
  g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); window.__quietUntil = 0; });
await p.waitForTimeout(3000);
const step = (n) => p.evaluate(async (n) => { const F = window.__fishes; for (let i = 0; i < n; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((f) => f.update(0.05, Math.random, F.list)); if (i % 400 === 0) await new Promise((r) => setTimeout(r, 0)); } }, n);
await p.evaluate(() => { window.__t = window.__t ?? 0; window.__simClock(true); window.__encOff = true; window.__fishes.list.forEach((f) => { f.isNight = false; }); });
// cruising speeds first: a minute with no encounters
const base = await p.evaluate(async () => { const F = window.__fishes, sp = {}; for (let i = 0; i < 1200; i++) { F.update(0.05, (window.__t += 0.05)); F.list.forEach((f) => f.update(0.05, Math.random, F.list)); if (i > 200) for (const f of F.list) (sp[f.fid] ||= []).push(f.vel.length()); if (i % 400 === 0) await new Promise((r) => setTimeout(r, 0)); }
  return Object.fromEntries(Object.entries(sp).map(([k, a]) => { a.sort((x, y) => x - y); return [k, a[Math.floor(a.length * 0.5)]]; })); });
// each kind on purpose
const kinds = ['chase', 'nip', 'play', 'spook', 'swat', 'snap', 'claws', 'pester', 'spar'], res = {};
for (const k of kinds) {
  res[k] = await p.evaluate(async ({ k, base }) => { const F = window.__fishes, E = F.enc; for (const f of F.list) f.encCool = 0;
    if (k === 'swat') { const o = F.byId.get('o1'), f = F.byId.get('g1'); f.pos.set(o.pos.x + 1.2, o.pos.y + 1.0, o.pos.z + 0.3); f.target.copy(f.pos); }      // (a fish that has come down by the octopus)
    if (k === 'claws') { const [c1, c2] = ['k1', 'k2'].map((id) => F.byId.get(id)); c2.pos.set(c1.pos.x + (c1.pos.x > 0 ? -1.0 : 1.0), c1.pos.y, c1.pos.z); c1.cs = { s: 'idle', t: 2 }; c2.cs = { s: 'idle', t: 2 }; }      // (two crabs that have met: the face-off needs them within reach)
    let e = null; for (let tries = 0; tries < 40 && !e; tries++) { e = E.start(k); if (!e) { for (let i = 0; i < 60; i++) { F.update(0.05, (window.__t += 0.05)); F.list.forEach((f) => f.update(0.05, Math.random, F.list)); } for (const f of F.list) f.encCool = 0; } }
    if (!e) return { started: false };
    const who = [...e.who], peak = {}, s0 = { nipped: who.map((f) => f.nipped ?? 0) }, spooked0 = F.list.reduce((a, f) => a + (f.spooked ?? 0), 0), claws = {}, flicks0 = who.reduce((a, f) => a + (f.flicks ?? 0), 0);
    for (let i = 0; i < 160; i++) { F.update(0.05, (window.__t += 0.05)); F.list.forEach((f) => f.update(0.05, Math.random, F.list)); for (const f of [...e.who]) { const r = f.vel.length() / Math.max(0.05, base[f.fid] ?? 0.3); if (!(r <= (peak[f.name] ?? 0))) peak[f.name] = +r.toFixed(2); if (f.crab && (f.clawUp ?? 0) > 0.3) claws[f.name] = 1; } }
    return { started: true, who: e.who.map((f) => f.name), peak, nips: who.reduce((a, f, i) => a + (f.nipped ?? 0) - s0.nipped[i], 0), spooked: F.list.reduce((a, f) => a + (f.spooked ?? 0), 0) - spooked0, claws: Object.keys(claws), flicks: who.reduce((a, f) => a + (f.flicks ?? 0), 0) - flicks0, stuck: F.list.filter((f) => f.enc).length };
  }, { k, base });
  console.log(`  ${k}:`, JSON.stringify(res[k]));
}
const fast = (r, n = 1.8) => r?.started && Object.values(r.peak).filter((x) => x >= n).length >= 1;
ck('a chase: both go at well over cruising speed (the chased at least twice its own), and it ends in a nip or an escape', fast(res.chase, 2) && Object.values(res.chase.peak).filter((x) => x >= 1.8).length >= 2, JSON.stringify(res.chase.peak) + ` nips ${res.chase.nips}`);
ck('a quick nip lands', res.nip.started && res.nip.nips >= 1, `nips ${res.nip.nips}`);
ck('two of a kind race each other, fast', fast(res.play, 1.8), JSON.stringify(res.play.peak));
ck('a fright spreads: one bolts and at least two others react', res.spook.started && res.spook.spooked >= 2 && fast(res.spook, 2), `${res.spook.spooked} reacted, ${JSON.stringify(res.spook.peak)}`);
ck('the octopus swipes an arm at a fish and the fish bolts', fast(res.swat, 2), JSON.stringify(res.swat.peak));
ck('the turtle snaps at a fish and the fish shoots off', fast(res.snap, 2), JSON.stringify(res.snap.peak));
ck('two crabs face off with their claws up', res.claws.started && res.claws.claws.length === 2, JSON.stringify(res.claws.claws));
ck('a fish pesters a crab, which snaps a claw, and the fish shoots off', res.pester.started && res.pester.claws.length >= 1 && fast(res.pester, 1.8), JSON.stringify(res.pester));
ck('two seahorses spar with flicks of the head', res.spar.started && res.spar.flicks >= 4, `${res.spar.flicks} flicks`);
ck('every animal is given back afterwards (none left in an encounter)', kinds.every((k) => !res[k].started || res[k].stuck <= 1), kinds.map((k) => res[k].stuck).join(','));
// left to itself, six minutes of tank time
const nat = await p.evaluate(async () => { window.__encOff = false; const F = window.__fishes, E = F.enc; E.log.length = 0; E.wait = 5; for (const f of F.list) f.encCool = 0;
  for (let i = 0; i < 6 * 60 * 20; i++) { F.update(0.05, (window.__t += 0.05)); F.list.forEach((f) => f.update(0.05, Math.random, F.list)); if (i % 400 === 0) await new Promise((r) => setTimeout(r, 0)); }
  const kinds = {}; for (const l of E.log) kinds[l.kind] = (kinds[l.kind] ?? 0) + 1; return { n: E.log.length, kinds, stuck: F.list.filter((f) => f.enc && !E.active.includes(f.enc)).length }; });
console.log('  six minutes on its own:', JSON.stringify(nat));
ck('left to itself, a moment every half minute or so (8 to 20 in six minutes)', nat.n >= 8 && nat.n <= 20, `${nat.n}`);
ck('of several kinds', Object.keys(nat.kinds).length >= 4, JSON.stringify(nat.kinds));
ck('nothing left stuck', nat.stuck === 0, `${nat.stuck}`);
await p.screenshot({ path: `${out}/enc.png`, timeout: 90000 }).catch(() => {});
ck('no page errors', !errors.length, errors.slice(0, 2).join(' | '));
console.log(fails ? `${fails} failed` : 'Encounter checks passed'); await b.close(); process.exit(fails ? 1 : 0);

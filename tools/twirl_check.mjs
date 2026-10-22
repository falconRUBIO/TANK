// Level 3's first trick, on screen, from a save made by ordinary play: tools/sim/milestones.mjs plays a new tank (seed 1037) until the first
// trick is offered (level 3, day 2.4) and writes it. The game opens it normally (no dev mode); the octopus's card offers "Teach a trick
// (twirl at the glass)"; tapping it, the octopus goes to the front glass and loops. Positions are the rendered octopus's.
//   node tools/twirl_check.mjs [OUTDIR]    (needs the solo game on 8123)
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const base = process.env.BASE || 'http://localhost:8123', out = process.argv[2] || '/tmp/twirl'; fs.mkdirSync(out, { recursive: true });
const savePath = `${out}/level3-save.json`;
console.log(execFileSync(process.execPath, ['tools/sim/milestones.mjs', '1037'], { env: { ...process.env, ORIGIN: String(Date.now() - 3.2 * 864e5), SAVE: savePath } }).toString().trim().split('\n').at(-1));
const save = fs.readFileSync(savePath, 'utf8');
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 760 } }); await ctx.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('ourtank.world2', s); sessionStorage.setItem('seeded', '1'); } }, save);
const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=1&tod=afternoon'); await p.waitForFunction(() => window.__game?.state && window.__fishes?.list?.length, null, { timeout: 180000 }); await p.waitForTimeout(4000);
const s0 = await p.evaluate(() => { const s = window.__game.state; return { level: s.level, fish: s.fish.map((f) => f.species), dev: new URLSearchParams(location.search).has('dev') }; });
ck('a normal level 3 save, opened without dev mode', s0.level === 3 && !s0.dev, s0);
// close whatever greets a returning player, then open the octopus's card the way a tap does
for (let i = 0; i < 6; i++) { await p.evaluate(() => { document.querySelectorAll('#modal.on #mok, #modal.on [data-i="0"]').forEach((b) => b.click()); document.querySelectorAll('#coach,#toast,#reunion').forEach((e) => e.classList.remove('on')); }); await p.waitForTimeout(500); }
const fed = await p.evaluate(async () => { const f = window.__fishes.list.find((x) => x.species.id === 'octopus'); return window.__game.dispatch({ t: 'crab', id: f.fid }); });      // (it was hungry after the time away, and pale with it: fed first, as a player would)
console.log('  · fed a crab first:', fed.ok ? 'ok' : fed.reason);
await p.evaluate(() => { window.__simClock(true); const F = window.__fishes; for (let i = 0; i < 2400; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); } const f = F.list.find((x) => x.species.id === 'octopus'); window.__oc = f; window.__showCard(f); }); await p.waitForTimeout(1500);
const btn = await p.evaluate(() => [...document.querySelectorAll('#card [data-train]')].map((b) => ({ k: b.dataset.train, t: b.textContent })));
ck('its card offers the twirl, with no decoration needed', btn.some((x) => x.k === 'twirl'), btn);
await p.evaluate(() => document.querySelector('#card [data-train="twirl"]')?.click()); await p.waitForTimeout(800);
const r = await p.evaluate(() => { const f = window.__oc, F = window.__fishes, tr = [], left = () => (f.script?.length ?? 0) + (f.trickPts?.length ?? 0) + (f.glassAt?.trick ? 1 : 0), scr0 = left(); let gone = null;
  for (let i = 0; i < 1600; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); if (i % 4 === 0) { const q = f.group.position; tr.push([+q.x.toFixed(2), +q.y.toFixed(2), +q.z.toFixed(2)]); } if (gone == null && scr0 && !left()) gone = i; }
  return { tr, scr0, gone, skill: window.__game.state.fish.find((x) => x.id === f.fid)?.skill }; });
const front = r.tr.filter((a) => a[2] > 1.3), xs = front.map((a) => a[0]), ys = front.map((a) => a[1]);
ck('tapping it starts the twirl: a six-step route is set and the lesson counts', r.scr0 === 6 && (r.skill?.twirl ?? 0) >= 1, { route: r.scr0, skill: r.skill });
ck('rendered: it comes to the front glass', front.length > 10, `${front.length} of ${r.tr.length} samples in front (z > 1.3), max z ${Math.max(...r.tr.map((a) => a[2]))}`);
ck('rendered: there it loops, up and round (height and side to side both change by over a unit)', front.length > 10 && Math.max(...ys) - Math.min(...ys) > 1 && Math.max(...xs) - Math.min(...xs) > 1, `height ${Math.min(...ys).toFixed(1)}–${Math.max(...ys).toFixed(1)}, side ${Math.min(...xs).toFixed(1)}–${Math.max(...xs).toFixed(1)}`);
ck('the route finishes, and it goes back to its own business', r.gone != null, `route done after ${r.gone == null ? '—' : (r.gone * 0.05).toFixed(1) + ' s'} of tank time`);
// screenshots along the route: replay it in steps and draw
await p.evaluate(() => { const f = window.__oc; window.__fishes.perform(f, 'twirl', 'glass'); });
for (const [k, n] of [[1, 60], [2, 60], [3, 60], [4, 60]]) { await p.evaluate((n) => { const F = window.__fishes; for (let i = 0; i < n; i++) { F.update(0.05, (window.__t += 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); } }, n); await p.screenshot({ path: `${out}/twirl-${k}.png`, timeout: 180000 }).catch(() => {}); }
console.log('  · look at screenshot time:', JSON.stringify(await p.evaluate(() => { const f = window.__oc, r = window.__game.state.fish.find((x) => x.id === f.fid); return { camoK: +(f.camoK ?? 0).toFixed(2), pale: f.pale ?? null, starve: f.starve ?? null, weak: f.weak ?? null, sick: f.sick ?? null, mul: f.mul, glassNear: +(f.glassNear ?? 0).toFixed(2), pos: [f.pos.x, f.pos.y, f.pos.z].map((v) => +v.toFixed(1)), hunger: r?.hunger, happy: r?.happy, opacity: f.mesh?.material?.opacity }; })));
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Twirl checks passed'); process.exit(fails ? 1 : 0);

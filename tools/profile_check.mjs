// The animal profile: a seahorse, an octopus and a clownfish in a planted tank. Watching them for a few minutes of tank time should
// fill in what they were seen doing (quietly, in each one's own journal), the tally of where they spent their time, and every tab of the card.
// Needs the solo static server: python3 -m http.server 8123 --directory web
// node tools/profile_check.mjs OUTDIR
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = process.argv[2] || '/tmp/profile'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); const errors = []; let fails = 0;
p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && /error/.test(m.text())) errors.push(m.text()); });
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2000);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 8; s.fish.length = 0; const born = Date.now() - 6 * 864e5;
  s.fish.push({ id: 'h1', name: 'Pip', species: 'seahorse', seed: 4, born, stage: 'adult', traits: ['Shy', 'Calm', 'Curious'], happy: 0.8, health: 1 }, { id: 'o1', name: 'Inky', species: 'octopus', seed: 5, born, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, owner: 'me', ownerName: 'You', solved: 2, bestSecs: 41 }, { id: 'g1', name: 'Nori', species: 'goldfish', seed: 3, born, stage: 'adult', traits: ['Brave', 'Social'], happy: 0.8, health: 1 });
  s.decor.length = 0; s.decor.push({ id: 'p1', type: 'grass', x: -2.6, z: 2.3, ry: 0 }, { id: 'p2', type: 'fern', x: 1.2, z: 2.4, ry: 0 }, { id: 'p3', type: 'sword', x: -1.0, z: -0.3, ry: 0 }, { id: 'p4', type: 'brain', x: 2.6, z: 2.2, ry: 0 });
  g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(2500);
// five minutes of tank time, watched
await p.evaluate(async () => { const F = window.__fishes, was = F.onObserve; window.__said = []; F.onObserve = (o) => { window.__said.push(o); was(o); }; F.list.forEach((h) => { h.isNight = false; }); F.logAt = 0;
  for (let i = 0; i < 5 * 60 * 20; i++) { const t = (window.__t = (window.__t ?? 0) + 0.05); F.update(0.05, t); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); F.observe(0.05, t); if (i % 2000 === 0) await new Promise((q) => setTimeout(q, 0)); } });
await p.waitForTimeout(3000);
// in a few minutes of tank time far more is seen than a phone sends at once, so what was seen is sent here one by one, as the phone would over real time
await p.evaluate(async () => { const seen = new Set(); for (const o of window.__said) { const k = o.key + o.fish; if (seen.has(k)) continue; seen.add(k); await window.__game.observe(o); } });
const st = await p.evaluate(() => { const s = window.__game.state, f = (id) => s.fish.find((x) => x.id === id); return { h: { disc: Object.keys(f('h1').disc ?? {}), story: (f('h1').story ?? []).map((x) => x.text), log: f('h1').log }, o: { disc: Object.keys(f('o1').disc ?? {}), log: f('o1').log }, g: { log: f('g1').log }, journal: (window.__game.journal ?? []).map((e) => e.text) }; });
console.log(JSON.stringify(st, null, 1).slice(0, 2500));
const quiet = ['hitch', 'eyes', 'snick', 'blend'];
ck('the seahorse was seen doing seahorse things', quiet.filter((k) => st.h.disc.includes(k)).length >= 3, st.h.disc.join(','));
ck('they went in its own journal', st.h.story.some((x) => /tail|eye|plankton|colour/.test(x)), st.h.story.length + ' lines');
ck('and not in the tank journal', !st.journal.some((x) => /wrapped its tail|one eye each way|speck of plankton/.test(x)));
ck('the octopus was seen doing octopus things', st.o.disc.length >= 2, st.o.disc.join(','));
ck('the lead phone kept a tally of where each animal went', st.h.log?.dist > 1 && st.o.log?.lv && st.g.log?.lv, JSON.stringify(st.h.log?.lv));
ck('the seahorse tally counts its holdfasts', (st.h.log?.holds ?? 0) >= 1, String(st.h.log?.holds));
for (const [id, nm] of [['h1', 'seahorse'], ['o1', 'octopus'], ['g1', 'fish']]) {
  await p.evaluate((id) => { window.__game.profTab = 'over'; window.__focus(window.__fishes.list.indexOf(window.__fishes.byId.get(id))); }, id); await p.waitForTimeout(500);
  await p.evaluate(() => document.getElementById('fishpill')?.click()); await p.waitForTimeout(900);
  for (const tab of ['over', 'pers', 'stats', 'jour']) {
    await p.evaluate((tab) => document.querySelector(`#card .tb[data-tab="${tab}"]`)?.click(), tab); await p.waitForTimeout(600);
    const info = await p.evaluate(() => ({ on: document.querySelector('#card .tb.on')?.dataset.tab, bars: document.querySelectorAll('#card .tr').length, h: document.getElementById('card').scrollHeight, text: document.querySelector('#card .tpane')?.innerText.slice(0, 160) }));
    if (tab === 'pers') ck(`${nm}: five personality bars`, info.bars === 5);
    ck(`${nm}: the ${tab} tab opens`, info.on === tab, info.text?.replace(/\s+/g, ' ').slice(0, 90));
    await p.screenshot({ path: `${out}/${nm}_${tab}.png` });
  }
  await p.evaluate(() => window.__focus(-1)).catch(() => {}); await p.waitForTimeout(300);
}
ck('no page errors', !errors.length, errors.slice(0, 3).join(' | '));
console.log(fails ? `${fails} failed` : 'Profile checks passed'); await b.close(); process.exit(fails ? 1 : 0);

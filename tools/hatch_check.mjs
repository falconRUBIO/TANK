// A hatching you cannot miss, in the real game: the eggs count down on Care to the minute; when they are ready they wriggle and wait (Care says
// so, with a Watch button, and Coming up too); with the tank open the camera comes over and they hatch in front of you; a little cloud of larvae
// rises and drifts off, the baby is tiny and grows, you name it, and one more little one can be kept. Needs the solo game on 8123.
//   node tools/hatch_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/hatch'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
const clear = () => p.evaluate(() => { for (const b of document.querySelectorAll('#modal.on button')) if (/^(Claim|OK|Not now|Later)$/i.test(b.textContent.trim())) b.click(); document.querySelectorAll('#goal,#coach,#toast').forEach((e) => (e.style.display = 'none')); });
// a settled tank with a pair of goldfish and their eggs, nine hours from hatching
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; s.level = 6; s.createdAt = now - 30 * D; s.fish.length = 0; s.hunger = 0.1; s.water = 1; s.glass = 0; s.visitAt = s.eggAt = now + 9e9; s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] };
  s.fish.push({ id: 'g1', name: 'Goldie', species: 'goldfish', seed: 3, sex: 'f', born: now - 20 * D, stage: 'adult', traits: ['Calm'], happy: 0.9, health: 1 }, { id: 'g2', name: 'Rex', species: 'goldfish', seed: 8, sex: 'm', born: now - 20 * D, stage: 'adult', traits: ['Brave'], happy: 0.9, health: 1 });
  s.decor.length = 0; s.decor.push({ id: 'p1', type: 'grass', x: -1.5, z: 0.4, ry: 0 }, { id: 'r1', type: 'rock', x: 2, z: -0.4, ry: 0 });
  s.eggs = [{ id: 'e1', species: 'goldfish', a: 'g1', b: 'g2', seed: 3, pa: { id: 'g1', name: 'Goldie', seed: 3 }, pb: { id: 'g2', name: 'Rex', seed: 8 }, laid: now - 2.6 * D, hatchAt: now + 9 * 3600e3 + 125e3, cared: [], guard: 'g2' }]; g.emit('state'); });
await p.waitForTimeout(2500); await clear();
// 1. Care counts down, live
await p.evaluate(() => { window.__ui.open('tank'); window.__ui.open('care'); }); await p.waitForTimeout(800);
const cd1 = await p.evaluate(() => document.querySelector('#sheet .cd')?.textContent ?? ''); await p.waitForTimeout(2200); const cd2 = await p.evaluate(() => document.querySelector('#sheet .cd')?.textContent ?? '');
ck('Care counts down to the hatching, live (hours, minutes)', /^in 9 h \d+ m$/.test(cd1) && cd1 === cd2 || /^in 9 h \d+ m$/.test(cd2), [cd1, cd2]);
await p.evaluate(() => { const s = window.__game.state; s.eggs[0].hatchAt = Date.now() + 95e3; window.__game.emit('state'); window.__ui.open('tank'); window.__ui.open('care'); }); await p.waitForTimeout(900);
const s1 = await p.evaluate(() => document.querySelector('#sheet .cd')?.textContent); await p.waitForTimeout(2100); const s2 = await p.evaluate(() => document.querySelector('#sheet .cd')?.textContent);
ck('in the last hour it counts the seconds', /^in 1 m \d+ s$/.test(s1 ?? '') && s1 !== s2, [s1, s2]);
await p.screenshot({ path: `${out}/1-countdown.png` });
// 2. ready: they wriggle and wait; Care has it under Needs you with Watch; Coming up says so
await p.evaluate(() => { const s = window.__game.state; s.eggs[0].hatchAt = Date.now() - 1000; window.__game.emit('state'); }); await p.evaluate(() => window.__ui.open('care')); await p.waitForTimeout(400);      // (the sheet open: nobody is looking at the tank yet)
await p.evaluate(() => window.__game.dispatch({ t: 'devSea', what: 'noop' }).catch(() => {})); await p.waitForTimeout(2500);
const ready = await p.evaluate(() => ({ egg: window.__game.state.eggs[0] ?? null, rows: [...document.querySelectorAll('#sheet .crow')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()), soon: [...document.querySelectorAll('#sheet .soon div')].map((d) => d.textContent.trim()) }));
ck('ready: still an egg, waiting to be watched', !!ready.egg?.ready && !ready.egg.watch, ready.egg);
ck('Care has it under Needs you, with a Watch button', ready.rows.some((r) => /eggs.*ready to hatch.*Watch/i.test(r)), ready.rows);
ck('Coming up says they are ready, with no clock', ready.soon.some((x) => /ready to hatch: stay and watch/.test(x)), ready.soon);
await p.screenshot({ path: `${out}/2-ready-care.png` });
// 3. Watch: the camera comes over, they hatch in front of you, a cloud of larvae rises, the baby is tiny
await p.evaluate(() => document.querySelector('#sheet .crow[data-act="egg"]')?.click()); 
const shots = (async () => { await p.waitForFunction(() => window.__crackAt, null, { timeout: 30000, polling: 100 }).catch(() => {}); for (const [ms, n] of [[900, 'a'], [2600, 'b'], [5200, 'c']]) { await p.waitForTimeout(ms - (n === 'a' ? 0 : n === 'b' ? 900 : 2600)); await p.screenshot({ path: `${out}/4-fry-${n}.png` }); } })();

let hatched = null; for (let i = 0; i < 40 && !hatched; i++) { await p.waitForTimeout(500); hatched = await p.evaluate(() => { const s = window.__game.state; const kid = s.fish.find((f) => f.parents?.length); return kid && !s.eggs.length ? { kid: kid.id, name: kid.name, hatched: kid.hatched } : null; }); if (i === 6) await p.screenshot({ path: `${out}/3-watching.png` }); }
if (!hatched && process.env.DBG) console.log('DBG', await p.evaluate(async () => JSON.stringify({ tab: window.__ui.tab, sheet: document.getElementById('sheet').classList.contains('on'), modal: document.querySelector('#modal')?.className, reunion: document.getElementById('reunion').className, egg: window.__game.state.eggs[0], hidden: document.hidden })));
await shots; ck('watched: they hatch, in front of you', !!hatched, hatched);

const look = await p.evaluate((id) => { const f = window.__fishes.byId.get(id), par = window.__fishes.byId.get('g1'); return { kid: +(f?.growth ?? 0).toFixed(2), parent: +(par?.growth ?? 0).toFixed(2), focusEgg: false }; }, hatched?.kid);
ck('fresh from the egg it is tiny (a fifth of a grown fish)', look.kid > 0 && look.kid <= 0.25, look);
// 4. you name it, then one more little one may stay
const other = () => p.evaluate(() => { const m = document.querySelector('#modal.on'); if (m && !/NAME YOUR BABY|ONE MORE LITTLE ONE/i.test(m.innerText)) m.querySelector('#mok')?.click(); });      // (a chapter or a gift may come first)
let named = false; for (let i = 0; i < 40 && !named; i++) { await p.waitForTimeout(500); await other(); named = await p.evaluate(() => /NAME YOUR BABY/i.test(document.querySelector('#modal.on')?.innerText ?? '')); }
ck('you are asked to name it, once the little one has swum out (not straight away)', named && (await p.evaluate(() => window.__nameAt - window.__crackAt)) > 7000, await p.evaluate(() => window.__nameAt - window.__crackAt));
if (named) { await p.fill('#modal.on #mi', 'Pebble'); await p.evaluate(() => document.querySelector('#modal.on #mok').click()); }
let offer = false; for (let i = 0; i < 30 && !offer; i++) { await p.waitForTimeout(500); await other(); offer = await p.evaluate(() => /ONE MORE LITTLE ONE/i.test(document.querySelector('#modal.on')?.innerText ?? '')); }
await p.screenshot({ path: `${out}/5-one-more.png` }); ck('then: one more little one is still by the eggs, keep it too?', offer);
if (offer) await p.click('#modal.on [data-i="0"]');
let twin = null; for (let i = 0; i < 20 && !twin; i++) { await p.waitForTimeout(500); twin = await p.evaluate(() => { const k = window.__game.state.fish.filter((f) => f.parents?.length); return k.length === 2 ? k.map((f) => f.name) : null; }); }
ck('kept: two little ones now, named and close together', twin && twin.includes('Pebble'), twin);
for (let i = 0; i < 12; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => /NAME YOUR BABY/i.test(document.querySelector('#modal.on')?.innerText ?? ''))) { await p.click('#modal.on #mno'); break; } }
const j = await p.evaluate(() => window.__game.journal.slice(-12).map((e) => e.text));
ck('the journal tells it: wriggling, the larvae drifting off, the one that stayed, and the twin', j.some((x) => /drifted off on the current/.test(x)) && j.some((x) => /kept one more/.test(x)), j);
await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/6-twins.png` });
const ph = await p.evaluate(() => { const list = JSON.parse(localStorage.getItem('ourtank.moments') || '[]'); return list.find((m) => /hatched/.test(m.text))?.img ?? null; }); if (ph) fs.writeFileSync(`${out}/7-journal-photo.jpg`, Buffer.from(ph.split(',')[1], 'base64'));
ck('the hatching is in the journal with its photo (the baby and its parent)', ph?.startsWith('data:image/jpeg;base64,'), ph?.slice(0, 23));
await p.evaluate(() => { window.__ui.open('friends'); }); await p.waitForTimeout(400); await p.evaluate(() => document.querySelector('#sheet [data-sub="journal"]')?.click()); await p.waitForTimeout(400); await p.evaluate(() => document.querySelector('#sheet [data-sub="history"]')?.click()); await p.waitForTimeout(700);
const hist = await p.evaluate(() => [...document.querySelectorAll('#sheet .hrow')].filter((r) => /hatched/.test(r.textContent)).map((r) => !!r.querySelector('img.hpic')));
await p.evaluate(() => { const r = [...document.querySelectorAll('#sheet .hrow')].find((x) => x.querySelector('img.hpic')); r?.scrollIntoView(); }); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/8-history.png` });
ck('Tank History shows the hatching with its photo', hist.length >= 1 && hist[0], hist);
const top = await p.evaluate(() => { const m = document.querySelector('#modal.on'); return m ? m.innerText.slice(0, 40) : null; });
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Hatch checks passed'); process.exit(fails ? 1 : 0);

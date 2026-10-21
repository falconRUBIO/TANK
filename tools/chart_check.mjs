// The Tank chart (the health ring at top right), the level-up moment, an animal asking to leave, and the new toys (twist cube, hitching hoop).
// Needs the solo game on 8123.   node tools/chart_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/chart'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 800 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; s.level = 5; s.xp = 140; s.thriveSec = 3 * 86400; s.visitAt = s.eggAt = s.dilemmaAt = now + 9e9;
  s.fish.push({ id: 'h1', name: 'Coral', species: 'seahorse', sex: 'f', seed: 5, born: now - 20 * D, stage: 'adult', traits: ['Calm'], happy: 0.9, health: 1 }, { id: 'g1', name: 'Amy', species: 'goldfish', sex: 'f', seed: 3, born: now - 20 * D, stage: 'adult', traits: ['Calm'], happy: 0.3, health: 1, leaveAsk: { at: now, by: now + 2 * D, why: 'an anemone to host' } });
  s.postcards = [{ id: 'pc1', name: 'Shelly', species: 'turtle', kind: 'turtle', at: now - D, got: now - 3600e3, text: 'Shelly here! The ocean is SO big. Thank you for raising me.' }];
  g.emit('state'); document.querySelectorAll('#coach,#toast').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(1500);
const bell = await p.evaluate(() => document.querySelector('#bell')?.innerHTML ?? ''); ck('the top-right button is a health ring with the score', /hring|svg/.test(bell), bell.slice(0, 80));
await p.click('#bell'); await p.waitForSelector('#sheet .tchart', { timeout: 30000 });
const c = await p.evaluate(() => { const q = (x) => document.querySelector('#sheet ' + x); return { hero: q('.tc-hero')?.textContent.trim().slice(0, 80), road: document.querySelectorAll('#sheet .tc-road li').length, now: q('.tc-road li.now b')?.textContent, next: q('.tc-next')?.textContent, ask: q('.tc-step')?.textContent, card: q('.tc-card')?.textContent, heroAlign: getComputedStyle(q('.tc-hero')).textAlign, rowBorder: getComputedStyle(q('.tc-row')).borderTopWidth, w: document.querySelector('#sheet').scrollWidth <= document.querySelector('#sheet').clientWidth + 1 }; });
ck('the chart shows health, the 8-level road at level 5, the next prize, the leave request and the postcard', /TANK HEALTH/.test(c.hero) && c.road === 8 && c.now === '5' && /Bettas/.test(c.next) && /Help Amy/.test(c.ask) && /wants to leave/.test(c.ask) && /Shelly/.test(c.card), c);
ck('no horizontal overflow', c.w, c);
await p.screenshot({ path: `${out}/chart1.png` }); await p.evaluate(() => { document.querySelector('#sheet .tchart').scrollIntoView({ block: 'end' }); }); await p.waitForTimeout(200); await p.screenshot({ path: `${out}/chart2.png` });
await p.evaluate(() => window.__ui.open('tank')); await p.waitForTimeout(400);
const sell = await p.evaluate(() => window.__game.dispatch({ t: 'sellFish', id: 'g1' })); ck('an animal asking to leave cannot be sold', sell.reason === 'UNHAPPY', sell);
await p.evaluate(() => window.__game.emit('levelup', 6)); await p.waitForTimeout(900); const ban = await p.evaluate(() => document.querySelector('.lvban')?.textContent); ck('level-up: a banner names what opened', /Level 6/.test(ban ?? '') && /Bettas/.test(ban ?? ''), ban); await p.screenshot({ path: `${out}/levelup.png` });
await p.waitForTimeout(5200);
await p.evaluate(() => { window.__toys?.dropCube?.(0); window.__toys?.hangHoop?.(1.5); }); const hasToys = await p.evaluate(() => !!window.__toys);
if (hasToys) { await p.waitForTimeout(9000); await p.screenshot({ path: `${out}/toys.png` }); const st = await p.evaluate(() => ({ cube: !!window.__toys.cube, held: !!window.__toys.cube?.held, hoop: !!window.__toys.hoop, who: [...(window.__toys.hoop?.who ?? [])] })); ck('the twist cube and the hoop are in the tank', st.cube && st.hoop, st); }
else console.log('  (no __toys handle: toys not driven)');
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Chart checks passed'); process.exit(fails ? 1 : 0);

// The sanctuary adoption in the real interface: a level 8 tank that finished the sanctuary goal sees the green turtle at 120 beside its regular 180 in the Shop and on
// the Tank chart, with the room a turtle would have spelled out; after the first turtle the price is the regular one again. Needs the solo game on 8123.   node tools/adopt_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state && window.__ui, null, { timeout: 120000 }); await p.waitForTimeout(1500);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 8; s.shells = 150; s.goalsDone = [{ id: 'sanctuary', at: Date.now() - 864e5, title: 'A turtle sanctuary' }]; s.decor.push({ id: 'L1', type: 'ledge', x: 2, z: 1, ry: 0 }, { id: 'S1', type: 'seagrass', x: -2, z: 1, ry: 0 }); g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion').forEach((e) => e.classList.remove('on')); });
await p.waitForTimeout(1200);
await p.evaluate(() => window.__ui.open('decorate')); await p.waitForTimeout(600); await p.evaluate(() => [...document.querySelectorAll('#sheet [data-cat]')].find((x) => x.dataset.cat === 'FISH')?.click()); await p.waitForTimeout(800);
const card = await p.evaluate(() => document.querySelector('#sheet .card[data-k="fish:turtle"] .pr')?.innerText ?? null);
ck('the Shop shows the green turtle at the adoption price beside its regular one', !!card && /120/.test(card) && /180/.test(card) && /sanctuary adoption/i.test(card), card);
const logger = await p.evaluate(() => document.querySelector('#sheet .card[data-k="fish:loggerhead"] .pr')?.innerText ?? null); ck('the loggerhead keeps its regular price', !!logger && /260/.test(logger) && !/120/.test(logger), logger);
const hawk = await p.evaluate(() => document.querySelector('#sheet .card[data-k="fish:hawksbill"] .pr')?.innerText ?? null); ck('the hawksbill is shown locked until a release', !!hawk && /release/i.test(hawk), hawk);
await p.evaluate(() => document.querySelector('#sheet .card[data-k="fish:turtle"]')?.click()); await p.waitForTimeout(700);
const detail = await p.evaluate(() => document.querySelector('.notesheet.deco .nsw')?.innerText ?? ''); await p.evaluate(() => { document.querySelector('.notesheet.deco .close')?.click(); document.querySelectorAll('.notesheet.deco').forEach((n) => n.remove()); });
ck('the preview explains the one-time adoption and the room a turtle would have', /first sea turtle for 120/i.test(detail) && /counts as 4 small fish/i.test(detail), detail.replace(/\n/g, ' ').slice(0, 260));
await p.evaluate(() => window.__ui.open('decorate')); await p.waitForTimeout(800);
const fund = await p.evaluate(() => document.querySelector('#sheet .tc-fund')?.innerText ?? null);
ck('the Tank chart says the adoption price, the shared shells, the habitat and the room', !!fund && /120/.test(fund) && /first turtle/i.test(fund) && /ledge to sleep under ✓/.test(fund) && /Room:/.test(fund), (fund ?? '').replace(/\n/g, ' '));
// buy it (the client's own rules, the same code the server runs), then look again
const bought = await p.evaluate(async () => { const g = window.__game, s0 = g.state.shells; const r = await g.dispatch({ t: 'buyFish', species: 'turtle', name: 'Shelly' }); return { ok: r?.ok, paid: s0 - g.state.shells, flag: !!g.state.flags.turtleAdopted }; });
ck('buying it costs 120 and uses the adoption', bought.ok && bought.paid === 120 && bought.flag, bought);
await p.evaluate(() => { window.__game.state.shells = 500; window.__game.emit('state'); window.__ui.open('decorate'); }); await p.waitForTimeout(600); await p.evaluate(() => [...document.querySelectorAll('#sheet [data-cat]')].find((x) => x.dataset.cat === 'FISH')?.click()); await p.waitForTimeout(800);
const card2 = await p.evaluate(() => document.querySelector('#sheet .card[data-k="fish:turtle"] .pr')?.innerText ?? null); ck('after the first turtle the green turtle is back at 180', !!card2 && /180/.test(card2) && !/120/.test(card2), card2);
// a busy tank: the room line says how many fewer
await p.evaluate(() => { const g = window.__game, s = g.state, born = Date.now() - 20 * 864e5; for (let i = 0; i < 16; i++) s.fish.push({ id: 'gf' + i, name: 'G' + i, species: 'goldfish', seed: i + 2, born, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1 }); g.emit('state'); window.__ui.open('notices'); }); await p.waitForTimeout(900);
const fund2 = await p.evaluate(() => document.querySelector('#sheet .tc-fund')?.innerText ?? null);
ck('once a turtle is ordered the savings line is gone', fund2 == null, (fund2 ?? 'no fund line: a turtle is on its way').replace(/\n/g, ' ').slice(0, 120));
await p.evaluate(() => { window.__game.state.flags.turtleAdopted = 0; window.__game.state.orders = []; window.__game.emit('state'); window.__ui.open('decorate'); }); await p.waitForTimeout(900);
const fund3 = await p.evaluate(() => document.querySelector('#sheet .tc-fund')?.innerText ?? null);
ck('a busy tank is told how many fewer small fish a turtle would want (nothing is moved out)', !!fund3 && /fewer small fish/i.test(fund3), (fund3 ?? '').replace(/\n/g, ' ').slice(-160));
ck('no page errors', !errors.length, errors.slice(0, 2));
console.log(fails ? `${fails} failed` : 'Adoption checks passed'); await b.close(); process.exit(fails ? 1 : 0);

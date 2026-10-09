// A second walk through screens the first one skips. OUT=dir node tools/audit_screens2.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const W = +(process.env.W || 390), H = +(process.env.H || 760), out = process.env.OUT || '/tmp/audit2'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage(); const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
const shot = async (n, ms = 1200) => { await p.waitForTimeout(ms); await p.screenshot({ path: `${out}/${n}.png` }); };
const step = async (name, fn) => { try { await fn(); } catch (e) { errors.push(name + ': ' + String(e.message).slice(0, 120)); } };
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
// tutorial steps
for (const n of [2, 3, 4]) await step('tut' + n, async () => { await p.evaluate((n) => { const g = window.__game; g.state.flags.tut = n; g.emit('state'); }, n); await shot('01_tut' + n, 1800); });
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.shells = 400; s.level = 8; s.fish.forEach((f) => (f.stage = 'adult')); g.emit('state'); });
await step('octopus', async () => { await p.evaluate(async () => { const g = window.__game; const mk = (id, name, species, traits) => ({ id, name, species, seed: 3, born: Date.now() - 9e8, stage: 'adult', traits, happy: 0.8, health: 1, appetite: 0.05, owner: 'me', ownerName: 'You' }); g.state.fish.push(mk('fo', 'Mimi', 'octopus', ['Curious', 'Clever']), mk('fs', 'Sunny', 'seahorse', ['Shy', 'Calm'])); g.emit('state'); }); await p.waitForTimeout(3500); await p.evaluate(() => window.__focus(window.__fishes.list.findIndex((f) => f.species.id === 'octopus'))); await shot('02_octopus_card', 6000); });
await step('more', async () => { await p.evaluate(() => { const b = [...document.querySelectorAll('#card button, #card .fold')].find((x) => /More about/.test(x.textContent)); b?.click(); }); await shot('03_card_more', 1500); });
await p.evaluate(() => window.__focus(null));
for (const cat of ['PLANTS', 'ROCKS', 'WOOD', 'STRUCTURES', 'SPECIAL', 'FLOOR', 'BACKDROP']) await step('cat' + cat, async () => { await p.click('nav [data-tab=decorate]', { force: true }); await p.waitForTimeout(500); await p.click(`[data-cat=${cat}]`); await p.waitForTimeout(1800); await p.click('.card'); await shot('04_shop_' + cat, 1500); });
await step('place', async () => { await p.click('[data-cat=PLANTS]'); await p.waitForTimeout(1200); await p.click('.card'); await p.click('#buy'); await shot('05_place', 3000); await p.click('#pok'); await p.waitForTimeout(1500); });
await step('rearrange', async () => { await p.click('nav [data-tab=decorate]', { force: true }); await p.waitForTimeout(600); await p.click('#rearr'); await shot('06_rearrange', 2000); await p.evaluate(() => window.__ui.open('tank')); await p.waitForTimeout(500); });
await step('journal', async () => { await p.click('nav [data-tab=friends]', { force: true }); await p.waitForTimeout(600); await p.evaluate(() => window.__ui.open('journal')); await shot('07_journal', 1200); await p.evaluate(() => window.__ui.open('book')); await shot('08_collection', 1200); });
await p.evaluate(() => window.__ui.open('tank'));
await step('reunion', async () => { await p.evaluate(() => window.__ui.reunion(['Pip grew up.', 'Mimi dragged it out of its den. Tap it in the tank.', "Today's request: a plant for Pip"], () => {})); await shot('09_reunion', 1500); });
await step('settle', async () => { await p.evaluate(() => window.__ui.settle(['Everyone is fed, the water is clean and today\'s request is done.', 'Tomorrow the tank has a new request for you.'])); await shot('10_settle', 1500); });
await step('levelup', async () => { await p.evaluate(() => window.__game.emit('levelup', 5)); await shot('11_levelup', 1500); });
await step('dead', async () => { await p.evaluate(() => { const g = window.__game; g.state.floaters = [{ id: 'z1', name: 'Dot', species: 'goldfish', seed: 1, stage: 'adult', born: Date.now() - 5 * 864e5, died: Date.now(), traits: [] }]; g.emit('state'); }); await p.waitForTimeout(3000); await shot('12_floater', 500); });
await step('postcard', async () => { await p.evaluate(() => window.__ui.open('care')); await p.waitForTimeout(500); await p.click('[data-act=photo]'); await shot('13_postcard', 3500); });
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

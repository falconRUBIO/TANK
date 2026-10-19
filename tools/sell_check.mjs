// The Collection tab's fish list and selling a fish, plus what the Care meters say about when things are due. Needs the solo game on 8123.
// node tools/sell_check.mjs OUTDIR
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');      // (CI points PW_MODULE at its own playwright)
import fs from 'node:fs';
const out = process.argv[2] || '/tmp/sell'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0;
p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && /^(fish|tank|frame|sync|water change) error/.test(m.text())) errors.push(m.text()); });
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto('http://localhost:8123/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 4; s.fish.length = 0; s.hunger = 0; s.water = 1; s.glass = 0; s.shells = 20; const born = Date.now() - 12 * 864e5;
  s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: 5, born, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, owner: 'me', ownerName: 'You', hunger: 0, paid: 0 },
    { id: 'g1', name: 'Nori', species: 'goldfish', seed: 3, born, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, paid: 12 });
  g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); });
// 1. Care says when each thing is next due, in plain words
await p.evaluate(() => window.__ui.open('care')); await p.waitForTimeout(500);
const meters = await p.evaluate(() => [...document.querySelectorAll('#sheet .meter small')].map((x) => x.textContent));
console.log('  care says', JSON.stringify(meters)); await p.screenshot({ path: `${out}/care_meters.png` });
ck('the fish meter says when the next meal is', meters.some((t) => /^Next meal in about 1[12] hours$/.test(t)));
ck('the octopus meter says when its next crab is', meters.some((t) => /^Ready for a crab in about 1[12] hours/.test(t)));
ck('water and glass say they are days away', meters.some((t) => /^Due for a change in about 3 days$/.test(t)) && meters.some((t) => /^Due for a wipe in about 3 days$/.test(t)));
// 2. Collection lists the fish in the tank, the octopus first
await p.evaluate(() => window.__ui.open('book')); await p.waitForTimeout(300); await p.waitForTimeout(500);
const list = await p.evaluate(() => [...document.querySelectorAll('#sheet .itf')].map((x) => x.textContent)); console.log('  in the tank', JSON.stringify(list)); await p.screenshot({ path: `${out}/collection.png` });
ck('Collection lists every fish in the tank, the octopus first, each with Sell', list.length === 2 && /^Inky/.test(list[0]) && list.every((t) => /Sell$/.test(t)));
// 3. selling Nori: a clear question with the price, then gone, and the shells added
await p.click('#sheet [data-sellfish=g1]'); await p.waitForTimeout(400); const q = await p.evaluate(() => document.getElementById('modal')?.textContent ?? ''); await p.screenshot({ path: `${out}/sell_ask.png` });
ck('it asks first and says what it pays', /SELL NORI\?/.test(q) && /You get 6 shells/.test(q) && /Sell for 6/.test(q), q.slice(0, 160));
const s0 = await p.evaluate(() => window.__game.state.shells); await p.click('#mok'); await p.waitForTimeout(1200);
const after = await p.evaluate(() => ({ fish: window.__game.state.fish.map((f) => f.name), shells: window.__game.state.shells, meshes: window.__fishes.list.filter((f) => !f.dead).length, list: [...document.querySelectorAll('#sheet .itf')].map((x) => x.textContent), journal: window.__game.journal.slice(-2).map((e) => e.text) }));
await p.screenshot({ path: `${out}/sold.png` });
ck('Nori is gone from the tank, the list and the scene, and the wallet has 6 more shells', after.fish.join() === 'Inky' && after.shells === s0 + 6 && after.list.length === 1 && after.meshes === 1, JSON.stringify(after));
ck('the journal says Nori went to a new home', after.journal.some((t) => /found Nori a new home/.test(t)), JSON.stringify(after.journal));
// 4. the last fish cannot be sold
await p.click('#sheet [data-sellfish=x1]'); await p.waitForTimeout(400); const last = await p.evaluate(() => document.getElementById('modal')?.textContent ?? '');
ck('the last fish stays, and it says why', /only fish in the tank/.test(last), last.slice(0, 120)); await p.click('#mok').catch(() => {});
ck('no page errors', errors.length === 0, errors.join('; '));
console.log(fails ? `${fails} failed` : 'Sell checks passed'); await b.close(); process.exit(fails ? 1 : 0);

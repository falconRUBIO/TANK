// Plays the whole solo game through the real interface: tutorial, feeding, shopping, placing, adopting, levelling.
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');      // (CI points PW_MODULE at its own playwright)
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '.';
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage();
const errors = []; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load/.test(m.text())) errors.push(m.text().slice(0, 200)); });
let fails = 0; const ck = (name, ok, extra = '') => { console.log(ok ? '  ✓' : '  ✗', name, extra); if (!ok) fails++; };
const S = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__game.state)));
const coach = () => p.evaluate(() => document.getElementById('coach').classList.contains('on') ? document.querySelector('#coach b').textContent : '');
const waitCoach = async (t) => { for (let i = 0; i < 40; i++) { if ((await coach()).toLowerCase() === t.toLowerCase()) return true; await p.waitForTimeout(150); } return false; };
await p.addInitScript(() => setInterval(() => { const m = document.getElementById('modal'); if (m && m.classList.contains('on') && /^LEVEL \d|^A GIFT FOR YOU/i.test(m.querySelector('h2')?.textContent || '')) document.getElementById('mok').click(); }, 700));
await p.goto(base + '/?lite=1&dev=1'); await p.waitForSelector('#modal.on #mok', { timeout: 20000 });
console.log('Tutorial');
ck('first run offers an octopus in six colours and a name', /^welcome to your tank$/i.test(await p.textContent('#modal h2')) && (await p.$$('#modal .pk.pc')).length === 6);
await p.fill('#mi', 'Pip'); await p.click('#mok');
ck('then prompts to feed, once the octopus has dropped in quietly', await (async () => { for (let i = 0; i < 100; i++) { if (/^time for a snack$/i.test(await coach())) return true; await p.waitForTimeout(150); } return false; })());
await p.click('nav [data-tab=care]', { force: true }); await p.waitForTimeout(300); await p.click('[data-act=feeddrawer]');      /* Feed opens its own screen, a card for each animal */ await p.waitForSelector('#sheet [data-feed]'); const s0 = await S(); await p.click((await p.$('#sheet [data-feed="flakes"]')) ? '#sheet [data-feed="flakes"]' : '#sheet [data-feed]');      /* choosing the food drops it straight in */ ck('the care menu closes and no other menu is left over', await p.evaluate(() => !document.getElementById('sheet').classList.contains('on') && !document.getElementById('feedbar')));
await p.waitForTimeout(1500);      // (feeding is care, not a job: it pays no shells, so none fly up; rules.js feed)
const s1 = await S(); ck('choosing the food feeds straight away (no tap on the water): the octopus is less hungry, and no shells change hands', s1.shells === s0.shells && s1.fish[0].hunger < s0.fish[0].hunger, `${s0.shells}→${s1.shells}, hunger ${s0.fish[0].hunger}→${s1.fish[0].hunger}`);
ck('the first session ends right after the first feed, with a start button', await waitCoach('YOU ARE ALL SET')); await p.click('#cbtn'); await p.waitForSelector('#modal.on #mok', { timeout: 20000 }); ck('and says what is coming next', /COMING UP/i.test(await p.textContent('#modal h2')) && (await p.$$eval('#modal li', (n) => n.length)) >= 2, (await p.$$eval('#modal li', (n) => n.map((x) => x.textContent))).join(' | ')); await p.click('#mok'); await p.waitForTimeout(300);
await p.click('nav [data-tab=decorate]', { force: true }); await p.waitForSelector('[data-cat=PLANTS]'); await p.click('[data-cat=PLANTS]'); await p.waitForSelector('.card[data-k="decor:fern"]'); await p.click('.card[data-k="decor:fern"]'); await p.waitForTimeout(650); await p.click('.notesheet.deco.on .buy');
ck('the starter pack is already laid out in the tank (a den among it), so another plant costs shells', (await S()).decor.length === 5 && (await S()).decor.some((d) => d.type === 'coconut') && (await p.textContent('#pok')).includes('10'), await p.textContent('#pok'));
ck('placement bar opens', await p.evaluate(() => document.getElementById('placebar').classList.contains('on')));
await p.waitForTimeout(700); await p.mouse.click(120, 600); await p.waitForTimeout(150);
const valid = await p.evaluate(() => !document.getElementById('pok').disabled); ck('a clear spot is valid', valid);
const before = (await S()); await p.click('#pok'); await p.waitForTimeout(300); const after = await S();
ck('placing adds the plant and spends its shells (the plant wish may refund part)', after.decor.length === before.decor.length + 1 && after.shells < before.shells && after.shells >= before.shells - 10, `${before.decor.length}→${after.decor.length} shells ${before.shells}→${after.shells}`);
ck('tutorial saved as finished', (await S()).flags.tut === 5);

console.log('Shopping');
await p.evaluate(() => { window.__game.state.shells = Math.max(window.__game.state.shells, 30); window.__game.emit('state'); });      /* (the opening's fern above was bought, not free: enough for the anemone) */
await p.click('nav [data-tab=decorate]', { force: true }); await p.waitForSelector('[data-cat=PLANTS]'); await p.click('[data-cat=PLANTS]'); await p.waitForSelector('.card[data-k="decor:anemone"]'); await p.click('.card[data-k="decor:anemone"]');      /* (a level-1 plant that is not in the starter pack) */ await p.waitForTimeout(650); await p.click('.notesheet.deco.on .buy');
const sh = (await S()).shells; ck('a plant costs shells', (await p.textContent('#pok')).includes('14'), await p.textContent('#pok'));
await p.evaluate(() => { const d = window.__tank.decor; for (const [x, z] of [[2.2, 2.8], [-2.6, 2.9], [0.4, 3.0], [3.4, 2.6]]) { d.move(x, z); if (d.preview.valid) break; } document.getElementById('pok').disabled = !window.__tank.decor.preview.valid; }); await p.click('#pok'); await p.waitForTimeout(300);
const s2 = await S(); ck('buying a plant spends shells (the plant wish may refund part)', s2.shells < sh && s2.shells >= sh - 14, `${sh}→${s2.shells}`);
await p.click('nav [data-tab=decorate]', { force: true }); await p.waitForSelector('[data-cat=STRUCTURES]'); await p.click('[data-cat=PLANTS]'); await p.waitForSelector('.card[data-k="decor:kelp"]'); await p.click('.card[data-k="decor:kelp"]');      /* (giant kelp opens at level 3; the torii gate is earned now, never bought) */ await p.waitForTimeout(650); await p.click('.notesheet.deco.on .buy');
await p.waitForTimeout(300); ck('locked items explain themselves', /unlocks at tank level 3/.test(await p.evaluate(() => localStorage.getItem('ourtank.notices') || '')) && !(await p.evaluate(() => document.getElementById('placebar').classList.contains('on'))), await p.textContent('#toast'));
await p.evaluate(() => window.__game.dispatch({ t: 'dev', what: 'shells' }, { dev: true })); await p.waitForTimeout(200);
await p.evaluate(() => { window.__game.state.shells = Math.max(window.__game.state.shells, 40); window.__game.emit('state'); });      /* (enough for a clownfish after the plant) */ const fk = 'goldfish'; await p.click('[data-cat=FISH]'); await p.click(`.card[data-k="fish:${fk}"]`); await p.waitForTimeout(650); await p.click('.notesheet.deco.on .buy'); ck('fish are adoptable', await p.waitForSelector('#modal.on', { timeout: 5000 }).then(() => true).catch(() => false));
await p.waitForSelector('#modal.on'); if (/today's special/i.test(await p.textContent('#modal h2'))) { await p.click('#modal.on [data-i="1"]'); await p.click('#mok'); }      /* (at level 1 the clownfish is always today's special: take a plain one) */
await p.waitForSelector('#modal.on #mi'); await p.fill('#mi', 'Mango'); await p.click('#mok'); await p.waitForTimeout(400);
const so = await S(); ck('adopting places an order that is on its way', so.orders.length === 1 && so.fish.length === 1 && /arrives in|small gift is waiting/.test(await p.textContent('#goal')), `${so.orders.length} order, goal: ${await p.textContent('#goal')}`);
await p.evaluate(() => window.__game.dispatch({ t: 'dev', what: 'rush' }, { dev: true })); await p.waitForTimeout(600);
const s3 = await S(); ck('after the wait the fish arrives, nearly grown (shop fish come young, not as babies)', s3.fish.length === 2 && s3.fish[1].name === 'Mango' && s3.fish[1].stage !== 'baby', JSON.stringify(s3.fish.map((f) => f.name)));
ck('the new fish appears in the tank', (await p.evaluate(() => window.__tank.fishes.length)) === 2);
console.log('Loop');
await p.evaluate(() => window.__game.dispatch({ t: 'dev', what: 'drift' }, { dev: true })); await p.waitForTimeout(500);
const sd = await S(); ck('something turns up in the tank, with someone to blame, and shows up', !!sd.drift?.by && /Tap it in the tank/.test(await p.textContent('#goal')), JSON.stringify(sd.drift));
const sh0 = sd.shells; await p.evaluate(() => window.__game.dispatch({ t: 'collect', id: window.__game.state.drift.id })); const sd2 = await S(); ck('collecting the gift pays out and clears it', !sd2.drift && (sd.drift.kind === 'treat' || sd2.shells > sh0), `${sh0}→${sd2.shells}`);
await p.evaluate(() => { const f = window.__tank.fishes[0]; window.__ui.open('tank'); }); 
const pr = await p.evaluate(async () => { const g = window.__game, id = g.state.fish[0].id; const a = await g.dispatch({ t: 'pet', id }); const b = await g.dispatch({ t: 'pet', id }); return [a.applied, b.applied]; }); ck('petting works once, then the fish needs a moment', pr[0] === true && pr[1] === false, JSON.stringify(pr));
await p.evaluate(() => window.__ui.showBook()); await p.waitForSelector('.bk'); ck('the collection book lists found and unfound', (await p.$$('.bk.nope')).length > 0 && (await p.$$('.bk:not(.nope)')).length >= 1, `${(await p.$$('.bk')).length} entries`); await p.evaluate(() => window.__ui.open('tank'));

console.log('Progress');
await p.evaluate(() => window.__game.dispatch({ t: 'dev', what: 'shells' }, { dev: true })); await p.evaluate(() => window.__game.dispatch({ t: 'dev', what: 'shells' }, { dev: true }));
await p.click('nav [data-tab=decorate]', { force: true }); await p.click('[data-cat=FISH]'); await p.click('.card[data-k="fish:neon"]'); await p.waitForTimeout(650); await p.click('.notesheet.deco.on .buy'); await p.waitForSelector('#modal.on #mi'); await p.fill('#mi', 'Glow'); await p.click('#mok'); await p.waitForTimeout(400);
await p.evaluate(() => window.__game.dispatch({ t: 'dev', what: 'rush' }, { dev: true })); await p.waitForTimeout(600);
const s4 = await S(); ck('a neon school adds four fish', s4.fish.length === 6, `${s4.fish.length} fish`);
{ const R = await p.evaluate(async () => { const M = await import('/src/game/rules.js'), g = window.__game; for (let d = 0; d < 3; d++) await g.dispatch({ t: 'dev', what: 'day' }, { dev: true }); const a = M.scoreOf(g.state);      /* (a few days on, the water and glass are due) */ await g.dispatch({ t: 'water' }); await g.dispatch({ t: 'glass' }); return [a, M.scoreOf(g.state)]; }); ck('care earns level points (levels come from care, not from buying fish)', R[1] > R[0], JSON.stringify(R)); }
const g0 = (await p.evaluate(() => window.__tank.fishes.map((f) => f.growth)))[0];
for (let d = 0; d < 3; d++) await p.evaluate(() => window.__game.dispatch({ t: 'dev', what: 'day' }, { dev: true })); await p.waitForTimeout(500);      // (a baby for three days: BABY_DAYS)
const s5 = await S(); const g1 = (await p.evaluate(() => window.__tank.fishes.map((f) => f.growth)))[0];
ck('fish grow over days', s5.fish[0].stage !== 'baby' && g1 > g0, `${s5.fish[0].stage}, scale ${g0}→${g1}`);
ck('journal records real events', (await p.evaluate(() => window.__game.journal.map((j) => j.text))).some((t) => /grow|adult|level|Mango|brought/i.test(t)), '');
console.log('Content');
await p.evaluate(async () => { const g = window.__game; g.state.level = 8; for (let i = 0; i < 20; i++) await g.dispatch({ t: 'dev', what: 'shells' }, { dev: true }); });
const bought = await p.evaluate(async () => { const g = window.__game, out = []; let x = -4.4;
  for (const sp of ['guppy', 'platy', 'danio', 'betta']) out.push((await g.dispatch({ t: 'buyFish', species: sp, name: 'T' + sp, seed: 7 })).ok);
  for (const ty of ['moss', 'kelp', 'bubbler', 'shell', 'skull', 'arch', 'anchor', 'bamboo', 'bridge', 'crystal']) { out.push((await g.dispatch({ t: 'buyDecor', type: ty, x: x += 0.85, z: 2.9, ry: 0 })).ok); }
  return out; });
ck('new species and decorations can be bought', bought.every(Boolean), JSON.stringify(bought));
await p.evaluate(() => window.__game.dispatch({ t: 'dev', what: 'rush' }, { dev: true })); await p.waitForTimeout(1200); const nFish = (await S()).fish.length; const nf = await p.evaluate(() => [window.__tank.fishes.length, window.__tank.decor.items.size, window.__tank.decor.streams.size]);
ck('and appear in the tank (bubbler makes a bubble stream)', nf[0] === nFish && nf[1] >= 10 && nf[2] === 1, JSON.stringify(nf));
const sim = await p.evaluate(() => window.__sim(900)); ck('fish still avoid every new item', sim.pct < 0.5 && sim.worstFishOverlap < 0.4, JSON.stringify(sim));
await p.evaluate(() => { const s = window.__game.state; for (const f of s.fish) { f.health = 0.45; if (f.species === 'octopus') f.hunger = 0.85; } s.hunger = 0.85; window.__game.emit('state'); });
const mood = await p.evaluate(() => window.__tank.fishes[0].profile.mood); ck('hungry fish show a hungry mood', mood === 'Hungry', mood);
await p.evaluate(() => window.__game.dispatch({ t: 'note', text: 'Pip loves the bubbles' })); ck('journal notes work', (await p.evaluate(() => window.__game.journal.at(-1).text)).includes('Pip loves'));
console.log('Life in the tank');
await p.evaluate(async () => { const g = window.__game, fx = g.state.fish.find((f) => f.species !== 'octopus'); g.state.hunger = 0; for (const f of g.state.fish) f.health = 1; fx.traits = ['Lazy']; fx.found = []; fx.happy = 0.95; fx.born -= 5 * 864e5; fx.arrived = Date.now() - 5 * 864e5;      /* (a fish, not the octopus: an octopus keeps a den instead) */ await g.dispatch({ t: 'buyDecor', type: 'wood', x: 0, z: 3.0, ry: 0 }); });
await p.waitForFunction(() => window.__game.journal.some((j) => /favou?rite spot/.test(j.text)), null, { timeout: 8000 }).then(() => ck('a fish discovers a favourite spot from what is really in the tank', true), () => ck('a fish discovers a favourite spot from what is really in the tank', false));
await p.evaluate(() => { const s = window.__game.state; s.hunger = 0.9; window.__game.emit('state'); });
const em = await p.waitForFunction(() => window.__tank.fishes.some((f) => f.emote && f.emote.visible && f.profile.mood === 'Hungry'), null, { timeout: 16000 }).then(() => true, () => false); ck('hungry fish show a mood bubble', em);
const nxt = await p.evaluate(() => { document.querySelector('nav [data-tab=care]').click(); return document.querySelector('.grow')?.textContent ?? ''; }); ck('the care sheet shows what grows up next', /grows up in/.test(nxt) || nxt === '', nxt || '(all adults)');
await p.evaluate(() => window.__ui.open('tank'));
console.log('Care & persistence');
await p.evaluate(() => { const s = window.__game.state; s.glass = 0.7; s.water = 0.4; window.__game.emit('state'); });
await p.click('nav [data-tab=care]', { force: true }); await p.evaluate(() => { window.__wcScale = 30; }); await p.evaluate(() => document.querySelector('#sheet .crow[data-act="upkeep"] .cbtn, #sheet [data-act="upkeep"]')?.click()); await p.waitForTimeout(500); await p.evaluate(() => document.querySelector('#modal.on [data-up="water"]').click());      /* (Care: Tank upkeep, then Change the water) */ await p.evaluate(() => { for (let i = 0; i < 600 && window.__wc.active; i++) window.__wc.frame(0.1); }); await p.waitForTimeout(500);      // step the scene by hand: software rendering of a full tank is too slow to wait on real frames
await p.evaluate(() => { window.__game.save(); }); await p.addInitScript(() => localStorage.setItem('ourtank.seen.solo', String(Date.now() - 3 * 3600e3))); await p.reload(); await p.waitForSelector('#tank'); await p.waitForTimeout(1500);
const s6 = await S(); ck('progress survives a reload', s6.fish.length === nFish && s6.decor.length >= 10 && s6.flags.tut === 5, `${s6.fish.length} fish, ${s6.decor.length} decor`);
await p.waitForTimeout(4000); const cover = await p.evaluate(() => [...document.querySelectorAll('#modal.on, #reunion.on, #settle.on, #toast.on')].map((e) => e.id)); await p.evaluate(() => window.__ui.open('notices')); await p.waitForTimeout(800); const away = await p.evaluate(() => [...document.querySelectorAll('#sheet .awayl p')].map((x) => x.textContent));      // (coming back: the tank is left clear; the news waits in Today)
ck('coming back, nothing covers the tank, and Today shows what happened while away', !cover.length && away.length >= 1 && away.length <= 5, JSON.stringify({ cover, away }));
console.log(errors.length ? 'Errors: ' + errors.slice(0, 5).join(' | ') : 'No page errors');
if (errors.length) fails++;
await b.close(); console.log(fails ? `\n${fails} FAILED` : '\nPlaythrough passed'); process.exit(fails ? 1 : 0);

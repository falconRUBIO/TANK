// The Care sheet: one status line, 'Needs you' rows each with one button, quiet 'Later' rows that say when, extras apart, no repeated messages; every button does what it says. Needs the solo game on 8123. node tools/care_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');      // (CI points PW_MODULE at its own playwright)
const OUT = process.env.OUT || '/tmp/care'; (await import('node:fs')).mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:8123/?q=1&dev=1&tod=noon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(1500);
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
const set = (o) => p.evaluate((o) => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; s.level = 6; s.shells = 40; s.fish.length = 0;
  for (const f of o.fish) s.fish.push({ born: now - 20 * D, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, owner: 'me', ...f });
  s.hunger = o.h; s.water = o.w; s.glass = o.g; g.emit('state'); for (let i = 0; i < 4; i++) document.querySelector('#modal.on #mok')?.click(); }, o);
const open = async () => { await p.evaluate(() => { for (let i = 0; i < 4; i++) document.querySelector('#modal.on #mok')?.click(); window.__ui.open('tank'); window.__ui.open('care'); document.getElementById('sheet').scrollTop = 0; }); await p.waitForTimeout(500); };
const read = () => p.evaluate(() => ({ hero: document.querySelector('#sheet [data-csub="care"] .nc')?.textContent ?? '', heroSub: document.querySelector('#sheet .chero small')?.textContent, heads: [...document.querySelectorAll('#sheet h4')].map((x) => x.textContent),
  due: [...document.querySelectorAll('#sheet .crow.due, #sheet .crow.hot')].map((r) => r.querySelector('b').textContent + ' | ' + r.querySelector('small').textContent + ' | ' + (r.querySelector('.cbtn')?.textContent ?? '›')),
  later: [...document.querySelectorAll('#sheet .crow:not(.due):not(.hot)')].map((r) => r.querySelector('b').textContent + ' | ' + r.querySelector('small').textContent), drawer: !!document.querySelector('#sheet .cgroup .drawer'),
  dupes: [...document.querySelectorAll('#sheet .wish.daily small')].map((x) => x.textContent).filter((t) => /WORTH/i.test(t)).length + [...document.querySelectorAll('#sheet .moodchip b')].filter((x) => /Could use a hand/.test(x.textContent)).length,
  carehead: !!document.querySelector('#sheet .carehead'), extras: [...document.querySelectorAll('#sheet .acts.mini .tile')].map((t) => t.textContent.trim().slice(0, 30)) }));
// 1. a busy tank: octopus, seahorse and fish hungry, dirty water and glass
await set({ fish: [{ id: 'o1', name: 'Inky', species: 'octopus', seed: 5, hunger: 0.7 }, { id: 's1', name: 'Pip', species: 'seahorse', seed: 4, hunger: 0.6, sex: 'm' }, { id: 'g1', name: 'Nori', species: 'goldfish', seed: 3 }], h: 0.5, w: 0.6, g: 0.5 });
await open(); let r = await read(); console.log('busy', JSON.stringify(r));
ck('busy: the Care tab says how many jobs need you (feeding, and the tank upkeep)', r.hero === '2', r.hero);
ck('busy: Feed and Tank upkeep need you; upkeep names both jobs and its button says 2 jobs', r.due.length === 2 && /^Feed/.test(r.due[0]) && /^Tank upkeep \| The glass needs a wipe · the water is cloudy \| 2 jobs$/.test(r.due[1]), r.due);
ck('busy: no repeated messages (old headline, "worth doing now", "could use a hand")', !r.carehead && r.dupes === 0, r);
await p.screenshot({ path: `${OUT}/v_busy_top.png` });
// tapping Feed opens the Feed screen: a card for each animal that can eat; choosing the crab drops it in for Inky, no tap on the water needed
await p.evaluate(() => document.querySelector('#sheet .crow[data-act="feeddrawer"]').click()); await p.waitForTimeout(500); const cards = await p.evaluate(() => document.querySelectorAll('#sheet .fcards .fcard').length);
ck('tapping Feed opens the Feed screen with a card per animal', cards >= 2, cards);
await p.evaluate(() => document.querySelector('#sheet [data-feed="crab"]')?.click()); await p.waitForTimeout(1700); const feeding = await p.evaluate(() => ({ sheet: document.getElementById('sheet').classList.contains('on'), food: window.__game.feedFood, inky: +(window.__game.state.fish.find((f) => f.id === 'o1')?.hunger ?? 1).toFixed(2) }));
ck('choosing the crab closes the menu and drops it straight in for Inky', !feeding.sheet && feeding.food === 'crab' && feeding.inky < 0.5, feeding);
await p.evaluate(() => document.querySelector('#foodbar [data-done]')?.click());
// Wipe opens the glass cleaning; Change starts the water change
await open(); await p.evaluate(() => document.querySelector('#sheet .crow[data-act="upkeep"] .cbtn').click()); await p.waitForTimeout(500); await p.evaluate(() => document.querySelector('#modal.on [data-up="clean"]').click()); await p.waitForTimeout(600);
const cleaning = await p.evaluate(() => ({ sheet: document.getElementById('sheet').classList.contains('on') })); ck('Wipe closes Care and starts cleaning', !cleaning.sheet, cleaning);
await p.mouse.click(10, 10).catch(() => {}); await p.evaluate(() => { window.__ui.open('tank'); });
// 2. all looked after
await set({ fish: [{ id: 'o1', name: 'Inky', species: 'octopus', seed: 5, hunger: 0.02 }, { id: 'g1', name: 'Nori', species: 'goldfish', seed: 3 }], h: 0.02, w: 0.95, g: 0.05 });
await open(); r = await read(); console.log('calm', JSON.stringify(r));
ck('calm: no count on the Care tab, nothing needs you, Feed and Tank upkeep say when they are next due, and Health lists every animal', !r.hero && !r.due.length && r.later.length >= 2 && r.later.some((x) => /^Tank upkeep \| All clean · next:/.test(x)) && r.later.some((x) => /^Health \| /.test(x)), r);
ck('calm: the food list is folded away', !r.drawer);
{ await p.evaluate(() => document.querySelector('#sheet [data-csub="play"]')?.click()); await p.waitForTimeout(400); const ex = await p.evaluate(() => [...document.querySelectorAll('#sheet .acts.mini .tile')].map((t) => t.textContent.trim().slice(0, 30)));
  ck('calm: Puzzle jar and Postcard are on the Play tab', ex.some((x) => /Puzzle/.test(x)) && ex.some((x) => /Postcard/.test(x)), ex); await p.evaluate(() => document.querySelector('#sheet [data-csub="care"]')?.click()); await p.waitForTimeout(400); }
await p.screenshot({ path: `${OUT}/v_calm_top.png` }); await p.evaluate(() => { document.getElementById('sheet').scrollTop = 99999; }); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/v_calm_end.png` });
// a tap on a not-due row still does something sensible (it opens the food list / says when)
await p.evaluate(() => document.querySelector('#sheet .crow[data-act="upkeep"]').click()); await p.waitForTimeout(600);
const tw = await p.evaluate(() => ({ sheet: document.getElementById('sheet').classList.contains('on'), list: document.querySelector('#modal.on')?.textContent ?? '' })); ck('tapping Tank upkeep when nothing is due stays on Care and lists the glass, water and plants with when each is due', tw.sheet && /Glass/.test(tw.list) && /Water/.test(tw.list) && /Plants/.test(tw.list), tw);
await p.evaluate(() => document.querySelector('#modal.on #mno')?.click()); await p.waitForTimeout(300);
// 3. only fish, one thing due; 4. an empty tank
await set({ fish: [{ id: 'g1', name: 'Nori', species: 'goldfish', seed: 3 }], h: 0.5, w: 0.95, g: 0.05 }); await open(); r = await read();
ck('fish only, hungry: one job on the Care tab, and Feed for the fish', r.hero === '1' && r.due.length === 1 && /1 animal could use food/.test(r.due[0]), r.due);
await set({ fish: [], h: 0.5, w: 0.95, g: 0.05 }); await open(); r = await read();
ck('an empty tank does not break the page, and has no Feed row', r.later.some((x) => /^Tank upkeep/.test(x)) && !r.later.some((x) => /^Feed/.test(x)), r);
// the Tank status fold opens to the meters
await set({ fish: [{ id: 'o1', name: 'Inky', species: 'octopus', seed: 5, hunger: 0.3 }], h: 0.1, w: 0.9, g: 0.1 }); await open();
await p.evaluate(() => document.querySelector('#sheet [data-act=healthopen]').click()); await p.waitForTimeout(500); const hl = await p.evaluate(() => [...document.querySelectorAll('#sheet .hcard')].map((r) => r.textContent)); ck('Health has a row for each animal, with a word for how it is', hl.length >= 1 && hl.every((t) => /Happy|Content|Hungry|Lonely|Uneasy|Stressed|Gloomy|Unwell/.test(t)), hl);
ck('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? `${fails} failed` : 'Care checks passed'); await b.close();

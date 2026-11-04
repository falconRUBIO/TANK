// Feed everyone: on the Feed screen, one tap feeds every one that can eat, each with its own everyday food (flakes for the fish, a crab for the
// octopus, tiny shrimp for the seahorse), all free; with only one that can eat there is no such button. Needs the solo game on 8123. node tools/feedall_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const OUT = process.env.OUT || '/tmp/feedall'; (await import('node:fs')).mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:8123/?q=1&dev=1&tod=noon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(1500);
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
const set = (o) => p.evaluate((o) => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; s.level = 6; s.shells = o.sh ?? 40; s.fish.length = 0;
  for (const f of o.fish) s.fish.push({ born: now - 30 * D, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, owner: 'me', ...f });
  s.hunger = o.h; s.water = 1; s.glass = 0; g.emit('state'); for (let i = 0; i < 4; i++) document.querySelector('#modal.on #mok')?.click(); }, o);
const openFeed = async () => { await p.evaluate(() => { for (let i = 0; i < 4; i++) document.querySelector('#modal.on #mok')?.click(); window.__ui.open('tank'); window.__ui.open('care'); }); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('#sheet .crow[data-act="feeddrawer"]')?.click()); await p.waitForTimeout(600); };
const hungers = () => p.evaluate(() => { const s = window.__game.state; return { fish: +(s.hunger ?? 0).toFixed(2), ...Object.fromEntries(s.fish.filter((f) => f.species === 'octopus' || f.species === 'seahorse').map((f) => [f.name, +(f.hunger ?? 0).toFixed(2)])), shells: s.shells }; });
await set({ fish: [{ id: 'o1', name: 'Inky', species: 'octopus', seed: 5, hunger: 0.7 }, { id: 's1', name: 'Pip', species: 'seahorse', seed: 4, hunger: 0.6, sex: 'm' }, { id: 'g1', name: 'Nori', species: 'goldfish', seed: 3 }, { id: 'g2', name: 'Bubbles', species: 'neon', seed: 7 }], h: 0.5 });
await openFeed(); const btn = await p.evaluate(() => { const x = document.querySelector('#sheet .feedall'); return x ? { text: x.textContent.replace(/\s+/g, ' ').trim(), list: x.dataset.list } : null; });
ck('three can eat: the Feed screen offers Feed everyone, three meals, free', !!btn && /Feed everyone/.test(btn.text) && /3 meals · free/.test(btn.text), btn);
ck('each gets its own everyday food', btn && ['flakes:', 'crab:o1', 'mysis:s1'].every((k) => btn.list.split(',').includes(k)), btn?.list);
await p.screenshot({ path: `${OUT}/feedall.png` });
const before = await hungers(); await p.evaluate(() => document.querySelector('#sheet .feedall').click());
let after = before; for (let i = 0; i < 40; i++) { await p.waitForTimeout(1000); after = await hungers(); if (after.fish < 0.3 && after.Inky < 0.4 && after.Pip < 0.4) break; }
const shut = await p.evaluate(() => !document.getElementById('sheet').classList.contains('on'));
ck('one tap: the menu closes', shut);
ck('and everyone is fed: the fish, Inky and Pip', after.fish < before.fish - 0.15 && after.Inky < before.Inky - 0.2 && after.Pip < before.Pip - 0.2, { before, after });
ck('it cost nothing', after.shells >= before.shells, { before: before.shells, after: after.shells });
await set({ fish: [{ id: 'g1', name: 'Nori', species: 'goldfish', seed: 3 }], h: 0.5 }); await openFeed();
const lone = await p.evaluate(() => !!document.querySelector('#sheet .feedall')); ck('only one can eat: no Feed everyone button', !lone);
ck('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Feed everyone checks passed'); process.exit(fails ? 1 : 0);

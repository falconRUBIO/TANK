// Living History, the last four, in the real game: a fish that keeps poking round an octopus's den becomes its nuisance (with the reason, kept by
// the tank); a fish whose friend is away on an adventure hangs about up at the back where it went; a young fish leans toward its parents'
// temperament; a keepsake remembers which animals come to look at it. Needs the solo game on 8123.   node tools/living_check2.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const base = process.env.BASE || 'http://localhost:8123';
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), A = { born: now - 12 * 864e5, stage: 'adult', happy: 0.9, health: 1 }; s.flags.tut = 5; s.createdAt = now - 30 * 864e5; s.level = 6; s.fish.length = 0;
  s.fish.push({ ...A, id: 'oA', name: 'Biscuit', species: 'octopus', seed: 5, hunger: 0.1, owner: 'me', home: 'c1', traits: [], buddy: 'fP' }, { ...A, id: 'fN', name: 'Nosy', species: 'goldfish', seed: 3, traits: ['Curious'] },
    { ...A, id: 'fP', name: 'Pal', species: 'blue', seed: 4, traits: ['Social'] }, { ...A, id: 'fK', name: 'Kid', species: 'goldfish', seed: 8, stage: 'baby', born: now - 864e5, traits: ['Curious'], parents: [{ id: 'm1', name: 'Mo' }, { id: 'm2', name: 'Ma' }], lean: { from: ['Mo', 'Ma'], bold: 0.1, soc: 0.05 } });
  s.decor.length = 0; s.decor.push({ id: 'c1', type: 'coconut', x: 1.0, z: 1.2, ry: 0 }, { id: 'r1', type: 'rock', x: -2, z: 0.6, ry: 0 });
  s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] }; s.keeps = [{ id: 'k1', k: 'pebble', by: 'oA', byName: 'Biscuit', at: now - 864e5, x: 1.4, z: 1.8 }]; s.visitAt = now + 9e9; g.emit('state'); });
await p.waitForTimeout(3000);
// 1. Nosy keeps nosing round the den while Biscuit rests in it
const g = await p.evaluate(() => { window.__simClock(true); const F = window.__fishes, o = F.byId.get('oA'), n = F.byId.get('fN'), sent = []; const was = F.onMemo; F.onMemo = (m) => { sent.push(m); was?.(m); };
  for (let i = 0; i < 400; i++) { o.st = { s: 'rest', t: 5, n: 0, pulse: 0, mode: null }; o.pos.set(o.den.x, 0.6, o.den.z); n.pos.set(o.den.x + 0.5, 0.9, o.den.z + 0.3); F.qT = 0; o.memoSent = -1e9; F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); }
  F.onMemo = was; return { pokes: o.denPokes?.fN ?? 0, rival: o.rival, sent: sent.at(-1) ?? null }; });
await p.waitForTimeout(800); const gr = await p.evaluate(() => window.__game.state.fish.find((f) => f.id === 'oA').grudge ?? null);
ck('Nosy, always poking round the den, becomes Biscuit\'s nuisance, and the tank keeps the reason', g.rival === 'fN' && g.sent?.rival === 'fN' && g.sent?.why === 'den' && gr?.id === 'fN' && gr.why === 'den', JSON.stringify({ g, gr }));
// 2. Biscuit goes out on an adventure; Pal (its friend) hangs about up at the back where it went
await p.evaluate(() => { const o = window.__fishes.byId.get('oA'); o.fishMemo = { fP: { f: 20, a: 0 } }; o.memo?.({ fid: 'fP' }, 'f', 0); o.sharedBuddy = 'fP'; o.sharedRival = o.rival ?? null; });      // (it really is fond of Pal: so its phone keeps Pal as its buddy)
await p.evaluate(() => { const s = window.__game.state, f = s.fish.find((x) => x.id === 'oA'), now = Date.now(); f.buddy = 'fP'; f.restless = { id: 'aW', at: now - 1000, until: now - 10, kind: 'night', out: 'quiet' }; window.__game.emit('state'); });
if (process.env.DBG) console.log('B0', JSON.stringify(await p.evaluate(() => ({ st: window.__game.state.fish.find((x) => x.id === 'oA').buddy, cl: window.__fishes.byId.get('oA').buddy, memo: window.__fishes.byId.get('oA').fishMemo }))));
await p.waitForFunction(() => window.__fishes.out?.get('oA'), null, { timeout: 30000 }).catch(() => {});
if (process.env.DBG) console.log('B1', JSON.stringify(await p.evaluate(() => ({ st: window.__game.state.fish.find((x) => x.id === 'oA').buddy, j: window.__game.journal.slice(-3).map((e) => e.text) }))));
if (process.env.DBG) console.log(JSON.stringify(await p.evaluate(() => { const s = window.__game.state, f = s.fish.find((x) => x.id === 'oA'); return { away: f.away, restless: f.restless, buddy: f.buddy, out: [...(window.__fishes.out?.keys() ?? [])], palRec: window.__fishes.byId.get('fP')?.palId }; })));
const wait = await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('fP'), o = F.out.get('oA'); let n = 0; for (let i = 0; i < 200; i++) { f.retarget = 0; f.pick(Math.random); if (f.target.y > 8 && f.target.z < -1.5) n++; } return { n, waited: f.waitedFor ?? 0 }; });
ck('while Biscuit is away, its friend Pal keeps going up to the back where it left', wait.n > 30, JSON.stringify(wait));
await p.evaluate(() => { window.__showCard(window.__fishes.byId.get('fP')); }); await p.waitForTimeout(700); const palCard = await p.evaluate(() => document.body.innerText); if (process.env.DBG) console.log('S', JSON.stringify(await p.evaluate(() => { const o = window.__game.state.fish.find((x) => x.id === 'oA'); return { buddy: o.buddy, away: !!o.away }; })));
ck('Pal\'s profile: "Waiting for Biscuit to come back."', /Waiting for Biscuit to come back/.test(palCard), process.env.DBG ? palCard.slice(0, 600).replace(/\n/g, ' | ') : (palCard.match(/Waiting[^\n]*/)?.[0] ?? ''));
await p.evaluate(() => document.querySelector('#card .x')?.click()); await p.waitForTimeout(300);
// 3. the kid leans toward its parents (bolder), on its own personality
const lean = await p.evaluate(async () => { const P = await import('/src/profile.js'), s = window.__game.state, k = s.fish.find((f) => f.id === 'fK'); return { withL: P.personaOf(k).bold, without: P.personaOf({ ...k, lean: null }).bold }; });
ck('the young one is a little bolder, like its parents, and no more', lean.withL > lean.without && lean.withL - lean.without < 0.15, JSON.stringify(lean));
// 4. the keepsake remembers who comes: Biscuit's pebble, visited by Biscuit (reports through the game, as the phone sends them)
await p.evaluate(async () => { const s = window.__game.state; s.fish.find((f) => f.id === 'oA').away = null; delete s.fish.find((f) => f.id === 'oA').away; window.__game.emit('state'); });
await p.waitForTimeout(500); await p.evaluate(async () => { await window.__game.dispatch({ t: 'octoTouch', fish: 'oA', decor: 'k1', kind: 'revisit' }); });
const kv = await p.evaluate(() => window.__game.state.keeps[0].h?.visits ?? null);
ck('the pebble remembers Biscuit coming to it', kv?.oA?.[0] === 1 && kv.oA[2] === 'Biscuit', JSON.stringify(kv));
// 5. the profiles say these things, from the record
await p.evaluate(() => { window.__game.profTab = 'over'; window.__showCard(window.__fishes.byId.get('fK')); }); await p.waitForTimeout(700); const kidCard = await p.evaluate(() => document.body.innerText);
ck('the kid\'s profile: "Takes after Mo and Ma: … a little more bold"', /Takes after Mo and Ma: .*a little more bold/.test(kidCard), kidCard.match(/Takes after[^\n]*/)?.[0] ?? '');
await p.evaluate(() => document.querySelector('#card .x')?.click()); await p.waitForTimeout(300);
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Living History part two checks passed'); process.exit(fails ? 1 : 0);

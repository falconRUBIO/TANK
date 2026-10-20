// An octopus baby, in the real game: the mother's eggs hang in her den and she stays with them; Care counts them down; ready, they wait for
// someone to watch; then tiny octopuses jet out of the den, one stays, tiny, with the same name-it moment and a staged photo in the journal.
// Needs the solo game on 8123.   node tools/octo_baby_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/octobaby'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5, A = { born: now - 60 * D, stage: 'adult', happy: 0.9, health: 1, hunger: 0.1, owner: 'me', ownerName: 'You' }; s.flags.tut = 5; s.level = 8; s.createdAt = now - 70 * D; s.visitAt = s.eggAt = now + 9e9; s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] }; s.fish.length = 0;
  s.fish.push({ ...A, id: 'oA', name: 'Ada', species: 'octopus', seed: 5, sex: 'f', home: 'c1', partner: 'oB', partneredAt: now - 9 * D, traits: ['Calm'], brood: 'e1' }, { ...A, id: 'oB', name: 'Bo', species: 'octopus', seed: 9, sex: 'm', partner: 'oA', partneredAt: now - 9 * D, traits: ['Curious'] });
  s.decor.length = 0; s.decor.push({ id: 'c1', type: 'coconut', x: 1.2, z: 0.4, ry: 0 }, { id: 'p1', type: 'grass', x: -2, z: 0.2, ry: 0 });
  s.eggs = [{ id: 'e1', species: 'octopus', a: 'oA', b: 'oB', seed: 5, pa: { id: 'oA', name: 'Ada', seed: 5 }, pb: { id: 'oB', name: 'Bo', seed: 9 }, laid: now - 4 * D, hatchAt: now + 5 * 3600e3, cared: [], guard: 'oA', den: 'c1' }]; s.hunger = 0; s.water = 1; s.glass = 0; g.emit('state');
  document.querySelectorAll('#goal,#coach,#toast').forEach((e) => (e.style.display = 'none')); for (const b of document.querySelectorAll('#modal.on #mok')) b.click(); });
await p.waitForTimeout(3000); await p.evaluate(() => { window.__cam = [1.2, 1.2, 4.2, 1.2, 0.7, 0.9]; }); await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/1-den.png` }); await p.evaluate(() => { window.__cam = null; });
const den = await p.evaluate(() => { const st = window.__game.state; return { eggs: st.eggs.length, thought: window.__fishes.byId.get('oA')?.thought ?? null }; });
ck('the eggs hang in her den and she stays with them', den.eggs === 1 && /eggs/.test(den.thought ?? ''), den);
await p.evaluate(() => { window.__ui.open('tank'); window.__ui.open('care'); }); await p.waitForTimeout(800);
const row = await p.evaluate(() => [...document.querySelectorAll('#sheet .crow')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()).find((t) => /eggs/.test(t)) ?? '');
ck('Care counts them down', /Ada & Bo's eggs.*hatches in [45] h \d+ m/.test(row), row);
await p.evaluate(() => { const s = window.__game.state; s.eggs[0].hatchAt = Date.now() - 1000; window.__game.emit('state'); }); await p.evaluate(() => window.__game.dispatch({ t: 'devSea', what: 'noop' }).catch(() => {})); await p.waitForTimeout(2000);
for (let i = 0; i < 3; i++) { await p.evaluate(() => document.querySelector('#modal.on #mok')?.click()); await p.waitForTimeout(400); }      // (close the new-life card first, as a player would)
await p.evaluate(() => { window.__ui.open('tank'); window.__ui.open('care'); }); await p.waitForTimeout(600); await p.evaluate(() => document.querySelector('#sheet .crow[data-act="egg"]')?.click());
let kid = null; for (let i = 0; i < 40 && !kid; i++) { await p.waitForTimeout(500); kid = await p.evaluate(() => { const k = window.__game.state.fish.find((f) => f.parents?.length); return k && !window.__game.state.eggs.some((e) => e.species === 'octopus') ? { id: k.id, name: k.name, species: k.species, owner: k.owner } : null; }); }
ck('watched: they hatch, and one tiny octopus stays', kid?.species === 'octopus' && kid.owner === 'me', kid);
await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/2-hatch.png` });
const g = await p.evaluate((id) => +(window.__fishes.byId.get(id)?.growth ?? 0).toFixed(2), kid?.id); ck('it is tiny', g > 0 && g <= 0.25, g);
const other = () => p.evaluate(() => { const m = document.querySelector('#modal.on'); if (m && !/NAME YOUR BABY|ONE MORE LITTLE ONE/i.test(m.innerText)) m.querySelector('#mok')?.click(); });
let named = false; for (let i = 0; i < 40 && !named; i++) { await p.waitForTimeout(500); await other(); named = await p.evaluate(() => /NAME YOUR BABY/i.test(document.querySelector('#modal.on')?.innerText ?? '')); }
ck('you name it', named); if (named) { await p.fill('#modal.on #mi', 'Pip'); await p.click('#modal.on #mok'); }
for (let i = 0; i < 10; i++) { await p.waitForTimeout(500); await p.evaluate(() => { const m = document.querySelector('#modal.on'); if (/ONE MORE/i.test(m?.innerText ?? '')) m.querySelector('#mno')?.click(); }); }
let ph = null; for (let i = 0; i < 20 && !ph; i++) { await p.waitForTimeout(500); ph = await p.evaluate(() => JSON.parse(localStorage.getItem('ourtank.moments') || '[]').find((m) => /Tiny octopuses/.test(m.text))?.img ?? null); }
if (ph) fs.writeFileSync(`${out}/3-journal.jpg`, Buffer.from(ph.split(',')[1], 'base64'));
ck('the journal keeps a staged photo of it', !!ph?.startsWith('data:image/jpeg'));
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Octopus baby checks passed'); process.exit(fails ? 1 : 0);

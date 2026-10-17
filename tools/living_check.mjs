// Living History in the real game: three octopuses greet the same caretaker three different ways because each knows them differently; a fish
// whose favourite decoration was moved looks for it where it used to be; a visitor that keeps coming back can be asked to stay, and does; a
// time capsule gets a photo of the tank as it is. Needs the solo game on 8123.   node tools/living_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/living'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), A = { born: now - 12 * 864e5, stage: 'adult', happy: 0.9, health: 1, hunger: 0.1, owner: 'me', traits: [] }; s.flags.tut = 5; s.createdAt = now - 30 * 864e5; s.level = 6; s.fish.length = 0;
  s.fish.push({ ...A, id: 'oA', name: 'Ada', species: 'octopus', seed: 5, home: 'c1', bond: { me: 20 } }, { ...A, id: 'oB', name: 'Bo', species: 'octopus', seed: 9, home: 'c2', bond: { me: 4 } }, { ...A, id: 'oC', name: 'Cy', species: 'octopus', seed: 13, bond: {} },
    { ...A, id: 'fF', name: 'Finn', species: 'goldfish', seed: 3, owner: null, spotId: 'r1', found: ['spot'] });
  s.decor.length = 0; s.decor.push({ id: 'c1', type: 'coconut', x: 1.6, z: 1.2, ry: 0 }, { id: 'c2', type: 'pot', x: -2.2, z: 1.0, ry: 0 }, { id: 'r1', type: 'boulder', x: -0.5, z: -0.8, ry: 0 }, { id: 'g1', type: 'grass', x: 3.0, z: 2.0, ry: 0 });
  s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] }; s.keeps = []; s.visitAt = now + 9e9; g.emit('state'); });
await p.waitForTimeout(3000);
const step = (n) => p.evaluate((n) => { window.__simClock(true); const F = window.__fishes; for (let i = 0; i < n; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((f) => f.update(0.05, Math.random, F.list)); } }, n);
// 1. the caretaker opens the tank: each octopus by how well it knows them
const gr = await p.evaluate(() => { const F = window.__fishes; F.rng = () => 0.3; for (const id of ['oA', 'oB', 'oC']) { const f = F.byId.get(id); f.inspect = null; f.task = null; f.greeted = null; } F.greet(); return Object.fromEntries(['oA', 'oB', 'oC'].map((id) => { const f = F.byId.get(id); return [id, { trust: f.trust, greeted: f.greeted, glass: !!f.glassAt }]; })); });
ck('Ada (trusts you) comes to the glass; Bo (knows you a little) watches from its den; Cy (a stranger) carries on', gr.oA.greeted === 'glass' && gr.oA.glass && gr.oB.greeted === 'den' && gr.oC.greeted === 'busy', JSON.stringify(gr));
await step(120); await p.screenshot({ path: `${out}/1-greetings.png` });
// 2. Finn's favourite boulder is moved: Finn looks for it where it used to be first
await p.evaluate(async () => { await window.__game.dispatch({ t: 'moveDecor', id: 'r1', x: 2.6, z: -1.6, ry: 0 }); }); await p.waitForTimeout(1200);
const search = await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('fF'); F.rng = Math.random; const t = []; for (let i = 0; i < 60; i++) { f.retarget = 0; f.pick(Math.random); t.push([f.target.x, f.target.z]); } const old = t.filter(([x, z]) => Math.hypot(x + 0.5, z - 0) < 1.0).length, nw = t.filter(([x, z]) => Math.hypot(x - 2.6, z - (-0.8)) < 1.2).length; return { old, searched: f.searchedOld ?? 0, nw }; });
ck('Finn goes to where its boulder used to be (twice), then settles for the new spot', search.searched === 2 && search.old >= 2, JSON.stringify(search));
// 3. a visitor that keeps coming back asks to stay; "Let it stay" makes it a fish of the tank
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(); s.visitMem = Object.fromEntries(['sunangel', 'moonbetta', 'rosecory'].map((sp) => [sp, { first: now - 20 * 864e5, n: 2, last: now - 5 * 864e5, met: [], spot: 'g1' }])); delete s.stayAskAt; s.seen.fish.push('sunangel', 'moonbetta', 'rosecory'); s.visitor = null; s.visitWait = true; s.visitAt = now - 10; g.emit('state'); });
await p.waitForFunction(() => window.__game.state.visitor, null, { timeout: 15000 }).catch(() => {});
let v = await p.evaluate(() => window.__game.state.visitor);
ck('on its third visit the visitor would like to stay', !!v?.stay, JSON.stringify(v));
await p.waitForTimeout(1500); await p.evaluate(() => { document.querySelectorAll('#goal,#coach,#toast').forEach((e) => (e.style.display = 'none')); for (const b of document.querySelectorAll('#modal.on #mok')) b.click(); });
for (let i = 0; i < 4; i++) { await p.evaluate(() => { for (const b of document.querySelectorAll('button')) if (/^(Claim|OK|Not now|Later)$/i.test(b.textContent.trim()) && b.offsetParent) b.click(); }); await p.waitForTimeout(700); }      // (the daily gift may pop up first)
await p.waitForTimeout(600); await p.evaluate(() => { const f = window.__fishes.byId.get(window.__game.state.visitor.id); window.__dlgLog = []; const d0 = window.__ui.dialog; window.__ui.dialog = (o) => { window.__dlgLog.push('call ' + o.title + ' ' + document.querySelector('#modal').className); const r = d0(o); r.then?.((v) => window.__dlgLog.push('done ' + v)); return r; }; window.__greetV?.(f)?.catch?.((e) => window.__dlgLog.push('err ' + e.message)); }); await p.waitForFunction(() => /wants to stay/i.test(document.querySelector('#modal.on')?.innerText ?? '') || (() => { for (const b of document.querySelectorAll('button')) if (/^(Claim|OK)$/i.test(b.textContent.trim()) && b.offsetParent) b.click(); return false; })(), null, { timeout: 20000 }).catch(() => {});      // (it opens once the screen is free)
const dlg = await p.evaluate(() => document.querySelector('#modal.on')?.innerText ?? ''); if (process.env.DBG) console.log('D', JSON.stringify(await p.evaluate(() => ({ log: window.__dlgLog, v: window.__game.state.visitor, modal: document.querySelector('#modal')?.className, txt: document.querySelector('#modal')?.innerText?.slice(0, 120), inList: window.__fishes.byId.has(window.__game.state.visitor?.id) })))); await p.screenshot({ path: `${out}/2-wants-to-stay.png` });
ck('tapping it asks: let it stay, or let it wander (no hurry, no cost)', /wants to stay/i.test(dlg) && /Let it stay/.test(dlg) && /Let it wander/.test(dlg), dlg.replace(/\n/g, ' | '));
await p.click('#modal.on [data-i="0"]'); await p.waitForTimeout(1500);
const kept = await p.evaluate(() => { const s = window.__game.state; return { fish: s.fish.filter((f) => f.resident).map((f) => ({ name: f.name, species: f.species })), inWater: window.__fishes.list.some((f) => f.fid?.startsWith('r') && !f.visitor) }; });
ck('it stays: a fish of the tank now, swimming with the others', kept.fish.length === 1 && kept.inWater, JSON.stringify(kept));
// 4. a time capsule made while someone is looking gets a photo of the tank as it is
await p.evaluate(() => { const g = window.__game; g.addJournal('Time capsule: day 30. 5 animals, 4 decorations, level 6.'); }); await p.waitForTimeout(2500);
const ph = await p.evaluate(() => JSON.parse(localStorage.getItem('ourtank.capsules') || '[]').find((m) => m.text.startsWith('Time capsule: day 30'))?.img?.slice(0, 30) ?? null);
ck('the capsule\'s photo is taken from the tank itself, right then', !!ph && ph.startsWith('data:image/jpeg'), ph ?? '');
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Living History checks passed'); process.exit(fails ? 1 : 0);

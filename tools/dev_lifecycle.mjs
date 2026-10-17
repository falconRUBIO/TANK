// Developer Tools, end to end on the real server with two phones: only a listed developer sees the tools; both phones open the same test
// aquarium; the panel's buttons take a seahorse pair from pairing to THEY'RE READY on the game's own rules; both phones choose at once and
// exactly one baby stays; the others leave on each phone once, not again after a reload; leaving the test puts the phone back in its own,
// untouched tank. Starts its own server (temporary database). node tools/dev_lifecycle.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');      // (CI points PW_MODULE at its own playwright)
import { start } from '../server/server.mjs';
import fs from 'node:fs';
const OUT = process.env.OUT || '/tmp/devlife'; fs.mkdirSync(OUT, { recursive: true });
const DEVS = [], S = await start({ port: 0, dbPath: ':memory:', devUsers: DEVS, limits: { userPerHour: 500, tankPerHour: 500, joinPerMin: 500, actionsPer10s: 500 } }), base = `http://localhost:${S.port}`;
const call = async (p, body, tok) => (await fetch(base + p, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok }, body: body ? JSON.stringify(body) : undefined })).json();
const mk = async (name) => { const u = await (await fetch(base + '/api/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, avatar: { skin: '#e8b890', hair: '#5a3ad0', hat: null } }) })).json(); return u; };
const a = await mk('Alex'), b = await mk('Blair'), plain = await mk('Pat'); const home = await call('/api/tanks', { name: 'Home' }, a.token); await call('/api/join', { code: home.code }, b.token); await call('/api/join', { code: home.code }, plain.token);
{ const row = S.db.prepare('SELECT world FROM tanks WHERE id=?').get(home.id), w = JSON.parse(row.world); w.flags = { ...w.flags, tut: 5, firsts: { [a.userId]: true, [b.userId]: true, [plain.userId]: true } }; w.fish = [{ id: 'g1', name: 'Nori', species: 'goldfish', seed: 3, born: Date.now() - 9e8, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, owner: a.userId }]; w.shells = 42; S.db.prepare('UPDATE tanks SET world=? WHERE id=?').run(JSON.stringify(w), home.id); }      // a lived-in real tank
DEVS.push(a.userId, b.userId);
const realBefore = await call('/api/export', null, a.token);
const br = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }); let fails = 0; const errors = [];
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
const phone = async (u) => { const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addInitScript((s) => { try { if (!localStorage.getItem('ourtank.session')) localStorage.setItem('ourtank.session', JSON.stringify(s)); localStorage.setItem('ourtank.tut', '9'); } catch {} }, { token: u.token, userId: u.userId, named: true }); const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(e.message)); return p; };
const until = async (p, fn, secs = 120, arg) => { for (let i = 0; i < secs * 2; i++) { const v = await p.evaluate(fn, arg).catch(() => null); if (v) return v; await p.waitForTimeout(500); } return null; };
const boot = async (p) => { await p.goto(base + '/?tod=noon'); await until(p, () => window.__game?.state && window.__game.mode === 'net'); await p.waitForTimeout(1500); await p.evaluate(() => { document.querySelectorAll('#modal.on #mok').forEach((x) => x.click()); }); };
const A = await phone(a), B = await phone(b), P = await phone(plain);
const clear = (p) => p.evaluate(() => { for (let i = 0; i < 4; i++) { const t = document.querySelector('#modal.on h2')?.textContent ?? ''; if (!t || /READY|KEEP|RESET|JOIN/.test(t)) break; document.querySelector('#modal.on #mok')?.click(); } });      // (a daily gift, a welcome: out of the way)
const tap = async (p, sel) => { await clear(p); await p.evaluate((sel) => document.querySelector(sel)?.click(), sel); };
await Promise.all([boot(A), boot(B), boot(P)]);
const settings = async (p) => { await p.evaluate(() => window.__ui.open('settings')); await p.waitForTimeout(500); return p.evaluate(() => !!document.getElementById('devtools')); };
ck('a listed developer sees Developer Tools in Settings', await settings(A));
ck('an ordinary player does not, and the server refuses them', !(await settings(P)) && (await call('/api/dev/test', null, plain.token)).error === 'FORBIDDEN');
await P.context().close();      // (only needed for that check)
// A: Developer Tools > fast lifecycle test ON > enter the test aquarium
await tap(A, '#devtools'); await until(A, () => document.getElementById('devfast')); await tap(A, '#devfast'); await until(A, () => document.getElementById('deventer'));
await A.screenshot({ path: `${OUT}/1_panel_off_test.png` });
await tap(A, '#deventer'); await until(A, () => window.__game?.test === true && window.__game.state); await A.waitForTimeout(1000);
const code = (await call('/api/dev/test', null, a.token)).tank.code;
ck('the test aquarium opens on this phone, marked TEST, and it is not the real tank', await A.evaluate(() => window.__game.test && !document.getElementById('testb').hidden && window.__game.tankName === 'TEST AQUARIUM'));
// B joins with the test code, the way Developer Tools does it
await call('/api/dev/test/join', { code }, b.token); await B.evaluate(() => { localStorage.setItem('ourtank.testAq', '1'); location.reload(); }); await until(B, () => window.__game?.test === true && window.__game.state);
ck('the second phone is in the same test aquarium', (await B.evaluate(() => window.__game.code)) === code);
const panel = async (p) => { await p.evaluate(() => { window.__ui.open('settings'); }); await until(p, () => document.getElementById('devtools')); await tap(p, '#devtools'); await until(p, () => document.querySelector('[data-dev]') || document.getElementById('devfast')); if (!(await p.evaluate(() => document.querySelector('[data-dev]')))) { await tap(p, '#devfast'); await until(p, () => document.querySelector('[data-dev]')); } };
const press = async (op) => { await panel(A); await until(A, (op) => { const b = document.querySelector(`[data-dev="${op}"]`); return b && !b.disabled; }, 30, op); await tap(A, `[data-dev="${op}"]`); await A.waitForTimeout(800); return call('/api/dev/test', null, a.token); };
let s = await press('pair'); ck('Create test pair: two adult seahorses, paired by the game', s.stage.stage === 'paired', s.stage);
await A.screenshot({ path: `${OUT}/2_panel_paired.png` });
s = await press('pregnant'); ck('Start pregnancy: day 1 of a real 6–9 day pregnancy', s.stage.stage === 'pregnant' && s.stage.pregDay === 1 && s.stage.pregDays >= 6 && s.stage.pregDays <= 9, s.stage);
s = await press('preg3'); ck('Advance to day 3', s.stage.pregDay === 3, s.stage);
const pouch = (p) => p.evaluate(() => { const m = window.__fishes.list.find((f) => f.rec?.preg); return m ? +(m.brood ?? 0).toFixed(2) : -1; });
const p3 = await until(A, () => { const m = window.__fishes.list.find((f) => f.rec?.preg); return m && m.brood > 0.2 ? +m.brood.toFixed(2) : null; });
s = await press('preg6'); const p6a = await until(A, () => { const m = window.__fishes.list.find((f) => f.rec?.preg); return m && m.brood > 0.5 ? +m.brood.toFixed(2) : null; }), p6b = await until(B, () => { const m = window.__fishes.list.find((f) => f.rec?.preg); return m && m.brood > 0.5 ? +m.brood.toFixed(2) : null; });
ck('Advance to day 6: the pouch is fuller, the same on both phones', s.stage.pregDay === 6 && p6a > p3 && Math.abs(p6a - p6b) < 0.05, { day: s.stage.pregDay, p3, p6a, p6b });
await A.evaluate(() => window.__ui.open('tank')); await A.screenshot({ path: `${OUT}/3_day6.png` });
s = await press('birth'); await A.evaluate(() => window.__ui.open('tank'));
const birthA = await until(A, () => window.__nursery?.id && window.__sawBirth), birthB = await until(B, () => window.__nursery?.id && window.__sawBirth);
ck('Trigger birth: both phones see it, from one birth on the server', s.stage.stage === 'nursery' && birthA && birthA === birthB, { a: birthA, b: birthB });
await until(A, () => window.__nursery.fry.filter((f) => f.out).length >= 4, 90); await A.screenshot({ path: `${OUT}/4_birth.png` });
const kids = await until(B, () => window.__fishes.list.filter((f) => f.nursery).map((f) => f.role).join() || null);
ck('the nursery: the three tracked babies (explorer, plant-lover, social) and the swarm, on the other phone too', kids === 'explore,plants,social' && (await B.evaluate(() => window.__nursery.fry.length)) >= 7, kids);
s = await press('nurs2'); ck('Advance nursery to day 2', s.stage.nurseryDay === 2, s.stage); s = await press('nurs4'); ck('Advance nursery to day 4', s.stage.nurseryDay === 4, s.stage);
await A.evaluate(() => window.__ui.open('tank')); await B.evaluate(() => window.__ui.open('tank'));
s = await press('ready'); await A.evaluate(() => window.__ui.open('tank'));
const ready = (p) => until(p, () => { const t = document.querySelector('#modal.on h2')?.textContent ?? ''; if (/READY/.test(t)) return true; if (t && !/KEEP/.test(t)) document.querySelector('#modal.on #mok')?.click(); return null; }, 120);
const [ra, rb] = await Promise.all([ready(A), ready(B)]); await A.screenshot({ path: `${OUT}/5_ready.png` });
const why = async (p) => p.evaluate(() => ({ modal: document.querySelector('#modal.on h2')?.textContent ?? null, tab: window.__ui?.tab ?? null, nursery: !!window.__game.state.nursery, ready: window.__game.state.nursery ? window.__game.now() >= window.__game.state.nursery.readyAt : null }));
ck("Ready to choose: THEY'RE READY comes up on both phones, the player's own screen", ra && rb && s.stage.stage === 'ready', { ra, rb, a: ra ? null : await why(A), b: rb ? null : await why(B) });
// both choose at the same moment, different babies
await Promise.all([tap(A, '#modal [data-i="0"]'), tap(B, '#modal [data-i="1"]')]); await Promise.all([until(A, () => /KEEP/.test(document.querySelector('#modal.on h2')?.textContent ?? '')), until(B, () => /KEEP/.test(document.querySelector('#modal.on h2')?.textContent ?? ''))]);
await A.screenshot({ path: `${OUT}/6_confirm.png` });
await Promise.all([tap(A, '#mok'), tap(B, '#mok')]);
const done = async (p) => until(p, () => { const s = window.__game.state; return s.nursery === null && s.lastDepart ? { kept: s.fish.filter((f) => f.bornHere).map((f) => f.id), dep: s.lastDepart.nursery, departed: window.__departed ?? null } : null; }, 120);
const [da, db] = await Promise.all([done(A), done(B)]);
ck('exactly one baby stays, the same on both phones', da?.kept.length === 1 && JSON.stringify(da.kept) === JSON.stringify(db?.kept), { da, db });
ck('the others leave on each phone, from the one record', da?.departed === da?.dep && db?.departed === db?.dep, { a: da?.departed, b: db?.departed });
await A.waitForTimeout(1500); await A.screenshot({ path: `${OUT}/7_departing.png` });
await B.reload(); await until(B, () => window.__game?.state); await B.waitForTimeout(3000);
ck('after a reload it does not leave again, and still one baby', await B.evaluate(() => !window.__departed && !window.__nursery?.going && window.__game.state.fish.filter((f) => f.bornHere).length === 1));
// reset, then back to the real tank
await panel(A); A.once('dialog', () => {}); await tap(A, '#devreset'); await until(A, () => /RESET TEST/.test(document.querySelector('#modal.on h2')?.textContent ?? '')); await tap(A, '#mok');
ck('Reset test aquarium: clean on both phones', !!(await until(B, () => window.__game.state.fish.length === 0 && !window.__game.state.nursery)));
await A.evaluate(() => { localStorage.setItem('ourtank.devfast', '0'); localStorage.removeItem('ourtank.testAq'); location.reload(); }); await until(A, () => window.__game?.state && window.__game.mode === 'net');
const realAfter = await call('/api/export', null, a.token);
const realTx = S.db.prepare('SELECT type, COUNT(*) n FROM transactions WHERE tank_id=? GROUP BY type').all(home.id).map((r) => r.type).sort();      // what was ever done in the real tank
ck('back in the real tank, untouched', (await A.evaluate(() => !window.__game.test && document.getElementById('testb').hidden && window.__game.code)) === home.code && JSON.stringify(realAfter.world.fish.map((f) => [f.id, f.name, f.species])) === JSON.stringify(realBefore.world.fish.map((f) => [f.id, f.name, f.species])) && !realAfter.world.nursery && !realAfter.world.fish.some((f) => f.species === 'seahorse') && realTx.every((t) => !['devSea', 'keepBaby', 'feed'].includes(t)) && realAfter.journal.slice(realBefore.journal.length).every((j) => /gift|shell|^Time capsule: day|^\d+ days with/i.test(j.text ?? '')), { realTx, shells: [realBefore.world.shells, realAfter.world.shells], added: realAfter.journal.slice(realBefore.journal.length).map((j) => j.text) });      // (only the daily gift the drill claims there, and the tank's own clock: a time capsule, an anniversary)      // (shells may move by the daily gift the drill claims there, nothing else)
ck('the phone never kept the test aquarium as its copy of its tank', await A.evaluate((c) => { const k = JSON.parse(localStorage.getItem('ourtank.cache') || 'null'); return !k || k.code === c; }, home.code));
ck('no page errors', errors.length === 0, errors.slice(0, 4));
console.log(fails ? `${fails} failed` : 'Developer lifecycle checks passed'); await br.close(); await S.close(); process.exit(fails ? 1 : 0);

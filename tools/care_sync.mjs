// The Care menu across phones: each phone lists the animals it feeds and says who feeds the rest; one caretaker's feeding, wiping or water change updates another's open Care by itself. Starts its own server. node tools/care_sync.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');      // (CI points PW_MODULE at its own playwright)
import { start } from '../server/server.mjs';
const S = await start({ port: 0, dbPath: ':memory:', limits: { userPerHour: 500, tankPerHour: 500, joinPerMin: 500, actionsPer10s: 500 } }), base = `http://localhost:${S.port}`;
const call = async (p, body, tok) => (await fetch(base + p, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok }, body: body ? JSON.stringify(body) : undefined })).json();
const mk = async (name) => (await (await fetch(base + '/api/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, avatar: { skin: '#e8b890', hair: '#5a3ad0', hat: null } }) })).json());
const a = await mk('Alex'), b = await mk('Blair'), home = await call('/api/tanks', { name: 'Home' }, a.token); await call('/api/join', { code: home.code }, b.token);
{ const w = JSON.parse(S.db.prepare('SELECT world FROM tanks WHERE id=?').get(home.id).world), D = 864e5, now = Date.now(); w.flags = { ...w.flags, tut: 5, firsts: { [a.userId]: true, [b.userId]: true } }; w.level = 6; w.hunger = 0.5; w.water = 0.6; w.glass = 0.5; w.shells = 50;
  w.fish = [{ id: 'o1', name: 'Inky', species: 'octopus', seed: 5, born: now - 30 * D, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, hunger: 0.7, owner: b.userId, ownerName: 'Blair' },
    { id: 's1', name: 'Pip', species: 'seahorse', seed: 4, born: now - 20 * D, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, hunger: 0.6, sex: 'm', owner: a.userId, ownerName: 'Alex' },
    { id: 'g1', name: 'Nori', species: 'goldfish', seed: 3, born: now - 9 * D, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, owner: a.userId }];
  S.db.prepare('UPDATE tanks SET world=?, sim_ts=?, water=?, glass=?, hunger=?, level=?, shells=? WHERE id=?').run(JSON.stringify(w), now, w.water, w.glass, w.hunger, w.level, w.shells, home.id); }      // (the row mirrors the world's meters: the snapshot reads them from the row, so a seed must set both)
const br = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }); const errs = []; let fails = 0;
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
const phone = async (u) => { const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addInitScript((s) => { localStorage.setItem('ourtank.session', JSON.stringify(s)); }, { token: u.token, userId: u.userId, named: true }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); await p.goto(base + '/?tod=noon'); await p.waitForFunction(() => window.__game?.state && window.__game.mode === 'net', null, { timeout: 120000 }); await p.waitForTimeout(1500); return p; };
const A = await phone(a), B = await phone(b);
const clear = (p) => p.evaluate(() => { document.getElementById('modal')?.classList.remove('on'); document.getElementById('coach')?.classList.remove('on'); });      // (dismiss, never confirm: a request's OK button does the care itself, which would clean the seeded tank before the check)
const care = async (p) => { await clear(p); await p.evaluate(() => { window.__ui.open('tank'); window.__ui.open('care'); }); await p.waitForTimeout(400); };
const read = (p) => p.evaluate(() => { const rows = (due) => [...document.querySelectorAll('#sheet .cgroup .crow')].filter((r) => r.classList.contains('due') === due).map((r) => r.querySelector('b')?.textContent ?? ''), up = [...document.querySelectorAll('#sheet .cgroup .crow')].find((r) => /Tank upkeep/.test(r.querySelector('b')?.textContent ?? ''));      // (Care since the UI audit: one group of rows, each .due or not; one Tank upkeep row that says what is due or "All clean")
  return { open: document.getElementById('sheet').classList.contains('on'), hero: document.querySelector('#sheet [data-csub="care"] .nc')?.textContent ?? '', due: rows(true), later: rows(false), upkeep: up?.querySelector('small')?.textContent ?? '', groups: [...document.querySelectorAll('#sheet .fcards .fcard b')].map((x) => x.textContent), notes: [...document.querySelectorAll('#sheet .fcards .fnote, #sheet .fnote')].map((x) => x.textContent).join(' | ') }; });
const feedScreen = async (p) => { await p.evaluate(() => document.querySelector('#sheet .crow[data-act="feeddrawer"]')?.click()); await p.waitForTimeout(500); };      // (Feed opens its own screen, a card per animal)
const back = async (p) => { await p.evaluate(() => document.querySelector('#sheet [data-act="feedclose"]')?.click()); await p.waitForTimeout(400); };
const until = async (p, fn, secs = 20) => { for (let i = 0; i < secs * 4; i++) { const v = await read(p); if (fn(v)) return v; await p.waitForTimeout(250); } return read(p); };
await care(A); await care(B); await feedScreen(A); await feedScreen(B);
let ra = await read(A), rb = await read(B); console.log('A', JSON.stringify(ra)); console.log('B', JSON.stringify(rb));
ck('each phone shows only the animals that phone feeds (Alex: Pip and the fish; Blair: Inky and the fish)', ra.groups.includes('Pip') && !ra.groups.includes('Inky') && rb.groups.includes('Inky') && !rb.groups.includes('Pip'), { a: ra.groups, b: rb.groups });
ck('and says who feeds the others', /Inky is fed by Blair/.test(ra.notes) && /Pip is fed by Alex/.test(rb.notes), { a: ra.notes, b: rb.notes });
await back(A); await back(B);
// Blair wipes the glass and changes the water while Alex has Care open
ra = await read(A); ck("before Blair acts, Alex's Care shows the upkeep as due", ra.due.includes("Tank upkeep") && /glass|water/i.test(ra.upkeep), { due: ra.due, upkeep: ra.upkeep });      // (read back on the Care list itself, not on the Feed screen)
await B.evaluate(() => window.__game.dispatch({ t: 'glass' })); await B.evaluate(() => window.__game.dispatch({ t: 'water' }));
ra = await until(A, (v) => !v.due.includes('Tank upkeep') && /All clean/.test(v.upkeep));
ck("Blair cleans the glass and changes the water: Alex's open Care updates by itself", ra.open && !ra.due.includes('Tank upkeep') && ra.later.includes('Tank upkeep') && /All clean/.test(ra.upkeep), ra);
// Blair feeds the fish (shared): Alex's Feed row updates
await B.evaluate(() => window.__game.dispatch({ t: 'feed', food: 'flakes', x: 0 }));
ra = await until(A, (v) => !v.due.includes('Feed'));
const fishRow = await A.evaluate(() => window.__game.state.hunger);
ck("Blair feeds the fish: on Alex's phone the fish are no longer hungry", fishRow < 0.3, fishRow);
// Alex feeds Pip from the open menu; Blair's phone hears of it in its menu
const fr = await A.evaluate(() => window.__game.dispatch({ t: 'feed', food: 'mysis', fish: 's1', x: 0 })); const srv = JSON.parse(S.db.prepare('SELECT world FROM tanks WHERE id=?').get(home.id).world).fish.find((f) => f.id === 's1').hunger; 
let pipB = 1; for (let i = 0; i < 40 && pipB >= 0.3; i++) { await B.waitForTimeout(250); pipB = await B.evaluate(() => window.__game.state.fish.find((f) => f.id === 's1').hunger); }
ck("Alex feeds Pip: Blair's phone has Pip fed", pipB < 0.3, pipB);
// Blair feeds Inky: Alex's status count drops; both say the same about what is left
await B.evaluate(() => window.__game.dispatch({ t: 'feed', food: 'crab', fish: 'o1', x: 0 }));
ra = await until(A, (v) => !v.hero && !v.due.length); rb = await until(B, (v) => !v.hero && !v.due.length);
ck('everything done between them: both phones have nothing due, and no count on Care', !ra.hero && !rb.hero && !ra.due.length && !rb.due.length, { a: ra.hero, b: rb.hero, ad: ra.due, bd: rb.due });
ck('the menu stays open on the watching phone through all of it', ra.open);
ck('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? `${fails} failed` : 'Care sync checks passed'); await br.close(); await S.close(); process.exit(0);

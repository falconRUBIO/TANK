// Shared-tank checks for the check-in tab and the arrival countdown. Needs the dev server: PORT=8124 DB=/tmp/x.db DEV=1 node server/server.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const base = process.env.BASE || 'http://localhost:8124';
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
const api = async (p, body, token) => (await fetch(base + p, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined })).json();
const u = await api('/api/users', { name: 'Alex', avatar: { skin: '#e8b890', hair: '#5a3ad0', hat: null } }); const tank = await api('/api/tanks', { name: 'Reef' }, u.token);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.addInitScript((s) => localStorage.setItem('ourtank.session', JSON.stringify(s)), { token: u.token, userId: u.userId });
await p.goto(base + '/?lite=1&dev=1'); await p.waitForFunction(() => window.__game?.state, null, { timeout: 30000 }); await p.waitForTimeout(1500);
let intro = null;
for (let i = 0; i < 4; i++) { if (await p.$('#modal.on .pk')) { intro = { cards: (await p.$$('#modal .pk')).length, preselected: await p.evaluate(() => document.querySelector('#modal .pk.on')?.dataset.k) }; await p.click('#modal .pk[data-k=seahorse]'); }
  if (await p.$('#modal.on')) { await p.evaluate(() => { const i = document.querySelector('#modal input'); if (i) { i.value = 'Pip'; i.dispatchEvent(new Event('input')); } document.getElementById('mok')?.click(); }); await p.waitForTimeout(700); } }
const S = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__game.state)));
ck('the opening offers four free fish, goldfish preselected', intro?.cards === 4 && intro?.preselected === 'goldfish', JSON.stringify(intro));
ck('the chosen fish is what arrives, with the chosen name', (await S()).fish[0].species === 'seahorse' && (await S()).fish[0].name === 'Pip', JSON.stringify((await S()).fish.map((f) => [f.species, f.name])));
// the check-in tab
ck('four tabs in the bottom bar', (await p.$$('nav [data-tab]')).length === 4);
await p.click('nav [data-tab=care]', { force: true }); await p.waitForTimeout(500);
const txt = await p.evaluate(() => document.getElementById('sheet')?.innerText ?? document.querySelector('.sheet')?.innerText ?? '');
ck('Today shows what to do and what is coming up; shells are explained from the shell counter', /WORTH DOING NOW/i.test(txt) && !/How do I earn shells/i.test(txt) && (await (async () => { await p.click('#pill'); await p.waitForTimeout(300); const t2 = await p.textContent('#modal'); await p.click('#mok'); return /HOW SHELLS ARE EARNED/i.test(t2) && /Feed hungry fish/.test(t2); })()), txt.slice(0, 80).replace(/\n/g, ' | '));
ck('it names a daily wish or the coming-up list', /COMING UP/i.test(txt));
await p.click('nav [data-tab=care]', { force: true }); await p.waitForTimeout(300);
// an order that is due must arrive on a connected phone and the countdown must move
await p.evaluate(() => window.__game.dispatch({ t: 'buyFish', species: 'goldfish', name: 'Test', seed: 7 }));
await p.waitForTimeout(800); let s = await S(); ck('the order is on its way', s.orders.length === 1, s.orders.length);
const goal1 = await p.textContent('#goal'); await p.waitForTimeout(2200); const goal2 = await p.textContent('#goal'); console.log('   pill:', goal1, '->', goal2);
// make the order overdue on the server (as if the phone had been asleep when it was due), then the connected phone must catch up on its own
const before = (await S()).fish.length; const { DatabaseSync } = await import('node:sqlite'); const db = new DatabaseSync(process.env.DB || '/tmp/ot_demo.db');
const row = db.prepare('SELECT id, world FROM tanks WHERE code=?').get(tank.code); const w = JSON.parse(row.world); w.orders[0].arrivesAt = Date.now() - 90e3; db.prepare('UPDATE tanks SET world=? WHERE id=?').run(JSON.stringify(w), row.id); db.close();
let arrived = false; for (let i = 0; i < 60 && !arrived; i++) { await p.waitForTimeout(1000); arrived = (await S()).fish.length > before; }
ck('the overdue fish arrives on the connected phone without reopening the app', arrived, `${before} -> ${(await S()).fish.length}`);
const eta = await p.evaluate(() => { const o = document.querySelector('.orders'); return o ? o.innerText : ''; });
ck('no stale "1 min" is left behind', !/1 min/.test(await p.textContent('#goal')), await p.textContent('#goal'));
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); if (errors.length) fails++;
await b.close(); console.log(fails ? 'FAILED' : 'Today checks passed'); process.exit(fails ? 1 : 0);

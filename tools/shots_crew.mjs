// The Crew tab in a real shared tank with two players, some activity and a couple of messages: a full-length screenshot of each part.
// Needs the dev server on 8124 (PORT=8124 DB=/tmp/x.db DEV=1 node server/server.mjs). OUT=dir node tools/shots_crew.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');      // (CI points PW_MODULE at its own playwright)
import fs from 'node:fs';
const out = process.env.OUT || '/tmp/crew', base = 'http://localhost:8124'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const errors = []; const mk = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errors.push(e.message)); return p; };
const A = await mk(); await A.goto(base + '/?q=0'); await A.waitForSelector('#welcome.on', { timeout: 60000 });
await A.click('[data-a=create]'); await A.fill('#nm', 'Ana'); await A.click('#go'); await A.waitForSelector('.codebig', { timeout: 30000 });
const code = (await A.textContent('.codebig')).replace(/\s/g, ''); await A.click('#en');
await A.waitForSelector('#modal.on #mok', { timeout: 60000 }); await A.evaluate(() => document.querySelector('#modal.on #mok').click()); await A.waitForTimeout(2000);
const B = await mk(); await B.goto(base + '/join/' + code + '?q=0'); await B.waitForSelector('#welcome.on', { timeout: 60000 });
await B.waitForSelector('.pvt, #cd, #nm', { timeout: 20000 }); if (!(await B.$('.pvt')) && !(await B.$('#nm'))) { await B.fill('#cd', code); await B.click('#go'); } if (!(await B.$('#nm'))) { await B.waitForSelector('.pvt', { timeout: 20000 }); await B.click('#go'); }
await B.waitForSelector('#nm', { timeout: 30000 }); await B.fill('#nm', 'Ben'); await B.click('#go');
for (let i = 0; i < 40; i++) { await B.waitForTimeout(500); const t = await B.evaluate(() => document.querySelector('#modal.on h2')?.textContent ?? ''); if (/YOUR OWN OCTOPUS/i.test(t)) { await B.evaluate(() => document.querySelector('#modal.on #mok').click()); break; } else if (t) await B.evaluate(() => document.querySelector('#modal.on #mok')?.click()); }
await B.waitForTimeout(2500);
// a little life in the tank: Ben feeds, wipes the glass, both say something
for (const [p, a] of [[B, { t: 'feed', food: 'crab' }], [B, { t: 'glass' }], [A, { t: 'note', text: 'The octopus moved its shell again!' }]]) await p.evaluate((a) => window.__game.dispatch(a), a).catch(() => {});
// messages go through the Crew tab's own box, the way a player sends one
for (const [p, txt] of [[A, 'Morning! Inky is hiding under the coconut'], [B, 'Ha, mine just squirted water at me']]) { await p.evaluate(() => { document.querySelectorAll('#coach,#toast,#settle,#reunion,#modal').forEach((e) => e.classList.remove('on')); window.__ui.open('friends'); }); await p.waitForTimeout(500); await p.fill('form.feedsend input', txt); await p.evaluate(() => document.querySelector('form.feedsend').requestSubmit()); await p.waitForTimeout(700); }
await A.waitForTimeout(2500);
await A.evaluate(() => { document.querySelectorAll('.ncbtn .cancel').forEach((e) => e.click()); document.querySelectorAll('#modal').forEach((e) => e.classList.remove('on', 'party')); document.querySelectorAll('#goal,#coach,#toast,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); window.__ui.open('friends'); }); await A.waitForTimeout(800);
const H = await A.evaluate(() => { const s = document.getElementById('sheet'); return s ? s.scrollHeight : 0; });
console.log('sheet height', H, 'sections', await A.evaluate(() => [...document.querySelectorAll('#sheet h3, #sheet h4, #sheet .code small, #sheet .wish small')].map((e) => e.textContent).join(' | ')));
for (let y = 0, k = 0; y < H && k < 5; y += 600, k++) { await A.evaluate((y) => { document.getElementById('sheet').scrollTop = y; }, y); await A.waitForTimeout(300); await A.screenshot({ path: `${out}/crew_${k}.png` }); }
// the code and invites now live in Settings
await A.evaluate(() => { document.querySelector('[data-sub=settings]')?.click(); }); await A.waitForTimeout(600); await A.evaluate(() => { const r = [...document.querySelectorAll('#sheet .row2')].find((x) => /Tank code/.test(x.textContent)); r?.scrollIntoView({ block: 'center' }); }); await A.waitForTimeout(300); await A.screenshot({ path: `${out}/settings_tank.png` });
console.log('settings has the code', await A.evaluate(() => [...document.querySelectorAll('#sheet .row2')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()).filter((t) => /Tank|Invite|code/.test(t))));
console.log('friends tab has no code box', await A.evaluate(() => { document.querySelector('[data-sub=friends]')?.click(); return !document.querySelector('#sheet .code'); }));
// Collection: each phone sees the fish in the tank; Ben cannot sell Ana's octopus, and Ana, the tank's first caretaker, can sell Ben's
const book = async (p) => { await p.evaluate(() => { document.querySelectorAll('#modal').forEach((e) => e.classList.remove('on')); window.__ui.open('book'); }); await p.waitForTimeout(600); return p.evaluate(() => [...document.querySelectorAll('#sheet .itf')].map((x) => x.textContent)); };
const bl = await book(B), al = await book(A); await A.bringToFront(); await A.screenshot({ path: `${out}/collection_ana.png` }).catch(() => console.log('no picture of Ana\'s phone')); await B.bringToFront(); await B.screenshot({ path: `${out}/collection_ben.png` }).catch(() => console.log("no picture of Ben's phone")); await A.bringToFront();
console.log('Ben sees', JSON.stringify(bl)); console.log('Ana sees', JSON.stringify(al));
const benOcto = await A.evaluate(() => window.__game.state.fish.find((f) => f.species === 'octopus' && f.ownerName === 'Ben')?.id);
console.log('Ben cannot sell Ana\'s octopus', bl.some((t) => /Ana's.*Theirs$/.test(t)), '· Ana can sell Ben\'s', al.some((t) => /Ben's.*Sell$/.test(t)));
await A.evaluate((id) => window.__ui.sellFish(id), benOcto); await A.waitForTimeout(400); console.log('Ana is asked', JSON.stringify(await A.evaluate(() => document.getElementById('modal')?.textContent.replace(/\s+/g, ' ').trim()))); await A.screenshot({ path: `${out}/sell_others.png` });
await A.click('#mok'); await A.waitForTimeout(2500);
console.log('after the sale, fish on each phone', JSON.stringify(await A.evaluate(() => window.__game.state.fish.map((f) => f.name))), JSON.stringify(await B.evaluate(() => window.__game.state.fish.map((f) => f.name))), 'journal', JSON.stringify(await B.evaluate(() => window.__game.journal.slice(-1).map((e) => e.text))));
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

// A message in a bottle, end to end on two phones: written in the Crew box, tossed in, dropped into the other tank (floats at the surface), opened as a letter, sinks away; the sender hears it was found.
// Needs the dev server on 8124 (PORT=8124 DB=/tmp/x.db DEV=1 node server/server.mjs). OUT=dir node tools/bottle_check.mjs
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
await B.waitForFunction(() => window.__game?.state?.notes, null, { timeout: 60000 });
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
const clear = (p) => p.evaluate(() => document.querySelectorAll('#coach,#toast,#settle,#reunion,#modal').forEach((e) => e.classList.remove('on')));
await A.evaluate(() => { window.__toasts = []; const o = window.__ui.toast; window.__ui.toast = (t, ...r) => { window.__toasts.push(t); return o(t, ...r); }; });
await clear(A); await A.evaluate(() => window.__ui.open('friends')); await A.waitForTimeout(800);
await A.evaluate(() => document.querySelector('.cmode [data-mode="bottle"]').click()); await A.waitForTimeout(600);
await A.fill('.compose2 form.send input', 'You are the best tank buddy'); await A.waitForTimeout(800); await A.screenshot({ path: `${out}/compose.png` });
await A.evaluate(() => document.querySelector('.compose2 form.send').requestSubmit()); await A.waitForSelector('#modal.on .bletter.write', { timeout: 30000 }); await A.waitForTimeout(900); await A.screenshot({ path: `${out}/write.png` });
ck('the bottle letter opens with the words on it', (await A.inputValue('#bt')) === 'You are the best tank buddy');
await B.evaluate(() => { window.__ys = []; setInterval(() => { const q = window.__bottleSeen(); if (q.v) window.__ys.push(q.y); }, 150); }); await B.evaluate(() => { window.__ys = []; setInterval(() => { const q = window.__bottleSeen(); if (q.v) window.__ys.push(q.y); }, 150); }); await A.evaluate(() => document.querySelector('#modal.on #mok').click()); await A.waitForTimeout(700); await A.screenshot({ path: `${out}/toss.png` });
await clear(B); await B.evaluate(() => document.querySelector('nav [data-tab="tank"]')?.click());
await B.waitForTimeout(6000); const ys = await B.evaluate(() => window.__ys), y0 = Math.max(...ys), y1 = ys.at(-1);
await B.screenshot({ path: `${out}/arrived.png` }); ck('it drops into their tank and floats at the surface', y1 > 9.5 && y1 < 12 && Math.min(...ys) < y1, `top ${y0}, dipped to ${Math.min(...ys)}, floating at ${y1}`);
ck('the sender sees no bottle in their own tank', !(await A.evaluate(() => window.__bottleSeen().v)));
await B.waitForTimeout(3000); B.evaluate(() => window.__openBottle()); await B.waitForSelector('#modal.on .bletter', { timeout: 30000 }); await B.waitForTimeout(900); await B.screenshot({ path: `${out}/letter.png` });
ck('it opens as a letter from them', /You are the best tank buddy/.test(await B.textContent('#modal .bletter')) && /Ana/.test(await B.textContent('#modal .bletter')));
await B.evaluate(() => { window.__ys = []; }); await B.click('#modal.on #mno'); await B.waitForTimeout(4800); { const ys = await B.evaluate(() => window.__ys); ck('then it fills with water and sinks away', Math.min(...ys) < ys[0] - 3, `sank from ${ys[0]} to ${Math.min(...ys)}`); } await B.waitForTimeout(1500); ck('and is gone', !(await B.evaluate(() => window.__bottleSeen().v)));
await A.waitForFunction(() => window.__toasts.some((t) => /found your bottle/.test(t)), null, { timeout: 10000 }).catch(() => null); ck('the sender hears it was found', await A.evaluate(() => window.__toasts.some((t) => /found your bottle/.test(t))), JSON.stringify(await A.evaluate(() => window.__toasts)));
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Bottle checks passed'); process.exit(fails ? 1 : 0);

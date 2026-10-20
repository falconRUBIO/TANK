// A note through the Crew box (Note on the glass), read on the other phone, then stamped SEEN and peeled off the writer’s glass by itself; it stays on the reader’s glass until they tap it.
// Needs the dev server on 8124 (PORT=8124 DB=/tmp/x.db DEV=1 node server/server.mjs). OUT=dir node tools/notes_seen.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');      // (CI points PW_MODULE at its own playwright)
import fs from 'node:fs';
const out = process.env.OUT || '/tmp/crew', base = 'http://localhost:8124'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const errors = []; const mk = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errors.push(e.message)); return p; };
const A = await mk(); await A.goto(base + '/?q=0'); await A.waitForSelector('#welcome.on', { timeout: 60000 });
await A.click('[data-a=create]'); await A.fill('#nm', 'Ana'); await A.click('#go'); await A.waitForSelector('.codebig', { timeout: 30000 });
const code = (await A.textContent('.codebig')).replace(/\s/g, ''); await A.click('#en');
await A.waitForSelector('#modal.on #mok', { timeout: 60000 }); await A.click('#modal.on #mok'); await A.waitForTimeout(2000);
const B = await mk(); await B.goto(base + '/join/' + code + '?q=0'); await B.waitForSelector('#welcome.on', { timeout: 60000 });
await B.waitForSelector('.pvt, #cd, #nm', { timeout: 20000 }); if (!(await B.$('.pvt')) && !(await B.$('#nm'))) { await B.fill('#cd', code); await B.click('#go'); } if (!(await B.$('#nm'))) { await B.waitForSelector('.pvt', { timeout: 20000 }); await B.click('#go'); }
await B.waitForSelector('#nm', { timeout: 30000 }); await B.fill('#nm', 'Ben'); await B.click('#go');
for (let i = 0; i < 40; i++) { await B.waitForTimeout(500); const t = await B.evaluate(() => document.querySelector('#modal.on h2')?.textContent ?? ''); if (/YOUR OWN OCTOPUS/i.test(t)) { await B.click('#modal.on #mok'); break; } else if (t) await B.click('#modal.on #mok').catch(() => {}); }
await B.waitForTimeout(2500);
await B.waitForFunction(() => window.__game?.state?.notes, null, { timeout: 60000 }); let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
const clear = (p) => p.evaluate(() => document.querySelectorAll('#coach,#toast,#settle,#reunion,#modal').forEach((e) => e.classList.remove('on')));
await B.evaluate(() => { window.__noteIdle = true; });      // Ben is signed in, but not looking at his phone
await A.evaluate(() => new MutationObserver(() => { if (document.querySelector('#glassnotes .seenst')) window.__sawSeen = document.querySelector('#glassnotes .seenst').textContent; }).observe(document.body, { subtree: true, childList: true })); await clear(A); await A.evaluate(() => window.__ui.open('friends')); await A.waitForTimeout(800);
await A.evaluate(() => document.querySelector('.cmode [data-mode="note"]').click()); await A.waitForTimeout(500);
await A.fill('.compose form.send input', 'Feed Inky tonight please'); await A.screenshot({ path: `${out}/compose_note.png` });
await A.evaluate(() => document.querySelector('.compose form.send').requestSubmit()); await A.waitForTimeout(1500); await A.waitForSelector('.notecomp.on textarea', { timeout: 20000 });
ck('the post-it opens with the words already on it', (await A.inputValue('.notecomp textarea')) === 'Feed Inky tonight please');
await A.click('.notecomp .stick'); await A.waitForTimeout(1500); await A.evaluate(() => document.querySelector('nav [data-tab="tank"]')?.click());
await clear(B); await B.evaluate(() => document.querySelector('nav [data-tab="tank"]')?.click()); await B.waitForSelector('#glassnotes .postit', { timeout: 15000 });
ck('the note is on the other phone’s glass', true);
await A.waitForTimeout(6000);
ck('signed in but not using the app: the note is not counted as seen', await B.evaluate(() => !(window.__game.state.notes ?? []).some((n) => (n.read ?? []).includes(window.__game.you.userId))));
await B.evaluate(() => { window.__noteIdle = false; }); await B.bringToFront(); await B.keyboard.press('Shift');      // (they pick the phone up and use it)
await A.evaluate(() => { document.querySelector('nav [data-tab="tank"]')?.click(); }); await A.waitForSelector('#glassnotes .postit .seenst', { timeout: 15000 }).catch(() => null);
await A.waitForFunction(() => window.__sawSeen, null, { timeout: 15000 }).catch(() => null); ck('the writer sees SEEN across it', !!(await A.evaluate(() => window.__sawSeen)), await A.evaluate(() => window.__sawSeen ?? ''));
await A.waitForTimeout(5000); ck('then it comes off the writer’s glass by itself', !(await A.$('#glassnotes .postit')));
await B.waitForTimeout(1000); ck('it stays on the reader’s glass until they tap it', !!(await B.$('#glassnotes .postit')));
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Note checks passed'); process.exit(fails ? 1 : 0);

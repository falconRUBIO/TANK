// End-to-end: real browser sessions create/join one tank over the live server.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const base = process.env.BASE || 'http://localhost:8124', out = process.env.OUT || '.';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const mk = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 760 } }); const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('pageerror:', e.message)); return p; };
const step = (m) => console.log('•', m);
const A = await mk(), B = await mk(), C = await mk(), D = await mk();
await A.goto(base + '/?lite=1'); await A.waitForSelector('text=CREATE A TANK'); await A.screenshot({ path: out + '/e1_welcome.png' });
await A.click('text=CREATE A TANK'); await A.fill('#nm', 'Alex'); await A.click('.sw[data-k=hair] button:nth-child(2)'); await A.click('#go');
await A.waitForSelector('.codebig'); const code = (await A.textContent('.codebig')).trim(); step('A created a tank, code ' + code); await A.screenshot({ path: out + '/e2_code.png' });
await A.click('#en'); await A.waitForTimeout(1500);

// B joins through the invitation link
await B.goto(base + '/join/' + code.toLowerCase() + '?lite=1'); await B.waitForSelector('.pvt');
await B.screenshot({ path: out + '/e3_preview.png' }); await B.click('#go'); await B.fill('#nm', 'Sam'); await B.click('#go'); await B.waitForTimeout(1500); step('B joined via the invite link');

// C joins by typing the code
await C.goto(base + '/?lite=1'); await C.waitForSelector('text=JOIN A TANK'); await C.click('text=JOIN A TANK'); await C.fill('#cd', code); await C.click('#go'); await C.waitForSelector('.pvt');
await C.click('#go'); await C.fill('#nm', 'Riley'); await C.click('#go'); await C.waitForTimeout(1500); step('C joined by typing the code');

// D is the fourth player
await D.goto(base + '/?lite=1'); await D.waitForSelector('text=JOIN A TANK'); await D.click('text=JOIN A TANK'); await D.fill('#cd', code); await D.click('#go');
await D.waitForSelector('text=THIS TANK IS FULL'); step('D (4th player) is shown THIS TANK IS FULL'); await D.screenshot({ path: out + '/e4_full.png' });
await D.click('#bk'); await D.click('text=JOIN A TANK'); await D.fill('#cd', 'ZZZZZZ'); await D.click('#go'); await D.waitForSelector('text=TANK NOT FOUND'); step('a bad code shows TANK NOT FOUND');

// shared live state
await A.click('[data-tab=care]'); await A.click('[data-act=feed]'); await A.mouse.click(200, 300); await B.waitForTimeout(1500);
step('B saw toast: ' + JSON.stringify(await B.textContent('#toast')));
step(`shells A / B / C: ${await A.textContent('#shells')} / ${await B.textContent('#shells')} / ${await C.textContent('#shells')}`);
await B.click('[data-tab=friends]'); await B.fill('.send input', 'hi from Sam'); await B.press('.send input', 'Enter'); await A.waitForTimeout(1000);
await A.click('[data-tab=friends]'); await A.waitForTimeout(500);
step('A sees chat: ' + JSON.stringify(await A.$$eval('.msg', (n) => n.map((x) => x.textContent))));
step('A friends tab members: ' + JSON.stringify(await A.$$eval('.slot b', (n) => n.map((x) => x.textContent))));
step('header slots on A: ' + (await A.$$eval('#avs .av', (n) => n.length)));
await A.screenshot({ path: out + '/e5_friends_A.png' }); await C.screenshot({ path: out + '/e6_C.png' });
await b.close();

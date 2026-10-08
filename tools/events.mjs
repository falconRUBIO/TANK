// Checks the pop-ups and small features that the main playthrough does not reach: level-up reveal, welcome back, photo.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 760 }, acceptDownloads: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto('http://localhost:8123/?lite=1&dev=1'); await p.waitForSelector('#modal.on #mok', { timeout: 60000 }); await p.click('#mok'); await p.waitForTimeout(600);
const d = (a) => p.evaluate((a) => window.__game.dispatch(a, { dev: true }), a);
await d({ t: 'tut', step: 5 }); await p.evaluate(() => document.getElementById('coach').classList.remove('on'));
const goal = async () => { await p.waitForTimeout(1200); return p.textContent('#goal'); };
let g = await goal(); ck('first steps: an empty tank points to Decorate', /Empty tank/.test(g), g);
await d({ t: 'buyDecor', type: 'grass', x: 0, z: 1.5, ry: 0 }); await d({ t: 'dev', what: 'shells' }); await d({ t: 'feed', x: 0 }); await d({ t: 'feed', x: 1 });
g = await goal(); ck('first steps: with a plant and shells it suggests a new fish', /adopt|Feed|hungry|spend|shells/i.test(g), g);
await d({ t: 'buyFish', species: 'goldfish', name: 'Pal', seed: 2 }); g = await goal(); ck('first steps: a pending delivery shows its countdown', /Pal arrives in/.test(g), g);
for (let i = 0; i < 3; i++) await d({ t: 'dev', what: 'shells' });
for (let i = 0; i < 4; i++) { await d({ t: 'buyFish', species: 'goldfish', name: 'G' + i, seed: i, rush: true }); }
await p.waitForTimeout(3500);
ck('level-up dialog lists the new unlocks', await p.evaluate(() => document.getElementById('modal').classList.contains('on') && /LEVEL 2/.test(document.getElementById('modal').textContent)), (await p.textContent('#modal')).slice(0, 120));
await p.click('#mok').catch(() => {});
const dl = p.waitForEvent('download', { timeout: 15000 }).catch(() => null);
await p.evaluate(() => window.__ui.open('care')); await p.click('[data-act=photo]'); const got = await dl;
ck('photo mode saves a picture', !!got || /Picture saved|save/i.test(await p.textContent('#toast')), got ? got.suggestedFilename() : await p.textContent('#toast'));
// welcome back
await d({ t: 'dev', what: 'drift' }); await p.evaluate(() => window.__game.save());
await p.addInitScript(() => localStorage.setItem('ourtank.seen.solo', String(Date.now() - 3 * 3600e3))); await p.reload(); await p.waitForSelector('#modal.on', { timeout: 30000 }).catch(() => {});
const txt = await p.textContent('#modal'); ck('welcome back mentions the gift', /washed in/i.test(txt), txt.slice(0, 160));
ck('no page errors', errs.length === 0, errs.join(' | ')); await b.close(); console.log(fails ? fails + ' FAILED' : 'events passed'); console.log('FINISHED');

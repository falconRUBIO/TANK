// The server forgets everything while two phones share a tank, and both phones open the app again. They must land back in ONE tank with the old code,
// each with their own octopus, nobody offered another one, and both in each other's crew. Needs the dev server: PORT=8124 DB=/tmp/x.db DEV=1 node server/server.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
const out = process.env.OUT || '/tmp/forget', base = 'http://localhost:8124', DB = process.env.DB || '/tmp/audit.db'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const errors = []; let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
const mk = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); p.on('pageerror', (e) => errors.push(e.message)); return p; };
const modalTitle = (p) => p.evaluate(() => document.querySelector('#modal.on h2')?.textContent ?? '');
const settle = async (p, wantOcto) => { let offered = false; for (let i = 0; i < 30; i++) { await p.waitForTimeout(500); const t = await modalTitle(p); if (/YOUR OWN OCTOPUS/.test(t)) { offered = true; if (wantOcto) await p.click('#modal.on #mok'); else break; } else if (t) await p.click('#modal.on #mok').catch(() => {}); } return offered; };
const me = (p) => p.evaluate(() => { const g = window.__game; return { code: g.code, members: (g.members ?? []).map((m) => m.name).sort(), fish: g.state.fish.map((f) => `${f.name}:${f.owner === g.you.userId ? 'mine' : g.members?.some((m) => m.id === f.owner) ? 'crew' : 'nobody'}`).sort() }; });
// the creator and a friend
const A = await mk(); await A.goto(base + '/?q=0'); await A.waitForSelector('#welcome.on', { timeout: 60000 });
await A.click('[data-a=create]'); await A.fill('#nm', 'Ana'); await A.click('#go'); await A.waitForSelector('.codebig', { timeout: 30000 });
const code = (await A.textContent('.codebig')).replace(/\s/g, ''); await A.click('#en'); await A.waitForSelector('#modal.on #mok', { timeout: 60000 }); await A.click('#modal.on #mok'); await A.waitForTimeout(1500);
const B = await mk(); await B.goto(base + '/join/' + code + '?q=0'); await B.waitForSelector('#welcome.on', { timeout: 60000 });
await B.waitForSelector('.pvt, #cd, #nm', { timeout: 20000 }); if (!(await B.$('.pvt')) && !(await B.$('#nm'))) { await B.fill('#cd', code); await B.click('#go'); } if (!(await B.$('#nm'))) { await B.waitForSelector('.pvt', { timeout: 20000 }); await B.click('#go'); }
await B.waitForSelector('#nm', { timeout: 30000 }); await B.fill('#nm', 'Ben'); await B.click('#go');
ck('the friend is offered an octopus', await settle(B, true)); await B.waitForTimeout(4000); await settle(A, false);
const before = [await me(A), await me(B)]; console.log('  before:', JSON.stringify(before));
ck('before: both in one tank with two octopuses', before[0].code === code && before[1].code === code && before[0].fish.length === 2 && before[1].fish.length === 2);
await A.waitForTimeout(2500);                                                                                   // the phones save their copies
// the server forgets everything
const db = new DatabaseSync(DB); db.exec('DELETE FROM members; DELETE FROM tanks; DELETE FROM users;'); db.close(); console.log('  (the server forgot every tank and player)');
const order = process.env.FRIEND_FIRST || process.env.LOST_CACHE ? [B, A] : [A, B];
if (process.env.LOST_CACHE) {                                                                                    // the creator's phone has lost its copy and sign-in (only the memory of who it was is left): it has to come back in through the friend's invitation
  await A.evaluate(async () => { localStorage.removeItem('ourtank.cache'); localStorage.removeItem('ourtank.session'); document.cookie = 'ourtank_s=; max-age=0; path=/'; const k = await import('/src/keep.js'); await k.idbPut('ourtank.cache', null); await k.idbPut('ourtank.session', null); });
  await B.reload(); await B.waitForFunction(() => window.__game?.state, null, { timeout: 60000 }); await B.waitForTimeout(2500); await settle(B, false);
  const mid = await me(B); console.log('  friend alone:', JSON.stringify(mid)); ck('the friend\'s phone put the tank back, with the creator\'s octopus waiting in it', mid.code === code && mid.fish.length === 2 && mid.fish.some((f) => f.endsWith('nobody')), JSON.stringify(mid.fish));
  await A.goto(base + '/join/' + code + '?q=0'); await A.waitForSelector('#welcome.on', { timeout: 60000 });
  await A.waitForSelector('.pvt, #cd, #nm', { timeout: 20000 }); if (!(await A.$('.pvt')) && !(await A.$('#nm'))) { await A.fill('#cd', code); await A.click('#go'); } if (!(await A.$('#nm'))) { await A.waitForSelector('.pvt', { timeout: 20000 }); await A.click('#go'); }
  await A.waitForSelector('#nm', { timeout: 30000 }); await A.fill('#nm', 'Ana'); await A.click('#go'); await A.waitForFunction(() => window.__game?.state, null, { timeout: 60000 }); await A.waitForTimeout(2500);
} else for (const p of order) { await p.reload(); await p.waitForFunction(() => window.__game?.state, null, { timeout: 60000 }); await p.waitForTimeout(2500); }
const offers = [await settle(A, false), await settle(B, false)];
const after = [await me(A), await me(B)]; console.log('  after:', JSON.stringify(after));
await A.screenshot({ path: `${out}/after_A.png` }); await B.screenshot({ path: `${out}/after_B.png` });
ck('after: both phones are back in a tank with the old code', after[0].code === code && after[1].code === code, after.map((x) => x.code).join(' / '));
ck('one tank, not two: each sees the other in the crew', after[0].members.join() === 'Ana,Ben' && after[1].members.join() === 'Ana,Ben', JSON.stringify(after.map((x) => x.members)));
ck('two octopuses, no stray third one', after[0].fish.length === 2 && after[1].fish.length === 2 && after[0].fish.every((f) => !f.endsWith('nobody')), JSON.stringify(after[0].fish));
ck('each phone has its own octopus back', after[0].fish.filter((f) => f.endsWith('mine')).length === 1 && after[1].fish.filter((f) => f.endsWith('mine')).length === 1);
ck('nobody is offered another octopus', !offers[0] && !offers[1]);
ck('no page errors', errors.length === 0, errors.join('; '));
console.log(fails ? `${fails} failed` : 'Forget drill passed'); await b.close(); process.exit(fails ? 1 : 0);

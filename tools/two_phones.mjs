// Two phones side by side: the creator makes a tank and picks an octopus, a friend joins and must be offered an octopus of their own,
// both phones must then show the same octopuses in the same places, and nothing pops up while a new octopus drops in.
// Needs the dev server: PORT=8124 DB=/tmp/two.db DEV=1 node server/server.mjs ; OUT=dir node tools/two_phones.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = process.env.OUT || '/tmp/two', base = 'http://localhost:8124'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const errors = []; let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
const mk = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); p.on('pageerror', (e) => errors.push(e.message)); return p; };
const shot = (p, n) => p.screenshot({ path: `${out}/${n}.png` });
const popups = (p) => p.evaluate(() => ['coach', 'toast', 'settle', 'reunion'].filter((id) => document.getElementById(id)?.classList.contains('on')));
// the creator
const A = await mk(); await A.goto(base + '/?q=1'); await A.waitForSelector('#welcome.on', { timeout: 60000 });
await A.click('[data-a=create]'); await A.fill('#nm', 'Ana'); await A.click('#go'); await A.waitForSelector('.codebig', { timeout: 30000 });
const code = (await A.textContent('.codebig')).replace(/\s/g, ''); await A.click('#en');
await A.waitForSelector('#modal.on #mok', { timeout: 60000 }); await A.click('#modal.on #mok');
await A.waitForTimeout(1500); const quietA = await popups(A); await shot(A, '1_creator_octopus_drops');
ck('nothing pops up while the first octopus drops in', quietA.length === 0, quietA.join(','));
await A.waitForTimeout(10500); ck('the first tip comes after the quiet moment', (await popups(A)).includes('coach'));
// like the real tank: one the server once lost and the phone put back (that used to stop friends ever being offered an octopus)
if (process.env.DB) { const { DatabaseSync } = await import('node:sqlite'); const db = new DatabaseSync(process.env.DB); const row = db.prepare('SELECT id, world FROM tanks WHERE code=?').get(code); const w = JSON.parse(row.world); w.flags.healed = Date.now(); db.prepare('UPDATE tanks SET world=? WHERE id=?').run(JSON.stringify(w), row.id); db.close(); console.log('  (the tank is marked as put back)'); }
// the friend
const B = await mk(); await B.goto(base + '/join/' + code + '?q=1'); await B.waitForSelector('#welcome.on', { timeout: 60000 });
if (await B.$('.pvt')) await B.click('#go'); else { await B.fill('#cd', code); await B.click('#go'); await B.waitForSelector('.pvt'); await B.click('#go'); }
await B.waitForSelector('#nm', { timeout: 30000 }); await B.fill('#nm', 'Ben'); await B.click('#go');
// a daily gift or welcome card may show first; the octopus offer must still come once it is out of the way
let offered = false; for (let i = 0; i < 40 && !offered; i++) { await B.waitForTimeout(500); const t = await B.evaluate(() => document.querySelector('#modal.on h2')?.textContent ?? ''); if (/YOUR OWN OCTOPUS/.test(t)) offered = true; else if (t) await B.click('#modal.on #mok').catch(() => {}); }
await shot(B, '2_friend_offer'); ck('the friend is offered an octopus of their own', offered);
if (offered) { await B.click('#modal.on .pk[data-pal="3"]').catch(() => {}); await B.click('#modal.on #mok'); }
await B.waitForTimeout(1500); const quietB = await popups(B); await shot(B, '3_friend_octopus_drops'); ck('nothing pops up on the friend\'s phone while it drops in', quietB.length === 0, quietB.join(','));
await B.waitForTimeout(8000);
const fishOf = (p) => p.evaluate(() => window.__game.state.fish.map((f) => `${f.name}:${f.species}:${f.owner === window.__game.you.userId ? 'mine' : 'theirs'}`).sort());
const fa = await fishOf(A), fb = await fishOf(B);
ck('both phones have two octopuses', fa.length === 2 && fb.length === 2, JSON.stringify({ fa, fb }));
ck('each phone knows which one is its own', fa.filter((x) => x.endsWith('mine')).length === 1 && fb.filter((x) => x.endsWith('mine')).length === 1);
// side by side: where each octopus is on both screens
let worst = 0; for (let i = 0; i < 6; i++) {
  await A.waitForTimeout(1500);
  const pos = async (p) => p.evaluate(() => Object.fromEntries((window.__fishes?.list ?? []).map((f) => [f.fid, [f.pos.x, f.pos.y]])));
  const [pa, pb] = await Promise.all([pos(A), pos(B)]); for (const id of Object.keys(pa)) if (pb[id]) worst = Math.max(worst, Math.hypot(pa[id][0] - pb[id][0], pa[id][1] - pb[id][1]));
}
await shot(A, '4_side_A'); await shot(B, '4_side_B');
ck('side by side, every octopus is in the same place on both phones', worst < 0.8, 'biggest gap ' + worst.toFixed(2) + ' tank units');
ck('no page errors', errors.length === 0, errors.join('; '));
console.log(fails ? `${fails} failed` : 'Two-phone checks passed'); await b.close(); process.exit(fails ? 1 : 0);

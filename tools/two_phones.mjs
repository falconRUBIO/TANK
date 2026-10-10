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
const A = await mk(); await A.goto(base + '/?q=0'); await A.waitForSelector('#welcome.on', { timeout: 60000 });
await A.click('[data-a=create]'); await A.fill('#nm', 'Ana'); await A.click('#go'); await A.waitForSelector('.codebig', { timeout: 30000 });
const code = (await A.textContent('.codebig')).replace(/\s/g, ''); await A.click('#en');
await A.waitForSelector('#modal.on #mok', { timeout: 60000 }); await A.click('#modal.on #mok');
await A.waitForTimeout(1500); const quietA = await popups(A); await shot(A, '1_creator_octopus_drops');
ck('nothing pops up while the first octopus drops in', quietA.length === 0, quietA.join(','));
await A.waitForTimeout(10500); ck('the first tip comes after the quiet moment', (await popups(A)).includes('coach'));
// like the real tank: one the server once lost and the phone put back (that used to stop friends ever being offered an octopus)
if (process.env.DB) { const { DatabaseSync } = await import('node:sqlite'); const db = new DatabaseSync(process.env.DB); const row = db.prepare('SELECT id, world FROM tanks WHERE code=?').get(code); const w = JSON.parse(row.world); w.flags.healed = Date.now(); db.prepare('UPDATE tanks SET world=? WHERE id=?').run(JSON.stringify(w), row.id); db.close(); console.log('  (the tank is marked as put back)'); }
// the friend
const B = await mk(); await B.goto(base + '/join/' + code + '?q=0'); await B.waitForSelector('#welcome.on', { timeout: 60000 });
await B.waitForSelector('.pvt, #cd, #nm', { timeout: 20000 }); if (!(await B.$('.pvt')) && !(await B.$('#nm'))) { await B.fill('#cd', code); await B.click('#go'); } if (!(await B.$('#nm'))) { await B.waitForSelector('.pvt', { timeout: 20000 }); await B.click('#go'); }
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
// a full tank: a school, some reef fish and a seahorse join, then a crab treat drops in for an octopus
await A.evaluate(async () => { const g = window.__game; for (let i = 0; i < 4; i++) await g.dispatch({ t: 'dev', what: 'shells' }); g.state.level = Math.max(g.state.level, 3);
  for (const sp of ['neon', 'goldfish', 'blue', 'seahorse']) await g.dispatch({ t: 'buyFish', species: sp, name: '', seed: Math.floor(Math.random() * 9e4) }); await g.dispatch({ t: 'dev', what: 'rush' }); });
await A.waitForTimeout(9000);
const view = (p) => p.evaluate(() => { const L = window.__fishes.list; return { fish: Object.fromEntries(L.map((f) => [f.fid, { x: f.pos.x, y: f.pos.y, z: f.pos.z, h: f.heading, ph: f.phase % 2000, o: f.species.move === 'jet' ? [f.restK, f.crawlK, f.workK, f.tuckK ?? 0] : null }])), crabs: (window.__fishes.crabs ?? []).map((c) => [c.x, c.z]) }; });
const cmp = async (label, rounds = 8) => {
  let gap = 0, head = 0, beat = 0, pose = 0, n = 0; const gaps = [];
  for (let i = 0; i < rounds; i++) {
    await A.waitForTimeout(700); const [va, vb] = await Promise.all([view(A), view(B)]);
    for (const [id, a] of Object.entries(va.fish)) { const b2 = vb.fish[id]; if (!b2) continue; n++;
      { const g = Math.hypot(a.x - b2.x, a.y - b2.y, a.z - b2.z); gaps.push(g); gap = Math.max(gap, g); } head = Math.max(head, Math.abs(Math.atan2(Math.sin(a.h - b2.h), Math.cos(a.h - b2.h))));
      const dph = Math.abs(a.ph - b2.ph); beat = Math.max(beat, Math.min(dph, 2000 - dph)); if (a.o && b2.o) pose = Math.max(pose, ...a.o.map((v, j) => Math.abs(v - b2.o[j]))); }
  }
  gaps.sort((x, y) => x - y); return { gap, p95: gaps[Math.floor(gaps.length * 0.95)] ?? 0, head, beat, pose, n };
};
if (process.env.DEBUG) { const fps = (p) => p.evaluate(() => new Promise((ok) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else ok(n); }; requestAnimationFrame(f); })); console.log('fps A', await fps(A), 'fps B', await fps(B)); }
if (process.env.DEBUG) for (let i = 0; i < 6; i++) { await A.waitForTimeout(500); const [va, vb] = await Promise.all([view(A), view(B)]); console.log(Object.entries(va.fish).map(([id, a]) => vb.fish[id] ? `${id}:${Math.hypot(a.x - vb.fish[id].x, a.y - vb.fish[id].y).toFixed(2)}` : id + ':-').join(' ')); }
const full = await cmp('full'); const fa2 = await fishOf(A), fb2 = await fishOf(B); if (process.env.DEBUG) { console.log(fa2, fb2, await A.evaluate(() => window.__game.director), await B.evaluate(() => window.__game.director)); const [va, vb] = await Promise.all([view(A), view(B)]); for (const [id, a] of Object.entries(va.fish)) console.log(id, a.x.toFixed(2), a.y.toFixed(2), vb.fish[id] ? vb.fish[id].x.toFixed(2) + ' ' + vb.fish[id].y.toFixed(2) : 'missing'); }
ck('both phones have the same fish', JSON.stringify(fa2.map((x) => x.split(':').slice(0, 2).join(':'))) === JSON.stringify(fb2.map((x) => x.split(':').slice(0, 2).join(':'))) && fa2.length >= 6, fa2.length + ' fish');
ck('every fish is in the same place on both phones', full.p95 < 0.35 && full.gap < 0.9, `typical worst gap ${full.p95.toFixed(2)}, biggest ${full.gap.toFixed(2)} tank units (the tank is about 8 wide)`);
ck('every fish faces the same way', full.head < 0.5, 'biggest turn difference ' + full.head.toFixed(2) + ' rad');
ck('tails and arms move in step', full.beat < 1.2, 'biggest stroke difference ' + full.beat.toFixed(2));
ck('each octopus holds the same pose on both phones', full.pose < 0.25, 'biggest pose difference ' + full.pose.toFixed(2));
await shot(A, '5_full_A'); await shot(B, '5_full_B');
await A.evaluate(() => { const g = window.__game, me = g.you.userId, o = g.state.fish.find((f) => f.species === 'octopus' && f.owner === me); window.__fishes.dropCrabAt(0.4, o.id); });      // a crab only the lead phone knows about: the other phone must still show it
await A.waitForTimeout(1200);
let crabGap = 0, seen = 0; for (let i = 0; i < 8; i++) { await A.waitForTimeout(600); const [va, vb] = await Promise.all([view(A), view(B)]); if (va.crabs.length) seen++; for (const c of va.crabs) { const d = Math.min(...vb.crabs.map((q) => Math.hypot(c[0] - q[0], c[1] - q[1])), 99); crabGap = Math.max(crabGap, d); } }
if (process.env.DEBUG) console.log('crabs', JSON.stringify((await view(A)).crabs), JSON.stringify((await view(B)).crabs)); await shot(A, '6_crab_A'); await shot(B, '6_crab_B');
ck('a crab treat lands and runs in the same place on both phones', seen > 0 && crabGap < 0.5, `seen ${seen}, biggest gap ${crabGap.toFixed(2)}`);
const hunt = await cmp('hunt', 6); ck('while the octopus hunts, both phones still agree', hunt.gap < 0.8 && hunt.pose < 0.3, `gap ${hunt.gap.toFixed(2)}, pose ${hunt.pose.toFixed(2)}`);
ck('no page errors', errors.length === 0, errors.join('; '));
console.log(fails ? `${fails} failed` : 'Two-phone checks passed'); await b.close(); process.exit(fails ? 1 : 0);

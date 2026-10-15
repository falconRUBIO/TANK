// Real tanks on two phones: every animal saved in a tank must be on screen, at a real place in the water, on both phones.
// Loads the regression fixture (tools/fixtures/*.json) and, when a backup is to hand, the busiest tanks in it
// (BACKUP=path/to/ourtank.db.gz, or the newest file in ../ourtank-data). Each tank is put into a fresh test server and opened on two phones.
// Needs nothing running: it starts its own server. node tools/real_tank.mjs   (MAX=3 tanks from the backup)
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import zlib from 'node:zlib'; import { spawn } from 'node:child_process'; import { DatabaseSync } from 'node:sqlite';
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'realtank-')), PORT = 20000 + Math.floor(Math.random() * 20000), base = `http://localhost:${PORT}`;
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };

// the tanks to try: the fixtures, then the busiest tanks of the newest backup
const worlds = fs.readdirSync(path.join(root, 'tools/fixtures')).filter((f) => f.endsWith('.json')).map((f) => ({ name: 'fixture ' + f, ...JSON.parse(fs.readFileSync(path.join(root, 'tools/fixtures', f), 'utf8')) }));
const backup = process.env.BACKUP === 'none' ? null : process.env.BACKUP || (() => { const d = path.join(root, '../ourtank-data'); if (!fs.existsSync(d)) return null; const f = fs.readdirSync(d).filter((x) => /^ourtank-\d{4}-\d\d-\d\d\.db\.gz$/.test(x)).sort().at(-1); return f ? path.join(d, f) : null; })();
if (backup) {
  const file = path.join(tmp, 'backup.db'); fs.writeFileSync(file, backup.endsWith('.gz') ? zlib.gunzipSync(fs.readFileSync(backup)) : fs.readFileSync(backup));
  const db = new DatabaseSync(file, { readOnly: true }), rows = db.prepare('SELECT code, world FROM tanks').all().map((r) => { try { return { code: r.code, w: JSON.parse(r.world) }; } catch { return null; } }).filter(Boolean);
  const live = (w) => (w.fish ?? []).filter((f) => !f.dead && !f.nursery).length;
  for (const r of rows.sort((a, b) => live(b.w) - live(a.w)).slice(0, +(process.env.MAX || 3))) if (live(r.w)) worlds.push({ name: `backup ${path.basename(backup)} tank ${r.code}`, fish: r.w.fish, decor: r.w.decor });
  db.close();
} else console.log('(no backup found: fixtures only)');

const startServer = (db) => new Promise((ok, bad) => { const p = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(root, 'server/server.mjs')], { env: { ...process.env, PORT: String(PORT), DB: db, DEV: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  running.add(p); let out = ''; const on = (d) => { out += d; if (/listening/.test(out)) ok(p); }; p.stdout.on('data', on); p.stderr.on('data', on); p.on('exit', (c) => bad(new Error('server exited ' + c + '\n' + out))); });
const running = new Set(); process.on('exit', () => { for (const p of running) try { p.kill('SIGKILL'); } catch { /* gone */ } });      // never leave a server behind, whatever happens
const stop = (p) => new Promise((ok) => { p.removeAllListeners('exit'); p.on('exit', () => { running.delete(p); ok(); }); p.kill('SIGTERM'); });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });

for (const W of worlds) {
  console.log(W.name);
  const db = path.join(tmp, Math.random().toString(36).slice(2) + '.db'); let srv = await startServer(db);
  // two caretakers make a shared tank the normal way
  const cA = await b.newContext({ viewport: { width: 390, height: 844 } }), A = await cA.newPage(); await A.goto(base + '/?q=0'); await A.waitForSelector('#welcome.on', { timeout: 60000 });
  await A.click('[data-a=create]'); await A.fill('#nm', 'Ana'); await A.click('#go'); await A.waitForSelector('.codebig', { timeout: 30000 });
  const code = (await A.textContent('.codebig')).replace(/\s/g, ''); await A.click('#en'); await A.waitForSelector('#modal.on #mok', { timeout: 60000 }); await A.click('#modal.on #mok'); await A.waitForTimeout(1500);
  const cB = await b.newContext({ viewport: { width: 390, height: 844 } }), B = await cB.newPage(); await B.goto(base + '/join/' + code + '?q=0'); await B.waitForSelector('#welcome.on', { timeout: 60000 });
  await B.waitForSelector('.pvt, #cd, #nm', { timeout: 20000 }); if (!(await B.$('.pvt')) && !(await B.$('#nm'))) { await B.fill('#cd', code); await B.click('#go'); } if (!(await B.$('#nm'))) { await B.waitForSelector('.pvt', { timeout: 20000 }); await B.click('#go'); }
  await B.waitForSelector('#nm', { timeout: 30000 }); await B.fill('#nm', 'Ben'); await B.click('#go');
  for (let i = 0; i < 40; i++) { await B.waitForTimeout(500); const t = await B.evaluate(() => document.querySelector('#modal.on h2')?.textContent ?? ''); if (/YOUR OWN OCTOPUS/.test(t)) { await B.click('#modal.on #mok'); break; } else if (t) await B.click('#modal.on #mok').catch(() => {}); }
  await B.waitForTimeout(2000); await A.close(); await B.close();
  // then the saved animals and decorations go into that tank, as a restart would read them
  await stop(srv); { const d = new DatabaseSync(db), row = d.prepare('SELECT world FROM tanks WHERE code=?').get(code), x = JSON.parse(row.world); x.fish = W.fish; x.decor = W.decor ?? []; d.prepare('UPDATE tanks SET world=? WHERE code=?').run(JSON.stringify(x), code); d.close(); }
  srv = await startServer(db);
  const want = W.fish.filter((f) => !f.dead && !f.nursery).map((f) => f.id), errs = [], pages = [];
  for (const [n, c] of [['A', cA], ['B', cB]]) { const p = await c.newPage(); p.on('pageerror', (e) => errs.push(n + ': ' + e.message)); await p.goto(base + '/?q=0'); pages.push([n, p]); }
  await pages[0][1].waitForTimeout(9000);
  for (const [n, p] of pages) {
    const r = await p.evaluate((want) => { const F = window.__fishes; return { lost: window.__lost ?? 0, missing: want.filter((id) => !F.byId.get(id)), bad: F.list.filter((f) => want.includes(f.fid)).filter((f) => { const q = f.group.position; return !f.group.visible || !f.group.parent || ![q.x, q.y, q.z].every(Number.isFinite) || Math.abs(q.x) > 6 || q.y < -1 || q.y > 16 || q.z < -6 || q.z > 18; }).map((f) => `${f.name} (${f.sk})`) }; }, want);
    ck(`phone ${n}: all ${want.length} animals are in the tank`, !r.missing.length, r.missing.join(', '));
    ck(`phone ${n}: every one is at a real place in the water and drawn`, !r.bad.length, r.bad.join(', '));
    ck(`phone ${n}: none had to be put back from a broken position`, r.lost === 0, r.lost ? `${r.lost} put back` : '');
  }
  ck('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
  await cA.close(); await cB.close(); await stop(srv);
}
await b.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `${fails} failed` : 'Real tank checks passed'); process.exit(fails ? 1 : 0);

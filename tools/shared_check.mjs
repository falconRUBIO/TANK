// Two phones: notification switches in Settings are kept by the server; a phone too slow to keep the animals smooth hands them to the other. Starts its own server.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawn } from 'node:child_process';
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), PORT = 20000 + Math.floor(Math.random() * 20000), base = `http://localhost:${PORT}`, tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shared-'));
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
const srv = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(root, 'server/server.mjs')], { env: { ...process.env, PORT: String(PORT), DB: path.join(tmp, 't.db'), DEV: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
process.on('exit', () => { try { srv.kill('SIGKILL'); } catch { /* gone */ } });
await new Promise((ok) => { let o = ''; const on = (d) => { o += d; if (/listening/.test(o)) ok(); }; srv.stdout.on('data', on); srv.stderr.on('data', on); });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const errors = []; const mk = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errors.push(e.message)); return p; };
const A = await mk(); await A.goto(base + '/?q=0'); await A.waitForSelector('#welcome.on', { timeout: 120000 });
await A.click('[data-a=create]'); await A.fill('#nm', 'Ana'); await A.click('#go'); await A.waitForSelector('.codebig', { timeout: 90000 });
const code = (await A.textContent('.codebig')).replace(/\s/g, ''); await A.click('#en'); await A.waitForSelector('#modal.on #mok', { timeout: 120000 }); await A.click('#modal.on #mok'); await A.waitForTimeout(1500);
const B = await mk(); await B.goto(base + '/join/' + code + '?q=0'); await B.waitForSelector('#welcome.on', { timeout: 120000 });
await B.waitForSelector('.pvt, #cd, #nm', { timeout: 90000 }); if (!(await B.$('.pvt')) && !(await B.$('#nm'))) { await B.fill('#cd', code); await B.click('#go'); } if (!(await B.$('#nm'))) { await B.waitForSelector('.pvt', { timeout: 90000 }); await B.click('#go'); }
await B.waitForSelector('#nm', { timeout: 90000 }); await B.fill('#nm', 'Ben'); await B.click('#go');
for (let i = 0; i < 40; i++) { await B.waitForTimeout(500); const t = await B.evaluate(() => document.querySelector('#modal.on h2')?.textContent ?? ''); if (/YOUR OWN OCTOPUS/i.test(t)) { await B.click('#modal.on #mok'); break; } else if (t) await B.click('#modal.on #mok').catch(() => {}); }
await B.waitForTimeout(2500);
await A.evaluate(() => document.querySelectorAll('#modal,#coach,#reunion,#toast').forEach((e) => e.classList.remove('on')));
await A.evaluate(() => window.__ui.open('friends')); await A.waitForTimeout(600); await A.evaluate(() => document.querySelector('[data-sub="settings"]')?.click()); await A.waitForTimeout(800);
const rows = await A.evaluate(() => [...document.querySelectorAll('[data-pk]')].map((b) => b.dataset.pk + ':' + b.textContent));
ck('Settings lists the five kinds of notification, all on', rows.length === 5 && rows.every((r) => /On$/.test(r)), rows.join(' '));
await A.evaluate(() => document.querySelector('[data-pk="eggs"]').click()); await A.waitForTimeout(1500);
const ana = await A.evaluate(() => window.__game.you.userId), { DatabaseSync } = await import('node:sqlite');
const pref = (() => { const d = new DatabaseSync(path.join(tmp, 't.db')); const v = d.prepare('SELECT v FROM kv WHERE k=?').get('pushpref:' + ana)?.v; d.close(); return v; })();
ck('switching eggs off is kept by the server', pref === '{"eggs":false}', String(pref));
ck('and the switch shows Off', await A.evaluate(() => document.querySelector('[data-pk="eggs"]').textContent === 'Off'));
const { makePush } = await import(path.join(root, 'server/push.mjs')); const sent = [];
{ const d = new DatabaseSync(path.join(tmp, 't.db')); d.prepare('INSERT OR REPLACE INTO push_subs (endpoint,user_id,p256dh,auth,offset_min,created_at) VALUES (?,?,?,?,?,?)').run('https://web.push.apple.com/x', ana, 'p', 'a', 0, Date.now());
  const P = makePush(d, { sender: async (sub, body) => sent.push(JSON.parse(body).body) }), noon = Date.UTC(2026, 9, 15, 12);
  await P.notify(ana, 'New eggs! Marlin is guarding them.', { now: noon }); await P.notify(ana, 'Ben sent you a bottle', { now: noon, cap: 2 }); d.close(); }
ck('an eggs notification is held back, a bottle still comes', sent.length === 1 && /bottle/.test(sent[0]), JSON.stringify(sent));
const dirA = await A.evaluate(() => window.__game.director), dirB = await B.evaluate(() => window.__game.director);
ck('one phone runs the animals', dirA !== dirB, `A ${dirA} B ${dirB}`);
const [S, F] = dirA ? [A, B] : [B, A];
for (const P of [A, B]) await P.evaluate(() => { window.__perfOff = true; window.__game.live.send({ t: 'perf', fps: 60 }); }); await A.waitForTimeout(1500);
await S.evaluate(() => window.__game.live.send({ t: 'perf', fps: 10 })); await S.waitForTimeout(2500);
ck('when it says it is too slow, the other phone takes the animals over', (await F.evaluate(() => window.__game.director)) === true && (await S.evaluate(() => window.__game.director)) === false);
await F.evaluate(() => window.__game.live.send({ t: 'perf', fps: 12 })); await F.waitForTimeout(2500);
ck('and never hands them back to a phone just as slow', (await F.evaluate(() => window.__game.director)) === true);
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); fs.rmSync(tmp, { recursive: true, force: true }); console.log(fails ? `${fails} failed` : 'Shared checks passed'); process.exit(fails ? 1 : 0);

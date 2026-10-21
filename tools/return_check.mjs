// Coming back to a shared tank: Ben is away for hours while Ana cares for it and a new fish arrives. When he opens it again (his phone with its own away record wiped, so only the server can know), Today says what changed while he was away, the big news first, none of his own or routine care. Starts its own server.   node tools/return_check.mjs
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawn } from 'node:child_process';
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), PORT = 20000 + Math.floor(Math.random() * 20000), base = `http://localhost:${PORT}`, tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'away-'));
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
const srv = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(root, 'server/server.mjs')], { env: { ...process.env, PORT: String(PORT), DB: path.join(tmp, 't.db'), DEV: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
process.on('exit', () => { try { srv.kill('SIGKILL'); } catch { /* gone */ } });
await new Promise((ok) => { let o = ''; const on = (d) => { o += d; if (/listening/.test(o)) ok(); }; srv.stdout.on('data', on); srv.stderr.on('data', on); });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const errors = []; const mk = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errors.push(e.message)); return p; };
const A = await mk(); await A.goto(base + '/?q=0'); await A.waitForSelector('#welcome.on', { timeout: 120000 });
await A.click('[data-a=create]'); await A.fill('#nm', 'Ana'); await A.click('#go'); await A.waitForSelector('.codebig', { timeout: 90000 });
const code = (await A.textContent('.codebig')).replace(/\s/g, ''); await A.click('#en'); await A.waitForSelector('#modal.on #mok', { timeout: 120000 }); await A.evaluate(() => document.querySelector('#modal.on #mok').click()); await A.waitForTimeout(1500);
const B = await mk(); await B.goto(base + '/join/' + code + '?q=0'); await B.waitForSelector('#welcome.on', { timeout: 120000 });
await B.waitForSelector('.pvt, #cd, #nm', { timeout: 90000 }); if (!(await B.$('.pvt')) && !(await B.$('#nm'))) { await B.fill('#cd', code); await B.click('#go'); } if (!(await B.$('#nm'))) { await B.waitForSelector('.pvt', { timeout: 90000 }); await B.click('#go'); }
await B.waitForSelector('#nm', { timeout: 90000 }); await B.fill('#nm', 'Ben'); await B.click('#go');
for (let i = 0; i < 40; i++) { await B.waitForTimeout(500); const t = await B.evaluate(() => document.querySelector('#modal.on h2')?.textContent ?? ''); if (/YOUR OWN OCTOPUS/i.test(t)) { await B.evaluate(() => document.querySelector('#modal.on #mok').click()); break; } else if (t) await B.evaluate(() => document.querySelector('#modal.on #mok')?.click()); }
await B.waitForTimeout(2500);
const ben = await B.evaluate(() => window.__game.you.userId); const bp = B.context(); await B.close(); await A.waitForTimeout(3000);
// while Ben is away: routine care by Ana, and a new fish for the tank
await A.evaluate(async () => { const g = window.__game; await g.dispatch({ t: 'feed', x: 0 }); await g.dispatch({ t: 'glass' }); g.state.shells = Math.max(g.state.shells, 60); });
const buy = await A.evaluate(async () => window.__game.dispatch({ t: 'buyFish', species: 'goldfish', name: 'Pip', seed: 7, rush: true })); await A.waitForTimeout(4000);
const jA = await A.evaluate(() => window.__game.journal.slice(-8).map((e) => e.text)); ck('Ana\'s care and the new fish are in the journal', buy.ok && jA.some((x) => /Pip/.test(x)), JSON.stringify({ buy: buy.reason ?? 'ok', jA }));
const { DatabaseSync } = await import('node:sqlite'); { const d = new DatabaseSync(path.join(tmp, 't.db')); d.prepare('UPDATE members SET last_seen=? WHERE user_id=?').run(Date.now() - 8 * 3600e3, ben); d.prepare('UPDATE journal SET ts=? WHERE ts > ?').run(Date.now() - 2 * 3600e3, Date.now() - 600e3); d.close(); }      // (he left eight hours ago; Ana's lines were two hours ago)
const B2 = await bp.newPage(); B2.on('pageerror', (e) => errors.push(e.message)); await B2.addInitScript(() => { for (const k of Object.keys(localStorage)) if (/^ourtank\.(away|seen)/.test(k)) localStorage.removeItem(k); });
await B2.goto(base + '/?q=0'); await B2.waitForFunction(() => window.__game?.state && window.__game.members, null, { timeout: 120000 }); await B2.waitForTimeout(4000);
await B2.evaluate(() => { document.querySelectorAll('#modal,#coach,#reunion,#toast').forEach((e) => e.classList.remove('on')); window.__ui.open('notices'); }); await B2.waitForTimeout(2500);
const away = await B2.evaluate(() => ({ srv: window.__game.away, local: localStorage.getItem('ourtank.away'), lines: [...document.querySelectorAll('#sheet .awayl p')].map((p) => p.textContent), head: document.querySelector('#sheet .ntsh')?.textContent ?? '' }));
await B2.screenshot({ path: (process.env.OUT || '/tmp/return') + '/ben-today.png' }).catch(() => {});
ck('the server kept Ben\'s time away (about 8 hours)', away.srv && Math.abs((away.srv.to - away.srv.from) / 3600e3 - 8) < 0.2, JSON.stringify(away.srv));
ck('Today shows "While you were away" from that, with the new fish first', away.lines.length > 0 && /Pip/.test(away.lines[0]), JSON.stringify(away.lines));
ck('routine care is not news', !away.lines.some((x) => /(fed|cleaned the glass|changed the water)/.test(x)), JSON.stringify(away.lines));
await A.evaluate(() => window.__ui.open('notices')); await A.waitForTimeout(1500);
ck('Ana, who never left, sees no away summary', !(await A.$('#sheet .awayl')));
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); fs.rmSync(tmp, { recursive: true, force: true }); console.log(fails ? `${fails} failed` : 'Return checks passed'); process.exit(fails ? 1 : 0);

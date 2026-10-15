// A friend away: Ben has not been in for 20 days, so Ana can look after his octopus from its card; while he was here she could not. Starts its own server.
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
const code = (await A.textContent('.codebig')).replace(/\s/g, ''); await A.click('#en'); await A.waitForSelector('#modal.on #mok', { timeout: 120000 }); await A.click('#modal.on #mok'); await A.waitForTimeout(1500);
const B = await mk(); await B.goto(base + '/join/' + code + '?q=0'); await B.waitForSelector('#welcome.on', { timeout: 120000 });
await B.waitForSelector('.pvt, #cd, #nm', { timeout: 90000 }); if (!(await B.$('.pvt')) && !(await B.$('#nm'))) { await B.fill('#cd', code); await B.click('#go'); } if (!(await B.$('#nm'))) { await B.waitForSelector('.pvt', { timeout: 90000 }); await B.click('#go'); }
await B.waitForSelector('#nm', { timeout: 90000 }); await B.fill('#nm', 'Ben'); await B.click('#go');
for (let i = 0; i < 40; i++) { await B.waitForTimeout(500); const t = await B.evaluate(() => document.querySelector('#modal.on h2')?.textContent ?? ''); if (/YOUR OWN OCTOPUS/.test(t)) { await B.click('#modal.on #mok'); break; } else if (t) await B.click('#modal.on #mok').catch(() => {}); }
await B.waitForTimeout(2500);
const ben = await B.evaluate(() => window.__game.you.userId), octo = await B.evaluate(() => window.__game.state.fish.find((f) => f.species === 'octopus' && f.owner === window.__game.you.userId)?.id);
ck('Ben has his own octopus', !!octo);
const early = await A.evaluate((id) => window.__game.dispatch({ t: 'lookAfter', id }), octo); ck('while Ben is around, Ana cannot take it on', early.ok === false, early.code ?? early.reason ?? '');
await B.close(); await A.waitForTimeout(4000);      // (his phone's goodbye is recorded first)
const { DatabaseSync } = await import('node:sqlite'); { const d = new DatabaseSync(path.join(tmp, 't.db')); d.prepare('UPDATE members SET last_seen=? WHERE user_id=?').run(Date.now() - 20 * 864e5, ben); d.close(); }
await A.reload(); await A.waitForFunction(() => window.__game?.state && window.__fishes?.list?.length, null, { timeout: 120000 }); await A.waitForTimeout(3000);
await A.evaluate(() => document.querySelectorAll('#modal,#coach,#reunion,#toast').forEach((e) => e.classList.remove('on')));
await A.evaluate((id) => { const f = window.__fishes.byId.get(id); window.__tank && f && window.__showCard?.(f); }, octo);
const banner = await A.evaluate(() => document.querySelector('#card .awayb')?.innerText ?? '');
if (!banner) console.log('debug', await A.evaluate((id) => JSON.stringify({ m: window.__game.members, shared: window.__game.shared, card: document.querySelector('#card')?.className, h: document.querySelector('#card h2')?.textContent, has: !!window.__fishes.byId.get(id) }), octo));
ck('his octopus\'s card says he has been away, with a button to look after it', /20 days/.test(banner) && /Look after/.test(banner), banner.replace(/\s+/g, ' '));
if (banner) await A.click('#card .awayb button'); await A.waitForTimeout(2000);
ck('Ana now looks after it', await A.evaluate((id) => window.__game.state.fish.find((f) => f.id === id)?.owner === window.__game.you.userId, octo));
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); fs.rmSync(tmp, { recursive: true, force: true }); console.log(fails ? `${fails} failed` : 'Away checks passed'); process.exit(fails ? 1 : 0);

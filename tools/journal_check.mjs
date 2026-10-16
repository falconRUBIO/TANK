// The journal as a feed: a moment on one phone (an octopus at the glass) gets a photo taken by the phone running the animals, and the other
// phone's journal shows it as a post with that photo, which opens full screen. Notices stay under the bell, not in the journal. Starts its own server.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawn } from 'node:child_process';
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), PORT = 20000 + Math.floor(Math.random() * 20000), base = `http://localhost:${PORT}`, tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'journal-'));
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
for (const P of [A, B]) await P.evaluate(() => document.querySelectorAll('#modal,#coach,#reunion,#toast').forEach((e) => e.classList.remove('on')));
const [D, O] = (await A.evaluate(() => window.__game.director)) ? [A, B] : [B, A];
const oct = await D.evaluate(() => window.__game.state.fish.find((f) => f.species === 'octopus' && !f.dead)?.id);
ck('there is an octopus to have a moment', !!oct);
const r = await D.evaluate((id) => window.__game.dispatch({ t: 'moment', kind: 'glass', fish: id }), oct); ck('the moment is written', r.ok && r.applied !== false, JSON.stringify(r).slice(0, 80));
const again = await D.evaluate((id) => window.__game.dispatch({ t: 'moment', kind: 'glass', fish: id }), oct); ck('the same moment again soon after is not written twice', again.applied === false);
const got = await O.waitForFunction(() => window.__game.journal.some((e) => /looked in at you/.test(e.text) && e.photo), null, { timeout: 30000 }).then(() => true, () => false);
ck('the phone running the animals took its photo, and the other phone hears of it', got);
await O.evaluate(() => window.__ui.open('friends')); await O.waitForTimeout(600); await O.evaluate(() => document.querySelector('[data-sub="journal"]')?.click());
const img = await O.waitForSelector('#sheet .jpost .jimg img', { timeout: 30000 }).then(() => true, () => false);
ck('the journal shows it as a post with the photo', img);
const tag = await O.evaluate(() => document.querySelector('#sheet .jpost .jtag')?.textContent ?? '');
ck('the post says what kind of moment it is', /Hello/.test(tag), tag);
ck('the bell\'s notices are not mixed into the journal', await O.evaluate(() => !document.querySelector('#sheet .crew .nts')));
await O.evaluate(() => document.querySelector('#sheet .jpost .jimg').click()); await O.waitForTimeout(500);
ck('tapping the photo opens it full screen with its line', await O.evaluate(() => /looked in at you/.test(document.querySelector('.lightbox.on p')?.textContent ?? '')));
if (process.env.OUT) { await O.screenshot({ path: process.env.OUT + '/lightbox.png' }); await O.evaluate(() => document.querySelector('.lightbox')?.click()); await O.waitForTimeout(500); await O.screenshot({ path: process.env.OUT + '/journal.png' }); }
await O.evaluate(() => document.querySelector('.lightbox')?.remove()); await O.evaluate(() => document.querySelector('#sheet .jpost .jpc').click());
const pc = await O.waitForSelector('#modal.on .pcprev img', { timeout: 30000 }).then(() => true, () => false);
ck('"Send as a postcard" makes a postcard of that moment, ready to share', pc && await O.evaluate(() => !!document.querySelector('#modal.on #mok')));
if (process.env.OUT && pc) { const src = await O.evaluate(() => document.querySelector('#modal.on .pcprev img').src); const b64 = await O.evaluate(async (u) => { const r = await fetch(u); const bl = await r.blob(); return await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(bl); }); }, src); fs.writeFileSync(process.env.OUT + '/moment_postcard.png', Buffer.from(b64.split(',')[1], 'base64')); }
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); fs.rmSync(tmp, { recursive: true, force: true }); console.log(fails ? `${fails} failed` : 'Journal checks passed'); process.exit(fails ? 1 : 0);

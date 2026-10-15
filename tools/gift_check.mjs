// A surprise gift between two phones: Ana sends Ben a clownfish with a note. Nothing anywhere says what it is until Ben opens it; Ben sees a
// gift bag on the sand, Ana cannot open it, Ben can: the fish swims out, the note shows, and his thanks reach Ana. Starts its own server.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawn } from 'node:child_process';
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), PORT = 20000 + Math.floor(Math.random() * 20000), base = `http://localhost:${PORT}`, tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gift-'));
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
const ben = await B.evaluate(() => window.__game.you.userId);
const r = await A.evaluate(async (to) => { const g = window.__game; g.state.shells = 999; return g.dispatch({ t: 'buyFish', species: 'goldfish', name: 'Bubbles', seed: 7, to, surprise: true, note: 'Thought you would love this one!', rush: true }); }, ben);
ck('Ana sends Ben a surprise gift', r.ok, JSON.stringify(r).slice(0, 120));
await B.waitForFunction(() => window.__gifts?.size > 0, null, { timeout: 90000 }).catch(() => {});
const seen = await B.evaluate(() => ({ bags: window.__gifts.size, inTank: window.__fishes.list.some((f) => f.name === 'Bubbles'), text: document.body.innerText, journal: JSON.stringify(window.__game.state.journal ?? window.__game.journal ?? ''), forecast: JSON.stringify(window.__game.state.orders ?? []) }));
ck('Ben sees a gift bag on the sand', seen.bags === 1);
if (process.env.OUT) { const xy = await B.evaluate(() => { const g = [...window.__gifts.values()][0], v = g.bag.group.position.clone(); v.y += 0.4; v.project(window.__tank.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; }); await B.evaluate(() => document.querySelectorAll('#modal,#toast,#coach').forEach((e) => e.classList.remove('on'))); await B.waitForTimeout(600); await B.screenshot({ path: process.env.OUT + '/giftbag.png', clip: { x: Math.max(0, Math.min(390 - 200, xy.x - 100)), y: Math.max(0, xy.y - 110), width: 200, height: 170 } }); }
ck('the fish is not in the water yet', !seen.inTank);
ck('nothing on Ben\'s screen or journal says what it is', !/clownfish|Bubbles/i.test(seen.text + seen.journal), (seen.text + seen.journal).match(/.{30}(clownfish|Bubbles).{20}/i)?.[0] ?? '');
await A.waitForTimeout(1500);
const aTry = await A.evaluate(async () => { const g = [...window.__gifts.values()][0]; if (!g) return 'no bag'; await window.__openGift(g); return window.__game.state.fish.find((f) => f.name === 'Bubbles')?.gift?.wrapped; });
ck('Ana cannot open it', aTry === true, String(aTry));
await B.evaluate(() => { document.querySelectorAll('#modal').forEach((e) => e.classList.remove('on')); window.__openGift([...window.__gifts.values()][0]); });
const out = await B.waitForFunction(() => window.__fishes.list.some((f) => f.name === 'Bubbles'), null, { timeout: 90000 }).then(() => true).catch(() => false);
ck('opened, the fish swims out of the bag', out);
await B.waitForSelector('#modal.on h2', { timeout: 15000 }).catch(() => {});
const card = await B.evaluate(() => document.querySelector('#modal.on')?.innerText ?? '');
ck('a card says who it is from, with the note', /A GIFT FROM ANA/i.test(card) && /love this one/.test(card) && /Bubbles/.test(card), card.replace(/\s+/g, ' ').slice(0, 140));
await B.click('#modal.on #mok').catch(() => {}); await B.waitForTimeout(2000);
const thanked = await A.evaluate(() => window.__game.state.fish.find((f) => f.name === 'Bubbles')?.gift?.thanked);
ck('Ben\'s thanks reach the tank (and Ana)', !!thanked);
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); fs.rmSync(tmp, { recursive: true, force: true }); console.log(fails ? `${fails} failed` : 'Gift checks passed'); process.exit(fails ? 1 : 0);

// The people screens: making your person, the tank code and recovery key, the octopus pick, the Crew tab with two caretakers, and editing your look.
// Needs the dev server: PORT=8124 DB=/tmp/people.db DEV=1 node server/server.mjs ; then OUT=dir node tools/shots_people.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = process.env.OUT || '/tmp/people', base = 'http://localhost:8124'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const errors = [];
const mk = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2 }); await ctx.addInitScript(() => { setInterval(() => { const t = document.querySelector('#modal.on h2, #modal.on .title')?.textContent ?? ''; if (/GIFT|LEVEL/.test(t)) document.querySelector('#modal.on #mok')?.click(); }, 300); }); const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(e.message)); return p; };
const shot = async (pg, n, ms = 800) => { await pg.waitForTimeout(ms); await pg.screenshot({ path: `${out}/${n}.png` }); };
const p = await mk();
await p.goto(base + '/?q=1&tod=afternoon'); await p.waitForSelector('#welcome.on', { timeout: 60000 }); await shot(p, '01_welcome');
await p.click('[data-a=create]'); await shot(p, '02_profile', 1500);
await p.fill('#nm', 'Ana'); await p.click('.pe-tabs [data-t=hair]'); await p.waitForTimeout(700); const tiles = await p.$$('.pe-tile'); if (tiles[3]) await tiles[3].click(); await shot(p, '03_profile_changed', 900);
await p.evaluate(() => document.querySelector('#welcome .scr')?.scrollTo(0, 9999)); await shot(p, '03b_profile_bottom', 500);
await p.click('#go'); await p.waitForSelector('.codebig', { timeout: 30000 }); await shot(p, '04_code');
const code = (await p.textContent('.codebig')).replace(/\s/g, '');
await p.click('#en'); await p.waitForTimeout(4000); await shot(p, '05_first_octopus', 1500);
await p.click('#modal.on #mok').catch(() => {}); await p.waitForTimeout(2500);
const q = await mk(); await q.goto(base + '/?q=1'); await q.waitForSelector('#welcome.on'); await q.click('[data-a=join]'); await q.fill('#cd', code); await q.click('#go'); await q.waitForSelector('.pvt', { timeout: 30000 }); await shot(q, '06_join_preview');
await q.click('#go').catch(() => {}); await q.waitForTimeout(1200); await shot(q, '07_join_profile'); await q.fill('#nm', 'Ben').catch(() => {}); await q.click('#go').catch(() => {}); await q.waitForTimeout(3000);
await p.evaluate(() => { const g = window.__game; if (g?.state?.flags) g.state.flags.tut = 5; }); await p.click('nav [data-tab=friends]', { force: true }); await shot(p, '08_crew', 1800); console.log('slot canvas', await p.evaluate(() => [...document.querySelectorAll('#sheet canvas.big')].map((c) => [c.width, c.height, c.clientWidth, c.clientHeight, getComputedStyle(c).padding, getComputedStyle(c).objectFit].join(' '))));
const mine = await p.$('[data-edit-me]'); if (mine) { await mine.click(); await shot(p, '09_edit_look', 1500); }
console.log('code', code); console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

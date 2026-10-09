// Onboarding and recovery screens against the dev server. PORT=8124 DB=/tmp/audit.db DEV=1 node server/server.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = process.env.OUT || '/tmp/audit_onb', base = 'http://localhost:8124'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const mk = async () => (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage();
const p = await mk(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
const shot = async (pg, n) => { await pg.waitForTimeout(700); await pg.screenshot({ path: `${out}/${n}.png` }); };
await p.goto(base + '/?q=1'); await p.waitForSelector('#welcome.on', { timeout: 60000 }); await shot(p, '01_welcome');
await p.click('[data-a=create]'); await shot(p, '02_profile'); await p.fill('#nm', 'Ana'); await p.click('#go'); await p.waitForSelector('.codebig', { timeout: 30000 }); await shot(p, '03_code');
const code = await p.textContent('.codebig');
const q = await mk(); q.on('pageerror', (e) => errors.push(e.message)); await q.goto(base + '/?q=1'); await q.waitForSelector('#welcome.on'); await q.click('[data-a=join]'); await shot(q, '04_join'); await q.fill('#cd', code); await q.click('#go'); await q.waitForSelector('.pvt', { timeout: 30000 }); await shot(q, '05_preview');
await q.click('.again'); await shot(q, '06_claim');
await q.click('.claim button'); await q.waitForTimeout(1500); await shot(q, '07_after_claim');
const r = await mk(); await r.goto(base + '/?q=1'); await r.waitForSelector('#welcome.on'); await r.click('[data-a=recover]'); await shot(r, '08_recover');
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

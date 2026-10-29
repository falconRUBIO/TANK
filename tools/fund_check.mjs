// The turtle savings line on the Tank chart, from a save made by ordinary play to level 7 (tools/sim/milestones.mjs, seed 1037), opened
// without dev mode: the chart says how far the shells are from the first sea turtle, and the bar matches.   node tools/fund_check.mjs [OUTDIR]
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const base = process.env.BASE || 'http://localhost:8123', out = process.argv[2] || '/tmp/fund'; fs.mkdirSync(out, { recursive: true });
const savePath = `${out}/level7-save.json`;
console.log(execFileSync(process.execPath, ['tools/sim/milestones.mjs', '1037'], { env: { ...process.env, ORIGIN: String(Date.now() - 21 * 864e5), SAVE: savePath, SAVE_LEVEL: '7' } }).toString().trim().split('\n').at(-1));
const save = fs.readFileSync(savePath, 'utf8'), shells = JSON.parse(save).state.shells;
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('ourtank.world2', s); localStorage.setItem('ourtank.chartSeen', '1'); sessionStorage.setItem('seeded', '1'); } }, save);
const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=1&tod=afternoon'); await p.waitForFunction(() => window.__game?.state && window.__ui, null, { timeout: 180000 }); await p.waitForTimeout(4000);
for (let i = 0; i < 6; i++) { await p.evaluate(() => { document.querySelectorAll('#modal.on #mok').forEach((b) => b.click()); }); await p.waitForTimeout(400); }
await p.evaluate(() => window.__ui.open('decorate')); await p.waitForTimeout(2000);      /* (the turtle fund is in the Shop now) */
const r = await p.evaluate(() => { const el = document.querySelector('#sheet .tc-fund'); if (el) el.scrollIntoView({ block: 'center' }); return { text: el?.innerText ?? null, bar: el?.querySelector('.tc-bar i')?.style.width ?? null, level: window.__game.state.level, shells: window.__game.state.shells }; });
await p.waitForTimeout(800); await p.screenshot({ path: `${out}/turtle-fund.png`, timeout: 180000 }).catch(() => {});
const m = /Saving for a sea turtle: (\d+) of (\d+)/.exec(r.text ?? '');
ck('a level 7 save made by ordinary play, opened without dev mode', r.level === 7, r);
ck('the Tank chart shows the turtle savings line', !!m, r.text);
ck('it shows the shells the tank really has, against the first turtle\'s price', m && +m[1] === Math.min(+m[2], r.shells) && +m[2] === 180, m ? `${m[1]} of ${m[2]} (tank has ${r.shells})` : '');
ck('the bar matches', m && r.bar === `${Math.max(3, Math.round((+m[1] / +m[2]) * 100))}%`, r.bar);
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Turtle savings checks passed'); process.exit(fails ? 1 : 0);

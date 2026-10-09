// A walk through every menu and overlay for layout review. W=390 H=760 OUT=dir node tools/audit_screens.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const W = +(process.env.W || 390), H = +(process.env.H || 760), out = process.env.OUT || '/tmp/audit'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
const shot = async (n) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${n}.png` }); };
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForTimeout(3000); await shot('01_open');
const modal = await p.$('#modal.on #mok'); if (modal) { await shot('02_modal'); await modal.click(); }
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500); await shot('03_after_open');
await p.evaluate(() => { const g = window.__game; g.state.flags.tut = 5; g.state.shells = 120; g.state.level = 4; g.emit('state'); }); await p.waitForTimeout(1500); await shot('04_tank');
for (const t of ['care', 'decorate', 'friends']) { await p.click(`nav [data-tab=${t}]`, { force: true }); await shot('05_tab_' + t); }
await p.click('[data-cat=FISH]').catch(() => {}); await p.waitForTimeout(2500); await shot('06_shop_fish');
await p.click('nav [data-tab=tank]', { force: true }); await p.waitForTimeout(800);
await p.click('#gear').catch(() => {}); await shot('07_gear'); await p.keyboard.press('Escape'); await p.mouse.click(195, 300).catch(() => {});
await p.click('#shells').catch(() => {}); await shot('08_shell_guide'); await p.keyboard.press('Escape'); await p.click('#mok').catch(() => {});
await p.evaluate(() => window.__focus?.(0)); await p.waitForTimeout(1500); await shot('09_fish_card');
await p.evaluate(() => window.__focus?.(null));
await p.evaluate(() => { const g = window.__game; g.emit('toast', 'A long toast to check how it sits above the bar and below the status area, wrapping on two lines.'); }); await shot('10_toast_long');
await p.evaluate(() => { const g = window.__game; g.emit('chapter', { key: 'x', title: 'A Week Together', text: 'Seven days. This is starting to feel like home.' }); }); await shot('11_chapter');
await p.evaluate(() => { const g = window.__game; g.emit('died', g.state.fish[0].id); }); await shot('12_farewell');
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

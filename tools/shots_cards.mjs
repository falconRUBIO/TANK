// The fish card (closed and expanded), a dialog and the small cards, for layout review. OUT=dir node tools/shots_cards.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = process.env.OUT || '/tmp/cards'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game; g.state.flags.tut = 5; g.state.level = 4; g.state.shells = 40; g.emit('state'); });
const shot = async (n, ms = 900) => { await p.waitForTimeout(ms); await p.screenshot({ path: `${out}/${n}.png` }); };
await p.evaluate(() => window.__focus(0)); await shot('1_card', 6000);
await p.evaluate(() => { const b = [...document.querySelectorAll('#card button, #card .fold')].find((x) => /More about/.test(x.textContent)); b?.click(); }); await shot('2_card_more', 1500);
await p.evaluate(() => { document.querySelector('#card').scrollTop = 9999; }); await shot('3_card_more_end', 700);
await p.evaluate(() => window.__focus(null)); await p.click('#pill'); await shot('4_shell_guide', 900); await p.click('#mok').catch(() => {});
await p.evaluate(() => window.__game.emit('levelup', 5)); await shot('5_levelup', 900); await p.click('#mok').catch(() => {});
await p.evaluate(() => window.__ui.reunion(['Pip grew up.', 'Mimi dragged it out of its den. Tap it in the tank.', "Today's request: a plant for Pip"], () => {})); await shot('6_reunion', 1500);
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

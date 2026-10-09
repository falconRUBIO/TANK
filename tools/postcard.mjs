// Makes a postcard in the real scene and saves it (the share sheet is replaced by a capture). OUT=dir node tools/postcard.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/octo'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.addInitScript(() => { navigator.canShare = () => true; navigator.share = async ({ files, text }) => { const r = new FileReader(); r.onload = () => { window.__shared = { name: files[0].name, text, data: r.result }; }; r.readAsDataURL(files[0]); }; });
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(async () => { const g = window.__game; await g.dispatch({ t: 'tut', step: 5 }); g.state.flags.tut = 5; g.journal.push({ day: 3, ts: Date.now(), text: 'An egg hatched: meet Dot, child of Pip and Nori.' }); g.emit('state'); });
await p.click('nav [data-tab=care]', { force: true }); await p.waitForTimeout(600); await p.click('[data-act=photo]'); await p.waitForFunction(() => window.__shared, null, { timeout: 60000 });
const sh = await p.evaluate(() => window.__shared); fs.writeFileSync(out + '/postcard.png', Buffer.from(sh.data.split(',')[1], 'base64')); console.log(sh.name, '|', sh.text);
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

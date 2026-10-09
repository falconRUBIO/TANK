// Screens for the fish wishes, comfort, notes, plant trimming and the two landmarks (solo game). OUT=dir node tools/shots_wants.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/shots';
import fs from 'node:fs'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(3000);
await p.evaluate(async () => { const g = window.__game; await g.dispatch({ t: 'tut', step: 5 }); const s = g.state; s.level = 8; s.shells = 900; s.flags.tut = 5;
  for (const [t, x, z] of [['fern', -3, 2], ['grass', -2, 1], ['lighthouse', 2.6, 0.4], ['spire', -3.2, 0.3]]) await g.dispatch({ t: 'buyDecor', type: t, x, z, ry: 0 });
  s.decor.forEach((d) => { if (d.type === 'fern' || d.type === 'grass') d.at = Date.now() - 6 * 864e5; });
  s.fish[0].traits = ['Shy', 'Curious']; s.want = { id: 'w9', fish: s.fish[0].id, kind: 'hide', text: s.fish[0].name + ' wants more plants to hide among (4 in all).', since: Date.now() };
  g.emit('state'); });
await p.evaluate(async () => { const g = window.__game, s = g.state; await g.dispatch({ t: 'buyDecor', type: 'torii', x: 0.4, z: 0.9, ry: 0 }); s.fish[0].bond = { me: 6 }; s.fish[0].born = Date.now() - 4 * 864e5; s.fish[0].stage = 'adult'; g.emit('state'); });
await p.waitForTimeout(2500); await p.screenshot({ path: out + '/tank.png' });
await p.click('nav [data-tab=care]'); await p.waitForTimeout(500); await p.click('.foodrow [data-food=treats]'); await p.waitForTimeout(300); await p.screenshot({ path: out + '/care.png' }); await p.click('[data-act=feed]'); await p.waitForTimeout(800); await p.screenshot({ path: out + '/feed.png' });
await p.evaluate(() => window.__setTod?.('night')); await p.waitForTimeout(5000); await p.screenshot({ path: out + '/night.png' }); await p.evaluate(() => window.__setTod?.('afternoon')); await p.waitForTimeout(500);
await p.click('nav [data-tab=care]'); await p.waitForTimeout(700); await p.screenshot({ path: out + '/today.png' });
await p.click('nav [data-tab=care]'); await p.waitForTimeout(500); await p.screenshot({ path: out + '/care.png' });
await p.click('nav [data-tab=care]'); await p.waitForTimeout(400);
await p.evaluate(() => window.__focus?.(0)); await p.waitForTimeout(800); await p.screenshot({ path: out + '/card.png' });
const tr = await p.$('[data-train]'); console.log('teach button:', tr ? await tr.textContent() : 'none'); if (tr) { await tr.click(); await p.waitForTimeout(2500); await p.screenshot({ path: out + '/trick.png' }); }
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

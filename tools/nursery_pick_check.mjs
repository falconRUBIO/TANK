// Leaving the nursery, in the real game: the tag says plainly what is coming (the babies leave the nursery in so long; then, pick one to keep), the
// choice offers every baby of the brood, not only the three you got to know, the list scrolls with the Keep button always in reach, and one of the
// others can be the one that stays: it is the same little seahorse that swam in the nursery, and the other twelve leave.   Needs the solo game on 8123.
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const OUT = process.env.OUT || '/tmp/nurserypick'; fs.mkdirSync(OUT, { recursive: true }); const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
await p.goto('http://localhost:8123/?q=1&dev=1&tod=noon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(1500);
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; s.level = 8; s.hunger = 0.1; s.fish.length = 0; s.decor.length = 0;
  s.fish.push({ id: 'h1', name: 'Sunny', species: 'seahorse', seed: 4, born: now - 30 * D, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, sex: 'm', mate: 'h2', lastBirth: now - D }, { id: 'h2', name: 'Pearl', species: 'seahorse', seed: 11, born: now - 30 * D, stage: 'adult', traits: ['Shy'], happy: 0.8, health: 1, sex: 'f', mate: 'h1' });
  s.decor.push({ id: 'p1', type: 'kelp', x: -2.4, z: 2.0, ry: 0 }, { id: 'p2', type: 'grass', x: -0.6, z: 2.2, ry: 0 });
  const k = { explore: 'Curious', plants: 'Calm', social: 'Social' }; s.nursery = { id: 'n7', father: 'h1', mother: 'h2', pa: { id: 'h1', name: 'Sunny', seed: 4 }, ma: { id: 'h2', name: 'Pearl', seed: 11 }, born: now - 3 * D, readyAt: now + 2 * D + 5 * 3600e3, n: 13, gen: 1, cands: ['explore', 'plants', 'social'].map((role, i) => ({ id: 'n7b' + i, name: ['Dot', 'Nori', 'Mango'][i], seed: 700 + i * 13, role, traits: [k[role]], sex: i ? 'f' : 'm' })) };
  g.emit('state'); for (const id of ['modal', 'coach', 'settle', 'toast']) document.getElementById(id)?.classList.remove('on'); });
await p.waitForTimeout(3000);
const tag = await p.evaluate(() => document.getElementById('moment')?.textContent?.replace(/\s+/g, ' ').trim() ?? '');
ck('the tag before they are ready is short and says what happens', /Babies leave the nursery in/.test(tag) && tag.length < 50, tag);
await p.screenshot({ path: `${OUT}/tag_waiting.png`, timeout: 180000 });
await p.evaluate(() => { const s = window.__game.state; s.nursery.readyAt = Date.now() - 1000; window.__game.emit('state'); }); await p.waitForTimeout(2000);
const tag2 = await p.evaluate(() => document.getElementById('moment')?.textContent?.replace(/\s+/g, ' ').trim() ?? ''); ck('ready: the tag says pick one to keep', /pick one to keep/.test(tag2), tag2);
let tapped = false; for (let i = 0; i < 40; i++) { const t = await p.evaluate(() => document.querySelector('#modal.on h2')?.textContent ?? ''); if (/ready/i.test(t)) break; if (t) await p.evaluate(() => document.querySelector('#modal.on #mok')?.click()); else if (i > 12 && !tapped) { tapped = true; await p.evaluate(() => document.getElementById('moment')?.click()); } await p.waitForTimeout(800); }      /* (it comes up by itself once they are ready; the tag only if it did not) */
const ch = await p.evaluate(() => ({ title: document.querySelector('#modal.on h2')?.textContent ?? '', rows: [...document.querySelectorAll('#modal.on [data-i]')].map((x) => x.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)) }));
ck('the choice offers all 13 babies', ch.rows.length === 13, ch);
await p.screenshot({ path: `${OUT}/chooser_top.png`, timeout: 180000 });
const pickName = await p.evaluate(() => { const r = [...document.querySelectorAll('#modal.on [data-i]')][8]; r.scrollIntoView(); r.click(); return r.textContent.trim().split(/\s/)[0]; }); await p.waitForTimeout(500);
const btn = await p.evaluate(() => { const b = document.querySelector('#modal.on #mok'), r = b.getBoundingClientRect(); return { text: b.textContent, inView: r.bottom <= innerHeight && r.top >= 0 }; });
ck('after scrolling to one of the others, the Keep button is still in view', btn.inView && /Keep/.test(btn.text), btn);
await p.screenshot({ path: `${OUT}/chooser_scrolled.png`, timeout: 180000 });
await p.evaluate(() => document.querySelector('#modal.on #mok').click()); for (let i = 0; i < 40; i++) { await p.waitForTimeout(700); const m = await p.evaluate(() => document.querySelector('#modal.on')?.innerText?.slice(0, 200) ?? ''); if (/Keep .*\?/.test(m)) { await p.evaluate(() => document.querySelector('#modal.on #mok')?.click()); } else if (!m && i > 30) break; }
const kept = await p.waitForFunction((nm) => { const s = window.__game.state; return !s.nursery && s.fish.find((f) => f.name === nm) && { id: s.fish.find((f) => f.name === nm).id, tank: window.__fishes.list.some((f) => f.name === nm && !f.dead), gone: s.lastDepart?.gone?.length }; }, pickName, { timeout: 60000 }).then((h) => h.jsonValue(), () => null);
ck('that baby, one of the ten, stays in the tank and the other twelve leave', kept && kept.tank && kept.gone === 12, { pickName, kept });
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Nursery choice checks passed'); process.exit(fails ? 1 : 0);

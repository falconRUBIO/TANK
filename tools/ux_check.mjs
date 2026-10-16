// The quiet helpers, seen working in the app: a first-time tip, a photo kept with a moment you saw, the goodbye card's memories, the fish card
// leading with what it is doing, and the "while you were away" card after a reload. Needs the solo game on 8123. node tools/ux_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
const clear = () => p.evaluate(() => document.querySelectorAll('#modal,#coach,#reunion,#toast,#settle,#goal').forEach((e) => e.classList.remove('on')));
await p.addInitScript(() => { window.__noTips = true; }); await p.goto('http://localhost:8123/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForFunction(() => window.__game?.state); await p.waitForTimeout(2000);
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; s.level = 6; localStorage.removeItem('ourtank.tips');
  s.fish.push({ id: 'p0', name: 'Marlin', species: 'goldfish', seed: 6, sex: 'm', born: now - 9 * D, stage: 'adult', traits: ['Brave'], happy: 1, health: 1, fedAt: now }, { id: 'p1', name: 'Coral', species: 'goldfish', seed: 5, sex: 'f', born: now - 9 * D, stage: 'adult', traits: ['Calm'], happy: 1, health: 1, fedAt: now });
  s.eggs = [{ id: 'e1', species: 'goldfish', a: 'p1', b: 'p0', seed: 5, laid: now - D, hatchAt: now + 2 * D, cared: [], guard: 'p0' }]; g.emit('state'); window.__noTips = false; window.__tipsSoon = true; });      // (tips only from here: the eggs are the first thing worth one)
for (let i = 0; i < 6; i++) { await p.waitForTimeout(800); if (await p.$('#modal.on #mok')) await p.click('#modal.on #mok').catch(() => {}); }
let tip = ''; for (let i = 0; i < 60 && !tip; i++) { await p.waitForTimeout(2000); tip = await p.evaluate(() => { document.querySelectorAll('#modal,#reunion,#settle,#goal').forEach((e) => e.classList.remove('on')); return (JSON.parse(localStorage.getItem('ourtank.tips') || '{}').eggs && document.querySelector('#coach')?.innerText) || ''; }); }      // (anything else on screen is put away, as you would)
ck('a first-time tip about the eggs appears, once', /EGGS IN THE TANK/i.test(tip), tip.replace(/\s+/g, ' ').slice(0, 90));
await p.waitForSelector('#coach.on #cbtn', { timeout: 60000 }).catch(() => {}); await p.evaluate(() => document.querySelector('#coach.on #cbtn')?.click());      // (a toast can hold a tip back for a moment: it comes once the toast has gone) await p.waitForTimeout(500);
const still = await p.evaluate(() => document.querySelector('#coach.on')?.innerText ?? '');
ck('"Got it" puts it away', !still, still.replace(/\s+/g, ' ').slice(0, 80));
await clear(); await p.evaluate(() => window.__game.addJournal('Marlin charged at Inky and drove it away from the eggs.')); await p.waitForTimeout(1500);
const shot = await p.evaluate(() => { try { return (JSON.parse(localStorage.getItem('ourtank.moments') || '[]')[0] ?? {}); } catch { return {}; } });
ck('the moment you saw is kept with a photo', /^data:image\/jpeg/.test(shot.img ?? '') && /drove it away/.test(shot.text ?? ''), `${Math.round((shot.img?.length ?? 0) / 1024)} KB`);
await p.evaluate(() => window.__ui.open('friends')); await p.waitForTimeout(600); await p.click('[data-sub="journal"]').catch(() => {}); await p.waitForTimeout(800);
ck('the journal shows that photo with its line', await p.evaluate(() => !!document.querySelector('#sheet .jpost .jimg img')));
await p.evaluate(() => { document.querySelector('nav [data-tab="tank"]')?.click(); }); await clear();
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(); (s.floaters ||= []).push({ id: 'fz', name: 'Nemo', species: 'goldfish', seed: 2, stage: 'adult', born: now - 30 * 864e5, died: now, owner: null, ownerName: 'You' });
  g.addJournal('Nemo keeps going back to the sea grass. It seems to be its favorite place.'); g.addJournal('Nemo and Dory are friends now.'); window.__showCard({ fid: 'fz', dead: true }); });
const bye = await p.evaluate(() => document.querySelector('#card ul.remember')?.innerText ?? '');
ck('the goodbye card remembers what it was known for', /favorite place/.test(bye) && /friends/.test(bye), bye.replace(/\s+/g, ' | '));
await clear(); const order = await p.evaluate(async () => { const f = window.__fishes.byId.get('p0'); f.thought = 'Fanning fresh water over the eggs.'; window.__showCard(f); await new Promise((r) => setTimeout(r, 300)); return document.querySelector('#card .tpane')?.firstElementChild?.className ?? ''; });
ck('the fish card leads with what it is doing now', /now/.test(order), order);
await p.evaluate(() => window.__game.save?.()); await p.context().addInitScript(() => localStorage.setItem('ourtank.seen.solo', String(Date.now() - 3600e3)));      // (leaving marks the visit; the page coming back finds it an hour old)
await p.reload(); await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 });
const recap = await p.waitForFunction(() => document.querySelector('#reunion.on')?.innerText ?? '', null, { timeout: 40000 }).then((h) => h.jsonValue()).catch(() => '');
ck('back after an hour, the recap card says what happened', /drove it away|Nemo|eggs/i.test(recap), recap.replace(/\s+/g, ' ').slice(0, 160));
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'UX checks passed'); process.exit(fails ? 1 : 0);

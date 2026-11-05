// An ordinary fish's day, in the real game: a day after the last one, one fish gets a line in the journal made from what is true of it (its best
// friend, its favorite place, its nature), never the octopus; and someone coming back finds it under While you were away in Today, ahead of
// routine lines. Health leads with the same Tank Health number as the ring at the top, with its two parts.   Needs the solo game on 8123.
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon&season=none'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state && window.__booted, null, { timeout: 120000 }); await p.waitForTimeout(1500);
const r = await p.evaluate(async () => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; const A = { born: now - 30 * D, stage: 'adult', happy: 0.8, health: 1, hunger: 0.2, owner: null };
  s.decor.push({ id: 'cv', type: 'cave', x: -1, z: 0.5, ry: 0 });
  s.fish.length = 0; s.fish.push({ ...A, id: 'o1', name: 'Inky', species: 'octopus', seed: 5, traits: ['Curious'] }, { ...A, id: 'g1', name: 'Nori', species: 'goldfish', seed: 3, traits: ['Brave'], pal: 'g2', spotId: 'cv' }, { ...A, id: 'g2', name: 'Neo', species: 'goldfish', seed: 8, traits: ['Shy'], pal: 'g1' });
  s.flags.fishDay = Math.floor(now / D) - 1; localStorage.setItem('ourtank.away', JSON.stringify({ from: now - 20 * 3600e3, to: now + 60e3 })); localStorage.removeItem('ourtank.awayCleared');
  g.emit('state'); await new Promise((res) => setTimeout(res, 4000));
  const told = s.fish.filter((f) => f.dayTold === s.flags.fishDay), lines = g.journal.filter((e) => e.ts > now - 10e3).map((e) => e.text), mine = told.map((f) => lines.find((l) => l.startsWith(f.name + ' ') && !/days old|best friends|favorite spot/.test(l))).filter(Boolean);
  window.__ui.open('notices'); await new Promise((res) => setTimeout(res, 800));
  const away = document.querySelector('#sheet .awayl')?.innerText ?? '';
  window.__ui.open('care'); document.querySelector('[data-act="healthopen"]')?.click(); await new Promise((res) => setTimeout(res, 1200));
  const top = [...document.querySelectorAll('header .hring b, header b')].map((e) => +e.textContent).filter((v) => v > 9), hv = +(document.querySelector('#sheet .havg .hring b')?.textContent ?? -1), parts = document.querySelectorAll('#sheet .havg .hpart').length;
  return { day: s.flags.fishDay, told: told.map((f) => f.name), mine, away, top, hv, parts, H: window.__tankHealth?.() ?? null }; });
ck('a day on, one fish is told about (never the octopus), with a line of its own', r.told.length >= 1 && !r.told.includes('Inky') && r.mine.length === r.told.length, r);
ck('that line is under While you were away in Today', r.mine.every((l) => r.away.includes(l)) && r.mine.length > 0, r.away.replace(/\n+/g, ' | ').slice(0, 300));
ck('Health leads with the same Tank Health number as the ring at the top, and shows its two parts', r.top.includes(r.hv) && r.parts === 2, { top: r.top, health: r.hv, parts: r.parts });
ck('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Fish day checks passed'); process.exit(fails ? 1 : 0);

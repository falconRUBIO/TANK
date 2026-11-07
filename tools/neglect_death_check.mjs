// Neglect, in the real game: after a week with no care an animal dies, its body stays in the tank, Care says "Remove <name> from the tank", and
// removing it takes it out and keeps its memorial. A fish floats belly-up; an octopus or a seahorse sinks limp to the sand; a crab stays drawn
// into its shell. Needs the solo game on 8123. node tools/neglect_death_check.mjs   (OUT=dir for screenshots)
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const out = process.env.OUT || null;
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForTimeout(800);
const d = (a) => p.evaluate((a) => window.__game.dispatch(a, { dev: true }), a);
await d({ t: 'tut', step: 5 }); for (let i = 0; i < 3; i++) await d({ t: 'dev', what: 'shells' });
for (const s of [3, 41]) await d({ t: 'buyFish', species: 'goldfish', name: 'G' + s, seed: s, rush: true });
await p.waitForTimeout(1500); for (let k = 0; k < 4; k++) { if (await p.$('#modal.on #mok')) await p.evaluate(() => document.querySelector('#modal.on #mok')?.click()); await p.waitForTimeout(500); }
await d({ t: 'dev', what: 'neglect' }); await p.waitForFunction(() => window.__game.state.floaters?.length, null, { timeout: 15000 }).catch(() => {});
const st = await p.evaluate(() => ({ fl: window.__game.state.floaters.map((f) => f.name), mem: window.__game.state.memorial.map((m) => [m.name, !!m.neglect]), n: window.__game.state.fish.length }));
ck('a week without care: one animal has died and its body is in the tank', st.fl.length === 1 && st.mem.some((m) => m[1]), JSON.stringify(st));
// the goodbye card: it says the body is still there, with Remove and Later
for (let k = 0; k < 40 && !(await p.$('#modal.on .mourn')); k++) { if (process.env.DBG) console.log('    modal:', await p.evaluate(() => document.querySelector('#modal.on')?.textContent.replace(/\s+/g, ' ').slice(0, 100) ?? '(none)')); if (await p.$('#modal.on #mok')) await p.evaluate(() => document.querySelector('#modal.on #mok')?.click()); await p.waitForTimeout(1000); }      // (anything else on screen first goes; the goodbye queues behind it)
const mourn = await p.evaluate(() => document.querySelector('#modal.on .mourn')?.textContent.replace(/\s+/g, ' ') ?? '');
ck('the goodbye says why, and that its body is still in the tank', /too long without food and clean water/.test(mourn) && /still in the tank/.test(mourn) && /Remove from the tank/.test(mourn), mourn.slice(0, 220));
await p.evaluate(() => document.getElementById('mno')?.click()); await p.waitForTimeout(800);
const goal = await p.textContent('#goal').catch(() => ''); ck('the status line points to Care', /has died\. Remove them from the tank in Care/.test(goal ?? ''), goal);
// Care: the row under Needs you
await p.evaluate(() => window.__ui?.open?.('care')); await p.waitForTimeout(900);
if (!(await p.$('[data-act^="rest:"]'))) { await p.evaluate(() => document.querySelector('[data-tab="care"]')?.click()); await p.waitForTimeout(900); }
const row = await p.evaluate(() => { const r = document.querySelector('.crow[data-act^="rest:"]'); return r ? { text: r.textContent.replace(/\s+/g, ' ').trim(), due: r.classList.contains('due'), vis: r.getBoundingClientRect().height > 0 } : null; });
ck('Care has a "Remove <name> from the tank" row under Needs you', !!row && row.due && row.vis && new RegExp(`Remove ${st.fl[0]} from the tank`).test(row.text), JSON.stringify(row));
if (out) await p.screenshot({ path: out + '/neglect_care_row.png' });
await p.evaluate(() => document.querySelector('.crow[data-act^="rest:"] .cbtn')?.click()); await p.waitForTimeout(1500);
const after = await p.evaluate(() => ({ fl: window.__game.state.floaters.length, rested: window.__game.state.memorial.map((m) => !!m.rested), row: !!document.querySelector('.crow[data-act^="rest:"]') }));
ck('Remove takes the body out, the memorial stays, and the row is gone', after.fl === 0 && after.rested.some(Boolean) && !after.row, JSON.stringify(after));
// how each kind lies once it has died (drawn from a floater record, as after a reload)
await p.evaluate(() => document.querySelector('#sheet .x, .sheet .x, [data-close]')?.click());
const lie = await p.evaluate(async () => { const F = window.__fishes, s = window.__game.state, now = Date.now(), fl = [{ id: 'zo', name: 'Inky', species: 'octopus', seed: 3, stage: 'adult', born: now - 9e8, died: now }, { id: 'zs', name: 'Hush', species: 'seahorse', seed: 4, stage: 'adult', born: now - 9e8, died: now }, { id: 'zc', name: 'Nip', species: 'blueleg', seed: 5, stage: 'adult', born: now - 9e8, died: now }, { id: 'zf', name: 'Fin', species: 'goldfish', seed: 6, stage: 'adult', born: now - 9e8, died: now }];
  F.sync({ ...s, floaters: [...(s.floaters ?? []), ...fl] }); for (let i = 0; i < 400; i++) F.list.forEach((f) => f.update(0.05, Math.random, F.list));      // (all at once: a yield would let the game's own sync take the made-up bodies away)
  const g = (id) => { const f = F.byId.get(id); return f ? { y: +f.pos.y.toFixed(2), dead: !!f.dead, crab: !!f.crab, roll: +(f.roll ?? 0).toFixed(2) } : null; }, r = { o: g('zo'), s: g('zs'), c: g('zc'), f: g('zf') };
  F.sync(s); return r; });
ck('a fish floats belly-up at the surface', lie.f && lie.f.y > 11 && Math.abs(lie.f.roll - Math.PI) < 0.3, JSON.stringify(lie.f));
ck('an octopus sinks limp to the sand', lie.o && lie.o.dead && lie.o.y < 2.5, JSON.stringify(lie.o));
ck('a seahorse sinks to the sand, on its side', lie.s && lie.s.dead && lie.s.y < 2.5 && Math.abs(lie.s.roll - Math.PI / 2) < 0.3, JSON.stringify(lie.s));
ck('a crab stays drawn into its shell on the sand', lie.c && lie.c.dead && lie.c.crab && lie.c.y < 2.5, JSON.stringify(lie.c));
ck('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Neglect death checks passed'); process.exit(fails ? 1 : 0);

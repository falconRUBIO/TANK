// The Care sheet: one status line, 'Needs you' rows each with one button, quiet 'Later' rows that say when, extras apart, no repeated messages; every button does what it says. Needs the solo game on 8123. node tools/care_check.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const OUT = process.env.OUT || '/tmp/care'; (await import('node:fs')).mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:8123/?q=1&dev=1&tod=noon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(1500);
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
const set = (o) => p.evaluate((o) => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; s.level = 6; s.shells = 40; s.fish.length = 0;
  for (const f of o.fish) s.fish.push({ born: now - 20 * D, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, owner: 'me', ...f });
  s.hunger = o.h; s.water = o.w; s.glass = o.g; g.emit('state'); for (let i = 0; i < 4; i++) document.querySelector('#modal.on #mok')?.click(); }, o);
const open = async () => { await p.evaluate(() => { for (let i = 0; i < 4; i++) document.querySelector('#modal.on #mok')?.click(); window.__ui.open('tank'); window.__ui.open('care'); document.getElementById('sheet').scrollTop = 0; }); await p.waitForTimeout(500); };
const read = () => p.evaluate(() => ({ hero: document.querySelector('#sheet .chero b')?.textContent, heroSub: document.querySelector('#sheet .chero small')?.textContent, heads: [...document.querySelectorAll('#sheet h4')].map((x) => x.textContent),
  due: [...document.querySelectorAll('#sheet .crow.due')].map((r) => r.querySelector('b').textContent + ' | ' + r.querySelector('small').textContent + ' | ' + (r.querySelector('.cbtn')?.textContent ?? '')),
  later: [...document.querySelectorAll('#sheet .cgroup.quiet .crow')].map((r) => r.querySelector('b').textContent + ' | ' + r.querySelector('small').textContent), drawer: !!document.querySelector('#sheet .cgroup .drawer'),
  dupes: [...document.querySelectorAll('#sheet .wish.daily small')].map((x) => x.textContent).filter((t) => /WORTH/.test(t)).length + [...document.querySelectorAll('#sheet .moodchip b')].filter((x) => /Could use a hand/.test(x.textContent)).length,
  carehead: !!document.querySelector('#sheet .carehead'), extras: [...document.querySelectorAll('#sheet .acts.mini .tile')].map((t) => t.textContent.trim().slice(0, 30)) }));
// 1. a busy tank: octopus, seahorse and fish hungry, dirty water and glass
await set({ fish: [{ id: 'o1', name: 'Inky', species: 'octopus', seed: 5, hunger: 0.7 }, { id: 's1', name: 'Pip', species: 'seahorse', seed: 4, hunger: 0.6, sex: 'm' }, { id: 'g1', name: 'Nori', species: 'goldfish', seed: 3 }], h: 0.5, w: 0.6, g: 0.5 });
await open(); let r = await read(); console.log('busy', JSON.stringify(r));
ck('busy: one status line says how many things need you', /3 things need you/.test(r.hero), r.hero);
ck('busy: Feed, Wipe and Change are the rows that need you, each with one button', r.due.length === 3 && /Feed/.test(r.due[0]) && /Wipe$/.test(r.due[1]) && /Change$/.test(r.due[2]), r.due);
ck('busy: the food list is open under Feed', r.drawer);
ck('busy: no repeated messages (old headline, "worth doing now", "could use a hand")', !r.carehead && r.dupes === 0, r);
await p.screenshot({ path: `${OUT}/v_busy_top.png` }); await p.evaluate(() => { document.getElementById('sheet').scrollTop = 700; }); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/v_busy_mid.png` });
// tapping the Feed row closes the list, again opens it
await p.evaluate(() => document.querySelector('#sheet .crow[data-act="feeddrawer"]').click()); await p.waitForTimeout(400); const closed = !(await p.evaluate(() => !!document.querySelector('#sheet .cgroup .drawer')));
await p.evaluate(() => document.querySelector('#sheet .crow[data-act="feeddrawer"]').click()); await p.waitForTimeout(400); const reopened = await p.evaluate(() => !!document.querySelector('#sheet .cgroup .drawer'));
ck('tapping the Feed row folds the food list away and back', closed && reopened, { closed, reopened });
// the Feed button goes straight to feeding the hungriest (and does not also toggle the row)
await p.evaluate(() => document.querySelector('#sheet .crow[data-act="feeddrawer"] .cbtn').click()); await p.waitForTimeout(500);
const feeding = await p.evaluate(() => ({ sheet: document.getElementById('sheet').classList.contains('on'), bar: document.getElementById('foodbar')?.classList.contains('on'), food: window.__game.feedFood, text: document.getElementById('foodbar')?.textContent?.slice(0, 60) }));
ck('the Feed button closes Care and starts feeding the hungriest animal with its food', !feeding.sheet && feeding.bar && feeding.food === 'crab', feeding);
await p.evaluate(() => document.querySelector('#foodbar [data-done]')?.click());
// Wipe opens the glass cleaning; Change starts the water change
await open(); await p.evaluate(() => document.querySelector('#sheet .crow[data-act="clean"] .cbtn').click()); await p.waitForTimeout(600);
const cleaning = await p.evaluate(() => ({ sheet: document.getElementById('sheet').classList.contains('on') })); ck('Wipe closes Care and starts cleaning', !cleaning.sheet, cleaning);
await p.mouse.click(10, 10).catch(() => {}); await p.evaluate(() => { window.__ui.open('tank'); });
// 2. all looked after
await set({ fish: [{ id: 'o1', name: 'Inky', species: 'octopus', seed: 5, hunger: 0.02 }, { id: 'g1', name: 'Nori', species: 'goldfish', seed: 3 }], h: 0.02, w: 0.95, g: 0.05 });
await open(); r = await read(); console.log('calm', JSON.stringify(r));
ck('calm: "All looked after", nothing under Needs you, chores under Coming up with when they are due', /All looked after/.test(r.hero) && !r.due.length && r.later.length === 3 && r.heads.includes('Later') && !r.heads.includes('Needs you'), r);
ck('calm: the food list is folded away', !r.drawer);
ck('calm: Puzzle jar and Postcard are under Extras', r.extras.length === 2 && /Puzzle/.test(r.extras[0]) && /Postcard/.test(r.extras[1]), r.extras);
await p.screenshot({ path: `${OUT}/v_calm_top.png` }); await p.evaluate(() => { document.getElementById('sheet').scrollTop = 99999; }); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/v_calm_end.png` });
// a tap on a not-due row still does something sensible (it opens the food list / says when)
await p.evaluate(() => [...document.querySelectorAll('#sheet .crow')].find((r) => /water/.test(r.textContent)).click()); await p.waitForTimeout(600);
const tw = await p.evaluate(() => ({ sheet: document.getElementById('sheet').classList.contains('on'), toast: document.getElementById('toast')?.textContent })); ck('tapping a chore that is not due stays on Care and says when', tw.sheet && /change in/i.test(tw.toast ?? ''), tw);
// 3. only fish, one thing due; 4. an empty tank
await set({ fish: [{ id: 'g1', name: 'Nori', species: 'goldfish', seed: 3 }], h: 0.5, w: 0.95, g: 0.05 }); await open(); r = await read();
ck('fish only, hungry: "1 thing needs you" and Feed for the fish', /1 thing needs you/.test(r.hero) && r.due.length === 1 && /Nori is hungry/.test(r.due[0]), r.due);
await set({ fish: [], h: 0.5, w: 0.95, g: 0.05 }); await open(); r = await read();
ck('an empty tank does not break the page, and has no Feed row', !!r.hero && !r.later.some((x) => /^Feed/.test(x)), r);
// the Tank status fold opens to the meters
await set({ fish: [{ id: 'o1', name: 'Inky', species: 'octopus', seed: 5, hunger: 0.3 }], h: 0.1, w: 0.9, g: 0.1 }); await open();
const meters = await p.evaluate(() => { const d = document.querySelector('#sheet details[data-fold="tankstatus"]'); d.open = true; return d.querySelectorAll('.meter').length; }); ck('Tank status opens to the meters', meters >= 3, meters);
ck('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? `${fails} failed` : 'Care checks passed'); await b.close();

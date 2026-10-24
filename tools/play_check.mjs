// Play features behave as the screen says: toy goes give feedback and a repeat inside 20 s says so; the hide list only offers places the octopus
// can search; trick buttons name the trick and show the rest; the Play tiles name the same octopus the games use. Solo static server on :8123.
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
await p.goto('http://localhost:8123/?lite=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 60000 }); await p.click('#mok'); await p.waitForTimeout(600);
const r = await p.evaluate(async () => {
  const g = window.__game; g.state.level = 4; g.state.flags.tut = 5; for (let i = 0; i < 6; i++) await g.dispatch({ t: 'dev', what: 'shells' }, { dev: true });
  const o = g.state.fish.find((f) => f.species === 'octopus'); o.born = Date.now() - 20 * 864e5; o.stage = 'adult'; o.bond = { me: 9 };
  await g.dispatch({ t: 'buyFish', species: 'goldfish', name: 'Ann', seed: 3, rush: true }, { dev: true }); await g.dispatch({ t: 'buyFish', species: 'blueleg', name: 'Cal', seed: 4, rush: true }, { dev: true });
  for (const [type, x] of [['rock', -2], ['starfish', 0], ['moss', 1], ['pot', 2], ['grass', -1]]) await g.dispatch({ t: 'buyDecor', type, x, z: 1, ry: 0 }, { dev: true });
  await new Promise((r) => setTimeout(r, 1200));
  const toasts = []; const T = window.__ui; const t0 = T.toast; T.toast = (m, ms) => { toasts.push(String(m)); return t0.call(T, m, ms); };
  const ids = g.state.fish.map((f) => f.id); window.__toys.onDone('ball', ids); await new Promise((r) => setTimeout(r, 400)); window.__toys.onDone('ball', ids); await new Promise((r) => setTimeout(r, 400));
  T.toast = t0;
  // the Play tab
  T.open('care'); await new Promise((r) => setTimeout(r, 400)); document.querySelector('[data-csub="play"]')?.click(); await new Promise((r) => setTimeout(r, 500));
  const play = document.querySelector('#sheet')?.innerText ?? '';
  const toyProg = [...document.querySelectorAll('#sheet .toy em')].map((e) => e.textContent);
  // the hide list: open it and read the options, then cancel
  const hideBtn = document.querySelector('#sheet [data-act="hide"]'); hideBtn?.click(); await new Promise((r) => setTimeout(r, 600));
  const opts = [...document.querySelectorAll('#modal .opt, #modal button, #modal li')].map((e) => e.textContent.trim()).filter(Boolean), modalText = document.querySelector('#modal')?.innerText ?? ''; document.querySelector('#modal .x, #modal #mcancel, #modal [data-cancel]')?.click(); document.getElementById('mok')?.click();
  return { toasts, play: play.slice(0, 400), toyProg, opts, modalText, octo: o.name, tiles: [...document.querySelectorAll('#sheet .tile small')].map((e) => e.textContent) };
});
console.log(JSON.stringify(r).slice(0, 1200));
ok(r.toasts.some((x) => /joined in · ball 1 of 5/.test(x)), 'the first go says who joined and how far along: ' + r.toasts[0]);
ok(r.toasts.some((x) => /Same go with the ball: it counts again in \d+ s/.test(x)), 'the second go inside 20 s says so');
ok(r.toyProg.some((x) => /learning/.test(x)), 'the Toy box shows who is learning: ' + r.toyProg.join(' | '));
ok(r.tiles.some((x) => new RegExp('5 🐚 · ' + r.octo + ' hunts').test(x)), 'the hide tile names the cost and the octopus: ' + r.tiles.join(' | ')); ok(/pays 10 back/.test(r.modalText), 'the chooser names the payout: ' + r.modalText.replace(/\s+/g, ' ').slice(0, 120));
ok(r.opts.length >= 2 && !r.opts.some((x) => /starfish|moss/i.test(x)) && r.opts.some((x) => /rock|pot|grass/i.test(x)), 'the hide list offers only places with somewhere to hide: ' + r.opts.join(' | '));
// trick buttons on the octopus card
const trick = await p.evaluate(async () => { const g = window.__game, o = g.state.fish.find((f) => f.species === 'octopus'); window.__ui.open('tank'); await new Promise((r) => setTimeout(r, 300)); window.__focus(window.__fishes.list.indexOf(window.__fishes.byId.get(o.id))); await new Promise((r) => setTimeout(r, 900)); return [...document.querySelectorAll('#card button.lnk')].map((b) => b.textContent); });
console.log(JSON.stringify(trick));
ok(trick.some((x) => /^Teach: \w/.test(x)) && !trick.some((x) => /^Teach a trick/.test(x)), 'trick buttons name the trick');
await b.close(); console.log(fails ? `${fails} failed` : 'play_check passed');

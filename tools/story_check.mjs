// The animal's own history and the habitat report (v333): a journal line about an animal shows on its card's Journal tab with a permanent life
// summary; the Health screen says how the animals really use the habitat. Solo static server on :8123.
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
await p.goto('http://localhost:8123/?lite=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 60000 }); await p.click('#mok'); await p.waitForTimeout(600);
const r = await p.evaluate(async () => {
  const g = window.__game, D = 864e5; g.state.level = 4; g.state.flags.tut = 5; for (let i = 0; i < 6; i++) await g.dispatch({ t: 'dev', what: 'shells' }, { dev: true });
  await g.dispatch({ t: 'buyFish', species: 'goldfish', name: 'Pip', seed: 3, rush: true }, { dev: true }); await g.dispatch({ t: 'buyFish', species: 'platy', name: 'Quill', seed: 4, rush: true }, { dev: true });
  await g.dispatch({ t: 'buyDecor', type: 'cave', x: 0, z: 1, ry: 0 }, { dev: true }); await new Promise((r) => setTimeout(r, 900));
  const cave = g.state.decor.find((d) => d.type === 'cave'), pip = g.state.fish.find((f) => f.name === 'Pip'), q = g.state.fish.find((f) => f.name === 'Quill 1');
  // a real report from the lead phone: Pip spent its time by the cave, and kept company with Quill, three times
  const logRes = []; for (let k = 1; k <= 3; k++) logRes.push(await g.dispatch({ t: 'fishLog', logs: [{ fish: pip.id, dist: 2, lv: { low: 100 }, places: [cave.id], secs: { [cave.id]: 170 }, near: { [q.id]: 180 } }] }, { dev: true, now: g.now() + k * 6e5 }).then((x) => JSON.stringify(x).slice(0, 120), (e) => 'threw ' + e.message));      /* (each report's answer, for the line below when it is not taken) */
  const J = (g.journal ?? []).filter((j) => j.about?.includes(pip.id)).map((j) => j.text);
  // the Health screen
  window.__ui.open('care'); await new Promise((r) => setTimeout(r, 400)); document.querySelector('#sheet [data-act="healthopen"]')?.click(); await new Promise((r) => setTimeout(r, 600));
  const hab = [...document.querySelectorAll('#sheet .hhab li')].map((e) => e.textContent);
  // the card's Journal tab
  window.__ui.open('tank'); await new Promise((r) => setTimeout(r, 300)); window.__focus(window.__fishes.list.indexOf(window.__fishes.byId.get(pip.id))); await new Promise((r) => setTimeout(r, 800)); document.querySelector('#card .tb[data-tab="jour"]')?.click(); await new Promise((r) => setTimeout(r, 500));
  const life = [...document.querySelectorAll('#card .life li')].map((e) => e.textContent), story = [...document.querySelectorAll('#card ul.story li')].map((e) => e.textContent);
  return { pal: pip.pal, spot: pip.spotId, cave: cave.id, J, hab, life, story, logRes };
});
console.log(JSON.stringify(r).slice(0, 1200));
ok(r.spot === r.cave, 'Pip took to the cave from real time spent' + (r.spot === r.cave ? '' : ` (its spot ${r.spot}, the cave ${r.cave}; the three reports: ${r.logRes.join(' | ')})`)); ok(r.pal, 'Pip and Quill are best friends from real time together');
ok(r.J.some((x) => /favorite|taken to the reef cave|best friends/.test(x)), 'the tank journal lines about Pip carry its id: ' + r.J.join(' | '));
ok(r.hab.some((x) => /Pip has started resting by the reef cave/.test(x)), 'Health says how Pip uses the habitat: ' + r.hab.join(' | '));
ok(r.life.some((x) => /Came home/.test(x)) && r.life.some((x) => /favorite spot/.test(x)) && r.life.some((x) => /Best friends with Quill/.test(x)), 'the card keeps its life summary: ' + r.life.join(' | '));
ok(r.story.some((x) => /best friends/.test(x)) && r.story.some((x) => /reef cave/.test(x)), 'and its own journal lines: ' + r.story.slice(0, 4).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'story_check passed');

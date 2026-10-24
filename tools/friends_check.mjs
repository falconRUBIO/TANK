// Living aquarium: friendships grow from time really spent together. The lead phone tallies who each fish keeps company with (knowT) and
// reports it with its fish log (near); the rules fold it into f.know and, after eight minutes over three reports, make the two best friends.
// This drill pins a clownfish and a platy side by side in the real 3D tank, forces the report, and checks the whole path end to end.
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
await p.goto('http://localhost:8123/?lite=1&dev=1'); await p.waitForSelector('#modal.on #mok', { timeout: 60000 }); await p.click('#mok'); await p.waitForTimeout(600);
const r = await p.evaluate(async () => {
  const g = window.__game, F = window.__fishes; g.state.level = 4; g.state.flags.tut = 5; for (let i = 0; i < 10; i++) await g.dispatch({ t: 'dev', what: 'shells' }, { dev: true });
  await g.dispatch({ t: 'buyFish', species: 'goldfish', name: 'Ann', seed: 3, rush: true }, { dev: true }); await g.dispatch({ t: 'buyFish', species: 'platy', name: 'Bo', seed: 4, rush: true }, { dev: true }); await g.dispatch({ t: 'buyFish', species: 'guppy', name: 'Gus', seed: 5, rush: true }, { dev: true });
  await g.dispatch({ t: 'buyDecor', type: 'rock', x: 0, z: 1, ry: 0 }, { dev: true }); await new Promise((r) => setTimeout(r, 1500));
  const by = (n) => { const rec = g.state.fish.find((x) => x.name === n); return rec && F.byId.get(rec.id); }; let a = by('Ann'), bo = by('Bo 1'), gus = by('Gus 1'); for (let k = 0; k < 20 && !(a && bo && gus); k++) { await new Promise((r) => setTimeout(r, 500)); a = by('Ann'); bo = by('Bo 1'); gus = by('Gus 1'); } if (!a || !bo || !gus) return { err: 'fish not in the 3D list', n: F.list.length, names: g.state.fish.map((x) => x.name), orders: (g.state.orders ?? []).length };
  const sent = []; const prev = F.onLog; F.onLog = (logs) => { sent.push(JSON.parse(JSON.stringify(logs))); };
  // pin Ann and Bo together (and Gus far off) through 1200 sense ticks: knowT grows half a second a tick
  for (let i = 0; i < 1200; i++) { a.pos.set(0.3, 4, 1); bo.pos.set(0.9, 4, 1.2); gus.pos.set(-4, 7, -1); F.update(0.5, i * 0.5); F.observe(0.5, i * 0.5); }
  const know = { ...a.knowT }; F.logAt = -1e9; F.observe(0.5, 601); F.onLog = prev;
  const e = sent[0]?.find((x) => x.fish === a.fid), nearIds = Object.keys(e?.near ?? {});
  // the rules: three such reports, eight minutes between, make them best friends; the guppy (a bully) is never counted
  const now = g.now(); const rep = async (k) => g.dispatch({ t: 'fishLog', logs: [{ fish: a.fid, dist: 1, lv: {}, places: [], near: { [bo.fid]: 180, [gus.fid]: 180 } }] }, { dev: true, now: now + k * 6e5 });
  await rep(1); await rep(2); const before = g.state.fish.find((x) => x.id === a.fid).pal; await rep(3);
  const A = g.state.fish.find((x) => x.id === a.fid), B = g.state.fish.find((x) => x.id === bo.fid);
  return { nearIds, a: a.fid, bo: bo.fid, gus: gus.fid, knowBo: know[bo.fid], knowGus: know[gus.fid], before, palA: A.pal, palB: B.pal, knowA: A.know, storyA: (A.story ?? []).map((x) => x.text), journal: (g.state.journal ?? g.journal ?? []).slice(-6).map((j) => j.text ?? j) };
});
console.log(JSON.stringify(r));
ok(!r.err, 'the three fish are in the 3D tank'); ok((r.knowBo ?? 0) >= 40, `Ann kept company with Bo for ${r.knowBo}s of sense ticks since the last report (each report resets the tally)`); ok(!(r.knowGus > 20), 'and not with Gus, who was across the tank');
ok(r.nearIds.includes(r.bo) && !r.nearIds.includes(r.gus), 'the fish log reports Bo under near, not Gus'); ok(!r.before, 'two reports are not enough');
ok(r.palA === r.bo && r.palB === r.a, 'after the third report Ann and Bo are best friends, both ways'); ok(!r.knowA?.[r.gus], 'time near the damselfish, a bully, is never counted');
ok(r.storyA.some((x) => /best friends/.test(x)), 'it is in Ann\'s own story'); ok(r.journal.some((x) => /Ann and Bo 1 are best friends now/.test(x)), 'and in the tank journal');
// the name pill says so when they swim together
await p.waitForTimeout(300); const pill = await p.evaluate(() => { const g = window.__game, F = window.__fishes, A = g.state.fish.find((x) => x.name === 'Ann'), a = F.byId.get(A.id), bo = F.byId.get(A.pal); a.pos.set(0, 4, 0); bo.pos.set(0.5, 4, 0); a.restK = 0; a.idle = 0; return window.__doing ? window.__doing(a) : null; });
console.log('pill:', pill); if (pill != null) ok(/best friend|looking at|resting|swimming|at its favorite/.test(pill), 'the name pill reads naturally: ' + pill);      // (it says "swimming with Bo, its best friend" when nothing more pressing is going on)
await b.close(); console.log(fails ? `${fails} failed` : 'friends_check passed');

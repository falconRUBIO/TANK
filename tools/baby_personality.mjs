// The three nursery babies, measured from what they do over a normal visit (3 and 5 minutes of tank time, stepped without drawing, for
// three different broods) once the brood has settled (day 3 of 5): all of them have come down to the plants and hold on in groups; the
// curious one makes the most little trips from its strand and holds on least; the calm one holds on most and keeps going back to its own
// stem; the social one holds on right beside a brother or sister the most. Needs the solo game on 8123.
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');      // (CI points PW_MODULE at its own playwright)
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 430, height: 932 } })).newPage(); const errors = []; let fails = 0;
p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
await p.goto('http://localhost:8123/?q=1&dev=1&tod=noon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(1500);
const runs = [];
for (const [brood, mins] of [['n1', 3], ['n2', 5], ['n3', 5]]) {
  const r = await p.evaluate(({ brood, mins }) => {
    const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; s.level = 8; s.hunger = 0.1; s.fish.length = 0; s.decor.length = 0;
    s.fish.push({ id: 'h1', name: 'Sunny', species: 'seahorse', seed: 4, born: now - 30 * D, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, sex: 'm', mate: 'h2', lastBirth: now - D },
      { id: 'h2', name: 'Pearl', species: 'seahorse', seed: 11, born: now - 30 * D, stage: 'adult', traits: ['Shy'], happy: 0.8, health: 1, sex: 'f', mate: 'h1' });
    s.decor.push({ id: 'p1', type: 'kelp', x: -2.4, z: 2.0, ry: 0 }, { id: 'p2', type: 'grass', x: -0.6, z: 2.2, ry: 0 }, { id: 'p3', type: 'sword', x: 1.2, z: 2.1, ry: 0 }, { id: 'p4', type: 'fern', x: 2.6, z: 1.8, ry: 0 }, { id: 'p5', type: 'red', x: 0.3, z: 0.4, ry: 0 }, { id: 'r1', type: 'rock', x: -3, z: 0.2, ry: 0 }, { id: 'c1', type: 'castle', x: 3, z: 0.4, ry: 0 });
    const k = { explore: 'Curious', plants: 'Calm', social: 'Social' }, seed = brood.charCodeAt(1) * 97;
    s.nursery = { id: brood, father: 'h1', mother: 'h2', pa: { id: 'h1', name: 'Sunny', seed: 4 }, ma: { id: 'h2', name: 'Pearl', seed: 11 }, born: now - 2 * D, readyAt: now + 3 * D, n: 12, gen: 1, cands: ['explore', 'plants', 'social'].map((role, i) => ({ id: brood + 'b' + i, name: ['Dot', 'Nori', 'Mango'][i], seed: seed + i * 13, role, traits: [k[role]], sex: i ? 'f' : 'm' })) };
    g.emit('state'); return true; }, { brood, mins });
  await p.waitForFunction(() => window.__fishes.list.filter((f) => f.nursery && window.__game.state.nursery.cands.some((c) => c.id === f.fid)).length === 3, null, { timeout: 60000 });      /* (the three who could stay; the rest of the brood, named too, swims as well) */ await p.waitForTimeout(1000);
  const out = await p.evaluate((mins) => { const F = window.__fishes, kids = F.list.filter((f) => f.nursery && window.__game.state.nursery.cands.some((c) => c.id === f.fid)); for (const f of kids) { f.bl = null; f.phN = 0; f.folT = 0; f.hs = 0; } const P = kids[0].constructor.prototype, o = P.pickHover, u = P.update; P.pickHover = function (r) { this.phN = (this.phN ?? 0) + 1; return o.call(this, r); }; window.__sim(Math.round(mins * 60 * 30), 1 / 30); P.pickHover = o;
    return Object.fromEntries(kids.map((f) => { const L = f.bl; return [f.role, { dist: +L.dist.toFixed(1), places: L.places.size, looks: L.looks ?? 0, meets: L.meets ?? 0, sib: +((L.sib ?? 0) / L.secs).toFixed(2), sibD: +((L.sibD ?? 0) / L.secs).toFixed(2), chain: L.chain ?? 0, chainR: L.holds ? +((L.chain ?? 0) / L.holds).toFixed(2) : 0, ph: f.phN, foll: !!f.follow, st: [f.exploreAt ? 'x' : '', f.holdfast ? 'h' : '', f.link ? 'l' : '', f.greet ? 'g' : ''].join(''), hitch: +(L.hitched / L.secs).toFixed(2), holds: L.holds, avgHold: L.holds ? +(L.hitched / L.holds).toFixed(0) : 0, home: L.home, plant: +(L.plant / L.secs).toFixed(2), swimWith: +(L.swimWith / L.secs).toFixed(2), fam: +(L.fam / L.secs).toFixed(2) }]; })); }, mins);
  console.log(`  ${brood} (${mins} min)`, JSON.stringify(out)); runs.push(out);
}
// a short visit is noisy (a baby may spend a minute eating, or the father may swim past), so each difference is judged on the three broods
// together, and must also hold in at least two of the three on its own
const mean = (role, k) => runs.reduce((a, r) => a + r[role][k], 0) / runs.length, most = (role, k, by = 1) => { const o = ['explore', 'plants', 'social'].filter((x) => x !== role); return mean(role, k) > by * Math.max(...o.map((x) => mean(x, k))) && runs.filter((r) => o.every((x) => r[role][k] > r[x][k])).length >= 2; };
const least = (role, k, by = 1) => { const o = ['explore', 'plants', 'social'].filter((x) => x !== role); return mean(role, k) * by < Math.min(...o.map((x) => mean(x, k))) && runs.filter((r) => o.every((x) => r[role][k] < r[x][k])).length >= 2; };
const sum = (role, k) => runs.reduce((a, r) => a + r[role][k], 0);
const show = (k) => Object.fromEntries(['explore', 'plants', 'social'].map((x) => [x, +mean(x, k).toFixed(2)]));
ck('the brood has come down to the plants: each of the three spends most of its time at a strand', ['explore', 'plants', 'social'].every((x) => mean(x, 'plant') > 0.5), show('plant'));
ck('the curious one travels furthest: little trips out from the strand and back', most('explore', 'dist', 1.15), show('dist'));
ck('the curious one holds on less than the calm one, and never for long', mean('explore', 'hitch') < mean('plants', 'hitch') && runs.every((r) => r.explore.avgHold <= 60), show('hitch'));
ck('the calm one holds on longest at a time', most('plants', 'avgHold', 1.2), show('avgHold'));
ck('the calm one keeps going back to its own stem', sum('plants', 'home') >= 0.6 * sum('plants', 'holds') && sum('plants', 'holds') >= 3, { holds: sum('plants', 'holds'), home: sum('plants', 'home') });
ck('the social one makes little chains: most of the times it holds on, it settles right against a brother or sister', sum('social', 'chain') >= 3 && mean('social', 'chainR') >= 0.5, { chain: show('chain'), share: show('chainR') });
ck('no page errors', errors.length === 0, errors.slice(0, 3));
console.log(fails ? `${fails} failed` : 'Baby personality checks passed'); await b.close(); process.exit(fails ? 1 : 0);

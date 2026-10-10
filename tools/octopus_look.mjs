// The octopus model alone, in its main poses, from the side, front, below and behind, for art review. OUT=dir node tools/octopus_look.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const OUT = process.env.OUT || '/tmp/octlook'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state && window.__fishes, null, { timeout: 120000 }); await p.waitForTimeout(2000);
await p.evaluate(async () => {
  const g = window.__game, s = g.state; s.flags.tut = 5; s.fish.length = 0; s.decor.length = 0;
  s.fish.push({ id: 'o1', name: 'Inky', species: 'octopus', seed: +(new URLSearchParams(location.search).get('seed') || 3), born: Date.now() - 9 * 864e5, stage: 'adult', traits: [], happy: 0.8, health: 1, appetite: 0, owner: null, bond: {} });
  g.emit('state'); await new Promise((r) => setTimeout(r, 1200)); document.querySelector('#goal')?.remove(); document.querySelector('#sub')?.remove();
  const o = window.__fishes.list[0]; window.__o = o; o.update = () => {}; o.pos.set(0, 5, 1); o.heading = 0; o.camoK = 0; o.setPale?.(0);
});
const POSES = { rest: { restK: 1, crawlK: 0 }, crawl: { restK: 0.25, crawlK: 1 }, jet: { restK: 0, crawlK: 0, sq: 0.6, glideK: 0.7 }, work: { restK: 0.7, workK: 1 } };
const VIEWS = { side: [0, 5, 13, 0, 4.6, 1], front: [12, 5, 3, 0, 4.6, 1], below: [4, 0.4, 11, 0, 4.4, 1], behind: [-12, 5, 4, 0, 4.6, 1] };
for (const [pn, pose] of Object.entries(POSES)) for (const [vn, cam] of Object.entries(VIEWS)) {
  await p.evaluate(({ pose, cam }) => { const o = window.__o; Object.assign(o, { restK: 0, crawlK: 0, sq: 0, glideK: 0, workK: 0, greetK: 0, dashK: 0, landK: 0, glassNear: 0 }, pose); o.phase = 1.3; o.setPose(o.phase, true); o.settle?.(); o.group.position.copy(o.pos); window.__cam = cam; }, { pose, cam });
  await p.waitForTimeout(1600); await p.screenshot({ path: `${OUT}/${pn}_${vn}.png`, clip: { x: 0, y: 120, width: 390, height: 520 } });
}
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();

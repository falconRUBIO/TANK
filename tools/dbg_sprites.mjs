import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { writeFileSync } from 'fs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage();
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForTimeout(3000);
const clip = { x: 100, y: 540, width: 190, height: 130 };
const names = await p.evaluate(() => window.__tank.scene.children.map((c, i) => i + ':' + c.type + ':' + (c.geometry?.type ?? '') + ':' + (c.isInstancedMesh ? c.count : '') + ':' + c.children.length));
const px = async () => (await p.screenshot({ clip, type: 'png' })).length;
const sum = async () => { const buf = await p.screenshot({ clip, type: 'jpeg', quality: 90 }); return buf.length; };
const b1 = await sum(); await p.waitForTimeout(1500); const b2 = await sum(); const noise = Math.abs(b1 - b2);
const res = ['noise ' + noise + ' base ' + b1];
for (let i = 0; i < names.length; i++) {
  if (/Light/.test(names[i])) continue;
  await p.evaluate((i) => { window.__tank.scene.children[i].visible = false; }, i); await p.waitForTimeout(2500);
  res.push(names[i] + ' size ' + (await sum()));
  await p.evaluate((i) => { window.__tank.scene.children[i].visible = true; }, i);
}
writeFileSync('/tmp/spr.log', res.join('\n') + '\nFINISHED'); await b.close();

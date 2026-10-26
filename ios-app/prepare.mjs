// Builds the app's copy of the game (www/) from web/: the same files the website serves, plus a meta tag naming the server to talk to.
// The server's address comes from TANK_SERVER_URL (for example https://our-tank.onrender.com). Run: TANK_SERVER_URL=... node prepare.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), src = path.join(here, '..', 'web'), out = path.join(here, 'www');
const server = (process.env.TANK_SERVER_URL ?? '').trim().replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(server)) { console.error('Set TANK_SERVER_URL to the server\'s https address, for example https://our-tank.onrender.com'); process.exit(1); }
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(src, out, { recursive: true, filter: (f) => !/(^|\/)(lab\.html|sw\.js)$/.test(f.slice(src.length)) });      // (no offline cache worker: the app already carries every file)
const index = path.join(out, 'index.html'); let html = fs.readFileSync(index, 'utf8');
// the app fills the whole screen, as the game does when opened from the home screen, so it is treated the same way (navigator.standalone)
const head = `<meta name="tank-server" content="${server}"><script>try{Object.defineProperty(navigator,'standalone',{value:true,configurable:true})}catch(e){}document.documentElement.classList.add('app')</script>`;
if (!html.includes('<meta charset="utf-8">')) { console.error('index.html has changed: put the server tag in by hand'); process.exit(1); }
html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">' + head);
fs.writeFileSync(index, html);
console.log(`www/ ready: ${fs.readdirSync(out).length} entries, talking to ${server}`);

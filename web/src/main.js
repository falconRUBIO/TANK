// OUR TANK: wires the game state, the 3D stage, the interface and the tutorial together.
import * as THREE from 'three';
import { Game, REASONS } from './game/game.js';
import { DECOR_DEF, SPECIES_DEF, DISCOVERIES, comfortOf, FOODS, FIRST_FISH, TRICKS, trickOptions, childrenOf, AIL_TIRED, AIL_WARN, fishPrice, isFree, STAGE_SCALE, stageOf, nextStage } from './game/rules.js';
import * as stg from './w3/stage.js';
import { swayTime, fishBoost } from './w3/voxshade.js';
import { Fish3D } from './w3/fish3d.js';
import { Fishes, TRAIT_TXT } from './w3/fishmgr.js';
import { DecorMgr } from './w3/decormgr.js';
import { Glow, Sightings } from './w3/fx.js';
import { lanternGlow } from './w3/items.js';
import { initUI } from './ui.js';
import { runOnboarding, Live, api, ensureRecoveryKey, leaveTankNow, pushState, pushToggle } from './online.js';
import { sfx, haptic } from './audio.js';

const { stage, canvas, IW, IH, camera, scene, composer, bokeh, grade, TOD, cur, env, lamp, halo, pool, qs, LITE } = stg;
const $ = (id) => document.getElementById(id);
const game = new Game();
window.__game = game;

// ── managers ──
const fishes = new Fishes(scene), decor = new DecorMgr(scene, env.colliders);
const sights = new Sightings(stg.scene); sights.hide = stg.hideForDepth; window.__sights = sights; window.__sight = (k) => { sights.clear(); return sights.spawn(k); };
const glow = new Glow(); stg.scene.add(glow.mesh); stg.hideForDepth.push(fishes.mesh, fishes.bm, decor.marker, glow.mesh);
fishes.onSprite = (sp) => stg.hideForDepth.push(sp); fishes.onSpriteGone = (sp) => { const i = stg.hideForDepth.indexOf(sp); if (i >= 0) stg.hideForDepth.splice(i, 1); };
fishes.spots = () => decor.spots();
fishes.hasBubbler = () => !!decor.bubbleSpot();
fishes.dailyKind = () => { const d = game.state?.daily; return d && !d.done ? d.kind : null; };
fishes.phase = () => { const h = new Date().getHours(); return h >= 5 && h < 11 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night'; };
// what the fish are really doing is reported to the game, a little at a time, and the game decides what counts
let lastObs = 0, obsQueue = [];
fishes.onObserve = (o) => { obsQueue.push(o); };
setInterval(() => { if (!game.state || performance.now() - lastObs < 1500 || !obsQueue.length) return; lastObs = performance.now(); game.observe(obsQueue.shift()); if (obsQueue.length > 8) obsQueue.length = 8; }, 800);
const rng = fishes.rng; fishes.defaultBubble = fishes.bubbleAt;

// ── the interface ──
let net = null, ui = null;
const copyText = async (t, ok) => { try { await navigator.clipboard.writeText(t); ui.toast(ok); } catch { ui.toast(t); } };
const nameOf = (id) => game.members?.find((m) => m.id === id)?.name ?? 'Someone';
const social = {
  chat: (t) => net?.chat(t), invite: () => ui.open('friends'),
  copy: () => { game.track('friend_invited'); copyText(game.code, 'Code copied'); },
  share: async () => { game.track('friend_invited'); const c = game.code, d = { title: 'OUR TANK', text: `Come help take care of our fish! Join my aquarium in OUR TANK. Code: ${c}`, url: `${location.origin}/join/${c}` }; try { if (navigator.share) await navigator.share(d); else copyText(`${d.text} ${d.url}`, 'Invite copied'); } catch { /* cancelled */ } },
  regen: async () => { const yes = await ui.dialog({ title: 'MAKE A NEW CODE?', text: 'The old code will stop working. Friends already in the tank stay.', ok: 'New code', cancel: 'Keep it' }); if (!yes) return; try { game.code = (await api('/api/tanks/code', {})).code; ui.refresh(); ui.toast('New code ready'); } catch (e) { ui.toast(e.message); } },
};

let feedMode = false, cleanMode = false, feedDrops = 0, feedIdle = 0, rearrange = false, focus = null;
const placebar = $('placebar');
const fail = (r) => { sfx('error'); ui.toast(REASONS[r.reason] ?? 'That did not work. Try again.'); };
function flyShells(n, from = [window.innerWidth / 2, window.innerHeight * 0.55]) {
  const to = $('shells').getBoundingClientRect(); sfx('coin'); haptic(8);
  for (let i = 0; i < Math.min(5, n); i++) {
    const el = document.createElement('div'); el.className = 'flyshell'; el.textContent = '🐚'; el.style.left = from[0] + (Math.random() - 0.5) * 50 + 'px'; el.style.top = from[1] + 'px'; document.body.append(el);
    const dx = to.left + 14 - from[0], dy = to.top + 8 - from[1], a = el.animate([{ transform: 'translate(0,0) scale(.6)', opacity: 0 }, { transform: `translate(${dx * 0.1}px,${-50 - i * 6}px) scale(1.15)`, opacity: 1, offset: 0.25 }, { transform: `translate(${dx}px,${dy}px) scale(.7)`, opacity: 0.9 }], { duration: 850 + i * 90, delay: i * 70, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' });
    a.onfinish = () => { el.remove(); const sh = $('shells'); sh.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)', color: '#f4dd9a' }, { transform: 'scale(1)' }], { duration: 260 }); };
  }
}
const shellToast = (r) => { if (r?.delta > 0) { ui.toast(`+${r.delta} shell${r.delta > 1 ? 's' : ''}`); flyShells(r.delta); } };

// feeding
// The food is chosen inside the Care menu (game.feedFood). Once you tap Feed the menu closes and only the tank is left: tap the water.
function startFeed() { cancelModes(); feedMode = true; feedDrops = 0; feedIdle = 0; ui.toast(`Tap the water to drop ${FOODS[game.feedFood ?? 'flakes'].label.toLowerCase()}`, 3500); }
function endFeed() { feedMode = false; }
async function dropFood(x) {
  if (game.state.hunger < 0.08) { ui.toast('The fish are full for now'); endFeed(); return; }
  if ((game.state.shells ?? 0) < FOODS[game.feedFood ?? 'flakes'].price) { game.feedFood = 'flakes'; ui.toast('Back to flakes. Not enough shells.'); }
  const food = game.feedFood ?? 'flakes'; fishes.drop(x, 7, food); sfx('splash'); haptic(8);
  feedDrops++; feedIdle = 0; if (feedDrops >= 3) endFeed();
  const r = await game.dispatch({ t: 'feed', x, food }); if (!r.ok) return fail(r);
  if (r.delta > 0) shellToast(r); tut.onFeed();
}
// glass cleaning
const gcv = $('glass'), gg = gcv.getContext('2d'); gcv.width = 195; gcv.height = 346;
function algae(n) { for (let i = 0; i < n; i++) { const edge = Math.random() < 0.6, x = edge ? (Math.random() < 0.5 ? Math.random() * 40 : 155 + Math.random() * 40) : Math.random() * 195, y = Math.pow(Math.random(), 0.6) * 346; gg.fillStyle = `rgba(${70 + Math.random() * 40},${130 + Math.random() * 40},${40 + Math.random() * 30},${0.12 + Math.random() * 0.2})`; gg.beginPath(); gg.arc(x, y, 1.2 + Math.random() * 4.5, 0, 6.3); gg.fill(); } }
let shownGlass = -1;
function syncGlass() { const g = game.state.glass; if (Math.abs(g - shownGlass) > 0.02 || g < 0.05) { if (g > shownGlass || shownGlass < 0) { gg.clearRect(0, 0, 195, 346); algae(Math.round(g * 900)); } else if (g < 0.05) gg.clearRect(0, 0, 195, 346); shownGlass = g; } }
function startClean() { cancelModes(); if (game.state.glass <= 0.12) { ui.toast('The glass is already clean'); return; } cleanMode = true; gcv.style.pointerEvents = 'auto'; ui.toast('Swipe the glass to wipe it clean'); }
let wiping = false;
const wipe = (e) => { const r = gcv.getBoundingClientRect(); gg.globalCompositeOperation = 'destination-out'; gg.beginPath(); gg.arc((e.clientX - r.left) / r.width * 195, (e.clientY - r.top) / r.height * 346, 16, 0, 6.3); gg.fill(); gg.globalCompositeOperation = 'source-over'; sfx('wipe'); };
gcv.addEventListener('pointerdown', (e) => { wiping = true; wipe(e); }); gcv.addEventListener('pointermove', (e) => { if (wiping) wipe(e); });
addEventListener('pointerup', async () => {
  if (!wiping) return; wiping = false;
  const d = gg.getImageData(0, 0, 195, 346).data; let left = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 14) left++;
  if (left / (d.length / 16) * 6 < 0.06) { cleanMode = false; gcv.style.pointerEvents = 'none'; gg.clearRect(0, 0, 195, 346); const r = await game.dispatch({ t: 'glass' }); if (r.ok) { shellToast(r); if (!r.delta) ui.toast('Spotless'); shownGlass = 0; } else fail(r); }
});
// water
async function changeWater() { if (game.state.water >= 0.7) { ui.toast('The water is already fresh'); return; } ui.toast('Changing the water…'); sfx('splash'); const r = await game.dispatch({ t: 'water' }); if (r.ok) shellToast(r); else fail(r); }

// ── placement & rearranging ──
const ray = new THREE.Raycaster(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
function rayFrom(ev) {
  const r = canvas.getBoundingClientRect(), sc = Math.max(r.width / IW, r.height / IH), dw = IW * sc, dh = IH * sc;
  const u = (ev.clientX - r.left - (r.width - dw) * 0.5) / dw, v = (ev.clientY - r.top - (r.height - dh) * 1.0) / dh;
  ray.setFromCamera(new THREE.Vector2(u * 2 - 1, -(v * 2 - 1)), camera); return ray;
}
let placing = null, resumeRearrange = false;           // placing: { type, id, free }
function startPlace(type, id = null) {
  const wasRearranging = rearrange; cancelModes(); ui.open('tank'); resumeRearrange = !!id && wasRearranging;
  $('prot').hidden = true; $('pok').hidden = false; $('pcan').textContent = 'Cancel';
  const s = game.state, free = !id && isFree(s, type), d = DECOR_DEF[type];
  const it = id ? s.decor.find((x) => x.id === id) : null;
  placing = { type, id, free }; decor.start({ type, id, x: it?.x ?? 0, z: it?.z ?? 1.6, ry: it?.ry ?? 0 });
  $('placehint').textContent = id ? "Slide to move it" : "Slide left or right";
  $('pok').textContent = id ? 'Place' : `Place · ${free ? 'FREE' : '🐚 ' + d.price}`; $('psell').hidden = !id; if (id) $('psell').textContent = `Sell +${Math.floor(d.price / 2)}`;
  placebar.classList.add('on'); updatePlaceOk();
}
const updatePlaceOk = () => { const p = decor.preview; $('pok').disabled = !p?.valid; };
function endPlace() { placing = null; placebar.classList.remove('on'); if (resumeRearrange) { resumeRearrange = false; setRearrange(true, true); } }
$('prot').onclick = () => { decor.rotate(); updatePlaceOk(); sfx('tap'); };
$('pcan').onclick = () => { sfx('tap'); if (placing) { decor.cancel(); endPlace(); } else if (rearrange) setRearrange(false); };
$('pok').onclick = async () => {
  const out = decor.commit(); if (!out) { sfx('error'); return; }
  const pl = placing; endPlace();
  const r = await game.dispatch(pl.id ? { t: 'moveDecor', id: pl.id, x: out.x, z: out.z, ry: out.ry } : { t: 'buyDecor', type: pl.type, x: out.x, z: out.z, ry: out.ry, free: pl.free });
  if (!r.ok) { fail(r); decor.sync(game.state.decor, game.state); return; }
  sfx('place'); haptic(14); if (!pl.id && !pl.free) ui.toast(`${DECOR_DEF[pl.type].label} placed`); decor.sync(game.state.decor, game.state); ui.updateHeader();
};
$('psell').onclick = async () => {
  const pl = placing; if (!pl?.id) return; decor.cancel(); endPlace();
  const r = await game.dispatch({ t: 'sellDecor', id: pl.id }); if (r.ok) { sfx('coin'); ui.toast(`Sold for ${r.delta} shell${r.delta === 1 ? '' : 's'}`); } else fail(r);
};
function cancelModes() { endFeed(); if (cleanMode) { cleanMode = false; gcv.style.pointerEvents = 'none'; } if (placing) { decor.cancel(); endPlace(); } setRearrange(false, true); }
function setRearrange(on, silent = false) {
  rearrange = on; if (ui) ui.rearrange = on;
  if (on) { placebar.classList.add('on'); $('placehint').textContent = 'Tap a decoration to move or sell it'; $('pok').hidden = true; $('prot').hidden = true; $('psell').hidden = true; $('pcan').textContent = 'Done'; }
  else if (!placing) { placebar.classList.remove('on'); }
}

// ── adopting fish ──
async function adopt(species) {
  const d = SPECIES_DEF[species], s = game.state;
  const names = d.count === 1 ? await ui.dialog({ title: `NAME YOUR ${d.label.toUpperCase()}`, text: 'It will be shared by everyone in the tank.', input: { value: ['Biscuit', 'Nori', 'Coral', 'Fin', 'Pearl', 'Sunny', 'Dot', 'Misty'][(s.fish.length * 3 + 1) % 8], placeholder: 'Name' }, ok: `Adopt · 🐚 ${fishPrice(species)}`, cancel: 'Not now' })
    : await ui.dialog({ title: `ADOPT A SCHOOL`, text: `Four ${d.label.toLowerCase()}s swim together. Choose a name for the group.`, input: { value: d.label.split(' ')[0], placeholder: 'Group name' }, ok: `Adopt · 🐚 ${fishPrice(species)}`, cancel: 'Not now' });
  if (!names) return;
  const r = await game.dispatch({ t: 'buyFish', species, name: names, seed: (Math.random() * 90000) | 0 });
  if (!r.ok) return fail(r);
  ui.open('tank'); sfx('buy'); ui.refresh();
}
const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
async function trimPlants() { const r = await game.dispatch({ t: 'trim' }); if (!r.ok) return fail(r); if (r.applied) { sfx('splash'); shellToast(r); } else ui.toast('Nothing needs trimming yet'); }
async function trainFish(f, key, spot) {
  const r = await game.dispatch({ t: 'train', id: f.fid, trick: key }); if (!r.ok) return fail(r);
  if (!r.applied) { ui.toast(`${f.name} needs a rest. Try again in ${Math.max(1, Math.ceil((r.wait ?? 0) / 60e3))} min.`); return; }
  setFocus(null); fishes.perform(f, key, spot); sfx('tap'); if (!r.learned) ui.toast(`${f.name} practised: ${r.n} of 5`);
}
function showTrick(f, key) { const o = (game.state.decor ?? []).find((d) => TRICKS[key].types.includes(d.type)); if (!o) { ui.toast('Needs the decoration to be in the tank'); return; } setFocus(null); fishes.perform(f, key, o.id); }
function trickBlock(rec) {
  const learned = (rec.tricks ?? []), opts = trickOptions(game.state, rec), done = learned.length ? `<div class="notes">Tricks: ${learned.map((k) => TRICKS[k]?.label).filter(Boolean).join(', ')}</div>` : '';
  return learned.map((k) => `<button class="lnk" data-show="${k}">Show trick</button>`).join('') + opts.map((o) => `<button class="lnk" data-train="${o.key}" data-spot="${o.spot}">Teach a trick (${o.have}/${o.need})</button>`).join('');
}
async function noteFish(f) {
  const txt = await ui.dialog({ title: `NOTE FOR ${f.name.toUpperCase()}`, text: 'Anyone in the tank can read it on the fish card. 40 characters.', input: { value: '' }, ok: 'Leave note', cancel: 'Cancel' }); if (!txt) return;
  const r = await game.dispatch({ t: 'fishNote', id: f.fid, text: txt }); if (!r.ok) fail(r); else { sfx('tap'); showCard(f); }
}
// how well the tank suits this fish, a wish it has, and notes people left it
function comfortBlock(rec) {
  const c = comfortOf(game.state, rec), w = game.state.want?.fish === rec.id ? game.state.want : null, notes = (rec.notes ?? []).map((n) => `<i>${esc(n.name)}:</i> ${esc(n.text)}`).join('<br>');
  return `<div class="cmf">Comfort: <b>${c.label}</b> · ${c.score}%${c.tips[0] ? `<small>${esc(c.tips[0])}</small>` : ''}${w ? `<small>✨ ${esc(w.text)}</small>` : ''}</div>${notes ? `<div class="notes">${notes}</div>` : ''}`;
}
async function renameFish(f) {
  const nm = await ui.dialog({ title: 'RENAME', input: { value: f.name }, ok: 'Save', cancel: 'Cancel' }); if (!nm) return;
  const r = await game.dispatch({ t: 'nameFish', id: f.fid, name: nm }); if (!r.ok) fail(r); else showCard(f);
}

// ── washed-in gift: a little bobbing find that never expires; tap it to pick it up ──
const driftTex = {};
function driftTexture(kind) {
  if (driftTex[kind]) return driftTex[kind];
  const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  if (kind === 'pearl') { px(5, 5, 6, 6, '#f4f0ff'); px(4, 6, 8, 4, '#f4f0ff'); px(6, 6, 2, 2, '#ffffff'); px(9, 9, 2, 2, '#c9bff0'); }
  else if (kind === 'treat') { px(5, 3, 6, 2, '#b98a52'); px(4, 5, 8, 8, '#6fc7a8'); px(5, 7, 6, 4, '#f6e7b4'); px(4, 12, 8, 1, '#3f8f78'); }
  else { px(4, 5, 8, 6, '#f2c9b8'); px(3, 7, 10, 3, '#f2c9b8'); px(5, 4, 6, 1, '#f9e3d8'); px(5, 6, 1, 4, '#d99a86'); px(8, 6, 1, 4, '#d99a86'); px(11, 7, 1, 3, '#d99a86'); px(4, 11, 8, 1, '#c27a68'); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return (driftTex[kind] = t);
}
const driftSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: driftTexture('shells'), transparent: true, depthWrite: false })); driftSp.scale.set(1.3, 1.3, 1); driftSp.visible = false; driftSp.renderOrder = 6; scene.add(driftSp);
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,240,190,.95)'); gr.addColorStop(0.4, 'rgba(255,214,120,.38)'); gr.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const driftGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })); driftGlow.renderOrder = 5; driftGlow.visible = false; scene.add(driftGlow); stg.hideForDepth.push(driftGlow);
stg.hideForDepth.push(driftSp);
let driftId = null;
function syncDrift() {
  const g = game.state?.drift; if (!g) { driftSp.visible = false; driftGlow.visible = false; driftId = null; return; }
  if (driftId !== g.id) { driftId = g.id; driftSp.material.map = driftTexture(g.kind); driftSp.material.needsUpdate = true; driftSp.position.set(g.x, 2.1, g.z); if (driftSp.userData.seen !== g.id) { driftSp.userData.seen = g.id; if (game.state.flags.tut >= 5) { sfx('arrive'); fishes.burst(driftSp.position); } } }
  driftSp.visible = true; driftGlow.visible = true;
}
function driftHit(ev) { const g = game.state?.drift; if (!g || !driftSp.visible) return false; const r = rayFrom(ev); return r.ray.distanceToPoint(driftSp.position) < 1.3; }
async function pickDrift() {
  const g = game.state.drift; if (!g) return; const at = driftSp.position.clone().project(camera), rc = canvas.getBoundingClientRect();
  const r = await game.dispatch({ t: 'collect', id: g.id }); if (!r.ok) return fail(r);
  fishes.burst(driftSp.position.clone()); sfx('coin'); haptic(10);
  if (r.delta > 0) flyShells(r.delta, [rc.left + (at.x * 0.5 + 0.5) * rc.width, rc.top + (-at.y * 0.5 + 0.5) * rc.height]); else if (r.kind === 'treat') { for (const f of fishes.list) fishes.burst(f.pos); }
}
// message in a bottle: only its addressee sees it; tap to open
const px16 = (draw) => { const c = document.createElement('canvas'); c.width = c.height = 16; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t; };
const bottleTex = px16((g) => { const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }; r(6, 1, 4, 2, '#b98a52'); r(7, 3, 2, 2, '#bfe8ee'); r(4, 5, 8, 9, '#a9dde6'); r(3, 7, 10, 5, '#a9dde6'); r(5, 7, 5, 5, '#fff6dc'); r(6, 8, 3, 1, '#c9a96a'); r(6, 10, 3, 1, '#c9a96a'); r(11, 6, 1, 6, '#e8fbff'); });
const eggTex = px16((g) => { const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }; const o = '#b8708f'; r(5, 2, 6, 1, o); r(4, 3, 8, 2, o); r(3, 5, 10, 7, o); r(4, 12, 8, 2, o); r(5, 14, 6, 1, o); r(6, 3, 4, 1, '#fff0f6'); r(5, 4, 6, 2, '#fff0f6'); r(4, 6, 8, 5, '#fff0f6'); r(5, 11, 6, 2, '#f4d2e0'); r(6, 13, 4, 1, '#e8bdd0'); r(6, 5, 2, 2, '#ffffff'); r(8, 8, 2, 1, '#e49abb'); r(6, 9, 1, 1, '#e49abb'); });
const bottleSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bottleTex, transparent: true, depthWrite: false })); bottleSp.scale.set(1.4, 1.4, 1); bottleSp.visible = false; bottleSp.renderOrder = 6; scene.add(bottleSp);
const bottleGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, color: 0xa8f0ff })); bottleGlow.renderOrder = 5; bottleGlow.visible = false; scene.add(bottleGlow);
stg.hideForDepth.push(bottleSp, bottleGlow);
const hashId = (id) => { let h = 7; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
let bottleId = null; const eggSprites = new Map();
function syncExtras() {
  const s = game.state, me = game.you?.userId, b = (s.bottles ?? []).find((x) => x.to === me);
  if (!b) { bottleSp.visible = bottleGlow.visible = false; bottleId = null; }
  else { if (bottleId !== b.id) { bottleId = b.id; const h = hashId(b.id); bottleSp.position.set(-3 + (h % 60) / 10, 2.1, 0.8 + ((h >> 8) % 20) / 10); if (s.flags.tut >= 5) { sfx('arrive'); fishes.burst(bottleSp.position); } } bottleSp.visible = bottleGlow.visible = true; }
  const ids = new Set((s.eggs ?? []).map((e) => e.id));
  for (const e of s.eggs ?? []) if (!eggSprites.has(e.id)) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: eggTex, transparent: true, depthWrite: false })); const h = hashId(e.id); sp.scale.set(1, 1, 1); sp.position.set(-3 + (h % 60) / 10, 0.7, 0.1 + ((h >> 8) % 14) / 10); sp.renderOrder = 4; scene.add(sp); stg.hideForDepth.push(sp); eggSprites.set(e.id, sp); }
  for (const [id, sp] of [...eggSprites]) if (!ids.has(id)) { scene.remove(sp); const i = stg.hideForDepth.indexOf(sp); if (i >= 0) stg.hideForDepth.splice(i, 1); eggSprites.delete(id); fishes.burst(sp.position); }
}
function bottleHit(ev) { return bottleSp.visible && rayFrom(ev).ray.distanceToPoint(bottleSp.position) < 1.3; }
async function openBottle() {
  const id = bottleId; if (!id) return; const r = await game.dispatch({ t: 'openBottle', id }); if (!r.ok) return fail(r); if (!r.applied) return;
  sfx('coin'); fishes.burst(bottleSp.position.clone()); await ui.dialog({ title: `FROM ${String(r.from ?? 'a friend').toUpperCase()}`, text: `“${r.note}”`, ok: 'Thank you' }); flyShells(4);
}
async function greetVisitor(f) {
  const r = await game.dispatch({ t: 'greet', id: f.fid }); if (!r.ok) return fail(r); if (!r.applied) return;
  sfx('level'); haptic(20); fishes.burst(f.pos); flyShells(4, [window.innerWidth / 2, window.innerHeight * 0.4]);
}
// playing: fish follow a fingertip along the glass. Five seconds of it builds the bond.
let play = null; const playPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -2.3), playHit = new THREE.Vector3();
function playWith(f) {
  if (play) return; play = { fish: f, until: performance.now() + 5500, moved: 0, last: null }; f.mul = 1.3;
  $('pet').disabled = true; $('pet').textContent = `${f.name} is watching your finger…`; ui.toast(`Drag your finger along the glass`, 3000);
}
function playPoint(ev) {
  if (!play || !rayFrom(ev).ray.intersectPlane(playPlane, playHit)) return; const p = play.fish; p.target.set(Math.max(-3.8, Math.min(3.8, playHit.x)), Math.max(1.2, Math.min(12.5, playHit.y)), 2.2); p.retarget = 1;
  if (play.last) play.moved += Math.hypot(playHit.x - play.last.x, playHit.y - play.last.y); play.last = { x: playHit.x, y: playHit.y };
}
async function finishPlay() {
  const { fish: f, moved } = play; play = null; f.mul = 0.35; if ($('pet')) { $('pet').disabled = false; $('pet').textContent = `Play with ${f.name}`; }
  if (moved < 2) { ui.toast(`Drag along the glass and ${f.name} will follow`); return; }
  const r = await game.dispatch({ t: 'pet', id: f.fid }); if (!r.ok) return fail(r);
  if (!r.applied) { ui.toast(`${f.name} is tired of playing for now`); return; }
  fishes.burst(f.pos); sfx('arrive'); haptic(10); f.vigor = Math.max(f.vigor, 1.1);
  if (r.delta > 0) flyShells(r.delta, [window.innerWidth / 2, window.innerHeight * 0.4]);
  showCard(f);
}
// photo mode: the clean tank frame, no interface
async function takePhoto() {
  const hidden = [...document.querySelectorAll('header, nav, #sheet, #goal, #card, #coach, #feedbar, #placebar, #toast, #glass')]; const prev = hidden.map((e) => e.style.visibility); hidden.forEach((e) => (e.style.visibility = 'hidden'));
  await new Promise((r) => setTimeout(r, 80)); stg.renderer.info.reset(); composer.render();
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png')); hidden.forEach((e, i) => (e.style.visibility = prev[i]));
  if (!blob) return ui.toast('Could not save the picture');
  const file = new File([blob], `our-tank-day-${game.day}.png`, { type: 'image/png' });
  try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'OUR TANK' }); return; } } catch (e) { if (e?.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); ui.toast('Picture saved');
}

// ── tap a fish: the camera glides in and a profile card slides up ──
const card = $('card'), look = new THREE.Vector3(0, 5.3, 0), camGoal = new THREE.Vector3(), lookGoal = new THREE.Vector3();
function pickFish(ev) { const r = rayFrom(ev); let best = null, bd = 1e9; for (const f of fishes.list) { const h = r.ray.distanceToPoint(f.pos); if (h < f.radius * 0.9) { const d = f.pos.distanceTo(camera.position); if (d < bd) { bd = d; best = f; } } } return best; }
const bar = (l, v) => `<div class="nb"><span>${l}</span><i><b style="width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%"></b></i></div>`;
let lastCard = 0, lastInspect = null;
const DISC_LABEL = (k) => DISCOVERIES[k.split(':')[0]]?.label;
function noticedRow(rec) {
  const labels = [...new Set(Object.keys(rec.disc ?? {}).map(DISC_LABEL).filter(Boolean))]; if (!labels.length) return '';
  return `<dt>Noticed</dt><dd>${labels.slice(0, 3).join(', ')}${labels.length > 3 ? ` +${labels.length - 3}` : ''}</dd>`;
}
function familyRows(rec) { const p = rec.parents ?? []; return p.length ? `<dt>Parents</dt><dd>${p.map((x) => x.name).join(' & ')}</dd>` : ''; }
function showFamily(rec) {
  const t = game.state, p = rec.parents ?? [], gp = p.flatMap((x) => (x.parents ?? []).map((y) => y.name)), kids = childrenOf(t, rec.id), lines = [];
  lines.push(`Generation: ${rec.gen ? rec.gen : 'founder'}`); lines.push(p.length ? `Parents: ${p.map((x) => x.name).join(' & ')}` : 'Parents: unknown, one of the first fish'); if (gp.length) lines.push(`Grandparents: ${[...new Set(gp)].join(', ')}`);
  lines.push(kids.length ? `Children: ${kids.map((k) => k.name + (k.alive ? '' : ' (passed away)')).join(', ')}` : 'Children: none yet');
  ui.dialog({ title: `${rec.name.toUpperCase()}'S FAMILY`, lines, ok: 'Close' });
}
function bondLine(rec) {
  const b = rec.bond ?? {}, ids = Object.keys(b); if (!ids.length) return '';
  const top = ids.sort((x, y) => b[y] - b[x])[0], you = game.shared ? game.you?.userId : 'me', mine = b[you] ?? 0;
  const who = top === you ? 'You' : game.members?.find((m) => m.id === top)?.name ?? 'Someone';
  return `<dt>Closest to</dt><dd>${mine >= 10 && top === you ? 'You' : who}${b[top] >= 10 ? ' ♥' : ''}</dd>`;
}
function showDeadCard(f) {
  lastCard = Date.now(); const x = game.state.floaters?.find((z) => z.id === f.fid); if (!x) { card.classList.remove('on'); return; }
  const days = Math.max(1, Math.round((x.died - x.born) / 864e5)), who = x.ownerName ?? game.members?.find((mm) => mm.id === x.owner)?.name ?? 'Unknown';
  card.innerHTML = `<button class="x" aria-label="Close">×</button><h2>${x.name}</h2><div class="sp">${SPECIES_DEF[x.species]?.label ?? x.species} · <b class="mood">Passed away</b></div>
    <dl><dt>Age</dt><dd>${days} day${days === 1 ? '' : 's'}</dd><dt>Original caretaker</dt><dd>${who}</dd><dt>Died</dt><dd>${new Date(x.died).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</dd></dl>
    <button class="pet rest" id="rest">LAY TO REST</button>`;
  card.classList.add('on'); card.querySelector('.x').onclick = () => setFocus(null);
  $('rest').onclick = async () => { $('rest').disabled = true; const r = await game.dispatch({ t: 'scoop', id: f.fid }); setFocus(null); if (!r.ok) return fail(r); if (r.applied) { sfx('tap'); haptic(10); } };
}
function showCard(f) {
  if (f.dead) return showDeadCard(f);
  if (Date.now() - lastCard > 1500 || lastInspect !== f.fid) { lastInspect = f.fid; game.observe({ key: 'inspect', fish: f.fid }); game.track('fish_inspected'); }
  lastCard = Date.now();
  const rec = game.state.fish.find((x) => x.id === f.fid) ?? { traits: [], born: Date.now() }, p = fishes.profileOf(rec, game.state), nx = nextStage(rec);
  const fam = (rec.parents?.length || childrenOf(game.state, rec.id).length) ? '<button class="lnk fam" id="fam">Family</button>' : '';
  const warn = rec.ail >= AIL_WARN ? '<p class="warnline">Critical. Slow, and eating little. Needs food and clean water.</p>' : rec.ail >= AIL_TIRED ? '<p class="warnline">Sluggish and paler. Care would help.</p>' : '';
  game.folds ||= new Set(); const fid = 'fish:' + rec.id, more = `<details class="fold" data-fold="${fid}" ${game.folds.has(fid) ? 'open' : ''}><summary><span>More about ${esc(f.name)}</span></summary><div><p class="why">${p.traits.map((t) => TRAIT_TXT[t]).filter(Boolean).join(' ')}</p><dl><dt>Favourite food</dt><dd>${p.food}</dd>${rec.ownerName ? `<dt>Caretaker</dt><dd>${rec.ownerName}</dd>` : ''}${familyRows(rec)}${noticedRow(rec)}${bondLine(rec)}</dl></div></details>`;
  card.innerHTML = `<button class="x" aria-label="Close">×</button><h2>${f.name} <button class="ren" id="ren" aria-label="Rename">✎</button></h2><div class="sp">${f.species.label} · <b class="mood">${p.mood}</b></div>
    <div class="chips">${p.traits.map((t) => `<span>${t}</span>`).join('')}</div>
    <dl><dt>Age</dt><dd>${p.age}${nx ? ` · grows up in ${nx.label}` : ''}</dd><dt>Favourite spot</dt><dd>${p.spot}</dd></dl>${warn}
    ${comfortBlock(rec)}<button class="pet" id="pet">Play with ${f.name}</button>
    <div class="btnrow">${trickBlock(rec)}<button class="lnk" id="note">Leave a note</button>${fam}</div>${more}
    <div class="needs">${bar('Fed', p.needs[0])}${bar('Happy', p.needs[1])}${bar('Energy', p.needs[2])}${bar('Health', p.needs[3])}</div>`;
  card.querySelector('details.fold')?.addEventListener('toggle', (e) => { e.target.open ? game.folds.add(fid) : game.folds.delete(fid); });
  card.classList.add('on'); card.querySelector('.x').onclick = () => setFocus(null); $('ren').onclick = () => renameFish(f); $('pet').onclick = () => playWith(f); if ($('fam')) $('fam').onclick = () => showFamily(rec); $('note').onclick = () => noteFish(f);
  card.querySelectorAll('[data-train]').forEach((b) => { b.onclick = () => trainFish(f, b.dataset.train, b.dataset.spot); }); card.querySelectorAll('[data-show]').forEach((b) => { b.onclick = () => showTrick(f, b.dataset.show); });
}
function setFocus(f) { if (play) return; if (focus) focus.mul = 1; focus = f; if (f) { f.mul = 0.35; showCard(f); sfx('tap'); } else card.classList.remove('on'); }
canvas.addEventListener('pointerdown', (ev) => {
  if (play) { playPoint(ev); return; }
  if (!placing && !rearrange && !feedMode && !cleanMode && driftHit(ev)) { pickDrift(); return; }
  if (!placing && !rearrange && !feedMode && !cleanMode && bottleHit(ev)) { openBottle(); return; }
  if (placing) { canvas.setPointerCapture?.(ev.pointerId); movePlace(ev); dragging = true; return; }
  if (rearrange) { const id = decor.pick(rayFrom(ev).ray); if (id) { const t = game.state.decor.find((d) => d.id === id).type; startPlace(t, id); } return; }
  if (feedMode) { if (rayFrom(ev).ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.8), hit)) dropFood(Math.max(-4, Math.min(4, hit.x))); return; }
  const f = pickFish(ev); if (f?.visitor) { greetVisitor(f); return; } if (f) setFocus(f === focus ? null : f); else if (focus) setFocus(null);
  if (!f && !focus) lure = { t0: performance.now(), x: ev.clientX, y: ev.clientY, on: false };
});
// hold a finger in the water: the bold and the curious come to see it. Nothing is earned; the fish simply like you.
let lure = null; const lureAt = new THREE.Vector3(), lurePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -1.6);
function lureTick() {
  if (!lure || play || placing || rearrange || feedMode || cleanMode || focus || performance.now() - lure.t0 < 380) return;
  if (!rayFrom({ clientX: lure.x, clientY: lure.y }).ray.intersectPlane(lurePlane, lureAt)) return;
  if (!lure.on) { lure.on = true; fishes.burst(lureAt.clone().setZ(1.2)); haptic(6); }
  let n = 0; for (const f of fishes.list) {
    if (f.dead || f.visitor || f.script?.length || f.isShy || f.weak || f.pos.distanceTo(lureAt) > 7) continue;
    const a = (f.seed ?? n) * 2.4 + n * 1.7; n++; f.target.set(Math.max(-4, Math.min(4, lureAt.x + Math.cos(a) * 0.9)), Math.max(0.9, Math.min(13, lureAt.y + Math.sin(a) * 0.7)), 2.3); f.retarget = 0.6;
  }
}
let dragging = false;
function movePlace(ev) { if (rayFrom(ev).ray.intersectPlane(floor, hit)) { decor.move(hit.x, hit.z); updatePlaceOk(); } }
canvas.addEventListener('pointermove', (ev) => { if (lure) { lure.x = ev.clientX; lure.y = ev.clientY; } if (play) playPoint(ev); else if (placing && dragging) movePlace(ev); });
addEventListener('pointerup', () => { dragging = false; lure = null; }); addEventListener('pointercancel', () => { lure = null; });
addEventListener('keydown', (e) => { if (e.key === 'Escape') { setFocus(null); cancelModes(); } });

// ── tutorial: name the fish, feed it, meet friends, place a free plant ──
const tut = (() => {
  let busy = false, last = -1;
  const set = (n) => game.dispatch({ t: 'tut', step: n });
  async function run() {
    const s = game.state; if (!s || !ui || busy || !game.isTutOwner) return; const step = s.flags.tut ?? 0; if (step >= 5) { ui.hideCoach(); ui.pulse(null); return; } if (step === last) return;
    last = step; busy = true;
    try {
      if (step === 0) {
        ui.pulse(null); ui.hideCoach();
        const pk = await ui.pickFish({ title: 'WELCOME TO YOUR TANK', text: 'Choose your first fish. It is free, and everyone in the tank will care for it. Then give it a name.', species: FIRST_FISH, name: ['Biscuit', 'Nori', 'Coral', 'Fin', 'Pearl', 'Sunny', 'Dot', 'Misty'][(Math.random() * 8) | 0] });
        const r = await game.dispatch({ t: 'chooseFirst', species: pk.species, name: pk.name, seed: (Math.random() * 90000) | 0 }); if (!r.ok && r.reason !== 'ALREADY_HAVE') fail(r); else sfx('arrive');
        await set(1);
      } else if (step === 1) {
        ui.showCoach({ title: 'TIME FOR A SNACK', text: `${s.fish[0]?.name ?? 'Your fish'} is hungry. Open Care, tap Feed, then tap the water.`, skip: skip }); ui.pulse('care');
      } else if (step === 2) {
        ui.pulse(null);
        const share = game.shared ? `Your tank code is ${game.code}. Share it from the Friends tab so two friends can join.` : 'Up to three friends can care for one tank. They join with a six-character code once the game is hosted online.';
        ui.showCoach({ title: 'BETTER TOGETHER', text: share, button: 'Got it', onButton: () => set(3), skip: skip });
      } else if (step === 3) {
        ui.showCoach({ title: 'A GIFT FOR THE TANK', text: 'You have a starter pack of free items. Open Decorate, pick a plant and slide it into place.', skip: skip }); ui.pulse('decorate');
      } else if (step === 4) {
        ui.pulse(null); ui.showCoach({ title: 'YOU ARE ALL SET', text: 'Care for the fish to earn shells. Next: add a plant in Decorate, then adopt a friend for your fish. Tap a fish to get to know it.', button: 'Start', onButton: () => { set(5); ui.hideCoach(); } });
      }
    } finally { busy = false; setTimeout(run, 0); }
  }
  const skip = () => { set(5); ui.hideCoach(); ui.pulse(null); };
  return {
    run,
    onFeed: () => { if ((game.state.flags.tut ?? 0) === 1) { ui.toast(`${game.state.fish[0]?.name ?? 'Your fish'} loved it!`); setTimeout(() => set(2), 1400); } },
    onPlaced: () => { if ((game.state.flags.tut ?? 0) === 3) setTimeout(() => set(4), 900); },
    replay: async () => { await game.dispatch({ t: 'tut', reset: true, step: 0 }); last = -1; run(); },
  };
})();

// a short, cinematic look at a fish: used for arrivals, growth and discoveries (only when you are just watching the tank)
let spotlight = null;
function spotlightFish(id, ms = 3600, delay = 700) {
  setTimeout(() => {
    const f = fishes.byId.get(id); if (!f || focus || placing || feedMode || cleanMode || rearrange || ui?.tab !== 'tank' || $('modal').classList.contains('on')) return;
    setFocus(f); spotlight = f; setTimeout(() => { if (spotlight === f && focus === f) { setFocus(null); } spotlight = null; }, ms);
  }, delay);
}
// ── wiring the game to the scene and the interface ──
const pendingArrivals = new Set();
let lastLamp = null;
function syncWorld() {
  const s = game.state; if (!s) return;
  fishes.me = game.you?.userId ?? 'me'; fishes.sync(s, { arrivals: [...pendingArrivals] }); pendingArrivals.clear();
  decor.sync(s.decor, s);
  const lp = decor.lamp(); lastLamp = lp; stage.lantern = lp ? 1 : 0;
  if (lp) { lamp.position.copy(lp); halo.position.set(lp.x, lp.y, lp.z + 0.8); pool.position.set(lp.x - 0.4, 0.14, lp.z - 0.2); }
  env.setStyle(s.style?.floor, s.style?.backdrop); syncGlass(); syncDrift(); syncExtras(); ui?.refresh(); tut.run();
}
setInterval(() => { if (game.state) decor.grow(game.state); }, 30000);
let lastLive = 0; game.on('tick', () => { ui?.updateHeader(); if ((ui?.tab === 'today' || ui?.tab === 'care') && Date.now() - lastLive > 15000) { lastLive = Date.now(); ui.refresh(); } if (focus && !play && !focus.dead && Date.now() - lastCard > 4000) { lastCard = Date.now(); showCard(focus); } fishes.sync(game.state); }).on('state', syncWorld).on('members', () => ui?.refresh()).on('journal', () => ui?.refresh());
game.on('toast', (m) => ui?.toast(m, 3200));
game.on('levelup', (lv) => {
  sfx('level'); haptic(30); fishes.burst(new THREE.Vector3(0, 6, 1));
  const fresh = [...Object.values(SPECIES_DEF).filter((d) => d.level === lv).map((d) => d.label + ' (fish)'), ...Object.values(DECOR_DEF).filter((d) => d.level === lv).map((d) => d.label)];
  ui?.toast(`Tank level ${lv}!`, 3000);
  if (fresh.length && !$('modal').classList.contains('on')) setTimeout(() => ui?.dialog({ title: `LEVEL ${lv}`, text: `The tank is bigger. New in the shop:`, lines: fresh.length > 5 ? [...fresh.slice(0, 5), `and ${fresh.length - 5} more`] : fresh, ok: 'Nice' }), 1200);
});
game.on('arrival', (ids) => { sfx('arrive'); for (const id of ids) { const f = fishes.byId.get(id); if (f) { f.pos.set((rng() - 0.5) * 4, 13.5, 1.4); f.target.set(f.pos.x, 8, 1.4); f.retarget = 3; fishes.burst(f.pos); } else pendingArrivals.add(id); } spotlightFish(ids[0], 4200, 1800); });
game.on('placed', () => tut.onPlaced());
game.on('nudged', (from, why) => { sfx('arrive'); ui?.toast(`${from} says ${({ feed: 'the fish are hungry', glass: 'the glass needs a wipe', water: 'the water needs changing' })[why] ?? 'the tank could use you'}`, 4200); });
game.on('grew', (id) => { const f = fishes.byId.get(id); if (f) { fishes.burst(f.pos); sfx('level'); haptic(25); spotlightFish(id, 3200, 500); } });
game.on('discovery', (id) => { const f = fishes.byId.get(id); if (f) { fishes.burst(f.pos); sfx('arrive'); spotlightFish(id, 3000, 600); flyShells(2, [window.innerWidth / 2, window.innerHeight * 0.4]); } });
game.on('remoteFeed', (x, by, food) => { fishes.drop(x, 7, food); sfx('splash'); ui?.toast(`${nameOf(by)} fed the fish`); });
game.on('remoteActivity', (a) => { if (a.userId !== game.you?.userId) { ui?.flag('friends', true); if (['visitor', 'bottle'].includes(a.type)) ui?.toast(a.text); } ui?.refresh(); });
game.on('thanks', (text) => { sfx('arrive'); ui?.toast(text, 3600); });
game.on('chat', (m) => { if (m.userId !== game.you?.userId) { ui?.toast(`${m.name}: ${m.text}`); ui?.flag('friends', true); } ui?.refresh(); });
fishes.onEat = () => { sfx('eat'); };

// a quiet counter for 'watch your fish swim for 15 seconds': the tank is on screen, nothing is being done to it, and it is visible
let watchT = 0; const dayKey = () => Math.floor(Date.now() / 864e5);
function watchTick(dt) {
  const d = game.state?.daily; if (!d || d.done || d.kind !== 'watch') { watchT = 0; return; }
  if (document.hidden || focus || placing || feedMode || cleanMode || rearrange || ui?.tab !== 'tank' || !fishes.list.some((f) => !f.dead)) { watchT = Math.max(0, watchT - dt); return; }
  watchT += Math.min(dt, 0.1); if (watchT >= 15) { watchT = -1e9; game.observe({ key: 'watch' }); }
}
document.addEventListener('visibilitychange', () => game.track(document.hidden ? 'hidden' : 'visible'));
// ── frame loop ──
let last = performance.now(), cTick = 0, fpsN = 0, fpsT = 0, lastMeter = performance.now(), first = true;
const meter = qs.has('fps') ? Object.assign(document.body.appendChild(document.createElement('div')), { style: 'position:fixed;left:6px;top:calc(env(safe-area-inset-top) + 4px);z-index:60;font:11px ui-monospace,Menlo,monospace;color:#9f9;background:rgba(0,0,0,.6);padding:3px 6px;border-radius:6px;pointer-events:none;white-space:pre' }) : null;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
  swayTime.value = t; cTick += dt; if (cTick > 0.05) { cTick = 0; stg.caustic.update(t * 0.7); }
  if (game.state) stage.murk += ((1 - game.state.water) - stage.murk) * Math.min(1, dt * 1.5);
  stg.applyTod(dt);
  if (focus) {
    // frame the fish in the open water between the top bar and the profile card
    const H = window.innerHeight, cardTop = card.classList.contains('on') ? card.getBoundingClientRect().top : H - 150, topPx = 64, cy = topPx + Math.max(150, cardTop - topPx - 8) / 2;
    const d = Math.max(6, focus.radius * 8.6), shift = ((H / 2 - cy) / (H / 2)) * d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camGoal.set(focus.pos.x + 0.3, focus.pos.y - shift + 0.12, focus.pos.z + d); lookGoal.set(focus.pos.x, focus.pos.y - shift, focus.pos.z);
  }
  else { camGoal.set(Math.sin(t * 0.13) * 0.35, 4.6 + Math.sin(t * 0.09) * 0.12, 30); lookGoal.set(0, 5.3, 0); }
  const fd = focus ? camera.position.distanceTo(focus.pos) : 30;
  bokeh.uniforms.focus.value += (fd - bokeh.uniforms.focus.value) * Math.min(1, dt * 4);
  bokeh.uniforms.aperture.value += ((focus ? 0.0007 : 0.00022) - bokeh.uniforms.aperture.value) * Math.min(1, dt * 3);
  bokeh.uniforms.maxblur.value += ((focus ? 0.016 : 0.006) - bokeh.uniforms.maxblur.value) * Math.min(1, dt * 3);
  fishBoost.value.set(0.36, 0.3, 0.22).multiplyScalar(0.3 + 0.7 * Math.min(1, cur.sunI / 12));
  if (window.__cam) { camGoal.set(...window.__cam.slice(0, 3)); lookGoal.set(...window.__cam.slice(3, 6)); }
  const kc = Math.min(1, dt * 3.2); camera.position.lerp(camGoal, kc); look.lerp(lookGoal, kc); camera.lookAt(look);
  if (feedMode && (feedIdle += dt) > 12) endFeed();
  if (bottleSp.visible) { bottleSp.position.y = 2.1 + Math.sin(t * 1.5 + 1) * 0.12; bottleGlow.position.copy(bottleSp.position); const bs = 2.8 + Math.sin(t * 2.4) * 0.4; bottleGlow.scale.set(bs, bs, 1); }
  for (const sp of eggSprites.values()) { const w = 1 + Math.sin(t * 3 + sp.position.x) * 0.05; sp.scale.set(w, w, 1); }
  if (driftSp.visible) { driftSp.position.y = 2.1 + Math.sin(t * 1.7) * 0.14; const sc = 1.3 + Math.sin(t * 3.1) * 0.06; driftSp.scale.set(sc, sc, 1); driftGlow.position.copy(driftSp.position); const gs = 3.2 + Math.sin(t * 2.2) * 0.5; driftGlow.scale.set(gs, gs, 1); }
  if (play) { if (performance.now() > play.until || !fishes.byId.has(play.fish.fid)) { if (fishes.byId.has(play.fish.fid)) finishPlay(); else play = null; } else play.fish.retarget = 1; }
  decor.tick(t, dt); fishes.bubbleAt = decor.bubbleSpot() ?? fishes.defaultBubble; fishes.update(dt, t); fishes.observe(dt, t); watchTick(dt); fishes.list.forEach((f) => f.update(dt, rng, fishes.list));
  lureTick(); sights.enabled = (game.state?.flags?.tut ?? 0) >= 5 && !play; sights.update(dt, t); glow.update(dt, t); stg.shafts.update(t); stg.surf.mat.uniforms.uTime.value = t; grade.uniforms.uT.value = t; stg.snow.update(dt, t); stg.bubbles.update(dt, t); stg.bubbles2.update(dt, t);
  stg.watchPerf(dt);
  if (meter && (fpsN++, fpsT += (now - lastMeter) / 1000, lastMeter = now, fpsT) > 0.5) { meter.textContent = `${Math.round(fpsN / fpsT)} fps · q${stage.quality}\n${stg.renderer.info.render.calls} calls`; fpsN = fpsT = 0; }
  if (LITE) { $('loading').classList.add('off'); setTimeout(() => requestAnimationFrame(frame), 120); return; }
  stg.renderer.info.reset(); composer.render();
  if (first) { first = false; setTimeout(() => $('loading').classList.add('off'), 250); }
  requestAnimationFrame(frame);
}

// ── coming back: show up to three things that really happened while you were away ──
const seenKey = () => 'ourtank.seen.' + (game.shared ? game.you.userId : 'solo');
const markSeen = () => { try { localStorage.setItem(seenKey(), String(Date.now())); } catch { /* ignore */ } };
async function welcomeBack() {
  let seen = 0; try { seen = +localStorage.getItem(seenKey()) || 0; } catch { /* ignore */ }
  markSeen(); addEventListener('pagehide', markSeen); document.addEventListener('visibilitychange', () => { if (document.hidden) markSeen(); });
  if (!seen) { if (game.shared && (game.state.flags.tut ?? 0) >= 5 && !game.isTutOwner) ui.toast(`Welcome to ${game.tankName}!`, 3600); return; }
  if (Date.now() - seen < 10 * 60e3 || (game.state.flags.tut ?? 0) < 5) return;
  const mine = game.you?.userId, lines = game.journal.filter((e) => e.ts > seen && (!game.shared || e.userId !== mine) && !/began/.test(e.text)).slice(-3).map((e) => e.text);
  const g = game.state.drift; if (g) lines.push('Something washed in. Tap it in the tank.'); const o = game.state.orders ?? []; if (o.length) lines.push(`${o.length} delivery on the way.`);
  if (!lines.length) return;
  await new Promise((r) => setTimeout(r, 900)); await ui.dialog({ title: 'WHILE YOU WERE AWAY', lines, ok: 'Back to the tank' });
}

// every caretaker brings in a first fish of their own (the creator's is Pip)
async function firstFishPrompt() {
  const me = game.you?.userId; if (!game.shared || !me) return; await new Promise((r) => setTimeout(r, 2500));
  const s = game.state; if (!s || s.flags.firsts?.[me] || $('modal').classList.contains('on') || (s.flags.tut ?? 0) < 5 && game.isTutOwner) return;
  const pk = await ui.pickFish({ title: 'YOUR FIRST FISH', text: 'Choose a free fish of your own to bring into the tank. Everyone can care for it, but you brought it in. Then name it.', species: FIRST_FISH, name: ['Biscuit', 'Nori', 'Coral', 'Fin', 'Pearl', 'Sunny', 'Dot', 'Misty'][(Math.random() * 8) | 0] });
  const r = await game.dispatch({ t: 'firstFish', species: pk.species, name: pk.name, seed: (Math.random() * 90000) | 0 }); if (!r.ok) fail(r); else sfx('arrive');
}
// ── start ──
const GFX = ['Low', 'Medium', 'High'];
async function boot() {
  if (window.__noGL) { $('ltxt').textContent = 'This browser cannot draw the tank. Try Safari or Chrome on a recent phone.'; return new Promise(() => {}); }
  const r = await runOnboarding();
  if (r.mode === 'net') {
    const ready = new Promise((ok) => { const live = new Live((m) => { game.onNet(m); if (m.t === 'snapshot') ok(); }, (up) => { game.connected = up; $('conn').classList.toggle('on', !up); }); net = live; game.attachNet(live, r); });
    await Promise.race([ready, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 10000))]);
  } else game.startLocal();
  ui = initUI({ game, social, cb: {
    act: (a) => ({ feed: startFeed, clean: startClean, water: changeWater, trim: trimPlants }[a]?.()),
    meetFish: () => { const f = fishes.list[0]; if (f) setFocus(f); }, adopt, startPlace: (t) => startPlace(t),
    rearrange: (on) => setRearrange(on), onTab: (t) => { if (t !== 'tank') { endFeed(); if (placing) { decor.cancel(); endPlace(); } setRearrange(false); } },
    note: async (text) => { const r = await game.dispatch({ t: 'note', text }); if (!r.ok) fail(r); else sfx('tap'); },
    photo: takePhoto, pushState, pushToggle, recoveryKey: async () => { try { const k = await ensureRecoveryKey(); await ui.dialog({ title: 'YOUR RECOVERY KEY', text: 'Write it down. Typing it on a new phone signs you back in to your tank.', lines: [k], ok: 'Done' }); } catch (e) { ui.toast(e.message); } },
    backup: async () => { try { const d = await api('/api/export'), url = URL.createObjectURL(new Blob([JSON.stringify(d)], { type: 'application/json' })), a = document.createElement('a'); a.href = url; a.download = 'our-tank-backup.json'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); ui.toast('Backup saved'); } catch (e) { ui.toast(e.message || 'Could not make a backup'); } },
    deleteMe: async () => { const yes = await ui.dialog({ title: 'DELETE MY DATA?', text: 'This removes you from the tank and deletes your account. If you are the last player, the tank is deleted too. It cannot be undone. Download a backup first if you might want it back.', ok: 'Delete everything', cancel: 'Keep', danger: true }); if (!yes) return; try { await api('/api/me', null, 'DELETE'); try { localStorage.clear(); } catch { /* storage unavailable */ } location.href = '/'; } catch (e) { ui.toast(e.message || 'Could not delete'); } },
    leaveTank: async () => { const yes = await ui.dialog({ title: 'LEAVE THIS TANK?', text: 'Your seat opens up for someone else. You can join another tank afterwards.', ok: 'Leave', cancel: 'Stay', danger: true }); if (!yes) return; try { await leaveTankNow(); location.href = '/'; } catch (e) { ui.toast(e.message); } },
    quality: () => stage.quality, cycleQuality: () => stg.setQuality((stage.quality + 1) % 3), replayTutorial: () => tut.replay(),
  } });
  window.__ui = ui; syncWorld(); ui.setMembers();
  // lighting follows the clock unless you picked a time yourself (?tod=… or the pill)
  // the light follows the phone's clock and drifts on its own while you play; the picker only exists for ?tod= or ?dev testing
  const phase = () => { const h = new Date().getHours(); return h >= 5 && h < 11 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night'; };
  if (qs.get('tod') || qs.has('dev')) document.querySelector('.tod').hidden = false;
  document.querySelectorAll('[data-tod]').forEach((b) => b.addEventListener('click', () => { glow.setPhase(b.dataset.tod); fishes.setNight(b.dataset.tod === 'night'); }));
  fishes.setNight((qs.get('tod') ?? phase()) === 'night'); glow.setPhase(qs.get('tod') ?? phase());
  if (!qs.get('tod')) { stg.setTod(phase()); let cur = phase(); setInterval(() => { const n = phase(); if (n !== cur) { cur = n; stg.setTod(n); fishes.setNight(n === 'night'); glow.setPhase(n); } }, 30000); }
  welcomeBack(); firstFishPrompt(); requestAnimationFrame(frame);
}
window.__booted = false;
boot().then(() => { window.__booted = true; }).catch((e) => { console.error(e); $('ltxt').textContent = 'Something went wrong starting the tank. Please reload.'; });
window.__fishes = fishes;
window.__focus = (i) => setFocus(i == null ? null : fishes.list[i]);
window.__tank = { fishes: fishes.list, decor, game, setQuality: stg.setQuality, TOD, bokeh, scene, camera, renderer: stg.renderer };
window.__sim = (n, dt = 1 / 30, drops = []) => {
  window.__eaten = 0; const oe = fishes.onEat; fishes.onEat = (f) => { window.__eaten++; oe?.(f); };
  let inside = 0, samples = 0, worstFish = 0; const W = Fish3D.world, o = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    for (const [at, x] of drops) if (i === at) fishes.drop(x);
    fishes.update(dt, i * dt); fishes.list.forEach((f) => f.update(dt, rng, fishes.list));
    for (const f of fishes.list) {
      const cp = Math.cos(f.pitch), R = f.radius;
      for (const off of [-0.8, -0.4, 0, 0.4, 0.8]) { p.set(f.pos.x + cp * Math.cos(f.heading) * R * off, f.pos.y + Math.sin(f.pitch) * R * off, f.pos.z - cp * Math.sin(f.heading) * R * off); samples++; o.set(0, 0, 0); if (W.push(p, f.cr * 0.7, o)) inside++; }
      for (const q of fishes.list) if (q !== f) { const d = Math.hypot(f.pos.x - q.pos.x, f.pos.y - q.pos.y, (f.pos.z - q.pos.z) * 1.5), mn = Math.max(0.5, 0.42 * (f.radius + q.radius)); worstFish = Math.max(worstFish, 1 - d / mn); }
    }
  }
  return { eaten: window.__eaten, flakesLeft: fishes.flakes.length, bodySamplesTouchingDecor: inside, ofSamples: samples, pct: +(100 * inside / samples).toFixed(2), worstFishOverlap: +worstFish.toFixed(3), chasing: fishes.list.filter((f) => f.flake).length };
};

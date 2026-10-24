// OUR TANK: wires the game state, the 3D stage, the interface and the tutorial together.
import * as THREE from 'three';
import { Game, REASONS } from './game/game.js';
import { isCrab, CRAB_TYPES, crabNeed, shellFit, shellLabel } from './game/crabs.js';
import { ADULT_DAYS, KEEPSAKES, keepStory, decorStory, TOD as DAYPART, HIDE_COST, HIDE_STEP, hideLabel, awayOwner, eggCareOf, dueIn, TOYS, TOY_LEARN, favToy, LIFESPAN, SEA, OCTO_PAIR_DAYS, forecast, octoTrust, milestonesOf, readyToTrim, babyRole, sexOf, canFeedOwn, ownHunger, ownFood, capacity, driftBlame, dayTicks, nextUp, firstPromises, SOCIAL, socialOf, adoptAdvice, canPuzzle, CRAB_PRICE, isSmart, octoMind, trainNeed, puzzleSecs, PUZZLE_COST, DECOR_DEF, SPECIES_DEF, DISCOVERIES, comfortOf, FOODS, giftReady, DAILY_GIFT, hasOcto, hasFishOnly, hasSeahorse, canFeedOcto, octoHunger, HR, OHR, OCTO_DUE, FIRST_FISH, TRICKS, trickOptions, childrenOf, AIL_TIRED, AIL_WARN, fishPrice, isFree, STAGE_SCALE, stageOf, nextStage, setClockHour } from './game/rules.js';
import * as stg from './w3/stage.js';
window.__quietUntil = Math.max(window.__quietUntil ?? 0, Date.now() + 15000); addEventListener('pointerdown', () => { window.__quietUntil = 0; }, { capture: true, once: true });      // the first 15 s belong to the tank (a touch ends it)
import { makeStudio, planShot } from './w3/photo.js';
import { GROW, specialOf, specialPrice, canSend, goalOf, GOAL_SHELLS, harmonyOf, mysteryOf, MYSTERY, storyNext, morphOf, carriesOf, morphOdds, MORPHS, isOcto as isOctoF } from './game/rules.js';
import { raySand, sandH } from './w3/terrain.js';
import { algaeTint } from './w3/decor.js';
import { swayTime, fishBoost, plantPush, PUSH_N, plantHold, HOLD_N } from './w3/voxshade.js';
import { Fish3D } from './w3/fish3d.js';
import { Toys } from './w3/toys.js';
import { makeBottle } from './w3/bottle.js';
import { SEAHORSE_GRIP_R } from './species.js';
import { Fishes, TRAIT_TXT } from './w3/fishmgr.js';
import { DecorMgr } from './w3/decormgr.js';
import { Glow, Sightings, Rain } from './w3/fx.js';
import { Nursery } from './w3/nursery.js';
import { makeEgg, eggSpot, eggY } from './w3/egg.js';
import { makeGiftBag, ribbonOf } from './w3/giftbag.js';
import { msIcon } from './msicons.js';
import { factOfDay, TRAIT_FACTS, FACTS } from './facts.js';
import { skyOf } from './game/sky.js';
import { habitLines } from './game/habits.js';
import { lanternGlow } from './w3/items.js';
import { initUI, drawAvatar } from './ui.js';
import { KINDS, kindOf, kindDef, LEVEL_PRIZE, wellOf, turtleReady, turtleDaysLeft, TURTLE_PAY, isTurtle as isTurtleR } from './game/rules.js';
import { soloLook, saveSoloLook } from './people.js';
import { runOnboarding, Live, api, inTest, setTest, ensureRecoveryKey, newRecoveryKey, leaveTankNow, pushState, pushToggle, pushTest, pushRegister } from './online.js';
import { makeWaterChange } from './waterchange.js';
import { backupToText } from './keep.js';
import { sfx, haptic, setMusicPhase } from './audio.js';
import { personaOf, summaryOf, familiarityOf, behaviourList, traitWords, TRAIT_BARS, SPECIES_INFO, FAMILIAR } from './profile.js';

const { stage, canvas, IW, IH, camera, scene, composer, bokeh, grade, TOD, cur, env, lamp, halo, pool, qs, LITE } = stg;
const $ = (id) => document.getElementById(id);
const game = new Game();
window.__game = game;

// ── managers ──
const fishes = new Fishes(scene), decor = new DecorMgr(scene, env.colliders); decor.fishes = fishes;
const sights = new Sightings(stg.scene); sights.hide = stg.hideForDepth; sights.onSpawn = () => { if (game.shared && sights.cur) game.live?.send({ t: 'fx', kind: 'sight', what: sights.cur.kind, ...sights.cur.look }); try { if (localStorage.getItem('ourtank.memory')) return; localStorage.setItem('ourtank.memory', '1'); } catch { /* shown again next time */ } ui?.toast('The fish are remembering the open sea…', 5200); }; window.__sights = sights; window.__sight = (k) => { sights.clear(); return sights.spawn(k); };
const glow = new Glow(); stg.scene.add(glow.mesh); stg.hideForDepth.push(fishes.mesh, fishes.bm, decor.marker, glow.mesh);
const REDUCED = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
const rain = new Rain(); stg.scene.add(rain.mesh); stg.hideForDepth.push(rain.mesh);
// the moon, in its real phase, glimmering at the top of the water at dusk and after dark
const moonTexture = (ph) => { const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'), r = 36; g.translate(48, 48); g.fillStyle = 'rgba(190,205,235,.2)'; g.beginPath(); g.arc(0, 0, r, 0, 6.3); g.fill();
  const waxing = ph < 0.5, p2 = waxing ? ph : 1 - ph, k = Math.cos(p2 * 2 * Math.PI); if (!waxing) g.scale(-1, 1);              // the lit side is the right while it waxes, the left while it wanes
  g.fillStyle = '#f3f0dc'; g.beginPath(); g.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false); g.ellipse(0, 0, Math.max(0.5, Math.abs(k) * r), r, 0, Math.PI / 2, -Math.PI / 2, k > 0); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const moon = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, opacity: 0 })); moon.scale.set(1.5, 1.5, 1); moon.position.set(2.9, 12.4, -4); moon.renderOrder = 4; scene.add(moon); stg.hideForDepth.push(moon);
const moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(220,232,255,.55)'); gr.addColorStop(1, 'rgba(220,232,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); moonHalo.scale.set(5, 5, 1); moonHalo.position.copy(moon.position); moonHalo.renderOrder = 3; scene.add(moonHalo); stg.hideForDepth.push(moonHalo);
let skyNow = null, moonK = 0, moonWant = 0, wildT = 0;
function applySky(phaseName) {
  const sk = skyOf(Date.now()), ev = qs.get('sky') || (sk.event?.key ?? null); const dark = phaseName === 'night' || phaseName === 'evening';
  moon.material.map = moonTexture(sk.phase); moon.material.needsUpdate = true; moonWant = phaseName === 'night' ? 1 : phaseName === 'evening' ? 0.55 : 0; skyNow = sk;
  stg.stage.moonlit = ev === 'fullmoon' && phaseName === 'night' ? 1 : 0; glow.setSky(ev === 'darkmoon' ? 'darkmoon' : ev === 'spawn' ? 'spawn' : null); rain.on = ev === 'rain' && !REDUCED; fishes.rain = ev === 'rain';
}
const tune = (p) => { glow.setPhase(p); setMusicPhase(p); applySky(p); };
fishes.onGoodbye = () => { if (REDUCED) return; const d = document.createElement('div'); d.className = 'restdim'; document.body.appendChild(d); setTimeout(() => d.remove(), 3400); };      // the light dims softly while it is laid to rest
fishes.onSprite = (sp) => stg.hideForDepth.push(sp); fishes.onSpriteGone = (sp) => { const i = stg.hideForDepth.indexOf(sp); if (i >= 0) stg.hideForDepth.splice(i, 1); };
fishes.spots = () => decor.spots(); fishes.keepSpots = () => decor.keepSpots();
fishes.onCrabShell = (m) => (game.state ? game.dispatch({ t: 'crabShell', ...m }).then((r) => !!r?.ok).catch(() => false) : false);      // a crab moving house: the first crab in has the shell
fishes.onCrabMem = (m) => { if (game.state) game.dispatch({ t: 'crabMem', ...m }).catch(() => null); };      // what a crab has been up to: its favorite spot, where it roams, who it meets
fishes.onKeep = (m) => { if (game.state) game.dispatch({ t: 'keepMove', ...m }).catch(() => null); };      // an octopus carried or dropped a keepsake (Emergent Life)
{ const SURF = { ROCKS: { cols: [[96, 104, 74], [66, 78, 52], [122, 124, 106], [82, 90, 64]], scale: 0.5 }, PLANTS: { cols: [[62, 132, 62], [96, 164, 74], [40, 100, 52], [120, 176, 90]], scale: 0.6 }, WOOD: { cols: [[112, 78, 50], [86, 58, 38], [132, 98, 66], [98, 70, 44]], scale: 0.7 }, STRUCTURES: { cols: [[160, 152, 128], [132, 126, 106], [180, 172, 146], [110, 112, 96]], scale: 0.6 } };
  Fish3D.groundAt = (x, z) => { let best = null, bd = 1.15; for (const sp of decor.spots()) { const d = Math.hypot(sp.x - x, sp.z - z); if (d < bd && SURF[DECOR_DEF[sp.type]?.cat]) { bd = d; best = sp; } } if (best) { const c = DECOR_DEF[best.type].cat; return { key: 'd:' + c, ctx: 'd:' + best.id, kind: 'decor', ...SURF[c] }; } const f = stg.env.floorSpec(); return { key: 'f:' + f.key, ctx: 'floor', kind: 'floor', cols: f.cols, scale: f.scale }; }; }
fishes.hasBubbler = () => !!decor.bubbleSpot();
fishes.dailyKind = () => { const d = game.state?.daily; return d && !d.done ? d.kind : null; };
fishes.phase = () => { const h = new Date().getHours(); return h >= 5 && h < 11 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night'; };
// what the fish are really doing is reported to the game, a little at a time, and the game decides what counts
let lastObs = 0, obsQueue = [];
fishes.onObserve = (o) => { obsQueue.push(o); };
fishes.onLog = (logs) => { if (window.__noLog) return; if (game.state) game.dispatch({ t: 'fishLog', logs }).catch(() => null); };
setInterval(() => { if (!game.state || performance.now() - lastObs < 1500 || !obsQueue.length) return; lastObs = performance.now(); game.observe(obsQueue.shift()); if (obsQueue.length > 8) obsQueue.length = 8; }, 800);
const rng = fishes.rng; fishes.defaultBubble = fishes.bubbleAt;

// ── the interface ──
let net = null, ui = null;
const copyText = async (t, ok) => { try { await navigator.clipboard.writeText(t); ui.toast(ok); } catch { ui.toast(t); } };
const nameOf = (id) => game.members?.find((m) => m.id === id)?.name ?? 'Someone';
const social = {
  chat: (t) => net?.chat(t), invite: () => social.share(),
  copy: () => { game.track('friend_invited'); copyText(game.code, 'Code copied'); },
  share: async () => { game.track('friend_invited'); const c = game.code, d = { title: 'Tako Tank', text: `Come help take care of our fish! Join my aquarium in Tako Tank. Code: ${c}`, url: `${location.origin}/join/${c}` }; try { if (navigator.share) await navigator.share(d); else copyText(`${d.text} ${d.url}`, 'Invite copied'); } catch { /* cancelled */ } },
  regen: async () => { const yes = await ui.dialog({ title: 'Make a new code?', text: 'The old code will stop working. Friends already in the tank stay.', ok: 'New code', cancel: 'Keep it' }); if (!yes) return; try { game.code = (await api('/api/tanks/code', {})).code; ui.refresh(); ui.toast('New code ready'); } catch (e) { ui.toast(e.message); } },
};

let feedMode = false, cleanMode = false, feedDrops = 0, feedIdle = 0, rearrange = false, focus = null;
const placebar = $('placebar');
const fail = (r) => { sfx('error'); ui.toast(REASONS[r.reason] ?? 'That did not work. Try again.'); };
// one reward feeling for everything good that happens: a single soft chime, a gold glimmer on the message, and a small burst where it happened (rewards close together share one chime)
let lastMoment = 0;
function moment({ at = null, shells = 0, from = null, haptics = 14 } = {}) {
  const now = performance.now(), shared = now - lastMoment < 1400; lastMoment = now;
  if (!shared) { sfx('reward'); haptic(haptics); } if (at) fishes.burst(at); if (shells > 0) flyShells(shells, from ?? [window.innerWidth / 2, window.innerHeight * 0.4]);
  toastEl().classList.add('gold'); setTimeout(() => toastEl().classList.remove('gold'), 3600);
}
const toastEl = () => $('toast');
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
// The food is chosen inside the Care menu (game.feedFood). Once you tap Feed the menu closes and the meal drops in by itself.
// Feeding: tapping Feed shows what can be fed just above the bar, then a tap on the water drops it.
// which foods make sense: crabs for an octopus, flakes and the rest for fish. A tank with only octopuses is offered crabs alone.
// the octopuses this caretaker may feed: their own (in a shared tank), or any in a solo tank; the hungriest first
function myOctos() { const s = game.state, me = game.you?.userId, l = s.fish.filter((f) => canFeedOcto(f, me, game.shared)).sort((a, b) => octoHunger(b) - octoHunger(a)), pick = l.find((f) => f.id === game.feedFor); return pick ? [pick, ...l.filter((f) => f !== pick)] : l; }      // the one chosen in the menu first
function mySeas() { const s = game.state, me = game.you?.userId, l = s.fish.filter((f) => f.species === 'seahorse' && canFeedOwn(f, me, game.shared)).sort((a, b) => ownHunger(b) - ownHunger(a)), pick = l.find((f) => f.id === game.feedFor); return pick ? [pick, ...l.filter((f) => f !== pick)] : l; }      // the seahorses this caretaker feeds (their own, or any in a solo tank)
function foodsFor() { const s = game.state, octo = myOctos().length > 0, sea = mySeas().length > 0, fish = s.fish.some((f) => !f.dead && f.species !== 'octopus' && f.species !== 'seahorse') || !s.fish.some((f) => !f.dead); return Object.entries(FOODS).filter(([, d]) => (d.turtle ? s.fish.some((f) => !f.dead && isTurtleR(f)) : d.octo ? octo : d.sea ? sea : fish)); }
function defaultFood() { const ks = foodsFor().map(([k]) => k); if (!ks.includes(game.feedFood ?? 'flakes')) game.feedFood = ks[0] ?? 'flakes'; return game.feedFood ?? 'flakes'; }
const dropWord = (k) => { if (k === 'crab') return `a crab for ${myOctos()[0]?.name ?? 'the octopus'}`; if (k === 'mysis') return `mysis shrimp for ${mySeas()[0]?.name ?? 'the seahorse'}`; return FOODS[k].label.toLowerCase(); };
const FOOD_ICON = { flakes: '🫧', pellets: '🟤', treats: '🍤', mysis: '🦐', crab: '🦀' };
// the food was chosen in the Care drawer; while feeding, a small strip at the top says what a tap does, and the tank below is left clear
function renderFoodbar() {
  if (autoFeed) return;
  const bar = $('foodbar'), k = defaultFood();
  const ks = foodsFor().map(([x]) => x), left = Math.max(0, 3 - feedDrops), many = ks.length > 1, d = FOODS[k];
  // the food (tap it to change) and who it is for, then what to do and how many drops are left
  bar.innerHTML = `<button class="fsw" data-swap ${many ? '' : 'disabled'}><span class="fi">${FOOD_ICON[k] ?? '🫧'}</span><span class="ft"><b>${esc(d.label)}${d.price ? ` · ${d.price} 🐚` : ''}${many ? ' <i>⌄</i>' : ''}</b><small>Tap the water · ${esc(dropWord(k).replace(/^.*? for /, 'for ').replace(/^(flakes|pellets|treats)$/, 'for the fish'))}</small></span></button><span class="fdots" aria-label="${left} drops left">${[0, 1, 2].map((i) => `<i class="${i < left ? 'on' : ''}"></i>`).join('')}</span><button data-done class="done">Done</button>`;
  bar.classList.add('on'); bar.querySelector('[data-done]').onclick = () => { sfx('tap'); endFeed(); };
  bar.querySelector('[data-swap]').onclick = () => { if (!many) return; sfx('tap'); let i = ks.indexOf(k); for (let n = 0; n < ks.length; n++) { i = (i + 1) % ks.length; if ((game.state.shells ?? 0) >= FOODS[ks[i]].price) break; } game.feedFood = ks[i]; if (ks[i] === 'crab') game.feedFor = myOctos()[0]?.id ?? null; if (ks[i] === 'mysis') game.feedFor = mySeas()[0]?.id ?? null; feedIdle = 0; renderFoodbar(); };
}
function startFeed() { if (!foodsFor().length) { const o = game.state.fish.find((f) => (f.species === 'octopus' || f.species === 'seahorse') && !f.dead); ui.toast(o ? `Only ${o.ownerName ?? 'its caretaker'} can feed ${o.name}.` : 'Nothing to feed yet.', 3000); return; } cancelModes(); feedMode = true; feedDrops = 0; feedIdle = 0; renderFoodbar(); }
// chosen in the Care menu: the menu closes and the food goes straight in, above the animal it is for (or the fish), where you can see it;
// the bar stays for a second or third drop if you want one
// (no tapping the water: the whole meal goes in by itself, a crab beside the octopus, or up to three pinches spread over the fish or the seahorse,
// stopping as soon as they have had enough; no food bar)
let autoFeed = false;
function feedGo() {
  autoFeed = true; startFeed(); if (!feedMode) { autoFeed = false; return; } $('foodbar')?.classList.remove('on');
  const food = defaultFood(), f = game.feedFor && fishes.byId.get(game.feedFor), fish = fishes.list.filter((x) => !x.dead && !x.visitor && x.species?.move !== 'jet' && x.sk !== 'seahorse');
  const x0 = f ? f.pos.x : fish.length ? fish.reduce((a, o) => a + o.pos.x, 0) / fish.length : 0, at = (dx) => Math.max(-3.6, Math.min(3.6, x0 + dx));
  const still = () => { const oc = game.feedFor && game.state.fish.find((q) => q.id === game.feedFor); return food === 'crab' || food === 'mysis' ? !!oc && ownHunger(oc) >= 0.08 : (game.state.hunger ?? 0) >= 0.08; };
  const n = food === 'crab' ? 1 : 3, spread = [0, -0.9, 0.9];
  (async () => { for (let i = 0; i < n; i++) { if (i && (!still() || !feedMode)) break; await dropFood(at(spread[i])); if (i < n - 1) await new Promise((r) => setTimeout(r, 650)); } autoFeed = false; endFeed(); })();
}
function endFeed() { feedMode = false; $('foodbar')?.classList.remove('on'); }
async function dropFood(x) {
  const food = defaultFood(), own = food === 'crab' || food === 'mysis', mine = food === 'crab' ? myOctos() : food === 'mysis' ? mySeas() : [];
  const oc = own ? (mine.find((o) => o.id === game.feedFor) ?? [...mine].sort((a, b) => ownHunger(b) - ownHunger(a))[0] ?? null) : null;      // the one you chose in Care, else your hungriest (not just the first one you have)
  if (own ? !oc || ownHunger(oc) < 0.08 : game.state.hunger < 0.08) { const hrs = (h) => (h < 1 ? 'within the hour' : `in about ${Math.round(h)} hour${Math.round(h) === 1 ? '' : 's'}`); ui.toast(oc ? `${oc.name} isn't hungry yet. Ready for ${food === 'crab' ? 'a crab' : 'shrimp'} ${hrs((0.08 - ownHunger(oc)) / OHR / 3600)}.` : `The fish aren't hungry yet. Feed them again ${hrs((0.08 - game.state.hunger) / HR / 3600)}.`, 3600); endFeed(); return; }
  if ((game.state.shells ?? 0) < FOODS[game.feedFood ?? 'flakes'].price) { game.feedFood = 'flakes'; ui.toast('Back to flakes. Not enough shells.'); }
  if (food === 'crab') fishes.dropCrabAt(x, oc.id); else fishes.drop(x, 7, food); sfx('splash'); haptic(8);
  feedDrops++; feedIdle = 0; if (feedDrops >= 3) endFeed(); else if (!autoFeed) renderFoodbar();
  const r = await game.dispatch({ t: 'feed', x, food, fish: oc?.id }); if (!r.ok) return fail(r);
  if (r.delta > 0) shellToast(r); tut.onFeed();
}
// glass cleaning
const gcv = $('glass'), gg = gcv.getContext('2d'); gcv.width = 195; gcv.height = 346;
// the glass grows a film: a soft green-grey haze over the whole pane (thicker low down and at the edges, where it really builds up), with
// spots of algae on top. Wiping takes the film off in clean, soft-edged streaks, so you can see exactly where you have been
function film(g) {
  gg.clearRect(0, 0, 195, 346); if (g < 0.05) return; const k = Math.min(1, g / 0.8), w = Math.max(0, Math.min(1, (g - 0.3) / 0.5));      // (k: the spots; w: the haze, only once a wipe is due and never a heavy wash: the tank's own colors stay bright)
  if (w > 0) { const base = gg.createLinearGradient(0, 0, 0, 346); base.addColorStop(0, `rgba(176,196,178,${0.12 * w})`); base.addColorStop(0.6, `rgba(150,176,146,${0.16 * w})`); base.addColorStop(1, `rgba(112,140,92,${0.22 * w})`); gg.fillStyle = base; gg.fillRect(0, 0, 195, 346); }
  for (const [x0, x1] of [[0, 34], [161, 195]]) { const e = gg.createLinearGradient(x0 ? x1 : x0, 0, x0 ? x0 : x1, 0); e.addColorStop(0, `rgba(96,128,74,${0.22 * k})`); e.addColorStop(1, 'rgba(96,128,74,0)'); gg.fillStyle = e; gg.fillRect(x0, 0, x1 - x0, 346); }      // thicker in the corners of the pane
  for (let i = 0; i < 60 + 180 * k; i++) { const x = Math.random() * 195, y = Math.pow(Math.random(), 0.7) * 346, r = 6 + Math.random() * 22, c = gg.createRadialGradient(x, y, 0, x, y, r); c.addColorStop(0, `rgba(${110 + Math.random() * 50},${140 + Math.random() * 40},${90 + Math.random() * 30},${(0.03 + Math.random() * 0.07) * w})`); c.addColorStop(1, 'rgba(120,150,100,0)'); gg.fillStyle = c; gg.fillRect(x - r, y - r, r * 2, r * 2); }      // the haze is blotchy, never a flat tint
  for (let i = 0; i < 40 * k; i++) { gg.strokeStyle = `rgba(230,240,230,${0.05 + Math.random() * 0.06})`; gg.lineWidth = 0.6 + Math.random(); const x = Math.random() * 195, y = Math.random() * 346; gg.beginPath(); gg.moveTo(x, y); gg.lineTo(x + 6 + Math.random() * 16, y + 2 + Math.random() * 10); gg.stroke(); }      // faint streaks where the light catches the film
  for (let i = 0; i < 380 * k; i++) { const edge = Math.random() < 0.6, x = edge ? (Math.random() < 0.5 ? Math.random() * 40 : 155 + Math.random() * 40) : Math.random() * 195, y = Math.pow(Math.random(), 0.6) * 346; gg.fillStyle = `rgba(${60 + Math.random() * 40},${120 + Math.random() * 40},${36 + Math.random() * 30},${0.2 + Math.random() * 0.3})`; gg.beginPath(); gg.arc(x, y, 0.6 + Math.random() * 2.4, 0, 6.3); gg.fill(); }      // and spots of algae on top
}
let shownGlass = -1;
// a blue tang grazing at the glass eats the film off where its mouth is: small clean bites you can watch appear along its path
let grazeT = 0;
function grazeGlass(dt) { if ((grazeT -= dt) > 0 || cleanMode || wiping || shownGlass <= 0) return; grazeT = 0.15;
  for (const f of fishes.list) { if (f.sk !== 'tang' || !f.graze || f.graze.rock || f.dead) continue; if (f.pos.z < 1.6) continue;
    const mouth = f.pos.clone().add(new THREE.Vector3(Math.cos(f.heading ?? 0) * 0.35, 0, 0)), [sx, sy] = toScreen(mouth), r = gcv.getBoundingClientRect(), x = (sx - r.left) / r.width * 195, y = (sy - r.top) / r.height * 346;
    if (x < 0 || x > 195 || y < 0 || y > 346) continue; gg.globalCompositeOperation = 'destination-out'; const c = gg.createRadialGradient(x, y, 0, x, y, 9); c.addColorStop(0, "rgba(0,0,0,.95)"); c.addColorStop(1, "rgba(0,0,0,0)"); gg.fillStyle = c; gg.fillRect(x - 9, y - 9, 18, 18); gg.globalCompositeOperation = 'source-over'; } }
function syncGlass() { const g = game.state.glass; algaeTint(Math.max(0, (g - 0.2) / 0.6)); fishes.algae = g; if (cleanMode || wiping) return; if (Math.abs(g - shownGlass) > 0.02 || (g < 0.05 && shownGlass !== 0)) { film(g); shownGlass = g < 0.05 ? 0 : g; } }
function startClean() { cancelModes(); if (game.state.glass <= 0.12) { ui.toast('The glass is already clean'); return; } cleanMode = true; gcv.style.pointerEvents = 'auto'; ui.toast('Swipe the glass to wipe it clean'); }
let wiping = false;
let wipeLast = null;
const wipeDot = (x, y) => { const c = gg.createRadialGradient(x, y, 0, x, y, 19); c.addColorStop(0, 'rgba(0,0,0,1)'); c.addColorStop(0.62, 'rgba(0,0,0,0.95)'); c.addColorStop(1, 'rgba(0,0,0,0)'); gg.fillStyle = c; gg.fillRect(x - 19, y - 19, 38, 38); };
const wipe = (e) => { const r = gcv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 195, y = (e.clientY - r.top) / r.height * 346; gg.globalCompositeOperation = 'destination-out';
  const p = wipeLast ?? { x, y }, n = Math.max(1, Math.ceil(Math.hypot(x - p.x, y - p.y) / 5)); for (let i = 1; i <= n; i++) wipeDot(p.x + (x - p.x) * i / n, p.y + (y - p.y) * i / n);      // a continuous clean streak, however fast the finger goes
  gg.globalCompositeOperation = 'source-over'; wipeLast = { x, y }; sfx('wipe'); };
gcv.addEventListener('pointerdown', (e) => { wiping = true; wipeLast = null; wipe(e); }); gcv.addEventListener('pointermove', (e) => { if (wiping) wipe(e); });
addEventListener('pointerup', async () => {
  if (!wiping) return; wiping = false; wipeLast = null;
  const d = gg.getImageData(0, 0, 195, 346).data; let left = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 40) left++;
  if (left / (d.length / 16) < 0.12) {      /* (most of the pane done: the last wisps go with it) */ cleanMode = false; gcv.style.pointerEvents = 'none'; gg.clearRect(0, 0, 195, 346); const r = await game.dispatch({ t: 'glass' }); if (r.ok) { shellToast(r); if (!r.delta) ui.toast('Spotless'); shownGlass = 0; } else fail(r); }
});
// water
const wc = makeWaterChange({ canvas: $('wc'), camera, fishes, surfY: () => stg.surf.mesh.position.y, sfx, haptic });
async function changeWater() {
  if (wc.active) return;
  if (game.state.water >= 0.7) { ui.toast('The water is already fresh'); return; }
  cancelModes(); setFocus(null);
  const act = async () => { const r = await game.dispatch({ t: 'water' }); if (r.ok) shellToast(r); else fail(r); return r.ok; };
  if (REDUCED) { sfx('splash'); await act(); return; }
  ui.toast('Time for fresh water'); haptic(12);
  if (wc.start({ dirt0: Math.min(1, 0.6 + (1 - game.state.water) * 1.2), dispatch: act }) && game.shared) game.live?.send({ t: 'fx', kind: 'water' });
}

// ── placement & rearranging ──
const ray = new THREE.Raycaster(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
// the top of the water that is really visible: below the header buttons and the phone's safe area. Fish never go above it, and food starts there.
function fitTop() {
  const r = canvas.getBoundingClientRect(); if (!r.height) return; const sc = Math.max(r.width / IW, r.height / IH), dh = IH * sc, hb = document.querySelector('header')?.getBoundingClientRect().bottom ?? 60;
  const c = new THREE.PerspectiveCamera(camera.fov, camera.aspect, camera.near, camera.far); c.position.set(0, stg.CAM_Y, stg.CAM_Z); c.lookAt(0, stg.LOOK_Y, 0); c.updateMatrixWorld(); c.updateProjectionMatrix();
  const v = (hb + 34 - r.top - (r.height - dh)) / dh, rr = new THREE.Raycaster(); rr.setFromCamera(new THREE.Vector2(0, -(v * 2 - 1)), c); const pl = new THREE.Plane(new THREE.Vector3(0, 0, 1), -2.6), out = new THREE.Vector3();
  if (rr.ray.intersectPlane(pl, out)) Fish3D.topY = Math.max(8, Math.min(14.5, out.y));
}
addEventListener('resize', fitTop); addEventListener('orientationchange', fitTop); setTimeout(fitTop, 400); setTimeout(fitTop, 2500);
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
  $('placehint').innerHTML = `<b>${esc(d.label)}</b>${id ? 'Slide to move it' : 'Drag to place it'}`;
  $('pok').textContent = id ? 'Place' : free ? 'Place · Free' : `Buy · 🐚 ${d.price}`; $('psell').hidden = !id; if (id) $('psell').textContent = `Sell +${Math.floor(d.price / 2)}`;
  placebar.classList.add('on'); updatePlaceOk();
}
const updatePlaceOk = () => { const p = decor.preview; $('pok').disabled = !p?.valid; };
window.__startPlace = startPlace; window.__decorMenu = (id) => decorMenu(id);      // for the drills: start placing a decoration as the shop does
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
// tap a decoration you placed: its own little card (what it is, who loves it), with Move and Take it out
async function decorMenu(id) {
  const d = game.state.decor.find((x) => x.id === id), D = d && DECOR_DEF[d.type]; if (!D || placing || feedMode || cleanMode || document.querySelector('.notesheet')) return; sfx('tap'); haptic(6);
  const half = Math.floor(D.price / 2), star = d.type === 'starfish', lovers = game.state.fish.filter((f) => !f.dead && (f.home === id || f.spotId === id)), who = lovers.map((f) => f.name).join(' and ');
  if (star) { const it = decor.items.get(id); if (it) it.curlT = performance.now(); sfx('curl'); }      // touched, a starfish curls its arms up for a moment
  const about = lovers.length ? (lovers.some((f) => f.home === id) ? `${who} ${lovers.length > 1 ? 'live' : 'lives'} here.` : `${who}'s favorite spot.`) : '', days = Math.max(0, Math.floor((Date.now() - (d.at ?? Date.now())) / 864e5));
  const el = document.createElement('div'); el.className = 'notesheet deco';
  el.innerHTML = `<div class="nsw"><button class="grab" aria-label="Close"></button><div class="dch"><h3>${esc(D.label)}</h3><p>${esc(D.blurb ?? '')}</p>${about ? `<p class="dlove">♥ ${esc(about)}</p>` : ''}<small>${days ? `In the tank for ${days} day${days === 1 ? '' : 's'}` : 'New in the tank'}</small></div>
    <div class="nsact"><button class="mv"><i>✥</i><span>${star ? 'Carry it' : 'Move it'}</span></button><button class="down"><i>${star ? '🌊' : '✕'}</i><span>${star ? 'Let it go' : 'Take it out'}${half ? ` · +${half} 🐚` : ''}</span></button></div></div>`;
  document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
  const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 300); };
  el.onclick = (e) => { if (e.target === el) close(); }; el.querySelector('.grab').onclick = close;
  el.querySelector('.mv').onclick = () => { close(); startPlace(d.type, id); };
  el.querySelector('.down').onclick = async () => { close();
    if (lovers.length && !(await ui.dialog({ title: star ? 'LET IT GO?' : 'TAKE IT OUT?', text: lovers.some((f) => f.home === id) ? `${who} ${lovers.length > 1 ? 'live' : 'lives'} in it and will have to find a new home. ${lovers.length > 1 ? 'They' : 'It'} will miss it for a while.` : `It is ${who}'s favorite spot. ${lovers.length > 1 ? 'They' : 'It'} will miss it, and go looking for a new one.`, ok: star ? 'Let it go' : 'Take it out', cancel: 'Keep it', danger: true }))) return;
    const r = await game.dispatch({ t: 'sellDecor', id }); if (r.ok) { sfx('coin'); if (!lovers.length) ui.toast(star ? `The starfish slipped away to the sea${half ? ` · +${r.delta} 🐚` : ''}` : half ? `${D.label} taken out · +${r.delta} 🐚` : `${D.label} taken out`); decor.sync(game.state.decor, game.state); } else fail(r); };
}
function cancelModes() { endFeed(); if (cleanMode) { cleanMode = false; gcv.style.pointerEvents = 'none'; } if (placing) { decor.cancel(); endPlace(); } setRearrange(false, true); }
function setRearrange(on, silent = false) {
  rearrange = on; if (ui) ui.rearrange = on;
  if (on) { placebar.classList.add('on'); $('placehint').textContent = 'Tap a decoration to move or sell it'; $('pok').hidden = true; $('prot').hidden = true; $('psell').hidden = true; $('pcan').textContent = 'Done'; }
  else if (!placing) { placebar.classList.remove('on'); }
}

// ── adopting fish ──
async function adopt(species, pick = null) {
  const d = SPECIES_DEF[species], s = game.state;
  const life = LIFESPAN[species], lifeTxt = life ? ` Lives about ${life >= 365 ? `${Math.round(life / 30.4)} months` : `${Math.round(life / 30.4)} months`} in the tank.` : '', fod = factOfDay(species);
  let kind = KINDS[species]?.[pick] ? pick : null; if (KINDS[species] && !kind) {      // (picked from its own card in the shop: no need to ask)
      // a seahorse or an octopus is one of several real species: the caretaker picks which
    const same = s.fish.filter((f) => f.species === species && !f.dead), have = (k) => same.filter((f) => kindOf(f) === k).length;
    kind = await ui.choose({ title: `Which ${d.label.toLowerCase()}?`, text: species === 'seahorse' ? 'Each is a real species with its own look and temper. Seahorses only pair with their own kind.' : 'Each is a real species with its own look and temper. Two octopuses of different kinds can keep each other company, but only the same kind lay eggs.',
      options: Object.entries(KINDS[species]).map(([k, K]) => ({ label: `${K.label} · ${K.temper}${have(k) ? ` · ${have(k)} in your tank` : ''}`, value: k })), cancel: 'Not now' });
    if (!kind) return; }
  const KD = kind ? KINDS[species][kind] : null;
  const about = `${KD ? `${KD.note} ${KD.care}` : d.blurb}${SOCIAL[species] ? ` ${SOCIAL[species].kind}. ${SOCIAL[species].line}` : ''}${lifeTxt}${fod ? ` Did you know? ${fod.text}` : ''}`;      // what it is like, how long it lives, and one real fact
  let special = false; { const SP = specialOf(s, Date.now()); if (SP.species === species && species !== 'octopus') { const k = await ui.choose({ title: "TODAY'S SPECIAL", text: `This one carries ${MORPHS[SP.color].label.toLowerCase()}, hidden in its genes: paired with another carrier, their babies could be ${MORPHS[SP.color].label.toLowerCase()}. ${specialPrice(species, s) > SPECIES_DEF[species].price ? `It costs ${specialPrice(species, s)} shells instead of ${SPECIES_DEF[species].price}.` : 'Your goal has waited a week for one, so today it costs the usual price.'}`, options: [{ label: `The carrier · ${specialPrice(species, s)} 🐚`, value: 'special' }, { label: `A plain one · ${SPECIES_DEF[species].price} 🐚`, value: 'plain' }], cancel: 'Not now' }); if (!k) return; special = k === 'special'; if (special && s.shells < specialPrice(species, s)) { ui.toast(REASONS.NOT_ENOUGH_SHELLS); return; } } }      // today's special: a carrier of a rare color, or a plain one at the usual price
  const names = d.count === 1 ? await ui.dialog({ title: `Name your ${(KD?.label ?? d.label).toLowerCase()}`, text: about, input: { value: ['Biscuit', 'Nori', 'Coral', 'Fin', 'Pearl', 'Sunny', 'Dot', 'Misty'][(s.fish.length * 3 + 1) % 8], placeholder: 'Name' }, ok: `Adopt · 🐚 ${special ? specialPrice(species, s) : fishPrice(species)}`, cancel: 'Not now' })
    : await ui.dialog({ title: `ADOPT A SCHOOL`, text: `${about} ${d.count} swim together; choose a name for the group.`, input: { value: d.label.split(' ')[0], placeholder: 'Group name' }, ok: `Adopt · 🐚 ${special ? specialPrice(species, s) : fishPrice(species)}`, cancel: 'Not now' });
  if (!names) return;
  { const adv = adoptAdvice(s, species); if (adv && !(await ui.dialog({ title: 'Good to know', text: adv, ok: 'Adopt anyway', cancel: 'Not now' }))) return; }
  let sex; if (species === 'seahorse') {      // a seahorse is a male or a female: the caretaker chooses (pairs are a male and a female; the male carries the young)
    const hs = s.fish.filter((f) => f.species === 'seahorse' && !f.dead), m = hs.filter((f) => sexOf(f) === 'm').length, w = hs.length - m;
    sex = await ui.choose({ title: 'Male or female?', text: `Seahorses pair as a male and a female, and the male carries the young.${hs.length ? ` In your tank now: ${m} male${m === 1 ? '' : 's'}, ${w} female${w === 1 ? '' : 's'}.` : ''}`, options: [{ label: '♂ Male', value: 'm' }, { label: '♀ Female', value: 'f' }], cancel: 'Not now' });
    if (!sex) return;
  } else if (SPECIES_DEF[species]?.count === 1 && species !== 'octopus') {      // a single fish: if the tank has some of its kind, it can be chosen to make a pair (or left to chance)
    const same = s.fish.filter((f) => f.species === species && !f.dead), m = same.filter((f) => sexOf(f) === 'm').length, w = same.length - m;
    if (same.length) { const need = m && !w ? 'f' : w && !m ? 'm' : null; const k = await ui.choose({ title: 'Male or female?', text: `In your tank now: ${m} male${m === 1 ? '' : 's'}, ${w} female${w === 1 ? '' : 's'}. A male and a female can have babies.`, options: [{ label: need === 'f' ? '♀ Female (makes a pair)' : '♀ Female', value: 'f' }, { label: need === 'm' ? '♂ Male (makes a pair)' : '♂ Male', value: 'm' }, { label: 'Either', value: 'any' }], cancel: 'Not now' }); if (!k) return; if (k !== 'any') sex = k; }
  }
  let to; { const others = (game.members ?? []).filter((m) => m.id !== game.you?.userId); if (game.shared && others.length) { const pick = await ui.choose({ title: 'Who is it for?', text: 'A fish can be a gift. The friend you give it to becomes its first caretaker.', options: [{ label: 'For the tank', value: null }, ...others.map((m) => ({ label: `A gift for ${m.name}`, value: m.id }))], cancel: 'Not now' }); if (pick === undefined) return; to = pick ?? undefined; } }
  let note, surprise; if (to) { const who = game.members?.find((m) => m.id === to)?.name ?? 'them';
    surprise = await ui.choose({ title: 'Keep it a surprise?', text: `Wrapped, ${who} only finds out what it is when they open it in the tank.`, options: [{ label: '🎁 Keep it a surprise', value: true }, { label: `Tell ${who} what it is`, value: false }], cancel: 'Not now' }); if (surprise === undefined) return;
    note = await ui.dialog({ title: 'Add a note', text: `A few words to go with it, for ${who} to read when it arrives. You can leave it blank.`, input: { value: '', placeholder: 'Thought you would love this one!' }, ok: 'Send the gift', cancel: 'Skip the note' }); }
  const r = await game.dispatch({ t: 'buyFish', species, name: names, seed: (Math.random() * 90000) | 0, to, ...(to ? { surprise, note: typeof note === 'string' ? note : '' } : {}), ...(sex ? { sex } : {}), ...(kind ? { kind } : {}), ...(special ? { special: true } : {}) });
  if (!r.ok) return fail(r);
  ui.open('tank'); sfx('buy'); ui.refresh();
}
const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// trimming: every grown plant visibly shrinks back, a pair of scissors snips above each one and a few green clippings fall away from it
async function trimPlants() {
  const ids = readyToTrim(game.state, game.now()).map((d) => d.id); if (!ids.length) { ui.toast('Nothing needs trimming yet'); return; }
  const r = await game.dispatch({ t: 'trim' }); if (!r.ok) return fail(r); if (!r.applied) { ui.toast('Nothing needs trimming yet'); return; }
  decor.grow(game.state); snipFx(ids); sfx('tap'); haptic(10); setTimeout(() => sfx('tap'), 180);
  ui.toast(`Trimmed ${ids.length} plant${ids.length > 1 ? 's' : ''} ✂️ +${r.delta} 🐚`, 3200); flyShells(r.delta);
}
function snipFx(ids) {
  const rc = canvas.getBoundingClientRect();
  ids.forEach((id, n) => setTimeout(() => {
    const q = (decor.spots?.() ?? []).find((x) => x.id === id); if (!q) return; const it = decor.items?.get(id), bb = new THREE.Box3(); it?.group.updateMatrixWorld(true); it?.group.traverse((o) => { if (o.isMesh && o.visible && o.geometry) { if (o.isInstancedMesh) { o.computeBoundingBox(); bb.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld)); } else { o.geometry.boundingBox || o.geometry.computeBoundingBox(); bb.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } } });      // the plant as it is drawn (solid parts only)
    const tipY = bb.isEmpty() ? sandH(q.x, q.z) + (q.h ?? 1) : bb.max.y - 0.15, top = new THREE.Vector3(q.x, tipY, q.z).project(camera);      // the top of the plant as it is now (it is shrinking back)
    if (top.z > 1) return; const x = rc.left + (top.x + 1) / 2 * rc.width, y = rc.top + (1 - top.y) / 2 * rc.height, host = document.getElementById('app') ?? document.body;
    const fx = document.createElement('div'); fx.className = 'snipfx'; fx.style.left = x + 'px'; fx.style.top = y + 'px'; fx.innerHTML = '<b>✂️</b>' + Array.from({ length: 9 }, (_, i) => `<i style="--dx:${Math.round((Math.random() - 0.5) * 90)}px;--dy:${Math.round(40 + Math.random() * 80)}px;--r:${Math.round((Math.random() - 0.5) * 540)}deg;--d:${(0.05 * i).toFixed(2)}s"></i>`).join('');
    host.appendChild(fx); setTimeout(() => fx.remove(), 2600);
  }, n * 260));
}

// a crab dropped just in front of the octopus, from its card: the same meal as from Feed, without hunting for the water
async function feedCrabTo(id) {
  const rec = game.state.fish.find((x) => x.id === id), f = fishes.byId.get(id); if (!rec || rec.dead) return;
  if (octoHunger(rec) < 0.08) { ui.toast(`${rec.name} isn't hungry yet.`); return; }
  const x = Math.max(-3.5, Math.min(3.5, (f?.pos.x ?? 0) + 0.5)); fishes.dropCrabAt(x, id); sfx('splash'); haptic(8);
  const r = await game.dispatch({ t: 'feed', x, food: 'crab', fish: id }); if (!r.ok) return fail(r);
  if (r.delta > 0) shellToast(r); tut.onFeed(); ui.refresh();
  if (r.applied && f && !f.dead && octoTrust(rec, game.you?.userId ?? 'me').lvl >= 3) { f.glassAt = { x, y: 3.6, until: performance.now() + 5000 }; setTimeout(() => ui.toast(`${rec.name} reaches up and takes it from your fingers.`, 2600), 900); }      // it trusts you completely: it comes up to take the crab from you
}
// an octopus that has come to trust you comes over to the glass when you look in
function octoHello() { fishes.greet?.(); }      // each octopus greets this caretaker by how well it knows them (FishManager.greet: the glass, its den, or carrying on)
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(octoHello, 1200); });
async function giveCrab() {
  const me = game.you?.userId, mine = game.state.fish.filter((f) => f.species === 'octopus' && !f.dead && canFeedOcto(f, me, game.shared)), o = mine.find((f) => !(f.crabAt != null && Date.now() - f.crabAt < 2 * 3600e3)) ?? mine[0]; if (!o) { ui.toast(game.state.fish.some(canPuzzle) ? 'Only its own caretaker can give it a treat' : 'Only a grown octopus eats crabs'); return; }
  const r = await game.dispatch({ t: 'crab', id: o.id }); if (!r.ok) return fail(r);
  if (!r.applied) { const m = Math.max(1, Math.ceil((r.wait ?? 0) / 60e3)); ui.toast(`${o.name} is full. Try again in about ${m >= 90 ? Math.round(m / 60) + ' hours' : m + ' minutes'}.`); return; }
  sfx('splash'); haptic(8); ui.refresh(); spotlightFish(o.id, 5200, 1500);
}
// Hide a treat: choose where, and the octopus hunts for it, spot by spot, in the order it has learnt (the order comes from the rules, the same on every phone)
async function hideTreat() {
  const s = game.state, o = s.fish.find((f) => f.species === 'octopus' && !f.dead && !f.seek) ?? s.fish.find((f) => f.species === 'octopus' && !f.dead);
  if (!o) { ui.toast('An octopus loves this game. Get one first.'); return; }
  if (s.decor.length < 2) { ui.toast('Put at least two decorations in the tank to hide things in.'); return; }
  if (o.seek) { ui.toast(`${o.name} is still searching`); return; }
  const where = await ui.choose({ title: 'Hide a treat', text: `Pick a place. ${o.name} remembers where you hide things, so a new place fools it. ${HIDE_COST} 🐚`, options: s.decor.map((d) => ({ label: hideLabel(s, d.id).replace(/^\w/, (c) => c.toUpperCase()), value: d.id })) });
  if (!where) return;
  const r = await game.dispatch({ t: 'hide', id: o.id, spot: where }); if (!r.ok) return fail(r);
  if (r.busy) { ui.toast(`${o.name} is still searching`); return; }
  if (!r.applied) { const m = Math.max(1, Math.ceil((r.wait ?? 0) / 60e3)); ui.toast(`${o.name} needs a break. Try again in about ${m} minute${m > 1 ? 's' : ''}.`); return; }
  sfx('splash'); haptic(8); ui.refresh(); spotlightFish(o.id, 4200, 1600); ui.toast(`Hidden in the ${hideLabel(s, where)}. Watch ${o.name} look for it.`, 3500);
}
// the hunt on screen: the octopus goes to each place in turn and has a good look; when it is found, bubbles at the treat
setInterval(() => { const s = game.state; if (!s) return;
  for (const d of s.fish) { const f = fishes.byId.get(d.id); if (!f) continue;
    if (d.seek) { const k = Math.min(d.seek.path.length - 1, Math.floor((game.now() - d.seek.at) / (HIDE_STEP * 1000))), sp = decor.spots().find((q) => q.id === d.seek.path[k]);
      if (sp && f.seekStep !== d.seek.at + ':' + k) { f.seekStep = d.seek.at + ':' + k; f.seekSpot = sp; f.inspect = { x: sp.x, z: sp.z }; } }
    else if (f.seekStep) { const sp = f.seekSpot; f.seekStep = null; f.seekSpot = null; if (sp) fishes.burst?.(new THREE.Vector3(sp.x, (sp.y ?? 0) + 0.9, sp.z + 0.3)); } } }, 1000);
// an animal that has asked to leave: nurse it back (the card shows what it is missing) or let it go back to the sea
function leaveBlock(rec) {
  const L = rec?.leaveAsk; if (!L || rec.dead) return ''; 
  return `<div class="leaveask"><b>${esc(rec.name)} is asking to leave</b><span>${L.why ? `It is missing ${esc(L.why)}. ` : 'It has been unhappy for days. '}Give it what it is missing and keep it fed, and it will settle back in: it will not leave on its own. It can't be sold while it is unhappy.</span><button class="act2" id="letgo">Let it go to the sea</button></div>`;
}
// a sea turtle is raised to be let go: how long until it is ready for the ocean, and when it is, the button that sends it
function turtleBlock(rec) {
  if (!isTurtleR(rec) || rec.dead) return '';
  if (!turtleReady(rec)) { const n = turtleDaysLeft(rec); return `<div class="now">${msIcon('turtle', true, 14)} <span>Growing up. Ready for the ocean in about ${n} day${n === 1 ? '' : 's'}; the better it is looked after, the more it is worth when it goes.</span></div>`; }
  return `<div class="acts2 playrow"><button class="act2 due" id="turtrel">${msIcon('turtle', true, 18)} Release ${esc(rec.name)} to the ocean</button></div>`;
}
async function releaseTurtle(rec) {
  const yes = await ui.dialog({ title: `Release ${rec.name}?`, text: `${rec.name} is grown and ready for the open ocean. Its keepers get about ${TURTLE_PAY} shells (more if it is thriving), it leaves a keepsake behind, and it may come back to visit one day.`, ok: 'Let it go', cancel: 'Not yet' });      // (a yes or no is a dialog, not a list to pick from)
  if (!yes) return; const f = fishes.byId.get(rec.id); setFocus(null);
  if (f) { f.retarget = 30; f.idle = 0; f.mul = 1.5; f.target.set(f.pos.x * 0.5, Fish3D.topY + 1, 0.6); f.thought = 'Off to the ocean.'; sfx('arrive'); for (let i = 0; i < 6; i++) setTimeout(() => fishes.burst(f.pos.clone()), 400 + i * 450); }      // up it goes, out through the surface, trailing bubbles
  await new Promise((q) => setTimeout(q, 3600)); moment({ at: f?.pos.clone() ?? null, haptics: 30 });
  const r = await game.dispatch({ t: 'releaseTurtle', id: rec.id }); if (!r.ok) return fail(r); if (r.delta > 0) flyShells(r.delta, [window.innerWidth / 2, window.innerHeight * 0.3]);
}
async function givePuzzle(id) {
  const o = id ? game.state.fish.find((f) => f.id === id) : game.state.fish.find((f) => canPuzzle(f) && !f.puzzle) ?? game.state.fish.find((f) => canPuzzle(f)); if (!o) { const b = game.state.fish.find((f) => f.species === 'octopus' && !f.dead), nx = b && nextStage(b); ui.toast(b ? `Puzzle jars are for grown octopuses. ${b.name} grows up in ${nx?.label ?? 'a little while'}.` : 'Puzzle jars are for octopuses.', 3200); return; }
  const r = await game.dispatch({ t: 'puzzle', id: o.id }); if (!r.ok) return fail(r); capNote();
  if (r.busy) { ui.toast(`${o.name} is still working on the jar`); return; }
  if (!r.applied) { const h = Math.max(1, Math.ceil((r.wait ?? 0) / 3600e3)); ui.toast(`${o.name} needs a rest. Try again in about ${h} hour${h > 1 ? 's' : ''}.`); return; }
  sfx('splash'); haptic(8); ui.refresh(); spotlightFish(o.id, 4200, 1600);
}
// the octopus's own things, always shown so it is clear they exist: a puzzle jar (from when it grows up) and a crab treat (its caretaker's to give)
function brainBlock(rec) {
  if (!isSmart(rec)) return '';
  const can = canPuzzle(rec), nx = nextStage(rec), mine = canFeedOcto(rec, game.you?.userId, game.shared), restJar = rec.puzzleAt != null && Date.now() - rec.puzzleAt < 3 * 3600e3, restCrab = rec.crabAt != null && Date.now() - rec.crabAt < 2 * 3600e3;
  const jar = rec.puzzle ? '<button class="act2" disabled>🧩 Working on a jar…</button>' : !can ? `<button class="act2" disabled>🧩 Puzzle jar<small>when grown up${nx ? ` · ${nx.label}` : ''}</small></button>` : restJar ? `<button class="act2" disabled>🧩 Puzzle jar<small>tired of puzzles · next in ${(() => { const m = Math.max(1, Math.ceil((3 * 3600e3 - (Date.now() - rec.puzzleAt)) / 60e3)); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`; })()}</small></button>` : `<button class="act2" id="puz">🧩 Puzzle jar<small>${PUZZLE_COST} 🐚</small></button>`;
  // its crab, straight from its card: the old crab treat is gone, a hungry octopus's crab is its treat
  const h = octoHunger(rec), crab = !mine ? '' : h < 0.08 ? `<button class="act2" disabled>🦀 Crab<small>not hungry yet · ${(() => { const m = Math.max(1, Math.round((0.08 - h) / OHR / 60)); return m >= 60 ? `in about ${Math.round(m / 60)}h` : `in ${m} min`; })()}</small></button>` : `<button class="act2 ${h > OCTO_DUE ? 'due' : ''}" id="crabt">🦀 Feed ${esc(rec.name)} a crab<small>${h > OCTO_DUE ? 'hungry now' : 'peckish'} · free</small></button>`;
  return `<div class="acts2">${jar}${crab}</div>`;
}
async function trainFish(f, key, spot) {
  const r = await game.dispatch({ t: 'train', id: f.fid, trick: key }); if (!r.ok) return fail(r);
  if (!r.applied) { ui.toast(`${f.name} needs a rest. Try again in ${Math.max(1, Math.ceil((r.wait ?? 0) / 60e3))} min.`); return; }
  setFocus(null); fishes.perform(f, key, spot); sfx('tap'); if (!r.learned) ui.toast(`${f.name} practised: ${r.n} of ${r.need ?? 5}`);
}
async function showTrick(f, key) {      // ask for it: it does it if it trusts you and is in the mood (the rules decide, so it is the same on every phone)
  const o = TRICKS[key].types.length ? (game.state.decor ?? []).find((d) => TRICKS[key].types.includes(d.type)) : { id: 'glass' }; if (!o) { ui.toast('Needs the decoration to be in the tank'); return; }
  const r = await game.dispatch({ t: 'perform', id: f.fid, trick: key }); if (!r.ok) return fail(r); if (!r.applied) { ui.toast(`${f.name} just did one. Give it a minute.`); return; }
  if (r.success) { setFocus(null); fishes.perform(f, key, o.id); sfx('reward'); ui.toast(`${f.name} did it!`, 2200); return; }
  sfx('tap'); f.fleeT = 1.2; ui.toast(r.why === 'hungry' ? `${f.name} is too hungry to show off. Feed it first.` : r.why === 'mood' ? `${f.name} is not in the mood. A happier fish performs more.` : `${f.name} swam off. It needs to know you better: keep at it.`, 3600);
}
function trickBlock(rec) {
  const learned = (rec.tricks ?? []), opts = trickOptions(game.state, rec), done = learned.length ? `<div class="notes">Tricks: ${learned.map((k) => TRICKS[k]?.label).filter(Boolean).join(', ')}</div>` : '';
  return learned.map((k) => `<button class="lnk" data-show="${k}">Show trick</button>`).join('') + opts.map((o) => `<button class="lnk" data-train="${o.key}" data-spot="${o.spot}">Teach a trick (${o.have}/${o.need})</button>`).join('');
}
// how well the tank suits this fish, a wish it has, and notes people left it
// its wellbeing, the same as Health gives: the ring, the word, what is missing or wrong, and a way to the full picture
function comfortBlock(rec) {
  if (!rec?.species) return '';
  const W = wellOf(game.state, rec), w = game.state.want?.fish === rec.id ? game.state.want : null, notes = (rec.notes ?? []).map((n) => `<i>${esc(n.name)}:</i> ${esc(n.text)}`).join('<br>'), col = { good: '#5fdc8f', ok: '#7cc7ff', warn: '#ffb84d', bad: '#ff6b6b' }[W.mood[1]], C = 2 * Math.PI * 18;
  return `<button class="cmf well" data-wellopen="1"><span class="hring"><svg viewBox="0 0 44 44" width="44" height="44"><circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="5"/><circle cx="22" cy="22" r="18" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(C * W.score) / 100} ${C}" transform="rotate(-90 22 22)"/></svg><b>${W.score}</b></span><span class="wtx"><b>${esc(W.mood[0])} · ${W.met} of ${W.of} needs met</b><small>${esc(W.mood[2])}</small>${w ? `<small class="req">${esc(w.text)}</small>` : ''}</span><i class="chev">›</i></button>${notes ? `<div class="notes">${notes}</div>` : ''}`;
}
async function renameFish(f) {
  const nm = await ui.dialog({ title: 'Rename', input: { value: f.name }, ok: 'Save', cancel: 'Cancel' }); if (!nm) return;
  const r = await game.dispatch({ t: 'nameFish', id: f.fid, name: nm }); if (!r.ok) fail(r); else showCard(f);
}

// ── a find in the tank (brought by something living there, or dropped in): a little bobbing find that never expires; tap it to pick it up ──
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
  if (driftId !== g.id) { driftId = g.id; driftSp.material.map = driftTexture(g.kind); driftSp.material.needsUpdate = true; driftSp.position.set(g.x, sandH(g.x, g.z) + 2.1, g.z); driftSp.userData.y0 = driftSp.position.y; if (driftSp.userData.seen !== g.id) { driftSp.userData.seen = g.id; if (game.state.flags.tut >= 5) { sfx('arrive'); fishes.burst(driftSp.position); } } }
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
const bottleTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 24; const g = c.getContext('2d'), r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };      // a corked glass bottle with a rolled letter inside, drawn upright (it is tipped over on the sand by turning the sprite)
  r(9, 0, 6, 4, '#1f4f5c'); r(9, 3, 6, 6, '#1f4f5c'); r(6, 7, 12, 3, '#1f4f5c'); r(5, 9, 14, 15, '#1f4f5c');      // outline
  r(10, 1, 4, 3, '#b98a52'); r(10, 3, 4, 1, '#8a6034'); r(10, 4, 4, 4, '#a9e2ea'); r(7, 8, 10, 2, '#a9e2ea'); r(6, 10, 12, 13, '#9fdce6'); r(6, 21, 12, 2, '#6cc3d1');      // cork, neck, body
  r(9, 11, 6, 9, '#fff3d0'); r(9, 11, 6, 1, '#e8d6a8'); r(10, 13, 4, 1, '#c9a96a'); r(10, 15, 3, 1, '#c9a96a'); r(10, 17, 4, 1, '#c9a96a'); r(9, 14, 6, 1, '#e0476b');      // the letter, tied with a ribbon
  r(7, 11, 1, 9, '#eafcff'); r(11, 5, 1, 2, '#eafcff'); r(16, 12, 1, 6, '#c8f1f6');      // glints
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t; })();
const bottleSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bottleTex, transparent: true, depthWrite: false })); bottleSp.scale.set(1.4, 1.4, 1); bottleSp.visible = false; bottleSp.renderOrder = 6; scene.add(bottleSp);
const bottleGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, color: 0xa8f0ff })); bottleGlow.renderOrder = 5; bottleGlow.visible = false; scene.add(bottleGlow);
stg.hideForDepth.push(bottleSp, bottleGlow); bottleSp.material.opacity = 0;      // (the sprite is only what you tap: the bottle itself is a little voxel model)
const bottleM = makeBottle(); bottleM.group.visible = false; scene.add(bottleM.group);
const hashId = (id) => { let h = 7; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
let bottleId = null; const sentBottles = new Map();
const toys = new Toys(scene, fishes); let lightHeld = false; window.__toys = toys; toys.onDim = (v) => { stg.stage.dim = v; };      // the tank's lights go down while the light spot is on
toys.onSound = (k) => sfx({ splash: 'bubble', bubble: 'bubble', bonk: 'tap', pop: 'click', pounce: 'tap' }[k] ?? 'tap');
toys.onDone = (toy, ids) => { if (game.state) game.dispatch({ t: 'play', toy, fish: ids }).then(capNote).catch(() => null); };      // who joined in learns the toy a little more
// while the light spot is on, the tank goes dark around it: a dark veil over the tank with a soft hole where the light falls, following your finger
const dimmer = document.createElement('div'); dimmer.id = 'dimmer'; canvas.after(dimmer);      // (right over the tank, under the header, the menus and the bar)
function toScreen(p) { const r = canvas.getBoundingClientRect(), sc = Math.max(r.width / IW, r.height / IH), dw = IW * sc, dh = IH * sc, q = p.clone().project(camera); return [r.left + (r.width - dw) * 0.5 + (q.x + 1) / 2 * dw, r.top + (r.height - dh) + (1 - q.y) / 2 * dh]; }
function spotDim() { const L = toys.light, on = !!(L && L.on); dimmer.classList.toggle('on', on); if (!L) return; const [x, y] = toScreen(L.m.position); dimmer.style.setProperty('--x', x + 'px'); dimmer.style.setProperty('--y', y + 'px'); }
function armToy(k) { const T = TOYS[k]; if (!T) return; ui.open('tank'); toys.armed = k; ui.toast(T.how, 3200); } const eggSprites = new Map(), EGG_TINT = { goldfish: 0xf2832e, guppy: 0xb04a8a, cory: 0xf0a060, blue: 0xf3d9a0, platy: 0xf2c94a, angelfish: 0xeaf2f0, betta: 0xeef4f2, octopus: 0xf4ead6 };      // the color each kind's eggs really are: clownfish orange, damselfish purple-red, cardinalfish yellow, open-water eggs almost clear
function syncExtras() {
  const s = game.state, me = game.you?.userId, b = (s.bottles ?? []).find((x) => x.to === me);
  // a bottle from a friend: it drops in at the surface with a splash, sinks slowly, and comes to rest tipped over on the sand, glinting now and then
  if (!b) { if (!bottleSp.userData.leave) { bottleSp.visible = bottleGlow.visible = false; } bottleId = null; }
  else { if (bottleId !== b.id) { bottleId = b.id; const h = hashId(b.id), U = bottleSp.userData; bottleSp.position.set(-2.6 + (h % 52) / 10, 0, 0.6 + ((h >> 8) % 16) / 10); U.float = Fish3D.topY - 2.4; U.top = Fish3D.topY + 1.6; U.rest = U.float; U.leave = null; U.popped = false; bottleM.cork.visible = true; bottleM.glass.material.opacity = 0.5;      // a corked bottle floats: it drops in, bobs under, and comes up to ride on the surface
      U.t0 = Date.now() - (b.at ?? 0) < 6 * 3600e3 && !U.seen?.has(b.id) ? performance.now() : -1e9; (U.seen ||= new Set()).add(b.id); if (U.t0 > 0) { if (s.flags.tut >= 5) sfx('splash'); } }
    bottleSp.visible = bottleGlow.visible = true; }
  { const mine = new Set((s.bottles ?? []).filter((x) => x.from === me).map((x) => x.id)); for (const [id, to] of sentBottles) if (!mine.has(id)) { sentBottles.delete(id); if (to) ui.toast(`${to} found your bottle.`, 3200); } for (const x of s.bottles ?? []) if (x.from === me && !sentBottles.has(x.id)) sentBottles.set(x.id, game.members?.find((m) => m.id === x.to)?.name ?? null); }      // the one who sent it hears when it is found
  giftSync(s);
  const ids = new Set((s.eggs ?? []).map((e) => e.id));
  for (const e of s.eggs ?? []) if (!eggSprites.has(e.id)) {      // a voxel egg tucked in at the foot of a plant, clear of everything else
    const C = eggCareOf(e), mode = C.mode === 'mouth' && !e.guard ? 'guard' : C.mode;      // (a cardinalfish father gone: the eggs he dropped lie on the sand)
    const h = hashId(e.id), den = C.mode === 'den' && s.decor.find((d) => d.id === e.den), at = den ? { x: den.x, z: den.z + 0.95, by: den.type } : eggSpot(decor.spots(), (k) => decor.reach(k), h, [...eggSprites.values()].map((x) => x.at), C.on ?? 'plant'), egg = makeEgg(h, EGG_TINT[e.species] ?? 0xf06a9a, mode);
    egg.at = at; egg.e = e; egg.tint = EGG_TINT[e.species] ?? 0xf06a9a; egg.group.position.set(at.x, mode === 'drift' ? 5.2 + (h % 18) / 10 : eggY(at.x, at.z), at.z); egg.home = egg.group.position.clone(); egg.group.rotation.y = mode === 'den' ? 0 : (h % 628) / 100;      /* (an octopus's strings face out of her den's mouth) */ scene.add(egg.group); eggSprites.set(e.id, egg);
  }
  for (const [id, egg] of [...eggSprites]) { const e = (s.eggs ?? []).find((x) => x.id === id); if (e) { egg.e = e; if (egg.mode !== 'den' && decor.spots().some((d) => Math.hypot(d.x - egg.at.x, d.z - egg.at.z) < decor.reach(d.type) * 0.5 + 0.3)) { const others = [...eggSprites.values()].filter((x) => x !== egg).map((x) => x.at); egg.at = eggSpot(decor.spots(), (k) => decor.reach(k), hashId(id) + 1, others); egg.group.position.set(egg.at.x, eggY(egg.at.x, egg.at.z), egg.at.z); } continue; }      /* (something was placed on top of it: it rolls to a clear spot) */ if (focus?.egg === egg) setFocus(null); eggGone(egg, s); scene.remove(egg.group); egg.dispose(); eggSprites.delete(id); fishes.burst(egg.group.position); }
}
function bottleHit(ev) { return bottleSp.visible && !bottleSp.userData.leave && rayFrom(ev).ray.distanceToPoint(bottleSp.position) < 1.4; }
// tap it: the cork pops, the letter unrolls, and once it is read the empty bottle floats up and away
async function openBottle() {
  const id = bottleId; if (!id) return; const U0 = bottleSp.userData; U0.leave = { t0: performance.now() + 1e9, y: bottleSp.position.y };      // (held where it is while the state catches up)
  const r = await game.dispatch({ t: 'openBottle', id }); if (!r.ok || !r.applied) { U0.leave = null; return r.ok ? null : fail(r); }
  sfx('pop'); haptic(14); bottleM.cork.visible = false; bottleSp.userData.popped = true; for (let i = 0; i < 3; i++) setTimeout(() => fishes.burst(bottleSp.position.clone().add(new THREE.Vector3(0.5, 0.1 * i, 0))), i * 140); const U = bottleSp.userData;      /* the cork pops and a rush of bubbles comes out */ U.leave = { t0: performance.now() + 1e9, y: bottleSp.position.y }; bottleSp.visible = bottleGlow.visible = true;      // (stays put, uncorked, while the letter is open)
  const back = await ui.bottleLetter({ from: r.from ?? 'a friend', note: r.note ?? '', at: r.at, pay: r.delta ?? 0 }); flyShells(r.delta ?? 2);
  U.leave = { t0: performance.now(), y: bottleSp.position.y }; sfx('bubble');
  if (back && r.fromId) ui.sendBottle(r.fromId);
}
window.__greetV = (f) => greetVisitor(f);
async function greetVisitor(f) {
  { const v = game.state.visitor; if (v?.id === f.fid && v.stay && !v.decided) { const label = SPECIES_DEF[v.species]?.label ?? 'visitor', n = game.state.visitMem?.[v.species]?.n ?? 3;      // a visitor that keeps coming back: an optional choice, no hurry, the first answer decides
    const keep = await ui.choose({ title: 'It wants to stay', text: `This ${label} has come ${n} times now. Looks like it wants to stay.`, options: [{ label: 'Let it stay', value: 'stay' }, { label: 'Let it wander', value: 'wander' }], cancel: 'Not now' }); if (!keep) return;      /* (closing it decides nothing) */ const r2 = await game.dispatch({ t: 'visitorStay', id: v.id, keep: keep === 'stay' });
    if (!r2.ok) return fail(r2); if (r2.applied && r2.keep) { sfx('place'); const nm = await ui.dialog({ title: 'Name it', text: `The ${label} lives here now. What will you call it?`, input: { value: label.split(' ').pop(), max: 14 }, ok: 'Name it', cancel: 'Later' }); if (nm && r2.fish) await game.dispatch({ t: 'nameFish', id: r2.fish, name: nm }); } return; } }      /* (it came as a guest: whoever let it stay names it) */
  const r = await game.dispatch({ t: 'greet', id: f.fid }); if (!r.ok) return fail(r); if (!r.applied) return;
  sfx('level'); haptic(20); fishes.burst(f.pos); flyShells(4, [window.innerWidth / 2, window.innerHeight * 0.4]);
}
// playing: fish follow a fingertip along the glass. Five seconds of it builds the bond.
// once a day, when play has given all the level points it can for the day: said once, gently, and play goes on just the same
const capNote = () => { const P = game.state?.flags?.playXp; if (!P || !(P.n >= GROW.playCap)) return; try { if (localStorage.getItem('ourtank.capSeen') === String(P.day)) return; localStorage.setItem('ourtank.capSeen', String(P.day)); } catch { return; } setTimeout(() => ui?.toast('That is all the level points play gives today. They still love the attention.', 4200), 900); };
let cardOpen = null;                                                     // which fish's card is expanded; a card opens folded, showing the fish above it
window.__playWith = (f) => playWith(f); window.__playOn = (ext = 0) => { if (play && ext) play.until = play.max = performance.now() + ext; return play ? { until: Math.round(play.until - performance.now()), fish: play.fish.name } : null; };      // (for the drills: a slow test browser needs longer than a finger does)
let play = null; const playPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -2.3), playHit = new THREE.Vector3();
function playWith(f) {
  if (play) return; play = { fish: f, until: performance.now() + 5500, max: performance.now() + 40000, moved: 0, last: null }; f.mul = 1.3; card.classList.add('peek', 'playing'); $('fishpill').hidden = true;      // the card gets right out of the way while you play: nothing between your finger and the fish
  $('pet').disabled = true; $('pet').textContent = `${f.name} is watching your finger…`; ui.toast(`Drag your finger along the glass`, 3000);
}
function playPoint(ev) {
  if (!play || !rayFrom(ev).ray.intersectPlane(playPlane, playHit)) return; play.until = Math.min(play.max, Math.max(play.until, performance.now() + 2600)); const p = play.fish;       // playing goes on for as long as the finger keeps moving
  window.__pp = (window.__pp ?? 0) + 1; if (p.crab) { const at = toys.sandHit(rayFrom(ev).ray); window.__ppat = at && at.toArray();      /* (__pp, __ppat: for tools/crab_play.mjs) */ if (at) p.chase?.(at); if (play.last) play.moved += Math.hypot(playHit.x - play.last.x, playHit.y - play.last.y); play.last = { x: playHit.x, y: playHit.y }; return; }      // a hermit crab can't swim up to the glass: it comes along the sand after the spot under your finger
  p.target.set(Math.max(-3.8, Math.min(3.8, playHit.x)), Math.max(1.2, Math.min(12.5, playHit.y)), 2.2); p.retarget = 1; p.dartT = 0.5; if (p.species.move === 'jet') p.glassAt = { x: playHit.x, y: playHit.y, until: performance.now() + 900 };
  if (play.last) play.moved += Math.hypot(playHit.x - play.last.x, playHit.y - play.last.y); play.last = { x: playHit.x, y: playHit.y };
}
// The card stays tucked away while there is any touching going on, and only opens again once the finger has been still for a moment.
let lastTouch = 0;
for (const ev of ['pointerdown', 'pointermove', 'pointerup']) addEventListener(ev, () => { lastTouch = performance.now(); }, true);
addEventListener('pointerup', () => { if (play && play.moved > 0.5) finishPlay(true); });      // finger lifted after playing: the game ends there and the card comes straight back
function reopenWhenIdle(f, tries = 0, now = false) {
  card.classList.remove('playing'); if (now && !play && focus === f) { showCard(f); return; }
  if (play || focus !== f) { if (focus !== f) card.classList.remove('peek'); return; }
  if (performance.now() - lastTouch > 1600 || tries > 30) { showCard(f); return; }
  setTimeout(() => reopenWhenIdle(f, tries + 1), 400);
}
async function finishPlay(lifted = false) {
  const { fish: f, moved } = play; play = null; f.mul = 0.35; f.glassAt = null; if ($('pet')) { $('pet').disabled = false; $('pet').textContent = f.species.id === 'octopus' ? `Let ${f.name} follow your finger` : `Play with ${f.name}`; }
  if (moved < 2) { ui.toast(`Drag along the glass and ${f.name} will follow`); reopenWhenIdle(f, 0, lifted); return; }
  const r = await game.dispatch({ t: 'pet', id: f.fid }); if (!r.ok) { reopenWhenIdle(f, 0, lifted); return fail(r); } capNote();
  if (!r.applied) { ui.toast(`${f.name} is tired of playing for now`); reopenWhenIdle(f, 0, lifted); return; }
  fishes.burst(f.pos); sfx('arrive'); haptic(10); f.vigor = Math.max(f.vigor, 1.1);
  if (r.delta > 0) flyShells(r.delta, [window.innerWidth / 2, window.innerHeight * 0.4]);
  reopenWhenIdle(f, 0, lifted);
}
// postcard: the clean tank frame with a one-line caption about something that really happened, ready to send to a friend
const HIGHLIGHT = /hatch|grew|grow|adult|learned|puzzle|jar|worked out|perfect|level|friends|first|visiting|birthday|days old|week/i;
// the postcard's line is about what is in the picture: the animal you are looking at (or the one in the middle of the frame), by name, and what it is doing
function postcardSubject() {
  if (focus && !focus.isEgg && !focus.dead) return focus;
  let best = null, bd = 1e9; for (const f of fishes.list) { if (f.dead || f.visitor || f.nursery) continue; const p = f.pos.clone().project(camera); if (Math.abs(p.x) > 1 || Math.abs(p.y) > 1 || p.z > 1) continue; const d = Math.hypot(p.x, p.y * 0.8) - (f.radius ?? 1) * 0.15; if (d < bd) { bd = d; best = f; } }
  return best;
}
function postcardCaption() {
  const s = game.state, f = postcardCaption.subject ?? postcardSubject(), rec = f && s.fish.find((x) => x.id === f.fid);
  const [a, b] = postcardText(); return `${a}. ${b}`;
}
// the postcard in two parts: who it is ("Zeus the seahorse") and one line about them, never saying the name twice
function postcardText() {
  const s = game.state, f = postcardCaption.subject ?? postcardSubject(), rec = f && s.fish.find((x) => x.id === f.fid);
  if (!rec) return s.visitor ? ['A rare visitor', 'dropped by the tank today.'] : ['A quiet day', 'in the tank.'];
  const kind = (SPECIES_DEF[rec.species]?.label ?? 'fish').toLowerCase(), he = rec.species === 'seahorse' ? (sexOf(rec) === 'm' ? 'He' : 'She') : 'It';
  const recent = (rec.story ?? []).slice().reverse().find((x) => Date.now() - (x.at ?? 0) < 2 * 864e5 && x.text && !/^Arrived in the tank|^Became an elder|days old|reached .* days/i.test(x.text));
  const now = f.thought && !/^Knows you are here|^Off to see/.test(f.thought) ? f.thought : null, age = rec.elder ? 'An old friend, still going strong.' : stageOf(rec) === 'baby' ? 'The newest in the tank.' : null;
  const esc2 = rec.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), clean = (t) => { let x = String(t).trim(); x = x.replace(new RegExp('^' + esc2 + '(?=\\b)'), he).replace(new RegExp('\\b' + esc2 + '\\b', 'g'), he === 'It' ? 'it' : he === 'He' ? 'him' : 'her'); x = x.replace(/^\w/, (c) => c.toUpperCase()); return /[.!?]$/.test(x) ? x : x + '.'; };
  return [`${rec.name} the ${kind}`, now ? clean(now) : recent ? clean(recent.text) : age ?? 'Having a lovely day in the tank.'];
}
function wrapText(g, text, maxW) { const words = String(text).split(' '), lines = []; let line = ''; for (const w of words) { const t2 = line ? line + ' ' + w : w; if (g.measureText(t2).width > maxW && line) { lines.push(line); line = w; } else line = t2; } if (line) lines.push(line); return lines.slice(0, 3); }
async function takePhoto(opts = {}) {      // opts.img: a moment's photo from the journal instead of the tank as it is now (opts.title, opts.line its words)
  let src = canvas, hidden = [], prev = [];
  if (opts.img) { src = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = opts.img; }); }
  else {
    postcardCaption.subject = postcardSubject(); setTimeout(() => { postcardCaption.subject = null; }, 15000);
    hidden = [...document.querySelectorAll('header, nav, #sheet, #goal, #card, #fishpill, #coach, #foodbar, #placebar, #toast, #glass, #reunion, #settle, #sub')]; prev = hidden.map((e) => e.style.visibility); hidden.forEach((e) => (e.style.visibility = 'hidden'));
    await new Promise((r) => setTimeout(r, 80)); stg.renderer.info.reset(); composer.render();
  }
  // a framed postcard: the tank as a photo on cream paper, a line about something that really happened, and who is in the tank
  const SW = src.width, SH = src.height, PW = 1080, M = 40, IW2 = PW - M * 2, crop = opts.img ? SH : Math.round(SW * 1.18), cy = opts.img ? 0 : (() => { const ys = fishes.list.filter((f) => !f.dead).map((f) => (1 - (f.pos.clone().project(camera).y * 0.5 + 0.5)) * SH); const mid = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : SH * 0.5; return Math.round(Math.max(0, Math.min(SH - crop, mid - crop * 0.42))); })(), IH2 = Math.round(IW2 * crop / SW), FOOT = 340, PH = M + IH2 + FOOT;
  const shot = document.createElement('canvas'); shot.width = SW; shot.height = SH; shot.getContext('2d').drawImage(src, 0, 0, SW, SH);
  hidden.forEach((e, i) => (e.style.visibility = prev[i]));
  const out = document.createElement('canvas'); out.width = PW; out.height = PH; const g = out.getContext('2d'); g.textBaseline = 'alphabetic';
  const paper = g.createLinearGradient(0, 0, 0, PH); paper.addColorStop(0, '#f8f1de'); paper.addColorStop(1, '#efe5cb'); g.fillStyle = paper; g.fillRect(0, 0, PW, PH);
  g.strokeStyle = 'rgba(120,96,50,.25)'; g.lineWidth = 3; g.strokeRect(14, 14, PW - 28, PH - 28);
  // the photo, softly rounded with a gentle vignette
  g.save(); g.beginPath(); g.roundRect(M, M, IW2, IH2, 26); g.clip(); g.imageSmoothingEnabled = false; g.drawImage(shot, 0, cy, SW, crop, M, M, IW2, IH2); g.imageSmoothingEnabled = true;
  const vg = g.createRadialGradient(PW / 2, M + IH2 * 0.48, IH2 * 0.3, PW / 2, M + IH2 * 0.48, IH2 * 0.85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,10,24,.38)'); g.fillStyle = vg; g.fillRect(M, M, IW2, IH2);
  const sheen = g.createLinearGradient(0, M, 0, M + IH2 * 0.25); sheen.addColorStop(0, 'rgba(255,255,255,.12)'); sheen.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sheen; g.fillRect(M, M, IW2, IH2 * 0.25); g.restore();
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; g.beginPath(); g.roundRect(M, M, IW2, IH2, 26); g.stroke();
  // the caption in a soft serif, wrapped
  const [title, line] = opts.img ? [opts.title ?? 'A moment in the tank', opts.line ?? ''] : postcardText(), fy = M + IH2 + 74; g.fillStyle = '#3b2f1a'; g.font = '700 50px ui-serif, "New York", Georgia, serif'; g.fillText(title, M + 10, fy);
  g.fillStyle = '#5a4a2c'; g.font = 'italic 500 40px ui-serif, "New York", Georgia, serif'; wrapText(g, line, IW2 - 20).slice(0, 2).forEach((l, i) => g.fillText(l, M + 10, fy + 58 + i * 50));
  // a little rule, then the tank's name and the day, the people in it, and the mark
  const ry = PH - 96; g.strokeStyle = 'rgba(120,96,50,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(M + 10, ry - 34); g.lineTo(PW - M - 10, ry - 34); g.stroke();
  let ax = M + 10; for (const m of (game.shared ? game.members ?? [] : [{ avatar: soloLook() }]).slice(0, 4)) { const c = document.createElement('canvas'); try { drawAvatar(c, m.avatar); g.imageSmoothingEnabled = false; const k = 64 / c.height; g.drawImage(c, ax, ry - 26, c.width * k, 64); } catch { /* no avatar */ } ax += 68; }
  g.imageSmoothingEnabled = true; g.fillStyle = '#7a5f26'; g.font = '600 26px ui-monospace, Menlo, monospace';
  const dateStr = new Date(opts.ts ?? Date.now()).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });      /* (a moment's postcard carries the day it happened) */ g.fillText(`${game.shared ? String(game.tankName).toUpperCase() + '  ·  ' : ''}DAY ${game.day}`, ax + 10, ry + 8); g.fillStyle = 'rgba(122,95,38,.7)'; g.font = '500 24px ui-monospace, Menlo, monospace'; g.fillText(dateStr, ax + 10, ry + 42);
  g.textAlign = 'right'; g.fillStyle = '#b08d3c'; g.font = '700 28px ui-monospace, Menlo, monospace'; g.fillText('🐚 TAKO TANK', PW - M - 10, ry + 22); g.textAlign = 'left';
  const blob = await new Promise((r) => out.toBlob(r, 'image/png'));
  if (!blob) return ui.toast('Could not save the picture');
  const file = new File([blob], `our-tank-day-${game.day}.png`, { type: 'image/png' });
  // shown first, with its own Share button: iPhones only open the share sheet straight from a tap, and building the picture takes a moment after yours
  const url = URL.createObjectURL(blob); await ui.postcardPreview(url, async () => {
    try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return true; } } catch (e) { if (e?.name === 'AbortError') return false; }
    const a = document.createElement('a'); a.href = url; a.download = file.name; document.body.append(a); a.click(); a.remove(); ui.toast('Postcard saved'); return true; });
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
// the daily mystery: a soft glow on the sand where today's thing is, with its own small sign (bubbles rise, a glint winks); tap it and it plays out
const mystGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, color: 0xffe3a0 })); mystGlow.visible = false; mystGlow.renderOrder = 5; scene.add(mystGlow); stg.hideForDepth.push(mystGlow);
let mystBusy = false;
function mystSync() { const s = game.state, m = s && mysteryOf(s), U = mystGlow.userData; if (m && !m.done && (s.flags?.tut ?? 0) >= 5) { mystGlow.position.set(m.x, sandH(m.x, m.z) + 0.3, m.z); U.kind = m.kind; mystGlow.visible = true; } else if (!(U.out > 0)) mystGlow.visible = false; }
function mystHit(ev) { const m = game.state && mysteryOf(game.state); return !!(m && !m.done && mystGlow.visible && !(mystGlow.userData.out > 0) && rayFrom(ev).ray.distanceToPoint(mystGlow.position) < 1.3); }
async function openMystery() {
  if (mystBusy) return; mystBusy = true; const P = mystGlow.position.clone(); const r = await game.dispatch({ t: 'mystery', tz: -new Date().getTimezoneOffset() }); mystBusy = false; if (!r.ok) return fail(r); if (!r.applied) { mystSync(); return; }
  sfx('pop'); haptic(14); for (let i = 0; i < 4; i++) setTimeout(() => fishes.burst(P.clone().add(new THREE.Vector3(0, 0.2 * i, 0))), i * 150);
  const f = r.fish && fishes.byId.get(r.fish); if (f && !f.dead) { f.target?.set(P.x, P.y + 0.7, P.z); f.retarget = 4; spotlightFish(r.fish, 3200, 400); }      // (whoever it turned out to be comes over)
  mystGlow.userData.out = 1; moment({ at: P, haptics: 16, shells: r.delta ?? 0 }); ui.updateHeader?.(); ui.toast(r.line, 5600); if (r.next) setTimeout(() => ui.toast('To be continued tomorrow…', 3400), 5800); ui.refresh?.();
}
function mystTick(dt) {
  if (!mystGlow.visible) return; const U = mystGlow.userData, t = performance.now() / 1000, M = mystGlow.material;
  if (U.out > 0) { U.out = Math.max(0, U.out - dt * 0.7); M.opacity = U.out * 0.8; const sc = 2 + (1 - U.out) * 3; mystGlow.scale.set(sc, sc, 1); if (!U.out) mystSync(); return; }
  const tw = /glint/.test(U.kind) ? (Math.sin(t * 3.1) > 0.8 ? 1 : 0.2) : 0.5 + 0.3 * Math.sin(t * 2), pg = (U.ping = Math.max(0, (U.ping ?? 0) - dt)) > 0 ? 1 + Math.sin(U.ping * 6) * 0.5 + U.ping * 0.6 : 1; M.opacity = Math.min(1, (0.2 + tw * 0.5) * pg); const sc = (1.4 + tw * 0.8) * pg; mystGlow.scale.set(sc, sc, 1);
  if (/bubbles/.test(U.kind) && Math.random() < dt * 1.2) fishes.burst(mystGlow.position.clone());
}
game.on('state', () => mystSync());
window.__reveal = (id, wait = 600) => revealFish(fishes.byId.get(id), game.state.fish.find((f) => f.id === id), wait, 2400);
window.__mystery = () => ({ v: mystGlow.visible, at: mystGlow.position.toArray().map((x) => +x.toFixed(2)), m: game.state && mysteryOf(game.state) }); window.__openMystery = () => openMystery();
window.__postcard = postcardCaption; window.__photo = takePhoto; window.__openBottle = () => openBottle(); window.__bottleSeen = () => ({ id: bottleId, v: bottleSp.visible, y: +bottleSp.position.y.toFixed(2), leave: !!bottleSp.userData.leave });

// ── tap a fish: the camera glides in and a profile card slides up ──
const card = $('card'), look = new THREE.Vector3(0, stg.LOOK_Y, 0), camGoal = new THREE.Vector3(), lookGoal = new THREE.Vector3();
function pickFish(ev) { const r = rayFrom(ev); let best = null, bd = 1e9; for (const f of fishes.list) { const h = r.ray.distanceToPoint(f.pos); if (h < f.radius * 0.9) { const d = f.pos.distanceTo(camera.position); if (d < bd) { bd = d; best = f; } } } return best; }
// how it is doing, in one line instead of four bars: all well, or the one thing that is low
const needsLine = (n) => { const low = [['hungry', n[0]], ['a little low', n[1]], ['tired', n[2]], ['unwell', n[3]]].filter(([, v]) => v < 0.45).sort((a, b) => a[1] - b[1]); return low.length ? `<span class="low">Feeling ${low.map(([w]) => w).slice(0, 2).join(' and ')}</span>` : '<span>Doing well</span>'; };
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
  ui.dialog({ title: `${rec.name}'s family`, lines, ok: 'Close' });
}
// an octopus's chips are read from its temperament, strongest first: what you see on the card is what it does in the tank
function octoChips(m) { const c = [[m.cur, 'Curious'], [m.bold, 'Bold'], [1 - m.bold, 'Shy'], [m.soc, 'Social'], [1 - m.soc, 'Loner'], [m.tidy, 'Tidy']].filter(([v]) => v >= 0.62).sort((a, b) => b[0] - a[0]).map(([, l]) => l); return c.length ? c.slice(0, 2) : ['Easygoing']; }
// its line, true to the tank it is in: one that loves its den says so only once it has one, and says what it is looking for until then
function octoLine(m, f) {
  const den = f?.den, kind = den?.home ? (den.kind === 'pot' ? 'its clay pot' : 'its coconut shell') : den?.kind === 'rocks' ? 'the rock shelter it built' : den ? 'its den' : null;
  if (m.type === 'homebody') return kind ? `Loves ${kind}. It likes familiar things and will not be hurried out of them.` : 'A home-lover with no home yet. A coconut shell, a clay pot or a few rocks would do.';
  if (m.type === 'collector') return kind ? `Fetches shells and stones for ${kind} and rearranges them when nobody is looking.` : 'Fetches shells and stones, and is looking for a den to keep them by.';
  return m.line;
}
// a few true things worth knowing: what this animal has done in the tank, and one fact about its kind that changes from day to day
const SPECIES_FACTS = {
  goldfish: ['Clownfish are all born male; the biggest one in a group becomes the female.', 'A coat of slime lets a clownfish live among an anemone\'s stings without being hurt.'],
  neon: ['Blue chromis shoal by the hundred over branching coral and vanish into it when danger comes.', 'Chromis change from blue to green depending on how the light hits their scales.'],
  cory: ['A yellow goby can spend its whole life perched on one branch of coral.', 'Gobies are one of the largest families of fish, with over 2,000 kinds.'],
  blue: ['Royal grammas often hang upside down under ledges, belly to the rock.', 'A royal gramma builds a nest of algae for its eggs.'],
  guppy: ['Damselfish farm little lawns of algae and chase off anything that comes near.', 'Some damselfish make clicking sounds to warn others away.'],
  angelfish: ['A young emperor angelfish is ringed in blue and white; it changes completely into stripes as it grows up.', 'Emperor angelfish can make a loud knocking sound when they are startled.'],
  platy: ['Male cardinalfish carry the eggs in their mouths until they hatch.', 'Cardinalfish rest in groups by day and hunt at night.'],
  neongoby: ['Fish line up at a neon goby\'s station and hold still, mouths open, to be cleaned.', 'A neon goby\'s blue stripe is an advertisement: it says cleaner, do not eat.'],
  tang: ['Blue tangs sleep wedged into the rocks, and turn paler at night.', 'A tang never stops swimming for long: it laps the reef all day.'],
  puffer: ['Puffers swim with their small fins like a little helicopter, and can hover and reverse.', 'A puffer\'s beak-like teeth never stop growing; crunchy food wears them down.'],
  danio: ['Anthias live in groups led by one male; if he is lost, the biggest female becomes the new male.', 'An anthias shoal moves like a single orange-pink cloud.'],
  betta: ['Mandarin dragonets have no scales; a bitter slime protects them instead.', 'Mandarins dance in pairs at dusk, rising together off the reef.'],
  seahorse: ['A father seahorse carries the babies in a pouch until they are born.', 'A seahorse can move each eye on its own, looking two ways at once.', 'Seahorses have no stomach, so they eat almost all day.'],
  hawksbill: ['A hawksbill pries sponges out of the reef with its narrow, hooked beak.', 'Hawksbill shells are tortoiseshell, once made into combs; today the trade is banned to protect them.'],
  loggerhead: ['A loggerhead has the biggest head of any hard-shelled turtle, with jaws that crush conch shells.', 'Loggerheads cross whole oceans and find their way home by Earth\'s magnetic field.'],
  kemps: ["Kemp's ridley is the smallest and most endangered sea turtle.", 'Ridleys nest by day, thousands at once, in mass arrivals called arribadas.'],
  leatherback: ['The leatherback is the biggest turtle alive, with a leathery shell instead of plates.', 'Leatherbacks eat jellyfish and dive over a kilometer deep.'],
  turtle: ['A sea turtle comes up to breathe, then sinks back down to rest.', 'Green turtles graze sea grass like cows graze a meadow, and keep the grass beds healthy.'],
  octopus: ['An octopus has three hearts and blue blood.', 'Two-thirds of an octopus\'s nerve cells are in its arms; each arm can taste and decide a little on its own.', 'An octopus can squeeze through any gap bigger than its beak.', 'Octopuses can taste with their suckers.'],
};
function didYouKnow(rec, f) {
  const out = [], b = (n, s1, s2) => `${n} ${n === 1 ? s1 : s2}`;
  if (rec.crabs) out.push(`🦀 Has caught <b>${b(rec.crabs, 'crab', 'crabs')}</b> here.`);
  if (rec.solved) out.push(`🧩 Has solved <b>${b(rec.solved, 'puzzle jar', 'puzzle jars')}</b>, the fastest in ${rec.bestSecs} seconds.`);
  if (rec.moved) out.push(`🪨 Has rearranged the tank <b>${b(rec.moved, 'time', 'times')}</b>.`);
  if (f?.fears?.length) out.push('😶 Keeps away from a spot where something startled it.');
  if (rec.tricks?.length) out.push(`🎓 Knows ${rec.tricks.map((k) => TRICKS[k]?.label).filter(Boolean).join(', ')}.`);
  const kids = childrenOf(game.state, rec.id).length; if (kids) out.push(`🥚 Has ${b(kids, 'youngster', 'youngsters')} in the tank.`);
  const fx = SPECIES_FACTS[rec.species]; if (fx?.length) out.push(`💡 ${fx[(Math.floor(Date.now() / 864e5) + (rec.seed ?? 0)) % fx.length]}`);
  return out.slice(0, 4);
}
// an octopus nobody in the crew looks after (its caretaker left, or the server once lost the tank and gave them a new identity): someone can take it on, or let it go
function orphanBlock(rec, f) {
  if (rec.species !== 'octopus' || !game.shared || rec.dead) return '';
  const crew = game.members ?? [], me = game.you?.userId; if (rec.owner && crew.some((m) => m.id === rec.owner)) return '';
  const haveOne = game.state.fish.some((x) => x.species === 'octopus' && !x.dead && x.owner === me) || (game.state.orders ?? []).some((o) => o.species === 'octopus' && o.owner === me);
  const alone = game.state.fish.filter((x) => !x.dead).length <= 1;
  const stranded = !!rec.owner;                                                                 // a caretaker who is gone (or an identity the server lost); an octopus that never had one can only be taken on
  if (!stranded && haveOne) return '';
  return `<div class="orphan"><p>🐙 ${stranded ? `No one in the crew looks after ${esc(f.name)} any more.` : `${esc(f.name)} has no caretaker yet.`}</p><div class="btnrow">${haveOne ? '' : '<button class="lnk" id="claimo">Make it mine</button>'}${alone || !stranded ? '' : '<button class="lnk warn" id="releaseo">Let it go</button>'}</div></div>`;
}
function bondLine(rec) {
  const you = game.shared ? game.you?.userId : 'me', b = rec.bond ?? {}, known = (id) => id === you || !game.shared || game.members?.some((m) => m.id === id);      // only people still in the tank
  const ids = Object.keys(b).filter(known); if (!ids.length) return '';
  const top = ids.sort((x, y) => b[y] - b[x])[0], mine = b[you] ?? 0;
  const who = top === you || !game.shared ? 'You' : game.members?.find((m) => m.id === top)?.name ?? 'You';
  return `<dt>Closest to</dt><dd>${mine >= 10 && top === you ? 'You' : who}${b[top] >= 10 ? ' ♥' : ''}</dd>`;
}
// an animal whose caretaker has not been in for two weeks (or has left the tank): anyone else can take it on, so it is never forgotten
// a parent looking after eggs: its card says so, and a tap goes to the eggs
function eggLink(rec) {
  card.querySelector('.eggl')?.remove(); const egg = [...eggSprites.values()].find((x) => x.e.guard === rec.id || ((x.e.a === rec.id || x.e.b === rec.id) && x.mode !== 'drift')); if (!egg) return;
  const el = document.createElement('div'); el.className = 'awayb eggl'; el.innerHTML = `<p>${egg.e.guard === rec.id ? (egg.mode === 'mouth' ? `${esc(rec.name)} is carrying eggs in his mouth.` : `${esc(rec.name)} is guarding eggs.`) : `${esc(rec.name)} laid eggs; ${esc(game.state.fish.find((f) => f.id === egg.e.guard)?.name ?? 'the father')} is looking after them.`}</p><button class="act2">See the eggs</button>`;
  el.querySelector('button').onclick = () => { const fx = eggFocusOf(egg); setFocus(fx); cardOpen = fx.fid; showEggCard(fx); };
  card.querySelector('h2')?.parentElement?.after(el) ?? card.prepend(el);
}
function awayBanner(rec) {
  const aw = game.shared ? awayOwner(rec, game.members) : null; card.querySelector('.awayb')?.remove(); if (!aw || rec.owner === game.you?.userId) return;
  const el = document.createElement('div'); el.className = 'awayb'; el.innerHTML = `<p>${esc(aw.left ? `${aw.name} has left the tank.` : `${aw.name} has not been in for ${aw.days} days.`)} ${esc(rec.name)} could use someone.</p><button class="act2">Look after ${esc(rec.name)}</button>`;
  el.querySelector('button').onclick = async () => { const r = await game.dispatch({ t: 'lookAfter', id: rec.id }); if (r.ok) { sfx('arrive'); ui.toast(`You are looking after ${rec.name} now.`, 2800); el.remove(); } else fail(r); };
  card.querySelector('h2')?.parentElement?.after(el) ?? card.prepend(el);
}
function showDeadCard(f) {
  lastCard = Date.now(); const x = game.state.floaters?.find((z) => z.id === f.fid); if (!x) { card.classList.remove('on'); return; }
  const days = Math.max(1, Math.round((x.died - x.born) / 864e5)), who = x.ownerName ?? game.members?.find((mm) => mm.id === x.owner)?.name ?? 'Unknown';
  card.innerHTML = `<button class="x" aria-label="Close">×</button><h2>${esc(x.name)}</h2><div class="sp">${SPECIES_DEF[x.species]?.label ?? x.species} · <b class="mood">Passed away</b></div>
    <dl><dt>Age</dt><dd>${days} day${days === 1 ? '' : 's'}</dd><dt>Original caretaker</dt><dd>${esc(who)}</dd><dt>Died</dt><dd>${new Date(x.died).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</dd></dl>
    ${(() => { const lines = game.journal.filter((e) => e.text.includes(x.name) && !/passed away|died|lay|rest/i.test(e.text)).map((e) => e.text); const pick = [...new Set([lines[0], ...lines.filter((t) => /favou?rite|friends|loves|learned|hatched|guard|keeps going back|first/i.test(t)).slice(-3)].filter(Boolean))].slice(0, 4);
      return pick.length ? `<h4>Remembered for</h4><ul class="remember">${pick.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''; })()}
    <button class="pet rest" id="rest">LAY TO REST</button>`;
  card.classList.add('on'); card.querySelector('.x').onclick = () => setFocus(null);
  $('rest').onclick = async () => { $('rest').disabled = true; const r = await game.dispatch({ t: 'scoop', id: f.fid }); setFocus(null); if (!r.ok) return fail(r); if (r.applied) { sfx('tap'); haptic(10); } };
}
function socialLines(rec) {
  const so = socialOf(game.state, rec), rows = [...so.notes.map((x) => `<li class="bad">${esc(x)}</li>`), ...so.needs.map((x) => `<li>${esc(x)}</li>`), ...so.good.slice(0, 2).map((x) => `<li class="good">${esc(x.text)}</li>`)];
  return rows.length ? `<ul class="soc">${rows.join('')}</ul>` : '';
}
function storyBlock(rec, n = 6) {
  const st = (rec.story ?? []).slice(-n).reverse(); if (!st.length) return '';
  const when = (ts) => { const d = Math.floor((Date.now() - ts) / 864e5); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`; };
  return `<ul class="story">${st.map((x) => `<li><i>${when(x.at)}</i>${esc(x.text)}</li>`).join('')}</ul>`;
}
// an egg: tap it and the camera comes close like it does for a fish; the pill opens a small card with when it hatches and how it is doing
function eggFocusOf(egg) { return (egg.fx ||= { isEgg: true, egg, fid: 'egg:' + egg.e.id, pos: egg.group.position, radius: 0.95, mul: 1, species: { id: "egg" }, name: 'Egg' }); }
// ready eggs hatch while someone is watching: with the tank open on the tank itself and nothing else on screen, the camera comes over to them,
// they wriggle a few seconds more, and then they go (the first phone to ask makes it happen for everyone); Care's Watch button skips the wait
function eggWatch(egg, dt) {
  const free = !document.hidden && ui?.tab === 'tank' && !$('modal').classList.contains('on') && !$('reunion').classList.contains('on') && !play && !placing && !feedMode && !cleanMode && (game.state?.flags.tut ?? 0) >= 5;
  const nowS = Date.now() / 1000, gap = Math.min(0.5, nowS - (egg.watchAt ?? nowS)); egg.watchAt = nowS;      /* (real seconds, however smoothly this phone draws) */
  if (egg.asked) { window.__quietUntil = Math.max(window.__quietUntil ?? 0, Date.now() + 4000); return; }      /* (asked: the hatching is on its way, still nothing over it) */
  if (!free) { egg.watchT = Math.min(egg.watchT ?? 0, 1); return; }
  const was = egg.watchT ?? 0; egg.watchT = was + gap; window.__quietUntil = Math.max(window.__quietUntil ?? 0, Date.now() + 4000);      /* (while it happens, nothing else pops up over it) */
  if (Math.floor(was / 1.4) !== Math.floor(egg.watchT / 1.4)) sfx('twitch');      /* (a little wriggle you can hear, every second or so) */
  if (was < 2 && egg.watchT >= 2) { if (egg.fish) { if (!focus) setFocus(egg.fish); egg.fish.thought = 'His pouch is twitching. Any moment now.'; } else if (!focus || focus.isEgg) setFocus(eggFocusOf(egg)); ui.toast(egg.fish ? 'The babies are coming. Stay and watch…' : "They're hatching. Stay and watch…", 3200); haptic(8); }
  if (egg.watchT >= 6) { egg.asked = true; game.dispatch({ t: 'watchEggs', id: egg.e.id }).then((r) => { if (!r?.ok) egg.asked = false; }); }
}
// a seahorse father about to give birth is watched the same way: the camera comes to him, his pouch twitches, and then they come
const birthW = new Map();
function birthWatchTick() {
  for (const rec of game.state?.fish ?? []) { if (!rec.preg?.ready || rec.dead) { birthW.delete(rec.id); continue; } const f3 = fishes.byId.get(rec.id); if (!f3) continue;
    const W = birthW.get(rec.id) ?? { egg: null }; birthW.set(rec.id, W); const pseudo = { e: { id: rec.id, ready: true }, group: f3.group, get asked() { return W.asked; }, set asked(v) { W.asked = v; }, get watchT() { return W.t; }, set watchT(v) { W.t = v; }, get watchAt() { return W.at; }, set watchAt(v) { W.at = v; }, fish: f3 };
    eggWatch(pseudo, 0); }
}
window.__onBirth = (dad) => { if (document.hidden) return; sfx('crack'); setTimeout(() => sfx('newlife'), 900); haptic(12); if (dad && !focus) setFocus(dad); if (dad) setTimeout(() => { if (focus === dad) setFocus(null); }, 9000); };      // a seahorse birth seen: the pouch opens, the chime, a close look at the father and his brood
window.__watchEggs = () => { for (const egg of eggSprites.values()) if (egg.e.ready && !egg.asked) { window.__quietUntil = Math.max(window.__quietUntil ?? 0, Date.now() + 8000); ui.open('tank'); egg.watchT = Math.max(egg.watchT ?? 0, 1.9); return true; } for (const [id, W] of birthW) if (!W.asked) { window.__quietUntil = Math.max(window.__quietUntil ?? 0, Date.now() + 8000); ui.open('tank'); W.t = Math.max(W.t ?? 0, 1.9); return true; } return false; };      // (Care: Watch)
// a little cloud of larvae comes out of the eggs and rises, wriggling; most drift off on the current and fade, as in the sea (one stays: the baby)
const fryCloud = [];
function fryOut(at, n, tint, octo = false) {
  if (REDUCED || !n) return;
  if (octo) { const col = new THREE.Color(tint ?? 0xf4ead6).lerp(new THREE.Color(0xffc8a8), 0.35); for (let i = 0; i < n; i++) { const g = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ color: col, transparent: true, opacity: 0.9, emissive: col, emissiveIntensity: 0.3 }), head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.08), mat), tail = new THREE.Group();
      for (let k = 0; k < 4; k++) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.07, 0.015), mat); arm.position.set(Math.cos(k * 1.57) * 0.03, -0.07, Math.sin(k * 1.57) * 0.03); tail.add(arm); } g.add(head, tail); g.position.copy(at); g.position.y += 0.15; scene.add(g);      /* a tiny octopus: a round mantle and little arms, pulsing upward */
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.6; fryCloud.push({ g, mat, tail, t: 0, life: 9 + Math.random() * 8, delay: i * 0.18, vx: Math.cos(a) * 0.3, vy: 0.5 + Math.random() * 0.3, vz: Math.sin(a) * 0.22, ph: Math.random() * 6, drift: (Math.random() - 0.5) * 0.25, octo: true }); } return; } const col = new THREE.Color(tint ?? 0xf06a9a).lerp(new THREE.Color(0xffffff), 0.45);
  for (let i = 0; i < n; i++) { const g = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ color: col, transparent: true, opacity: 0.95, emissive: col, emissiveIntensity: 0.25 }), body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.12), mat), tail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.08), mat), eye = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.025), new THREE.MeshBasicMaterial({ color: 0x1a1020 }));
    tail.position.z = -0.09; eye.position.set(0.03, 0.01, 0.04); g.add(body, tail, eye); g.position.copy(at); g.position.y += 0.08; scene.add(g);
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.6; fryCloud.push({ g, mat, tail, t: 0, life: 9 + Math.random() * 8, delay: i * 0.18, vx: Math.cos(a) * 0.35, vy: 0.45 + Math.random() * 0.3, vz: Math.sin(a) * 0.25, ph: Math.random() * 6, drift: (Math.random() - 0.5) * 0.25 }); }
}
function fryTick(dt) {
  for (let i = fryCloud.length - 1; i >= 0; i--) { const k = fryCloud[i]; if ((k.delay -= dt) > 0) continue; k.t += dt; const P = k.g.position, w = Math.sin(k.t * 14 + k.ph);
    k.vx += (k.drift + Math.sin(k.t * 1.3 + k.ph) * 0.08) * dt; k.vy = Math.max(0.12, k.vy - 0.04 * dt); P.x += k.vx * dt; P.y = Math.min(Fish3D.topY - 0.4, P.y + k.vy * dt); P.z += k.vz * dt * 0.5;
    if (k.octo) { k.tail.scale.y = 0.8 + 0.4 * Math.max(0, w); k.g.rotation.z = w * 0.05; } else { k.g.rotation.y = Math.atan2(k.vx, k.vz); k.tail.rotation.y = w * 0.6; k.g.rotation.z = w * 0.08; }
    const fade = Math.max(0, Math.min(1, (k.life - k.t) / 3)); k.mat.opacity = 0.95 * fade; k.g.scale.setScalar(1 + k.t * 0.02);
    if (k.t > k.life) { scene.remove(k.g); k.g.traverse((o) => { o.geometry?.dispose(); }); k.mat.dispose(); fryCloud.splice(i, 1); } }
}
// you were there: one more little one is still by the eggs, for a while. Keep it too? (the first answer anyone gives decides)
let fryAsked = null;
async function fryOfferAsk() {
  const O = game.state?.fryOffer; if (!O || fryAsked === O.id || document.hidden || Date.now() > O.until) return; fryAsked = O.id;
  const first = game.state.fish.find((f) => f.id === O.first)?.name ?? 'the baby';
  const k = await ui.choose({ moment: true, title: 'One more little one', text: `Most of the larvae drifted off, but one more is still by the eggs, close to ${first}. There is room for it. Keep it too?`, options: [{ label: 'Keep it too', value: 'keep' }, { label: 'Let it drift off', value: 'go' }], cancel: 'Not now' });
  if (!k) { fryAsked = null; return; } const r = await game.dispatch({ t: 'keepFry', id: O.id, keep: k === 'keep' }); if (!r.ok) return r.reason === 'NOT_FOUND' ? null : fail(r);
  if (r.keep && r.fish) setTimeout(() => { const tw = fishes.byId.get(r.fish), sib = fishes.byId.get(O.first); if (tw && sib) { tw.pos.copy(sib.pos).add(new THREE.Vector3(0.4, 0.1, 0.2)); fishes.burst(tw.pos); } sfx('arrive'); spotlightFish(r.fish, 4000, 300); setTimeout(() => nameBaby(r.fish), 4600); }, 400);
}
// the egg is gone: either it hatched (the shell cracks open, the baby swims out of it and, if you are watching, the camera follows it a moment) or the octopus found it
const shards = [];
// the reveal: a baby comes out of the egg as a dark little shape, and its colors come up after a breath (for a rare color, a long breath, then sparkle)
function revealFish(f3, rec, wait = 1400, rise = 1600) {
  const ic = f3?.mesh?.instanceColor; if (!ic) return; const orig = Float32Array.from(ic.array), dark = 0.08, t0 = performance.now() + wait, rare = rec && morphOf(rec);
  ic.array.forEach((v, i) => { ic.array[i] = v * dark; }); ic.needsUpdate = true;
  const step = () => { const k = Math.max(0, Math.min(1, (performance.now() - t0) / rise)), e = k * k * (3 - 2 * k), m = dark + (1 - dark) * e; for (let i = 0; i < orig.length; i++) ic.array[i] = orig[i] * m; ic.needsUpdate = true;
    if (k < 1) requestAnimationFrame(step); else if (rare) { sfx('reward'); haptic(30); for (let i = 0; i < 6; i++) setTimeout(() => fishes.burst(f3.pos.clone()), i * 120); moment({ at: f3.pos, haptics: 30 }); ui.toast(`${rec.name} is ${MORPHS[rare].label.toLowerCase()}!`, 5000); } };
  requestAnimationFrame(step);
}
function eggGone(egg, s) {
  const at = egg.group.position.clone(), e = egg.e, baby = s.fish.filter((f) => f.stage === 'baby' && (f.parents ?? []).some((p) => p.id === e.a || p.id === e.b) && !eggBabies.has(f.id)).sort((a, b) => b.born - a.born)[0];      /* (the newest child of these parents) */
  if (!baby) { fishes.burst(at); return; }
  eggBabies.add(baby.id); const f3 = fishes.byId.get(baby.id); if (f3 && !document.hidden) revealFish(f3, baby, morphOf(baby) ? 3200 : 900, morphOf(baby) ? 2600 : 1200); if (f3) { f3.pos.copy(at); f3.pos.y += 0.1; f3.target.set(at.x + (Math.random() - 0.5) * 2, at.y + 1.6, at.z + 0.8); f3.retarget = 4; }
  const col = egg.shell.material.color ? new THREE.Color(egg.tint ?? 0xf06a9a) : null;
  if (!REDUCED) for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.05), new THREE.MeshLambertMaterial({ color: col ?? 0xf06a9a, transparent: true })); const a = (i / 9) * Math.PI * 2; m.position.copy(at); m.position.y += 0.1 + Math.random() * 0.3; scene.add(m); shards.push({ m, vx: Math.cos(a) * (0.8 + Math.random()), vy: 1.2 + Math.random() * 1.2, vz: Math.sin(a) * 0.8, rx: Math.random() * 8, age: 0 }); }
  fishes.burst(at); sfx('crack'); setTimeout(() => sfx('newlife'), 450); haptic(12); setTimeout(() => haptic(8), 300); window.__quietUntil = Math.max(window.__quietUntil ?? 0, Date.now() + 9000); window.__crackAt = Date.now(); fryOut(at, 5 + (hashId(e.id) % 4), egg.tint, e.species === 'octopus');      // the larvae rise from the eggs; one of them is the baby
  for (const pid of [e.a, e.b]) { const q = fishes.byId.get(pid); if (q) { q.fanK = 0; q.lureCalm = 0; q.brood = false; q.guarding = false; q.thought = null; } }      // the parents' watch is over
  for (const pid of [e.a, e.b]) { const par = fishes.byId.get(pid); if (!par || par.dead || par.species.move === 'jet') continue; let n = 0; const go = () => { if (!f3 || par.dead || ++n > 8) return; const a = n * 0.8 + (pid === e.a ? 0 : Math.PI); par.target.set(f3.pos.x + Math.cos(a) * 0.9, f3.pos.y + 0.2, f3.pos.z + Math.sin(a) * 0.6); par.retarget = 1.2; setTimeout(go, 1000); }; setTimeout(go, 600); }      // mum and dad swim over and circle their new baby
  if (f3 && !document.hidden && !play) { if (focus?.isEgg) setFocus(null); spotlightFish(baby.id, 6500, 1600); setTimeout(async () => { await nameBaby(baby.id); setTimeout(fryOfferAsk, 600); }, 8600); }      // you saw it hatch: a close look at the new baby
}
function shardTick(dt) { for (let i = shards.length - 1; i >= 0; i--) { const k = shards[i]; k.age += dt; k.vy -= 3.2 * dt; k.m.position.x += k.vx * dt; k.m.position.y = Math.max(sandH(k.m.position.x, k.m.position.z) + 0.03, k.m.position.y + k.vy * dt); k.m.position.z += k.vz * dt; if (k.m.position.y <= sandH(k.m.position.x, k.m.position.z) + 0.04) { k.vx *= 0.8; k.vz *= 0.8; k.vy = 0; } else { k.m.rotation.x += k.rx * dt; k.m.rotation.z += k.rx * 0.7 * dt; } if (k.age > 4) { k.m.material.opacity = Math.max(0, 1 - (k.age - 4) / 2); } if (k.age > 6) { scene.remove(k.m); k.m.geometry.dispose(); k.m.material.dispose(); shards.splice(i, 1); } } }
const eggBabies = new Set(); let glowT = 0;
// you were there when it hatched: name the baby (a name is already chosen; keep it or type another)
async function nameBaby(id) {
  const f = game.state.fish.find((x) => x.id === id); if (!f || f.named || play || placing || document.hidden) return;
  window.__nameAt = Date.now(); const nm = await ui.dialog({ moment: true, title: 'Name your baby', text: `The new little one is called ${f.name} for now. Keep it, or give it a name of your own.`, input: { value: f.name }, ok: 'Name it', cancel: `Keep ${f.name}` });
  if (!nm || nm === f.name || game.state.fish.find((x) => x.id === id)?.named) return; const r = await game.dispatch({ t: 'nameFish', id, name: nm }); if (!r.ok) fail(r); else ui.toast(`Welcome, ${nm}!`, 2600);
}
// a neglected egg the octopus has its eye on: the day before, it comes to sniff at it now and then (look after the tank and it loses interest)
// the parents do what their kind do. guard: the father hovers over the clutch fanning his fins to keep fresh water on it, now and then dips to
// pick out a bad egg, and chases off any fish that comes too close; the mother drops by. mouth: a cardinalfish father carries them at his lips
// and eats nothing. drift: open-water spawners leave them to float, as in the sea. Only the lead phone moves the fish; the others are shown it.
function eggCare(egg, dt, t) {
  const e = egg.e, P = egg.group.position, G = fishes.byId.get(e.guard), nm = (id, sn) => game.state.fish.find((f) => f.id === id)?.name ?? sn?.name;
  if (egg.mode === 'drift') { const H = egg.home; P.set(H.x + Math.sin(t * 0.07 + egg.t0) * 0.8, H.y + Math.sin(t * 0.23 + egg.t0) * 0.25, H.z + Math.cos(t * 0.05 + egg.t0) * 0.3); return; }      // carried slowly about on the current
  if (egg.mode === 'den') { if (!G || G.dead) return; G.thought = 'Guarding her eggs. She hardly leaves the den.'; G.longStay = true; if (isDirector() && G.st && G.den && !G.homing && !G.task && G.pos.distanceTo(P) > 1.6 && (egg.homeT = (egg.homeT ?? 0) - dt) <= 0) { egg.homeT = 6; G.goDen?.(G.st, Math.random); }
    const Fa = fishes.byId.get(e.b); if (isDirector() && Fa && !Fa.dead && !Fa.task && !Fa.inspect && (egg.dadT = (egg.dadT ?? 20 + Math.random() * 30) - dt) <= 0) { egg.dadT = 50 + Math.random() * 60; Fa.thought = 'Checking on the eggs.'; Fa.target.set(P.x - 0.7, Fa.pos.y, P.z + 0.4); Fa.retarget = 5;      /* (just heads that way: a plain swim target, nothing to grab) */ }      /* the father drops by now and then */
    return; }      // an octopus mother stays with her eggs in the den
  if (!G || G.dead || G.species.move === 'jet') return;
  if (egg.mode === 'mouth') { const m = G.mouth(); P.set(m.x, m.y - G.radius * 0.1, m.z); G.brood = true; G.lureCalm = 1; G.thought = 'Carrying the eggs in his mouth. He will not eat until they hatch.'; return; }
  if (!isDirector()) { if (G.pos.distanceTo(P) < 1.6) G.thought = 'Guarding the eggs.'; return; }
  const C = (egg.care ||= { s: 'watch', t: 0, cool: 0, mumT: 12 }), d = G.pos.distanceTo(P);
  G.guarding = true; if (C.s !== 'chase') octoNest(egg, G, P, C, t);      // (even while he is off for a bite: that is when an octopus tries its luck)
  if (G.seeking || G.holdfast) { G.fanK = 0; G.lureCalm = 0; return; }      // a quick bite first, then straight back
  C.t += dt; C.cool -= dt;
  if (C.cool <= 0 && C.s !== 'chase') { const o = fishes.list.find((x) => x !== G && !x.dead && !x.visitor && x.fid !== e.a && x.fid !== e.b && x.species.move !== 'jet' && x.pos.distanceTo(P) < 1.5);
    if (o) { C.s = 'chase'; C.t = 0; C.o = o; C.cool = 4; G.dartT = 0.9; G.fanK = 0; G.lureCalm = 0; o.fleeT = 1.8; const ax = o.pos.x - P.x, az = o.pos.z - P.z, L = Math.hypot(ax, az) || 1; o.target.set(Math.max(-4.5, Math.min(4.5, o.pos.x + ax / L * 3)), o.pos.y + 0.6, Math.max(-3, Math.min(2.5, o.pos.z + az / L * 2))); o.retarget = 3; G.thought = `Chasing ${o.name} away from the eggs.`; momentOf('eggchase', G, o); } }
  if (C.s === 'chase') { if (C.t > 1.3 || C.o.dead) { C.s = 'watch'; C.t = 0; } else { G.target.copy(C.o.pos); G.retarget = 1; } return; }
  if (C.s === 'pick') { G.target.set(P.x, P.y + 0.18, P.z + 0.22); G.retarget = 1; G.lureCalm = 1; G.fanK = 0; if (C.t > 1.8) { C.s = 'watch'; C.t = 0; } return; }
  const a = t * 0.35 + egg.t0;
  G.target.set(P.x + (egg.side ??= hashId(e.id) & 1 ? 1 : -1) * (0.75 + Math.sin(a) * 0.15), P.y + 0.5 + Math.sin(t * 0.8) * 0.08, P.z + 0.3 + Math.cos(a) * 0.12);      /* beside the clutch, nose to it, so you see both */ G.retarget = 1; G.lureCalm = d < 1.7 ? 1 : 0; G.fanK = d < 1.4 ? 1 : 0;
  if (d < 1.4 && C.t > 7 && Math.random() < dt * 0.25) { C.s = 'pick'; C.t = 0; G.thought = 'Picking a bad egg out of the clutch.'; } else if (d < 1.4 && C.s === "watch") G.thought = 'Fanning fresh water over the eggs.';
  if ((C.mumT -= dt) <= 0) { C.mumT = 22 + Math.random() * 20; const M = fishes.byId.get(e.guard === e.a ? e.b : e.a); if (M && !M.dead && !M.seeking && M.species.move !== 'jet') { M.target.set(P.x + 0.8, P.y + 0.9, P.z + 0.5); M.retarget = 5; M.thought = `Checking on the eggs with ${G.name}.`; } }
}
// An octopus and a guarded clutch, as on a reef: the father charges anything that comes for his eggs, however big, and the octopus backs off
// (sometimes in a puff of ink) and remembers: it keeps clear of that spot, longer each time it is driven off. Now and then it comes back to look
// from a safe distance; it only pushes in when the father has gone off (to eat) or if it is a bold one, and then he rushes back. A guarded
// clutch is never taken (only an unguarded one can be, see the rules).
function octoNest(egg, G, P, C, t) {
  const now = performance.now(), O = (C.octo ||= {});
  for (const o of fishes.list) {
    if (o.species.move !== 'jet' || o.dead || !o.mind) continue;
    const m = (O[o.fid] ||= { strikes: 0, probeAt: now + (60 + Math.random() * 120) * 1e3, keepAt: 0, push: false }), d = Math.hypot(o.pos.x - P.x, o.pos.z - P.z), gd = G.pos.distanceTo(P);
    const away = () => { const sx = o.pos.x >= P.x ? 1 : -1; return { x: Math.max(-3.6, Math.min(3.6, P.x + sx * 4.2)), z: Math.max(-1.5, Math.min(2.2, o.pos.z)) }; };
    if (now < (m.fleeing ?? 0)) { if (d < 2.0 && C.s !== 'chase' && gd < 3.5) { C.s = 'chase'; C.t = 0; C.o = o; C.cool = 2; G.dartT = 0.9; } continue; }      // already on its way off: he sees it out, one fight, not several
    if (now < m.probeAt && d < 3.0 && now > (m.steerAt ?? 0)) { m.steerAt = now + 6e3; const q = o.inspect; if (!q || Math.hypot(q.x - P.x, q.z - P.z) < 2.8) { o.inspect = away(); if (o.st?.s === 'bury' || o.st?.s === 'rest') o.st.t = 0; } }      // it remembers: nothing near the eggs is worth it now, and it moves off on its own
    if (d < 2.0 && C.s !== 'chase' && gd < 3.5) {      // too close: he goes for it
      C.s = 'chase'; C.t = 0; C.o = o; C.cool = 4; G.seeking = false; G.dartT = 1.1; G.fanK = 0; G.lureCalm = 0; G.thought = `Charging at ${o.name} to drive it off the eggs.`;
      o.startle?.(G.pos, G); m.strikes++; m.push = false; m.keepAt = 0; m.fleeing = now + 15e3; o.inspect = null;
      if (o.den && o.st && Math.sign(o.den.x - P.x) === Math.sign(o.pos.x - P.x)) o.goDen?.(o.st, Math.random); else o.inspect = away();      // it retreats properly: home if that is not past the eggs, else well away on its own side
      m.probeAt = now + Math.min(15 * 60, 90 + 75 * m.strikes + Math.random() * 90) * 1e3;      // the more often it is driven off, the longer it stays away
      fishes.memSay?.(o, `${G.name} drove it off the eggs. Keeping well clear now.`);
      if (isDirector() && !document.hidden) game.dispatch({ t: 'octoMoment', fish: o.fid, kind: 'chased', other: G.fid }).catch?.(() => {});
      continue;
    }
    if (now < m.probeAt) { if (m.strikes && now > m.keepAt) { m.keepAt = now + 60e3; (o.fears ||= []).push({ x: P.x, z: P.z, t: now, r: 2.8 }); if (o.fears.length > 4) o.fears.shift(); } continue; }      // keeping away: the spot stays one it avoids
    // time to have another look: from the edge, watching; it slips in only if he has left them, or if it is bold enough to try its luck
    if (o.st?.s !== 'rest' || o.st.mode || o.inspect || o.task || o.hunt || o.jarAt || (o.sleepK ?? 0) > 0.3) continue;
    const left = gd > 2.5, bold = (o.mind.bold ?? 0.5) > 0.7 && Math.random() < 0.3; m.push = left || bold;
    if (m.push) { o.fears = (o.fears ?? []).filter((q) => Math.hypot(q.x - P.x, q.z - P.z) > 0.5); o.inspect = { x: P.x, z: P.z }; fishes.memSay?.(o, left ? `${G.name} has left the eggs. Creeping in.` : 'Trying its luck with the eggs.'); }
    else { const sd = o.pos.x < P.x ? -1 : 1; o.inspect = { x: Math.max(-3.6, Math.min(3.6, P.x + sd * 3.0)), z: P.z + 0.2 }; o.watchPt = { x: P.x, y: P.y, z: P.z }; fishes.memSay?.(o, `Eyeing the eggs from a safe distance. ${G.name} is watching it.`); }
    m.probeAt = now + (120 + Math.random() * 180) * 1e3 + m.strikes * 30e3;
  }
}
function eggSniff(egg) {
  const e = egg.e, now = Date.now(); if (!e.risk || (e.cared?.length ?? 0) || !e.laid || now < e.laid + 864e5 || now > e.laid + 2 * 864e5) return false;
  const o = fishes.list.find((f) => f.species?.id === 'octopus' && !f.dead && !f.task && !f.hunt && !f.inspect && !f.holdfast); if (o) o.inspect = { x: egg.at.x + 0.7, z: egg.at.z + 0.2 }; return true;
}
// ── gifts: a fish given as a surprise waits wrapped in a gift bag on the sand until its friend opens it ──
const giftBags = new Map(); let giftToldAt = 0;
// a gift bag goes front and center on the sand, where it cannot be missed: the middle of the front floor, or the nearest clear spot beside it
function giftSpot(taken, h) { const sp = decor.spots(), z = 1.95; for (const dx of [0, -0.75, 0.75, -1.5, 1.5, -2.2, 2.2]) { const x = dx + ((h % 7) - 3) * 0.04; if (sp.some((q) => Math.hypot(q.x - x, q.z - z) < 0.9) || taken.some((q) => q && Math.hypot(q.x - x, q.z - z) < 0.8)) continue; return { x, z }; } return { x: 0, z: 2.15 }; }
function giftSync(s) {
  const want = new Map(); for (const f of s.fish ?? []) if (f.gift?.wrapped) { const g = want.get(f.gift.id) ?? { gift: f.gift, owner: f.owner, ownerName: f.ownerName, ids: [] }; g.ids.push(f.id); want.set(f.gift.id, g); }
  for (const [id, g] of want) { let b = giftBags.get(id);
    if (!b) { const h = hashId(id), at = giftSpot([...eggSprites.values(), ...giftBags.values()].map((x) => x.at), h); b = { ...g, at, floor: s.style?.floor ?? 'sand', bag: makeGiftBag(ribbonOf(g.gift.fromId ?? g.gift.from), s.style?.floor ?? 'sand') }; b.bag.group.position.set(at.x, sandH(at.x, at.z), at.z); b.bag.group.rotation.y = ((h % 60) - 30) / 100; scene.add(b.bag.group); giftBags.set(id, b); }
    else { Object.assign(b, g); if (b.floor !== (s.style?.floor ?? 'sand') && !b.bag.opening) { const pos = b.bag.group.position.clone(), ry = b.bag.group.rotation.y; scene.remove(b.bag.group); b.bag.dispose(); b.floor = s.style?.floor ?? 'sand'; b.bag = makeGiftBag(ribbonOf(g.gift.fromId ?? g.gift.from), b.floor); b.bag.group.position.copy(pos); b.bag.group.rotation.y = ry; scene.add(b.bag.group); } } }      // the floor was restyled: new paper to stand out on it
  for (const [id, b] of [...giftBags]) if (!want.has(id) && !b.bag.opening) { scene.remove(b.bag.group); b.bag.dispose(); giftBags.delete(id); }      // opened on another phone, or gone
  for (const b of giftBags.values()) if (!b.told && !b.bag.opening) { b.told = true; if (Date.now() - (b.gift.at ?? 0) < 3 * 60e3) {      // it has only just come: everyone looking is told, with a burst of bubbles round the bag so nobody misses it
      const p = b.bag.group.position.clone(); setTimeout(() => { sfx('arrive'); haptic(20); for (let i = 0; i < 5; i++) setTimeout(() => fishes.burst(p.clone().add(new THREE.Vector3(0, 0.3 + i * 0.2, 0))), i * 160); moment({ at: p }); ui?.toast(b.owner === game.you?.userId ? `Your gift from ${b.gift.from} just arrived! It's on the sand at the front.` : `A gift from ${b.gift.from} for ${b.ownerName ?? 'a friend'} just arrived, at the front of the tank.`, 5200); }, 700); b.fresh = true; } }
  const mine = [...giftBags.values()].find((b) => b.owner === game.you?.userId && !b.bag.opening);
  if (mine && Date.now() - giftToldAt > 10 * 60e3 && s.flags?.tut >= 5) { giftToldAt = Date.now(); setTimeout(() => ui?.toast(`A gift from ${mine.gift.from} is waiting for you. Tap the gift bag to open it.`, 4200), 1800); }
}
// ── things worth knowing, each said once, the first time it matters ──
const TIPS = [
  ['eggs', (s) => (s.eggs ?? []).length, 'EGGS IN THE TANK', 'Tap the eggs to see who is guarding them. Feeding the fish or changing the water on two days helps them hatch strong.'],
  ['away', (s) => game.shared && s.fish.some((f) => awayOwner(f, game.members) && f.owner !== game.you?.userId), 'A FRIEND IS AWAY', 'One of the animals has not had its caretaker in for a while. Tap it to look after it until they are back.'],
  ['octo', (s) => s.fish.some((f) => f.species === 'octopus' && !f.dead && f.owner === game.you?.userId) && (s.flags?.tut ?? 0) >= 5, 'GETTING TO KNOW IT', 'Tap your octopus: its card says what it is thinking and how much it trusts you. Trust grows each time you feed it and come to visit.'],
  ['toys', (s) => (s.toyPlays ?? 0) === 0 && Date.now() - (s.createdAt ?? Date.now()) > 864e5, 'PLAYTIME', 'Open Care, then Play: toss in a ball, start some bubbles, or shine a light spot. They learn which toys they like.'],
  ['crew', () => game.shared && (game.members?.length ?? 0) > 1, 'YOUR CREW', 'In Crew you can message your friends, stick a note on the glass, or send a message in a bottle.'],
  ['journal', () => (game.journal?.length ?? 0) > 25, 'THE JOURNAL', 'Everything that happens is kept in Crew, Journal, with photos of the moments you were there to see.'],
];
let tipAt = 0;
function tipsTick() {
  if (window.__noTips || performance.now() < tipAt) return; tipAt = performance.now() + 4000; const s = game.state; if (performance.now() < (window.__tipsSoon ? 0 : 60e3)) return;      // never in the first minute: arriving, joining and the welcome come first      // (by the clock, not by frames: a slow phone draws few)
  if (!s || (s.flags?.tut ?? 0) < 5 || ui?.tab !== 'tank' || focus || play || placing || feedMode || cleanMode || document.hidden || ['modal', 'reunion', 'coach', 'settle'].some((id) => $(id)?.classList.contains('on'))) return;
  let seen; try { seen = JSON.parse(localStorage.getItem('ourtank.tips') || '{}'); } catch { return; }
  if (Date.now() - (seen._last ?? 0) < 5 * 60e3) return;      // one tip at a time, a few minutes apart
  const tip = TIPS.find(([k, when]) => !seen[k] && when(s)); if (!tip) return;
  seen[tip[0]] = Date.now(); seen._last = Date.now(); try { localStorage.setItem('ourtank.tips', JSON.stringify(seen)); } catch { return; }
  ui.showCoach({ title: tip[2], text: tip[3], button: 'Got it', onButton: () => $('coach').classList.remove('on') });
}
// ── a photo for each real moment: a little camera of its own is pointed at whoever it is about (or the eggs) and takes the picture, wherever
// the screen happens to be looking. The phone running the animals sends it to the tank, so everyone's journal has it; alone, it is kept here ──
const SHOT_SKIP = /settled into a daily routine|have begun swimming together|comfortable near the glass|keeps coming back to|took on the colou?r|^.{1,40} fed |changed the water|cleaned the glass|trimmed|restyled|ordered |^Chapter:|began\.?$|wish came true|request|looked after|left the tank|joined|passed away|still wrapped/i;
function actorOf(text) {
  const names = fishes.list.filter((f) => !f.dead && f.name).sort((a, b) => b.name.length - a.name.length), hit = names.map((f) => ({ f, i: text.indexOf(f.name) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i);
  { const m = /meet (\S+?)[,.]/.exec(text); const baby = m && /hatched|swam out|made it/.test(text) && names.find((f) => f.name === m[1]); if (baby) { const par = (baby.rec?.parents ?? []).map((p) => fishes.byId.get(p.id)).filter((o) => o && !o.dead).sort((x, y) => x.pos.distanceTo(baby.pos) - y.pos.distanceTo(baby.pos))[0]; const near = par && par.pos.distanceTo(baby.pos) < 1.8 ? par : null; return { at: baby.pos.clone(), with: near?.pos, r: 0.5, who: [baby.group, near?.group].filter(Boolean) }; } }      // a hatching: the baby, and the parent closest to it
  if (/gave birth/.test(text) && hit.length) { const dad = hit[0].f, kids = fishes.list.filter((k) => k.nursery && !k.dead && k.pos.distanceTo(dad.pos) < 1.6); return { at: dad.pos.clone(), r: 0.9, who: [dad.group, ...kids.slice(0, 3).map((k) => k.group)] }; }      // a seahorse birth: the father with his newborns around him
  if (/\beggs?\b|clutch/i.test(text) && eggSprites.size) { const eg = [...eggSprites.values()][0]; return { at: eg.group.position.clone(), with: hit[0]?.f.pos, who: [eg.group, hit[0]?.f.group].filter(Boolean) }; }
  if (!hit.length) return null; const a = hit[0].f, b = hit.find((x) => x.f !== a)?.f; return { at: a.pos.clone(), with: b?.pos, r: Math.max(a.radius ?? 1, b?.radius ?? 0), who: [a.group, b?.group].filter(Boolean) };      // two animals in it: frame both
}
// where the camera can really see the moment: from the front first, then from the sides and above. A plant or rock in the way moves the camera; an animal
// tucked away out of sight (in its den, behind the coconut) is not photographed at all, rather than a close-up of the thing hiding it.
// how much of the animal really shows from a spot: a tiny render of it alone (its whole outline), then the tank with and without it; its pixels that change are the ones you see
const PW = 64, PH = 48, prt = new THREE.WebGLRenderTarget(PW, PH), pbuf = [0, 1, 2].map(() => new Uint8Array(PW * PH * 4));
function shownFrac(cam, who) {
  const r = stg.renderer, prev = r.getRenderTarget(), bg = scene.background, fog = scene.fog, cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha(), grab = (k) => { r.setRenderTarget(prt); r.clear(); r.render(scene, cam); r.readRenderTargetPixels(prt, 0, 0, PW, PH, pbuf[k]); };
  grab(0); who.forEach((g) => (g.visible = false)); grab(1); who.forEach((g) => (g.visible = true));
  const hid = []; scene.children.forEach((o) => { if (o.visible && !who.includes(o)) { o.visible = false; hid.push(o); } }); scene.background = null; scene.fog = null; r.setClearColor(0, 0); grab(2);
  hid.forEach((o) => (o.visible = true)); scene.background = bg; scene.fog = fog; r.setClearColor(cc, ca); r.setRenderTarget(prev);
  let all = 0, seen = 0; const [A, B, C] = pbuf; for (let i = 0; i < PW * PH * 4; i += 4) if (C[i + 3] > 0) { all++; if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 18) seen++; }
  return all ? seen / all : 0;
}
// where the camera can really see the moment: from the front first, then from the sides and above. A plant or rock in the way moves the camera; an animal
// tucked away out of sight (in its den, under the coconut) is not photographed at all, rather than a close-up of the thing hiding it.
function clearView(cam, c, d, who) {
  const tries = [[0.25, 0.3], [-0.6, 0.3], [0.8, 0.25], [0, 0.9], [-0.9, 0.6], [0.9, 0.7]]; let best = null;
  for (const [ax, ay] of tries) {
    const v = new THREE.Vector3(c.x + ax * d, c.y + ay * d * 0.6, c.z + d * Math.cos(ax * 0.9)); v.z = Math.min(v.z, 16); v.y = Math.max(v.y, 0.4);
    if (!who.length) return v; cam.position.copy(v); cam.lookAt(c.x, c.y, c.z); cam.updateMatrixWorld(); const f = shownFrac(cam, who);
    if (f > 0.85) return v; if (!best || f > best[1]) best = [v, f];
  }
  return best[1] > 0.75 ? best[0] : null;      // only partly hidden from every side: the clearest view, if most of it shows
}
// the whole tank, as it looks right now, without the interface (for a time capsule): a small jpeg
function tankShot() { composer.render(); const src = stg.renderer.domElement, k = 480 / Math.max(src.width, src.height), W = Math.round(src.width * k), H = Math.round(src.height * k), cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.getContext('2d').drawImage(src, 0, 0, W, H); let q = 0.7, img = cv.toDataURL('image/jpeg', q); while (img.length > 85000 && q > 0.3) img = cv.toDataURL('image/jpeg', (q -= 0.1)); return img.length > 85000 ? null : img; }      // (small enough for the server to keep)
window.__tankShot = tankShot;
// a moment for the journal: staged and developed by the photographer (w3/photo.js), from the animals' best side, the background soft
function shootAt(A) {
  let who = (A.who ?? []).filter(Boolean); if (!who.length) return null;
  if (who.length > 1) { const a = new THREE.Vector3(), b = new THREE.Vector3(); who[0].getWorldPosition(a); who[1].getWorldPosition(b); if (a.distanceTo(b) > 2.6) who = [who[0]]; }      // two far apart: the first one, close (rather than both, tiny)
  const studio = (shootAt.st ||= makeStudio({ renderer: stg.renderer, scene, hideForDepth: stg.hideForDepth })), cam = studio.camera;
  const spots = decor.spots(), clutter = (v, c) => { const seg = new THREE.Line3(v, c), q = new THREE.Vector3(), p = new THREE.Vector3(); return spots.filter((d) => { p.set(d.x, Math.min(c.y, 1.2), d.z); seg.closestPointToPoint(p, true, q); const r = decor.reach(d.type) * 0.6, u = v.clone().sub(c).setY(0).normalize(), rel = new THREE.Vector3(d.x - c.x, 0, d.z - c.z), front = rel.dot(u), side = rel.clone().sub(u.clone().multiplyScalar(front)).length();
    if (Math.hypot(d.x - c.x, d.z - c.z) <= r + 0.9) return front > 0.15 && side < r + 0.35;      /* its own den or plant: part of the picture beside or behind it, never in front of it */
    return q.distanceTo(c) > 0.9 && Math.hypot(q.x - d.x, q.z - d.z) < r + 0.2 && q.y < 3.2; }).length; };      /* (a plant or rock between the lens and the animal, not just behind it) */
  const plan = (() => { const go = (sub) => planShot({ subjects: sub, clutter, sizes: sub.map((g) => { const f = fishes.list.find((x) => x.group === g); return f ? (f.radius ?? 0.5) * (f.species?.move === 'jet' ? 1.1 : 2.1) : 0.6; }), why: (window.__shotWhy = []), seen: (v, c) => { cam.position.copy(v); cam.lookAt(c); cam.updateMatrixWorld(); return shownFrac(cam, sub); } }); return go(who) ?? (who.length > 1 ? go([who[0]]) : null); })(); if (!plan) return null;      // (an animal tucked away out of sight is not photographed at all)
  const seg = new THREE.Line3(plan.from, plan.at), q = new THREE.Vector3(), hid = [];
  for (const f of fishes.list) { if (who.includes(f.group) || !f.group.visible) continue; seg.closestPointToPoint(f.pos, true, q); const dir = f.pos.clone().sub(plan.from), ahead = dir.dot(plan.at.clone().sub(plan.from).normalize()), off = dir.clone().sub(plan.at.clone().sub(plan.from).normalize().multiplyScalar(ahead)).length(); if (q.distanceTo(f.pos) < 0.7 + (f.radius ?? 0.5) || (ahead > 0 && ahead < plan.focusDist + 1.2 && off < ahead * 0.42 + 0.6)) { f.group.visible = false; hid.push(f.group); } }      // nobody else in the frame up to just behind them (the stage is theirs; the tank further back stays, soft)
  if (fishes.bm) { hid.push(fishes.bm); fishes.bm.visible = false; } for (const k of [...shards.map((x) => x.m), ...fryCloud.map((x) => x.g)]) { k.visible = false; hid.push(k); }      // (the burst of rings and the bits of shell are for the moment itself, not the picture)
  const sub = fishes.list.filter((f) => who.includes(f.group)), em = sub.map((f) => [f.emote, f.emote?.visible]); sub.forEach((f) => { if (f.emote) f.emote.visible = false; });
  const posed = sub.filter((f) => f.species?.move !== 'jet' && f.sk !== 'seahorse' && !f.dead).map((f) => { const q0 = f.group.quaternion.clone(), u = plan.from.clone().sub(f.pos).setY(0).normalize(), fw = new THREE.Vector3(1, 0, 0).applyQuaternion(q0).setY(0);
    let side = new THREE.Vector3(-u.z, 0, u.x); const near = spots.filter((d) => Math.hypot(d.x - f.pos.x, d.z - f.pos.z) < decor.reach(d.type) * 0.6 + 1.2).sort((a, b) => Math.hypot(a.x - f.pos.x, a.z - f.pos.z) - Math.hypot(b.x - f.pos.x, b.z - f.pos.z))[0];
    if (near ? side.dot(new THREE.Vector3(f.pos.x - near.x, 0, f.pos.z - near.z)) < 0 : side.dot(fw) < 0) side.negate();      /* (facing the open water, away from a plant or rock right beside it; otherwise the way it was going) */ const want = side.multiplyScalar(Math.cos(0.5)).add(u.clone().multiplyScalar(Math.sin(0.5))).normalize();      /* level, side-on, turned a little toward the lens (a three-quarter profile, the way it was already heading) */
    f.group.quaternion.setFromEuler(new THREE.Euler(0, Math.atan2(-want.z, want.x), 0, 'YZX')); f.group.updateMatrixWorld(true); return [f, q0]; });
  try { return studio.shoot({ ...plan, aperture: plan.size < 0.8 ? 0.0045 : 0.004 }); } finally { posed.forEach(([f, q0]) => f.group.quaternion.copy(q0)); hid.forEach((g) => (g.visible = true)); em.forEach(([e, v]) => { if (e) e.visible = v; }); }      // (a tiny subject: a shallower focus still)
}
game.on('journal', (e) => {
  if (e?.text?.startsWith('Time capsule: day') && !document.hidden && (!game.shared || (isDirector() && e.id)) && Date.now() - (e.ts ?? Date.now()) < 6 * 3600e3) { setTimeout(() => { try { const img = tankShot(); if (!img) return; if (game.shared) { game.live?.send({ t: 'photo', jid: e.id, img }); (game.photos ||= new Map()).set(e.id, img); e.photo = true; } else { const list = JSON.parse(localStorage.getItem('ourtank.capsules') || '[]').filter((m) => m.text !== e.text); list.push({ text: e.text, ts: Date.now(), img }); localStorage.setItem('ourtank.capsules', JSON.stringify(list.length > 12 ? [list[0], ...list.slice(-11)] : list)); } } catch (er) { console.error('capsule photo', er); } }, 1500); return; }      // a time capsule's photo: the tank itself, right then (later, it stays a record without a photo)
  if (!e?.text || SHOT_SKIP.test(e.text) || document.hidden) return;
  if (game.shared && !(isDirector() && e.id)) return;      // one phone takes it, for everyone
  if (Date.now() - (e.ts ?? Date.now()) > 60e3) return;      // only a moment happening now (lines caught up from while the tank was closed are not photographed: no burst of photos at launch)
  shotQ.push({ e, at: Date.now() + (/hatched|swam out|made it/.test(e.text) ? 4600 : /gave birth/.test(e.text) ? 3600 : 450) }); shotPump();      // one photo at a time, spaced out, so the tank never stutters
});
const shotQ = []; let shotBusy = false;
function shotPump() {
  if (shotBusy || !shotQ.length) return; const wait = shotQ[0].at - Date.now(); if (wait > 0) { shotBusy = true; setTimeout(() => { shotBusy = false; shotPump(); }, wait); return; }
  const q = shotQ.shift(), e = q.e; shotBusy = true; let got = true; try { if (!document.hidden) got = momentPhoto(e) !== false; } catch (err) { console.warn('moment photo', err); }
  if (!got && (q.n ?? 0) < 3 && /hatched|swam out|jetted|gave birth|made it/.test(e.text)) shotQ.push({ e, n: (q.n ?? 0) + 1, at: Date.now() + 4000 });      /* (a newborn still coming out of its egg cannot be framed yet: try again in a moment) */
  setTimeout(() => { shotBusy = false; shotPump(); }, 1800);
}
function momentPhoto(e) {
  const A = actorOf(e.text); if (!A) return false; const img = shootAt(A); if (!img) return false;
  if (game.shared) { game.live?.send({ t: 'photo', jid: e.id, img }); (game.photos ||= new Map()).set(e.id, img); e.photo = true; }
  else { const list = JSON.parse(localStorage.getItem('ourtank.moments') || '[]').filter((m) => m.text !== e.text); list.unshift({ text: e.text, ts: Date.now(), img }); localStorage.setItem('ourtank.moments', JSON.stringify(list.slice(0, 30))); }
}
window.__shootText = (text) => { const A = actorOf(text); return A ? shootAt(A) : null; };      // (checks: the photo a journal line would get)
// a new Field Guide page, seen right now on this phone: a photo of the animal that did it (or of the tank), kept as the page's picture
let fieldKnown = null;
game.on('state', () => { const F = game.state?.field ?? {}; if (!fieldKnown) { fieldKnown = new Set(Object.keys(F)); return; }
  for (const [id, p] of Object.entries(F)) { if (fieldKnown.has(id)) continue; fieldKnown.add(id); if (document.hidden || Date.now() - (p.at ?? 0) > 60e3) continue;
    setTimeout(() => { try { const f = p.fish && fishes.byId.get(p.fish), img = (f && f.group.visible && shootAt({ at: f.pos.clone(), r: f.radius, who: [f.group] })) || tankShot(); if (!img) return;
      const all = JSON.parse(localStorage.getItem('ourtank.fieldpics') || '{}'); all[id] = img; localStorage.setItem('ourtank.fieldpics', JSON.stringify(all)); } catch (err) { console.warn('field photo', err); } }, 600); } });
window.__shootAt = (id) => { const f = fishes.byId.get(id); return f ? shootAt({ at: f.pos.clone(), r: f.radius, who: [f.group] }) : null; };
// ── each phone says how smoothly it draws, every few seconds; the server keeps the animals on a phone that can keep them smooth ──
const perf = { t0: performance.now(), n: 0 };
function perfTick() {
  if (window.__perfOff) return; perf.n++; const el = (performance.now() - perf.t0) / 1000; if (el < 5) return; const fps = perf.n / el; perf.t0 = performance.now(); perf.n = 0;      // frames really drawn per real second
  if (game.shared && game.live?.connected && !document.hidden) game.live.send({ t: 'perf', fps: Math.round(fps) });
}
game.on('role', () => { try { const p = JSON.parse(localStorage.getItem('ourtank.pushprefs') || '{}'); if (Object.keys(p).length) game.live?.send({ t: 'pushPrefs', prefs: p }); } catch { /* none */ } });
// a note on the glass counts as seen only after three seconds that someone is really looking: the app in front and in use (touched, or
// brought up, within the last minute), on the tank with nothing over it, and the note itself on screen. Being signed in is not seeing it.
const noteWatch = new Map(); let lastActive = performance.now(), noteAt = 0;
for (const ev of ['pointerdown', 'touchstart', 'keydown', 'wheel']) addEventListener(ev, () => { lastActive = performance.now(); }, { passive: true, capture: true });
document.addEventListener('visibilitychange', () => { if (!document.hidden) lastActive = performance.now(); });
function noteSeenTick() {
  const now = performance.now(), dt = Math.min(1, (now - (noteAt || now)) / 1000); noteAt = now; if (!noteWatch.size) return;
  const looking = !window.__noteIdle && !document.hidden && document.hasFocus?.() !== false && now - lastActive < 60e3 && ui?.tab === 'tank' && !glassNotes.hidden && !['modal', 'sheet', 'reunion'].some((id) => $(id)?.classList.contains('on'));
  for (const [id, ms] of noteWatch) {
    const el = glassNotes.querySelector(`.postit[data-id="${id}"]`); if (!el) { noteWatch.delete(id); continue; }
    const r = el.getBoundingClientRect(), onScreen = r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    if (!looking || !onScreen) continue;
    const t = ms + dt; if (t < 3) { noteWatch.set(id, t); continue; }
    noteWatch.delete(id); game.dispatch({ t: 'readNote', id });
  }
}
function giftTick(t, dt) { for (const [id, b] of [...giftBags]) if (b.bag.tick(t, dt) && !b.done) { b.done = true; setTimeout(() => { scene.remove(b.bag.group); b.bag.dispose(); giftBags.delete(id); }, 1500); } }
function giftHit(ev) { const ray = rayFrom(ev).ray; let best = null, bd = 1.3; for (const b of giftBags.values()) { if (b.bag.opening) continue; const p = b.bag.group.position.clone(); p.y += 0.4; const d = ray.distanceToPoint(p); if (d < bd) { bd = d; best = b; } } return best; }
async function openGiftBag(b) {
  if (b.owner !== game.you?.userId) { ui.toast(`A gift from ${b.gift.from} for ${b.ownerName ?? 'a friend'}. Only they can open it.`, 3000); return; }
  b.bag.open(); sfx('tap'); haptic(10);
  const r = await game.dispatch({ t: 'openGift', id: b.ids[0] }); if (!r.ok) { b.bag.opening = null; return fail(r); }
  const at = b.bag.group.position.clone(); setTimeout(() => { sfx('pop'); haptic(16); for (let i = 0; i < 4; i++) setTimeout(() => fishes.burst(at.clone().add(new THREE.Vector3(0, 0.4 + i * 0.15, 0))), i * 120); }, 900);
  const ids = r.ids ?? b.ids; let n = 0; const out = () => { const fs = ids.map((id) => fishes.byId.get(id)).filter(Boolean); if (!fs.length && ++n < 40) return setTimeout(out, 100);      // the fish swim up out of the open bag
    fs.forEach((f, i) => { f.pos.set(at.x + (i - (fs.length - 1) / 2) * 0.3, at.y + 0.4, at.z); f.target.set(at.x + (Math.random() - 0.5) * 2, at.y + 2.4, at.z + 0.6); f.retarget = 4; });
    if (fs[0] && !document.hidden) spotlightFish(fs[0].fid, 5500, 300); };
  setTimeout(out, 1100);
  const rec = () => game.state.fish.find((x) => x.id === ids[0]), d = SPECIES_DEF[rec()?.species] ?? { label: 'fish' };
  setTimeout(async () => { const f = rec(); if (!f) return; const many = ids.length > 1;
    const ok = await ui.dialog({ title: `A gift from ${String(b.gift.from)}`, text: `${b.gift.note ? `“${b.gift.note}”\n\n` : ''}${many ? `${ids.length} ${d.label.toLowerCase()}s, for you to look after.` : `Meet ${f.name}, a ${d.label.toLowerCase()}, for you to look after.`}`, ok: 'Say thanks', cancel: 'Later' });
    if (ok) { const t = await game.dispatch({ t: 'thankGift', id: ids[0] }); if (t.ok) ui.toast(`${b.gift.from} will know you loved it.`, 2600); } }, 6800);
}
function eggHit(ev) { const ray = rayFrom(ev).ray; let best = null, bd = 1.3; for (const egg of eggSprites.values()) { const d = ray.distanceToPoint(egg.group.position); if (d < bd) { bd = d; best = egg; } } return best; }
function showEggCard(fx) {
  const e = fx.egg.e, s = game.state, nm = (id, snap) => s.fish.find((x) => x.id === id)?.name ?? snap?.name ?? 'a fish', A = nm(e.a, e.pa), B = nm(e.b, e.pb), now = Date.now();
  const left = Math.max(0, e.hatchAt - now), hrs = Math.round(left / 36e5), when = e.ready ? 'Ready now: stay and watch' : left < 36e5 ? 'Any minute now' : hrs < 24 ? `In about ${hrs} hour${hrs === 1 ? '' : 's'}` : `In about ${Math.round(hrs / 24 * 2) / 2} days`;
  const cared = e.cared?.length ?? 0, p = e.laid ? Math.min(1, (now - e.laid) / Math.max(1, e.hatchAt - e.laid)) : 0.5, stage = p > 0.85 ? 'Silvery and trembling: nearly ready' : p > 0.6 ? 'Little eyes showing' : p > 0.35 ? 'Dark specks: the eyes are forming' : 'Just laid';
  const C = eggCareOf(e), G = s.fish.find((x) => x.id === e.guard && !x.dead), who = C.mode === 'drift' ? `Nobody: ${SPECIES_DEF[e.species]?.label ?? 'this kind'} parents leave their eggs to drift. It is up to you.` : G ? (C.mode === 'mouth' ? `${G.name}, carrying them in his mouth` : `${G.name}, on guard`) : 'No parent is left to watch them. It is up to you.';
  const pill = $('fishpill'); fx.name = `${A} & ${B}'s eggs`;
  if (cardOpen !== fx.fid) { card.classList.remove('on'); pill.querySelector('b').textContent = 'Egg'; pill.hidden = false; pill.onclick = () => { cardOpen = fx.fid; sfx('tap'); showEggCard(fx); }; return; }
  pill.hidden = true;
  card.innerHTML = `<button class="grab" id="grab" aria-label="Fold the card away"></button><button class="x" aria-label="Close">×</button>
    <div class="chd"><h2>${esc(fx.name)}</h2><div class="sp">${SPECIES_DEF[e.species]?.label ?? e.species} eggs · <b class="mood">${stage}</b></div></div>
    <dl><dt>Hatches</dt><dd>${when}</dd><dt>Parents</dt><dd>${esc(A)} and ${esc(B)}</dd>${(() => { const pa = e.pa ?? s.fish.find((x) => x.id === e.a), pb = e.pb ?? s.fish.find((x) => x.id === e.b), o = pa && pb ? Object.entries(morphOdds(pa, pb, !!e.moon)) : []; return o.length ? `<dt>Could hatch</dt><dd>${o.map(([k, v]) => `${Math.round(v * 100)}% ${MORPHS[k].label.toLowerCase()}`).join(', ')}${e.moon ? ' 🌕 laid under a full moon' : ''}</dd>` : ''; })()}<dt>Looking after them</dt><dd>${esc(who)}</dd>${e.laid ? `<dt>Laid</dt><dd>${new Date(e.laid).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</dd>` : ''}<dt>Looked after</dt><dd>${cared >= 2 ? `${cared} days ✓ It will hatch strong` : `${cared} of 2 days`}</dd></dl>
    ${e.risk && !cared && e.laid && now > e.laid + 864e5 ? `<p class="warn">${esc(s.fish.find((x) => x.species === 'octopus' && !x.dead)?.name ?? 'The octopus')} has been sniffing around it. Feed the fish or change the water today to keep it safe.</p>` : ''}<p class="dim">${cared >= 2 ? 'Well looked after. The baby will hatch happy, with a head start in growing.' : 'Feed the fish or change the water on two different days and the baby hatches strong: happy, with a head start in growing.'}</p><p class="dim">${esc(C.fact)}</p>`;
  card.classList.add('on'); card.classList.remove('peek'); const close = () => { cardOpen = null; showEggCard(fx); }; card.querySelector('.x').onclick = close; $('grab').onclick = close;
}
window.__showCard = (f) => showCard(f);
function showCard(f) {
  if (f && f.species?.move !== 'jet' && !f.dead) fishes.attention?.(f.fid);      // someone is looking at another animal: an octopus that knows them well may come to the glass
  if (f.isEgg) return showEggCard(f);
  if (f.dead) return showDeadCard(f);
  if (f.nursery) return openNursery();      // a baby still in the nursery: the nursery's own card
  if (Date.now() - lastCard > 1500 || lastInspect !== f.fid) { lastInspect = f.fid; game.observe({ key: 'inspect', fish: f.fid }); game.track('fish_inspected'); }
  lastCard = Date.now();
  const rec = game.state.fish.find((x) => x.id === f.fid) ?? { traits: [], born: Date.now() }, p = fishes.profileOf(rec, game.state), nx = nextStage(rec);
  const fam = (rec.parents?.length || childrenOf(game.state, rec.id).length) ? '<button class="lnk fam" id="fam">Family</button>' : '';
  const strain = (() => { const so = socialOf(game.state, rec); return so.notes[0] ? `<p class="warnline soft">${esc(so.notes[0])}</p>` : ''; })(), warn0 = rec.ail >= AIL_WARN ? '<p class="warnline">Critical. Slow, and eating little. Needs food and clean water.</p>' : rec.ail >= AIL_TIRED ? '<p class="warnline">Sluggish and paler. Care would help.</p>' : '', warn = warn0 + strain;
  const octo = rec.species === 'octopus', mind = octo ? octoMind(rec) : null, tile = (k, v, wide = false) => (v ? `<div class="ft ${wide ? 'w' : ''}"><small>${k}</small><b>${v}</b></div>` : '');
  const days = Math.max(1, Math.round((Date.now() - (rec.born ?? Date.now())) / 864e5)), denTxt = octo ? (f.den?.home ? (f.den.kind === 'pot' ? 'A clay pot' : 'A coconut shell') : f.den?.kind === 'rocks' ? 'A rock shelter it built' : f.den ? (DECOR_DEF[f.den.kind]?.label ?? 'A den') : 'Looking for one') : null;
  const owner = rec.ownerName || rec.owner ? (!game.shared || rec.owner === game.you?.userId ? 'You' : esc(game.members?.find((mm) => mm.id === rec.owner)?.name ?? rec.ownerName ?? 'A friend')) : null, close = bondLine(rec).replace(/^.*<dd>|<\/dd>$/g, '');
  // the profile: a header and a line about who it is, then four tabs
  const P = personaOf(rec), sum = summaryOf({ ...rec, name: f.name }, P), fm = familiarityOf(rec), beh = behaviourList(rec), seen = beh.filter((x) => x.seen), KD = kindDef(rec), info = KD ? { ...(SPECIES_INFO[rec.species] ?? {}), sci: KD.sci, size: KD.size, from: KD.from, wild: KD.note, care: KD.care, temper: KD.temper, breed: KD.breed, kindLabel: KD.label } : SPECIES_INFO[rec.species] ?? {};
  const stage = rec.elder ? 'Elder' : { baby: 'Baby', juvenile: 'Young', adult: 'Adult' }[stageOf(rec)] ?? '', sea = rec.species === 'seahorse', LOG = rec.log ?? {}, live = f.dw?.log;
  const lv = { ...(LOG.lv ?? {}) }; for (const [k, v] of Object.entries(live?.lv ?? {})) lv[k] = (lv[k] ?? 0) + v;
  const AREA = { front: 'The front sand', middle: 'The middle bank', rear: 'The high back bank', top: 'Near the surface', mid: 'Mid-water', low: 'Near the bottom' }, topArea = Object.entries(lv).sort((x, y) => y[1] - x[1])[0];
  const decorName = (id) => { const d = id && game.state.decor.find((x) => x.id === id); return d ? DECOR_DEF[d.type]?.label ?? null : null; };
  const palId = rec.pal ?? (octo ? rec.buddy ?? f.buddy : null), pal = palId ? (game.state.fish.find((x) => x.id === palId)?.name ?? fishes.byId.get(palId)?.name) : null;
  const favs = [[octo ? '🦀' : '🍤', 'Food', p.food], sea ? ['🌿', 'Hitch', decorName(LOG.fav ?? f.favHold)] : octo ? ['🏠', 'Home', denTxt === 'Looking for one' ? null : denTxt] : ['📍', 'Spot', p.spot], ['🧭', 'Area', topArea && topArea[1] > 60 ? AREA[topArea[0]] : null], ['💞', 'Companion', pal ? esc(pal) : null]];
  if (octo && f.favThing) favs.splice(2, 0, ['✨', 'Thing', f.favThing]);
  const tab = (game.profTab ??= 'over'), T = (k, l) => `<button class="tb ${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`, row = (k, v) => (v ? `<div class="ir"><span>${k}</span><b>${v}</b></div>` : '');
  const famBar = `<div class="famb">${FAMILIAR.map((_, i) => `<i class="${i < fm.i ? 'f' : i === fm.i ? 'c' : ''}">${i === fm.i ? `<b style="width:${Math.round(Math.max(0.12, fm.k) * 100)}%"></b>` : ''}</i>`).join('')}</div>`;
  const tags = (list) => list.map((x) => `<span class="bt ${x.seen ? '' : 'lock'}">${x.seen ? esc(x.label) : '?'}</span>`).join('');
  const toysTile = (() => { const T = rec.toys ?? {}, ks = Object.keys(TOYS).filter((k) => T[k]); if (!ks.length) return ''; const fav = favToy(rec);      // which toys it plays with, and how far it has got with each
    return `<div class="trust toyt"><span>${msIcon(TOYS[fav ?? ks[0]].icon, true, 14)} Toys</span><b>${fav ? `Loves the ${TOYS[fav].label.toLowerCase()}` : 'Just starting'}</b><small>${ks.map((k) => `${TOYS[k].label} ${T[k] >= TOY_LEARN ? '✓ learned' : `${T[k]} of ${TOY_LEARN}`}`).join(' · ')}</small></div>`; })();
  const bondTile = rec.species === 'octopus' || rec.species === 'seahorse' ? bondLines(rec, game.now(), LOG) : '';
  const playBlk = () => rec.away || f.visitor ? '' : `<div class="acts2 playrow"><button class="act2 ${(game.state?.want?.fish === rec.id && game.state?.want?.kind === 'play') ? 'due' : ''}" id="pet">✋ ${f.species.id === 'octopus' ? `Let ${esc(rec.name)} follow your finger` : `Play with ${esc(rec.name)}`}<small>drag your finger along the glass</small></button></div>`;
  const nextLine = (() => { const n = storyNext(game.state, game.state.fish.find((x) => x.id === rec.id) ?? rec); return n ? `<p class="mind next"><b>Next</b> ${esc(n)}</p>` : ''; })();      // the next chapter of its life, first
  const lifeLine = (() => { const out = [], nm = (id) => DECOR_DEF[game.state.decor.find((d) => d.id === id)?.type]?.label?.toLowerCase();      // Emergent Life: its habits, and a companion it misses (from the tank's records only)
    if (rec.grudge) out.push(`Has it in for ${esc(rec.grudge.name)}${rec.grudge.why === 'den' ? ', who keeps poking round its den' : ''}.`);
    if (rec.lean?.from?.length) { const L = rec.lean, dim = [['cur', 'curious'], ['soc', 'sociable'], ['bold', 'bold'], ['act', 'lively'], ['adapt', 'easy-going']].filter(([k]) => Number.isFinite(L[k]) && L[k] !== 0).map(([k, w]) => (L[k] > 0 ? `a little more ${w}` : `a little less ${w}`)); if (dim.length) out.push(`Takes after ${esc(L.from.join(' and '))}: ${dim.slice(0, 2).join(', ')}.`); }
    { const away = game.state.fish.find((o) => o.away && !o.away.inTank && (o.buddy === rec.id || o.id === rec.pal)); if (away) out.push(`Waiting for ${esc(away.name)} to come back.`); }
    for (const h of rec.habits ?? []) if (nm(h.id)) out.push(`Every ${DAYPART[h.tod]}: the ${esc(nm(h.id))}.`);
    { const pid = rec.log?.fav ?? rec.spotId ?? rec.mem?.likes?.[0] ?? rec.habits?.[0]?.id, d = pid && game.state.decor.find((x) => x.id === pid), st = d && decorStory(game.state, d, { DECOR_DEF }); if (st) out.push(esc(st)); }      // its favourite place's own history
    if (rec.loss && Date.now() < rec.loss.until) out.push(rec.loss.rehomed ? `Misses ${esc(rec.loss.name)}, who went to a new home.` : `Misses ${esc(rec.loss.name)}${rec.loss.place && nm(rec.loss.place) ? `, and keeps going back to the ${esc(nm(rec.loss.place))}` : ''}.`);
    { const hm = harmonyOf(game.state); if (game.state.fish.length > 1 && hm?.note && hm.note.includes(rec.name)) out.push(`Tank harmony: ${esc(hm.label.toLowerCase())}. ${esc(hm.note)}`); }      // (how it gets on with the others: moved here from Care)
    return out.length ? `<p class="mind fam">${out.join('<br>')}</p>` : ''; })();
  // its color genes, plainly, and who it could be paired with (and what their babies might look like)
  const geneLine = (() => { const live = game.state.fish.find((x) => x.id === rec.id); if (!live || live.dead) return ''; const mo = morphOf(live), car = carriesOf(live), out = [];
    if (mo) out.push(`<b>${esc(MORPHS[mo].label)}</b>, a rare color with two copies of the gene.`); if (car.length) out.push(`Carries a hidden ${car.map((x) => MORPHS[x].label.toLowerCase()).join(' and ')} color. It only shows in a baby that gets it from both parents.`);
    const adult = stageOf(live) === 'adult', mates = adult && live.species !== 'seahorse' ? game.state.fish.filter((o) => o !== live && !o.dead && o.species === live.species && stageOf(o) === 'adult' && (isOctoF(live) ? !o.partner && !live.partner : sexOf(o) !== sexOf(live))) : [];
    const btns = mates.slice(0, 3).map((o) => { const od = Object.entries(morphOdds(live, o, skyOf(Date.now()).event?.key === 'fullmoon')).map(([k, v]) => `${Math.round(v * 100)}% ${MORPHS[k].label.toLowerCase()}`).join(', '); return `<button class="pair" data-pair="${esc(o.id)}">Pair with ${esc(o.name)}${od ? ` <small>${od}</small>` : ''}</button>`; }).join('');
    const send = game.live && !canSend(game.state, live, game.you?.userId ?? 'me', Date.now()) ? `<button class="pair send" data-send="1">Send ${esc(live.name)} to a friend's tank</button>` : '';      // (bred here: it can go and grow up in a friend's tank)
    return out.length || btns || send ? `<div class="genes">${out.length ? `<p class="mind">${out.join(' ')}</p>` : ''}${btns}${send}</div>` : ''; })();
  const playLine = (() => { const S0 = rec.hideScore ?? {}, mine = S0[game.you?.userId] ?? S0.me ?? S0.solo ?? Object.values(S0)[0]; if (!mine) return ''; return `<p class="mind">Hide and seek: <b>you ${mine.you}</b> · <b>${esc(rec.name)} ${mine.it}</b>. ${mine.it > mine.you ? 'It knows your habits: hide somewhere new.' : 'Fool it in three tries or more and the treat pays back double.'}</p>`; })();      // the contest so far
  const famLine = (() => { if (rec.species === 'octopus') { const m = rec.advMem; if (!m?.n && !rec.away) return '';      // its Little Adventures: where it is, how often it has gone, what it brought home
      const items = [...new Set((m?.items ?? []).map((x) => KEEPSAKES[x.k]?.label.toLowerCase()).filter(Boolean))], fav = (game.state.keeps ?? []).find((k) => k.id === m?.fav), out = [];
      if (rec.away) out.push(`<b>${rec.away.inTank ? 'HIDING SOMEWHERE' : 'OUT EXPLORING'}</b>`);
      if (m?.n) out.push(`Adventures: ${m.n - (m.kinds?.hide ?? 0)}${(m.kinds?.hide ?? 0) ? ` · hid ${m.kinds.hide} time${m.kinds.hide > 1 ? 's' : ''}` : ''}${m.pref === 'long' ? ' · likes a long one' : m.pref === 'short' ? ' · likes to stay close' : ''}`);
      if (items.length) out.push(`Keepsakes: ${esc(items.join(', '))}`); if (fav) out.push(`Favorite: the ${esc(KEEPSAKES[fav.k].label.toLowerCase())}`);
      for (const k of (game.state.keeps ?? []).filter((q) => q.by === rec.id && q.h?.carries).slice(0, 2)) out.push(esc(keepStory(game.state, k, { KEEPSAKES })));      // only from its record
      return `<p class="mind fam">${out.join('<br>')}</p>`; }
    if (rec.species !== 'seahorse') return ''; const now = game.now(), out = [], nm = (id) => game.state.fish.find((x) => x.id === id)?.name, day = (ts) => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    if (rec.bornHere) out.push(`<b>BORN IN YOUR AQUARIUM</b><br>Mother: ${esc(rec.parents?.[1]?.name ?? '?')} · Father: ${esc(rec.parents?.[0]?.name ?? '?')}<br>Birth date: ${esc(day(rec.birthDate ?? rec.born))}`);
    if (rec.widowAt && now - rec.widowAt < 7 * 864e5 && !rec.mate) out.push('Still grieving: not ready to bond again yet.');
    if (rec.preg) { const d = Math.floor((now - rec.preg.start) / 864e5) + 1, tot = Math.round((rec.preg.due - rec.preg.start) / 864e5); out.push(`Expecting: day ${d} of about ${tot}. His brood pouch is filling.`); }
    else if (rec.lastBirth && now - rec.lastBirth < 5 * 864e5) out.push('Just gave birth. The babies are growing up in the tank.');
    return out.length ? `<p class="mind fam">${out.join('<br>')}</p>` : ''; })();
  const ms = milestonesOf(rec, game.shared ? game.you?.userId : 'me'), msDone = ms.filter((m) => m.done).length, path = `<div class="mhead"><span>Milestones</span><b>${msDone} of ${ms.length}</b></div><div class="mpath" aria-label="Milestones ${msDone} of ${ms.length}">${ms.map((m) => `<span class="${m.done ? 'on' : ''}" title="${m.label}" data-ms="${m.done ? `${esc(rec.name)}: ${m.label} ✓` : `Not yet: ${m.label.toLowerCase()}`}"><i>${msIcon(m.key === 'home' && (rec.parents ?? []).length ? 'hatched' : m.key, m.done)}</i><small>${m.label}</small></span>`).join('')}</div>`;      // its milestones: one path for every fish, lit as it gets there
  const tr = rec.species === 'octopus' ? octoTrust(rec, game.you?.userId ?? 'me') : null, trustRow = tr ? `<div class="trust"><span>🐙 Trust</span><b>${tr.label}</b><small>${tr.next ? `${tr.next.need} more crab${tr.next.need === 1 ? '' : 's'} or visits to: ${tr.next.label.toLowerCase()}` : 'It trusts you completely.'}</small></div>` : '';      // how far this octopus has come to trust you
  const misses = rec.missing && Date.now() - rec.missing.at < 864e5 ? `Misses the ${rec.missing.what}. Looking for somewhere new.` : null, thought = misses ?? f.thought;      // for a day after something it loved is taken out
  const whyLine = (() => { const now = game.now(), nm = (id) => game.state.fish.find((x) => x.id === id)?.name ?? (game.state.memorial ?? []).find((x) => x.id === id)?.name, L = LIFESPAN[rec.species], age = (now - rec.born) / 864e5;      // why it is the way it is today, in one line
    if (rec.widowAt && now - rec.widowAt < 7 * 864e5) return `Grieving its partner. It needs about ${Math.max(1, Math.ceil(7 - (now - rec.widowAt) / 864e5))} more day${Math.ceil(7 - (now - rec.widowAt) / 864e5) === 1 ? '' : 's'} before it feels like itself.`;
    if (p.needs[3] < 0.5) return 'Unwell: it needs food and clean water to get its strength back.';
    if (p.needs[0] < 0.35) return 'Hungry. It has been a while since a good meal.';
    if (rec.elder) return 'An elder now: slower, softer colors, and still enjoying every day.';
    if (L && age >= L * 0.75 - 7) return 'Getting older: within a week or so it will be an elder.';
    if (p.needs[1] < 0.4) return 'A bit low. A clean tank and some play would cheer it up.';
    return null; })();
  const famNames = (() => { const out = [], nm = (id) => game.state.fish.find((x) => x.id === id)?.name, par = (rec.parents ?? []).map((x) => x?.name).filter(Boolean), kidsL = childrenOf(game.state, rec.id), sib = game.state.fish.filter((x) => x.id !== rec.id && (x.parents ?? []).length && (x.parents ?? []).some((q) => (rec.parents ?? []).some((r) => r?.id && r.id === q?.id))).map((x) => x.name);
    if (par.length) out.push(`Parents: ${par.join(' & ')}`); if (rec.mate && nm(rec.mate)) out.push(`Partner: ${nm(rec.mate)}`); if (sib.length) out.push(`Siblings: ${sib.slice(0, 4).join(', ')}${sib.length > 4 ? ` +${sib.length - 4}` : ''}`); if (kidsL.length) out.push(`Young: ${kidsL.length}${kidsL.some((k) => !k.alive) ? ` (${kidsL.filter((k) => k.alive).length} still here)` : ''}`);
    return out.length ? esc(out.join(' · ')) : null; })();
  // Did you know: the day's fact (tap for another); every one you have read is kept, so the card builds into a little field guide of the species
  const FL = FACTS[rec.species] ?? [], fod = factOfDay(rec.species, game.factPeek ?? 0), fkey = 'ourtank.facts.' + rec.species, fseen = (() => { try { return new Set(JSON.parse(localStorage.getItem(fkey) || '[]')); } catch { return new Set(); } })();
  if (fod) { fseen.add(fod.n - 1); try { localStorage.setItem(fkey, JSON.stringify([...fseen])); } catch { /* storage unavailable */ } }
  const factLine = fod ? `<div class="dyk" role="button" tabindex="0" id="dyk"><small>DID YOU KNOW? · ${fseen.size} of ${FL.length} found</small><p>${esc(fod.text)}</p><span>Tap for another</span></div>${fseen.size > 1 ? `<details class="flog"><summary>All you have found about ${esc(f.species.label.toLowerCase())}${/s$/.test(f.species.label) ? '' : 's'} (${fseen.size})</summary><ol>${[...fseen].sort((a, b) => a - b).map((i) => `<li>${esc(FL[i])}</li>`).join('')}</ol></details>` : ''}` : '';      // the day's fact, also on the first tab
  const sec = (t, body) => (body && body.replace(/\s+/g, '') ? `<h4 class="csec">${t}</h4>${body}` : '');      // one heading style for every part of the card; an empty part is left out
  const over = sec('Right now', `${thought ? `<div class="now">💭 <span>${esc(thought)}</span></div>` : ''}${whyLine && !misses ? `<div class="now why">${msIcon('friend', true, 14)} <span>${esc(whyLine)}</span></div>` : ''}${comfortBlock(rec)}${turtleBlock(rec)}${leaveBlock(rec)}${nextLine}${playBlk()}${playLine}${trustRow}`)
    + path
    + sec(`Looking after ${esc(f.name)}`, `<div class="info">${careRows(rec)}</div>${brainBlock(rec)}<div class="btnrow">${trickBlock(rec)}${fam}</div>`)
    + sec('Its shell', crabBlock(rec, f))
    + sec('What it likes', `<div class="favs">${favs.map(([ic, k, v]) => `<div class="fv ${v ? '' : 'unk'}"><em>${ic}</em><small>${k}</small><b>${v ?? 'Not yet known'}</b></div>`).join('')}</div>${toysTile}${bondTile}`)
    + sec('Its story', `${geneLine}${famLine}${lifeLine}${orphanBlock(rec, f)}`)
    + sec(`About the ${esc((kindDef(rec)?.label ?? f.species.label).toLowerCase())}`, `<div class="info">${row('Species', info.kindLabel ?? f.species.label)}${row('Temper', info.temper ? esc(info.temper) : null)}${row('Scientific name', info.sci ? `<i>${info.sci}</i>` : null)}${row('Adult size', info.size)}${row('Helps the tank', info.helps ? esc(info.helps) : null)}${row('Lives in', info.from ? esc(info.from) : null)}${row('Eats', info.eats ? esc(info.eats) : null)}${row('In the wild', info.wild ? esc(info.wild) : null)}${row('Care', info.care ? esc(info.care) : null)}${row('Breeding', info.breed ? esc(info.breed) : null)}${row('Life stage', `${stage}${nx ? ` · grows up in ${nx.label}` : ''}`)}${row('In the tank', `${days} day${days === 1 ? '' : 's'}`)}${row('Caretaker', owner)}${row('Closest to', close)}${row('Family', famNames)}${row('Rival', octo && (rec.rival ?? f.rival) ? esc(fishes.byId.get(rec.rival ?? f.rival)?.name ?? '') : null)}${octo && game.shared && rec.owner && rec.owner !== game.you?.userId ? row('Who feeds it', `Only ${esc(rec.ownerName ?? 'its caretaker')}`) : ''}</div>${factLine}`);
  // personality at a glance: a word and five dots for each trait, two to a row (tap one for what it means), then a real fact about the animal
  const bondV = Math.min(1, (rec.bond?.[game.you?.userId ?? 'me'] ?? 0) / 15), bondW = bondV >= 0.9 ? 'Best friends' : bondV >= 0.5 ? 'Close' : bondV >= 0.2 ? 'Warming up' : 'Just met';
  const tiles = [...TRAIT_BARS.map((b) => { const v = P[b.k], [w, ex] = traitWords(rec, b.k, v); return { label: b.label, col: b.col, w, v, tip: `${b.label}: ${w}. ${ex}` }; }), { label: 'Bond with you', col: '#ff8fb1', w: bondW, v: bondV, tip: `Bond with you: ${bondW}. It grows each time you feed or play with ${rec.name}.` }];      // six tiles, three even rows of two
  const pers = `<div class="psum"><em>${sea ? '🌿' : octo ? '🐙' : '🐟'}</em><div><b>${esc(sum.title)}</b><span>${esc(sum.line)}</span></div></div><div class="tgrid">${tiles.map((x) => { const dots = Math.max(1, Math.round(x.v * 5)); return `<button class="tg" data-tip="${esc(x.tip)}"><span>${x.label}</span><b style="color:${x.col}">${x.w}</b><i>${[1, 2, 3, 4, 5].map((k) => `<em style="${k <= dots ? `background:${x.col}` : ''}"></em>`).join('')}</i></button>`; }).join('')}</div>
    ${(() => { const tf = (TRAIT_FACTS[rec.species] ?? {}), t = (octo ? octoChips(mind) : p.traits).map((x) => tf[x]).find(Boolean); return t ? `<p class="tfact">${msIcon("trick", true, 14)} ${esc(t)}</p>` : ''; })()}
    <div class="chips">${(octo ? octoChips(mind) : p.traits).map((t) => `<span>${t}</span>`).join('')}</div>
    ${octo ? (octoLine(mind, f) !== mind.line ? `<p class="mind">${esc(octoLine(mind, f))}</p>` : '') : `<p class="mind">${esc(SOCIAL[rec.species]?.nature ?? '')}${p.traits.length ? ' ' + p.traits.map((t) => TRAIT_TXT[t]).filter(Boolean).join(' ') : ''}</p>`}
    <h4>Behaviors · ${seen.length} of ${beh.length}</h4><div class="tags">${tags(beh)}</div><p class="dim sm">${seen.length < beh.length ? `Keep watching: ${esc(f.name)} will show you the rest in its own time.` : `You have seen everything ${esc(f.name)} does.`}</p>
    ${(() => { const hb = habitLines({ name: f.name, species: rec.species, ...lifeTotals(LOG, f, live) }, decorName); return hb.length ? `<h4>Habits</h4><ul class="dyk">${hb.map((h) => `<li>${h.icon} ${esc(h.text)}</li>`).join('')}</ul>` : ''; })()}
    ${socialLines(rec)}`;
  const tankLen = (n) => (n < 1 ? 'Less than one tank length' : `${Math.round(n)} tank length${Math.round(n) === 1 ? '' : 's'}`), dist = (LOG.dist ?? 0) + (live?.dist ?? 0), lvTot = Object.values(lv).reduce((a, b) => a + b, 0);
  const lvKeys = octo ? ['rear', 'middle', 'front'] : ['top', 'mid', 'low'], lvCol = { rear: '#c9a46a', middle: '#e3c58c', front: '#f1dcae', top: '#7fd3ff', mid: '#3f9fd8', low: '#2a6a9a' };
  const kids = childrenOf(game.state, rec.id).length, places = new Set([...(LOG.places ?? []), ...(live?.places ?? [])]).size;
  const stats = `<div class="facts">${tile('Age', p.age)}${tile('In the tank', `${days} day${days === 1 ? '' : 's'}`)}${tile('Travelled', tankLen(dist / 8))}${tile('Places visited', places ? String(places) : null)}${sea ? tile('Holdfasts gripped', String((LOG.holds ?? 0) + Math.max(0, (f.holdN ?? 0) - (live?.holds ?? f.holdN ?? 0)))) + tile('Plankton snapped', String((LOG.snaps ?? 0) + Math.max(0, (f.snicks ?? 0) - (live?.snaps ?? f.snicks ?? 0)))) + seaStats(LOG, f, live) : ''}${tile('Puzzle jars', rec.solved ? `${rec.solved}${rec.bestSecs ? ` · best ${rec.bestSecs}s` : ''}` : null)}${tile('Crabs caught', rec.crabs ? String(rec.crabs) : null)}${tile('Rearranged the tank', rec.moved ? `${rec.moved} time${rec.moved === 1 ? '' : 's'}` : null)}${tile('Tricks', rec.tricks?.length ? rec.tricks.map((k) => TRICKS[k]?.label).filter(Boolean).join(', ') : null, true)}${tile('Youngsters', kids ? String(kids) : null)}</div>
    ${lvTot > 60 ? `<h4>Where it spends its time</h4><div class="lvbar">${lvKeys.map((k) => `<b style="flex:${Math.max(0.001, lv[k] ?? 0)};background:${lvCol[k]}"></b>`).join('')}</div><div class="lvkey">${lvKeys.map((k) => `<span><i style="background:${lvCol[k]}"></i>${AREA[k]} ${Math.round(((lv[k] ?? 0) / lvTot) * 100)}%</span>`).join('')}</div>` : `<p class="dim sm">Where ${esc(f.name)} likes to spend its time will show here after a while.</p>`}
`;
  const wellH = (() => { const L = (rec.well ?? []).slice(-8).reverse(); if (!L.length) return ''; const W = { thriving: ['Thriving', 'good'], fine: ['Doing fine', 'ok'], off: ['A bit off', 'warn'], unwell: ['Unwell', 'bad'] };
    const day = (ts) => { const d = Math.floor((Date.now() - ts) / 864e5); return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); };
    return `<h4 class="csec">Wellbeing</h4><div class="wlog">${L.map((e) => `<div class="wl"><em class="hw ${W[e.w]?.[1] ?? 'ok'}">${W[e.w]?.[0] ?? e.w}</em><span>${e.got.map((m) => `<small class="got">✓ Got: ${esc(m.toLowerCase())}</small>`).join('')}${e.lost.map((m) => `<small class="lost">○ Started missing: ${esc(m.toLowerCase())}</small>`).join('')}${!e.got.length && !e.lost.length ? `<small>${e.w === 'unwell' ? 'Fell unwell' : 'Feeling better'}</small>` : ''}</span><b>${day(e.at)}</b></div>`).join('')}</div>`; })();      // what changed in how it feels, newest first
  const jour = `${wellH}${wellH ? '<h4 class="csec">Its story</h4>' : ''}${storyBlock(rec, 14) || '<p class="dim">Its story starts here. Moments in its life will be kept in this space.</p>'}${(rec.parents?.length || kids) ? `<dl>${familyRows(rec)}</dl>` : ''}`;
  card.innerHTML = `<button class="grab" id="grab" aria-label="Fold the card away or open it"></button><button class="x" aria-label="Close">×</button>
    <div class="chd"><h2>${esc(f.name)} <button class="ren" id="ren" aria-label="Rename">✎</button></h2><div class="sp">${kindDef(rec)?.label ?? f.species.label}${kindDef(rec) ? ` · ${esc(kindDef(rec).temper)}` : ''}${sexOf(rec) === 'm' ? ' · ♂ Male' : ' · ♀ Female'} · ${stage} · ${days} day${days === 1 ? '' : 's'} here · <b class="mood">${(() => { try { const W = wellOf(game.state, rec); return `${W.mood[0]} · ${W.score}%`; } catch { return p.mood; } })()}</b>${(rec.parents ?? []).length && Date.now() - rec.born < 864e5 ? ' <em class="newb">New</em>' : ''}</div></div>
    <div class="tabs">${T('over', 'Overview')}${T('pers', 'Personality')}${T('stats', 'Stats')}${T('jour', 'Journal')}</div>
    <div class="tpane">${{ over, pers, stats, jour }[tab] ?? over}</div>`;
  card.querySelectorAll('[data-tip]').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); sfx('tap'); ui.toast(b.dataset.tip, 3200); }; }); if ($('dyk')) $('dyk').onclick = (e) => { e.stopPropagation(); sfx('tap'); game.factPeek = (game.factPeek ?? 0) + 1; showCard(f); };
  card.querySelectorAll('[data-send]').forEach((b) => { b.onclick = async (e) => { e.stopPropagation(); sfx('tap');
    const code = await ui.dialog({ title: `Send ${f.name}?`, text: `${f.name} will leave this tank for good and grow up in your friend's, with its colors and its family's names. Ask them for their tank's gift code: it is at the top of their Field Guide.`, input: { value: '', placeholder: 'Their gift code' }, ok: 'Send', cancel: 'Keep it here' }); if (!code) return;
    try { const r = await api('/api/send', { fish: f.fid, code }); haptic(20); sfx('bubble'); ui.toast(`${f.name} is on the way to ${r.toName}.`, 4200); setFocus(null); } catch (err) { ui.toast(err.offline ? 'Sending needs the tank to be online.' : ({ BAD_CODE: 'No tank has that code.', SAME_TANK: 'That is your own tank.', TANK_FULL: 'Their tank is full.', TOO_SOON: 'One a day: try again tomorrow.', NOT_YOURS: 'Only its own caretaker can send it.', BUSY: 'Not while it is looking after young.', NOT_BRED_HERE: 'Only an animal bred in this tank can be sent (one that came from another tank stays).', LAST_FISH: 'It is the last one in your tank.', CANT_SEND: 'This one cannot be sent.' })[err.code] ?? 'That did not work.', 3600); } }; });
  card.querySelectorAll('[data-pair]').forEach((b) => { b.onclick = async (e) => { e.stopPropagation(); sfx('tap'); const r = await game.dispatch({ t: 'matchmake', a: f.fid, b: b.dataset.pair }); if (!r.ok) return fail(r); haptic(14); ui.toast('Brought together. Give them time.', 3000); showCard(f); }; });
  card.querySelectorAll('[data-ms]').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); sfx('tap'); ui.toast(b.dataset.ms, 2200); }; });
  card.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); game.profTab = b.dataset.tab; sfx('tap'); showCard(f); card.scrollTop = 0; }; });
  const pill = $('fishpill'); if (cardOpen !== f.fid) { card.classList.remove('on'); pill.querySelector('b').textContent = f.name; pillDoing(f); pill.hidden = false; pill.onclick = () => { if (play) return; cardOpen = f.fid; sfx('tap'); showCard(f); }; return; }
  pill.hidden = true; card.classList.add('on'); card.classList.remove('peek'); awayBanner(rec); eggLink(rec); const setMore = () => {}; { const tr = $('turtrel'); if (tr) tr.onclick = () => releaseTurtle(rec); } { const lg = $('letgo'); if (lg) lg.onclick = async () => { const yes = await ui.dialog({ title: `Let ${rec.name} go?`, text: `${rec.name} goes back to the sea to find what it was missing. It won't come back, but it may send a postcard.`, ok: 'Let it go', cancel: 'Keep trying' }); if (!yes) return; const r = await game.dispatch({ t: 'letGo', id: rec.id }); if (!r.ok) return fail(r); setFocus(null); }; } { const pz = $('puz'); if (pz) pz.onclick = () => { setFocus(null); givePuzzle(rec.id); }; const ct = $('crabt'); if (ct) ct.onclick = () => { setFocus(null); feedCrabTo(rec.id); }; } card.querySelector('.x').onclick = () => { cardOpen = null; showCard(f); }; $('grab').onclick = () => { if (!play) { cardOpen = null; showCard(f); } }; card.querySelectorAll('[data-wellopen]').forEach((b) => (b.onclick = () => { cardOpen = null; setFocus(null); ui.openHealth(rec.id); })); $('ren').onclick = () => renameFish(f); if ($('pet')) $('pet').onclick = () => playWith(f); if ($('fam')) $('fam').onclick = () => showFamily(rec);
  if ($('claimo')) $('claimo').onclick = async () => { const r = await game.dispatch({ t: 'claimOcto', id: rec.id }); if (!r.ok) return fail(r); sfx('arrive'); haptic(10); setFocus(null); };
  if ($('releaseo')) $('releaseo').onclick = async () => { const yes = await ui.dialog({ title: 'Let it go?', text: `${f.name} will slip away over the back of the tank to the reef. It is not hurt, and it will not come back.`, ok: 'Let it go', cancel: 'Keep', danger: true }); if (!yes) return; const r = await game.dispatch({ t: 'releaseOcto', id: rec.id }); if (!r.ok) return fail(r); setFocus(null); }; card.querySelectorAll('[data-train]').forEach((b) => { b.onclick = () => trainFish(f, b.dataset.train, b.dataset.spot); }); card.querySelectorAll('[data-show]').forEach((b) => { b.onclick = () => showTrick(f, b.dataset.show); });
}
// What an animal is doing right now, in a few words, read from its own state (nothing made up: with no clear activity, just its name)
const nm3 = (o) => o?.rec?.name ?? o?.name ?? null;
const decorLabel = (id) => { const d = (fishes.spots?.() ?? []).find((q) => q.id === id); return d ? (DECOR_DEF[d.type]?.label ?? d.type).toLowerCase() : null; };
// a hermit crab's own part of its card: its temperament, the shell it is in (and whether it is getting snug), every shell it has lived in, where it likes to be, who it keeps meeting, what it has found
function crabBlock(rec, f) {
  if (!isCrab(rec)) return ''; const C = rec.crab ?? {}, T = CRAB_TYPES[C.type] ?? null, need = crabNeed(rec), fit = shellFit(C.shell?.sz ?? 1, need), nm = (id) => game.state?.fish.find((x) => x.id === id)?.name, spot = C.fav && game.state?.decor.find((d) => d.id === C.fav);
  const when = (at) => { const d = Math.floor((Date.now() - at) / 864e5); return d < 1 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`; };
  const met = Object.entries(C.met ?? {}).sort((a, b) => b[1] - a[1]).map(([id]) => nm(id)).filter(Boolean).slice(0, 2);
  const area = { left: 'the left side of the tank', right: 'the right side of the tank', front: 'the front, by the glass', back: 'the back of the tank', middle: 'the middle of the tank', high: 'up on the rocks' }[C.area];
  return `<div class="info">${T ? `<div><span>Temperament</span><b>${esc(T.label)}</b></div>` : ''}<div><span>Lives in</span><b>${esc(shellLabel(C.shell?.t))}${fit === 'small' ? ' · getting snug' : ''}</b></div>${spot ? `<div><span>Favorite spot</span><b>by the ${esc((DECOR_DEF[spot.type]?.label ?? 'rock').toLowerCase())}</b></div>` : ''}${area ? `<div><span>Likes</span><b>${esc(area)}</b></div>` : ''}${met.length ? `<div><span>Often with</span><b>${esc(met.join(' and '))}</b></div>` : ''}${C.wary && nm(C.wary) ? `<div><span>Wary of</span><b>${esc(nm(C.wary))}</b></div>` : ''}</div>`
    + (T ? `<p class="dim">${esc(T.line)}${fit === 'small' ? ` It has outgrown this shell and is looking for a bigger one.` : ''}</p>` : '')
    + ((C.hist ?? []).length ? `<p class="dim"><b>Shells so far:</b> ${(C.hist ?? []).map((h) => `${esc(shellLabel(h.t))} (${h.how === 'arrived' ? 'arrived in it' : when(h.at)})`).join(' → ')}</p>` : '')
    + ((C.finds ?? []).length ? `<p class="dim"><b>Found:</b> ${(C.finds ?? []).map((x) => `${esc(shellLabel(x.k))}, ${when(x.at)}`).join(' · ')}</p>` : '');
}
function doingOf(f) {
  if (!f || f.dead) return null; if (f.crab) return f.doing ?? null;      /* (a hermit crab says what it is doing itself: crab3d.js) */ const S = f.st, octo = f.species?.move === 'jet', rec = f.rec ?? {};
  if (octo) {
    const C = f.keepCarry; if (C) return C.phase === 'carry' ? 'carrying its keepsake home' : 'going to fetch its keepsake';
    if (f.hunt) return 'hunting a crab'; if (f.jarAt) return 'working on a puzzle jar'; if (f.glassAt?.trick) return 'doing a trick';
    if (f.glassAt) return f.greeted === 'glass' ? 'at the glass, looking at you' : 'at the glass';
    if ((f.sleepK ?? 0) > 0.5) return 'asleep';
    if (f.den && Math.hypot(f.pos.x - f.den.x, f.pos.z - f.den.z) < 1.4) return f.greeted === 'den' && (f.gazeT ?? 0) > 0 ? 'watching you from its den' : S?.s === 'rest' ? 'resting in its den' : 'at its den';
    if ((f.costumeK ?? 0) > 0.5 && f.costume) return { lion: 'pretending to be a lionfish', jelly: 'pretending to be a jellyfish', snake: 'pretending to be a sea snake', flat: 'lying flat as a sole', kelp: 'pretending to be seaweed', fish: 'copying a fish' }[f.costume] ?? null;
    if (f.gazeTurn) return 'looking at you';
    if (S?.s === 'crawl' && S?.mode === 'inspect') return 'investigating something'; return S?.s === 'rest' ? 'resting' : null;
  }
  if (f.sk === 'seahorse') {
    if (f.greet) return f.mateId ? `dancing with ${nm3(fishes.byId.get(f.mateId)) ?? 'its mate'}` : 'greeting another seahorse';
    if (f.holdfast?.on) { const mate = f.mateId && fishes.byId.get(f.mateId), near = mate?.holdfast?.on && Math.hypot(mate.holdfast.x - f.holdfast.x, mate.holdfast.z - f.holdfast.z) < 2.6;
      return near ? `resting beside ${f.rec?.sex === 'm' ? 'his' : f.rec?.sex === 'f' ? 'her' : 'its'} mate` : `holding on to the ${decorLabel(f.holdfast.id) ?? 'plant'}`; }
    if (f.seeking) return 'going after food'; return f.sleepy ? 'asleep' : null;
  }
  if ((f.coverT ?? 0) > 0 && f.thought?.startsWith('Took cover')) return f.thought.replace('Took cover', 'taking cover');      // (the sensing layer, fishmgr.senseTick)
  if ((f.lookedNew ?? 0) > performance.now() && /^(Came to look|Watching the new)/.test(f.thought ?? '')) return f.thought.replace(/^Came to look/, 'looking').replace(/^Watching/, 'watching');
  if (f.restK && f.idle > 0) { if (f.restWith && !f.restWith.dead) return `resting with ${nm3(f.restWith) ?? 'a friend'}, its best friend`; if (rec.spotId) return `resting at its favorite spot, the ${decorLabel(rec.spotId) ?? 'rock'}`; }
  if (f.clean?.o) return `cleaning ${nm3(f.clean.o) ?? 'a fish'}`;
  if (f.sk === 'neongoby' && f.perch && (f.mul ?? 1) < 0.3) return `waiting at its ${decorLabel(f.perch) ?? 'station'}`;
  if (f.graze) return 'grazing algae'; if (f.seeking) return 'eating';
  if (f.follow && !f.follow.dead) return `swimming with ${nm3(f.follow) ?? 'a friend'}`;
  { const pal = rec.pal && fishes.byId.get(rec.pal); if (pal && !pal.dead && f.pos.distanceTo(pal.pos) < 2.2) return `swimming with ${nm3(pal)}, its best friend`; }
  if (rec.spotId) { const d = (fishes.spots?.() ?? []).find((q) => q.id === rec.spotId); if (d && Math.hypot(f.pos.x - d.x, f.pos.z - d.z) < 1.6) return `at its favorite spot, the ${decorLabel(d.id)}`; }
  if (f.sleepy || (f.sleepK ?? 0) > 0.5) return 'asleep'; return null;
}
// noticed: a tapped animal answers in its own way, without leaving what it is doing (never a teleport, never an interrupted meal, cleaning or trick)
function tapReact(f) {
  if (!f || f.dead) return; if (f.crab) { f.react(); return; }      /* (a crab: into its shell if it is timid, claws up if it is bold, otherwise a look and a step back) */ const front = { x: f.pos.x, y: f.pos.y, z: 20 };
  if (f.species?.move === 'jet') { f.gazeT = Math.max(f.gazeT ?? 0, 2.2); f.gazeFace = true; if ((f.trust ?? 0) >= 2) f.flush = Math.max(f.flush ?? 0, 0.3); return; }      // its eyes go wide at you
  if (f.sk === 'seahorse') { f.glance = front; f.glanceT = 1.6; return; }      // one eye swivels round to you; it keeps hold
  if (f.seeking || f.clean || f.script?.length || f.follow) return;
  f.vigor = Math.max(f.vigor ?? 1, 1.25); setTimeout(() => { if ((f.vigor ?? 1) > 1) f.vigor = 1; }, 700);      // a flick of the tail
  if (f.target && !f.holdfast?.on) { f.target.z = Math.min(f.target.z + 0.8, 2.2); f.retarget = Math.max(f.retarget ?? 0, 1.5); }      // and it drifts a little toward the glass
}
function pillDoing(f) { const pill = $('fishpill'); let sm = pill.querySelector('small'); if (!sm) { sm = document.createElement('small'); pill.querySelector('b').after(sm); } const d = doingOf(f); sm.textContent = d ? `· ${d}` : ''; sm.hidden = !d; }
setInterval(() => { const p = $('fishpill'); if (p && !p.hidden && focus) pillDoing(focus); }, 1000);      // (it keeps up: a seahorse that lets go, a goby that starts cleaning)
function setFocus(f) { if (play) return; if (focus) { focus.mul = 1; focus.fondFocus = false; focus.poseHz = null; } if (f && !f.isEgg) { f.poseHz = 60; tapReact(f); }      /* (up close, its body moves every frame) */ focus = f; if (!f) { $('fishpill').hidden = true; cardOpen = null; } if (f) { f.mul = 0.35; showCard(f); sfx('tap'); if (f.species.id === 'octopus' && !f.dead) { f.fondFocus = (f.bondMe ?? 0) >= 3; const cross = f.poke(); if (cross || Math.random() < 0.15) { fishes.squirt(f); sfx('splash'); } if (cross) ui.toast(`${f.name} has had enough of being poked`, 2600); } } else card.classList.remove('on'); }
canvas.addEventListener('pointerdown', (ev) => {
  fishes.attnAt = Date.now();      // someone is looking and touching: an octopus about to fetch a keepsake leaves it for later (Emergent Life)
  if (play) { playPoint(ev); return; }
  if (toys.armed && !placing && !feedMode && !cleanMode) { const k = toys.armed, ray = rayFrom(ev).ray;      // a toy from the Toy box: the ball is tossed in, bubbles rise from the sand, the light is held and dragged
    if (k === 'ball') { if (ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.6), hit)) { toys.toss(hit.x, 0.3 + Math.random() * 0.8); toys.armed = null; } return; }
    if (k === 'cube' || k === 'hoop') { if (ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.6), hit)) { if (k === 'cube') toys.dropCube(hit.x); else toys.hangHoop(hit.x); toys.armed = null; } return; }
    const at = toys.sandHit(ray); if (!at) return; if (k === 'bubbles') { toys.blow(at); toys.armed = null; } else if (k === 'light') { toys.lightOn(at); lightHeld = true; canvas.setPointerCapture?.(ev.pointerId); } return; }
  if (!placing && !rearrange && !feedMode && !cleanMode && driftHit(ev)) { pickDrift(); return; }
  if (!placing && !rearrange && !feedMode && !cleanMode && bottleHit(ev)) { openBottle(); return; }
  if (!placing && !rearrange && !feedMode && !cleanMode && mystHit(ev)) { openMystery(); return; }
  if (!placing && !rearrange && !feedMode && !cleanMode) { const gb = giftHit(ev); if (gb) { openGiftBag(gb); return; } }
  if (!placing && !rearrange && !feedMode && !cleanMode && !pickFish(ev)) { const egg = eggHit(ev); if (egg) { const fx = eggFocusOf(egg); if (focus === fx) { cardOpen = fx.fid; showEggCard(fx); } else setFocus(fx); return; } }
  if (placing) { canvas.setPointerCapture?.(ev.pointerId); movePlace(ev); dragging = true; return; }
  if (rearrange) { const id = decor.pick(rayFrom(ev).ray); if (id) { const t = game.state.decor.find((d) => d.id === id).type; startPlace(t, id); } return; }
  if (feedMode) { if (rayFrom(ev).ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.8), hit)) dropFood(Math.max(-4, Math.min(4, hit.x))); return; }
  // A quick tap on a fish opens its card when the finger lifts. Pressing and dragging is for luring the fish, so it never opens a card, and neither does a touch right after luring (the fish gather under the finger).
  const f = pickFish(ev); if (f?.visitor) { greetVisitor(f); return; }
  const now = performance.now(), fresh = { t0: now, x: ev.clientX, y: ev.clientY, on: false };
  if (f) { if (now - lureEnd > 1500) tapCand = { f, x: ev.clientX, y: ev.clientY, t: now }; lure = fresh; return; }
  if (focus) setFocus(null); else { lure = fresh; const did = decor.pick(rayFrom(ev).ray); if (did && now - lureEnd > 1500) tapCand = { decor: did, x: ev.clientX, y: ev.clientY, t: now }; }      /* (a quick tap on a decoration: its little menu) */
});
let tapCand = null, lureEnd = 0;
// hold a finger in the water: the bold and the curious come to see it. Nothing is earned; the fish simply like you.
let lure = null; const lureAt = new THREE.Vector3(), lurePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -1.6), lureFx = new WeakMap();
// A finger held on the glass. Each fish decides for itself: a curious or brave one notices quickly, a calm one takes a moment, a shy or tired one keeps away.
// It darts over in a burst, settles a little way off (its own spot around the finger, not on it), hangs there with small fidgets and the odd nip at the glass,
// nudges along in discrete moves only when the finger has really moved, and loses interest after a while before maybe coming back. Nothing slides.
function lureTick(dt) {
  if (!lure || play || placing || rearrange || feedMode || cleanMode || focus || performance.now() - lure.t0 < 380) return;
  if (!rayFrom({ clientX: lure.x, clientY: lure.y }).ray.intersectPlane(lurePlane, lureAt)) return;
  if (!lure.on) { lure.on = true; lure.last = lureAt.clone(); lure.moved = 0; fishes.burst(lureAt.clone().setZ(1.2)); haptic(6); }
  lure.moved += lureAt.distanceTo(lure.last); lure.last.copy(lureAt);                      // how much the finger has travelled: movement re-excites a fish that has drifted off
  for (const f of fishes.list) if (f.species.move === 'jet' && !f.dead && !f.shy && !f.jarAt && !f.hunt && f.pos.distanceTo(lureAt) < 12) { f.glassAt = { x: lureAt.x, y: lureAt.y, until: performance.now() + 2600 }; if (f.glassNear > 0.7) { const k = (octoPlayed.get(f) ?? 0) + dt; octoPlayed.set(f, k); if (k > 2 && k - dt <= 2) playedWith(f); } }       // an octopus comes to press its arms against the glass where your finger is
  let n = 0;
  for (const f of fishes.list) {
    if (f.dead || f.visitor || f.script?.length || f.isShy || f.weak || f.species.move === 'jet') continue;
    const tr = f.profile?.traits ?? [], curious = tr.includes('Curious'), brave = tr.includes('Brave'), playful = tr.includes('Playful'), lazy = tr.includes('Lazy');
    let L = lureFx.get(f); if (!L) { L = { s: 'idle', t: 0, ang: ((f.seed ?? n) * 2.4 + n * 1.7), r: 0.7 + ((f.seed ?? 0) % 5) * 0.12, seen: 0 }; lureFx.set(f, L); } n++;
    const d = f.pos.distanceTo(lureAt), near = d < 7 + (curious ? 2 : 0); L.t += dt;
    const spot = (jx = 0, jy = 0) => f.target.set(Math.max(-4, Math.min(4, lureAt.x + Math.cos(L.ang) * L.r + jx)), Math.max(0.9, Math.min(13, lureAt.y + Math.sin(L.ang) * L.r * 0.7 + jy)), 2.3);
    if (L.s === 'idle') {                                                                 // has not noticed yet: a reaction time by temperament, and the finger has to be within range
      if (!near || L.cool > performance.now()) continue;
      if (L.t > (brave || curious ? 0.15 : lazy ? 1.1 : 0.5) + ((f.seed ?? 0) % 7) * 0.08) { L.s = 'dart'; L.t = 0; L.seen++; spot(); f.retarget = 2.5; f.dartT = 0.9 + Math.min(1.2, d * 0.15); f.lureCalm = 0; }
    } else if (L.s === 'dart') {                                                          // a burst over, then it settles
      if (d < L.r + 0.5 || L.t > 2.6) { L.s = 'hang'; L.t = 0; L.hold = 3.5 + (curious ? 4 : 0) + (playful ? 2 : 0) + ((f.seed ?? 0) % 4); L.fidget = 0.6; f.lureCalm = 1; f.retarget = 9; }
      else if (lure.moved > 1.2) { lure.moved = 0; spot(); f.retarget = 2.5; }
    } else if (L.s === 'hang') {                                                          // hanging around: small fidgets, a nip at the glass now and then, a nudge when the finger moves
      L.fidget -= dt;
      if (lure.moved > 0.9) { lure.moved = 0; L.ang += (Math.random() - 0.5) * 1.2; spot(); f.retarget = 2; f.dartT = 0.35; }
      else if (L.fidget <= 0) { L.fidget = 0.7 + Math.random() * 0.9; const nip = Math.random() < (playful ? 0.4 : 0.18); if (nip) { f.target.set(lureAt.x + (Math.random() - 0.5) * 0.3, lureAt.y + (Math.random() - 0.5) * 0.3, 2.6); f.dartT = 0.3; } else spot((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.4); f.retarget = 2; }
      if (!L.played && L.t > 2.4) { L.played = true; playedWith(f); }
      if (L.t > L.hold) { L.s = 'idle'; L.t = 0; L.cool = performance.now() + (3000 + Math.random() * 5000) / (curious ? 2 : 1); f.lureCalm = 0; f.retarget = 0; }      // loses interest, wanders off, may come back later
    }
  }
}
async function playedWith(f) {
  if (!f || f.dead || f.visitor) return; const r = await game.dispatch({ t: 'pet', id: f.fid }).catch(() => null); if (!r?.ok || !r.applied) return;
  fishes.burst(f.pos); sfx('arrive'); haptic(8); f.vigor = Math.max(f.vigor, 1.1); if (r.delta > 0) flyShells(r.delta, [window.innerWidth / 2, window.innerHeight * 0.4]);
}
const octoPlayed = new WeakMap();
function lureRelease() { for (const f of fishes.list) { octoPlayed.delete(f); const L = lureFx.get(f); if (L) L.played = false; if (L && L.s !== 'idle') { L.s = 'idle'; L.t = 0; L.cool = performance.now() + 1500; f.lureCalm = 0; f.retarget = 0.4 + Math.random(); } } }
let dragging = false;
// the finger picks a spot on the sand itself, on whichever level it touches (front floor, terrace or the back bank)
function movePlace(ev) { const r = rayFrom(ev).ray, h = raySand(r.origin, r.direction); if (h) { decor.move(h.x, h.z); updatePlaceOk(); } else if (r.intersectPlane(floor, hit)) { decor.move(hit.x, hit.z); updatePlaceOk(); } }
canvas.addEventListener('pointermove', (ev) => { if (lightHeld) { const at = toys.sandHit(rayFrom(ev).ray); if (at) toys.moveLight(at); return; } if (lure) { lure.x = ev.clientX; lure.y = ev.clientY; } if (play) playPoint(ev); else if (placing && dragging) movePlace(ev); });
addEventListener('pointerup', (ev) => {
  if (lightHeld) { lightHeld = false; toys.lightOff(); toys.armed = null; }
  dragging = false; const c = tapCand; tapCand = null;
  if (c && !play && performance.now() - c.t < 380 && Math.hypot((ev.clientX ?? c.x) - c.x, (ev.clientY ?? c.y) - c.y) < 14) { if (c.decor) decorMenu(c.decor); else setFocus(c.f === focus ? null : c.f); }
  if (lure?.on) { lureEnd = performance.now(); lureRelease(); } lure = null;
}); addEventListener('pointercancel', () => { if (lure?.on) lureRelease(); lure = null; tapCand = null; });
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
        const pk = await ui.pickFish({ title: 'Welcome to your tank', text: 'Raise a happy tank: care for each animal, discover what they do, and grow your aquarium together. Every tank starts with an octopus. Choose the color of yours, then give it a name.', species: FIRST_FISH, name: ['Biscuit', 'Nori', 'Coral', 'Fin', 'Pearl', 'Sunny', 'Dot', 'Misty'][(Math.random() * 8) | 0] });
        const r = await game.dispatch({ t: 'chooseFirst', species: pk.species, name: pk.name, pal: pk.pal, seed: (Math.random() * 90000) | 0 }); if (!r.ok && r.reason !== 'ALREADY_HAVE') fail(r); else sfx('arrive');
        await set(1);
      } else if (step === 1) {
        // first, the octopus itself: a few quiet seconds to watch it explore its new home, then one small thing to do with it (a finger held
        // on the glass, which it already comes to), and only then the food. Once per phone; a returning player goes straight to the snack.
        let met = navigator.webdriver && !/[?&]hello=1/.test(location.search); try { met ||= localStorage.getItem('ourtank.met') === '1'; } catch { /* none */ }      // (automated checks skip it unless they ask for it)
        if (!met) { ui.hideCoach(); ui.pulse(null); const nm = s.fish[0]?.name ?? 'Your octopus';
          await new Promise((r) => setTimeout(r, 9000));
          ui.showCoach({ title: 'Say hello', text: `Touch and hold the glass. ${nm} will come over to see who you are.`, skip: skip });
          const t0 = Date.now(); let held = 0; await new Promise((res) => { const iv = setInterval(() => { held = lure?.on ? held + 0.3 : 0; if (held >= 1.5 || Date.now() - t0 > 40000 || (game.state?.flags.tut ?? 0) !== 1) { clearInterval(iv); res(); } }, 300); });
          if (held >= 1.5) { ui.hideCoach(); ui.toast(`${nm} came to see you.`, 2600); await new Promise((r) => setTimeout(r, 3200)); }
          try { localStorage.setItem('ourtank.met', '1'); } catch { /* none */ }
          if ((game.state?.flags.tut ?? 0) !== 1) return; }
        ui.showCoach({ title: 'Time for a snack', text: `${s.fish[0]?.name ?? 'Your octopus'} is hungry. Open Care, tap Feed, then Feed on ${s.fish[0]?.species === 'octopus' ? 'its card: a crab drops in for it' : 'their card: the food drops in'}.`, skip: skip }); ui.pulse('care');
      } else if (step === 2) {
        ui.pulse(null);
        const share = game.shared ? `Your tank code is ${game.code}. Share it from the Crew tab so three friends can join.` : 'Up to four friends can care for one tank. Tap Invite in the Crew tab and they join with a six-character code.';
        ui.showCoach({ title: 'Better together', text: share, button: 'Got it', onButton: () => set(3), skip: skip });
      } else if (step === 3) {
        ui.showCoach({ title: 'A gift for the tank', text: 'You have a starter pack of free items. Open the Shop, pick a plant and slide it into place.', skip: skip }); ui.pulse('decorate');
      } else if (step === 4) {
        ui.pulse(null); ui.showCoach({ title: 'You are all set', text: 'Nicely done. Care for your fish and tap one any time to get to know it.', button: 'Show me what is coming', skipLabel: 'Done', skip: async () => { await set(5); ui.hideCoach(); }, onButton: async () => { await set(5); ui.hideCoach(); await new Promise((r) => setTimeout(r, 300)); await ui.dialog({ title: 'Coming up', lines: [...firstPromises(game.state, Date.now()), ...(game.shared ? [`Your tank code is ${game.code}. Share it from the Crew tab so friends can join.`] : [])], ok: 'See you soon' }); if (game.shared) offerNudges(); } });
      }
    } finally { busy = false; setTimeout(run, 0); }
  }
  const skip = () => { set(5); ui.hideCoach(); ui.pulse(null); };
  return {
    run,
    onFeed: () => { if ((game.state.flags.tut ?? 0) === 1) { endFeed(); ui.toast(`${game.state.fish[0]?.name ?? 'Your fish'} loved it!`); setTimeout(() => set(4), 1400); } },      // the first feed is one crab; the strip steps aside for what comes next      // the first session is short: choose, feed, then what is coming. Friends and the free plant wait in the goal line until later
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
let lastLamp = null, seenDecor = null;
// ── the nursery: the brood grows up in the tank; after five days any caretaker chooses the one that stays ──
const nurseryFx = new Nursery(stg.scene); window.__nursery = nurseryFx;
let readyShown = null;
const ROLE_LINE = { explore: 'roams all over the tank', plants: 'stays close to the plants', social: 'keeps near its family' };
async function openNursery(auto = false) {
  const N = game.state?.nursery; if (!N || $('modal').classList.contains('on')) { if (auto && N && readyShown === N.id) readyShown = null; return; }      // (something else was on screen: the choice comes up again on the next check)
  const day = (ts) => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }), who = (c) => `${c.name} · ${c.sex === 'm' ? 'a little male' : 'a little female'} · ${(c.traits ?? []).join(', ').toLowerCase() || 'still finding its way'}${ROLE_LINE[babyRole(N, c)] ? ' · ' + ROLE_LINE[babyRole(N, c)] : ''}`;
  const parents = `Born ${day(N.born)} to ${N.pa?.name ?? 'their father'} and ${N.ma?.name ?? 'their mother'}.`;
  if (game.now() < N.readyAt) { const d = Math.min(5, Math.floor((game.now() - N.born) / 864e5) + 1); return ui.dialog({ title: 'The nursery', text: `${N.n} baby seahorses, day ${d} of 5. ${parents} ${N.fed ? `They have been fed ${N.fed === 1 ? 'once' : N.fed + ' times'} so far, and catch the tiniest bits themselves. ` : 'They catch the tiniest bits of food themselves. '}Three of them you can already tell apart:`, lines: N.cands.map(who), ok: 'Lovely' }); }
  const pick = await ui.choose({ title: "THEY'RE READY", text: `Your baby seahorses are ready to leave the nursery. Choose one to stay in your aquarium. ${parents}`, options: N.cands.map((c) => ({ label: who(c), value: c.id })), cancel: 'Not yet' });
  if (!pick) return; const c = N.cands.find((x) => x.id === pick); if (!c) return;
  const sure = await ui.dialog({ title: `Keep ${c.name}?`, text: `${c.name} will stay in your aquarium for good. The other babies will swim off to new homes.`, ok: `Keep ${c.name}`, cancel: 'Go back' });
  if (!sure) return openNursery();
  const r = await game.dispatch({ t: 'keepBaby', nursery: N.id, baby: c.id });
  if (!r.ok) { if (r.reason === 'TANK_FULL') ui.dialog({ title: 'No room yet', text: 'The tank is full. When there is room for one more, choose then: the babies will wait.', ok: 'OK' }); else if (r.reason === 'NOT_FOUND') ui.toast('Someone has already chosen a baby to keep.'); else fail(r); }
}
function nurseryCheck() {      // the moment they are ready, once a session: the choice comes up by itself
  const N = game.state?.nursery; if (!N || game.now() < N.readyAt || readyShown === N.id || ui?.tab !== 'tank' || $('modal').classList.contains('on')) return;
  readyShown = N.id; setTimeout(() => openNursery(true), 1500);
}
function syncWorld() {
  const s = game.state; if (!s) return;
  fishes.me = game.you?.userId ?? 'me'; fishes.people = game.shared ? (game.online ?? []) : []; fishes.sync(s, { arrivals: [...pendingArrivals] }); pendingArrivals.clear(); nurseryFx.set(s, fishes); nurseryCheck();
  decor.sync(s.decor, s);
  { const ids = new Set(s.decor.map((d) => d.id)); if (seenDecor) for (const d of s.decor) if (!seenDecor.has(d.id)) { const sp = decor.spots().find((x) => x.id === d.id); if (sp) fishes.investigate(sp); } seenDecor = ids; }       // an octopus goes to look at anything new
  const lp = decor.lamp(); lastLamp = lp; stage.lantern = lp ? 1 : 0;
  if (lp) { lamp.position.copy(lp); halo.position.set(lp.x, lp.y, lp.z + 0.8); pool.position.set(lp.x - 0.4, 0.14, lp.z - 0.2); }
  env.setStyle(s.style?.floor, s.style?.backdrop); syncGlass(); syncDrift(); syncExtras(); ui?.refresh(); tut.run();
}
setInterval(() => { if (game.state) decor.grow(game.state); }, 30000);
// the daily gift: it is offered once, as a small celebration in the middle of the screen, when the tank is open and nothing else is going on
let giftBusy = false, giftOffered = 0;
async function offerGift() {
  if (giftBusy) return; giftBusy = true; giftOffered = Date.now();
  try {
    const n = game.shared ? game.members?.length ?? 1 : 1;
    await ui.celebrate({ title: 'A gift for you', amount: DAILY_GIFT, why: n > 1 ? `A small gift each day for the tank, for whoever comes by first. Thank you for looking after it.` : 'A small gift each day for looking after the tank. Spend it on fish and decorations.', ok: 'Claim' });
    const r = await game.dispatch({ t: 'dailyGift', tz: -new Date().getTimezoneOffset() }); game.giftTried = Date.now();
    if (r.ok && (r.delta ?? 0) > 0) { sfx('reward'); moment({ shells: r.delta, from: [window.innerWidth / 2, window.innerHeight * 0.45] }); } else if (r.ok) ui?.toast("Today's gift is already collected", 3000); else fail(r);
    ui?.updateHeader();
  } finally { giftBusy = false; }
}
let heldChapters = [], tipsDoneAt = 0, sawTips = false;
function maybeGift() {
  return;      // (the day's gift now comes with the daily mystery: no box of its own)
  const s = game.state; if (!s || giftBusy || (s.flags.tut ?? 0) < 5 || heldChapters.length || (tipsDoneAt && Date.now() - tipsDoneAt < 45e3) || Date.now() - giftOffered < 60e3 || (game.giftTried && Date.now() - game.giftTried < 20 * 3600e3)) return;
  if (nurseryFx.going || fishes.list.some((f) => f.birthT > 0)) return;      // (a birth or the babies' send-off on screen: the gift waits)
  if (ui?.tab !== 'tank' || focus || play || placing || feedMode || cleanMode || wc.active || $('modal').classList.contains('on') || $('reunion').classList.contains('on') || $('coach').classList.contains('on') || document.hidden) return;
  if (giftReady(s, game.you?.userId ?? 'me', game.now(), -new Date().getTimezoneOffset())) { const tryGift = () => { if (wbPending || $('reunion').classList.contains('on')) return setTimeout(tryGift, 1500); if (!$('modal').classList.contains('on')) offerGift(); }; setTimeout(tryGift, 1200); }      /* (after the welcome-back note has been read, never on top of it) */
  else giftOffered = Date.now();
}
let lastLive = 0, advSig = null; game.on('tick', () => { ui?.updateHeader(); maybeSettle(); maybeGift(); if ((game.state?.nursery?.id ?? null) !== nurseryFx.id) syncWorld(); nurseryCheck();      /* a birth or a choice that came with time passing, not with an action */ if ((ui?.tab === 'today' || ui?.tab === 'care') && Date.now() - lastLive > 15000) { lastLive = Date.now(); ui.refresh(); } if (focus && !play && !focus.dead && Date.now() - lastCard > 4000) { lastCard = Date.now(); showCard(focus); } fishes.sync(game.state); { const st = game.state, sig = st ? (st.keeps ?? []).map((k) => `${k.id}:${k.x}:${k.z}`).join() + '|' + st.decor.map((d) => `${d.x}:${d.z}`).join() : ''; if (sig !== advSig) { advSig = sig; if (st) decor.sync(st.decor, st); } }      /* (a keepsake brought home, or something an adventure moved, while time passed) */ }).on('state', syncWorld).on('members', () => ui?.refresh()).on('journal', () => ui?.refresh());
game.on('toast', (m) => ui?.toast(m, 3200));
game.on('levelup', (lv) => {
  moment({ at: new THREE.Vector3(0, 6, 1), haptics: 30 });
  /* the level-up is a moment in the tank itself: everyone swims up to the glass, bubbles rise, and a banner names what opened */
  let i = 0; for (const f of fishes.byId.values()) { if (!f.pos || !f.target) continue; const x = ((i++ % 7) - 3) * 1.4; f.target.set(x, 6 + (i % 3), 2.2); f.retarget = 4; }
  for (let k = 0; k < 6; k++) setTimeout(() => fishes.burst(new THREE.Vector3((k - 2.5) * 2, 1, 1.2)), k * 180);
  const ban = document.createElement('div'); ban.className = 'lvban';
  const P = LEVEL_PRIZE[lv];
  ban.innerHTML = `<small>THE TANK GREW</small><b>Level ${lv}</b><span>${P ? (P.kind === 'play' ? 'New way to play: ' : 'New animals: ') + P.title : 'Your care made the tank grow'}</span>`;
  document.body.appendChild(ban); setTimeout(() => ban.classList.add('off'), 4200); setTimeout(() => ban.remove(), 5000);
  const fresh = [...Object.values(SPECIES_DEF).filter((d) => d.level === lv).map((d) => d.label), ...Object.values(TOYS).filter((T) => T.unlock === lv).map((T) => T.label + ' (Toy box)'), ...Object.values(DECOR_DEF).filter((d) => d.level === lv).map((d) => d.label)];
  ui?.toast(`Tank level ${lv}!`, 3000);
  const prepared = lv === 8 && (game.state?.goalsDone ?? []).some((g) => g.id === 'sanctuary');      /* (the sanctuary goal finished at level 7: the tank is ready for its first turtle) */
  if (fresh.length && !$('modal').classList.contains('on')) setTimeout(() => ui?.dialog({ title: prepared ? 'Level 8: the sanctuary is ready' : `Level ${lv}`, text: prepared ? `Your tank is prepared: a ledge to sleep under, sea grass to graze. ${LEVEL_PRIZE[lv].text}. New for you:` : LEVEL_PRIZE[lv] ? `${LEVEL_PRIZE[lv].text}. New for you:` : `New for you:`, lines: fresh.length > 5 ? [...fresh.slice(0, 5), `and ${fresh.length - 5} more`] : fresh, ok: 'Nice' }), 5200);
});
game.on('arrival', (ids) => { sfx('arrive'); ui?.hush(10000);      // a new arrival gets the screen to itself for a moment: tips and toasts wait
  for (const id of ids) { const f = fishes.byId.get(id); if (f) { f.pos.set((rng() - 0.5) * 4, 13.5, 1.4); f.target.set(f.pos.x, 8, 1.4); f.retarget = 3; fishes.burst(f.pos); } else pendingArrivals.add(id); } spotlightFish(ids[0], 4200, 1800); });
game.on('placed', () => tut.onPlaced());
game.on('nudged', (from, why, name) => { sfx('arrive'); ui?.toast(`${from} says ${({ octo: `${name ?? 'your octopus'} is hungry`, feed: 'the fish are hungry', glass: 'the glass needs a wipe', water: 'the water needs changing' })[why] ?? 'the tank could use you'}`, 4200); });
game.on('crab', (id) => { fishes.dropCrab(id); });
{ let told = false; game.on('state', () => { const s = game.state; if (told || !s || (s.flags.tut ?? 0) < 5 || s.goal || !(s.goalOffer ?? []).length || (s.goalsDone ?? []).length) return; told = true; try { if (localStorage.getItem('ourtank.goalTip')) return; localStorage.setItem('ourtank.goalTip', '1'); } catch { return; } setTimeout(() => ui?.toast('Your tank has goals now. Tap the bell to choose one.', 5200), 4000); }); }      // the first time goals are on offer, once
// a decision, seen in the tank: the chased fish slips into the plants, the one given a time out slows down, the octopus heads for its den or the glass
game.on('dilemmaDone', ({ kind, k, fish }) => { const [x, y] = (fish ?? []).map((id) => fishes.byId.get(id)), plant = (game.state.decor ?? []).find((d) => DECOR_DEF[d.type]?.cat === 'PLANTS'), den = (game.state.decor ?? []).find((d) => ['coconut', 'pot'].includes(d.type));
  const go = (f, px, py, pz, s = 6) => { if (!f || f.dead) return; f.target?.set(px, py, pz); f.retarget = s; };
  if (kind === 'chase' && k === 'cover' && y && plant) { go(y, plant.x, 1.6, plant.z, 10); spotlightFish(y.fid, 3000, 300); }
  else if (kind === 'chase' && k === 'time' && x) { x.vigor = 0.55; setTimeout(() => { x.vigor = 1; }, 120e3); spotlightFish(x.fid, 2600, 300); }
  else if (kind === 'lid' && x) { if (k === 'lid' && den) go(x, den.x, 0.8, den.z, 12); else if (k === 'let') x.glassAt = { x: 0, y: 3, until: performance.now() + 6000 }; spotlightFish(x.fid, 2800, 300); }
  else if (kind === 'den' && x && den) { go(k === 'y' ? y : x, den.x, 0.8, den.z, 12); }
  else if (x) { fishes.burst(x.pos); } });
// ── new life: a seahorse father carrying young, eggs laid. Each one is told once on every phone, with a photo of the parent: when it happens if
// the tank is open, otherwise the next time it is opened (after the replay). The journal keeps the line; this is the moment to go and look. ──
const lifeSeen = (() => { try { return new Set(JSON.parse(localStorage.getItem('ourtank.lifeSeen') || '[]')); } catch { return new Set(); } })(); let lifeBusy = false, lifeNext = 0;
function lifeCheck() {
  const s = game.state; if (!s || lifeBusy || Date.now() < lifeNext || document.hidden || (s.flags?.tut ?? 0) < 5 || (window.__quietUntil && Date.now() < window.__quietUntil)) return;
  const name = (id) => s.fish.find((f) => f.id === id)?.name, days = (at) => Math.max(1, Math.round((at - Date.now()) / 864e5)), out = [];
  for (const f of s.fish) if (f.preg && !f.dead && !f.preg.ready) out.push({ key: 'p' + f.id + ':' + f.preg.start, fish: f.id, title: `${f.name} is expecting`, why: `Seahorse fathers carry the young. ${f.name}${name(f.preg.mother) ? ` and ${name(f.preg.mother)}` : ''}'s babies come in about ${days(f.preg.due)} day${days(f.preg.due) > 1 ? 's' : ''}. Be there when they are born.` });
  for (const e of s.eggs ?? []) if (!e.ready) { const a = name(e.a), b = name(e.b), octo = e.species === 'octopus'; out.push({ key: 'e' + e.id, fish: octo ? e.a : e.guard ?? e.a, title: octo ? `${(a ?? 'SHE').toUpperCase()} LAID EGGS` : `${a && b ? `${a.toUpperCase()} AND ${b.toUpperCase()}` : 'THE FISH'} HAVE EGGS`, why: octo ? `Strings of tiny eggs hang from the roof of her den. She will guard them for about ${days(e.hatchAt)} days; be there when they hatch.` : `They hatch in about ${days(e.hatchAt)} day${days(e.hatchAt) > 1 ? 's' : ''}, and wait for someone to watch.` }); }
  // the other big things, told the same way: babies born, a baby grown up, the octopus out exploring or back (a very sick animal and a death have their own cards: sickCheck, mournCheck)
  const recent = (at) => at && Date.now() - at < 3 * 864e5;
  for (const f of s.fish) { if (f.dead) continue; const bred = f.parents?.length || f.bornHere;
    if (bred && recent(f.hatched ?? f.born) && stageOf(f) === 'baby') out.push({ key: 'b' + (f.preg?.start ?? '') + f.id, fish: f.id, icon: '🐣', title: `${f.name} was born`, why: `A new ${(SPECIES_DEF[f.species]?.label ?? 'fish').toLowerCase()} in your tank${f.parents?.length ? `, child of ${f.parents.map((p) => p.name).join(' and ')}` : ''}. How you raise it decides who it becomes.` });
    if (bred && stageOf(f) === 'adult' && recent(f.born + ADULT_DAYS * 864e5)) out.push({ key: 'a' + f.id, fish: f.id, icon: '🌟', title: `${f.name} is all grown up`, why: f.raisedAs ? `Raised ${f.raisedAs.toLowerCase()}, the way you brought it up.` : 'From an egg to a grown fish, in your tank.' });
    if (f.species === 'octopus' && f.away && !f.away.inTank) out.push({ key: 'o' + f.id + ':' + (f.away.at ?? ''), fish: null, icon: '🐙', title: `${f.name} snuck out`, why: `${f.name} climbed out over the top of the tank and is off exploring. Octopuses come back when they are ready: keep an eye on the lid.`, look: 'OK' }); }
  for (const h of (s.adv?.hist ?? []).filter((x) => x.fish && x.end && recent(x.end)).slice(-1)) { const o = s.fish.find((f) => f.id === h.fish && !f.dead && !f.away); if (o) out.push({ key: 'r' + h.id, fish: o.id, icon: '🐙', title: `${o.name} is back`, why: `${o.name} came home from its adventure.${(s.keeps ?? []).some((k) => k.adv === h.id) ? ' It brought something back: look on the sand by its den.' : ''}` }); }
  const n = out.find((x) => !lifeSeen.has(x.key)); if (!n) return;
  lifeSeen.add(n.key); try { localStorage.setItem('ourtank.lifeSeen', JSON.stringify([...lifeSeen].slice(-60))); } catch { /* storage unavailable */ }
  const f = n.fish ? fishes.byId.get(n.fish) : null; let img = null; try { img = f && !f.dead && f.group.visible ? shootAt({ at: f.pos.clone(), r: f.radius, who: [f.group] }) : null; } catch { /* a photo is a nicety */ }
  lifeBusy = true; ui.newLife({ title: n.title, why: n.why, img, icon: n.icon ?? '🥚', look: n.look ?? 'Go and see' }).then((go) => { lifeBusy = false; lifeNext = Date.now() + 30e3; if (go && f && !f.dead) setFocus(f); });      // (one card at a time, half a minute apart: coming back to several, they do not pile up)
}
game.on('state', () => setTimeout(lifeCheck, 1500)); setInterval(lifeCheck, 5000);
// ── the lid: now and then a curious octopus goes up and tests the lid with its arms (explorers and tricksters most, homebodies hardly ever).
// It is a real behavior, reported once an hour at most by the phone that runs the animals, and a lid decision can only come from it. ──
const LID_NATURE = { explorer: 1, trickster: 1, showoff: 0.6, watcher: 0.35, collector: 0.3, homebody: 0.1 };
setInterval(() => { const s = game.state; if (!s || document.hidden || !isDirector() || (s.flags?.tut ?? 0) < 5 || play || (window.__quietUntil && Date.now() < window.__quietUntil)) return;
  const kept = (s.adv?.lidUntil ?? 0) > Date.now(); for (const rec of s.fish) {      /* (a weighted lid: it tries far less) */ if (rec.species !== 'octopus' || rec.dead || rec.away || rec.brood || rec.seek || rec.puzzle || stageOf(rec) === 'baby') continue;
    const f = fishes.byId.get(rec.id); if (!f || f.dead || f.glassAt || f.task || f.st?.s === 'work' || f.st?.s === 'jet') continue; const M = octoMind(rec), w = (LID_NATURE[M.type] ?? 0.3) * (0.5 + M.cur) * (kept ? 0.2 : 1);
    const omen = s.omen?.kind === 'lid' && s.omen.fish?.[0] === rec.id; if (Math.random() > (omen ? 0.35 : 0.035 * w)) continue;      /* (about once an hour of watching for an explorer; often while it is building up to a decision) */
    f.glassAt = { x: f.pos.x, y: 12, lid: true, until: performance.now() + 9000 }; setTimeout(() => { if (!f.dead && f.glassAt?.lid) { fishes.puff?.(f.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), new THREE.Vector3(0, 1, 0)); game.dispatch({ t: 'octoLid', fish: rec.id }).catch?.(() => {}); } }, 5500); break; } }, 30000);
// before a decision is asked, the tank shows it for a day: the octopus reaching up to the lid, the chasing, the pale one keeping low, two at one den
setInterval(() => { const s = game.state, O = s?.omen; if (!O || document.hidden || Date.now() - O.at > 2.5 * 864e5 || (s.dilemma && !s.dilemma.done)) return;
  const [x, y] = (O.fish ?? []).map((id) => fishes.byId.get(id)), go = (f, px, py, pz, k = 6) => { if (!f || f.dead || !f.target) return; f.target.set(px, py, pz); f.retarget = k; }, den = (s.decor ?? []).find((d) => ['coconut', 'pot'].includes(d.type));
  if (O.kind === 'lid' && x) go(x, Math.max(-3, Math.min(3, x.pos.x)), 9.2, -1.5, 8);
  else if (O.kind === 'chase' && x && y) { go(x, y.pos.x, y.pos.y, y.pos.z, 4); go(y, y.pos.x + (y.pos.x > 0 ? -3.5 : 3.5), Math.max(1.5, y.pos.y), y.pos.z, 4); }
  else if (O.kind === 'sick' && x) { go(x, x.pos.x, 0.9, -2.4, 10); x.vigor = 0.6; setTimeout(() => { if (x) x.vigor = 1; }, 8000); }
  else if (O.kind === 'den' && den) { go(x, den.x + 0.4, 0.9, den.z, 8); go(y, den.x - 0.4, 0.9, den.z, 8); } }, 9000);
game.on('goalStep', () => { haptic(16); sfx('reward'); ui?.updateHeader(); const q = $('bell'); q?.classList.add('pulse'); setTimeout(() => q?.classList.remove('pulse'), 1600); });
game.on('goalDone', async (id) => { const d = (game.state.goalsDone ?? []).find((x) => x.id === id) ?? game.state.goalsDone?.at(-1); moment({ at: new THREE.Vector3(0, 5, 1.2), haptics: 30 }); await ui.celebrate({ title: 'Goal complete', amount: GOAL_SHELLS, why: `${d?.title ?? 'Goal'} done.${d?.prize ? ` The ${d.prize} is yours: find it under Shop, Style.` : ''}`, ok: 'Choose the next goal', icon: '🎯' }); ui.goalSheet(); });
game.on('puzzle', (id) => { const f = fishes.byId.get(id); moment({ at: f?.pos, haptics: 16 }); if (f) { f.flush = 1; spotlightFish(id, 3600, 1200); } });
game.on('together', () => { moment(); for (const f of fishes.list) if (!f.dead) { fishes.burst(f.pos); f.vigor = Math.max(f.vigor ?? 1, 1.25); f.flush = Math.max(f.flush ?? 0, 0.5); } ui?.toast('Fed together! The fish are delighted.', 3200); });
// a chapter reached during the first tips waits until they are done, then shows on its own: one thing at a time on a new player's screen
const showChapter = (c) => { moment({ at: new THREE.Vector3(0, 5, 1.2) }); ui?.chapter(c); };
game.on('chapter', (c) => { if ((game.state?.flags.tut ?? 5) < 5) heldChapters.push(c); else showChapter(c); });
setInterval(() => { const t = game.state?.flags.tut ?? 0; if (t < 5) { sawTips = true; return; } if (sawTips && !tipsDoneAt) tipsDoneAt = Date.now();      /* (only a player who just went through the tips gets the quiet minute) */ if (heldChapters.length && Date.now() - tipsDoneAt > 4000 && !$('modal').classList.contains('on') && !$('coach').classList.contains('on')) showChapter(heldChapters.shift()); }, 1000);
// the practical side of its card: when it last ate, when it will be hungry again, how it is doing, and who looks after it
function careRows(rec) {
  const s = game.state, own = rec.species === 'octopus' || rec.species === 'seahorse', food = rec.species === 'octopus' ? 'crab' : rec.species === 'seahorse' ? 'mysis' : 'meal', last = own ? rec.fedAt : s.lastFed, next = dueIn(s, food, rec);
  const r = (k, v) => (v ? `<div class="ir"><span>${k}</span><b>${v}</b></div>` : ''), when = (ms) => (ms < 60e3 ? 'now' : ms < 3600e3 ? `in ${Math.round(ms / 60e3)} min` : `in about ${Math.round(ms / 3600e3)} h`);
  const ago2 = (ts) => { const m = (Date.now() - ts) / 60e3; return m < 1 ? 'just now' : m < 60 ? `${Math.round(m)} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`; };
  const bond = Math.min(1, (rec.bond?.[game.you?.userId ?? 'me'] ?? 0) / 15);
  return r('Last fed', Number.isFinite(last) ? ago2(last) : 'Not yet') + r('Hungry again', next > 0 ? when(next) : 'Now: it would love a meal') + r('Eats', { crab: 'Crabs, from its own caretaker', mysis: 'Mysis shrimp, from its own caretaker', meal: 'Flakes and treats from anyone' }[food]) + r('Bond with you', bond >= 0.9 ? 'Best friends' : bond >= 0.5 ? 'Close' : bond >= 0.2 ? 'Warming up' : 'Just met');
}
// who it is close to, with the numbers behind it: a partner (and since when, and how often they greet), or how far along two are in getting to know each other
function bondLines(rec, now, LOG = {}) {
  const S = game.state, nm = (id) => S.fish.find((x) => x.id === id)?.name, d = (ms) => Math.max(1, Math.floor(ms / 864e5)), octoF = rec.species === 'octopus';
  const mateId = octoF ? rec.partner : rec.mate, since = octoF ? rec.partneredAt : rec.pairedAt;
  if (mateId && nm(mateId)) {
    const o = S.fish.find((x) => x.id === mateId), same = !octoF && sexOf(o) === sexOf(rec);
    const kind = octoF ? 'Partner' : same ? 'Companion' : 'Partner', note = octoF ? 'They touch arms and share a den. Octopuses rarely let anyone this close.' : same ? `Two ${sexOf(rec) === 'm' ? 'males' : 'females'}: they dance and hold tails every morning, but will not have babies.` : 'They greet each other every morning. Seahorses pair for life.';
    const days = d(now - (since ?? now));
    return `<div class="trust bond"><span>${msIcon('friend', true, 14)} ${kind}</span><b>${esc(nm(mateId))}</b><small>Together ${days} day${days === 1 ? '' : 's'}${!octoF && LOG.greets ? ` · ${LOG.greets} morning dance${LOG.greets === 1 ? '' : 's'}` : ''}. ${note}</small></div>`;
  }
  const B = octoF ? S.octoBonds : S.bonds, need = (octoF ? OCTO_PAIR_DAYS : SEA.PAIR_DAYS) * 864e5;
  const best = Object.entries(B ?? {}).filter(([k]) => k.split('|').includes(rec.id)).sort((x, y) => y[1] - x[1])[0];
  if (best && best[1] > 0) { const other = best[0].split('|').find((x) => x !== rec.id), o = S.fish.find((x) => x.id === other); if (o) { const pc = Math.min(99, Math.round(best[1] / need * 100)), same = !octoF && sexOf(o) === sexOf(rec);
    return `<div class="trust bond"><span>${msIcon('friend', false, 14)} Getting to know</span><b>${esc(o.name)} · ${pc}%</b><i class="bbar"><em style="width:${pc}%"></em></i><small>${octoF ? 'Tasting each other with their suckers, still a little wary.' : same ? 'Both ' + (sexOf(rec) === 'm' ? 'male' : 'female') + ': if they bond, they will be companions, not parents.' : 'A male and a female: if they bond, they could raise a family.'}</small></div>`; } }
  return '';
}
// a few words on the life it had, for the goodbye
function lifeSummary(x) { const out = [], kids = childrenOf(game.state, x.id).length, pal = x.friend;
  if (x.traits?.length) out.push(`${x.traits.slice(0, 2).join(' and ')} by nature`); if (pal) out.push(`best friends with ${pal}`); if (kids) out.push(`raised ${kids} young`); if (x.elder) out.push('lived to be an elder');
  return out.length ? out.join(', ').replace(/^./, (c) => c.toUpperCase()) + '.' : null; }
// A death is never missed: every one in the tank's memorial that this phone has not shown yet (here, on another phone, or while nobody was
// looking) gets the card in the middle of the screen, once. Deaths from before this phone ever checked are not brought up again.
let mourning = false;
async function mournCheck() {
  const s = game.state; if (!s || mourning || !ui) return; const key = 'ourtank.mourned', now = game.now();
  let seen; try { seen = JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { seen = null; }
  const tag = (x) => `${x.id}:${x.died}`, all = s.memorial ?? [];
  if (!Array.isArray(seen)) { seen = all.filter((x) => now - x.died > 2 * 864e5).map(tag); try { localStorage.setItem(key, JSON.stringify(seen)); } catch { /* ignore */ } }
  const fresh = all.filter((x) => !seen.includes(tag(x)) && now - x.died < 14 * 864e5); if (!fresh.length) return;
  mourning = true;
  try {
    for (const x of fresh) {
      seen.push(tag(x)); try { localStorage.setItem(key, JSON.stringify(seen.slice(-60))); } catch { /* ignore */ }
      const fl = (game.state.floaters ?? []).find((z) => z.id === x.id), who = x.ownerName ?? game.members?.find((m) => m.id === x.owner)?.name ?? null;
      const r = await ui.mourn({ name: x.name, species: x.species, pal: x.pal ?? null, days: Math.max(1, Math.round((x.died - x.born) / 864e5)), who: game.shared ? who : null, canRest: !!fl, oldAge: !!(x.oldAge || fl?.oldAge), life: lifeSummary(x) });
      if (r === 'rest' && (game.state.floaters ?? []).some((z) => z.id === x.id)) { const d = await game.dispatch({ t: 'scoop', id: x.id }); if (d.ok && d.applied) { sfx('tap'); haptic(10); } }
    }
  } finally { mourning = false; }
}
game.on('state', () => setTimeout(mournCheck, 600));
// (unused now: an unwell animal is shown in Care and the Tank chart, never as a pop-up) An animal in a critical state got a card, once per spell of illness on this phone, with the care that saves it
let warning = false;
async function sickCheck() {
  const s = game.state; if (!s || warning || mourning || !ui) return; const key = 'ourtank.sickSeen', me = game.you?.userId;
  let seen; try { seen = JSON.parse(localStorage.getItem(key) ?? '[]'); } catch { seen = []; }
  const ill = s.fish.filter((f) => !f.dead && (f.ail ?? 0) >= AIL_WARN), keep = seen.filter((id) => ill.some((f) => f.id === id));      // (one that got better can warn again next time)
  const f = ill.find((x) => !keep.includes(x.id)); if (keep.length !== seen.length) try { localStorage.setItem(key, JSON.stringify(keep)); } catch { /* ignore */ }
  if (!f) return; keep.push(f.id); try { localStorage.setItem(key, JSON.stringify(keep)); } catch { /* ignore */ }
  const own = ownFood(f), hungry = own ? ownHunger(f) > 0.25 : s.hunger > 0.25, dirty = s.water < 0.7, mine = !own || canFeedOwn(f, me, game.shared);
  const acts = [...(hungry && mine ? [{ label: own === 'crab' ? `Give ${f.name} a crab` : own === 'mysis' ? `Give ${f.name} shrimp` : 'Feed the fish', value: 'feed' }] : []), ...(dirty ? [{ label: 'Change the water', value: 'water' }] : [])];
  const why = hungry && dirty ? `${f.name} has gone too long without food and clean water.` : hungry ? `${f.name} has gone too long without food.` : dirty ? `The water is too dirty for ${f.name}.` : `${f.name} has been neglected for days.`;
  const who = hungry && !mine ? ` Only ${f.ownerName ?? 'its caretaker'} can feed it: give them a nudge.` : '';
  warning = true;
  try {
    const r = await ui.sick({ name: f.name, species: f.species, pal: f.pal ?? null, why: why + who, acts: acts.length ? acts : [{ label: 'Look after the tank', value: 'care' }] });
    if (r === 'feed') { game.feedFood = own ?? 'flakes'; game.feedFor = own ? f.id : null; ui.open('tank'); feedGo(); }
    else if (r === 'water') { ui.open('tank'); changeWater(); } else if (r === 'care') ui.open('care');
  } finally { warning = false; }
}
// (no pop-up for an unwell animal: it would cover the tank. Care's to-do list, the Care tab's dot and the Tank chart's best next step say it, calmly)
game.on('died', (id) => {                         // a quiet beat, not an alarm: the light dims, the others slow down and stay near
  const f = fishes.byId.get(id), name = f?.name ?? 'A fish'; ui?.farewell(name); stg.stage.settle = 1; setTimeout(() => { stg.stage.settle = 0; }, 9000);
  for (const o of fishes.list) if (o !== f && !o.dead) { o.mul = 0.6; setTimeout(() => { if (o.mul === 0.6) o.mul = 1; }, 9000); }
});
game.on('theme', () => { moment({ at: new THREE.Vector3(0, 5, 1.2) }); });
let seenOnline = null; const lastSeenOnline = new Map();
game.on('members', () => {                                                    // a friend arrives: a greeting, and their favorite fish swims over to the glass
  if (!game.shared) return; const now = new Set(game.online ?? []); if (seenOnline) for (const id of now) if (!seenOnline.has(id) && id !== game.you?.userId) {
    const m = game.members?.find((x) => x.id === id); if (!m || Date.now() - (lastSeenOnline.get(id) ?? 0) < 10 * 60e3) continue; ui?.toast(`${m.name} is in the tank`, 3200); sfx('arrive');
    const fav = game.state?.fish.map((f) => ({ f, b: f.bond?.[id] ?? 0 })).sort((a, b) => b.b - a.b)[0]; const fish = fav && fav.b > 0 ? fishes.byId.get(fav.f.id) : null; if (fish) { fish.target.set((Math.random() - 0.5) * 2.5, Math.max(1, Math.min(9, fish.pos.y)), 2.5); fish.retarget = 5; fishes.burst(fish.pos); }
  } for (const id of seenOnline ?? []) if (!now.has(id)) lastSeenOnline.set(id, Date.now()); seenOnline = now;      // (someone who just stepped away and came back is not greeted again)
});
game.on('grew', (id) => { const f = fishes.byId.get(id); if (f) { moment({ at: f.pos, haptics: 25 }); spotlightFish(id, 3200, 500); } });
game.on('surprise', (x) => { if (!x?.fish) return; setTimeout(() => ui?.surprise(x.text), 300); spotlightFish(x.fish, 4200, 1200); sfx('arrive'); });
game.on('teamGlow', (text) => { setTimeout(() => ui?.together(String(text ?? 'You both looked after the tank today.').replace(/ It glows tonight\.$/, ' The tank glows tonight.')), 400); glowT = 0; });      // the day's surprise: a close look at whoever it happened to
game.on('discovery', (id) => { const f = fishes.byId.get(id); if (f) { moment({ at: f.pos, shells: 2 }); spotlightFish(id, 3000, 600); } });
game.on('remoteFeed', (x, by, food, fish) => { if (food === 'crab') { fishes.dropCrabAt(x, fish); ui?.toast(`${nameOf(by)} fed ${game.state.fish.find((f) => f.id === fish)?.name ?? 'their octopus'} a crab`); } else { fishes.drop(x, 7, food); ui?.toast(food === 'mysis' ? `${nameOf(by)} fed ${dropWord('mysis').replace('mysis shrimp for ', '')} mysis shrimp` : `${nameOf(by)} fed the fish`); } sfx('splash'); });
game.on('remoteActivity', (a) => { if (a.userId !== game.you?.userId) { ui?.flag('friends', true); if (a.type === 'visitor' || a.type === 'morph' || a.type === 'goal' || (a.type === 'bottle' && !/found a bottle/.test(a.text ?? ''))) ui?.toast(a.text); }      /* (the sender hears from their own phone that it was found) */ ui?.refresh(); });
game.on('thanks', (text) => { sfx('arrive'); ui?.toast(text, 3600); });
game.on('chat', (m) => { if (m.userId !== game.you?.userId) { ui?.toast(`${m.name}: ${m.text}`); ui?.flag('friends', true); } ui?.refresh(); });
fishes.onEat = () => { sfx('eat'); }; fishes.onDance = () => { if (!document.hidden) sfx('click'); };

// a quiet counter for 'watch your fish swim for 15 seconds': the tank is on screen, nothing is being done to it, and it is visible
let watchT = 0; const dayKey = () => Math.floor(Date.now() / 864e5);
function watchTick(dt) {
  const d = game.state?.daily; if (!d || d.done || d.kind !== 'watch') { watchT = 0; return; }
  if (document.hidden || focus || placing || feedMode || cleanMode || rearrange || ui?.tab !== 'tank' || !fishes.list.some((f) => !f.dead)) { watchT = Math.max(0, watchT - dt); return; }
  watchT += Math.min(dt, 0.1); if (watchT >= 15) { watchT = -1e9; game.observe({ key: 'watch' }); }
}
document.addEventListener('visibilitychange', () => game.track(document.hidden ? 'hidden' : 'visible'));
// ── one tank, several phones: a single phone (the director) decides where the fish go and when a memory passes; the others follow it ──
const netFish = new Map(); let lastSnapSent = 0, simAt = 0;      /* simAt: when the animals were last moved here (a snapshot is stamped with it, not with when it is sent) */ window.__netFish = netFish;
function isDirector() { return !game.shared || game.director === true; }
const r2 = (v) => Math.round(v * 100) / 100;
// what the lead phone shares besides where each fish is: its swim rhythm, and for an octopus the whole pose (resting, crawling, working a jar, greeting, tucked in, color, chewing…)
// a seahorse in one short string for the other phones: its state, where each eye looks, its color (how much, and of what), the greeting's glow,
// a count of its strikes (so each phone plays each strike once), and the thickness and lean of what it holds (so its coil fits the same stem)
// a seahorse's own counts on its card: what is saved plus what has happened since the last report; a count shows only once it has really happened
// what an animal has really done: what the server has from its log, plus what has happened here since the last report
function lifeTotals(LOG, f, live) {
  const cnt = (k, fk) => (LOG[k] ?? 0) + Math.max(0, (f?.[fk] ?? 0) - (live?.[k] ?? f?.[fk] ?? 0)), d = f?.memDelta, hitch = {};
  for (const [id, h] of Object.entries(LOG.hitch ?? {})) hitch[id] = [h[0] ?? 0, h[1] ?? 0];
  for (const [id, v] of Object.entries(d?.secs ?? {})) (hitch[id] ||= [0, 0])[0] += v;
  for (const [id, v] of Object.entries(d?.visits ?? {})) (hitch[id] ||= [0, 0])[1] += v;
  const lv = { ...(LOG.lv ?? {}) }; for (const [k, v] of Object.entries(live?.lv ?? {})) lv[k] = (lv[k] ?? 0) + v;
  return { hitch, fav: LOG.fav ?? f?.favHold ?? null, meals: cnt('meals', 'meals'), strikes: cnt('strikes', 'strikesN'), greets: cnt('greets', 'greets'), links: cnt('links', 'linksN'), inspects: cnt('inspects', 'inspects'), places: new Set([...(LOG.places ?? []), ...(live?.places ?? [])]).size, lv };
}
function seaStats(LOG, f, live) {
  const tile = (k, v) => (v ? `<div class="ft"><small>${k}</small><b>${v}</b></div>` : ''), T = lifeTotals(LOG, f, live), H = T.hitch;
  const secs = Object.values(H).reduce((a, h) => a + h[0], 0), fv = T.fav ? H[T.fav]?.[1] ?? 0 : 0, places = Object.keys(H).length;
  const hm = secs >= 3600 ? `${Math.floor(secs / 3600)}h ${Math.round((secs % 3600) / 60)}m` : secs >= 60 ? `${Math.round(secs / 60)} min` : '';
  return tile('Meals eaten', T.meals) + tile('Strikes from its stem', T.strikes) + tile('Time holding on', hm) + tile('Holdfasts tried', places) + tile('Visits to its favourite', fv) + tile('Greetings', T.greets) + tile('Tails held', T.links) + tile('New things inspected', T.inspects);
}
const SEA_STATES = Fish3D.SEA_STATES, e5 = (v) => Math.max(0, Math.min(4, Math.round(((v ?? 0) + 1) * 2)));
const seaPack = (f) => [Math.max(0, SEA_STATES.indexOf(f.hs ?? 'swimming')), '' + e5(f.eyeL?.x) + e5(f.eyeL?.y) + e5(f.eyeR?.x) + e5(f.eyeR?.y), r2(f.tintK ?? 0), f.tintCol ? ((f.tintCol[0] << 16) | (f.tintCol[1] << 8) | f.tintCol[2]).toString(16) : '', r2(f.glowK ?? 0), f.strikeSeq ?? 0, r2(f.gripStem ?? 0), r2(f.gripLean ?? 0)].join(',');
function seaUnpack(f, str, k) {
  const a = str.split(','), num = (i, lo, hi) => { const v = +a[i]; return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null; };
  f.hs = SEA_STATES[num(0, 0, SEA_STATES.length - 1) ?? 0];
  const ev = a[1] ?? ''; if (/^[0-4]{4}$/.test(ev)) { const d = (i) => +ev[i] / 2 - 1; for (const [key, i] of [['eyeL', 0], ['eyeR', 2]]) { const e = (f[key] ||= { x: 0, y: 0, tx: 0, ty: 0, t: 0 }); e.x += (d(i) - e.x) * k; e.y += (d(i + 1) - e.y) * k; } }
  if (/^[0-9a-f]{1,6}$/.test(a[3] ?? '')) { const c = parseInt(a[3], 16), col = [(c >> 16) & 255, (c >> 8) & 255, c & 255]; if (!f.tintCol || f.tintCol.some((v, i) => v !== col[i])) { f.tintCol = col; f.tintApplied = -1; } }
  const tk = num(2, 0, 0.6); if (tk != null && Math.abs(tk - (f.tintK ?? 0)) > 0.02) f.setTint(tk);
  const gk = num(4, 0, 1); if (gk != null) { f.glowK = gk; f.netGlowAt = performance.now(); }
  const sq = num(5, 0, 1e9); if (sq != null) { if (f.netStrikeSeq != null && sq > f.netStrikeSeq) f.netStrikeT = 0.16; f.netStrikeSeq = sq; }
  const st = num(6, 0, 8), le = num(7, 0, 1); if (st) f.gripStem = st; if (le) f.gripLean = le;
}
const OPOSE = ['curlK', 'restK', 'crawlK', 'workK', 'greetK', 'sq', 'glassNear', 'glideK', 'cruiseK', 'landK', 'dashK', 'tuckK', 'camoK', 'glowK', 'chewK', 'sleepK', 'blinkK', 'flatK', 'lionK', 'snakeK', 'jellyK', 'kelpK', 'puffK', 'sink', 'mimicK', 'climbK', 'squintK', 'wideK', 'inhaleK'];
game.on('snap', (list, crabs, ts) => { const at = performance.now(); for (const f of list) { let e = netFish.get(f.i); if (!e) netFish.set(f.i, (e = {})); if (Number.isFinite(ts) && ts === e.ts) { e.seen = at; continue; } /* the same frame again: the lead phone is still there, nothing has moved */ const gap = Number.isFinite(ts) && Number.isFinite(e.ts) && ts > e.ts ? (ts - e.ts) / 1000 : (at - (e.at ?? 0)) / 1000;      // timed by the lead phone's clock, so a late or bunched message does not fake a burst of speed
 if (gap > 0.04 && gap < 2.5) { if (Number.isFinite(e.ph) && Number.isFinite(f.ph) && f.ph >= e.ph) e.rate = (f.ph - e.ph) / gap; const v = (a, b2) => (Number.isFinite(a) && Number.isFinite(b2) ? (b2 - a) / gap : 0); e.vx = v(e.x, f.x); e.vy = v(e.y, f.y); e.vz = v(e.z, f.z); e.vh = Number.isFinite(e.h) ? Math.atan2(Math.sin(f.h - e.h), Math.cos(f.h - e.h)) / gap : 0; } else { e.vx = e.vy = e.vz = e.vh = 0; } Object.assign(e, f, { at, ts, seen: at }); } if (Array.isArray(crabs) && !isDirector()) fishes.netCrabs(crabs); });
game.on('role', (d) => { if (d) netFish.clear(); });
game.on('fx', (m) => {
  if (m.kind === 'water') { if (!wc.active && !REDUCED && !document.hidden) { setFocus(null); wc.start({ dirt0: 1, dispatch: () => true }); } }      // a friend is changing the water: watch it happen
  else if (m.kind === 'sight' && !isDirector()) sights.spawn(m.what, { dir: m.dir, y0: m.y0, z: m.z });
});
// The lead phone sends where every animal is, about seven times a second. It is sent on a steady timer as well as from the frame loop, so a lead
// phone that is drawing slowly (busy, or an older phone) still keeps the others up to date, and their animals never wander off on their own.
function sendSnap(now) {
  if (!game.shared || wc.active || !isDirector() || now - lastSnapSent <= 130 || !game.live?.connected || document.hidden || !fishes.list.length) return;
  lastSnapSent = now; game.live.send({ t: 'snap', ts: Math.round(simAt) % 1e7, fish: fishes.list.map((f) => ({ i: f.fid, x: r2(f.pos.x), y: r2(f.pos.y), z: r2(f.pos.z), h: r2(f.heading), p: r2(f.pitch), r: r2(f.roll), ph: r2(f.phase % 2000), ...(f.sp?.tail ? { c: r2(f.curlK ?? 0), g: r2(f.gripK ?? 0), sh: seaPack(f) } : {}), ...(f.species.move === 'jet' ? { o: OPOSE.map((k) => r2(f[k] ?? 0)) } : {}) })), crabs: fishes.crabSnap() });
}
setInterval(() => { try { sendSnap(performance.now()); } catch (e) { if (simErrors++ < 5) console.error('sync error', e); } }, 140);
function netSync(dt, now) {
  if (!game.shared || wc.active) return;
  if (isDirector()) { sendSnap(now); return; }
  const t = performance.now(), real = Math.min(1, Math.max(dt, (t - (netSync.last ?? t)) / 1000)), k = 1 - Math.exp(-real * 14); netSync.last = t;      // catch up by the time that really passed, even after a slow frame
  for (const f of fishes.list) {
    const e = netFish.get(f.fid); if (!e || (play && play.fish === f)) continue;
    if (!Number.isFinite(e.x + e.y + e.z)) continue;      // a broken position from the lead phone is never copied: this phone's own animal carries on
    const quiet = t - (e.seen ?? e.at);      // how long since the lead phone was last heard from
    if (quiet > 20000) continue;      // long silent (it left, or its phone is asleep): this phone's own animals carry on
    if (quiet > 3000) { const kq = 1 - Math.exp(-real * 0.6); f.pos.x += (e.x - f.pos.x) * kq; f.pos.y += (e.y - f.pos.y) * kq; f.pos.z += (e.z - f.pos.z) * kq; f.group.position.copy(f.pos); continue; }      // a short silence (a busy or briefly hidden lead phone): each animal stays about where it was last seen, still moving in its own way, so it has not wandered off when the news comes back
    // the lead phone's news is a fraction of a second old by the time it arrives: carry each fish on along its course for that long, so both screens show it in the same place now
    const age = Math.min(0.35, (t - e.at) / 1000), ex = e.x + (e.vx ?? 0) * age, ey = e.y + (e.vy ?? 0) * age, ez = e.z + (e.vz ?? 0) * age, eh = e.h + (e.vh ?? 0) * age;
    { const far = Math.hypot(ex - f.pos.x, ey - f.pos.y, ez - f.pos.z) > 1.5, kk = far ? 1 - Math.exp(-real * 3) : k; f.pos.x += (ex - f.pos.x) * kk; f.pos.y += (ey - f.pos.y) * kk; f.pos.z += (ez - f.pos.z) * kk; }      // after a gap in the news, a fish that has drifted off glides back over a second or so, never jumps
    const dh = ((eh - f.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI; f.heading += dh * k; f.pitch += (e.p - f.pitch) * k; f.roll += (e.r - f.roll) * k;
    if (Number.isFinite(e.ph)) { const want = e.ph + (t - e.at) * 0.001 * (e.rate ?? 0), d = want - (f.phase % 2000); f.phase = Math.abs(d) > 3 ? want : f.phase + d * k; }      // the same stroke of the tail, the same step of the arms
    if (Array.isArray(e.o)) OPOSE.forEach((key, j) => { if (Number.isFinite(e.o[j]) && key in f) f[key] += (e.o[j] - f[key]) * k; });
    if (Number.isFinite(e.c) && f.sp?.tail) { f.curlK = (f.curlK ?? 0) + (e.c - (f.curlK ?? 0)) * k; if (Number.isFinite(e.g)) f.gripK = (f.gripK ?? 0) + (e.g - (f.gripK ?? 0)) * k; f.setPose(f.phase); }      // a seahorse's tail: curled round a stem or a partner's tail on every phone, not only the lead one
    if (typeof e.sh === 'string' && f.sp?.tail) seaUnpack(f, e.sh, k);
    f.netStrikeT = Math.max(0, (f.netStrikeT ?? 0) - dt); const strike = f.netStrikeT > 0 ? 0.2 * Math.sin(Math.PI * (1 - f.netStrikeT / 0.16)) : 0;      // the strike, played here as on the lead phone
    f.group.position.copy(f.pos); f.group.quaternion.setFromEuler(new THREE.Euler(f.roll, f.heading, f.pitch - strike, 'YZX'));
  }
}

// ── frame loop ──
let last = performance.now(), cTick = 0, fpsN = 0, fpsT = 0, lastMeter = performance.now(), first = true, firstN = 0;
const meter = qs.has('fps') ? Object.assign(document.body.appendChild(document.createElement('div')), { style: 'position:fixed;left:6px;top:calc(env(safe-area-inset-top) + 4px);z-index:60;font:11px ui-monospace,Menlo,monospace;color:#9f9;background:rgba(0,0,0,.6);padding:3px 6px;border-radius:6px;pointer-events:none;white-space:pre' }) : null;
// One bad frame must never stop the game: the loop is always scheduled again, whatever happened inside it.
let frameErrors = 0, simErrors = 0, simMs = 0;
// If the finished picture comes out pure black for several checks in a row (it happened on an iPhone after the sand banks
// arrived), the heavier effects are switched off one at a time until the tank shows again, and which one it was is reported.
const SAFE = [['depth of field', () => { stg.bokeh.enabled = false; }], ['bloom', () => { stg.bloom.enabled = false; }], ['sunbeams and sand light', () => { stg.beams.group.visible = false; safeNoCaustic = true; }]];
let blackRun = 0, blackAt = 0, safeStep = 0, safeNoCaustic = false; const px = new Uint8Array(4 * 6);
function blackCheck(now) {
  if (now - blackAt < 2000 || safeStep >= SAFE.length || document.hidden) return; blackAt = now;
  try { const gl = stg.renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; let lit = 0;
    for (let i = 0; i < 6; i++) { gl.readPixels(Math.round(W * (0.2 + 0.12 * i)), Math.round(H * (0.25 + 0.1 * i)), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px.subarray(i * 4, i * 4 + 4)); if (Math.max(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) > 6) lit++; }
    if (lit > 0) { blackRun = 0; return; }
    if (++blackRun < 3) return; blackRun = 0; const [name, off] = SAFE[safeStep++]; off(); console.error(`frame error: the tank was drawing black, turned off the ${name}`); game.track(`safe_${name.split(' ')[0]}`);
  } catch { /* reading pixels is only a check */ }
}
window.__blackCheck = () => ({ safeStep, blackRun });
function frame(now) {
  let later = false; try { later = frameBody(now); } catch (e) { if (frameErrors++ < 5) console.error('frame error', e); try { composer.render(); } catch { /* nothing more to try this frame */ } }      // a frame that went wrong part way still draws the tank, rather than leaving the screen black
  if (later) setTimeout(() => requestAnimationFrame(frame), 120); else requestAnimationFrame(frame);
}
function frameBody(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
  swayTime.value = t; cTick += dt; if (cTick > 0.05) { cTick = 0; stg.caustic.update(t * 0.7); }
  const lit = rain.light(t); stg.beams.update(t, lit); stg.causOn?.(t); stg.env.setCaustic(stg.caustic.tex, t, safeNoCaustic ? 0 : (0.08 + 0.26 * Math.min(1, cur.sunI / 10)) * (stg.cur.shaft > 0.18 ? 1 : 0.5) * lit);      // light on the sand follows the sun
  if (game.state) stage.murk += (Math.max(0, (0.8 - game.state.water) / 0.8) - stage.murk) * Math.min(1, dt * 1.5);      // (fresh-ish water stays clear: the murk comes in only once the water is really due)
  stg.applyTod(dt);
  if (focus) {
    // frame the fish in the open water between the top bar and the profile card
    const H = window.innerHeight, cardTop = card.classList.contains('on') ? card.getBoundingClientRect().top : H - 150, topPx = 64, cy = topPx + Math.max(150, cardTop - topPx - 8) / 2;
    const d = Math.max(9.5, focus.radius * 11.5), shift = ((H / 2 - cy) / (H / 2)) * d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camGoal.set(focus.pos.x + 0.3, focus.pos.y - shift + 0.12, focus.pos.z + d); lookGoal.set(focus.pos.x, focus.pos.y - shift, focus.pos.z);
  }
  else { camGoal.set(REDUCED ? 0 : Math.sin(t * 0.13) * 0.35, stg.CAM_Y + (REDUCED ? 0 : Math.sin(t * 0.09) * 0.12), stg.CAM_Z); lookGoal.set(0, stg.LOOK_Y, 0); }
  const close = !focus && fishes.list.find((f) => f.st?.s === 'glass' && f.glassAt?.close && f.pos.z > 8), fd = focus ? camera.position.distanceTo(focus.pos) : close ? camera.position.distanceTo(close.pos) : stg.CAM_Z;      // (an octopus up at your screen is the one in focus)
  bokeh.uniforms.focus.value += (fd - bokeh.uniforms.focus.value) * Math.min(1, dt * 4);
  bokeh.uniforms.aperture.value += ((focus ? 0.00038 : 0.00018) - bokeh.uniforms.aperture.value) * Math.min(1, dt * 3);      // (a close-up keeps a little depth; it no longer turns the fish and everything round it to mush)
  bokeh.uniforms.maxblur.value += ((focus ? 0.009 : 0.005) - bokeh.uniforms.maxblur.value) * Math.min(1, dt * 3);
  { const P = plantPush.value; let k = 0;      // the plants bend away from whoever is among them (not a seahorse holding on to one)
    { const Q = plantHold.value; let j = 0; for (const f of fishes.list) { const G = j < HOLD_N ? f.gripPoint?.() : null; if (G) Q[j++].set(G[0], G[1], G[2], SEAHORSE_GRIP_R * f.scale + 0.09); } for (; j < HOLD_N; j++) Q[j].set(0, -99, 0, 0); }      // where a seahorse holds on, the plant is still and the leaves make room for its tail
    for (const pass of [0, 1]) for (const f of fishes.list) { if (k >= PUSH_N) break; if (f.dead || (f.gripK ?? 0) >= 0.5 || (pass === 0) !== (f.species.move === 'jet') || (pass === 1 && f.pos.y > 8)) continue; P[k++].set(f.pos.x, f.pos.y, f.pos.z, f.radius * (f.species.move === 'jet' ? 0.75 : 0.55) * (f.group.scale.x || 1)); }
    for (; k < PUSH_N; k++) P[k].set(0, -99, 0, 0); }
  fishBoost.value.set(0.36, 0.3, 0.22).multiplyScalar(0.3 + 0.7 * Math.min(1, cur.sunI / 12));
  if (window.__cam) { camGoal.set(...window.__cam.slice(0, 3)); lookGoal.set(...window.__cam.slice(3, 6)); }
  const kc = Math.min(1, dt * 3.2); camera.position.lerp(camGoal, kc); look.lerp(lookGoal, kc); camera.lookAt(look);
  if (feedMode && (feedIdle += dt) > 12) endFeed(); mystTick(dt);
  if (bottleSp.visible) { const U = bottleSp.userData, M = bottleSp.material, now = performance.now(), k = Math.min(1, (now - (U.t0 ?? -1e9)) / 2600), B = bottleM.group, P = bottleSp.position;
    if (U.leave && now >= U.leave.t0) {      // read and empty: it fills with water and sinks slowly away, then is gone
      const q = Math.min(1, (now - U.leave.t0) / 5200), floor = sandH(P.x, P.z) + 0.35; P.y = U.leave.y + (floor - U.leave.y) * (1 - Math.pow(1 - q, 2)); M.rotation = -1.3 + q * 0.9 + Math.sin(t * 2) * 0.05;
      if (Math.random() < 0.08 * (1 - q)) fishes.burst(P.clone()); bottleM.glass.material.opacity = 0.5 * (1 - Math.max(0, q - 0.75) / 0.25); B.scale.setScalar(1 - Math.max(0, q - 0.85) / 0.15 * 0.6);
      if (q >= 1) { U.leave = null; B.scale.setScalar(1); bottleSp.visible = bottleGlow.visible = false; } }
    else if (U.leave) { P.y = U.leave.y + Math.sin(t * 1.3) * 0.06; }      // (held where it is while the letter is open)
    else if (k < 1) {      // dropping in: through the surface, down a little way, and bobbing back up
      const dip = k < 0.35 ? U.top + (U.float - 0.9 - U.top) * (k / 0.35) : U.float - 0.9 * Math.exp(-(k - 0.35) * 5) * Math.cos((k - 0.35) * 12); P.y = dip; M.rotation = -1.35 * Math.min(1, k * 1.6) + Math.sin(t * 5) * 0.2 * (1 - k);
      if (!U.splashed && P.y < Fish3D.topY) { U.splashed = true; fishes.burst(P.clone()); } }
    else { U.splashed = false; P.y = U.float + Math.sin(t * 1.3 + 1) * 0.07; P.x += Math.sin(t * 0.21) * 0.0015; M.rotation = -1.35 + Math.sin(t * 0.9) * 0.08; }      // riding on the surface, rocking gently and drifting a little
    B.visible = true; B.position.copy(P); B.rotation.set(0.25, 0, M.rotation);
    bottleGlow.position.copy(P); const gl = U.leave ? 0 : (Math.sin(t * 0.8) > 0.85 ? 1 : 0.3); const bs = 2 + gl * 1.2; bottleGlow.scale.set(bs, bs, 1); bottleGlow.material.opacity = U.leave ? 0 : 0.25 + gl * 0.45; }
  else bottleM.group.visible = false;
  shardTick(Math.min(0.05, dt));
  if (!REDUCED && (game.state?.glowUntil ?? 0) > Date.now() && (glowT -= dt) <= 0) { glowT = 2.2 + Math.random() * 1.5; const live = fishes.list.filter((f) => !f.dead && !f.visitor); if (live.length) fishes.burst(live[(Math.random() * live.length) | 0].pos); }      // the tank glows: little sparkles round the fish after you both cared for it
  fryTick(Math.min(0.05, dt)); birthWatchTick(); giftTick(t, Math.min(0.05, dt)); tipsTick(); perfTick(); noteSeenTick();
  for (const egg of eggSprites.values()) { const e = egg.e, now = Date.now(), p = e.laid ? Math.min(1, (now - e.laid) / Math.max(1, e.hatchAt - e.laid)) : 0.5; egg.set(p, e.cared?.length ?? 0); egg.ready = !!e.ready; if (!REDUCED) egg.tick(t); if (e.ready) eggWatch(egg, Math.min(0.05, dt));
    if ((egg.sniffT = (egg.sniffT ?? 20) - 1 / 60) <= 0) { egg.sniffT = 30 + Math.random() * 30; egg.sniffy = eggSniff(egg); }
    eggCare(egg, Math.min(0.05, dt), t); }
  if (driftSp.visible) { driftSp.position.y = (driftSp.userData.y0 ?? 2.1) + Math.sin(t * 1.7) * 0.14; const sc = 1.3 + Math.sin(t * 3.1) * 0.06; driftSp.scale.set(sc, sc, 1); driftGlow.position.copy(driftSp.position); const gs = 3.2 + Math.sin(t * 2.2) * 0.5; driftGlow.scale.set(gs, gs, 1); }
  if (play) { if (performance.now() > play.until || !fishes.byId.has(play.fish.fid)) { if (fishes.byId.has(play.fish.fid)) finishPlay(); else play = null; } else play.fish.retarget = 1; }
  // the picture must keep moving whatever one fish does: a fish whose update throws is skipped this frame (and said so, a few times), the rest of the tank carries on
  const simT0 = performance.now();
  if (!window.__simHold) {      /* (a check that runs the tank's clock itself holds this one, so a slow machine cannot move the animals in between) */
  try { decor.tick(t, dt); fishes.bubbleAt = decor.bubbleSpot() ?? fishes.defaultBubble; fishes.update(dt, t); grazeGlass(dt); toys.update(dt, t); spotDim(); fishes.observe(dt, t); watchTick(dt); } catch (e) { if (simErrors++ < 5) console.error('tank error', e); }
  for (const f of fishes.list) { try { f.update(dt, rng, fishes.list); } catch (e) { if ((f.errs = (f.errs ?? 0) + 1) <= 3) console.error('fish error', f.name, e); } } }
  try { nurseryFx.update(dt, t, game.state, fishes); } catch (e) { if (simErrors++ < 5) console.error('tank error', e); }
  simAt = now; try { netSync(dt, now); } catch (e) { if (simErrors++ < 5) console.error('sync error', e); }
  simMs += (performance.now() - simT0 - simMs) * 0.05;
  // a wild sea turtle passing far behind the tank, now and then from level 7 (a preview of level 8 and nothing more: no capacity, no care, no tap, no notice). About once in a long sitting
  if ((game.state?.level ?? 1) >= 7 && !REDUCED && !stg.env.wildOn?.() && (wildT += dt) > 60) { wildT = 0; if (Math.random() < 1 / 22) stg.env.wildPass?.(t); }
  stg.env.tick(t); rain.update(dt); moonK += (moonWant - moonK) * Math.min(1, dt * 0.8); moon.material.opacity = 0.9 * moonK; moonHalo.material.opacity = (0.35 + 0.65 * (skyNow?.event?.key === 'fullmoon' ? 1 : 0.4)) * moonK; lureTick(dt); sights.dusk = ['evening', 'night'].includes(fishes.phase()); sights.enabled = (game.state?.flags?.tut ?? 0) >= 5 && !play && !REDUCED && isDirector(); sights.update(dt, t); glow.update(dt, t); stg.shafts.update(t); stg.surf.mat.uniforms.uTime.value = t; grade.uniforms.uT.value = t; stg.snow.update(dt, t); stg.motes?.update(dt, t); stg.bubbles.update(dt, t); stg.bubbles2.update(dt, t);
  stg.watchPerf(dt);
  if (meter && (fpsN++, fpsT += (now - lastMeter) / 1000, lastMeter = now, fpsT) > 0.5) { meter.textContent = `${Math.round(fpsN / fpsT)} fps · q${stage.quality} · sim ${simMs.toFixed(1)} ms\n${stg.renderer.info.render.calls} calls`; fpsN = fpsT = 0; }
  if (LITE) { window.__load?.done(); return true; }
  { const air = wc.active && wc.level < 0.97; stg.bubbles.mesh.visible = stg.bubbles2.mesh.visible = !air; for (const b of decor.streams.values()) b.mesh.visible = !air; fishes.bm.visible = !air; }      // no bubbles rise through air: they stop while the water is out and start again when it is back
  if (wc.active) { try { wc.frame(dt * (window.__wcScale ?? 1)); } catch (e) { console.error('water change error', e); wc.finish(); } }
  stg.renderer.info.reset(); composer.render(); blackCheck(now);
  if (first && ++firstN >= 3) { first = false; window.__load?.done(); }      // the cove fades into the tank once a few whole frames have drawn (shaders compiled, every animal and decoration in place)
  return false;
}

// ── coming back: show up to three things that really happened while you were away ──
const seenKey = () => 'ourtank.seen.' + (game.shared ? game.you.userId : 'solo');
const markSeen = () => { try { localStorage.setItem(seenKey(), String(Date.now())); } catch { /* ignore */ } };
// ── notes on the glass: real post-its stuck to the front of the tank, readable where they are; a tap opens the notes board ──
const glassNotes = document.createElement('div'); glassNotes.id = 'glassnotes'; glassNotes.hidden = true; (document.getElementById('app') ?? document.body).appendChild(glassNotes);      // (inside the app, under its sheets and cards: they slide up over the notes)
const NOTE_INK = { butter: '#fff1a8', blush: '#ffd6e0', mint: '#d2f5dd', sky: '#d6e9ff', lilac: '#e9dcff' }, seenNotes = new Set(), stamped = new Set(), noteHearts = new Map(); let notesBooted = false;
function syncGlassNote() {
  const me = game.you?.userId, ns = game.shared ? (game.state?.notes ?? []).filter((n) => !(n.gone ?? []).includes(me)).sort((a, b) => b.at - a.at).slice(0, 2) : [];      // (a note you took down is gone from your glass only)
  const show = ns.length > 0 && !play;      // a post-it stays stuck to the glass whatever slides up over the tank
  if (!show) { for (const el of glassNotes.querySelectorAll('.postit')) { if (play) break; const r = el.getBoundingClientRect(), c = el.cloneNode(true); c.classList.add(el.classList.contains('seen') ? 'fallen' : 'peeled'); Object.assign(c.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', margin: 0 }); document.body.appendChild(c); setTimeout(() => c.remove(), 1800); }      /* the last note comes down the same way */
    glassNotes.innerHTML = ''; glassNotes.dataset.k = ''; glassNotes.hidden = true; return; }
  glassNotes.hidden = false;
  const key = ns.map((n) => n.id + ':' + (n.read ?? []).length + ':' + (n.hearts ?? []).length + ':' + (n.edited ?? 0) + ':' + (n.pos ? n.pos.x + ',' + n.pos.y : '')).join(); if (glassNotes.querySelector('.drag')) return; if (glassNotes.dataset.k === key) return;
  const gone = [...glassNotes.querySelectorAll('.postit')].filter((el) => !ns.some((n) => n.id === el.dataset.id));      // a note that came down peels off the glass and drifts away
  for (const el of gone) { const r = el.getBoundingClientRect(), c = el.cloneNode(true); c.classList.add(el.classList.contains('seen') ? 'fallen' : 'peeled'); Object.assign(c.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', margin: 0 }); document.body.appendChild(c); setTimeout(() => c.remove(), 1800); }
  glassNotes.dataset.k = key;
  const esc2 = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  glassNotes.innerHTML = ns.map((n, i) => { const fresh = notesBooted && !seenNotes.has(n.id), loved = (noteHearts.get(n.id) ?? (n.hearts ?? []).length) < (n.hearts ?? []).length, hn = hashId(n.id), tilt = [-3, 3.5, -1.5][hn % 3];      /* each note keeps its own spot and tilt, whatever else is on the glass (by index, a note coming down made the other slide into its place, as if it changed color) */ noteHearts.set(n.id, (n.hearts ?? []).length); const P = n.pos ?? [{ x: 0.02, y: 0.085 }, { x: 0.36, y: 0.11 }, { x: 0.66, y: 0.095 }][hn % 3]; return `<button class="postit ${fresh ? 'fresh' : ''} ${n.by === me ? 'mine' : ''}" style="--pc:${NOTE_INK[n.color] ?? NOTE_INK.butter};--r:${tilt}deg;--d:${i * 0.12}s;left:calc((100vw - 128px) * ${P.x});top:calc((100vh - 130px) * ${P.y})" data-id="${n.id}" data-mine="${n.by === me ? 1 : ''}"><span class="band"></span><span class="pt">${esc2(n.text)}</span><span class="pf"><span>— ${n.by === me ? 'you' : esc2(n.name)}</span><span class="pd">${n.doodle}</span></span>${(n.hearts ?? []).length ? `<span class="ph ${loved ? 'pop' : ''}">♥${n.hearts.length > 1 ? n.hearts.length : ''}</span>` : ''}<span class="curl"></span></button>`; }).join('');
  for (const n of ns) if (!seenNotes.has(n.id)) { seenNotes.add(n.id); if (n.by === me || (n.read ?? []).includes(me)) continue; sfx('arrive'); noteWatch.set(n.id, 0); }      // read where it is, but only once someone has really had it in front of them (see noteSeenTick)
  glassNotes.querySelectorAll('.postit').forEach((b) => {
    let st = null, dragged = false;
    b.onpointerdown = (e) => { if (!b.dataset.mine) return; st = { x: e.clientX, y: e.clientY, l: b.offsetLeft, t: b.offsetTop }; dragged = false; b.setPointerCapture?.(e.pointerId); };
    b.onpointermove = (e) => { if (!st) return; const dx = e.clientX - st.x, dy = e.clientY - st.y; if (!dragged && Math.hypot(dx, dy) < 7) return; if (!dragged) { dragged = true; b.classList.add('drag'); haptic(8); }      // your own note: press and drag it somewhere else on the glass
      b.style.left = Math.max(0, Math.min(innerWidth - b.offsetWidth, st.l + dx)) + 'px'; b.style.top = Math.max(0, Math.min(innerHeight - b.offsetHeight, st.t + dy)) + 'px'; };
    b.onpointerup = () => { if (!st) return; st = null; if (!dragged) return; b.classList.remove('drag'); sfx('stick'); const x = b.offsetLeft / Math.max(1, innerWidth - 128), y = b.offsetTop / Math.max(1, innerHeight - 130); game.dispatch({ t: 'moveNote', id: b.dataset.id, x, y }); setTimeout(() => (dragged = false), 50); };
    b.onclick = () => { if (dragged) return; sfx('tap'); haptic(6); b.classList.add('lift'); setTimeout(() => ui.noteBoard(b.dataset.id), 160); }; });
  // your own note, once the crew has read it: a SEEN stamp across it, then it peels off your glass by itself (theirs stays until they tap it)
  for (const n of ns) { if (n.by !== me || stamped.has(n.id)) continue; const who = (n.read ?? []).filter((u) => u !== me).map((u) => game.members?.find((m) => m.id === u)?.name).filter(Boolean); if (!who.length) continue;
    const el = glassNotes.querySelector(`.postit[data-id="${n.id}"]`); if (!el || document.hidden) continue; stamped.add(n.id);
    setTimeout(() => { el.insertAdjacentHTML('beforeend', `<i class="seenst">SEEN<small>by ${who.slice(0, 2).map((x) => x.replace(/[&<>"]/g, '')).join(' & ')}</small></i>`); el.classList.add('seen'); sfx('stick'); haptic(10); }, 900);
    setTimeout(() => game.dispatch({ t: 'readNote', id: n.id, dismiss: true }), 3900); }      /* SEEN for three seconds, then it drops to the bottom of the glass */
  notesBooted = true;
}
game.on('state', () => syncGlassNote()); setInterval(syncGlassNote, 1000);
// ── the evening: once a day, after six, a quiet card with how the day went in the tank, and what is next ──
let wbShown = false, wbPending = false;      // (pending: the welcome-back note is about to show, so nothing else pops up first)
// once a week, in the evening: the week in a few plain lines, from the journal (no scores, nothing to keep up)
function weekStory() {
  const s = game.state; if (!s || (s.flags.tut ?? 0) < 5 || document.hidden) return; const now = Date.now(); if (new Date(now).getHours() < 18) return;
  let last = 0; try { last = +localStorage.getItem('ourtank.weekStory') || 0; } catch { /* storage unavailable */ } if (!last) { try { localStorage.setItem('ourtank.weekStory', String(now)); } catch { /* storage unavailable */ } return; }      /* (the first one comes a week after this phone first saw the tank) */
  if (now - last < 6.5 * 864e5) return;
  const W = game.journal.filter((e) => e.ts > now - 7 * 864e5), pickL = (re, n = 1) => W.filter((e) => re.test(e.text)).slice(-n).map((e) => e.text);
  const lines = [...pickL(/hatched|gave birth|swam out/, 1), ...pickL(/grew up|is an adult/, 1), ...pickL(/brought back|came back with/, 1), ...pickL(/^Field Guide, page/, 1), ...pickL(/rare visitor|said hello to/, 1), ...pickL(/^Goal complete|torii|lighthouse|a rare color/i, 1)].slice(0, 5);
  if (lines.length < 2) return; try { localStorage.setItem('ourtank.weekStory', String(now)); } catch { /* storage unavailable */ }
  ui.weekStory(lines, () => { const img = tankShot(); if (img) takePhoto({ img, title: `This week in ${game.tankName ?? 'the tank'}`, line: lines.join(' '), ts: now }); });
}
setInterval(() => { if (!window.__quietUntil || Date.now() > window.__quietUntil) weekStory(); }, 60e3); window.__weekStory = weekStory;
// After the replay: the one thing that matters most now, said once, then the tank is quiet (what was in the replay is not repeated as toasts)
async function afterReplay() {
  await new Promise((r) => { const w = () => ($('reunion').classList.contains('on') ? setTimeout(w, 400) : r()); setTimeout(w, 1200); });
  ui.clearToasts(); const s = game.state, me = game.you?.userId; if (!s) return;
  const egg = (s.eggs ?? []).find((e) => e.ready), born = s.fish.find((f) => f.preg?.ready && !f.dead), D = s.dilemma && !s.dilemma.done ? s.dilemma : null, mine = D && (!D.turn || D.turn.uid === me || Date.now() > D.turn.until), m = mysteryOf(s), G = goalOf(s);
  // something changed in the tank itself while you were away: that comes before any menu (it is there to be looked at, now)
  const day = Date.now() - 864e5, kp = (s.keeps ?? []).filter((k) => k.at > day).sort((a, b) => b.at - a.at)[0], kOcto = kp && s.fish.find((f) => f.id === kp.by && !f.dead);
  const mv = !kp && [...game.journal].reverse().find((e) => e.ts > day && / (moved in|moved the|shoved its) /.test(e.text)), mvOcto = mv && s.fish.find((f) => f.species === 'octopus' && !f.dead && mv.text.startsWith(f.name + ' '));
  const look = kOcto ? [`${kOcto.name} brought back a ${(KEEPSAKES[kp.k]?.label ?? 'keepsake').toLowerCase()}. Go and see it on the sand.`, kOcto.id] : mvOcto ? [`${mvOcto.name} has been rearranging. Go and see what it moved.`, mvOcto.id] : null;
  const lookKey = kOcto ? 'k' + kp.id : mvOcto ? 'm' + mv.ts : ''; let lookSeen = ''; try { lookSeen = localStorage.getItem('ourtank.lookSeen') ?? ''; } catch { /* storage unavailable */ }
  if (look && !egg && !born && lookKey !== lookSeen) { try { localStorage.setItem('ourtank.lookSeen', lookKey); } catch { /* storage unavailable */ } setTimeout(() => { ui.toast(look[0], 4200); const f = fishes.byId.get(look[1]); if (f && !f.dead) setFocus(f); }, 600); return; }
  const say = egg ? ['The eggs are ready to hatch. Stay and watch.', null] : born ? [`${born.name} is about to give birth. Stay and watch.`, null] : mine ? ['A decision is waiting for you: tap the bell at the top.', null] : m && !m.done ? [`${MYSTERY[m.kind]?.text ?? 'Something in the tank.'} Tap the glow.`, null] : G?.next ? [`Goal: ${G.next.text}.`, null] : null;
  if (!say) return; setTimeout(() => { ui.toast(say[0], 4200); if (say[1]) ui.flag(say[1], true); if (egg) { const fx = [...eggSprites.values()].find((x) => x.e?.id === egg.id); if (fx) setFocus(eggFocusOf(fx)); } }, 600);
}
async function welcomeBack() {
  let seen = 0; try { seen = +localStorage.getItem(seenKey()) || 0; } catch { /* ignore */ }
  if (seen && Date.now() - seen > 30 * 60e3) { try { localStorage.setItem('ourtank.away', JSON.stringify({ from: seen, to: Date.now() })); } catch { /* storage unavailable */ } }      // what happened while you were away goes in Today (until you clear it, or a day passes)
  markSeen(); addEventListener('pagehide', markSeen); document.addEventListener('visibilitychange', () => { if (document.hidden) markSeen(); });
  if (!seen) { if (game.shared && (game.state.flags.tut ?? 0) >= 5 && !game.isTutOwner) ui.toast(`Welcome to ${game.tankName}!`, 3600); return; }
  if (Date.now() - seen < 10 * 60e3 || (game.state.flags.tut ?? 0) < 5) return;
  const octoNames = game.state.fish.filter((f) => f.species === 'octopus').map((f) => f.name), moment = (t) => octoNames.some((n) => t.startsWith(n + ' ')) && /lionfish|jellyfish|sea snake|sole|pretending|dug itself|colors|smacked|squirted|friends now|has it in for|first crab|drove it away/.test(t);
  const mine = game.you?.userId, rank = (t) => (moment(t) ? -1 : /^A plant grew/.test(t) ? 2 : /hatch|eggs|guarding|drove it away|learned|worked out|jar|grew|adult|perfect|level|friends|visiting|birthday|looking after/i.test(t) ? 0 : /arrived|found|bottle|gift/i.test(t) ? 1 : 2);
  const news = game.journal.filter((e) => e.ts > seen && (!game.shared || e.userId !== mine || moment(e.text)) && !/began/.test(e.text)).map((e, i) => ({ t: e.text, i })).filter((x, _, a) => !/^Time capsule/.test(x.t) && (rank(x.t) < 2 || a.length < 3)).sort((a, b) => rank(a.t) - rank(b.t) || a.i - b.i).slice(0, 5).map((x) => x.t);      /* (the best first; everyday lines only when there is little else) */
  const s = game.state, lines = [...news];
  if (game.shared) {      // who looked after the tank while you were away, one line each: "Alex fed Inky a crab and changed the water."
    const care = /^(.+?) (fed .+|changed the water|cleaned .+|trimmed .+)\.$/, by = new Map();
    for (const e of game.journal) { if (e.ts <= seen || e.userId === mine) continue; const m = care.exec(e.text); if (!m) continue; const a = by.get(m[1]) ?? []; if (!a.includes(m[2])) a.push(m[2]); by.set(m[1], a); }
    const said = [...by].slice(0, 2).map(([who, a]) => `${who} ${a.length > 2 ? a.slice(0, 2).join(', ') + ' and more' : a.join(' and ')}.`);
    for (let i = lines.length - 1; i >= 0; i--) if (care.test(lines[i])) lines.splice(i, 1);
    lines.unshift(...said);
  }
  { const g = s.fish.find((f) => f.gift?.wrapped && f.owner === mine); if (g) lines.unshift(`A gift from ${g.gift.from} is waiting for you on the sand.`); }
  if ((s.bottles ?? []).some((b) => b.to === mine)) lines.push('A bottle turned up for you.'); else if (s.drift) lines.push(`${driftBlame(s.drift)} Tap it in the tank.`);
  if ((s.orders ?? []).length) lines.push(`${s.orders.length} delivery on the way.`);
  const next = [], my = mysteryOf(s), req = s.want ? s.want.text : s.daily && !s.daily.done ? s.daily.text : null;      // it ends on what is still to come: today's mystery, the request, and what the tank expects next
  { const G = goalOf(s); if (G?.next) next.push(`Goal: ${G.next.text}.`); }
  if (my && !my.done) next.push(`${MYSTERY[my.kind]?.text ?? ''} Tap the glow to find out.`); if (req) next.push(`Today's request: ${req}`);
  for (const x of forecast(s, Date.now(), 2)) if (next.length < 4) next.push(x.when === 'now' ? x.text : `${x.text}, ${x.when}`);
  if (!lines.length) return;
  // coming back: no replay over the tank and no animal sent to the glass. One small chip if there is real news (it opens Today), and after the
  // quiet start the one thing that matters most now (afterReplay). Each octopus greets you by its own trust and nature (octoHello).
  wbPending = false; ui.clearToasts(); setTimeout(() => ui.awayChip?.(), 1500); wbShown = true;
  setTimeout(afterReplay, Math.max(1500, (window.__quietUntil ?? 0) - Date.now()));
}

// one gentle, opt-in nudge a day, only for something that really happened (never "come back!")
async function offerNudges() {
  try { if (localStorage.getItem('ourtank.nudgeAsked')) return; localStorage.setItem('ourtank.nudgeAsked', '1'); } catch { /* ask next time */ }
  let st; try { st = await pushState(); } catch { return; } if (st !== 'off') { if (st === 'install') ui.toast('Add the game to your Home Screen to get gentle nudges', 5200); return; }
  const yes = await ui.dialog({ title: 'A gentle nudge?', text: 'At most a couple a day, and only when something really happened: an egg hatched, a rare visitor, a puzzle solved. Never a reminder to come back.', ok: 'Yes, nudge me', cancel: 'Not now' });
  if (yes) { try { const r = await pushToggle(true); ui.toast(r === 'on' ? 'Nudges are on' : 'Nudges are blocked in your browser settings'); } catch { ui.toast('Could not turn nudges on'); } }
}
// the end of a day: once the tank is looked after and today's request is done, the light softens and one quiet line says what comes next
let settleChecked = 0;
function maybeSettle() {
  const s = game.state; if (!s || !s.fish.length || (s.flags.tut ?? 0) < 5 || performance.now() - settleChecked < 4000) return; settleChecked = performance.now();
  if (ui?.tab !== 'tank' || focus || play || $('modal').classList.contains('on') || $('reunion').classList.contains('on')) return;
  const k = dayTicks(s, game.now()); if (!(k.care && k.wish)) return; const key = 'ourtank.settled.' + (game.shared ? game.you?.userId : 'solo'), day = String(Math.floor(game.now() / 864e5));
  try { if (localStorage.getItem(key) === day) return; localStorage.setItem(key, day); } catch { return; }
  stg.stage.settle = 1; setTimeout(() => { stg.stage.settle = 0; }, 22000);
  ui.settle([nextUp(s, Date.now())]);
}
// every caretaker brings in an octopus of their own. It waits for a quiet moment (no popup, no card, the tank in view) and keeps waiting until it gets one:
// it used to look once and give up if anything was open, and it never asked at all in a tank the server had put back, so a friend could join and never get one.
let firstAsking = false, firstAskAfter = 0;
async function firstFishPrompt() {
  const me = game.you?.userId; if (!game.shared || !me || firstAsking || performance.now() < firstAskAfter) return;
  const s = game.state; if (!s) return;
  if (s.fish.length + (s.orders ?? []).reduce((n, o) => n + (SPECIES_DEF[o.species]?.count ?? 1), 0) + (s.eggs ?? []).length >= capacity(s.level)) return;      // no room yet: ask again when there is
  const mine = s.fish.some((f) => f.owner === me && f.species === 'octopus' && !f.dead) || (s.orders ?? []).some((o) => o.owner === me && o.species === 'octopus');
  if (s.flags.firsts?.[me] || mine) return;
  if (game.isTutOwner && !s.fish.length) return;                                        // the creator's first octopus comes from the opening instead
  if ($('modal').classList.contains('on') || $('reunion').classList.contains('on') || $('settle')?.classList.contains('on') || focus || play || placing || (ui?.tab && ui.tab !== 'tank')) return;
  firstAsking = true;
  try {
    const pk = await ui.pickFish({ title: 'Your own octopus', text: 'Every caretaker brings in an octopus of their own. Choose its color, then name it. Everyone can care for it, but it will know you.', species: FIRST_FISH, name: ['Biscuit', 'Nori', 'Coral', 'Fin', 'Pearl', 'Sunny', 'Dot', 'Misty'][(Math.random() * 8) | 0] });
    const r = await game.dispatch({ t: 'firstFish', species: pk.species, name: pk.name, pal: pk.pal, seed: (Math.random() * 90000) | 0 }); if (!r.ok && r.reason !== 'ALREADY_HAVE') { fail(r); firstAskAfter = performance.now() + 10 * 60e3; } else if (r.ok) sfx('arrive');      // something went wrong: not again for a good while
  } catch { firstAskAfter = performance.now() + 60e3; } finally { firstAsking = false; }
}
// ── Developer Tools: one lifecycle step on the server (it answers with the new stage; every phone in the test aquarium gets the change) ──
const STEP_FAIL = { NOT_NOW: 'Not at this stage', TANK_FULL: 'The test aquarium is full', NO_TANK: 'Open the test aquarium first', FORBIDDEN: 'Not available' };
async function devStep(op) { try { const r = await api('/api/dev/test/step', { op, idem: crypto.randomUUID().slice(0, 18) }); if (!r.ok) ui.toast(STEP_FAIL[r.reason] ?? 'That did not work'); return r; } catch (e) { ui.toast(e.message || 'That did not work'); return null; } }
// the whole way to THEY'RE READY with a pause at each stage to watch it, then it stops: the choice is the person's own
let demoRun = null;
async function devDemo(after) {
  if (demoRun) { demoRun = null; ui.toast('Demo stopped'); return; }
  const run = (demoRun = {}), wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  for (const [op, ms] of [['pair', 4000], ['pregnant', 15000], ['preg3', 15000], ['preg6', 20000], ['birth', 30000], ['nurs2', 30000], ['nurs4', 30000], ['ready', 0]]) {
    if (demoRun !== run) return; const st = (await api('/api/dev/test').catch(() => null))?.stage?.stage;
    if (op === 'pair' && st !== 'none') continue; if (op === 'pregnant' && st !== 'paired') continue;
    const r = await devStep(op); after?.(); if (!r?.ok && !['preg3', 'preg6'].includes(op)) { demoRun = null; return; } await wait(ms);
  }
  demoRun = null; after?.();
}
// ── start ──
const GFX = ['Low', 'Medium', 'High'];
async function boot() {
  if (window.__noGL) { window.__load?.fail('This browser cannot draw the tank. Try Safari or Chrome on a recent phone.'); return new Promise(() => {}); }
  window.__load?.stage('Finding your tank…'); const r = await runOnboarding(); if (r.healed) setTimeout(() => ui?.toast('The server had been reset. Your tank is back, with the same code.', 5200), 3000);
  if (r.mode === 'net') {
    const ready = new Promise((ok) => { const live = new Live((m) => { game.onNet(m); if (m.t === 'snapshot') ok(); }, (up) => { game.connected = up; $('conn').classList.toggle('on', !up); }); net = live; game.attachNet(live, r); game.dev = !!r.dev; });
    game.on('state', () => { $('testb').hidden = !game.test; if (game.state) decor.grow(game.state); });      // (a plant trimmed on another phone shrinks here too)      // a small, constant reminder that this is the test aquarium
    window.__load?.stage('Checking on your friends…');      // the shared tank's own state, from the server, before anything is shown
    await Promise.race([ready, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 30000))]);
  } else game.startLocal();
  window.__load?.stage('Bringing the reef to life…');
  ui = initUI({ game, social, cb: {
    octoThought: (id) => fishes.byId.get(id)?.thought ?? null,
    act: (a) => (String(a).startsWith('toy:') ? armToy(String(a).slice(4)) : { feedgo: feedGo, feed: feedGo, clean: startClean, water: changeWater, trim: trimPlants, puzzle: () => givePuzzle(), hide: () => hideTreat(), crab: () => giveCrab() }[a]?.()),
    meetFish: () => { const f = fishes.list[0]; if (f) setFocus(f); }, adopt, startPlace: (t) => startPlace(t),
    rearrange: (on) => setRearrange(on), onTab: (t) => { if (t !== 'tank') { endFeed(); if (placing) { decor.cancel(); endPlace(); } setRearrange(false); } },
    note: async (text) => { const r = await game.dispatch({ t: 'note', text }); if (!r.ok) fail(r); else sfx('tap'); },
    storage: () => api('/api/storage'),
    board: () => api('/api/board'),
    giftCode: () => api('/api/giftcode'),
    showAnimal: (id) => { const f = fishes.byId.get(id); if (!f || f.dead) return false; ui.open('tank'); setFocus(f); showCard(f); haptic(8); return true; },      // from Crew: the animal, up close, with its card
    lookMystery: () => { if (!mystGlow.visible) return; mystGlow.userData.ping = 3; fishes.burst(mystGlow.position.clone()); haptic(10); },      // from the bell: the glow on the sand swells for a moment, so it is easy to find
    // Developer Tools: the seahorse lifecycle test runs on the server, on the developer's own test aquarium only
    devInfo: () => api('/api/dev/test'),
    devEnter: async () => { try { await api('/api/dev/test/open', {}); setTest(true); location.reload(); } catch (e) { ui.toast(e.message || 'Could not open the test aquarium'); } },
    devLeave: () => { setTest(false); location.reload(); },
    devJoin: async () => { const code = await ui.dialog({ title: 'Join a test aquarium', text: 'The test code shown in Developer Tools on the other phone.', input: { max: 6, placeholder: 'Test code' }, ok: 'Join', cancel: 'Cancel' }); if (!code) return;
      try { await api('/api/dev/test/join', { code }); setTest(true); location.reload(); } catch (e) { ui.toast(e.message || 'Could not join'); } },
    devStep: (op) => devStep(op), devDemo: (after) => devDemo(after), devDemoOn: () => !!demoRun,
    devReset: async () => { const yes = await ui.dialog({ title: 'Reset test?', text: 'This will remove the temporary animals, pregnancy, nursery, and events from your test aquarium. Your normal aquarium will not be affected.', ok: 'Reset Test', cancel: 'Cancel' }); if (!yes) return; demoRun = null; try { await api('/api/dev/test/reset', {}); ui.toast('Test aquarium reset'); } catch (e) { ui.toast(e.message || 'Could not reset'); } },
    gift: () => offerGift(), watchEggs: () => window.__watchEggs(), closeCard: () => { sfx('tap'); setFocus(null); },
    photo: takePhoto, momentPostcard: (img, text, tag, ts) => { const who = fishes.list.filter((f) => f.name && text.includes(f.name)).sort((a, b) => text.indexOf(a.name) - text.indexOf(b.name))[0]; return takePhoto({ img, title: who ? `${who.name}${tag ? ' · ' + tag.replace(/^\S+\s/, '') : ''}` : (tag.replace(/^\S+\s/, '') || 'A moment in the tank'), line: text, ts }); }, pushState, pushToggle, pushTest, recoveryKey: async () => {
      try {
        const k = await ensureRecoveryKey(), old = /^[A-Z0-9]{4}-[A-Z0-9]{4}/i.test(k) && !/^[a-z]+-[a-z]+-[a-z]+-[a-z]+$/.test(k);
        if (!old) { await ui.dialog({ title: 'Your recovery key', text: 'Four words that sign you back in to your tank on a new phone. Write them down somewhere safe.', lines: [k], ok: 'Done' }); return; }
        // an older key of letters and numbers: it still works, and can be swapped for four easy words
        const swap = await ui.dialog({ title: 'Your recovery key', text: 'This older key still works. Want an easier one? You get four simple words instead, and this key stops working.', lines: [k], ok: 'Get four words', cancel: 'Keep this one' });
        if (!swap) return; const n = await newRecoveryKey();
        await ui.dialog({ title: 'Your new key', text: 'Write these four words down. The old key no longer works.', lines: [n], ok: 'Done' });
      } catch (e) { ui.toast(e.message); }
    },
    saveLook: async ({ avatar, name }) => {
      if (!game.shared) { saveSoloLook(avatar); return; }
      const me = game.members?.find((x) => x.id === game.you.userId); const r = await api('/api/profile', { name: name || me?.name || 'Guest', avatar });
      if (me) { me.avatar = r.avatar ?? avatar; if (r.name) me.name = r.name; }
    },
    backupText: async () => { const d = await api('/api/export'), text = await backupToText(d); try { await navigator.clipboard.writeText(text); ui?.toast('Backup copied. Paste it into Notes or a message to yourself.', 4200); } catch { await ui.dialog({ title: 'Your backup', text: 'Select all of this text, copy it, and keep it somewhere safe.', ok: 'Done', input: { max: 400000, placeholder: '', value: text } }); } },
    backup: async () => { try { const d = await api('/api/export'), url = URL.createObjectURL(new Blob([JSON.stringify(d)], { type: 'application/json' })), a = document.createElement('a'); a.href = url; a.download = 'our-tank-backup.json'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); ui.toast('Backup saved'); } catch (e) { ui.toast(e.message || 'Could not make a backup'); } },
    deleteMe: async () => { const yes = await ui.dialog({ title: 'Delete my data?', text: 'This removes you from the tank and deletes your account. If you are the last player, the tank is deleted too. It cannot be undone. Download a backup first if you might want it back.', ok: 'Delete everything', cancel: 'Keep', danger: true }); if (!yes) return; try { await api('/api/me', null, 'DELETE'); try { localStorage.clear(); } catch { /* storage unavailable */ } location.href = '/'; } catch (e) { ui.toast(e.message || 'Could not delete'); } },
    leaveTank: async () => { const yes = await ui.dialog({ title: 'Leave this tank?', text: 'Your seat opens up for someone else. You can join another tank afterwards.', ok: 'Leave', cancel: 'Stay', danger: true }); if (!yes) return; try { await leaveTankNow(); location.href = '/'; } catch (e) { ui.toast(e.message); } },
    quality: () => stage.quality, cycleQuality: () => stg.setQuality((stage.quality + 1) % 3), replayTutorial: () => tut.replay(),
  } });
  window.__ui = ui; syncWorld(); ui.setMembers();
  // lighting follows the clock unless you picked a time yourself (?tod=… or the pill)
  // the light follows the phone's clock and drifts on its own while you play; the picker only exists for ?tod= or ?dev testing
  const phase = () => { const h = new Date().getHours(); return h >= 5 && h < 11 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night'; };
  document.querySelectorAll('[data-tod]').forEach((b) => b.addEventListener('click', () => { tune(b.dataset.tod); fishes.setNight(b.dataset.tod === 'night'); }));
  if (qs.get('tod')) setClockHour({ morning: 8, afternoon: 14, evening: 19, night: 23 }[qs.get('tod')]);
  fishes.setNight((qs.get('tod') ?? phase()) === 'night'); tune(qs.get('tod') ?? phase());
  if (!qs.get('tod')) { stg.setTod(phase()); let cur = phase(); setInterval(() => { const n = phase(); if (n !== cur) { cur = n; stg.setTod(n); fishes.setNight(n === 'night'); tune(n); } }, 30000); }
  // the first 15 seconds belong to the tank: nothing pops up by itself (the first touch ends that at once, so anything you open works straight away)
  if ((game.state?.flags?.tut ?? 0) < 5) window.__quietUntil = 0;      // (a brand-new tank: the opening card is the first thing, straight away)
  welcomeBack(); setTimeout(firstFishPrompt, 2500); setInterval(firstFishPrompt, 2000); requestAnimationFrame(frame); setTimeout(octoHello, 1200);
  // nudges: the subscription this phone holds is told to the server on every open (it may have been renewed, or the tank put back under new accounts) and whenever the browser renews it
  if (game.shared) { setTimeout(() => pushRegister().catch(() => {}), 4000); navigator.serviceWorker?.addEventListener('message', (e) => { if (e.data?.t === 'push-renew') pushRegister().catch(() => {}); }); }
}
window.__booted = false;
boot().then(() => { window.__booted = true; }).catch((e) => { console.error(e); window.__load?.fail(e?.message === 'timeout' ? (navigator.onLine === false ? 'You are offline. Tako Tank needs a connection to reach your shared tank.' : 'Your shared tank did not answer in time. It is safe on the server.') : 'Something went wrong starting the tank.'); });
window.__fishes = fishes; window.__doing = doingOf; window.__toys = toys; window.__decor = decor; window.__sea = { pack: seaPack, unpack: seaUnpack };      // for the drills: a seahorse's compact state as the other phones receive it
Fish3D.onLost = (f) => { console.error('animal had a broken position and was put back', f.fid, f.sk); window.__lost = (window.__lost ?? 0) + 1; game.track('animal_lost'); };      // seen, never silently invisible
const momentAt = new Map(); const momentOf = (kind, f, o = null) => { if (!f?.fid || !isDirector() || document.hidden || (game.state?.flags?.tut ?? 0) < 5) return;      /* (seen: the tank open in front of someone) */ const k = kind + ':' + f.fid, now = performance.now(); if (now - (momentAt.get(k) ?? -1e9) < 60e3) return; momentAt.set(k, now); game.dispatch({ t: 'moment', kind, fish: f.fid, ...(o?.fid ? { other: o.fid } : {}) }).catch?.(() => {}); };      // (the rules decide how often each is worth a line)
fishes.momentOf = momentOf; toys.onBall = (f) => momentOf('ball', f);
fishes.decor = decor; fishes.isLead = () => isDirector(); fishes.onMemo = (m) => { if (isDirector()) game.dispatch({ t: 'octoMemo', ...m }); }; fishes.onMoment = (m) => { if (isDirector() && !document.hidden) game.dispatch({ t: 'octoMoment', ...m }); }; fishes.onTouchDecor = (m) => { if (isDirector()) game.dispatch({ t: 'octoTouch', ...m }).catch(() => null); }; fishes.onMem = (m) => { if (isDirector()) game.dispatch({ t: 'octoMem', ...m }).catch(() => null); };      /* what an octopus learns, kept with the tank */ fishes.canMove = () => isDirector() && !wc.active && !play && !placing && !document.hidden; fishes.onMove = (m) => { game.dispatch({ t: 'octoMove', ...m }); };
window.__wc = wc; window.__changeWater = changeWater;
window.__focus = (i) => setFocus(i == null ? null : fishes.list[i]);
window.__eggs = eggSprites; window.__eggCare = eggCare; window.__showCard = (f) => { cardOpen = f.fid; showCard(f); }; window.__gifts = giftBags; window.__openGift = openGiftBag; window.__eggXY = () => [...eggSprites.values()].map((e) => { const v = e.group.position.clone().project(camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; });      // for the drills
window.__dropFoodForTest = (x, food = 'crab') => { game.feedFood = food; return dropFood(x); };
window.__tank = { fishes: fishes.list, decor, game, setQuality: stg.setQuality, TOD, bokeh, scene, camera, renderer: stg.renderer };
// for checks that run the tank's clock themselves: the page's clock follows that simulated time while they do, so timers measured in real
// milliseconds (a visit to the glass, a fright) last as long in the run as in play, however slow the machine running it
window.__simClock = (on) => { const P = performance; if (on && !P.__real) { const real = P.now.bind(P), t0 = real(), s0 = window.__t ?? 0; P.__real = real; P.now = () => t0 + ((window.__t ?? 0) - s0) * 1000; window.__simHold = true; }
  else if (!on && P.__real) { P.now = P.__real; delete P.__real; window.__simHold = false; } };
window.__lureStep = (n, dt = 0.1) => { for (let i = 0; i < n; i++) { lureTick(dt); fishes.update(dt, i * dt); fishes.list.forEach((f) => f.update(dt, rng, fishes.list)); } };
window.__sim = (n, dt = 1 / 30, drops = []) => {
  window.__eaten = 0; const oe = fishes.onEat; fishes.onEat = (f) => { window.__eaten++; oe?.(f); };
  let inside = 0, samples = 0, worstFish = 0; const W = Fish3D.world, o = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    for (const [at, x] of drops) if (i === at) fishes.drop(x);
    fishes.update(dt, i * dt); fishes.list.forEach((f) => f.update(dt, rng, fishes.list));
    for (const f of fishes.list) {
      const cp = Math.cos(f.pitch), R = f.radius, offs = f.species.move === 'jet' ? [-0.3, 0, 0.3] : [-0.8, -0.4, 0, 0.4, 0.8];      // an octopus is solid only in its mantle and head: its arms drape over things
      for (const off of offs) { p.set(f.pos.x + cp * Math.cos(f.heading) * R * off, f.pos.y + Math.sin(f.pitch) * R * off, f.pos.z - cp * Math.sin(f.heading) * R * off); samples++; o.set(0, 0, 0); if (W.push(p, f.cr * 0.7, o)) inside++; }
      for (const q of fishes.list) if (q !== f) { const d = Math.hypot(f.pos.x - q.pos.x, f.pos.y - q.pos.y, (f.pos.z - q.pos.z) * 1.5), mn = Math.max(0.5, 0.42 * (f.radius + q.radius)); worstFish = Math.max(worstFish, 1 - d / mn); }
    }
  }
  return { eaten: window.__eaten, flakesLeft: fishes.flakes.length, bodySamplesTouchingDecor: inside, ofSamples: samples, pct: +(100 * inside / samples).toFixed(2), worstFishOverlap: +worstFish.toFixed(3), chasing: fishes.list.filter((f) => f.flake).length };
};

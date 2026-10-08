// Quiet, synthesized sound: no audio files. Starts after the first tap (browser rule) and can be switched off.
let ctx = null, master = null, on = true, ambient = null;
try { on = localStorage.getItem('ourtank.sound') !== '0'; } catch { /* default on */ }

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = on ? 0.5 : 0; master.connect(ctx.destination);
  startAmbient(); return ctx;
}
function startAmbient() {                        // soft water: low-passed noise that drifts, plus a faint filter hum
  const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; const g = ctx.createGain(); g.gain.value = 0.16;
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.11; lg.gain.value = 180; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
  src.connect(lp); lp.connect(g); g.connect(master); src.start();
  const hum = ctx.createOscillator(), hg = ctx.createGain(); hum.type = 'sine'; hum.frequency.value = 58; hg.gain.value = 0.012; hum.connect(hg); hg.connect(master); hum.start();
  ambient = { g, hg };
}
function tone(freq, t0, dur, { type = 'sine', vol = 0.2, to = null } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime + t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + t0 + dur);
  g.gain.setValueAtTime(0.0001, ctx.currentTime + t0); g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + dur);
  o.connect(g); g.connect(master); o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + dur + 0.05);
}
function noise(t0, dur, freq, vol) {
  const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource(); s.buffer = buf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; const g = ctx.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(master); s.start(ctx.currentTime + t0);
}
const SFX = {
  tap: () => tone(620, 0, 0.07, { vol: 0.08, to: 880 }),
  open: () => tone(440, 0, 0.1, { vol: 0.07, to: 660 }),
  splash: () => { noise(0, 0.35, 1800, 0.18); tone(300, 0, 0.18, { vol: 0.07, to: 120 }); },
  eat: () => tone(900 + Math.random() * 300, 0, 0.05, { vol: 0.06, to: 500 }),
  coin: () => { tone(880, 0, 0.12, { vol: 0.12 }); tone(1320, 0.07, 0.2, { vol: 0.1 }); },
  buy: () => { tone(523, 0, 0.12, { vol: 0.12 }); tone(659, 0.09, 0.12, { vol: 0.12 }); tone(784, 0.18, 0.25, { vol: 0.12 }); },
  place: () => { tone(220, 0, 0.12, { vol: 0.14, type: 'triangle', to: 150 }); noise(0, 0.12, 700, 0.1); },
  level: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.35, { vol: 0.12, type: 'triangle' })),
  arrive: () => { noise(0, 0.5, 1200, 0.16); [392, 523, 659].forEach((f, i) => tone(f, 0.1 + i * 0.1, 0.3, { vol: 0.1 })); },
  error: () => tone(200, 0, 0.16, { vol: 0.1, type: 'square', to: 150 }),
  wipe: () => noise(0, 0.12, 2600, 0.05),
};
export const sfx = (name) => { if (!on) return; if (!ensure()) return; if (ctx.state === 'suspended') ctx.resume(); try { SFX[name]?.(); } catch { /* audio is optional */ } };
export const soundOn = () => on;
export function setSound(v) {
  on = v; try { localStorage.setItem('ourtank.sound', v ? '1' : '0'); } catch { /* ignore */ }
  if (v) { ensure(); ctx?.resume(); }
  if (master) master.gain.setTargetAtTime(v ? 0.5 : 0, ctx.currentTime, 0.1);
}
// first tap anywhere unlocks audio so the ambient bed can start
addEventListener('pointerdown', () => { if (on) { ensure(); ctx?.resume(); } }, { once: true });
export const haptic = (ms = 10) => { try { navigator.vibrate?.(ms); } catch { /* not supported on iOS Safari */ } };

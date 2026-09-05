// Tiny synth for the host screen. Everything is an oscillator with an envelope;
// no audio files to ship. Created lazily on the first user gesture.
let ctx = null, master = null;

function ensure() {
  if (ctx) return true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.18; master.connect(ctx.destination);
  } catch { return false; }
  return true;
}
export function unlockAudio() { if (ensure() && ctx.state === 'suspended') ctx.resume(); }

function tone(freq, dur, { type = 'square', vol = 1, slide = 0, delay = 0 } = {}) {
  if (!ensure()) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

const SFX = {
  cast:     () => tone(600, 0.25, { type: 'triangle', slide: -400 }),
  splash:   () => { tone(220, 0.12, { type: 'sawtooth', vol: 0.4, slide: -120 }); tone(900, 0.08, { type: 'triangle', vol: 0.3, delay: 0.03 }); },
  bite:     () => { tone(880, 0.07); tone(1320, 0.09, { delay: 0.08 }); },
  hooked:   () => tone(440, 0.12, { type: 'triangle', slide: 300 }),
  zone:     () => tone(1000, 0.04, { type: 'triangle', vol: 0.3 }),
  tugwarn:  () => tone(300, 0.08, { type: 'square', vol: 0.5 }),
  tug:      () => tone(520, 0.1, { type: 'square', vol: 0.7 }),
  pullhit:  () => { tone(660, 0.08); tone(990, 0.12, { delay: 0.07 }); },
  pullmiss: () => tone(150, 0.25, { type: 'sawtooth', vol: 0.5, slide: -60 }),
  snap:     () => { tone(180, 0.3, { type: 'sawtooth', slide: -120 }); tone(90, 0.4, { type: 'square', vol: 0.5, delay: 0.1 }); },
  lost:     () => tone(330, 0.3, { type: 'triangle', slide: -150 }),
  caught:   () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, { type: 'triangle', delay: i * 0.09 })),
  bigcatch: () => [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.2, { type: 'triangle', delay: i * 0.1 })),
  buy:      () => { tone(1200, 0.06); tone(1600, 0.1, { delay: 0.06 }); },
  sold:     () => [900, 1200, 1500, 1200, 1800].forEach((f, i) => tone(f, 0.07, { delay: i * 0.05 })),
  nope:     () => tone(200, 0.15, { type: 'square', vol: 0.4 }),
  ui:       () => tone(700, 0.04, { type: 'triangle', vol: 0.4 }),
  open:     () => tone(500, 0.08, { type: 'triangle', slide: 200 }),
  close:    () => tone(500, 0.08, { type: 'triangle', slide: -200 }),
  dock:     () => { tone(330, 0.1, { type: 'triangle' }); tone(440, 0.15, { type: 'triangle', delay: 0.1 }); },
  sail:     () => { tone(440, 0.1, { type: 'triangle' }); tone(330, 0.15, { type: 'triangle', delay: 0.1 }); },
  newday:   () => [659, 784, 988].forEach((f, i) => tone(f, 0.3, { type: 'sine', vol: 0.6, delay: i * 0.18 })),
  holdfull: () => tone(240, 0.12, { type: 'square', vol: 0.4 }),
  join:     () => { tone(660, 0.1, { type: 'triangle' }); tone(880, 0.16, { type: 'triangle', delay: 0.1 }); },
  ready:    () => tone(990, 0.1, { type: 'triangle' }),
  count:    () => tone(880, 0.08, { type: 'square', vol: 0.5 }),
  go:       () => tone(1320, 0.3, { type: 'square', vol: 0.6 }),
  weather:  () => [392, 494].forEach((f, i) => tone(f, 0.35, { type: 'sine', vol: 0.5, delay: i * 0.2 })),
  thunder:  () => { tone(60, 1.2, { type: 'sawtooth', vol: 0.5, slide: -30 }); tone(45, 1.6, { type: 'square', vol: 0.35, slide: -20, delay: 0.15 }); },
};
export function sfx(name) { SFX[name]?.(); }

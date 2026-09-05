// Weather: clear, overcast, rain, storm and snow. Lives in shared state so it is saved, deterministic (rand(state)) and
// visible to the phones. The renderer only reads it; the rules use the modifiers.
import { rand } from './fishing.js';
import { seasonOf } from './world.js';

// dim: counts as low light for fish that only bite at night.
// favors: species weight multipliers. wait/window: bite timing multipliers.
// sky: how much daylight the cloud cover eats (0 none, 1 all).
export const WEATHER = {
  clear:    { label: 'Clear',    wait: 1.0,  window: 1.0,  dim: false, sky: 0.0,  favors: {} },
  overcast: { label: 'Overcast', wait: 0.9,  window: 1.05, dim: true,  sky: 0.35, favors: { walleye: 1.4, pike: 1.3, catfish: 1.3, eel: 1.6, lantern: 1.4, cod: 1.3, zander: 1.4 } },
  rain:     { label: 'Rain',     wait: 0.75, window: 0.95, dim: true,  sky: 0.45, favors: { bass: 1.6, trout: 1.5, carp: 1.4, boot: 1.5, btrout: 1.5, salmon: 1.6, grayling: 1.3, seabass: 1.4 } },
  storm:    { label: 'Storm',    wait: 0.6,  window: 0.8,  dim: true,  sky: 0.6,  favors: { muskie: 1.8, sturgeon: 1.8, pike: 1.5, lantern: 1.5, tuna: 1.6, swordfish: 1.8, shark: 2, halibut: 1.4 } },
  snow:     { label: 'Snow',     wait: 1.2,  window: 1.0,  dim: true,  sky: 0.3,  favors: { burbot: 1.6, pike: 1.4, walleye: 1.2, cod: 1.5, herring: 1.4, halibut: 1.3 } },
};
export const WEATHER_KINDS = Object.keys(WEATHER);

// Per season: [kind, weight]. Winter turns rain into snow.
const TABLE = [
  [['clear', 38], ['overcast', 26], ['rain', 28], ['storm', 8]],
  [['clear', 52], ['overcast', 16], ['rain', 14], ['storm', 18]],
  [['clear', 34], ['overcast', 36], ['rain', 24], ['storm', 6]],
  [['clear', 30], ['overcast', 34], ['snow', 36]],
];

const RAMP = 0.12;   // intensity change per second (about 8 s to fully roll in)

export function initWeather() {
  return { kind: 'clear', next: null, intensity: 0, t: 40, wind: 0.3, flash: 0 };
}

/** Sanitise whatever came out of a save. */
export function coerceWeather(w) {
  const out = { ...initWeather(), ...(w || {}) };
  if (!WEATHER[out.kind]) out.kind = 'clear';
  if (out.next && !WEATHER[out.next]) out.next = null;
  out.intensity = Math.max(0, Math.min(1, +out.intensity || 0));
  return out;
}

function pickKind(state, avoid) {
  const rows = TABLE[seasonOf(state.time.day)].filter(r => r[0] !== avoid);
  const total = rows.reduce((s, r) => s + r[1], 0);
  let roll = rand(state) * total;
  for (const [k, w] of rows) { roll -= w; if (roll <= 0) return k; }
  return rows[rows.length - 1][0];
}

/** One fixed step. Pushes a 'weather' event when a new front settles in. */
export function tickWeather(state, dt) {
  const w = state.weather;
  w.t -= dt;
  w.flash = Math.max(0, w.flash - dt * 6);
  if (w.kind === 'storm' && w.intensity > 0.6 && rand(state) < dt * 0.09) { w.flash = 1; state.events.push({ n: 'thunder' }); }
  if (w.t <= 0 && !w.next) {
    w.next = pickKind(state, w.kind);
    w.wind = (rand(state) * 2 - 1) * (w.next === 'storm' ? 1 : 0.5);
  }
  if (w.next) {
    // Fade the current front out, swap, then fade the new one in.
    if (w.kind === 'clear' || w.intensity <= 0) {
      w.kind = w.next; w.next = null;
      w.t = 45 + rand(state) * 110;
      state.events.push({ n: 'weather', kind: w.kind });
    } else w.intensity = Math.max(0, w.intensity - RAMP * dt);
  }
  if (!w.next) {
    const target = w.kind === 'clear' ? 0 : 1;
    w.intensity += Math.sign(target - w.intensity) * Math.min(Math.abs(target - w.intensity), RAMP * dt);
  }
}

/** Modifiers the fishing rules apply. Scaled by how far the front has rolled in. */
export function weatherMods(state) {
  const w = state.weather || initWeather();
  const d = WEATHER[w.kind] || WEATHER.clear, k = w.intensity;
  return {
    kind: w.kind, k,
    wait: 1 + (d.wait - 1) * k,
    window: 1 + (d.window - 1) * k,
    dim: d.dim && k > 0.5,
    favor: id => 1 + ((d.favors[id] || 1) - 1) * k,
    sky: d.sky * k,
  };
}

/** Light after cloud cover, 0..1. The renderer and the rules both use this. */
export function effectiveLight(light, state) {
  const m = weatherMods(state);
  return light * (1 - m.sky);
}

export const weatherLabel = kind => (WEATHER[kind] || WEATHER.clear).label;

// The fishing minigame. Pure: takes state pieces + inputs, mutates the fishing object,
// pushes events. No DOM, no network, no Math.random (uses the seeded rand).
import { FISH } from '../shared/catalog.js';
import { zoneAt, seasonOf, isNight } from './world.js';

/** Seeded PRNG (mulberry32) living in state.seed so a session can be replayed. */
export function rand(state) {
  state.seed = (state.seed + 0x6D2B79F5) | 0;
  let t = state.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const PULL_BY_TIER = [0, 0.22, 0.34, 0.46, 0.6];       // tension gain per second out of zone
const SPEED_BY_TIER = [0, 0.8, 1.05, 1.3, 1.55];        // fish agility multiplier

/** Cast power is a triangle wave so holding longer is not always better. */
export function castPower(t) {
  const x = (t / 0.75) % 2;
  return x < 1 ? x : 2 - x;
}

export function pickFish(state, x, y, gear) {
  const zone = zoneAt(x, y);
  const season = seasonOf(state.time.day);
  const night = isNight(state.time.minute);
  const wx = gear.wx || { dim: false, favor: () => 1 };
  // Low light from cloud cover lets night biters show up by day, at half weight.
  const pool = FISH.filter(f =>
    f.zones.includes(zone) &&
    (f.seasons === 'all' || f.seasons.includes(season)) &&
    (f.time === 'any' || (f.time === 'night' ? (night || wx.dim) : !night)));
  const weights = pool.map(f => f.rarity * (f.tier >= 3 ? 1 + gear.rare : 1) * wx.favor(f.id) * (f.time === 'night' && !night ? 0.5 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rand(state) * total, f = pool[pool.length - 1];
  for (let i = 0; i < pool.length; i++) { roll -= weights[i]; if (roll <= 0) { f = pool[i]; break; } }
  // Weight skews small; big ones are the story you tell later.
  const w = f.w[0] + (f.w[1] - f.w[0]) * Math.pow(rand(state), 1.7);
  const weight = Math.round(w * 100) / 100;
  const price = Math.max(1, Math.round(weight * f.ppk * (1 + f.tier * 0.15)));
  return { id: f.id, name: f.name, weight, price, tier: f.tier, behavior: f.behavior, color: f.color, zone };
}

export function startReel(f, fish, gear, state) {
  f.stage = 'reel';
  f.fish = fish;
  f.fpos = 0.5; f.ftarget = 0.5; f.fvel = 0; f.retarget = 0.2;
  f.zpos = 0.5; f.zvel = 0;
  f.zsize = Math.max(0.16, gear.zone - fish.tier * 0.02);
  f.prog = 0.3; f.tension = 0.15;
  f.tug = null;
  f.nextTug = fish.tier >= 2 ? 1.6 + rand(state) * 1.6 : Infinity;
  f.inZone = false; f.time = 0;
}

/**
 * One fixed step of the reel. Returns 'caught' | 'lost' | null.
 * held: reel button down. pulled: a tug-tap happened this step.
 */
export function tickReel(f, held, pulled, dt, gear, state, events, seat) {
  const fish = f.fish, tier = fish.tier;
  f.time += dt;

  // Fish AI: pick a new target on a behaviour-specific cadence, then chase it.
  f.retarget -= dt;
  let accel = 1.4;
  if (f.retarget <= 0) {
    const r = rand(state);
    if (fish.behavior === 'calm') { f.ftarget = 0.1 + r * 0.8; f.retarget = 1.2 + rand(state) * 1.3; }
    else if (fish.behavior === 'darter') { f.ftarget = 0.05 + r * 0.9; f.retarget = 0.35 + rand(state) * 0.7; }
    else { f.ftarget = r < 0.7 ? r * 0.35 : 0.65 + r * 0.3; f.retarget = 1.4 + rand(state) * 1.2; }
  }
  if (fish.behavior === 'darter') accel = 5.5; else if (fish.behavior === 'diver') accel = 2.6;
  f.fvel += (f.ftarget - f.fpos) * accel * SPEED_BY_TIER[tier] * dt;
  f.fvel *= 0.95;
  f.fpos += f.fvel * dt;
  if (f.fpos < 0) { f.fpos = 0; f.fvel = Math.abs(f.fvel) * 0.5; }
  if (f.fpos > 1) { f.fpos = 1; f.fvel = -Math.abs(f.fvel) * 0.5; }

  // Catch zone: holding lifts it, releasing lets it sink. Soft bounce at the ends.
  f.zvel += (held ? 2.6 : -2.6) * dt;
  f.zvel *= 0.985;
  f.zpos += f.zvel * dt;
  const half = f.zsize / 2;
  if (f.zpos < half) { f.zpos = half; f.zvel = -f.zvel * 0.25; }
  if (f.zpos > 1 - half) { f.zpos = 1 - half; f.zvel = -f.zvel * 0.25; }

  const inZone = Math.abs(f.fpos - f.zpos) <= half;
  if (inZone !== f.inZone) { f.inZone = inZone; if (inZone) events.push({ n: 'zone', seat }); }
  if (inZone) {
    f.prog += gear.rate * dt;
    f.tension -= 0.22 * dt;
  } else {
    f.prog -= 0.2 * (1 + tier * 0.12) * dt;
    f.tension += PULL_BY_TIER[tier] * gear.lineMult * dt;
  }

  // Tugs: bigger fish yank the line. Warn, then a short window to tap Pull.
  if (!f.tug) {
    f.nextTug -= dt;
    if (f.nextTug <= 0) { f.tug = { phase: 'warn', t: 0.55 }; events.push({ n: 'tugwarn', seat }); }
    if (pulled) f.tension = Math.min(1, f.tension + 0.05); // mashing costs a little
  } else if (f.tug.phase === 'warn') {
    f.tug.t -= dt;
    if (pulled) f.tension = Math.min(1, f.tension + 0.05);
    if (f.tug.t <= 0) {
      const win = 0.42 + (1 - gear.lineMult) * 0.35;
      f.tug = { phase: 'open', t: win, dur: win };
      events.push({ n: 'tug', seat });
    }
  } else {
    f.tug.t -= dt;
    if (pulled) {
      f.prog += 0.13; f.tension = Math.max(0, f.tension - 0.18);
      events.push({ n: 'pullhit', seat });
      f.tug = null; f.nextTug = 2.2 + rand(state) * 2.6;
    } else if (f.tug.t <= 0) {
      f.tension += 0.24; f.prog -= 0.06;
      events.push({ n: 'pullmiss', seat });
      f.tug = null; f.nextTug = 2.0 + rand(state) * 2.2;
    }
  }

  f.prog = Math.max(0, Math.min(1, f.prog));
  f.tension = Math.max(0, Math.min(1, f.tension));
  if (f.tension >= 1) return 'lost';
  if (f.prog >= 1) return 'caught';
  return null;
}

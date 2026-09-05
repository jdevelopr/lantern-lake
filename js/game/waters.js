// The three waters: the lake (world.js), the river that leaves its north-east bay and
// the ocean the river runs into. Each is its own 640x360 map with its own zones,
// rocks, currents and gates. Pure functions; the renderer draws to the same numbers.
import { WORLD, LAKE, ROCKS, lakeNorm, zoneAt, clampToLake } from './world.js';

export const WATER_NAMES = { lake: 'Lantern Lake', river: 'Ash River', ocean: 'The Grey Sea' };

/* ---------------------------------------------------------- lake mouth --- */
// A channel from the lake's east shore to the map edge, where the river begins.
export const MOUTH = { x0: 552, y: 160, half: 17 };
const inMouth = (x, y) => x >= MOUTH.x0 && x <= WORLD.w && Math.abs(y - MOUTH.y) < MOUTH.half;

/* --------------------------------------------------------------- river --- */
// A winding channel from the left edge (the lake) to the right edge (the sea).
export const RIVER = { w: WORLD.w, h: WORLD.h };
export const riverCentre = x => 180 + 55 * Math.sin(x * 0.011 + 0.4) + 22 * Math.sin(x * 0.029 + 2.1);
export const riverHalf = x => 30 + 12 * Math.sin(x * 0.017 + 1.3) + 6 * Math.sin(x * 0.041);
const riverSlope = x => (riverCentre(x + 1) - riverCentre(x - 1)) / 2;
export const riverKind = x => { const h = riverHalf(x); return h < 31 ? 'rapids' : h > 40 ? 'pool' : 'run'; };
// Rocks sit in the rapids; f is the offset across the channel as a fraction of its width.
const RIVER_ROCK_SPEC = [[96, -0.35, 6], [118, 0.4, 5], [240, 0.1, 7], [262, -0.5, 5], [402, -0.3, 6], [430, 0.45, 6], [446, -0.05, 4], [560, 0.3, 5], [330, 0.6, 4], [180, -0.65, 4]];
export const RIVER_ROCKS = RIVER_ROCK_SPEC.map(([x, f, r]) => ({ x, y: Math.round(riverCentre(x) + f * riverHalf(x)), r }));

/* --------------------------------------------------------------- ocean --- */
// Cliffs and a beach on the left; the river arrives through a gap. A lighthouse islet
// stands off the north-east, a reef breaks the water to the south, and beyond a line
// the bottom drops away into the blue.
export const OCEAN = { shore: 46, channel: { y: 200, half: 26 }, islet: { x: 540, y: 82, r: 18 }, reef: { cx: 430, cy: 272, rx: 74, ry: 34 }, blueX: 320 };
const REEF_ROCK_SPEC = [0.1, 0.55, 1.0, 1.5, 2.0, 2.5, 2.95, 3.45, 3.9, 4.45, 4.95, 5.4, 5.9];
export const OCEAN_ROCKS = [
  { x: OCEAN.islet.x, y: OCEAN.islet.y, r: OCEAN.islet.r, isle: true },
  ...REEF_ROCK_SPEC.map((a, i) => ({ x: Math.round(OCEAN.reef.cx + Math.cos(a) * OCEAN.reef.rx), y: Math.round(OCEAN.reef.cy + Math.sin(a) * OCEAN.reef.ry), r: 4 + (i % 3) })),
];
const inChannel = y => Math.abs(y - OCEAN.channel.y) < OCEAN.channel.half;
export const reefNorm = (x, y) => ((x - OCEAN.reef.cx) / OCEAN.reef.rx) ** 2 + ((y - OCEAN.reef.cy) / OCEAN.reef.ry) ** 2;

/* ---------------------------------------------------------------- gates --- */
// need: the boat tier that can make the crossing. to: the water on the other side,
// and where you appear there.
export const GATES = {
  lake:  [{ to: 'river', x: 628, y: MOUTH.y, r: 22, need: 1, label: 'Sail upriver', spawn: { x: 34, y: 0, heading: 0 } }],
  river: [
    { to: 'lake', x: 12, y: 0, r: 26, need: 0, label: 'Back to the lake', spawn: { x: 588, y: MOUTH.y, heading: Math.PI } },
    { to: 'ocean', x: 628, y: 0, r: 26, need: 3, label: 'Out to sea', spawn: { x: 62, y: OCEAN.channel.y, heading: 0 } },
  ],
  ocean: [{ to: 'river', x: 14, y: OCEAN.channel.y, r: 30, need: 0, label: 'Back upriver', spawn: { x: 586, y: 0, heading: Math.PI } }],
};
// river gates and spawns sit on the channel's centre line
for (const g of GATES.river) g.y = Math.round(riverCentre(g.x));
GATES.lake[0].spawn.y = Math.round(riverCentre(GATES.lake[0].spawn.x));
GATES.ocean[0].spawn.y = Math.round(riverCentre(GATES.ocean[0].spawn.x));
export const BOAT_NEEDED = { 1: 'a Skiff', 3: 'a Trawler' };

export function gateAt(water, x, y) {
  for (const g of GATES[water] || []) if (Math.hypot(x - g.x, y - g.y) < g.r) return g;
  return null;
}

/* ------------------------------------------------------------- queries --- */
export function insideWater(water, x, y) {
  if (water === 'river') return x > 4 && x < WORLD.w - 4 && Math.abs(y - riverCentre(x)) < riverHalf(x) - 2;
  if (water === 'ocean') return y > 4 && y < WORLD.h - 4 && x < WORLD.w - 4 && (x > OCEAN.shore || (x > 6 && inChannel(y))) && Math.hypot(x - OCEAN.islet.x, y - OCEAN.islet.y) > OCEAN.islet.r + 2;
  return lakeNorm(x, y) < 1 || inMouth(x, y);
}

/** Keep a point on the water. Returns { x, y, hit }. */
export function clampWater(water, x, y, limit = 0.95) {
  if (water === 'river') {
    const c = riverCentre(x), hh = riverHalf(x) - 4;
    let hit = false, nx = x, ny = y;
    if (nx < 10) { nx = 10; hit = true; } if (nx > WORLD.w - 10) { nx = WORLD.w - 10; hit = true; }
    if (ny < c - hh) { ny = c - hh; hit = true; } else if (ny > c + hh) { ny = c + hh; hit = true; }
    return { x: nx, y: ny, hit };
  }
  if (water === 'ocean') {
    let hit = false, nx = x, ny = y;
    if (nx > WORLD.w - 8) { nx = WORLD.w - 8; hit = true; } if (ny < 8) { ny = 8; hit = true; } if (ny > WORLD.h - 8) { ny = WORLD.h - 8; hit = true; }
    if (nx < OCEAN.shore) {
      const c = OCEAN.channel, hh = c.half - 4;
      if (inChannel(ny)) { if (ny < c.y - hh) { ny = c.y - hh; hit = true; } else if (ny > c.y + hh) { ny = c.y + hh; hit = true; } if (nx < 10) { nx = 10; hit = true; } }
      else { nx = OCEAN.shore; hit = true; }
    }
    return { x: nx, y: ny, hit };
  }
  // lake: the mouth channel is a straight band; everything else is the ellipse
  if (x >= MOUTH.x0 - 6 && Math.abs(y - MOUTH.y) < MOUTH.half + 14 && lakeNorm(x, y) >= limit) {
    let hit = false, nx = x, ny = y;
    const hh = MOUTH.half - 4;
    if (ny < MOUTH.y - hh) { ny = MOUTH.y - hh; hit = true; } else if (ny > MOUTH.y + hh) { ny = MOUTH.y + hh; hit = true; }
    if (nx > WORLD.w - 8) { nx = WORLD.w - 8; hit = true; }
    return { x: nx, y: ny, hit };
  }
  return clampToLake(x, y, limit);
}

export function rocksFor(water) { return water === 'river' ? RIVER_ROCKS : water === 'ocean' ? OCEAN_ROCKS : ROCKS; }

export function zoneAtWater(water, x, y) {
  if (water === 'river') {
    const c = riverCentre(x), h = riverHalf(x);
    if (Math.abs(y - c) > h - 10) return 'bank';
    return riverKind(x);
  }
  if (water === 'ocean') {
    if (reefNorm(x, y) < 1.25) return 'reef';
    if (x < 150 || Math.hypot(x - OCEAN.islet.x, y - OCEAN.islet.y) < OCEAN.islet.r + 30) return 'shoal';
    if (x > OCEAN.blueX) return 'blue';
    return 'open';
  }
  if (inMouth(x, y) && lakeNorm(x, y) >= 0.72) return 'open';
  return zoneAt(x, y);
}

/**
 * Water movement added to the boat's own: the river pushes downstream (harder in the
 * rapids, gently in the pools, slack by the banks); the sea has a slow swell that grows
 * with the weather. t is time in seconds; k is the weather intensity.
 */
export function currentAt(water, x, y, t, kind = 'clear', k = 0) {
  if (water === 'river') {
    const kindHere = riverKind(x), sp = kindHere === 'rapids' ? 30 : kindHere === 'pool' ? 8 : 16;
    const edge = Math.abs(y - riverCentre(x)) / riverHalf(x), slack = edge > 0.7 ? 0.55 : 1;
    const dy = riverSlope(x), len = Math.hypot(1, dy);
    return { vx: sp * slack / len, vy: sp * slack * dy / len };
  }
  if (water === 'ocean') {
    const storm = kind === 'storm' ? 1 + 2.2 * k : kind === 'rain' ? 1 + 0.6 * k : 1;
    return { vx: (6 * Math.sin(t * 0.5) - 2) * storm, vy: 5 * Math.cos(t * 0.37 + x * 0.01) * storm };
  }
  return { vx: 0, vy: 0 };
}

export const ZONE_LABELS = { shallows: 'Shallows', reeds: 'Reeds', open: 'Open water', deep: 'The deep', rapids: 'Rapids', pool: 'Pools', run: 'The run', bank: 'Undercut banks', shoal: 'Shoals', reef: 'The reef', blue: 'The deep blue' };

// World geometry and time. Pure functions; no DOM, no network.
import { DAY_MINUTES, SEASON_DAYS } from '../shared/protocol.js';

export const WORLD = { w: 640, h: 360 };
export const TOWN = { w: 1280, h: 360, ground: 296, square: { x0: 520, x1: 760, well: 640 } };

// The lake is an ellipse whose radius wobbles with the angle: layered sine lobes give
// a bay to the north-east, a broad western shore and a point to the south-east.
export const LAKE = { cx: 336, cy: 192, rx: 262, ry: 138 };
export const DEEP = { cx: 372, cy: 178, rx: 112, ry: 54 };
const LOBES = [[2, 0.092, 3.06], [3, 0.055, 4.46], [5, 0.041, 0.91], [7, 0.038, 2.76], [11, 0.014, 0.49]];
export function shoreScale(theta) {
  let s = 1;
  for (const [f, a, p] of LOBES) s += a * Math.sin(f * theta + p);
  return s;
}
// Rocks block boats. The islet is a big rock with a tree on it; the renderer draws it as land.
export const ROCKS = [
  { x: 214, y: 118, r: 9 }, { x: 476, y: 262, r: 11 }, { x: 526, y: 104, r: 7 },
  { x: 156, y: 236, r: 8 }, { x: 386, y: 302, r: 6 }, { x: 250, y: 300, r: 5 },
  { x: 536, y: 168, r: 15, isle: true },
];
export const REEDS = [
  { x: 118, y: 154, r: 30 }, { x: 566, y: 206, r: 32 }, { x: 306, y: 318, r: 26 }, { x: 438, y: 66, r: 24 },
];
// Pier sticks out from the south shore; boats dock at its tip.
export const DOCK = { x: 170, y: 282, r: 24, pierX: 164, pierTop: 290, pierBottom: 332, spawn: { x: 170, y: 262 } };

// The town: a harbour front by the pier, a street of shops and houses, a square with a
// well in the middle, a chapel, and a lane that ends at a fence. x is the door centre
// (gameplay); cx and w are the facade the renderer draws. `house` entries have a
// resident instead of a menu; `filler` entries are scenery only.
export const BUILDINGS = [
  { id: 'dock',       x: 70,   w: 0,   label: 'To the lake' },
  { id: 'boatyard',   x: 236,  cx: 200,  w: 170, label: 'Boatyard',   color: '#a8b4a0', roof: '#5f6f5a' },
  { id: 'fishmonger', x: 380,  cx: 370,  w: 110, label: 'Fishmonger', color: '#7f9cc0', roof: '#4d6a8f' },
  { id: 'house1',     x: 486,  cx: 478,  w: 62,  label: "Marla's house",   house: true },
  { id: 'house2',     x: 792,  cx: 798,  w: 66,  label: 'The Okafors',     house: true },
  { id: 'tackle',     x: 900,  cx: 900,  w: 130, label: 'Tackle',     color: '#c58a5a', roof: '#8a5a3a' },
  { id: 'house3',     x: 1010, cx: 1014, w: 64,  label: "Bram's cottage",  house: true },
  { id: 'chapel',     x: 1100, cx: 1100, w: 76,  label: '', filler: true },
  { id: 'house4',     x: 1192, cx: 1198, w: 68,  label: 'The Reyes home',  house: true },
];
export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));

// Interiors: a side-on room per building. The floor line is the town's ground line so
// the same walker works inside. `door` is where you appear; `spot` is the counter or the
// resident, where the big button does something. Widths are gameplay (walk limits);
// the renderer draws to them.
export const ROOMS = {
  fishmonger: { w: 512, door: 34, spot: 300, spotLabel: 'Sell fish',      ceil: 204,  keeper: 'Hesper' },
  tackle:     { w: 512, door: 34, spot: 318, spotLabel: 'Browse tackle',  ceil: 204,  keeper: 'Ansel' },
  boatyard:   { w: 600, door: 34, spot: 372, spotLabel: 'Browse boats',   ceil: 196,  keeper: 'Dov' },
  house1:     { w: 512, door: 34, spot: 262, spotLabel: 'Talk to Marla',  ceil: 204, keeper: 'Marla' },
  house2:     { w: 512, door: 34, spot: 300, spotLabel: 'Talk to Tunde',  ceil: 204, keeper: 'Tunde' },
  house3:     { w: 512, door: 34, spot: 286, spotLabel: 'Talk to Bram',   ceil: 204, keeper: 'Bram' },
  house4:     { w: 512, door: 34, spot: 292, spotLabel: 'Talk to Elena',  ceil: 204, keeper: 'Elena' },
};
export const ROOM_FLOOR = TOWN.ground;

/** < 1 inside the water; ~1 at the shoreline; grows outward. Radial, so clampToLake still works. */
export function lakeNorm(x, y) {
  const dx = (x - LAKE.cx) / LAKE.rx, dy = (y - LAKE.cy) / LAKE.ry;
  const s = shoreScale(Math.atan2(dy, dx));
  return (dx * dx + dy * dy) / (s * s);
}
export const deepNorm = (x, y) => ((x - DEEP.cx) / DEEP.rx) ** 2 + ((y - DEEP.cy) / DEEP.ry) ** 2;
export const insideLake = (x, y, margin = 1) => lakeNorm(x, y) < margin;

/** Push a point back inside the lake ellipse (scaled by `limit`). */
export function clampToLake(x, y, limit = 0.95) {
  const n = lakeNorm(x, y);
  if (n < limit) return { x, y, hit: false };
  const s = Math.sqrt(limit / n);
  return { x: LAKE.cx + (x - LAKE.cx) * s, y: LAKE.cy + (y - LAKE.cy) * s, hit: true };
}

export function zoneAt(x, y) {
  if (deepNorm(x, y) < 1) return 'deep';
  for (const r of REEDS) if (Math.hypot(x - r.x, y - r.y) < r.r + 8) return 'reeds';
  for (const r of ROCKS) if (r.isle && Math.hypot(x - r.x, y - r.y) < r.r + 16) return 'shallows';
  if (lakeNorm(x, y) > 0.72) return 'shallows';
  return 'open';
}

export const nearDock = (x, y) => Math.hypot(x - DOCK.x, y - DOCK.y) < DOCK.r;

/** 0 = deepest night, 1 = full day. */
export function lightAt(minute) {
  const h = minute / 60;
  if (h < 5) return 0;
  if (h < 7.5) return (h - 5) / 2.5;
  if (h < 18) return 1;
  if (h < 20.5) return 1 - (h - 18) / 2.5;
  return 0;
}
export const isNight = minute => lightAt(minute) < 0.45;
export const seasonOf = day => Math.floor((day - 1) / SEASON_DAYS) % 4;
export const dayOfSeason = day => ((day - 1) % SEASON_DAYS) + 1;
export { DAY_MINUTES };

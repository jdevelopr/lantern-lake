// World geometry and time. Pure functions; no DOM, no network.
import { DAY_MINUTES, SEASON_DAYS } from '../shared/protocol.js';

export const WORLD = { w: 640, h: 360 };
export const TOWN = { w: 960, h: 360, ground: 296 };

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

// Town buildings along a single street. x is the door centre.
export const BUILDINGS = [
  { id: 'dock',       x: 70,  w: 0,   label: 'To the lake' },
  { id: 'fishmonger', x: 330, w: 120, label: 'Fishmonger', color: '#7f9cc0', roof: '#4d6a8f' },
  { id: 'tackle',     x: 560, w: 140, label: 'Tackle',     color: '#c58a5a', roof: '#8a5a3a' },
  { id: 'boatyard',   x: 810, w: 160, label: 'Boatyard',   color: '#a8b4a0', roof: '#5f6f5a' },
];

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

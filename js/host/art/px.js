// Pixel maps. Sprites are hand-drawn as text: one character per pixel, '.' clear,
// every other character a palette key. Maps are parsed once, rasterised per palette
// through gfx.sprite (cached), and blitted whole so nothing lands off the grid.
import { sprite, R } from '../gfx.js';

/** Parse a template into rows. Throws if the rows are ragged, which is always a typo. */
export function pm(name, str) {
  const rows = str.split('\n').map(r => r.replace(/\s+$/, '')).filter(r => r.length);
  const w = rows[0].length;
  for (const r of rows) if (r.length !== w) throw new Error(`pixel map ${name}: ragged row "${r}" (${r.length} vs ${w})`);
  return rows;
}

/** Blit a map with its top-left at (x, y); flip mirrors it in place. */
export function blit(ctx, rows, pal, x, y, flip = false) {
  ctx.drawImage(sprite(rows, pal, flip), R(x), R(y));
}

/** Blit anchored: (ax, ay) inside the map lands on (x, y). Flip mirrors about the anchor. */
export function blitAt(ctx, rows, pal, x, y, ax, ay, flip = false) {
  const w = rows[0].length;
  ctx.drawImage(sprite(rows, pal, flip), R(x - (flip ? w - 1 - ax : ax)), R(y - ay));
}

/** Width and height of a map. */
export const size = rows => [rows[0].length, rows.length];

/** A map shifted right by n columns of clear pixels (for cheap variants). */
export const shift = (rows, n) => rows.map(r => '.'.repeat(n) + r.slice(0, r.length - n));

// Building helpers shared by the three town kits: tiled fills, roof slopes that are
// narrow at the ridge and wide at the eaves, gables, snow caps and small utilities.
import { sprite, R, scale, mix } from '../gfx.js';

export const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(R(x), R(y), R(w), R(h)); };
export const hline = (g, x, y, w, c) => rect(g, x, y, w, 1, c);
export const vline = (g, x, y, h, c) => rect(g, x, y, 1, h, c);

/** Fill (x, y, w, h) with a repeating map; the pattern is anchored at (ox, oy). */
export function fillTile(g, x, y, w, h, rows, pal, ox = 0, oy = 0) {
  const tw = rows[0].length, th = rows.length, img = sprite(rows, pal);
  g.save(); g.beginPath(); g.rect(R(x), R(y), R(w), R(h)); g.clip();
  const x0 = R(x) - (((R(x) - ox) % tw) + tw) % tw, y0 = R(y) - (((R(y) - oy) % th) + th) % th;
  for (let yy = y0; yy < y + h; yy += th) for (let xx = x0; xx < x + w; xx += tw) g.drawImage(img, xx, yy);
  g.restore();
}

/**
 * A pitched roof seen from the street: `pitch` rows tall, its top row `ridge` wide at the
 * centre and its bottom row spanning the wall plus the overhang on each side. Rows are
 * filled from a pattern (map + palette) so the tiles line up whatever the width.
 * Returns the ridge span so callers can put a cap or snow on it.
 */
export function roofSlope(g, { x, y, w, pitch, overhang = 6, ridge = null, rows, pal, ox = 0 }) {
  const eaveL = x - overhang, eaveW = w + overhang * 2;
  const ridgeW = ridge === null ? Math.max(8, w - pitch * 2) : ridge;
  const inset = (eaveW - ridgeW) / 2;
  const img = sprite(rows, pal), tw = rows[0].length, th = rows.length;
  let top = null;
  for (let i = 0; i < pitch; i++) {
    const t = pitch === 1 ? 1 : i / (pitch - 1);            // 0 at the ridge, 1 at the eaves
    const left = R(eaveL + inset * (1 - t)), width = R(eaveW - inset * 2 * (1 - t)), yy = y - pitch + i;
    if (top === null) top = { x: left, w: width, y: yy };
    g.save(); g.beginPath(); g.rect(left, yy, width, 1); g.clip();
    const x0 = left - (((left - ox) % tw) + tw) % tw, py = (((yy) % th) + th) % th;
    for (let xx = x0; xx < left + width; xx += tw) g.drawImage(img, 0, py, tw, 1, xx, yy, tw, 1);
    g.restore();
  }
  return { ...top, eaveL, eaveW, bottom: y - 1 };
}

/** A gable: a triangle with its apex at the top, `h` tall over a base `w` wide at (x, y). */
export function gable(g, x, y, w, h, rows, pal) {
  const img = sprite(rows, pal), tw = rows[0].length, th = rows.length;
  for (let i = 0; i < h; i++) {
    const t = i / (h - 1), width = Math.max(2, R(w * t)), left = R(x + (w - width) / 2), yy = y - h + i;
    g.save(); g.beginPath(); g.rect(left, yy, width, 1); g.clip();
    const x0 = left - (((left) % tw) + tw) % tw, py = ((yy % th) + th) % th;
    for (let xx = x0; xx < left + width; xx += tw) g.drawImage(img, 0, py, tw, 1, xx, yy, tw, 1);
    g.restore();
  }
}

/** Snow along the top of a slope: a soft cap on the ridge row and a lip over the eaves. */
export function snowCap(g, slope, depth = 3, col = '#eef2f6', shade = '#c8d4de') {
  rect(g, slope.x - 1, slope.y - depth, slope.w + 2, depth, col);
  rect(g, slope.x - 1, slope.y - depth, slope.w + 2, 1, '#ffffff');
  rect(g, slope.eaveL, slope.bottom - 1, slope.eaveW, 2, col); rect(g, slope.eaveL, slope.bottom + 1, slope.eaveW, 1, shade);
}

/** Icicles hanging from a line. */
export function icicles(g, x, y, w, seedStep = 5, col = '#d8ecf8', light = '#ffffff') {
  for (let xx = x + 2; xx < x + w - 2; xx += seedStep) {
    const len = 2 + ((xx * 7) % 4);
    rect(g, xx, y, 1, len, col); rect(g, xx + 1, y, 1, Math.max(1, len - 2), col); rect(g, xx, y, 1, 1, light);
  }
}

/** A blob of soft shadow on the wall under an eave or sill. */
export function eaveShadow(g, x, y, w, h = 3) {
  for (let i = 0; i < h; i++) rect(g, x, y + i, w, 1, `rgba(20,16,30,${0.28 - i * 0.08})`);
}

export { scale, mix };

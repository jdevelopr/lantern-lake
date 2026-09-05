// The lake scene: baked terrain per season, animated water, boats, fishing.
import { WORLD, LAKE, DEEP, ROCKS, REEDS, DOCK, lakeNorm, deepNorm, shoreScale, seasonOf } from '../game/world.js';
import { gearStats } from '../shared/catalog.js';
import { mkCanvas, R, hash, disc, ellipse, dith, mix, scale, rgb, text, sprite } from './gfx.js';

const W = WORLD.w, H = WORLD.h;

// Muted, filmic base colours. Lighting multiplies on top, so keep these mid-bright.
const SEASON = [
  { grass: '#5c8a4e', grass2: '#4b7340', grass3: '#6c9c5c', dirt: '#7a6448', dirt2: '#645037', canopy: '#4a8448', canopy2: '#33623a', canopyHi: '#6da05a', trunk: '#4a3626', bloom: '#e3a9bd', bloom2: '#f4d2dc',
    water: '#3e6f90', shallow: '#4d87a6', shallowHi: '#6ea6c0', deep: '#274b68', deep2: '#1f3c56', sand: '#c0ad7f', sandWet: '#9d8b63', reed: '#5f7d3c', reedHead: '#8a6a3a', lily: '#4f8f4c', rock: '#6a6f78', rock2: '#8c929c', rock3: '#b0b5bd', snow: null },
  { grass: '#4f7f3f', grass2: '#3f6934', grass3: '#63934d', dirt: '#7c6446', dirt2: '#655036', canopy: '#3e7a3c', canopy2: '#2b5a30', canopyHi: '#5e9a4e', trunk: '#46331f', bloom: null, bloom2: null,
    water: '#33668f', shallow: '#4680a4', shallowHi: '#6aa4c2', deep: '#22465f', deep2: '#1a384e', sand: '#cbb887', sandWet: '#a3906a', reed: '#4f7434', reedHead: '#8c6e3e', lily: '#3f8a45', rock: '#6a6f78', rock2: '#8c929c', rock3: '#b0b5bd', snow: null },
  { grass: '#8c7a48', grass2: '#74643a', grass3: '#a08a52', dirt: '#6f5a40', dirt2: '#5a4830', canopy: '#b0612e', canopy2: '#7e3e24', canopyHi: '#d0883c', trunk: '#4a3626', bloom: '#d8a24a', bloom2: '#e8c46a',
    water: '#355a78', shallow: '#456f8c', shallowHi: '#6a92aa', deep: '#233e56', deep2: '#1b3146', sand: '#b3a078', sandWet: '#8f7f5c', reed: '#8a7a3e', reedHead: '#6a4a2a', lily: '#7a7a3c', rock: '#6a6f78', rock2: '#8c929c', rock3: '#b0b5bd', snow: null },
  { grass: '#c3ccd3', grass2: '#aab6c0', grass3: '#dbe2e7', dirt: '#8e97a0', dirt2: '#767f88', canopy: '#2f4e42', canopy2: '#1f3830', canopyHi: '#c9d6de', trunk: '#3d3129', bloom: null, bloom2: null,
    water: '#4b6e88', shallow: '#5c7f98', shallowHi: '#8aa3b6', deep: '#2f4a60', deep2: '#253c50', sand: '#c8d0d6', sandWet: '#9fa9b2', reed: '#7d735c', reedHead: '#5a4a3a', lily: null, rock: '#6a6f78', rock2: '#8c929c', rock3: '#d8dde2', snow: '#e6ebef' },
];

// Cabins on the far shore: purely scenery, but their windows are lights at night.
export const CABINS = [
  { x: 84, y: 78, w: 30, h: 20, wall: '#6d4c34', roof: '#4a3a44' },
  { x: 560, y: 300, w: 34, h: 22, wall: '#5c5a52', roof: '#3f3a3a' },
];

/* ----------------------------------------------------------- terrain --- */
function tree(g, x, y, r, S, kind, seed) {
  // shadow
  ellipse(g, x + 2, y + 1, r + 1, Math.max(2, r >> 1), 'rgba(10,14,22,0.35)');
  if (kind === 'pine') {
    g.fillStyle = S.trunk; g.fillRect(x - 1, y - 2, 2, 4);
    const tiers = 3 + (r > 5 ? 1 : 0);
    for (let t = 0; t < tiers; t++) {
      const ty = y - 3 - t * (r - 1), tw = r + 1 - t;
      for (let i = 0; i < tw; i++) {
        g.fillStyle = S.canopy2; g.fillRect(x - (tw - i), ty - i, (tw - i) * 2 + 1, 1);
        g.fillStyle = S.canopy; g.fillRect(x - (tw - i) + 1, ty - i, Math.max(1, tw - i), 1);
      }
      if (S.snow) { g.fillStyle = S.snow; g.fillRect(x - 1, ty - tw + 1, 3, 1); g.fillRect(x - tw + 2, ty, tw - 1, 1); }
    }
    g.fillStyle = S.canopyHi; g.fillRect(x, y - 3 - tiers * (r - 1) + 1, 1, 2);
    return;
  }
  if (kind === 'bare') {
    g.fillStyle = S.trunk; g.fillRect(x - 1, y - r - 2, 2, r + 4);
    for (let i = 0; i < 4; i++) {
      const by = y - r + i * 2 - 1, dir = i % 2 ? 1 : -1;
      g.fillRect(x + (dir > 0 ? 1 : -3 - i), by, 3 + i, 1);
      g.fillRect(x + dir * (3 + i), by - 1, 1, 1);
    }
    if (S.snow) { g.fillStyle = S.snow; g.fillRect(x - 2, y - r - 3, 4, 1); }
    return;
  }
  g.fillStyle = S.trunk; g.fillRect(x - 1, y - 1, 3, 3);
  const cy = y - r;
  disc(g, x, cy + 1, r, S.canopy2);
  disc(g, x - 1, cy - 1, r - 1, S.canopy);
  // clumps and highlights on the lit (top-left) side
  for (let k = 0; k < r * 2; k++) {
    const a = hash(seed, k) * Math.PI * 2, d = hash(k, seed) * (r - 1);
    const px = R(x - 1 + Math.cos(a) * d), py = R(cy - 1 + Math.sin(a) * d);
    const lit = (px < x && py < cy) || hash(seed, k, 3) < 0.25;
    g.fillStyle = lit ? S.canopyHi : S.canopy2; g.fillRect(px, py, 2, 1);
  }
  if (S.bloom) for (let k = 0; k < 5; k++) {
    g.fillStyle = k % 2 ? S.bloom2 : S.bloom;
    g.fillRect(R(x - r + 1 + hash(seed, k, 7) * (r * 2 - 2)), R(cy - r + hash(k, seed, 7) * (r - 1)), 1, 1);
  }
  if (S.snow) { g.fillStyle = S.snow; g.fillRect(x - r + 2, cy - r + 1, r * 2 - 4, 1); g.fillRect(x - r + 1, cy - r + 2, 2, 1); }
}

function cabin(g, c, S) {
  const { x, y, w, h } = c;
  ellipse(g, x + w / 2 + 2, y + h + 1, w / 2 + 2, 3, 'rgba(10,14,22,0.35)');
  // walls with plank lines
  g.fillStyle = c.wall; g.fillRect(x, y, w, h);
  g.fillStyle = scale(c.wall, 0.8); for (let yy = y + 3; yy < y + h; yy += 3) g.fillRect(x, yy, w, 1);
  g.fillStyle = scale(c.wall, 1.15); g.fillRect(x, y, w, 1);
  // roof
  for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? c.roof : scale(c.roof, 1.25); g.fillRect(x - 3 + i, y - 5 + i, w + 6 - i * 2, 1); }
  g.fillStyle = scale(c.roof, 0.7); g.fillRect(x - 3, y - 1, w + 6, 1);
  if (S.snow) { g.fillStyle = S.snow; g.fillRect(x - 2, y - 5, w + 4, 2); }
  // chimney, door, window
  g.fillStyle = '#5a5250'; g.fillRect(x + w - 7, y - 9, 3, 6);
  g.fillStyle = '#2a2018'; g.fillRect(x + 4, y + h - 9, 6, 9);
  g.fillStyle = '#1f1710'; g.fillRect(x + w - 13, y + 5, 8, 7);
  g.fillStyle = '#3b3020'; g.fillRect(x + w - 12, y + 6, 6, 5);
  g.fillStyle = '#1f1710'; g.fillRect(x + w - 10, y + 6, 1, 5); g.fillRect(x + w - 12, y + 8, 6, 1);
}

function rockOnLand(g, x, y, r, S) {
  ellipse(g, x + 1, y + 1, r + 1, Math.max(1, r >> 1), 'rgba(10,14,22,0.3)');
  ellipse(g, x, y, r, Math.max(1, (r * 0.7) | 0), S.rock);
  ellipse(g, x - 1, y - 1, r - 1, Math.max(1, (r * 0.5) | 0), S.rock2);
  g.fillStyle = S.rock3; g.fillRect(x - r + 1, y - 1, 2, 1);
}

export function buildLakeBackground(season) {
  const S = SEASON[season];
  const [c, g] = mkCanvas(W, H);
  const img = g.createImageData(W, H), d = img.data;
  const put = (i, col) => { const [r, gg, b] = col; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255; };
  const lerpC = (a, b, t) => { t = Math.max(0, Math.min(1, t)); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
  const P = {};
  for (const k in S) if (S[k]) P[k] = rgb(S[k]);
  // Per-pixel terrain: grass with noise, sand ring, banded water.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, n = lakeNorm(x, y);
    if (n >= 1.1) {
      const nz = hash(x >> 2, y >> 2, 11);
      let col = P.grass;
      if (nz < 0.1) col = P.grass2; else if (nz > 0.94) col = P.grass3;
      // soft blotches of darker and lighter grass, dithered at the edges
      const blob = Math.sin(x * 0.021 + y * 0.013) + Math.sin(y * 0.033 - x * 0.009) + Math.sin((x + y) * 0.007);
      if (blob > 1.0) col = lerpC(col, P.grass2, (blob - 1.0) * 1.2);
      else if (blob < -1.2) col = lerpC(col, P.grass3, (-1.2 - blob) * 1.2);
      // darker towards the edges of the screen: the forest closes in
      const edge = Math.max(0, Math.min(1, (Math.min(x, W - x, y, H - y) - 14) / 60));
      col = col.map(v => v * (1 - 0.28 * (1 - edge) * 0.9));
      put(i, col);
    } else if (n >= 1) {
      // sand: dry outside, wet and darker at the water's edge, dithered between
      const t = (n - 1) / 0.1;
      put(i, lerpC(P.sandWet, P.sand, t * 1.4));
    } else {
      const dn = deepNorm(x, y);
      let col;
      if (dn < 0.72) col = lerpC(P.deep, P.deep2, (0.72 - dn) * 1.6);
      else if (dn < 1.05) col = lerpC(P.water, P.deep, (1.05 - dn) / 0.33);
      else if (n > 0.78) col = lerpC(P.water, P.shallow, (n - 0.78) / 0.22);
      else col = P.water;
      if (season === 3 && n > 0.9 && hash(x, y, 5) > 0.35) col = [0xb9, 0xc8, 0xd0];
      // subtle water noise
      if (hash(x >> 2, y >> 1, 9) < 0.06) col = col.map(v => v + 6);
      put(i, col);
    }
  }
  g.putImageData(img, 0, 0);

  // Dirt path from the boathouse to the bottom-left edge
  for (let t = 0; t < 1; t += 0.01) {
    const px = R(DOCK.pierX + 20 - t * 150 + Math.sin(t * 6) * 8), py = R(DOCK.pierBottom + 10 + t * 30);
    ellipse(g, px, py, 5, 2, S.dirt);
    if (hash(R(t * 100), 1) > 0.6) { g.fillStyle = S.dirt2; g.fillRect(px + R(hash(t * 100, 2) * 6 - 3), py, 1, 1); }
  }
  // Grass tufts, flowers, small stones
  for (let i = 0; i < 420; i++) {
    const x = R(hash(i, 21) * W), y = R(hash(i, 22) * H);
    if (lakeNorm(x, y) < 1.14) continue;
    const k = hash(i, 23);
    if (k < 0.55) { g.fillStyle = S.grass3; g.fillRect(x, y, 1, 1); g.fillRect(x + 1, y - 1, 1, 1); g.fillStyle = S.grass2; g.fillRect(x + 2, y, 1, 1); }
    else if (k < 0.8) { g.fillStyle = S.grass2; g.fillRect(x, y, 2, 1); }
    else if (k < 0.9 && S.bloom) { g.fillStyle = k < 0.85 ? S.bloom : S.bloom2; g.fillRect(x, y, 1, 1); }
    else if (k < 0.94) rockOnLand(g, x, y, 1 + (hash(i, 24) * 2 | 0), S);
    else if (S.snow && k > 0.97) { g.fillStyle = S.grass3; g.fillRect(x, y, 3, 1); }
  }
  // Cabins first so trees can overlap their edges
  for (const cb of CABINS) cabin(g, cb, S);
  // Trees: dense away from the water, none on the path or pier
  const trees = [];
  for (let i = 0; i < 420; i++) {
    const x = R(hash(i, 7) * W), y = R(hash(i, 8) * H);
    const n = lakeNorm(x, y);
    if (n < 1.16 || (x > 100 && x < 240 && y > 286) || (x < 140 && y < 110) || (x > 540 && y > 280)) continue;
    const edge = Math.min(x, W - x, y, H - y);
    if (n < 1.3 && hash(i, 9) < 0.7) continue;
    if (edge > 70 && hash(i, 12) < 0.5) continue;
    const r = 5 + Math.floor(hash(i, 10) * 4) + (edge < 40 ? 1 : 0);
    const kind = season === 3 ? (hash(i, 11) < 0.55 ? 'pine' : 'bare') : hash(i, 11) < 0.25 ? 'pine' : 'round';
    trees.push({ x, y, r, kind, i });
  }
  trees.sort((a, b) => a.y - b.y);
  for (const t of trees) tree(g, t.x, t.y, t.r, S, t.kind, t.i);
  // Bushes near the shore
  for (let i = 0; i < 40; i++) {
    const x = R(hash(i, 31) * W), y = R(hash(i, 32) * H), n = lakeNorm(x, y);
    if (n < 1.12 || n > 1.4 || (x > 100 && x < 240 && y > 280)) continue;
    ellipse(g, x, y, 3, 2, S.canopy2); ellipse(g, x - 1, y - 1, 2, 1, S.canopy);
    if (S.bloom && i % 3 === 0) { g.fillStyle = S.bloom; g.fillRect(x, y - 1, 1, 1); }
  }
  // Reeds and lily pads
  for (const rd of REEDS) for (let i = 0; i < 34; i++) {
    const a = hash(rd.x, i) * Math.PI * 2, dd = hash(i, rd.y) * rd.r;
    const x = R(rd.x + Math.cos(a) * dd), y = R(rd.y + Math.sin(a) * dd * 0.7);
    if (lakeNorm(x, y) > 0.99) continue;
    if (i % 3 === 0 && S.lily) {
      g.fillStyle = scale(S.lily, 0.8); g.fillRect(x - 2, y, 5, 2); g.fillStyle = S.lily; g.fillRect(x - 2, y - 1, 5, 2); g.fillStyle = S.water; g.fillRect(x + 1, y, 2, 1);
      if (i % 9 === 0 && S.bloom2) { g.fillStyle = S.bloom2; g.fillRect(x - 1, y - 1, 1, 1); }
    } else {
      const hgt = 6 + (hash(i, 3) * 4 | 0);
      g.fillStyle = S.reed; g.fillRect(x, y - hgt, 1, hgt + 1);
      g.fillStyle = scale(S.reed, 1.2); g.fillRect(x, y - hgt + 2, 1, 2);
      if (i % 2) { g.fillStyle = S.reedHead; g.fillRect(x, y - hgt - 2, 1, 3); }
    }
  }
  // Rocks in the water and the islet
  for (const rk of ROCKS) {
    if (rk.isle) {
      ellipse(g, rk.x, rk.y, rk.r + 3, (rk.r + 3) * 0.75 | 0, S.sandWet);
      ellipse(g, rk.x, rk.y, rk.r + 1, (rk.r + 1) * 0.75 | 0, S.sand);
      ellipse(g, rk.x, rk.y - 1, rk.r - 2, (rk.r - 2) * 0.7 | 0, S.grass);
      ellipse(g, rk.x - 1, rk.y - 2, rk.r - 4, (rk.r - 4) * 0.6 | 0, S.grass3);
      rockOnLand(g, rk.x + 6, rk.y + 3, 2, S);
      tree(g, rk.x - 3, rk.y - 1, 5, S, season === 3 ? 'pine' : 'round', 99);
      tree(g, rk.x + 5, rk.y - 4, 3, S, 'pine', 98);
      continue;
    }
    const ry = rk.r * 0.7 | 0;
    ellipse(g, rk.x, rk.y + 2, rk.r + 1, ry, scale(S.water, 0.8));           // wet shadow
    ellipse(g, rk.x, rk.y, rk.r, ry, scale(S.rock, 0.75));
    ellipse(g, rk.x, rk.y - 1, rk.r - 1, Math.max(1, ry - 1), S.rock);
    ellipse(g, rk.x - 1, rk.y - 2, rk.r - 3, Math.max(1, ry - 2), S.rock2);
    g.fillStyle = S.rock3; g.fillRect(rk.x - rk.r + 2, rk.y - 3, 2, 1); g.fillRect(rk.x - 1, rk.y - ry, 2, 1);
    g.fillStyle = scale(S.rock, 0.6); g.fillRect(rk.x + 1, rk.y, 2, 1);      // a crack
    if (S.snow) { g.fillStyle = S.snow; g.fillRect(rk.x - rk.r + 2, rk.y - ry, rk.r * 2 - 4, 1); }
    // pale waterline where the water laps the stone
    g.fillStyle = scale(S.shallowHi, 1.05); g.fillRect(rk.x - rk.r, rk.y + ry - 1, rk.r * 2 + 1, 1);
  }
  drawPier(g, S);
  return c;
}

function drawPier(g, S) {
  const px = DOCK.pierX, top = DOCK.pierTop, bot = DOCK.pierBottom;
  // posts and their reflections
  for (const ox of [-8, 5]) for (let y = top; y < bot; y += 9) {
    g.fillStyle = '#2f2118'; g.fillRect(px + ox, y, 3, 8);
    g.fillStyle = '#4c3626'; g.fillRect(px + ox + 1, y, 1, 8);
    g.fillStyle = 'rgba(15,20,30,0.35)'; g.fillRect(px + ox, y + 8, 3, 2);
  }
  // planks
  for (let y = top; y < bot; y += 3) {
    g.fillStyle = (y / 3 | 0) % 2 ? '#8a5f42' : '#7a5238'; g.fillRect(px - 7, y, 14, 2);
    g.fillStyle = '#4a3020'; g.fillRect(px - 7, y + 2, 14, 1);
    if (hash(y, 4) > 0.7) { g.fillStyle = '#5c3f2b'; g.fillRect(px - 5 + (hash(y, 5) * 9 | 0), y, 1, 2); }
  }
  g.fillStyle = '#9c7050'; g.fillRect(px - 7, top, 14, 1);
  // lantern post, crate, rope
  g.fillStyle = '#2a1e16'; g.fillRect(px + 7, top - 2, 1, 12); g.fillRect(px + 5, top - 3, 4, 1);
  g.fillStyle = '#4a3a2a'; g.fillRect(px - 6, bot - 14, 5, 5); g.fillStyle = '#6a5438'; g.fillRect(px - 5, bot - 13, 3, 3);
  g.fillStyle = '#8a7a58'; g.fillRect(px + 8, top + 20, 1, 6); g.fillRect(px + 8, top + 26, 3, 1);
  // boathouse
  const bx = px + 12, by = bot - 6;
  ellipse(g, bx + 14, by + 22, 20, 4, 'rgba(10,14,22,0.35)');
  g.fillStyle = '#5a4030'; g.fillRect(bx, by, 28, 22);
  g.fillStyle = '#4a3324'; for (let y = by + 3; y < by + 22; y += 3) g.fillRect(bx, y, 28, 1);
  g.fillStyle = '#6c4e3a'; g.fillRect(bx, by, 28, 1);
  for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#7a3a34' : '#8f4740'; g.fillRect(bx - 3 + i, by - 7 + i, 34 - i * 2, 1); }
  g.fillStyle = '#5a2a28'; g.fillRect(bx - 3, by - 1, 34, 1);
  if (S.snow) { g.fillStyle = S.snow; g.fillRect(bx - 2, by - 7, 32, 2); }
  g.fillStyle = '#1f1710'; g.fillRect(bx + 10, by + 6, 8, 16);           // big door
  g.fillStyle = '#3b2c1c'; g.fillRect(bx + 11, by + 7, 6, 14);
  g.fillStyle = '#1f1710'; g.fillRect(bx + 3, by + 5, 5, 5);             // window
  g.fillStyle = '#2f2418'; g.fillRect(bx + 4, by + 6, 3, 3);
  g.fillStyle = '#e0d2b0'; g.fillRect(bx + 20, by + 5, 6, 4); g.fillStyle = '#2a1d10'; g.fillRect(bx + 21, by + 6, 4, 2); // sign
}

/* ------------------------------------------------------------- water --- */
// Shoreline sample points for foam.
const SHORE = [];
for (let i = 0; i < 420; i++) {
  const th = (i / 420) * Math.PI * 2, s = shoreScale(th) * 0.985;
  SHORE.push({ x: LAKE.cx + Math.cos(th) * LAKE.rx * s, y: LAKE.cy + Math.sin(th) * LAKE.ry * s, i });
}
const FISHSHADOWS = Array.from({ length: 7 }, (_, i) => ({ i, t: hash(i, 77) * 100 }));

export function drawWater(ctx, state, clock, light, wx, reduceMotion) {
  const S = SEASON[seasonOf(state.time.day)];
  const hi = S.shallowHi, wind = wx.wind || 0;
  // Ripples: drifting dashes, denser when the wind is up
  const n = reduceMotion ? 60 : 150 + (wx.k * 60 | 0);
  ctx.fillStyle = hi;
  for (let i = 0; i < n; i++) {
    const sp = 4 + hash(i, 1) * 6;
    const x = (hash(i, 2) * W + clock * sp * (1 + wind * 0.5)) % W, y = R(hash(i, 3) * H);
    if (lakeNorm(x, y) > 0.97) continue;
    const ph = Math.sin(clock * 1.5 + i);
    if (ph < 0.1) continue;
    const w = 2 + (ph * 3 | 0);
    ctx.globalAlpha = 0.35 + ph * 0.3;
    ctx.fillRect(R(x), y, w, 1);
    if (ph > 0.8) ctx.fillRect(R(x) + 1, y - 1, w - 2, 1);
  }
  ctx.globalAlpha = 1;
  // Sun glints on the open water by day
  if (light > 0.4 && wx.kind !== 'fog') {
    const step = Math.floor(clock * 4);
    ctx.fillStyle = '#e8f0f4';
    for (let i = 0; i < 40; i++) {
      const x = R(hash(i, step) * W), y = R(hash(step, i) * H);
      if (lakeNorm(x, y) < 0.9 && deepNorm(x, y) > 0.5) { ctx.globalAlpha = 0.25 * light; ctx.fillRect(x, y, 2, 1); }
    }
    ctx.globalAlpha = 1;
  }
  // Shore foam
  ctx.fillStyle = '#d9e4e8';
  for (const p of SHORE) {
    const ph = Math.sin(clock * 1.8 + p.i * 0.37);
    if (ph > 0.55) { ctx.globalAlpha = (ph - 0.55) * 1.6; ctx.fillRect(R(p.x), R(p.y), 2, 1); }
  }
  ctx.globalAlpha = 1;
  // Ripples lapping at the rocks
  ctx.fillStyle = 'rgba(220,232,236,0.3)';
  for (const rk of ROCKS) for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2 + rk.x, ph = Math.sin(clock * 1.6 + k * 1.1 + rk.y);
    if (ph < 0.3) continue;
    const r = rk.r + 2 + (ph > 0.75 ? 2 : 0);
    ctx.globalAlpha = 0.5 * ph;
    ctx.fillRect(R(rk.x + Math.cos(a) * r) - 1, R(rk.y + Math.sin(a) * r * 0.7), 3, 1);
  }
  ctx.globalAlpha = 1;
  // Fish shadows cruising the deep
  if (!reduceMotion) for (const f of FISHSHADOWS) {
    const t = clock * 0.35 + f.t, a = t * 0.9 + f.i;
    const x = DEEP.cx + Math.cos(a) * (DEEP.rx - 10) * (0.5 + hash(f.i, 2) * 0.5), y = DEEP.cy + Math.sin(a * 0.8) * (DEEP.ry - 6);
    ellipse(ctx, x, y, 3, 1, 'rgba(10,20,30,0.28)');
  }
}

/** Wobbling reflections of light sources in the water, drawn with 'screen'. */
export function drawReflections(ctx, lights, clock, dark, reduceMotion) {
  if (dark <= 0.05) return;
  ctx.globalCompositeOperation = 'screen';
  for (const L of lights) {
    if (L.win && L.r < 20) continue;
    const len = R(L.r * 0.9), y0 = L.y + 3;
    for (let i = 0; i < len; i += 2) {
      const yy = y0 + i;
      if (lakeNorm(L.x, yy) > 0.985) continue;
      const wob = reduceMotion ? 0 : Math.sin(clock * 2.4 + i * 0.5 + L.x) * (1 + i / 10);
      const w = 2 + ((i / 6) | 0);
      ctx.globalAlpha = dark * L.a * 0.22 * (1 - i / len);
      ctx.fillStyle = L.color;
      ctx.fillRect(R(L.x + wob - w / 2), yy, w, 1);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/* ------------------------------------------------------------- boats --- */
const CAPTAIN = ['.hhh.', 'hhhhh', '.ff..', '.ff..', 'cccc.', 'cccc.', '.c.c.'];
export function drawBoat(ctx, state, p, clock, reduceMotion) {
  const b = p.boat, gear = gearStats(state.empire);
  const len = gear.boatLen, wid = Math.round(len * 0.48);
  const a = Math.round(b.heading / (Math.PI / 8)) * (Math.PI / 8);
  const c = Math.cos(a), s = Math.sin(a);
  const bob = reduceMotion ? 0 : Math.round(Math.sin(clock * 2.2 + p.seat) * 0.6);
  const T = (lx, ly) => ({ x: R(b.x + lx * c - ly * s), y: R(b.y + lx * s + ly * c + bob) });
  const poly = (pts, color) => {
    ctx.fillStyle = color; ctx.beginPath();
    pts.forEach((q, i) => { const t = T(q[0], q[1]); i ? ctx.lineTo(t.x, t.y) : ctx.moveTo(t.x, t.y); });
    ctx.closePath(); ctx.fill();
  };
  const line = (x0, y0, x1, y1, color) => { const A = T(x0, y0), B = T(x1, y1); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(A.x + 0.5, A.y + 0.5); ctx.lineTo(B.x + 0.5, B.y + 0.5); ctx.stroke(); };
  // Wake foam
  if (p.moving && !reduceMotion) {
    const sp = Math.hypot(b.vx, b.vy) / gear.speed;
    for (let i = 1; i <= 6; i++) {
      const side = i % 2 ? 1 : -1;
      const t = T(-len / 2 - i * 4, side * (2 + i * 1.3));
      ctx.globalAlpha = 0.55 * sp * (1 - i / 7);
      ctx.fillStyle = '#dfe9ee'; ctx.fillRect(t.x, t.y, 2 + (i > 3 ? 1 : 0), 1);
    }
    const bow = T(len / 2 + 3, 0); ctx.globalAlpha = 0.6 * sp; ctx.fillStyle = '#eef4f6'; ctx.fillRect(bow.x - 1, bow.y, 3, 1);
    ctx.globalAlpha = 1;
  }
  if (!p.connected) ctx.globalAlpha = 0.45;
  const hullOut = [[-len / 2, -wid / 2], [len / 2 - 3, -wid / 2], [len / 2 + 2, 0], [len / 2 - 3, wid / 2], [-len / 2, wid / 2]];
  // shadow in the water, dark hull, planked sides, pale deck
  poly(hullOut.map(([x, y]) => [x + 1, y + 2]), 'rgba(8,12,20,0.35)');
  poly(hullOut, '#2e2018');
  poly([[-len / 2 + 1, -wid / 2 + 1], [len / 2 - 3, -wid / 2 + 1], [len / 2, 0], [len / 2 - 3, wid / 2 - 1], [-len / 2 + 1, wid / 2 - 1]], '#6e4a32');
  poly([[-len / 2 + 2, -wid / 2 + 2], [len / 2 - 4, -wid / 2 + 2], [len / 2 - 2, 0], [len / 2 - 4, wid / 2 - 2], [-len / 2 + 2, wid / 2 - 2]], '#a8825a');
  line(-len / 2 + 2, 0, len / 2 - 3, 0, '#8a6a48');
  // seats
  for (const sx of [-len / 4, len / 6]) line(sx, -wid / 2 + 2, sx, wid / 2 - 2, '#5a3e2a');
  // gunwale in the player's colour
  poly([[-len / 2, -wid / 2], [len / 2 - 3, -wid / 2], [len / 2 - 3, -wid / 2 + 1], [-len / 2, -wid / 2 + 1]], p.color);
  poly([[-len / 2, wid / 2 - 1], [len / 2 - 3, wid / 2 - 1], [len / 2 - 3, wid / 2], [-len / 2, wid / 2]], scale(p.color, 0.7));
  if (state.empire.boat >= 2) {
    // cabin
    poly([[-len / 2 + 3, -wid / 2 + 2], [-1, -wid / 2 + 2], [-1, wid / 2 - 2], [-len / 2 + 3, wid / 2 - 2]], '#3a2a1e');
    poly([[-len / 2 + 4, -wid / 2 + 3], [-2, -wid / 2 + 3], [-2, wid / 2 - 3], [-len / 2 + 4, wid / 2 - 3]], p.color);
    const wn = T(-len / 4, 0); ctx.fillStyle = '#2a1d10'; ctx.fillRect(wn.x - 1, wn.y - 1, 3, 2);
  }
  if (state.empire.engine >= 1) { const t = T(-len / 2 - 2, 0); ctx.fillStyle = '#23283a'; ctx.fillRect(t.x - 1, t.y - 2, 3, 4); ctx.fillStyle = '#4a5068'; ctx.fillRect(t.x, t.y - 2, 1, 1); }
  else { line(len / 6, -wid / 2, len / 6 + 3, -wid / 2 - 5, '#5a3e2a'); line(len / 6, wid / 2, len / 6 + 3, wid / 2 + 5, '#5a3e2a'); }
  // captain, rod, lantern
  const cp = T(-len / 4 + (state.empire.boat >= 2 ? 4 : 0), 0);
  const cap = sprite(CAPTAIN, { h: p.color, f: '#e6c3a0', c: '#3c3a44' });
  ctx.drawImage(cap, cp.x - 2, cp.y - 4);
  if (p.fishing && p.fishing.stage !== 'charging') { const tip = T(len / 2 + 5, -2); line(-len / 4 + 2, -1, len / 2 + 5, -2, '#c9b28a'); ctx.fillStyle = '#e8dcc0'; ctx.fillRect(tip.x, tip.y, 1, 1); }
  const lt = T(-len / 2 + 2, wid / 2 - 2);
  ctx.fillStyle = '#2a1e16'; ctx.fillRect(lt.x - 1, lt.y - 2, 3, 1);
  ctx.fillStyle = '#f0b040'; ctx.fillRect(lt.x - 1, lt.y - 1, 3, 3);
  ctx.fillStyle = '#fff2c0'; ctx.fillRect(lt.x, lt.y, 1, 1);
  ctx.globalAlpha = 1;
  text(ctx, p.name, b.x, b.y - wid / 2 - 15 + bob, { color: p.color, align: 'center' });
  if (!p.connected) text(ctx, 'away', b.x, b.y + wid / 2 + 5, { color: '#98a4b2', align: 'center' });
}

export function boatLantern(p) {
  const b = p.boat, len = 16;
  return { x: b.x - Math.cos(b.heading) * len * 0.3, y: b.y - Math.sin(b.heading) * len * 0.3 };
}

/* ----------------------------------------------------------- fishing --- */
export function drawFishing(ctx, state, p, cam, pw, ph, clock, reduceMotion) {
  const f = p.fishing, b = p.boat;
  const bowX = R(b.x + Math.cos(b.heading) * 9), bowY = R(b.y + Math.sin(b.heading) * 9 - 3);
  if (f.stage === 'charging') {
    const x = R(b.x) - 16, y = R(b.y) - 24;
    ctx.fillStyle = '#0a0c12'; ctx.fillRect(x - 1, y - 1, 34, 7);
    ctx.fillStyle = '#242a3a'; ctx.fillRect(x, y, 32, 5);
    ctx.fillStyle = f.power > 0.85 ? '#d9584a' : '#e8b04a'; ctx.fillRect(x + 1, y + 1, R(30 * f.power), 3);
    ctx.fillStyle = '#fff2c0'; ctx.fillRect(x + 1, y + 1, R(30 * f.power), 1);
    return;
  }
  if (f.stage === 'lost' || f.stage === 'caught') return;
  const bx = R(f.bx), by = R(f.by - (f.arc || 0) + (f.dip || 0));
  ctx.strokeStyle = 'rgba(235,240,245,0.7)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(bowX + 0.5, bowY + 0.5); ctx.quadraticCurveTo((bowX + bx) / 2 + 0.5, Math.min(bowY, by) - 6, bx + 0.5, by + 0.5); ctx.stroke();
  if (f.stage === 'waiting' || f.stage === 'flying' || f.stage === 'bite') {
    if (f.stage === 'waiting' && !reduceMotion) {
      const r = 3 + Math.floor((clock * 1.6) % 3) * 2;
      ctx.strokeStyle = 'rgba(220,232,236,0.4)'; ctx.strokeRect(bx - r + 0.5, by - r * 0.55 + 0.5, r * 2, r * 1.1);
    }
    if (f.stage !== 'flying') ellipse(ctx, bx, by + 2, 2, 1, 'rgba(8,12,20,0.3)');
    ctx.fillStyle = '#c94a3e'; ctx.fillRect(bx - 1, by - 2, 3, 2);
    ctx.fillStyle = '#efe6d6'; ctx.fillRect(bx - 1, by, 3, 2);
    ctx.fillStyle = '#ff7a6a'; ctx.fillRect(bx, by - 2, 1, 1);
    if (f.stage === 'bite') {
      const bounce = reduceMotion ? 0 : Math.round(Math.abs(Math.sin(clock * 14)) * 3);
      text(ctx, '!', bx, by - 24 - bounce, { color: '#f2c14e', align: 'center', scale: 2 });
      const ring = Math.round(4 + (f.win / f.winDur) * 10);
      ctx.strokeStyle = '#f2c14e'; ctx.strokeRect(bx - ring + 0.5, by - ring + 0.5, ring * 2, ring * 2);
    }
  }
  if (f.stage === 'reel') {
    const sh = reduceMotion ? 0 : Math.sin(clock * 9) * 2;
    ellipse(ctx, bx + sh, by + 1, 3, 2, f.fish.color);
    ctx.fillStyle = scale(f.fish.color, 1.4); ctx.fillRect(R(bx + sh) - 1, by, 2, 1);
    const jx = reduceMotion ? 0 : Math.round(Math.sin(clock * 30) * (1 + f.tension * 2));
    drawReelBar(ctx, f, p, R(b.x) + 18 + jx, R(b.y) - 50, cam, pw, ph, clock, reduceMotion);
  }
}

function drawReelBar(ctx, f, p, x, y, cam, pw, ph, clock, reduceMotion) {
  x = Math.min(Math.max(x, cam.x + 6), cam.x + pw - 34); y = Math.min(Math.max(y, cam.y + 26), cam.y + ph - 96);
  const h = 84, w = 12;
  ctx.fillStyle = '#0a0c12'; ctx.fillRect(x - 7, y - 3, w + 18, h + 6);
  ctx.fillStyle = '#1a1f2c'; ctx.fillRect(x - 6, y - 2, w + 16, h + 4);
  // tension (left)
  ctx.fillStyle = '#2a2f40'; ctx.fillRect(x - 4, y, 2, h);
  ctx.fillStyle = f.tension > 0.7 ? '#ff5a48' : '#d9584a'; ctx.fillRect(x - 4, y + h - R(h * f.tension), 2, R(h * f.tension));
  // track, zone, fish
  ctx.fillStyle = '#16304a'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#1e4060'; for (let yy = y + 3; yy < y + h; yy += 6) ctx.fillRect(x, yy, w, 1);
  const zTop = y + R((1 - f.zpos - f.zsize / 2) * h), zH = R(f.zsize * h);
  ctx.fillStyle = p.color; ctx.fillRect(x, zTop, w, zH);
  ctx.fillStyle = scale(p.color, 1.3); ctx.fillRect(x, zTop, w, 1); ctx.fillRect(x, zTop + zH - 1, w, 1);
  const fy = y + R((1 - f.fpos) * h) - 2;
  ctx.fillStyle = f.inZone ? '#ffffff' : scale(f.fish.color, 0.8); ctx.fillRect(x + 2, fy, 6, 4);
  ctx.fillStyle = f.fish.color; ctx.fillRect(x + 3, fy + 1, 4, 2); ctx.fillRect(x + 8, fy + 1, 2, 2);
  // progress (right)
  ctx.fillStyle = '#2a2f40'; ctx.fillRect(x + w + 2, y, 3, h);
  ctx.fillStyle = '#6fbf62'; ctx.fillRect(x + w + 2, y + h - R(h * f.prog), 3, R(h * f.prog));
  ctx.fillStyle = '#a8e69a'; ctx.fillRect(x + w + 2, y + h - R(h * f.prog), 1, R(h * f.prog));
  if (f.tug?.phase === 'warn') text(ctx, '!', x + w / 2, y - 16 - (reduceMotion ? 0 : R(Math.abs(Math.sin(clock * 16)) * 2)), { color: '#d9584a', align: 'center', scale: 2 });
  if (f.tug?.phase === 'open') {
    const r = 3 + R((f.tug.t / f.tug.dur) * 9);
    ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 1; ctx.strokeRect(x + w / 2 - r + 0.5, fy + 2 - r + 0.5, r * 2, r * 2);
    text(ctx, 'PULL', x + w / 2, y - 14, { color: '#f2c14e', align: 'center' });
  }
  text(ctx, f.fish.tier >= 3 ? '???' : f.fish.name, x + w / 2, y + h + 6, { align: 'center', color: '#e8e2d2' });
}

/* ------------------------------------------------------------ lights --- */
/** World-space light sources on the lake. Returned each frame; cheap. */
export function lakeLights(state, players, clock, reduceMotion) {
  const flick = reduceMotion ? 0 : Math.sin(clock * 9) * 1.5 + Math.sin(clock * 23) * 0.6;
  const L = [
    { x: DOCK.pierX + 7, y: DOCK.pierTop - 2, r: 40 + flick, color: '#ffb257', a: 1 },
    { x: DOCK.pierX + 12 + 5, y: DOCK.pierBottom - 6 + 7, r: 16, color: '#ffc46a', a: 0.8, win: true },
  ];
  for (const c of CABINS) L.push({ x: c.x + c.w - 9, y: c.y + 8, r: 22, color: '#ffc46a', a: 0.9, win: true });
  for (const p of players) if (p.loc === 'lake') {
    const lt = boatLantern(p);
    L.push({ x: lt.x, y: lt.y, r: 44 + flick, color: '#ffb257', a: 1 });
    const f = p.fishing;
    if (f?.bx && f.stage !== 'charging' && f.stage !== 'lost' && f.stage !== 'caught') {
      L.push({ x: f.bx, y: f.by, r: 10, color: state.empire.bait === 3 && state.empire.baitCount > 0 ? '#7fe0c3' : '#ffd090', a: 0.6 });
    }
  }
  return L;
}

export { SEASON as LAKE_SEASON };

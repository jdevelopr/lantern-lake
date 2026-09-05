// The river and the sea: baked banks and shores per season, then the moving water
// (flow lines, rapids foam, swell, surf), the lighthouse and its beam, buoys. Boats,
// fishing and lanterns come from lake.js, which works on any of the three waters.
import { WORLD, seasonOf } from '../game/world.js';
import { riverCentre, riverHalf, riverKind, RIVER_ROCKS, OCEAN, OCEAN_ROCKS, reefNorm, insideWater, GATES, MOUTH } from '../game/waters.js';
import { mkCanvas, R, hash, disc, ellipse, mix, scale, rgb, text } from './gfx.js';
import { LAKE_SEASON, tree, rockOnLand } from './lake.js';

const W = WORLD.w, H = WORLD.h;
const lerpC = (a, b, t) => { t = Math.max(0, Math.min(1, t)); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };

/* --------------------------------------------------------------- river --- */
function waterRock(g, rk, S) {
  const ry = rk.r * 0.7 | 0;
  ellipse(g, rk.x, rk.y + 2, rk.r + 1, ry, scale(S.water, 0.8));
  ellipse(g, rk.x, rk.y, rk.r, ry, scale(S.rock, 0.75));
  ellipse(g, rk.x, rk.y - 1, rk.r - 1, Math.max(1, ry - 1), S.rock);
  ellipse(g, rk.x - 1, rk.y - 2, rk.r - 3, Math.max(1, ry - 2), S.rock2);
  g.fillStyle = S.rock3; g.fillRect(rk.x - rk.r + 2, rk.y - 3, 2, 1);
  if (S.snow) { g.fillStyle = S.snow; g.fillRect(rk.x - rk.r + 2, rk.y - ry, rk.r * 2 - 4, 1); }
}
function signpost(g, x, y, label) {
  g.fillStyle = '#4a3324'; g.fillRect(x, y - 14, 2, 16);
  const w = label.length * 6 + 8;
  g.fillStyle = '#c9b28a'; g.fillRect(x - (w >> 1) + 1, y - 15, w, 10); g.fillStyle = '#8a6a44'; g.fillRect(x - (w >> 1) + 1, y - 6, w, 1);
  text(g, label, x + 1, y - 14, { color: '#2a1a10', align: 'center', shadow: false });
}

export function buildRiverBackground(season) {
  const S = LAKE_SEASON[season];
  const [c, g] = mkCanvas(W, H);
  const img = g.createImageData(W, H), d = img.data;
  const P = {}; for (const k in S) if (S[k]) P[k] = rgb(S[k]);
  const put = (i, col) => { d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, cy = riverCentre(x), h = riverHalf(x), dd = Math.abs(y - cy), t = dd / h, kind = riverKind(x);
    if (t < 1) {
      // deeper in the middle of the pools, pale and busy in the rapids
      let col = lerpC(P.shallow, P.water, Math.min(1, (1 - t) * 1.6));
      // deep where the channel widens into a pool, pale and broken where it narrows
      const pool = Math.max(0, Math.min(1, (h - 35) / 8)), rap = Math.max(0, Math.min(1, (34 - h) / 5));
      col = lerpC(col, P.deep, (1 - t) * 0.8 * pool);
      col = lerpC(col, P.shallowHi, rap * (0.25 + 0.25 * Math.sin(x * 0.7 + y * 1.3)));
      if (hash(x >> 1, y >> 1, 9) < 0.05) col = col.map(v => v + 6);
      put(i, col);
    } else if (dd < h + 4) put(i, lerpC(P.sandWet, P.sand, (dd - h) / 4));
    else {
      const nz = hash(x >> 2, y >> 2, 11);
      let col = P.grass; if (nz < 0.1) col = P.grass2; else if (nz > 0.94) col = P.grass3;
      const blob = Math.sin(x * 0.021 + y * 0.013) + Math.sin(y * 0.033 - x * 0.009);
      if (blob > 0.9) col = lerpC(col, P.grass2, (blob - 0.9) * 1.5); else if (blob < -1.1) col = lerpC(col, P.grass3, (-1.1 - blob) * 1.5);
      const edge = Math.max(0, Math.min(1, (Math.min(y, H - y) - 10) / 50));
      col = col.map(v => v * (1 - 0.25 * (1 - edge)));
      put(i, col);
    }
  }
  g.putImageData(img, 0, 0);
  // a dirt track along the north bank, tufts, stones
  for (let x = 20; x < W - 20; x += 2) { const y = R(riverCentre(x) - riverHalf(x) - 26 + Math.sin(x * 0.05) * 3); ellipse(g, x, y, 3, 1, S.dirt); if (hash(x, 5) > 0.7) { g.fillStyle = S.dirt2; g.fillRect(x, y + 1, 1, 1); } }
  for (let i = 0; i < 380; i++) {
    const x = R(hash(i, 21) * W), y = R(hash(i, 22) * H);
    if (Math.abs(y - riverCentre(x)) < riverHalf(x) + 8) continue;
    const k = hash(i, 23);
    if (k < 0.55) { g.fillStyle = S.grass3; g.fillRect(x, y, 1, 1); g.fillRect(x + 1, y - 1, 1, 1); g.fillStyle = S.grass2; g.fillRect(x + 2, y, 1, 1); }
    else if (k < 0.8) { g.fillStyle = S.grass2; g.fillRect(x, y, 2, 1); }
    else if (k < 0.9 && S.bloom) { g.fillStyle = k < 0.85 ? S.bloom : S.bloom2; g.fillRect(x, y, 1, 1); }
    else if (k < 0.94) rockOnLand(g, x, y, 1 + (hash(i, 24) * 2 | 0), S);
  }
  // trees thick on both banks, thinner near the water
  const trees = [];
  for (let i = 0; i < 520; i++) {
    const x = R(hash(i, 7) * W), y = R(hash(i, 8) * H), dd = Math.abs(y - riverCentre(x)) - riverHalf(x);
    if (dd < 14 || (dd < 34 && hash(i, 9) < 0.6)) continue;
    if (Math.abs(y - (riverCentre(x) - riverHalf(x) - 26)) < 6) continue;   // the track
    const r = 5 + Math.floor(hash(i, 10) * 4) + (dd > 60 ? 1 : 0);
    trees.push({ x, y, r, kind: season === 3 ? (hash(i, 11) < 0.55 ? 'pine' : 'bare') : hash(i, 11) < 0.35 ? 'pine' : 'round', i });
  }
  trees.sort((a, b) => a.y - b.y);
  for (const t of trees) tree(g, t.x, t.y, t.r, S, t.kind, t.i);
  // reeds in the slack water of the pools
  for (let x = 30; x < W - 30; x += 3) if (riverKind(x) === 'pool' && hash(x, 3) < 0.35) {
    const side = hash(x, 4) < 0.5 ? -1 : 1, y = R(riverCentre(x) + side * (riverHalf(x) - 4 - hash(x, 6) * 5)), hgt = 5 + (hash(x, 2) * 4 | 0);
    g.fillStyle = S.reed; g.fillRect(x, y - hgt, 1, hgt + 1); if (x % 2) { g.fillStyle = S.reedHead; g.fillRect(x, y - hgt - 2, 1, 3); }
  }
  // a fallen log across the shallows, stepping stones, the rocks in the rapids
  const lx = 500, ly = R(riverCentre(lx) - riverHalf(lx));
  for (let i = 0; i < 26; i++) { g.fillStyle = i % 5 ? S.trunk : scale(S.trunk, 1.3); g.fillRect(lx + i, ly + (i >> 2), 1, 4); }
  g.fillStyle = scale(S.trunk, 0.7); g.fillRect(lx, ly + 3, 26, 1);
  for (const rk of RIVER_ROCKS) waterRock(g, rk, S);
  // signposts at both ends of the river
  const gl = GATES.river[0], go = GATES.river[1];
  signpost(g, gl.x + 14, R(riverCentre(gl.x + 14) - riverHalf(gl.x + 14)) - 6, 'LAKE');
  signpost(g, go.x - 16, R(riverCentre(go.x - 16) - riverHalf(go.x - 16)) - 6, 'SEA');
  return c;
}

export function drawRiverWater(ctx, state, clock, light, wx, reduceMotion) {
  const S = LAKE_SEASON[seasonOf(state.time.day)];
  // flow lines drifting downstream, faster in the rapids
  const n = reduceMotion ? 50 : 140;
  for (let i = 0; i < n; i++) {
    const sp = 18 + hash(i, 1) * 14, x = R((hash(i, 2) * W + clock * sp) % W), kind = riverKind(x);
    const y = R(riverCentre(x) + (hash(i, 3) * 2 - 1) * riverHalf(x) * 0.85);
    const len = kind === 'rapids' ? 5 : 3;
    ctx.globalAlpha = kind === 'rapids' ? 0.6 : 0.35; ctx.fillStyle = S.shallowHi;
    ctx.fillRect(x, y, len, 1);
  }
  // rapids: foam specks, standing waves, spray off the rocks
  ctx.fillStyle = '#eef4f6';
  for (let i = 0; i < (reduceMotion ? 30 : 90); i++) {
    const x = R(hash(i, 11) * W); if (riverKind(x) !== 'rapids') continue;
    const y = R(riverCentre(x) + (hash(i, 12) * 2 - 1) * riverHalf(x) * 0.9), ph = Math.sin(clock * 5 + i);
    if (ph < 0.2) continue;
    ctx.globalAlpha = 0.5 + ph * 0.4; ctx.fillRect(x + R(Math.sin(clock * 6 + i) * 2), y, 2, 1);
  }
  for (const rk of RIVER_ROCKS) for (let k = 0; k < 5; k++) {
    const ph = Math.sin(clock * 4 + k * 1.3 + rk.x); if (ph < 0.2) continue;
    ctx.globalAlpha = 0.6 * ph; ctx.fillRect(R(rk.x + rk.r + 1 + k * 2 + ph * 2), R(rk.y - 2 + k), 2, 1);
    ctx.globalAlpha = 0.4 * ph; ctx.fillRect(R(rk.x - rk.r - 3 + k), R(rk.y - 1 + (k % 2)), 2, 1);
  }
  ctx.globalAlpha = 1;
  // sun glints in the pools by day
  if (light > 0.4) { const step = Math.floor(clock * 4); ctx.fillStyle = '#e8f0f4'; ctx.globalAlpha = 0.25 * light; for (let i = 0; i < 30; i++) { const x = R(hash(i, step) * W), y = R(riverCentre(x) + (hash(step, i) * 2 - 1) * riverHalf(x) * 0.7); if (riverKind(x) === 'pool') ctx.fillRect(x, y, 2, 1); } ctx.globalAlpha = 1; }
}

export function riverLights(state, players, clock, reduceMotion, boatLights) {
  const flick = reduceMotion ? 0 : Math.sin(clock * 9) * 1.5;
  const L = [];
  for (const g of GATES.river) { const x = g === GATES.river[0] ? g.x + 14 : g.x - 16; const y = R(riverCentre(x) - riverHalf(x)) - 20; L.push({ x: x + 1, y, r: 30 + flick, color: '#ffb257', a: 1 }); }
  return L.concat(boatLights);
}

/* --------------------------------------------------------------- ocean --- */
const SEA = [
  { shoal: '#5aa0b0', open: '#3a7a9a', blue: '#1e4a68', blue2: '#163a54', reef: '#4a9aa8', foam: '#e8f2f4', sand: '#d0bc8a', cliff: '#7a7a78', cliff2: '#5a5a5c', grassTop: '#5c8a4e', rock: '#6a6f78', rock2: '#8c929c', rock3: '#b0b5bd', snow: null },
  { shoal: '#56a8b8', open: '#3080a4', blue: '#1c4c70', blue2: '#143a58', reef: '#48a4b0', foam: '#ecf6f8', sand: '#d8c494', cliff: '#7a7a78', cliff2: '#5a5a5c', grassTop: '#4f7f3f', rock: '#6a6f78', rock2: '#8c929c', rock3: '#b0b5bd', snow: null },
  { shoal: '#5090a4', open: '#356e8a', blue: '#1e425c', blue2: '#16344a', reef: '#448c98', foam: '#e6eef0', sand: '#c4b080', cliff: '#767470', cliff2: '#565452', grassTop: '#8c7a48', rock: '#6a6f78', rock2: '#8c929c', rock3: '#b0b5bd', snow: null },
  { shoal: '#6a94a4', open: '#4a7088', blue: '#2a4658', blue2: '#203848', reef: '#5a8c98', foam: '#eef4f6', sand: '#cfd3d6', cliff: '#8a8e94', cliff2: '#6a6e74', grassTop: '#c3ccd3', rock: '#6a6f78', rock2: '#8c929c', rock3: '#d8dde2', snow: '#e6ebef' },
];
export const BUOYS = [{ x: 200, y: 120, col: '#e0685a' }, { x: 300, y: 300, col: '#e0685a' }, { x: 470, y: 180, col: '#7fe0c3' }, { x: 610, y: 320, col: '#e0685a' }];
export const WRECK = { x: 372, y: 246 };

export function buildOceanBackground(season) {
  const S = SEA[season], LS = LAKE_SEASON[season];
  const [c, g] = mkCanvas(W, H);
  const img = g.createImageData(W, H), d = img.data;
  const P = {}; for (const k in S) if (S[k]) P[k] = rgb(S[k]);
  const put = (i, col) => { d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; };
  const inChan = y => Math.abs(y - OCEAN.channel.y) < OCEAN.channel.half;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const land = x < OCEAN.shore && !inChan(y);
    if (land) {
      // cliff top grass, a rock face, a strip of beach at the foot
      if (x < OCEAN.shore - 18) { const nz = hash(x >> 2, y >> 2, 11); put(i, nz < 0.1 ? rgb(LS.grass2) : nz > 0.94 ? rgb(LS.grass3) : rgb(LS.grass)); }
      else if (x < OCEAN.shore - 7) put(i, ((x + (y >> 2)) % 5 < 2 ? P.cliff2 : P.cliff));
      else put(i, lerpC(P.sand, rgb(LS.sandWet), (x - (OCEAN.shore - 7)) / 7));
      continue;
    }
    let col;
    const rn = reefNorm(x, y), dIsle = Math.hypot(x - OCEAN.islet.x, y - OCEAN.islet.y);
    if (x < 150) col = lerpC(P.shoal, P.open, (x - OCEAN.shore) / 104);
    else if (x < OCEAN.blueX) col = lerpC(P.open, P.blue, (x - 150) / (OCEAN.blueX - 150));
    else col = lerpC(P.blue, P.blue2, Math.min(1, (x - OCEAN.blueX) / 200));
    if (rn < 1.3) col = lerpC(col, P.reef, Math.min(1, (1.3 - rn) * 2));
    if (dIsle < OCEAN.islet.r + 22) col = lerpC(col, P.shoal, (OCEAN.islet.r + 22 - dIsle) / 22);
    if (inChan(y) && x < OCEAN.shore + 30) col = lerpC(col, rgb(LS.shallow), 0.6);
    if (hash(x >> 1, y >> 1, 9) < 0.05) col = col.map(v => v + 5);
    put(i, col);
  }
  g.putImageData(img, 0, 0);
  // cliff edge shading, a path along the top, grass tufts
  g.fillStyle = 'rgba(10,14,22,0.35)'; for (let y = 0; y < H; y++) if (!inChan(y)) g.fillRect(OCEAN.shore - 18, y, 2, 1);
  for (let y = 4; y < H; y += 3) if (!inChan(y)) { ellipse(g, 12 + R(Math.sin(y * 0.07) * 3), y, 2, 1, LS.dirt); }
  for (let i = 0; i < 90; i++) { const x = R(hash(i, 21) * (OCEAN.shore - 20)), y = R(hash(i, 22) * H); if (inChan(y)) continue; g.fillStyle = LS.grass3; g.fillRect(x, y, 1, 1); g.fillRect(x + 1, y - 1, 1, 1); }
  for (let i = 0; i < 14; i++) { const y = R(hash(i, 8) * H); if (Math.abs(y - OCEAN.channel.y) < OCEAN.channel.half + 8) continue; tree(g, 6 + R(hash(i, 7) * 14), y, 4 + (hash(i, 10) * 2 | 0), LS, season === 3 ? 'pine' : hash(i, 11) < 0.5 ? 'pine' : 'round', i); }
  // reef rocks, a wreck's ribs and mast on the reef
  for (const rk of OCEAN_ROCKS) if (!rk.isle) waterRock(g, rk, { ...LS, water: S.reef });
  g.fillStyle = '#3a2a1c'; for (let k = 0; k < 5; k++) g.fillRect(WRECK.x + k * 4, WRECK.y - 2 + (k % 2), 2, 5 - (k % 2)); g.fillRect(WRECK.x - 2, WRECK.y + 3, 24, 2);
  g.fillStyle = '#4a3a2c'; g.fillRect(WRECK.x + 8, WRECK.y - 22, 2, 22); g.fillRect(WRECK.x + 2, WRECK.y - 16, 14, 1);
  // the lighthouse islet: rock, a keeper's hut, the tower with its red band and lamp room
  const I = OCEAN.islet;
  ellipse(g, I.x, I.y + 2, I.r + 2, (I.r + 2) * 0.75 | 0, scale(S.rock, 0.7));
  ellipse(g, I.x, I.y, I.r, I.r * 0.75 | 0, S.rock); ellipse(g, I.x - 2, I.y - 2, I.r - 4, (I.r - 4) * 0.7 | 0, S.rock2);
  ellipse(g, I.x + 1, I.y - 1, I.r - 8, (I.r - 8) * 0.6 | 0, LS.grass);
  g.fillStyle = '#6d4c34'; g.fillRect(I.x + 4, I.y - 2, 10, 7); g.fillStyle = '#4a3a44'; g.fillRect(I.x + 3, I.y - 4, 12, 2); g.fillStyle = '#3b3020'; g.fillRect(I.x + 8, I.y + 1, 3, 3);
  const tx = I.x - 4, ty = I.y - 30;
  g.fillStyle = 'rgba(10,14,22,0.35)'; g.fillRect(tx + 8, ty + 2, 3, 30);
  g.fillStyle = '#e8e2d2'; g.fillRect(tx, ty, 8, 30); g.fillStyle = '#c9c3b4'; g.fillRect(tx + 6, ty, 2, 30);
  g.fillStyle = '#c8402a'; g.fillRect(tx, ty + 10, 8, 6); g.fillRect(tx, ty + 22, 8, 4);
  g.fillStyle = '#2d3038'; g.fillRect(tx - 1, ty - 1, 10, 2); g.fillRect(tx - 2, ty + 29, 12, 2);
  g.fillStyle = '#3a3a3c'; g.fillRect(tx + 1, ty - 7, 6, 6); g.fillStyle = '#5a5248'; g.fillRect(tx + 2, ty - 6, 4, 4);
  g.fillStyle = '#2d3038'; g.fillRect(tx, ty - 9, 8, 2); g.fillRect(tx + 3, ty - 11, 2, 2);
  // buoys' anchors are live; the surf line on the beach is live too
  signpost(g, GATES.ocean[0].x + 30, OCEAN.channel.y - OCEAN.channel.half - 8, 'RIVER');
  return c;
}

export function drawOceanWater(ctx, state, clock, light, wx, reduceMotion) {
  const S = SEA[seasonOf(state.time.day)], k = wx.k || 0, storm = wx.kind === 'storm' ? k : 0;
  const inChan = y => Math.abs(y - OCEAN.channel.y) < OCEAN.channel.half;
  // swell: long crests rolling toward the shore, more and whiter in a storm
  const rows = reduceMotion ? 6 : 12;
  for (let r = 0; r < rows; r++) {
    const base = r * (H / rows) + 12, ph = clock * (10 + storm * 14) + r * 40;
    for (let x = OCEAN.shore; x < W; x += 3) {
      const y = R(base + Math.sin(x * 0.022 + ph * 0.05) * 6 + Math.sin(x * 0.051 - ph * 0.03) * 3);
      const on = Math.sin(x * 0.09 + ph * 0.1 + r) > 0.55 - storm * 0.3;
      if (!on || !insideWater('ocean', x, y)) continue;
      ctx.globalAlpha = 0.28 + storm * 0.3; ctx.fillStyle = S.foam; ctx.fillRect(x, y, 3, 1);
      if (storm > 0.4 && hash(x, r, Math.floor(clock * 3)) < storm * 0.5) { ctx.globalAlpha = 0.8; ctx.fillRect(x + 1, y - 1, 2, 1); }
    }
  }
  ctx.globalAlpha = 1;
  // surf on the beach and around the islet and the reef
  ctx.fillStyle = S.foam;
  for (let y = 0; y < H; y += 2) { if (inChan(y)) continue; const ph = Math.sin(clock * 1.8 + y * 0.2); if (ph > 0.4) { ctx.globalAlpha = (ph - 0.4) * 1.4; ctx.fillRect(OCEAN.shore + R(ph * 3), y, 3, 1); } }
  for (const rk of OCEAN_ROCKS) for (let q = 0; q < 8; q++) {
    const a = q / 8 * Math.PI * 2 + rk.x, ph = Math.sin(clock * 1.6 + q * 1.1 + rk.y); if (ph < 0.3) continue;
    const rr = rk.r + 2 + (ph > 0.75 ? 2 : 0);
    ctx.globalAlpha = 0.5 * ph; ctx.fillRect(R(rk.x + Math.cos(a) * rr) - 1, R(rk.y + Math.sin(a) * rr * 0.7), 3, 1);
  }
  ctx.globalAlpha = 1;
  // buoys bob on the swell
  for (const b of BUOYS) {
    const bob = R(Math.sin(clock * 1.4 + b.x) * (1 + storm * 2));
    ctx.fillStyle = 'rgba(10,20,30,0.3)'; ctx.fillRect(b.x - 3, b.y + 2, 7, 1);
    ctx.fillStyle = b.col; ctx.fillRect(b.x - 2, b.y - 4 + bob, 5, 5); ctx.fillStyle = '#e8e2d2'; ctx.fillRect(b.x - 2, b.y - 2 + bob, 5, 1);
    ctx.fillStyle = '#2d3038'; ctx.fillRect(b.x, b.y - 8 + bob, 1, 4);
  }
  // sun glints on the blue
  if (light > 0.4) { const step = Math.floor(clock * 4); ctx.fillStyle = '#e8f0f4'; ctx.globalAlpha = 0.22 * light; for (let i = 0; i < 40; i++) { const x = R(hash(i, step) * W), y = R(hash(step, i) * H); if (insideWater('ocean', x, y) && x > 200) ctx.fillRect(x, y, 2, 1); } ctx.globalAlpha = 1; }
  // gulls circling the islet by day
  if (light > 0.3 && !reduceMotion) for (let i = 0; i < 3; i++) { const a = clock * 0.5 + i * 2.1, x = R(OCEAN.islet.x + Math.cos(a) * (30 + i * 8)), y = R(OCEAN.islet.y - 20 + Math.sin(a) * 10), f = Math.floor(clock * 6 + i) % 2; ctx.fillStyle = '#e8e2d2'; ctx.fillRect(x - 2, y + f, 2, 1); ctx.fillRect(x + 1, y + f, 2, 1); ctx.fillRect(x, y + 1 - f, 1, 1); }
}

/** The lighthouse beam: a sweeping ray of light pixels, drawn with 'screen' before the light pass. */
export function drawBeam(ctx, clock, dark) {
  if (dark < 0.2) return;
  const I = OCEAN.islet, ox = I.x, oy = I.y - 38, a = clock * 0.9;
  ctx.globalCompositeOperation = 'screen';
  for (let s = 0; s < 3; s++) {
    const ang = a + s * Math.PI * 2 / 3, spread = 0.08;
    for (let i = 8; i < 150; i += 3) {
      const w = 1 + (i * spread | 0), fade = (1 - i / 150) * dark;
      ctx.fillStyle = `rgba(255,230,160,${0.22 * fade})`;
      ctx.fillRect(R(ox + Math.cos(ang) * i - w / 2), R(oy + Math.sin(ang) * i * 0.55), w, 1);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

export function oceanLights(state, players, clock, reduceMotion, boatLights, dark) {
  const flick = reduceMotion ? 0 : Math.sin(clock * 9) * 1.5;
  const I = OCEAN.islet;
  const L = [{ x: I.x, y: I.y - 38, r: 70 + flick, color: '#ffe6b0', a: 1 }, { x: I.x + 9, y: I.y + 1, r: 16, color: '#ffc46a', a: 0.8, win: true }];
  for (const b of BUOYS) if (Math.sin(clock * 2 + b.x) > 0.3) L.push({ x: b.x, y: b.y - 6, r: 14, color: b.col, a: 0.8 });
  L.push({ x: GATES.ocean[0].x + 31, y: OCEAN.channel.y - OCEAN.channel.half - 22, r: 30 + flick, color: '#ffb257', a: 1 });
  return L.concat(boatLights);
}

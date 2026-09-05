// Fish illustrations, drawn in code so the TV and the phones share them. Each species
// is a body profile (length, depth, where the deepest point sits, snout shape), a tail,
// a set of fins, a colour scheme and a pattern pass. Everything lands in a 64x32 cell,
// head to the left, scaled by `s` (whole pixels only). `silhouette` paints one colour
// for fish you have not caught yet.
export const ART_W = 64, ART_H = 32;

const SIL = '#1b2230';
const mixc = (a, b, t) => {
  const A = hex(a), B = hex(b); t = Math.max(0, Math.min(1, t));
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
};
const hex = c => c[0] === '#' ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] : c.match(/\d+/g).slice(0, 3).map(Number);
const dark = (c, k = 0.7) => mixc(c, '#000000', 1 - k);
const light = (c, k = 0.3) => mixc(c, '#ffffff', k);

/* --------------------------------------------------------------- specs --- */
// len/depth in cell pixels. peak: where the body is deepest (0 head, 1 tail). snout:
// 'round' | 'point' | 'duck' | 'shovel' | 'flat'. tail: 'fork' | 'round' | 'point' | 'hetero' | 'ribbon'.
// dorsal: 'spiny' (two-part, spiky front) | 'soft' | 'long' (low, most of the back) | 'rear'
// (small, set far back) | 'none'. pattern: function(P) painting over the body.
export const SPECS = {
  bluegill:  { len: 40, depth: 24, peak: 0.42, snout: 'round', tail: 'fork', dorsal: 'spiny', back: '#3f6f8a', side: '#7fa8b8', belly: '#e0a060', fin: '#4f7a90', eye: 1.6, pattern: 'bluegill' },
  perch:     { len: 44, depth: 18, peak: 0.4, snout: 'point', tail: 'fork', dorsal: 'spiny', back: '#7a7a3a', side: '#e0b84a', belly: '#f4e6a8', fin: '#e07a3a', eye: 1.5, pattern: 'bars' },
  sunfish:   { len: 36, depth: 25, peak: 0.45, snout: 'round', tail: 'round', dorsal: 'spiny', back: '#b06a2a', side: '#f2a25a', belly: '#f8c878', fin: '#c8783a', eye: 1.6, pattern: 'sunfish' },
  crappie:   { len: 42, depth: 22, peak: 0.45, snout: 'round', tail: 'fork', dorsal: 'spiny', back: '#6a7a5a', side: '#a9b6a0', belly: '#e8ecd8', fin: '#7a8a6a', eye: 1.7, pattern: 'mottle' },
  boot:      { boot: true },
  carp:      { len: 52, depth: 22, peak: 0.38, snout: 'round', tail: 'fork', dorsal: 'long', back: '#7a5a30', side: '#b48a4e', belly: '#e0c890', fin: '#c8703a', eye: 1.3, pattern: 'scales', barbels: 2 },
  bass:      { len: 50, depth: 20, peak: 0.4, snout: 'point', tail: 'fork', dorsal: 'spiny', back: '#3f6a34', side: '#5e8a4a', belly: '#e8ecd8', fin: '#4a6a3a', eye: 1.5, pattern: 'bass', bigmouth: true },
  catfish:   { len: 54, depth: 17, peak: 0.3, snout: 'flat', tail: 'fork', dorsal: 'soft', back: '#5a5f6a', side: '#7a7f8a', belly: '#c8c8c0', fin: '#5a5f6a', eye: 1, pattern: 'plain', barbels: 4, adipose: true },
  walleye:   { len: 50, depth: 16, peak: 0.4, snout: 'point', tail: 'fork', dorsal: 'spiny', back: '#7a6a30', side: '#c9b36a', belly: '#f0e8c0', fin: '#a89050', eye: 2, pattern: 'walleye' },
  trout:     { len: 48, depth: 16, peak: 0.42, snout: 'round', tail: 'fork', dorsal: 'soft', back: '#5a7a4a', side: '#c8b0a0', belly: '#f0ece0', fin: '#8a7a6a', eye: 1.5, pattern: 'trout', adipose: true },
  pike:      { len: 60, depth: 14, peak: 0.5, snout: 'duck', tail: 'fork', dorsal: 'rear', back: '#4f6a34', side: '#7d9c5b', belly: '#d8dcb0', fin: '#7a7a3a', eye: 1.5, pattern: 'pike' },
  burbot:    { len: 54, depth: 14, peak: 0.35, snout: 'round', tail: 'round', dorsal: 'long', back: '#5a4a3a', side: '#8d7a63', belly: '#d0c0a0', fin: '#6a5a48', eye: 1.2, pattern: 'mottle', barbels: 1 },
  koi:       { len: 46, depth: 22, peak: 0.4, snout: 'round', tail: 'fork', dorsal: 'long', back: '#f0b830', side: '#ffd24a', belly: '#fff0c0', fin: '#f0b830', eye: 1.3, pattern: 'koi', barbels: 2, flowing: true },
  eel:       { len: 60, depth: 10, peak: 0.3, snout: 'point', tail: 'ribbon', dorsal: 'none', back: '#a8c8d8', side: '#cfe6ee', belly: '#f0f8fa', fin: '#d8eef4', eye: 1.2, pattern: 'ghost', glow: true },
  lantern:   { len: 40, depth: 15, peak: 0.35, snout: 'round', tail: 'fork', dorsal: 'soft', back: '#1e2c48', side: '#3a4e70', belly: '#6a80a0', fin: '#2a3a58', eye: 2.2, pattern: 'lantern', glow: true },
  muskie:    { len: 62, depth: 15, peak: 0.5, snout: 'duck', tail: 'fork', dorsal: 'rear', back: '#5a7a44', side: '#8fa86a', belly: '#e0e4c0', fin: '#7a8a5a', eye: 1.5, pattern: 'muskie' },
  sturgeon:  { len: 62, depth: 14, peak: 0.35, snout: 'shovel', tail: 'hetero', dorsal: 'rear', back: '#3f4a58', side: '#5e6b7a', belly: '#b8bcc0', fin: '#4a5564', eye: 1, pattern: 'scutes', barbels: 4 },
};

/* ---------------------------------------------------------------- draw --- */
export function drawFishArt(ctx, id, x, y, s = 1, opts = {}) {
  const spec = SPECS[id];
  if (!spec) return;
  const sil = !!opts.silhouette;
  const px = (cx, cy, w, h, col) => { ctx.fillStyle = sil ? SIL : col; ctx.fillRect(Math.round(x + cx * s), Math.round(y + cy * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))); };
  if (spec.boot) return drawBoot(px, sil);
  const P = { px, spec, sil, top: [], bot: [], x0: 0, x1: 0 };
  body(P);
  if (!sil) patterns[spec.pattern]?.(P);
  fins(P);
  face(P);
  if (spec.glow && !sil) glow(P);
}

/** Half-depth of the body at t in [0, 1] (0 = snout, 1 = tail base). */
function profile(spec, t) {
  const peak = spec.peak, d = spec.depth / 2;
  let k;
  if (t < peak) { const u = t / peak; k = Math.sin(u * Math.PI / 2); if (spec.snout === 'duck' || spec.snout === 'shovel') k = Math.pow(u, 0.55); else if (spec.snout === 'flat') k = Math.pow(u, 0.35); else if (spec.snout === 'point') k = Math.pow(u, 0.75); else k = Math.pow(u, 0.5); }
  else { const u = (t - peak) / (1 - peak); k = Math.cos(u * Math.PI / 2); k = spec.tail === 'ribbon' ? 1 - u * 0.7 : Math.pow(k, 0.8) * 0.9 + 0.1; }
  return Math.max(1, d * k);
}

function body(P) {
  const { px, spec } = P;
  const tailLen = spec.tail === 'ribbon' ? 4 : 8;
  const L = spec.len - tailLen, x0 = Math.round((ART_W - spec.len) / 2), cy = 17;
  P.x0 = x0; P.x1 = x0 + L; P.cy = cy;
  for (let i = 0; i <= L; i++) {
    const t = i / L, h = profile(spec, t);
    let top = cy - h, bot = cy + h * (spec.snout === 'flat' && t < 0.3 ? 0.7 : 1);
    if (spec.snout === 'duck' && t < 0.2) { top = cy - h * 0.5 - 1; bot = cy + h * 0.5 + 1; }
    if (spec.snout === 'shovel' && t < 0.18) { top = cy - 1; bot = cy + h * 0.6 + 1; }
    P.top[i] = Math.round(top); P.bot[i] = Math.round(bot);
    const cx = x0 + i, H = P.bot[i] - P.top[i];
    // outline column, then back / side / belly bands
    px(cx, P.top[i] - 1, 1, H + 2, '#101418');
    px(cx, P.top[i], 1, H, spec.side);
    px(cx, P.top[i], 1, Math.max(1, Math.round(H * 0.3)), spec.back);
    px(cx, P.top[i] + Math.round(H * 0.3), 1, Math.max(1, Math.round(H * 0.12)), mixc(spec.back, spec.side, 0.5));
    px(cx, P.bot[i] - Math.max(1, Math.round(H * 0.28)), 1, Math.max(1, Math.round(H * 0.28)), spec.belly);
    // a highlight along the upper flank
    if (i > 3 && i < L - 2) px(cx, P.top[i] + Math.round(H * 0.42), 1, 1, light(spec.side, 0.25));
  }
  // gill line
  const gi = Math.round(L * (spec.snout === 'duck' ? 0.3 : 0.24)), gx = x0 + gi;
  for (let yy = P.top[gi] + 2; yy < P.bot[gi] - 1; yy++) px(gx + ((yy - cy) * (yy - cy) > 9 ? 1 : 0), yy, 1, 1, dark(spec.side, 0.6));
  // tail
  const tx = x0 + L, th = P.bot[L] - P.top[L];
  if (spec.tail === 'fork') {
    for (let i = 0; i < tailLen; i++) {
      const gap = Math.max(0, Math.round((i - 1) * 0.7)), lobe = Math.round(th / 2 + i * 0.9), col = i % 3 === 2 ? dark(spec.fin, 0.8) : spec.fin;
      px(tx + i, cy - lobe, 1, lobe - gap, col); px(tx + i, cy + gap, 1, lobe - gap, col);
      px(tx + i, cy - lobe - 1, 1, 1, '#101418'); px(tx + i, cy + lobe, 1, 1, '#101418');
      if (gap > 0) { px(tx + i, cy - gap, 1, 1, '#101418'); px(tx + i, cy + gap - 1, 1, 1, '#101418'); }
    }
    px(tx + tailLen, cy - Math.round(th / 2 + tailLen * 0.9) - 1, 1, 3, '#101418'); px(tx + tailLen, cy + Math.round(th / 2 + tailLen * 0.9) - 2, 1, 3, '#101418');
    if (spec.pattern === 'walleye') px(tx + 5, cy + 5, 3, 3, '#f4f0e0');
  } else if (spec.tail === 'round') {
    for (let i = 0; i < tailLen; i++) { const hh = Math.round((th / 2 + 2) * Math.cos((i / tailLen) * Math.PI / 2.4)); px(tx + i, cy - hh, 1, hh * 2, spec.fin); px(tx + i, cy - hh - 1, 1, 1, '#101418'); px(tx + i, cy + hh, 1, 1, '#101418'); }
  } else if (spec.tail === 'hetero') {
    for (let i = 0; i < tailLen + 2; i++) { const up = 2 + i * 1.1, dn = Math.max(1, 3 - i * 0.4); px(tx + i, Math.round(cy - up), 1, Math.round(up + dn), spec.fin); px(tx + i, Math.round(cy - up) - 1, 1, 1, '#101418'); }
  } else if (spec.tail === 'ribbon') {
    for (let i = 0; i < 6; i++) { const hh = Math.max(1, Math.round(th / 2 * (1 - i / 6))); px(tx + i, cy - hh, 1, hh * 2, spec.side); px(tx + i, cy - hh - 1, 1, 1, '#101418'); px(tx + i, cy + hh, 1, 1, '#101418'); }
  }
}

function fins(P) {
  const { px, spec, top, bot, x0, x1, cy } = P, L = x1 - x0;
  const at = t => Math.round(x0 + L * t);
  const fcol = spec.fin, fd = dark(spec.fin, 0.7);
  // dorsal
  if (spec.dorsal === 'spiny') {
    const a = at(0.3), b = at(0.56), c = at(0.8);
    for (let x = a; x < b; x++) { const h = 3 + Math.round(4 * Math.sin(((x - a) / (b - a)) * Math.PI)); const i = x - x0; px(x, top[i] - h, 1, h, (x - a) % 2 ? fd : fcol); px(x, top[i] - h - 1, 1, 1, '#101418'); }
    for (let x = b; x < c; x++) { const h = 2 + Math.round(4 * Math.sin(((x - b) / (c - b)) * Math.PI * 0.8)); const i = x - x0; px(x, top[i] - h, 1, h, fcol); px(x, top[i] - h - 1, 1, 1, '#101418'); }
  } else if (spec.dorsal === 'soft') {
    const a = at(0.4), b = at(0.6);
    for (let x = a; x < b; x++) { const h = 2 + Math.round(4 * Math.sin(((x - a) / (b - a)) * Math.PI)); const i = x - x0; px(x, top[i] - h, 1, h, (x - a) % 3 ? fcol : fd); px(x, top[i] - h - 1, 1, 1, '#101418'); }
  } else if (spec.dorsal === 'long') {
    const a = at(0.3), b = at(0.85);
    for (let x = a; x < b; x++) { const u = (x - a) / (b - a); const h = 1 + Math.round(4 * Math.pow(Math.sin(u * Math.PI), 0.5) * (1 - u * 0.4)); const i = x - x0; px(x, top[i] - h, 1, h, (x - a) % 3 ? fcol : fd); px(x, top[i] - h - 1, 1, 1, '#101418'); }
  } else if (spec.dorsal === 'rear') {
    const a = at(0.68), b = at(0.92);
    for (let x = a; x < b; x++) { const h = 1 + Math.round(4 * Math.sin(((x - a) / (b - a)) * Math.PI)); const i = x - x0; px(x, top[i] - h, 1, h, (x - a) % 2 ? fd : fcol); px(x, top[i] - h - 1, 1, 1, '#101418'); }
  }
  if (spec.adipose) { const x = at(0.8); px(x, top[x - x0] - 2, 3, 2, fcol); px(x, top[x - x0] - 3, 3, 1, '#101418'); }
  // anal fin and pelvic
  const aa = at(spec.dorsal === 'long' ? 0.6 : 0.62), ab = at(0.82);
  for (let x = aa; x < ab; x++) { const h = 1 + Math.round(3 * Math.sin(((x - aa) / (ab - aa)) * Math.PI)); const i = x - x0; px(x, bot[i], 1, h, (x - aa) % 2 ? fd : fcol); px(x, bot[i] + h, 1, 1, '#101418'); }
  const pv = at(0.38); px(pv, bot[pv - x0], 4, 2, fcol); px(pv + 1, bot[pv - x0] + 2, 3, 1, fd); px(pv, bot[pv - x0] + 2, 1, 1, '#101418'); px(pv + 4, bot[pv - x0], 1, 3, '#101418');
  // pectoral: a small fan on the flank behind the gill
  const pc = at(0.3), pyy = cy + 1;
  px(pc, pyy, 5, 1, fd); px(pc + 1, pyy + 1, 5, 1, fcol); px(pc + 2, pyy + 2, 4, 1, fd); px(pc + 6, pyy + 1, 1, 1, '#101418'); px(pc + 6, pyy + 2, 1, 1, '#101418');
  if (spec.flowing) { px(pc + 4, pyy + 3, 4, 1, fcol); px(pc + 6, pyy + 4, 3, 1, fd); }
}

function face(P) {
  const { px, spec, top, bot, x0, x1, cy, sil } = P, L = x1 - x0;
  const ei = Math.round(L * (spec.snout === 'duck' || spec.snout === 'shovel' ? 0.2 : 0.13)), ex = x0 + ei, r = Math.round(spec.eye);
  const ey = spec.snout === 'flat' ? cy - 2 : Math.round((top[ei] + cy) / 2) - (spec.depth > 20 ? 1 : 0);
  if (!sil) {
    px(ex - r, ey - r, r * 2 + 1, r * 2 + 1, '#f0f0e8'); px(ex - r + 1, ey - r + 1, r * 2 - 1, r * 2 - 1, spec.pattern === 'walleye' ? '#c8d8e8' : '#f8f8f0');
    px(ex, ey, r > 1 ? 2 : 1, r > 1 ? 2 : 1, '#101418'); px(ex - r, ey - r, r * 2 + 1, 1, '#101418'); px(ex + (r > 1 ? 1 : 0), ey - (r > 1 ? 1 : 0), 1, 1, '#ffffff');
  }
  // mouth
  const mi = 0, my = spec.snout === 'flat' ? cy + 1 : cy + (spec.bigmouth ? 1 : 0);
  if (spec.bigmouth) { for (let i = 0; i <= 8; i++) px(x0 + i, my + Math.round(i * 0.25), 1, 1, '#101418'); px(x0 + 2, my - 1, 1, 1, dark(spec.side, 0.6)); }
  else if (spec.snout === 'duck') { for (let i = 0; i <= 10; i++) px(x0 + i, cy + (i > 6 ? 1 : 0), 1, 1, '#101418'); for (let i = 1; i < 9; i += 2) px(x0 + i, cy + 1, 1, 1, '#f0f0e8'); }
  else if (spec.snout === 'shovel') { px(x0 + 1, cy + 2, 3, 1, '#101418'); }
  else if (spec.snout === 'flat') { for (let i = 0; i <= 6; i++) px(x0 + i, my, 1, 1, '#101418'); }
  else { for (let i = 0; i <= 4; i++) px(x0 + i, my + (i > 2 ? 1 : 0), 1, 1, '#101418'); }
  // barbels
  if (spec.barbels && !sil) {
    const col = dark(spec.side, 0.6);
    if (spec.barbels >= 2) { px(x0 + 1, cy + 3, 1, 4, col); px(x0, cy + 6, 1, 2, col); }
    if (spec.barbels >= 4) { px(x0 + 5, cy + 3, 1, 5, col); px(x0 + 4, cy + 7, 1, 2, col); px(x0 - 2, cy - 2, 3, 1, col); px(x0 - 3, cy - 3, 1, 1, col); px(x0 - 2, cy + 1, 3, 1, col); px(x0 - 4, cy + 2, 2, 1, col); }
    if (spec.barbels === 1) { px(x0 + 3, bot[3], 1, 4, col); }
  }
}

function glow(P) {
  const { px, spec, top, bot, x0, x1, cy } = P, L = x1 - x0;
  if (spec.pattern === 'lantern') for (let i = 6; i < L - 4; i += 4) { px(x0 + i, bot[i] - 2, 1, 1, '#ffe680'); px(x0 + i + 2, bot[i] - 4, 1, 1, '#fff4b0'); px(x0 + i, cy + 1, 1, 1, '#ffd070'); }
  if (spec.pattern === 'ghost') { for (let i = 8; i < L; i += 2) px(x0 + i, cy, 1, 1, i % 4 ? '#8fb4c8' : '#a8c8d8'); px(x0 + 3, cy - 1, 2, 1, '#e0fff0'); }
}

/* ------------------------------------------------------------ patterns --- */
const patterns = {
  plain() {},
  bluegill(P) { const { px, top, bot, x0, x1, cy } = P, L = x1 - x0; for (let k = 0; k < 6; k++) { const i = Math.round(L * (0.3 + k * 0.1)); for (let yy = top[i] + 3; yy < bot[i] - 3; yy += 2) px(x0 + i, yy, 1, 1, 'rgba(40,70,90,0.45)'); } const g = Math.round(L * 0.26); px(x0 + g, top[g] + 4, 3, 3, '#141820'); px(x0 + g - 1, top[g] + 5, 1, 1, '#141820'); },
  bars(P) { const { px, top, bot, x0, x1 } = P, L = x1 - x0; for (let k = 0; k < 6; k++) { const i = Math.round(L * (0.28 + k * 0.11)); for (let w = 0; w < 2; w++) for (let yy = top[i] + 1; yy < bot[i] - 3; yy++) px(x0 + i + w, yy, 1, 1, 'rgba(70,60,30,0.75)'); } },
  sunfish(P) { const { px, top, bot, x0, x1, cy } = P, L = x1 - x0; for (let i = 8; i < L - 6; i += 3) for (let yy = top[i] + 3; yy < bot[i] - 4; yy += 4) px(x0 + i + ((yy >> 2) % 2), yy, 1, 1, '#4fb0c0'); const g = Math.round(L * 0.26); px(x0 + g, top[g] + 4, 3, 3, '#141820'); px(x0 + g + 3, top[g] + 5, 1, 1, '#e04a2a'); for (let i = 2; i < 10; i++) px(x0 + i, bot[i] - 3, 1, 2, '#f0703a'); },
  mottle(P) { const { px, top, bot, x0, x1, spec } = P, L = x1 - x0; for (let i = 3; i < L - 2; i++) for (let yy = top[i] + 1; yy < bot[i] - 2; yy++) { const n = Math.sin(i * 1.7 + yy * 2.3) * Math.cos(i * 0.9 - yy * 1.1); if (n > 0.45) px(x0 + i, yy, 1, 1, dark(spec.side, 0.6)); } },
  scales(P) { const { px, top, bot, x0, x1, spec } = P, L = x1 - x0; for (let i = 8; i < L - 2; i += 3) for (let yy = top[i] + 2; yy < bot[i] - 2; yy += 3) { const off = ((i / 3) | 0) % 2 ? 1 : 0; px(x0 + i, yy + off, 2, 1, dark(spec.side, 0.72)); px(x0 + i, yy + off + 1, 1, 1, light(spec.side, 0.2)); } },
  bass(P) { const { px, top, bot, x0, x1, cy } = P, L = x1 - x0; for (let i = 6; i < L; i++) { const blot = Math.sin(i * 0.9) > 0.2 ? 2 : 1; px(x0 + i, cy - 1, 1, blot, '#243a20'); } for (let i = 8; i < L - 4; i += 5) px(x0 + i, cy - 5, 2, 1, 'rgba(30,50,25,0.5)'); },
  walleye(P) { const { px, top, bot, x0, x1 } = P, L = x1 - x0; for (let k = 0; k < 5; k++) { const i = Math.round(L * (0.3 + k * 0.12)); for (let yy = top[i] + 1; yy < bot[i] - 4; yy += 1) if ((yy + i) % 3) px(x0 + i, yy, 1, 1, 'rgba(90,70,30,0.55)'); } const d = Math.round(L * 0.52); px(x0 + d, top[d] - 6, 3, 3, '#2a2a20'); },
  trout(P) { const { px, top, bot, x0, x1, cy, spec } = P, L = x1 - x0; for (let i = 6; i < L; i++) px(x0 + i, cy, 1, 2, '#d98aa0'); for (let i = 5; i < L - 2; i++) for (let yy = top[i] + 1; yy < bot[i] - 3; yy++) { if (((i * 7 + yy * 13) % 17) === 0) px(x0 + i, yy, 1, 1, '#1a1a1a'); } for (let i = 4; i < L; i += 4) px(x0 + i, cy - 1, 1, 1, 'rgba(255,255,255,0.5)'); },
  pike(P) { const { px, top, bot, x0, x1, spec } = P, L = x1 - x0; for (let i = 14; i < L - 2; i += 4) for (let yy = top[i] + 2; yy < bot[i] - 2; yy += 4) px(x0 + i + ((yy >> 2) % 2) * 2, yy, 2, 1, '#d8dc9a'); },
  muskie(P) { const { px, top, bot, x0, x1 } = P, L = x1 - x0; for (let k = 0; k < 8; k++) { const i = Math.round(L * (0.3 + k * 0.085)); for (let yy = top[i] + 1; yy < bot[i] - 3; yy++) if (((yy + k) % 5) < 3) px(x0 + i, yy, 1, 1, 'rgba(50,70,35,0.7)'); } },
  koi(P) { const { px, top, bot, x0, x1, spec } = P, L = x1 - x0; for (let i = 3; i < L - 3; i++) for (let yy = top[i] + 1; yy < bot[i] - 1; yy++) { const n = Math.sin(i * 0.45 + 1) * Math.cos(yy * 0.6 + i * 0.1); if (n > 0.35) px(x0 + i, yy, 1, 1, '#f8f4e8'); else if (n < -0.55) px(x0 + i, yy, 1, 1, '#e86a30'); } for (let i = 8; i < L - 2; i += 3) for (let yy = top[i] + 2; yy < bot[i] - 2; yy += 3) px(x0 + i + (((i / 3) | 0) % 2), yy, 2, 1, 'rgba(120,80,20,0.25)'); },
  ghost(P) { const { px, top, bot, x0, x1, cy } = P, L = x1 - x0; for (let i = 6; i < L; i += 3) { px(x0 + i, cy - 2, 1, 1, 'rgba(255,255,255,0.6)'); } for (let i = 4; i < L - 2; i++) px(x0 + i, top[i] - 2, 1, 2, i % 2 ? '#e8f4f8' : '#d0e4ec'), px(x0 + i, top[i] - 3, 1, 1, '#101418'); },
  lantern(P) { const { px, top, bot, x0, x1, cy } = P, L = x1 - x0; for (let i = 4; i < L; i += 2) px(x0 + i, top[i] + 2, 1, 1, '#8aa0c8'); },
  scutes(P) { const { px, top, bot, x0, x1, cy } = P, L = x1 - x0; for (let i = 8; i < L - 3; i += 4) { px(x0 + i, top[i] - 1, 2, 2, '#c8ccd0'); px(x0 + i, top[i] - 2, 2, 1, '#101418'); px(x0 + i + 2, cy - 1, 2, 1, '#a8b0b8'); px(x0 + i, bot[i] - 2, 2, 1, '#a8b0b8'); } },
};

/* ---------------------------------------------------------------- boot --- */
function drawBoot(px, sil) {
  const leather = '#6b4a32', dk = '#4a3020', lt = '#8a6444', sole = '#2a2420';
  // shaft
  px(21, 3, 14, 20, '#101418'); px(22, 4, 12, 18, leather); px(22, 4, 3, 18, dk); px(31, 4, 3, 18, lt);
  // foot
  px(20, 20, 26, 8, '#101418'); px(21, 21, 24, 6, leather); px(21, 21, 24, 1, lt);
  px(19, 26, 29, 4, '#101418'); px(20, 27, 27, 2, sole); px(20, 27, 27, 1, '#3a342e');
  // toe cap and heel
  px(38, 22, 7, 4, dk); px(21, 22, 4, 4, dk);
  // laces
  for (let i = 0; i < 4; i++) { px(24, 7 + i * 4, 8, 1, '#d8d0bc'); px(24, 6 + i * 4, 1, 1, '#e8e2d2'); px(31, 8 + i * 4, 1, 1, '#e8e2d2'); }
  px(23, 3, 1, 4, '#d8d0bc'); px(33, 2, 1, 5, '#d8d0bc');
  // a strand of weed, a snail
  px(34, 14, 1, 10, '#4a7a3a'); px(35, 12, 1, 3, '#5a8a44'); px(35, 20, 2, 2, '#5a8a44'); px(33, 24, 2, 1, '#4a7a3a');
  px(41, 19, 4, 3, '#a89a7c'); px(40, 20, 1, 1, '#8a7a5c'); px(44, 18, 1, 1, '#8a7a5c');
  if (!sil) { px(28, 12, 2, 1, 'rgba(255,255,255,0.25)'); }
}

/** Habitat and timing text for the journal, shared by the TV and the phone. */
export const ZONE_NAMES = { shallows: 'Shallows', reeds: 'Reeds', open: 'Open water', deep: 'The deep' };

// Pixel toolkit for the host renderer: bitmap font, cached light sprites, dither
// patterns, tiny sprite parser, palette maths and the vignette. No game knowledge.

export function mkCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  // whole pixels only, whatever the maths upstream produced
  const fr = g.fillRect.bind(g), di = g.drawImage.bind(g);
  const box = (x, y, ww, hh) => { const x0 = Math.round(x), y0 = Math.round(y); return [x0, y0, Math.max(ww > 0 ? 1 : 0, Math.round(x + ww) - x0), Math.max(hh > 0 ? 1 : 0, Math.round(y + hh) - y0)]; };
  g.fillRect = (x, y, ww, hh) => fr(...box(x, y, ww, hh));
  g.drawImage = (...a) => { if (a.length === 3) di(a[0], Math.round(a[1]), Math.round(a[2])); else if (a.length === 5) di(a[0], Math.round(a[1]), Math.round(a[2]), Math.round(a[3]), Math.round(a[4])); else di(...a); };
  return [c, g];
}

export const R = Math.round;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** Deterministic noise in [0,1). */
export function hash(a, b, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* ---------------------------------------------------------- colours --- */
export function rgb(c) {
  if (Array.isArray(c)) return c;
  if (c[0] === '#') return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  return c.match(/\d+/g).slice(0, 3).map(Number);
}
export const css = ([r, g, b]) => `rgb(${r | 0},${g | 0},${b | 0})`;
export function mix(a, b, t) { const A = rgb(a), B = rgb(b); t = clamp(t, 0, 1); return css(A.map((v, i) => v + (B[i] - v) * t)); }
export function scale(c, k) { return css(rgb(c).map(v => clamp(v * k, 0, 255))); }
/** Pull a colour towards grey and cool it slightly: the film grade. */
export function grade(c, sat = 0.78, cool = 0.06) {
  const [r, g, b] = rgb(c); const l = r * 0.3 + g * 0.59 + b * 0.11;
  return css([lerp(l, r, sat) * (1 - cool), lerp(l, g, sat) * (1 - cool * 0.4), lerp(l, b, sat) * (1 + cool)]);
}
/** Blend a scene colour towards the lighting mood (used for things baked into backgrounds). */
export function tint(c, mood, k) { return mix(c, mood, k); }

/* ------------------------------------------------------------ blends --- */
// These used to be 4x4 Bayer dithers. They now resolve to plain translucent colours so
// every blend (light shafts, fog, shadows, sky bands, terrain edges) is smooth.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
/** Kept for callers that pick one of two colours per pixel: a plain threshold now. */
export const dith = (x, y, t) => t >= 0.5;
/** A fillStyle painting `color` at opacity `t` (0..1). */
export function ditherPattern(ctx, color, t) {
  const a = clamp(t, 0, 1);
  const m = typeof color === 'string' && color.startsWith('rgba') ? color.match(/[\d.]+/g) : null;
  const base = m ? +m[3] : 1;
  const [r, g, b] = rgb(color);
  return `rgba(${r | 0},${g | 0},${b | 0},${(a * base).toFixed(3)})`;
}
export function ditherRect(ctx, x, y, w, h, color, t) {
  if (t <= 0) return;
  ctx.fillStyle = t >= 1 ? color : ditherPattern(ctx, color, t);
  ctx.fillRect(R(x), R(y), R(w), R(h));
}

/* ------------------------------------------------------------ discs --- */
export function disc(c, x, y, r, color) {
  c.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    c.fillRect(R(x - half), R(y + dy), half * 2 + 1, 1);
  }
}
export function ellipse(c, x, y, rx, ry, color) {
  c.fillStyle = color;
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    c.fillRect(R(x - half), R(y + dy), half * 2 + 1, 1);
  }
}

/* ----------------------------------------------------------- lights --- */
const lightCache = new Map();
/**
 * A radial light sprite in flat bands: the falloff is posterized into `steps` rings with
 * hard edges, so a pool of light is pixel art like everything under it.
 * Draw it with 'lighter' onto the light map. Cached per (r, colour, steps, core).
 */
export function lightSprite(r, color, steps = 5, core = 0.9) {
  r = R(r);
  const key = `${r}|${color}|${steps}|${core}`;
  let c = lightCache.get(key);
  if (c) return c;
  const size = r * 2 + 3;
  const [cv, g] = mkCanvas(size, size);
  const [cr, cg, cb] = rgb(color);
  const img = g.createImageData(size, size), d = img.data;
  const cx = r + 1, cy = r + 1;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dd = Math.hypot(x - cx, y - cy) / r;
    if (dd > 1) continue;
    const f = (1 - dd) ** 1.6 * core, lvl = Math.ceil(f * steps) / steps * core;
    const i = (y * size + x) * 4;
    d[i] = cr * lvl; d[i + 1] = cg * lvl; d[i + 2] = cb * lvl; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  lightCache.set(key, cv);
  return cv;
}
export function drawLight(g, x, y, r, color, alpha = 1, steps = 5, core = 0.9) {
  const s = lightSprite(r, color, steps, core);
  g.globalAlpha = alpha;
  g.drawImage(s, R(x - r - 1), R(y - r - 1));
  g.globalAlpha = 1;
}

/* --------------------------------------------------------- vignette --- */
/** No vignette any more: a plain white canvas, so multiplying it changes nothing. */
export function makeVignette(w, h, strength = 0) {
  const [c, g] = mkCanvas(w, h);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  return c;
}

/* ---------------------------------------------------------- sprites --- */
/**
 * Parse a pixel map. rows: array of strings; pal: { char: colour }. '.' is clear.
 * Returns a canvas. Cached by the rows join and palette values.
 */
const spriteCache = new Map();
export function sprite(rows, pal, flip = false) {
  const key = rows.join('/') + '|' + Object.values(pal).join(',') + (flip ? '|f' : '');
  let c = spriteCache.get(key);
  if (c) return c;
  const w = Math.max(...rows.map(r => r.length)), h = rows.length;
  const [cv, g] = mkCanvas(w, h);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = pal[row[x]];
      if (!col) continue;
      g.fillStyle = col; g.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
  });
  spriteCache.set(key, cv);
  return cv;
}

/* ------------------------------------------------------------- font --- */
// 5x7 caps and digits, narrower lowercase. Row 5 is the baseline; row 6 descenders.
const F = {
'A':['.###.','#...#','#...#','#####','#...#','#...#','#...#'],'B':['####.','#...#','#...#','####.','#...#','#...#','####.'],
'C':['.###.','#...#','#....','#....','#....','#...#','.###.'],'D':['####.','#...#','#...#','#...#','#...#','#...#','####.'],
'E':['#####','#....','#....','####.','#....','#....','#####'],'F':['#####','#....','#....','####.','#....','#....','#....'],
'G':['.###.','#...#','#....','#.###','#...#','#...#','.####'],'H':['#...#','#...#','#...#','#####','#...#','#...#','#...#'],
'I':['###','.#.','.#.','.#.','.#.','.#.','###'],'J':['..###','...#.','...#.','...#.','...#.','#..#.','.##..'],
'K':['#...#','#..#.','#.#..','##...','#.#..','#..#.','#...#'],'L':['#....','#....','#....','#....','#....','#....','#####'],
'M':['#...#','##.##','#.#.#','#.#.#','#...#','#...#','#...#'],'N':['#...#','##..#','#.#.#','#..##','#...#','#...#','#...#'],
'O':['.###.','#...#','#...#','#...#','#...#','#...#','.###.'],'P':['####.','#...#','#...#','####.','#....','#....','#....'],
'Q':['.###.','#...#','#...#','#...#','#.#.#','#..#.','.##.#'],'R':['####.','#...#','#...#','####.','#.#..','#..#.','#...#'],
'S':['.####','#....','#....','.###.','....#','....#','####.'],'T':['#####','..#..','..#..','..#..','..#..','..#..','..#..'],
'U':['#...#','#...#','#...#','#...#','#...#','#...#','.###.'],'V':['#...#','#...#','#...#','#...#','#...#','.#.#.','..#..'],
'W':['#...#','#...#','#...#','#.#.#','#.#.#','##.##','#...#'],'X':['#...#','#...#','.#.#.','..#..','.#.#.','#...#','#...#'],
'Y':['#...#','#...#','.#.#.','..#..','..#..','..#..','..#..'],'Z':['#####','....#','...#.','..#..','.#...','#....','#####'],
'a':['....','....','.##.','...#','.###','#..#','.###'],'b':['#...','#...','###.','#..#','#..#','#..#','###.'],
'c':['....','....','.###','#...','#...','#...','.###'],'d':['...#','...#','.###','#..#','#..#','#..#','.###'],
'e':['....','....','.##.','#..#','####','#...','.###'],'f':['..##','.#..','###.','.#..','.#..','.#..','.#..'],
'g':['....','....','.###','#..#','#..#','.###','...#','.##.'],'h':['#...','#...','###.','#..#','#..#','#..#','#..#'],
'i':['#','.','#','#','#','#','#'],'j':['..#','...','..#','..#','..#','#.#','.#.'],
'k':['#...','#...','#..#','#.#.','##..','#.#.','#..#'],'l':['#.','#.','#.','#.','#.','#.','.#'],
'm':['.....','.....','##.#.','#.#.#','#.#.#','#.#.#','#...#'],'n':['....','....','###.','#..#','#..#','#..#','#..#'],
'o':['....','....','.##.','#..#','#..#','#..#','.##.'],'p':['....','....','###.','#..#','#..#','###.','#...','#...'],
'q':['....','....','.###','#..#','#..#','.###','...#','...#'],'r':['....','....','#.##','##..','#...','#...','#...'],
's':['....','....','.###','#...','.##.','...#','###.'],'t':['.#..','.#..','###.','.#..','.#..','.#..','..##'],
'u':['....','....','#..#','#..#','#..#','#..#','.###'],'v':['....','....','#...#','#...#','#...#','.#.#.','..#..'],
'w':['.....','.....','#...#','#...#','#.#.#','#.#.#','.#.#.'],'x':['....','....','#..#','#..#','.##.','#..#','#..#'],
'y':['....','....','#..#','#..#','#..#','.###','...#','.##.'],'z':['....','....','####','...#','.##.','#...','####'],
'0':['.###.','#...#','#..##','#.#.#','##..#','#...#','.###.'],'1':['..#..','.##..','..#..','..#..','..#..','..#..','.###.'],
'2':['.###.','#...#','....#','...#.','..#..','.#...','#####'],'3':['####.','....#','....#','.###.','....#','....#','####.'],
'4':['...#.','..##.','.#.#.','#..#.','#####','...#.','...#.'],'5':['#####','#....','####.','....#','....#','#...#','.###.'],
'6':['.###.','#....','#....','####.','#...#','#...#','.###.'],'7':['#####','....#','...#.','..#..','.#...','.#...','.#...'],
'8':['.###.','#...#','#...#','.###.','#...#','#...#','.###.'],'9':['.###.','#...#','#...#','.####','....#','....#','.###.'],
' ':['...','...','...','...','...','...','...'],'.':['.','.','.','.','.','.','#'],',':['..','..','..','..','..','.#','#.'],
':':['.','.','#','.','.','#','.'],';':['..','..','.#','..','..','.#','#.'],'!':['#','#','#','#','#','.','#'],
'?':['.###.','#...#','....#','...#.','..#..','.....','..#..'],"'":['#','#','.','.','.','.','.'],'"':['#.#','#.#','...','...','...','...','...'],
'-':['....','....','....','####','....','....','....'],'+':['.....','..#..','..#..','#####','..#..','..#..','.....'],
'/':['....#','....#','...#.','..#..','.#...','#....','#....'],'(':['.#','#.','#.','#.','#.','#.','.#'],')':['#.','.#','.#','.#','.#','.#','#.'],
'%':['##..#','##..#','...#.','..#..','.#...','#..##','#..##'],'>':['#....','.#...','..#..','...#.','..#..','.#...','#....'],
'<':['....#','...#.','..#..','.#...','..#..','...#.','....#'],'=':['....','....','####','....','####','....','....'],
'&':['.##..','#..#.','#..#.','.##..','#.#.#','#..#.','.##.#'],'x':['....','....','#..#','#..#','.##.','#..#','#..#'],
'*':['.....','#.#.#','.###.','#####','.###.','#.#.#','.....'],'#':['.#.#.','.#.#.','#####','.#.#.','#####','.#.#.','.#.#.'],
'_':['.....','.....','.....','.....','.....','.....','#####'],
};
const glyphCache = new Map();
function glyph(ch, color) {
  const rows = F[ch] || F['?'], key = ch + '|' + color;
  let c = glyphCache.get(key);
  if (c) return c;
  c = sprite(rows, { '#': color });
  glyphCache.set(key, c);
  return c;
}
export function textWidth(s, scale = 1) {
  let w = 0;
  for (const ch of s) w += (F[ch] || F['?'])[0].length + 1;
  return (w - 1) * scale;
}
/**
 * Draw bitmap text. y is the top of the 7-row cell. align: left|center|right.
 * shadow: colour or false. scale: integer.
 */
export function text(ctx, s, x, y, { color = '#e8e2d2', align = 'left', shadow = '#0a0c12', scale = 1 } = {}) {
  s = String(s);
  let cx = R(x), cy = R(y);
  const w = textWidth(s, scale);
  if (align === 'center') cx -= R(w / 2); else if (align === 'right') cx -= w;
  const draw = (col, ox, oy) => {
    let px = cx + ox;
    for (const ch of s) {
      const g = glyph(ch, col);
      ctx.drawImage(g, px, cy + oy, g.width * scale, g.height * scale);
      px += (g.width + 1) * scale;
    }
  };
  if (shadow) draw(shadow, scale, scale);
  draw(color, 0, 0);
  return w;
}

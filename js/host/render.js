// The TV view. Draws to a 640x360 backing canvas, scaled up by an integer.
// Everything is snapped to whole pixels; nothing is anti-aliased on purpose.
import { WORLD, TOWN, LAKE, DEEP, ROCKS, REEDS, DOCK, BUILDINGS, lakeNorm, lightAt, seasonOf, dayOfSeason } from '../game/world.js';
import { gearStats, GEAR } from '../shared/catalog.js';
import { SEASON_NAMES, clockText } from '../shared/protocol.js';

const W = WORLD.w, H = WORLD.h;
const R = Math.round;

const SEASON = [
  { grass: '#6fa85a', grass2: '#5b9149', canopy: '#8cc271', canopy2: '#6da85c', bloom: '#f3b7cc', water: '#4a8fb5', deep: '#356f95', shallow: '#62a6c7', sand: '#d9c58b', hill: '#7fb069', hill2: '#5c8a4a', reed: '#4f7a3a' },
  { grass: '#5d9448', grass2: '#4d7f3c', canopy: '#4e8a44', canopy2: '#3d7036', bloom: null,      water: '#3d86b8', deep: '#2b6591', shallow: '#5aa0cc', sand: '#e3cf92', hill: '#5e9a4e', hill2: '#3f7a3c', reed: '#3f6d2f' },
  { grass: '#b58f4a', grass2: '#9c7a3e', canopy: '#d9843a', canopy2: '#c65a2e', bloom: '#e9a04a', water: '#3a6f95', deep: '#2a5375', shallow: '#4f88ab', sand: '#cdb37e', hill: '#b7823f', hill2: '#8f5f34', reed: '#8f7a3a' },
  { grass: '#e4ecf1', grass2: '#c9d6df', canopy: '#f2f6f8', canopy2: '#cfdbe3', bloom: null,      water: '#5b8aa8', deep: '#3f6a86', shallow: '#7ba4bd', sand: '#d5dde0', hill: '#dbe5eb', hill2: '#a9bcc8', reed: '#8a7a5c' },
];

function hash(a, b, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
  const bgx = bg.getContext('2d');
  const dark = document.createElement('canvas'); dark.width = W; dark.height = H;
  const dkx = dark.getContext('2d');
  let bgSeason = -1;
  let clock = 0, shake = 0, lastNow = performance.now();
  const ambient = [];         // seasonal drift particles
  const fx = [];              // event particles {world, x, y, vx, vy, life, color, g}
  const popups = [];          // floating text {world, x, y, text, color, life, big}
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    const s = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)));
    const fit = Math.min(innerWidth / W, innerHeight / H);
    const scale = fit < 1 ? fit : s;
    canvas.style.width = `${W * scale}px`; canvas.style.height = `${H * scale}px`;
  }
  addEventListener('resize', resize); resize();

  /* --------------------------------------------------------- helpers --- */
  const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(R(x), R(y), R(w), R(h)); };
  function text(s, x, y, { color = '#f5efe0', align = 'left', size = 8, font = 'Silkscreen', shadow = true } = {}) {
    ctx.font = `${size}px "${font}", monospace`;
    ctx.textAlign = align; ctx.textBaseline = 'top';
    if (shadow) { ctx.fillStyle = '#0d1420'; ctx.fillText(s, R(x) + 1, R(y) + 1); }
    ctx.fillStyle = color; ctx.fillText(s, R(x), R(y));
  }
  function disc(c, x, y, r, color) {
    c.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy));
      c.fillRect(R(x - half), R(y + dy), half * 2 + 1, 1);
    }
  }
  const ellipseNorm = (x, y, e) => ((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2;

  /* ------------------------------------------------------ background --- */
  function buildBackground(season) {
    const S = SEASON[season];
    bgx.fillStyle = S.grass; bgx.fillRect(0, 0, W, H);
    // Grass texture
    for (let i = 0; i < 900; i++) {
      const x = R(hash(i, 1) * W), y = R(hash(i, 2) * H);
      if (lakeNorm(x, y) > 1.12) { bgx.fillStyle = S.grass2; bgx.fillRect(x, y, 2, 1); }
    }
    // Sand ring then water
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n = lakeNorm(x, y);
      if (n < 1.09 && n >= 1) { bgx.fillStyle = S.sand; bgx.fillRect(x, y, 1, 1); }
    }
    bgx.fillStyle = S.water;
    for (let y = 0; y < H; y++) {
      const dy = (y - LAKE.cy) / LAKE.ry; if (Math.abs(dy) > 1) continue;
      const hw = LAKE.rx * Math.sqrt(1 - dy * dy);
      bgx.fillRect(R(LAKE.cx - hw), y, R(hw * 2), 1);
    }
    if (season === 3) { // ice rim
      bgx.fillStyle = '#cfe3ea';
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const n = lakeNorm(x, y); if (n < 1 && n > 0.9 && hash(x, y) > 0.35) bgx.fillRect(x, y, 1, 1);
      }
    }
    // Deep water with a dithered rim, and a dithered shallows band near the shore
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n = lakeNorm(x, y); if (n >= 1) continue;
      const d = ellipseNorm(x, y, DEEP);
      const deepHit = d < 0.8 || (d < 0.92 && ((x + y) & 1) === 0) || (d < 1.02 && (x & 1) && (y & 1));
      if (deepHit) { bgx.fillStyle = S.deep; bgx.fillRect(x, y, 1, 1); }
      else if (n > 0.86 && ((x + y) & 1) === 0 && n > 0.86 + hash(x, y) * 0.1) { bgx.fillStyle = S.shallow; bgx.fillRect(x, y, 1, 1); }
    }
    // Trees on the shore
    for (let i = 0; i < 160; i++) {
      const x = R(hash(i, 7) * W), y = R(hash(i, 8) * H);
      if (lakeNorm(x, y) < 1.2 || (x > 120 && x < 220 && y > 300)) continue;
      const r = 4 + Math.floor(hash(i, 9) * 4);
      bgx.fillStyle = '#5a3a2a'; bgx.fillRect(x - 1, y, 2, 4);
      disc(bgx, x, y - r + 1, r, S.canopy2);
      disc(bgx, x - 1, y - r, r - 1, S.canopy);
      if (S.bloom) for (let k = 0; k < 4; k++) { bgx.fillStyle = S.bloom; bgx.fillRect(x - r + 1 + R(hash(i, k) * (r * 2 - 2)), y - r - 1 + R(hash(k, i) * (r - 1)), 1, 1); }
    }
    // Reeds and lily pads
    for (const rd of REEDS) for (let i = 0; i < 26; i++) {
      const a = hash(rd.x, i) * Math.PI * 2, d = hash(i, rd.y) * rd.r;
      const x = R(rd.x + Math.cos(a) * d), y = R(rd.y + Math.sin(a) * d * 0.7);
      if (lakeNorm(x, y) > 0.99) continue;
      if (i % 3 === 0 && season !== 3) { bgx.fillStyle = '#5da05a'; bgx.fillRect(x - 2, y - 1, 5, 3); bgx.fillStyle = S.water; bgx.fillRect(x + 1, y, 2, 1); }
      else { bgx.fillStyle = S.reed; bgx.fillRect(x, y - 6, 1, 7); bgx.fillStyle = '#c9a25a'; bgx.fillRect(x, y - 7, 1, 2); }
    }
    for (const rk of ROCKS) { disc(bgx, rk.x, rk.y, rk.r, '#6e7480'); disc(bgx, rk.x - 1, rk.y - 1, rk.r - 2, '#8f96a3'); bgx.fillStyle = '#b6bcc6'; bgx.fillRect(rk.x - 2, rk.y - rk.r + 1, 2, 1); }
    // Pier and boathouse
    bgx.fillStyle = '#5a3a2a'; bgx.fillRect(DOCK.pierX - 8, DOCK.pierTop, 3, DOCK.pierBottom - DOCK.pierTop); bgx.fillRect(DOCK.pierX + 5, DOCK.pierTop, 3, DOCK.pierBottom - DOCK.pierTop);
    for (let y = DOCK.pierTop; y < DOCK.pierBottom; y += 3) { bgx.fillStyle = y % 2 ? '#a06a44' : '#8b5a3c'; bgx.fillRect(DOCK.pierX - 7, y, 14, 2); }
    bgx.fillStyle = '#4a3020'; bgx.fillRect(DOCK.pierX + 7, DOCK.pierTop, 1, 10); // lantern pole
    bgx.fillStyle = '#6b4a32'; bgx.fillRect(DOCK.pierX + 12, DOCK.pierBottom - 4, 26, 18);
    bgx.fillStyle = '#8b3a3a'; bgx.fillRect(DOCK.pierX + 10, DOCK.pierBottom - 10, 30, 7);
    bgx.fillStyle = '#f0c04a'; bgx.fillRect(DOCK.pierX + 22, DOCK.pierBottom + 2, 4, 5);
    bgSeason = season;
  }

  /* --------------------------------------------------------- ambient --- */
  function tickAmbient(season, night, dt) {
    const want = reduceMotion ? 12 : (season === 3 ? 70 : season === 2 ? 30 : season === 0 ? 22 : night ? 24 : 8);
    while (ambient.length < want) ambient.push({ x: Math.random() * W, y: Math.random() * H, t: Math.random() * 10, kind: season === 1 && night ? 'fly' : season });
    while (ambient.length > want) ambient.pop();
    for (const a of ambient) {
      a.t += dt;
      if (a.kind === 'fly') { a.x += Math.sin(a.t * 1.3) * 12 * dt; a.y += Math.cos(a.t * 0.9) * 8 * dt; }
      else if (a.kind === 3) { a.y += 14 * dt; a.x += Math.sin(a.t * 2) * 6 * dt; }
      else if (a.kind === 2) { a.y += 20 * dt; a.x += (10 + Math.sin(a.t * 3) * 14) * dt; }
      else if (a.kind === 0) { a.y += 9 * dt; a.x += (6 + Math.sin(a.t * 2) * 8) * dt; }
      else { a.y += 4 * dt; }
      if (a.y > H + 4) { a.y = -4; a.x = Math.random() * W; }
      if (a.x > W + 4) a.x = -4;
      if (a.x < -4) a.x = W + 4;
    }
  }
  function drawAmbient() {
    for (const a of ambient) {
      if (a.kind === 'fly') { if (Math.sin(a.t * 4) > 0.2 && lakeNorm(a.x, a.y) > 1.05) px(a.x, a.y, 1, 1, '#ffe680'); }
      else if (a.kind === 3) px(a.x, a.y, 2, 2, '#f4f8fb');
      else if (a.kind === 2) px(a.x, a.y, 2, 1, hash(a.x | 0, 3) > 0.5 ? '#e0803a' : '#c8582a');
      else if (a.kind === 0) px(a.x, a.y, 1, 1, '#f3b7cc');
      else if (lakeNorm(a.x, a.y) > 1.05) px(a.x, a.y, 1, 1, '#ffffff');
    }
  }

  /* ------------------------------------------------------------ lake --- */
  function drawLake(state, cam, pw, ph, players, hidePlayers) {
    if (bgSeason !== seasonOf(state.time.day)) buildBackground(seasonOf(state.time.day));
    ctx.drawImage(bg, 0, 0);
    // Sparkles
    const step = Math.floor(clock * 3);
    for (let i = 0; i < 90; i++) {
      const x = R(hash(i, step) * W), y = R(hash(step, i) * H);
      if (lakeNorm(x, y) < 0.98) px(x, y, 2, 1, 'rgba(255,255,255,0.35)');
    }
    // Lantern on the pier at night
    px(DOCK.pierX + 6, DOCK.pierTop - 1, 3, 3, '#f0c04a');
    drawAmbient();
    if (hidePlayers) return;
    for (const p of players) if (p.loc === 'lake') drawBoat(state, p);
    for (const p of players) if (p.loc === 'lake' && p.fishing) drawFishing(state, p, cam, pw, ph);
    drawFx('lake');
  }

  function drawBoat(state, p) {
    const b = p.boat, gear = gearStats(state.empire);
    const len = gear.boatLen, wid = Math.round(len * 0.48);
    const a = Math.round(b.heading / (Math.PI / 4)) * (Math.PI / 4);
    const c = Math.cos(a), s = Math.sin(a);
    const T = (lx, ly) => ({ x: R(b.x + lx * c - ly * s), y: R(b.y + lx * s + ly * c) });
    const poly = (pts, color) => {
      ctx.fillStyle = color; ctx.beginPath();
      pts.forEach((q, i) => { const t = T(q[0], q[1]); i ? ctx.lineTo(t.x, t.y) : ctx.moveTo(t.x, t.y); });
      ctx.closePath(); ctx.fill();
    };
    // Wake
    if (p.moving) {
      const sp = Math.hypot(b.vx, b.vy) / gear.speed;
      for (let i = 1; i <= 4; i++) {
        const t = T(-len / 2 - i * 5, (i % 2 ? 1 : -1) * (2 + i));
        px(t.x, t.y, 2, 1, `rgba(255,255,255,${0.5 * sp * (1 - i / 5)})`);
      }
    }
    if (!p.connected) ctx.globalAlpha = 0.45;
    // Hull shadow, hull, deck, trim
    poly([[-len / 2, -wid / 2 + 1], [len / 2 - 3, -wid / 2 + 1], [len / 2 + 2, 1], [len / 2 - 3, wid / 2 + 1], [-len / 2, wid / 2 + 1]], 'rgba(0,0,0,0.25)');
    poly([[-len / 2, -wid / 2], [len / 2 - 3, -wid / 2], [len / 2 + 2, 0], [len / 2 - 3, wid / 2], [-len / 2, wid / 2]], '#5a3a2a');
    poly([[-len / 2 + 2, -wid / 2 + 2], [len / 2 - 4, -wid / 2 + 2], [len / 2 - 1, 0], [len / 2 - 4, wid / 2 - 2], [-len / 2 + 2, wid / 2 - 2]], '#b07a4e');
    poly([[-len / 2, -wid / 2], [len / 2 - 3, -wid / 2], [len / 2 - 3, -wid / 2 + 2], [-len / 2, -wid / 2 + 2]], p.color);
    if (state.empire.boat >= 2) poly([[-len / 2 + 3, -wid / 2 + 3], [-1, -wid / 2 + 3], [-1, wid / 2 - 3], [-len / 2 + 3, wid / 2 - 3]], p.color);
    if (state.empire.engine >= 1) { const t = T(-len / 2 - 2, 0); px(t.x - 1, t.y - 1, 3, 3, '#333c57'); }
    // Captain
    const cp = T(-len / 4 + (state.empire.boat >= 2 ? 3 : 0), 0);
    px(cp.x - 1, cp.y - 1, 3, 3, '#f0c8a0'); px(cp.x - 1, cp.y - 2, 3, 1, p.color);
    // Lantern at the stern
    const lt = T(-len / 2 + 1, wid / 2 - 1);
    px(lt.x, lt.y, 2, 2, '#f0c04a');
    ctx.globalAlpha = 1;
    text(p.name, b.x, b.y - wid / 2 - 14, { color: p.color, align: 'center' });
    if (!p.connected) text('away', b.x, b.y + wid / 2 + 4, { color: '#a8b8c6', align: 'center' });
  }

  function drawFishing(state, p, cam, pw, ph) {
    const f = p.fishing, b = p.boat;
    const bowX = R(b.x + Math.cos(b.heading) * 8), bowY = R(b.y + Math.sin(b.heading) * 8);
    if (f.stage === 'charging') {
      px(b.x - 16, b.y - 22, 32, 5, '#0d1420'); px(b.x - 15, b.y - 21, 30 * f.power, 3, f.power > 0.85 ? '#d95b4f' : '#f0c04a');
      const tipX = R(b.x + Math.cos(b.heading) * 14), tipY = R(b.y + Math.sin(b.heading) * 14);
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bowX, bowY); ctx.lineTo(tipX, tipY); ctx.stroke();
      return;
    }
    if (f.stage === 'lost' || f.stage === 'caught') return;
    const bx = R(f.bx), by = R(f.by - (f.arc || 0) + (f.dip || 0));
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bowX, bowY); ctx.lineTo(bx, by); ctx.stroke();
    if (f.stage === 'waiting' || f.stage === 'flying' || f.stage === 'bite') {
      // Ripples while waiting
      if (f.stage === 'waiting' && !reduceMotion) { const r = 3 + Math.floor((clock * 2) % 3) * 2; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.strokeRect(bx - r, by - r * 0.6, r * 2, r * 1.2); }
      px(bx - 1, by - 2, 3, 2, '#d95b4f'); px(bx - 1, by, 3, 2, '#f5efe0');
      if (f.stage === 'bite') {
        const bounce = reduceMotion ? 0 : Math.round(Math.abs(Math.sin(clock * 14)) * 3);
        text('!', bx, by - 22 - bounce, { color: '#f0c04a', align: 'center', size: 16, font: 'Press Start 2P' });
        const ring = Math.round(4 + (f.win / f.winDur) * 10);
        ctx.strokeStyle = '#f0c04a'; ctx.strokeRect(bx - ring, by - ring, ring * 2, ring * 2);
      }
    }
    if (f.stage === 'reel') {
      px(bx - 2, by - 2, 4, 4, f.fish.color); // fish thrashing below
      const jx = reduceMotion ? 0 : Math.round(Math.sin(clock * 30) * (1 + f.tension * 2));
      drawReelBar(f, p, R(b.x) + 18 + jx, R(b.y) - 50, cam, pw, ph);
    }
  }

  function drawReelBar(f, p, x, y, cam, pw, ph) {
    // Keep the bar inside the pane
    x = Math.min(Math.max(x, cam.x + 4), cam.x + pw - 30); y = Math.min(Math.max(y, cam.y + 24), cam.y + ph - 90);
    const h = 84, w = 12;
    px(x - 6, y - 2, w + 16, h + 4, '#0d1420');
    // Tension (left)
    px(x - 4, y, 2, h, '#2a3b50'); px(x - 4, y + h - R(h * f.tension), 2, R(h * f.tension), f.tension > 0.7 ? '#ff4b3a' : '#d95b4f');
    // Track, zone, fish
    px(x, y, w, h, '#1b3a55');
    const zTop = y + R((1 - f.zpos - f.zsize / 2) * h), zH = R(f.zsize * h);
    px(x, zTop, w, zH, p.color);
    const fy = y + R((1 - f.fpos) * h) - 2;
    px(x + 3, fy, 4, 4, f.inZone ? '#ffffff' : f.fish.color);
    px(x + 1, fy + 1, 2, 2, f.fish.color);
    // Progress (right)
    px(x + w + 2, y, 3, h, '#2a3b50'); px(x + w + 2, y + h - R(h * f.prog), 3, R(h * f.prog), '#7bc96f');
    // Tug prompts
    if (f.tug?.phase === 'warn') text('!', x + w / 2, y - 14 - (reduceMotion ? 0 : R(Math.abs(Math.sin(clock * 16)) * 2)), { color: '#d95b4f', align: 'center', size: 8, font: 'Press Start 2P' });
    if (f.tug?.phase === 'open') {
      const r = 3 + R((f.tug.t / f.tug.dur) * 9);
      ctx.strokeStyle = '#f0c04a'; ctx.lineWidth = 1; ctx.strokeRect(x + w / 2 - r, fy + 2 - r, r * 2, r * 2);
      text('PULL', x + w / 2, y - 14, { color: '#f0c04a', align: 'center', size: 8, font: 'Press Start 2P' });
    }
    text(f.fish.tier >= 3 ? '???' : f.fish.name, x + w / 2, y + h + 6, { align: 'center', color: '#f5efe0' });
  }

  /* ------------------------------------------------------------ town --- */
  function drawTown(state, p, cam, pw, ph) {
    const season = seasonOf(state.time.day), S = SEASON[season];
    const light = lightAt(state.time.minute), m = state.time.minute;
    const dusk = 1 - Math.abs(light * 2 - 1); // peaks mid-transition
    const evening = m > 720;
    // Sky bands
    const sky = mix(mix('#101a33', '#7fbde6', light), evening ? '#f0a25a' : '#ffd08a', dusk * 0.7);
    const hor = mix(mix('#1a2540', '#d5eaf4', light), evening ? '#f7c66a' : '#ffe2a8', dusk * 0.8);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = mix(sky, hor, i / 5); ctx.fillRect(cam.x, cam.y + i * 34, pw, 34); }
    if (light < 0.5) for (let i = 0; i < 40; i++) { const x = R(hash(i, 21) * TOWN.w), y = R(hash(21, i) * 150); if (hash(i, Math.floor(clock)) > 0.15) px(x - cam.x * 0.1 + cam.x, y + cam.y, 1, 1, `rgba(255,255,255,${(0.5 - light) * 1.6})`); }
    // Moon or sun
    const sunX = cam.x + pw * 0.8, sunY = cam.y + 40;
    if (light > 0.3) disc(ctx, sunX, sunY, 8, '#fff2b0'); else disc(ctx, sunX - pw * 0.5, sunY + 10, 6, '#e6eefc');
    // Hills, two parallax layers
    for (const [par, base, col] of [[0.25, 200, S.hill], [0.5, 232, S.hill2]]) {
      ctx.fillStyle = shade(col, light);
      for (let x = 0; x < pw; x += 4) {
        const wx = (x + cam.x * par);
        const hgt = 30 + Math.sin(wx * 0.02) * 18 + Math.sin(wx * 0.053) * 9;
        ctx.fillRect(R(cam.x + x), R(cam.y + base - hgt), 4, R(hgt + 80));
      }
    }
    // Ground
    px(cam.x, TOWN.ground, pw, H - TOWN.ground, shade('#6b4a32', light));
    px(cam.x, TOWN.ground, pw, 4, shade(S.grass2, light));
    for (let x = 0; x < pw; x += 7) px(cam.x + x + (cam.x % 7), TOWN.ground + 8 + (x % 3), 3, 1, shade('#4a3020', light));
    // Water and pier at the dock end
    px(0, TOWN.ground - 8, 120, 8, shade(S.water, light));
    for (let y = TOWN.ground - 10; y < TOWN.ground; y += 3) px(30, y, 60, 2, y % 2 ? '#a06a44' : '#8b5a3c');
    px(38, TOWN.ground - 40, 2, 30, '#5a3a2a'); px(84, TOWN.ground - 40, 2, 30, '#5a3a2a');
    px(36, TOWN.ground - 44, 6, 5, '#f0c04a');
    // Lamp posts
    for (const lx of [200, 450, 700]) { px(lx, TOWN.ground - 42, 2, 42, '#333c57'); px(lx - 2, TOWN.ground - 46, 6, 5, light < 0.5 ? '#f0c04a' : '#5a5f6f'); }
    // Buildings
    for (const b of BUILDINGS) {
      if (!b.w) continue;
      const bx = b.x - b.w / 2, by = TOWN.ground - 96, bh = 96;
      px(bx + 3, by + 3, b.w, bh, 'rgba(0,0,0,0.2)');
      px(bx, by, b.w, bh, shade(b.color, light));
      for (let y = by + 10; y < TOWN.ground; y += 9) px(bx, y, b.w, 1, shade('#000000', 0.85));
      // Roof
      for (let i = 0; i < 14; i++) px(bx - 10 + i * 2, by - 2 - i * 2 + 24, b.w + 20 - i * 4, 2, shade(b.roof, light));
      px(bx - 8, by + 22, b.w + 16, 3, shade('#3a2a1a', light));
      // Windows
      for (let k = 0; k < Math.floor(b.w / 40); k++) {
        const wx = bx + 12 + k * 40; if (Math.abs(wx + 5 - b.x) < 12) continue;
        px(wx - 1, by + 36, 12, 12, '#2a1d08'); px(wx, by + 37, 10, 10, light < 0.5 ? '#ffe680' : '#9fd3f0'); px(wx + 4, by + 37, 2, 10, '#2a1d08'); px(wx, by + 41, 10, 2, '#2a1d08');
      }
      // Door, sign
      px(b.x - 8, TOWN.ground - 26, 16, 26, '#2a1d08'); px(b.x - 6, TOWN.ground - 24, 12, 24, shade('#8b5a3c', light)); px(b.x + 3, TOWN.ground - 13, 2, 2, '#f0c04a');
      px(b.x - 28, by + 26, 56, 12, '#f5efe0'); px(b.x - 26, by + 28, 52, 8, '#2a1d08');
      text(b.label, b.x, by + 28, { color: '#f0c04a', align: 'center', shadow: false });
    }
    // Night pass for the town pane
    if (light < 1) {
      ctx.fillStyle = `rgba(15,22,48,${(1 - light) * 0.45})`; ctx.fillRect(cam.x, cam.y, pw, ph);
      for (const lx of [200, 450, 700]) glow(ctx, lx + 1, TOWN.ground - 44, 26, (1 - light) * 0.35, '#ffe680');
      glow(ctx, 39, TOWN.ground - 42, 22, (1 - light) * 0.35, '#ffe680');
    }
    // Walker
    const w = p.walk, wx = R(w.x), wy = TOWN.ground;
    const step = w.moving ? Math.floor(w.t * 8) % 2 : 0;
    px(wx - 3, wy - 4, 3, 4, '#2a1d08'); px(wx + (step ? 1 : 0), wy - 4, 3, 4, '#2a1d08');
    px(wx - 4, wy - 12, 8, 8, p.color);
    px(wx - 3, wy - 17, 6, 5, '#f0c8a0'); px(wx - 4, wy - 19, 8, 3, p.color);
    px(wx + (w.dir > 0 ? 1 : -2), wy - 15, 1, 1, '#0d1420');
    if (p.near && !p.menu) text(p.prompt, wx, wy - 30, { color: '#f0c04a', align: 'center' });
    drawFx('town');
    if (p.menu) drawMenu(state, p, cam, pw, ph);
  }

  function drawMenu(state, p, cam, pw, ph) {
    const m = p.menu, rows = m.items.length;
    const mw = Math.min(pw - 16, 236), mh = 30 + rows * 20 + 8;
    const x = R(cam.x + pw / 2 - mw / 2), y = R(cam.y + 40);
    px(x + 4, y + 4, mw, mh, 'rgba(0,0,0,0.4)');
    px(x, y, mw, mh, '#2a3b50'); px(x + 2, y + 2, mw - 4, mh - 4, '#121b28'); px(x, y, mw, 3, '#7fa8c4'); px(x, y + mh - 3, mw, 3, '#7fa8c4'); px(x, y, 3, mh, '#7fa8c4'); px(x + mw - 3, y, 3, mh, '#7fa8c4');
    const title = { fishmonger: 'Fishmonger', tackle: 'Tackle shop', boatyard: 'Boatyard' }[m.shop];
    text(title, x + 10, y + 9, { color: '#f0c04a', font: 'Press Start 2P' });
    text(`${state.empire.gold} g`, x + mw - 10, y + 9, { color: '#f0c04a', align: 'right' });
    m.items.forEach((it, i) => {
      const ry = y + 30 + i * 20, cur = i === m.cursor;
      if (cur) px(x + 5, ry - 3, mw - 10, 19, '#2a3b50');
      const col = !it.enabled && it.kind !== 'leave' ? '#7d8b98' : cur ? '#ffffff' : '#f5efe0';
      text((cur ? '> ' : '  ') + it.label, x + 10, ry, { color: col });
      if (it.desc) text(it.desc, x + 22, ry + 9, { color: '#a8b8c6' });
      if (it.price !== null && it.price !== undefined) text(it.price < 0 ? `+${-it.price} g` : `${it.price} g`, x + mw - 10, ry, { color: it.price < 0 ? '#7bc96f' : it.enabled ? '#f0c04a' : '#7d8b98', align: 'right' });
    });
  }

  /* ----------------------------------------------------------- night --- */
  function nightLayer(state, players) {
    const light = lightAt(state.time.minute);
    if (light >= 1) return;
    dkx.globalCompositeOperation = 'source-over';
    dkx.clearRect(0, 0, W, H);
    dkx.fillStyle = `rgba(15,22,48,${(1 - light) * 0.68})`;
    dkx.fillRect(0, 0, W, H);
    dkx.globalCompositeOperation = 'destination-out';
    const punch = (x, y, r) => { for (let i = 3; i >= 1; i--) { dkx.fillStyle = `rgba(0,0,0,${0.22 + (3 - i) * 0.1})`; disc(dkx, x, y, R(r * i / 3), dkx.fillStyle); } };
    const flick = reduceMotion ? 0 : Math.sin(clock * 9) * 1.5;
    punch(DOCK.pierX + 7, DOCK.pierTop, 22 + flick);
    punch(DOCK.pierX + 24, DOCK.pierBottom + 4, 12);
    for (const p of players) if (p.loc === 'lake') {
      punch(p.boat.x, p.boat.y, 34 + flick);
      if (p.fishing?.bx) punch(p.fishing.bx, p.fishing.by, 8);
    }
    ctx.drawImage(dark, 0, 0);
  }
  function glow(c, x, y, r, a, color) {
    for (let i = 3; i >= 1; i--) { c.globalAlpha = a / 3; disc(c, x, y, R(r * i / 3), color); }
    c.globalAlpha = 1;
  }

  /* -------------------------------------------------------------- fx --- */
  function drawFx(world) {
    for (const f of fx) if (f.world === world) { ctx.globalAlpha = Math.min(1, f.life * 2); px(f.x, f.y, f.s, f.s, f.color); }
    ctx.globalAlpha = 1;
    for (const q of popups) if (q.world === world) {
      const rise = (q.max - q.life) * 12;
      text(q.text, q.x, q.y - rise, { color: q.color, align: 'center', size: q.big ? 8 : 8, font: q.big ? 'Press Start 2P' : 'Silkscreen' });
      if (q.sub) text(q.sub, q.x, q.y - rise + 10, { color: '#f5efe0', align: 'center' });
    }
  }
  function tickFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.g || 0) * dt; f.life -= dt; if (f.life <= 0) fx.splice(i, 1); }
    for (let i = popups.length - 1; i >= 0; i--) { popups[i].life -= dt; if (popups[i].life <= 0) popups.splice(i, 1); }
    shake = Math.max(0, shake - dt * 14);
  }
  function burst(world, x, y, n, colors, spd = 40, g = 60) {
    if (reduceMotion) n = Math.min(n, 6);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = spd * (0.4 + Math.random() * 0.8);
      fx.push({ world, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.4, life: 0.5 + Math.random() * 0.6, color: colors[i % colors.length], s: 1 + (i % 2), g });
    }
  }
  function popup(world, x, y, txt, color = '#f5efe0', life = 1.4, big = false, sub = null) {
    popups.push({ world, x, y, text: txt, color, life, max: life, big, sub });
  }

  function onEvent(ev, state) {
    const p = state.players[ev.seat], b = p?.boat, wk = p?.walk;
    switch (ev.n) {
      case 'splash': burst('lake', ev.x, ev.y, 8, ['#ffffff', '#cfe3ea'], 30, 90); break;
      case 'bite': burst('lake', ev.x, ev.y, 6, ['#ffffff'], 25, 80); break;
      case 'hooked': if (b) popup('lake', b.x, b.y - 30, 'Hooked!', '#f0c04a'); break;
      case 'pullhit': if (b) popup('lake', b.x, b.y - 30, 'Nice pull', '#7bc96f'); break;
      case 'pullmiss': if (b) popup('lake', b.x, b.y - 30, 'Missed', '#d95b4f'); if (!reduceMotion) shake = 2; break;
      case 'snap': if (b) popup('lake', b.x, b.y - 30, 'Line snapped', '#d95b4f', 1.6); burst('lake', ev.x, ev.y, 10, ['#ffffff'], 40, 80); if (!reduceMotion) shake = 4; break;
      case 'lost': if (b) popup('lake', b.x, b.y - 30, 'It got away', '#a8b8c6', 1.4); break;
      case 'caught': {
        const f = ev.fish;
        burst('lake', ev.x, ev.y, 18, ['#ffe680', '#ffffff', f.color], 60, 90);
        if (b) popup('lake', b.x, b.y - 34, f.name, f.tier >= 3 ? '#f0c04a' : '#ffffff', 2.2, f.tier >= 3, `${f.weight} kg  ${f.price} g`);
        if (!reduceMotion) shake = f.tier >= 3 ? 4 : 2;
        break;
      }
      case 'holdfull': if (b) popup('lake', b.x, b.y - 30, 'Hold full', '#d95b4f', 1.2); break;
      case 'sold': if (wk) { popup('town', wk.x, TOWN.ground - 40, `+${ev.value} g`, '#7bc96f', 1.8, true); burst('town', wk.x, TOWN.ground - 30, 14, ['#f0c04a', '#ffe680'], 50, 120); } break;
      case 'buy': if (wk) popup('town', wk.x, TOWN.ground - 40, ev.label, '#f0c04a', 1.6); break;
      case 'nope': if (wk) popup('town', wk.x, TOWN.ground - 40, 'Not enough gold', '#d95b4f', 1.2); break;
    }
  }

  /* ------------------------------------------------------------- hud --- */
  function drawHud(state, panes, solo) {
    const gear = gearStats(state.empire), t = state.time, season = seasonOf(t.day);
    // Top bar
    px(0, 0, W, 14, 'rgba(13,20,32,0.72)');
    px(6, 4, 5, 5, '#f0c04a'); px(7, 5, 3, 3, '#ffe680');
    text(`${state.empire.gold} g`, 15, 3, { color: '#f0c04a' });
    text(`${gear.baitName}${state.empire.baitCount > 0 ? ` x${state.empire.baitCount}` : ''}`, 70, 3, { color: '#a8b8c6' });
    if (solo) text('WASD move  Space act  E pull  Esc back', W / 2 - 10, 3, { color: '#a8b8c6', align: 'center' });
    text(`${SEASON_NAMES[season]}, day ${dayOfSeason(t.day)}`, W - 100, 3, { color: '#f5efe0', align: 'right' });
    text(clockText(t.minute), W - 6, 3, { align: 'right', color: '#f5efe0' });
    const light = lightAt(t.minute);
    if (light > 0.5) { px(W - 96, 4, 6, 6, '#ffe680'); } else { px(W - 96, 4, 6, 6, '#e6eefc'); px(W - 94, 4, 5, 5, 'rgba(13,20,32,0.9)'); }
    // Per-pane footer
    for (const pane of panes) {
      const p = pane.player;
      if (!p) continue;
      const fy = H - 14;
      px(pane.x, fy, pane.w, 14, 'rgba(13,20,32,0.72)');
      text(p.name, pane.x + 6, fy + 3, { color: p.color });
      const holdCol = p.hold.length >= gear.cap ? '#d95b4f' : '#a8b8c6';
      text(`hold ${p.hold.length}/${gear.cap}`, pane.x + pane.w / 2, fy + 3, { color: holdCol, align: 'center' });
      const prompt = p.loc === 'lake' && !p.fishing ? `${solo ? 'Space' : 'A'}: ${p.prompt}` : p.fishing?.stage === 'bite' ? 'HOOK!' : p.fishing?.stage === 'reel' ? (p.fishing.tug?.phase === 'open' ? 'PULL!' : 'hold to lift') : p.fishing?.stage === 'charging' ? 'release' : p.menu ? '' : p.loc === 'town' && p.near ? `${solo ? 'Space' : 'A'}: ${p.prompt}` : '';
      text(prompt, pane.x + pane.w - 6, fy + 3, { color: prompt.endsWith('!') ? '#f0c04a' : '#f5efe0', align: 'right' });
    }
  }

  /* ---------------------------------------------------------- render --- */
  function render(state, { hidePlayers = false, solo = false } = {}) {
    const now = performance.now(), dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now; clock += dt;
    const players = Object.values(state.players).sort((a, b) => a.seat - b.seat);
    const season = seasonOf(state.time.day), night = lightAt(state.time.minute) < 0.5;
    tickAmbient(season, night, dt); tickFx(dt);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0f1620'; ctx.fillRect(0, 0, W, H);
    if (shake > 0) ctx.translate(R((Math.random() - 0.5) * shake * 2), R((Math.random() - 0.5) * shake * 2));

    const active = hidePlayers ? [] : players;
    const allLake = active.every(p => p.loc === 'lake');
    const panes = [];
    if (allLake || active.length === 0) panes.push({ x: 0, y: 0, w: W, h: H, world: 'lake', player: active[0] || null, cam: { x: 0, y: 0 }, shared: true });
    else active.forEach((p, i) => {
      const pw = Math.floor(W / active.length), x = i * pw;
      const cam = p.loc === 'lake'
        ? { x: Math.max(0, Math.min(W - pw, R(p.boat.x - pw / 2))), y: 0 }
        : { x: Math.max(0, Math.min(TOWN.w - pw, R(p.walk.x - pw / 2))), y: 0 };
      panes.push({ x, y: 0, w: pw, h: H, world: p.loc, player: p, cam });
    });

    for (const pane of panes) {
      ctx.save();
      ctx.beginPath(); ctx.rect(pane.x, pane.y, pane.w, pane.h); ctx.clip();
      ctx.translate(pane.x - pane.cam.x, pane.y - pane.cam.y);
      if (pane.world === 'lake') {
        drawLake(state, pane.cam, pane.w, pane.h, pane.shared ? active : [pane.player], hidePlayers);
        nightLayer(state, pane.shared ? active : [pane.player]);
      } else drawTown(state, pane.player, pane.cam, pane.w, pane.h);
      ctx.restore();
      if (panes.length > 1 && pane.x > 0) px(pane.x - 1, 0, 2, H, '#0d1420');
    }
    // Footer pane info is per player; on the shared lake, one footer per player side by side.
    const hudPanes = panes.length === 1 && active.length > 1
      ? active.map((p, i) => ({ x: i * (W / active.length), w: W / active.length, player: p }))
      : panes;
    if (!hidePlayers) drawHud(state, hudPanes, solo);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { render, onEvent, resize, get reduceMotion() { return reduceMotion; } };
}

/* ------------------------------------------------------ color utils --- */
function hex(c) {
  if (c.startsWith('rgb')) return c.match(/\d+/g).slice(0, 3).map(Number);
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}
function mix(a, b, t) { const A = hex(a), B = hex(b); t = Math.max(0, Math.min(1, t)); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; }
function shade(c, light) { const k = 0.45 + 0.55 * light; const A = hex(c); return `rgb(${A.map(v => Math.round(v * k)).join(',')})`; }

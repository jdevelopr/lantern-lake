// The TV view. Draws to a 640x360 backing canvas, scaled up by an integer.
// Everything is snapped to whole pixels; nothing is anti-aliased on purpose.
//
// Frame: scene (baked terrain + animated layers + actors) -> light map multiplied
// on top (time-of-day base + smooth warm light pools) -> weather in the air -> HUD.
// Split screen runs the same pass per pane.
import { WORLD, TOWN, DOCK, ROOMS, lakeNorm, lightAt, seasonOf, dayOfSeason } from '../game/world.js';
import { gearStats } from '../shared/catalog.js';
import { SEASON_NAMES, clockText } from '../shared/protocol.js';
import { weatherMods, weatherLabel } from '../game/weather.js';
import { mkCanvas, R, hash, mix, scale, clamp, text, textWidth, drawLight, sprite } from './gfx.js';
import { buildLakeBackground, drawWater, drawBoat, drawFishing, lakeLights, drawReflections } from './lake.js';
import { drawTown, townLights, drawMenu } from './town.js';
import { drawRoom, roomLights, roomPopup } from './room.js';
import { createWeatherFx } from './weatherfx.js';

const W = WORLD.w, H = WORLD.h;
// The camera sits a quarter closer than the canvas: a pane of pw x ph pixels shows
// pw/ZOOM x ph/ZOOM of the world, following the player's boat or walker.
export const ZOOM = 1.25;
// Indoors the camera comes in a little further: a room is a small place.
export const ROOM_ZOOM = 1.6;

const ICON = {
  coin: sprite(['.###.', '#.#.#', '##.##', '#.#.#', '.###.'], { '#': '#e8b04a', '.': null }),
  coinHi: sprite(['.....', '..#..', '.....', '.....', '.....'], { '#': '#fff2c0' }),
  sun: sprite(['#.#.#', '.###.', '#####', '.###.', '#.#.#'], { '#': '#f2c14e' }),
  moon: sprite(['.###.', '##...', '##...', '##...', '.###.'], { '#': '#cfd8ea' }),
  cloud: sprite(['..##..', '.####.', '######', '.####.'], { '#': '#aab4c2' }),
  rain: sprite(['..##..', '.####.', '######', '#.#.#.', '.#.#.#'], { '#': '#9fb4d0' }),
  storm: sprite(['..##..', '.####.', '######', '..##..', '.##...'], { '#': '#e8d47a' }),
  fog: sprite(['.####.', '......', '######', '......', '..####'], { '#': '#b8c0ca' }),
  snow: sprite(['#.#.#', '.###.', '##.##', '.###.', '#.#.#'], { '#': '#e6eef4' }),
};

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const [light, lx] = mkCanvas(W, H);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wfx = createWeatherFx(reduceMotion);
  let bg = null, bgSeason = -1;
  let clock = 0, shake = 0, lastNow = performance.now();
  let lakeSplit = false;      // two boats too far apart to share one view (with hysteresis)
  const ambient = [];         // seasonal drift particles
  const fx = [];              // event particles {world, x, y, vx, vy, life, color, g}
  const popups = [];          // floating text

  function resize() {
    const s = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)));
    const fit = Math.min(innerWidth / W, innerHeight / H);
    const sc = fit < 1 ? fit : s;
    canvas.style.width = `${W * sc}px`; canvas.style.height = `${H * sc}px`;
  }
  addEventListener('resize', resize); resize();

  const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(R(x), R(y), R(w), R(h)); };

  /* ---------------------------------------------------------- mood --- */
  // Base light level: clear by day, a readable blue by night. Kept light on purpose so
  // the scene stays legible; the lamps add warmth rather than rescuing a dark frame.
  function ambientColor(light, wx) {
    const eff = light * (1 - wx.sky);
    const dusk = 1 - Math.abs(light * 2 - 1);
    let a = mix('#6f7c9c', '#fbfaf7', eff);
    a = mix(a, '#e8b48a', dusk * 0.3 * (1 - wx.sky));
    if (wx.sky > 0) a = mix(a, '#9aa4b4', wx.sky * 0.3 * (0.4 + 0.6 * light));
    if (wx.kind === 'fog') a = mix(a, '#aab1ba', wx.k * 0.25);
    return { color: a, eff };
  }

  /** Multiply the light map over a pane, then paint halos into the air. */
  function lightPass(pane, state, lights, lightLvl, wx, indoor = false) {
    const cam = pane.cam;
    let { color, eff } = ambientColor(lightLvl, wx);
    // Indoors the daylight only comes through the windows, so the base is a touch
    // softer and the pools (window light, lamps, stoves) add the warmth.
    if (indoor) color = mix(color, '#7a8296', 0.08 + 0.2 * eff);
    const dark = 1 - eff;
    lx.globalCompositeOperation = 'source-over';
    lx.fillStyle = color; lx.fillRect(0, 0, W, H);
    lx.globalCompositeOperation = 'lighter';
    // Moonlight: a broad cool wash on clear nights
    if (!indoor && eff < 0.6 && wx.sky < 0.5) drawLight(lx, pane.vw * 0.72, 30, 170, '#33456e', (0.6 - eff) * (1 - wx.sky * 2) * 0.9, 6, 0.7);
    for (const L of lights) drawLight(lx, L.x - cam.x, L.y - cam.y, L.r, L.color, L.a * (L.fixed ? 1 : 0.22 + 0.78 * dark), 5, L.win ? 0.7 : 0.95);
    const flash = state.weather?.flash || 0;
    if (flash > 0) { lx.fillStyle = `rgba(210,220,255,${Math.min(1, flash) * (indoor ? 0.5 : 0.85)})`; lx.fillRect(0, 0, W, H); }
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(light, cam.x, cam.y);
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ------------------------------------------------------- ambient --- */
  function tickAmbient(season, night, wx, dt) {
    const calm = wx.kind === 'clear' || wx.kind === 'overcast';
    const want = reduceMotion ? 10 : season === 2 ? 34 : season === 0 ? 24 : (season === 1 && night && calm) ? 30 : 8;
    while (ambient.length < want) ambient.push({ x: Math.random() * W, y: Math.random() * H, t: Math.random() * 10, kind: season === 1 && night ? 'fly' : season });
    while (ambient.length > want) ambient.pop();
    const wind = (wx.wind || 0) * 12 * wx.k;
    for (const a of ambient) {
      a.t += dt;
      if (a.kind === 'fly') { a.x += Math.sin(a.t * 1.3) * 12 * dt; a.y += Math.cos(a.t * 0.9) * 8 * dt; }
      else if (a.kind === 2) { a.y += 18 * dt; a.x += (10 + Math.sin(a.t * 3) * 14 + wind) * dt; }
      else if (a.kind === 0) { a.y += 9 * dt; a.x += (6 + Math.sin(a.t * 2) * 8 + wind) * dt; }
      else { a.y += 4 * dt; a.x += wind * dt; }
      if (a.y > H + 4) { a.y = -4; a.x = Math.random() * W; }
      if (a.x > W + 4) a.x = -4; if (a.x < -4) a.x = W + 4;
    }
  }
  function drawAmbient() {
    for (const a of ambient) {
      if (a.kind === 'fly') { if (Math.sin(a.t * 4) > 0.2 && lakeNorm(a.x, a.y) > 1.05) px(a.x, a.y, 1, 1, '#ffe27a'); }
      else if (a.kind === 2) { const f = (a.t * 6 | 0) % 2; px(a.x, a.y, f ? 2 : 1, f ? 1 : 2, hash(a.x | 0, 3) > 0.5 ? '#d07a36' : '#b8552a'); }
      else if (a.kind === 0) px(a.x, a.y, 1, 1, '#e8b7c8');
      else if (a.kind === 1 && lakeNorm(a.x, a.y) > 1.05) px(a.x, a.y, 1, 1, 'rgba(255,255,255,0.7)');
    }
  }
  function ambientLights() {
    const L = [];
    for (const a of ambient) if (a.kind === 'fly' && Math.sin(a.t * 4) > 0.2 && lakeNorm(a.x, a.y) > 1.05) L.push({ x: a.x, y: a.y, r: 7, color: '#c8b040', a: 0.5 });
    return L;
  }

  /* ---------------------------------------------------------- lake --- */
  function drawLake(state, pane, players, hidePlayers, lightLvl, wx) {
    const season = seasonOf(state.time.day);
    if (bgSeason !== season) { bg = buildLakeBackground(season); bgSeason = season; }
    ctx.drawImage(bg, 0, 0);
    wfx.cloudShadows(ctx, pane.cam, pane.w, pane.h, state, clock);
    drawWater(ctx, state, clock, lightLvl, wx, reduceMotion);
    // Pier lantern glass
    px(DOCK.pierX + 6, DOCK.pierTop - 3, 3, 4, '#f0b040'); px(DOCK.pierX + 7, DOCK.pierTop - 2, 1, 2, '#fff2c0');
    // Boathouse window and cabin windows glow at night
    if (lightLvl < 0.6) {
      px(DOCK.pierX + 12 + 4, DOCK.pierBottom - 6 + 6, 3, 3, '#ffd27a');
    }
    const lights = hidePlayers ? lakeLights(state, [], clock, reduceMotion) : lakeLights(state, players, clock, reduceMotion);
    drawReflections(ctx, lights, clock, 1 - lightLvl * (1 - wx.sky), reduceMotion);
    drawAmbient();
    if (!hidePlayers) {
      const sorted = [...players].filter(p => p.loc === 'lake').sort((a, b) => a.boat.y - b.boat.y);
      for (const p of sorted) drawBoat(ctx, state, p, clock, reduceMotion);
      for (const p of sorted) if (p.fishing) drawFishing(ctx, state, p, pane.cam, pane.vw, pane.vh, clock, reduceMotion);
    }
    drawFx('lake');
    lightPass(pane, state, lights.concat(ambientLights()), lightLvl, wx);
    const wr = { x: pane.cam.x, y: pane.cam.y, w: pane.vw, h: pane.vh };
    wfx.draw(ctx, wr, state, (x, y) => lakeNorm(x + pane.cam.x, y + pane.cam.y) < 1);
    wfx.haze(ctx, wr, state, lightLvl);
  }

  /* ------------------------------------------------------------ fx --- */
  function drawFx(world) {
    for (const f of fx) if (f.world === world) { ctx.globalAlpha = Math.min(1, f.life * 2); px(f.x, f.y, f.s, f.s, f.color); }
    ctx.globalAlpha = 1;
  }
  /** Floating text, drawn in screen space (after the pane transform) so the font stays crisp. */
  function drawPopups(world, pane) {
    const sx = x => pane.x + (x - pane.cam.x) * pane.zoom, sy = y => pane.y + (y - pane.cam.y) * pane.zoom;
    for (const q of popups) if (q.world === world) {
      const rise = (q.max - q.life) * 12;
      const x = clamp(sx(q.x), pane.x + 6 + textWidth(q.text) / 2, pane.x + pane.w - 6 - textWidth(q.text) / 2), y = sy(q.y - rise);
      ctx.globalAlpha = Math.min(1, q.life * 3);
      text(ctx, q.text, x, y, { color: q.color, align: 'center', scale: q.big ? 2 : 1 });
      if (q.sub) text(ctx, q.sub, x, y + (q.big ? 16 : 10), { color: '#e8e2d2', align: 'center' });
    }
    ctx.globalAlpha = 1;
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
  function popup(world, x, y, txt, color = '#e8e2d2', life = 1.4, big = false, sub = null) {
    popups.push({ world, x, y, text: txt, color, life, max: life, big, sub });
  }

  function onEvent(ev, state) {
    const p = state.players[ev.seat], b = p?.boat, wk = p?.walk;
    // Town popups follow the walker whether it is on the street or inside a room
    const tw = p?.loc === 'room' ? `room:${p.room}` : 'town';
    switch (ev.n) {
      case 'enter': case 'talk': {
        const q = roomPopup(state, ev, clock);
        if (q) popup(`room:${ev.room}`, q.x, q.y, q.text, q.color || '#e8e2d2', q.life || 2.6, false, q.sub || null);
        break;
      }
      case 'splash': burst('lake', ev.x, ev.y, 10, ['#e9f1f4', '#b9cdd6'], 30, 90); break;
      case 'bite': burst('lake', ev.x, ev.y, 6, ['#ffffff'], 25, 80); break;
      case 'hooked': if (b) popup('lake', b.x, b.y - 30, 'Hooked!', '#f2c14e'); break;
      case 'pullhit': if (b) popup('lake', b.x, b.y - 30, 'Nice pull', '#8fd47f'); break;
      case 'pullmiss': if (b) popup('lake', b.x, b.y - 30, 'Missed', '#e0685a'); if (!reduceMotion) shake = 2; break;
      case 'snap': if (b) popup('lake', b.x, b.y - 30, 'Line snapped', '#e0685a', 1.6); burst('lake', ev.x, ev.y, 10, ['#ffffff'], 40, 80); if (!reduceMotion) shake = 4; break;
      case 'lost': if (b) popup('lake', b.x, b.y - 30, 'It got away', '#98a4b2', 1.4); break;
      case 'caught': {
        const f = ev.fish;
        burst('lake', ev.x, ev.y, 22, ['#ffe27a', '#ffffff', f.color], 60, 90);
        if (b) popup('lake', b.x, b.y - 38, f.name, f.tier >= 3 ? '#f2c14e' : '#ffffff', 2.2, f.tier >= 3, `${f.weight} kg  ${f.price} g`);
        if (!reduceMotion) shake = f.tier >= 3 ? 4 : 2;
        break;
      }
      case 'holdfull': if (b) popup('lake', b.x, b.y - 30, 'Hold full', '#e0685a', 1.2); break;
      case 'sold': if (wk) { popup(tw, wk.x, TOWN.ground - 44, `+${ev.value} g`, '#8fd47f', 1.8, true); burst(tw, wk.x, TOWN.ground - 30, 16, ['#f2c14e', '#ffe27a'], 50, 120); } break;
      case 'buy': if (wk) popup(tw, wk.x, TOWN.ground - 44, ev.label, '#f2c14e', 1.6); break;
      case 'nope': if (wk) popup(tw, wk.x, TOWN.ground - 44, 'Not enough gold', '#e0685a', 1.2); break;
      case 'thunder': if (!reduceMotion) shake = 3; break;
    }
  }

  /* ------------------------------------------------------------- hud --- */
  function drawHud(state, panes, solo, wx) {
    const gear = gearStats(state.empire), t = state.time, season = seasonOf(t.day);
    const light = lightAt(t.minute);
    // Top bar
    px(0, 0, W, 15, 'rgba(6,8,14,0.8)'); px(0, 15, W, 1, 'rgba(255,255,255,0.07)');
    ctx.drawImage(ICON.coin, 6, 5); ctx.drawImage(ICON.coinHi, 6, 5);
    text(ctx, `${state.empire.gold} g`, 15, 4, { color: '#f2c14e' });
    text(ctx, `${gear.baitName}${state.empire.baitCount > 0 ? ` x${state.empire.baitCount}` : ''}`, 66, 4, { color: '#98a4b2' });
    if (solo) text(ctx, 'WASD move  Space act  E pull  Esc back', W / 2, 4, { color: '#7f8b98', align: 'center' });
    // weather, season, clock
    const wkind = state.weather?.kind || 'clear';
    const wlabel = wx.k > 0.5 || wkind === 'clear' ? weatherLabel(wkind) : 'Clearing';
    const icon = wkind === 'clear' ? (light > 0.5 ? ICON.sun : ICON.moon) : ICON[wkind === 'overcast' ? 'cloud' : wkind];
    const seasonTxt = `${SEASON_NAMES[season]}, day ${dayOfSeason(t.day)}`;
    const clockTxt = clockText(t.minute);
    let x = W - 6;
    x -= text(ctx, clockTxt, x, 4, { align: 'right', color: '#e8e2d2' }) + 10;
    x -= text(ctx, seasonTxt, x, 4, { color: '#c9c3b4', align: 'right' }) + 10;
    x -= text(ctx, wlabel, x, 4, { color: '#98a4b2', align: 'right' }) + 3;
    ctx.drawImage(icon, x - icon.width, 5);
    // Per-pane footer
    for (const pane of panes) {
      const p = pane.player;
      if (!p) continue;
      const fy = H - 15;
      px(pane.x, fy, pane.w, 15, 'rgba(6,8,14,0.8)'); px(pane.x, fy, pane.w, 1, 'rgba(255,255,255,0.07)');
      text(ctx, p.name, pane.x + 6, fy + 4, { color: p.color });
      const holdCol = p.hold.length >= gear.cap ? '#e0685a' : '#98a4b2';
      text(ctx, `hold ${p.hold.length}/${gear.cap}`, pane.x + pane.w / 2, fy + 4, { color: holdCol, align: 'center' });
      const prompt = p.loc === 'lake' && !p.fishing ? `${solo ? 'Space' : 'A'}: ${p.prompt}` : p.fishing?.stage === 'bite' ? 'HOOK!' : p.fishing?.stage === 'reel' ? (p.fishing.tug?.phase === 'open' ? 'PULL!' : 'hold to lift') : p.fishing?.stage === 'charging' ? 'release' : p.menu || p.door ? '' : p.loc !== 'lake' && p.near ? `${solo ? 'Space' : 'A'}: ${p.prompt}` : '';
      text(ctx, prompt, pane.x + pane.w - 6, fy + 4, { color: prompt.endsWith('!') ? '#f2c14e' : '#e8e2d2', align: 'right' });
    }
  }

  /* ---------------------------------------------------------- render --- */
  function render(state, { hidePlayers = false, solo = false } = {}) {
    const now = performance.now(), dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now; clock += dt;
    // Title and lobby: the lake at nightfall in the season's weather, nobody aboard yet.
    if (hidePlayers) state = { ...state, time: { ...state.time, minute: 1230 }, weather: { kind: seasonOf(state.time.day) === 3 ? 'snow' : 'rain', intensity: 0.7, wind: 0.25, flash: 0 } };
    const players = Object.values(state.players).sort((a, b) => a.seat - b.seat);
    const season = seasonOf(state.time.day);
    const lightLvl = lightAt(state.time.minute), night = lightLvl < 0.5;
    const wx = weatherMods(state); wx.wind = state.weather?.wind || 0;
    tickAmbient(season, night, wx, dt); tickFx(dt); wfx.tick(state, dt);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#07080c'; ctx.fillRect(0, 0, W, H);
    if (shake > 0) ctx.translate(R((Math.random() - 0.5) * shake * 2), R((Math.random() - 0.5) * shake * 2));

    const active = hidePlayers ? [] : players;
    const allLake = active.every(p => p.loc === 'lake');
    // Two boats share one view while they fit in it; split when they drift apart and
    // rejoin once they are well inside again, so the screen does not flicker.
    if (allLake && active.length > 1) {
      const xs = active.map(p => p.boat.x), ys = active.map(p => p.boat.y);
      const spanX = Math.max(...xs) - Math.min(...xs), spanY = Math.max(...ys) - Math.min(...ys);
      const vw = W / ZOOM, vh = H / ZOOM;
      if (!lakeSplit && (spanX > vw - 70 || spanY > vh - 70)) lakeSplit = true;
      if (lakeSplit && spanX < vw - 150 && spanY < vh - 120) lakeSplit = false;
    } else lakeSplit = false;
    const panes = [];
    const lakeCam = (cx, cy, vw, vh) => ({ x: clamp(R(cx - vw / 2), 0, W - vw), y: clamp(R(cy - vh / 2), 0, H - vh) });
    if (active.length === 0) {
      const vw = W / ZOOM, vh = H / ZOOM;
      panes.push({ x: 0, y: 0, w: W, h: H, vw, vh, zoom: ZOOM, world: 'lake', player: null, cam: lakeCam(W / 2, H / 2 + 6, vw, vh), shared: true });
    } else if (allLake && !lakeSplit) {
      const vw = W / ZOOM, vh = H / ZOOM;
      const cx = active.reduce((s, p) => s + p.boat.x, 0) / active.length, cy = active.reduce((s, p) => s + p.boat.y, 0) / active.length;
      panes.push({ x: 0, y: 0, w: W, h: H, vw, vh, zoom: ZOOM, world: 'lake', player: active[0], cam: lakeCam(cx, cy, vw, vh), shared: true });
    } else active.forEach((p, i) => {
      const pw = Math.floor(W / active.length), x = i * pw, zoom = p.loc === 'room' ? ROOM_ZOOM : ZOOM, vw = pw / zoom, vh = H / zoom;
      let cam;
      if (p.loc === 'lake') cam = lakeCam(p.boat.x, p.boat.y, vw, vh);
      else if (p.loc === 'room') { const rm = ROOMS[p.room]; cam = { x: clamp(R(p.walk.x - vw / 2), 0, Math.max(0, rm.w - vw)), y: H - vh }; }
      else cam = { x: clamp(R(p.walk.x - vw / 2), 0, TOWN.w - vw), y: H - vh };
      panes.push({ x, y: 0, w: pw, h: H, vw, vh, zoom, world: p.loc, player: p, cam });
    });

    for (const pane of panes) {
      ctx.save();
      ctx.beginPath(); ctx.rect(pane.x, pane.y, pane.w, pane.h); ctx.clip();
      ctx.translate(pane.x, pane.y); ctx.scale(pane.zoom, pane.zoom); ctx.translate(-pane.cam.x, -pane.cam.y);
      const G = { ctx, clock, reduceMotion, light: lightLvl, wx, season, wfx };
      const wr = { x: pane.cam.x, y: pane.cam.y, w: pane.vw, h: pane.vh };
      let world = 'lake';
      if (pane.world === 'lake') {
        drawLake(state, pane, pane.shared ? active : [pane.player], hidePlayers, lightLvl, wx);
      } else if (pane.world === 'room') {
        const p = pane.player, others = active.filter(q => q !== p && q.loc === 'room' && q.room === p.room);
        world = `room:${p.room}`;
        drawRoom(G, state, p, pane.cam, pane.vw, pane.vh, others);
        drawFx(world);
        lightPass(pane, state, roomLights(G, state, p, pane.cam, pane.vw), lightLvl, wx, true);
      } else {
        world = 'town';
        drawTown(G, state, pane.player, pane.cam, pane.vw, pane.vh);
        drawFx('town');
        lightPass(pane, state, townLights(G, state, pane.player, pane.cam, pane.vw), lightLvl, wx);
        wfx.draw(ctx, wr, state, (x, y) => x + pane.cam.x < 120 && y + pane.cam.y > TOWN.ground - 14 && y + pane.cam.y < TOWN.ground);
        wfx.haze(ctx, wr, state, lightLvl);
      }
      // Doorway: dip to black and back while the player crosses the threshold
      const d = pane.player?.door;
      if (d) {
        const t = d.t / 0.9, a = t < 0.4 ? t / 0.4 : t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
        ctx.fillStyle = `rgba(4,5,8,${clamp(a, 0, 1)})`; ctx.fillRect(pane.cam.x - 2, pane.cam.y - 2, pane.vw + 4, pane.vh + 4);
      }
      ctx.restore();
      // Text and menus sit on top of the pane in screen pixels
      drawPopups(world, pane);
      if (pane.player?.menu && pane.world !== 'lake') drawMenu(G, state, pane.player, { x: pane.x, y: pane.y }, pane.w, pane.h);
      if (panes.length > 1 && pane.x > 0) px(pane.x - 1, 0, 2, H, '#07080c');
    }
    const hudPanes = panes.length === 1 && active.length > 1
      ? active.map((p, i) => ({ x: i * (W / active.length), w: W / active.length, player: p }))
      : panes;
    if (!hidePlayers) drawHud(state, hudPanes, solo, wx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { render, onEvent, resize, get reduceMotion() { return reduceMotion; } };
}

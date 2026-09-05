// Host program: the shared TV screen. Owns the only real state, runs the loop,
// broadcasts projections, and in single-player mode also takes local input.
import { createHost, joinUrl } from '../net.js';
import { SLUG, MAX_PLAYERS, MIN_PLAYERS, INTRO_MS, SOLO_CODE, PLAYER_COLORS, SEASON_NAMES } from '../shared/protocol.js';
import { renderRoster } from '../shared/roster.js';
import { initState, addPlayer, reduce, toSave, fromSave } from '../game/reduce.js';
import { project } from '../game/project.js';
import { seasonOf, dayOfSeason, lightAt, ROOMS, BUILDING_BY_ID } from '../game/world.js';
import { weatherLabel } from '../game/weather.js';
import { createRenderer } from './render.js';
import { saveGame, loadGame, deleteGame, listGames } from './save.js';
import { sfx, unlockAudio, setAmbience } from './audio.js';
import { ambienceFor } from './room.js';
import { createLocalInput } from './input.js';

const $ = s => document.querySelector(s);
const STEP = 1000 / 60;
const SEND_MS = 50;
const SAVE_MS = 5000;

let state = initState(Date.now() & 0x7fffffff);
let host = null;            // net host (multiplayer)
let local = null;           // keyboard input (solo)
let renderer = null;
let mode = null;            // 'multi' | 'solo'
let code = null;
let savedPlayers = [];
let inputEnabled = false;
const wasReady = new Set();

async function goToScreen(name) {
  const body = document.body;
  if (body.dataset.screen === name) return;
  body.dataset.leaving = body.dataset.screen;
  await new Promise(r => setTimeout(r, 180));
  delete body.dataset.leaving;
  body.dataset.screen = name;
}
function fail(msg) {
  goToScreen('home');
  $('#home-status').textContent = msg;
}
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast-line'; el.textContent = msg;
  $('#toast').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

export function start() {
  document.body.classList.add('is-host');
  renderer = createRenderer($('#stage'));
  document.fonts?.load('8px "Silkscreen"'); document.fonts?.load('8px "Press Start 2P"');
  renderSaves();
  goToScreen('home');
  requestAnimationFrame(loop);

  $('#new-btn').onclick = () => { unlockAudio(); startHost(null, null); };
  $('#solo-btn').onclick = () => { unlockAudio(); startSolo(null); };
  $('#join-form').onsubmit = e => {
    e.preventDefault();
    const c = $('#join-code').value.trim().toUpperCase();
    if (c.length === 4) location.search = `?room=${c}`;
    else $('#home-status').textContent = 'Room codes are four letters';
  };
  $('#copy-link').onclick = () => { navigator.clipboard?.writeText(host?.joinUrl || ''); $('#copy-link').textContent = 'Copied'; setTimeout(() => $('#copy-link').textContent = 'Copy link', 1200); };
  $('#start-btn').onclick = beginVoyage;
  addEventListener('pagehide', () => persist());
  addEventListener('beforeunload', e => { persist(); if (state.phase === 'playing' && mode === 'multi') { e.preventDefault(); e.returnValue = ''; } });
}

/* ----------------------------------------------------------- saves --- */
function renderSaves() {
  const ul = $('#saves'); ul.innerHTML = '';
  for (const s of listGames()) {
    const li = document.createElement('li'); li.className = 'save-row';
    const solo = s.code === SOLO_CODE;
    const info = document.createElement('div');
    const codeEl = document.createElement('div'); codeEl.className = 'save-code'; codeEl.textContent = solo ? 'Solo lake' : `Lake ${s.code}`;
    const meta = document.createElement('div'); meta.className = 'save-meta';
    const names = (s.players || []).map(p => p.name).join(', ');
    meta.textContent = `${SEASON_NAMES[seasonOf(s.time.day)]} day ${dayOfSeason(s.time.day)}, ${s.empire.gold} g${names ? `, ${names}` : ''}`;
    info.append(codeEl, meta);
    const cont = document.createElement('button'); cont.textContent = 'Continue';
    cont.onclick = () => { unlockAudio(); solo ? startSolo(s) : startHost(s.code, s); };
    const del = document.createElement('button'); del.className = 'ghost del'; del.setAttribute('aria-label', 'Delete save');
    del.innerHTML = '<svg width="14" height="14" viewBox="0 0 7 7" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M1 1h1v1h1v1h1V2h1V1h1v1H5v1H4v1h1v1h1v1H5V5H4V4H3v1H2v1H1V5h1V4h1V3H2V2H1z"/></svg>';
    del.onclick = () => { deleteGame(s.code); renderSaves(); };
    li.append(info, cont, del);
    ul.appendChild(li);
  }
}
function persist() {
  if (!code || state.phase === 'lobby') return;
  saveGame(toSave(state, code));
}

/* ----------------------------------------------------- multiplayer --- */
function startHost(savedCode, save) {
  mode = 'multi';
  state = save ? fromSave(save) : initState(Date.now() & 0x7fffffff);
  savedPlayers = state.savedPlayers || [];
  host = createHost({ slug: SLUG, maxPlayers: MAX_PLAYERS, minPlayers: MIN_PLAYERS });
  if (savedPlayers.length) host.restoreSeats(savedPlayers);

  host.on('open', async c => {
    code = c;
    const url = joinUrl(c);
    $('#room-code').textContent = c;
    $('#lobby-title').textContent = save ? `Lake ${c}, ${SEASON_NAMES[seasonOf(state.time.day)]} day ${dayOfSeason(state.time.day)}` : 'Crew';
    goToScreen('lobby');
    try {
      await QRCode.toCanvas($('#qr'), url, { width: 220, margin: 1, color: { dark: '#1b2636', light: '#ffffff' } });
    } catch (e) {
      console.error('QR render failed', e);
      $('#lobby-hint').textContent = url;
    }
  });

  host.on('roster', players => {
    renderRoster($('#roster'), players);
    const can = host.canStart();
    $('#start-btn').disabled = !can;
    const live = host.connectedCount();
    $('#lobby-status').textContent = !live ? '' : can ? '' : `${live} aboard, everyone must be ready`;
    for (const p of players) {
      if (p.ready && !wasReady.has(p.seat)) sfx('ready');
      p.ready ? wasReady.add(p.seat) : wasReady.delete(p.seat);
    }
  });

  host.on('hello', (seat, { cid, name }) => {
    const existing = state.players[seat];
    if (existing && existing.cid === cid) {
      existing.connected = true; existing.name = name || existing.name;
      if (state.phase !== 'lobby') toast(`${existing.name} is back`);
    } else {
      const saved = savedPlayers.find(p => p.cid === cid) || null;
      addPlayer(state, seat, cid, name, saved);
      if (state.phase === 'lobby') sfx('join');
      else { toast(`${name} joined`); }
    }
    if (state.phase === 'playing') host.sendTo(seat, { t: 'start', state: project(state, seat) });
  });
  host.on('leave', seat => {
    reduce(state, { type: 'connected', seat, connected: false });
    if (state.phase !== 'lobby') toast(`${state.players[seat]?.name || 'A player'} lost connection`);
  });
  host.on('input', (seat, payload) => { if (inputEnabled) reduce(state, { type: 'input', seat, payload }); });
  host.on('error', err => fail(err.message || 'Could not open a room.'));

  host.open(savedCode);
}

function beginVoyage() {
  if (mode === 'multi' && !host.canStart()) return;
  unlockAudio();
  const startsAt = Date.now() + INTRO_MS;
  const players = Object.values(state.players).map(p => ({ seat: p.seat, name: p.name }));
  const intro = { startsAt, day: state.time.day, season: seasonOf(state.time.day), players };
  if (mode === 'multi') { host.setPhase('intro'); host.event('intro', intro); }
  state.phase = 'intro';
  goToScreen('game');
  playIntro(intro);
  setTimeout(() => {
    state.phase = 'playing';
    inputEnabled = true;
    if (mode === 'multi') { host.setPhase('playing'); for (const p of Object.values(state.players)) host.sendTo(p.seat, { t: 'start', state: project(state, p.seat) }); }
    else local.enable(true);
    persist(); renderSaves();
  }, INTRO_MS);
}

/* ------------------------------------------------------------ solo --- */
function startSolo(save) {
  mode = 'solo';
  code = SOLO_CODE;
  state = save ? fromSave(save) : initState(Date.now() & 0x7fffffff);
  savedPlayers = state.savedPlayers || [];
  const go = name => {
    localStorage.setItem('name', name);
    addPlayer(state, 0, 'solo', name, savedPlayers[0] || null);
    local = createLocalInput(payload => { if (inputEnabled) reduce(state, { type: 'input', seat: 0, payload }); });
    beginVoyage();
  };
  const known = localStorage.getItem('name');
  if (known) return go(known);
  goToScreen('name');
  $('#name-form').onsubmit = e => { e.preventDefault(); go($('#name-input').value.trim() || 'Captain'); };
  setTimeout(() => $('#name-input').focus(), 300);
}

/* ----------------------------------------------------------- intro --- */
function playIntro({ startsAt, day, season, players }) {
  inputEnabled = false;
  const intro = $('#intro');
  intro.hidden = false;
  $('#intro-title').textContent = 'Lantern Lake';
  $('#intro-stakes').textContent = `${SEASON_NAMES[season]}, day ${dayOfSeason(day)}`;
  const ul = $('#intro-players'); ul.innerHTML = '';
  players.forEach((p, i) => {
    const li = document.createElement('li'); li.textContent = p.name;
    li.style.color = PLAYER_COLORS[p.seat % PLAYER_COLORS.length]; li.style.setProperty('--i', i);
    ul.appendChild(li);
  });
  const count = $('#intro-count'); count.textContent = '';
  let last = null;
  const tick = () => {
    const left = startsAt - Date.now();
    if (left <= 0) {
      count.textContent = 'Cast off'; count.classList.add('tick'); sfx('go');
      setTimeout(() => { intro.hidden = true; count.classList.remove('tick'); }, renderer.reduceMotion ? 0 : 500);
      return;
    }
    if (left <= 3000) {
      const n = Math.ceil(left / 1000);
      if (n !== last) { last = n; count.textContent = String(n); count.classList.remove('tick'); void count.offsetWidth; count.classList.add('tick'); sfx('count'); }
    }
    requestAnimationFrame(tick);
  };
  tick();
}

/* ------------------------------------------------------------ loop --- */
let acc = 0, last = performance.now(), lastSend = 0, lastSave = 0, lastAmb = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dtMs = Math.min(250, now - last); last = now;
  if (state.phase === 'playing') {
    acc += dtMs;
    while (acc >= STEP) { reduce(state, { type: 'tick', dt: STEP }); acc -= STEP; }
    drainEvents();
    if (mode === 'multi' && now - lastSend > SEND_MS) {
      lastSend = now;
      for (const p of Object.values(state.players)) if (p.connected) host.sendTo(p.seat, { t: 'state', ...project(state, p.seat) });
    }
    if (now - lastSave > SAVE_MS) { lastSave = now; persist(); }
    if (now - lastAmb > 250) { lastAmb = now; setAmbience(ambienceFor(state, lightAt(state.time.minute))); }
  } else {
    acc = 0;
  }
  renderer.render(state, { hidePlayers: state.phase === 'lobby', solo: mode === 'solo' });
}

// Debug hook for screenshots and tuning: LL.state, LL.renderer,
// LL.jump({ day, minute, weather, loc, room }) with loc 'lake' | 'town' | 'room' and room a
// building id ('fishmonger', 'tackle', 'boatyard', 'house1'..'house4').
window.LL = {
  get state() { return state; }, get renderer() { return renderer; },
  jump({ day, minute, weather, loc, room } = {}) {
    if (day !== undefined) state.time.day = day;
    if (minute !== undefined) state.time.minute = minute;
    if (weather !== undefined && state.weather) { state.weather.kind = weather; state.weather.intensity = 1; state.weather.t = 600; }
    if (loc) for (const p of Object.values(state.players)) {
      p.loc = loc; p.door = null; p.menu = null;
      if (loc === 'room') { p.room = ROOMS[room] ? room : 'tackle'; p.walk.x = ROOMS[p.room].door + 14; p.walk.dir = 1; }
      else p.room = null;
    }
  },
};

function drainEvents() {
  const evs = state.events; if (!evs.length) return;
  state.events = [];
  for (const ev of evs) {
    renderer.onEvent(ev, state);
    if (ev.n === 'caught') sfx(ev.fish.tier >= 3 ? 'bigcatch' : 'caught');
    else if (ev.n === 'weather') {
      const line = { clear: 'The sky clears', overcast: 'Clouds roll in', rain: 'Rain is coming', storm: 'A storm is rolling in', fog: 'Fog settles on the lake', snow: 'Snow begins to fall' }[ev.kind];
      if (line) toast(line);
      sfx('weather');
    } else if (ev.n === 'newday') {
      sfx('newday');
      toast(ev.newSeason ? `${SEASON_NAMES[ev.season]} has come` : `Day ${dayOfSeason(ev.day)} of ${SEASON_NAMES[ev.season]}`);
    } else if (ev.n === 'enter') sfx(BUILDING_BY_ID[ev.room]?.house ? 'knock' : 'bell');
    else sfx(ev.n);
    if (mode === 'multi' && ev.seat !== undefined) {
      const { seat, n } = ev;
      if (['bite', 'hooked', 'tugwarn', 'tug', 'pullhit', 'pullmiss', 'snap', 'lost', 'caught', 'sold', 'buy', 'nope', 'zone', 'holdfull'].includes(n))
        host.sendTo(seat, { t: 'event', name: n, data: n === 'caught' ? { name: ev.fish.name, weight: ev.fish.weight, price: ev.fish.price, tier: ev.fish.tier } : n === 'sold' ? { value: ev.value } : null });
    }
  }
}

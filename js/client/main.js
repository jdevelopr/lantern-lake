// Joiner program: name, lobby, then the controller. Holds no game state.
import { createClient } from '../net.js';
import { SLUG, INTRO_MS, PLAYER_COLORS, SEASON_NAMES } from '../shared/protocol.js';
import { renderRoster } from '../shared/roster.js';
import { dayOfSeason } from '../game/world.js';
import { createInput } from './input.js';
import { createController } from './controller.js';

const $ = s => document.querySelector(s);
let client = null, controller = null, input = null;
let mySeat = null, ready = false, reconnectTimer = null;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

async function goToScreen(name) {
  const body = document.body;
  if (body.dataset.screen === name) return;
  body.dataset.leaving = body.dataset.screen;
  await new Promise(r => setTimeout(r, 180));
  delete body.dataset.leaving;
  body.dataset.screen = name;
}
function fail(msg) {
  const onGame = document.body.dataset.screen === 'game';
  if (onGame) { $('#ctl-prompt').textContent = msg; return; }
  goToScreen('home');
  $('#home-status').textContent = msg;
}

export function start(code) {
  sessionStorage.setItem('room', code);
  input = createInput({
    stick: $('#stick'), knob: $('#stick-knob'), btnA: $('#btn-a'), btnB: $('#btn-b'), btnBack: $('#btn-back'),
    onChange: part => client?.input(part),
  });
  controller = createController(input);
  $('#ready-btn').onclick = () => {
    ready = !ready; client?.ready(ready);
    $('#ready-btn').textContent = ready ? 'Not ready' : "I'm ready";
    input.buzz(10);
  };
  const name = localStorage.getItem('name');
  if (!name) return promptName(code);
  connect(code, name);
}

function promptName(code) {
  goToScreen('name');
  setTimeout(() => $('#name-input').focus(), 300);
  $('#name-form').onsubmit = e => {
    e.preventDefault();
    const n = $('#name-input').value.trim();
    if (!n) return;
    localStorage.setItem('name', n);
    connect(code, n);
  };
}

function connect(code, name) {
  clearTimeout(reconnectTimer);
  client?.destroy();
  input.reset();
  client = createClient({ slug: SLUG, code, name });

  client.on('welcome', msg => {
    mySeat = msg.seat;
    document.body.style.setProperty('--pc', PLAYER_COLORS[mySeat % PLAYER_COLORS.length]);
    if (msg.phase === 'playing' || msg.phase === 'intro') enterGame();
    else { goToScreen('lobby'); renderRoster($('#roster'), msg.players, mySeat); }
    keepAwake();
  });
  client.on('lobby', players => {
    renderRoster($('#roster'), players, mySeat);
    const me = players.find(p => p.seat === mySeat);
    if (me) { ready = me.ready; $('#ready-btn').textContent = ready ? 'Not ready' : "I'm ready"; }
  });
  client.on('rejected', reason => fail(reason));
  client.on('event', msg => {
    if (msg.name === 'intro') { goToScreen('game'); controller.show(true); playIntro(msg.data); }
    else controller.flash(msg.name, msg.data);
  });
  client.on('start', view => { enterGame(); if (view) controller.update(view); });
  client.on('state', view => controller.update(view));
  client.on('disconnected', () => {
    input.enable(false);
    $('#ctl-prompt').textContent = 'Reconnecting';
    $('#lobby-status').textContent = 'Reconnecting';
    reconnectTimer = setTimeout(() => connect(code, name), 1500);
  });
  client.on('error', err => {
    if (document.body.dataset.screen === 'game') { reconnectTimer = setTimeout(() => connect(code, name), 3000); }
    else fail(err.message || 'Could not connect');
  });
  client.connect();
}

function enterGame() {
  goToScreen('game');
  controller.show(true);
  $('#intro').hidden = true;
  input.enable(true);
}

function playIntro({ startsAt, day, season }) {
  input.enable(false);
  const intro = $('#intro');
  intro.hidden = false;
  $('#intro-title').textContent = localStorage.getItem('name') || '';
  $('#intro-stakes').textContent = `${SEASON_NAMES[season]}, day ${dayOfSeason(day)}`;
  const count = $('#intro-count'); count.textContent = '';
  let lastN = null;
  const tick = () => {
    const left = startsAt - Date.now();
    if (left <= 0) {
      count.textContent = 'Cast off'; input.buzz(40);
      setTimeout(() => { intro.hidden = true; input.enable(true); }, reduceMotion ? 0 : 500);
      return;
    }
    if (left <= 3000) {
      const n = Math.ceil(left / 1000);
      if (n !== lastN) { lastN = n; count.textContent = String(n); count.classList.remove('tick'); void count.offsetWidth; count.classList.add('tick'); input.buzz(10); }
    }
    requestAnimationFrame(tick);
  };
  tick();
}

let lock = null;
async function keepAwake() { try { lock = await navigator.wakeLock?.request('screen'); } catch {} }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });

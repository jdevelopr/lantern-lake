// Lobby roster rendering, used by both the host screen and the phones.
import { PLAYER_COLORS } from './protocol.js';

export function renderRoster(list, players, mySeat = null) {
  list.innerHTML = '';
  if (!players.length) {
    const li = document.createElement('li');
    li.className = 'empty-roster';
    li.textContent = 'Nobody aboard yet';
    list.appendChild(li);
    return;
  }
  players.forEach((p, i) => {
    const li = document.createElement('li');
    li.className = 'player-card' + (p.ready ? ' ready' : '') + (!p.connected ? ' gone' : '');
    li.style.setProperty('--i', i);
    li.dataset.seat = p.seat;
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = PLAYER_COLORS[p.seat % PLAYER_COLORS.length];
    const name = document.createElement('span');
    name.textContent = p.name + (p.seat === mySeat ? ' (you)' : '');
    const st = document.createElement('span');
    st.className = 'state';
    st.textContent = !p.connected ? (p.stale ? 'Last voyage' : 'Reconnecting') : p.ready ? 'Ready' : 'Not ready';
    li.append(sw, name, st);
    list.appendChild(li);
  });
}

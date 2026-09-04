// The phone UI. Renders whatever projection the host last sent; holds no rules.
import { SEASON_NAMES, clockText } from '../shared/protocol.js';

export function createController(input) {
  const $ = s => document.querySelector(s);
  const el = {
    root: $('#controller'), name: $('#ctl-name'), gold: $('#ctl-gold'), hold: $('#ctl-hold'),
    prompt: $('#ctl-prompt'), reel: $('#ctl-reel'), zone: $('#reel-zone'), fish: $('#reel-fish'),
    prog: $('#reel-prog'), tension: $('#reel-tension'), power: $('#ctl-power'), powerFill: $('#ctl-power-fill'),
    menu: $('#ctl-menu'), btnA: $('#btn-a'), btnB: $('#btn-b'),
  };
  let menuKey = '';

  function update(v) {
    el.name.textContent = v.name;
    el.gold.textContent = `${v.gold} g`;
    el.hold.textContent = `hold ${v.hold}/${v.cap}`;
    el.hold.style.color = v.hold >= v.cap ? 'var(--danger)' : '';
    el.btnA.textContent = v.aLabel || 'Cast';

    const f = v.fishing;
    let prompt = '', hot = false;
    if (v.menu) prompt = '';
    else if (!f) prompt = v.loc === 'lake' ? (v.prompt === 'Hold full' ? 'Hold full' : v.prompt === 'Dock' ? 'Dock here' : 'Ready to cast') : (v.prompt || 'Walk');
    else if (f.stage === 'charging') prompt = 'Release';
    else if (f.stage === 'flying') prompt = '';
    else if (f.stage === 'waiting') prompt = 'Waiting';
    else if (f.stage === 'bite') { prompt = 'Hook!'; hot = true; }
    else if (f.stage === 'reel') { prompt = f.tug === 'open' ? 'Pull!' : f.tug === 'warn' ? 'Get ready' : 'Reel'; hot = f.tug === 'open'; }
    else if (f.stage === 'caught') prompt = f.fish ? `${f.fish.name}, ${f.fish.weight} kg` : 'Caught';
    else if (f.stage === 'lost') prompt = f.reason || 'Lost';
    el.prompt.textContent = prompt;
    el.prompt.classList.toggle('hot', hot);

    const reeling = f?.stage === 'reel';
    el.reel.hidden = !reeling;
    if (reeling) {
      el.zone.style.left = `${f.zpos * 100}%`; el.zone.style.width = `${f.zsize * 100}%`;
      el.fish.style.left = `${f.fpos * 100}%`;
      el.prog.style.transform = `scaleX(${f.prog})`;
      el.tension.style.transform = `scaleX(${f.tension})`;
      el.btnB.style.borderColor = f.tug === 'open' ? 'var(--accent)' : '';
    } else el.btnB.style.borderColor = '';

    const charging = f?.stage === 'charging';
    el.power.hidden = !charging;
    if (charging) el.powerFill.style.transform = `scaleX(${f.power || 0})`;

    el.root.classList.toggle('menu-mode', !!v.menu);
    if (v.menu) renderMenu(v.menu); else { el.menu.hidden = true; menuKey = ''; }
  }

  function renderMenu(m) {
    const key = JSON.stringify(m);
    if (key === menuKey) return;
    menuKey = key;
    el.menu.hidden = false; el.menu.innerHTML = '';
    m.items.forEach((it, i) => {
      const li = document.createElement('li');
      li.className = (i === m.cursor ? 'cursor' : '') + (!it.enabled && it.kind !== 'leave' ? ' off' : '');
      const label = document.createElement('span'); label.className = 'label'; label.textContent = it.label;
      const price = document.createElement('span'); price.className = 'price' + (it.price < 0 ? ' earn' : '');
      price.textContent = it.price === null || it.price === undefined ? '' : it.price < 0 ? `+${-it.price} g` : `${it.price} g`;
      li.append(label, price);
      if (it.desc) { const d = document.createElement('span'); d.className = 'desc'; d.textContent = it.desc; li.appendChild(d); }
      li.addEventListener('pointerdown', e => { e.preventDefault(); input.select(i); });
      el.menu.appendChild(li);
    });
  }

  function flash(name, data) {
    const b = input.buzz;
    switch (name) {
      case 'bite': b([30, 40, 30]); break;
      case 'hooked': b(20); break;
      case 'tugwarn': b(15); break;
      case 'tug': b([40, 30, 40]); break;
      case 'pullhit': b(25); break;
      case 'pullmiss': b(80); break;
      case 'snap': b([90, 40, 90]); break;
      case 'caught': b(data?.tier >= 3 ? [40, 40, 40, 40, 120] : [30, 30, 60]); break;
      case 'sold': b([20, 20, 20, 20, 20]); break;
      case 'buy': b(25); break;
      case 'nope': case 'holdfull': b(60); break;
      case 'zone': b(5); break;
    }
  }

  return { update, flash, show(v) { el.root.hidden = !v; } };
}

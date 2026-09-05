// Weather particles and haze for the host renderer. Screen-space per pane; the
// only world knowledge is "is this pixel water" so splashes ring or puff.
import { R, hash, ditherPattern } from './gfx.js';

export function createWeatherFx(reduceMotion) {
  const drops = [], flakes = [], splashes = [];
  let bandDrift = 0;

  function tick(state, dt) {
    const w = state.weather; if (!w) return;
    const k = w.intensity, kind = w.kind, wind = w.wind || 0;
    bandDrift += dt * (4 + wind * 6);
    const rain = kind === 'rain' || kind === 'storm';
    const wantDrops = !rain ? 0 : R((reduceMotion ? 60 : kind === 'storm' ? 320 : 190) * k);
    while (drops.length < wantDrops) drops.push(newDrop(wind, kind === 'storm', true));
    if (drops.length > wantDrops) drops.length = wantDrops;
    for (const d of drops) {
      d.x += (d.vx) * dt; d.y += d.vy * dt;
      if (d.y >= d.ground) { splashes.push({ x: d.x, y: d.ground, t: 0, dur: 0.35 + Math.random() * 0.2 }); Object.assign(d, newDrop(wind, kind === 'storm', false)); }
    }
    const wantFlakes = kind !== 'snow' ? 0 : R((reduceMotion ? 40 : 170) * k);
    while (flakes.length < wantFlakes) flakes.push(newFlake(true));
    if (flakes.length > wantFlakes) flakes.length = wantFlakes;
    for (const f of flakes) {
      f.ph += dt * f.spin;
      f.x += (Math.sin(f.ph) * 8 + wind * 14) * dt; f.y += f.vy * dt;
      if (f.y > 370) Object.assign(f, newFlake(false));
      if (f.x > 650) f.x = -10; if (f.x < -10) f.x = 650;
    }
    for (let i = splashes.length - 1; i >= 0; i--) { splashes[i].t += dt; if (splashes[i].t > splashes[i].dur) splashes.splice(i, 1); }
    if (splashes.length > 220) splashes.splice(0, splashes.length - 220);
  }
  const newDrop = (wind, storm, anywhere) => ({
    x: Math.random() * 720 - 40, y: anywhere ? Math.random() * 360 : -10 - Math.random() * 40,
    vx: wind * 90 + (storm ? -30 : 0), vy: storm ? 420 + Math.random() * 120 : 300 + Math.random() * 80,
    len: storm ? 5 + (Math.random() * 3 | 0) : 3 + (Math.random() * 3 | 0), ground: 40 + Math.random() * 330, far: Math.random() < 0.45,
  });
  const newFlake = anywhere => ({ x: Math.random() * 660 - 10, y: anywhere ? Math.random() * 360 : -6, vy: 14 + Math.random() * 18, spin: 0.8 + Math.random() * 1.5, ph: Math.random() * 6, big: Math.random() < 0.3 });

  /** Draw particles inside a pane. isWater(x, y) is in pane-local coords. */
  function draw(ctx, pane, state, isWater) {
    const w = state.weather; if (!w || w.intensity <= 0) return;
    const k = w.intensity;
    ctx.save();
    ctx.beginPath(); ctx.rect(pane.x, pane.y, pane.w, pane.h); ctx.clip();
    ctx.translate(pane.x, pane.y);
    if (drops.length) {
      for (const d of drops) {
        if (d.x < -6 || d.x > pane.w + 6) continue;
        const dx = d.vx / d.vy;
        ctx.fillStyle = d.far ? 'rgba(180,200,225,0.28)' : 'rgba(205,222,240,0.55)';
        for (let i = 0; i < d.len; i++) ctx.fillRect(R(d.x - dx * i), R(d.y - i), 1, 1);
      }
      for (const s of splashes) {
        const t = s.t / s.dur;
        if (isWater(s.x, s.y)) {
          const r = 1 + R(t * 5);
          ctx.strokeStyle = `rgba(220,235,245,${0.45 * (1 - t)})`; ctx.lineWidth = 1;
          ctx.strokeRect(R(s.x) - r + 0.5, R(s.y) - (r >> 1) + 0.5, r * 2, Math.max(1, r));
        } else if (t < 0.5) {
          ctx.fillStyle = `rgba(210,225,240,${0.6 * (1 - t * 2)})`;
          ctx.fillRect(R(s.x) - 1, R(s.y) - 1 - R(t * 3), 1, 1); ctx.fillRect(R(s.x) + 1, R(s.y) - 1 - R(t * 2), 1, 1);
        }
      }
    }
    if (flakes.length) {
      for (const f of flakes) {
        if (f.x < -2 || f.x > pane.w + 2) continue;
        ctx.fillStyle = f.big ? 'rgba(240,246,250,0.9)' : 'rgba(225,235,242,0.6)';
        ctx.fillRect(R(f.x), R(f.y), f.big ? 2 : 1, f.big ? 2 : 1);
      }
    }
    ctx.restore();
  }

  /** Rain, snow and cloud haze, drawn after lighting so it sits in the air. */
  function haze(ctx, pane, state, light) {
    const w = state.weather; if (!w || w.intensity <= 0) return;
    const k = w.intensity;
    ctx.save();
    ctx.beginPath(); ctx.rect(pane.x, pane.y, pane.w, pane.h); ctx.clip();
    ctx.translate(pane.x, pane.y);
    const tone = light > 0.5 ? '#aeb6c0' : '#3a4356';
    if (w.kind === 'rain' || w.kind === 'storm' || w.kind === 'overcast' || w.kind === 'snow') {
      ctx.globalAlpha = (w.kind === 'storm' ? 0.22 : w.kind === 'snow' ? 0.18 : 0.14) * k;
      ctx.fillStyle = tone; ctx.fillRect(0, 0, pane.w, pane.h);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /** Slow cloud shadows across the ground under cover. World coords. */
  function cloudShadows(ctx, cam, pw, ph, state, clock) {
    const w = state.weather; if (!w) return;
    const k = w.kind === 'clear' ? 0.35 : w.intensity;
    if (k <= 0) return;
    const n = w.kind === 'clear' ? 3 : 5;
    ctx.fillStyle = ditherPattern(ctx, 'rgba(10,16,30,0.35)', 0.5 * k);
    for (let i = 0; i < n; i++) {
      const x = ((hash(i, 41) * 1200 + clock * (6 + i * 2) * (1 + (w.wind || 0))) % (pw + 400)) - 200 + cam.x, y = hash(i, 42) * ph + cam.y;
      const rx = 70 + hash(i, 43) * 60, ry = 26 + hash(i, 44) * 18;
      for (let dy = -ry; dy <= ry; dy += 1) {
        const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
        ctx.fillRect(R(x - half), R(y + dy), half * 2, 1);
      }
    }
  }

  return { tick, draw, haze, cloudShadows };
}

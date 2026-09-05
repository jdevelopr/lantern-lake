// Phone joystick + buttons, plus a keyboard fallback for laptop joiners.
// Emits partial input objects; analog changes are throttled to ~20 Hz.
export function createInput({ stick, knob, btnA, btnB, btnBack, onChange }) {
  const state = { x: 0, y: 0, a: false, an: 0, pull: 0, back: 0, sel: -1, selN: 0, jn: 0, jd: 0, jsN: 0 };
  let enabled = false, pending = null, timer = null;
  const buzz = ms => { try { navigator.vibrate?.(ms); } catch {} };

  const sendNow = part => { if (enabled) onChange(part); };
  const sendAnalog = () => {
    pending = { x: Math.round(state.x * 100) / 100, y: Math.round(state.y * 100) / 100 };
    if (timer) return;
    timer = setTimeout(() => { timer = null; sendNow(pending); pending = null; }, 50);
  };

  // Joystick: fixed base, floating knob, deadzone 0.15.
  let stickId = null, radius = 55;
  const setStick = (dx, dy) => {
    const d = Math.hypot(dx, dy), max = radius;
    const k = d > max ? max / d : 1;
    const nx = dx * k / max, ny = dy * k / max;
    const mag = Math.hypot(nx, ny);
    state.x = mag < 0.15 ? 0 : nx; state.y = mag < 0.15 ? 0 : ny;
    knob.style.transform = `translate(${Math.round(dx * k)}px, ${Math.round(dy * k)}px)`;
    sendAnalog();
  };
  stick.addEventListener('pointerdown', e => {
    e.preventDefault(); stickId = e.pointerId; stick.setPointerCapture(e.pointerId);
    radius = stick.clientWidth * 0.36; stick.classList.add('active');
    const r = stick.getBoundingClientRect(); setStick(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
  });
  stick.addEventListener('pointermove', e => {
    if (e.pointerId !== stickId) return;
    const r = stick.getBoundingClientRect(); setStick(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
  });
  const release = e => { if (e.pointerId !== stickId) return; stickId = null; stick.classList.remove('active'); state.x = state.y = 0; knob.style.transform = ''; sendAnalog(); };
  stick.addEventListener('pointerup', release); stick.addEventListener('pointercancel', release);

  // A is a hold button (cast power, reel). B and Back are taps.
  btnA.addEventListener('pointerdown', e => { e.preventDefault(); btnA.setPointerCapture(e.pointerId); btnA.classList.add('pressed'); state.a = true; state.an++; buzz(8); sendNow({ a: true, an: state.an }); });
  const upA = () => { if (!state.a) return; btnA.classList.remove('pressed'); state.a = false; sendNow({ a: false }); };
  btnA.addEventListener('pointerup', upA); btnA.addEventListener('pointercancel', upA);
  btnB.addEventListener('pointerdown', e => { e.preventDefault(); btnB.classList.add('pressed'); state.pull++; buzz(12); sendNow({ pull: state.pull }); });
  const upB = () => btnB.classList.remove('pressed');
  btnB.addEventListener('pointerup', upB); btnB.addEventListener('pointercancel', upB);
  btnBack.addEventListener('pointerdown', e => { e.preventDefault(); state.back++; buzz(6); sendNow({ back: state.back }); });

  // Keyboard fallback for laptop joiners
  const keys = new Set();
  const recompute = () => {
    const L = keys.has('KeyA') || keys.has('ArrowLeft'), R = keys.has('KeyD') || keys.has('ArrowRight');
    const U = keys.has('KeyW') || keys.has('ArrowUp'), D = keys.has('KeyS') || keys.has('ArrowDown');
    let x = (R ? 1 : 0) - (L ? 1 : 0), y = (D ? 1 : 0) - (U ? 1 : 0);
    if (x && y) { x *= 0.7071; y *= 0.7071; }
    state.x = x; state.y = y; sendAnalog();
  };
  addEventListener('keydown', e => {
    if (!enabled || e.target.tagName === 'INPUT') return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'Space') { state.a = true; state.an++; btnA.classList.add('pressed'); return sendNow({ a: true, an: state.an }); }
    if (e.code === 'KeyE' || e.code.startsWith('Shift')) { state.pull++; return sendNow({ pull: state.pull }); }
    if (e.code === 'Escape' || e.code === 'Backspace') { state.back++; return sendNow({ back: state.back }); }
    if (e.code === 'KeyJ') { state.jn++; return sendNow({ jn: state.jn }); }
    keys.add(e.code); recompute();
  });
  addEventListener('keyup', e => {
    if (e.code === 'Space') { state.a = false; btnA.classList.remove('pressed'); return sendNow({ a: false }); }
    if (keys.delete(e.code)) recompute();
  });

  return {
    enable(v) { enabled = v; },
    reset() { state.an = state.pull = state.back = state.selN = 0; state.a = false; },
    select(i) { state.sel = i; state.selN++; buzz(8); sendNow({ sel: i, selN: state.selN }); },
    journal() { state.jn++; buzz(8); sendNow({ jn: state.jn }); },
    step(d) { state.jd = d; state.jsN++; buzz(6); sendNow({ jd: d, jsN: state.jsN }); },
    buzz,
  };
}

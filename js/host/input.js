// Keyboard + mouse for the host's single-player mode. Produces the same input
// shape a phone sends, so the rules never know which device is playing.
export function createLocalInput(onChange) {
  const keys = new Set();
  const state = { x: 0, y: 0, a: false, an: 0, pull: 0, back: 0, sel: -1, selN: 0, jn: 0, jd: 0, jsN: 0 };
  let enabled = false;

  const recompute = () => {
    const L = keys.has('KeyA') || keys.has('ArrowLeft'), R = keys.has('KeyD') || keys.has('ArrowRight');
    const U = keys.has('KeyW') || keys.has('ArrowUp'), D = keys.has('KeyS') || keys.has('ArrowDown');
    let x = (R ? 1 : 0) - (L ? 1 : 0), y = (D ? 1 : 0) - (U ? 1 : 0);
    if (x && y) { x *= 0.7071; y *= 0.7071; }
    state.x = x; state.y = y;
    const a = keys.has('Space') || keys.has('Mouse0');
    if (a && !state.a) state.an++;
    state.a = a;
    onChange({ ...state });
  };

  const down = e => {
    if (!enabled) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'KeyE' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { state.pull++; return onChange({ pull: state.pull }); }
    if (e.code === 'Escape' || e.code === 'Backspace') { state.back++; return onChange({ back: state.back }); }
    if (e.code === 'KeyJ') { state.jn++; return onChange({ jn: state.jn }); }
    keys.add(e.code); recompute();
  };
  const up = e => { if (keys.delete(e.code)) recompute(); };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => { keys.clear(); recompute(); });
  window.addEventListener('mousedown', e => {
    if (!enabled || e.target.closest('button, input, a, li')) return;
    if (e.button === 0) { keys.add('Mouse0'); recompute(); }
    if (e.button === 2) { state.pull++; onChange({ pull: state.pull }); }
  });
  window.addEventListener('mouseup', e => { if (e.button === 0 && keys.delete('Mouse0')) recompute(); });
  window.addEventListener('contextmenu', e => { if (enabled) e.preventDefault(); });

  return {
    enable(v) { enabled = v; if (!v) { keys.clear(); recompute(); } },
    select(i) { state.sel = i; state.selN++; onChange({ sel: i, selN: state.selN }); },
  };
}

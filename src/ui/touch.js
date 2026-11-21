// Touch controls (owner: ui-shell): on-screen D-pad + action/pause/style buttons, and swipe/tap on the canvas.
// DOM only; every button just injects a UI action via `input.act(name)` (hops are edge-buffered by main.js), so touch,
// keys and pads share one path. `onStyle()` / `onPause()` are callbacks for the two extra buttons.
export function isTouchDevice(win = typeof window !== 'undefined' ? window : null) {
  if (!win) return false;
  try { return /[?&]touch=1/.test(win.location.search) || (win.matchMedia && win.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in win; } catch { return false; }
}

export function createTouch({ input, canvas, root = document.body, onStyle, onPause, enabled = isTouchDevice() } = {}) {
  const el = document.createElement('div');
  el.id = 'touch'; el.hidden = !enabled;
  el.innerHTML = '<div class="dpad"><button data-a="up" aria-label="up">&#9650;</button><button data-a="left" aria-label="left">&#9664;</button>' +
    '<button data-a="right" aria-label="right">&#9654;</button><button data-a="down" aria-label="down">&#9660;</button></div>' +
    '<div class="side"><button data-a="style" aria-label="style">G</button><button data-a="pause" aria-label="pause">II</button></div>' +
    '<button class="act" data-a="confirm" aria-label="start">GO</button>';
  root.appendChild(el);
  const timers = new Map();
  const fire = (a) => {
    if (a === 'style') return onStyle && onStyle();
    if (a === 'pause') return onPause ? onPause() : input.act('pause');
    if (a === 'confirm') input.latchJump && input.latchJump();
    input.act(a);
  };
  for (const b of el.querySelectorAll('button')) {
    const a = b.dataset.a;
    const stop = () => { const t = timers.get(b); if (t) { clearInterval(t); timers.delete(b); } b.classList.remove('on'); };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); b.classList.add('on'); fire(a);
      if (['up', 'down', 'left', 'right'].includes(a)) timers.set(b, setInterval(() => fire(a), 150));
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, stop);
  }
  // swipe = hop, tap = confirm
  let p0 = null;
  const down = (e) => { p0 = { x: e.clientX, y: e.clientY, t: performance.now() }; };
  const up = (e) => {
    if (!p0) return; const dx = e.clientX - p0.x, dy = e.clientY - p0.y; p0 = null;
    const m = Math.max(Math.abs(dx), Math.abs(dy));
    if (m < 18) { input.latchJump && input.latchJump(); input.act('confirm'); return; }
    input.act(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };
  if (canvas && enabled) { canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointerup', up); canvas.style.touchAction = 'none'; }
  return {
    el, get enabled() { return enabled; },
    setVisible(v) { el.hidden = !enabled || !v; },
    dispose() { for (const t of timers.values()) clearInterval(t); el.remove(); if (canvas) { canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerup', up); } },
  };
}

// painter-kit surface: real canvas in the browser, recording Canvas2D shim in Node.
const METHODS = ['save', 'restore', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'arc', 'ellipse', 'rect', 'roundRect',
  'fill', 'stroke', 'clip', 'fillRect', 'strokeRect', 'clearRect', 'translate', 'rotate', 'scale', 'transform', 'setTransform', 'resetTransform',
  'drawImage', 'fillText', 'strokeText', 'setLineDash', 'putImageData'];
const STATE = ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'globalAlpha', 'globalCompositeOperation', 'shadowBlur', 'shadowColor',
  'shadowOffsetX', 'shadowOffsetY', 'imageSmoothingEnabled', 'filter', 'font', 'textAlign', 'textBaseline', 'miterLimit'];

function makeGradient(kind, args) {
  const g = { kind, args, stops: [], addColorStop(t, c) { this.stops.push([t, c]); } };
  return g;
}

// Recording ctx shim: every drawing call is pushed to ctx.calls as {op, args, state}; ctx.count(op) counts them.
export function makeRecordingCtx(canvas) {
  const calls = [];
  const state = { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', globalAlpha: 1, globalCompositeOperation: 'source-over',
    shadowBlur: 0, shadowColor: 'rgba(0,0,0,0)', shadowOffsetX: 0, shadowOffsetY: 0, imageSmoothingEnabled: true, filter: 'none', font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic', miterLimit: 10 };
  const stack = [];
  const ctx = { canvas, calls, _state: state, isShim: true };
  for (const k of STATE) Object.defineProperty(ctx, k, { get: () => state[k], set: v => { state[k] = v; }, enumerable: true });
  for (const m of METHODS) {
    ctx[m] = (...args) => {
      if (m === 'save') stack.push({ ...state });
      if (m === 'restore' && stack.length) Object.assign(state, stack.pop());
      calls.push({ op: m, args, alpha: state.globalAlpha, fill: state.fillStyle, stroke: state.strokeStyle });
    };
  }
  ctx.createLinearGradient = (...a) => makeGradient('linear', a);
  ctx.createRadialGradient = (...a) => makeGradient('radial', a);
  ctx.createPattern = () => ({ kind: 'pattern' });
  ctx.measureText = s => ({ width: String(s).length * 6 });
  ctx.getImageData = (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
  ctx.createImageData = (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
  ctx.count = op => { let n = 0; for (const c of calls) if (c.op === op) n++; return n; };
  ctx.reset = () => { calls.length = 0; };
  return ctx;
}

// makeSurface(w, h) -> { w, h, canvas, ctx, isShim, clear() }
export function makeSurface(w, h) {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  let canvas = null;
  if (typeof OffscreenCanvas !== 'undefined') canvas = new OffscreenCanvas(w, h);
  else if (typeof document !== 'undefined' && document.createElement) { canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; }
  let ctx = null;
  if (canvas) { ctx = canvas.getContext('2d'); }
  const isShim = !ctx;
  if (isShim) { canvas = { width: w, height: h }; ctx = makeRecordingCtx(canvas); }
  else ctx.imageSmoothingEnabled = true;
  return { w, h, canvas, ctx, isShim, clear() { ctx.clearRect(0, 0, w, h); } };
}

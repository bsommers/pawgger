// library-sprites kit: turn a raster character-library asset (e.g. a turnaround sheet on a flat background) into transparent sprites.
// Pure JS, zero dependencies. Node-only helpers (decodeImageFile via ImageMagick `convert`, file IO) are separate from the
// isomorphic ones (cutout, bbox, crop, resize, encodePng/decodePng, toDrawable) so game runtime code can import this file in a browser.
// An "image" is { w, h, rgba: Uint8ClampedArray } (straight alpha).

const nodeRequire = (m) => globalThis.process?.getBuiltinModule?.(m);

/** Node only: decode any raster (jpeg/png/webp) to an image via ImageMagick `convert` (must be on PATH). */
export function decodeImageFile(path) {
  const cp = nodeRequire('node:child_process');
  const info = cp.execFileSync('convert', [path, '-format', '%w %h', 'info:'], { encoding: 'utf8' }).trim().split(' ').map(Number);
  const [w, h] = info;
  const buf = cp.execFileSync('convert', [path, '-alpha', 'set', '-depth', '8', 'rgba:-'], { maxBuffer: w * h * 4 + 1024 });
  return { w, h, rgba: new Uint8ClampedArray(buf.buffer, buf.byteOffset, w * h * 4).slice() };
}

export const newImage = (w, h) => ({ w, h, rgba: new Uint8ClampedArray(w * h * 4) });
export function crop(img, x0, y0, x1, y1) {
  const w = x1 - x0, h = y1 - y0, out = newImage(w, h);
  for (let y = 0; y < h; y++) out.rgba.set(img.rgba.subarray(((y0 + y) * img.w + x0) * 4, ((y0 + y) * img.w + x0 + w) * 4), y * w * 4);
  return out;
}
/** Bounding box of pixels with alpha > thr inside optional region {x0,y0,x1,y1}; null when empty. */
export function bbox(img, thr = 8, r = { x0: 0, y0: 0, x1: img.w, y1: img.h }) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) if (img.rgba[(y * img.w + x) * 4 + 3] > thr) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}
/** Keep only the largest 4-connected opaque component plus components >= minFrac of it (drops stray specks/labels). */
export function keepMainComponents(img, minFrac = 0.02, thr = 8) {
  const { w, h, rgba } = img, lab = new Int32Array(w * h), sizes = [0];
  let n = 0; const stack = [];
  for (let s = 0; s < w * h; s++) {
    if (lab[s] || rgba[s * 4 + 3] <= thr) continue;
    n++; let c = 0; stack.push(s); lab[s] = n;
    while (stack.length) { const p = stack.pop(); c++; const x = p % w, y = (p / w) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) if (q >= 0 && !lab[q] && rgba[q * 4 + 3] > thr) { lab[q] = n; stack.push(q); } }
    sizes.push(c);
  }
  const big = Math.max(0, ...sizes);
  for (let p = 0; p < w * h; p++) if (lab[p] && sizes[lab[p]] < big * minFrac) rgba[p * 4 + 3] = 0;
  return img;
}
/**
 * Remove a flat/slowly-varying background: flood fill from the image border over pixels within `tol` (RGB distance) of the
 * background colour (median of the border), then soften the fringe: pixels within `fringe` px of the removed area get
 * alpha from how far they are from the background toward the outline colour `ink` (so black outlines stay crisp, no grey halo).
 */
export function cutout(img, { tol = 30, fringe = 2, ink = [26, 26, 26], pocketMin = 1500 } = {}) {
  const { w, h, rgba } = img, bgc = [0, 0, 0];
  const samples = [[], [], []];
  for (let x = 0; x < w; x += 7) for (const y of [0, h - 1]) for (let c = 0; c < 3; c++) samples[c].push(rgba[(y * w + x) * 4 + c]);
  for (let y = 0; y < h; y += 7) for (const x of [0, w - 1]) for (let c = 0; c < 3; c++) samples[c].push(rgba[(y * w + x) * 4 + c]);
  for (let c = 0; c < 3; c++) { samples[c].sort((a, b) => a - b); bgc[c] = samples[c][samples[c].length >> 1]; }
  const dist = (p) => Math.hypot(rgba[p * 4] - bgc[0], rgba[p * 4 + 1] - bgc[1], rgba[p * 4 + 2] - bgc[2]);
  const bg = new Uint8Array(w * h), stack = [];
  const push = (p) => { if (!bg[p] && dist(p) <= tol) { bg[p] = 1; stack.push(p); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) { const p = stack.pop(), x = p % w, y = (p / w) | 0; if (x > 0) push(p - 1); if (x < w - 1) push(p + 1); if (y > 0) push(p - w); if (y < h - 1) push(p + w); }
  // enclosed background pockets (between legs, under arms): same colour as the background, big enough not to be a highlight
  const seen = new Uint8Array(w * h);
  for (let s0 = 0; s0 < w * h; s0++) {
    if (bg[s0] || seen[s0] || dist(s0) > tol) continue;
    const comp = [s0]; seen[s0] = 1;
    for (let i = 0; i < comp.length; i++) { const p = comp[i], x = p % w, y = (p / w) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) if (q >= 0 && !bg[q] && !seen[q] && dist(q) <= tol) { seen[q] = 1; comp.push(q); } }
    if (comp.length >= pocketMin) for (const q of comp) bg[q] = 1;
  }
  const bgDist = Math.hypot(ink[0] - bgc[0], ink[1] - bgc[1], ink[2] - bgc[2]);
  const near = new Uint8Array(w * h);                                    // within `fringe` px of bg
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = y * w + x; if (bg[p]) continue;
    for (let dy = -fringe; dy <= fringe && !near[p]; dy++) for (let dx = -fringe; dx <= fringe; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h && bg[yy * w + xx]) { near[p] = 1; break; } } }
  for (let p = 0; p < w * h; p++) {
    if (bg[p]) { rgba[p * 4 + 3] = 0; continue; }
    if (near[p]) {
      const d = dist(p), a = d <= tol * 1.6 ? 0 : Math.min(1, (d - tol * 1.6) / (bgDist * 0.55 - tol * 1.6));
      const dark = Math.hypot(rgba[p * 4] - ink[0], rgba[p * 4 + 1] - ink[1], rgba[p * 4 + 2] - ink[2]);
      if (dark < bgDist * 0.6) { rgba[p * 4] = ink[0]; rgba[p * 4 + 1] = ink[1]; rgba[p * 4 + 2] = ink[2]; }   // snap fringe to outline colour
      rgba[p * 4 + 3] = Math.round(255 * Math.max(0, a));
    }
  }
  return { img, bg: bgc };
}
/** Box-filter downscale (premultiplied) to fit height `h` (keeps aspect). */
export function resizeToHeight(img, h) {
  const s = h / img.h, w = Math.max(1, Math.round(img.w * s)), out = newImage(w, h), k = img.h / h, kx = img.w / w;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let sy = Math.floor(y * k); sy < Math.min(img.h, Math.ceil((y + 1) * k)); sy++) for (let sx = Math.floor(x * kx); sx < Math.min(img.w, Math.ceil((x + 1) * kx)); sx++) { const i = (sy * img.w + sx) * 4, al = img.rgba[i + 3]; r += img.rgba[i] * al; g += img.rgba[i + 1] * al; b += img.rgba[i + 2] * al; a += al; n++; }
    const o = (y * w + x) * 4; if (a > 0) { out.rgba[o] = r / a; out.rgba[o + 1] = g / a; out.rgba[o + 2] = b / a; } out.rgba[o + 3] = a / n;
  }
  return out;
}

// ---- PNG (RGBA8, no interlace). encodePng writes filter 0; decodePng understands all 5 filters.
const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function encodePng(img) {
  const zlib = nodeRequire('node:zlib'), { w, h, rgba } = img;
  const raw = new Uint8Array((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1); }
  const chunk = (type, data) => { const o = new Uint8Array(12 + data.length), dv = new DataView(o.buffer); dv.setUint32(0, data.length); for (let i = 0; i < 4; i++) o[4 + i] = type.charCodeAt(i); o.set(data, 8); dv.setUint32(8 + data.length, crc32(o.subarray(4, 8 + data.length))); return o; };
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer); dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 6;
  const parts = [Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', new Uint8Array(0))];
  return Buffer.concat(parts);
}
export function decodePng(bytes) {
  const zlib = nodeRequire('node:zlib'), u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  let p = 8, w = 0, h = 0; const idat = [];
  while (p < u.length) { const len = dv.getUint32(p), type = String.fromCharCode(...u.subarray(p + 4, p + 8)); const d = u.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = new DataView(d.buffer, d.byteOffset).getUint32(0); h = new DataView(d.buffer, d.byteOffset).getUint32(4); if (d[8] !== 8 || d[9] !== 6 || d[12] !== 0) throw new Error('decodePng: only RGBA8 non-interlaced'); }
    else if (type === 'IDAT') idat.push(d); p += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), bpl = w * 4, out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (bpl + 1)], row = raw.subarray(y * (bpl + 1) + 1, (y + 1) * (bpl + 1));
    for (let i = 0; i < bpl; i++) {
      const a = i >= 4 ? out[y * bpl + i - 4] : 0, b = y ? out[(y - 1) * bpl + i] : 0, c = i >= 4 && y ? out[(y - 1) * bpl + i - 4] : 0;
      let v = row[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[y * bpl + i] = v;
    }
  }
  return { w, h, rgba: out };
}

/**
 * Isomorphic: PNG data URI / bytes -> a drawable. Browser: a canvas (ready for ctx.drawImage). Node: the decoded image object
 * ({w,h,rgba}; the Pawgger PixCtx shim and painter-kit recording ctx accept it).
 */
export async function toDrawable(src) {
  if (typeof document !== 'undefined' && typeof Image !== 'undefined') {
    const url = typeof src === 'string' ? src : URL.createObjectURL(new Blob([src], { type: 'image/png' }));
    const im = new Image(); im.src = url; await im.decode();
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0);
    c.w = c.width; c.h = c.height; return c;
  }
  const bytes = typeof src === 'string' ? Uint8Array.from(Buffer.from(src.slice(src.indexOf(',') + 1), 'base64')) : src;
  return decodePng(bytes);
}
export const sha256 = (bytes) => nodeRequire('node:crypto').createHash('sha256').update(bytes).digest('hex');

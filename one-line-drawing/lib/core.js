// one-line-drawing · core.js — seeded random, noise, easing, vectors, polylines, masks and contour tracing.
// Pure functions only: the film is a function of t, so nothing here reads the clock or Math.random.

export function rng(seed = 1) {
  let s = (seed >>> 0) || 1;
  const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  r.range = (a, b) => a + (b - a) * r();
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.sign = () => (r() < .5 ? -1 : 1);
  return r;
}
// smooth 1D value noise (seeded): n(x) in -1…1
export function noise1(seed = 1) {
  const r = rng(seed), v = Array.from({ length: 512 }, () => r() * 2 - 1);
  return x => { const i = Math.floor(x), f = x - i, a = v[((i % 512) + 512) % 512], b = v[(((i + 1) % 512) + 512) % 512], u = f * f * (3 - 2 * f); return a + (b - a) * u; };
}
// smooth 2D value noise (seeded): n(x, y) in -1…1
export function noise2(seed = 1) {
  const r = rng(seed), N = 256, v = Array.from({ length: N * N }, () => r() * 2 - 1);
  const at = (i, j) => v[(((j % N) + N) % N) * N + (((i % N) + N) % N)];
  return (x, y) => {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), w = fy * fy * (3 - 2 * fy);
    const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
}

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const prog = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a));
export const ease = {
  lin: k => k,
  in: k => k * k * k,
  out: k => 1 - (1 - k) ** 3,
  io: k => (k < .5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2),
  sine: k => .5 - Math.cos(Math.PI * k) / 2,
};

// ---- vectors ---------------------------------------------------------------------------------------------------
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const mul = (a, k) => [a[0] * k, a[1] * k];
export const len = a => Math.hypot(a[0], a[1]);
export const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
export const perp = a => [-a[1], a[0]];
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
export const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
export const rot = (a, ang) => { const c = Math.cos(ang), s = Math.sin(ang); return [a[0] * c - a[1] * s, a[0] * s + a[1] * c]; };

// ---- polylines -------------------------------------------------------------------------------------------------
export function bbox(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
export function polyLen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]); return s; }
// resample an open polyline to an even step (keeps the first and last point)
export function resample(pts, step = 2) {
  if (pts.length < 2) return pts.slice();
  const out = [pts[0]]; let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = dist(a, b); if (d < 1e-9) continue;
    let s = step - carry;
    while (s <= d) { out.push(mix(a, b, s / d)); s += step; }
    carry = d - (s - step);
  }
  const l = pts[pts.length - 1]; if (dist(out[out.length - 1], l) > step * .25) out.push(l);
  return out;
}
// Ramer–Douglas–Peucker
export function simplify(pts, eps = 1.5) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let md = 0, mi = -1;
    for (let i = a + 1; i < b; i++) { const d = segDist(pts[i], pts[a], pts[b]); if (d > md) { md = d; mi = i; } }
    if (md > eps) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
export function segDist(p, a, b) { const ab = sub(b, a), t = clamp(((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / (ab[0] ** 2 + ab[1] ** 2 || 1)); return dist(p, add(a, mul(ab, t))); }
export function inside(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
export function area(poly) { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
// Chaikin smoothing for an open polyline (n passes)
export function chaikin(pts, n = 1, closed = false) {
  let p = pts;
  for (let k = 0; k < n; k++) {
    const q = closed ? [] : [p[0]];
    const m = closed ? p.length : p.length - 1;
    for (let i = 0; i < m; i++) { const a = p[i], b = p[(i + 1) % p.length]; q.push(mix(a, b, .25), mix(a, b, .75)); }
    if (!closed) q.push(p[p.length - 1]);
    p = q;
  }
  return p;
}

// ---- masks: a shape drawn with canvas commands → a bitmap → its outer contour ---------------------------------
export function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  // software canvases: GPU and CPU rasters differ by a pixel here and there, and the film must be exact
  c.getContext('2d', { willReadFrequently: true });
  return c;
}
// rasterise draw(ctx) (page coordinates) into a binary mask at `res` px per page px, cropped to its bounds
export function maskOf(draw, W, H, res = .5) {
  const c = canvas(W * res, H * res), g = c.getContext('2d');
  g.setTransform(res, 0, 0, res, 0, 0); g.fillStyle = '#000'; g.strokeStyle = '#000';
  draw(g);
  const im = g.getImageData(0, 0, c.width, c.height).data, w = c.width, h = c.height, m = new Uint8Array(w * h);
  let n = 0; for (let i = 0; i < w * h; i++) if (im[i * 4 + 3] > 110) { m[i] = 1; n++; }
  return { m, w, h, res, n };
}
// outer outlines of the mask's components (largest first), page coordinates, by Moore-neighbour tracing
export function traceMask(mask, minPx = 12) {
  const { m, w, h, res } = mask, lab = new Int32Array(w * h), loops = [];
  const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? m[y * w + x] : 0);
  // clockwise neighbours (screen y down): W, NW, N, NE, E, SE, S, SW
  const NX = [-1, -1, 0, 1, 1, 1, 0, -1], NY = [0, -1, -1, -1, 0, 1, 1, 1];
  let id = 0;
  for (let y0 = 0; y0 < h; y0++) for (let x0 = 0; x0 < w; x0++) {
    const i0 = y0 * w + x0; if (!m[i0] || lab[i0]) continue;
    // label the component (so each is traced once) and count it
    id++; let count = 0; const st = [i0]; lab[i0] = id;
    while (st.length) { const i = st.pop(); count++; const x = i % w, y = (i - x) / w;
      for (let k = 0; k < 8; k += 2) { const xx = x + NX[k], yy = y + NY[k]; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const j = yy * w + xx; if (m[j] && !lab[j]) { lab[j] = id; st.push(j); } } }
    if (count < minPx) continue;
    // Moore trace from the top-left pixel; its west neighbour is background
    const pts = []; let px = x0, py = y0, back = 0, guard = 0;
    const sx = x0, sy = y0; let firstMove = -1;
    do {
      pts.push([(px + .5) / res, (py + .5) / res]);
      let found = -1;
      for (let k = 1; k <= 8; k++) { const d = (back + k) % 8; if (at(px + NX[d], py + NY[d])) { found = d; break; } }
      if (found < 0) break; // a single pixel
      px += NX[found]; py += NY[found];
      back = found % 2 ? (found + 5) % 8 : (found + 6) % 8; // the background pixel we passed, seen from the new pixel
      if (firstMove < 0) firstMove = found;
      else if (px === sx && py === sy) { // Jacob's stop: back at the start, about to repeat the first move
        let nf = -1; for (let k = 1; k <= 8; k++) { const d = (back + k) % 8; if (at(px + NX[d], py + NY[d])) { nf = d; break; } }
        if (nf === firstMove) break;
      }
    } while (++guard < 500000);
    if (pts.length > 6) loops.push({ pts, count });
  }
  loops.sort((a, b) => b.count - a.count);
  return loops.map(l => l.pts);
}
// distance field (in mask px) from every cell to the nearest set cell — two-pass chamfer
export function distField(m, w, h) {
  const D = new Float32Array(w * h), INF = 1e9;
  for (let i = 0; i < w * h; i++) D[i] = m[i] ? 0 : INF;
  const a = 1, b = 1.414;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; let d = D[i];
    if (x > 0) d = Math.min(d, D[i - 1] + a);
    if (y > 0) { d = Math.min(d, D[i - w] + a); if (x > 0) d = Math.min(d, D[i - w - 1] + b); if (x < w - 1) d = Math.min(d, D[i - w + 1] + b); }
    D[i] = d;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; let d = D[i];
    if (x < w - 1) d = Math.min(d, D[i + 1] + a);
    if (y < h - 1) { d = Math.min(d, D[i + w] + a); if (x < w - 1) d = Math.min(d, D[i + w + 1] + b); if (x > 0) d = Math.min(d, D[i + w - 1] + b); }
    D[i] = d;
  }
  return D;
}

// ---- colour ----------------------------------------------------------------------------------------------------
export function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function rgba(h, a = 1) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
export function mixHex(a, b, k) { const x = hexRgb(a), y = hexRgb(b); return '#' + x.map((v, i) => Math.round(lerp(v, y[i], clamp(k))).toString(16).padStart(2, '0')).join(''); }

// blur a region of a canvas in place: three box passes ≈ a gaussian of that radius (px). No ctx.filter: a filtered
// canvas drops to a slow path in software rendering and every later read-back costs seconds.
export function boxBlur(c, r, x0 = 0, y0 = 0, w = c.width, h = c.height) {
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); w = Math.min(c.width - x0, Math.ceil(w)); h = Math.min(c.height - y0, Math.ceil(h));
  if (w < 2 || h < 2 || r < .5) return c;
  const g = c.getContext('2d'), im = g.getImageData(x0, y0, w, h), d = im.data, n = w * h, buf = new Float32Array(n * 4), tmp = new Float32Array(Math.max(w, h) * 4);
  for (let i = 0; i < n * 4; i++) buf[i] = d[i];
  // premultiply so transparent edges do not darken
  for (let i = 0; i < n; i++) { const a = buf[i * 4 + 3] / 255; buf[i * 4] *= a; buf[i * 4 + 1] *= a; buf[i * 4 + 2] *= a; }
  const rad = Math.max(1, Math.round(r / 1.7));
  const pass = (len, stride, count, step) => {
    for (let k = 0; k < count; k++) {
      const base = k * step;
      for (let ch = 0; ch < 4; ch++) {
        let s = 0; for (let j = -rad; j <= rad; j++) s += buf[(base + clampI(j, 0, len - 1) * stride) * 4 + ch];
        for (let j = 0; j < len; j++) { tmp[j * 4 + ch] = s / (2 * rad + 1); s += buf[(base + clampI(j + rad + 1, 0, len - 1) * stride) * 4 + ch] - buf[(base + clampI(j - rad, 0, len - 1) * stride) * 4 + ch]; }
      }
      for (let j = 0; j < len; j++) for (let ch = 0; ch < 4; ch++) buf[(base + j * stride) * 4 + ch] = tmp[j * 4 + ch];
    }
  };
  for (let it = 0; it < 3; it++) { pass(w, 1, h, w); pass(h, w, w, 1); }
  for (let i = 0; i < n; i++) { const a = buf[i * 4 + 3], k = a > .01 ? 255 / a : 0; d[i * 4] = buf[i * 4] * k; d[i * 4 + 1] = buf[i * 4 + 1] * k; d[i * 4 + 2] = buf[i * 4 + 2] * k; d[i * 4 + 3] = a; }
  g.putImageData(im, x0, y0); return c;
}
const clampI = (v, a, b) => (v < a ? a : v > b ? b : v);

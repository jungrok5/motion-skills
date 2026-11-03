// crayon-statechart · sketch.js — the hand: seeded noise, wobbly ink lines, crayon hatching, paper, text.
// Everything is a pure function of its arguments (and a seed), so a frame is the same every time it is drawn.

// ── palette: cobalt ink on cream paper, red for guards / tags / the active state, yellow and pink fills ──
export const C = {
  paper: '#f3eee2', ink: '#2f3cb5', navy: '#212a62', red: '#d22d4e', redSoft: '#e9707f',
  cream: '#fbf0d0', creamHatch: '#efd894', pink: '#f6d2d4', pinkHatch: '#ec9aa3',
  yellow: '#f3c64a', orange: '#ee8a2e', green: '#7cc66a', greenDark: '#3f8f45',
  sky: '#dfe5f1', skyHatch: '#a9b6dc', blush: '#f7e1df', blushHatch: '#efb1b4',
  skin: '#f4d9c1', skinHatch: '#e3b393', brown: '#a8643a', brownLight: '#d79a66',
  white: '#fbf8f0', grey: '#b9b6c8', mint: '#9fe3c4', violet: '#8f86d6',
};
export const FONT = "'Courier Prime', 'Nanum Gothic Coding', 'Courier New', monospace";

// ── seeded randomness ──
export function hash(s) {
  let h = 2166136261 >>> 0;
  s = String(s);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seed) {
  let a = (typeof seed === 'number' ? seed : hash(seed)) >>> 0 || 1;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const lat = (i, s) => { let h = Math.imul((i | 0) ^ Math.imul(s | 0, 0x9E3779B1), 0x85EBCA6B); h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35); h ^= h >>> 16; return (h >>> 0) / 4294967296 * 2 - 1; };
/** smooth 1D value noise in [-1, 1] */
export function n1(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lat(i, seed) * (1 - u) + lat(i + 1, seed) * u; }

export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = u => (u = clamp(u), u * u * (3 - 2 * u));
export const easeOut = u => (u = clamp(u), 1 - (1 - u) ** 3);
export const easeInOut = u => (u = clamp(u), u < .5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
export const back = u => { u = clamp(u); const c = 1.7; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; };

// ── point lists ──
export function rectPts(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
export function roundRectPts(x, y, w, h, r = 10, n = 5) {
  const p = [], cs = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return p;
}
export function ellipsePts(cx, cy, rx, ry, n = 28, a0 = 0) {
  const p = []; for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p;
}
/** a box whose bottom edge is a torn-ticket zigzag (the state shape) */
export function ticketPts(x, y, w, h, amp = 4, period = 9) {
  const p = [[x, y], [x + w, y], [x + w, y + h - amp]];
  const n = Math.max(2, Math.round(w / period));
  for (let i = 1; i <= n; i++) p.push([x + w - i * w / n + w / n / 2, y + h - (i % 2 ? 0 : amp)], [x + w - i * w / n, y + h - amp]);
  return p;
}
/** a bumpy cloud outline: circles along an ellipse */
export function cloudPts(cx, cy, w, h, seed = 1, bumps = 7) {
  const r = rng(seed), p = [];
  for (let i = 0; i < bumps; i++) {
    const a0 = Math.PI + i / bumps * Math.PI * 2, a1 = a0 + Math.PI * 2 / bumps, R = .9 + r() * .35;
    for (let j = 0; j <= 6; j++) {
      const a = lerp(a0, a1, j / 6), bulge = Math.sin(j / 6 * Math.PI) * .32 * R;
      p.push([cx + Math.cos(a) * w / 2 * (1 + bulge * .6), cy + Math.sin(a) * h / 2 * (1 + bulge) * (Math.sin(a) > 0 ? .55 : 1)]);
    }
  }
  return p;
}
export function bbox(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}

/** resample a polyline every `step` px and push it sideways by smooth noise — the hand's wobble */
export function wobble(pts, { closed = false, amp = 1.1, step = 10, seed = 1, freq = .045 } = {}) {
  const P = closed ? [...pts, pts[0]] : pts, out = [];
  let d = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, ay] = P[i], [bx, by] = P[i + 1], L = Math.hypot(bx - ax, by - ay) || 1e-6, nx = -(by - ay) / L, ny = (bx - ax) / L;
    const n = Math.max(1, Math.ceil(L / step));
    for (let j = 0; j < n; j++) {
      const u = j / n, o = n1((d + u * L) * freq, seed) * amp;
      out.push([ax + (bx - ax) * u + nx * o, ay + (by - ay) * u + ny * o]);
    }
    d += L;
  }
  const [lx, ly] = P[P.length - 1];
  out.push([lx + n1(d * freq, seed) * amp * .3, ly]);
  return out;
}
export function length(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
/** the first k (0..1) of a polyline, by length */
export function partial(pts, k) {
  if (k >= 1) return pts; if (k <= 0) return pts.slice(0, 1);
  const L = length(pts) * k, out = [pts[0]]; let d = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], s = Math.hypot(bx - ax, by - ay);
    if (d + s >= L) { const u = (L - d) / (s || 1); out.push([ax + (bx - ax) * u, ay + (by - ay) * u]); return out; }
    out.push(pts[i]); d += s;
  }
  return out;
}
export function trace(ctx, pts, closed) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (closed) ctx.closePath(); }

/** an ink line: a firm stroke plus a lighter second pass a hair off it (pencil pressure) */
export function ink(ctx, pts, { w = 2.4, color = C.ink, closed = false, k = 1, seed = 1, amp = 1.1, alpha = 1, step = 10 } = {}) {
  if (!pts.length || k <= 0) return;
  const P = partial(wobble(pts, { closed, amp, seed, step }), k);
  if (P.length < 2) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color;
  ctx.globalAlpha *= alpha * .92; ctx.lineWidth = w; trace(ctx, P, false); ctx.stroke();
  const Q = partial(wobble(pts, { closed, amp: amp * 1.3, seed: seed + 7, step }), k);
  ctx.globalAlpha *= .5; ctx.lineWidth = w * .5; ctx.translate(.6, .5); trace(ctx, Q, false); ctx.stroke();
  ctx.restore();
}

/** crayon hatching inside a closed shape: a pale flat wash, then parallel strokes of varying weight */
export function hatch(ctx, pts, { color = C.ink, base = null, baseA = .55, angle = -.95, gap = 3.6, w = 1.6, a = .6, seed = 1, cross = 0 } = {}) {
  const [x0, y0, x1, y1] = bbox(pts), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4;
  ctx.save(); trace(ctx, pts, true); ctx.clip();
  if (base) { ctx.globalAlpha *= baseA; ctx.fillStyle = base; ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4); ctx.globalAlpha /= baseA; }
  ctx.strokeStyle = color; ctx.lineCap = 'round';
  const layers = cross ? [angle, angle + 1.25] : [angle];
  const ga = ctx.globalAlpha;
  layers.forEach((ang, li) => {
    const r = rng(seed + li * 31), ca = Math.cos(ang), sa = Math.sin(ang);
    for (let d = -R; d < R; d += gap * (.75 + r() * .5)) {
      const j = (r() - .5) * 3, len = R * (.85 + r() * .3);
      ctx.globalAlpha = ga * a * (li ? cross : 1) * (.45 + r() * .55); ctx.lineWidth = w * (.6 + r() * .8);
      const px = cx - sa * d, py = cy + ca * d;
      ctx.beginPath(); ctx.moveTo(px - ca * len + j, py - sa * len); ctx.lineTo(px + ca * len, py + sa * len + j); ctx.stroke();
    }
  });
  ctx.restore();
}

/** a filled, hatched, outlined shape — the unit every prop is built from */
export function shape(ctx, pts, { fill = null, hatchColor = null, base = null, baseA, outline = C.ink, w = 2.2, seed = 1, angle, gap, a, cross, amp = 1, k = 1 } = {}) {
  if (fill || hatchColor || base) hatch(ctx, pts, { color: hatchColor || fill || base, base: base || fill, baseA, angle, gap, a, seed, cross });
  if (outline) ink(ctx, pts, { closed: true, color: outline, w, seed: seed + 3, amp, k });
}

/** a tapered limb or blade from a polyline spine: widths w0 → w1 */
export function limbPts(spine, w0, w1) {
  const L = [], R = [], n = spine.length;
  for (let i = 0; i < n; i++) {
    const a = spine[Math.max(0, i - 1)], b = spine[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const w = lerp(w0, w1, i / (n - 1)) / 2, nx = -dy / l * w, ny = dx / l * w;
    L.push([spine[i][0] + nx, spine[i][1] + ny]); R.push([spine[i][0] - nx, spine[i][1] - ny]);
  }
  return [...L, ...R.reverse()];
}

// ── text ──
export function font(o = {}) { return `${o.italic ? 'italic ' : ''}${o.bold ? 700 : 400} ${o.size || 20}px ${FONT}`; }
export function measure(ctx, str, o = {}) {
  ctx.save(); ctx.font = font(o); const lines = String(str).split('\n');
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)); ctx.restore();
  return { w, h: lines.length * (o.size || 20) * (o.lh || 1.25), lines: lines.length };
}
/** text with a typewriter reveal (k = share of characters shown), left/center/right aligned, top baseline at y */
export function text(ctx, str, x, y, o = {}) {
  const size = o.size || 20, lh = size * (o.lh || 1.25), lines = String(str).split('\n');
  const total = lines.reduce((n, l) => n + [...l].length, 0); let left = Math.round(total * clamp(o.k ?? 1));
  ctx.save(); ctx.font = font(o); ctx.fillStyle = o.color || C.navy; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'alphabetic';
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  lines.forEach((l, i) => {
    const ch = [...l], show = ch.slice(0, Math.max(0, left)).join(''); left -= ch.length;
    if (!show) return;
    if (o.align && o.align !== 'left' && show.length < l.length) {
      // keep the line's final position while it types: measure the full line, draw the part from its left edge
      const full = ctx.measureText(l).width, x0 = o.align === 'center' ? x - full / 2 : x - full;
      ctx.textAlign = 'left'; ctx.fillText(show, x0, y + size * .8 + i * lh); ctx.textAlign = o.align;
    } else ctx.fillText(show, x, y + size * .8 + i * lh);
  });
  ctx.restore();
}

// ── paper and grain (screen-fixed, painted once per size) ──
const plates = new Map();
function plate(key, W, H, paint) {
  if (plates.has(key)) return plates.get(key);
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H });
  paint(c.getContext('2d'), W, H); plates.set(key, c); return c;
}
export function paper(W, H, bg = C.paper) {
  return plate(`paper${W}x${H}${bg}`, W, H, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const r = rng(11), n = Math.round(W * H / 900);
    for (let i = 0; i < n; i++) { g.fillStyle = r() < .5 ? 'rgba(120,100,70,.05)' : 'rgba(255,255,255,.12)'; const s = .6 + r() * 1.6; g.fillRect(r() * W, r() * H, s, s); }
    g.strokeStyle = 'rgba(120,100,70,.05)'; g.lineWidth = .7;
    for (let i = 0; i < n / 30; i++) { const x = r() * W, y = r() * H, a = r() * Math.PI, l = 4 + r() * 12; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l / 2 + r() * 3, y + Math.sin(a) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  });
}
export function grain(W, H) {
  return plate(`grain${W}x${H}`, W, H, (g) => {
    const img = g.createImageData(W, H), d = img.data, r = rng(5);
    for (let i = 0; i < d.length; i += 4) { const v = r(); d[i] = d[i + 1] = d[i + 2] = v < .5 ? 0 : 255; d[i + 3] = Math.abs(v - .5) * 22; }
    g.putImageData(img, 0, 0);
  });
}

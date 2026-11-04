// sketchnote-explainer · hand.js — the hand: seeded noise, pencil lines with pressure, offset watercolour washes, faint
// construction lines, handwriting with a left-to-right reveal, highlighter marks, paper and grain.
// Every function is a pure function of its arguments (and a seed), so a frame is the same every time it is drawn.

// ── palette: warm cream paper, a dark brown pencil, tomato red for notes, muted watercolour washes ──
export const C = {
  paper: '#f1ebe0', line: '#3a302a', soft: '#6b5f55', guide: '#b8ada0', red: '#e0533f', redSoft: '#ef8f7d',
  green: '#a9c08a', leaf: '#86a86e', greenDark: '#5d8550', yellow: '#ecc14a', mark: '#f0c24b', orange: '#e98c3f',
  cinnamon: '#c98848', brown: '#7b4a32', coffee: '#3a2620', cream: '#f6e6c4', peach: '#f2c9a0', pink: '#eaa7a0',
  sky: '#b5cfdc', blue: '#7ba7c2', navy: '#3f5a72', card: '#b9caa5', grey: '#cfc8bd', white: '#fbf8f2',
  honey: '#e9a93a', amber: '#d48a26', violet: '#a99bc9', sand: '#e3cfa6',
};
export const HAND = "'Caveat', 'Gaegu', cursive";        // labels, titles, the second subtitle line
export const KHAND = "'Gaegu', 'Caveat', cursive";       // Korean-first handwriting (Gaegu's Latin is rounder)
export const SANS = "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif"; // the subtitle card's main line

// ── seeded randomness ──
export function hash(s) {
  let h = 2166136261 >>> 0; s = String(s);
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
export function mix(a, b, u) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(u))).toString(16).padStart(2, '0')).join('');
}

// ── point lists (local coordinates; the board moves and scales them) ──
export function ellipse(cx, cy, rx, ry = rx, n = 0, a0 = -Math.PI / 2) {
  n = n || Math.max(16, Math.round((rx + ry) / 3)); const p = [];
  for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p;
}
export const circle = (cx, cy, r, n) => ellipse(cx, cy, r, r, n);
export function arc(cx, cy, rx, ry, a0, a1, n = 0) {
  n = n || Math.max(8, Math.round(Math.abs(a1 - a0) * (rx + ry) / 6)); const p = [];
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p;
}
export function rect(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
export function roundRect(x, y, w, h, r = 10, n = 5) {
  const p = [], cs = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return p;
}
export function polygon(cx, cy, r, n, a0 = -Math.PI / 2) { const p = []; for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; }
/** Catmull-Rom through control points → a dense smooth polyline */
export function curve(ctrl, closed = false, per = 10) {
  const P = ctrl, n = P.length, out = [];
  if (n < 3) return ctrl.slice();
  const g = i => closed ? P[(i + n) % n] : P[clamp(i, 0, n - 1)];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => .5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  if (!closed) out.push(P[n - 1].slice());
  return out;
}
/** a leaf / lens / blade between two points: width w, bend b (−1…1) */
export function lens(ax, ay, bx, by, w, bend = 0) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, out = [], n = 18;
  for (let i = 0; i <= n; i++) { const u = i / n, s = Math.sin(u * Math.PI) * w / 2, b = Math.sin(u * Math.PI) * bend * L * .18; out.push([ax + dx * u + nx * (s + b), ay + dy * u + ny * (s + b)]); }
  for (let i = n - 1; i > 0; i--) { const u = i / n, s = Math.sin(u * Math.PI) * w / 2, b = Math.sin(u * Math.PI) * bend * L * .18; out.push([ax + dx * u - nx * (s - b), ay + dy * u - ny * (s - b)]); }
  return out;
}
/** a wavy line from a to b: n waves of amplitude amp */
export function squiggle(ax, ay, bx, by, waves = 3, amp = 6) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, out = [], n = waves * 10;
  for (let i = 0; i <= n; i++) { const u = i / n, s = Math.sin(u * waves * Math.PI * 2) * amp; out.push([ax + dx * u + nx * s, ay + dy * u + ny * s]); }
  return out;
}
export function bbox(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}
export function length(pts, closed) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (closed && pts.length > 2) L += Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]); return L; }
export function area(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length]; a += x0 * y1 - x1 * y0; } return Math.abs(a / 2); }

/** resample a polyline every `step` px and push it sideways by smooth noise — the hand's wobble */
export function wobble(pts, { closed = false, amp = .9, step = 7, seed = 1, freq = .03, overshoot = 0 } = {}) {
  const P = closed ? [...pts, pts[0]] : pts, out = [];
  let d = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, ay] = P[i], [bx, by] = P[i + 1], L = Math.hypot(bx - ax, by - ay) || 1e-6, nx = -(by - ay) / L, ny = (bx - ax) / L;
    const n = Math.max(1, Math.ceil(L / step));
    for (let j = 0; j < n; j++) { const u = j / n, o = n1((d + u * L) * freq, seed) * amp; out.push([ax + (bx - ax) * u + nx * o, ay + (by - ay) * u + ny * o]); }
    d += L;
  }
  const [lx, ly] = P[P.length - 1]; out.push([lx, ly]);
  // a closed shape is not closed exactly: the pen runs a little past where it started
  if (closed && overshoot > 0) { const extra = partialPts(out, overshoot / Math.max(1, length(out))); out.push(...extra.slice(1).map(([x, y]) => [x + 1.2, y + .8])); }
  return out;
}
function partialPts(pts, k) {
  if (k >= 1) return pts; if (k <= 0) return pts.slice(0, 1);
  const L = length(pts) * k, out = [pts[0]]; let d = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], s = Math.hypot(bx - ax, by - ay);
    if (d + s >= L) { const u = (L - d) / (s || 1); out.push([ax + (bx - ax) * u, ay + (by - ay) * u]); return out; }
    out.push(pts[i]); d += s;
  }
  return out;
}
export const partial = partialPts;
export function trace(g, pts, closed) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); if (closed) g.closePath(); }

/** a pencil line: pressure varies along it, ends taper, a lighter second pass sits a hair off it. k = share drawn. */
export function pencil(g, pts, { w = 2.6, color = C.line, closed = false, k = 1, seed = 1, amp = .9, alpha = 1, dash = 0 } = {}) {
  if (!pts || pts.length < 2 || k <= 0) return null;
  const all = wobble(pts, { closed, amp, seed, overshoot: closed ? 10 : 0 });
  const P = partialPts(all, k), L = length(all);
  if (P.length < 2) return P[0];
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = color; g.globalAlpha *= alpha;
  let d = 0;
  // pressure: draw in short runs, each with its own width
  const run = dash ? 1 : 6;
  for (let i = 0; i < P.length - 1; i += run) {
    const seg = P.slice(i, Math.min(P.length, i + run + 1));
    const sl = length(seg), mid = d + sl / 2;
    const taper = Math.min(1, (mid + 4) / 14, (L - mid + 4) / 14);
    if (dash && Math.floor(mid / dash) % 2) { d += sl; continue; }
    g.lineWidth = Math.max(.4, w * (.82 + .3 * n1(mid * .02, seed + 5)) * (.45 + .55 * clamp(taper)));
    trace(g, seg, false); g.stroke(); d += sl;
  }
  if (!dash) {
    const Q = partialPts(wobble(pts, { closed, amp: amp * 1.4, seed: seed + 7, overshoot: closed ? 10 : 0 }), k);
    g.globalAlpha *= .28; g.lineWidth = w * .45; g.translate(.7, .5); trace(g, Q, false); g.stroke();
  }
  g.restore();
  return P[P.length - 1];
}

/** a faint construction line (guide): thin, grey, a little longer than it needs to be */
export function guide(g, pts, { k = 1, seed = 1, closed = false, alpha = 1 } = {}) {
  return pencil(g, pts, { w: 1, color: C.guide, closed, k, seed, amp: .5, alpha: .75 * alpha });
}

/** a watercolour wash: flat colour set off the line (misregistered), a ragged edge a shade darker, a wipe reveal */
export function wash(g, pts, { color = C.yellow, k = 1, seed = 1, off = [4, 3], angle = -.6, alpha = .92 } = {}) {
  if (k <= 0 || pts.length < 3) return null;
  const P = wobble(pts.map(([x, y]) => [x + off[0], y + off[1]]), { closed: true, amp: 1.6, seed: seed + 11, step: 6, freq: .05 });
  const [x0, y0, x1, y1] = bbox(P), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 6;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  g.save();
  let tip = null;
  if (k < 1) {
    // the wipe front: a ragged line moving across the shape along `angle`
    const d = lerp(-R, R, easeOut(k)), front = [];
    for (let i = 0; i <= 12; i++) { const s = lerp(-R, R, i / 12), j = n1(i * .9, seed) * 9; front.push([cx + ca * (d + j) - sa * s, cy + sa * (d + j) + ca * s]); }
    g.beginPath(); g.moveTo(cx - ca * R * 1.5 - sa * R * 1.5, cy - sa * R * 1.5 + ca * R * 1.5); g.lineTo(cx - ca * R * 1.5 + sa * R * 1.5, cy - sa * R * 1.5 - ca * R * 1.5);
    for (let i = 12; i >= 0; i--) g.lineTo(front[i][0], front[i][1]);
    g.closePath(); g.clip();
    tip = [cx + ca * d, cy + sa * d];
  }
  g.globalAlpha *= alpha;
  trace(g, P, true); g.fillStyle = color; g.fill();
  // pigment pools at the edge
  g.globalAlpha *= .32; g.lineWidth = 1.8; g.strokeStyle = mix(color, C.line, .25); g.lineJoin = 'round'; g.stroke();
  // a couple of soft lighter blooms inside
  g.save(); trace(g, P, true); g.clip();
  // uneven pigment: a few faint lighter and darker patches, small against the shape
  const r = rng(seed + 3), sz = Math.min(x1 - x0, y1 - y0);
  for (let i = 0; i < 4; i++) { const bx = lerp(x0, x1, .15 + r() * .7), by = lerp(y0, y1, .15 + r() * .7), br = sz * (.12 + r() * .14); g.globalAlpha = alpha * (i % 2 ? .05 : .07); g.fillStyle = i % 2 ? mix(color, C.line, .5) : '#ffffff'; g.beginPath(); g.ellipse(bx, by, br * 1.4, br, r() * 3, 0, Math.PI * 2); g.fill(); }
  g.restore();
  g.restore();
  return tip;
}

/** a highlighter mark (behind text): a translucent band with rough ends, laid left to right */
export function marker(g, x, y, w, h, { color = C.mark, k = 1, seed = 1, alpha = .78 } = {}) {
  if (k <= 0) return null;
  const r = rng(seed), ww = w * easeOut(k), top = [], bot = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10; top.push([x + ww * u, y + n1(u * 3, seed) * 2.5 + (i === 0 ? r() * 4 : 0)]); bot.push([x + ww * u + (i === 10 ? -3 : 0), y + h + n1(u * 3, seed + 1) * 2.5]); }
  g.save(); g.globalAlpha *= alpha; g.fillStyle = color; g.globalCompositeOperation = 'multiply';
  trace(g, [...top, ...bot.reverse()], true); g.fill(); g.restore();
  return [x + ww, y + h * .6];
}

// ── text ──
export function font(o = {}) {
  const fam = o.font === 'sans' ? SANS : o.font === 'k' ? KHAND : o.font && o.font !== 'hand' ? o.font : HAND;
  return `${o.bold === false ? 500 : o.weight || 700} ${o.size || 32}px ${fam}`;
}
export function measure(g, str, o = {}) {
  g.save(); g.font = font(o); const lines = String(str).split('\n');
  const w = Math.max(...lines.map(l => g.measureText(l).width)); g.restore();
  const size = o.size || 32;
  return { w, h: lines.length * size * (o.lh || 1.2), size, lines: lines.length };
}
/** handwriting: revealed left to right (k), top of the first line at y. Returns where the pen is. */
export function write(g, str, x, y, o = {}) {
  const size = o.size || 32, lh = size * (o.lh || 1.2), lines = String(str).split('\n'), k = clamp(o.k ?? 1);
  const m = measure(g, str, o), align = o.align || 'left', left = align === 'center' ? x - m.w / 2 : align === 'right' ? x - m.w : x;
  g.save(); g.font = font(o); g.fillStyle = o.color || C.line; g.textBaseline = 'alphabetic';
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  // lines reveal one after another, each in proportion to its width
  const ws = lines.map(l => g.measureText(l).width), tot = ws.reduce((a, b) => a + b, 0) || 1;
  let budget = k * tot, pen = null;
  lines.forEach((l, i) => {
    const lw = ws[i], lx = align === 'center' ? x - lw / 2 : align === 'right' ? x - lw : x, by = y + size * .82 + i * lh;
    const show = clamp(budget / (lw || 1)); budget -= lw;
    if (show <= 0) return;
    g.save();
    if (show < 1) { g.beginPath(); g.rect(lx - 4, by - size * 1.1, lw * show + 4, size * 1.5); g.clip(); pen = [lx + lw * show, by - size * .25 + Math.sin(show * 40) * size * .12]; }
    g.textAlign = 'left'; g.fillText(l, lx, by);
    g.restore();
    if (show >= 1) pen = [lx + lw, by - size * .2];
  });
  g.restore();
  return pen || [left, y + size * .6];
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
    // a soft vignette, warmer at the corners
    const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.hypot(W, H) * .62);
    v.addColorStop(0, 'rgba(255,250,240,0)'); v.addColorStop(1, 'rgba(150,120,80,.10)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
    const r = rng(11), n = Math.round(W * H / 700);
    for (let i = 0; i < n; i++) { g.fillStyle = r() < .5 ? 'rgba(120,100,70,.045)' : 'rgba(255,255,255,.10)'; const s = .6 + r() * 1.5; g.fillRect(r() * W, r() * H, s, s); }
    g.strokeStyle = 'rgba(120,100,70,.04)'; g.lineWidth = .7;
    for (let i = 0; i < n / 40; i++) { const x = r() * W, y = r() * H, a = r() * Math.PI, l = 4 + r() * 12; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l / 2 + r() * 3, y + Math.sin(a) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  });
}
export function grain(W, H) {
  return plate(`grain${W}x${H}`, W, H, (g) => {
    const img = g.createImageData(W, H), d = img.data, r = rng(5);
    for (let i = 0; i < d.length; i += 4) { const v = r(); d[i] = d[i + 1] = d[i + 2] = v < .5 ? 0 : 255; d[i + 3] = Math.abs(v - .5) * 18; }
    g.putImageData(img, 0, 0);
  });
}

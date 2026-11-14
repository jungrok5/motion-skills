// ballpoint-doodle-short · pen.js — the two hands of the style: a ballpoint pen (thin wobbly outline, two passes, a little
// overshoot) and a coloured pencil (parallel hatching that leaves paper between the strokes, denser on the shadow side,
// stopping a hair short of the line). Plus the paper, points, timing and colour helpers. Everything is deterministic:
// randomness comes from hash(…) of the stroke's own local geometry and the boil frame, never Math.random.
//
//   P.frame(boil, seed)                         once per frame (film.js does it): which drawing of the boil we are on
//   P.ink(ctx, pts, { col, w, closed })         a ballpoint stroke through points (open or closed, smoothed)
//   P.crayon(ctx, pts, { col, ang, gap, shade }) coloured-pencil hatching clipped to a closed shape
//   P.shape(ctx, pts, { fill, line, shade })    crayon + ink in one call (the normal way to draw a thing)
//   P.hand(ctx, text, x, y, { size, col })      handwriting (Caveat, bundled) for the one sign in the world
export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const fract = v => v - Math.floor(v);
export const hash = (a, b = 0) => fract(Math.sin(a * 127.1 + b * 311.7) * 43758.5453123);
export function n1(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i, seed), hash(i + 1, seed), u) * 2 - 1; }
export function rng(seed) { let s = (Math.floor(seed * 9973) ^ 0x9e3779b9) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
export const ease = {
  lin: k => k, in: k => k * k, out: k => 1 - (1 - k) * (1 - k), io: k => k < .5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k),
  sine: k => .5 - .5 * Math.cos(Math.PI * k), back: k => { const c = 1.7; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; },
  bounce: k => { const n = 7.5625, d = 2.75; if (k < 1 / d) return n * k * k; if (k < 2 / d) return n * (k -= 1.5 / d) * k + .75; if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + .9375; return n * (k -= 2.625 / d) * k + .984375; },
};
/** 0…1 as t goes a → b (clamped), optionally eased */
export const span = (t, a, b, e) => { const k = clamp((t - a) / (b - a)); return e ? (typeof e === 'function' ? e : ease[e])(k) : k; };
/** keyframes [{t, x, y, …, e}] → the value of prop at t (eased per key with e: 'io' default) */
export function keys(list, t, prop, def = 0) {
  const L = list.filter(k => k[prop] !== undefined); if (!L.length) return def;
  if (t <= L[0].t) return L[0][prop]; const z = L[L.length - 1]; if (t >= z.t) return z[prop];
  for (let i = 1; i < L.length; i++) if (t < L[i].t) { const a = L[i - 1], b = L[i], k = (t - a.t) / (b.t - a.t), e = ease[b.e || 'io'] || ease.io; return lerp(a[prop], b[prop], e(k)); }
  return def;
}
/** a jump arc between two points: p(k) for k 0…1, with height h above the higher end */
export const arcAt = (a, b, h, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k) - h * 4 * k * (1 - k)];

// ── colour ──
const hexc = new Map();
export function rgb(c) { if (hexc.has(c)) return hexc.get(c); const h = c.replace('#', ''), f = h.length === 3 ? h.split('').map(x => x + x).join('') : h, v = [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16)); hexc.set(c, v); return v; }
export const rgba = (c, a = 1) => { const [r, g, b] = rgb(c); return `rgba(${r},${g},${b},${a})`; };
export const mix = (a, b, k) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join(''); };

/** the house colours (a pen case on a desk). Use them; add your own crayons per film, in the same soft-but-clear key. */
export const INK = { blue: '#262b74', navy: '#1f2350', black: '#25252b', red: '#c23a2f', green: '#3d7a3a', brown: '#6d4a2c', grey: '#5d5d66', orange: '#c8652a' };
export const CRAYON = {
  blue: '#3f56a8', sky: '#7aa0d8', navy: '#2b3a86', yellow: '#f2c230', gold: '#e8a92a', orange: '#ef8a3a', red: '#d9493b',
  pink: '#ef8fa0', blush: '#ef7f8f', green: '#5aa04a', leaf: '#79b45a', moss: '#8a9a3a', brown: '#9a6a3c', tan: '#d6b07a',
  grey: '#8b8b93', stone: '#a29e98', cream: '#f4ecd6', white: '#fbf8ef', lilac: '#8f78c4', teal: '#3f9a9a', black: '#3a3a42',
};
export const PAPER = '#fbf4e6';

// ── pen state: which drawing of the boil, and a reveal budget for draw-on ──
export const pen = { boil: 0, seed: 1, amp: 1, budget: Infinity, used: 0, count: 0, paper: null };   // paper: the sheet colour under every fill (film.js sets it)
export const audit = [];                       // body rules broken in this frame (rig.js pushes "body: …")
export function frame(boil, seed = 1) { pen.boil = boil; pen.seed = seed; pen.used = 0; pen.count = 0; }
/** spend one stroke of the draw-on budget; false = this stroke is not drawn yet */
function spend() { pen.count++; if (pen.used >= pen.budget) return false; pen.used++; return true; }
/** how many strokes fn draws (for drawOn) */
export function countStrokes(fn) { const b = pen.budget, u = pen.used, c = pen.count; pen.budget = 0; pen.used = 0; pen.count = 0; fn(); const n = pen.count; pen.budget = b; pen.used = u; pen.count = c; return n; }

// ── points ──
export const ellipse = (cx, cy, rx, ry, n = 28, a0 = 0) => Array.from({ length: n }, (_, i) => { const a = a0 + i / n * TAU; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
/** an egg / blob: wider at the bottom by k (0 = ellipse) */
export const egg = (cx, cy, rx, ry, k = .12, n = 32) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU, s = Math.sin(a); return [cx + Math.cos(a) * rx * (1 + k * s), cy + s * ry]; });
export const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export const arc = (cx, cy, rx, ry, a0, a1, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
export const move = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
export const scale = (pts, sx, sy = sx, cx = 0, cy = 0) => pts.map(([x, y]) => [cx + (x - cx) * sx, cy + (y - cy) * sy]);
export const rot = (pts, a, cx = 0, cy = 0) => { const c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); };
export const centroid = pts => { let x = 0, y = 0; for (const p of pts) { x += p[0]; y += p[1]; } return [x / pts.length, y / pts.length]; };
export function bbox(pts) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of pts) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a, b, c, d]; }

// a stable key for a stroke: its own (local) geometry + the boil, so a still drawing holds and a boil re-draws it
const keyOf = (pts, salt = 0) => Math.round(pts[0][0] * 1.3) * 7.31 + Math.round(pts[0][1] * 1.3) * 3.17 + pts.length * 1.7 + salt;

/** resample a polyline to roughly `step` spacing (closed adds the last edge) */
function resample(pts, step, closed) {
  const P = closed ? [...pts, pts[0]] : pts, out = [P[0]];
  for (let i = 1; i < P.length; i++) {
    const [x0, y0] = P[i - 1], [x1, y1] = P[i], d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / step));
    for (let j = 1; j <= n; j++) out.push([lerp(x0, x1, j / n), lerp(y0, y1, j / n)]);
  }
  if (closed) out.pop();
  return out;
}
/** trace a smooth path through points (Catmull-Rom → Bézier) */
export function trace(ctx, pts, closed) {
  const n = pts.length; if (n < 2) return;
  ctx.moveTo(pts[0][0], pts[0][1]);
  if (n === 2) { ctx.lineTo(pts[1][0], pts[1][1]); if (closed) ctx.closePath(); return; }
  const at = i => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)], last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) ctx.closePath();
}
/** the wobble of a hand: points nudged by slow noise that changes with the boil */
function wobble(pts, amp, k, freq = .035) {
  const b = pen.boil;
  let along = 0;
  return pts.map((p, i) => {
    if (i) along += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    return [p[0] + n1(along * freq + k, b * 13.1 + 1) * amp, p[1] + n1(along * freq + k + 50, b * 7.7 + 2) * amp];
  });
}

/**
 * ink — a ballpoint line. o: { col, w (2.6), a (.92), closed, amp (wobble px, 1.4), over (overshoot px at open ends, 3),
 * second (alpha of the second, slightly offset pass: .35), smooth (true) }
 */
export function ink(ctx, pts, o = {}) {
  if (!pts || pts.length < 2 || !spend()) return;
  const k = keyOf(pts, 11), amp = (o.amp ?? 1.4) * pen.amp, w = o.w ?? 2.6, closed = !!o.closed;
  let P = resample(pts, o.step ?? 14, closed);
  if (!closed && (o.over ?? 3) > 0) {   // a hand overshoots and lifts: extend both ends a little along their direction
    const ov = o.over ?? 3, e = (a, b, s) => { const d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1; return [a[0] + (a[0] - b[0]) / d * s, a[1] + (a[1] - b[1]) / d * s]; };
    P = [e(P[0], P[1], ov * hash(k, 1)), ...P, e(P[P.length - 1], P[P.length - 2], ov * hash(k, 2))];
  }
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(o.col || INK.blue, o.a ?? .92); ctx.lineWidth = w;
  ctx.beginPath(); trace(ctx, wobble(P, amp, k), closed); ctx.stroke();
  const sec = o.second ?? .35;
  if (sec > 0) {   // the second pass: a ballpoint goes over its line again, never exactly
    ctx.strokeStyle = rgba(o.col || INK.blue, sec); ctx.lineWidth = w * .7;
    const Q = closed ? wobble(P, amp * 1.6, k + 9.3) : wobble(P.slice(Math.floor(P.length * .08 * hash(k, 4)), P.length - Math.floor(P.length * .1 * hash(k, 5))), amp * 1.6, k + 9.3);
    if (Q.length > 1) { ctx.beginPath(); trace(ctx, Q, closed); ctx.stroke(); }
  }
  ctx.restore();
}
/** several short open strokes (hair, grass blades, marks) */
export const strokes = (ctx, list, o = {}) => { for (const s of list) ink(ctx, s, o); };

/**
 * crayon — coloured-pencil hatching inside a closed shape. o: {
 *   col, ang (−0.95 rad: strokes lean like a right hand's), gap (5.2 px between strokes), w (2.4), a (.78 alpha),
 *   base (.22: a light even layer of the same pencil under the hatch), inset (.97: the fill stops short of the line),
 *   off ([1.5, 1]: and sits a little off it), shade ({ col, dir: [dx, dy] toward the shadow, k: .45 }) a second, denser
 *   layer on the side away from the light, cross (false: a cross-hatch pass for dark things), seed }
 */
export function crayon(ctx, pts, o = {}) {
  if (!pts || pts.length < 3 || !spend()) return;
  const k = keyOf(pts, 23) + (o.seed || 0), col = o.col || CRAYON.blue, [cx, cy] = centroid(pts);
  const ins = o.inset ?? .97, off = o.off || [1.5, 1];
  const clip = pts.map(([x, y]) => [cx + (x - cx) * ins + off[0], cy + (y - cy) * ins + off[1]]);
  const [x0, y0, x1, y1] = bbox(clip), R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  ctx.save(); ctx.beginPath(); trace(ctx, wobble(clip, 1.2 * pen.amp, k), true); ctx.clip();
  // a drawn thing covers what is behind it: lay the sheet's own colour under the pencil first (o.knock: false = see-through)
  if (o.knock !== false) { ctx.fillStyle = pen.paper || PAPER; ctx.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8); }
  if ((o.base ?? .22) > 0) { ctx.fillStyle = rgba(col, o.base ?? .22); ctx.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8); }
  ctx.lineCap = 'round';
  const pass = (pcol, ang, gap, alpha, w, salt) => {
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx, b = pen.boil % 2;
    let s = -R + hash(k, salt) * gap, j = 0;
    while (s < R) {
      const r1 = hash(k + j * .37, salt + b), r2 = hash(k + j * .91, salt + 3 + b), r3 = hash(k + j * .53, salt + 7);
      const px = mx + nx * s, py = my + ny * s, L = R * (1.05 + r3 * .1), sh = (r1 - .5) * R * .3;
      ctx.strokeStyle = rgba(pcol, alpha * (.55 + .45 * r2)); ctx.lineWidth = w * (.75 + .5 * r1);
      ctx.beginPath(); ctx.moveTo(px - dx * L + dx * sh, py - dy * L + dy * sh);
      ctx.quadraticCurveTo(px + nx * (r3 - .5) * 3, py + ny * (r3 - .5) * 3, px + dx * L + dx * sh, py + dy * L + dy * sh); ctx.stroke();
      s += gap * (.7 + .6 * r3); j++;
    }
  };
  const gap = o.gap ?? 5.2, ang = (o.ang ?? -.95) + (hash(k, 31) - .5) * .12, A = o.a ?? .78, W = o.w ?? 2.4;
  pass(col, ang, gap, A, W, 1);
  if (o.cross) pass(col, ang + 1.25, gap * 1.3, A * .6, W * .9, 41);
  if (o.shade) {   // the shadow side: the shape minus itself moved toward the light = a crescent, hatched again, harder
    const sd = o.shade.dir || [.55, .85], d = Math.hypot(sd[0], sd[1]) || 1, sh = (o.shade.k ?? .42) * R;
    const lit = clip.map(([x, y]) => [x - sd[0] / d * sh, y - sd[1] / d * sh]);
    ctx.save(); ctx.beginPath(); ctx.rect(x0 - R, y0 - R, (x1 - x0) + 2 * R, (y1 - y0) + 2 * R); trace(ctx, lit, true); ctx.clip('evenodd');
    pass(o.shade.col || col, ang + .2, gap * .8, o.shade.a ?? .7, W, 61);
    ctx.restore();
  }
  ctx.restore();
}

/** a thing: crayon fill (o.fill colour, o.shade true / colour) + ballpoint outline (o.line colour, false = none) */
export function shape(ctx, pts, o = {}) {
  if (o.fill) crayon(ctx, pts, { col: o.fill, ang: o.ang, gap: o.gap, a: o.fa, base: o.base, cross: o.cross, w: o.fw, seed: o.seed,
    shade: o.shade ? { col: typeof o.shade === 'string' ? o.shade : mix(o.fill, '#1d1d40', .35), dir: o.sdir || [.55, .85], k: o.sk ?? .42, a: o.sa } : null });
  if (o.line !== false) ink(ctx, pts, { col: o.line || INK.blue, w: o.w, closed: o.open ? false : true, amp: o.amp, second: o.second });
}

/** a solid dot / small filled shape in ink (eyes, pupils) — ballpoint scribbled solid */
export function blot(ctx, pts, col = INK.black, a = .95) {
  if (!spend()) return;
  ctx.save(); ctx.fillStyle = rgba(col, a); ctx.beginPath(); trace(ctx, wobble(pts, .5 * pen.amp, keyOf(pts, 5)), true); ctx.fill(); ctx.restore();
}

/** ballpoint scribble hatch (contact shadows, cliff faces, the dark inside of a hole): zig-zag strokes in a box */
export function hatch(ctx, x, y, w, h, o = {}) {
  if (!spend()) return;
  const k = x * .7 + y * .3 + (o.seed || 0), n = Math.max(2, Math.round(w / (o.gap ?? 6))), ang = o.ang ?? .9;
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = rgba(o.col || INK.grey, o.a ?? .5); ctx.lineWidth = o.w ?? 1.4;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const r = hash(k + i * .7, pen.boil % 2 + 3), xx = x + (i + r * .6) / n * w, hh = h * (.6 + .4 * hash(k + i, 9)), taper = o.taper ? Math.sin(Math.PI * (i + .5) / n) : 1;
    ctx.moveTo(xx, y + h - hh * taper); ctx.lineTo(xx - Math.cos(ang) * hh * taper * .5, y + h);
  }
  ctx.stroke(); ctx.restore();
}

/** handwriting in ballpoint (the font is loaded by film.js as "DoodleHand"); jittered per letter, re-inked on the boil */
export function hand(ctx, text, x, y, o = {}) {
  if (!spend()) return;
  const size = o.size ?? 44, col = o.col || INK.blue;
  ctx.save(); ctx.font = `500 ${size}px DoodleHand, "Comic Sans MS", cursive`; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = rgba(col, .92);
  const lines = String(text).split('\n');
  lines.forEach((ln, li) => {
    let cx = x;
    for (let i = 0; i < ln.length; i++) {
      const ch = ln[i], r = hash(i * 3.1 + li * 17 + x, pen.boil % 2), wch = ctx.measureText(ch).width;
      ctx.save(); ctx.translate(cx, y + li * size * (o.lead ?? 1.05) + (r - .5) * 2.2); ctx.rotate((hash(i + li * 9, 5) - .5) * .09); ctx.fillText(ch, 0, 0); ctx.restore();
      cx += wch * (o.track ?? 1);
    }
  });
  ctx.restore();
}
export const handWidth = (ctx, text, size = 44) => { ctx.save(); ctx.font = `500 ${size}px DoodleHand, cursive`; const w = Math.max(...String(text).split('\n').map(l => ctx.measureText(l).width)); ctx.restore(); return w; };

/** the paper: cream with fibre mottling and a faint tooth, painted once into a plate by film.js */
export function paper(ctx, w, h, o = {}) {
  const tone = o.tone || PAPER, r = rng(o.seed || 3);
  ctx.fillStyle = tone; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 200; i++) {   // soft mottling
    const x = r() * w, y = r() * h, R = 40 + r() * 160, g = ctx.createRadialGradient(x, y, 0, x, y, R), d = r() < .5;
    g.addColorStop(0, d ? 'rgba(150,120,80,.003)' : 'rgba(255,255,250,.022)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 900; i++) {   // fibres
    const x = r() * w, y = r() * h, L = 6 + r() * 22, a = r() * TAU;
    ctx.strokeStyle = r() < .5 ? 'rgba(120,95,60,.035)' : 'rgba(255,255,255,.08)'; ctx.lineWidth = .6 + r() * .8;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * L * .5 + (r() - .5) * 4, y + Math.sin(a) * L * .5 + (r() - .5) * 4, x + Math.cos(a) * L, y + Math.sin(a) * L); ctx.stroke();
  }
  const id = ctx.getImageData(0, 0, Math.ceil(w * (o.S || 1)), Math.ceil(h * (o.S || 1)));   // tooth
  for (let i = 0; i < id.data.length; i += 4) { const v = (r() - .5) * 6; id.data[i] += v; id.data[i + 1] += v; id.data[i + 2] += v * .8; }
  ctx.putImageData(id, 0, 0);
}

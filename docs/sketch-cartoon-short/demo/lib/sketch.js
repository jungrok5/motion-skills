// sketch-cartoon-short · sketch.js — the hand: seeded noise, pencil strokes that boil, misregistered flat fills, hatching,
// scribble masses, toned paper. Every function is a pure function of its arguments plus the pen state below (seed, boil
// frame, reveal budget), so a frame is the same every time it is drawn.
//
//   S.line(ctx, pts, { w: 2.4 })            an open pencil stroke (overshoots its ends, two passes, tapered)
//   S.loop(ctx, pts)                        a closed outline that overlaps its own start (never a neat closed path)
//   S.fill(ctx, pts, '#9aa77c')             flat colour, rough edge, shifted off the line (the unfinished look)
//   S.shape(ctx, pts, { fill, shade })      fill + shadow side + outline: the unit every body part and prop is built from
//   S.hatch(ctx, pts, { angle, gap })       loose parallel pencil strokes inside a shape
//   S.scribble(ctx, cx, cy, rx, ry)         a dense, boiling pencil scribble mass (dark things, shadows, smoke, rain clouds)
//   S.paper(ctx, w, h, { tone })            toned paper: mottling, fibres, specks
//
// The pen: S.pen.boil changes every boil frame (film.js sets it: 8 a second) — every stroke gets a new wobble, the line
// "boils" like hand-drawn animation. S.pen.budget limits how many strokes are drawn (the draw-on reveal: g.drawOn(k, fn)).

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, u) => a + (b - a) * u;
export const ease = {
  lin: u => clamp(u), sine: u => (1 - Math.cos(Math.PI * clamp(u))) / 2,
  in: u => clamp(u) ** 2, out: u => 1 - (1 - clamp(u)) ** 2, io: u => (u = clamp(u), u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2),
  out3: u => 1 - (1 - clamp(u)) ** 3, in3: u => clamp(u) ** 3,
  back: u => { u = clamp(u); const c = 1.9; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; },
  pop: u => { u = clamp(u); return 1 - Math.cos(u * Math.PI * 2.5) * Math.exp(-u * 5) * (1 - u); },
};
/** 0 → 1 over [a, b] with an ease (default sine) */
export const span = (t, a, b, e = ease.sine) => e((t - a) / (b - a || 1e-6));

// ── seeded randomness ──
export function hash(a, b = 0) {
  let h = Math.imul((a * 1000003 | 0) ^ Math.imul(b | 0, 0x9E3779B1), 0x85EBCA6B); h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function rng(seed) {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** smooth 1D value noise in [-1, 1] */
export function n1(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return (hash(i, seed) * (1 - u) + hash(i + 1, seed) * u) * 2 - 1; }

/** keyed values: keys = [{ t, x, y, … , e: 'io' }], each property interpolated between the keys that have it (ease of the later key) */
export function keys(list, t, prop, def = 0) {
  let a = null, b = null;
  for (const k of list) { if (k[prop] === undefined) continue; if (k.t <= t) a = k; else { b = k; break; } }
  if (!a && !b) return def; if (!a) return b[prop]; if (!b) return a[prop];
  const e = ease[b.e || 'sine'] || ease.sine; return lerp(a[prop], b[prop], e((t - a.t) / (b.t - a.t)));
}

// ── colour ──
const hex = c => { c = c.replace('#', ''); if (c.length === 3) c = [...c].map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); };
const toHex = a => '#' + a.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, k) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => lerp(v, B[i], k))); };
export const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
/** k < 0 darker (toward a cool graphite), k > 0 lighter (toward cream) */
export const tone = (c, k) => k < 0 ? mix(c, '#2a2e2c', -k) : mix(c, '#f4f0e2', k);

// ── the pen ──
export const pen = {
  boil: 0, n: 0, seed: 1,                     // boil frame, stroke counter (reset each frame), film seed
  budget: Infinity, used: 0, counting: false, // draw-on reveal
  ink: '#2b2c29', w: 2.4, wob: 1.6,           // default line colour, width, wobble (stage px)
  misreg: [5, 4],                             // how far fills sit off their lines (stage px), turned a little per shape
  boilAmp: 1,                                 // 0 = lines never boil (a held, cleaned-up drawing)
};
/** called by film.js at the start of every frame / plate */
export function frame(boil, seed = pen.seed) { pen.boil = boil; pen.n = 0; pen.seed = seed; pen.used = 0; pen.budget = Infinity; pen.counting = false; }
/** how much of the next stroke may be drawn (0…1) — and count it */
function take() {
  if (pen.counting) { pen.used++; return 0; }
  const k = clamp(pen.budget - pen.used); pen.used++; return k;
}
/** run fn with the pen counting strokes instead of drawing, return the count */
export function countStrokes(fn) { const s = { ...pen }; pen.counting = true; pen.used = 0; try { fn(); } finally { } const n = pen.used; Object.assign(pen, s); return n; }

// ── point lists ──
export const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export function ellipse(cx, cy, rx, ry, n = 28, a0 = -Math.PI / 2) { const p = []; for (let i = 0; i < n; i++) { const a = a0 + i / n * TAU; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; }
export function arc(cx, cy, rx, ry, a0, a1, n = 16) { const p = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; }
export const seg = (x0, y0, x1, y1) => [[x0, y0], [x1, y1]];
export function bbox(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; }
export const move = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
export const scalePts = (pts, sx, sy = sx, ox = 0, oy = 0) => pts.map(([x, y]) => [ox + (x - ox) * sx, oy + (y - oy) * sy]);
export const rot = (pts, a, ox = 0, oy = 0) => { const c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [ox + (x - ox) * c - (y - oy) * s, oy + (x - ox) * s + (y - oy) * c]); };
/** Catmull-Rom through the points, n samples per span */
export function curve(pts, n = 6, closed = false) {
  if (pts.length < 3) return pts.slice();
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]], out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  if (!closed) out.push(pts[pts.length - 1]);
  return out;
}
export function length(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
/** resample a polyline every `step` px */
export function resample(pts, step = 6) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(L / step));
    for (let j = 1; j <= n; j++) out.push([ax + (bx - ax) * j / n, ay + (by - ay) * j / n]);
  }
  return out;
}
/** the part of a polyline between fractions a and b of its length */
export function sub(pts, a, b) {
  if (a <= 0 && b >= 1) return pts;
  const L = length(pts), A = a * L, B = b * L, out = []; let d = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], s = Math.hypot(bx - ax, by - ay) || 1e-6;
    if (d + s >= A && d <= B) {
      if (!out.length) { const u = clamp((A - d) / s); out.push([ax + (bx - ax) * u, ay + (by - ay) * u]); }
      if (d + s > B) { const u = clamp((B - d) / s); out.push([ax + (bx - ax) * u, ay + (by - ay) * u]); return out; }
      out.push([bx, by]);
    }
    d += s;
  }
  return out;
}
export function trace(ctx, pts, closed = false) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (closed) ctx.closePath(); }

// ── wobble: push a polyline sideways by smooth noise; amp in stage px ──
function wobbled(pts, amp, seed, freq = .03) {
  const out = []; let d = 0;
  const gx = (hash(seed, 11) - .5) * amp * .9, gy = (hash(seed, 12) - .5) * amp * .9;   // the whole stroke shifts a little too
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    if (i) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const o = n1(d * freq, seed) * amp + n1(d * freq * 4.3, seed + 5) * amp * .25;
    out.push([pts[i][0] - (b[1] - a[1]) / L * o + gx, pts[i][1] + (b[0] - a[0]) / L * o + gy]);
  }
  return out;
}
/** a tapered ribbon along pts, width w(u) */
function ribbon(ctx, P, wf) {
  const L = [], R = [], n = P.length;
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l, w = wf(i / (n - 1 || 1)) / 2;
    L.push([P[i][0] + nx * w, P[i][1] + ny * w]); R.push([P[i][0] - nx * w, P[i][1] - ny * w]);
  }
  ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); for (const p of L) ctx.lineTo(p[0], p[1]); for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]); ctx.closePath(); ctx.fill();
}

/**
 * line(ctx, pts, o) — one pencil stroke. o: { w (2.4), col (pen.ink), a (.92), wob (pen.wob), over (overshoot px, 7),
 *   passes (2: a firm line + a lighter one a hair off it), smooth (true: Catmull-Rom through pts), k (0…1 drawn), taper (1),
 *   still (true: does not boil — fills, distant detail), seed (extra) }
 */
export function line(ctx, pts, o = {}) {
  const k = take() * (o.k ?? 1);
  if (k <= 0 || !pts || pts.length < 2) return;
  const seed0 = (pen.n++) * 131 + (o.seed || 0) * 977 + pen.seed * 7, seed = o.still ? seed0 : seed0 + Math.round(pen.boil * pen.boilAmp) * 15485863;
  let P = o.smooth === false || pts.length < 3 ? pts : curve(pts, 5, o.closed);
  if (o.closed) { const n = P.length, m = Math.max(2, Math.round(n * (.06 + hash(seed, 3) * .08))); P = [...P, ...P.slice(0, m)]; }  // overlap past the start
  P = resample(P, 5);
  const over = o.over ?? 7;
  if (over && P.length > 2) {                       // overshoot both ends along their tangents, a different amount each end
    const e = (i, j, f) => { const [ax, ay] = P[i], [bx, by] = P[j], l = Math.hypot(ax - bx, ay - by) || 1; return [ax + (ax - bx) / l * f, ay + (ay - by) / l * f]; };
    P.unshift(e(0, 2, over * (.3 + hash(seed, 1)))); P.push(e(P.length - 1, P.length - 3, over * (.3 + hash(seed, 2))));
  }
  const wob = o.wob ?? pen.wob, w = o.w ?? pen.w, col = o.col || pen.ink, a = o.a ?? .92, taper = o.taper ?? 1;
  ctx.save(); ctx.fillStyle = col;
  const passes = o.passes ?? 2;
  for (let p = 0; p < passes; p++) {
    let Q = wobbled(P, wob * (p ? 1.5 : 1), seed + p * 17);
    const a0 = p ? .05 + hash(seed, 7) * .12 : 0, b0 = p ? .85 + hash(seed, 8) * .15 : 1;
    Q = sub(Q, a0, a0 + (b0 - a0) * k);
    if (Q.length < 2) continue;
    const ww = w * (p ? .55 : 1);
    ctx.globalAlpha = a * (p ? .42 : 1) * (.85 + hash(seed, 9 + p) * .15);
    ribbon(ctx, Q, u => ww * (1 - taper + taper * (.3 + .7 * Math.min(1, u / .14, (1 - u) / .2 + .15))) * (.82 + .3 * n1(u * 6, seed + p)));
  }
  ctx.restore();
}
/** a closed pencil outline that overlaps its start */
export const loop = (ctx, pts, o = {}) => line(ctx, pts, { ...o, closed: true });
/** several short strokes (detail lines: folds, hair strands, windows) — one budget unit for the lot */
export function strokes(ctx, list, o = {}) {
  const k = take() * (o.k ?? 1); if (k <= 0) return;
  const sb = pen.budget, su = pen.used; pen.budget = Infinity;
  for (let i = 0; i < list.length; i++) if (i / list.length < k) line(ctx, list[i], { passes: 1, over: 3, w: (o.w ?? pen.w) * .7, ...o, k: 1 });
  pen.budget = sb; pen.used = su;
}

/** smooth, softly wobbled closed path (for fills) */
function blobPath(ctx, pts, amp, seed, smooth = true) {
  const P = wobbled(resample(smooth && pts.length > 2 ? curve(pts, 5, true) : [...pts, pts[0]], 9), amp, seed, .02);
  trace(ctx, P, true);
}
/**
 * fill(ctx, pts, col, o) — flat colour with a rough edge, shifted off its outline (o.off = [dx, dy], default pen.misreg turned
 * by the shape's seed), a touch smaller or larger (o.grow px). o.a alpha, o.tex (0…1): dry marker streaks inside, o.angle.
 */
export function fill(ctx, pts, col, o = {}) {
  const k = take(); if (k <= 0 || !col) return;
  const seed = (pen.n++) * 131 + (o.seed || 0) * 977 + pen.seed * 7;
  const ang = hash(seed, 4) * TAU, m = o.off || [Math.cos(ang) * pen.misreg[0], Math.sin(ang) * pen.misreg[1]];
  ctx.save(); ctx.globalAlpha *= (o.a ?? 1) * k; ctx.fillStyle = col;
  let P = pts;
  if (o.grow) { const [x0, y0, x1, y1] = bbox(pts), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, s = 1 + o.grow / Math.max(20, (x1 - x0 + y1 - y0) / 2); P = scalePts(pts, s, s, cx, cy); }
  ctx.translate(m[0], m[1]); blobPath(ctx, P, o.wob ?? 2.2, seed, o.smooth !== false); ctx.fill();
  if (o.tex) {                                       // dry marker strokes: lighter and darker streaks along one direction
    ctx.clip(); const [x0, y0, x1, y1] = bbox(P), r = rng(seed), A = o.angle ?? -.35, c = Math.cos(A), s = Math.sin(A), D = Math.hypot(x1 - x0, y1 - y0) / 2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    for (let d = -D; d < D; d += 7 + r() * 9) {
      ctx.globalAlpha = (o.a ?? 1) * o.tex * (.08 + r() * .14); ctx.fillStyle = r() < .5 ? tone(col, .3) : tone(col, -.25);
      const len = D * (.4 + r() * 1.2), px = cx - s * d + c * (r() - .5) * D, py = cy + c * d + s * (r() - .5) * D, wd = 3 + r() * 8;
      ctx.beginPath(); ctx.moveTo(px - c * len / 2 - s * wd, py - s * len / 2 + c * wd); ctx.lineTo(px + c * len / 2 - s * wd * .4, py + s * len / 2 + c * wd * .4);
      ctx.lineTo(px + c * len / 2 + s * wd * .4, py + s * len / 2 - c * wd * .4); ctx.lineTo(px - c * len / 2 + s * wd, py - s * len / 2 - c * wd); ctx.fill();
    }
  }
  ctx.restore();
}
/**
 * shadeSide(ctx, pts, col, dx, dy) — a flat shadow inside the shape: the part of the shape NOT covered by the shape moved by
 * (dx, dy) toward the light. One light for the whole film (pen.light); pass a shadow colour (tone(fill, -.25)).
 */
export function shadeSide(ctx, pts, col, dx, dy, o = {}) {
  const k = take(); if (k <= 0 || !col) return;
  const seed = (pen.n++) * 131 + pen.seed * 7;
  ctx.save(); ctx.globalAlpha *= (o.a ?? .9) * k;
  blobPath(ctx, pts, 1.6, seed, !o.sharp); ctx.clip();
  const [x0, y0, x1, y1] = bbox(pts);
  ctx.beginPath(); ctx.rect(x0 - 50, y0 - 50, x1 - x0 + 100, y1 - y0 + 100);
  const Q = move(pts, dx, dy), P = wobbled(resample(o.sharp ? [...Q, Q[0]] : curve(Q, 5, true), 9), 2.5, seed + 3, .02);
  ctx.moveTo(P[0][0], P[0][1]); for (const p of P) ctx.lineTo(p[0], p[1]); ctx.closePath();
  ctx.fillStyle = col; ctx.fill('evenodd'); ctx.restore();
}
/**
 * shape(ctx, pts, o) — the unit of every drawing: fill (misregistered) + shadow side + pencil outline.
 * o: { fill, shade (shadow colour; or true = tone(fill, -.22)), light: [dx, dy] (shade offset, pen.light), line: false | {w, col…},
 *      tex, a, open: [a, b] (leave the outline open between fractions a…b: the unfinished gap), grow, sharp (corners stay corners:
 *      buildings, roofs, paper — default is a smooth curve through the points, for bodies) }
 */
export function shape(ctx, pts, o = {}) {
  if (o.fill) fill(ctx, pts, o.fill, { tex: o.tex, a: o.a, grow: o.grow, off: o.off, seed: o.seed, angle: o.angle, smooth: !o.sharp });
  if (o.shade && o.fill) { const L = o.light || pen.light; shadeSide(ctx, pts, o.shade === true ? tone(o.fill, -.22) : o.shade, L[0], L[1], { sharp: o.sharp }); }
  if (o.line !== false) {
    const lo = typeof o.line === 'object' ? o.line : {};
    if (o.open) { const P = o.sharp ? resample([...pts, pts[0]], 12) : curve(pts, 5, true), Q = [...P, P[0]], n = Q.length; line(ctx, [...Q.slice(Math.floor(n * o.open[1])), ...Q.slice(0, Math.floor(n * o.open[0]) + 1)], { w: o.w, ...lo, smooth: false }); }
    else if (o.sharp) line(ctx, [...pts, pts[0], pts[1]], { w: o.w, ...lo, smooth: false, over: lo.over ?? 9 });
    else loop(ctx, pts, { w: o.w, ...lo });
  }
}
pen.light = [-10, -8];    // the shade is cut where the shape, moved by this much, still covers it: light from upper left by default

/** loose parallel pencil strokes inside a polygon. o: { angle, gap, w, col, a, len (0…1 of the shape's span), cross } */
export function hatch(ctx, pts, o = {}) {
  const k = take(); if (k <= 0) return;
  const seed = (pen.n++) * 131 + (o.seed || 0) * 977 + pen.seed * 7 + Math.round(pen.boil * pen.boilAmp) * 15485863 * (o.still ? 0 : 1);
  const [x0, y0, x1, y1] = bbox(pts), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4, r = rng(seed);
  ctx.save(); trace(ctx, o.sharp ? pts : curve(pts, 4, true), true); ctx.clip();
  ctx.strokeStyle = o.col || pen.ink; ctx.lineCap = 'round';
  const angs = o.cross ? [o.angle ?? -.9, (o.angle ?? -.9) + 1.3] : [o.angle ?? -.9];
  for (const A of angs) {
    const c = Math.cos(A), s = Math.sin(A);
    for (let d = -R; d < R * k * 2 - R; d += (o.gap ?? 7) * (.7 + r() * .6)) {
      const len = R * (o.len ?? 1) * (.7 + r() * .5), j = (r() - .5) * R * .3, px = cx - s * d + c * j, py = cy + c * d + s * j;
      ctx.globalAlpha = (o.a ?? .5) * (.5 + r() * .5); ctx.lineWidth = (o.w ?? 1.4) * (.6 + r() * .7);
      ctx.beginPath(); ctx.moveTo(px - c * len, py - s * len); ctx.quadraticCurveTo(px + (r() - .5) * 6, py + (r() - .5) * 6, px + c * len, py + s * len); ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * scribble(ctx, cx, cy, rx, ry, o) — a dense pencil scribble: many overlapping loops, darker toward the middle, stray loops
 * past the edge. It boils (new loops every boil frame) — the living-scribble look. o: { col, n (loops, 60), w, a, core (fill
 * colour underneath, or null), stray (0…1), squash, swirl (rotation of the loop direction), k (0…1 drawn) }
 */
export function scribble(ctx, cx, cy, rx, ry, o = {}) {
  const k = take() * (o.k ?? 1); if (k <= 0) return;
  const seed = (pen.n++) * 131 + (o.seed || 0) * 977 + pen.seed * 7 + (o.still ? 0 : Math.round(pen.boil * pen.boilAmp) * 15485863), r = rng(seed);
  const col = o.col || '#1d1e1c';
  ctx.save();
  if (o.core) { ctx.fillStyle = o.core; ctx.globalAlpha = (o.coreA ?? 1) * k; trace(ctx, wobbled(resample(ellipse(cx, cy, rx * .86, ry * .86, 24), 12), Math.min(rx, ry) * .06, seed, .01), true); ctx.fill(); }
  ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const n = Math.max(1, Math.round((o.n ?? 60) * k)), stray = o.stray ?? .35;
  ctx.beginPath();
  let x = cx, y = cy;
  for (let i = 0; i < n; i++) {
    const rr = Math.sqrt(r()) * (r() < stray * .25 ? 1.25 : 1), ang = r() * TAU;
    const lx = cx + Math.cos(ang) * rx * rr * .8, ly = cy + Math.sin(ang) * ry * rr * .8;   // loop centre
    const lr = (.12 + r() * .35) * Math.min(rx, ry), dir = r() < .5 ? 1 : -1, a0 = r() * TAU, sq = o.squash ?? (.5 + r() * .5);
    for (let j = 0; j <= 10; j++) {
      const a = a0 + dir * j / 10 * TAU * (1.1 + r() * .3) + (o.swirl || 0);
      x = lx + Math.cos(a) * lr; y = ly + Math.sin(a) * lr * sq;
      if (i === 0 && j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }
  ctx.globalAlpha = (o.a ?? .85); ctx.lineWidth = o.w ?? 2.2; ctx.stroke();
  ctx.restore();
}

/** a soft wash: a colour cloud with a rough edge (backgrounds that fade out unfinished at the edges) */
export function wash(ctx, pts, col, o = {}) {
  const k = take(); if (k <= 0) return;
  const seed = (pen.n++) * 131 + (o.seed || 0) * 977 + pen.seed * 7;
  ctx.save(); ctx.globalAlpha *= (o.a ?? .7) * k; ctx.fillStyle = col; ctx.filter = `blur(${o.blur ?? 2}px)`;
  blobPath(ctx, pts, o.wob ?? 8, seed); ctx.fill(); ctx.restore();
}

/** toned paper: base tone, large soft mottling, fibres, a few specks — paint it once into a plate */
export function paper(ctx, w, h, o = {}) {
  const t = o.tone || '#b9bb98', r = rng(o.seed || 3);
  ctx.save(); ctx.fillStyle = t; ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w * .5, h * .45, h * .1, w * .5, h * .5, Math.hypot(w, h) * .6);
  g.addColorStop(0, rgba(tone(t, .25), .55)); g.addColorStop(1, rgba(tone(t, -.15), .5)); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) { const x = r() * w, y = r() * h, R = 80 + r() * 260; const q = ctx.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, rgba(r() < .5 ? tone(t, .3) : tone(t, -.2), .1 + r() * .1)); q.addColorStop(1, rgba(t, 0)); ctx.fillStyle = q; ctx.fillRect(x - R, y - R, R * 2, R * 2); }
  ctx.lineCap = 'round';
  for (let i = 0; i < (o.fibres ?? w * h / 900); i++) { const x = r() * w, y = r() * h, a = r() * TAU, l = 3 + r() * 14; ctx.strokeStyle = rgba(r() < .5 ? '#ffffff' : '#3a3b30', .05 + r() * .07); ctx.lineWidth = .6 + r(); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a + .5) * l / 2, y + Math.sin(a + .5) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke(); }
  for (let i = 0; i < w * h / 6000; i++) { ctx.fillStyle = rgba('#3a3b30', .08 + r() * .12); ctx.fillRect(r() * w, r() * h, 1 + r() * 1.6, 1 + r() * 1.6); }
  ctx.restore();
}

/** stray construction marks: a few faint loose lines and ticks around a point (under-drawing that was never erased) */
export function construction(ctx, cx, cy, R, o = {}) {
  const k = take(); if (k <= 0) return;
  const r = rng((pen.n++) * 131 + (o.seed || 0) * 977 + pen.seed * 7);
  ctx.save(); ctx.strokeStyle = o.col || pen.ink; ctx.lineCap = 'round';
  for (let i = 0; i < (o.n ?? 5); i++) {
    const a = r() * TAU, d = R * (.6 + r() * .6), l = R * (.15 + r() * .5), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, b = a + Math.PI / 2 + (r() - .5);
    ctx.globalAlpha = (o.a ?? .22) * (.5 + r() * .5); ctx.lineWidth = 1 + r();
    ctx.beginPath(); ctx.moveTo(x - Math.cos(b) * l, y - Math.sin(b) * l); ctx.quadraticCurveTo(x + (r() - .5) * l * .4, y + (r() - .5) * l * .4, x + Math.cos(b) * l, y + Math.sin(b) * l); ctx.stroke();
  }
  ctx.restore();
}

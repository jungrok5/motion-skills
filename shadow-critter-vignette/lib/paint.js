// shadow-critter-vignette · paint.js — the media, as code on a Canvas 2D context (the brush set is storybook-short's, plus watercolour wash, pen and light).
// Every mark is made of many small strokes so it reads as a hand with a brush or a pencil, never as a vector fill:
//   gouache  — opaque, matte, slightly mottled, darker at the drying edge, cut-paper edge (skin, sclera, nose, ears, props)
//   dryBrush — a loaded flat brush dragged along a curve: separate bristles, streaks of colour, breaks where paint runs out (hair)
//   crayon   — coloured-pencil / wax-crayon hatching clipped to a shape, with paper tooth knocked out of it (clothes, patterns)
//   ink      — a thin wobbling contour of varying weight that can overshoot or break (outlines, features, flyaway hairs)
//   blush    — soft pigment rubbed in with a few pencil scribbles on top (cheeks, nose tip, knees)
// All randomness comes from rng(seed); nothing here calls Math.random, so the same seed draws the same picture.

// ── numbers ──
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const hash = (...v) => { let h = 2166136261; for (const x of v) { h ^= Math.floor(x * 1000) | 0; h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => t * t * (3 - 2 * t);
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
export function noise1(x, seed = 0) { const i = Math.floor(x), f = x - i; return lerp(hash(i, seed), hash(i + 1, seed), fade(f)) * 2 - 1; }
export function noise2(x, y, seed = 0) {
  const i = Math.floor(x), j = Math.floor(y), u = fade(x - i), v = fade(y - j);
  return lerp(lerp(hash(i, j, seed), hash(i + 1, j, seed), u), lerp(hash(i, j + 1, seed), hash(i + 1, j + 1, seed), u), v) * 2 - 1;
}

// ── colour ──
export function rgb(c) {
  if (Array.isArray(c)) return c;
  const h = c.replace('#', ''); const n = parseInt(h.length === 3 ? h.replace(/./g, m => m + m) : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const css = (c, a = 1) => { const [r, g, b] = rgb(c); return a >= 1 ? `rgb(${r | 0},${g | 0},${b | 0})` : `rgba(${r | 0},${g | 0},${b | 0},${a})`; };
export const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return [lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)]; };
// darken towards a deeper, slightly violet version of itself (never greyer), lighten towards paper
export const shade = (c, k) => { if (k >= 0) return mix(c, [255, 252, 246], k); const [r, g, b] = rgb(c), d = 1 + k * .8; return [r * d * (1 + k * .1), g * d * (1 + k * .25), b * d]; };
/** the same colour, a little off: what a brush picks up from a palette that is never quite clean */
export function jitter(c, r, amt = .06) { const [a, b, d] = rgb(c), k = 1 + (r() - .5) * amt * 2, t = (r() - .5) * amt * 40; return [clamp(a * k + t, 0, 255), clamp(b * k + t * .6, 0, 255), clamp(d * k - t * .4, 0, 255)]; }
export function pick(list, r) { // [[colour, weight], …] or [colour, …]
  if (!Array.isArray(list[0]) || typeof list[0][1] !== 'number' || list[0].length !== 2) return list[Math.floor(r() * list.length)];
  let s = 0; for (const [, w] of list) s += w; let x = r() * s; for (const [c, w] of list) { if ((x -= w) <= 0) return c; } return list[0][0];
}

// ── canvases ──
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }

// ── geometry ──
/** Catmull–Rom through the points, sampled every `step` px (open curve) */
export function spline(pts, step = 3, closed = false) {
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  const out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  if (!closed) out.push(pts[pts.length - 1]);
  return out;
}
export function bezier(p0, p1, p2, p3, n = 40) {
  const out = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); }
  return out;
}
export function ellipse(cx, cy, rx, ry, n = 48, rot = 0) {
  const out = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return out;
}
export function bounds(pts, pad = 0) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}
export const union = (...bb) => [Math.min(...bb.map(b => b[0])), Math.min(...bb.map(b => b[1])), Math.max(...bb.map(b => b[2])), Math.max(...bb.map(b => b[3]))];
/** resample a polyline / polygon to points `step` px apart */
export function resample(pts, step = 3, closed = false) {
  const P = closed ? [...pts, pts[0]] : pts, out = [P[0]]; let carry = 0;
  for (let i = 1; i < P.length; i++) {
    const [ax, ay] = P[i - 1], [bx, by] = P[i], L = Math.hypot(bx - ax, by - ay); let d = step - carry;
    while (d <= L) { out.push([ax + (bx - ax) * d / L, ay + (by - ay) * d / L]); d += step; }
    carry = L - (d - step);
  }
  if (!closed && out.length > 1) { const l = P[P.length - 1], o = out[out.length - 1]; if (Math.hypot(l[0] - o[0], l[1] - o[1]) > step * .3) out.push(l); }
  return out;
}
/** a hand-cut edge: every point pushed in or out along the normal by a slow wobble and a little grit */
export function rough(pts, amp = 1.2, seed = 1, step = 4, closed = true) {
  const P = resample(pts, step, closed), n = P.length, r = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n], b = P[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const k = amp * (noise1(i * step / 26, seed) * .8 + (r() - .5) * .5);
    out.push([P[i][0] - dy / L * k, P[i][1] + dx / L * k]);
  }
  return out;
}
export function path(ctx, pts, closed = true) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (closed) ctx.closePath(); }
export function area(pts) { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s / 2); }

// ── paper tooth ──
// Three tiling grain masks (fine, medium, coarse). `tooth(ctx, bbox, amt)` knocks paper out of whatever was just painted,
// the way dry pigment skips the valleys of the sheet. Used lightly on gouache, hard on crayon.
let GRAIN = null;
function grains() {
  if (GRAIN) return GRAIN;
  GRAIN = [[.62, 1.0], [.55, 1.6], [.5, 2.6]].map(([th, sc], gi) => {
    const N = 256, c = canvas(N, N), g = c.getContext('2d'), im = g.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      // tileable: noise sampled on a torus-ish wrap by mixing the four wrapped samples
      const fx = x / N, fy = y / N, s = (u, v) => noise2(u * 64 / sc, v * 64 / sc, 11 + gi) * .55 + noise2(u * 256 / sc, v * 256 / sc, 23 + gi) * .45;
      const v = s(fx, fy) * (1 - fx) * (1 - fy) + s(fx - 1, fy) * fx * (1 - fy) + s(fx, fy - 1) * (1 - fx) * fy + s(fx - 1, fy - 1) * fx * fy;
      const grit = hash(x, y, gi) - .5;
      const a = clamp(((v * .5 + .5 + grit * .35) - th) * 5);
      const i = (y * N + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 0; im.data[i + 3] = a * 255;
    }
    g.putImageData(im, 0, 0); return c;
  });
  return GRAIN;
}
export function tooth(ctx, bb, amt = .5, level = 1, seed = 1) {
  if (amt <= 0) return;
  const g = grains()[clamp(level, 0, 2) | 0], p = ctx.createPattern(g, 'repeat'), r = rng(seed);
  ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = clamp(amt);
  p.setTransform(new DOMMatrix().translate(Math.floor(r() * 256), Math.floor(r() * 256)));
  ctx.fillStyle = p; ctx.fillRect(bb[0] - 2, bb[1] - 2, bb[2] - bb[0] + 4, bb[3] - bb[1] + 4); ctx.restore();
}

/** the sheet: warm white with a faint cloud of tone and fibre */
export function paper(w, h, color = '#fbf8f2', seed = 3, scale = 1) {
  const c = canvas(w * scale, h * scale), g = c.getContext('2d'), im = g.createImageData(c.width, c.height), [R, G, B] = rgb(color);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const X = x / scale, Y = y / scale;
    const cloud = noise2(X / 260, Y / 260, seed) * 3.2 + noise2(X / 70, Y / 70, seed + 1) * 1.3;
    const fibre = noise2(X / 1.6, Y / 9, seed + 2) * 1.6 + (hash(x, y, seed) - .5) * 3.2;
    const v = cloud + fibre, i = (y * c.width + x) * 4;
    im.data[i] = R + v; im.data[i + 1] = G + v; im.data[i + 2] = B + v * 1.15; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0); return c;
}

// ── media ──
/**
 * gouache(ctx, poly, o) — opaque matte paint filling a shape.
 * o: color, seed, dir (radians, the brush direction), mottle (0..1 strength of the brush-mark texture), edge (0..1 darker
 * drying edge), roughness (px), tooth (0..1 dry knock-out), light ([x,y,k]: a soft lighter side), shadow ([x,y,k])
 */
export function gouache(ctx, poly, o = {}) {
  const r = rng(o.seed || 1), col = o.color || '#e0b0a0', P = o.roughness === 0 ? poly : rough(poly, o.roughness ?? 1.3, o.seed || 1);
  const bb = bounds(P), w = bb[2] - bb[0], h = bb[3] - bb[1], dir = o.dir ?? -0.3, mottle = o.mottle ?? .6;
  ctx.save();
  path(ctx, P); ctx.fillStyle = css(jitter(col, r, .015)); ctx.fill();
  path(ctx, P); ctx.clip();
  // brush marks: broad, low alpha, slightly different mixes of the same colour, laid in one direction with a little drift
  const n = Math.round(w * h / 1100 * mottle) + 4, cx = Math.cos(dir), sy = Math.sin(dir);
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = bb[0] + r() * w, y = bb[1] + r() * h, L = 20 + r() * 50 * (o.long || 1), wd = 6 + r() * 16, d2 = noise1(x / 90 + y / 140, 5) * .5;
    const c2 = Math.cos(dir + d2), s2 = Math.sin(dir + d2);
    ctx.strokeStyle = css(jitter(r() < .5 ? shade(col, -.06) : shade(col, .07), r, .03), .09 + r() * .12);
    ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(x - c2 * L / 2, y - s2 * L / 2);
    ctx.quadraticCurveTo(x + sy * 4, y - cx * 4, x + c2 * L / 2, y + s2 * L / 2); ctx.stroke();
  }
  if (o.shadow) { const [sx, sy2, k, rr] = o.shadow; const g = ctx.createRadialGradient(sx, sy2, 0, sx, sy2, rr || Math.max(w, h) * .7); g.addColorStop(0, css(shade(col, -.35), k)); g.addColorStop(1, css(shade(col, -.35), 0)); ctx.fillStyle = g; ctx.fillRect(bb[0], bb[1], w, h); }
  if (o.light) { const [lx, ly, k, rr] = o.light; const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, rr || Math.max(w, h) * .6); g.addColorStop(0, css(shade(col, .5), k)); g.addColorStop(1, css(shade(col, .5), 0)); ctx.fillStyle = g; ctx.fillRect(bb[0], bb[1], w, h); }
  // the drying edge: pigment collects at the rim
  const edge = o.edge ?? .35;
  if (edge > 0) { path(ctx, P); ctx.lineWidth = 4 + r() * 2; ctx.strokeStyle = css(shade(col, -.14), edge * .5); ctx.stroke(); path(ctx, P); ctx.lineWidth = 1.4; ctx.strokeStyle = css(shade(col, -.2), edge * .5); ctx.stroke(); }
  ctx.restore();
  if (o.tooth) tooth(ctx, bb, o.tooth, 0, (o.seed || 1) + 7);
  return bb;
}

/**
 * dryBrush(ctx, pts, o) — one drag of a flat brush along a curve.
 * o: width, colors ([[hex, weight], …] picked per bristle), bristles, load (0..1: how far the paint lasts), alpha,
 * taper ([start, end] fractions that narrow), seed, lw ([min, max] bristle width)
 */
export function dryBrush(ctx, pts, o = {}) {
  const r = rng(o.seed || 1), C = resample(spline(pts, 3), 2.5), n = C.length;
  if (n < 3) return bounds(pts, o.width || 10);
  const W = o.width || 20, B = o.bristles || Math.max(5, Math.round(W / 1.6)), load = o.load ?? .7, A = o.alpha ?? .85;
  const [t0, t1] = o.taper || [.15, .3], lw = o.lw || [.9, 2.4], colors = o.colors || [['#151519', 1]];
  const N = C.map((p, i) => { const a = C[Math.max(0, i - 2)], b = C[Math.min(n - 1, i + 2)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [-dy / L, dx / L]; });
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let k = 0; k < B; k++) {
    const off = ((k + .5) / B - .5) * W + (r() - .5) * W / B, ph = r() * 1000, col = jitter(pick(colors, r), r, .05);
    const s0 = r() * .08, s1 = 1 - r() * (1 - load) * .7, w = lw[0] + r() * (lw[1] - lw[0]);
    ctx.strokeStyle = css(col, A * (.55 + .45 * r())); ctx.lineWidth = w;
    let open = false; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const s = i / (n - 1);
      const taper = Math.min(s < t0 ? smooth(s / t0) : 1, s > 1 - t1 ? smooth((1 - s) / t1) : 1);
      // paint runs out: breaks get likelier towards the end of the drag and on the outer bristles
      const dryness = (1 - load) * (.35 + s * .9) + Math.abs(off) / W * .25;
      const on = s >= s0 && s <= s1 && noise1(ph + i * (o.grain ?? .045)) * .5 + .5 > dryness;
      if (!on) { open = false; continue; }
      const o2 = off * (.25 + .75 * taper), x = C[i][0] + N[i][0] * o2, y = C[i][1] + N[i][1] * o2;
      if (!open) { ctx.moveTo(x, y); open = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  return bounds(C, W);
}

/**
 * crayon(ctx, poly, o) — coloured-pencil / crayon hatching clipped to a shape, then paper tooth knocked out.
 * o: color (or colors list), angle, gap (px between strokes), width, alpha, wobble, cross (0..1 second direction),
 * tooth (0..1), roughness, seed, scribble (0..1 zig-zag), under (fill this colour first at low alpha so gaps are tinted)
 */
export function crayon(ctx, poly, o = {}) {
  const r = rng(o.seed || 1), P = o.roughness === 0 ? poly : rough(poly, o.roughness ?? 1.6, (o.seed || 1) + 3);
  const bb = bounds(P), cols = o.colors || [o.color || '#e8c040'], gap = o.gap || 3.2, wd = o.width || 2.2, A = o.alpha ?? .75;
  ctx.save(); path(ctx, P); ctx.clip();
  if (o.under !== false) { ctx.fillStyle = css(o.under || cols[0], o.underAlpha ?? .55); ctx.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]); }
  ctx.lineCap = 'round';
  const pass = (ang, alpha) => {
    const c = Math.cos(ang), s = Math.sin(ang), cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2, R = Math.hypot(bb[2] - bb[0], bb[3] - bb[1]) / 2 + 4;
    for (let d = -R; d < R; d += gap * (.7 + r() * .6)) {
      // a stroke is a run of short marks: the hand lifts, presses, changes colour a little
      let t = -R + r() * 10;
      while (t < R) {
        const L = 18 + r() * 60, pr = .5 + r() * .5;
        const x0 = cx + c * t - s * d, y0 = cy + s * t + c * d, x1 = cx + c * (t + L) - s * d, y1 = cy + s * (t + L) + c * d;
        const wb = (o.wobble ?? 1.2), mx = (x0 + x1) / 2 + (r() - .5) * wb * 2 - s * (o.scribble ? (r() - .5) * gap * 3 * o.scribble : 0), my = (y0 + y1) / 2 + (r() - .5) * wb * 2;
        ctx.strokeStyle = css(jitter(pick(cols, r), r, .05), alpha * pr); ctx.lineWidth = wd * (.7 + r() * .6);
        ctx.beginPath(); ctx.moveTo(x0 + (r() - .5) * wb, y0 + (r() - .5) * wb); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
        t += L + r() * 5;
      }
    }
  };
  pass(o.angle ?? -0.9, A);
  if (o.cross) pass((o.angle ?? -0.9) + 1.1 + (r() - .5) * .3, A * o.cross);
  ctx.restore();
  tooth(ctx, bb, o.tooth ?? .55, o.grain ?? 1, (o.seed || 1) + 11);
  return bb;
}

/**
 * ink(ctx, pts, o) — a thin contour with a hand's wobble and weight.
 * o: width, color, alpha, wobble (px), taper ([start, end] 0..1), weight (fn s → 0..1 multiplier), passes (1–2), seed,
 * smooth (true: spline through pts)
 */
export function ink(ctx, pts, o = {}) {
  const r = rng(o.seed || 1), W = o.width || 2, col = o.color || '#231d22', A = o.alpha ?? .92;
  // a corner (a turn sharper than ~55°) is drawn as a corner: a spline through it would overshoot into a loop
  const sharp = pts.some((p, i) => { if (i === 0 || i === pts.length - 1) return false; const a = pts[i - 1], b = pts[i + 1], u = [p[0] - a[0], p[1] - a[1]], v = [b[0] - p[0], b[1] - p[1]], d = Math.hypot(...u) * Math.hypot(...v); return d > 0 && (u[0] * v[0] + u[1] * v[1]) / d < .57; });
  const base = resample(o.smooth === false || (o.smooth == null && sharp) ? pts : spline(pts, 3), 2);
  const n = base.length; if (n < 2) return bounds(pts, W);
  const [ta, tb] = o.taper || [.2, .25];
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let p = 0; p < (o.passes || 1); p++) {
    const ph = r() * 100, wob = (o.wobble ?? .8) * (p ? 1.6 : 1), off = p ? (r() - .5) * W * 1.2 : 0;
    let prev = null;
    for (let i = 0; i < n; i++) {
      const s = i / (n - 1), a = base[Math.max(0, i - 1)], b = base[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      const k = noise1(ph + i * .06) * wob + off, x = base[i][0] - dy / L * k, y = base[i][1] + dx / L * k;
      const t = Math.min(ta ? smooth(clamp(s / ta)) : 1, tb ? smooth(clamp((1 - s) / tb)) : 1);
      const w = W * (.35 + .65 * t) * (o.weight ? o.weight(s) : 1) * (.85 + .3 * (noise1(ph + 50 + i * .09) * .5 + .5));
      if (prev) { ctx.strokeStyle = css(col, A * (p ? .45 : 1)); ctx.lineWidth = Math.max(.4, w); ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(x, y); ctx.stroke(); }
      prev = [x, y];
    }
  }
  ctx.restore();
  return bounds(base, W * 2);
}

/** blush(ctx, cx, cy, rx, ry, o) — pigment rubbed in with a finger, then a few pencil strokes on top */
export function blush(ctx, cx, cy, rx, ry, o = {}) {
  const r = rng(o.seed || 1), col = o.color || '#ee8a8e', k = o.strength ?? 1;
  ctx.save();
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, css(col, .55 * k)); g.addColorStop(.55, css(col, .3 * k)); g.addColorStop(1, css(col, 0));
  ctx.save(); ctx.translate(cx, cy); ctx.scale(rx, ry); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * .75, x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d, rr = (rx + ry) * (.12 + r() * .18);
    const gg = ctx.createRadialGradient(x, y, 0, x, y, rr); gg.addColorStop(0, css(jitter(col, r, .05), .09 * k)); gg.addColorStop(1, css(col, 0));
    ctx.fillStyle = gg; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  // pencil on top: short diagonal strokes in a deeper red, the tooth showing
  ctx.lineCap = 'round';
  const m = Math.round((o.scribbles ?? 14) * k);
  for (let i = 0; i < m; i++) {
    const x = cx + (r() - .5) * rx * 1.1, y = cy + (r() - .5) * ry * 1.0, L = (rx + ry) * (.15 + r() * .2);
    ctx.strokeStyle = css(shade(col, -.12), .22 + r() * .2); ctx.lineWidth = 1 + r() * 1.2;
    ctx.beginPath(); ctx.moveTo(x - L * .7, y + L * .5); ctx.lineTo(x + L * .7, y - L * .5); ctx.stroke();
  }
  ctx.restore();
  const bb = [cx - rx, cy - ry, cx + rx, cy + ry];
  tooth(ctx, bb, o.tooth ?? .35, 1, (o.seed || 1) + 5);
  return bb;
}

/** dabs(ctx, pts, o) — small round brush touches (spots, polka dots, pollen, freckles) */
export function dabs(ctx, pts, o = {}) {
  const r = rng(o.seed || 1), cols = o.colors || [o.color || '#333'], R = o.r || 4;
  ctx.save();
  for (const [x, y, s = 1] of pts) {
    const rr = R * s * (.8 + r() * .4), poly = ellipse(x, y, rr, rr * (.8 + r() * .35), 14, r() * 3);
    path(ctx, rough(poly, rr * .12, Math.floor(r() * 1e6), 2)); ctx.fillStyle = css(jitter(pick(cols, r), r, .05), o.alpha ?? .92); ctx.fill();
  }
  ctx.restore();
  return bounds(pts, R * 1.5);
}

// ── watercolour (added for shadow-critter-vignette) ──
/**
 * wash(ctx, poly, o) — transparent watercolour laid in a few passes: soft blotches of the same pigment, a darker wet edge
 * where the water dried, granulation where paper shows through. o: color, alpha (0..1 total), layers, rough (px), edge
 * (0..1), bloom (0..1 blotch strength), dir (brush direction), seed, tooth, light/shadow ([x, y, k, r]) like gouache
 */
export function wash(ctx, poly, o = {}) {
  const r = rng(o.seed || 1), col = o.color || '#c9a77a', A = o.alpha ?? .9, layers = o.layers ?? 3;
  const bb = bounds(poly), w = bb[2] - bb[0], h = bb[3] - bb[1];
  ctx.save();
  for (let l = 0; l < layers; l++) { path(ctx, rough(poly, o.rough ?? 2, (o.seed || 1) + l * 17, 5)); ctx.fillStyle = css(jitter(col, r, .04), Math.min(1, A / layers * 1.35)); ctx.fill(); }
  path(ctx, poly); ctx.clip();
  const n = Math.round(w * h / 2600 * (o.bloom ?? .7)) + 3;
  for (let i = 0; i < n; i++) {
    const x = bb[0] + r() * w, y = bb[1] + r() * h, rr = 12 + r() * Math.min(140, Math.max(w, h) * .35), c2 = r() < .55 ? shade(col, -.18) : shade(col, .16);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, css(c2, .07 + r() * .1)); g.addColorStop(1, css(c2, 0)); ctx.fillStyle = g; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  // brush streaks along one direction, very faint
  const dir = o.dir ?? 1.45, m = Math.round(w * h / 5000) + 2; ctx.lineCap = 'round';
  for (let i = 0; i < m; i++) { const x = bb[0] + r() * w, y = bb[1] + r() * h, L = 30 + r() * 90; ctx.strokeStyle = css(shade(col, r() < .5 ? -.12 : .1), .05 + r() * .06); ctx.lineWidth = 4 + r() * 10; ctx.beginPath(); ctx.moveTo(x - Math.cos(dir) * L / 2, y - Math.sin(dir) * L / 2); ctx.lineTo(x + Math.cos(dir) * L / 2, y + Math.sin(dir) * L / 2); ctx.stroke(); }
  if (o.shadow) { const [sx, sy, k, rr] = o.shadow; const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, rr || Math.max(w, h) * .7); g.addColorStop(0, css(shade(col, -.45), k)); g.addColorStop(1, css(shade(col, -.45), 0)); ctx.fillStyle = g; ctx.fillRect(bb[0], bb[1], w, h); }
  if (o.light) { const [lx, ly, k, rr] = o.light; const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, rr || Math.max(w, h) * .6); g.addColorStop(0, css(shade(col, .55), k)); g.addColorStop(1, css(shade(col, .55), 0)); ctx.fillStyle = g; ctx.fillRect(bb[0], bb[1], w, h); }
  ctx.restore();
  const edge = o.edge ?? .45;
  if (edge > 0) { ctx.save(); const P = rough(poly, (o.rough ?? 2) * .8, (o.seed || 1) + 5, 5); path(ctx, P); ctx.lineJoin = 'round'; ctx.strokeStyle = css(shade(col, -.3), edge * .35); ctx.lineWidth = 2.2; ctx.stroke(); ctx.strokeStyle = css(shade(col, -.2), edge * .12); ctx.lineWidth = 6; ctx.stroke(); ctx.restore(); }
  if (o.tooth !== 0) tooth(ctx, bb, o.tooth ?? .18, 1, (o.seed || 1) + 9);
  return bb;
}
/** pen(ctx, pts, o) — the sepia ink sketch line drawn over the washes (planks, frames, edges): thin, broken, a little loose */
export function pen(ctx, pts, o = {}) { return ink(ctx, pts, { width: o.width ?? 1.3, color: o.color || '#3b2a20', alpha: o.alpha ?? .55, wobble: o.wobble ?? .7, taper: o.taper || [.08, .12], seed: o.seed || 1, smooth: o.smooth ?? false, passes: o.passes || 1 }); }
/** glow(ctx, x, y, r, color, k) — light added on top (screen): window bloom, lamp, rim */
export function glow(ctx, x, y, rr, color = '#ffe2a0', k = .5, op = 'screen') {
  ctx.save(); ctx.globalCompositeOperation = op; const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
  g.addColorStop(0, css(color, k)); g.addColorStop(.45, css(color, k * .35)); g.addColorStop(1, css(color, 0)); ctx.fillStyle = g; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2); ctx.restore();
}
/** lerp between two points */
export const lp = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

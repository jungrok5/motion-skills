// painted-anime-short · paint.js — brushes and painters for a hand-painted anime-background look in Canvas 2D.
// Everything here draws in stage units (the film is 1920 × 1080 stage units; Film scales to the real canvas) and takes a
// seeded random function R = rng(seed), so the same call always paints the same strokes, at any size.
//   math:     rng, hash, noise2, fbm, clamp, lerp, smooth, ease, keys (monotone cubic through keyframes)
//   colour:   mix, rgba, vary, shade
//   brushes:  blob, dab, ribbon, curve, streak, scrub, spray, flower, sparkle, ink
//   painters: sky, cloud, cloudBank, clump, canopy, conifer, conifers, trunk, grass, fern, mist, rays, haze, weather
//   moving:   leaves, flock, motes (pure functions of t — call them inside a shot's draw)

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (a, b, v) => { const k = clamp((v - a) / (b - a)); return k * k * (3 - 2 * k); };
export const ease = {
  io: k => (k = clamp(k), k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  out: k => 1 - Math.pow(1 - clamp(k), 3),
  in: k => Math.pow(clamp(k), 3),
  sine: k => .5 - .5 * Math.cos(Math.PI * clamp(k)),
};

// mulberry32: rng(seed) → () => [0,1)
export function rng(seed = 1) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// integer hash → [0,1)
export function hash(a, b = 0, c = 0) {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35) ^ Math.imul((c | 0) + 0x1b873593, 0x27d4eb2f);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function noise2(x, y = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbm = (x, y = 0, o = 4) => { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * noise2(x * f + i * 17.3, y * f - i * 9.1); n += a; a *= .5; f *= 2.03; } return s / n; };

// keyframes [{t, x, y, …, e:'io'?}] → value of prop at t. Monotone cubic (Fritsch–Carlson): equal keys hold still, no
// overshoot. A key with e:'io' eases the segment that ends on it (smooth stop and start) instead.
export function keys(list, t, prop, def = 0) {
  const k = list.filter(o => o[prop] !== undefined);
  if (!k.length) return def;
  if (t <= k[0].t) return k[0][prop];
  if (t >= k[k.length - 1].t) return k[k.length - 1][prop];
  let i = 0; while (t > k[i + 1].t) i++;
  const a = k[i], b = k[i + 1], h = b.t - a.t, s = (t - a.t) / h;
  if (b.e === 'io') return lerp(a[prop], b[prop], ease.io(s));
  if (b.e === 'out') return lerp(a[prop], b[prop], ease.out(s));
  if (b.e === 'in') return lerp(a[prop], b[prop], ease.in(s));
  const d = j => (k[j + 1][prop] - k[j][prop]) / (k[j + 1].t - k[j].t);
  const m = j => {
    if (j === 0) return d(0);
    if (j === k.length - 1) return d(j - 1);
    const d0 = d(j - 1), d1 = d(j);
    if (d0 * d1 <= 0) return 0;
    const w1 = 2 * (k[j + 1].t - k[j].t) + (k[j].t - k[j - 1].t), w2 = (k[j + 1].t - k[j].t) + 2 * (k[j].t - k[j - 1].t);
    return (w1 + w2) / (w1 / d0 + w2 / d1);
  };
  const m0 = m(i) * h, m1 = m(i + 1) * h, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * a[prop] + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * b[prop] + (s3 - s2) * m1;
}

// ---------- colour ----------
const _c = new Map();
const rgb = h => { let v = _c.get(h); if (!v) { let s = h.replace('#', ''); if (s.length === 3) s = [...s].map(c => c + c).join(''); const n = parseInt(s, 16); v = [n >> 16 & 255, n >> 8 & 255, n & 255]; _c.set(h, v); } return v; };
const hex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, k) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * k)); };
export const rgba = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };
// a hand-mixed variant: brightness ± amt and a slight warm/cool shift, so no two dabs are the same paint
export const vary = (h, R, amt = .06) => { const c = rgb(h), k = (R() - .5) * 2 * amt * 255, w = (R() - .5) * amt * 90; return hex([c[0] + k + w, c[1] + k, c[2] + k - w]); };
export const shade = (h, k) => k < 0 ? mix(h, '#14161c', -k) : mix(h, '#fff6e6', k);

// ---------- brushes ----------
function closed(ctx, p) {
  const n = p.length; ctx.moveTo((p[n - 1][0] + p[0][0]) / 2, (p[n - 1][1] + p[0][1]) / 2);
  for (let i = 0; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
  ctx.closePath();
}
// an irregular round blob path (not filled). o: n points, jag (0 smooth … .5 ragged), sx/sy squash, rot
export function blob(ctx, x, y, r, R, o = {}) {
  const n = o.n || 9, jag = o.jag ?? .26, sx = o.sx ?? 1, sy = o.sy ?? 1, rot = o.rot || 0, cr = Math.cos(rot), sr = Math.sin(rot), p = [];
  const a0 = R() * TAU;
  for (let i = 0; i < n; i++) {
    const a = a0 + i / n * TAU + (R() - .5) * .35, rr = r * (1 + jag * (R() - .5) * 2), px = Math.cos(a) * rr * sx, py = Math.sin(a) * rr * sy;
    p.push([x + px * cr - py * sr, y + px * sr + py * cr]);
  }
  closed(ctx, p);
}
export function dab(ctx, x, y, r, col, R, o = {}) {
  ctx.globalAlpha = o.a ?? 1; ctx.fillStyle = col; ctx.beginPath(); blob(ctx, x, y, r, R, o); ctx.fill(); ctx.globalAlpha = 1;
}
// points on a quadratic curve
export const curve = (x0, y0, cx, cy, x1, y1, n = 10) => Array.from({ length: n }, (_, i) => { const s = i / (n - 1), u = 1 - s; return [u * u * x0 + 2 * u * s * cx + s * s * x1, u * u * y0 + 2 * u * s * cy + s * s * y1]; });
// a filled ribbon along a polyline, width given per s ∈ [0,1] (taper both ends: s => w * Math.sin(Math.PI * s) ** .6)
export function ribbon(ctx, pts, wf) {
  const n = pts.length, L = [], Rr = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, w = wf(i / (n - 1)) / 2;
    L.push([pts[i][0] - dy / d * w, pts[i][1] + dx / d * w]); Rr.push([pts[i][0] + dy / d * w, pts[i][1] - dx / d * w]);
  }
  ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]); ctx.closePath(); ctx.fill();
}
// one brush stroke: from (x,y) along ang, len long, w wide; bend curves it; taper 'both' | 'tip' (thick start)
export function streak(ctx, x, y, len, w, ang, col, o = {}) {
  const c = Math.cos(ang), s = Math.sin(ang), b = (o.bend || 0) * len, x1 = x + c * len, y1 = y + s * len;
  ctx.globalAlpha = o.a ?? 1; ctx.fillStyle = col;
  ribbon(ctx, curve(x, y, (x + x1) / 2 - s * b, (y + y1) / 2 + c * b, x1, y1, 7), o.taper === 'tip' ? k => w * Math.pow(1 - k, .7) + .3 : k => w * Math.pow(Math.sin(Math.PI * (.08 + .84 * k)), .55));
  ctx.globalAlpha = 1;
}
// dry-brush: a bundle of short strokes in one direction inside radius r — the visible paint texture on moss and bark
export function scrub(ctx, x, y, r, col, R, o = {}) {
  const n = o.n || 10, ang = o.ang ?? -.5, len = o.len || r * .9, w = o.w || r * .14;
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, d = Math.sqrt(R()) * r;
    streak(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * (o.sy ?? 1), len * (.4 + R() * .6), w * (.5 + R() * .6), ang + (R() - .5) * (o.spread ?? .35), vary(col, R, .05), { a: (o.a ?? .85) * (.6 + R() * .4), bend: (R() - .5) * .3 });
  }
}
// leaf spray: tiny leaf-shaped flecks scattered around a point (the loose edge of a crown)
export function spray(ctx, x, y, r, col, R, o = {}) {
  const n = o.n || 24, sz = o.size || 3.2;
  for (let i = 0; i < n; i++) {
    const a = (o.dir ?? R() * TAU) + (o.dir !== undefined ? (R() - .5) * (o.arc ?? 2.2) : 0), d = r * (.55 + R() * .6), s = sz * (.6 + R() * .7);
    ctx.fillStyle = vary(col, R, .07); ctx.globalAlpha = o.a ?? .95;
    ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * (o.sy ?? 1), s, s * .45, R() * TAU, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
// leaf flecks: many small leaf marks inside an ellipse (r × r·sy), denser toward the light [lx, ly] when bias > 0 —
// the texture that makes a crown read as foliage instead of a blob
export function flecks(ctx, x, y, r, col, R, o = {}) {
  const n = o.n || Math.round(r * 1.5), sz = o.size || Math.max(1.8, r * .09), sy = o.sy ?? .85, [lx, ly] = o.light || [-.45, -.89], bias = o.bias ?? .7;
  for (let i = 0; i < n; i++) {
    let a = R() * TAU, d = Math.sqrt(R());
    const dot = Math.cos(a) * lx + Math.sin(a) * ly; if (R() > 1 - bias + bias * (dot * .5 + .5)) { a += Math.PI * (R() < .5 ? 1 : -1) * .5; d *= .7; }
    const s = sz * (.6 + R() * .8);
    ctx.fillStyle = vary(col, R, o.vary ?? .06); ctx.globalAlpha = o.a ?? 1;
    ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * d * r, y + Math.sin(a) * d * r * sy, s, s * (.45 + R() * .3), (o.ang ?? -.6) + (R() - .5) * 1.4, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
// a five-petal flower (white / lavender, yellow eye)
export function flower(ctx, x, y, r, col = '#f4f1ea', eye = '#e8c04a', R = Math.random) {
  ctx.fillStyle = col;
  const a0 = R() * TAU;
  for (let i = 0; i < 5; i++) { const a = a0 + i / 5 * TAU; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .5, r * .5, r * .32, a, 0, TAU); ctx.fill(); }
  ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(x, y, r * .26, 0, TAU); ctx.fill();
}
// a four-point glint (a lens or a wet eye catching the sun)
export function sparkle(ctx, x, y, r, a = 1, col = '#fffbe8') {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * .8); g.addColorStop(0, rgba(col, .9)); g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * .8, 0, TAU); ctx.fill(); ctx.fillStyle = col;
  for (const [dx, dy, l] of [[1, 0, 1], [0, 1, 1], [.7, .7, .45], [.7, -.7, .45]]) {
    ctx.beginPath(); ctx.moveTo(x - dx * r * l, y - dy * r * l); ctx.lineTo(x - dy * r * .06, y + dx * r * .06); ctx.lineTo(x + dx * r * l, y + dy * r * l); ctx.lineTo(x + dy * r * .06, y - dx * r * .06); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// ink outline: stroke the current path drawn by pathFn with a slightly uneven line (two passes, one offset)
export function ink(ctx, pathFn, w = 2.2, col = '#3a3540') {
  ctx.save(); ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.lineWidth = w; ctx.beginPath(); pathFn(ctx); ctx.stroke();
  ctx.globalAlpha = .35; ctx.lineWidth = w * .6; ctx.translate(w * .35, w * .25); ctx.beginPath(); pathFn(ctx); ctx.stroke();
  ctx.restore();
}

// ---------- painters (call while building a plate) ----------
// sky: vertical gradient stops [[0,'#8fb4bd'],[.55,'#f6d6a4'],[1,'#fbc98a']] + faint horizontal brush streaks
export function sky(ctx, w, h, stops, R, o = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, h); for (const [k, c] of stops) g.addColorStop(k, c);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const n = o.streaks ?? 60;
  for (let i = 0; i < n; i++) {
    const y = R() * h, k = y / h; let c = stops[0][1];
    for (let j = 1; j < stops.length; j++) if (k >= stops[j - 1][0]) c = mix(stops[j - 1][1], stops[j][1], clamp((k - stops[j - 1][0]) / (stops[j][0] - stops[j - 1][0])));
    streak(ctx, R() * w - 100, y, 200 + R() * 500, 6 + R() * 16, (R() - .5) * .04, vary(c, R, .05), { a: .35 });
  }
}
// a long flat-bottomed cumulus streak (the pink-lavender bands across a dawn sky). pal: shadow, body, light, rim
export const CLOUD = { shadow: '#c9a2b2', body: '#f1d3c4', light: '#fff0dc', rim: '#f6bfa4' };
export function cloud(ctx, x, y, len, h, R, pal = CLOUD, o = {}) {
  const bumps = [];
  for (let k = 0; k <= len; k += h * (.18 + R() * .22)) {
    const env = Math.pow(Math.sin(Math.PI * clamp(k / len)), .6);
    bumps.push([x + k, h * (.3 + R() * .45) * (.3 + .7 * env)]);
  }
  // shadow mass with a flat, dragged underside
  for (const [bx, r] of bumps) dab(ctx, bx, y - r * .35, r * 1.05, vary(pal.shadow, R, .03), R, { jag: .32, sx: 1.4, n: 12 });
  for (const [bx, r] of bumps) streak(ctx, bx - r * 1.6, y + r * .05 * R(), r * 3.2, r * .45, (R() - .5) * .03, vary(pal.shadow, R, .04), { a: .85 });
  // the lit body, its scalloped top, the brightest tops toward the sun
  for (const [bx, r] of bumps) dab(ctx, bx + (R() - .5) * r * .4, y - r * .62, r * .78, vary(pal.body, R, .035), R, { jag: .3, sx: 1.35, n: 12 });
  for (const [bx, r] of bumps) if (R() < .7) dab(ctx, bx + (o.lx ?? -.25) * r, y - r * .9, r * .42, vary(pal.light, R, .03), R, { jag: .35, sx: 1.5, n: 10 });
  // dry-brush: horizontal drags through the body, a warm rim on some tops, shadow drags under the belly
  for (const [bx, r] of bumps) if (R() < .5) scrub(ctx, bx, y - r * .55, r * .7, R() < .5 ? pal.light : pal.body, R, { n: 3, ang: (R() - .5) * .08, len: r * 1.6, w: r * .16, sy: .4, spread: .05, a: .6 });
  for (const [bx, r] of bumps) if (R() < .35) streak(ctx, bx - r * .6, y - r * 1.1, r * 1.3, r * .14, -.05 + (R() - .5) * .15, pal.rim, { a: .5, bend: -.25 });
  for (let i = 0; i < bumps.length * .5; i++) { const [bx, r] = bumps[(R() * bumps.length) | 0]; streak(ctx, bx - r * 1.5, y + r * .02, r * 3, r * .12, (R() - .5) * .02, shade(pal.shadow, -.08), { a: .45 }); }
}
// one cumulus mass: a union of bumps on an arc over a flat base, lit from above (gradient light → body → shadow), each
// bump with its own lit cap and a shadow crescent so the mass has volume, a dragged flat underside, a warm rim.
export function cumulus(ctx, x, y, w, h, R, pal = CLOUD, o = {}) {
  const n = Math.max(3, Math.round(w / h * 1.4)), bumps = [], path = new Path2D(), lx = o.lx ?? -.3;
  for (let i = 0; i < n; i++) {
    const k = (i + .5) / n, env = Math.pow(Math.sin(Math.PI * k), .8), r = h * (.24 + .3 * env) * (.75 + R() * .5);
    const bx = x - w / 2 + k * w + (R() - .5) * w / n * .5, by = y - h * .12 - env * h * .5 + r * .35 + (R() - .5) * h * .08;
    bumps.push([bx, by, r]); blob(path, bx, by, r, R, { jag: .12, n: 12 });
  }
  blob(path, x, y, w / 2, R, { sy: h * .2 / (w / 2), jag: .05, n: 14 });
  const g = ctx.createLinearGradient(0, y - h, 0, y + h * .2);
  g.addColorStop(0, pal.light); g.addColorStop(.35, pal.light); g.addColorStop(.62, pal.body); g.addColorStop(.92, pal.shadow); g.addColorStop(1, shade(pal.shadow, -.04));
  ctx.save(); ctx.fillStyle = g; ctx.fill(path); ctx.clip(path);
  bumps.sort((a, b) => a[1] - b[1]);
  for (const [bx, by, r] of bumps) {
    // each bump: a soft shadow under its right side, a lit cap brushed in curved strokes along its top
    ctx.save(); ctx.filter = `blur(${r * .12 * (ctx.getTransform().a || 1)}px)`;
    dab(ctx, bx + r * .55, by + r * .7, r * .85, pal.shadow, R, { jag: .3, a: .4 });
    dab(ctx, bx + lx * r * .35, by - r * .35, r * .6, pal.light, R, { jag: .3, a: .45, sx: 1.3, sy: .8 });
    ctx.restore();
    for (let j = 0; j < 4; j++) { const a0 = -Math.PI * (.55 + R() * .35); streak(ctx, bx + Math.cos(a0) * r * .78, by + Math.sin(a0) * r * .72, r * (.5 + R() * .5), r * .1, a0 + Math.PI / 2 + .25, R() < .5 ? pal.light : '#fff6e6', { a: .55, bend: .25 }); }
  }
  for (let i = 0; i < n; i++) streak(ctx, x - w / 2 + R() * w * .8, y + h * (.02 + R() * .12), w * (.2 + R() * .3), h * .06, (R() - .5) * .02, shade(pal.shadow, -.08), { a: .5 });
  ctx.restore();
  for (const [bx, by, r] of bumps) if (R() < .5 && by < y - h * .2) streak(ctx, bx - r * .9, by - r * .82, r * 1.2, r * .1, -.35, pal.rim, { a: .45, bend: -.35 });
}
// a sea of cumulus (to fly over): rows from back (top, smaller, hazier) to front (bottom, big), sizes varied
export function cloudBank(ctx, x0, x1, y, h, R, pal = CLOUD, o = {}) {
  const rows = o.rows || 3;
  for (let row = 0; row < rows; row++) {
    const k = rows === 1 ? 1 : row / (rows - 1), ry = y + k * h * .6, hh = h * (.35 + k * .45);
    const p = { ...pal, shadow: mix(pal.shadow, '#b7a3bd', .3 * (1 - k)), body: mix(pal.body, pal.shadow, .15 * (1 - k)) };
    for (let x = x0 - hh * R() * 2; x < x1 + hh; ) {
      const ww = hh * (1.8 + R() * 2.6); cumulus(ctx, x + ww / 2, ry + (R() - .5) * hh * .35, ww, hh * (.7 + R() * .7), R, p, o);
      x += ww * (.55 + R() * .35);
    }
    // the row's base dissolves into the haze below it
    const fy = ry + hh * .1, g = ctx.createLinearGradient(0, fy, 0, fy + hh * .9);
    g.addColorStop(0, rgba(o.mist || '#f2d9c8', 0)); g.addColorStop(1, rgba(o.mist || '#f2d9c8', .85));
    ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = g; ctx.fillRect(x0 - 500, fy, x1 - x0 + 1000, hh * 3); ctx.restore();
  }
}
// a foliage clump: dark mass → mid → lit dabs pushed toward the light → dry-brush highlights → loose leaf spray.
// pal: { dark, mid, light, hi }; o.light = [dx, dy] toward the sun (default upper left); o.spray = leaves at the rim
export const LEAF = { dark: '#2c4a36', mid: '#4f7a45', light: '#8eae55', hi: '#cfd884' };
export function clump(ctx, x, y, r, R, pal = LEAF, o = {}) {
  const L = o.light || [-.45, -.89], [lx, ly] = L, d = o.detail ?? 1;
  // silhouette: a few dark masses, flattened underneath
  for (let i = 0; i < 5; i++) { const a = R() * TAU, q = R() * r * .35; dab(ctx, x + Math.cos(a) * q, y + Math.sin(a) * q * .6, r * (.45 + R() * .2), vary(pal.dark, R, .04), R, { jag: .3, n: 12, sy: .85 }); }
  // mid, light, highlight leaf flecks — each pushed further toward the light and fewer
  flecks(ctx, x + lx * r * .1, y + ly * r * .1, r * .85, pal.mid, R, { n: Math.round(r * 1.3 * d) + 6, light: L, bias: .6 });
  flecks(ctx, x + lx * r * .3, y + ly * r * .3, r * .6, pal.light, R, { n: Math.round(r * .8 * d) + 4, light: L, bias: .8 });
  flecks(ctx, x + lx * r * .45, y + ly * r * .45, r * .38, pal.hi, R, { n: Math.round(r * .3 * d) + 2, light: L, bias: .9, size: Math.max(1.5, r * .07) });
  if (o.spray) spray(ctx, x, y, r * .95, R() < .5 ? pal.mid : pal.dark, R, { n: Math.round(o.spray), size: Math.max(1.6, r * .06) });
}
// rows of clumps — a forest canopy seen from the side or above. Rows run top (back) → bottom (front).
export function canopy(ctx, R, o) {
  const { x0, x1, y0, y1, size } = o, rows = o.rows || Math.max(1, Math.round((y1 - y0) / (size * .55)));
  for (let row = 0; row < rows; row++) {
    const k = rows === 1 ? 0 : row / (rows - 1), y = lerp(y0, y1, k);
    const pal = o.pal || LEAF, darken = (o.darken ?? .25) * k;
    const p = { dark: shade(pal.dark, -darken), mid: shade(pal.mid, -darken), light: shade(pal.light, -darken * .6), hi: pal.hi };
    if (o.fill !== false) { ctx.fillStyle = shade(p.dark, -.1); ctx.fillRect(x0 - size, y + size * .25, x1 - x0 + size * 2, (o.below ?? (y1 - y + size * 2))); }
    for (let x = x0 - (R() * size); x < x1 + size; x += size * (.55 + R() * .45)) {
      const r = size * (.55 + R() * .55) * (o.grow ? lerp(1, o.grow, k) : 1);
      clump(ctx, x, y + (R() - .5) * size * .45 - (o.wave ? Math.sin(x * .004 + row) * o.wave : 0), r, R, p, { light: o.light, spray: o.spray, detail: o.detail });
    }
  }
}
// a conifer silhouette: jagged tiers, lit edge on the sun side
export function conifer(ctx, x, yb, h, w, col, R, o = {}) {
  const n = Math.max(8, Math.round(h / 5)), lit = o.lit;
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, yb - h); ctx.lineTo(x - w * .32, yb); ctx.lineTo(x + w * .32, yb); ctx.closePath(); ctx.fill();
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), y = yb - h * (1 - k) * .98, half = w / 2 * Math.pow(k, .85) * (.75 + R() * .45) + 2;
    for (const sd of [-1, 1]) {
      const ang = (sd < 0 ? Math.PI : 0) + sd * (.25 + R() * .35);
      streak(ctx, x, y, half, Math.max(2, h / n * 1.6), ang, vary(col, R, .04), { taper: 'tip', bend: sd * .15 });
      if (lit && sd < 0 && R() < .55) streak(ctx, x - half * .35, y - 1, half * .6, Math.max(1.2, h / n * .7), ang, lit, { taper: 'tip', a: .7 });
    }
  }
  streak(ctx, x, yb - h * 1.02, h * .12, Math.max(1.5, w * .04), Math.PI / 2, col);
}
export function conifers(ctx, x0, x1, yb, h, w, col, R, o = {}) {
  for (let x = x0; x < x1; x += w * (o.gap ?? .9) * (.6 + R() * .9)) conifer(ctx, x, yb + R() * h * .05, h * (.65 + R() * .5), w * (.8 + R() * .4), col, R, o);
}
// a tall trunk with bark strokes, a dark side, a rim of light, moss and hanging vines.
// pal: { bark, dark, light, moss, vine }
export const BARK = { bark: '#4c4639', dark: '#2a2924', light: '#8a8270', moss: '#5f8746', vine: '#3f6a3c' };
export function trunk(ctx, x, yTop, yBot, w, R, pal = BARK, o = {}) {
  const lean = o.lean || 0, flare = o.flare ?? .35, n = 14, L = [], Rt = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n, y = lerp(yTop, yBot, k), ww = w * (1 + flare * Math.pow(k, 6)) * (1 + (R() - .5) * .04), cx = x + lean * (1 - k);
    L.push([cx - ww / 2, y]); Rt.push([cx + ww / 2, y]);
  }
  const path = c => { c.moveTo(L[0][0], L[0][1]); for (const p of L) c.lineTo(p[0], p[1]); for (let i = Rt.length - 1; i >= 0; i--) c.lineTo(Rt[i][0], Rt[i][1]); c.closePath(); };
  ctx.save(); ctx.fillStyle = pal.bark; ctx.beginPath(); path(ctx); ctx.fill(); ctx.clip();
  // dark side (away from the light), rim on the lit side
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0), side = o.lightSide ?? -1;
  g.addColorStop(0, side < 0 ? rgba(pal.light, .55) : rgba(pal.dark, .8)); g.addColorStop(.3, rgba(pal.bark, 0)); g.addColorStop(.62, rgba(pal.bark, 0)); g.addColorStop(1, side < 0 ? rgba(pal.dark, .85) : rgba(pal.light, .5));
  ctx.fillStyle = g; ctx.fillRect(x - w * 2 + Math.min(0, lean), yTop, w * 4 + Math.abs(lean), yBot - yTop);
  // bark: long vertical strokes
  const strokes = Math.round((yBot - yTop) / Math.max(6, w * .5) * (o.detail ?? 1));
  for (let i = 0; i < strokes; i++) {
    const y = lerp(yTop, yBot, R()), k = (y - yTop) / (yBot - yTop), cx = x + lean * (1 - k) + (R() - .5) * w * .9;
    streak(ctx, cx, y, w * (.8 + R() * 2.5), Math.max(1, w * (.05 + R() * .07)), Math.PI / 2 + (R() - .5) * .08, R() < .6 ? pal.dark : pal.light, { a: .5 });
  }
  // moss creeping up the lit side
  const moss = o.moss ?? .4;
  for (let i = 0; i < 40 * moss; i++) {
    const k = Math.pow(R(), .6), y = lerp(yBot, yTop, k * .9), cx = x + lean * (1 - (y - yTop) / (yBot - yTop)) + side * w * (.15 + R() * .35);
    dab(ctx, cx, y, w * (.08 + R() * .16), vary(pal.moss, R, .08), R, { sy: 1.6, jag: .4, a: .85 });
  }
  ctx.restore();
  // hanging vines from the top of the frame
  for (let i = 0; i < (o.vines || 0); i++) {
    const vx = x + lean + (R() - .5) * w * 3, len = (yBot - yTop) * (.08 + R() * .3), y0 = yTop;
    ctx.fillStyle = vary(pal.vine, R, .06); ribbon(ctx, curve(vx, y0, vx + (R() - .5) * 20, y0 + len * .5, vx + (R() - .5) * 30, y0 + len, 8), k => 2.2 * (1 - k * .7) + .4);
    for (let j = 0; j < len / 7; j++) { const k = j * 7 / len; spray(ctx, vx + (R() - .5) * 12 * k, y0 + len * k, 2, vary(pal.vine, R, .1), R, { n: 2, size: 3.6 }); }
  }
}
// a strip of grass: dark ground below y, blades rising from it. pal: [darkest … lightest]
export const GRASS = ['#17322b', '#22443a', '#335b46', '#4f7a50', '#86a565'];
export function grass(ctx, x0, x1, y, h, R, pal = GRASS, o = {}) {
  ctx.fillStyle = pal[0]; ctx.fillRect(x0, y, x1 - x0, o.below ?? 400);
  const n = Math.round((x1 - x0) / 3 * (o.density ?? 1));
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * (x1 - x0), hh = h * (.35 + R() * .8), lean = (o.lean ?? 0) + (R() - .5) * .6, yy = y + R() * h * .25;
    const tone = Math.min(pal.length - 1, Math.floor(Math.pow(R(), 1.4) * pal.length));
    ctx.fillStyle = pal[tone]; ribbon(ctx, curve(x, yy, x + lean * hh * .4, yy - hh * .6, x + lean * hh, yy - hh, 6), k => (o.w ?? 3.2) * (1 - k) + .2);
  }
}
// a fern frond along a curve
export function fern(ctx, x, y, len, ang, col, R, o = {}) {
  const c = Math.cos(ang), s = Math.sin(ang), bend = o.bend ?? .25, pts = curve(x, y, x + c * len * .5 - s * len * bend, y + s * len * .5 + c * len * bend, x + c * len, y + s * len, 14);
  ctx.fillStyle = col; ribbon(ctx, pts, k => 2.4 * (1 - k) + .4);
  for (let i = 1; i < pts.length - 1; i++) {
    const k = i / pts.length, [px, py] = pts[i], [qx, qy] = pts[i + 1], a = Math.atan2(qy - py, qx - px), l = len * .2 * Math.sin(Math.PI * k) + 2;
    for (const sd of [-1, 1]) streak(ctx, px, py, l, l * .32, a + sd * 1.0, vary(col, R, .06), { taper: 'tip', bend: sd * .2 });
  }
}
// a soft mist band (paint it on its own plate and give the plate a blur)
export function mist(ctx, x0, x1, y, h, col, R, o = {}) {
  const n = o.n || Math.round((x1 - x0) / 60);
  for (let i = 0; i < n; i++) dab(ctx, lerp(x0, x1, R()), y + (R() - .5) * h * .5, h * (.6 + R() * .8), col, R, { sx: 2.6 + R() * 2, sy: .5, jag: .3, a: (o.a ?? .25) * (.5 + R() * .5) });
}
// haze the plate's own paint toward a colour: flat amount, or a vertical gradient [[0, a], [1, a]]
export function haze(ctx, w, h, col, a) {
  ctx.save(); ctx.globalCompositeOperation = 'source-atop';
  if (Array.isArray(a)) { const g = ctx.createLinearGradient(0, 0, 0, h); for (const [k, v] of a) g.addColorStop(k, rgba(col, v)); ctx.fillStyle = g; }
  else ctx.fillStyle = rgba(col, a);
  ctx.fillRect(0, 0, w, h); ctx.restore();
}
// weathered painted metal / stone: fill a shape, then (clipped to it) cel shading, rust and patina blotches, speckle.
// o: { base, shadow, light (colours), shadowPath(ctx) (the cel shadow shape), rust: ['#a8794a', …], amount, scale, seed }
export function weather(ctx, pathFn, R, o) {
  ctx.save(); ctx.beginPath(); pathFn(ctx); ctx.fillStyle = o.base; ctx.fill(); ctx.clip();
  if (o.light && o.lightPath) { ctx.beginPath(); o.lightPath(ctx); ctx.fillStyle = o.light; ctx.fill(); }
  if (o.shadow && o.shadowPath) { ctx.beginPath(); o.shadowPath(ctx); ctx.fillStyle = o.shadow; ctx.fill(); }
  const [bx, by, bw, bh] = o.box, sc = o.scale || 40, rust = o.rust || ['#a8794a', '#c48a52', '#7d8d8a'];
  const n = Math.round(bw * bh / (sc * sc) * (o.amount ?? .5));
  for (let i = 0; i < n; i++) {
    const x = bx + R() * bw, y = by + R() * bh, r = sc * (.25 + R() * .75), c = rust[(R() * rust.length) | 0];
    dab(ctx, x, y, r, vary(c, R, .05), R, { jag: .55, n: 13, sx: 1 + R() * .8, rot: R() * TAU, a: .8 });
    if (R() < .5) dab(ctx, x + r * .3, y + r * .2, r * .45, vary(shade(c, -.2), R), R, { jag: .5, n: 10, a: .6 });
  }
  for (let i = 0; i < n * 3; i++) dab(ctx, bx + R() * bw, by + R() * bh, sc * .06 * (1 + R()), shade(rust[(R() * rust.length) | 0], -.15), R, { jag: .4, n: 6, a: .7 });
  // drip streaks under rivets / edges
  for (let i = 0; i < n * .4; i++) { const x = bx + R() * bw, y = by + R() * bh * .7; streak(ctx, x, y, sc * (.6 + R()), sc * .08, Math.PI / 2, rust[0], { a: .35, taper: 'tip' }); }
  ctx.restore();
}

// paint into a temporary layer the size of the plate, haze / blur it on its own, then lay it down — so each depth of a
// backdrop gets its own amount of air instead of hazing everything painted before it
export function layer(ctx, w, h, fn, o = {}) {
  const S = ctx.getTransform().a || 1, c = document.createElement('canvas'); c.width = Math.ceil(w * S); c.height = Math.ceil(h * S);
  const x = c.getContext('2d'); x.scale(S, S); fn(x);
  if (o.haze) haze(x, w, h, o.haze[0], o.haze[1]);
  ctx.save(); if (o.blur) ctx.filter = `blur(${o.blur * S}px)`; ctx.globalAlpha = o.a ?? 1; ctx.drawImage(c, 0, 0, w, h); ctx.restore();
}
// a soft contact shadow (an object sitting on the ground)
export function shadow(ctx, x, y, w, h, a = .45, col = '#1f2a22') {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, h / w);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2); g.addColorStop(0, rgba(col, a)); g.addColorStop(.6, rgba(col, a * .5)); g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, TAU); ctx.fill(); ctx.restore();
}

// ---------- moving things (per frame; pure functions of t) ----------
// falling leaves: each leaf loops top→bottom of [y0,y1] at its own speed, swaying and tumbling
export function leaves(ctx, t, o) {
  const { x0, x1, y0, y1 } = o, n = o.n || 30, span = y1 - y0, cols = o.cols || ['#8d9c4a', '#b58a3e', '#6f8a3d', '#c9a24c'];
  for (let i = 0; i < n; i++) {
    const sp = (o.fall || 60) * (.6 + hash(i, 1, o.seed) * .8), ph = hash(i, 2, o.seed), y = y0 + ((t * sp + ph * span) % span + span) % span;
    const x = x0 + hash(i, 3, o.seed) * (x1 - x0) + Math.sin(t * (1 + hash(i, 4, o.seed)) + ph * 9) * (o.sway ?? 30) + (o.wind || 0) * ((t * sp + ph * span) / span % 1) * 100;
    const s = (o.size || 7) * (.6 + hash(i, 5, o.seed) * .8), rot = t * (1.5 + hash(i, 6, o.seed) * 2) + ph * 7, flip = Math.cos(t * (2 + hash(i, 7, o.seed) * 2) + ph * 5);
    const a = (o.a ?? 1) * Math.min(1, (y - y0) / 40, (y1 - y) / 40);
    if (a <= 0) continue;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, .35 + .65 * Math.abs(flip));
    ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * .55, s, 0); ctx.quadraticCurveTo(0, s * .55, -s, 0); ctx.fill();
    ctx.strokeStyle = rgba('#3d3a22', .5); ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s * .8, 0); ctx.stroke();
    ctx.restore();
  }
}
// a flock of distant birds: little flapping "m" strokes travelling with velocity (vx, vy) from (x, y)
export function flock(ctx, t, o) {
  const n = o.n || 12, col = o.col || '#3b3a3c';
  ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    const bx = o.x + (o.vx || 60) * t + (hash(i, 1, o.seed) - .5) * (o.spread || 200) + Math.sin(t * .7 + i) * 6;
    const by = o.y + (o.vy || -8) * t + (hash(i, 2, o.seed) - .5) * (o.spread || 200) * .35 + Math.sin(t * .9 + i * 2) * 4;
    const s = (o.size || 5) * (.7 + hash(i, 3, o.seed) * .6), f = Math.sin(t * (9 + hash(i, 4, o.seed) * 4) + i * 1.7);
    ctx.lineWidth = Math.max(1, s * .28); ctx.beginPath(); ctx.moveTo(bx - s, by - f * s * .6); ctx.quadraticCurveTo(bx - s * .4, by - s * .2 - f * s * .2, bx, by); ctx.quadraticCurveTo(bx + s * .4, by - s * .2 - f * s * .2, bx + s, by - f * s * .6); ctx.stroke();
  }
}
// floating motes / pollen in a light shaft
export function motes(ctx, t, o) {
  const n = o.n || 40, col = o.col || '#fff3cf';
  for (let i = 0; i < n; i++) {
    const x = o.x0 + (((hash(i, 1, o.seed) * (o.x1 - o.x0) + t * (o.vx ?? 6) + Math.sin(t * .5 + i) * 10) % (o.x1 - o.x0)) + (o.x1 - o.x0)) % (o.x1 - o.x0);
    const y = o.y0 + (((hash(i, 2, o.seed) * (o.y1 - o.y0) - t * (o.vy ?? 4) + Math.cos(t * .4 + i) * 8) % (o.y1 - o.y0)) + (o.y1 - o.y0)) % (o.y1 - o.y0);
    const a = (o.a ?? .7) * (.4 + .6 * Math.sin(t * 1.3 + i * 2.1) ** 2), r = (o.size || 2.2) * (.5 + hash(i, 3, o.seed));
    ctx.fillStyle = rgba(col, a); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
}
// god rays from a point: soft wedges added with 'screen'. ang = centre direction, spread = total fan angle
export function rays(ctx, x, y, o) {
  const n = o.n || 6, len = o.len || 1400, col = o.col || '#fff1c8', t = o.t || 0;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const a = o.ang + (i / Math.max(1, n - 1) - .5) * o.spread + Math.sin(t * .3 + i * 1.9) * .015, wd = (o.width || .05) * (.5 + hash(i, 9, o.seed) * 1);
    const al = (o.a ?? .18) * (.5 + .5 * Math.sin(t * .6 + i * 2.3) ** 2);
    const g = ctx.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.addColorStop(0, rgba(col, al)); g.addColorStop(.6, rgba(col, al * .4)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a - wd) * len, y + Math.sin(a - wd) * len); ctx.lineTo(x + Math.cos(a + wd) * len, y + Math.sin(a + wd) * len); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// a soft round glow (lamp, sun) added with 'screen'
export function glow(ctx, x, y, r, col, a = 1) {
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(.25, rgba(col, a * .45)); g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}

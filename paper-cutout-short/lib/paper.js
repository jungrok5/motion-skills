// paper-cutout-short · paper.js — the scissors and the paper: seeded noise, timing helpers, colour, and pieces of cut or torn
// coloured paper (a white fibrous rim where the paper tore, the face colour, fibre texture, a soft light across it), painted
// once into sprites. Every set piece and every puppet part — whether cut here in code or cut out of an image-generator sheet
// by scripts/cut-parts.mjs — ends up as the same thing: a sprite with a local origin and a baked soft shadow.
//
//   P.piece(ctx, P.rrect(0, 0, 200, 120, 16), '#d9a35a')                 torn paper (white rim, fibres, light)
//   P.piece(ctx, P.ellipse(0, 0, 40, 30), '#7d5a8c', { edge: 'cut' })      a clean scissor cut, no rim
//   P.piece(ctx, pts, '#5f7d5a', { edge: 'felt' })                        felt: fuzzy edge, dense fibres
//   const s = P.sprite([-40, -10, 40, 90], c => { … pieces … })            paint once → { c, x0, y0, w, h, sh }
//   await P.image('parts/head.png', { pivot: [64, 120] })                 a generated part as a sprite (same shape)
//
// Units are stage px (the stage is 1920×1080); sprites are rasterised at P.res (the stage's preview scale) × o.res.
export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, u) => a + (b - a) * u;
export const ease = {
  lin: u => clamp(u), sine: u => (1 - Math.cos(Math.PI * clamp(u))) / 2,
  in: u => clamp(u) ** 2, out: u => 1 - (1 - clamp(u)) ** 2, io: u => (u = clamp(u), u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2),
  out3: u => 1 - (1 - clamp(u)) ** 3, in3: u => clamp(u) ** 3,
  back: u => { u = clamp(u); const c = 1.7; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; },
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
/** a string → an integer seed */
export const sid = s => { let h = 7; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h % 100000; };

/** keyed values: keys = [{ t, x, y, … , e: 'io' }], each property interpolated between the keys that have it (ease of the later key) */
export function keys(list, t, prop, def = 0) {
  let a = null, b = null;
  for (const k of list) { if (k[prop] === undefined) continue; if (k.t <= t) a = k; else { b = k; break; } }
  if (!a && !b) return def; if (!a) return b[prop]; if (!b) return a[prop];
  const e = ease[b.e || 'sine'] || ease.sine; return lerp(a[prop], b[prop], e((t - a.t) / (b.t - a.t)));
}

// ── colour ──
export const hex = c => { c = c.replace('#', ''); if (c.length === 3) c = [...c].map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); };
const toHex = a => '#' + a.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, k) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => lerp(v, B[i], k))); };
export const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
/** k < 0 darker (toward a warm brown-violet, never black), k > 0 lighter (toward paper cream) */
export const tone = (c, k) => k < 0 ? mix(c, '#3a2b33', -k) : mix(c, '#fbf3e4', k);
export const CREAM = '#f7efe1';      // the paper core: what shows where coloured paper tears

// ── audit: broken body rules found while drawing this frame (puppet.js pushes, stage.js clears per frame, runChecks reports) ──
export const audit = [];

// ── canvases and resolution ──
export const opts = { res: 1, light: [10, 14], seed: 1 };   // stage.js sets res (preview scale) and the light direction (shadow offset per unit lift)
export const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };

// ── textures: grey tiles centred on 50 % (neutral under overlay / soft-light), made once ──
const TEX = {};
function tile(kind) {
  if (TEX[kind]) return TEX[kind];
  const N = 384, c = mk(N, N), x = c.getContext('2d'), R = rng(kind === 'felt' ? 91 : 37);
  x.fillStyle = '#808080'; x.fillRect(0, 0, N, N);
  const d = x.getImageData(0, 0, N, N), px = d.data;
  // mottling: two octaves of tileable value noise
  const oct = (u, v, f, s) => { const g = (i, j) => hash(((i % f) + f) % f + 1, (((j % f) + f) % f) * 131 + s); const i = Math.floor(u * f), j = Math.floor(v * f), fu = u * f - i, fv = v * f - j, su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv); return lerp(lerp(g(i, j), g(i + 1, j), su), lerp(g(i, j + 1), g(i + 1, j + 1), su), sv) * 2 - 1; };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u = i / N, v = j / N, m = oct(u, v, 6, 1) * 10 + oct(u, v, 24, 2) * 7 + (R() - .5) * (kind === 'felt' ? 34 : 16), k = (j * N + i) * 4;
    px[k] = px[k + 1] = px[k + 2] = 128 + m;
  }
  x.putImageData(d, 0, 0);
  // fibres: short curved strands, light and dark
  const nf = kind === 'felt' ? 2600 : 900;
  for (let f = 0; f < nf; f++) {
    const x0 = R() * N, y0 = R() * N, a = R() * TAU, L = (kind === 'felt' ? 4 + R() * 9 : 6 + R() * 22), bend = (R() - .5) * 1.2, light = R() < .55;
    x.strokeStyle = light ? `rgba(255,255,255,${.12 + R() * .2})` : `rgba(0,0,0,${.06 + R() * .12})`; x.lineWidth = .5 + R() * (kind === 'felt' ? .9 : .7);
    for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) {   // wrap so the tile repeats seamlessly
      if (x0 + dx < -30 || x0 + dx > N + 30 || y0 + dy < -30 || y0 + dy > N + 30) continue;
      x.beginPath(); x.moveTo(x0 + dx, y0 + dy); x.quadraticCurveTo(x0 + dx + Math.cos(a + bend) * L * .6, y0 + dy + Math.sin(a + bend) * L * .6, x0 + dx + Math.cos(a) * L, y0 + dy + Math.sin(a) * L); x.stroke();
    }
  }
  return (TEX[kind] = c);
}
const patterns = new WeakMap();
function pattern(ctx, kind, seed) {
  let m = patterns.get(ctx); if (!m) patterns.set(ctx, m = {});
  const p = m[kind] || (m[kind] = ctx.createPattern(tile(kind), 'repeat'));
  p.setTransform(new DOMMatrix().translate(hash(seed, 1) * 384, hash(seed, 2) * 384).rotate(hash(seed, 3) * 360).scale(.8 + hash(seed, 4) * .5));
  return p;
}

// ── point lists (closed outlines in local px) ──
export const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export function ellipse(cx, cy, rx, ry, n = 40, a0 = -Math.PI / 2) { const p = []; for (let i = 0; i < n; i++) { const a = a0 + i / n * TAU; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; }
export function rrect(x, y, w, h, r = 10, n = 5) {
  r = Math.min(r, w / 2, h / 2); const p = [], c = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, a0] of c) for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return p;
}
/** a doorway / window: straight sides and a round top, (x, y) = bottom-left */
export function arch(x, y, w, h, n = 14) { const r = w / 2, p = [[x, y], [x, y - h + r]]; for (let i = 1; i < n; i++) { const a = Math.PI + i / n * Math.PI; p.push([x + r + Math.cos(a) * r, y - h + r + Math.sin(a) * r]); } p.push([x + w, y - h + r], [x + w, y]); return p; }
/** a tapered limb from (x0, y0) radius r0 to (x1, y1) radius r1, rounded both ends */
export function capsule(x0, y0, x1, y1, r0, r1 = r0, n = 10) {
  const a = Math.atan2(y1 - y0, x1 - x0), p = [];
  for (let i = 0; i <= n; i++) { const t = a - Math.PI / 2 + i / n * Math.PI; p.push([x1 + Math.cos(t) * r1, y1 + Math.sin(t) * r1]); }
  for (let i = 0; i <= n; i++) { const t = a + Math.PI / 2 + i / n * Math.PI; p.push([x0 + Math.cos(t) * r0, y0 + Math.sin(t) * r0]); }
  return p;
}
/** a soft lumpy blob (bushes, clouds, puffs): lobes bulges around an ellipse */
export function blob(cx, cy, rx, ry, lobes = 7, seed = 1, n = 64) {
  const p = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + .16 * Math.abs(Math.sin(a * lobes / 2 + hash(seed, 9) * 6)) + .05 * n1(i * .4, seed); p.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  return p;
}
/** a flat-bottomed cloud: bumps along the top, (x, y) = bottom-left */
export function cloudShape(x, y, w, h, bumps = 4, seed = 1) {
  const p = [[x + w, y], [x, y]], R = rng(seed);
  let cx = x; const ws = Array.from({ length: bumps }, () => .6 + R()), sum = ws.reduce((a, b) => a + b, 0);
  for (let b = 0; b < bumps; b++) {
    const bw = w * ws[b] / sum, bh = h * (.55 + .45 * Math.sin(Math.PI * (b + .5) / bumps)) * (.85 + R() * .3);
    for (let i = 0; i <= 10; i++) { const a = Math.PI + i / 10 * Math.PI; p.push([cx + bw / 2 + Math.cos(a) * bw / 2 * 1.08, y + Math.sin(a) * bh]); }
    cx += bw;
  }
  return p;
}
/** a crescent moon: outer circle r at (cx, cy), bitten by a circle of radius r·br offset by (dx, dy)·r */
export function crescent(cx, cy, r, dx = .42, dy = -.18, br = .86, n = 40) {
  const bx = cx + dx * r, by = cy + dy * r, R2 = r * br, d = Math.hypot(bx - cx, by - cy);
  const a = (r * r - R2 * R2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r * r - a * a)), ux = (bx - cx) / d, uy = (by - cy) / d;
  const px = cx + a * ux, py = cy + a * uy, I1 = [px - h * uy, py + h * ux], I2 = [px + h * uy, py - h * ux];
  const norm = v => ((v % TAU) + TAU) % TAU, arc = (ox, oy, rr, from, to, avoid, flip) => {
    const t1 = Math.atan2(from[1] - oy, from[0] - ox), t2 = Math.atan2(to[1] - oy, to[0] - ox); let del = norm(t2 - t1);
    const has = norm(avoid - t1) < del; if (has !== flip) del -= TAU;
    const out = []; for (let i = 0; i <= n; i++) { const t = t1 + del * i / n; out.push([ox + Math.cos(t) * rr, oy + Math.sin(t) * rr]); } return out;
  };
  const phi = Math.atan2(by - cy, bx - cx);
  return arc(cx, cy, r, I1, I2, phi, false).concat(arc(bx, by, R2, I2, I1, phi + Math.PI, true).slice(1, -1));
}
export function star(cx, cy, r, k = .45, pts = 5, a0 = -Math.PI / 2) { const p = []; for (let i = 0; i < pts * 2; i++) { const a = a0 + i * Math.PI / pts, rr = i % 2 ? r * k : r; p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return p; }
/** sun rays / a petal ring: n spikes between radius r0 and r1 */
export function burst(cx, cy, r0, r1, n = 14, a0 = 0) { const p = []; for (let i = 0; i < n * 2; i++) { const a = a0 + i * Math.PI / n, rr = i % 2 ? r0 : r1; p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return p; }
export const shift = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
export const scale = (pts, sx, sy = sx, cx = 0, cy = 0) => pts.map(([x, y]) => [cx + (x - cx) * sx, cy + (y - cy) * sy]);
export const flipX = (pts, cx = 0) => pts.map(([x, y]) => [2 * cx - x, y]);

// ── edges ──
function area(p) { let a = 0; for (let i = 0; i < p.length; i++) { const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length]; a += x0 * y1 - x1 * y0; } return a / 2; }
/** a ragged outline: every edge subdivided every `step` px and pushed in / out along its normal (wander + fine tooth) */
export function tear(pts, o = {}) {
  const rough = o.rough ?? 3, step = o.step ?? 5, seed = o.seed ?? 1, grow = o.grow ?? 0, out = [], sgn = area(pts) > 0 ? 1 : -1;
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length], L = Math.hypot(x1 - x0, y1 - y0); if (L < 1e-6) continue;
    const nx = (y1 - y0) / L * sgn, ny = -(x1 - x0) / L * sgn, n = Math.max(1, Math.round(L / step));
    for (let j = 0; j < n; j++) {
      const u = j / n, d = grow + n1(s * .045, seed) * rough * .9 + n1(s * .3, seed + 7) * rough * .45 + (hash(Math.floor(s), seed) - .5) * rough * .55;
      out.push([x0 + (x1 - x0) * u - nx * d, y0 + (y1 - y0) * u - ny * d]); s += L / n;
    }
  }
  return out;
}
const path = pts => { const p = new Path2D(); pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); return p; };
const bbox = pts => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } return [x0, y0, x1, y1]; };

let pieceN = 0;
/**
 * one piece of paper. o = {
 *   edge: 'torn' (white fibrous rim, default) | 'cut' (clean scissor edge) | 'felt' (fuzzy, no rim)
 *   rim: 3.2 (px of white core showing on a torn edge) · rough: edge roughness px · seed
 *   tex: .5 (fibre texture strength) · light: .35 (soft key light from the upper left, 0 = flat)
 *   lift: 0 (px this piece stands off the one under it → a soft shadow inside the sprite) · alpha
 *   grad: [colTop, colBottom] (a dyed / sun-faded sheet) · rimCol
 * }
 */
export function piece(ctx, pts, col, o = {}) {
  const edge = o.edge || 'torn', seed = o.seed ?? (++pieceN * 17 + opts.seed), felt = edge === 'felt', cut = edge === 'cut';
  const rough = o.rough ?? (cut ? .5 : felt ? 1.4 : 2.4);
  const face = tear(pts, { rough, step: cut ? 8 : 4, seed });
  const fp = path(face), [x0, y0, x1, y1] = bbox(face);
  ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.lift) {    // a soft shadow under the piece (it is glued on with a little foam)
    ctx.save(); const [lx, ly] = opts.light, k = o.lift / 10; ctx.translate(lx * k * .5, ly * k * .5);
    ctx.filter = `blur(${Math.max(1, o.lift * .5 * opts.res * (o.res || 1))}px)`; ctx.fillStyle = 'rgba(40,24,30,.38)'; ctx.fill(fp); ctx.restore();
  }
  if (edge === 'torn' && (o.rim ?? 3.2) > 0) {
    const rim = o.rim ?? 3.2, rp = path(tear(pts, { rough: rough * 1.5, step: 3, seed: seed + 3, grow: rim * .45 }));
    ctx.save(); ctx.fillStyle = o.rimCol || CREAM; ctx.strokeStyle = o.rimCol || CREAM; ctx.lineJoin = 'round'; ctx.lineWidth = rim;
    ctx.shadowColor = rgba(o.rimCol || CREAM, .9); ctx.shadowBlur = 1.6 * opts.res; ctx.fill(rp); ctx.stroke(rp); ctx.restore();
  }
  if (felt) { ctx.save(); ctx.shadowColor = rgba(col, .85); ctx.shadowBlur = 2.2 * opts.res; ctx.fillStyle = col; ctx.fill(fp); ctx.restore(); }
  if (o.grad) { const g = ctx.createLinearGradient(0, y0, 0, y1); o.grad.forEach((c, i) => g.addColorStop(i / (o.grad.length - 1), c)); ctx.fillStyle = g; }
  else ctx.fillStyle = col;
  ctx.fill(fp);
  const tex = o.tex ?? (felt ? .9 : .55);
  if (tex > 0) { ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha *= clamp(tex); ctx.fillStyle = pattern(ctx, felt ? 'felt' : 'paper', seed); ctx.fill(fp); ctx.restore(); }
  const light = o.light ?? .35;
  if (light > 0) {
    const g = ctx.createLinearGradient(x0, y0, x0 + (x1 - x0) * .7, y1);
    g.addColorStop(0, `rgba(255,248,232,${.32 * light})`); g.addColorStop(.55, 'rgba(255,248,232,0)'); g.addColorStop(1, `rgba(40,20,40,${.28 * light})`);
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = g; ctx.fill(fp); ctx.restore();
  }
  ctx.restore();
  return face;
}
/** a thin ink or pencil line drawn on paper (eyes, whiskers, stitching, window bars): pts open polyline */
export function ink(ctx, pts, o = {}) {
  ctx.save(); ctx.strokeStyle = o.col || '#3a2b2e'; ctx.lineWidth = o.w || 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha *= o.a ?? .9;
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); if (o.close) ctx.closePath(); ctx.stroke(); ctx.restore();
}
export function dot(ctx, x, y, r, col = '#3a2b2e', a = 1) { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore(); }
/** a soft dab of colour (blush, a glow painted on the paper) */
export function dab(ctx, x, y, r, col, a = .5) { ctx.save(); const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore(); }

// ── sprites ──
function shadowOf(c, blurPx) {
  const pad = Math.ceil(blurPx * 2.2), s = mk(c.width + pad * 2, c.height + pad * 2), x = s.getContext('2d');
  const sil = mk(c.width, c.height), y = sil.getContext('2d'); y.drawImage(c, 0, 0); y.globalCompositeOperation = 'source-in'; y.fillStyle = '#2a1820'; y.fillRect(0, 0, c.width, c.height);
  x.filter = `blur(${blurPx}px)`; x.drawImage(sil, pad, pad); return { c: s, pad };
}
/**
 * paint once into an offscreen canvas. b = [x0, y0, x1, y1] the local box the painter draws in (origin = the sprite's anchor:
 * a puppet joint, a layer's top-left …). o = { res: 1 (extra resolution), pad: 8, shadow: 9 (blur px of the baked shadow, 0 = none), blur: 0 (depth-of-field blur) }
 * → { c, x0, y0, w, h, pad, sh: { c, pad }, k (px per stage px) }
 */
export function sprite(b, paint, o = {}) {
  const [x0, y0, x1, y1] = b, k = opts.res * (o.res || 1), pad = o.pad ?? 8, w = x1 - x0, h = y1 - y0;
  const c = mk((w + pad * 2) * k, (h + pad * 2) * k), x = c.getContext('2d');
  x.scale(k, k); x.translate(pad - x0, pad - y0); paint(x, w, h);
  let out = c;
  if (o.blur > 0) { const d = mk(c.width, c.height), y = d.getContext('2d'); y.filter = `blur(${o.blur * k}px)`; y.drawImage(c, 0, 0); out = d; }
  const s = { c: out, x0, y0, w, h, pad, k };
  if ((o.shadow ?? 9) > 0) s.sh = shadowOf(out, (o.shadow ?? 9) * k);
  return s;
}
/** an image (a part cut from a generated sheet) as a sprite: pivot = its anchor in image px; o.px = stage px per image px */
export function image(src, o = {}) {
  return new Promise((ok, no) => {
    const im = new Image();
    im.onload = () => {
      const px = o.px ?? 1, [pvx, pvy] = o.pivot || [im.width / 2, im.height / 2], k = opts.res * (o.res || 1);
      const c = mk(im.width * px * k, im.height * px * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      const s = { c, x0: -pvx * px, y0: -pvy * px, w: im.width * px, h: im.height * px, pad: 0, k, src };
      if ((o.shadow ?? 9) > 0) s.sh = shadowOf(c, (o.shadow ?? 9) * k);
      ok(s);
    };
    im.onerror = () => no(new Error('could not load part image ' + src)); im.src = src;
  });
}
/** draw a sprite at its anchor (current transform), with its shadow first if o.lift > 0 (px it stands off what is behind) */
export function put(ctx, s, o = {}) {
  if (!s) return;
  const a = ctx.globalAlpha;
  if (o.lift > 0 && s.sh) {
    // the shadow falls along the stage's light direction in *screen* space, so a mirrored puppet does not flip its light
    const m = ctx.getTransform(), [lx, ly] = opts.light, k = o.lift / 10, d = 1 / s.k;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(lx * k * opts.res, ly * k * opts.res); ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
    ctx.globalAlpha = a * (o.shA ?? .42);
    ctx.drawImage(s.sh.c, s.x0 - s.pad - s.sh.pad * d, s.y0 - s.pad - s.sh.pad * d, s.sh.c.width * d, s.sh.c.height * d); ctx.restore();
  }
  if (o.a != null) ctx.globalAlpha = a * o.a;
  ctx.drawImage(s.c, s.x0 - s.pad, s.y0 - s.pad, s.w + s.pad * 2, s.h + s.pad * 2);
  ctx.globalAlpha = a;
}
/**
 * every part of a cut-parts manifest (the default export of <out>/parts.js) as sprites, keyed by name.
 * o = { px: stage px per sheet px (scale), pivots: { name: [x, y] (sheet px) | 'top' | 'bottom' | 'center' | 'left' | 'right' }, pivot: default 'center', shadow, res }
 * 'top' / 'bottom' put the pin half a limb-width in from that end (where a paper fastener would go); s.joint = the far end's pin.
 */
export async function parts(man, o = {}) {
  const out = {};
  for (const [name, p] of Object.entries(man)) {
    const kw = (o.pivots || {})[name] ?? o.pivot ?? 'center', inset = Math.min(p.w, p.h) * .42;
    const pv = Array.isArray(kw) ? kw : kw === 'top' ? [p.w / 2, inset] : kw === 'bottom' ? [p.w / 2, p.h - inset] : kw === 'left' ? [inset, p.h / 2] : kw === 'right' ? [p.w - inset, p.h / 2] : [p.w / 2, p.h / 2];
    const s = await image(p.src, { pivot: pv, px: o.px ?? 1, res: o.res, shadow: o.shadow ?? 7 });
    const px = o.px ?? 1;
    s.joint = kw === 'top' ? [0, (p.h - 2 * inset) * px] : kw === 'bottom' ? [0, -(p.h - 2 * inset) * px] : kw === 'left' ? [(p.w - 2 * inset) * px, 0] : kw === 'right' ? [-(p.w - 2 * inset) * px, 0] : [0, 0];
    s.name = name; out[name] = s;
  }
  return out;
}
/** a darker copy of a sprite (the far arm / leg of a puppet cut from one drawing) */
export function darker(s, k = .78) {
  const c = mk(s.c.width, s.c.height), x = c.getContext('2d'); x.filter = `brightness(${k}) saturate(.9)`; x.drawImage(s.c, 0, 0);
  const d = { ...s, c }; if (s.sh) d.sh = s.sh; return d;
}

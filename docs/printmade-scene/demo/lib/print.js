// printmade-scene · print.js — the media. Everything in a plate is made of these: flat ink laid with a ragged edge, the
// mottle and speckle of a dry print, scratched hatching, wood grain, chalky light cones, crimson blots, and one print
// pass over the whole plate (paper tooth + grain + knocked-out specks). Seeded only: the same seed is the same print.

// ── numbers ──
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
export const TAU = Math.PI * 2;
export function rng(seed = 1) {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const hash = (x, y, s = 0) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2147483647)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function noise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbm = (x, y, s = 0, o = 4) => { let v = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { v += a * noise(x * f, y * f, s + i * 17); a *= .5; f *= 2; } return v / (1 - Math.pow(.5, o)); };

// ── colour ──
export function rgb(hex) { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export const css = ([r, g, b], a = 1) => a >= 1 ? `rgb(${r | 0},${g | 0},${b | 0})` : `rgba(${r | 0},${g | 0},${b | 0},${a})`;
export const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join(''); };
export const shade = (hex, k) => k < 0 ? mix(hex, '#000000', -k) : mix(hex, '#ffffff', k);
export const alpha = (hex, a) => css(rgb(hex), a);
export function hsl(hex) { const [r, g, b] = rgb(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; }

export function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

// ── ragged geometry: nothing in a print is ruled ──
/** rough(pts, o) — subdivide a polygon and nudge every point by noise (o.amp px, o.step px, o.seed, o.closed). */
export function rough(pts, o = {}) {
  const amp = o.amp ?? 1.6, step = o.step ?? 14, s = o.seed ?? 1, closed = o.closed ?? true, out = [];
  const n = pts.length, segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n], L = Math.hypot(x1 - x0, y1 - y0), k = Math.max(1, Math.round(L / step));
    for (let j = 0; j < k; j++) { const t = j / k, x = lerp(x0, x1, t), y = lerp(y0, y1, t); out.push([x + (noise(x * .07, y * .07, s) - .5) * 2 * amp, y + (noise(x * .07 + 40, y * .07, s) - .5) * 2 * amp]); }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}
export const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export function ellipsePts(cx, cy, rx, ry, n = 40, a0 = 0, a1 = TAU) { const p = []; for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; }
export function path(ctx, pts, closed = true) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); if (closed) ctx.closePath(); }
export function bounds(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }

// ── the media ──
/**
 * ink(ctx, pts, color, o) — one flat colour pulled from a block: a ragged edge, a mottled body (darker and lighter
 * blotches, as ink sits unevenly), dry speckle near the edges. o: seed, amp (edge), mottle (0–1), speck (0–1), rough:false
 */
export function ink(ctx, pts, color, o = {}) {
  const s = o.seed ?? 3, P = o.rough === false ? pts : rough(pts, { amp: o.amp ?? 1.4, step: o.step ?? 12, seed: s });
  ctx.save(); path(ctx, P); ctx.fillStyle = color; ctx.fill();
  if ((o.mottle ?? .6) > 0 || (o.speck ?? .5) > 0) { ctx.clip(); mottle(ctx, bounds(P), color, { seed: s, mottle: o.mottle ?? .6, speck: o.speck ?? .5, scale: o.scale }); }
  ctx.restore(); return P;
}
/** mottle(ctx, box, color, o) — uneven ink inside the current clip: soft blotches ± and fine speckle. */
export function mottle(ctx, b, color, o = {}) {
  const r = rng((o.seed ?? 1) * 97 + 5), m = o.mottle ?? .6, sp = o.speck ?? .5, sc = o.scale ?? 1, area = b.w * b.h;
  const dark = shade(color, -.18), light = shade(color, .14);
  const nb = Math.min(260, area / (2600 * sc * sc) * m | 0);
  for (let i = 0; i < nb; i++) { const x = b.x + r() * b.w, y = b.y + r() * b.h, R = (14 + r() * 40) * sc; const g = ctx.createRadialGradient(x, y, 0, x, y, R); const c = r() < .55 ? dark : light; g.addColorStop(0, alpha(c, .22 * m)); g.addColorStop(1, alpha(c, 0)); ctx.fillStyle = g; ctx.fillRect(x - R, y - R, 2 * R, 2 * R); }
  const ns = Math.min(9000, area / (90 * sc) * sp | 0);
  for (let i = 0; i < ns; i++) { const x = b.x + r() * b.w, y = b.y + r() * b.h, z = (r() * 1.6 + .5) * sc; ctx.fillStyle = r() < .5 ? alpha(dark, .35 + r() * .3) : alpha(light, .3 + r() * .35); ctx.fillRect(x, y, z, z * (.6 + r())); }
}
/** speckle(ctx, box, color, density, o) — scattered specks (paper showing through, or a speckled cloth). */
export function speckle(ctx, b, color, density = .5, o = {}) {
  const r = rng((o.seed ?? 2) * 31 + 7), n = Math.min(20000, b.w * b.h / 60 * density | 0), z = o.size ?? 1.6;
  ctx.fillStyle = color; for (let i = 0; i < n; i++) { const s = (.4 + r()) * z; ctx.globalAlpha = (o.alpha ?? .7) * (.4 + r() * .6); ctx.fillRect(b.x + r() * b.w, b.y + r() * b.h, s, s * (.5 + r())); }
  ctx.globalAlpha = 1;
}
/** hatch(ctx, box, o) — scratched parallel strokes (shadow on wood, rain on glass, a dark corner). Clip first. */
export function hatch(ctx, b, o = {}) {
  const r = rng((o.seed ?? 4) * 13 + 1), a = o.angle ?? -1.1, gap = o.gap ?? 7, len = o.len ?? 26, ca = Math.cos(a), sa = Math.sin(a);
  ctx.strokeStyle = o.color ?? 'rgba(30,24,22,.35)'; ctx.lineWidth = o.width ?? 1; ctx.lineCap = 'round';
  const n = Math.min(6000, (b.w * b.h) / (gap * len * .5) * (o.density ?? .5) | 0);
  ctx.beginPath();
  for (let i = 0; i < n; i++) { const x = b.x + r() * b.w, y = b.y + r() * b.h, l = len * (.4 + r() * .8); ctx.moveTo(x, y); ctx.lineTo(x + ca * l + (r() - .5) * 2, y + sa * l + (r() - .5) * 2); }
  ctx.stroke();
}
/** grain(ctx, pts, o) — wood grain: long wavering lines along o.dir ('h' | 'v'), knots now and then. */
export function grain(ctx, pts, o = {}) {
  const b = bounds(pts), s = o.seed ?? 5, r = rng(s * 7 + 3), gap = o.gap ?? 6, H = o.dir === 'v';
  ctx.save(); path(ctx, pts); ctx.clip(); ctx.strokeStyle = o.color ?? 'rgba(40,26,18,.45)'; ctx.lineWidth = o.width ?? 1;
  const span = H ? b.w : b.h, run = H ? b.h : b.w;
  for (let k = 0; k < span; k += gap * (.6 + r() * .8)) {
    ctx.beginPath(); ctx.globalAlpha = .35 + r() * .5;
    for (let u = -4; u <= run + 4; u += 6) { const w = (noise(u * .012, k * .05, s) - .5) * gap * 1.6, X = H ? b.x + k + w : b.x + u, Y = H ? b.y + u : b.y + k + w; u < 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.restore();
}
/** cone(ctx, x, y, w, h, a) — a chalky cone of light from a small lamp at (x, y), spreading down to width w. */
export function cone(ctx, x, y, w, h, a = .5, seed = 6) {
  ctx.save(); path(ctx, [[x - 4, y], [x + 4, y], [x + w / 2, y + h], [x - w / 2, y + h]]); ctx.clip();
  const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, `rgba(255,252,240,${a})`); g.addColorStop(1, 'rgba(255,252,240,0)');
  ctx.fillStyle = g; ctx.fillRect(x - w / 2, y, w, h);
  speckle(ctx, { x: x - w / 2, y, w, h: h * .7 }, '#ffffff', .25, { seed, alpha: a * .6, size: 1.2 });
  ctx.restore();
}
/** blot(ctx, x, y, rx, ry, color, o) — a ragged soft-edged blot (a ground shadow, a damp patch). */
export function blot(ctx, x, y, rx, ry, color, o = {}) {
  const P = rough(ellipsePts(x, y, rx, ry, 36), { amp: o.amp ?? Math.min(rx, ry) * .18, step: 6, seed: o.seed ?? 8 });
  ctx.save(); ctx.globalAlpha = o.alpha ?? .55; path(ctx, P); ctx.fillStyle = color; ctx.fill(); ctx.restore();
}
/**
 * stain(ctx, x, y, r, color, o) — the accent mark: a splash with a few satellite drops, or o.drips (runs downward).
 * o.k (0–1) grows it from nothing (for a reveal). Keep the accent on the story's clue, nowhere else.
 */
export function stain(ctx, x, y, R, color, o = {}) {
  const r = rng((o.seed ?? 9) * 11 + 2), k = o.k ?? 1; if (k <= 0) return;
  ctx.save(); ctx.fillStyle = color;
  const lobes = 7 + (r() * 5 | 0), P = [];
  for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, w = 1 + .35 * Math.sin(a * lobes + r() * 6) * (.5 + .5 * noise(a * 3, 1, o.seed ?? 9)); P.push([x + Math.cos(a) * R * k * w * (o.sx ?? 1), y + Math.sin(a) * R * k * w * (o.sy ?? .7)]); }
  path(ctx, P); ctx.fill();
  const nd = o.drops ?? 6; for (let i = 0; i < nd; i++) { const a = r() * TAU, d = R * (1.2 + r() * 1.4) * k, s = R * (.08 + r() * .14) * k; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * d * (o.sx ?? 1), y + Math.sin(a) * d * .6, s * 1.4, s, a, 0, TAU); ctx.fill(); }
  if (o.drips) for (let i = 0; i < o.drips; i++) { const dx = (r() - .5) * R * 1.4, L = R * (.6 + r() * 1.6) * smooth(k * 1.3 - .3), w = R * (.07 + r() * .08); ctx.fillRect(x + dx - w / 2, y, w, L); ctx.beginPath(); ctx.arc(x + dx, y + L, w * .9, 0, TAU); ctx.fill(); }
  ctx.restore();
}
/** scratches(ctx, box, o) — white scratch marks across glass or sky: rain, glare, or a scraped plate. */
export function scratches(ctx, b, o = {}) {
  const r = rng((o.seed ?? 10) * 5 + 1), a = o.angle ?? 1.15, n = o.n ?? Math.round(b.w * b.h / 2200), ca = Math.cos(a), sa = Math.sin(a);
  ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip(); ctx.strokeStyle = o.color ?? 'rgba(255,255,255,.55)'; ctx.lineWidth = o.width ?? 1.1; ctx.lineCap = 'round';
  ctx.beginPath(); const off = o.offset ?? 0;
  for (let i = 0; i < n; i++) { const L = (o.len ?? 22) * (.4 + r()), x = b.x + ((r() * b.w + off * ca * 3) % b.w + b.w) % b.w, y = b.y + ((r() * b.h + off * sa * 3) % b.h + b.h) % b.h; ctx.moveTo(x, y); ctx.lineTo(x + ca * L, y + sa * L); }
  ctx.stroke(); ctx.restore();
}

// ── the print pass ──
/**
 * printPass(ctx, W, H, o) — run once over a finished plate: paper tooth, low mottle, fine grain, knocked-out specks
 * and a faint dark speckle. This is what makes the flat colours read as printed rather than filled.
 * o: seed, tooth (.06), mottle (.07), grain (.09), knock (.0016), paper '#efe7d4'
 */
export function printPass(ctx, W, H, o = {}) {
  const s = o.seed ?? 11, img = ctx.getImageData(0, 0, W, H), d = img.data, P = rgb(o.paper ?? '#efe7d4');
  const tooth = o.tooth ?? .07, mot = o.mottle ?? .08, gr = o.grain ?? .13, knock = o.knock ?? .0028, sc = W / 1440;
  const lowW = 64, lowH = Math.ceil(64 * H / W), low = new Float32Array(lowW * lowH);
  for (let y = 0; y < lowH; y++) for (let x = 0; x < lowW; x++) low[y * lowW + x] = fbm(x * .18, y * .18, s, 3) - .5;
  const r = rng(s * 3 + 1);
  for (let y = 0; y < H; y++) {
    const ly = y / H * (lowH - 1), y0 = ly | 0, fy = ly - y0;
    for (let x = 0; x < W; x++) {
      const lx = x / W * (lowW - 1), x0 = lx | 0, fx = lx - x0, i = (y * W + x) * 4;
      const m = (low[y0 * lowW + x0] * (1 - fx) + low[y0 * lowW + x0 + 1] * fx) * (1 - fy) + (low[Math.min(lowH - 1, y0 + 1) * lowW + x0] * (1 - fx) + low[Math.min(lowH - 1, y0 + 1) * lowW + x0 + 1] * fx) * fy;
      const tx = hash((x / sc) | 0, (y / sc) | 0, s), th = hash((x / (2 * sc)) | 0, (y / (5 * sc)) | 0, s + 1);
      const k = 1 + m * mot * 2 + (tx - .5) * gr + (th - .5) * tooth;
      d[i] = clamp(d[i] * k, 0, 255); d[i + 1] = clamp(d[i + 1] * k, 0, 255); d[i + 2] = clamp(d[i + 2] * k, 0, 255);
    }
  }
  // knocked-out specks (paper through the ink) and a few dark ones
  const n = W * H * knock | 0;
  for (let j = 0; j < n; j++) { const x = r() * W | 0, y = r() * H | 0, z = 1 + (r() * 2.2 * sc | 0), dark = r() < .25; for (let yy = y; yy < Math.min(H, y + z); yy++) for (let xx = x; xx < Math.min(W, x + z + (r() < .5 ? 1 : 0)); xx++) { const i = (yy * W + xx) * 4, a = .45 + r() * .4; if (dark) { d[i] *= .55; d[i + 1] *= .55; d[i + 2] *= .55; } else { d[i] = lerp(d[i], P[0], a); d[i + 1] = lerp(d[i + 1], P[1], a); d[i + 2] = lerp(d[i + 2], P[2], a); } } }
  ctx.putImageData(img, 0, 0);
}

/** grainTile(seed, size) — a small speckle tile for things that move (figures): used as a pattern anchored to the body. */
export function grainTile(seed = 12, size = 128) {
  const c = canvas(size, size), g = c.getContext('2d'), r = rng(seed);
  for (let i = 0; i < size * size / 9; i++) { const x = r() * size, y = r() * size, z = .6 + r() * 1.4; g.fillStyle = r() < .5 ? `rgba(255,250,235,${.12 + r() * .22})` : `rgba(20,14,12,${.1 + r() * .22})`; g.fillRect(x, y, z, z * (.5 + r())); }
  return c;
}

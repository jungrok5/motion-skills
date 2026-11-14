// speedpaint-replay · brush.js — how one item is put on the canvas at progress u (0 → nothing, 1 → done).
//   pen     tapered ink line: width follows pen pressure (thin in, full, thin out) with a small wobble; drawn as a filled
//           outline so it stays crisp at any scale
//   pencil  the rough: thin, even, light blue line
//   fill    a region painted in by a brush that sweeps back and forth across it (the ragged edge you see in a speedpaint),
//           optional clip to other regions (a clipping layer), blend mode, blur, colour or gradient
//   fade    a region or effect that fades in (glows, colour grades in the finish)
import { clamp, lerp, lengths, at, bbox, noise1, normals } from './core.js';

// ---------- preparation (once per item, when the art is built) ----------
export function prepStroke(it) {
  it.cum = lengths(it.pts); it.L = it.cum[it.cum.length - 1] || 1;
  it.nrm = normals(it.pts);
  it.box = bbox(it.pts);
  return it;
}

// zig-zag brush path that covers a region: scanlines at `angle`, each trimmed to the region's extent on that line
export function prepFill(it) {
  const pts = it.pts; it.box = bbox(pts);
  const a = it.angle ?? -0.5, c = Math.cos(a), s = Math.sin(a);
  const rot = pts.map(([x, y]) => [x * c + y * s, -x * s + y * c]);          // into brush space (u along the stroke)
  const b = bbox(rot);
  const bw = it.brush ?? clamp(Math.min(it.box.w, it.box.h) * .28, 10, 60);   // brush width in art units
  it.brush = bw;
  const sp = bw * .72, path = [];
  let dir = 1;
  for (let v = b.y + sp * .4; v < b.y + b.h + sp * .4; v += sp) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < rot.length; i++) {
      const p = rot[i], q = rot[(i + 1) % rot.length];
      if ((p[1] <= v && q[1] > v) || (q[1] <= v && p[1] > v)) { const u = p[0] + (v - p[1]) / (q[1] - p[1]) * (q[0] - p[0]); lo = Math.min(lo, u); hi = Math.max(hi, u); }
    }
    const vv = clamp(v, b.y + 1, b.y + b.h - 1);
    if (lo === Infinity) { // the scanline missed (thin ends): use the nearest vertices
      for (const p of rot) if (Math.abs(p[1] - vv) < sp) { lo = Math.min(lo, p[0]); hi = Math.max(hi, p[0]); }
      if (lo === Infinity) continue;
    }
    const seg = dir > 0 ? [[lo - bw * .2, vv], [hi + bw * .2, vv]] : [[hi + bw * .2, vv], [lo - bw * .2, vv]];
    path.push(...seg); dir = -dir;
  }
  if (!path.length) path.push([b.cx, b.cy], [b.cx + 1, b.cy]);
  // back to art space, densified with a little hand wobble
  const back = ([u, v]) => [u * c - v * s, u * s + v * c];
  const dense = [];
  for (let i = 0; i < path.length; i++) {
    if (i === 0) { const b = back(path[0]); dense.push([clamp(b[0], 0, 1000), clamp(b[1], 0, 1000)]); continue; }   // the brush stays on the picture
    const p = path[i - 1], q = path[i], L = Math.hypot(q[0] - p[0], q[1] - p[1]), k = Math.max(1, Math.ceil(L / 8));
    for (let j = 1; j <= k; j++) { const u = j / k, b = back([lerp(p[0], q[0], u), lerp(p[1], q[1], u) + noise1((i * 31 + j) * .35, it.seed || 3) * bw * .12]); dense.push([clamp(b[0], 0, 1000), clamp(b[1], 0, 1000)]); }
  }
  it.sweep = dense; it.sweepCum = lengths(dense); it.sweepL = it.sweepCum[it.sweepCum.length - 1] || 1;
  it.path = toPath(pts, true);
  return it;
}

export function toPath(pts, closed) {
  const p = new Path2D(); pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); if (closed) p.closePath(); return p;
}

// ---------- drawing ----------
// pressure profile along the stroke: thin in, full, thin out (taper = [in, out] as fractions of the length)
function width(it, s) {
  const L = it.L, [ti, to] = it.taper || [.18, .3], floor = it.floor ?? .12;
  const a = ti > 0 ? clamp(s / (ti * L)) : 1, b = to > 0 ? clamp((L - s) / (to * L)) : 1;
  const p = floor + (1 - floor) * Math.pow(a, .7) * Math.pow(b, .8);
  return it.w * p * (1 + (it.wobble ?? .12) * noise1(s / 18, it.seed || 1));
}

export function pen(ctx, it, u = 1) {
  const sCut = it.L * clamp(u); if (sCut <= .3) return null;
  const left = [], right = [];
  for (let i = 0; i < it.pts.length; i++) {
    const s = it.cum[i];
    if (s > sCut) break;
    const w = width(it, s) / 2, [x, y] = it.pts[i], [nx, ny] = it.nrm[i];
    left.push([x + nx * w, y + ny * w]); right.push([x - nx * w, y - ny * w]);
  }
  const tip = at(it.pts, it.cum, sCut);
  ctx.beginPath();
  left.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.lineTo(tip[0], tip[1]);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fillStyle = it.color; ctx.globalAlpha = it.alpha ?? 1;
  ctx.fill();
  ctx.globalAlpha = 1;
  return tip;
}

export function pencil(ctx, it, u = 1) {
  const sCut = it.L * clamp(u); if (sCut <= .3) return null;
  ctx.beginPath();
  let i = 0;
  for (; i < it.pts.length && it.cum[i] <= sCut; i++) i ? ctx.lineTo(it.pts[i][0], it.pts[i][1]) : ctx.moveTo(it.pts[i][0], it.pts[i][1]);
  const tip = at(it.pts, it.cum, sCut); ctx.lineTo(tip[0], tip[1]);
  ctx.strokeStyle = it.color; ctx.lineWidth = it.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha = it.alpha ?? 1; ctx.stroke(); ctx.globalAlpha = 1;
  return tip;
}

export function paintStyle(ctx, f) {
  if (typeof f === 'string') return f;
  let g;
  if (f.linear) g = ctx.createLinearGradient(...f.linear);
  else if (f.radial) { const [x, y, r0, r1] = f.radial.length === 3 ? [f.radial[0], f.radial[1], 0, f.radial[2]] : f.radial; g = ctx.createRadialGradient(x, y, r0, x, y, r1); }
  for (const [o, c] of f.stops) g.addColorStop(o, c);
  return g;
}

// device-pixel box an item can touch (its outline + blur + brush), so scratch work stays small
export function devBox(it, k, W, H) {
  const pad = ((it.blur || 0) * 3 + (it.brush || 0) * .8 + 4) * k, b = it.box;
  const x0 = Math.max(0, Math.floor(b.x * k - pad)), y0 = Math.max(0, Math.floor(b.y * k - pad));
  const x1 = Math.min(W, Math.ceil((b.x + b.w) * k + pad)), y1 = Math.min(H, Math.ceil((b.y + b.h) * k + pad));
  return x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : null;
}

// a fill item, whole and unclipped: straight onto the art
export function fillWhole(ctx, it, alphaMul = 1) {
  ctx.save();
  ctx.globalCompositeOperation = it.mode || 'source-over';
  ctx.globalAlpha = (it.alpha ?? 1) * alphaMul;
  if (it.blur) ctx.filter = `blur(${it.blur * ctx.getTransform().a}px)`;
  ctx.fillStyle = paintStyle(ctx, it.fill);
  ctx.fill(it.path);
  ctx.restore();
}

// a fill item through the scratch canvas: painted in by the sweeping brush up to u, kept only where `mask` (the
// visible part of the regions it is clipped to) is, then laid onto the art with its blend mode. Returns the brush tip.
export function fillVia(ctx, tmp, it, u, mask, alphaMul = 1) {
  const T = ctx.getTransform(), k = T.a, box = devBox(it, k, tmp.width, tmp.height);
  const sweeping = u < 1 && it.reveal !== 'fade';
  const sCut = it.sweepL * clamp(u), tip = sweeping ? at(it.sweep, it.sweepCum, sCut) : null;
  // nothing painted yet (an empty brush mask would be skipped by the browser and let the whole region flash in)
  if (!box || (sweeping && sCut < .5)) return tip;
  const [bx, by, bw, bh] = box, g = tmp.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none';
  g.clearRect(bx, by, bw, bh);
  g.save(); g.beginPath(); g.rect(bx, by, bw, bh); g.clip();
  g.setTransform(T);
  if (it.blur) g.filter = `blur(${it.blur * k}px)`;
  g.fillStyle = paintStyle(g, it.fill); g.fill(it.path);
  g.filter = 'none';
  if (sweeping) {
    g.globalCompositeOperation = 'destination-in';
    g.beginPath();
    for (let i = 0; i < it.sweep.length && it.sweepCum[i] <= sCut; i++) i ? g.lineTo(it.sweep[i][0], it.sweep[i][1]) : g.moveTo(it.sweep[i][0], it.sweep[i][1]);
    g.lineTo(tip[0], tip[1]);
    g.lineWidth = it.brush * 1.25; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#000';
    if (it.blur) g.filter = `blur(${Math.min(it.blur, it.brush * .3) * k}px)`;
    g.stroke(); g.filter = 'none';
  }
  if (mask) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-in'; g.drawImage(mask, bx, by, bw, bh, bx, by, bw, bh); }
  g.restore();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = it.mode || 'source-over';
  ctx.globalAlpha = (it.alpha ?? 1) * alphaMul;
  ctx.drawImage(tmp, bx, by, bw, bh, bx, by, bw, bh);
  ctx.restore();
  return tip;
}

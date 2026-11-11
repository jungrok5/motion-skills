// The hand that draws: seeded randomness and the few marks every thing on the sheet is made of — a tapered stroke with
// dry-brush gaps, a wet wash, a ridge that fades downward, a leaf, a dot. Things draw with these (and nothing else), in
// the colours of `INK`, so everything a world adds keeps one line, one palette and one way of moving.
//
// Colours are what the pigment looks like on white paper; the sheet multiplies them onto the paper and turns them pale
// at night. Draw with alpha for thin ink. All sizes are world units (the sheet is about 1778 × 1000 at 16:9).

export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ease = t => { t = clamp(t); return 1 - Math.pow(1 - t, 3); };
/** shortest signed difference between two angles */
export const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

/** seeded random source: r() 0…1, r.range(a, b), r.pick(list), r.sign(), r.fork(n) for an independent stream */
export function rng(seed = 1) {
  let s = (seed >>> 0) || 1;
  const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.range = (a, b) => a + (b - a) * r(); r.pick = l => l[Math.floor(r() * l.length)]; r.sign = () => r() < .5 ? -1 : 1;
  r.fork = n => rng(Math.imul(seed + 1, 2654435761) + n * 97);
  return r;
}
export const hash = (x, y = 0) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** smooth value noise, 0…1 */
export function noise(x, y = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
}

/** the palette a world is given (see InkWorld `pigments`); things use these names instead of raw colours */
export const INK = { black: '#16130f', grey: '#5d5850', pale: '#a9a294', red: '#b3261e', blue: '#2f6f6a', gold: '#b98a2c' };
export const rgba = (hex, a = 1) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

/**
 * A brush stroke along points [[x, y], …]. w is the widest width; `taper` [start, end] 0…1 is how much of the width
 * the ends keep; `dry` 0…1 splits the stroke into bristles with gaps (0 = wet and solid); `press` (i/n → 0…1) overrides
 * the width profile. Seeded, so a stroke looks the same every frame.
 */
export function stroke(ctx, pts, { w = 10, color = INK.black, alpha = 1, taper = [.25, .05], dry = 0, seed = 1, press } = {}) {
  const n = pts.length; if (n < 2) return;
  const L = [], Rr = [], prof = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const t = i / (n - 1), p = press ? press(t) : Math.min(1, lerp(taper[0], 1, smooth(0, .22, t)), lerp(taper[1], 1, smooth(1, .55, t)));
    const hw = w * .5 * p * (1 + (noise(seed * 7.1 + t * 6) - .5) * .25); prof.push(hw);
    L.push([pts[i][0] - dy * hw, pts[i][1] + dx * hw]); Rr.push([pts[i][0] + dy * hw, pts[i][1] - dx * hw]);
  }
  ctx.fillStyle = rgba(color, alpha);
  if (dry <= 0) { ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]); for (let i = n - 1; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]); ctx.closePath(); ctx.fill(); return; }
  // bristles: thin ribbons across the width, each broken where its own noise runs dry
  const hairs = Math.max(3, Math.round(w / 2.2));
  for (let h = 0; h < hairs; h++) {
    const u0 = h / hairs, u1 = (h + .82) / hairs, thr = dry * (.35 + .9 * hash(seed, h)); let open = false;
    ctx.beginPath();
    for (let i = 0; i < n - 1; i++) {
      const t = i / (n - 1), wetHere = noise(seed * 3.3 + h * 1.7, t * (4 + n * .12)) + (1 - t) * .25 * (1 - dry) > thr;
      if (!wetHere) continue;
      const a0 = [lerp(L[i][0], Rr[i][0], u0), lerp(L[i][1], Rr[i][1], u0)], a1 = [lerp(L[i][0], Rr[i][0], u1), lerp(L[i][1], Rr[i][1], u1)];
      const b0 = [lerp(L[i + 1][0], Rr[i + 1][0], u0), lerp(L[i + 1][1], Rr[i + 1][1], u0)], b1 = [lerp(L[i + 1][0], Rr[i + 1][0], u1), lerp(L[i + 1][1], Rr[i + 1][1], u1)];
      ctx.moveTo(a0[0], a0[1]); ctx.lineTo(b0[0], b0[1]); ctx.lineTo(b1[0], b1[1]); ctx.lineTo(a1[0], a1[1]); ctx.closePath(); open = true;
    }
    if (open) ctx.fill();
  }
}

/** a wet wash: a soft blob of thin ink, (rx, ry) radii; several overlapping pools so its edge is uneven */
export function wash(ctx, x, y, rx, ry, { color = INK.black, alpha = .3, seed = 1, pools = 5 } = {}) {
  for (let i = 0; i < pools; i++) {
    const ox = (hash(seed, i) - .5) * rx * .9, oy = (hash(seed + 9, i) - .5) * ry * .9, k = .55 + hash(seed + 5, i) * .5;
    ctx.save(); ctx.translate(x + ox, y + oy); ctx.scale(rx * k, ry * k);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, rgba(color, alpha * .55)); g.addColorStop(.6, rgba(color, alpha * .3)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore();
  }
}

/**
 * A ridge: the top edge [[x, y], …] is drawn firm and the ink thins out downward over `depth` — hills, islands, banks,
 * roofs, anything that stands on mist. `rim` adds the dry line along the crest.
 */
export function ridge(ctx, top, { depth = 160, color = INK.black, alpha = .5, rim = .5, seed = 1 } = {}) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity;
  for (const p of top) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); }
  const yb = Math.max(...top.map(p => p[1])) + depth;
  const g = ctx.createLinearGradient(0, y0, 0, yb); g.addColorStop(0, rgba(color, alpha)); g.addColorStop(.45, rgba(color, alpha * .45)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(top[0][0], yb);
  for (const p of top) ctx.lineTo(p[0], p[1]);
  ctx.lineTo(top[top.length - 1][0], yb); ctx.closePath(); ctx.fill();
  if (rim > 0) stroke(ctx, top, { w: 5 + depth * .012, color, alpha: alpha * rim * 1.2, dry: .45, seed, taper: [.1, .1] });
}

/** a leaf or blade: from (x, y) along angle `a`, length `len`, belly width `w` — bamboo, reed, willow, grass, feather */
export function leaf(ctx, x, y, a, len, w, { color = INK.black, alpha = 1, bend = 0 } = {}) {
  const c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c, mx = x + c * len * .45 + nx * bend, my = y + s * len * .45 + ny * bend, ex = x + c * len + nx * bend * 1.6, ey = y + s * len + ny * bend * 1.6;
  ctx.fillStyle = rgba(color, alpha); ctx.beginPath(); ctx.moveTo(x, y);
  ctx.quadraticCurveTo(mx + nx * w, my + ny * w, ex, ey); ctx.quadraticCurveTo(mx - nx * w * .55, my - ny * w * .55, x, y); ctx.fill();
}

/** a dot or disc of ink, slightly uneven (moss, eyes, buds, drops, a sun) */
export function dot(ctx, x, y, r, { color = INK.black, alpha = 1, seed = 1 } = {}) {
  const n = Math.max(10, Math.round(r * .9)), wob = r > 12 ? .05 : .3; ctx.fillStyle = rgba(color, alpha); ctx.beginPath();
  for (let i = 0; i <= n; i++) { const a = i / n * TAU, k = r * (1 - wob / 2 + noise(seed * 3.1 + Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + 5) * wob); i ? ctx.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k) : ctx.moveTo(x + Math.cos(a) * k, y + Math.sin(a) * k); }
  ctx.fill();
}

/** a disc of light for the light layer: a core and a halo (moon, lantern, firefly, spark) */
export function glow(ctx, x, y, r, { color = '#fff6da', alpha = 1, core = .35 } = {}) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(color, alpha)); g.addColorStop(core, rgba(color, alpha * .55)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

/** points along a smooth curve through the given points (Catmull-Rom), `per` samples per span */
export function curve(pts, per = 6) {
  const out = [], n = pts.length; if (n < 3) return pts.slice();
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  out.push(pts[n - 1]); return out;
}

/** the paper itself: a tile the sheet shader repeats — r tooth (ink granulates in it) · g clouds (uneven tone) · b speckle */
export function paperTile(size = 512, seed = 7) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'), r = rng(seed);
  const tn = (px, py, per, s) => { const xi = Math.floor(px), yi = Math.floor(py), xf = px - xi, yf = py - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), h = (a, b) => hash(((a % per) + per) % per + s * 131, ((b % per) + per) % per + s * 17);
    return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v); };
  const img = x.createImageData(size, size), d = img.data;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const k = (j * size + i) * 4, u = i / size, v = j / size;
    const cloud = tn(u * 3, v * 3, 3, seed) * .55 + tn(u * 7, v * 7, 7, seed + 1) * .3 + tn(u * 16, v * 16, 16, seed + 2) * .15;
    const tooth = tn(u * 96, v * 96, 96, seed + 3) * .5 + tn(u * 220, v * 220, 220, seed + 4) * .5;
    d[k] = tooth * 255; d[k + 1] = clamp(cloud) * 255; d[k + 2] = hash(i + seed, j) * 255; d[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  x.lineCap = 'round'; x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < size * .9; i++) {                                   // a few long fibres, only a little lighter than the sheet
    const px = r() * size, py = r() * size, a = r() * TAU, len = 14 + r() * 46;
    x.strokeStyle = `rgba(${26 + r() * 30 | 0},${8 + r() * 10 | 0},0,1)`; x.lineWidth = .5 + r() * .7;
    for (const [ox, oy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
      x.beginPath(); x.moveTo(px + ox, py + oy); x.quadraticCurveTo(px + ox + Math.cos(a) * len * .5 + (r() - .5) * 10, py + oy + Math.sin(a) * len * .5 + (r() - .5) * 10, px + ox + Math.cos(a) * len, py + oy + Math.sin(a) * len); x.stroke();
    }
  }
  return c;
}

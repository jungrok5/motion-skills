// lib/kit.js — the shared toolbox: seeded randomness, noise, geometry, colour, paper tiles, blur.
// Pure functions only (no clock, no Math.random), so every picture redraws to the same pixels.
// Pieces use the geometry to build their subject; styles use all of it to make their marks.

// ------------------------------------------------------------------ numbers
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
export const lerp = (a, b, t) => a + (b - a) * t
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t) }
export const TAU = Math.PI * 2

/** mulberry32: a seeded stream in [0, 1) */
export function rng(seed = 1) {
  let s = (Math.floor(seed * 9973) ^ 0x9e3779b9) >>> 0
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const hash2 = (seed, x, y) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296 }
/** smooth value noise in [0,1]; `period` (in noise cells) makes it tile */
export function noise(seed, x, y, period = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi
  const w = (p) => (period ? ((p % period) + period) % period : p)
  const a = hash2(seed, w(xi), w(yi)), b = hash2(seed, w(xi + 1), w(yi)), c = hash2(seed, w(xi), w(yi + 1)), d = hash2(seed, w(xi + 1), w(yi + 1))
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
/** fractal noise in [0,1]: `freq` cells per px */
export function fbm(seed, x, y, freq = 0.01, oct = 4, period = 0) {
  let s = 0, amp = 0.5, f = freq, n = 0
  for (let i = 0; i < oct; i++) {
    const cells = period ? Math.max(1, Math.round(period * f)) : 0, ff = period ? cells / period : f // a tile needs a whole number of cells
    s += amp * noise(seed + i * 131, x * ff, y * ff, cells); n += amp; amp *= 0.5; f *= 2
  }
  return s / n
}

// ------------------------------------------------------------------ geometry (points are [x, y])
export const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1])
export const lerpP = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
export function bbox(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }
}
export const area = (s) => { let a = 0; for (let i = 0; i < s.length; i++) { const p = s[i], q = s[(i + 1) % s.length]; a += p[0] * q[1] - q[0] * p[1] } return a / 2 }
export const length = (s, closed = false) => { let L = 0; for (let i = 1; i < s.length; i++) L += dist(s[i - 1], s[i]); if (closed && s.length > 1) L += dist(s[s.length - 1], s[0]); return L }
export function centroid(s) { let x = 0, y = 0; for (const p of s) { x += p[0]; y += p[1] } return [x / s.length, y / s.length] }
export function inside(pts, x, y) {
  let c = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}
/** Catmull-Rom through the points, about one point every `step` px */
export function smooth(pts, closed = false, step = 8) {
  const n = pts.length
  if (n < 3) return pts.slice()
  const out = [], P = (i) => (closed ? pts[((i % n) + n) % n] : pts[clamp(i, 0, n - 1)])
  const segs = closed ? n : n - 1
  for (let i = 0; i < segs; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), k = Math.max(1, Math.ceil(dist(p1, p2) / step))
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t
      out.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)))
    }
  }
  if (!closed) out.push(pts[n - 1].slice())
  return out
}
/** n points evenly spaced by arc length */
export function resample(s, n, closed = false) {
  const pts = closed ? [...s, s[0]] : s, cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]))
  const L = cum[cum.length - 1] || 1, out = []
  let j = 1
  const N = closed ? n : n - 1
  for (let k = 0; k < n; k++) {
    const d = (L * k) / N
    while (j < pts.length - 1 && cum[j] < d) j++
    out.push(lerpP(pts[j - 1], pts[j], clamp((d - cum[j - 1]) / (cum[j] - cum[j - 1] || 1))))
  }
  return out
}
/** the first fraction `k` of a polyline, cut by length */
export function upTo(s, k) {
  if (k >= 1) return s
  if (k <= 0 || s.length < 2) return s.slice(0, 1)
  const L = length(s) * k, out = [s[0]]
  let acc = 0
  for (let i = 1; i < s.length; i++) {
    const d = dist(s[i - 1], s[i])
    if (acc + d >= L) { out.push(lerpP(s[i - 1], s[i], (L - acc) / (d || 1))); return out }
    acc += d; out.push(s[i])
  }
  return out
}
export function normals(s, closed = false) {
  const n = s.length
  return s.map((_, i) => {
    const a = closed ? s[(i - 1 + n) % n] : s[Math.max(0, i - 1)], b = closed ? s[(i + 1) % n] : s[Math.min(n - 1, i + 1)]
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1
    return [-dy / l, dx / l]
  })
}
export const translate = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy])
export const scale = (pts, k, cx, cy) => { if (cx === undefined) [cx, cy] = centroid(pts); return pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * (k)]) }
export const turn = (pts, cx, cy, deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]) }
export const jitter = (pts, amt, seed = 1) => { if (!amt) return pts; const r = rng(seed); return pts.map(([x, y]) => [x + (r() - 0.5) * 2 * amt, y + (r() - 0.5) * 2 * amt]) }
/** move every point by a smooth noise field (wobbly, torn, wet edges) */
export const displace = (pts, amp, freq = 0.02, seed = 1, oct = 3) => pts.map(([x, y]) => [x + (fbm(seed, x, y, freq, oct) - 0.5) * amp, y + (fbm(seed + 77, x, y, freq, oct) - 0.5) * amp])
/** grow (d > 0) or shrink (d < 0) a closed outline along its normals */
export function offset(pts, d) {
  const s = area(pts) > 0 ? 1 : -1, nn = normals(pts, true)
  return pts.map(([x, y], i) => [x - nn[i][0] * d * s, y - nn[i][1] * d * s])
}

// shapes — closed outlines, already smooth; build subjects from these, then bend them (never leave a thing a bare ellipse)
export const ellipse = (cx, cy, rx, ry = rx, n = 48, a0 = 0) => Array.from({ length: n }, (_, i) => { const a = a0 + (i / n) * TAU; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] })
export const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
/** a superellipse box: e=2 ellipse, e≈4 rounded box, larger → squarer */
export const softBox = (cx, cy, w, h, e = 4, n = 48) => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU, c = Math.cos(a), s = Math.sin(a), k = 1 / (Math.abs(c) ** e + Math.abs(s) ** e) ** (1 / e); return [cx + (c * k * w) / 2, cy + (s * k * h) / 2] })
/** an organic closed shape: a circle whose radius wanders by `wob` (0..1) */
export function blob(cx, cy, r, { n = 40, wob = 0.15, seed = 1, sx = 1, sy = 1, rot = 0 } = {}) {
  const ca = Math.cos(rot), sa = Math.sin(rot)
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU, k = 1 + (noise(seed, Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + 5) - 0.5) * 2 * wob
    const x = Math.cos(a) * r * k * sx, y = Math.sin(a) * r * k * sy
    return [cx + x * ca - y * sa, cy + x * sa + y * ca]
  })
}
/** a closed band around a centreline, half-width r0 → r1 (stems, branches, handles, spouts) */
export function tube(centre, r0, r1 = r0, cap = true) {
  const c = smooth(centre, false, 6), nn = normals(c), L = [], R = []
  c.forEach((p, i) => { const r = lerp(r0, r1, i / (c.length - 1 || 1)); L.push([p[0] + nn[i][0] * r, p[1] + nn[i][1] * r]); R.push([p[0] - nn[i][0] * r, p[1] - nn[i][1] * r]) })
  const tip = []
  if (cap && c.length > 1) { const e = c[c.length - 1], e0 = c[c.length - 2], l = dist(e0, e) || 1; tip.push([e[0] + ((e[0] - e0[0]) / l) * r1 * 0.8, e[1] + ((e[1] - e0[1]) / l) * r1 * 0.8]) }
  return [...L, ...tip, ...R.reverse()]
}
/** a body hung on a spine: `hw(t)` is the half-width at t in [0, 1]; returns { outline, at(t, s), spine } */
export function body(ctrl, hw, n = 80) {
  const spine = resample(smooth(ctrl, false, 6), n), nn = normals(spine)
  const pick = (arr, t) => { const f = clamp(t) * (n - 1), i = Math.floor(f), k = Math.min(n - 1, i + 1); return lerpP(arr[i], arr[k], f - i) }
  const at = (t, s) => { const p = pick(spine, t), q = pick(nn, t), w = hw(t); return [p[0] + q[0] * w * s, p[1] + q[1] * w * s] }
  const L = [], R = []
  for (let i = 0; i < n; i++) { const t = i / (n - 1); L.push(at(t, 1)); R.push(at(t, -1)) }
  return { spine, at, outline: [...L, ...R.reverse()] }
}
/** a pointed leaf from base to tip; `bend` curves the midrib; returns { outline, midrib } */
export function leaf(base, tip, width, { bend = 0, seed = 1, serrate = 0 } = {}) {
  const L = dist(base, tip), ang = Math.atan2(tip[1] - base[1], tip[0] - base[0]), ca = Math.cos(ang), sa = Math.sin(ang)
  const place = (u, v) => [base[0] + u * ca - v * sa, base[1] + u * sa + v * ca]
  const mid = Array.from({ length: 9 }, (_, i) => { const t = i / 8; return place(t * L, Math.sin(t * Math.PI) * bend * L) })
  const r = rng(seed), side = (sgn) => Array.from({ length: 14 }, (_, i) => { const t = (i + 1) / 15, w = Math.sin(Math.pow(t, 0.8) * Math.PI) * width * 0.5 * (1 - 0.15 * t), z = serrate ? (i % 2 ? serrate : 0) * width * 0.06 : (r() - 0.5) * width * 0.02; return place(t * L, Math.sin(t * Math.PI) * bend * L + sgn * (w + z)) })
  const left = side(1), right = side(-1).reverse()
  return { outline: [place(0, 0), ...left, place(L, Math.sin(Math.PI) * bend * L), ...right], midrib: mid }
}
export const arc = (cx, cy, rx, ry, a0, a1, n = 24) => Array.from({ length: n }, (_, i) => { const a = a0 + (i / (n - 1)) * (a1 - a0); return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] })
export const segment = (a, b, bow = 0, n = 12) => { const nx = -(b[1] - a[1]), ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1; return Array.from({ length: n }, (_, i) => { const t = i / (n - 1), k = Math.sin(t * Math.PI) * bow; return [lerp(a[0], b[0], t) + (nx / l) * k, lerp(a[1], b[1], t) + (ny / l) * k] }) }

/** parallel lines at `angle` (radians) every `gap` px, clipped to a closed outline: [[a, b], ...] */
export function hatchLines(pts, angle, gap, { phase = 0, jitter: jit = 0, seed = 1 } = {}) {
  const c = Math.cos(-angle), s = Math.sin(-angle), rot = pts.map(([x, y]) => [x * c - y * s, x * s + y * c])
  const b = bbox(rot), out = [], r = rng(seed), ci = Math.cos(angle), si = Math.sin(angle)
  for (let y = b.y0 + (((phase % gap) + gap) % gap); y <= b.y1; y += gap) {
    const yy = y + (jit ? (r() - 0.5) * jit : 0), xs = []
    for (let i = 0, j = rot.length - 1; i < rot.length; j = i++) {
      const [x1, y1] = rot[j], [x2, y2] = rot[i]
      if ((y1 > yy) !== (y2 > yy)) xs.push(x1 + ((yy - y1) * (x2 - x1)) / (y2 - y1))
    }
    xs.sort((p, q) => p - q)
    for (let k = 0; k + 1 < xs.length; k += 2) out.push([[xs[k] * ci - yy * si, xs[k] * si + yy * ci], [xs[k + 1] * ci - yy * si, xs[k + 1] * si + yy * ci]])
  }
  return out
}
/** `n` seeded points inside a closed outline (rejection sampled) */
export function scatter(pts, n, seed = 1) {
  const b = bbox(pts), r = rng(seed), out = []
  let tries = 0
  while (out.length < n && tries++ < n * 40) { const x = b.x0 + r() * b.w, y = b.y0 + r() * b.h; if (inside(pts, x, y)) out.push([x, y]) }
  return out
}
/** a jittered grid of points inside a closed outline, one per `step` px */
export function gridIn(pts, step, jit = 0.5, seed = 1) {
  const b = bbox(pts), r = rng(seed), out = []
  for (let y = b.y0 + step / 2; y < b.y1; y += step) for (let x = b.x0 + step / 2; x < b.x1; x += step) {
    const px = x + (r() - 0.5) * step * jit, py = y + (r() - 0.5) * step * jit
    if (inside(pts, px, py)) out.push([px, py])
  }
  return out
}

// ------------------------------------------------------------------ colour (hex strings in and out)
export function rgb(h) {
  if (Array.isArray(h)) return h
  let s = String(h).replace('#', '')
  if (s.length === 3) s = s.split('').map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16))
}
export const hex = (c) => '#' + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')
export const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => lerp(v, y[i], t))) }
export const rgba = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})` }
export const lum = (h) => { const [r, g, b] = rgb(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 }
export const darken = (h, t) => mix(h, '#000000', t)
export const lighten = (h, t) => mix(h, '#ffffff', t)
export function toHsl(h) {
  const [r, g, b] = rgb(h).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  const hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [hh * 60, s, l]
}
export function fromHsl(H, S, L) {
  const k = (n) => (n + H / 30) % 12, a = S * Math.min(L, 1 - L), f = (n) => L - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return hex([f(0), f(8), f(4)].map((v) => v * 255))
}
/** shift hue (deg), saturation and lightness multiplicatively */
export const adjust = (h, { hue = 0, sat = 1, light = 1 } = {}) => { const [H, S, L] = toHsl(h); return fromHsl((H + hue + 360) % 360, clamp(S * sat), clamp(L * light)) }
/** the closest colour of a palette (perceptual-ish weights) */
export function nearest(h, palette) {
  const [r, g, b] = rgb(h)
  let best = palette[0], bd = Infinity
  for (const p of palette) { const [R, G, B] = rgb(p), rm = (r + R) / 2, d = (2 + rm / 256) * (r - R) ** 2 + 4 * (g - G) ** 2 + (2 + (255 - rm) / 256) * (b - B) ** 2; if (d < bd) { bd = d; best = p } }
  return best
}
/** the lit and shaded versions of a local colour (warm light, cool shade) */
export const litOf = (h, k = 0.3) => mix(adjust(h, { light: 1.12, sat: 1.05 }), '#fff4dc', k)
export const shadeOf = (h, k = 0.42) => mix(adjust(h, { hue: -8, sat: 0.95, light: 0.72 }), '#2a2440', k * 0.45)

// ------------------------------------------------------------------ canvases, tiles, blur
export function canvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)))
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c
}
export const path = (ctx, pts, closed = true) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (closed) ctx.closePath() }

/**
 * Seamless texture tiles, 256 logical px. Two kinds of use:
 *  - grey tiles (paper, canvas, grain, slate, kozo, linen, newsprint) are MULTIPLIED over the picture;
 *  - alpha tiles (tooth, gran, speck, mottle, dry) cut into a layer (destination-in): marks skip the paper's valleys.
 */
export const TILES = {
  paper: { kind: 'grey', f: 0.045, oct: 4, lo: 0.9, seed: 3 },
  coldpress: { kind: 'grey', f: 0.07, oct: 4, lo: 0.88, seed: 5 },
  canvas: { kind: 'weave', f: 0.5, lo: 0.82, seed: 7 },
  linen: { kind: 'weave', f: 0.33, lo: 0.78, seed: 9 },
  grain: { kind: 'grey', f: 0.9, oct: 1, lo: 0.82, seed: 11 },
  slate: { kind: 'grey', f: 0.06, oct: 5, lo: 0.75, seed: 13 },
  kozo: { kind: 'fibre', f: 0.02, oct: 3, lo: 0.9, seed: 15 },
  newsprint: { kind: 'grey', f: 0.35, oct: 3, lo: 0.86, seed: 17 },
  tooth: { kind: 'alpha', f: 0.42, oct: 2, k: -2.4, o: 2.05, seed: 21 },
  fine: { kind: 'alpha', f: 0.8, oct: 1, k: -1.6, o: 1.7, seed: 23 },
  gran: { kind: 'alpha', f: 0.08, oct: 3, k: -0.7, o: 1.25, seed: 25 },
  speck: { kind: 'alpha', f: 0.9, oct: 2, k: -3.2, o: 2.5, seed: 27 },
  mottle: { kind: 'alpha', f: 0.012, oct: 3, k: -0.9, o: 1.35, seed: 29 },
  dry: { kind: 'alpha', f: 0.18, oct: 3, k: -3.4, o: 2.3, seed: 31, sy: 8 }, // streaks: fast across, slow along (sy must stay a whole number)
}
export function tile(kind, env) {
  const key = `tile:${kind}:${env.scale}`
  if (env.cache.has(key)) return env.cache.get(key)
  const sp = TILES[kind]
  if (!sp) throw new Error(`no tile "${kind}"; one of ${Object.keys(TILES).join(', ')}`)
  const T = 256, n = Math.round(T * env.scale), c = canvas(n, n), x2 = c.getContext('2d'), img = x2.createImageData(n, n), d = img.data
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const lx = x / env.scale, ly = y / env.scale, i = (y * n + x) * 4
    let v
    if (sp.kind === 'weave') { const u = Math.sin(lx * sp.f * Math.PI) ** 2, w = Math.sin(ly * sp.f * Math.PI) ** 2, over = (Math.floor(lx * sp.f) + Math.floor(ly * sp.f)) % 2; v = 0.55 + 0.25 * (over ? u : w) + 0.2 * fbm(sp.seed, lx, ly, 1 / 16, 2, T) }
    else if (sp.kind === 'fibre') { v = fbm(sp.seed, lx, ly, sp.f, sp.oct, T); const fib = fbm(sp.seed + 3, lx * 0.25, ly * 2.2, 0.25, 2, T); v = 0.75 * v + 0.25 * smoothstep(0.62, 0.7, fib) }
    else v = sp.sy ? fbm(sp.seed, lx, ly * sp.sy, sp.f, sp.oct, T) : fbm(sp.seed, lx, ly, sp.f, sp.oct, T)
    if (sp.kind === 'alpha') { d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = 255 * clamp(sp.k * v + sp.o) }
    else { const g = 255 * lerp(sp.lo, 1, clamp((v - 0.3) / 0.45)); d[i] = d[i + 1] = d[i + 2] = g; d[i + 3] = 255 }
  }
  x2.putImageData(img, 0, 0)
  env.cache.set(key, c)
  return c
}
/** blur a whole canvas in place by halving and scaling back (portable: no ctx.filter) */
export function soften(c, radius, env) {
  if (radius <= 0) return
  const steps = Math.max(1, Math.round(Math.log2(Math.max(2, radius * env.scale * 1.5))))
  let w = c.width, h = c.height
  const A = env.scratch(0), B = env.scratch(1), sizes = [[w, h]]
  let src = c, a = A, b = B
  for (let i = 0; i < steps; i++) {
    const nw = Math.max(1, Math.ceil(w / 2)), nh = Math.max(1, Math.ceil(h / 2)), x = a.getContext('2d')
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, nw + 2, nh + 2); x.imageSmoothingEnabled = true
    x.drawImage(src, 0, 0, w, h, 0, 0, nw, nh); sizes.push([nw, nh]); src = a; w = nw; h = nh; [a, b] = [b, a]
  }
  for (let i = steps - 1; i >= 1; i--) {
    const [dw, dh] = sizes[i], x = a.getContext('2d')
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, dw + 2, dh + 2); x.drawImage(src, 0, 0, w, h, 0, 0, dw, dh); src = a; w = dw; h = dh; [a, b] = [b, a]
  }
  const x = c.getContext('2d')
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'copy'; x.globalAlpha = 1; x.imageSmoothingEnabled = true; x.drawImage(src, 0, 0, w, h, 0, 0, c.width, c.height); x.restore()
}

/**
 * A tapered stroke: the outline of a ribbon around a centreline `c`.
 * w: width; taper 0..1 (how thin the ends get); pressure 0..1 (how much the middle swells);
 * rough: edge noise; seed: per-stroke variation; k: how much of the stroke is drawn so far (0..1).
 * The width profile belongs to the WHOLE stroke, so a stroke being drawn keeps its shape as it grows;
 * the travelling tip is pointed like a nib lifting. Returns a closed outline.
 */
export function ribbon(c, { w = 3, taper = 0.8, pressure = 0.4, rough = 0.15, seed = 1, k = 1 } = {}) {
  if (c.length < 2) return []
  const total = length(c) || 1, cut = total * clamp(k), r = rng(seed), ph = r() * 10, L = [], R = []
  let acc = 0
  const put = (p, q, a) => {
    const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, t = a / total
    const ends = Math.min(1, Math.min(t, 1 - t) * 6), tip = k < 1 ? clamp((cut - a) / Math.max(2, w * 1.5)) : 1
    const prof = lerp(1, Math.sqrt(Math.max(0.02, ends)), taper) * lerp(1, 0.75 + 0.5 * Math.sin(t * Math.PI), pressure) * Math.sqrt(Math.max(0.05, tip))
    const hw = (w / 2) * prof * (1 + (noise(seed, a * 0.08 + ph, 0) - 0.5) * 2 * rough)
    return [nx * hw, ny * hw]
  }
  for (let i = 0; i < c.length; i++) {
    const a0 = acc, nxt = c[Math.min(c.length - 1, i + 1)], prv = c[Math.max(0, i - 1)]
    if (i) acc += dist(c[i - 1], c[i])
    if (acc > cut && i) {
      const f = (cut - a0) / ((acc - a0) || 1), p = lerpP(c[i - 1], c[i], f), o = put(c[i - 1], c[i], cut)
      L.push([p[0] + o[0], p[1] + o[1]]); R.push([p[0] - o[0], p[1] - o[1]]); break
    }
    const o = put(prv, nxt, acc)
    L.push([c[i][0] + o[0], c[i][1] + o[1]]); R.push([c[i][0] - o[0], c[i][1] - o[1]])
  }
  return [...L, ...R.reverse()]
}

/** outward unit normals of a closed outline (whatever its winding) */
export function outward(pts) { const s = area(pts) > 0 ? -1 : 1; return normals(pts, true).map(([x, y]) => [x * s, y * s]) }
/**
 * Split a closed outline into open runs where keep(i, normal) is true — e.g. lose the edge on the lit side:
 *   K.runs(r.pts, (i, n) => n[0] * L[0] + n[1] * L[1] < 0.5)
 * Returns polylines (each at least 2 points).
 */
export function runs(pts, keep) {
  const nn = outward(pts), n = pts.length, on = pts.map((_, i) => !!keep(i, nn[i]))
  if (on.every(Boolean)) return [[...pts, pts[0]]]
  if (!on.some(Boolean)) return []
  let s = on.findIndex((v, i) => v && !on[(i - 1 + n) % n])
  const out = []
  let cur = null
  for (let j = 0; j < n; j++) { const i = (s + j) % n; if (on[i]) { (cur ||= []).push(pts[i]) } else if (cur) { if (cur.length > 1) out.push(cur); cur = null } }
  if (cur && cur.length > 1) out.push(cur)
  return out
}
/** how much the outline at point i faces the light (1 = straight at it, -1 = away) */
export const facing = (n, L) => n[0] * L[0] + n[1] * L[1]
/** a point inside the region toward the light (where a brush would touch down first) */
export const litPoint = (r, L, k = 0.3) => [r.bbox.cx + L[0] * r.bbox.w * k, r.bbox.cy + L[1] * r.bbox.h * k]
/** subdivide every edge so no segment is longer than `step` px (keeps corners sharp, unlike smooth()) */
export function densify(pts, step = 8, closed = false) {
  const out = [], n = pts.length, segs = closed ? n : n - 1
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % n], k = Math.max(1, Math.ceil(dist(a, b) / step))
    for (let j = 0; j < k; j++) out.push(lerpP(a, b, j / k))
  }
  if (!closed && n) out.push(pts[n - 1])
  return out
}
/** a hand's wobble: a smooth noise field moves the line a little (not per-point jitter) */
export const wobble = (pts, amt, seed = 1, freq = 0.012) => (amt ? displace(densify(pts, 6), amt * 2, freq, seed, 2) : pts)
/** is this line light (steam, a white frame, a glint)? light lines are drawn as light, not as ink */
export const isLight = (c, k = 0.72) => lum(c) > k

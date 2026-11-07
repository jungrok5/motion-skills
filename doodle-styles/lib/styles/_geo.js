// lib/styles/_geo.js — private helpers shared by the digital / geometric hands (flat-vector, isometric, low-poly,
// pixel-art). Pure functions (no clock, no Math.random). Not a style: the index never lists files starting with "_".
import * as K from '../kit.js'

// ------------------------------------------------------------------ polygons
/** keep the part of a closed polygon where nx·x + ny·y >= c (one Sutherland–Hodgman step) */
export function clipHalf(poly, nx, ny, c) {
  const out = [], n = poly.length
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n], da = nx * a[0] + ny * a[1] - c, db = nx * b[0] + ny * b[1] - c
    if (da >= 0) out.push(a)
    if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]) }
  }
  return out
}
/** a closed polygon clipped to an axis-aligned rectangle */
export function clipRect(poly, x0, y0, x1, y1) {
  let p = clipHalf(poly, 1, 0, x0)
  if (p.length) p = clipHalf(p, -1, 0, -x1)
  if (p.length) p = clipHalf(p, 0, 1, y0)
  if (p.length) p = clipHalf(p, 0, -1, -y1)
  return p
}
/** convex hull (monotone chain) */
export function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (p.length < 3) return p
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo = [], up = []
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q) }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q) }
  return lo.slice(0, -1).concat(up.slice(0, -1))
}
/** pen-tool anchors of an outline: its corners plus evenly spaced smooth points (about `n` in all) */
export function anchors(pts, n = 10, closed = true) {
  const m = pts.length, step = Math.max(1, Math.floor(m / n)), out = []
  for (let i = 0; i < m; i++) {
    const a = pts[(i - 1 + m) % m], b = pts[i], c = pts[(i + 1) % m]
    let corner = false
    if (closed || (i > 0 && i < m - 1)) {
      const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]), t2 = Math.atan2(c[1] - b[1], c[0] - b[0])
      let d = Math.abs(t2 - t1); if (d > Math.PI) d = 2 * Math.PI - d
      corner = d > 0.6
    }
    if (i % step === 0 || corner) out.push(i)
  }
  if (!closed && out[out.length - 1] !== m - 1) out.push(m - 1)
  return out
}
/** the pen tool's path while it is being drawn: blue path, white square anchors, the live anchor with handles */
export function penUI(ctx, pts, idx, k, { closed = true, color = '#2f7bff', size = 7 } = {}) {
  const ring = closed ? [...pts, pts[0]] : pts, part = K.upTo(ring, k), n = part.length
  if (n < 2) return
  ctx.save(); ctx.globalAlpha = 1; ctx.lineJoin = 'round'
  ctx.strokeStyle = color; ctx.lineWidth = 1.6; K.path(ctx, part, false); ctx.stroke()
  const L = K.length(ring), done = L * k
  let acc = 0, last = null
  const seen = new Set(idx)
  for (let i = 0; i < ring.length; i++) {
    if (i) acc += K.dist(ring[i - 1], ring[i])
    if (acc > done) break
    if (seen.has(i % pts.length)) last = ring[i]
    if (seen.has(i % pts.length)) { const [x, y] = ring[i]; ctx.fillStyle = '#ffffff'; ctx.fillRect(x - size / 2, y - size / 2, size, size); ctx.lineWidth = 1.2; ctx.strokeRect(x - size / 2, y - size / 2, size, size) }
  }
  // the live anchor: filled, with its two bezier handles along the path
  const tip = part[n - 1], prev = part[Math.max(0, n - 3)], dx = tip[0] - prev[0], dy = tip[1] - prev[1], l = Math.hypot(dx, dy) || 1, h = 26
  ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(tip[0] - (dx / l) * h, tip[1] - (dy / l) * h); ctx.lineTo(tip[0] + (dx / l) * h, tip[1] + (dy / l) * h); ctx.stroke()
  ctx.fillStyle = color
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(tip[0] + (s * dx / l) * h, tip[1] + (s * dy / l) * h, 3, 0, Math.PI * 2); ctx.fill() }
  ctx.fillRect(tip[0] - size / 2, tip[1] - size / 2, size, size)
  if (last) { /* the last anchor laid stays white */ }
  ctx.restore()
}

// ------------------------------------------------------------------ coverage on a coarse grid (what overlaps what)
/** scanline spans of a closed outline sampled at cell centres: cb(row, colFrom, colTo) */
export function spans(pts, cell, cols, rows, cb) {
  const b = K.bbox(pts), r0 = Math.max(0, Math.floor(b.y0 / cell)), r1 = Math.min(rows - 1, Math.ceil(b.y1 / cell))
  const n = pts.length
  for (let row = r0; row <= r1; row++) {
    const Y = (row + 0.5) * cell, xs = []
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j]
      if ((yi > Y) !== (yj > Y)) xs.push(xi + ((Y - yi) * (xj - xi)) / (yj - yi))
    }
    xs.sort((p, q) => p - q)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.max(0, Math.ceil(xs[k] / cell - 0.5)), c = Math.min(cols - 1, Math.floor(xs[k + 1] / cell - 0.5))
      if (c >= a) cb(row, a, c)
    }
  }
}
/** one coverage mask per region on a grid of `cell` px; overlap(a, b) says whether two regions share a cell */
export function coverage(S, cell = 12) {
  const cols = Math.ceil(S.W / cell), rows = Math.ceil(S.H / cell), masks = new Map()
  for (const r of S.regions) {
    const m = new Uint8Array(cols * rows)
    spans(r.pts, cell, cols, rows, (row, a, c) => { for (let x = a; x <= c; x++) m[row * cols + x] = 1 })
    masks.set(r, m)
  }
  const overlap = (a, b) => {
    const A = a.bbox, B = b.bbox
    if (A.x0 > B.x1 || B.x0 > A.x1 || A.y0 > B.y1 || B.y0 > A.y1) return false
    const ma = masks.get(a), mb = masks.get(b)
    const x0 = Math.max(0, Math.floor(Math.max(A.x0, B.x0) / cell)), x1 = Math.min(cols - 1, Math.ceil(Math.min(A.x1, B.x1) / cell))
    const y0 = Math.max(0, Math.floor(Math.max(A.y0, B.y0) / cell)), y1 = Math.min(rows - 1, Math.ceil(Math.min(A.y1, B.y1) / cell))
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const k = y * cols + x; if (ma[k] && mb[k]) return true }
    return false
  }
  return { cols, rows, cell, masks, overlap }
}

// ------------------------------------------------------------------ Delaunay (Bowyer–Watson) and region meshes
export function delaunay(P) {
  const n = P.length
  if (n < 3) return []
  const b = K.bbox(P), d = Math.max(b.w, b.h, 1) * 30, mx = b.cx, my = b.cy
  const pts = P.concat([[mx - d, my - d], [mx + d, my - d], [mx, my + d]])
  const tri = (a, bb, c) => {
    const [ax, ay] = pts[a], [bx, by] = pts[bb], [cx, cy] = pts[c]
    const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)) || 1e-9
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / D
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / D
    return [a, bb, c, ux, uy, (ax - ux) ** 2 + (ay - uy) ** 2]
  }
  let tris = [tri(n, n + 1, n + 2)]
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i], keep = [], edges = new Map()
    for (const t of tris) {
      if ((x - t[3]) ** 2 + (y - t[4]) ** 2 < t[5]) {
        for (const [a, c] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) { const key = a < c ? a * 100003 + c : c * 100003 + a; if (edges.has(key)) edges.delete(key); else edges.set(key, [a, c]) }
      } else keep.push(t)
    }
    for (const [a, c] of edges.values()) keep.push(tri(a, c, i))
    tris = keep
  }
  return tris.filter((t) => t[0] < n && t[1] < n && t[2] < n).map((t) => [t[0], t[1], t[2]])
}
const meshCache = new Map()
/** triangulate a closed outline: boundary samples every `step` px plus a jittered interior grid.
 *  Returns { pts, tris: [[i,j,k]...] } (only triangles whose centroid is inside). Cached by outline. */
export function mesh(outline, step, seed = 1) {
  const key = `${step.toFixed(1)}:${seed}:${outline.length}:${outline[0][0].toFixed(1)},${outline[0][1].toFixed(1)}:${outline[outline.length >> 1][0].toFixed(1)},${outline[outline.length >> 1][1].toFixed(1)}:${K.area(outline).toFixed(0)}`
  if (meshCache.has(key)) return meshCache.get(key)
  const per = K.length(outline, true), nb = Math.max(8, Math.round(per / step))
  const edge = K.resample(outline, nb, true), r = K.rng(seed)
  const inner = K.gridIn(outline, step * 1.05, 0.75, seed).filter(([x, y]) => {
    for (const q of edge) if ((q[0] - x) ** 2 + (q[1] - y) ** 2 < (step * 0.42) ** 2) return false
    return true
  }).map(([x, y]) => [x + (r() - 0.5) * 0.01, y + (r() - 0.5) * 0.01])
  const pts = edge.concat(inner)
  const tris = delaunay(pts).filter(([a, b, c]) => {
    const cx = (pts[a][0] + pts[b][0] + pts[c][0]) / 3, cy = (pts[a][1] + pts[b][1] + pts[c][1]) / 3
    return K.inside(outline, cx, cy)
  })
  const out = { pts, tris }
  if (meshCache.size > 400) meshCache.clear()
  meshCache.set(key, out)
  return out
}

// ------------------------------------------------------------------ colour
const cd = (a, b) => { const rm = (a[0] + b[0]) / 2; return (2 + rm / 256) * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + (2 + (255 - rm) / 256) * (a[2] - b[2]) ** 2 }
export const colourDist = (a, b) => Math.sqrt(cd(K.rgb(a), K.rgb(b)))
/** weighted k-means in a perceptual-ish RGB, deterministic (max-min seeding). items: [{ c: hex, w }] → k hex colours */
export function kmeans(items, k) {
  const X = items.map((it) => K.rgb(it.c)), W = items.map((it) => it.w)
  if (!X.length) return []
  const C = [X[W.indexOf(Math.max(...W))].slice()]
  while (C.length < Math.min(k, X.length)) {
    let best = -1, bi = 0
    X.forEach((x, i) => { const d = Math.min(...C.map((c) => cd(x, c))) * Math.sqrt(W[i]); if (d > best) { best = d; bi = i } })
    if (best <= 0) break
    C.push(X[bi].slice())
  }
  for (let it = 0; it < 12; it++) {
    const acc = C.map(() => [0, 0, 0, 0])
    X.forEach((x, i) => { let bj = 0, bd = Infinity; C.forEach((c, j) => { const d = cd(x, c); if (d < bd) { bd = d; bj = j } }); const a = acc[bj]; a[0] += x[0] * W[i]; a[1] += x[1] * W[i]; a[2] += x[2] * W[i]; a[3] += W[i] })
    acc.forEach((a, j) => { if (a[3] > 0) C[j] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]] })
  }
  return C.map((c) => K.hex(c))
}

// ------------------------------------------------------------------ raster grain (the vector app's grain brush)
/** a seamless tile of sparse speckle at device resolution (alpha only), cached on the env */
export function grainTile(env, { density = 0.22, seed = 7, size = 160 } = {}) {
  const key = `geo:grain:${density}:${seed}:${env.scale}`
  if (env.cache.has(key)) return env.cache.get(key)
  const n = Math.max(8, Math.round(size * env.scale)), c = K.canvas(n, n), x = c.getContext('2d'), img = x.createImageData(n, n), d = img.data, r = K.rng(seed)
  const dot = Math.max(1, Math.round(env.scale))
  for (let y = 0; y < n; y += dot) for (let xx = 0; xx < n; xx += dot) {
    if (r() < density) { const a = 140 + Math.floor(r() * 115); for (let j = 0; j < dot; j++) for (let i = 0; i < dot; i++) { const k = ((y + j) % n * n + (xx + i) % n) * 4; d[k + 3] = a } }
  }
  x.putImageData(img, 0, 0)
  env.cache.set(key, c)
  return c
}

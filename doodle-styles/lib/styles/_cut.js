// lib/styles/_cut.js — small helpers shared by the cut / printed hands (scratchboard, woodblock, halftone, blueprint).
// Not a style: no default export. Everything here is pure or cached in env.cache under a key that names what it depends on.

/** picture scale: 1 at 1080 px on the short side */
export const unit = (S) => Math.min(S.W, S.H) / 1080

/** a canvas built once per key (tiles, sheets, tone grids): build(ctx, canvas) draws it in device pixels */
export function cachedCanvas(env, key, w, h, build, K) {
  if (env.cache.has(key)) return env.cache.get(key)
  const c = K.canvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h))), x = c.getContext('2d')
  build(x, c)
  env.cache.set(key, c)
  return c
}

/** a ribbon outline around a centreline with a width per point (a knife cut, a carved line) */
export function ribbonW(pts, ws) {
  const n = pts.length, L = [], R = []
  if (n < 2) return []
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = (ws[i] ?? ws[ws.length - 1]) / 2
    L.push([pts[i][0] - (dy / l) * w, pts[i][1] + (dx / l) * w]); R.push([pts[i][0] + (dy / l) * w, pts[i][1] - (dx / l) * w])
  }
  return [...L, ...R.reverse()]
}
/** add a closed polygon to the current path (no beginPath) */
export function sub(ctx, pts) { if (pts.length < 3) return; ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath() }

/** the regions printed after r that overlap it, glows and highlights included (a block is carved away under them) */
export function knockouts(S, r, { highlight = true, glow = true } = {}) {
  const b = r.bbox
  return S.regions.filter((q) => q.i > r.i && q.role !== 'shadow' && (glow || q.role !== 'glow') && (highlight || q.role !== 'highlight') &&
    q.bbox.x0 < b.x1 && q.bbox.x1 > b.x0 && q.bbox.y0 < b.y1 && q.bbox.y1 > b.y0).map((q) => q.pts)
}

/** a band of half-width hw around an open line, as a closed outline (to cut a line out of a layer) */
export function band(pts, hw, K) {
  const c = K.densify(pts, 4), nn = K.normals(c), L = [], R = []
  c.forEach((p, i) => { L.push([p[0] + nn[i][0] * hw, p[1] + nn[i][1] * hw]); R.push([p[0] - nn[i][0] * hw, p[1] - nn[i][1] * hw]) })
  // round-ish ends
  const e = c[c.length - 1], e0 = c[Math.max(0, c.length - 2)], s = c[0], s1 = c[Math.min(1, c.length - 1)], d = (p, q) => { const l = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1; return [(p[0] - q[0]) / l, (p[1] - q[1]) / l] }
  const de = d(e, e0), ds = d(s, s1)
  return [[s[0] + ds[0] * hw, s[1] + ds[1] * hw], ...L, [e[0] + de[0] * hw, e[1] + de[1] * hw], ...R.reverse()]
}

/** the print area inside a bare margin (fraction of the short side) */
export function inner(S, m) { const p = m * Math.min(S.W, S.H); return { x0: p, y0: p, x1: S.W - p, y1: S.H - p, pts: [[p, p], [S.W - p, p], [S.W - p, S.H - p], [p, S.H - p]], m: p } }

/** a hand works patch by patch, snaking: sort marks by 96-px patch, then by y */
export function patchSort(list, at, P = 96) {
  const key = (p) => { const py = Math.floor(p[1] / P), px = Math.floor(p[0] / P); return py * 1000 + (py % 2 ? 999 - px : px) }
  return list.map((m) => [key(at(m)), at(m)[1], m]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((x) => x[2])
}

/** an integer hash → [0, 1) */
export const hash = (x, y, s = 0) => { const h = Math.sin(x * 12.9898 + y * 78.233 + s * 37.719) * 43758.5453; return h - Math.floor(h) }

/** S.colorAt / S.tone with the plate's line bug worked around: the value plate draws every line over every region, so a
 *  line passing BEHIND a later region (a table edge behind a kettle) shows through it. Where a hidden stretch of a line
 *  lies, read the covering region's own shaded colour instead. */
export function truePlate(S, K) {
  const cell = 3, hidden = new Set(), key = (x, y) => Math.floor(x / cell) * 65536 + Math.floor(y / cell)
  for (const l of S.lines) {
    const rad = l.w / 2 + 2
    for (const p of K.densify(l.pts, 2)) {
      const q = S.regionAt(p[0], p[1])
      if (!q || q.i < l.i) continue
      for (let dy = -rad; dy <= rad; dy += cell) for (let dx = -rad; dx <= rad; dx += cell) hidden.add(key(p[0] + dx, p[1] + dy))
    }
  }
  const colorAt = (x, y) => { if (hidden.size && hidden.has(key(x, y))) { const r = S.regionAt(x, y); if (r) return K.rgb(r.colorAt(x, y)) } return S.colorAt(x, y) }
  const tone = (x, y) => { if (hidden.size && hidden.has(key(x, y))) { const c = colorAt(x, y); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 } return S.tone(x, y) }
  return { colorAt, tone }
}

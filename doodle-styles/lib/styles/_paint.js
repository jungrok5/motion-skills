// lib/styles/_paint.js — private helpers shared by the paint hands (oil, broken-colour, dream-glaze, mid-century).
// Not a style: index.js never lists it. Everything here is deterministic (K.rng / K.fbm only).
//
//   field(S, K)              the picture's colour WITHOUT its lines: a region's shaded colour with the cast shadows and
//                            light patches painted after it, so an opaque hand can mix the colour a brush should carry
//   clipTo(ctx, pts, occ)    clip to an outline minus everything that hides it (each occluder cut with an even-odd hole)
//   rowsClip(ctx, b, …, k)   the part of a box a brush has covered after k of its boustrophedon rows (grounds, flats)
//   batches(D, items, o)     record a long list of hand-drawn marks as a few D.mark()s that draw the first k·n of them
//   sweepSort(list, ang)     order marks the way a hand works across an area (a drifting front, never a scanline)
//   formDir(r, L)            the direction a brush follows on a region (hoops round a round form, along its grain, …)

const cache = new Map() // rgb parsing (hex → [r,g,b]); pure, so caching changes no pixel
export const rgbOf = (K, h) => { let v = cache.get(h); if (!v) { v = K.rgb(h); if (cache.size > 4000) cache.clear(); cache.set(h, v) } return v }
export const css = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
export const mixA = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
export const lumA = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255

/** the colour a region shows at (x, y), with the shadows and light patches laid after it (no lines).
 *  o.tone(r, t) → [r,g,b] replaces the scene's tone→colour ramp (a hand's own way of turning form); o.patch: how far a
 *  light patch pulls toward its colour */
export function field(S, K, o = {}) {
  const over = S.regions.filter((q) => q.role === 'shadow' || q.role === 'highlight')
  const inBox = (q, x, y) => x >= q.bbox.x0 && x <= q.bbox.x1 && y >= q.bbox.y0 && y <= q.bbox.y1
  /** { c: [r,g,b], tone: 0..1, shadow: 0..1 } for region r at (x, y) */
  const at = (r, x, y) => {
    let tone = r.role === 'glow' ? 1 : r.toneAt(x, y)
    let c = r.role === 'glow' ? mixA(rgbOf(K, r.lit), rgbOf(K, r.color), 0.35 * K.clamp((y - r.bbox.y0) / (r.bbox.h || 1))) : o.tone ? o.tone(r, tone) : rgbOf(K, r.colorAt(x, y))
    let shadow = 0, hl = 0
    for (const q of over) {
      if (q.i <= r.i || !inBox(q, x, y) || !K.inside(q.pts, x, y)) continue
      if (q.role === 'shadow') { const t = rgbOf(K, q.color), a = q.strength; c = c.map((v, j) => v * (1 - a) + v * (t[j] / 255) * a * 0.75); tone *= 1 - 0.55 * a; shadow = Math.max(shadow, a) }
      else { c = mixA(c, rgbOf(K, q.color), o.patch ?? 0.36); tone = Math.min(1, tone + 0.22); hl = 1 }
    }
    return { c, tone, shadow, hl }
  }
  /** the topmost visible region at (x, y) (solid or glow) and its colour; the background colour where nothing is */
  const pic = (x, y) => { const r = S.regionAt(x, y); return r ? { r, ...at(r, x, y) } : { r: null, c: rgbOf(K, S.bg), tone: 0.6, shadow: 0, hl: 0 } }
  return { at, pic }
}

/** clip to `pts` (or the whole sheet when null) and cut out each occluder (an even-odd hole per occluder, intersected) */
export function clipTo(ctx, pts, occ, W = 1e5, H = 1e5) {
  if (pts) { ctx.beginPath(); trace(ctx, pts); ctx.clip() }
  for (const o of occ || []) { ctx.beginPath(); ctx.rect(-W, -H, 3 * W, 3 * H); trace(ctx, o); ctx.clip('evenodd') }
}
export function trace(ctx, pts, closed = true) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (closed) ctx.closePath() }

/** the area a brush has covered after fraction k of its rows: rows `band` px tall at angle `ang`, laid
 *  boustrophedon (left→right, then right→left), the row in hand as far as the brush has got, each row's
 *  lower edge wavering a little. Adds the clip to ctx. */
export function rowsClip(K, ctx, b, ang, band, k, seed = 1) {
  const c = Math.cos(ang), s = Math.sin(ang)
  // the box in the rotated frame (u along the rows, v across them)
  const corners = [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].map(([x, y]) => [x * c + y * s, -x * s + y * c])
  const u0 = Math.min(...corners.map((p) => p[0])) - 4, u1 = Math.max(...corners.map((p) => p[0])) + 4
  const v0 = Math.min(...corners.map((p) => p[1])) - 2, v1 = Math.max(...corners.map((p) => p[1])) + 2
  const n = Math.max(1, Math.ceil((v1 - v0) / band)), f = K.clamp(k) * n, full = Math.floor(f), part = f - full
  const xy = (u, v) => [u * c - v * s, u * s + v * c]
  ctx.beginPath()
  const row = (i, a, z) => {
    const top = v0 + i * band - band * 0.15, steps = 10, pts = []
    for (let j = 0; j <= steps; j++) { const u = a + ((z - a) * j) / steps; pts.push(xy(u, top)) }
    for (let j = steps; j >= 0; j--) { const u = a + ((z - a) * j) / steps, w = (K.noise(seed + i, u * 0.02, 0) - 0.5) * band * 0.5; pts.push(xy(u, top + band * 1.15 + w)) }
    trace(ctx, pts)
  }
  if (full > 1) { const e = v0 + (full - 1) * band + band * 0.2, pts = [xy(u0, v0 - band), xy(u1, v0 - band), xy(u1, e), xy(u0, e)]; trace(ctx, pts) }
  for (let i = Math.max(0, full - 1); i < full; i++) row(i, u0, u1)
  if (full < n && part > 0) { const ltr = full % 2 === 0, len = (u1 - u0) * part; row(full, ltr ? u0 : u1 - len, ltr ? u0 + len : u1) }
  ctx.clip()
}

/** record items as marks: one D.mark per group of `per`, drawing the first k·n of a group whole and the next one
 *  partway (`draw(ctx, item, travel)`). o: { per, clip: pts, occ: [pts], cost(item), pre(ctx), W, H } */
export function batches(D, items, o) {
  const per = o.per || 16, costOf = o.cost || (() => 1)
  for (let g = 0; g < items.length; g += per) {
    const grp = items.slice(g, g + per), costs = grp.map(costOf), tot = costs.reduce((a, b) => a + b, 0) || 1e-3
    D.mark(tot, (ctx, k) => {
      ctx.save()
      if (o.clip || (o.occ && o.occ.length)) clipTo(ctx, o.clip, o.occ, D.W, D.H)
      if (o.pre) o.pre(ctx)
      let budget = k * tot
      for (let i = 0; i < grp.length && budget > 0; i++) {
        const t = budget >= costs[i] ? 1 : budget / costs[i]
        o.draw(ctx, grp[i], t); budget -= costs[i]
      }
      ctx.restore()
    })
  }
}

/** order marks along a sweep at angle `ang`, broken into drifting patches so the front is never a straight line */
export function sweepSort(K, list, ang, patch = 160, seed = 1) {
  const c = Math.cos(ang), s = Math.sin(ang), r = K.rng(seed)
  for (const m of list) m._k = m.x * c + m.y * s + K.fbm(seed + 3, m.x, m.y, 1 / patch, 2) * patch * 1.6 + r() * patch * 0.2
  return list.sort((a, b) => a._k - b._k)
}

/** what hides r in an OPAQUE multi-pass hand: every later solid OR glow region overlapping it. (S.occluders leaves
 *  glows out — right for washes, but a wall repainted in a later pass would cover the window.) */
export function hides(S, r) {
  const b = r.bbox
  return S.regions.filter((q) => q.i > r.i && q.role !== 'shadow' && q.role !== 'highlight' && q.bbox.x0 < b.x1 && q.bbox.x1 > b.x0 && q.bbox.y0 < b.y1 && q.bbox.y1 > b.y0).map((q) => q.pts)
}

/** the angle a brush runs at (x, y) on region r: hoops round a round form, along its grain, a long thing along its length */
export function formDir(K, r, L) {
  const b = r.bbox
  if (r.grain !== undefined && r.grain !== null) return () => r.grain
  if (r.role === 'bg') return (x, y) => -1.05 + (K.fbm(r.i + 9, x, y, 0.004, 2) - 0.5) * 0.7 // a drifting steep diagonal
  if (r.role === 'ground') return (x, y) => (K.fbm(r.i + 9, x, y, 0.004, 2) - 0.5) * 0.18
  const long = Math.max(b.w, b.h) / Math.max(1, Math.min(b.w, b.h))
  if (long > 2.6) {
    // a tube (handle, spout, stem): along its own length, read from the outline's nearest edge
    const pts = r.pts, n = pts.length
    return (x, y) => {
      let best = 0, bd = Infinity
      for (let i = 0; i < n; i += 2) { const d = (pts[i][0] - x) ** 2 + (pts[i][1] - y) ** 2; if (d < bd) { bd = d; best = i } }
      const a = pts[(best - 2 + n) % n], c = pts[(best + 2) % n]
      return Math.atan2(c[1] - a[1], c[0] - a[0])
    }
  }
  if (r.form >= 0.45) {
    // round: round the highlight, along the contours of value (the form turning away from the light); right at the
    // highlight there is no contour to follow, so the dabs there lie every which way
    const hx = b.cx + L[0] * b.w * 0.2, hy = b.cy + L[1] * b.h * 0.2, ax = b.w * 0.62, ay = b.h * 0.62
    return (x, y) => { const u = (x - hx) / ax, v = (y - hy) / ay; if (u * u + v * v < 0.09) return K.noise(r.i + 5, x * 0.05, y * 0.05) * 6.3; return Math.atan2(u * ay, -v * ax) }
  }
  return () => (b.w >= b.h ? 0 : Math.PI / 2) + 0.12
}

/** a point a fraction along a polyline, and the polyline's cumulative lengths (for growing marks along a path) */
export function cumul(pts) { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return c }

/** HSL on [r,g,b] arrays (h in 0..1) — the broken-colour hand breaks thousands of dabs, so no hex round trips */
export function hslA(c) {
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h / 6, s, l]
}
export function fromHslA(h, s, l) {
  if (s <= 0) return [l * 255, l * 255, l * 255]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
  const f = (t) => { t = ((t % 1) + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p }
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]
}

/** a small memo for work that depends only on the scene's regions (not on the life time t): a living piece re-records
 *  every frame, but its walls and kettles have not moved. Keyed by the regions' geometry, so a moving region recomputes. */
const memoStore = new Map()
export function sceneKey(S, extra = '') {
  let h = 0
  for (const r of S.regions) { h = (h * 31 + r.pts.length) | 0; for (let i = 0; i < r.pts.length; i += 3) h = (h * 31 + Math.round(r.pts[i][0] * 8) * 7 + Math.round(r.pts[i][1] * 8)) | 0; for (const ch of r.color + r.role + (r.form ?? '') + (r.depth ?? '') + (r.grain ?? '')) h = (h * 31 + ch.charCodeAt(0)) | 0 }
  return `${S.W}x${S.H}:${S.regions.length}:${h}:${S.light[0].toFixed(3)},${S.light[1].toFixed(3)}:${extra}`
}
export function memo(key, fn) {
  if (memoStore.has(key)) return memoStore.get(key)
  const v = fn()
  if (memoStore.size > 24) memoStore.delete(memoStore.keys().next().value)
  memoStore.set(key, v)
  return v
}

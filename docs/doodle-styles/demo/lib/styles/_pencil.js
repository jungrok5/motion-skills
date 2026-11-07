// lib/styles/_pencil.js — shared by the dry-media hands (storybook, coloured-pencil, ballpoint, crayon).
// Not a style. What a hand that works in LINES (hatching, scribbling, contours) needs from a scene:
//   field(S)        a coarse map of the picture: which region is on top at each point, its value (0 dark … 1 light)
//                   including cast shadows and glows — built from the regions only (never the lines), so it is the
//                   same on every frame of a living piece and can be cached
//   hatch(...)      parallel hand-length strokes across a box, only where keep(x, y), worked strip by strip
//   scribble(...)   the same runs joined end to end into back-and-forth zigzags (crayon)
//   strokes(D, …)   one recorded mark that draws a whole list of strokes in order (cheap to play, grows stroke by stroke)
//   toothPattern    a colour that only lands on the ridges of the sheet: every layer punched by the SAME paper field
//   carve(...)      cut strokes away where a light line (steam, a white bar) runs, so it is left as bare paper
//   cached(key, fn) plans are pure functions of the regions: computed once per scene, reused by every live frame
import * as K from '../kit.js'

const NON = new Set(['shadow', 'glow', 'highlight'])
export const isSolid = (r) => !NON.has(r.role)

// ------------------------------------------------------------------ memo (pure: same key, same value)
const memo = new Map()
export function cached(key, fn) {
  if (memo.has(key)) return memo.get(key)
  const v = fn()
  memo.set(key, v)
  while (memo.size > 16) memo.delete(memo.keys().next().value)
  return v
}
/** a hash of everything a plan can depend on: the regions (not the lines), the light, the size, and `extra` (style + opts) */
export function sceneKey(S, extra = '') {
  let h = 2166136261 >>> 0
  const add = (v) => { h = Math.imul(h ^ (Math.round(v) | 0), 16777619) >>> 0 }
  const str = (s) => { for (let i = 0; i < s.length; i++) add(s.charCodeAt(i)) }
  add(S.W); add(S.H); add(S.light[0] * 1e4); add(S.light[1] * 1e4); str(S.bg)
  for (const r of S.regions) {
    add(r.i); add(r.pts.length); str(r.role); str(r.color); str(r.lit); str(r.shade)
    add(r.form * 1e3); add(r.depth * 1e3); add(r.strength * 1e3); add(r.contour ? 1 : 2); add((r.grain ?? 99) * 1e3); add(r.light[0] * 1e4); add(r.light[1] * 1e4)
    for (const [x, y] of r.pts) { add(x * 16); add(y * 16) }
  }
  return h.toString(36) + ':' + S.W + 'x' + S.H + ':' + extra
}

// ------------------------------------------------------------------ the field
/** even-odd scanline spans of a closed outline on a grid of `step` px */
function spans(pts, step, w, h, cb) {
  const b = K.bbox(pts), y0 = Math.max(0, Math.floor(b.y0 / step)), y1 = Math.min(h - 1, Math.ceil(b.y1 / step))
  for (let row = y0; row <= y1; row++) {
    const Y = (row + 0.5) * step, xs = []
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j]
      if ((yi > Y) !== (yj > Y)) xs.push(xi + ((Y - yi) * (xj - xi)) / (yj - yi))
    }
    xs.sort((a, c) => a - c)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.max(0, Math.ceil(xs[k] / step - 0.5)), c = Math.min(w - 1, Math.floor(xs[k + 1] / step - 0.5))
      if (c >= a) cb(row, a, c)
    }
  }
}
/**
 * The picture as a coarse grid (one cell per `step` px):
 *   top(x, y)    index into S.regions of the solid (or glow) region on top there, -1 for bare background
 *   value(x, y)  0 darkest … 1 lightest: the region's shaded colour (local colour turned by its light), darkened by cast
 *                shadows, lifted by glows and highlights
 *   light(x, y)  the form tone alone (r.toneAt): 0 core shadow … 1 full light
 *   shadow(x, y) the cast-shadow strength there, shadowId(x, y) which shadow, glowAt(x, y) 0..1
 */
export function field(S, step = 4) {
  const w = Math.ceil(S.W / step), h = Math.ceil(S.H / step), N = w * h
  const id = new Int16Array(N).fill(-1), sid = new Int16Array(N).fill(-1), gid = new Int16Array(N).fill(-1)
  const sh = new Float32Array(N), gl = new Float32Array(N), val = new Float32Array(N), lt = new Float32Array(N)
  S.regions.forEach((r, ri) => spans(r.pts, step, w, h, (row, a, c) => {
    for (let x = a; x <= c; x++) {
      const k = row * w + x
      if (r.role === 'shadow') { if (r.strength >= sh[k]) { sh[k] = r.strength; sid[k] = ri } }
      else if (r.role === 'highlight') { if (gl[k] <= 0.6) { gl[k] = 0.6; gid[k] = ri } }
      else if (r.role === 'glow') { id[k] = ri; sh[k] = 0; sid[k] = -1; gl[k] = 1; gid[k] = ri }
      else { id[k] = ri; sh[k] = 0; sid[k] = -1; gl[k] = 0; gid[k] = -1 }
    }
  }))
  const L = S.regions.map((r) => [K.lum(r.shade), K.lum(r.color), K.lum(r.lit)]), Lbg = K.lum(S.bg)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x, ri = id[k], X = (x + 0.5) * step, Y = (y + 0.5) * step
    let v = Lbg, t = 0.6
    if (ri >= 0) {
      const r = S.regions[ri], [ls, lc, ll] = L[ri]
      if (r.role === 'glow') { v = ll; t = 1 } else { t = r.toneAt(X, Y); v = t >= 0.6 ? lc + (ll - lc) * ((t - 0.6) / 0.4) : ls + (lc - ls) * (t / 0.6) }
    }
    if (sh[k] > 0) v *= 1 - sh[k] * (1 - 0.75 * L[sid[k]][1])
    if (gl[k] > 0 && !(ri >= 0 && S.regions[ri].role === 'glow')) v += (1 - v) * 0.25 * gl[k]
    val[k] = v; lt[k] = t
  }
  const cell = (X, Y) => K.clamp(Math.floor(Y / step), 0, h - 1) * w + K.clamp(Math.floor(X / step), 0, w - 1)
  return {
    step, w, h, id, sid, gid, sh, gl, val, lt, cell,
    top: (X, Y) => id[cell(X, Y)],
    value: (X, Y) => val[cell(X, Y)],
    light: (X, Y) => lt[cell(X, Y)],
    shadow: (X, Y) => sh[cell(X, Y)],
    shadowId: (X, Y) => sid[cell(X, Y)],
    glowAt: (X, Y) => gl[cell(X, Y)],
    /** the bbox of the cells where `test(k)` holds (a region's visible part), or null */
    boxOf(test) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (test(y * w + x)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
      if (x0 === Infinity) return null
      const b = { x0: x0 * step - step, y0: y0 * step - step, x1: (x1 + 2) * step, y1: (y1 + 2) * step }
      return { ...b, w: b.x1 - b.x0, h: b.y1 - b.y0, cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2 }
    },
  }
}

/** is a point of r's outline hidden by something painted after r? (exact, against its occluders) */
export function visibleTest(S, r) {
  const occ = S.occluders(r, { light: false }).map((pts) => ({ pts, b: K.bbox(pts) }))
  return (x, y) => !occ.some((o) => x > o.b.x0 && x < o.b.x1 && y > o.b.y0 && y < o.b.y1 && K.inside(o.pts, x, y))
}
/** the visible runs of a region's outline; `keep(i, normal, p)` can drop more (lost edges) */
export function visibleRuns(S, r, keep = () => true, step = 4) {
  const vis = visibleTest(S, r), pts = K.densify(r.pts, step, true)
  return K.runs(pts, (i, n) => vis(pts[i][0], pts[i][1]) && keep(i, n, pts[i]))
}

/** the visible runs of an open line (a stem, an edge, a window bar): the parts nothing painted after it hides */
export function lineRuns(S, l, step = 4) {
  const vis = visibleTest(S, l), pts = K.densify(l.pts, step), out = []
  let run = []
  for (const p of pts) { if (vis(p[0], p[1])) run.push(p); else { if (run.length > 1) out.push(run); run = [] } }
  if (run.length > 1) out.push(run)
  return out
}

// ------------------------------------------------------------------ hatching
/**
 * Hand-length hatch strokes along parallel lines at `angle` across `box`, only where keep(x, y).
 * Each stroke is { p: [start, middle, end], len, u, v, a } — a slightly bowed line, laid side by side in strips the
 * way a hand works a patch. o: { len, st (sample step), seed, over (overshoot px), jit (angle wander), bow, strip, alpha(x, y) }
 */
export function hatch(box, angle, gap, keep, o = {}) {
  const { len = 50, st = 3, seed = 1, over = 1.5, jit = 0.05, bow = 1.2, strip = 160, alpha = null, minLen = 3 } = o
  const r = K.rng(seed), cs = Math.cos(angle), sn = Math.sin(angle), cx = box.cx ?? (box.x0 + box.x1) / 2, cy = box.cy ?? (box.y0 + box.y1) / 2
  const R = Math.hypot(box.x1 - box.x0, box.y1 - box.y0) / 2 + gap, out = []
  const at = (u, v) => [cx + u * cs - v * sn, cy + u * sn + v * cs]
  const emit = (a, b, v) => {
    let s = a - r() * len * 0.4
    while (s < b) {
      const Ls = len * (0.55 + r() * 0.8), e = Math.min(b, s + Ls), s0 = Math.max(a, s)
      if (e - s0 > minLen) {
        const tw = (r() - 0.5) * 2 * jit, dv = ((e - s0) * Math.sin(tw)) / 2, mu = (s0 + e) / 2
        const p0 = at(s0, v - dv), p1 = at(e, v + dv), pm = at(mu, v + (r() - 0.5) * 2 * bow)
        const st2 = { p: [p0, pm, p1], len: e - s0, u: mu, v, a: 1 }
        if (alpha) st2.a = alpha(pm[0], pm[1], r)
        if (st2.a > 0.02) out.push(st2)
      }
      s = e + (r() - 0.4) * len * 0.22
    }
  }
  for (let v = -R + r() * gap; v <= R; v += gap * (0.8 + r() * 0.4)) {
    let u0 = NaN
    for (let u = -R; u <= R + st; u += st) {
      const [x, y] = at(u, v)
      const ins = u <= R && x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1 && keep(x, y)
      if (ins && Number.isNaN(u0)) u0 = u
      if (!ins && !Number.isNaN(u0)) { emit(u0 - r() * over, u - st + r() * over, v); u0 = NaN }
    }
  }
  // the hand works a strip at a time, back and forth across it
  out.sort((p, q) => { const sp = Math.floor((p.u + R) / strip), sq = Math.floor((q.u + R) / strip); return sp !== sq ? sp - sq : sp % 2 ? q.v - p.v : p.v - q.v })
  return out
}
/**
 * Crayon: the runs of a hatch joined end to end into back-and-forth zigzag strokes (the turn is part of the line).
 * Returns strokes { p: polyline, len } — each one continuous scribble until the hand has to jump.
 */
export function scribble(box, angle, gap, keep, o = {}) {
  const { st = 4, seed = 1, over = 3, jitter = 1.4, strip = 170 } = o
  const r = K.rng(seed), cs = Math.cos(angle), sn = Math.sin(angle), cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2
  const R = Math.hypot(box.x1 - box.x0, box.y1 - box.y0) / 2 + gap, runs = []
  const at = (u, v) => [cx + u * cs - v * sn, cy + u * sn + v * cs]
  const put = (a, b, v) => {
    // a hand scribbles a patch at a time: split the run where it crosses into the next patch
    let s = a
    while (s < b) { const bin = Math.floor((s + R) / strip), e = Math.min(b, -R + (bin + 1) * strip + (r() - 0.5) * strip * 0.35); if (e - s > 2) runs.push({ a: s, b: e, v, bin }); if (e >= b) break; s = Math.max(s + 2, e - r() * 4) }
  }
  for (let v = -R + r() * gap; v <= R; v += gap * (0.85 + r() * 0.3)) {
    let u0 = NaN
    for (let u = -R; u <= R + st; u += st) {
      const [x, y] = at(u, v), ins = u <= R && x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1 && keep(x, y)
      if (ins && Number.isNaN(u0)) u0 = u
      if (!ins && !Number.isNaN(u0)) { put(u0 - r() * over, u - st + r() * over, v); u0 = NaN }
    }
  }
  runs.sort((p, q) => p.bin - q.bin || p.v - q.v || p.a - q.a)
  // chain each run to the next one down in the same patch that it overlaps: the turn of the zigzag is part of the line
  const out = [], used = new Uint8Array(runs.length)
  const pt = (u, v) => { const p = at(u, v); return [p[0] + (r() - 0.5) * jitter, p[1] + (r() - 0.5) * jitter] }
  const runPts = (q, fwd) => { const n = Math.max(1, Math.ceil((q.b - q.a) / 16)), pts = []; for (let i = 0; i <= n; i++) { const t = fwd ? i / n : 1 - i / n; pts.push(pt(q.a + (q.b - q.a) * t, q.v + (r() - 0.5) * 0.8)) } return pts }
  for (let i = 0; i < runs.length; i++) {
    if (used[i]) continue
    used[i] = 1
    let fwd = r() < 0.5, last = runs[i]
    const pts = runPts(last, fwd)
    for (let j = i + 1; j < runs.length && runs[j].bin === last.bin; j++) {
      const q = runs[j]
      if (used[j] || q.v <= last.v + 0.01) continue
      if (q.v > last.v + gap * 2.5) break
      if (Math.min(q.b, last.b) - Math.max(q.a, last.a) <= 0) continue
      used[j] = 1; fwd = !fwd; pts.push(...runPts(q, fwd)); last = q
    }
    out.push({ p: pts, len: K.length(pts) })
  }
  return out
}

/** cut strokes where they cross a reserved band (light lines left as bare paper): lines = [{ pts, r }] */
export function carve(list, lines, step = 3) {
  if (!lines.length) return list
  const bands = lines.map((l) => { const b = K.bbox(l.pts); return { pts: l.pts, r: l.r, x0: b.x0 - l.r, y0: b.y0 - l.r, x1: b.x1 + l.r, y1: b.y1 + l.r } })
  const X0 = Math.min(...bands.map((b) => b.x0)), Y0 = Math.min(...bands.map((b) => b.y0)), X1 = Math.max(...bands.map((b) => b.x1)), Y1 = Math.max(...bands.map((b) => b.y1))
  const hit = (x, y) => {
    for (const b of bands) {
      if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) continue
      for (let i = 1; i < b.pts.length; i++) if (segDist(x, y, b.pts[i - 1], b.pts[i]) < b.r) return true
    }
    return false
  }
  const out = []
  for (const s of list) {
    const bb = K.bbox(s.p)
    if (bb.x1 < X0 || bb.x0 > X1 || bb.y1 < Y0 || bb.y0 > Y1 || !bands.some((b) => bb.x1 >= b.x0 && bb.x0 <= b.x1 && bb.y1 >= b.y0 && bb.y0 <= b.y1)) { out.push(s); continue }
    const pts = K.densify(s.p, step)
    let run = []
    for (const p of pts) {
      if (hit(p[0], p[1])) { if (run.length > 1) out.push({ ...s, p: run, len: K.length(run) }); run = [] } else run.push(p)
    }
    if (run.length === pts.length) out.push(s)
    else if (run.length > 1) out.push({ ...s, p: run, len: K.length(run) })
  }
  return out
}
export function segDist(x, y, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1, t = K.clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l)
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy)
}

/** a contour drawn as a chain of overlapping hand strokes, each a little off the last: polylines */
export function chain(run, { seg = 70, seed = 1, off = 0.8, back = 2 } = {}) {
  const r = K.rng(seed), path = K.densify(run, 3), n = path.length, out = []
  let i = 0
  while (i < n - 1) {
    const L = seg * (0.6 + r() * 0.8), start = Math.max(0, i - Math.round(r() * back)); let j = start, acc = 0
    while (j < n - 1 && acc < L) { acc += K.dist(path[j], path[j + 1]); j++ }
    const o = (r() - 0.5) * 2 * off, piece = path.slice(start, j + 1).filter((_, k, a) => k % 2 === 0 || k === a.length - 1).map(([x, y]) => [x + o, y + o * 0.6])
    if (piece.length > 1) out.push(piece)
    i = j
  }
  return out
}

// ------------------------------------------------------------------ the paper's tooth, as a colour
const tiles = new Map()
const T = 256
/** alpha masks, one per pressure: the same field at a different threshold, so the valleys stay bare through every layer.
 *  kinds: 'pencil' (streaked along the hatch diagonal, fine), 'wax' (coarser crayon tooth); coverage 0..1 */
function mask(kind, coverage) {
  const key = `mask:${kind}:${coverage}`
  if (tiles.has(key)) return tiles.get(key)
  const fk = `field:${kind}`
  let f = tiles.get(fk)
  if (!f) {
    f = new Float32Array(T * T)
    const dx = Math.cos(-0.78) * 1.6, dy = Math.sin(-0.78) * 1.6
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      let v
      if (kind === 'wax') v = 0.14 * K.fbm(81, x, y, 0.05, 2, T) + 0.5 * K.fbm(82, x, y, 0.28, 2, T) + 0.36 * K.fbm(83, x, y, 0.75, 1, T)
      else { let s = 0; for (let k = -3; k <= 3; k++) s += K.fbm(71, x + k * dx, y + k * dy, 0.25, 2, T); v = 0.62 * (s / 7) + 0.38 * K.fbm(73, x, y, 0.8, 1, T) }
      f[y * T + x] = v
    }
    tiles.set(fk, f)
  }
  const sorted = Float32Array.from(f).sort(), th = sorted[Math.min(T * T - 1, Math.floor(coverage * T * T))]
  const sharp = kind === 'wax' ? 40 : 28
  const c = K.canvas(T, T), x2 = c.getContext('2d'), img = x2.createImageData(T, T), d = img.data
  for (let i = 0; i < T * T; i++) { d[i * 4 + 3] = 255 * K.clamp((th - f[i]) * sharp + 0.5) }
  x2.putImageData(img, 0, 0)
  tiles.set(key, c)
  return c
}
/** a fill/stroke style: `color` that lands only on the ridges of the sheet (kind 'pencil' | 'wax', coverage 0..1) */
export function toothPattern(ctx, color, kind = 'pencil', coverage = 0.7) {
  const key = `col:${kind}:${coverage}:${color}`
  let c = tiles.get(key)
  if (!c) {
    c = K.canvas(T, T); const x = c.getContext('2d')
    x.fillStyle = color; x.fillRect(0, 0, T, T); x.globalCompositeOperation = 'destination-in'; x.drawImage(mask(kind, coverage), 0, 0)
    tiles.set(key, c)
    if (tiles.size > 400) for (const k of [...tiles.keys()].filter((k) => k.startsWith('col:')).slice(0, 100)) tiles.delete(k)
  }
  return ctx.createPattern(c, 'repeat')
}

// ------------------------------------------------------------------ playing a list of strokes as one mark
const plen = (p) => { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L }
/** the first fraction f of a polyline */
const cutAt = (p, f) => K.upTo(p, f)
/** a flicked pencil stroke's outline: pressure arrives fast, lifts off in a long taper */
function flick(p, w, tip = 0.22) {
  const c = K.densify(p, 4), n = c.length, L = [], R = []
  for (let i = 0; i < n; i++) {
    const a = c[Math.max(0, i - 1)], b = c[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, t = i / (n - 1 || 1)
    const hw = (w / 2) * Math.max(tip, Math.pow(K.clamp(t / 0.16), 0.6) * Math.pow(K.clamp((1 - t) / 0.42), 0.75))
    L.push([c[i][0] - (dy / l) * hw, c[i][1] + (dx / l) * hw]); R.push([c[i][0] + (dy / l) * hw, c[i][1] - (dx / l) * hw])
  }
  return [...L, ...R.reverse()]
}
/**
 * One recorded mark for a whole list of strokes, drawn in list order; while drawing, the stroke at the cut is drawn
 * partway. Each stroke { p, len, a (alpha ×), w (width ×), c (colour) }.
 * o: { color, w, alpha, lift (px of time for every lift of the pen), cost, shape: 'line' | 'flick', tooth: { kind, coverage } | null,
 *      blob (radius of the bead a ballpoint leaves where a firm stroke stops), blend, boil (re-wobble per frame), frame }
 */
export function strokes(D, list, o = {}) {
  if (!list || !list.length) return
  const { color = '#333', w = 1, alpha = 1, lift = 6, cost = 1, shape = 'line', tooth = null, blob = 0, blend = null } = o
  const cum = new Float64Array(list.length)
  let tot = 0
  list.forEach((s, i) => { if (s.len == null) s.len = plen(s.p); tot += s.len + lift; cum[i] = tot })
  D.mark((cost * tot) / 100, (ctx, k) => {
    const lim = k * tot
    ctx.save(); if (blend) ctx.globalCompositeOperation = blend
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    let cur = null
    for (let i = 0; i < list.length; i++) {
      const s = list[i], start = i ? cum[i - 1] : 0
      if (start >= lim) break
      const f = Math.min(1, (lim - start) / (s.len || 1)), pts = f < 1 ? cutAt(s.p, f) : s.p
      if (pts.length < 2) continue
      const col = s.c || color
      if (col !== cur) { const st = tooth ? toothPattern(ctx, col, tooth.kind, tooth.coverage) : col; ctx.strokeStyle = st; ctx.fillStyle = st; cur = col }
      ctx.globalAlpha = K.clamp(alpha * (s.a ?? 1))
      const ww = w * (s.w ?? 1)
      if (shape === 'flick') { K.path(ctx, flick(pts, ww)); ctx.fill() }
      else { ctx.lineWidth = ww; K.path(ctx, pts, false); ctx.stroke() }
      if (blob && f >= 1 && s.blob !== false) { const e = pts[pts.length - 1]; ctx.globalAlpha = K.clamp(alpha * 0.85); ctx.beginPath(); ctx.arc(e[0], e[1], blob * (s.blobR ?? 1), 0, Math.PI * 2); ctx.fill() }
    }
    ctx.restore()
  })
}

/** light lines (steam, a white bar): drawn as light by every hand here; `role` steam boils */
export const lightLines = (S) => S.lines.filter((l) => K.isLight(l.color))
export const darkLines = (S) => S.lines.filter((l) => !K.isLight(l.color))
/** a value-noise wander for ragged tone edges (a hand stops its hatching at a different place every stroke) */
export const ragged = (seed, x, y, amt, f = 0.035) => (K.fbm(seed, x, y, f, 2) - 0.5) * amt
/** regions in index order with their index into S.regions */
export const indexed = (S) => S.regions.map((r, ri) => ({ r, ri }))

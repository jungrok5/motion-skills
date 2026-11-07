// lib/styles/_tone.js — private helpers shared by the tone hands (charcoal, chalkboard, stipple, engraving).
// Nothing here draws: these turn the prepared scene into the geometry those hands lay marks along.
// Every function is pure and seeded (no Math.random, no clock).

/** a fast integer hash in [0, 1) — for per-dot jitter where a K.rng per point would be too slow */
export function hash(a, b, seed = 0) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** the picture's value range (2nd and 98th percentile on a coarse grid), so a hand can use its whole range on any scene.
 *  Returns v(x, y) → 0 darkest … 1 lightest, stretched. */
export function stretchedTone(S, K, { lo = 0.02, hi = 0.98, step = 18 } = {}) {
  const vals = []
  for (let y = step / 2; y < S.H; y += step) for (let x = step / 2; x < S.W; x += step) vals.push(S.tone(x, y))
  vals.sort((a, b) => a - b)
  const a = vals[Math.floor(vals.length * lo)] ?? 0, b = vals[Math.min(vals.length - 1, Math.floor(vals.length * hi))] ?? 1
  const span = Math.max(0.2, b - a)
  return (x, y) => K.clamp((S.tone(x, y) - a) / span)
}

/** parallel drags across a box at `angle`, `gap` apart, split into runs where keep(x, y) holds.
 *  Rows alternate direction (a hand going back and forth). Returns [[x, y]…] polylines of ≥ 2 points. */
export function dragRuns(box, angle, gap, keep, { step = 5, jitter = 0, seed = 1, minLen = 3, alternate = true } = {}) {
  const c = Math.cos(angle), s = Math.sin(angle), cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2
  const R = Math.hypot(box.x1 - box.x0, box.y1 - box.y0) / 2 + gap, out = []
  let row = 0
  for (let v = -R + (hash(seed, 7) * gap); v <= R; v += gap, row++) {
    const vj = v + (jitter ? (hash(seed, row, 3) - 0.5) * jitter : 0), runs = []
    let cur = null
    for (let u = -R; u <= R; u += step) {
      const x = cx + u * c - vj * s, y = cy + u * s + vj * c
      const ok = x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1 && keep(x, y)
      if (ok) (cur ||= []).push([x, y])
      else if (cur) { if (cur.length >= minLen) runs.push(cur); cur = null }
    }
    if (cur && cur.length >= minLen) runs.push(cur)
    if (alternate && row % 2) { runs.reverse(); runs.forEach((r) => r.reverse()) }
    out.push(...runs)
  }
  return out
}

/** sort marks the way a hand works a sheet: patch by patch (cells of `patch` px), in a snake, top to bottom */
export const snakeKey = (x, y, patch = 84) => { const py = Math.floor(y / patch), px0 = Math.floor(x / patch); return py * 1000 + (py % 2 ? 999 - px0 : px0) }

/** the region drawn on top at (x, y), including glows (so a light source is its own patch) */
export const topAt = (S, x, y) => S.regionAt(x, y)

/** the most important subject: the biggest, roundest thing (where a single line starts, where the eye goes) */
export function focal(S) {
  let best = null, score = -1
  for (const r of S.solid) {
    if (r.role === 'bg' || r.role === 'ground') continue
    const k = r.area * (0.2 + r.form * r.form) * (r.role === 'detail' ? 0.4 : 1)
    if (k > score) { score = k; best = r }
  }
  return best ? [best.bbox.cx, best.bbox.cy] : [S.W / 2, S.H / 2]
}

/** points every `gap` px along a polyline (open), each with its unit normal */
export function along(pts, gap, K, closed = false) {
  const L = K.length(pts, closed), n = Math.max(2, Math.round(L / gap))
  const p = K.resample(pts, n, closed), nn = K.normals(p, closed)
  return p.map((q, i) => [q[0], q[1], nn[i][0], nn[i][1]])
}

// ------------------------------------------------------------------ a tiny stroke alphabet (chalk ghosts, labels)
// unit box, y down; each glyph is a list of polylines
const G = {
  A: [[[0, 1], [0.5, 0], [1, 1]], [[0.22, 0.58], [0.78, 0.58]]],
  D: [[[0, 0], [0, 1], [0.55, 1], [0.95, 0.7], [0.95, 0.3], [0.55, 0], [0, 0]]],
  E: [[[1, 0], [0, 0], [0, 1], [1, 1]], [[0, 0.5], [0.72, 0.5]]],
  H: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]],
  K: [[[0, 0], [0, 1]], [[0.95, 0], [0, 0.62]], [[0.3, 0.42], [1, 1]]],
  L: [[[0, 0], [0, 1], [0.9, 1]]],
  M: [[[0, 1], [0, 0], [0.5, 0.62], [1, 0], [1, 1]]],
  N: [[[0, 1], [0, 0], [1, 1], [1, 0]]],
  O: [Array.from({ length: 17 }, (_, i) => [0.5 + 0.5 * Math.cos((i / 16) * Math.PI * 2 - Math.PI / 2), 0.5 + 0.5 * Math.sin((i / 16) * Math.PI * 2 - Math.PI / 2)])],
  P: [[[0, 1], [0, 0], [0.7, 0], [0.95, 0.22], [0.7, 0.48], [0, 0.48]]],
  R: [[[0, 1], [0, 0], [0.7, 0], [0.95, 0.22], [0.7, 0.48], [0, 0.48]], [[0.45, 0.48], [1, 1]]],
  S: [[[0.95, 0.12], [0.7, 0], [0.25, 0], [0.02, 0.22], [0.25, 0.46], [0.75, 0.54], [0.98, 0.78], [0.75, 1], [0.25, 1], [0, 0.88]]],
  T: [[[0, 0], [1, 0]], [[0.5, 0], [0.5, 1]]],
  W: [[[0, 0], [0.25, 1], [0.5, 0.38], [0.75, 1], [1, 0]]],
  2: [[[0.02, 0.22], [0.3, 0], [0.72, 0], [0.98, 0.25], [0, 1], [1, 1]]],
  3: [[[0, 0], [0.95, 0], [0.42, 0.42], [0.95, 0.68], [0.7, 1], [0.05, 0.92]]],
  4: [[[0.72, 1], [0.72, 0], [0, 0.68], [1, 0.68]]],
}
/** a line of capitals as polylines: left x, baseline-top y, cap height. Unknown characters are spaces. */
export function writing(text, x, y, cap, seed = 1) {
  const out = []
  let pen = x
  for (const ch of String(text).toUpperCase()) {
    const g = G[ch], w = cap * (ch === 'M' || ch === 'W' ? 0.85 : 0.62), slant = 0.12
    if (g) for (const pl of g) out.push(pl.map(([u, v], i) => [pen + u * w + (1 - v) * cap * slant + (hash(seed, i, pen | 0) - 0.5) * cap * 0.05, y + v * cap + (hash(seed + 1, i, pen | 0) - 0.5) * cap * 0.05]))
    pen += w + cap * 0.3
  }
  return out
}

/** one drag of a stick (charcoal, chalk) whose pressure changes along it: drawn as abutting pieces, each with its own
 *  alpha from alphaAt(x, y) averaged over the piece (0 skips it). Neighbouring pieces of the same pressure (alpha
 *  quantised to 1/48) are one path, so a long even drag is one stroke call. Grows along the run while being drawn. */
export function drag(D, K, run, { w = 10, color = '#000', alphaAt = () => 1, piece = 4, cost = 0.3, cap = 'butt' } = {}) {
  if (!run || run.length < 2) return
  const parts = [] // [points, alpha, length]
  for (let i = 0; i < run.length - 1; i += piece) {
    const seg = run.slice(i, Math.min(run.length, i + piece + 1))
    let a = 0
    for (const q of seg) a += alphaAt(q[0], q[1])
    a = Math.round((a / seg.length) * 48) / 48
    const last = parts[parts.length - 1]
    if (last && last[1] === a) { last[0].push(...seg.slice(1)); last[2] += K.length(seg) } else parts.push([seg, a, K.length(seg)])
  }
  if (!parts.some(([, a]) => a > 0)) return
  const total = parts.reduce((t, p) => t + p[2], 0)
  D.mark((cost * total) / 120, (ctx, k) => {
    const upto = total * k
    let acc = 0
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = cap; ctx.lineJoin = 'round'
    for (const [seg, a, len] of parts) {
      if (acc >= upto) break
      const s = acc + len > upto ? K.upTo(seg, (upto - acc) / (len || 1)) : seg
      acc += len
      if (a <= 0 || s.length < 2) continue
      ctx.globalAlpha = Math.min(1, a); K.path(ctx, s, false); ctx.stroke()
    }
    ctx.restore()
  })
}

// ------------------------------------------------------------------ a blue-noise threshold matrix (void-and-cluster)
// 64×64 ranks, built once per page (≈ 50 ms) with Ulichney's void-and-cluster: thresholding it at any level gives
// evenly spread points with no clumps and no lattice — what a stippler's hand does by eye.
let BLUE = null
export function blueNoise() {
  if (BLUE) return BLUE
  const N = 64, NN = N * N, sig = 1.5, ker = new Float32Array(NN)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = Math.min(x, N - x), dy = Math.min(y, N - y); ker[y * N + x] = Math.exp(-(dx * dx + dy * dy) / (2 * sig * sig)) }
  const E = new Float32Array(NN), on = new Uint8Array(NN)
  const put = (p, s) => { const px = p % N, py = (p / N) | 0; for (let y = 0; y < N; y++) { const ky = ((y - py + N) % N) * N, row = y * N; for (let x = 0; x < N; x++) E[row + x] += s * ker[ky + ((x - px + N) % N)] } }
  const best = (want, max) => { let b = -1, bv = max ? -Infinity : Infinity; for (let i = 0; i < NN; i++) if (on[i] === want && (max ? E[i] > bv : E[i] < bv)) { bv = E[i]; b = i } return b }
  let s = 20260925
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
  const m = Math.round(NN * 0.1)
  for (let k = 0; k < m;) { const p = Math.floor(rnd() * NN); if (!on[p]) { on[p] = 1; put(p, 1); k++ } }
  for (let it = 0; it < NN; it++) { // relax the initial pattern
    const c = best(1, true); on[c] = 0; put(c, -1)
    const v = best(0, false); if (v === c) { on[c] = 1; put(c, 1); break }
    on[v] = 1; put(v, 1)
  }
  const rank = new Float32Array(NN), init = on.slice(), E0 = E.slice()
  for (let r = m - 1; r >= 0; r--) { const c = best(1, true); on[c] = 0; put(c, -1); rank[c] = r }
  on.set(init); E.set(E0)
  for (let r = m; r < NN; r++) { const v = best(0, false); on[v] = 1; put(v, 1); rank[v] = r }
  for (let i = 0; i < NN; i++) rank[i] = (rank[i] + 0.5) / NN
  BLUE = { N, rank, at: (i, j) => rank[(((j % N) + N) % N) * N + (((i % N) + N) % N)] }
  return BLUE
}

/** the parts of an outline (a region's, or a run of it) that are not hidden by anything painted after it — found by
 *  looking just either side of the line, so a whole sheet of outlines can share one layer instead of one cut each.
 *  `item` is a region or a line; for a line, a point is visible when nothing solid painted after the line covers it. */
export function visibleRuns(S, K, pts, item, { closed = false, step = 3 } = {}) {
  const d = K.densify(closed ? [...pts, pts[0]] : pts, step), nn = K.normals(d), out = []
  let cur = null
  const isRegion = item.kind === 'region'
  for (let i = 0; i < d.length; i++) {
    const [x, y] = d[i], [nx, ny] = nn[i]
    let ok
    if (isRegion) ok = S.regionAt(x + nx * 2.5, y + ny * 2.5) === item || S.regionAt(x - nx * 2.5, y - ny * 2.5) === item
    else { const top = S.regionAt(x, y); ok = !top || top.i < item.i || top.role === 'glow' }
    if (ok) (cur ||= []).push(d[i])
    else if (cur) { if (cur.length > 1) out.push(cur); cur = null }
  }
  if (cur && cur.length > 1) out.push(cur)
  return out
}

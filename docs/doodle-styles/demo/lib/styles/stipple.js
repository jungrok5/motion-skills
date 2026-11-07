// Pen-and-ink stipple — studied from anidoodle's stipple plate (one 0.25 mm technical pen touched straight down onto
// hot-press bristol thousands of times; tone is only how many dots sit in a square centimetre; no line, no hatch, no
// wash; the darkest masses first, then out into the mid tones, a few sparse passes over the light last; each pass works
// the sheet patch by patch). Re-implemented for the scene model.
//
// Where the dots go: a blue-noise threshold (void-and-cluster) over a fine jittered lattice, compared against the
// picture's value (S.tone), so density follows tone with no clumps. A light line (steam, a white bar) is simply where
// no dot lands; a dark line (a stem, an edge) is dotted along its length. The shadow side of each shape gets a row of
// dots first, the way a stippler marks where an edge will be; on the lit side the edge is lost.
//
// defaults (all overridable by a house style):
//   paper  the bristol         ink   the pen's carbon black
//   dot    the nib's radius (px at 1080)        pitch   the finest spacing between dots (px at 1080; larger = fewer dots)
//   gamma  >1 lightens the mid tones, <1 darkens them
import { hash, stretchedTone, snakeKey, along, blueNoise } from './_tone.js'

export default {
  id: 'stipple', name: 'Pen-and-ink stipple', ko: '펜 점묘',
  medium: 'one 0.25 mm technical pen, never changed, touched straight down onto hot-press bristol',
  mark: 'a dot of one size, a touch oval, now and then a dry grey one; tone is only how many dots there are',
  edge: 'no contours: an edge is where the density changes; in full light it is simply lost',
  order: ['edges dotted in', 'darkest masses', 'into the mid tones', 'sparse light passes'],
  paper: 'bright hot-press bristol, a faint tooth',
  palette: 'carbon black, a hair warm, on white; value only',
  bestFor: '정밀하고 차분한 그림 · 표본, 도감, 사물 · 과학 일러스트',
  source: 'anidoodle stipple.ts · stippleKit.ts · styles/stipple.md',
  defaults: { paper: '#fbfaf5', ink: '#15120e', dot: 1.2, pitch: 2.35, gamma: 1.1 },
  draw(D, S, K, o) {
    const L = S.light, u = Math.min(S.W, S.H) / 1080, ink = o.ink, BN = blueNoise()
    const v = stretchedTone(S, K), g = (o.pitch ?? 2.35) * u, R = (o.dot ?? 1.2) * u, gam = o.gamma ?? 1.1
    const want = (x, y) => Math.pow(K.smoothstep(0.05, 0.97, 1 - v(x, y)), gam) // fraction of the lattice that gets a dot
    const dot = (x, y, s) => [x, y, R * (0.88 + 0.26 * hash(s, 3, 1))]

    D.ground(() => D.sheet(o.paper))

    // the field: one candidate per lattice cell, jittered; a dot where the blue-noise rank is under the ink wanted there
    const PASSES = 3, passes = Array.from({ length: PASSES }, () => []), dry = Array.from({ length: PASSES }, () => [])
    const nx = Math.ceil(S.W / g), ny = Math.ceil(S.H / g)
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = (i + 0.5 + (hash(i, j, 1) - 0.5) * 0.6) * g, y = (j + 0.5 + (hash(i, j, 2) - 0.5) * 0.6) * g
      const w = want(x, y), th = BN.at(i, j)
      if (th >= w) continue
      const key = (1 - w) + 0.42 * hash(i, j, 5), p = Math.min(PASSES - 1, Math.floor(Math.pow(K.clamp(key / 1.25), 1.2) * PASSES))
      const d = dot(x, y, i * 7919 + j); d.k = snakeKey(x, y, 84 * u) + th
      ;(hash(i, j, 9) < 0.035 ? dry : passes)[p].push(d)
    }

    // 1 — the edges, dotted in along the shadow side of each shape, and dark lines dotted along their length
    D.pass('edges dotted in', 0.8, () => {
      const list = []
      for (const r of S.solid) {
        if (!r.contour || r.area < 200 * u * u) continue
        for (const run of K.runs(r.pts, (i, n) => K.facing(n, L) < 0.3)) {
          if (K.length(run) < 6 * u) continue
          for (const [x, y, ax, ay] of along(run, 3.1 * u, K)) {
            const jx = x + (hash(x | 0, y | 0, 1) - 0.5) * 1.2 * u, jy = y + (hash(y | 0, x | 0, 2) - 0.5) * 1.2 * u
            if (S.regionAt(jx + ax * 2 * u, jy + ay * 2 * u) === r || S.regionAt(jx - ax * 2 * u, jy - ay * 2 * u) === r) list.push(dot(jx, jy, list.length))
          }
        }
      }
      for (const l of S.lines) {
        if (K.isLight(l.color)) continue
        const rows = l.w > 4 * u ? [-l.w / 4, l.w / 4] : [0]
        for (const off of rows) for (const [x, y, ax, ay] of along(l.pts, 2.6 * u, K)) {
          const px = x + ax * off + (hash(x | 0, y | 0, 3) - 0.5) * u, py = y + ay * off + (hash(y | 0, x | 0, 4) - 0.5) * u, top = S.regionAt(px, py)
          if (!top || top.i < l.i) list.push(dot(px, py, list.length))
        }
      }
      D.dots(list, ink, { alpha: 0.95, cost: 1 })
    })

    // 2–4 — the darkest masses, then the mid tones, then a few sparse passes over the light; patch by patch, in a snake
    const names = ['darkest masses', 'into the mid tones', 'sparse light passes'], weights = [2.4, 2.4, 1.2]
    passes.forEach((list, p) => {
      D.pass(names[p], weights[p], () => {
        // the dots go down in one order; a dry one (the nib running out) prints grey
        const grey = K.mix(ink, o.paper, 0.5)
        const all = list.concat(dry[p].map((d) => { d[3] = grey; return d })).sort((a, b) => a.k - b.k)
        D.dots(all, ink, { alpha: 0.95, cost: 1 })
      })
    })

    D.top(() => D.texture('paper', { opacity: 0.06 }))
  },
}

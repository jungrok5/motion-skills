// Ballpoint sketch — studied from anidoodle's pocket-watch plate (pocketWatch.ts · pocketWatchDraw.ts ·
// styles/pocketWatchDraw.md). One blue biro, near-constant weight; tone ONLY from where the hatching sits (one
// direction, then a cross layer, then a third direction in the darkest places), the bead of ink where a firm stroke
// stops, and solid blacks scribbled in last. A pen cannot take a mark back, so the contour is committed before any tone.
// Colour becomes tone: the picture's value (local colour turned by the light, cast shadows, glows) decides where the
// hatching sits; light lines (steam, a white bar) are paper that was never hatched.
//
// defaults (all overridable by a house style):
//   paper   the cartridge sheet            ink     the one biro colour
//   gap     hatch spacing at 1080 px       angle   the first hatch direction (radians; up-right by default)
//   levels  [single, cross, third, solid] value thresholds (0 dark … 1 light) under which each layer goes down
//   lift    how much the light midtones are lifted before tone is read (0 = colour value as is)
//   back    how much walls, skies and tables are lifted toward paper, so the subject carries the darks
import { field, cached, sceneKey, hatch, carve, chain, strokes, visibleRuns, lineRuns, isSolid, lightLines, darkLines, ragged } from './_pencil.js'

export default {
  id: 'ballpoint', name: 'Ballpoint sketch', ko: '볼펜 스케치',
  medium: 'one blue ballpoint (biro) on cream cartridge paper',
  mark: 'near-constant-weight hatching: one direction, a cross layer, a third direction in the darkest places; a bead of ink where a firm stroke stops',
  edge: 'every edge is a line, committed before any tone; light is paper that was never hatched',
  order: ['construction', 'contours', 'detail', 'first hatch', 'cross hatch', 'third direction', 'solid blacks'],
  paper: 'cream cartridge, barely any tooth',
  palette: 'one blue ink; colour becomes tone',
  bestFor: '진지한 주제 · 리포트, 에세이 · 설명 스케치 · 물건의 구조',
  source: 'anidoodle pocketWatch.ts · pocketWatchDraw.ts · styles/pocketWatchDraw.md',
  defaults: { paper: '#f6f2e6', ink: '#23379f', gap: 6.2, angle: -0.86, levels: [0.8, 0.56, 0.36, 0.13], lift: 0.05, back: 0.3 },
  draw(D, S, K, o) {
    const ink = o.ink, paper = o.paper, sc = Math.sqrt((S.W * S.H) / (1080 * 1080)), gap = o.gap * sc
    const [l1, l2, l3, l4] = o.levels
    const plan = cached(sceneKey(S, 'ballpoint:' + JSON.stringify(o)), () => {
      const F = field(S, 4)
      // the sketcher keeps what stands behind lighter than the subject: walls and tables are lifted a little more
      const back = S.regions.map((r) => r.role === 'bg' || r.role === 'ground')
      const round = S.regions.map((r) => r.form)
      // …and the glare on a round thing is paper the pen went round
      const tone = (x, y) => { const v = F.value(x, y), id = F.top(x, y), b = id < 0 || back[id], t = v + (1 - v) * (b ? o.back : o.lift * v); return b ? t : t + 0.3 * round[id] * K.smoothstep(0.88, 0.99, F.light(x, y)) }
      const parts = [{ ri: -1, r: null }, ...S.regions.map((r, ri) => ({ r, ri })).filter(({ r }) => isSolid(r) || r.role === 'glow')]
      const h = [[], [], [], []]
      // tone, region by region: a sketcher works one object at a time, each patch re-settling the hand a few degrees
      for (const { r, ri } of parts) {
        const box = F.boxOf((k) => F.id[k] === ri)
        if (!box) continue
        const turn = ((((ri + 3) * 7919) % 13) - 6) * 0.022, g = r?.grain
        const a1 = g != null && Math.abs(Math.cos(g)) > 0.5 ? g + turn * 0.5 : o.angle + turn
        const angs = [a1, a1 + 1.62 + turn, o.angle + 2.45 + turn * 0.5, 0.35 + turn]
        const lv = [l1, l2, l3, l4], gaps = [gap, gap * 1.02, gap * 0.92, gap * 0.36]
        lv.forEach((th, j) => {
          const big = ri < 0 || back[ri], f = big ? 0.012 : 0.03
          const keep = (x, y) => F.top(x, y) === ri && tone(x, y) + ragged(5 + j, x, y, j === 3 ? 0.05 : 0.14, f) < th
          h[j].push(...hatch(box, angs[j], gaps[j], keep, { len: j === 3 ? 26 : 34 + 30 * sc, seed: 101 + ri * 13 + j, over: j === 3 ? 0.5 : 1.8, bow: j === 3 ? 0.4 : 1.1, strip: 130, st: j === 3 ? 2 : 3, jit: 0.04, alpha: (x, y, rr) => 0.66 + 0.3 * rr() }))
        })
      }
      // contours: every visible edge of every solid thing, a chain of firm strokes; the shade side gone over twice
      const cont = [], det = [], build = []
      S.regions.forEach((r, ri) => {
        if (!isSolid(r) || !r.contour) return
        const small = r.role === 'detail' || r.area < 9000
        for (const run of visibleRuns(S, r)) {
          for (const p of chain(run, { seg: small ? 40 : 90, seed: r.i * 31 + run.length, off: 0.6 })) (small ? det : cont).push({ p, a: 0.92, w: 1, blob: !small })
        }
        const L = r.light
        for (const run of visibleRuns(S, r, (i, n) => K.facing(n, L) < -0.25)) for (const p of chain(run, { seg: 70, seed: r.i * 17 + 5, off: 1.4 })) (small ? det : cont).push({ p, a: 0.7, w: 0.9, blob: false })
        // construction: a loose ellipse and the axis through each big thing, left in
        if (!small && r.role === 'subject' && r.form >= 0.5) {
          const b = r.bbox, rr = K.rng(r.i + 77)
          build.push({ p: K.wobble(K.ellipse(b.cx, b.cy, b.w * 0.53, b.h * 0.53, 40, rr() * 6).concat([K.ellipse(b.cx, b.cy, b.w * 0.53, b.h * 0.53, 40)[0]]), 2, r.i), a: 0.32 })
          build.push({ p: [[b.cx + (rr() - 0.5) * 6, b.y0 - b.h * 0.12], [b.cx + (rr() - 0.5) * 6, b.y1 + b.h * 0.1]], a: 0.3 })
        }
      })
      // the line where the ground meets what stands behind it
      for (const r of S.regions) if (r.role === 'ground') { const b = r.bbox; build.push({ p: [[b.x0 - 20, b.y0], [b.cx, b.y0 + 1.5], [b.x1 + 20, b.y0]], a: 0.3 }) }
      return { h, cont, det, build }
    })

    // light lines are reserved: the hatching parts around them
    const lights = lightLines(S), reserve = lights.map((l) => ({ pts: l.pts, r: Math.max(3, l.w * 0.75) }))
    const pen = { color: ink, w: 1.05, lift: 9 }

    D.ground(() => D.sheet(paper))
    D.pass('construction', 0.5, () => strokes(D, plan.build, { ...pen, w: 0.8, alpha: 1, lift: 14 }))
    D.pass('contours', 1.5, () => {
      strokes(D, plan.cont, { ...pen, blob: 1.15 })
      // a light line is drawn by its two edges (a white bar) or a broken wisp each side (steam, which moves)
      lights.forEach((l, i) => {
        const steam = l.role === 'steam', half = Math.max(2.5, l.w * 0.6)
        const side0 = (sm, s) => { const nn = K.normals(sm); return sm.map((p, j) => [p[0] + nn[j][0] * half * s, p[1] + nn[j][1] * half * s]) }
        if (steam) {
          const sm = K.smooth(l.pts, false, 6), side = (s) => side0(sm, s)
          const wob = (s, seed) => K.wobble(side(s), 1.6, seed * 31 + D.frame * 7)
          const pieces = [...chain(wob(1, i + 1), { seg: 46, seed: i + 3 + D.frame, off: 1 }), ...chain(wob(-1, i + 9), { seg: 38, seed: i + 7 + D.frame, off: 1 })].filter((_, k) => (k * 7 + i) % 3 !== 1)
          strokes(D, pieces.map((p) => ({ p, a: 0.5 })), { ...pen, w: 0.9 })
        } else strokes(D, lineRuns(S, l).flatMap((v) => [side0(v, 1), side0(v, -1)]).flatMap((s, k) => chain(s, { seg: 80, seed: i * 5 + k, off: 0.5 })).map((p) => ({ p, a: 0.85 })), { ...pen })
      })
    })
    D.pass('detail', 0.7, () => {
      strokes(D, plan.det, { ...pen, w: 1, blob: 0 })
      darkLines(S).forEach((l, i) => {
        const vis = lineRuns(S, l), runs = vis.flatMap((v, k) => chain(v, { seg: 60, seed: l.i * 3 + 1 + k, off: 0.5 }))
        const extra = l.w > 2.5 ? vis.flatMap((v, k) => chain(v, { seg: 50, seed: l.i * 3 + 2 + k, off: Math.min(2.2, l.w * 0.4) })) : []
        strokes(D, [...runs, ...extra].map((p) => ({ p, a: 0.92 })), { ...pen, blob: 1.1 })
      })
    })
    const names = ['first hatch', 'cross hatch', 'third direction']
    names.forEach((name, j) => D.pass(name, [2.2, 1.6, 1][j], () => strokes(D, carve(plan.h[j], reserve), { ...pen, w: 0.85, lift: 4, cost: 0.6 })))
    D.pass('solid blacks', 0.5, () => strokes(D, carve(plan.h[3], reserve), { ...pen, w: 1.3, alpha: 0.95, lift: 2, cost: 0.6 }))
    D.top(() => D.texture('paper', { opacity: 0.08 }))
  },
}

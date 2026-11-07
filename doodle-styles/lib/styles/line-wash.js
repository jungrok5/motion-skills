// Ink & line-wash — studied from anidoodle's wren plate (wren.ts · wrenDraw.ts · styles/wrenDraw.md).
// Re-implemented for the scene model. The order is the opposite of pencil & watercolour: there is no drawing first.
// The washes go down WET and loose: each is laid as a bead from the top of its shape, floods a little PAST where the line
// will be, and its pigment slides down and settles along the shape's bottom edge; where a wetter drop touched the damp
// body a pale cauliflower backrun opens with a dark crinkled rim. Only when the paper is dry comes the pen: a flexible
// steel nib, heavy where it pressed (the side away from the light), hair-thin where it lifted, contours left open where
// the light eats the edge. Last, the pen is shaken and a few spatters land.
//
// defaults (all overridable by a house style):
//   paper   the sheet                         ink     the nib's ink (a blue-black)
//   flood   how far a wash spreads past its line (1 = to the line)
//   pool    how much pigment settles along the bottom edge (0..1)
//   blooms  backruns on: true / false         spatter  the shaken-pen dots: true / false
//   shadow  the cool tint mixed into cast-shadow washes
import { solidOf, cutOf, maybeLayer, unit, nib, beside, shadeSide, pieces, lightLine } from './_ink.js'

export default {
  id: 'line-wash', name: 'Ink & line-wash', ko: '펜 담채 (잉크 라인 워시)',
  medium: 'pan watercolour on cold-press paper, then a flexible steel dip pen in blue-black ink over the dry washes',
  mark: 'wet washes that flood past the line and pool along the bottom edge, cauliflower backruns; then a nib line that swells on the press and goes hair-thin on the lift',
  edge: 'loose wet fronts with a pigment rim, never fitted to the line; the pen line left open where the light hits',
  order: ['washes, wet and loose', 'the pen: subject first, then the set', 'the shaken pen'],
  paper: 'warm white cold-press',
  palette: "the subject's own colours, thinned and pooled; one blue-black ink; white is bare paper",
  bestFor: '여행 스케치 · 어반 스케치 · 가볍고 경쾌한 일러스트 · 새, 식물, 거리 풍경',
  source: 'anidoodle wren.ts · wrenDraw.ts · styles/wrenDraw.md',
  defaults: { paper: '#fbf8f0', ink: '#16131f', flood: 1.06, pool: 0.6, blooms: true, spatter: true, shadow: '#4b5578' },
  draw(D, S, K, o) {
    const L = S.light, paper = o.paper, INK = o.ink, u = unit(S)
    const solid = solidOf(S)
    const big = (r) => r.role === 'bg' || r.role === 'ground'
    D.ground(() => D.sheet(paper))

    // ------------------------------------------------------------ 1. washes: a bead pulled down each shape, pooling at its foot
    const pool = (pts, color, alpha) => {
      const b = K.bbox(pts)
      D.mark(0.25, (ctx, k) => {
        // the band of settled pigment sinks and deepens as the wash dries
        const y0 = b.y0 + b.h * (0.25 + 0.3 * k), y1 = b.y1 + 2
        const g = ctx.createLinearGradient(0, y0, 0, y1)
        g.addColorStop(0, K.rgba(color, 0)); g.addColorStop(0.7, K.rgba(color, alpha * 0.45 * k)); g.addColorStop(1, K.rgba(color, Math.min(1, alpha * 1.15 * k)))
        ctx.save(); K.path(ctx, pts); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(b.x0 - 4, y0, b.w + 8, y1 - y0 + 4); ctx.restore()
      })
    }
    const bloom = (x, y, rad, color, seed) => {
      const bl = K.displace(K.blob(x, y, rad, { n: 44, wob: 0.32, seed, sx: 1.15, sy: 0.85 }), rad * 0.22, 0.09, seed + 3, 2)
      // the drop pushed the pigment out: a paler inside, a dark crinkled tide-line round it
      D.fill(bl, K.mix(color, paper, 0.6), { alpha: 0.42, from: [x, y] })
      D.stroke(bl, { closed: true, w: 2.4 * u + 0.4, color: K.mix(color, INK, 0.3), alpha: 0.6, taper: 0, pressure: 0.5, rough: 0.7, seed, cost: 0.3 })
    }
    D.pass('washes, wet and loose', 3.4, () => {
      for (const r of S.regions) {
        if (r.role === 'highlight') continue
        const B = big(r), b = r.bbox
        // what hides this wash, pulled in from its line: the nearer washes flood and shift, so the two overlap a little
        // (a darker seam, as transparent washes do) instead of leaving a gap of bare paper between them
        const occ = S.occluders(r, { light: false }).filter((q) => Math.abs(K.area(q)) > 2500 * u * u).map((q) => K.offset(K.densify(q, 10, true), -11 * u))
        const cut = occ.length ? occ : null
        const flood = B ? 1 : r.role === 'detail' ? 1 + (o.flood - 1) * 0.6 : o.flood
        const col = r.role === 'shadow' ? K.mix(r.color, o.shadow, 0.55) : r.role === 'glow' ? K.mix(r.lit, paper, 0.35) : K.mix(r.color, paper, B ? 0.22 : 0.06)
        const alpha = r.role === 'shadow' ? 0.25 + 0.4 * r.strength : B ? 0.62 : 0.72
        const top = [b.cx + (K.noise(r.i, 1, 1) - 0.5) * b.w * 0.4, b.y0 + 4]
        const dx = B ? 0 : (r.role === 'detail' ? 3 : 7) * u, dy = B ? 0 : (r.role === 'detail' ? 3 : 6) * u
        const shape = K.translate(K.scale(r.pts, flood), dx, dy)
        maybeLayer(D, cut, { soften: 0.6 }, () => {
          D.wash(r.pts, col, { alpha, seed: r.i + 11, shrink: flood, edge: B ? 8 : 14, dx, dy, from: top, rimW: 2.2 })
          if (K.lum(r.color) < 0.42 && r.role !== 'shadow') D.wash(r.pts, r.color, { alpha: 0.5, seed: r.i + 17, shrink: flood, edge: B ? 8 : 12, dx, dy, from: top, rim: false })
          if (r.role !== 'glow') pool(shape, r.role === 'shadow' ? col : K.mix(r.color, r.shade, 0.5), o.pool * (B ? 0.55 : 0.8))
          // a second, wetter drop charged into the damp shape on the side away from the light: form, and a backrun
          if (!B && r.form > 0.5 && r.role !== 'shadow' && r.role !== 'glow') {
            const sx = -L[0] * b.w * 0.2, sy = -L[1] * b.h * 0.2
            D.layer({ soften: 9 * u, mask: shape }, () => D.wash(K.blob(b.cx + sx * 1.3, b.cy + sy * 1.3, Math.min(b.w, b.h) * 0.42, { n: 40, wob: 0.25, seed: r.i + 2, sx: Math.max(1, b.w / b.h), sy: Math.max(1, b.h / b.w) }), r.shade, { alpha: 0.26 + 0.14 * r.form, seed: r.i + 23, shrink: 0.9, edge: 30, dx: 0, dy: 0, rim: false, from: [b.cx - L[0] * b.w * 0.4, b.cy - L[1] * b.h * 0.4] }))
          }
          // backruns only inside things: on a wall or a table one reads as a stain floating in space
          if (o.blooms && !B && r.role !== 'shadow' && r.role !== 'glow' && r.area > S.W * S.H * 0.015) {
            const rr = K.rng(r.i * 7 + 1), rad = Math.min(b.w, b.h) * (B ? 0.07 : 0.15) * (0.8 + rr() * 0.4)
            const x = B ? b.x0 + b.w * (0.2 + rr() * 0.6) : b.cx - L[0] * b.w * 0.12 + (rr() - 0.5) * b.w * 0.2
            const y = B ? b.y0 + b.h * (0.25 + rr() * 0.5) : b.cy - L[1] * b.h * 0.12 + (rr() - 0.5) * b.h * 0.15
            if (K.inside(r.pts, x, y)) bloom(x, y, rad, r.color, r.i * 13 + 5)
          }
        })
        // the shine on a round thing: left as bare paper, lifted with a twist of the brush
        if (!B && r.form > 0.75 && r.role !== 'glow' && r.role !== 'shadow') maybeLayer(D, cutOf(S, r), null, () => {
          const m = Math.min(b.w, b.h)
          D.fill(K.blob(b.cx + L[0] * b.w * 0.25, b.cy + L[1] * b.h * 0.27, m * 0.07, { sx: 1.4, sy: 0.75, rot: Math.atan2(L[1], L[0]) + Math.PI / 2, seed: r.i, wob: 0.2 }), paper, { alpha: 0.88 })
        })
      }
      // light falling on the wall or the table: the wash lifted back with a damp brush
      for (const r of S.regions.filter((q) => q.role === 'highlight')) D.layer({ soften: 9 * u, cut: cutOf(S, r) || undefined }, () => D.fill(r.pts, K.mix(paper, r.color, 0.25), { alpha: 0.5, grow: 'wipe', dir: Math.PI / 2 }))
      // light lines (steam, a white bar) lifted out of the wash
      for (const l of S.lines.filter((q) => lightLine(K, q))) D.layer({ soften: 1.8 * u, cut: cutOf(S, l) || undefined }, () => D.stroke(l.pts, { w: Math.max(5, l.w * 1.25), color: K.mix(paper, l.color, 0.3), alpha: 0.88, taper: 0.6, rough: 0.3, wobble: 1, seed: l.i * 7, boil: true, smooth: true, cost: 0.6 }))
    })

    // ------------------------------------------------------------ 2. the pen: the subject first, then the set
    const order = [...solid].sort((a, b) => (big(a) - big(b)) || (a.role === 'detail') - (b.role === 'detail') || b.area - a.area)
    const press = (r) => (r.role === 'detail' ? 2.4 : big(r) ? 2.6 : 2.8 + Math.min(3, Math.sqrt(r.area) / 100)) * u
    D.pass('the pen: subject first, then the set', 2.6, () => {
      for (const r of order) {
        if (!r.contour) continue
        const cut = cutOf(S, r), base = press(r), b = r.bbox
        maybeLayer(D, cut, null, () => {
          // lost edges: the line breaks where the outline faces the light; it swells where the nib is pressed (shade side)
          const runs = K.runs(r.pts, (i, n) => K.facing(n, L) < 0.72)
          runs.forEach((run, j) => nib(D, K, run, {
            width: (t, n) => { const away = K.clamp(-(n[0] * L[0] + n[1] * L[1])); return base * (0.22 + 1.5 * Math.pow(away, 1.2)) },
            color: INK, alpha: 0.94, seed: r.i * 13 + j, wobble: 0.9 * u, boil: true, rough: 0.3, tip: [10 * u, 30 * u], cost: 0.9,
          }))
          // flicks: a few quick curved strokes inside the shade side of a round thing
          if (r.form > 0.6 && r.area > 9000 * u * u) {
            const nn = K.outward(r.pts), rr = K.rng(r.i * 3 + 9), cand = r.pts.map((p, i) => [p, nn[i]]).filter(([, n]) => K.facing(n, L) < -0.45)
            const m = Math.min(b.w, b.h), count = Math.min(7, Math.round(m / 45))
            for (let q = 0; q < count && cand.length; q++) {
              const [p, n] = cand[Math.floor(rr() * cand.length)], d0 = m * (0.04 + rr() * 0.03), d1 = d0 + m * (0.07 + rr() * 0.08), tx = -n[1], ty = n[0], bend = (rr() - 0.5) * m * 0.06
              const a = [p[0] - n[0] * d0, p[1] - n[1] * d0], e = [p[0] - n[0] * d1 + tx * bend, p[1] - n[1] * d1 + ty * bend]
              nib(D, K, K.segment(a, e, bend * 0.4, 6), { w: 1.4 * u, color: INK, alpha: 0.8, seed: r.i * 31 + q, tip: [2, 10 * u], rough: 0.2, cost: 0.4 })
            }
          }
        })
      }
      for (const l of S.lines) {
        const cut = cutOf(S, l)
        maybeLayer(D, cut, null, () => {
          if (lightLine(K, l)) {
            // a light line keeps its paper; the nib only touches its shaded side, and lifts off again and again
            const side = shadeSide(K, l.pts, L), ln = beside(K, l.pts, side * (l.w * 0.65 + 2.5 * u))
            pieces(ln, (i) => K.noise(l.i * 5 + (l.role === 'steam' ? D.frame : 0), i * 0.35, 1) > 0.42).forEach((pc, j) => nib(D, K, pc, { w: 1.1 * u, color: INK, alpha: 0.85, seed: l.i * 7 + j, tip: [4, 8], smooth: true, wobble: 0.5, boil: true, cost: 0.5 }))
          } else nib(D, K, l.pts, { width: (t) => Math.max(1.2, l.w * 0.75) * u * (0.6 + 0.8 * Math.sin(Math.PI * Math.min(1, t * 1.3))), color: INK, alpha: 0.92, seed: l.i * 7, wobble: 0.6 * u, boil: true, tip: [6, 16], smooth: true, cost: 0.8 })
        })
      }
    })

    // ------------------------------------------------------------ 3. the shaken pen: spatter lands drop by drop
    if (o.spatter) D.pass('the shaken pen', 0.35, () => {
      const hero = solid.filter((r) => !big(r)).sort((a, b) => b.area - a.area)[0]
      if (!hero) return
      const rr = K.rng(S.seed * 101 + 7), b = hero.bbox, list = [], wet = []
      const cx = b.cx - L[0] * b.w * 0.55, cy = b.cy - L[1] * b.h * 0.45 // flicked off toward the shade side
      for (let i = 0; i < 46; i++) {
        const a = rr() * Math.PI * 2, d = Math.pow(rr(), 0.6) * Math.max(b.w, b.h) * 0.6, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.7
        if (x < 0 || y < 0 || x > S.W || y > S.H) continue
        const s = (0.6 + Math.pow(rr(), 3) * 3.4) * u
        if (rr() < 0.3) wet.push([x, y, s * 1.8]); else list.push([x, y, s])
      }
      D.dots(wet, K.mix(hero.color, paper, 0.15), { alpha: 0.55 })
      D.dots(list, INK, { alpha: 0.9 })
    })

    D.top(() => { D.texture('coldpress', { opacity: 0.5 }); D.texture('paper', { opacity: 0.3 }) })
  },
}

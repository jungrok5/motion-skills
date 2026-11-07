// Marker comic — studied from anidoodle's koi plate (koi.ts · koiDraw.ts · koiDrawKit.ts · styles/koiDraw.md).
// Re-implemented for the scene model. Alcohol markers on smooth marker paper, a brush pen for the line:
//   ORDER — a non-photo-blue pencil lay-in (gesture and masses) → flat cel fills, LIGHTEST first, each laid in
//   back-and-forth chisel-marker passes that start and stop past the pencil line (a wide area in blocks of short passes,
//   so its leading edge is ragged, never a wipe) → hard shadow shapes (a crescent on the side away from the light) and
//   flat cast shadows → details: a few marker hatches at the terminator, white gel-pen gloss → the heavy brush-pen
//   contour LAST, one confident line round every thing that thickens away from the light.
//   The marker is opaque here: the pencil vanishes under it. Two tones per thing (flat + hard shade), no gradients.
//
// defaults (all overridable by a house style):
//   paper   marker paper              ink     the brush-pen ink
//   pencil  the non-photo-blue lay-in gloss   the gel-pen white
//   cast    the cool grey marker for cast shadows
//   sat     how much the markers punch up the subject's colours (1 = as given)
//   line    weight of the contour (1 = normal)
import { solidOf, cutOf, maybeLayer, unit, nib, lightLine } from './_ink.js'

export default {
  id: 'marker-comic', name: 'Marker comic', ko: '마커 코믹',
  medium: 'alcohol markers on smooth marker paper over a non-photo-blue pencil lay-in, inked last with a brush pen',
  mark: 'flat cel fills laid in chisel-marker streaks; one hard-edged shadow shape per thing; white gel-pen gloss',
  edge: 'hard: a crisp shadow edge, and ONE heavy contour that swells on the side away from the light',
  order: ['blue-pencil lay-in', 'flat cel fills, lightest first', 'hard shadows', 'details and gel-pen whites', 'brush-pen contour'],
  paper: 'bright smooth marker paper',
  palette: "the subject's colours pushed bold, each with one darker marker for its shade; ink outline; white gloss",
  bestFor: '만화 · 웹툰 컷 · 캐릭터, 음식, 제품 · 경쾌하고 또렷한 홍보 그림',
  source: 'anidoodle koi.ts · koiDraw.ts · koiDrawKit.ts · styles/koiDraw.md',
  defaults: { paper: '#fbfaf6', ink: '#15122a', pencil: '#7fb3df', gloss: '#ffffff', cast: '#3a3858', sat: 1.15, line: 1 },
  draw(D, S, K, o) {
    const L = S.light, u = unit(S), INK = o.ink
    const solid = solidOf(S), big = (r) => r.role === 'bg' || r.role === 'ground'
    const flatOf = (r) => K.adjust(r.role === 'glow' ? r.lit : r.color, { sat: o.sat })
    const shadeOf = (r) => K.adjust(K.mix(r.shade, r.color, 0.15), { sat: o.sat * 1.05 })
    const size = (r) => Math.min(r.bbox.w, r.bbox.h)

    // ------------------------------------------------------------ a chisel marker laying a flat
    // parallel passes, back and forth, each starting just outside one edge and running out past the other
    const streaks = (pts, width, angle, seed, reach = 1e9) => {
      const c = Math.cos(angle), s = Math.sin(angle), r = K.rng(seed), gap = width * 0.74
      const uv = pts.map(([x, y]) => [x * c + y * s, -x * s + y * c])
      let vmin = 1e9, vmax = -1e9
      for (const [, v] of uv) { if (v < vmin) vmin = v; if (v > vmax) vmax = v }
      const rows = []
      const probe = (vv, acc) => { for (let i = 0; i < uv.length; i++) { const a = uv[i], b = uv[(i + 1) % uv.length]; if ((a[1] - vv) * (b[1] - vv) > 0 || a[1] === b[1]) continue; const x = a[0] + ((b[0] - a[0]) * (vv - a[1])) / (b[1] - a[1]); acc[0] = Math.min(acc[0], x); acc[1] = Math.max(acc[1], x) } }
      let k = 0
      for (let v = vmin + gap * 0.45; v < vmax + gap * 0.5; v += gap) {
        const acc = [1e9, -1e9]
        probe(Math.min(v, vmax - 0.5), acc); probe(Math.max(vmin + 0.5, v - gap * 0.45), acc); probe(Math.min(vmax - 0.5, v + gap * 0.45), acc)
        if (acc[0] > acc[1]) continue
        const tilt = (r() - 0.5) * gap * 0.22, over = width * 0.35
        rows.push({ v0: v - tilt, v1: v + tilt, u0: acc[0] - over * (0.6 + r() * 0.6), u1: acc[1] + over * (0.6 + r() * 0.6), dir: k++ % 2 ? -1 : 1 })
      }
      let list = rows
      if (reach < 1e9 && rows.length) {
        let u0 = 1e9, u1 = -1e9; rows.forEach((t) => { u0 = Math.min(u0, t.u0); u1 = Math.max(u1, t.u1) })
        const nb = Math.max(1, Math.ceil((u1 - u0) / reach)), bw = (u1 - u0) / nb
        const cuts = rows.map(() => Array.from({ length: nb + 1 }, (_, b) => (b === 0 ? -1e9 : b === nb ? 1e9 : u0 + b * bw + (r() - 0.5) * bw * 0.35)))
        list = []
        for (let b = 0; b < nb; b++) rows.forEach((t, i) => { const a = Math.max(t.u0, cuts[i][b] - width * 0.3), e = Math.min(t.u1, cuts[i][b + 1] + width * 0.3); if (e - a > width * 0.3) list.push({ ...t, u0: a, u1: e, dir: (i + b) % 2 ? -1 : 1 }) })
      }
      const len = list.map((t) => t.u1 - t.u0 + width * 1.6)
      return { c, s, w: width, list, len, total: len.reduce((a, b) => a + b, 0) || 1 }
    }
    const ribbonPath = (ctx, st, t, f) => {
      const { c, s, w } = st, xy = (U, V) => [U * c - V * s, U * s + V * c], h = w / 2
      const a = t.dir > 0 ? t.u0 : t.u1, e = a + (t.dir > 0 ? 1 : -1) * (t.u1 - t.u0) * f
      const v0 = t.v0, v1 = t.v0 + (t.v1 - t.v0) * f
      const p = [xy(a, v0 - h), xy(e, v1 - h), xy(e, v1 + h), xy(a, v0 + h)]
      // every ribbon wound the same way, so the union is a nonzero fill with no holes
      if (t.dir < 0) p.reverse()
      ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath()
    }
    /** a flat laid by a chisel marker: clip to the passes laid by k, fill; darker seams where passes overlap */
    const flat = (pts, color, { width, angle = -0.5, seed = 1, reach, alpha = 1, seams = 0.14, cost = 1 }) => {
      const st = streaks(pts, width, angle, seed, reach), dark = K.darken(color, 0.22)
      D.mark(cost * Math.sqrt(Math.abs(K.area(pts)) + 1) / 34, (ctx, k) => {
        ctx.save(); ctx.globalAlpha = alpha
        let t = k * st.total, n = 0
        ctx.beginPath()
        for (let i = 0; i < st.list.length && t > 0; i++) { const f = K.clamp(t / (st.len[i] - st.w * 1.6)); ribbonPath(ctx, st, st.list[i], f); t -= st.len[i]; n = i + 1 }
        if (k < 1) ctx.clip()
        ctx.fillStyle = color; K.path(ctx, pts); ctx.fill()
        if (seams) {
          K.path(ctx, pts); ctx.clip()
          ctx.globalAlpha = alpha * seams; ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1, st.w * 0.12)
          const { c, s, w } = st, xy = (U, V) => [U * c - V * s, U * s + V * c]
          ctx.beginPath()
          for (let i = 0; i < n; i++) { const r = st.list[i], V = (r.v0 + r.v1) / 2 + w * 0.38, a = xy(r.u0, V), b = xy(r.u1, V); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]) }
          ctx.stroke()
        }
        ctx.restore()
      })
    }
    const markerW = (r) => (big(r) ? 46 : K.clamp(size(r) * 0.22, 10, 34)) * u
    const angleOf = (r) => (r.role === 'bg' ? Math.PI / 2 - 0.08 : r.role === 'ground' ? (r.grain ?? 0) : (r.grain ?? -0.5))

    D.ground(() => D.sheet(o.paper))

    // ------------------------------------------------------------ 1. the non-photo-blue lay-in
    D.pass('blue-pencil lay-in', 0.8, () => {
      for (const r of solid) {
        const b = r.bbox
        if (!big(r)) {
          D.stroke(r.pts, { closed: true, w: 1.3 * u, color: o.pencil, alpha: 0.7, taper: 0.3, pressure: 0.1, wobble: 2.2 * u, seed: r.i + 3, cost: 0.35 })
          if (r.form > 0.6 && r.area > 6000 * u * u) { // construction: the axes of a round thing
            D.line(K.segment([b.x0 + b.w * 0.08, b.cy], [b.x1 - b.w * 0.08, b.cy], b.h * 0.08, 10), { w: 1 * u, color: o.pencil, alpha: 0.55, cost: 0.2 })
            D.line(K.segment([b.cx, b.y0 + b.h * 0.08], [b.cx, b.y1 - b.h * 0.08], -b.w * 0.06, 10), { w: 1 * u, color: o.pencil, alpha: 0.55, cost: 0.2 })
          }
        } else if (r.contour) D.stroke(r.pts, { closed: true, w: 1.2 * u, color: o.pencil, alpha: 0.6, taper: 0.2, wobble: 1.5 * u, seed: r.i + 3, cost: 0.2 })
      }
      for (const l of S.lines) D.stroke(l.pts, { w: 1.2 * u, color: o.pencil, alpha: 0.6, taper: 0.4, wobble: 1.2 * u, seed: l.i + 5, smooth: l.role === 'steam', cost: 0.3 })
    })

    // ------------------------------------------------------------ 2. flat cel fills, lightest first (cut where nearer things sit)
    const fillOrder = S.regions.filter((r) => r.role !== 'shadow' && r.role !== 'highlight').sort((a, b) => K.lum(flatOf(b)) - K.lum(flatOf(a)))
    D.pass('flat cel fills, lightest first', 2.6, () => {
      for (const r of fillOrder) {
        const over = big(r) ? r.pts : K.offset(K.densify(r.pts, 8, true), 2 * u) // the marker runs a little past the pencil line
        maybeLayer(D, cutOf(S, r), null, () => flat(over, flatOf(r), { width: markerW(r), angle: angleOf(r), seed: r.i * 7 + 1, reach: big(r) ? 260 * u : undefined, seams: big(r) ? 0.1 : 0.16 }))
      }
    })

    // ------------------------------------------------------------ 3. hard shadows: one crescent per thing, flat cast shadows
    D.pass('hard shadows', 1.4, () => {
      for (const r of solid) {
        if (big(r) || r.form < 0.15) continue
        const d = Math.max(4 * u, size(r) * (0.1 + 0.2 * r.form)), lit = K.translate(r.pts, L[0] * d, L[1] * d)
        const occ = S.occluders(r, { light: false })
        D.layer({ mask: r.pts, cut: [lit, ...occ] }, () => flat(r.pts, shadeOf(r), { width: K.clamp(size(r) * 0.18, 8, 26) * u, angle: Math.atan2(L[1], L[0]) + Math.PI / 2, seed: r.i * 7 + 2, seams: 0.12, cost: 0.7 }))
      }
      for (const r of S.regions.filter((q) => q.role === 'shadow'))
        maybeLayer(D, cutOf(S, r), { blend: 'multiply' }, () => flat(r.pts, K.mix(o.cast, r.color, 0.3), { width: K.clamp(size(r) * 0.4, 12, 40) * u, angle: 0.15, seed: r.i * 7 + 4, alpha: 0.32 + 0.4 * r.strength, seams: 0, cost: 0.6 }))
      for (const r of S.regions.filter((q) => q.role === 'highlight'))
        maybeLayer(D, cutOf(S, r), null, () => flat(r.pts, K.mix(r.color, '#ffffff', 0.25), { width: 40 * u, angle: Math.PI / 2 - 0.08, seed: r.i * 7 + 5, alpha: 0.55, seams: 0.06, cost: 0.6 }))
    })

    // ------------------------------------------------------------ 4. details: terminator hatches, gel-pen whites
    D.pass('details and gel-pen whites', 1, () => {
      for (const r of solid) {
        if (big(r) || r.form < 0.55 || r.area < 7000 * u * u) continue
        const b = r.bbox, m = size(r), d = m * (0.1 + 0.2 * r.form), occ = cutOf(S, r)
        maybeLayer(D, occ, { mask: r.pts }, () => {
          // a few quick marker hatches along the shadow's edge
          const nn = K.outward(r.pts), rr = K.rng(r.i * 11 + 3)
          const term = r.pts.map((p, i) => [p, nn[i]]).filter(([, n]) => { const f = K.facing(n, L); return f < -0.15 && f > -0.75 })
          for (let q = 0; q < Math.min(6, Math.round(m / 40)) && term.length; q++) {
            const [p, n] = term[Math.floor(rr() * term.length)], a = [p[0] - n[0] * (d * 0.6) + L[0] * d * 0.15, p[1] - n[1] * (d * 0.6) + L[1] * d * 0.15]
            const e = [a[0] - n[0] * m * 0.12, a[1] - n[1] * m * 0.12]
            nib(D, K, [a, e], { w: 2.2 * u, color: K.darken(shadeOf(r), 0.35), alpha: 0.9, seed: r.i * 17 + q, tip: [2, 9 * u], cost: 0.3 })
          }
          // the gel-pen white: a curved gloss inset from the lit edge, and a dot beside it
          const runs = K.runs(r.pts, (i, n) => K.facing(n, L) > 0.55)
          const run = runs.sort((x, y) => y.length - x.length)[0]
          if (run && run.length > 3) {
            const c = [b.cx, b.cy], inset = run.map(([x, y]) => [x + (c[0] - x) * 0.16, y + (c[1] - y) * 0.16])
            const mid = inset.slice(Math.floor(inset.length * 0.25), Math.ceil(inset.length * 0.7))
            if (mid.length > 1) nib(D, K, mid, { w: K.clamp(m * 0.045, 3, 12) * u, color: o.gloss, alpha: 0.95, seed: r.i * 19, tip: [8 * u, 14 * u], smooth: true, cost: 0.4 })
            const q = inset[Math.min(inset.length - 1, Math.ceil(inset.length * 0.82))]
            D.dots([[q[0], q[1], K.clamp(m * 0.022, 2, 6) * u]], o.gloss, { alpha: 0.95 })
          }
        })
      }
      // light falling on the glass of a window or a lamp: two diagonal gel-pen glints
      for (const r of S.regions.filter((q) => q.role === 'glow')) {
        const b = r.bbox, occ = cutOf(S, r)
        maybeLayer(D, occ, { mask: r.pts }, () => [0.3, 0.42].forEach((f, j) => nib(D, K, [[b.x0 + b.w * (f + 0.1), b.y0 + b.h * 0.12], [b.x0 + b.w * (f - 0.08), b.y0 + b.h * 0.34]], { w: (j ? 5 : 9) * u, color: o.gloss, alpha: 0.85, tip: [4, 6], seed: r.i + j, cost: 0.3 })))
      }
    })

    // ------------------------------------------------------------ 5. the brush-pen contour, last
    const weight = (r) => (r.role === 'detail' ? 2.6 : big(r) ? 3 : 3 + Math.min(3.6, Math.sqrt(r.area) / 85)) * u * o.line
    D.pass('brush-pen contour', 2, () => {
      const order = [...solid].sort((a, b) => (big(a) - big(b)) || b.area - a.area)
      for (const r of order) {
        if (!r.contour) continue
        const base = weight(r)
        maybeLayer(D, cutOf(S, r), null, () => nib(D, K, r.pts, {
          closed: true, color: INK, seed: r.i * 13 + 1, rough: 0.12, wobble: 0.6 * u, boil: true, cost: 0.9,
          width: (t, n) => { const away = K.clamp(-(n[0] * L[0] + n[1] * L[1])); return base * (0.45 + 1.35 * Math.pow(away, 0.9)) },
        }))
      }
      for (const l of S.lines) {
        maybeLayer(D, cutOf(S, l), null, () => {
          if (lightLine(K, l)) { // a white shape with an ink edge: steam, a white bar
            const w = Math.max(4 * u, l.w * u)
            nib(D, K, l.pts, { w: w + 5 * u, color: INK, seed: l.i * 7, tip: [10 * u, 22 * u], smooth: true, wobble: 0.5 * u, boil: true, cost: 0.7 })
            nib(D, K, l.pts, { w, color: o.gloss, seed: l.i * 7 + 1, tip: [12 * u, 26 * u], smooth: true, wobble: 0.5 * u, boil: true, cost: 0.3 })
          } else nib(D, K, l.pts, { width: (t) => Math.max(2.2, l.w * 1.1) * u * (0.55 + 0.7 * Math.sin(Math.PI * Math.min(1, t * 1.2))), color: INK, seed: l.i * 7, tip: [8 * u, 20 * u], smooth: true, wobble: 0.5 * u, boil: true, cost: 0.8 })
        })
      }
    })

    D.top(() => D.texture('paper', { opacity: 0.18 }))
  },
}

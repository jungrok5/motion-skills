// Pencil & watercolour — studied from anidoodle's ranunculus plate (pencil lay-in, washes that miss their line,
// form toward one light, graphite over the paint). Re-implemented for the scene model.
export default {
  id: 'watercolour', name: 'Pencil & watercolour', ko: '연필 수채화',
  medium: 'HB pencil and pan watercolour on cold-press paper',
  mark: 'washes that never quite fill their pencil line; form shaded toward one light; graphite over the dry paint',
  edge: 'a wet front that stops short of the line, pigment settling at its rim; lost edges on the lit side',
  order: ['pencil lay-in', 'first light washes', 'form toward the light', 'cast shadows', 'graphite over the paint'],
  paper: 'warm white cold-press, granulating',
  palette: "the subject's own colours, thinned with water; white is bare paper",
  bestFor: '따뜻하고 사람 냄새 나는 그림 · 음식, 식물, 물건 · 웃는 브랜드',
  source: 'anidoodle ranunculus.ts · ranunculusDraw.ts',
  defaults: { paper: '#fbf6ec', graphite: '#4f4744' },
  draw(D, S, K, o) {
    const L = S.light, paper = o.paper, gr = o.graphite
    const solid = S.regions.filter((r) => !['shadow', 'glow', 'highlight'].includes(r.role))
    D.ground(() => D.sheet(paper))

    D.pass('pencil lay-in', 1.2, () => {
      for (const r of solid) if (r.contour) D.layer({ tooth: 'tooth', alpha: 0.42, cut: S.occluders(r, { light: false }) }, () => D.stroke(r.pts, { closed: true, w: 1.25, color: gr, taper: 0.5, pressure: 0.2, wobble: 1.4, seed: r.i + 3, cost: 0.6 }))
      for (const l of S.lines) if (!K.isLight(l.color)) D.layer({ tooth: 'tooth', alpha: 0.42, cut: S.occluders(l, { light: false }) }, () => D.stroke(l.pts, { w: 1.1, color: gr, taper: 0.6, wobble: 1, seed: l.i + 5, cost: 0.6 }))
    })

    D.pass('first light washes', 3, () => {
      for (const r of S.regions) {
        if (['shadow', 'highlight'].includes(r.role)) continue
        const big = r.role === 'bg' || r.role === 'ground'
        D.layer({ tooth: big ? 'fine' : 'gran', soften: 0.8, cut: S.occluders(r, { light: false }) }, () => {
          const dark = K.lum(r.color) < 0.42
          D.wash(r.pts, K.mix(r.role === 'glow' ? r.lit : r.color, paper, big ? 0.3 : 0.15), { alpha: big ? 0.55 : 0.66, seed: r.i + 11, shrink: big ? 1 : 0.955, edge: big ? 6 : 12, from: K.litPoint(r, L), dx: big ? 0 : 2, dy: big ? 0 : 2 })
          if (dark) D.wash(r.pts, r.color, { alpha: 0.45, seed: r.i + 17, shrink: big ? 1 : 0.97, edge: big ? 6 : 10, from: K.litPoint(r, L), rim: false }) // darks are built in glazes
          if (big) D.clip(r.pts, () => { for (const [a, b] of K.hatchLines(r.pts, 0.08, 46, { jitter: 18, seed: r.i })) D.stroke(K.segment(a, b, 6), { w: 30, color: K.mix(r.color, paper, 0.3), alpha: 0.12, taper: 0.9, rough: 0.5, seed: r.i * 7 + a[1], cost: 0.25 }) })
        })
      }
    })

    D.pass('form toward the light', 3, () => {
      for (const r of solid) {
        if (r.form < 0.2 || r.role === 'bg' || r.role === 'ground') continue
        const b = r.bbox, sx = -L[0] * b.w * 0.17, sy = -L[1] * b.h * 0.17
        D.layer({ tooth: 'gran', soften: 1.2, mask: r.pts, cut: S.occluders(r, { light: false }) }, () => {
          D.wash(K.translate(r.pts, sx, sy), K.mix(r.shade, r.color, 0.3), { alpha: 0.36 + 0.2 * r.form, seed: r.i + 21, shrink: 0.94, edge: 16, dx: 0, dy: 0, from: [b.cx - L[0] * b.w * 0.4, b.cy - L[1] * b.h * 0.4] })
          if (r.form > 0.6) D.wash(K.translate(K.scale(r.pts, 0.66), sx * 1.9, sy * 1.9), r.shade, { alpha: 0.26, seed: r.i + 29, shrink: 0.9, edge: 10, rim: false })
        })
        // a highlight lifted out with a damp brush: back toward bare paper
        if (r.form > 0.6) D.layer({ soften: 5, mask: r.pts, cut: S.occluders(r, { light: false }) }, () => D.fill(K.blob(b.cx + L[0] * b.w * 0.24, b.cy + L[1] * b.h * 0.26, Math.min(b.w, b.h) * 0.12, { sx: 1.3, sy: 0.8, rot: -0.6, seed: r.i }), paper, { alpha: 0.55 }))
      }
      // light falling on the wall or the table: lifted the same way, soft-edged
      for (const r of S.regions.filter((q) => q.role === 'highlight')) D.layer({ soften: 14, cut: S.occluders(r, { light: false }) }, () => D.fill(r.pts, paper, { alpha: 0.5, grow: 'wipe', dir: 0 }))
    })

    D.pass('cast shadows', 1, () => {
      for (const r of S.regions.filter((q) => q.role === 'shadow'))
        D.layer({ tooth: 'gran', soften: 2.2, cut: S.occluders(r, { light: false }) }, () => D.wash(r.pts, K.mix(r.color, '#5b5d8c', 0.45), { alpha: 0.3 + 0.35 * r.strength, seed: r.i + 41, shrink: 0.97, edge: 10, rim: true }))
    })

    D.pass('graphite over the paint', 1.6, () => {
      for (const r of solid) {
        if (!r.contour) continue
        const cut = S.occluders(r, { light: false })
        D.layer({ tooth: 'tooth', cut }, () => {
          // lost edges: the line breaks where the outline faces the light, and weighs more on the shadow side
          for (const run of K.runs(r.pts, (i, n) => K.facing(n, L) < 0.62)) D.stroke(run, { w: 1.9, color: gr, alpha: 0.82, taper: 0.9, pressure: 0.6, wobble: 0.8, seed: r.i * 13 + run.length, cost: 0.8 })
        })
      }
      for (const l of S.lines) {
        // light lines (steam, a white bar) are lifted back to paper with a damp brush; dark ones are graphite
        if (K.isLight(l.color)) D.layer({ soften: 2.5, cut: S.occluders(l, { light: false }) }, () => D.stroke(l.pts, { w: Math.max(5, l.w * 1.3), color: K.mix(paper, l.color, 0.3), alpha: 0.85, taper: 0.7, rough: 0.3, wobble: 1, seed: l.i * 7, boil: true, cost: 0.8 }))
        else D.layer({ tooth: 'tooth', cut: S.occluders(l, { light: false }) }, () => D.stroke(l.pts, { w: Math.max(1.4, l.w * 0.6), color: gr, alpha: 0.85, taper: 0.8, wobble: 0.6, seed: l.i * 7, cost: 0.8 }))
      }
    })

    D.top(() => { D.texture('coldpress', { opacity: 0.55 }); D.texture('paper', { opacity: 0.35 }) })
  },
}

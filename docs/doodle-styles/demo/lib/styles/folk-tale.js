// Folk-tale storybook — studied from anidoodle's folkTale plate (folkTale.ts, folkTaleKit.ts, styles/folkTale.md):
// gouache and transparent watercolour over a full HB pencil drawing on warm cream cartridge, where DEPTH IS THE
// MEDIUM. The whole scene is drawn in pencil first; then it is painted back to front, and the paint gets thicker the
// nearer the thing is: far things (depth ≥ 0.9) are never painted — bare pencil on the cream, a little pencil shading;
// the middle distance is a thin pale wash, mixed toward a warm haze, that stops short of its own line; the foreground
// is opaque body colour laid with a half-dry round brush: flat tone steps toward the light, dry-brush drags that
// break, a darker rim where the gouache settles, light painted OVER dark (steam, highlights) as only gouache can.
// Re-implemented for the scene model: every item's `depth` decides how finished it is.
//
// defaults (overridable from a house style / piece tweaks):
//   paper     the cream cartridge sheet
//   haze      the warm golden haze far colours are mixed toward
//   graphite  the pencil
//   near      depth below which a thing is painted in opaque gouache
//   far       depth from which a thing is left as bare pencil
//   drag      how much dry-brush texture the gouache carries (0 none … 1.5 lots)
export default {
  id: 'folk-tale', name: 'Folk-tale storybook', ko: '옛이야기 그림책',
  medium: 'gouache and transparent watercolour over an HB pencil drawing on warm cream cartridge paper',
  mark: 'opaque dry-brushed gouache in the foreground, a pale wash in the middle distance, bare breathing pencil at the back',
  edge: 'near: a crisp brush-cut edge, a little darker where the paint settles; middle: soft, missing its pencil line; far: the pencil line itself',
  order: ['pencil drawing', 'sky glow', 'middle-distance washes', 'golden haze', 'gouache, back to front', 'last accents'],
  paper: 'warm cream cartridge, showing through all thin paint',
  palette: "the subject's own colours, richest at the front and mixed toward a warm golden haze with distance; graphite for the far",
  bestFor: '동화 · 옛이야기 · 마을과 들판 · 앞뒤 거리감이 있는 장면',
  source: 'anidoodle folkTale.ts · folkTaleKit.ts · styles/folkTale.md',
  defaults: { paper: '#f4edda', haze: '#f2e9c9', graphite: '#6f665a', near: 0.5, far: 0.9, drag: 1 },

  draw(D, S, K, o) {
    const L = S.light, paper = o.paper, HAZE = o.haze, GR = o.graphite, NEAR = o.near, FAR = o.far, unit = Math.min(S.W, S.H) / 1080
    const far = (c, d) => K.mix(c, HAZE, K.smoothstep(0.3, 1, d) * 0.8)
    const dark = (c, k) => K.mix(c, '#17170d', K.clamp(k)), light = (c, k) => K.mix(c, '#fffbe8', K.clamp(k))
    const tier = (r) => (r.role === 'glow' ? 'glow' : r.role === 'highlight' ? 'haze' : r.depth >= FAR && r.role !== 'shadow' && r.role !== 'bg' ? 'pencil' : r.depth >= NEAR || (r.role === 'bg' && r.depth >= NEAR) ? 'wash' : 'gouache')
    const brushEdge = (r) => K.displace(K.densify(r.pts, 6, true), 4.5 * unit, 0.045, r.i * 3 + 7, 2) // a brush-cut edge wobbles

    D.ground(() => D.sheet(paper))

    // ---- 1. the whole scene in pencil, big shapes first; far lines lighter, every line breathing and gone over twice
    D.pass('pencil drawing', 1.4, () => {
      const items = [
        ...S.regions.filter((r) => r.contour || (tier(r) === 'pencil' && r.role !== 'bg') || r.role === 'glow').map((r) => ({ it: r, size: r.area, closed: true })),
        ...S.lines.map((l) => ({ it: l, size: K.length(l.pts) * 40, closed: false })),
      ].sort((a, b) => b.size - a.size)
      for (const { it, closed } of items) {
        const d = it.depth, lightLine = !closed && K.isLight(it.color)
        const a = (lightLine ? 0.3 : 0.62 + 0.14 * (1 - d)), w = (0.95 + 0.5 * (1 - d)) * unit
        D.layer({ tooth: 'tooth', alpha: a, cut: S.occluders(it, { light: false }) }, () => {
          D.stroke(it.pts, { closed, w, color: GR, taper: 0.7, pressure: 0.55, rough: 0.35, wobble: 1.3 * unit, seed: it.i * 5 + 3, cost: 0.5 })
          D.stroke(it.pts, { closed, w: w * 0.6, color: GR, alpha: 0.35, taper: 0.8, pressure: 0.3, rough: 0.4, wobble: 2.6 * unit, seed: it.i * 5 + 91, cost: 0.15 }) // the second pass, not quite on the first
        })
      }
      // the far things get a little pencil shading on their shade side: that is all the finish they will ever have
      for (const r of S.regions.filter((q) => tier(q) === 'pencil' && q.role !== 'bg')) {
        D.layer({ tooth: 'tooth', alpha: 0.42, mask: r.pts, cut: S.occluders(r, { light: false }) }, () => {
          for (const [a, b] of K.hatchLines(r.pts, 0.95, 7 * unit, { jitter: 2, seed: r.i })) {
            const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
            if (r.toneAt(m[0], m[1]) < 0.62) D.stroke([a, b], { w: 0.8 * unit, color: GR, taper: 0.9, pressure: 0.2, wobble: 0.5, seed: r.i + a[0], cost: 0.12 })
          }
        })
      }
    })

    // ---- 2. the back of the picture: a thin warm wash over the walls / sky, the light source glowing, the pencil showing through
    D.pass('sky glow', 0.9, () => {
      for (const r of S.regions.filter((q) => (q.role === 'bg' && tier(q) !== 'gouache') || q.role === 'glow')) {
        const glow = r.role === 'glow'
        D.layer({ tooth: 'fine', soften: glow ? 3 : 1.5, cut: S.occluders(r, { light: false }) }, () => {
          D.fill(r.pts, glow ? K.mix(r.color, r.lit, 0.3) : K.mix(r.color, HAZE, 0.22), { alpha: glow ? 0.88 : 0.7, grow: 'wipe', dir: Math.atan2(-L[1], -L[0]) })
          if (!glow) D.clip(r.pts, () => { for (const [a, b] of K.hatchLines(r.pts, 0.12, 52 * unit, { jitter: 20, seed: r.i })) D.stroke(K.segment(a, b, 5), { w: 34 * unit, color: K.mix(r.color, HAZE, 0.15), alpha: 0.13, taper: 0.9, rough: 0.6, seed: r.i * 7 + a[1], cost: 0.2 }) })
        })
      }
    })

    // ---- 3. the middle distance: pale washes mixed toward the haze, stopping short of their pencil line
    D.pass('middle-distance washes', 1.1, () => {
      for (const r of S.regions.filter((q) => tier(q) === 'wash' && q.role !== 'bg')) {
        const thin = 1 - K.smoothstep(NEAR, FAR, r.depth)
        if (r.role === 'shadow') {
          D.layer({ tooth: 'gran', soften: 3, blend: 'multiply', cut: S.occluders(r, { light: false }) }, () => D.wash(r.pts, K.mix('#ffffff', K.mix(r.color, '#6a5a78', 0.4), 0.45 * r.strength * thin + 0.1), { alpha: 0.8, seed: r.i + 41, shrink: 0.97, edge: 10, rim: false }))
          continue
        }
        D.layer({ tooth: 'gran', soften: 1, cut: S.occluders(r, { light: false }) }, () => {
          // a wash that runs off the sheet is laid edge to edge; only a thing inside the picture misses its line
          const edgeOn = r.bbox.x0 <= 2 || r.bbox.y0 <= 2 || r.bbox.x1 >= S.W - 2 || r.bbox.y1 >= S.H - 2
          D.wash(r.pts, far(r.color, r.depth), { alpha: 0.25 + 0.45 * thin, seed: r.i + 11, shrink: edgeOn ? 1 : 0.95, edge: 10 * unit, from: K.litPoint(r, L), dx: edgeOn ? 0 : 3 * unit, dy: edgeOn ? 0 : 3 * unit })
          if (r.form > 0.3) D.wash(K.translate(K.scale(r.pts, 0.8), -L[0] * r.bbox.w * 0.12, -L[1] * r.bbox.h * 0.12), far(r.shade, r.depth), { alpha: 0.2 * thin, seed: r.i + 19, shrink: 0.95, edge: 8, rim: false })
        })
      }
    })

    // ---- 4. the golden haze over everything behind, and the light pooling where it falls, before the near things go in
    D.pass('golden haze', 0.45, () => {
      const back = S.regions.filter((q) => q.depth >= NEAR && !['shadow', 'highlight', 'glow'].includes(q.role))
      if (back.length) D.layer({ soften: 36, alpha: 0.32 }, () => { for (const r of back) D.fill(r.pts, HAZE, { grow: 'wipe', dir: 0, cost: 0.4 }) })
      for (const r of S.regions.filter((q) => q.role === 'highlight')) D.layer({ soften: 16, cut: S.occluders(r, { light: false }) }, () => D.fill(r.pts, light(K.mix(r.color, HAZE, 0.4), 0.3), { alpha: 0.5, grow: 'wipe', dir: Math.atan2(-L[1], -L[0]) }))
      for (const r of S.regions.filter((q) => q.role === 'glow')) D.layer({ soften: 42, alpha: 0.35, cut: S.occluders(r, { light: false }) }, () => D.fill(K.scale(r.pts, 1.12), light(r.lit, 0.3), { grow: 'spread' }))
    })

    // ---- 5. the foreground in opaque gouache, back to front: flat tone steps toward the light, dry-brush drags, a settled rim
    D.pass('gouache, back to front', 3.6, () => {
      for (const r of S.regions) {
        if (tier(r) !== 'gouache') continue
        const d = r.depth, tex = (1 - K.smoothstep(0.12, NEAR, d)) * (o.drag ?? 1), b = r.bbox, sz = Math.min(b.w, b.h)
        if (r.role === 'shadow') { // cast shadows: a glaze of cool shadow colour, dragged at its edge
          D.layer({ tooth: 'gran', soften: 2.5, blend: 'multiply' }, () => {
            D.fill(K.displace(K.densify(r.pts, 6, true), 6 * unit, 0.04, r.i), K.mix('#ffffff', K.mix(r.color, '#4d3f5e', 0.35), 0.35 + 0.5 * r.strength), { alpha: 0.95, grow: 'spread', from: K.litPoint(r, L, -0.3) })
          })
          continue
        }
        const edge = brushEdge(r), flat = r.role === 'bg' || r.role === 'ground' || r.form < 0.25
        const local = far(r.color, d), lit = far(light(K.mix(r.color, r.lit, 0.75), 0.06), d), shade = far(K.mix(r.color, r.shade, 0.85), d), core = far(dark(r.shade, 0.18), d)
        const dir = r.grain ?? (flat ? 0 : Math.atan2(L[1], L[0]) + Math.PI / 2)
        // body colour: lands opaque, brushed in from where the light is
        D.fill(edge, local, { grow: flat ? 'wipe' : 'spread', from: K.litPoint(r, L), dir, cost: 1.2 })
        if (!flat) {
          const k1 = sz * (0.16 + 0.1 * r.form), k2 = sz * (0.14 + 0.12 * r.form)
          // the lit side: the region minus a copy pushed away from the light
          D.layer({ mask: edge, cut: [K.translate(edge, -L[0] * k1, -L[1] * k1)], soften: 1.2 }, () => D.fill(edge, lit, { alpha: 0.92, grow: 'spread', from: K.litPoint(r, L, 0.45), cost: 0.6 }))
          // the shade side, then a narrower core where it turns away most
          D.layer({ mask: edge, cut: [K.translate(edge, L[0] * k2, L[1] * k2)], soften: 1.2 }, () => D.fill(edge, shade, { alpha: 0.9, grow: 'spread', from: K.litPoint(r, L, -0.45), cost: 0.6 }))
          if (r.form > 0.6) D.layer({ mask: edge, cut: [K.translate(edge, L[0] * k2 * 0.5, L[1] * k2 * 0.5)], soften: 1.5 }, () => D.fill(edge, core, { alpha: 0.75, grow: 'spread', from: K.litPoint(r, L, -0.45), cost: 0.4 }))
        }
        // dry-brush drags: a nearly spent brush leaves three or four bristle lines that break
        if (tex > 0.05) {
          const R = K.rng(r.i * 97 + 5), n = Math.round(K.clamp(r.area / (flat ? 1500 : 650), 8, flat ? 240 : 170) * tex), drags = []
          const len = flat ? K.clamp(sz * 0.32, 24 * unit, 150 * unit) : K.clamp(sz * 0.28, 10 * unit, 80 * unit), bw = K.clamp(sz * 0.05, 5 * unit, flat ? 12 * unit : 15 * unit)
          for (const [x, y] of K.scatter(edge, n, r.i * 13 + 1)) {
            const t = r.toneAt(x, y), u = R()
            let ang = dir + (R() - 0.5) * 0.35
            if (!flat && r.grain === undefined) ang = Math.atan2(y - b.cy, x - b.cx) + Math.PI / 2 + (R() - 0.5) * 0.3 // round things: drags run round the form
            const col = flat ? (u < 0.45 ? K.mix(local, lit, 0.22 + 0.2 * t) : u < 0.8 ? K.mix(local, shade, 0.35) : dark(local, 0.25))
              : t > 0.66 ? K.mix(lit, '#fffbe8', u * 0.35) : t < 0.42 ? K.mix(shade, dark(r.color, 0.45), u * 0.6) : u < 0.5 ? K.mix(local, lit, 0.5) : K.mix(local, shade, 0.5)
            const k = 3 + Math.floor(R() * 2), l = len * (0.5 + R() * 0.7), bow = (R() - 0.5) * l * 0.2, dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx
            for (let j = 0; j < k; j++) {
              const off = (j - (k - 1) / 2) * bw * 0.5 + (R() - 0.5) * bw * 0.3, l0 = l * R() * 0.3, l1 = l * (0.6 + R() * 0.4)
              const x0 = x - dx * l / 2 + dx * l0 + nx * off, y0 = y - dy * l / 2 + dy * l0 + ny * off, x1 = x - dx * l / 2 + dx * l1 + nx * off, y1 = y - dy * l / 2 + dy * l1 + ny * off
              drags.push([x0, y0, (x0 + x1) / 2 + nx * bow, (y0 + y1) / 2 + ny * bow, x1, y1, bw * (0.22 + 0.3 * R()), col, (0.28 + 0.5 * R()) * Math.min(1, tex + 0.3)])
            }
          }
          D.layer({ tooth: 'tooth', toothScale: 1.4 }, () => D.clip(edge, () => D.mark(drags.length * 0.012, (ctx, k) => {
            const m = Math.ceil(drags.length * k)
            ctx.save(); ctx.lineCap = 'round'
            for (let j = 0; j < m; j++) { const [x0, y0, cx, cy, x1, y1, w, c, a] = drags[j]; ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke() }
            ctx.restore()
          })))
        }
        // the gouache settles darker along its rim (inside the shape only)
        if (r.role !== 'bg' && r.role !== 'ground') D.clip(edge, () => D.stroke(edge, { closed: true, w: 3.2 * unit, color: dark(r.color, 0.42), alpha: 0.38 * (1 - d * 0.6), taper: 0.3, pressure: 0.3, rough: 0.4, seed: r.i + 61, cost: 0.4 }))
      }
    })

    // ---- 6. last accents: painted dark lines, light painted over dark (window bars, steam), highlights, a pencil touch at the back
    D.pass('last accents', 0.9, () => {
      for (const l of S.lines) {
        const cut = S.occluders(l, { light: false }), thin = 1 - K.smoothstep(NEAR, 1.05, l.depth)
        if (K.isLight(l.color)) D.layer({ cut }, () => {
          D.stroke(l.pts, { w: Math.max(3 * unit, l.w * 1.05), color: light(l.color, 0.25), alpha: 0.55 + 0.4 * thin, taper: l.role === 'steam' ? 0.85 : 0.3, pressure: 0.4, rough: 0.45, wobble: 1.2 * unit, seed: l.i * 7, boil: true, cost: 0.6 })
          if (l.w > 5) D.stroke(l.pts, { w: l.w * 0.35, color: '#fffdf2', alpha: 0.75 * thin + 0.2, taper: 0.9, rough: 0.6, wobble: 1.5 * unit, seed: l.i * 7 + 2, boil: true, cost: 0.2 })
        })
        else if (l.depth < FAR) D.layer({ cut, tooth: 'fine' }, () => D.stroke(l.pts, { w: Math.max(1.6 * unit, l.w * 0.9), color: far(dark(l.color, 0.15), l.depth), alpha: 0.6 + 0.35 * thin, taper: 0.8, pressure: 0.6, rough: 0.3, wobble: 0.8 * unit, seed: l.i * 7 + 1, cost: 0.6 }))
      }
      for (const r of S.solid.filter((q) => tier(q) === 'gouache' && q.form > 0.6)) {
        const b = r.bbox, s = Math.min(b.w, b.h)
        D.layer({ soften: 1, cut: S.occluders(r, { light: false }), mask: r.pts }, () => {
          const hx = b.cx + r.light[0] * b.w * 0.24, hy = b.cy + r.light[1] * b.h * 0.24
          D.fill(K.blob(hx, hy, s * 0.07, { sx: 1.4, sy: 0.75, rot: Math.atan2(r.light[1], r.light[0]) + Math.PI / 2, seed: r.i, wob: 0.3 }), light(r.lit, 0.55), { alpha: 0.85, grow: 'cut' })
          D.stroke([[hx - s * 0.08, hy + s * 0.03], [hx, hy - s * 0.01], [hx + s * 0.06, hy + s * 0.03]].map(([x, y]) => [x + r.light[1] * 0, y]), { w: s * 0.025, color: light(r.lit, 0.7), alpha: 0.7, taper: 0.9, rough: 0.7, seed: r.i + 3, cost: 0.2 })
        })
      }
    })

    D.top(() => { D.texture('paper', { opacity: 0.38 }); D.texture('grain', { opacity: 0.12 }) })
  },
}

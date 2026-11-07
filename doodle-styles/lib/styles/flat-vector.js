// Flat vector — studied from anidoodle's regatta plate (flatVector.ts · styles/flatVector.md): pen-tool paths whose one
// flat fill lands the instant the path closes, no stroke anywhere (an edge is only where two fills meet), long shadows
// as separate shapes with a transparency ramp, a raster grain brush over the shade sides. Re-implemented for the scene.
//
// defaults (all overridable by a house style):
//   paper     the artboard behind everything
//   ink       the one shadow colour every cast shadow and shade facet leans toward (navy in the regatta)
//   key       a colour every swatch is pulled a little toward, so the palette sits in one key
//   swatches  how hard the palette is simplified: colours closer than this merge into one swatch (0 = no merging)
//   grain     strength of the grain brush (0 = none)
//   longShadow how far a long shadow is thrown, in units of its object's width
//   pen       the colour of the pen-tool path seen while a shape is being drawn
import { hull, anchors, penUI, grainTile, colourDist } from './_geo.js'

export default {
  id: 'flat-vector', name: 'Flat vector', ko: '플랫 벡터 일러스트',
  medium: 'pen-tool paths in a vector app: closed shapes with one flat fill each, long-shadow shapes with a transparency ramp, a raster grain brush',
  mark: 'anchor, anchor, anchor, close — the fill lands whole when the path closes; no stroke anywhere',
  edge: 'mathematically crisp: an edge exists only where two flat fills meet',
  order: ['background planes', 'midground', 'subjects', 'long shadows & shade facets', 'grain brush'],
  paper: 'a flat artboard (no paper texture)',
  palette: 'a simplified, harmonious set of flat swatches in one key; shade is one navy-leaning swatch, light one cream-leaning swatch',
  bestFor: '깔끔한 브랜드 그림 · 앱/웹 일러스트 · 인포그래픽 · 정물과 풍경',
  source: 'anidoodle flatVector.ts · styles/flatVector.md',
  defaults: { paper: '#f6f1e7', ink: '#24304f', key: '#f3e3c4', swatches: 16, grain: 0.42, longShadow: 1.5, pen: '#2f7bff' },

  draw(D, S, K, o) {
    const L = S.light
    // ---- the palette: every colour snapped to a simplified swatch in one key
    const sw = [], swatch = (c) => {
      let [h, s, l] = K.toHsl(c)
      s = K.clamp(s * 1.12 + 0.02); l = K.clamp(Math.round(l * 20) / 20, 0.07, 0.96); h = Math.round(h / 6) * 6
      const out = K.mix(K.fromHsl((h + 360) % 360, s, l), o.key, 0.08)
      for (const q of sw) if (colourDist(q, out) < o.swatches) return q
      sw.push(out); return out
    }
    const tones = new Map()
    const T = (r) => {
      if (!tones.has(r)) {
        const base = swatch(r.role === 'glow' ? r.lit : r.color)
        tones.set(r, { base, shade: swatch(K.mix(r.color, K.mix(r.shade, o.ink, 0.25), 0.6)), deep: swatch(K.mix(r.color, K.mix(r.shade, o.ink, 0.4), 0.92)), lit: swatch(K.mix(r.lit, '#fff6e2', 0.3)) })
      }
      return tones.get(r)
    }
    const solid = S.regions.filter((r) => !['shadow', 'glow', 'highlight'].includes(r.role))
    const isBack = (it) => it.kind === 'region' ? (['bg', 'glow', 'highlight'].includes(it.role) || it.depth >= 0.8) : it.depth >= 0.8
    const isMid = (it) => it.kind === 'region' ? (it.role === 'ground' || it.depth >= 0.45) : it.depth >= 0.45 && !K.isLight(it.color)
    const passOf = (it) => (isBack(it) ? 0 : isMid(it) ? 1 : 2)
    // a shape drawn out of painter's order is cut by what was painted over it in an earlier pass
    const cutFor = (it, p) => S.items.filter((q) => q.kind === 'region' && q.i > it.i && !['shadow', 'glow'].includes(q.role) && passOf(q) < p && boxHit(q.bbox, it.bbox || K.bbox(it.pts))).map((q) => q.pts)

    // ---- one vector shape: the pen traces its anchors, the flat fill lands when the path closes
    const shape = (pts, color, { alpha = 1, cost = 1, closed = true } = {}) => {
      // the pen's time goes into placing anchors, not into the length of the path
      const idx = anchors(pts, 12, closed)
      D.mark(cost * (0.35 + idx.length * 0.09), (ctx, k) => {
        if (k < 1) { penUI(ctx, pts, idx, k, { color: o.pen }); return }
        ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; K.path(ctx, pts); ctx.fill(); ctx.restore()
      })
    }
    const lineShape = (l) => {
      // a line is an expanded path (a thin closed shape), never a stroke
      const light = K.isLight(l.color), w = Math.max(light ? 4 : 2.4, l.w)
      const pts = K.tube(l.pts, w / 2, light && l.pts.length > 4 ? w * 0.22 : w / 2, false)
      shape(pts, light ? swatch(K.mix(l.color, '#ffffff', 0.2)) : swatch(K.mix(l.color, o.ink, 0.2)), { alpha: light && l.pts.length > 4 ? 0.92 : 1, cost: 0.6 })
    }
    const item = (it, p) => {
      const cut = cutFor(it, p)
      const body = () => {
        if (it.kind === 'line') return lineShape(it)
        const t = T(it)
        if (it.role === 'shadow') return // thrown later, as a long shadow
        if (it.role === 'highlight') {
          // light on a surface is a flat lighter swatch of that surface, not a new colour
          const [cx, cy] = it.centre, under = [...S.solid].reverse().find((q) => q.i < it.i && K.inside(q.pts, cx, cy))
          return shape(it.pts, swatch(K.mix(K.mix(under ? under.color : S.bg, it.color, 0.45), '#fffaf0', 0.22)))
        }
        if (it.role === 'glow') {
          // a light source: flat stepped halos (crisp offset rings), then the source itself
          // the halos sit on the wall: whatever was set into the wall around the source (a frame) is cut out of them
          const ring = K.offset(K.densify(it.pts, 10, true), 150), rb = K.bbox(ring)
          const frame = S.regions.filter((q) => q.i < it.i && !['bg', 'ground', 'shadow', 'glow', 'highlight'].includes(q.role) && boxHit(q.bbox, rb)).map((q) => q.pts)
          D.layer({ cut: frame }, () => { for (const [d, a] of [[150, 0.1], [90, 0.12], [40, 0.16]]) shape(K.offset(K.densify(it.pts, 10, true), d), t.lit, { alpha: a, cost: 0.4 }) })
          return shape(it.pts, t.base)
        }
        shape(it.pts, t.base)
      }
      if (cut.length) D.layer({ cut }, body); else body()
    }

    D.ground(() => D.sheet(o.paper))
    const names = ['background planes', 'midground', 'subjects']
    names.forEach((name, p) => D.pass(name, [1.6, 1.4, 2.4][p], () => { for (const it of S.items) if (passOf(it) === p) item(it, p) }))

    D.pass('long shadows & shade facets', 2, () => {
      // long shadows: the cast shadow thrown far along the ground, away from the light, ramped to nothing
      let dx = -L[0], dy = -L[1] * 0.28
      const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl
      for (const r of S.regions.filter((q) => q.role === 'shadow')) {
        const b = r.bbox, len = Math.max(b.w, b.h * 2) * o.longShadow
        const far = K.scale(r.pts, 0.82).map(([x, y]) => [x + dx * len, y + dy * len])
        const poly = hull([...r.pts, ...far]), a0 = [b.cx - dx * b.w * 0.45, b.cy - dy * b.w * 0.45], a1 = [b.cx + dx * (len + b.w * 0.3), b.cy + dy * (len + b.w * 0.3)]
        const idx = anchors(poly, 8), alpha = 0.3 + 0.45 * r.strength, ink = K.rgb(K.mix(r.color, o.ink, 0.7))
        D.layer({ cut: S.occluders(r, { light: false }) }, () => D.mark(0.5 + K.length(poly, true) / 300, (ctx, k) => {
          if (k < 1) { penUI(ctx, poly, idx, k, { color: o.pen }); return }
          const g = ctx.createLinearGradient(a0[0], a0[1], a1[0], a1[1])
          g.addColorStop(0, `rgba(${ink},${alpha})`); g.addColorStop(0.35, `rgba(${ink},${alpha * 0.75})`); g.addColorStop(1, `rgba(${ink},0)`)
          ctx.save(); ctx.fillStyle = g; K.path(ctx, poly); ctx.fill(); ctx.restore()
        }))
      }
      // shade facets: a crisp crescent on the side away from the light (the shape minus itself moved toward the light),
      // and a small lit facet toward it — form in two flat steps, never a gradient
      for (const r of solid) {
        if (r.form < 0.22 || r.role === 'bg' || r.role === 'ground') continue
        const b = r.bbox, t = T(r), cut = S.occluders(r, { light: false }), s = Math.min(b.w, b.h)
        const sx = L[0] * b.w * (0.07 + 0.17 * r.form), sy = L[1] * b.h * (0.07 + 0.17 * r.form)
        const moved = K.translate(r.pts, sx, sy), idx = anchors(r.pts, 10)
        D.layer({ mask: r.pts, cut }, () => {
          D.mark(0.4 + K.length(r.pts, true) / 360, (ctx, k) => {
            if (k < 1) { penUI(ctx, moved, idx, k, { color: o.pen }); return }
            crescent(ctx, r.pts, moved, t.shade)
          })
          if (r.form > 0.75 && s > 60) {
            // a second, deeper step in the core of the shade
            const m2 = K.translate(K.scale(r.pts, 1.04), sx * 0.45, sy * 0.45)
            D.mark(0.3, (ctx, k) => { if (k < 1) return; crescent(ctx, r.pts, m2, t.deep) })
          }
          if (r.form > 0.55 && s > 40) {
            const hl = K.blob(b.cx + L[0] * b.w * 0.25, b.cy + L[1] * b.h * 0.27, s * 0.1, { sx: 1.5, sy: 0.75, rot: Math.atan2(L[1], L[0]) + Math.PI / 2, seed: r.i, wob: 0.05, n: 24 })
            shape(hl, t.lit, { cost: 0.4 })
          }
        })
      }
    })

    D.pass('grain brush', 1.4, () => {
      // the grain brush: raster speckle painted over the shade side of each shape, clipped to it, ramped from nothing
      // on the lit side to full on the shade side
      for (const r of solid) {
        if (r.area < 900) continue
        const b = r.bbox, t = T(r), big = r.role === 'bg' || r.role === 'ground'
        const a0 = [b.cx + L[0] * b.w * (big ? 0.5 : 0.05), b.cy + L[1] * b.h * (big ? 0.5 : 0.05)], a1 = [b.cx - L[0] * b.w * 0.5, b.cy - L[1] * b.h * 0.5]
        const col = K.rgb(K.mix(t.deep, o.ink, 0.3)), strength = o.grain * (big ? 0.55 : 1) * (K.lum(t.base) < 0.25 ? 0.6 : 1)
        if (strength <= 0) continue
        D.layer({ mask: r.pts, cut: S.occluders(r, { light: false }), alpha: strength }, () => D.mark(0.3 + Math.sqrt(r.area) / 90, (ctx, k) => {
          const env = D.env, g = ctx.createLinearGradient(a0[0], a0[1], a1[0], a1[1])
          g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.45, `rgba(${col},0.35)`); g.addColorStop(1, `rgba(${col},1)`)
          ctx.save()
          if (k < 1) { const R = Math.hypot(b.w, b.h) * k; ctx.beginPath(); ctx.arc(a1[0], a1[1], Math.max(1, R), 0, Math.PI * 2); ctx.clip() }
          ctx.fillStyle = g; ctx.fillRect(b.x0 - 2, b.y0 - 2, b.w + 4, b.h + 4)
          const pat = ctx.createPattern(grainTile(env, { density: 0.26, seed: 7 }), 'repeat'); pat.setTransform(new DOMMatrix().scale(1 / env.scale))
          ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = pat; ctx.fillRect(b.x0 - 2, b.y0 - 2, b.w + 4, b.h + 4)
          ctx.restore()
        }))
      }
    })
  },
}
// the shape minus a moved copy of itself, as one even-odd path (the layer's mask trims what falls outside the shape)
const crescent = (ctx, a, b, color) => {
  ctx.save(); ctx.fillStyle = color; ctx.beginPath()
  for (const s of [a, b]) s.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.fill('evenodd'); ctx.restore()
}
const boxHit = (A, B) => !(A.x0 > B.x1 || B.x0 > A.x1 || A.y0 > B.y1 || B.y0 > A.y1)

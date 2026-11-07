// Mid-century gouache — studied from anidoodle's midCentury plate (a hillside village and a girl with a kite): opaque
// matte designer's gouache on warm illustration board, the way 1950s-60s picture books were painted. A flat brush
// lays each shape in, visible only at its slightly ragged edge (a polygon keeps its corners: a box is cut, not
// rounded); flats go down BIG TO SMALL while the stacking order stays; a lighter colour goes straight over a darker
// one. Light is flat: a darker shape on the side away from the sun, a flat cast shadow, a small shine on a round thing.
// Then a nearly dry brush is dragged over the flats so the bristles skip the board's tooth. Last, a loose
// brush-and-ink line on its own plate, printed OFF REGISTER: it wanders past the colour and leaves edges out where the
// colour already says it. Every colour is pulled to a limited 1950s palette.
//
// defaults (all overridable):
//   board     the warm illustration board        ink      the line plate's ink        register [dx, dy] of the line plate
//   palette   the limited gouache palette every colour is pulled to (hex list)        dry  0..1 how much dry brush
//   line      the ink line's weight (px at 1080)  shine    the light flat on round things
import { clipTo, rowsClip, hides, rgbOf, css, mixA, trace } from './_paint.js'

const PALETTE = ['#f1e1b8', '#f5e8c8', '#f7efdc', '#f0c866', '#e9ae34', '#e07a32', '#d2462a', '#e8a296', '#eab28c', '#a8683a', '#56aba2', '#98c1ad', '#4f8f86', '#a6a340', '#6f6d2c', '#4c8c52', '#356a3e', '#244e4a', '#7a4a33', '#5a6670', '#28324f', '#2b2724']

export default {
  id: 'mid-century', name: 'Mid-century gouache', ko: '미드센추리 과슈',
  medium: "opaque matte designer's gouache on warm illustration board, a dry brush dragged over the flats, a loose brush-and-ink line printed off register",
  mark: 'flat opaque shapes with slightly ragged brushed edges; dry-brush bristle streaks that break up as the brush runs out; a thin thick-thin ink line',
  edge: 'a brushed, slightly ragged colour edge; the ink line floats off it (off register) and leaves edges open where the light is',
  order: ['flats, big to small', 'dry brush', 'the line plate, off register'],
  paper: 'warm cream illustration board, its tooth showing through the dry brush',
  palette: 'limited and bold, one key: warm board, mustard, tomato, orange, cinnamon, turquoise, olive, deep green-black, navy, pink, cream',
  bestFor: '복고풍 그림책 같은 그림 · 동화, 포스터, 도시와 마을 · 따뜻하고 위트 있는 브랜드',
  source: 'anidoodle midCentury.ts · koiDrawKit.ts (streaks) · styles/midCentury.md',
  defaults: { board: '#f1e1b8', ink: '#1d1a17', register: [5, -4], palette: PALETTE, dry: 1, line: 2.1, shine: '#fbf4e2' },
  draw(D, S, K, o) {
    const L = S.light, sc = Math.min(S.W, S.H) / 1080, pal = o.palette || PALETTE, ink = o.ink
    const solid = S.regions.filter((r) => r.role !== 'shadow' && r.role !== 'highlight')
    const big = (r) => r.role === 'bg' || r.role === 'ground'
    const dist = (a, b) => { const x = rgbOf(K, a), y = rgbOf(K, b), rm = (x[0] + y[0]) / 2; return (2 + rm / 256) * (x[0] - y[0]) ** 2 + 4 * (x[1] - y[1]) ** 2 + (2 + (255 - rm) / 256) * (x[2] - y[2]) ** 2 }
    const near = (c, not = []) => { let best = null, bd = Infinity; for (const p of pal) { if (not.includes(p)) continue; const d = dist(c, p); if (d < bd) { bd = d; best = p } } return best || pal[0] }
    // what lies under a point at a stacking position (for shadows and for keeping a shape off its background's colour)
    const under = (x, y, below) => { for (let i = solid.length - 1; i >= 0; i--) { const q = solid[i]; if (q.i < below && x >= q.bbox.x0 && x <= q.bbox.x1 && y >= q.bbox.y0 && y <= q.bbox.y1 && K.inside(q.pts, x, y)) return q } return null }
    const flatOf = new Map()
    for (const r of solid) {
      const base = r.role === 'glow' ? r.lit : r.color, u = under(r.centre[0], r.centre[1], r.i)
      let c = near(base)
      if (u && flatOf.get(u) === c && !big(r)) c = near(base, [c]) // never the same flat as the shape it sits on
      if (r.role === 'bg' && c === o.board) c = near(base, [c]) // the wall is painted, not the bare board
      flatOf.set(r, c)
    }
    const shadeOf = (r) => { const c = flatOf.get(r); return K.lum(c) > 0.8 ? K.mix(c, '#b7a283', 0.32) : K.mix(K.adjust(c, { sat: 0.92 }), '#2b2724', 0.3) }

    // ---- the shapes, each a flat with a ragged edge, a stacking position and the order it is laid in (big → small)
    const edge = (pts, seed) => { const a = Math.sqrt(Math.abs(K.area(pts))), amp = K.clamp(a * 0.011, 0.3, 2.6) * Math.max(1, sc); return K.displace(K.densify(pts, 4, true), amp, 0.11, seed, 2) }
    const shapes = []
    const rr = K.rng(1957)
    for (const r of S.regions) {
      if (r.role === 'shadow') {
        const u = under(r.centre[0], r.centre[1], r.i), base = u ? flatOf.get(u) : o.board
        shapes.push({ pts: edge(r.pts, r.i + 40), col: K.mix(base, '#2b2724', 0.22 + 0.3 * r.strength), stack: r.i, area: r.area, ang: 0.05, clip: null })
        continue
      }
      if (r.role === 'highlight') {
        const u = under(r.centre[0], r.centre[1], r.i), base = u ? flatOf.get(u) : o.board
        shapes.push({ pts: edge(r.pts, r.i + 40), col: K.mix(base, K.lighten(r.color, 0.2), 0.5), stack: r.i, area: r.area, ang: 0.1, clip: null })
        continue
      }
      const b = r.bbox, m = Math.min(b.w, b.h), body = edge(r.pts, r.i + 40)
      shapes.push({ pts: body, col: flatOf.get(r), stack: r.i, area: r.area, ang: big(r) ? 0.06 : (rr() - 0.5) * 0.8, clip: null })
      // flat light: a darker shape on the side away from the sun (the shape minus itself pushed toward the light)
      if (!big(r) && r.role !== 'glow' && r.form >= 0.3 && m > 14 * sc) {
        const k = 0.16 + 0.14 * r.form, lit = edge(K.translate(r.pts, L[0] * b.w * k, L[1] * b.h * k), r.i + 60)
        shapes.push({ pts: body, hole: lit, col: shadeOf(r), stack: r.i + 0.1, area: r.area * k * 1.6, ang: (rr() - 0.5) * 0.8, clip: body })
        // a shine on a round thing: a small flat blob of light
        if (r.form >= 0.75 && m > 50 * sc) {
          const hx = b.cx + L[0] * b.w * 0.26, hy = b.cy + L[1] * b.h * 0.26
          const shine = K.blob(hx, hy, m * 0.07, { sx: 1.5, sy: 0.75, rot: Math.atan2(L[1], L[0]) + Math.PI / 2, seed: r.i, wob: 0.12, n: 18 })
          shapes.push({ pts: shine, col: K.mix(o.shine, flatOf.get(r), 0.2), stack: r.i + 0.2, area: m * m * 0.02, ang: 0.3, clip: body })
        }
      }
    }
    const occFor = (stack) => S.regions.filter((q) => q.i > stack && q.role !== 'shadow' && q.role !== 'highlight').map((q) => q.pts)

    D.ground(() => { D.sheet(o.board); D.texture('paper', { opacity: 0.35 }) })

    D.pass('flats, big to small', 4, () => {
      // big to small in TIME; the stacking order stays, so a small thing behind fills in around a big one in front
      const order = shapes.map((s, i) => i).sort((a, b) => shapes[b].area - shapes[a].area || a - b)
      for (const i of order) {
        const s = shapes[i], occ = occFor(s.stack), b = K.bbox(s.pts), a = Math.sqrt(s.area), band = K.clamp(a / 5, 5, 58) * Math.max(1, sc)
        D.mark(1.4 + a / 22, (ctx, k) => {
          ctx.save(); clipTo(ctx, s.clip, occ, S.W, S.H)
          if (k < 1) rowsClip(K, ctx, b, s.ang, band, k, s.stack * 7 + 1) // the flat brush's back-and-forth rows
          ctx.fillStyle = s.col; ctx.beginPath(); trace(ctx, s.pts); if (s.hole) { trace(ctx, s.hole.slice().reverse()); ctx.fill('evenodd') } else ctx.fill()
          ctx.restore()
        })
      }
    })

    D.pass('dry brush', 1.4, () => {
      // a nearly dry brush dragged over the flats: bristles side by side, each skipping the board's tooth, more and more
      // as the brush runs out toward the end of the stroke
      const strokes = [], r0 = K.rng(52), amt = o.dry ?? 1
      const add = (r, a, b, w, col, seed) => strokes.push({ r, a, b, w, col, seed })
      for (const r of solid) {
        const bb = r.bbox, base = flatOf.get(r)
        if (r.role === 'bg') {
          const n = Math.round(7 * amt * Math.sqrt(r.area) / 900)
          for (let i = 0; i < n; i++) { const y = bb.y0 + (0.08 + 0.84 * r0()) * bb.h, x = bb.x0 + r0() * bb.w * 0.6, len = (220 + r0() * 360) * sc; add(r, [x, y], [x + len, y + (r0() - 0.5) * 30 * sc], (30 + r0() * 40) * sc, K.mix(base, i % 2 ? '#f7efdc' : shadeOf(r), K.lum(base) < 0.3 ? 0.18 : 0.35), 700 + i) }
        } else if (r.role === 'ground') {
          const n = Math.round(6 * amt * Math.sqrt(r.area) / 700), g = r.grain ?? 0
          for (let i = 0; i < n; i++) { const y = bb.y0 + (0.1 + 0.85 * r0()) * bb.h, x = bb.x0 + r0() * bb.w * 0.7, len = (200 + r0() * 300) * sc; add(r, [x, y], [x + Math.cos(g) * len, y + Math.sin(g) * len], (20 + r0() * 28) * sc, K.mix(base, shadeOf(r), 0.6), 760 + i) }
        } else if (r.role !== 'glow' && r.form >= 0.3 && Math.min(bb.w, bb.h) > 60 * sc) {
          // a few drags on the shade side, across the form
          const n = Math.max(1, Math.round(2 * amt + bb.w / (180 * sc)))
          for (let i = 0; i < n; i++) {
            const t = (i + 0.5) / n, y = bb.y0 + bb.h * (0.25 + 0.55 * t), x0 = bb.cx - L[0] * bb.w * 0.05, x1 = bb.cx - L[0] * bb.w * 0.55
            add(r, [x0, y - L[1] * 10 * sc], [x1, y + (r0() - 0.5) * 16 * sc], Math.min(bb.h * 0.16, 26 * sc), shadeOf(r), 800 + r.i * 10 + i)
          }
        }
      }
      for (const s of strokes) {
        const occ = occFor(s.r.i), dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l
        const nb = Math.max(5, Math.round(s.w / 2.2)), steps = Math.max(6, Math.round(l / 3)), rr2 = K.rng(s.seed)
        const bristles = Array.from({ length: nb }, (_, k) => ({ v: (k / (nb - 1) - 0.5) * s.w + (rr2() - 0.5) * 1.2, start: rr2() * 0.08, dens: 0.2 + rr2() * 0.14 }))
        D.mark(l / 90, (ctx, q) => {
          ctx.save(); clipTo(ctx, s.r.pts, occ, S.W, S.H)
          ctx.strokeStyle = s.col; ctx.lineWidth = 1.7 * Math.max(1, sc); ctx.lineCap = 'round'; ctx.globalAlpha = 0.85; ctx.beginPath()
          bristles.forEach((br, k) => {
            let on = false
            for (let j = 0; j <= steps * q; j++) {
              const t = j / steps; if (t < br.start) continue
              const skip = K.noise(s.seed + k * 13, t * l * 0.35, k * 3.1) < br.dens + t * 0.38, x = s.a[0] + dx * t + nx * br.v, y = s.a[1] + dy * t + ny * br.v
              if (skip) { on = false; continue }
              if (!on) { ctx.moveTo(x, y); on = true } else ctx.lineTo(x, y)
            }
          })
          ctx.stroke(); ctx.restore()
        })
      }
      // light lines (steam, a white window bar) are opaque cream gouache pulled with a round brush; steam boils
      for (const l of S.lines) {
        if (!K.isLight(l.color)) continue
        D.layer({ cut: occFor(l.i) }, () => D.stroke(l.pts, { w: Math.max(5 * sc, l.w * 1.25), color: K.nearest(l.color, pal), taper: 0.55, pressure: 0.6, rough: 0.3, wobble: 1.2, smooth: true, seed: l.i * 7, boil: true, cost: 0.8 }))
      }
    })

    D.pass('the line plate, off register', 2, () => {
      // a loose brush-and-ink line on its own plate: open where the light eats the edge, broken here and there,
      // occluded on its own plate, then the whole plate printed a few px off the colour
      const off = [(o.register?.[0] ?? 5) * sc, (o.register?.[1] ?? -4) * sc], w = (o.line ?? 2.1) * sc
      for (const r of solid) {
        if (!r.contour || r.role === 'glow') continue
        const rr3 = K.rng(r.i + 900)
        D.layer({ off, cut: S.occluders(r, { light: false }) }, () => {
          for (const run of K.runs(r.pts, (i, n) => K.facing(n, L) < 0.72)) {
            // break long runs: the brush lifts and comes down again
            const len = K.length(run), pieces = Math.max(1, Math.round(len / (260 * sc)))
            for (let p = 0; p < pieces; p++) {
              const a = Math.floor((p / pieces) * (run.length - 1)), z = Math.max(a + 1, Math.floor(((p + 1) / pieces) * (run.length - 1)) - (p < pieces - 1 && rr3() < 0.6 ? 2 : 0))
              const seg = run.slice(a, z + 1); if (seg.length < 2) continue
              D.stroke(seg, { w: w * (big(r) ? 0.8 : r.role === 'detail' ? 0.75 : 1), color: ink, alpha: 0.92, taper: 1, pressure: 0.85, rough: 0.35, wobble: 1.4, seed: r.i * 31 + p, boil: true, cost: 0.7 })
            }
          }
        })
      }
      for (const l of S.lines) {
        if (K.isLight(l.color)) continue
        D.layer({ off, cut: S.occluders(l, { light: false }) }, () => D.stroke(l.pts, { w: Math.max(1.4 * sc, Math.min(w * 1.1, l.w * 0.7)), color: ink, alpha: 0.9, taper: 1, pressure: 0.85, rough: 0.35, wobble: 1.2, seed: l.i * 7, boil: true, cost: 0.7 }))
      }
    })

    D.top(() => { D.texture('coldpress', { opacity: 0.2 }); D.texture('paper', { opacity: 0.2 }) })
  },
}

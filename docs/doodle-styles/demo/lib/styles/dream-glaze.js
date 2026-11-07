// Dream glaze — studied from anidoodle's dreamGlaze plate and kit (the "hand-painted dream photograph"): oil thinned
// with resin, laid in thin glazes with a very small soft brush on a smooth white ground. No visible stroke, no ridge,
// no blur: every form is turned smoothly under ONE low sun, every edge is HARD near and far alike (depth is haze and
// scale, never softness), and cast shadows rake long and away from the sun. The drama is in the light and the
// clarity, never in the paint. Re-implemented for the scene model: a form is a stack of smooth glazes (a ramp across
// it from the sun side to the core shadow and a warm bounce at the far rim, the specular sheen, the occlusion at its
// silhouette), the shadows are the scene's own, stretched long away from the sun.
// The film shows the glazes building up — the ground laid in boustrophedon rows whose lower edge wavers, each form
// laid in its shadow tone, then worked up to the light (the light arriving last at the highlight) — never a fade.
//
// defaults (all overridable):
//   panel   the smooth white primed panel        umber   the thin drawing          shadow  the violet-umber of shadows
//   sun     the warm of the light                bounce  the warm light thrown back from the ground into the shade
//   haze    0..1 how much far things pale toward the air       long   how far cast shadows stretch (1 = as given)
//   sky     the cool at the top of a light source (a window, a sky)   varnish  how much the corners sink
import { field, clipTo, rowsClip, hides, rgbOf, css, mixA, hslA, fromHslA, trace } from './_paint.js'

export default {
  id: 'dream-glaze', name: 'Dream glaze', ko: '초현실 글레이즈 유화',
  medium: 'resin-thinned oil glazes laid with a very small soft brush on a smooth white panel',
  mark: 'none that shows: every form turned in value steps too fine to see under one low sun; glaze over glaze, enamel-flat',
  edge: 'hard everywhere, near and far alike; depth is haze and scale, never softness; long raking cast shadows',
  order: ['umber drawing', 'ground laid in rows, twice', 'forms laid in their shadow tone', 'long cast shadows', 'small accents', 'forms worked up to the light'],
  paper: 'a smooth white primed panel, a fine linen whisper under the varnish, the corners a little sunk',
  palette: "the subject's own colours, clarified: a warm low sun, violet-umber shadows, a lemon-to-blue sky in any light source",
  bestFor: '초현실적이고 고요한 장면 · 이상한 물건, 꿈 같은 풍경, 커버 아트 · 사색적인 브랜드',
  source: 'anidoodle dreamGlaze.ts · dreamGlazeDraw.ts · dreamGlazeKit.ts · styles/dreamGlaze.md',
  defaults: { panel: '#f7f4ec', umber: '#6b4a33', shadow: '#3a2846', sun: '#fff1d2', bounce: '#d9894a', sky: '#8fb4d6', haze: 0.22, long: 1.6, varnish: 0.16 },
  draw(D, S, K, o) {
    const L = S.light, sc = Math.min(S.W, S.H) / 1080
    const SH = rgbOf(K, o.shadow), SUN = rgbOf(K, o.sun), BNC = rgbOf(K, o.bounce), SKY = rgbOf(K, o.sky), UMB = o.umber
    const solid = S.regions.filter((r) => r.role !== 'shadow' && r.role !== 'highlight')
    const big = (r) => r.role === 'bg' || r.role === 'ground'
    const air = mixA(rgbOf(K, S.bg), [236, 236, 240], 0.5)
    // clarified colours: a touch more saturated, far things paled toward the air, shade toward violet-umber
    const clar = (c, r) => { const [h, s, l] = hslA(c); let q = fromHslA(h, Math.min(1, s * 1.12), l); if (!big(r)) q = mixA(q, air, (o.haze ?? 0.22) * Math.max(0, r.depth - 0.35) * 1.5); return q }
    const cache = new Map()
    const cols = (r) => {
      if (cache.has(r)) return cache.get(r)
      const c = clar(rgbOf(K, r.color), r), lit = mixA(clar(rgbOf(K, r.lit), r), SUN, 0.25), shade = mixA(clar(rgbOf(K, r.shade), r), SH, 0.3)
      const v = { c, lit, shade, core: mixA(shade, SH, 0.35), refl: mixA(shade, BNC, 0.22), spec: mixA(lit, [255, 255, 250], 0.7) }
      cache.set(r, v); return v
    }
    const hid = new Map(solid.map((r) => [r, hides(S, r)]))
    const F = field(S, K)

    // long cast shadows: each shadow region stretched away from the sun, anchored on its sun-side edge
    const longOf = new Map()
    for (const q of S.regions.filter((x) => x.role === 'shadow')) {
      const b = q.bbox, k = o.long ?? 1.6, ax = L[0] < 0 ? b.x0 : b.x1, ay = L[1] < 0 ? b.y0 : b.y1, dirx = -Math.sign(L[0]) || 1
      // stretch mostly along the ground (x), a little in depth (y) for a high sun
      const ky = 1 + (k - 1) * 0.25 * Math.abs(L[1])
      longOf.set(q, { pts: q.pts.map(([x, y]) => [ax + (x - ax) * k, ay + (y - ay) * ky]), from: [L[0] < 0 ? b.x0 : b.x1, b.cy], to: [(L[0] < 0 ? b.x0 : b.x1) + dirx * b.w * k, b.cy] })
    }
    const overlaysOn = (r) => S.regions.filter((q) => (q.role === 'shadow' || q.role === 'highlight') && q.i > r.i).filter((q) => { const b = (longOf.get(q) ? K.bbox(longOf.get(q).pts) : q.bbox); return b.x0 < r.bbox.x1 && b.x1 > r.bbox.x0 && b.y0 < r.bbox.y1 && b.y1 > r.bbox.y0 })

    // ---- the glazes. Each paints inside the current clip.
    const fillRect = (ctx) => { ctx.fillRect(-10, -10, S.W + 20, S.H + 20) }
    const lin = (ctx, a, b, stops) => { const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]); for (const [t, c, al] of stops) g.addColorStop(t, al === undefined ? css(c) : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${al})`); ctx.fillStyle = g; fillRect(ctx) }
    const across = (r, k = 1) => { const b = r.bbox, e = (Math.abs(L[0]) * b.w + Math.abs(L[1]) * b.h) / 2 * k; return [[b.cx + L[0] * e, b.cy + L[1] * e], [b.cx - L[0] * e, b.cy - L[1] * e]] }
    const elliptic = (ctx, cx, cy, rx, ry, stops) => {
      ctx.save(); ctx.translate(cx, cy); ctx.scale(rx, ry)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      for (const [t, c, al] of stops) g.addColorStop(t, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${al ?? 1})`)
      ctx.fillStyle = g; ctx.fillRect(-2, -2, 4, 4); ctx.restore()
    }
    /** the finished glaze of a region: the light across it, turned if round, sheen and occlusion, then the shadows
     *  and light patches that fall on it */
    const paintForm = (ctx, r, tone = 1) => {
      const C = cols(r), b = r.bbox
      if (r.role === 'glow') { // a light source: clear sky colour, cooler at the top, lemon toward its foot
        lin(ctx, [b.cx, b.y0], [b.cx, b.y1], [[0, mixA(C.lit, SKY, 0.4)], [0.55, mixA(C.lit, [255, 248, 210], 0.25)], [1, mixA(C.c, BNC, 0.15)]])
        return
      }
      if (r.role === 'bg') {
        const [a, z] = across(r, 1)
        lin(ctx, a, z, [[0, mixA(C.c, C.lit, 0.55)], [0.5, C.c], [1, mixA(C.c, C.shade, 0.45)]])
        lin(ctx, [b.cx, b.y0], [b.cx, b.y1], [[0, mixA(C.shade, SH, 0.2), 0.22], [0.6, C.c, 0], [1, C.c, 0]])
      } else if (r.role === 'ground') {
        // a plain: hazier and darker toward its far edge, the sun side lighter
        lin(ctx, [b.cx, b.y0], [b.cx, b.y1], [[0, mixA(mixA(C.c, C.shade, 0.35), air, 0.12)], [0.35, C.c], [1, mixA(C.c, C.lit, 0.25)]])
        const [a, z] = across(r, 1); lin(ctx, a, z, [[0, C.lit, 0.28], [0.5, C.c, 0], [1, C.shade, 0.25]])
      } else if (r.form >= 0.45) {
        // turned: lit at the sun-side rim, the local colour, the shade, a core shadow, warm light bounced into the far rim
        const [a, z] = across(r, 1.02), f = r.form
        lin(ctx, a, z, [[0, mixA(C.c, C.lit, 0.4 + 0.6 * f)], [0.28, mixA(C.c, C.lit, 0.35)], [0.5, C.c], [0.68, mixA(C.c, C.shade, 0.5 + 0.5 * f)], [0.84, mixA(C.shade, C.core, f)], [1, mixA(C.shade, C.refl, 0.8 * f)]])
        // the sheen: a smooth pool of light where the sun meets the surface
        const hx = b.cx + L[0] * b.w * 0.24, hy = b.cy + L[1] * b.h * 0.24, m = Math.min(b.w, b.h)
        elliptic(ctx, hx, hy, b.w * 0.36, b.h * 0.3, [[0, C.lit, 0.55 * f], [1, C.lit, 0]])
        if (f > 0.75 && m > 30 * sc) elliptic(ctx, hx, hy, m * 0.09, m * 0.07, [[0, C.spec, 0.85], [0.6, C.spec, 0.25], [1, C.spec, 0]])
        // occlusion at the silhouette, so the form turns away even on its sides
        elliptic(ctx, b.cx - L[0] * b.w * 0.06, b.cy - L[1] * b.h * 0.06, b.w * 0.58, b.h * 0.58, [[0, C.core, 0], [0.78, C.core, 0], [1, C.core, 0.32 * f]])
      } else {
        const [a, z] = across(r, 1)
        lin(ctx, a, z, [[0, mixA(C.c, C.lit, 0.45)], [0.55, C.c], [1, mixA(C.c, C.shade, 0.55)]])
      }
      if (tone < 1) return
      for (const q of overlaysOn(r)) paintOverlay(ctx, q)
    }
    const paintOverlay = (ctx, q) => {
      ctx.save()
      if (q.role === 'shadow') {
        const lo = longOf.get(q), a = 0.42 + 0.4 * q.strength, tint = mixA(SH, rgbOf(K, q.color), 0.35)
        ctx.beginPath(); trace(ctx, lo.pts); ctx.clip()
        lin(ctx, lo.from, lo.to, [[0, tint, a], [1, tint, a * 0.62]])
      } else {
        const C = rgbOf(K, q.color)
        ctx.beginPath(); trace(ctx, q.pts); ctx.clip()
        lin(ctx, [q.bbox.cx, q.bbox.y0], [q.bbox.cx, q.bbox.y1], [[0, mixA(C, SUN, 0.3), 0.6], [1, C, 0.5]])
      }
      ctx.restore()
    }
    /** a glaze mark over region r, arriving the way a small brush lays it */
    const glaze = (r, cost, paint, grow) => D.mark(cost, (ctx, k) => {
      ctx.save(); clipTo(ctx, r.pts, hid.get(r) || [], S.W, S.H)
      if (k < 1) grow(ctx, k)
      paint(ctx); ctx.restore()
    })
    const rows = (r, band) => (ctx, k) => rowsClip(K, ctx, r.bbox, 0, band, k, r.i + 3)
    // worked up: a front of light advancing from the shade side, so shadows finish first and the highlight last
    const workUp = (r) => (ctx, k) => {
      const b = r.bbox, sx = b.cx - L[0] * b.w * 0.6, sy = b.cy - L[1] * b.h * 0.6, R = Math.hypot(b.w, b.h) * 1.2
      ctx.beginPath(); ctx.arc(sx, sy, Math.max(0.5, R * (1 - (1 - k) * (1 - k))), 0, Math.PI * 2); ctx.clip()
    }
    const size = (r) => Math.sqrt(r.area + 1) / 30

    D.ground(() => { D.sheet(o.panel) })

    D.pass('umber drawing', 1, () => {
      // thin, careful, constant lines with a fine brush: the drawing the glazes will cover
      for (const r of solid) if (r.contour || r.role === 'glow') D.line(r.pts.concat([r.pts[0]]), { w: 1.3 * sc, color: UMB, alpha: 0.75, cost: 0.6 })
      for (const r of solid) if (big(r)) { const b = r.bbox; if (b.y0 > 2) D.line([[b.x0, b.y0], [b.x1, b.y0]], { w: 1.3 * sc, color: UMB, alpha: 0.6, cost: 0.4 }) }
      for (const l of S.lines) D.line(l.pts, { w: 1.1 * sc, color: UMB, alpha: 0.6, cost: 0.5 })
    })

    D.pass('ground laid in rows, twice', 2.4, () => {
      // a thin glaze, then the full one, each in rows from the top; light sources too (they are the clearest colour)
      for (const pass of [0, 1]) for (const r of solid) {
        if (!big(r) && r.role !== 'glow') continue
        const band = 34 * sc
        glaze(r, size(r) * (pass ? 1.2 : 0.8), (ctx) => { ctx.globalAlpha = pass ? 1 : 0.45; paintForm(ctx, r, 0) }, rows(r, band))
      }
    })

    D.pass('forms laid in their shadow tone', 1.6, () => {
      // far first: each thing laid flat in its shade, the drawing gone under it
      for (const r of solid) {
        if (big(r) || r.role === 'glow') continue
        const C = cols(r), b = r.bbox
        glaze(r, size(r), (ctx) => { const [a, z] = across(r, 1); lin(ctx, a, z, [[0, mixA(C.shade, C.c, 0.5)], [1, mixA(C.shade, C.core, 0.4)]]) }, rows(r, Math.max(6 * sc, b.h / 9)))
      }
    })

    D.pass('long cast shadows', 1, () => {
      for (const q of S.regions) {
        if (q.role !== 'shadow' && q.role !== 'highlight') continue
        const lo = longOf.get(q), pts = lo ? lo.pts : q.pts, occ = S.regions.filter((x) => x.i > q.i && x.role !== 'shadow' && x.role !== 'highlight').map((x) => x.pts)
        const dir = lo ? Math.atan2(lo.to[1] - lo.from[1], lo.to[0] - lo.from[0]) : Math.PI / 2, b = K.bbox(pts)
        D.mark(Math.sqrt(Math.abs(K.area(pts))) / 30 + 0.2, (ctx, k) => {
          ctx.save(); clipTo(ctx, null, occ, S.W, S.H)
          if (k < 1) { // laid along its length, away from the sun
            const c = Math.cos(dir), s = Math.sin(dir), R = Math.hypot(b.w, b.h) / 2 + 4, d = -R + 2 * R * k, px = b.cx + c * d, py = b.cy + s * d
            ctx.beginPath(); ctx.moveTo(px - s * R * 3, py + c * R * 3); ctx.lineTo(px + s * R * 3, py - c * R * 3); ctx.lineTo(px + s * R * 3 - c * R * 4, py - c * R * 3 - s * R * 4); ctx.lineTo(px - s * R * 3 - c * R * 4, py + c * R * 3 - s * R * 4); ctx.closePath(); ctx.clip()
          }
          paintOverlay(ctx, q); ctx.restore()
        })
      }
    })

    D.pass('small accents', 0.9, () => {
      // lines: a dark one a single hard hairline; a light one (steam, a white bar) a smooth hard-edged ribbon, turned
      // like a tube (a lighter core). Steam still drifts and boils once the piece is alive.
      for (const l of S.lines) {
        const occ = S.regions.filter((q) => q.i > l.i && q.role !== 'shadow' && q.role !== 'highlight').map((q) => q.pts)
        const pts = K.smooth(D.frame && K.isLight(l.color) ? K.wobble(l.pts, 0.8, l.i * 7 + D.frame * 7) : l.pts, false, 4), len = K.length(pts)
        const mid = pts[Math.floor(pts.length / 2)], back = F.pic(K.clamp(mid[0], 0, S.W - 1), K.clamp(mid[1], 0, S.H - 1)).c
        const light = K.isLight(l.color), c = rgbOf(K, l.color)
        D.mark(len / 120 + 0.1, (ctx, k) => {
          ctx.save(); clipTo(ctx, null, occ, S.W, S.H)
          const s = K.upTo(pts, k); if (s.length < 2) { ctx.restore(); return }
          ctx.lineJoin = 'round'
          if (light) {
            const w = Math.max(3 * sc, l.w * 1.05)
            ctx.lineCap = 'round'; ctx.strokeStyle = css(mixA(c, back, 0.28)); ctx.lineWidth = w; ctx.beginPath(); trace(ctx, s, false); ctx.stroke()
            ctx.strokeStyle = css(mixA(c, [255, 255, 252], 0.6)); ctx.lineWidth = w * 0.42; ctx.beginPath(); trace(ctx, K.translate(s, L[0] * w * 0.15, L[1] * w * 0.15), false); ctx.stroke()
          } else {
            ctx.lineCap = 'butt'; ctx.strokeStyle = css(mixA(c, SH, 0.2)); ctx.lineWidth = Math.max(1.2 * sc, l.w * 0.75); ctx.beginPath(); trace(ctx, s, false); ctx.stroke()
          }
          ctx.restore()
        })
      }
    })

    D.pass('forms worked up to the light', 3, () => {
      // last and slowest: every thing glazed up from its shadow to its light, the sheen arriving last
      for (const r of solid) {
        if (big(r) || r.role === 'glow') continue
        glaze(r, size(r) * 1.6, (ctx) => paintForm(ctx, r), workUp(r))
      }
    })

    D.top(() => {
      D.texture('linen', { opacity: 0.04 * 2.5 }); D.texture('paper', { opacity: 0.05 * 2 })
      // old varnish: the corners a little sunk
      D.mark(0.001, (ctx) => {
        const g = ctx.createRadialGradient(S.W / 2, S.H / 2, Math.min(S.W, S.H) * 0.42, S.W / 2, S.H / 2, Math.hypot(S.W, S.H) * 0.56)
        g.addColorStop(0, 'rgba(60,40,30,0)'); g.addColorStop(1, `rgba(60,40,30,${o.varnish ?? 0.16})`)
        ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(0, 0, S.W, S.H); ctx.restore()
      })
    })
  },
}

// Oil on canvas — studied from anidoodle's paintedOil plate (two pears and a copper pot): a toned linen canvas,
// a thin umber drawing, the dark masses blocked in lean with a big flat, then mid tones and lights in fatter paint
// with hog-bristle strokes that follow the form, impasto on the highlights, the last dark accents. Re-implemented
// for the scene model: every stroke carries two colours (what it was loaded with and what it picked up wet into wet),
// streaks along its length where the bristles differ, ridges along both edges (the one toward the light catches it),
// and an end that drags out into separate hairs as the paint runs out.
//
// defaults (all overridable by a house style / piece tweaks):
//   priming   lead-white priming under everything          toning   the imprimatura rubbed over it (burnt sienna/umber)
//   umber     the drawing colour and the warm of the darks warmth   0..1 how far the shadows lean toward umber
//   brush     1 = the plate's brush sizes; >1 broader, <1 finer  impasto 0..1 how thick the fat paint stands
//   weave     opacity of the linen weave over the finished paint
import { field, batches, sweepSort, formDir, hides, rgbOf, css, mixA, cumul } from './_paint.js'

const LIFT = [255, 243, 220], SINK = [27, 15, 8]

/** one loaded flat bristle stroke along `ctrl` (a few control points), precomputed so drawing it is cheap */
function makeStroke(K, ctrl, o) {
  const c = K.smooth(ctrl, false, 5)
  if (c.length < 2) return null
  const nn = K.normals(c), cum = cumul(c), len = cum[cum.length - 1] || 1, r = K.rng(o.seed)
  const nh = Math.max(3, Math.min(8, Math.round(o.w / 5)))
  const c0 = o.c0, c1 = o.c1 || o.c0, mid = mixA(c0, c1, 0.5), jit = o.jit ?? 0.12
  const hairs = Array.from({ length: nh }, (_, i) => {
    const u = -0.42 + (0.84 * (i + 0.5)) / nh + (r() - 0.5) * (0.4 / nh), tone = (r() - 0.5) * 2 * jit
    return { u, t1: (o.body ?? 0.78) + r() * (1 - (o.body ?? 0.78)), col: css(tone > 0 ? mixA(c1, LIFT, tone) : mixA(c1, SINK, -tone)) }
  })
  const streaks = Array.from({ length: Math.max(2, Math.round(nh * 0.6)) }, () => { const tone = (r() - 0.5) * 2 * jit * 1.3; return { u: (r() - 0.5) * 0.8, t0: r() * 0.25, t1: 0.55 + r() * 0.4, col: css(tone > 0 ? mixA(mid, LIFT, tone) : mixA(mid, SINK, -tone)) } })
  // which edge faces the light: that ridge catches a thin light line, the other a thin dark one
  const m = Math.floor(c.length / 2), side = nn[m][0] * o.L[0] + nn[m][1] * o.L[1] > 0 ? 1 : -1
  const imp = o.imp ?? 0.3
  return {
    c, nn, cum, len, w: o.w, alpha: o.alpha ?? 1, imp, body: o.body ?? 0.78, hairs, streaks, side, L: o.L,
    g0: css(c0), g1: css(c1), same: Math.abs(c0[0] - c1[0]) + Math.abs(c0[1] - c1[1]) + Math.abs(c0[2] - c1[2]) < 12,
    ridgeLit: css(mixA(mid, LIFT, 0.22 + 0.35 * imp)), ridgeDark: css(mixA(mid, SINK, 0.25 + 0.3 * imp)), drop: css(mixA(c0, SINK, 0.7)),
  }
}
// half width along the stroke: lands a little narrow and fills out (the brush slides in), drags thin where it lifts
const prof = (t) => (t < 0.1 ? 0.8 + 2 * t : 1) * (t > 0.68 ? 1 - (t - 0.68) * 1.1 : 1)
function at(s, i, u) { const p = s.c[i], n = s.nn[i], hw = s.w * prof(s.cum[i] / s.len); return [p[0] + n[0] * u * hw, p[1] + n[1] * u * hw] }
function upto(s, f) { const L = s.len * f; let i = 0; while (i < s.c.length - 1 && s.cum[i + 1] <= L) i++; return i }
function polyline(ctx, s, u, i0, i1) { ctx.beginPath(); for (let i = i0; i <= i1; i++) { const p = at(s, i, u); i === i0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]) } }
function ribbonPath(ctx, s, i1, dx = 0, dy = 0) {
  ctx.beginPath()
  for (let i = 0; i <= i1; i++) { const p = at(s, i, 0.5); i ? ctx.lineTo(p[0] + dx, p[1] + dy) : ctx.moveTo(p[0] + dx, p[1] + dy) }
  for (let i = i1; i >= 0; i--) { const p = at(s, i, -0.5); ctx.lineTo(p[0] + dx, p[1] + dy) }
  ctx.closePath()
}
function drawStroke(ctx, s, travel) {
  const last = Math.max(1, upto(s, travel)), bodyEnd = Math.min(last, Math.max(1, upto(s, s.body)))
  ctx.globalAlpha = s.alpha
  // a thick dab stands off the canvas: a hairline shadow on the side away from the light
  if (s.imp > 0.5) { ctx.fillStyle = s.drop; ctx.globalAlpha = s.alpha * 0.28 * s.imp; ribbonPath(ctx, s, bodyEnd, -s.L[0] * 1.6, -s.L[1] * 1.6); ctx.fill(); ctx.globalAlpha = s.alpha }
  if (s.same) ctx.fillStyle = s.g0
  else { const a = s.c[0], b = s.c[s.c.length - 1], g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]); g.addColorStop(0, s.g0); g.addColorStop(1, s.g1); ctx.fillStyle = g }
  ribbonPath(ctx, s, bodyEnd); ctx.fill()
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  // the dragged end: each hair runs on alone until its paint is gone
  const hw = Math.max(0.9, (s.w / s.hairs.length) * 0.95)
  for (const h of s.hairs) {
    const i1 = Math.min(last, upto(s, h.t1)), i0 = Math.max(0, Math.floor(bodyEnd * 0.75))
    if (i1 <= i0) continue
    ctx.strokeStyle = h.col; ctx.lineWidth = hw; polyline(ctx, s, h.u * 2, i0, i1); ctx.stroke()
  }
  // bristle grooves down the body
  ctx.globalAlpha = s.alpha * 0.55; ctx.lineWidth = Math.max(0.7, s.w * 0.07)
  for (const st of s.streaks) { const i0 = upto(s, st.t0), i1 = Math.min(last, upto(s, st.t1)); if (i1 <= i0) continue; ctx.strokeStyle = st.col; polyline(ctx, s, st.u, i0, i1); ctx.stroke() }
  // ridges shoved up at both edges
  if (s.imp > 0.12) {
    ctx.globalAlpha = s.alpha * Math.min(1, 0.3 + 0.55 * s.imp); ctx.lineWidth = 0.8 + 1.2 * s.imp
    ctx.strokeStyle = s.ridgeLit; polyline(ctx, s, 0.46 * s.side, 1, bodyEnd); ctx.stroke()
    ctx.strokeStyle = s.ridgeDark; polyline(ctx, s, -0.46 * s.side, 1, bodyEnd); ctx.stroke()
  }
  ctx.globalAlpha = 1
}

export default {
  id: 'oil', name: 'Oil on canvas', ko: '유화',
  medium: 'opaque oil paint with hog-bristle flats on a toned linen canvas, lean block-in to fat impasto',
  mark: 'a loaded flat bristle stroke that follows the form: streaked along its length, ridged at both edges, two colours wet into wet, its end dragged into hairs',
  edge: 'found on the lit side (clipped crisp against the paint behind), lost in shadow (the shade dragged out into the dark behind it)',
  order: ['toning rub', 'umber drawing', 'dark masses, lean', 'mid tones', 'lights, fat', 'impasto highlights', 'dark accents & lost edges'],
  paper: 'plain-weave linen, primed white and toned with a burnt-sienna rub; the weave shows through thin paint',
  palette: "the subject's own colours mixed opaque toward a Chardin kitchen palette: shadows warm toward umber, lights toward lead white",
  bestFor: '묵직하고 고전적인 정물 · 음식, 그릇, 초상 · 클래식한 브랜드',
  source: 'anidoodle paintedOil.ts · paintedOilKit.ts · styles/paintedOil.md',
  defaults: { priming: '#ede6d6', toning: '#9a6a44', umber: '#4a2c1a', warmth: 0.35, brush: 1, impasto: 1, weave: 0.32 },
  draw(D, S, K, o) {
    // the oil hand turns a form harder than the model: a deeper core shadow (warm, toward umber), a fuller light
    const deepOf = new Map(), toneCol = (r, t) => {
      const big = r.role === 'bg' || r.role === 'ground', c = rgbOf(K, r.color), lit = rgbOf(K, r.lit)
      if (!deepOf.has(r)) deepOf.set(r, mixA(rgbOf(K, r.shade), mixA(SINK, rgbOf(K, o.umber), 0.5), big ? 0.1 : 0.3))
      const T = big ? t : K.clamp((t - 0.52) * 1.35 + 0.52)
      return T >= 0.6 ? mixA(c, lit, (T - 0.6) / 0.4) : mixA(deepOf.get(r), c, T / 0.6)
    }
    const L = S.light, F = field(S, K, { tone: toneCol, patch: 0.3 }), sc = (Math.min(S.W, S.H) / 1080) * (o.brush || 1), IM = o.impasto ?? 1
    const umber = rgbOf(K, o.umber), toning = rgbOf(K, o.toning), warm = o.warmth ?? 0.35
    const solid = S.regions.filter((r) => r.role !== 'shadow' && r.role !== 'highlight')
    const big = (r) => r.role === 'bg' || r.role === 'ground'
    const occ = new Map(solid.map((r) => [r, hides(S, r)]))
    // colour through the oil palette: the darks lean warm toward umber (Chardin), the rest is the model's
    const oilCol = (f) => mixA(f.c, umber, warm * K.clamp(0.55 - f.tone) * 1.2)
    const dirs = new Map(solid.map((r) => [r, formDir(K, r, L)]))
    for (const q of S.regions) if (q.role === 'shadow') dirs.set(q, () => 0.04)
    const shadows = S.regions.filter((q) => q.role === 'shadow'), withShadows = S.regions.filter((q) => q.role !== 'highlight')
    for (const q of shadows) occ.set(q, hides(S, q))
    const visible = (r, x, y) => S.regionAt(x, y) === r

    // a stroke path: a short bowed line at the form's angle; round forms get a hoop along their concentric ellipse
    const pathAt = (r, x, y, len, rr) => {
      const b = r.bbox
      if (!big(r) && r.role !== 'glow' && r.form >= 0.45 && r.grain == null && Math.max(b.w, b.h) / Math.max(1, Math.min(b.w, b.h)) <= 2.6) {
        // round forms: strokes wrap round the highlight, along the contours of value, so the form turns away from
        // the light under the brush; at the highlight itself a few short dabs laid every which way
        const hx = b.cx + L[0] * b.w * 0.2, hy = b.cy + L[1] * b.h * 0.2, ax = b.w * 0.62, ay = b.h * 0.62
        const u = (x - hx) / ax, v = (y - hy) / ay, rho = Math.hypot(u, v)
        if (rho > 0.3) {
          const th = Math.atan2(v, u), da = Math.min(0.75, len / 2 / (rho * (ax + ay) / 2)), sk = (rr - 0.5) * 0.5, pts = []
          for (let j = 0; j <= 4; j++) { const t = th - da + (2 * da * j) / 4, rh = rho * (1 + sk * (j / 4 - 0.5) * 0.3); pts.push([hx + Math.cos(t) * rh * ax, hy + Math.sin(t) * rh * ay]) }
          return pts
        }
        const a = rr * Math.PI * 2, dx = Math.cos(a) * len * 0.3, dy = Math.sin(a) * len * 0.3
        return [[x - dx, y - dy], [x, y], [x + dx, y + dy]]
      }
      const a = (r.role === 'glow' ? 0.08 : dirs.get(r)(x, y)) + (rr - 0.5) * 0.3, dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2, bow = (rr - 0.5) * 0.16 * len
      return [[x - dx, y - dy], [x - dy / len * bow * 2, y + dx / len * bow * 2], [x + dx, y + dy]]
    }
    // fill a region with strokes: centres on a jittered grid, each loaded with the colour the light asks for at its ends
    // what a brush picks up at (x, y) for region r: its own colour where it shows; for a cast shadow, the darkened
    // colour of whatever it falls on (a shadow is painted as part of the table, in the table's strokes)
    const sample = (r, x, y) => {
      if (!K.inside(r.pts, x, y)) return null
      if (r.role === 'shadow') { const p = F.pic(x, y); return p.r && p.r.i < r.i ? p : null }
      return visible(r, x, y) ? F.at(r, x, y) : null
    }
    const lay = (r, p) => {
      const out = [], b = r.bbox, rr = K.rng(p.seed), step = p.step
      for (let y = b.y0 + step * 0.3; y < b.y1 + step * 0.5; y += step * 0.86) for (let x = b.x0 - (Math.round(y / step) % 2) * step * 0.5; x < b.x1 + step * 0.5; x += step) {
        const px = x + (rr() - 0.5) * step * 0.9, py = y + (rr() - 0.5) * step * 0.9, r1 = rr(), r2 = rr(), r3 = rr()
        if (px < -20 || py < -20 || px > S.W + 20 || py > S.H + 20 || !K.inside(r.pts, px, py)) continue
        const f = sample(r, px, py)
        if (!f) continue
        if (p.keep && !p.keep(f, px, py, r1)) continue
        const len = p.len * (0.75 + 0.5 * r2), ctrl = pathAt(r, px, py, len, r3), e0 = ctrl[0], e1 = ctrl[ctrl.length - 1]
        const v = 1 + (r1 - 0.5) * (p.vary ?? 0.08), c0 = p.col(sample(r, e0[0], e0[1]) || f, r).map((q) => q * v), c1 = p.col(sample(r, e1[0], e1[1]) || f, r).map((q) => q * v)
        const s = makeStroke(K, ctrl, { w: p.w * (0.85 + 0.3 * r1), c0, c1, imp: p.imp, alpha: p.alpha, jit: p.jit, body: p.body, seed: p.seed * 977 + out.length, L })
        if (s) { s.x = px; s.y = py; out.push(s) }
      }
      return sweepSort(K, out, p.sweep ?? 0.5, 140 * sc, p.seed)
    }
    const put = (r, strokes, clip = true) => batches(D, strokes, { per: 14, clip: clip ? r.pts : null, occ: occ.get(r) || [], cost: (s) => s.len / 100 + 0.05, draw: drawStroke })
    // brush sizes: the big flat for the wall and table, a medium brush sized to each object, a small one for parts
    const size = (r, k) => {
      if (big(r)) return k
      const m = Math.min(r.bbox.w, r.bbox.h)
      return Math.max(3 * sc, Math.min(k, m * (r.role === 'detail' ? 0.34 : 0.2)))
    }

    D.ground(() => { D.sheet(o.priming); D.texture('linen', { opacity: 0.4 }) })

    D.pass('toning rub', 0.6, () => {
      // the imprimatura: a thin burnt-sienna rub scrubbed over the white with a big rag-like brush, alternating
      const r = K.rng(7), n = Math.ceil(S.H / (120 * sc)) + 1, list = []
      for (let i = 0; i < n; i++) {
        const y = (i - 0.2) * (S.H / (n - 2)), back = i % 2 === 1, a = [-160, y + (r() - 0.5) * 60], b = [S.W + 260, y + (r() - 0.5) * 60 - S.W * 0.12]
        const c = mixA(toning, i % 3 ? umber : [190, 120, 80], 0.12 + r() * 0.12)
        const s = makeStroke(K, back ? [b, [S.W / 2, (a[1] + b[1]) / 2 + (r() - 0.5) * 60], a] : [a, [S.W / 2, (a[1] + b[1]) / 2 + (r() - 0.5) * 60], b], { w: 240 * sc, c0: c, c1: mixA(c, toning, 0.5), imp: 0, alpha: 0.85, jit: 0.2, body: 0.95, seed: 11 + i, L })
        if (s) list.push(s)
      }
      batches(D, list, { per: 2, cost: (s) => s.len / 100, draw: drawStroke })
    })

    D.pass('umber drawing', 1, () => {
      // searching lines with a small round brush in thinned umber, then the shadow shapes scrubbed in
      for (const r of solid) {
        if (!r.contour && !big(r)) continue
        if (big(r)) continue
        D.stroke(r.pts, { closed: true, w: 2.4 * sc, color: o.umber, alpha: 0.78, taper: 0.6, pressure: 0.5, rough: 0.35, wobble: 2.2, seed: r.i + 3, cost: 0.5 })
      }
      for (const l of S.lines) if (!K.isLight(l.color)) D.stroke(l.pts, { w: 2 * sc, color: o.umber, alpha: 0.7, taper: 0.7, wobble: 1.5, seed: l.i + 5, cost: 0.5 })
      for (const r of solid) {
        if (big(r) || r.form < 0.3) continue
        const st = lay(r, { step: size(r, 20 * sc), len: size(r, 20 * sc) * 2.2, w: size(r, 16 * sc), imp: 0, alpha: 0.42, jit: 0.25, seed: r.i + 300, keep: (f) => f.tone < 0.4, col: () => umber, sweep: 2.2 })
        put(r, st)
      }
      for (const q of S.regions.filter((q) => q.role === 'shadow')) {
        const st = lay(q, { step: 22 * sc, len: 50 * sc, w: 18 * sc, imp: 0, alpha: 0.38, jit: 0.25, seed: q.i + 330, col: () => umber, sweep: 0 })
        batches(D, st, { per: 14, clip: q.pts, occ: S.occluders(q, { light: false }), cost: (s) => s.len / 100, draw: drawStroke })
      }
    })
    // shadow regions are not painted by themselves: F.at() darkens whatever lies under them

    D.pass('dark masses, lean', 2.2, () => {
      // a big brush and thinned paint: everything laid in its shadow value, the toned ground left between strokes
      for (const r of withShadows) {
        if (r.role === 'shadow') { put(r, lay(r, { step: 34 * sc, len: 90 * sc, w: 40 * sc, imp: 0, alpha: 0.88, jit: 0.18, seed: r.i + 500, vary: 0.1, col: (f) => mixA(f.c, umber, 0.2), sweep: 0, body: 0.7 }), false); continue }
        const bg = big(r), shade = rgbOf(K, r.role === 'glow' ? r.color : r.shade)
        const st = lay(r, {
          step: bg ? 96 * sc : size(r, 40 * sc) * 0.9, len: bg ? 300 * sc : size(r, 40 * sc) * 2.6, w: bg ? 100 * sc : size(r, 40 * sc), imp: 0, alpha: 0.88, jit: 0.18, seed: r.i + 500, vary: 0.12,
          col: (f) => mixA(oilCol(f), shade, bg ? 0.4 : 0.5), sweep: bg ? -0.4 : 2.3, body: 0.7,
        })
        put(r, st)
      }
    })

    D.pass('mid tones', 2.4, () => {
      // a medium brush, the colour the light asks for, every stroke following the form
      for (const r of withShadows) {
        if (r.role === 'shadow') { put(r, lay(r, { step: 22 * sc, len: 70 * sc, w: 30 * sc, imp: 0.2 * IM, alpha: 1, jit: 0.14, seed: r.i + 700, vary: 0.08, col: oilCol, sweep: 0 }), false); continue }
        const bg = big(r)
        const st = lay(r, { step: bg ? 38 * sc : size(r, 30 * sc) * 0.72, len: bg ? 150 * sc : size(r, 30 * sc) * 2.6, w: bg ? 54 * sc : size(r, 30 * sc), imp: 0.25 * IM, alpha: 1, jit: 0.14, vary: bg ? 0.1 : 0.07, seed: r.i + 700, keep: (f, x, y, q) => (bg ? q > 0.12 : true), col: oilCol, sweep: bg ? -0.6 : 2.2 })
        put(r, st)
      }
    })

    D.pass('lights, fat', 1.8, () => {
      // a smaller brush and paint straight from the tube where the light falls
      for (const r of solid) {
        const bg = big(r), lit = rgbOf(K, r.lit)
        const st = lay(r, { step: bg ? 34 * sc : size(r, 20 * sc) * 0.8, len: bg ? 100 * sc : size(r, 20 * sc) * 2.4, w: bg ? 38 * sc : size(r, 20 * sc), imp: 0.55 * IM, alpha: 1, jit: 0.1, seed: r.i + 900, keep: (f, x, y, q) => f.tone > (bg ? 0.7 : 0.64) && (bg ? q < 0.55 || f.hl : true), col: (f) => mixA(oilCol(f), lit, 0.18), sweep: Math.atan2(-L[1], -L[0]) })
        put(r, st)
      }
    })

    D.pass('impasto highlights', 1, () => {
      // short thick dabs standing off the canvas: the highlight on every round thing, the light source, light lines
      for (const r of solid) {
        if (big(r)) continue
        const b = r.bbox, m = Math.min(b.w, b.h), list = [], rr = K.rng(r.i + 1100)
        if (r.role === 'glow') {
          const st = lay(r, { step: 26 * sc, len: 60 * sc, w: 22 * sc, imp: 0.8 * IM, alpha: 1, jit: 0.08, seed: r.i + 1150, keep: (f, x, y, q) => q < 0.6, col: (f) => mixA(f.c, LIFT, 0.25) })
          put(r, st); continue
        }
        if (r.form < 0.6 || m < 24 * sc) continue
        const hx = b.cx + L[0] * b.w * 0.26, hy = b.cy + L[1] * b.h * 0.27, hi = mixA(rgbOf(K, r.lit), LIFT, 0.55)
        const n = 3 + Math.round(m / (60 * sc))
        for (let k = 0; k < n; k++) {
          const x = hx + (rr() - 0.5) * m * 0.16, y = hy + (rr() - 0.5) * m * 0.12
          if (!K.inside(r.pts, x, y) || !visible(r, x, y)) continue
          const ctrl = pathAt(r, x, y, m * (0.1 + rr() * 0.08), rr())
          const s = makeStroke(K, ctrl, { w: Math.max(4 * sc, m * 0.05), c0: k ? mixA(hi, rgbOf(K, r.lit), rr() * 0.4) : hi, imp: 0.95 * IM, alpha: 1, jit: 0.06, body: 0.85, seed: r.i * 31 + k, L })
          if (s) list.push(s)
        }
        put(r, list)
      }
      // light falling on the wall / table: a few fat strokes in the lit colour, laid along the patch
      for (const h of S.regions.filter((q) => q.role === 'highlight')) {
        const under = (x, y) => { const p = F.pic(x, y); return p }
        const rr = K.rng(h.i + 1200), list = []
        for (const [x, y] of K.gridIn(h.pts, 34 * sc, 0.8, h.i + 3)) {
          if (rr() < 0.45) continue
          const p = under(x, y); if (!p.r || !big(p.r)) continue
          const a = -1.05 + (rr() - 0.5) * 0.4, len = 70 * sc
          const s = makeStroke(K, [[x - Math.cos(a) * len / 2, y - Math.sin(a) * len / 2], [x + Math.cos(a) * len / 2, y + Math.sin(a) * len / 2]], { w: 26 * sc, c0: mixA(p.c, rgbOf(K, h.color), 0.22), c1: p.c, imp: 0.5 * IM, alpha: 1, jit: 0.08, seed: h.i * 17 + list.length, L })
          if (s) list.push(s)
        }
        batches(D, list, { per: 10, occ: S.regions.filter((q) => q.i > h.i && q.role !== 'shadow' && q.role !== 'highlight').map((q) => q.pts), cost: (s) => s.len / 100, draw: drawStroke })
      }
      // light lines (steam, a white window bar) are fat light paint pulled along them; steam boils once alive
      for (const l of S.lines) {
        if (!K.isLight(l.color)) continue
        const pts = D.frame ? K.wobble(l.pts, 1.2, l.i * 7 + D.frame * 7) : l.pts, mid = pts[Math.floor(pts.length / 2)]
        const back = F.pic(mid[0], mid[1]).c, c = mixA(rgbOf(K, l.color), back, 0.12)
        const s = makeStroke(K, pts, { w: Math.max(6 * sc, l.w * 1.3), c0: c, c1: mixA(c, back, 0.25), imp: 0.7 * IM, alpha: 1, jit: 0.07, body: 0.9, seed: l.i * 13, L })
        if (s) batches(D, [s], { per: 1, occ: S.regions.filter((q) => q.i > l.i && q.role !== 'shadow' && q.role !== 'highlight').map((q) => q.pts), cost: (x) => x.len / 100, draw: drawStroke })
      }
    })

    D.pass('dark accents & lost edges', 1, () => {
      // the shadow side of each round thing dragged out into what is behind it, so no line is left to find
      for (const r of solid) {
        if (big(r) || r.form < 0.5 || r.role === 'glow' || Math.min(r.bbox.w, r.bbox.h) < 40 * sc) continue
        const nn = K.outward(r.pts), rr = K.rng(r.i + 1300), list = [], gap = Math.max(1, Math.round(r.pts.length / 24))
        for (let i = 0; i < r.pts.length; i += gap) {
          const n = nn[i], f = K.facing(n, L)
          if (f > -0.35 || rr() < 0.25) continue
          const [x, y] = r.pts[i], a = [x - n[0] * 10 * sc, y - n[1] * 10 * sc], b = [x + n[0] * 16 * sc + (rr() - 0.5) * 8, y + n[1] * 16 * sc]
          if (!visible(r, a[0], a[1])) continue
          const back = F.pic(b[0], b[1]); if (back.r === r) continue
          const s = makeStroke(K, [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b], { w: 10 * sc, c0: oilCol(F.at(r, a[0], a[1])), c1: mixA(back.c, umber, 0.15), imp: 0.15, alpha: 0.85, jit: 0.1, body: 0.6, seed: r.i * 53 + i, L })
          if (s) list.push(s)
        }
        batches(D, list, { per: 12, occ: occ.get(r), cost: (s) => s.len / 100, draw: drawStroke })
      }
      // the small dark parts restated with a small brush, then contact darks where a round thing meets what holds it
      for (const r of solid) {
        if (r.role !== 'detail' || r.role === 'glow') continue
        const st = lay(r, { step: size(r, 8 * sc) * 0.9, len: size(r, 8 * sc) * 2.4, w: size(r, 8 * sc), imp: 0.35 * IM, alpha: 1, jit: 0.12, seed: r.i + 1400, keep: (f, x, y, q) => f.tone < 0.6 || q < 0.3, col: (f) => mixA(oilCol(f), rgbOf(K, r.shade), 0.3) })
        put(r, st)
      }
      for (const r of solid) {
        if (big(r) || r.role === 'detail' || r.role === 'glow' || r.form < 0.5) continue
        const b = r.bbox, run = r.pts.filter(([x, y]) => y > b.y1 - b.h * 0.06 && Math.abs(x - b.cx) < b.w * 0.36)
        if (run.length < 3) continue
        run.sort((p, q) => p[0] - q[0])
        const under = F.pic(b.cx, b.y1 + 6 * sc), c = mixA(under.c, SINK, 0.55)
        const s = makeStroke(K, K.translate(run, 0, 3 * sc), { w: 8 * sc, c0: c, imp: 0.1, alpha: 0.8, jit: 0.1, body: 0.85, seed: r.i * 71, L })
        if (s) batches(D, [s], { per: 1, occ: occ.get(r).concat([r.pts]), cost: (x) => x.len / 100, draw: drawStroke })
      }
      // dark lines (a crack, a table edge, a midrib): one pull of a small round brush
      for (const l of S.lines) {
        if (K.isLight(l.color)) continue
        const mid = l.pts[Math.floor(l.pts.length / 2)], c = mixA(rgbOf(K, l.color), umber, 0.25)
        const s = makeStroke(K, l.pts, { w: Math.max(2.6 * sc, l.w * 1.1), c0: c, c1: mixA(c, F.pic(mid[0], mid[1]).c, 0.2), imp: 0.2, alpha: 0.95, jit: 0.1, body: 0.92, seed: l.i * 19, L })
        if (s) batches(D, [s], { per: 1, occ: S.regions.filter((q) => q.i > l.i && q.role !== 'shadow' && q.role !== 'highlight').map((q) => q.pts), cost: (x) => x.len / 100, draw: drawStroke })
      }
    })

    D.top(() => { D.texture('linen', { opacity: o.weave ?? 0.32 }) })
  },
}

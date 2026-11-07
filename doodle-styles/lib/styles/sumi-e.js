// Sumi-e (水墨) — studied from anidoodle's sumiE plate (sumiE.ts · sumiEKit.ts · styles/sumiE.md). Re-implemented for the
// scene model. One soft goat-and-wolf-hair brush, loaded from an inkstone, on unsized xuan paper that drinks ink the moment
// it touches. Nothing is outlined and nothing is corrected: every thing is made of one or a few brush gestures.
//   THE MARK — a brush of real hairs: each hair carries its own ink and spends it with travel (edge hairs first), so a
//   stroke starts wet and solid and ends in "flying white" (飛白): bare-paper streaks running WITH the stroke, split hairs
//   at the lift. The brush is a cone: outer hairs touch down later and lift sooner, so ends are pointed or round.
//   THE EDGE — soft and feathered where wet (ink bleeds into the fibres at the touch-down and the lift), broken where dry.
//   TONE — only by dilution, the five inks (墨分五色): scorched, thick, heavy, light, clear. A colour becomes a dilution
//   (its darkness); far things are paler. A stroke never stacks with itself; ink darkens only where strokes of two
//   different things cross.
//   LIGHT — carried by leaving paper: masses are laid from the shade side toward the light, the brush running dry as it
//   goes, so the lit side breaks into flying white. White things get a few light-ink "bone" strokes on their shade side.
//   Steam and mist are reserved paper with a pale wash around them (烘雲托月). Lots of empty paper.
//   ORDER — the near thing first and the things behind stopping at it; then ground and distance; then the dark accents in
//   scorched ink (stems, knobs, nodes); dry accents (moss dots); a breath of colour if any; the cinnabar seal last.
//
// defaults (all overridable by a house style):
//   paper   unbleached xuan                  ink / cool   the ink stick and the cool grey it thins to
//   seal    cinnabar paste colour, or null for no seal
//   accent  'auto' (one faint wash in the hero's own hue), a colour, or null for ink only
//   empty   0..1 how much of the ground/background is left as bare paper
//   dry     how fast the brush runs dry (1 = normal)
import { solidOf, unit } from './_ink.js'

const JIAO = 1, NONG = 0.82, ZHONG = 0.6, DAN = 0.38, QING = 0.2 // the five inks

export default {
  id: 'sumi-e', name: 'Sumi-e ink painting', ko: '수묵화',
  medium: 'one soft brush of sumi ink at five dilutions on unsized absorbent xuan paper, a cinnabar seal',
  mark: 'one gesture per form: a brush of hairs that goes from wet and solid to dry-brush flying white; no outline',
  edge: 'feathered bleed where the brush is wet or slow, broken bristle where it runs dry',
  order: ['the near forms, front to back', 'ground and distance', 'dark accents', 'dry accents', 'the seal'],
  paper: 'warm unbleached xuan with long fibres and bark flecks',
  palette: 'one ink stick, five dilutions (scorched, thick, heavy, light, clear); at most one faint colour; a cinnabar seal',
  bestFor: '여백이 있는 그림 · 정물, 식물, 새, 산수 · 동양적이고 고요한 분위기',
  source: 'anidoodle sumiE.ts · sumiEKit.ts · styles/sumiE.md',
  defaults: { paper: '#f3ede0', ink: '#0f0d0c', cool: '#39414a', seal: '#b8352b', accent: 'auto', empty: 0.45, dry: 1 },
  draw(D, S, K, o) {
    const L = S.light, u = unit(S), paper = o.paper
    const tone = (v) => { v = K.clamp(v, 0.04, 1); const c = K.mix(o.ink, o.cool, (1 - v) * 0.85), a = 0.08 + 0.92 * Math.pow(v, 0.95); return K.mix('#ffffff', c, a) }
    const dilution = (r) => {
      const v = 1.08 - 1.12 * K.lum(r.color) + (r.role === 'detail' ? 0.22 : 0)
      return K.clamp(v * (1 - 0.45 * K.clamp(r.depth - 0.4) / 0.6), QING * 0.6, JIAO)
    }
    const solid = solidOf(S), big = (r) => r.role === 'bg' || r.role === 'ground'
    const isWhite = (r) => K.lum(r.color) > 0.72

    // ------------------------------------------------------------ the brush (a hair model)
    const press0 = (t) => (0.38 + 0.62 * K.smoothstep(0, 0.16, t)) * (1 - 0.5 * K.smoothstep(0.72, 1, t)) * (0.9 + 0.2 * Math.sin(Math.PI * t))
    const stroke = (ctrl, b) => {
      const c0 = ctrl.length > 2 ? K.smooth(ctrl, false, 6) : ctrl
      const len0 = K.length(c0)
      if (len0 < 3) return null
      const n = Math.max(6, Math.round(len0 / 2.6)), pts = K.resample(c0, n), nr = K.normals(pts, false)
      const r = K.rng(b.seed * 7 + 3), nh = b.hairs || Math.max(9, Math.min(42, Math.round(b.w * 0.8))), streak = b.streak ? 0.75 : 0.28
      const hairs = Array.from({ length: nh }, (_, i) => { const hu = -1 + (2 * (i + 0.5)) / nh + (r() - 0.5) * (1.6 / nh); return { u: hu, load: (b.load ?? 1) * (1 + (b.edge ?? 0) * (hu * hu - 0.33)) * (1 - streak / 2 + streak * r()) } })
      return { pts, nr, len: len0, n, hairs, press: b.press || press0, w: b.w, v: b.v, dry: ((b.dry ?? 0.25) * o.dry) / 100, split: b.split ?? 0.5, seed: b.seed, bleed: b.bleed ?? 0.6, load: b.load ?? 1, slow: b.slow || [[0.03, 0.9], [0.97, 0.6]] }
    }
    // the hairs, up to `travel` of the stroke
    const hairsOf = (ctx, st, travel) => {
      const { pts, nr, n, len, hairs, w, dry, split, seed } = st, last = Math.max(1, Math.min(n - 1, Math.round((n - 1) * travel)))
      const tipLen = Math.min(len * 0.22, w * 0.5), hw = Math.max(0.5, (w / hairs.length) * 2.2)
      ctx.strokeStyle = tone(st.v); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      hairs.forEach((h, hi) => {
        const au = Math.abs(h.u), tipIn = tipLen * Math.pow(au, 1.6) * (0.8 + 0.4 * h.load), tipOut = tipLen * 0.7 * Math.pow(au, 1.6), sd = seed * 13 + hi
        let open = false, q = 1
        ctx.beginPath()
        for (let i = 0; i <= last; i++) {
          const s = (i / (n - 1)) * len
          q = K.clamp((h.load - dry * s * (1 + 0.7 * au)) * 2.1)
          if (s < tipIn || s > len - tipOut || q * 1.3 <= K.noise(sd, s * 0.045, hi * 0.83) + 0.06) { open = false; continue }
          const W = w * st.press(i / (n - 1)), spl = (K.noise(sd + 4, s * 0.02, hi * 0.5) - 0.5) * split * (1 - q) * w * 0.7
          const off = h.u * (W / 2) * (1 + 0.12 * (1 - q)) + spl, x = pts[i][0] + nr[i][0] * off, y = pts[i][1] + nr[i][1] * off
          if (open) ctx.lineTo(x, y); else { ctx.moveTo(x, y); open = true }
        }
        ctx.lineWidth = hw * (0.8 + 0.2 * q); ctx.stroke()
      })
      // feathers: ink wicking out along single fibres at the slow points the brush has passed
      if (st.bleed > 0.2) {
        const rr = K.rng(seed * 31 + 1); ctx.lineWidth = 0.55
        for (const [t, s] of st.slow) {
          const i = Math.round(t * (n - 1)); if (i > last) continue
          const [x, y] = pts[i], r0 = w * st.press(t) * (0.42 + 0.3 * s)
          ctx.beginPath()
          for (let q = 0; q < Math.round((8 + 12 * s) * st.bleed); q++) { const th = rr() * Math.PI * 2, d0 = r0 * (0.8 + rr() * 0.3), d1 = d0 + (2 + rr() * 7 * s) * u; ctx.moveTo(x + Math.cos(th) * d0, y + Math.sin(th) * d0); ctx.lineTo(x + Math.cos(th + 0.1) * d1, y + Math.sin(th + 0.1) * d1) }
          ctx.globalAlpha = 0.45; ctx.stroke(); ctx.globalAlpha = 1
        }
      }
    }
    // the bleed: a halo a little wider than the wet part of the stroke, and soaked blots at the slow points (softened layer)
    const bleedOf = (ctx, st, travel) => {
      const { pts, nr, n, len, w, dry } = st, last = Math.max(1, Math.min(n - 1, Math.round((n - 1) * travel)))
      ctx.fillStyle = tone(st.v)
      const Lp = [], Rp = []
      for (let i = 0; i <= last; i++) {
        const s = (i / (n - 1)) * len, wet = K.clamp(st.load - dry * s * 1.2), h = (w * st.press(i / (n - 1)) / 2) * (0.85 + 0.3 * wet) + 2 * u * wet * st.bleed
        Lp.push([pts[i][0] + nr[i][0] * h, pts[i][1] + nr[i][1] * h]); Rp.push([pts[i][0] - nr[i][0] * h, pts[i][1] - nr[i][1] * h])
      }
      ctx.globalAlpha = Math.min(1, 0.32 * st.bleed); K.path(ctx, [...Lp, ...Rp.reverse()]); ctx.fill()
      st.slow.forEach(([t, s], j) => {
        const i = Math.round(t * (n - 1)); if (i > last) return
        const [x, y] = pts[i], r0 = Math.min(w * st.press(t) * (0.36 + 0.2 * s), 26 * u) + 2.5 * s
        ctx.globalAlpha = Math.min(1, 0.55 * s * st.bleed)
        K.path(ctx, K.blob(x, y, r0, { n: 18, wob: 0.3, seed: st.seed * 5 + j })); ctx.fill()
      })
      ctx.globalAlpha = 1
    }
    const cost = (st) => (st.len / 100) * 0.8 + 0.15
    // one thing's strokes: hairs (crisp, one tone each, never stacking inside the thing), then the bleed soaking out
    const paint = (list, cut, { wet = 0, mask } = {}) => {
      list = list.filter(Boolean)
      if (!list.length) return
      if (wet) list = list.map((st) => ({ ...st, bleed: 1.6, load: 1, slow: [] }))
      if (!wet) D.layer({ blend: 'multiply', cut, mask }, () => list.forEach((st) => D.mark(cost(st), (ctx, k) => { ctx.save(); ctx.globalCompositeOperation = 'darken'; hairsOf(ctx, st, k); ctx.restore() })))
      D.layer({ blend: 'multiply', soften: (2.2 + 5 * wet) * u, alpha: wet ? 0.85 : 0.5, cut }, () => list.forEach((st) => D.mark(wet ? cost(st) : 0.08, (ctx, k) => { ctx.save(); ctx.globalCompositeOperation = 'darken'; bleedOf(ctx, st, k); ctx.restore() })))
    }

    // ------------------------------------------------------------ how a thing becomes strokes
    const thickness = (r) => (2 * r.area) / (K.length(r.pts, true) || 1)
    // a mass laid with the side of the brush: strokes across the light, from the shade side toward it, running dry
    const massStrokes = (pts, r, v, { W, angle, seed, load = 1, dry = 0.25, cover = 1, ragged = 0, bow = 0.06 }) => {
      const b = K.bbox(pts)
      const rows = K.hatchLines(pts, angle, W * 0.55, { seed, jitter: W * 0.12 })
        .map(([a, e]) => ({ a, e, d: ((a[0] + e[0]) / 2 - b.cx) * L[0] + ((a[1] + e[1]) / 2 - b.cy) * L[1] }))
        .sort((p, q) => p.d - q.d)
      const rr = K.rng(seed * 3 + 1), out = []
      const span = Math.max(1, rows.length - 1)
      rows.forEach((row, j) => {
        if (cover < 1 && rr() > cover) return
        let { a, e } = row
        const len = K.dist(a, e); if (len < W * 0.3) return
        const ex = ((e[0] - a[0]) / len) * W * 0.12, ey = ((e[1] - a[1]) / len) * W * 0.12
        a = [a[0] - ex, a[1] - ey]; e = [e[0] + ex, e[1] + ey]
        if (ragged) { const t0 = rr() * ragged, t1 = 1 - rr() * ragged; const a2 = K.lerpP(a, e, t0), e2 = K.lerpP(a, e, t1); a = a2; e = e2 }
        if (rr() < 0.5) [a, e] = [e, a] // the brush goes both ways
        const f = j / span // 0 shade side … 1 lit side
        const nx = -(e[1] - a[1]), ny = e[0] - a[0], toShade = nx * L[0] + ny * L[1] < 0 ? 1 : -1
        out.push(stroke(K.segment(a, e, len * bow * toShade * (0.7 + 0.6 * rr()), 10), { w: W * (0.9 + 0.2 * rr()), v: K.clamp(v + 0.12 - 0.24 * f), load: load * (1.05 - 0.5 * f) * (0.9 + 0.2 * rr()), dry, seed: seed * 17 + j, split: 0.6, bleed: 0.7 - 0.4 * f }))
      })
      return out
    }
    // a thin thing (a handle, a stem, a sepal): one stroke down its middle, there and back if it is a loop
    const thinStrokes = (r, v, seed) => {
      const T = thickness(r), inner = K.offset(K.densify(r.pts, 6, true), -T * 0.42)
      const path = [...inner, inner[0]]
      return [stroke(path, { w: T * 1.15, v, load: 1.1, dry: 0.12, seed, split: 0.3, bleed: 0.5, press: (t) => 0.8 + 0.2 * Math.sin(Math.PI * t), slow: [[0.02, 0.8], [0.5, 0.4], [0.98, 0.5]] })]
    }
    // a white thing: a few light-ink "bone" strokes on its shade side, the lit side left to the paper
    const boneStrokes = (r, v, seed) => {
      const runs = K.runs(K.densify(r.pts, 6, true), (i, n) => K.facing(n, L) < 0.25)
      const m = Math.min(r.bbox.w, r.bbox.h)
      // a long run is several gestures: the brush lifts and reloads every couple of hundred px
      const chunks = []
      for (const run of runs) {
        const n = Math.max(1, Math.round(K.length(run) / (230 * u))), per = Math.ceil(run.length / n)
        for (let c = 0; c < n; c++) chunks.push(run.slice(Math.max(0, c * per - 1), Math.min(run.length, (c + 1) * per + 1)))
      }
      return chunks.filter((run) => run.length > 1 && K.length(run) > 14 * u).map((run, j) => stroke(run, { w: K.clamp(m * 0.05, 4 * u, 13 * u), v, load: 0.9, dry: 0.22, seed: seed * 7 + j, split: 0.7, bleed: 0.45, hairs: 12 }))
    }
    const thingStrokes = (r, v) => {
      const b = r.bbox, T = thickness(r), m = Math.min(b.w, b.h)
      if (isWhite(r)) return boneStrokes(r, K.clamp(v + 0.45, ZHONG, NONG), r.i + 1)
      if (T < 0.24 * Math.max(b.w, b.h) && T < 60 * u) return thinStrokes(r, v, r.i + 1)
      const angle = r.grain ?? (b.w > b.h * 1.4 ? 0 : b.h > b.w * 1.4 ? Math.PI / 2 : Math.atan2(L[1], L[0]) + Math.PI / 2)
      return massStrokes(r.pts, r, v, { W: K.clamp(m * 0.56, 9 * u, 150 * u), angle, seed: r.i + 1, dry: 0.1, bow: 0.06 + 0.12 * r.form })
    }

    D.ground(() => {
      D.sheet(paper)
      // the sheet: long vat fibres and flecks of bark
      const rr = K.rng(S.seed * 7 + 3), fib = [], dots = []
      for (let i = 0; i < Math.round((S.W * S.H) / 5000); i++) {
        const x = rr() * S.W, y = rr() * S.H, a = rr() * Math.PI * 2, l = (8 + rr() * 30) * u
        fib.push([[x, y], [x + Math.cos(a) * l * 0.5 + (rr() - 0.5) * 4, y + Math.sin(a) * l * 0.5 + (rr() - 0.5) * 4], [x + Math.cos(a) * l, y + Math.sin(a) * l]])
      }
      for (let i = 0; i < Math.round((S.W * S.H) / 22000); i++) dots.push([rr() * S.W, rr() * S.H, (0.4 + rr() * 1.2) * u])
      D.mark(0.001, (ctx) => { ctx.save(); ctx.strokeStyle = '#b9ab92'; ctx.globalAlpha = 0.22; ctx.lineWidth = 0.6; ctx.beginPath(); for (const f of fib) { ctx.moveTo(...f[0]); ctx.quadraticCurveTo(...f[1], ...f[2]) } ctx.stroke(); ctx.restore() })
      D.dots(dots, '#8d7c62', { alpha: 0.35 })
    })

    // ------------------------------------------------------------ 1. the near forms, front to back
    const things = solid.filter((r) => !big(r) && r.role !== 'detail').sort((a, b) => b.i - a.i)
    D.pass('the near forms, front to back', 3, () => {
      // the same colour need not be the same ink: each thing is its own loading of the brush (墨分五色)
      for (const r of things) {
        const mass = !isWhite(r) && thickness(r) >= 0.24 * Math.max(r.bbox.w, r.bbox.h)
        const edge = mass ? K.displace(K.offset(K.densify(r.pts, 8, true), 3 * u), 9 * u, 0.04, r.i + 5) : undefined
        paint(thingStrokes(r, K.clamp(dilution(r) + (K.rng(r.i * 5 + S.seed)() - 0.5) * 0.4, QING, JIAO)), S.occluders(r, { light: false }), { mask: edge })
      }
    })

    // ------------------------------------------------------------ 2. ground and distance: broad side-brush strokes, mist, cast shadows
    D.pass('ground and distance', 1.6, () => {
      for (const r of S.regions.filter(big).sort((a, b) => a.i - b.i)) {
        const v = dilution(r) * (r.role === 'bg' ? 0.5 : 0.85)
        if (v < 0.16) continue // a pale wall stays paper
        const b = r.bbox, cut = [...S.occluders(r), ...S.regions.filter((q) => q.role === 'glow').map((q) => q.pts)]
        const cover = K.clamp((v - 0.1) * 2) * (1 - o.empty * 0.5)
        const W = K.clamp(Math.min(b.w, b.h) * 0.16, 30 * u, 90 * u)
        const list = massStrokes(r.pts, r, v, { W, angle: r.grain ?? 0, seed: r.i + 51, dry: r.role === 'bg' ? 0.1 : 0.16, cover, ragged: 0.35 * o.empty + 0.1, bow: 0.01 })
        paint(list, cut, { wet: r.role === 'bg' ? 1 : 0 })
      }
      // a light source is paper; a pale wet mist is laid round it so the paper glows (烘托)
      for (const g of S.regions.filter((q) => q.role === 'glow')) {
        const gb = g.bbox, ring = K.rect(gb.x0 - gb.w * 0.18, gb.y0 - gb.h * 0.1, gb.w * 1.36, gb.h * 1.2)
        paint(massStrokes(ring, g, QING * 0.9, { W: K.clamp(gb.h * 0.3, 30 * u, 120 * u), angle: 0, seed: g.i + 61, dry: 0.05, ragged: 0.3, bow: 0.02 }), [g.pts, ...S.occluders(g)], { wet: 1 })
      }
      // cast shadows: one wet stroke of clear ink laid into damp paper
      for (const r of S.regions.filter((q) => q.role === 'shadow')) {
        const b = r.bbox, v = QING * 0.8 + 0.3 * r.strength
        paint(massStrokes(r.pts, r, v, { W: K.clamp(b.h * 0.7, 12 * u, 60 * u), angle: Math.abs(b.w) > b.h ? 0 : Math.PI / 2, seed: r.i + 71, dry: 0.08, bow: 0.02 }), S.occluders(r, { light: false }), { wet: 1 })
      }
    })

    // ------------------------------------------------------------ 3. dark accents in scorched ink, and the reserved light
    D.pass('dark accents', 1.4, () => {
      for (const r of solid.filter((q) => q.role === 'detail')) paint(thingStrokes(r, Math.max(NONG, dilution(r))), S.occluders(r, { light: false }))
      for (const l of S.lines) {
        const cut = S.occluders(l, { light: false })
        if (l.role === 'steam') {
          // 烘雲托月: the steam is paper; a pale wash is laid round it so the paper reads as white
          D.layer({ blend: 'multiply', soften: 6 * u, cut }, () => {
            const st = stroke(l.pts, { w: Math.max(34, l.w * 6) * u, v: QING * 1.1, load: 1, dry: 0.02, seed: l.i * 3 + 1, hairs: 14, split: 0.2, bleed: 1 })
            if (st) D.mark(cost(st), (ctx, k) => bleedOf(ctx, st, k))
            D.stroke(l.pts, { w: Math.max(6, l.w * 1.6) * u, color: '#000', blend: 'destination-out', taper: 0.5, wobble: 2, seed: l.i, smooth: true, cost: 0.2 })
          })
        } else if (K.isLight(l.color)) paint([stroke(l.pts, { w: Math.max(3, l.w * 0.45) * u, v: DAN * 0.8, load: 0.8, dry: 0.4, seed: l.i * 5 + 2, hairs: 10, split: 0.8, bleed: 0.3 })], cut)
        else paint([stroke(l.pts, { w: Math.max(3 * u, l.w * 1.5 * u), v: K.clamp(1.05 - K.lum(l.color)) * (l.w < 3 ? 1 : 0.8), load: 1, dry: 0.12, seed: l.i * 5 + 3, hairs: 12, split: 0.4, bleed: 0.55 })], cut)
      }
    })

    // ------------------------------------------------------------ 4. dry accents: moss dots where things meet the ground
    D.pass('dry accents', 0.5, () => {
      const rr = K.rng(S.seed * 13 + 5), dots = []
      for (const r of things.filter((q) => q.area > S.W * S.H * 0.004 && !isWhite(q))) {
        const b = r.bbox
        for (let i = 0; i < 4; i++) {
          const x = b.x0 + b.w * (0.1 + rr() * 0.8), y = b.y1 + (rr() * 0.12 - 0.02) * b.h
          if (S.regionAt(x, y) === r) continue
          const s = (1.8 + rr() * 3.5) * u; dots.push([x, y, s])
          if (rr() < 0.5) dots.push([x + (rr() - 0.5) * 14 * u, y + (rr() - 0.5) * 6 * u, s * 0.5])
        }
      }
      D.layer({ blend: 'multiply' }, () => D.dots(dots, tone(JIAO), { alpha: 0.9 }))
      // a breath of colour: one faint wash in the hero's own hue, laid after the ink
      const hero = o.accent === 'auto' ? things.filter((r) => !isWhite(r)).sort((a, b) => K.toHsl(b.color)[1] * Math.sqrt(b.area) - K.toHsl(a.color)[1] * Math.sqrt(a.area))[0] : null
      const acc = o.accent === 'auto' ? hero && K.toHsl(hero.color)[1] > 0.35 && hero.color : o.accent
      if (acc) {
        const h0 = K.toHsl(acc)[0], near = (c) => { const d = Math.abs(K.toHsl(c)[0] - h0); return Math.min(d, 360 - d) < 16 && K.toHsl(c)[1] > 0.25 }
        for (const r of solid.filter((q) => !big(q) && near(q.color))) {
          const b = r.bbox
          // the colour sits where the ink ran dry: on the lit side, in the flying white
          const m = Math.min(b.w, b.h), c = K.litPoint(r, L, 0.22)
          D.layer({ blend: 'multiply', soften: 8 * u, alpha: 0.38, mask: r.pts, cut: S.occluders(r, { light: false }) }, () => D.wash(K.blob(c[0], c[1], m * 0.42, { sx: b.w / m, sy: b.h / m, seed: r.i, wob: 0.2 }), K.mix(acc, paper, 0.15), { alpha: 0.8, shrink: 1, edge: 14, dx: 0, dy: 0, rim: false, seed: r.i, from: c }))
        }
      }
    })

    // ------------------------------------------------------------ 5. the seal: a baiwen cinnabar seal stamped in the emptiest corner
    if (o.seal) D.pass('the seal', 0.3, () => {
      const s = Math.round(Math.min(S.W, S.H) * 0.06), m = Math.min(S.W, S.H) * 0.06
      const spots = [[S.W - m - s, S.H - m - s * 1.4], [m, S.H - m - s * 1.4], [S.W - m - s, m + s * 0.4], [m, m + s * 0.4]]
      // how much ink lies under a spot: a thing is all ink; a wall or a table only as much as its strokes cover
      const inkAt = (rg) => (!rg ? 0 : !big(rg) ? 1 : K.clamp((dilution(rg) * (rg.role === 'bg' ? 0.5 : 0.85) - 0.1) * 2) * (1 - o.empty * 0.5))
      const ink = ([x, y]) => { let t = 0; for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) t += inkAt(S.regionAt(x + (s * i) / 2, y + (s * j) / 2)); return t }
      const [x, y] = spots.reduce((a, b) => (ink(b) < ink(a) - 0.5 ? b : a))
      const rr = K.rng(S.seed * 3 + 11), glyph = []
      // an invented seal-script mark (not text): two columns of cut lines
      for (let c = 0; c < 2; c++) for (let k = 0; k < 4; k++) {
        const gx = x + s * (0.18 + c * 0.42), gy = y + s * (0.16 + k * 0.2), wv = s * 0.26
        if (rr() < 0.6) glyph.push([[gx, gy], [gx + wv, gy]])
        if (rr() < 0.5) glyph.push([[gx + wv * rr(), gy], [gx + wv * rr(), gy + s * 0.18]])
      }
      const box = K.displace(K.densify(K.rect(x, y, s, s), 6, true), 2.2 * u, 0.08, 9)
      D.layer({ blend: 'multiply', tooth: 'speck', toothScale: 0.8 }, () => {
        D.fill(box, o.seal, { grow: 'cut', alpha: 0.92 })
        for (const g of glyph) D.line(g, { w: s * 0.06, color: '#000', blend: 'destination-out', cap: 'square', cost: 0.01 })
      })
    })

    D.top(() => { D.texture('kozo', { opacity: 0.35 }); D.texture('paper', { opacity: 0.1 }); D.texture('coldpress', { opacity: 0.045 }) })
  },
}

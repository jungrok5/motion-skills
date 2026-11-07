// Broken colour — studied from anidoodle's brokenColour plate (a harbour at sunrise painted in dabs) and its kit.
// Oil straight from the tube on lead-white primed linen, one sitting: a flat hog brush loaded and put down ONCE, so
// each mark is a separate opaque dab that lands blunt, pushes a ridge of paint up one side, leaves a groove on the
// other and drags thin where it lifts. Colours are not mixed into the colour of the thing: unmixed colours sit side by
// side for the eye to mix, form is made by TEMPERATURE (warm light, cool violet-blue shadow) more than by value, and
// complementary accents are dropped in by rule (orange and rose into blue shadow, violet and lilac into gold light).
// No outlines anywhere: a form ends where its dabs stop; edges are found only on the sunlit rims.
// Re-implemented for the scene model: the colour field is the scene's picture (field() in _paint.js) pushed high-key
// and split warm/cool; dabs are visited along a drifting order field so the painting advances in an irregular front.
//
// defaults (all overridable):
//   linen      the lead-white priming              imprimatura  the thin warm rub scrubbed over it
//   placement  thinned ultramarine for the lay-in drawing          dark   the darkest dark (ultramarine + rose; no black)
//   warm       the colour light leans toward       cool          the colour shadow leans toward
//   accentsWarm / accentsCool   the complementary accents          key   0..1 how high-key (toward white) the picture is
//   dab        1 = the plate's dab size            weave         the linen's weave over the finished paint
import { field, batches, formDir, rgbOf, css, mixA, hslA, fromHslA, memo, sceneKey } from './_paint.js'

const flat = (t) => (t < 0.1 ? 0.78 + 2.2 * t : t > 0.6 ? 1 - 0.62 * Math.pow((t - 0.6) / 0.4, 1.5) : 1) // blunt landing, dragged lift
const liner = (t) => Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t * 0.92 + 0.04))), 0.6)

/** one dab (or a rigger pull, or a scrubbed lay-in stroke): a quadratic path a → b bowed by `bend` */
function ribbon(ctx, m, prog, prof, w, off, n, jit, seed) {
  const dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1], Lx = Math.hypot(dx, dy) || 1, nx0 = -dy / Lx, ny0 = dx / Lx
  const P = (t) => { const s = 4 * t * (1 - t) * m.bend; return [m.a[0] + dx * t + nx0 * s, m.a[1] + dy * t + ny0 * s] }
  let h = seed * 2654435761 >>> 0
  const rnd = () => { h = (h ^ (h << 13)) >>> 0; h = (h ^ (h >>> 17)) >>> 0; h = (h ^ (h << 5)) >>> 0; return h / 4294967296 }
  const Lp = [], Rp = []
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * prog, p = P(t), q = P(Math.min(1, t + 0.02)), o = P(Math.max(0, t - 0.02)), ex = q[0] - o[0], ey = q[1] - o[1], l = Math.hypot(ex, ey) || 1, nx = -ey / l, ny = ex / l
    const hw = (w / 2) * prof(t), j1 = 1 + (rnd() - 0.5) * jit, j2 = 1 + (rnd() - 0.5) * jit, cx = p[0] + nx * off, cy = p[1] + ny * off
    Lp.push(cx + nx * hw * j1, cy + ny * hw * j1); Rp.push(cx - nx * hw * j2, cy - ny * hw * j2)
  }
  ctx.beginPath(); ctx.moveTo(Lp[0], Lp[1])
  for (let i = 2; i < Lp.length; i += 2) ctx.lineTo(Lp[i], Lp[i + 1])
  for (let i = Rp.length - 2; i >= 0; i -= 2) ctx.lineTo(Rp[i], Rp[i + 1])
  ctx.closePath(); ctx.fill()
}
function drawDab(ctx, m, prog) {
  if (prog <= 0) return
  if (m.kind === 1) { ctx.globalAlpha = m.alpha; ctx.fillStyle = m.col; ribbon(ctx, m, prog, liner, m.w, 0, 12, 0.25, m.seed); ctx.globalAlpha = 1; return }
  if (m.kind === 2) { // a thin scrubbed lay-in: separate bristles, the ground breathing between them
    for (let k = 0; k < 6; k++) { const len = 0.8 + ((m.seed * 7 + k * 13) % 10) / 50; ctx.globalAlpha = m.alpha * (0.5 + ((k * 37 + m.seed) % 10) / 20); ctx.fillStyle = k % 2 ? m.col2 : m.col; ribbon(ctx, m, Math.min(prog, len), (t) => (t / len > 0.85 ? Math.max(0.1, (1 - t / len) / 0.15) : 1), (m.w / 6) * 1.4, ((k + 0.5) / 6 - 0.5) * m.w, 8, 0.6, m.seed + 10 + k) }
    ctx.globalAlpha = 1; return
  }
  ctx.globalAlpha = m.alpha; ctx.fillStyle = m.col; ribbon(ctx, m, prog, flat, m.w, 0, 7, 0.2, m.seed)
  if (m.w >= 3.2) {
    ctx.globalAlpha = m.alpha * 0.5; ctx.fillStyle = m.ridge; ribbon(ctx, m, prog, flat, m.w * 0.22, m.w * 0.24, 5, 0.4, m.seed + 1) // the ridge the bristles push up
    ctx.globalAlpha = m.alpha * 0.32; ctx.fillStyle = m.groove; ribbon(ctx, m, prog, flat, m.w * 0.12, -m.w * 0.3, 5, 0.5, m.seed + 2) // the groove beside it
  }
  if (m.w >= 11) { ctx.globalAlpha = m.alpha * 0.6; ctx.fillStyle = m.ridge; ribbon(ctx, m, prog, (t) => (t < 0.55 ? 0 : 0.9), m.w * 0.09, m.w * 0.3, 5, 0.3, m.seed + 4); ctx.fillStyle = m.col; ribbon(ctx, m, prog, (t) => (t < 0.55 ? 0 : 0.9), m.w * 0.09, -m.w * 0.12, 5, 0.3, m.seed + 5) } // dry bristle tails
  ctx.globalAlpha = 1
}

export default {
  id: 'broken-colour', name: 'Broken colour', ko: '인상파 브로큰 컬러',
  medium: 'opaque oil straight from the tube, dabbed with a loaded flat hog brush on lead-white primed linen, one sitting',
  mark: 'short separate opaque dabs, each put down once: blunt landing, a ridge on one side, a groove on the other, unmixed colours side by side',
  edge: 'no outlines: a form ends where its dabs stop; found only on the sunlit rims, lost into the haze elsewhere',
  order: ['imprimatura', 'placement in ultramarine', 'masses in big dabs', 'broken colour everywhere', 'forms restated', 'complementary accents', 'last lights'],
  paper: 'lead-white primed linen, its weave showing in the thin lay-in and the gaps between dabs',
  palette: 'high key: lead white, cadmium orange and red, chrome yellow, rose madder, cobalt violet, ultramarine, viridian; no black — the darkest dark is ultramarine + rose',
  bestFor: '빛과 공기가 주인공인 그림 · 풍경, 정원, 햇살 든 실내 · 밝고 경쾌한 장면',
  source: 'anidoodle brokenColour.ts · brokenColourKit.ts · styles/brokenColour.md',
  defaults: {
    linen: '#f1ece1', imprimatura: '#d9ae93', placement: '#6068a8', dark: '#3b3466', warm: '#ffd98a', cool: '#6a6cc0',
    accentsWarm: ['#ee8a52', '#f2aa80', '#e4705c'], accentsCool: ['#9680cc', '#ac96d6', '#8078be'], key: 0.12, dab: 1, weave: 0.45,
  },
  draw(D, S, K, o) {
    const L = S.light, sc = (Math.min(S.W, S.H) / 1080) * (o.dab || 1)
    const warm = rgbOf(K, o.warm), cool = rgbOf(K, o.cool), dark = rgbOf(K, o.dark), white = [255, 252, 244]
    const AW = o.accentsWarm.map((c) => rgbOf(K, c)), AC = o.accentsCool.map((c) => rgbOf(K, c))
    // form by temperature: light leans warm, shade leans cool violet-blue, everything a step higher in key, no black
    const toneCol = (r, t) => {
      let c = mixA(rgbOf(K, r.color), white, o.key ?? 0.12)
      if (t >= 0.6) c = mixA(c, mixA(rgbOf(K, r.lit), warm, 0.35), (t - 0.6) / 0.4 * 0.8)
      else { const k = (0.6 - t) / 0.6; c = mixA(c, mixA(cool, rgbOf(K, r.shade), 0.35), k * 0.75) }
      const [h, s, l] = hslA(c), dl = hslA(dark)[2]
      return fromHslA(h, Math.min(1, s * 1.18), Math.max(dl, l))
    }
    const F = field(S, K, { tone: toneCol, patch: 0.38 })
    const broken = (c, r, hj, lj, s0, s1) => { const [h, s, l] = hslA(c); return fromHslA(h + (r() - 0.5) * 2 * hj, Math.min(1, s * (s0 + r() * (s1 - s0))), Math.max(0.1, Math.min(0.97, l + (r() - 0.5) * 2 * lj))) }
    const mk = (x, y, ang, len, w, c, alpha, seed, kind = 0, bend = 0) => {
      const cx = Math.cos(ang) * len / 2, cy = Math.sin(ang) * len / 2
      return { a: [x - cx, y - cy], b: [x + cx, y + cy], bend, w, alpha, seed, kind, col: css(c), ridge: css(mixA(c, [255, 250, 238], 0.22)), groove: css(mixA(c, [20, 18, 40], 0.16)), col2: css(mixA(c, [255, 244, 228], 0.2)) }
    }
    const big = (r) => r && (r.role === 'bg' || r.role === 'ground')
    const dirs = new Map(S.regions.map((r) => [r, formDir(K, r, L)]))
    // the plane decides the direction: sky / wall hatched in drifting patches (up-right, down-right, flat), the table
    // flat and long, a light source every which way, things along their form
    const angAt = (r, x, y, rr) => {
      if (!r) return 0
      if (r.role === 'bg') { const n = K.fbm(r.i + 41, x, y, 0.006, 2); return (n < 0.4 ? -0.75 : n < 0.58 ? 0.02 : 0.7) + (rr() - 0.5) * 0.5 }
      if (r.role === 'ground') return (r.grain ?? 0) + (rr() - 0.5) * 0.08
      if (r.role === 'glow') return rr() * Math.PI
      return dirs.get(r)(x, y) + (rr() - 0.5) * 0.35
    }
    const order = (r) => (!r ? 0 : r.role === 'bg' ? 0 : r.role === 'glow' ? 1 : r.role === 'ground' ? 2 : 3 + (1 - r.depth) * 2)
    // grid points visited in a sweep that wanders patch by patch, the way a hand moves round a canvas
    const sweep = (step, seed, patch) => {
      const r = K.rng(seed), out = []
      for (let y = -step / 2; y < S.H + step; y += step) for (let x = -step / 2; x < S.W + step; x += step) {
        const px = x + (r() - 0.5) * step * 1.3, py = y + (r() - 0.5) * step * 1.3, h = F.pic(K.clamp(px, 0, S.W - 1), K.clamp(py, 0, S.H - 1))
        out.push({ x: px, y: py, h, key: order(h.r) * 1e5 + py + K.fbm(seed + 2, px, py, 1 / patch, 2) * patch * 1.4 + r() * patch * 0.25 })
      }
      return out.sort((a, b) => a.key - b.key)
    }
    const occOf = (it) => S.regions.filter((q) => q.i > it.i && q.role !== 'shadow' && q.role !== 'highlight').map((q) => q.pts)

    // everything below depends only on the regions, so a living piece computes it once
    const P = memo('broken-colour:' + sceneKey(S, JSON.stringify(o)), () => {
      const r = K.rng(1874), out = {}
      // (1) imprimatura: thin warm rose-ochre scrubbed with a big brush, alternating, the white still breathing through
      const imp = rgbOf(K, o.imprimatura), n = Math.ceil(S.H / (70 * sc))
      out.tone = Array.from({ length: n }, (_, i) => {
        const y = (i + 0.5) * (S.H / n) + (r() - 0.5) * 20, x0 = -60 + r() * 80, x1 = S.W + 60 - r() * 80, ya = y + (r() - 0.5) * 50, yb = y + (r() - 0.5) * 50, back = i % 2 === 1
        const m = mk(0, 0, 0, 1, (90 + r() * 40) * sc, mixA(imp, [200, 164, 156], i / n * 0.6), 0.6, 100 + i, 2)
        m.a = back ? [x1, yb] : [x0, ya]; m.b = back ? [x0, ya] : [x1, yb]; m.bend = (r() - 0.5) * 40; return m
      })
      // (3) the big masses: large dabs, colour averaged over a wide neighbourhood, little breaking yet
      out.mass = sweep(24 * sc, 300, 220 * sc).map(({ x, y, h }, i) => {
        let acc = [0, 0, 0]
        for (const [dx, dy] of [[0, 0], [-22, 0], [22, 0], [0, -14], [0, 14]]) { const q = F.pic(K.clamp(x + dx * sc, 0, S.W - 1), K.clamp(y + dy * sc, 0, S.H - 1)).c; acc = [acc[0] + q[0] / 5, acc[1] + q[1] / 5, acc[2] + q[2] / 5] }
        if (h.r && !big(h.r) && h.r.role !== 'glow') acc = mixA(acc, h.c, 0.6)
        const flatPlane = h.r && h.r.role === 'ground', kk = h.r && !big(h.r) ? Math.max(0.35, Math.min(1, Math.min(h.r.bbox.w, h.r.bbox.h) / (160 * sc))) : 1
        return mk(x, y, angAt(h.r, x, y, r), (flatPlane ? 64 : 50) * sc * kk * (0.8 + r() * 0.4), (flatPlane ? 17 : 22) * sc * kk * (0.8 + r() * 0.4), broken(acc, r, 0.01, 0.025, 0.9, 1.05), 0.92, 1000 + i, 0, (r() - 0.5) * 6)
      })
      // (4) broken colour: small dabs everywhere, hue and value broken, the eye does the mixing
      out.brk = []
      sweep(10.5 * sc, 400, 130 * sc).forEach(({ x, y, h }, i) => {
        const flatPlane = h.r && h.r.role === 'ground', wall = !h.r || h.r.role === 'bg'
        if (wall && r() < 0.28) return // the wall breathes: the mass shows between dabs
        const sz = h.r && !big(h.r) ? Math.max(0.45, Math.min(1, Math.min(h.r.bbox.w, h.r.bbox.h) / (120 * sc))) : 1
        const len = (flatPlane ? 30 : wall ? 28 : 23) * sc * sz * (0.6 + r() * 0.7), wd = (flatPlane ? 6.4 : wall ? 8.4 : 7.8) * sc * Math.max(0.55, sz) * (0.7 + r() * 0.5)
        let c = broken(h.c, r, wall ? 0.025 : 0.035, flatPlane ? 0.05 : 0.045, 0.95, flatPlane ? 1.35 : 1.25)
        const [, , l] = hslA(h.c), warmish = h.c[0] > h.c[2] + 20
        if (r() < 0.007) c = mixA(warmish && l > 0.5 ? AC[Math.floor(r() * 3)] : l < 0.55 ? AW[Math.floor(r() * 3)] : c, h.c, 0.4)
        out.brk.push(mk(x, y, angAt(h.r, x, y, r), len, wd, c, 0.95, 5000 + i, 0, (r() - 0.5) * (flatPlane ? 1.5 : 5)))
      })
      // (5) restate each thing along its form with dabs sized to it, and a warm rim of light along its sunlit edge
      out.det = []
      for (const q of S.regions) {
        if (q.role === 'shadow' || q.role === 'highlight' || big(q)) continue
        const b = q.bbox, m = Math.min(b.w, b.h), w = Math.max(2.2 * sc, Math.min(7 * sc, m * 0.22)), step = Math.max(w * 1.4, Math.min(16 * sc, m * 0.3)), rr = K.rng(q.i + 600)
        const pts = K.gridIn(q.pts, step, 0.9, q.i + 7)
        const list = []
        for (const [x, y] of pts) {
          if (S.regionAt(x, y) !== q || rr() < (q.role === 'glow' ? 0.4 : 0.2)) continue
          const f = F.at(q, x, y)
          list.push(mk(x, y, angAt(q, x, y, rr), Math.max(w * 1.6, Math.min(20 * sc, m * 0.4)) * (0.7 + rr() * 0.6), w * (0.8 + rr() * 0.4), broken(f.c, rr, 0.03, 0.06, 0.95, 1.25), 0.96, 6000 + q.i * 997 + list.length))
        }
        // found edges only on the sunlit side: short warm dabs laid along the rim
        if (q.role !== 'glow' && q.form > 0.3 && m > 30 * sc) {
          const nn = K.outward(q.pts), gap = Math.max(1, Math.round(q.pts.length / 40))
          for (let i = 0; i < q.pts.length; i += gap) {
            if (K.facing(nn[i], L) < 0.45 || rr() < 0.35) continue
            const [x0, y0] = q.pts[i], x = x0 - nn[i][0] * w * 0.9, y = y0 - nn[i][1] * w * 0.9
            if (S.regionAt(x, y) !== q) continue
            const f = F.at(q, x, y), c = mixA(mixA(f.c, warm, 0.45), white, 0.15)
            list.push(mk(x, y, Math.atan2(nn[i][0], -nn[i][1]) + (rr() - 0.5) * 0.3, w * 2.6, w * 0.9, c, 0.96, 7000 + q.i * 997 + i))
          }
        }
        out.det.push({ q, list: list.sort((a, b) => (a.a[1] + a.b[1]) - (b.a[1] + b.b[1])) })
      }
      // (6) accents by rule: orange and rose into blue shadow, violet and lilac into the gold light
      out.acc = []
      for (let k = 0, got = 0, want = Math.round((S.W * S.H) / 9000); k < want * 30 && got < want; k++) {
        const x = r() * S.W, y = r() * S.H, h = F.pic(x, y); let c = null
        const [, , l] = hslA(h.c), warmish = h.c[0] > h.c[2] + 25
        if (h.tone < 0.42 || h.shadow > 0.2) { if (r() < 0.5) c = AW[Math.floor(r() * 3)] }
        else if (warmish && l > 0.55 && h.tone > 0.66 && r() < 0.3) c = AC[Math.floor(r() * 3)]
        if (!c) continue
        got++; c = mixA(c, h.c, 0.25)
        const sz = h.r && !big(h.r) ? Math.max(0.4, Math.min(1, Math.min(h.r.bbox.w, h.r.bbox.h) / (120 * sc))) : 1
        out.acc.push(mk(x, y, angAt(h.r, x, y, r), 17 * sc * sz * (0.6 + r() * 0.6), 5.6 * sc * Math.max(0.6, sz), c, 0.95, 8000 + got))
      }
      // (8) the last lights: a cream-and-yellow core on every round highlight, laid every which way, orange round it
      out.spark = []
      for (const q of S.regions) {
        if (q.role === 'shadow' || q.role === 'highlight' || big(q) || q.form < 0.6 || q.role === 'glow') continue
        const b = q.bbox, m = Math.min(b.w, b.h); if (m < 40 * sc) continue
        const hx = b.cx + L[0] * b.w * 0.24, hy = b.cy + L[1] * b.h * 0.25, rr = K.rng(q.i + 900), lit = rgbOf(K, q.lit)
        for (let k = 0; k < 4 + Math.round(m / (50 * sc)); k++) {
          const x = hx + (rr() - 0.5) * m * 0.16, y = hy + (rr() - 0.5) * m * 0.12
          if (S.regionAt(x, y) !== q) continue
          out.spark.push(mk(x, y, rr() * Math.PI, (7 + rr() * 7) * sc, (4 + rr() * 2) * sc, k % 3 ? mixA(lit, warm, 0.5) : mixA(white, warm, 0.3), 0.97, 9000 + q.i * 31 + k))
        }
      }
      return out
    })

    D.ground(() => { D.sheet(o.linen); D.texture('linen', { opacity: 0.55 }) })
    D.pass('imprimatura', 0.5, () => batches(D, P.tone, { per: 3, cost: () => 1, draw: drawDab }))
    D.pass('placement in ultramarine', 0.8, () => {
      // the lay-in drawing: thinned ultramarine pulled with a rigger, a few pulls per outline, lost where the light is
      const U = rgbOf(K, o.placement), list = []
      for (const q of S.regions) {
        if (q.role === 'shadow' || q.role === 'highlight' || q.role === 'bg' || !(q.contour || q.role === 'glow' || q.role === 'ground')) continue
        const pts = K.resample(q.pts, Math.max(6, Math.round(K.length(q.pts, true) / (70 * sc))), true)
        for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if (a[0] < -5 && b[0] < -5 || a[0] > S.W + 5 && b[0] > S.W + 5 || a[1] > S.H + 5 && b[1] > S.H + 5) continue; const m = mk(0, 0, 0, 1, 3 * sc, U, 0.55, 200 + q.i * 50 + i, 1); m.a = a; m.b = b; list.push(m) }
      }
      for (const l of S.lines) if (!K.isLight(l.color)) { const pts = K.resample(l.pts, Math.max(2, Math.round(K.length(l.pts) / (70 * sc)) + 1)); for (let i = 1; i < pts.length; i++) { const m = mk(0, 0, 0, 1, 2.4 * sc, U, 0.5, 260 + l.i * 50 + i, 1); m.a = pts[i - 1]; m.b = pts[i]; list.push(m) } }
      batches(D, list, { per: 6, cost: (m) => Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1]) / 100 + 0.05, draw: drawDab })
    })
    D.pass('masses in big dabs', 2, () => batches(D, P.mass, { per: 60, cost: () => 1, draw: drawDab }))
    D.pass('broken colour everywhere', 3.2, () => batches(D, P.brk, { per: 120, cost: () => 1, draw: drawDab }))
    D.pass('forms restated', 1.4, () => { for (const { q, list } of P.det) batches(D, list, { per: 40, occ: occOf(q), cost: () => 1, draw: drawDab }) })
    D.pass('complementary accents', 0.6, () => batches(D, P.acc, { per: 30, cost: () => 1, draw: drawDab }))
    D.pass('last lights', 0.8, () => {
      batches(D, P.spark, { per: 12, cost: () => 1, draw: drawDab })
      // lines: a light line (steam, a white bar) is a run of cream dabs along it; a dark one is one pull of a rigger in
      // ultramarine and rose. Steam boils once alive.
      for (const l of S.lines) {
        const rr = K.rng(l.i * 13 + (D.frame ? D.frame * 7 : 0)), list = []
        if (K.isLight(l.color)) {
          const len = K.length(l.pts), n = Math.max(2, Math.round(len / (13 * sc))), pts = K.resample(l.pts, n + 1)
          for (let i = 0; i < n; i++) {
            const a = pts[i], b = pts[i + 1], mx = (a[0] + b[0]) / 2 + (rr() - 0.5) * 2.5, my = (a[1] + b[1]) / 2 + (rr() - 0.5) * 2.5, back = F.pic(K.clamp(mx, 0, S.W - 1), K.clamp(my, 0, S.H - 1)).c
            const c = broken(mixA(mixA(rgbOf(K, l.color), white, 0.2), back, 0.12 + rr() * 0.15), rr, 0.03, 0.04, 1, 1.4)
            list.push(mk(mx, my, Math.atan2(b[1] - a[1], b[0] - a[0]) + (rr() - 0.5) * 0.4, 18 * sc * (0.8 + rr() * 0.4), Math.max(5 * sc, l.w * 1.15) * (0.8 + rr() * 0.4), c, 0.95, 9500 + l.i * 97 + i))
          }
        } else {
          const pts = K.resample(l.pts, Math.max(2, Math.round(K.length(l.pts) / (60 * sc)) + 1)), c = mixA(rgbOf(K, l.color), dark, 0.45)
          for (let i = 1; i < pts.length; i++) { const m = mk(0, 0, 0, 1, Math.max(2.2 * sc, l.w * 1.1), c, 0.92, 9800 + l.i * 31 + i, 1); m.a = pts[i - 1]; m.b = pts[i]; list.push(m) }
        }
        batches(D, list, { per: 20, occ: occOf(l), cost: () => 1, draw: drawDab })
      }
    })
    D.top(() => { D.texture('linen', { opacity: o.weave ?? 0.45 }) })
  },
}

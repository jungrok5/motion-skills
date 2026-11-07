// Scratchboard — studied from anidoodle's lynx plate (scratchboard.ts · scratchboard.md). Re-implemented for the scene model.
// A board of white china clay under black India ink. Nothing is added: every mark is ink scraped away with a knife or a
// scratch nib, so every mark is white on black and the picture is found by removing the dark. A cut bites in wide and
// tapers as it lifts; its width follows the tone along its length; cuts run along the form / the grain of the material;
// mid tones get a shorter crossing set; the lights are cut until they close; catchlights are scraped flat with the blade.
// Dark lines are simply never cut (the board shows); light lines (steam, a white bar) are knife lines with a black margin.
//
// defaults (overridable by a house style):
//   board  — the ink ground                     clay — the white the knife reveals
//   tint   — 0..1 hand-colouring glazed over the scraped white (0 = pure black and white)
//   density — more (>1) or fewer (<1) cuts       length — cut length in px at 1080
import { unit, ribbonW, sub, band, patchSort, truePlate } from './_cut.js'

export default {
  id: 'scratchboard', name: 'Scratchboard', ko: '스크래치보드',
  medium: 'white china clay board under black India ink; every mark is the ink scraped away with a knife or scratch nib',
  mark: 'white tapered knife cuts on black: density and width follow the tone, direction follows the form and grain; crossing cuts for mid tones',
  edge: 'lit contours caught by a row of short knife lines just inside the edge; shadow-side edges lost into the black',
  order: ['contour highlights', 'lay of the form', 'mid tones and crossing cuts', 'lights cut until they close', 'details and catchlights'],
  paper: 'black-inked clay board',
  palette: 'black board and the warm white of the clay; grey is only how close the cuts are (optional hand tint)',
  bestFor: '극적인 밤 장면 · 동물 털, 나무결, 금속 · 흑백 판화 같은 포스터',
  source: 'anidoodle scratchboard.ts · scratchboard.md',
  defaults: { board: '#0c0b0a', clay: '#ebe5d8', tint: 0, density: 1, length: 18 },

  draw(D, S, K, o) {
    const u = unit(S), L = S.light, clay = o.clay, board = o.board, W = S.W, H = S.H
    const TP = truePlate(S, K), tone = (x, y) => K.smoothstep(0.06, 0.93, TP.tone(x, y)) ** 1.2
    const wOf = (t) => (t < 0.04 ? 0 : (0.45 + 2.5 * t ** 1.5) * u)
    const solid = S.solid
    D.ground(() => D.sheet(board))

    // what is never cut: dark lines (the board stays), and a black margin each side of a light line so it reads
    const keep = []
    for (const l of S.lines) for (const run of visibleRuns(l)) keep.push(band(run, K.isLight(l.color) ? l.w / 2 + 3.5 * u : Math.max(1.3 * u, l.w * 0.45), K))

    // the parts of a line no later region hides
    function visibleRuns(l) {
      const c = K.densify(l.pts, 3 * u), out = []
      let cur = []
      for (const p of c) { const q = S.regionAt(p[0], p[1]); if (q && q.i > l.i) { if (cur.length > 1) out.push(cur); cur = [] } else cur.push(p) }
      if (cur.length > 1) out.push(cur)
      return out
    }

    // ---- the direction a cut runs at (x, y) in region r: grain, else around the form, else the lie of the surface
    const dirAt = (r, x, y) => {
      if (!r) return Math.PI / 2 + (K.noise(7, x * 0.01, y * 0.01) - 0.5) * 0.5
      const b = r.bbox, uu = (x - b.cx) / (b.w / 2 || 1), vv = (y - b.cy) / (b.h / 2 || 1)
      if (r.role === 'glow') return 0
      if (r.role === 'bg') return (r.grain ?? Math.PI / 2) + (K.noise(r.i, x * 0.008, y * 0.008) - 0.5) * 0.35
      if (r.role === 'ground') return (r.grain ?? 0) + (K.noise(r.i, x * 0.006, y * 0.02) - 0.5) * 0.25
      const g = r.grain ?? 0
      return g + Math.atan(-1.1 * uu * r.form) * Math.cos(g) + 0.12 * vv * r.form * Math.sign(uu)
    }
    const flick = (x0, y0, len, dev, r) => {
      const pts = [[x0, y0]], st = 2.2 * u
      let x = x0, y = y0, s = 0
      while (s < len) {
        const a = dirAt(r, x, y) + dev
        x += Math.cos(a) * st; y += Math.sin(a) * st; s += st
        if (x < 0 || y < 0 || x >= W || y >= H || S.regionAt(x, y) !== r) break
        pts.push([x, y])
      }
      return pts
    }
    const prof = (n) => Array.from({ length: n }, (_, i) => { const t = n > 1 ? i / (n - 1) : 0; return Math.sqrt(Math.min(1, t / 0.14)) * Math.min(1, ((1 - t) / 0.7)) ** 0.8 + 0.06 })

    // ---- every field cut, once: seeds on a jittered grid, the number per cell from the tone (coverage ≈ tone)
    const rnd = K.rng(4711), g = 6 * u, LEN = o.length * u, dir = [], mids = [], lights = [], cross = []
    for (let gy = g / 2; gy < H; gy += g) for (let gx = g / 2; gx < W; gx += g) {
      const x = gx + (rnd() - 0.5) * g, y = gy + (rnd() - 0.5) * g, t = tone(x, y)
      if (t < 0.05) continue
      const r = S.regionAt(x, y), flat = !r || r.role === 'bg' || r.role === 'ground'
      const w = wOf(t), len = LEN * (0.75 + rnd() * 0.5) * (flat ? 2.2 : 1), n = (o.density * 1.5 * t ** 1.5 * g * g) / (len * w * 0.55)
      let cnt = Math.floor(n) + (rnd() < n % 1 ? 1 : 0)
      for (let c = 0; c < cnt; c++) {
        const px = c ? x + (rnd() - 0.5) * g : x, py = c ? y + (rnd() - 0.5) * g : y
        const pts = flick(px, py, len, (rnd() - 0.5) * (flat ? 0.08 : 0.22), r)
        if (pts.length < 2) continue
        const tp = prof(pts.length), ws = pts.map((p, j) => tp[j] * wOf(tone(p[0], p[1])))
        const cut = { pts, ws, a: rnd() < 0.3 && t < 0.97 ? 0.8 : 0.97 }
        if (rnd() < 0.3 && t > 0.12) dir.push(cut); else if (t < 0.62) mids.push(cut); else lights.push(cut)
      }
      // the crossing set for the mid tones: shorter, straighter, at ±35° to the lie
      const mid = K.clamp(1 - Math.abs(t - 0.42) / 0.24)
      if (mid > 0 && rnd() < 0.55 * mid * o.density) {
        const a = dirAt(r, x, y) + (rnd() < 0.5 ? 0.62 : -0.62), l = len * 0.5, c = [x - Math.cos(a) * l / 2, y - Math.sin(a) * l / 2], e = [x + Math.cos(a) * l / 2, y + Math.sin(a) * l / 2]
        const pts = K.resample([c, e], 4), tp = prof(4)
        cross.push({ pts, ws: tp.map((v) => v * 0.8 * wOf(t)), a: 0.8 })
      }
      // the brightest lights scraped with the flat of the blade: wide short strokes that close up
      if (t > 0.9 && rnd() < 0.5) {
        const a = dirAt(r, x, y), pts = flick(x, y, len * 0.7, 0, r)
        if (pts.length > 1) lights.push({ pts, ws: pts.map(() => 3.6 * u), a: 0.97 })
      }
    }

    // a batch of cuts arrives whole, many at a time, patch by patch (the knife works over the board region by region)
    const batch = (list, cost) => {
      const ord = patchSort(list, (c) => c.pts[0], 96 * u), polys = ord.map((c) => ({ p: ribbonW(c.pts, c.ws), a: c.a }))
      D.mark(cost, (ctx, k) => {
        const n = Math.ceil(polys.length * k)
        ctx.save(); ctx.fillStyle = clay
        for (const hi of [0, 1]) {
          ctx.beginPath()
          for (let i = 0; i < n; i++) if ((polys[i].a > 0.9 ? 1 : 0) === hi) sub(ctx, polys[i].p)
          ctx.globalAlpha = hi ? 0.97 : 0.8; ctx.fill()
        }
        ctx.restore()
      })
    }
    // a long knife line is watched being cut: the tip travels along it
    const knife = (pts, ws, alpha = 0.97) => {
      const len = K.length(pts)
      D.mark(0.3 + len / 140, (ctx, k) => {
        const m = k >= 1 ? pts.length : Math.max(2, Math.ceil(pts.length * k)), p = ribbonW(pts.slice(0, m), ws.slice(0, m))
        ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = clay; ctx.beginPath(); sub(ctx, p); ctx.fill(); ctx.restore()
      })
    }
    const field = (fn) => D.layer({ tooth: 'fine', cut: keep }, fn)

    D.pass('contour highlights', 1.2, () => {
      for (const r of solid) {
        if (!r.contour || r.role === 'bg' || r.role === 'ground') continue
        D.layer({ tooth: 'fine', cut: [...keep, ...S.occluders(r)] }, () => {
        const inset = K.offset(K.densify(r.pts, 4 * u, true), -2.6 * u), lumK = 0.55 + 0.6 * K.lum(r.color), rr = K.rng(r.i + 91)
        for (const run of K.runs(inset, (i, n) => K.facing(n, r.light) > 0.18)) {
          // a row of short knife lines, not one wire: each 6–14 points, overlapping a little
          for (let i = 0; i < run.length - 2;) {
            const m = Math.min(run.length - i, 5 + Math.floor(rr() * 9)), seg = run.slice(i, i + m)
            if (seg.length > 1) { const tp = prof(seg.length); knife(seg, tp.map((v) => v * (1.1 + 1.3 * lumK) * u)) }
            i += Math.max(2, m - 1)
          }
        }
        })
      }
    })
    D.pass('lay of the form', 1.6, () => field(() => batch(dir, 2 + dir.length * 0.004)))
    D.pass('mid tones and crossing cuts', 2, () => field(() => { batch(mids, 2 + mids.length * 0.004); batch(cross, 1 + cross.length * 0.003) }))
    D.pass('lights cut until they close', 1.6, () => field(() => batch(lights, 2 + lights.length * 0.004)))
    D.pass('details and catchlights', 1.2, () => {
      D.layer({ tooth: 'fine' }, () => {
        for (const l of S.lines) {
          if (!K.isLight(l.color)) continue
          // a light line is a knife line, re-wobbled on twos when the piece is alive (steam keeps moving)
          let c = K.densify(l.pts, 3 * u)
          c = K.wobble(c, 0.8 * u, l.i * 7 + D.frame * 3)
          const n = c.length, tp = prof(n), w = Math.max(1.4 * u, l.w * 0.7)
          knife(c, tp.map((v) => v * w), 0.95)
        }
        // catchlights: on the round forms, a spot toward the light scraped flat with the blade
        for (const r of solid) {
          if (r.form < 0.75 || r.role === 'bg' || r.role === 'ground' || r.area < 2500 * u * u) continue
          const b = r.bbox, R = Math.min(b.w, b.h) * 0.06, cx = b.cx + r.light[0] * b.w * 0.26, cy = b.cy + r.light[1] * b.h * 0.28
          if (S.regionAt(cx, cy) !== r) continue
          const blade = K.blob(cx, cy, R, { sx: 1.35, sy: 0.75, rot: Math.atan2(r.light[1], r.light[0]) + Math.PI / 2, seed: r.i, wob: 0.25 })
          D.layer({ cut: S.occluders(r) }, () => D.fill(blade, clay, { alpha: 0.96, grow: 'wipe', dir: Math.atan2(-r.light[1], -r.light[0]) }))
        }
      })
    })

    D.top(() => {
      if (o.tint > 0) D.mark(0.001, (ctx) => {
        const pl = S.plate()
        ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = o.tint; ctx.imageSmoothingEnabled = true; ctx.drawImage(pl.canvas, 0, 0, W, H); ctx.restore()
      })
      D.texture('paper', { opacity: 0.35 })
    })
  },
}

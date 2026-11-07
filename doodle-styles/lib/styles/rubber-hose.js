// Rubber hose (1930s studio cartoon) — studied from anidoodle's rubberHose plate (rubberHose.ts · rubberHoseKit.ts ·
// styles/rubberHose.md). Re-implemented for the scene model.
//   MEDIUM — a non-photo-blue pencil rough on punched animation bond; traced in India ink with a pen held at ONE pressure
//   onto a clear cel (uniform line, a slight hand wobble that boils on twos once alive); painted on the BACK of the cel in
//   flat opaque greys, so the ink always sits on top of the paint; photographed and printed on black-and-white film.
//   MARKS — one-weight contours that stop where a nearer shape starts; flat greys with no modelling; one white shine on a
//   round thing; cast shadows are translucent flat shapes with no ink; steam and white bars are white shapes inked round.
//   ORDER — rough (line of action, masses, parts) → ink (the character first, then the set) → paint, flooded region by
//   region from where the brush touched (character first) → the pull-down: the cel is threaded through the gate and comes
//   back as a print → (alive) the print runs: grain, flicker, dust and gate weave every frame.
//   PALETTE — greys only: ink, paper whites and five greys; the print toned warm.
//
// defaults (all overridable by a house style):
//   paper   the bond / cel white          ink    India ink
//   pencil  the blue-pencil rough         greys  the paint greys, light → dark
//   tone    the warm silver toning of the print (multiplied)
//   grain   film grain strength (0..1)    gate   the projector's rounded gate and vignette: true / false
//   line    ink line weight (1 = normal)
import { Draw, play } from '../draw.js'
import { solidOf, unit, lightLine } from './_ink.js'

export default {
  id: 'rubber-hose', name: 'Rubber hose', ko: '1930년대 고무호스 만화',
  medium: 'India ink on a clear cel over a blue-pencil rough, flat greys painted on the back, photographed on black-and-white film',
  mark: 'one-pressure ink line with a hand wobble; flat opaque greys, no modelling; a white shine',
  edge: 'hard and even; contours stop where a nearer shape starts; cast shadows flat and unlined',
  order: ['blue-pencil rough', 'ink on the cel', 'paint on the back of the cel', 'the print pulled through the gate'],
  paper: 'animation bond under a clear cel, then a toned black-and-white film print',
  palette: 'greys only: India ink, paper white and five greys; the print toned warm, grain and flicker',
  bestFor: '복고풍 만화 · 흑백 무성영화 느낌 · 익살스러운 캐릭터, 물건이 춤추는 장면',
  source: 'anidoodle rubberHose.ts · rubberHoseKit.ts · styles/rubberHose.md',
  defaults: { paper: '#f6f3ea', ink: '#16130f', pencil: '#6fa8dc', greys: ['#f6f3ea', '#e2ded3', '#c4beb2', '#a39d91', '#7f7a71', '#55514b', '#34312d'], tone: '#ecdfc6', grain: 0.34, gate: true, line: 1 },
  draw(D, S, K, o) {
    const L = S.light, u = unit(S), INK = o.ink, W = S.W, H = S.H
    const solid = solidOf(S), big = (r) => r.role === 'bg' || r.role === 'ground'
    const greys = [...o.greys].sort((a, b) => K.lum(b) - K.lum(a)), gl = greys.map((g) => K.lum(g))
    const idxOf = (c) => { const l = K.lum(c); let bi = 0; gl.forEach((g, i) => { if (Math.abs(g - l) < Math.abs(gl[bi] - l)) bi = i }); return bi }
    // each thing gets one flat grey; a thing never takes the same grey as what it stands in front of
    const greyIdx = new Map()
    for (const r of S.regions) {
      if (r.role === 'glow') { greyIdx.set(r, 0); continue }
      let k = idxOf(r.color)
      if (!big(r) && r.role !== 'shadow' && r.role !== 'highlight') {
        const behind = solid.filter((q) => q.i < r.i && K.inside(q.pts, r.centre[0], r.centre[1])).pop()
        if (behind && greyIdx.get(behind) === k) k = K.lum(r.color) >= K.lum(behind.color) ? Math.max(0, k - 1) : Math.min(greys.length - 1, k + 1)
      }
      greyIdx.set(r, k)
    }
    const greyOf = (r) => greys[greyIdx.get(r)]
    const lw = (r) => (r.role === 'detail' ? 2.8 : big(r) ? 3 : 3.4) * u * o.line
    const cut = (it) => S.occluders(it, { light: false })
    const shineOf = (r) => { const b = r.bbox, m = Math.min(b.w, b.h); return K.blob(b.cx + L[0] * b.w * 0.27, b.cy + L[1] * b.h * 0.3, m * 0.085, { sx: 1.6, sy: 0.7, rot: Math.atan2(L[1], L[0]) + Math.PI / 2, seed: r.i, wob: 0.05 }) }
    const isShiny = (r) => !big(r) && r.form > 0.75 && r.area > 3000 * u * u && r.role !== 'glow'
    const character = solid.filter((r) => !big(r)).sort((a, b) => b.area - a.area), set = solid.filter(big)

    // ------------------------------------------------------------ the marks, shared by the working cel and by the print
    const inkRegion = (X, r, seed) => X.layer({ cut: cut(r) }, () => X.stroke(r.pts, { closed: true, w: lw(r), color: INK, taper: 0, pressure: 0, rough: 0.04, wobble: 1.1 * u, boil: true, seed, cost: 0.8 }))
    const inkLine = (X, l) => X.layer({ cut: cut(l) }, () => {
      const w = lightLine(K, l) ? Math.max(4 * u, l.w * u) + 2 * lw(l) : lw(l)
      X.stroke(l.pts, { w, color: INK, taper: 0, pressure: 0, rough: 0.04, wobble: 1 * u, boil: true, seed: l.i * 7, smooth: l.role === 'steam', cost: 0.8 })
    })
    const paintRegion = (X, r, blend) => X.layer({ cut: cut(r), blend }, () => {
      const b = r.bbox
      if (r.role === 'shadow') X.fill(r.pts, INK, { alpha: 0.18 + 0.3 * r.strength, from: [b.cx, b.cy] })
      else if (r.role === 'highlight') X.fill(r.pts, greys[0], { alpha: 0.45, grow: 'wipe', dir: Math.PI / 2 })
      else X.fill(r.pts, greyOf(r), { from: K.litPoint(r, L, 0.2) })
    })
    const paintCore = (X, l) => X.layer({ cut: cut(l) }, () => X.stroke(l.pts, { w: Math.max(4 * u, l.w * u), color: greys[0], taper: 0, pressure: 0, rough: 0.04, wobble: 1 * u, boil: true, seed: l.i * 7, smooth: l.role === 'steam', cost: 0.3 }))
    const shine = (X, r) => X.layer({ cut: cut(r) }, () => X.fill(shineOf(r), greys[0], { grow: 'cut', cost: 0.2 }))
    const paintAll = (X, blend) => {
      for (const r of [...character, ...set]) paintRegion(X, r, blend)
      for (const r of S.regions.filter((q) => q.role === 'glow')) paintRegion(X, r, blend)
      for (const r of S.regions.filter((q) => q.role === 'shadow' || q.role === 'highlight')) paintRegion(X, r, r.role === 'shadow' ? 'multiply' : undefined)
      for (const r of character.filter(isShiny)) shine(X, r)
      for (const l of S.lines.filter((q) => lightLine(K, q))) paintCore(X, l)
    }
    const inkAll = (X) => {
      for (const r of character) if (r.contour) inkRegion(X, r, r.i * 13 + 1)
      for (const r of set) if (r.contour) inkRegion(X, r, r.i * 13 + 1)
      for (const l of S.lines) inkLine(X, l)
    }

    D.ground(() => D.sheet(o.paper))

    // ------------------------------------------------------------ 1. the blue-pencil rough: line of action, masses, parts
    D.pass('blue-pencil rough', 0.9, () => {
      const pen = { w: 1.4 * u, color: o.pencil, alpha: 0.75, taper: 0.4, pressure: 0.2, wobble: 2 * u, smooth: true, cost: 0.3 }
      for (const r of character.filter((q) => q.role !== 'detail' && q.area > 4000 * u * u)) {
        const b = r.bbox, lean = (K.noise(r.i, 2, 2) - 0.5) * b.w * 0.5
        D.stroke([[b.cx - lean, b.y1 + b.h * 0.05], [b.cx + lean * 0.2 - b.w * 0.08, b.cy], [b.cx + lean, b.y0 - b.h * 0.05]], { ...pen, seed: r.i + 1 }) // the line of action
      }
      for (const r of character) { const b = r.bbox; D.stroke(K.ellipse(b.cx, b.cy, b.w * 0.5, b.h * 0.5, 28), { ...pen, closed: true, alpha: 0.5, seed: r.i + 2 }) } // masses
      for (const r of solid) if (r.contour) D.stroke(r.pts, { ...pen, closed: true, smooth: false, seed: r.i + 3 }) // parts
      for (const l of S.lines) D.stroke(l.pts, { ...pen, smooth: l.role === 'steam', seed: l.i + 4 })
    })

    // ------------------------------------------------------------ 2. ink on the cel: the character first, then the set
    D.pass('ink on the cel', 2.2, () => inkAll(D))

    // ------------------------------------------------------------ 3. paint on the back of the cel: under the ink (darken), character first
    D.pass('paint on the back of the cel', 1.8, () => paintAll(D, 'darken'))

    // ------------------------------------------------------------ 4. the print: the cel photographed, pulled down through the gate
    const P = new Draw(D.env); P.frame = D.frame
    P.pass('print', 1, () => { P.sheet(o.paper); paintAll(P); inkAll(P) })
    D.pass('the print pulled through the gate', 0.7, () => D.mark(3, (ctx, k) => {
      const y = (H + 30) * (k >= 1 ? 1 : k) - 15
      ctx.save(); ctx.beginPath(); ctx.rect(-4, -4, W + 8, y + 4); ctx.clip()
      play(P.prog, ctx, 1, D.env)
      ctx.restore()
      if (k < 1) { ctx.save(); ctx.fillStyle = '#0b0907'; ctx.fillRect(0, y, W, 16 * u); ctx.restore() } // the frame line rolling down
    }))

    // ------------------------------------------------------------ the film: black-and-white stock, toned, grained, flickering
    D.top(() => {
      const f = D.frame, env = D.env
      D.mark(0.001, (ctx) => {
        const r = K.rng(7000 + f * 13), s = env.scale
        ctx.save()
        if (f > 0) { // gate weave: only while the film runs
          const dx = Math.round((r() - 0.5) * 3.4 * s), dy = Math.round((r() - 0.5) * 3.4 * s)
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(ctx.canvas, dx, dy)
          ctx.setTransform(s, 0, 0, s, 0, 0)
        }
        ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(-4, -4, W + 8, H + 8) // black-and-white stock
        ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = o.tone; ctx.fillRect(-4, -4, W + 8, H + 8) // a warm silver print
        // grain: a speckle tile, moved every frame
        const key = `rubber-hose:grain:${s}`
        let g = env.cache.get(key)
        if (!g) {
          const n = Math.round(256 * s); g = K.canvas(n, n); const x = g.getContext('2d'), img = x.createImageData(n, n), d = img.data, rr = K.rng(1931)
          for (let i = 0; i < n * n; i++) { const v = (rr() + rr() + rr()) / 3, q = Math.round(K.clamp(0.5 + (v - 0.5) * 2.2) * 255); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = q; d[i * 4 + 3] = 255 }
          x.putImageData(img, 0, 0); env.cache.set(key, g)
        }
        const pat = ctx.createPattern(g, 'repeat')
        ctx.setTransform(1, 0, 0, 1, Math.floor(r() * 256 * s), Math.floor(r() * 256 * s))
        ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = o.grain; ctx.fillStyle = pat; ctx.fillRect(-256 * s, -256 * s, (W + 512) * s, (H + 512) * s)
        ctx.setTransform(s, 0, 0, s, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = `rgba(20,14,8,${(0.02 + r() * 0.05).toFixed(3)})`; ctx.fillRect(0, 0, W, H) // the lamp flickers
        // dust: dark flecks (dirt on the positive) and light ones (dirt on the negative), a hair, the sprocket scratch
        const nd = 5 + Math.floor(r() * 5)
        for (let i = 0; i < nd; i++) { const x = r() * W, y = r() * H, sz = (1 + r() * 2.6) * u, dark = r() < 0.6; ctx.fillStyle = dark ? 'rgba(18,12,8,0.7)' : 'rgba(255,250,236,0.75)'; K.path(ctx, K.ellipse(x, y, sz, sz * (0.5 + r()), 8, r() * 3)); ctx.fill() }
        if (r() < 0.55) { const x = r() * W, y = r() * H, a = r() * 6; ctx.strokeStyle = 'rgba(20,14,8,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * 30 * u, y + Math.sin(a) * 30 * u + 12 * u, x + Math.cos(a + 1) * 44 * u, y + Math.sin(a + 1) * 40 * u); ctx.stroke() }
        const sx = W * (0.62 + r() * 0.3); ctx.strokeStyle = 'rgba(255,250,236,0.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + (r() - 0.5) * 6, H); ctx.stroke()
        if (o.gate) {
          const vg = ctx.createRadialGradient(W * 0.48, H * 0.44, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(22,14,6,0.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)
          const m = 16 * u, R = 46 * u
          ctx.fillStyle = '#0b0907'; ctx.beginPath(); ctx.rect(-4, -4, W + 8, H + 8)
          ctx.moveTo(m + R, m); ctx.arcTo(m, m, m, m + R, R); ctx.arcTo(m, H - m, m + R, H - m, R); ctx.arcTo(W - m, H - m, W - m, H - m - R, R); ctx.arcTo(W - m, m, W - m - R, m, R); ctx.closePath(); ctx.fill('evenodd') // the projector's gate
        }
        ctx.restore()
      })
    })
  },
}

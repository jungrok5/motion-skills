// Ukiyo-e colour woodblock — studied from anidoodle's herons plate (woodcut.ts · woodcutKit.ts · woodcut.md). Re-implemented
// for the scene model. Water-based pigment brushed onto carved cherry blocks, printed by hand onto damp kozo washi with a
// baren, one block per colour, each sheet laid against the kento. The KEYBLOCK carries the sumi line: a ridge left standing
// between two knife cuts, so its width steps where the carver re-set the knife and every end is a flat chisel cut. Colour
// is FLAT, shaped only by where the wood was left standing; big flats show the plank's grain and goma-zuri speckle. Tone is
// only BOKASHI (the inked block wiped with a damp cloth). White is bare washi: a block is carved away wherever something
// else owns the area, and light lines (steam, a white bar) are uncut paper.
//
// defaults (overridable by a house style):
//   paper    — the washi                  sumi — the keyblock ink
//   palette  — the pigments colours are pulled toward (beni, shu, kihada, ai, bero-ai, kusa, usuzumi …)
//   toPalette — 0..1 how far each local colour moves to its nearest pigment
//   margin   — bare paper round the print, as a fraction of the short side (0 = bleed)
//   register — px of kento slip per block      grain — 0..1 how much the plank shows in big flats
import { unit, ribbonW, sub, inner, band, hash } from './_cut.js'

export default {
  id: 'woodblock', name: 'Ukiyo-e woodblock', ko: '우키요에 목판화',
  medium: 'water-based pigment from carved cherry blocks, printed by baren onto damp kozo washi, one block per colour',
  mark: 'a carved sumi keyline (width steps, chisel ends), flat knife-shaped colour, plank grain and baren speckle, bokashi wipes',
  edge: "the keyline's hard knife edge; each colour block lands a hair off its line (kento registration is good, never perfect)",
  order: ['keyblock', 'colour blocks, lightest to darkest', 'bokashi'],
  paper: 'warm kozo washi with long soft fibres; a bare margin with the kento pressed blind',
  palette: 'traditional pigments: sumi, usuzumi, kihada yellow, beni and shu reds, ai and bero-ai blues, kusa green, wood brown',
  bestFor: '풍경과 정물 · 일본풍 · 평평한 색면이 시원한 포스터',
  source: 'anidoodle woodcut.ts · woodcutKit.ts · woodcut.md',
  defaults: {
    paper: '#efe6d1', sumi: '#1f1b18',
    palette: ['#c6c1b0', '#d49c3a', '#e2b85c', '#c0473e', '#d0603a', '#a77a4a', '#7d5a3c', '#9ab5c4', '#2c4a78', '#3a4557', '#7d8a73', '#adaf9c', '#6f7f4e', '#8a8983', '#6c5670', '#9fa4a4', '#5b5753'],
    toPalette: 0.55, margin: 0.035, register: 1.6, grain: 1,
  },

  draw(D, S, K, o) {
    const u = unit(S), env = D.env, paper = o.paper, sumi = o.sumi, box = inner(S, o.margin), Lt = S.light
    const pig = (c) => K.adjust(K.mix(c, K.nearest(c, o.palette), o.toPalette), { sat: 0.9 })
    const isBlack = (r) => r.role !== 'shadow' && r.role !== 'glow' && r.role !== 'highlight' && K.lum(r.color) < 0.2

    D.ground(() => {
      D.sheet(paper)
      // the kento, pressed blind into the bottom margin: an L-notch at one corner, a straight guide along the edge
      if (box.m > 6 * u) D.mark(0.001, (ctx) => {
        const y = S.H - box.m * 0.45, x = box.x1 - 4 * u
        ctx.save(); ctx.lineWidth = 1.2 * u; ctx.strokeStyle = 'rgba(120,100,70,0.22)'
        ctx.beginPath(); ctx.moveTo(x - 40 * u, y); ctx.lineTo(x, y); ctx.lineTo(x, y - 9 * u); ctx.moveTo(box.x0 + S.W * 0.3, y); ctx.lineTo(box.x0 + S.W * 0.55, y); ctx.stroke()
        ctx.strokeStyle = 'rgba(255,252,240,0.5)'; ctx.translate(0.9 * u, 0.9 * u); ctx.stroke(); ctx.restore()
      })
    })

    // ---------------------------------------------------------------- the knife and the baren
    // a keyblock line as the knife leaves it: two separate cuts either side of a ridge, width stepping, chisel ends
    const carved = (ctrl, w, seed, closed = false) => {
      const r = K.rng(seed), c = K.resample(closed ? [...ctrl, ctrl[0]] : ctrl, Math.max(3, Math.round(K.length(ctrl, closed) / (1.6 * u))))
      const n = c.length, Lp = [], Rp = []
      let next = (12 + r() * 18) * u, lvl = 1 + (r() - 0.5) * 0.32, acc = 0
      for (let i = 0; i < n; i++) {
        if (i) acc += Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1])
        if (acc > next) { next = acc + (12 + r() * 18) * u; lvl = 1 + (r() - 0.5) * 0.32 }
        const a = c[Math.max(0, i - 1)], b = c[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l
        const t = i / (n - 1), ends = closed ? 1 : Math.min(1, (t * (n - 1)) / 3, ((1 - t) * (n - 1)) / 3), end = 0.8 + 0.2 * ends
        const wv = (w / 2) * lvl * end * (1 + 0.14 * (K.noise(seed, acc * 0.05, 0) - 0.5) * 2)
        const jl = (K.noise(seed + 3, acc * 0.4, 0) - 0.5) * 0.5 * u, jr = (K.noise(seed + 5, acc * 0.4, 0) - 0.5) * 0.5 * u
        Lp.push([c[i][0] + nx * (wv + jl), c[i][1] + ny * (wv + jl)]); Rp.push([c[i][0] - nx * (wv + jr), c[i][1] - ny * (wv + jr)])
      }
      if (!closed && n > 3) { // chisel ends: one corner slid along the stroke, a flat oblique facet
        const chisel = (i, j) => { const d = [c[j][0] - c[i][0], c[j][1] - c[i][1]], l = Math.hypot(d[0], d[1]) || 1, s = (r() < 0.5 ? 1 : -1) * w * (0.35 + r() * 0.5), P = s > 0 ? Lp : Rp; P[i] = [P[i][0] + (d[0] / l) * Math.abs(s), P[i][1] + (d[1] / l) * Math.abs(s)] }
        chisel(0, 2); chisel(n - 1, n - 3)
      }
      return [...Lp, ...Rp.reverse()]
    }
    // the baren's zig-zag rows over a block's box, and the area it has swept by k
    const rubOf = (b) => {
      const x0 = Math.max(box.x0, b.x0), x1 = Math.min(box.x1, b.x1), y0 = Math.max(box.y0, b.y0), y1 = Math.min(box.y1, b.y1)
      const pad = K.clamp(Math.min(x1 - x0, y1 - y0) / 2.5, 36 * u, 120 * u), band_ = pad * 0.72, rows = Math.max(1, Math.ceil((y1 - y0) / band_)), path = []
      for (let i = 0; i < rows; i++) { const y = y0 + band_ * (i + 0.5), l = x0 - pad * 0.2, rr = x1 + pad * 0.2; path.push(i % 2 ? [rr, y] : [l, y], i % 2 ? [l, y + band_ * 0.15] : [rr, y + band_ * 0.15]) }
      const pts = K.resample(path, Math.max(4, Math.round(K.length(path) / (pad / 5))))
      return { pts, pad, rows }
    }
    const rubClip = (ctx, rub, k, seed) => {
      const n = Math.max(1, Math.round(rub.pts.length * k))
      ctx.beginPath()
      for (let i = 0; i < n; i++) { const [x, y] = rub.pts[i], rr = (rub.pad / 2) * (0.9 + 0.2 * K.noise(seed, x * 0.05, y * 0.05)); ctx.moveTo(x + rr, y); ctx.arc(x, y, rr, 0, Math.PI * 2) }
      ctx.clip()
    }
    // the plank's figure: wavy growth rings and goma-zuri speckle, an alpha tile (where the pigment printed thin)
    const grainTile = () => {
      const key = `woodblock:grain:${env.scale}`
      if (env.cache.has(key)) return env.cache.get(key)
      const T = 384, n = Math.round(T * env.scale), c = K.canvas(n, n), x2 = c.getContext('2d'), img = x2.createImageData(n, n), d = img.data
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const lx = x / env.scale, ly = y / env.scale, warp = (K.fbm(501, lx, ly, 1 / 128, 3, T) - 0.5) * 70
        const ring = Math.sin((ly + warp) * 0.3 + (K.fbm(502, lx, ly, 1 / 64, 2, T) - 0.5) * 9), patch = K.smoothstep(0.42, 0.62, K.fbm(504, lx, ly, 1 / 96, 2, T))
        const fleck = K.fbm(503, lx, ly, 0.6, 1, T), v = K.clamp((ring - 0.72) * 3.5) * 0.75 * patch + K.clamp((fleck - 0.66) * 6) * 0.7, p = (y * n + x) * 4
        d[p] = d[p + 1] = d[p + 2] = 0; d[p + 3] = 255 * K.clamp(v)
      }
      x2.putImageData(img, 0, 0); env.cache.set(key, c); return c
    }
    // paint in painter's order inside a layer: own shapes printed, everything later that is not ours carved away
    const items = S.items
    const knock = (ctx, ownSet, drawOwn, b) => {
      for (const it of items) {
        const ib = it.bbox || (it.bbox = K.bbox(it.pts))
        if (ib.x0 > b.x1 || ib.x1 < b.x0 || ib.y0 > b.y1 || ib.y1 < b.y0) { if (ownSet.has(it)) drawOwn(it); continue }
        if (ownSet.has(it)) { drawOwn(it); continue }
        if (it.kind === 'region') {
          if (it.role === 'shadow' || it.role === 'highlight' || !ownSet.size) continue
          if (![...ownSet].some((q) => q.i < it.i)) continue
          ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); sub(ctx, it.pts); ctx.fill(); ctx.restore()
        } else if (K.isLight(it.color)) { // a light line is uncut wood: bare paper through every block
          ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); sub(ctx, band(it.pts, it.w / 2, K)); ctx.fill(); ctx.restore()
        }
      }
    }
    const slip = (seed) => { const r = K.rng(seed); return [(r() - 0.5) * 2 * o.register * u, (r() - 0.5) * 2 * o.register * u] }

    // ---------------------------------------------------------------- 1 keyblock: sumi line and the solid blacks, one pull
    D.pass('keyblock', 1.4, () => D.clip(box.pts, () => D.layer({}, () => {
      const lines = new Map()
      for (const r of S.regions) {
        if (r.role === 'shadow' || r.role === 'highlight') continue
        if (isBlack(r)) { lines.set(r, [r.pts]); continue }
        if (!r.contour && r.role !== 'glow') continue
        const w = (r.role === 'detail' ? 2.4 : 3.1) * u * (r.depth > 0.8 ? 0.7 : 1)
        lines.set(r, [carved(r.pts, w, r.i * 13 + 7, true)])
      }
      for (const l of S.lines) if (!K.isLight(l.color)) lines.set(l, [carved(l.pts, Math.max(1.7 * u, l.w * 0.75), l.i * 17 + 3)])
      const own = new Set([...lines.keys()].filter((x) => x.kind === 'region'))
      const rub = rubOf(box)
      D.mark(2 + rub.rows * 0.6, (ctx, k) => {
        ctx.save(); if (k < 1) rubClip(ctx, rub, k, 9)
        ctx.fillStyle = sumi
        for (const it of items) {
          if (it.kind === 'region' && !['shadow', 'glow', 'highlight'].includes(it.role) && !isBlack(it)) { // what is in front hides the lines behind it
            ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); sub(ctx, it.pts); ctx.fill(); ctx.restore()
          }
          const ps = lines.get(it)
          if (ps) { ctx.beginPath(); for (const p of ps) sub(ctx, p); ctx.fill() }
        }
        void own
        ctx.restore()
      })
    })))

    // ---------------------------------------------------------------- 2 colour blocks, lightest to darkest, each a pull
    const blocks = new Map()
    for (const r of S.regions) {
      if (r.role === 'shadow' || r.role === 'highlight' || isBlack(r)) continue
      const c = pig(r.role === 'glow' ? K.mix(r.color, r.lit, 0.3) : r.color)
      if (K.lum(c) > K.lum(paper) - 0.045) continue // uncut wood: white is bare washi
      const key = K.hex(K.rgb(c).map((v) => Math.round(v / 6) * 6))
      if (!blocks.has(key)) blocks.set(key, { color: c, regions: [] })
      blocks.get(key).regions.push(r)
    }
    const order = [...blocks.values()].sort((a, b) => K.lum(b.color) - K.lum(a.color))
    D.pass('colour blocks, lightest to darkest', 4, () => D.clip(box.pts, () => {
      order.forEach((blk, bi) => {
        const own = new Set(blk.regions), b = K.bbox(blk.regions.flatMap((r) => [[r.bbox.x0, r.bbox.y0], [r.bbox.x1, r.bbox.y1]]))
        const area = blk.regions.reduce((a, r) => a + r.area, 0), big = K.clamp(area / (S.W * S.H * 0.18)), rub = rubOf(b), seed = bi * 31 + 5, rot = (hash(bi, 3) - 0.5) * 0.2
        if (bi) D.pause(0.5) // a breath while the next block is inked
        D.layer({ blend: 'multiply', off: slip(seed) }, () => D.mark(1 + rub.rows * 0.45, (ctx, k) => {
          ctx.save(); if (k < 1) rubClip(ctx, rub, k, seed)
          ctx.fillStyle = blk.color
          knock(ctx, own, (r) => { ctx.beginPath(); sub(ctx, r.pts); ctx.fill() }, b)
          const g = o.grain * (0.04 + 0.22 * big)
          if (g > 0.01) { // the plank shows where the baren rubbed thin
            const pat = ctx.createPattern(grainTile(), 'repeat'); pat.setTransform(new DOMMatrix().rotate((rot * 180) / Math.PI).translate(hash(bi, 7) * 300, hash(bi, 9) * 300))
            ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = g; ctx.fillStyle = pat; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
          }
          ctx.restore()
        }))
      })
    }))

    // ---------------------------------------------------------------- 3 bokashi: graded wipes, the only tone
    const wipes = []
    for (const r of S.regions) {
      if (isBlack(r)) continue
      const base = pig(r.color)
      if (r.role === 'bg') wipes.push({ r, d: [0, 1], frac: 0.5, color: K.mix(base, '#3a4557', 0.55), a: 0.7 })
      else if (r.role === 'ground') wipes.push({ r, d: [0, -1], frac: 0.6, color: K.mix(base, '#2a2622', 0.5), a: 0.6 })
      else if (r.role === 'glow') wipes.push({ r, d: [0, 1], frac: 0.45, color: K.mix(base, '#c0473e', 0.55), a: 0.75 })
      else if (r.role === 'highlight') wipes.push({ r, d: [-Lt[0], -Lt[1]], frac: 1, color: K.mix(r.color, paper, 0.35), a: 0.8, light: true }) // gofun-bodied, opaque
      else if (r.role === 'shadow') wipes.push({ r, d: [-Lt[0], -Lt[1]], frac: 1.1, color: K.mix(r.color, '#2c3448', 0.5), a: 0.35 + 0.5 * r.strength, full: true })
      else if (r.role !== 'highlight' && r.form > 0.4 && K.lum(base) < K.lum(paper) - 0.045) wipes.push({ r, d: [Lt[0], Lt[1]], frac: 0.6, color: K.mix(K.shadeOf(base), '#3a4557', 0.3), a: 0.6 + 0.35 * r.form })
    }
    D.pass('bokashi', 2, () => D.clip(box.pts, () => {
      wipes.forEach((wp, wi) => {
        const { r } = wp, seed = 700 + r.i * 7, rub = rubOf(r.bbox), own = new Set([r])
        // the wipe runs from full on the far side (away from d) to nothing toward d
        const dx = -wp.d[0], dy = -wp.d[1], ex = -dy, ey = dx
        let p0 = Infinity, p1 = -Infinity, e0 = Infinity, e1 = -Infinity
        for (const [x, y] of r.pts) { const p = x * dx + y * dy, e = x * ex + y * ey; p0 = Math.min(p0, p); p1 = Math.max(p1, p); e0 = Math.min(e0, e); e1 = Math.max(e1, e) }
        // full at the edge farthest along -d … i.e. p1 is the far edge in the (dx,dy) frame
        const span = (p1 - p0) * wp.frac, rgb = K.rgb(wp.color), col = (a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`
        D.layer({ blend: wp.light ? 'source-over' : 'multiply', off: slip(seed) }, () => D.mark(0.6 + rub.rows * 0.3, (ctx, k) => {
          ctx.save(); if (k < 1) rubClip(ctx, rub, k, seed)
          knock(ctx, own, () => {
            ctx.save(); ctx.beginPath(); sub(ctx, r.pts); ctx.clip()
            ctx.transform(ex, ey, dx, dy, 0, 0) // local frame: x across the wipe, y along it (toward the full edge)
            // one gradient; the damp cloth's wavering edge is where the wiped area stops
            const st = 6 * u, gr = ctx.createLinearGradient(0, p1, 0, p1 - span * 1.15)
            gr.addColorStop(0, col(wp.a)); gr.addColorStop(wp.full ? 0.55 : 0.35, col(wp.a * 0.72)); gr.addColorStop(1, col(0))
            ctx.beginPath(); ctx.moveTo(e0 - st, p1 + 30 * u)
            for (let e = e0 - st; e <= e1 + st; e += st) ctx.lineTo(e, p1 - span * (0.8 + 0.5 * K.fbm(seed, e, 0, 0.01, 3)))
            ctx.lineTo(e1 + st, p1 + 30 * u); ctx.closePath(); ctx.fillStyle = gr; ctx.fill()
            ctx.restore()
          }, r.bbox)
          ctx.restore()
        }))
        void wi
      })
    }))

    D.top(() => {
      D.texture('kozo', { opacity: 0.55 })
      D.texture('paper', { opacity: 0.3 })
      // kozo: long, soft, curling bast fibres lying in the sheet (built once per size)
      D.mark(0.001, (ctx) => {
        const key = `woodblock:fibres:${S.W}x${S.H}@${env.scale}`
        let c = env.cache.get(key)
        if (!c) {
          c = K.canvas(S.W * env.scale, S.H * env.scale); const x = c.getContext('2d'), r = K.rng(513); x.setTransform(env.scale, 0, 0, env.scale, 0, 0)
          for (let i = 0; i < (S.W * S.H) / 2600; i++) {
            const px = r() * S.W, py = r() * S.H, len = (14 + r() ** 2 * 70) * u, a = r() * 6.283, b1 = (r() - 0.5) * 2, b2 = (r() - 0.5) * 2, pale = r() < 0.7
            x.strokeStyle = pale ? `rgba(255,252,242,${0.1 + r() * 0.18})` : `rgba(150,128,96,${0.05 + r() * 0.08})`; x.lineWidth = (0.3 + r() * 0.5) * u
            x.beginPath(); x.moveTo(px, py); x.bezierCurveTo(px + Math.cos(a + b1) * len * 0.35, py + Math.sin(a + b1) * len * 0.35, px + Math.cos(a + b2) * len * 0.7, py + Math.sin(a + b2) * len * 0.7, px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke()
          }
          env.cache.set(key, c)
        }
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(c, 0, 0); ctx.restore()
      })
    })
    void ribbonW
  },
}

// Newsprint halftone — studied from anidoodle's viaduct plate (halftone.ts · halftoneKit.ts · halftone.md). Re-implemented
// for the scene model. A web-offset newspaper press: the picture is held as a continuous-tone original, separated into two
// plates and broken by a contact screen into an AM halftone — dots on a fixed grid, their AREA carrying the tone. Black on
// the 45° screen and ONE spot colour on its own screen at 15° (30° apart, so they rosette, never moiré). Oil ink on
// unbleached groundwood newsprint: every dot GAINS into the fibres (most in the midtones), highlights under ~4% drop out to
// bare paper, the shadows plug into a solid with pinholes. The spot is a WARMTH, not a colour: only what is close to its
// hue carries it; the rest of the world is grey. No line anywhere: every edge is where dot size changes.
// The film is MAKE-READY at the delivery pile: sheets are thrown on, the spot unit comes up to colour (starved, streaked
// along the feed, evening out key by key), then the black unit over it, then the pressman nudges the spot into register.
//
// defaults (overridable by a house style):
//   paper — newsprint     black — the black ink     spot — the one spot ink (any hue: its hue decides what carries it)
//   pitch — screen pitch in px at 1080 (bigger = coarser)     angles — [black, spot] screen angles in degrees
//   gain  — dot gain in px     spotAmount — how strongly near-hue colours take the spot
//   margin — bare newsprint round the photo (fraction of the short side)     misregister — [dx, dy] px the spot lands off
//   sheets — how many make-ready sheets per unit
import { unit, inner, sub, hash, truePlate } from './_cut.js'

export default {
  id: 'halftone', name: 'Newsprint halftone', ko: '신문 망점 인쇄',
  medium: 'web-offset newspaper press: black plus one spot ink, oil ink on unbleached groundwood newsprint',
  mark: 'only AM halftone dots: black on a 45° screen, the spot on 15°; dot area carries the tone, ink gain, plugged shadows',
  edge: "no line anywhere — an edge is where dot size changes; the photo's rectangle, the spot a hair off register",
  order: ['spot unit comes up to colour', 'black unit comes up over it', 'spot nudged into register'],
  paper: 'unbleached newsprint: grey-cream pulp cloud, short dark fibres, the odd bark shive',
  palette: 'black ink and one spot (orange by default) on newsprint; colour becomes black tone plus the spot',
  bestFor: '레트로 신문 · 잡지 포스터 · 사진 같은 장면, 굵직한 명암',
  source: 'anidoodle halftone.ts · halftoneKit.ts · halftone.md',
  defaults: { paper: '#e6dfcc', black: '#1d1a17', spot: '#e86a2c', pitch: 7, angles: [45, 15], gain: 0.45, spotAmount: 1, margin: 0.035, misregister: [2.2, 1.4], sheets: 4 },

  draw(D, S, K, o) {
    const u = unit(S), env = D.env, box = inner(S, o.margin), W = S.W, H = S.H, sc = env.scale
    const P = K.rgb(o.paper).map((v) => v / 255), SP = K.rgb(o.spot).map((v) => v / 255), hs = K.toHsl(o.spot)[0]
    const lumOf = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], lumP = lumOf(P)

    // ---- the original, separated: black density and spot density at any point
    const TP = truePlate(S, K)
    const sep = (x, y) => {
      const c = TP.colorAt(x, y), cc = c.map((v) => v / 255), [h] = K.toHsl(K.hex(c))
      const sim = Math.max(0, Math.cos(((h - hs) * Math.PI) / 180)) ** 3
      const chroma = (Math.max(...c) - Math.min(...c)) / 255, s = K.clamp(o.spotAmount * 2.6 * Math.max(0, chroma - 0.08) ** 1.1 * sim) // chroma, not HSL saturation: pale colours stay grey
      const after = lumOf(P.map((p, i) => p * (1 - s + s * SP[i]))) // what the spot alone leaves
      let k = K.clamp((1 - lumOf(cc) / Math.min(after, lumP)) * 1.08) ** 1.05
      // a photograph has contact shadow where a thing sits behind another: darken just outside a nearer thing's edge
      const r = S.regionAt(x, y)
      if (r) for (const [d, a] of [[6 * u, 0.3], [13 * u, 0.12]]) {
        let hit = 0
        for (const [ox, oy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) { const q = S.regionAt(x + ox, y + oy); if (q && q.i > r.i && q.role !== 'glow' && q.role !== 'bg') hit = 1 }
        if (hit) { k = K.clamp(k + a * (1 - k)); break }
      }
      return [k, Math.min(s, 0.86)]
    }
    // ---- the screen: dots on a rotated grid, area-true, swelling into a solid past 70%, gaining in the midtones
    const pitch = o.pitch * u
    const screen = (ang, ch, fan = 0) => {
      const a = (ang * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), cx = W / 2, cy = H / 2, R = Math.hypot(box.x1 - box.x0, box.y1 - box.y0) / 2 + pitch, out = []
      for (let i = -R; i <= R; i += pitch) for (let j = -R; j <= R; j += pitch) {
        const x = cx + i * c - j * s, y = cy + i * s + j * c
        if (x < box.x0 || x > box.x1 || y < box.y0 || y > box.y1) continue
        const t = sep(x, y)[ch]
        if (t < 0.045) continue // the finest highlight dots do not hold on newsprint
        const r = pitch * (Math.sqrt(t / Math.PI) + 0.17 * t * t * t) + o.gain * u * (0.5 + 2 * t * (1 - t))
        out.push([x + (x - box.x0) * fan, y, r])
      }
      return out
    }
    const dotsK = screen(o.angles[0], 0), dotsS = screen(o.angles[1], 1, 0.0025)

    // ---- the plates, inked once per drawing: irregular heptagons (bitten by a per-dot hash) over a soft halo of spread ink
    const token = {}
    const plate = (name, dots, color, seed) => {
      const key = `halftone:${name}:${W}x${H}@${sc}`
      let slot = env.cache.get(key)
      if (!slot) { slot = { c: K.canvas(W * sc, H * sc), token: null }; env.cache.set(key, slot) }
      if (slot.token === token) return slot.c
      const x = slot.c.getContext('2d')
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, slot.c.width, slot.c.height); x.setTransform(sc, 0, 0, sc, 0, 0); x.fillStyle = color
      const heps = (grow) => {
        x.beginPath()
        for (const [px, py, r0] of dots) {
          const r = r0 + grow; if (r < 0.35 * u) continue
          const h = hash(px, py, seed) * 1000, a0 = (h % 1) * 6.283
          for (let q = 0; q <= 7; q++) { const a = a0 + (q / 7) * 6.283, w = 1 + 0.14 * Math.sin(a * 2 + h) + 0.08 * Math.sin(a * 3 + h * 1.7), X = px + Math.cos(a) * r * w, Y = py + Math.sin(a) * r * w; q ? x.lineTo(X, Y) : x.moveTo(X, Y) }
        }
        x.fill()
      }
      x.globalAlpha = 0.2; heps(0.9 * u); x.globalAlpha = 1; heps(0)
      slot.token = token
      return slot.c
    }
    const scratch = () => { const key = `halftone:scratch:${W}x${H}@${sc}`; if (!env.cache.has(key)) env.cache.set(key, K.canvas(W * sc, H * sc)); return env.cache.get(key) }
    // a unit still coming up to colour: ink knocked out in streaks along the feed and a blotchy speckle, uneven key by key
    const inked = (ctx, src, starve, off, seed) => {
      ctx.save(); ctx.globalCompositeOperation = 'multiply' // the caller has set device space (plus the sheet's slide)
      if (starve <= 0.001) { ctx.drawImage(src, Math.round(off[0] * sc), Math.round(off[1] * sc)); ctx.restore(); return }
      const T = scratch(), x = T.getContext('2d')
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'copy'; x.globalAlpha = 1; x.drawImage(src, 0, 0)
      x.globalCompositeOperation = 'destination-out'
      const streak = x.createPattern(K.tile('dry', env), 'repeat'); streak.setTransform(new DOMMatrix().translate(seed * 37, 0).rotate(90).scale(2.4))
      const blot = x.createPattern(K.tile('mottle', env), 'repeat'); blot.setTransform(new DOMMatrix().translate(seed * 53, seed * 11))
      // the ink keys across the width: each a little different
      const keys = 12, kw = T.width / keys
      for (let i = 0; i < keys; i++) {
        const a = K.clamp(starve * (0.55 + 0.9 * K.noise(seed, i * 0.7, 0)))
        x.globalAlpha = a; x.fillStyle = streak; x.fillRect(i * kw, 0, kw + 1, T.height)
        x.globalAlpha = a * 0.8; x.fillStyle = blot; x.fillRect(i * kw, 0, kw + 1, T.height)
      }
      ctx.drawImage(T, Math.round(off[0] * sc), Math.round(off[1] * sc)); ctx.restore()
    }
    // one sheet thrown onto the delivery pile: it slides in from its head and lands, its shadow on the sheet below
    // A landed sheet hides every sheet under it, so a landed sheet is only put down when something comes after it (the
    // next sheet sliding in, or the top of the pile): a still draws one sheet, not the whole pile.
    const pile = { pending: null }
    const flush = (ctx) => { const p = pile.pending; pile.pending = null; if (p) put(ctx, p, 1) }
    const sheet = (spot, black) => D.mark(1, (ctx, k) => {
      if (k >= 1) { pile.pending = { spot, black }; return }
      flush(ctx); put(ctx, { spot, black }, k)
    })
    const put = (ctx, { spot, black }, k) => {
      const e = 1 - (1 - k) ** 3, dy = -(1 - e) * H * 1.04
      ctx.save()
      if (k < 1) { const g = ctx.createLinearGradient(0, dy + H, 0, dy + H + 26 * u); g.addColorStop(0, 'rgba(30,24,16,0.35)'); g.addColorStop(1, 'rgba(30,24,16,0)'); ctx.fillStyle = g; ctx.fillRect(0, dy + H, W, 26 * u) }
      ctx.translate(0, dy)
      ctx.fillStyle = o.paper; ctx.fillRect(-2, -2, W + 4, H + 4)
      const t = ctx.getTransform(); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, t.f)
      if (spot) inked(ctx, plate('spot', dotsS, o.spot, 3), spot.starve, spot.off, spot.seed)
      if (black) inked(ctx, plate('black', dotsK, o.black, 7), black.starve, [0, 0], black.seed)
      ctx.restore(); ctx.restore()
    }
    const n = Math.max(1, Math.round(o.sheets)), mr = o.misregister.map((v) => v * u), far = [mr[0] + 9 * u, mr[1] - 6 * u]

    D.ground(() => { D.mark(0.001, () => { pile.pending = null }); D.sheet(o.paper) })
    D.pass('spot unit comes up to colour', 2, () => { for (let j = 0; j < n; j++) sheet({ starve: 0.95 * (1 - (j + 1) / (n + 0.6)) + 0.05, off: far, seed: j + 1 }, null) })
    D.pass('black unit comes up over it', 3, () => { for (let j = 0; j < n; j++) sheet({ starve: 0, off: far, seed: 0 }, { starve: j === n - 1 ? 0.12 : 0.95 * (1 - (j + 1) / n) + 0.12, seed: j + 11 }) })
    D.pass('spot nudged into register', 1, () => {
      for (let j = 1; j <= 3; j++) { const f = j / 3; sheet({ starve: 0, off: [K.lerp(far[0], mr[0], f), K.lerp(far[1], mr[1], f)], seed: 0 }, { starve: j < 3 ? 0.06 : 0, seed: 30 + j }) }
    })

    D.top(() => {
      D.mark(0.001, (ctx) => flush(ctx))
      D.texture('newsprint', { opacity: 0.5 })
      D.texture('paper', { opacity: 0.4 })
      D.mark(0.001, (ctx) => { // groundwood: short dark fibres, pale surface fibres, the odd bark shive (built once per size)
        const key = `halftone:fibres:${W}x${H}@${sc}`
        let c = env.cache.get(key)
        if (!c) {
          c = K.canvas(W * sc, H * sc); const x = c.getContext('2d'), r = K.rng(303); x.setTransform(sc, 0, 0, sc, 0, 0)
          for (let i = 0; i < (W * H) / 900; i++) {
            const px = r() * W, py = r() * H, len = (1.5 + r() ** 3 * 12) * u, a = r() * 6.283, b = (r() - 0.5) * 0.9, dark = r() < 0.8
            x.strokeStyle = dark ? `rgba(92,78,58,${0.08 + r() * 0.18})` : `rgba(250,246,236,${0.25 + r() * 0.35})`; x.lineWidth = (0.35 + r() * 0.5) * u
            x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + b) * len * 0.5, py + Math.sin(a + b) * len * 0.5, px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke()
          }
          for (let i = 0; i < (W * H) / 60000; i++) { const px = r() * W, py = r() * H, s = (0.6 + r() * 1.1) * u; x.fillStyle = `rgba(70,55,40,${0.25 + r() * 0.3})`; x.beginPath(); x.ellipse(px, py, s, s * (0.4 + r() * 0.5), r() * 3, 0, 6.283); x.fill() }
          env.cache.set(key, c)
        }
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(c, 0, 0); ctx.restore()
      })
    })
    void sub
  },
}

// Single-line engraving — studied from anidoodle's mellan plate and its unspooling film (Claude Mellan's 1649
// Sudarium: one unbroken engraved spiral whose weight alone makes the picture; the burin swells where the plate should
// print dark and runs to a hair where it should be light). Re-implemented for the scene model.
//
// ONE Archimedean spiral is walked out from the picture's focal point (the main subject's middle, as Mellan started at
// the tip of the nose) in near-constant arc steps; at every step the line's width is set from the value underneath
// (S.tone). The whole picture is a single filled ribbon, one stroke never lifted, printed only inside the copper plate.
// The film unspools it from its start, paced by ink: the burin races through the light and slows where it cuts deep.
//
// defaults (all overridable by a house style):
//   paper  the damp-printed sheet     ink   the copperplate ink
//   pitch  px between neighbouring turns at 1080 (smaller = finer, slower)
//   centre null = the focal subject, or [fx, fy] as fractions of the picture
//   margin the plate's edge inset (px at 1080); the plate mark is pressed round it
import { focal } from './_tone.js'

export default {
  id: 'engraving', name: 'Single-line engraving', ko: '한 줄 동판화',
  medium: 'a burin cutting one line into a copper plate, printed in black on damp paper',
  mark: 'one unbroken spiral from a centre; its width alone carries the value',
  edge: 'no outlines: a form ends where the line thickens or thins as it crosses it',
  order: ['the plate', 'one line, unspooled from the centre'],
  paper: 'warm white printing paper with a plate mark pressed round the image',
  palette: 'one black ink on warm white; value only',
  bestFor: '오래 남는 한 장 · 포스터, 표지, 초상 · 진지한 주제',
  source: 'anidoodle mellan.ts · mellanUnspool.ts',
  defaults: { paper: '#f2ead8', ink: '#17130f', pitch: 5.4, centre: null, margin: 40 },
  draw(D, S, K, o) {
    const W = S.W, H = S.H, u = Math.min(W, H) / 1080, p = (o.pitch ?? 5.4) * u, m = (o.margin ?? 40) * u
    const c = Array.isArray(o.centre) ? [o.centre[0] * W, o.centre[1] * H] : focal(S)
    const x0 = m, y0 = m, x1 = W - m, y1 = H - m

    // the value, stretched over the picture's own range so every scene uses the full weight of the line
    const vals = []
    for (let y = 9; y < H; y += 18) for (let x = 9; x < W; x += 18) vals.push(S.tone(x, y))
    vals.sort((a, b) => a - b)
    const lo = vals[Math.floor(vals.length * 0.02)], hi = vals[Math.floor(vals.length * 0.985)], span = Math.max(0.2, hi - lo)

    // walk the spiral r = a·θ outward; record both edges of the ribbon and the ink laid so far
    const a = p / (Math.PI * 2), rMax = Math.max(...[[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => Math.hypot(x - c[0], y - c[1]))) + p
    const thMax = rMax / a, ds = 1.5 * u
    const cap = Math.ceil((Math.PI * rMax * rMax) / p / ds * 1.1) + 1000
    let Lx = new Float32Array(cap), Ly = new Float32Array(cap), Rx = new Float32Array(cap), Ry = new Float32Array(cap), ink = new Float32Array(cap), on = new Uint8Array(cap)
    let n = 0, laid = 0, th = 0.6
    while (th < thMax && n < cap) {
      const r = a * th, ct = Math.cos(th), st = Math.sin(th), x = c[0] + ct * r, y = c[1] + st * r
      const inside = x > x0 - p && x < x1 + p && y > y0 - p && y < y1 + p
      const step = inside ? ds : 8 * ds
      if (inside) {
        const v = K.clamp((S.tone(x, y) - lo) / span), dark = K.smoothstep(0.02, 0.98, 1 - v)
        const w = p * (0.08 + 0.84 * dark) * Math.min(1, r / (40 * u)) / 2
        const tx = -st * r + ct * a, ty = ct * r + st * a, tl = Math.hypot(tx, ty), nx = ty / tl, ny = -tx / tl
        Lx[n] = x + nx * w; Ly[n] = y + ny * w; Rx[n] = x - nx * w; Ry[n] = y - ny * w; on[n] = 1
        laid += 2 * w * ds
      } else { Lx[n] = Rx[n] = x; Ly[n] = Ry[n] = y; on[n] = 0 }
      ink[n] = laid; n++
      th += step / Math.max(r, step)
    }

    D.ground(() => {
      D.sheet(o.paper)
      // the plate mark: the copper's bevelled edge pressed into damp paper, a hair of shadow on two sides
      D.mark(0.001, (ctx) => {
        ctx.save(); ctx.lineWidth = 2 * u; ctx.strokeStyle = 'rgba(60,45,30,0.28)'; ctx.strokeRect(m - 6 * u, m - 6 * u, W - 2 * m + 12 * u, H - 2 * m + 12 * u)
        ctx.lineWidth = 1.2 * u; ctx.strokeStyle = 'rgba(255,252,240,0.7)'; ctx.strokeRect(m - 7.5 * u, m - 7.5 * u, W - 2 * m + 12 * u, H - 2 * m + 12 * u); ctx.restore()
      })
    })

    D.pass('one line, unspooled from the centre', 1, () => {
      const total = laid || 1
      D.mark(Math.max(1, total / (400 * u * u)), (ctx, k) => {
        // the first k of the INK, not of the length (equal ink per moment of the film)
        let end = n
        if (k < 1) { const want = total * k; let lo2 = 0, hi2 = n - 1; while (lo2 < hi2) { const mid = (lo2 + hi2) >> 1; if (ink[mid] < want) lo2 = mid + 1; else hi2 = mid } end = Math.max(2, lo2 + 1) }
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip()
        ctx.fillStyle = o.ink; ctx.beginPath()
        // one ribbon, traced as overlapping pieces of one path (nonzero: their union, no seams); off-plate stretches skipped
        const CH = 2500
        let i = 0
        while (i < end) {
          while (i < end && !on[i]) i++
          if (i >= end) break
          let j = i
          while (j < end && on[j] && j - i < CH) j++
          const e = Math.min(end - 1, j) // one sample of overlap with the next piece
          ctx.moveTo(Lx[i], Ly[i]); for (let q = i + 1; q <= e; q++) ctx.lineTo(Lx[q], Ly[q])
          for (let q = e; q >= i; q--) ctx.lineTo(Rx[q], Ry[q])
          ctx.closePath()
          i = j < end && on[j] ? j : j + 1
          if (j < end && on[j]) i = j // continue the same run from the overlap
        }
        ctx.fill(); ctx.restore()
      })
    })

    D.top(() => D.texture('paper', { opacity: 0.3 }))
  },
}

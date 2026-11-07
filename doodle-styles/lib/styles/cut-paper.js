// Cut-paper collage — studied from anidoodle's fox plate (fox.ts, foxDraw.ts, styles/foxDraw.md) and re-made for the
// scene model. There is not one drawn line: every form is a piece of coloured paper. TORN pieces show the white
// fibrous core of the sheet along their edge, SCISSOR-cut pieces are crisp, and every piece lifts a little off the one
// under it and throws a soft shadow. Form is made the way a collage artist makes it: a darker torn piece laid into
// the shade, a lighter one where the light lands (never a gradient). Lines become narrow strips of paper.
// Order: the backing board, then the big sheets of the room (slid in from their own edge), then the pieces back to
// front (each held above the stack, lowered and pressed: its shadow pulls in tight), then the strips and wisps.
import { PAPER_CORE, LIFT, p2d, rectness, tear, scissor, strip, fibres, liftShadow } from './_craft.js'

export default {
  id: 'cut-paper', name: 'Cut-paper collage', ko: '종이 콜라주',
  medium: 'torn and scissor-cut coloured papers glued on a backing board, each lowered by hand onto the stack',
  mark: 'the piece of paper: torn with a white fibrous core showing, or scissor-crisp; form by a darker or lighter torn piece laid on top',
  edge: 'torn edges bite in and out with the white heart of the sheet showing; scissor edges crisp; every piece lifts a soft shadow off the one below',
  order: ['backing sheets', 'pieces, back to front', 'strips and wisps'],
  paper: 'a warm grey backing board; every piece its own dyed paper with fibres and uneven dye',
  palette: "the subject's own colours as dyed papers; shade and light are other papers, never a gradient",
  bestFor: '따뜻하고 손맛 나는 포스터 · 동물, 풍경, 그림책 · 표지',
  source: 'anidoodle fox.ts · foxDraw.ts · styles/foxDraw.md',
  // board: the backing board · core: the white heart of a torn sheet · shadow: the lift shadow colour
  // lift: how high pieces stand (shadow distance, 1 = default) · tear: how ragged torn edges are (1 = default)
  // fibre: fibre density (1 = default)
  defaults: { board: '#e6dcc7', core: PAPER_CORE, shadow: LIFT, lift: 1, tear: 1, fibre: 1 },
  draw(D, S, K, o) {
    const L = S.light, AW = [-L[0], -L[1]], W = S.W, H = S.H
    const room = new Set(['bg', 'ground', 'glow', 'highlight'])
    D.ground(() => D.sheet(o.board))

    // ---- every region's piece of paper, decided once (its edge, its colour, how high it stands)
    const under = (r) => { for (let j = S.solid.length - 1; j >= 0; j--) { const q = S.solid[j]; if (q.i < r.i && K.inside(q.pts, r.centre[0], r.centre[1])) return q.color } return S.bg }
    const P = new Map()
    for (const r of S.regions) {
      const b = r.bbox, small = Math.min(b.w, b.h), seed = r.i * 17 + 5
      let torn = 0
      if (r.role === 'ground') torn = 3.4
      else if (r.role === 'shadow') torn = 2.4
      else if (r.role === 'highlight') torn = 3.6
      else if (r.role === 'subject' && rectness(r.pts) < 0.88 && small > 24) torn = K.clamp(Math.sqrt(r.area) / 70, 1.4, 3.2)
      else if (r.role === 'detail' && r.area > 9000 && rectness(r.pts) < 0.85) torn = 1.6
      torn *= o.tear
      let color = r.color
      if (r.role === 'shadow') color = K.mix(under(r), K.mix(r.color, '#000000', 0.15), 0.32 + 0.4 * r.strength)
      else if (r.role === 'highlight') color = K.mix(under(r), K.lighten(r.color, 0.25), 0.62)
      else if (r.role === 'glow') color = r.lit
      const face = torn ? tear(r.pts, torn, seed) : scissor(r.pts, seed)
      const core = torn ? tear(r.pts, torn * 0.8, seed + 1, torn * 0.75) : null
      const lift = o.lift * (r.role === 'bg' ? 0 : r.role === 'ground' ? 0.7 : r.role === 'shadow' || r.role === 'highlight' ? 0.3 : r.role === 'glow' ? 0.4 : r.role === 'detail' ? 0.6 : 1 + 0.5 * (1 - r.depth))
      P.set(r.i, { r, face, core, torn, color, lift, seed, fp: p2d(face), cp: core && p2d(core), fb: K.bbox(face) })
    }
    const occ = (it) => { const b = it.bbox || K.bbox(it.pts); return S.solid.filter((q) => q.i > it.i && q.bbox.x0 < b.x1 && q.bbox.x1 > b.x0 && q.bbox.y0 < b.y1 && q.bbox.y1 > b.y0).map((q) => P.get(q.i).face) }

    // ---- one piece goes down: held above the stack (shadow wide and far), lowered, pressed (shadow tight)
    const ease = (u) => 1 - (1 - u) ** 3
    const lay = (pc, { slide = null, cost = 1, fibre = 1 } = {}) => {
      const { fp, cp, fb, color, lift, seed } = pc, rr = K.rng(seed + 3), a = rr() * Math.PI * 2, far = 18 + rr() * 14
      D.mark(cost, (ctx, k) => {
        const e = k >= 1 ? 1 : ease(k), h = (1 - e) * (1 - e)
        const mv = slide ? [slide[0] * (1 - e), slide[1] * (1 - e)] : [Math.cos(a) * far * (1 - e), Math.sin(a) * far * (1 - e)]
        ctx.save(); ctx.translate(mv[0], mv[1])
        if (lift > 0) { const d = (2 + 3 * lift) * (1 + 4 * h); liftShadow(ctx, fp, AW[0] * d, AW[1] * d + 1, 2 + 2.5 * lift + 8 * h, 0.42 - 0.12 * h, o.shadow) }
        if (cp) { ctx.fillStyle = o.core; ctx.fill(cp) }
        ctx.fillStyle = color; ctx.fill(fp)
        fibres(ctx, fp, fb, color, seed + 2, fibre * o.fibre)
        ctx.restore()
      })
    }
    // a darker (or lighter) torn piece laid into part of a piece: `hole` is the torn edge it was torn along;
    // the scrap is the piece minus the hole (inside = false) or the hole itself, inside the piece (inside = true)
    const scrap = (pc, hole, holeCore, color, { inside = false, shadow = 0, cost = 0.5 } = {}) => {
      const hp = p2d(hole), hc = holeCore && p2d(holeCore), big = p2d([[-60, -60], [W + 60, -60], [W + 60, H + 60], [-60, H + 60]], hole)
      const bigC = holeCore && p2d([[-60, -60], [W + 60, -60], [W + 60, H + 60], [-60, H + 60]], holeCore), sb = K.bbox(hole)
      D.mark(cost, (ctx) => {
        ctx.save(); ctx.clip(pc.fp)
        if (inside) {
          if (shadow) liftShadow(ctx, hp, AW[0] * shadow, AW[1] * shadow, 1.5 + shadow, 0.38, o.shadow)
          if (hc) { ctx.fillStyle = o.core; ctx.fill(hc) }
          ctx.fillStyle = color; ctx.fill(hp); fibres(ctx, hp, sb, color, pc.seed + 41, 0.8 * o.fibre)
        } else {
          if (bigC) { ctx.fillStyle = o.core; ctx.fill(bigC, 'evenodd') }
          ctx.fillStyle = color; ctx.fill(big, 'evenodd')
          ctx.save(); ctx.clip(big, 'evenodd'); fibres(ctx, pc.fp, pc.fb, color, pc.seed + 43, 0.6 * o.fibre); ctx.restore()
        }
        ctx.restore()
      })
    }
    const shadeAndLight = (pc) => {
      const r = pc.r, b = r.bbox, small = Math.min(b.w, b.h)
      if (['shadow', 'highlight', 'glow'].includes(r.role) || small < 26) return
      // a big sheet (wall, floor) stays one paper: a torn shade band across it read as a stray white line, not light
      if (r.role === 'bg' || r.role === 'ground') return
      if (r.form < 0.3) return
      const d = small * (0.07 + 0.09 * r.form), amp = K.clamp(small / 70, 1.2, 3) * o.tear
      const b1 = K.translate(r.pts, L[0] * d, L[1] * d)
      scrap(pc, tear(b1, amp, pc.seed + 11), tear(b1, amp * 0.8, pc.seed + 12, -amp * 0.75), K.mix(r.color, r.shade, 0.5))
      if (r.form > 0.75 && small > 60) {
        const b2 = K.translate(r.pts, L[0] * d * 2.1, L[1] * d * 2.1)
        scrap(pc, tear(b2, amp, pc.seed + 13), tear(b2, amp * 0.8, pc.seed + 14, -amp * 0.75), K.mix(r.color, r.shade, 0.9))
      }
      if (r.form >= 0.5 && small > 40) {
        const blob = K.blob(b.cx + L[0] * b.w * 0.2, b.cy + L[1] * b.h * 0.22, small * 0.19, { sx: 1.35, sy: 0.8, rot: Math.atan2(L[1], L[0]) + Math.PI / 2, seed: pc.seed, wob: 0.2 })
        scrap(pc, tear(blob, amp * 0.9, pc.seed + 15), tear(blob, amp * 0.7, pc.seed + 16, amp * 0.7), K.mix(r.color, r.lit, 0.6), { inside: true, shadow: 1.6 })
      }
    }
    const place = (r) => {
      const pc = P.get(r.i), big = r.area > W * H * 0.2
      let slide = null
      if (big) { const b = r.bbox; slide = b.cy > H * 0.55 ? [0, H * 0.18] : b.cy < H * 0.45 ? [0, -H * 0.18] : [b.cx < W / 2 ? -W * 0.2 : W * 0.2, 0] }
      const cost = big ? 1.2 : 0.5 + Math.sqrt(r.area) / 160
      lay(pc, { slide, cost, fibre: r.role === 'bg' ? 0.6 : 1 })
      shadeAndLight(pc)
    }

    // ---- the room's big sheets first (the prefix of back things), then the pieces, back to front
    let split = S.items.findIndex((it) => it.kind === 'region' && !room.has(it.role) && it.depth < 0.8)
    if (split < 0) split = S.items.length
    const back = S.items.slice(0, split).filter((it) => it.kind === 'region'), front = S.items.slice(split).filter((it) => it.kind === 'region')
    D.pass('backing sheets', 2, () => { for (const r of back) place(r) })
    D.pass('pieces, back to front', 5, () => { D.pause(0.6); for (const r of front) place(r) })

    // ---- lines are narrow strips: dark ones scissor-cut card, light ones torn tissue (steam, a white bar)
    D.pass('strips and wisps', 1.2, () => {
      D.pause(0.4)
      for (const l of S.lines) {
        const light = K.isLight(l.color), half = Math.max(light ? 2.6 : 1.5, l.w * (light ? 0.55 : 0.5)), seed = l.i * 29 + 3
        const band = strip(K.smooth(l.pts, false, 6), half)
        const face = light ? tear(band, Math.min(1.6, half * 0.4), seed) : scissor(band, seed, 3)
        const core = light ? tear(band, Math.min(1.3, half * 0.3), seed + 1, 0.9) : null
        const pc = { fp: p2d(face), cp: core && p2d(core), fb: K.bbox(face), color: light ? K.mix(l.color, '#ffffff', 0.3) : l.color, lift: 0.5, seed }
        const cut = occ(l)
        if (cut.length) D.layer({ cut }, () => lay(pc, { cost: 0.4, fibre: 0.5 }))
        else lay(pc, { cost: 0.4, fibre: 0.5 })
      }
    })
    D.top(() => D.texture('paper', { opacity: 0.22 }))
  },
}

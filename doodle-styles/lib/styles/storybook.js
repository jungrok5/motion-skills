// Storybook pencil + watercolour — studied from anidoodle's storybook plate and its drawn film (storybook.ts ·
// storybookDraw.ts · styles/storybookDraw.md). The picture-book page, not the field sketch: blue-grey construction
// (ovals, gesture and centre lines) left in, a light pencil drawing over it, then gentle pan-watercolour washes that
// stop short of the sheet — each form a soft shade colour with the local tint shifted toward the light, a lifted
// highlight, a rosy blush — then the FULL soft-graphite line all round (gone over twice, never lost), little hatch
// accents in the shade, paint flicked off the brush, and a warm vignette.
// Not `watercolour`: that hand is granulating cold-press, washes that miss their line, lost edges, graphite only on the
// shade side. This one is pastel, smooth and rounded, outlined all round, framed by a painted vignette with bare margins.
//
// defaults (all overridable by a house style):
//   paper      the warm sheet               graphite   the soft pencil      construct  the blue-grey construction pencil
//   blush      the rosy accent              pastel     0..1 how far colours are softened toward the warm paper
//   lilac      the cool of shadows          margin     the bare-paper margin the painting stops short of (fraction of the short side)
//   vignette   the warm darkening at the corners      spatter   paint flicked off the brush (true / false)
export default {
  id: 'storybook', name: 'Storybook pencil + watercolour', ko: '그림책 연필 수채',
  medium: 'soft graphite and gentle pan watercolour on warm cold-press, the way a picture-book page is made',
  mark: 'pastel washes that turn each form toward the light (shade colour under, tint shifted to the light, a lifted highlight, a rosy blush); a soft graphite line all round, gone over twice',
  edge: 'a full, rounded pencil outline everywhere — never lost; the painting itself stops short of the sheet in a ragged vignette',
  order: ['construction', 'pencil drawing', 'washes', 'final line', 'paint off the brush'],
  paper: 'warm white cold-press, smooth under the paint, bare at the margins',
  palette: "the subject's colours softened to pastel and warmed; lilac shadows; rosy accents",
  bestFor: '그림책 · 캐릭터와 다정한 장면 · 아이와 가족 · 따뜻한 이야기',
  source: 'anidoodle storybook.ts · storybookDraw.ts · styles/storybookDraw.md',
  defaults: { paper: '#fbf6ea', graphite: '#3d3437', construct: '#8d90a6', blush: '#f2899c', lilac: '#7d6fa8', pastel: 0.3, margin: 0.045, vignette: 'rgba(90,50,50,0.13)', spatter: true },
  draw(D, S, K, o) {
    const W = S.W, H = S.H, sc = Math.sqrt((W * H) / (1080 * 1080)), gr = o.graphite, paper = o.paper
    const tint = (c) => K.mix(K.adjust(c, { sat: 0.92, light: 1.06 }), '#fff3e4', o.pastel)
    const shadeTint = (r) => K.mix(K.mix(r.shade, o.lilac, 0.22), '#fff3e4', o.pastel * 0.6)
    const solid = S.regions.filter((r) => !['shadow', 'glow', 'highlight'].includes(r.role))
    const topFirst = [...solid].sort((a, b) => a.bbox.y0 - b.bbox.y0) // the illustrator draws head first and works down
    const round = (r) => r.form >= 0.5 && r.role === 'subject'

    // the page: the painting stops short of the sheet, its edge ragged like a dry brush
    const m = Math.min(W, H) * o.margin
    const page = K.displace(K.densify([[m, m], [W - m, m], [W - m, H - m], [m, H - m]], 10, true), m * 0.9, 0.012, 7)

    D.ground(() => D.sheet(paper))

    D.pass('construction', 0.6, () => {
      const c = o.construct
      for (const r of solid) {
        if (!round(r) || r.area < 5000) continue
        const b = r.bbox, rr = K.rng(r.i + 5), lean = (rr() - 0.5) * 0.12 * b.h
        const ov = K.ellipse(b.cx, b.cy, b.w * 0.52, b.h * 0.52, 36, rr() * 6)
        D.stroke(ov, { closed: true, w: 1.4, color: c, alpha: 0.45, taper: 0.3, pressure: 0.2, wobble: 2, seed: r.i + 1, cost: 0.5 })
        D.stroke([[b.cx - lean, b.y0 - b.h * 0.1], [b.cx + lean, b.y1 + b.h * 0.08]], { w: 1.3, color: c, alpha: 0.42, taper: 0.6, seed: r.i + 2, cost: 0.5 })
        D.stroke([[b.x0 - b.w * 0.06, b.cy - b.h * 0.12], [b.x1 + b.w * 0.06, b.cy - b.h * 0.14]], { w: 1.2, color: c, alpha: 0.38, taper: 0.6, seed: r.i + 3, cost: 0.5 })
      }
      for (const r of S.regions) if (r.role === 'ground') D.stroke(K.segment([m * 0.6, r.bbox.y0 + 2], [W - m * 0.6, r.bbox.y0 - 1], 3, 10), { w: 1.4, color: c, alpha: 0.4, taper: 0.5, seed: r.i + 9, cost: 0.4 })
    })

    // a contour in soft graphite, cut where something in front hides it
    const outline = (r, w, alpha, seedK, wob) => D.layer({ tooth: 'fine', cut: S.occluders(r, { light: false }) }, () =>
      D.stroke(r.pts, { closed: true, w, color: gr, alpha, taper: 0.55, pressure: 0.5, wobble: wob, seed: r.i * 7 + seedK, rough: 0.35, cost: 0.7 }))
    const dark = S.lines.filter((l) => !K.isLight(l.color)), light = S.lines.filter((l) => K.isLight(l.color))

    D.pass('pencil drawing', 1.2, () => {
      for (const r of topFirst) if (r.contour) outline(r, 1.5 * sc, 0.36, 1, 1.2)
      for (const l of dark) D.layer({ tooth: 'fine', cut: S.occluders(l, { light: false }) }, () => D.stroke(l.pts, { w: Math.max(1.2, l.w * 0.4), color: gr, alpha: 0.36, taper: 0.6, wobble: 1, seed: l.i + 3, cost: 0.6 }))
    })

    D.pass('washes', 3.6, () => {
      // the sheet's warm ground, laid first over the whole page
      D.layer({ soften: 3 }, () => D.wash(page, '#f3d9b4', { alpha: 0.4, seed: 2, shrink: 1, edge: 6, dx: 0, dy: 0, rim: false, from: [W * 0.3, H * 0.25] }))
      D.clip(page, () => {
        for (const r of S.regions) {
          const L = r.light, b = r.bbox, cut = S.occluders(r, { light: false }), from = K.litPoint(r, L), seed = r.i * 3 + 11
          if (r.role === 'bg' || r.role === 'ground') {
            // a gentle flat wash, and a soft bloom or two where the paper stayed wet
            D.layer({ soften: 2.5, cut, blend: 'multiply' }, () => {
              D.wash(r.pts, tint(r.color), { alpha: 0.72, seed, shrink: 1, edge: 5, dx: 0, dy: 0, rim: false, from })
              // graded: a second, softer glaze on the side away from the light
              D.layer({ soften: 50 * sc, mask: r.pts }, () => D.fill(K.translate(r.pts, -L[0] * b.w * 0.45, -L[1] * b.h * 0.45), K.mix(shadeTint(r), tint(r.color), 0.4), { alpha: 0.35, from: [b.cx - L[0] * b.w * 0.4, b.cy - L[1] * b.h * 0.4] }))
              const rr = K.rng(seed)
              for (let k = 0; k < 2; k++) {
                const x = b.x0 + b.w * (0.15 + 0.7 * rr()), y = b.y0 + b.h * (0.15 + 0.7 * rr()), rad = Math.min(b.w, b.h) * (0.06 + 0.07 * rr())
                if (!K.inside(r.pts, x, y)) continue
                // a bloom: water back-running into the drying wash, a pale middle with a hard cauliflower rim
                const bl = K.displace(K.densify(K.blob(x, y, rad, { wob: 0.35, seed: seed + k, sx: 1.4, sy: 0.9 }), 7, true), rad * 0.45, 0.025, seed + k + 8)
                D.fill(bl, K.mix(tint(r.color), paper, 0.4), { alpha: 0.55, from: [x, y] })
                D.line([...bl, bl[0]], { w: 3, color: K.mix(r.color, shadeTint(r), 0.3), alpha: 0.3 })
              }
            })
          } else if (r.role === 'glow') {
            // a light: its own warm colour, and the light spilling softly round it
            D.layer({ soften: 46 * sc, alpha: 0.75 }, () => D.fill(K.offset(r.pts, 34 * sc), K.mix(r.color, '#fff1c8', 0.35), { alpha: 0.75 }))
            D.layer({ soften: 1.5, cut }, () => {
              D.wash(r.pts, K.mix(r.color, r.lit, 0.35), { alpha: 0.85, seed, shrink: 1, edge: 4, dx: 0, dy: 0, rim: false, from })
              D.layer({ soften: 30 * sc, mask: r.pts }, () => D.fill(K.scale(r.pts, 0.55), '#fffbea', { alpha: 0.55 })) // brightest at its heart
            })
          } else if (r.role === 'highlight') {
            D.layer({ soften: 30 * sc, cut }, () => D.fill(r.pts, K.mix(paper, r.color, 0.5), { alpha: 0.42, grow: 'spread', from }))
          } else if (r.role === 'shadow') {
            D.layer({ soften: 2.5, cut, blend: 'multiply' }, () => D.wash(r.pts, K.mix(o.lilac, r.color, 0.35), { alpha: 0.22 + 0.3 * r.strength, seed, shrink: 0.98, edge: 6, dx: 0, dy: 0, rim: true, rimW: 2 }))
          } else {
            // a form: the shade colour under the whole shape, the tint shifted toward the light (soft, then crisp)
            const k = Math.min(b.w, b.h) * (0.04 + 0.05 * r.form), lx = L[0] * k, ly = L[1] * k
            D.layer({ mask: r.pts, cut, blend: 'multiply' }, () => {
              D.wash(r.pts, shadeTint(r), { alpha: 0.9, seed, shrink: 1, edge: 4, dx: 0, dy: 0, rim: false, from })
              D.layer({ soften: 5 * sc + k * 0.2 }, () => D.wash(r.pts, tint(r.color), { alpha: 0.95, seed: seed + 1, shrink: 1, edge: 4, dx: lx, dy: ly, rim: false, from }))
              D.wash(r.pts, tint(r.color), { alpha: 0.9, seed: seed + 2, shrink: 1, edge: 4, dx: lx * 2.2, dy: ly * 2.2, rim: false, from })
              // a rosy blush where the form turns away (reflected warmth), and a lifted highlight toward the light
              if (round(r) && r.area > 3000) {
                D.layer({ soften: 20 * sc }, () => D.fill(K.blob(b.cx - L[0] * b.w * 0.3, b.cy - L[1] * b.h * 0.3 + b.h * 0.1, Math.min(b.w, b.h) * 0.3, { sx: 1.4, sy: 0.7, seed }), o.blush, { alpha: 0.2 }))
                D.layer({ soften: 8 * sc }, () => D.fill(K.blob(b.cx + L[0] * b.w * 0.25, b.cy + L[1] * b.h * 0.27, Math.min(b.w, b.h) * 0.1, { sx: 1.5, sy: 0.8, rot: Math.atan2(L[1], L[0]) + Math.PI / 2, seed: seed + 1 }), '#fffaf3', { alpha: 0.62 }))
              }
            })
          }
        }
      })
    })

    D.pass('final line', 1.7, () => {
      for (const r of topFirst) {
        if (!r.contour) continue
        const small = r.role === 'detail' || r.area < 6000
        outline(r, (small ? 2 : 2.8) * sc, 0.9, 2, 1)
        outline(r, (small ? 1 : 1.4) * sc, 0.4, 5, 2.2) // gone over again, a little off the first
        // hatch accents in the shade, away from the light, the way a picture book marks a round thing's dark side
        if (round(r) && r.area > 5000) {
          const L = r.light, b = r.bbox, rr = K.rng(r.i + 31), n = 5 + Math.round(rr() * 3)
          const cx = b.cx - L[0] * b.w * 0.3, cy = b.cy - L[1] * b.h * 0.3, len = Math.min(b.w, b.h) * 0.09, span = b.w * 0.18
          D.layer({ mask: r.pts, cut: S.occluders(r, { light: false }) }, () => {
            for (let k = 0; k < n; k++) {
              const x = cx - span / 2 + (span * k) / (n - 1) + (rr() - 0.5) * 3, y = cy + (rr() - 0.5) * 6, a = -0.95 + (rr() - 0.5) * 0.18, l = len * (0.7 + rr() * 0.6)
              D.stroke([[x, y], [x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5], [x + Math.cos(a) * l, y + Math.sin(a) * l]], { w: 1.9 * sc, color: gr, alpha: 0.33, taper: 0.8, wobble: 0.6, seed: r.i * 11 + k, cost: 0.6 })
            }
          })
        }
      }
      // under each cast shadow, a few hatched lines in the pool
      for (const r of S.regions) {
        if (r.role !== 'shadow' || r.area < 3000) continue
        const cut = S.occluders(r, { light: false })
        D.layer({ mask: r.pts, cut }, () => {
          for (const [a, b] of K.hatchLines(r.pts, -0.5, 13 * sc, { seed: r.i, jitter: 4 })) if (K.dist(a, b) > 8) D.stroke([a, b], { w: 1.5 * sc, color: gr, alpha: 0.22 + 0.15 * r.strength, taper: 0.8, wobble: 0.5, seed: r.i + a[1], cost: 0.4 })
        })
      }
      for (const l of dark) D.layer({ tooth: 'fine', cut: S.occluders(l, { light: false }) }, () => D.stroke(l.pts, { w: Math.max(1.6, Math.min(4, l.w * 0.8)) * sc, color: gr, alpha: 0.85, taper: 0.6, wobble: 0.8, seed: l.i * 5, cost: 0.7 }))
      // light lines: soft white gouache over the paint, a breath of pencil along one side (steam drifts and boils)
      for (const l of light) {
        const cut = S.occluders(l, { light: false }), steam = l.role === 'steam'
        D.layer({ soften: steam ? 2.5 : 0.8, cut }, () => D.stroke(l.pts, { w: Math.max(4, l.w * (steam ? 1.5 : 0.9)), color: K.mix(l.color, '#ffffff', 0.4), alpha: steam ? 0.8 : 0.92, taper: steam ? 0.8 : 0.2, rough: 0.2, wobble: 1, smooth: steam, seed: l.i * 7, boil: steam, cost: 0.6 }))
        if (steam) D.layer({ tooth: 'fine', cut }, () => D.stroke(K.translate(l.pts, -l.w * 0.9, 0), { w: 1.2 * sc, color: gr, alpha: 0.35, taper: 0.9, wobble: 1.5, smooth: true, seed: l.i * 7 + 1, boil: true, cost: 0.5 }))
      }
    })

    D.pass('paint off the brush', 0.3, () => {
      if (!o.spatter) return
      const subj = solid.filter((r) => r.role === 'subject').sort((a, b) => b.area - a.area)[0], gnd = S.regions.find((r) => r.role === 'ground') || S.regions[0]
      const fling = (c, n, seed, box, rmax) => {
        const rr = K.rng(seed), list = []
        for (let i = 0; i < n; i++) { const x = box[0] + rr() * (box[2] - box[0]), y = box[1] + rr() * (box[3] - box[1]), k = rr(); if (K.inside(page, x, y)) list.push([x, y, (0.5 + k * k * rmax) * sc]) }
        D.dots(list, c, { alpha: 0.5 })
      }
      if (subj) fling(K.mix(tint(subj.color), subj.color, 0.4), 26, 5, [W * 0.08, H * 0.08, W * 0.92, H * 0.85], 3)
      if (gnd) fling(K.mix(tint(gnd.color), gnd.color, 0.3), 14, 8, [W * 0.08, gnd.bbox.y0, W * 0.92, H * 0.94], 2.6)
    })

    D.top(() => {
      D.texture('paper', { opacity: 0.13 })
      D.mark(0.001, (ctx) => {
        ctx.save(); ctx.translate(W / 2, H * 0.46); ctx.scale(1, H / W)
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.72)
        g.addColorStop(0, 'rgba(255,250,240,0.08)'); g.addColorStop(0.45, 'rgba(255,250,240,0)'); g.addColorStop(1, o.vignette)
        ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 2, H * 2); ctx.restore()
      })
      D.texture('coldpress', { opacity: 0.2 })
    })
  },
}

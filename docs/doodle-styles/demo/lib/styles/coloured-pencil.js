// Coloured pencil — studied from anidoodle's tin-repairman plate (colouredPencil.ts · colouredPencilKit.ts ·
// styles/colouredPencil.md). Wax pencils on a toothy cream sheet: the lead only lands on the ridges, so every passage is
// speckled with the cream of the valleys, and every layer is punched by the SAME tooth (harder pressure fills more of it).
// Short flicked strokes laid side by side in strips, almost all in ONE diagonal; tone from pressure and stacking —
// a second hue hatched over the first, darks CROSS-hatched in a second direction, never filled. Edges are where the
// hatching stops; a few thin broken contours in a darker pencil go on last, heavier on the shade side, lost in the light.
//
// defaults (all overridable by a house style):
//   paper   the cream cartridge sheet       lead    the dark sepia-graphite pencil for contours
//   lay     the faint graphite of the lay-in  glow   the yellow laid over the bare paper of a light
//   angle   the dominant hatch diagonal (radians; lower-left to upper-right)   cross   the cross-hatch direction for darks
//   gap     hatch spacing at 1080 px         tooth   [light, medium, burnished] — how much of the tooth each pressure fills
import { field, cached, sceneKey, hatch, carve, chain, strokes, visibleRuns, lineRuns, isSolid, lightLines, darkLines, ragged } from './_pencil.js'

export default {
  id: 'coloured-pencil', name: 'Coloured pencil', ko: '색연필',
  medium: 'wax-based coloured pencils on toothy cream cartridge paper',
  mark: 'short flicked hatch strokes side by side in strips, all in one diagonal; a second hue layered over the first; darks cross-hatched',
  edge: 'mostly none — an edge is where the hatching stops; a few thin broken contours in a darker pencil, lost where the light is',
  order: ['graphite lay-in', 'local colour, light to dark', 'second hue', 'darks cross-hatched', 'contours', 'the light'],
  paper: 'cream cartridge with a real tooth: the valleys stay cream through every layer',
  palette: "the subject's own colours as pencils, each turned by a second hue (violet over blue, red-brown over ochre); cream paper for white",
  bestFor: '그림책 · 아이와 집 · 손으로 만든 다정한 설명 · 따뜻한 물건 그림',
  source: 'anidoodle colouredPencil.ts · colouredPencilKit.ts · styles/colouredPencil.md',
  defaults: { paper: '#f3ecdc', lead: '#3e3134', lay: '#8e8894', glow: '#f6c93f', angle: -1.02, cross: 0.22, gap: 3.1, tooth: [0.5, 0.64, 0.8] },
  draw(D, S, K, o) {
    const sc = Math.sqrt((S.W * S.H) / (1080 * 1080)), gap = o.gap * sc
    const [t0, t1, t2] = o.tooth, light = { kind: 'pencil', coverage: t0 }, medium = { kind: 'pencil', coverage: t1 }, hard = { kind: 'pencil', coverage: t2 }
    const plan = cached(sceneKey(S, 'cpencil:' + JSON.stringify(o)), () => {
      const F = field(S, 4)
      const parts = [{ ri: -1, r: { color: S.bg, shade: K.shadeOf(S.bg), lit: K.litOf(S.bg), role: 'bg', form: 0, i: -1 } }, ...S.regions.map((r, ri) => ({ r, ri })).filter(({ r }) => isSolid(r) || r.role === 'glow')]
      const boxes = new Map(parts.map(({ ri }) => [ri, F.boxOf((k) => F.id[k] === ri)]))
      const turnOf = (ri) => ((((ri + 5) * 7919) % 13) - 6) * 0.018 // the hand re-settles a few degrees for each patch
      // a pencil for every local colour: a touch more chroma than paint, the way wax reads on cream
      const pencil = (c) => K.adjust(c, { sat: 1.12 })
      const second = (r) => { const [H] = K.toHsl(r.color), warm = H < 75 || H > 300; return K.adjust(r.shade, { hue: warm ? -16 : 24, sat: 1.15, light: warm ? 0.95 : 0.9 }) }
      const darkOf = (r) => K.mix(K.adjust(r.shade, { light: 0.62, sat: 1.05 }), '#262a3f', 0.3)
      const lay = [], local = [], hue = [], dark = [], glow = []
      // 2. local colour, light to dark: the wall and the sky first, then each object
      const order = parts.filter(({ r }) => r.role !== 'glow').sort((a, b) => K.lum(b.r.color) - K.lum(a.r.color))
      for (const { r, ri } of order) {
        const box = boxes.get(ri); if (!box) continue
        const big = r.role === 'bg' || r.role === 'ground', ang = o.angle + turnOf(ri)
        const keep = (x, y) => F.top(x, y) === ri
        // pressure: harder where the form turns away from the light; the lit top of a form stays pale
        const dens = (x, y) => K.clamp((big ? 0.78 : 0.95) - (big ? 0.25 : 0.55) * (F.light(x, y) - 0.5) + ragged(31, x, y, 0.2, 0.02))
        // a dark local colour is pressed harder (more of the tooth filled) and gone over a second time
        const dkn = 1 - K.lum(r.color), level = dkn < 0.35 ? 0 : dkn < 0.58 ? 1 : 2, base = 0.42 + 0.5 * dkn
        const lay1 = (seed, a) => hatch(box, a, gap, keep, { len: 34 * sc + 10, seed, strip: 120, alpha: (x, y, rr) => { const d = dens(x, y); return rr() < Math.pow(d, 0.5) ? base * (0.6 + 0.5 * d) * (0.8 + rr() * 0.35) : 0 } })
        local.push({ c: pencil(r.color), level, list: lay1(11 + ri * 7, ang) })
        if (dkn > 0.42) local.push({ c: pencil(K.adjust(r.color, { light: 0.9 })), level, list: lay1(12 + ri * 7, ang + 0.05) })
        // 3. a second hue over the shade half (all over the big flats, lightly, so they are never one flat pencil)
        const sh = (x, y) => keep(x, y) && (big || F.light(x, y) + ragged(41, x, y, 0.16, 0.03) < 0.66)
        hue.push({ c: second(r), list: hatch(box, ang + 0.1, gap * (big ? 1.5 : 1.1), sh, { len: 22 * sc + 8, seed: 13 + ri * 7, strip: 110, alpha: (x, y, rr) => { const d = big ? 0.35 : K.clamp(1.05 - F.light(x, y)); return rr() < Math.pow(d, 0.45) ? (0.45 + 0.55 * d) * (0.8 + rr() * 0.35) : 0 } }) })
        // 4. darks: cross-hatched in the second direction where the picture is darkest (core shadows, cast shadows)
        const dk = (x, y) => keep(x, y) && F.value(x, y) + ragged(51, x, y, 0.12, 0.03) < Math.min(0.42, K.lum(r.color) * 0.8 + (r.role === 'bg' || r.role === 'ground' ? 0 : 0.06))
        const dc = darkOf(r), list = hatch(box, o.cross + turnOf(ri) * 0.6, gap * 1.15, dk, { len: 20 * sc + 8, seed: 17 + ri * 7, strip: 100, alpha: (x, y, rr) => 0.55 + 0.4 * rr() })
        for (const s of list) { const m = s.p[1], si = F.shadowId(m[0], m[1]); if (si >= 0) s.c = K.mix(dc, S.regions[si].color, 0.35) }
        dark.push({ c: dc, list })
        // 1. lay-in: the big things ruled freehand as a few straight lines that run past their corners
        if (r.i >= 0 && !big && r.area > 4000) {
          const rr = K.rng(r.i + 3), n = r.form > 0.6 ? 7 : 5, poly = K.resample(r.pts, n, true)
          for (let k = 0; k < n; k++) {
            const a = poly[k], b = poly[(k + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, e0 = 5 + rr() * 14, e1 = 5 + rr() * 14
            lay.push({ p: [[a[0] - (dx / l) * e0, a[1] - (dy / l) * e0], [(a[0] + b[0]) / 2 + (rr() - 0.5) * 2, (a[1] + b[1]) / 2 + (rr() - 0.5) * 2], [b[0] + (dx / l) * e1, b[1] + (dy / l) * e1]], a: 0.5 })
          }
        }
      }
      for (const r of S.regions) if (r.role === 'ground') { const b = r.bbox; lay.push({ p: [[b.x0 - 10, b.y0 + 1], [b.cx, b.y0 - 1], [b.x1 + 10, b.y0 + 1]], a: 0.5 }) }
      // 6. the light: yellow laid over paper that was left near-bare (a window, a lamp), and light falling on things
      for (const { r, ri } of parts) {
        if (r.role !== 'glow') continue
        const box = boxes.get(ri); if (!box) continue
        glow.push({ c: K.mix(o.glow, r.color, 0.5), list: hatch(box, o.angle, gap * 1.1, (x, y) => F.top(x, y) === ri, { len: 30 * sc + 8, seed: 61 + ri, strip: 120, alpha: (x, y, rr) => 0.45 + 0.35 * rr() }) })
      }
      S.regions.forEach((r, ri) => {
        if (r.role !== 'highlight') return
        const box = F.boxOf((k) => F.gid[k] === ri); if (!box) return
        glow.push({ c: K.mix(o.glow, r.color, 0.6), list: hatch(box, o.angle - 0.06, gap * 1.6, (x, y) => F.gid[F.cell(x, y)] === ri && F.top(x, y) !== ri, { len: 30 * sc + 8, seed: 71 + ri, strip: 120, alpha: (x, y, rr) => (rr() < 0.75 ? 0.25 + 0.3 * rr() : 0) }) })
      })
      // 5. contours: thin, broken, in the dark lead; gone over on the shade side, lost where the light is
      const cont = []
      S.regions.forEach((r) => {
        if (!isSolid(r) || !r.contour) return
        const L = r.light, rr = K.rng(r.i * 7 + 1)
        for (const run of visibleRuns(S, r, (i, n) => K.facing(n, L) < 0.38)) for (const p of chain(run, { seg: 46, seed: r.i * 13 + run.length, off: 0.7 })) if (rr() > 0.14) cont.push({ p, a: 0.62 + rr() * 0.25, w: 1 })
        for (const run of visibleRuns(S, r, (i, n) => K.facing(n, L) < -0.3)) for (const p of chain(run, { seg: 40, seed: r.i * 5 + 9, off: 1.1 })) cont.push({ p, a: 0.55, w: 1.25 })
      })
      return { lay, local, hue, dark, glow, cont }
    })

    const lights = lightLines(S), reserve = lights.map((l) => ({ pts: l.pts, r: Math.max(3, l.w * 0.7) }))
    const levels = [light, medium, hard]
    const pass = (groups, opts) => { for (const g of groups) strokes(D, carve(g.list, reserve), { color: g.c, shape: 'flick', lift: 7, ...opts, ...(g.level != null ? { tooth: levels[g.level] } : {}) }) }

    D.ground(() => D.sheet(o.paper))
    D.pass('graphite lay-in', 0.6, () => strokes(D, plan.lay, { color: o.lay, w: 1, lift: 10, tooth: medium }))
    D.pass('local colour, light to dark', 3.2, () => pass(plan.local, { w: 2.8 * sc, tooth: light }))
    D.pass('second hue', 1.6, () => pass(plan.hue, { w: 2.3 * sc, tooth: medium }))
    D.pass('darks cross-hatched', 1.3, () => pass(plan.dark, { w: 2.2 * sc, tooth: hard }))
    D.pass('contours', 0.9, () => {
      strokes(D, plan.cont, { color: o.lead, w: 1.3, lift: 8, tooth: hard })
      for (const l of darkLines(S)) strokes(D, lineRuns(S, l).flatMap((v, k) => chain(v, { seg: 50, seed: l.i * 3 + k, off: 0.6 })).map((p) => ({ p, a: 0.8 })), { color: K.mix(l.color, o.lead, 0.4), w: Math.max(1.3, Math.min(3.2, l.w * 0.7)), tooth: hard, lift: 8 })
    })
    D.pass('the light', 0.6, () => {
      pass(plan.glow, { w: 2.6 * sc, tooth: light })
      // light lines were left bare; a white pencil burnishes along them, and steam is touched in with a few soft wisps
      lights.forEach((l, i) => {
        const runs = l.role === 'steam' ? chain(K.wobble(K.smooth(l.pts, false, 6), 1.4, i * 7 + D.frame * 5), { seg: 40, seed: i + D.frame, off: 1.2 }) : lineRuns(S, l)
        strokes(D, runs.map((p) => ({ p, a: 0.85 })), { color: K.mix(l.color, '#ffffff', 0.5), w: Math.max(2, l.w * 0.6), tooth: medium, lift: 6, boil: true })
      })
    })
    D.top(() => D.texture('paper', { opacity: 0.06 }))
  },
}

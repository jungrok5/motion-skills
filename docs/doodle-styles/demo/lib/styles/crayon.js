// Wax crayon — studied from anidoodle's hot-air-balloon plate (balloon.ts · balloonDraw.ts · the crayon row in
// styles.md). Wax on toothed paper: every fill is a back-and-forth scribble that skips the valleys of the sheet, a darker
// crayon is worked over the shade side, a white crayon is pressed hard into the highlight (burnished), and the contour
// is a fat wobbly line gone over twice. Drawn the way a child (or an illustrator in wax) does it: a light contour first,
// the colouring-in with the hero first and the sky last, the shade crayon, the white, then the fat line over it all.
//
// defaults (all overridable by a house style):
//   paper    the toothed sheet            outline  the dark crayon for the fat contour     white  the burnishing crayon
//   box      0..1 how far each colour is pulled to the nearest crayon in a 24-crayon box (0 = the piece's own colours)
//   crayons  the box itself (an array of hex colours)
//   width    the crayon's mark at 1080 px  tooth   [fill, shade, burnish] — how much of the tooth each pressure fills
import { field, cached, sceneKey, scribble, carve, chain, strokes, visibleRuns, lineRuns, isSolid, lightLines, darkLines, ragged } from './_pencil.js'

const BOX = ['#e5392d', '#f68b1f', '#ffd21f', '#3dae49', '#2f7de1', '#69c3f2', '#8d4fc7', '#ff78ae', '#8b5a3c', '#262233', '#2f8a3b', '#d9b68a',
  '#f6c8a0', '#9a9aa8', '#5d6470', '#8a8f3a', '#8e2b33', '#2a9d8f', '#2b3a8c', '#b5d334', '#e8b33a', '#9cc3a6', '#b9a3dd', '#f3e3b9']

export default {
  id: 'crayon', name: 'Wax crayon', ko: '크레용',
  medium: 'wax crayons on toothed drawing paper',
  mark: 'back-and-forth scribble fills that skip the valleys; a darker crayon over the shade side; a white crayon burnishing the highlight',
  edge: 'a fat wobbly contour gone over twice, swallowing the light lay-in line under it; fills that run a little past it',
  order: ['light contour', 'scribble fills (hero first, sky last)', 'darker crayon on the shade side', 'white crayon burnish', 'fat contour, twice'],
  paper: 'warm white drawing paper with a strong tooth; the valleys stay white',
  palette: 'a box of 24 crayons: each colour pulled toward the nearest crayon, a little brighter than life',
  bestFor: '아이 같은 따뜻함 · 동화, 교육 · 웃는 브랜드 · 단순한 사물',
  source: 'anidoodle balloon.ts · balloonDraw.ts · styles.md (crayon)',
  defaults: { paper: '#fdf8ea', outline: '#262233', white: '#fffdf4', box: 0.5, crayons: BOX, width: 6.5, tooth: [0.7, 0.78, 0.9] },
  draw(D, S, K, o) {
    const sc = Math.sqrt((S.W * S.H) / (1080 * 1080))
    const [c0, c1, c2] = o.tooth, fillT = { kind: 'wax', coverage: c0 }, shadeT = { kind: 'wax', coverage: c1 }, hardT = { kind: 'wax', coverage: c2 }
    const crayon = (c) => K.adjust(K.mix(c, K.nearest(c, o.crayons), o.box), { sat: 1.18 })
    const darker = (c) => K.mix(c, '#2a1d3a', 0.45)
    const plan = cached(sceneKey(S, 'crayon:' + JSON.stringify(o)), () => {
      const F = field(S, 4)
      const parts = [{ ri: -1, r: { color: S.bg, role: 'bg', form: 0, i: -1, area: S.W * S.H } }, ...S.regions.map((r, ri) => ({ r, ri })).filter(({ r }) => isSolid(r) || r.role === 'glow')]
      // the colouring-in order: the hero things first, small parts, then the ground, the sky (wall) always last
      const rank = (r) => (r.role === 'bg' ? 3 : r.role === 'ground' ? 2 : r.role === 'glow' ? 1.5 : r.role === 'detail' ? 1 : 0)
      parts.sort((a, b) => rank(a.r) - rank(b.r) || b.r.area - a.r.area)
      const fills = [], shade = [], burnish = []
      for (const { r, ri } of parts) {
        const box = F.boxOf((k) => F.id[k] === ri); if (!box) continue
        const vis = (x, y) => F.top(x, y) === ri, col = crayon(r.role === 'glow' ? r.lit : r.color), rr = K.rng(ri + 9)
        // a dark colour is pressed harder: the strokes close up and fill more of the tooth
        const dkn = r.role === 'glow' ? 0 : 1 - K.lum(r.color), press = dkn > 0.55 ? 1 : 0
        const w = K.clamp(Math.sqrt(Math.min(box.w, box.h)) * 0.75, 2.6, o.width) * sc, gap = w * (1.45 - 0.55 * dkn)
        const a1 = 1.25 + (((ri + 2) % 3) - 1) * 0.14, a2 = -0.35 + ((ri + 1) % 2) * 0.2
        const al = (rr2) => 0.6 + rr2() * 0.45
        fills.push({ c: col, w, press, list: scribble(box, a1, gap, vis, { seed: 100 + ri * 7, over: w * 0.5, strip: 150 * sc }).map((s) => ({ ...s, a: al(rr) * 0.95 })) })
        fills.push({ c: col, w: w * 0.8, press, list: scribble(box, a2, gap * 1.7, vis, { seed: 101 + ri * 7, over: w * 0.3, strip: 170 * sc }).map((s) => ({ ...s, a: al(rr) * 0.5 })) })
        // the darker crayon across the side away from the light, then a deeper one in the core
        if (r.role !== 'glow') {
          // (a wall or a table is not turned: only what falls on it darkens it)
          const big = r.role === 'bg' || r.role === 'ground'
          const sh = (x, y) => !big && vis(x, y) && F.light(x, y) + ragged(9, x, y, 0.22, 0.02) < 0.5
          shade.push({ c: darker(col), w: w * 0.85, list: scribble(box, 0.55, gap * 1.05, sh, { seed: 102 + ri * 7, over: 1, strip: 140 * sc }).map((s) => ({ ...s, a: al(rr) * 0.72 })) })
          const deep = (x, y) => !big && vis(x, y) && F.light(x, y) + ragged(10, x, y, 0.16, 0.025) < 0.25
          shade.push({ c: K.mix(darker(col), o.outline, 0.3), w: w * 0.75, list: scribble(box, -0.6, gap * 1.1, deep, { seed: 103 + ri * 7, over: 1, strip: 140 * sc }).map((s) => ({ ...s, a: al(rr) * 0.6 })) })
          // cast shadows: the dark crayon of what they fall on, with the shadow's own tint in it
          const cast = (x, y) => vis(x, y) && F.shadow(x, y) + ragged(12, x, y, 0.2, 0.03) > 0.3
          const list = scribble(box, 0.3 + (ri % 2) * 0.3, gap * 0.95, cast, { seed: 104 + ri * 7, over: 1.5, strip: 130 * sc })
          for (const s of list) { const m = s.p[s.p.length >> 1], si = F.shadowId(m[0], m[1]); s.c = K.mix(darker(col), si >= 0 ? S.regions[si].color : o.outline, 0.35); s.a = al(rr) * 0.85 }
          shade.push({ c: darker(col), w: w * 0.9, list })
        }
        // white crayon pressed hard into the highlight of a round thing, and into the brightest part of a light
        if (r.form > 0.55 || r.role === 'glow') {
          const hi = (x, y) => vis(x, y) && F.light(x, y) + ragged(11, x, y, 0.08, 0.04) > (r.role === 'glow' ? 0.99 : 0.88)
          const hiGlow = vis
          burnish.push({ c: o.white, w: w * 0.75, list: scribble(box, 1.0, w * (r.role === 'glow' ? 1.6 : 0.7), r.role === 'glow' ? hiGlow : hi, { seed: 105 + ri * 7, over: 0, strip: 90 }).map((s) => ({ ...s, a: r.role === 'glow' ? 0.45 : 0.8 })) })
        }
      }
      // light falling on a wall: a pale yellow-white crayon, lightly, over the colour
      S.regions.forEach((r, ri) => {
        if (r.role !== 'highlight') return
        const box = F.boxOf((k) => F.gid[k] === ri); if (!box) return
        const w = o.width * sc * 0.9
        burnish.push({ c: K.mix(o.white, crayon(r.color), 0.45), w, list: scribble(box, 1.1, w * 1.1, (x, y) => F.gid[F.cell(x, y)] === ri && F.top(x, y) !== ri, { seed: 120 + ri, over: 2, strip: 140 }).map((s) => ({ ...s, a: 0.55 })) })
      })
      // contours: the light lay-in, and the fat line it becomes
      const lay = [], fat = []
      S.regions.forEach((r) => {
        if (!isSolid(r) || !r.contour) return
        const col = K.mix(o.outline, darker(crayon(r.color)), 0.3), small = r.role === 'detail' || r.area < 6000
        for (const run of visibleRuns(S, r)) {
          const sm = K.smooth(run.filter((_, k, a) => k % 3 === 0 || k === a.length - 1), false, 6)
          lay.push({ p: sm, c: col, a: 0.45 })
          fat.push({ p: K.wobble(sm, 1.3, r.i * 3 + 1), c: col, a: 0.9, w: small ? 0.75 : 1 })
          fat.push({ p: K.wobble(sm, 1.8, r.i * 3 + 2), c: col, a: 0.75, w: small ? 0.6 : 0.85 })
        }
      })
      return { fills, shade, burnish, lay, fat }
    })

    const lights = lightLines(S), reserve = lights.filter((l) => l.role !== 'steam').map((l) => ({ pts: l.pts, r: Math.max(3, l.w * 0.5) }))
    const group = (gs, tooth, extra = {}) => { for (const g of gs) strokes(D, carve(g.list, reserve), { color: g.c, w: g.w, tooth: g.press ? shadeT : tooth, lift: 10, ...extra }) }
    const lineW = 3.4 * sc

    D.ground(() => D.sheet(o.paper))
    D.pass('light contour', 0.7, () => strokes(D, plan.lay, { w: lineW * 0.42, tooth: shadeT, lift: 14 }))
    D.pass('scribble fills', 3.4, () => group(plan.fills, fillT))
    D.pass('darker crayon on the shade side', 1.4, () => group(plan.shade, shadeT))
    D.pass('white crayon burnish', 0.7, () => {
      group(plan.burnish, hardT)
      // light lines are white crayon pressed hard, twice (steam wanders a little on every drawing once alive)
      lights.forEach((l, i) => {
        const runs = l.role === 'steam' ? [K.smooth(l.pts, false, 6)] : lineRuns(S, l)
        const list = runs.flatMap((p, k) => [{ p: K.wobble(p, 1.5, i * 9 + k + D.frame * 3), a: 0.95 }, { p: K.wobble(p, 2.2, i * 9 + k + 5 + D.frame * 3), a: 0.7, w: 0.75 }])
        strokes(D, list, { color: o.white, w: Math.max(5, l.w * 1.1) * sc, tooth: hardT, lift: 8 })
      })
    })
    D.pass('fat contour, twice', 1.2, () => {
      strokes(D, plan.fat, { w: lineW, tooth: hardT, lift: 10 })
      for (const l of darkLines(S)) {
        const col = K.mix(o.outline, crayon(l.color), 0.4)
        strokes(D, lineRuns(S, l).flatMap((p, k) => [{ p: K.wobble(p, 1.2, l.i * 5 + k), a: 0.9 }, { p: K.wobble(p, 1.8, l.i * 5 + k + 2), a: 0.7, w: 0.8 }]), { color: col, w: Math.max(lineW * 0.8, Math.min(lineW * 1.6, l.w * 0.9)), tooth: hardT, lift: 10 })
      }
    })
    D.top(() => D.texture('paper', { opacity: 0.1 }))
  },
}

// Charcoal, erased and redrawn — studied from anidoodle's charcoalErasure plate (vine and compressed charcoal on heavy
// rag paper, side-of-the-stick tone, the stump, the kneaded eraser as a drawing tool, and the erase-and-redraw cycle
// that leaves ghosts of earlier lines on the sheet). Re-implemented for the scene model.
//
// The sheet is toned first and the lights are lifted out of it; the subject is laid in with vine (a first try, a little
// off), massed with the side of the stick by value, stumped, then the first try is rubbed out (never fully) and the
// drawing is redrawn over its own residue; compressed charcoal goes on last for the darks, and the kneaded eraser picks
// out the highlights and anything light (steam, a window bar).
//
// defaults (all overridable by a house style):
//   paper    the rag sheet's colour                  ink     the charcoal's warm black
//   tint     null, or one muted colour laid as a faint wash under the charcoal in the warmest region (e.g. '#a4583a')
//   ghost    how far off the first try is (px at 1080); 0 = no erase-and-redraw ghosts
//   contrast 0.6 … 1.4: how hard the darks are pushed
import { hash, stretchedTone, dragRuns, drag, visibleRuns } from './_tone.js'

export default {
  id: 'charcoal', name: 'Charcoal, erased and redrawn', ko: '목탄 · 지우고 다시 그리기',
  medium: 'willow vine and compressed charcoal on heavy cream rag paper; a paper stump; a kneaded eraser',
  mark: 'the side of the stick dragged for tone, rubbed in with the stump; the point for structure; light lifted out with the eraser',
  edge: 'vine edges powdery and broken by the tooth, compressed edges crisp, stumped tone has none; erased edges streak',
  order: ['tone the sheet', 'lift the lights', 'vine lay-in', 'side of the stick', 'stump', 'erase and redraw', 'compressed darks', 'lift the highlights'],
  paper: 'heavy cream rag, felt-marked, strong tooth; the grain shows through the blacks',
  palette: 'one warm black on cream; value only (one muted tint at most)',
  bestFor: '진지하고 묵직한 그림 · 인물, 정물, 풍경 · 과정과 시간이 남는 그림',
  source: 'anidoodle charcoalErasure.ts · charcoalErasureKit.ts · styles/charcoalErasure.md',
  defaults: { paper: '#ece5d5', ink: '#1b1917', tint: null, ghost: 9, contrast: 1 },
  draw(D, S, K, o) {
    const L = S.light, paper = o.paper, ink = o.ink, u = Math.min(S.W, S.H) / 1080, ctr = o.contrast ?? 1
    const v = stretchedTone(S, K), sheet = { x0: 0, y0: 0, x1: S.W, y1: S.H }
    const solid = S.solid, lights = S.lines.filter((l) => K.isLight(l.color)), darks = S.lines.filter((l) => !K.isLight(l.color))
    const angleOf = (r) => (r && r.grain !== undefined ? r.grain : -0.42 + (hash(r ? r.i : 99, 5) - 0.5) * 0.6)
    // the patches a hand works: every region that is on top somewhere, then whatever is left (bare sheet)
    const patches = [...S.regions.filter((r) => !['shadow', 'highlight'].includes(r.role)), null]
    const owner = (r) => (x, y) => S.regionAt(x, y) === r
    // not hidden by anything painted after `it` (a displaced first try has no place of its own to test against)
    const seen = (it) => (x, y) => { const t = S.regionAt(x, y); return !t || t.i <= it.i || t.role === 'glow' }
    const unhidden = (pts, it) => { const d = K.densify([...pts, pts[0]], 3), keep = seen(it), out = []; let cur = null; for (const q of d) { if (keep(q[0], q[1])) (cur ||= []).push(q); else if (cur) { if (cur.length > 1) out.push(cur); cur = null } } if (cur && cur.length > 1) out.push(cur); return out }
    const dark = (x, y) => 1 - Math.pow(v(x, y), ctr) // how much charcoal belongs here
    // band edges wander with a soft noise, so a smooth gradient never shows a ruled edge
    const over = (x, y, th) => dark(x, y) > th + (K.noise(5, x * 0.08, y * 0.08) - 0.5) * 0.12

    D.ground(() => D.sheet(paper))

    // 1 — the whole sheet toned with the side of a vine stick, then rubbed in: drawing starts from a mid grey
    D.pass('tone the sheet', 1, () => {
      D.layer({ tooth: 'gran', soften: 6 * u }, () => {
        for (const run of dragRuns(sheet, -0.18, 15 * u, () => true, { step: 12 * u, jitter: 6 * u, seed: 3 })) D.line(run, { w: 30 * u, color: ink, alpha: 0.075, cost: 0.4 })
      })
      if (o.tint) {
        const warm = solid.filter((r) => r.role !== 'bg' && r.role !== 'ground').sort((a, b) => K.toHsl(b.color)[1] * b.area - K.toHsl(a.color)[1] * a.area)[0]
        if (warm) D.layer({ soften: 4 * u, tooth: 'gran', alpha: 0.35, cut: S.occluders(warm, { light: false }) }, () => D.fill(warm.pts, o.tint, { alpha: 0.6, grow: 'spread', from: K.litPoint(warm, L) }))
      }
    })

    // 2 — the kneaded eraser lifts the light out of the toned sheet (streaky, in the drag direction, never all of it)
    D.pass('lift the lights', 1, () => {
      D.layer({ tooth: 'dry', soften: 1.5 * u }, () => {
        for (const [th, a, w] of [[0.8, 0.5, 20], [0.92, 0.6, 14]])
          for (const run of dragRuns(sheet, 0.06, w * 0.6 * u, (x, y) => v(x, y) > th, { step: 7 * u, seed: 11 + th * 10 })) D.line(run, { w: w * u, color: paper, alpha: a, cost: 0.5 })
      })
    })

    // 3 — the first lay-in in vine: big shapes placed by eye, a little off (this is what gets erased later)
    const off = (r) => { const g = (o.ghost ?? 9) * u, a = hash(r.i, 17) * Math.PI * 2; return K.scale(K.translate(r.pts, Math.cos(a) * g, Math.sin(a) * g), 1 + (hash(r.i, 19) - 0.3) * 0.05) }
    const firstTry = solid.filter((r) => r.contour && r.role !== 'bg' && r.role !== 'ground' && r.area > 2500 * u * u)
    D.pass('vine lay-in', 1, () => {
      D.layer({ tooth: 'tooth', alpha: 0.75 }, () => { for (const r of firstTry) for (const run of unhidden(off(r), r)) D.stroke(run, { w: 2.4 * u, color: ink, alpha: 0.5, taper: 0.5, pressure: 0.3, wobble: 2.2 * u, seed: r.i + 3 + run.length, cost: 0.5 }) })
    })

    // 4 — tone by value with the side of the stick: each region in its own drag direction, darker bands go over again
    // three layers of drags, each laid where there is at least some dark; the pressure along a drag follows the value
    // (the hand presses into the shadow and eases off into the light), so tone grows smoothly, never in ruled bands
    const LAYERS = [[0.08, 0.3, 16, 9, 0], [0.3, 0.32, 13, 7, 0.24], [0.55, 0.36, 10, 5.5, -0.18]]
    D.pass('side of the stick', 3, () => {
      LAYERS.forEach(([th, a, w, gap, turnA], bi) => {
        D.layer({ tooth: bi ? 'fine' : 'tooth' }, () => {
          for (const r of patches) {
            const box = r ? r.bbox : sheet, own = owner(r), ang = angleOf(r) + turnA
            for (const run of dragRuns(box, ang, gap * u, (x, y) => own(x, y) && over(x, y, th), { step: 5 * u, jitter: 2 * u, seed: (r ? r.i : 0) * 7 + bi })) {
              const p = 0.8 + 0.4 * hash(run.length, bi, r ? r.i : 0)
              drag(D, K, run.map(([x, y], k) => [x + (hash(k, bi, run.length) - 0.5) * 1.6 * u, y + (hash(bi, k, run.length) - 0.5) * 1.6 * u]), { w: w * u, color: ink, piece: 3, alphaAt: (x, y) => a * p * K.smoothstep(th, th + 0.4, dark(x, y)), cost: 0.3 })
            }
          }
        })
      })
    })

    // 5 — the stump: a wide soft zigzag rub over the toned areas, pushing the drags into atmosphere
    D.pass('stump', 1, () => {
      D.layer({ soften: 5 * u, tooth: 'gran' }, () => {
        for (const r of patches) {
          const box = r ? r.bbox : sheet, own = owner(r)
          for (const run of dragRuns(box, angleOf(r) + 0.6, 26 * u, (x, y) => own(x, y) && dark(x, y) > 0.3, { step: 12 * u, seed: (r ? r.i : 0) + 41 })) {
            const zz = run.map(([x, y], k) => [x + (k % 2 ? 9 : -9) * u * 0.4, y + (k % 2 ? 9 : -9) * u])
            D.line(zz, { w: 26 * u, color: ink, alpha: 0.06, cost: 0.25 })
          }
        }
      })
    })

    // 6 — erase and redraw: the first try is rubbed out (grey residue stays), then the true drawing goes over it.
    //     Lost edges: the line breaks where the outline faces the light and weighs more on the shadow side.
    D.pass('erase and redraw', 2, () => {
      if (o.ghost) D.layer({ tooth: 'dry', soften: 1.2 * u }, () => { for (const r of firstTry) for (const run of unhidden(off(r), r)) D.stroke(run, { w: 11 * u, color: paper, alpha: 0.45, taper: 0.2, pressure: 0.2, rough: 0.4, wobble: 3 * u, seed: r.i + 5 + run.length, cost: 0.4 }) })
      D.layer({ tooth: 'tooth' }, () => {
        for (const r of solid) {
          if (!r.contour) continue
          for (const part of K.runs(r.pts, (i, n) => K.facing(n, L) < 0.6)) for (const run of visibleRuns(S, K, part, r)) D.stroke(run, { w: 2.6 * u, color: ink, alpha: 0.7, taper: 0.8, pressure: 0.6, rough: 0.5, wobble: 1.2 * u, boil: true, seed: r.i * 13 + run.length, cost: 0.7 })
        }
      })
    })

    // 7 — compressed charcoal: black and crisp, for the shadow side of things, the darkest darks and the dark lines
    D.pass('compressed darks', 1.4, () => {
      D.layer({ tooth: 'fine' }, () => {
        for (const r of patches) {
          const box = r ? r.bbox : sheet, own = owner(r)
          for (const run of dragRuns(box, angleOf(r), 4.5 * u, (x, y) => own(x, y) && over(x, y, 0.84), { step: 4 * u, seed: (r ? r.i : 0) + 61 })) D.line(run, { w: 7 * u, color: ink, alpha: 0.5, cost: 0.3 })
        }
      })
      D.layer({ tooth: 'fine' }, () => {
        for (const r of solid) {
          if (!r.contour || r.area < 600 * u * u) continue
          for (const part of K.runs(r.pts, (i, n) => K.facing(n, L) < -0.15)) for (const run of visibleRuns(S, K, part, r)) D.stroke(run, { w: (r.role === 'detail' ? 2.6 : 4) * u, color: ink, alpha: 0.9, taper: 0.9, pressure: 0.8, rough: 0.25, wobble: 0.8 * u, boil: true, seed: r.i * 29 + run.length, cost: 0.8 })
        }
        for (const l of darks) for (const run of visibleRuns(S, K, l.pts, l)) D.stroke(run, { w: Math.max(2.2 * u, l.w * 0.9), color: ink, alpha: 0.9, taper: 0.7, pressure: 0.5, wobble: 0.8 * u, boil: true, seed: l.i * 7 + run.length, cost: 0.8 })
      })
    })

    // 8 — the kneaded eraser again, pinched to a point: highlights on round things, light on the wall, steam, bars
    D.pass('lift the highlights', 1, () => {
      D.layer({ tooth: 'dry', soften: 1.4 * u }, () => {
        for (const r of solid) {
          if (r.form < 0.6 || r.area < 1500 * u * u) continue
          const b = r.bbox, cx = b.cx + L[0] * b.w * 0.22, cy = b.cy + L[1] * b.h * 0.24, rr = Math.min(b.w, b.h) * 0.13
          const spot = K.blob(cx, cy, rr, { sx: 1.25, sy: 0.75, rot: Math.atan2(L[1], L[0]) + Math.PI / 2, seed: r.i, wob: 0.3 })
          const own = owner(r)
          for (const run of dragRuns(K.bbox(spot), angleOf(r), 5 * u, (x, y) => K.inside(spot, x, y) && own(x, y), { step: 4 * u, seed: r.i + 81 })) D.line(run, { w: 6 * u, color: paper, alpha: 0.42, cost: 0.3 })
        }
        for (const r of S.regions.filter((q) => q.role === 'highlight' || q.role === 'glow')) {
          const keep = seen(r)
          for (const run of dragRuns(r.bbox, 0.05, 9 * u, (x, y) => K.inside(r.pts, x, y) && keep(x, y), { step: 8 * u, seed: r.i + 71 })) D.line(run, { w: 14 * u, color: paper, alpha: r.role === 'glow' ? 0.45 : 0.22, cost: 0.2 })
        }
      })
      D.layer({ tooth: 'dry', soften: 1.2 * u }, () => {
        for (const l of lights) for (const run of visibleRuns(S, K, l.pts, l)) D.stroke(run, { w: Math.max(5 * u, l.w * 1.5), color: paper, alpha: 0.9, taper: 0.6, pressure: 0.4, rough: 0.5, wobble: 1.5 * u, boil: true, seed: l.i * 7 + run.length, cost: 0.7 })
      })
    })

    D.top(() => { D.texture('coldpress', { opacity: 0.5 }); D.texture('paper', { opacity: 0.45 }) })
  },
}

// Chalkboard — studied from anidoodle's moonPhases plate and its draw-on film (moonPhasesDraw): the side of the chalk
// scumbled across a slate board, lit limbs worked a second time, every stroke broken by the board's tooth with a haze of
// dust either side, a finger-smudged glow, and the ghosts of lessons not quite erased. Re-implemented for the scene model.
//
// The value logic is inverted: light is chalk, dark is bare slate. A region gets more chalk the lighter it is, in the
// chalk stick nearest its colour (a teacher's box: white, yellow, pink, coral, orange, green, blue); greys stay white.
//
// defaults (all overridable by a house style):
//   board   the slate's colour            chalks  the box of sticks: { white, yellow, … } (hex)
//   frame   true: a wooden frame and ledge round the board      ghosts  true: yesterday's lesson, wiped, under it all
//   lesson  the words left on the board from yesterday (capitals; letters A D E H K L M N O P R S T W 2 3 4)
import { hash, stretchedTone, dragRuns, drag, writing, visibleRuns } from './_tone.js'

const CHALKS = { white: '#f4f0e6', yellow: '#f6e6a4', pink: '#f3c1cf', coral: '#f0a495', orange: '#f5c08f', green: '#bfe0b4', blue: '#a9d3e8' }

export default {
  id: 'chalkboard', name: 'Chalkboard', ko: '칠판 분필',
  medium: 'school chalk, tip and side, on a green-black slate board; a felt eraser; a fingertip',
  mark: 'side-of-the-chalk scumble clipped to each shape, lit side worked twice; the tip for a firm lit limb',
  edge: 'every stroke broken by the board’s tooth, a haze of dust either side; smudged glows have none',
  order: ['wipe the board', 'outline with the tip', 'side of the chalk', 'lit side worked twice', 'finger smudge', 'lines and dust'],
  paper: 'a dark slate board with the ghosts of old lessons, in a wooden frame with a ledge',
  palette: 'chalk colours on dark slate: white for greys, the nearest coloured stick for colours; dark is bare board',
  bestFor: '설명하고 가르치는 그림 · 원리, 과정, 수업 · 밤 장면, 빛나는 것',
  source: 'anidoodle moonPhases.ts · moonPhasesDraw.ts · styles/moonPhasesDraw.md',
  defaults: { board: '#25322d', chalks: CHALKS, frame: true, ghosts: true, lesson: ['HOMEWORK P 42', 'NEWTON 3RD LAW'] },
  draw(D, S, K, o) {
    const L = S.light, board = o.board, u = Math.min(S.W, S.H) / 1080, box = { ...CHALKS, ...(o.chalks || {}) }
    const W = S.W, H = S.H, sheet = { x0: 0, y0: 0, x1: W, y1: H }, white = box.white
    const v = stretchedTone(S, K)
    const coloured = Object.entries(box).filter(([k]) => k !== 'white').map(([, c]) => c)
    // the stick nearest in hue; greys (low chroma) are white chalk
    const hues = coloured.map((c) => K.toHsl(c)[0])
    const chalkOf = (c) => {
      const [h, s, l] = K.toHsl(c)
      if (s * (1 - Math.abs(2 * l - 1)) < 0.13) return white
      let best = 0, bd = 1e9
      hues.forEach((q, i) => { const d = Math.min(Math.abs(q - h), 360 - Math.abs(q - h)); if (d < bd) { bd = d; best = i } })
      return coloured[best]
    }
    const patches = [...S.regions.filter((r) => !['shadow', 'highlight'].includes(r.role)), null]
    const owner = (r) => (x, y) => S.regionAt(x, y) === r
    const angleOf = (r) => (r && r.grain !== undefined ? r.grain : -0.85 + (hash(r ? r.i : 77, 3) - 0.5) * 0.9)
    const flatness = (r) => (!r || r.role === 'bg' ? 0.32 : r.role === 'ground' ? 0.5 : 1) // a teacher suggests the wall, works the subject
    const lights = S.lines.filter((l) => K.isLight(l.color)), darks = S.lines.filter((l) => !K.isLight(l.color))
    // chalk: the strokes broken by the board's tooth, then the haze of dust they shed either side (wide, soft, faint).
    // One pair of layers per stage of the drawing (not per shape): shapes stay apart by who is on top (regionAt).
    const chalk = (fn, dust = 0.22, cut, toothScale = 1.2) => {
      D.layer({ tooth: 'tooth', toothScale, cut }, () => fn(false))
      D.layer({ soften: 3.2 * u, alpha: dust, cut }, () => fn(true))
    }
    // a scumble: the side of the chalk scrubbed in short strokes that bow a little and overlap, never ruled lines
    const scrub = (runs, seed) => {
      const out = []
      runs.forEach((run, j) => {
        let i = 0
        while (i < run.length - 1) {
          const n = 14 + Math.floor(hash(seed, j, i) * 26), part = run.slice(Math.max(0, i - 2), i + n), bow = (hash(j, i, seed) - 0.5) * 6 * u
          if (part.length > 1) {
            const a = part[0], b = part[part.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1
            out.push(part.map(([x, y], k) => { const t = Math.sin((k / (part.length - 1)) * Math.PI) * bow; return [x - (dy / l) * t, y + (dx / l) * t] }))
          }
          i += n
        }
      })
      return out
    }

    D.ground(() => {
      D.mark(0.001, (ctx) => {
        const g = ctx.createRadialGradient(W / 2, H * 0.44, 60 * u, W / 2, H * 0.44, Math.hypot(W, H) * 0.62)
        g.addColorStop(0, K.mix(board, '#ffffff', 0.07)); g.addColorStop(0.6, board); g.addColorStop(1, K.mix(board, '#000000', 0.3))
        ctx.save(); ctx.fillStyle = g; ctx.fillRect(-2, -2, W + 4, H + 4); ctx.restore()
      })
      if (o.ghosts) {
        // yesterday's lesson, still on the board as the teacher finds it
        const lines = [].concat(o.lesson || [])
        D.layer({ tooth: 'tooth', alpha: 0.75 }, () => lines.forEach((t, i) => { for (const pl of writing(t, W * 0.12 + i * W * 0.18, H * (0.62 + i * 0.1), 30 * u, 40 + i)) D.line(pl, { w: 3.2 * u, color: white, alpha: 0.85 }) }))
        D.layer({ tooth: 'tooth', alpha: 0.6 }, () => { D.line(K.arc(W * 0.78, H * 0.22, 90 * u, 90 * u, 0, Math.PI * 2, 40), { w: 3 * u, color: white }); D.line([[W * 0.66, H * 0.36], [W * 0.9, H * 0.08]], { w: 3 * u, color: white }) })
      }
    })

    // 1 — the felt eraser sweeps yesterday off, left to right; behind it only the ghost and wide arcs of haze remain
    D.pass('wipe the board', 0.8, () => {
      if (o.ghosts) D.fill([[-4, -4], [W + 4, -4], [W + 4, H + 4], [-4, H + 4]], board, { alpha: 0.93, grow: 'wipe', dir: 0, cost: 2 })
      D.layer({ soften: 9 * u, alpha: 0.9 }, () => {
        for (let i = 0; i < 9; i++) {
          const cx = W * (0.1 + 0.8 * hash(i, 1)), cy = H * (0.1 + 0.8 * hash(i, 2)), rr = (120 + 160 * hash(i, 3)) * u, a0 = hash(i, 4) * 6
          D.stroke(K.arc(cx, cy, rr, rr * 0.55, a0, a0 + 2.2, 14), { w: (40 + 30 * hash(i, 5)) * u, color: white, alpha: 0.05, taper: 0.4, wobble: 3 * u, seed: 6 + i, cost: 0.3 })
        }
      })
    })

    // 2 — the tip of the chalk: each shape placed with a light outline
    D.pass('outline with the tip', 1, () => {
      const outl = S.solid.filter((r) => r.contour).map((r) => [r, chalkOf(r.color), visibleRuns(S, K, r.pts, r, { closed: true })])
      chalk((dust) => { for (const [r, c, runs] of outl) for (const run of runs) D.stroke(run, { w: (dust ? 4.5 : 1.8) * u, color: c, alpha: 0.6, taper: 0.5, pressure: 0.3, wobble: 1.4 * u, rough: 0.4, seed: r.i + 2 + run.length, boil: !dust, cost: 0.5 }) }, 0.18)
    })

    // 3 — the side of the chalk dragged back and forth over each shape; more chalk where the picture is lighter
    D.pass('side of the chalk', 3, () => {
      const work = patches.filter((r) => !(r && r.role === 'glow')).map((r) => { // a light source is worked last, smudged
        const own = owner(r), f = flatness(r)
        return [r ? chalkOf(r.color) : white, f, scrub(dragRuns(r ? r.bbox : sheet, angleOf(r), 5 * u, (x, y) => own(x, y) && v(x, y) > 0.18, { step: 5 * u, jitter: 3 * u, seed: (r ? r.i : 0) + 3 }), (r ? r.i : 0) + 5)]
      })
      chalk((dust) => { for (const [c, f, runs] of work) for (const run of runs) drag(D, K, run, { w: (dust ? 12 : 6.5) * u, color: c, piece: 3, cap: 'round', alphaAt: (x, y) => 0.5 * f * K.smoothstep(0.18, 0.9, v(x, y)), cost: 0.25 }) }, 0.22, undefined, 1.7)
    })

    // 4 — the lit side gone over again, crosswise, and the lit limb drawn firm with the tip
    D.pass('lit side worked twice', 1.4, () => {
      const round = S.solid.filter((r) => r.form >= 0.3 && r.role !== 'bg' && r.role !== 'ground').map((r) => {
        const own = owner(r)
        return [r, chalkOf(r.color), scrub(dragRuns(r.bbox, angleOf(r) + 1.4, 5 * u, (x, y) => own(x, y) && r.toneAt(x, y) > 0.6, { step: 5 * u, jitter: 3 * u, seed: r.i + 9 }), r.i + 7),
          r.contour ? K.runs(r.pts, (i, n) => K.facing(n, L) > 0.2).flatMap((run) => visibleRuns(S, K, run, r)) : []]
      })
      chalk((dust) => { for (const [r, c, runs] of round) for (const run of runs) drag(D, K, run, { w: (dust ? 11 : 5.5) * u, cap: 'round', color: c, piece: 3, alphaAt: (x, y) => 0.45 * K.smoothstep(0.6, 0.85, r.toneAt(x, y)) * K.smoothstep(0.2, 0.6, v(x, y)), cost: 0.25 }) }, 0.2, undefined, 1.7)
      chalk((dust) => { for (const [r, c, , limbs] of round) for (const run of limbs) D.stroke(run, { w: (dust ? 6 : 2.6) * u, color: c, alpha: 0.92, taper: 0.7, pressure: 0.6, wobble: 1 * u, rough: 0.5, boil: !dust, seed: r.i * 11 + run.length, cost: 0.6 }) }, 0.2)
    })

    // 5 — light sources and light falling on things: chalk laid thick, then smudged round with a finger into a glow
    D.pass('finger smudge', 0.8, () => {
      for (const r of S.regions.filter((q) => q.role === 'glow' || q.role === 'highlight')) {
        const c = chalkOf(r.role === 'glow' ? r.lit : r.color), cut = S.occluders(r, { light: false }), glow = r.role === 'glow'
        D.layer({ soften: (glow ? 26 : 16) * u, alpha: glow ? 0.35 : 0.22, cut }, () => D.fill(glow ? K.offset(r.pts, 18 * u) : r.pts, c, { grow: 'spread', from: [r.bbox.cx, r.bbox.cy] }))
        if (glow) chalk((dust) => { D.clip(r.pts, () => { for (const run of dragRuns(r.bbox, -0.7, 3.6 * u, (x, y) => v(x, y) > 0.3, { step: 5 * u, seed: r.i + 5 })) drag(D, K, run, { w: (dust ? 8 : 4.4) * u, color: c, piece: 3, alphaAt: (x, y) => 0.55 * K.smoothstep(0.3, 0.8, v(x, y)), cost: 0.25 }) }) }, 0.25, cut)
      }
    })

    // 6 — lines: light ones in chalk with their dust (steam rises in chalk); dark ones wiped back to slate with a finger
    D.pass('lines and dust', 0.8, () => {
      D.layer({ soften: 0.8 * u }, () => { for (const l of darks) for (const run of visibleRuns(S, K, l.pts, l)) D.stroke(run, { w: Math.max(2.5 * u, l.w * 1.1), color: board, alpha: 0.75, taper: 0.6, wobble: 0.8 * u, seed: l.i * 7 + run.length, cost: 0.6 }) })
      const lit = lights.map((l) => [l, visibleRuns(S, K, l.pts, l)])
      chalk((dust) => { for (const [l, runs] of lit) for (const run of runs) D.stroke(run, { w: (dust ? 2.6 : 1) * Math.max(3 * u, l.w * 0.9), color: chalkOf(l.color), alpha: 0.9, taper: 0.7, pressure: 0.5, rough: 0.6, wobble: 1.4 * u, boil: true, seed: l.i * 7 + run.length, cost: 0.7 }) }, 0.25)
    })

    D.top(() => {
      D.texture('slate', { opacity: 0.28 })
      if (!o.frame) return
      const t = 22 * u, wood = '#7b5231', dark = '#553620'
      D.mark(0.001, (ctx) => {
        ctx.save()
        ctx.fillStyle = 'rgba(8,14,11,0.5)'; ctx.fillRect(t, t, W - 2 * t, 8 * u); ctx.fillRect(t, t, 8 * u, H - 2 * t) // the frame stands proud of the slate
        ctx.fillStyle = wood; ctx.fillRect(0, 0, W, t); ctx.fillRect(0, 0, t, H); ctx.fillRect(W - t, 0, t, H); ctx.fillStyle = '#6a4526'; ctx.fillRect(0, H - t * 1.3, W, t * 1.3)
        ctx.fillStyle = '#8c6139'; ctx.fillRect(0, H - t * 1.3, W, t * 0.35)
        ctx.strokeStyle = dark; ctx.globalAlpha = 0.45; ctx.lineWidth = 0.9 * u
        for (let i = 0; i < 40; i++) {
          const y = hash(i, 1) * H, x = hash(i, 2) < 0.5 ? hash(i, 3) * t : W - t + hash(i, 3) * t
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (hash(i, 4) - 0.5) * 3, y + (40 + hash(i, 5) * 60) * u); ctx.stroke()
        }
        ctx.globalAlpha = 1; ctx.fillStyle = white
        for (let i = 0; i < 120; i++) { ctx.globalAlpha = 0.2 + 0.4 * hash(i, 7); ctx.beginPath(); ctx.arc(t + hash(i, 6) * (W - 2 * t), H - t * 1.3 + hash(i, 8) * t * 0.35, (0.8 + 1.6 * hash(i, 9)) * u, 0, Math.PI * 2); ctx.fill() }
        ctx.restore()
      })
    })
  },
}

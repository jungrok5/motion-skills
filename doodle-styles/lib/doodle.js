// lib/doodle.js — one function from (piece, style, time) to pixels. Used by the page and by every script.
//
// Timeline of a piece (piece.seconds = { draw, hold, live }):
//   0 … draw          the picture draws itself in the style's own order (progress 0 → 1)
//   draw … +hold      the finished still, held
//   … +live           optional life: scene(K, t) moves (steam, a flame, a leaf), t = seconds since the still
// renderAt(draw) is the still, pixel for pixel. renderAt is pure: same t, same pixels.
import * as K from './kit.js'
import { prepare } from './scene.js'
import { Draw, play, passAt } from './draw.js'

export function timing(piece) {
  const s = piece.seconds || {}
  const draw = s.draw ?? 6, hold = s.hold ?? 1.5, live = s.live ?? 0
  return { draw, hold, live, total: draw + hold + live }
}

export function makeEnv(W, H, scale = 1) {
  const pool = [], scratch = []
  const dev = () => K.canvas(Math.round(W * scale), Math.round(H * scale))
  return {
    W, H, scale, cache: new Map(), frame: 0, plateRes: 0.5,
    layer: () => pool.pop() || dev(),
    release: (c) => pool.push(c),
    scratch: (i) => (scratch[i] ||= dev()),
  }
}

/**
 * renderer(target, piece, style, opts) → { renderAt(t), drawAt(P, live), DURATION, W, H, passAt(t) }
 * target: a canvas (its size is set to W·scale × H·scale)
 * opts: { scale, house, tweaks } — house = the studio's house-style.json ({ style, tweaks: { <id>: { paper, inks … } } })
 */
export function renderer(target, piece, style, opts = {}) {
  const [W, H] = piece.size || [1080, 1080], scale = opts.scale ?? 1
  target.width = Math.round(W * scale); target.height = Math.round(H * scale)
  const ctx = target.getContext('2d'), env = makeEnv(W, H, scale), T = timing(piece)
  // settings: the style's defaults < the house style's tweaks for it < this piece's < an explicit override
  const tweaks = { ...(style.defaults || {}), ...(opts.house?.tweaks?.[style.id] || {}), ...(piece.tweaks?.[style.id] || {}), ...(opts.tweaks || {}) }
  let still = null
  const record = (live) => {
    if (live === 0 && still) return still
    env.frame = live > 0 ? Math.floor(live * 12) + 1 : 0 // line boil on twos (12 drawings a second) once alive
    const S = prepare(piece, K, live, env)
    const D = new Draw(env)
    style.draw(D, S, K, tweaks)
    const prog = { prog: D.prog, S }
    if (live === 0) still = prog
    return prog
  }
  const drawAt = (P, live = 0) => {
    const { prog } = record(live)
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1
    ctx.clearRect(0, 0, target.width, target.height)
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    play(prog, ctx, P, env)
  }
  const split = (t) => {
    if (t < T.draw) return [Math.max(0, t / T.draw), 0]
    if (t < T.draw + T.hold || !T.live) return [1, 0]
    return [1, Math.min(T.live, t - T.draw - T.hold)]
  }
  return {
    W, H, DURATION: T.total, timing: T, style, tweaks,
    renderAt: (t) => { const [P, live] = split(t); drawAt(P, live) },
    drawAt,
    passAt: (t) => { const [P, live] = split(t); return live > 0 ? 'alive' : P >= 1 ? 'finished' : passAt(record(0).prog, P) },
    passes: () => record(0).prog.passes.map((p) => ({ name: p.name, weight: p.weight, marks: p.nodes.length })),
  }
}

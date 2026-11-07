// lib/draw.js — the drawing recorder and player.
//
// A style draws the WHOLE picture through `D` (a Draw), in the order an artist in that medium works:
//   D.ground(fn)            the sheet itself: there before the first mark, never animated
//   D.pass(name, weight, fn) one stage of the medium's order (underdrawing, washes, line…); `weight` is its share of time
//   D.top(fn)               always on top of everything (paper tooth, grain, a vignette)
// Inside, every primitive (stroke, line, fill, wash, dots, rects, mark) becomes a MARK with a cost.
// The player then shows any moment of the drawing: marks before the cut are drawn whole, the mark at
// the cut is drawn partway (a stroke grows along its centreline, a wash spreads from where the brush
// touched, a block is pulled across), the rest not at all. Progress 1 is the finished still, exactly.
// Nothing fades in: there is no opacity ramp anywhere in the player.
import { clamp, dist, length, smooth, densify, wobble, upTo, ribbon, path, tile, soften, bbox, area, displace, scale } from './kit.js'

const sum = (nodes) => nodes.reduce((a, n) => a + n.cost, 0)

export class Draw {
  constructor(env) {
    this.env = env; this.W = env.W; this.H = env.H; this.frame = env.frame || 0
    this.prog = { ground: [], passes: [], top: [] }
    this.cur = this.prog.ground
  }
  // ---- structure
  _into(list, fn) { const prev = this.cur; this.cur = list; fn(); this.cur = prev }
  ground(fn) { this._into(this.prog.ground, fn) }
  top(fn) { this._into(this.prog.top, fn) }
  pass(name, weight, fn) { const p = { name, weight: Math.max(0.001, weight), nodes: [] }; this.prog.passes.push(p); this._into(p.nodes, fn); p.cost = sum(p.nodes) }
  /** an offscreen layer: draw into it, then soften / cut with a tooth tile / composite with a blend, alpha and offset.
   *  opts: { blend, alpha, off:[dx,dy], soften: px, tooth: tileName, toothScale, cut: [pts…] (erased: what hides it), mask: pts (kept: only inside) } */
  layer(opts, fn) { const n = { layer: opts || {}, nodes: [], cost: 0 }; this._into(n.nodes, fn); n.cost = sum(n.nodes); this.cur.push(n) }
  /** draw only inside a closed outline */
  clip(pts, fn) { const n = { clip: pts, nodes: [], cost: 0 }; this._into(n.nodes, fn); n.cost = sum(n.nodes); this.cur.push(n) }
  /** a raw mark: draw(ctx, k) with k in (0, 1] — k < 1 means "this much of the mark so far" */
  mark(cost, draw) { this.cur.push({ cost: Math.max(1e-6, cost), draw }) }
  /** a breath: time passes, nothing is drawn (a brush reloaded, the next block inked) */
  pause(cost = 1) { this.mark(cost, () => {}) }

  // ---- primitives
  /** a tapered, pressure-shaped stroke that grows along its centreline.
   *  o: { w, color, alpha, taper, pressure, rough, seed, wobble (px of hand drift), boil (re-wobble each drawing once alive),
   *       smooth (Catmull-Rom the points; default: keep corners), step, blend, cost, closed } */
  stroke(pts, o = {}) {
    if (!pts || pts.length < 2) return
    let c = o.closed ? [...pts, pts[0]] : pts
    c = o.smooth ? smooth(c, false, o.step || 5) : densify(c, o.step || 5)
    if (o.wobble) c = wobble(c, o.wobble, (o.seed || 1) * 31 + (o.boil ? this.frame * 7 : 0))
    const opts = { w: o.w ?? 3, taper: o.taper ?? 0.8, pressure: o.pressure ?? 0.4, rough: o.rough ?? 0.15, seed: o.seed ?? 1 }
    const color = o.color || '#2b2522', alpha = o.alpha ?? 1, blend = o.blend
    this.mark(((o.cost ?? 1) * length(c)) / 100, (ctx, k) => {
      const r = ribbon(c, { ...opts, k })
      if (r.length < 3) return
      ctx.save(); if (blend) ctx.globalCompositeOperation = blend; ctx.globalAlpha = alpha; ctx.fillStyle = color; path(ctx, r); ctx.fill(); ctx.restore()
    })
  }
  /** a plain round-capped line of constant width (ruling pen, thread, wire, chalk core); grows by length */
  line(pts, o = {}) {
    if (!pts || pts.length < 2) return
    const c = o.smooth ? smooth(pts, false, 5) : pts, color = o.color || '#2b2522', w = o.w ?? 2, alpha = o.alpha ?? 1, blend = o.blend, cap = o.cap || 'round', dash = o.dash
    this.mark(((o.cost ?? 1) * length(c)) / 120, (ctx, k) => {
      const s = upTo(c, k); if (s.length < 2) return
      ctx.save(); if (blend) ctx.globalCompositeOperation = blend; ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = cap; ctx.lineJoin = 'round'
      if (dash) ctx.setLineDash(dash)
      path(ctx, s, false); ctx.stroke(); ctx.restore()
    })
  }
  /** a filled shape. How it arrives while drawing (o.grow):
   *  'spread' (default) a circle growing from o.from — paint touching down and spreading;
   *  'wipe'   a straight front moving across at angle o.dir (radians; default 90° = top to bottom) — a print pull, a roller;
   *  'cut'    appears whole when the mark is reached — a piece of cut paper laid down, a stamp.
   *  o: { alpha, blend, grow, from:[x,y], dir, cost } */
  fill(pts, color, o = {}) {
    if (!pts || pts.length < 3) return
    const alpha = o.alpha ?? 1, blend = o.blend, grow = o.grow || 'spread', b = bbox(pts)
    const from = o.from || [b.x0 + b.w * 0.3, b.y0 + b.h * 0.3]
    this.mark(((o.cost ?? 1) * Math.sqrt(Math.abs(area(pts)) + 1)) / 40, (ctx, k) => {
      ctx.save(); if (blend) ctx.globalCompositeOperation = blend; ctx.globalAlpha = alpha; ctx.fillStyle = color
      if (k < 1) growClip(ctx, b, grow, from, o.dir ?? Math.PI / 2, k)
      path(ctx, pts); ctx.fill(); ctx.restore()
    })
  }
  /** watercolour: the wet edge is displaced geometry, the wash shrinks off its line, pigment settles at the rim.
   *  o: { alpha, seed, dx, dy, shrink, rim, edge (displacement px), blend, from } */
  wash(pts, color, o = {}) {
    const seed = o.seed ?? 1, sh = o.shrink ?? 0.95
    const base = densify(pts, 7, true)
    const s = displace(scale(base, sh).map(([x, y]) => [x + (o.dx ?? 2), y + (o.dy ?? 2)]), o.edge ?? 12, 0.025, seed + 5)
    const alpha = o.alpha ?? 0.6, rim = o.rim ?? true, b = bbox(s), from = o.from || [b.x0 + b.w * 0.3, b.y0 + b.h * 0.25], blend = o.blend
    this.mark(((o.cost ?? 1) * Math.sqrt(Math.abs(area(s)) + 1)) / 40, (ctx, k) => {
      ctx.save(); if (blend) ctx.globalCompositeOperation = blend
      if (k < 1) growClip(ctx, b, 'spread', from, 0, k)
      ctx.globalAlpha = alpha; ctx.fillStyle = color; path(ctx, s); ctx.fill()
      if (rim) { ctx.globalAlpha = alpha * 0.5; ctx.strokeStyle = color; ctx.lineWidth = o.rimW ?? 2.5; ctx.lineJoin = 'round'; path(ctx, s); ctx.stroke() }
      ctx.restore()
    })
  }
  /** many small round marks (stipple, dabs of dust, stitches' knots): list of [x, y, r] or [x, y, r, color].
   *  While drawing, the first k·n appear in list order — order the list the way the hand works. */
  dots(list, color, o = {}) {
    if (!list.length) return
    const alpha = o.alpha ?? 1, blend = o.blend
    this.mark((o.cost ?? 1) * list.length * 0.02, (ctx, k) => {
      const n = Math.ceil(list.length * k)
      ctx.save(); if (blend) ctx.globalCompositeOperation = blend; ctx.globalAlpha = alpha
      let cur = null
      for (let i = 0; i < n; i++) {
        const [x, y, r, c] = list[i], col = c || color
        if (col !== cur) { if (cur) ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); cur = col }
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2)
      }
      if (cur) ctx.fill()
      ctx.restore()
    })
  }
  /** many rectangles (pixels, bricks, tiles): list of [x, y, w, h, color]; the first k·n in list order */
  rects(list, o = {}) {
    if (!list.length) return
    const alpha = o.alpha ?? 1, blend = o.blend
    this.mark((o.cost ?? 1) * list.length * 0.01, (ctx, k) => {
      const n = Math.ceil(list.length * k)
      ctx.save(); if (blend) ctx.globalCompositeOperation = blend; ctx.globalAlpha = alpha
      for (let i = 0; i < n; i++) { const [x, y, w, h, c] = list[i]; ctx.fillStyle = c; ctx.fillRect(x, y, w, h) }
      ctx.restore()
    })
  }
  /** a seamless tile over the whole picture so far: grey tiles multiply (the sheet's texture), alpha tiles are not for this.
   *  o: { opacity, blend, scale } — usually inside D.top() */
  texture(kind, o = {}) {
    const env = this.env
    this.mark(0.001, (ctx) => {
      const t = tile(kind, env), pat = ctx.createPattern(t, 'repeat')
      if (o.scale && o.scale !== 1) pat.setTransform(new DOMMatrix().scale(o.scale))
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = o.blend || 'multiply'; ctx.globalAlpha = o.opacity ?? 0.5
      ctx.fillStyle = pat; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore()
    })
  }
  /** flat colour over the whole sheet (the paper, the board, the slate) */
  sheet(color) { const W = this.W, H = this.H; this.mark(0.001, (ctx) => { ctx.save(); ctx.fillStyle = color; ctx.fillRect(-2, -2, W + 4, H + 4); ctx.restore() }) }
}

function growClip(ctx, b, grow, from, dir, k) {
  ctx.beginPath()
  if (grow === 'cut') { if (k <= 0) ctx.rect(0, 0, 0, 0); else ctx.rect(b.x0 - 50, b.y0 - 50, b.w + 100, b.h + 100) }
  else if (grow === 'wipe') {
    const c = Math.cos(dir), s = Math.sin(dir), cx = b.cx, cy = b.cy, R = Math.hypot(b.w, b.h) / 2 + 4, d = -R + 2 * R * k
    // the half-plane behind the front: points p with (p - centre)·dir < d
    const px = cx + c * d, py = cy + s * d, ox = -s * R * 2, oy = c * R * 2
    ctx.moveTo(px + ox, py + oy); ctx.lineTo(px - ox, py - oy); ctx.lineTo(px - ox - c * R * 3, py - oy - s * R * 3); ctx.lineTo(px + ox - c * R * 3, py + oy - s * R * 3); ctx.closePath()
  } else {
    const R = Math.max(dist(from, [b.x0, b.y0]), dist(from, [b.x1, b.y0]), dist(from, [b.x0, b.y1]), dist(from, [b.x1, b.y1])) + 6
    const e = 1 - (1 - k) * (1 - k)
    ctx.arc(from[0], from[1], Math.max(0.5, R * e), 0, Math.PI * 2)
  }
  ctx.clip()
}

// ------------------------------------------------------------------ player
/** draw a recorded program at progress P (0 = blank sheet, 1 = the finished still) */
export function play(prog, ctx, P, env) {
  playNodes(prog.ground, ctx, Infinity, env)
  const W = prog.passes.reduce((a, p) => a + p.weight, 0) || 1
  let acc = 0
  for (const p of prog.passes) {
    const a = acc / W, b = (acc + p.weight) / W; acc += p.weight
    const k = P >= 1 ? 1 : clamp((P - a) / (b - a || 1))
    if (k <= 0) break
    playNodes(p.nodes, ctx, k >= 1 ? Infinity : k * p.cost, env)
    if (k < 1) break
  }
  playNodes(prog.top, ctx, Infinity, env)
}
/** which pass is being drawn at progress P (for captions and checks) */
export function passAt(prog, P) {
  const W = prog.passes.reduce((a, p) => a + p.weight, 0) || 1
  let acc = 0
  for (const p of prog.passes) { acc += p.weight; if (P <= acc / W) return p.name }
  return prog.passes.length ? prog.passes[prog.passes.length - 1].name : ''
}

function playNodes(nodes, ctx, budget, env) {
  for (const n of nodes) {
    if (budget <= 0) return 0
    if (n.layer) budget = playLayer(n, ctx, budget, env)
    else if (n.clip) { ctx.save(); path(ctx, n.clip); ctx.clip(); budget = playNodes(n.nodes, ctx, budget, env); ctx.restore() }
    else {
      const k = budget >= n.cost ? 1 : budget / n.cost
      n.draw(ctx, k)
      budget -= n.cost
    }
  }
  return budget
}
function playLayer(n, ctx, budget, env) {
  const o = n.layer, L = env.layer(), x = L.getContext('2d'), s = env.scale
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, L.width, L.height)
  x.setTransform(s, 0, 0, s, 0, 0)
  const left = playNodes(n.nodes, x, budget, env)
  if (o.soften) soften(L, o.soften, env)
  if (o.tooth) {
    const t = tile(o.tooth, env), pat = x.createPattern(t, 'repeat')
    if (o.toothScale && o.toothScale !== 1) pat.setTransform(new DOMMatrix().scale(o.toothScale))
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-in'; x.fillStyle = pat; x.fillRect(0, 0, L.width, L.height); x.restore()
  }
  if (o.cut && o.cut.length) {
    x.save(); x.setTransform(s, 0, 0, s, 0, 0); x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000'
    for (const c of o.cut) { path(x, c); x.fill() }
    x.restore()
  }
  if (o.mask) {
    x.save(); x.setTransform(s, 0, 0, s, 0, 0); x.globalCompositeOperation = 'destination-in'; x.fillStyle = '#000'; path(x, o.mask); x.fill(); x.restore()
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = o.blend || 'source-over'; ctx.globalAlpha = o.alpha ?? 1
  const dx = Math.round((o.off?.[0] || 0) * s), dy = Math.round((o.off?.[1] || 0) * s)
  ctx.drawImage(L, dx, dy)
  ctx.restore()
  env.release(L)
  return left
}

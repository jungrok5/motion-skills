// draw.js — vector paths through the deformer. A path is a flat list: 'M', x, y, 'L', x, y, 'C', x1, y1, x2, y2, x, y,
// 'Q', x1, y1, x, y, 'Z' in model px (1000 x 1000). Every point, control points included, goes through f(x, y, out),
// so a shape bends with the head instead of sliding as a flat sticker.

export function addPath(ctx, f, c) {
  const o = [0, 0]
  let i = 0
  while (i < c.length) {
    const k = c[i++]
    if (k === 'M' || k === 'L') { f(c[i], c[i + 1], o); if (k === 'M') ctx.moveTo(o[0], o[1]); else ctx.lineTo(o[0], o[1]); i += 2 }
    else if (k === 'C') {
      f(c[i], c[i + 1], o); const x1 = o[0], y1 = o[1]
      f(c[i + 2], c[i + 3], o); const x2 = o[0], y2 = o[1]
      f(c[i + 4], c[i + 5], o); ctx.bezierCurveTo(x1, y1, x2, y2, o[0], o[1]); i += 6
    } else if (k === 'Q') {
      f(c[i], c[i + 1], o); const x1 = o[0], y1 = o[1]
      f(c[i + 2], c[i + 3], o); ctx.quadraticCurveTo(x1, y1, o[0], o[1]); i += 4
    } else if (k === 'Z') ctx.closePath()
  }
}
export function trace(ctx, f, c) { ctx.beginPath(); addPath(ctx, f, c) }
export function fill(ctx, f, c, style, alpha = 1) { trace(ctx, f, c); ctx.globalAlpha = alpha; ctx.fillStyle = style; ctx.fill(); ctx.globalAlpha = 1 }
export function stroke(ctx, f, c, style, w, alpha = 1) {
  trace(ctx, f, c); ctx.globalAlpha = alpha; ctx.strokeStyle = style; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.globalAlpha = 1
}
/** run draw() clipped to a path */
export function clipped(ctx, f, c, draw) { ctx.save(); trace(ctx, f, c); ctx.clip(); draw(); ctx.restore() }

/** an ellipse as four cubics (so it bends too) */
export const ell = (cx, cy, rx, ry) => {
  const k = 0.5523
  return ['M', cx + rx, cy, 'C', cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry, 'C', cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy,
    'C', cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry, 'C', cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy, 'Z']
}
/** the same path mirrored about x = cx */
export function mirror(c, cx = 500) {
  let n = 0
  return c.map((v) => { if (typeof v === 'string') { n = 0; return v } const r = n % 2 === 0 ? 2 * cx - v : v; n++; return r })
}
/** a path from local points: map(lx, ly) -> model; cmds as above but with [x, y] pairs */
export function local(c, map) {
  const out = []
  let n = 0, px = 0
  for (const v of c) {
    if (typeof v === 'string') { out.push(v); n = 0; continue }
    if (n % 2 === 0) px = v
    else { const p = map(px, v); out.push(p[0], p[1]) }
    n++
  }
  return out
}
export function linear(ctx, f, x0, y0, x1, y1, stops) {
  const a = f(x0, y0, [0, 0]), b = f(x1, y1, [0, 0])
  const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1])
  for (const [o, c] of stops) g.addColorStop(o, c)
  return g
}
export function radial(ctx, f, x, y, r0, r1, stops) {
  const a = f(x, y, [0, 0])
  const g = ctx.createRadialGradient(a[0], a[1], r0, a[0], a[1], r1)
  for (const [o, c] of stops) g.addColorStop(o, c)
  return g
}

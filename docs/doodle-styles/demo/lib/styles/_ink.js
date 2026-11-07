// lib/styles/_ink.js — private helpers shared by the ink & brush hands (line-wash, sumi-e, marker-comic, rubber-hose).
// Not a style: index.js never lists it.

export const OFF_ROLES = ['shadow', 'glow', 'highlight']
/** regions that are things (not cast shadows, glows or patches of light) */
export const solidOf = (S) => S.regions.filter((r) => !OFF_ROLES.includes(r.role))
/** a cut list, or undefined when nothing hides the item (saves a layer) */
export const cutOf = (S, it) => { const c = S.occluders(it, { light: false }); return c.length ? c : null }
/** run fn in a layer when something must be cut out of it, else straight onto the sheet */
export function maybeLayer(D, cut, opts, fn) {
  if (cut || (opts && Object.keys(opts).length)) D.layer({ ...(opts || {}), ...(cut ? { cut } : {}) }, fn)
  else fn()
}
/** a scale for marks: 1 at a 1080 px short side */
export const unit = (S) => Math.min(S.W, S.H) / 1080

/**
 * A pen / brush-pen line whose width is decided point by point: the width callback gets
 *   (t 0..1 along the line, n the outward normal (closed) or left normal (open), p the point, s px from the start)
 * and returns a full width in px. Open lines get pointed ends over tip px (o.tip = [in, out]).
 * While drawing it grows along its centreline with a pointed travelling tip.
 * o: { closed, width(fn) | w, color, alpha, blend, seed, wobble, boil, rough, tip:[a,b], smooth, step, cost }
 */
export function nib(D, K, pts, o = {}) {
  if (!pts || pts.length < 2) return
  const closed = !!o.closed
  let c = closed ? [...pts, pts[0]] : pts
  c = o.smooth ? K.smooth(c, false, o.step || 4) : K.densify(c, o.step || 4)
  if (o.wobble) c = K.wobble(c, o.wobble, (o.seed || 1) * 31 + (o.boil ? D.frame * 7 : 0))
  const n = c.length
  if (n < 2) return
  const nn = K.normals(c, false), sg = closed && K.area(c) > 0 ? -1 : 1
  const acc = new Float32Array(n)
  for (let i = 1; i < n; i++) acc[i] = acc[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1])
  const total = acc[n - 1] || 1, seed = o.seed || 1, rough = o.rough ?? 0.12
  const [tin, tout] = o.tip || (closed ? [0, 0] : [12, 18])
  const hw = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const s = acc[i], t = s / total, w = o.width ? o.width(t, [nn[i][0] * sg, nn[i][1] * sg], c[i], s) : (o.w ?? 2)
    const ends = Math.min(tin ? Math.min(1, s / tin) : 1, tout ? Math.min(1, (total - s) / tout) : 1)
    hw[i] = Math.max(0.12, (w / 2) * (0.12 + 0.88 * Math.sqrt(Math.max(0, ends))) * (1 + (K.noise(seed, s * 0.07, 3) - 0.5) * 2 * rough))
  }
  const color = o.color || '#16131f', alpha = o.alpha ?? 1, blend = o.blend
  D.mark(((o.cost ?? 1) * total) / 100, (ctx, k) => {
    const cut = total * k, L = [], R = []
    for (let i = 0; i < n; i++) {
      let p = c[i], h = hw[i]
      if (acc[i] > cut) {
        if (!i) break
        const f = (cut - acc[i - 1]) / (acc[i] - acc[i - 1] || 1)
        p = [c[i - 1][0] + (c[i][0] - c[i - 1][0]) * f, c[i - 1][1] + (c[i][1] - c[i - 1][1]) * f]; h = 0.3
        L.push([p[0] + nn[i][0] * h, p[1] + nn[i][1] * h]); R.push([p[0] - nn[i][0] * h, p[1] - nn[i][1] * h])
        break
      }
      if (k < 1) h *= Math.sqrt(Math.min(1, (cut - acc[i]) / Math.max(3, h * 3) + 0.05)) // the travelling tip is pointed
      L.push([p[0] + nn[i][0] * h, p[1] + nn[i][1] * h]); R.push([p[0] - nn[i][0] * h, p[1] - nn[i][1] * h])
    }
    if (L.length < 2) return
    ctx.save(); if (blend) ctx.globalCompositeOperation = blend; ctx.globalAlpha = alpha; ctx.fillStyle = color
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); for (let i = 1; i < L.length; i++) ctx.lineTo(L[i][0], L[i][1])
    for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]); ctx.closePath(); ctx.fill(); ctx.restore()
  })
}

/** an open line moved sideways by d px along its left normal (a hairline beside a light line) */
export function beside(K, pts, d) {
  const c = K.densify(pts, 6), nn = K.normals(c, false)
  return c.map(([x, y], i) => [x + nn[i][0] * d, y + nn[i][1] * d])
}
/** which side of an open line faces away from the light: +1 left normal, -1 right */
export function shadeSide(K, pts, L) {
  const nn = K.normals(pts, false); let s = 0
  for (const n of nn) s += n[0] * L[0] + n[1] * L[1]
  return s > 0 ? -1 : 1
}
/** split an open polyline into pieces where keep(i) holds (broken lines, dashes left by a lifting pen) */
export function pieces(pts, keep) {
  const out = []; let cur = null
  pts.forEach((p, i) => { if (keep(i, p)) (cur ||= []).push(p); else if (cur) { if (cur.length > 1) out.push(cur); cur = null } })
  if (cur && cur.length > 1) out.push(cur)
  return out
}
/** a light line (steam, a white bar, a glint) by colour; steam by its role */
export const lightLine = (K, l) => K.isLight(l.color) || l.role === 'steam'

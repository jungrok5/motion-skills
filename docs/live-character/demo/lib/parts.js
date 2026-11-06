// lib/parts.js — the drawing kit. Faces (anime eyes, brows, mouths, blush; animal eyes, noses, muzzles), limbs (a
// tapered tube through the joints), hands and paws. Face parts take a deformer function f (model px -> canvas) so they
// bend with the head; limb parts take canvas points from Limb.solve(). Colours come from the character's palette:
// nothing here is a particular character. Use them, restyle them by options, or draw a part of your own beside them.
import { fill, stroke, clipped, ell, local, linear, radial } from './draw.js'
import { lerp, clamp, smooth } from './rig.js'

// ---------------------------------------------------------------- anime eye
// local eye space: +x toward the outer corner, +y down; upper lid I -> T -> O, lower lid O -> B -> I
const LID_OPEN = [[-38, 6], [-34, -24], [-14, -41], [8, -42], [26, -42], [41, -29], [45, -8]]
const LID_CALM = [[-38, 12], [-30, 24], [-10, 30], [8, 30], [24, 30], [38, 21], [45, 8]]
const LID_HAPPY = [[-38, 18], [-30, -2], [-10, -11], [6, -11], [24, -11], [38, -1], [45, 15]]
const LOWER = [[45, -8], [43, 18], [22, 38], [2, 38], [-18, 38], [-34, 26], [-38, 6]]

/** a big anime eye at (cx, cy); s = -1 for the eye on the screen's left, +1 on its right. pal: irisDark, iris,
 *  irisLight, irisGlow, pupil, lash, white, whiteShade. opt: size (1.1), lift (raise the lid's arch), droop (outer corner
 *  down: gentle eyes), wing (the lash flick, 1) */
export function animeEye(ctx, f, cx, cy, s, P, open, t, pal, opt = {}) {
  const k = opt.size ?? 1.1, droop = opt.droop ?? 0, wingK = opt.wing ?? 1
  const sm = P.smile, sur = P.surprise
  const o = clamp(open * (1 - smooth(0.15, 0.9, sm)) + sur * 0.16, 0, 1.25)
  const happy = smooth(0, 0.7, sm)
  const lid = LID_OPEN.map((p, i) => {
    const cl = [lerp(LID_CALM[i][0], LID_HAPPY[i][0], happy), lerp(LID_CALM[i][1], LID_HAPPY[i][1], happy)]
    return [lerp(cl[0], p[0], o), lerp(cl[1], p[1], o) - P.sad * 3 * o + droop * Math.max(0, p[0]) / 45 * 8]
  })
  const lower = LOWER.map(([x, y], i) => [x, y - (i > 0 && i < 6 ? 9 * sm * (1 - Math.abs(x) / 60) : 0) + droop * Math.max(0, x) / 45 * 4])
  const map = (x, y) => [cx + s * x * k, cy + y * k]
  const pts = (arr) => arr.flat()
  const upperC = ['M', ...lid[0], 'C', ...pts(lid.slice(1, 4)), 'C', ...pts(lid.slice(4, 7))]
  const whiteC = [...upperC, 'C', ...pts(lower.slice(1, 4)), 'C', ...pts(lower.slice(4, 7)), 'Z']
  const U = local(upperC, map), W = local(whiteC, map)
  if (o > 0.06) {
    clipped(ctx, f, W, () => {
      fill(ctx, f, W, linear(ctx, f, cx, cy - 42 * k, cx, cy + 10, [[0, pal.whiteShade], [0.7, pal.white]]))
      const sc = (1 - 0.12 * sur) * k / 1.1
      const ix = cx + P.eyeBallX * 16 * k / 1.1, iy = cy - 1 - P.eyeBallY * 12 * k / 1.1 + (1 - Math.min(o, 1)) * 8
      const rx = 26.5 * sc, ry = 36 * sc
      fill(ctx, f, ell(ix, iy, rx, ry), linear(ctx, f, ix, iy - ry, ix, iy + ry, [[0, pal.irisDark], [0.45, pal.iris], [1, pal.irisLight]]))
      fill(ctx, f, ell(ix, iy + ry * 0.48, rx * 0.68, ry * 0.36), pal.irisGlow, 0.55)
      fill(ctx, f, ell(ix, iy + 1, 11 * sc * (1 - 0.3 * sur), 17 * sc * (1 - 0.3 * sur)), pal.pupil)
      stroke(ctx, f, ell(ix, iy, rx, ry), pal.irisDark, 1.6)
      stroke(ctx, f, U, 'rgba(70,30,50,0.22)', 18)
      const tw = 1 + 0.07 * Math.sin(t * 2.3 + cx)
      fill(ctx, f, ell(ix - 10 * sc, iy - 13 * sc, 8 * tw * sc, 10.5 * tw * sc), '#ffffff')
      fill(ctx, f, ell(ix + 9 * sc, iy + 13 * sc, 3.6 * sc, 3.6 * sc), '#ffffff', 0.9)
    })
  }
  stroke(ctx, f, U, pal.lash, lerp(4.6, 7, clamp(o, 0, 1)) * k / 1.1)
  const w = clamp(o, 0, 1)
  if (w > 0.25 && wingK > 0) {
    const wing = local(['M', 45, -8 * w + (1 - w) * 8, 'C', 50, -12, 54, -17, 45 + 13 * wingK, -8 - 13 * wingK, 'C', 52, -21, 44, -18, 37, -14 * w, 'Z'], map)
    fill(ctx, f, wing, pal.lash, smooth(0.25, 0.6, w))
    const crease = local(['M', -22, -52 + (1 - w) * 40, 'Q', 10, -62 + (1 - w) * 40, 36, -44 + (1 - w) * 36], map)
    stroke(ctx, f, crease, pal.lash, 1.6, 0.45 * smooth(0.4, 1, w))
  } else if (happy > 0.3) {
    stroke(ctx, f, local(['M', 45, 15, 'L', 54, 20], map), pal.lash, 3, happy)
  }
  stroke(ctx, f, local(['M', ...lower[0], 'C', ...pts(lower.slice(1, 4))], map), pal.lash, 2, 0.75 * smooth(0.1, 0.5, w))
}

/** a tapered brow over an anime eye: lifts with P.brow, the inner end rises when sad */
export function brow(ctx, f, cx, cy, s, P, color, alpha = 1, opt = {}) {
  const k = opt.size ?? 1, thick = opt.thick ?? 1
  const lift = -P.brow * 11 - P.surprise * 8
  const c = ['M', -30, -60, 'C', -14, -72, 18, -77, 44, -66, 'C', 20, -66 - 5 * thick, -10, -62 - 5 * thick, -30, -55, 'Z']
  const B = local(c, (x, y) => {
    const q = clamp((x + 30) / 74, 0, 1)
    return [cx + s * x * k, cy + y * k + lift + lerp(-P.sad * 11, P.sad * 4, q) + (opt.angry ?? 0) * lerp(8, -4, q)]
  })
  fill(ctx, f, B, color, alpha)
}

/** a small anime mouth: a line at rest, an open shape with tongue and teeth by mouthOpen, round / wide by vowel */
export function mouth(ctx, f, P, cx, cy, pal, opt = {}) {
  const s = P.smile, o = P.mouthOpen, v = P.vowel, sad = P.sad, k = opt.size ?? 1
  const W = 14 * k * (1 + 0.5 * s + 0.3 * o + 0.35 * Math.max(v, 0) * o - 0.5 * Math.max(-v, 0) * o)
  const corner = cy - 5 * s + 4 * sad
  const H = o * 40 * k * (1 - 0.3 * Math.max(v, 0)) * (1 + 0.12 * Math.max(-v, 0))
  if (H < 2) { stroke(ctx, f, ['M', cx - W, corner, 'Q', cx, cy + 7 * s - 3 * sad + 1, cx + W, corner], pal.mouth, 2.6); return }
  const top = cy - 1 - s
  const M = ['M', cx - W, corner, 'C', cx - W * 0.55, top - 3, cx + W * 0.55, top - 3, cx + W, corner,
    'C', cx + W * 0.95, corner + H * 0.85, cx + W * 0.45, cy + H, cx, cy + H, 'C', cx - W * 0.45, cy + H, cx - W * 0.95, corner + H * 0.85, cx - W, corner, 'Z']
  fill(ctx, f, M, pal.mouth)
  clipped(ctx, f, M, () => {
    fill(ctx, f, ell(cx, cy + H * 1.02, W * 0.62, H * 0.42), pal.tongue)
    if (H > 7 && v > -0.4) fill(ctx, f, ['M', cx - W, top - 4, 'L', cx + W, top - 4, 'L', cx + W, top + H * 0.16, 'L', cx - W, top + H * 0.16, 'Z'], '#ffffff', 0.95)
  })
  stroke(ctx, f, M, pal.mouth, 2)
}

/** soft cheek blush; hatch lines once P.blush passes 0.25 */
export function blush(ctx, f, x, y, P, color, opt = {}) {
  const rx = opt.rx ?? 30, ry = opt.ry ?? 14, base = opt.base ?? 0.35
  fill(ctx, f, ell(x, y, rx, ry), radial(ctx, f, x, y, 2, rx, [[0, color], [1, 'rgba(255,135,150,0)']]), base + 0.5 * P.blush)
  if (P.blush > 0.25) for (let i = -1; i <= 1; i++) stroke(ctx, f, ['M', x + i * 10 + 4, y - 8, 'L', x + i * 10 - 3, y + 6], color, 2, smooth(0.25, 0.7, P.blush))
}

// ---------------------------------------------------------------- animal face
/** a round glossy eye (a dog, a cat, a bear): blinks with a lid of fur colour, turns to ^ when smiling.
 *  pal: eye (dark), shine, lid (the fur round it), line */
export function roundEye(ctx, f, cx, cy, r, P, open, t, pal, opt = {}) {
  const ry = r * (opt.tall ?? 1.12), sm = smooth(0.25, 0.85, P.smile), sur = P.surprise
  const o = clamp(open * (1 - sm) + sur * 0.15, 0, 1.2)
  const gx = cx + P.eyeBallX * r * 0.28, gy = cy - P.eyeBallY * r * 0.22
  if (o > 0.35) {   // below this a lid of fur reads as an empty ring: draw the closed line instead
    const E = ell(cx, cy, r * (1 + 0.08 * sur), ry * (1 + 0.08 * sur))
    clipped(ctx, f, E, () => {
      fill(ctx, f, E, pal.eye)
      fill(ctx, f, ell(gx, gy + ry * 0.35, r * 0.75, ry * 0.45), pal.eyeGlow || 'rgba(120,80,60,0.6)', 0.6)
      fill(ctx, f, ell(gx - r * 0.3, gy - ry * 0.32, r * 0.36, ry * 0.36), pal.shine)
      fill(ctx, f, ell(gx + r * 0.32, gy + ry * 0.3, r * 0.14, r * 0.14), pal.shine, 0.85)
      // the lid comes down from the top
      const lidY = cy - ry - 2 + (ry * 2 + 4) * (1 - Math.min(o, 1)) * 0.85
      fill(ctx, f, ['M', cx - r * 1.4, cy - ry * 1.5, 'L', cx + r * 1.4, cy - ry * 1.5, 'L', cx + r * 1.4, lidY, 'Q', cx, lidY + r * 0.25, cx - r * 1.4, lidY, 'Z'], pal.lid)
      if (o < 0.95) stroke(ctx, f, ['M', cx - r * 1.1, lidY, 'Q', cx, lidY + r * 0.25, cx + r * 1.1, lidY], pal.line, 2.4)
    })
    stroke(ctx, f, E, pal.line, 2.2, 0.6)
  } else if (sm > 0.15) {
    stroke(ctx, f, ['M', cx - r, cy + r * 0.25, 'Q', cx, cy - r * 0.8, cx + r, cy + r * 0.25], pal.line, 4.2)
  } else {
    stroke(ctx, f, ['M', cx - r, cy, 'Q', cx, cy + r * 0.45, cx + r, cy], pal.line, 3.6)
  }
}

/** a rounded animal nose with a shine; w, h its size */
export function nose(ctx, f, cx, cy, w, h, pal) {
  const c = ['M', cx - w / 2, cy - h * 0.35, 'C', cx - w / 2, cy - h * 0.7, cx + w / 2, cy - h * 0.7, cx + w / 2, cy - h * 0.35,
    'C', cx + w / 2, cy + h * 0.1, cx + w * 0.15, cy + h * 0.45, cx, cy + h * 0.5, 'C', cx - w * 0.15, cy + h * 0.45, cx - w / 2, cy + h * 0.1, cx - w / 2, cy - h * 0.35, 'Z']
  fill(ctx, f, c, linear(ctx, f, cx, cy - h * 0.6, cx, cy + h * 0.5, [[0, pal.noseLight || pal.nose], [1, pal.nose]]))
  fill(ctx, f, ell(cx - w * 0.16, cy - h * 0.3, w * 0.16, h * 0.12), '#ffffff', 0.55)
}

/** an animal mouth under the nose: the philtrum and a ω at rest; opens by mouthOpen, the tongue hangs out by P.pant */
export function muzzleMouth(ctx, f, P, cx, cy, pal, t, opt = {}) {
  const k = opt.size ?? 1, pant = P.pant || 0, s = P.smile
  const o = clamp(Math.max(P.mouthOpen, pant * 0.55), 0, 1)
  const W = 26 * k * (1 + 0.15 * s), corner = cy + 6 * k - 6 * s * k + 4 * P.sad
  stroke(ctx, f, ['M', cx, cy - 16 * k, 'L', cx, cy], pal.line, 2.6)
  if (o > 0.04) {
    const H = 10 + o * 46 * k
    const M = ['M', cx - W, corner, 'Q', cx - W * 0.5, cy + 2, cx, cy, 'Q', cx + W * 0.5, cy + 2, cx + W, corner,
      'C', cx + W * 0.9, corner + H * 0.8, cx + W * 0.4, cy + H, cx, cy + H, 'C', cx - W * 0.4, cy + H, cx - W * 0.9, corner + H * 0.8, cx - W, corner, 'Z']
    fill(ctx, f, M, pal.mouth)
    const tl = H * (0.55 + pant * 0.8), wob = Math.sin(t * 9) * 2 * pant
    const tongue = ['M', cx - W * 0.45, cy + H * 0.45, 'C', cx - W * 0.55, cy + H * 0.45 + tl * 0.7, cx - W * 0.3 + wob, cy + H * 0.45 + tl, cx + wob, cy + H * 0.45 + tl,
      'C', cx + W * 0.3 + wob, cy + H * 0.45 + tl, cx + W * 0.55, cy + H * 0.45 + tl * 0.7, cx + W * 0.45, cy + H * 0.45, 'Z']
    if (pant > 0.1) { fill(ctx, f, tongue, pal.tongue); stroke(ctx, f, tongue, pal.tongueLine || pal.mouth, 1.8); stroke(ctx, f, ['M', cx + wob * 0.5, cy + H * 0.55, 'L', cx + wob, cy + H * 0.45 + tl * 0.7], pal.tongueLine || pal.mouth, 1.4, 0.6) }
    else clipped(ctx, f, M, () => fill(ctx, f, ell(cx, cy + H, W * 0.6, H * 0.45), pal.tongue))
    stroke(ctx, f, M, pal.line, 2.4)
  } else {
    stroke(ctx, f, ['M', cx - W, corner, 'Q', cx - W * 0.45, cy + 12 * k, cx, cy, 'Q', cx + W * 0.45, cy + 12 * k, cx + W, corner], pal.line, 2.6)
  }
}

// ---------------------------------------------------------------- limbs
/** a tube through canvas points (shoulder, elbow, wrist …) with a width at each, round at both ends, bending smoothly
 *  round the joints. Returns the outline so a cuff or a stripe can be clipped to it */
export function tube(ctx, pts, widths, fillStyle, line, lw = 2, opt = {}) {
  const N = 10, P = [], Wd = []
  const cr = (p0, p1, p2, p3, u) => {
    const u2 = u * u, u3 = u2 * u
    return [0, 1].map((i) => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * u + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * u2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * u3))
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let j = 0; j < N; j++) { P.push(cr(p0, p1, p2, p3, j / N)); Wd.push(lerp(widths[i], widths[i + 1], j / N)) }
  }
  P.push(pts[pts.length - 1]); Wd.push(widths[widths.length - 1])
  const L = [], R = []
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)]
    let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n
    L.push([P[i][0] + nx * Wd[i] / 2, P[i][1] + ny * Wd[i] / 2]); R.push([P[i][0] - nx * Wd[i] / 2, P[i][1] - ny * Wd[i] / 2])
  }
  const path = new Path2D()
  path.moveTo(L[0][0], L[0][1])
  for (const p of L) path.lineTo(p[0], p[1])
  const e = P[P.length - 1], e0 = P[P.length - 2], ae = Math.atan2(e[1] - e0[1], e[0] - e0[0])
  path.arc(e[0], e[1], Wd[Wd.length - 1] / 2, ae - Math.PI / 2, ae + Math.PI / 2)
  for (let i = R.length - 1; i >= 0; i--) path.lineTo(R[i][0], R[i][1])
  const s0 = P[0], s1 = P[1], as = Math.atan2(s0[1] - s1[1], s0[0] - s1[0])
  path.arc(s0[0], s0[1], Wd[0] / 2, as - Math.PI / 2, as + Math.PI / 2)
  path.closePath()
  ctx.fillStyle = fillStyle; ctx.fill(path)
  if (line) {
    ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.lineJoin = 'round'
    if (!opt.openStart) ctx.stroke(path)
    else {  // no outline round the root: the limb grows out of the body (a shoulder, a hip) without a seam
      const o = new Path2D(); o.moveTo(L[2][0], L[2][1]); for (const p of L.slice(2)) o.lineTo(p[0], p[1])
      o.arc(e[0], e[1], Wd[Wd.length - 1] / 2, ae - Math.PI / 2, ae + Math.PI / 2)
      for (let i = R.length - 1; i >= 2; i--) o.lineTo(R[i][0], R[i][1])
      ctx.lineCap = 'round'; ctx.stroke(o)
    }
  }
  return path
}

/** a hand at canvas point p, along angle a (from straight down, as Limb.solve gives ah). shape: relaxed | open | fist |
 *  point; side: the limb's side (the thumb goes toward the body's middle). size: hand length in canvas px.
 *  Drawn as one piece: every part stroked thick first, then all filled over it, so only the outer edge shows */
export function hand(ctx, p, a, size, shape, side, pal) {
  ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(-a)
  const s = size, th = -side
  const parts = []   // [x, y, angle, w, len] capsules from (x, y) along angle; or ['e', x, y, rx, ry]
  if (shape === 'open') {
    parts.push(['e', 0, s * 0.36, s * 0.34, s * 0.32])
    for (let i = 0; i < 4; i++) parts.push([(i - 1.5) * s * 0.15 * -th, s * 0.5, (i - 1.5) * 0.2 * -th, s * 0.15, s * [0.5, 0.58, 0.56, 0.44][i]])
    parts.push([th * s * 0.26, s * 0.3, th * 1.05, s * 0.16, s * 0.38])
  } else if (shape === 'fist') {
    parts.push(['e', 0, s * 0.4, s * 0.34, s * 0.36]); parts.push([th * s * 0.22, s * 0.32, th * 0.5, s * 0.15, s * 0.3])
  } else if (shape === 'point') {
    parts.push(['e', 0, s * 0.4, s * 0.32, s * 0.34]); parts.push([-th * s * 0.12, s * 0.62, -th * 0.05, s * 0.15, s * 0.52]); parts.push([th * s * 0.22, s * 0.32, th * 0.5, s * 0.15, s * 0.3])
  } else {
    parts.push(['e', 0, s * 0.38, s * 0.3, s * 0.36]); parts.push([0, s * 0.5, 0, s * 0.5, s * 0.36]); parts.push([th * s * 0.24, s * 0.22, th * 0.35, s * 0.15, s * 0.36])
  }
  const path = (q) => {
    ctx.beginPath()
    if (q[0] === 'e') ctx.ellipse(q[1], q[2], q[3], q[4], 0, 0, Math.PI * 2)
    else { ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(q[2]); ctx.roundRect(-q[3] / 2, 0, q[3], q[4], q[3] / 2); ctx.restore() }
  }
  ctx.lineJoin = 'round'
  for (const q of parts) { path(q); ctx.strokeStyle = pal.skinLine; ctx.lineWidth = 4.4; ctx.stroke() }
  for (const q of parts) { path(q); ctx.fillStyle = pal.skin; ctx.fill() }
  ctx.strokeStyle = pal.skinLine; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.55; ctx.lineCap = 'round'; ctx.beginPath()
  if (shape === 'relaxed') for (const x of [-0.08, 0.08]) { ctx.moveTo(x * s, s * 0.66); ctx.lineTo(x * s, s * 0.84) }
  if (shape === 'fist') for (const x of [-0.16, 0, 0.16]) { ctx.moveTo(x * s, s * 0.6); ctx.lineTo(x * s, s * 0.72) }
  ctx.stroke(); ctx.globalAlpha = 1
  ctx.restore()
}

/** a paw at canvas point p along angle a; size its length. pal: fur, furLine, pad */
export function paw(ctx, p, a, size, pal, opt = {}) {
  ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(-a)
  const s = size, w = s * (opt.wide ?? 0.62)
  ctx.beginPath(); ctx.moveTo(-w, -s * 0.1)
  ctx.bezierCurveTo(-w * 1.15, s * 0.5, -w * 0.7, s * 0.78, 0, s * 0.78); ctx.bezierCurveTo(w * 0.7, s * 0.78, w * 1.15, s * 0.5, w, -s * 0.1); ctx.closePath()
  ctx.fillStyle = pal.fur; ctx.fill(); ctx.strokeStyle = pal.furLine; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.stroke()
  ctx.beginPath(); for (const x of [-0.33, 0, 0.33]) { ctx.moveTo(x * w * 1.3, s * 0.52); ctx.lineTo(x * w * 1.2, s * 0.76) }
  ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke()
  if (opt.pads) { ctx.fillStyle = pal.pad; ctx.beginPath(); ctx.ellipse(0, s * 0.4, w * 0.35, s * 0.16, 0, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}

/** a soft contact shadow on the ground (does not move with the body) */
export function groundShadow(ctx, x, y, rx, ry, color, alpha = 0.25) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, rx)
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y)
  ctx.beginPath(); ctx.arc(x, y, rx, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill(); ctx.restore()
}

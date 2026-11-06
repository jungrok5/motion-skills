// haru.js — "하루", an original bust drawn in code for the live-character rig.
// Chestnut bob with long side locks and an ahoge, teal eyes, a mustard raincoat with swinging drawstrings.
// Model space is 1000 x 1000; every path goes through the rig's deformer (draw.js), each part at its own depth.
import { trace, addPath, fill, stroke, clipped, ell, mirror, local, linear, radial } from './draw.js'
import { lerp, clamp, smooth } from './rig.js'

export const palette = {
  skin: '#ffe9df', skinShade: '#f5c3b3', skinLine: '#c98273', blush: '#ff8796',
  hairHi: '#e2a37c', hairLight: '#a8613f', hair: '#7f432c', hairDark: '#56291b', hairLine: '#3a1912',
  irisDark: '#173f45', iris: '#2c7d7a', irisLight: '#76d1b8', irisGlow: '#c8f5df', pupil: '#0d2629', lash: '#2a1718', white: '#fffdfb', whiteShade: '#e6dcea',
  mouth: '#86303f', tongue: '#ec8790', teeth: '#ffffff',
  coat: '#f1b23c', coatLight: '#ffd477', coatShade: '#d18c1f', coatDeep: '#b06f12', coatLine: '#8a5310',
  shirt: '#f7f3ec', shirtShade: '#ddd5c8', cord: '#fbf9f4', cordLine: '#b9ab98', aglet: '#5d4a3c',
  leaf: '#6cc495', leafDark: '#3c9466',
}
const C = palette

export const anchors = {
  head: { cx: 500, cy: 400, rx: 150, ry: 172 }, extent: [1.12, 1.15, 1.32],
  neckY: 600, chinY: 582, neckBaseY: 650, headScale: 1.08, bottomY: 1000, faceW: 268,
}
export const rig = { yaw: 0.36, pitch: 0.27, roll: 0.5, bulge: 0.62, drift: [0.12, 0.08], breath: 1, body: { yaw: 0.35, roll: 0.18 }, limits: { yaw: 12, roll: 5 } }

// bangs: [id, root left x, root right x, tip x, tip y, curl]; drawn in this order (outer first, the parting last)
const BANGS = [
  ['b1', 342, 398, 346, 452, -9], ['b7', 602, 658, 654, 452, 9], ['b2', 360, 442, 398, 410, -5], ['b6', 558, 640, 602, 406, 6],
  ['b2s', 396, 434, 420, 378, -2], ['b5s', 568, 606, 584, 380, 2], ['b3', 424, 496, 454, 424, 4], ['b5', 510, 584, 546, 416, 5],
  ['b4', 478, 530, 494, 372, 0],
]
const bang = (xl, xr, tx, ty, curl) => {
  const y = 248
  return ['M', xl, y, 'C', xl + (tx - xl) * 0.1, y + (ty - y) * 0.5, tx - (tx - xl) * 0.35 + curl, ty - (ty - y) * 0.18, tx, ty,
    'C', tx + (xr - tx) * 0.25 + curl * 0.5, ty - (ty - y) * 0.4, xr, y + (ty - y) * 0.45, xr, y]
}

export const locks = [
  ...BANGS.map(([id, xl, xr, tx, ty]) => ({ id, group: 'front', depth: 0.26, root: [(xl + xr) / 2, 250], tip: [tx, ty] })),
  { id: 'sideL', group: 'side', depth: 0.12, bodyBlend: 0.3, root: [360, 300], tip: [345, 705] },
  { id: 'sideR', group: 'side', depth: 0.12, bodyBlend: 0.3, root: [640, 300], tip: [655, 705] },
  { id: 'side2L', group: 'side', depth: 0.04, bodyBlend: 0.4, root: [328, 330], tip: [306, 650], swing: 1.15 },
  { id: 'side2R', group: 'side', depth: 0.04, bodyBlend: 0.4, root: [672, 330], tip: [694, 650], swing: 1.15 },
  { id: 'backC', group: 'back', depth: -0.35, bodyBlend: 0.45, root: [500, 430], tip: [500, 700], swing: 0.6 },
  { id: 'backL', group: 'back', depth: -0.35, bodyBlend: 0.5, root: [340, 440], tip: [330, 740] },
  { id: 'backR', group: 'back', depth: -0.35, bodyBlend: 0.5, root: [660, 440], tip: [670, 740] },
  { id: 'ahoge', group: 'ahoge', depth: 0.12, root: [506, 192], tip: [446, 124] },
  { id: 'cordL', group: 'cord', attach: 'body', root: [463, 672], tip: [455, 850] },
  { id: 'cordR', group: 'cord', attach: 'body', root: [537, 672], tip: [547, 850], swing: 1.1 },
]

// ---------------------------------------------------------------- shapes (model px)
const FACE = ['M', 500, 255, 'C', 570, 255, 628, 290, 634, 350, 'C', 640, 410, 632, 462, 612, 502, 'C', 590, 542, 545, 572, 500, 582,
  'C', 455, 572, 410, 542, 388, 502, 'C', 368, 462, 360, 410, 366, 350, 'C', 372, 290, 430, 255, 500, 255, 'Z']
const NECK = ['M', 463, 540, 'L', 461, 622, 'C', 459, 642, 446, 654, 426, 664, 'L', 574, 664, 'C', 554, 654, 541, 642, 539, 622, 'L', 537, 540, 'Z']
const CHIN_SHADOW = ['M', 440, 548, 'C', 455, 614, 545, 614, 560, 548, 'Z']
const HOOD = ['M', 400, 650, 'C', 396, 618, 440, 598, 500, 598, 'C', 560, 598, 604, 618, 600, 650, 'L', 598, 686, 'L', 402, 686, 'Z']
const COAT = ['M', 446, 642, 'C', 405, 654, 340, 666, 296, 688, 'C', 248, 712, 222, 756, 210, 818, 'L', 196, 1120, 'L', 804, 1120, 'L', 790, 818, 'C', 778, 756, 752, 712, 704, 688, 'C', 660, 666, 595, 654, 554, 642, 'L', 500, 750, 'Z']
const SHIRT = ['M', 444, 640, 'L', 556, 640, 'L', 500, 752, 'Z']
const FLAP_L = ['M', 446, 640, 'L', 500, 750, 'L', 474, 770, 'C', 452, 730, 424, 682, 408, 654, 'Z']
const BACK_C = ['M', 500, 184, 'C', 630, 186, 692, 270, 690, 380, 'C', 690, 470, 676, 560, 652, 630, 'L', 348, 630, 'C', 324, 560, 310, 470, 310, 380, 'C', 308, 270, 370, 186, 500, 184, 'Z']
const BACK_L = ['M', 312, 420, 'C', 298, 520, 298, 620, 316, 700, 'L', 330, 742, 'L', 346, 702, 'L', 362, 730, 'L', 374, 682, 'L', 394, 702, 'L', 402, 620, 'C', 398, 540, 382, 470, 362, 420, 'Z']
const SIDE_R = ['M', 612, 296, 'C', 636, 370, 641, 460, 635, 540, 'C', 629, 610, 640, 662, 655, 706, 'C', 670, 652, 681, 590, 679, 520, 'C', 679, 430, 672, 350, 660, 292, 'Z']
const SIDE2_R = ['M', 650, 318, 'C', 676, 400, 686, 500, 681, 580, 'C', 684, 610, 689, 632, 694, 652, 'C', 707, 600, 713, 520, 705, 440, 'C', 701, 390, 691, 350, 677, 316, 'Z']
const CAP = ['M', 330, 392, 'C', 302, 300, 360, 182, 500, 178, 'C', 640, 182, 698, 300, 670, 392, 'C', 656, 330, 630, 296, 590, 280, 'L', 410, 280, 'C', 370, 296, 344, 330, 330, 392, 'Z']
const AHOGE = ['M', 496, 196, 'C', 487, 158, 468, 130, 442, 124, 'C', 462, 116, 494, 138, 515, 192, 'Z']
const LEAF = ['M', 598, 314, 'C', 603, 293, 626, 283, 642, 287, 'C', 640, 305, 622, 319, 598, 314, 'Z']

// ---------------------------------------------------------------- eyes
// local eye space: +x toward the outer corner, +y down; [x, y] pairs. Upper lid I -> T -> O, lower lid O -> B -> I
const LID_OPEN = [[-38, 6], [-34, -24], [-14, -41], [8, -42], [26, -42], [41, -29], [45, -8]]
const LID_CALM = [[-38, 12], [-30, 24], [-10, 30], [8, 30], [24, 30], [38, 21], [45, 8]]
const LID_HAPPY = [[-38, 18], [-30, -2], [-10, -11], [6, -11], [24, -11], [38, -1], [45, 15]]
const LOWER = [[45, -8], [43, 18], [22, 38], [2, 38], [-18, 38], [-34, 26], [-38, 6]]

function eye(ctx, f, cx, cy, s, P, open, t) {
  const sm = P.smile, sur = P.surprise
  const o = clamp(open * (1 - smooth(0.15, 0.9, sm)) + sur * 0.16, 0, 1.25)
  const happy = smooth(0, 0.7, sm)
  const lid = LID_OPEN.map((p, i) => {
    const cl = [lerp(LID_CALM[i][0], LID_HAPPY[i][0], happy), lerp(LID_CALM[i][1], LID_HAPPY[i][1], happy)]
    return [lerp(cl[0], p[0], o), lerp(cl[1], p[1], o) - P.sad * 3 * o]
  })
  const lower = LOWER.map(([x, y], i) => [x, y - (i > 0 && i < 6 ? 9 * sm * (1 - Math.abs(x) / 60) : 0)])
  const map = (x, y) => [cx + s * x * 1.1, cy + y * 1.1]
  const pts = (arr) => arr.flat()
  const upperC = ['M', ...lid[0], 'C', ...pts(lid.slice(1, 4)), 'C', ...pts(lid.slice(4, 7))]
  const whiteC = [...upperC, 'C', ...pts(lower.slice(1, 4)), 'C', ...pts(lower.slice(4, 7)), 'Z']
  const U = local(upperC, map), W = local(whiteC, map)
  if (o > 0.06) {
    clipped(ctx, f, W, () => {
      fill(ctx, f, W, linear(ctx, f, cx, cy - 42, cx, cy + 10, [[0, C.whiteShade], [0.7, C.white]]))
      // the iris: world-space gaze (the same for both eyes), a little lower as the lid comes down
      const sc = 1 - 0.12 * sur
      const ix = cx + P.eyeBallX * 16, iy = cy - 1 - P.eyeBallY * 12 + (1 - Math.min(o, 1)) * 8
      const rx = 26.5 * sc, ry = 36 * sc
      fill(ctx, f, ell(ix, iy, rx, ry), linear(ctx, f, ix, iy - ry, ix, iy + ry, [[0, C.irisDark], [0.45, C.iris], [1, C.irisLight]]))
      fill(ctx, f, ell(ix, iy + ry * 0.48, rx * 0.68, ry * 0.36), C.irisGlow, 0.55)
      fill(ctx, f, ell(ix, iy + 1, 11 * (1 - 0.3 * sur), 17 * (1 - 0.3 * sur)), C.pupil)
      stroke(ctx, f, ell(ix, iy, rx, ry), C.irisDark, 1.6)
      stroke(ctx, f, U, 'rgba(70,30,50,0.22)', 18)  // the lid's shadow on the eyeball
      const tw = 1 + 0.07 * Math.sin(t * 2.3 + cx)
      fill(ctx, f, ell(ix - 10, iy - 13, 8 * tw, 10.5 * tw), '#ffffff')
      fill(ctx, f, ell(ix + 9, iy + 13, 3.6, 3.6), '#ffffff', 0.9)
    })
  }
  // lashes: the upper lid line, a wing at the outer corner, a light lower lid
  stroke(ctx, f, U, C.lash, lerp(4.6, 7, clamp(o, 0, 1)))
  const w = clamp(o, 0, 1)
  if (w > 0.25) {
    const wing = local(['M', 45, -8 * w + (1 - w) * 8, 'C', 50, -12, 54, -17, 58, -21, 'C', 52, -21, 44, -18, 37, -14 * w, 'Z'], map)
    fill(ctx, f, wing, C.lash, smooth(0.25, 0.6, w))
    const crease = local(['M', -22, -52 + (1 - w) * 40, 'Q', 10, -62 + (1 - w) * 40, 36, -44 + (1 - w) * 36], map)
    stroke(ctx, f, crease, C.lash, 1.6, 0.45 * smooth(0.4, 1, w))
  } else if (happy > 0.3) {
    stroke(ctx, f, local(['M', 45, 15, 'L', 54, 20], map), C.lash, 3, happy)
  }
  stroke(ctx, f, local(['M', ...lower[0], 'C', ...pts(lower.slice(1, 4))], map), C.lash, 2, 0.75 * smooth(0.1, 0.5, w))
}

function brow(ctx, f, cx, cy, s, P, alpha) {
  const lift = -P.brow * 11 - P.surprise * 8
  const c = ['M', -30, -60, 'C', -14, -72, 18, -77, 44, -66, 'C', 20, -71, -10, -67, -30, -55, 'Z']
  const B = local(c, (x, y) => {
    const k = clamp((x + 30) / 74, 0, 1)
    return [cx + s * x, cy + y + lift + lerp(-P.sad * 11, P.sad * 4, k)]
  })
  fill(ctx, f, B, C.hairDark, alpha)
}

function mouth(ctx, f, P) {
  const s = P.smile, o = P.mouthOpen, v = P.vowel, sad = P.sad
  const cx = 500, cy = 533
  const W = 14 * (1 + 0.5 * s + 0.3 * o + 0.35 * Math.max(v, 0) * o - 0.5 * Math.max(-v, 0) * o)
  const corner = cy - 5 * s + 4 * sad
  const H = o * 40 * (1 - 0.3 * Math.max(v, 0)) * (1 + 0.12 * Math.max(-v, 0))
  if (H < 2) {
    stroke(ctx, f, ['M', cx - W, corner, 'Q', cx, cy + 7 * s - 3 * sad + 1, cx + W, corner], C.mouth, 2.6)
    return
  }
  const top = cy - 1 - s
  const M = ['M', cx - W, corner, 'C', cx - W * 0.55, top - 3, cx + W * 0.55, top - 3, cx + W, corner,
    'C', cx + W * 0.95, corner + H * 0.85, cx + W * 0.45, cy + H, cx, cy + H, 'C', cx - W * 0.45, cy + H, cx - W * 0.95, corner + H * 0.85, cx - W, corner, 'Z']
  fill(ctx, f, M, C.mouth)
  clipped(ctx, f, M, () => {
    fill(ctx, f, ell(cx, cy + H * 1.02, W * 0.62, H * 0.42), C.tongue)
    if (H > 7 && v > -0.4) fill(ctx, f, ['M', cx - W, top - 4, 'L', cx + W, top - 4, 'L', cx + W, top + H * 0.16, 'L', cx - W, top + H * 0.16, 'Z'], C.teeth, 0.95)
  })
  stroke(ctx, f, M, C.mouth, 2)
}

// ---------------------------------------------------------------- the whole figure
export function draw(ctx, S, opt = {}) {
  const D = S.D, P = S.P, L = S.lockById
  const H = (d) => (x, y, o) => D.head(x, y, d, o)
  const B = (x, y, o) => D.body2(x, y, o)
  const N = (x, y, o) => D.neck(x, y, o)
  const K = (id) => (x, y, o) => L[id].map(D, x, y, o)
  const Ksh = (id, dy) => (x, y, o) => L[id].map(D, x, y + dy, o)
  const hairFill = (f) => linear(ctx, f, 500, 190, 500, 470, [[0, C.hairLight], [0.35, C.hair], [1, C.hairDark]])

  // back hair, in shadow
  fill(ctx, K('backC'), BACK_C, C.hairDark)
  fill(ctx, K('backL'), BACK_L, C.hairDark); stroke(ctx, K('backL'), BACK_L, C.hairLine, 1.8, 0.7)
  fill(ctx, K('backR'), mirror(BACK_L), C.hairDark); stroke(ctx, K('backR'), mirror(BACK_L), C.hairLine, 1.8, 0.7)
  // strands on the back hair, a soft light down its outer edge
  for (const [id, sx] of [['backL', -1], ['backR', 1]]) {
    const st = (c) => (sx > 0 ? mirror(c) : c)
    stroke(ctx, K(id), st(['M', 332, 450, 'C', 322, 540, 324, 620, 334, 712]), C.hairLine, 1.4, 0.45)
    stroke(ctx, K(id), st(['M', 362, 470, 'C', 360, 560, 362, 630, 366, 700]), C.hairLine, 1.4, 0.35)
    stroke(ctx, K(id), st(['M', 318, 430, 'C', 306, 520, 306, 610, 320, 690]), C.hairLight, 3, 0.35)
  }

  // hood, neck, coat
  fill(ctx, B, HOOD, C.coatDeep); stroke(ctx, B, HOOD, C.coatLine, 2)
  fill(ctx, N, NECK, linear(ctx, N, 460, 600, 540, 600, [[0, C.skinShade], [0.3, C.skin], [0.75, C.skin], [1, C.skinShade]]))
  clipped(ctx, N, NECK, () => fill(ctx, H(0), CHIN_SHADOW, C.skinShade))
  stroke(ctx, N, NECK, C.skinLine, 1.8, 0.8)
  fill(ctx, B, COAT, linear(ctx, B, 200, 800, 800, 800, [[0, C.coatDeep], [0.17, C.coatShade], [0.38, C.coat], [0.5, C.coatLight], [0.62, C.coat], [0.83, C.coatShade], [1, C.coatDeep]]))
  clipped(ctx, B, COAT, () => {
    stroke(ctx, B, ['M', 318, 682, 'C', 300, 748, 292, 820, 290, 1010], C.coatDeep, 2.2, 0.55)
    stroke(ctx, B, mirror(['M', 318, 682, 'C', 300, 748, 292, 820, 290, 1010]), C.coatDeep, 2.2, 0.55)
    stroke(ctx, B, ['M', 512, 748, 'L', 512, 1120], C.coatShade, 6, 0.6)
  })
  stroke(ctx, B, COAT, C.coatLine, 2.2)
  fill(ctx, B, SHIRT, linear(ctx, B, 500, 662, 500, 772, [[0, C.shirtShade], [0.45, C.shirt]]))
  fill(ctx, B, FLAP_L, C.coatLight); stroke(ctx, B, FLAP_L, C.coatLine, 2)
  fill(ctx, B, mirror(FLAP_L), C.coatLight); stroke(ctx, B, mirror(FLAP_L), C.coatLine, 2)
  stroke(ctx, B, ['M', 500, 752, 'L', 500, 1120], C.coatLine, 2.4)
  for (const y of [824, 908]) { fill(ctx, B, ell(526, y, 7, 7), C.coatShade); stroke(ctx, B, ell(526, y, 7, 7), C.coatLine, 1.6) }

  // drawstrings: three points along each cord, a quadratic through them
  for (const id of ['cordL', 'cordR']) {
    const l = L[id], f = K(id), a = f(...l.root, [0, 0]), m = f((l.root[0] + l.tip[0]) / 2, (l.root[1] + l.tip[1]) / 2, [0, 0]), b = f(...l.tip, [0, 0])
    const qx = 2 * m[0] - (a[0] + b[0]) / 2, qy = 2 * m[1] - (a[1] + b[1]) / 2
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(qx, qy, b[0], b[1])
    ctx.lineCap = 'round'; ctx.strokeStyle = C.cordLine; ctx.lineWidth = 8.5; ctx.stroke(); ctx.strokeStyle = C.cord; ctx.lineWidth = 5.5; ctx.stroke()
    const dx = b[0] - qx, dy = b[1] - qy, dl = Math.hypot(dx, dy) || 1
    ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] + (dx / dl) * 16, b[1] + (dy / dl) * 16)
    ctx.strokeStyle = C.aglet; ctx.lineWidth = 8; ctx.stroke()
    fill(ctx, B, ell(l.root[0], l.root[1] - 2, 6, 6), C.coatLine)
  }

  // outer side locks sit behind the face
  for (const [id, c] of [['side2L', mirror(SIDE2_R)], ['side2R', SIDE2_R]]) { fill(ctx, K(id), c, hairFill(K(id))); stroke(ctx, K(id), c, C.hairLine, 1.8, 0.8) }

  // face
  const F = H(0)
  fill(ctx, F, FACE, C.skin)
  clipped(ctx, F, FACE, () => {
    fill(ctx, F, FACE, radial(ctx, F, 500, 425, 120, 205, [[0, 'rgba(245,195,179,0)'], [1, 'rgba(240,180,165,0.75)']]))
    // the bangs cast a shadow on the forehead
    for (const [id, xl, xr, tx, ty, curl] of BANGS) fill(ctx, Ksh(id, 16), bang(xl, xr, tx, ty, curl).concat(['Z']), C.skinShade, 0.9)
    fill(ctx, Ksh('sideL', 6), mirror(SIDE_R), C.skinShade, 0.8); fill(ctx, Ksh('sideR', 6), SIDE_R, C.skinShade, 0.8)
  })
  stroke(ctx, F, FACE, C.skinLine, 2)

  // cheeks, nose, mouth, eyes, brows
  const Cf = H(0.03)
  for (const x of [416, 584]) {
    fill(ctx, Cf, ell(x, 496, 30, 14), radial(ctx, Cf, x, 496, 2, 30, [[0, C.blush], [1, 'rgba(255,135,150,0)']]), 0.35 + 0.5 * P.blush)
    if (P.blush > 0.25) for (let i = -1; i <= 1; i++) stroke(ctx, Cf, ['M', x + i * 10 + 4, 488, 'L', x + i * 10 - 3, 502], C.blush, 2, smooth(0.25, 0.7, P.blush))
  }
  stroke(ctx, H(0.18), ['M', 503, 492, 'Q', 507, 499, 500, 503], C.skinLine, 2.4, 0.8)
  mouth(ctx, H(0.06), P)
  const Ef = H(0.04)
  eye(ctx, Ef, 436, 444, -1, P, P.eyeLOpen, S.t)
  eye(ctx, Ef, 564, 444, 1, P, P.eyeROpen, S.t)
  brow(ctx, H(0.07), 436, 444, -1, P, 0.95); brow(ctx, H(0.07), 564, 444, 1, P, 0.95)

  // side locks framing the face
  for (const [id, c] of [['sideL', mirror(SIDE_R)], ['sideR', SIDE_R]]) {
    fill(ctx, K(id), c, hairFill(K(id))); stroke(ctx, K(id), c, C.hairLine, 1.8)
    const sx = id === 'sideR' ? 1 : -1
    stroke(ctx, K(id), ['M', 500 + sx * 145, 330, 'C', 500 + sx * 152, 430, 500 + sx * 146, 560, 500 + sx * 152, 660], C.hairDark, 1.6, 0.6)
  }

  // the crown and bangs
  const capF = H(0.26)
  fill(ctx, capF, CAP, hairFill(capF))
  for (const [id, xl, xr, tx, ty, curl] of BANGS) {
    const f = K(id), c = bang(xl, xr, tx, ty, curl)
    fill(ctx, f, [...c, 'Z'], hairFill(f))
    stroke(ctx, f, c, C.hairLine, 1.9)
    const mx = (xl + xr) / 2
    stroke(ctx, f, ['M', mx, 262, 'Q', (mx + tx) / 2 + curl, (262 + ty) / 2, tx + (mx - tx) * 0.15, ty - 14], C.hairDark, 1.5, 0.55)
  }
  // the angel ring: a jagged light band across the crown, clipped to the hair
  ctx.save(); ctx.beginPath(); addPath(ctx, capF, CAP); for (const [id, xl, xr, tx, ty, curl] of BANGS) addPath(ctx, K(id), [...bang(xl, xr, tx, ty, curl), 'Z']); ctx.clip()
  const ring = ['M', 372, 262]
  for (let x = 372, i = 0; x <= 628; x += 12, i++) { const k = (x - 500) / 160; ring.push('L', x, 262 + k * k * 46 + (i % 2 ? 22 : 6) * (1 - 0.5 * k * k)) }
  for (let x = 628; x >= 372; x -= 16) { const k = (x - 500) / 160; ring.push('L', x, 254 + k * k * 46) }
  ring.push('Z')
  fill(ctx, capF, ring, C.hairHi, 0.55)
  ctx.restore()
  stroke(ctx, capF, ['M', 330, 392, 'C', 302, 300, 360, 182, 500, 178, 'C', 640, 182, 698, 300, 670, 392], C.hairLine, 2)
  // brows show faintly through the bangs
  brow(ctx, H(0.07), 436, 444, -1, P, 0.3); brow(ctx, H(0.07), 564, 444, 1, P, 0.3)

  fill(ctx, K('ahoge'), AHOGE, hairFill(K('ahoge'))); stroke(ctx, K('ahoge'), AHOGE, C.hairLine, 1.8)
  fill(ctx, K('b6'), LEAF, C.leaf); stroke(ctx, K('b6'), LEAF, C.leafDark, 1.8)
  stroke(ctx, K('b6'), ['M', 604, 311, 'Q', 620, 300, 636, 291], C.leafDark, 1.4)
  fill(ctx, K('b6'), ell(596, 318, 6, 6), C.coat); stroke(ctx, K('b6'), ell(596, 318, 6, 6), C.coatLine, 1.4)

  if (opt.lattice) lattice(ctx, D)
}

/** the head's bulge as a bent grid: shows how a turn is drawn */
function lattice(ctx, D) {
  const h = D.A.head, o = [0, 0]
  ctx.save(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,170,200,0.75)'
  for (let i = -6; i <= 6; i++) {
    for (const vert of [true, false]) {
      ctx.beginPath()
      for (let j = -12; j <= 12; j++) {
        const a = i / 6, b = j / 12
        const u = vert ? a : b, v = vert ? b : a
        if (u * u + v * v > 1.02) continue
        D.head(h.cx + u * h.rx * 1.05, h.cy + v * h.ry * 1.05, 0, o)
        ctx.lineTo(o[0], o[1])
      }
      ctx.stroke()
    }
  }
  ctx.restore()
}

export const haru = { name: '하루', anchors, rig, locks, draw, palette }

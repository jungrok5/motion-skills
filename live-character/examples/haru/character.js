// examples/haru/character.js — 「하루」, a girl in a mustard raincoat, waist up: the worked example for people.
// Chestnut bob with long side locks and an ahoge, teal eyes, a leaf hair clip, swinging drawstrings, arms with hands.
// Model space: x 0..1000, y down. Every path goes through the rig (lib/draw.js), each part at its own depth.
import { addPath, fill, stroke, clipped, ell, mirror, linear, radial } from '../../lib/draw.js'
import { HUMAN_MOVES, ACTIONS, env, smooth } from '../../lib/rig.js'
import { animeEye, brow, mouth, blush, tube, hand } from '../../lib/parts.js'

const C = {
  skin: '#ffe9df', skinShade: '#f5c3b3', skinLine: '#c98273', blush: '#ff8796',
  hairHi: '#e2a37c', hairLight: '#a8613f', hair: '#7f432c', hairDark: '#56291b', hairLine: '#3a1912',
  irisDark: '#173f45', iris: '#2c7d7a', irisLight: '#76d1b8', irisGlow: '#c8f5df', pupil: '#0d2629', lash: '#2a1718', white: '#fffdfb', whiteShade: '#e6dcea',
  mouth: '#86303f', tongue: '#ec8790',
  coat: '#f1b23c', coatLight: '#ffd477', coatShade: '#d18c1f', coatDeep: '#b06f12', coatLine: '#8a5310',
  shirt: '#f7f3ec', shirtShade: '#ddd5c8', cord: '#fbf9f4', cordLine: '#b9ab98', aglet: '#5d4a3c', leaf: '#6cc495', leafDark: '#3c9466',
}

// ---------------------------------------------------------------- shapes (model px)
const BANGS = [  // [id, root left x, root right x, tip x, tip y, curl]; outer first, the parting last
  ['b1', 342, 398, 346, 452, -9], ['b7', 602, 658, 654, 452, 9], ['b2', 360, 442, 398, 410, -5], ['b6', 558, 640, 602, 406, 6],
  ['b2s', 396, 434, 420, 378, -2], ['b5s', 568, 606, 584, 380, 2], ['b3', 424, 496, 454, 424, 4], ['b5', 510, 584, 546, 416, 5],
  ['b4', 478, 530, 494, 372, 0],
]
const bang = (xl, xr, tx, ty, curl) => {
  const y = 248
  return ['M', xl, y, 'C', xl + (tx - xl) * 0.1, y + (ty - y) * 0.5, tx - (tx - xl) * 0.35 + curl, ty - (ty - y) * 0.18, tx, ty,
    'C', tx + (xr - tx) * 0.25 + curl * 0.5, ty - (ty - y) * 0.4, xr, y + (ty - y) * 0.45, xr, y]
}
const FACE = ['M', 500, 255, 'C', 570, 255, 628, 290, 634, 350, 'C', 640, 410, 632, 462, 612, 502, 'C', 590, 542, 545, 572, 500, 582,
  'C', 455, 572, 410, 542, 388, 502, 'C', 368, 462, 360, 410, 366, 350, 'C', 372, 290, 430, 255, 500, 255, 'Z']
const NECK = ['M', 463, 540, 'L', 461, 622, 'C', 459, 642, 446, 654, 426, 664, 'L', 574, 664, 'C', 554, 654, 541, 642, 539, 622, 'L', 537, 540, 'Z']
const CHIN_SHADOW = ['M', 440, 548, 'C', 455, 614, 545, 614, 560, 548, 'Z']
const HOOD = ['M', 400, 650, 'C', 396, 618, 440, 598, 500, 598, 'C', 560, 598, 604, 618, 600, 650, 'L', 598, 686, 'L', 402, 686, 'Z']
// the torso to the waist (the arms are their own tubes over its sides)
const COAT = ['M', 446, 642, 'C', 405, 652, 352, 662, 322, 676, 'C', 292, 690, 282, 720, 290, 760, 'C', 298, 860, 312, 1000, 316, 1330,
  'L', 684, 1330, 'C', 688, 1000, 702, 860, 710, 760, 'C', 718, 720, 708, 690, 678, 676, 'C', 648, 662, 595, 652, 554, 642, 'L', 500, 750, 'Z']
const SHIRT = ['M', 444, 640, 'L', 556, 640, 'L', 500, 752, 'Z']
const FLAP_L = ['M', 446, 640, 'L', 500, 750, 'L', 474, 770, 'C', 452, 730, 424, 682, 408, 654, 'Z']
const POCKET = ['M', 350, 1060, 'L', 440, 1052, 'L', 446, 1150, 'L', 356, 1158, 'Z']
const BACK_C = ['M', 500, 184, 'C', 630, 186, 692, 270, 690, 380, 'C', 690, 470, 676, 560, 652, 630, 'L', 348, 630, 'C', 324, 560, 310, 470, 310, 380, 'C', 308, 270, 370, 186, 500, 184, 'Z']
const BACK_L = ['M', 312, 420, 'C', 298, 520, 298, 620, 316, 700, 'L', 330, 742, 'L', 346, 702, 'L', 362, 730, 'L', 374, 682, 'L', 394, 702, 'L', 402, 620, 'C', 398, 540, 382, 470, 362, 420, 'Z']
const SIDE_R = ['M', 612, 296, 'C', 636, 370, 641, 460, 635, 540, 'C', 629, 610, 640, 662, 655, 706, 'C', 670, 652, 681, 590, 679, 520, 'C', 679, 430, 672, 350, 660, 292, 'Z']
const SIDE2_R = ['M', 650, 318, 'C', 676, 400, 686, 500, 681, 580, 'C', 684, 610, 689, 632, 694, 652, 'C', 707, 600, 713, 520, 705, 440, 'C', 701, 390, 691, 350, 677, 316, 'Z']
const CAP = ['M', 330, 392, 'C', 302, 300, 360, 182, 500, 178, 'C', 640, 182, 698, 300, 670, 392, 'C', 656, 330, 630, 296, 590, 280, 'L', 410, 280, 'C', 370, 296, 344, 330, 330, 392, 'Z']
const AHOGE = ['M', 496, 196, 'C', 487, 158, 468, 130, 442, 124, 'C', 462, 116, 494, 138, 515, 192, 'Z']
const LEAF = ['M', 598, 314, 'C', 603, 293, 626, 283, 642, 287, 'C', 640, 305, 622, 319, 598, 314, 'Z']

const line3 = (a, b) => [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b]

// ---------------------------------------------------------------- moves and actions
const tuckW = [[0, 0], [0.5, 1], [1.7, 1], [2.3, 0]]
const moves = {
  ...HUMAN_MOVES,
  think: { ...HUMAN_MOVES.think, limbs: { armR: { pose: 'think', w: [[0, 0], [0.7, 1], [3.4, 1], [4.2, 0]] } } },
  // tucks the side lock behind the ear, glancing down
  tuck: { dur: 2.6, limbs: { armR: { pose: 'tuck', w: tuckW } }, tracks: {
    angleZ: [[0, 0], [0.5, -6], [1.7, -5], [2.4, 0]], angleX: [[0, 0], [0.5, 4], [1.7, 3], [2.4, 0]],
    eyeBallY: [[0, 0], [0.3, -0.4], [1.7, -0.3], [2.1, 0]], eye: [[0, 1], [0.4, 0.85], [1.8, 0.85], [2.2, 1]] } },
  // hands clasp in front, a look down, a small rock
  fidget: { dur: 3.6, limbs: { armL: { pose: 'clasp', w: [[0, 0], [0.6, 1], [3.0, 1], [3.6, 0]] }, armR: { pose: 'clasp', w: [[0, 0], [0.6, 1], [3.0, 1], [3.6, 0]] } },
    tracks: { bodyZ: [[0, 0], [1.0, 2], [2.0, -2], [3.0, 1], [3.6, 0]], eyeBallY: [[0, 0], [0.4, -0.5], [2.8, -0.4], [3.2, 0]], angleY: [[0, 0], [0.6, -4], [2.8, -3], [3.4, 0]] } },
}
const both = (pose, w) => ({ armL: { pose, w }, armR: { pose, w } })
const actions = {
  wave: { label: '손 흔들기', dur: 2.6, curve: (t, e) => ({ smile: 0.6 * e, angleZ: 4 * e, angleX: 3 * e, brow: 0.3 * e,
    limbs: { armR: { pose: 'wave', w: e, el: 18 * Math.sin(t * 2 * Math.PI * 2.3) * smooth(0.3, 0.6, t) * e, wr: 14 * Math.sin(t * 2 * Math.PI * 2.3 - 0.8) * e } } }) },
  nod: ACTIONS.nod, shake: ACTIONS.shake, tilt: ACTIONS.tilt,
  hop: { ...ACTIONS.hop, curve: (t, e, s) => ({ ...ACTIONS.hop.curve(t, e, s), limbs: { armL: { sh: 16 * env(t, 0.15, 0.2, 0.3) }, armR: { sh: 16 * env(t, 0.15, 0.2, 0.3) } } }) },
  cheer: { label: '만세', dur: 1.9, curve: (t, e) => ({ smile: e, angleY: 6 * e, brow: 0.4 * e, hop: 0.02 * env(t, 0.15, 0.1, 0.3), limbs: both('cheer', e) }) },
  think: { label: '생각', dur: 3.0, curve: (t, e) => ({ angleX: -8 * e, angleY: 5 * e, angleZ: 6 * e, eyeBallX: -0.55 * e, eyeBallY: 0.55 * e, brow: 0.3 * e, limbs: { armR: { pose: 'think', w: e } } }) },
  wow: ACTIONS.wow,
  shy: { ...ACTIONS.shy, curve: (t, e, s) => ({ ...ACTIONS.shy.curve(t, e, s), limbs: both('clasp', e) }) },
  pat: ACTIONS.pat,
}

// ---------------------------------------------------------------- the character
export default {
  id: 'haru', name: '하루', blurb: '노란 우비를 입은 아이. 차분하지만 반응이 빠름.',
  anchors: { head: { cx: 500, cy: 400, rx: 150, ry: 172 }, extent: [1.12, 1.15, 1.32], headScale: 1.08,
    neckY: 600, chinY: 582, neckBaseY: 650, bottomY: 1330, faceW: 268 },
  rig: { yaw: 0.36, pitch: 0.27, roll: 0.5, bulge: 0.62, drift: [0.12, 0.08], breath: 1, body: { yaw: 0.35, roll: 0.18 }, limits: { yaw: 12, roll: 5 } },
  temper: { wander: 1, bounce: 1, blink: 1, breath: 1, moves: [10, 18] },
  view: { x: 30, y: 36, w: 940, h: 1175 }, face: { x: 500, y: 430, rx: 140, ry: 165 },
  chains: [
    ...BANGS.map(([id, xl, xr, tx, ty]) => ({ id, preset: 'bangs', depth: 0.26, points: line3([(xl + xr) / 2, 250], [tx, ty]) })),
    { id: 'sideL', preset: 'side', depth: 0.12, bodyBlend: 0.3, points: line3([360, 300], [345, 705]) },
    { id: 'sideR', preset: 'side', depth: 0.12, bodyBlend: 0.3, points: line3([640, 300], [655, 705]) },
    { id: 'side2L', preset: 'side', depth: 0.04, bodyBlend: 0.4, points: line3([328, 330], [306, 650]), swing: 1.15 },
    { id: 'side2R', preset: 'side', depth: 0.04, bodyBlend: 0.4, points: line3([672, 330], [694, 650]), swing: 1.15 },
    { id: 'backC', preset: 'back', depth: -0.35, bodyBlend: 0.45, points: line3([500, 430], [500, 700]), swing: 0.6 },
    { id: 'backL', preset: 'back', depth: -0.35, bodyBlend: 0.5, points: line3([340, 440], [330, 740]) },
    { id: 'backR', preset: 'back', depth: -0.35, bodyBlend: 0.5, points: line3([660, 440], [670, 740]) },
    { id: 'ahoge', preset: 'ahoge', depth: 0.12, points: [[506, 192], [490, 150], [446, 124]] },
    { id: 'cordL', preset: 'cord', attach: 'body', points: line3([463, 672], [455, 850]) },
    { id: 'cordR', preset: 'cord', attach: 'body', points: line3([537, 672], [547, 850]), swing: 1.1 },
  ],
  // arms: sh from straight down (+ outward), el relative (+ further out / up, - in toward the body), pu / pl toward
  // the viewer. Limits are the body check: no pose may ask past them
  limbs: ['L', 'R'].map((k) => ({ id: 'arm' + k, side: k === 'L' ? -1 : 1, root: [k === 'L' ? 322 : 678, 722], len: [200, 180],
    rest: { sh: 9, el: -8, wr: 0, hand: 'relaxed' }, lim: { sh: [-30, 170], el: [-150, 165], wr: [-70, 70], pu: [0, 80], pl: [0, 80] } })),
  poses: {
    wave: { armR: { sh: 128, el: 62, wr: -10, hand: 'open' } },
    cheer: { armL: { sh: 150, el: 24, hand: 'open' }, armR: { sh: 150, el: 24, hand: 'open' } },
    think: { armR: { sh: -20, el: -131, wr: -25, pu: 70, hand: 'fist', front: 1 } },
    clasp: { armL: { sh: -8, el: -62, wr: -10, pu: 22, hand: 'relaxed' }, armR: { sh: -8, el: -62, wr: -10, pu: 22, hand: 'relaxed' } },
    hips: { armL: { sh: 32, el: -100, hand: 'fist' }, armR: { sh: 32, el: -100, hand: 'fist' } },
    tuck: { armR: { sh: 140, el: 92, wr: 20, hand: 'relaxed', front: 1 } },
  },
  moves, actions,
  expressions: {
    none: { label: '기본' },
    smile: { label: '웃음', set: { smile: 1, blush: 0.25 } },
    surprise: { label: '놀람', set: { surprise: 1 } },
    sad: { label: '시무룩', set: { sad: 1 } },
    shy: { label: '부끄', set: { blush: 1, smile: 0.35 }, limbs: { armL: 'clasp', armR: 'clasp' } },
  },
  talk: '안녕! 나는 하루야. 오늘 비 온대, 우산 챙겼어?',
  demo: { dur: 19, pointer: [[1.2, 900, 330], [2.2, 800, 280], [3.4, 800, 280], [4.2, 190, 520], [5.0, null]],
    events: [[5.6, 'act', 'wave'], [5.7, 'say', '안녕! 나는 하루야. 오늘 비 온대, 우산 챙겼어?'], [10.3, 'express', 'smile'], [10.3, 'act', 'nod'],
      [11.7, 'express', 'none'], [11.8, 'act', 'think'], [15.0, 'act', 'cheer'], [16.6, 'act', 'shy']] },
  draw,
}

// ---------------------------------------------------------------- drawing
function arm(ctx, S, id) {
  const l = S.limbById[id], j = l.solve(S.D), s = l.side
  const wr = [j.W[0] - 0 * s, j.W[1]]
  const sleeve = tube(ctx, [j.S, j.E, wr], [72, 60 * (0.85 + 0.15 * j.fu), 54], C.coat, C.coatLine, 2.2, { openStart: true })
  ctx.save(); ctx.clip(sleeve)
  const cuffA = [j.E[0] + (j.W[0] - j.E[0]) * 0.8, j.E[1] + (j.W[1] - j.E[1]) * 0.8]
  ctx.lineCap = 'butt'; ctx.strokeStyle = C.coatDeep; ctx.lineWidth = 80; ctx.beginPath(); ctx.moveTo(cuffA[0], cuffA[1]); ctx.lineTo(j.W[0] + (j.W[0] - j.E[0]) * 0.3, j.W[1] + (j.W[1] - j.E[1]) * 0.3); ctx.globalAlpha = 0.45; ctx.stroke(); ctx.globalAlpha = 1
  ctx.restore()
  hand(ctx, j.W, j.ah, 84, l.hand, s, C)
}

function draw(ctx, S, opt = {}) {
  const D = S.D, P = S.P, K0 = S.chainById
  const H = (d) => (x, y, o) => D.head(x, y, d, o)
  const B = (x, y, o) => D.body2(x, y, o)
  const N = (x, y, o) => D.neck(x, y, o)
  const K = (id) => (x, y, o) => K0[id].map(D, x, y, o)
  const Ksh = (id, dy) => (x, y, o) => K0[id].map(D, x, y + dy, o)
  const hairFill = (f) => linear(ctx, f, 500, 190, 500, 470, [[0, C.hairLight], [0.35, C.hair], [1, C.hairDark]])

  fill(ctx, K('backC'), BACK_C, C.hairDark)
  for (const [id, c] of [['backL', BACK_L], ['backR', mirror(BACK_L)]]) { fill(ctx, K(id), c, C.hairDark); stroke(ctx, K(id), c, C.hairLine, 1.8, 0.7) }
  for (const [id, sx] of [['backL', -1], ['backR', 1]]) {
    const st = (c) => (sx > 0 ? mirror(c) : c)
    stroke(ctx, K(id), st(['M', 332, 450, 'C', 322, 540, 324, 620, 334, 712]), C.hairLine, 1.4, 0.45)
    stroke(ctx, K(id), st(['M', 318, 430, 'C', 306, 520, 306, 610, 320, 690]), C.hairLight, 3, 0.35)
  }

  fill(ctx, B, HOOD, C.coatDeep); stroke(ctx, B, HOOD, C.coatLine, 2)
  fill(ctx, N, NECK, linear(ctx, N, 460, 600, 540, 600, [[0, C.skinShade], [0.3, C.skin], [0.75, C.skin], [1, C.skinShade]]))
  clipped(ctx, N, NECK, () => fill(ctx, H(0), CHIN_SHADOW, C.skinShade))
  stroke(ctx, N, NECK, C.skinLine, 1.8, 0.8)
  fill(ctx, B, COAT, linear(ctx, B, 290, 900, 710, 900, [[0, C.coatShade], [0.3, C.coat], [0.5, C.coatLight], [0.7, C.coat], [1, C.coatShade]]))
  clipped(ctx, B, COAT, () => {
    stroke(ctx, B, ['M', 512, 748, 'L', 512, 1330], C.coatShade, 6, 0.6)
    fill(ctx, B, POCKET, C.coatShade, 0.5); fill(ctx, B, mirror(POCKET), C.coatShade, 0.5)
    stroke(ctx, B, ['M', 352, 1080, 'L', 442, 1072], C.coatLine, 2, 0.6); stroke(ctx, B, mirror(['M', 352, 1080, 'L', 442, 1072]), C.coatLine, 2, 0.6)
  })
  stroke(ctx, B, COAT, C.coatLine, 2.2)
  fill(ctx, B, SHIRT, linear(ctx, B, 500, 662, 500, 772, [[0, C.shirtShade], [0.45, C.shirt]]))
  fill(ctx, B, FLAP_L, C.coatLight); stroke(ctx, B, FLAP_L, C.coatLine, 2)
  fill(ctx, B, mirror(FLAP_L), C.coatLight); stroke(ctx, B, mirror(FLAP_L), C.coatLine, 2)
  stroke(ctx, B, ['M', 500, 752, 'L', 500, 1330], C.coatLine, 2.4)
  for (const y of [824, 908, 992]) { fill(ctx, B, ell(526, y, 7, 7), C.coatShade); stroke(ctx, B, ell(526, y, 7, 7), C.coatLine, 1.6) }

  for (const id of ['cordL', 'cordR']) {
    const c = K0[id], a = c.at(D, 0, [0, 0]), m = c.at(D, 0.5, [0, 0]), b = c.at(D, 1, [0, 0])
    const qx = 2 * m[0] - (a[0] + b[0]) / 2, qy = 2 * m[1] - (a[1] + b[1]) / 2
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(qx, qy, b[0], b[1])
    ctx.lineCap = 'round'; ctx.strokeStyle = C.cordLine; ctx.lineWidth = 8.5; ctx.stroke(); ctx.strokeStyle = C.cord; ctx.lineWidth = 5.5; ctx.stroke()
    const dx = b[0] - qx, dy = b[1] - qy, dl = Math.hypot(dx, dy) || 1
    ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] + (dx / dl) * 16, b[1] + (dy / dl) * 16); ctx.strokeStyle = C.aglet; ctx.lineWidth = 8; ctx.stroke()
    fill(ctx, B, ell(c.points[0][0], c.points[0][1] - 2, 6, 6), C.coatLine)
  }
  // arms at the sides go over the coat; a raised arm goes over the hair too (drawn last)
  const raised = ['armL', 'armR'].filter((id) => S.limbById[id].front > 0.5)
  for (const id of ['armL', 'armR']) if (!raised.includes(id)) arm(ctx, S, id)

  for (const [id, c] of [['side2L', mirror(SIDE2_R)], ['side2R', SIDE2_R]]) { fill(ctx, K(id), c, hairFill(K(id))); stroke(ctx, K(id), c, C.hairLine, 1.8, 0.8) }

  const F = H(0)
  fill(ctx, F, FACE, C.skin)
  clipped(ctx, F, FACE, () => {
    fill(ctx, F, FACE, radial(ctx, F, 500, 425, 120, 205, [[0, 'rgba(245,195,179,0)'], [1, 'rgba(240,180,165,0.75)']]))
    for (const [id, xl, xr, tx, ty, curl] of BANGS) fill(ctx, Ksh(id, 16), [...bang(xl, xr, tx, ty, curl), 'Z'], C.skinShade, 0.9)
    fill(ctx, Ksh('sideL', 6), mirror(SIDE_R), C.skinShade, 0.8); fill(ctx, Ksh('sideR', 6), SIDE_R, C.skinShade, 0.8)
  })
  stroke(ctx, F, FACE, C.skinLine, 2)
  const Cf = H(0.03)
  blush(ctx, Cf, 416, 496, P, C.blush); blush(ctx, Cf, 584, 496, P, C.blush)
  stroke(ctx, H(0.18), ['M', 503, 492, 'Q', 507, 499, 500, 503], C.skinLine, 2.4, 0.8)
  mouth(ctx, H(0.06), P, 500, 533, C)
  const Ef = H(0.04)
  animeEye(ctx, Ef, 436, 444, -1, P, P.eyeLOpen, S.t, C)
  animeEye(ctx, Ef, 564, 444, 1, P, P.eyeROpen, S.t, C)
  brow(ctx, H(0.07), 436, 444, -1, P, C.hairDark, 0.95); brow(ctx, H(0.07), 564, 444, 1, P, C.hairDark, 0.95)

  for (const [id, c] of [['sideL', mirror(SIDE_R)], ['sideR', SIDE_R]]) {
    fill(ctx, K(id), c, hairFill(K(id))); stroke(ctx, K(id), c, C.hairLine, 1.8)
    const sx = id === 'sideR' ? 1 : -1
    stroke(ctx, K(id), ['M', 500 + sx * 145, 330, 'C', 500 + sx * 152, 430, 500 + sx * 146, 560, 500 + sx * 152, 660], C.hairDark, 1.6, 0.6)
  }
  const capF = H(0.26)
  fill(ctx, capF, CAP, hairFill(capF))
  for (const [id, xl, xr, tx, ty, curl] of BANGS) {
    const f = K(id), c = bang(xl, xr, tx, ty, curl)
    fill(ctx, f, [...c, 'Z'], hairFill(f)); stroke(ctx, f, c, C.hairLine, 1.9)
    const mx = (xl + xr) / 2
    stroke(ctx, f, ['M', mx, 262, 'Q', (mx + tx) / 2 + curl, (262 + ty) / 2, tx + (mx - tx) * 0.15, ty - 14], C.hairDark, 1.5, 0.55)
  }
  ctx.save(); ctx.beginPath(); addPath(ctx, capF, CAP); for (const [id, xl, xr, tx, ty, curl] of BANGS) addPath(ctx, K(id), [...bang(xl, xr, tx, ty, curl), 'Z']); ctx.clip()
  const ring = ['M', 372, 262]
  for (let x = 372, i = 0; x <= 628; x += 12, i++) { const k = (x - 500) / 160; ring.push('L', x, 262 + k * k * 46 + (i % 2 ? 22 : 6) * (1 - 0.5 * k * k)) }
  for (let x = 628; x >= 372; x -= 16) { const k = (x - 500) / 160; ring.push('L', x, 254 + k * k * 46) }
  ring.push('Z')
  fill(ctx, capF, ring, C.hairHi, 0.55)
  ctx.restore()
  stroke(ctx, capF, ['M', 330, 392, 'C', 302, 300, 360, 182, 500, 178, 'C', 640, 182, 698, 300, 670, 392], C.hairLine, 2)
  brow(ctx, H(0.07), 436, 444, -1, P, C.hairDark, 0.3); brow(ctx, H(0.07), 564, 444, 1, P, C.hairDark, 0.3)
  fill(ctx, K('ahoge'), AHOGE, hairFill(K('ahoge'))); stroke(ctx, K('ahoge'), AHOGE, C.hairLine, 1.8)
  fill(ctx, K('b6'), LEAF, C.leaf); stroke(ctx, K('b6'), LEAF, C.leafDark, 1.8)
  stroke(ctx, K('b6'), ['M', 604, 311, 'Q', 620, 300, 636, 291], C.leafDark, 1.4)
  fill(ctx, K('b6'), ell(596, 318, 6, 6), C.coat); stroke(ctx, K('b6'), ell(596, 318, 6, 6), C.coatLine, 1.4)

  for (const id of raised) arm(ctx, S, id)
}

// examples/bori/character.js — 「보리」, a Jindo puppy (황구), sitting, full body: the worked example for animals,
// made from BRIEF.md. Ears and a curled tail are chains, the front legs are planted limbs, the muzzle leads every turn.
import { fill, stroke, clipped, ell, mirror, linear, radial } from '../../lib/draw.js'
import { ANIMAL_MOVES, ACTIONS, env, smooth } from '../../lib/rig.js'
import { roundEye, nose, muzzleMouth, tube, paw, groundShadow } from '../../lib/parts.js'

const C = {
  fur: '#e2a35a', furLight: '#f3c58a', furDark: '#c07f3a', furLine: '#7a4a22', cream: '#fbe8c8', creamShade: '#efd2a6',
  nose: '#2a201c', noseLight: '#4f3d35', mouth: '#5a2a2a', line: '#4a2c18', tongue: '#f08a96', tongueLine: '#b8505e',
  eye: '#2b1d16', eyeGlow: 'rgba(150,95,60,0.7)', shine: '#ffffff', innerEar: '#f4b7aa',
  collar: '#d8433b', collarDark: '#a52d27', tag: '#e8c15a', tagLine: '#9a7a2a', shadow: '#5a4030',
}
const pawPal = { fur: C.cream, furLine: C.furLine, pad: C.innerEar }

// ---------------------------------------------------------------- shapes (model px; the ground is y 950)
const HEAD = ['M', 500, 205, 'C', 588, 205, 655, 248, 668, 318, 'C', 674, 350, 684, 372, 702, 392, 'L', 678, 402, 'L', 694, 430, 'L', 664, 436,
  'C', 646, 486, 586, 522, 500, 528, 'C', 414, 522, 354, 486, 336, 436, 'L', 306, 430, 'L', 322, 402, 'L', 298, 392,
  'C', 316, 372, 326, 350, 332, 318, 'C', 345, 248, 412, 205, 500, 205, 'Z']
const MASK = ['M', 500, 372, 'C', 545, 372, 572, 392, 598, 414, 'C', 636, 422, 662, 430, 668, 436, 'C', 644, 488, 586, 522, 500, 528,
  'C', 414, 522, 356, 488, 332, 436, 'C', 338, 430, 364, 422, 402, 414, 'C', 428, 392, 455, 372, 500, 372, 'Z']
const EAR_L = ['M', 338, 282, 'C', 336, 220, 340, 160, 352, 108, 'C', 384, 140, 420, 186, 446, 232, 'Z']
const EAR_L_IN = ['M', 362, 262, 'C', 360, 216, 362, 176, 368, 142, 'C', 388, 166, 410, 198, 426, 232, 'Z']
const TORSO = ['M', 410, 470, 'C', 380, 560, 362, 640, 354, 716, 'C', 302, 756, 270, 836, 280, 896, 'C', 288, 938, 330, 952, 380, 950,
  'L', 620, 950, 'C', 670, 952, 712, 938, 720, 896, 'C', 730, 836, 698, 756, 646, 716, 'C', 638, 640, 620, 560, 590, 470, 'Z']
const HAUNCH_L = ell(326, 862, 70, 84)
const BIB = ['M', 432, 500, 'L', 446, 520, 'L', 462, 506, 'L', 480, 524, 'L', 500, 508, 'L', 520, 524, 'L', 538, 506, 'L', 554, 520, 'L', 568, 500,
  'C', 596, 600, 586, 712, 546, 792, 'C', 526, 826, 474, 826, 454, 792, 'C', 414, 712, 404, 600, 432, 500, 'Z']
const COLLAR = ['M', 404, 490, 'C', 450, 516, 550, 516, 596, 490, 'L', 600, 516, 'C', 552, 544, 448, 544, 400, 516, 'Z']

// ---------------------------------------------------------------- moves and actions
const both = (v) => ({ earL: v, earR: v })
const actions = {
  tilt: { label: '갸웃', dur: 2.2, peak: 0.5, curve: (t, e) => ({ angleZ: 16 * e, angleX: 4 * e, brow: 0.45 * e, earL: 0.7 * e, earR: -0.25 * e, wag: 0.3 * e }) },
  wag: { label: '꼬리', dur: 2.6, curve: (t, e) => ({ wag: e, smile: 0.7 * e, pant: 0.5 * e, angleZ: 4 * Math.sin(t * 7) * e, hop: 0.006 * Math.max(0, Math.sin(t * 14)) * e, ...both(-0.2 * e) }) },
  paw: { label: '손!', dur: 2.6, peak: 0.5, curve: (t, e) => ({ angleY: 5 * e, angleZ: -5 * e, angleX: 4 * e, smile: 0.35 * e, wag: 0.6 * e, bodyZ: -3 * e, ...both(0.4 * e),
    limbs: { legR: { pose: 'give', w: e, sh: 3 * Math.sin(t * 5) * e } } }) },
  bark: { label: '멍!', dur: 1.3, curve: (t, e) => {
    const b = env(t, 0.05, 0.12, 0.15) + env(t - 0.55, 0.05, 0.12, 0.15)
    return { mouthOpen: 0.8 * b, vowel: -0.2 * b, angleY: 7 * b, brow: 0.6 * e, hop: 0.012 * b, ...both(0.9 * e), wag: 0.4 * e }
  } },
  pat: { label: '쓰담', dur: 2.4, blink: true, curve: (t, e) => ({ smile: e, wag: e, angleZ: 7 * e, angleY: -5 * e + 2 * Math.sin(t * 8) * e, ...both(-0.9 * e) }) },
  wow: { ...ACTIONS.wow, curve: (t, e, s) => ({ ...ACTIONS.wow.curve(t, e, s), ...both(env(t, 0.06, 0.9, 0.5)) }) },
  shake: ACTIONS.shake,
  hop: ACTIONS.hop,
}

// ---------------------------------------------------------------- the character
export default {
  id: 'bori', name: '보리', blurb: '다섯 달 된 진돗개 강아지. 움직이는 건 일단 코로 확인합니다.',
  anchors: { head: { cx: 500, cy: 362, rx: 175, ry: 152 }, extent: [1.15, 1.2, 1.3], headScale: 1,
    neckY: 520, chinY: 505, neckBaseY: 590, bottomY: 950, faceW: 300 },
  rig: { yaw: 0.42, pitch: 0.3, roll: 0.55, bulge: 0.6, drift: [0.1, 0.06], breath: 1.2, body: { yaw: 0.3, roll: 0.15 }, limits: { yaw: 10, roll: 4 } },
  temper: { wander: 1.1, bounce: 1.2, blink: 0.8, breath: 1.3, moves: [6, 12] },
  params: { wag: [0, 1, 0.22, 'max'], pant: [0, 1, 0, 'max'], earL: [-1, 1, 0], earR: [-1, 1, 0] },
  pairs: [['earL', 'earR']],
  view: { x: 120, y: 40, w: 760, h: 950 }, face: { x: 500, y: 380, rx: 175, ry: 150 },
  chains: [
    // ears: stiff; a param turns them out and back (flat) or up (perked)
    { id: 'earL', preset: 'ear', depth: -0.05, points: [[392, 252], [372, 182], [352, 110]], target: (P) => -P.earL * 0.85 },
    { id: 'earR', preset: 'ear', depth: -0.05, points: [[608, 252], [628, 182], [648, 110]], target: (P) => P.earR * 0.85 },
    // the curled tail, wagging: a little always, a lot when happy
    { id: 'tail', preset: 'tail', attach: 'body', points: [[630, 830], [710, 790], [756, 720], [748, 646], [700, 612]],
      target: (P, t) => Math.sin(t * Math.PI * 2 * (1.6 + 2.6 * P.wag)) * (0.12 + 0.55 * P.wag) },
    { id: 'tag', preset: 'tag', attach: 'body', points: [[500, 532], [500, 566]] },
  ],
  // front legs: planted (IK keeps the paws on the ground). sh + outward; a lifted leg pitches toward the viewer (pu)
  // and its lower bone hangs back from the raised elbow — a quadruped's foreleg folds backward, never forward
  limbs: ['L', 'R'].map((k) => ({ id: 'leg' + k, side: k === 'L' ? -1 : 1, root: [k === 'L' ? 446 : 554, 640], len: [142, 136],
    rest: { sh: 0, el: 0 }, planted: [k === 'L' ? 446 : 554, 906], bend: -1, hang: 0, breathe: 0, spring: [90, 0.75],
    lim: { sh: [-15, 25], el: [-60, 20], wr: [-30, 30], pu: [0, 80], pl: [0, 60] } })),
  poses: { give: { legR: { sh: 10, el: -16, pu: 78, pl: 55, lift: true, front: 1 } } },
  moves: ANIMAL_MOVES, actions,
  expressions: {
    none: { label: '기본' },
    happy: { label: '신남', set: { smile: 1, wag: 1, pant: 0.7 } },
    surprise: { label: '놀람', set: { surprise: 1, earL: 0.9, earR: 0.9 } },
    sad: { label: '시무룩', set: { sad: 1, earL: -0.8, earR: -0.8 } },
    sleepy: { label: '졸림', set: { eyeLOpen: -0.6, eyeROpen: -0.6, earL: -0.35, earR: -0.35 } },
  },
  talk: '멍! 멍멍! 산책 가자!',
  demo: { dur: 18, pointer: [[1.0, 820, 260], [2.0, 720, 300], [3.0, 720, 300], [3.8, 250, 560], [4.6, null]],
    events: [[4.8, 'act', 'tilt'], [7.0, 'say', '멍! 멍멍!'], [8.8, 'act', 'paw'], [11.6, 'express', 'happy'], [13.4, 'express', 'none'],
      [13.6, 'act', 'bark'], [15.0, 'act', 'pat'], [16.4, 'express', 'sleepy']] },
  draw,
}

// ---------------------------------------------------------------- drawing
function leg(ctx, S, id) {
  const l = S.limbById[id], j = l.solve(S.D), up = smooth(0.1, 0.8, j.lift)
  tube(ctx, [j.S, j.E, j.W], [74, 60, 54], C.cream, C.furLine, 2.2, { openStart: true })
  paw(ctx, j.W, j.al, 56 * (1 + 0.32 * up), pawPal, { wide: 0.6, pads: up > 0.5 })
}

function draw(ctx, S) {
  const D = S.D, P = S.P, K0 = S.chainById
  const H = (d) => (x, y, o) => D.head(x, y, d, o)
  const B = (x, y, o) => D.body2(x, y, o)
  const N = (x, y, o) => D.neck(x, y, o)
  const K = (id) => (x, y, o) => K0[id].map(D, x, y, o)

  groundShadow(ctx, 500, 950, 300, 30, C.shadow, 0.35)
  // the tail, behind the body
  const tl = K0.tail, tp = [0, 0.25, 0.5, 0.75, 1].map((f) => tl.at(D, f, [0, 0]))
  tube(ctx, tp, [64, 62, 56, 46, 30], C.fur, C.furLine, 2.2)
  tube(ctx, tp.slice(2), [24, 22, 14], C.furLight, null)
  // ears, behind the head
  for (const [id, c, ci] of [['earL', EAR_L, EAR_L_IN], ['earR', mirror(EAR_L), mirror(EAR_L_IN)]]) {
    fill(ctx, K(id), c, C.fur); stroke(ctx, K(id), c, C.furLine, 2.2)
    fill(ctx, K(id), ci, C.innerEar); fill(ctx, K(id), ci, linear(ctx, K(id), 400, 140, 400, 250, [[0, 'rgba(251,232,200,0)'], [1, C.cream]]))
  }
  // the sitting body: torso, haunches, hind paws, bib
  fill(ctx, B, TORSO, linear(ctx, B, 280, 800, 720, 800, [[0, C.furDark], [0.3, C.fur], [0.7, C.fur], [1, C.furDark]])); stroke(ctx, B, TORSO, C.furLine, 2.2)
  for (const [c, x] of [[HAUNCH_L, 326], [mirror(HAUNCH_L), 674]]) {
    fill(ctx, B, c, radial(ctx, B, x, 830, 10, 95, [[0, C.furLight], [1, C.furDark]])); stroke(ctx, B, c, C.furLine, 2.2)
    const s = x < 500 ? -1 : 1
    const pp = D.body2(x + s * 8, 904, [0, 0])
    paw(ctx, pp, s * -0.45, 50, pawPal, { wide: 0.7 })
  }
  fill(ctx, B, BIB, linear(ctx, B, 500, 500, 500, 820, [[0, C.creamShade], [0.25, C.cream]]))
  stroke(ctx, B, ['M', 470, 600, 'Q', 476, 640, 470, 680], C.creamShade, 3, 0.8); stroke(ctx, B, ['M', 530, 610, 'Q', 524, 650, 530, 690], C.creamShade, 3, 0.8)
  // front legs (a lifted one is drawn last, nearer the viewer)
  const lifted = ['legL', 'legR'].filter((id) => S.limbById[id].front > 0.5)
  for (const id of ['legL', 'legR']) if (!lifted.includes(id)) leg(ctx, S, id)
  // collar and its tag
  fill(ctx, N, COLLAR, C.collar); stroke(ctx, N, COLLAR, C.collarDark, 2)
  const t0 = K0.tag.at(D, 0, [0, 0]), t1 = K0.tag.at(D, 1, [0, 0])
  ctx.beginPath(); ctx.moveTo(t0[0], t0[1]); ctx.lineTo(t1[0], t1[1]); ctx.strokeStyle = C.tagLine; ctx.lineWidth = 3; ctx.stroke()
  ctx.beginPath(); ctx.arc(t1[0], t1[1] + 12, 15, 0, Math.PI * 2); ctx.fillStyle = C.tag; ctx.fill(); ctx.strokeStyle = C.tagLine; ctx.lineWidth = 2.2; ctx.stroke()
  ctx.beginPath(); ctx.arc(t1[0] - 4, t1[1] + 7, 4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill()

  // the head
  const F = H(0)
  fill(ctx, F, HEAD, C.fur)
  clipped(ctx, F, HEAD, () => {
    fill(ctx, F, HEAD, radial(ctx, F, 500, 330, 60, 230, [[0, 'rgba(243,197,138,0.9)'], [0.6, 'rgba(226,163,90,0)'], [1, 'rgba(192,127,58,0.85)']]))
    fill(ctx, H(0.15), MASK, C.cream)
    fill(ctx, H(0.38), ell(500, 452, 84, 62), radial(ctx, H(0.38), 500, 440, 10, 90, [[0, '#fffaf0'], [1, C.cream]]))
    stroke(ctx, H(0.05), ['M', 470, 232, 'Q', 476, 262, 468, 290], C.furDark, 2.4, 0.6)
    stroke(ctx, H(0.05), ['M', 500, 226, 'Q', 504, 258, 500, 286], C.furDark, 2.4, 0.6)
    stroke(ctx, H(0.05), ['M', 530, 232, 'Q', 524, 262, 532, 290], C.furDark, 2.4, 0.6)
  })
  stroke(ctx, F, HEAD, C.furLine, 2.4)
  // maro brows: cream dots that lift with brow and tilt when sad
  for (const s of [-1, 1]) {
    const f = H(0.1), lift = -P.brow * 12 - P.surprise * 6
    const c = ell(500 + s * 72, 326 + lift, 17, 10)
    ctx.save(); fill(ctx, (x, y, o) => f(x, y + (x - (500 + s * 72)) * s * P.sad * -0.5, o), c, C.cream); ctx.restore()
  }
  const Ef = H(0.1), eyePal = { eye: C.eye, eyeGlow: C.eyeGlow, shine: C.shine, lid: C.fur, line: C.line }
  roundEye(ctx, Ef, 424, 374, 23, P, P.eyeLOpen, S.t, eyePal, { tall: 1.08 })
  roundEye(ctx, Ef, 576, 374, 23, P, P.eyeROpen, S.t, eyePal, { tall: 1.08 })
  muzzleMouth(ctx, H(0.42), P, 500, 452, C, S.t)
  nose(ctx, H(0.55), 500, 420, 54, 36, C)
  for (const s of [-1, 1]) for (const k of [0, 1, 2]) fill(ctx, H(0.4), ell(500 + s * (32 + k * 13), 456 + k * 7, 2.6, 2.6), C.furDark, 0.55)

  for (const id of lifted) leg(ctx, S, id)
}

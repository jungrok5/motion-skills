// lib/styles/_craft.js — private helpers shared by the craft hands (cut-paper, toy-theatre, embroidery, toy-brick).
// Paper edges (torn / scissor), paper fibres and dye, a soft lift shadow made of stacked translucent copies
// (portable: no ctx.filter), printed-paper motifs, and the fixed floss / brick colour tables.
import * as K from '../kit.js'

export const PAPER_CORE = '#fbf5e6' // the white heart of a coloured sheet, showing where it tore
export const LIFT = '#3c2814' // the shadow a lifted piece of paper throws

// ------------------------------------------------------------------ geometry
/** a Path2D of a closed outline (or several) */
export function p2d(...shapes) {
  const p = new Path2D()
  for (const s of shapes) { if (!s || s.length < 3) continue; s.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath() }
  return p
}
/** how box-like a closed outline is: 1 = a rectangle, ~0.79 = an ellipse */
export const rectness = (pts) => { const b = K.bbox(pts); return Math.abs(K.area(pts)) / (b.w * b.h || 1) }
/** a hand-torn edge: resampled finely, bitten in and out by noise along the normals; `grow` pushes it outward
 *  (the white core of a torn sheet sticks out past its dyed face) */
export function tear(pts, amp, seed, grow = 0, step = 2.6) {
  const n = Math.max(24, Math.min(2400, Math.round(K.length(pts, true) / step)))
  const s = K.resample(pts, n, true), nn = K.outward(s), r = K.rng(seed)
  return s.map(([x, y], i) => {
    const d = (K.fbm(seed, x, y, 0.09, 3) - 0.5) * amp * 2.2 + (K.fbm(seed + 9, x, y, 0.018, 2) - 0.5) * amp * 2.4 + (r() - 0.5) * amp * 0.6 + grow
    return [x + nn[i][0] * d, y + nn[i][1] * d]
  })
}
/** a scissor cut: crisp, with the hair of drift a hand gives a pair of scissors */
export function scissor(pts, seed, step = 4) {
  const n = Math.max(12, Math.min(1600, Math.round(K.length(pts, true) / step))), r = K.rng(seed)
  // keep real corners: resample each edge on its own
  const out = K.densify(pts, step, true)
  if (out.length > n * 2) return K.resample(pts, n, true).map(([x, y]) => [x + (r() - 0.5) * 0.7, y + (r() - 0.5) * 0.7])
  return out.map(([x, y]) => [x + (r() - 0.5) * 0.7, y + (r() - 0.5) * 0.7])
}
/** the closed band around an open line, at least `minHalf` wide (a strip of paper, a stitched bar) */
export const strip = (pts, half) => K.tube(pts, half, half, true)

// ------------------------------------------------------------------ paper
/** uneven dye and loose fibres of one sheet, inside `path` (a Path2D); ctx is already in logical px */
export function fibres(ctx, path, b, color, seed, density = 1) {
  const r = K.rng(seed), area = b.w * b.h
  ctx.save(); ctx.clip(path)
  for (let i = 0; i < 5; i++) {
    const rx = Math.max(10, Math.min(b.w, 30 + r() * 90)), ry = Math.max(8, Math.min(b.h, 20 + r() * 60))
    ctx.globalAlpha = area > 200000 ? 0.12 : 0.2; ctx.fillStyle = r() < 0.5 ? K.mix(color, '#ffffff', 0.16) : K.mix(color, '#000000', 0.1)
    ctx.beginPath(); ctx.ellipse(b.x0 + r() * b.w, b.y0 + r() * b.h, rx, ry, r() * 3, 0, Math.PI * 2); ctx.fill()
  }
  const n = Math.min(1600, Math.round((area / 900) * density))
  ctx.lineCap = 'round'
  const lite = new Path2D(), dark = new Path2D()
  for (let i = 0; i < n; i++) {
    const x = b.x0 + r() * b.w, y = b.y0 + r() * b.h, a = r() * Math.PI, l = 3 + r() * 9, p = r() < 0.55 ? lite : dark
    p.moveTo(x, y); p.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 3, y + Math.sin(a) * l * 0.5 + (r() - 0.5) * 3, x + Math.cos(a) * l, y + Math.sin(a) * l)
  }
  ctx.lineWidth = 0.9; ctx.globalAlpha = 0.32; ctx.strokeStyle = K.mix(color, '#fff8e8', 0.45); ctx.stroke(lite)
  ctx.lineWidth = 0.8; ctx.globalAlpha = 0.26; ctx.strokeStyle = K.mix(color, '#1a0e06', 0.3); ctx.stroke(dark)
  ctx.restore()
}
/** a soft shadow under a lifted piece: stacked translucent copies round the offset (no blur filter needed) */
export function liftShadow(ctx, path, dx, dy, soft, alpha = 0.45, color = LIFT, fillRule = 'nonzero') {
  ctx.save(); ctx.fillStyle = color
  const rings = [[0.35, 6], [1, 8]], n = rings.reduce((a, q) => a + q[1], 0), a1 = 1 - Math.pow(1 - alpha, 1 / n)
  ctx.globalAlpha = a1
  for (const [k, m] of rings) for (let j = 0; j < m; j++) {
    const t = (j / m) * Math.PI * 2 + k
    ctx.save(); ctx.translate(dx + Math.cos(t) * soft * k, dy + Math.sin(t) * soft * k); ctx.fill(path, fillRule); ctx.restore()
  }
  ctx.restore()
}

// ------------------------------------------------------------------ printed papers (toy theatre): each fills the clip it is called in
export const PRINTS = {
  dots(ctx, b, col, gap = 14, rad = 2.2) { ctx.fillStyle = col; ctx.beginPath(); for (let y = b.y0, row = 0; y < b.y1 + gap; y += gap * 0.87, row++) for (let x = b.x0 + (row % 2) * gap * 0.5; x < b.x1 + gap; x += gap) { ctx.moveTo(x + rad, y); ctx.arc(x, y, rad, 0, 6.283) } ctx.fill() },
  diamonds(ctx, b, col, gap = 26) { ctx.fillStyle = col; ctx.beginPath(); for (let y = b.y0, row = 0; y < b.y1 + gap; y += gap / 2, row++) for (let x = b.x0 + (row % 2) * gap / 2; x < b.x1 + gap; x += gap) { ctx.moveTo(x, y - 4); ctx.lineTo(x + 3, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 3, y); ctx.closePath() } ctx.fill() },
  stripes(ctx, b, col, gap = 22) { ctx.fillStyle = col; for (let x = b.x0 - 4; x < b.x1 + gap; x += gap) { ctx.fillRect(x, b.y0, 4, b.h); ctx.fillRect(x + 7, b.y0, 1.4, b.h) } },
  sprigs(ctx, b, col, gap = 34, seed = 3) { const r = K.rng(seed); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; for (let y = b.y0, row = 0; y < b.y1 + gap; y += gap * 0.8, row++) for (let x = b.x0 + (row % 2) * gap / 2; x < b.x1 + gap; x += gap) { const a = r() * 6; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 5, y - Math.sin(a) * 5); ctx.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); ctx.stroke(); ctx.beginPath(); ctx.ellipse(x + Math.cos(a + 1.2) * 4, y + Math.sin(a + 1.2) * 4, 2.6, 1.4, a + 1.2, 0, 6.283); ctx.fill() } },
  wood(ctx, b, col, seed = 5) { const r = K.rng(seed); ctx.strokeStyle = col; ctx.lineWidth = 1; for (let y = b.y0; y < b.y1; y += 3 + r() * 5) { ctx.globalAlpha = 0.25 + r() * 0.25; ctx.beginPath(); ctx.moveTo(b.x0, y); for (let x = b.x0; x <= b.x1 + 40; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.013 + y) * 1.8); ctx.stroke() } ctx.globalAlpha = 1 },
  checks(ctx, b, col, gap = 18) { ctx.fillStyle = col; for (let y = b.y0, row = 0; y < b.y1; y += gap, row++) for (let x = b.x0 + (row % 2) * gap; x < b.x1; x += gap * 2) ctx.fillRect(x, y, gap, gap) },
  waves(ctx, b, col, gap = 22) { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); for (let y = b.y0 + 8, row = 0; y < b.y1 + 10; y += gap, row++) for (let x = b.x0 - 30 + (row % 2) * 15; x < b.x1 + 30; x += 30) { ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 7.5, y - 7, x + 15, y) } ctx.stroke() },
}

// ------------------------------------------------------------------ colour tables
/** stranded cotton floss: a working shade card (DMC-like numbers, approximate colours) */
export const FLOSS = [
  '#fcfbf8', '#f0eada', '#e7e2d3', '#ddd8cb', '#c9c3b2', '#a49878', '#857b61', '#625d50', '#3c3a33', '#1e1d1b', // whites, ecru, khaki, black
  '#ececec', '#d3d3d6', '#abacae', '#8c8c8c', '#6c6c6c', '#565656', '#424242', // greys
  '#f8e4c8', '#ecc285', '#cb9051', '#b87748', '#985e33', '#7a451f', '#653919', '#4b2a15', '#361f0e', // tans and browns
  '#fff1af', '#fdd755', '#ffc840', '#f3b13f', '#ce9124', '#a8781c', // yellows, golds
  '#f7a777', '#f2af68', '#f29746', '#f7976f', '#ff836f', '#f27842', '#e8762e', '#e55c1f', '#eb6307', '#d15807', '#cf7339', '#ac5414', '#8a3d12', // oranges, rust
  '#fed7cc', '#fd9c97', '#e96a67', '#e04848', '#c72b3b', '#a7132b', '#7b0f22', // corals and reds
  '#e3bccb', '#c86d8f', '#956f7c', '#814952', '#5e2b3a', // pinks and plums
  '#d6cbe4', '#a38bbf', '#785b9e', '#4e3a6e', // lavenders
  '#c0ccde', '#a2b5c6', '#748eb6', '#4667a6', '#13477d', '#0e365c', '#384c5e', // blues
  '#bdcbcb', '#98aeae', '#657f7f', '#46605e', // grey-teal
  '#c4dece', '#a3b5ab', '#99c3aa', '#7bac94', '#7f978d', '#65a57d', '#5b9071', '#477759', '#396f52', '#20503a', // sage and jade
  '#ccd9b1', '#a7c08a', '#71935c', '#4f7a3b', '#406a2e', '#2a4a1f', // leaf greens
  '#e4e3a5', '#bcb34c', '#948c36', '#6f6a2c', '#4c4a22', // olives, moss
  '#d2bca6', '#b69b7e', '#9a7c5c', '#675541', '#4a3a2c', // beige browns
  '#b4b6a0', '#8e9078', '#6b6e5e', '#4d5048', // grey-greens (steel, stone)
  '#9fa6ad', '#7b858e', '#5a636b', '#3d454c', '#2a3036', // blue-greys (steel)
]

/** moulded toy-brick colours (no trademark: a working table of real brick colours) */
export const BRICK = {
  white: '#F4F4F4', veryLightGrey: '#E6E3E0', lightGrey: '#A0A5A9', darkGrey: '#6C6E68', black: '#1B2A34', red: '#C91A09', darkRed: '#720E0F',
  orange: '#FE8A18', brightLightOrange: '#F8BB3D', yellow: '#F2CD37', lightYellow: '#FBE696', brightLightYellow: '#FFF03A', tan: '#E4CD9E', darkTan: '#958A73',
  reddishBrown: '#582A12', darkBrown: '#352100', mediumNougat: '#AA7D55', nougat: '#D09168', lightNougat: '#F6D7B3',
  sandGreen: '#A0BCAC', oliveGreen: '#9B9A5A', green: '#237841', darkGreen: '#184632', brightGreen: '#4B9F4A', lime: '#BBE90B', yellowishGreen: '#DFEEA5',
  mediumAzure: '#36AEBF', darkAzure: '#078BC9', mediumBlue: '#5A93DB', blue: '#0055BF', darkBlue: '#0A3463', sandBlue: '#6074A1', lightAqua: '#ADC3C0',
  lavender: '#E1D5ED', mediumLavender: '#AC78BA', darkPink: '#C870A0', brightPink: '#E4ADC8', sandRed: '#D67572', darkOrange: '#A95500',
  coral: '#FF698F', darkTurquoise: '#008F9B', pearlGold: '#AA7F2E', warmTan: '#CCA373', vibrantCoral: '#E9897C',
}

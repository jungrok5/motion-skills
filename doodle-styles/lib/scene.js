// lib/scene.js — the subject, written once, in no style.
//
// A piece's scene(K, t) returns a list of ITEMS in painter's order (back to front):
//   { region: pts, color, name?, role?, depth?, form?, light?, contour?, grain? }   a closed shape with a local colour
//   { line: pts, color?, w?, name?, role?, depth? }                                   an open line (a stem, a crack, steam)
// role:  'bg' (wall, sky, the table top seen flat) · 'ground' · 'subject' (default) · 'detail' (small parts) ·
//        'shadow' (a cast shadow; colour is the shadow's tint) · 'glow' (a light source: a window, a flame) · 'highlight'
// depth: 0 = nearest, 1 = farthest (folk-tale fades to pencil with distance, some hands lose detail far away)
// form:  0 = flat (a wall), 1 = fully round (a fruit) — how strongly the light turns the shape
// grain: a direction (radians) the material runs (wood grain, fur, a leaf's veins) — hatching hands follow it
// Styles never see the piece's code, only this prepared scene S, so any subject works in any hand.
import { bbox, centroid, area, clamp, lerp, smoothstep, mix, litOf, shadeOf, lum, rgb, canvas, path } from './kit.js'

export function prepare(piece, K, t = 0, env = {}) {
  const [W, H] = piece.size || [1080, 1080]
  let L = piece.light || [-0.6, -0.8]
  const ll = Math.hypot(L[0], L[1]) || 1
  L = [L[0] / ll, L[1] / ll]
  const raw = piece.scene(K, t) || []
  const items = []
  raw.flat(Infinity).filter(Boolean).forEach((it, i) => {
    if (it.region) {
      const pts = it.region, b = bbox(pts), role = it.role || 'subject'
      const r = {
        kind: 'region', i, name: it.name || `region${i}`, pts, color: it.color || '#888888', role,
        depth: it.depth ?? (role === 'bg' ? 0.9 : 0.4), form: it.form ?? (role === 'bg' || role === 'ground' ? 0.15 : role === 'shadow' ? 0 : 0.7),
        light: it.light ? norm(it.light) : L, grain: it.grain, bbox: b, centre: centroid(pts), area: Math.abs(area(pts)),
        contour: it.contour ?? !['bg', 'shadow', 'glow', 'highlight'].includes(role), strength: it.strength ?? 0.5,
      }
      r.lit = it.lit || (role === 'glow' ? mix(r.color, '#ffffff', 0.5) : litOf(r.color))
      r.shade = it.shade || shadeOf(r.color)
      r.toneAt = (x, y) => regionTone(r, x, y)
      r.colorAt = (x, y) => colourAtTone(r, regionTone(r, x, y))
      items.push(r)
    } else if (it.line) {
      items.push({ kind: 'line', i, name: it.name || `line${i}`, pts: it.line, color: it.color || '#3a302b', w: it.w ?? 3, role: it.role || 'detail', depth: it.depth ?? 0.4, closed: !!it.closed })
    }
  })
  const regions = items.filter((x) => x.kind === 'region'), lines = items.filter((x) => x.kind === 'line')
  const bgr = regions.find((r) => r.role === 'bg')
  const S = {
    W, H, t, light: L, items, regions, lines, title: piece.title || '', seed: piece.seed ?? 1,
    bg: piece.bg || (bgr ? bgr.color : '#f3ece0'),
    /** the regions in a role, or all solid ones */
    solid: regions.filter((r) => !['shadow', 'glow', 'highlight'].includes(r.role)),
    colours: [...new Set(regions.map((r) => r.color))],
  }
  /** the solid regions painted AFTER r that overlap it — what hides r. Transparent media cut these out of r's layer
   *  (D.layer({ cut: S.occluders(r) })) so a hand never paints or draws what it cannot see. */
  S.occluders = (r, { light = true } = {}) => {
    const b = r.bbox || (r.bbox = bbox(r.pts))
    return regions.filter((q) => q.i > r.i && !['shadow', 'glow'].includes(q.role) && (light || q.role !== 'highlight') && q.bbox.x0 < b.x1 && q.bbox.x1 > b.x0 && q.bbox.y0 < b.y1 && q.bbox.y1 > b.y0).map((q) => q.pts)
  }
  let plate = null
  const getPlate = () => (plate ||= buildPlate(S, env))
  /** the shaded colour of the picture at (x, y): [r, g, b] */
  S.colorAt = (x, y) => getPlate().at(x, y)
  /** the value of the picture at (x, y): 0 = darkest, 1 = lightest (light, shape, cast shadows, glows) */
  S.tone = (x, y) => getPlate().tone(x, y)
  /** the topmost solid region at (x, y), or null */
  S.regionAt = (x, y) => getPlate().region(x, y)
  /** the raw value plate (an offscreen canvas at plate resolution) and its scale */
  S.plate = () => getPlate()
  return S
}
const norm = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l] }

/** how lit a region is at (x, y): 1 = full light, 0 = core shadow */
export function regionTone(r, x, y) {
  const b = r.bbox, u = (x - b.cx) / (b.w / 2 || 1), v = (y - b.cy) / (b.h / 2 || 1), L = r.light
  const d = clamp(u * L[0] + v * L[1], -1.2, 1.2), r2 = u * u + v * v
  const round = 0.56 + 0.42 * clamp(d, -1, 1) - 0.28 * smoothstep(0.55, 1.15, r2) * (1 - Math.max(0, d)) + 0.08 * smoothstep(0.9, 1.25, r2) * Math.max(0, -d)
  const flat = 0.6 + 0.16 * d
  return clamp(lerp(flat, round, r.form))
}
/** tone → colour: lit at 1, the local colour around 0.6, shade at 0 */
export function colourAtTone(r, t) {
  return t >= 0.6 ? mix(r.color, r.lit, (t - 0.6) / 0.4) : mix(r.shade, r.color, t / 0.6)
}

// ------------------------------------------------------------------ the value plate: exact region ids by scanline, shaded per pixel
function buildPlate(S, env) {
  const res = env.plateRes || 0.5, w = Math.ceil(S.W * res), h = Math.ceil(S.H * res), N = w * h
  const id = new Int16Array(N).fill(-1), shadow = new Float32Array(N), glow = new Float32Array(N), sid = new Int16Array(N).fill(-1)
  S.regions.forEach((r, ri) => {
    spans(r.pts, res, w, h, (row, x0, x1) => {
      for (let x = x0; x <= x1; x++) {
        const k = row * w + x
        if (r.role === 'shadow') { shadow[k] = Math.max(shadow[k], r.strength); sid[k] = ri }
        else if (r.role === 'glow' || r.role === 'highlight') { glow[k] = Math.max(glow[k], r.role === 'glow' ? 1 : 0.6); id[k] = r.role === 'glow' ? ri : id[k] }
        else { id[k] = ri; shadow[k] = 0; glow[k] = 0 }
      }
    })
  })
  const cnv = canvas(w, h), x2 = cnv.getContext('2d'), img = x2.createImageData(w, h), d = img.data
  const bg = rgb(S.bg)
  const cache = S.regions.map(() => null)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x, ri = id[k], X = (x + 0.5) / res, Y = (y + 0.5) / res
    let c = bg
    if (ri >= 0) { const r = S.regions[ri]; c = rgb(r.role === 'glow' ? r.lit : colourAtTone(r, r.toneAt(X, Y))) }
    if (shadow[k] > 0) { const sr = S.regions[sid[k]], sc = cache[sid[k]] ||= rgb(sr.color), a = shadow[k]; c = c.map((v, j) => v * (1 - a) + v * (sc[j] / 255) * a * 0.75) }
    if (glow[k] > 0 && ri >= 0 && S.regions[ri].role !== 'glow') c = c.map((v) => v + (255 - v) * 0.25 * glow[k])
    d[k * 4] = c[0]; d[k * 4 + 1] = c[1]; d[k * 4 + 2] = c[2]; d[k * 4 + 3] = 255
  }
  x2.putImageData(img, 0, 0)
  // lines on the plate, so line work shows in the tone too
  x2.setTransform(res, 0, 0, res, 0, 0); x2.lineCap = 'round'; x2.lineJoin = 'round'
  for (const l of S.lines) { x2.strokeStyle = l.color; x2.lineWidth = l.w; path(x2, l.pts, l.closed); x2.stroke() }
  const px = x2.getImageData(0, 0, w, h).data
  const at = (X, Y) => { const x = clamp(Math.floor(X * res), 0, w - 1), y = clamp(Math.floor(Y * res), 0, h - 1), k = (y * w + x) * 4; return [px[k], px[k + 1], px[k + 2]] }
  const tone = (X, Y) => { const [r, g, b] = at(X, Y); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 }
  const region = (X, Y) => { const x = clamp(Math.floor(X * res), 0, w - 1), y = clamp(Math.floor(Y * res), 0, h - 1), ri = id[y * w + x]; return ri >= 0 ? S.regions[ri] : null }
  return { canvas: cnv, res, w, h, at, tone, region, ids: id }
}
/** even-odd scanline spans of a closed outline at resolution `res` */
function spans(pts, res, w, h, cb) {
  const b = bbox(pts), y0 = Math.max(0, Math.floor(b.y0 * res)), y1 = Math.min(h - 1, Math.ceil(b.y1 * res))
  for (let row = y0; row <= y1; row++) {
    const Y = (row + 0.5) / res, xs = []
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j]
      if ((yi > Y) !== (yj > Y)) xs.push(xi + ((Y - yi) * (xj - xi)) / (yj - yi))
    }
    xs.sort((a, b2) => a - b2)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.max(0, Math.ceil(xs[k] * res - 0.5)), c = Math.min(w - 1, Math.floor(xs[k + 1] * res - 0.5))
      if (c >= a) cb(row, a, c)
    }
  }
}

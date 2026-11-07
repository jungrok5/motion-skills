// Pixel art — studied from anidoodle's "the pounce" plate (pixelArt.ts · pixelArtKit.ts · styles/pixelArt.md): cells
// LAID on a low-res grid, each one of sixteen declared palette colours, blown up by a whole number with no smoothing;
// a half tint is a 2×2 ordered dither, never an alpha blend; staircase edges kept clean (no orphan cells, no doubled
// corners). Re-implemented for the scene: the subject is sampled once per cell, quantised to each material's ramp.
//
// defaults (all overridable by a house style):
//   cells    cells across the picture (the cell size is the whole number W / cells, rounded down)
//   palette  'auto' = sixteen colours derived from the scene (one ink + a k-means of every material's shade/local/lit),
//            or an array of up to 16 hex colours: the declared palette; every pixel of the still is one of them
//   outline  'selective' (dark ink against the background, the material's own dark inside, lit side lighter) or 'none'
//   dither   true: 2×2 ordered dither for half tints and glows; false: hard bands only
import { spans, kmeans, colourDist } from './_geo.js'

const BAYER = [[0, 2], [3, 1]] // 2×2 ordered dither

export default {
  id: 'pixel-art', name: 'Pixel art', ko: '픽셀 아트',
  medium: 'cells laid one at a time on a low-res grid (about 120 across), each exactly one of 16 declared palette colours, blown up by a whole number with smoothing off',
  mark: 'the single cell (pencil), the bucket fill, the 2×2 dither cluster',
  edge: 'the staircase, kept clean: consistent runs, no orphan cells, no doubled corners; a selective dark outline',
  order: ['blocking', 'line cleanup', 'shading clusters', 'highlights', 'light sources'],
  paper: 'the empty screen (palette colour 0)',
  palette: 'sixteen colours declared up front (by default derived from the scene: one ink plus each material’s ramp)',
  bestFor: '레트로 게임 느낌 · 아이콘/캐릭터 · 작은 장면 · 루프 애니메이션',
  source: 'anidoodle pixelArt.ts · pixelArtKit.ts · styles/pixelArt.md',
  defaults: { cells: 120, palette: 'auto', outline: 'selective', dither: true },

  draw(D, S, K, o) {
    const L = S.light, cp = Math.max(2, Math.floor(S.W / Math.max(16, o.cells))), cols = Math.ceil(S.W / cp), rows = Math.ceil(S.H / cp), N = cols * rows
    const R = S.regions

    // ---- the declared palette
    const pal = palette(S, K, o)
    const P = pal.map((c) => K.rgb(c)), PL = pal.map((c) => K.lum(c))
    const near = (c) => { const x = K.rgb(c); let bi = 0, bd = Infinity; P.forEach((p, i) => { const d = 2 * (x[0] - p[0]) ** 2 + 4 * (x[1] - p[1]) ** 2 + 3 * (x[2] - p[2]) ** 2; if (d < bd) { bd = d; bi = i } }); return bi }
    const lightest = PL.indexOf(Math.max(...PL)), ink = PL.indexOf(Math.min(...PL))
    // each material's ramp: the palette entries nearest its deep shade … shine, darkest first
    const rampOf = new Map()
    const ramp = (r) => {
      if (!rampOf.has(r)) {
        const c = r ? r.color : S.bg, lit = r ? r.lit : K.litOf(S.bg), sh = r ? r.shade : K.shadeOf(S.bg)
        const src = r && r.role === 'glow' ? [r.color, K.mix(r.color, r.lit, 0.3), r.lit] : [K.mix(sh, '#1a1626', 0.25), sh, K.mix(sh, c, 0.5), c, K.mix(c, lit, 0.6), lit]
        // the ramp: palette entries lying near this material's own shade → lit line (so a wall never borrows a roof's
        // mauve for its shadow), always with the entries nearest its local colour and its two ends
        const line = src.map((c) => K.rgb(c)), segD = (p) => {
          let best = Infinity
          for (let j = 0; j + 1 < line.length; j++) {
            const a = line[j], b = line[j + 1], ab = [0, 1, 2].map((i) => b[i] - a[i]), L2 = ab.reduce((s, v) => s + v * v, 0) || 1
            const t = K.clamp(((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / L2), q = a.map((v, i) => v + ab[i] * t)
            best = Math.min(best, Math.sqrt(2 * (p[0] - q[0]) ** 2 + 4 * (p[1] - q[1]) ** 2 + 3 * (p[2] - q[2]) ** 2))
          }
          return best
        }
        const set = new Set([near(c), near(src[0]), near(src[src.length - 1])])
        P.forEach((p, i) => { if (segD(p) < 20) set.add(i) })
        const idx = [...set].sort((a, b) => PL[a] - PL[b])
        rampOf.set(r, { idx, mid: near(c) })
      }
      return rampOf.get(r)
    }

    // ---- the grid: which material is on top in each cell (painter's order), cast shadow and falling light
    const id = new Int16Array(N).fill(-1), shadow = new Float32Array(N), sid = new Int16Array(N).fill(-1), hl = new Float32Array(N)
    R.forEach((r, ri) => spans(r.pts, cp, cols, rows, (row, a, c) => {
      for (let x = a; x <= c; x++) {
        const k = row * cols + x
        if (r.role === 'shadow') { if (r.strength >= shadow[k]) { shadow[k] = r.strength; sid[k] = ri } }
        else if (r.role === 'highlight') hl[k] = Math.max(hl[k], 1)
        else { id[k] = ri; shadow[k] = 0; hl[k] = 0 }
      }
    }))
    // mask cleanup: one-cell nubs taken off, one-cell notches filled (twice round)
    for (let pass = 0; pass < 2; pass++) for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const k = y * cols + x, me = id[k], nb = []
      if (x > 0) nb.push(id[k - 1]); if (x < cols - 1) nb.push(id[k + 1]); if (y > 0) nb.push(id[k - cols]); if (y < rows - 1) nb.push(id[k + cols])
      const same = nb.filter((v) => v === me).length
      if (same <= 1) { const cnt = new Map(); for (const v of nb) cnt.set(v, (cnt.get(v) || 0) + 1); for (const [v, n] of cnt) if (v !== me && n >= 3) id[k] = v }
    }

    // ---- colour per cell, quantised to its material's ramp; half tints as a 2×2 checker
    const fin = new Int16Array(N), dith = new Uint8Array(N), cat = new Uint8Array(N) // cat: 0 mid 1 shade 2 light 3 outline 4 glow/light line
    const glowCell = (k) => id[k] >= 0 && R[id[k]].role === 'glow'
    // distance (in cells) to the nearest light source cell, for the glow dither
    const gd = new Float32Array(N).fill(99), GR = 4
    for (let k = 0; k < N; k++) if (glowCell(k)) {
      const x0 = k % cols, y0 = (k / cols) | 0
      for (let dy = -GR; dy <= GR; dy++) for (let dx = -GR; dx <= GR; dx++) {
        const x = x0 + dx, y = y0 + dy; if (x < 0 || y < 0 || x >= cols || y >= rows) continue
        const q = y * cols + x, d = Math.hypot(dx, dy); if (d < gd[q]) gd[q] = d
      }
    }
    const quant = (rp, c, x, y) => {
      const l = K.lum(c), ix = rp.idx
      if (l <= PL[ix[0]]) return ix[0]
      if (l >= PL[ix[ix.length - 1]]) return ix[ix.length - 1]
      for (let j = 0; j + 1 < ix.length; j++) {
        const a = PL[ix[j]], b = PL[ix[j + 1]]
        if (l <= b) {
          const t = (l - a) / (b - a || 1)
          if (!o.dither || t < 0.36) return ix[j]
          if (t > 0.64) return ix[j + 1]
          return (BAYER[y & 1][x & 1] < 2) ? ix[j + 1] : ix[j] // the checker half tint
        }
      }
      return ix[ix.length - 1]
    }
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const k = y * cols + x, r = id[k] >= 0 ? R[id[k]] : null, X = (x + 0.5) * cp, Y = (y + 0.5) * cp, rp = ramp(r)
      let c = r ? K.rgb(r.role === 'glow' ? K.mix(r.color, r.lit, 0.3) : r.colorAt(X, Y)) : K.rgb(S.bg)
      if (shadow[k] > 0) { const sc = K.rgb(R[sid[k]].color), a = shadow[k]; c = c.map((v, j) => v * (1 - a) + v * (sc[j] / 255) * a * 0.75) }
      if (hl[k] > 0) c = c.map((v) => v + (255 - v) * 0.3 * hl[k])
      let v = quant(rp, K.hex(c), x, y)
      const t = K.lum(K.hex(c))
      dith[k] = (t > PL[rp.idx[0]] && t < PL[rp.idx[rp.idx.length - 1]] && v !== near(K.hex(c))) ? 1 : 0
      cat[k] = v === rp.mid ? 0 : PL[v] < PL[rp.mid] ? 1 : 2
      if (r && r.role === 'glow') { cat[k] = 4 }
      else if (o.dither && gd[k] <= GR) {
        // glow dither: light thinning cell by cell away from the source
        const lv = 1 - gd[k] / (GR + 1), up = rp.idx.filter((i) => PL[i] > PL[v])
        if (up.length && (lv > 0.75 || (lv > 0.45 && BAYER[y & 1][x & 1] < 2) || (lv > 0.2 && BAYER[y & 1][x & 1] === 0))) { v = up[0]; cat[k] = 4; dith[k] = 1 }
      }
      fin[k] = v
    }
    // orphan cells (not dither) take the colour all their neighbours agree on
    for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
      const k = y * cols + x; if (dith[k]) continue
      const nb = [fin[k - 1], fin[k + 1], fin[k - cols], fin[k + cols]]
      if (nb.every((v) => v !== fin[k])) { const cnt = new Map(); for (const v of nb) cnt.set(v, (cnt.get(v) || 0) + 1); for (const [v, n] of cnt) if (n >= 3) { fin[k] = v; cat[k] = v === ramp(id[k] >= 0 ? R[id[k]] : null).mid ? 0 : cat[k] } }
    }

    // ---- selective outline: the silhouette's edge cells, against whatever lies behind
    const outlineCells = new Map() // region index → [cell…]
    if (o.outline !== 'none') for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const k = y * cols + x, ri = id[k]; if (ri < 0) continue
      const r = R[ri]; if (!r.contour || r.role === 'glow') continue
      let behind = null, dir = null
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= cols || yy >= rows) continue
        const q = id[yy * cols + xx]
        if (q !== ri && (q < 0 || q < ri)) { const b = q < 0 ? null : R[q]; if (!behind || !b || ['bg', 'ground', 'glow'].includes(b.role)) { behind = b || { role: 'bg' }; dir = [dx, dy] } }
      }
      if (!behind) continue
      const rp = ramp(r), lit = dir[0] * L[0] + dir[1] * L[1] > 0.35
      let v
      if (['bg', 'ground', 'glow'].includes(behind.role)) v = lit ? rp.idx[Math.min(1, rp.idx.length - 1)] : ink // sel-out: the lit side's line is lighter
      else v = rp.idx[0]
      if (v === fin[k] && !lit) v = ink
      fin[k] = v; cat[k] = 3; dith[k] = 0
      if (!outlineCells.has(ri)) outlineCells.set(ri, [])
      outlineCells.get(ri).push(k)
    }
    // a specular cluster on round things, toward the light
    for (const r of R) {
      if (r.role === 'shadow' || r.role === 'glow' || r.role === 'highlight' || r.form < 0.7 || r.role === 'bg' || r.role === 'ground') continue
      const b = r.bbox, s = Math.min(b.w, b.h) / cp; if (s < 8) continue
      const cx = Math.floor((b.cx + L[0] * b.w * 0.27) / cp), cy = Math.floor((b.cy + L[1] * b.h * 0.27) / cp), n = Math.max(1, Math.round(s / 9))
      const top = ramp(r).idx[ramp(r).idx.length - 1]
      for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n + 1; dx++) {
        const x = cx + dx, y = cy + dy, k = y * cols + x
        if (x < 0 || y < 0 || x >= cols || y >= rows || id[k] !== R.indexOf(r) || cat[k] === 3) continue
        fin[k] = (dx === 0 || dx === n) && (dy === 0 || dy === n - 1) && n > 1 ? top : (top === lightest ? top : lightest); cat[k] = 2; dith[k] = 0
      }
    }

    // ---- lines, pixel-perfect: one cell wide (or more), L-corners removed; hidden where a later shape covers them
    const lineCells = [], lightLineCells = []
    for (const l of S.lines) {
      const light = K.isLight(l.color), th = Math.max(1, Math.round(l.w / cp)), v = light ? near(K.mix(l.color, '#ffffff', 0.25)) : near(K.mix(l.color, '#000000', 0.15))
      const path = []
      for (const [x, y] of K.densify(l.pts, cp / 3)) {
        const cx = Math.floor(x / cp), cy = Math.floor(y / cp), last = path[path.length - 1]
        if (!last || last[0] !== cx || last[1] !== cy) path.push([cx, cy])
      }
      const clean = path.filter((p, i) => { if (i === 0 || i === path.length - 1) return true; const a = path[i - 1], c = path[i + 1]; return !(Math.abs(a[0] - c[0]) === 1 && Math.abs(a[1] - c[1]) === 1) })
      const out = light ? lightLineCells : lineCells
      for (const [cx, cy] of clean) for (let j = 0; j < th; j++) for (let i = 0; i < th; i++) {
        const x = cx + i - (th >> 1), y = cy + j - (th >> 1); if (x < 0 || y < 0 || x >= cols || y >= rows) continue
        const k = y * cols + x; if (id[k] >= 0 && R[id[k]].i > l.i) continue
        fin[k] = v; cat[k] = light ? 4 : 3; dith[k] = 0; out.push(k)
      }
    }

    // ---- laying the cells: every pass writes what changes, in the order a pixel artist works
    const cur = new Int16Array(N).fill(0)
    const rect = (k, v) => [(k % cols) * cp, ((k / cols) | 0) * cp, cp, cp, pal[v]]
    const lay = (cells, vals) => { const list = []; cells.forEach((k, j) => { const v = vals ? vals[j] : fin[k]; if (cur[k] !== v) { cur[k] = v; list.push(rect(k, v)) } }); if (list.length) D.rects(list, { cost: 1 }) }

    D.ground(() => D.sheet(pal[0]))
    D.pass('blocking', 3, () => {
      // flat mid colours, painter's order: the pencil round the edge, the bucket for the mass; the subject goes down coarse first
      R.forEach((r, ri) => {
        if (['shadow', 'highlight', 'glow'].includes(r.role)) return
        const mid = ramp(r).mid, cells = []
        spans(r.pts, cp, cols, rows, (row, a, c) => { for (let x = a; x <= c; x++) cells.push(row * cols + x) })
        if (!cells.length) return
        if (r.role !== 'bg' && r.role !== 'ground' && cells.length > 60) {
          const before = new Map(), coarse = [], cv = []
          const inR = new Set(cells)
          for (const k of cells) {
            const x = (k % cols) & ~1, y = ((k / cols) | 0) & ~1
            for (const [qx, qy] of [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]]) { const q = qy * cols + qx; if (qx < cols && qy < rows && !before.has(q)) { before.set(q, cur[q]); coarse.push(q); cv.push(mid) } }
          }
          lay(coarse, cv)
          // refine: the true silhouette, the overshoot put back
          const fixK = [], fixV = []
          for (const [q, v] of before) { fixK.push(q); fixV.push(inR.has(q) ? mid : v) }
          lay(fixK, fixV)
        } else lay(cells, cells.map(() => mid))
      })
    })
    D.pass('line cleanup', 1.6, () => {
      // the silhouettes swept once round (cells taken off and put on), then the dark lines
      const sweep = []
      for (const [ri, cells] of outlineCells) { const [cx, cy] = R[ri].centre; cells.sort((a, b) => Math.atan2(((a / cols) | 0) * cp - cy, (a % cols) * cp - cx) - Math.atan2(((b / cols) | 0) * cp - cy, (b % cols) * cp - cx)); sweep.push(cells) }
      for (const cells of sweep) lay(cells)
      lay(lineCells)
      const fix = []; for (let k = 0; k < N; k++) if (cat[k] === 0 && cur[k] !== fin[k]) fix.push(k)
      lay(fix)
    })
    const byCat = (want) => { const out = []; for (let k = 0; k < N; k++) if (cat[k] === want && cur[k] !== fin[k]) out.push(k); return out }
    D.pass('shading clusters', 2.2, () => lay(byCat(1)))
    D.pass('highlights', 1.3, () => lay(byCat(2)))
    D.pass('light sources', 1.4, () => {
      // the source itself, its glow dither, then the light lines (steam, a white bar) — LAST
      const src = [], halo = []
      for (let k = 0; k < N; k++) if (cat[k] === 4 && cur[k] !== fin[k]) (glowCell(k) ? src : halo).push(k)
      lay(src); lay(halo); lay(lightLineCells)
      const rest = []; for (let k = 0; k < N; k++) if (cur[k] !== fin[k]) rest.push(k)
      lay(rest)
    })
  },
}

/** the sixteen: the house style's own list, or one ink plus a k-means of every material's ramp */
function palette(S, K, o) {
  if (Array.isArray(o.palette) && o.palette.length) return o.palette.slice(0, 16).map((c) => K.hex(K.rgb(c)))
  const items = []
  let darkest = '#ffffff'
  for (const r of S.regions) {
    if (r.role === 'shadow' || r.role === 'highlight') continue
    const w = (Math.sqrt(r.area) + 40) * (r.role === 'glow' ? 3 : 1)
    if (K.lum(r.color) < K.lum(darkest)) darkest = r.color
    const ramp = r.role === 'glow' ? [r.color, K.mix(r.color, r.lit, 0.3)] : [r.shade, K.mix(r.shade, r.color, 0.5), r.color, K.mix(r.color, r.lit, 0.6)]
    for (const c of ramp) items.push({ c, w })
    // cast shadows on this material
    if (r.role === 'ground' || r.role === 'bg') items.push({ c: K.mix(r.shade, '#1a1626', 0.25), w: w * 0.5 })
  }
  for (const l of S.lines) { items.push({ c: l.color, w: 20 + K.length(l.pts) * 0.05 }); if (K.lum(l.color) < K.lum(darkest)) darkest = l.color }
  const ink = K.mix(darkest, '#0d0b14', 0.6)
  const rest = kmeans(items, 14).map((c) => K.hex(K.rgb(c)))
  // every material keeps its own colour: a local colour far from all fourteen replaces the most redundant entry
  const mats = S.regions.filter((r) => !['shadow', 'highlight'].includes(r.role)).sort((a, b) => b.area - a.area)
  const locked = new Set()
  for (let pass = 0; pass < 6; pass++) {
    let worst = null, wd = 0
    for (const r of mats) { const c = r.role === 'glow' ? K.mix(r.color, r.lit, 0.3) : r.color, d = Math.min(...rest.map((p) => colourDist(p, c))) * Math.sqrt(Math.sqrt(r.area)); if (d > wd) { wd = d; worst = c } }
    if (!worst || wd < 46 * 9) break
    let bi = -1, bd = Infinity
    rest.forEach((p, i) => rest.forEach((q, j) => { if (i !== j && !locked.has(i)) { const d = colourDist(p, q); if (d < bd) { bd = d; bi = i } } }))
    if (bi < 0) break
    rest[bi] = K.hex(K.rgb(worst)); locked.add(bi)
  }
  const shine = K.mix(rest.reduce((a, c) => (K.lum(c) > K.lum(a) ? c : a), rest[0]), '#fffaf0', 0.8)
  return [ink, ...rest, shine].slice(0, 16)
}

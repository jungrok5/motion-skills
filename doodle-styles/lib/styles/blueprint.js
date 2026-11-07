// Cyanotype blueprint — studied from anidoodle's going-train plate (blueprint.ts · blueprintKit.ts · blueprint.md).
// Re-implemented for the scene model. A ruling pen and a spring-bow compass loaded with white ink on Prussian-blue cyanotype
// stock that never exposed evenly (brighter where the arc lamp stood, mottled, two old fold lines, dust). White on blue
// blooms, so every line carries a faint halo; the ink breaks up a little on the tooth of the sheet.
// A drawing office has no paint: everything is made from line, by convention.
//   visible outlines heavy white · hidden edges thin dashes · centre lines long-dash-short-dash (chain)
//   flat parts: section lining at 45°, adjacent parts lined opposite ways, denser for darker stuff
//   round parts: LINE SHADING (drafting's own convention for a cylinder: lines crowding toward the shade side)
//   cast shadows: sciagraphy — constructed and hatched the other way · glass (a glow): glazing marks and fine lining
//   light lines: a wide one (a glazing bar) ruled as its two edges; a thin one (steam) as a phantom line
// and the sheet carries its furniture: border and zones, datum line, dimensions, balloons, the title block lettered last.
//
// defaults (overridable by a house style):
//   ground / white / cyan / dim — the stock and the three inks of the line hierarchy
//   titleBlock — rule and letter a title block (true)     title — its title (A–Z 0–9; default: the main part's name)
//   dimensions — dimension the main part (true)            balloons — number the parts (true)     scale — e.g. '1:2'
import { unit, sub, hash, truePlate } from './_cut.js'

// single-stroke drafting capitals on a 4×6 grid (y down), inclined when lettered
const O_ = '1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0', P_ = '0,6 0,0 3,0 4,1 4,2 3,3 0,3'
const GLYPH = {
  A: '0,6 2,0 4,6|1,4 3,4', B: '0,6 0,0 3,0 4,1 4,2 3,3 0,3|3,3 4,4 4,5 3,6 0,6', C: '4,1 3,0 1,0 0,1 0,5 1,6 3,6 4,5', D: '0,0 0,6 3,6 4,5 4,1 3,0 0,0',
  E: '4,0 0,0 0,6 4,6|0,3 3,3', F: '4,0 0,0 0,6|0,3 3,3', G: '4,1 3,0 1,0 0,1 0,5 1,6 3,6 4,5 4,3 2,3', H: '0,0 0,6|4,0 4,6|0,3 4,3',
  I: '1,0 3,0|2,0 2,6|1,6 3,6', J: '4,0 4,5 3,6 1,6 0,5', K: '0,0 0,6|4,0 0,4|1,3 4,6', L: '0,0 0,6 4,6', M: '0,6 0,0 2,3 4,0 4,6',
  N: '0,6 0,0 4,6 4,0', O: O_, P: P_, Q: O_ + '|2,4 4,6', R: P_ + '|2,3 4,6', S: '4,1 3,0 1,0 0,1 0,2 1,3 3,3 4,4 4,5 3,6 1,6 0,5',
  T: '0,0 4,0|2,0 2,6', U: '0,0 0,5 1,6 3,6 4,5 4,0', V: '0,0 2,6 4,0', W: '0,0 1,6 2,3 3,6 4,0', X: '0,0 4,6|4,0 0,6', Y: '0,0 2,3 4,0|2,3 2,6',
  Z: '0,0 4,0 0,6 4,6', 0: O_ + '|0.6,5 3.4,1', 1: '1,1 2,0 2,6|1,6 3,6', 2: '0,1 1,0 3,0 4,1 4,2 0,6 4,6', 3: '0,1 1,0 3,0 4,1 4,2 3,3 2,3|3,3 4,4 4,5 3,6 1,6 0,5',
  4: '3,6 3,0 0,4 4,4', 5: '4,0 0,0 0,3 3,3 4,4 4,5 3,6 1,6 0,5', 6: '4,1 3,0 1,0 0,1 0,5 1,6 3,6 4,5 4,4 3,3 0,3', 7: '0,0 4,0 1,6',
  8: '1,3 0,2 0,1 1,0 3,0 4,1 4,2 3,3 1,3 0,4 0,5 1,6 3,6 4,5 4,4 3,3', 9: '4,3 1,3 0,2 0,1 1,0 3,0 4,1 4,5 3,6 1,6 0,5',
  '-': '1,3 3,3', '.': '2,5.5 2,6', ':': '2,1.5 2,2|2,4.5 2,5', '/': '0,6 4,0', '=': '0.5,2 3.5,2|0.5,4 3.5,4',
}
const strokesOf = (ch) => (GLYPH[ch] || '').split('|').filter(Boolean).map((s) => s.trim().split(/\s+/).map((p) => p.split(',').map(Number)))
const textWidth = (s, cap) => s.length * cap * 0.93

export default {
  id: 'blueprint', name: 'Cyanotype blueprint', ko: '청사진',
  medium: 'ruling pen and spring-bow compass in white ink on Prussian-blue cyanotype stock',
  mark: 'ruled white outlines, chain centre lines, dashed hidden edges, section lining and line shading, dimensions and lettering',
  edge: 'a thin even pen line with a faint bloom of white ink into the blue; no paint, no fill — tone only by drafting convention',
  order: ['border and title block', 'construction lines', 'ruling-pen outlines', 'section lining and shading', 'details', 'dimensions and balloons', 'lettering'],
  paper: 'Prussian-blue cyanotype stock, unevenly exposed, mottled, folded, dusty',
  palette: 'white ink, pale cyan and dim cyan on Prussian blue; colour becomes line density',
  bestFor: '기계, 건물, 가구 같은 사물 · 설계도 느낌 · 공학/제품 소개',
  source: 'anidoodle blueprint.ts · blueprintKit.ts · blueprint.md',
  defaults: { ground: '#123a63', white: '#f1f7fb', cyan: '#a7d8ec', dim: '#7fbcd8', titleBlock: true, title: '', dimensions: true, balloons: true, scale: '1:2' },

  draw(D, S, K, o) {
    const u = unit(S), env = D.env, W = S.W, H = S.H, sc = env.scale, WH = o.white, CY = o.cyan, DIM = o.dim
    const TP = truePlate(S, K)
    const glowBloom = (ctx, color, a = 0.5) => { ctx.shadowColor = K.rgba(color, a); ctx.shadowBlur = 3.2 * sc } // white on blue blooms

    // ---------------------------------------------------------------- the pen
    // a ruled / freehand pen line that the nib travels along (k), constant width, bloom
    const pen = (pts, w, color = WH, { dash, alpha = 0.95, wob = 0.5, seed = 1, cost } = {}) => {
      if (!pts || pts.length < 2) return
      const c = wob ? K.wobble(pts, wob * u, seed) : pts, len = K.length(c)
      D.mark(cost ?? 0.15 + len / 160, (ctx, k) => {
        const s = K.upTo(c, k); if (s.length < 2) return
        ctx.save(); glowBloom(ctx, color); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
        if (dash) ctx.setLineDash(dash.map((d) => d * u))
        ctx.beginPath(); s.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore()
      })
    }
    // many short ruled strokes, run on one at a time (section lining, shading lines)
    const strokes = (segs, w, color, { alpha = 0.85, cost } = {}) => {
      if (!segs.length) return
      D.mark(cost ?? 0.3 + segs.length * 0.05, (ctx, k) => {
        const n = Math.ceil(segs.length * k)
        ctx.save(); glowBloom(ctx, color, 0.35); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'
        ctx.beginPath(); for (let i = 0; i < n; i++) { const s = segs[i]; ctx.moveTo(s[0][0], s[0][1]); for (let j = 1; j < s.length; j++) ctx.lineTo(s[j][0], s[j][1]) } ctx.stroke(); ctx.restore()
      })
    }
    const CHAIN = [22, 4, 3, 4], HIDDEN = [7, 4], PHANTOM = [24, 4, 3, 4, 3, 4]
    // lining that starts and stops just inside the part
    const lining = (pts, ang, gap, seed) => K.hatchLines(pts, ang, gap, { phase: hash(seed, 1) * gap }).map(([a, b]) => {
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]), r = K.rng(seed + a[0])
      if (d < 4 * u) return null
      const t0 = (0.6 + r() * 1.2) * u / d, t1 = 1 - (0.6 + r() * 1.2) * u / d
      return [K.lerpP(a, b, t0), K.lerpP(a, b, t1)]
    }).filter(Boolean)
    const lettering = (s, x, y, cap, color = WH, { align = 'left', w = Math.max(1, cap * 0.11) } = {}) => {
      s = String(s).toUpperCase(); const sx = cap / 6, adv = cap * 0.93, x0 = align === 'center' ? x - textWidth(s, cap) / 2 : align === 'right' ? x - textWidth(s, cap) : x
      const polys = []
      ;[...s].forEach((ch, i) => strokesOf(ch).forEach((st) => polys.push(st.map(([gx, gy]) => [x0 + i * adv + (gx + (6 - gy) * 0.22) * sx, y + gy * sx]))))
      if (!polys.length) return
      const lens = polys.map((p) => K.length(p)), tot = lens.reduce((a, b) => a + b, 0)
      D.mark(0.2 + tot / 60, (ctx, k) => { // lettering is slow: written stroke by stroke
        let left = tot * k
        ctx.save(); glowBloom(ctx, color, 0.4); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.95; ctx.beginPath()
        for (let i = 0; i < polys.length && left > 0; i++) { const p = left >= lens[i] ? polys[i] : K.upTo(polys[i], left / lens[i]); left -= lens[i]; p.forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py))) }
        ctx.stroke(); ctx.restore()
      })
    }
    const arrow = (tip, ang, size = 10 * u, color = CY) => D.mark(0.05, (ctx) => {
      ctx.save(); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(tip[0] - Math.cos(ang - 0.17) * size, tip[1] - Math.sin(ang - 0.17) * size); ctx.lineTo(tip[0] - Math.cos(ang) * size * 0.82, tip[1] - Math.sin(ang) * size * 0.82); ctx.lineTo(tip[0] - Math.cos(ang + 0.17) * size, tip[1] - Math.sin(ang + 0.17) * size); ctx.closePath(); ctx.fill(); ctx.restore()
    })
    const circle = (cx, cy, r, w, color = WH, a0 = -2.2, n = Math.max(24, Math.round(r * 0.6))) => pen(Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (i / n) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] }), w, color, { wob: 0 }) // a compass does not wobble

    // ---------------------------------------------------------------- what to draw
    const big = S.regions.filter((r) => ['subject', 'detail'].includes(r.role) && r.area > W * H * 0.004)
    const subj = [...big].filter((r) => r.role === 'subject').sort((a, b) => b.area - a.area), main = subj.find((r) => r.form >= 0.5) || subj[0] // the main part: the biggest real body
    const tb = o.titleBlock ? (() => { const w = Math.min(340 * u, W * 0.42), h = 86 * u, x1 = W - 34 * u, y1 = H - 34 * u; return { x0: x1 - w, y0: y1 - h, x1, y1, w, h, pts: [[x1 - w, y1 - h], [x1, y1 - h], [x1, y1], [x1 - w, y1]] } })() : null
    const keepOut = tb ? [tb.pts] : []
    const sheetLayer = (fn) => D.layer({ tooth: 'fine', cut: keepOut }, fn)

    // ---------------------------------------------------------------- the stock (frame 0)
    D.ground(() => D.mark(0.001, (ctx) => {
      const key = `blueprint:sheet:${W}x${H}@${sc}:${o.ground}`
      let c = env.cache.get(key)
      if (!c) {
        c = K.canvas(W * sc, H * sc); const x = c.getContext('2d'); x.setTransform(sc, 0, 0, sc, 0, 0)
        x.fillStyle = o.ground; x.fillRect(0, 0, W, H)
        const g = x.createRadialGradient(W * 0.46, H * 0.4, 60 * u, W * 0.5, H * 0.5, Math.max(W, H) * 0.78) // brighter where the arc lamp stood
        g.addColorStop(0, 'rgba(58,120,178,0.34)'); g.addColorStop(0.55, 'rgba(30,84,140,0.1)'); g.addColorStop(1, 'rgba(4,16,36,0.5)'); x.fillStyle = g; x.fillRect(0, 0, W, H)
        // the blotchy exposure: a coarse noise field, smoothed up
        const q = 4, mw = Math.ceil(W / q), mh = Math.ceil(H / q), m = K.canvas(mw, mh), mx = m.getContext('2d'), img = mx.createImageData(mw, mh)
        for (let j = 0; j < mh; j++) for (let i = 0; i < mw; i++) {
          const v = K.fbm(41, i * q, j * q, 0.006, 4) - 0.5, f = K.fbm(43, i * q, j * q, 0.05, 2) - 0.5, p = (j * mw + i) * 4, lift = v * 1.4 + f * 0.35
          img.data[p] = lift > 0 ? 120 : 0; img.data[p + 1] = lift > 0 ? 190 : 8; img.data[p + 2] = lift > 0 ? 235 : 30; img.data[p + 3] = 255 * Math.min(0.2, Math.abs(lift) * 0.32)
        }
        mx.putImageData(img, 0, 0); x.imageSmoothingEnabled = true; x.drawImage(m, 0, 0, W, H)
        for (const [x0, y0, x1, y1] of [[W * 0.5 + 3, 0, W * 0.5 - 2, H], [0, H * 0.5 - 4, W, H * 0.5 + 2]]) { // two old fold lines
          x.strokeStyle = 'rgba(190,225,245,0.08)'; x.lineWidth = 2.4 * u; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke()
          x.strokeStyle = 'rgba(2,10,26,0.16)'; x.lineWidth = 1 * u; x.beginPath(); x.moveTo(x0 + 1.5 * u, y0); x.lineTo(x1 + 1.5 * u, y1); x.stroke()
        }
        const r = K.rng(77)
        for (let i = 0; i < 260 * (W * H) / 1166400; i++) { x.globalAlpha = 0.1 + r() * 0.3; x.fillStyle = r() < 0.75 ? '#dff1fb' : '#06142c'; x.beginPath(); x.arc(r() * W, r() * H, (0.4 + r() * 1.2) * u, 0, 6.283); x.fill() }
        env.cache.set(key, c)
      }
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(c, 0, 0); ctx.restore()
    }))

    // ---------------------------------------------------------------- 1 border, zones, title-block box
    D.pass('border and title block', 0.7, () => D.layer({ tooth: 'fine' }, () => {
      for (const [m, w] of [[22 * u, 2.6 * u], [34 * u, 1.2 * u]]) {
        const c = [[m, m], [W - m, m], [W - m, H - m], [m, H - m]]
        c.forEach((a, i) => pen([a, c[(i + 1) % 4]], w, WH, { wob: 0.4, seed: 900 + i + m }))
      }
      const zc = 7 * u, ZN = 4
      for (let i = 0; i < ZN; i++) {
        const y = 34 * u + ((H - 68 * u) * (i + 0.5)) / ZN, x = 34 * u + ((W - 68 * u) * (i + 0.5)) / ZN
        lettering('ABCD'[i], 25 * u, y - zc / 2, zc, CY, { w: 1 * u }); lettering(String(i + 1), x, 24.5 * u, zc, CY, { align: 'center', w: 1 * u })
        if (i) { const yy = 34 * u + ((H - 68 * u) * i) / ZN, xx = 34 * u + ((W - 68 * u) * i) / ZN; pen([[22 * u, yy], [34 * u, yy]], 1 * u, CY, { wob: 0 }); pen([[xx, 22 * u], [xx, 34 * u]], 1 * u, CY, { wob: 0 }) }
      }
      if (tb) {
        D.mark(0.05, (ctx) => { ctx.save(); ctx.fillStyle = K.rgba(o.ground, 0.55); ctx.beginPath(); sub(ctx, tb.pts); ctx.fill(); ctx.restore() })
        tb.pts.forEach((a, i) => pen([a, tb.pts[(i + 1) % 4]], 1.6 * u, WH, { wob: 0.3, seed: 950 + i }))
        pen([[tb.x0, tb.y0 + tb.h * 0.56], [tb.x1, tb.y0 + tb.h * 0.56]], 1 * u, WH, { wob: 0.3, seed: 960 })
        pen([[tb.x0 + tb.w * 0.5, tb.y0 + tb.h * 0.56], [tb.x0 + tb.w * 0.5, tb.y1]], 1 * u, WH, { wob: 0.3, seed: 961 })
        pen([[tb.x0 + tb.w * 0.75, tb.y0 + tb.h * 0.56], [tb.x0 + tb.w * 0.75, tb.y1]], 1 * u, WH, { wob: 0.3, seed: 962 })
      }
    }))

    // ---------------------------------------------------------------- 2 construction: datum line, centre lines
    D.pass('construction lines', 0.9, () => sheetLayer(() => {
      for (const g of S.regions.filter((r) => r.role === 'ground')) pen([[34 * u, g.bbox.y0], [W - 34 * u, g.bbox.y0]], 0.8 * u, DIM, { wob: 0.3, seed: g.i, alpha: 0.8 })
      for (const r of big.filter((q) => q.role === 'subject')) {
        const b = r.bbox, ex = 0.1
        pen([[b.cx, b.y0 - b.h * ex], [b.cx, b.y1 + b.h * ex]], 0.75 * u, DIM, { dash: CHAIN, wob: 0, alpha: 0.85 })
        pen([[b.x0 - b.w * ex, b.cy], [b.x1 + b.w * ex, b.cy]], 0.75 * u, DIM, { dash: CHAIN, wob: 0, alpha: 0.85 })
      }
    }))

    // ---------------------------------------------------------------- 3 outlines, the nearest part first; hidden edges dashed
    const outlined = S.regions.filter((r) => (r.contour || r.role === 'glow') && r.role !== 'shadow' && r.role !== 'highlight')
    D.pass('ruling-pen outlines', 3, () => sheetLayer(() => {
      for (const r of [...outlined].reverse()) {
        const occ = S.occluders(r), w = (r.role === 'detail' ? 1.4 : r.role === 'glow' ? 1.3 : 1.8) * u
        D.layer({ cut: occ }, () => pen(r.pts.concat([r.pts[0]]), w, WH, { wob: 0.5, seed: r.i }))
        if (r.role !== 'bg' && r.role !== 'ground') for (const q of S.regions.filter((q) => q.i > r.i && q.role !== 'shadow' && q.role !== 'glow' && q.role !== 'highlight' && q.role !== 'bg' && occ.includes(q.pts)).slice(0, 4))
          D.clip(q.pts, () => pen(r.pts.concat([r.pts[0]]), 0.8 * u, DIM, { dash: HIDDEN, wob: 0, alpha: 0.7, cost: 0.2 }))
      }
      // a wide light line (a glazing bar, a white frame) is ruled as its two edges
      for (const l of S.lines.filter((l) => K.isLight(l.color) && l.w >= 6 * u && l.role !== 'steam')) {
        const c = K.densify(l.pts, 6), nn = K.normals(c)
        for (const s of [1, -1]) D.layer({ cut: S.occluders(l) }, () => pen(c.map((p, i) => [p[0] + nn[i][0] * s * l.w / 2, p[1] + nn[i][1] * s * l.w / 2]), 1.4 * u, WH, { wob: 0.4, seed: l.i * 3 + s }))
      }
    }))

    // ---------------------------------------------------------------- 4 lining, line shading, sciagraphy, glazing
    D.pass('section lining and shading', 2.6, () => sheetLayer(() => {
      let parity = 0
      for (const r of S.regions) {
        const occ = S.occluders(r), lum = K.lum(r.color), b = r.bbox
        if (r.role === 'shadow') { // cast shadow, constructed and hatched the other way
          const gap = K.lerp(7.5, 3.6, r.strength) * u
          D.layer({ cut: occ }, () => { strokes(lining(r.pts, -Math.PI / 4 + 0.08, gap, r.i), 0.8 * u, CY, { alpha: 0.75 }); pen(r.pts.concat([r.pts[0]]), 0.7 * u, DIM, { dash: HIDDEN, wob: 0, alpha: 0.6, cost: 0.2 }) })
          continue
        }
        if (r.role === 'highlight') { D.layer({ cut: occ }, () => pen(r.pts.concat([r.pts[0]]), 0.8 * u, DIM, { dash: [2, 6], wob: 0, alpha: 0.75 })); continue }
        if (r.role === 'glow') { // glass: fine lining plus glazing marks
          D.layer({ cut: occ }, () => {
            strokes(lining(r.pts, Math.PI / 3, 9 * u, r.i), 0.6 * u, WH, { alpha: 0.5 })
            const marks = [], st = Math.max(70 * u, Math.min(b.w, b.h) / 2.5)
            for (const [x, y] of K.gridIn(r.pts, st, 0.5, r.i)) for (let j = -1; j <= 1; j++) marks.push([[x - 9 * u + j * 6 * u, y + 9 * u], [x + 9 * u + j * 6 * u, y - 9 * u]])
            strokes(marks, 1.1 * u, WH, { alpha: 0.9 })
          })
          continue
        }
        const flatPart = r.form <= 0.55 || r.role === 'bg' || r.role === 'ground'
        if (flatPart) {
          if (lum > (r.role === 'bg' ? 0.66 : 0.82)) continue // light stuff stays plain
          const gap = (lum < 0.22 ? 3 : K.lerp(4.5, 15, K.clamp((lum - 0.2) / 0.6))) * u * (r.role === 'bg' ? 1.6 : 1)
          const ang = r.role === 'ground' ? Math.PI / 4 : (parity++ % 2 ? -1 : 1) * Math.PI / 4
          D.layer({ cut: occ }, () => strokes(lining(r.pts, ang, gap, r.i), (r.role === 'bg' ? 0.6 : 0.8) * u, r.role === 'bg' ? DIM : CY, { alpha: r.role === 'bg' ? 0.6 : 0.8 }))
        } else {
          // line shading: lines along the part, crowding toward the shade side; the lit side left bare
          const axis = r.grain ?? Math.PI / 2, ca = Math.cos(axis), sa = Math.sin(axis), nx = -sa, ny = ca // across the axis
          const fine = K.hatchLines(r.pts, axis, 1 * u), byOff = new Map()
          for (const [a, bb] of fine) { const m = Math.round(((a[0] + bb[0]) / 2 * nx + (a[1] + bb[1]) / 2 * ny) / u); if (!byOff.has(m)) byOff.set(m, []); byOff.get(m).push([a, bb]) }
          const keys = [...byOff.keys()].sort((p, q) => p - q), segs = []
          let next = keys[0]
          for (const m of keys) {
            if (m < next) continue
            const s0 = byOff.get(m), mid = s0.reduce((acc, [a, bb]) => [acc[0] + (a[0] + bb[0]) / 2 / s0.length, acc[1] + (a[1] + bb[1]) / 2 / s0.length], [0, 0])
            const t = K.clamp(r.toneAt(mid[0], mid[1]) * 0.75 + TP.tone(mid[0], mid[1]) * 0.25 + (lum - 0.5) * 0.2)
            next = m + K.lerp(2.4, 20, t ** 1.6)
            if (t > 0.88) continue
            for (const [a, bb] of s0) { const d = Math.hypot(bb[0] - a[0], bb[1] - a[1]); if (d > 3 * u) segs.push([K.lerpP(a, bb, 1.2 * u / d), K.lerpP(a, bb, 1 - 1.2 * u / d)]) }
          }
          D.layer({ cut: occ }, () => strokes(segs, 0.85 * u, CY, { alpha: 0.85 }))
        }
      }
    }))

    // ---------------------------------------------------------------- 5 details: line work, phantom steam, centre marks
    D.pass('details', 1.1, () => sheetLayer(() => {
      for (const l of S.lines) {
        if (K.isLight(l.color) && l.w >= 6 * u && l.role !== 'steam') continue
        const light = K.isLight(l.color)
        D.layer({ cut: S.occluders(l) }, () => pen(l.pts, light ? 1.1 * u : Math.max(1 * u, Math.min(1.8 * u, l.w * 0.5)), light ? CY : WH, { dash: light ? PHANTOM : null, wob: light ? 0 : 0.4, seed: l.i }))
      }
      for (const r of big.filter((q) => q.role === 'subject' && q.form > 0.7)) {
        const { cx, cy } = r.bbox, s = 7 * u
        pen([[cx - s, cy], [cx + s, cy]], 0.9 * u, WH, { wob: 0 }); pen([[cx, cy - s], [cx, cy + s]], 0.9 * u, WH, { wob: 0 })
      }
    }))

    // ---------------------------------------------------------------- 6 dimensions and balloons
    D.pass('dimensions and balloons', 1, () => sheetLayer(() => {
      if (o.dimensions && main) {
        const b = main.bbox, gap = 4 * u, ext = 6 * u, mm = (v) => String(Math.round(v * 0.5))
        // width: witness lines, the dimension line, arrows, the figure (read from the bottom of the sheet)
        const below = b.y1 + 46 * u < H - 50 * u, yy = below ? b.y1 + 40 * u : b.y0 - 40 * u, sg = below ? 1 : -1
        pen([[b.x0, (below ? b.y1 : b.y0) + gap * sg], [b.x0, yy + ext * sg]], 0.8 * u, CY, { wob: 0 })
        pen([[b.x1, (below ? b.y1 : b.y0) + gap * sg], [b.x1, yy + ext * sg]], 0.8 * u, CY, { wob: 0 })
        pen([[b.x0, yy], [b.x1, yy]], 0.9 * u, CY, { wob: 0 }); arrow([b.x0, yy], Math.PI); arrow([b.x1, yy], 0)
        lettering(mm(b.w), b.cx, yy - 15 * u, 11 * u, WH, { align: 'center' })
        // height, on the side with room
        const left = b.x0 - 60 * u > 40 * u, xx = left ? b.x0 - 40 * u : b.x1 + 40 * u, sx = left ? -1 : 1
        pen([[(left ? b.x0 : b.x1) + gap * sx, b.y0], [xx + ext * sx, b.y0]], 0.8 * u, CY, { wob: 0 })
        pen([[(left ? b.x0 : b.x1) + gap * sx, b.y1], [xx + ext * sx, b.y1]], 0.8 * u, CY, { wob: 0 })
        pen([[xx, b.y0], [xx, b.y1]], 0.9 * u, CY, { wob: 0 }); arrow([xx, b.y0], -Math.PI / 2); arrow([xx, b.y1], Math.PI / 2)
        lettering(mm(b.h), left ? xx - 8 * u : xx + 8 * u, b.cy - 5.5 * u, 11 * u, WH, { align: left ? 'right' : 'left' })
      }
      if (o.balloons) {
        const seen = new Set(), parts = []
        for (const r of [...big].sort((a, b) => b.area - a.area)) { const nm = r.name.replace(/[^a-z0-9 ]/gi, '').trim(); if (!nm || seen.has(nm) || /^region\d+$/.test(nm)) continue; seen.add(nm); parts.push(r); if (parts.length >= 5) break }
        const placed = []
        parts.forEach((r, i) => {
          const b = r.bbox, c0 = r.centre, dx = b.cx - W / 2, dy = b.cy - H / 2, dl = Math.hypot(dx, dy) || 1, d = dl < 20 ? [-0.7, -0.7] : [dx / dl, dy / dl]
          // the leader starts on the part (the topmost point of it near its centre) and runs out past its edge
          const R = 13 * u, reach = Math.hypot(b.w, b.h) * 0.36 + 30 * u, a0 = Math.atan2(d[1], d[0])
          // swing the balloon round until it is clear of the others, the sheet edge and the title block
          let bx = 0, by = 0
          for (const da of [0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2.2, -2.2, Math.PI]) {
            bx = K.clamp(c0[0] + Math.cos(a0 + da) * reach, 60 * u, W - 60 * u); by = K.clamp(c0[1] + Math.sin(a0 + da) * reach, 60 * u, H - 60 * u)
            const inTb = tb && bx > tb.x0 - R * 2 && bx < tb.x1 + R && by > tb.y0 - R * 2 && by < tb.y1 + R
            if (!inTb && placed.every(([px, py]) => Math.hypot(px - bx, py - by) > R * 3.2)) break
          }
          placed.push([bx, by])
          const anchor = S.regionAt(c0[0], c0[1]) === r ? c0 : K.scatter(r.pts, 1, r.i)[0] || c0, la = Math.atan2(anchor[1] - by, anchor[0] - bx)
          circle(bx, by, R, 1.2 * u, WH)
          lettering(String(i + 1), bx, by - 5 * u, 10 * u, WH, { align: 'center' })
          pen([[bx + Math.cos(la) * R, by + Math.sin(la) * R], anchor], 0.85 * u, CY, { wob: 0 })
          D.mark(0.03, (ctx) => { ctx.save(); ctx.fillStyle = CY; ctx.beginPath(); ctx.arc(anchor[0], anchor[1], 2.4 * u, 0, 6.283); ctx.fill(); ctx.restore() })
        })
      }
    }))

    // ---------------------------------------------------------------- 7 the title block lettered, the title the very last stroke
    D.pass('lettering', 0.8, () => D.layer({ tooth: 'fine' }, () => {
      if (!tb) return
      const title = (o.title || (main ? main.name : '') || 'GENERAL ARRANGEMENT').toUpperCase().replace(/[^A-Z0-9 .:/-]/g, '').trim() || 'GENERAL ARRANGEMENT'
      const capS = 8 * u, rowY = tb.y0 + tb.h * 0.56 + (tb.h * 0.44 - capS) / 2
      lettering('SCALE ' + o.scale, tb.x0 + 8 * u, rowY, capS, CY, { w: 1 * u })
      lettering('DWG DS-' + String(100 + Math.floor(hash(S.W, S.regions.length, S.lines.length) * 900)), tb.x0 + tb.w * 0.5 + 6 * u, rowY, capS, CY, { w: 1 * u })
      lettering('1/1', tb.x0 + tb.w * 0.875, rowY, capS, CY, { w: 1 * u, align: 'center' })
      let cap = 17 * u
      while (textWidth(title, cap) > tb.w - 20 * u && cap > 8 * u) cap -= 1 * u
      lettering(title, tb.x0 + tb.w / 2, tb.y0 + (tb.h * 0.56 - cap) / 2, cap, WH, { align: 'center', w: Math.max(1.2 * u, cap * 0.12) })
    }))

    D.top(() => { D.texture('paper', { opacity: 0.25 }); D.texture('coldpress', { opacity: 0.15 }) })
  },
}

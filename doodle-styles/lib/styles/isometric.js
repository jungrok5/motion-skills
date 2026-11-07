// Isometric — studied from anidoodle's "night bake" cutaway (isometric.ts · isometricKit.ts · styles/isometric.md): flat
// vector planes on a true 2:1 isometric grid (x → (u, u/2), depth → (−u, u/2), up → 1.2247u), exactly three tones per
// material by the cube rule (top lightest, the picture face middle, the side away from the light darkest), crisp edges
// and no contour line, built in construction order. Our scenes are 2D, so the hand reads one as a DIORAMA: the picture
// stands as a relief panel on an iso base platform; every region is a slab extruded toward the viewer (thicker for near
// and round things), stacked in front of whatever it overlaps, sorted back to front. A round thing keeps the cube rule:
// its face is split into three flat zones (shade, face, lit), never a gradient. Light from the right mirrors the view so
// the dark sides always face away from it.
//
// defaults (all overridable by a house style):
//   backdrop   the artboard around the diorama ('auto' = a pale tint of the scene's background)
//   platform   the base platform's material colour
//   slab       thickness of the wall / floor slabs (px of the picture)
//   relief     how far subjects stand out (multiplies every subject slab's thickness)
//   construct  the construction blue of the pen path and the massing boxes
//   warm       the flat warm tint poured from a light source onto the faces around it
import { clipHalf, clipRect, coverage, hull } from './_geo.js'

const ZK = 1.2247

export default {
  id: 'isometric', name: 'Isometric diorama', ko: '아이소메트릭 디오라마',
  medium: 'flat vector planes on a true 2:1 isometric grid, built in a pen-tool program: the picture as a diorama of extruded slabs on a base platform',
  mark: 'the plane: pen-traced outline, then one flat fill; the 2:1 hairline; the flat light shape',
  edge: 'vector-crisp; no contour line — tone meets tone; three tones per material by the cube rule',
  order: ['iso grid', 'massing blocks', 'walls and floors', 'objects', 'light and shadow', 'details'],
  paper: 'a plain artboard with the iso construction grid',
  palette: "the scene's colours, each as three flat tones (top lightest, face, side darkest); light poured as flat warm bands",
  bestFor: '공간/구조 설명 · 미니어처 장면 · 테크/게임 일러스트 · 인포그래픽',
  source: 'anidoodle isometric.ts · isometricKit.ts · styles/isometric.md',
  defaults: { backdrop: 'auto', platform: '#c9b9a0', slab: 22, relief: 1, construct: '#3d7dff', warm: '#ffd88a' },

  draw(D, S, K, o) {
    const W = S.W, H = S.H, L = S.light, flip = L[0] > 0.05
    const backdrop = o.backdrop === 'auto' ? K.mix(K.mix(S.bg, '#f4f1ea', 0.72), '#ffffff', 0.1) : o.backdrop
    const cov = coverage(S, 10)

    // ---- the panel: the picture cropped to its content (bare wall and table around it would only shrink the subject)
    const content = []
    for (const r of S.regions) if (!['bg', 'ground', 'highlight'].includes(r.role)) content.push(r.bbox)
    for (const l of S.lines) if (l.role !== 'bg') content.push(K.bbox(l.pts))
    let cx0 = 0, cy0 = 0, cx1 = W, cy1 = H
    if (content.length) {
      const pad = Math.max(W, H) * 0.06
      cx0 = Math.max(0, Math.min(...content.map((b) => b.x0)) - pad); cx1 = Math.min(W, Math.max(...content.map((b) => b.x1)) + pad)
      cy0 = Math.max(0, Math.min(...content.map((b) => b.y0)) - pad); cy1 = Math.min(H, Math.max(...content.map((b) => b.y1)) + pad * 0.6)
    }
    const cw = cx1 - cx0, ch = cy1 - cy0

    // ---- slabs: thickness by role / depth / form, stacked in front of whatever they overlap (scene order)
    const slabs = [], byRegion = new Map()
    const thick = (r) => r.role === 'bg' || r.role === 'ground' ? o.slab : r.role === 'glow' ? 3 : r.role === 'detail' ? (4 + 7 * r.form) * o.relief : (7 + 22 * r.form * (1 - 0.4 * r.depth)) * o.relief * K.clamp(Math.sqrt(r.area) / 160, 0.45, 1)
    const stackOn = (r) => { let d = 0, u = null; for (const s of slabs) if (s.r.i < r.i && cov.overlap(s.r, r) && s.d1 > d) { d = s.d1; u = s } return [d, u] }
    for (const r of S.regions) {
      if (r.role === 'shadow' || r.role === 'highlight') continue
      const poly = clipRect(r.pts, cx0, cy0, cx1, cy1)
      if (poly.length < 3 || Math.abs(K.area(poly)) < 4) continue
      const [d0] = stackOn(r), s = { r, poly, d0, d1: d0 + thick(r), color: r.role === 'glow' ? K.mix(r.color, r.lit, 0.35) : r.color }
      slabs.push(s); byRegion.set(r, s)
    }
    // light lines thick enough to be built (a window bar) become thin slabs too
    for (const l of S.lines) {
      if (!K.isLight(l.color) || l.w < 6 || l.role === 'steam') continue
      const poly = clipRect(K.tube(l.pts, l.w / 2, l.w / 2, false), cx0, cy0, cx1, cy1)
      if (poly.length < 3) continue
      const lb = K.bbox(poly), mid = K.centroid(poly)
      let d0 = 0; for (const s of slabs) if (s.r.i < l.i && boxHit(s.r.bbox, lb) && K.inside(s.r.pts, mid[0], mid[1])) d0 = Math.max(d0, s.d1)
      slabs.push({ r: { ...l, bbox: lb, role: 'detail', form: 0.2, contour: false }, poly, d0, d1: d0 + 4, color: l.color, line: true })
    }
    const Dmax = Math.max(40, ...slabs.map((s) => s.d1))

    // ---- the projection, fitted to the canvas (light from the right mirrors it)
    const platH = Math.max(18, ch * 0.05), front = Dmax + 46, back = -18
    const std = (x, z, d) => [x - d, (x + d) / 2 - z * ZK]
    const corners = []
    for (const x of [0, cw]) for (const z of [-platH, ch]) for (const d of [back, front]) corners.push(std(x, z, d))
    const cb = K.bbox(corners), u = Math.min((W * 0.9) / cb.w, (H * 0.9) / cb.h)
    const ox = W / 2 - u * cb.cx, oy = H / 2 - u * cb.cy
    const PL = (x, z, d) => { const [a, b] = std(x, z, d), sx = ox + u * a; return [flip ? W - sx : sx, oy + u * b] }
    const P = (X, Y, d) => PL(flip ? cx1 - X : X - cx0, cy1 - Y, d)
    const proj = (poly, d) => poly.map(([X, Y]) => P(X, Y, d))

    // three tones per material (the cube rule)
    const tones = (c) => ({ face: c, top: K.mix(K.adjust(c, { light: 1.16, sat: 0.95 }), '#fff8ea', 0.2), side: K.mix(K.adjust(c, { light: 0.68, hue: -6 }), '#1c2040', 0.14) })

    // ---- each slab's planes: back, the visible side faces (top / side by the cube rule), front
    for (const s of slabs) {
      const t = tones(s.color), poly = s.poly, n = poly.length, sg = K.area(poly) > 0 ? -1 : 1
      s.t = t; s.front = proj(poly, s.d1); s.back = proj(poly, s.d0); s.quads = []
      for (let i = 0; i < n; i++) {
        const a = poly[i], b = poly[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1
        const nX = (sg * -dy) / l, nY = (sg * dx) / l, nx = flip ? -nX : nX, nz = -nY
        if (nx + nz <= 0.02) continue // faces away from the viewer
        s.quads.push({ poly: [P(a[0], a[1], s.d0), P(b[0], b[1], s.d0), P(b[0], b[1], s.d1), P(a[0], a[1], s.d1)], c: nz >= nx ? t.top : t.side })
      }
      s.sil = [s.back, ...s.quads.map((q) => q.poly), s.front]
      s.sb = K.bbox(s.sil.flat())
    }
    slabs.sort((a, b) => a.d0 - b.d0 || a.r.i - b.r.i)
    slabs.forEach((s, j) => (s.k = j))
    // what was painted over a thing lying on slab `under` (or on the backdrop): every slab sorted after it that it meets
    const cutAfter = (k, bb) => { const out = []; for (const s of slabs) if (s.k > k && boxHit(s.sb, bb)) out.push(...s.sil); return out }
    const onTop = (it) => { let d = 0, u0 = null; for (const s of slabs) if (s.r.i < it.i && !s.line && cov.overlap(s.r, it) && s.d1 > d) { d = s.d1; u0 = s } return [d, u0] }

    // ---- marks
    const fillPoly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.strokeStyle = c; K.path(ctx, pts); ctx.fill(); ctx.stroke() }
    const planes = (ctx, s) => { ctx.lineWidth = 0.8; ctx.lineJoin = 'round'; fillPoly(ctx, s.back, s.t.side); for (const q of s.quads) fillPoly(ctx, q.poly, q.c); fillPoly(ctx, s.front, s.t.face) }
    // a plane being made: the pen traces its outline (kept inside the plane), then the fill sweeps down from the top
    const make = (s) => D.mark(0.5 + K.length(s.front, true) / 260, (ctx, k) => {
      ctx.save()
      if (k >= 1) { planes(ctx, s); ctx.restore(); return }
      const pe = K.clamp(k / 0.45), pf = K.clamp((k - 0.45) / 0.55), b = s.sb
      if (pf > 0) { ctx.save(); ctx.beginPath(); ctx.rect(b.x0 - 2, b.y0 - 2, b.w + 4, (b.h + 4) * pf); ctx.clip(); planes(ctx, s); ctx.restore() }
      ctx.beginPath(); K.path(ctx, s.front); ctx.clip()
      ctx.strokeStyle = o.construct; ctx.lineWidth = 3; K.path(ctx, K.upTo([...s.front, s.front[0]], pe), false); ctx.stroke()
      ctx.restore()
    })
    const flat = (pts, c, { alpha = 1, blend } = {}) => D.mark(0.3 + K.length(pts, true) / 400, (ctx, k) => {
      ctx.save(); ctx.globalAlpha = alpha; if (blend) ctx.globalCompositeOperation = blend
      if (k < 1) { const b = K.bbox(pts); ctx.beginPath(); ctx.rect(b.x0 - 1, b.y0 - 1, b.w + 2, (b.h + 2) * k); ctx.clip() }
      ctx.fillStyle = c; K.path(ctx, pts); ctx.fill(); ctx.restore()
    })
    const hair = (pts, c, w = 1.2, alpha = 1) => D.line(pts, { w, color: c, alpha, cap: 'butt', cost: 0.5 })

    D.ground(() => D.sheet(backdrop))

    D.pass('iso grid', 0.8, () => {
      // the 2:1 construction grid ruled across the artboard, lined up with the platform
      const g = 46 * u, [gx, gy] = PL(0, -platH, back), segs = []
      for (let i = -60; i <= 60; i++) {
        const y0 = gy + i * g // lines y = y0 ± 0.5 (x − gx)
        segs.push([[gx - W * 2, y0 - W], [gx + W * 2, y0 + W]], [[gx - W * 2, y0 + W], [gx + W * 2, y0 - W]])
      }
      const col = K.mix(backdrop, '#3a4466', 0.12)
      D.mark(1, (ctx, k) => {
        const n = Math.ceil(segs.length * k)
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath()
        for (let i = 0; i < n; i++) { ctx.moveTo(segs[i][0][0], segs[i][0][1]); ctx.lineTo(segs[i][1][0], segs[i][1][1]) }
        ctx.stroke(); ctx.restore()
      })
    })

    D.pass('massing blocks', 1, () => {
      // translucent construction boxes, clipped inside each plane so none of them survives
      for (const s of slabs) {
        const b = K.bbox(s.poly), box = []
        for (const X of [b.x0, b.x1]) for (const Y of [b.y0, b.y1]) for (const d of [s.d0, s.d1]) box.push(P(X, Y, d))
        const hx = hull(box)
        D.clip(s.front, () => D.mark(0.25, (ctx, k) => {
          ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = o.construct; K.path(ctx, hx); ctx.fill()
          ctx.globalAlpha = 0.55; ctx.strokeStyle = o.construct; ctx.lineWidth = 1; K.path(ctx, K.upTo([...hx, hx[0]], k), false); ctx.stroke(); ctx.restore()
        }))
      }
    })

    const isStruct = (s) => s.r.role === 'bg' || s.r.role === 'ground'
    D.pass('walls and floors', 1.6, () => {
      // the base platform: top, front face, side face — then the wall and floor slabs
      const pt = tones(o.platform)
      const top = [PL(0, 0, back), PL(cw, 0, back), PL(cw, 0, front), PL(0, 0, front)]
      const fr = [PL(0, 0, front), PL(cw, 0, front), PL(cw, -platH, front), PL(0, -platH, front)]
      const sd = [PL(cw, 0, back), PL(cw, 0, front), PL(cw, -platH, front), PL(cw, -platH, back)]
      make({ front: top, back: top, quads: [{ poly: fr, c: pt.face }, { poly: sd, c: pt.side }], t: { face: pt.top, side: pt.side }, sb: K.bbox([...top, ...fr, ...sd]) })
      for (const s of slabs) if (isStruct(s)) make(s)
    })
    D.pass('objects', 3, () => { for (const s of slabs) if (!isStruct(s)) make(s) })

    D.pass('light and shadow', 2, () => {
      // cast shadows: single flat shapes on the face they fall on
      for (const r of S.regions.filter((q) => q.role === 'shadow')) {
        const poly = clipRect(r.pts, cx0, cy0, cx1, cy1); if (poly.length < 3) continue
        const [d, u0] = onTop(r), pts = proj(poly, d)
        D.layer({ cut: cutAfter(u0 ? u0.k : -1, K.bbox(pts)) }, () => flat(pts, K.mix('#ffffff', K.mix(r.color, '#2a2f55', 0.5), 0.35 + 0.35 * r.strength), { blend: 'multiply' }))
      }
      // round things keep the cube rule: the face split into three flat zones
      for (const s of slabs) {
        const r = s.r; if (isStruct(s) || s.line || r.role === 'glow' || r.form < 0.45 || r.area < 1500) continue
        const b = r.bbox, hw = b.w / 2 || 1, hh = b.h / 2 || 1, c0 = L[0] * b.cx / hw + L[1] * b.cy / hh
        const dark = clipHalf(s.poly, -L[0] / hw, -L[1] / hh, 0.28 - c0), lit = clipHalf(s.poly, L[0] / hw, L[1] / hh, 0.62 + c0)
        const cut = cutAfter(s.k, s.sb)
        D.layer({ cut, mask: s.front }, () => {
          if (dark.length > 2) flat(proj(dark, s.d1), s.t.side)
          if (lit.length > 2 && r.form > 0.6) flat(proj(lit, s.d1), s.t.top)
        })
      }
      // light falling on a surface: one flat light shape
      for (const r of S.regions.filter((q) => q.role === 'highlight')) {
        const poly = clipRect(r.pts, cx0, cy0, cx1, cy1); if (poly.length < 3) continue
        const [d, u0] = onTop(r), pts = proj(poly, d)
        D.layer({ cut: cutAfter(u0 ? u0.k : -1, K.bbox(pts)) }, () => flat(pts, K.mix(r.color, '#ffffff', 0.35), { alpha: 0.55 }))
      }
      // a light source pours one flat warm tint, stepped in three distance bands, on the faces around it
      for (const s of slabs.filter((q) => q.r.role === 'glow')) {
        const base = K.densify(s.poly, 12, true), cut = [s.front, ...slabs.filter((q) => q.k > s.k && q.r.i > s.r.i && q.d0 < s.d1 + 1 && boxHit(q.sb, s.sb)).map((q) => q.front)]
        D.layer({ cut }, () => { for (const [dd, a] of [[220, 0.1], [130, 0.1], [60, 0.12]]) flat(proj(K.offset(base, dd), s.d1), o.warm, { alpha: a }) })
      }
      // light lines (steam) float in front as flat pale shapes
      for (const l of S.lines) {
        if (!K.isLight(l.color) || (l.w >= 6 && l.role !== 'steam')) continue
        // it rises from the nearest standing thing (a spout, a cup), at that thing's depth
        const [x0, y0] = l.pts[0]; let d = 0, best = Infinity
        for (const s of slabs) {
          if (s.line || isStruct(s)) continue
          const b = s.r.bbox, dd = Math.hypot(Math.max(b.x0 - x0, 0, x0 - b.x1), Math.max(b.y0 - y0, 0, y0 - b.y1))
          if (dd < best - 1 || (Math.abs(dd - best) <= 1 && s.d1 > d)) { best = dd; d = s.d1 }
        }
        const pts = proj(K.tube(l.pts, Math.max(2.5, l.w / 2), Math.max(1.2, l.w / 5), false), d)
        flat(pts, K.mix(l.color, '#ffffff', 0.3), { alpha: 0.95 })
      }
    })

    D.pass('details', 1.4, () => {
      // dark lines as 2:1 hairlines on the faces they lie on
      for (const l of S.lines) {
        if (K.isLight(l.color)) continue
        let under = null
        const pts = K.densify(l.pts, 10).filter(([X, Y]) => X >= cx0 && X <= cx1 && Y >= cy0 && Y <= cy1).map(([X, Y]) => {
          let d = 0, us = null
          for (const s of slabs) if (!s.line && s.r.i < l.i && s.d1 > d && K.inside(s.r.pts, X, Y)) { d = s.d1; us = s }
          if (us && (!under || us.k > under.k)) under = us
          return P(X, Y, d)
        })
        if (pts.length < 2) continue
        D.layer({ cut: cutAfter(under ? under.k : -1, K.bbox(pts)) }, () => hair(pts, K.mix(l.color, '#1c2040', 0.2), Math.max(1.2, Math.min(3, l.w * 0.6 * u))))
      }
      // sparse texture as more planes and hairlines: plank lines on floors, a speckle on walls
      for (const s of slabs) {
        if (!isStruct(s)) continue
        const cut = cutAfter(s.k, s.sb)
        if (s.r.role === 'ground') {
          const ls = K.hatchLines(s.poly, s.r.grain ?? 0, 42).map(([a, b]) => [P(a[0], a[1], s.d1), P(b[0], b[1], s.d1)])
          D.layer({ cut, mask: s.front }, () => { for (const seg of ls) hair(seg, s.t.side, 1.1, 0.5) })
        } else {
          const dots = K.scatter(s.poly, Math.min(160, Math.round(Math.abs(K.area(s.poly)) / 7000)), s.r.i + 5).map(([X, Y]) => { const [x, y] = P(X, Y, s.d1); return [x, y, 1.6] })
          D.layer({ cut, mask: s.front }, () => D.dots(dots, s.t.side, { alpha: 0.35 }))
        }
      }
      // tile joints on the platform top
      const joints = []
      for (let x = 0; x <= cw; x += 60) joints.push([PL(x, 0, back), PL(x, 0, front)])
      for (let d = back; d <= front; d += 30) joints.push([PL(0, 0, d), PL(cw, 0, d)])
      const pt = tones(o.platform)
      D.layer({ cut: cutAfter(-1, K.bbox(joints.flat())) }, () => { for (const j of joints) hair(j, pt.face, 1, 0.6) })
    })
  },
}
const boxHit = (A, B) => !(A.x0 > B.x1 || B.x0 > A.x1 || A.y0 > B.y1 || B.y0 > A.y1)

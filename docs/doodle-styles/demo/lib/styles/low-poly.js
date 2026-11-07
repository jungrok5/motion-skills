// Low-poly — studied from anidoodle's mountain-lake plate (lowPoly.ts · styles/lowPoly.md): triangle meshes, each facet
// one flat colour from its normal against ONE low sun, drawn by painter's sort far to near; no 3D engine, no line, no
// gradient, no texture — the triangulation is the texture. Re-implemented for the scene: every region is triangulated
// (Delaunay of edge samples + a jittered interior grid, finer on round and subject regions) and lifted into a
// pseudo-height field (a dome by its `form`, plus a little noise), so each facet tilts and catches the light.
//
// defaults (all overridable by a house style):
//   viewport  the empty modelling viewport the mesh is built on
//   wire      the wireframe colour seen before the faces shade in
//   facet     facet size in px for big flat regions (subjects get finer facets automatically)
//   relief    how strongly a facet's tilt changes its colour (0 = smooth flat shading, 1 = strong facets)
//   sun       height of the sun (0 = grazing, 1 = overhead)
//   haze      far things lean toward this colour by their depth (the dawn haze)
import { mesh } from './_geo.js'

export default {
  id: 'low-poly', name: 'Low-poly', ko: '로우폴리',
  medium: 'triangle meshes lifted into a height field, each facet flat-shaded by its normal against one low sun; no 3D engine',
  mark: 'the facet: a hard-edged triangle of one flat colour',
  edge: 'crisp facet seams; no contour line, no gradient — the triangulation is the only texture',
  order: ['wireframe', 'faces, far to near', 'light facets'],
  paper: 'the empty modelling viewport (a dark grid)',
  palette: "the subject's own colours, lit warm toward the sun and cool away from it, hazed with distance",
  bestFor: '게임/테크 느낌 · 풍경, 과일, 동물 · 기하학적인 포스터',
  source: 'anidoodle lowPoly.ts · styles/lowPoly.md',
  defaults: { viewport: '#1b1f27', wire: '#7fd1ff', facet: 64, relief: 0.75, sun: 0.55, haze: '#cfd3e6' },

  draw(D, S, K, o) {
    const L = S.light, sunZ = K.clamp(o.sun, 0.05, 0.98), lx = L[0] * Math.sqrt(1 - sunZ * sunZ), ly = L[1] * Math.sqrt(1 - sunZ * sunZ)
    const solid = S.solid
    // the region a point of a shadow / highlight falls on: the last solid region painted before it there
    const under = (it, x, y) => { for (let j = solid.length - 1; j >= 0; j--) { const q = solid[j]; if (q.i < it.i && K.inside(q.pts, x, y)) return q } return null }

    // ---- every region as a mesh of facets
    const facetsOf = (r) => {
      const b = r.bbox, size = Math.min(b.w, b.h), big = r.role === 'bg' || r.role === 'ground'
      const step = K.clamp(big ? o.facet : Math.max(14, Math.min(o.facet * 0.75, size / (3.2 + 3 * r.form))), 10, 160)
      const m = mesh(r.pts, step, r.i * 17 + 3)
      const hs = size * 0.5 * (0.15 + 0.9 * r.form), seed = r.i * 31 + 7
      const H = (x, y) => {
        const u = (x - b.cx) / (b.w / 2 || 1), v = (y - b.cy) / (b.h / 2 || 1), d = Math.max(0, 1 - u * u - v * v)
        return hs * Math.sqrt(d) * r.form + (K.fbm(seed, x, y, 1 / (step * 2.2), 2) - 0.5) * step * (big ? 0.9 : 0.55)
      }
      const hz = m.pts.map(([x, y]) => H(x, y))
      return m.tris.map(([a, c, e]) => {
        const p = m.pts[a], q = m.pts[c], s = m.pts[e], cx = (p[0] + q[0] + s[0]) / 3, cy = (p[1] + q[1] + s[1]) / 3
        // the facet's normal from its three heights
        const ux = q[0] - p[0], uy = q[1] - p[1], uz = hz[c] - hz[a], vx = s[0] - p[0], vy = s[1] - p[1], vz = hz[e] - hz[a]
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
        if (nz < 0) { nx = -nx; ny = -ny; nz = -nz }
        const nl = Math.hypot(nx, ny, nz) || 1, diff = (nx * lx + ny * ly + nz * sunZ) / nl
        return { tri: [p, q, s], c: [cx, cy], diff }
      })
    }
    const shadeFacet = (r, f, rr) => {
      // a light source only varies toward its own light: a lamp or a window has no dark facets
      if (r.role === 'glow') return K.mix(r.color, r.lit, K.clamp(0.35 + (f.diff - sunZ) * 1.5 * o.relief + (rr() - 0.5) * 0.2))
      let col = r.colorAt(f.c[0], f.c[1])
      const big = r.role === 'bg' || r.role === 'ground'
      const v = (f.diff - sunZ) * 2.2 * o.relief * (big ? 0.75 : 1) + (rr() - 0.5) * 0.08
      col = v > 0 ? K.mix(col, r.lit, K.clamp(v)) : K.mix(col, K.mix(r.shade, '#2c2f55', 0.25), K.clamp(-v))
      return K.mix(col, o.haze, Math.max(0, r.depth - 0.6) * 0.35)
    }
    const items = []
    for (const it of S.items) {
      if (it.kind === 'line') {
        // a line is a strip of thin facets along its length, two tones alternating as it twists
        const light = K.isLight(it.color), w = Math.max(light ? 5 : 2.5, it.w), c = K.densify(it.pts, Math.max(8, w * 2.2)), nn = K.normals(c)
        const tris = [], base = light ? K.mix(it.color, '#ffffff', 0.3) : it.color
        for (let j = 0; j + 1 < c.length; j++) {
          const t0 = j / (c.length - 1), t1 = (j + 1) / (c.length - 1), w0 = (w / 2) * (light ? 1 - 0.6 * t0 : 1), w1 = (w / 2) * (light ? 1 - 0.6 * t1 : 1)
          const a = [c[j][0] + nn[j][0] * w0, c[j][1] + nn[j][1] * w0], b = [c[j][0] - nn[j][0] * w0, c[j][1] - nn[j][1] * w0]
          const d = [c[j + 1][0] + nn[j + 1][0] * w1, c[j + 1][1] + nn[j + 1][1] * w1], e = [c[j + 1][0] - nn[j + 1][0] * w1, c[j + 1][1] - nn[j + 1][1] * w1]
          tris.push({ tri: [a, b, d], col: K.mix(base, light ? '#ffffff' : '#000000', 0.1) }, { tri: [b, e, d], col: K.mix(base, light ? '#c9cfe0' : '#ffffff', light ? 0.25 : 0.08) })
        }
        items.push({ it, tris, light, cut: S.occluders(it, { light: false }) })
        continue
      }
      const rr = K.rng(it.i * 13 + 1), fs = facetsOf(it)
      let tris
      if (it.role === 'shadow') {
        // a cast shadow: the facets of what lies beneath, darkened toward the shadow's tint
        tris = fs.map((f) => { const u = under(it, f.c[0], f.c[1]), base = u ? shadeFacet(u, f, rr) : S.bg; return { tri: f.tri, col: K.mix(K.mix(base, '#000000', 0.25 + 0.4 * it.strength), it.color, 0.2) } })
      } else if (it.role === 'highlight') {
        tris = fs.map((f) => { const u = under(it, f.c[0], f.c[1]), base = u ? shadeFacet(u, f, rr) : S.bg; return { tri: f.tri, col: K.mix(base, K.mix(it.color, '#ffffff', 0.3), 0.35 + 0.25 * K.clamp(f.diff)) } })
      } else tris = fs.map((f) => ({ tri: f.tri, col: shadeFacet(it, f, rr) }))
      // faces shade in top-down within a region (painter's order across regions is the scene's own)
      tris.sort((a, b) => (a.tri[0][1] + a.tri[1][1] + a.tri[2][1]) - (b.tri[0][1] + b.tri[1][1] + b.tri[2][1]))
      items.push({ it, tris, light: it.role === 'highlight' || it.role === 'glow', cut: ['shadow', 'highlight', 'glow'].includes(it.role) ? S.occluders(it, { light: false }) : null })
    }

    const facets = (tris, ctx, n) => {
      for (let j = 0; j < n; j++) {
        const { tri: [a, b, c], col } = tris[j]
        ctx.fillStyle = col; ctx.strokeStyle = col
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.closePath(); ctx.fill(); ctx.stroke() // a same-colour hairline closes the antialias seam
      }
    }
    const faceMark = (x) => D.mark(0.4 + x.tris.length * 0.03, (ctx, k) => { ctx.save(); ctx.lineWidth = 0.9; ctx.lineJoin = 'round'; facets(x.tris, ctx, Math.ceil(x.tris.length * k)); ctx.restore() })

    // the empty viewport: a dark modelling grid
    D.ground(() => {
      D.sheet(o.viewport)
      D.mark(0.001, (ctx) => {
        ctx.save(); ctx.strokeStyle = K.mix(o.viewport, '#ffffff', 0.07); ctx.lineWidth = 1
        for (let x = 0; x <= S.W; x += 40) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, S.H); ctx.stroke() }
        for (let y = 0; y <= S.H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(S.W, y + 0.5); ctx.stroke() }
        ctx.restore()
      })
    })

    D.pass('wireframe', 2, () => {
      // edge by edge, far to near: each mesh swept top-down
      for (const x of items) {
        if (x.it.role === 'shadow' || x.it.role === 'highlight' || x.it.kind === 'line') continue
        const edges = [], seen = new Set()
        for (const { tri } of x.tris) for (let j = 0; j < 3; j++) {
          const a = tri[j], b = tri[(j + 1) % 3], key = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? `${a}|${b}` : `${b}|${a}`
          if (!seen.has(key)) { seen.add(key); edges.push([a, b]) }
        }
        edges.sort((p, q) => Math.min(p[0][1], p[1][1]) - Math.min(q[0][1], q[1][1]))
        D.mark(0.3 + edges.length * 0.012, (ctx, k) => {
          const n = Math.ceil(edges.length * k)
          ctx.save(); ctx.strokeStyle = o.wire; ctx.globalAlpha = 0.75; ctx.lineWidth = 1; ctx.beginPath()
          for (let j = 0; j < n; j++) { ctx.moveTo(edges[j][0][0], edges[j][0][1]); ctx.lineTo(edges[j][1][0], edges[j][1][1]) }
          ctx.stroke(); ctx.restore()
        })
      }
    })
    D.pass('faces, far to near', 5, () => {
      for (const x of items) {
        if (x.light || x.it.kind === 'line' && K.isLight(x.it.color)) continue
        if (x.cut && x.cut.length) D.layer({ cut: x.cut }, () => faceMark(x)); else faceMark(x)
      }
    })
    D.pass('light facets', 1.4, () => {
      // the light: the source's bright facets, light falling on surfaces, light lines (steam) as pale strips
      for (const x of items) {
        if (!(x.light || (x.it.kind === 'line' && K.isLight(x.it.color)))) continue
        const cut = x.cut
        if (x.it.role === 'highlight') D.layer({ cut, alpha: 0.85 }, () => faceMark(x))
        else if (cut && cut.length) D.layer({ cut }, () => faceMark(x))
        else faceMark(x)
      }
    })
  },
}

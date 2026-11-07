// Isometric — studied from anidoodle's "night bake" cutaway (isometric.ts · isometricKit.ts · styles/isometric.md): flat
// vector planes on a true 2:1 isometric grid (x → (u, u/2), depth → (−u, u/2), up → 1.2247u), exactly three tones per
// material by the cube rule (top lightest, the face toward the light middle, the side away from it darkest), crisp edges,
// no contour line, built in construction order. Our scenes are 2D, so the hand rebuilds one as a ROOM CUTAWAY:
//   bg      → the back wall (plus a side wall: a corner room), cut open at the top; windows and lamps (glow) sit on it
//   ground  → the floor / table top: a horizontal 2:1 diamond with a visible cut edge (the slab's thickness)
//   things  → upright objects standing ON the floor: placed in depth by their base (lower in the picture = nearer),
//             their 2D silhouette as the front face, extruded back by a depth from their width and roundness;
//             parts (a lid, a spout, a calyx, a knob, a handle) ride on their parent's front face
//   flat things on the table (a dish, a mat, a fallen leaf) lie on the floor plane as thin slabs
//   shadow  → flat shapes on the floor; light lines (steam) stay above their object
// Round things keep the cube rule: the face is split into three flat zones, never a gradient. Light from the right
// mirrors the whole room, so the dark sides always face away from it.
//
// defaults (all overridable by a house style):
//   backdrop   the artboard around the room ('auto' = a pale tint of the scene's background)
//   walls      2 = a corner room (back + side wall), 1 = back wall only
//   depth      how far the table runs back: picture px below the horizon → floor depth
//   bulk       how deep objects are, as a share of their width (×, rounder things deeper)
//   slab       thickness of the floor and the walls at the cut
//   construct  the construction blue of the pen path and the massing boxes
//   warm       the flat warm tint a light source pours on the wall around it
import { clipHalf, clipRect, coverage, hull } from './_geo.js'

const ZK = 1.2247

export default {
  id: 'isometric', name: 'Isometric cutaway', ko: '아이소메트릭 컷어웨이',
  medium: 'flat vector planes on a true 2:1 isometric grid, built in a pen-tool program: the scene rebuilt as a cutaway room — walls, a floor slab, upright objects',
  mark: 'the plane: pen-traced outline, then one flat fill; the 2:1 hairline; the flat light shape',
  edge: 'vector-crisp; no contour line — tone meets tone; three tones per material by the cube rule',
  order: ['iso grid', 'massing blocks', 'walls and floor', 'objects', 'light and shadow', 'details'],
  paper: 'a plain artboard with the iso construction grid',
  palette: "the scene's colours, each as three flat tones (top lightest, face, side darkest); light poured as flat warm bands",
  bestFor: '공간/구조 설명 · 미니어처 방/가게 · 테크/게임 일러스트 · 인포그래픽',
  source: 'anidoodle isometric.ts · isometricKit.ts · styles/isometric.md',
  defaults: { backdrop: 'auto', walls: 2, depth: 1.3, bulk: 1, slab: 24, construct: '#3d7dff', warm: '#ffd88a' },

  draw(D, S, K, o) {
    const W = S.W, H = S.H, L = S.light, flip = L[0] > 0.05, ds = o.depth
    const backdrop = o.backdrop === 'auto' ? K.mix(K.mix(S.bg, '#f4f1ea', 0.72), '#ffffff', 0.1) : o.backdrop
    const cov = coverage(S, 10), R = S.regions
    const bgR = R.find((r) => r.role === 'bg'), grounds = R.filter((r) => r.role === 'ground'), groundR = grounds[0]
    const things = R.filter((r) => !['bg', 'ground', 'shadow', 'highlight', 'glow'].includes(r.role))
    const yH = grounds.length ? Math.min(...grounds.map((r) => r.bbox.y0)) : Math.max(S.H * 0.6, ...things.map((r) => r.bbox.y1))

    // ---- what each region becomes
    const kind = new Map()
    for (const r of R) {
      let k
      if (r === bgR) k = 'wallFace'
      else if (r === groundR) k = 'floorFace'
      else if (r.role === 'shadow') k = 'shadow'
      else if (r.role === 'highlight') k = r.centre[1] < yH ? 'wallLight' : 'floorLight'
      else if (r.role === 'glow' || r.role === 'bg' || (r.depth >= 0.8 && r.centre[1] < yH)) k = 'wall'
      else if (r.role === 'ground' || (r.role !== 'detail' && r.bbox.y0 >= yH - 2 && r.form < 0.5)) k = 'flat'
      else if (r.role === 'detail') k = 'detail'
      else k = 'upright'
      kind.set(r, k)
    }
    // parents: a detail rides on the nearest earlier thing it overlaps; a small upright whose foot sits on a bigger one rides on it
    const parent = new Map()
    for (const r of R) if (kind.get(r) === 'detail') {
      const touch = (q) => cov.overlap(q, r) || boxHit(q.bbox, { x0: r.bbox.x0 - 12, y0: r.bbox.y0 - 12, x1: r.bbox.x1 + 12, y1: r.bbox.y1 + 12 })
      const cands = R.filter((q) => q !== r && ['upright', 'flat'].includes(kind.get(q)) && touch(q))
      const before = cands.filter((q) => q.i < r.i)
      const p = before.length ? before[before.length - 1] : cands[0]
      if (p) parent.set(r, p); else kind.set(r, 'upright')
    }
    for (const r of R) if (kind.get(r) === 'upright') {
      let best = null
      for (const q of R) {
        if (q === r || kind.get(q) !== 'upright' || r.area >= 0.45 * q.area) continue
        const foot = K.inside(q.pts, r.bbox.cx, r.bbox.y1 - 2), hang = cov.overlap(q, r) && r.bbox.y1 < q.bbox.y1 - 0.1 * q.bbox.h
        if ((foot || hang) && (!best || q.area > best.area)) best = q
      }
      if (best) parent.set(r, best)
    }
    const rootOf = (r) => { let p = r; for (let n = 0; n < 20 && parent.has(p); n++) p = parent.get(p); return p }
    for (const r of R) if (kind.get(r) === 'detail' && kind.get(rootOf(r)) === 'flat') kind.set(r, 'flat')

    // ---- the room's extent (cropped to its content, so the subject fills the picture)
    const xs = [], tops = [], lows = []
    for (const r of R) {
      const k = kind.get(r); if (['wallFace', 'floorFace', 'wallLight', 'floorLight'].includes(k)) continue
      xs.push(r.bbox.x0, r.bbox.x1)
      if (k === 'wall' || k === 'upright' || k === 'detail') tops.push(r.bbox.y0)
      if (k === 'flat' || k === 'shadow' || k === 'upright') lows.push(r.bbox.y1)
    }
    for (const l of S.lines) { const b = K.bbox(l.pts); if (K.isLight(l.color) && l.depth < 0.8) { tops.push(b.y0); xs.push(b.x0, b.x1) } }
    if (!xs.length) xs.push(0, W)
    const pad = Math.max(W, H) * 0.04
    const xL = Math.max(-W * 0.1, Math.min(...xs) - pad), xR = Math.min(W * 1.1, Math.max(...xs) + pad), Wx = xR - xL
    const wallH = Math.max(Wx * 0.42, yH - Math.min(yH - 50, ...tops) + pad)
    const Dp = Math.max(120, (Math.max(yH + 60, ...lows) - yH + pad) * ds)
    const X_ = (X) => (flip ? xR - X : X - xL)
    const fy = (Y) => K.clamp((Y - yH) * ds, 2, Dp - 2)

    // ---- three tones per material (the cube rule)
    const tones = (c) => ({ face: c, top: K.mix(K.adjust(c, { light: 1.15, sat: 0.95 }), '#fff8ea', 0.18), side: K.mix(K.adjust(c, { light: 0.68, hue: -6 }), '#1c2040', 0.14) })
    const wallC = bgR ? bgR.color : S.bg, floorC = groundR ? groundR.color : K.mix(wallC, '#3a3030', 0.35)

    // ---- solids: world-space planes [x, y, z]; y runs toward the viewer, z up
    const solids = []
    // an outline in the (x, z) plane, front at y = yF, extruded back by T: visible sides face up (+z) or right (+x)
    const prism = (wp, yF, T, t) => {
      const sg = K.area(wp) > 0 ? -1 : 1, n = wp.length, quads = []
      for (let i = 0; i < n; i++) {
        const a = wp[i], b = wp[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1
        const nx = (sg * -dz) / l, nz = (sg * dx) / l
        if (nx + nz <= 0.02) continue
        quads.push({ pts: [[a[0], yF - T, a[1]], [b[0], yF - T, b[1]], [b[0], yF, b[1]], [a[0], yF, a[1]]], c: nz >= nx ? t.top : t.side, key: (a[0] + b[0]) / 2 - (a[1] + b[1]) })
      }
      quads.sort((p, q) => p.key - q.key)
      return { back: wp.map(([x, z]) => [x, yF - T, z]), quads, front: wp.map(([x, z]) => [x, yF, z]), c: t.face, backC: t.side }
    }
    // an outline in the (x, y) floor plane, a slab from z0 up to z1: visible sides face +y (face tone) or +x (side tone)
    const slab = (wp, z0, z1, t) => {
      const sg = K.area(wp) > 0 ? -1 : 1, n = wp.length, quads = []
      for (let i = 0; i < n; i++) {
        const a = wp[i], b = wp[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1
        const nx = (sg * -dy) / l, ny = (sg * dx) / l
        if (nx + ny <= 0.02) continue
        quads.push({ pts: [[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], c: ny >= nx ? t.face : t.side })
      }
      return { back: wp.map(([x, y]) => [x, y, z0]), quads, front: wp.map(([x, y]) => [x, y, z1]), c: t.top, backC: t.side }
    }
    const add = (s, extra) => { Object.assign(s, extra); solids.push(s); return s }
    const box = (x0, x1, y0, y1, z0, z1, t, pass) => add(slab([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z0, z1, t), { pass, kind: 'struct' })

    // walls and floor: a corner room cut open; the floor slab's cut edge shows its thickness
    const wt = o.slab * 0.7, tw = tones(wallC), tf = tones(floorC)
    const floor = box(-wt, Wx, -wt, Dp, -o.slab, 0, tf, 'walls')
    const backWall = add(prism([[-wt, 0], [Wx, 0], [Wx, wallH], [-wt, wallH]], 0, wt, { top: tw.top, side: tw.side }), { pass: 'walls', kind: 'struct', c: tw.face, face: true })
    let sideWall = null
    if (o.walls >= 2) sideWall = add(slab([[-wt, -wt], [0, -wt], [0, Dp], [-wt, Dp]], 0, wallH, { top: tw.top, face: tw.face, side: tw.side }), { pass: 'walls', kind: 'struct' })

    // wall items: windows, frames, lamps — thin reliefs on the back wall, stacked on what they overlap
    const wallDepth = new Map()
    const wallPoly = (pts) => clipRect(pts.map(([X, Y]) => [X_(X), yH - Y]), 0, 0, Wx, wallH)
    for (const r of R) {
      if (kind.get(r) !== 'wall') continue
      let d0 = 0; for (const [q, d] of wallDepth) if (cov.overlap(q, r)) d0 = Math.max(d0, d)
      const t = r.role === 'glow' ? 2 : r.form < 0.05 ? 2 : 6, wp = wallPoly(r.pts)
      wallDepth.set(r, d0 + t)
      if (wp.length < 3) continue
      const c = r.role === 'glow' ? K.mix(r.color, r.lit, 0.35) : r.color
      add(prism(wp, d0 + t, t, tones(c)), { pass: 'walls', kind: 'wall', r })
    }
    for (const l of S.lines) {
      if (!(K.isLight(l.color) && l.w >= 6 && l.depth >= 0.8)) continue
      const wp = wallPoly(K.tube(l.pts, l.w / 2, l.w / 2, false)); if (wp.length < 3) continue
      const mid = K.centroid(l.pts); let d0 = 0
      for (const [q, d] of wallDepth) if (K.inside(q.pts, mid[0], mid[1])) d0 = Math.max(d0, d)
      add(prism(wp, d0 + 3, 3, tones(l.color)), { pass: 'walls', kind: 'wall', line: l })
    }

    // flats on the floor: thin slabs stacked on whatever flat lies under them
    const flats = []
    const flatTop = (X, Y, before = Infinity) => { let z = 0, f0 = null; for (const f of flats) if (f.r.i < before && f.z1 > z && K.inside(f.r.pts, X, Y)) { z = f.z1; f0 = f } return [z, f0] }
    for (const r of R) {
      if (kind.get(r) !== 'flat') continue
      const wp = clipRect(r.pts.map(([X, Y]) => [X_(X), fy(Y)]), 0, 0, Wx, Dp); if (wp.length < 3) continue
      let z0 = 0; for (const f of flats) if (cov.overlap(f.r, r)) z0 = Math.max(z0, f.z1)
      const t = r.role === 'detail' ? 1.5 : r.contour === false ? 2 : 6 + 10 * r.form
      const f = add(slab(wp, z0, z0 + t, tones(r.color)), { pass: 'objects', kind: 'flat', r, z1: z0 + t })
      flats.push(f)
    }

    // upright objects: a root stands on the floor (or on a flat) at its base; its parts ride on its front face
    const groups = new Map()
    for (const r of R) if (['upright', 'detail'].includes(kind.get(r))) { const g = rootOf(r); if (kind.get(g) !== 'upright') continue; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(r) }
    const members = new Map()
    for (const [root, list] of groups) {
      const Yb = root.bbox.y1, [zb] = flatTop(root.bbox.cx, Yb - 3), yF0 = fy(Yb)
      const front = new Map()
      for (const m of list) { // relief stacking inside the group (a lid in front of the body, a knob in front of the lid)
        let f = 0; for (const q of list) if (q.i < m.i && front.has(q) && cov.overlap(q, m)) f = Math.max(f, front.get(q))
        const inc = m === root ? 12 : m.role === 'detail' ? 4 + 5 * m.form : 8 + 8 * m.form
        front.set(m, f + inc)
      }
      // a part painted before its root (a spout behind the body) still stands proud of it, cut where the body covers it
      for (const m of list) if (m !== root && m.i < root.i && m.role !== 'detail') front.set(m, front.get(root) + 4 + 6 * m.form)
      const shift = yF0 - front.get(root)
      for (const m of list) {
        const yF = front.get(m) + shift, w = m.bbox.w
        let T = m === root ? Math.max(10, w * (0.1 + 0.28 * m.form) * o.bulk) : m.role === 'detail' ? 3 + 4 * m.form : Math.max(8, Math.min(w, m.bbox.h) * 0.35 * m.form * o.bulk)
        T = Math.max(3, Math.min(T, yF - 2))
        const wp = m.pts.map(([X, Y]) => [X_(X), zb + Yb - Y])
        const s = add(prism(wp, yF, T, tones(m.color)), { pass: 'objects', kind: 'upright', r: m, root, yF, zb, Yb, under: m !== root && m.i < root.i && m.role !== 'detail' ? root : null })
        members.set(m, s)
      }
    }
    // a thing's point in the picture → the world, on whatever it lies on
    const toUp = (s, X, Y, dy = 0) => [X_(X), s.yF + dy, s.zb + s.Yb - Y]
    const toFloor = (X, Y, z) => [X_(X), fy(Y), z]
    const toWall = (X, Y, y = 0.5) => [X_(X), y, yH - Y]

    // ---- painter's order: walls, floor, wall items, flats (low first), then objects back to front
    const order = { walls: 0, objects: 1 }
    const rank = (s) => s.kind === 'struct' ? 0 : s.kind === 'wall' ? 1 : s.kind === 'flat' ? 2 : 3
    const ukey = (s) => s.kind === 'upright' ? members.get(s.root).yF + X_(s.root.bbox.cx) * 0.02 : 0
    solids.sort((a, b) => order[a.pass] - order[b.pass] || rank(a) - rank(b) || (a.kind === 'flat' ? a.back[0][2] - b.back[0][2] : 0) || ukey(a) - ukey(b) || (a.kind === 'upright' ? a.yF - b.yF : 0) || (a.r?.i ?? a.line?.i ?? 0) - (b.r?.i ?? b.line?.i ?? 0))
    solids.forEach((s, k) => (s.k = k))

    // ---- fit the room to the canvas (~85–90%)
    const std = ([x, y, z]) => [x - y, (x + y) / 2 - z * ZK]
    const allPts = []
    for (const s of solids) allPts.push(...s.front, ...s.back)
    for (const l of S.lines) if (K.isLight(l.color) && l.depth < 0.8) for (const [X, Y] of l.pts) allPts.push([X_(X), Dp * 0.5, yH - Y])
    const cb = K.bbox(allPts.map(std)), u = Math.min((W * 0.88) / cb.w, (H * 0.88) / cb.h)
    const ox = W / 2 - u * cb.cx, oy = H / 2 - u * cb.cy
    const P3 = (p) => { const [a, b] = std(p), sx = ox + u * a; return [flip ? W - sx : sx, oy + u * b] }
    const pr = (pts) => pts.map(P3)
    for (const s of solids) {
      s.sFront = pr(s.front); s.sBack = pr(s.back); s.sQuads = s.quads.map((q) => ({ poly: pr(q.pts), c: q.c }))
      s.sil = [s.sBack, ...s.sQuads.map((q) => q.poly), s.sFront]; s.sb = K.bbox(s.sil.flat())
    }
    const cutAfter = (k, bb) => { const out = []; for (const s of solids) if (s.k > k && boxHit(s.sb, bb)) out.push(...s.sil); return out }

    // ---- marks
    const fillPoly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.strokeStyle = c; K.path(ctx, pts); ctx.fill(); ctx.stroke() }
    const planes = (ctx, s) => { ctx.lineWidth = 0.8; ctx.lineJoin = 'round'; fillPoly(ctx, s.sBack, s.backC); for (const q of s.sQuads) fillPoly(ctx, q.poly, q.c); fillPoly(ctx, s.sFront, s.c) }
    // a plane being made: the pen traces its outline (kept inside the plane), then the fill sweeps down from the top
    const make = (s) => D.mark(0.5 + Math.min(12, K.length(s.sFront, true) / 220), (ctx, k) => {
      ctx.save()
      if (k >= 1) { planes(ctx, s); ctx.restore(); return }
      const pe = K.clamp(k / 0.45), pf = K.clamp((k - 0.45) / 0.55), b = s.sb
      if (pf > 0) { ctx.save(); ctx.beginPath(); ctx.rect(b.x0 - 2, b.y0 - 2, b.w + 4, (b.h + 4) * pf); ctx.clip(); planes(ctx, s); ctx.restore() }
      ctx.beginPath(); K.path(ctx, s.sFront); ctx.clip()
      ctx.strokeStyle = o.construct; ctx.lineWidth = 3; K.path(ctx, K.upTo([...s.sFront, s.sFront[0]], pe), false); ctx.stroke()
      ctx.restore()
    })
    const flat = (pts, c, { alpha = 1, blend } = {}) => D.mark(0.3 + Math.min(4, K.length(pts, true) / 400), (ctx, k) => {
      ctx.save(); ctx.globalAlpha = alpha; if (blend) ctx.globalCompositeOperation = blend
      if (k < 1) { const b = K.bbox(pts); ctx.beginPath(); ctx.rect(b.x0 - 1, b.y0 - 1, b.w + 2, (b.h + 2) * k); ctx.clip() }
      ctx.fillStyle = c; K.path(ctx, pts); ctx.fill(); ctx.restore()
    })
    const hair = (pts, c, w = 1.2, alpha = 1) => D.line(pts, { w, color: c, alpha, cap: 'butt', cost: 0.5 })

    D.ground(() => D.sheet(backdrop))

    D.pass('iso grid', 0.7, () => {
      // the 2:1 construction grid ruled across the artboard, lined up with the room's corner
      const g = 48 * u, [gx, gy] = P3([0, 0, -o.slab]), segs = []
      for (let i = -70; i <= 70; i++) { const y0 = gy + i * g; segs.push([[gx - W * 2, y0 - W], [gx + W * 2, y0 + W]], [[gx - W * 2, y0 + W], [gx + W * 2, y0 - W]]) }
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
      for (const s of solids) {
        if (s.kind === 'wall' || (s.kind === 'upright' && s.r.role === 'detail')) continue
        const b3 = [0, 1, 2].map((j) => [Math.min(...s.front.concat(s.back).map((p) => p[j])), Math.max(...s.front.concat(s.back).map((p) => p[j]))])
        const corners = []
        for (const x of b3[0]) for (const y of b3[1]) for (const z of b3[2]) corners.push(P3([x, y, z]))
        const hx = hull(corners)
        D.clip(s.sFront, () => D.mark(0.25, (ctx, k) => {
          ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = o.construct; K.path(ctx, hx); ctx.fill()
          ctx.globalAlpha = 0.55; ctx.strokeStyle = o.construct; ctx.lineWidth = 1; K.path(ctx, K.upTo([...hx, hx[0]], k), false); ctx.stroke(); ctx.restore()
        }))
      }
    })

    D.pass('walls and floor', 1.6, () => { for (const s of solids) if (s.pass === 'walls') make(s) })
    D.pass('objects', 3, () => {
      for (const s of solids) {
        if (s.pass !== 'objects') continue
        if (s.under) { const body = members.get(s.under); D.layer({ cut: [body.sFront] }, () => make(s)) } else make(s)
      }
    })

    const wallFace = pr([[0, 0.2, 0], [Wx, 0.2, 0], [Wx, 0.2, wallH], [0, 0.2, wallH]])
    const floorTop = pr([[0, 0, 0], [Wx, 0, 0], [Wx, Dp, 0], [0, Dp, 0]])
    D.pass('light and shadow', 2, () => {
      // cast shadows: single flat shapes on the floor (or the flat they fall on), away from the light
      for (const r of R.filter((q) => kind.get(q) === 'shadow')) {
        const [z, f0] = flatTop(r.centre[0], r.centre[1], r.i)
        const wp = clipRect(r.pts.map(([X, Y]) => [X_(X), fy(Y)]), 0, 0, Wx, Dp); if (wp.length < 3) continue
        const pts = pr(wp.map(([x, y]) => [x, y, z + 0.3]))
        D.layer({ cut: cutAfter(f0 ? f0.k : floor.k, K.bbox(pts)) }, () => flat(pts, K.mix('#ffffff', K.mix(r.color, '#2a2f55', 0.5), 0.22 + 0.28 * r.strength), { blend: 'multiply' }))
      }
      // round things keep the cube rule: the face split into three flat zones
      for (const s of solids) {
        if (s.kind !== 'upright') continue
        const r = s.r; if (r.role === 'detail' || r.form < 0.45 || r.area < 1500) continue
        const b = r.bbox, hw = b.w / 2 || 1, hh = b.h / 2 || 1, c0 = L[0] * b.cx / hw + L[1] * b.cy / hh
        const dark = clipHalf(r.pts, -L[0] / hw, -L[1] / hh, 0.28 - c0), lit = clipHalf(r.pts, L[0] / hw, L[1] / hh, 0.62 + c0)
        const t = tones(r.color), z = (pts) => pr(pts.map(([X, Y]) => toUp(s, X, Y)))
        D.layer({ cut: cutAfter(s.k, s.sb), mask: s.sFront }, () => {
          if (dark.length > 2) flat(z(dark), t.side)
          if (lit.length > 2 && r.form > 0.6) flat(z(lit), t.top)
        })
      }
      // light falling on a surface: one flat light shape on the wall or the floor
      for (const r of R.filter((q) => ['wallLight', 'floorLight'].includes(kind.get(q)))) {
        const onWall = kind.get(r) === 'wallLight'
        const wp = onWall ? wallPoly(r.pts) : clipRect(r.pts.map(([X, Y]) => [X_(X), fy(Y)]), 0, 0, Wx, Dp); if (wp.length < 3) continue
        const pts = pr(wp.map(([a, b]) => (onWall ? [a, 0.4, b] : [a, b, 0.2])))
        D.layer({ cut: cutAfter(onWall ? backWall.k : floor.k, K.bbox(pts)), mask: onWall ? wallFace : floorTop }, () => flat(pts, K.mix(r.color, '#ffffff', 0.35), { alpha: 0.55 }))
      }
      // a light source pours one flat warm tint on the wall around it, stepped in three distance bands
      for (const s of solids.filter((q) => q.kind === 'wall' && q.r && q.r.role === 'glow')) {
        const base = K.densify(wallPoly(s.r.pts), 12, true)
        D.layer({ cut: [s.sFront, ...cutAfter(s.k, K.bbox(wallFace))], mask: wallFace }, () => {
          for (const [dd, a] of [[220, 0.1], [130, 0.1], [60, 0.12]]) flat(pr(K.offset(base, dd).map(([x, z]) => [x, 0.4, z])), o.warm, { alpha: a })
        })
      }
      // light lines (steam) rise above the thing they come from, as flat pale shapes
      const ups = solids.filter((s) => s.kind === 'upright')
      for (const l of S.lines) {
        if (!K.isLight(l.color) || l.depth >= 0.8) continue
        const [x0, y0] = l.pts[0]; let near = null, best = Infinity
        for (const s of ups) { const b = s.r.bbox, d = Math.hypot(Math.max(b.x0 - x0, 0, x0 - b.x1), Math.max(b.y0 - y0, 0, y0 - b.y1)); if (d < best) { best = d; near = s } }
        const tube = K.tube(l.pts, Math.max(2.5, l.w / 2), Math.max(1.2, l.w / 5), false)
        const pts = pr(tube.map(([X, Y]) => (near ? toUp(near, X, Y, 1) : Y < yH ? toWall(X, Y) : toFloor(X, Y, 1))))
        flat(pts, K.mix(l.color, '#ffffff', 0.3), { alpha: 0.95 })
      }
    })

    D.pass('details', 1.4, () => {
      // dark lines as hairlines on whatever they lie on: an object's face, a flat, the floor, the wall
      for (const l of S.lines) {
        if (K.isLight(l.color) && (l.depth < 0.8 || l.w >= 6)) continue // steam and built bars are done
        const [mx, my] = l.pts[l.pts.length >> 1]
        let on = null
        for (const r of R) if (r.i < l.i && !['shadow', 'highlight'].includes(r.role) && K.inside(r.pts, mx, my)) on = r
        const k = on ? kind.get(on) : null, s = on && members.get(on)
        let map, anchor
        if (s) { map = (X, Y) => toUp(s, X, Y, 0.5); anchor = s.k }
        else if (k === 'flat' || k === 'floorFace' || (!on && my >= yH)) { const [z, f0] = flatTop(mx, my); map = (X, Y) => toFloor(X, Y, z + 0.3); anchor = f0 ? f0.k : floor.k }
        else { map = (X, Y) => toWall(X, Y, (wallDepth.get(on) || 0) + 0.3); anchor = backWall.k }
        const pts = pr(K.densify(l.pts, 12).filter(([X]) => X >= xL && X <= xR).map(([X, Y]) => map(X, Y)))
        if (pts.length < 2) continue
        D.layer({ cut: cutAfter(anchor, K.bbox(pts)) }, () => hair(pts, K.mix(l.color, '#1c2040', 0.2), Math.max(1.2, Math.min(3, l.w * 0.7 * u))))
      }
      // sparse texture as hairlines and dots: plank lines on the floor along its grain, a speckle on the walls
      const ang = groundR?.grain ?? 0, planks = K.hatchLines([[0, 0], [Wx, 0], [Wx, Dp], [0, Dp]], Math.abs(Math.sin(ang)) > 0.7 ? Math.PI / 2 : 0, 44).map(([a, b]) => pr([[a[0], a[1], 0.1], [b[0], b[1], 0.1]]))
      D.layer({ cut: cutAfter(floor.k, K.bbox(floorTop)), mask: floorTop }, () => { for (const seg of planks) hair(seg, tf.side, 1.1, 0.45) })
      const rr = K.rng(91), dots = []
      for (let i = 0; i < 140; i++) { const [x, y] = P3([rr() * Wx, 0.3, rr() * wallH]); dots.push([x, y, 1.5]) }
      D.layer({ cut: cutAfter(backWall.k, K.bbox(wallFace)), mask: wallFace }, () => D.dots(dots, tw.side, { alpha: 0.35 }))
    })
  },
}
const boxHit = (A, B) => !(A.x0 > B.x1 || B.x0 > A.x1 || A.y0 > B.y1 || B.y0 > A.y1)

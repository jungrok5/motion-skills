// Toy brick — studied from anidoodle's toyBrick plate (toyBrick.ts, toyBrickKit.ts, styles/toyBrick.md) and re-made for
// the scene model as a BRICK MOSAIC seen in orthographic FRONT view. Moulded ABS toy bricks, no hand marks at all.
// The shaded scene is sampled on a stud grid (1 stud = 20 LDU wide, a plate 8 LDU = 0.4 stud tall, a brick 3 plates,
// so the 5:6 brick face is right by construction), each cell takes the nearest colour on a fixed toy-brick table,
// and same-colour cells merge into 1x2 / 1x3 / 1x4 parts: a whole brick where three plate rows agree, plates elsewhere.
// Three depths of build: the back wall (background, light, far things), the floor (ground) and the model (subjects,
// details, steam) standing in front; a part shows its studs on any top edge with a shallower build above it, and the
// nearer builds throw a soft ground shadow onto the ones behind.
// MARK: the part. Flat plastic fill, the cube rule on every face (front 0, stud top +0.14, the stud's side lit toward the
// light, dark away from it), a bevel highlight along the top edge and the lit side, a seam hairline where parts meet.
// ORDER: instruction-booklet grammar: course by course, bottom to top, back to front inside a course; each part drops
// straight down its insertion axis and seats; the course being built wears the booklet's yellow outline.
// Never name the trademark.
import { BRICK } from './_craft.js'

export default {
  id: 'toy-brick', name: 'Toy brick mosaic', ko: '장난감 블록',
  medium: 'moulded ABS toy bricks and plates, built as a mosaic and seen in orthographic front view',
  mark: 'the part: a 1x1 to 1x4 brick or plate in one flat plastic colour, with studs, bevels and seams',
  edge: 'crisp moulded edges, a bevel highlight on the lit edges, dark seam hairlines between parts; the only blur is the ground shadow',
  order: ['the bottom courses', 'the middle courses', 'the top courses'],
  paper: 'a flat studio backdrop behind the build',
  palette: 'a fixed table of real toy-brick colours; every cell is the nearest one',
  bestFor: '장난감처럼 귀엽고 단단한 느낌 · 아이콘, 캐릭터, 사물 · 게임과 교육',
  source: 'anidoodle toyBrick.ts · toyBrickKit.ts · styles/toyBrick.md',
  // studs: how many studs across the picture (the mosaic's resolution) · palette: the brick colour table (hex list)
  // backdrop: the studio colour behind · outline: the booklet's step outline colour · shadow: ground shadow strength (0..1)
  defaults: { studs: 44, palette: Object.values(BRICK), backdrop: '#E7E4DE', outline: '#FAC80A', shadow: 0.5 },
  draw(D, S, K, o) {
    const W = S.W, H = S.H, L = S.light, env = D.env
    const cols = Math.max(8, Math.round(o.studs)), u = W / cols, ph = u * 0.4, rows = Math.ceil(H / ph)
    const yOf = (r) => H - (r + 1) * ph // top of plate row r (r = 0 is the bottom row)
    const shade = (h, t) => { const c = K.rgb(h); return K.hex(c.map((v) => (t >= 0 ? v + (255 - v) * t : v * (1 + t)))) }
    const near = new Map(), pick = (rgb) => { const key = rgb.map((v) => v >> 3).join(','); let c = near.get(key); if (!c) { c = K.nearest(K.hex(rgb), o.palette); near.set(key, c) } return c }
    const planeOf = (q) => (!q ? 0 : q.role === 'bg' || q.role === 'glow' || q.role === 'highlight' || q.depth >= 0.8 ? 0 : q.role === 'ground' ? 1 : 2)

    // ---------------------------------------------------------------- the mosaic: a colour and a depth per cell
    const N = cols * rows, col = new Array(N), pl = new Int8Array(N)
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const y = yOf(r), votes = new Map()
      let best = null, bn = 0
      for (const [fx, fy] of [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7], [0.5, 0.5]]) {
        const x = (c + fx) * u, yy = y + fy * ph, p = pick(S.colorAt(x, Math.min(H - 1, Math.max(0, yy)))), n = (votes.get(p) || 0) + 1 + (fx === 0.5 ? 0.5 : 0)
        votes.set(p, n); if (n > bn) { bn = n; best = p }
      }
      const k = r * cols + c; col[k] = best; pl[k] = planeOf(S.regionAt((c + 0.5) * u, Math.max(0, y + ph * 0.5)))
    }
    // lines are stamped in so a wisp of steam or a window bar survives the coarse grid
    for (const l of S.lines) {
      const p = pick(K.rgb(l.color)), lp = l.depth >= 0.8 ? 0 : 2, s = K.resample(l.pts, Math.max(2, Math.ceil(K.length(l.pts) / (ph * 0.5))))
      for (const [x, y] of s) {
        const c = Math.floor(x / u), r = Math.floor((H - y) / ph); if (c < 0 || c >= cols || r < 0 || r >= rows) continue
        const q = S.regionAt(x, y); if (q && q.i > l.i) continue
        const k = r * cols + c; col[k] = p; pl[k] = Math.max(lp, q ? planeOf(q) : 0)
      }
    }

    // ---------------------------------------------------------------- parts: bricks where three plate rows agree, plates elsewhere
    const courses = Math.ceil(rows / 3), parts = Array.from({ length: courses }, () => [])
    const split = (n, phase) => { const out = []; let left = n, first = true; while (left > 0) { let l = Math.min(4, left); if (first && phase && left > 2) l = phase === 1 ? 2 : 3; if (left - l === 1 && l > 2) l -= 1; out.push(l); left -= l; first = false } return out }
    for (let cs = 0; cs < courses; cs++) {
      const r0 = cs * 3, full = r0 + 2 < rows
      const tall = new Array(cols).fill(false)
      if (full) for (let c = 0; c < cols; c++) { const a = r0 * cols + c, b = a + cols, d = b + cols; tall[c] = col[a] === col[b] && col[b] === col[d] && pl[a] === pl[b] && pl[b] === pl[d] }
      // whole bricks
      for (let c = 0; c < cols;) {
        if (!tall[c]) { c++; continue }
        const k = r0 * cols + c; let e = c + 1
        while (e < cols && tall[e] && col[r0 * cols + e] === col[k] && pl[r0 * cols + e] === pl[k]) e++
        let x = c; for (const l of split(e - c, cs % 2 ? 1 : 0)) { parts[cs].push({ c: x, len: l, r: r0, h: 3, col: col[k], pl: pl[k] }); x += l }
        c = e
      }
      // plates, row by row, in the columns the bricks left
      for (let r = r0; r < Math.min(rows, r0 + 3); r++) for (let c = 0; c < cols;) {
        if (full && tall[c]) { c++; continue }
        const k = r * cols + c; let e = c + 1
        while (e < cols && !(full && tall[e]) && col[r * cols + e] === col[k] && pl[r * cols + e] === pl[k]) e++
        let x = c; for (const l of split(e - c, (r + cs) % 3)) { parts[cs].push({ c: x, len: l, r, h: 1, col: col[k], pl: pl[k] }); x += l }
        c = e
      }
      // inside a course: back to front, bottom to top, left to right (or from the light)
      parts[cs].sort((a, b) => a.pl - b.pl || a.r - b.r || (L[0] > 0 ? b.c - a.c : a.c - b.c))
    }
    // studs: on every top edge where the build above is shallower (or nothing at all)
    const cellPl = (r, c) => (r >= rows ? -1 : pl[r * cols + c])
    for (const cs of parts) for (const p of cs) { p.studs = []; const top = p.r + p.h; for (let c = p.c; c < p.c + p.len; c++) if (cellPl(top, c) < p.pl && top < rows) p.studs.push(c) }

    // ---------------------------------------------------------------- the ground shadow the nearer builds throw on the ones behind
    const AW = [-L[0], -L[1]], gkey = `brick:shadow:${W}x${H}:${cols}:${o.shadow}:${AW[0].toFixed(2)}:` + (() => { let h = 0; for (let i = 0; i < N; i++) h = (h * 31 + pl[i] + 1) % 1000000007; return h })()
    let shadowC = env.cache.get(gkey)
    if (!shadowC && o.shadow > 0) {
      const q = 0.25, sw = Math.ceil(W * q), sh = Math.ceil(H * q), cast = K.canvas(sw, sh), recv = K.canvas(sw, sh), out = K.canvas(sw, sh)
      const ox = AW[0] * u * 0.45, oy = AW[1] * u * 0.45 + u * 0.12
      const xo = out.getContext('2d')
      for (const p of [0, 1]) {
        const xc = cast.getContext('2d'), xr = recv.getContext('2d'); xc.setTransform(q, 0, 0, q, 0, 0); xr.setTransform(q, 0, 0, q, 0, 0); xc.clearRect(0, 0, W, H); xr.clearRect(0, 0, W, H)
        xc.fillStyle = '#000'; xr.fillStyle = '#000'
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const v = pl[r * cols + c]; if (v > p) xc.fillRect(c * u + ox, yOf(r) + oy - (cellPl(r + 1, c) < v ? u * 0.2 : 0), u, ph + (cellPl(r + 1, c) < v ? u * 0.2 : 0)); if (v === p) xr.fillRect(c * u, yOf(r), u, ph) }
        // soften by halving twice and scaling back
        const t1 = K.canvas(Math.ceil(sw / 4), Math.ceil(sh / 4)), x1 = t1.getContext('2d'); x1.imageSmoothingEnabled = true; x1.drawImage(cast, 0, 0, t1.width, t1.height)
        xc.setTransform(1, 0, 0, 1, 0, 0); xc.clearRect(0, 0, sw, sh); xc.imageSmoothingEnabled = true; xc.drawImage(t1, 0, 0, sw, sh)
        xc.globalCompositeOperation = 'destination-in'; xc.drawImage(recv, 0, 0); xc.globalCompositeOperation = 'source-over'
        xo.drawImage(cast, 0, 0)
      }
      shadowC = { c: out, q }; env.cache.set(gkey, shadowC)
    }

    // ---------------------------------------------------------------- one part, rendered flat-plastic
    const hair = Math.max(0.7, u * 0.04), lit = L[0] <= 0 ? 'left' : 'right'
    const drawPart = (ctx, p, dy = 0) => {
      const x = p.c * u, y = yOf(p.r + p.h - 1) + dy, w = p.len * u, h = p.h * ph, c = p.col
      ctx.fillStyle = c; ctx.fillRect(x, y, w, h)
      // bevels: a light strip along the top edge and down the lit side, a darker one down the far side
      const bw = Math.max(1, u * 0.06)
      ctx.fillStyle = shade(c, 0.32); ctx.fillRect(x, y, w, bw)
      ctx.fillStyle = shade(c, 0.16); ctx.fillRect(lit === 'left' ? x : x + w - bw, y, bw, h)
      ctx.fillStyle = shade(c, -0.14); ctx.fillRect(lit === 'left' ? x + w - bw : x, y + bw, bw, h - bw)
      ctx.fillStyle = shade(c, -0.08); ctx.fillRect(x, y + h - bw, w, bw)
      // seams: the dark hairline where this part meets the next
      ctx.strokeStyle = shade(c, -0.5); ctx.lineWidth = hair; ctx.strokeRect(x + hair / 2, y + hair / 2, w - hair, h - hair)
    }
    const drawStuds = (ctx, p, dy = 0) => {
      if (!p.studs.length) return
      const y = yOf(p.r + p.h - 1) + dy, sw = u * 0.6, sh = u * 0.2, ry = u * 0.07, c = p.col
      for (const cc of p.studs) {
        const cx = (cc + 0.5) * u, x0 = cx - sw / 2, t = y - sh
        // the cylinder's side: lit toward the light, dark away from it
        ctx.fillStyle = shade(c, -0.1); ctx.fillRect(x0, t, sw, sh + 0.5)
        ctx.fillStyle = shade(c, lit === 'left' ? 0.06 : -0.3); ctx.fillRect(x0, t, sw * 0.28, sh + 0.5)
        ctx.fillStyle = shade(c, lit === 'left' ? -0.3 : 0.06); ctx.fillRect(x0 + sw * 0.72, t, sw * 0.28, sh + 0.5)
        ctx.fillStyle = shade(c, 0.14); ctx.beginPath(); ctx.ellipse(cx, t, sw / 2, ry, 0, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = shade(c, 0.5); ctx.lineWidth = Math.max(0.8, u * 0.04); ctx.beginPath(); ctx.ellipse(cx, t, sw * 0.4, ry * 0.6, 0, lit === 'left' ? Math.PI * 1.05 : Math.PI * 1.55, lit === 'left' ? Math.PI * 1.45 : Math.PI * 1.95); ctx.stroke()
        ctx.strokeStyle = shade(c, -0.5); ctx.lineWidth = hair * 0.8; ctx.beginPath(); ctx.moveTo(x0, t); ctx.lineTo(x0, y); ctx.moveTo(x0 + sw, t); ctx.lineTo(x0 + sw, y); ctx.stroke()
        ctx.beginPath(); ctx.ellipse(cx, t, sw / 2, ry, 0, 0, Math.PI * 2); ctx.stroke()
      }
    }

    D.ground(() => D.sheet(o.backdrop))
    // each course is one step of the booklet: its parts seat one by one, the part in the hand drops down its axis
    const course = (cs) => {
      const ps = parts[cs]; if (!ps.length) return
      const prev = cs > 0 ? parts[cs - 1] : [], r0 = cs * 3, r1 = Math.min(rows, r0 + 3)
      D.mark(0.3 + ps.length * 0.02, (ctx, k) => {
        const m = Math.ceil(ps.length * k), fr = k >= 1 ? 1 : ps.length * k - (m - 1)
        let shadowed = false
        const shadowNow = () => {
          if (shadowed || !shadowC) return; shadowed = true
          const sy = yOf(r1 - 1), hh = (r1 - r0) * ph
          ctx.save(); ctx.globalAlpha = o.shadow; ctx.drawImage(shadowC.c, 0, sy * shadowC.q, W * shadowC.q, hh * shadowC.q, 0, sy, W, hh); ctx.restore()
        }
        for (let i = 0; i < m; i++) {
          const p = ps[i]
          if (p.pl === 2) shadowNow()
          const dy = i === m - 1 && fr < 1 ? -(1 - fr) * (1 - fr) * u * 3 : 0
          drawPart(ctx, p, dy)
        }
        if (m === ps.length) shadowNow()
        // the studs of the course below stand into this one; then this course's own
        for (const p of prev) if (p.r + p.h >= r0) drawStuds(ctx, p)
        for (let i = 0; i < m; i++) drawStuds(ctx, ps[i], i === m - 1 && fr < 1 ? -(1 - fr) * (1 - fr) * u * 3 : 0)
        if (k < 1) { // the current step wears the booklet's yellow outline
          ctx.save(); ctx.strokeStyle = o.outline; ctx.lineWidth = Math.max(1.5, u * 0.08)
          for (let i = 0; i < m; i++) { const p = ps[i]; ctx.strokeRect(p.c * u, yOf(p.r + p.h - 1), p.len * u, p.h * ph) }
          ctx.restore()
        }
      })
    }
    const third = Math.ceil(courses / 3)
    D.pass('the bottom courses', 1, () => { for (let cs = 0; cs < Math.min(courses, third); cs++) course(cs) })
    D.pass('the middle courses', 1, () => { for (let cs = third; cs < Math.min(courses, third * 2); cs++) course(cs) })
    D.pass('the top courses', 1, () => { for (let cs = third * 2; cs < courses; cs++) course(cs) })
  },
}

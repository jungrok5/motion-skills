// Hand embroidery — studied from anidoodle's embroidery plates (embroidery.ts, embroideryKit.ts, embroideryAlive.ts,
// styles/embroidery.md) and re-made for the scene model. Six-stranded cotton floss split to two strands, worked with a
// crewel needle through natural plain-weave linen stretched in a beech hoop. A stitch is a length of twisted thread
// between two holes: pinched where it dives into the cloth, rounded (a lit side and a shade side), its strands twisting
// into slanted grooves with a glint on each twist, standing a hair proud so it casts a tiny shadow. Sheen depends on
// how the stitch lies to the light, so stitch direction reads as form.
// MARKS: split stitch round every outline; satin / long-and-short laid ACROSS each form (stitches from the edge toward
// the middle, staggered long and short, the thread stepping through the floss card as the light turns); fishbone
// (slanted toward the tip) where a shape has a grain; laid work along the grain for floors and tables; seed stitch for
// the wall, the linen showing between; stem stitch for lines (two rows for a thick one, satin for a bar); French knots
// for small round parts and a glint on round things. Tone is thread colour: every colour is a floss on the card.
// FRAME: the picture is worked inside a hoop that is a little larger than the frame, so the ring and the slack cloth
// beyond it show only in the corners and nothing of the scene is lost.
// ORDER: outlines, fills (back to front), the background worked round the motif, then stem stitch and knots on top.
import { FLOSS } from './_craft.js'

export default {
  id: 'embroidery', name: 'Hand embroidery', ko: '자수',
  medium: 'stranded cotton floss stitched through natural plain-weave linen in a beech hoop',
  mark: 'the stitch: satin and long-and-short across the form, split-stitch outlines, stem stitch, seed stitch, French knots',
  edge: 'the ends of the stitches: a row of pinches into the cloth; outlines are thread too, never ink',
  order: ['split-stitch outlines', 'satin and long-and-short fills', 'background worked round the motif', 'stem stitch', 'french knots'],
  paper: 'oatmeal linen, plain weave you can count, drum-tight in a beech hoop; slack cloth in the corners',
  palette: 'a floss card: every colour is the nearest stranded cotton; shading is a change of thread',
  bestFor: '포근하고 정성스러운 느낌 · 식물, 꽃, 소품, 동물 · 수공예 브랜드',
  source: 'anidoodle embroidery.ts · embroideryKit.ts · embroideryAlive.ts · styles/embroidery.md',
  // linen: the cloth colour · wood: beech hoop colour · hoop: ring size relative to half the frame (1.28 = only the corners
  // show; 0 = no hoop) · thread: thread width scale · floss: the shade card (hex list) · background: 'seed' | 'laid' | 'bare'
  defaults: { linen: '#e2d4b9', wood: '#d7aa70', hoop: 1.28, thread: 1, floss: FLOSS, background: 'seed' },
  draw(D, S, K, o) {
    const W = S.W, H = S.H, L = S.light, AW = [-L[0], -L[1]], env = D.env, tw = o.thread
    const FW = 3 * tw, GAP = 2.55 * tw, MAXLEN = 22 * tw

    // ---------------------------------------------------------------- floss colour (nearest on the card, cached)
    const fcache = new Map()
    const floss = (rgb, x, y) => {
      const h = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1, j = (h - 0.5) * 10 // a dither: neighbouring stitches pick neighbouring threads
      const q = rgb.map((v) => K.clamp(Math.round((v + j) / 6) * 6, 0, 255)), key = q.join(',')
      let c = fcache.get(key); if (!c) { c = K.nearest(K.hex(q), o.floss); fcache.set(key, c) } return c
    }
    // the colour a region's thread takes at (x, y): its shaded colour, darkened by cast shadows over it, lifted by light
    // falling on it (no line work: a passing wisp of steam is not dyed into the wall)
    const shadows = S.regions.filter((q) => q.role === 'shadow'), lights = S.regions.filter((q) => q.role === 'highlight' || q.role === 'glow')
    const colAt = (r, x, y) => {
      let c = K.rgb(r.role === 'glow' ? r.lit : r.colorAt(x, y))
      for (const s of shadows) if (s.i > r.i && x > s.bbox.x0 && x < s.bbox.x1 && y > s.bbox.y0 && y < s.bbox.y1 && K.inside(s.pts, x, y)) { const sc = K.rgb(s.color), a = s.strength; c = c.map((v, i) => v * (1 - a) + v * (sc[i] / 255) * a * 0.75) }
      for (const g of lights) if (g.i > r.i && x > g.bbox.x0 && x < g.bbox.x1 && y > g.bbox.y0 && y < g.bbox.y1 && K.inside(g.pts, x, y)) { const k = g.role === 'glow' ? 0.25 : 0.15, gc = K.rgb(g.color); c = c.map((v, i) => v + (gc[i] - v) * k + (255 - v) * k * 0.4) }
      return c
    }
    const hidden = (it, x, y) => { const q = S.regionAt(x, y); return q && q.i > it.i }

    // ---------------------------------------------------------------- geometry of stitching
    const st = (a, b, w, c) => ({ a, b, w, c })
    const xsAt = (P, y) => { const xs = []; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [x1, y1] = P[j], [x2, y2] = P[i]; if ((y1 > y) !== (y2 > y)) xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1)) } xs.sort((a, b) => a - b); const out = []; for (let k = 0; k + 1 < xs.length; k += 2) out.push([xs[k], xs[k + 1]]); return out }
    const minus = (iv, cut) => { let out = iv; for (const [c0, c1] of cut) { const nx = []; for (const [a, b] of out) { if (c1 <= a || c0 >= b) nx.push([a, b]); else { if (c0 > a) nx.push([a, c0]); if (c1 < b) nx.push([c1, b]) } } out = nx } return out }
    // LAID WORK: parallel rows at `angle`, every row a run of long stitches split on a staggered (brick) grid; the parts
    // of the shape that later regions cover are left unstitched
    const laid = (r, angle, gap, maxLen, w, cover) => {
      const c = Math.cos(-angle), s = Math.sin(-angle), R = (P) => P.map(([x, y]) => [x * c - y * s, x * s + y * c])
      const ci = Math.cos(angle), si = Math.sin(angle), back = (x, y) => [x * ci - y * si, x * si + y * ci]
      const rp = R(r.pts), b = K.bbox(rp), cut = cover.map((q) => { const p = R(q); return { p, b: K.bbox(p) } }), out = []
      for (let row = Math.ceil(b.y0 / gap); row * gap <= b.y1; row++) {
        const y = row * gap, ph = ((row % 2) * 0.5 + ((row * 0.37) % 0.2)) * maxLen
        let iv = xsAt(rp, y)
        for (const q of cut) if (y > q.b.y0 && y < q.b.y1) iv = minus(iv, xsAt(q.p, y))
        for (const [x0, x1] of iv) {
          if (x1 - x0 < 1.5) continue
          let xa = x0
          for (let gx = Math.floor((x0 - ph) / maxLen + 1) * maxLen + ph; xa < x1 - 0.5; gx += maxLen) {
            const xb = Math.min(x1, gx); if (xb - xa < 3 && xb < x1) continue
            const m = back((xa + xb) / 2, y)
            out.push(st(back(xa, y), back(xb, y), w, floss(colAt(r, m[0], m[1]), m[0], m[1]))); xa = xb
          }
        }
      }
      return out
    }
    const rayExit = (P, p, d) => {
      let best = Infinity
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        const ax = P[j][0], ay = P[j][1], ex = P[i][0] - ax, ey = P[i][1] - ay, den = d[0] * ey - d[1] * ex
        if (Math.abs(den) < 1e-9) continue
        const qx = ax - p[0], qy = ay - p[1], t = (qx * ey - qy * ex) / den, u = (qx * d[1] - qy * d[0]) / den
        if (t > 0.5 && u >= 0 && u <= 1 && t < best) best = t
      }
      return best === Infinity ? 0 : best
    }
    // SATIN / LONG-AND-SHORT across the form: from every point of the edge a run of stitches goes in along the (smoothed)
    // inward normal to the middle of the shape, split long-and-short; where runs crowd together (a round shape) the inner
    // stitches are thinned the way an embroiderer drops them. With a grain, the runs slant toward it (fishbone).
    // convex hull area / own area: a round or box-like shape is stitched toward one pole, a band across its middle
    const hullRatio = (P) => {
      const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o2, a, b) => (a[0] - o2[0]) * (b[1] - o2[1]) - (a[1] - o2[1]) * (b[0] - o2[0]), lo = [], up = []
      for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q) }
      for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q) }
      const hull = lo.slice(0, -1).concat(up.slice(0, -1)); return Math.abs(K.area(P)) / (Math.abs(K.area(hull)) || 1)
    }
    // SATIN / LONG-AND-SHORT across the form: from every point of the edge a run of stitches goes in, split long-and-short.
    // A round (convex, not long) shape is worked toward one pole, the way a fruit is shaded; any other shape along the
    // smoothed inward normal to its middle (a band gets satin across it, split at the axis). With a grain the runs slant
    // toward it (fishbone). Where runs crowd together the inner stitches are dropped, every other one, then every fourth.
    const across = (r, inset, w) => {
      const P = r.pts, per = K.length(P, true), n = Math.max(10, Math.round(per / GAP)), e = K.resample(P, n, true), nn = K.outward(e)
      const sn = nn.map((_, i) => { let x = 0, y = 0; for (let j = -3; j <= 3; j++) { const q = nn[(i + j + n) % n]; x += q[0]; y += q[1] } const l = Math.hypot(x, y) || 1; return [x / l, y / l] })
      const g = r.grain != null ? [Math.cos(r.grain), Math.sin(r.grain)] : null, b = r.bbox
      const radial = !g && hullRatio(P) > 0.9 && Math.max(b.w, b.h) / (Math.min(b.w, b.h) || 1) < 2.1
      const pole = K.centroid(e)
      const ch = e.map((p, i) => {
        let d = [-sn[i][0], -sn[i][1]]
        if (radial) { const s = [p[0] + d[0] * inset, p[1] + d[1] * inset], dx = pole[0] - s[0], dy = pole[1] - s[1], l = Math.hypot(dx, dy) || 1, dd = [dx / l, dy / l]; return { s, d: dd, D: Math.min(l, rayExit(P, s, dd) || l), m: pole } }
        if (g) { const t = Math.sign(d[0] * g[0] + d[1] * g[1]) || 1, gx = g[0] * t, gy = g[1] * t; if (Math.abs(d[0] * g[0] + d[1] * g[1]) < 0.8) { const x = d[0] * 0.82 + gx * 0.57, y = d[1] * 0.82 + gy * 0.57, l = Math.hypot(x, y); d = [x / l, y / l] } }
        const s = [p[0] + d[0] * inset, p[1] + d[1] * inset], D = rayExit(P, s, d) / 2
        return { s, d, D, m: [s[0] + d[0] * D, s[1] + d[1] * D] }
      })
      const rows = []
      ch.forEach((c, i) => {
        if (c.D < 1) return
        const nb = ch[(i + 1) % n], rho = radial ? 0 : K.clamp(Math.hypot(nb.m[0] - c.m[0], nb.m[1] - c.m[1]) / (Math.hypot(nb.s[0] - c.s[0], nb.s[1] - c.s[1]) || 1), 0, 1)
        const cuts = [0]; for (let j = 1; ; j++) { const v = (j - (i % 2 ? 0.45 : 0)) * MAXLEN * (0.92 + 0.16 * (((i * 7 + j * 3) % 5) / 5)); if (v >= c.D - 3) break; cuts.push(v) } cuts.push(c.D)
        for (let j = 0; j + 1 < cuts.length; j++) {
          const f = (cuts[j] + cuts[j + 1]) / 2 / c.D, q = Math.max(0.03, 1 - f * (1 - rho)), lvl = Math.min(5, Math.floor(Math.log2(1 / q)))
          if (j > 0 && i % (1 << lvl) !== 0) continue
          const a = [c.s[0] + c.d[0] * cuts[j], c.s[1] + c.d[1] * cuts[j]], bb = [c.s[0] + c.d[0] * cuts[j + 1], c.s[1] + c.d[1] * cuts[j + 1]], mx = (a[0] + bb[0]) / 2, my = (a[1] + bb[1]) / 2
          if (hidden(r, mx, my)) continue
          ;(rows[j] ||= []).push(st(a, bb, w, floss(colAt(r, mx, my), mx, my)))
        }
      })
      return rows.flat()
    }
    const knotFill = (r, rad) => {
      const out = [], step = rad * 1.75
      for (const [x, y] of K.gridIn(r.pts, step, 0.35, r.i + 3)) if (!hidden(r, x, y)) out.push({ k: 1, a: [x, y], w: rad * (0.9 + 0.2 * ((x * 7 + y) % 1)), c: floss(colAt(r, x, y), x, y) })
      if (!out.length) { const [x, y] = r.centre; out.push({ k: 1, a: [x, y], w: rad, c: floss(colAt(r, x, y), x, y) }) }
      return out
    }
    // seed stitch: on a wall close to the linen the cloth shows between the seeds; the further the wall's colour is from
    // the linen (a mid or dark wall), the closer, longer and fuller the seeds, so the wall reads as its own colour
    const seedFill = (r, step0, cover) => {
      const dc = K.rgb(r.color).reduce((a, v, i) => a + (v - K.rgb(o.linen)[i]) ** 2, 0) ** 0.5 / 441, kk = K.clamp((dc - 0.06) / 0.18)
      const step = step0 * (1 - 0.22 * kk), len0 = 4.4 + 2.4 * kk, sw = (2.3 + 0.6 * kk) * tw, sep = 1.7 + 0.5 * kk
      const out = [], rr = K.rng(r.i * 13 + 1)
      for (const [x, y] of K.gridIn(r.pts, step, 0.8, r.i + 7)) {
        if (cover.some((q) => x > q.b.x0 && x < q.b.x1 && y > q.b.y0 && y < q.b.y1 && K.inside(q.pts, x, y))) continue
        const a = rr() * Math.PI, l = len0 + rr() * 2.8, dx = Math.cos(a) * l / 2, dy = Math.sin(a) * l / 2, c = floss(colAt(r, x, y), x, y), ox = -Math.sin(a) * sep, oy = Math.cos(a) * sep
        out.push(st([x - dx - ox, y - dy - oy], [x + dx - ox, y + dy - oy], sw, c), st([x - dx + ox, y - dy + oy], [x + dx + ox, y + dy + oy], sw, c))
      }
      return out
    }
    const splitStitch = (pts, len, w, c, it) => {
      const s = K.resample(pts, Math.max(4, Math.round(K.length(pts, true) / (len * 0.7))), true), n = s.length, out = []
      for (let i = 0; i < n; i++) { const p = s[(i - 1 + n) % n], q = s[i], b = s[(i + 1) % n], A = [p[0] + (q[0] - p[0]) * 0.62, p[1] + (q[1] - p[1]) * 0.62]; if (it && hidden(it, (A[0] + b[0]) / 2, (A[1] + b[1]) / 2)) continue; out.push(st(A, b, w, c)) }
      return out
    }
    const stem = (pts, len, w, c, it, shift = 0) => {
      const Lr = K.length(pts), n = Math.max(2, Math.round(Lr / (len * 0.5))), s = K.resample(pts, n + 2), out = []
      const nn = K.normals(s)
      for (let i = 0; i + 2 < s.length; i++) {
        const a = s[i], b = s[i + 2], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, q = w * 0.28
        const A = [a[0] - (dy / l) * q + nn[i][0] * shift, a[1] + (dx / l) * q + nn[i][1] * shift], B = [b[0] + (dy / l) * q * 0.6 + nn[i][0] * shift, b[1] - (dx / l) * q * 0.6 + nn[i][1] * shift]
        if (it && hidden(it, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2)) continue
        out.push(st(A, B, w, c))
      }
      return out
    }
    const satinBand = (pts, half, w, c, it) => {
      const s = K.resample(pts, Math.max(2, Math.round(K.length(pts) / GAP))), nn = K.normals(s), out = []
      s.forEach((p, i) => { const A = [p[0] - nn[i][0] * half, p[1] - nn[i][1] * half], B = [p[0] + nn[i][0] * half, p[1] + nn[i][1] * half]; if (it && hidden(it, p[0], p[1])) return; out.push(st(A, B, w, c)) })
      return out
    }

    // ---------------------------------------------------------------- drawing thread (batched by colour)
    const tones = new Map()
    const toneOf = (c) => { let t = tones.get(c); if (!t) { t = { hi: K.mix(c, '#ffffff', 0.5), lo: K.mix(c, '#1a120c', 0.38) }; tones.set(c, t) } return t }
    const grp = (m, key) => { let p = m.get(key); if (!p) { p = new Path2D(); m.set(key, p) } return p }
    const drawThreads = (ctx, sts, m, needle) => {
      if (m <= 0) return
      const sh = new Map(), base = new Map(), pin = new Map(), lo = new Map(), gr = new Map(), gl = new Map(), knots = []
      for (let i = 0; i < m; i++) {
        const s = sts[i]
        if (s.k) { knots.push(s); continue }
        const a = s.a, b = s.b, dx = b[0] - a[0], dy = b[1] - a[1], Ls = Math.hypot(dx, dy) || 1, ux = dx / Ls, uy = dy / Ls, w = s.w
        let nx = -uy, ny = ux; if (nx * L[0] + ny * L[1] < 0) { nx = -nx; ny = -ny }
        const sheen = 0.35 + 0.65 * Math.abs(ux * L[1] - uy * L[0]), inset = Math.min(Ls * 0.3, w * 0.25), T = toneOf(s.c), wk = w.toFixed(1)
        let p = grp(sh, wk); p.moveTo(a[0] + AW[0] * 0.9 + 0.2, a[1] + AW[1] * 0.9 + 0.5); p.lineTo(b[0] + AW[0] * 0.9 + 0.2, b[1] + AW[1] * 0.9 + 0.5)
        p = grp(base, s.c + '|' + wk); p.moveTo(a[0] + ux * inset, a[1] + uy * inset); p.lineTo(b[0] - ux * inset, b[1] - uy * inset)
        p = grp(pin, s.c + '|' + wk); p.moveTo(a[0], a[1]); p.lineTo(b[0], b[1])
        p = grp(lo, T.lo + '|' + wk); p.moveTo(a[0] + ux * inset - nx * w * 0.32, a[1] + uy * inset - ny * w * 0.32); p.lineTo(b[0] - ux * inset - nx * w * 0.32, b[1] - uy * inset - ny * w * 0.32)
        const step = Math.max(1.6, w * 1.05), n = Math.floor(Ls / step)
        const g = grp(gr, T.lo + '|' + wk), h = grp(gl, T.hi + '|' + wk + '|' + Math.min(2, Math.floor(sheen * 3)))
        const sx = (nx - ux * 0.7) * w * 0.42, sy = (ny - uy * 0.7) * w * 0.42
        for (let k = 1; k <= n; k++) { const mm = k * step - step * 0.3, cx = a[0] + ux * mm, cy = a[1] + uy * mm; g.moveTo(cx - sx, cy - sy); g.lineTo(cx + sx, cy + sy) }
        for (let k = 0; k < Math.max(1, n); k++) { const mm = Math.min(Ls, k * step + step * 0.25), cx = a[0] + ux * mm + nx * w * 0.16, cy = a[1] + uy * mm + ny * w * 0.16; h.moveTo(cx - ux * step * 0.22, cy - uy * step * 0.22); h.lineTo(cx + ux * step * 0.22, cy + uy * step * 0.22) }
      }
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.strokeStyle = '#3b2c1c'; ctx.globalAlpha = 0.3; for (const [k, p] of sh) { ctx.lineWidth = +k * 1.1; ctx.stroke(p) }
      ctx.globalAlpha = 1; for (const [k, p] of base) { const [c, w] = k.split('|'); ctx.strokeStyle = c; ctx.lineWidth = +w; ctx.stroke(p) }
      for (const [k, p] of pin) { const [c, w] = k.split('|'); ctx.strokeStyle = c; ctx.lineWidth = +w * 0.55; ctx.stroke(p) }
      ctx.globalAlpha = 0.6; for (const [k, p] of lo) { const [c, w] = k.split('|'); ctx.strokeStyle = c; ctx.lineWidth = +w * 0.32; ctx.stroke(p) }
      ctx.globalAlpha = 0.42; for (const [k, p] of gr) { const [c, w] = k.split('|'); ctx.strokeStyle = c; ctx.lineWidth = Math.max(0.45, +w * 0.16); ctx.stroke(p) }
      for (const [k, p] of gl) { const [c, w, sb] = k.split('|'); ctx.globalAlpha = 0.28 + 0.5 * ((+sb + 0.5) / 3); ctx.strokeStyle = c; ctx.lineWidth = Math.max(0.45, +w * 0.22); ctx.stroke(p) }
      ctx.lineCap = 'round'
      for (const s of knots) {
        const [x, y] = s.a, r = s.w, T = toneOf(s.c)
        ctx.globalAlpha = 0.4; ctx.fillStyle = '#3b2c1c'; ctx.beginPath(); ctx.arc(x + AW[0] * r * 0.5, y + AW[1] * r * 0.5 + r * 0.2, r * 1.05, 0, 6.283); ctx.fill()
        ctx.globalAlpha = 1; ctx.fillStyle = T.lo; ctx.beginPath(); ctx.arc(x + AW[0] * r * 0.15, y + AW[1] * r * 0.15, r, 0, 6.283); ctx.fill()
        ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(x - AW[0] * r * 0.12, y - AW[1] * r * 0.12, r * 0.8, 0, 6.283); ctx.fill()
        const ph = (x * 0.37 + y * 0.61) % Math.PI; ctx.strokeStyle = T.lo; ctx.globalAlpha = 0.55; ctx.lineWidth = Math.max(0.5, r * 0.22)
        ctx.beginPath(); ctx.arc(x, y, r * 0.5, ph, ph + 2.2); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, r * 0.78, ph + 3, ph + 4.8); ctx.stroke()
        ctx.fillStyle = T.hi; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(x + L[0] * r * 0.4, y + L[1] * r * 0.4, r * 0.26, 0, 6.283); ctx.fill()
      }
      // the needle at the head of the stitch being made, the working thread trailing from its eye
      if (needle && m < sts.length) {
        const s = sts[m - 1], tip = s.k ? s.a : s.b, a = s.k ? [tip[0] - 1, tip[1] + 1] : s.a, dx = tip[0] - a[0], dy = tip[1] - a[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l
        const eye = [tip[0] + ux * 46, tip[1] + uy * 46 - 6]
        ctx.globalAlpha = 0.25; ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(tip[0] + 2, tip[1] + 4); ctx.lineTo(eye[0] + 2, eye[1] + 4); ctx.stroke()
        ctx.globalAlpha = 1; ctx.strokeStyle = '#b9bcc0'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(eye[0], eye[1]); ctx.stroke()
        ctx.strokeStyle = '#f4f6f8'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(tip[0] - 0.5, tip[1] - 0.5); ctx.lineTo(eye[0] - 0.5, eye[1] - 0.5); ctx.stroke()
        ctx.strokeStyle = s.c; ctx.lineWidth = s.k ? 2 : s.w * 0.8; ctx.beginPath(); ctx.moveTo(eye[0], eye[1]); ctx.quadraticCurveTo(eye[0] + 40, eye[1] - 30, eye[0] + 70, eye[1] + 10); ctx.stroke()
      }
      ctx.restore()
    }
    const sew = (sts, per = 0.012) => { if (sts.length) D.mark(0.2 + sts.length * per, (ctx, k) => drawThreads(ctx, sts, Math.ceil(sts.length * k), k < 1)) }

    // ---------------------------------------------------------------- the cloth: linen in the hoop, slack cloth beyond the ring
    const hx = W / 2, hy = H / 2, RX = W * 0.5 * o.hoop, RY = H * 0.5 * o.hoop, RING = Math.max(18, Math.min(W, H) * 0.028)
    const hasHoop = o.hoop > 0 && (W / 2 / RX) ** 2 + (H / 2 / RY) ** 2 > 1
    const ell = (rx, ry) => { const p = new Path2D(); p.ellipse(hx, hy, rx, ry, 0, 0, Math.PI * 2); return p }
    D.ground(() => {
      D.sheet(o.linen)
      D.mark(0.001, (ctx) => {
        const key = `emb:linen:${env.scale}`
        let t = env.cache.get(key)
        if (!t) {
          const n = Math.round(256 * env.scale), c = K.canvas(n, n), x2 = c.getContext('2d'), img = x2.createImageData(n, n), d = img.data, pitch = 4, nT = 64, rr = K.rng(4411)
          const thick = Array.from({ length: nT * 2 }, () => 0.8 + rr() * 0.22), tint = Array.from({ length: nT * 2 }, () => (rr() < 0.08 ? 0.93 : 1) * (0.975 + rr() * 0.05))
          for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
            const x = i / env.scale, y = j / env.scale, u = x / pitch, v = y / pitch, iu = Math.floor(u) % nT, iv = Math.floor(v) % nT, fu = u % 1, fv = v % 1
            const sl = (K.fbm(7, x * 0.3, y * 0.02 + iu * 9, 0.5, 2, 0) - 0.5) * 0.25, sl2 = (K.fbm(8, x * 0.02 + iv * 9, y * 0.3, 0.5, 2, 0) - 0.5) * 0.25
            const wh = 0.5 * K.clamp(thick[iu] + sl, 0.5, 1.15) * 0.94, fh = 0.5 * K.clamp(thick[nT + iv] + sl2, 0.5, 1.15) * 0.9
            const dw = Math.abs(fu - 0.5), df = Math.abs(fv - 0.5), inW = dw < wh, inF = df < fh, warpTop = ((iu + iv) & 1) === 0
            let b, tt
            if (inW && (warpTop || !inF)) { const cr = Math.cos((dw / wh) * Math.PI * 0.5); b = (0.66 + 0.38 * Math.pow(cr, 0.7)) * (warpTop ? 0.84 + 0.16 * Math.sin(Math.PI * fv) : 0.78); tt = tint[iu] }
            else if (inF) { const cr = Math.cos((df / fh) * Math.PI * 0.5); b = (0.64 + 0.38 * Math.pow(cr, 0.7)) * (!warpTop ? 0.86 + 0.14 * Math.sin(Math.PI * fu) : 0.78); tt = tint[nT + iv] }
            else { b = 0.55; tt = 1 }
            const g = K.clamp(255 * b * tt * 1.06, 0, 255), k = (j * n + i) * 4
            d[k] = d[k + 1] = d[k + 2] = g; d[k + 3] = 255
          }
          x2.putImageData(img, 0, 0); t = c; env.cache.set(key, t)
        }
        const pat = ctx.createPattern(t, 'repeat')
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = pat; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore()
        if (hasHoop) {
          // beyond the ring the cloth is slack: a shade darker, in soft folds running out to the corners
          const out = new Path2D(); out.rect(-10, -10, W + 20, H + 20); out.ellipse(hx, hy, RX + RING, RY + RING, 0, 0, Math.PI * 2)
          ctx.save(); ctx.clip(out, 'evenodd'); ctx.fillStyle = '#5a4630'; ctx.globalAlpha = 0.14; ctx.fillRect(0, 0, W, H)
          const rr = K.rng(91); ctx.lineCap = 'round'
          for (let i = 0; i < 26; i++) {
            const a = rr() * Math.PI * 2, r0 = 0.98 + rr() * 0.05, x0 = hx + Math.cos(a) * (RX + RING) * r0, y0 = hy + Math.sin(a) * (RY + RING) * r0, len = 120 + rr() * 260, b = a + (rr() - 0.5) * 0.5
            const dark = rr() < 0.55; ctx.strokeStyle = dark ? '#3b2a18' : '#fff6e2'; ctx.globalAlpha = dark ? 0.1 : 0.12; ctx.lineWidth = 10 + rr() * 26
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + Math.cos(b + 0.3) * len * 0.5, y0 + Math.sin(b + 0.3) * len * 0.5, x0 + Math.cos(b) * len, y0 + Math.sin(b) * len); ctx.stroke()
          }
          ctx.restore()
        }
      })
    })

    // ---------------------------------------------------------------- what gets which stitch (cached while only lines move)
    const hash = S.regions.reduce((a, r) => a + r.pts.length * 7 + r.pts.reduce((s, p, i) => s + p[0] * (i % 7 + 1) + p[1] * (i % 5 + 2), 0) + r.i * 13 + K.lum(r.color) * 97, 0)
    const ckey = `emb:stitches:${W}x${H}:${hash.toFixed(3)}:${L[0].toFixed(3)}:${tw}:${o.background}:${(o.floss || []).length}`
    let plan = env.cache.get(ckey)
    if (!plan) {
      plan = { outlines: [], fills: [], knots: [], ground: [] }
      const solidish = S.regions.filter((q) => !['shadow', 'highlight'].includes(q.role))
      for (const r of S.regions) {
        if (r.role === 'shadow' || r.role === 'highlight') continue
        const b = r.bbox, small = Math.min(b.w, b.h)
        if (r.role === 'bg' || r.role === 'ground') {
          const cover = solidish.filter((q) => q.i > r.i && q.bbox.x0 < b.x1 && q.bbox.x1 > b.x0 && q.bbox.y0 < b.y1 && q.bbox.y1 > b.y0)
          if (r.role === 'bg' && o.background === 'bare') continue
          if (r.role === 'bg' && o.background !== 'laid') plan.ground.push({ r, sts: seedFill(r, 8.2 * tw, cover.map((q) => ({ pts: q.pts, b: q.bbox }))) })
          else plan.ground.push({ r, sts: laid(r, r.grain ?? (r.role === 'bg' ? Math.PI / 2 : 0), GAP * 1.08, 36 * tw, FW, cover.map((q) => q.pts)) })
          continue
        }
        if (r.role === 'glow') {
          const cover = solidish.filter((q) => q.i > r.i && q.bbox.x0 < b.x1 && q.bbox.x1 > b.x0 && q.bbox.y0 < b.y1 && q.bbox.y1 > b.y0)
          plan.fills.push(laid(r, r.grain ?? 0, GAP, MAXLEN, FW, cover.map((q) => q.pts)))
          continue
        }
        const roundish = r.area / (b.w * b.h || 1) > 0.6 && Math.max(b.w, b.h) / (small || 1) < 2.2
        if (r.role === 'detail' && r.area < 3200 && roundish) { plan.knots.push(knotFill(r, 2.5 * tw)); continue }
        if (small < 5) { plan.fills.push(stem(K.resample(r.pts, 12, true).slice(0, 7), 8, FW * 0.8, floss(colAt(r, r.centre[0], r.centre[1]), 0, 0), r)); continue }
        if (r.contour) plan.outlines.push(splitStitch(r.pts, 8, 2.3 * tw, floss(K.rgb(K.mix(r.shade, '#000000', 0.25)), r.centre[0], r.centre[1]), r))
        const boxy = r.area / (b.w * b.h || 1) > 0.89, cover = () => solidish.filter((q) => q.i > r.i && q.bbox.x0 < b.x1 && q.bbox.x1 > b.x0 && q.bbox.y0 < b.y1 && q.bbox.y1 > b.y0).map((q) => q.pts)
        // a flat thing is laid along its grain; a box-like thing in satin across its short side; anything else across its form
        if (r.form < 0.3 && r.role !== 'detail') plan.fills.push(laid(r, r.grain ?? 0, GAP, MAXLEN, FW, cover()))
        else if (boxy && r.grain == null) plan.fills.push(laid(r, b.w < b.h ? 0 : Math.PI / 2, GAP, MAXLEN, FW, cover()))
        else plan.fills.push(across(r, r.contour ? 1.8 : 0.3, FW))
        // a glint on a round thing: a few French knots in the palest thread where the light lands
        if (r.form > 0.8 && small > 70) {
          const gx = b.cx + L[0] * b.w * 0.24, gy = b.cy + L[1] * b.h * 0.27, kk = []
          for (let i = 0; i < 5; i++) { const x = gx + Math.cos(i * 2.4) * (2 + i * 2.6), y = gy + Math.sin(i * 2.4) * (2 + i * 2.6) * 0.7; if (!hidden(r, x, y) && K.inside(r.pts, x, y)) kk.push({ k: 1, a: [x, y], w: 2.6 * tw, c: floss(K.rgb(K.mix(r.lit, '#ffffff', 0.55)), x, y) }) }
          if (kk.length) plan.knots.push(kk)
        }
      }
      env.cache.set(ckey, plan)
    }

    // ---------------------------------------------------------------- lines: stem stitch (two rows when thick), satin for a bar
    const lineSts = S.lines.map((l) => {
      const c = floss(K.rgb(l.color), l.pts[0][0], l.pts[0][1]), pts = K.smooth(l.pts, false, 5)
      if (l.w >= 10) return satinBand(pts, l.w / 2, FW, c, l)
      const rows = Math.max(1, Math.round(l.w / 3.4)), w = Math.max(2.2, Math.min(3.2, l.w * 0.8)) * tw, out = []
      for (let j = 0; j < rows; j++) out.push(...stem(pts, 9, w, c, l, (j - (rows - 1) / 2) * w * 0.95))
      return out
    })

    const clipHoop = (fn) => (hasHoop ? D.clip(K.ellipse(hx, hy, RX, RY, 160), fn) : fn())
    D.pass('split-stitch outlines', 1.2, () => clipHoop(() => { for (const s of plan.outlines) sew(s, 0.01) }))
    D.pass('satin and long-and-short fills', 4, () => clipHoop(() => { for (const s of plan.fills) sew(s, 0.006) }))
    D.pass('background worked round the motif', 2, () => clipHoop(() => { for (const g of plan.ground) sew(g.sts, 0.004) }))
    D.pass('stem stitch', 0.8, () => clipHoop(() => { for (const s of lineSts) sew(s, 0.02) }))
    D.pass('french knots', 0.6, () => clipHoop(() => { for (const s of plan.knots) sew(s, 0.04) }))

    // ---------------------------------------------------------------- the beech hoop, over everything: its shadows on the cloth, the ring
    D.top(() => {
      if (!hasHoop) return
      D.mark(0.001, (ctx) => {
        const ring = new Path2D(); ring.ellipse(hx, hy, RX + RING, RY + RING, 0, 0, Math.PI * 2); ring.ellipse(hx, hy, RX, RY, 0, 0, Math.PI * 2)
        ctx.save()
        ctx.fillStyle = '#2b1d10'
        for (let k = 0; k < 6; k++) { ctx.globalAlpha = 0.06; ctx.save(); ctx.translate(AW[0] * (4 + k * 2.2), AW[1] * (4 + k * 2.2) + 1); ctx.fill(ring, 'evenodd'); ctx.restore() }
        ctx.globalAlpha = 1; ctx.fillStyle = o.wood; ctx.fill(ring, 'evenodd')
        // the lit half of the ring and the half in shade
        ctx.save(); ctx.clip(ring, 'evenodd'); ctx.beginPath(); const ang = Math.atan2(AW[1], AW[0]), R2 = W + H
        ctx.moveTo(hx, hy); ctx.arc(hx, hy, R2, ang - Math.PI / 2, ang + Math.PI / 2); ctx.closePath(); ctx.fillStyle = K.mix(o.wood, '#5a3a18', 0.28); ctx.fill()
        const rr = K.rng(515); ctx.lineCap = 'round'
        for (let i = 0; i < 60; i++) { const f = rr(), a0 = rr() * Math.PI * 2, a1 = a0 + 0.2 + rr() * 0.9; ctx.strokeStyle = rr() < 0.5 ? K.mix(o.wood, '#5a3a18', 0.35) : K.mix(o.wood, '#fff0d0', 0.3); ctx.globalAlpha = 0.35 + rr() * 0.3; ctx.lineWidth = 0.7 + rr() * 1; ctx.beginPath(); ctx.ellipse(hx, hy, RX + RING * (0.1 + f * 0.8), RY + RING * (0.1 + f * 0.8), 0, a0, a1); ctx.stroke() }
        ctx.restore()
        ctx.globalAlpha = 0.6; ctx.strokeStyle = '#fbe6be'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(hx, hy, RX + RING - 2, RY + RING - 2, 0, Math.atan2(L[1], L[0]) - 1.2, Math.atan2(L[1], L[0]) + 1.2); ctx.stroke()
        ctx.globalAlpha = 0.55; ctx.strokeStyle = '#6e4a26'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(hx, hy, RX + 1, RY + 1, 0, 0, Math.PI * 2); ctx.stroke()
        ctx.restore()
      })
    })
  },
}

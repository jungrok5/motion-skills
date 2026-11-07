// Toy-theatre paper collage — studied from anidoodle's paperCraft plate (paperCraft.ts, styles/paperCraft.md) and
// re-made for the scene model. A cardboard toy theatre stood on a kraft-paper table. The scene is built inside its
// proscenium from three kinds of paper: printed and plain sugar papers (the backdrop is a printed wallpaper, the floor a
// wood print or plain sugar paper), GOUACHE CUT-OUTS (flat opaque paint in visible brush strokes on white card, cut out
// with a white sticker margin: every round thing, every small part), and card itself, whose darker cut edge shows on the
// side away from the light. Every flat stands a finger's width in front of the one behind and throws a soft shadow
// whose distance is that gap. No drawn line anywhere: lines are strips of card.
// Order: the theatre set on the table; the backdrop flown in; the flats stood up back to front (from the wings, with a
// little landing jiggle); strips and steam; the curtains swung in and the valance lowered. Paint never moves.
// Not cut-paper: that is torn plain paper lying flat; this is painted and printed card standing in a stage space.
import { p2d, tear, scissor, strip, fibres, liftShadow, PRINTS } from './_craft.js'

const WHITE = '#fbf9f2'

export default {
  id: 'toy-theatre', name: 'Toy-theatre paper collage', ko: '종이 인형극 무대',
  medium: 'a cardboard toy theatre: printed and sugar papers, gouache-painted card cut-outs with a white margin, flats standing apart on a stage',
  mark: 'the gouache brush stroke on card and the printed motif; every round thing a painted cut-out with a white sticker margin',
  edge: 'scissor-crisp (or torn for floors), a darker card edge on the side away from the light, a white margin round every cut-out',
  order: ['the theatre set on the table', 'backdrop flown in', 'flats stood up, back to front', 'strips and steam', 'curtains and valance'],
  paper: 'kraft-paper table; a teal proscenium printed with diamonds and trimmed in gold; white card under the paint',
  palette: "gouache versions of the subject's colours (lit, local, shade laid as strokes); printed papers for walls and floors; theatre teal, red and gold",
  bestFor: '동화, 무대, 계절 인사 · 아기자기한 장면 · 이야기의 한 장면',
  source: 'anidoodle paperCraft.ts · styles/paperCraft.md',
  // table: kraft table colour · frame / trim / curtain: proscenium teal, gold, curtain red · backstage: the dark inside the box
  // margin: white sticker margin (px, 1 = default scale) · gap: how far the flats stand apart (1 = default)
  // prints: printed papers to choose from for walls (dots, diamonds, stripes, sprigs, checks, waves) · curtains: false to leave them out
  defaults: { table: '#b8905f', frame: '#2f6f73', trim: '#e1b54a', curtain: '#b8302c', backstage: '#2a2320', margin: 1, gap: 1, prints: ['sprigs', 'diamonds', 'stripes', 'dots'], curtains: true },
  draw(D, S, K, o) {
    const W = S.W, H = S.H, L = S.light, AW = [-L[0], -L[1]]
    // ---- the stage: the whole scene is set inside the proscenium opening, scaled to fit
    const bx0 = W * 0.025, by0 = H * 0.022, bx1 = W * 0.975, by1 = H * 0.955 // the theatre box on the table
    const k = Math.min((W * 0.8) / W, (H * 0.76) / H), ow = W * k, oh = H * k, ox = (W - ow) / 2, oy = by0 + H * 0.115
    const OPEN = [[ox, oy], [ox + ow, oy], [ox + ow, oy + oh], [ox, oy + oh]]
    const T = (pts) => pts.map(([x, y]) => [ox + x * k, oy + y * k])
    const inScene = (ctx) => { ctx.translate(ox, oy); ctx.scale(k, k) }
    const rng = K.rng(S.seed * 7 + 1)

    D.ground(() => {
      D.sheet(o.table)
      D.mark(0.001, (ctx) => fibres(ctx, p2d([[0, 0], [W, 0], [W, H], [0, H]]), { x0: 0, y0: 0, w: W, h: H }, o.table, 9, 0.8))
    })

    // ---- the theatre: box shadow on the table, the dark inside, the proscenium (printed card, gold strips), the apron
    D.pass('the theatre set on the table', 1, () => {
      const box = [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]], bp = p2d(box), hole = p2d(box, OPEN)
      D.mark(0.6, (ctx) => {
        liftShadow(ctx, bp, AW[0] * 14, AW[1] * 14 + 6, 16, 0.42, '#2a1c10')
        ctx.fillStyle = K.mix(o.frame, '#000000', 0.45); ctx.save(); ctx.translate(AW[0] * 2.5, AW[1] * 2.5); ctx.fill(bp); ctx.restore() // the card edge
        ctx.fillStyle = o.backstage; ctx.fillRect(ox, oy, ow, oh)
        ctx.fillStyle = o.frame; ctx.fill(hole, 'evenodd')
        ctx.save(); ctx.clip(hole, 'evenodd'); ctx.globalAlpha = 0.45; PRINTS.diamonds(ctx, { x0: bx0, y0: by0, x1: bx1, y1: by1, w: bx1 - bx0, h: by1 - by0 }, K.mix(o.frame, '#0b1f22', 0.5)); ctx.globalAlpha = 1
        fibres(ctx, hole, { x0: bx0, y0: by0, w: bx1 - bx0, h: by1 - by0 }, o.frame, 21, 0.5); ctx.restore()
        // gold strips: a border round the box and round the opening, a cartouche over the arch
        ctx.fillStyle = o.trim
        const band = (x0, y0, x1, y1, t) => { ctx.fill(p2d([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], [[x0 + t, y0 + t], [x1 - t, y0 + t], [x1 - t, y1 - t], [x0 + t, y1 - t]]), 'evenodd') }
        band(bx0 + 10, by0 + 10, bx1 - 10, by1 - 10, 5); band(ox - 16, oy - 16, ox + ow + 16, oy + oh + 16, 6)
        const cx = W / 2, cy = (by0 + oy) / 2 - 4, rw = Math.min(110, W * 0.1), rh = (oy - by0) * 0.32
        ctx.beginPath(); ctx.ellipse(cx + AW[0] * 2, cy + AW[1] * 2, rw, rh, 0, 0, Math.PI * 2); ctx.fillStyle = K.mix(o.trim, '#000000', 0.4); ctx.fill()
        ctx.beginPath(); ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2); ctx.fillStyle = o.trim; ctx.fill()
        ctx.beginPath(); ctx.ellipse(cx, cy, rw - 8, rh - 7, 0, 0, Math.PI * 2); ctx.fillStyle = o.curtain; ctx.fill()
        ctx.beginPath(); ctx.ellipse(cx, cy, rw * 0.36, rh * 0.42, 0, 0, Math.PI * 2); ctx.fillStyle = o.trim; ctx.fill()
        // the apron: a strip of wood-print card, footlights as gold half-moons
        const ay = oy + oh + 22, ap = [[ox - 30, ay], [ox + ow + 30, ay], [ox + ow + 30, by1 - 22], [ox - 30, by1 - 22]]
        if (by1 - 22 - ay > 14) {
          const app = p2d(ap); ctx.fillStyle = '#9a6a3c'; ctx.fill(app)
          ctx.save(); ctx.clip(app); PRINTS.wood(ctx, K.bbox(ap), '#5b3a1e', 7); ctx.restore()
          ctx.fillStyle = o.trim; const n = Math.max(5, Math.round(ow / 120))
          for (let i = 0; i < n; i++) { const x = ox + ((i + 0.5) / n) * ow; ctx.beginPath(); ctx.arc(x, ay + 2, 9, Math.PI, 0); ctx.fill() }
        }
      })
    })

    // ---- every region becomes a piece: printed / sugar paper, or a gouache cut-out with a white margin
    const room = new Set(['bg', 'ground', 'glow', 'highlight'])
    const under = (r) => { for (let j = S.solid.length - 1; j >= 0; j--) { const q = S.solid[j]; if (q.i < r.i && K.inside(q.pts, r.centre[0], r.centre[1])) return q.color } return S.bg }
    const paints = (r) => !room.has(r.role) && r.role !== 'shadow' && (r.form >= 0.35 || r.role === 'detail') && r.contour
    const gouache = (ctx, r, path, seed, dens = 1) => {
      const b = r.bbox, size = Math.sqrt(r.area), len = K.clamp(size * 0.22, 10, 46), w = K.clamp(size * 0.07, 3.5, 14)
      const dir = r.grain ?? Math.atan2(L[1], L[0]) + Math.PI / 2, g = K.rng(seed)
      const n = Math.min(260, Math.max(8, Math.round(((b.w * b.h) / (len * w)) * 1.5 * dens)))
      ctx.save(); ctx.clip(path); ctx.lineCap = 'round'
      for (let i = 0; i < n; i++) {
        const x = b.x0 + g() * b.w, y = b.y0 + g() * b.h, t = r.toneAt(x, y), a = dir + (g() - 0.5) * 0.4, l = len * (0.6 + g() * 0.7)
        const c = t > 0.74 ? K.mix(r.color, r.lit, 0.75) : t < 0.4 ? K.mix(r.color, r.shade, t < 0.26 ? 0.85 : 0.55) : K.mix(r.color, g() < 0.5 ? '#ffffff' : '#1d2430', 0.06)
        ctx.strokeStyle = c; ctx.globalAlpha = 0.55 + g() * 0.35; ctx.lineWidth = w * (0.7 + g() * 0.6)
        ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * l / 2, y - Math.sin(a) * l / 2); ctx.quadraticCurveTo(x + (g() - 0.5) * w, y + (g() - 0.5) * w, x + Math.cos(a) * l / 2, y + Math.sin(a) * l / 2); ctx.stroke()
      }
      // the painted shade laid along the side away from the light, and one dab of light
      if (r.form >= 0.5 && size > 40) {
        for (let i = 0; i < 18; i++) {
          const u = g() * Math.PI * 2, rr = 0.75 + g() * 0.3, x = b.cx + Math.cos(u) * b.w * 0.5 * rr, y = b.cy + Math.sin(u) * b.h * 0.5 * rr
          if (Math.cos(u) * AW[0] + Math.sin(u) * AW[1] < 0.25) continue
          const a = u + Math.PI / 2 + (g() - 0.5) * 0.3, l = len * (0.8 + g() * 0.6)
          ctx.strokeStyle = r.shade; ctx.globalAlpha = 0.35 + g() * 0.3; ctx.lineWidth = w * (0.6 + g() * 0.5)
          ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * l / 2, y - Math.sin(a) * l / 2); ctx.lineTo(x + Math.cos(a) * l / 2, y + Math.sin(a) * l / 2); ctx.stroke()
        }
        const hx = b.cx + L[0] * b.w * 0.24, hy = b.cy + L[1] * b.h * 0.26
        ctx.globalAlpha = 0.85; ctx.strokeStyle = K.mix(r.lit, '#ffffff', 0.45); ctx.lineWidth = w * 0.8
        ctx.beginPath(); ctx.moveTo(hx - Math.cos(dir) * len * 0.3, hy - Math.sin(dir) * len * 0.3); ctx.lineTo(hx + Math.cos(dir) * len * 0.3, hy + Math.sin(dir) * len * 0.3); ctx.stroke()
      }
      ctx.restore()
    }
    const ease = (u) => 1 - (1 - u) ** 2
    // one flat stood up: it travels in (held, its shadow wide), lands with a damped jiggle, and is still
    const stand = (r, { from, cost, kind, printName }) => {
      const seed = r.i * 31 + 7, b = r.bbox, size = Math.sqrt(r.area)
      const torn = r.role === 'ground' && r.bbox.y0 > 4 ? 3 : 0
      const face = torn ? tear(r.pts, torn, seed) : scissor(r.pts, seed)
      const fp = p2d(face), fb = K.bbox(face)
      const m = kind === 'gouache' ? K.clamp(size / 40, 3, 7) * o.margin : 0
      const gap = o.gap * (r.role === 'bg' ? 0 : r.role === 'shadow' || r.role === 'highlight' ? 0 : 3 + 10 * (1 - r.depth))
      let color = r.color
      if (r.role === 'glow') color = r.lit
      const pc = K.mix(color, K.lum(color) > 0.5 ? '#3b3226' : '#ffffff', 0.3)
      const edge = kind === 'gouache' ? '#bfb5a0' : K.mix(color, '#0b1a2a', 0.45)
      const pivot = [b.cx, b.cy], sgn = seed % 2 ? 1 : -1
      D.mark(cost, (ctx, kk) => {
        let dx = 0, dy = 0, rot = 0, lift = 0
        if (kk < 1) {
          if (kk < 0.62) { const e = ease(kk / 0.62); dx = from[0] * (1 - e); dy = from[1] * (1 - e); rot = sgn * 0.04 * (1 - e); lift = 1 - 0.6 * e }
          else { const v = (kk - 0.62) / 0.38, damp = Math.exp(-4 * v) * (1 - v); dy = -2.2 * Math.abs(Math.sin(v * 9)) * damp; rot = sgn * 0.035 * Math.sin(v * 13 + 0.6) * damp; lift = 0.4 * (1 - v) }
        }
        ctx.save(); inScene(ctx); ctx.translate(pivot[0] + dx, pivot[1] + dy); ctx.rotate(rot); ctx.translate(-pivot[0], -pivot[1])
        const sd = gap * (1 + 2.2 * lift)
        if (sd > 0) {
          if (m) { ctx.save(); ctx.translate(AW[0] * sd, AW[1] * sd); ctx.lineJoin = 'round'; ctx.lineWidth = 2 * m; ctx.strokeStyle = '#2a1c10'; ctx.globalAlpha = 0.3; ctx.stroke(fp); ctx.restore() }
          liftShadow(ctx, fp, AW[0] * sd, AW[1] * sd, 2 + sd * 0.5, 0.36 - 0.1 * lift, '#2a1c10')
        }
        // the card's cut edge, then the white margin a pair of scissors leaves round a painted cut-out
        ctx.lineJoin = 'round'
        ctx.save(); ctx.translate(AW[0] * 1.6 + 0.4, AW[1] * 1.6 + 0.8); ctx.fillStyle = edge; ctx.fill(fp); if (m) { ctx.lineWidth = 2 * m; ctx.strokeStyle = edge; ctx.stroke(fp) } ctx.restore()
        if (m) { ctx.fillStyle = WHITE; ctx.fill(fp); ctx.lineWidth = 2 * m; ctx.strokeStyle = WHITE; ctx.stroke(fp) }
        ctx.fillStyle = color; ctx.fill(fp)
        if (kind === 'gouache') gouache(ctx, r, fp, seed + 3)
        else {
          ctx.save(); ctx.clip(fp)
          if (printName === 'wood') { PRINTS.wood(ctx, fb, K.mix(color, '#2b1a0c', 0.45), seed) }
          else if (printName) { ctx.globalAlpha = 0.5; PRINTS[printName](ctx, { ...fb, x1: fb.x1, y1: fb.y1 }, pc); ctx.globalAlpha = 1 }
          ctx.restore()
          fibres(ctx, fp, fb, color, seed + 5, 0.5)
        }
        ctx.restore()
      })
    }
    // painted straight onto the flat beneath: a cast shadow (darker gouache) or light falling on a wall (paler gouache)
    const paintOn = (r) => {
      const seed = r.i * 13 + 2, b = r.bbox, path = p2d(r.pts), base = under(r)
      const col = r.role === 'shadow' ? K.mix(base, K.mix(r.color, '#101018', 0.3), 0.35 + 0.35 * r.strength) : K.mix(base, K.lighten(r.color, 0.35), 0.6)
      const w = K.clamp(Math.min(b.w, b.h) * 0.22, 6, 26), n = Math.min(160, Math.max(10, Math.round((b.w * b.h) / (w * w * 3.2))))
      D.mark(0.4 + Math.sqrt(r.area) / 300, (ctx, kk) => {
        ctx.save(); inScene(ctx); ctx.clip(path); ctx.fillStyle = col; ctx.globalAlpha = 0.55; ctx.fill(path)
        const g = K.rng(seed); ctx.lineCap = 'round'; ctx.strokeStyle = col; const m = Math.ceil(n * kk)
        for (let i = 0; i < m; i++) { const x = b.x0 + g() * b.w, y = b.y0 + g() * b.h, a = (g() - 0.5) * 0.4; ctx.globalAlpha = 0.35 + g() * 0.3; ctx.lineWidth = w * (0.6 + g() * 0.6); ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * w * 1.6, y - Math.sin(a) * w * 1.6); ctx.lineTo(x + Math.cos(a) * w * 1.6, y + Math.sin(a) * w * 1.6); ctx.stroke() }
        ctx.restore()
      })
    }
    let pi = 0
    const place = (r) => {
      if (r.role === 'shadow' || r.role === 'highlight') return paintOn(r)
      const b = r.bbox, big = r.area > W * H * 0.15
      const kind = paints(r) ? 'gouache' : 'paper'
      let printName = null
      if (r.role === 'bg' && r.area > W * H * 0.05) printName = o.prints[[...r.color].reduce((a, c) => a + c.charCodeAt(0), r.i + S.seed) % o.prints.length]
      else if (r.role === 'ground') { const [hh, ss, ll] = K.toHsl(r.color); printName = ss > 0.2 && hh > 10 && hh < 50 && ll < 0.6 ? 'wood' : null }
      const flown = r.role === 'bg' || r.role === 'glow' || r.depth >= 0.8
      const from = flown ? [0, -(b.y1 + 60)] : r.role === 'ground' ? [(b.cx < W / 2 ? -1 : 1) * W * 0.6, 0] : r.role === 'detail' ? [0, -90 - rng() * 40] : [(b.cx < W / 2 ? -1 : 1) * (Math.min(b.cx, W - b.cx) + b.w * 0.6 + 40), 0]
      stand(r, { from, kind, printName, cost: big ? 1.1 : 0.5 + Math.sqrt(r.area) / 180 })
      pi++
    }
    let split = S.items.findIndex((it) => it.kind === 'region' && !room.has(it.role) && it.depth < 0.8)
    if (split < 0) split = S.items.length
    const back = S.items.slice(0, split).filter((it) => it.kind === 'region'), front = S.items.slice(split).filter((it) => it.kind === 'region')
    // a scene with no wall of its own still gets a plain sugar-paper drop of its background colour
    const drop = S.regions.some((r) => r.role === 'bg') ? null : { i: -1, role: 'bg', pts: [[-10, -10], [W + 10, -10], [W + 10, H + 10], [-10, H + 10]], color: S.bg, lit: K.litOf(S.bg), shade: K.shadeOf(S.bg), depth: 1, form: 0, contour: false, area: W * H, bbox: { x0: -10, y0: -10, x1: W + 10, y1: H + 10, w: W + 20, h: H + 20, cx: W / 2, cy: H / 2 }, centre: [W / 2, H / 2], toneAt: () => 0.6 }
    D.pass('backdrop flown in', 1.6, () => D.clip(OPEN, () => { if (drop) place(drop); for (const r of back) place(r) }))
    D.pass('flats stood up, back to front', 4, () => D.clip(OPEN, () => { D.pause(0.4); for (const r of front) place(r) }))

    // ---- lines: strips of card (dark) and white painted card curls (light: steam, a window bar), jittering on twos when alive
    D.pass('strips and steam', 1.1, () => D.clip(OPEN, () => {
      for (const l of S.lines) {
        const light = K.isLight(l.color), half = Math.max(light ? 3 : 1.6, l.w * 0.5), seed = l.i * 19 + 1
        const band = strip(K.smooth(l.pts, false, 6), half), face = scissor(band, seed, 3), fp = p2d(face)
        const m = light && l.role === 'steam' ? 2.5 * o.margin : 0, col = light ? K.mix(l.color, '#ffffff', 0.4) : l.color
        const j = D.frame ? K.rng(D.frame * 7 + l.i) : null, jx = j ? (j() - 0.5) * 1.4 : 0, jy = j ? (j() - 0.5) * 1.4 : 0
        const gap = o.gap * (3 + 8 * (1 - l.depth))
        const lb = K.bbox(l.pts), cut = S.solid.filter((q) => q.i > l.i && q.bbox.x0 < lb.x1 && q.bbox.x1 > lb.x0 && q.bbox.y0 < lb.y1 && q.bbox.y1 > lb.y0).map((q) => T(q.pts))
        const draw = () => D.mark(0.35, (ctx) => {
          ctx.save(); inScene(ctx); ctx.translate(jx, jy); ctx.lineJoin = 'round'
          liftShadow(ctx, fp, AW[0] * gap, AW[1] * gap, 2 + gap * 0.4, 0.3, '#2a1c10')
          ctx.save(); ctx.translate(AW[0] * 1.4, AW[1] * 1.4); ctx.fillStyle = light ? '#bfb5a0' : K.mix(col, '#000000', 0.4); ctx.fill(fp); if (m) { ctx.lineWidth = 2 * m; ctx.strokeStyle = '#bfb5a0'; ctx.stroke(fp) } ctx.restore()
          if (m) { ctx.lineWidth = 2 * m; ctx.strokeStyle = WHITE; ctx.stroke(fp) }
          ctx.fillStyle = col; ctx.fill(fp)
          ctx.restore()
        })
        if (cut.length) D.layer({ cut }, draw); else draw()
      }
    }))

    // ---- the curtains swung in, the valance lowered, the proscenium's shadow thrown into the stage
    D.pass('curtains and valance', 1, () => {
      const frameHole = p2d([[-50, -50], [W + 50, -50], [W + 50, H + 50], [-50, H + 50]], OPEN)
      D.mark(0.3, (ctx) => { ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, ow, oh); ctx.clip(); liftShadow(ctx, frameHole, AW[0] * 10, AW[1] * 10, 9, 0.5, '#1a1008', 'evenodd'); ctx.restore() })
      if (!o.curtains) return
      const curtain = (side) => {
        const x0 = side < 0 ? ox - 30 : ox + ow + 30, inn = (f) => (side < 0 ? ox + ow * f : ox + ow - ow * f)
        const tie = oy + oh * 0.58
        const pts = [[x0, oy - 10], [inn(0.06), oy - 10], ...K.smooth([[inn(0.06), oy - 10], [inn(0.035), oy + oh * 0.3], [inn(0.006), tie]], false, 8), ...K.smooth([[inn(0.006), tie], [inn(0.016), oy + oh * 0.8], [inn(0.026), oy + oh + 10]], false, 8), [x0, oy + oh + 10]]
        const cp = p2d(pts), cb = K.bbox(pts)
        D.mark(0.6, (ctx) => {
          liftShadow(ctx, cp, AW[0] * 8, AW[1] * 8, 6, 0.4, '#1a1008')
          ctx.fillStyle = K.mix(o.curtain, '#000000', 0.4); ctx.save(); ctx.translate(AW[0] * 1.6, AW[1] * 1.6); ctx.fill(cp); ctx.restore()
          ctx.fillStyle = o.curtain; ctx.fill(cp)
          ctx.save(); ctx.clip(cp); ctx.lineCap = 'round'; const g = K.rng(side + 40)
          for (let i = 0; i < 26; i++) { const x = cb.x0 + g() * cb.w, sh = g() < 0.5; ctx.strokeStyle = sh ? K.mix(o.curtain, '#2a0808', 0.45) : K.mix(o.curtain, '#ffd0b0', 0.25); ctx.globalAlpha = 0.45; ctx.lineWidth = 4 + g() * 8; ctx.beginPath(); ctx.moveTo(x, cb.y0); ctx.quadraticCurveTo(x + (tie - cb.y0) * 0.02 * side, tie, x + (g() - 0.5) * 10, cb.y1); ctx.stroke() }
          ctx.restore()
          const tx = inn(0.006) - side * 8; ctx.fillStyle = K.mix(o.trim, '#000000', 0.35); ctx.beginPath(); ctx.arc(tx + 1.5, tie + 2, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = o.trim; ctx.beginPath(); ctx.arc(tx, tie, 10, 0, Math.PI * 2); ctx.fill()
          ctx.fillRect(tx - 3, tie + 8, 6, 22)
        })
      }
      curtain(-1); curtain(1)
      // the valance: a scalloped band of red card with a gold fringe, overlapping the top of the opening
      const vh = oh * 0.045, sc = Math.max(6, Math.round(ow / 90)), top = oy - 22
      const vpts = [[ox - 22, top]]
      vpts.push([ox + ow + 22, top])
      for (let i = sc; i >= 0; i--) { const x0 = ox - 22 + ((ow + 44) * i) / sc, x1 = ox - 22 + ((ow + 44) * (i - 1)) / sc; if (i === 0) break; for (let s = 0; s <= 8; s++) { const u = s / 8; vpts.push([K.lerp(x0, x1, u), oy + vh * 0.4 + Math.sin(u * Math.PI) * vh]) } }
      const vp = p2d(vpts), vb = K.bbox(vpts)
      D.mark(0.6, (ctx) => {
        liftShadow(ctx, vp, AW[0] * 8, AW[1] * 8, 6, 0.45, '#1a1008')
        ctx.fillStyle = K.mix(o.curtain, '#000000', 0.4); ctx.save(); ctx.translate(AW[0] * 1.6, AW[1] * 1.6); ctx.fill(vp); ctx.restore()
        ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = o.trim; ctx.stroke(vp)
        ctx.fillStyle = o.curtain; ctx.fill(vp)
        ctx.save(); ctx.clip(vp); ctx.lineCap = 'round'; const g = K.rng(77)
        for (let i = 0; i < 30; i++) { const x = vb.x0 + g() * vb.w; ctx.strokeStyle = g() < 0.5 ? K.mix(o.curtain, '#2a0808', 0.4) : K.mix(o.curtain, '#ffd0b0', 0.22); ctx.globalAlpha = 0.4; ctx.lineWidth = 5 + g() * 6; ctx.beginPath(); ctx.moveTo(x, vb.y0); ctx.lineTo(x + (g() - 0.5) * 6, vb.y1); ctx.stroke() }
        ctx.restore()
      })
    })
    D.top(() => D.texture('paper', { opacity: 0.2 }))
  },
}

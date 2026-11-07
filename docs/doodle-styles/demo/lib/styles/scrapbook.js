// Archival scrapbook — studied from anidoodle's scrapbook plate (scrapbook.ts, scrapbookKit.ts, styles/scrapbook.md).
// A page from an old field-notes album: rag paper gone to parchment, foxed with rust spots, darker toward its handled
// edges, folded once. On it a card torn from other stock, laid down and held with yellowed cellulose tape (or pegged
// to a twine line). The picture on the card is a COPPERPLATE ENGRAVING: every tone a burin line that swells where it
// is pressed and comes to a point where it lifts, breaking into the paper where the tone is light; contour hatching
// that bows round the form, cross-hatching only in the darks, cast shadows ruled in level lines; afterwards a thin
// hand tint. Then words: a typed caption (the piece's title) on a slip, a red-pen mark, and a rubber stamp last.
// The scene stays the main thing: the card holds ~80% of the sheet and the dressing stays at its edges.
// Re-implemented for the scene model: the engraving is cut from the scene's value plate (S.tone) region by region.
//
// defaults (overridable from a house style / piece tweaks):
//   page, card     the album page and the card stock
//   ink            the engraving's sepia-black
//   tint           strength of the hand tint (0 = a plain engraving)
//   gap            burin line spacing in px at 1080
//   tape           the cellulose tape colour;  hold: 'tape' | 'peg' | 'both' (a clothespin on a twine line)
//   fig            the figure number typed before the title; caption: overrides the piece title
//   pen, stamp     red-pen and stamp-pad colours;  stampText: the stamp's word
import { cleanPlate, sceneKey, visibleRuns } from './_book.js'

const CUTS = new Map() // engraving cache: the cuts depend only on the regions + dark lines + settings, so life reuses them

export default {
  id: 'scrapbook', name: 'Archival scrapbook', ko: '오래된 스크랩북',
  medium: 'a hand-tinted copperplate engraving on a torn card, taped into a foxed rag-paper album with a typed caption',
  mark: 'the burin line: swelling with the tone, pointed at both ends, breaking into bare paper in the lights; cross-hatch in the darks',
  edge: 'torn deckle on the card, no drawn outline round anything that is paper; inside the picture, an engraved contour heavier on the shade side',
  order: ['card laid', 'engraving: contours', 'engraving: shading', 'engraving: cross-hatch & shadows', 'hand tint', 'tape', 'labels'],
  paper: 'parchment rag paper, foxed and folded; the card a paler stock with fibres',
  palette: 'sepia-black ink, thin hand-tint washes of the local colours, yellowed tape, a red pen and a red stamp',
  bestFor: '기록 · 아카이브 · 박물지 · 회상 · 설명이 붙는 그림',
  source: 'anidoodle scrapbook.ts · scrapbookKit.ts · styles/scrapbook.md',
  defaults: { page: '#e8d6b2', card: '#f2eadb', ink: '#2a2019', tint: 0.55, gap: 6, tape: '#efe0a8', hold: 'tape', fig: 'Fig. 1.', caption: '', pen: '#c23a2a', stamp: '#b8322a', stampText: 'ARCHIVE' },

  draw(D, S, K, o) {
    const W = S.W, H = S.H, L = S.light, unit = Math.min(W, H) / 1080, INK = o.ink
    // ---- where the picture sits: on a card, a little turned, with room below for the caption
    const bw = 22 * unit, mx = 0.06 * W, mt = 0.055 * H, mb = Math.max(0.13 * H, 130 * unit)
    const s = Math.min((W - 2 * mx - 2 * bw) / W, (H - mt - mb - 2 * bw) / H), pw = W * s, ph = H * s
    const cx = W / 2, cy = mt + bw + ph / 2, rot = -0.013, ca = Math.cos(rot), sa = Math.sin(rot)
    const T = ([x, y]) => { const u = (x - W / 2) * s, v = (y - H / 2) * s; return [cx + u * ca - v * sa, cy + u * sa + v * ca] }
    const Tp = (pts) => pts.map(T)
    const onCard = ([u, v]) => [cx + u * ca - v * sa, cy + u * sa + v * ca] // card-local → page
    const picRect = Tp([[0, 0], [W, 0], [W, H], [0, H]])
    const cardOutline = tear(K, [[-pw / 2 - bw, -ph / 2 - bw], [pw / 2 + bw, -ph / 2 - bw], [pw / 2 + bw, ph / 2 + bw], [-pw / 2 - bw, ph / 2 + bw]], 2.4 * unit, 11).map(onCard)
    const shOff = [-L[0] * 7 * unit, -L[1] * 7 * unit] // paper lifts a little and throws its shadow away from the lamp

    // ---- the engraving, cut from the value plate (cached: life only moves light lines, which are knocked out, not cut)
    const gapS = (o.gap || 6) * unit / s, wmax = (o.gap || 6) * unit * 0.66, step = 2.4 / s
    const key = [o.gap, s, sceneKey(S, K)].join('|')
    let E = CUTS.get(key)
    if (!E) { E = engrave(S, K, { gapS, wmax, step, T, s, L }); CUTS.set(key, E); if (CUTS.size > 6) CUTS.delete(CUTS.keys().next().value) }

    // light lines (steam, a white bar) are never cut: they are left as bare card, knocked out where they can be seen
    const lightTubes = S.lines.filter((l) => K.isLight(l.color)).flatMap((l) => visibleRuns(K, l.pts, S.occluders(l, { light: false })).map((run) => ({ i: l.i, pts: K.tube(Tp(run), (l.w / 2 + 1.5) * s, (l.w / 2 + 1.5) * s, false) })))
    const cutFor = (r) => [...S.occluders(r, { light: false }).map(Tp), ...lightTubes.filter((t) => t.i > r.i).map((t) => t.pts)]

    // ---- the page: parchment, uneven age, handled edges, a fold, a tide mark, foxing in drifts — there before anything
    D.ground(() => D.mark(0.001, (ctx) => page(ctx, K, W, H, unit, o.page)))

    // ---- the card: held high (shadow far), slid in, pressed down
    D.pass('card laid', 0.5, () => {
      D.mark(1.5, (ctx, k) => {
        const e = 1 - (1 - k) ** 3, dx = -60 * unit * (1 - e), dy = 50 * unit * (1 - e), lift = 1 + 5 * (1 - e) ** 2
        const sh = cardOutline.map(([x, y]) => [x + dx + shOff[0] * lift, y + dy + shOff[1] * lift])
        softShadow(ctx, K, sh, 4 * lift * unit, 0.3 / Math.sqrt(lift))
        const c = cardOutline.map(([x, y]) => [x + dx, y + dy])
        ctx.save(); ctx.fillStyle = o.card; K.path(ctx, c); ctx.fill()
        fibres(ctx, K, c, o.card, 17, unit)
        ctx.globalAlpha = 0.35; ctx.strokeStyle = K.mix(o.card, '#7a5a30', 0.35); ctx.lineWidth = 1.2 * unit; K.path(ctx, c); ctx.stroke() // the handled deckle
        if (k >= 1) { // the plate mark: the copper plate pressed a shallow rectangle into the card
          const pm = Tp([[-14 / s * unit, -14 / s * unit], [W + 14 / s * unit, -14 / s * unit], [W + 14 / s * unit, H + 14 / s * unit], [-14 / s * unit, H + 14 / s * unit]])
          ctx.globalAlpha = 0.28; ctx.strokeStyle = '#8a7350'; ctx.lineWidth = 1.4 * unit; K.path(ctx, pm.map(([x, y]) => [x + 1, y + 1])); ctx.stroke()
          ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fffaf0'; K.path(ctx, pm); ctx.stroke()
        }
        ctx.restore()
      })
    })

    // ---- the burin: a pass of line work over the picture, each region its own layer so nothing hidden is ever cut
    // (what is hidden is never cut: occlusion is in the cached geometry; one layer per pass knocks the light lines out)
    const knock = lightTubes.map((t) => t.pts)
    const cutPass = (name, weight, group) => D.pass(name, weight, () => {
      D.layer({ cut: knock, alpha: 0.96 }, () => D.clip(picRect, () => {
        for (const g of E[group]) if (g.cuts.length) D.mark(g.len / 900, (ctx, k) => burinAll(ctx, g.cuts, k, INK))
      }))
    })
    cutPass('engraving: contours', 1.1, 'contours')
    cutPass('engraving: shading', 2.6, 'hatch')
    cutPass('engraving: cross-hatch & shadows', 1.4, 'cross')

    // ---- the hand tint: thin washes spread from where the brush touched, multiplied over the lines
    D.pass('hand tint', 1.1, () => {
      const t = o.tint ?? 0.55
      if (t <= 0) { D.pause(1); return }
      for (const r of S.regions) {
        if (r.role === 'shadow' || r.role === 'highlight') continue
        const big = r.role === 'bg' || r.role === 'ground', glow = r.role === 'glow'
        const col = glow ? K.mix(r.color, '#ffd27a', 0.3) : K.adjust(r.color, { sat: 1.3, light: 1.08 })
        D.layer({ blend: 'multiply', soften: 1.2, tooth: 'gran', cut: cutFor(r) }, () => D.clip(picRect, () =>
          D.wash(Tp(r.pts), col, { alpha: Math.min(1, t * (glow ? 1 : big ? 0.55 : 1.05)), seed: r.i + 5, shrink: big ? 1 : 0.97, edge: (big ? 5 : 8) * unit, dx: 2 * unit, dy: 2 * unit, from: T(K.litPoint(r, L)), rimW: 1.6 * unit })))
      }
    })

    // ---- tape (or a peg on twine): yellowed, translucent, a torn zig-zag at each end, laid from one end
    D.pass('tape', 0.45, () => {
      const hw = pw / 2 + bw, hh = ph / 2 + bw
      if (o.hold === 'peg' || o.hold === 'both') {
        const tw = [[-20, mt * 0.55], [W * 0.3, mt * 0.62], [W * 0.7, mt * 0.6], [W + 20, mt * 0.5]]
        D.mark(1, (ctx, k) => twine(ctx, K, tw, k, unit))
        D.mark(0.8, (ctx, k) => peg(ctx, K, onCard([0, -hh + 8 * unit]), k, unit, shOff))
      }
      if (o.hold !== 'peg') {
        const strips = [[[-hw + 6 * unit, -hh + 6 * unit], -0.72], [[hw - 6 * unit, -hh + 6 * unit], 0.75], [[hw - 8 * unit, hh - 6 * unit], -0.7], [[-hw + 8 * unit, hh - 6 * unit], 0.68]]
        strips.forEach(([at, a], j) => D.mark(0.5, (ctx, k) => tape(ctx, K, onCard(at), a + rot, 120 * unit, 30 * unit, k, 40 + j, o.tape, shOff, unit)))
      }
    })

    // ---- labels: a typed slip with the title, a red-pen mark, the stamp rocked on last
    D.pass('labels', 0.9, () => {
      const text = `${o.fig ? o.fig + ' ' : ''}${o.caption || S.title || 'Untitled'}`
      const cap = 26 * unit, cardBottom = cy + ph / 2 + bw, slipY = cardBottom + (H - cardBottom) * 0.48, slipX = mx + 18 * unit, srot = 0.012
      const font = `${cap}px 'Courier New', 'Liberation Mono', 'DejaVu Sans Mono', 'WenQuanYi Zen Hei Mono', monospace`
      const slip = { x: slipX, y: slipY, rot: srot, text, font, cap, figLen: o.fig ? [...o.fig].length : 0 }
      D.mark(0.6, (ctx, k) => drawSlip(ctx, K, slip, k, 0, unit, shOff))
      D.mark(Math.max(1, [...text].length * 0.08), (ctx, k) => drawSlip(ctx, K, slip, 1, Math.ceil([...text].length * k), unit, shOff, true))
      // the red pen: a loop round the figure number and a quick underline under the title
      const R = K.rng(77), m = slip.metrics || measureSlip(slip)
      const fx = slipX + 14 * unit, fw = o.fig ? m.figW : 0
      if (fw > 0) {
        const loop = Array.from({ length: 30 }, (_, i) => { const a = -2.2 + (i / 29) * Math.PI * 2.15, rr = 1 + 0.08 * Math.sin(i * 0.7); return [fx + fw / 2 + Math.cos(a) * (fw / 2 + 12 * unit) * rr, slipY + Math.sin(a) * (cap * 0.85) * rr] })
        D.stroke(loop, { w: 2.4 * unit, color: o.pen, alpha: 0.85, taper: 0.7, pressure: 0.5, wobble: 1.2 * unit, smooth: true, seed: 5, cost: 0.5 })
      }
      const ux0 = fx + fw + m.gapW, ux1 = fx + m.textW, uy = slipY + cap * 0.75
      D.stroke(Array.from({ length: 12 }, (_, i) => [K.lerp(ux0, ux1 + 10 * unit, i / 11), uy + Math.sin(i * 1.3 + R() * 2) * 2 * unit + i * 0.4 * unit]), { w: 2 * unit, color: o.pen, alpha: 0.85, taper: 0.9, pressure: 0.6, wobble: 0.8 * unit, smooth: true, seed: 6, cost: 0.4 })
      // the stamp: double border, a word and a date, broken by the pad and the paper; rocked on from one end
      const sw = 200 * unit, sh = 74 * unit, sxc = W - mx - sw / 2 - 6 * unit, syc = cardBottom + (H - cardBottom) * 0.52
      D.layer({ blend: 'multiply', tooth: 'speck', alpha: 0.82 }, () => D.layer({ tooth: 'mottle' }, () => D.mark(0.6, (ctx, k) => stamp(ctx, K, sxc, syc, sw, sh, -0.09, o.stamp, o.stampText, k, unit))))
    })

    D.top(() => { D.texture('paper', { opacity: 0.12 }); D.mark(0.001, (ctx) => vignette(ctx, W, H)) })
  },
}

// ------------------------------------------------------------------ the engraving
function engrave(S, K, { gapS, wmax, step, T, s, L }) {
  const plate = cleanPlate(S, K, { skipLight: true })
  const dark = (x, y) => K.clamp((1 - plate.tone(x, y) - 0.06) * 1.3)
  const out = { contours: [], hatch: [], cross: [] }
  const push = (list, i, cuts, line = false) => { let len = 0; for (const c of cuts) len += c.pts.length; list.push({ i, cuts, len: len * 2.4, line }) }
  const hider = (it) => {
    const boxes = S.occluders(it, { light: false }).map((q) => [q, K.bbox(q)])
    return boxes.length ? ([x, y]) => boxes.some(([q, b]) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && K.inside(q, x, y)) : () => false
  }
  const along = (r, ang, gap, width, bend) => {
    const hid = hider(r), b = r.bbox, R = Math.hypot(b.w, b.h) / 2 + gap, c = Math.cos(ang), sn = Math.sin(ang), cuts = [], pts = r.pts
    const nv = Math.ceil((2 * R) / gap)
    for (let j = 0; j <= nv; j++) {
      const v = -R + j * gap
      let run = null
      for (let u = -R; u <= R; u += step) {
        const vv = v + (bend ? bend(u, v, R) : 0), x = b.cx + u * c - vv * sn, y = b.cy + u * sn + vv * c
        let w = 0
        if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && K.inside(pts, x, y) && !hid([x, y])) w = width(x, y)
        if (w > 0.32) { (run ||= { pts: [], w: [] }).pts.push(T([x, y])); run.w.push(w) }
        else if (run) { if (run.pts.length > 2) cuts.push(run); run = null }
      }
      if (run && run.pts.length > 2) cuts.push(run)
    }
    return cuts
  }
  for (const r of S.regions) {
    if (r.role === 'glow' || r.role === 'highlight') continue
    if (r.role === 'shadow') { // cast shadows ruled in level lines, heavier with strength
      push(out.cross, r.i, along(r, 0, gapS * 0.8, (x, y) => wmax * 0.85 * K.clamp(0.25 + r.strength) * K.clamp(dark(x, y) * 1.3 + 0.1), null))
      continue
    }
    const big = r.role === 'bg' || r.role === 'ground'
    const ang = r.grain ?? (big ? 0 : Math.atan2(L[1], L[0]) + Math.PI / 2 + 0.3)
    const nA = [-Math.sin(ang), Math.cos(ang)], away = nA[0] * -r.light[0] + nA[1] * -r.light[1] > 0 ? 1 : -1
    // the lines bow round a round form, toward its shade side; wood and ground take a gentle wander
    const bend = big ? (u, v) => (K.fbm(r.i * 7 + 3, u * 0.6, v * 0.3, 0.01, 2) - 0.5) * gapS * (r.role === 'ground' ? 2.2 : 0.6)
      : (u, v, R) => away * r.form * 0.32 * R * (1 - (u / R) ** 2)
    const gap = gapS * (r.role === 'bg' ? 1.2 : 1)
    // a wall or sky keeps a hairline everywhere (an engraved sky never just stops); things break into bare paper in their lights
    const hw = r.role === 'bg' ? (x, y) => wmax * (0.1 + 0.9 * K.clamp((dark(x, y) - 0.08) / 0.75) ** 1.1) : (x, y) => wmax * K.clamp((dark(x, y) - 0.1) / 0.7) ** 1.05
    push(out.hatch, r.i, along(r, ang, gap, hw, bend))
    push(out.cross, r.i, along(r, ang + 1.15, gap * 1.05, (x, y) => wmax * 0.8 * K.clamp((dark(x, y) - 0.56) / 0.32), big ? null : (u, v, R) => away * r.form * 0.1 * R * (1 - (u / R) ** 2)))
    if (r.contour) { // the contour: a burin line round the outline, heavier where it turns from the lamp
      const d = K.densify(r.pts, step * 1.6, true), nd = K.outward(d), hid = hider(r)
      const ws = d.map((p, i) => (hid(p) ? 0 : (0.55 + 1.5 * K.clamp(-K.facing(nd[i], r.light) * 0.8 + 0.35)) * s * (r.role === 'detail' ? 0.8 : 1)))
      const vis = ws.map((w) => w > 0), cuts = []
      if (vis.every(Boolean)) cuts.push({ pts: [...d, d[0]].map(T), w: [...ws, ws[0]], closed: true })
      else if (vis.some(Boolean)) { // start the walk at a hidden point so every visible run is whole
        const n = d.length, s0 = vis.findIndex((v) => !v)
        let run = null
        for (let j = 0; j <= n; j++) { const i = (s0 + j) % n; if (vis[i]) { (run ||= { pts: [], w: [] }).pts.push(T(d[i])); run.w.push(ws[i]) } else if (run) { if (run.pts.length > 2) cuts.push(run); run = null } }
      }
      push(out.contours, r.i, cuts)
    }
  }
  for (const l of S.lines) {
    if (K.isLight(l.color)) continue
    const d = K.densify(l.pts, step * 1.6), n = d.length
    const hid = hider(l)
    const cuts = []
    let run = null
    d.forEach((p, i) => {
      if (hid(p)) { if (run && run.pts.length > 2) cuts.push(run); run = null; return }
      const t = i / (n - 1 || 1), w = Math.max(0.5, Math.min(l.w, 5) * 0.55) * (0.65 + 0.7 * Math.sin(t * Math.PI)) * Math.max(0.6, s)
      ;(run ||= { pts: [], w: [] }).pts.push(T(p)); run.w.push(w)
    })
    if (run && run.pts.length > 2) cuts.push(run)
    push(out.contours, l.i, cuts, true)
  }
  return out
}
/** fill one tapering burin ribbon; the ends come to a point over a few samples, as a graver lifts */
function ribbonFill(ctx, s, w, upto = s.length, tip = 3, closed = false) {
  const n = Math.min(upto, s.length)
  if (n < 2) return
  const Lp = [], Rp = []
  for (let i = 0; i < n; i++) {
    const a = s[Math.max(0, i - 1)], b = s[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1
    const e = closed && n === s.length ? 1 : Math.min(1, (i + 0.6) / tip, (n - i - 0.4) / tip), h = (w[i] * e) / 2
    Lp.push([s[i][0] - (dy / l) * h, s[i][1] + (dx / l) * h]); Rp.push([s[i][0] + (dy / l) * h, s[i][1] - (dx / l) * h])
  }
  ctx.beginPath(); Lp.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); for (let i = n - 1; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]); ctx.closePath(); ctx.fill()
}
/** cuts[0 .. k·n): whole lines, and the one in progress partly — the graver travelling */
function burinAll(ctx, cuts, k, ink) {
  ctx.save(); ctx.fillStyle = ink
  const n = k >= 1 ? cuts.length : k * cuts.length, whole = Math.floor(n)
  for (let i = 0; i < whole; i++) ribbonFill(ctx, cuts[i].pts, cuts[i].w, cuts[i].pts.length, 3, cuts[i].closed)
  if (whole < cuts.length && n > whole) { const c = cuts[whole]; ribbonFill(ctx, c.pts, c.w, Math.max(2, Math.floor(c.pts.length * (n - whole)))) }
  ctx.restore()
}

// ------------------------------------------------------------------ paper things
function tear(K, shape, amp, seed) {
  const s = K.resample(shape, Math.max(24, Math.round(K.length(shape, true) / 2.4)), true), nn = K.outward(s), r = K.rng(seed)
  return s.map(([x, y], i) => { const d = (K.fbm(seed, x, y, 0.08, 3) - 0.5) * amp * 2.2 + (r() - 0.5) * amp * 0.7; return [x + nn[i][0] * d, y + nn[i][1] * d] })
}
function softShadow(ctx, K, pts, blur, alpha) {
  ctx.save(); ctx.fillStyle = `rgba(59,42,20,${alpha})`
  // a soft edge without filters: the shape laid a few times, each grown a little, at low alpha
  for (let i = 0; i < 5; i++) { ctx.globalAlpha = 0.32; K.path(ctx, K.offset(pts, (i - 2) * blur * 0.5)); ctx.fill() }
  ctx.restore()
}
function fibres(ctx, K, shape, color, seed, unit) {
  const b = K.bbox(shape), r = K.rng(seed), area = b.w * b.h
  ctx.save(); K.path(ctx, shape); ctx.clip()
  for (let i = 0; i < 6; i++) { const x = b.x0 + r() * b.w, y = b.y0 + r() * b.h, rx = (60 + r() * 160) * unit, g = ctx.createRadialGradient(x, y, 0, x, y, rx), col = r() < 0.5 ? K.mix(color, '#ffffff', 0.3) : K.mix(color, '#6b4a22', 0.12); g.addColorStop(0, K.rgba(col, 1)); g.addColorStop(1, K.rgba(col, 0)); ctx.globalAlpha = 0.22; ctx.fillStyle = g; ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2) }
  ctx.lineCap = 'round'
  const n = Math.round(area / (1400 * unit * unit))
  for (let i = 0; i < n; i++) { const x = b.x0 + r() * b.w, y = b.y0 + r() * b.h, a = r() * Math.PI, l = (2 + r() * 7) * unit; ctx.strokeStyle = r() < 0.6 ? K.mix(color, '#fffdf4', 0.5) : K.mix(color, '#3a2410', 0.28); ctx.globalAlpha = 0.18 + r() * 0.22; ctx.lineWidth = (0.4 + r() * 0.5) * unit; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 2, y + Math.sin(a) * l * 0.5 + (r() - 0.5) * 2, x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke() }
  ctx.restore()
}
function page(ctx, K, W, H, unit, parch) {
  const r = K.rng(301)
  ctx.save(); ctx.fillStyle = parch; ctx.fillRect(-2, -2, W + 4, H + 4)
  // uneven age: broad pale and dark clouds
  for (let i = 0; i < 14; i++) { const x = r() * W, y = r() * H, R = (120 + r() * 260) * unit, g = ctx.createRadialGradient(x, y, 0, x, y, R), col = r() < 0.55 ? '#f4e7c9' : '#caa874'; g.addColorStop(0, K.rgba(col, 1)); g.addColorStop(1, K.rgba(col, 0)); ctx.globalAlpha = 0.28; ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2) }
  // handled edges darken, the corners most
  const eg = (x0, y0, x1, y1) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(120,78,30,0.34)'); g.addColorStop(1, 'rgba(120,78,30,0)'); ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H) }
  eg(0, 0, 60 * unit, 0); eg(W, 0, W - 70 * unit, 0); eg(0, 0, 0, 55 * unit); eg(0, H, 0, H - 80 * unit)
  // a tide mark from an old spill, lower left
  ctx.globalAlpha = 0.15; ctx.strokeStyle = '#9a6a30'; ctx.lineWidth = 2.2 * unit
  K.path(ctx, K.smooth(Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2, k = 1 + (K.fbm(9, Math.cos(a) * 60, Math.sin(a) * 60, 0.02, 2) - 0.5) * 0.3; return [W * 0.2 + Math.cos(a) * 150 * unit * k, H * 0.93 + Math.sin(a) * 118 * unit * k] }), true, 6)); ctx.stroke()
  // the fold: a pale ridge and its dark valley across the page
  const fy = H * 0.56
  ctx.globalAlpha = 0.22; ctx.strokeStyle = '#fff6df'; ctx.lineWidth = 3 * unit; ctx.beginPath(); ctx.moveTo(0, fy); ctx.bezierCurveTo(W * 0.28, fy - 4 * unit, W * 0.65, fy + 5 * unit, W, fy - 1 * unit); ctx.stroke()
  ctx.globalAlpha = 0.16; ctx.strokeStyle = '#7a5424'; ctx.lineWidth = 1.2 * unit; ctx.beginPath(); ctx.moveTo(0, fy + 2.5 * unit); ctx.bezierCurveTo(W * 0.28, fy - 1.5 * unit, W * 0.65, fy + 7.5 * unit, W, fy + 1.5 * unit); ctx.stroke()
  // foxing: rust spots in drifts (right margin, lower-left corner, along the fold), bare elsewhere
  const drift = (cx, cy, sx, sy, n, big) => { for (let i = 0; i < n; i++) { const x = cx + (r() + r() - 1) * sx, y = cy + (r() + r() - 1) * sy, sz = (0.6 + r() * r() * big) * 2.2 * unit; ctx.globalAlpha = 0.18 + r() * 0.25; ctx.fillStyle = '#a4652a'; K.path(ctx, K.smooth(Array.from({ length: 7 }, (_, k) => { const a = (k / 7) * Math.PI * 2; return [x + Math.cos(a) * sz * (0.8 + r() * 0.4), y + Math.sin(a) * sz * (0.8 + r() * 0.4)] }), true, 4)); ctx.fill(); if (sz > 3 * unit) { ctx.globalAlpha *= 0.5; ctx.beginPath(); ctx.arc(x, y, sz * 2.2, 0, Math.PI * 2); ctx.fill() } } }
  drift(W - 35 * unit, H * 0.33, 30 * unit, 220 * unit, 38, 3); drift(60 * unit, H - 70 * unit, 70 * unit, 60 * unit, 34, 4); drift(W * 0.5, fy, 160 * unit, 12 * unit, 16, 1.5); drift(W - 100 * unit, 60 * unit, 60 * unit, 30 * unit, 10, 2)
  ctx.restore()
}
function vignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.hypot(W, H) * 0.6)
  g.addColorStop(0, 'rgba(96,62,24,0)'); g.addColorStop(1, 'rgba(96,62,24,0.3)')
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore()
}
function tape(ctx, K, at, ang, len, h, k, seed, color, shOff, unit) {
  if (k <= 0) return
  const r = K.rng(seed), e = 1 - (1 - k) ** 3, Lx = len * e, c = Math.cos(ang), s = Math.sin(ang), T = ([x, y]) => [at[0] + x * c - y * s, at[1] + x * s + y * c]
  const top = [], bot = []
  for (let j = 0; j <= 5; j++) top.push([-len / 2 + (r() - 0.5) * 3 * unit + (j % 2 ? 2.5 : -1.5) * unit, -h / 2 + (j * h) / 5])
  const endX = -len / 2 + Lx
  for (let j = 5; j >= 0; j--) bot.push([endX + (k >= 1 ? (j % 2 ? 3 : -2) * unit : 0), -h / 2 + (j * h) / 5])
  const sh = [...top, ...bot].map(T)
  ctx.save()
  ctx.globalAlpha = 0.12; ctx.fillStyle = '#3b2a14'; K.path(ctx, sh.map(([x, y]) => [x + shOff[0] * 0.25, y + shOff[1] * 0.25])); ctx.fill()
  ctx.globalAlpha = 0.5; ctx.fillStyle = color; K.path(ctx, sh); ctx.fill()
  ctx.globalAlpha = 0.28; ctx.fillStyle = '#fffbe8'; K.path(ctx, [[-len / 2 + 4 * unit, -h / 2 + 4 * unit], [endX - 4 * unit, -h / 2 + 4 * unit], [endX - 4 * unit, -h / 2 + 8 * unit], [-len / 2 + 4 * unit, -h / 2 + 9 * unit]].map(T)); ctx.fill() // the sheen along one edge
  ctx.globalAlpha = 0.18; ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 0.7 * unit
  for (let j = 0; j < 3; j++) { const x = -len / 2 + 12 * unit + r() * (Lx - 20 * unit); if (x < endX - 6 * unit) { const a = T([x, -h / 2 + 2 * unit]), b = T([x + (r() - 0.5) * 10 * unit, h / 2 - 2 * unit]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke() } } // crinkles
  ctx.restore()
}
function twine(ctx, K, pts, k, unit) {
  const s = K.upTo(K.smooth(pts, false, 12), k)
  if (s.length < 2) return
  ctx.save(); ctx.lineCap = 'round'
  ctx.globalAlpha = 0.3; ctx.strokeStyle = '#3b2a14'; ctx.lineWidth = 2.4 * unit; K.path(ctx, s.map(([x, y]) => [x + 1.5 * unit, y + 3 * unit]), false); ctx.stroke()
  ctx.globalAlpha = 1; ctx.strokeStyle = '#7a6446'; ctx.lineWidth = 2.1 * unit; K.path(ctx, s, false); ctx.stroke()
  ctx.strokeStyle = '#4c3a24'; ctx.lineWidth = 0.7 * unit; ctx.globalAlpha = 0.6
  for (let i = 2; i < s.length; i += 2) { const [x, y] = s[i]; ctx.beginPath(); ctx.moveTo(x - 1.2 * unit, y - 1.2 * unit); ctx.lineTo(x + 1.2 * unit, y + 1.2 * unit); ctx.stroke() } // the twist
  ctx.restore()
}
function peg(ctx, K, at, k, unit, shOff) {
  if (k <= 0) return
  const e = 1 - (1 - k) ** 3, x = at[0], y = at[1] - 30 * unit - 40 * unit * (1 - e), a = 0.05, c = Math.cos(a), s = Math.sin(a)
  const T = ([u, v]) => [x + (u * c - v * s) * unit, y + (u * s + v * c) * unit]
  const half = (g) => [[g * 1, -40], [g * 10, -40], [g * 11, -30], [g * 9, -6], [g * 12, 14], [g * 11, 40], [g * 1, 40]].map(T)
  ctx.save()
  ctx.globalAlpha = 0.3; ctx.fillStyle = '#3b2a14'; for (const g of [-1, 1]) { K.path(ctx, half(g).map(([px, py]) => [px + shOff[0] * 0.6, py + shOff[1] * 0.6])); ctx.fill() }
  for (const g of [-1, 1]) {
    const sh = half(g); ctx.globalAlpha = 1; ctx.fillStyle = g < 0 ? '#d9b88a' : '#c9a577'; K.path(ctx, sh); ctx.fill()
    ctx.globalAlpha = 0.8; ctx.strokeStyle = '#6b4e2c'; ctx.lineWidth = 0.7 * unit; K.path(ctx, sh); ctx.stroke()
  }
  ctx.globalAlpha = 1; ctx.strokeStyle = '#5b5f63'; ctx.lineWidth = 1.6 * unit
  for (let j = 0; j < 4; j++) { const p = T([-12, -4 + j * 2.6]), q = T([12, -2 + j * 2.6]); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke() } // the spring
  ctx.restore()
}
function measureSlip(slip) {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(4, 4) : document.createElement('canvas'), x = c.getContext('2d')
  x.font = slip.font
  const chars = [...slip.text], adv = chars.map((ch) => x.measureText(ch).width * 1.02)
  const figEnd = slip.figLen || 0
  slip.metrics = { adv, textW: adv.reduce((a, b) => a + b, 0), figW: adv.slice(0, figEnd).reduce((a, b) => a + b, 0), gapW: adv[figEnd] || 0 }
  return slip.metrics
}
function drawSlip(ctx, K, slip, k, nTyped, unit, shOff, typing = false) {
  const m = slip.metrics || measureSlip(slip), pad = 14 * unit, w = m.textW + pad * 2, h = slip.cap * 2
  const e = 1 - (1 - k) ** 3, dy = -14 * unit * (1 - e), c = Math.cos(slip.rot), s = Math.sin(slip.rot)
  const T = ([x, y]) => [slip.x + x * c - y * s, slip.y + dy + x * s + y * c]
  const shape = tearRect(K, w, h, 71).map(([x, y]) => T([x + w / 2, y]))
  ctx.save()
  if (!typing) {
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#3b2a14'; K.path(ctx, shape.map(([x, y]) => [x + shOff[0] * 0.5, y + shOff[1] * 0.5])); ctx.fill()
    ctx.globalAlpha = 1; ctx.fillStyle = '#f6f1e6'; K.path(ctx, shape); ctx.fill()
  }
  if (nTyped > 0) { // each strike its own density and a hair off the line; the ribbon prints faintly double
    const r = K.rng(91), chars = [...slip.text]
    ctx.translate(slip.x, slip.y + dy); ctx.rotate(slip.rot); ctx.font = slip.font; ctx.textBaseline = 'middle'; ctx.fillStyle = '#221d1a'
    let x = pad
    chars.forEach((ch, i) => {
      const dens = 0.68 + r() * 0.32, jy = (r() - 0.5) * slip.cap * 0.07, jx = (r() - 0.5) * slip.cap * 0.03
      if (i < nTyped && ch !== ' ') { ctx.globalAlpha = dens * 0.28; ctx.fillText(ch, x + jx + 0.5 * unit, jy + 0.4 * unit); ctx.globalAlpha = dens; ctx.fillText(ch, x + jx, jy) }
      x += m.adv[i]
    })
  }
  ctx.restore()
}
function tearRect(K, w, h, seed) { return tear(K, [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], 1.2, seed) }
function stamp(ctx, K, x, y, w, h, rot, color, word, k, unit) {
  if (k <= 0) return
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot)
  if (k < 1) { ctx.beginPath(); ctx.rect(-w / 2 - 10, -h / 2 - 10, (w + 20) * k, h + 20); ctx.clip() } // rocked on from one end
  ctx.strokeStyle = color; ctx.fillStyle = color
  const rr = (ww, hh, rad) => { ctx.beginPath(); ctx.moveTo(-ww / 2 + rad, -hh / 2); ctx.arcTo(ww / 2, -hh / 2, ww / 2, hh / 2, rad); ctx.arcTo(ww / 2, hh / 2, -ww / 2, hh / 2, rad); ctx.arcTo(-ww / 2, hh / 2, -ww / 2, -hh / 2, rad); ctx.arcTo(-ww / 2, -hh / 2, ww / 2, -hh / 2, rad); ctx.closePath() }
  ctx.lineWidth = 3.4 * unit; rr(w, h, 10 * unit); ctx.stroke()
  ctx.lineWidth = 1.4 * unit; rr(w - 12 * unit, h - 12 * unit, 6 * unit); ctx.stroke()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = `bold ${h * 0.36}px 'DejaVu Sans', 'Liberation Sans', sans-serif`; ctx.fillText(String(word || '').toUpperCase().split('').join(' '), 0, -h * 0.1)
  ctx.font = `${h * 0.17}px 'Liberation Mono', 'DejaVu Sans Mono', monospace`; ctx.fillText('— N° 0417 —', 0, h * 0.26)
  ctx.restore()
}

// Risograph — studied from anidoodle's lighthouse plate (lighthouse.ts, riso.ts) and its press film (lighthouseDraw.ts).
// A riso print is not drawn, it is FED: the same sheet goes through the duplicator once per ink, a different drum
// loaded each time. Each drum is a stencil of halftone dots (its own screen angle) and a few litho-crayon lines; the
// soy ink multiplies onto the paper through that drum's own slightly-off registration. Every colour that is not one
// of the inks is an OVERPRINT (pink over yellow = orange, blue over yellow = green, all three = a warm near-black);
// white is bare paper, never ink. Re-implemented for the scene model: the scene's shaded colour is SEPARATED into
// ink densities (a small Gauss-Newton fit of the multiply model per colour, cached), not snapped to the nearest ink.
//
// defaults (all overridable from a house style / piece tweaks):
//   paper   the stock colour
//   inks    the drums in print order (first = first through the press); the darkest one is the KEY (crayon lines)
//   angles  screen angle per drum, degrees (same length as inks; rosette, never moiré)
//   pitch   halftone cell in px at 1080 wide (scales with the picture)
//   reg     registration offset per drum, px [dx, dy] — the misregistration that makes riso riso
//   marks   true: registration crosses on the sheet and a swatch bar printed drum by drum
import { visibleRuns, cleanPlate, sceneKey } from './_book.js'

const SEP = new Map() // separation cache: inks+paper+quantised colour → densities (pure, so sharing it is safe)
const SCREENS = new Map() // drum screens per scene + settings: life moves only light lines, which are knocked out, so frames reuse them

export default {
  id: 'risograph', name: 'Risograph', ko: '리소그래프',
  medium: 'soy ink forced through a stencil master on a rotating drum, one drum per colour, the same sheet fed once per ink',
  mark: 'a halftone dot screen per ink at its own angle, multiplied; colours made only by overprint; litho-crayon key lines on the darkest drum',
  edge: 'no drawn edge on the colour: shapes end where the screen ends, each drum a few px off register so overprints fringe',
  order: ['yellow drum', 'pink drum', 'blue drum (key)'],
  paper: 'uncoated warm off-white stock, a little tooth, trim marks',
  palette: 'two or three soy inks (default yellow, fluorescent pink, blue) and their overprints; white is bare paper',
  bestFor: '포스터 · 굿즈 · 잡지 표지 · 경쾌하고 큰 형태',
  source: 'anidoodle lighthouse.ts · lighthouseDraw.ts · riso.ts · styles/lighthouseDraw.md',
  defaults: { paper: '#f5efe2', inks: ['#ffd400', '#ff48b0', '#0078bf'], angles: [0, 75, 15], pitch: 7.4, reg: [[-4.5, 3.5], [4.5, -3], [0, 0]], marks: true },

  draw(D, S, K, o) {
    const W = S.W, H = S.H, L = S.light, paper = o.paper
    const inks = (o.inks || []).slice(0, 4), n = inks.length
    const unit = W / 1080, pitch = (o.pitch || 7.4) * unit
    const angles = inks.map((_, i) => (o.angles?.[i] ?? [0, 75, 15, 45][i]) * Math.PI / 180)
    const regs = inks.map((_, i) => o.reg?.[i] || [[-4.5, 3.5], [4.5, -3], [0, 0], [2, 2]][i])
    const key = inks.reduce((b, c, i) => (K.lum(c) < K.lum(inks[b]) ? i : b), 0) // the darkest drum carries the line work
    const nameOf = (c) => { const [h, s, l] = K.toHsl(c); if (s < 0.15) return l < 0.3 ? 'black' : 'grey'; return h < 20 || h >= 330 ? (l > 0.6 ? 'pink' : 'red') : h < 45 ? 'orange' : h < 70 ? 'yellow' : h < 165 ? 'green' : h < 200 ? 'teal' : h < 260 ? 'blue' : 'purple' }

    // ---- separation: the scene colour → a density per drum, so that paper × Π(1 − d·(1 − ink)) ≈ colour
    const P = K.rgb(paper).map((v) => Math.max(0.05, v / 255)), A = inks.map((c) => K.rgb(c).map((v) => K.clamp(1 - v / 255, 0.02, 0.98)))
    const cacheKey = paper + inks.join('')
    const separate = (rgb) => {
      const q = ((rgb[0] >> 3) << 10) | ((rgb[1] >> 3) << 5) | (rgb[2] >> 3), k = cacheKey + q
      let d = SEP.get(k)
      if (d) return d
      const t = [0, 1, 2].map((c) => Math.log(Math.min(P[c] * 0.995, Math.max(0.02, ((((q >> (10 - 5 * c)) & 31) + 0.5) * 8) / 255)) / P[c]))
      const wt = [1, 1.35, 0.75], mu = 0.004
      d = inks.map(() => 0.3)
      for (let it = 0; it < 14; it++) {
        // residual r_c = Σ ln(1 − d_i a_ic) − ln(t_c / p_c); J_ci = −a_ic / (1 − d_i a_ic)
        const r = [0, 1, 2].map((c) => d.reduce((s, di, i) => s + Math.log(1 - di * A[i][c]), 0) - t[c])
        const J = [0, 1, 2].map((c) => d.map((di, i) => -A[i][c] / (1 - di * A[i][c])))
        const M = d.map((_, i) => d.map((__, j) => [0, 1, 2].reduce((s, c) => s + wt[c] * J[c][i] * J[c][j], i === j ? 1e-3 : 0)))
        const g = d.map((_, i) => -[0, 1, 2].reduce((s, c) => s + wt[c] * J[c][i] * r[c], 0) - mu)
        const step = solve(M, g)
        d = d.map((di, i) => K.clamp(di + step[i]))
      }
      SEP.set(k, d)
      return d
    }

    // ---- the drum screens: dots on a lattice at the drum's angle, each sized by the local density (cached per scene)
    const skey = [cacheKey, angles.join(), pitch, sceneKey(S, K)].join('|')
    let screens = SCREENS.get(skey)
    if (!screens) {
      // light lines are left out of the sampled plate (skipLight): they are knocked out of every drum below instead
      const plate = cleanPlate(S, K, { skipLight: true }), corners = [[0, 0], [W, 0], [0, H], [W, H]]
      screens = inks.map((ink, i) => {
        const a = angles[i], ca = Math.cos(a), sa = Math.sin(a), dots = []
        let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity
        for (const [x, y] of corners) { const u = x * ca + y * sa, v = -x * sa + y * ca; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v) }
        for (let v = Math.floor(v0 / pitch) * pitch; v <= v1 + pitch; v += pitch) for (let u = Math.floor(u0 / pitch) * pitch; u <= u1 + pitch; u += pitch) {
          const x = u * ca - v * sa, y = u * sa + v * ca
          if (x < -pitch || y < -pitch || x > W + pitch || y > H + pitch) continue
          let dd = separate(plate.colorAt(K.clamp(x, 0, W - 1), K.clamp(y, 0, H - 1)))[i]
          if (dd < 0.035) continue
          dd *= 0.9 + 0.2 * K.fbm(31 + i * 7, x, y, 0.004, 2) // the drum starves and floods a little across the sheet
          const r = pitch * (Math.sqrt(dd / Math.PI) + Math.max(0, dd - 0.6) * 0.38)
          if (r > 0.45 * unit) dots.push(x, y, r)
        }
        return new Float32Array(dots)
      })
      SCREENS.set(skey, screens); if (SCREENS.size > 6) SCREENS.delete(SCREENS.keys().next().value)
    }

    // ---- the key drum's litho crayon: shade-side contours and every dark line; light lines are knocked out of every drum
    const crayon = []
    const boilSeed = (s) => s * 31 + D.frame * 7
    const addCrayon = (pts, w, seed, boil) => {
      if (pts.length < 2) return
      const c = K.wobble(K.densify(pts, 4), 0.9 * unit, boil ? boilSeed(seed) : seed)
      crayon.push(K.ribbon(c, { w, taper: 0.95, pressure: 0.9, rough: 0.9, seed }))
    }
    for (const r of S.solid) {
      if (!r.contour) continue
      const fall = r.form > 0.3 ? 0.35 : 0.1
      const occ = S.occluders(r, { light: false })
      for (const run of K.runs(r.pts, (_, nn) => K.facing(nn, L) < fall)) for (const vis of visibleRuns(K, run, occ)) addCrayon(vis, (r.role === 'detail' ? 1.6 : 2.2) * unit, r.i * 13 + vis.length, false)
    }
    const knock = []
    for (const l of S.lines) {
      if (K.isLight(l.color)) { for (const vis of visibleRuns(K, l.pts, S.occluders(l, { light: false }))) knock.push(K.tube(vis, l.w / 2 + 1.2 * unit, l.w / 2 + 1.2 * unit, false)) }
      else for (const vis of visibleRuns(K, l.pts, S.occluders(l, { light: false }))) addCrayon(vis, Math.max(1.4 * unit, Math.min(l.w, 4 * unit)), l.i * 7 + 3, l.role === 'steam')
    }

    // ---- the sheet: stock, trim crosses (on it before any ink)
    D.ground(() => {
      D.sheet(paper)
      if (o.marks) D.mark(0.001, (ctx) => {
        ctx.save(); ctx.strokeStyle = '#1b1b1b'; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.1 * unit
        const m = 26 * unit
        for (const [X, Y] of [[m, m], [W - m, m], [m, H - m], [W - m, H - m]]) {
          ctx.beginPath(); ctx.arc(X, Y, 7 * unit, 0, Math.PI * 2); ctx.moveTo(X - 12 * unit, Y); ctx.lineTo(X + 12 * unit, Y); ctx.moveTo(X, Y - 12 * unit); ctx.lineTo(X, Y + 12 * unit); ctx.stroke()
        }
        ctx.restore()
      })
    })

    // ---- one pass per drum: the ink lands at the nip, a straight front travelling down the sheet, the drum's shadow just ahead
    const feed = (u) => { const a = 0.08; if (u <= 0) return 0; if (u >= 1) return 1; const v = u < a ? (u * u) / (2 * a) : u > 1 - a ? 1 - ((1 - u) * (1 - u)) / (2 * a) : u - a / 2; return v / (1 - a / 2) }
    inks.forEach((ink, i) => {
      const dots = screens[i], lines = i === key ? crayon : [], sw = 28 * unit, sx = W / 2 - n * 16 * unit + i * 32 * unit
      D.pass(`${nameOf(ink)} drum${i === key ? ' (key)' : ''}`, 1, () => {
        if (i > 0) D.pause(1.2) // a breath while the drum is swapped
        D.layer({ blend: 'multiply', off: regs[i], tooth: 'speck', cut: knock }, () => {
          D.mark(10, (ctx, k) => {
            const y = k >= 1 ? H + 20 : feed(k) * (H + 20)
            ctx.save()
            if (k < 1) { ctx.beginPath(); ctx.rect(-20, -20, W + 40, y + 20); ctx.clip() }
            ctx.fillStyle = ink; ctx.beginPath()
            for (let j = 0; j < dots.length; j += 3) { const x = dots[j], yy = dots[j + 1], r = dots[j + 2]; ctx.moveTo(x + r, yy); ctx.arc(x, yy, r, 0, Math.PI * 2) }
            ctx.fill()
            for (const rb of lines) { if (rb.length > 2) { K.path(ctx, rb); ctx.fill() } }
            if (o.marks) ctx.fillRect(sx, H - 34 * unit, sw, 14 * unit) // this drum's swatch in the colour bar
            ctx.restore()
            if (k < 1) { // the drum's shadow riding just ahead of the nip: the one sign of the machine
              const sh = 46 * unit, g = ctx.createLinearGradient(0, y, 0, y + sh)
              g.addColorStop(0, 'rgba(40,30,40,0.22)'); g.addColorStop(0.25, 'rgba(40,30,40,0.1)'); g.addColorStop(1, 'rgba(40,30,40,0)')
              ctx.save(); ctx.fillStyle = g; ctx.fillRect(-20, y, W + 40, sh); ctx.restore()
            }
          })
        })
      })
    })

    D.top(() => { D.texture('paper', { opacity: 0.26 }); D.texture('coldpress', { opacity: 0.22 }) })
  },
}

/** solve a small linear system M x = b (Gaussian elimination with partial pivoting) */
function solve(M, b) {
  const n = b.length, a = M.map((row, i) => [...row, b[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    [a[c], a[p]] = [a[p], a[c]]
    const d = a[c][c] || 1e-9
    for (let r = c + 1; r < n; r++) { const f = a[r][c] / d; for (let k = c; k <= n; k++) a[r][k] -= f * a[c][k] }
  }
  const x = new Array(n).fill(0)
  for (let r = n - 1; r >= 0; r--) { let s = a[r][n]; for (let k = r + 1; k < n; k++) s -= a[r][k] * x[k]; x[r] = s / (a[r][r] || 1e-9) }
  return x
}

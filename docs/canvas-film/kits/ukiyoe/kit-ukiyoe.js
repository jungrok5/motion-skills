/* kit-ukiyoe.js — 우키요에 목판화 (ukiyo-e woodblock handscroll) house style for word-log.  Global: window.Ukiyoe
   Worked example: 잘라 낸 건 다리였다 ④ (sermons/2026-10-11-1cor4/film/scenes/cross-ukiyoe.html). Card: styles/ukiyoe/STYLE.md.

   Rendering model — one long printed sheet (world px) seen through the portrait window:
     paper:  the mount (tan) outside the sheet + the washi tile inside it, drawn straight on the canvas;
     ink:    every block is drawn into ONE ink layer (Ukiyoe.ix, W×H): colour blocks (`fill`) are printed through MF, a
             matrix 2.2 / −1.6 px off register from the sumi key block (`key`, through MK); "paper" (light, foam, mist) is
             cut back out of the ink with `erase` (destination-out) — light in this style is bare paper, never white paint;
     print:  woodgrain (source-atop) + baren rubbing + goma-zuri specks + fibres eroded out of the ink, then the ink is
             laid on the paper (optionally washed back to paper for the end card).
   Depth is oblique (fukinuki): one unit of depth d → (+DX·d, DY·d) = (+.5, −.42) px; LN(d, x, y) maps lane → world.
   A frame:  Ukiyoe.begin(ctx, cam) → draw the world into the ink (blocks, figures) → Ukiyoe.print(ctx, { wash })
             → screen glows → Ukiyoe.captions → Ukiyoe.endCard.
   Pose figures on 8 fps (st8), water on 12 (st12), camera on ones. Load after lib.js (Pilot) and story.js (Story).
   Deterministic: seeded rng only; textures built once in init(); the ink layer is cleared every frame (seek-safe). */
(function () {
  const { clamp, lerp, ss, eo, eio, rng } = Pilot;
  const U = {}, TAU = Math.PI * 2;

  // ------------------------------------------------------------------ palette & type
  const PAL = U.PAL = {
    paper: '#eee2c6', mount: '#bba679', prus: '#1d3a66', prusD: '#13284a', prusL: '#4d6f98', sky: '#8db0c6', skyL: '#bcd0d6',
    sumi: '#231f1c', grey: '#8b8a80', greyL: '#b3b0a2', greyD: '#5f5e58', ochre: '#cf9f4a', ochreL: '#e2c27e', straw: '#c9a45c',
    green: '#8aa152', greenD: '#50703c', greenL: '#b5c07a', pine: '#3e5a3a', skin: '#ecd6b2', road: '#dcc28c', roadD: '#c4a46a',
    rock: '#8e9b8a', rockD: '#66735f', rockF: '#56604f', gorge: '#33465c', wood: '#a27b4b', woodT: '#bf9a66', woodD: '#6e5233',
    beni: '#b8412f', beniT: '#cf6a50', beniC: '#e3a08a', mtn: '#a6bccd', mtn2: '#7f9cb6', steel: '#9aa3a6',
  };
  U.ACCENT = PAL.beni;                                   // the ONE accent block: beni red (the protagonist's thing)
  U.FONTS = ["700 54px 'Noto Serif KR'", "400 28px 'Noto Sans KR'", "500 34px 'Noto Sans KR'"];   // Pilot.run({ fonts })
  U.CAP = { font: "'Noto Serif KR',serif", weight: 700, color: '#231f1c', srcColor: '#3a3430', srcFont: "'Noto Sans KR',sans-serif", shadow: 'rgba(243,231,198,.6)', shadowBlur: 4 };
  U.GY = 1270;                                           // default ground line (world px); init({ ground }) changes it
  U.KW = 2.4;                                            // key line width (world px)
  const KW = U.KW;

  // ------------------------------------------------------------------ oblique depth, vectors, timing
  const DX = U.DX = .5, DY = U.DY = -.42;
  U.LN = (d, x, y) => [x + DX * d, y + DY * d];          // lane-local (depth d, x, y) → world
  const add = U.add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
  const sub = U.sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const len = U.len = v => Math.hypot(v[0], v[1]);
  const nrm = U.nrm = v => { const l = len(v) || 1; return [v[0] / l, v[1] / l]; };
  const lp2 = U.lp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const seg = U.seg = (t, a, b) => clamp((t - a) / (b - a));                            // 0..1 progress of t through [a, b]
  U.st8 = t => Math.floor(t * 8 + 1e-4) / 8;                                           // figures pose on 8 fps
  U.st12 = t => Math.floor(t * 12 + 1e-4) / 12;                                        // water moves on 12 fps
  const st12 = U.st12;
  const hex = U.hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  U.rgba = (h, a) => { const c = hex(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  // trapezoid easing (accelerate over a, cruise, decelerate over a): a walk/run that covers a distance at a steady pace
  U.trap = function (u, a = .1) { u = clamp(u); const vm = 1 / (1 - a); if (u < a) return vm * u * u / (2 * a); if (u > 1 - a) { const r = 1 - u; return 1 - vm * r * r / (2 * a); } return vm * (a / 2 + u - a); };

  // ------------------------------------------------------------------ paths (world coords)
  const poly = U.poly = function (pts, close = true) { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); if (close) p.closePath(); return p; };
  // quadratic-smoothed polyline through the midpoints (closed: a blob)
  const smooth = U.smooth = function (pts, closed = false, p = new Path2D()) {
    const n = pts.length;
    if (!closed) { p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n - 1; i++) p.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2); p.lineTo(pts[n - 1][0], pts[n - 1][1]); return p; }
    const m = i => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
    const s0 = m(n - 1); p.moveTo(s0[0], s0[1]); for (let i = 0; i < n; i++) { const e = m(i); p.quadraticCurveTo(pts[i][0], pts[i][1], e[0], e[1]); } p.closePath(); return p;
  };
  // a limb segment a → b with end radii ra, rb
  const capsule = U.capsule = function (a, b, ra, rb) {
    const d = sub(b, a), l = len(d) || 1, ang = Math.atan2(d[1], d[0]), n = [-d[1] / l, d[0] / l];
    const p = new Path2D(); p.moveTo(a[0] + n[0] * ra, a[1] + n[1] * ra); p.lineTo(b[0] + n[0] * rb, b[1] + n[1] * rb);
    p.arc(b[0], b[1], rb, ang + Math.PI / 2, ang - Math.PI / 2, true); p.lineTo(a[0] - n[0] * ra, a[1] - n[1] * ra);
    p.arc(a[0], a[1], ra, ang - Math.PI / 2, ang + Math.PI / 2, true); p.closePath(); return p;
  };
  const circ = U.circ = function (c, r) { const p = new Path2D(); p.arc(c[0], c[1], r, 0, TAU); return p; };
  // two-bone IK with fixed bone lengths l1, l2 (a = root, b = target); the middle joint goes to the side of `pref`
  const ik = U.ik = function (a, b, l1, l2, pref) {
    let d = sub(b, a), D = len(d); const mx = l1 + l2 - .5; if (D > mx) { b = add(a, d, mx / D); d = sub(b, a); D = mx; }
    D = Math.max(D, Math.abs(l1 - l2) + .5);
    const ang = Math.atan2(d[1], d[0]), c = clamp((l1 * l1 + D * D - l2 * l2) / (2 * l1 * D), -1, 1), off = Math.acos(c);
    const m1 = [a[0] + Math.cos(ang + off) * l1, a[1] + Math.sin(ang + off) * l1], m2 = [a[0] + Math.cos(ang - off) * l1, a[1] + Math.sin(ang - off) * l1];
    const mid = lp2(a, b, .5), s1 = (m1[0] - mid[0]) * pref[0] + (m1[1] - mid[1]) * pref[1], s2 = (m2[0] - mid[0]) * pref[0] + (m2[1] - mid[1]) * pref[1];
    return [s1 >= s2 ? m1 : m2, b];
  };

  // ------------------------------------------------------------------ periodic noise → seamless tiles
  function hI(x, y, s) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
  function pn(x, y, P, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), m = k => ((k % P) + P) % P;
    const a = hI(m(xi), m(yi), s), b = hI(m(xi + 1), m(yi), s), c = hI(m(xi), m(yi + 1), s), d = hI(m(xi + 1), m(yi + 1), s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function pf(x, y, P, s, o = 4) { let t = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { t += a * pn(x * f, y * f, P * f, s + i * 7); n += a; a *= .5; f *= 2; } return t / n; }
  function tile(w, h, fn) { const c = Pilot.canvas(w, h), x = c.getContext('2d'), id = x.createImageData(w, h), d = id.data;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = (j * w + i) * 4, v = fn(i, j); d[k] = v[0]; d[k + 1] = v[1]; d[k + 2] = v[2]; d[k + 3] = v[3]; }
    x.putImageData(id, 0, 0); return c; }
  function wrapStrokes(x, T, n, seed, fn) { const R = rng(seed); for (let i = 0; i < n; i++) { const st = fn(R); for (const ox of [-T, 0, T]) for (const oy of [-T, 0, T]) { x.save(); x.translate(ox, oy); st(x); x.restore(); } } }

  // ------------------------------------------------------------------ setup
  const TX = U.TX = {};
  let INK, ix, MK, MF, W, H, SHEET;
  /* init(o) — build the textures (~0.5 s) and the W×H ink layer. Call once from the scene's init().
     o.sheet [x0, y0, x1, y1]: the printed sheet in world px (outside it the tan mount shows; default 0,−520,2900,2250).
     o.ground: the default ground line y for figures (world px, default 1270). Exposes Ukiyoe.ix (the ink context), TX. */
  U.init = function (o = {}) {
    W = Pilot.W; H = Pilot.H; U.W = W; U.H = H;
    SHEET = U.SHEET = o.sheet || [0, -520, 2900, 2250]; U.GY = o.ground ?? U.GY;
    INK = Pilot.canvas(W, H); ix = INK.getContext('2d'); U.INK = INK; U.ix = ix;
    buildTextures();
  };
  function buildTextures() {
    const T = 512;
    const P = hex(PAL.paper);
    TX.paper = tile(T, T, (i, j) => { const m = pf(i / T * 6, j / T * 6, 6, 3) - .5, f = pf(i / T * 40, j / T * 40, 40, 9, 2) - .5, v = m * 20 + f * 7; return [P[0] + v, P[1] + v * .95, P[2] + v * .8, 255]; });
    { const x = TX.paper.getContext('2d'); x.lineCap = 'round';
      for (const [n, col, a, lw, L, sd] of [[700, '#fbf6e9', .35, 1, 40, 7], [260, '#c7b893', .2, .8, 34, 8], [40, '#f9f3e3', .4, 1.5, 90, 9]])
        wrapStrokes(x, T, n, sd, R => { let px = R() * T, py = R() * T, ang = R() * TAU; const l = L * (.3 + R()), al = a * (.4 + R() * .6), w = lw * (.5 + R()), pts = [[px, py]];
          for (let s = 0; s < 5; s++) { ang += (R() - .5) * .9; px += Math.cos(ang) * l / 5; py += Math.sin(ang) * l / 5; pts.push([px, py]); }
          return c => { c.globalAlpha = al; c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts) c.lineTo(q[0], q[1]); c.stroke(); }; }); }
    // woodgrain: iso-lines of a warped field (horizontal rings), for source-atop on the ink
    const GT = 1024;
    TX.grain = tile(GT, GT, (i, j) => { const w = pf(i / GT * 3, j / GT * 3, 3, 21, 3); let u = j / GT * 40 + w * 7 + Math.sin(i / GT * TAU * 2) * .8;
      const k1 = Math.hypot((i - 300) * .4, j - 420), k2 = Math.hypot((i - 800) * .4, j - 820); u += 2.2 * Math.exp(-k1 * k1 / 3000) + 1.6 * Math.exp(-k2 * k2 / 2400);
      const f = u - Math.floor(u), d = Math.abs(f - .5) * 2, line = d > .82 ? Math.pow((d - .82) / .18, 1.6) : 0, band = .5 + .5 * Math.sin(u * .9);
      return [24, 20, 30, (line * .8 + band * .25) * 255]; });
    // goma-zuri specks (destination-out)
    TX.speck = tile(T, T, (i, j) => { const m = pf(i / T * 8, j / T * 8, 8, 31, 2), r = hI(i, j, 77), p = .015 + .3 * Math.pow(m, 3.5); return [0, 0, 0, r < p ? 90 + hI(i, j, 78) * 150 : 0]; });
    // baren rubbing (destination-out): blurred arcs + zigzags
    { const c = Pilot.canvas(T, T), x = c.getContext('2d'); x.filter = 'blur(5px)'; x.lineCap = 'round';
      wrapStrokes(x, T, 70, 61, R => { const cx = R() * T, cy = R() * T, r = 30 + R() * 110, a0 = R() * TAU, a1 = a0 + 1 + R() * 3.2, al = .05 + R() * .12, w = 10 + R() * 26;
        return c => { c.strokeStyle = `rgba(0,0,0,${al})`; c.lineWidth = w; c.beginPath(); c.arc(cx, cy, r, a0, a1); c.stroke(); }; });
      wrapStrokes(x, T, 18, 62, R => { const pts = [[R() * T, R() * T]], al = .04 + R() * .07, w = 14 + R() * 20; for (let k = 0; k < 5; k++) pts.push([pts[k][0] + 40 + R() * 50, pts[k][1] + (k % 2 ? 1 : -1) * (20 + R() * 30)]);
        return c => { c.strokeStyle = `rgba(0,0,0,${al})`; c.lineWidth = w; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts) c.lineTo(q[0], q[1]); c.stroke(); }; });
      x.filter = 'none'; TX.baren = c; }
    // light fibres over the finished sheet
    { const c = Pilot.canvas(T, T), x = c.getContext('2d'); x.lineCap = 'round';
      wrapStrokes(x, T, 420, 21, R => { let px = R() * T, py = R() * T, ang = R() * TAU; const l = 30 * (.3 + R()), w = .6 + R() * .7, pts = [[px, py]];
        for (let s = 0; s < 5; s++) { ang += (R() - .5) * .9; px += Math.cos(ang) * l / 5; py += Math.sin(ang) * l / 5; pts.push([px, py]); }
        return c => { c.strokeStyle = '#f6eedb'; c.lineWidth = w; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts) c.lineTo(q[0], q[1]); c.stroke(); }; });
      TX.fiber = c; }
    // one erosion tile for the ink (destination-out): baren rubbing + goma-zuri specks + paper fibres showing through
    { const c = Pilot.canvas(T, T), x = c.getContext('2d'); x.globalAlpha = .22; x.drawImage(TX.baren, 0, 0); x.globalAlpha = .3; x.drawImage(TX.speck, 0, 0); x.globalAlpha = .1; x.drawImage(TX.fiber, 0, 0); TX.erode = c; }
    // the mount: darker tan paper
    { const c = Pilot.canvas(T, T), x = c.getContext('2d'); x.drawImage(TX.paper, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = '#c9b38a'; x.fillRect(0, 0, T, T); TX.mount = c; }
  }
  /* sky(o) → canvas: hand-wiped bokashi sky, per pixel (~0.3 s; build once in init). An indigo band at the top fading to
     bare paper, and a pale-blue band rising from the horizon. World px: o.x0..o.x1 wide, o.y0 top, o.h tall (default the
     sheet's width, y0 −520, h 1770). o.top (−140) / o.topSoft (470): where the indigo ends / its fade; o.haze (650) /
     o.hazeSoft (330) / o.hazeA (.62): the horizon band; o.scale .5 = built at half res. Draw it with
     Ukiyoe.drawSky(canvas, o) (or ix.drawImage through MF at x0, y0, x1 − x0, h). */
  U.sky = function (o = {}) {
    const sc = o.scale ?? .5, x0 = o.x0 ?? SHEET[0], x1 = o.x1 ?? SHEET[2], y0 = o.y0 ?? -520, hh = o.h ?? 1770;
    const top = o.top ?? -140, topSoft = o.topSoft ?? 470, haze = o.haze ?? 650, hazeSoft = o.hazeSoft ?? 330, hazeA = o.hazeA ?? .62;
    const w = Math.ceil((x1 - x0) * sc), h = Math.ceil(hh * sc), c = Pilot.canvas(w, h), x = c.getContext('2d'), id = x.createImageData(w, h), d = id.data;
    const A = hex(o.ink || PAL.prusD), A2 = hex(o.ink2 || PAL.prus), Bc = hex(o.low || PAL.skyL);
    for (let i = 0; i < w; i++) {
      const X = i / sc + x0, off = (Pilot.noise(X * .004, 3.1) - .5) * 56 + (Pilot.noise(X * .021, 7.7) - .5) * 16;
      for (let j = 0; j < h; j++) {
        const Y = j / sc + y0;
        let a1 = 1 - clamp((Y - (top + off)) / topSoft); a1 = a1 * a1 * (3 - 2 * a1);
        let a2 = clamp((Y - (haze + off * .5)) / hazeSoft); a2 = a2 * a2 * hazeA;
        const k = clamp((Y - y0) / 500), cr = lerp(A[0], A2[0], k), cg = lerp(A[1], A2[1], k), cb = lerp(A[2], A2[2], k);
        const al = a1 + a2 * (1 - a1), q = (j * w + i) * 4;
        if (al < .002) { d[q + 3] = 0; continue; }
        d[q] = (cr * a1 + Bc[0] * a2 * (1 - a1)) / al; d[q + 1] = (cg * a1 + Bc[1] * a2 * (1 - a1)) / al; d[q + 2] = (cb * a1 + Bc[2] * a2 * (1 - a1)) / al; d[q + 3] = al * 255;
      }
    }
    x.putImageData(id, 0, 0); c.o = { x0, y0, x1, h: hh }; return c;
  };
  U.drawSky = function (c) { ix.setTransform(MF); ix.drawImage(c, c.o.x0, c.o.y0, c.o.x1 - c.o.x0, c.o.h); };

  // ------------------------------------------------------------------ camera
  /* cam(c) — set the frame's matrices from c = { z, x, y } (zoom, world point at the screen centre). MK = key block,
     MF = colour blocks (2.2 / −1.6 px out of register). Called by begin(); returns { MK, MF }. */
  U.cam = function (c) {
    U.CAMZ = c.z;
    MK = new DOMMatrix([c.z, 0, 0, c.z, W / 2 - c.x * c.z, H / 2 - c.y * c.z]);
    MF = new DOMMatrix([1, 0, 0, 1, 2.2, -1.6]).multiply(MK);
    U.MK = MK; U.MF = MF; return { MK, MF };
  };
  // follow(z, x, gyScreen, gy): a camera at zoom z centred on world x that puts the ground line gy at screen y gyScreen
  U.follow = (z, x, gyScreen, gy = U.GY) => ({ z, x, y: gy - (gyScreen - Pilot.H / 2) / z });   // (usable before init)
  // camMix(a, b, k): blend two cameras (zoom in log space, so a push feels even)
  U.camMix = (a, b, k) => ({ z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), k)), x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });
  // shake(t, at, dur, amp): horizontal print-shake after a hit (px, decays to 0 over dur)
  U.shake = (t, at, dur = .35, amp = 6) => t > at && t < at + dur ? Math.sin(t * 90) * amp * (1 - seg(t, at, at + dur)) : 0;
  U.toScreen = (x, y) => MK.transformPoint(new DOMPoint(x, y));

  // ------------------------------------------------------------------ printing with blocks (into the ink layer)
  const fill = U.fill = function (p, col, a = 1) { ix.setTransform(MF); ix.globalAlpha = a; ix.fillStyle = col; ix.fill(p); ix.globalAlpha = 1; };   // a colour block
  const key = U.key = function (p, w = KW, col = PAL.sumi, a = 1) { ix.setTransform(MK); ix.globalAlpha = a; ix.lineWidth = w; ix.strokeStyle = col; ix.lineJoin = 'round'; ix.lineCap = 'round'; ix.stroke(p); ix.globalAlpha = 1; };   // the sumi key line
  const both = U.both = function (p, col, w = KW) { fill(p, col); if (w) key(p, w); };                                  // block + key line
  // cut paper back out of the ink (light, foam, mist): a = strength, style = optional gradient (alpha = how much paper)
  const erase = U.erase = function (p, a = 1, style) { ix.setTransform(MF); ix.globalCompositeOperation = 'destination-out'; ix.globalAlpha = a; ix.fillStyle = style || '#000'; ix.fill(p); ix.globalCompositeOperation = 'source-over'; ix.globalAlpha = 1; };
  const eraseStroke = U.eraseStroke = function (p, w, a = 1) { ix.setTransform(MF); ix.globalCompositeOperation = 'destination-out'; ix.globalAlpha = a; ix.lineWidth = w; ix.lineCap = 'round'; ix.strokeStyle = '#000'; ix.stroke(p); ix.globalCompositeOperation = 'source-over'; ix.globalAlpha = 1; };
  const pat = function (img, M, k = 1) { const p = ix.createPattern(img, 'repeat'); p.setTransform(M.scale(k, k)); return p; };
  // pool(p, r, col, a, o): a soft world-space bokashi of colour col around p (radius r; o.r0 inner, o.w/o.h rect size)
  U.pool = function (p, r, col, a, o = {}) { ix.setTransform(MF); const g = ix.createRadialGradient(p[0], p[1], o.r0 ?? 20, p[0], p[1], r); g.addColorStop(0, U.rgba(col, a)); g.addColorStop(1, U.rgba(col, 0));
    ix.fillStyle = g; ix.fillRect(p[0] - r, p[1] - r, o.w ?? 2 * r, o.h ?? 2 * r); };
  // paperGlow(p, r, a): bare paper showing through the ink around p (radial, a = strength at the centre)
  U.paperGlow = function (p, r, a, r0 = 4) { ix.setTransform(MF); const g = ix.createRadialGradient(p[0], p[1], r0, p[0], p[1], r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); erase(circ(p, r), 1, g); };
  // rays(p, o): a fan of paper rays cut from the ink, from p (o.n, o.a0..o.a1 angles, o.len, o.spread, o.r, o.a strength)
  U.rays = function (p, o = {}) {
    const n = o.n ?? 11, a0 = o.a0 ?? -Math.PI * .12, a1 = o.a1 ?? -Math.PI * .88, L = o.len ?? 330, aw = o.spread ?? .035, fan = new Path2D();
    for (let i = 0; i < n; i++) { const a = lerp(a0, a1, n > 1 ? i / (n - 1) : .5), l = L + (i % 3) * L * .21; fan.moveTo(p[0], p[1]); fan.lineTo(p[0] + Math.cos(a - aw) * l, p[1] + Math.sin(a - aw) * l); fan.lineTo(p[0] + Math.cos(a + aw) * l, p[1] + Math.sin(a + aw) * l); fan.closePath(); }
    ix.setTransform(MF); const g = ix.createRadialGradient(p[0], p[1], o.r0 ?? 60, p[0], p[1], o.r ?? 430); g.addColorStop(0, `rgba(0,0,0,${o.a ?? .6})`); g.addColorStop(1, 'rgba(0,0,0,0)'); erase(fan, 1, g);
  };

  // ------------------------------------------------------------------ landscape pieces (build Path2Ds once, draw per frame)
  // ridge(x0, x1, base, amp, seed, step, f) → [[x, y]…]: a mountain/hill skyline (fbm), y = base − amp·fbm
  U.ridge = function (x0, x1, base, amp, seed, step = 30, f = .004) { const pts = []; for (let x = x0; x <= x1; x += step) pts.push([x, base - amp * Pilot.fbm(x * f + seed, seed * 1.7, 3)]); return pts; };
  // land(pts, bottom) → Path2D: the area under a skyline down to y = bottom
  U.land = (pts, bottom) => poly([[pts[0][0], bottom], ...pts, [pts[pts.length - 1][0], bottom]]);
  /* pine(x, y, h, lean, seed, sc) → pine paths: a Hiroshige pine — trunk from (x, y) up h px leaning `lean`·h, flat-topped
     needle pads alternating left/right. Draw with drawPine(p, sway?) (sway: px the pads drift, for wind; 0 = static). */
  U.pine = function (x, y, h, lean, seed, sc = 1) {
    const R = rng(seed), top = [x + lean * h, y - h], trunk = [], pads = [], needles = new Path2D(), branches = new Path2D();
    for (let k = 0; k <= 6; k++) { const u = k / 6; trunk.push([lerp(x, top[0], u) + Math.sin(u * 5 + seed) * 6 * sc, lerp(y, top[1], u)]); }
    const tl = trunk.map((q, i) => [q[0] - (7 - i * .8) * sc, q[1]]), tr = trunk.map((q, i) => [q[0] + (7 - i * .8) * sc, q[1]]).reverse();
    const tpath = poly(tl.concat(tr));
    const n = 4 + (R() * 3 | 0);
    for (let k = 0; k < n; k++) {
      const u = .35 + .65 * k / (n - 1), b = lp2([x, y], top, u), side = k % 2 ? 1 : -1, reach = (40 + R() * 50) * sc * (1.2 - u * .5);
      const c = [b[0] + side * reach, b[1] - 10 * sc], w = (46 + R() * 34) * sc * (1.25 - u * .5), hh = (12 + R() * 6) * sc;
      branches.moveTo(b[0], b[1]); branches.quadraticCurveTo(lerp(b[0], c[0], .5), b[1] + 8 * sc, c[0], c[1] + hh * .3);
      const pad = new Path2D(); pad.moveTo(c[0] - w, c[1] + hh * .45); pad.bezierCurveTo(c[0] - w * .7, c[1] - hh * 1.1, c[0] + w * .7, c[1] - hh * 1.1, c[0] + w, c[1] + hh * .45);
      pad.quadraticCurveTo(c[0], c[1] + hh * .9, c[0] - w, c[1] + hh * .45); pads.push(pad);
      for (let q = 0; q < 9; q++) { const qx = c[0] - w * .8 + q * w * 1.6 / 8, qy = c[1] - hh * .1 - Math.sin(q / 8 * Math.PI) * hh * .55; for (const s2 of [-1, 0, 1]) { needles.moveTo(qx, qy + hh * .5); needles.lineTo(qx + s2 * 5 * sc, qy - 2 * sc); } }
    }
    return { tpath, pads, needles, branches };
  };
  U.drawPine = function (P) { both(P.tpath, PAL.woodD, KW); key(P.branches, 5, PAL.woodD); key(P.branches, 1.2); for (const pd of P.pads) both(pd, PAL.pine, KW * .9); key(P.needles, 1, '#22331f', .8); };
  // mistBand(x, y, w, h, a): suyari-gasumi — a long rounded band of bare paper (erased), soft at the ends and edges
  U.mistBand = function (x, y, w, h, a) {
    for (const k of [1, .72, .45]) {
      const hh = h * k, p = smooth([[x, y], [x + w * .12, y - hh * .5], [x + w * .88, y - hh * .5], [x + w, y], [x + w * .88, y + hh * .5], [x + w * .12, y + hh * .5]], true);
      ix.setTransform(MF); const g = ix.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.22, `rgba(0,0,0,${a * .42})`); g.addColorStop(.78, `rgba(0,0,0,${a * .42})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      erase(p, 1, g);
    }
  };
  // jagged(x, y0, y1, step, wob, slope, seed) → [[x, y]…]: a carved cliff edge running down from (x, y0) to y1
  U.jagged = function (x, y0, y1, step, wob, slope, seed) { const pts = [[x, y0]], R = rng(seed); for (let y = y0 + step; y < y1; y += step) pts.push([x + (R() - .5) * wob + (y - y0) * slope, y]); return pts; };
  // roadTop(x0, x1, gy, depth) → Path2D: the oblique top surface of a road/ledge from x0 to x1 at ground gy, depth units deep
  U.roadTop = function (x0, x1, gy, depth) { const BD = U.LN(depth, 0, 0); return poly([[x0, gy], [x1, gy], [x1 + BD[0], gy + BD[1]], [x0 + BD[0], gy + BD[1]]]); };
  /* rockFace(x0, x1, seed, top, bottom) → carved texture for a cliff face between x0..x1 and y top..bottom: slanted rock
     slabs (lighter tops), chisel strokes, moss dots. drawRock(r) prints it (after the face's own block). */
  U.rockFace = function (x0, x1, seed, top = U.GY, bottom = 1700) {
    const R = rng(seed), p = new Path2D(), moss = [];
    for (let i = 0; i < (x1 - x0) / 26; i++) {
      const x = x0 + R() * (x1 - x0), y = top + 40 + R() * (bottom - top - 80), l = 40 + R() * 110;
      p.moveTo(x, y); p.quadraticCurveTo(x + (R() - .5) * 20, y + l * .5, x + (R() - .5) * 26, y + l);
      if (R() < .45) moss.push([x + (R() - .5) * 30, y + R() * l, 3 + R() * 4]);
    }
    const blocks = [];
    for (let i = 0; i < (x1 - x0) / 190; i++) {
      const x = x0 + 20 + R() * (x1 - x0 - 60), y = top + 50 + R() * (bottom - top - 150), w = 70 + R() * 150, h = 50 + R() * 110, sk = 20 + R() * 40;
      blocks.push({ p: poly([[x, y + h], [x + sk * .3, y + 8], [x + sk + w * .4, y - 6], [x + w + sk, y + 10], [x + w + sk * .6, y + h * .7], [x + w * .7, y + h + 6]]), c: R() < .5 ? '#97a28d' : '#84917f',
        top: poly([[x + sk * .3, y + 8], [x + sk + w * .4, y - 6], [x + w + sk, y + 10], [x + w * .6, y + 20]]) });
    }
    return { p, moss, blocks };
  };
  U.drawRock = function (r) { for (const b of r.blocks) both(b.p, b.c, 2); key(r.p, 2, PAL.rockD, .9); const mp = new Path2D(); for (const [x, y, rr] of r.moss) { mp.moveTo(x + rr, y); mp.arc(x, y, rr, 0, TAU); } fill(mp, PAL.greenD); };
  // roadMarks(x0, x1, seed, gy, depth) → Path2D of short wheel/foot ruts scattered on a road's top; key it in PAL.roadD
  U.roadMarks = function (x0, x1, seed, gy = U.GY, depth = 240) { const R = rng(seed), p = new Path2D(); for (let i = 0; i < (x1 - x0) / 55; i++) { const x = x0 + R() * (x1 - x0), d = R() * depth, [wx, wy] = U.LN(d, x, gy); const l = 10 + R() * 26; p.moveTo(wx, wy); p.lineTo(wx + l, wy); } return p; };
  /* chasm(o): the inside of a cleft between two cliffs — back wall darkening to the sea, carved verticals.
     o = { xf (far lip x), xn (near lip x), gy, depth (road depth), bottom, sea } */
  U.chasm = function (o) {
    const BD = U.LN(o.depth, 0, 0), p = poly([[o.xf, o.gy + BD[1] - 2], [o.xn + BD[0] + 4, o.gy + BD[1] - 2], [o.xn + BD[0] + 20, o.bottom], [o.xf, o.bottom]]);
    ix.setTransform(MF); const g = ix.createLinearGradient(0, o.gy - 100, 0, o.sea); g.addColorStop(0, '#59665a'); g.addColorStop(.3, '#3f4d50'); g.addColorStop(.75, PAL.gorge); g.addColorStop(1, PAL.prusD);
    ix.fillStyle = g; ix.fill(p);
    const R = rng(17), v = new Path2D(); for (let i = 0; i < 22; i++) { const x = o.xf + 60 + R() * (o.xn - o.xf + 60), y = o.gy - 60 + R() * 380; v.moveTo(x, y); v.quadraticCurveTo(x + (R() - .5) * 16, y + 60, x + (R() - .5) * 10, y + 50 + R() * 150); }
    key(v, 1.6, '#1d2a33', .75);
  };
  /* sea(t, o): banded Prussian-blue sea with rows of paper wave crests drifting left (on 12 fps), surging foam at the
     cliff feet. o = { x0, x1 (extent), y (the waterline), bottom, gap: [xf, xn] (a cleft: no foam there, a narrow surge in it) } */
  U.sea = function (t, o) {
    const tq = st12(t), SEA = o.y, x0 = o.x0, x1 = o.x1, gap = o.gap;
    const body = poly([[x0 - 60, SEA], [x1 + 60, SEA], [x1 + 60, o.bottom + 20], [x0 - 60, o.bottom + 20]]);
    ix.setTransform(MF); const g = ix.createLinearGradient(0, SEA, 0, o.bottom); g.addColorStop(0, PAL.sky); g.addColorStop(.12, PAL.prusL); g.addColorStop(.35, PAL.prus); g.addColorStop(1, PAL.prusD);
    ix.fillStyle = g; ix.fill(body);
    for (let r = 0; r < 6; r++) {
      const y = SEA + 14 + r * r * 9 + r * 18, wl = 70 + r * 22, amp = 6 + r * 3, drift = (tq * (18 + r * 6) + r * 37) % wl;
      const p = new Path2D(); for (let x = x0 - wl + drift; x < x1 + wl; x += wl) { p.moveTo(x, y); p.quadraticCurveTo(x + wl * .3, y - amp * 1.6, x + wl * .55, y - amp * .6); p.quadraticCurveTo(x + wl * .62, y + amp * .2, x + wl * .5, y + amp * .35); }
      eraseStroke(p, 2.4 + r * .5, .95);
      const q = new Path2D(); for (let x = x0 - wl + drift; x < x1 + wl; x += wl) { q.moveTo(x + wl * .55, y + amp * .9); q.quadraticCurveTo(x + wl * .8, y + amp * .3, x + wl * 1.05, y + amp * .9); }
      key(q, 1.4, PAL.prusD, .8);
    }
    const surge = .5 + .5 * Math.sin(tq * 1.7), fp = new Path2D(), R = rng(5);
    for (let x = x0; x < x1; x += 26) { if (gap && x > gap[0] + 30 && x < gap[1] - 20) continue; const r = 8 + R() * 10 + surge * 6; fp.moveTo(x + r, SEA - 2); fp.arc(x, SEA - 2 - surge * 4, r, 0, TAU); }
    erase(fp, .95); key(fp, 1.4, PAL.prusL, .7);
    if (gap) { const gp = new Path2D(); for (let x = gap[0] + 20; x < gap[1]; x += 22) { const r = 7 + 5 * Math.sin(x * .3 + tq * 3); gp.moveTo(x + r, SEA); gp.arc(x, SEA - 3, r, 0, TAU); }
      erase(gp, .9); key(gp, 1.2, PAL.prusL, .6); }
  };
  // claw(p0, ang, L, wd, curl) → Path2D: a Hokusai spray claw — tapered, hooking inward at the tip
  const claw = U.claw = function (p0, ang, Ln, wd, curl) {
    const pts = []; let a = ang, x = p0[0], y = p0[1];
    for (let i = 0; i <= 8; i++) { pts.push([x, y]); a += curl * (i / 8) * .45; x += Math.cos(a) * Ln / 8; y += Math.sin(a) * Ln / 8; }
    const Lp = [], Rp = [];
    for (let i = 0; i < pts.length; i++) { const q = pts[Math.min(i + 1, pts.length - 1)], pq = pts[Math.max(0, i - 1)], d = nrm(sub(q, pq)), w = wd * (1 - i / pts.length) * (i === 0 ? .8 : 1); Lp.push([pts[i][0] - d[1] * w, pts[i][1] + d[0] * w]); Rp.push([pts[i][0] + d[1] * w, pts[i][1] - d[0] * w]); }
    return smooth(Lp.concat(Rp.reverse()), true);
  };
  /* splash(t, o): THE HIT — a column of clawed spray + ballistic droplets thrown up where something hits the water.
     o = { x, y (impact, world px), t0 (time of impact), sea (waterline; drops below it are hidden), size (1) }. Lasts 1.4 s. */
  U.splash = function (t, o) {
    const tq = st12(t), tau = tq - o.t0, k = o.size ?? 1;
    if (tau < 0 || tau > 1.4) return;
    const X = o.x, Y = o.y, grow = eo(seg(tau, 0, .3)), fall = seg(tau, .55, 1.3);
    const R = rng(91);
    for (const layer of [0, 1]) {
      const ps = [];
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * .26 + (R() - .5) * .1, Ln = (150 + R() * 140) * k * grow * (1 - fall * .5), side = i < 4 ? -1 : 1;
        const base = [X + (i - 4) * 10, Y + fall * 60];
        ps.push(claw(layer ? base : add(base, [6, 6]), a + fall * side * .5, Ln, 16 + R() * 8, side * (2.2 + R())));
      }
      for (const p of ps) { if (layer) { erase(p, 1); key(p, 2, PAL.prusD); } else both(p, PAL.sky, 1.6); }
    }
    const sp = new Path2D(), R2 = rng(93);
    for (let i = 0; i < 46; i++) { const a = -Math.PI / 2 + (R2() - .5) * 2.2, v = 260 + R2() * 520, r = 2 + Math.pow(R2(), 3) * 9, x = X + Math.cos(a) * v * tau, y = Y + Math.sin(a) * v * tau + .5 * 1400 * tau * tau;
      if (y > o.sea + 10) continue; sp.moveTo(x + r, y); sp.arc(x, y, r, 0, TAU); }
    erase(sp, 1); key(sp, 1.2, PAL.prusD, .8);
  };
  /* arch(bx, by, o): a lit stone gateway — a fan of paper rays behind it, rays down the road, the doorway bare paper
     (light) with a warm edge, stone piers with joints and a ring of wedge stones. (bx, by) = foot centre on the ground.
     o = { w: 78 (half opening), hp: 210 (pier height), th: 40 (stone thickness), fan: true, road: true } */
  U.arch = function (bx, by, o = {}) {
    const w = o.w ?? 78, hp = o.hp ?? 210, th = o.th ?? 40, cy = by - hp;
    if (o.fan !== false) { const fan = new Path2D(); for (let i = 0; i < 11; i++) { const a = -Math.PI * (.12 + .76 * i / 10), l = 330 + (i % 3) * 70, aw = .035; fan.moveTo(bx, cy); fan.lineTo(bx + Math.cos(a - aw) * l, cy + Math.sin(a - aw) * l); fan.lineTo(bx + Math.cos(a + aw) * l, cy + Math.sin(a + aw) * l); fan.closePath(); }
      ix.setTransform(MF); const fg = ix.createRadialGradient(bx, cy, 60, bx, cy, 430); fg.addColorStop(0, 'rgba(0,0,0,.6)'); fg.addColorStop(1, 'rgba(0,0,0,0)'); erase(fan, 1, fg); }
    if (o.road !== false) { const rays = new Path2D(); for (const [a, b] of [[-.5, -.22], [-.08, .08], [.22, .5]]) { rays.moveTo(bx, by - 100); rays.lineTo(bx + Math.cos(Math.PI + a) * 460, by - 100 + Math.sin(Math.PI + a) * 460); rays.lineTo(bx + Math.cos(Math.PI + b) * 460, by - 100 + Math.sin(Math.PI + b) * 460); rays.closePath(); }
      ix.setTransform(MF); const rg = ix.createRadialGradient(bx, by - 100, 30, bx, by - 100, 470); rg.addColorStop(0, 'rgba(0,0,0,.45)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); erase(rays, 1, rg); }
    const door = new Path2D(); door.moveTo(bx - w, by); door.lineTo(bx - w, cy); door.arc(bx, cy, w, Math.PI, 0); door.lineTo(bx + w, by); door.closePath();
    fill(door, PAL.ochreL); ix.setTransform(MF); const dg = ix.createRadialGradient(bx, by - hp * .55, 10, bx, by - hp * .55, w * 2.1); dg.addColorStop(0, 'rgba(0,0,0,1)'); dg.addColorStop(.7, 'rgba(0,0,0,.9)'); dg.addColorStop(1, 'rgba(0,0,0,.2)'); erase(door, 1, dg);
    key(door, KW);
    const stone = '#aaa692', joints = new Path2D();
    for (const sd of [-1, 1]) {
      const x0 = bx + sd * w, x1 = bx + sd * (w + th);
      both(poly([[x0, by + 2], [x1, by + 2], [x1, cy], [x0, cy]]), stone, KW);
      for (let y = by - 44, k = 0; y > cy + 10; y -= 44, k++) { joints.moveTo(x0, y); joints.lineTo(x1, y); const xm = lerp(x0, x1, k % 2 ? .35 : .65); joints.moveTo(xm, y); joints.lineTo(xm, y + 44); }
    }
    const ring = new Path2D(); ring.arc(bx, cy, w + th, Math.PI, 0); ring.lineTo(bx + w, cy); ring.arc(bx, cy, w, 0, Math.PI, true); ring.closePath();
    both(ring, stone, KW);
    for (let k = 1; k < 9; k++) { const a = Math.PI + Math.PI * k / 9; joints.moveTo(bx + Math.cos(a) * w, cy + Math.sin(a) * w); joints.lineTo(bx + Math.cos(a) * (w + th), cy + Math.sin(a) * (w + th)); }
    key(joints, 1.5, PAL.greyD);
  };
  // border(): the sheet's printed border (thick + thin key), drawn last in the world
  U.border = function () { const [x0, y0, x1, y1] = SHEET;
    key(poly([[x0 + 26, y0 + 26], [x1 - 26, y0 + 26], [x1 - 26, y1 - 26], [x0 + 26, y1 - 26]]), 5);
    key(poly([[x0 + 12, y0 + 12], [x1 - 12, y0 + 12], [x1 - 12, y1 - 12], [x0 + 12, y1 - 12]]), 1.6); };

  // ------------------------------------------------------------------ timber: a cross / plank / staff (a long held thing)
  /* timberGeo(c, o) → { u (foot→head unit), Hd (head), J (crossbar joint), v (half crossbar), pv }.
     c = { F: foot [x, y], ang: direction foot→head (rad), L: length, fl: 0 upright-in-plane … 1 lying flat (crossbar slants
     into depth) }. o = { cb: 90 (head → crossbar), arm: 75 (half crossbar), depth: 70 (flat crossbar depth units) }. */
  U.timberGeo = function (c, o = {}) {
    const CB = o.cb ?? 90, ARM = o.arm ?? 75, dp = o.depth ?? 70, DFL = [DX * dp, DY * dp];
    const u = [Math.cos(c.ang), Math.sin(c.ang)], Hd = add(c.F, u, c.L), J = add(Hd, u, -CB);
    let pv = [-u[1], u[0]]; if (pv[0] * DFL[0] + pv[1] * DFL[1] < 0) pv = [-pv[0], -pv[1]];
    const v = lp2([pv[0] * ARM, pv[1] * ARM], DFL, c.fl);
    return { u, Hd, J, v, pv };
  };
  /* timber(c, o): print it. o.bar (true: a cross; false: a plain beam/offcut), o.accent (beni block instead of wood),
     o.cut (show a pale sawn end face at the foot), o.ghost (dashed key-line outline only — "what should be there";
     o.alpha, o.fillA tint), o.kw (key width), plus timberGeo's o. Returns the geometry. */
  U.timber = function (c, o = {}) {
    const g = U.timberGeo(c, o), { u, Hd, J, v } = g, F = c.F, fl = c.fl, hw = lerp(10, 7, fl);
    let n = [-u[1], u[0]]; if (n[1] > 0) n = [-n[0], -n[1]];
    const mine = !!o.accent, col = mine ? PAL.beni : PAL.wood, colT = mine ? PAL.beniT : PAL.woodT, w = o.kw || KW;
    const Dt = [DX * 15 * fl, DY * 15 * fl];
    const fT = add(F, n, hw), hT = add(Hd, n, hw);
    const top = poly([fT, hT, add(hT, Dt), add(fT, Dt)]);
    const beam = poly([add(F, n, hw), add(Hd, n, hw), add(Hd, n, -hw), add(F, n, -hw)]);
    const bw = lerp(9, 11, fl), bar = poly([add(add(J, v), u, bw), add(add(J, v), u, -bw), add(add(J, v, -1), u, -bw), add(add(J, v, -1), u, bw)]);
    if (o.ghost) { const ga = o.alpha ?? 1, fa = ga * .3 * (o.fillA ?? 1); if (fa > 0) { fill(top, PAL.beniC, fa); fill(beam, PAL.beniC, fa); if (o.bar !== false) fill(bar, PAL.beniC, fa); } ix.setLineDash([13, 9]); key(top, w * .8, PAL.sumi, ga * .9); key(beam, w, PAL.sumi, ga); if (o.bar !== false) key(bar, w, PAL.sumi, ga); ix.setLineDash([]); return g; }
    if (fl > .3) both(top, colT, w * .8);
    both(beam, col, w);
    const gp = new Path2D(); for (const [a, b2, off] of [[.06, .4, .35], [.5, .92, -.3], [.3, .7, .05]]) { const p0 = add(add(F, u, c.L * a), n, hw * off), p1 = add(add(F, u, c.L * b2), n, hw * off); gp.moveTo(p0[0], p0[1]); gp.lineTo(p1[0], p1[1]); }
    key(gp, w * .45, mine ? '#5a1d14' : PAL.woodD, .7);
    if (o.bar !== false) both(bar, fl > .5 ? colT : col, w);
    if (o.cut) { const e = poly([add(F, n, hw), add(add(F, n, hw), Dt), add(add(F, n, -hw), Dt), add(F, n, -hw)]); fill(e, PAL.beniC); key(e, w * .6); }
    return g;
  };

  // ------------------------------------------------------------------ the figure (a pilgrim: kasa hat, robe, tabi, tekkō)
  /* pose(st) → R (world joints). st = {
       x, d (depth lane), dy (lift, px), gy (ground y, default Ukiyoe.GY), s (scale 1 ≈ 270 px tall), f (−1 faces left, 1 right;
       animate it through ±.4 for a squashed turn — see turn()), mode: 'stand' | 'walk' | 'squat' | 'kneel',
       ph (walk phase 0..1 — use walkPhase(dist, stride)), stride (px; > 30 = a run: higher feet, more bob),
       lean (rad, forward), hipH (hip height px, 134 standing), bow (head pitch, rad: + looks down, − looks up),
       k (kneel amount 0..1 — in-betweens from standing), lay (squat deeper: hip 70 instead of 54) }
     Bones keep fixed lengths (thigh 68, shin 64, torso 76, upper arm 52, forearm 48, × s); knees by 2-bone IK. */
  U.pose = function (o) {
    const s = o.s ?? 1, f = o.f, [gx, gy0] = U.LN(o.d || 0, o.x, o.gy ?? U.GY), gy = gy0 + (o.dy || 0);
    const TH = 68 * s, SH = 64 * s, TO = 76 * s, UA = 52 * s, FA = 48 * s;
    let hip, footN, footF, kneeN, kneeF;
    const lean = o.lean || 0;
    if (o.mode === 'squat') {
      hip = [gx - f * 16 * s, gy - (o.hipH && o.lay ? 70 : 54) * s];
      footN = [gx + f * 16 * s, gy]; footF = [gx - f * 2 * s, gy];
      kneeN = ik(hip, footN, TH, SH, [f, -.6])[0]; kneeF = ik(hip, footF, TH, SH, [f, -.4])[0];
    } else if (o.mode === 'kneel') {
      // far leg kneels (knee and toes on the ground), near foot planted forward with the knee up
      const k = o.k ?? 1, K = [gx + f * 10 * s, gy - 5 * s], a = .25, b = .06;
      const hipK = [K[0] - f * Math.sin(a) * TH, K[1] - Math.cos(a) * TH], footK = [K[0] - f * Math.cos(b) * SH, K[1] + Math.sin(b) * SH];
      const hip0 = [gx + f * Math.sin(lean) * 6 * s, gy - (o.hipH || 134) * s];
      hip = lp2(hip0, hipK, k); footF = lp2([gx - f * 6 * s, gy], footK, k); footN = lp2([gx + f * 8 * s, gy], [gx + f * 44 * s, gy], k);
      kneeN = ik(hip, footN, TH, SH, [f, -.6])[0];
      kneeF = k >= 1 ? K : ik(hip, footF, TH, SH, [f, .3])[0];
    } else {
      const A = (o.mode === 'walk' ? o.stride : 0) * s, ph = o.ph || 0;
      const legT = q => { q = (q % 1 + 1) % 1; if (q < .5) return [A * (1 - 4 * q), 0]; const u = (q - .5) / .5; return [A * (-1 + 2 * ss(0, 1, u)), Math.sin(u * Math.PI) * (A > 30 ? 20 : 11) * s]; };
      const bob = o.mode === 'walk' ? -Math.abs(Math.cos(ph * TAU * 2)) * (A > 30 ? 6 : 3) * s : 0;
      hip = [gx + f * Math.sin(lean) * 6 * s, gy - (o.hipH || 134) * s + bob + (o.mode === 'walk' ? 3 * s : 0)];
      const [a1, l1] = legT(ph), [a2, l2] = legT(ph + .5);
      footN = [gx + f * a1, gy - l1]; footF = [gx + f * a2, gy - l2];
      kneeN = ik(hip, footN, TH, SH, [f, 0])[0]; kneeF = ik(hip, footF, TH, SH, [f, 0])[0];
    }
    const sh = [hip[0] + f * Math.sin(lean) * TO, hip[1] - Math.cos(lean) * TO];
    const hb = lean + (o.bow || 0);
    const head = [sh[0] + f * Math.sin(hb) * 24 * s, sh[1] - Math.cos(hb) * 24 * s];
    return { s, f, hip, sh, head, hb, lean, footN, footF, kneeN, kneeF, UA, FA, gy, gx };
  };
  // walkPhase(dist, stride): walk cycle phase from distance travelled (feet never slide: one cycle = 4 strides)
  U.walkPhase = (dist, stride) => ((dist / (4 * stride)) % 1 + 1) % 1;
  // armTo(R, target) → [elbow, hand]: the arm from the shoulder to a grip point (fixed bone lengths, elbow down/back)
  const armTo = U.armTo = function (R, target) { return ik(R.sh, target, R.UA, R.FA, [-R.f * .6, 1]); };
  // hangArm(R, swing) → [elbow, hand]: a relaxed arm swung `swing` rad forward of straight down
  const hangArm = U.hangArm = function (R, swing) { const a = swing, d = [Math.sin(a) * R.f, Math.cos(a)]; return armTo(R, add(R.sh, d, (R.UA + R.FA) * .93)); };
  // reach(R, p) → p pulled back inside arm's reach (a hand never stretches the arm to touch something too far away)
  U.reach = function (R, p) { const r = (R.UA + R.FA) * 1.02; return len(sub(p, R.sh)) > r ? add(R.sh, nrm(sub(p, R.sh)), r * .97) : p; };
  // hangHands(R, st) → { near, far }: default hands — hanging, swinging opposite the legs when walking; st.arms 'balance' = out
  U.hangHands = function (R, st) {
    const sw = st.mode === 'walk' ? Math.sin((st.ph || 0) * TAU) * .5 : 0, bal = st.arms === 'balance' ? .45 : 0;
    return { near: hangArm(R, (bal ? -bal : -sw * .6 + .08))[1], far: hangArm(R, bal ? bal : sw * .6 + .08)[1] };
  };
  // costume colours: robe / robeD (shaded side, far sleeve) / legs (hakama); shin = the leggings; arm = tekkō guard
  U.COSTUME = { robe: '#3f5878', robeD: '#2c4a70', legs: '#25304a', shin: '#1d2c44', shinD: '#141c2c', arm: PAL.prus, armD: '#1f3656', obi: '#3b3531', hat: 'kasa' };
  U.drawLeg = function (R, hip, knee, foot, C, far) {
    const s = R.s, w = KW * s * .9;
    both(capsule(hip, knee, 10.5 * s, 8.5 * s), far ? C.legsD || C.legs : C.legs, w);
    both(capsule(knee, foot, 8 * s, 6 * s), far ? (C.shinD || '#141c2c') : (C.shin || '#1d2c44'), w);
    const toe = [foot[0] + R.f * 19 * s, foot[1] + 1 * s];
    const fp = poly([[foot[0] - R.f * 5 * s, foot[1] - 6 * s], [foot[0] + R.f * 6 * s, foot[1] - 7 * s], [toe[0], toe[1] - 3 * s], [toe[0], toe[1] + 1.5 * s], [foot[0] - R.f * 6 * s, foot[1] + 1.5 * s]]);
    both(fp, far ? '#d9cdb2' : '#efe6d0', w * .8);
    const sd = poly([[foot[0] - R.f * 7 * s, foot[1] + 1.5 * s], [toe[0] + R.f * 1 * s, toe[1] + 1.5 * s], [toe[0] + R.f * 1 * s, toe[1] + 4 * s], [foot[0] - R.f * 7 * s, foot[1] + 4 * s]]);
    both(sd, PAL.straw, w * .6);
  };
  // drawArm(R, sh, elbow, hand, C, far, fist): sleeve, arm guard, the hand AT `hand` (fist: a curled-finger line)
  U.drawArm = function (R, sh, el, hand, C, far, fist = true) {
    const s = R.s, w = KW * s * .9;
    both(capsule(sh, el, 11 * s, 8.5 * s), far ? C.robeD : C.robe, w);
    both(capsule(el, hand, 6.5 * s, 5.5 * s), far ? (C.armD || '#1f3656') : (C.arm || PAL.prus), w);
    both(circ(hand, 6.8 * s), far ? '#dcc39c' : PAL.skin, w * .8);
    if (fist) { const d = nrm(sub(hand, el)); const p = new Path2D(); p.moveTo(hand[0] - d[0] * 2 * s, hand[1] - 5 * s); p.quadraticCurveTo(hand[0] + d[0] * 4 * s, hand[1] - 7 * s, hand[0] + d[0] * 6 * s, hand[1] - 2 * s); key(p, w * .55); }
  };
  U.drawTorso = function (R, C) {
    const s = R.s, f = R.f, a = nrm(sub(R.sh, R.hip)), TO = len(sub(R.sh, R.hip));
    let nf = [-a[1], a[0]]; if (nf[0] * f < 0) nf = [-nf[0], -nf[1]];
    const km = lp2(R.kneeN, R.kneeF, .5), k = nrm(lp2(nrm(sub(km, R.hip)), [0, 1], .35)), nk = f < 0 ? [-k[1], k[0]] : [k[1], -k[0]];
    const P = (al, ac) => al >= 0 ? [R.hip[0] + a[0] * al * TO + nf[0] * ac * s, R.hip[1] + a[1] * al * TO + nf[1] * ac * s]
      : [R.hip[0] - k[0] * al * TO + nk[0] * ac * s, R.hip[1] - k[1] * al * TO + nk[1] * ac * s];
    const robe = poly([P(1.02, -12), P(.78, -17), P(.35, -18), P(.02, -20), P(-.35, -25), P(-.5, -19), P(-.44, -12), P(-.55, -2), P(-.5, 10), P(-.56, 22), P(-.3, 23), P(0, 19), P(.3, 19), P(.72, 18), P(.95, 10), P(1.04, 0)]);
    both(robe, C.robe, KW * s);
    const tuck = poly([P(-.35, -25), P(-.02, -21), P(-.2, -14)]); both(tuck, C.robeD, KW * s * .7);
    const obi = poly([P(.24, -19), P(.24, 19.5), P(.08, 19.5), P(.08, -19)]); both(obi, C.obi || '#3b3531', KW * s * .8);
    const col = new Path2D(); const c0 = P(1.0, 6), c1 = P(.62, 17); col.moveTo(c0[0], c0[1]); col.lineTo(c1[0], c1[1]); key(col, 4.2 * s, '#efe6d0'); key(col, KW * s * .5);
  };
  // drawHead(R, C): neck, face profile, ear, and the hat (C.hat 'kasa' = low straw cone over the eyes; 'none' = topknot)
  U.drawHead = function (R, C = {}) {
    const s = R.s, f = R.f, hb = R.hb, up = [Math.sin(hb) * f, -Math.cos(hb)], fw = [Math.cos(hb) * f, Math.sin(hb)];
    both(capsule(R.sh, add(R.head, up, -8 * s), 6 * s, 6 * s), PAL.skin, KW * s * .7);
    const face = poly([add(add(R.head, up, 6 * s), fw, -12 * s), add(add(R.head, up, 6 * s), fw, 12 * s), add(add(R.head, up, -4 * s), fw, 15 * s), add(add(R.head, up, -9 * s), fw, 12 * s), add(add(R.head, up, -15 * s), fw, 6 * s), add(add(R.head, up, -15 * s), fw, -6 * s), add(add(R.head, up, -6 * s), fw, -13 * s)]);
    both(face, PAL.skin, KW * s * .8);
    const ear = circ(add(R.head, fw, -4 * s), 2.6 * s); key(ear, KW * s * .5);
    const K = (u, v) => add(add(R.head, fw, u * s), up, v * s);
    if (C.hat === 'none') {   // bare head: black hair cap + a small topknot
      both(poly([K(-13, 2), K(-6, 12), K(8, 13), K(13, 6), K(8, 4), K(-2, 5), K(-9, -4)]), PAL.sumi, KW * s * .6);
      both(circ(K(-6, 16), 4.5 * s), PAL.sumi, KW * s * .5); return;
    }
    const kasa = poly([K(-52, 2), K(-30, 12), K(-4, 30), K(4, 30), K(30, 12), K(54, 2), K(0, 6)]);
    both(kasa, PAL.straw, KW * s);
    const sl = new Path2D(); for (const q of [-30, -14, 0, 16, 32]) { const a0 = K(q * .1, 28), a1 = K(q * 1.5, 4); sl.moveTo(a0[0], a0[1]); sl.lineTo(a1[0], a1[1]); }
    key(sl, KW * s * .4, '#7a5a2a');
    const under = poly([K(-50, 2), K(52, 2), K(0, -2)]); both(under, '#8a6a36', KW * s * .5);
  };
  /* figure(R, C, o): print a posed figure in layers (far → near):
       o.back(R) (e.g. a load on the far shoulder) → far arm → far leg → near leg → robe → head → o.front(R) (things held
       between body and near arm) → near arm (unless o.nearArm === false) → o.top(R) (a fist wrapped over a handle).
     o.near / o.far: hand targets [x, y] (the hand is drawn AT the point; the elbow comes from IK); omitted → hangHands.
     o.farFist / o.nearFist (default true): draw the curled-finger line. C: costume (Ukiyoe.COSTUME + overrides). */
  U.figure = function (R, C, o = {}) {
    C = C || U.COSTUME;
    let hN = o.near, hF = o.far;
    if (!hN || !hF) { const hh = U.hangHands(R, o.st || {}); hN = hN || hh.near; hF = hF || hh.far; }
    const [eN] = armTo(R, hN), [eF] = armTo(R, hF);
    if (o.back) o.back(R);
    if (o.farArm !== false) U.drawArm(R, R.sh, eF, hF, C, true, o.farFist !== false);
    U.drawLeg(R, R.hip, R.kneeF, R.footF, C, true);
    U.drawLeg(R, R.hip, R.kneeN, R.footN, C, false);
    U.drawTorso(R, C);
    U.drawHead(R, C);
    if (o.front) o.front(R);
    if (o.nearArm !== false) U.drawArm(R, R.sh, eN, hN, C, false, o.nearFist !== false);
    if (o.top) o.top(R);
    return { R, hN, hF, eN, eF };
  };
  /* shoulder(R, L, o) → timber pose { F, ang, L, fl: 0 } of a long thing carried on the far shoulder, head forward and
     up. o.drag: the foot drags on the ground (heavy); o.grip: where it rests, measured from the head (90 = a cross's
     crossbar joint); o.phi: angle above horizontal when not dragging (.5 rad). Hands: timberGeo(…).J ± along it. */
  U.shoulder = function (R, L, o = {}) {
    const f = R.f, s = R.s, J = add(R.sh, [-f * 3 * s, -7 * s]), CB = o.grip ?? 90;
    let phi = o.phi ?? .5;
    if (o.drag) phi = Math.asin(clamp((R.gy - 2 - J[1]) / (L - CB), .2, .99));
    const u = [f * Math.cos(phi), -Math.sin(phi)];
    const F = add(J, u, -(L - CB));
    return { F, ang: Math.atan2(u[1], u[0]), L, fl: 0 };
  };
  // upright(R, L, o) → timber pose held upright in front (a staff/standard): foot on the ground ahead, o.tilt rad
  U.upright = function (R, L, o = {}) { const F = [R.gx + R.f * (o.ahead ?? 34) * R.s, R.gy - 2], a = -Math.PI / 2 + R.f * (o.tilt ?? .08); return { F, ang: a, L, fl: 0 }; };
  // along(c, k) → the point k px from the foot along a timber pose (grip points for hands)
  U.along = (c, k) => [c.F[0] + Math.cos(c.ang) * k, c.F[1] + Math.sin(c.ang) * k];
  /* fistOn(g, d, s): a fist wrapped round a handle at grip point g, handle direction d (unit): four knuckles on the far
     side, the thumb along the top. Draw it AFTER the near arm (o.top), with the arm's hand at g and fist = false. */
  U.fistOn = function (g, d, s = 1) {
    const nb = [-d[1], d[0]];
    const fistP = poly([add(add(g, d, -9 * s), nb, -7 * s), add(add(g, d, 9 * s), nb, -7 * s), add(add(g, d, 10 * s), nb, 6 * s), add(add(g, d, -9 * s), nb, 7 * s)]);
    both(fistP, PAL.skin, KW * s * .8);
    const kn = new Path2D(); for (let q = -1; q <= 2; q++) { const p0 = add(add(g, d, q * 4.6 * s - 2 * s), nb, -7 * s), p1 = add(p0, nb, 5 * s); kn.moveTo(p0[0], p0[1]); kn.lineTo(p1[0], p1[1]); }
    key(kn, KW * s * .45);
    const th = new Path2D(), t0 = add(add(g, d, -8 * s), nb, 6.5 * s), t1 = add(add(g, d, -18 * s), nb, 3 * s); th.moveTo(t0[0], t0[1]); th.quadraticCurveTo(t1[0] + nb[0] * 4 * s, t1[1] + nb[1] * 4 * s, t1[0], t1[1]); key(th, KW * s * .8);
  };
  // pressHand(h, s): a flat hand pressing down on something at h (palm + three finger lines)
  U.pressHand = function (h, s = 1) { both(circ(h, 6.8 * s), '#dcc39c', KW * s * .7);
    const fg = new Path2D(); for (let q = 0; q < 3; q++) { fg.moveTo(h[0] - 6 * s + q * 4 * s, h[1] + 2 * s); fg.lineTo(h[0] - 8 * s + q * 4 * s, h[1] + 7 * s); } key(fg, KW * s * .45); };
  /* turn(t, at, from, to, dur) → f: a stepped turn (8 fps) from facing `from` to `to` around time `at`, passing through
     squashed in-betweens (±.4) so the figure reads as rotating rather than flipping. Pass as st.f. */
  U.turn = function (t, at, from, to, dur = .25) { const u = seg(U.st8(t), at, at + dur); return u <= 0 ? from : u >= 1 ? to : u < .5 ? from * .4 : to * .4; };

  // ------------------------------------------------------------------ the frame
  /* begin(ctx, cam): set the camera, lay the mount (only when the sheet doesn't cover the frame) + the washi paper
     (clipped to the sheet), and clear the ink layer. Then draw the world into Ukiyoe.ix with the block functions. */
  U.begin = function (ctx, c) {
    U.cam(c);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    const [x0, y0, x1, y1] = SHEET, sheet = poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]); U.sheetPath = sheet;
    const tl = MK.transformPoint(new DOMPoint(x0, y0)), br = MK.transformPoint(new DOMPoint(x1, y1)), covers = tl.x <= 0 && tl.y <= 0 && br.x >= W && br.y >= H;
    ctx.imageSmoothingEnabled = false;
    if (!covers) { const mp = ctx.createPattern(TX.mount, 'repeat'); mp.setTransform(MK); ctx.fillStyle = mp; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.setTransform(MK); ctx.translate(10, 12); ctx.fillStyle = 'rgba(80,60,30,.25)'; ctx.fill(sheet); ctx.restore(); }
    const pp = ctx.createPattern(TX.paper, 'repeat'); pp.setTransform(MK); ctx.save(); ctx.setTransform(MK); ctx.clip(sheet); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = pp; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.imageSmoothingEnabled = true;
    ix.setTransform(1, 0, 0, 1, 0, 0); ix.globalCompositeOperation = 'source-over'; ix.globalAlpha = 1; ix.clearRect(0, 0, W, H);
  };
  /* print(ctx, o): woodgrain + baren/goma-zuri/fibre erosion on the ink, then lay the ink on the paper.
     o.wash 0..1: wash the print back toward bare paper (end card). */
  U.print = function (ctx, o = {}) {
    ix.setTransform(1, 0, 0, 1, 0, 0);
    ix.imageSmoothingEnabled = false;
    ix.globalCompositeOperation = 'source-atop'; ix.globalAlpha = .13; ix.fillStyle = pat(TX.grain, MK, 1.3); ix.fillRect(0, 0, W, H);
    ix.globalCompositeOperation = 'destination-out'; ix.globalAlpha = 1; ix.fillStyle = pat(TX.erode, MK, 1.25); ix.fillRect(0, 0, W, H);
    ix.globalCompositeOperation = 'source-over'; ix.globalAlpha = 1; ix.imageSmoothingEnabled = true;
    const wash = o.wash || 0;
    ctx.save(); ctx.setTransform(MK); ctx.clip(U.sheetPath); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - .8 * wash; ctx.drawImage(INK, 0, 0); ctx.restore();
  };
  /* glow(ctx, p, r, a, rgb): warm light over the finished print (screen), at world point p, radius r in SCREEN px
     (multiply by Ukiyoe.CAMZ for a world radius); rgb '255,236,190' paper-warm by default. */
  U.glow = function (ctx, p, r, a, rgb = '255,236,190') {
    const q = MK.transformPoint(new DOMPoint(p[0], p[1]));
    ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.fillRect(q.x - r, q.y - r, 2 * r, 2 * r); ctx.restore();
  };

  // ------------------------------------------------------------------ words: a cream cartouche behind every caption
  // plate(ctx, x0, y0, x1, y1, a): cream cartouche (screen px), fibres, thick + thin ink border
  const plate = U.plate = function (ctx, x0, y0, x1, y1, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(243,231,198,.97)'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.globalAlpha = a * .5; ctx.drawImage(TX.fiber, 0, 0, 512, 512, x0, y0, x1 - x0, y1 - y0); ctx.globalAlpha = a;
    ctx.strokeStyle = PAL.sumi; ctx.lineWidth = 3.4; ctx.strokeRect(x0 + 6, y0 + 6, x1 - x0 - 12, y1 - y0 - 12); ctx.lineWidth = 1.2; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    ctx.restore();
  };
  // captions(ctx, t, lines): each line on its own cartouche that drops in 14 px as it appears (portrait y 430)
  U.captions = function (ctx, t, lines) {
    const CAP = U.CAP, cx = W / 2;
    for (const [a, b, s, src] of lines) {
      const al = Pilot.win(t, a, b, .35, .45); if (al <= 0) continue;
      const str = Pilot.tr(s), two = str.includes('\n'), size = two ? 54 : 62, y = 430;
      ctx.font = `700 ${size}px ${CAP.font}`; let w = Math.max(...str.split('\n').map(l => ctx.measureText(l).width));
      let bottom = y + (two ? size * 1.55 : 0) + size * .32 + 30;
      if (src) { ctx.font = `400 28px ${CAP.srcFont}`; w = Math.max(w, ctx.measureText(Pilot.tr(src)).width); bottom = y + (two ? size * 1.55 : 0) + 76 + 40; }
      const half = Math.min(500, w / 2 + 52);
      const drop = (1 - eo(seg(t, a, a + .35))) * 14;
      plate(ctx, cx - half, y - size - 34 - drop, cx + half, bottom - drop, al);
    }
    Story.captions(ctx, t, lines, CAP);
  };
  // endCard(ctx, t, card, at, wash): the cartouche (fades in with `wash`) + Story.endCard in sumi on it
  U.endCard = function (ctx, t, card, at, wash) {
    if (wash > 0) { plate(ctx, 110, 600, 970, 1150, wash); Story.endCard(ctx, t, card, at, { font: "'Noto Serif KR',serif", color: '#231f1c', srcColor: '#3a3430', titleShadow: '' }); }
  };

  window.Ukiyoe = U;
})();

/* kit-inkwash.js — house style "ink + grey watercolour + orange coloured pencil sketchbook" for word-log films
   (global: window.Inkwash). A sketchbook page: bare warm-white paper with a real tooth, grey watercolour washes that pool
   and granulate, ink lines that taper and boil (3 drawings cycled at 8 fps), graphite hatching, orange construction
   lines running off into the unfinished sheet — and ONE warm colour: an amber wash (the thing that matters, the light).
   Default character: a little hooded crow-traveller (round head, short beak, ink cloak, stick legs, mitten hands).
   Worked example: sermons/2026-10-24-cross-styles/film/scenes/cs-inkwash.html (잘라 낸 건 다리였다 · 12).
   Style card: styles/inkwash/STYLE.md. New scene: styles/inkwash/template.html + script.example.js.

   HOW A FRAME IS MADE
     init:  K.init() (paper tooth tiles, sprites) → build the world ONCE into white-based layers (K.whiteLayer + K.scratch
            + K.wash for washes, then 3 copies with the boiled lines: K.ink / K.pencil with drawing index f = 0..2)
     frame: K.boilAt(t) (picks the drawing K.BF) → K.paper(ctx, cam) → K.layer(ctx, cam, parallax, () => K.mulSheet(…))
            for far / plate / foreground (MULTIPLIED onto the paper) → live things (figures K.drawFig, props, light
            K.drawBloom) inside the plate's layer → K.endPlate → K.captions → K.endCard.
   Units: world px (the plate is authored around a 1080×1920 frame; camera {x, y, z} looks at world (x, y) with zoom z,
   world y = 960 is the frame centre at z = 1). Figure sizes: s = 1 ≈ a 330-px-tall figure. Deterministic: seeded
   randomness only (Pilot.rng / noise / HD.hash) — any seek order gives the same frame. No network, no images.
   Load after lib.js and story.js. */
(function () {
  const TAU = Math.PI * 2;
  const { clamp, lerp, ss, eo, eio, rng, noise, fbm } = Pilot;
  const K = {};
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  /* ================================================================ palette, type */
  K.INK = '#161413';                 // ink (lines, my cloak)
  K.PAPER = '#fbfaf6';               // the sheet under the tooth
  K.AMBER = [222, 136, 52];          // THE accent: amber wash (body .7); dark streak K.AMBER_DK; flecks 'rgba(214,132,56,.85)'
  K.AMBER_DK = [176, 92, 34];
  K.WARM = [246, 190, 96];           // the light's bloom wash (around an amber source)
  K.GREY = [96, 96, 100];            // grey watercolour (glazes)
  K.W0 = [70, 70, 74];               // darker grey wash (slabs, hills, the gap)
  K.WARMG = [150, 132, 112];         // warm grey (stone, wood posts)
  K.GREYW = [118, 114, 112];         // a grey-washed prop (other people's things)
  K.ORANGE = [210, 101, 44];         // orange coloured pencil (construction lines) — use K.PAT.orange, not a flat colour
  K.FONT = "'Gowun Batang',serif";   // captions, source line, end card (brush-like serif, sits on paper)
  K.FONTS = ["700 62px 'Gowun Batang'", "400 30px 'Gowun Batang'"];   // for Pilot.run({ fonts })
  K.rgba = rgba;                     // rgba([r,g,b], a) → css

  /* ================================================================ HD — the hand-drawn line toolkit (from lab-inkwash)
     Lines are variable-width ribbons built from densely sampled polylines: a static hand wobble per stroke (seeded), a
     boil displacement per drawing, pressure along the length, tapered ends, ragged edges. Points are [x, y] arrays. */
  const HD = {};
  HD.hash = (i, s = 0) => { let h = (Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  HD.t12 = t => Math.floor(t * 12 + 1e-6) / 12;   // time quantised to 12 fps (motion on twos)
  // Catmull-Rom spline through P, resampled every `step` px (closed: a loop)
  HD.spline = (P, step = 3, closed = false) => {
    const n = P.length; if (n < 2) return P.map(p => p.slice());
    const get = i => closed ? P[((i % n) + n) % n] : P[clamp(i, 0, n - 1)];
    const out = [], segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), m = Math.max(1, Math.ceil(L / step));
      for (let j = 0; j < m; j++) { const t = j / m, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(k => .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3))); }
    }
    out.push(closed ? out[0].slice() : P[n - 1].slice()); return out;
  };
  // a straight segment a→b sampled every `step` px
  HD.seg = (a, b, step = 4) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(L / step)), o = [];
    for (let i = 0; i <= m; i++) o.push([lerp(a[0], b[0], i / m), lerp(a[1], b[1], i / m)]); return o; };
  // a polygon / polyline through P, sampled every `step` px
  HD.poly = (P, closed = false, step = 4) => { const o = []; const n = P.length, m = closed ? n : n - 1; for (let i = 0; i < m; i++) { const sg = HD.seg(P[i], P[(i + 1) % n], step); if (i) sg.shift(); o.push(...sg); } return o; };
  // an elliptical arc (centre, radii, angles a0→a1 in rad, rotation rot)
  HD.arc = (cx, cy, rx, ry, a0, a1, step = 4, rot = 0) => { const L = Math.abs(a1 - a0) * Math.max(rx, ry), m = Math.max(2, Math.ceil(L / step)), o = [], c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i <= m; i++) { const a = lerp(a0, a1, i / m), x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * c - y * s, cy + x * s + y * c]); } return o; };
  HD.normals = pts => pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
  HD.lengths = pts => { const s = [0]; for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return s; };
  // hand wobble: perpendicular low-frequency displacement (amp px, wavelength wl px)
  HD.wob = (pts, seed, amp, wl = 120) => { if (!amp || pts.length < 2) return pts; const N = HD.normals(pts), Sx = HD.lengths(pts), oy = (seed * 17.37) % 997;
    return pts.map((p, i) => { const d = (noise(Sx[i] / wl, oy) - .5) * 2 * amp; return [p[0] + N[i][0] * d, p[1] + N[i][1] * d]; }); };
  // one boiled drawing: a new wobble + a tiny drift for drawing index f (0..2)
  HD.boil = (pts, seed, f, amp, wl = 90) => { if (!amp) return pts; const s = (seed * 31 + f * 977) | 0, dx = (HD.hash(s, 1) - .5) * amp, dy = (HD.hash(s, 2) - .5) * amp;
    return HD.wob(pts, s, amp, wl).map(p => [p[0] + dx, p[1] + dy]); };
  // a closed Path2D around pts with half-width wf(u, s, i, L)/2 (round caps where the width is > .8 px)
  HD.ribbon = (pts, wf) => {
    const n = pts.length, N = HD.normals(pts), Sx = HD.lengths(pts), L = Sx[n - 1] || 1, Lf = [], Rt = [], ws = [];
    for (let i = 0; i < n; i++) { const w = Math.max(0, wf(Sx[i] / L, Sx[i], i, L)) / 2; ws.push(w); Lf.push([pts[i][0] + N[i][0] * w, pts[i][1] + N[i][1] * w]); Rt.push([pts[i][0] - N[i][0] * w, pts[i][1] - N[i][1] * w]); }
    const p = new Path2D(); p.moveTo(Lf[0][0], Lf[0][1]); for (let i = 1; i < n; i++) p.lineTo(Lf[i][0], Lf[i][1]);
    const ae = Math.atan2(N[n - 1][1], N[n - 1][0]); if (ws[n - 1] > .4) p.arc(pts[n - 1][0], pts[n - 1][1], ws[n - 1], ae, ae + Math.PI, true); else p.lineTo(Rt[n - 1][0], Rt[n - 1][1]);
    for (let i = n - 1; i >= 0; i--) p.lineTo(Rt[i][0], Rt[i][1]);
    const a0 = Math.atan2(N[0][1], N[0][0]); if (ws[0] > .4) p.arc(pts[0][0], pts[0][1], ws[0], a0 + Math.PI, a0, true);
    p.closePath(); return p;
  };
  /* HD.ink(ctx, pts, o) — a pressure stroke along pts. o: w (px), ts / te (taper length at start / end, px), mn / mnE (min
     width factor at the tips), press (pressure variation 0..1), pw (pressure wavelength px), rough (edge raggedness),
     seed, col (colour or pattern). */
  HD.ink = (ctx, pts, o = {}) => {
    if (!pts || pts.length < 2) return;
    const w = o.w ?? 8, ts = o.ts ?? w * 2.5, te = o.te ?? w * 3.5, mn = o.mn ?? .2, press = o.press ?? .3, pw = o.pw ?? 70, rough = o.rough ?? .08, seed = o.seed ?? 1, mnE = o.mnE ?? mn;
    const wf = (u, s, i, L) => { const k = Math.min(1, mn + (1 - mn) * ss(0, ts, s)) * Math.min(1, mnE + (1 - mnE) * ss(0, te, L - s));
      return w * k * (1 + press * (noise(s / pw, seed * 3.7 % 500) - .5) * 2) * (1 + rough * (HD.hash(i, seed) - .5) * 2); };
    ctx.fillStyle = o.col || '#151312'; ctx.fill(HD.ribbon(pts, wf));
  };
  HD.pathOf = pts => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (const q of pts) p.lineTo(q[0], q[1]); p.closePath(); return p; };
  K.HD = HD;
  K.t12 = HD.t12;

  /* the boiled drawing shown in this frame (0..2): set it once per frame with K.boilAt(t) — every live line reads it */
  K.BF = 0;
  K.boilAt = t => (K.BF = Math.floor(t * 8 + 1e-6) % 3);

  /* pencil(g, pts, seed, f, pat, o) — a coloured-pencil / graphite line: pat = K.PAT.orange | .graphite (the colour sits
     only on the paper's tooth peaks). f = drawing index (K.BF live, 0..2 for a built layer). o: w (2–3 px), wob, boil. */
  K.pencil = function (g, pts, seed, f, pat, o = {}) { HD.ink(g, HD.boil(HD.wob(pts, seed, o.wob ?? 1.2, 200), seed, f, o.boil ?? 1, 120), { w: o.w ?? 3.2, ts: 30, te: 40, mn: .3, press: .5, pw: 120, rough: .2, seed, col: pat, ...o }); };
  /* ink(g, pts, seed, f, o) — a dip-pen ink line (tapered, pressure, double wobble, boiled for drawing f). o: w (≈ 3–6 px),
     ts / te tapers, wob, boil, col (default K.INK). */
  K.ink = function (g, pts, seed, f, o = {}) { HD.ink(g, HD.boil(HD.wob(HD.wob(pts, seed + 3, (o.wob ?? 2.6) * .5, 26), seed, o.wob ?? 3.4, 140), seed, f, o.boil ?? 1.6, 80), { w: 5.5, ts: 8, te: 14, mn: .35, press: .45, pw: 60, rough: .12, seed, col: K.INK, ...o }); };
  const pencil = K.pencil, ink = K.ink;

  /* ================================================================ paper: one periodic tooth tile shared by paper, pencil
     (colour on the peaks) and ink (dropout in the valleys). Patterns in K.PAT: paper, peaks, orange, graphite, ink, pool. */
  const NT = 1008;
  function pnoise(x, y, P, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const h = (a, b) => HD.hash((((a % P) + P) % P) * 7919 + (((b % P) + P) % P), s);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  const TX = {}, PAT = {};
  K.TX = TX; K.PAT = PAT;
  function tile(fn) { const c = Pilot.canvas(NT, NT), g = c.getContext('2d'), d = g.createImageData(NT, NT); for (let i = 0; i < NT * NT; i++) fn(i, d.data, i * 4); g.putImageData(d, 0, 0); return c; }
  function buildTiles() {
    const T = new Float32Array(NT * NT), r = rng(21);
    for (let y = 0; y < NT; y++) for (let x = 0; x < NT; x++) T[y * NT + x] = .62 * pnoise(x / 7, y / 7, 144, 1) + .38 * pnoise(x / 2.1, y / 2.1, 480, 2);
    for (let k = 0; k < 300; k++) { let x = r() * NT, y = r() * NT, a = r() * TAU; const l = 8 + r() * 30;
      for (let i = 0; i < l; i++) { a += (r() - .5) * .3; x += Math.cos(a); y += Math.sin(a); const xi = ((x | 0) % NT + NT) % NT, yi = ((y | 0) % NT + NT) % NT; T[yi * NT + xi] = Math.min(1, T[yi * NT + xi] + .18); } }
    const at = (x, y) => T[((y + NT) % NT) * NT + ((x + NT) % NT)];
    const base = [251, 250, 246];
    TX.paper = tile((i, D, o) => { const x = i % NT, y = (i / NT) | 0, sh = (at(x - 1, y - 1) - at(x + 1, y + 1)) * 34, m = (pnoise(x / 252, y / 252, 4, 3) - .5) * 6, k = sh + m + (r() - .5) * 3;
      D[o] = base[0] + k; D[o + 1] = base[1] + k; D[o + 2] = base[2] + k - m * .3; D[o + 3] = 255; });
    const mask = (rgb, mode, thr, soft, amax) => tile((i, D, o) => { const v = mode === 'peak' ? (T[i] - thr) / soft : (thr - T[i]) / soft; D[o] = rgb[0]; D[o + 1] = rgb[1]; D[o + 2] = rgb[2]; D[o + 3] = clamp(v) * amax * 255; });
    TX.peaks = mask([0, 0, 0], 'peak', .5, .18, 1);
    TX.orange = mask([210, 101, 44], 'peak', .22, .3, .9);
    TX.graphite = mask([60, 58, 58], 'peak', .25, .3, .75);
    const ik = Pilot.hex(K.INK);
    TX.ink = tile((i, D, o) => { const k = clamp((.3 - T[i]) / .1) * .22; D[o] = lerp(ik[0], 250, k); D[o + 1] = lerp(ik[1], 249, k); D[o + 2] = lerp(ik[2], 245, k); D[o + 3] = 255; });
    TX.pool = tile((i, D, o) => { const x = i % NT, y = (i / NT) | 0, v = .57 * pnoise(x / 72, y / 72, 14, 5) + .29 * pnoise(x / 36, y / 36, 28, 6) + .14 * pnoise(x / 18, y / 18, 56, 7);
      D[o] = 60; D[o + 1] = 58; D[o + 2] = 58; D[o + 3] = clamp((v - .45) * 2.2) * 120; });
    const pc = Pilot.canvas(2, 2).getContext('2d');
    for (const k of ['paper', 'peaks', 'orange', 'graphite', 'ink', 'pool']) PAT[k] = pc.createPattern(TX[k], 'repeat');
  }

  /* ================================================================ watercolour wash
     Washes are painted into a WHITE-based layer (K.whiteLayer) through a scratch canvas with the same pixel mapping
     (K.scratch — make one the size of the layer before washing into it), then multiplied in: pigment pools at the edge,
     granulates on the tooth peaks, may carry streaks. */
  let TW = null;   // { c, g, ox, oy, k }: pixel = (world - o) * k
  K.bbox = function (P, pad) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of P) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    return [Math.floor(x0 - pad), Math.floor(y0 - pad), Math.ceil(x1 - x0 + 2 * pad), Math.ceil(y1 - y0 + 2 * pad)]; };
  /* scratch(w, h, ox, oy, k = 1) — set the wash scratch canvas: w×h px, world (ox, oy) at its top-left, k px per world px.
     Must match the layer you wash into. scratchFree() releases it once the layers are built. */
  K.scratch = function (w, h, ox, oy, k = 1) { const c = Pilot.canvas(w, h), g = c.getContext('2d'); g.setTransform(k, 0, 0, k, -ox * k, -oy * k); g.lineJoin = g.lineCap = 'round'; return (TW = { c, g, ox, oy, k }); };
  K.scratchFree = function () { if (TW) TW.c.width = TW.c.height = 1; TW = null; };
  /* wash(g, pts, col [r,g,b], a, o) — a watercolour wash over the polygon pts into layer g (multiplied). o: seed, round
     (spline the outline), wob / wl (edge wobble px / wavelength), fr (fine fringe), pool (pigment pooling .5), streak (n
     brush streaks inside; horiz: 1 for horizontal), edge (dark rim factor .9), gran (granulation .45), blur (px). */
  K.wash = function (g, pts, col, a, o = {}) {
    const sd = o.seed || 1;
    let P = o.round ? HD.spline(pts, 5, true) : HD.poly(pts, true, 5);
    P = HD.wob(P, sd, o.wob ?? 3, o.wl ?? 60); P = HD.wob(P, sd + 5, o.fr ?? 1.3, 8);
    const [bx, by, bw, bh] = K.bbox(P, 14), t = TW.g, path = HD.pathOf(P);
    t.save(); t.globalCompositeOperation = 'source-over'; t.globalAlpha = 1; t.clearRect(bx, by, bw, bh);
    t.fillStyle = rgba(col, a); t.fill(path);
    t.save(); t.clip(path); t.globalCompositeOperation = 'source-atop'; t.globalAlpha = o.pool ?? .5; t.fillStyle = PAT.pool; t.fillRect(bx, by, bw, bh); t.restore();
    if (o.streak) { t.save(); t.clip(path); const r = rng(sd + 9); const vert = o.horiz ? 0 : 1;
      for (let i = 0; i < o.streak; i++) { let a0, a1;
        if (vert) { const x = bx + r() * bw; a0 = [x, by - 20 + r() * bh * .3]; a1 = [x + (r() - .5) * 14, by + bh * (.5 + r() * .6)]; }
        else { const y = by + r() * bh; a0 = [bx - 20 + r() * bw * .3, y]; a1 = [bx + bw * (.5 + r() * .6), y + (r() - .5) * 10]; }
        HD.ink(t, HD.wob(HD.seg(a0, a1, 8), sd + i, 4, 80), { w: 8 + r() * 30, ts: 40, te: 60, mn: .2, press: .5, seed: sd + i * 3, col: rgba(col, a * (.25 + r() * .5)) }); } t.restore(); }
    t.lineJoin = 'round'; t.strokeStyle = rgba(col, Math.min(1, a * (o.edge ?? .9))); t.lineWidth = 2.6; t.save(); t.clip(path); t.stroke(path); t.restore();
    t.globalCompositeOperation = 'destination-out'; t.globalAlpha = (o.gran ?? .45) * .3; t.fillStyle = PAT.peaks; t.fillRect(bx, by, bw, bh);
    t.restore();
    const k = TW.k, px = Math.max(0, Math.floor((bx - TW.ox) * k)), py = Math.max(0, Math.floor((by - TW.oy) * k)),
      pw = Math.min(TW.c.width, Math.ceil((bx + bw - TW.ox) * k)) - px, ph = Math.min(TW.c.height, Math.ceil((by + bh - TW.oy) * k)) - py;
    if (pw <= 0 || ph <= 0) return;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 1; if (o.blur) g.filter = `blur(${o.blur}px)`; g.drawImage(TW.c, px, py, pw, ph, px, py, pw, ph); g.restore();
  };
  const wash = K.wash;
  /* washLive(ctx, pts, col, a, o) — a cheaper wash for LIVE shapes drawn every frame on the camera canvas (a growing
     leaf, a stain spreading): multiplied fill + pooling + a darker rim, no scratch canvas. o: seed, round, wob, edge. */
  K.washLive = function (ctx, pts, col, a, o = {}) {
    const sd = o.seed || 1; let P = o.round ? HD.spline(pts, 4, true) : HD.poly(pts, true, 4);
    P = HD.wob(P, sd, o.wob ?? 1.5, o.wl ?? 30); const path = HD.pathOf(P), [bx, by, bw, bh] = K.bbox(P, 4);
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgba(col, a); ctx.fill(path);
    ctx.clip(path); ctx.globalAlpha = o.pool ?? .5; ctx.fillStyle = PAT.pool; ctx.fillRect(bx, by, bw, bh); ctx.globalAlpha = 1;
    ctx.strokeStyle = rgba(col, Math.min(1, a * (o.edge ?? 1.3))); ctx.lineWidth = 2.6; ctx.stroke(path); ctx.restore();
  };
  /* bloomEdge(g, cx, cy, r, col, a, seed, a0, a1, sq) — the hard rim a wet bloom leaves (a ragged arc a0→a1, y squashed sq) */
  K.bloomEdge = function (g, cx, cy, r, col, a, seed, a0 = 0, a1 = TAU, sq = .8) { const pts = []; for (let i = 0; i <= 160; i++) { const an = lerp(a0, a1, i / 160), rr = r * (1 + .12 * (fbm(an * 3 + seed, seed, 4) - .5) * 2 + .05 * Math.sin(an * 23 + seed)); pts.push([cx + Math.cos(an) * rr, cy + Math.sin(an) * rr * sq]); }
    g.save(); g.globalCompositeOperation = 'multiply'; g.strokeStyle = rgba(col, a); g.lineWidth = 2; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); g.restore(); };
  /* whiteLayer(w, h, ox, oy, k = 1) → { c, g, x0, y0, k } — a white canvas for a world rect (world (ox, oy) at top-left);
     paint washes and lines into g in world px; show it with K.mulSheet inside K.layer. */
  K.whiteLayer = function (w, h, ox, oy, k = 1) { const c = Pilot.canvas(w, h), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.setTransform(k, 0, 0, k, -ox * k, -oy * k); g.lineJoin = g.lineCap = 'round'; return { c, g, x0: ox, y0: oy, k }; };
  /* prop({ w, h, ox, oy, k, base(g), lines(g, f) }) → { c: [3 canvases] } — a boiled sprite of a thing (a tool, a cross, a
     lamp): base() lays washes once (local coords; the wash scratch is set for you), lines(g, f) draws drawing f's ink and
     pencil. Local (ox, oy) is the canvas' top-left, k px per unit (2 = crisp under a push). Draw with drawImage(sp.c[K.BF]). */
  K.prop = function (o) {
    const k = o.k ?? 2, base = Pilot.canvas(o.w, o.h), bg = base.getContext('2d'); bg.setTransform(k, 0, 0, k, -o.ox * k, -o.oy * k);
    K.scratch(o.w, o.h, o.ox, o.oy, k); if (o.base) o.base(bg);
    return { c: [0, 1, 2].map(f => {
      const c = Pilot.canvas(o.w, o.h), g = c.getContext('2d'); g.drawImage(base, 0, 0); g.setTransform(k, 0, 0, k, -o.ox * k, -o.oy * k); g.lineJoin = g.lineCap = 'round';
      if (o.lines) o.lines(g, f);
      g.setTransform(1, 0, 0, 1, 0, 0); return c; }) };
  };

  /* ================================================================ camera and layers
     cam = { x, y, z, sx?, sy? }: looks at world (x, y), zoom z, shake offset (sx, sy) px. A layer of parallax p moves p×
     as far and zooms 1 + (z − 1)·p (far .5, plate 1, foreground 1.25). */
  K.layer = function (ctx, cm, p, fn) { const W2 = Pilot.W / 2, H2 = Pilot.H / 2, z = 1 + (cm.z - 1) * p, cx = cm.x * p, cy = H2 + (cm.y - H2) * p; ctx.save(); ctx.setTransform(z, 0, 0, z, W2 - cx * z + (cm.sx || 0) * p, H2 - cy * z + (cm.sy || 0) * p); fn(); ctx.restore(); };
  // the world rect visible under ctx's current transform (+2 px)
  K.vis = function (ctx) { const m = ctx.getTransform().inverse(), a = m.transformPoint(new DOMPoint(0, 0)), b = m.transformPoint(new DOMPoint(Pilot.W, Pilot.H)); return { x0: Math.min(a.x, b.x) - 2, y0: Math.min(a.y, b.y) - 2, x1: Math.max(a.x, b.x) + 2, y1: Math.max(a.y, b.y) + 2 }; };
  // multiply a white-based layer onto ctx (only its visible part)
  K.mulSheet = function (ctx, s) {
    const v = K.vis(ctx), x0 = Math.max(s.x0, v.x0), y0 = Math.max(s.y0, v.y0), x1 = Math.min(s.x0 + s.c.width / s.k, v.x1), y1 = Math.min(s.y0 + s.c.height / s.k, v.y1);
    if (x1 <= x0 || y1 <= y0) return;
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(s.c, (x0 - s.x0) * s.k, (y0 - s.y0) * s.k, (x1 - x0) * s.k, (y1 - y0) * s.k, x0, y0, x1 - x0, y1 - y0); ctx.restore();
  };
  // camera keyframe mix (a → b by k, eased by the caller)
  K.mixCam = (a, b, k) => k <= 0 ? a : k >= 1 ? b : { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
  /* camExtent(camAt, dur, p = 1, pad = 40) → [x0, x1] — the world x range a layer of parallax p shows over the film
     (size the built layers with it). */
  K.camExtent = function (camAt, dur, p = 1, pad = 40) { let x0 = 1e9, x1 = -1e9;
    for (let t = 0; t <= dur; t += .05) { const c = camAt(t), z = 1 + (c.z - 1) * p, hw = Pilot.W / 2 / z + pad; x0 = Math.min(x0, c.x * p - hw); x1 = Math.max(x1, c.x * p + hw); } return [x0, x1]; };
  /* hitShake(t, at, dur = .55, ax = 15, ay = 11) → [sx, sy] — the "hit": a jolt that dies over dur (set cam.sx/sy) */
  K.hitShake = function (t, at, dur = .55, ax = 15, ay = 11) { const k = 1 - ss(at, at + dur, t); return t >= at ? [ax * k * Math.sin(t * 97), ay * k * Math.sin(t * 131 + 1)] : [0, 0]; };
  /* paper(ctx, cm) — the bare sheet: flat paper colour, then the tooth pattern locked to the plate (parallax 1) */
  K.paper = function (ctx, cm) {
    ctx.fillStyle = K.PAPER; ctx.fillRect(0, 0, Pilot.W, Pilot.H);
    K.layer(ctx, cm, 1, () => { const v = K.vis(ctx); ctx.fillStyle = PAT.paper; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); });
  };

  /* ================================================================ the figure rig — the crow-traveller
     A figure is a SPEC (plain object) → K.drawFig draws it. Spec fields:
       s scale (1 ≈ 330 px tall), f facing (+1 right / −1 left), gy ground y, hip [x, y], ang torso lean (rad, + = forward
       when f = 1: use f·lean), feet [[x, y], [x, y]] ankle targets (far, near), hands [far, near] grip points or null
       (null = hangs), hand ['fist' | 'flat' | 'open', …], tilt head tilt (rad), eye 'calm' | 'strain' | 'down' | 'shock',
       sway hem sway px, me (solid black ink — the main character; others are grey-washed with an ink outline), seed,
       alpha, farFront (far arm drawn in front of the body: when it holds something in front), wash (others' cloak colour,
       css), sx (horizontal squash 0..1 — K.turn sets it).
     Arms are 2-bone IK from the SHOULDER on the body outline (upper 78·s, fore 74·s — fixed lengths), the mitten hand is
     drawn AT the grip point; one hand holds one object. Legs: IK hip → ankle (96·s, 90·s), knees bend forward. */
  function ik(a, t, l1, l2, pick) {
    let dx = t[0] - a[0], dy = t[1] - a[1], d = Math.hypot(dx, dy) || 1e-6; const dd = clamp(d, Math.abs(l1 - l2) + .5, l1 + l2 - .5);
    const tx = a[0] + dx / d * dd, ty = a[1] + dy / d * dd, an = Math.atan2(ty - a[1], tx - a[0]), b = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
    const j1 = [a[0] + Math.cos(an + b) * l1, a[1] + Math.sin(an + b) * l1], j2 = [a[0] + Math.cos(an - b) * l1, a[1] + Math.sin(an - b) * l1];
    return [pick(j1, j2), [tx, ty]];
  }
  K.ik = ik;   // ik(root, target, l1, l2, pick(j1, j2)) → [joint, reached target] — 2-bone IK, fixed lengths
  /* frame(F) → { up, fw, P(a, b) } — the torso frame: P(a, b) = hip + a·s forward + b·s up (lean included) */
  function frame(F) { const up = [Math.sin(F.ang), -Math.cos(F.ang)], fw = [F.f * Math.cos(F.ang), F.f * Math.sin(F.ang)], s = F.s;
    return { up, fw, P: (a, b) => [F.hip[0] + fw[0] * a * s + up[0] * b * s, F.hip[1] + fw[1] * a * s + up[1] * b * s] }; }
  K.frame = frame;
  K.shoulderOf = F => frame(F).P(4, 136);   // the near shoulder (where a carried beam rests)
  const TOR = [[-24, -6], [-33, 30], [-37, 80], [-33, 122], [-22, 146], [-4, 157], [14, 154], [27, 141], [34, 112], [35, 64], [31, 18], [24, -6]];
  const HEADARC = (() => { const o = []; for (let i = 0; i <= 16; i++) { const th = lerp(.4, TAU - .36, i / 16); o.push([37 * Math.cos(th), 35 * Math.sin(th)]); } o.push([43, -9], [50, -3], [49, 3], [42, 9]); return o; })();   // round head, short rounded beak
  /* drawFig(ctx, F, mid, back) — draw the figure. back(): drawn first (behind everything: a beam on the far shoulder);
     mid(): drawn between body and near arm (a thing held in front, a tool in the near hand). */
  K.drawFig = function (ctx, F, mid, back) {
    const s = F.s, f = F.f, me = !!F.me, al = F.alpha ?? 1; if (al <= 0) return;
    const BF = K.BF;
    ctx.save(); ctx.globalAlpha = al; ctx.lineJoin = ctx.lineCap = 'round';
    if (F.sx != null && F.sx !== 1) { ctx.translate(F.hip[0], 0); ctx.scale(F.sx, 1); ctx.translate(-F.hip[0], 0); }
    const { up, fw, P } = frame(F), sd = F.seed || (me ? 7 : 3);
    // its shadow on the road (a soft grey wash)
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = al * .5; ctx.drawImage(TX.shadow, F.hip[0] - 90 * s, F.gy - 14 * s, 180 * s, 34 * s); ctx.restore();
    const sh = P(4, 136), shF = P(-3, 134);
    const elbowPick = (a, b) => (a[1] - f * a[0] * .35) > (b[1] - f * b[0] * .35) ? a : b, kneePick = (a, b) => f * a[0] > f * b[0] ? a : b;
    const hand = (hd, el, type, halo) => {
      const an = Math.atan2(hd[1] - el[1], hd[0] - el[0]); let n1 = [-Math.sin(an), Math.cos(an)]; if (n1[1] > 0) n1 = [-n1[0], -n1[1]];
      const parts = [];
      if (type === 'flat') parts.push([hd[0] + f * 6 * s, hd[1] - 3 * s, 16 * s, 7.5 * s, 0]);
      else if (type === 'open') { parts.push([hd[0], hd[1], 12 * s, 9 * s, an]); for (const k of [-.5, 0, .5]) parts.push([hd[0] + Math.cos(an + k) * 13 * s, hd[1] + Math.sin(an + k) * 13 * s, 4 * s, 3.4 * s, an + k]); }
      else { parts.push([hd[0], hd[1], 12.5 * s, 11.5 * s, an]); parts.push([hd[0] + n1[0] * 9 * s + Math.cos(an) * 3 * s, hd[1] + n1[1] * 9 * s + Math.sin(an) * 3 * s, 5.5 * s, 4.2 * s, an]); }
      if (halo) { ctx.fillStyle = PAT.paper; for (const [x, y, rx, ry, r] of parts) { ctx.beginPath(); ctx.ellipse(x, y, rx + 4.5 * s, ry + 4.5 * s, r, 0, TAU); ctx.fill(); } }
      ctx.fillStyle = PAT.ink; for (const [x, y, rx, ry, r] of parts) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, r, 0, TAU); ctx.fill(); }
    };
    const arm = (S0, T, type, halo) => {
      if (!T) T = [S0[0] - f * 8 * s, S0[1] + 140 * s];
      const [el, hd] = ik(S0, T, 78 * s, 74 * s, elbowPick), pts = HD.boil(HD.spline([S0, el, hd], 3), sd + 11, BF, .7, 30);
      if (halo) HD.ink(ctx, pts, { w: 15.5 * s, mn: .2, ts: 40 * s, te: 2, press: 0, rough: 0, col: PAT.paper });
      HD.ink(ctx, pts, { w: 10.5 * s, mn: .75, ts: 6, te: 3, press: .2, rough: .06, seed: sd + 12, col: PAT.ink });
      hand(hd, el, type, halo);
    };
    const leg = T => {
      const hp = P(-2, -2), ank = [T[0], T[1] - 7 * s];
      const [kn, an] = ik(hp, ank, 96 * s, 90 * s, kneePick);
      HD.ink(ctx, HD.boil(HD.spline([hp, kn, an], 3), sd + 20, BF, .6, 30), { w: 8 * s, mn: .85, ts: 2, te: 2, press: .12, seed: sd + 21, col: PAT.ink });
      const lift = Math.max(0, F.gy - T[1]), toe = lift > 6 * s ? .45 : 0;
      HD.ink(ctx, HD.boil([[an[0] - f * 3 * s, an[1] + 3 * s], [an[0] + f * Math.cos(toe) * 19 * s, an[1] + 6 * s + Math.sin(toe) * 19 * s]], sd + 22, BF, .4, 10), { w: 6.5 * s, mn: .6, ts: 3, te: 5, seed: sd + 23, col: PAT.ink });
    };
    if (back) back();
    if (!F.farFront) arm(shF, F.hands[0], F.hand?.[0] || 'fist', false);
    leg(F.feet[0]); leg(F.feet[1]);
    // cloak: torso (in the body frame) + a skirt that hangs from the hip; round hood with a short beak
    const hemD = Math.max(40 * s, F.gy - F.hip[1] - 62 * s), sw = (F.sway || 0) * s;
    const skx = (a, b) => [F.hip[0] + f * a * s + sw * b / hemD, F.hip[1] + b];
    const tor = HD.spline(TOR.map(([a, b]) => P(a, b)), 4, true);
    const sk = HD.spline([skx(-30, -16), skx(28, -16), skx(38, hemD * .5), skx(50, hemD), skx(30, hemD + 5), skx(10, hemD - 1), skx(-12, hemD + 5), skx(-34, hemD), skx(-50, hemD - 2), skx(-41, hemD * .5)], 4, true);
    const tilt = F.ang + (F.tilt || 0), hu = [Math.sin(tilt), -Math.cos(tilt)], hf = [f * Math.cos(tilt), f * Math.sin(tilt)], N0 = P(6, 146);
    const Hc = [N0[0] + hu[0] * 33 * s + hf[0] * 3 * s, N0[1] + hu[1] * 33 * s + hf[1] * 3 * s], Q = (a, b) => [Hc[0] + (hf[0] * a + hu[0] * b) * s, Hc[1] + (hf[1] * a + hu[1] * b) * s];
    const head = HD.spline(HEADARC.map(([a, b]) => Q(a, b)), 4, true);
    const cw = p => { let A = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; A += p[i][0] * q[1] - q[0] * p[i][1]; } return A < 0 ? p.slice().reverse() : p; };   // one winding, so overlaps never cancel
    const parts = [tor, sk, head].map((p, i) => cw(HD.boil(p, sd + 30 + i, BF, 1.1, 40))), body = new Path2D(); for (const p of parts) body.addPath(HD.pathOf(p));
    if (me) {
      ctx.fillStyle = PAT.ink; ctx.fill(body);
      ctx.save(); ctx.clip(body); const r = rng(720 + BF); ctx.strokeStyle = 'rgba(255,255,255,.09)';
      for (let i = 0; i < 14; i++) { const a0 = -40 + r() * 80, b0 = 150 - r() * 40, p0 = P(a0, b0), p1 = [p0[0] + (r() - .5) * 20 * s, F.gy - 70 * s - r() * 40 * s]; ctx.lineWidth = (2 + r() * 6) * s; ctx.beginPath(); ctx.moveTo(...p0); ctx.lineTo(...p1); ctx.stroke(); }
      ctx.restore();
    } else {
      ctx.strokeStyle = PAT.ink; ctx.lineWidth = 6.4 * s; for (const p of parts) ctx.stroke(HD.pathOf(p));
      ctx.fillStyle = PAT.paper; ctx.fill(body);
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = F.wash || 'rgba(112,110,116,.42)'; ctx.fill(body);
      ctx.clip(body); ctx.fillStyle = 'rgba(80,78,86,.2)'; const bk = P(-30, 60); ctx.beginPath(); ctx.ellipse(bk[0], bk[1] + 40 * s, 30 * s, 150 * s, F.ang, 0, TAU); ctx.fill();
      ctx.restore();
      // a cloak, not a sheet: the hood's rim at the neck, two folds in pencil
      ink(ctx, HD.spline([P(-24, 140), P(2, 130), P(28, 140)], 3), sd + 40, BF, { w: 3.2 * s, ts: 3, te: 6, wob: .5, boil: .6 });
      for (const [a0, b0, a1] of [[-10, 104, -16], [14, 96, 18]]) pencil(ctx, HD.spline([P(a0, b0), P(a0 * 1.1, 30), skx(a1, hemD * .82)], 4), sd + 41 + a0, BF, PAT.graphite, { w: 2.6 * s, boil: .6 });
    }
    // the eye: paper left white, an ink dot (looks ahead / strains / down / wide)
    const eye = F.eye || 'calm', E0 = Q(13, 9);
    if (eye === 'strain') { const pts = HD.spline([Q(4, 11), Q(13, 6), Q(22, 11)], 2); HD.ink(ctx, pts, { w: 4.2 * s, mn: .5, ts: 3, te: 3, col: me ? PAT.paper : PAT.ink }); }
    else { const rw = (eye === 'shock' ? 13.5 : 12) * s; ctx.fillStyle = PAT.paper; ctx.beginPath(); ctx.ellipse(E0[0], E0[1], rw, rw * 1.05, 0, 0, TAU); ctx.fill();
      if (!me) { ctx.strokeStyle = K.INK; ctx.lineWidth = 2 * s; ctx.stroke(); }
      const d = eye === 'down' ? Q(15, 5) : eye === 'shock' ? Q(14, 9) : eye === 'up' ? Q(15, 13) : Q(16, 9); ctx.fillStyle = K.INK; ctx.beginPath(); ctx.arc(d[0], d[1], (eye === 'shock' ? 4 : 5.8) * s, 0, TAU); ctx.fill();
      ctx.fillStyle = PAT.paper; ctx.beginPath(); ctx.arc(d[0] + 1.8 * s, d[1] - 2 * s, 1.7 * s, 0, TAU); ctx.fill(); }
    if (mid) mid();
    if (F.farFront) arm(shF, F.hands[0], F.hand?.[0] || 'fist', me);
    const rootN = T => T && f * (T[0] - F.hip[0]) < -6 * s ? P(-14, 134) : sh;   // an arm reaching back starts at the back of the shoulder
    arm(rootN(F.hands[1]), F.hands[1], F.hand?.[1] || 'fist', me);
    ctx.restore();
  };

  /* ---------------------------------------------------------------- poses (all return a spec; mix them with K.mix) */
  const frac = x => x - Math.floor(x);
  /* walk(x, gy, s, f, ph, stride, lean, lift = 22) — a walk cycle at phase ph (cycles; advance by distance / (stride·s)):
     feet plant for 58 % of the cycle, swing in an arc of height lift; hip bobs; hem sways. stride px (116 heavy … 270 run). */
  K.walk = function (x, gy, s, f, ph, stride, lean, lift = 22) {
    const feet = [0, 1].map(i => { const p = frac(ph + i * .5); let off, up = 0;
      if (p < .58) off = stride * (.29 - p); else { const u = (p - .58) / .42; off = -.29 * stride + .58 * stride * eio(u); up = lift * Math.sin(Math.PI * u); }
      return [x + f * off * s, gy - up * s]; });
    const hipH = (176 - 5 * Math.abs(Math.sin(TAU * ph))) * s;
    return { s, f, gy, hip: [x, gy - hipH], ang: f * lean, feet, hands: [null, null], hand: ['fist', 'fist'], tilt: 0, eye: 'calm', sway: -f * 7 * Math.sin(TAU * ph), ph };
  };
  /* stand(x, gy, s, f, lean = .05) — standing, feet apart, arms hanging */
  K.stand = function (x, gy, s, f, lean = .05) { return { s, f, gy, hip: [x, gy - 178 * s], ang: f * lean, feet: [[x - f * 18 * s, gy], [x + f * 22 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: 0, eye: 'calm', sway: 0 }; };
  /* crouch(x, gy, s, f, k = 1) — bent at the waist over the ground in front (laying something down, picking it up):
     k 0..1 how deep. Hands stay null — set them to the grip points. */
  K.crouch = function (x, gy, s, f, k = 1) { return { ...K.stand(x, gy, s, f), hip: [x + f * 18 * s * k, gy - lerp(178, 82, k) * s], ang: f * lerp(.05, 1.12, k), feet: [[x - f * 44 * s, gy], [x + f * 44 * s, gy]], tilt: .3 * k }; };
  /* kneel(x, gy, s, f, lean = .35) — on the far knee (shin flat behind), near foot planted in front, torso leaning to the
     ground in front (plant, tend, pray: lean .1 upright … .7 bowed). The ground point in front is K.reachGround(F). */
  K.kneel = function (x, gy, s, f, lean = .35) { return { s, f, gy, hip: [x, gy - (lean > .8 ? 84 : 104) * s], ang: f * lean, feet: [[x - f * 92 * s, gy], [x + f * 62 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: .2, eye: 'down', sway: 0 }; };
  /* reachGround(F, d = 120) → a ground point the near hand can really reach (≤ 146·s from the shoulder), as far as d·s in
     front of the hip — or null if the shoulder is too high: bow deeper (kneel lean ≥ 1.0) until it is not. */
  K.reachGround = function (F, d = 120) { const sh = K.shoulderOf(F), y = F.gy - 8 * F.s, dy = y - sh[1], R = 146 * F.s; if (dy > R) return null;
    const dx = Math.sqrt(R * R - dy * dy), x = F.f > 0 ? Math.min(sh[0] + dx, F.hip[0] + d * F.s) : Math.max(sh[0] - dx, F.hip[0] - d * F.s); return [x, y]; };
  /* lookUp(F, k) — head tilted back by k (0..1) with the eye up (look at a light, a sky); returns F */
  K.lookUp = function (F, k = 1) { F.tilt = (F.tilt || 0) - .45 * k; if (k > .3) F.eye = 'up'; return F; };
  /* hangHands(F, swing) → the two hanging hand points (arms down the sides, swing px fore/aft) */
  K.hangHands = function (F, swing = 0) { const fr = frame(F), sh = fr.P(4, 136); return [[sh[0] - F.f * (10 + swing) * F.s, sh[1] + 140 * F.s], [sh[0] - F.f * (10 - swing) * F.s, sh[1] + 140 * F.s]]; };
  /* mix(A, B, k) — an in-between of two specs (positions lerped, null hands → hanging; discrete fields from the nearer one).
     Use 3–5 drawings (k stepped on twos via K.t12) for every set-down / pick-up / stand-up. */
  K.mix = function (A, Bs, k) {
    if (k <= 0) return A; if (k >= 1) return Bs;
    const l2 = (a, b) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], hA = K.hangHands(A), hB = K.hangHands(Bs);
    const pick = k < .5 ? A : Bs;
    return { ...pick, s: lerp(A.s, Bs.s, k), gy: lerp(A.gy, Bs.gy, k), hip: l2(A.hip, Bs.hip), ang: lerp(A.ang, Bs.ang, k), feet: [l2(A.feet[0], Bs.feet[0]), l2(A.feet[1], Bs.feet[1])],
      hands: [0, 1].map(i => l2(A.hands[i] || hA[i], Bs.hands[i] || hB[i])), hand: pick.hand.slice(), tilt: lerp(A.tilt || 0, Bs.tilt || 0, k), sway: lerp(A.sway || 0, Bs.sway || 0, k) };
  };
  /* turn(A, B, k) — turn around (A and B face opposite ways): an in-between whose width squashes to 15 % at the flip
     (k = .5) and opens again — never a one-frame mirror. */
  K.turn = function (A, B, k) { const F = K.mix(A, B, k); if (k > 0 && k < 1) F.sx = Math.max(.15, Math.abs(Math.cos(Math.PI * k))); return F; };

  /* ---------------------------------------------------------------- long objects (a beam, a pole, a cross, an oar)
     A beam pose X = { x, y, a }: the beam's start (u = 0) at (x, y), along angle a; K.beamPt(X, u, v) is the point u px
     along it and v px across (− = its top side). Put the hands ON it with beamPt — never near it. */
  K.beamPt = (X, u, v = 0) => [X.x + Math.cos(X.a) * u - Math.sin(X.a) * v, X.y + Math.sin(X.a) * u + Math.cos(X.a) * v];
  /* onShoulder(F, thick, a0, contact) — the beam resting on the near shoulder at u = contact, tilted a0 (−1 ≈ steep, back
     end low; mirrored for f = −1). Grip: one fist on the beam above the head (contact + 105), the other low behind the back
     (contact − 150) — K.gripBeam(F, X, contact + 105, contact − 150). Draw the beam in back() unless it is in front. */
  K.onShoulder = function (F, thick, a0, contact) { const fr = frame(F), sh = K.shoulderOf(F), T = [sh[0] + fr.up[0] * 11 * F.s, sh[1] + fr.up[1] * 11 * F.s];
    const a = F.f > 0 ? a0 : Math.PI - a0, d = [Math.cos(a), Math.sin(a)]; let n = [d[1], -d[0]]; if (n[1] > 0) n = [-n[0], -n[1]];
    return { x: T[0] + n[0] * thick / 2 - d[0] * contact, y: T[1] + n[1] * thick / 2 - d[1] * contact, a, contact }; };
  /* inFront(F, len, at = .5, drop = 70) — carried level in both hands in front of the chest (drawn in mid() with
     farFront: true): u = len·at sits under the chest, drop px below the shoulder. Grip: gripBeam(F, X, len·at ∓ 40·s). */
  K.inFront = function (F, len, at = .5, drop = 70) { const sh = K.shoulderOf(F), c = [sh[0] + F.f * 46 * F.s, sh[1] + drop * F.s], a = F.f > 0 ? 0 : Math.PI;
    return { x: c[0] - Math.cos(a) * len * at, y: c[1], a }; };
  /* upright(F, len, foot = 0) — stood on its end beside the near foot (a staff, a sign): hand at 55 % of the way up.
     Grip: gripBeam(F, X, null, len·.55) (near hand). */
  K.upright = function (F, len, foot = 0) { const x = F.hip[0] + F.f * 62 * F.s; return { x, y: F.gy - foot, a: -Math.PI / 2 }; };
  /* gripBeam(F, X, uFar, uNear, v = 0) — put the far / near hand on the beam at u (null = that hand hangs); returns F */
  K.gripBeam = function (F, X, uFar, uNear, v = 0) { F.hands = [uFar != null ? K.beamPt(X, uFar, v) : null, uNear != null ? K.beamPt(X, uNear, v) : null]; F.hand = ['fist', 'fist']; return F; };
  K.mixBeam = (A, B, k) => k <= 0 ? A : k >= 1 ? B : { ...B, x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), a: lerp(A.a, B.a, k) };
  K.rotAbout = function (X, pv, th) { const ox = X.x - pv[0], oy = X.y - pv[1]; return { ...X, x: pv[0] + ox * Math.cos(th) - oy * Math.sin(th), y: pv[1] + ox * Math.sin(th) + oy * Math.cos(th), a: X.a + th }; };

  /* ================================================================ world pieces (draw into built layers)
     A ROAD R = { segs: [[x0, x1], …] (where the road is — a gap is the space between segs), top (far edge y), near
     (near edge y), rows [y…] (slab rows, foreshortened, from top to near), sw (slab width px), ob (joint obliquity),
     x0, x1 (the layer's extent) } — grey-washed slabs in a checker (the lab's floor), orange pencil grid, graphite hatch,
     ink edges with grass tufts. */
  K.road = function (R) { const xj = (i, y) => i * R.sw - (y - R.top) * R.ob;
    return { xj, inRoad: (x0, x1) => R.segs.some(([a, b]) => x0 >= a + 4 && x1 <= b - 4) }; };
  K.roadWashes = function (g, R) {
    const GREY = K.GREY, W0 = K.W0, RT = R.top, RN = R.near, ROWY = R.rows, SW = R.sw, { xj, inRoad } = K.road(R);
    // road band: a pale grey glaze; a darker glaze along the far edge
    for (const [a, b] of R.segs) { wash(g, [[a, RT + 2], [b, RT + 2], [b, RN], [a, RN]], GREY, .1, { seed: 401 + (a | 0), wob: 3 }); wash(g, [[a, RT], [b, RT], [b, RT + 26], [a, RT + 22]], W0, .14, { seed: 402 + (a | 0), wob: 3, streak: 20, horiz: 1 }); }
    // slabs: grey checker
    for (let k = 0; k < ROWY.length - 1; k++) { const y0 = ROWY[k], y1 = ROWY[k + 1];
      for (let i = Math.floor(R.x0 / SW) - 3; i * SW < R.x1 + 400; i++) { if ((i + k) % 2) continue;
        const q = [[xj(i, y0), y0], [xj(i + 1, y0), y0], [xj(i + 1, y1), y1], [xj(i, y1), y1]];
        if (!inRoad(Math.min(q[0][0], q[3][0]) - 6, Math.max(q[1][0], q[2][0]) + 6)) continue;
        if (HD.hash(i, k + 40) < .12) continue;
        wash(g, q, W0, .13 + .12 * HD.hash(i * 7, k), { seed: 500 + k * 300 + i, wob: 2.4, fr: 1.4, gran: .5, edge: 1.4 }); } }
    // the verge below the road: a fading grey band
    for (const [a, b] of R.segs) wash(g, [[a, RN], [b, RN], [b, RN + 40], [a, RN + 70]], GREY, .09, { seed: 410 + (a | 0), wob: 10, wl: 50 });
  };
  K.roadLines = function (g, f, R) {
    const OR = PAT.orange, GR = PAT.graphite, RT = R.top, RN = R.near, ROWY = R.rows, SW = R.sw, PX0 = R.x0, PX1 = R.x1, { xj, inRoad } = K.road(R);
    for (const [a, b] of R.segs) { const a1 = Math.max(a, PX0 + 20), b1 = Math.min(b, PX1 - 20), ov = 14;
      for (const y of ROWY) pencil(g, HD.seg([a1 + (a1 > PX0 + 30 ? -ov : 0), y + 2], [b1 + (b1 < PX1 - 30 ? ov : 0), y - 2], 8), 10 + y + (a | 0), f, OR, { w: 2.4 });
      pencil(g, HD.seg([a1, RN + 74], [b1, RN + 70], 8), 30 + (a | 0), f, OR, { w: 2.2 }); }
    for (let i = Math.floor(PX0 / SW) - 3; i * SW < PX1 + 400; i++) { const x0 = xj(i, RT), x1 = xj(i, RN + 30);
      if (!inRoad(Math.min(x0, x1), Math.max(x0, x1))) continue; const ext = 10 + 40 * HD.hash(i, 3);
      pencil(g, HD.seg([x0, RT - 4], [xj(i, RN + ext), RN + ext], 6), 80 + i, f, OR, { w: 2.2 }); }
    // graphite hatch in some dark slabs, ink on some joints and rows
    const r = rng(91);
    for (let k = 0; k < ROWY.length - 1; k++) for (let i = Math.floor(PX0 / SW) - 3; i * SW < PX1 + 400; i++) {
      const y0 = ROWY[k], y1 = ROWY[k + 1], xa = Math.min(xj(i, y1), xj(i, y0)), xb = Math.max(xj(i + 1, y0), xj(i + 1, y1));
      if (!inRoad(xa - 6, xb + 6)) continue;
      if ((i + k) % 2 === 0 && r() > .45) { const n = 3 + Math.floor((y1 - y0) / 10); for (let jj = 0; jj < n; jj++) { const u = (jj + .5) / n, y = lerp(y0 + 4, y1 - 4, u);
        pencil(g, HD.seg([xj(i, y) + 8, y + 5], [xj(i + 1, y) - 8, y - 5], 5), 1000 + k * 100 + i * 7 + jj, f, GR, { w: 2.2, ts: 6, te: 8 }); } }
      if (r() > .7) ink(g, HD.seg([xj(i, y1), y1], [xj(i + 1, y1), y1], 6), 1500 + k * 97 + i, f, { w: 3.4 });
      if (r() > .8) ink(g, HD.seg([xj(i, y0), y0], [xj(i, y1), y1], 6), 1700 + k * 97 + i, f, { w: 3 });
    }
    // road edges in ink (broken where the hand lifted), grass tufts along the far edge, stones
    for (const [a, b] of R.segs) { const a1 = Math.max(a, PX0 + 10), b1 = Math.min(b, PX1 - 10);
      for (let x = a1; x < b1; x += 300) { const xe = Math.min(b1, x + 300 - 14 * HD.hash(x | 0, 1)); ink(g, HD.seg([x, RT + 1], [xe, RT - 1], 6), 2000 + (x | 0), f, { w: 6 }); ink(g, HD.seg([x + 10, RN], [xe - 8, RN + 2], 6), 2100 + (x | 0), f, { w: 5 }); }
      for (let x = a1 + 10; x < b1 - 10; x += 14 + 30 * HD.hash(x | 0, 5)) { if (HD.hash(x | 0, 6) < .45) continue; const h = 8 + 16 * HD.hash(x | 0, 7);
        ink(g, HD.seg([x, RT + 2], [x + (HD.hash(x | 0, 8) - .5) * 10, RT - h], 3), 2200 + (x | 0), f, { w: 2.6, ts: 2, te: 8, mn: .2, wob: .5 }); }
      for (let x = a1 + 30; x < b1 - 30; x += 18 + 40 * HD.hash(x | 0, 9)) { if (HD.hash(x | 0, 10) < .5) continue; const h = 10 + 14 * HD.hash(x | 0, 11);
        pencil(g, HD.seg([x, RN + 4], [x + (HD.hash(x | 0, 12) - .5) * 12, RN + 4 - h], 3), 2300 + (x | 0), f, GR, { w: 2.2, ts: 2, te: 6 }); } }
  };
  /* field(g, f, x0, x1, top, bottom, seed) — bare ground (a garden, a field, a verge): two grey glazes with a dark band
     at the top, graphite furrows, ink tufts. Washes when f < 0 (call once into the base), lines for f = 0..2. */
  K.field = function (g, f, x0, x1, top, bottom, seed = 1300) {
    if (f < 0) { wash(g, [[x0, top], [x1, top], [x1, bottom], [x0, bottom]], K.GREY, .1, { seed, wob: 6 });
      wash(g, [[x0, top], [x1, top], [x1, top + 30], [x0, top + 24]], K.W0, .16, { seed: seed + 1, wob: 4, streak: 16, horiz: 1 });
      for (let x = x0 + 60; x < x1; x += 260 + 200 * HD.hash(x | 0, seed)) wash(g, [[x, top + 60], [x + 140, top + 50], [x + 180, top + 110], [x + 20, top + 120]], K.W0, .08, { seed: seed + (x | 0), round: 1, wob: 10 });
      return; }
    const r = rng(seed + 7);
    ink(g, HD.seg([x0, top + 1], [x1, top - 1], 6), seed + 10, f, { w: 5.5 });
    for (let k = 0; k < 6; k++) { const y = top + 26 + k * k * 9 + k * 14; pencil(g, HD.seg([x0, y], [x1, y + (r() - .5) * 8], 8), seed + 20 + k, f, PAT.graphite, { w: 2.2 }); }
    for (let x = x0 + 10; x < x1 - 10; x += 16 + 34 * HD.hash(x | 0, seed + 1)) { if (HD.hash(x | 0, seed + 2) < .5) continue; const h = 10 + 18 * HD.hash(x | 0, seed + 3);
      ink(g, HD.seg([x, top + 2], [x + (HD.hash(x | 0, seed + 4) - .5) * 12, top - h], 3), seed + 100 + (x | 0), f, { w: 2.6, ts: 2, te: 8, mn: .2, wob: .5 }); }
  };
  /* poplar: a narrow tree standing at ground y. T = { x, h, w, s (index → seeds) }. poplarWash once, poplarLines per drawing
     (ink outline, trunk, graphite hatch, an orange construction line up into the bare paper). */
  K.poplarWash = function (g, T, y) { const x = T.x, h = T.h, w = T.w;
    const shape = [[x, y - 40], [x - w * .5, y - h * .35], [x - w * .42, y - h * .7], [x - 6, y - h], [x + w * .38, y - h * .72], [x + w * .5, y - h * .36]];
    wash(g, shape, K.GREY, .26, { seed: 600 + T.s * 10, round: 1, wob: 8, wl: 40, streak: 10, edge: 1.5, gran: .6 });
    wash(g, shape.map(([p, q]) => [p + (p > x ? 0 : w * .25), q]), K.W0, .16, { seed: 601 + T.s * 10, round: 1, wob: 6, wl: 40 }); };
  K.poplarLines = function (g, T, y, f, base = y + 4) { const x = T.x, h = T.h, w = T.w, sd = 3000 + T.s * 40, GR = PAT.graphite;
    const shape = [[x - 4, y - 40], [x - w * .5, y - h * .35], [x - w * .42, y - h * .7], [x - 6, y - h], [x + w * .38, y - h * .72], [x + w * .5, y - h * .36], [x + 6, y - 40]];
    ink(g, HD.spline(shape, 5), sd, f, { w: 4.2 });
    ink(g, HD.seg([x, y], [x + 2, y - h * .55], 6), sd + 1, f, { w: 4.8 }); ink(g, HD.seg([x + 6, y], [x + 7, y - 60], 6), sd + 2, f, { w: 2.6 });
    for (let k = 0; k < 7; k++) { const yy = y - h * (.22 + k * .1), ww = w * .4 * Math.sin(Math.PI * (.22 + k * .1)) + 6; pencil(g, HD.seg([x - ww * .2, yy + 8], [x + ww, yy - 8], 4), sd + 10 + k, f, GR, { w: 2.2 }); }
    for (let k = 0; k < 4; k++) ink(g, HD.spline([[x - w * .3 + k * 8, y - h * (.3 + k * .12)], [x - w * .1 + k * 6, y - h * (.36 + k * .12)], [x + k * 5, y - h * (.34 + k * .12)]], 4), sd + 20 + k, f, { w: 2.4, ts: 3, te: 6 });
    pencil(g, HD.seg([x + 3, base + 20], [x - 4, y - h - 220 - 120 * HD.hash(T.s, 2)], 8), sd + 30, f, PAT.orange, { w: 2.4 }); };
  /* fence posts (warm-grey wood) at xs on ground y `base`, a sagging rope between neighbours < 700 px apart unless
     skip(x, nextX) (e.g. across a gap) */
  K.postWash = function (g, x, base) { wash(g, [[x - 7, base + 6], [x - 7, base - 74], [x + 7, base - 78], [x + 7, base + 6]], K.WARMG, .4, { seed: 700 + x | 0, wob: 1, fr: .8 }); };
  K.fenceLines = function (g, posts, base, f, skip = () => false) {
    posts.forEach((x, i) => { ink(g, HD.seg([x - 7, base + 6], [x - 8, base - 74], 5), 3500 + i, f, { w: 4.2 }); ink(g, HD.seg([x + 7, base + 6], [x + 6, base - 78], 5), 3520 + i, f, { w: 4 });
      ink(g, HD.seg([x - 9, base - 75], [x + 9, base - 79], 4), 3540 + i, f, { w: 3.6 });
      const nx = posts[i + 1]; if (nx != null && nx - x < 700 && !skip(x, nx)) { const p0 = [x + 7, base - 60], p1 = [nx - 7, base - 60], m = [(x + nx) / 2, base - 32];
        pencil(g, HD.spline([p0, m, p1], 8), 3560 + i, f, PAT.graphite, { w: 2.4 }); } }); };
  /* a GAP (chasm, pit, edge) in the ground: Gp = { e (left lip x), w (width), top (ground y), bottom (layer bottom y),
     seed }. gapWash once (dark streaky wash going down, darker with depth, tongues of paint; fills Gp.lw / Gp.rw = its
     walls), gapLines per drawing (ragged ink walls, graphite strata, orange construction lines measuring it). */
  K.gapWash = function (g, Gp) {
    const E = Gp.e, G = Gp.w, RT = Gp.top, PY1 = Gp.bottom, W0 = K.W0;
    const r = rng(Gp.seed ?? 81), lw = [], rw = [];
    for (let y = RT - 4; y <= PY1; y += 16) { const d = y - RT; lw.push([E + (d < 20 ? 0 : 4 + r() * 12 + d * .035), y]); rw.push([E + G - (d < 20 ? 0 : 4 + r() * 12 + d * .035), y]); }
    Gp.lw = lw; Gp.rw = rw;
    const poly = [...lw, ...rw.slice().reverse()];
    wash(g, poly, W0, .55, { seed: 801, wob: 2, fr: 1, streak: 40, gran: .5, edge: 1.2 });
    g.save(); g.clip(HD.pathOf(poly)); g.globalCompositeOperation = 'multiply';   // depth: a smooth darkening (no steps)
    const lg = g.createLinearGradient(0, RT + 30, 0, RT + 1050); lg.addColorStop(0, '#ffffff'); lg.addColorStop(.45, '#8a888c'); lg.addColorStop(1, '#2a282c');
    g.fillStyle = lg; g.fillRect(E - 60, RT - 10, G + 120, PY1 - RT + 20); g.restore();
    for (let i = 0; i < 9; i++) { const x = E + 30 + (G - 60) * HD.hash(i, 805), y0 = RT + 60 + 380 * HD.hash(i, 806), w = 26 + 40 * HD.hash(i, 807);   // long dark tongues of paint
      wash(g, [[x - w / 2, PY1], [x - w / 2, y0 + 60], [x, y0], [x + w / 2, y0 + 60], [x + w / 2, PY1]], [30, 28, 32], .22, { seed: 810 + i, round: 1, wob: 6, wl: 50, streak: 3 }); }
    K.bloomEdge(g, E + G * .5, RT + 160, 150, [20, 20, 22], .3, 81, Math.PI * .1, Math.PI * .9, .5);
  };
  K.gapLines = function (g, f, Gp) {
    const E = Gp.e, G = Gp.w, RT = Gp.top, GR = PAT.graphite;
    const sideInk = (pts, sd) => { for (let i = 0; i < 6; i++) { const a = i * 7, b = Math.min(pts.length - 1, a + 9); if (a >= pts.length - 1) break;
      ink(g, pts.slice(a, b + 1), sd + i, f, { w: 6 - i * .7, wob: 1.6 }); } };
    sideInk(Gp.lw, 4000); sideInk(Gp.rw, 4100);
    for (let k = 0; k < 18; k++) { const y = RT + 40 + k * 34 + 10 * HD.hash(k, 1), L0 = Gp.lw[clamp(Math.round((y - RT + 4) / 16), 0, Gp.lw.length - 1)][0], R0 = Gp.rw[clamp(Math.round((y - RT + 4) / 16), 0, Gp.rw.length - 1)][0];
      pencil(g, HD.seg([L0 + 4, y], [L0 + 30 + 30 * HD.hash(k, 2), y + 6], 4), 4200 + k, f, GR, { w: 2.6 });
      pencil(g, HD.seg([R0 - 4, y + 14], [R0 - 30 - 30 * HD.hash(k, 3), y + 20], 4), 4230 + k, f, GR, { w: 2.6 });
      if (k % 3 === 0) { ink(g, HD.seg([L0, y], [L0 + 18, y + 3], 3), 4260 + k, f, { w: 3 }); ink(g, HD.seg([R0, y + 14], [R0 - 18, y + 17], 3), 4280 + k, f, { w: 3 }); } }
    pencil(g, HD.seg([E + 2, RT - 140], [E - 2, RT + 340], 8), 4300, f, PAT.orange, { w: 2.4 }); pencil(g, HD.seg([E + G - 2, RT - 150], [E + G + 2, RT + 330], 8), 4301, f, PAT.orange, { w: 2.4 });
  };
  /* an ARCH (a gate, a door to the light) in a ragged stone-wall fragment: A = { x (centre), base (ground y), cy (centre of
     the arch's curve), ra (opening radius ≈ 98), ro (outer radius ≈ 134) }. archWall(A) / archOpening(A, grow) → points;
     archWash once (wall, dim opening), archLines per drawing (double ink line, voussoirs, keystone, pencil stones). */
  K.archWall = function (A) { const GX = A.x, gy = A.base, GAY = A.cy;
    return [[GX - 300, gy], [GX - 296, gy - 150], [GX - 270, gy - 210], [GX - 230, gy - 236], [GX - 190, gy - 300], [GX - 150, GAY - 120], [GX - 70, GAY - 160], [GX, GAY - 168], [GX + 80, GAY - 156], [GX + 150, GAY - 112], [GX + 196, gy - 290], [GX + 240, gy - 230], [GX + 282, gy - 196], [GX + 300, gy - 120], [GX + 304, gy]]; };
  K.archOpening = function (A, grow = 0) { const GX = A.x, gy = A.base, o = [[GX - A.ra - grow, gy]]; for (let i = 0; i <= 24; i++) { const a = Math.PI + Math.PI * i / 24; o.push([GX + Math.cos(a) * (A.ra + grow), A.cy + Math.sin(a) * (A.ra + grow)]); } o.push([GX + A.ra + grow, gy]); return o; };
  K.archWash = function (g, A) { const GX = A.x;
    wash(g, K.archWall(A), K.WARMG, .3, { seed: 820, wob: 4, streak: 14, gran: .6, edge: 1.4 });
    wash(g, K.archWall(A).map(([x, y]) => [x + (x < GX ? 0 : 0), y]).filter((p, i) => i < 7).concat([[GX - 150, A.base]]), K.W0, .12, { seed: 821, wob: 4 });
    g.save(); g.fillStyle = '#fff'; g.fill(HD.pathOf(K.archOpening(A))); g.restore();
    wash(g, K.archOpening(A), [110, 108, 112], .34, { seed: 822, wob: 1.5, fr: 1, streak: 8 }); };
  K.archLines = function (g, f, A) {
    const GX = A.x, gy = A.base, GAY = A.cy, RA = A.ra, RO = A.ro, GR = PAT.graphite, OR = PAT.orange;
    ink(g, HD.spline(K.archWall(A).slice(0, -1), 6), 4400, f, { w: 4.5, wob: 2 });
    ink(g, HD.seg([GX - 330, gy + 2], [GX + 340, gy - 2], 6), 4401, f, { w: 5.5 });
    ink(g, HD.arc(GX, GAY, RO, RO, Math.PI, TAU, 5), 4402, f, { w: 6 }); ink(g, HD.arc(GX, GAY, RA, RA, Math.PI * 1.01, Math.PI * 1.99, 5), 4403, f, { w: 5 });
    for (const sg of [-1, 1]) { ink(g, HD.seg([GX + sg * RA, GAY], [GX + sg * RA, gy], 6), 4404 + sg, f, { w: 5 }); ink(g, HD.seg([GX + sg * RO, GAY], [GX + sg * (RO + 2), gy], 6), 4406 + sg, f, { w: 5.5 }); }
    for (let i = 1; i < 9; i++) { const a = Math.PI + Math.PI * i / 9; ink(g, HD.seg([GX + Math.cos(a) * RA, GAY + Math.sin(a) * RA], [GX + Math.cos(a) * RO, GAY + Math.sin(a) * RO], 4), 4410 + i, f, { w: 3.6 }); }
    ink(g, HD.poly([[GX - 14, GAY - RO - 12], [GX + 14, GAY - RO - 12], [GX + 10, GAY - RA + 2], [GX - 10, GAY - RA + 2]], true), 4420, f, { w: 3.8 });
    for (let k = 0; k < 8; k++) { const y = gy - 26 - k * 30; for (let x = GX - 290 + (k % 2) * 30; x < GX + 290; x += 60 + 20 * HD.hash(k, x | 0)) {
      if (Math.abs(x - GX) < RO + 20 || Math.abs(x + 25 - GX) < RO + 20) continue; if (y < GAY - 150 + Math.abs(x - GX) * .3) continue;
      pencil(g, HD.poly([[x, y], [x + 46, y - 1], [x + 47, y - 26], [x + 1, y - 25]], true, 4), 4500 + k * 30 + (x | 0), f, k % 3 ? GR : OR, { w: 2, ts: 4, te: 4 }); } }
    for (const sg of [-1, 1]) for (let k = 0; k < 5; k++) { const y = gy - 30 - k * 52; ink(g, HD.seg([GX + sg * RO, y], [GX + sg * (RO + 34), y - 2], 3), 4600 + k + sg * 10, f, { w: 3 }); }
    pencil(g, HD.seg([GX - 2, GAY - RO - 30], [GX + 4, GAY - RO - 300], 8), 4700, f, OR, { w: 2.4 });
  };
  /* farLand(g, x0, x1, o) — the far layer (parallax .5): long streaky sky washes that bloom up into bare paper, two
     low hill ranges with graphite ticks, faint far poplars. o (defaults = the worked example): sky 900 (y of the washes),
     hills [[col, base y, amp, alpha, seed], …], bottom 1290, trees 1080 (their ground y), seed 301. */
  K.farLand = function (g, x0, x1, o = {}) {
    const GREY = [96, 96, 102], W0 = [72, 72, 78], r = rng(o.seed ?? 301), FX0 = x0, FX1 = x1, FY1 = o.bottom ?? 1290, SKY = o.sky ?? 900, TY = o.trees ?? 1080;
    for (let x = FX0 - 300; x < FX1 + 100; x += 480 + r() * 300) {   // sky: long flat streaky washes low over the hills
      const y = SKY + r() * 70, w = 700 + r() * 400, h = 12 + r() * 14;
      wash(g, [[x, y], [x + w * .3, y - h], [x + w * .7, y - h * .7], [x + w, y], [x + w * .6, y + h * .6], [x + w * .2, y + h * .5]], GREY, .07 + r() * .06, { seed: 310 + x | 0, round: 1, wob: 7, wl: 90, streak: 4, horiz: 1, edge: 1.4 });
    }
    for (const [col, base, amp, a, sd] of (o.hills || [[GREY, 1050, 120, .16, 1], [W0, 1110, 80, .14, 2]])) {   // two hill ranges
      const top = []; for (let x = FX0; x <= FX1; x += 40) top.push([x, base - amp * fbm(x / 520 + sd * 7, sd, 3) * 1.3 + amp * .3]);
      for (let i = 0; i + 8 < top.length; i += 7) { const seg = top.slice(i, i + 9); wash(g, [...seg, [seg[seg.length - 1][0], FY1], [seg[0][0], FY1]], col, a + .04 * HD.hash(i, sd), { seed: 330 + i + sd * 50, wob: 6, wl: 60, edge: 1.5, gran: .6 }); }
      for (let i = 0; i < top.length; i += 3) { const p = top[i]; if (HD.hash(i, sd + 9) < .5) continue; const pts = HD.seg([p[0] - 12, p[1] + 22], [p[0] + 14, p[1] + 46], 4); HD.ink(g, HD.wob(pts, i, 1, 40), { w: 2, ts: 6, te: 8, mn: .3, press: .4, seed: i, col: PAT.graphite }); }
    }
    for (let x = FX0 + 90; x < FX1; x += 260 + r() * 300) { const y = TY - 40 * fbm(x / 520 + 7, 1, 3), h = 70 + r() * 60;   // far poplars: narrow grey washes
      wash(g, [[x, y + 6], [x - 12, y - h * .4], [x, y - h], [x + 12, y - h * .4]], W0, .22, { seed: 360 + x | 0, round: 1, wob: 2, fr: 1, edge: 1.4 }); }
  };
  /* foreground(g, x0, x1, o) — weeds and wildflowers (parallax 1.25) so the lower part of the page is drawn, not empty:
     soft grey mounds, ink grass blades, paper-headed flowers ringed in ink, orange construction lines. o: y (top of the
     mounds, 1560), seed 1201. */
  K.foreground = function (g, x0, x1, o = {}) {
    const GREY = K.GREY, r = rng(o.seed ?? 1201), GX0 = x0, GX1 = x1, Y = o.y ?? 1560, INK = K.INK;
    for (let x = GX0 - 100; x < GX1 + 100; x += 160 + r() * 140) {   // soft grey mounds of grass, two glazes
      const y = Y + r() * 50, w = 220 + r() * 200, h = 70 + r() * 50;
      wash(g, [[x, y + h * 1.6], [x, y + h * .4], [x + w * .2, y], [x + w * .55, y - h * .2], [x + w * .85, y + h * .1], [x + w, y + h * .5], [x + w * .8, y + h * 1.9], [x + w * .3, y + h * 2.1]], GREY, .1 + .06 * r(), { seed: 1210 + x | 0, round: 1, wob: 12, wl: 50, edge: 1.8, gran: .6 }); }
    for (let x = GX0; x < GX1; x += 18 + 40 * r()) { if (r() < .25) continue;   // ink weeds and grass blades
      const yb = Y + 90 + r() * 120, n = 3 + Math.floor(r() * 5);
      for (let j = 0; j < n; j++) { const a = -Math.PI / 2 + (r() - .5) * 1.1, h = 60 + r() * 120, bend = (r() - .5) * .8;
        const p1 = [x + Math.cos(a) * h * .5, yb + Math.sin(a) * h * .5], p2 = [x + Math.cos(a + bend) * h, yb + Math.sin(a + bend) * h];
        HD.ink(g, HD.wob(HD.spline([[x + (r() - .5) * 8, yb], p1, p2], 4), j + (x | 0), 2, 40), { w: 3 + r() * 2.5, ts: 4, te: h * .6, mn: .15, press: .4, seed: j + (x | 0), col: r() > .3 ? INK : PAT.graphite }); } }
    for (let x = GX0 + 40; x < GX1; x += 70 + 120 * r()) {   // wildflowers: an ink stalk, a paper head ringed in ink
      const y = Y + 30 + r() * 110, rr = 7 + r() * 6;
      HD.ink(g, HD.wob(HD.seg([x, y + rr], [x + (r() - .5) * 20, y + 110 + r() * 60], 5), x | 0, 2, 40), { w: 2.6, ts: 4, te: 10, mn: .3, seed: x | 0, col: INK });
      g.save(); g.strokeStyle = INK; g.lineWidth = 2.6; g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(x, y, rr * .35, 0, TAU); g.fill(); g.restore(); }
    for (let x = GX0 + 200; x < GX1; x += 500 + 300 * r()) pencil(g, HD.seg([x, Y], [x + 6, Y + 540], 8), 1230 + (x | 0), 0, PAT.orange, { w: 2.4 });
    pencil(g, HD.seg([GX0, Y + 80], [GX1, Y + 70], 8), 1240, 0, PAT.orange, { w: 2.2 });
  };

  /* ================================================================ light: the warm bloom (the lab's lamp)
     bloomSheet(c, o) → a white-based layer of warm washes blooming round c (built once); drawBloom shows it inside a
     ragged, growing blob of radius R (reveal it live: R = 600·eo((t − t0)/1.3)). o: box [x0, y0, w, h] (default c ± 600),
     radii [[r, alpha, seed], …], col (K.WARM), opening (pts: a lit doorway: warm wash + a white heart at heart.c, r,
     clipped to it, filling heart.rect), spill (pts: light spilt on the ground). */
  K.bloomSheet = function (c, o = {}) {
    const [x0, y0, w, h] = o.box || [c[0] - 600, c[1] - 600, 1200, 1200], Lc = K.whiteLayer(w, h, x0, y0);
    K.scratch(w, h, x0, y0); const WARM = o.col || K.WARM, C0 = c;
    for (const [rr, a, s] of (o.radii || [[520, .18, 1], [360, .16, 2], [220, .16, 3], [120, .2, 4]])) { const pts = []; for (let i = 0; i < 40; i++) { const an = i / 40 * TAU, q = rr * (.85 + .3 * fbm(an + s * 3, s, 3)); pts.push([C0[0] + Math.cos(an) * q, C0[1] + Math.sin(an) * q * .9]); }
      wash(Lc.g, pts, WARM, a, { seed: 900 + s, round: 1, wob: 10, edge: 1.2, gran: .35, pool: .4 }); }
    if (o.opening) { wash(Lc.g, o.opening, [250, 204, 120], .3, { seed: 910, edge: 1.6, wob: 1 });
      if (o.heart) { const gg = Lc.g, hc = o.heart.c, rg = gg.createRadialGradient(hc[0], hc[1], 10, hc[0], hc[1], o.heart.r); rg.addColorStop(0, 'rgba(255,255,255,.75)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
        gg.save(); gg.clip(HD.pathOf(o.opening)); gg.fillStyle = rg; gg.fillRect(...o.heart.rect); gg.restore(); } }   // the light's white heart
    if (o.spill) wash(Lc.g, o.spill, WARM, .26, { seed: 911, round: 1, wob: 14 });
    return Lc;
  };
  K.bloomPath = function (c, R, t) { const C0 = c, pts = []; for (let i = 0; i < 120; i++) { const a = i / 120 * TAU, n = fbm(Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + 2, 3), rr = R * (.82 + .36 * n) * (1 + .03 * Math.sin(a * 9 + HD.t12(t) * .6)); pts.push([C0[0] + Math.cos(a) * rr, C0[1] + Math.sin(a) * rr * (a > 0 && a < Math.PI ? 1.1 : .9)]); } return HD.pathOf(pts); };
  /* drawBloom(ctx, sheet, c, R, t, under) — the bloom revealed within radius R (inside the plate's layer); under = pts
     filled with paper first (a doorway that the light replaces); a warm wet rim at the edge */
  K.drawBloom = function (ctx, sheet, c, R, t, under) {
    if (R <= 0) return; const pth = K.bloomPath(c, R, t);
    ctx.save(); ctx.clip(pth); ctx.fillStyle = PAT.paper; if (under) ctx.fill(HD.pathOf(under)); K.mulSheet(ctx, sheet); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = 'rgba(214,150,84,.3)'; ctx.lineWidth = 2.6; ctx.stroke(pth);
    ctx.clip(pth); ctx.strokeStyle = 'rgba(232,180,110,.14)'; ctx.lineWidth = 14; ctx.stroke(pth); ctx.restore();
  };
  /* halo(ctx, cx, cy, hl, pulse = 1, R = 150) — a warm halo washed round a found / precious thing (hl 0..1) */
  K.halo = function (ctx, cx, cy, hl, pulse = 1, R = 150) {
    if (hl <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, R);
    g.addColorStop(0, `rgba(240,172,84,${.55 * hl * pulse})`); g.addColorStop(.6, `rgba(244,190,110,${.25 * hl * pulse})`); g.addColorStop(1, 'rgba(250,220,170,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R); ctx.restore();
  };
  /* ghostOutline(ctx, pts, t, al, glow, clip, seed = 77) — the sketchbook's "what should be there": a construction outline in
     white gel pen + orange pencil, dashed and crawling, a pale fill; clip = [x, y, w, h] reveals it (draw it on). */
  K.ghostOutline = function (ctx, pts, t, al, glow = 0, clip = null, seed = 77) {
    if (al <= 0) return;
    const pth = HD.pathOf(HD.boil(HD.poly(pts, true, 6), seed, K.BF, .8, 30));
    ctx.save(); ctx.globalAlpha = al; if (clip) { ctx.beginPath(); ctx.rect(...clip); ctx.clip(); }
    ctx.fillStyle = `rgba(252,238,212,${.3 + .16 * glow})`; ctx.fill(pth);
    ctx.setLineDash([16, 10]); ctx.lineDashOffset = -t * 16; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(253,246,232,.97)'; ctx.lineWidth = 7 + 3 * glow; ctx.stroke(pth);
    ctx.strokeStyle = 'rgba(214,104,44,.95)'; ctx.lineWidth = 3; ctx.stroke(pth); ctx.setLineDash([]);
    ctx.restore();
  };
  /* spatter(x, y, seed, o) → drops flung off an impact at (x, y) (the "hit": ink and amber paint that stays where it
     lands). o: n 46, w 26 (spread of the source px), land [−20, 90] (landing band below y), col2 accent colour.
     drawSpatter(ctx, drops, t, t0) draws them from t0 (live, under the camera). */
  K.spatter = function (x, y, seed = 200, o = {}) { const r = rng(seed), out = [], n = o.n ?? 46, sw = o.w ?? 26, [l0, l1] = o.land || [-20, 90];
    for (let k = 0; k < n; k++) { const a = -Math.PI * (.08 + .84 * r()), v = 120 + Math.pow(r(), .7) * 520;
      out.push({ x: x + r() * sw, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .8, sz: 1.6 + Math.pow(r(), 2) * 7, col: k % 3 ? K.INK : (o.col2 || 'rgba(214,128,50,.9)'), land: y + l0 + r() * l1 }); }
    return out; };
  K.drawSpatter = function (ctx, drops, t, t0) {
    if (t < t0) return; ctx.save(); ctx.globalCompositeOperation = 'multiply';
    for (const q of drops) { const u = Math.min(t - t0, .5), k = ss(0, .06, t - t0);
      const tl = Math.max(.05, (-q.vy + Math.sqrt(Math.max(0, q.vy * q.vy + 4 * 900 * (q.land - q.y)))) / 1800), uu = Math.min(u, tl);
      const x = q.x + q.vx * uu, y = q.y + q.vy * uu + 900 * uu * uu, landed = u >= tl;
      ctx.fillStyle = q.col; ctx.beginPath(); ctx.ellipse(x, y, q.sz * (landed ? 1.25 : .8) * k, q.sz * (landed ? .8 : .8) * k, 0, 0, TAU); ctx.fill(); }
    ctx.restore(); };

  /* ================================================================ words, end card */
  /* captions(ctx, t, lines, o) — Story.captions in this style: Gowun Batang 700, warm near-black ink (#2a2522) on a lifted
     patch of paper (a wet tissue taking the wash back off), source line #5b4a3e, block at y = 420. o overrides. */
  K.captionLift = function (ctx, t, lines, y = 420) {
    ctx.save(); ctx.font = `700 54px ${K.FONT}`;
    for (const [a, b, s, src] of lines) { const al = Pilot.win(t, a, b, .35, .45); if (al <= 0) continue;
      const ls = s.split('\n'), w = Math.max(...ls.map(l => ctx.measureText(Pilot.tr(l)).width)) + 200, h = ls.length * 90 + (src ? 110 : 0) + 90;
      ctx.globalAlpha = al * .8; ctx.drawImage(TX.lift, Pilot.W / 2 - w / 2, y - 70 - 45, w, h); }
    ctx.restore();
  };
  K.captions = function (ctx, t, lines, o = {}) {
    K.captionLift(ctx, t, lines, o.y ?? 420);
    Story.captions(ctx, t, lines, { font: K.FONT, srcFont: K.FONT, weight: 700, y: 420, color: '#2a2522', srcColor: '#5b4a3e', shadow: 'rgba(0,0,0,0)', shadowBlur: 0, ...o });
  };
  /* endPlate(ctx, t, at) — a fresh page washed over the picture from at − .2 s: near-bare paper, a quiet grey wash band and
     one orange pencil rule under the title. Then endCard. */
  K.endPlate = function (ctx, t, at) {
    const k = ss(at - .2, at + .35, t); if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = PAT.paper; ctx.fillRect(0, 0, Pilot.W, Pilot.H); ctx.restore();
    ctx.save(); ctx.globalAlpha = k; ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(TX.endWash, 0, 0); ctx.restore();
  };
  /* endCard(ctx, t, card, at, o) — Story.endCard in this style: ink-brown title #221d1a, credits #5b4c40, at y = 860 */
  K.endCard = function (ctx, t, card, at, o = {}) {
    Story.endCard(ctx, t, card, at, { font: K.FONT, srcFont: K.FONT, color: '#221d1a', srcColor: '#5b4c40', y: 860, titleShadow: '', ...o });
  };

  /* ================================================================ init */
  /* init() — builds the paper tiles and patterns (≈ 2.5 s, the bulk of a scene's init), the figure shadow, the caption
     lift and the end plate's wash. Call first in the scene's init. */
  K.init = function () {
    buildTiles();
    { const c = Pilot.canvas(180, 44), g = c.getContext('2d'); g.filter = 'blur(5px)'; g.fillStyle = 'rgba(80,78,78,.8)'; g.beginPath(); g.ellipse(90, 22, 72, 11, 0, 0, TAU); g.fill(); TX.shadow = c; }
    { const c = Pilot.canvas(600, 260), g = c.getContext('2d'); g.filter = 'blur(18px)'; g.fillStyle = PAT.paper; g.beginPath(); g.roundRect(50, 50, 500, 160, 60); g.fill(); TX.lift = c; }
    { const W = Pilot.W, H = Pilot.H, cx = W / 2, cy = H / 2, Lr = K.whiteLayer(W, H, 0, 0); K.scratch(W, H, 0, 0);   // the end card's quiet wash band and a pencil rule
      const blob = []; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, q = .86 + .28 * fbm(Math.cos(a) + 3, Math.sin(a) + 5, 3); blob.push([cx + Math.cos(a) * 470 * q, cy + Math.sin(a) * 300 * q]); }
      wash(Lr.g, blob, [150, 140, 132], .1, { seed: 990, round: 1, wob: 16, wl: 70, streak: 8, horiz: 1, edge: 1.8 });
      pencil(Lr.g, HD.seg([cx - 240, cy + 50], [cx + 240, cy + 46], 6), 991, 0, PAT.orange, { w: 3 });
      TX.endWash = Lr.c; K.scratchFree(); }
  };

  window.Inkwash = K;
})();

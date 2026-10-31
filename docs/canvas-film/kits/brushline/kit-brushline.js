/* kit-brushline.js — house style "minimal brush line" for word-log films (global: window.BrushLine).
   A black brush-pen drawing on white: very few strokes, each a pressure ribbon with long tapered ends and a dry tail,
   white-filled shapes, everything BOILING (3 drawings cycled on 8 fps), round bears drawn in a handful of strokes, the
   world reduced to ONE long brush line (the ground), hand-lettered words inked twice (Hi Melody), and ONE colour: a warm
   spot-colour dab laid loosely under what matters.
   Worked example: sermons/2026-10-24-cross-styles/film/scenes/cs-brushline.html (잘라 낸 건 다리였다 · 미니멀 붓선).
   Style card: styles/brushline/STYLE.md.

   HOW A FRAME IS MADE
     K.begin(ctx, t, cam)      paper; boil drawing K.fd (0..2, 8 fps); camera; clear the ink layer (white) + dab layer
     … draw in SCREEN px into the ink layer K.g (world points through K.toS): K.brW(worldPts) / K.brS(screenPts),
       K.whiteS fills (paper white: hide what's behind AND clear the dab under them); the dab goes on K.hl (K.dabS / dabPoly).
     K.end(ctx, fade)          ink dropout in the paper tooth; dab and ink MULTIPLIED onto the paper
     K.captions / K.endCard    hand-lettered words, inked twice
   Units: frame px (1080×1920) for screen points; world px for K.toS / K.brW / figure specs (camera {x, y, z}: world
   (x, y) at the frame centre, zoom z). Deterministic (seeded), seek-safe; no network, no images. Load after lib.js, story.js. */
(function () {
  const TAU = Math.PI * 2;
  const { clamp, lerp, ss, eo, eio, rng, noise } = Pilot;
  let W = 1080, H = 1920;
  const K = {};

  /* ================================================================ HD — the hand-drawn line toolkit
     Lines are variable-width ribbons built from densely sampled polylines: a static hand wobble per stroke (seeded), a
     boil displacement per drawing, pressure along the length, tapered ends, ragged edges. Points are [x, y] arrays. */
  const HD = {};
  HD.hash = (i, s = 0) => { let h = (Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  HD.t12 = t => Math.floor(t * 12 + 1e-6) / 12;   // time quantised to 12 fps (motion "on twos")
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
  // one boiled drawing: a new wobble + a tiny drift, per drawing index f (0..2)
  HD.boil = (pts, seed, f, amp, wl = 90) => { if (!amp) return pts; const s = (seed * 31 + f * 977) | 0, dx = (HD.hash(s, 1) - .5) * amp, dy = (HD.hash(s, 2) - .5) * amp;
    return HD.wob(pts, s, amp, wl).map(p => [p[0] + dx, p[1] + dy]); };
  // 2D affine matrices as {a,b,c,d,e,f}: apply to points, build (translate·rotate·scale), multiply, map one point
  HD.xf = (pts, m) => pts.map(p => [m.a * p[0] + m.c * p[1] + m.e, m.b * p[0] + m.d * p[1] + m.f]);
  HD.mat = (x, y, rot = 0, sx = 1, sy = sx) => { const c = Math.cos(rot), s = Math.sin(rot); return { a: c * sx, b: s * sx, c: -s * sy, d: c * sy, e: x, f: y }; };
  HD.mul = (A, Bm) => ({ a: A.a * Bm.a + A.c * Bm.b, b: A.b * Bm.a + A.d * Bm.b, c: A.a * Bm.c + A.c * Bm.d, d: A.b * Bm.c + A.d * Bm.d, e: A.a * Bm.e + A.c * Bm.f + A.e, f: A.b * Bm.e + A.d * Bm.f + A.f });
  HD.pt = (m, x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
  // variable-width ribbon Path2D along pts; wf(u, s, i, L) → width (round caps where the end is wide)
  HD.ribbon = (pts, wf) => {
    const n = pts.length, N = HD.normals(pts), Sx = HD.lengths(pts), L = Sx[n - 1] || 1, Lf = [], Rt = [], ws = [];
    for (let i = 0; i < n; i++) { const w = Math.max(0, wf(Sx[i] / L, Sx[i], i, L)) / 2; ws.push(w); Lf.push([pts[i][0] + N[i][0] * w, pts[i][1] + N[i][1] * w]); Rt.push([pts[i][0] - N[i][0] * w, pts[i][1] - N[i][1] * w]); }
    const p = new Path2D(); p.moveTo(Lf[0][0], Lf[0][1]); for (let i = 1; i < n; i++) p.lineTo(Lf[i][0], Lf[i][1]);
    const ae = Math.atan2(N[n - 1][1], N[n - 1][0]); if (ws[n - 1] > .4) p.arc(pts[n - 1][0], pts[n - 1][1], ws[n - 1], ae, ae + Math.PI, true); else p.lineTo(Rt[n - 1][0], Rt[n - 1][1]);
    for (let i = n - 1; i >= 0; i--) p.lineTo(Rt[i][0], Rt[i][1]);
    const a0 = Math.atan2(N[0][1], N[0][0]); if (ws[0] > .4) p.arc(pts[0][0], pts[0][1], ws[0], a0 + Math.PI, a0, true);
    p.closePath(); return p;
  };
  // an ink line on ctx: o = { w, ts, te (taper lengths px), mn (tip width fraction), press, pw (pressure wavelength), rough, seed, col, dry, blob }
  HD.ink = (ctx, pts, o = {}) => {
    if (!pts || pts.length < 2) return;
    const w = o.w ?? 8, ts = o.ts ?? w * 2.5, te = o.te ?? w * 3.5, mn = o.mn ?? .2, press = o.press ?? .3, pw = o.pw ?? 70, rough = o.rough ?? .08, seed = o.seed ?? 1, mnE = o.mnE ?? mn;
    const wf = (u, s, i, L) => { const k = Math.min(1, mn + (1 - mn) * ss(0, ts, s)) * Math.min(1, mnE + (1 - mnE) * ss(0, te, L - s));
      return w * k * (1 + press * (noise(s / pw, seed * 3.7 % 500) - .5) * 2) * (1 + rough * (HD.hash(i, seed) - .5) * 2); };
    ctx.fillStyle = o.col || '#151312'; ctx.fill(HD.ribbon(pts, wf));
    if (o.blob) { ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], w * o.blob, 0, TAU); ctx.fill(); }
    if (o.dry) {
      const N = HD.normals(pts), Sx = HD.lengths(pts), L = Sx[Sx.length - 1], r = rng(seed * 7 + 3);
      ctx.save(); ctx.strokeStyle = o.paper || '#fff'; ctx.lineCap = 'round';
      for (let k = 0; k < (o.dryN || 4); k++) { const f = (r() - .5) * .7, u0 = 1 - o.dry * (.3 + .7 * r()); ctx.lineWidth = (o.dryW || 1) * (.5 + r() * .7); ctx.globalAlpha = .55 + r() * .45; ctx.beginPath(); let st = false;
        for (let i = 0; i < pts.length; i++) { const u = Sx[i] / L; if (u < u0) continue; const ww = wf(u, Sx[i], i, L) * f; const x = pts[i][0] + N[i][0] * ww, y = pts[i][1] + N[i][1] * ww; if (!st) { ctx.moveTo(x, y); st = true; } else ctx.lineTo(x, y); }
        ctx.stroke(); }
      ctx.restore();
    }
  };
  HD.fillPts = (ctx, pts, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fill(); };
  HD.pathOf = pts => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (const q of pts) p.lineTo(q[0], q[1]); p.closePath(); return p; };
  // paper tooth height field (full frame, 0..1): two noise octaves (s1, s2 px) + `fib` raised fibres
  HD.tooth = (seed = 1, s1 = 6, s2 = 2.2, fib = 0) => {
    const T = new Float32Array(W * H), r = rng(seed), ox = r() * 500, oy = r() * 500;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = .62 * noise(x / s1 + ox, y / s1 + oy) + .38 * noise(x / s2 + oy, y / s2 + ox);
      T[y * W + x] = v; }
    if (fib) {
      for (let k = 0; k < fib; k++) { let x = r() * W, y = r() * H, a = r() * TAU; const l = 8 + r() * 30;
        for (let i = 0; i < l; i++) { a += (r() - .5) * .3; x += Math.cos(a); y += Math.sin(a); const xi = x | 0, yi = y | 0; if (xi >= 0 && yi >= 0 && xi < W && yi < H) T[yi * W + xi] = Math.min(1, T[yi * W + xi] + .18); } } }
    return T;
  };
  // paper canvas from a tooth field: base colour, mottling, embossed tooth (light top-left), grain, vignette
  HD.paper = (T, o = {}) => {
    const c = Pilot.canvas(W, H), g = c.getContext('2d'), d = g.createImageData(W, H), D = d.data, base = o.base || [250, 249, 245];
    const mot = o.mott ?? 6, emb = o.emb ?? 26, gr = o.grain ?? 4, vig = o.vig ?? 0, r = rng(o.seed || 9), mscale = o.mscale || 260;
    const tint = o.tint || [0, 0, 0];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, x0 = Math.max(0, x - 1), y0 = Math.max(0, y - 1), x1 = Math.min(W - 1, x + 1), y1 = Math.min(H - 1, y + 1);
      const sh = (T[y0 * W + x0] - T[y1 * W + x1]) * emb, m = (noise(x / mscale + 40, y / mscale + 7) - .5) * 2 * mot;
      const dx = (x / W - .5), dy = (y / H - .5), v = -vig * (dx * dx * 1.4 + dy * dy) * 4;
      const n = (r() - .5) * gr, k = sh + m + n + v;
      D[i * 4] = base[0] + k + tint[0] * m / (mot || 1); D[i * 4 + 1] = base[1] + k + tint[1] * m / (mot || 1); D[i * 4 + 2] = base[2] + k + tint[2] * m / (mot || 1); D[i * 4 + 3] = 255; }
    g.putImageData(d, 0, 0); return c;
  };
  // full-frame canvas of colour `col` whose alpha follows the tooth ('valley': ink misses the valleys; 'peak': pencil on peaks)
  HD.toothMask = (T, col, mode = 'valley', thr = .35, soft = .18, amax = 1) => {
    const c = Pilot.canvas(W, H), g = c.getContext('2d'), d = g.createImageData(W, H), D = d.data, rgb = Pilot.hex(col);
    for (let i = 0; i < W * H; i++) { const v = mode === 'peak' ? (T[i] - thr) / soft : (thr - T[i]) / soft, a = clamp(v) * amax;
      D[i * 4] = rgb[0]; D[i * 4 + 1] = rgb[1]; D[i * 4 + 2] = rgb[2]; D[i * 4 + 3] = a * 255; }
    g.putImageData(d, 0, 0); return c;
  };
  HD.layer = () => { const c = Pilot.canvas(W, H), g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round'; return { c, g }; };
  HD.clearWhite = (g, x = 0, y = 0, w = W, h = H) => { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.fillStyle = '#fff'; g.fillRect(x, y, w, h); g.restore(); };
  HD.dropout = (g, mask, a = 1, x = 0, y = 0, w = W, h = H) => { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; g.drawImage(mask, x, y, w, h, x, y, w, h); g.restore(); };
  HD.multiply = (ctx, c, x = 0, y = 0, w = W, h = H, a = 1) => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = a; ctx.drawImage(c, x, y, w, h, x, y, w, h); ctx.restore(); };
  // walk distance x0→x1 over T s with a slowing stop (last `dec` fraction) → function of t
  HD.walker = (x0, x1, T, dec = .3) => { const n = 400, tab = [0]; let s = 0; for (let i = 1; i <= n; i++) { const u = i / n; s += 1 - ss(1 - dec, 1, u); tab.push(s); }
    return t => { if (t <= 0) return x0 + (t / T) * n * (x1 - x0) / tab[n]; if (t >= T) return x1; const f = t / T * n, i = Math.floor(f), k = f - i; return x0 + (x1 - x0) * lerp(tab[i], tab[Math.min(n, i + 1)], k) / tab[n]; }; };
  K.HD = HD;

  /* ================================================================ palette, type */
  K.INK = '#1c1a19';                     // the brush pen: warm black
  K.GREY = 'rgba(28,26,25,.5)';          // the quieter grey brush (other characters)
  K.PAPER = '#ffffff';                   // white-out / paper fill on the ink layer
  K.PAPER_RGB = [252, 251, 248];         // the paper itself: near-white, barely mottled
  K.DAB = ['rgba(252,222,164,.55)', 'rgba(250,206,140,.28)', 'rgba(253,232,190,.35)'];   // THE one colour: a warm spot-colour dab (3 passes)
  K.WORD = '#22201e'; K.WORD2 = '#3a3633'; K.WORD3 = '#5a5550';
  K.FONT = "'Hi Melody',cursive";
  K.FONTS = ["400 86px 'Hi Melody'"];   // for Pilot.run({ fonts })
  K.BW = 11;                             // default brush width (px at zoom 1)
  K.t12 = HD.t12;
  K.bf = t => Math.floor(t * 8 + 1e-6) % 3;   // which of the 3 boiled drawings is up at t (8 fps)
  K.frac = x => x - Math.floor(x);

  /* ================================================================ init: paper, layers (≈0.6–1 s) */
  K.TX = {};
  // opts: { tooth: [seed, s1, s2, fibres], paper: HD.paper options, dropout: alpha (.55) }
  K.init = function (o = {}) {
    W = Pilot.W; H = Pilot.H; K.W = W; K.H = H;
    const T = HD.tooth(...(o.tooth || [5, 4, 1.6, 1500])), TX = K.TX;
    TX.paper = HD.paper(T, Object.assign({ base: K.PAPER_RGB, mott: 2.5, emb: 7, grain: 2.5, vig: .02 }, o.paper || {}));
    TX.drop = HD.toothMask(T, '#ffffff', 'valley', .24, .08, .8);
    K.dropA = o.dropout ?? .55;
    const L1 = HD.layer(); K.INKL = L1; K.g = L1.g; K.HLc = Pilot.canvas(W, H); K.hl = K.HLc.getContext('2d');
  };

  /* ================================================================ camera (world → screen) */
  K.cam = { x: 0, y: 1000, z: 1, sx: 0, sy: 0 }; K.M = null; K.pz = 1; K.fd = 0;
  // c = { x, y (world point at frame centre), z, sx, sy (shake px) }. K.pz = z^.55: the brush thickens a little on a push
  K.setCam = function (c) { K.cam = c; K.M = { a: c.z, b: 0, c: 0, d: c.z, e: W / 2 - c.x * c.z + (c.sx || 0), f: H / 2 - c.y * c.z + (c.sy || 0) }; K.pz = Math.pow(c.z, .55); };
  K.toS = p => [K.M.a * p[0] + K.M.e, K.M.d * p[1] + K.M.f];
  K.mixCam = (a, b, k) => k <= 0 ? a : k >= 1 ? b : { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
  // the camera y that puts ground line gy at screen y ≈ 1430 for zoom z (the line sits low; figures fill the frame)
  K.camY = (gy, z, low = 470) => gy - low / z;
  K.shake = (t, t0, d = .55, ax = 18, ay = 14) => { if (t < t0) return [0, 0]; const k = 1 - ss(t0, t0 + d, t); return [ax * k * Math.sin(t * 97), ay * k * Math.sin(t * 131 + 1)]; };

  /* ================================================================ frame */
  K.begin = function (ctx, t, cam) { K.fd = K.bf(t); K.setCam(cam); ctx.drawImage(K.TX.paper, 0, 0); HD.clearWhite(K.g); K.hl.clearRect(0, 0, W, H); };
  // finish: ink dropout, then dab layer and ink multiplied onto ctx (fade 0 → plain paper for the end card)
  K.end = function (ctx, fade = 1) { HD.dropout(K.g, K.TX.drop, K.dropA); HD.multiply(ctx, K.HLc, 0, 0, W, H, fade); HD.multiply(ctx, K.INKL.c, 0, 0, W, H, fade); };

  /* ================================================================ the brush (screen px, into the ink layer K.g) */
  /* a brush stroke through screen points: hand wobble (o.wob 1.6) + boil (o.boil 1.5), pressure ribbon w (11) × K.pz,
     long tapers (ts 14 / te 22), a dry tail (dry .28, 2 streaks). o.fix = no push scaling, o.raw = no wobble/boil. */
  K.brS = function (pts, seed, o = {}) {
    if (!pts || pts.length < 2) return;
    const q = o.raw ? pts : HD.boil(HD.wob(pts, seed, o.wob ?? 1.6, 140), seed, K.fd, o.boil ?? 1.5, 80);
    HD.ink(K.g, q, { ts: 14, te: 22, mn: .25, press: .32, pw: 60, rough: .1, seed, col: K.INK, dry: .28, dryN: 2, ...o, w: (o.w ?? K.BW) * (o.fix ? 1 : K.pz) });
  };
  K.brW = (pts, seed, o) => K.brS(pts.map(K.toS), seed, o);   // the same, world points
  K.pathS = function (g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath(); };
  // paper fill of a screen shape: hides the ink behind it AND removes the dab under it
  K.whiteS = function (pts) { const G = K.g, HL = K.hl; G.fillStyle = K.PAPER; K.pathS(G, pts); G.fill();
    HL.save(); HL.globalCompositeOperation = 'destination-out'; HL.globalAlpha = 1; HL.fillStyle = '#000'; K.pathS(HL, pts); HL.fill(); HL.restore(); };
  // a paper-coloured ribbon (the inside of an outlined tube: limbs), also clearing the dab under it
  K.paperRibbon = function (pts, o) { HD.ink(K.g, pts, { ...o, col: K.PAPER });
    K.hl.save(); K.hl.globalCompositeOperation = 'destination-out'; HD.ink(K.hl, pts, { ...o, col: '#000' }); K.hl.restore(); };
  /* THE ACCENT: the lab's warm spot-colour dab — three loose passes, each a little off the last, boiling.
     Screen centre (cx, cy), radii rx × ry, k (0..1 grows it), seed, a (alpha) */
  K.dabS = function (cx, cy, rx, ry, k = 1, seed = 0, a = 1) {
    if (k <= 0) return; const HL = K.hl;
    HL.save(); HL.globalAlpha = a;
    for (let pass = 0; pass < 3; pass++) { const pts = []; for (let i = 0; i < 36; i++) { const an = i / 36 * TAU, r = (1 + .09 * Math.sin(an * 2 + pass * 2.1 + seed) + .16 * (noise(an * 1.7 + pass * 4 + seed, K.fd * 2.3) - .5)) * (.55 + .45 * k);
        pts.push([cx + pass * 5 + Math.cos(an) * r * rx, cy - pass * 4 + Math.sin(an) * r * ry]); }
      HD.fillPts(HL, HD.spline(pts, 6, true), K.DAB[pass]); }
    HL.restore();
  };
  // a dab that follows a screen shape loosely, a little off the lines (2 passes)
  K.dabPoly = function (pts, a = 1) {
    const HL = K.hl; HL.save(); HL.globalAlpha = a;
    for (let pass = 0; pass < 2; pass++) { const off = pass ? [6, -5] : [-3, 4]; HL.fillStyle = K.DAB[pass]; K.pathS(HL, HD.wob(pts, 70 + pass * 13 + K.fd * 5, 6, 60).map(p => [p[0] + off[0], p[1] + off[1]])); HL.fill(); }
    HL.restore();
  };
  // brushed dashes crawling along screen pts (an outline of what's missing / a guide)
  K.dashed = function (pts, t, seed = 4400, o = {}) {
    const Ls = HD.lengths(pts); let seg = [], on = true, nxt = 18; const st = { w: 6, ts: 4, te: 6, mn: .4, wob: .5, boil: .6, dry: 0, ...o };
    for (let i = 0; i < pts.length; i++) { const s = Ls[i] + (t * 18 % 30); if (s > nxt) { if (on && seg.length > 1) K.brS(seg, seed + i, st); on = !on; nxt += on ? 18 : 12; seg = []; } if (on) seg.push(pts[i]); }
    if (on && seg.length > 1) K.brS(seg, seed - 1, st);
  };
  // short brush ticks on an arc round screen point c (emphasis / glow): n ticks from angle a0 stepping da, out to ×r1 (×r1y in y)
  K.ticks = function (c, rx, ry, n, a0, da, r1, r1y, seed, o = {}) {
    for (let i = 0; i < n; i++) { const a = a0 + i * da;
      K.brS(HD.seg([c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry], [c[0] + Math.cos(a) * rx * r1, c[1] + Math.sin(a) * ry * r1y], 2), seed + i, { w: 6, ts: 3, te: 10, dry: 0, ...o }); }
  };
  // THE HIT: 9 brushed impact strokes bursting round world point c for d s after t0
  K.hit = function (t, t0, c, o = {}) {
    const d = o.d ?? .45, n = o.n ?? 9, seed = o.seed ?? 5000; if (t < t0 || t >= t0 + d) return; const k = (t - t0) / d;
    for (let i = 0; i < n; i++) { const a = -Math.PI * (.0 + i * .125), r0 = 60 + 130 * eo(k), r1 = r0 + 50 * (1 - k) + 18;
      K.brW(HD.seg([c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0 * .8], [c[0] + Math.cos(a) * r1, c[1] + Math.sin(a) * r1 * .8], 2), seed + i, { w: 9, ts: 3, te: 14, dry: 0 }); }
  };
  // brush specks thrown up (sawdust, dirt): { t0, x, y, vx, vy, land, r0, vr, sz, seed } world px, gravity 700, fade 1.0–1.6 s
  K.specks = function (list, t) {
    const G = K.g;
    for (const q2 of list) { const u = t - q2.t0; if (u < 0) continue; const al = 1 - ss(q2.t0 + 1.0, q2.t0 + 1.6, t); if (al <= 0) continue;
      const tl = (-q2.vy + Math.sqrt(q2.vy * q2.vy + 4 * 700 * (q2.land - q2.y))) / 1400, uu = Math.min(u, Math.max(0, tl));
      const x = q2.x + q2.vx * uu, y = q2.y + q2.vy * uu + 700 * uu * uu, r = q2.r0 + q2.vr * uu;
      G.save(); G.globalAlpha = al; K.brW([[x - Math.cos(r) * q2.sz, y - Math.sin(r) * q2.sz], [x + Math.cos(r) * q2.sz, y + Math.sin(r) * q2.sz]], q2.seed, { w: 5, ts: 1, te: 3, mn: .5, dry: 0 }); G.restore(); }
  };
  /* rising wisps (steam, warmth, a smell, light): n short brush ticks drifting up from (x, y0) on twos, 1.5 s cycle.
     o = { n: 3, spread: 40, h: 110, w: 5.5, seed: 4310 } (world px) */
  K.wisps = function (t, x, y0, o = {}) {
    const n = o.n ?? 3, sp = o.spread ?? 40, h = o.h ?? 110, seed = o.seed ?? 4310;
    for (let j = 0; j < n; j++) { const ph = ((HD.t12(t) + j * .5) / 1.5) % 1, base = x - sp * (n - 1) / 2 + j * sp, pts = [];
      for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([base + Math.sin(u * 4.6 + j * 2 + ph * 3) * 9, y0 - u * h - ph * 40]); }
      const a0 = Math.floor(lerp(0, 10, ph)), a1 = Math.floor(lerp(14, 25, Math.min(1, ph + .35))); const sg = pts.slice(a0, a1); if (sg.length > 2) K.brW(sg, seed + j * 7, { w: (o.w ?? 5.5) * (1 - .5 * ph), ts: 12, te: 20 }); }
  };

  /* ================================================================ the world: one long brush line */
  /* the ground is a few long strokes along y = gy, lifted and restarted like a real hand (overlapping 40 px).
     o = { from, to (world x), gaps: [[x0, x1], …] (where the line breaks off), seed (31) } → { segs, gaps } */
  K.groundLine = function (o = {}) {
    const r = rng(o.seed ?? 31), gaps = o.gaps || [], segs = [], to = o.to ?? 3000; let x = o.from ?? -1600;
    gaps.forEach((g, i) => { while (true) { const x1 = Math.min(g[0], x + 700 + r() * 500); segs.push([x, x1, 4000 + 100 * i + segs.length]); if (x1 >= g[0]) break; x = x1 - 40; } x = g[1]; });
    while (x < to) { const x1 = x + 700 + r() * 500; segs.push([x, x1, 4000 + 100 * gaps.length + segs.length]); x = x1 - 40; }
    return { segs, gaps };
  };
  // grass tufts and pebbles along the line: o = { x0, x1, skip(x), seed (77) }
  K.tufts = function (o = {}) { const r = rng(o.seed ?? 77), T = [];
    for (let x = o.x0 ?? -1500; x < (o.x1 ?? 3000); x += 240 + r() * 320) { if (o.skip && o.skip(x)) continue; T.push({ x, k: r() < .6 ? 'grass' : 'pebble', seed: 900 + (x | 0) }); }
    return T; };
  /* draw the ground line (in view), each gap's two ends turning down and falling away in dry strokes (seed 4200+…),
     then the tufts. gy = line y (world) */
  K.drawGround = function (GL, tufts, gy) {
    const cam = K.cam, toS = K.toS, vx0 = cam.x - 620 / cam.z, vx1 = cam.x + 620 / cam.z;
    for (const [a, b, sd] of GL.segs) { if (b < vx0 || a > vx1) continue;
      const pts = []; for (let x = a; x <= b; x += 6) pts.push([x, gy + 3 * Math.sin(x / 210 + sd)]);
      const atEdge = GL.gaps.some(g => Math.abs(b - g[0]) < 1), startEdge = GL.gaps.some(g => Math.abs(a - g[1]) < 1);
      K.brS(pts.map(toS), sd, { w: 12.5, ts: startEdge ? 6 : 30, te: atEdge ? 6 : 40, wob: 2.2, boil: 1.4, mn: .3 }); }
    GL.gaps.forEach(([E, E2], i) => { const o = i * 50, G = E2 - E;
      if (toS([E + G, 0])[0] > -80 && toS([E, 0])[0] < W + 80) {
        K.brW(HD.spline([[E - 4, gy - 2], [E + 4, gy + 60], [E + 12, gy + 180], [E + 26, gy + 330]], 3), 4201 + o, { w: 12, ts: 6, te: 120, mn: .05, dry: .6, dryN: 4 });
        K.brW(HD.spline([[E + G + 4, gy - 2], [E + G - 6, gy + 70], [E + G - 16, gy + 200], [E + G - 30, gy + 360]], 3), 4202 + o, { w: 12, ts: 6, te: 120, mn: .05, dry: .6, dryN: 4 });
        for (const [x, y, l, s] of [[E + 30, gy + 120, 40, 1], [E + G - 40, gy + 210, 50, -1], [E + 60, gy + 300, 30, 1]]) K.brW(HD.seg([x, y], [x + s * l, y + 10], 3), 4210 + y + o, { w: 6, ts: 6, te: 20, dry: .5, col: 'rgba(28,26,25,.7)' });
      } });
    for (const q of tufts) { const sx = toS([q.x, 0])[0]; if (sx < -60 || sx > W + 60) continue;
      if (q.k === 'grass') { for (let i = -1; i <= 1; i++) K.brW([[q.x + i * 9, gy - 2], [q.x + i * 15, gy - 22 - (i === 0) * 10]], q.seed + i, { w: 5, ts: 3, te: 10, mn: .2, dry: 0 }); }
      else K.brW(HD.arc(q.x, gy - 7, 13, 8, Math.PI * 1.05, Math.PI * 1.95, 3), q.seed, { w: 6, ts: 4, te: 8, dry: 0 }); }
  };
  // clip K.g and K.hl to the inside of a gap (things falling into it): call, draw, then K.unclip()
  K.clipGap = function (E, E2, gy) { const a = K.toS([E + 3, gy - 4000]), b = K.toS([E2 - 3, gy + 9000]);
    for (const g of [K.g, K.hl]) { g.save(); g.beginPath(); g.rect(a[0], a[1], b[0] - a[0], b[1] - a[1]); g.clip(); } };
  K.unclip = () => { K.hl.restore(); K.g.restore(); };
  /* a brush cloud: one stroke of three round puffs (middle one biggest) over a dry flat base, width w, at world (x, y);
     drift it in the scene (≈ 6–12 px/s) for the "waiting" beat. seed; o = { w: brush width (7), col } */
  K.cloud = function (x, y, w, seed, o = {}) {
    const R = [.2, .3, .22], tot = (R[0] + R[1] + R[2]) * 2, pts = []; let cx = x - w / 2;   // puffs chained end to start (no backtracking)
    R.forEach(r => { const rr = r * w / tot, c = cx + rr, lift = (rr - R[1] * w / tot) * .5; for (let k = 0; k <= 14; k++) { const a = Math.PI + Math.PI * k / 14; pts.push([c + Math.cos(a) * rr, y + lift + Math.sin(a) * rr * .8]); } cx = c + rr; });
    K.brW(pts, seed, { w: o.w ?? 7, ts: 20, te: 40, dry: .4, col: o.col }); K.brW([[x - w * .46, y + 4], [x + w * .4, y + 6]], seed + 1, { w: (o.w ?? 7) * .7, ts: 10, te: 30, dry: .5, col: o.col }); };
  /* a lit DOORWAY at the end of the line: a brushed arch (radius r, centre ay, standing on gy), the warm dab glowing
     inside, the leaf swung open toward us, wisps of light rising above. o = { x, gy, ay, r: 112, seed: 4300, light: 1 } */
  K.doorway = function (t, o) {
    const gy = o.gy, x = o.x, ay = o.ay, r = o.r ?? 112, sd = o.seed ?? 4300, lt = o.light ?? 1, z = K.cam.z;
    const arc = (rad, a0, a1, n = 30) => { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([x + Math.cos(a) * rad, ay + Math.sin(a) * rad]); } return p; };
    const inner = [[x - r, gy], ...arc(r, Math.PI, TAU), [x + r, gy]];
    const c = K.toS([x, ay + 60]);
    if (lt > 0) K.dabS(c[0], c[1], (r + 40) * z, (gy - ay + 110) * z * .62, 1, 3, lt);
    K.brW(inner, sd + 1, { w: 11, ts: 10, te: 14 });
    const leaf = [[x + r, gy], [x + r + 54, gy + 10], [x + r + 54, ay + 10], [x + r, ay - 30]];
    K.whiteS(leaf.map(K.toS)); K.brW(HD.poly(leaf.slice(1).concat([leaf[3]]), false, 3), sd + 2, { w: 8, ts: 8, te: 10 });
    K.brW(HD.seg([x + r + 40, (gy + ay) / 2], [x + r + 40, (gy + ay) / 2 + 12], 2), sd + 3, { w: 8, ts: 2, te: 2, dry: 0 });
    if (lt > 0) K.wisps(t, x, ay - r - 30, { seed: sd + 10 });
  };

  /* ================================================================ THE FIGURE: the lab's round bear
     Local coordinates (y down): hip at 0,0, feet on y = HIPH (92), snout toward +x, head on the neck pivot NECK.
     Spec F (world px): { kind: 'me' (full black brush) | other (thin grey brush), id, seed?, s (scale: 1 "me", .84 others),
       f (+1 faces right), gy, hip, ang (lean), feet [far, near], hands [far, near] (world points; null = rest),
       hand ['rest'|'grip'|'flat'|'open', …], tilt (head nod), eye 'dot'|'dash'|'squeeze'|'happy'|'shock'|'down'|'up',
       front (face-on, mid-turn), farFront (far arm in front of the body), carry (far arm reaches back over the shoulder:
       drawn over the back), alpha, ticks, sweat, bang, run }
     Arms are outlined tubes on a 2-bone IK from fixed shoulders (bones 62·s each, elbow hangs low); the paw (and the
     thumb of a grip) is drawn AT the hand point. Out of reach → the hand stops at full stretch (use K.attach). */
  const HIPH = 92;
  const BODYF = HD.spline([[-40, 6], [-62, -40], [-62, -110], [-34, -158], [18, -168], [56, -126], [66, -56], [52, 0], [8, 18]], 3, true);
  const BODYB = HD.spline([[-28, 14], [-60, -36], [-62, -110], [-36, -156]], 3), BODYFR = HD.spline([[50, -132], [64, -60], [52, 0], [12, 16]], 3);
  const HEADF = HD.arc(0, 0, 86, 74, 0, TAU, 4), HEADO = HD.arc(0, 0, 86, 74, Math.PI * .28, Math.PI * 2.08, 3);
  const SNF = HD.spline([[50, -20], [92, -24], [118, -6], [114, 22], [80, 34], [52, 28]], 3).concat([[30, 6]]), SNO = HD.spline([[56, -22], [92, -24], [118, -6], [114, 22], [82, 34], [58, 30]], 3);
  const SHOULDER = [[-14, -128], [28, -120]], CONTACT = [-44, -150], NECK = [16, -200];
  K.BEAR = { HIPH, SHOULDER, CONTACT, NECK, BONE: 62, REACH: 118 };
  K.bearM = function (F) { const c = Math.cos(F.ang), s = Math.sin(F.ang); return { a: c * F.f * F.s, b: s * F.f * F.s, c: -s * F.s, d: c * F.s, e: F.hip[0], f: F.hip[1] }; };
  const bearM = K.bearM;
  // 2-bone IK: shoulder a → target t with bones l1, l2; pick(j1, j2) chooses the elbow → [elbow, hand]
  K.ik = function (a, t, l1, l2, pick) {
    let dx = t[0] - a[0], dy = t[1] - a[1], d = Math.hypot(dx, dy) || 1e-6; const dd = clamp(d, Math.abs(l1 - l2) + .5, l1 + l2 - .5);
    const tx = a[0] + dx / d * dd, ty = a[1] + dy / d * dd, an = Math.atan2(ty - a[1], tx - a[0]), b = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
    const j1 = [a[0] + Math.cos(an + b) * l1, a[1] + Math.sin(an + b) * l1], j2 = [a[0] + Math.cos(an - b) * l1, a[1] + Math.sin(an - b) * l1];
    return [pick(j1, j2), [tx, ty]];
  };
  function arm(F, M, k, me, sd) {   // an outlined tube: an ink ribbon, then a paper ribbon inside it (the shoulder end melts into the body)
    const toS = K.toS, s = F.s, sh = HD.pt(M, ...SHOULDER[k]), brS = K.brS, INK = K.INK, GREY = K.GREY;
    const T = F.hands[k] || HD.pt(M, SHOULDER[k][0] + 18, SHOULDER[k][1] + 104);
    const pick = (a, b) => (a[1] > b[1] ? a : b);
    const [el, hd] = K.ik(sh, T, 62 * s, 62 * s, pick);
    const ap = HD.boil(HD.spline([sh, el, hd], 3).map(toS), sd + k, K.fd, 1, 60);
    const wz = s * K.cam.z, ow = me ? 9 : 6;
    HD.ink(K.g, ap, { w: (40 + 2 * ow) * wz, ts: 34 * wz, te: 2, mn: .35, press: .04, rough: .04, seed: sd + k, col: me ? INK : GREY });
    K.paperRibbon(ap, { w: 40 * wz, ts: 40 * wz, te: 2, mn: .1, press: .02, rough: 0, seed: sd + 10 + k });
    const ty = (F.hand && F.hand[k]) || 'rest';
    if (ty === 'grip') {
      const u = [hd[0] - el[0], hd[1] - el[1]], ul = Math.hypot(u[0], u[1]) || 1, n = [-u[1] / ul * F.f, u[0] / ul * F.f];
      brS([toS([hd[0] + n[0] * 4 * s - u[0] / ul * 6 * s, hd[1] + n[1] * 4 * s - u[1] / ul * 6 * s]), toS([hd[0] + u[0] / ul * 12 * s - n[0] * 10 * s, hd[1] + u[1] / ul * 12 * s - n[1] * 10 * s])], sd + 20 + k, { w: me ? 6 : 4.5, ts: 4, te: 8, mn: .4, dry: 0, col: me ? INK : GREY });
    }
    if (ty === 'open') { const u = [hd[0] - el[0], hd[1] - el[1]];
      for (let i = -1; i <= 1; i++) { const a = Math.atan2(u[1], u[0]) + i * .5, b0 = [hd[0] + Math.cos(a) * 24 * s, hd[1] + Math.sin(a) * 24 * s];
        brS([toS(b0), toS([b0[0] + Math.cos(a) * 14 * s, b0[1] + Math.sin(a) * 14 * s])], sd + 30 + i, { w: 5, ts: 3, te: 6, mn: .4, dry: 0, col: me ? INK : GREY }); } }
  }
  function legB(F, M, k, me, sd) {   // stubby legs: a U-shaped brush stroke from the hip to a round foot
    const toS = K.toS, top = HD.pt(M, k ? 14 : -6, -8), [fx, fy0] = F.feet[k], f = F.f, s = F.s, fy = fy0 - 6 * s;
    const P = (x, y) => [x, y];
    const pts = HD.spline([P(top[0] - 22 * s * f, top[1]), P(fx - 24 * s * f, fy - 30 * s), P(fx - 22 * s * f, fy - 2 * s), P(fx + 4 * s * f, fy + 6 * s), P(fx + 30 * s * f, fy), P(fx + 22 * s * f, fy - 30 * s), P(top[0] + 24 * s * f, top[1] - 4 * s)], 3).map(toS);
    const q = HD.boil(pts, sd, K.fd, 1.2, 60);
    K.whiteS(q.concat([toS([top[0], top[1] - 30 * s])])); HD.ink(K.g, q, { w: (me ? 10 : 6.5) * K.pz, ts: 4, te: 4, mn: .6, press: .3, pw: 60, rough: .08, seed: sd, col: me ? K.INK : K.GREY });
  }
  /* draw a bear. back(): things BEHIND the body (a long object on the shoulder); mid(): after body + head, before the
     near arm (things held in front, under the near paw) */
  K.drawBear = function (F, back, mid) {
    const al = F.alpha ?? 1; if (al <= 0) return;
    const G = K.g, FD = K.fd, CMX = K.M, mulM = HD.mul, xf = HD.xf, whiteS = K.whiteS, pathS = K.pathS, brS = K.brS, INK = K.INK, PZ = K.pz;
    const me = F.kind === 'me', sd = F.seed ?? (me ? 500 : 600 + F.id * 70), col = me ? INK : K.GREY, w = me ? 1 : .62;
    G.save(); G.globalAlpha = al;
    const M = bearM(F), S = mulM(CMX, M), Mh = mulM(M, HD.mat(NECK[0], NECK[1], F.tilt || 0)), Sh = mulM(CMX, Mh);
    const B_ = (pts, s2, o = {}) => brS(pts, s2, { col, ...o, w: (o.w ?? K.BW) * w * F.s });
    if (back) back();
    if (!F.farFront && !F.carry) arm(F, M, 0, me, sd + 100);
    legB(F, M, 0, me, sd + 200); legB(F, M, 1, me, sd + 210);
    whiteS(HD.boil(xf(BODYF, S), sd + 1, FD, 1.2, 80));
    B_(xf(BODYB, S), sd + 2, { te: 30 }); B_(xf(BODYFR, S), sd + 3, { ts: 26 });
    if (F.carry && !F.farFront) arm(F, M, 0, me, sd + 100);
    if (F.front) {
      const Sf = mulM(CMX, mulM(HD.mat(F.hip[0], F.hip[1], F.ang, F.s, F.s), HD.mat(NECK[0] - 6, NECK[1] + 4, F.tilt || 0)));
      for (const [ex, k] of [[-56, 0], [56, 1]]) { whiteS(xf(HD.arc(ex, -58, 22, 21, 0, TAU, 4), Sf)); B_(xf(HD.arc(ex, -58, 22, 21, Math.PI * (k ? .78 : .82), Math.PI * (k ? 2.18 : 2.2), 3), Sf), sd + 6 + k, { w: 9 }); }
      whiteS(HD.boil(xf(HD.arc(0, 0, 84, 76, 0, TAU, 4), Sf), sd + 8, FD, 1.2, 80)); B_(xf(HD.arc(0, 0, 84, 76, Math.PI * .58, Math.PI * 2.42, 3), Sf), sd + 9, { w: 10.5, ts: 10, te: 30 });
      whiteS(xf(HD.arc(0, 26, 34, 24, 0, TAU, 3), Sf)); B_(xf(HD.arc(0, 26, 34, 24, Math.PI * .1, Math.PI * 2.05, 3), Sf), sd + 11, { w: 8, ts: 6, te: 12 });
      G.fillStyle = col; pathS(G, xf(HD.arc(0, 14, 11, 8.5, 0, TAU, 2), Sf)); G.fill();
      B_(xf(HD.spline([[-9, 36], [0, 40], [9, 36]], 2), Sf), sd + 13, { w: 5, ts: 4, te: 6, dry: 0 });
      for (const ex of [-30, 30]) { G.fillStyle = col; pathS(G, xf(HD.arc(ex, -14, 6.3, 7, 0, TAU, 2), Sf)); G.fill(); }
    } else {
      for (const [ex, ey, k] of [[-46, -58, 0], [30, -76, 1]]) { whiteS(HD.boil(xf(HD.arc(ex, ey, 22, 21, 0, TAU, 4), Sh), sd + 4 + k, FD, 1.2, 80)); B_(xf(HD.arc(ex, ey, 22, 21, Math.PI * .82, Math.PI * 2.2, 3), Sh), sd + 6 + k, { w: 9 }); }
      whiteS(HD.boil(xf(HEADF, Sh), sd + 8, FD, 1.2, 80)); B_(xf(HEADO, Sh), sd + 9, { w: 10.5, ts: 10, te: 30 });
      whiteS(HD.boil(xf(SNF, Sh), sd + 10, FD, 1.2, 80)); B_(xf(SNO, Sh), sd + 11, { w: 9.5, ts: 8, te: 18 });
      G.fillStyle = col; pathS(G, HD.boil(xf(HD.arc(112, -4, 11, 8.5, 0, TAU, 2), Sh), sd + 12, FD, .8, 30)); G.fill();
      B_(xf(HD.spline([[104, 18], [96, 22], [88, 20]], 2), Sh), sd + 13, { w: 5, ts: 4, te: 6, dry: 0 });
      const eye = F.eye || 'dot';
      if (eye === 'dash') B_(xf(HD.seg([36, -14], [56, -12], 2), Sh), sd + 14, { w: 6.5, ts: 4, te: 6, mn: .5, dry: 0 });
      else if (eye === 'squeeze') B_(xf(HD.poly([[38, -26], [54, -16], [38, -8]], false, 2), Sh), sd + 14, { w: 6, ts: 3, te: 5, mn: .5, dry: 0 });
      else if (eye === 'happy') B_(xf(HD.arc(47, -12, 10, 9, Math.PI * 1.1, Math.PI * 1.9, 2), Sh), sd + 14, { w: 6, ts: 3, te: 5, mn: .5, dry: 0 });
      else { const r = eye === 'shock' ? 10 : 7, c = eye === 'down' ? [46, -12] : eye === 'up' ? [50, -28] : [48, -20];
        if (eye === 'shock') { whiteS(xf(HD.arc(c[0], c[1], 15, 15, 0, TAU, 2), Sh)); B_(xf(HD.arc(c[0], c[1], 15, 15, 0, TAU, 2), Sh), sd + 15, { w: 4.5, ts: 3, te: 3, mn: .6, dry: 0 }); }
        G.fillStyle = col; pathS(G, HD.boil(xf(HD.arc(c[0], c[1], r * .9, r, 0, TAU, 2), Sh), sd + 16, FD, .6, 20)); G.fill();
        if (eye === 'down') B_(xf(HD.seg([34, -26], [58, -28], 2), Sh), sd + 17, { w: 4.5, ts: 3, te: 4, dry: 0 }); }
    }
    if (mid) mid();
    if (F.farFront) arm(F, M, 0, me, sd + 100);
    arm(F, M, 1, me, sd + 100);
    const Hc = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
    if (F.ticks) for (let i = 0; i < 5; i++) { const a = -Math.PI * (.2 + i * .15), [x0, y0] = Hc(a, 104), [x1, y1] = Hc(a, 130 + (i % 2) * 8); B_(xf(HD.seg([x0, y0], [x1, y1], 2), Sh), sd + 260 + i, { w: 6, ts: 3, te: 8, dry: 0 }); }
    if (F.sweat) for (const [x, y, k] of [[-72, -64, 0], [-88, -30, 1]]) { const dd = HD.spline(xf([[x, y - 14], [x + 6, y], [x + 4, y + 7], [x - 4, y + 7], [x - 6, y]], Sh), 2, true); whiteS(dd); B_(dd, sd + 270 + k, { w: 4, ts: 2, te: 2, mn: .7, dry: 0 }); }
    if (F.bang) { const b0 = xf([[30, -112], [24, -180]], Sh); brS(HD.seg(b0[0], b0[1], 2).reverse(), sd + 280, { w: 13, ts: 2, te: 26, mn: .2, dry: .2 });
      const dt = xf([[32, -96]], Sh)[0]; G.fillStyle = INK; G.beginPath(); G.arc(dt[0], dt[1], 7 * PZ, 0, TAU); G.fill(); }
    if (F.run > 0) for (let i = 0; i < 3; i++) { const y = -170 + i * 60, x0 = -86 - (i % 2) * 24;
      brS(xf(HD.seg([x0, y], [x0 - (70 + 70 * F.run), y], 3), mulM(CMX, HD.mat(F.hip[0], F.hip[1], 0, F.f * F.s, F.s))), sd + 290 + i, { w: 6.5, ts: 4, te: 30, mn: .2, col }); }
    G.restore();
  };

  /* ---------------- poses (fresh specs, world px) ---------------- */
  // walking at x on gy, phase ph (distance / stride), stride px, lean rad, foot lift px (> 30 = bounding hops)
  K.walkSpec = function (x, gy, s, f, ph, stride, lean, lift = 18) {
    const frac = K.frac, feet = [0, 1].map(i => { const p = frac(ph + i * .5); let off, up = 0;
      if (p < .58) off = stride * (.29 - p); else { const u = (p - .58) / .42; off = -.29 * stride + .58 * stride * eio(u); up = lift * Math.sin(Math.PI * u); }
      return [x + f * off, gy - up]; });
    const hop = lift > 30 ? lift * .5 * Math.abs(Math.sin(TAU * ph)) : 0;
    return { s, f, gy, hip: [x, gy - (HIPH - 7 * Math.abs(Math.cos(TAU * ph))) * s - hop], ang: f * lean, feet, hands: [null, null], hand: ['rest', 'rest'], tilt: 0, eye: 'dot', ph };
  };
  K.standSpec = function (x, gy, s, f, lean = .05) { return { s, f, gy, hip: [x, gy - HIPH * s], ang: f * lean, feet: [[x - f * 16 * s, gy], [x + f * 20 * s, gy]], hands: [null, null], hand: ['rest', 'rest'], tilt: 0, eye: 'dot' }; };
  /* kneeling / crouching at x: k 0 standing … 1 down on its haunches, bent right over the ground in front (hip drops
     32·s, body pitches .85 so the near paw reaches the ground ≈ 150·s ahead of x, head nods, eye 'down'); feet wider */
  K.crouchSpec = function (x, gy, s, f, k = 1) {
    const F = K.standSpec(x, gy, s, f, lerp(.05, .85, k));
    F.hip = [x + f * 4 * s * k, gy - (HIPH - 32 * k) * s]; F.feet = [[x - f * lerp(16, 30, k) * s, gy], [x + f * lerp(20, 34, k) * s, gy]]; F.tilt = .28 * k; F.eye = k > .5 ? 'down' : 'dot'; return F;
  };
  // looking up: head back, eye 'up' (k 0..1)
  K.lookUp = (F, k = 1) => { F.tilt = lerp(F.tilt || 0, -.3, k); if (k > .5) F.eye = 'up'; return F; };
  K.restHands = function (F) { const M = bearM(F); return [HD.pt(M, SHOULDER[0][0] + 18, SHOULDER[0][1] + 104), HD.pt(M, SHOULDER[1][0] + 18, SHOULDER[1][1] + 104)]; };
  // in-between two specs (k 0..1; ease it yourself). A change of facing shows the face-on drawing for k .1–.9
  K.mixSpec = function (A, Bs, k) {
    if (k <= 0) return A; if (k >= 1) return Bs;
    const l2 = (a, b) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], hA = K.restHands(A), hB = K.restHands(Bs), pick = k < .5 ? A : Bs;
    return { ...pick, s: lerp(A.s, Bs.s, k), gy: lerp(A.gy, Bs.gy, k), hip: l2(A.hip, Bs.hip), ang: lerp(A.ang, Bs.ang, k), feet: [l2(A.feet[0], Bs.feet[0]), l2(A.feet[1], Bs.feet[1])],
      hands: [0, 1].map(i => l2(A.hands[i] || hA[i], Bs.hands[i] || hB[i])), hand: pick.hand.slice(), tilt: lerp(A.tilt || 0, Bs.tilt || 0, k), front: A.f !== Bs.f && k > .1 && k < .9 };
  };
  // a turn with a squash: the hip dips 10·s at the middle of the turn (k 0..1, eased inside)
  K.turnSpec = function (A, Bs, k) { const e = eio(k), F = K.mixSpec(A, Bs, e); if (F === A || F === Bs) return F; return { ...F, hip: [F.hip[0], F.hip[1] + 10 * F.s * Math.sin(Math.PI * e)] }; };

  /* ---------------- long objects (X = { x, y (foot, u = 0), a }; u along, v across) ---------------- */
  K.cpt = (X, u, v = 0) => [X.x + Math.cos(X.a) * u - Math.sin(X.a) * v, X.y + Math.sin(X.a) * u + Math.cos(X.a) * v];
  K.rotAbout = function (X, pv, th) { const ox = X.x - pv[0], oy = X.y - pv[1]; return { ...X, x: pv[0] + ox * Math.cos(th) - oy * Math.sin(th), y: pv[1] + ox * Math.sin(th) + oy * Math.cos(th), a: X.a + th }; };
  K.mixX = (A, Bx, k, sw = .62) => k <= 0 ? A : k >= 1 ? Bx : { ...Bx, x: lerp(A.x, Bx.x, k), y: lerp(A.y, Bx.y, k), a: lerp(A.a, Bx.a, k), u0: Bx.u0, lie: k > sw ? Bx.lie : A.lie };
  /* ON THE SHOULDER: the object (width w) rests on the back shoulder at its point u = contact, foot trailing down behind;
     a0 = its angle facing right (≈ −1.05). gf / gn: grip distances below the contact for the far / near paw. */
  K.shoulder = function (F, a0, w, contact) {
    const T = HD.pt(bearM(F), ...CONTACT), a = F.f > 0 ? a0 : Math.PI - a0, d = [Math.cos(a), Math.sin(a)]; let n = [d[1], -d[0]]; if (n[1] > 0) n = [-n[0], -n[1]];
    return { x: T[0] + n[0] * w / 2 - d[0] * contact, y: T[1] + n[1] * w / 2 - d[1] * contact, a, contact, lie: false, gf: 30 * F.s, gn: 72 * F.s };
  };
  K.farU = X => X.contact - X.gf; K.nearU = X => Math.max((X.u0 || 0) + 12, X.contact - X.gn);
  // far paw over the shoulder on the beam (drawn over the back: F.carry), near paw lower down (or busy: held)
  K.gripCarry = function (F, X, held) { F.hands = [K.cpt(X, K.farU(X)), held ? null : K.cpt(X, K.nearU(X))]; F.hand = ['grip', 'grip']; F.carry = true; return F; };
  // IN FRONT: held across the belly with both paws, starting just behind the front and running forward; a = tilt
  K.holdFront = function (F, len, a = 0) { const c = HD.pt(bearM(F), 10, -70), aa = F.f > 0 ? a : Math.PI - a, d = [Math.cos(aa), Math.sin(aa)];
    const X = { x: c[0] - d[0] * 30 * F.s, y: c[1] - d[1] * 30 * F.s, a: aa, lie: true }; F.hands = [K.cpt(X, 110 * F.s), K.cpt(X, 60 * F.s)]; F.hand = ['grip', 'grip']; return X; };
  // UPRIGHT: planted like a staff beside the bear, the near paw on it at chest height
  K.holdUpright = function (F, len, lean = .06) { const X = { x: F.hip[0] + F.f * 96 * F.s, y: F.gy, a: -Math.PI / 2 + F.f * lean, lie: true };
    F.hands = [F.hands[0], K.cpt(X, F.gy - F.hip[1] + 100 * F.s)]; F.hand = [F.hand[0], 'grip']; return X; };
  // keep paw k on the object at (u, v); out of reach (118·s from the shoulder) → the OBJECT comes to the paw (returns moved X)
  K.attach = function (F, X, k, u, v = 0) {
    const sh = HD.pt(bearM(F), ...SHOULDER[k]), T = K.cpt(X, u, v), dx = T[0] - sh[0], dy = T[1] - sh[1], d = Math.hypot(dx, dy), Rr = 118 * F.s;
    if (d <= Rr) { F.hands[k] = T; return X; }
    const nT = [sh[0] + dx / d * Rr, sh[1] + dy / d * Rr]; F.hands[k] = nT; return { ...X, x: X.x + nT[0] - T[0], y: X.y + nT[1] - T[1] };
  };
  // a small thing held hanging at the side in the near paw (sw: swing px)
  K.hangGrip = (F, sw = 0) => { const R = HD.pt(bearM(F), ...SHOULDER[1]); return [R[0] + F.f * (40 + sw) * F.s, R[1] + 96 * F.s]; };

  /* ================================================================ words */
  /* hand-lettered captions (Hi Melody 86 px at y 410), inked twice (offset 1.2, .4) and jittered with the boil; a source
     after a closing ” is split: quote 48 px, reference 36 px. o.until: hide from that time on. */
  K.captions = function (ctx, t, lines, o = {}) {
    if (o.until != null && t >= o.until) return;
    const f = K.fd, size = o.size ?? 86, y = o.y ?? 410, L2 = lines.map(l => [l[0], l[1], l[2]]), st = { font: K.FONT, weight: 400, size, y, color: K.WORD, shadow: 'rgba(0,0,0,0)', shadowBlur: 0 };
    ctx.save(); ctx.translate([0, 1, -1][f], [0, -1, 1][f]);
    Story.captions(ctx, t, L2, st); ctx.translate(1.2, .4); Story.captions(ctx, t, L2, st);
    for (const [a, b, s, src] of lines) { if (!src) continue; const al = Pilot.win(t, a, b, .35, .45); if (al <= 0) continue;
      const n = s.split('\n').length, m = src.match(/^(.*”)\s*(.*)$/) || [0, src, ''], y0 = y + (n - 1) * size * 1.55 + 92;
      Pilot.text(ctx, m[1], W / 2, y0, { size: 48, font: K.FONT, color: K.WORD2, alpha: al }); if (m[2]) Pilot.text(ctx, m[2], W / 2, y0 + 54, { size: 36, font: K.FONT, color: K.WORD3, alpha: al }); }
    ctx.restore();
  };
  // the end card on plain paper, 1.3× round y 900, inked twice (fade the drawing with K.end(ctx, fade) first)
  K.endCard = function (ctx, t, card, at) {
    if (!card || t < at - .2) return;
    const k = 1.3, cy = 900; ctx.save(); ctx.setTransform(k, 0, 0, k, W / 2 - W / 2 * k + [0, 1, -1][K.fd], cy - cy * k + [0, -1, 1][K.fd]);
    const o = { font: K.FONT, srcFont: K.FONT, color: K.WORD, srcColor: K.WORD2, y: 840, titleShadow: '' };
    Story.endCard(ctx, t, card, at, o); ctx.translate(1, .4); Story.endCard(ctx, t, card, at, { ...o, srcColor: 'rgba(0,0,0,0)' });
    ctx.restore();
  };

  window.BrushLine = K;
})();

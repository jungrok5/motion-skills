/* kit-pendoodle.js — house style "pen doodle" for word-log films (global: window.PenDoodle).
   A black ballpoint doodle on warm off-white paper: thin semi-opaque pen lines that BOIL (3 drawings cycled on 8 fps),
   scribble-hatched round birds, rain falling on twos, puddle scribbles that ripple, hand-lettered words (Nanum Pen Script),
   and ONE colour: a yellow highlighter (the thing that matters, the light).
   Worked example: sermons/2026-10-24-cross-styles/film/scenes/cs-pendoodle.html (잘라 낸 건 다리였다 · 펜 낙서).
   Style card: styles/pendoodle/STYLE.md.

   HOW A FRAME IS MADE
     K.begin(ctx, t, cam)      paper onto the frame; picks the drawing (K.fd = 0..2, 8 fps); sets the camera; clears the
                               INK layer (white) and the HIGHLIGHTER layer (transparent)
     … draw: everything is drawn in SCREEN px into the ink layer (K.g) — world points go through K.toS (camera) — so the
       camera never scales the pen: K.penW(worldPts) / K.penS(screenPts); paper-white fills (K.whiteS) hide what's behind
       AND erase the highlighter under them; the highlighter (K.hiS / K.hiLine) goes on its own layer K.hl.
     K.end(ctx, fade)          ink drops out in the paper's valleys, then highlighter and ink are MULTIPLIED onto the paper
     K.captions(ctx, t, lines) / K.endCard(ctx, t, card, at)  hand-lettered words, jittered with the boil
   Units: frame px (1080×1920) for screen points; world px for K.toS / K.penW / figure specs (camera {x, y, z} looks at
   world (x, y) with zoom z, frame centre = W/2, H/2). Deterministic: seeded randomness only, nothing depends on draw
   order across frames, so any seek order gives the same frame. No network, no images. Load after lib.js and story.js. */
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
  K.INK = 'rgba(34,31,40,.9)';     // the pen: blue-black ballpoint, slightly see-through (lines darken where they cross)
  K.INKS = '#221f28';              // solid ink (pupils, dots)
  K.INKP = 'rgba(58,54,64,.72)';   // the quieter grey pen (other characters, background people)
  K.HL = '255,222,70';             // THE one colour: yellow highlighter (rgb, for `rgba(${K.HL},a)`), multiplied under the ink
  K.PAPER = [238, 231, 226];       // warm off-white paper (#eee7e2), mottled, embossed tooth, soft vignette
  K.WORD = '#25222b';              // hand-lettered captions; K.WORD2 / K.WORD3 for source lines
  K.WORD2 = '#3a3540'; K.WORD3 = '#55505a';
  K.FONT = "'Nanum Pen Script','Nanum Pen',cursive";
  K.FONTS = ["400 92px 'Nanum Pen Script'", "400 92px 'Nanum Pen'"];   // for Pilot.run({ fonts })
  K.FPS = 8;                       // drawings per second for the boil (3 drawings cycled)
  K.t12 = HD.t12;
  K.bf = t => Math.floor(t * 8 + 1e-6) % 3;   // which of the 3 boiled drawings is up at t
  K.frac = x => x - Math.floor(x);

  /* ================================================================ init: paper, tiles, layers (≈1.5 s) */
  K.TX = {};
  // scribble hatching tile: `passes` = [[angle rad, spacing px], …] of pen lines back and forth (alpha, line width lw)
  K.hatchTile = function (w, h, passes, alpha, seed, lw = 3.2) {
    const c = Pilot.canvas(w, h), g = c.getContext('2d'), r = rng(seed), cx = w / 2, cy = h / 2, R = Math.hypot(w, h) / 2 + 10;
    for (let p = 0; p < passes.length; p++) { const [a, sp] = passes[p], ca = Math.cos(a), sa = Math.sin(a);
      for (let s = -R; s < R; s += sp * (.8 + .5 * r())) { const p0 = [cx - ca * R - sa * s, cy - sa * R + ca * s], p1 = [cx + ca * R - sa * s, cy + sa * R + ca * s];
        HD.ink(g, HD.wob(HD.seg(p0, p1, 6), seed + p * 97 + (s * 3 | 0), 1.2, 30), { w: lw, ts: 3, te: 3, mn: .6, press: .25, seed: seed + 31 + (s | 0), col: `rgba(34,31,40,${alpha})` }); } }
    return c;
  };
  /* opts: { paper: HD.paper options, tooth: [seed, s1, s2, fibres], dropout: alpha of the ink dropout (.5) }
     Builds K.TX = { paper, drop, hMe[3] (dense scribble, the main character), hPil[3] (light hatch, others),
     hDense (near-black cross-hatch: holes, shadows), hLight (sparse vertical hatch: walls, far sides) } and the layers. */
  K.init = function (o = {}) {
    W = Pilot.W; H = Pilot.H; K.W = W; K.H = H;
    const T = HD.tooth(...(o.tooth || [3, 5, 1.8, 2500])), TX = K.TX;
    TX.paper = HD.paper(T, Object.assign({ base: K.PAPER, mott: 5, emb: 10, grain: 3, vig: .5, mscale: 300, tint: [2, 0, -2] }, o.paper || {}));
    TX.drop = HD.toothMask(T, '#ffffff', 'valley', .3, .12, .8);
    TX.hMe = [0, 1, 2].map(f => K.hatchTile(720, 720, [[-.9, 3.6], [.6, 4.2], [.1, 6]], .78, 600 + f * 13));
    TX.hPil = [0, 1, 2].map(f => K.hatchTile(640, 640, [[-.9, 7.5], [.6, 10]], .42, 700 + f * 13, 2.8));
    TX.hDense = K.hatchTile(512, 512, [[1.45, 3.4], [-.25, 4.2], [.75, 5.5]], .82, 800);
    TX.hLight = K.hatchTile(512, 512, [[1.5, 7], [1.2, 11]], .5, 820, 2.8);
    K.dropA = o.dropout ?? .5;
    buildRain(o.rain || {});
    const L1 = HD.layer(); K.INKL = L1; K.g = L1.g;
    TX.pLight = L1.g.createPattern(TX.hLight, 'repeat'); TX.gapC = Pilot.canvas(W, H); TX.gapG = TX.gapC.getContext('2d'); TX.pDense = TX.gapG.createPattern(TX.hDense, 'repeat');
    K.HLc = Pilot.canvas(W, H); K.hl = K.HLc.getContext('2d');
  };

  /* ================================================================ camera (world → screen) */
  K.cam = { x: 0, y: 1000, z: 1, sx: 0, sy: 0 }; K.M = null; K.pz = 1; K.fd = 0;
  // c = { x, y (world point at frame centre), z (zoom), sx, sy (shake px) }. K.pz = z^.45 — pens thicken a little on a push
  K.setCam = function (c) { K.cam = c; K.M = { a: c.z, b: 0, c: 0, d: c.z, e: W / 2 - c.x * c.z + (c.sx || 0), f: H / 2 - c.y * c.z + (c.sy || 0) }; K.pz = Math.pow(c.z, .45); };
  K.toS = p => [K.M.a * p[0] + K.M.e, K.M.d * p[1] + K.M.f];   // a world point → screen
  K.mixCam = (a, b, k) => k <= 0 ? a : k >= 1 ? b : { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
  // the hit shake: decaying jitter after t0 for d s → [sx, sy] px (assign to cam.sx / cam.sy)
  K.shake = (t, t0, d = .55, ax = 16, ay = 12) => { if (t < t0) return [0, 0]; const k = 1 - ss(t0, t0 + d, t); return [ax * k * Math.sin(t * 97), ay * k * Math.sin(t * 131 + 1)]; };

  /* ================================================================ frame */
  // start a frame: paper onto ctx, boil drawing index, camera, clear the ink (white) and highlighter (transparent) layers
  K.begin = function (ctx, t, cam) {
    K.fd = K.bf(t); K.setCam(cam);
    ctx.drawImage(K.TX.paper, 0, 0);
    HD.clearWhite(K.g); K.hl.clearRect(0, 0, W, H);
  };
  // finish: ink dropout in the paper valleys, then multiply highlighter and ink onto ctx (fade 0 → plain paper, for the end card)
  K.end = function (ctx, fade = 1) {
    HD.dropout(K.g, K.TX.drop, K.dropA);
    HD.multiply(ctx, K.HLc, 0, 0, W, H, fade); HD.multiply(ctx, K.INKL.c, 0, 0, W, H, fade);
  };

  /* ================================================================ the pen (all in screen px, into the ink layer K.g) */
  /* a pen line through screen points: static hand wobble (o.wob px) + this drawing's boil (o.boil px); width o.w (3.8)
     scaled by the push (K.pz) unless o.fix; o.raw = no wobble/boil (small precise marks); other o → HD.ink options */
  K.penS = function (pts, seed, o = {}) {
    if (!pts || pts.length < 2) return;
    const q = o.raw ? pts : HD.boil(HD.wob(pts, seed, o.wob ?? 1.5, 90), seed, K.fd, o.boil ?? 1.3, 60);
    HD.ink(K.g, q, { ts: 5, te: 9, mn: .45, press: .22, pw: 50, rough: .1, seed, col: K.INK, ...o, w: (o.w ?? 3.8) * (o.fix ? 1 : K.pz) });
  };
  K.penW = (pts, seed, o) => K.penS(pts.map(K.toS), seed, o);   // the same, world points
  K.pathS = function (g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath(); };
  // paper-white fill of a screen shape: hides the ink behind it AND removes the highlighter under it
  K.whiteS = function (pts) { const G = K.g, HL = K.hl; G.fillStyle = '#fff'; K.pathS(G, pts); G.fill();
    HL.save(); HL.globalCompositeOperation = 'destination-out'; HL.globalAlpha = 1; HL.fillStyle = '#000'; K.pathS(HL, pts); HL.fill(); HL.restore(); };
  // scribble-hatch a screen shape with a tile centred on (ax, ay) — anchor it to the object so the hatching moves with it
  K.hatchS = function (pts, tile, ax, ay) { const G = K.g; G.save(); K.pathS(G, pts); G.clip(); G.drawImage(tile, Math.round(ax - tile.width / 2), Math.round(ay - tile.height / 2)); G.restore(); };
  // highlighter: fill a screen shape / stroke a screen polyline (width w px) — alpha a, colour rgb (default the yellow)
  K.hiS = function (pts, a = .5, rgb = K.HL) { K.hl.fillStyle = `rgba(${rgb},${a})`; K.pathS(K.hl, pts); K.hl.fill(); };
  K.hiLine = function (pts, w, a = .3, rgb = K.HL) { const HL = K.hl; HL.save(); HL.strokeStyle = `rgba(${rgb},${a})`; HL.lineWidth = w; HL.lineCap = 'round'; HL.lineJoin = 'round';
    HL.beginPath(); HL.moveTo(pts[0][0], pts[0][1]); for (const p of pts) HL.lineTo(p[0], p[1]); HL.stroke(); HL.restore(); };
  K.rotAboutM = (cx, cy, a) => HD.mul(HD.mat(cx, cy, a), HD.mat(-cx, -cy));
  // a dashed pen outline (white-out dashes that crawl along at 18 px/s) through screen pts — "the missing piece", a guide
  K.dashed = function (pts, t, seed = 4200, o = {}) {
    const Ls = HD.lengths(pts); let seg = [], on = true, nxt = 15; const st = { w: 5.2, ts: 2, te: 2, mn: .7, wob: .5, boil: .5, col: '#fff', ...o };
    for (let i = 0; i < pts.length; i++) { const s = Ls[i] + (t * 18 % 24); if (s > nxt) { if (on && seg.length > 1) K.penS(seg, seed + i, st); on = !on; nxt += on ? 15 : 9; seg = []; } if (on) seg.push(pts[i]); }
    if (on && seg.length > 1) K.penS(seg, seed - 1, st);
  };
  // emphasis ticks on an ellipse round screen point c: n ticks from angle a0 stepping da, radii rx×ry scaled r0→r1 (k1 extra y)
  K.ticks = function (c, rx, ry, n, a0, da, r1, seed, o = {}) {
    for (let i = 0; i < n; i++) { const a = a0 + i * da, rr = r1 + (o.alt ? o.alt * (i % 2) : 0);
      K.penS(HD.seg([c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry], [c[0] + Math.cos(a) * rx * rr, c[1] + Math.sin(a) * ry * rr * (o.ky || 1)], 2), seed + i, { w: 3, ...o }); }
  };
  // THE HIT: a white-haloed scribbled burst of n rays round world point c, for d s after t0 (reads on dark hatching too)
  K.hit = function (t, t0, c, o = {}) {
    const d = o.d ?? .45, n = o.n ?? 11, seed = o.seed ?? 4800; if (t < t0 || t >= t0 + d) return;
    const k = (t - t0) / d;
    for (let i = 0; i < n; i++) { const a = -Math.PI * (.05 + i * .09), r0 = 50 + 120 * eo(k), r1 = r0 + 40 * (1 - k) + 14;
      const sg = HD.seg([c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0 * .8], [c[0] + Math.cos(a) * r1, c[1] + Math.sin(a) * r1 * .8], 2);
      K.penW(sg, seed + i, { w: 11, ts: 3, te: 10, col: '#fff' }); K.penW(sg, seed + i, { w: 4.2, ts: 3, te: 10 }); }
  };
  /* little pen specks thrown up (sawdust, dirt, splinters): list of { t0, x, y, vx, vy (px/s), land (y where it lands),
     r0, vr (spin), sz (half-length px), seed }, gravity 700 px/s², fading 1.0–1.6 s after t0. World px. */
  K.specks = function (list, t) {
    const G = K.g;
    for (const q2 of list) { const u = t - q2.t0; if (u < 0) continue; const al = 1 - ss(q2.t0 + 1.0, q2.t0 + 1.6, t); if (al <= 0) continue;
      const tl = (-q2.vy + Math.sqrt(q2.vy * q2.vy + 4 * 700 * (q2.land - q2.y))) / 1400, uu = Math.min(u, Math.max(0, tl));
      const x = q2.x + q2.vx * uu, y = q2.y + q2.vy * uu + 700 * uu * uu, r = q2.r0 + q2.vr * uu;
      G.save(); G.globalAlpha = al; K.penW([[x - Math.cos(r) * q2.sz, y - Math.sin(r) * q2.sz], [x + Math.cos(r) * q2.sz, y + Math.sin(r) * q2.sz]], q2.seed, { w: 3, ts: 1, te: 2, mn: .5 }); G.restore(); }
  };

  /* ================================================================ weather + ground */
  let DROPS = [];
  function buildRain(o) { const r = rng(o.seed ?? 4242), n = o.n ?? 140; DROPS = []; for (let i = 0; i < n; i++) DROPS.push({ x: 20 + r() * 1040 * W / 1080, y0: r() * 2000, v: 1300 + r() * 500, len: 30 + r() * 60, depth: Math.pow(r(), .7), seed: 3000 + i }); }
  /* rain on twos: pen dashes falling to a floor that recedes with depth (world y = top + depth·deep, default the road).
     o = { a (alpha), keep: screen boxes [x0,y0,x1,y1] round figures' legs (dashes there read as extra legs — use
     K.keepBox(F)), hole: a screen rect [x,y,w,h] left dry round the words (K.capRect), top, deep } */
  K.rain = function (t, o = {}) {
    const q = HD.t12(t), a = o.a ?? 1, keep = o.keep || [], top = o.top ?? 1080, deep = o.deep ?? 460, g = K.g;
    g.save(); if (o.hole) { const cl = new Path2D(); cl.rect(0, 0, W, H); cl.rect(...o.hole); g.clip(cl, 'evenodd'); }
    for (const d of DROPS) { const floor = K.toS([0, top + d.depth * deep])[1], span = floor + 120, y = ((d.y0 + d.v * q) % Math.max(200, span)) - 120; if (y + d.len < 40) continue;
      let y1 = Math.min(y + d.len, floor), skip = false;
      for (const [x0, y0, x1, yb] of keep) if (d.x > x0 && d.x < x1 && y1 > y0 && y < yb) { if (y < y0 - 8) y1 = y0; else skip = true; }
      if (skip || y1 - y < 8) continue;
      K.penS(HD.seg([d.x, y], [d.x - 1.5, y1], 6), d.seed, { w: 3.1, ts: 4, te: 12, mn: .3, wob: .6, boil: .6, fix: true, col: a < 1 ? `rgba(34,31,40,${.9 * a})` : K.INK }); }
    g.restore();
  };
  // the screen box round a figure's legs, for K.rain({ keep })
  K.keepBox = F => { const a = K.toS([F.hip[0] - 80 * F.s, F.hip[1]]), b = K.toS([F.hip[0] + 80 * F.s, Math.max(F.feet[0][1], F.feet[1][1]) + 16]); return [a[0], a[1], b[0], b[1]]; };
  /* the ground: scattered puddle scribbles — (‿), dashes, waves, cups, ticks — that ripple through 3 states on 4 fps.
     o = { x0, x1 (world span), top (far edge y), deep (560: band depth), per (marks per px: 560/2900), seed, skip(x,y) } */
  K.puddles = function (o = {}) {
    const r = rng(o.seed ?? 77), x0 = o.x0 ?? -1700, x1 = o.x1 ?? 3000, top = o.top ?? 1100, deep = o.deep ?? 560, n = Math.round((x1 - x0) * (o.per ?? 560 / 2900)), M = [];
    for (let i = 0; i < n; i++) {
      const depth = Math.pow(r(), .85), y = top + 14 + depth * deep, x = x0 + r() * (x1 - x0), ty = r();
      if (o.skip && o.skip(x, y)) continue;
      M.push({ x, y, s: .6 + .7 * depth, type: ty < .36 ? 'paren' : ty < .62 ? 'dash' : ty < .8 ? 'wave' : ty < .9 ? 'cup' : 'tick', seed: 1000 + i, ph: Math.floor(r() * 3), len: 10 + r() * 22 });
    }
    M.sort((a, b) => a.x - b.x); return M;
  };
  function drawMark(m, k) {
    const [x, y] = K.toS([m.x, m.y]); if (x < -60 || x > W + 60 || y < -40 || y > H + 40) return;
    const s = m.s * K.cam.z, sd = m.seed, o = { w: 3.1, fix: true }, penS = K.penS;
    if (m.type === 'paren') { const rr = (7 + 4 * k) * s;
      penS(HD.arc(x - rr * .9, y, rr * .7, rr * .45, Math.PI * .6, Math.PI * 1.4, 2), sd, o); penS(HD.arc(x + rr * .9, y, rr * .7, rr * .45, -Math.PI * .4, Math.PI * .4, 2), sd + 1, o);
      if (k > 0) penS(HD.seg([x - rr * .25, y + rr * .1], [x + rr * .3, y + rr * .1], 2), sd + 2, o); }
    else if (m.type === 'dash') { const l = m.len * s * (1 + .15 * k); penS(HD.seg([x - l / 2, y], [x + l / 2, y + 1], 3), sd, o); if (k === 2) penS(HD.seg([x + l / 2 + 8, y], [x + l / 2 + 14, y], 2), sd + 1, o); }
    else if (m.type === 'wave') { const l = (16 + 3 * k) * s, pts = []; for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([x - l + 2 * l * u, y + Math.sin(u * TAU * 1.5 + k) * 3 * s]); } penS(pts, sd, o); }
    else if (m.type === 'cup') { const rr = (6 + 2 * k) * s; penS(HD.arc(x, y - rr * .3, rr, rr * .6, Math.PI * .1, Math.PI * .9, 2), sd, o); }
    else { penS(HD.seg([x, y - 7 * s], [x + 1, y + 2], 2), sd, o); penS(HD.seg([x + 7 * s, y - 5 * s], [x + 7 * s, y + 2], 2), sd + 1, o); }
  }
  // draw the puddle marks in view (they ripple on 4 fps)
  K.drawPuddles = function (marks, t) {
    const q = HD.t12(t), vx0 = K.cam.x - 600 / K.cam.z, vx1 = K.cam.x + 600 / K.cam.z;
    for (const m of marks) { if (m.x < vx0) continue; if (m.x > vx1) break; drawMark(m, (Math.floor(q * 4) + m.ph) % 3); }
  };

  /* ================================================================ world pieces */
  /* a GAP: an oval hole in the road (super-ellipse, ragged), seen in perspective — sparse hatching just under the far lip,
     dense hatching deepening to black toward the near lip. o = { cx, top (far lip y), bottom (near lip y), half (half
     width), seed (71) } → hole { poly, near, far, … } (world px). Draw with K.drawGap(hole, anchor). */
  K.gap = function (o) {
    const r = rng(o.seed ?? 71), cx = o.cx, cy = (o.top + o.bottom) / 2, a = o.half, b = (o.bottom - o.top) / 2, n = 2.6, pts = [];
    for (let i = 0; i < 72; i++) { const th = i / 72 * TAU, c = Math.cos(th), sn = Math.sin(th);
      pts.push([cx + a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n) + (r() - .5) * 5, cy + b * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n) + (r() - .5) * 4]); }
    const near = pts.slice(0, 37), far = pts.slice(36).concat([pts[0]]);
    const G = { poly: pts, near, far, cracks: [], road: [], cx, cy, a, b, top: o.top, bottom: o.bottom };
    for (let k = 0; k < 9; k++) G.cracks.push([cx + (r() - .5) * (a - 8) * 2 * .7, o.top + 16 + r() * 8, 18 + r() * 30]);
    for (let k = 0; k < 10; k++) { const side = k % 2 ? 1 : -1, y = cy + (r() - .5) * b * 1.2, x = cx + side * (a + 2), d = side;
      G.road.push([[x, y], [x + d * (14 + r() * 20), y + (r() - .5) * 10], [x + d * (30 + r() * 30), y + (r() - .5) * 16]]); }
    return G;
  };
  // draw a gap; anchor = a world point the hatching is pinned to (so it doesn't swim with the camera); seed base 4000
  K.drawGap = function (G, anchor, seed = 4000) {
    const P = G.poly.map(K.toS), o = K.toS(anchor), g = K.g, TX = K.TX, penS = K.penS, toS = K.toS;
    K.whiteS(P);
    TX.pLight.setTransform(new DOMMatrix([1, 0, 0, 1, Math.round(o[0]) + K.fd * 29, Math.round(o[1]) + K.fd * 17])); g.fillStyle = TX.pLight; K.pathS(g, P); g.fill();
    const hg = TX.gapG; hg.globalCompositeOperation = 'source-over'; hg.clearRect(0, 0, W, H);
    TX.pDense.setTransform(new DOMMatrix([1, 0, 0, 1, Math.round(o[0]) + K.fd * 37, Math.round(o[1]) + K.fd * 23])); hg.fillStyle = TX.pDense; K.pathS(hg, P); hg.fill();
    const yA = toS([0, G.top + 6])[1], yB = toS([0, G.bottom - 10])[1], gr = hg.createLinearGradient(0, yA, 0, yB);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.42, 'rgba(0,0,0,.8)'); gr.addColorStop(.62, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    hg.globalCompositeOperation = 'destination-in'; hg.fillStyle = gr; hg.fillRect(0, 0, W, H); hg.globalCompositeOperation = 'source-over';
    g.drawImage(TX.gapC, 0, 0);
    for (const [x, y, l] of G.cracks) penS([toS([x, y]), toS([x + 3, y + l])], seed + 10 + (x | 0), { w: 2.6, col: 'rgba(34,31,40,.55)' });
    penS(G.far.map(toS), seed + 3, { w: 3.6 });
    penS(G.far.slice(6, -6).map(p => toS([p[0], p[1] + 12])), seed + 4, { w: 2.4, col: 'rgba(34,31,40,.6)' });
    penS(G.near.map(toS), seed + 5, { w: 5.2 });
    G.road.forEach((cr, i) => penS(cr.map(toS), seed + 60 + i, { w: 2.8 }));
  };
  /* a lit DOORWAY: a plain arch (outer r, inner rr) with brick ticks, two leaves ajar, highlighter light in the opening,
     rays fanning onto the ground, reflection dashes, emphasis ticks. o = { x (centre), gy (ground y), ay (arch centre y),
     r: 104, rr: 82, seed: 4100, light: 0..1 } (world px) */
  K.doorway = function (t, o) {
    const gy = o.gy, x = o.x, ay = o.ay, r = o.r ?? 104, rr = o.rr ?? 82, sd = o.seed ?? 4100, lt = o.light ?? 1, toS = K.toS, penS = K.penS, z = K.cam.z;
    const arc = (rad, a0, a1) => { const p = []; for (let i = 0; i <= 40; i++) { const a = a0 + (a1 - a0) * i / 40; p.push([x + Math.cos(a) * rad, ay + Math.sin(a) * rad]); } return p; };
    const inner = [[x - rr, gy], ...arc(rr, Math.PI, TAU), [x + rr, gy]].map(toS);
    if (lt > 0) { K.hiS(inner, .62 * lt); const fl = .9 + .1 * Math.sin(t * 3.1);
      for (let i = 0; i < 7; i++) { const u = (i + .5) / 7, xb = x - 300 + u * 600; K.hiLine([toS([x - 50 + u * 100, gy - 10]), toS([xb, gy + 90 + Math.abs(u - .5) * 40])], 26 * z, .14 * fl * lt); }
      for (let i = 0; i < 4; i++) { const y = gy + 40 + i * 40, w2 = 140 - i * 26; K.hiLine(HD.seg(toS([x - w2 / 2, y]), toS([x + w2 / 2, y + 2]), 6), 11 * z, .3 * lt); } }
    const outer = [[x - r, gy], ...arc(r, Math.PI, TAU), [x + r, gy]];
    const ring = outer.concat([[x + rr, gy], ...arc(rr, TAU, Math.PI), [x - rr, gy]].map(p => p)).map(toS);
    K.whiteS(ring); penS(outer.map(toS), sd + 1, { w: 4.2 }); penS([[x + rr, gy], ...arc(rr, TAU, Math.PI), [x - rr, gy]].map(toS), sd + 2, { w: 3.8 });
    for (let i = 0; i < 13; i++) { const a = Math.PI + Math.PI * (i + .5) / 13; penS(HD.seg(toS([x + Math.cos(a) * rr, ay + Math.sin(a) * rr]), toS([x + Math.cos(a) * r, ay + Math.sin(a) * r]), 2), sd + 10 + i, { w: 2.6 }); }
    for (let y = ay + 30; y < gy - 20; y += 34) for (const s of [-1, 1]) penS(HD.seg(toS([x + s * rr, y]), toS([x + s * r, y]), 2), sd + 30 + y + s, { w: 2.6 });
    for (const s of [-1, 1]) { const leaf = [[x + s * rr, gy], [x + s * (rr + 46), gy + 14], [x + s * (rr + 46), ay + 6], [x + s * rr, ay - 26]].map(toS);
      K.whiteS(leaf); penS(leaf.concat([leaf[0]]), sd + 50 + s, { w: 3.4 }); penS(HD.seg(toS([x + s * (rr + 34), (gy + ay) / 2]), toS([x + s * (rr + 34), (gy + ay) / 2 + 10]), 2), sd + 55 + s, { w: 4 }); }
    if (lt > 0) for (let i = 0; i < 11; i++) { const a = Math.PI * (1.05 + i * .09), r0 = r + 14, r1 = r + 34 + (i % 2) * 10; penS(HD.seg(toS([x + Math.cos(a) * r0, ay + Math.sin(a) * r0]), toS([x + Math.cos(a) * r1, ay + Math.sin(a) * r1]), 2), sd + 70 + i, { w: 3.2 }); }
  };
  // an unlit street lamp standing at world x on `base` (380 px tall), seed sd
  K.lamp = function (x, base, sd) {
    const top = base - 380, P = K.toS, o = { w: 3.6 }, penS = K.penS;
    penS(HD.seg(P([x - 7, base]), P([x - 5, top]), 5), sd, o); penS(HD.seg(P([x + 7, base]), P([x + 6, top]), 5), sd + 1, o);
    penS(HD.poly([P([x - 15, base]), P([x - 13, base - 30]), P([x + 14, base - 30]), P([x + 15, base])]), sd + 2, o);
    penS(HD.seg(P([x - 26, top]), P([x + 26, top]), 3), sd + 3, o);
    const Lp = [[x - 20, top - 4], [x - 28, top - 60], [x + 28, top - 60], [x + 20, top - 4]].map(P); K.whiteS(Lp); penS(HD.poly(Lp, true), sd + 4, o);
    penS(HD.seg(P([x, top - 6]), P([x, top - 58]), 3), sd + 5, { w: 2.6 }); penS(HD.seg(P([x - 25, top - 33]), P([x + 25, top - 33]), 3), sd + 6, { w: 2.6 });
    penS(HD.poly([P([x - 37, top - 60]), P([x, top - 90]), P([x + 37, top - 60])]), sd + 7, o);
    for (let y = top + 30; y < base - 40; y += 16) penS(HD.seg(P([x + 1, y]), P([x + 6, y - 5]), 2), sd + 10 + y, { w: 2.2 });
  };

  /* ================================================================ THE FIGURE: a round doodled bird
     Local coordinates (y down): hip/body centre at 0,0; feet stand at y = HIPH (72); head centre (16,-78); beak points +x.
     A figure spec F (world px):
       { kind: 'me' (dense black scribble, the viewer's stand-in) | anything else (light grey hatch, quieter),
         id (seed offset for others), seed?, s (scale; 1.6 for "me" at FY 1300, 1.28 for others), f (+1 faces right, −1 left),
         gy (ground y), hip [x, y], ang (body lean, rad; f·lean), feet [[far], [near]] (world points — 2-bone legs, fixed bones),
         hands [far, near] (world points the wingtips reach to; null = rest), hand ['rest'|'grip'|'flat'|'open', …],
         tilt (head nod, rad, + = down), eye 'calm'|'strain'|'happy'|'shock'|'down'|'up', look [dx, dy] (pupil),
         front (face-on head, mid-turn), farFront (far wing drawn in front), alpha,
         ticks (worry ticks), sweat, bang ("!"), run (0..1 speed lines), strap (a strap for something carried on the back) }
     Arms (wings) come from fixed shoulder roots (WROOT), reach ≤ 1.2× 74·s; the wingtip feathers are drawn AT the grip
     point; a target out of reach is clamped (use K.attach to bring the object to the hand instead). */
  const BODYL = HD.spline([[-12, -56], [26, -40], [40, -8], [24, 24], [-10, 32], [-44, 18], [-78, 2], [-50, -26]], 2.5, true);
  const HEADL = HD.arc(16, -78, 40, 38, 0, TAU, 2.5);
  const WROOT = [[-10, -22], [4, -12]], CONTACT = [-32, -58], NECK = [6, -46], HIPH = 72;
  K.BIRD = { WROOT, CONTACT, NECK, HIPH, REACH: 74 };
  // the figure's local→world matrix
  K.birdM = function (F) { const c = Math.cos(F.ang), s = Math.sin(F.ang); return { a: c * F.f * F.s, b: s * F.f * F.s, c: -s * F.s, d: c * F.s, e: F.hip[0], f: F.hip[1] }; };
  const birdM = K.birdM;
  function wing(F, M, k, me, sd) {
    const toS = K.toS, G = K.g, TX = K.TX, FD = K.fd, PZ = K.pz;
    const R = HD.pt(M, ...WROOT[k]), reach = 74 * F.s;
    let T = F.hands[k] || HD.pt(M, WROOT[k][0] + 8, WROOT[k][1] + 48);
    let dx = T[0] - R[0], dy = T[1] - R[1], len = Math.hypot(dx, dy) || 1;
    if (len > reach * 1.2) { T = [R[0] + dx / len * reach * 1.2, R[1] + dy / len * reach * 1.2]; len = reach * 1.2; }
    const u = [dx / Math.hypot(dx, dy), dy / Math.hypot(dx, dy)], p = [-u[1], u[0]], s = F.s, sg = F.f * (u[0] >= 0 ? 1 : -1);
    const bend = Math.max(0, reach - len) * .35 * sg, at = (a, b) => [R[0] + u[0] * a + p[0] * b, R[1] + u[1] * a + p[1] * b];
    const wr = 13 * s, wm = 11 * s, wt = 6 * s;
    const shape = HD.spline([at(-4 * s, wr), at(len * .5, wm + bend), at(len - 5 * s, wt), at(len + 3 * s, 0), at(len - 5 * s, -wt), at(len * .5, -wm + bend), at(-4 * s, -wr), at(-10 * s, 0)], 3, true);
    const scr = HD.boil(shape.map(toS), sd + k * 11, FD, 1, 40);
    HD.ink(G, scr, { w: 13 * PZ, ts: 2, te: 2, mn: .9, press: 0, rough: 0, seed: 1, col: '#fff' });   // a paper-white rim keeps the wing readable on the body
    K.whiteS(scr); K.hatchS(scr, me ? TX.hMe[(FD + 1) % 3] : TX.hPil[(FD + 1) % 3], ...toS(F.hip));
    HD.ink(G, scr, { w: (me ? 3.8 : 3.2) * PZ, ts: 4, te: 4, mn: .7, press: .2, seed: sd + 2 + k, col: me ? K.INK : K.INKP });
    const ty = (F.hand && F.hand[k]) || 'rest', fl = 11 * s;
    const fing = ty === 'open' ? [-.9, -.3, .3, .9] : ty === 'flat' ? [-.2, 0, .2] : ty === 'grip' ? [-1.3, -.6, .1] : [-.35, 0, .35];
    fing.forEach((a, i) => { const c = Math.cos(a), sn = Math.sin(a), dir = [u[0] * c - p[0] * sn * sg, u[1] * c - p[1] * sn * sg];
      const e = [T[0] + dir[0] * fl, T[1] + dir[1] * fl], m = ty === 'grip' ? [T[0] + dir[0] * fl * .6 + p[0] * sg * 6 * s, T[1] + dir[1] * fl * .6 + p[1] * sg * 6 * s] : [(T[0] + e[0]) / 2, (T[1] + e[1]) / 2];
      K.penS(HD.spline([T, m, e], 2).map(toS), sd + 30 + k * 7 + i, { w: me ? 3.6 : 3, ts: 3, te: 6, mn: .5, col: me ? K.INK : K.INKP }); });
    if (ty === 'grip') K.penS(HD.spline([at(len - 3 * s, -wt * sg), at(len + 7 * s, -9 * s * sg), at(len + 13 * s, -2 * s * sg)], 2).map(toS), sd + 50 + k, { w: 3.6, ts: 3, te: 6, mn: .5, col: me ? K.INK : K.INKP });
  }
  function leg(F, M, k, sd, col) {   // 2-bone leg, bones LL/2 each: the heel joint bends backwards
    const toS = K.toS, R = HD.pt(M, k ? 8 : -8, 26), Ft = F.feet[k], LL = 52 * F.s, d = Math.hypot(Ft[0] - R[0], Ft[1] - R[1]);
    const bend = Math.sqrt(Math.max(0, (LL / 2) ** 2 - (d / 2) ** 2)), ux = (Ft[0] - R[0]) / (d || 1), uy = (Ft[1] - R[1]) / (d || 1);
    let px = -uy, py = ux; if (px * F.f > 0) { px = -px; py = -py; }
    const mid = [(R[0] + Ft[0]) / 2 + px * bend, (R[1] + Ft[1]) / 2 + py * bend];
    K.penS(HD.spline([R, mid, Ft], 2).map(toS), sd, { w: 3.6, mn: .7, col });
    const lift = F.gy - Ft[1] > 8 ? .5 : 0;
    for (const a of [-.5, .15, .7]) { const aa = a + lift; K.penS(HD.seg(toS(Ft), toS([Ft[0] + F.f * Math.cos(aa) * 13 * F.s, Ft[1] + Math.sin(aa) * 5 * F.s + 2]), 2), sd + 3 + (a * 10 | 0), { w: 3, mn: .5, col }); }
    K.penS(HD.seg(toS(Ft), toS([Ft[0] - F.f * 8 * F.s, Ft[1] + 1]), 2), sd + 9, { w: 2.8, mn: .5, col });
  }
  /* draw a figure. back(): called first (things BEHIND the body — e.g. a long object carried on the back);
     mid(): called after the body/head, before the near wing (things held IN FRONT of the body, under the near wing) */
  K.drawBird = function (F, back, mid) {
    const al = F.alpha ?? 1; if (al <= 0) return;
    const G = K.g, TX = K.TX, FD = K.fd, PZ = K.pz, toS = K.toS, penS = K.penS, xf = HD.xf, mulM = HD.mul, CMX = K.M, INKS = K.INKS, pathS = K.pathS, whiteS = K.whiteS, hatchS = K.hatchS, rotAboutM = K.rotAboutM;
    const me = F.kind === 'me', sd = F.seed ?? (me ? 500 : 600 + F.id * 70), col = me ? K.INK : K.INKP;
    G.save(); G.globalAlpha = al;
    const M = birdM(F), S = mulM(CMX, M), Mh = mulM(M, rotAboutM(NECK[0], NECK[1], F.tilt || 0)), Sh = mulM(CMX, Mh), hipS = toS(F.hip);
    if (back) back();
    if (!F.farFront) wing(F, M, 0, me, sd + 100);
    leg(F, M, 0, sd + 200, col); leg(F, M, 1, sd + 220, col);
    for (const [a, b, c, d] of [[-76, 0, -98, -8], [-74, 6, -100, 6]]) penS(xf(HD.seg([a, b], [c, d], 2), S), sd + 240 + a, { w: 3.4, ts: 3, te: 6, mn: .4, col });   // tail
    const body = HD.boil(xf(BODYL, S), sd + 1, FD, 1.3, 50);
    whiteS(body); hatchS(body, me ? TX.hMe[FD] : TX.hPil[FD], ...hipS);
    HD.ink(G, body, { w: (me ? 4 : 3.4) * PZ, ts: 4, te: 4, mn: .7, press: .2, seed: sd + 2, col });
    const head = HD.boil(xf(HEADL, Sh), sd + 3, FD, 1.2, 40);
    whiteS(head); hatchS(head, me ? TX.hMe[FD] : TX.hPil[FD], ...hipS);
    HD.ink(G, head, { w: (me ? 4 : 3.4) * PZ, ts: 4, te: 4, mn: .7, press: .2, seed: sd + 4, col });
    const eye = F.eye || 'calm', er = eye === 'shock' ? 19 : 17, ec = [26, -84];
    if (F.front) {   // turning: a face-on head for a beat (two eyes, the beak pointing at us)
      const Sf = mulM(CMX, mulM(HD.mat(F.hip[0], F.hip[1], F.ang, F.s, F.s), rotAboutM(NECK[0], NECK[1], F.tilt || 0)));
      for (const ex of [2, 30]) { const dd = xf(HD.arc(ex, -84, 13, 13, 0, TAU, 2), Sf); whiteS(dd); penS(dd, sd + 5 + ex, { w: 3.2, raw: true, ts: 3, te: 3, mn: .7, col });
        G.fillStyle = INKS; pathS(G, xf(HD.arc(ex, -82, 5.5, 5.5, 0, TAU, 2), Sf)); G.fill(); }
      const bk = xf(HD.poly([[8, -72], [24, -72], [16, -56]], true, 2), Sf); whiteS(bk); penS(bk, sd + 11, { w: 3.6, raw: true, ts: 3, te: 3, mn: .7, col });
    } else {
      const disc = HD.boil(xf(HD.arc(ec[0], ec[1], er, er, 0, TAU, 2), Sh), sd + 5, FD, .8, 20);
      whiteS(disc); penS(disc, sd + 6, { w: 3.4, raw: true, ts: 3, te: 3, mn: .7, col });
      const lk = F.look || (eye === 'down' ? [1, 8] : eye === 'up' ? [3, -7] : [5, 3]);
      if (eye === 'strain') { penS(xf(HD.poly([[18, -93], [31, -85], [18, -77]], false, 2), Sh), sd + 7, { w: 3.6, col }); }
      else if (eye === 'happy') { penS(xf(HD.arc(ec[0], ec[1] + 5, 10, 9, Math.PI * 1.1, Math.PI * 1.9, 2), Sh), sd + 7, { w: 3.6, col }); }
      else { const pr = eye === 'shock' ? 4.5 : 7.5, pc = [ec[0] + lk[0], ec[1] + lk[1]];
        G.fillStyle = INKS; pathS(G, HD.boil(xf(HD.arc(pc[0], pc[1], pr, pr, 0, TAU, 2), Sh), sd + 8, FD, .5, 10)); G.fill();
        if (eye === 'down') penS(xf(HD.seg([10, -88], [42, -86], 2), Sh), sd + 9, { w: 3.2, col }); }
      const beak = HD.boil(xf(HD.poly([[54, -84], [92, -78], [55, -70]], true, 2), Sh), sd + 10, FD, .8, 20);
      whiteS(beak); penS(beak, sd + 11, { w: 3.8, raw: true, ts: 3, te: 3, mn: .7, col }); }
    if (F.strap) {   // the strap that holds a long object on the back: a loop round it at CONTACT, a band round the chest
      for (const pts of [xf(HD.arc(-36, -64, 9, 17, 0, TAU, 2), S), xf(HD.spline([[-38, -58], [-6, -30], [28, -6], [24, 20]], 3), S)]) {
        HD.ink(G, pts, { w: 12 * PZ, ts: 2, te: 2, mn: .9, press: .1, rough: .05, seed: sd + 300, col });
        HD.ink(G, pts, { w: 5.5 * PZ, ts: 2, te: 2, mn: .9, press: 0, rough: 0, seed: sd + 301, col: '#fff' }); } }
    if (mid) mid();
    if (F.farFront) wing(F, M, 0, me, sd + 100);
    wing(F, M, 1, me, sd + 100);
    if (F.ticks) for (let i = 0; i < 6; i++) { const a = -Math.PI * (.18 + i * .13), r0 = 60, r1 = 74 + (i % 2) * 6;
      penS(xf(HD.seg([16 + Math.cos(a) * r0, -84 + Math.sin(a) * r0], [16 + Math.cos(a) * r1, -84 + Math.sin(a) * r1], 2), Sh), sd + 260 + i, { w: 3.2, col }); }
    if (F.sweat) for (const [x, y, k] of [[-30, -104, 0], [-38, -86, 1]]) { const dr = xf([[x, y - 9], [x + 4, y - 1], [x + 3, y + 4], [x - 3, y + 4], [x - 4, y - 1]], Sh), dd = HD.spline(dr, 2, true);
      whiteS(dd); penS(dd, sd + 270 + k, { w: 2.8, ts: 2, te: 2, mn: .7, col }); }
    if (F.bang) { const b0 = xf([[18, -150], [14, -196]], Sh); penS(HD.seg(b0[0], b0[1], 2).reverse(), sd + 280, { w: 7, ts: 2, te: 16, mn: .25 });
      const dt = xf([[19, -138]], Sh)[0]; G.fillStyle = INKS; G.beginPath(); G.arc(dt[0], dt[1], 4.5 * PZ, 0, TAU); G.fill(); }
    if (F.run > 0) for (let i = 0; i < 4; i++) { const y = -96 + i * 30, x0 = -96 - (i % 2) * 18;
      penS(xf(HD.seg([x0, y], [x0 - (60 + 60 * F.run), y], 3), mulM(CMX, HD.mat(F.hip[0], F.hip[1], 0, F.f * F.s, F.s))), sd + 290 + i, { w: 3, ts: 3, te: 14, mn: .3, col }); }
    G.restore();
  };

  /* ---------------- poses (all return a fresh spec; world px) ---------------- */
  // walking at x on ground gy, phase ph (cycles; e.g. distance / stride), stride px, body lean rad, foot lift px (>30 = hops)
  K.walkSpec = function (x, gy, s, f, ph, stride, lean, lift = 18) {
    const frac = K.frac, feet = [0, 1].map(i => { const p = frac(ph + i * .5); let off, up = 0;
      if (p < .58) off = stride * (.29 - p); else { const u = (p - .58) / .42; off = -.29 * stride + .58 * stride * eio(u); up = lift * Math.sin(Math.PI * u); }
      return [x + f * off, gy - up]; });
    const hop = lift > 30 ? lift * .45 * Math.abs(Math.sin(TAU * ph)) : 0;
    return { s, f, gy, hip: [x, gy - (HIPH - 4 * Math.abs(Math.cos(TAU * ph))) * s - hop], ang: f * lean, feet, hands: [null, null], hand: ['rest', 'rest'], tilt: 0, eye: 'calm', ph };
  };
  // standing still at x (feet 12·s either side), slight lean
  K.standSpec = function (x, gy, s, f, lean = .05) { return { s, f, gy, hip: [x, gy - HIPH * s], ang: f * lean, feet: [[x - f * 12 * s, gy], [x + f * 12 * s, gy]], hands: [null, null], hand: ['rest', 'rest'], tilt: 0, eye: 'calm' }; };
  /* crouching / kneeling at x: k 0 = standing … 1 = squatting low over the feet (hip drops 30·s, body pitches forward
     .55 rad, head nods down; the 2-bone legs fold by themselves). Feet stay planted. */
  K.crouchSpec = function (x, gy, s, f, k = 1) {
    const F = K.standSpec(x, gy, s, f, lerp(.05, .55, k));
    F.hip = [x + f * 6 * s * k, gy - (HIPH - 30 * k) * s]; F.feet = [[x - f * 16 * s, gy], [x + f * 18 * s, gy]]; F.tilt = .35 * k; F.eye = k > .5 ? 'down' : 'calm'; return F;
  };
  // looking up (at something above): head back, eye 'up' — k 0..1
  K.lookUp = (F, k = 1) => { F.tilt = lerp(F.tilt || 0, -.32, k); if (k > .5) { F.eye = 'up'; F.look = [5, -7]; } return F; };
  // rest positions of the two wingtips (world)
  K.restHands = function (F) { const M = birdM(F); return [HD.pt(M, WROOT[0][0] + 8, WROOT[0][1] + 48), HD.pt(M, WROOT[1][0] + 8, WROOT[1][1] + 48)]; };
  /* in-between two specs (k 0..1, ease it yourself): positions, feet, hands interpolate; discrete things (hand shapes,
     eye) switch at .5; turning (A.f ≠ B.f) shows the face-on head in the middle of the turn (.22–.78) */
  K.mixSpec = function (A, Bs, k) {
    if (k <= 0) return A; if (k >= 1) return Bs;
    const l2 = (a, b) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], hA = K.restHands(A), hB = K.restHands(Bs), pick = k < .5 ? A : Bs;
    return { ...pick, s: lerp(A.s, Bs.s, k), gy: lerp(A.gy, Bs.gy, k), hip: l2(A.hip, Bs.hip), ang: lerp(A.ang, Bs.ang, k), feet: [l2(A.feet[0], Bs.feet[0]), l2(A.feet[1], Bs.feet[1])],
      hands: [0, 1].map(i => l2(A.hands[i] || hA[i], Bs.hands[i] || hB[i])), hand: pick.hand.slice(), tilt: lerp(A.tilt || 0, Bs.tilt || 0, k), front: A.f !== Bs.f && k > .22 && k < .78 };
  };
  /* a TURN with a squash: mixSpec across a change of facing, the body squashing 8 % at the middle of the turn
     (hip dips) — the doodle's "spin". k 0..1 (eased inside) */
  K.turnSpec = function (A, Bs, k) { const e = eio(k), F = K.mixSpec(A, Bs, e); if (F === A || F === Bs) return F; const q = Math.sin(Math.PI * e);
    return { ...F, hip: [F.hip[0], F.hip[1] + 8 * F.s * q] }; };

  /* ---------------- long objects (planks, poles, crosses, oars…) ----------------
     An object pose X = { x, y (its foot, u = 0), a (angle of its length axis, rad), … }; u runs along it, v across. */
  K.cpt = (X, u, v = 0) => [X.x + Math.cos(X.a) * u - Math.sin(X.a) * v, X.y + Math.sin(X.a) * u + Math.cos(X.a) * v];   // object point → world
  K.rotAbout = function (X, pv, th) { const ox = X.x - pv[0], oy = X.y - pv[1]; return { ...X, x: pv[0] + ox * Math.cos(th) - oy * Math.sin(th), y: pv[1] + ox * Math.sin(th) + oy * Math.cos(th), a: X.a + th }; };
  // in-between two object poses; `sw`: when `lie` (drawn in front / behind the body) switches
  K.mixX = (A, Bx, k, sw = .62) => k <= 0 ? A : k >= 1 ? Bx : { ...Bx, x: lerp(A.x, Bx.x, k), y: lerp(A.y, Bx.y, k), a: lerp(A.a, Bx.a, k), u0: Bx.u0, lie: k > sw ? Bx.lie : A.lie };
  /* ON THE SHOULDER (on the back, behind the head, foot trailing down behind): the object (width w) touches the back at
     its point u = contact; a0 = its angle for a right-facing figure (≈ −1.05: top up in front). → X with gf / gn: how far
     below the contact the far / near wingtips grip it (K.farU / K.nearU). Draw it in drawBird's back() callback. */
  K.shoulder = function (F, a0, w, contact) {
    const T = HD.pt(birdM(F), ...CONTACT), a = F.f > 0 ? a0 : Math.PI - a0, d = [Math.cos(a), Math.sin(a)]; let n = [d[1], -d[0]]; if (n[1] > 0) n = [-n[0], -n[1]];
    return { x: T[0] + n[0] * w / 2 - d[0] * contact, y: T[1] + n[1] * w / 2 - d[1] * contact, a, contact, lie: false, gf: 34, gn: 92 };
  };
  K.farU = X => X.contact - X.gf; K.nearU = X => Math.max((X.u0 || 0) + 12, X.contact - X.gn);
  // both wingtips grip a shouldered object (held: the near wing is busy with something else)
  K.gripCarry = function (F, X, held) { F.hands = [K.cpt(X, K.farU(X)), held ? null : K.cpt(X, K.nearU(X))]; F.hand = ['grip', 'grip']; return F; };
  // IN FRONT (held across the chest with both wings, like a plank, a banner pole, a tray): the object starts just behind
  // the chest and runs forward along the facing; a = tilt (0 level, − tip up). Returns X (draw it in drawBird's mid()).
  K.holdFront = function (F, len, a = 0) { const c = HD.pt(birdM(F), 6, 6), aa = F.f > 0 ? a : Math.PI - a, d = [Math.cos(aa), Math.sin(aa)];
    const X = { x: c[0] - d[0] * 24 * F.s, y: c[1] - d[1] * 24 * F.s, a: aa, lie: true }; F.hands = [K.cpt(X, 70 * F.s), K.cpt(X, 36 * F.s)]; F.hand = ['grip', 'grip']; return X; };
  // UPRIGHT (planted like a staff, foot on the ground beside the figure, the near wing gripping it at shoulder height)
  K.holdUpright = function (F, len, lean = .06) { const x = F.hip[0] + F.f * 46 * F.s, X = { x, y: F.gy, a: -Math.PI / 2 + F.f * lean, lie: true };
    F.hands = [F.hands[0], K.cpt(X, F.gy - F.hip[1] + 10 * F.s)]; F.hand = [F.hand[0], 'grip']; return X; };
  /* keep wingtip k on the object at (u, v): if that point is out of reach (1.12× 74·s from the shoulder) the OBJECT
     comes to the wingtip instead (returns the moved X) — so a hand never floats off what it holds */
  K.attach = function (F, X, k, u, v = 0) {
    const Rt = HD.pt(birdM(F), ...WROOT[k]), T = K.cpt(X, u, v), dx = T[0] - Rt[0], dy = T[1] - Rt[1], d = Math.hypot(dx, dy), Rr = 74 * F.s * 1.12;
    if (d <= Rr) { F.hands[k] = T; return X; }
    const nT = [Rt[0] + dx / d * Rr, Rt[1] + dy / d * Rr]; F.hands[k] = nT; return { ...X, x: X.x + nT[0] - T[0], y: X.y + nT[1] - T[1] };
  };
  // a small thing held hanging at the side in the near wing (sw: swing px)
  K.hangGrip = (F, sw = 0) => { const R = HD.pt(birdM(F), ...WROOT[1]); return [R[0] + F.f * (34 + sw) * F.s / 1.6, R[1] + 40 * F.s / 1.6]; };

  /* ================================================================ words */
  // the rect round the current caption (+ source) — pass to K.rain({ hole }) so the hand leaves the words dry
  K.capRect = function (t, lines) {
    for (const [a, b, s, src] of lines) { if (t < a - .05 || t > b + .05) continue; const n = s.split('\n').length; return [100, 300, 880, (n - 1) * 143 + 150 + (src ? 175 : 0)]; }
    return null;
  };
  /* hand-lettered captions (Nanum Pen 92 px at y 410, jittered with the boil). A source after a closing quote ”…” is
     split: the quote in 52 px, the reference under it in 40 px. o.until: hide from that time (the end card). */
  K.captions = function (ctx, t, lines, o = {}) {
    if (o.until != null && t >= o.until) return;
    const f = K.fd, size = o.size ?? 92, y = o.y ?? 410; ctx.save(); ctx.translate([0, 1, -1][f], [0, -1, 1][f]); ctx.rotate([0, .004, -.003][f]);
    Story.captions(ctx, t, lines.map(l => [l[0], l[1], l[2]]), { font: K.FONT, weight: 400, size, y, color: K.WORD, shadow: 'rgba(0,0,0,0)', shadowBlur: 0 });
    for (const [a, b, s, src] of lines) { if (!src) continue; const al = Pilot.win(t, a, b, .35, .45); if (al <= 0) continue;
      const n = s.split('\n').length, m = src.match(/^(.*”)\s*(.*)$/) || [0, src, ''], y0 = y + (n - 1) * size * 1.55 + size;
      Pilot.text(ctx, m[1], W / 2, y0, { size: 52, font: K.FONT, color: K.WORD2, alpha: al }); if (m[2]) Pilot.text(ctx, m[2], W / 2, y0 + 56, { size: 40, font: K.FONT, color: K.WORD3, alpha: al }); }
    ctx.restore();
  };
  // the end card, hand-lettered on plain paper, 1.32× around y 900 (fade the drawing out with K.end(ctx, fade) first)
  K.endCard = function (ctx, t, card, at) {
    if (!card || t < at - .2) return;
    const k = 1.32, cy = 900; ctx.save(); ctx.translate([0, 1, -1][K.fd], [0, -1, 1][K.fd]); ctx.setTransform(k, 0, 0, k, W / 2 - W / 2 * k, cy - cy * k);
    Story.endCard(ctx, t, card, at, { font: K.FONT, srcFont: K.FONT, color: K.WORD, srcColor: '#3e3944', y: 840, titleShadow: '' });
    ctx.restore();
  };

  window.PenDoodle = K;
})();

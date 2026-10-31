/* kit-inkcomic.js — minimal ink comic (미니멀 잉크 만화: 흰 종이, 마커 선, 곰), a word-log house style.  Global: window.InkComic
   A wobbly, slightly blobby black marker line on white paper, lots of white, deadpan. Lines are variable-width ribbons
   (pressure, tapered ends, a blob where the marker rests) with a fixed hand wobble per stroke and a BOIL: three drawings
   cycled on 8 fps. Ink goes on a white layer multiplied onto a paper whose tooth is a real height field (ink drops out in
   the valleys). Fills are paper white; ONE pale-warm colour (beam yellow) for the thing that matters, the same warm light
   for a doorway / a glow — multiplied, so it reads like a highlighter on paper. Others are drawn in a quieter grey line.
   Default character: a round bear on four legs (or sitting up), any pose.
   Load after lib.js and story.js:  <script src="lib.js"></script><script src="story.js"></script><script src="kit-inkcomic.js"></script>
   Units: world px; the camera { x, y, z, sx, sy } = the world point at the frame centre. World points go through cam(pts)
   (the ink is drawn in screen space so the line width stays a marker width at any zoom).
   Pure and deterministic: state = the textures from init() and the per-frame camera/boil set by begin(); seeded only.
   Worked example: sermons/2026-10-24-cross-styles/film/scenes/cs-inkcomic.html (잘라 낸 건 다리였다 · 16). */
(function () {
  const TAU = Math.PI * 2;
  const { clamp, lerp, ss, eo, eio, rng, noise, fbm } = Pilot;
  const W = 1080, H = 1920;
  const K = {}; K.W = W; K.H = H; K.TAU = TAU;

  // ================= HD: the hand-drawn toolkit (ribbons, wobble, boil, paper tooth) =================
  const HD = K.HD = {};
  HD.hash = (i, s = 0) => { let h = (Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  HD.t12 = t => Math.floor(t * 12 + 1e-6) / 12;
  // spline(P, step, closed): Catmull-Rom through control points, sampled every `step` px
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
  // seg(a, b, step) / poly(P, closed, step) / arc(cx, cy, rx, ry, a0, a1, step, rot): densely sampled straight / polygon / elliptic arc
  HD.seg = (a, b, step = 4) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(L / step)), o = [];
    for (let i = 0; i <= m; i++) o.push([lerp(a[0], b[0], i / m), lerp(a[1], b[1], i / m)]); return o; };
  HD.poly = (P, closed = false, step = 4) => { const o = []; const n = P.length, m = closed ? n : n - 1; for (let i = 0; i < m; i++) { const sg = HD.seg(P[i], P[(i + 1) % n], step); if (i) sg.shift(); o.push(...sg); } return o; };
  HD.arc = (cx, cy, rx, ry, a0, a1, step = 4, rot = 0) => { const L = Math.abs(a1 - a0) * Math.max(rx, ry), m = Math.max(2, Math.ceil(L / step)), o = [], c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i <= m; i++) { const a = lerp(a0, a1, i / m), x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * c - y * s, cy + x * s + y * c]); } return o; };
  HD.normals = pts => pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
  HD.lengths = pts => { const s = [0]; for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return s; };
  // wob(pts, seed, amp, wl): the hand wobble — a perpendicular low-frequency displacement (fixed per seed)
  HD.wob = (pts, seed, amp, wl = 120) => { if (!amp || pts.length < 2) return pts; const N = HD.normals(pts), Sx = HD.lengths(pts), oy = (seed * 17.37) % 997;
    return pts.map((p, i) => { const d = (noise(Sx[i] / wl, oy) - .5) * 2 * amp; return [p[0] + N[i][0] * d, p[1] + N[i][1] * d]; }); };
  // boil(pts, seed, f, amp, wl): one boiled drawing — a new wobble + a tiny drift, per drawing index f (0, 1, 2)
  HD.boil = (pts, seed, f, amp, wl = 90) => { if (!amp) return pts; const s = (seed * 31 + f * 977) | 0, dx = (HD.hash(s, 1) - .5) * amp, dy = (HD.hash(s, 2) - .5) * amp;
    return HD.wob(pts, s, amp, wl).map(p => [p[0] + dx, p[1] + dy]); };
  // 2-D affine matrices {a,b,c,d,e,f}: xf(pts, m), mat(x, y, rot, sx, sy), mul(A, B), pt(m, x, y)
  HD.xf = (pts, m) => pts.map(p => [m.a * p[0] + m.c * p[1] + m.e, m.b * p[0] + m.d * p[1] + m.f]);
  HD.mat = (x, y, rot = 0, sx = 1, sy = sx) => { const c = Math.cos(rot), s = Math.sin(rot); return { a: c * sx, b: s * sx, c: -s * sy, d: c * sy, e: x, f: y }; };
  HD.mul = (A, Bm) => ({ a: A.a * Bm.a + A.c * Bm.b, b: A.b * Bm.a + A.d * Bm.b, c: A.a * Bm.c + A.c * Bm.d, d: A.b * Bm.c + A.d * Bm.d, e: A.a * Bm.e + A.c * Bm.f + A.e, f: A.b * Bm.e + A.d * Bm.f + A.f });
  HD.pt = (m, x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
  // ribbon(pts, wf): a variable-width ribbon Path2D (round caps where the end is wide); wf(u, s, i, L) → width
  HD.ribbon = (pts, wf) => {
    const n = pts.length, N = HD.normals(pts), Sx = HD.lengths(pts), L = Sx[n - 1] || 1, Lf = [], Rt = [], ws = [];
    for (let i = 0; i < n; i++) { const w = Math.max(0, wf(Sx[i] / L, Sx[i], i, L)) / 2; ws.push(w); Lf.push([pts[i][0] + N[i][0] * w, pts[i][1] + N[i][1] * w]); Rt.push([pts[i][0] - N[i][0] * w, pts[i][1] - N[i][1] * w]); }
    const p = new Path2D(); p.moveTo(Lf[0][0], Lf[0][1]); for (let i = 1; i < n; i++) p.lineTo(Lf[i][0], Lf[i][1]);
    const ae = Math.atan2(N[n - 1][1], N[n - 1][0]); if (ws[n - 1] > .4) p.arc(pts[n - 1][0], pts[n - 1][1], ws[n - 1], ae, ae + Math.PI, true); else p.lineTo(Rt[n - 1][0], Rt[n - 1][1]);
    for (let i = n - 1; i >= 0; i--) p.lineTo(Rt[i][0], Rt[i][1]);
    const a0 = Math.atan2(N[0][1], N[0][0]); if (ws[0] > .4) p.arc(pts[0][0], pts[0][1], ws[0], a0 + Math.PI, a0, true);
    p.closePath(); return p;
  };
  // ink(ctx, pts, o): an ink line — o = { w, ts, te (taper lengths px), mn / mnE (tip width fraction), press, pw (pressure
  // wavelength), rough, seed, col, blob (a marker resting at the start), dry (dry-brush streaks in the tail), paper }
  HD.ink = (ctx, pts, o = {}) => {
    if (!pts || pts.length < 2) return;
    const w = o.w ?? 8, ts = o.ts ?? w * 2.5, te = o.te ?? w * 3.5, mn = o.mn ?? .2, press = o.press ?? .3, pw = o.pw ?? 70, rough = o.rough ?? .08, seed = o.seed ?? 1, mnE = o.mnE ?? mn;
    const wf = (u, s, i, L) => { const k = Math.min(1, mn + (1 - mn) * ss(0, ts, s)) * Math.min(1, mnE + (1 - mnE) * ss(0, te, L - s));
      return w * k * (1 + press * (noise(s / pw, seed * 3.7 % 500) - .5) * 2) * (1 + rough * (HD.hash(i, seed) - .5) * 2); };
    ctx.fillStyle = o.col || '#151312'; ctx.fill(HD.ribbon(pts, wf));
    if (o.blob) { ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], w * o.blob, 0, TAU); ctx.fill(); }   // a marker resting a moment at the start
    if (o.dry) {   // dry-brush streaks in the tail: thin paper-white lines along the stroke
      const N = HD.normals(pts), Sx = HD.lengths(pts), L = Sx[Sx.length - 1], r = rng(seed * 7 + 3);
      ctx.save(); ctx.strokeStyle = o.paper || '#fff'; ctx.lineCap = 'round';
      for (let k = 0; k < (o.dryN || 4); k++) { const f = (r() - .5) * .7, u0 = 1 - o.dry * (.3 + .7 * r()); ctx.lineWidth = (o.dryW || 1) * (.5 + r() * .7); ctx.globalAlpha = .55 + r() * .45; ctx.beginPath(); let st = false;
        for (let i = 0; i < pts.length; i++) { const u = Sx[i] / L; if (u < u0) continue; const ww = wf(u, Sx[i], i, L) * f; const x = pts[i][0] + N[i][0] * ww, y = pts[i][1] + N[i][1] * ww; if (!st) { ctx.moveTo(x, y); st = true; } else ctx.lineTo(x, y); }
        ctx.stroke(); }
      ctx.restore();
    }
  };
  // fillPts(ctx, pts, col): a flat closed fill (paper white or colour) — outlines are drawn separately with ink;  pathOf(pts)
  HD.fillPts = (ctx, pts, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fill(); };
  HD.pathOf = pts => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (const q of pts) p.lineTo(q[0], q[1]); p.closePath(); return p; };
  // paper: tooth(seed, s1, s2, fibres) → a full-frame height field; paper(T, o) → the paper canvas; toothMask(T, col, mode, thr, soft, amax)
  HD.tooth = (seed = 1, s1 = 6, s2 = 2.2, fib = 0) => {
    const T = new Float32Array(W * H), r = rng(seed), ox = r() * 500, oy = r() * 500;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = .62 * noise(x / s1 + ox, y / s1 + oy) + .38 * noise(x / s2 + oy, y / s2 + ox);
      T[y * W + x] = v; }
    if (fib) { // fibres: thin streaks raised a little
      for (let k = 0; k < fib; k++) { let x = r() * W, y = r() * H, a = r() * TAU; const l = 8 + r() * 30;
        for (let i = 0; i < l; i++) { a += (r() - .5) * .3; x += Math.cos(a); y += Math.sin(a); const xi = x | 0, yi = y | 0; if (xi >= 0 && yi >= 0 && xi < W && yi < H) T[yi * W + xi] = Math.min(1, T[yi * W + xi] + .18); } } }
    return T;
  };
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
  HD.toothMask = (T, col, mode = 'valley', thr = .35, soft = .18, amax = 1) => {
    const c = Pilot.canvas(W, H), g = c.getContext('2d'), d = g.createImageData(W, H), D = d.data, rgb = Pilot.hex(col);
    for (let i = 0; i < W * H; i++) { const v = mode === 'peak' ? (T[i] - thr) / soft : (thr - T[i]) / soft, a = clamp(v) * amax;
      D[i * 4] = rgb[0]; D[i * 4 + 1] = rgb[1]; D[i * 4 + 2] = rgb[2]; D[i * 4 + 3] = a * 255; }
    g.putImageData(d, 0, 0); return c;
  };
  // layers: a white canvas you draw ink on, then multiply onto the frame
  HD.layer = () => { const c = Pilot.canvas(W, H), g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round'; return { c, g }; };
  HD.clearWhite = (g, x = 0, y = 0, w = W, h = H) => { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.fillStyle = '#fff'; g.fillRect(x, y, w, h); g.restore(); };
  HD.dropout = (g, mask, a = 1, x = 0, y = 0, w = W, h = H) => { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; g.drawImage(mask, x, y, w, h, x, y, w, h); g.restore(); };
  HD.multiply = (ctx, c, x = 0, y = 0, w = W, h = H, a = 1) => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = a; ctx.drawImage(c, x, y, w, h, x, y, w, h); ctx.restore(); };
  // walker(x0, x1, T, dec): distance along x with a slowing stop (speed 1 → 0 over the last `dec` fraction) → x(t)
  HD.walker = (x0, x1, T, dec = .3) => { const n = 400, tab = [0]; let s = 0; for (let i = 1; i <= n; i++) { const u = i / n; s += 1 - ss(1 - dec, 1, u); tab.push(s); }
    return t => { if (t <= 0) return x0 + (t / T) * n * (x1 - x0) / tab[n]; if (t >= T) return x1; const f = t / T * n, i = Math.floor(f), k = f - i; return x0 + (x1 - x0) * lerp(tab[i], tab[Math.min(n, i + 1)], k) / tab[n]; }; };

  // ================= palette, type =================
  K.INK = '#141414'; K.GREYI = '#9a9a9a'; K.PAPER = '#ffffff';
  K.WARM = '#f7d27a'; K.WARMF = '#e9b955';                 // THE accent: pale-warm beam yellow (+ its side face). init({ warm, warmF })
  K.LIGHT = 'rgba(253,226,140,';                            // the same warm as a light (append alpha + ')'), always multiplied
  K.HANDF = "'Gaegu',cursive";
  K.FONTS = ["700 80px 'Gaegu'", "400 34px 'Gaegu'", "400 28px 'Noto Sans KR'"];   // Pilot.run({ fonts: InkComic.FONTS })
  K.FONT_LINK = 'https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&family=Noto+Sans+KR:wght@400&display=swap';
  K.t12 = HD.t12;                                             // poses on 12 fps
  K.bf = t => Math.floor(t * 8 + 1e-6) % 3;                  // the boil: drawing 0/1/2 on 8 fps
  K.frac = x => x - Math.floor(x);
  K.lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const lerp2 = K.lerp2;

  // ================= frame state + the marker =================
  let MW = 9, ZK = 1, CAM = HD.mat(0, 0), GREY = false, F8 = 0, INKL = null;
  const TX = K.TX = {};
  Object.defineProperty(K, 'MW', { get: () => MW });         // the marker width this frame (9 at zoom 1, ∝ √zoom)
  Object.defineProperty(K, 'ZK', { get: () => ZK });         // the zoom this frame (scale your px sizes by it)
  Object.defineProperty(K, 'CAM', { get: () => CAM });       // world → screen matrix this frame
  Object.defineProperty(K, 'F8', { get: () => F8 });         // the boil drawing index this frame
  K.setCAM = m => { CAM = m; };                               // temporarily draw in another space (restore it after)
  K.setGrey = v => { const was = GREY; GREY = !!v; return was; };   // quieter grey line for the others; returns the previous value
  const cam = K.cam = pts => HD.xf(pts, CAM);                 // world points → screen points
  // mk(g, screenPts, seed, o): THE marker stroke — wobbled (o.wob), boiled (o.boil), width o.w at zoom 1 (scaled by MW),
  // black or grey (setGrey); any HD.ink option overrides (mn, ts, te, blob, col…)
  function mk(g, pts, seed, o = {}) { if (pts.length < 2) return; HD.ink(g, HD.boil(HD.wob(pts, seed, o.wob ?? 3, 150), seed, F8, o.boil ?? 1.6, 90),
    { w: MW, ts: 6, te: 8, mn: .78, press: .16, pw: 110, rough: .07, seed, col: GREY ? K.GREYI : K.INK, blob: .58, ...o, w: (o.w ?? 9) * MW / 9 }); }
  // fillC(g, screenPts, seed, col = paper): a boiled flat fill (under an outline)
  function fillC(g, pts, seed, col = K.PAPER) { HD.fillPts(g, HD.boil(pts, seed, F8, 1.2, 80), col); }
  // tube(g, screenPts, w, seed): an outlined limb (ink ribbon + paper core);  tubeNear(…, clipOut): the same, its outline clipped
  // out of the body (a near leg that joins the body without a seam)
  function tube(g, pts, w, seed) { const q = HD.boil(HD.spline(pts, 3), seed, F8, 1.2, 70);
    HD.ink(g, q, { w: w + 2 * MW, ts: 26, te: 2, mn: .3, mnE: 1, press: .05, rough: .05, seed, col: GREY ? K.GREYI : K.INK });
    HD.ink(g, q, { w, ts: 34, te: 2, mn: .05, mnE: 1, press: .02, rough: 0, seed: seed + 1, col: K.PAPER }); }
  function tubeNear(g, pts, w, seed, clipOut) { const q = HD.boil(HD.spline(pts, 3), seed, F8, 1.2, 70);
    g.save(); g.clip(clipOut, 'evenodd'); HD.ink(g, q, { w: w + 2 * MW, ts: 2, te: 2, mn: 1, press: .05, rough: .05, seed, col: GREY ? K.GREYI : K.INK }); g.restore();
    HD.ink(g, q, { w, ts: 2, te: 2, mn: 1, press: .02, rough: 0, seed: seed + 1, col: K.PAPER }); }
  Object.assign(K, { mk, fillC, tube, tubeNear });

  // init(o): the paper (tooth height field → embossed paper + ink dropout mask) and the ink layer. ~1.2 s (full-frame loops).
  K.init = function (o = {}) {
    if (o.warm) K.WARM = o.warm; if (o.warmF) K.WARMF = o.warmF;
    const T = HD.tooth(8, 4, 1.5, 900);
    TX.paper = HD.paper(T, { base: [253, 253, 251], mott: 2, emb: 5, grain: 2, vig: .015 });
    TX.drop = HD.toothMask(T, '#ffffff', 'valley', .22, .07, .7);
    INKL = K.INKL = HD.layer();
  };
  // begin(ctx, t, cm): start a frame — boil index, zoom, marker width, camera matrix; paper on ctx; a clean white ink layer.
  // Returns g (the ink layer's context): draw everything on g, then finish(ctx).
  K.begin = function (ctx, t, cm) {
    F8 = K.bf(t); const g = INKL.g;
    ZK = cm.z; MW = 9 * Math.sqrt(clamp(cm.z, .6, 1.4));
    CAM = HD.mat(540 - cm.x * cm.z + (cm.sx || 0), 960 - cm.y * cm.z + (cm.sy || 0), 0, cm.z);
    ctx.drawImage(TX.paper, 0, 0);
    HD.clearWhite(g);
    return g;
  };
  // endWhite(g, t, at): from `at` − .2 the ink page goes blank white with one ruled line (the end card's page)
  K.endWhite = function (g, t, at) {
    const pe = ss(at - .2, at + .35, t);
    if (pe > 0) { g.save(); g.globalAlpha = pe; HD.clearWhite(g); g.restore(); if (pe > .5) { const sv = CAM; CAM = HD.mat(0, 0); mk(g, HD.seg([180, 1330], [900, 1326], 6), 1900, { w: 6, mn: .4, ts: 60, te: 60 }); CAM = sv; } }
  };
  // finish(ctx): ink drops out of the paper's valleys, then the ink layer is multiplied onto the paper
  K.finish = function (ctx) { HD.dropout(INKL.g, TX.drop, .35); HD.multiply(ctx, INKL.c); };

  // ================= the bear (on four legs or sitting up) =================
  // F = { x, gy, f (+1 faces right), rot (body tilt), sag (px down under a load), head (rad, + = snout down, − = looks up),
  //       sit (0 on all fours … 1 sitting up on the rump), sq (turn squash .34..1), lift (px up), ph (walk phase, cycles),
  //       stride, liftLeg, moving, legs: [near fore, far fore, near hind, far hind] world points | null (= from the walk),
  //       face: calm|happy|down|shock|strain|look, sweat, grey (the others: grey line), id (seeds), alpha,
  //       back (truthy = something strapped on the back) + drawLoad(seed) (draws it) + loadSide 'far'|'near' (default: grey → far),
  //       strapOn (the belly strap with nothing on the back), strapItem(seed) (something tucked in the strap),
  //       behind() / mid() / preNear() / front(): callbacks — behind everything / after the strap / before the near legs / last }
  // Forelegs of a sitting bear are arms: legs[0..1] are the paw points (draw the paw AT the thing it holds).
  const SC = K.SC = .95;
  const BODY = HD.spline([[156, 6], [96, 48], [0, 56], [-100, 50], [-162, 10], [-176, -44], [-140, -104], [-40, -128], [60, -126], [118, -94]], 4);
  const HEAD = HD.spline([[112, -96], [150, -122], [204, -112], [244, -80], [272, -62], [268, -36], [238, -24], [200, -6], [156, 6]], 3);
  const LEGX = K.LEGX = [92, 112, -100, -78];                 // near fore, far fore, near hind, far hind (body-local x of the hip)
  const PV = K.PV = [-150, 40], SIT_ROT = -1.12, SIT_SAG = 78;   // sitting: the body rotates up about the rump
  // bodyM(F) / headM(Mb, F): body-local → world matrices (body origin ≈ the middle of the back; head pivots at (126, −48))
  function bodyM(F) { const s = F.sit || 0;
    return HD.mul(HD.mat(F.x, F.gy - 150 * SC + (F.sag || 0) + SIT_SAG * s - (F.lift || 0), 0, F.f * SC * (F.sq ?? 1), SC),
      HD.mul(HD.mat(PV[0], PV[1], (F.rot || 0) + SIT_ROT * s), HD.mat(-PV[0], -PV[1]))); }
  function headM(Mb, F) { return HD.mul(Mb, HD.mul(HD.mat(126, -48, (F.head || 0) - SIT_ROT * (F.sit || 0) * .92), HD.mat(-126, 48))); }
  const legRoot = (F, k) => { const s = F.sit || 0; if (k < 2 && s > 0) return [lerp(LEGX[k], k ? 78 : 58, s), lerp(8, 30, s)]; return [LEGX[k], 8]; };
  Object.assign(K, { bodyM, headM, legRoot });
  // backLoad(F, uAt): a long object lying along the back — its point u = uAt over the shoulders, its far end over the neck,
  // the rest trailing past the rump → X = { x, y, a, k: 0 } (u runs from the trailing end; add u0/u1 yourself)
  const JB = [70, -142], BANG = .14;
  K.backLoad = function (F, uAt) {
    const Mb = bodyM(F), J = HD.pt(Mb, JB[0], JB[1]), Q = HD.pt(Mb, JB[0] + Math.cos(BANG) * 20, JB[1] - Math.sin(BANG) * 20), a = Math.atan2(Q[1] - J[1], Q[0] - J[0]);
    return { x: J[0] - Math.cos(a) * uAt, y: J[1] - Math.sin(a) * uAt, a, k: 0 };
  };
  // strapPoint(F) → { grip, ang }: where a tool tucked in the belly strap sits (handle up behind the shoulders, along the flank)
  K.strapPoint = function (F) { const Mb = bodyM(F), p = HD.pt(Mb, -2, -150), q = HD.pt(Mb, -60, -40); return { grip: p, ang: Math.atan2(q[1] - p[1], q[0] - p[0]) }; };
  // footOf(F, k): leg k's foot (given, or from the walk cycle: diagonal pairs, stride and lift)
  function footOf(F, k) {
    if (F.legs) return F.legs[k];
    const pp = (F.ph || 0) * TAU + (k === 1 || k === 2 ? Math.PI : 0), A = (F.stride || 22), dx = F.moving ? A * Math.sin(pp) : 0, ly = F.moving ? (F.liftLeg ?? 14) * Math.max(0, Math.cos(pp)) : 0;
    return [F.x + F.f * (F.sq ?? 1) * (LEGX[k] + dx) * SC, F.gy - ly];
  }
  K.footOf = footOf;
  // paw(g, worldPt, seed, dir): a forepaw end — a round pad with three claw ticks pointing dir (±1)
  function paw(g, at, seed, dir) {
    const c = cam([at])[0]; fillC(g, HD.arc(c[0], c[1], 17 * ZK, 14 * ZK, 0, TAU, 3), seed); mk(g, HD.arc(c[0], c[1], 17 * ZK, 14 * ZK, 0, TAU, 3), seed + 1, { w: 6, blob: 0, mn: 1 });
    for (let i = 0; i < 3; i++) mk(g, [[c[0] + dir * (8 + i * 6) * ZK, c[1] + (i - 1) * 6 * ZK], [c[0] + dir * (16 + i * 6) * ZK, c[1] + (i - 1) * 7 * ZK]], seed + 3 + i, { w: 3.5, blob: 0, mn: .5 });
  }
  K.paw = paw;
  // bearSeed(F): the base seed of a bear's strokes (me 0, the others 2000 + id·300) — props drawn "on" it use seed + n
  K.bearSeed = F => F.grey ? 2000 + (F.id || 0) * 300 : 0;
  // drawBear(g, F): the whole bear in its pose (see F above), far legs → body → head → load/strap → near legs
  K.drawBear = function (g, F) {
    const al = F.alpha ?? 1; if (al <= 0) return;
    const was = GREY; GREY = !!F.grey; const seed = K.bearSeed(F), s = F.sit || 0, side = F.loadSide || (F.grey ? 'far' : 'near');
    if (al < 1) { g.save(); g.globalAlpha = al; }
    const Mb = HD.mul(CAM, bodyM(F)), P = pts => HD.xf(pts, Mb), Mh = HD.mul(CAM, headM(bodyM(F), F)), Hp = pts => HD.xf(pts, Mh);
    if (F.behind) F.behind();
    if (F.back && F.drawLoad && side === 'far') F.drawLoad(seed);   // the others' loads sit on the far side (quieter)
    const legAt = k => { const r = legRoot(F, k), top = HD.pt(Mb, r[0], r[1]), ft = cam([footOf(F, k)])[0], arm = k < 2 && s > .3, fy = arm ? ft[1] : ft[1] - 12 * ZK;
      // a bent joint: the knee/elbow sits off the straight line (forward for knees, back for a sitting bear's elbows)
      const mx = lerp(top[0], ft[0], .5), my = lerp(top[1], fy, .5), bend = arm ? -F.f * 14 * ZK : 2;
      return [top, [mx + bend, my], [ft[0], fy]]; };
    for (const k of [1, 3]) tube(g, legAt(k), 40 * SC * ZK, seed + 200 + k * 3);
    if (s > .3) paw(g, footOf(F, 1), seed + 290, -F.f);
    fillC(g, P(BODY), seed + 210);
    { const a = P([BODY[BODY.length - 1]])[0], b = Hp([HEAD[0]])[0], c = P([BODY[0]])[0], d = Hp([HEAD[HEAD.length - 1]])[0], m = P([[110, -40]])[0]; HD.fillPts(g, [a, b, Hp([[150, -40]])[0], d, c, m], K.PAPER); }
    mk(g, P(BODY), seed + 211, { w: 10 });
    fillC(g, Hp(HEAD.concat([[132, -40]])), seed + 212);
    mk(g, Hp(HEAD), seed + 213, { w: 9.5 });
    { const a = P([BODY[BODY.length - 1]])[0], b = Hp([HEAD[0]])[0], c = P([BODY[0]])[0], d = Hp([HEAD[HEAD.length - 1]])[0];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 3) mk(g, HD.seg(a, b, 2), seed + 214, { w: 9.5, blob: 0 }); if (Math.hypot(c[0] - d[0], c[1] - d[1]) > 3) mk(g, HD.seg(c, d, 2), seed + 215, { w: 9.5, blob: 0 }); }
    for (const [ex, ey, sd] of [[152, -120, 220], [182, -120, 222]]) { const e = HD.arc(ex, ey, 12, 11, Math.PI * 1.05, Math.PI * 1.98, 2); fillC(g, Hp(HD.arc(ex, ey, 12, 11, Math.PI, TAU, 2)), seed + sd); mk(g, Hp(e), seed + sd + 1, { w: 7.5 }); }
    HD.fillPts(g, HD.boil(Hp(HD.arc(266, -50, 10, 8, 0, TAU, 2)), seed + 230, F8, .6, 12), GREY ? K.GREYI : K.INK);
    const fc = F.face || 'calm';
    if (fc === 'happy' || fc === 'down') mk(g, Hp(HD.arc(214, fc === 'happy' ? -76 : -84, 7, 5, fc === 'happy' ? Math.PI * 1.1 : .2, fc === 'happy' ? Math.PI * 1.9 : Math.PI - .2, 2)), seed + 231, { w: 4.5, blob: 0 });
    else { const r = fc === 'shock' ? 8 : 5.5; HD.fillPts(g, HD.boil(Hp(HD.arc(214, -80, r, r * 1.1, 0, TAU, 2)), seed + 231, F8, .5, 10), GREY ? K.GREYI : K.INK);
      if (fc === 'shock') fillC(g, Hp(HD.arc(216, -82, 3, 3, 0, TAU, 2)), seed + 233); }
    if (fc === 'strain' || fc === 'shock') mk(g, Hp(HD.seg([200, -98], [224, -94], 2)), seed + 234, { w: 4.5, blob: 0, mn: .5 });
    mk(g, Hp(HD.spline([[246, -30], [234, -24]], 2)), seed + 232, { w: 4.5, blob: 0 });
    if (F.sweat) mk(g, Hp(HD.spline([[180, -128], [172, -114], [176, -104], [186, -108], [184, -118], [180, -128]], 2)), seed + 240, { w: 4.5, blob: 0 });
    // the load on my back lies on the near side of the body; the strap round the belly holds it (and a tool)
    if (F.back || F.strapOn) { if (F.back && F.drawLoad && side === 'near') F.drawLoad(seed); GREY = !!F.grey;
      mk(g, P(HD.spline([[-6, -150], [-14, -40], [-4, 55]], 4)), seed + 250, { w: 7, mn: .7, blob: 0 }); mk(g, P(HD.spline([[14, -152], [8, -40], [16, 56]], 4)), seed + 251, { w: 7, mn: .7, blob: 0 });
      if (F.strapItem) F.strapItem(seed); }
    if (F.mid) { F.mid(); GREY = !!F.grey; }
    const bodyW = P(BODY), clipOut = new Path2D(); clipOut.rect(-4000, -4000, 9000, 9000); clipOut.addPath(HD.pathOf(bodyW));
    if (F.preNear) { F.preNear(); GREY = !!F.grey; }
    for (const k of [2, 0]) { const Lg = legAt(k); const r = legRoot(F, k); Lg[0] = HD.pt(Mb, r[0], r[1] + 2); tubeNear(g, Lg, 42 * SC * ZK, seed + 260 + k * 3, clipOut);
      if (k === 0 && s > .3) paw(g, footOf(F, 0), seed + 280, -F.f);
      else { const ft = Lg[2], dir = F.f; for (let i = 0; i < 3; i++) mk(g, HD.seg([ft[0] + dir * (8 + i * 8) * ZK, ft[1] + 16 * ZK], [ft[0] + dir * (8 + i * 8) * ZK, ft[1] + 26 * ZK], 2), seed + 270 + k * 5 + i, { w: 3.5, blob: 0, mn: .5 }); } }
    if (F.front) { F.front(); }
    if (al < 1) g.restore();
    GREY = was;
  };

  // ================= poses =================
  // walkSpec(x, gy, f, phase, o): on all fours, walking — o.stride (px swing), o.lift, o.bob, o.sag, o.rot, o.head, o.face, o.sweat
  function walkSpec(x, gy, f, ph, o = {}) { const bob = (o.bob ?? 5) * Math.pow(Math.sin(ph * TAU), 2);
    return { x, gy, f, ph, moving: true, stride: o.stride ?? 22, liftLeg: o.lift ?? 14, sag: (o.sag ?? 0) + bob, rot: o.rot ?? 0, head: o.head ?? .16, face: o.face || 'calm', sweat: !!o.sweat }; }
  // standSpec(x, gy, f, o): standing on four feet (o.sag, o.rot, o.head, o.face)
  function standSpec(x, gy, f, o = {}) { return { x, gy, f, moving: false, sag: o.sag ?? 0, rot: o.rot ?? 0, head: o.head ?? .1, face: o.face || 'calm' }; }
  // legsOf(F): the four foot points of a pose (to pin them, or to move one paw)
  function legsOf(F) { return [0, 1, 2, 3].map(k => footOf(F, k)); }
  // sitSpec(x, gy, f, paws, o): sitting up, facing f, rump at x: hind feet forward on the ground, forepaws (arms) at paws = [near, far]
  // (o.sit 0..1 — .45 = half up, hunched over something on the ground)
  function sitSpec(x, gy, f, paws, o = {}) { const F = { x, gy, f, moving: false, sit: o.sit ?? 1, sag: o.sag ?? 0, rot: o.rot ?? 0, head: o.head ?? .25, face: o.face || 'calm' };
    const rump = x + f * PV[0] * SC; F.legs = [paws[0], paws[1], [rump + f * 150, gy], [rump + f * 118, gy]]; return F; }
  // lieSpec(x, gy, f, o): lying down on the belly, chin on the ground (waiting) — all four legs folded under
  function lieSpec(x, gy, f, o = {}) { const F = standSpec(x, gy, f, { sag: o.sag ?? 62, head: o.head ?? .32, rot: o.rot ?? 0, face: o.face || 'calm' });
    F.legs = [0, 1, 2, 3].map(k => [x + f * (LEGX[k] + (k < 2 ? 46 : -26)) * SC, gy]); return F; }
  // mixSpec(A, B, k): an in-between; a change of facing turns on the spot (each foot stays near where it stands, fore ↔ hind
  // swap sides, the body squashes to a front view) — give a turn ≥ .35 s
  function mixSpec(A, Bs, k) {
    if (k <= 0) return { ...A, legs: (A.legs || legsOf(A)).slice() }; if (k >= 1) return { ...Bs, legs: (Bs.legs || legsOf(Bs)).slice() };
    const pick = k < .5 ? A : Bs, flip = A.f !== Bs.f, la = A.legs || legsOf(A), lb0 = Bs.legs || legsOf(Bs);
    const lb = flip ? [lb0[2], lb0[3], lb0[0], lb0[1]] : lb0, m = la.map((p, i) => lerp2(p, lb[i], k)), legs = flip && k >= .5 ? [m[2], m[3], m[0], m[1]] : m;
    return { ...pick, x: lerp(A.x, Bs.x, k), gy: lerp(A.gy, Bs.gy, k), sag: lerp(A.sag || 0, Bs.sag || 0, k), rot: lerp(A.rot || 0, Bs.rot || 0, k), head: lerp(A.head || 0, Bs.head || 0, k),
      sit: lerp(A.sit || 0, Bs.sit || 0, k), sq: flip ? Math.max(.34, Math.abs(1 - 2 * k)) : 1, legs, moving: false };
  }
  Object.assign(K, { walkSpec, standSpec, legsOf, sitSpec, lieSpec, mixSpec });

  // ================= long objects =================
  // X = { x, y, a, k?, u0?, u1? }: foot end at (x, y), axis angle a, u along it. objPt(X, u, v), rotAbout(X, pivot, th),
  // mixObj(A, B, k, dir): an in-between; dir ±1 turns it over the top about its middle like a baton (never down through the
  // ground), with an arc of 110 px — o.len = the object's length (for its middle)
  K.objPt = (X, u, v = 0) => { const c = Math.cos(X.a), s = Math.sin(X.a); return [X.x + u * c - v * s, X.y + u * s + v * c]; };
  K.rotAbout = function (X, pv, th) { const ox = X.x - pv[0], oy = X.y - pv[1]; return { ...X, x: pv[0] + ox * Math.cos(th) - oy * Math.sin(th), y: pv[1] + ox * Math.sin(th) + oy * Math.cos(th), a: X.a + th }; };
  K.mixObj = (A, Bx, k, dir = 0, len = 560) => { if (k <= 0) return A; if (k >= 1) return Bx; let b = Bx.a; while (b - A.a > Math.PI) b -= TAU; while (b - A.a < -Math.PI) b += TAU;
    if (dir > 0) while (b < A.a) b += TAU; if (dir < 0) while (b > A.a) b -= TAU;   // forced: over the top, never down through the road
    if (dir) { const cu = ((Bx.u0 || 0) + len) / 2, ca = K.objPt(A, cu), cb = K.objPt(Bx, cu), cc = lerp2(ca, cb, k), an = lerp(A.a, b, k);   // turned over about its middle, like a baton
      return { ...Bx, x: cc[0] - Math.cos(an) * cu, y: cc[1] - Math.sin(an) * cu - Math.sin(Math.PI * k) * 110, a: an, k: lerp(A.k || 0, Bx.k || 0, k) }; }
    return { ...Bx, x: lerp(A.x, Bx.x, k), y: lerp(A.y, Bx.y, k), a: lerp(A.a, b, k), k: lerp(A.k || 0, Bx.k || 0, k) }; };

  // ================= world =================
  // road(g, cm, o): the road as two marker lines (front edge o.front, back edge o.back), a few dashes on it, broken by
  // o.gaps = [[x0, x1], …]; at each gap the road just stops and two cliff lines go down (with ticks). o.from/o.to = road extent.
  K.road = function (g, cm, o) {
    const G1 = o.front, GB = o.back, gaps = o.gaps || [];
    const x0 = cm.x - 540 / cm.z - 60, x1 = cm.x + 540 / cm.z + 60, segs = [];
    const add = (a, b) => { a = Math.max(a, x0); b = Math.min(b, x1); if (b > a + 4) segs.push([a, b]); };
    let a0 = o.from ?? -4000; for (const [g0, g1] of gaps) { add(a0, g0); a0 = g1; } add(a0, o.to ?? 9000);
    let s = 700;
    for (const [a, b] of segs) {
      mk(g, cam(HD.seg([a, G1], [b, G1 - 2], 8)), s++, { w: 7, mn: .5, ts: 30, te: 30, wob: 3 });
      mk(g, cam(HD.seg([a, GB], [b, GB + 2], 8)), s++, { w: 5.5, mn: .4, ts: 40, te: 40, wob: 3 });
    }
    for (let x = Math.floor(x0 / 260) * 260; x < x1; x += 260) { if (gaps.some(([g0, g1]) => x > g0 - 140 && x < g1 + 40)) continue; const r = HD.hash(x | 0, 5);
      mk(g, cam(HD.seg([x + r * 80, G1 + 34 + r * 20], [x + r * 80 + 50 + r * 40, G1 + 34 + r * 20], 4)), 800 + (x / 260 | 0), { w: 5, mn: .3, ts: 20, te: 20 }); }
    for (const [E, E2] of gaps) if (E2 > x0 && E < x1) {
      for (const [xx, dir, sd] of [[E, 1, 850], [E2, -1, 860]]) {
        mk(g, cam(HD.spline([[xx, GB - 2], [xx + dir * 4, G1], [xx + dir * 10, G1 + 300], [xx + dir * 2, G1 + 700], [xx + dir * 14, G1 + 1100]], 6)), sd, { w: 8, mn: .6, ts: 10, te: 200 });
        for (let i = 0; i < 7; i++) { const y = G1 + 60 + i * 110 + HD.hash(i, sd) * 40; mk(g, cam(HD.seg([xx + dir * 10, y], [xx + dir * (40 + HD.hash(i, sd + 1) * 40), y + 30], 3)), sd + 10 + i, { w: 4.5, mn: .3, blob: 0 }); }
      }
      for (const [xx, sd] of [[E, 870], [E2, 871]]) mk(g, cam(HD.seg([xx, GB], [xx + 2, G1], 4)), sd, { w: 6, mn: .6 });
    }
  };
  // door(g, t, o, fillPass): a lit arched doorway — o = { x (centre), gy (sill y), w = 86 (half-width), h = 300, floor (y the light
  // spills down to) }. Call with fillPass = true first (the warm light, multiplied), then false after figures that walk into
  // it (the arch lines, the open leaf, a knob, light ticks that pulse)
  K.door = function (g, t, o, fillPass) {
    const x = o.x, gy = o.gy, w = o.w ?? 86, h = o.h ?? 300, G1 = o.floor ?? gy + 112, arch = (rw, hh) => { const q = [[x - rw, gy]]; for (let i = 0; i <= 18; i++) { const a = Math.PI + Math.PI * i / 18; q.push([x + Math.cos(a) * rw, gy - hh + rw + Math.sin(a) * rw]); } q.push([x + rw, gy]); return q; };
    if (fillPass) {
      const pulse = .5 + .5 * Math.sin(t * TAU * 1.4);
      g.save(); g.globalCompositeOperation = 'multiply'; fillC(g, cam(arch(w, h)), 1300, K.LIGHT + (.75 + .15 * pulse) + ')');
      const spill = [[x - w, gy], [x + w, gy], [x + w + 120, G1 - 4], [x - w - 160, G1 - 4]]; fillC(g, cam(spill), 1301, K.LIGHT + (.35 + .1 * pulse) + ')'); g.restore();
      return;
    }
    mk(g, cam(HD.poly(arch(w + 22, h + 22), false, 5)), 1310, { w: 9 });
    mk(g, cam(HD.poly(arch(w, h), false, 5)), 1311, { w: 7.5 });
    const leaf = [[x + w, gy], [x + w + 70, gy + 26], [x + w + 70, gy - h + w + 30], [x + w, gy - h + w * .55]];
    fillC(g, cam(leaf), 1312, K.PAPER); mk(g, HD.poly(cam(leaf), true, 5), 1313, { w: 7 });
    const kn = cam([[x + w + 54, gy - h * .42]])[0]; HD.fillPts(g, HD.arc(kn[0], kn[1], 6 * ZK, 6 * ZK, 0, TAU, 2), K.INK);
    const pulse = .5 + .5 * Math.sin(t * TAU * 1.4);
    if (pulse > .45) for (let i = 0; i < 7; i++) { const a = Math.PI + Math.PI * (i + .5) / 7, r0 = w + 42, r1 = w + 66, cy = gy - h + w;
      mk(g, cam(HD.seg([x + Math.cos(a) * r0, cy + Math.sin(a) * r0], [x + Math.cos(a) * r1, cy + Math.sin(a) * r1], 3)), 1320 + i, { w: 4.5, blob: 0, mn: .5 }); }
  };
  // glowAt(g, screenPt, t, R, seed, al): a soft warm glow (multiplied highlighter oval) under something precious, breathing
  K.glowAt = function (g, c, t, R, seed, al) {
    if (al <= .03) return; const pulse = .5 + .5 * Math.sin(t * TAU * .9 + seed);
    g.save(); g.globalAlpha = al; g.globalCompositeOperation = 'multiply';
    HD.fillPts(g, HD.arc(c[0], c[1], R * (1 + .08 * pulse), R * .42 * (1 + .08 * pulse), 0, TAU, 8), K.LIGHT + (.3 + .15 * pulse) + ')');
    HD.fillPts(g, HD.arc(c[0], c[1], R * .62, R * .26, 0, TAU, 8), K.LIGHT + (.35 + .2 * pulse) + ')'); g.restore();
  };
  // ticks(g, screenPt, rIn, rOut, n, seed, o): comic "shine" ticks in a half ring above a point (something precious lights up)
  K.ticks = function (g, c, r0, r1, n = 6, seed = 1450, o = {}) { for (let i = 0; i < n; i++) { const a = -Math.PI * (.12 + .76 * i / Math.max(1, n - 1));
    mk(g, [[c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0 * .8], [c[0] + Math.cos(a) * r1, c[1] + Math.sin(a) * r1 * .8]], seed + i, { w: 4.5, blob: 0, mn: .5, ...o }); } };

  // ================= effects =================
  // burst(g, screenPt, u): THE HIT — nine thick strokes flying out in a half ring, u = seconds since the hit (0 … .55)
  K.burst = function (g, c, u, seed = 590) {
    const k = 1 - ss(.25, .55, u);
    g.save(); g.globalAlpha = k; for (let i = 0; i < 9; i++) { const a = -Math.PI * (.08 + .84 * i / 8), r0 = (70 + 40 * eo(u / .3)) * ZK, r1 = r0 + (60 + 30 * HD.hash(i, 3)) * ZK;
      mk(g, [[c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0], [c[0] + Math.cos(a) * r1, c[1] + Math.sin(a) * r1]], seed + i, { w: 7, blob: 0, mn: .4 }); } g.restore();
  };
  // clunk(g, screenPt, seedBase): four short impact strokes either side of something landing (show ~.3 s)
  K.clunk = function (g, c, sb = 560) {
    for (const [ax, ay, bx, by] of [[-30, -16, -64, -40], [-34, 10, -76, 12], [30, -16, 64, -40], [34, 10, 76, 12]]) mk(g, [[c[0] + ax * ZK, c[1] + ay * ZK], [c[0] + bx * ZK, c[1] + by * ZK]], sb + ax + ay, { w: 5, blob: 0, mn: .4 });
  };
  // speedLines(g, t, F, a, dir = 1): four marker dashes behind a running bear (dir = the way it runs)
  K.speedLines = function (g, t, F, a, dir = 1) {
    if (!(a > 0) || !F) return; g.save(); g.globalAlpha = Math.min(1, a); for (let i = 0; i < 4; i++) { const y = F.gy - (50 + i * 60) * SC, x = F.x - dir * (220 * SC + 250), l = 70 + HD.hash(i, Math.round(t * 8)) * 60;
      mk(g, cam([[x - dir * l, y], [x, y]]), 600 + i, { w: 5, blob: 0, mn: .4 }); } g.restore();
  };
  // camera: mixCam(a, b, k); shake(t, t0, ax = 18, ay = 13, dur = .55) → [sx, sy]
  K.mixCam = (a, b, k) => k <= 0 ? a : k >= 1 ? b : { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
  K.shake = (t, t0, ax = 18, ay = 13, dur = .55) => { if (t < t0) return [0, 0]; const k = 1 - ss(t0, t0 + dur, t); return [ax * k * Math.sin(t * 97), ay * k * Math.sin(t * 131 + 1)]; };

  // ================= words (screen space, on the paper, after finish) =================
  // captions / endCard jiggle with the boil (a hand-lettered card); Gaegu bold ink, a white halo, y 400; card 1.2× at y 860
  K.captions = function (ctx, t, lines, o = {}) {
    ctx.save(); ctx.translate([0, 1, -1][F8], [0, -1, 1][F8]);
    Story.captions(ctx, t, lines, { font: K.HANDF, weight: 700, size: 78, y: 400, color: '#151515', srcFont: "'Noto Sans KR',sans-serif", srcColor: '#2a2a2a', shadow: 'rgba(255,255,255,.9)', shadowBlur: 10, ...o });
    ctx.restore();
  };
  K.endCard = function (ctx, t, card, at, o = {}) {
    ctx.save(); ctx.translate([0, 1, -1][F8], [0, -1, 1][F8]);
    ctx.translate(540, 860); ctx.scale(1.2, 1.2); ctx.translate(-540, -860);
    Story.endCard(ctx, t, card, at, { font: K.HANDF, color: '#151515', srcFont: K.HANDF, srcColor: '#2a2a2a', y: 860, titleShadow: '', ...o });
    ctx.restore();
  };

  window.InkComic = K;
})();

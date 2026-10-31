/* kit-pixelsea.js — pixel-art sea at dawn / sunset / morning, as a reusable canvas-film style kit.  Global: window.Pixelsea
   Provenance: borrowed craft from prompt-motion.com/pluginplay-3d4006 "Pixel art LLM history" by @pluginplay (pixel cliff
   over a sunset sea, banded sun cut by stripes, broken reflection column, pixel caption box + year tag, chunky impact word,
   close-up pixel portrait) and prompt-motion.com/hoyoyoda-3a5c08 "Chuseok pixel night scene" by @hoyoyoda (dithered sky,
   plus-shaped twinkling stars, Korean pixel type). Own renderer: nothing copied, every piece drawn here in code.

   HOW A FRAME IS MADE (all world drawing happens in TRUE PIXELS in a small buffer, then is blown up nearest-neighbour)
     Pixelsea.begin(ctx);                          black + (landscape) pillarbox of the 1080×1920 design frame
     const b = Pixelsea.buf(6), c = b.c;           the 6× buffer (180×320); 4× = 270×480, 8× = 135×240 …
     const P = Pixelsea.tod(1.2);                  the palette for a time of day (0 blue hour · 1 sunrise · 2 morning)
     Pixelsea.backdrop(c, b, P, hz);               dithered sky bands + sea bands (cached), horizon row hz
     stars / clouds / sun / islands / sea glints / reflection / boat / figures … (buffer pixels, whole pixels only)
     Pixelsea.present(ctx, b, ...Pixelsea.shake(t, hitAt));   nearest-neighbour blow-up (+ whole-pixel shake)
     Pixelsea.captions(ctx, t, SCRIPT.lines);      pixel caption boxes with a tag, typed in (full-res canvas, on the UI grid)
     Pixelsea.impact(…) / counter(…) / endCard(…) → Pixelsea.fade(ctx, t, DUR)
   Coordinates: world primitives take BUFFER pixels of the current buffer; words/UI take design px (1080×1920), snapped
   to the UI grid (Pixelsea.UI = 4 px). Pure functions of their arguments; seeded randomness only; caches are rebuildable.
   Load after lib.js and story.js. */
(function () {
  const { clamp, lerp, ss, rng, noise } = Pilot;
  const K = {};
  K.W = 1080; K.H = 1920;
  K.UI = 4;                                   // the UI pixel (design px): caption boxes, tags, counters snap to it

  /* ---------------------------------------------------------------- palette, type */
  // ACCENT: THE one colour for "the thing" (change with init({ accent })). Nothing else in a film may use it.
  K.ACCENT = '#d9432b';
  K.INK = '#1a0f24';                          // outline / caption ink (deep plum, never pure black)
  K.CREAM = '#fff1d6';                        // caption text, light borders
  K.TAG = '#5cc8b8';                          // the caption tag label (teal, game-UI)
  K.GOLD = ['#fff4a8', '#ffcf3a', '#c98a1c']; // impact-word fill hi / lo / deep
  K.FOAM = '#fbeaf0';                         // splash and wake pixels
  K.FONT = "'Do Hyeon',sans-serif";
  K.FONTS = ["400 66px 'Do Hyeon'"];          // for Pilot.run({ fonts })

  // Time-of-day keyframes (same keys): sky bands top → horizon, sun bands top → bottom, sea bands horizon → deep, …
  // tod(k) interpolates them (k 0 = blue hour, 1 = sunrise, 2 = morning) in 1/16 steps — the light changes in steps.
  const KEYS = [
    { // 0 · blue hour (stars out, the sun still under the sea)
      sky: ['#0b0a24', '#100e30', '#16133c', '#1d1848', '#271d54', '#33225e', '#472a68', '#5f3270', '#7c3c72', '#a04c70'],
      sun: ['#ffe6a8', '#ffc472', '#ff9a62', '#f87266', '#e0566c'], halo: '#b0567a', star: 1,
      cloud: ['#6e5490', '#463a72', '#2c2652'], hillFar: '#2a1f4e', hillNear: '#1a1436',
      sea: ['#4a3270', '#2e2458', '#221c48', '#18143a', '#100c2c'], glint: '#4a3c7a', glint2: '#7a5a96',
      refl: ['#d08aa0', '#a06a92', '#7a5488', '#5a4278'],
      rock: ['#2a2038', '#1e162c', '#382a48'], grass: ['#2a6a4a', '#1e4a3a'],
      under: ['#2e2660', '#241e52', '#1a1644', '#121036', '#0b0a28'], shaft: '#3a3274', bubble: '#6a6aa8',
      sand: ['#3a2e4e', '#2c2240', '#4a3c5e'], weed: ['#1e4a46', '#2a6058'], deck: ['#5a3a3a', '#432a30'],
    },
    { // 1 · sunrise (the synthwave sea: purple → pink → orange, banded sun)
      sky: ['#1e1342', '#2b1650', '#3f1a5e', '#5c1f6a', '#7d2a72', '#a63a74', '#cc5370', '#e8756a', '#f59b62', '#fbc25f'],
      sun: ['#fff4b8', '#ffd86b', '#ffaf57', '#ff8a5c', '#f8686a'], halo: '#f7a06e', star: .3,
      cloud: ['#f6a8a0', '#c96b8c', '#8d3f78'], hillFar: '#6a2c6c', hillNear: '#3a1a52',
      sea: ['#8a3a74', '#5a2a6a', '#43205a', '#31184a', '#22103a'], glint: '#7a3e86', glint2: '#d0708a',
      refl: ['#fff0a8', '#ffc66a', '#ff8f6a', '#e0607a'],
      rock: ['#4a2e48', '#3a2238', '#5c3a52'], grass: ['#3fae5a', '#2b7a48'],
      under: ['#4a2e78', '#3a2a6e', '#2c2160', '#1f1850', '#151040'], shaft: '#5a3e8a', bubble: '#9a86c8',
      sand: ['#6a4a6a', '#54395a', '#83607a'], weed: ['#2f6a5a', '#3f8a6a'], deck: ['#8a5a3a', '#6a4230'],
    },
    { // 2 · morning (sun up, the sea turns blue, the sky pales to gold at the horizon)
      sky: ['#4a6cb4', '#5a7cbf', '#6d8dc8', '#82a0d0', '#98b2d6', '#b0c2d8', '#c8cfd4', '#e0d6c8', '#f2dcb8', '#fbe3a8'],
      sun: ['#fffbe0', '#fff2b4', '#ffe48e', '#ffd474', '#ffc462'], halo: '#fbeab8', star: 0,
      cloud: ['#ffffff', '#e8e2ee', '#b8b4d4'], hillFar: '#7a86b8', hillNear: '#55609a',
      sea: ['#7a96c8', '#5a78b8', '#4866a8', '#385496', '#2a4282'], glint: '#8aa6d8', glint2: '#d8e6f8',
      refl: ['#fff8d0', '#ffeaa4', '#f8dc92', '#d8dcc8'],
      rock: ['#5a4a5a', '#463846', '#6e5c6a'], grass: ['#5ab85a', '#3a8a48'],
      under: ['#3e74b0', '#3466a4', '#2a5694', '#204684', '#183870'], shaft: '#5a90c8', bubble: '#b8d8f0',
      sand: ['#b8a888', '#9a8a70', '#d0c0a0'], weed: ['#2f7a5a', '#4a9a6a'], deck: ['#9a6a44', '#7a5034'],
    },
  ];
  const hx = h => Pilot.hex(h), toHex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const mixHex = (a, b, k) => toHex(Pilot.mix(hx(a), hx(b), k));
  const PCACHE = new Map();
  // tod(k) → palette P (the keys above + P.key): k in [0, 2], stepped to 1/16.
  K.tod = function (k) {
    const q = Math.round(clamp(k, 0, 2) * 16) / 16; let P = PCACHE.get(q); if (P) return P;
    const i = Math.min(1, Math.floor(q)), f = q - i, A = KEYS[i], B = KEYS[i + 1];
    P = { key: 'k' + q };
    for (const key in A) P[key] = Array.isArray(A[key]) ? A[key].map((c, j) => mixHex(c, B[key][j], f)) : typeof A[key] === 'number' ? lerp(A[key], B[key], f) : mixHex(A[key], B[key], f);
    PCACHE.set(q, P); return P;
  };
  K.KEYS = KEYS;

  /* ---------------------------------------------------------------- setup, timing */
  // init({ accent }): optional; sets the accent. Everything else is built lazily and cached.
  K.init = function (o = {}) { if (o.accent) K.ACCENT = o.accent; };
  // step(t, fps = 10): time held on `fps` drawings a second. Figures and props 8–12 fps; water 6; camera on whole pixels.
  K.step = (t, fps = 10) => Math.floor(t * fps + 1e-6) / fps;
  // hold(t, at, dur, fps = 12): 0 before `at` → 1 after `dur`, linear but in whole frames of `fps` (a stepped move).
  K.hold = (t, at, dur, fps = 12) => clamp((K.step(t, fps) - at) / dur);
  // eo(x): cubic ease-out; pop(x): ease-out with a 1-frame overshoot (at most ~6 %) — springs, no cartoon bounce.
  K.eo = x => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
  K.pop = x => { x = clamp(x); return x < .7 ? 1.06 * K.eo(x / .7) : 1.06 - .06 * (x - .7) / .3; };
  // bayer(x, y) → 0..1: the 4×4 ordered-dither threshold at a pixel.
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
  K.bayer = (x, y) => BAY[(y & 3) * 4 + (x & 3)];

  /* ---------------------------------------------------------------- frame, buffers */
  // begin(ctx): black, and in landscape (?o=h) pillarbox the 1080×1920 design frame. Call first in draw().
  K.begin = function (ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, Pilot.W, Pilot.H);
    if (Pilot.ori !== 'v') { const s = Pilot.H / K.H; ctx.translate((Pilot.W - K.W * s) / 2, 0); ctx.scale(s, s); ctx.beginPath(); ctx.rect(0, 0, K.W, K.H); ctx.clip(); }
    ctx.imageSmoothingEnabled = false;
  };
  const BUF = {};
  // buf(K) → { c, cv, w, h, K }: the K× world buffer (1080/K × 1920/K true pixels), made once per scale, smoothing off.
  K.buf = function (k) {
    if (!BUF[k]) { const w = Math.ceil(K.W / k), h = Math.ceil(K.H / k), cv = Pilot.canvas(w, h), c = cv.getContext('2d'); c.imageSmoothingEnabled = false; BUF[k] = { c, cv, w, h, K: k }; }
    const b = BUF[k]; b.c.setTransform(1, 0, 0, 1, 0, 0); b.c.globalAlpha = 1; b.c.globalCompositeOperation = 'source-over'; return b;
  };
  // present(ctx, b, dx = 0, dy = 0): blow the buffer up nearest-neighbour to the design frame, shifted dx, dy WHOLE buffer px
  // (a shake). The unshifted frame is laid underneath so no black edge shows.
  K.present = function (ctx, b, dx = 0, dy = 0) {
    ctx.imageSmoothingEnabled = false;
    if (dx || dy) ctx.drawImage(b.cv, 0, 0, b.w * b.K, b.h * b.K);
    ctx.drawImage(b.cv, dx * b.K, dy * b.K, b.w * b.K, b.h * b.K);
  };
  // shake(t, at, dur = .25, amp = 1) → [dx, dy] whole buffer px, seeded, on 12 fps; [0, 0] outside [at, at + dur).
  // The style's ONLY camera shake: one impact, ≤ .25 s.
  K.shake = function (t, at, dur = .25, amp = 1) {
    if (!(t >= at && t < at + Math.min(dur, .25))) return [0, 0];
    const r = rng(7 + Math.floor(t * 12)); return [Math.round((r() * 2 - 1) * amp) || (r() < .5 ? -1 : 1), Math.round((r() * 2 - 1) * amp)];
  };
  // fade(ctx, t, dur, fi = .5, fo = .5, steps = 5): from / to black in `steps` flat steps (a pixel-game fade).
  K.fade = function (ctx, t, dur, fi = .5, fo = .5, steps = 5) {
    let k = 1 - (fi > 0 ? ss(0, fi, t) : 1) * (fo > 0 ? 1 - ss(dur - fo, dur, t) : 1); if (k <= 0) return;
    k = Math.ceil(k * steps - 1e-6) / steps; ctx.save(); ctx.fillStyle = `rgba(0,0,0,${k})`; ctx.fillRect(0, 0, K.W, K.H); ctx.restore();
  };

  /* ---------------------------------------------------------------- pixel primitives (buffer px; whole pixels only) */
  // R(c, x, y, w, h, col): a whole-pixel rect.  px(c, x, y, col): one pixel.
  const R = K.R = (c, x, y, w, h, col) => { if (col) c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  K.px = (c, x, y, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); };
  // pxLine(c, x0, y0, x1, y1, th = 1, col): a line of th×th pixel squares (no anti-aliasing).
  K.pxLine = function (c, x0, y0, x1, y1, th = 1, col) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1), o = th >> 1; if (col) c.fillStyle = col;
    for (let i = 0; i <= n; i++) c.fillRect(Math.round(lerp(x0, x1, i / n)) - o, Math.round(lerp(y0, y1, i / n)) - o, th, th);
  };
  // pxPath(c, pts, th, col): an open polyline of pxLines.
  K.pxPath = function (c, pts, th = 1, col) { for (let i = 1; i < pts.length; i++) K.pxLine(c, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], th, col); };
  // quadPts(a, ctrl, b, n) → n+1 points on a quadratic curve; bend(a, b, amt) → the control point amt px off the chord
  // (positive = to the left of a→b). For lines, rods, arms of animals, a thrown arc.
  K.quadPts = function (a, q, b, n = 12) { const o = []; for (let i = 0; i <= n; i++) { const u = i / n, v = 1 - u; o.push([v * v * a[0] + 2 * v * u * q[0] + u * u * b[0], v * v * a[1] + 2 * v * u * q[1] + u * u * b[1]]); } return o; };
  K.bend = function (a, b, amt) { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [(a[0] + b[0]) / 2 + dy / L * amt, (a[1] + b[1]) / 2 - dx / L * amt]; };
  // pxPoly(c, pts, col): scanline fill of a polygon (pixel centres), whole pixels.
  K.pxPoly = function (c, pts, col) {
    let y0 = Infinity, y1 = -Infinity; for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    if (col) c.fillStyle = col; const n = pts.length;
    for (let j = Math.floor(y0); j <= Math.ceil(y1); j++) { const yc = j + .5, xs = [];
      for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; if ((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]); if (xb > xa) c.fillRect(xa, j, xb - xa, 1); } }
  };
  // pxEllipse(c, cx, cy, rx, ry, col): a filled pixel ellipse (centre may be on a half pixel for even widths).
  K.pxEllipse = function (c, cx, cy, rx, ry, col) {
    if (col) c.fillStyle = col;
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) { const v = (j + .5 - cy) / ry; if (Math.abs(v) > 1) continue;
      const hw = rx * Math.sqrt(1 - v * v), xa = Math.round(cx - hw), xb = Math.round(cx + hw); if (xb > xa) c.fillRect(xa, j, xb - xa, 1); }
  };
  // pxCircle(c, cx, cy, r, col) = pxEllipse with rx = ry = r.
  K.pxCircle = (c, cx, cy, r, col) => K.pxEllipse(c, cx, cy, r, r, col);
  // pxRR(c, x, y, w, h, r, col): a pixel rounded rect (corner radius r).
  K.pxRR = function (c, x, y, w, h, r, col) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); if (col) c.fillStyle = col;
    for (let j = 0; j < h; j++) { const dy = j < r ? r - j - .5 : j >= h - r ? j - (h - r) + .5 : 0;
      const ins = dy > 0 ? Math.round(r - Math.sqrt(Math.max(0, r * r - dy * dy))) : 0; if (w - 2 * ins > 0) c.fillRect(x + ins, y + j, w - 2 * ins, 1); }
  };
  // dither(c, x, y, w, h, col, level): fill only the pixels of the rect whose Bayer threshold < level (0..1) — a flat
  // 25 / 50 / 75 % screen of one colour. ditherCircle(c, cx, cy, r, col, level) the same inside a circle.
  K.dither = function (c, x, y, w, h, col, level) {
    x = Math.round(x); y = Math.round(y); c.fillStyle = col;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (K.bayer(x + i, y + j) < level) c.fillRect(x + i, y + j, 1, 1);
  };
  K.ditherCircle = function (c, cx, cy, r, col, level, r0 = 0) {
    cx = Math.round(cx); cy = Math.round(cy); c.fillStyle = col; const R2 = r * r, r02 = r0 * r0;
    for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let i = -Math.ceil(r); i <= Math.ceil(r); i++) { const d = i * i + j * j;
      if (d <= R2 && d >= r02 && K.bayer(cx + i, cy + j) < level) c.fillRect(cx + i, cy + j, 1, 1); }
  };
  // sprite(rows, pal) → canvas: a pixel sprite from strings ('.' = clear, other chars → pal colours). Draw at whole px.
  K.sprite = function (rows, pal) { const h = rows.length, w = rows[0].length, cv = Pilot.canvas(w, h), x = cv.getContext('2d');
    rows.forEach((r, j) => { for (let i = 0; i < w; i++) { const k = r[i]; if (k !== '.' && pal[k]) { x.fillStyle = pal[k]; x.fillRect(i, j, 1, 1); } } });
    return cv; };
  // outline(cv, col, x, y, w, h): give every opaque shape in the region a 1-px outline (4-neighbour) in col — the
  // pixel-art ink line. Works on any canvas (a scratch buffer, a sprite).
  K.outline = function (cv, col, x = 0, y = 0, w = cv.width, h = cv.height) {
    const c = cv.getContext('2d'); x = Math.max(0, x | 0); y = Math.max(0, y | 0); w = Math.min(cv.width - x, w | 0); h = Math.min(cv.height - y, h | 0); if (w <= 0 || h <= 0) return;
    const d = c.getImageData(x, y, w, h), a = d.data, src = new Uint8Array(w * h), [r, g, b] = hx(col);
    for (let i = 0; i < w * h; i++) src[i] = a[i * 4 + 3] > 127 ? 1 : 0;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const p = j * w + i; if (src[p]) continue;
      if ((i > 0 && src[p - 1]) || (i < w - 1 && src[p + 1]) || (j > 0 && src[p - w]) || (j < h - 1 && src[p + w])) { a[p * 4] = r; a[p * 4 + 1] = g; a[p * 4 + 2] = b; a[p * 4 + 3] = 255; } }
    c.putImageData(d, x, y);
  };
  let SCR = null;
  // stamp(c, [x, y, w, h], fn, outlineCol): draw fn(sc) into a scratch buffer IN c's coordinates (the box [x, y, w, h] is
  // what is kept), give it a 1-px outline, then lay it onto c. Use it for characters and props so they read on any ground.
  K.stamp = function (c, box, fn, oc = K.INK) {
    let [x, y, w, h] = box; x = Math.floor(x) - 1; y = Math.floor(y) - 1; w = Math.ceil(w) + 3; h = Math.ceil(h) + 3;
    if (!SCR || SCR.width < w || SCR.height < h) { SCR = Pilot.canvas(Math.max(w, SCR ? SCR.width : 0, 64), Math.max(h, SCR ? SCR.height : 0, 64)); }
    const sc = SCR.getContext('2d'); sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, w, h); sc.imageSmoothingEnabled = false;
    sc.setTransform(1, 0, 0, 1, -x, -y); fn(sc); sc.setTransform(1, 0, 0, 1, 0, 0);
    if (oc) K.outline(SCR, oc, 0, 0, w, h);
    c.drawImage(SCR, 0, 0, w, h, x, y, w, h);
  };

  /* ---------------------------------------------------------------- sky + sea backdrop (dithered bands, cached) */
  // bands(arr, y0, y1, curve) → boundaries; the band painter dithers ±dz rows around each boundary (ordered Bayer).
  function paintBands(d, w, y0, y1, cols, curve, dzk) {
    const n = cols.length, B = [], C = cols.map(hx);
    for (let i = 0; i <= n; i++) B.push(y0 + (y1 - y0) * Math.pow(i / n, curve));
    for (let y = y0; y < y1; y++) {
      let base = 0; while (base < n - 1 && y >= B[base + 1]) base++;
      let lo = base, fr = 0;
      for (let j = 1; j < n; j++) { const dz = Math.max(1, (B[j + 1 < n + 1 ? j + 1 : j] - B[j - 1]) * dzk / 2); if (Math.abs(y + .5 - B[j]) < dz) { lo = j - 1; fr = (y + .5 - (B[j] - dz)) / (2 * dz); break; } }
      const A = C[lo], N = C[Math.min(n - 1, lo + 1)];
      for (let x = 0; x < w; x++) { const c = fr > 0 && K.bayer(x, y) < fr ? N : A, p = (y * w + x) * 4; d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 255; }
    }
  }
  const BACK = new Map();
  // backdrop(c, b, P, hz, o): sky bands (P.sky, top → row hz) and sea bands (P.sea, hz → bottom), dithered between bands,
  // cached per (buffer, palette step, hz). o.skyCurve (.8: upper bands taller), o.seaCurve (1.5), o.dz (.5 of a band).
  K.backdrop = function (c, b, P, hz, o = {}) {
    hz = Math.round(hz); const key = [b.w, b.h, P.key, hz, o.skyCurve, o.seaCurve, o.dz].join('|');
    let cv = BACK.get(key);
    if (!cv) {
      cv = Pilot.canvas(b.w, b.h); const x = cv.getContext('2d'), id = x.createImageData(b.w, b.h);
      if (hz > 0) paintBands(id.data, b.w, 0, Math.min(hz, b.h), P.sky, o.skyCurve ?? .8, o.dz ?? .5);
      if (hz < b.h) paintBands(id.data, b.w, Math.max(0, hz), b.h, P.sea, o.seaCurve ?? 1.5, o.dz ?? .5);
      x.putImageData(id, 0, 0); BACK.set(key, cv); if (BACK.size > 40) BACK.delete(BACK.keys().next().value);
    }
    c.drawImage(cv, 0, 0);
  };
  // underwater(c, b, P, top, bed, o): a cut-away of the water column — P.under bands from row `top` (the surface) to `bed`,
  // dithered, cached; a light 1-px surface line with drifting dashes (t). Draw seabed() after it.
  K.underwater = function (c, b, P, top, bed, t = 0, o = {}) {
    top = Math.round(top); bed = Math.round(bed); const key = ['U', b.w, b.h, P.key, top, bed].join('|');
    let cv = BACK.get(key);
    if (!cv) { cv = Pilot.canvas(b.w, b.h); const x = cv.getContext('2d'), id = x.createImageData(b.w, b.h);
      paintBands(id.data, b.w, Math.max(0, top), b.h, P.under, o.curve ?? 1.2, .6); x.putImageData(id, 0, 0); BACK.set(key, cv); }
    c.drawImage(cv, 0, 0);
    if (top >= 0) { R(c, 0, top, b.w, 1, P.glint2); const q = Math.floor(K.step(t, 6) * 6);
      for (let i = 0; i < b.w; i += 9) { const x = ((i + q) % (b.w + 9)) - 4; R(c, x, top + 1, 4, 1, P.glint); } }
  };
  // shafts(c, t, P, top, bot, list): light from the sun through the surface — slanted dithered bands (25 %) of P.shaft,
  // swaying a pixel on 4 fps. list = [[x at the surface, width, slant px per row]]. Tied to the light: use only under a sun.
  K.shafts = function (c, t, P, top, bot, list) {
    const q = Math.floor(K.step(t, 4) * 4); c.fillStyle = P.shaft;
    for (const [x0, w, sl] of list) for (let y = top + 2; y < bot; y++) { const lv = .3 * (1 - (y - top) / (bot - top)), xx = Math.round(x0 + (y - top) * sl + ((q + x0) % 3 === 0 ? 1 : 0));
      for (let i = 0; i < w; i++) if (K.bayer(xx + i, y) < lv) c.fillRect(xx + i, y, 1, 1); }
  };

  /* ---------------------------------------------------------------- sky pieces */
  const STARS = new Map();
  // stars(c, t, P, o): seeded stars in rows 0 … o.y1 (default 60 % of the buffer): bright ones are pixel pluses that
  // twinkle (arms on/off on 8 fps), faint ones single pixels. How many show = P.star (fades as the sky brightens).
  K.stars = function (c, t, P, o = {}) {
    if (P.star <= .02) return;
    const w = c.canvas.width, y1 = o.y1 ?? Math.round(c.canvas.height * .6), n = o.n ?? 46, key = [w, y1, n, o.seed ?? 3].join('|');
    let S = STARS.get(key); if (!S) { const r = rng(o.seed ?? 3); S = []; for (let i = 0; i < n; i++) S.push({ x: Math.floor(r() * w), y: Math.floor(Math.pow(r(), 1.3) * y1), v: r(), big: r() < .22, ph: Math.floor(r() * 8) }); STARS.set(key, S); }
    const q = Math.floor(K.step(t, 8) * 8);
    for (const s of S) { if (s.v > P.star) continue;
      const col = s.v < .5 ? '#fff6e4' : '#c8b8ff'; K.px(c, s.x, s.y, col);
      if (s.big && ((q + s.ph) % 8) < 5) { K.px(c, s.x - 1, s.y, col); K.px(c, s.x + 1, s.y, col); K.px(c, s.x, s.y - 1, col); K.px(c, s.x, s.y + 1, col); } }
  };
  // cloud(c, x, y, w, P): one flat pixel cloud (a long pill + one or two bumps): lit top row, body, shaded bottom row.
  K.cloud = function (c, x, y, w, P, seed = 1) {
    x = Math.round(x); y = Math.round(y); w = Math.max(8, Math.round(w)); const r = rng(seed), [hi, bo, sh] = P.cloud;
    const parts = [[x, y, w, 4]], bw = Math.round(w * (.35 + r() * .2)), bx = x + Math.round(w * (.15 + r() * .3)); parts.push([bx, y - 3, bw, 4]);
    if (w > 24 && r() < .7) { const cw = Math.round(w * .25); parts.push([x + w - cw - Math.round(w * .1), y - 2, cw, 3]); }
    for (const [px_, py, pw, ph] of parts) K.pxRR(c, px_, py, pw, ph, 2, bo);
    for (const [px_, py, pw] of parts) R(c, px_ + 2, py, pw - 4, 1, hi);
    R(c, x + 2, y + 3, w - 4, 1, sh);
  };
  // clouds(c, t, P, list, speed = .5): drifting clouds [[x, y, w, seed]] moving `speed` px/s, on whole pixels, wrapping.
  K.clouds = function (c, t, P, list, speed = .5) {
    const w = c.canvas.width;
    for (const [x, y, cw, sd] of list) { const xx = ((Math.round(x + K.step(t, 4) * speed) + cw + 10) % (w + cw + 20)) - cw - 10; K.cloud(c, xx, y, cw, P, sd ?? 1); }
  };
  // sun(c, x, y, r, P, hz, o): the big banded sun (P.sun bands top → bottom) with horizontal stripes cut out of its lower
  // half (wider toward the bottom), a dithered halo (two rings — it IS the light source), clipped at the horizon row hz.
  // o.stripes = false for a plain disc; o.halo = 0 for none.
  K.sun = function (c, x, y, r, P, hz, o = {}) {
    x = Math.round(x); y = Math.round(y); r = Math.round(r);
    if (o.halo !== 0) { const hr = r + Math.max(3, Math.round(r * .35)); c.save(); c.beginPath(); c.rect(0, 0, c.canvas.width, hz); c.clip();
      K.ditherCircle(c, x, y, hr, P.halo, .25, r); K.ditherCircle(c, x, y, r + Math.max(2, Math.round(r * .15)), P.halo, .55, r); c.restore(); }
    const cuts = [];
    if (o.stripes !== false) { const st = [[.56, 1], [.66, 1], [.75, 2], [.84, 2], [.92, 3]]; for (const [u, th] of st) cuts.push([y - r + Math.round(2 * r * u), Math.max(1, Math.round(th * r / 14))]); }
    const n = P.sun.length;
    for (let j = -r; j < r; j++) { const yy = y + j; if (yy >= hz) break; if (cuts.some(([cy, th]) => yy >= cy && yy < cy + th)) continue;
      const v = (j + .5) / r, hw = r * Math.sqrt(Math.max(0, 1 - v * v)), xa = Math.round(x - hw), xb = Math.round(x + hw); if (xb <= xa) continue;
      c.fillStyle = P.sun[Math.min(n - 1, Math.floor((j + r) / (2 * r) * n))]; c.fillRect(xa, yy, xb - xa, 1); }
  };
  // islands(c, P, hz, list, seed = 4): low stepped silhouettes on the horizon: [[x, w, h, near?]] (near → P.hillNear).
  K.islands = function (c, P, hz, list, seed = 4) {
    for (const [x0, w, h, near] of list) { c.fillStyle = near ? P.hillNear : P.hillFar;
      for (let i = 0; i < w; i++) { const u = (i + .5) / w, hh = Math.round(h * Math.pow(Math.sin(Math.PI * u), .6) * (.78 + .32 * noise(seed + (x0 + i) * .09, seed * 1.7)));
        if (hh > 0) c.fillRect(Math.round(x0 + i), hz - hh, 1, hh); } }
  };

  /* ---------------------------------------------------------------- sea surface */
  const GL = new Map();
  function glintRows(w, h, hz, seed) {
    const key = [w, h, hz, seed].join('|'); let G = GL.get(key); if (G) return G;
    const r = rng(seed); G = [];
    for (let y = hz + 2; y < h; y += 2 + Math.floor((y - hz) / 26)) {
      const n = 1 + Math.floor(w / 70 + r() * w / 60), dz = (y - hz) / (h - hz);
      for (let i = 0; i < n; i++) G.push({ y, x: r() * (w + 20), len: 2 + Math.floor(r() * (2 + dz * 9)), sp: (r() < .5 ? -1 : 1) * (.3 + r() * .7), ph: Math.floor(r() * 9), per: 6 + Math.floor(r() * 5), near: dz < .18 });
    }
    GL.set(key, G); return G;
  }
  // glints(c, t, P, hz, o): rows of short light dashes on the water (spaced wider with depth), drifting sideways a pixel at
  // a time on 6 fps and blinking. o.seed, o.x0/o.x1 (limit to a column range), o.y0 (start row).
  K.glints = function (c, t, P, hz, o = {}) {
    const w = c.canvas.width, h = c.canvas.height, q = Math.floor(K.step(t, 6) * 6), G = glintRows(w, h, Math.round(hz), o.seed ?? 9);
    const x0 = o.x0 ?? -99, x1 = o.x1 ?? 1e9, y0 = o.y0 ?? 0;
    for (const g of G) { if (g.y < y0 || ((q + g.ph) % g.per) === 0) continue;
      const x = (((Math.round(g.x + q * g.sp) % (w + 20)) + w + 20) % (w + 20)) - 10; if (x + g.len < x0 || x > x1) continue;
      R(c, Math.max(x, x0), g.y, Math.min(x + g.len, x1) - Math.max(x, x0), 1, g.near ? P.glint2 : P.glint); }
  };
  // reflection(c, t, x, hz, r, P, o): the sun's broken reflection column under x: a dash per row (rows thin out with depth),
  // half-width ∝ r, jittered ±1 px and re-cut on 6 fps; colours P.refl by depth. o.len (0..1 of the water) — short when
  // the sun is still under the horizon, long when it is up. o.y0 limits the start row.
  K.reflection = function (c, t, x, hz, r, P, o = {}) {
    const h = c.canvas.height, len = o.len ?? 1, q = Math.floor(K.step(t, 6) * 6); hz = Math.round(hz);
    let j = 0;
    for (let y = hz + 1; y < h; y += 2 + Math.floor((y - hz) / 12), j++) {
      const dz = (y - hz) / (h - hz); if (dz > len) break; if (o.y0 != null && y < o.y0) continue;
      const rr = rng(j * 31 + q * 7 + 1), hw = Math.max(1, Math.round(r * (o.width ?? .62) * (1 - .5 * dz) * (.35 + .65 * rr()))), jx = Math.round((rr() - .5) * 4);
      if (rr() < .14) continue;   // a broken row
      R(c, x - hw + jx, y, 2 * hw, 1, P.refl[Math.min(P.refl.length - 1, Math.floor(dz / Math.max(.05, len) * P.refl.length))]);
    }
  };
  // seaFront(c, b, t, P, hz, x0, y0, x1, y1, o): redraw the sea (bands + glints + optional reflection o.refl = [x, r, len])
  // inside a box — lay it over the lower part of a boat hull, a swimmer, a buoy, so they sit IN the water.
  K.seaFront = function (c, b, t, P, hz, x0, y0, x1, y1, o = {}) {
    c.save(); c.beginPath(); c.rect(Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0)); c.clip();
    K.backdrop(c, b, P, hz, o); K.glints(c, t, P, hz, o); if (o.refl) K.reflection(c, t, o.refl[0], hz, o.refl[1], P, { len: o.refl[2] });
    c.restore(); R(c, x0, y0, x1 - x0, 1, P.glint2);
  };
  // splash(c, t, x, y, at, o): an object entering / leaving the water at (x, y) at time `at`: foam droplets thrown up on a
  // parabola (12 fps) + a ring of foam dashes spreading on the surface row. o.n (10), o.up (px/s, 40), o.seed, o.col.
  K.splash = function (c, t, x, y, at, o = {}) {
    const dt = K.step(t, 12) - at; if (dt < 0 || dt > (o.dur ?? .7)) return;
    const r = rng(o.seed ?? 5), n = o.n ?? 10, up = o.up ?? 40, col = o.col ?? K.FOAM;
    for (let i = 0; i < n; i++) { const vx = (r() - .5) * up * .9, vy = up * (.55 + r() * .6), px_ = x + vx * dt, py = y - vy * dt + 110 * dt * dt; if (py <= y) K.px(c, px_, py, col); }
    if (dt < .6) { const hw = Math.round(2 + dt * 22); R(c, x - hw - 3, y, 3, 1, col); R(c, x + hw, y, 3, 1, col); if (dt < .25) R(c, x - 2, y - 1, 5, 1, col); }
  };
  // wake(c, t, x, y, dir, len = 30): foam dashes trailing behind a moving hull at the surface row y (dir = −1 trails to the left).
  K.wake = function (c, t, x, y, dir, len = 30, col = K.FOAM) {
    const q = Math.floor(K.step(t, 8) * 8);
    for (let i = 0; i < len; i += 4) { const k = i / len, xx = Math.round(x + dir * (i + (q % 4))); if ((i + q) % 8 === 0 && k > .5) continue;
      R(c, xx, y + Math.floor(k * 2), Math.max(1, 3 - Math.floor(k * 3)), 1, col); if (k > .25) R(c, xx - dir, y + 2 + Math.floor(k * 3), 2, 1, col); }
  };
  // bubbles(c, t, x, y, o): bubbles rising from (x, y): o.n (3), o.rise (px/s, 14), o.h (how far before they pop, 30),
  // o.seed, o.col. Tie them to something that breathes or moves (a sinker landing, an animal, a hull).
  K.bubbles = function (c, t, x, y, o = {}) {
    const n = o.n ?? 3, rise = o.rise ?? 14, H = o.h ?? 30, q = K.step(t, 8);
    for (let i = 0; i < n; i++) { const r = rng((o.seed ?? 1) * 17 + i), per = H / rise, ph = r() * per, a = ((q + ph) % per) / per;
      const bx = Math.round(x + (r() - .5) * 4 + Math.sin(a * 9 + i) * 1), by = Math.round(y - a * H);
      if (a > .5 && r() < .5) { R(c, bx, by - 1, 1, 1, o.col ?? '#c8d8ff'); R(c, bx - 1, by, 1, 1, o.col ?? '#c8d8ff'); R(c, bx + 1, by, 1, 1, o.col ?? '#c8d8ff'); R(c, bx, by + 1, 1, 1, o.col ?? '#c8d8ff'); }
      else R(c, bx, by, 1, 1, o.col ?? '#c8d8ff'); }
  };

  /* ---------------------------------------------------------------- land: cliff, seabed */
  // cliff(c, P, x0, x1, top, o): a headland of textured rock from x0 to x1 (buffer px), flat grassy top at row `top`,
  // rounding down into the sea on one side (o.edge 'right' | 'left', o.drop = rows of the rounded drop), seeded speckle
  // texture in P.rock, a 2-px grass lip with blades that also runs down the drop. o.bottom (the buffer bottom).
  K.cliff = function (c, P, x0, x1, top, o = {}) {
    const bot = o.bottom ?? c.canvas.height, edge = o.edge ?? 'right', drop = o.drop ?? 26, r = rng(o.seed ?? 8);
    const prof = []; // left/right x per row
    for (let y = top; y < bot; y++) { const k = clamp((y - top) / drop), bend = Math.round(Math.sqrt(k) * 0 + (1 - Math.cos(k * Math.PI / 2)) * -6 + Math.sin(k * Math.PI) * 5);
      prof.push(edge === 'right' ? [x0, x1 + bend + Math.round(k * 4)] : [x0 - bend - Math.round(k * 4), x1]); }
    prof.forEach(([a, b], j) => R(c, a, top + j, b - a, 1, P.rock[0]));
    for (let i = 0; i < (x1 - x0) * (bot - top) * .16; i++) { const j = Math.floor(r() * (bot - top)), [a, b] = prof[j], x = a + Math.floor(r() * (b - a)); R(c, x, top + j, r() < .5 ? 2 : 1, 1, r() < .55 ? P.rock[1] : P.rock[2]); }
    R(c, x0 - (edge === 'left' ? 0 : 0), top, x1 - x0, 2, P.grass[0]); R(c, x0, top + 2, x1 - x0, 1, P.grass[1]);
    for (let x = x0; x < x1; x += 3 + (x % 2)) R(c, x, top - 1, 1, 1, P.grass[0]);
    for (let j = 0; j < Math.min(drop + 6, prof.length); j++) { const ex = edge === 'right' ? prof[j][1] - 1 : prof[j][0]; R(c, ex, top + j, 1, 1, P.grass[0]); if (j % 3 === 0) R(c, ex + (edge === 'right' ? 1 : -1), top + j, 1, 1, P.grass[1]); }
  };
  // seabed(c, t, P, y, o): sand from row y down (a noisy whole-pixel top edge, a darker lower band, speckles), a few
  // pebbles (o.rocks = [[x, w]]), and seaweed strands (o.weed = [[x, h]]) swaying a pixel at a time on 6 fps.
  K.seabed = function (c, t, P, y, o = {}) {
    const w = c.canvas.width, h = c.canvas.height, sd = o.seed ?? 6, r = rng(sd), q = K.step(t, 6);
    for (const [wx, wh] of (o.weed || [])) for (let j = 0; j < wh; j++) { const sw = Math.round(Math.sin(j * .32 + q * 2.2 + wx) * 2.4 * j / wh);
      R(c, wx + sw, y - j, 1, 1, j % 4 < 2 ? P.weed[0] : P.weed[1]); if (j % 5 === 2) R(c, wx + sw + (j % 10 < 5 ? 1 : -1), y - j, 1, 1, P.weed[1]); }
    for (let x = 0; x < w; x++) { const e = Math.round((noise(x * .08, sd) - .5) * 4); R(c, x, y + e, 1, h - y - e, P.sand[0]); if ((x * 7 + sd) % 5 === 0) R(c, x, y + e, 1, 1, P.sand[2]); }
    for (let x = 0; x < w; x++) { const e = Math.round((noise(x * .05, sd + 3) - .5) * 5); R(c, x, y + 12 + e, 1, h, P.sand[1]); }
    for (let i = 0; i < w * (h - y) * .03; i++) R(c, Math.floor(r() * w), y + 2 + Math.floor(r() * (h - y)), 1, 1, r() < .5 ? P.sand[2] : P.sand[1]);
    for (const [rx, rw] of (o.rocks || [])) { K.pxEllipse(c, rx, y + 1, rw / 2, rw / 3, P.rock[1]); K.pxEllipse(c, rx - 1, y, rw / 2 - 1, rw / 3 - 1, P.rock[2]); R(c, rx - rw / 4, y - rw / 3 + 1, rw / 3, 1, P.sand[2]); }
  };
  // puff(c, t, x, y, at, col): a little cloud of silt kicked up at (x, y) when something lands (8 fps, ~.5 s).
  K.puff = function (c, t, x, y, at, col) {
    const dt = K.step(t, 8) - at; if (dt < 0 || dt > .5) return; const s = Math.round(1 + dt * 10);
    for (const [dx, dy] of [[-s - 1, 0], [s + 1, 0], [-s, -1 - (s >> 1)], [s, -1 - (s >> 1)], [0, -2 - (s >> 1)]]) if ((dx + dy + Math.round(dt * 8)) % 4 !== 3) R(c, x + dx, y + dy, 2, 1, col);
  };

  /* ---------------------------------------------------------------- a boat */
  // boat(c, x, y, len, o) → { stern, bow, deckY, keelY, at(u) }: a small wooden-and-paint fishing skiff side-on, its gunwale
  // row at y, stern at x, bow toward o.f (1 → right). o.col = { hull, shade, stripe, trim, bottom }, o.cabin = { u, w, h }
  // (a wheelhouse at fraction u of the length), o.depth (rows of hull; default ≈ .24 len). Outlined. Lay seaFront over
  // the part below the waterline. at(u) → the deck point at fraction u (to stand figures and props on).
  K.BOAT = { hull: '#ece6dc', shade: '#b9b0bc', stripe: '#3e6fb0', trim: '#5a4a5c', bottom: '#2f3a5a', cabin: '#d8d2cc', cabinS: '#a8a0aa', glass: '#7fb4d0' };
  K.boat = function (c, x, y, len, o = {}) {
    const f = o.f ?? 1, col = { ...K.BOAT, ...(o.col || {}) }, d = o.depth ?? Math.max(5, Math.round(len * .24));
    x = Math.round(x); y = Math.round(y);
    const X = u => Math.round(f > 0 ? x + u * len : x - u * len);
    const sheer = o.sheer ?? Math.max(3, Math.round(len * .06)), top = u => y - Math.round(Math.pow(u, 2.6) * sheer);   // the sheer rises to the bow
    const hull = [[X(0), y], [X(.25), top(.25)], [X(.5), top(.5)], [X(.75), top(.75)], [X(.92), top(.92)], [X(1) + f * 3, top(1) - 1], [X(.93), y + Math.round(d * .55)], [X(.84), y + d], [X(.1), y + d], [X(0), y + d - 3]];
    const minx = Math.min(X(0), X(1) + f * 3) - 2, box = [minx, y - sheer - 4 - (o.cabin ? o.cabin.h : 0), len + 8, d + sheer + 8 + (o.cabin ? o.cabin.h : 0)];
    K.stamp(c, box, s => {
      if (o.cabin) { const cx = X(o.cabin.u), cw = o.cabin.w, ch = o.cabin.h, xa = f > 0 ? cx : cx - cw, yy = top(o.cabin.u) - ch;
        R(s, xa, yy, cw, ch + 1, col.cabin); R(s, f > 0 ? xa + cw - 2 : xa, yy, 2, ch + 1, col.cabinS); R(s, xa - 1, yy, cw + 2, 1, col.trim);
        R(s, xa + 2, yy + 2, Math.max(2, cw - 6), Math.max(1, Math.round(ch * .35)), col.glass); }
      K.pxPoly(s, hull, col.hull);
      s.save(); s.beginPath(); s.rect(minx, y + Math.round(d * .62), len + 8, d); s.clip(); K.pxPoly(s, hull, col.bottom); s.restore();
      s.save(); s.beginPath(); s.rect(minx, y + Math.round(d * .3), len + 8, Math.max(1, Math.round(d * .14))); s.clip(); K.pxPoly(s, hull, col.stripe); s.restore();
      for (let i = 0; i <= 40; i++) { const u = i / 40; R(s, X(u), top(u), 1, 1, col.trim); }
      for (let u = .08; u < .95; u += .12) R(s, X(u), top(u) + 1, 1, 1, col.shade);
      R(s, f > 0 ? X(0) : X(0) - 1, y, 2, Math.round(d * .6), col.shade);
    });
    return { stern: [X(0), y], bow: [X(1), top(1)], deckY: y, keelY: y + d, at: u => [X(u), top(u)] };
  };

  /* ---------------------------------------------------------------- figure rig (buffer px; 10–30 px tall sprites) */
  // Body for a figure h px tall (hat included): head ≈ .32 h, torso ≈ .3 h, legs the rest; 2-bone arms (upper ≈ forearm)
  // and legs; limbs 1 px under 16 px, 2 px from 16. BODY(h) → { head, torso, leg, ua, fa, th, tw, hw }.
  K.BODY = function (h) {
    const head = Math.max(4, Math.round(h * .32)), torso = Math.max(3, Math.round(h * .3)), leg = h - head - torso;
    return { head, torso, leg, ua: h * .19, fa: h * .18, thigh: leg * .54, shin: leg * .54, th: h >= 16 ? 2 : 1, tw: Math.max(3, Math.round(h * .27)), hw: Math.max(4, Math.round(head * .95)) };
  };
  // ik(a, target, l1, l2, pick) → [joint, end]: 2-bone IK with fixed lengths (the target is clamped to reach); pick(j1, j2)
  // chooses the bend. Used by every limb so bones never stretch.
  K.ik = function (a, t, l1, l2, pick) {
    const dx = t[0] - a[0], dy = t[1] - a[1], d = Math.hypot(dx, dy) || 1e-6, dd = clamp(d, Math.abs(l1 - l2) + .3, l1 + l2 - .2);
    const tx = a[0] + dx / d * dd, ty = a[1] + dy / d * dd, an = Math.atan2(ty - a[1], tx - a[0]), b = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
    const j1 = [a[0] + Math.cos(an + b) * l1, a[1] + Math.sin(an + b) * l1], j2 = [a[0] + Math.cos(an - b) * l1, a[1] + Math.sin(an - b) * l1];
    return [pick(j1, j2), [tx, ty]];
  };
  // Pose F = { x, y (ground row under the feet), h, f (facing ±1), hip [x, y], lean (rad, + = forward), feet [far, near],
  // hands [far, near] (null = hanging), eye ('open' | 'shut' | 'wide'), elbow ('down' | 'out') }. Builders below; edit the
  // fields (hands especially) and draw with figure(). joints(F) → { hip, sh, shF, shN, head } (head = top-left of the face).
  K.joints = function (F) {
    const B = K.BODY(F.h), a = F.f * (F.lean || 0), up = [Math.sin(a), -Math.cos(a)], fw = [F.f * Math.cos(a), F.f * Math.sin(a)];
    const sh = [F.hip[0] + up[0] * B.torso, F.hip[1] + up[1] * B.torso];
    return { B, up, fw, hip: F.hip, sh, shN: [sh[0] + fw[0] * .5, sh[1] + 1], shF: [sh[0] - fw[0] * 1, sh[1] + 1], neck: [sh[0] + up[0] * 1, sh[1] + up[1] * 1] };
  };
  // stand(x, y, h, f), walk(x, y, h, f, ph), kneel(x, y, h, f) (far knee down, near foot ahead), sit(x, y, h, f, seatY)
  // (on a bench/gunwale at row seatY, feet on row y), brace(x, y, h, f, k) (feet wide, leaning back by k ∈ 0..1).
  K.stand = (x, y, h, f) => { const B = K.BODY(h); return { x, y, h, f, hip: [x, y - B.leg], lean: .04, feet: [[x - f * .5, y], [x + f * Math.max(1, h * .1), y]], hands: [null, null], eye: 'open' }; };
  K.walk = function (x, y, h, f, ph) {
    const B = K.BODY(h), st = h * .28, feet = [0, .5].map(o => { const p = ((ph + o) % 1 + 1) % 1; let off, up = 0;
      if (p < .55) off = st * (.5 - p / .55); else { const u = (p - .55) / .45; off = st * (-.5 + u); up = Math.round(Math.sin(Math.PI * u) * Math.max(1, h * .08)); }
      return [x + f * off, y - up]; });
    return { x, y, h, f, hip: [x, y - B.leg + (Math.abs(Math.sin(ph * 2 * Math.PI)) > .7 ? 1 : 0)], lean: .1, feet, hands: [null, null], eye: 'open', ph };
  };
  K.kneel = (x, y, h, f) => { const B = K.BODY(h); return { x, y, h, f, hip: [x, y - Math.round(B.thigh)], lean: .12, feet: [[x + f * 1 - f * B.shin, y], [x + f * B.leg * .5, y]], knee: true, hands: [null, null], eye: 'open' }; };
  K.sit = (x, y, h, f, seatY) => { const B = K.BODY(h); return { x, y, h, f, hip: [x, seatY - 1], lean: .02, feet: [[x + f * B.leg * .35, y], [x + f * B.leg * .55, y]], hands: [null, null], eye: 'open' }; };
  K.brace = (x, y, h, f, k = 1) => { const B = K.BODY(h); return { x, y, h, f, hip: [x - f * k * 1, y - B.leg + Math.round(k * 1.5)], lean: -.32 * k, feet: [[x - f * (1 + 2 * k), y], [x + f * (1 + h * .14 * k), y]], hands: [null, null], eye: k > .5 ? 'wide' : 'open' }; };
  // mix(A, B, k): blend two poses (positions lerp; discrete fields switch at .5). Evaluate poses at step(t, 10).
  K.mix = function (A, Bp, k) {
    if (k <= 0) return A; if (k >= 1) return Bp; const l = (a, b) => a && b ? [lerp(a[0], b[0], k), lerp(a[1], b[1], k)] : (k < .5 ? a : b);
    return { ...(k < .5 ? A : Bp), hip: l(A.hip, Bp.hip), lean: lerp(A.lean || 0, Bp.lean || 0, k), feet: [l(A.feet[0], Bp.feet[0]), l(A.feet[1], Bp.feet[1])], hands: [l(A.hands[0], Bp.hands[0]), l(A.hands[1], Bp.hands[1])] };
  };
  // hangHands(F) → [far, near] resting hand points (arms hanging, a little forward).
  K.hangHands = function (F) { const J = K.joints(F); return [[J.shF[0] + F.f * .5, J.shF[1] + J.B.ua + J.B.fa - 1.5], [J.shN[0] + F.f * 1, J.shN[1] + J.B.ua + J.B.fa - 1.5]]; };
  // PERSON: a default palette (any film passes its own): skin, skinS, hair, top, topS (back/far arm), topHi (near arm),
  // pants, shoe, hat, hatS, hatStyle 'bucket' | 'cap' | 'none'.
  K.PERSON = { skin: '#f2c49a', skinS: '#cf9672', hair: '#2a1d24', top: '#3b4a7a', topS: '#2a3560', topHi: '#53649a', pants: '#3a3746', shoe: '#1e1a24', hat: null, hatS: null, hatStyle: 'none' };
  // figure(c, F, pal, o) → joints: draws the figure on the pixel grid, outlined in K.INK. Order: far arm · legs · torso ·
  // head (hair, face, eye, hat) · o.mid() · near arm · o.front(). Hands are drawn AT their targets (2-bone IK) — put a
  // held object's grip there. o.outline = false to skip the ink line.
  K.figure = function (c, F, pal = K.PERSON, o = {}) {
    const J = K.joints(F), B = J.B, f = F.f, th = B.th, hh = K.hangHands(F);
    const hands = [F.hands[0] || hh[0], F.hands[1] || hh[1]];
    const elbowPick = F.elbow === 'out' ? (a, b) => (f * a[0] > f * b[0] ? a : b) : (a, b) => (a[1] > b[1] ? a : b), kneePick = (a, b) => (f * a[0] > f * b[0] ? a : b);
    const arms = [J.shF, J.shN].map((s, i) => { const [el, hd] = K.ik(s, hands[i], B.ua, B.fa, elbowPick); return { s, el, hd }; });
    const legs = F.feet.map((ft, i) => { const ank = [ft[0], ft[1] - 1]; if (F.knee && i === 0) { const kn = [F.hip[0] + f * 1, ft[1] - 1]; return { kn, an: [ft[0], ft[1] - 1], kneelBack: true }; }
      const [kn, an] = K.ik(F.hip, ank, B.thigh, B.shin, kneePick); return { kn, an }; });
    const all = [F.hip, J.sh, ...hands, ...F.feet, ...arms.map(a => a.el), ...legs.map(l => l.kn)];
    const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    const box = [Math.min(...xs) - B.hw - 3, Math.min(...ys) - B.head - 4, Math.max(...xs) - Math.min(...xs) + 2 * B.hw + 6, Math.max(...ys) - Math.min(...ys) + B.head + 8];
    const draw = s => {
      const limb = (a, m, e, col, w) => { K.pxLine(s, a[0], a[1], m[0], m[1], w, col); K.pxLine(s, m[0], m[1], e[0], e[1], w, col); };
      const hand = (p, col) => R(s, Math.round(p[0]) - (th > 1 ? 1 : 0), Math.round(p[1]) - (th > 1 ? 1 : 0), th > 1 ? 2 : 1, th > 1 ? 2 : 1, col);
      // far arm
      limb(arms[0].s, arms[0].el, arms[0].hd, pal.topS, th); hand(arms[0].hd, pal.skinS);
      // legs (far darker), shoes toe-forward
      legs.forEach((L, i) => { const col = i === 0 ? mixHex(pal.pants, '#000000', .25) : pal.pants;
        if (L.kneelBack) { K.pxLine(s, F.hip[0], F.hip[1], L.kn[0], L.kn[1], th, col); K.pxLine(s, L.kn[0], L.kn[1], L.an[0], L.an[1], th, col); R(s, L.an[0] - f * 1, L.an[1], 2, 1, pal.shoe); return; }
        limb(F.hip, L.kn, L.an, col, th); R(s, Math.round(L.an[0]) - (f > 0 ? 0 : 1), Math.round(L.an[1]), Math.max(2, th + 1), 1, pal.shoe); });
      // torso: a leaning quad hip → shoulders, back column shaded
      const hw0 = B.tw * .42, hw1 = B.tw * .5, nx = -J.up[1], ny = J.up[0];
      K.pxPoly(s, [[F.hip[0] - nx * hw0, F.hip[1] - ny * hw0 + 1], [F.hip[0] + nx * hw0, F.hip[1] + ny * hw0 + 1], [J.sh[0] + nx * hw1, J.sh[1] + ny * hw1], [J.sh[0] - nx * hw1, J.sh[1] - ny * hw1]], pal.top);
      const bx = f > 0 ? Math.min(F.hip[0], J.sh[0]) - hw1 : Math.max(F.hip[0], J.sh[0]) + hw1 - 1;
      K.pxLine(s, bx + f * .5, J.sh[1] + 1, bx + f * .5 + (F.hip[0] - J.sh[0]), F.hip[1], 1, pal.topS);
      // head: skin block, hair at the back and top, eye at the front, hat
      const hw = B.hw, hd = B.head, hx0 = Math.round(J.neck[0] - hw / 2 + f * .5), hy0 = Math.round(J.neck[1] - hd);
      R(s, hx0, hy0, hw, hd, pal.skin); R(s, f > 0 ? hx0 + hw - 1 : hx0, hy0 + hd - 1, 1, 1, pal.skinS);
      R(s, hx0, hy0, hw, Math.max(1, Math.round(hd * .3)), pal.hair); R(s, f > 0 ? hx0 : hx0 + hw - Math.max(1, Math.round(hw * .3)), hy0, Math.max(1, Math.round(hw * .3)), Math.round(hd * .6), pal.hair);
      const ey = hy0 + Math.round(hd * .5), ex = f > 0 ? hx0 + hw - 2 : hx0 + 1;
      if (F.eye === 'shut') R(s, ex - (f > 0 ? 0 : 0), ey, 1, 1, pal.skinS); else R(s, ex, ey - (F.eye === 'wide' && hd >= 6 ? 1 : 0), 1, F.eye === 'wide' && hd >= 6 ? 2 : 1, K.INK);
      if (pal.hatStyle === 'bucket') { const cr = Math.max(2, Math.round(hd * .42)); R(s, hx0, hy0 - 1, hw, cr, pal.hat); R(s, hx0 + 1, hy0 - 2, hw - 2, 1, pal.hat); R(s, hx0 - 1, hy0 - 1 + cr, hw + 2, 1, pal.hatS || pal.hat); }
      else if (pal.hatStyle === 'cap') { R(s, hx0, hy0 - 1, hw, 2, pal.hat); R(s, f > 0 ? hx0 + hw : hx0 - 2, hy0, 2, 1, pal.hatS || pal.hat); }
      if (o.mid) o.mid(s, J);
      // near arm
      limb(arms[1].s, arms[1].el, arms[1].hd, pal.topHi, th); hand(arms[1].hd, pal.skin);
      if (o.front) o.front(s, J);
    };
    if (o.outline === false) draw(c); else K.stamp(c, box, draw, K.INK);
    return { ...J, hands: arms.map(a => a.hd), elbows: arms.map(a => a.el), knees: legs.map(l => l.kn) };
  };
  // pole(c, a, ang, len, bendPx, col, th) → { tip, pts, at(u) }: a rod/pole/oar from a (the butt) at angle ang (rad, 0 =
  // right, −π/2 = up), bent sideways by bendPx at the tip (a loaded rod bends toward its line). at(u) = the point at
  // fraction u (grips). Draw it, then put the hands at at(u) — or draw it inside figure's o.mid so it sits between arms.
  K.polePts = function (a, ang, len, bend = 0, n = 10) {
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx, pts = [];
    for (let i = 0; i <= n; i++) { const u = i / n, b = bend * u * u; pts.push([a[0] + dx * len * u + nx * b, a[1] + dy * len * u + ny * b]); }
    return { pts, tip: pts[n], at: u => { const k = clamp(u) * n, i = Math.min(n - 1, Math.floor(k)), f = k - i; return [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)]; } };
  };
  K.pole = function (c, a, ang, len, bend, col, th = 1) { const P = K.polePts(a, ang, len, bend); K.pxPath(c, P.pts, th, col); return P; };

  /* ---------------------------------------------------------------- close-up portrait insert */
  // portrait(c, cx, cy, u, o): a big pixel bust (head ≈ 13·u px wide) with an ink outline — the hard-cut insert on a beat.
  // cx, cy = centre of the face. o = { pal (PERSON-like), f (±1 the way the face turns), mouth 'calm' | 'o' | 'grin' |
  // 'set', brows (0 calm … 1 raised), look [dx, dy] (pupil shift, −1..1), blink (bool), sweat (bool), hatStyle }.
  K.portrait = function (c, cx, cy, u, o = {}) {
    const pal = { ...K.PERSON, ...(o.pal || {}) }, f = o.f ?? 1, U = v => Math.round(v * u);
    cx = Math.round(cx); cy = Math.round(cy);
    const hw = U(6.5), top = cy - U(7), chin = cy + U(7.5);
    K.stamp(c, [cx - U(16), top - U(5), U(32), c.canvas.height - top + U(5)], s => {
      // shoulders and top (to the bottom of the buffer)
      const SH = [[cx - U(15.5), c.canvas.height + 2], [cx - U(14), chin + U(7)], [cx - U(11), chin + U(4)], [cx - U(4.5), chin + U(1.6)], [cx + U(4.5), chin + U(1.6)], [cx + U(11), chin + U(4)], [cx + U(14), chin + U(7)], [cx + U(15.5), c.canvas.height + 2]];
      K.pxPoly(s, SH, pal.top);
      K.pxPoly(s, [[cx - f * U(15.5), c.canvas.height + 2], [cx - f * U(14), chin + U(7)], [cx - f * U(11), chin + U(4)], [cx - f * U(9), chin + U(3.4)], [cx - f * U(11.5), chin + U(8)], [cx - f * U(11.5), c.canvas.height + 2]], pal.topS);
      K.pxLine(s, cx + f * U(9), chin + U(9), cx + f * U(9.5), c.canvas.height, 1, pal.topS);
      R(s, cx - U(2.5), chin - U(1), U(5), U(3), pal.skinS);                                // neck
      K.pxPoly(s, [[cx - U(3.5), chin + U(1)], [cx, chin + U(3.2)], [cx + U(3.5), chin + U(1)]], pal.skinS);
      R(s, cx - U(2), chin + U(3), 1, U(3), pal.topHi); R(s, cx + U(2), chin + U(3), 1, U(3), pal.topHi);   // collar strings
      // face: a pixel jaw
      K.pxPoly(s, [[cx - hw, top + U(2)], [cx + hw, top + U(2)], [cx + hw, cy + U(3)], [cx + U(3.5), chin], [cx - U(3.5), chin], [cx - hw, cy + U(3)]], pal.skin);
      K.pxPoly(s, [[cx - f * hw, top + U(2)], [cx - f * (hw - U(1.4)), top + U(2)], [cx - f * (hw - U(1.4)), cy + U(3)], [cx - f * U(2.5), chin], [cx - f * U(3.5), chin], [cx - f * hw, cy + U(3)]], pal.skinS);
      R(s, f > 0 ? cx - hw - U(1.2) : cx + hw, cy - U(1), U(1.2), U(3), pal.skinS);          // ear
      // hair under the hat
      R(s, cx - hw, top + U(1), U(13), U(1.6), pal.hair); R(s, f > 0 ? cx - hw : cx + hw - U(2), top + U(1), U(2), U(5), pal.hair);
      for (let i = 0; i < 4; i++) R(s, cx - hw + U(2.6 + i * 2.6), top + U(2.4), U(1.2), U(.8), pal.hair);
      // eyes, brows, nose, mouth
      const eyY = cy - U(.5), br = (o.brows ?? 0), lk = o.look || [f * .5, 0];
      for (const sx of [-1, 1]) { const ex = cx + sx * U(3) + f * U(.6);
        if (o.blink) R(s, ex - U(1.2), eyY + U(1), U(2.6), 1, K.INK);
        else { R(s, ex - U(1.4), eyY, U(2.8), U(2), '#fbf6ee'); R(s, ex - U(.6) + Math.round(lk[0] * U(.8)), eyY + Math.round(lk[1] * U(.4)), U(1.3), U(2), K.INK); }
        R(s, ex - U(1.4) + (sx * f > 0 ? U(.3) : 0), eyY - U(1.3) - Math.round(br * U(.6)), U(2.6), Math.max(1, U(.6)), pal.hair); }
      R(s, cx + f * U(1), cy + U(1.5), Math.max(1, U(.8)), U(1.4), pal.skinS);
      const my = cy + U(4.3), mo = o.mouth || 'calm';
      if (mo === 'o') { R(s, cx - U(1.2), my - U(.6), U(2.4), U(2.4), K.INK); R(s, cx - U(.6), my + U(.6), U(1.2), U(.8), '#a4384a'); }
      else if (mo === 'grin') { R(s, cx - U(2.4), my - U(.4), U(4.8), U(1.8), K.INK); R(s, cx - U(1.8), my - U(.4), U(3.6), Math.max(1, U(.6)), '#fbf6ee'); }
      else if (mo === 'set') R(s, cx - U(1.4), my, U(2.8), Math.max(1, U(.6)), K.INK);
      else R(s, cx - U(1.8), my, U(3.6), Math.max(1, U(.6)), '#8a4a48');
      // hat
      const hs = o.hatStyle ?? pal.hatStyle;
      if (hs === 'bucket') { K.pxPoly(s, [[cx - U(5.5), top - U(3.8)], [cx + U(5.5), top - U(3.8)], [cx + U(6.6), top + U(1.2)], [cx - U(6.6), top + U(1.2)]], pal.hat);
        R(s, cx - U(5), top - U(4.6), U(10), U(1), pal.hat);
        K.pxPoly(s, [[cx - U(8.6), top + U(2.6)], [cx - U(6.8), top + U(.8)], [cx + U(6.8), top + U(.8)], [cx + U(8.6), top + U(2.6)]], pal.hatS || pal.hat);
        R(s, cx - U(6.4), top + U(.2), U(12.8), Math.max(1, U(.6)), pal.hatS || pal.hat);
        R(s, cx - f * U(4.5), top - U(3), Math.max(1, U(.8)), U(2.6), mixHex(pal.hat, '#ffffff', .35)); }
      else if (hs === 'cap') { K.pxPoly(s, [[cx - hw - U(.3), top + U(1.6)], [cx - hw + U(.8), top - U(2.2)], [cx - U(2), top - U(3.4)], [cx + U(2), top - U(3.4)], [cx + hw - U(.8), top - U(2.2)], [cx + hw + U(.3), top + U(1.6)]], pal.hat);
        K.pxPoly(s, [[cx + f * U(1), top + U(.6)], [cx + f * (hw + U(4.5)), top + U(1.2)], [cx + f * (hw + U(4)), top + U(2.4)], [cx + f * U(1), top + U(2)]], pal.hatS || pal.hat);
        R(s, cx - f * U(3.5), top - U(2.2), Math.max(1, U(.8)), U(2.4), mixHex(pal.hat, '#ffffff', .3)); }
      if (o.sweat) { const sx = cx + f * (hw + U(1.6)), sy = top + U(3.2); R(s, sx, sy, U(1), U(1), '#bfe4ff'); R(s, sx - U(.5), sy + U(1), U(2), U(1.6), '#bfe4ff'); R(s, sx, sy + U(1), Math.max(1, U(.5)), U(.6), '#ffffff'); }
    }, K.INK);
  };

  /* ---------------------------------------------------------------- words: pixel Korean, bitmap Latin, UI boxes */
  // Korean needs a real font: pixelText renders it with Do Hyeon at size/tpx px, cuts the anti-aliasing (alpha ≥ .45 →
  // solid, else clear) and blows it up tpx× nearest-neighbour — hard pixel edges on a tpx grid. Cached (LRU 96).
  const TX = new Map();
  function textBitmap(s, size, tpx, col, weight) {
    const key = [s, size, tpx, col, weight].join('|'); let bm = TX.get(key); if (bm) { TX.delete(key); TX.set(key, bm); return bm; }
    const fs = Math.round(size / tpx), font = `${weight || 400} ${fs}px ${K.FONT}`, m = Pilot.canvas(4, 4).getContext('2d'); m.font = font;
    const w = Math.max(1, Math.ceil(m.measureText(s).width) + 2), h = Math.ceil(fs * 1.3) + 2, cv = Pilot.canvas(w, h), x = cv.getContext('2d');
    x.font = font; x.textBaseline = 'alphabetic'; x.fillStyle = '#fff'; x.fillText(s, 1, Math.round(fs * 1.02));
    const d = x.getImageData(0, 0, w, h), a = d.data, [r, g, b] = hx(col);
    for (let i = 0; i < a.length; i += 4) { const on = a[i + 3] >= 115; a[i] = r; a[i + 1] = g; a[i + 2] = b; a[i + 3] = on ? 255 : 0; }
    x.putImageData(d, 0, 0); bm = { cv, w: w * tpx, h: h * tpx, base: Math.round(fs * 1.02) * tpx }; TX.set(key, bm); if (TX.size > 96) TX.delete(TX.keys().next().value);
    return bm;
  }
  // pixelText(ctx, s, x, y, o) → width (design px): s as given (translate first — Pilot.tr — then slice); x, y = left or
  // centre (o.align) and the baseline. o = { size 60, tpx 3, color CREAM, shadow (colour of a hard 1-text-pixel drop
  // shadow down-right), weight }. Positions are snapped to the tpx grid.
  K.pixelText = function (ctx, s, x, y, o = {}) {
    const tpx = o.tpx ?? 3, size = o.size ?? 60, bm = textBitmap(String(s), size, tpx, o.color || K.CREAM, o.weight);
    let x0 = o.align === 'center' ? x - bm.w / 2 : o.align === 'right' ? x - bm.w : x; x0 = Math.round(x0 / tpx) * tpx; const y0 = Math.round((y - bm.base) / tpx) * tpx;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (o.shadow) { const sb = textBitmap(String(s), size, tpx, o.shadow, o.weight); ctx.drawImage(sb.cv, x0 + tpx, y0 + tpx, sb.w, sb.h); }
    ctx.drawImage(bm.cv, x0, y0, bm.w, bm.h); ctx.restore(); return bm.w;
  };
  // measure(s, o) → the width pixelText would draw.
  K.measure = (s, o = {}) => textBitmap(String(s), o.size ?? 60, o.tpx ?? 3, o.color || K.CREAM, o.weight).w;
  // text(ctx, s, x, y, o): pixelText through Pilot.tr (any whole on-screen string).
  K.text = (ctx, s, x, y, o = {}) => K.pixelText(ctx, Pilot.tr(s), x, y, o);

  // A 5×7 bitmap font for Latin capitals, digits and a little punctuation (tags, counters, impact words).
  const G5 = {
    A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01110100011000010000100001000101110',
    D: '11110100011000110001100011000111110', E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000',
    G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001', I: '01110001000010000100001000010001110',
    J: '00111000100001000010000101001001100', K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111',
    M: '10001110111010110101100011000110001', N: '10001110011010110011100011000110001', O: '01110100011000110001100011000101110',
    P: '11110100011000111110100001000010000', Q: '01110100011000110001101011001001101', R: '11110100011000111110101001001010001',
    S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100', U: '10001100011000110001100011000101110',
    V: '10001100011000110001100010101000100', W: '10001100011000110101101011010101010', X: '10001100010101000100010101000110001',
    Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111',
    0: '01110100011001110101110011000101110', 1: '00100011000010000100001000010001110', 2: '01110100010000100010001000100011111',
    3: '11110000010000101110000010000111110', 4: '00010001100101010010111110001000010', 5: '11111100001111000001000011000101110',
    6: '00110010001000011110100011000101110', 7: '11111000010001000100010000100001000', 8: '01110100011000101110100011000101110',
    9: '01110100011000101111000010001001100', '!': '00100001000010000100001000000000100', '?': '01110100010000100010001000000000100',
    '.': '00000000000000000000000000000000100', ',': '00000000000000000000000000010001000', ':': '00000001000000000000000000010000000',
    '-': '00000000000000011111000000000000000', '+': '00000001000010011111001000010000000', '×': '00000100010101000100010101000100000',
    '/': '00001000010001000100010001000010000', "'": '00100001000100000000000000000000000', ' ': '00000000000000000000000000000000000',
  };
  K.GLYPHS = G5;
  // glyphGrid(s, bold) → { w, h, on(x, y) }: a string as a cell grid (5×7 per glyph, 1 cell apart; bold doubles the stems).
  function glyphGrid(s, bold) {
    const ch = Array.from(String(s).toUpperCase()), gw = bold ? 6 : 5, w = ch.length * (gw + 1) - 1, cells = new Uint8Array(Math.max(1, w) * 7);
    ch.forEach((c, k) => { const g = G5[c] || G5['?']; for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (g[y * 5 + x] === '1') { cells[y * w + k * (gw + 1) + x] = 1; if (bold) cells[y * w + k * (gw + 1) + x + 1] = 1; } });
    return { w, h: 7, on: (x, y) => x >= 0 && y >= 0 && x < w && y < 7 && cells[y * w + x] === 1 };
  }
  const BT = new Map();
  // bitText(ctx, s, x, y, o) → width: Latin/digits in the 5×7 font, cell = o.px design px (default UI = 4); x = left (or
  // centre with o.align 'center'), y = top. o = { px, color, bold, outline (colour, 1 cell), shadow (colour, 1 cell down-right),
  // lo (a second fill colour for the lower rows — the two-tone impact look) }.
  K.bitText = function (ctx, s, x, y, o = {}) {
    const px = o.px ?? K.UI, key = [s, o.color, o.bold, o.outline, o.shadow, o.lo].join('|');
    let cv = BT.get(key);
    if (!cv) { const g = glyphGrid(s, o.bold), pad = 2; cv = Pilot.canvas(g.w + 2 * pad, g.h + 2 * pad); const x2 = cv.getContext('2d');
      const lay = (dx, dy, col, grow) => { x2.fillStyle = col; for (let j = -1; j <= g.h; j++) for (let i = -1; i <= g.w; i++) {
        let on = g.on(i, j); if (!on && grow) on = g.on(i - 1, j) || g.on(i + 1, j) || g.on(i, j - 1) || g.on(i, j + 1) || g.on(i - 1, j - 1) || g.on(i + 1, j + 1) || g.on(i - 1, j + 1) || g.on(i + 1, j - 1);
        if (on) x2.fillRect(i + pad + dx, j + pad + dy, 1, 1); } };
      if (o.shadow) lay(1, 1, o.shadow, !!o.outline);
      if (o.outline) lay(0, 0, o.outline, true);
      lay(0, 0, o.color || K.CREAM, false);
      if (o.lo) { x2.save(); x2.beginPath(); x2.rect(0, pad + 4, cv.width, cv.height); x2.clip(); lay(0, 0, o.lo, false); x2.restore(); }
      BT.set(key, cv); if (BT.size > 64) BT.delete(BT.keys().next().value); }
    const w = (cv.width - 4) * px; let x0 = o.align === 'center' ? x - w / 2 : x; x0 = Math.round(x0 / px) * px;
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(cv, x0 - 2 * px, Math.round(y / px) * px - 2 * px, cv.width * px, cv.height * px); ctx.restore();
    return w;
  };
  // box(ctx, x, y, w, h, o): the pixel UI box on the design frame, snapped to the UI grid: hard shadow (1 UI px down-right),
  // outer ink ring, dark fill, a 1-UI-px light border inset. o = { fill '#1c1430', border CREAM, ink INK, shadow '#0d0818' }.
  K.box = function (ctx, x, y, w, h, o = {}) {
    const u = K.UI, sn = v => Math.round(v / u) * u; x = sn(x); y = sn(y); w = sn(w); h = sn(h); if (w <= 0 || h <= 0) return;
    ctx.fillStyle = o.shadow ?? '#0d0818'; ctx.fillRect(x + u, y + u, w, h);
    ctx.fillStyle = o.ink ?? K.INK; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = o.border ?? K.CREAM; ctx.fillRect(x + u, y + u, w - 2 * u, h - 2 * u);
    ctx.fillStyle = o.fill ?? '#1c1430'; ctx.fillRect(x + 2 * u, y + 2 * u, w - 4 * u, h - 4 * u);
  };
  // tag(ctx, s, x, y, o): the small label that sits on a box's top-left edge (the reference's year tag): 5×7 text in ink on
  // a teal plate. Use digits / Latin (a time, a level, 'HIT'). o.color (plate), o.ink.
  K.tag = function (ctx, s, x, y, o = {}) {
    const u = K.UI, w = (glyphGrid(s).w + 4) * u, h = 11 * u;
    K.box(ctx, x, y, w, h, { fill: o.color ?? K.TAG, border: o.color ?? K.TAG, ink: K.INK });
    K.bitText(ctx, s, x + 2 * u, y + 2 * u, { px: u, color: o.ink ?? K.INK });
    return w;
  };
  // captions(ctx, t, lines, o): SCRIPT.lines [from, to, text, tag?] as pixel caption boxes: the box opens in 3 steps
  // (12 fps), the text types in (o.cps chars/s; Pilot.chars, so any language), the box snaps shut at `to` (2 steps). The tag
  // (4th field, e.g. '05:40') sits on the top-left edge. Placement: o.cx (centre, 500 — clear of the right 140 px), o.y
  // (box top, 300), o.size (60), o.tpx (3), o.cps (22). Two lines with '\n'. No fades — pixel UI pops.
  K.captions = function (ctx, t, lines, o = {}) {
    for (const ln of lines) { const [a, b, s0, tg] = ln; if (t < a || t >= b) continue; K.caption(ctx, t - a, b - a, Pilot.tr(s0), tg, o); }
  };
  // caption(ctx, dt, life, s, tag, o): one caption box dt s after it opened (s already translated). Used by captions().
  K.caption = function (ctx, dt, life, s, tg, o = {}) {
    const u = K.UI, size = o.size ?? 60, tpx = o.tpx ?? 3, cps = o.cps ?? 22, ls = String(s).split('\n'), lh = Math.round(size * 1.25 / u) * u;
    const tw = Math.max(...ls.map(l => K.measure(l, { size, tpx }))), w = tw + 12 * u, h = ls.length * lh + 9 * u, cx = o.cx ?? 500, y = o.y ?? 300;
    const q = Math.floor(dt * 12 + 1e-6), qe = Math.floor((life - dt) * 12 + 1e-6), op = Math.min(1, (q + 1) / 3, (qe + 1) / 2);
    const bh = Math.round(h * op / u) * u, x = Math.round((cx - w / 2) / u) * u, yb = y + Math.round((h - bh) / 2 / u) * u;
    K.box(ctx, x, yb, w, bh, o);
    if (op < 1) return;
    let left = Math.floor(Math.max(0, dt - .2) * cps) + 1;
    ls.forEach((l, i) => { const chars = Pilot.chars(l), n = Math.min(chars.length, left); left -= chars.length;
      if (n > 0) K.pixelText(ctx, chars.slice(0, n).join(''), x + 6 * u, y + 5 * u + i * lh + Math.round(size * .78), { size, tpx, color: o.color || K.CREAM, shadow: '#000000' }); });
    if (tg) K.tag(ctx, tg, x - u, y - 7 * u, o.tagOpts || {});
  };
  // impact(ctx, t, s, cx, cy, at, o): a chunky pixel impact word ('HIT!') — bold 5×7 letters, two-tone gold fill, ink outline,
  // a hard coloured drop shadow; letters slam in one by one (o.every .05 s) dropping 2 cells and landing on 12 fps,
  // alternate letters sit a cell high/low; gone at o.until. o.px (cell, 16), o.cols [hi, lo], o.shadow.
  K.impact = function (ctx, t, s, cx, cy, at, o = {}) {
    if (t < at || t >= (o.until ?? at + 1.5)) return;
    const px = o.px ?? 16, ch = Array.from(String(s)), gw = 7 * px, tot = ch.length * gw - px, q = K.step(t, 12) - at, every = o.every ?? .05;
    ch.forEach((c, i) => { const ti = q - i * every; if (ti < 0) return;
      const drop = ti < 1 / 12 ? -2 : ti < 2 / 12 ? 1 : 0, wob = (i % 2 ? -1 : 1) * (o.wobble ?? 1);
      K.bitText(ctx, c, cx - tot / 2 + i * gw, cy + (drop + wob) * px, { px, bold: true, color: (o.cols || K.GOLD)[0], lo: (o.cols || K.GOLD)[1], outline: K.INK, shadow: o.shadow ?? '#4a1f5c' }); });
  };
  // counter(ctx, t, n, x, y, at, o): a small '×n' box (centre x, top y) that pops one UI pixel up and flashes its number
  // white when n changes at `at`. o.icon(ctx, x, y, u) draws an icon at the box's left (design px, UI pixel u). o.px (6).
  K.counter = function (ctx, t, n, x, y, at, o = {}) {
    const u = K.UI, px = o.px ?? 6, s = '×' + n, tw = glyphGrid(s).w * px, iw = o.icon ? (o.iconW ?? 10) * u : 0, w = tw + iw + 8 * u, h = 7 * px + 6 * u;
    const dq = Math.floor((t - at) * 12), up = dq >= 0 && dq < 2 ? u : 0, x0 = Math.round((x - w / 2) / u) * u, y0 = y - up;
    K.box(ctx, x0, y0, w, h, o);
    if (o.icon) o.icon(ctx, x0 + 3 * u, y0 + 3 * u, u);
    K.bitText(ctx, s, x0 + 4 * u + iw, y0 + 3 * u, { px, color: dq >= 0 && dq < 3 ? '#ffffff' : (o.color ?? K.GOLD[1]), shadow: '#000000' });
    return [x0, y0, w, h];
  };
  // endCard(ctx, t, card, at, o): the end card as a pixel UI panel that opens in steps at design y o.y (840): kicker,
  // title (big, up to 2 lines), passage, by — Do Hyeon cut to pixels. card = SCRIPT.endCard. o.cx (520).
  K.endCard = function (ctx, t, card, at, o = {}) {
    if (t < at) return; const u = K.UI, dt = t - at, q = Math.floor(dt * 12), cx = o.cx ?? 520, y = o.y ?? 840;
    const tl = String(Pilot.tr(card.title || '')).split('\n'), w = 880, lh = 104, h = (card.kicker ? 70 : 0) + tl.length * lh + 200;
    const op = Math.min(1, (q + 1) / 4), bh = Math.round(h * op / u) * u;
    K.box(ctx, cx - w / 2, y - h / 2 + (h - bh) / 2, w, bh, o); if (op < 1) return;
    let yy = y - h / 2 + 40;
    if (card.kicker) { K.text(ctx, card.kicker, cx, yy + 34, { size: 34, tpx: 2, align: 'center', color: '#c8bce0' }); yy += 70; }
    tl.forEach((l, i) => K.pixelText(ctx, l, cx, yy + 84 + i * lh, { size: 84, tpx: 4, align: 'center', color: K.CREAM, shadow: '#000000' }));
    yy += tl.length * lh;
    if (dt > .35 && card.passage) K.text(ctx, card.passage, cx, yy + 62, { size: 40, tpx: 2, align: 'center', color: K.GOLD[0] });
    if (dt > .55 && card.by) K.text(ctx, card.by, cx, yy + 118, { size: 34, tpx: 2, align: 'center', color: '#c8bce0' });
  };

  window.Pixelsea = K;
})();

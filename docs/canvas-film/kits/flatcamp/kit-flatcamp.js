/* kit-flatcamp.js — house style "flat geometric pixel diorama / campfire night" for word-log films (global: window.Flatcamp).
   The world is painted on a COARSE PIXEL GRID — whole-pixel rects and scanline polygons only, no anti-aliasing — into a
   small buffer, then blown up nearest-neighbour at an integer scale per shot (13× close-up … 6× wide). The camera CUTS
   between pixel scales and pans in whole pixels, like a pixel game. Characters (the lab's little hooded wanderers) move
   on twos (8 drawings/s); falling and flying things on 12s. A dark blobby frame (the lab's) is always over the picture:
   we watch the forest through it. The blue night is the whole palette; the warm accent is campfire orange. Light is the
   lab's campfire grammar: a PALETTE SWAP inside a pixel circle with a dithered rim (near the fire the forest turns
   green / lilac), plus rising ember pixels.
   First film: sermons/2026-10-24-cross-styles/film/scenes/cs-flatcamp.html (잘라 낸 건 다리였다 · 05, the worked example).
   Style card: styles/flatcamp/STYLE.md. Template: styles/flatcamp/template.html.

   HOW A FRAME IS MADE
     const bb = Flatcamp.bufs(K);                              the K× buffers (n night, l lit, m mask, tmp)
     Flatcamp.setView(K, camX, camY, shx, shy);                 the shot: scale K, centre (design units), shake (px)
     paint(bb.n, Flatcamp.NIGHT, 'N');                          your world in the night palette (background, road, figures…)
     Flatcamp.lit(bb, discs, g => paint(g, Flatcamp.LIT, 'L'));   the lit palette through pixel circles (design units)
     embers / dashedPx / haze on bb.n → Flatcamp.present(ctx, bb) → Flatcamp.windowFrame(ctx, t, endAt) → captions → endCard
   Coordinates: DESIGN UNITS (the 1080×1920 frame at 8×; U = 8 design units per world pixel) for choreography and rigs;
   every pixel primitive (R, pxLine, pxPoly…) takes BUFFER pixels — convert with B2([x, y]) / bx(x) / by(y) after setView.
   Pure functions of their arguments (+ the current view); seeded randomness only; no network, no images.
   Load after lib.js and story.js. */
(function () {
  const { clamp, lerp, ss, eo, eio, rng } = Pilot;
  const TAU = Math.PI * 2;
  const N = {};
  const U = 8; N.U = U;

  /* ---------------------------------------------------------------- palette, type, body */
  // NIGHT and LIT palettes (same keys): the world is drawn once with each; LIT shows inside the light circles
  N.NIGHT = { bg: '#29358a', tD: '#232b70', tL: '#2d3d9c', shaft: '#4a64c4', canA: '#3b3d7c', canAs: '#34366f', canB: '#2c466c', canBs: '#263d5f',
    pine: '#33388a', pineS: '#2b3078', bush: '#2b3f94', bushS: '#25357f', gTop: '#3a4fb0', ground: '#2a3a92', groundD: '#222a6a', stem: '#20234f', mush: '#5a64a8',
    chasm: '#1d2366', chasm2: '#171b50', deep: '#0d0f2e', gate: '#3a4296', gateS: '#30377e', door: '#f08424' };
  N.LIT = { bg: '#2f3d92', tD: '#2a3479', tL: '#3a4caa', shaft: '#5a78d0', canA: '#6b5a9c', canAs: '#584a8a', canB: '#4a8c6b', canBs: '#3d7a5e',
    pine: '#5050a8', pineS: '#434394', bush: '#5a9c84', bushS: '#4a8a74', gTop: '#8ac48a', ground: '#73a97b', groundD: '#3a6363', stem: '#4a3434', mush: '#e8d8b8',
    chasm: '#3a6a66', chasm2: '#2c5652', deep: '#163234', gate: '#8a7ab8', gateS: '#6b5a9c', door: '#f8b830' };
  N.FRAME = '#24273d'; N.FRAME2 = '#2b2f4a';                                 // the blobby window frame
  N.FIRE = ['#f08424', '#f8b830', '#fff0a0'];                                 // campfire bands: outer, mid, core
  N.EMBERS = ['#f0a030', '#c86020'];                                          // ember pixels: young, old
  N.CREAM = '#f4f0dc';                                                        // captions, dashed outline
  // figures: the wanderer. [k] = 'N' (night) / 'L' (lit). H hood, h hood shade, F face, f face shade, E eye, C cloak,
  // c cloak shade + far arm, A near arm, a hands, leg / leg2 far / near leg. `me` the hero, `other` the quieter crowd.
  N.FIG = {
    me: { N: { H: '#7482c4', h: '#56619e', F: '#f2dcb8', f: '#cfae88', E: '#262036', C: '#5d6bb0', c: '#465290', A: '#6a78bc', a: '#f2dcb8', leg: '#24243e', leg2: '#2c2c4a' },
          L: { H: '#8a90cc', h: '#6a6aa8', F: '#f8e4c0', f: '#dcbc94', E: '#262036', C: '#7078b8', c: '#585e9c', A: '#7c84c0', a: '#f8e4c0', leg: '#2e2c48', leg2: '#36344f' } },
    other: { N: { H: '#4e5894', h: '#3e4680', F: '#a89cac', f: '#8a7e94', E: '#1a1830', C: '#424c8a', c: '#343c74', A: '#4a5492', a: '#a89cac', leg: '#1c1c34', leg2: '#22223c' },
             L: { H: '#6a6ca8', h: '#56588e', F: '#c8bcc0', f: '#a89ca8', E: '#1a1830', C: '#5a5e9c', c: '#484a8a', A: '#62669e', a: '#c8bcc0', leg: '#2a2a46', leg2: '#30304e' } } };
  N.WOOD = { a: '#d8782c', b: '#94461e', c: '#f4a850' };                      // THE warm accent: campfire-orange wood (body, shade, highlight)
  N.EMBER = { a: '#f8b830', b: '#d8782c', c: '#fff0a0' };                     // the same thing when it catches fire
  N.WOOD_COLD = { N: { a: '#4a5288', b: '#363c6c', c: '#5e68a0' }, L: { a: '#6a5a8c', b: '#4e4270', c: '#8a78a8' } };   // everyone else's wood
  N.FONT = "'Do Hyeon',sans-serif";
  N.FONTS = ["400 70px 'Do Hyeon'"];                                          // for Pilot.run({fonts})
  N.BODY = { HIPH: 124, LEG1: 74, LEG2: 70, ARM1: 70, ARM2: 68 };             // the wanderer at s = 1 (design units)
  const BD = N.BODY;

  /* ---------------------------------------------------------------- timing */
  // step8(t) / step12(t): time held on twos (8 drawings a second: figures) / on 12s (falling, flying, sparks).
  N.step8 = t => Math.floor(t * 8 + 1e-6) / 8; N.step12 = t => Math.floor(t * 12 + 1e-6) / 12;
  // backEase(u): overshoot ease (a light popping open).
  N.backEase = u => 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);

  /* ---------------------------------------------------------------- the view (shot) */
  // V = { K, OX, OY }: pixel scale and the buffer's origin in world pixels. setView(K, x, y, shx, shy): a shot at scale K
  // centred on design point x,y, shaken by whole pixels shx, shy. bx/by/B2: design units → buffer pixels.
  let V = { K: 8, OX: 0, OY: 0 };
  N.setView = function (K, x, y, shx = 0, shy = 0) { V = { K, OX: Math.round(x / U - Pilot.W / 2 / K) + shx, OY: Math.round(y / U - Pilot.H / 2 / K) + shy }; return V; };
  N.view = () => V;
  N.bx = x => x / U - V.OX; N.by = y => y / U - V.OY; N.B2 = p => [p[0] / U - V.OX, p[1] / U - V.OY];
  const B2 = N.B2;
  // shake(sh, t) → [shx, shy]: whole-pixel shake for a shot with sh.shake (0..1), on twos.
  N.shake = function (sh, t) { const q8 = N.step8(t); return [sh.shake ? Math.round(Math.sin(q8 * 97) * 2 * sh.shake) : 0, sh.shake ? Math.round(Math.sin(q8 * 131 + 1) * 2 * sh.shake) : 0]; };
  // bufs(K) → { n, l, m, tmp }: the 2D contexts of the K× buffers (W/K × H/K), made once per scale.
  const BUF = {};
  N.bufs = function (K) { if (!BUF[K]) { const w = Math.ceil(Pilot.W / K), h = Math.ceil(Pilot.H / K), mk = () => { const cv = Pilot.canvas(w, h); return cv.getContext('2d'); };
    BUF[K] = { n: mk(), l: mk(), m: mk(), tmp: mk() }; } return BUF[K]; };
  // present(ctx, bb): blow the night buffer (with everything composited into it) up nearest-neighbour to the frame.
  N.present = function (ctx, bb) { const K = V.K; ctx.imageSmoothingEnabled = false; ctx.drawImage(bb.n.canvas, 0, 0, bb.n.canvas.width * K, bb.n.canvas.height * K); };

  /* ---------------------------------------------------------------- pixel primitives (buffer pixels; whole pixels only) */
  // R(c, x, y, w, h, col): a rounded-to-whole-pixel rect.
  const R = N.R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  // pxCircle(c, cx, cy, r, col): a filled pixel circle.
  N.pxCircle = function (c, cx, cy, r, col) { cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r); c.fillStyle = col; for (let dy = -r; dy <= r; dy++) { const h = Math.floor(Math.sqrt(r * r - dy * dy) + .5); c.fillRect(cx - h, cy + dy, 2 * h + 1, 1); } };
  // pxRR(c, x, y, w, h, r, col): a pixel rounded rect (corner radius r).
  N.pxRR = function (c, x, y, w, h, r, col) {
    x = Math.round(x); y = Math.round(y); c.fillStyle = col; for (let j = 0; j < h; j++) { let inset = 0;
      const dy = j < r ? r - j - .5 : j >= h - r ? j - (h - r) + .5 : 0; if (dy > 0) inset = Math.round(r - Math.sqrt(Math.max(0, r * r - dy * dy)));
      c.fillRect(x + inset, y + j, w - 2 * inset, 1); } };
  // capsule(c, x, y, w, h, col, sh): a pill (bush, canopy) with its left 30 % in the shade colour sh.
  N.capsule = function (c, x, y, w, h, col, sh) {
    N.pxRR(c, x, y, w, h, Math.floor(w / 2), col);
    if (sh) { c.save(); c.beginPath(); c.rect(Math.round(x), y, Math.floor(w * .3), h); c.clip(); N.pxRR(c, x, y, w, h, Math.floor(w / 2), sh); c.restore(); }
  };
  // pine(c, cx, top, h, w, col, sh): a three-tier pixel pine, shaded on the left.
  N.pine = function (c, cx, top, h, w, col, sh) {
    cx = Math.round(cx); for (let j = 0; j < h; j++) { const tier = Math.floor(j / (h / 3)), f = (j - tier * h / 3) / (h / 3), hw = Math.round((w / 2) * (.35 + .22 * tier + .4 * f));
      R(c, cx - hw, top + j, 2 * hw + 1, 1, col); if (sh) R(c, cx - hw, top + j, Math.max(1, Math.round(hw * .5)), 1, sh); }
  };
  // pxLine(c, x0, y0, x1, y1, th, col): a line of th×th pixel squares.
  N.pxLine = function (c, x0, y0, x1, y1, th, col) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); c.fillStyle = col;
    for (let i = 0; i <= n; i++) { const x = Math.round(lerp(x0, x1, i / n)), y = Math.round(lerp(y0, y1, i / n)); c.fillRect(x - (th >> 1), y - (th >> 1), th, th); }
  };
  // pxPoly(c, pts, col): scanline fill of a polygon, whole pixels (sampled at pixel centres).
  N.pxPoly = function (c, pts, col) {
    let y0 = Infinity, y1 = -Infinity; for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    c.fillStyle = col; const n = pts.length;
    for (let j = Math.floor(y0); j <= Math.ceil(y1); j++) { const yc = j + .5, xs = [];
      for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; if ((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]); if (xb > xa) c.fillRect(xa, j, xb - xa, 1); } }
  };
  // pathB(): a tiny path sampler → { pts, m(p), l(p), b(c1, c2, p, n), q(c1, p, n) } (bezier/quad → polyline for pxPoly).
  N.pathB = function () {
    const pts = []; let cur = null;
    return { pts, m(p) { cur = p; pts.push(p); return this; }, l(p) { cur = p; pts.push(p); return this; },
      b(c1, c2, p, n = 6) { const a = cur; for (let i = 1; i <= n; i++) { const u = i / n, v = 1 - u; pts.push([v * v * v * a[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * p[0], v * v * v * a[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * p[1]]); } cur = p; return this; },
      q(c1, p, n = 5) { const a = cur; for (let i = 1; i <= n; i++) { const u = i / n, v = 1 - u; pts.push([v * v * a[0] + 2 * v * u * c1[0] + u * u * p[0], v * v * a[1] + 2 * v * u * c1[1] + u * u * p[1]]); } cur = p; return this; } };
  };
  // sprite(rows, pal) → canvas: a pixel sprite from strings ('.' = clear, other chars → pal colours).
  N.sprite = function (rows, pal) { const h = rows.length, w = rows[0].length, c = Pilot.canvas(w, h), x = c.getContext('2d');
    rows.forEach((r, j) => { for (let i = 0; i < w; i++) { const k = r[i]; if (k !== '.' && pal[k]) { x.fillStyle = pal[k]; x.fillRect(i, j, 1, 1); } } });
    return c; };
  // arcPts(cx, cy, r, a0, a1, n) → n+1 points on an arc (for arches, domes).
  N.arcPts = function (cx, cy, r, a0, a1, n = 14) { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; };

  /* ---------------------------------------------------------------- the forest backdrop (world pixels, scrolling at parallax) */
  // forest(seed = 11, o) → { far, mid, haze }: two parallax layers (far .45: trunks, branches, light shafts, canopy blobs,
  // vines; mid .74: mushroom-cap trees, pines, bushes, little mushrooms) + mist bars. o.from / o.farTo / o.midTo =
  // world-pixel x range (default −500 / 900 / 1100). Build once in init.
  N.forest = function (seed = 11, o = {}) {
    const r = rng(seed), F = { far: { p: .45, items: [] }, mid: { p: .74, items: [] }, haze: [] };
    let x = o.from ?? -500; while (x < (o.farTo ?? 900)) { const k = r(), w = k < .45 ? 3 + (r() * 3 | 0) : 6 + (r() * 6 | 0);
      F.far.items.push({ k: 'trunk', x, w, col: k < .3 ? 'tL' : 'tD' });
      if (r() < .55) F.far.items.push({ k: 'br', x: x + (w >> 1), y: 30 + r() * 90, dx: (r() < .5 ? -1 : 1) * (10 + r() * 14), dy: -(16 + r() * 14) });
      if (r() < .14) F.far.items.push({ k: 'shaft', x: x + w + 3 });
      if (r() < .35) F.far.items.push({ k: 'blob', x: x + r() * 10, y: -10 + r() * 46, r: 5 + r() * 9 | 0 });
      if (r() < .12) F.far.items.push({ k: 'vine', x: x + w + 1, y: 20 + r() * 20, len: 18 + r() * 26 | 0 });
      x += w + 6 + r() * 12; }
    x = o.from ?? -500; while (x < (o.midTo ?? 1100)) { const k = r();
      if (k < .3) F.mid.items.push({ k: 'cap', x, w: 16 + (r() * 12 | 0), h: 38 + (r() * 22 | 0), col: r() < .5 ? 'canA' : 'canB' });
      else if (k < .5) F.mid.items.push({ k: 'pine', x, w: 18 + (r() * 8 | 0), h: 34 + (r() * 14 | 0) });
      else F.mid.items.push({ k: 'bush', x, w: 18 + (r() * 14 | 0), h: 18 + (r() * 10 | 0) });
      if (r() < .25) F.mid.items.push({ k: 'mush', x: x + 6 });
      x += 22 + r() * 34; }
    for (let i = 0; i < 9; i++) F.haze.push({ x: r() * 400, y: 30 + r() * 110, w: 28 + r() * 26 | 0, a: .12 + r() * .08 });
    return F;
  };
  // background(c, P, forest, gyw): the backdrop in palette P down to the ground line gyw (WORLD pixels, e.g. round(1212 / U)).
  N.background = function (c, P, F, gyw) {
    const bw = c.canvas.width, bh = c.canvas.height, gy = gyw - V.OY, hw = Pilot.W / 2;
    R(c, 0, 0, bw, bh, P.bg);
    const lox = Math.round((V.OX + hw / V.K) * F.far.p - hw / V.K);
    for (const o of F.far.items) { const x = o.x - lox; if (x < -40 || x > bw + 40) continue;
      if (o.k === 'trunk') R(c, x, -1, o.w, gy + 1, P[o.col]);
      else if (o.k === 'br') N.pxLine(c, x, o.y - V.OY, x + o.dx, o.y - V.OY + o.dy, 3, P.tD);
      else if (o.k === 'shaft') { c.globalAlpha = .3; R(c, x, -1, 5, gy - 40, P.shaft); c.globalAlpha = .16; R(c, x - 2, -1, 9, gy - 20, P.shaft); c.globalAlpha = 1; }
      else if (o.k === 'blob') N.pxCircle(c, x, o.y - V.OY, o.r, P.tD);
      else if (o.k === 'vine') { R(c, x, o.y - V.OY, 1, o.len, P.canBs); for (let j = 4; j < o.len; j += 6) R(c, x - 1 + (j % 12 ? 0 : 2), o.y - V.OY + j, 2, 2, P.canBs); } }
    const mox = Math.round((V.OX + hw / V.K) * F.mid.p - hw / V.K);
    for (const o of F.mid.items) { const x = o.x - mox; if (x < -40 || x > bw + 40) continue;
      if (o.k === 'cap') { R(c, x + (o.w >> 1) - 1, gy - o.h * .45, 3, o.h * .45 + 1, P.stem); N.capsule(c, x, gy - o.h - 4, o.w, o.h, P[o.col], P[o.col + 's']); }
      else if (o.k === 'pine') N.pine(c, x + (o.w >> 1), gy - o.h, o.h + 1, o.w, P.pine, P.pineS);
      else if (o.k === 'bush') N.capsule(c, x, gy - o.h + 1, o.w, o.h, P.bush, P.bushS);
      else if (o.k === 'mush') { R(c, x, gy - 3, 1, 3, '#d8ccb4'); R(c, x - 2, gy - 4, 5, 1, P.mush); R(c, x - 1, gy - 5, 3, 1, P.mush); } }
  };
  // haze(c, t, forest): drifting translucent mist bars on twos (draw on the night buffer AFTER the light: never palette-swapped).
  N.haze = function (c, t, F) {
    const bw = c.canvas.width, q = N.step8(t), hw = Pilot.W / 2, hx = Math.round((V.OX + hw / V.K) * .55 - hw / V.K);
    for (const m of F.haze) { const x = Math.round(((m.x + q * 3 - hx) % 400 + 400) % 400) - 60; if (x > bw) continue;
      c.globalAlpha = m.a; N.pxRR(c, x, Math.round(m.y - V.OY), m.w, 4, 2, '#5a72c8'); c.globalAlpha = 1; }
  };

  /* ---------------------------------------------------------------- ground, chasm, gate, fire */
  // ground(c, P, gyw, o): the ground from the line gyw (world px) down: top highlight row, grass blades, darker lower band
  // (17 px down). o.gap = [x, w] (design units) cuts a chasm with stepped walls (seeded); o.inGap() runs after its dark fill.
  N.ground = function (c, P, gyw, o = {}) {
    const bw = c.canvas.width, bh = c.canvas.height, top = gyw - V.OY, gp = o.gap;
    const ea = gp ? Math.round(gp[0] / U) - V.OX : 0, eb = gp ? Math.round((gp[0] + gp[1]) / U) - V.OX : 0;
    if (gp && eb > -10 && ea < bw + 10) {
      R(c, ea, top, eb - ea, bh - top, P.deep);
      if (o.inGap) o.inGap();
      const r = rng(71), half = (eb - ea) >> 1;
      for (let j = 0; top + j < bh; j += 3) { const i2 = Math.min(half, 4 + Math.floor(j * .55) + (r() * 3 | 0)), i1 = Math.min(half - 1, 1 + Math.floor(j * .25) + (r() * 2 | 0));
        const i2b = Math.min(half, 4 + Math.floor(j * .55) + (r() * 3 | 0)), i1b = Math.min(half - 1, 1 + Math.floor(j * .25) + (r() * 2 | 0));
        R(c, ea, top + j, i2, 3, P.chasm2); R(c, ea, top + j, i1, 3, P.chasm); R(c, eb - i2b, top + j, i2b, 3, P.chasm2); R(c, eb - i1b, top + j, i1b, 3, P.chasm); }
    }
    for (const [a, b] of (gp ? [[-2, ea], [eb, bw + 2]] : [[-2, bw + 2]])) { if (b <= a) continue;
      R(c, a, top, b - a, bh - top, P.ground); R(c, a, top, b - a, 1, P.gTop); R(c, a, top + 17, b - a, bh, P.groundD);
      for (let x = a; x < b; x++) { const gx = x + V.OX; if (((gx * 7) % 9 + 9) % 9 === 0) { const h = ((gx * 5) % 3 + 3) % 3 + 1; R(c, x, top - h, 1, h, P.gTop); } } }
  };
  // gatePos(x, gy) → { gx, gy, ay }: an arch standing at design x on design ground gy, in buffer pixels (ay = spring of the arch).
  N.gatePos = function (x, gy) { const gx = x / U - V.OX, g = gy / U - V.OY; return { gx: Math.round(gx), gy: Math.round(g), ay: Math.round(g - 36) }; };
  // gateDoor(c, P, t, G): the doorway burning like a campfire (banded fire colours flickering on 12s) + light on the threshold.
  N.gateDoor = function (c, P, t, G) {
    const { gx, gy, ay } = G, q = N.step12(t), r = rng(1 + Math.floor(q * 12) % 6);
    N.pxPoly(c, [[gx - 12, gy], ...N.arcPts(gx, ay, 12, Math.PI, TAU), [gx + 12, gy]], P.door);
    N.pxPoly(c, [[gx - 9, gy], ...N.arcPts(gx, ay + 3, 9, Math.PI, TAU), [gx + 9, gy]], '#f8b830');
    const hw = 4 + (r() * 2 | 0); N.pxPoly(c, [[gx - hw, gy], ...N.arcPts(gx, ay + 8, hw, Math.PI, TAU, 8), [gx + hw, gy]], '#fff0a0');
    R(c, gx - 18, gy, 37, 2, P.door);
  };
  // gateArch(c, P, G): the stone arch over the doorway (draw after what walks in it), keystone, bushes either side.
  N.gateArch = function (c, P, G) {
    const { gx, gy, ay } = G;
    N.pxPoly(c, [[gx - 18, gy], ...N.arcPts(gx, ay, 18, Math.PI, TAU), [gx + 18, gy], [gx + 12, gy], ...N.arcPts(gx, ay, 12, TAU, Math.PI), [gx - 12, gy]], P.gate);
    N.pxPoly(c, [[gx + 13, gy], [gx + 13, ay], [gx + 18, ay], [gx + 18, gy]], P.gateS);
    R(c, gx - 20, gy - 3, 9, 3, P.gate); R(c, gx + 12, gy - 3, 9, 3, P.gateS);
    R(c, gx - 1, ay - 21, 3, 3, P.gateS);
    N.capsule(c, gx - 46, gy - 14, 22, 15, P.bush, P.bushS); N.capsule(c, gx + 26, gy - 16, 26, 17, P.bush, P.bushS); N.capsule(c, gx + 52, gy - 11, 18, 12, P.canB, P.canBs);
  };
  // campfire(c, t, x, y, s): a small campfire at buffer x,y (its base): crossed logs + banded flame flickering on 12s, s = size (1 ≈ 9 px tall).
  N.campfire = function (c, t, x, y, s = 1) {
    x = Math.round(x); y = Math.round(y); const q = N.step12(t), r = rng(5 + Math.floor(q * 12) % 6), h = Math.round(9 * s), w = Math.round(5 * s);
    N.pxLine(c, x - w - 1, y, x + w + 1, y - 2, 2, N.WOOD.b); N.pxLine(c, x - w - 1, y - 2, x + w + 1, y, 2, N.WOOD.a);
    const fl = k => Math.round(h * k * (.85 + r() * .3));
    N.pxPoly(c, [[x - w, y - 1], [x - 1, y - fl(1)], [x + w, y - 1]], N.FIRE[0]);
    N.pxPoly(c, [[x - w + 2, y - 1], [x, y - fl(.7)], [x + w - 2, y - 1]], N.FIRE[1]);
    N.pxPoly(c, [[x - 1, y - 1], [x, y - fl(.4)], [x + 2, y - 1]], N.FIRE[2]);
  };
  // embers(c, t, x0, y0, n, seed, spread): n ember pixels rising from x0,y0 (buffer px) in whole-pixel steps.
  N.embers = function (c, t, x0, y0, n, seed, spread = 10) {
    for (let i = 0; i < n; i++) { const er = rng(seed + i), per = .9 + er() * .9, ph = er() * per, age = ((t + ph) % per + per) % per;
      const ex = x0 + Math.round((er() - .5) * spread + Math.sin(age * 5 + i) * 2), ey = y0 - Math.round(age * 40);
      R(c, ex, ey, 1, 2 + (er() * 2 | 0), age / per > .7 ? '#c86020' : '#f0a030'); }
  };

  /* ---------------------------------------------------------------- light: the palette swap inside pixel circles */
  // lit(bb, D, paint, flash): D = [{ x, y, r }] in DESIGN units; paint(g) draws the world in the LIT palette into g.
  // Inside each circle the lit world shows; a dithered 8-px rim (checker, then sparse) blends it out. flash = whole frame lit (a hit).
  N.lit = function (bb, D, paint, flash) {
    if (!D.length && !flash) return;
    paint(bb.l);
    const m = bb.m, mw = m.canvas.width, mh = m.canvas.height; m.clearRect(0, 0, mw, mh);
    if (flash) R(m, 0, 0, mw, mh, '#fff');
    for (const d of D) { const cx = Math.round(d.x / U - V.OX), cy = Math.round(d.y / U - V.OY), r = Math.round(d.r / U); if (r < 1) continue;
      N.pxCircle(m, cx, cy, r, '#fff'); m.fillStyle = '#fff';
      for (let dy = -r - 8; dy <= r + 8; dy++) { const yy = cy + dy; if (yy < 0 || yy >= mh) continue;
        for (let dx = -r - 8; dx <= r + 8; dx++) { const xx = cx + dx; if (xx < 0 || xx >= mw) continue; const dd = Math.hypot(dx, dy); if (dd <= r || dd > r + 8) continue;
          if (dd < r + 4 ? ((dx + dy) & 1) === 0 : ((dx & 1) === 0 && (dy & 1) === 0)) m.fillRect(xx, yy, 1, 1); } } }
    const tp = bb.tmp; tp.globalCompositeOperation = 'source-over'; tp.clearRect(0, 0, mw, mh); tp.drawImage(bb.l.canvas, 0, 0);
    tp.globalCompositeOperation = 'destination-in'; tp.drawImage(m.canvas, 0, 0); tp.globalCompositeOperation = 'source-over';
    bb.n.drawImage(tp.canvas, 0, 0);
  };
  // dashedPx(c, pts, t, xmax): a closed outline (DESIGN-unit points) in marching 2-on/2-off cream pixels, drawn up to design x xmax.
  N.dashedPx = function (c, pts, t, xmax = Infinity) {
    const ol = pts.map(B2), xm = xmax === Infinity ? Infinity : B2([xmax, 0])[0], off = Math.floor(N.step8(t) * 8);
    c.fillStyle = N.CREAM; let s = 0;
    for (let i = 0; i < ol.length; i++) { const a = ol[i], b = ol[(i + 1) % ol.length], n = Math.max(1, Math.round(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))));
      for (let j = 0; j < n; j++, s++) { const x = Math.round(lerp(a[0], b[0], j / n)), y = Math.round(lerp(a[1], b[1], j / n)); if (x > xm) continue; if (((s + off) >> 1) % 2 === 0) c.fillRect(x, y, 1, 1); } }
  };
  // fireFill(c, a, b, fresh): a rect between DESIGN points a (top-left) and b (bottom-right) catching fire: solid core
  // colour when fresh, then a checker of fire oranges.
  N.fireFill = function (c, a, b, fresh) {
    a = B2(a); b = B2(b);
    for (let y = Math.round(a[1]); y < Math.round(b[1]); y++) for (let x = Math.round(a[0]); x < Math.round(b[0]); x++)
      if (fresh || ((x + y) & 1) === 0) R(c, x, y, 1, 1, fresh ? '#fff0a0' : ((x + 2 * y) % 3 ? '#f8b830' : '#f08424'));
  };

  /* ---------------------------------------------------------------- the window frame (the lab's) */
  const LW = 180, LH = 320; let FR = null, FRC = null, FX = null;
  function framePlate() {
    const c = Pilot.canvas(LW, LH), x = c.getContext('2d');
    R(x, 0, 0, LW, LH, N.FRAME);
    x.globalCompositeOperation = 'destination-out'; N.pxRR(x, 10, 24, LW - 20, 270, 12, '#000'); x.globalCompositeOperation = 'source-over';
    const blobs = [[10, 58, 8], [6, 80, 6], [12, 126, 9], [8, 152, 5], [10, 200, 8], [5, 226, 7], [12, 278, 10],
      [170, 50, 7], [175, 92, 10], [168, 134, 6], [174, 178, 9], [170, 224, 6], [172, 276, 10],
      [34, 24, 8], [52, 20, 6], [98, 26, 10], [124, 22, 7], [148, 28, 8]];
    for (const [bx_, by_, br] of blobs) N.pxCircle(x, bx_, by_, br, N.FRAME);
    N.pxLine(x, 10, 50, 33, 54, 4, N.FRAME); N.pxLine(x, 33, 54, 38, 64, 3, N.FRAME); N.pxCircle(x, 39, 66, 3, N.FRAME);
    N.pxLine(x, 170, 116, 155, 121, 4, N.FRAME); N.pxLine(x, 155, 121, 152, 113, 3, N.FRAME); N.pxLine(x, 155, 121, 158, 131, 2, N.FRAME);
    R(x, 0, 290, LW, LH - 290, N.FRAME); R(x, 0, 290, LW, 1, N.FRAME2);
    return c;
  }
  function frameEyes(c, t) {   // yellow/white eyes blinking in the frame's dark (optional)
    for (const [ex, ey, col, ph] of [[14, 274, '#f0c040', 0], [163, 156, '#f0c040', 2.3], [165, 76, '#ffffff', .6]]) {
      if (((t + ph) % 2.3) < .125) { R(c, ex, ey + 1, 2, 1, col); R(c, ex + 4, ey + 1, 2, 1, col); continue; }
      R(c, ex, ey, 2, 2, col); R(c, ex + 4, ey, 2, 2, col); }
  }
  // windowFrame(ctx, t, endAt, o): the blobby window frame on its own 6× grid over the picture; from endAt − .25 it closes in,
  // whole pixels at a time, to a plain plate for the end card. o.eyes = true: eyes blink in the frame (ambient).
  N.windowFrame = function (ctx, t, endAt, o = {}) {
    FX.clearRect(0, 0, LW, LH); FX.drawImage(FR, 0, 0);
    if (o.eyes) frameEyes(FX, t);
    const ke = ss(endAt - .25, endAt + .3, N.step8(t)); if (ke > 0) { const n = Math.round(ke * 92); R(FX, 0, 0, LW, n + 24, N.FRAME); R(FX, 0, LH - n - 30, LW, n + 30, N.FRAME); R(FX, 0, 0, Math.round(ke * 90) + 10, LH, N.FRAME); R(FX, LW - Math.round(ke * 90) - 10, 0, Math.round(ke * 90) + 10, LH, N.FRAME); }
    ctx.imageSmoothingEnabled = false; ctx.drawImage(FRC, 0, 0, Pilot.W, Pilot.H);
  };
  // init(): builds the frame plate. Call once from the scene's init().
  N.init = function () { FR = framePlate(); FRC = Pilot.canvas(LW, LH); FX = FRC.getContext('2d'); };

  /* ---------------------------------------------------------------- captions, end card */
  // captions(ctx, t, lines, o): crisp Do Hyeon 66 px in cream with a hard 5-px offset shadow (dark navy), y 410.
  N.captions = function (ctx, t, lines, o = {}) {
    ctx.save(); ctx.translate(5, 5); Story.captions(ctx, t, lines, { font: N.FONT, weight: 400, size: 66, color: '#121633', srcColor: '#121633', y: 410, shadow: 'rgba(0,0,0,0)', shadowBlur: 1, ...o, ...(o.shadowColor ? { color: o.shadowColor, srcColor: o.shadowColor } : {}) }); ctx.restore();
    Story.captions(ctx, t, lines, { font: N.FONT, weight: 400, size: 66, color: N.CREAM, srcColor: '#d4daf4', y: 410, shadow: 'rgba(0,0,0,0)', shadowBlur: 1, ...o });
  };
  // endCard(ctx, t, card, at, o): Story.endCard in cream Do Hyeon on the closed frame plate (y 860).
  N.endCard = (ctx, t, card, at, o = {}) => Story.endCard(ctx, t, card, at, { font: N.FONT, color: N.CREAM, srcColor: '#aab4e0', y: 860, titleShadow: 'rgba(0,0,0,0)', ...o });

  /* ---------------------------------------------------------------- long things: a cross / plank / pole (design units) */
  // Geometry g = { L, PW, CBX, CBW, CBH, CBHL } (see flatnight): length, width, crossbar at CBX (CBW = 0 → plain plank).
  // Placement X = { x, y, a, u0, lie }: foot point, angle, cut-off start, lying flag.
  N.crossGeo = (o = {}) => ({ L: 520, PW: 40, CBX: 442, CBW: 36, CBH: 86, CBHL: 40, ...o });
  // cross(c, K, g, u0, u1, x, y, a, lying): part u0..u1 on the pixel grid in wood K = { a, b, c }: body, a shade strip,
  // a 1-px highlight, fresh cut faces.
  N.cross = function (c, K, g, u0, u1, x, y, a, lying) {
    if (u1 - u0 < 4) return;
    const { L, PW, CBX, CBW } = g, hb = lying ? g.CBHL : g.CBH, ca = Math.cos(a), sa = Math.sin(a), P = (u, v) => [(x + ca * u - sa * v) / U - V.OX, (y + sa * u + ca * v) / U - V.OY];
    N.pxPoly(c, [P(u0, -PW / 2), P(u1, -PW / 2), P(u1, PW / 2), P(u0, PW / 2)], K.a);
    const ba = Math.max(u0, CBX - CBW / 2), bb = Math.min(u1, CBX + CBW / 2);
    if (CBW && bb > ba) N.pxPoly(c, [P(ba, -hb), P(bb, -hb), P(bb, hb), P(ba, hb)], K.a);
    N.pxPoly(c, [P(u0, PW / 2 - 14), P(u1, PW / 2 - 14), P(u1, PW / 2), P(u0, PW / 2)], K.b);
    if (CBW && bb > ba) { const s0 = Math.max(ba, CBX + CBW / 2 - 14); if (bb > s0) N.pxPoly(c, [P(s0, -hb), P(bb, -hb), P(bb, hb), P(s0, hb)], K.b); }
    if (u1 - u0 > 20) { const h0 = P(u0 + 8, -PW / 2 + 7), h1 = P(u1 - 8, -PW / 2 + 7); N.pxLine(c, h0[0], h0[1], h1[0], h1[1], 1, K.c); }
    if (u0 > .5) N.pxPoly(c, [P(u0, -PW / 2), P(u0 + 9, -PW / 2), P(u0 + 9, PW / 2), P(u0, PW / 2)], K.c);
    if (u1 < L - .5) N.pxPoly(c, [P(u1 - 9, -PW / 2), P(u1, -PW / 2), P(u1, PW / 2), P(u1 - 9, PW / 2)], K.c);
  };
  // outline(g, x, y) → the whole object's outline lying flat, foot at x, axis at y (design units) — for dashedPx().
  N.outline = function (g, x, y) {
    const { L, PW, CBX, CBW } = g, hb = g.CBHL;
    if (!CBW) return [[0, -PW / 2], [L, -PW / 2], [L, PW / 2], [0, PW / 2]].map(([a, b]) => [x + a, y + b]);
    return [[0, -PW / 2], [CBX - CBW / 2, -PW / 2], [CBX - CBW / 2, -hb], [CBX + CBW / 2, -hb], [CBX + CBW / 2, -PW / 2], [L, -PW / 2], [L, PW / 2],
      [CBX + CBW / 2, PW / 2], [CBX + CBW / 2, hb], [CBX - CBW / 2, hb], [CBX - CBW / 2, PW / 2], [0, PW / 2]].map(([a, b]) => [x + a, y + b]);
  };
  N.cpt = (X, u, v = 0) => [X.x + Math.cos(X.a) * u - Math.sin(X.a) * v, X.y + Math.sin(X.a) * u + Math.cos(X.a) * v];   // point u along, v across
  N.mixX = (A, Bx, k) => k <= 0 ? A : k >= 1 ? Bx : { ...Bx, x: lerp(A.x, Bx.x, k), y: lerp(A.y, Bx.y, k), a: lerp(A.a, Bx.a, k), u0: Bx.u0, lie: k > .62 ? Bx.lie : A.lie };   // blend placements
  N.rotAbout = function (X, pv, th) { const ox = X.x - pv[0], oy = X.y - pv[1]; return { ...X, x: pv[0] + ox * Math.cos(th) - oy * Math.sin(th), y: pv[1] + ox * Math.sin(th) + oy * Math.cos(th), a: X.a + th }; };   // rotate about pv
  // carry(F, g, left, a0, contact) → X on the shoulder of F (crossing ahead of the shoulder, post trailing, slope a0).
  N.carry = function (F, g, left, a0, contact) {
    const fr = N.frame(F), sh = N.shoulderOf(F), T = [sh[0] + fr.up[0] * 14 * F.s, sh[1] + fr.up[1] * 14 * F.s];
    const a = F.f > 0 ? a0 : Math.PI - a0, d = [Math.cos(a), Math.sin(a)]; let n = [d[1], -d[0]]; if (n[1] > 0) n = [-n[0], -n[1]];
    contact = contact ?? g.CBX - 128;
    return { x: T[0] + n[0] * g.PW / 2 - d[0] * contact, y: T[1] + n[1] * g.PW / 2 - d[1] * contact, a, contact, u0: g.L * (1 - left), lie: false };
  };
  // gripCarry(F, X, g): hands for the shoulder carry (far hand on the crossbar, near fist behind the contact). Returns F.
  N.gripCarry = function (F, X, g) { F.hands = [N.cpt(X, g.CBX, 58), N.cpt(X, X.contact - 48)]; F.hand = ['fist', 'fist']; F.farOver = true; return F; };
  // holdUpright(F, g, left, dx = 96) → X stood upright beside F, near hand on it (X.held: draw it behind the gripping arm).
  N.holdUpright = function (F, g, left, dx = 96) {
    const u0 = g.L * (1 - left), X = { x: F.hip[0] + dx * F.s * F.f, y: F.gy - 2 + u0, a: -Math.PI / 2, u0, lie: false, held: true };
    F.hands = [N.hangHands(F)[0], N.cpt(X, g.CBX - 40, 4)]; F.hand = ['fist', 'fist']; F.farOver = false; return X;
  };
  // holdFront(F, g, left, lift = 0) → X held level in front with both hands (≈ waist height − lift).
  N.holdFront = function (F, g, left, lift = 0) {
    const fr = N.frame(F), c = fr.P(58, 70 + lift), u0 = g.L * (1 - left), mid = (u0 + g.L) / 2, a = F.f > 0 ? 0 : Math.PI;
    const X = { x: c[0] - Math.cos(a) * mid, y: c[1] + 6, a, u0, lie: true };
    F.hands = [N.cpt(X, mid + 46, -g.PW / 2 + 4), N.cpt(X, mid - 46, -g.PW / 2 + 4)]; F.hand = ['fist', 'fist']; return X;
  };

  /* ---------------------------------------------------------------- the figure rig (design units; drawn on the pixel grid) */
  // Pose F = { s, f, gy, hip, ang, feet [far, near], hands [far, near], hand types, tilt, eye, sway, farFront, farOver,
  // alpha, sq } — the same rig as flatnight (2-bone IK, fixed lengths, hands drawn AT their target). Pose on twos:
  // compute it at step8(t).
  N.ik = function (a, t, l1, l2, pick) {
    let dx = t[0] - a[0], dy = t[1] - a[1], d = Math.hypot(dx, dy) || 1e-6; const dd = clamp(d, Math.abs(l1 - l2) + .5, l1 + l2 - .5);
    const tx = a[0] + dx / d * dd, ty = a[1] + dy / d * dd, an = Math.atan2(ty - a[1], tx - a[0]), b = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
    const j1 = [a[0] + Math.cos(an + b) * l1, a[1] + Math.sin(an + b) * l1], j2 = [a[0] + Math.cos(an - b) * l1, a[1] + Math.sin(an - b) * l1];
    return [pick(j1, j2), [tx, ty]];
  };
  // frame(F) → { up, fw, P(a, b) }: body axes; P = a forward, b up from the hip (× s).
  N.frame = function (F) {
    const up = [Math.sin(F.ang), -Math.cos(F.ang)], fw = [F.f * Math.cos(F.ang), F.f * Math.sin(F.ang)], s = F.s;
    return { up, fw, P: (a, b) => [F.hip[0] + fw[0] * a * s + up[0] * b * s, F.hip[1] + fw[1] * a * s + up[1] * b * s] };
  };
  N.shoulderOf = F => N.frame(F).P(2, 118);
  // figure(c, F, C, mid, back, over): the wanderer on the pixel grid in palette C (N.FIG.me.N …): 3-px limbs, boots,
  // the cloak + its shade, the hood, face, 1–2 px eye ('calm'|'closed'|'down'|'strain'|'shock'|'up'), skin-block hands.
  // Draw order as flatnight: back · far arm · legs · cloak · over() · head · mid() · near arm. alpha ≤ .5 → not drawn.
  N.figure = function (c, F, C, mid, back, over) {
    const s = F.s, f = F.f, { P } = N.frame(F);
    if ((F.alpha ?? 1) <= .5) return;   // pixel art: no half-transparent figures — they step out of sight
    const Bq = F.sq != null && F.sq !== 1 ? p => B2([F.hip[0] + (p[0] - F.hip[0]) * F.sq, p[1]]) : B2;
    const sh = P(12, 114), shF = P(-8, 112);
    const elbowPick = (a, b) => (a[1] - f * a[0] * .35) > (b[1] - f * b[0] * .35) ? a : b, kneePick = (a, b) => f * a[0] > f * b[0] ? a : b;
    const arm = (S0, T, col, type) => {
      if (!T) T = [S0[0] - f * 8 * s, S0[1] + 116 * s];
      const [el, hd] = N.ik(S0, T, BD.ARM1 * s, BD.ARM2 * s, elbowPick), a = Bq(S0), e = Bq(el), h = Bq(hd);
      N.pxLine(c, a[0], a[1], e[0], e[1], 3, col); N.pxLine(c, e[0], e[1], h[0], h[1], 3, col);
      if (type === 'flat') { R(c, h[0] - 2 + f, h[1] - 1, 4, 2, C.a); }
      else if (type === 'open') { R(c, h[0] - 1, h[1] - 1, 3, 3, C.a); R(c, h[0] + (h[0] > e[0] ? 2 : -2), h[1] - 2, 1, 1, C.a); R(c, h[0] + (h[0] > e[0] ? 2 : -2), h[1] + 1, 1, 1, C.a); }
      else { R(c, h[0] - 1, h[1] - 1, 3, 3, C.a); R(c, h[0] - 1, h[1] - 2, 2, 1, C.f); }   // a mitten fist, the thumb over the top
    };
    const leg = (T, col) => {
      const hp = P(0, -4), ank = [T[0], T[1] - 10 * s], [kn, an] = N.ik(hp, ank, BD.LEG1 * s, BD.LEG2 * s, kneePick), a = Bq(hp), k = Bq(kn), b = Bq(an);
      N.pxLine(c, a[0], a[1], k[0], k[1], 3, col); N.pxLine(c, k[0], k[1], b[0], b[1], 3, col);
      R(c, b[0] - (f > 0 ? 1 : 3), b[1] + 1, 5, 2, col);   // boot, toe forward
    };
    if (back) back();
    if (!F.farFront && !(over && F.farOver)) arm(shF, F.hands[0], C.c, F.hand?.[0] || 'fist');
    leg(F.feet[0], C.leg); leg(F.feet[1], C.leg2);
    const sw = F.sway || 0, Q = (a, b) => P(a + sw * clamp(-b / 66, 0, 1), b);
    const ck = N.pathB().m(Q(-68, -64)).b(Q(-66, 18), Q(-56, 96), Q(-26, 132)).l(Q(34, 134)).b(Q(54, 80), Q(66, 10), Q(80, -64)).q(Q(46, -76), Q(18, -60)).q(Q(-24, -80), Q(-68, -64));
    N.pxPoly(c, ck.pts.map(Bq), C.C);
    const bk = N.pathB().m(Q(-68, -64)).b(Q(-66, 18), Q(-56, 96), Q(-26, 132)).l(Q(-12, 130)).b(Q(-40, 96), Q(-50, 18), Q(-52, -70));
    N.pxPoly(c, bk.pts.map(Bq), C.c);
    const bt = Bq(P(30, 60)); R(c, bt[0], bt[1], 1, 1, C.c);
    if (over) { over(); if (F.farOver && !F.farFront) arm(shF, F.hands[0], C.c, F.hand?.[0] || 'fist'); }
    const Nk = P(8, 128), rot = F.ang + f * (F.tilt || 0), k = 1.18 * s, cr = Math.cos(rot), sr = Math.sin(rot);
    const T = (u, v) => Bq([Nk[0] + cr * (f * k * u) - sr * (k * v), Nk[1] + sr * (f * k * u) + cr * (k * v)]);
    const hd = N.pathB().m([-40, 10]).b([-58, -40], [-40, -98], [8, -100]).b([48, -100], [64, -60], [58, -20]).b([56, 0], [40, 14], [20, 16]);
    N.pxPoly(c, hd.pts.map(p => T(p[0], p[1])), C.H);
    const hs = N.pathB().m([-6, -92]).b([-30, -84], [-40, -30], [-30, 6]).l([-40, 10]).b([-58, -40], [-40, -98], [8, -100]);
    N.pxPoly(c, hs.pts.map(p => T(p[0], p[1])), C.h);
    const fc = N.pathB().m([16, -64]).b([44, -66], [54, -40], [50, -16]).b([46, -2], [30, 4], [18, 0]);
    N.pxPoly(c, fc.pts.map(p => T(p[0], p[1])), C.F);
    const fs = N.pathB().m([18, -22]).b([30, -14], [44, -12], [50, -16]).b([46, -2], [30, 4], [18, 0]);
    N.pxPoly(c, fs.pts.map(p => T(p[0], p[1])), C.f);
    const eye = F.eye || 'calm';
    if (eye === 'up') { const e = T(42, -40); R(c, e[0], e[1] - 1, 1, 2, C.E); }
    else { const e = T(40, -36);
      if (eye === 'closed' || eye === 'down' || eye === 'strain') R(c, e[0] - 1, e[1] + 1, 2, 1, C.E);
      else if (eye === 'shock') R(c, e[0] - 1, e[1] - 1, 2, 2, C.E);
      else R(c, e[0], e[1] - 1, 1, 2, C.E); }
    if (mid) mid();
    if (F.farFront) arm(shF, F.hands[0], C.c, F.hand?.[0] || 'fist');
    arm(sh, F.hands[1], C.A, F.hand?.[1] || 'fist');
  };
  const frac = x => x - Math.floor(x);
  // walk(x, gy, s, f, ph, stride, lean, lift = 22): walking pose (feet plant 58 % of the cycle; ph ∝ distance / stride).
  N.walk = function (x, gy, s, f, ph, stride, lean, lift = 22) {
    const feet = [0, 1].map(i => { const p = frac(ph + i * .5); let off, up = 0;
      if (p < .58) off = stride * (.29 - p); else { const u = (p - .58) / .42; off = -.29 * stride + .58 * stride * eio(u); up = lift * Math.sin(Math.PI * u); }
      return [x + f * off * s, gy - up * s]; });
    const hipH = (BD.HIPH - 6 * Math.abs(Math.sin(TAU * ph))) * s;
    return { s, f, gy, hip: [x, gy - hipH], ang: f * lean, feet, hands: [null, null], hand: ['fist', 'fist'], tilt: 0, eye: 'calm', sway: -f * 8 * Math.sin(TAU * ph), ph };
  };
  // stand(x, gy, s, f, lean = .05): standing, hands hanging.
  N.stand = function (x, gy, s, f, lean = .05) { return { s, f, gy, hip: [x, gy - (BD.HIPH + 1) * s], ang: f * lean, feet: [[x - f * 16 * s, gy], [x + f * 20 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: 0, eye: 'calm', sway: 0 }; };
  // kneel(x, gy, s, f, lean = .25): on one knee (far knee down, near foot planted ahead). lean > .6 = bent over the ground.
  N.kneel = function (x, gy, s, f, lean = .25) { return { s, f, gy, hip: [x, gy - 64 * s], ang: f * lean, feet: [[x - f * 96 * s, gy - 2 * s], [x + f * 52 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: .2, eye: 'calm', sway: 0 }; };
  // crouch(x, gy, s, f, lean = .5): squatting on both feet, leaning over the ground ahead.
  N.crouch = function (x, gy, s, f, lean = .5) { return { s, f, gy, hip: [x, gy - 70 * s], ang: f * lean, feet: [[x - f * 18 * s, gy], [x + f * 40 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: .25, eye: 'calm', sway: 0 }; };
  // lookUp(F, k = 1): head back, eyes up. Returns F.
  N.lookUp = function (F, k = 1) { F.tilt = (F.tilt || 0) * (1 - k) - .35 * k; F.eye = k > .5 ? 'up' : F.eye; return F; };
  // hangHands(F, swing) → [far, near] hanging hand points; hangGrip(F, sw) → a near hand holding a tool down at the side.
  N.hangHands = function (F, swing = 0) { const fr = N.frame(F), sh = fr.P(4, 114); return [[sh[0] - F.f * (10 + swing) * F.s, sh[1] + 116 * F.s], [sh[0] - F.f * (10 - swing) * F.s, sh[1] + 116 * F.s]]; };
  N.hangGrip = (F, sw = 0) => { const sh = N.shoulderOf(F); return [sh[0] + F.f * (18 + sw) * F.s, sh[1] + 92 * F.s]; };
  // reach(F, i, p, type): hand i (0 far, 1 near) to design point p. handR / handL: index of the right / left hand.
  N.reach = function (F, i, p, type) { F.hands = F.hands.slice(); F.hands[i] = p; if (type) { F.hand = (F.hand || ['fist', 'fist']).slice(); F.hand[i] = type; } return F; };
  N.handR = F => F.f > 0 ? 1 : 0; N.handL = F => F.f > 0 ? 0 : 1;
  // mix(A, B, k): blend two poses (null hands blend from hanging; discrete fields switch at .5).
  N.mix = function (A, Bs, k) {
    if (k <= 0) return A; if (k >= 1) return Bs;
    const l2 = (a, b) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], hA = N.hangHands(A), hB = N.hangHands(Bs);
    const pick = k < .5 ? A : Bs;
    return { ...pick, s: lerp(A.s, Bs.s, k), gy: lerp(A.gy, Bs.gy, k), hip: l2(A.hip, Bs.hip), ang: lerp(A.ang, Bs.ang, k), feet: [l2(A.feet[0], Bs.feet[0]), l2(A.feet[1], Bs.feet[1])],
      hands: [0, 1].map(i => l2(A.hands[i] || hA[i], Bs.hands[i] || hB[i])), hand: pick.hand.slice(), tilt: lerp(A.tilt || 0, Bs.tilt || 0, k), sway: lerp(A.sway || 0, Bs.sway || 0, k) };
  };
  // turn(A, B, k): turn around (facing flips at .5) with a squash to 25 % width mid-turn.
  N.turn = function (A, Bs, k) { const F = N.mix(A, Bs, k); if (k > 0 && k < 1) F.sq = Math.max(.25, Math.abs(Math.cos(Math.PI * k))); return F; };

  window.Flatcamp = N;
})();

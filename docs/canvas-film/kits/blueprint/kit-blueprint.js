/* kit-blueprint.js — cyanotype engineering drawing (청사진 설계도), as a reusable word-log house style.  Global: window.Blueprint
   One sheet of Prussian-blue paper (mottled, two fold creases, fibres, grain, a faint drafting grid), white line work drawn
   on with a glowing pen nib, 45° section hatching, centre lines, dimension lines with arrowheads and lettered labels, and
   ONE red correction pencil for "mine" (the thing the film is about). The world is drawn in cabinet-oblique projection in
   metres: x along the ground, y up, d depth (a lane further back is drawn up and a little right). Figures are line-art
   pilgrims (hooded tunic, tube limbs) with a 2-bone arm rig; their insides are filled with the sheet itself, so a figure
   hides what is behind it but still looks like paper. The dimension is the narrator: a number that is struck through and
   corrected, a requirement hung under a gap, a red shortfall — the drawing *proves* the point.
   Load after lib.js and story.js:  <script src="lib.js"></script><script src="story.js"></script><script src="kit-blueprint.js"></script>
   Pure and deterministic: the only state is the textures built by init() and the current camera (set every frame with
   setCam); seeded randomness only, any seek order. No network, no images.
   Worked example: sermons/2026-10-11-1cor4/film/scenes/cross-blueprint.html (잘라 낸 건 다리였다 ①). */
(function () {
  const { clamp, lerp, ss, eo } = Pilot;
  const K = {};
  const W = Pilot.W, H = Pilot.H;

  // ---------------------------------------------------------------- palette, type, line weights
  K.INK = '#e8f1fb';          // white line work (and figure outlines)
  K.RED = '#ff5d4d';          // the ONE accent: red correction pencil — "mine", the number that matters. init({ red }) to change.
  K.SHEET = '#1d4185';        // sheet base under the texture (shows outside the texture's extent)
  K.CAP = '#f4f8fd';          // caption / end-card title white
  K.SRC = '#d2e2f6';          // source lines, credits
  K.SANS = "'Noto Sans KR',sans-serif"; K.SERIF = "'Noto Serif KR',serif";
  // pass to Pilot.run({ fonts: Blueprint.FONTS }) so every face is loaded before the first frame
  K.FONTS = ["800 64px 'Noto Sans KR'", "600 54px 'Noto Sans KR'", "500 28px 'Noto Sans KR'", "700 30px 'Noto Sans KR'", "400 30px 'Noto Sans KR'", "700 72px 'Noto Serif KR'"];
  // line weights in px at zoom Z0 (screen width = w · (z/Z0)^.65 — lines thicken a little, not fully, as the camera pushes in)
  K.OUT = 3.4; K.DET = 2.3; K.THIN = 1.4; K.HAIR = 1.0;
  K.Z0 = 150;                 // reference zoom (px per metre) for line weights and label sizes
  // fmt(v): a length in metres as the drawing letters it — 3.0, 2.4, 1.86 (one decimal when it is exact)
  K.fmt = v => (Math.round(v * 100) % 10 === 0 ? v.toFixed(1) : v.toFixed(2));

  // ---------------------------------------------------------------- small math (3-vectors [x, y, d])
  K.add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  K.sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  K.mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  K.mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  K.nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  // keys([[t, v], …], t): piecewise-linear key track (held before the first and after the last key)
  K.keys = (KK, t) => { if (t <= KK[0][0]) return KK[0][1]; for (let i = 1; i < KK.length; i++) if (t <= KK[i][0]) return lerp(KK[i - 1][1], KK[i][1], (t - KK[i - 1][0]) / (KK[i][0] - KK[i - 1][0])); return KK[KK.length - 1][1]; };
  const { add, sub, mul, mix3, nrm } = K;

  // ---------------------------------------------------------------- camera / projection
  // Cabinet-oblique: sheet coords sx = x + KX·d, sy = y + KY·d (1 m of depth = .14 m right, .4 m up). The camera is a
  // point on the sheet (cx, cy, metres) shown at screen (AX, AY) and a zoom z (px per metre).
  let KX = .14, KY = .4, AX = 540, AY = 1050;
  let CAM = { cx: 0, cy: 0, z: K.Z0 };
  // setCam({cx, cy, z}): call once per frame before drawing anything. K.cam is the current camera.
  K.setCam = c => { CAM = c; };
  Object.defineProperty(K, 'cam', { get: () => CAM });
  // KX, KY: the current oblique shear (read-only; set with init) — a camera aimed at a point in lane d uses cx = x + KX·d, cy = y + KY·d
  Object.defineProperty(K, 'KX', { get: () => KX }); Object.defineProperty(K, 'KY', { get: () => KY });
  // P(x, y, d = 0) → [px, py] screen point of a world point in metres.  P3([x, y, d]) the same for a 3-vector.
  K.P = (x, y, d = 0) => [AX + (x + KX * d - CAM.cx) * CAM.z, AY - (y + KY * d - CAM.cy) * CAM.z];
  K.P3 = q => K.P(q[0], q[1], q[2]);
  // LW(w): a line weight given at Z0 → screen px at the current zoom
  K.LW = w => w * Math.pow(CAM.z / K.Z0, .65);
  const { P, P3, LW } = K;
  // camMix(a, b, k): blend two cameras (use with eio/ss for a move; hard cuts are just a different camera)
  K.camMix = (a, b, k) => ({ cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: lerp(a.z, b.z, k) });
  // hitCam(c, t, at, to = {cx, cy}, o = {zoom: .22, creep: 5, shake: .03, snap: .14}): the hit — snap (eo over `snap` s)
  // toward `to`, zoom in by `zoom`, keep creeping in `creep` px/m per s, and a damped shake of `shake` m. Returns c before `at`.
  K.hitCam = (c, t, at, to, o = {}) => {
    if (t < at) return c;
    const q = eo(clamp((t - at) / (o.snap ?? .14))), sh = Math.exp(-(t - at) * 9) * Math.sin((t - at) * 70) * (o.shake ?? .03);
    return { cx: lerp(c.cx, to.cx, q) + sh, cy: lerp(c.cy, to.cy, q) - sh, z: c.z * (1 + (o.zoom ?? .22) * q) + (o.creep ?? 5) * (t - at) };
  };

  // ---------------------------------------------------------------- the sheet (built once, locked to the drawing)
  let TX0 = -12, TY1 = 12, TPPM = 40, TN = 880;   // texture covers sheet x TX0…TX0+TN/TPPM, y TY1−TN/TPPM…TY1 (metres)
  let TEX, GRAIN, VIG, PAT, GPAT;
  // init(o): builds the sheet texture (≈ 0.25 s), grain tile and vignette. Call once from Pilot.run({ init }).
  //   o.kx, o.ky        oblique depth shear (default .14, .4)        o.ax, o.ay   screen anchor of the camera point (540, 1050)
  //   o.tex = { x0, y1, ppm, n }   the texture's extent in sheet metres (default x −12…10, y −10…12 at 40 px/m) — make it
  //                     cover everything the camera will see, or the flat SHEET colour shows at the edges
  //   o.creases = [x, y]  where the two fold creases run (sheet metres; default [−2.6, 6.2])   o.seed (7)   o.red
  K.init = function (o = {}) {
    if (o.kx != null) KX = o.kx; if (o.ky != null) KY = o.ky; if (o.ax != null) AX = o.ax; if (o.ay != null) AY = o.ay;
    if (o.red) K.RED = o.red;
    if (o.tex) { TX0 = o.tex.x0 ?? TX0; TY1 = o.tex.y1 ?? TY1; TPPM = o.tex.ppm ?? TPPM; TN = o.tex.n ?? TN; }
    const [CX, CY] = o.creases || [-2.6, 6.2], seed = o.seed ?? 7;
    PAT = GPAT = null;
    TEX = Pilot.canvas(TN, TN); const x = TEX.getContext('2d'), id = x.createImageData(TN, TN), D = id.data;
    const A = [20, 46, 100], Bc = [44, 92, 168];
    for (let j = 0; j < TN; j++) for (let i = 0; i < TN; i++) {
      const sx = TX0 + i / TPPM, sy = TY1 - j / TPPM;
      const n = Pilot.fbm(sx * .32 + 3, sy * .32 + 7, 4), st = Pilot.noise(sx * .07 + 11, sy * .9), fine = Pilot.fbm(sx * 1.7, sy * 1.7, 2);
      let v = clamp(.2 + .64 * n + .07 * (st - .5) + .12 * (fine - .5));
      const cr1 = Math.abs(sx - CX), cr2 = Math.abs(sy - CY);                          // two fold creases
      v += .07 * Math.exp(-cr1 * cr1 * 900) - .05 * Math.exp(-((cr1 - .05) ** 2) * 900) + .06 * Math.exp(-cr2 * cr2 * 900);
      const c = Pilot.mix(A, Bc, clamp(v)), k = (j * TN + i) * 4;
      D[k] = c[0]; D[k + 1] = c[1]; D[k + 2] = c[2]; D[k + 3] = 255;
    }
    x.putImageData(id, 0, 0);
    const r = Pilot.rng(seed); x.strokeStyle = 'rgba(200,225,255,.07)'; x.lineWidth = 1;     // fibres
    for (let i = 0; i < 260; i++) { const a = r() * 6.28, px = r() * TN, py = r() * TN, l = 4 + r() * 10; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + 1) * l, py + Math.sin(a + 1) * l, px + Math.cos(a) * l * 2, py + Math.sin(a) * l * 2); x.stroke(); }
    GRAIN = Pilot.canvas(256, 256); const g = GRAIN.getContext('2d'), r2 = Pilot.rng(seed + 4);
    for (let i = 0; i < 2600; i++) { g.fillStyle = r2() < .5 ? `rgba(225,238,255,${.04 + r2() * .08})` : `rgba(6,16,40,${.05 + r2() * .1})`; g.fillRect(r2() * 256, r2() * 256, 1 + r2() * 1.4, 1 + r2() * 1.4); }
    for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(230,242,255,${.1 + r2() * .15})`; g.beginPath(); g.arc(r2() * 256, r2() * 256, .6 + r2() * 1.3, 0, 7); g.fill(); }
    VIG = Pilot.canvas(W, H); const v = VIG.getContext('2d'), gr = v.createRadialGradient(W / 2, H * .5, H * .25, W / 2, H * .5, H * .78);
    gr.addColorStop(0, 'rgba(5,12,32,0)'); gr.addColorStop(1, 'rgba(5,12,32,.5)'); v.fillStyle = gr; v.fillRect(0, 0, W, H);
  };
  function texM() { const a = CAM.z / TPPM; return [a, AX + (TX0 - CAM.cx) * CAM.z, AY - (TY1 - CAM.cy) * CAM.z]; }
  function patSync() { const m = texM(); if (PAT) PAT.setTransform(new DOMMatrix([m[0], 0, 0, m[0], m[1], m[2]])); return m; }
  // sheet(g): the first thing every frame — paper texture locked to the drawing (moves and scales with the camera) and the
  // faint drafting grid every .5 m (every 2.5 m a little stronger).
  K.sheet = function (g) {
    if (!PAT) { PAT = g.createPattern(TEX, 'repeat'); GPAT = g.createPattern(GRAIN, 'repeat'); }
    const [a, e, f] = patSync();
    g.fillStyle = K.SHEET; g.fillRect(0, 0, W, H);
    g.imageSmoothingEnabled = true; g.drawImage(TEX, e, f, TN * a, TN * a);
    const x0 = CAM.cx - AX / CAM.z, x1 = CAM.cx + (W - AX) / CAM.z, y0 = CAM.cy - (H - AY) / CAM.z, y1 = CAM.cy + AY / CAM.z;
    for (const [st, al] of [[.5, .045], [2.5, .07]]) {
      g.beginPath();
      for (let x = Math.ceil(x0 / st) * st; x <= x1; x += st) { const X = AX + (x - CAM.cx) * CAM.z; g.moveTo(X, 0); g.lineTo(X, H); }
      for (let y = Math.ceil(y0 / st) * st; y <= y1; y += st) { const Y = AY - (y - CAM.cy) * CAM.z; g.moveTo(0, Y); g.lineTo(W, Y); }
      g.strokeStyle = `rgba(215,232,255,${al})`; g.lineWidth = 1; g.stroke();
    }
  };
  // detail(g, c, r, cam, paint, o): a DETAIL CALLOUT — a paper circle at screen c (radius r px) showing the drawing again
  // through another camera centred on c (e.g. a 6× close-up of what is under the ground), a double ring, a leader line to o.at (screen
  // point on the main drawing, ringed there too) and a label (o.label, e.g. '상세 A'). paint(g) draws inside with the kit
  // as usual (P/line/hatch… all use the detail camera). o.k 0..1 opens it (ring draws on, contents fade in), o.alpha.
  K.detail = function (g, c, r, cam, paint, o = {}) {
    const k = o.k ?? 1; if (k <= 0) return;
    const main = CAM, a = (o.alpha ?? 1);
    if (o.at) { const at = o.at, dx = c[0] - at[0], dy = c[1] - at[1], l = Math.hypot(dx, dy) || 1, e = [c[0] - dx / l * r, c[1] - dy / l * r];
      line(g, [at, e], K.THIN, K.INK, { k: ss(0, .5, k), alpha: .85 * a, nib: false });
      g.save(); g.globalAlpha *= a * ss(0, .3, k); g.strokeStyle = K.INK; g.lineWidth = LW(K.THIN); g.beginPath(); g.arc(at[0], at[1], o.atR || 26, 0, 7); g.stroke(); g.restore(); }
    const kc = ss(.3, 1, k);
    if (kc > 0) {
      g.save(); g.globalAlpha *= a * kc; g.beginPath(); g.arc(c[0], c[1], r, 0, 7); g.clip();
      const ax = AX, ay = AY; AX = c[0]; AY = c[1];          // the detail camera's point sits at the circle's centre
      CAM = cam; K.sheet(g); paint(g); CAM = main; AX = ax; AY = ay; patSync();
      g.restore();
    }
    g.save(); g.globalAlpha *= a; g.strokeStyle = K.INK; g.lineWidth = LW(K.DET);
    g.beginPath(); g.arc(c[0], c[1], r, -Math.PI / 2, -Math.PI / 2 + 6.2832 * ss(.2, .9, k)); g.stroke();
    g.lineWidth = LW(K.HAIR); g.beginPath(); g.arc(c[0], c[1], r + 8, -Math.PI / 2, -Math.PI / 2 + 6.2832 * ss(.3, 1, k)); g.stroke(); g.restore();
    if (o.label) label(g, o.label, c[0], c[1] + r + 44, { alpha: a * kc, size: o.labelSize || 30, weight: 700, patch: true });
  };
  // paper(): the sheet as a fill/stroke style (a pattern locked to the drawing). Fill a shape with it to make it opaque
  // paper (figures, door leaves, label patches): it hides what is behind and still looks like the sheet. Valid after sheet().
  K.paper = () => PAT;
  // finish(g): after all line work, before words — grain over the ink (moves with the sheet), then a soft vignette.
  K.finish = function (g) {
    const [, e, f] = texM(); GPAT.setTransform(new DOMMatrix([1, 0, 0, 1, Math.round(e), Math.round(f)]));
    g.fillStyle = GPAT; g.fillRect(0, 0, W, H); g.drawImage(VIG, 0, 0);
  };

  // ---------------------------------------------------------------- line work
  // PL(g, pts, close): path through screen points (no stroke)
  const PL = K.PL = (g, p, close) => { g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); if (close) g.closePath(); };
  // trunc(pts, k): the first k (0..1) of a polyline by length — for drawing a line on
  const trunc = K.trunc = function (p, k) {
    let tot = 0; const L = [0]; for (let i = 1; i < p.length; i++) { tot += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); L.push(tot); }
    const want = tot * clamp(k), out = [p[0]];
    for (let i = 1; i < p.length; i++) { if (L[i] <= want) { out.push(p[i]); continue; } const f = (want - L[i - 1]) / ((L[i] - L[i - 1]) || 1); out.push([lerp(p[i - 1][0], p[i][0], f), lerp(p[i - 1][1], p[i][1], f)]); break; }
    return out;
  };
  // nib(g, p): the glowing pen point at the head of a line being drawn
  const nib = K.nib = function (g, p) { const r = 16, gr = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], r); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(190,220,255,0)'); g.fillStyle = gr; g.fillRect(p[0] - r, p[1] - r, 2 * r, 2 * r); };
  // line(g, pts, w, col = INK, o): a drawn line through screen points, weight w (px at Z0).
  //   o.k 0..1 draws it on (with the nib at its head unless o.nib === false) · o.alpha · o.dash [px at Z0] · o.cap · o.close
  const line = K.line = function (g, pts, w, col = K.INK, o = {}) {
    const k = o.k == null ? 1 : o.k; if (k <= 0) return;
    g.save(); if (o.alpha != null) g.globalAlpha *= o.alpha;
    g.strokeStyle = col; g.lineWidth = LW(w); g.lineCap = o.cap || 'round'; g.lineJoin = 'round';
    if (o.dash) g.setLineDash(o.dash.map(v => v * Math.pow(CAM.z / K.Z0, .65)));
    const p = k < 1 ? trunc(pts, k) : pts; PL(g, p, o.close && k >= 1); g.stroke();
    if (k < 1 && o.nib !== false) nib(g, p[p.length - 1]);
    g.restore();
  };
  // hatch(g, poly, sp = .12 m, alpha = .5, w = HAIR, col): 45° section hatching inside a screen polygon, spacing in metres,
  // phase locked to the world origin (so hatching does not crawl as the camera moves)
  const hatch = K.hatch = function (g, poly, sp = .12, alpha = .5, w = K.HAIR, col = K.INK) {
    g.save(); PL(g, poly, true); g.clip();
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    x0 = Math.max(x0, -50); x1 = Math.min(x1, W + 50); y0 = Math.max(y0, -50); y1 = Math.min(y1, H + 50);
    if (x0 < x1 && y0 < y1) {
      const o = P(0, 0), s = sp * CAM.z * Math.SQRT2, c0 = o[0] + o[1] + Math.ceil((x0 + y0 - o[0] - o[1]) / s) * s;
      g.beginPath(); for (let c = c0; c <= x1 + y1; c += s) { g.moveTo(c - y0, y0); g.lineTo(c - y1, y1); }
      g.strokeStyle = col; g.globalAlpha *= alpha; g.lineWidth = LW(w); g.stroke();
    }
    g.restore();
  };
  // dim(g, a, b, off, label, o): a dimension between screen points a and b, offset `off` px (+ = right of a→b), with
  // extension lines, arrowheads and the label lettered on a paper patch along the line.
  //   o.k 0..1 draws it on (extensions → line from the middle out → arrows → label) · o.col · o.red (red pencil: heavier,
  //   tilted, doubled) · o.size, o.weight · o.alpha · o.strike 0..1 strikes the label through
  const dim = K.dim = function (g, a, b, off, label, o = {}) {
    const k = o.k == null ? 1 : o.k; if (k <= 0) return;
    const col = o.col || K.INK, dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux, sg = Math.sign(off) || 1;
    const a2 = [a[0] + nx * off, a[1] + ny * off], b2 = [b[0] + nx * off, b[1] + ny * off], m = [(a2[0] + b2[0]) / 2, (a2[1] + b2[1]) / 2];
    g.save(); g.globalAlpha *= o.alpha ?? 1;
    const ext = p => line(g, [[p[0] + nx * sg * 5, p[1] + ny * sg * 5], [p[0] + nx * (off + sg * 12), p[1] + ny * (off + sg * 12)]], K.HAIR, col, { k: ss(0, .4, k), nib: false });
    ext(a); ext(b);
    const kk = ss(.2, .8, k), p0 = [lerp(m[0], a2[0], kk), lerp(m[1], a2[1], kk)], p1 = [lerp(m[0], b2[0], kk), lerp(m[1], b2[1], kk)];
    line(g, [p0, p1], o.red ? 1.6 : K.THIN, col, { nib: false });
    if (kk > .98) for (const [p, s] of [[a2, 1], [b2, -1]]) {      // arrowheads pointing outward
      const L = LW(13), Wd = LW(4.2); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] + ux * s * L + nx * Wd, p[1] + uy * s * L + ny * Wd); g.lineTo(p[0] + ux * s * L - nx * Wd, p[1] + uy * s * L - ny * Wd); g.closePath(); g.fillStyle = col; g.fill();
    }
    const la = ss(.55, 1, k); if (label && la > 0) {
      let ang = Math.atan2(uy, ux); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI; if (o.red) ang -= .045;
      const size = o.size || Math.round(26 * Math.pow(CAM.z / K.Z0, .4)), s = Pilot.tr(label);
      g.save(); g.translate(m[0], m[1]); g.rotate(ang); g.font = `${o.weight || 600} ${size}px ${K.SANS}`;
      const tw = g.measureText(s).width; g.globalAlpha *= la;
      g.fillStyle = PAT; g.fillRect(-tw / 2 - 10, -size * .72, tw + 20, size * 1.3);
      if (o.red) Pilot.text(g, label, 1.6, size * .36 - 1.2, { size, font: K.SANS, weight: o.weight || 600, color: col, alpha: .45 });
      Pilot.text(g, label, 0, size * .36, { size, font: K.SANS, weight: o.weight || 600, color: col });
      if (o.strike) { const sk = clamp(o.strike); g.strokeStyle = col; g.lineWidth = LW(2.4); g.beginPath(); g.moveTo(-tw / 2 - 6, size * .05); g.lineTo(-tw / 2 - 6 + (tw + 12) * sk, -size * .12); g.stroke(); }
      g.restore();
    }
    g.restore();
  };
  // dimW(g, a3, b3, offM, label, o): a dimension between two WORLD points, offset in metres (e.g. along a carried beam)
  K.dimW = (g, a, b, off, lab, o = {}) => dim(g, P3(a), P3(b), off * CAM.z, lab, o);
  // label(g, s, x, y, o): small free sheet text at screen x, y. o.patch puts it on a paper patch (reads over lines);
  // o.col, o.size (default scales with zoom), o.weight, o.alpha, o.align, o.ls
  const label = K.label = function (g, s, x, y, o = {}) {
    const size = o.size || Math.round(24 * Math.pow(CAM.z / K.Z0, .4));
    if (o.patch) { g.save(); g.font = `${o.weight || 600} ${size}px ${K.SANS}`; const tw = g.measureText(Pilot.tr(s)).width, al = o.align || 'center', x0 = al === 'left' ? x : x - tw / 2;
      g.globalAlpha *= o.alpha ?? 1; g.fillStyle = PAT; g.fillRect(x0 - 8, y - size * .95, tw + 16, size * 1.3); g.restore(); }
    Pilot.text(g, s, x, y, { size, font: K.SANS, weight: o.weight || 600, color: o.col || K.INK, alpha: o.alpha ?? 1, align: o.align, ls: o.ls });
  };
  // strikeOld(g, x, y, ang, s, fresh, o): the correction move — an old figure `s` lettered in red at screen x, y (rotated
  // ang − .05) with a stroke striking it through over the first .3 s of `fresh` (s since the change); fades out 1.1–1.6 s.
  // Draw the new dimension next to it. o.size (44), o.w (half width of the strike, 72 px), o.col (RED)
  K.strikeOld = function (g, x, y, ang, s, fresh, o = {}) {
    const col = o.col || K.RED, w = o.w || 72;
    g.save(); g.translate(x, y); g.rotate(ang - .05); g.globalAlpha = 1 - ss(1.1, 1.6, fresh);
    Pilot.text(g, s, 0, 16, { size: o.size || 44, font: K.SANS, weight: 700, color: col });
    g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.moveTo(-w, 4); g.lineTo(-w + 2 * w * ss(0, .3, fresh), -10); g.stroke(); g.restore();
  };

  // ---------------------------------------------------------------- figures (line-art pilgrims: tunic, hood, tube limbs)
  // A pose F = { hip, sh, head, kn: [near, far], ft: [near, far], f, ph, toe } — world points (metres). f = facing: +1 right,
  // −1 left; anything between squashes the figure across (a turn: animate f from 1 to −1 — see turn()). Thigh LT and shin LS
  // are fixed lengths, so legs never stretch; arms are solved by ik() with fixed bones (.31 + .30 m) at draw time.
  const LT = .46, LS = .46;
  K.LT = LT; K.LS = LS;
  // walkPose(x, d, f, ph, amp, heavy, yb = 0): walking/standing at x (hip), lane d. ph = walk phase (radians; advance it by
  // 2π per stride length so feet don't slide), amp = stride (0 = stand still, .24 walk, .6 run), heavy 0..1 = lean and
  // stoop under a load, yb = lift the whole body (stepping onto something)
  K.walkPose = function (x, d, f, ph, amp, heavy, yb = 0) {
    const legs = [0, 1].map(i => { const p = ph + i * Math.PI, th = amp * Math.sin(p), kb = amp * 1.4 * Math.max(0, Math.cos(p)) + .04;
      return { th, kb, h: LT * Math.cos(th) + LS * Math.cos(th - kb) }; });
    const hy = Math.max(legs[0].h, legs[1].h) + yb, lean = .05 + .13 * heavy;
    const hip = [x, hy, d], sh = [x + lean * f, hy + .5 - .06 * heavy, d], head = [sh[0] + (.05 + .11 * heavy) * f, sh[1] + .22 - .07 * heavy, d];
    const kn = [], ft = [];
    legs.forEach((L, i) => { const dd = d + (i ? .1 : -.1);
      kn[i] = [x + LT * Math.sin(L.th) * f, hy - LT * Math.cos(L.th), dd];
      ft[i] = [kn[i][0] + LS * Math.sin(L.th - L.kb) * f, kn[i][1] - LS * Math.cos(L.th - L.kb), dd]; });
    return { hip, sh, head, kn, ft, f, ph, toe: [[.12 * f, .01], [.12 * f, .01]] };
  };
  // kneelPose(x, d, f): near knee down, far knee up; torso leaning well forward over the work (hands reach the ground ahead)
  K.kneelPose = function (x, d, f) {
    return { hip: [x, .42, d], sh: [x + .42 * f, .66, d], head: [x + .6 * f, .8, d],
      kn: [[x + .1 * f, .05, d - .1], [x + .36 * f, .43, d + .1]], ft: [[x - .3 * f, .1, d - .1], [x + .38 * f, .0, d + .1]], f, ph: 0, toe: [[-.04 * f, -.08], [.12 * f, .01]] };
  };
  // sitBackPose(x, d, f): kneeling upright, sitting back on the heels (waiting, watching something low in front)
  K.sitBackPose = function (x, d, f) {
    return { hip: [x - .08 * f, .5, d], sh: [x - .02 * f, 1.0, d], head: [x + .06 * f, 1.2, d],
      kn: [[x + .32 * f, .06, d - .1], [x + .3 * f, .06, d + .1]], ft: [[x - .14 * f, .05, d - .1], [x - .16 * f, .05, d + .1]], f, ph: 0, toe: [[-.04 * f, -.06], [-.04 * f, -.06]] };
  };
  // crouchPose(x, d, f): a squat — both feet flat, knees forward, hips low, torso forward (picking something up)
  K.crouchPose = function (x, d, f) {
    const kn = [[x + .38 * f, .4, d - .1], [x + .34 * f, .42, d + .1]], ft = [[x + .12 * f, 0, d - .1], [x + .06 * f, 0, d + .1]];
    return { hip: [x - .02 * f, .44, d], sh: [x + .3 * f, .86, d], head: [x + .46 * f, 1.03, d], kn, ft, f, ph: 0, toe: [[.12 * f, .01], [.12 * f, .01]] };
  };
  // mixPose(A, B, k): in-between two poses (k 0..1). Go through it for every change of pose (stand → kneel ≈ .25–.35 s).
  const mixPose = K.mixPose = function (A, Bp, k) {
    if (k <= 0) return A; if (k >= 1) return Bp;
    return { hip: mix3(A.hip, Bp.hip, k), sh: mix3(A.sh, Bp.sh, k), head: mix3(A.head, Bp.head, k),
      kn: [0, 1].map(i => mix3(A.kn[i], Bp.kn[i], k)), ft: [0, 1].map(i => mix3(A.ft[i], Bp.ft[i], k)), f: lerp(A.f, Bp.f, k), ph: A.ph,
      toe: [0, 1].map(i => [lerp(A.toe[i][0], Bp.toe[i][0], k), lerp(A.toe[i][1], Bp.toe[i][1], k)]) };
  };
  // look(F, k): tilt the head — k > 0 looks up (head back and up), k < 0 looks down (head forward and down). |k| ≤ 1.
  // Returns a new pose. (cross-blueprint's "looks down" after the fall = look(F, −1).)
  K.look = (F, k) => ({ ...F, head: k < 0 ? add(F.head, [-.05 * k * F.f, .06 * k, 0]) : add(F.head, [-.04 * k * F.f, .03 * k, 0]) });
  // turn(t, at, dur = .25, from = 1, to = −1): facing f over a turn — passes through 0, where the figure is squashed flat
  K.turn = (t, at, dur = .25, from = 1, to = -1) => lerp(from, to, ss(at, at + dur, t));
  // ik(s, h, l1, l2): two-bone arm in SCREEN space from shoulder s to hand target h (bone lengths px). The elbow takes the
  // lower of the two solutions (elbows hang); an unreachable target is clamped (the hand stops at full reach). → [elbow, wrist]
  const ik = K.ik = function (s, h, l1, l2) {
    const dx = h[0] - s[0], dy = h[1] - s[1], D = Math.hypot(dx, dy), Dc = clamp(D, Math.abs(l1 - l2) + 1, l1 + l2 - .5), a = Math.atan2(dy, dx);
    const A = Math.acos(clamp((l1 * l1 + Dc * Dc - l2 * l2) / (2 * l1 * Dc), -1, 1));
    const e1 = [s[0] + l1 * Math.cos(a + A), s[1] + l1 * Math.sin(a + A)], e2 = [s[0] + l1 * Math.cos(a - A), s[1] + l1 * Math.sin(a - A)];
    const e = e1[1] > e2[1] ? e1 : e2, w = [s[0] + Dc * Math.cos(a), s[1] + Dc * Math.sin(a)];
    return [e, w];
  };
  // shoulders(F): the two shoulder joints [near, far] (world) — where the arms hang from
  K.shoulders = F => [0, 1].map(i => add(F.sh, [-.02 * F.f, -.04, i ? .14 : -.14]));
  // figure(g, F, o): draw a pilgrim in pose F. Order: far leg, far arm, tunic (+ belt), o.mid() (what is held between
  // the arms — a carried beam, a tool), [far arm if o.farOver], neck/hood/face, near leg, near arm.
  //   o.hands = [near, far]: world grip points (null = that arm hangs, swinging o.swing 0..1 with the walk phase); the hand
  //     is drawn AT the grip point (one hand, one object). o.thumb: world point for a thumb along a tool handle (near hand).
  //   o.farOver: draw the far arm over the held object (it holds the object from the far side). o.alpha. o.col (INK)
  K.figure = function (g, F, o = {}) {
    const z = CAM.z, f = F.f, lw = LW(2.4), col = o.col || K.INK;
    g.save(); g.globalAlpha *= o.alpha ?? 1; g.lineCap = 'round'; g.lineJoin = 'round';
    const tube = (p, w) => { PL(g, p); g.strokeStyle = col; g.lineWidth = w * z + 2 * lw; g.stroke(); g.strokeStyle = PAT; g.lineWidth = w * z; g.stroke(); };
    const leg = i => { const toe = add(F.ft[i], [F.toe[i][0], F.toe[i][1], 0]); tube([P3([F.hip[0], F.hip[1], F.kn[i][2]]), P3(F.kn[i]), P3(F.ft[i]), P3(toe)], .1); };
    const arm = i => {
      const S3 = add(F.sh, [-.02 * f, -.04, i ? .14 : -.14]), Sx = P3(S3);
      const tg = o.hands && o.hands[i] ? P3(o.hands[i]) : P3(add(S3, [(.06 + .16 * Math.sin(F.ph + (i ? Math.PI : 0)) * (o.swing ?? 0)) * f, -.56, 0]));
      const [e, w] = ik(Sx, tg, .31 * z, .3 * z); tube([Sx, e, w], .075);
      const dx = w[0] - e[0], dy = w[1] - e[1], c = w;
      g.beginPath(); g.ellipse(c[0], c[1], .06 * z, .043 * z, Math.atan2(dy, dx), 0, 7); g.fillStyle = PAT; g.fill(); g.strokeStyle = col; g.lineWidth = lw; g.stroke();
      if (o.thumb && i === 0) { const t2 = P3(o.thumb); PL(g, [c, t2]); g.strokeStyle = col; g.lineWidth = .035 * z + 2 * lw; g.stroke(); g.strokeStyle = PAT; g.lineWidth = .035 * z; g.stroke(); }
    };
    leg(1); if (!o.farOver) arm(1);
    // tunic
    const Sx = P3(F.sh), Hx = P3(F.hip), ax = Hx[0] - Sx[0], ay = Hx[1] - Sx[1], al = Math.hypot(ax, ay) || 1, an = [ax / al, ay / al], pn = [-an[1], an[0]];
    const Hd = P3(add(F.hip, [.02 * f, -.26, 0])), hem = [Hd[0], Hd[1]], ws = .13 * z, wh = .2 * z, hn = [1, 0];
    g.beginPath(); g.moveTo(Sx[0] + pn[0] * ws, Sx[1] + pn[1] * ws); g.lineTo(Hx[0] + pn[0] * ws * 1.15, Hx[1] + pn[1] * ws * 1.15); g.lineTo(hem[0] + hn[0] * wh * Math.sign(pn[0] || 1), hem[1]);
    g.quadraticCurveTo(hem[0], hem[1] + .03 * z, hem[0] - hn[0] * wh * Math.sign(pn[0] || 1), hem[1]); g.lineTo(Hx[0] - pn[0] * ws * 1.15, Hx[1] - pn[1] * ws * 1.15);
    g.lineTo(Sx[0] - pn[0] * ws, Sx[1] - pn[1] * ws); g.quadraticCurveTo(Sx[0] - an[0] * .1 * z, Sx[1] - an[1] * .1 * z, Sx[0] + pn[0] * ws, Sx[1] + pn[1] * ws);
    g.fillStyle = PAT; g.fill(); g.strokeStyle = col; g.lineWidth = lw; g.stroke();
    g.beginPath(); g.moveTo(Hx[0] + pn[0] * .17 * z, Hx[1] + pn[1] * .17 * z); g.lineTo(Hx[0] - pn[0] * .17 * z, Hx[1] - pn[1] * .17 * z); g.lineWidth = LW(1.2); g.stroke();   // rope belt
    if (o.mid) o.mid();
    if (o.farOver) arm(1);
    // neck, hood, face (drawn over the load so the face always reads)
    const Hc = P3(F.head); tube([Sx, [lerp(Sx[0], Hc[0], .7), lerp(Sx[1], Hc[1], .7)]], .07);
    g.beginPath(); g.arc(Hc[0] - .035 * f * z, Hc[1] - .005 * z, .128 * z, 0, 7); g.fillStyle = PAT; g.fill(); g.lineWidth = lw; g.strokeStyle = col; g.stroke();
    g.beginPath(); g.arc(Hc[0] + .02 * f * z, Hc[1] + .012 * z, .088 * z, 0, 7); g.fill(); g.lineWidth = LW(1.3); g.stroke();
    g.beginPath(); g.moveTo(Hc[0] + .1 * f * z, Hc[1] + .0 * z); g.lineTo(Hc[0] + .125 * f * z, Hc[1] + .03 * z); g.lineTo(Hc[0] + .1 * f * z, Hc[1] + .04 * z); g.stroke();
    leg(0);
    arm(0);
    g.restore();
  };

  // ---------------------------------------------------------------- long objects (a beam, a cross, a plank, a staff)
  // A long object X = { foot, top, bar, L }: shaft from foot to top (world), `bar` = unit direction of an optional crossbar
  // (1.2 m, centred .7 m below the top — drawn by cross(); plank()/beams() ignore it), L = length.
  // shoulder(F, L, heavy): carried on the near shoulder. heavy → the foot drags on the ground (angle from geometry);
  // otherwise held at a jaunty .46 rad. Returns X plus C (shoulder contact) and u (shaft direction). Grip: carryHands(X).
  K.shoulder = function (F, L, heavy) {
    const f = F.f, C = [F.sh[0] - .07 * f, F.sh[1] + .08, F.sh[2] - .2], reach = L - .7;
    const a = heavy ? Math.asin(clamp((C[1] - .07) / reach, 0, 1)) : .46, u = [Math.cos(a) * f, Math.sin(a), 0];
    return { foot: add(C, mul(u, -reach)), top: add(C, mul(u, .7)), bar: [-Math.sin(a) * f, Math.cos(a), 0], L, C, u };
  };
  // carryHands(X): grips for a shouldered cross — near hand on the crossbar's lower arm, far hand on the shaft
  K.carryHands = X => [add(X.C, mul(X.bar, -.36)), add(X.C, mul(X.u, .26))];
  // carry(F, L, mode): other holds → { X, hands }.  'front': level, pointing ahead from the belly at waist height, both
  // hands on the near end .22 m apart (a plank, a gift; draw it in o.mid so the near arm is over it);  'upright': standing on the ground beside the near foot, gripped at shoulder height
  // (a staff, a planted cross);  'shoulder': = shoulder(F, L, false), the near hand on the shaft (for a cross use carryHands).
  K.carry = function (F, L, mode = 'shoulder') {
    const f = F.f;
    if (mode === 'front') { const c = [F.sh[0] + .22 * f, F.hip[1] + .12, F.sh[2] - .2], u = [f, 0, 0];   // held out ahead, never through the body
      const X = { foot: add(c, mul(u, -.04)), top: add(c, mul(u, L - .04)), bar: [0, 1, 0], L };
      return { X, hands: [add(c, [.26 * f, .02, 0]), add(c, [.04 * f, .02, .1])] }; }
    if (mode === 'upright') { const b = [F.sh[0] + .32 * f, 0, F.sh[2] - .22];
      const X = { foot: b, top: add(b, [0, L, 0]), bar: [f, 0, 0], L };
      return { X, hands: [add(b, [0, F.sh[1] - .1, 0]), add(b, [0, F.sh[1] - .32, .06])] }; }
    const X = K.shoulder(F, L, false); return { X, hands: [add(X.C, mul(X.u, .2)), null] };   // one hand on the shaft ahead of the shoulder
  };
  // mixX(A, B, k): in-between two placements of a long object (pick-up / set-down)
  K.mixX = (A, Bx, k) => ({ foot: mix3(A.foot, Bx.foot, k), top: mix3(A.top, Bx.top, k), bar: nrm(mix3(A.bar, Bx.bar, k)), L: lerp(A.L, Bx.L, k) });
  // beamRect(a, b, w, inset): screen quad of a beam a→b of width w px
  const beamRect = K.beamRect = function (a, b, w, inset = 0) {
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy); if (l < 1e-3) { dx = 1; dy = 0; } else { dx /= l; dy /= l; }
    const nx = -dy * (w / 2 - inset), ny = dx * (w / 2 - inset), a2 = [a[0] + dx * inset, a[1] + dy * inset], b2 = [b[0] - dx * inset, b[1] - dy * inset];
    return [[a2[0] + nx, a2[1] + ny], [b2[0] + nx, b2[1] + ny], [b2[0] - nx, b2[1] - ny], [a2[0] - nx, a2[1] - ny]];
  };
  // beams(g, [[a, b, w], …], o): timber drawn as one outlined union of screen beams, filled with paper.
  //   o.col · o.red (red pencil: heavier + a doubled offset stroke) · o.dash (a phantom / required outline) · o.hollow (no
  //   fill) · o.tint (a wash over the fill) · o.alpha
  const beams = K.beams = function (g, segs, o = {}) {
    const col = o.col || K.INK, lw = LW(o.red ? 2.5 : 2.1);
    g.save(); g.globalAlpha *= o.alpha ?? 1; g.lineJoin = 'miter';
    if (o.dash) g.setLineDash(o.dash.map(v => v * Math.pow(CAM.z / K.Z0, .65)));
    g.strokeStyle = col; g.lineWidth = lw;
    for (const [a, b, w] of segs) { PL(g, beamRect(a, b, w), true); g.stroke(); }
    if (o.red && !o.dash) { g.globalAlpha *= .45; g.lineWidth = lw * .6; g.save(); g.translate(1.2, -.9); for (const [a, b, w] of segs) { PL(g, beamRect(a, b, w), true); g.stroke(); } g.restore(); g.globalAlpha /= .45; }
    g.setLineDash([]);
    if (!o.hollow) { g.fillStyle = PAT; for (const [a, b, w] of segs) { PL(g, beamRect(a, b, w, lw * .5), true); g.fill(); } }
    if (o.tint) { g.fillStyle = o.tint; for (const [a, b, w] of segs) { PL(g, beamRect(a, b, w, lw * .5), true); g.fill(); } }
    g.restore();
  };
  // cross(g, X, o): a cross (13 cm shaft, 1.2 m × 12 cm crossbar .7 m below the top) with its centre line.
  //   beams() options, plus o.kerf = metres from the foot where a saw kerf is marked
  K.cross = function (g, X, o = {}) {
    const z = CAM.z, u = nrm(sub(X.top, X.foot)), Cc = add(X.top, mul(u, -.7));
    const A0 = P3(X.foot), A1 = P3(X.top), B0 = P3(add(Cc, mul(X.bar, -.6))), B1 = P3(add(Cc, mul(X.bar, .6)));
    beams(g, [[A0, A1, .13 * z], [B0, B1, .12 * z]], o);
    if (!o.dash && (o.alpha ?? 1) > .05) line(g, [A0, A1], K.HAIR, o.col || K.INK, { alpha: .5 * (o.alpha ?? 1), dash: [18, 6, 3, 6] });   // centre line
    if (o.kerf != null) { const p = P3(add(X.foot, mul(u, o.kerf))), q = P3(add(add(X.foot, mul(u, o.kerf)), [.07, 0, 0])), r = P3(add(add(X.foot, mul(u, o.kerf)), [-.07, 0, 0]));
      line(g, [r, q], 1.6, o.col || K.INK, { nib: false }); void p; }
  };
  // plank(g, a3, b3, o): a single beam between two world points (w = o.w m, default .13), beams() options
  K.plank = (g, a, b, o = {}) => beams(g, [[P3(a), P3(b), (o.w || .13) * CAM.z]], o);

  // ---------------------------------------------------------------- light (additive, in the sheet's own blue-white / the accent's red)
  // glow(g, c, r, a): a cool pool of light at screen c, radius r px, strength a 0..1 (a doorway, a lamp, a revelation)
  K.glow = function (g, c, r, a) {
    if (a <= 0) return;
    const gr = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], r);
    gr.addColorStop(0, `rgba(225,240,255,${.32 * a})`); gr.addColorStop(.4, `rgba(200,225,255,${.12 * a})`); gr.addColorStop(1, 'rgba(200,225,255,0)');
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(c[0] - r, c[1] - r, 2 * r, 2 * r); g.restore();
  };
  // redGlow(g, c, r, k): warm red light round the accent at screen c (radius r px, strength k; add a slow sin for a pulse)
  K.redGlow = function (g, c, r, k) {
    const gr = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], r);
    gr.addColorStop(0, `rgba(255,140,110,${.55 * k})`); gr.addColorStop(.45, `rgba(255,90,70,${.2 * k})`); gr.addColorStop(1, 'rgba(255,90,70,0)');
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(c[0] - r, c[1] - r, 2 * r, 2 * r); g.restore();
  };
  // accentPlank(g, a3, b3, o): "mine" — a red-pencil beam between two world points; o.glow 0..1 lights it from within
  // (o.t drives a slight flicker), o.w width m (.13); other beams() options pass through
  K.accentPlank = function (g, a, b, o = {}) {
    const A = P3(a), Bp = P3(b);
    if (o.glow > 0) {
      const c = [(A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2], r = Math.max(70, Math.hypot(Bp[0] - A[0], Bp[1] - A[1]) * .95);
      K.redGlow(g, c, r, o.glow * (.85 + .15 * Math.sin(o.t || 0)));
    }
    beams(g, [[A, Bp, (o.w || .13) * CAM.z]], { col: K.RED, red: true, ...o, tint: o.glow > 0 ? `rgba(255,110,90,${.45 * o.glow})` : o.tint });
  };

  // ---------------------------------------------------------------- the ground: road, section cut, gap, lit gate
  // road(g, segs, o): the road band seen in oblique — near edge line (OUT) with a section-hatched cut .5 m deep below it,
  // a far edge, a dashed centre lane and chainage ticks every metre. segs = [[x0, x1], …] (leave a hole for a gap).
  //   o.d0 near edge depth (−1.6), o.d1 far edge (3.9), o.lane dashed lane depth (1.15; false = none), o.deep cut depth (.5)
  K.road = function (g, segs, o = {}) {
    const d0 = o.d0 ?? -1.6, d1 = o.d1 ?? 3.9, ln = o.lane === undefined ? 1.15 : o.lane, dp = o.deep ?? .5;
    for (const [x0, x1] of segs) {
      hatch(g, [P(x0, 0, d0), P(x1, 0, d0), P(x1, -dp, d0), P(x0, -dp, d0)], .12, .42);
      line(g, [P(x0, -dp, d0), P(x1, -dp, d0)], K.HAIR, K.INK, { alpha: .45 });
      line(g, [P(x0, 0, d0), P(x1, 0, d0)], K.OUT);
      line(g, [P(x0, 0, d1), P(x1, 0, d1)], K.DET, K.INK, { alpha: .75 });
      if (ln != null && ln !== false) line(g, [P(x0, 0, ln), P(x1, 0, ln)], K.HAIR, K.INK, { alpha: .4, dash: [30, 9, 5, 9] });
      for (let x = Math.ceil(x0); x <= x1; x++) line(g, [P(x, 0, d0), P(x, -.1, d0)], K.HAIR, K.INK, { alpha: .6 });   // chainage ticks
    }
  };
  // section(g, pts3, o): a cut face — a world polygon (in the near plane) hatched and outlined: soil, a wall, a bank.
  //   o.sp spacing m (.12), o.alpha hatch (.42), o.w outline weight (DET), o.k draw-on of the outline, o.col
  K.section = function (g, pts, o = {}) {
    const s = pts.map(P3);
    hatch(g, s, o.sp ?? .12, o.alpha ?? .42, K.HAIR, o.col || K.INK);
    line(g, [...s, s[0]], o.w ?? K.DET, o.col || K.INK, { k: o.k, alpha: o.lineAlpha });
  };
  // chasm(g, o): the road breaks off: a dark void from x0 to x1 (deep to `deep`), the near bank's inner face, hatched
  // sections of both banks, broken-off rock lines, both edges in OUT, and a small section label.
  //   o = { x0: 0, x1: 2.6, d0, d1 (road edges), deep: −8, k (lines draw-on), kf (void fade-in), label: '단면 B–B', labelA }
  K.chasm = function (g, o = {}) {
    const X0 = o.x0 ?? 0, GAP = o.x1 ?? 2.6, d0 = o.d0 ?? -1.6, d1 = o.d1 ?? 3.9, DEEP = o.deep ?? -8, k = o.k ?? 1, kf = o.kf ?? 1;
    const voidP = [P(X0, 0, d1), P(GAP, 0, d1), P(GAP, 0, d0), P(GAP, DEEP, d0), P(X0, DEEP, d0), P(X0, 0, d0)];
    g.save(); g.globalAlpha = kf; PL(g, voidP, true);
    const y0 = P(X0, 0, d0)[1], gr = g.createLinearGradient(0, y0 - .8 * CAM.z, 0, y0 + 4 * CAM.z);
    gr.addColorStop(0, 'rgba(10,26,66,.55)'); gr.addColorStop(1, 'rgba(3,10,30,.94)'); g.fillStyle = gr; g.fill();
    const face = [P(X0, 0, d0), P(X0, 0, d1), P(X0, DEEP, d1), P(X0, DEEP, d0)];   // the near bank's inner face (faces us across the gap)
    PL(g, face, true); g.fillStyle = 'rgba(30,66,130,.55)'; g.fill();
    g.restore();
    hatch(g, face, .2, .22 * kf);
    hatch(g, [P(X0 - .42, -.5, d0), P(X0, -.5, d0), P(X0, DEEP, d0), P(X0 - .42, DEEP, d0)], .12, .42 * kf);
    hatch(g, [P(GAP, -.5, d0), P(GAP + .42, -.5, d0), P(GAP + .42, DEEP, d0), P(GAP, DEEP, d0)], .12, .42 * kf);
    const jag = (x, s) => { const p = []; for (let y = -.5; y >= -6; y -= .5) p.push(P(x + s * (.06 * Math.sin(y * 7.3) + .04), y, d0)); return p; };
    line(g, jag(X0 - .42, -1), K.HAIR, K.INK, { alpha: .5, k }); line(g, jag(GAP + .42, 1), K.HAIR, K.INK, { alpha: .5, k });
    line(g, [P(X0, 0, d1), P(X0, 0, d0), P(X0, DEEP, d0)], K.OUT, K.INK, { k });
    line(g, [P(GAP, 0, d1), P(GAP, 0, d0), P(GAP, DEEP, d0)], K.OUT, K.INK, { k });
    line(g, [P(X0, 0, d1), P(X0, -3, d1)], K.THIN, K.INK, { alpha: .45, k });
    if (o.label) label(g, o.label, P(GAP + .9, -1.1, d0)[0], P(GAP + .9, -1.1, d0)[1], { alpha: .75 * (o.labelA ?? 1), size: Math.round(22 * Math.pow(CAM.z / K.Z0, .4)), patch: true });
  };
  // gate(g, o): a panelled double door under a hatched arch, seen side-on in the plane x = o.x (it faces back along the
  // road), light pouring through the gap between the leaves and spilling back across the ground. Draw glow() after the figures.
  //   o = { x: 3.5, d0: −1, d1: 3.4 (leaf extent in depth), h: 2.7, mid: 1.2 (where the leaves meet), gap: .1 (half-gap m,
  //   opens when someone passes), k (lines draw-on), light (0..1), road0, road1 (the threshold line) }
  K.gate = function (g, o = {}) {
    const k = o.k ?? 1; if (k <= 0) return;
    const GX = o.x ?? 3.5, d0 = o.d0 ?? -1.0, d1 = o.d1 ?? 3.4, hh = o.h ?? 2.7, mid = o.mid ?? 1.2, gp = o.gap ?? .1;
    // light from the gap between the door leaves, spilling back across the far bank
    g.save(); g.globalAlpha = o.light ?? 1;
    const sp = [P(GX, 0, mid - gp), P(GX, 0, mid + gp), P(GX - 1.6, 0, mid + gp + 1.3), P(GX - 1.6, 0, mid - gp - 1.3)];
    const sc = P(GX, 0, mid), gs = g.createRadialGradient(sc[0], sc[1], 0, sc[0], sc[1], 1.9 * CAM.z);
    gs.addColorStop(0, 'rgba(235,246,255,.42)'); gs.addColorStop(1, 'rgba(235,246,255,0)'); g.fillStyle = gs; PL(g, sp, true); g.fill();
    PL(g, [P(GX, 0, mid - gp), P(GX, 0, mid + gp), P(GX, hh - .05, mid + gp), P(GX, hh - .05, mid - gp)], true); g.fillStyle = 'rgba(244,250,255,.95)'; g.fill();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { const y = .3 + i * .42, dd = (i - 2.5) * .5, a = P(GX, y, mid - gp * .5), b = P(GX, y + .1, mid + gp * .5), c = P(GX - 1.7, y + .25 + dd * .15, mid + 1.2 + dd * .7), e = P(GX - 1.7, y - .05 + dd * .15, mid - .9 + dd * .7);
      const gr = g.createLinearGradient(a[0], a[1], (c[0] + e[0]) / 2, (c[1] + e[1]) / 2); gr.addColorStop(0, 'rgba(210,232,255,.07)'); gr.addColorStop(1, 'rgba(210,232,255,0)'); g.fillStyle = gr; PL(g, [a, b, c, e], true); g.fill(); }
    g.globalCompositeOperation = 'source-over';
    g.restore();
    // leaves (panelled) and the frame
    for (const [a, b] of [[d0, mid - gp], [mid + gp, d1]]) {
      const q = [P(GX, 0, a), P(GX, 0, b), P(GX, hh, b), P(GX, hh, a)];
      g.save(); g.globalAlpha = k; PL(g, q, true); g.fillStyle = PAT; g.fill(); g.restore();
      line(g, [...q, q[0]], K.DET, K.INK, { k });
      const w = Math.abs(b - a);
      if (w > .5) for (const [y0, y1] of [[.25, 1.2], [1.45, 2.45]]) { const ia = a + Math.sign(b - a) * .2, ib = b - Math.sign(b - a) * .2; line(g, [P(GX, y0, ia), P(GX, y0, ib), P(GX, y1, ib), P(GX, y1, ia), P(GX, y0, ia)], K.HAIR, K.INK, { k, alpha: .7 }); }
    }
    const arch = (r0, rise) => { const p = [P(GX, 0, d0 - r0)]; for (let i = 0; i <= 24; i++) { const a = Math.PI * (1 - i / 24); p.push(P(GX, hh + .15 + rise * Math.sin(a), mid + (mid - d0 + r0) * Math.cos(a))); } p.push(P(GX, 0, d1 + r0)); return p; };
    const ar = arch(.15, .75), ar2 = arch(.42, .95);
    g.save(); g.globalAlpha = k; PL(g, [...ar.slice(1, -1), ...ar2.slice(1, -1).reverse()], true); g.fillStyle = PAT; g.fill(); g.restore();
    hatch(g, [...ar.slice(1, -1), ...ar2.slice(1, -1).reverse()], .09, .5 * k);
    line(g, ar, K.OUT, K.INK, { k }); line(g, ar2, K.DET, K.INK, { k });
    line(g, [P(GX, hh, d0), P(GX, hh, d1)], K.DET, K.INK, { k });
    line(g, [P(GX - .3, 0, o.road0 ?? -1.6), P(GX - .3, 0, o.road1 ?? 3.9)], K.HAIR, K.INK, { alpha: .4, k, dash: [10, 6] });   // threshold
  };

  // ---------------------------------------------------------------- the hit, words, end card
  // negative(g, t, at, frames = 2): the hit — `frames` frames (at 30 fps) of photographic negative from `at`
  K.negative = function (g, t, at, frames = 2) {
    if (t >= at && t < at + frames / 30) { g.save(); g.globalCompositeOperation = 'difference'; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.restore(); }
  };
  // noteBoxes(g, t, lines, o): the title-block box behind each caption (dark blue panel, double white rule), sized to the
  // words; same timing as the caption. o.y (430) must match the captions' y.
  K.noteBoxes = function (g, t, lines, o = {}) {
    const y = o.y || 430;
    lines.forEach(([a, b, s, src]) => {
      const al = Pilot.win(t, a, b, .35, .45); if (al <= 0) return;
      const two = s.includes('\n'), size = two ? 54 : 62, ls = Pilot.tr(s).split('\n');
      g.save(); g.font = `600 ${size}px ${K.SANS}`; let w = Math.max(...ls.map(l => g.measureText(l).width));
      let bot = y + (two ? size * 1.55 : 0) + size * .3 + 30;
      if (src) { g.font = `400 28px ${K.SANS}`; w = Math.max(w, g.measureText(Pilot.tr(src)).width); bot = y + (two ? size * 1.55 : 0) + 76 + 30; }
      const top = y - size - 32, bw = Math.min(W - 60, w + 110), x0 = (W - bw) / 2;
      g.globalAlpha = al; g.fillStyle = 'rgba(12,30,74,.72)'; g.fillRect(x0, top, bw, bot - top);
      g.strokeStyle = 'rgba(232,241,251,.9)'; g.lineWidth = 2; g.strokeRect(x0, top, bw, bot - top);
      g.lineWidth = 1; g.strokeRect(x0 + 7, top + 7, bw - 14, bot - top - 14);
      g.restore();
    });
  };
  // captions(g, t, lines, o): the drawing's own captions — title-block boxes + Story.captions in Noto Sans 600 white,
  // upper third (y 430). Draw after finish() (and after negative()). o overrides Story.captions options.
  K.captions = function (g, t, lines, o = {}) {
    K.noteBoxes(g, t, lines, o);
    Story.captions(g, t, lines, { font: K.SANS, weight: 600, color: K.CAP, srcColor: K.SRC, shadow: 'rgba(4,14,40,.85)', shadowBlur: 14, y: 430, ...o });
  };
  // endCard(g, t, card, at, o): the sheet washes to a deep blue panel with a drawing's title block (double frame, a rule),
  // then Story.endCard in Noto Serif white on it (in within .5 s). o overrides Story.endCard options.
  K.endCard = function (g, t, card, at, o = {}) {
    const a = ss(at, at + .5, t); if (a <= 0) return;
    g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(16,38,88,.84)'; g.fillRect(0, 0, W, H);
    const x0 = 110, x1 = 970, y0 = 600, y1 = 1150;
    g.strokeStyle = 'rgba(232,241,251,.9)'; g.lineWidth = 2.5; g.strokeRect(x0, y0, x1 - x0, y1 - y0); g.lineWidth = 1; g.strokeRect(x0 + 9, y0 + 9, x1 - x0 - 18, y1 - y0 - 18);
    g.beginPath(); g.moveTo(x0 + 9, 930); g.lineTo(x1 - 9, 930); g.stroke();
    g.restore();
    Story.endCard(g, t, card, at, { font: K.SERIF, color: K.CAP, srcColor: K.SRC, titleShadow: '', y: 800, ...o });
  };

  window.Blueprint = K;
})();

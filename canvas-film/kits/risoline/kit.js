/* kit-risoline.js — house style "risograph comic line" (리소 라인) for word-log films.  Global: window.Riso
   Two-ink print look: a flat, mottled teal-blue field with heavy print grain; a thick wobbly black line that BOILS (fresh
   jitter on twos, 12 fps); cream shapes printed a hair out of register; a dot screen for shade. ONE extra ink — yellow —
   for the one thing the film is about (the accent). Comic grammar: sweat drops, gloom lines, surprise ticks, squiggle
   motion lines, heel puffs, a pop-in inset panel, manga focus lines for the hit, a cream comic plate for the end card.
   The figures are beanie kids (the style lab's kid) on a 2-bone IK rig (Riso.Rig): the accent kid in plain cream with a
   striped scarf, the others in cream + dot tone.
   First film: sermons/2026-10-24-cross-styles/film/scenes/cs-risoline.html (잘라 낸 건 다리였다 · 07 — the worked example).
   Style card: styles/risoline/STYLE.md. Template: styles/risoline/template.html.

   HOW A FRAME IS MADE (draw(ctx, t) → Riso.onTwos(ctx, t, scene) → captions / end card on ones)
     scene(ctx, t):  Riso.boil(t);  Riso.field(ctx, cm);  Riso.sky(ctx, cm, t);
                     Riso.cam(ctx, cm, 1);  road.draw(ctx, x0, x1);  …figures (Riso.kid), things (Riso.beam), marks…
                     Riso.screen(ctx);  Riso.focus(…hit…);  Riso.inset(…);  Riso.endPlate(…);  Riso.grain(ctx, cm);
   World units = px at zoom 1 (camera cm = { x, y, z, sx, sy }: the world point at the frame centre, zoom, shake).
   Line width, jitter, misregistration and dot size are camera-compensated by Riso.cam (they stay print-size on screen).
   Pure and seek-safe: seeded randomness only (Pilot.rng / Pilot.noise); textures built once in init(); no images, no network.
   Load after lib.js (Pilot) and story.js (Story). */
(function () {
  const { clamp, lerp, ss, eo, eio, rng, noise } = Pilot;
  const TAU = Math.PI * 2;
  const R = {};

  /* ---------------------------------------------------------------- palette, type */
  const C = R.C = { field: '#7fb0bc', panel: '#9cc5cf', cream: '#f1ebdc', cream2: '#e6dfcb', ink: '#1d2123', yel: '#f1c75e', yelL: '#f7da86',
    ground: '#5f909d', road: '#6d9fac', deep: '#33555e' };
  R.ACCENT = C.yel;                                  // the one extra ink: the thing the film is about, and its light
  R.FONT = "'Gaegu',cursive";                        // captions + end card (Google Fonts: Gaegu 700)
  R.FONTS = ["700 70px 'Gaegu'"];                    // Pilot.run({ fonts })
  R.FONT_CSS = 'https://fonts.googleapis.com/css2?family=Gaegu:wght@700&display=swap';

  /* ---------------------------------------------------------------- the boiling hand line */
  let K = 0, LWK = 1, AMPK = 1, MR = 1, TS = 1;      // boil frame; line width / jitter / misregistration / dot-screen scale
  /* R.boil(t) — set the boil frame for this picture (call first in scene(); the line re-jitters 12×/s) */
  R.boil = t => { K = Math.round(t * 12); };
  /* R.lw(v?) — get (or set, returning the old value) the line-width multiplier — for drawing inside a scaled transform */
  R.lw = v => { const o = LWK; if (v != null) LWK = v; return o; };
  /* wob(p, amp) — a point displaced by the boil (amp px) + a fixed hand wobble */
  function wob(p, amp, k = K) {
    const x = p[0], y = p[1], f = .022;
    return [x + (noise(x * f + k * 7.31, y * f + .37) - .5) * 2 * amp + (noise(x * .07 + 40, y * .07) - .5) * 1.4 * AMPK,
            y + (noise(x * f + 11.3, y * f + k * 5.17) - .5) * 2 * amp + (noise(x * .07, y * .07 + 90) - .5) * 1.4 * AMPK];
  }
  /* chaikin(pts, closed, it) — corner-cutting smoothing */
  function chaikin(pts, closed, it = 2) {
    for (let r = 0; r < it; r++) { const o = [], n = pts.length, m = closed ? n : n - 1; if (!closed) o.push(pts[0]);
      for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % n]; o.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); }
      if (!closed) o.push(pts[n - 1]); pts = o; }
    return pts;
  }
  /* resample(pts, closed, step) — points every ~step px along the polyline */
  function resample(pts, closed, step) {
    const o = [], n = pts.length, m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % n], d = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(d / step));
      for (let j = 0; j < k; j++) o.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]); }
    if (!closed) o.push(pts[n - 1]); return o;
  }
  /* pathOf(pts, closed, smooth) — a Path2D through the points (quadratic mid-point smoothing) */
  function pathOf(pts, closed = true, smooth = true) {
    const p = new Path2D(), n = pts.length;
    if (!smooth || n < 3) { p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) p.lineTo(pts[i][0], pts[i][1]); if (closed) p.closePath(); return p; }
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (closed) { const s = mid(pts[n - 1], pts[0]); p.moveTo(s[0], s[1]);
      for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); p.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); } p.closePath(); }
    else { p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n - 1; i++) { const m = mid(pts[i], pts[i + 1]); p.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); } p.lineTo(pts[n - 1][0], pts[n - 1][1]); }
    return p;
  }
  /* ink(ctx, pts, o) — THE primitive: an inked shape. Fill printed off-register (o.mx/o.my px), optional dot tone
     (o.tone = Riso.tone(…)), then the boiling black line drawn twice (o.lw px; 0 = no line; o.single = one pass).
     o: { fill, tone, lw, col (line colour), closed (default true), smooth (default true), raw (no resample), step, amp, mx, my, single }
     → the Path2D of the jittered shape */
  function ink(ctx, pts, o = {}) {
    const closed = o.closed !== false, sm = o.smooth !== false && !o.raw && pts.length > 2;
    const step = (o.step || 11) * clamp(LWK, .6, 1.6);
    const base = o.raw ? pts : resample(sm ? chaikin(pts, closed, 2) : pts, closed, step);
    const amp = (o.amp ?? 1.8) * AMPK;
    const P = base.map(p => wob(p, amp)), path = pathOf(P, closed, sm);
    if (o.fill || o.tone) { ctx.save(); ctx.translate((o.mx ?? 2.5) * MR, (o.my ?? 1.6) * MR);
      if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(path); }
      if (o.tone) { ctx.fillStyle = o.tone; ctx.fill(path); }
      ctx.restore(); }
    if (o.lw !== 0) { const lw = (o.lw || 6) * LWK; ctx.strokeStyle = o.col || C.ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.lineWidth = lw * .86; ctx.stroke(path);
      if ((o.lw || 6) > 3.5 && !o.single) { ctx.lineWidth = lw * .72; ctx.stroke(pathOf(base.map(p => wob(p, amp * .8, K + 50.5)), closed, sm)); } }
    return path;
  }
  /* ell(cx, cy, rx, ry, n, rot) — ellipse as n points */
  const ell = (cx, cy, rx, ry, n = 20, rot = 0) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    o.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); } return o; };
  const rot2 = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
  /* tube(line, widths) — outline of a variable-width stroke along a centre line (limbs, scarf tails, stems) */
  function tube(line, wd) {
    const Lf = [], Rt = [];
    for (let i = 0; i < line.length; i++) { const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      Lf.push([line[i][0] - dy * wd[i], line[i][1] + dx * wd[i]]); Rt.push([line[i][0] + dy * wd[i], line[i][1] - dx * wd[i]]); }
    return Lf.concat(Rt.reverse());
  }
  /* spark4(cx, cy, r) — a four-point twinkle star outline */
  function spark4(cx, cy, r) { const o = []; for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, rr = i % 2 ? r * .22 : r * (i % 4 === 0 ? 1 : .78); o.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return o; }
  Object.assign(R, { wob, chaikin, resample, pathOf, ink, ell, rot2, tube, spark4 });

  /* ---------------------------------------------------------------- print textures (built once) */
  let MOTTLE, GRAIN, TONE, TONE_D, GLOW, CACHE = null; const PAT = {};
  function hash2(x, y) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
  function pnoise(x, y, p) {   // value noise, periodic with period p
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), m = q => ((q % p) + p) % p;
    const a = hash2(m(xi), m(yi)), b = hash2(m(xi + 1), m(yi)), c = hash2(m(xi), m(yi + 1)), d = hash2(m(xi + 1), m(yi + 1));
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  /* R.init() — build the field mottling, print grain, two dot screens, the glow sprite and the on-twos frame cache.
     Call once from the scene's init() (sizes follow Pilot.W/H). */
  R.init = function () {
    const W = Pilot.W, H = Pilot.H;
    const mw = 128; MOTTLE = Pilot.canvas(mw, mw); const mx = MOTTLE.getContext('2d'), md = mx.createImageData(mw, mw);
    for (let y = 0; y < mw; y++) for (let x = 0; x < mw; x++) {
      const v = (pnoise(x / 16, y / 16, 8) * .55 + pnoise(x / 8 + 3, y / 8, 16) * .3 + pnoise(x / 4, y / 4 + 5, 32) * .15), i = (y * mw + x) * 4, k = (v - .5) * 2.2;
      md.data[i] = md.data[i + 1] = md.data[i + 2] = k > 0 ? 255 : 20; md.data[i + 3] = Math.min(255, Math.abs(k) * 40); }
    mx.putImageData(md, 0, 0);
    const N = 512; GRAIN = Pilot.canvas(N, N); const g = GRAIN.getContext('2d'), gd = g.createImageData(N, N), r = rng(77);
    const hn = N >> 1, hr = new Float32Array(hn * hn); for (let i = 0; i < hr.length; i++) hr[i] = r();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = (y * N + x) * 4, v = .6 * hr[(y >> 1) * hn + (x >> 1)] + .4 * r() - .5;
      if (v > 0) { gd.data[i] = 255; gd.data[i + 1] = 252; gd.data[i + 2] = 240; gd.data[i + 3] = Math.min(255, v * v * 4 * 120); }
      else { gd.data[i] = 18; gd.data[i + 1] = 36; gd.data[i + 2] = 44; gd.data[i + 3] = Math.min(255, v * v * 4 * 130); } }
    g.putImageData(gd, 0, 0);
    const mk = (cell, rad, a) => { const c = Pilot.canvas(cell * 2, cell * 2), x = c.getContext('2d'), rr = rng(5); x.fillStyle = `rgba(29,33,35,${a})`;
      for (const [px, py] of [[cell / 2, cell / 2], [cell * 1.5, cell * 1.5], [cell * 1.5, cell / 2], [cell / 2, cell * 1.5]]) {
        x.beginPath(); x.ellipse(px, py, rad * (.85 + rr() * .3), rad * (.85 + rr() * .3), 0, 0, TAU); x.fill(); }
      return c; };
    TONE = mk(11, 2.1, .9); TONE_D = mk(9, 2.4, .95);
    GLOW = Pilot.canvas(256, 256); const gl = GLOW.getContext('2d'), gr = gl.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(247,214,120,.95)'); gr.addColorStop(.35, 'rgba(244,206,108,.45)'); gr.addColorStop(.7, 'rgba(240,200,100,.12)'); gr.addColorStop(1, 'rgba(240,200,100,0)');
    gl.fillStyle = gr; gl.fillRect(0, 0, 256, 256);
    const c0 = Pilot.canvas(2, 2).getContext('2d');
    PAT.tone = c0.createPattern(TONE, 'repeat'); PAT.toneD = c0.createPattern(TONE_D, 'repeat'); PAT.grain = c0.createPattern(GRAIN, 'repeat');
    { const big = Pilot.canvas(1024, 1024), bx = big.getContext('2d'); bx.imageSmoothingEnabled = true; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) bx.drawImage(MOTTLE, i * 1024, j * 1024, 1024, 1024); PAT.mottle = c0.createPattern(big, 'repeat'); }   // pre-scaled: an unscaled pattern fill is ~3x cheaper
    CACHE = [0, 1].map(() => ({ c: Pilot.canvas(W, H), t: -1 }));
  };
  /* R.tone(dense, ox, oy) — the dot screen as a fill style, anchored to an object at (ox, oy) (dots stay print-size under zoom) */
  const tone = R.tone = (dense, ox, oy) => { const p = dense ? PAT.toneD : PAT.tone; p.setTransform(new DOMMatrix().translate(Math.round(ox), Math.round(oy)).scale(TS)); return p; };
  /* R.glow(ctx, x, y, r, a) — the yellow light: a soft radial sprite of radius r, alpha a */
  const glow = R.glow = (ctx, x, y, r, a) => { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(GLOW, x - r, y - r, r * 2, r * 2); ctx.restore(); };
  /* R.sparkle(ctx, x, y, r, a, glowA) — an inked yellow twinkle with a glow */
  function sparkle(ctx, x, y, r, a, glowA = .7) {
    if (a <= .01 || r < .5) return; glow(ctx, x, y, r * 2.6, a * glowA);
    ctx.save(); ctx.globalAlpha *= a; ink(ctx, spark4(x, y, r), { fill: C.yel, lw: 3.2, smooth: false, raw: true, amp: .8, mx: 1.5, my: 1, single: true }); ctx.restore();
  }
  /* R.squiggle(ctx, x0, y0, len, amp, ph, lw, dir) — a comic motion line "~~~~" ending in a tiny circle (dir −1 trails left) */
  function squiggle(ctx, x0, y0, len, amp, ph, lw = 4.5, dir = 1) {
    const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push([x0 + dir * u * len, y0 + Math.sin(u * 3.2 * TAU + ph) * amp * (.5 + .5 * u)]); }
    ink(ctx, pts, { closed: false, lw, step: 8, single: true });
    ctx.lineWidth = 3.5 * LWK; ctx.strokeStyle = C.ink; const c = wob([x0 + dir * (len + 14), y0], AMPK); ctx.beginPath(); ctx.arc(c[0], c[1], 4.5 * LWK, 0, TAU); ctx.stroke();
  }
  Object.assign(R, { sparkle, squiggle });

  /* ================================================================ RIG — the figure's skeleton and poses
     (style-free geometry; this section is the SAME in kit-risoline.js and kit-monoroom.js — keep them in sync)
     Body-checked twice on the cross film (canvas-film references/BODY-CHECK.md): arms solved from the shoulders with
     2-bone IK and fixed bone lengths, hands drawn AT the grip point, one hand one object, near/far arm layering,
     in-betweens for set-down / pick-up. Units: body units × F.s (s = 1 → the figure is ~330 px tall to the beanie top).

     A pose ("spec") F = { s, f (+1 faces right, −1 left), gy (ground y), hip:[x,y], ang (world lean; + leans toward +x),
       feet:[far, near] (foot points on the ground), hands:[far, near] (grip points or null = hanging), hand:[far, near]
       ('grip' | 'flat' | 'open' | 'hang'), tilt (head nod, + = down, − = looking up), headF (head facing, default f),
       eye, mouth (the kit's expressions), knees/toes:[far, near] overrides (null = IK / auto),
       farOver (far mitten drawn over a held thing), farMid (far mitten between the thing and the head),
       sx (horizontal squash about the hip — a yaw turn), alpha, me (the accent figure), ph (walk phase) }   */
  const Rig = (() => {
    const Rig = { ANK: 15 };   // ankle height above the foot point (body units; set by the kit to match its leg drawing)
    const SHN = [0, 114], SHF = [-8, 110], ARM1 = 64, ARM2 = 60, LEG1 = 86, LEG2 = 84, HIPH = 158;
    const frac = x => x - Math.floor(x), lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
    /* 2-bone IK: a = root, t = target, bone lengths l1/l2; pick(j1, j2) chooses the bend. → [joint, reached end] */
    function ik(a, t, l1, l2, pick) {
      let dx = t[0] - a[0], dy = t[1] - a[1], d = Math.hypot(dx, dy) || 1e-6; const dd = clamp(d, Math.abs(l1 - l2) + .5, l1 + l2 - .5);
      const tx = a[0] + dx / d * dd, ty = a[1] + dy / d * dd, an = Math.atan2(ty - a[1], tx - a[0]), b = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
      const j1 = [a[0] + Math.cos(an + b) * l1, a[1] + Math.sin(an + b) * l1], j2 = [a[0] + Math.cos(an - b) * l1, a[1] + Math.sin(an - b) * l1];
      return [pick(j1, j2), [tx, ty]];
    }
    /* body frame: P(a, b) = world point a body-units forward, b up from the hip (leaned by ang, mirrored by f) */
    function frame(F) {
      const up = [Math.sin(F.ang), -Math.cos(F.ang)], fw = [F.f * Math.cos(F.ang), F.f * Math.sin(F.ang)], s = F.s;
      return { up, fw, P: (a, b) => [F.hip[0] + fw[0] * a * s + up[0] * b * s, F.hip[1] + fw[1] * a * s + up[1] * b * s] };
    }
    const shoulderOf = F => frame(F).P(SHN[0], SHN[1]);          // near shoulder (world)
    const farShoulderOf = F => frame(F).P(SHF[0], SHF[1]);       // far shoulder (world)
    /* head frame: hc = head centre; HF(u, v) = head-local point (u forward, v up), nodded by tilt, facing headF */
    function headFrame(F) {
      const { P } = frame(F), hfF = F.headF ?? F.f, ha = F.ang * .5 + hfF * (F.tilt || 0), hu = [Math.sin(ha), -Math.cos(ha)], hf = [hfF * Math.cos(ha), hfF * Math.sin(ha)];
      const nk = P(14, 136), s = F.s, hc = [nk[0] + (hu[0] * 62 + hf[0] * 8) * s, nk[1] + (hu[1] * 62 + hf[1] * 8) * s], HS = 1.18 * s;
      return { hc, HF: (u, v) => [hc[0] + HS * (u * hf[0] + v * hu[0]), hc[1] + HS * (u * hf[1] + v * hu[1])] };
    }
    /* one arm: shoulder S0 → hand target T (null = hanging); the elbow bends down/back. → { S0, el, hd } */
    function armGeo(F, S0, T, far) {
      const s = F.s, f = F.f; if (!T) T = [S0[0] + f * (far ? -4 : 6) * s, S0[1] + 116 * s];
      const elbowPick = (a, b) => (a[1] - f * a[0] * .35) > (b[1] - f * b[0] * .35) ? a : b;
      const [el, hd] = ik(S0, T, ARM1 * s, ARM2 * s, elbowPick);
      return { S0, el, hd };
    }
    /* walk cycle at x (hip), ground gy: ph = phase in strides (integrate distance / stride), stride in body units,
       lean (rad, forward), lift = foot lift. Hands hang (set F.hands for a load). */
    function walkSpec(x, gy, s, f, ph, stride, lean, lift = 22) {
      const feet = [0, 1].map(i => { const p = frac(ph + i * .5); let off, up = 0;
        if (p < .58) off = stride * (.29 - p); else { const u = (p - .58) / .42; off = -.29 * stride + .58 * stride * eio(u); up = lift * Math.sin(Math.PI * u); }
        return [x + f * off * s, gy - up * s]; });
      const hipH = (HIPH - 7 * Math.abs(Math.sin(TAU * ph))) * s;
      return { s, f, gy, hip: [x, gy - hipH], ang: f * lean, feet, hands: [null, null], hand: ['grip', 'grip'], tilt: 0, eye: 'dot', ph };
    }
    /* standing at x */
    function standSpec(x, gy, s, f, lean = .05) { return { s, f, gy, hip: [x, gy - (HIPH - 2) * s], ang: f * lean, feet: [[x - f * 16 * s, gy], [x + f * 20 * s, gy]], hands: [null, null], hand: ['hang', 'hang'], tilt: 0, eye: 'dot' }; }
    /* crouch at x: depth 0 (stand) … 1 (deep squat), lean forward; feet apart, knees by IK */
    function crouchSpec(x, gy, s, f, depth = 1, lean = .7) {
      const hx = x - f * 10 * s * depth;
      return { s, f, gy, hip: [hx, gy - lerp(HIPH - 2, 96, depth) * s], ang: f * lean * depth, feet: [[x - f * 30 * s, gy], [x + f * 36 * s, gy]],
        hands: [null, null], hand: ['hang', 'hang'], tilt: .1 * depth, eye: 'dot' };
    }
    /* kneel: the far knee on the ground (thigh from the hip, shin flat behind, toes down), the near foot planted forward
       with its knee up. kneelLegs(F) fits the legs to wherever F.hip is (e.g. after placeByShoulder); kneelSpec builds an
       upright kneel at x. */
    function kneelLegs(F) {
      const s = F.s, f = F.f, gy = F.gy, hp = F.hip, l1 = LEG1 * s, dy = clamp(gy - 10 * s - hp[1], 0, l1 * .98);
      const kn = [hp[0] - f * Math.sqrt(l1 * l1 - dy * dy), gy - 10 * s];
      F.feet = [[kn[0] - f * Math.sqrt(LEG2 * LEG2 - 36) * s, gy], [hp[0] + f * 48 * s, gy]]; F.knees = [kn, null]; F.toes = [-.55, null]; return F;
    }
    function kneelSpec(x, gy, s, f, lean = .25) {
      return kneelLegs({ s, f, gy, hip: [x, gy - 10 * s - Math.cos(.15) * LEG1 * s], ang: f * lean, hands: [null, null], hand: ['hang', 'hang'], tilt: .15, eye: 'dot' });
    }
    /* hands hanging at the sides (swing = forward/back swing in body units) */
    function hangHands(F, swing = 0) { const fr = frame(F), sF = fr.P(SHF[0], SHF[1]), sN = fr.P(SHN[0], SHN[1]); return [[sF[0] - F.f * (6 + swing) * F.s, sF[1] + 116 * F.s], [sN[0] + F.f * (4 - swing) * F.s, sN[1] + 116 * F.s]]; }
    /* blend two poses (k 0…1): positions lerp, discrete fields (f, eye, hand types) switch at k = .5 */
    function mixSpec(A, Bs, k) {
      if (k <= 0) return A; if (k >= 1) return Bs;
      const l2 = (a, b) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], hA = hangHands(A), hB = hangHands(Bs), pick = k < .5 ? A : Bs;
      return { ...pick, s: lerp(A.s, Bs.s, k), gy: lerp(A.gy, Bs.gy, k), hip: l2(A.hip, Bs.hip), ang: lerp(A.ang, Bs.ang, k), feet: [l2(A.feet[0], Bs.feet[0]), l2(A.feet[1], Bs.feet[1])],
        hands: [0, 1].map(i => l2(A.hands[i] || hA[i], Bs.hands[i] || hB[i])), hand: (pick.hand || ['grip', 'grip']).slice(), tilt: lerp(A.tilt || 0, Bs.tilt || 0, k),
        knees: A.knees || Bs.knees ? [0, 1].map(i => l2(A.knees && A.knees[i] || legKnee(A, i), Bs.knees && Bs.knees[i] || legKnee(Bs, i))) : null,
        toes: A.toes || Bs.toes ? [0, 1].map(i => lerp(A.toes && A.toes[i] || 0, Bs.toes && Bs.toes[i] || 0, k)) : null };
    }
    /* the knee the leg i would get from IK (as the kit draws it) — used to blend into / out of a kneel without a pop */
    function legKnee(F, i) {
      const s = F.s, f = F.f, hp = frame(F).P(i ? 8 : -6, -2), foot = F.feet[i], ank = [foot[0], foot[1] - Rig.ANK * s];
      return ik(hp, ank, LEG1 * s, LEG2 * s, (a, b) => f * a[0] > f * b[0] ? a : b)[0];
    }
    /* a near-hand grip point at the side (for a held small tool), swinging with the walk */
    const hangGrip = (F, sw = 0) => { const sh = shoulderOf(F); return [sh[0] + F.f * (14 + sw) * F.s, sh[1] + 112 * F.s]; };
    /* place the body so its near (or far) shoulder lands on a world point — "the body is placed from where the hands must
       be" (squatting over work, pressing something down). Feet are left where they are: set them after. */
    function placeByShoulder(F, target, far = false) {
      const so = frame({ ...F, hip: [0, 0] }).P(...(far ? SHF : SHN)); F.hip = [target[0] - so[0], target[1] - so[1]]; return F;
    }
    /* put hand i (0 far, 1 near) on a target; if it is out of reach, lean the body toward it (up to maxLean) first */
    function fitReach(F, i, target, maxLean = 1.3) {
      const R = (ARM1 + ARM2) * F.s * .95;
      for (let n = 0; n < 40; n++) { const sh = i ? shoulderOf(F) : farShoulderOf(F); if (Math.hypot(target[0] - sh[0], target[1] - sh[1]) <= R || Math.abs(F.ang) >= maxLean) break; F.ang += F.f * .04; }
      F.hands = F.hands.slice(); F.hands[i] = target; return F;
    }
    /* turn round between two poses (k 0…1): the head leads (flips at .3), the body flips at .5, squashed in x as it yaws */
    function turnSpec(A, Bs, k) {
      const F = mixSpec(A, Bs, eio(clamp(k))); if (k <= 0 || k >= 1) return F;
      const G = { ...F }; G.f = k < .5 ? A.f : Bs.f; G.headF = k < .3 ? A.f : Bs.f; G.sx = .68 + .32 * Math.abs(Math.cos(Math.PI * k)); return G;
    }
    /* turn the head toward a world point (sets headF and tilt; up is negative tilt) */
    function lookAt(F, p, max = .5) {   // the head turns round only when the point is clearly behind (not just below the chin)
      const { hc } = headFrame(F), dx = p[0] - hc[0], dy = p[1] - hc[1];
      F.headF = dx * F.f < -40 * F.s && Math.abs(dx) > Math.abs(dy) * .6 ? -F.f : F.f;
      F.tilt = clamp(.75 * Math.atan2(dy, Math.max(1, dx * F.headF)) - F.headF * F.ang * .5, -max, max); return F;
    }

    /* ---------------- long things (a plank, a pole, a cross): geometry in beam-local units u (along, 0 = foot) and v (across).
       Beam({ L, PW, bar }) — length, thickness; bar = { at, w, h, hLie } a crossbar at u = at (w thick, half-length h standing,
       hLie when lying flat and seen from the side) or null. X (a placement) = { x, y, a, u0, lie, sx?, px? }: foot origin,
       angle, where the beam starts (u0 > 0 = the foot end is cut off), lying flat or not. */
    function Beam(o = {}) {
      const B = { L: o.L ?? 480, PW: o.PW ?? 34, bar: o.bar || null };
      B.poly = (u0, u1, hb) => {     // outline in local (u, v) — a plank, plus the crossbar where the span covers it
        const a = B.PW / 2, c0 = B.bar ? B.bar.at - B.bar.w / 2 : 0, c1 = B.bar ? B.bar.at + B.bar.w / 2 : 0, bar = !!B.bar && u0 < c0 && u1 > c1, pts = [[u0, -a]];
        if (bar) pts.push([c0, -a], [c0, -hb], [c1, -hb], [c1, -a]);
        pts.push([u1, -a], [u1, a]);
        if (bar) pts.push([c1, a], [c1, hb], [c0, hb], [c0, a]);
        pts.push([u0, a]); return pts;
      };
      B.halfBar = X => B.bar ? (X.lie ? B.bar.hLie : B.bar.h) : 0;
      return B;
    }
    const CROSS = Beam({ L: 480, PW: 34, bar: { at: 362, w: 32, h: 98, hLie: 40 } });   // the cross of the worked example
    const cpt = (X, u, v = 0) => [X.x + Math.cos(X.a) * u - Math.sin(X.a) * v, X.y + Math.sin(X.a) * u + Math.cos(X.a) * v];   // beam-local → world
    /* on the FAR shoulder (the head hides it where they overlap); left = fraction of the length still there; a0 = angle */
    function onShoulder(F, B, left, a0) {
      const L = B.L, PW = B.PW, fr = frame(F), sh = fr.P(SHF[0], SHF[1] + 4), T = [sh[0] + fr.up[0] * 10 * F.s, sh[1] + fr.up[1] * 10 * F.s];
      const a = F.f > 0 ? a0 : Math.PI - a0, d = [Math.cos(a), Math.sin(a)]; let n = [d[1], -d[0]]; if (n[1] > 0) n = [-n[0], -n[1]];
      const contact = left < .6 ? L * (1 - left) + 14 : L - Math.min(250, left * L - 36);
      return { x: T[0] + n[0] * PW / 2 - d[0] * contact, y: T[1] + n[1] * PW / 2 - d[1] * contact, a, contact, u0: L * (1 - left), lie: false };
    }
    /* both mittens on a shouldered beam: near at the shoulder contact, far one further along (sets F.hands) */
    function gripShoulder(F, B, X) { F.hands = [cpt(X, Math.min(B.L - 16, X.contact + 60)), cpt(X, X.contact + 2, B.PW * .55)]; F.hand = ['grip', 'grip']; return F; }
    /* the far hand steadies a shouldered beam behind the back (where it shows past the body), within real reach */
    function steadyBehind(F, B, X) {
      const PW = B.PW, sh = frame(F).P(SHF[0], SHF[1]), R = (ARM1 + ARM2) * F.s * .92; let u = Math.max(X.u0 + 22, X.contact - 100 * F.s);
      while (u < X.contact) { const q = cpt(X, u, PW / 2); if (Math.hypot(q[0] - sh[0], q[1] - sh[1]) <= R && (q[0] - F.hip[0]) * F.f < -58 * F.s) break; u += 6; }
      return cpt(X, u, PW / 2 - 4);
    }
    /* held in front at the waist, the far (top) end ahead */
    function inFront(F, B, left) {
      const u0 = B.L * (1 - left), f = F.f, s = F.s, g = [F.hip[0] + f * 44 * s, F.hip[1] - 30 * s], a = f > 0 ? Math.PI - .08 : .08, ug = u0 + 56;
      return { x: g[0] - Math.cos(a) * ug, y: g[1] - Math.sin(a) * ug, a, u0, lie: false };
    }
    /* inFront + both mittens on it (near ahead, far behind the back) → [F, X] */
    function holdFront(F, B, left) { const X = inFront(F, B, left); F.hands = [cpt(X, X.u0 + 150, B.PW / 2 - 2), cpt(X, X.u0 + 30, -B.PW / 2 - 2)]; F.hand = ['grip', 'grip']; F.farMid = true; return [F, X]; }
    /* carried low on the far side, top end ahead; far mitten on it behind the back, near hand free (a tool) → [F, X] */
    function holdLow(F, B, left) {
      const L = B.L, PW = B.PW, u0 = L * (1 - left), f = F.f, s = F.s, ug = u0 + 120, g = [F.hip[0] + f * 20 * s, F.hip[1] - 34 * s], a = f > 0 ? -.06 : Math.PI + .06;
      const X = { x: g[0] - Math.cos(a) * ug, y: g[1] - Math.sin(a) * ug, a, u0, lie: false };
      F.hands = [cpt(X, u0 + 26, PW / 2 - 2), hangGrip(F, F.ph != null ? 10 * Math.sin(TAU * F.ph) : 0)]; F.hand = ['grip', 'grip']; F.farMid = true; return [F, X];
    }
    /* stood upright on the ground in front of the near side, both mittens on it (near at chest height) → [F, X] */
    function holdUpright(F, B, left = 1) {
      const f = F.f, s = F.s, sh = shoulderOf(F), X = { x: F.hip[0] + f * 62 * s, y: F.gy, a: -Math.PI / 2, u0: B.L * (1 - left), lie: false };
      const uN = X.y - (sh[1] + 40 * s); F.hands = [cpt(X, uN - 70 * s, -f * B.PW / 2), cpt(X, uN, -f * B.PW / 2)]; F.hand = ['grip', 'grip']; F.farMid = true; return [F, X];
    }
    /* a yaw turn of a held beam, drawn as a horizontal squash about px */
    const mirrorX = (X, px, sx) => ({ ...X, px, sx: Math.sign(sx || 1) * Math.max(.08, Math.abs(sx)) });
    const mixX = (A, Bx, k) => k <= 0 ? A : k >= 1 ? Bx : { ...Bx, x: lerp(A.x, Bx.x, k), y: lerp(A.y, Bx.y, k), a: lerp(A.a, Bx.a, k), u0: Bx.u0, lie: k > .62 ? Bx.lie : A.lie };
    function rotAbout(X, pv, th) { const ox = X.x - pv[0], oy = X.y - pv[1]; return { ...X, x: pv[0] + ox * Math.cos(th) - oy * Math.sin(th), y: pv[1] + ox * Math.sin(th) + oy * Math.cos(th), a: X.a + th }; }

    return Object.assign(Rig, { SHN, SHF, ARM1, ARM2, LEG1, LEG2, HIPH, ik, frame, shoulderOf, farShoulderOf, headFrame, armGeo, walkSpec, standSpec, crouchSpec, kneelSpec,
      hangHands, mixSpec, hangGrip, placeByShoulder, fitReach, turnSpec, lookAt,
      Beam, CROSS, cpt, onShoulder, gripShoulder, steadyBehind, inFront, holdFront, holdLow, holdUpright, mirrorX, mixX, rotAbout, lerp2, frac, kneelLegs, legKnee });
  })();
  R.Rig = Rig; Rig.ANK = 16;
  const { frame, headFrame, armGeo, cpt, SHN, SHF, LEG1, LEG2 } = Rig, lerp2 = Rig.lerp2;

  /* ---------------------------------------------------------------- the beanie kid (drawn on the rig) */
  const FACE = R.FACE = [[-52, -20], [-56, 16], [-44, 46], [-14, 58], [24, 54], [46, 36], [56, 10], [64, 2], [58, -10], [52, -26], [34, -46], [0, -52], [-34, -44]];
  const BEANIE = R.BEANIE = [[-58, 18], [-54, 52], [-32, 80], [2, 90], [34, 80], [52, 56], [58, 30]], FOLD = R.FOLD = [[-61, 6], [-59, 28], [61, 38], [61, 16]];
  /* R.head(ctx, F, HF, s, me, toneD) — face, beanie (dot-toned fold, pompom, ribs), ear, eye, mouth.
     F.eye: 'dot' | 'tired' | 'happy' | 'down' | 'shock' | 'worry' | 'glint';  F.mouth: 'flat' | 'smile' | 'o' | 'wavy' | 'sad' */
  function drawHead(ctx, F, HF, s, me, toneD) {
    ink(ctx, FACE.map(q => HF(q[0], q[1])), { fill: C.cream });
    ink(ctx, BEANIE.map(q => HF(q[0], q[1])), { fill: F.beanie || (me ? C.cream : C.cream2) });
    ink(ctx, FOLD.map(q => HF(q[0], q[1])), { fill: C.cream, tone: toneD, smooth: false, step: 10 });
    ink(ctx, ell(0, 0, 15, 14, 14).map(q => HF(q[0] - 6, q[1] + 102)), { fill: C.cream, lw: 5.5 });
    ink(ctx, [HF(-14, 76), HF(-8, 50)], { closed: false, lw: 4, single: true }); ink(ctx, [HF(18, 80), HF(16, 54)], { closed: false, lw: 4, single: true });
    ink(ctx, [HF(-30, -2), HF(-40, -12), HF(-34, -28), HF(-24, -22)], { closed: false, lw: 4.5, single: true });
    const e = HF(32, -10), eye = F.eye || 'dot';
    if (eye === 'tired') ink(ctx, [HF(22, -8), HF(32, -14), HF(42, -10)], { closed: false, lw: 4.5, single: true });
    else if (eye === 'happy') ink(ctx, [HF(22, -14), HF(32, -5), HF(42, -13)], { closed: false, lw: 4.5, single: true });
    else if (eye === 'down') ink(ctx, [HF(24, -16), HF(32, -18), HF(41, -16)], { closed: false, lw: 4.5, single: true });
    else { const r = (eye === 'shock' ? 9 : 6.5) * s * 1.18 / 1.06; ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(e[0], e[1], r, r * 1.15, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = eye === 'glint' ? C.yelL : C.cream; ctx.beginPath(); ctx.arc(e[0] + F.f * r * .3, e[1] - r * .4, r * .33, 0, TAU); ctx.fill(); }
    if (eye === 'shock' || eye === 'worry') ink(ctx, [HF(20, 8), HF(32, 12), HF(42, 6)], { closed: false, lw: 4, single: true });
    const mo = F.mouth || 'flat';
    if (mo === 'smile') ink(ctx, [HF(38, -32), HF(46, -40), HF(54, -32)], { closed: false, lw: 4, single: true });
    else if (mo === 'o') ink(ctx, ell(...HF(45, -35), 5 * s * 1.18, 6 * s * 1.18, 10), { fill: C.ink, lw: 3, single: true });
    else if (mo === 'wavy') ink(ctx, [HF(36, -36), HF(41, -33), HF(46, -37), HF(51, -33)], { closed: false, lw: 3.6, single: true, smooth: false });
    else if (mo === 'sad') ink(ctx, [HF(38, -38), HF(46, -33), HF(53, -38)], { closed: false, lw: 4, single: true });
    else ink(ctx, [HF(38, -36), HF(50, -34)], { closed: false, lw: 4, single: true });
  }
  function drawLeg(ctx, F, i, P, toneP) {
    const s = F.s, f = F.f, hp = P(i ? 8 : -6, -2), foot = F.feet[i], ank = [foot[0], foot[1] - 16 * s];
    const kneePick = (a, b) => f * a[0] > f * b[0] ? a : b;
    const kn = F.knees && F.knees[i] ? F.knees[i] : Rig.ik(hp, ank, LEG1 * s, LEG2 * s, kneePick)[0];
    const top = P(i ? 8 : -6, 16), m1 = lerp2(hp, kn, .5), m2 = lerp2(kn, ank, .5);
    ink(ctx, tube([top, m1, kn, m2, ank], [42, 45, 40, 36, 31].map(w => w * s)), { fill: i ? C.cream : C.cream2, tone: toneP });
    const lift = Math.max(0, F.gy - foot[1]), toe = F.toes && F.toes[i] != null ? F.toes[i] : lift > 4 * s ? .25 : 0;
    ink(ctx, [[ank[0] - 15 * s, ank[1] - 6 * s], [ank[0] + 13 * s, ank[1] - 6 * s], [ank[0] + 12 * s, ank[1] + 8 * s], [ank[0] - 14 * s, ank[1] + 8 * s]], { fill: C.cream, lw: 5, step: 9 });
    const sh = [[-26, -6], [-20, -20], [6, -22], [20, -16], [34, -10], [40, 0], [30, 7], [-22, 7]].map(p => { const q = rot2(p, -toe); return [foot[0] + f * (q[0] + 6) * s, foot[1] + (q[1] - 5) * s]; });
    ink(ctx, sh, { fill: C.ink, lw: 5.5, step: 9 });
  }
  /* R.sleeve(ctx, A, s, fill, tone) / R.mitten(ctx, A, s, type, f) — an arm from armGeo and its mitten
     (type 'grip' closed round a handle at A.hd, 'flat' pressing down, 'open' reaching, 'hang') */
  function sleeve(ctx, A, s, fill, tn) {
    const wr = lerp2(A.el, A.hd, .8);
    ink(ctx, tube([A.S0, A.el, lerp2(A.el, A.hd, .45), wr], [24 * s, 21 * s, 19 * s, 17 * s]), { fill, tone: tn });
  }
  function mitten(ctx, A, s, type, f) {
    const d0 = [A.hd[0] - A.el[0], A.hd[1] - A.el[1]], dl = Math.hypot(d0[0], d0[1]) || 1, d = [d0[0] / dl, d0[1] / dl];
    let pr = [-d[1], d[0]]; if (pr[1] > 0) pr = [-pr[0], -pr[1]];   // the side facing up
    let an = Math.atan2(d[1], d[0]);
    if (type === 'flat') { an = f > 0 ? 0 : Math.PI; const c = A.hd;
      ink(ctx, ell(c[0], c[1], 21 * s, 11 * s, 16, 0), { fill: C.cream, lw: 5.5 });
      ink(ctx, ell(c[0] - f * 10 * s, c[1] - 8 * s, 6 * s, 8 * s, 10, -f * .5), { fill: C.cream, lw: 4.5, single: true }); return; }
    const c = [A.hd[0] + d[0] * 5 * s, A.hd[1] + d[1] * 5 * s];
    ink(ctx, ell(c[0], c[1], 17 * s, 14 * s, 16, an), { fill: C.cream, lw: 5.5 });
    const th = type === 'open' ? 16 : 11;
    ink(ctx, ell(c[0] + pr[0] * th * s - d[0] * 3 * s, c[1] + pr[1] * th * s - d[1] * 3 * s, 6.5 * s, 8.5 * s, 10, an + .6), { fill: C.cream, lw: 4.5, single: true });
    if (type === 'grip') ink(ctx, [[c[0] + d[0] * 6 * s - pr[0] * 9 * s, c[1] + d[1] * 6 * s - pr[1] * 9 * s], [c[0] + d[0] * 9 * s + pr[0] * 4 * s, c[1] + d[1] * 9 * s + pr[1] * 4 * s]], { closed: false, lw: 3.6, single: true });
  }
  /* R.kid(ctx, F, back, mid) — draw a figure in pose F (see Rig). Layer order: shadow, far arm, back() (a thing carried
     behind the body), legs, sweater, scarf, head, mid() (a thing between the head and the near arm), F.held(ctx, F)
     (a tool in the near hand), near arm + mitten. F.me → the accent kid (plain cream, striped scarf; F.scarf = false to
     drop it, F.wind 0…1 blows the tail); others are dot-toned. Options: F.sweater / F.beanie fills, F.sx squash.
     → { AF, AN } the far / near arm geometry */
  function drawKid(ctx, F, back, mid) {
    const al = F.alpha ?? 1; if (al <= 0) return;
    ctx.save(); ctx.globalAlpha *= al;
    if (F.sx != null && F.sx !== 1) { ctx.translate(F.hip[0], 0); ctx.scale(F.sx, 1); ctx.translate(-F.hip[0], 0); }
    const s = F.s, f = F.f, me = !!F.me, { P } = frame(F);
    const tP = tone(false, F.hip[0], F.hip[1]), tD = tone(true, F.hip[0], F.hip[1]);
    ctx.save(); ctx.globalAlpha *= .5; ink(ctx, ell(F.hip[0], F.gy + 6 * s, 100 * s, 12 * s, 16), { tone: tD, lw: 0, mx: 0, my: 0 }); ctx.restore();
    const AF = armGeo(F, P(SHF[0], SHF[1]), F.hands[0], true), AN = armGeo(F, P(SHN[0], SHN[1]), F.hands[1], false);
    const hand = F.hand || ['grip', 'grip'];
    sleeve(ctx, AF, s, C.cream2, me ? null : tP); if (!F.farOver && !F.farMid) mitten(ctx, AF, s, hand[0], f);
    if (back) back();
    if (F.farMid) mitten(ctx, AF, s, hand[0], f);
    drawLeg(ctx, F, 0, P, tD); drawLeg(ctx, F, 1, P, tP);
    const sw = [[-48, -12], [-57, 36], [-56, 92], [-42, 128], [-14, 144], [20, 142], [44, 124], [56, 92], [62, 50], [64, 12], [52, -14], [0, -20]].map(q => P(q[0], q[1]));
    ink(ctx, sw, { fill: F.sweater || C.cream, tone: me ? null : tP });
    ink(ctx, [P(-30, 30), P(-8, 22)], { closed: false, lw: 4.5, single: true });
    const { HF } = headFrame(F);
    ink(ctx, [P(2, 128), P(24, 128), P(26, 150), P(2, 152)], { fill: C.cream, lw: 5 });
    if (F.scarf ?? me) {   // black-and-cream striped scarf, the tail flying back (F.wind)
      ink(ctx, [P(-30, 120), P(-10, 134), P(20, 134), P(36, 122), P(32, 106), P(4, 116), P(-26, 104)], { fill: C.cream, lw: 5 });
      for (const u of [-16, 0, 16]) ink(ctx, [P(u - 4, 132), P(u + 5, 131), P(u + 5, 114), P(u - 4, 115)], { fill: C.ink, lw: 0, smooth: false, mx: 0, my: 0 });
      const wv = F.wind ?? .3, ph = (F.ph ?? 0) * TAU * 2, tail = [];
      for (let i = 0; i <= 5; i++) { const u = i / 5; tail.push(P(-24 - u * (48 + 60 * wv), 118 - u * (70 - 62 * wv) + Math.sin(ph + u * 4) * 10 * wv * u)); }
      const tl = tube(tail, tail.map((_, i) => (11 - i * .8) * s));
      ink(ctx, tl, { fill: C.cream, lw: 4.5 });
      for (let i = 1; i < 5; i += 2) { const a = tail[i], b = tail[i + 1], d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / l * 9 * s, d[0] / l * 9 * s];
        ink(ctx, [[a[0] + n[0], a[1] + n[1]], [b[0] + n[0], b[1] + n[1]], [b[0] - n[0], b[1] - n[1]], [a[0] - n[0], a[1] - n[1]]], { fill: C.ink, lw: 0, smooth: false, mx: 0, my: 0 }); }
    }
    drawHead(ctx, F, HF, s, me, tD);
    if (mid) mid();
    if (F.farOver) mitten(ctx, AF, s, hand[0], f);
    if (F.held) F.held(ctx, F);
    sleeve(ctx, AN, s, C.cream, me ? null : tP); mitten(ctx, AN, s, hand[1], f);
    ctx.restore();
    return { AF, AN };
  }
  Object.assign(R, { kid: drawKid, head: drawHead, leg: drawLeg, sleeve, mitten });

  /* ---------------------------------------------------------------- long things */
  /* R.beam(ctx, B, X, u0, u1, accent, alpha) — a plank / cross (B = Rig.Beam / Rig.CROSS) placed at X, drawn from u0 to u1:
     accent → yellow ink with a print highlight, else cream + dot tone; a grain line or two. X.sx → yaw squash about X.px. */
  function beam(ctx, B, X, u0, u1, accent, alpha = 1) {
    if (!X || u1 - u0 < .5 || alpha <= 0) return;
    if (X.sx != null) { ctx.save(); ctx.translate(X.px, 0); ctx.scale(X.sx, 1); ctx.translate(-X.px, 0); beam(ctx, B, { ...X, sx: null }, u0, u1, accent, alpha); ctx.restore(); return; }
    const PW = B.PW, at = B.bar ? B.bar.at : null, pts = B.poly(u0, u1, B.halfBar(X)).map(([u, v]) => cpt(X, u, v));
    ctx.save(); ctx.globalAlpha *= alpha;
    ink(ctx, pts, { fill: accent ? C.yel : C.cream, tone: accent ? null : tone(false, X.x, X.y), smooth: false, lw: 5.5, step: 12 });
    const g0 = Math.max(u0 + 18, 30), g1 = at != null ? Math.min(u1 - 18, at - 30) : u1 - 18;
    if (g1 - g0 > 30) ink(ctx, [cpt(X, g0, -4), cpt(X, lerp(g0, g1, .55), -2)], { closed: false, lw: 3.4, single: true });
    if (at != null && u1 > at + 40 && u0 < at + 30) ink(ctx, [cpt(X, at + 34, 5), cpt(X, Math.min(u1 - 14, at + 92), 6)], { closed: false, lw: 3.4, single: true });
    if (accent) { ctx.save(); ctx.globalAlpha *= .8; ctx.strokeStyle = C.yelL; ctx.lineWidth = 4 * LWK; ctx.lineCap = 'round'; const a = cpt(X, u0 + 10, -PW / 2 + 7), b = cpt(X, u1 - 10, -PW / 2 + 7);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore(); }
    ctx.restore();
  }
  R.beam = beam;

  /* ---------------------------------------------------------------- the world */
  /* R.field(ctx, cm) — the flat blue field + its mottling (deep parallax, drifts with the camera). Screen space. */
  R.field = function (ctx, cm) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = C.field; ctx.fillRect(0, 0, Pilot.W, Pilot.H);
    ctx.save(); PAT.mottle.setTransform(new DOMMatrix().translate(Math.round(-cm.x * .12), Math.round(-cm.y * .12))); ctx.fillStyle = PAT.mottle; ctx.fillRect(0, 0, Pilot.W, Pilot.H); ctx.restore();
  };
  /* R.cloud(ctx, x, y, s, seed) — a flat cream cloud (no line) */
  function cloud(ctx, x, y, s, seed) {
    const r = rng(seed), pts = [], n = 26;
    for (let i = 0; i < n; i++) { const a = i / n * TAU, rx = 210 * s, ry = 52 * s, k = 1 + .18 * Math.sin(a * 3 + seed) + .1 * Math.sin(a * 7 + seed * 2);
      pts.push([x + Math.cos(a) * rx * k * (1 + .2 * (r() - .5)), y + Math.sin(a) * ry * k * (Math.sin(a) > 0 ? .6 : 1.15)]); }
    ink(ctx, pts, { fill: C.cream, lw: 0, mx: 0, my: 0, amp: 1.2 });
  }
  R.cloud = cloud;
  R.CLOUDS = [[-300, 330, .9, 3], [500, 250, 1.05, 5], [1100, 380, .45, 9], [1500, 300, .8, 11], [2200, 260, 1.0, 13], [2700, 360, .5, 17], [3100, 240, .9, 19]];
  R.LOWCLOUDS = [[-200, 1740, 1.1, 21], [600, 1900, .8, 23], [1250, 1700, .55, 25], [1800, 1860, 1.2, 27], [2500, 1760, .7, 29], [3100, 1920, 1.0, 31], [3700, 1720, .6, 33]];
  /* R.sky(ctx, cm, t, o) — the riso world is all sky: high clouds (parallax .25, drift +5 px/s, o.high [[x,y,scale,seed]…])
     and low clouds below the road (parallax .55, drift −7 px/s, o.low). Leaves the transform at identity. */
  R.sky = function (ctx, cm, t, o = {}) {
    R.cam(ctx, cm, .25); for (const [x, y, sc, sd] of (o.high || R.CLOUDS)) cloud(ctx, x + t * 5, y + 120, sc, sd);
    R.cam(ctx, cm, .55); for (const [x, y, sc, sd] of (o.low || R.LOWCLOUDS)) cloud(ctx, x - t * 7, y, sc, sd);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };
  /* R.makeRoad(o) → road with road.draw(ctx, x0, x1) (world space, visible x range): a strip floating in the field —
     top surface o.top…o.front, a dot-toned front face down to a lumpy underside at ~o.bottom, distant bushes on the far
     edge, grass tufts and dashes on top; at each gap [a, b] in o.gaps it breaks off (jagged ends, crumbs).
     o: { top: 1180, front: 1366, bottom: 1450, gaps: [], span: [-900, 5200] (bushes/tufts), under: [-1200, 6000] } */
  R.makeRoad = function (o = {}) {
    const RT = o.top ?? 1180, RF = o.front ?? 1366, RB = o.bottom ?? 1450, gaps = (o.gaps || []).slice().sort((a, b) => a[0] - b[0]);
    const [sx0, sx1] = o.span || [-900, 5200], [ux0, ux1] = o.under || [-1200, 6000];
    const BUSH = [], TUFT = [], UNDER = [];
    { const r = rng(31); for (let x = sx0; x < sx1; x += 230 + r() * 240) BUSH.push([x, .7 + r() * .5, r() * 100 | 0]); }
    { const r = rng(37); for (let x = sx0; x < sx1; x += 120 + r() * 170) TUFT.push([x, RT + 34 + r() * 60, r()]); }
    { const r = rng(43); for (let x = ux0; x < ux1; x += 46) UNDER.push([x, RB + 26 * (Pilot.fbm(x / 160, 3, 3) - .5) * 2 + (r() < .12 ? 26 + r() * 30 : 0)]); }
    const endEdge = (x, dir, seed) => { const q = rng(seed), e = [[x, RT], [x - dir * 3, (RT + RF) / 2], [x + dir * 2, RF]];
      for (let y = RF + 24; y < RB + 30; y += 26) e.push([x - dir * (6 + q() * 16 + (y - RF) * .25), y]); return e; };
    const ENDS = gaps.map((g, i) => [endEdge(g[0], 1, 71 + 4 * i), endEdge(g[1], -1, 73 + 4 * i)]);
    const inGap = (x, pad) => gaps.some(g => x > g[0] - pad && x < g[1] + pad);
    const under = (xa, xb) => UNDER.filter(p => p[0] > xa && p[0] < xb);
    const draw = (ctx, x0, x1) => {
      for (const [bx, sc, sd] of BUSH) { if (bx < x0 - 200 || bx > x1 + 200 || inGap(bx, 90)) continue;
        const pts = []; for (let i = 0; i <= 12; i++) { const a = Math.PI + Math.PI * i / 12; pts.push([bx + Math.cos(a) * 70 * sc, RT + 6 + Math.sin(a) * 44 * sc * (1 + .18 * Math.sin(i * 2.3 + sd))]); }
        ink(ctx, pts, { fill: C.cream, tone: tone(false, bx, RT), lw: 5 }); }
      const segs = []; for (let i = 0; i <= gaps.length; i++) { const sa = i ? gaps[i - 1][1] : null, sb = i < gaps.length ? gaps[i][0] : null;
        if ((sb == null || x0 < sb) && (sa == null || x1 > sa)) segs.push({ sa, sb, eA: i ? ENDS[i - 1][1] : null, eB: i < gaps.length ? ENDS[i][0] : null }); }
      for (const S of segs) {
        const xa = S.sa ?? x0 - 60, xb = S.sb ?? x1 + 60, eA = S.eA, eB = S.eB, lA = eA && eA[eA.length - 1], lB = eB && eB[eB.length - 1];
        let top, face;
        if (!eA && eB) { top = [[xa, RT], ...eB.slice(0, 3), [xa, RF]]; face = [[xa, RF], ...eB.slice(2), ...under(xa, lB[0] - 10).reverse(), [xa, RB]]; }
        else if (eA && !eB) { top = [eA[0], [xb, RT], [xb, RF], eA[2], eA[1]]; face = [...eA.slice(2), [xb, RF], [xb, RB], ...under(lA[0] + 10, xb).reverse()]; }
        else if (eA && eB) { top = [eA[0], ...eB.slice(0, 3), eA[2], eA[1]]; face = [...eA.slice(2), ...under(lA[0] + 10, lB[0] - 10), ...eB.slice(2).reverse()]; }
        else { top = [[xa, RT], [xb, RT], [xb, RF], [xa, RF]]; face = [[xa, RF], [xb, RF], [xb, RB], ...under(xa, xb).reverse(), [xa, RB]]; }
        ink(ctx, face, { fill: C.ground, tone: tone(true, 0, RF), lw: 6, smooth: false, step: 14 });
        ink(ctx, top, { fill: C.road, lw: 0, smooth: false, mx: 0, my: 0 });
      }
      for (const S of segs) {
        ink(ctx, [[S.sa ?? x0 - 40, RT], [S.sb ?? x1 + 40, RT]], { closed: false, lw: 6, smooth: false });
        ink(ctx, [[S.sa != null ? S.sa - 2 : x0 - 40, RF], [S.sb != null ? S.sb + 2 : x1 + 40, RF]], { closed: false, lw: 6, smooth: false });
        if (S.eA) ink(ctx, S.eA.slice(0, 3), { closed: false, lw: 6, smooth: false });
        if (S.eB) ink(ctx, S.eB.slice(0, 3), { closed: false, lw: 6, smooth: false });
      }
      for (const g of gaps) for (const [x, dir] of [[g[0], 1], [g[1], -1]]) if (x > x0 - 100 && x < x1 + 100)
        for (const [dx, dy, r] of [[-14, RB + 40, 9], [-30, RB + 70, 6], [-8, RB + 96, 4.5]]) ink(ctx, ell(x + dir * dx, dy, r, r * .8, 9), { fill: C.ground, lw: 4, single: true });
      for (const [tx, ty, r] of TUFT) { if (tx < x0 - 60 || tx > x1 + 60 || inGap(tx, 50)) continue;
        const y = Math.min(ty, RF - 12);
        if (r < .5) ink(ctx, [[tx - 14, y], [tx - 6, y - 14], [tx, y], [tx + 7, y - 16], [tx + 14, y]], { closed: false, lw: 4, smooth: false, single: true });
        else ink(ctx, [[tx - 40, y + 4], [tx + 40, y + 6]], { closed: false, lw: 4.5, single: true }); }
    };
    return { draw, top: RT, front: RF, bottom: RB, gaps, ENDS };
  };
  /* R.arch(ctx, x, gy, t, o) — an open arched door standing on gy, yellow light inside, glow and light on the ground.
     Draws the light now; → { op (the opening's outline, to clip figures walking in), draw() (the frame, leaves, sparkles —
     call after whatever is inside) }. o: { R: 104 (outer radius), r: 74 (opening radius), h: 300 (arch height) } */
  R.arch = function (ctx, x, gy, t, o = {}) {
    const Ro = o.R ?? 104, r0 = o.r ?? 74, ay = gy - (o.h ?? 300), ay0 = ay + 30;
    glow(ctx, x, gy - 170, 420, .8); glow(ctx, x, gy - 150, 230, .9);
    ctx.save(); ctx.globalAlpha *= .55; ink(ctx, [[x - r0, gy], [x + r0, gy], [x + 200, gy + 70], [x - 220, gy + 70]], { fill: C.yelL, lw: 0, mx: 0, my: 0, smooth: false }); ctx.restore();
    const op = []; op.push([x - r0, gy]); for (let i = 0; i <= 16; i++) { const a = Math.PI + Math.PI * i / 16; op.push([x + Math.cos(a) * r0, ay0 + Math.sin(a) * r0]); } op.push([x + r0, gy]);
    ink(ctx, op, { fill: C.yel, lw: 0, mx: 0, my: 0, smooth: false });
    return { op, draw: () => {
      const fr = []; fr.push([x - Ro, gy]); for (let i = 0; i <= 18; i++) { const a = Math.PI + Math.PI * i / 18; fr.push([x + Math.cos(a) * Ro, ay + Math.sin(a) * Ro + 30]); } fr.push([x + Ro, gy]);
      ink(ctx, fr.concat(op.slice().reverse()), { fill: C.cream, smooth: false, lw: 6 });
      ink(ctx, [[x + r0, gy], [x + r0, ay0], [x + r0 + 16, ay0 + 6], [x + r0 + 16, gy]], { tone: tone(true, x, gy), lw: 0, smooth: false, mx: 0, my: 0 });
      ink(ctx, [[x - Ro, gy], [x - Ro - 46, gy + 22], [x - Ro - 46, ay0 - 30], [x - Ro, ay0 - 10]], { fill: C.cream, tone: tone(false, x, gy), lw: 5.5, smooth: false });
      ink(ctx, [[x + Ro, gy], [x + Ro + 46, gy + 22], [x + Ro + 46, ay0 - 30], [x + Ro, ay0 - 10]], { fill: C.cream, tone: tone(false, x, gy), lw: 5.5, smooth: false });
      const SP = [[-150, -330, 22, 0], [140, -380, 18, .4], [190, -220, 14, .8], [-190, -170, 13, .2], [30, -460, 15, .6]];
      for (const [dx, dy, rr, ph] of SP) sparkle(ctx, x + dx, gy + dy, rr * (.5 + .5 * Math.abs(Math.sin(t * 2.6 + ph * 6))), 1, .5);
    } };
  };
  /* R.dashed(ctx, pts, t) — a marching dashed outline (black under cream): "the missing shape", a plan, a ghost */
  R.dashed = function (ctx, pts, t) {
    const P = resample(pts, true, 10 * LWK).map(p => wob(p, 1.2 * AMPK)), path = pathOf(P, true, false);
    ctx.save(); ctx.lineCap = 'butt'; ctx.setLineDash([18 * LWK, 12 * LWK]); ctx.lineDashOffset = -t * 20;
    ctx.lineWidth = 10 * LWK; ctx.strokeStyle = C.ink; ctx.stroke(path); ctx.lineWidth = 5 * LWK; ctx.strokeStyle = C.cream; ctx.stroke(path); ctx.setLineDash([]); ctx.restore(); return path;
  };
  /* R.chips(ctx, t, list) — inked triangle chips/flecks thrown up and landing (gravity 700 px/s²), fading after 1.2 s.
     list item: { t0, x, y, vx, vy, land (y), r0, vr, sz, col } — build the list once, seeded. */
  R.chips = function (ctx, t, list) {
    for (const q of list) {
      const u = t - q.t0; if (u < 0) continue; const al = 1 - ss(q.t0 + 1.2, q.t0 + 1.8, t); if (al <= 0) continue;
      const tl = (-q.vy + Math.sqrt(q.vy * q.vy + 4 * 700 * (q.land - q.y))) / 1400, uu = Math.min(u, Math.max(0, tl));
      const x = q.x + q.vx * uu, y = q.y + q.vy * uu + 700 * uu * uu, r = q.r0 + q.vr * uu;
      ctx.save(); ctx.globalAlpha *= al; const pts = []; for (let i = 0; i < 3; i++) { const a = r + i * TAU / 3; pts.push([x + Math.cos(a) * q.sz, y + Math.sin(a) * q.sz * .7]); }
      ctx.fillStyle = q.col; ctx.fill(pathOf(pts, true, false)); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4 * LWK; ctx.stroke(pathOf(pts, true, false)); ctx.restore();
    }
  };

  /* ---------------------------------------------------------------- comic marks (world space, around a head hc) */
  /* R.sweat(ctx, hc, s, t) — two sweat drops sliding down beside the head */
  R.sweat = function (ctx, hc, s, t) { const ph = (t * 1.6) % 1;
    for (const [dx, dy, sc] of [[-92, -40, 1], [-112, 6, .7]]) { const x = hc[0] + dx * s, y = hc[1] + dy * s + ph * 26;
      ink(ctx, [[x, y - 22 * sc], [x + 9 * sc, y], [x, y + 8 * sc], [x - 9 * sc, y]], { fill: C.cream, lw: 4, step: 6, single: true }); } };
  /* R.gloom(ctx, hc, s) — three wavy gloom lines over the head */
  R.gloom = function (ctx, hc, s) { for (let i = 0; i < 3; i++) { const x = hc[0] + (-34 + i * 30) * s, y = hc[1] - 150 * s; ink(ctx, [[x, y], [x + 4, y + 13], [x - 2, y + 26], [x + 3, y + 38]], { closed: false, lw: 4.5, single: true }); } };
  /* R.ticks(ctx, hc, s, k, dir) — surprise ticks off the head (k = alpha, dir = side ±1) */
  R.ticks = function (ctx, hc, s, k, dir) { if (k <= 0) return; ctx.save(); ctx.globalAlpha *= k;
    for (let i = 0; i < 3; i++) { const an = -1.05 - i * .45, c = [hc[0] + dir * 20 * s, hc[1] - 30 * s], cx = Math.cos(an) * dir, sy = Math.sin(an);
      ink(ctx, [[c[0] + cx * 100 * s, c[1] + sy * 100 * s], [c[0] + cx * 140 * s, c[1] + sy * 140 * s]], { closed: false, lw: 5.5, single: true }); }
    ctx.restore(); };
  /* R.runLines(ctx, F, k) — two squiggle motion lines trailing a running figure (k = alpha) */
  R.runLines = function (ctx, F, k) { if (k <= 0) return; ctx.save(); ctx.globalAlpha *= k; const d = F.f;
    squiggle(ctx, F.hip[0] - d * 250, F.hip[1] - 150, 110, 8, K * .9, 4.5, -d); squiggle(ctx, F.hip[0] - d * 270, F.hip[1] - 40, 80, 7, K * .9 + 1, 4.5, -d); ctx.restore(); };
  /* R.puffs(ctx, F, gy, k) — little heel puffs kicked back at each footfall of a walking/running figure (uses F.ph) */
  R.puffs = function (ctx, F, gy, k = 1) { if (k <= 0) return; ctx.save(); ctx.globalAlpha *= k; const d = F.f;
    for (const off of [0, .5]) { const ph = Rig.frac((F.ph ?? 0) + off); if (ph < .2) { const q = ph / .2, fx = F.feet[off ? 1 : 0][0];
      ink(ctx, ell(fx - d * (50 + q * 26), gy - 10 - q * 8, 13 + q * 7, 9 + q * 4, 12), { fill: C.cream, lw: 4, step: 8, amp: 1.2, single: true });
      ink(ctx, ell(fx - d * (92 + q * 40), gy - 6 - q * 12, 8 + q * 4, 6 + q * 3, 10), { fill: C.cream, lw: 4, step: 6, amp: 1.2, single: true }); } }
    ctx.restore(); };
  /* R.focus(ctx, cx, cy, k) — THE HIT: manga focus lines converging on a screen point (k = alpha; re-drawn per boil frame) */
  R.focus = function (ctx, cx, cy, k) { if (k <= 0) return;
    const r = rng(500 + K), n = 46; ctx.save(); ctx.globalAlpha *= k; ctx.fillStyle = C.ink;
    for (let i = 0; i < n; i++) { const a = i / n * TAU + r() * .1, r0 = 430 + r() * 180, w = .012 + r() * .014;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a - w) * 1500, cy + Math.sin(a - w) * 1500); ctx.lineTo(cx + Math.cos(a + w) * 1500, cy + Math.sin(a + w) * 1500); ctx.fill(); }
    ctx.restore(); };
  /* R.inset(ctx, t, a0, a1, [x0, y0, w, h], content) — a pop-in comic panel (screen space) shown a0…a1: pops with an
     overshoot, fades out whole. content(ctx, x0, y0, w, h) draws inside it (clipped), e.g. a close-up of a face. */
  R.inset = function (ctx, t, a0, a1, box, content) {
    if (t < a0 || t >= a1) return;
    const pop = t < a0 + .25 ? eo((t - a0) / .25) * (1 + .12 * Math.sin(Math.PI * clamp((t - a0) / .25))) : 1, fadeOut = 1 - ss(a1 - .3, a1 - .08, t);
    const [x0, y0, w, h] = box, cxp = x0 + w / 2, cyp = y0 + h / 2;
    if (pop <= .06 || fadeOut <= .02) return;
    ctx.save(); ctx.globalAlpha *= Math.min(1, pop * 1.6) * fadeOut; ctx.translate(cxp, cyp); ctx.scale(pop, pop); ctx.translate(-cxp, -cyp);
    const rect = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
    const path = pathOf(resample(rect, true, 16).map(p => wob(p, 1.6)), true, false);
    ctx.save(); ctx.fillStyle = C.panel; ctx.fill(path); ctx.clip(path);
    content(ctx, x0, y0, w, h);
    ctx.restore();
    ctx.lineWidth = 6.5; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.stroke(path);
    ctx.restore();
  };

  /* ---------------------------------------------------------------- end card */
  /* R.endPlate(ctx, t, at, o) — a cream comic plate dropped onto the page at `at` (lands with a bounce), the field
     dimmed behind, a dot-tone drop shadow; o.stamp(ctx, y0) draws a small accent icon above the title (see R.stamp).
     Screen space; call after R.screen(). → y0 (plate top) or 0 */
  R.endPlate = function (ctx, t, at, o = {}) {
    const k = t - (at - .2); if (k <= 0) return 0;
    const drop = k < .3 ? eo(k / .3) : 1, bounce = k < .3 ? 0 : Math.exp(-(k - .3) * 9) * Math.sin((k - .3) * 26) * 10;
    const x0 = 92, x1 = 988, y0 = 616 - (1 - drop) * 900 + bounce, y1 = 1262 - (1 - drop) * 900 + bounce;
    ctx.save(); ctx.globalAlpha = .35 * drop; ctx.fillStyle = C.field; ctx.fillRect(0, 0, Pilot.W, Pilot.H); ctx.restore();
    const rect = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    ctx.save(); ctx.translate(10, 12); ctx.fillStyle = tone(true, 0, 0); ctx.fill(pathOf(rect, true, false)); ctx.restore();
    ink(ctx, resample(rect, true, 18), { fill: C.cream, smooth: false, lw: 7, raw: true });
    if (o.stamp) o.stamp(ctx, y0);
    return y0;
  };
  /* R.stamp(ctx, x, y, sc, rot, draw) — draw(ctx) an icon at (x, y), scaled by sc and rotated, with the ink line kept
     at print weight (line-width multiplier 0.75 / sc) */
  R.stamp = function (ctx, x, y, sc, rot, draw) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
    const lw0 = LWK; LWK = 1 / sc * .75; draw(ctx); LWK = lw0; ctx.restore();
  };
  /* R.sproutIcon(ctx) — a small yellow sprout (two leaves on a stem), centred on (0, 0), ~120 units tall — a default stamp */
  R.sproutIcon = function (ctx) {
    ink(ctx, tube([[0, 60], [2, 20], [0, -20]], [6, 6, 5]), { fill: C.yel, lw: 5 });
    ink(ctx, [[0, -10], [-34, -40], [-62, -36], [-40, -6]], { fill: C.yel, lw: 5 });
    ink(ctx, [[0, -22], [30, -62], [62, -58], [40, -20]], { fill: C.yel, lw: 5 });
  };
  /* R.captions(ctx, t, lines, o) / R.endCard(ctx, t, card, at, o) — Story captions and end card in the style's
     hand font, black ink, no shadow (the field is light). o overrides any Story option. */
  R.captions = (ctx, t, lines, o = {}) => Story.captions(ctx, t, lines, Object.assign({ font: R.FONT, weight: 700, size: 70, y: 405, color: C.ink, shadow: 'rgba(0,0,0,0)', shadowBlur: 0, srcColor: '#22343a' }, o));
  R.endCard = (ctx, t, card, at, o = {}) => Story.endCard(ctx, t, card, at, Object.assign({ font: R.FONT, srcFont: R.FONT, color: C.ink, srcColor: '#2c3a3e', y: 860, titleShadow: '' }, o));

  /* ---------------------------------------------------------------- camera, timing, print pass */
  /* R.mixCam(a, b, k) — blend two camera keys { x, y, z } */
  R.mixCam = (a, b, k) => k <= 0 ? a : k >= 1 ? b : { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
  /* R.shake(t, t0, len, ax, ay) → [sx, sy] screen-px shake decaying over len s after t0 (the hit) */
  R.shake = (t, t0, len = .55, ax = 16, ay = 12) => { if (t < t0) return [0, 0]; const k = 1 - ss(t0, t0 + len, t); return [ax * k * Math.sin(t * 97), ay * k * Math.sin(t * 131 + 1)]; };
  /* R.cam(ctx, cm, p) — set the world transform for a layer at parallax p (1 = the world, .25 = far sky) and scale the
     line/jitter/dot sizes to it. cm = { x, y, z, sx?, sy? }. → the layer's zoom */
  R.cam = function (ctx, cm, p) {
    const z = 1 + (cm.z - 1) * p, cx = cm.x * p, cy = 960 + (cm.y - 960) * p;
    ctx.setTransform(z, 0, 0, z, 540 - cx * z + (cm.sx || 0) * p, 960 - cy * z + (cm.sy || 0) * p);
    LWK = Math.pow(z, -.8); AMPK = 1.2 / z; MR = 1 / z; TS = 1 / z; return z;
  };
  /* R.screen(ctx) — back to screen space (identity, print-size lines) */
  R.screen = ctx => { ctx.setTransform(1, 0, 0, 1, 0, 0); LWK = 1; AMPK = 1.2; MR = 1; TS = 1; };
  /* R.grain(ctx, cm) — the print grain over everything, locked to the camera's pan (last pass of scene()) */
  R.grain = function (ctx, cm) { ctx.save(); PAT.grain.setTransform(new DOMMatrix().translate(-(cm.x * cm.z) % 512, -(cm.y * cm.z) % 512)); ctx.fillStyle = PAT.grain; ctx.fillRect(0, 0, Pilot.W, Pilot.H); ctx.restore(); };
  /* R.t12(t) — time snapped to twos (12 poses/s): pose figures and cameras with it */
  R.t12 = t => Math.floor(t * 12 + 1e-6) / 12;
  /* R.onTwos(ctx, t, scene) — draw scene(ctx2, t12) once per pose into a 2-slot cache and blit it (seek-safe) */
  R.onTwos = function (ctx, t, scene) {
    const tp = R.t12(t);
    let slot = CACHE.find(c => c.t === tp);
    if (!slot) { slot = CACHE[CACHE.next = 1 - (CACHE.next || 0)]; const c = slot.c.getContext('2d'); c.save(); scene(c, tp); c.restore(); slot.t = tp; }
    ctx.drawImage(slot.c, 0, 0);
  };
  /* R.lwk() — the current line-width multiplier (for raw canvas strokes that should match the ink weight) */
  R.lwk = () => LWK;

  window.Riso = R;
})();

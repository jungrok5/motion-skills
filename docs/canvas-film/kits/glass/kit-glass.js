/* kit-glass.js — stained glass (스테인드글라스), as a reusable word-log house style.  Global: window.Glass
   The whole frame is ONE tall lancet window in a dark stone wall: a blue pearled border, a white fillet with a painted
   vine, a rosette medallion in the arch, cobalt lozenge quarries for the sky (fixed in the window's lead), and a white-glass
   inscription band where the words are painted. The story is a living panel inside it: every shape is a cut glass piece
   (colour varying per piece, streaks and seed bubbles, matting inside the lead, a black lead came round it), painted with
   grisaille trace lines. Figures are rigid leaded pieces that step at 12 fps. Light is the medium: a door of the
   brightest white glass leaks light, pieces are welded with a spark, the window CRACKS on the hit (light races through the
   cracks), and at the end a cloud covers the sun and the card is painted on a white-glass plate.
   One accent: RUBY glass for "mine" (everyone else carries amber / clear).
   Load after lib.js and story.js:  <script src="lib.js"></script><script src="story.js"></script><script src="kit-glass.js"></script>
   Coordinates: the window is screen-fixed (1080×1920 design). The panel is a WORLD in px (y down) seen through a camera
   { x, y, z }: world (x, y) → screen (540 + (x − cam.x)·z, 1100 + (y − cam.y)·z), clipped to the picture field.
   Pure and deterministic: textures and plates are built once in init(); everything else is a function of t (seeded
   randomness only). No network, no images.
   Worked example: sermons/2026-10-11-1cor4/film/scenes/cross-glass.html (잘라 낸 건 다리였다 ⑦). */
(function () {
  const { clamp, lerp, ss, eo, eio, rng } = Pilot;
  const K = {}, W = Pilot.W, H = Pilot.H, TAU = Math.PI * 2;
  K.TAU = TAU;

  // ---------------------------------------------------------------- palette (transmittance colours), type
  K.C = {
    cobT: '#162f82', cob: '#1d3a9c', cobH: '#3a5db3', deep: '#142a70', green: '#2f7f36', green2: '#22602e', olive: '#6b7a22',
    olive2: '#56621c', moss: '#3f6a2a', umber: '#7a4e24', umber2: '#5e3b1c', earth: '#6a4220', buff: '#a89c72', buff2: '#968a62',
    buff3: '#b5a980', stone: '#8b819c', stone2: '#776d8b', stone3: '#9a90ab', white: '#fbf8ee', flesh: '#b97f5e', shoe: '#3b2617',
    amber: '#d99a2b', clear: '#e3dab6', ruby: '#c3121f', rubyDim: '#4a0b12', wood: '#8a5a2a', steel: '#b4c0c0', label: '#ece3c7',
    chasm: ['#151b38', '#10152d', '#0c1022', '#080a17', '#05060e'],
  };
  const C = K.C;
  K.LEAD = '#131417'; K.INK = 'rgba(44,26,12,.88)'; K.INK2 = 'rgba(44,26,12,.55)';   // lead came; grisaille trace / half-tone
  const LEAD = K.LEAD, INK = K.INK, INK2 = K.INK2;
  K.SERIF = "'Noto Serif KR',serif"; K.SANS = "'Noto Sans KR',sans-serif";
  K.FONTS = ["600 54px 'Noto Serif KR'", "700 72px 'Noto Serif KR'", "400 28px 'Noto Sans KR'", "500 34px 'Noto Sans KR'"];
  // the window (screen px): picture field, inscription band
  K.PX0 = 98; K.PX1 = 982; K.PY0 = 602; K.PY1 = 1840; K.BAND0 = 324; K.BAND1 = 598;
  const { PX0, PX1, PY0, PY1, BAND0, BAND1 } = K;
  // step(t, fps = 12): time held on 12 fps — figures and pieces move piece by piece (camera and light stay smooth)
  K.step = (t, fps = 12) => Math.floor(t * fps + 1e-6) / fps;

  // ---------------------------------------------------------------- small helpers (paths, paint)
  const hsh = K.hsh = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  // vary(hex, id, amt): the colour of one piece — glass thickness varies per piece (seeded by id)
  const vary = K.vary = function (hex, id, amt = .08) {
    const [r, g, b] = Pilot.hex(hex), v = 1 + (hsh(id * 3.17 + .5) - .5) * 2 * amt, w = (hsh(id * 1.9 + 7) - .5) * amt * .6;
    const f = x => clamp(Math.round(x), 0, 255); return `rgb(${f(r * v * (1 + w))},${f(g * v)},${f(b * v * (1 - w))})`;
  };
  // smoothP(pts, closed, k, path): a Path2D through points with Catmull-like béziers; a point [x, y, 1] is a sharp corner
  const smoothP = K.smoothP = function (pts, closed = true, k = .5, p = new Path2D()) {
    const n = pts.length, P = i => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0, m = closed ? n : n - 1; i < m; i++) {
      const a = P(i), b = P(i + 1), a0 = P(i - 1), b1 = P(i + 2), ka = a[2] ? 0 : k / 3, kb = b[2] ? 0 : k / 3;
      p.bezierCurveTo(a[0] + (b[0] - a0[0]) * ka, a[1] + (b[1] - a0[1]) * ka, b[0] - (b1[0] - a[0]) * kb, b[1] - (b1[1] - a[1]) * kb, b[0], b[1]);
    }
    if (closed) p.closePath(); return p;
  };
  // polyP(pts) / rectP(x, y, w, h) / ellP(x, y, rx, ry, rot): Path2D shapes for pieces
  const polyP = K.polyP = (pts, p = new Path2D()) => { pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath(); return p; };
  const rectP = K.rectP = (x, y, w, h) => { const p = new Path2D(); p.rect(x, y, w, h); return p; };
  const ellP = K.ellP = (x, y, rx, ry, r = 0) => { const p = new Path2D(); p.ellipse(x, y, rx, ry, r, 0, TAU); return p; };
  // stroke(c, pts, w, col = INK, closed): a smooth painted line
  const stroke = K.stroke = function (c, pts, w, col = INK, closed = false) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(smoothP(pts, closed)); };
  // brush(c, pts, w, col = INK): a tapered grisaille trace line (thick in the middle, fine at both ends)
  const brush = K.brush = function (c, pts, w, col = INK) {
    const n = pts.length; if (n < 2) return; const Lf = [], Rt = [];
    for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1;
      const hw = w * .5 * (.3 + .7 * Math.sin(Math.PI * i / (n - 1))); Lf.push([pts[i][0] - dy / l * hw, pts[i][1] + dx / l * hw]); Rt.push([pts[i][0] + dy / l * hw, pts[i][1] - dx / l * hw]); }
    c.fillStyle = col; c.fill(smoothP(Lf.concat(Rt.reverse()), true, .3));
  };
  // h2(a, b): integer hash 0..1; pvn: tileable value noise (glass texture)
  const h2 = K.h2 = (a, b) => { let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
  function pvn(x, y, Px, Py) { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, s = q => q * q * (3 - 2 * q), mx = a => ((a % Px) + Px) % Px, my = a => ((a % Py) + Py) % Py;
    const a = h2(mx(i), my(j)), b = h2(mx(i + 1), my(j)), c = h2(mx(i), my(j + 1)), d = h2(mx(i + 1), my(j + 1));
    return (a * (1 - s(u)) + b * s(u)) * (1 - s(v)) + (c * (1 - s(u)) + d * s(u)) * s(v); }
  // ik(Sh, T, a, b, down = 1): two-bone arm from shoulder Sh to target T, bone lengths a, b (fixed). Elbow on the lower
  // side when down = 1, the upper side when −1 (reaching up / holding something high). → [elbow, wrist]; an out-of-reach
  // target is clamped (the hand stops at full reach)
  const ik = K.ik = function (Sh, T, a, b, down = 1) {
    const dx = T[0] - Sh[0], dy = T[1] - Sh[1], d = clamp(Math.hypot(dx, dy), Math.abs(a - b) + 1, a + b - .5), th = Math.atan2(dy, dx);
    const al = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
    const e1 = [Sh[0] + Math.cos(th + al) * a, Sh[1] + Math.sin(th + al) * a], e2 = [Sh[0] + Math.cos(th - al) * a, Sh[1] + Math.sin(th - al) * a];
    const E = (e1[1] > e2[1]) === (down > 0) ? e1 : e2, a2 = Math.atan2(T[1] - E[1], T[0] - E[0]);
    return [E, [E[0] + Math.cos(a2) * b, E[1] + Math.sin(a2) * b]];
  };
  // limbP(P, Q, w0, w1): a tapered limb piece from P (width w0) to Q (width w1)
  const limbP = K.limbP = function (P, Q, w0, w1) { const dx = Q[0] - P[0], dy = Q[1] - P[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    return smoothP([[P[0] + nx * w0 / 2, P[1] + ny * w0 / 2], [Q[0] + nx * w1 / 2, Q[1] + ny * w1 / 2], [Q[0] - nx * w1 / 2, Q[1] - ny * w1 / 2], [P[0] - nx * w0 / 2, P[1] - ny * w0 / 2]], true, .25); };
  const hexOf = rgb => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

  // ---------------------------------------------------------------- glass texture + one glass piece
  let TEX = null; const PATS = new WeakMap();
  function makeTex() {
    const N = 256, c = Pilot.canvas(N, N), x = c.getContext('2d'), im = x.createImageData(N, N), d = im.data;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const u = i / N, v = j / N, n = pvn(u * 3, v * 26, 3, 26) * .5 + pvn(u * 7, v * 64, 7, 64) * .25 + pvn(u * 4, v * 4, 4, 4) * .25;
      const val = 255 * (.79 + .21 * n), k = (i + j * N) * 4; d[k] = val; d[k + 1] = val; d[k + 2] = val * (.985 + .015 * n); d[k + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    const r = rng(11);
    for (let i = 0; i < 46; i++) { const bx = 8 + r() * (N - 16), by = 8 + r() * (N - 16), br = .9 + r() * r() * 3.2;   // seed bubbles
      x.fillStyle = 'rgba(150,150,150,.55)'; x.beginPath(); x.arc(bx, by, br + .8, 0, TAU); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(bx - br * .15, by - br * .15, br * .72, 0, TAU); x.fill(); }
    x.strokeStyle = 'rgba(165,165,165,.55)'; x.lineWidth = .8;                                                            // scratches
    for (let i = 0; i < 7; i++) { const a = r() * N, b = r() * N, an = r() * TAU, len = 20 + r() * 60; x.beginPath(); x.moveTo(a, b); x.lineTo(a + Math.cos(an) * len, b + Math.sin(an) * len); x.stroke(); }
    TEX = c;
  }
  const pat = c => { let p = PATS.get(c); if (!p) { p = c.createPattern(TEX, 'repeat'); PATS.set(c, p); } return p; };
  // piece(c, path, col, id, o): ONE cut glass piece — colour varied per piece (o.vary, .07; o.flat = exact colour), streaks
  // and bubbles multiplied in (rotated per id; o.ts texture scale .75; o.tex === false = none), matting inside the lead
  // (o.mat px, 12; 0 = none; o.mat2 === 0 = no outer matting), o.paint(c) grisaille painted inside the clip, and the lead
  // came round it (o.lead px, 5; 0 = none). `id` seeds everything: give a moving piece a fixed id.
  const piece = K.piece = function (c, path, col, id, o = {}) {
    c.fillStyle = o.flat ? col : vary(col, id, o.vary ?? .07); c.fill(path);
    if (o.tex !== false) {
      c.save(); c.clip(path); c.globalCompositeOperation = 'multiply';
      const p = pat(c); p.setTransform(new DOMMatrix().translate(hsh(id + .3) * 256, hsh(id + .7) * 256).rotate(hsh(id * 2.3) * 180).scale(o.ts ?? .75));
      c.fillStyle = p; c.fill(path); c.globalCompositeOperation = 'source-over';
      if (o.mat !== 0) { c.lineJoin = 'round'; c.strokeStyle = 'rgba(46,26,10,.24)'; c.lineWidth = o.mat ?? 12; c.stroke(path);
        if (o.mat2 !== 0) { c.strokeStyle = 'rgba(46,26,10,.14)'; c.lineWidth = (o.mat ?? 12) * 2.2; c.stroke(path); } }
      if (o.paint) o.paint(c);
      c.restore();
    } else if (o.paint) { c.save(); c.clip(path); o.paint(c); c.restore(); }
    if (o.lead !== 0) { c.strokeStyle = LEAD; c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = o.lead ?? 5; c.stroke(path); }
  };

  // ---------------------------------------------------------------- the lancet (screen-fixed)
  const LCX = [603.7, 476.3], LSPR = 560, LR = 549.7;
  // lancet(d): the window opening inset by d px, as a Path2D (two-centred pointed arch, springing at y 560)
  const lancet = K.lancet = function (d, p = new Path2D()) {
    const x0 = 54 + d, x1 = 1026 - d, r = LR - d, ay = LSPR - Math.sqrt(r * r - (540 - LCX[0]) ** 2);
    p.moveTo(x0, 1840); p.lineTo(x0, LSPR);
    p.arc(LCX[0], LSPR, r, Math.PI, Math.atan2(ay - LSPR, 540 - LCX[0]));
    p.arc(LCX[1], LSPR, r, Math.atan2(ay - LSPR, 540 - LCX[1]), 0);
    p.lineTo(x1, 1840); p.closePath(); return p;
  };
  // lancetPts(d, step): points along the lancet's outline every `step` px (bottom-left → up → apex → down right)
  const lancetPts = K.lancetPts = function (d, step) {
    const x0 = 54 + d, x1 = 1026 - d, r = LR - d, ay = LSPR - Math.sqrt(r * r - (540 - LCX[0]) ** 2), out = [];
    for (let y = 1840; y > LSPR; y -= step) out.push([x0, y]);
    const a0 = Math.PI, a1 = Math.atan2(ay - LSPR, 540 - LCX[0]) + TAU, n0 = Math.ceil((a1 - a0) * r / step);
    for (let i = 0; i < n0; i++) { const a = a0 + (a1 - a0) * i / n0; out.push([LCX[0] + Math.cos(a) * r, LSPR + Math.sin(a) * r]); }
    const b0 = Math.atan2(ay - LSPR, 540 - LCX[1]), n1 = Math.ceil(-b0 * r / step);
    for (let i = 0; i <= n1; i++) { const a = b0 - b0 * i / n1; out.push([LCX[1] + Math.cos(a) * r, LSPR + Math.sin(a) * r]); }
    for (let y = LSPR + step; y <= 1840; y += step) out.push([x1, y]);
    return out;
  };

  let SKY, FRAME, BANDC, PLATE, BL1, BL2, BL3;
  function buildSky(seed) {                     // cobalt lozenge quarries, each with a painted curl — fixed in the window
    const c = Pilot.canvas(W, H), g = c.getContext('2d'), cw = 96, ch = 134, r = rng(seed);
    const V = (m, n) => [m * cw / 2 + (h2(m + 50, n + 80) - .5) * 14, n * ch / 2 + (h2(m + 9, n + 300) - .5) * 14];
    g.save(); g.clip(lancet(40));
    let id = 1;
    for (let n = -1; n < 31; n++) for (let m = -1; m < 24; m++) {
      if ((m + n) % 2) continue;
      const cx = m * cw / 2, cy = n * ch / 2;
      const pts = [V(m, n - 1), V(m + 1, n), V(m, n + 1), V(m - 1, n)], yk = clamp((cy - 300) / 1000);
      const col = Pilot.rgb(Pilot.mix(Pilot.hex(C.cobT), Pilot.hex(cy > 600 ? C.cobH : C.cob), cy > 600 ? ss(.35, 1, yk) : ss(0, 1, cy / 600)));
      const hex = '#' + col.match(/\d+/g).slice(0, 3).map(v => (+v).toString(16).padStart(2, '0')).join('');
      piece(g, polyP(pts), hex, id++, { lead: 4.5, mat: 9, paint: q => {   // a small vine curl in grisaille
        q.strokeStyle = 'rgba(20,14,40,.45)'; q.lineWidth = 2.2; q.lineCap = 'round'; const s = r() > .5 ? 1 : -1;
        q.beginPath(); q.arc(cx + 4 * s, cy + 6, 13, s > 0 ? -2.4 : -.7, s > 0 ? 1.2 : 2.9, s < 0); q.stroke();
        q.beginPath(); q.arc(cx + 4 * s, cy + 6, 4, 0, TAU); q.stroke();
      } });
    }
    g.restore();
    SKY = c;
  }
  function buildFrame(o) {
    const c = Pilot.canvas(W, H), g = c.getContext('2d'), r = rng(17);
    // stone wall: dark ashlar, lit a little by the window near the opening
    g.fillStyle = '#26221f'; g.fillRect(0, 0, W, H);
    for (let y = 0, row = 0; y < H; y += 92, row++) for (let x = -((row % 2) * 70); x < W; x += 140 + (r() - .5) * 20) {
      const v = 34 + r() * 12; g.fillStyle = `rgb(${v + 6},${v + 2},${v - 2})`; g.fillRect(x + 3, y + 3, 134, 86);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 3, y + 80, 134, 9); }
    g.save(); g.strokeStyle = 'rgba(120,135,190,.18)'; g.lineWidth = 120; g.filter = 'blur(30px)'; g.stroke(lancet(0)); g.restore();
    g.save(); g.strokeStyle = 'rgba(205,190,160,.14)'; g.lineWidth = 26; g.stroke(lancet(-10)); g.restore();      // the splayed reveal
    // sill
    g.fillStyle = '#3a342e'; g.fillRect(0, 1840, W, 80); g.fillStyle = 'rgba(210,190,160,.16)'; g.fillRect(0, 1840, W, 6);
    // cut the opening
    g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.fill(lancet(0)); g.restore();
    // border: blue band with white pearls, white fillet with a running vine
    const ring = (d0, d1) => { const p = lancet(d0); lancet(d1, p); return p; };
    g.save(); const band = ring(5, 29); g.clip(band, 'evenodd');
    piece(g, rectP(0, 0, W, H), o.border || C.deep, 7, { lead: 0, mat: 0 }); g.restore();
    for (const [x, y] of lancetPts(17, 30)) { if (y > 1830) continue; piece(g, ellP(x, y, 6.5, 6.5), '#dfe6d6', 8 + x, { lead: 2.6, tex: false }); }
    g.save(); g.clip(ring(29, 41), 'evenodd'); piece(g, rectP(0, 0, W, H), '#d9dcc8', 9, { lead: 0, mat: 0 });
    const vp = lancetPts(35, 6); g.strokeStyle = INK2; g.lineWidth = 2; g.beginPath();
    vp.forEach((q, i) => { const o2 = Math.sin(i * .55) * 2.6; i ? g.lineTo(q[0] + o2, q[1] + o2) : g.moveTo(q[0], q[1]); }); g.stroke(); g.restore();
    g.strokeStyle = LEAD; g.lineJoin = 'round'; g.lineWidth = 12; g.stroke(lancet(0)); g.lineWidth = 5; g.stroke(lancet(29)); g.lineWidth = 7; g.stroke(lancet(41));
    // a medallion in the arch: an eight-petal rosette (murrey / green, gold eye)
    if (o.medallion !== false) {
      const RC = [540, 172], R0 = 98, pc = o.petals || [C.green2, '#5a2a5c'];
      piece(g, ellP(RC[0], RC[1], R0 + 10, R0 + 10), '#d9dcc8', 31, { lead: 6, mat: 8 });
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU - Math.PI / 2, a1 = a - .36, a2 = a + .36;
        const pts = [[RC[0] + Math.cos(a) * 30, RC[1] + Math.sin(a) * 30], [RC[0] + Math.cos(a1) * 70, RC[1] + Math.sin(a1) * 70], [RC[0] + Math.cos(a) * (R0 - 2), RC[1] + Math.sin(a) * (R0 - 2)], [RC[0] + Math.cos(a2) * 70, RC[1] + Math.sin(a2) * 70]];
        piece(g, smoothP(pts), i % 2 ? pc[0] : pc[1], 40 + i, { lead: 4.5, mat: 8 }); }
      piece(g, ellP(RC[0], RC[1], 30, 30), '#c99a3a', 52, { lead: 5, mat: 8, paint: q => { stroke(q, [[RC[0] - 12, RC[1]], [RC[0], RC[1] - 12], [RC[0] + 12, RC[1]], [RC[0], RC[1] + 12]], 2, INK2, true); } });
    }
    // iron saddle bar low in the window
    for (const y of (o.bars || [1590])) { g.fillStyle = '#17171a'; g.fillRect(30, y - 5, W - 60, 11); g.fillStyle = 'rgba(150,150,160,.3)'; g.fillRect(30, y - 5, W - 60, 2); }
    FRAME = c;
  }
  function buildBand() {                    // the inscription band: white glass in a lead frame, curled scroll ends painted on
    const c = Pilot.canvas(W, H), g = c.getContext('2d');
    g.save(); g.clip(lancet(41));
    piece(g, rectP(40, BAND0, 1000, BAND1 - BAND0), C.label, 62, { lead: 6, mat: 22, ts: .9, vary: 0 });
    g.strokeStyle = INK2; g.lineWidth = 2.2; g.strokeRect(PX0 + 16, BAND0 + 14, PX1 - PX0 - 32, BAND1 - BAND0 - 28);
    g.restore();
    g.strokeStyle = LEAD; g.lineWidth = 8; g.beginPath(); g.moveTo(40, BAND0); g.lineTo(1040, BAND0); g.moveTo(40, BAND1 + 2); g.lineTo(1040, BAND1 + 2);
    g.save(); g.clip(lancet(36)); g.stroke(); g.restore();
    BANDC = c;
  }
  // init(o): builds the glass texture, the sky quarries, the window frame (wall, border, medallion, saddle bar), the
  // inscription band, the end-card plate and the bloom buffers (≈ .4 s). Call once from Pilot.run({ init }).
  //   o.skySeed (3), o.medallion (true), o.petals [c1, c2], o.border (C.deep), o.bars ([1590] screen y of saddle bars)
  K.init = function (o = {}) {
    makeTex(); buildSky(o.skySeed ?? 3); buildFrame(o); buildBand();
    const mk = (w, h) => { const c = Pilot.canvas(w, h); c.ctx = c.getContext('2d'); return c; };
    BL1 = mk(180, 320); BL2 = mk(180, 320); BL3 = mk(90, 160);
    // the end-card plate: white glass in lead, a painted rule
    PLATE = Pilot.canvas(W, H); const g = PLATE.getContext('2d');
    piece(g, smoothP([[118, 584, 1], [962, 584, 1], [962, 1150, 1], [118, 1150, 1]]), C.label, 77, { lead: 9, mat: 26, ts: .9, vary: .02 });
    g.strokeStyle = INK2; g.lineWidth = 2.2; g.strokeRect(140, 606, 800, 522); g.lineWidth = 1.4; g.strokeRect(150, 616, 780, 502);
  };

  // ---------------------------------------------------------------- the world panel (built once into a canvas)
  // world(o, paint): a world canvas covering x0…x0+w, y0…y0+h (world px) at `scale` (1.5 keeps close framings sharp);
  // paint(wb) builds it with the builders below. → { cv, x0, y0, w, h }.  Draw with drawWorld(c, world) inside panel().
  //   wb = { g, r (seeded rng, shared by the builders in call order), id (piece id counter), rect: [x0, y0, w, h] }
  K.world = function (o, paint) {
    const { x0, y0, w, h } = o, s = o.scale ?? 1.5, cv = Pilot.canvas(Math.ceil(w * s), Math.ceil(h * s)), g = cv.getContext('2d');
    g.scale(s, s); g.translate(-x0, -y0);
    paint({ g, r: rng(o.seed ?? 5), id: o.id ?? 100, rect: [x0, y0, w, h] });
    return { cv, x0, y0, w, h };
  };
  K.drawWorld = (c, wd) => c.drawImage(wd.cv, wd.x0, wd.y0, wd.w, wd.h);
  // mountains(wb, x0, x1, {y = 1000, bottom = 1240, cols}): far slate-glass mountains with snow caps, irregular widths
  K.mountains = function (wb, X0, X1, o = {}) {
    const { g, r } = wb, Y = o.y ?? 1000, bot = o.bottom ?? 1240, cols = o.cols || ['#45707e', '#566a92', '#3d6470'];
    const my = x => Y + 64 * Math.sin(x / 230 + 1) + 38 * Math.sin(x / 97 + .3) - 30 * Math.cos(x / 61);
    const xs = [X0]; while (xs[xs.length - 1] < X1) xs.push(xs[xs.length - 1] + 150 + r() * 110);
    for (let i = 0; i < xs.length - 1; i++) { const a = xs[i], b = xs[i + 1], top = []; for (let k = 0; k <= 10; k++) { const x = lerp(a, b, k / 10); top.push([x, my(x)]); }
      piece(g, polyP([...top, [b, bot], [a, bot]]), cols[i % 3], wb.id++, { lead: 6, mat: 18, paint: q => {
        q.strokeStyle = 'rgba(14,20,40,.4)'; q.lineWidth = 2.2; const x = (a + b) / 2, y = my(x); q.beginPath(); q.moveTo(x - 30, y + 30); q.lineTo(x, y + 60); q.lineTo(x + 22, y + 40); q.stroke();
        q.fillStyle = 'rgba(235,240,245,.55)'; q.beginPath(); q.moveTo(x - 24, y + 14); q.lineTo(x, y + 2); q.lineTo(x + 26, y + 16); q.lineTo(x + 6, y + 24); q.fill(); } }); }
  };
  // hillY(x): the default rolling hill line (world y); hills(wb, x0, x1, {top = hillY, bottom = 1300, cols}): hills cut
  // in slanted strips with shared vertices, two-tone, with painted grass tufts
  K.hillY = x => 1176 + 26 * Math.sin(x / 160 + .5) + 14 * Math.sin(x / 61 + 2.1);
  K.hills = function (wb, X0, X1, o = {}) {
    const { g, r } = wb, hy = o.top || K.hillY, bot = o.bottom ?? 1300, cols = o.cols || [C.green, C.olive, C.green2, C.moss];
    const xs = [X0]; while (xs[xs.length - 1] < X1) xs.push(xs[xs.length - 1] + 120 + r() * 90);
    const sk = xs.map(() => (r() - .5) * 70);
    for (let i = 0; i < xs.length - 1; i++) { const a = xs[i], b = xs[i + 1], top = [];
      for (let k = 0; k <= 8; k++) { const x = lerp(a, b, k / 8); top.push([x, hy(x)]); }
      const p = polyP([...top, [b + sk[i + 1], bot], [a + sk[i], bot]]);
      piece(g, p, cols[i % 4], wb.id++, { lead: 6, mat: 16, paint: q => { q.strokeStyle = 'rgba(30,40,10,.35)'; q.lineWidth = 2;
        for (let k = 0; k < 3; k++) { const x = lerp(a, b, .2 + k * .3), y = hy(x) + 40 + k * 18; q.beginPath(); q.moveTo(x - 26, y + 6); q.quadraticCurveTo(x, y - 8, x + 26, y + 6); q.stroke(); } } }); }
  };
  // tree(wb, x, y): a two-piece leaded tree (trunk + crown halves) standing on (x, y)
  K.tree = function (wb, tx, ty) {
    const g = wb.g;
    piece(g, rectP(tx - 7, ty - 30, 14, 90), C.umber2, wb.id++, { lead: 4, mat: 6 });
    piece(g, smoothP([[tx, ty - 98], [tx + 40, ty - 70], [tx + 34, ty - 30], [tx, ty - 22]]), C.green2, wb.id++, { lead: 5, mat: 12 });
    piece(g, smoothP([[tx, ty - 98], [tx, ty - 22], [tx - 34, ty - 30], [tx - 40, ty - 70]]), '#2a6e44', wb.id++, { lead: 5, mat: 12, paint: q => {
      q.strokeStyle = 'rgba(20,30,10,.45)'; q.lineWidth = 2; for (let k = 0; k < 4; k++) { q.beginPath(); q.arc(tx - 14 + (k % 2) * 30, ty - 76 + k * 12, 9, .2, 2.9); q.stroke(); } } });
  };
  // gatehouse(wb, door, {top = 1046, base}): a crenellated wall of grey-violet ashlar glass with a pointed door of the
  // brightest white glass and two dark leaves ajar. door = { x, base, spring, apex, hw } (world px). Pair with doorLight().
  K.gatehouse = function (wb, D, o = {}) {
    const g = wb.g, base = o.base ?? D.base - 1, x0 = D.x - 88, x1 = D.x + 90, yT = o.top ?? 1046;
    const merl = []; for (let x = x0; x < x1; x += 44) merl.push([x, yT - 26], [x + 22, yT - 26], [x + 22, yT], [Math.min(x + 44, x1), yT]);
    const wall = polyP([[x0, base + 2], [x0, yT - 26], ...merl, [x1, yT - 26], [x1, base + 2]]);
    g.save(); g.clip(wall);
    for (let y = yT - 26, row = 0; y < base; y += 42, row++) for (let x = x0 - (row % 2) * 34; x < x1; x += 68)
      piece(g, rectP(x, y, 68, 42), [C.stone, C.stone2, C.stone3][(row + Math.round(x / 68)) % 3], wb.id++, { lead: 5, mat: 10 });
    g.restore(); g.strokeStyle = LEAD; g.lineWidth = 6; g.stroke(wall);
    K.door(wb, D);
  };
  // door(wb, door): just the lit pointed doorway (white glass) with two dark leaves ajar — set into any wall
  K.door = function (wb, D) {
    const g = wb.g, { x, hw, base, spring, apex } = D;
    const arch = smoothP([[x - hw, base, 1], [x - hw, spring], [x - hw * .55, apex + 18], [x, apex, 1], [x + hw * .55, apex + 18], [x + hw, spring], [x + hw, base, 1]], true, .5);
    piece(g, arch, C.white, wb.id++, { lead: 6, mat: 0, vary: 0, ts: 1.2 });
    piece(g, polyP([[x - hw + 3, base], [x - hw + 3, spring + 6], [x - 18, spring + 14], [x - 18, base]]), C.umber, wb.id++, { lead: 5, mat: 8, paint: q => { stroke(q, [[x - 32, spring + 20], [x - 32, base]], 2, INK2); } });
    piece(g, polyP([[x + hw - 3, base], [x + hw - 3, spring + 6], [x + 18, spring + 14], [x + 18, base]]), C.umber2, wb.id++, { lead: 5, mat: 8, paint: q => { stroke(q, [[x + 32, spring + 20], [x + 32, base]], 2, INK2); } });
  };
  // road(wb, xa, xb, {y0 = 1296, y1 = 1392, lit: x => bool}): buff flagstones in two rows with skewed joints; `lit`
  // stones (e.g. in front of a door) are paler
  K.road = function (wb, xa, xb, o = {}) {
    const { g, r } = wb, R0 = o.y0 ?? 1296, R1 = o.y1 ?? 1392, mid = (R0 + R1) / 2, lit = o.lit || (() => false);
    const xs = [xa]; while (xs[xs.length - 1] < xb - 40) xs.push(Math.min(xb, xs[xs.length - 1] + 70 + r() * 60)); xs[xs.length - 1] = xb;
    const sk = xs.map((_, i) => i === 0 || i === xs.length - 1 ? 0 : (r() - .5) * 30), ym = x => mid + 7 * Math.sin(x / 37);
    const bx = (i, y) => xs[i] + sk[i] * (y - R0) / (R1 - R0);
    for (let i = 0; i < xs.length - 1; i++) {
      const m0 = ym(xs[i]), m1 = ym(xs[i + 1]), l = lit(xs[i]) ? 1 : 0;
      piece(g, polyP([[bx(i, R0), R0], [bx(i + 1, R0), R0], [bx(i + 1, m1), m1], [bx(i, m0), m0]]), l ? '#ddd3aa' : [C.buff, C.buff2, C.buff3][i % 3], wb.id++, { lead: 5, mat: 10 });
      piece(g, polyP([[bx(i, m0), m0], [bx(i + 1, m1), m1], [bx(i + 1, R1), R1], [bx(i, R1), R1]]), l ? '#d6cba0' : [C.buff2, C.buff3, C.buff][i % 3], wb.id++, { lead: 5, mat: 10 });
    }
  };
  // ground(wb, xa, xb, side, {y0 = 1392, y1, left, right}): hand-cut umber rocks below the road (a jittered grid with shared
  // vertices, darker with depth). left/right(y) → x give a ragged edge (a cliff); `side` (0, 1, …) varies the jitter.
  K.ground = function (wb, xa, xb, side, o = {}) {
    const g = wb.g, R1 = o.y0 ?? 1392, Y1 = o.y1 ?? wb.rect[1] + wb.rect[3], [RX, RY, RW, RH] = wb.rect;
    const cols = Math.ceil((xb - xa) / 150), rows = Math.ceil((Y1 - R1) / 140);
    const V = (i, j) => { const edge = i === 0 || i === cols, x = lerp(xa, xb, i / cols), y = R1 + j * 140;
      const jx = edge ? 0 : (h2(i + side * 97, j) - .5) * 70, jy = j === 0 ? 0 : (h2(i + 7, j + side * 13) - .5) * 60;
      const yy = y + jy, xx = x + jx; if (o.right && i === cols) return [o.right(yy), yy]; if (o.left && i === 0) return [o.left(yy), yy]; return [xx, yy]; };
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const depth = clamp(j / rows), col = [C.umber, C.earth, C.umber2, '#704622'][(i + j * 3) % 4];
      piece(g, polyP([V(i, j), V(i + 1, j), V(i + 1, j + 1), V(i, j + 1)]), col, wb.id++, { lead: 6, mat: 18, paint: q => {
        q.fillStyle = `rgba(10,6,4,${.12 + depth * .5})`; q.fillRect(RX, RY, RW, RH);
        const [x, y] = V(i, j); q.strokeStyle = 'rgba(30,16,6,.5)'; q.lineWidth = 2.2;
        for (let k = 0; k < 2; k++) { q.beginPath(); q.moveTo(x + 20, y + 40 + k * 40); q.quadraticCurveTo(x + 70, y + 26 + k * 40, x + 120, y + 46 + k * 40); q.stroke(); } } });
    }
  };
  // chasm(wb, left, right, {top = 1294, ys, lipTo = 1700}): an UNLIT band between two cliff edges left(y)/right(y) — dark
  // milky glass, no light comes through — and jagged umber lips on both faces
  K.chasm = function (wb, cliffN, cliffF, o = {}) {
    const g = wb.g, R0 = o.top ?? 1296, ys = o.ys || [R0 - 2, 1440, 1560, 1720, 1940, wb.rect[1] + wb.rect[3]], lipTo = o.lipTo ?? 1700;
    for (let i = 0; i < ys.length - 1; i++) { const a = ys[i], b = ys[i + 1];
      const pts = [[cliffN(a), a], [lerp(cliffN(a), cliffF(a), .5), a + (i ? 18 : 0)], [cliffF(a), a], [cliffF(b), b], [lerp(cliffN(b), cliffF(b), .5), b + 18], [cliffN(b), b]];
      piece(g, polyP(pts), C.chasm[Math.min(i, C.chasm.length - 1)], wb.id++, { lead: 6, mat: 22, vary: .03 }); }
    for (const side of [0, 1]) { const f = side ? cliffF : cliffN, s = side ? -1 : 1, pts = [];
      for (let y = R0; y <= lipTo; y += 34) pts.push([f(y) + s * (y === R0 ? 0 : 6 + 10 * h2(y, side)), y]);
      for (let y = lipTo; y >= R0; y -= 34) pts.push([f(y) - s * 2, y]);
      piece(g, polyP(pts), '#4a2e14', wb.id++, { lead: 5, mat: 6 }); }
  };

  // ---------------------------------------------------------------- long objects (a cross; any beam = a cross without its bar)
  // A cross X = { fx, fy (foot, axis point), ang (foot → head, radians), len (fraction of D.L left), fore (crossbar
  // foreshortening: 1 upright/carried, .32 lying on the road), segs (where it is leaded, 0..1), col, id, lead, glow }.
  // D = the cross's dimensions in world px: L length (= the bridge), CB crossbar from the top, CBW crossbar, BW beam width.
  K.D = { L: 360, CB: 78, CBW: 140, BW: 24 };
  K.cross = function (c, o) {
    const { L, CB, CBW, BW } = K.D;
    c.save(); c.translate(o.fx, o.fy); c.rotate(o.ang);
    const Lx = o.len * L, segs = o.segs, lead = o.lead ?? 4.5;
    for (let i = 0; i < segs.length - 1; i++) { const u0 = segs[i], u1 = Math.min(segs[i + 1], o.len); if (u0 >= o.len - 1e-6) break;
      piece(c, rectP((o.len - u1) * L, -BW / 2, (u1 - u0) * L, BW), o.col, o.id + i, { lead, mat: 9, ts: .55 }); }
    const cx = Lx - CB, f = o.fore ?? 1;
    if (!o.noBar) piece(c, polyP([[cx - BW / 2, -CBW / 2 * f], [cx + BW / 2, -CBW / 2 * f], [cx + BW / 2, CBW / 2 * f], [cx - BW / 2, CBW / 2 * f]]), o.col, o.id + 9, { lead, mat: 9, ts: .55 });
    if (o.glow) { c.globalCompositeOperation = 'lighter'; c.fillStyle = o.glow; c.fillRect(0, -BW / 2, Lx, BW); if (!o.noBar) c.fillRect(cx - BW / 2, -CBW / 2 * f, BW, CBW * f); c.globalCompositeOperation = 'source-over'; }
    c.restore();
  };
  // carry(f, len): a cross on the shoulder of profile figure f — junction on the (far) shoulder; the foot drags if it
  // can reach the ground, else rides at 1 rad. → cross placement + grip (near hand on the shaft), front (a point ahead on
  // the beam — the far hand), drag
  K.carry = function (f, len) {
    const { L, CB } = K.D;
    const lean = f.lean || 0, cs = Math.cos(lean), sn = Math.sin(lean);
    const lx = -8 * f.s, ly = -200 * f.s * (1 - .16 * (f.crouch || 0));
    const cx = f.x + f.dir * (lx * cs - ly * sn), cy = f.y + (lx * sn + ly * cs);
    const dist = len * L - CB, h = f.y - cy; let th;
    if (dist >= h + 2) th = Math.asin(h / dist); else th = 1.0;
    const fx = cx - f.dir * Math.cos(th) * dist, fy = cy + Math.sin(th) * dist;
    const ang = f.dir > 0 ? -th : Math.PI + th;
    const gd = Math.max(6, dist - 75), grip = [fx + Math.cos(ang) * gd, fy + Math.sin(ang) * gd];
    return { fx, fy, ang, len, fore: 1, grip, front: [fx + Math.cos(ang) * (dist + 34), fy + Math.sin(ang) * (dist + 34)], drag: dist >= h + 2 };
  };
  // upright(f, o): a long object carried upright before the figure (a banner pole, a staff) — grip with along(X, 150)
  K.upright = f => ({ fx: f.x + 18 * f.s, fy: f.y - 26, ang: -1.42, len: 1, fore: 1 });
  // along(X, d): the world point d px from the foot along the shaft (grip points)
  K.along = (cr, d) => [cr.fx + Math.cos(cr.ang) * d, cr.fy + Math.sin(cr.ang) * d];
  // lerpCross(a, b, k): in-between two placements (step k for the 12 fps look: Math.floor(k·3)/3)
  K.lerpCross = (a, b, k) => ({ ...b, fx: lerp(a.fx, b.fx, k), fy: lerp(a.fy, b.fy, k), ang: lerp(a.ang, b.ang, k), fore: lerp(a.fore ?? 1, b.fore ?? 1, k) });
  // byHead(H, a, len, fore): a cross placed by its head point H and direction a (foot → head)
  K.byHead = (H, a, len, fore) => ({ fx: H[0] - Math.cos(a) * len * K.D.L, fy: H[1] - Math.sin(a) * len * K.D.L, ang: a, len, fore });

  // ---------------------------------------------------------------- figures (rigid leaded pieces)
  // The default pilgrim: hooded robe, rope belt, profile face (almond eye, heavy lid). Colours col = { robe, robe2, hood }.
  K.ROBES = { me: { robe: '#9db0ae', robe2: '#7d908e', hood: '#53657a' }, green: { robe: '#2f6f3a', robe2: '#245a2f', hood: '#6b7a22' },
    murrey: { robe: '#632a63', robe2: '#4c2a5e', hood: '#7a4e24' }, olive: { robe: '#6b7a22', robe2: '#56621c', hood: '#2f6f86' } };
  // world point → the figure's local frame (feet at 0, facing +x, unit scale)
  function toLocal(f, P, bob) {
    const dx = (P[0] - f.x) / (f.s * f.dir), dy = (P[1] - f.y) / f.s, cs = Math.cos(-f.lean), sn = Math.sin(-f.lean);
    return [dx * cs - dy * sn, dx * sn + dy * cs - bob];
  }
  // profile(c, f): a pilgrim in profile, ≈ 267 px tall at s = 1 (world px). f = {
  //   x, y (feet), s (scale), dir (+1 faces right, −1 left; a value between — never 0 — squashes it across for a turn),
  //   lean (rad, + = forward), phase (walk phase, rad; advance by 2π per ≈ 2·amp·… px — see template), amp (stride px, 18),
  //   stand (no walk), crouch 0..1 (squash down: picking up, laying down), look 0..1 (eyes ahead → down), col, id (piece ids
  //   id … id+31), hand: world grip point for the near hand (null = hangs), elbowUp (near elbow up: reaching high),
  //   farHand: world point for the far arm (drawn behind the body), holding(c, wrist, angle, id): draw something held in
  //   the near hand between forearm and fist (a tool — e.g. the saw in ⑦), noArm / armOnly (split the draw so a held
  //   object can sit between body and near arm) }
  K.profile = function (c, f) {
    const sw = f.stand ? 0 : Math.sin(f.phase), amp = f.amp ?? 18, bob = f.stand ? 0 : -3 * Math.abs(Math.cos(f.phase)), cr = f.crouch || 0, id = f.id;
    c.save(); c.translate(f.x, f.y); c.scale(f.s * f.dir, f.s); c.rotate(f.lean); c.translate(0, bob); c.scale(1, 1 - .16 * cr);
    if (!f.armOnly) {
    if (f.farHand) {                         // the far arm reaches up to the beam in front of the shoulder (drawn behind the body)
      const T2 = toLocal(f, f.farHand, bob); T2[1] /= (1 - .16 * cr);
      const [E2, W2] = ik([-4, -196], T2, 52, 48, 1), a2 = Math.atan2(W2[1] - E2[1], W2[0] - E2[0]), dk = '#' + Pilot.mix(Pilot.hex(f.col.robe2), [20, 20, 30], .3).map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
      piece(c, limbP([-4, -196], E2, 22, 18), dk, id + 20, { lead: 4, mat: 7 });
      piece(c, limbP(E2, W2, 18, 23), dk, id + 21, { lead: 4, mat: 7 });
      piece(c, ellP(W2[0] + Math.cos(a2) * 7, W2[1] + Math.sin(a2) * 7, 10, 8.5, a2), '#9a684c', id + 22, { lead: 3.5, mat: 4 });
    }
    const foot = (dx, k) => piece(c, smoothP([[dx - 12, -1], [dx - 11, -11], [dx + 6, -13], [dx + 19, -7], [dx + 21, -1]]), C.shoe, id + k, { lead: 3.5, mat: 0, tex: false });
    foot(-amp * sw - 2, 1); foot(amp * sw + 2, 2);
    const h = 5 * sw;
    const robe = smoothP([[-14, -206], [8, -208], [22, -198], [27, -168], [26, -128], [32, -70], [38 + h, -13], [28 + h, -6], [2 + h * .6, -4], [-28 + h * .3, -6], [-38 - h * .5, -13], [-33, -70], [-29, -128], [-26, -180]]);
    piece(c, robe, f.col.robe, id + 3, { lead: 4.5, mat: 14, paint: q => {
      brush(q, [[2, -118], [4 + h * .4, -60], [8 + h, -10]], 4, INK2); brush(q, [[-14, -116], [-18, -60], [-22 - h * .3, -10]], 4, INK2);
      brush(q, [[14, -110], [20, -60], [26 + h, -14]], 3, INK2);
      q.fillStyle = 'rgba(46,26,10,.22)'; q.fillRect(-40, -206, 22, 210); } });            // matting on the back side
    piece(c, smoothP([[-30, -133], [27, -133], [28, -122], [-30, -122]], true, .2), '#4e3418', id + 4, { lead: 3.5, mat: 0, tex: false });
    // hood + face (profile): almond eye, heavy lid, brow flowing into the nose
    piece(c, smoothP([[-28, -196], [-31, -226], [-23, -253], [-4, -267], [14, -267], [26, -255], [29, -236], [23, -212], [10, -201]]), f.col.hood, id + 5, { lead: 4.5, mat: 10, paint: q => {
      brush(q, [[-20, -246], [-24, -224], [-22, -202]], 3, INK2); } });
    const look = f.look || 0;   // 0 ahead, 1 down
    piece(c, smoothP([[8, -253], [18, -255], [25, -248], [27, -240], [33, -233, 1], [27, -229], [27, -223], [22, -215], [13, -212], [7, -226]]), C.flesh, id + 6, { lead: 3.5, mat: 6, paint: q => {
      brush(q, [[12, -248], [19, -249.5], [26, -246], [30, -237]], 2.6);                    // brow → nose
      q.fillStyle = INK; q.beginPath(); q.ellipse(20, -240 + look * 1.5, 4.6, 2.3, look * .3, 0, TAU); q.fill();
      q.fillStyle = 'rgba(232,210,190,.9)'; q.beginPath(); q.ellipse(18.5, -240.3 + look * 1.5, 1.4, 1, 0, 0, TAU); q.fill();
      brush(q, [[14, -243.5 + look], [20, -245 + look], [25, -242.5 + look]], 2.4);           // heavy upper lid
      brush(q, [[21, -221], [26, -222.5]], 2.2); } });
    }
    if (f.noArm) { c.restore(); return; }
    // near arm: shoulder → elbow → wrist; the hand grips its target (or hangs)
    const Sh = [3, -194], T = f.hand ? toLocal(f, f.hand, bob) : [13, -108];
    if (f.hand) T[1] /= (1 - .16 * cr);
    const [E, Wr] = ik(Sh, T, 52, 48, f.elbowUp ? -1 : 1);
    piece(c, limbP(Sh, E, 23, 19), f.col.robe2, id + 7, { lead: 4, mat: 7 });
    piece(c, limbP(E, Wr, 19, 25), f.col.robe2, id + 8, { lead: 4, mat: 7 });
    const ha = Math.atan2(Wr[1] - E[1], Wr[0] - E[0]);
    if (f.holding) f.holding(c, Wr, ha, id);
    piece(c, ellP(Wr[0] + Math.cos(ha) * 7, Wr[1] + Math.sin(ha) * 7, 10, 8.5, ha), C.flesh, id + 9, { lead: 3.5, mat: 4, paint: q => {
      for (let k = -1; k <= 1; k++) brush(q, [[Wr[0] + Math.cos(ha) * 7 + Math.cos(ha + 1.57) * k * 4, Wr[1] + Math.sin(ha) * 7 + Math.sin(ha + 1.57) * k * 4], [Wr[0] + Math.cos(ha) * 14 + Math.cos(ha + 1.57) * k * 4, Wr[1] + Math.sin(ha) * 14 + Math.sin(ha + 1.57) * k * 4]], 1.6); } });
    c.restore();
  };
  // kneelGeo(f) → { R, Lh }: the two shoulder points (world) of a frontal kneeling body f = { x, y (knees), s }
  K.kneelGeo = f => { const sh = -112; return { R: [f.x - 30 * f.s, f.y + sh * f.s], Lh: [f.x + 30 * f.s, f.y + sh * f.s] }; };
  // kneelBody(c, f): a FRONTAL kneeling body hunched over work in front of it (eyes lowered); draw the arms with arm()
  // after whatever lies in front (so the hands are over it). f = { x, y (knees on the ground), s, col, id }
  K.kneelBody = function (c, f) {
    const id = f.id; c.save(); c.translate(f.x, f.y); c.scale(f.s, f.s);
    piece(c, smoothP([[-31, -118], [31, -118], [42, -80], [54, -10], [26, -2], [-26, -2], [-54, -10], [-42, -80]]), f.col.robe, id + 13, { lead: 4.5, mat: 14, paint: q => {
      brush(q, [[-10, -100], [-16, -50], [-24, -6]], 3.5, INK2); brush(q, [[10, -100], [16, -50], [24, -6]], 3.5, INK2); } });
    piece(c, smoothP([[-37, -72], [37, -72], [38, -61], [-38, -61]], true, .2), '#4e3418', id + 16, { lead: 3.5, mat: 0, tex: false });
    piece(c, ellP(0, -136, 26, 27), f.col.hood, id + 14, { lead: 4.5, mat: 9 });
    piece(c, smoothP([[0, -156], [13, -150], [16, -136], [11, -120], [0, -114], [-11, -120], [-16, -136], [-13, -150]]), C.flesh, id + 15, { lead: 3.5, mat: 6, paint: q => {
      for (const s of [-1, 1]) { brush(q, [[s * 2.5, -143], [s * 7, -145], [s * 12, -142.5]], 2.4);
        q.fillStyle = INK; q.beginPath(); q.ellipse(s * 7, -138.6, 3.6, 2, 0, 0, TAU); q.fill();
        brush(q, [[s * 2.5, -139.5], [s * 7, -141.2], [s * 11.5, -139]], 2.2); }
      brush(q, [[1.5, -142], [2.5, -131], [-1.5, -128]], 2); brush(q, [[-4, -122], [4, -122]], 2.2); } });
    c.restore();
  };
  // arm(c, Sh, T, s, col, id, down, hand = true): a free arm (world) from shoulder Sh to grip T, the fist drawn AT T
  // (ids id … id+2). down = 1 elbow low, −1 elbow high. → wrist point
  K.arm = function (c, Sh, T, s, col, id, down, hand = true) {
    const [E, Wr] = ik(Sh, T, 56 * s, 54 * s, down);
    piece(c, limbP(Sh, E, 23 * s, 19 * s), col, id, { lead: 4, mat: 7 });
    piece(c, limbP(E, Wr, 19 * s, 24 * s), col, id + 1, { lead: 4, mat: 7 });
    const ha = Math.atan2(Wr[1] - E[1], Wr[0] - E[0]);
    if (hand) piece(c, ellP(Wr[0] + Math.cos(ha) * 7 * s, Wr[1] + Math.sin(ha) * 7 * s, 10.5 * s, 8.5 * s, ha), C.flesh, id + 2, { lead: 3.5, mat: 4, paint: q => {
      for (let k = -1; k <= 1; k++) brush(q, [[Wr[0] + Math.cos(ha) * 8 * s + Math.cos(ha + 1.57) * k * 4, Wr[1] + Math.sin(ha) * 8 * s + Math.sin(ha + 1.57) * k * 4], [Wr[0] + Math.cos(ha) * 15 * s + Math.cos(ha + 1.57) * k * 4, Wr[1] + Math.sin(ha) * 15 * s + Math.sin(ha + 1.57) * k * 4]], 1.6); } });
    return Wr;
  };

  // ---------------------------------------------------------------- light (additive)
  // radial(c, x, y, r, stops, o): an additive radial light — stops [[offset, 'rgba(…)'], …]; o.r0 inner radius (0),
  // o.rect [x, y, w, h] to fill (default the circle's square), o.arc fills a circle instead
  const radial = K.radial = function (c, x, y, r, stops, o = {}) {
    c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, o.r0 || 0, x, y, r);
    for (const [k, col] of stops) g.addColorStop(k, col); c.fillStyle = g;
    if (o.arc) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); } else if (o.rect) c.fillRect(...o.rect); else c.fillRect(x - r, y - r, 2 * r, 2 * r);
    c.restore();
  };
  // doorLight(c, door, gl): light leaking out of a white-glass door (gl ≈ .55 resting, up to 1.2 as people go in)
  K.doorLight = (c, D, gl) => radial(c, D.x, D.base - 70, 330, [[0, `rgba(255,250,232,${.55 * gl})`], [.3, `rgba(255,236,200,${.22 * gl})`], [1, 'rgba(255,230,190,0)']],
    { r0: 10, rect: [D.x - 340, D.base - 420, 680, 640] });
  // haloAt(c, x, y, k, r = 170): warm light round a figure walking into the light (k 0..1)
  K.haloAt = (c, x, y, k, r = 170) => radial(c, x, y, r, [[0, `rgba(255,248,226,${.8 * k})`], [1, 'rgba(255,240,210,0)']]);
  // rubyGlow(c, x, y, k, r = 120): the accent glowing (ruby light)
  K.rubyGlow = (c, x, y, k, r = 120) => radial(c, x, y, r, [[0, `rgba(255,90,80,${.6 * k})`], [1, 'rgba(255,60,60,0)']]);
  // spark(c, x, y, k, s = 1): a weld spark — a small star that flares and fades over k 0..1 (pieces joining)
  K.spark = function (c, x, y, k, s = 1) {
    if (!(k > 0 && k < 1)) return; const a = Math.sin(k * Math.PI), R = (18 + 40 * k) * s;
    c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, `rgba(255,250,230,${a})`); g.addColorStop(.3, `rgba(255,200,140,${.5 * a})`); g.addColorStop(1, 'rgba(255,180,120,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill();
    c.strokeStyle = `rgba(255,248,225,${a})`; c.lineWidth = 2.5 * s; c.beginPath();
    for (let i = 0; i < 4; i++) { const an = i * Math.PI / 4 + .3; c.moveTo(x - Math.cos(an) * R * .9, y - Math.sin(an) * R * .9); c.lineTo(x + Math.cos(an) * R * .9, y + Math.sin(an) * R * .9); }
    c.stroke(); c.restore();
  };
  // lightFlow(c, X, t0, t, tint): light pours along a cross/beam X from its head end (a bright band runs down it in .45 s
  // from t0), then a residual glow of `tint` ('r,g,b')
  K.lightFlow = function (c, cr, t0, t, tint = '255,226,170') {
    const { L, CB, CBW, BW } = K.D;
    const q = (t - t0) / .45; if (q < 0) return;
    c.save(); c.translate(cr.fx, cr.fy); c.rotate(cr.ang); c.globalCompositeOperation = 'lighter';
    const Lx = cr.len * L, f = cr.fore ?? 1, bx = Lx - CB;
    c.beginPath(); c.rect(0, -BW / 2, Lx, BW); if (!cr.noBar) c.rect(bx - BW / 2, -CBW / 2 * f, BW, CBW * f);
    if (q < 1.2) { const x = Lx * (1 - q), g = c.createLinearGradient(x - 90, 0, x + 90, 0);
      g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.5, 'rgba(255,244,214,.85)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.fill(); }
    c.fillStyle = `rgba(${tint},${.2 * ss(0, 1, q)})`; c.fill();
    c.restore();
  };

  // ---------------------------------------------------------------- the hit: cracks in the window, a shattering piece
  // cracks(origin, seed = 91, n = 7): crack polylines radiating from a screen point (some branch). Build once (init).
  K.cracks = function (O, seed = 91, n = 7) {
    const r = rng(seed), out = [];
    for (let i = 0; i < n; i++) { let a = -Math.PI * .95 + i / (n - 1) * Math.PI * 1.9 + (r() - .5) * .3, p = [...O], pts = [p], len = 0; const max = 150 + r() * 220;
      while (len < max) { a += (r() - .5) * .7; const s = 26 + r() * 34; p = [p[0] + Math.cos(a) * s, p[1] + Math.sin(a) * s]; pts.push(p); len += s; }
      out.push({ pts, len });
      if (i % 3 === 1) { const j = 2 + Math.floor(r() * (pts.length - 3)); let q = pts[j], b = a + (r() > .5 ? .9 : -.9), bp = [q], bl = 0;
        while (bl < 90) { b += (r() - .5) * .6; const s = 22 + r() * 20; q = [q[0] + Math.cos(b) * s, q[1] + Math.sin(b) * s]; bp.push(q); bl += s; } out.push({ pts: bp, len: bl, delay: .08 }); } }
    out.origin = O; return out;
  };
  function crackPath(cr, frac) {
    const p = new Path2D(); let left = cr.len * frac; p.moveTo(cr.pts[0][0], cr.pts[0][1]);
    for (let i = 1; i < cr.pts.length && left > 0; i++) { const a = cr.pts[i - 1], b = cr.pts[i], s = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.min(1, left / s);
      p.lineTo(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k); left -= s; }
    return p;
  }
  // drawCracks(c, cracks, t, {at, heal: [t0, t1], end}): screen space, after the panel. From `at` the cracks race out
  // (.26 s) as light (hot for .6 s, then calmer), with a white flash at the origin; they fade out over `heal`.
  K.drawCracks = function (c, CR, t, o) {
    const CRASH = o.at, O = CR.origin; if (t < CRASH) return;
    if (t > (o.end ?? o.heal[1] + .2)) return; const mend = 0, gone = 1 - ss(o.heal[0], o.heal[1], t), hot = 1 - ss(CRASH + .12, CRASH + .6, t), calm = (1 - .55 * ss(CRASH + .5, CRASH + 1.6, t)) * gone;
    c.save(); c.beginPath(); c.rect(PX0, PY0, PX1 - PX0, PY1 - PY0); c.clip(); c.lineCap = 'round'; c.lineJoin = 'round';
    for (const cr of CR) { const p = crackPath(cr, eo((t - CRASH - (cr.delay || 0)) / .26));
      if (mend < 1) { c.globalCompositeOperation = 'lighter';
        c.strokeStyle = `rgba(255,248,230,${(.12 + .25 * hot) * (1 - mend) * calm})`; c.lineWidth = 6 + 8 * hot; c.stroke(p);
        c.strokeStyle = `rgba(255,252,240,${(.5 + .5 * hot) * (1 - mend) * calm})`; c.lineWidth = 2.2; c.stroke(p); c.globalCompositeOperation = 'source-over'; }
      if (mend > 0) { c.globalAlpha = mend * .85; c.strokeStyle = LEAD; c.lineWidth = 3.2; c.stroke(p); c.globalAlpha = 1; } }
    const fl = 1 - ss(CRASH, CRASH + .3, t);                                                     // the flash from the break
    if (fl > 0) { c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(O[0], O[1], 0, O[0], O[1], 520);
      g.addColorStop(0, `rgba(255,250,235,${.9 * fl})`); g.addColorStop(.35, `rgba(255,240,220,${.35 * fl})`); g.addColorStop(1, 'rgba(255,240,220,0)');
      c.fillStyle = g; c.fillRect(PX0, PY0, PX1 - PX0, PY1 - PY0); }
    c.restore();
  };
  // shards(len, seed = 44, o = {bar: true}): a cross/beam of length len (fraction of D.L) cut into triangles that can
  // shatter (crossbar foreshortened .32 = lying). Build once.
  K.shards = function (len, seed = 44, o = {}) {
    const { L, CB, CBW, BW } = K.D;
    const r = rng(seed), Lx = len * L, cols = 8, T = [], Bt = [];
    for (let i = 0; i <= cols; i++) { const x = Lx * i / cols + (i && i < cols ? (r() - .5) * 12 : 0); T.push([x, -BW / 2]); Bt.push([x + (i && i < cols ? (r() - .5) * 12 : 0), BW / 2]); }
    const tri = []; for (let i = 0; i < cols; i++) { tri.push([T[i], T[i + 1], Bt[i]]); tri.push([T[i + 1], Bt[i + 1], Bt[i]]); }
    const cx = Lx - CB, h = CBW / 2 * (o.fore ?? .32); if (o.bar !== false) tri.push([[cx - BW / 2, -h], [cx + BW / 2, -h], [cx, 0]], [[cx - BW / 2, h], [cx + BW / 2, h], [cx, 0]]);
    return tri.map((pts, i) => ({ pts, c: [(pts[0][0] + pts[1][0] + pts[2][0]) / 3, (pts[0][1] + pts[1][1] + pts[2][1]) / 3], vx: -40 + r() * 220, vy: -320 * r() + 20, sp: (r() - .5) * 14, id: 1000 + i }));
  };
  // shatter(c, shards, X, u, o): the shards of X (placement {fx, fy, ang}) flying and falling u s after the break, darkening
  // as they fall (o.fade [y0, y1] world, o.col, o.dark), clipped to o.clip [x, y, w, h] (the void they fall into)
  K.shatter = function (c, SH, P, u, o = {}) {
    const cs = Math.cos(P.ang), sn = Math.sin(P.ang), [f0, f1] = o.fade || [1450, 1850];
    c.save(); if (o.clip) { c.beginPath(); c.rect(...o.clip); c.clip(); }
    for (const sh of SH) { const wx = P.fx + sh.c[0] * cs - sh.c[1] * sn, wy = P.fy + sh.c[0] * sn + sh.c[1] * cs;
      const x = wx + sh.vx * u, y = wy + sh.vy * u + .5 * 2300 * u * u; if (y > (o.maxY ?? 2000)) continue;
      c.save(); c.translate(x, y); c.rotate(P.ang + sh.sp * u); c.translate(-sh.c[0], -sh.c[1]);
      const dk = ss(f0, f1, y); c.globalAlpha = 1 - dk * .9;
      piece(c, polyP(sh.pts), dk > .5 ? (o.dark || C.rubyDim) : (o.col || C.ruby), sh.id, { lead: 2.5, mat: 0, ts: .5 }); c.restore(); }
    c.restore();
  };
  // breakFlash(c, x, y, fl, r = 260): the ruby-white flash where the accent broke (fl 1 → 0)
  K.breakFlash = (c, x, y, fl, r = 260) => { if (fl > 0) radial(c, x, y, r, [[0, `rgba(255,236,220,${.95 * fl})`], [.25, `rgba(255,70,60,${.6 * fl})`], [1, 'rgba(255,40,40,0)']]); };

  // ---------------------------------------------------------------- camera, frame passes, words
  // camKeys(keys, t): keyframed camera; keys = [[t, x, y, z, ease?], …] (ease into that key, default eio) → { x, y, z }
  K.camKeys = function (KK, t) {
    let i = 0; while (i < KK.length - 2 && t > KK[i + 1][0]) i++;
    const a = KK[i], b = KK[i + 1], k = (b[4] || eio)(clamp((t - a[0]) / (b[0] - a[0])));
    return { x: lerp(a[1], b[1], k), y: lerp(a[2], b[2], k), z: lerp(a[3], b[3], k) };
  };
  // shake(cm, t, at, dx = [11, −9, 6], dy = [−8, 7, −4]): a stepped shake for a few frames from `at` (the hit)
  K.shake = (cm, t, at, dx = [11, -9, 6], dy = [-8, 7, -4]) => { if (t >= at && t < at + .07) { const fr = Math.floor((t - at) * 30); cm.x += dx[fr] || 0; cm.y += dy[fr] || 0; } return cm; };
  // toScreen(cam, x, y): world → screen (for screen-space effects like cracks)
  K.toScreen = (cm, x, y) => [540 + (x - cm.x) * cm.z, 1100 + (y - cm.y) * cm.z];
  // begin(ctx): the sky quarries (first thing every frame)
  K.begin = ctx => { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(SKY, 0, 0); };
  // panel(ctx, cam, paint): the living panel — clipped to the picture field, world transform from cam; paint(ctx) draws
  // the world in world px. Everything that moves goes here.
  K.panel = function (ctx, cm, paint) {
    ctx.save(); ctx.beginPath(); ctx.rect(PX0, PY0, PX1 - PX0, PY1 - PY0); ctx.clip();
    ctx.translate(540, 1100); ctx.scale(cm.z, cm.z); ctx.translate(-cm.x, -cm.y);
    const r = paint(ctx);
    ctx.restore(); return r;
  };
  // bloom(ctx, amt): the glass glows — the brightest panes bleed light (small buffers, ≈ 3 ms)
  K.bloom = function (ctx, amt) {
    const src = ctx.canvas;
    BL1.ctx.globalCompositeOperation = 'copy'; BL1.ctx.filter = 'none'; BL1.ctx.drawImage(src, 0, 0, BL1.width, BL1.height);
    BL1.ctx.globalCompositeOperation = 'multiply'; BL1.ctx.drawImage(BL1, 0, 0); BL1.ctx.drawImage(BL1, 0, 0);   // keep only the bright glass
    BL2.ctx.globalCompositeOperation = 'copy'; BL2.ctx.filter = 'blur(3px)'; BL2.ctx.drawImage(BL1, 0, 0);
    BL3.ctx.globalCompositeOperation = 'copy'; BL3.ctx.filter = 'blur(5px)'; BL3.ctx.drawImage(BL1, 0, 0, BL3.width, BL3.height);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = .7 * amt; ctx.drawImage(BL2, 0, 0, W, H); ctx.globalAlpha = .55 * amt; ctx.drawImage(BL3, 0, 0, W, H); ctx.restore();
  };
  // glaze(ctx, dim = 1, o): after the panel — light through the window (brightest mid-lancet, falling off to the lead
  // border; dim < 1 = a cloud / grief), the stone frame and border, bloom, and the inscription band on top (never glared).
  //   o.shade (t → 0..1) optional extra: a cloud shadow sweeping across (see cloud())
  K.glaze = function (ctx, dim = 1) {
    { const g = ctx.createRadialGradient(540, 1180, 220, 540, 1180, 1050), v = Math.round(255 * dim), e = Math.round(140 * dim);
      g.addColorStop(0, `rgb(${v},${v},${v})`); g.addColorStop(1, `rgb(${e},${e},${e + 18})`);
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(PX0, PY0, PX1 - PX0, PY1 - PY0); ctx.restore(); }
    ctx.drawImage(FRAME, 0, 0);
    K.bloom(ctx, 1);
    ctx.drawImage(BANDC, 0, 0);
  };
  // cloud(ctx, t, o): ambient — a soft cloud shadow drifting across the window (multiply, before glaze). o.speed px/s (40),
  // o.depth (.22), o.w band width (520), o.at phase offset s
  K.cloud = function (ctx, t, o = {}) {
    const w = o.w ?? 520, x = -w + ((t + (o.at ?? 0)) * (o.speed ?? 40)) % (W + 2 * w), d = o.depth ?? .22;
    const g = ctx.createLinearGradient(x, 0, x + w, 0), v = Math.round(255 * (1 - d));
    g.addColorStop(0, '#fff'); g.addColorStop(.5, `rgb(${v},${v},${v + 8})`); g.addColorStop(1, '#fff');
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(PX0, PY0, PX1 - PX0, PY1 - PY0); ctx.restore();
  };
  const FIT = new Map();
  function srcFit(ctx, s) { if (!FIT.has(s)) { ctx.save(); ctx.font = `400 28px ${K.SANS}`; ctx.letterSpacing = '1px'; FIT.set(s, Math.min(1, 800 / ctx.measureText(Pilot.tr(s)).width)); ctx.restore(); } return FIT.get(s); }
  // captionY(line): where a caption sits in the inscription band (one line lower, a source line pushes it up)
  K.captionY = line => { const two = line[2].includes('\n'); return line[3] ? 418 : two ? 432 : 478; };
  // captions(ctx, t, lines): words painted on the white-glass band in dark grisaille brown (Noto Serif); a source line
  // under them is shrunk to fit the band. Draw after glaze().
  K.captions = function (ctx, t, lines) {
    const CO = { font: K.SERIF, srcFont: K.SANS, color: '#2a160a', srcColor: '#4d3219', shadow: 'rgba(255,250,236,.7)', shadowBlur: 6 };
    for (const ln of lines) {
      Story.captions(ctx, t, [[ln[0], ln[1], ln[2]]], { ...CO, y: K.captionY(ln) });
      if (ln[3]) { const ys = 562, k = srcFit(ctx, ln[3]); ctx.save(); ctx.translate(540, ys); ctx.scale(k, k); ctx.translate(-540, -ys);
        Story.captions(ctx, t, [[ln[0], ln[1], '', ln[3]]], { ...CO, y: ys - 76 }); ctx.restore(); }
    }
  };
  // endCard(ctx, t, card, at, o): a cloud covers the sun — every pane goes unlit — and the card is painted on a white-glass
  // plate (in within .5 s). o overrides Story.endCard options.
  K.endCard = function (ctx, t, card, at, o = {}) {
    const u = ss(at, at + .45, t);
    if (u <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = Pilot.rgb(Pilot.mix([255, 255, 255], [62, 70, 96], u)); ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(52,56,72,${.35 * u})`; ctx.fillRect(PX0, PY0 - 280, PX1 - PX0, PY1 - PY0 + 280); ctx.restore();
    const lit = ss(at + .1, at + .5, t);
    ctx.save(); ctx.globalAlpha = lit; ctx.drawImage(PLATE, 0, 0); ctx.restore();
    Story.endCard(ctx, t, card, at, { font: K.SERIF, srcFont: K.SANS, color: '#2a160a', srcColor: '#4d3219', titleShadow: 'rgba(255,250,236,.6)', ...o });
  };

  window.Glass = K;
})();

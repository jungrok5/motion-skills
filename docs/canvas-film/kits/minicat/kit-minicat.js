/* kit-minicat.js — minimal line + flat blue (미니멀 선화 · 코발트 블루 · 잠옷 고양이), a word-log house style.  Global: window.MiniCat
   One flat cornflower-blue field with a faint paper tooth, a thin steady black hand line (a fixed tremor, no boil), flat
   pale fills, small white cats in pyjamas, a sky of moon + lavender cloud blobs + star specks, a long ledge of shallow water
   (a light band with a firm ink front edge) over open water with lavender reflections and broken ripple arcs (every
   footfall rings), and ONE warm thing (honey) plus the warm light of a doorway. Captions in the hand font Hi Melody.
   Load after lib.js and story.js:  <script src="lib.js"></script><script src="story.js"></script><script src="kit-minicat.js"></script>
   Units: world px (the frame is 1080×1920 at zoom 1; the camera is { x, y, z } = the world point at the frame centre).
   Pure and deterministic: the only state is the textures built by init() and the current line scale (setCam sets it);
   seeded randomness only, any seek order. No network, no images.
   Worked example: sermons/2026-10-24-cross-styles/film/scenes/cs-minicat.html (잘라 낸 건 다리였다 · 09). */
(function () {
  const { clamp, lerp, ss, eo, eio, rng, noise } = Pilot;
  const K = {}, W = 1080, H = 1920, TAU = Math.PI * 2;
  K.W = W; K.H = H; K.TAU = TAU;

  // ---------------- palette & type ----------------
  // field blue, lavender clouds, the ink line, white/cream cats ("me"), grey-lavender cats (the others), honey = the ONE accent.
  K.C = { field: '#5680bd', lav: '#7c91c8', lavL: '#a9b2d4', moon: '#b3b9c9', ink: '#1a1c28', white: '#fbfcfd', cream: '#f2e8c6', cream2: '#e3d8b4',
    refl: '#8d9bcb', refl2: '#a7afd0', reflW: '#b7ab93',
    pBody: '#dfe2ec', pCloth: '#b9c1dc', pCloth2: '#a6afd0', pX: '#c7cce2', pXf: '#a3abcf',
    honey: '#f1c35a', honeyF: '#cf9a3a', rift: '#2a3d70', rift2: '#16213f', wall: '#3b5291', saw: '#dde1ec', handle: '#d9c39a', light: '#fff3d2' };
  const C = K.C;
  K.ACCENT = C.honey;                                         // the one warm thing (a wooden object, a seed, a flame)
  K.HONEY = { f: C.honey, face: C.honeyF };                   // fill + side face for a warm wooden prop
  K.GREYWOOD = { f: C.pX, face: C.pXf };                      // the same prop when it belongs to someone else
  K.HAND = "'Hi Melody',cursive";
  // pass to Pilot.run({ fonts: MiniCat.FONTS })
  K.FONTS = ["400 80px 'Hi Melody'", "500 28px 'Noto Sans KR'"];
  // the Google Fonts link a scene needs in <head>
  K.FONT_LINK = 'https://fonts.googleapis.com/css2?family=Hi+Melody&family=Noto+Sans+KR:wght@500&display=swap';

  // ---------------- small helpers ----------------
  K.t12 = t => Math.floor(t * 12 + 1e-6) / 12;              // figures act on twos (12 drawings/s); camera and water on ones
  K.frac = x => x - Math.floor(x);
  K.lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const frac = K.frac, lerp2 = K.lerp2;
  let LW = 1;   // 1 / zoom: the hand line stays ~3 px on screen at any zoom (setCam sets it)
  Object.defineProperty(K, 'LW', { get: () => LW });
  K.setLW = v => { LW = v; };

  // ---------------- hand line (steady: a fixed tremor, no boil) ----------------
  // wob(p, a): a point nudged by a fixed noise field (±0.8 px × a) — the same point always wobbles the same way.
  const wob = K.wob = (p, a = 1) => [p[0] + (noise(p[0] * .05 + 40, p[1] * .05) - .5) * 1.6 * a, p[1] + (noise(p[0] * .05, p[1] * .05 + 90) - .5) * 1.6 * a];
  // chaikin(pts, closed, it): corner-cutting smoothing (rounded hand shapes from a few control points)
  function chaikin(pts, closed, it = 3) {
    for (let r = 0; r < it; r++) { const o = [], n = pts.length, m = closed ? n : n - 1; if (!closed) o.push(pts[0]);
      for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % n]; o.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); }
      if (!closed) o.push(pts[n - 1]); pts = o; }
    return pts;
  }
  K.chaikin = chaikin;
  // resample(pts, closed, step px): evenly spaced points along the outline
  function resample(pts, closed, step = 10) {
    const o = [], n = pts.length, m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % n], d = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(d / step));
      for (let j = 0; j < k; j++) o.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]); }
    if (!closed) o.push(pts[n - 1]); return o;
  }
  K.resample = resample;
  // pathOf(pts, closed): a Path2D through the points
  function pathOf(pts, closed = true) { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); if (closed) p.closePath(); return p; }
  K.pathOf = pathOf;
  // inkPts(pts, o): control points → the hand-drawn outline points (smooth unless o.smooth === false; o.it, o.step, o.amp)
  function inkPts(pts, o = {}) { const closed = o.closed !== false, sm = o.smooth !== false && pts.length > 2;
    return resample(sm ? chaikin(pts, closed, o.it ?? 3) : pts, closed, o.step || 9).map(p => wob(p, o.amp ?? 1)); }
  K.inkPts = inkPts;
  // stroke(ctx, path, { lw px on screen = 3, col = ink })
  function stroke(ctx, path, o) { ctx.strokeStyle = o.col || C.ink; ctx.lineWidth = (o.lw || 3) * LW; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(path); }
  K.stroke = stroke;
  // ink(ctx, pts, o): THE drawing call — a hand shape from control points: o.fill (flat colour), o.lw (0 = no line), o.col,
  // o.closed (default true), o.smooth, o.part = [from, to] (0..1 along the outline: line only on that stretch). Returns the path.
  function ink(ctx, pts, o = {}) {
    const closed = o.closed !== false, P = inkPts(pts, o), path = pathOf(P, closed);
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(path); }
    if (o.lw !== 0) {
      if (o.part) { const n = P.length, a = Math.floor(o.part[0] * n), b = Math.floor(o.part[1] * n), q = []; for (let i = a; i <= b; i++) q.push(P[((i % n) + n) % n]); stroke(ctx, pathOf(q, false), o); }
      else stroke(ctx, path, o); }
    return path;
  }
  K.ink = ink;
  // shape(pts, o): a static ink shape built once → { fill path, line path }; drawShape(ctx, s) draws it (cheap per frame)
  function shape(pts, o = {}) { const closed = o.closed !== false, P = inkPts(pts, o), f = pathOf(P, closed); let l = f;
    if (o.part) { const n = P.length, a = Math.floor(o.part[0] * n), b = Math.floor(o.part[1] * n), q = []; for (let i = a; i <= b; i++) q.push(P[((i % n) + n) % n]); l = pathOf(q, false); }
    return { f, l, fill: o.fill, lw: o.lw ?? 3, col: o.col }; }
  function drawShape(ctx, s) { if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(s.f); } if (s.lw) stroke(ctx, s.l, { lw: s.lw, col: s.col }); }
  K.shape = shape; K.drawShape = drawShape;
  // ell(cx, cy, rx, ry, n, a0): ellipse control points;  tube(line, widths): a limb outline around a polyline (half-widths per point)
  const ell = K.ell = (cx, cy, rx, ry, n = 24, a0 = 0) => { const o = []; for (let i = 0; i < n; i++) { const a = a0 + i / n * TAU; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };
  function tube(line, wd) {
    const L = [], R = [];
    for (let i = 0; i < line.length; i++) { const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      L.push([line[i][0] - dy * wd[i], line[i][1] + dx * wd[i]]); R.push([line[i][0] + dy * wd[i], line[i][1] - dx * wd[i]]); }
    return L.concat(R.reverse());
  }
  K.tube = tube;
  // blobPts(cx, cy, rx, ry, seed, n): a soft lumpy blob (clouds, reflections, bushes)
  function blobPts(cx, cy, rx, ry, seed, n = 18) { const r = rng(seed), o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, k = .72 + r() * .5 + .18 * Math.sin(a * 3 + seed);
    o.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k * (.8 + .4 * r())]); } return o; }
  K.blobPts = blobPts;
  // arc(ctx, cx, cy, rx, ry, a0, a1, lw, col): a broken elliptical arc (ripples, rings)
  function arc(ctx, cx, cy, rx, ry, a0, a1, lw = 2.6, col = C.ink) {
    const pts = []; for (let i = 0; i <= 18; i++) { const a = a0 + (a1 - a0) * i / 18; pts.push(wob([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry])); }
    stroke(ctx, pathOf(pts, false), { lw, col });
  }
  K.arc = arc;

  // ---------------- the cat (any pose) ----------------
  // F = { x, gy (ground y), f (+1 faces right), lean (rad, forward), head (rad, + = nods down, − = looks up), bob, crouch (px),
  //       sq (turn squash 0.58..1), feet: [far, near] world points, hands: [far, near] world points or null (= hanging),
  //       face: 'calm'|'strain'|'down'|'happy'|'shock'|'look', pal: { body, c1 (pyjama), c2 (far-side pyjama) }, alpha,
  //       strap: 'hold'|'wrap'|null (a strap over the near shoulder for a carried load), grip (thumb over a handle in the near paw),
  //       back(Fr) / mid(Fr) / front(Fr): callbacks drawn behind everything / between body and near arm / over everything }
  // Arms are 2-bone IK from fixed shoulders with fixed bone lengths (27·CS each) and the paw drawn AT the hand point;
  // legs are 2-bone IK from the hip to the given foot. Far arm/leg is drawn behind the body, near ones in front.
  const CS = K.CS = 1.3;                                       // every cat is drawn at the lab's size (~230 px to the ear tips)
  K.MEPAL = { body: C.white, c1: C.cream, c2: C.cream2 };      // me: white cat, cream pyjamas
  K.PILPAL = { body: C.pBody, c1: C.pCloth, c2: C.pCloth2 };   // the others: paler grey-lavender
  // frameOf(F): the body frame — hip point, TF(u, v) torso-local → world (u forward, v up, in cat units), HF(u, v) head-local,
  // hc (head centre). Use TF/HF to hang props on a cat (a strap end, a hat).
  function frameOf(F) {
    const a = F.lean || 0, f = F.f, up = [f * Math.sin(a), -Math.cos(a)], fw = [f * Math.cos(a), Math.sin(a)];
    const hip = [F.x, F.gy - (46 + (F.bob || 0) - (F.crouch || 0)) * CS];
    const TF = (u, v) => [hip[0] + (u * fw[0] + v * up[0]) * CS, hip[1] + (u * fw[1] + v * up[1]) * CS];
    const ha = a * .5 + (F.head || 0), hu = [f * Math.sin(ha), -Math.cos(ha)], hf = [f * Math.cos(ha), Math.sin(ha)];
    const nk = TF(6, 80), hc = [nk[0] + (hu[0] * 50 + hf[0] * 6) * CS, nk[1] + (hu[1] * 50 + hf[1] * 6) * CS];
    const HF = (u, v) => [hc[0] + (u * hf[0] + v * hu[0]) * CS, hc[1] + (u * hf[1] + v * hu[1]) * CS];
    return { hip, TF, HF, hc, up, fw, f, a };
  }
  K.frameOf = frameOf;
  // ik(root, target, l1, l2, bend ±1) → the middle joint (elbow/knee); the target is clamped to reach, bones never stretch
  function ik(h, ft, l1, l2, bend) {
    const dx = ft[0] - h[0], dy = ft[1] - h[1], d = Math.max(1, Math.min(Math.hypot(dx, dy), l1 + l2 - .5)), a = Math.atan2(dy, dx);
    const al = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    return [h[0] + Math.cos(a - bend * al) * l1, h[1] + Math.sin(a - bend * al) * l1];
  }
  K.ik = ik;
  const TORSO = [[-36, -8], [-40, 36], [-34, 70], [-14, 82], [16, 82], [34, 70], [42, 36], [40, -8], [0, -12]];
  const HEAD = [[-54, -10], [-56, 14], [-52, 34], [-46, 62], [-30, 44], [0, 46], [24, 46], [44, 64], [52, 34], [58, 12], [56, -12], [38, -34], [0, -40], [-36, -34]];
  const COLLAR = [[-30, 8], [-12, -4], [0, 6], [14, -4], [32, 8], [14, 20], [0, 12], [-14, 20]];
  // armOf(Fr, F, near) → { sh, el, hand }: the shoulder, the IK elbow, the hand (F.hands[...] or the hanging rest point)
  function armOf(Fr, F, near) {
    const { TF, f } = Fr, sh = near ? TF(-8, 64) : TF(4, 66);
    let hand = F.hands && F.hands[near ? 1 : 0];
    if (!hand) hand = near ? TF(6, 16) : TF(14, 18);
    const el = ik(sh, hand, 27 * CS, 27 * CS, -f);
    return { sh, el, hand };
  }
  K.armOf = armOf;
  // the reach of an arm (shoulder → paw), px: keep grip points inside it or the paw stops short of them
  K.ARM_REACH = 54 * CS;
  function drawArm(ctx, Fr, F, near, col) {
    const { sh, el, hand } = armOf(Fr, F, near), d = [hand[0] - el[0], hand[1] - el[1]], n = Math.hypot(...d) || 1;
    ink(ctx, tube([sh, el, hand, [hand[0] + d[0] / n * 5 * CS, hand[1] + d[1] / n * 5 * CS]], [13 * CS, 12 * CS, 11 * CS, 8 * CS]), { fill: col, lw: 2.8 });
    ink(ctx, ell(hand[0] + d[0] / n * 4, hand[1] + d[1] / n * 4, 8.5 * CS, 7.5 * CS, 12), { fill: F.pal.body, lw: 2.4 });
    if (near && F.grip) {   // the thumb over the handle
      const q = [hand[0] - d[1] / n * 4 * CS * Fr.f, hand[1] + d[0] / n * 4 * CS * Fr.f];
      ink(ctx, [[q[0] - 5 * CS, q[1] - 3 * CS], [q[0] + 2 * CS, q[1] - 5 * CS], [q[0] + 7 * CS, q[1] - 1 * CS]], { closed: false, lw: 2 });
    }
  }
  K.drawArm = drawArm;
  // drawCat(ctx, F): the whole cat in its pose (see F above)
  function drawCat(ctx, F) {
    const al = F.alpha ?? 1; if (al <= 0) return; if (!F.pal) F.pal = K.MEPAL;
    ctx.save(); ctx.globalAlpha *= al;
    if (F.sq != null && F.sq < .999) { ctx.translate(F.x, 0); ctx.scale(F.sq, 1); ctx.translate(-F.x, 0); }   // mid-turn: squashed toward a front view
    const Fr = frameOf(F), { hip, TF, HF, f } = Fr, P = F.pal;
    if (F.back) F.back(Fr);
    drawArm(ctx, Fr, F, false, P.c2);
    for (const [i, dx, col] of [[0, -8, P.c2], [1, 6, P.c1]]) {
      const ft = F.feet[i], hp = [hip[0] + dx * f * CS, hip[1]], ank = [ft[0] + dx * .6 * f * CS, ft[1] - 8 * CS], kn = ik(hp, ank, 25 * CS, 25 * CS, f);
      ink(ctx, ell(ank[0] + 3 * f * CS, ank[1] + 2 * CS, 13 * CS, 8 * CS, 14), { fill: P.body, lw: 2.8 });
      ink(ctx, tube([[hp[0], hp[1] - 10 * CS], kn, [ank[0], ank[1] - 2 * CS]], [17 * CS, 16 * CS, 14 * CS]), { fill: col, lw: 2.8 });
    }
    ink(ctx, TORSO.map(q => TF(q[0], q[1])), { fill: P.c1 });
    if (F.strap) {   // the strap that holds a load on the back, over the near shoulder
      const s = F.strap === 'hold' ? [TF(-34, 72), TF(-6, 86), TF(20, 78), TF(28, 52), TF(22, 24)] : [TF(-34, 72), TF(-6, 86), TF(20, 78), TF(30, 50), TF(30, 22), TF(18, 4)];
      ink(ctx, s, { closed: false, lw: 9, col: C.ink }); ink(ctx, s, { closed: false, lw: 4.6, col: '#f7f1df' });
    }
    ctx.fillStyle = P.c1; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8 * LW;
    for (const v of [24, 48]) { const q = TF(30, v); ctx.beginPath(); ctx.arc(q[0], q[1], 3.6 * CS, 0, TAU); ctx.fill(); ctx.stroke(); }
    ink(ctx, COLLAR.map(q => TF(q[0] + 4, q[1] + 78)), { fill: P.body, lw: 2.6 });
    ink(ctx, HEAD.map(q => HF(q[0], q[1])), { fill: P.body });
    ink(ctx, [HF(-36, 38), HF(-30, 28)], { closed: false, lw: 2.2 }); ink(ctx, [HF(30, 38), HF(26, 28)], { closed: false, lw: 2.2 });
    face(ctx, Fr, F.face || 'calm');
    if (F.mid) F.mid(Fr);
    drawArm(ctx, Fr, F, true, P.c1);
    if (F.front) F.front(Fr);
    ctx.restore();
  }
  K.drawCat = drawCat;
  // face(ctx, Fr, kind): dot eyes + tiny mouth + whiskers; kinds as in F.face
  function face(ctx, Fr, fc) {
    const { HF } = Fr; ctx.fillStyle = C.ink;
    const dot = (u, v, r = 1) => { const e = HF(u, v); ctx.beginPath(); ctx.ellipse(e[0], e[1], 3.6 * CS * r, 4.4 * CS * r, 0, 0, TAU); ctx.fill(); };
    if (fc === 'strain') for (const u of [-6, 30]) ink(ctx, [HF(u - 6, -7), HF(u, -10), HF(u + 6, -7)], { closed: false, lw: 2.4 });
    else if (fc === 'down') for (const u of [-6, 30]) ink(ctx, [HF(u - 6, -6), HF(u, -9), HF(u + 6, -6)], { closed: false, lw: 2.4 });
    else if (fc === 'happy') for (const u of [-6, 30]) ink(ctx, [HF(u - 6, -8), HF(u, -2), HF(u + 6, -8)], { closed: false, lw: 2.4 });
    else for (const u of [-6, 30]) dot(u, -2, fc === 'shock' ? 1.2 : 1);
    // worried brows on strain / shock / down
    if (fc === 'strain' || fc === 'down' || fc === 'shock') { ink(ctx, [HF(-12, 14), HF(-4, 18)], { closed: false, lw: 2 }); ink(ctx, [HF(26, 18), HF(34, 14)], { closed: false, lw: 2 }); }
    const mo = HF(13, -18);
    if (fc === 'shock' || fc === 'look') { ctx.beginPath(); ctx.ellipse(mo[0], mo[1], (fc === 'shock' ? 3.6 : 2.8) * CS, (fc === 'shock' ? 4.6 : 3.4) * CS, 0, 0, TAU); ctx.fill(); }
    else if (fc === 'happy') ink(ctx, [HF(8, -16), HF(13, -21), HF(18, -16)], { closed: false, lw: 2 });
    else ink(ctx, [HF(9, -18), HF(13, -20), HF(17, -18)], { closed: false, lw: 2 });
    for (const s of [-1, 1]) { const o = s < 0 ? HF(-46, -12) : HF(52, -10), dx = s * Fr.f;
      ink(ctx, [o, [o[0] + dx * 26 * CS, o[1] - 4 * CS]], { closed: false, lw: 1.8 }); ink(ctx, [[o[0], o[1] + 6 * CS], [o[0] + dx * 24 * CS, o[1] + 10 * CS]], { closed: false, lw: 1.8 }); }
  }
  K.face = face;
  // drawCatRefl(ctx, F, waterY): the cat's reflection in the water under a ledge whose front edge is at waterY —
  // the figure flipped about that line, simplified into two lavender blobs with half outlines
  function drawCatRefl(ctx, F, waterY) {
    const al = (F.alpha ?? 1) * .6; if (al <= 0) return;
    ctx.save(); ctx.globalAlpha *= al; ctx.translate(0, 2 * waterY + 4 + (waterY - F.gy) * .0); ctx.scale(1, -1);
    const Fr = frameOf(F), { TF, HF } = Fr;
    ink(ctx, tube([TF(-6, 2), TF(-6, -34)], [24 * CS, 22 * CS]), { fill: C.refl2, lw: 0 });
    ink(ctx, [[-40, 0], [-44, 50], [-36, 84], [30, 86], [44, 52], [40, 0]].map(q => TF(q[0], q[1])), { fill: C.refl, lw: 3, part: [.5, 1.0] });
    ink(ctx, blobPts(Fr.hc[0], Fr.hc[1], 56 * CS, 46 * CS, 2, 14), { fill: C.refl2, lw: 3, part: [.45, .95] });
    ctx.restore();
  }
  K.drawCatRefl = drawCatRefl;

  // ---------------- poses (all return a fresh F; hands default to hanging) ----------------
  // walkSpec(x, gy, f, phase (cycles), stride px, o): o.stance (fraction of the cycle a foot is planted), o.lift, o.bob, o.lean, o.head, o.face
  function walkSpec(x, gy, f, ph, stride, o = {}) {
    const st = o.stance ?? .6, lift = o.lift ?? 9, Ls = stride * st;
    const feet = [.5, 0].map(off => { const p = frac(ph + off); let rel, up = 0;
      if (p < st) rel = Ls / 2 - p / st * Ls; else { const q = (p - st) / (1 - st); rel = -Ls / 2 + Ls * ss(0, 1, q); up = Math.sin(Math.PI * q) * lift; }
      return [x + f * (rel + 4) * 1, gy - up * CS]; });
    const bob = (o.bob ?? 4) * (.5 + .5 * Math.cos(ph * 2 * TAU));
    return { x, gy, f, feet, bob, lean: (o.lean ?? .24) + .03 * Math.cos(ph * 2 * TAU), head: o.head ?? .3, hands: [null, null], face: o.face || 'calm', ph };
  }
  // standSpec(x, gy, f, o): feet apart, upright (o.lean, o.head: negative head = looking up)
  function standSpec(x, gy, f, o = {}) { return { x, gy, f, feet: [[x - f * 10 * CS, gy], [x + f * 12 * CS, gy]], bob: 0, lean: o.lean ?? .04, head: o.head ?? 0, hands: [null, null], face: o.face || 'calm' }; }
  // crouchSpec(x, gy, f, o): squatting low over something on the ground (o.crouch px, o.lean ~.8)
  function crouchSpec(x, gy, f, o = {}) { return { x, gy, f, feet: [[x + f * 16 * CS, gy], [x - f * 4 * CS, gy]], bob: 0, crouch: o.crouch ?? 16, lean: o.lean ?? .8, head: o.head ?? .3, hands: [null, null], face: o.face || 'calm' }; }
  // kneelSpec(x, gy, f, o): one knee down — the far foot planted ahead, the near knee on the ground behind (o.crouch ~30)
  function kneelSpec(x, gy, f, o = {}) { const cr = o.crouch ?? 30;
    return { x, gy, f, feet: [[x + f * 20 * CS, gy], [x - f * 30 * CS, gy - 2]], bob: 0, crouch: cr, lean: o.lean ?? .45, head: o.head ?? .25, hands: [null, null], face: o.face || 'calm', kneel: true }; }
  // mixSpec(A, B, k): an in-between of two poses (feet, hands, lean…); a change of facing squashes the body toward a front view
  function mixSpec(A, Bs, k) {
    if (k <= 0) return A; if (k >= 1) return Bs;
    const pick = k < .5 ? A : Bs, hA = [0, 1].map(i => A.hands[i] || armOf(frameOf(A), A, i === 1).hand), hB = [0, 1].map(i => Bs.hands[i] || armOf(frameOf(Bs), Bs, i === 1).hand);
    return { ...pick, sq: A.f !== Bs.f ? Math.max(.58, Math.abs(1 - 2 * k)) : 1, x: lerp(A.x, Bs.x, k), gy: lerp(A.gy, Bs.gy, k), bob: lerp(A.bob || 0, Bs.bob || 0, k), crouch: lerp(A.crouch || 0, Bs.crouch || 0, k),
      lean: lerp(A.lean || 0, Bs.lean || 0, k), head: lerp(A.head || 0, Bs.head || 0, k), feet: [lerp2(A.feet[0], Bs.feet[0], k), lerp2(A.feet[1], Bs.feet[1], k)],
      hands: [lerp2(hA[0], hB[0], k), lerp2(hA[1], hB[1], k)] };
  }
  Object.assign(K, { walkSpec, standSpec, crouchSpec, kneelSpec, mixSpec });

  // ---------------- long held objects (a beam, a pole, a plank) ----------------
  // An object is X = { x, y, a, k?, u0?, u1? }: its foot end at (x, y), its axis at angle a; u runs along it (px), v across.
  // objPt(X, u, v) → the world point; rotAbout(X, pivot, th) → X turned about a world point; mixObj(A, B, k) → an in-between
  // (turning the short way round). Put a paw on an object by setting F.hands[i] = objPt(X, u) — the paw lands exactly there.
  K.objPt = (X, u, v = 0) => { const c = Math.cos(X.a), s = Math.sin(X.a); return [X.x + u * c - v * s, X.y + u * s + v * c]; };
  K.rotAbout = function (X, pv, th) { const ox = X.x - pv[0], oy = X.y - pv[1]; return { ...X, x: pv[0] + ox * Math.cos(th) - oy * Math.sin(th), y: pv[1] + ox * Math.sin(th) + oy * Math.cos(th), a: X.a + th }; };
  K.mixObj = (A, B, k) => { if (k <= 0) return A; if (k >= 1) return B; let b = B.a; while (b - A.a > Math.PI) b -= TAU; while (b - A.a < -Math.PI) b += TAU;   // the short way round
    return { ...B, x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), a: lerp(A.a, b, k), k: lerp(A.k || 0, B.k || 0, k) }; };
  // shoulderCarry(Fr, gy, u0, len): a long object dragged on the shoulder — its top end (u = len) rests on the near shoulder
  // (tie it with F.strap = 'hold'), the post trails down behind to the ground at a shallow angle. Returns X.
  const TL = [-34, 72];
  K.shoulderCarry = function (Fr, gy, u0 = 0, L = 560) {
    const T = Fr.TF(TL[0], TL[1]), h = gy - T[1], th = Math.asin(clamp(h / L, .14, .5)), a = Fr.f > 0 ? -th : Math.PI + th, d = [Math.cos(a), Math.sin(a)];
    return { x: T[0] - d[0] * (L - 8), y: T[1] - d[1] * (L - 8), a, k: 0, u0, u1: L };
  };
  // holdFront(F, len, o): a pole held across the body in front with both paws (o.tilt rad, o.y up from the ground, o.grips = [u far, u near])
  // → { X, hands } — assign F.hands = hands and draw the pole in F.mid (between the body and the near arm)
  K.holdFront = function (F, len, o = {}) { const tilt = o.tilt ?? -.25, y = F.gy - (o.y ?? 70) * CS, a = F.f > 0 ? tilt : Math.PI - tilt, cx = F.x + F.f * 22 * CS;
    const X = { x: cx - Math.cos(a) * len / 2, y: y - Math.sin(a) * len / 2, a }, g = o.grips || [len / 2 + 30, len / 2 - 20]; return { X, hands: [K.objPt(X, g[0]), K.objPt(X, g[1])] }; };
  // holdUpright(F, len, o): a pole standing on the ground beside the cat, the near paw on it at o.grip (px above the ground) → { X, hands }
  K.holdUpright = function (F, len, o = {}) { const x = F.x + F.f * (o.dx ?? 46) * CS, X = { x, y: F.gy, a: -Math.PI / 2 }; return { X, hands: [null, K.objPt(X, o.grip ?? 70 * CS)] }; };

  // ---------------- textures (init) ----------------
  // init(o): the blue field with faint mottling (BG), the full-frame grain (GRAIN), a warm glow sprite (GLOW). ~120 ms.
  K.init = function (o = {}) {
    if (o.accent) { K.ACCENT = C.honey = o.accent; K.HONEY.f = o.accent; }
    const BG = K.BG = Pilot.canvas(W, H), b = BG.getContext('2d');
    b.fillStyle = C.field; b.fillRect(0, 0, W, H);
    const mw = 60, mh = 106, m = Pilot.canvas(mw, mh), mx = m.getContext('2d'), md = mx.createImageData(mw, mh);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { const v = Pilot.fbm(x * .08 + 9, y * .08 + 2, 3), i = (y * mw + x) * 4, k = (v - .5) * 2;
      md.data[i] = md.data[i + 1] = md.data[i + 2] = k > 0 ? 255 : 0; md.data[i + 3] = Math.abs(k) * 16; }
    mx.putImageData(md, 0, 0); b.drawImage(m, 0, 0, W, H);
    const GRAIN = K.GRAIN = Pilot.canvas(W, H), g = GRAIN.getContext('2d'), gd = g.createImageData(W, H), rr = rng(9);
    for (let i = 0; i < W * H; i++) { const v = rr() - .5, j = i * 4; if (v > 0) { gd.data[j] = gd.data[j + 1] = gd.data[j + 2] = 255; gd.data[j + 3] = v * 34; } else { gd.data[j] = 10; gd.data[j + 1] = 20; gd.data[j + 2] = 50; gd.data[j + 3] = -v * 38; } }
    g.putImageData(gd, 0, 0);
    K.GLOW = Pilot.canvas(128, 128); { const x = K.GLOW.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,240,196,1)'); gr.addColorStop(.3, 'rgba(255,226,160,.5)'); gr.addColorStop(.65, 'rgba(240,214,170,.12)'); gr.addColorStop(1, 'rgba(230,220,210,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); }
  };
  // background(ctx): the blue field, screen space (call with an identity transform);  grain(ctx): the last pass of every frame
  K.background = ctx => ctx.drawImage(K.BG, 0, 0);
  K.grain = ctx => ctx.drawImage(K.GRAIN, 0, 0);
  // glow(ctx, cx, cy, w, h, alpha): the warm glow sprite centred on a point (the accent light: a doorway, a lit object)
  K.glow = (ctx, cx, cy, w, h, a = 1) => { ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(K.GLOW, cx - w / 2, cy - h / 2, w, h); ctx.restore(); };

  // ---------------- camera ----------------
  // cam = { x, y, z, sx?, sy? } (world point at the frame centre, zoom, shake px). setCam(ctx, cam, p) sets the transform for a
  // layer with parallax p (1 = the world, .4 = the sky) and the line scale; mixCam(a, b, k); shake(t, t0, ax, ay, dur) → [sx, sy]
  K.mixCam = (a, b, k) => k <= 0 ? a : k >= 1 ? b : { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
  K.setCam = function (ctx, cm, p = 1) { const z = 1 + (cm.z - 1) * p, cx = cm.x * p + (1 - p) * 540, cy = 960 + (cm.y - 960) * p; ctx.setTransform(z, 0, 0, z, 540 - cx * z + (cm.sx || 0) * p, 960 - cy * z + (cm.sy || 0) * p); LW = 1 / z; };
  K.shake = (t, t0, ax = 16, ay = 12, dur = .55) => { if (t < t0) return [0, 0]; const k = 1 - ss(t0, t0 + dur, t); return [ax * k * Math.sin(t * 97), ay * k * Math.sin(t * 131 + 1)]; };
  // view(cm): the visible world rectangle (+80 px) for culling long things
  K.view = cm => ({ x0: cm.x - 540 / cm.z - 80, x1: cm.x + 540 / cm.z + 80, y1: cm.y + 960 / cm.z + 80 });

  // ---------------- the sky (parallax .4) ----------------
  // buildSky(r, o): r = an rng (shared, so a scene can keep drawing from the same sequence); o.moons = [{ x, y, rx, ry, f: [fx, fy] }]
  // (f = the outline jitter frequencies), o.from / o.to (cloud x range), o.starsFrom / o.starsSpan (star x range) → sky
  K.buildSky = function (r, o = {}) {
    const SKY = [];
    for (const m of (o.moons || [{ x: 420, y: 690, rx: 56, ry: 44, f: [1.7, 2.3] }]))
      SKY.push(shape(ell(m.x, m.y, m.rx, m.ry, 20).map((q, i) => [q[0] + Math.sin(i * m.f[0]) * 3, q[1] + Math.cos(i * m.f[1]) * 3]), { fill: C.moon }));
    const to = o.to ?? 2400;
    for (let x = o.from ?? -700; x < to; x += 420 + r() * 260) { const y = 790 + r() * 110, rx = 90 + r() * 150;
      SKY.push(shape(blobPts(x, y, rx, rx * (.24 + r() * .14), (x | 0) % 97 + 3, 20), { fill: C.lav, part: [0, .55] })); }
    SKY.stars = []; for (let i = 0; i < 60; i++) SKY.stars.push([(o.starsFrom ?? -700) + r() * (o.starsSpan ?? 3000), 300 + r() * 520, .9 + r() * 1.4]);
    return SKY;
  };
  // drawSky(ctx, cm, sky, p = .4): moon, clouds (part-outlined) and stars at parallax p; leaves the transform reset by restore
  K.drawSky = function (ctx, cm, SKY, p = .4) {
    ctx.save(); K.setCam(ctx, cm, p);
    for (const s of SKY) drawShape(ctx, s);
    ctx.fillStyle = 'rgba(240,244,255,.8)'; for (const [x, y, rr] of SKY.stars) { ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); }
    ctx.restore();
  };

  // ---------------- the ledge, the water, ripples ----------------
  // o = { top (the ledge's back edge y), front (its front edge = the water line y), gaps: [[x0, x1], …] (breaks in the ledge) }
  function ledgeSegs(a0, a1, gaps) { const s = []; let a = a0; for (const [g0, g1] of (gaps || [])) { s.push([a, Math.min(a1, g0)]); a = Math.max(a0, g1); } s.push([a, a1]); return s; }
  // ledge(ctx, cm, o): the shallow-water band (lighter), the open water below (darker), their hand-drawn edges (world space)
  K.ledge = function (ctx, cm, o) {
    const x0 = cm.x - 540 / cm.z - 80, x1 = cm.x + 540 / cm.z + 80, y1 = cm.y + 960 / cm.z + 80, TOPE = o.top, FRONTE = o.front;
    ctx.fillStyle = 'rgba(14,30,72,.17)'; ctx.fillRect(x0, FRONTE, x1 - x0, y1 - FRONTE);
    ctx.fillStyle = 'rgba(255,255,255,.09)'; ctx.fillRect(x0, TOPE, x1 - x0, FRONTE - TOPE);
    for (const [a, b] of ledgeSegs(Math.max(x0, -9000), x1, o.gaps)) if (b > a + 4) {
      const seg = (y, lw, sd) => { const pts = []; for (let x = a; x <= b; x += 24) pts.push(wob([x, y + Math.sin(x * .013 + sd) * 1.2])); pts.push(wob([b, y])); stroke(ctx, pathOf(pts, false), { lw }); };
      seg(TOPE, 2.2, 1); seg(FRONTE, 3.4, 2);
    }
  };
  // buildArcs(r, o): the quiet ripple rings on the open water: o.from, o.to (x), o.y (≈ water line), o.gaps (skipped, ±200 px) → arcs
  K.buildArcs = function (r, o) {
    const ARCS = [], skip = x => (o.gaps || []).some(([g0, g1]) => x > g0 - 200 && x < g1 + 200);
    for (let x = o.from ?? -900; x < o.to; x += 480 + r() * 200) { if (skip(x)) continue; const cy = o.y + 230 + r() * 90; for (let i = 0; i < 5; i++) { const rx = 160 + i * 70 + r() * 30, span = .25 + r() * .3, a0 = .3 + r() * (Math.PI - .6 - span); ARCS.push([x, cy, rx, a0, span]); } }
    return ARCS;
  };
  // footfalls(figsAt, o): sample the figures once (figsAt(t) → [F, …] in a fixed order) and record every foot that lands on the
  // water ledge: o.dur, o.until (stop sampling), o.fps = 60, o.onWater(x) → bool. Returns steps [[t, x, y]] for ripples().
  K.footfalls = function (figsAt, o) {
    const STEPS = [], prev = {};
    for (let i = 0; i <= o.dur * (o.fps || 60); i++) {
      const t = i / (o.fps || 60); if (o.until != null && t > o.until) break;
      figsAt(t).forEach((F, n) => { if (!F || !F.feet) return; F.feet.forEach((p, q) => { const key = n * 2 + q, wasUp = prev[key];
        const up = p[1] < F.gy - 2; if (wasUp && !up && (!o.onWater || o.onWater(p[0]))) STEPS.push([t, p[0], F.gy]); prev[key] = up; }); });
    }
    return STEPS;
  };
  // ripples(ctx, t, arcs, steps): the rings drift outward slowly; a footfall rings for 1.4 s
  K.ripples = function (ctx, t, ARCS, STEPS) {
    const g = t * 3.2;
    for (const [x, cy, rx, a0, span] of ARCS) { const R = rx + g; arc(ctx, x, cy, R, R * .3, a0, a0 + span, 2.6); }
    for (const [t0, x, y] of (STEPS || [])) { const k = (t - t0) / 1.4; if (k < 0 || k > 1) continue;
      ctx.save(); ctx.globalAlpha = (1 - k) * .9; const R = 18 + k * 70; arc(ctx, x, y + 3, R, R * .22, .1, 1.1, 2.2); arc(ctx, x, y + 3, R, R * .22, 2.2, 3.0, 2.2); ctx.restore(); }
  };

  // ---------------- a gap / drop in the ledge ----------------
  // buildGap({ x, w, top, front, base }): a real drop between x and x + w (lips, strata ticks), base = the ground line y → gap
  K.buildGap = function (o) {
    const E = o.x, G = o.w, TOPE = o.top, FRONTE = o.front, WL = o.base;
    const GAPD = { E, G, TOPE, FRONTE, WL, L: [], R: [], ticks: [] };
    for (const [x0, dir, arr, sd] of [[E, 1, GAPD.L, 71], [E + G, -1, GAPD.R, 73]]) { const q = rng(sd); for (let y = TOPE - 2; y <= WL + 1500; y += 34) arr.push([x0 + dir * (q() * 7 + (y > FRONTE ? Math.min(24, (y - FRONTE) * .06) : 0)), y]);
      for (let y = FRONTE + 40; y < WL + 900; y += 70 + q() * 40) GAPD.ticks.push([x0 + dir * (14 + q() * 10), y, dir, 18 + q() * 22]); }
    GAPD.Lp = pathOf(inkPts(GAPD.L, { closed: false, smooth: false, step: 12 }), false); GAPD.Rp = pathOf(inkPts(GAPD.R, { closed: false, smooth: false, step: 12 }), false);
    GAPD.body = pathOf(GAPD.L.concat(GAPD.R.slice().reverse()));
    return GAPD;
  };
  // drawGap(ctx, t, gap): the dark ravine falling to black, the lips' cut faces, water spilling over both lips, drops falling
  K.drawGap = function (ctx, t, GAPD) {
    const { E, G, TOPE, FRONTE, WL } = GAPD;
    ctx.save(); const gr = ctx.createLinearGradient(0, TOPE, 0, WL + 1100); gr.addColorStop(0, '#2b3f76'); gr.addColorStop(.25, '#17234a'); gr.addColorStop(.6, '#0a1024'); gr.addColorStop(1, '#05070f');
    ctx.fillStyle = gr; ctx.fill(GAPD.body);
    // the ledge's cut faces just under each lip (lavender stone), strata ticks going down
    ctx.clip(GAPD.body);
    ctx.fillStyle = 'rgba(169,178,212,.55)'; ctx.fillRect(E - 10, TOPE, 34, FRONTE - TOPE + 26); ctx.fillRect(E + G - 24, TOPE, 34, FRONTE - TOPE + 26);
    ctx.restore();
    stroke(ctx, GAPD.Lp, { lw: 3.2 }); stroke(ctx, GAPD.Rp, { lw: 3.2 });
    stroke(ctx, pathOf([wob([E, FRONTE + 26]), wob([E + 24, FRONTE + 30])], false), { lw: 2.4 }); stroke(ctx, pathOf([wob([E + G, FRONTE + 26]), wob([E + G - 24, FRONTE + 30])], false), { lw: 2.4 });
    for (const [x, y, dir, l] of GAPD.ticks) stroke(ctx, pathOf([wob([x, y]), wob([x + dir * l, y + 6])], false), { lw: 2, col: 'rgba(180,190,225,.5)' });
    // water spilling over both lips: thin white curtains falling into the dark, the lines streaming down
    ctx.save(); ctx.lineCap = 'round';
    for (const [x0, dir] of [[E, 1], [E + G, -1]]) for (let i = 0; i < 6; i++) {
      const q = rng(900 + i + (dir > 0 ? 0 : 50)), sx = x0 + dir * (3 + i * 5), len = 260 + q() * 300, ph = frac(t * (.7 + q() * .4) + q());
      const grd = ctx.createLinearGradient(0, TOPE + 8, 0, TOPE + len); grd.addColorStop(0, 'rgba(236,242,255,.9)'); grd.addColorStop(1, 'rgba(236,242,255,0)');
      ctx.strokeStyle = grd; ctx.lineWidth = (1.6 + q()) * LW; ctx.setLineDash([40 + q() * 40, 18 + q() * 20]); ctx.lineDashOffset = -ph * 160;
      ctx.beginPath(); ctx.moveTo(x0 - dir * 4, TOPE + 6 + i * 6); ctx.quadraticCurveTo(sx + dir * 8, TOPE + 20 + i * 6, sx + dir * (10 + i * 2), TOPE + len); ctx.stroke(); }
    ctx.setLineDash([]); ctx.restore();
    // drops falling away into the dark, smaller as they go
    ctx.fillStyle = 'rgba(220,230,250,.6)';
    for (let i = 0; i < 16; i++) { const q = rng(400 + i), x = E + 40 + q() * (G - 80), per = 1.4 + q() * 1.2, ph = frac((t + q() * 9) / per), y = FRONTE + 40 + ph * (500 + q() * 300), s = 3.4 * (1 - ph * .6);
      ctx.globalAlpha = Math.sin(Math.PI * ph) * .8; ctx.beginPath(); ctx.ellipse(x, y, s * .7, s * 1.2, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  };
  // gapClip(gap): a clip path of everything except the gap (for water details that must not cross it)
  K.gapClip = g => { const clip = new Path2D(); clip.rect(-9000, -5000, g.E + 9000, 12000); clip.rect(g.E + g.G, -5000, 12000, 12000); return clip; };

  // ---------------- a lit doorway (the accent light) ----------------
  // door(ctx, t, o, behind): o = { x (centre), gy (sill y), w = 92 (half-width), h = 330, pool (y of the light pool on the water) }.
  // Call twice: behind = true (glow + bright opening + flickering rays) before figures that walk into it, false (the lavender
  // frame) after them — so a figure inside the door is framed by it.
  K.door = function (ctx, t, o, behind) {
    const x = o.x, gy = o.gy, w = o.w ?? 92, h = o.h ?? 330, inner = (cx, cy, rw, hh) => { const q = [[cx - rw, cy]]; for (let i = 0; i <= 16; i++) { const a = Math.PI + Math.PI * i / 16; q.push([cx + Math.cos(a) * rw, cy - hh + rw + Math.sin(a) * rw]); } q.push([cx + rw, cy]); return q; };
    if (behind) {
      ctx.save(); ctx.globalAlpha = .85; ctx.drawImage(K.GLOW, x - 300, gy - h * .55 - 300, 600, 600); ctx.globalAlpha = .45; ctx.drawImage(K.GLOW, x - 150, (o.pool ?? gy + 34) - 10, 300, 360); ctx.restore();
      ink(ctx, inner(x, gy, w, h), { fill: C.light, lw: 0 });
      const r = rng(1000 + Math.round(t * 12)); ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.8 * LW; ctx.beginPath();
      for (let i = 0; i < 16; i++) { const an = Math.PI + r() * Math.PI, l0 = w + 14, l = w + 30 + r() * 60; const cy = gy - h + w; ctx.moveTo(x + Math.cos(an) * l0, cy + Math.sin(an) * l0); ctx.lineTo(x + Math.cos(an) * l, cy + Math.sin(an) * l); }
      ctx.stroke(); ctx.restore(); return;
    }
    const outer = inner(x, gy, w + 30, h + 30), inn = inner(x, gy, w, h);
    const P = new Path2D(); const po = inkPts(outer, { smooth: false }), pi = inkPts(inn, { smooth: false });
    P.moveTo(...po[0]); for (const q of po) P.lineTo(...q); P.closePath(); P.moveTo(...pi[0]); for (const q of pi) P.lineTo(...q); P.closePath();
    ctx.fillStyle = C.lavL; ctx.fill(P, 'evenodd'); stroke(ctx, P, { lw: 3 });
  };

  // ---------------- effects ----------------
  // splash(ctx, t, t0, x, y): THE HIT — white diamonds thrown up and falling (0.7 s) + a burst of white rays (0.3 s) at (x, y)
  K.splash = function (ctx, t, t0, x, y) {
    if (t < t0 - .02) return; const u = t - t0;
    if (u < .7) { ctx.save(); ctx.globalAlpha = 1 - ss(.35, .7, u);
      for (let i = 0; i < 12; i++) { const q = rng(600 + i), vx = (q() - .3) * 420, vy = -(260 + q() * 420), dx = x + 20 + vx * u, dy = y + vy * u + 1300 * u * u, s = 7 + q() * 6;
        ink(ctx, [[dx, dy - s], [dx + s * .6, dy + s * .15], [dx, dy + s * .6], [dx - s * .6, dy + s * .15]], { fill: C.white, lw: 2, it: 1 }); }
      ctx.restore(); }
    if (u < .3) { const r = rng(777 + Math.round(t * 24)); ctx.save(); ctx.globalAlpha = 1 - u / .3; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * LW; ctx.beginPath();
      for (let i = 0; i < 22; i++) { const an = -Math.PI * (.05 + .9 * r()), l0 = 30, l = 90 + r() * 140; ctx.moveTo(x + Math.cos(an) * l0, y + Math.sin(an) * l0); ctx.lineTo(x + Math.cos(an) * l, y + Math.sin(an) * l); } ctx.stroke(); ctx.restore(); }
  };
  // rays(ctx, t, x, y, a, o): a soft flicker of thin white rays around a point (a glint, something precious appearing) — o.n, o.r0, o.r1
  K.rays = function (ctx, t, x, y, a, o = {}) { if (a <= 0) return; const r = rng(1000 + Math.round(t * 12)); ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.8 * LW; ctx.beginPath();
    for (let i = 0; i < (o.n || 12); i++) { const an = r() * TAU, l0 = o.r0 ?? 40, l = (o.r1 ?? 70) + r() * 40; ctx.moveTo(x + Math.cos(an) * l0, y + Math.sin(an) * l0); ctx.lineTo(x + Math.cos(an) * l, y + Math.sin(an) * l); } ctx.stroke(); ctx.restore(); };
  // speedLines(ctx, t, F, a): four short ink dashes behind a running cat (a = 0..1)
  K.speedLines = function (ctx, t, F, a) {
    if (a <= 0) return; ctx.save(); ctx.globalAlpha = Math.min(1, a); const x = F.x - F.f * 80 * CS, r = rng(500 + Math.round(t * 12)), f = F.f;
    for (let i = 0; i < 4; i++) { const y = F.gy - (40 + i * 52 + r() * 16) * CS, l = (50 + r() * 60) * CS; ink(ctx, f > 0 ? [[x - l, y], [x, y]] : [[x + l, y], [x, y]], { closed: false, lw: 2.4, smooth: false }); } ctx.restore();
  };

  // ---------------- words ----------------
  // captions(ctx, t, lines, o): hand-font captions in ink with a soft blue halo, upper third (y 410), screen space
  K.captions = (ctx, t, lines, o = {}) => Story.captions(ctx, t, lines, { font: K.HAND, weight: 400, size: 74, y: 410, color: C.ink, srcColor: '#20243a', shadow: 'rgba(86,128,189,.95)', shadowBlur: 16, ...o });
  // endPlate(ctx, t, at): from `at` − .2 the frame turns to a plain plate of the same blue with the moon and a few water rings
  K.endPlate = function (ctx, t, at) {
    const pe = ss(at - .2, at + .35, t); if (pe <= 0) return;
    ctx.save(); ctx.globalAlpha = pe; ctx.drawImage(K.BG, 0, 0); ctx.restore();
    ctx.save(); ctx.globalAlpha = pe; ink(ctx, ell(810, 560, 54, 42, 20).map((q, i) => [q[0] + Math.sin(i * 1.7) * 3, q[1] + Math.cos(i * 2.3) * 3]), { fill: C.moon, lw: 3 });
    for (let i = 0; i < 5; i++) { const R = 330 + i * 70 + (t - at) * 6; arc(ctx, 540, 1600, R, R * .22, .5 + i * .9, .9 + i * .9, 2.6); } ctx.restore();
  };
  // endCard(ctx, t, card, at): the end card in the hand font, ink on blue, 1.18× around y 820
  K.endCard = function (ctx, t, card, at, o = {}) {
    ctx.save(); ctx.translate(540, 820); ctx.scale(1.18, 1.18); ctx.translate(-540, -820);
    Story.endCard(ctx, t, card, at, { font: K.HAND, color: C.ink, srcFont: K.HAND, srcColor: '#22263c', y: 820, titleShadow: '', ...o });
    ctx.restore();
  };

  window.MiniCat = K;
})();

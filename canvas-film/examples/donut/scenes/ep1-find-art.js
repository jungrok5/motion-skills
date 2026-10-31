/* ep1-find-art.js — scene-local drawings for 「마지막 도넛」 ep1-find that the webtoon kit / donut cast do not have yet, drawn in the
   cast's manga construction (Manga.ink boiling line, flat paper + 45° dot tone, one ink). Global: window.Ep1Art.
   Load after lib.js, kit-webtoon.js, donut-manga.js, donut-cast.js. All pure functions of their arguments (+ t).
   (Candidates for the cast/kit: wallClock, melt (head-on-desk pose), reachArm (a close-up arm entering from off-panel), castShadow,
   eyeBand, boxRim.) */
(function () {
  const WT = window.Webtoon, C = window.Cast, MG = window.Manga, { clamp, lerp, ss, eo, eio } = Pilot, TAU = Math.PI * 2;
  const INK = MG.C.ink, PAPER = MG.C.paper, PAPERL = MG.C.paperL;
  const A = {};
  const SKIN = { fill: PAPERL }, SHIRT = (dx = 0, dy = 8) => ({ fill: PAPERL, shade: { tone: .28, dx, dy } });
  const lwFor = sz => 5.2 * Math.pow(sz / 33, .5);   // the cast's close-up hand line weight (Cast.hand), reused for the arm

  // wallClock(ctx, t, x, y, r, o): an office wall clock showing o.h:o.m, the second hand ticking once a second (o.s0 = seconds at t = 0)
  A.wallClock = function (ctx, t, x, y, r, o = {}) {
    const h = o.h ?? 3, m = o.m ?? 0, sec = (o.s0 ?? 0) + Math.floor(t) + WT.backOut(clamp((t % 1) / .12), 3) - 1;
    MG.boil(t); const old = MG.figure(4.2);
    ctx.save(); ctx.translate(x, y);
    MG.ink(ctx, MG.ell(0, 0, r, r, 40), { fill: PAPERL, lw: 1.1 }); MG.ink(ctx, MG.ell(0, 0, r * .86, r * .86, 40), { lw: .5, single: true, closed: true });
    ctx.fillStyle = INK; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, big = i % 3 === 0, r0 = r * (big ? .6 : .68);
      ctx.save(); ctx.rotate(a); ctx.fillRect(r0, -(big ? r * .035 : r * .015), r * .78 - r0, big ? r * .07 : r * .03); ctx.restore(); }
    const hand = (a, L, w) => { const p0 = [-Math.sin(a) * -L * .15, Math.cos(a) * L * .15], p1 = [Math.sin(a) * L, -Math.cos(a) * L]; MG.taper(ctx, [p0, p1], w, w * .5, { amp: 0 }); };
    hand((h + m / 60) / 12 * TAU, r * .45, 3.4); hand(m / 60 * TAU, r * .66, 2.6); hand(sec / 60 * TAU, r * .72, .9);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, r * .07, 0, TAU); ctx.fill();
    ctx.restore(); MG.figure(old);
  };

  // reachArm(ctx, t, who, sh, wr, o): a close-up arm entering from off-panel, solved with the cast's 3D two-bone IK (Cast.ik3): FIXED
  //   upper-arm / forearm lengths, the elbow toward a fixed pole for the whole reach, the hand (Cast.hand, no sleeve) drawn AT the
  //   solved wrist with its angle clamped ≤ 80° off the forearm. sh = shoulder [x, y], wr = wrist target [x, y].
  //   o { sz (palm length, 72), l1, l2 (bone lengths; default 3.6·sz / 3.1·sz), past (sleeve drawn on past the shoulder, × upper arm, .6), pole ([0, 1, .4]: elbow down + toward camera), pose ('grab'),
  //   aim (wanted world hand angle), flip, roll (rolled sleeve: shirt to just below the elbow, then skin) } → { e, w, ang, reach, H }
  A.reachArm = function (ctx, t, who, sh, wr, o = {}) {
    const sz = o.sz || 72, l1 = o.l1 || sz * 3.6, l2 = o.l2 || sz * 3.1, pole = o.pole || [0, 1, .4];
    const sol = C.ik3([sh[0], sh[1], 0], [wr[0], wr[1], 0], l1, l2, pole), e = [sol.e[0], sol.e[1]], w = [sol.w[0], sol.w[1]];
    const fa = Math.atan2(w[1] - e[1], w[0] - e[0]), want = o.aim ?? fa, d = ((want - fa + 3 * Math.PI) % TAU) - Math.PI, ang = fa + clamp(d, -1.38, 1.38);
    MG.boil(t); const old = MG.figure(lwFor(sz));
    const ue = [e[0] - sh[0], e[1] - sh[1]], ul = Math.hypot(ue[0], ue[1]) || 1, fe = [w[0] - e[0], w[1] - e[1]], fl = Math.hypot(fe[0], fe[1]) || 1;
    const at = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k];
    // upper arm in the shirt sleeve (shoulder → elbow), then the bare forearm (elbow → wrist), the rolled cuff over the joint
    MG.ink(ctx, MG.tube([at(sh, ue, -(o.past ?? .6)), sh, at(sh, ue, .5), at(sh, ue, 1.06)], [sz * .6, sz * .6, sz * .58, sz * .55]), Object.assign({ smooth: false }, SHIRT(0, 10)));   // the sleeve runs on past the shoulder (off-panel torso)
    MG.ink(ctx, MG.tube([at(e, fe, -.06), at(e, fe, .5), w], [sz * .44, sz * .4, sz * .34]), SKIN);
    if (o.roll !== false) MG.ink(ctx, MG.tube([at(e, fe, -.02), at(e, fe, .1), at(e, fe, .2)], [sz * .56, sz * .56, sz * .53]), SHIRT(0, 6));
    MG.figure(old);
    const H = C.hand(ctx, who, o.pose || 'grab', w[0], w[1], ang, sz, { sleeve: false, flip: o.flip ?? -1, t });
    return { e, w, ang, reach: sol.reach, H, l1: ul, l2: fl };
  };

  // melt(ctx, t, who, o): a person melted onto a desk — the head lying on its cheek (eyes to camera), the shoulders hunched behind it,
  //   one forearm flat on the desk in front, the hand limp by the chin. o { x, y (where the cheek meets the desk), s (face scale ≈ 3),
  //   expr, breath (px), side (+1 body to the right), face (extra Cast.face options) }. Draw the desk top yourself BEFORE.
  A.melt = function (ctx, t, who, o = {}) {
    const s = o.s || 3, k = s / 3, x = o.x, y = o.y, br = o.breath ?? Math.sin(t * 2.1) * 3, sd = o.side || 1;
    const X = v => x + sd * v * k, Y = v => y + v * k;
    MG.boil(t); const old = MG.figure(5.6 * Math.sqrt(k));
    ctx.save(); ctx.translate(0, br * .6);
    MG.ink(ctx, [[X(110), Y(-110)], [X(290), Y(-220) - br], [X(490), Y(-210) - br], [X(600), Y(-140)], [X(620), Y(60)], [X(150), Y(60)]], SHIRT(-14 * sd * k, 14 * k));
    MG.taper(ctx, [[X(330), Y(-205) - br], [X(368), Y(-120)], [X(352), Y(-15)]], 1.1, .3);   // a shirt fold
    MG.taper(ctx, [[X(460), Y(-196) - br], [X(470), Y(-130)]], .9, .3);
    ctx.restore();
    MG.ink(ctx, MG.tube([[X(490), Y(30)], [X(300), Y(42)], [X(110), Y(50)]], [46 * k, 43 * k, 40 * k]), SKIN);
    MG.ink(ctx, MG.tube([[X(565), Y(24)], [X(515), Y(26)], [X(470), Y(28)]], [60 * k, 60 * k, 57 * k]), SHIRT(0, 8));
    MG.figure(old);
    const G = C.face(ctx, t, who, X(-10), Y(-140) + br * .3, s, Object.assign({ expr: o.expr || 'dead', tilt: -1.2 * sd }, o.face || {}));
    C.hand(ctx, who, 'open', X(118), Y(51), sd > 0 ? Math.PI + .06 : -.06, 46 * k, { sleeve: false, flip: sd, t });   // the wrist AT the forearm's end
    return G;
  };

  // castShadow(ctx, k, o): the hard-edged dot-tone shadow of someone standing behind the camera (head + shoulders) rising over a
  //   panel from below; k = 0 (off-panel) … 1 (in place). o { x, y (where the head shadow lands), s, tone (.45) }
  A.castShadow = function (ctx, k, o = {}) {
    if (k <= 0) return; const s = o.s || 1, x = lerp(o.x - 160 * s, o.x, eo(k)), y = lerp(o.y + 900 * s, o.y, eo(k));
    const p = new Path2D();
    p.ellipse(x, y, 135 * s, 160 * s, .08, 0, TAU);
    p.moveTo(x - 70 * s, y + 120 * s); p.lineTo(x + 70 * s, y + 120 * s); p.lineTo(x + 80 * s, y + 230 * s);
    p.quadraticCurveTo(x + 360 * s, y + 250 * s, x + 420 * s, y + 420 * s); p.lineTo(x + 470 * s, y + 1000 * s);
    p.lineTo(x - 470 * s, y + 1000 * s); p.lineTo(x - 420 * s, y + 420 * s); p.quadraticCurveTo(x - 360 * s, y + 250 * s, x - 80 * s, y + 230 * s); p.closePath();
    ctx.save(); ctx.fillStyle = MG.tone(ctx, o.tone ?? .45); ctx.fill(p, 'nonzero'); ctx.restore();
  };

  // eyeBand(ctx, t, who, cx, cy, s, o): a face drawn so its EYE LINE sits at (cx, cy) — the extreme eye close-up for an eye strip.
  A.eyeBand = function (ctx, t, who, cx, cy, s, o = {}) {
    const g = C.face(null, t, who, 0, 0, s, o), ey = (g.eyes[0][1] + g.eyes[1][1]) / 2, ex = (g.eyes[0][0] + g.eyes[1][0]) / 2;
    return C.face(ctx, t, who, cx - ex, cy - ey, s, o);
  };

  // boxRim(ctx, x, y, w, h, o): the near wall of an open cardboard donut box seen from just above, in print terms: paper board with
  //   a thick boiling ink outline, its cut top edge (a thickness strip), a flat dot-tone band where the wall shades the contents
  //   (draw it AFTER the contents so it overlaps them), an optional right corner turning into the side wall (light tone), and the
  //   pink logo only as a small printed stamp. o { lw (screen line weight), tilt (px the left end sits lower), lip, corner, shadow, logo: [u, r], t }
  A.boxRim = function (ctx, x, y, w, h, o = {}) {
    const tl = o.tilt || 0, lip = o.lip ?? 18, cd = o.corner || 0, PINK = MG.C.pink;
    MG.boil(o.t || 0); const old = MG.figure(o.lw || 6);
    const yAt = u => y + tl * (1 - u);
    if (o.shadow) { const sp = new Path2D(); sp.moveTo(x, yAt(0) - lip - o.shadow); sp.lineTo(x + w + cd, y - cd * .55 - lip - o.shadow * .7); sp.lineTo(x + w + cd, y - cd * .55 - lip + 4); sp.lineTo(x + w, y - lip + 4); sp.lineTo(x, yAt(0) - lip + 4); sp.closePath();
      ctx.save(); ctx.fillStyle = MG.tone(ctx, .4); ctx.fill(sp); ctx.restore(); }
    if (cd > 0) { MG.ink(ctx, [[x + w, y], [x + w + cd, y - cd * .55], [x + w + cd, y - cd * .55 + h], [x + w, y + h]], { fill: PAPER, tone: .22, smooth: false });
      MG.ink(ctx, [[x + w, y], [x + w + cd, y - cd * .55], [x + w + cd - lip * .6, y - cd * .55 - lip], [x + w - lip * .6, y - lip]], { fill: PAPERL, smooth: false, lw: .8 }); }
    const fp = MG.ink(ctx, [[x, yAt(0)], [x + w, y], [x + w, y + h], [x, y + h + tl]], { fill: PAPERL, smooth: false });
    ctx.save(); ctx.clip(fp);
    ctx.fillStyle = MG.tone(ctx, .16); ctx.beginPath(); ctx.moveTo(x, y + h * .78 + tl * .22); ctx.lineTo(x + w, y + h * .78); ctx.lineTo(x + w, y + h + 4); ctx.lineTo(x, y + h + tl + 4); ctx.fill();   // the lower wall in light tone
    MG.taper(ctx, [[x + 10, yAt(0) + h * .16], [x + w - 10, y + h * .16]], .5, .5, { amp: .3 });   // the fold crease
    const [lu, lr] = o.logo || [.7, h * .17], lx = x + w * lu, ly = yAt(lu) + h * .5;
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(-.06);
    for (const [rr, col] of [[1, PINK], [.66, PAPERL], [.48, PINK], [.2, PAPERL]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, lr * rr, 0, TAU); ctx.fill(); }
    ctx.restore(); ctx.restore();
    MG.ink(ctx, [[x, yAt(0)], [x + w, y], [x + w - lip * .6, y - lip], [x - lip * .6, yAt(0) - lip]], { fill: PAPERL, smooth: false, lw: .8 });
    MG.figure(old);
  };

  window.Ep1Art = A;
})();

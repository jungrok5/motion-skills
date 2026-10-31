/* ep1-find-art.js — scene-local drawings for 「마지막 도넛」 ep1-find that the webtoon kit / donut cast do not have yet.
   Global: window.Ep1Art. Load after lib.js, kit-webtoon.js, donut-cast.js. All pure functions of their arguments (+ t).
   (Candidates for the cast/kit: wallClock, melt (head-on-desk pose), castShadow, eyeBand, boxRim.) */
(function () {
  const WT = window.Webtoon, C = window.Cast, R = WT.Rig, { clamp, lerp, ss, eo, eio } = Pilot, TAU = Math.PI * 2, INK = WT.C.ink;
  const A = {};

  // wallClock(ctx, t, x, y, r, o): an office wall clock showing o.h:o.m, the second hand ticking once a second (o.s0 = seconds at t = 0)
  A.wallClock = function (ctx, t, x, y, r, o = {}) {
    const h = o.h ?? 3, m = o.m ?? 0, sec = (o.s0 ?? 0) + Math.floor(t) + WT.backOut(clamp((t % 1) / .12), 3) - 1;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(70,60,80,.12)'; ctx.beginPath(); ctx.arc(6, 8, r * 1.04, 0, TAU); ctx.fill();
    const rim = WT.ell(0, 0, r, r); WT.inked(ctx, rim, '#f6f3ee', Math.max(3, r * .05)); ctx.lineWidth = r * .09; ctx.strokeStyle = '#5b6170'; ctx.beginPath(); ctx.arc(0, 0, r * .93, 0, TAU); ctx.stroke();
    ctx.strokeStyle = INK; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, big = i % 3 === 0; ctx.lineWidth = big ? r * .05 : r * .025; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * (big ? .66 : .72), Math.sin(a) * r * (big ? .66 : .72)); ctx.lineTo(Math.cos(a) * r * .8, Math.sin(a) * r * .8); ctx.stroke(); }
    const hand = (a, L, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-Math.sin(a) * L * -.15, Math.cos(a) * L * .15); ctx.lineTo(Math.sin(a) * L, -Math.cos(a) * L); ctx.stroke(); };
    hand((h + m / 60) / 12 * TAU, r * .45, r * .085, INK); hand(m / 60 * TAU, r * .66, r * .06, INK); hand(sec / 60 * TAU, r * .72, r * .02, '#d9534f');
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, r * .06, 0, TAU); ctx.fill();
    ctx.globalAlpha = .35; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-r * .35, -r * .45, r * .32, r * .14, -.6, 0, TAU); ctx.fill();
    ctx.restore();
  };

  // melt(ctx, t, who, o): a person melted onto a desk — the head lying on its cheek (eyes to camera), the shoulders hunched behind it,
  //   one forearm flat on the desk in front, the hand limp by the chin. o { x, y (where the cheek meets the desk), s (face scale ≈ 3),
  //   deskY, expr, breath (px), side (+1 body to the right) }. Draw the desk top yourself BEFORE (it sits under the arm).
  A.melt = function (ctx, t, who, o = {}) {
    const S = C.SPEC[who], P = R.palOf(S, {}), s = o.s || 3, k = s / 3, x = o.x, y = o.y, br = o.breath ?? Math.sin(t * 2.1) * 3, sd = o.side || 1;
    const lw = 5 * Math.sqrt(k), X = v => x + sd * v * k, Y = v => y + v * k;
    // shoulders / upper back (behind the head)
    ctx.save(); ctx.translate(0, br * .6);
    const sh = WT.smooth([[X(110), Y(-110)], [X(290), Y(-220) - br], [X(490), Y(-210) - br], [X(600), Y(-140)], [X(620), Y(60)], [X(150), Y(60)]]);
    WT.inked(ctx, sh, P.shirt, lw); WT.cel(ctx, sh, P.shirt, WT.shadeOf(P.shirt), -18 * sd * k, 16 * k);
    ctx.strokeStyle = WT.rgba(INK, .5); ctx.lineWidth = lw * .6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X(330), Y(-205) - br); ctx.quadraticCurveTo(X(370), Y(-110), X(350), Y(-10)); ctx.stroke();   // a shirt fold
    ctx.restore();
    // forearm flat on the desk (rolled sleeve) and the limp hand under the chin
    const fa = WT.capsule([X(490), Y(30)], [X(110), Y(50)], 46 * k, 40 * k); WT.inked(ctx, fa, P.skin, lw); WT.cel(ctx, fa, P.skin, P.skinS || WT.shadeOf(P.skin), 0, 10 * k);
    const cuff = WT.capsule([X(560), Y(24)], [X(470), Y(28)], 60 * k, 57 * k); WT.inked(ctx, cuff, WT.mixC(P.shirt, '#ffffff', .25), lw);
    // the head on its cheek (crown away from the body)
    const G = C.face(ctx, t, who, X(-10), Y(-140) + br * .3, s, Object.assign({ expr: o.expr || 'dead', tilt: -1.2 * sd }, o.face || {}));
    R.hand(ctx, 'open', X(60), Y(50), sd > 0 ? Math.PI + .1 : -.1, 46 * k, sd, { skin: P.skin, skinS: P.skinS || WT.shadeOf(P.skin), line: INK, lw: lw * .9 });
    return G;
  };

  // castShadow(ctx, k, o): the soft silhouette shadow of someone standing behind the camera (head + shoulders) rising up over a
  //   panel from below; k = 0 (off-panel) … 1 (in place). o { x, y (where the head shadow lands), s, col, alpha }
  A.castShadow = function (ctx, k, o = {}) {
    if (k <= 0) return; const s = o.s || 1, x = lerp(o.x - 160 * s, o.x, eo(k)), y = lerp(o.y + 900 * s, o.y, eo(k));
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha *= (o.alpha ?? .7) * clamp(k * 2); ctx.filter = `blur(${5 * s}px)`;
    ctx.fillStyle = o.col || '#6a5c93'; ctx.beginPath();
    ctx.ellipse(x, y, 135 * s, 160 * s, .08, 0, TAU);                                       // head (neat, round)
    ctx.moveTo(x - 70 * s, y + 120 * s); ctx.lineTo(x + 70 * s, y + 120 * s); ctx.lineTo(x + 80 * s, y + 230 * s);
    ctx.quadraticCurveTo(x + 360 * s, y + 250 * s, x + 420 * s, y + 420 * s); ctx.lineTo(x + 470 * s, y + 1000 * s);   // shoulder, arm
    ctx.lineTo(x - 470 * s, y + 1000 * s); ctx.lineTo(x - 420 * s, y + 420 * s); ctx.quadraticCurveTo(x - 360 * s, y + 250 * s, x - 80 * s, y + 230 * s); ctx.closePath();
    ctx.fill(); ctx.restore();
  };

  // eyeBand(ctx, t, who, cx, cy, s, o): a face drawn so its EYE LINE sits at (cx, cy) — the extreme eye close-up for an eye strip.
  //   o = Rig options (expr, look, …). Returns G.
  A.eyeBand = function (ctx, t, who, cx, cy, s, o = {}) {
    const g = C.face(null, t, who, 0, 0, s, o), ey = (g.eyes[0][1] + g.eyes[1][1]) / 2, ex = (g.eyes[0][0] + g.eyes[1][0]) / 2;
    return C.face(ctx, t, who, cx - ex, cy - ey, s, o);
  };

  // boxRim(ctx, x, y, w, h, o): the near wall of a donut box seen very close (white board, pink stripe + logo) — the frame under a
  //   close-up donut. (x, y) = the top-left of the wall, w × h its size, o { lw, tilt (px the right end rises) }
  A.boxRim = function (ctx, x, y, w, h, o = {}) {
    const lw = o.lw || 6, tl = o.tilt || 0, PINK = WT.ACCENT;
    const p = WT.poly([[x, y + tl], [x + w, y], [x + w, y + h], [x, y + h + tl]]); WT.inked(ctx, p, '#fbf7f0', lw);
    ctx.save(); ctx.clip(p);
    const band = (y0, th, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y + y0 + tl); ctx.lineTo(x + w, y + y0); ctx.lineTo(x + w, y + y0 + th); ctx.lineTo(x, y + y0 + th + tl); ctx.fill(); };
    band(0, h * .09, '#efe6da'); band(h * .34, h * .14, PINK); band(h * .8, h * .3, '#ece3d6');
    const lx = x + w * .18, ly = y + h * .41 + tl * .82, ls = h * .2;
    for (const [rr, col] of [[1, PINK], [.62, '#fff'], [.45, PINK], [.17, '#fff']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(lx, ly, ls * rr, 0, TAU); ctx.fill(); }
    ctx.restore();
  };

  window.Ep1Art = A;
})();

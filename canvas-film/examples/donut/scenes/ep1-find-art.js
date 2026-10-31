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

  // boxRim(ctx, x, y, w, h, o): the near wall of an open cardboard donut box seen from just above — cream board with an inked outline,
  //   its cut top edge (thickness strip + highlight), the shadow it casts into the box (draw the wall AFTER the contents so it overlaps them),
  //   an optional right corner turning into the side wall, and the pink logo only as a small printed stamp.
  //   (x, y) = top-left of the outer face, w × h. o { lw, tilt (px the left end sits lower), lip (thickness px), corner (side-wall depth px),
  //   shadow (px of inner shadow above the lip), logo: [u (0…1 along the wall), r] }
  A.boxRim = function (ctx, x, y, w, h, o = {}) {
    const lw = o.lw || 6, tl = o.tilt || 0, lip = o.lip ?? 18, cd = o.corner || 0, PINK = WT.ACCENT, BOARD = '#f6eedf', BOARD_S = '#e3d5bd', EDGE = '#fffbf3';
    const yAt = u => y + tl * (1 - u);   // top edge y along the wall
    if (o.shadow) { const g = ctx.createLinearGradient(0, y - lip - o.shadow, 0, y - lip + 4); g.addColorStop(0, 'rgba(60,40,70,0)'); g.addColorStop(1, 'rgba(60,40,70,.42)');
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, yAt(0) - lip - o.shadow); ctx.lineTo(x + w + cd, y - cd * .55 - lip - o.shadow);
      ctx.lineTo(x + w + cd, y - cd * .55 - lip + 4); ctx.lineTo(x + w, y - lip + 4); ctx.lineTo(x, yAt(0) - lip + 4); ctx.closePath(); ctx.fill(); ctx.restore(); }
    // side wall turning back at the right corner
    if (cd > 0) { const sp = WT.poly([[x + w, y], [x + w + cd, y - cd * .55], [x + w + cd, y - cd * .55 + h], [x + w, y + h]]); WT.inked(ctx, sp, BOARD_S, lw);
      const sl = WT.poly([[x + w, y], [x + w + cd, y - cd * .55], [x + w + cd - lip * .6, y - cd * .55 - lip], [x + w - lip * .6, y - lip]]); WT.inked(ctx, sl, EDGE, lw * .8); }
    // the outer face
    const fp = WT.poly([[x, yAt(0)], [x + w, y], [x + w, y + h], [x, y + h + tl]]); WT.inked(ctx, fp, BOARD, lw);
    ctx.save(); ctx.clip(fp);
    const sg = ctx.createLinearGradient(0, y, 0, y + h); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.55, 'rgba(255,255,255,0)'); sg.addColorStop(1, WT.rgba(BOARD_S, .9));
    ctx.fillStyle = sg; ctx.fillRect(x - 2, y - 2 - Math.abs(tl), w + 4, h + Math.abs(tl) * 2 + 4);
    ctx.strokeStyle = 'rgba(190,170,140,.22)'; ctx.lineWidth = 2; for (let i = 1; i < 40; i++) { const xx = x + i * w / 40; ctx.beginPath(); ctx.moveTo(xx, yAt(i / 40) + h * .12); ctx.lineTo(xx, y + h + tl); ctx.stroke(); }   // board fibre
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = lw * .9; ctx.beginPath(); ctx.moveTo(x, yAt(0) + lw * 1.2); ctx.lineTo(x + w, y + lw * 1.2); ctx.stroke();   // top-edge highlight
    ctx.strokeStyle = WT.rgba(INK, .35); ctx.lineWidth = lw * .45; ctx.beginPath(); ctx.moveTo(x, yAt(0) + h * .16); ctx.lineTo(x + w, y + h * .16); ctx.stroke();   // the fold crease
    const [lu, lr] = o.logo || [.7, h * .17], lx = x + w * lu, ly = yAt(lu) + h * .55;
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(-.06); ctx.globalAlpha *= .92;
    for (const [rr, col] of [[1, PINK], [.66, BOARD], [.48, PINK], [.2, BOARD]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, lr * rr, 0, TAU); ctx.fill(); }
    ctx.restore(); ctx.restore();
    // the cut top edge (board thickness) seen from above
    const lp = WT.poly([[x, yAt(0)], [x + w, y], [x + w - lip * .6, y - lip], [x - lip * .6, yAt(0) - lip]]); WT.inked(ctx, lp, EDGE, lw * .8);
    ctx.strokeStyle = WT.rgba(BOARD_S, .9); ctx.lineWidth = lw * .5; ctx.beginPath(); ctx.moveTo(x, yAt(0) - lip * .45); ctx.lineTo(x + w - lip * .3, y - lip * .45); ctx.stroke();   // corrugation core
  };

  window.Ep1Art = A;
})();

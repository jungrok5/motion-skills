/* kit-gamecartoon.js — mobile-game-ad cartoon (게임 광고 카툰: 굵은 잉크 외곽선, 셀 그림자, 광택), a word-log house style.
   Global: window.GameCartoon
   Every near shape has a thick dark-plum ink outline (stroked under the fill), a flat base colour, ONE hard cel shadow and a
   glossy highlight. A banded storm sky with puffy cel clouds (and lightning), far city + two hill layers in parallax, a
   side-on platformer world: grass bank, a dirt road (top band + front face), a meadow with bushes and flowers, a ravine
   cut through the land; a stone arch whose door leaks golden light (the accent light). The genre's motion: squash on
   footfalls, anticipation and overshoot, smears, speed lines and rings, dust puffs, chips, a crash-zoom + shake + white
   flash on the hit; captions as chunky game-title text with a pop. Default character: a chibi cat (orange, blue goggles,
   red scarf = me; quieter grey/cream/brown/slate cats = the others), two arms reaching to grip points, crouch, squash.
   Load after lib.js and story.js:  <script src="lib.js"></script><script src="story.js"></script><script src="kit-gamecartoon.js"></script>
   Units: world px; the camera { x, y, z, sx, sy } = the world point at the frame centre; layer(ctx, cm, p, fn) draws a
   parallax layer p (1 = the world). Pure and deterministic: state = the sky sprites / vignette built by init(); seeded only.
   Worked example: sermons/2026-10-24-cross-styles/film/scenes/cs-gamecartoon.html (잘라 낸 건 다리였다 · 17). */
(function () {
  const { clamp, lerp, ss, eo, eio, rng } = Pilot;
  const W = 1080, H = 1920, TAU = Math.PI * 2;
  const K = {}; K.W = W; K.H = H; K.TAU = TAU;

  // ---------------- palette & type ----------------
  const FONT = "'Jua',sans-serif";
  const INK = '#24152e';
  const C = { fur: '#ffad2e', furS: '#e07a1c', stripe: '#e0741a', cream: '#fff3dc', creamS: '#f0cfa6', pink: '#ff8fa8',
    goggle: '#9aa6bd', goggleS: '#6c7690', lens: '#5ec8ff', lensS: '#2b8fe0', band: '#2f7fe0', bandS: '#1f5cb0', scarf: '#ef3b36', scarfS: '#b8222a',
    boot: '#7a4526', bootS: '#552f1a', buckle: '#ffd23a',
    road: '#a98a6c', roadS: '#8a6b52', roadTop: '#d8b48a', roadTopS: '#c29d74', grass: '#46c24a', grassS: '#2e9a3c', grassH: '#8be86a',
    dirt: '#8a5f43', dirtS: '#6b4733', dirtD: '#4e3326', hill1: '#5d8f86', hill2: '#3f6f6a',
    stone: '#c7c1d6', stoneS: '#968fae', door: '#8a5530', doorS: '#5f381e',
    gold: '#ffd75e', light: '#fff4c8', light2: '#ffc65a' };
  // golden wood = the ONE accent object (mine); weathered grey-brown wood = everyone else's
  const XME = { wood: '#ffc436', woodS: '#e2891a', woodH: 'rgba(255,250,200,.85)', grain: '#d9821c', end: '#ffe9a6' };
  const XPI = { wood: '#a8957f', woodS: '#82705f', woodH: 'rgba(255,255,255,.35)', grain: '#8d7a66', end: '#d8cab6' };
  // the cats: me (orange, goggles, red scarf), and four quieter pilgrims
  const PME = { fur: C.fur, furS: C.furS, stripe: C.stripe, cream: C.cream, creamS: C.creamS, scarf: C.scarf, scarfS: C.scarfS, boot: C.boot, bootS: C.bootS, goggles: true };
  const PPI = [
    { fur: '#a3a8b4', furS: '#7e8494', stripe: '#848a99', cream: '#ebe8e1', creamS: '#c9c4bb', scarf: '#6f7fa0', scarfS: '#55617e', boot: '#5d5048', bootS: '#463c36' },
    { fur: '#dccaa9', furS: '#b9a382', stripe: '#c4ac87', cream: '#f4eee2', creamS: '#d8ccb8', scarf: '#7d8f73', scarfS: '#5f6f57', boot: '#6a5544', bootS: '#4d3d31' },
    { fur: '#a98769', furS: '#86674c', stripe: '#8e6d51', cream: '#eee3d3', creamS: '#cfbfa9', scarf: '#7a8797', scarfS: '#5d6878', boot: '#55463b', bootS: '#3f342c' },
    { fur: '#767b8c', furS: '#5b6070', stripe: '#626778', cream: '#dcdad6', creamS: '#b9b6b0', scarf: '#9a8468', scarfS: '#796650', boot: '#4f463f', bootS: '#3a332e' },
  ];
  K.FONT = FONT; K.INK = INK; K.C = C; K.WOOD = { gold: XME, grey: XPI }; K.PME = PME; K.PPI = PPI;
  K.ACCENT = XME.wood;                                                      // the golden thing (+ C.gold / C.light for light)
  K.FONTS = ["400 84px 'Jua'"];                                             // Pilot.run({ fonts: GameCartoon.FONTS })
  K.FONT_LINK = 'https://fonts.googleapis.com/css2?family=Jua&display=swap';
  const frac = K.frac = x => x - Math.floor(x);
  K.t12 = t => Math.floor(t * 12 + 1e-6) / 12;                              // characters act on twos (12 fps); camera on ones
  const lerpP = K.lerpP = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

  // ---------------- ink + cel ----------------
  // inked(ctx, path, fill, ow): the outline stroked UNDER the fill (ow = outline px beyond the shape);
  // cel(ctx, path, col, dx, dy): one hard cel shadow — the shape minus itself shifted by (dx, dy) (shadow on the far side);
  // shine(ctx, x, y, rx, ry, rot, col): a gloss ellipse; P2(f) → Path2D; ell(x, y, rx, ry, rot); rr(x, y, w, h, r); star(ctx, x, y, s, col): a 4-point sparkle
  function inked(ctx, p, fill, ow = 9) { ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = ow * 2; ctx.stroke(p); ctx.fillStyle = fill; ctx.fill(p); }
  function cel(ctx, p, col, dx, dy) {
    ctx.save(); ctx.clip(p); const q = new Path2D(); q.rect(-9000, -9000, 18000, 18000); q.addPath(p, new DOMMatrix([1, 0, 0, 1, dx, dy]));
    ctx.fillStyle = col; ctx.fill(q, 'evenodd'); ctx.restore(); }
  function shine(ctx, x, y, rx, ry, rot, col = 'rgba(255,255,255,.75)') { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); }
  const P2 = f => { const p = new Path2D(); f(p); return p; };
  const ell = (x, y, rx, ry, r = 0) => P2(p => p.ellipse(x, y, rx, ry, r, 0, TAU));
  const rr = (x, y, w, h, r) => P2(p => p.roundRect(x, y, w, h, r));
  function star(ctx, x, y, s, col) { if (s < .5) return; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - s * 2);
    ctx.quadraticCurveTo(x, y, x + s * 2, y); ctx.quadraticCurveTo(x, y, x, y + s * 2); ctx.quadraticCurveTo(x, y, x - s * 2, y); ctx.quadraticCurveTo(x, y, x, y - s * 2); ctx.fill(); }
  Object.assign(K, { inked, cel, shine, P2, ell, rr, star });

  // ---------------- the cat (any palette, facing, two arms, crouch, expressions) ----------------
  // F = { x, gy, s (scale; .64 hero / .58 others), f (+1 faces right), sx, sy (squash), lean (rad), bob, hop, crouch (0..1), ph, amp,
  //       stride, lift (walk), pal, eye: calm|tired|happy|focus|shock|sad|big, mouth: w|oh|frown|grin, tilt (head, + = forward/down,
  //       − = looks up), blink, sweat, seed, alpha,
  //       far / near: world points the paws go to (null = hanging), farKind / nearKind: 'fist'|'flat', farFront (far arm over the
  //       body), farPawFront, farReach (max arm length, 205), mid(ctx) [world space, between body and head — a held object],
  //       sawFn(ctx) or prop(ctx) [world space, drawn just before the near arm — a tool in the near paw] }
  function catMatrix(F) { return new DOMMatrix().translate(F.x, F.gy + (F.hop || 0)).scale(F.f * F.s * (F.sx || 1), F.s * (F.sy || 1)).rotate((F.lean || 0) * 180 / Math.PI); }
  function toLocal(F, M, p) { if (!p) return null; const q = M.inverse().transformPoint(new DOMPoint(p[0], p[1])); return [q.x, q.y]; }
  function toWorld(M, p) { const q = M.transformPoint(new DOMPoint(p[0], p[1])); return [q.x, q.y]; }
  function leg(ctx, P, x, y, lift, front, crouch) {
    const h = 62 * (1 - .35 * crouch), p = rr(x - 24, y - 12 - h - lift, 48, h, 22); inked(ctx, p, front ? P.fur : P.furS, 8); if (front) cel(ctx, p, P.furS, 10, -8);
    const b = P2(q => q.roundRect(x - 28, y - 30 - lift, 64, 32, [16, 18, 8, 8])); inked(ctx, b, front ? P.boot : P.bootS, 8); cel(ctx, b, P.bootS, 0, -10);
    if (front) shine(ctx, x + 14, y - 22 - lift, 10, 4, 0, 'rgba(255,255,255,.45)');
  }
  function arm(ctx, P, sh, hand, front, kind, R = 205) {
    let hx = hand[0], hy = hand[1]; const dx = hx - sh[0], dy = hy - sh[1], d = Math.hypot(dx, dy) || 1;
    if (d > R) { hx = sh[0] + dx / d * R; hy = sh[1] + dy / d * R; }
    const mx = (sh[0] + hx) / 2 - dy / d * 14, my = (sh[1] + hy) / 2 + dx / d * 14;
    const a = new Path2D(); a.moveTo(sh[0], sh[1]); a.quadraticCurveTo(mx, my, hx, hy);
    ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 54; ctx.stroke(a); ctx.strokeStyle = front ? P.fur : P.furS; ctx.lineWidth = 36; ctx.stroke(a);
    return [hx, hy];
  }
  function paw(ctx, P, hx, hy, kind, front) {
    const p = kind === 'flat' ? ell(hx, hy, 32, 19) : ell(hx, hy, 26, 24); inked(ctx, p, front ? P.cream : P.creamS, 7); cel(ctx, p, P.creamS, 6, -6);
    if (kind !== 'flat') { ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = 'round'; for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + 8 * k, hy - 6); ctx.lineTo(hx + 6 * k, hy + 6); ctx.stroke(); } }
  }
  function catBody(ctx, t, F, P) {   // tail, legs, body (local)
    const ph = F.ph || 0, amp = F.amp || 0, st = F.stride || 1, lf = F.lift || 1, cr = F.crouch || 0;
    const tw = Math.sin(t * 3 + (F.seed || 0)) * 14 + Math.sin(ph) * 8 * amp;
    const tail = new Path2D(); tail.moveTo(-60, -100 + 50 * cr); tail.bezierCurveTo(-150, -110 + 50 * cr, -170 + tw, -40 + 40 * cr, -200 + tw, -150 + 40 * cr);
    ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 50; ctx.stroke(tail); ctx.strokeStyle = P.fur; ctx.lineWidth = 32; ctx.stroke(tail);
    ctx.strokeStyle = P.stripe; ctx.lineWidth = 32; ctx.setLineDash([16, 22]); ctx.stroke(tail); ctx.setLineDash([]);
    const L1 = Math.sin(ph) * amp, L2 = -L1, lift = v => Math.max(0, v) * 34 * lf, sp = 38 * st;
    leg(ctx, P, -38 - 14 * cr + sp * L2, 0, lift(L2), false, cr);
    ctx.save(); ctx.translate(0, 50 * cr);
    const bodyP = P2(q => { q.moveTo(-90, -100); q.bezierCurveTo(-110, -230, 60, -290, 100, -170); q.bezierCurveTo(120, -100, 80, -40, 10, -40); q.bezierCurveTo(-60, -40, -86, -60, -90, -100); q.closePath(); });
    inked(ctx, bodyP, P.fur); cel(ctx, bodyP, P.furS, 26, -22);
    ctx.save(); ctx.clip(bodyP); ctx.fillStyle = P.cream; ctx.fill(ell(48, -120, 52, 70, -.2)); cel(ctx, ell(48, -120, 52, 70, -.2), P.creamS, 14, -12);
    ctx.strokeStyle = P.stripe; ctx.lineWidth = 14; ctx.lineCap = 'round';
    for (const [x, y] of [[-70, -160], [-60, -120], [-40, -205]]) { ctx.beginPath(); ctx.moveTo(x - 20, y); ctx.lineTo(x + 18, y + 6); ctx.stroke(); } ctx.restore();
    ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.stroke(bodyP);
    ctx.restore();
    leg(ctx, P, 34 + 14 * cr + sp * L1, 0, lift(L1), true, cr);
  }
  function catScarf(ctx, t, F, P) {
    const fl = t * 9 + (F.seed || 0), wind = 1 + (F.amp || 0) * .4 * (F.stride || 1);
    const p = P2(q => { q.moveTo(-60, -250); for (let i = 0; i <= 6; i++) { const f = i / 6; q.lineTo(-60 - f * 150 * wind, -250 + f * 30 + Math.sin(fl + f * 5) * 14 * f); }
      for (let i = 6; i >= 0; i--) { const f = i / 6; q.lineTo(-60 - f * 140 * wind, -214 + f * 40 + Math.sin(fl + f * 5 + .6) * 14 * f); } q.closePath(); });
    inked(ctx, p, P.scarf, 7); cel(ctx, p, P.scarfS, 0, -12);
    const band = rr(-70, -262, 170, 50, 25); inked(ctx, band, P.scarf, 8); cel(ctx, band, P.scarfS, 10, -14); shine(ctx, 30, -248, 30, 6, 0, 'rgba(255,255,255,.5)');
  }
  function catHead(ctx, t, F, P) {   // local, origin = neck (translated by the caller)
    const eye = F.eye || 'calm';
    const earL = P2(q => { q.moveTo(-110, -60); q.quadraticCurveTo(-130, -170, -80, -190); q.quadraticCurveTo(-30, -150, -20, -100); q.closePath(); });
    const earR = P2(q => { q.moveTo(40, -110); q.quadraticCurveTo(70, -200, 120, -190); q.quadraticCurveTo(140, -130, 120, -60); q.closePath(); });
    for (const e of [earL, earR]) { inked(ctx, e, P.fur); cel(ctx, e, P.furS, 14, -10); }
    ctx.fillStyle = C.pink; ctx.fill(P2(q => { q.moveTo(-96, -90); q.quadraticCurveTo(-104, -150, -80, -166); q.quadraticCurveTo(-52, -140, -46, -110); q.closePath(); }));
    ctx.fill(P2(q => { q.moveTo(62, -116); q.quadraticCurveTo(82, -170, 108, -168); q.quadraticCurveTo(118, -130, 108, -90); q.closePath(); }));
    const hp = ell(10, -20, 140, 118);
    inked(ctx, hp, P.fur); cel(ctx, hp, P.furS, 30, -26); shine(ctx, -40, -118, 46, 14, -.25, 'rgba(255,255,255,.5)');
    ctx.save(); ctx.clip(hp); ctx.fillStyle = P.stripe;
    for (const [x, w] of [[-30, 16], [0, 14], [28, 12]]) { ctx.beginPath(); ctx.moveTo(x - w / 2, -140); ctx.lineTo(x + w / 2, -140); ctx.lineTo(x + 2, -96); ctx.fill(); }
    const mz = ell(62, 34, 92, 62, -.1); ctx.fillStyle = P.cream; ctx.fill(mz); cel(ctx, mz, P.creamS, 16, -16);
    ctx.restore(); ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.stroke(hp);
    if (P.goggles) {
      ctx.save(); ctx.clip(hp); const band = P2(q => { q.moveTo(-140, -60); q.quadraticCurveTo(10, -130, 160, -80); q.lineTo(160, -52); q.quadraticCurveTo(10, -100, -140, -30); q.closePath(); });
      inked(ctx, band, C.band, 4); cel(ctx, band, C.bandS, 0, -8); ctx.restore();
      for (const [gx, gy] of [[8, -88], [86, -74]]) { const fr = ell(gx, gy, 38, 34); inked(ctx, fr, C.goggle, 8); cel(ctx, fr, C.goggleS, 8, -8);
        const ln = ell(gx, gy, 24, 21); inked(ctx, ln, C.lens, 4); cel(ctx, ln, C.lensS, 6, -8); shine(ctx, gx - 8, gy - 8, 7, 5, -.5, 'rgba(255,255,255,.9)'); }
    }
    // eyes
    const blink = F.blink ? 1 : 0;
    for (const [ex, ey] of [[30, 6], [104, 12]]) {
      ctx.strokeStyle = INK; ctx.lineCap = 'round';
      if (blink || eye === 'tired') { ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(ex - 18, ey + 2); ctx.quadraticCurveTo(ex, ey + 12, ex + 18, ey + 2); ctx.stroke();
        if (!blink) { ctx.beginPath(); ctx.moveTo(ex - 16, ey - 12); ctx.lineTo(ex + 14, ey - 18 + (ex > 60 ? 4 : 0)); ctx.lineWidth = 6; ctx.stroke(); } }
      else if (eye === 'happy') { ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(ex - 17, ey + 8); ctx.quadraticCurveTo(ex, ey - 16, ex + 17, ey + 8); ctx.stroke(); }
      else if (eye === 'focus') { inked(ctx, ell(ex, ey + 4, 13, 12), '#1d1226', 0); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(ex - 20, ey - 8); ctx.lineTo(ex + 18, ey - 4); ctx.stroke(); shine(ctx, ex - 4, ey, 4, 4, 0, '#fff'); }
      else if (eye === 'shock') { inked(ctx, ell(ex, ey, 22, 27), '#ffffff', 5); inked(ctx, ell(ex + 3, ey + 2, 6, 7), '#1d1226', 0); }
      else if (eye === 'sad' || eye === 'big') { const s = eye === 'big' ? 1.18 : 1.05; inked(ctx, ell(ex, ey, 17 * s, 23 * s), '#1d1226', 0);
        shine(ctx, ex - 5 * s, ey - 9 * s, 7 * s, 8 * s, 0, '#ffffff'); shine(ctx, ex + 6 * s, ey + 8 * s, 3.5 * s, 3.5 * s, 0, '#ffffff');
        if (eye === 'sad') { ctx.strokeStyle = 'rgba(160,225,255,.95)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ex - 14, ey + 20); ctx.quadraticCurveTo(ex, ey + 27, ex + 14, ey + 20); ctx.stroke();
          ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(ex - 16, ey - 34 + (ex > 60 ? 0 : 8)); ctx.lineTo(ex + 14, ey - 38 + (ex > 60 ? 8 : 0)); ctx.stroke(); }
        else star(ctx, ex + 8 * s, ey - 12 * s, 3 * s, '#ffffff'); }
      else { inked(ctx, ell(ex, ey + 2, 11, 15), '#1d1226', 0); shine(ctx, ex - 3, ey - 4, 4, 5, 0, '#ffffff'); }   // calm dot eyes
    }
    shine(ctx, 0, 46, 22, 12, 0, 'rgba(255,120,150,.5)'); shine(ctx, 136, 50, 18, 11, 0, 'rgba(255,120,150,.5)');
    inked(ctx, P2(q => { q.moveTo(70, 30); q.lineTo(90, 30); q.lineTo(80, 42); q.closePath(); }), C.pink, 3);
    ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.lineCap = 'round';
    const m = F.mouth || 'w';
    if (m === 'oh') inked(ctx, ell(80, 66, 12, 15), '#c8304a', 4);
    else if (m === 'frown') { ctx.beginPath(); ctx.moveTo(64, 64); ctx.quadraticCurveTo(80, 52, 96, 64); ctx.stroke(); }
    else if (m === 'grin') { inked(ctx, P2(q => { q.moveTo(58, 52); q.quadraticCurveTo(80, 86, 104, 52); q.closePath(); }), '#c8304a', 4); }
    else { ctx.beginPath(); ctx.moveTo(60, 50); ctx.quadraticCurveTo(68, 62, 80, 50); ctx.quadraticCurveTo(92, 62, 100, 50); ctx.stroke(); }
    ctx.lineWidth = 4; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(150, 38 + s * 8); ctx.lineTo(186, 30 + s * 16); ctx.stroke(); }
    if (F.sweat) { const u = frac((t + (F.seed || 0)) / 1.1), y = -60 + u * 50; ctx.save(); ctx.globalAlpha *= 1 - u;
      inked(ctx, P2(q => { q.moveTo(-120, y - 26); q.quadraticCurveTo(-100, y, -110, y + 8); q.quadraticCurveTo(-130, y + 4, -120, y - 26); }), '#8fe0ff', 3); ctx.restore(); }
  }
  const SH_NEAR = [52, -160], SH_FAR = [-14, -168];   // shoulders on the body, below the head
  function drawCat(ctx, t, F) {
    const P = F.pal, al = F.alpha ?? 1; if (al <= 0) return;
    const Wm = ctx.getTransform(), M = catMatrix(F), cr = F.crouch || 0;
    ctx.save(); ctx.globalAlpha = al;
    ctx.setTransform(Wm.multiply(M)); ctx.translate(0, F.bob || 0);
    const farL = toLocal(F, M, F.far), nearL = toLocal(F, M, F.near);
    const upY = 50 * cr, shN = [SH_NEAR[0], SH_NEAR[1] + upY], shF = [SH_FAR[0], SH_FAR[1] + upY];
    const farH = farL || [shF[0] - 20, shF[1] + 120], nearH = nearL || [shN[0] + 30, shN[1] + 110];
    catScarf(ctx, t, F, P);
    let fh = null; if (!F.farFront) fh = arm(ctx, P, shF, farH, false, F.farKind, F.farReach || 205);
    catBody(ctx, t, F, P);
    if (F.mid) { ctx.save(); ctx.setTransform(Wm); F.mid(ctx); ctx.restore(); }
    if (fh && F.farPawFront === false) paw(ctx, P, fh[0], fh[1], F.farKind, false);
    ctx.save(); ctx.translate(20, -300 + upY); ctx.rotate(F.tilt || 0); catHead(ctx, t, F, P); ctx.restore();
    if (F.farFront) fh = arm(ctx, P, shF, farH, false, F.farKind, F.farReach || 205);
    if (fh && F.farPawFront !== false) paw(ctx, P, fh[0], fh[1], F.farKind, false);
    const pf = F.sawFn || F.prop; if (pf) { ctx.save(); ctx.setTransform(Wm); pf(ctx); ctx.restore(); }
    const nh = arm(ctx, P, shN, nearH, true); paw(ctx, P, nh[0], nh[1], F.nearKind, true);
    ctx.restore();
  }
  Object.assign(K, { catMatrix, toLocal, toWorld, leg, arm, paw, catBody, catScarf, catHead, drawCat, SH_NEAR, SH_FAR });

  // ---------------- holding a long object (a beam, a pole, a cross) ----------------
  // X = { x, y, a, … }: the object's foot end (u = 0) and axis angle; objPt(X, u, v) → world point; rotAbout(X, pivot, th)
  K.objPt = (X, u, v = 0) => [X.x + Math.cos(X.a) * u - Math.sin(X.a) * v, X.y + Math.sin(X.a) * u + Math.cos(X.a) * v];
  K.rotAbout = function (X, pv, th) { const ox = X.x - pv[0], oy = X.y - pv[1]; return { ...X, x: pv[0] + ox * Math.cos(th) - oy * Math.sin(th), y: pv[1] + ox * Math.sin(th) + oy * Math.cos(th), a: X.a + th }; };
  // carryGeom(F, mode, at, u0) — cat-local: 'shoulder' = on the shoulder, the point u = at riding ahead of the face, the far paw
  // holding it at the back of the neck, the foot trailing behind; 'front' = held up in front, nearly upright, both paws on the
  // post (near paw at the chest on the lower end u0, far paw higher up). Returns { J (where u = at sits), a, far, near (grip u) }.
  K.carryGeom = function (F, mode, at, u0 = 0) {
    const s = F.s;
    if (mode === 'shoulder') { const J = [250, -372], g = [-100, -172]; return { J, a: -.52, far: at - Math.hypot(J[0] - g[0], J[1] - g[1]) * s, near: null }; }
    const a = -1.5 - (F.lean || 0), d = [Math.cos(a), Math.sin(a)], Pn = [205, -185], /* stays upright in the world whatever my lean */ st = [Pn[0] - 25 * d[0], Pn[1] - 25 * d[1]], dl = (at - u0) / s;
    return { J: [st[0] + dl * d[0], st[1] + dl * d[1]], a, far: u0 + 4 * s, near: u0 + 30 * s };
  };
  // carryX(F, mode, at, u0) → the object's world X = { x, y, a, gf, gn } (gf / gn = the far / near paw's grip u, gn null = free)
  K.carryX = function (F, mode, at, u0 = 0) { const g = K.carryGeom(F, mode, at, u0), M = catMatrix(F), up = 50 * (F.crouch || 0) + (F.bob || 0);
    const J = toWorld(M, [g.J[0], g.J[1] + up]), J2 = toWorld(M, [g.J[0] + Math.cos(g.a) * 100, g.J[1] + up + Math.sin(g.a) * 100]), a = Math.atan2(J2[1] - J[1], J2[0] - J[0]);
    return { x: J[0] - Math.cos(a) * at, y: J[1] - Math.sin(a) * at, a, gf: g.far, gn: g.near }; };
  // gripCarry(F, X): put the paws on the carried object (far paw at gf, near at gn or free)
  K.gripCarry = function (F, X) { F.far = K.objPt(X, X.gf, 0); F.farKind = 'fist'; F.farReach = 270; F.near = X.gn != null ? K.objPt(X, X.gn, 0) : null; F.nearKind = 'fist'; return F; };

  // ---------------- poses ----------------
  // walkSpec(x, gy, s, f, phase (cycles), o): squash on each footfall — o.amp, o.stride, o.lift, o.lean, o.tilt, o.eye, o.mouth;
  // standSpec(x, gy, s, f, o): o.lean, o.crouch, o.tilt, o.eye, o.mouth; kneelSpec(…): down low over something (crouch .6);
  // mixSpec(A, B, k): an in-between (paws interpolate; set F.f yourself for a turn and squash F.sx through the middle)
  function walkSpec(x, gy, s, f, ph, o = {}) {
    const amp = o.amp ?? 1, fall = Math.pow(Math.abs(Math.cos(TAU * ph)), 6) * amp, st = o.stride ?? 1;
    return { x, gy, s, f, ph: TAU * ph, amp, stride: st, lift: o.lift ?? 1, sx: 1 + .05 * fall * st, sy: 1 - .07 * fall * st,
      bob: 12 * fall - 6 * amp * Math.abs(Math.sin(TAU * ph)) * st, lean: o.lean ?? .1, crouch: 0, tilt: o.tilt ?? .05, eye: o.eye || 'calm', mouth: o.mouth || 'w' };
  }
  function standSpec(x, gy, s, f, o = {}) { return { x, gy, s, f, ph: 0, amp: 0, stride: 1, sx: 1, sy: 1, bob: 0, lean: o.lean ?? .02, crouch: o.crouch ?? 0, tilt: o.tilt ?? 0, eye: o.eye || 'calm', mouth: o.mouth || 'w' }; }
  function mixSpec(A, Bs, k) {
    if (k <= 0) return A; if (k >= 1) return Bs; const pick = k < .5 ? A : Bs, l2 = (a, b) => a && b ? [lerp(a[0], b[0], k), lerp(a[1], b[1], k)] : (k < .5 ? a : b);
    return { ...pick, x: lerp(A.x, Bs.x, k), gy: lerp(A.gy, Bs.gy, k), s: lerp(A.s, Bs.s, k), sx: lerp(A.sx, Bs.sx, k), sy: lerp(A.sy, Bs.sy, k), bob: lerp(A.bob, Bs.bob, k),
      lean: lerp(A.lean, Bs.lean, k), crouch: lerp(A.crouch || 0, Bs.crouch || 0, k), tilt: lerp(A.tilt || 0, Bs.tilt || 0, k), amp: lerp(A.amp || 0, Bs.amp || 0, k),
      far: l2(A.far, Bs.far), near: l2(A.near, Bs.near) };
  }
  function kneelSpec(x, gy, s, f, o = {}) { return standSpec(x, gy, s, f, { lean: .5, crouch: .62, tilt: .22, ...o }); }
  Object.assign(K, { walkSpec, standSpec, kneelSpec, mixSpec });

  // ---------------- camera ----------------
  // layer(ctx, cm, p, fn): draw fn in a parallax layer p (1 = the world, .12 = far city); view(cm, p): its visible rect (+40 px)
  // mixCam(a, b, k); shake(t, t0, ax = 22, ay = 16, dur = .55) → [sx, sy]
  function layer(ctx, cm, p, fn) { const z = 1 + (cm.z - 1) * p, cx = cm.x * p, cy = 960 + (cm.y - 960) * p; ctx.save(); ctx.setTransform(z, 0, 0, z, 540 - cx * z + cm.sx * p, 960 - cy * z + cm.sy * p); fn(z, cx); ctx.restore(); }
  function view(cm, p = 1) { const z = 1 + (cm.z - 1) * p, cx = cm.x * p, cy = 960 + (cm.y - 960) * p; return { x0: cx - 540 / z - 40, x1: cx + 540 / z + 40, y0: cy - 960 / z - 40, y1: cy + 960 / z + 40 }; }
  K.layer = layer; K.view = view;
  K.mixCam = (a, b, k) => k <= 0 ? a : k >= 1 ? b : { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
  K.shake = (t, t0, ax = 22, ay = 16, dur = .55) => { if (t < t0) return [0, 0]; const k = 1 - ss(t0, t0 + dur, t); return [ax * k * Math.sin(t * 97), ay * k * Math.sin(t * 131 + 1)]; };

  // ---------------- sky + far layers (screen space / parallax) ----------------
  let SKY, SKYW, CLOUDS = [], VIG;
  function buildSky() {
    const mk = bands => { const c = Pilot.canvas(W, H), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 1500); bands.forEach(([o, col]) => g.addColorStop(o, col)); x.fillStyle = g; x.fillRect(0, 0, W, H); return c; };
    SKY = mk([[0, '#2c3556'], [.35, '#46557a'], [.7, '#6f7f9f'], [1, '#9aa4b8']]);
    SKYW = mk([[0, '#3d5fa8'], [.3, '#7d8fd0'], [.6, '#ffb0a0'], [.85, '#ffd27a'], [1, '#fff0b8']]);
    const r = rng(7);
    for (let i = 0; i < 12; i++) { const cl = { x: r() * 1700 - 200, y: 110 + i * 82 + r() * 50, s: (1.45 - i * .07) * (.8 + r() * .5), seed: i * 13 + 3, sp: 6 + r() * 9 };
      cl.spr = [cloudSprite(cl, ['#56628a', '#3a4466', '#77839f']), cloudSprite(cl, ['#ffd9b0', '#e8908c', '#fff8d8'])]; CLOUDS.push(cl); }
  }
  function cloudPath(s, seed) {
    const r = rng(seed), p = new Path2D(), n = 5 + Math.floor(r() * 3), w = 260 * s;
    for (let i = 0; i < n; i++) { const f = i / (n - 1), x = (f - .5) * w, rad = (60 + r() * 50) * s * (1 - Math.abs(f - .5) * .8), y = -rad * .5 - r() * 20 * s; p.moveTo(x + rad, y); p.arc(x, y, rad, 0, TAU); }
    p.moveTo(-w * .55, 0); p.roundRect(-w * .55, -30 * s, w * 1.1, 34 * s, 17 * s); return p;
  }
  function cloudSprite(cl, pal) {
    const p = cloudPath(cl.s, cl.seed), w = Math.ceil(420 * cl.s), h = Math.ceil(260 * cl.s), c = Pilot.canvas(w, h), x = c.getContext('2d');
    x.translate(w / 2, h * .72); x.fillStyle = pal[0]; x.fill(p);
    x.save(); x.clip(p); x.fillStyle = pal[1]; x.fillRect(-w, -h, 2 * w, 2 * h); x.translate(-8 * cl.s, -30 * cl.s); x.fillStyle = pal[0]; x.fill(p); x.restore();
    const q = new Path2D(); q.addPath(p, new DOMMatrix([1, 0, 0, 1, 10 * cl.s, 22 * cl.s]));
    const rim = Pilot.canvas(w, h), rx = rim.getContext('2d'); rx.translate(w / 2, h * .72); rx.fillStyle = pal[2]; rx.fill(p); rx.globalCompositeOperation = 'destination-out'; rx.fill(q);
    x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(rim, 0, 0); return c;
  }
  function bolt(ctx, t, t0) {
    const u = t - t0; if (u < 0 || u > .32) return; if (!(u < .06 || (u > .12 && u < .2))) return;
    const r = rng(77 + Math.round(t0)), pts = [[180 + r() * 200, 300]]; for (let i = 0; i < 9; i++) { const [x, y] = pts[pts.length - 1]; pts.push([x + (r() - .45) * 70, y + 70 + r() * 40]); }
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(200,215,255,.18)'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(170,200,255,.6)'; ctx.lineWidth = 16; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.stroke(); ctx.restore();
  }
  // sky(ctx, t, cm, warm, bolts): the storm sky (warm 0..1 blends to a golden sunset sky), drifting cel clouds, lightning at each bolt time
  function sky(ctx, t, cm, warm, bolts = []) {   // screen space, a slight parallax with the camera
    ctx.drawImage(SKY, 0, 0);
    if (warm > 0) { ctx.save(); ctx.globalAlpha = warm; ctx.drawImage(SKYW, 0, 0); ctx.restore(); }
    const ox = -cm.x * .05, oy = -(cm.y - 1100) * .05;
    for (const cl of CLOUDS) {
      const x = ((((cl.x + t * cl.sp + ox) % 1900) + 1900) % 1900) - 400, y = cl.y + oy, w = cl.spr[0].width, h = cl.spr[0].height;
      ctx.drawImage(cl.spr[0], x - w / 2, y - h * .72);
      if (warm > 0) { ctx.save(); ctx.globalAlpha = warm; ctx.drawImage(cl.spr[1], x - w / 2, y - h * .72); ctx.restore(); }
    }
    for (const b of bolts) bolt(ctx, t, b);
  }
  const hillY = (x, base, amp, per, n) => base - amp * (.6 + .4 * Math.sin(TAU * n * x / (per * 4)) * Math.sin(TAU * x / (per * 2) + 1));
  function farLayers(ctx, cm, warm) {
    const mixC = (a, b) => Pilot.rgb(Pilot.mix(Pilot.hex(a), Pilot.hex(b), warm * .7));
    layer(ctx, cm, .12, () => { const v = view(cm, .12); ctx.fillStyle = mixC('#4a5a80', '#c08a9a');
      for (let i = Math.floor(v.x0 / 110) - 1; i < v.x1 / 110 + 1; i++) { const r = rng(300 + ((i % 9) + 9) % 9), x = i * 110, h = 90 + r() * 140; ctx.fillRect(x, 1150 - h, 86, h + 400); if (r() < .5) ctx.fillRect(x + 30, 1150 - h - 30, 16, 30); } });
    for (const [p, base, amp, per, n, col, colW] of [[.25, 1200, 70, 82, 2, C.hill1, '#d9a070'], [.5, 1250, 50, 165, 3, C.hill2, '#b07a5a']]) {
      layer(ctx, cm, p, () => { const v = view(cm, p); ctx.fillStyle = mixC(col, colW); ctx.beginPath(); ctx.moveTo(v.x0, 3200);
        for (let x = v.x0; x <= v.x1; x += 12) ctx.lineTo(x, hillY(x, base, amp, per, n)); ctx.lineTo(v.x1, 3200); ctx.fill(); });
    }
  }
  K.sky = sky; K.farLayers = farLayers; K.bolt = bolt; K.cloudPath = cloudPath;

  // ---------------- the ground (side-on platformer block, world space) ----------------
  // ground(ctx, t, v, o): grass bank, road top (RT..RN) + front face, meadow with bushes / tufts / flowers, and — if o.gap =
  // [x, w] — a ravine x … x + w with cliff faces, strata, roots and mist. v = view(cm). o.from / o.to = the land's extent.
  const RT = K.RT = 1250, RN = K.RN = 1372;   // the road's top surface: far edge, near edge (feet: front lane 1340, back lane 1286)
  const hsh = (i, s = 0) => { const r = rng(i * 7919 + s * 104729); r(); return r(); };
  function ground(ctx, t, v, o = {}) {
    const E = o.gap ? o.gap[0] : Infinity, G = o.gap ? o.gap[1] : 0, segs = v => o.gap ? [[Math.max(v.x0, o.from ?? -2000), Math.min(v.x1, E)], [Math.max(v.x0, E + G), Math.min(v.x1, o.to ?? 6000)]].filter(s => s[1] > s[0]) : [[Math.max(v.x0, o.from ?? -2000), Math.min(v.x1, o.to ?? 6000)]].filter(s => s[1] > s[0]);
    const yb = Math.max(v.y1, 2300);
    // inside the ravine: rock walls receding into the dark, mist, a far glimpse of the valley
    if (v.x1 > E && v.x0 < E + G) {
      const g = ctx.createLinearGradient(0, 1180, 0, 2100); g.addColorStop(0, '#3c3a5c'); g.addColorStop(.25, '#1f1c33'); g.addColorStop(1, '#0d0a18');
      ctx.fillStyle = g; ctx.fillRect(E, 1150, G, yb - 1150);
      const wl = P2(p => { p.moveTo(E, 1150); p.lineTo(E + 150, 1196); p.lineTo(E + 110, 1420); p.lineTo(E + 170, 1700); p.lineTo(E + 120, yb); p.lineTo(E, yb); p.closePath(); });
      const wr = P2(p => { p.moveTo(E + G, 1150); p.lineTo(E + G - 140, 1200); p.lineTo(E + G - 100, 1450); p.lineTo(E + G - 160, 1760); p.lineTo(E + G - 110, yb); p.lineTo(E + G, yb); p.closePath(); });
      ctx.fillStyle = '#5a4060'; ctx.fill(wl); ctx.fillStyle = '#3a2a48'; ctx.fill(wr);
      ctx.save(); ctx.clip(wl); ctx.strokeStyle = 'rgba(30,18,40,.6)'; ctx.lineWidth = 6; for (let y = 1240; y < yb; y += 70) { ctx.beginPath(); ctx.moveTo(E, y); ctx.lineTo(E + 200, y + 30); ctx.stroke(); } ctx.restore();
      ctx.save(); ctx.clip(wr); ctx.strokeStyle = 'rgba(20,12,30,.6)'; ctx.lineWidth = 6; for (let y = 1270; y < yb; y += 80) { ctx.beginPath(); ctx.moveTo(E + G, y); ctx.lineTo(E + G - 200, y + 26); ctx.stroke(); } ctx.restore();
      for (let i = 0; i < 3; i++) { const y = 1560 + i * 150, a = .16 - i * .03, dx = Math.sin(t * .4 + i) * 30;
        const mg = ctx.createLinearGradient(0, y - 60, 0, y + 60); mg.addColorStop(0, 'rgba(160,170,210,0)'); mg.addColorStop(.5, `rgba(160,170,210,${a})`); mg.addColorStop(1, 'rgba(160,170,210,0)');
        ctx.fillStyle = mg; ctx.fillRect(E + dx - 40, y - 60, G + 80, 120); }
    }
    for (const [x0, x1] of segs(v)) {
      const l = x0 === E + G || x0 > E ? x0 : x0 - 30, r = x1 === E ? x1 : x1 + 30;
      const isL = x1 === E, isR = x0 === E + G;
      // grass bank behind the road
      const bank = P2(p => { p.moveTo(l, yb); p.lineTo(l, 1215); for (let x = l; x <= r; x += 20) p.lineTo(x, 1212 + 9 * Math.sin(x * .021) + 5 * Math.sin(x * .053)); p.lineTo(r, yb); p.closePath(); });
      inked(ctx, bank, C.grass, 6); cel(ctx, bank, C.grassS, 0, -36);
      // road top surface (the walking band, seen a little from above) and its front face
      const top = P2(p => p.rect(l, RT, r - l, RN - RT));
      inked(ctx, top, C.roadTop, 6); cel(ctx, top, C.roadTopS, 0, 30);
      const face = P2(p => p.rect(l, RN, r - l, 150));
      inked(ctx, face, C.road, 7); cel(ctx, face, C.roadS, 0, -70);
      // meadow in front
      const mead = P2(p => { p.moveTo(l, yb); p.lineTo(l, 1530); for (let x = l; x <= r; x += 20) p.lineTo(x, 1526 + 10 * Math.sin(x * .017 + 1) + 4 * Math.sin(x * .061)); p.lineTo(r, yb); p.closePath(); });
      inked(ctx, mead, C.grassS, 7); cel(ctx, mead, '#23803a', 0, -50);
      ctx.save(); ctx.clip(mead); const mg = ctx.createLinearGradient(0, 1600, 0, 2300); mg.addColorStop(0, 'rgba(18,40,30,0)'); mg.addColorStop(1, 'rgba(18,40,30,.55)'); ctx.fillStyle = mg; ctx.fillRect(l, 1560, r - l, yb - 1560);
      for (let i = Math.floor(l / 90); i <= r / 90; i++) { const bx = i * 90 + hsh(i, 11) * 40, by = 1700 + hsh(i, 12) * 260, br = 26 + hsh(i, 13) * 30; if (hsh(i, 14) < .35) continue;
        const bp = P2(q => { for (const [dx, dy, rf] of [[0, 0, 1], [-br * .9, br * .3, .75], [br * .9, br * .35, .7]]) { q.moveTo(bx + dx + br * rf, by + dy); q.arc(bx + dx, by + dy, br * rf, 0, TAU); } });
        inked(ctx, bp, '#2b9440', 5); cel(ctx, bp, '#1f7333', 0, -14); shine(ctx, bx - br * .3, by - br * .5, br * .35, br * .14, -.3, 'rgba(160,240,140,.5)'); }
      ctx.restore();
      // the cliff faces at the ravine: dirt strata, roots, a grass cap overhanging
      if (isL || isR) { const ex = isL ? E : E + G, sgn = isL ? -1 : 1;
        const cliff = P2(p => { p.moveTo(ex, 1206); p.lineTo(ex - 10 * sgn, 1290); p.lineTo(ex + 4 * sgn, 1340); p.lineTo(ex - 8 * sgn, 1440); p.lineTo(ex + 14 * sgn, 1520); p.lineTo(ex - 4 * sgn, 1640);
          p.lineTo(ex + 18 * sgn, 1760); p.lineTo(ex + 6 * sgn, yb); p.lineTo(ex + 120 * sgn, yb); p.lineTo(ex + 120 * sgn, 1206); p.closePath(); });
        inked(ctx, cliff, C.dirt, 7); cel(ctx, cliff, C.dirtS, 22 * sgn, 0);
        ctx.save(); ctx.clip(cliff); ctx.fillStyle = 'rgba(40,20,30,.18)'; ctx.fillRect(ex - 30, 1600, 60 + 120, yb - 1600);
        ctx.strokeStyle = C.dirtD; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let y = 1300, k = 0; y < yb; y += 110, k++) { ctx.beginPath(); ctx.moveTo(ex - 20 * sgn, y); ctx.lineTo(ex + 30 * sgn, y + 12 - 8 * (k % 2)); ctx.lineTo(ex + 70 * sgn, y + 2); ctx.lineTo(ex + 125 * sgn, y + 14); ctx.stroke(); }
        for (const [dx, dy, rad] of [[26, 1370, 12], [62, 1470, 9], [30, 1600, 15], [74, 1700, 10], [40, 1840, 12]]) { const st = ell(ex + dx * sgn, dy, rad * 1.5, rad, .2); inked(ctx, st, '#a8917e', 4); cel(ctx, st, '#86705f', 4 * sgn, -4); }
        ctx.restore();
        const cap = P2(p => { p.moveTo(ex + 80 * sgn, 1204); p.lineTo(ex - 14 * sgn, 1204); p.quadraticCurveTo(ex - 22 * sgn, 1226, ex - 6 * sgn, 1236); p.lineTo(ex + 80 * sgn, 1236); p.closePath(); });
        inked(ctx, cap, C.grass, 6); cel(ctx, cap, C.grassS, 0, -12);
        ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex - 2 * sgn, 1240); ctx.quadraticCurveTo(ex - 18 * sgn, 1290, ex - 8 * sgn, 1330 + 10 * Math.sin(t * 1.5)); ctx.stroke();
        ctx.strokeStyle = C.grassS; ctx.lineWidth = 4; ctx.stroke();
      }
      // pebbles on the road, tufts on the bank, flowers in the meadow (seeded per cell, culled)
      for (let i = Math.floor(l / 140); i <= r / 140; i++) { const px = i * 140 + hsh(i, 1) * 100; if (px < l + 10 || px > r - 10) continue;
        inked(ctx, ell(px, RT + 16 + hsh(i, 2) * 90, 9 + hsh(i, 3) * 6, 6 + hsh(i, 4) * 3), '#c9ad8e', 4);
        if (hsh(i, 5) < .5) { const fx = px + 40; if (fx < r - 10) tuft(ctx, fx, 1216 + 9 * Math.sin(fx * .021), .9, t); }
        if (hsh(i, 6) < .45) { const fx = px + 70; if (fx < r - 20 && fx > l + 20) flower(ctx, fx, 1560 + hsh(i, 7) * 60, t, i); }
        else if (hsh(i, 6) < .8) { const fx = px + 60; if (fx < r - 20) tuft(ctx, fx, 1546 + hsh(i, 8) * 40, 1.4, t); } }
    }
  }
  function tuft(ctx, x, y, s, t) { const sw = Math.sin(t * 2.2 + x * .01) * 4;
    const p = P2(p => { p.moveTo(x - 22 * s, y); p.quadraticCurveTo(x - 20 * s, y - 20 * s, x - 26 * s + sw, y - 40 * s); p.quadraticCurveTo(x - 8 * s, y - 24 * s, x, y - 50 * s);
      p.quadraticCurveTo(x + 6 * s + sw, y - 26 * s, x + 26 * s + sw, y - 38 * s); p.quadraticCurveTo(x + 18 * s, y - 16 * s, x + 22 * s, y); p.closePath(); });
    inked(ctx, p, C.grass, 4); cel(ctx, p, C.grassS, 6, -10); }
  function flower(ctx, x, y, t, i) { const sw = Math.sin(t * 2 + x) * 3, col = ['#ff6fa0', '#ffffff', '#ffd23a'][i % 3];
    ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sw, y - 40); ctx.stroke(); ctx.strokeStyle = C.grass; ctx.lineWidth = 4; ctx.stroke();
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; inked(ctx, ell(x + sw + Math.cos(a) * 11, y - 46 + Math.sin(a) * 11, 9, 9), col, 3); }
    inked(ctx, ell(x + sw, y - 46, 7, 7), col === '#ffd23a' ? '#ff8a3a' : C.buckle, 3); }
  K.ground = ground; K.tuft = tuft; K.flower = flower; K.hsh = hsh;

  // ---------------- a stone arch with a door ajar and golden light inside (the accent light) ----------------
  // gate({ x (centre), base (sill y), w = 132 (outer half-width), h = 330 }) → { back(ctx, t, glow), front(ctx, t, glow), path(r) }:
  // draw back() before figures walking into it, front() after them (glow 0..1 brightens it)
  K.gate = function (go) {
    const GX = go.x, BY = go.base, GW = go.w ?? 132, GTOP = BY - (go.h ?? 330);
    function archPath(r) { const p = new Path2D(); p.moveTo(GX - r, BY + 4); p.lineTo(GX - r, GTOP + GW); p.arc(GX, GTOP + GW, r, Math.PI, TAU); p.lineTo(GX + r, BY + 4); p.closePath(); return p; }
    function gateBack(ctx, t, glow) {
      const lg = ctx.createRadialGradient(GX, BY - 170, 20, GX, BY - 170, 420); lg.addColorStop(0, `rgba(255,236,170,${.55 + .2 * glow})`); lg.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = lg; ctx.fillRect(GX - 420, BY - 600, 840, 640);
      const inner = archPath(GW - 26), g = ctx.createLinearGradient(0, GTOP, 0, BY); g.addColorStop(0, '#fff6d0'); g.addColorStop(1, C.light2); ctx.fillStyle = g; ctx.fill(inner);
    }
    function gateFront(ctx, t, glow) {
      // stones of the arch (an inked ring of blocks)
      const outer = archPath(GW), inner = archPath(GW - 26), ring = new Path2D(); ring.addPath(outer); ring.addPath(inner);
      ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 14; ctx.stroke(outer); ctx.stroke(inner); ctx.fillStyle = C.stone; ctx.fill(ring, 'evenodd');
      ctx.clip(ring, 'evenodd'); ctx.strokeStyle = C.stoneS; ctx.lineWidth = 5;
      for (let i = 0; i <= 8; i++) { const a = Math.PI + Math.PI * i / 8; ctx.beginPath(); ctx.moveTo(GX + Math.cos(a) * (GW - 26), GTOP + GW + Math.sin(a) * (GW - 26)); ctx.lineTo(GX + Math.cos(a) * GW, GTOP + GW + Math.sin(a) * GW); ctx.stroke(); }
      for (let y = GTOP + GW + 40; y < BY; y += 46) for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(GX + s * (GW - 26), y); ctx.lineTo(GX + s * GW, y); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(GX - GW + 6, GTOP + GW, 6, BY - GTOP - GW - 10); ctx.restore();
      // door leaves, ajar (hinged at the jambs, swung in)
      for (const s of [-1, 1]) { const x0 = GX + s * (GW - 26), x1 = GX + s * 22, leaf = P2(p => { p.moveTo(x0, BY + 2); p.lineTo(x1, BY - 8); p.lineTo(x1, GTOP + GW + 6); p.quadraticCurveTo(lerp(x0, x1, .5), GTOP + 16, x0, GTOP + GW - 20); p.closePath(); });
        inked(ctx, leaf, C.door, 6); cel(ctx, leaf, C.doorS, 14 * s, 0);
        ctx.save(); ctx.clip(leaf); ctx.strokeStyle = C.doorS; ctx.lineWidth = 4; for (let k = 1; k < 3; k++) { const xx = lerp(x0, x1, k / 3); ctx.beginPath(); ctx.moveTo(xx, GTOP); ctx.lineTo(xx, BY); ctx.stroke(); } ctx.restore(); }
      // light spilling out of the gap between the leaves and onto the ground
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const sp = ctx.createRadialGradient(GX, BY - 150, 10, GX, BY - 120, 330); sp.addColorStop(0, `rgba(255,214,140,${.3 + .25 * glow})`); sp.addColorStop(1, 'rgba(255,170,90,0)');
      ctx.fillStyle = sp; ctx.fillRect(GX - 340, BY - 520, 680, 560);
      ctx.fillStyle = `rgba(255,214,130,${.22 + .2 * glow})`; ctx.beginPath(); ctx.moveTo(GX - 24, BY); ctx.lineTo(GX + 24, BY); ctx.lineTo(GX + 190, BY + 90); ctx.lineTo(GX - 210, BY + 90); ctx.fill();
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .32 + Math.sin(t * .7 + i) * .03; ctx.fillStyle = `rgba(255,240,190,${(.08 + .06 * glow)})`;
        ctx.beginPath(); ctx.moveTo(GX, BY - 120); ctx.lineTo(GX + Math.cos(a - .06) * 700, BY - 120 + Math.sin(a - .06) * 700); ctx.lineTo(GX + Math.cos(a + .06) * 700, BY - 120 + Math.sin(a + .06) * 700); ctx.fill(); }
      ctx.restore();
      for (let i = 0; i < 10; i++) { const r = rng(400 + i), per = 2.4 + r() * 2, u = frac((t + r() * per) / per), x = GX + (r() - .5) * 220 + Math.sin(t + i) * 14, y = BY - 40 - u * 380;
        star(ctx, x, y, (3 + r() * 5) * Math.sin(Math.PI * u), `rgba(255,250,220,${.8 * Math.sin(Math.PI * u)})`); }
    }
    return { back: gateBack, front: gateFront, path: archPath };
  };

  // ---------------- effects ----------------
  // dustPuff(ctx, x, y, s, a); speedRing(ctx, cx, cy, a, seed, r0): radial speed lines (a crash / a stop); speedLines(ctx, t, x, y, a):
  // streaks behind a runner at (x, y feet); drawChips(ctx, t, chips): ballistic chips/debris, each { t0, x, y, vx, vy, land, r0, vr, sz, col }
  function dustPuff(ctx, x, y, s, a) {
    if (a <= 0 || s <= 0) return; ctx.save(); ctx.globalAlpha *= a;
    const p = P2(q => { for (const [dx, dy, r] of [[0, 0, 40], [-38, 10, 30], [36, 8, 32], [-14, -26, 28], [20, -22, 26]]) { q.moveTo(x + dx * s + r * s, y + dy * s); q.arc(x + dx * s, y + dy * s, r * s, 0, TAU); } });
    inked(ctx, p, '#efe2cf', 4); ctx.save(); ctx.clip(p); ctx.fillStyle = '#cdb89c'; ctx.fillRect(x - 200, y - 200, 400, 400); ctx.translate(10 * s, -14 * s); ctx.fillStyle = '#efe2cf'; ctx.fill(p); ctx.restore();
    shine(ctx, x - 10 * s, y - 34 * s, 14 * s, 6 * s, -.3, 'rgba(255,255,255,.7)'); ctx.restore();
  }
  function speedRing(ctx, cx, cy, a, seed, r0 = 420) {
    if (a <= .01) return; const r = rng(seed); ctx.save(); ctx.fillStyle = `rgba(255,255,255,${.85 * a})`;
    for (let i = 0; i < 46; i++) { const ang = r() * TAU, w = .006 + r() * .012, rin = r0 + r() * 260;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * rin, cy + Math.sin(ang) * rin); ctx.lineTo(cx + Math.cos(ang - w) * 2200, cy + Math.sin(ang - w) * 2200); ctx.lineTo(cx + Math.cos(ang + w) * 2200, cy + Math.sin(ang + w) * 2200); ctx.fill(); }
    ctx.restore();
  }
  function speedLines(ctx, t, x, y, a) {   // horizontal streaks behind me while I run
    if (a <= .01) return; ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const r = rng(500 + i), u = frac(t * 2.2 + r()), yy = y - 40 - r() * 300, len = 120 + r() * 160, xx = x - 120 - u * 260;
      ctx.strokeStyle = `rgba(255,255,255,${.7 * a * Math.sin(Math.PI * u)})`; ctx.lineWidth = 5 + r() * 5; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - len, yy); ctx.stroke(); }
    ctx.restore();
  }
  function drawChips(ctx, t, CHIPS) {
    for (const q of CHIPS) {
      const u = t - q.t0; if (u < 0) continue; const al = 1 - ss(q.t0 + 1.1, q.t0 + 1.7, t); if (al <= 0) continue;
      const tl = (-q.vy + Math.sqrt(q.vy * q.vy + 4 * 800 * (q.land - q.y))) / 1600, uu = Math.min(u, Math.max(0, tl));
      const x = q.x + q.vx * uu, y = q.y + q.vy * uu + 800 * uu * uu, r = q.r0 + q.vr * uu;
      ctx.save(); ctx.globalAlpha = al; ctx.translate(x, y); ctx.rotate(r); const p = rr(-q.sz, -q.sz * .45, q.sz * 2, q.sz * .9, 2); inked(ctx, p, q.col, 2); ctx.restore();
    }
  }
  Object.assign(K, { dustPuff, speedRing, speedLines, drawChips });
  // flash(ctx, t, t0, dur = .14): the white flash on the hit (screen space)
  K.flash = function (ctx, t, t0, dur = .14) { if (t >= t0 && t < t0 + dur) { ctx.save(); ctx.fillStyle = `rgba(255,250,235,${.55 * (1 - (t - t0) / dur)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); } };
  // grade(ctx, warm): storm-cool → golden (a soft-light orange wash, warm 0..1);  vignette(ctx): the plum vignette (last world pass)
  K.grade = function (ctx, warm) { ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = .35 * warm; ctx.fillStyle = '#ffb040'; ctx.fillRect(0, 0, W, H); ctx.restore(); };
  K.vignette = ctx => ctx.drawImage(VIG, 0, 0);

  // ---------------- words ----------------
  // captions(ctx, t, lines): chunky game-title captions — drop shadow, thick ink ring, cream fill, a little pop-in; y 410, fits 790 px
  // endCard(ctx, t, card, at): a dark plum plate fades over the frame; the card in Jua with an ink ring
  K.captions = function (ctx, t, lines) {
    for (const line of lines) {
      const [a, b, s, src] = line, al = Pilot.win(t, a, b, .12, .4); if (al <= 0) continue;
      ctx.font = `400 80px ${FONT}`; const wmax = Math.max(...s.split('\n').map(l => ctx.measureText(l).width)), size = Math.min(84, Math.floor(80 * 790 / wmax));
      const pop = 1 + .22 * Math.exp(-(t - a) * 8) * Math.sin((t - a) * 22) * (t - a < .6 ? 1 : 0);
      ctx.save(); if (pop !== 1) { ctx.translate(540, 420); ctx.scale(pop, pop); ctx.translate(-540, -420); }
      const o = { font: FONT, srcFont: FONT, weight: 400, size, y: 410, shadow: 'rgba(0,0,0,0)', shadowBlur: 1, fadeIn: .12, fadeOut: .4 }, one = [line];
      ctx.save(); ctx.translate(0, 12); Story.captions(ctx, t, one, { ...o, color: 'rgba(36,21,46,.55)', srcColor: 'rgba(36,21,46,.55)' }); ctx.restore();
      for (let i = 0; i < 12; i++) { const an = i / 12 * TAU; ctx.save(); ctx.translate(Math.cos(an) * 8, Math.sin(an) * 8); Story.captions(ctx, t, one, { ...o, color: INK, srcColor: INK }); ctx.restore(); }
      Story.captions(ctx, t, one, { ...o, color: '#fff6dc', srcColor: '#ffe9a6' });
      ctx.restore();
    }
  };
  K.endCard = function (ctx, t, card, at) {
    const k = ss(at - .2, at + .4, t); if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = .9 * k; const pg = ctx.createLinearGradient(0, 0, 0, H); pg.addColorStop(0, '#1d1838'); pg.addColorStop(.5, '#251d42'); pg.addColorStop(1, '#151027'); ctx.fillStyle = pg; ctx.fillRect(0, 0, W, H); ctx.restore();
    const o = { font: FONT, srcFont: FONT, y: 860, titleShadow: '' };
    for (let i = 0; i < 8; i++) { const an = i / 8 * TAU; ctx.save(); ctx.translate(Math.cos(an) * 6, Math.sin(an) * 6); Story.endCard(ctx, t, card, at, { ...o, color: INK, srcColor: INK }); ctx.restore(); }
    Story.endCard(ctx, t, card, at, { ...o, color: '#fff6dc', srcColor: '#ffe3a0' });
  };

  // init(): the sky gradients + cloud sprites, the vignette (~80 ms)
  K.init = function () {
    buildSky();
    VIG = Pilot.canvas(W, H); const x = VIG.getContext('2d'), g = x.createRadialGradient(540, 1000, 500, 540, 1000, 1250);
    g.addColorStop(0, 'rgba(20,10,30,0)'); g.addColorStop(1, 'rgba(20,10,30,.45)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  };

  window.GameCartoon = K;
})();

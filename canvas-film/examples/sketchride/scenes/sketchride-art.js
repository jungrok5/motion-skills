/* sketchride-art.js — the film's own things, drawn with the sketchanime kit: the old delivery motorbike, the street that
   streams past, the donut shop with its rolling shutter, the empty donut box. Global: window.Ride.
   Bike coordinates: facing right, origin on the ground midway between the wheels, y up = negative (the scene mirrors it
   so it rides toward screen-left). Everything is a pure function of its arguments. */
(function () {
  const D = SketchAnime, P = D.pen, { clamp, lerp, ss } = Pilot, R = {};
  const C = D.C;
  R.WR = 98;                                   // wheel radius
  R.RW = [-272, -98]; R.FW = [278, -98];       // axles
  R.HEAD = [196, -332];                        // steering head
  R.GRIP = [[150, -392], [162, -404]];         // handlebar grips: near, far
  R.SEAT = { x0: -222, x1: 66, y: -300 };      // the bench seat's top
  R.RACK = { x0: -338, x1: -222, y: -298 };    // the carrier rack behind it
  R.PEG = [[64, -146], [-128, -140], [-214, -150]];   // footpegs: driver, passenger, rack rider
  R.FRAME = '#6a6064';                         // the frame's paint (dark, inked)
  R.TANK = '#a9cdc9';                          // pastel teal tank

  // ---------------- the motorbike ----------------
  // bike(ctx, o): o = { spinF, spinR (wheel angles), blur (0..1 spokes melt), fork (px compressed), shock (px), lamp (0..1),
  //   parts: 'back' (far fork leg, wheels, fenders, swingarm, engine, exhaust, frame, tank, seat, rack) | 'front'
  //   (near fork leg + gaiter, headlight, handlebar, grips, signals) | undefined = both }
  R.bike = function (ctx, o = {}) {
    const back = o.parts !== 'front', front = o.parts !== 'back';
    const FW = o.FW || R.FW, H = R.HEAD, RW = o.RW || R.RW;
    if (back) {
      // far fork leg (behind the wheel)
      D.chromeTube(ctx, [[H[0] + 10, H[1] + 18], [FW[0] + 10, FW[1] - 4]], 13, { lw: 1.6, seed: 3 });
      // rear wheel, front wheel
      D.wheel(ctx, RW[0], RW[1], R.WR, o.spinR || 0, { blur: o.blur, seed: 3 });
      D.wheel(ctx, FW[0], FW[1], R.WR, o.spinF || 0, { blur: o.blur, seed: 8 });
      // fenders: chrome arcs (white with black streaks)
      fender(ctx, R.RW, R.WR + 16, -2.75, -.55, 22);
      fender(ctx, FW, R.WR + 14, -2.5, -.25, 20);
      // swingarm + chain guard
      const piv = [-46, -170];
      const sa = P().m(piv[0], piv[1] - 12).l(RW[0] + 6, RW[1] - 10).q(RW[0] - 12, RW[1], RW[0] + 6, RW[1] + 10).l(piv[0], piv[1] + 12).z();
      D.shape(ctx, sa, R.FRAME, { wash: { a: .85, light: .3 }, line: { lw: 2 } });
      const cg = P().m(piv[0] + 14, piv[1] - 22).l(RW[0] + 40, RW[1] - 24).q(RW[0] + 6, RW[1] - 22, RW[0] + 12, RW[1] - 2).l(piv[0] + 10, piv[1] - 2).z();
      D.shape(ctx, cg, C.chrome, { wash: { a: .9, light: 0 }, line: { lw: 1.8 } }); D.greyWash(ctx, P().m(piv[0] + 14, piv[1] - 12).l(RW[0] + 30, RW[1] - 10).l(RW[0] + 30, RW[1] - 4).l(piv[0] + 14, piv[1] - 4).z(), { a: .5 });
      // rear shocks: chrome coils from the swingarm end to under the seat
      const sTop = [-218, -282 + (o.shock || 0)], sBot = [RW[0] + 34, RW[1] - 22];
      D.chromeTube(ctx, [sBot, sTop], 12, { lw: 1.5, seed: 5 });
      D.coil(ctx, [lerp(sBot[0], sTop[0], .18), lerp(sBot[1], sTop[1], .18)], [lerp(sBot[0], sTop[0], .82), lerp(sBot[1], sTop[1], .82)], 11, 8, { lw: 1.8 });
      // exhaust: from the engine front, down and back to an upswept muffler with a heat shield
      D.chromeTube(ctx, [[96, -150], [104, -96], [40, -78], [-120, -84], [-210, -110]], 15, { seed: 9 });
      const mf = [[-170, -108], [-250, -128], [-330, -150]];
      D.chromeTube(ctx, mf, 30, { caps: [true, true], seed: 11, band: .2 });
      D.ink(ctx, [[-196, -136], [-206, -98]], { lw: 1.2, heavy: null }); D.ink(ctx, [[-282, -158], [-290, -120]], { lw: 1.2, heavy: null });
      // engine: a grey-washed block with cooling fins, a round chrome cover, the carburettor
      const en = P().m(-40, -214).l(70, -214).q(108, -210, 112, -176).l(118, -128).q(110, -104, 80, -104).l(-20, -104).q(-56, -110, -58, -150).q(-58, -200, -40, -214).z();
      D.shape(ctx, en, C.chrome, { wash: { a: 1, light: 0 }, line: { lw: 2.2 } });
      D.greyWash(ctx, en, { a: .45 }); D.greyWash(ctx, P().m(-58, -160).l(118, -150).l(118, -100).l(-58, -100).z(), { a: .5, clip: en });
      for (let k = 0; k < 6; k++) D.ink(ctx, [[62, -206 + k * 12], [112, -200 + k * 11]], { lw: 1.4, heavy: null, over: 1 });   // fins
      const cv = P().ell(10, -148, 34, 30); D.shape(ctx, cv, C.chrome, { wash: { a: 1, light: 0 }, line: { lw: 1.9 } });
      D.ink(ctx, D.curve([[-16, -164], [4, -174], [26, -170]]), { lw: 4.5, heavy: null, a: .8 }); D.greyWash(ctx, P().ell(18, -138, 22, 16), { a: .4, clip: cv });
      for (const a of [0, 2.1, 4.2]) D.ink(ctx, P().ell(10 + Math.cos(a) * 24, -148 + Math.sin(a) * 21, 2.4, 2.4), { lw: 1.2, heavy: null });
      const cb = P().m(-50, -224).l(-14, -224).l(-10, -196).l(-48, -196).z(); D.shape(ctx, cb, C.chrome, { line: { lw: 1.6 } }); D.greyWash(ctx, cb, { a: .35 });
      D.chromeTube(ctx, [[-30, -196], [-34, -250], [-58, -262]], 9, { lw: 1.4, seed: 13 });
      // frame: backbone from the head under the tank and seat, a down tube
      D.tube(ctx, [H, [120, -298], [-40, -262], [-218, -282]], [20, 18, 16, 14], R.FRAME, { line: { lw: 2 }, wash: { a: .88, light: .25, gaps: 1 } });
      D.tube(ctx, [[H[0] - 8, H[1] + 22], [140, -200], [104, -150]], [16, 15, 14], R.FRAME, { line: { lw: 2 }, wash: { a: .88, light: .25 } });
      // footpegs (near side; the far ones hide behind the engine)
      for (const pg of R.PEG) { D.shape(ctx, P().m(pg[0] - 18, pg[1] - 6).l(pg[0] + 18, pg[1] - 6).q(pg[0] + 24, pg[1], pg[0] + 18, pg[1] + 6).l(pg[0] - 18, pg[1] + 6).z(), C.rubber, { wash: { a: .9 }, line: { lw: 1.6 } }); }
      D.chromeTube(ctx, [[R.PEG[2][0], R.PEG[2][1]], [-180, -170]], 9, { lw: 1.3 });
      // tank: pastel teal teardrop with a chrome knee panel and a cap
      const tk = P().m(52, -298).q(60, -352, 130, -356).q(196, -356, 200, -330).q(198, -300, 176, -290).q(110, -280, 52, -298).z();
      D.shape(ctx, tk, R.TANK, { wash: { light: .45, gaps: 2, gapW: 4 }, line: { lw: 2.3 } });
      const kp = P().m(78, -306).q(92, -330, 130, -330).q(150, -322, 146, -304).q(116, -296, 78, -306).z();
      D.shape(ctx, kp, C.chrome, { line: { lw: 1.6 } }); D.ink(ctx, D.curve([[90, -320], [118, -326], [140, -318]]), { lw: 3.4, heavy: null, a: .75 });
      D.ink(ctx, D.curve([[70, -340], [120, -350], [176, -346]]), { lw: 1.4, heavy: null, col: C.paper, a: .9 });
      D.shape(ctx, P().ell(150, -356, 13, 5), C.chrome, { line: { lw: 1.5 } });
      // seat: a long dark bench with a white piping line and highlight streaks
      const S = R.SEAT, se = P().m(S.x0, S.y + 4).q(S.x0 - 6, S.y - 18, S.x0 + 30, S.y - 24).l(S.x1 - 30, S.y - 30).q(S.x1 + 6, S.y - 30, S.x1 + 4, S.y - 8).q(S.x1, S.y + 12, S.x1 - 30, S.y + 12).l(S.x0 + 20, S.y + 12).q(S.x0, S.y + 12, S.x0, S.y + 4).z();
      D.shape(ctx, se, '#5d5459', { wash: { a: .92, light: .2 }, line: { lw: 2.2 } });
      D.ink(ctx, D.curve([[S.x0 + 30, S.y - 16], [-80, S.y - 22], [S.x1 - 30, S.y - 22]]), { lw: 2.4, heavy: null, col: '#dcd8de', a: .7 });
      D.ink(ctx, [[S.x0 + 14, S.y + 6], [S.x1 - 20, S.y + 4]], { lw: 1.2, heavy: null, col: '#bdb6bd', a: .8 });
      // carrier rack (chrome bars) + tail light + plate
      const K2 = R.RACK;
      D.chromeTube(ctx, [[K2.x0, K2.y], [K2.x1 + 10, K2.y - 4]], 10, { lw: 1.5, seed: 17 });
      D.chromeTube(ctx, [[K2.x0 + 6, K2.y + 26], [K2.x1 + 10, K2.y + 18]], 8, { lw: 1.3, seed: 19 });
      for (const x of [K2.x0 + 30, K2.x0 + 70]) D.ink(ctx, [[x, K2.y + 2], [x - 4, K2.y + 22]], { lw: 1.6, heavy: null });
      D.chromeTube(ctx, [[K2.x0 + 10, K2.y + 24], [RW[0] + 10, RW[1] - 40]], 8, { lw: 1.3 });
      D.shape(ctx, P().m(K2.x0 - 22, K2.y + 2).l(K2.x0 + 2, K2.y - 2).l(K2.x0 + 4, K2.y + 22).l(K2.x0 - 20, K2.y + 24).z(), C.salmon, { wash: { light: .5 }, line: { lw: 1.8 } });
      D.shape(ctx, P().m(K2.x0 - 6, K2.y + 34).l(K2.x0 + 32, K2.y + 32).l(K2.x0 + 34, K2.y + 62).l(K2.x0 - 4, K2.y + 64).z(), C.cream, { line: { lw: 1.6 } });
      D.ink(ctx, [[K2.x0 + 2, K2.y + 48], [K2.x0 + 26, K2.y + 47]], { lw: 1.4, heavy: null, a: .7 });
    }
    if (front) {
      // near fork leg: chrome tube with a rubber accordion gaiter, into the axle
      D.chromeTube(ctx, [[H[0] - 4, H[1] + 16], [FW[0] - 2, FW[1] - 2]], 15, { seed: 23 });
      const g0 = [lerp(H[0] - 4, FW[0] - 2, .42), lerp(H[1] + 16, FW[1] - 2, .42)], g1 = [lerp(H[0] - 4, FW[0] - 2, .78), lerp(H[1] + 16, FW[1] - 2, .78)];
      D.tube(ctx, [g0, g1], [24, 24], C.rubber, { line: { lw: 1.8 }, wash: { a: .85, light: .25 } });
      for (let k = 1; k < 8; k++) { const u = k / 8, c = [lerp(g0[0], g1[0], u), lerp(g0[1], g1[1], u)], d = [g1[0] - g0[0], g1[1] - g0[1]], n = Math.hypot(d[0], d[1]);
        D.ink(ctx, [[c[0] - d[1] / n * 12, c[1] + d[0] / n * 12], [c[0] + d[1] / n * 12, c[1] - d[0] / n * 12]], { lw: 1.2, heavy: null, col: '#cfc9cf', a: .8, over: 0 }); }
      D.shape(ctx, P().ell(FW[0], FW[1], 15, 15), C.chrome, { line: { lw: 1.8 } }); D.ink(ctx, P().ell(FW[0], FW[1], 5, 5), { lw: 1.4, heavy: null });
      // turn signals (butter) on stalks, the headlight bucket and glass
      D.ink(ctx, [[H[0] + 14, H[1] + 6], [H[0] + 56, H[1] - 6]], { lw: 3, heavy: null });
      D.shape(ctx, P().ell(H[0] + 62, H[1] - 8, 11, 9), C.butter, { wash: { light: .5 }, line: { lw: 1.7 } });
      const hl = P().m(H[0] + 8, H[1] - 30).q(H[0] + 50, H[1] - 40, H[0] + 62, H[1] + 4).q(H[0] + 54, H[1] + 40, H[0] + 12, H[1] + 34).q(H[0] - 2, H[1] + 2, H[0] + 8, H[1] - 30).z();
      D.shape(ctx, hl, C.chrome, { line: { lw: 2.2 } });
      D.ink(ctx, D.curve([[H[0] + 10, H[1] - 16], [H[0] + 30, H[1] - 30], [H[0] + 50, H[1] - 22]]), { lw: 4, heavy: null, a: .8 });
      D.greyWash(ctx, P().ell(H[0] + 28, H[1] + 18, 22, 10), { a: .45, clip: hl });
      const gl = P().ell(H[0] + 60, H[1] + 2, 9, 32, .08);
      D.shape(ctx, gl, '#fbf3d2', { wash: { light: .6 }, line: { lw: 2 } });
      if (o.lamp) { ctx.save(); ctx.globalAlpha = .35 * o.lamp; D.wash(ctx, P().m(H[0] + 64, H[1] - 26).l(H[0] + 300, H[1] - 70).l(H[0] + 300, H[1] + 90).l(H[0] + 64, H[1] + 30).z(), '#fff4c4', { knock: false, edge: 0, light: 0 }); ctx.restore(); }
      // handlebar: from the clamp up and back to the grips (near drawn last), mirror stalk
      const clamp0 = [H[0] - 6, H[1] - 30];
      D.chromeTube(ctx, [[H[0] - 2, H[1] - 4], clamp0], 12, { lw: 1.5 });
      D.chromeTube(ctx, [clamp0, [clamp0[0] - 12, clamp0[1] - 30], [R.GRIP[1][0] + 30, R.GRIP[1][1] + 2], R.GRIP[1]], 10, { lw: 1.4, seed: 29 });
      D.chromeTube(ctx, [clamp0, [clamp0[0] - 16, clamp0[1] - 22], [R.GRIP[0][0] + 30, R.GRIP[0][1] + 4], R.GRIP[0]], 11, { lw: 1.6, seed: 31 });
      for (const g of R.GRIP) { const gp = P().m(g[0] - 22, g[1] - 7).l(g[0] + 8, g[1] - 7).q(g[0] + 12, g[1], g[0] + 8, g[1] + 7).l(g[0] - 22, g[1] + 7).z(); D.shape(ctx, gp, C.rubber, { wash: { a: .9 }, line: { lw: 1.6 } }); }
      D.ink(ctx, [[clamp0[0] - 4, clamp0[1] - 26], [clamp0[0] - 30, clamp0[1] - 92]], { lw: 2.2, heavy: null });
      D.shape(ctx, P().ell(clamp0[0] - 34, clamp0[1] - 106, 12, 16, -.3), C.chrome, { line: { lw: 1.8 } });
      D.greyWash(ctx, P().ell(clamp0[0] - 32, clamp0[1] - 100, 7, 10, -.3), { a: .5 });
    }
  };
  function fender(ctx, c, r, a0, a1, w) {
    const pen = P(); const n = 26, o = [], i = [];
    for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; o.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); i.push([c[0] + Math.cos(a) * (r - w * (1 - .3 * Math.abs(k / n - .5))), c[1] + Math.sin(a) * (r - w * (1 - .3 * Math.abs(k / n - .5)))]); }
    pen.poly(o.concat(i.reverse()), true);
    D.shape(ctx, pen, C.chrome, { line: { lw: 2 } });
    const st = []; for (let k = 2; k <= n - 6; k++) { const a = a0 + (a1 - a0) * k / n; st.push([c[0] + Math.cos(a) * (r - w * .32), c[1] + Math.sin(a) * (r - w * .32)]); }
    D.ink(ctx, st, { lw: w * .3, heavy: null, a: .85, press: .6 });
    D.greyWash(ctx, pen, { a: .25 });
  }

  // ---------------- the street ----------------
  // street(ctx, cam, t, o): the curb, sidewalk and a row of shopfronts, telephone poles and wires, streaming past.
  //   cam = world x at the screen centre; layers at parallax pk (1 = the road). o = { skip: [x0, x1] world range kept
  //   free (the donut shop stands there), ground (screen y of the road), curb }
  R.street = function (ctx, cam, t, o = {}) {
    const G = o.ground, CB = o.curb, SEG = 380;
    // far rooftops: very light, slow
    const pkF = .35, camF = cam * pkF;
    for (let k = Math.floor((camF - 1500) / 300); k <= Math.floor((camF + 1500) / 300); k++) {
      const r = Pilot.rng(k * 7919 + 13), x = k * 300 - camF + 540, h = 120 + 150 * r(), w = 220 + 60 * r();
      D.ink(ctx, [[x, CB - 560], [x, CB - 560 - h], [x + w, CB - 560 - h], [x + w, CB - 560]], { lw: 1.1, a: .28, heavy: null, over: 4 });
      if (r() < .5) D.ink(ctx, [[x + w * .3, CB - 560 - h], [x + w * .3, CB - 560 - h - 40], [x + w * .45, CB - 560 - h - 40]], { lw: 1, a: .25, heavy: null, over: 2 });
    }
    // sidewalk + curb (road level, parallax 1)
    D.ink(ctx, [[-900, CB], [1980, CB]], { lw: 1.6, heavy: null, over: 0, a: .8 });
    D.ink(ctx, [[-900, CB + 14], [1980, CB + 14]], { lw: 1.1, heavy: null, over: 0, a: .6 });
    for (let k = Math.floor((cam - 1500) / 120); k <= Math.floor((cam + 1500) / 120); k++) { const x = k * 120 - cam + 540; D.ink(ctx, [[x, CB - 60], [x - 14, CB]], { lw: .9, heavy: null, a: .35, over: 0 }); }
    // shopfronts (parallax .92)
    const pk = .92, cm = cam * pk;
    for (let k = Math.floor((cm - 1500) / SEG); k <= Math.floor((cm + 1500) / SEG); k++) {
      const x = k * SEG - cm + 540, wx0 = k * SEG / pk, wx1 = (k + 1) * SEG / pk;
      if (o.skip && wx1 > o.skip[0] && wx0 < o.skip[1]) continue;
      ctx.save(); ctx.globalAlpha = .42; shopfront(ctx, x, CB - 62, SEG, k, t); ctx.restore();
    }
    // telephone poles and sagging wires (parallax .97)
    const pp = .97, cp = cam * pp, PS = 760;
    const poles = []; for (let k = Math.floor((cp - 1700) / PS); k <= Math.floor((cp + 1700) / PS); k++) poles.push(k * PS - cp + 540 + 120);
    for (const x of poles) { D.tube(ctx, [[x, CB - 20], [x - 4, CB - 900]], [16, 12], '#d9d2c8', { line: { lw: 1.6 }, wash: { light: .3 } });
      D.ink(ctx, [[x - 60, CB - 850], [x + 50, CB - 856]], { lw: 2, heavy: null }); D.ink(ctx, [[x - 44, CB - 800], [x + 36, CB - 804]], { lw: 1.6, heavy: null }); }
    for (let i = 0; i < poles.length - 1; i++) for (const [dy, sag] of [[-850, 60], [-800, 46]]) {
      const a = [poles[i] + 40, CB + dy], b = [poles[i + 1] - 50, CB + dy], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag];
      D.ink(ctx, [a, m, b], { lw: 1.1, heavy: null, a: .6, smooth: true, over: 0 }); }
    // road: the near edge and lane dashes (parallax 1.0)
    D.ink(ctx, [[-900, G + 150], [1980, G + 150]], { lw: 1.4, heavy: null, a: .5, over: 0 });
    for (let k = Math.floor((cam - 1500) / 260); k <= Math.floor((cam + 1500) / 260); k++) { const x = k * 260 - cam + 540;
      const dp = P().m(x, G + 196).l(x + 120, G + 196).l(x + 116, G + 206).l(x - 4, G + 206).z(); D.shape(ctx, dp, C.cream, { line: { lw: 1.2, a: .6 } }); }
  };
  const AWN = [C.pink, C.sky, C.sage, C.butter, C.lilac, C.peach];
  function shopfront(ctx, x, base, w, k, t) {
    const r = Pilot.rng(k * 104729 + 7), h = 430 + 120 * r(), top = base - h, aw = AWN[Math.floor(r() * AWN.length)];
    D.ink(ctx, [[x + 4, base], [x + 4, top]], { lw: 1.5, heavy: null, over: 6, a: .75 });
    D.ink(ctx, [[x - 10, top], [x + w + 6, top]], { lw: 1.3, heavy: null, over: 6, a: .6 });
    // upper windows
    if (r() < .55) for (let i = 0; i < 2; i++) { const wx = x + 50 + i * (w * .45), wy = top + 40, ww = w * .3, wh = 90;
      const wp = P().m(wx, wy).l(wx + ww, wy).l(wx + ww, wy + wh).l(wx, wy + wh).z(); D.wash(ctx, wp, C.sky, { a: .35, knock: false, edge: 0 }); D.ink(ctx, wp, { lw: 1.2, heavy: null, a: .6, loop: .95 }); }
    // signboard with a scribble in place of words
    const sy = base - 300, sb = P().m(x + 30, sy).l(x + w - 30, sy).l(x + w - 30, sy + 56).l(x + 30, sy + 56).z();
    D.shape(ctx, sb, r() < .5 ? C.cream : '#f4f0ea', { wash: { a: .7 }, line: { lw: 1.4, a: .7 } });
    const sq = []; for (let i = 0; i < 7; i++) sq.push([x + 70 + i * (w - 140) / 6, sy + 28 + (i % 2 ? -8 : 8) * r()]); D.ink(ctx, sq, { lw: 2, heavy: null, a: .45, smooth: true });
    // awning: scalloped, striped
    const ay = base - 230, ap = P().m(x + 16, ay).l(x + w - 16, ay).l(x + w + 6, ay + 60);
    for (let i = 6; i >= 0; i--) { const sx = x + 6 + (w) * i / 6; ap.q(sx + w / 12, ay + 78, sx, ay + 60); }
    ap.z(); D.shape(ctx, ap, aw, { wash: { a: .6, light: .5, gaps: 1 }, line: { lw: 1.4, a: .8 } });
    for (let i = 1; i < 6; i += 2) { const sx = x + 16 + (w - 32) * i / 6; D.ink(ctx, [[sx, ay + 2], [sx + 10, ay + 60]], { lw: 1, heavy: null, a: .5 }); }
    // the window / door below
    const wp = P().m(x + 34, ay + 96).l(x + w - 34, ay + 96).l(x + w - 34, base).l(x + 34, base).z();
    D.wash(ctx, wp, C.sky, { a: .25, knock: false, edge: 0 }); D.ink(ctx, wp, { lw: 1.2, heavy: null, a: .55, loop: .95 });
    D.ink(ctx, [[x + w * .55, ay + 96], [x + w * .55, base]], { lw: 1, heavy: null, a: .5 });
    D.ink(ctx, [[x + 60, ay + 130], [x + 110, ay + 180]], { lw: 2.5, col: C.paper, heavy: null, a: .8 });
  }

  // donutShop(ctx, x, base, k, t, o): the destination — a cream shopfront with a pink-striped awning, the sign 「도넛」
  //  lettered in the accent with a donut, and a rolling shutter that comes down (k: 0 open → 1 shut) carrying a taped
  //  paper sign 「품절」 (o.sold: its alpha). x = the shop's centre (screen), base = its floor row.
  R.SHOP_W = 560;
  R.donutShop = function (ctx, x, base, k, t, o = {}) {
    const w = R.SHOP_W, x0 = x - w / 2, top = base - 640;
    const fac = P().m(x0, base).l(x0, top).l(x0 + w, top).l(x0 + w, base).z();
    D.shape(ctx, fac, '#f7efe6', { wash: { a: .8, light: .3 }, line: { lw: 2 } });
    D.ink(ctx, [[x0 - 16, top], [x0 + w + 16, top]], { lw: 2.4, heavy: null, over: 4 });
    // sign
    const sy = top + 70, sb = P().m(x0 + 50, sy).l(x0 + w - 50, sy).q(x0 + w - 40, sy + 60, x0 + w - 50, sy + 120).l(x0 + 50, sy + 120).q(x0 + 40, sy + 60, x0 + 50, sy).z();
    D.shape(ctx, sb, C.cream, { wash: { light: .5 }, line: { lw: 2.2 } });
    D.letter(ctx, '도넛', x + 40, sy + 92, { size: 84, fill: D.ACCENT, seed: 41, ls: 10 });
    donut(ctx, x - 140, sy + 60, 38, t);
    // awning
    const ay = top + 230, ap = P().m(x0 + 10, ay).l(x0 + w - 10, ay).l(x0 + w + 20, ay + 80);
    for (let i = 8; i >= 0; i--) { const sx = x0 - 10 + (w + 30) * i / 8; ap.q(sx + (w + 30) / 16, ay + 104, sx, ay + 80); }
    ap.z(); D.shape(ctx, ap, C.pink, { wash: { light: .4, gaps: 2 }, line: { lw: 2 } });
    for (let i = 1; i < 8; i += 2) { const sx = x0 + 10 + (w - 20) * i / 8; ctx.save(); ctx.clip(ap.path()); D.wash(ctx, P().m(sx - 22, ay).l(sx + 22, ay).l(sx + 30, ay + 110).l(sx - 18, ay + 110).z(), '#fdf4f0', { knock: false, edge: 0 }); ctx.restore(); }
    // window + door behind the shutter
    const wy = ay + 130, wb = base, win = P().m(x0 + 40, wy).l(x0 + w - 40, wy).l(x0 + w - 40, wb).l(x0 + 40, wb).z();
    D.shape(ctx, win, C.sky, { wash: { a: .45, light: .5 }, line: { lw: 1.8 } });
    for (let i = 0; i < 3; i++) donut(ctx, x0 + 120 + i * 120, wy + 150, 26, t + i);   // donuts on display (until the shutter hides them)
    D.ink(ctx, [[x0 + 60, wy + 190], [x0 + w - 60, wy + 190]], { lw: 1.6, heavy: null });
    // the rolling shutter: grey-washed slats coming down
    const sh = clamp(k), sb2 = lerp(wy - 8, wb, sh);
    D.shape(ctx, P().m(x0 + 30, wy - 26).l(x0 + w - 30, wy - 26).l(x0 + w - 30, wy - 4).l(x0 + 30, wy - 4).z(), C.grey, { line: { lw: 1.8 } });
    if (sh > .01) {
      const sp = P().m(x0 + 36, wy - 6).l(x0 + w - 36, wy - 6).l(x0 + w - 36, sb2).l(x0 + 36, sb2).z();
      D.shape(ctx, sp, '#e4e2e8', { wash: { a: .95, light: .2 }, line: { lw: 2 } });
      D.greyWash(ctx, sp, { a: .35 });
      ctx.save(); ctx.clip(sp.path());
      for (let y = sb2 - 18; y > wy - 6; y -= 22) D.ink(ctx, [[x0 + 40, y], [x0 + w - 40, y]], { lw: 1.1, heavy: null, a: .55, over: 0 });
      ctx.restore();
      D.shape(ctx, P().m(x0 + 34, sb2 - 12).l(x0 + w - 34, sb2 - 12).l(x0 + w - 34, sb2 + 2).l(x0 + 34, sb2 + 2).z(), C.steel, { line: { lw: 1.8 } });
    }
    // 「품절」: a paper card that drops on a string over the sign's left end and swings (o.sold = its alpha, o.drop 0..1, o.swing rad)
    const sa = o.sold ?? 0; if (sa > 0) {
      const hx = x0 + 150, hy = sy - 30, len = lerp(10, 110, o.drop ?? 1), sw = o.swing || 0;
      ctx.save(); ctx.globalAlpha *= sa; ctx.translate(hx, hy); ctx.rotate(sw);
      D.ink(ctx, [[-40, 0], [-40, len]], { lw: 1.4, heavy: null, over: 0 }); D.ink(ctx, [[40, 0], [40, len]], { lw: 1.4, heavy: null, over: 0 });
      ctx.translate(0, len + 50); ctx.rotate(-.04);
      const pg = P().m(-88, -50).l(86, -54).l(90, 54).l(-84, 58).z(); D.shape(ctx, pg, '#fffdf8', { line: { lw: 2 } });
      D.letter(ctx, '품절', 0, 24, { size: 70, fill: '#fffdf8', ink: C.ink, lw: 3, seed: 77, mis: 0, ls: 8 });
      ctx.restore();
    }
    D.ink(ctx, [[x0 - 30, base], [x0 + w + 30, base]], { lw: 2, heavy: null, over: 0 });
  };
  // donut(ctx, x, y, r, t): a donut in the accent glaze with sprinkles.
  function donut(ctx, x, y, r, t) {
    const o = P().ell(x, y, r, r * .62); D.shape(ctx, o, C.sand, { wash: { light: .3 }, line: { lw: 1.8 } });
    const g = P().m(x - r * .92, y - r * .05).q(x - r * .9, y - r * .6, x, y - r * .62).q(x + r * .9, y - r * .6, x + r * .92, y - r * .05).q(x + r * .7, y + r * .32, x + r * .4, y + r * .12).q(x, y + r * .4, x - r * .4, y + r * .12).q(x - r * .7, y + r * .32, x - r * .92, y - r * .05).z();
    D.shape(ctx, g, D.ACCENT, { wash: { light: .45, mis: .4 }, line: { lw: 1.6 } });
    D.shape(ctx, P().ell(x, y - r * .1, r * .3, r * .14), null, { line: { lw: 1.5 } });
    const sc = [C.lemon, C.sky, C.mint, C.paper]; for (let i = 0; i < 7; i++) { const a = i * 2.3, rr = r * (.5 + .2 * (i % 2)); D.ink(ctx, [[x + Math.cos(a) * rr, y - r * .1 + Math.sin(a) * rr * .45], [x + Math.cos(a) * rr + 5, y - r * .1 + Math.sin(a) * rr * .45 - 3]], { lw: 3, col: sc[i % 4], heavy: null, over: 0, a: 1 }); }
  }
  R.donut = donut;

  // ---------------- the donut box (empty) ----------------
  // box(ctx, c, ang, lid, o): a donut box seen from the side at centre c, tilted ang, its lid hinged at the back edge and
  //  open by `lid` (rad); empty inside. Returns the world grip points under it: { near, far } (bottom corners).
  R.BOX = { w: 168, h: 42 };
  R.box = function (ctx, c, ang, lid) {
    const { w, h } = R.BOX;
    ctx.save(); ctx.translate(c[0], c[1]); ctx.rotate(ang);
    // lid (behind when open): hinged at the top-back corner (-w/2, -h/2) — back = +x on screen here (the box faces left with the riders)
    const hx = w / 2, hy = -h / 2;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(lid);
    const lp = P().m(0, 0).l(-w, 0).l(-w + 10, -26).l(8, -26).z(); D.shape(ctx, lp, '#fbf3ea', { wash: { light: .4 }, line: { lw: 1.8 } });
    D.shape(ctx, P().m(0, 0).l(-w, 0).l(-w + 2, 7).l(2, 7).z(), C.cream, { line: { lw: 1.4 } });
    D.ink(ctx, [[-w + 20, -14], [-24, -14]], { lw: 1, heavy: null, a: .5 });
    ctx.restore();
    // body: the open top shows the empty pale inside
    const bp = P().m(-w / 2, -h / 2).l(w / 2, -h / 2).l(w / 2 - 4, h / 2).l(-w / 2 + 4, h / 2).z();
    D.shape(ctx, bp, '#fbf3ea', { wash: { light: .35 }, line: { lw: 2 } });
    D.shape(ctx, P().m(-w / 2 + 6, -h / 2).l(w / 2 - 6, -h / 2).l(w / 2 - 10, -h / 2 + 8).l(-w / 2 + 10, -h / 2 + 8).z(), '#efe2d3', { line: { lw: 1.1 } });
    // the logo: a pink donut ring on the side
    D.shape(ctx, P().ell(-6, 3, 15, 10), D.ACCENT, { wash: { light: .3 }, line: { lw: 1.4 } }); D.shape(ctx, P().ell(-6, 2, 5, 3), C.paper, { line: { lw: 1.1 } });
    D.ink(ctx, [[18, -2], [56, -2]], { lw: 2.2, heavy: null, col: D.ACCENT, a: .8 }); D.ink(ctx, [[18, 7], [46, 7]], { lw: 1.6, heavy: null, col: D.ACCENT, a: .6 });
    ctx.restore();
    const cs = Math.cos(ang), sn = Math.sin(ang), at = (x, y) => [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs];
    return { near: at(-w / 2 + 34, h / 2 + 2), far: at(w / 2 - 30, h / 2 - 2) };
  };
  window.Ride = R;
})();

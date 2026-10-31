/* donut-cast.js — 「마지막 도넛」 the shared cast + props, drawn with the webtoon kit (kit-webtoon.js → window.Webtoon).
   Every scene draws the people and things through THIS file, so they stay identical across ep1/ep2/ep3.
   Global: window.Cast. Load after lib.js and kit-webtoon.js.

   PEOPLE (keys): park 박대리 · kim 김과장 · choi 최주임 · haneul 하늘 · boss 사장님
     Cast.draw(ctx, t, who, o)  → G   the normal webtoon body (≈1:6). o = Webtoon.Rig.person options:
         { x, y (feet), s (1 → 640 px tall; ~2.5 full body, ~5–7 bust), turn (0 front, ±.55 3/4, + faces right), expr, pose, arms: { L, R }, … }
         arms.L / arms.R = screen-left / screen-right arm: { to: [x, y] (where the GRIP lands), hand: 'open'|'cup'|'fist'|'rock'|'hold'|'point'|
         'scissors'|'paper'|'wave'|'grab'|'pinch'|'thumb', ang, bend, prop(ctx, H), propFront(ctx, H) }
         expr: neutral · smile (closed-eye) · glint · shock · cry · joy · chew · determined · dead · talk · happy · worried · tired · angry · blank
         (each person has a default: park 'tired', kim 'smile', choi 'neutral', haneul 'neutral', boss 'happy')
     Cast.face(ctx, t, who, x, y, s, o) → G   head only, centred on (x, y) (close-ups, the eye strip)
     Cast.sd(ctx, t, who, o)    → G   the SD / chibi variant (1:1.5). o = Webtoon.Rig.chibi options (+ stone: 1, crack: 0…1 for the stone statue)
     Cast.stone(ctx, t, who, o) → G   SD in grey stone (blank eyes, cracks by o.crack)
     Cast.crumble(ctx, t, who, o, c) the stone SD cracking and falling to rubble (c = { t0, dur, floor, … } → Webtoon.crumble)
     Cast.geom(t, who, o)       → G   geometry only (aim balloon tails at G.mouth, emotes at G.head, tears at G.eyes, props at G.hands.L.grip)
     Cast.hand(ctx, who, pose, x, y, ang, sz, o)  a big close-up hand with that person's sleeve + cuff (가위바위보 close-ups) → { grip, tip }
     Cast.SPEC[who] (the look), Cast.NAME[who] ('박대리' …), Cast.WHO (keys), Cast.COLOR[who] (their signature colour, for UI/aura tints)
   THINGS
     Cast.donut(ctx, x, y, r, o)  the strawberry donut (pink glaze #ff6fa3 + rainbow sprinkles). o { bite: 0…3, rot, tilt (.62 = 3/4 top view),
         glow (0…1 halo + sparkles), seed, t, alpha }
     Cast.box(ctx, x, y, w, o)    a donut box (white board, pink logo). o { n (donuts inside, 0…6 or 12 with o.dozen), open: true | false,
         lid (0…1 how far the lid is up), glow, t, seed }  (x, y) = the box's front-bottom centre
     Cast.mug(ctx, x, y, s, o)    김과장's mug (o.steam, o.t, o.ang)   ·  Cast.fridge(ctx, x, y, s, o) (x, y = bottom-left; o.open 0…1, o.t)
     Cast.counter(ctx, x, y, w, s) worktop + cabinets (y = worktop top)  ·  Cast.coffee(ctx, x, y, s, o) (on a worktop at y)
     Cast.desk(ctx, x, y, w, s, o) office desk + monitor + keyboard (y = desk top; o.glow screen light, o.t)
     Cast.chair(ctx, x, y, s, f)   an office chair (x, y = floor centre)
     Cast.room(ctx, t, kind, w, h, o)  a panel background: 'office' | 'pantry' | 'door' | 'hall' (o.horizon, o.door 0…1 open, o.light)
   All pure functions of t; colours fixed here. The ONLY place the accent pink appears is the donut and the box logo. */
(function () {
  const WT = window.Webtoon, R = WT.Rig, { clamp, lerp, ss, eo, eio, rng } = Pilot, TAU = Math.PI * 2, PINK = WT.ACCENT;
  const C = {};

  // ---------------------------------------------------------------- hair (head units: eye line y 0, face half-width 1, crown −1.5, chin 1.16)
  // helpers: P(pts) polygon, stroke a few strand lines, a shine band on top, clipped
  const poly = WT.poly;
  function strands(ctx, G, clip, lines, a = .45) { if (G.shadow) return; ctx.save(); ctx.clip(clip); ctx.strokeStyle = WT.rgba(G.pal.line, a); ctx.lineWidth = G.lwi * .8; ctx.lineCap = 'round';
    for (const l of lines) { ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.quadraticCurveTo(l[2], l[3], l[4], l[5]); ctx.stroke(); } ctx.restore(); }
  function shine(ctx, G, clip, cx, cy, rx, ry, segs = [[-2.6, -2.2], [-1.95, -1.5], [-1.25, -.75]]) {
    if (G.shadow) return; ctx.save(); ctx.clip(clip); for (const [a0, a1] of segs) { const pts = []; for (let i = 0; i <= 8; i++) { const a = lerp(a0, a1, i / 8); pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
      WT.taper(ctx, pts, G.lw * .4, G.lw * 1.3, WT.rgba(G.pal.hairL, .95)); } ctx.restore(); }
  function ahoge(ctx, G, x, y) {   // 박대리's antenna strand: a tapered curl that springs
    if (G.shadow) return;
    const a = G.spring(0) * 1.4, c = Math.cos(a), s = Math.sin(a), R2 = (px, py) => [x + (px * c - py * s), y + (px * s + py * c)];
    const pts = WT.bez(R2(0, 0), R2(.08, -.42), R2(.5, -.7), R2(.62, -.42), 14);
    WT.taper(ctx, pts, .2 + G.lw * 2, .05 + G.lw * 2, G.pal.line); WT.taper(ctx, pts, .2, .05, G.pal.hair);
  }
  // 박대리: messy dark hair with one ahoge
  function parkBack(ctx, G) {
    const b = G.bx, pts = [[-1.05, .42], [-1.15, .04], [-1.33, -.2], [-1.17, -.42], [-1.31, -.8], [-1.12, -1.0], [-1.13, -1.45], [-.78, -1.52], [-.64, -1.9], [-.3, -1.74], [0, -1.96], [.3, -1.76], [.64, -1.9], [.82, -1.55], [1.16, -1.46], [1.12, -1.03], [1.33, -.8], [1.18, -.44], [1.3, -.14], [1.13, .06], [1.05, .42], [0, .1]];
    const p = poly(pts.map(([x, y]) => [b(x), y])); G.inked(ctx, p, G.pal.hair, G.pal.hairS);
  }
  function parkFront(ctx, G) {
    const f = G.fx, o = G.ox, sn = G.sn;
    const pts = [[o(-1.07, -.45), -.45], [o(-1.1, -1.0), -1.02], [-.92 - .05 * sn, -1.55], [-.42 - .04 * sn, -1.82], [.14 - .02 * sn, -1.87], [.68, -1.68], [o(1.1, -1.1), -1.1], [o(1.08, -.45), -.45],
      [o(1.03, .04), .06], [f(.88), -.58], [f(.74), -.2], [f(.55), -.72], [f(.34), -.34], [f(.14), -.8], [f(-.1), -.3], [f(-.33), -.76], [f(-.55), -.38], [f(-.76), -.74], [o(-1.0, -.1), -.04]];
    const p = WT.smooth(pts.map((q, i) => q), true), pp = poly(pts);
    G.inked(ctx, pp, G.pal.hair, G.pal.hairS);
    strands(ctx, G, pp, [[f(.1), -1.6, f(.2), -1.1, f(.32), -.42], [f(-.3), -1.6, f(-.3), -1.1, f(-.12), -.38], [f(.6), -1.5, f(.66), -1.0, f(.72), -.28], [f(-.7), -1.4, f(-.62), -1.0, f(-.55), -.45]]);
    shine(ctx, G, pp, f(0) * .6, -.95, .95, .5);
    ahoge(ctx, G, f(.12) - .05, -1.8);
  }
  // 김과장: a neat side part (left), greying temples
  function kimBack(ctx, G) {
    const b = G.bx, pts = [[-1.08, .12], [-1.13, -.55], [-1.03, -1.3], [-.55, -1.72], [.18, -1.79], [.8, -1.6], [1.12, -1.12], [1.14, -.5], [1.08, .12], [0, -.1]];
    const p = WT.smooth(pts.map(([x, y]) => [b(x), y])); G.inked(ctx, p, G.pal.hair, G.pal.hairS);
    ctx.save(); ctx.clip(p); ctx.fillStyle = '#a7a19b'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(b(s * 1.08), -.25, .16, .38, 0, 0, TAU); ctx.fill(); } ctx.restore();
  }
  function kimFront(ctx, G) {   // a 2:8 part on HIS left (screen-right); the full sweep falls to screen-left. Points are written for a
    // left part and mirrored: F/O map a mirrored front-x through the turn, Rw a raw crown x.
    const F = x => G.fx(-x), O = (x, y) => G.ox(-x, y), Rw = x => -x - .04 * G.sn, px = F(-.46);
    const pr = WT.smooth([[px, -1.7], [Rw(.15), -1.9], [Rw(.8), -1.7], [O(1.12, -1.15), -1.15], [O(1.1, -.55), -.55], [O(1.06, -.28), -.28], [F(.9), -.8], [F(.64), -1.0], [F(.3), -1.08], [F(-.02), -1.14], [px, -1.34]], true);
    G.inked(ctx, pr, G.pal.hair, G.pal.hairS);
    const pl = WT.smooth([[px, -1.7], [px, -1.34], [F(-.72), -1.12], [O(-1.06, -.62), -.62], [O(-1.07, -.28), -.28], [O(-1.1, -.95), -.95], [Rw(-.95), -1.38], [Rw(-.6), -1.68]], true);
    G.inked(ctx, pl, G.pal.hair, G.pal.hairS);
    strands(ctx, G, pr, [[px, -1.55, F(.4), -1.55, F(.95), -.62], [px, -1.4, F(.3), -1.32, F(.82), -.86]], .5);
    if (!G.shadow) { ctx.save(); ctx.clip(pl); ctx.fillStyle = '#a7a19b'; ctx.beginPath(); ctx.ellipse(O(-1.06, -.5), -.45, .12, .28, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    shine(ctx, G, pr, F(.25), -1.12, .75, .48, [[-1.3, -.95], [-2.0, -1.55]]);
  }
  // 최주임: short sporty spikes, very short sides
  function choiBack(ctx, G) {
    const b = G.bx, pts = [[-1.06, -.18], [-1.1, -.9], [-.84, -1.5], [-.3, -1.78], [.3, -1.8], [.84, -1.5], [1.1, -.9], [1.06, -.18], [0, -.4]];
    const p = WT.smooth(pts.map(([x, y]) => [b(x), y])); G.inked(ctx, p, G.pal.hair, G.pal.hairS);
  }
  function choiFront(ctx, G) {
    const f = G.fx, o = G.ox, sn = G.sn, sp = G.spring(0) * .25;
    const pts = [[o(-1.06, -.55), -.55], [o(-1.1, -1.05), -1.05], [-.95 - .04 * sn, -1.5], [-.78 + sp, -2.02], [-.5, -1.62], [-.22 + sp, -2.16], [.04, -1.68], [.34 + sp, -2.14], [.6, -1.62], [.96 + sp, -1.92], [o(1.1, -1.1), -1.1], [o(1.07, -.55), -.55],
      [f(.84), -1.0], [f(.56), -.86], [f(.36), -1.1], [f(.12), -.88], [f(-.12), -1.08], [f(-.4), -.92], [f(-.66), -1.06], [f(-.86), -.84]];
    const p = poly(pts); G.inked(ctx, p, G.pal.hair, G.pal.hairS);
    strands(ctx, G, p, [[f(-.2), -1.0, f(-.2), -1.5, -.22 + sp, -2.0], [f(.3), -1.0, f(.32), -1.5, .34 + sp, -2.0]], .45);
    shine(ctx, G, p, f(0) * .5, -1.2, .9, .4, [[-2.5, -2.1], [-1.7, -1.3]]);
    // sideburns
    if (!G.shadow) for (const s of [-1, 1]) { if (s * sn > .35) continue; const x = o(s * 1.04, -.2); ctx.fillStyle = G.pal.hair; ctx.beginPath(); ctx.moveTo(x, -.55); ctx.lineTo(x - s * .12, -.55); ctx.lineTo(x - s * .1, -.12); ctx.closePath(); ctx.fill(); }
  }
  // 하늘: a bob with a straight fringe + a yellow hair clip
  function haneulBack(ctx, G) {
    const b = G.bx, sw = G.spring(0) * .08, pts = [[-1.24 + sw, .98], [-1.34, .3], [-1.3, -.62], [-1.02, -1.5], [-.3, -1.85], [.3, -1.85], [1.02, -1.5], [1.3, -.62], [1.34, .3], [1.24 + sw, .98], [.9, 1.04], [-.9, 1.04]];
    const p = WT.smooth(pts.map(([x, y]) => [b(x), y])); G.inked(ctx, p, G.pal.hair, G.pal.hairS);
  }
  function haneulFront(ctx, G) {
    const f = G.fx, o = G.ox, sn = G.sn, sw = G.spring(1) * .06;
    const fr = [[o(-1.08, -.6), -.6], [o(-1.1, -1.05), -1.05], [-.95 - .05 * sn, -1.5], [-.35, -1.86], [.35 - .04 * sn, -1.86], [.95, -1.5], [o(1.1, -1.05), -1.05], [o(1.08, -.6), -.6],
      [f(.86), -.4], [f(.62), -.34], [f(.5), -.44], [f(.3), -.33], [f(.08), -.42], [f(-.14), -.32], [f(-.36), -.42], [f(-.58), -.33], [f(-.84), -.4]];
    const p = poly(fr); G.inked(ctx, p, G.pal.hair, G.pal.hairS);
    strands(ctx, G, p, [[f(-.5), -1.5, f(-.5), -.9, f(-.48), -.36], [f(.2), -1.6, f(.2), -.9, f(.2), -.36], [f(.7), -1.4, f(.7), -.9, f(.62), -.36]], .4);
    // side pieces in front of the cheeks (the bob's front edge)
    for (const s of [-1, 1]) { if (s * sn > .5) continue; const x0 = o(s * 1.06, -.55), x1 = o(s * 1.1, .4);
      const pp = WT.smooth([[x0, -.75], [x0 + s * .14, -.2], [x1 + s * .16 + sw, .7], [x1 + s * .1 + sw, 1.02], [x1 - s * .2 + sw, .96], [x1 - s * .12, .45], [x0 - s * .16, -.2], [x0 - s * .14, -.62]], true);
      G.inked(ctx, pp, G.pal.hair, G.pal.hairS); }
    shine(ctx, G, p, f(0) * .5, -1.05, 1.0, .52);
    // hair clip (screen-right side)
    if (sn > -.5 && !G.shadow) { const cx = f(.58), cy = -1.06; ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.55); const cp = WT.rr(-.25, -.07, .5, .14, .06); ctx.lineWidth = G.lw * 1.6; ctx.strokeStyle = G.pal.line; ctx.stroke(cp);
      ctx.fillStyle = G.stone ? WT.stoneCol('#ffd23f', G.stone) : '#ffd23f'; ctx.fill(cp); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-.18, -.04, .2, .03); ctx.restore(); }
  }
  // 사장님: bald crown with a shine, grey hair round the sides
  function bossBack(ctx, G) {
    for (const sg of [-1, 1]) { const X = x => G.bx(sg < 0 ? x : -x);   // build the left patch, mirror it for the right
      const p = WT.smooth([[-.92, -1.0], [-1.14, -.86], [-1.22, -.62], [-1.3, -.44], [-1.27, -.2], [-1.32, .02], [-1.24, .24], [-1.2, .44], [-1.02, .56], [-.9, .3], [-.94, -.4]].map(([x, y]) => [X(x), y]), true);
      G.inked(ctx, p, G.pal.hair, G.pal.hairS);
      strands(ctx, G, p, [[X(-1.18), -.7, X(-1.25), -.3, X(-1.15), .2], [X(-1.06), -.5, X(-1.12), 0, X(-1.05), .4]], .35); }
  }
  function bossFront(ctx, G) {
    const f = G.fx; ctx.save(); ctx.globalAlpha *= .55; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(f(-.25), -1.18, .3, .14, -.3, 0, TAU); ctx.fill(); ctx.restore();
    ctx.strokeStyle = WT.rgba(G.pal.line, .35); ctx.lineWidth = G.lwi * .8; ctx.beginPath(); ctx.moveTo(f(-.3), -.86); ctx.quadraticCurveTo(f(0), -.92, f(.3), -.86); ctx.stroke();   // a forehead line
  }

  // ---------------------------------------------------------------- the five specs
  const SPEC = C.SPEC = {
    park: { name: '박대리', seed: 11, h: 1.0, head: 1.0, build: { sh: 60, waist: 42, hip: 46, neck: 12.5 }, expr: 'tired',
      pal: { skin: '#ffe1cf', hair: '#2a2631', hairL: '#55516a', eye: '#3a2e36', brow: '#24212a', shirt: '#bcd6f1', pants: '#3b4050', shoes: '#2a2528', tie: '#2c3a66' },
      shirt: { collar: 'shirt', open: true, roll: true }, tie: { loose: true }, glasses: { r: .37, col: '#33323f' }, bags: true, hairBack: parkBack, hairFront: parkFront },
    kim: { name: '김과장', seed: 23, h: 1.02, build: { sh: 66, waist: 50, hip: 52, belly: 12, neck: 14 }, expr: 'smile',
      pal: { skin: '#fbdcc6', hair: '#3b312d', hairL: '#6b5d56', eye: '#2f2a28', brow: '#2e2724', shirt: '#f7f6f1', outer: '#8b929d', pants: '#474c58', shoes: '#2c2626', tie: '#5b4b6f' },
      shirt: { collar: 'shirt' }, outer: { kind: 'vest' }, tie: {}, moustache: { w: .4, col: '#6a5a50' }, browW: 1.1, hairBack: kimBack, hairFront: kimFront },
    choi: { name: '최주임', seed: 37, h: 1.04, build: { sh: 70, waist: 46, hip: 48, neck: 14 }, expr: 'neutral',
      pal: { skin: '#f6d3b9', hair: '#5a3926', hairL: '#8c6248', eye: '#3a2a20', brow: '#3a2418', shirt: '#a3e1cf', outer: '#3e4659', pants: '#2f3442', shoes: '#f0f0ec', band: '#ef6a5a' },
      shirt: { collar: 'hood' }, hood: true, outer: { kind: 'jacket', open: 46 }, band: true, browW: 1.25, hairBack: choiBack, hairFront: choiFront },
    haneul: { name: '하늘', seed: 41, h: .93, head: .99, build: { sh: 52, waist: 37, hip: 43, neck: 11, arm: .95 }, expr: 'neutral',
      pal: { skin: '#ffe7da', hair: '#3c2824', hairL: '#6e5048', eye: '#5b3a2c', brow: '#3c2824', shirt: '#fbf8f1', outer: '#e9d6b6', skirt: '#6f7d92', shoes: '#8a5a44', sock: '#ffe7da', lanyard: '#4b7bd0' },
      shirt: { collar: 'round' }, outer: { kind: 'cardigan', open: 30 }, skirt: { len: 150 }, lanyard: {}, browW: .85, hairBack: haneulBack, hairFront: haneulFront },
    boss: { name: '사장님', seed: 53, h: .92, build: { sh: 70, waist: 58, hip: 56, belly: 24, neck: 16 }, expr: 'happy',
      pal: { skin: '#f9d8c0', hair: '#c3bfba', hairL: '#e4e1dc', eye: '#3a3030', brow: '#aaa5a0', shirt: '#f5f3ee', outer: '#8b2f45', pants: '#4a4440', shoes: '#2c2523', tie: '#8b2f45' },
      shirt: { collar: 'shirt' }, outer: { kind: 'cardigan', open: 38 }, browW: 1.8, wrinkles: true, hairBack: bossBack, hairFront: bossFront },
  };
  C.WHO = ['park', 'kim', 'choi', 'haneul', 'boss'];
  C.NAME = { park: '박대리', kim: '김과장', choi: '최주임', haneul: '하늘', boss: '사장님' };
  C.COLOR = { park: '#bcd6f1', kim: '#8b929d', choi: '#a3e1cf', haneul: '#e9d6b6', boss: '#8b2f45' };
  const withExpr = (who, o) => Object.assign({ expr: SPEC[who].expr }, o);
  C.draw = (ctx, t, who, o = {}) => R.person(ctx, t, SPEC[who], withExpr(who, o));
  C.geom = (t, who, o = {}) => R.person(null, t, SPEC[who], withExpr(who, o));
  C.face = (ctx, t, who, x, y, s, o = {}) => R.face(ctx, t, SPEC[who], x, y, s, withExpr(who, o));
  C.sd = (ctx, t, who, o = {}) => R.chibi(ctx, t, SPEC[who], withExpr(who, o));
  C.sdGeom = (t, who, o = {}) => R.chibi(null, t, SPEC[who], withExpr(who, o));
  C.stone = (ctx, t, who, o = {}) => R.chibi(ctx, t, SPEC[who], Object.assign({ expr: 'blank', stone: 1, crack: 0, sway: false, blink: false }, o));
  C.crumble = function (ctx, t, who, o = {}, c = {}) {
    const g = C.sdGeom(t, who, Object.assign({ sway: false }, o)), b = g.box; const box = { x: b.x - 10, y: b.y - 10, w: b.w + 20, h: b.h + 10 };
    WT.crumble(ctx, t, box, x => C.stone(x, t, who, Object.assign({ crack: 1 }, o)), Object.assign({ id: 'crumble-' + who, seed: WT.hash(who), floor: (o.y || 0) + 6 * (o.s || 1) }, c));
  };
  // a close-up hand with the sleeve this person wears
  C.hand = function (ctx, who, pose, x, y, ang, sz, o = {}) {
    const S = SPEC[who], P = R.palOf(S, o), roll = S.shirt.roll && !S.outer || S.outer && S.outer.kind === 'vest' && S.shirt.roll;
    const sleeve = S.outer && S.outer.kind !== 'vest' ? P.outer : P.shirt, lw = o.lw || sz * .085, flip = o.flip ?? 1, c = Math.cos(ang), s = Math.sin(ang);
    const back = (k) => [x - c * sz * k, y - s * sz * k];
    if (o.sleeve !== false) {
      const armCol = roll ? P.skin : sleeve, fa = WT.capsule(back(o.len || 3.2), back(-.05), sz * .42, sz * .36);
      WT.inked(ctx, fa, armCol, lw, P.line); WT.cel(ctx, fa, armCol, WT.shadeOf(armCol), sz * .08 * -s, sz * .08 * c);
    }
    const H = R.hand(ctx, pose, x, y, ang, sz, flip, { skin: P.skin, skinS: P.skinS, line: P.line, lw });
    if (o.sleeve !== false) {
      if (roll) { const L2 = Math.min(3.4, o.len || 3.2), rb = WT.capsule(back(L2 + .15), back(L2 - .55), sz * .5, sz * .48); WT.inked(ctx, rb, WT.mixC(P.shirt, '#ffffff', .25), lw, P.line); }
      else { if (S.outer && S.outer.kind !== 'vest') { const inner = WT.capsule(back(.55), back(.15), sz * .4, sz * .38); WT.inked(ctx, inner, S.hood ? P.shirt : WT.mixC(P.shirt, '#fff', .2), lw * .8, P.line); }
        const cf = WT.capsule(back(S.outer && S.outer.kind !== 'vest' ? 1.05 : .75), back(S.outer && S.outer.kind !== 'vest' ? .55 : .2), sz * .46, sz * .44); WT.inked(ctx, cf, S.outer && S.outer.kind === 'cardigan' ? WT.shadeOf(sleeve, .5) : sleeve, lw, P.line); }
      if (S.band) { const bd = WT.capsule(back(.42), back(.12), sz * .44, sz * .43); WT.inked(ctx, bd, P.band, lw, P.line); }
    }
    return H;
  };

  // ---------------------------------------------------------------- the donut (the ONE accent)
  const SPR = ['#ffd23f', '#4cc9f0', '#7bd389', '#ffffff', '#b28dff', '#ff9f43', '#5a8dee'];
  C.donut = function (ctx, x, y, r, o = {}) {
    const tilt = o.tilt ?? .62, rot = o.rot || 0, lw = o.lw || Math.max(2, r * .045), ink = WT.C.ink, seed = o.seed ?? 7, t = o.t || 0;
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha; ctx.translate(x, y); ctx.rotate(rot);
    if (o.glow) { WT.glow(ctx, 0, 0, r * 2.4, '#fff3c0', .7 * o.glow); }
    const th = r * .2 * Math.sqrt(1 - tilt * tilt) / .79 + r * .06;   // side thickness seen at this tilt
    const outer = new Path2D(); outer.ellipse(0, th * .5, r, r * tilt, 0, 0, Math.PI); outer.lineTo(-r, -th * .5); outer.ellipse(0, -th * .5, r, r * tilt, 0, Math.PI, TAU); outer.closePath();
    const hole = WT.ell(0, -th * .5, r * .3, r * .3 * tilt);
    const body = new Path2D(); body.addPath(outer); body.addPath(hole);
    const bites = (o.bite || 0) > 0 ? [[.82, -.25], [.98, .12], [.7, .5]].slice(0, Math.ceil(o.bite)).map(([a, b]) => [r * a, r * b * tilt - th * .3, r * .34]) : [];
    // shadow
    ctx.fillStyle = 'rgba(60,40,60,.18)'; ctx.beginPath(); ctx.ellipse(0, th * .5 + r * tilt * .25, r * 1.02, r * tilt * .9, 0, 0, TAU); ctx.fill();
    ctx.save();
    if (bites.length) { const bp = new Path2D(); bp.rect(-r * 3, -r * 3, r * 6, r * 6); for (const [bx, by, br] of bites) { bp.moveTo(bx + br, by); bp.ellipse(bx, by, br, br * .9, 0, 0, TAU); } ctx.clip(bp, 'evenodd'); }
    ctx.lineJoin = 'round'; ctx.strokeStyle = ink; ctx.lineWidth = lw * 2; ctx.stroke(outer); ctx.stroke(hole);
    ctx.fillStyle = '#d6914c'; ctx.fill(body, 'evenodd');
    // top face (dough)
    const top = WT.ell(0, -th * .5, r, r * tilt); ctx.save(); ctx.clip(body, 'evenodd'); ctx.fillStyle = '#efb56c'; ctx.fill(top);
    ctx.fillStyle = '#c47e3c'; ctx.beginPath(); ctx.ellipse(0, -th * .5 + r * .05 * tilt, r * .3, r * .3 * tilt, 0, Math.PI, TAU); ctx.fill();   // inner wall of the hole
    // glaze: wavy edge with drips over the side
    const gl = new Path2D(), N = 48, rr = rng(seed);
    const dr = []; for (let i = 0; i < 6; i++) dr.push([rr() * TAU, .08 + rr() * .14]);
    for (let i = 0; i <= N; i++) { const a = i / N * TAU; let k = .86 + .03 * Math.sin(a * 7 + seed) + .02 * Math.sin(a * 13);
      let dy = 0; for (const [da, dl] of dr) { const d = Math.abs(((a - da + 3 * Math.PI) % TAU) - Math.PI); if (d < .22 && Math.sin(a) > 0) dy += dl * r * (1 - d / .22); }
      const px = Math.cos(a) * r * k, py = -th * .5 + Math.sin(a) * r * k * tilt + dy; i ? gl.lineTo(px, py) : gl.moveTo(px, py); }
    gl.closePath(); const gh = WT.ell(0, -th * .5, r * .4, r * .4 * tilt);
    const glaze = new Path2D(); glaze.addPath(gl); glaze.addPath(gh);
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 1.4; ctx.stroke(gl); ctx.stroke(gh);
    ctx.fillStyle = PINK; ctx.fill(glaze, 'evenodd');
    ctx.save(); ctx.clip(glaze, 'evenodd'); ctx.fillStyle = '#e4508a'; ctx.beginPath(); ctx.ellipse(r * .08, -th * .5 + r * .12 * tilt, r * .95, r * .9 * tilt, 0, 0, TAU); ctx.ellipse(-r * .06, -th * .5 - r * .04 * tilt, r * .86, r * .82 * tilt, 0, 0, TAU); ctx.fill('evenodd');
    ctx.strokeStyle = '#ffc3da'; ctx.lineWidth = r * .07; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(0, -th * .5, r * .66, r * .66 * tilt, 0, Math.PI * 1.08, Math.PI * 1.45); ctx.stroke();
    ctx.lineWidth = r * .045; ctx.beginPath(); ctx.ellipse(0, -th * .5, r * .66, r * .66 * tilt, 0, Math.PI * 1.55, Math.PI * 1.62); ctx.stroke();
    // sprinkles
    const rs = rng(seed + 3); for (let i = 0; i < 30; i++) { const a = rs() * TAU, d = r * (.48 + rs() * .32), sx = Math.cos(a) * d, sy = -th * .5 + Math.sin(a) * d * tilt, an = rs() * Math.PI, L = r * .07;
      ctx.strokeStyle = SPR[i % SPR.length]; ctx.lineWidth = r * .045; ctx.beginPath(); ctx.moveTo(sx - Math.cos(an) * L, sy - Math.sin(an) * L * tilt); ctx.lineTo(sx + Math.cos(an) * L, sy + Math.sin(an) * L * tilt); ctx.stroke(); }
    ctx.restore(); ctx.restore(); ctx.restore();
    // bite marks: crumb band + ink along the bite edges (clipped to what is left)
    if (bites.length) { ctx.save(); ctx.clip(outer); const bp = new Path2D(); bp.rect(-r * 3, -r * 3, r * 6, r * 6); for (const [bx, by, br] of bites) { bp.moveTo(bx + br, by); bp.ellipse(bx, by, br, br * .9, 0, 0, TAU); } ctx.clip(bp, 'evenodd');
      for (const [bx, by, br] of bites) { ctx.strokeStyle = '#f8e2b8'; ctx.lineWidth = r * .16; ctx.beginPath(); ctx.ellipse(bx, by, br, br * .9, 0, 0, TAU); ctx.stroke(); }
      for (const [bx, by, br] of bites) { ctx.strokeStyle = ink; ctx.lineWidth = lw * 2; ctx.beginPath(); ctx.ellipse(bx, by, br, br * .9, 0, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = '#e8c48e'; const rc = rng(seed + 9); for (const [bx, by, br] of bites) for (let i = 0; i < 6; i++) { const a = Math.PI * .6 + rc() * Math.PI * .8, px = bx + Math.cos(a) * br * 1.05, py = by + Math.sin(a) * br * .95; ctx.beginPath(); ctx.arc(px, py, r * .02, 0, TAU); ctx.fill(); }
      ctx.restore(); }
    if (o.glow) WT.sparkles(ctx, t, { cx: 0, cy: -th, rx: r * 1.8, ry: r * 1.3, n: 8, r: [r * .12, r * .3], seed: seed + 1, alpha: o.glow });
    ctx.restore();
  };
  // ---------------------------------------------------------------- the donut box
  C.box = function (ctx, x, y, w, o = {}) {
    const ink = WT.C.ink, lw = o.lw || Math.max(2.5, w * .008), d = w * .42, h = w * .2, t = o.t || 0, dozen = o.dozen, cols = dozen ? 4 : 3, rows = dozen ? 3 : 2, n = o.n ?? (dozen ? 12 : 6), lid = o.open === false ? 0 : (o.lid ?? 1);
    ctx.save(); ctx.translate(x, y); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.glow) { WT.rays(ctx, t, 0, -h - d * .5, { col: '#fff1b8', alpha: .5 * o.glow, n: 14, r0: w * .3, r1: w * 1.6, spin: .05 }); WT.glow(ctx, 0, -h - d * .5, w * 1.1, '#fff5cc', .8 * o.glow); }
    const sk = w * .1;   // the top face skews back
    const topF = [[-w / 2, -h], [w / 2, -h], [w / 2 - sk, -h - d], [-w / 2 + sk, -h - d]];
    // lid (behind, hinged at the back edge)
    const logo = (cx, cy, s) => { ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = PINK; ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, s * .62, 0, TAU); ctx.fill(); ctx.fillStyle = PINK; ctx.beginPath(); ctx.arc(0, 0, s * .45, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, s * .17, 0, TAU); ctx.fill(); ctx.restore(); };
    if (lid > 0) { const lh = d * 1.05 * lid, lp = WT.poly([[-w / 2 + sk, -h - d], [w / 2 - sk, -h - d], [w / 2 - sk * .4, -h - d - lh], [-w / 2 + sk * .4, -h - d - lh]]);
      WT.inked(ctx, lp, '#fbf7f0', lw, ink); ctx.save(); ctx.clip(lp); ctx.fillStyle = '#efe6da'; ctx.fillRect(-w, -h - d - 6, w * 2, 6 + lh * .08); ctx.restore(); if (lid > .5) logo(0, -h - d - lh * .5, Math.min(w * .1, lh * .3)); }
    // inside tray + donuts
    const tp = WT.poly(topF); WT.inked(ctx, tp, '#f2e7d8', lw, ink);
    if (lid > 0) { ctx.save(); ctx.clip(tp); ctx.fillStyle = '#e6d6c2'; ctx.fillRect(-w, -h - d, w * 2, d * .18); ctx.restore();
      const cell = (i, j) => { const v = (j + .5) / rows, u = (i + .5) / cols, xL = lerp(-w / 2 + sk, -w / 2, v), xR = lerp(w / 2 - sk, w / 2, v); return [lerp(xL, xR, u) * .92, -h - d + v * d * .96]; };
      const cr = Math.min(w / cols, d / rows * 1.6) * .38; let k = 0;
      ctx.strokeStyle = WT.rgba(ink, .25); ctx.lineWidth = lw * .6; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const [cx, cy] = cell(i, j); ctx.beginPath(); ctx.ellipse(cx, cy + cr * .1, cr * 1.05, cr * .66, 0, 0, TAU); ctx.stroke(); }
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { if (k++ >= n) break; const [cx, cy] = cell(o.last ? cols - 1 - i : i, o.last ? rows - 1 - j : j); C.donut(ctx, cx, cy - cr * .1, cr, { seed: (o.seed || 1) * 31 + k * 7, tilt: .6, lw: lw * .8 }); } }
    else { const cp = WT.poly([[-w / 2, -h], [w / 2, -h], [w / 2 - sk, -h - d], [-w / 2 + sk, -h - d]]); WT.inked(ctx, cp, '#fbf7f0', lw, ink); logo(0, -h - d * .5, d * .28); }
    // front face
    const fp = WT.poly([[-w / 2, -h], [w / 2, -h], [w / 2, 0], [-w / 2, 0]]); WT.inked(ctx, fp, '#fbf7f0', lw, ink);
    ctx.fillStyle = '#ece3d6'; ctx.fillRect(-w / 2 + lw, -h * .25, w - lw * 2, h * .25 - lw);
    ctx.fillStyle = PINK; ctx.fillRect(-w / 2 + lw, -h * .62, w - lw * 2, h * .16);
    logo(-w * .32, -h * .55, h * .28);
    ctx.restore();
  };
  // ---------------------------------------------------------------- props
  C.mug = function (ctx, x, y, s = 1, o = {}) {   // (x, y) = bottom centre; o.ang tilts it (held), o.steam
    const ink = WT.C.ink, lw = 2.6 * s; ctx.save(); ctx.translate(x, y); if (o.ang) ctx.rotate(o.ang); ctx.scale(s, s);
    const hp = new Path2D(); hp.ellipse(24, -30, 14, 16, 0, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = ink; ctx.lineWidth = 11; ctx.stroke(hp); ctx.strokeStyle = '#f2efe8'; ctx.lineWidth = 6; ctx.stroke(hp);
    const body = WT.rr(-24, -62, 48, 62, 7); WT.inked(ctx, body, '#f4f1ea', 2.6, ink); WT.cel(ctx, body, '#f4f1ea', '#d6d3cf', -7, 0);
    ctx.fillStyle = '#7d8ea8'; ctx.fillRect(-24, -44, 48, 7);
    ctx.fillStyle = '#5a3c2e'; ctx.beginPath(); ctx.ellipse(0, -60, 21, 4, 0, 0, TAU); ctx.fill();
    if (o.steam) { const t = o.t || 0; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { const u = (t * .7 + i / 3) % 1; ctx.globalAlpha = Math.sin(Math.PI * u) * .8;
      ctx.beginPath(); for (let j = 0; j <= 8; j++) { const yy = -70 - u * 50 - j * 6, xx = (i - 1) * 10 + Math.sin(j * .8 + t * 3 + i) * 5; j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); } }
    ctx.restore();
  };
  C.fridge = function (ctx, x, y, s = 1, o = {}) {   // (x, y) = bottom-left; 300×760 at s = 1
    const ink = WT.C.ink, w = 300, h = 760; ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const body = WT.rr(0, -h, w, h, 16); WT.inked(ctx, body, '#eef1f4', 3, ink); WT.cel(ctx, body, '#eef1f4', '#cfd6e0', -18, 0);
    ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(4, -h * .64); ctx.lineTo(w - 4, -h * .64); ctx.stroke();
    for (const [y0, y1] of [[-h * .9, -h * .72], [-h * .58, -h * .3]]) { const hd = WT.rr(w - 34, y0, 14, y1 - y0, 7); WT.inked(ctx, hd, '#9aa3b2', 2.4, ink); }
    // magnets + a memo
    ctx.save(); ctx.translate(70, -h * .5); ctx.rotate(-.06); const memo = WT.rr(0, 0, 86, 100, 3); WT.inked(ctx, memo, '#fff6c9', 2.4, ink); ctx.strokeStyle = WT.rgba(ink, .4); ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(12, 24 + i * 18); ctx.lineTo(70 - i * 6, 24 + i * 18); ctx.stroke(); }
    ctx.fillStyle = '#7fb2e5'; ctx.beginPath(); ctx.arc(43, 4, 9, 0, TAU); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#9ad1a8'; ctx.beginPath(); ctx.arc(190, -h * .8, 12, 0, TAU); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(16, -h + 20, 10, h * .28); ctx.fillRect(16, -h * .6, 10, h * .5);
    ctx.restore();
  };
  C.counter = function (ctx, x, y, w, s = 1) {   // (x, y) = left end of the worktop top; height 330·s down to the floor
    const ink = WT.C.ink, d = 26 * s, hh = 330 * s; ctx.save(); ctx.translate(x, y);
    const cab = WT.rr(6 * s, d, w - 12 * s, hh - d, 4 * s); WT.inked(ctx, cab, '#f2ece2', 2.6, ink); WT.cel(ctx, cab, '#f2ece2', '#ddd3c4', 0, -14 * s);
    const n = Math.max(1, Math.round(w / (180 * s))); ctx.strokeStyle = WT.rgba(ink, .7); ctx.lineWidth = 2.4;
    for (let i = 1; i < n; i++) { const xx = 6 * s + (w - 12 * s) * i / n; ctx.beginPath(); ctx.moveTo(xx, d + 8 * s); ctx.lineTo(xx, hh - 6 * s); ctx.stroke(); }
    for (let i = 0; i < n; i++) { const xx = 6 * s + (w - 12 * s) * (i + .5) / n; const hd = WT.rr(xx - 22 * s, d + 30 * s, 44 * s, 8 * s, 4 * s); WT.inked(ctx, hd, '#a3a9b4', 2, ink); }
    const top = WT.rr(0, 0, w, d, 5 * s); WT.inked(ctx, top, WT.C.wood, 2.6, ink); ctx.fillStyle = WT.C.woodS; ctx.fillRect(2, d * .6, w - 4, d * .4 - 2);
    ctx.restore();
  };
  C.coffee = function (ctx, x, y, s = 1, o = {}) {   // a drip coffee machine standing on a worktop at (x, y)
    const ink = WT.C.ink; ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const body = WT.rr(-80, -250, 160, 250, 12); WT.inked(ctx, body, '#4a4d57', 3, ink); WT.cel(ctx, body, '#4a4d57', '#383a42', -16, 0);
    const win = WT.rr(-62, -150, 124, 120, 10); WT.inked(ctx, win, '#2e3038', 2.4, ink);
    const pot = new Path2D(); pot.moveTo(-40, -120); pot.lineTo(40, -120); pot.quadraticCurveTo(54, -60, 36, -36); pot.lineTo(-36, -36); pot.quadraticCurveTo(-54, -60, -40, -120); pot.closePath();
    ctx.fillStyle = 'rgba(200,225,240,.35)'; ctx.fill(pot); ctx.strokeStyle = '#cfd8e2'; ctx.lineWidth = 3; ctx.stroke(pot);
    ctx.fillStyle = '#5b3a2c'; ctx.beginPath(); ctx.moveTo(-44, -76); ctx.lineTo(44, -76); ctx.quadraticCurveTo(48, -52, 36, -40); ctx.lineTo(-36, -40); ctx.quadraticCurveTo(-48, -52, -44, -76); ctx.fill();
    ctx.fillStyle = '#9be38f'; ctx.beginPath(); ctx.arc(50, -200, 6, 0, TAU); ctx.fill(); ctx.fillStyle = '#e8e8ea'; ctx.fillRect(-56, -214, 70, 22);
    ctx.restore();
  };
  C.desk = function (ctx, x, y, w, s = 1, o = {}) {   // (x, y) = left end of the desk top; monitor centred at o.mx (fraction, .55)
    const ink = WT.C.ink, t = o.t || 0; ctx.save(); ctx.translate(x, y);
    const legH = 300 * s; for (const lx of [24 * s, w - 40 * s]) { const lg = WT.rr(lx, 20 * s, 16 * s, legH, 4 * s); WT.inked(ctx, lg, '#9aa2b0', 2.4, ink); }
    const mx = w * (o.mx ?? .55);
    // monitor
    const st = WT.rr(mx - 14 * s, -120 * s, 28 * s, 120 * s, 6 * s); WT.inked(ctx, st, '#565a66', 2.4, ink);
    const bs = WT.rr(mx - 70 * s, -14 * s, 140 * s, 14 * s, 6 * s); WT.inked(ctx, bs, '#565a66', 2.4, ink);
    const mon = WT.rr(mx - 200 * s, -380 * s, 400 * s, 260 * s, 12 * s); WT.inked(ctx, mon, '#34363f', 3, ink);
    const scr = WT.rr(mx - 184 * s, -366 * s, 368 * s, 222 * s, 4 * s); ctx.fillStyle = '#dfeaf7'; ctx.fill(scr);
    ctx.save(); ctx.clip(scr); ctx.fillStyle = '#c8d7ea'; for (let i = 0; i < 9; i++) ctx.fillRect(mx - 176 * s, -350 * s + i * 22 * s, 352 * s, 2 * s); for (let i = 0; i < 5; i++) ctx.fillRect(mx - 176 * s + i * 72 * s, -350 * s, 2 * s, 200 * s);
    ctx.fillStyle = '#7fa7d8'; ctx.fillRect(mx - 176 * s, -360 * s, 352 * s, 12 * s); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = .4; ctx.beginPath(); ctx.moveTo(mx + 60 * s, -366 * s); ctx.lineTo(mx + 120 * s, -366 * s); ctx.lineTo(mx + 40 * s, -144 * s); ctx.lineTo(mx - 20 * s, -144 * s); ctx.fill(); ctx.restore();
    if (o.glow) WT.glow(ctx, mx, -250 * s, 380 * s, '#d8ebff', .35 * o.glow);
    // desk top
    const top = WT.rr(0, 0, w, 24 * s, 5 * s); WT.inked(ctx, top, WT.C.wood, 2.6, ink); ctx.fillStyle = WT.C.woodS; ctx.fillRect(2, 15 * s, w - 4, 7 * s);
    // keyboard + papers + a small plant
    const kb = WT.poly([[mx - 150 * s, -4 * s], [mx + 150 * s, -4 * s], [mx + 140 * s, -22 * s], [mx - 140 * s, -22 * s]]); WT.inked(ctx, kb, '#e8eaee', 2.2, ink);
    ctx.save(); ctx.translate(w * .14, 0); ctx.rotate(-.05); for (let i = 0; i < 3; i++) { const pp = WT.rr(-60 * s, -12 * s - i * 6 * s, 130 * s, 10 * s, 2 * s); WT.inked(ctx, pp, i === 2 ? '#ffffff' : '#f2f0ea', 2, ink); } ctx.restore();
    if (o.plant !== false) { const px = w * .9; const pot = WT.rr(px - 26 * s, -52 * s, 52 * s, 52 * s, 8 * s); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .42 + Math.sin(t * 1.3 + i) * .03, lp = WT.ell(px + Math.cos(a) * 34 * s, -60 * s + Math.sin(a) * 40 * s, 12 * s, 30 * s, a + Math.PI / 2); WT.inked(ctx, lp, '#86c59a', 2, ink); }
      WT.inked(ctx, pot, '#e9a27c', 2.4, ink); }
    ctx.restore();
  };
  C.chair = function (ctx, x, y, s = 1, f = 1) {
    const ink = WT.C.ink; ctx.save(); ctx.translate(x, y); ctx.scale(s * f, s);
    ctx.strokeStyle = ink; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-70, -6); ctx.lineTo(70, -6); ctx.moveTo(0, -6); ctx.lineTo(0, -150); ctx.stroke(); ctx.strokeStyle = '#6b7080'; ctx.lineWidth = 4; ctx.stroke();
    const seat = WT.rr(-90, -175, 180, 32, 14); WT.inked(ctx, seat, '#4d5566', 3, ink);
    const back = WT.rr(-110, -420, 52, 250, 20); WT.inked(ctx, back, '#4d5566', 3, ink); WT.cel(ctx, back, '#4d5566', '#3b4150', -10, 0);
    ctx.restore();
  };
  // ---------------------------------------------------------------- backgrounds
  C.room = function (ctx, t, kind, w, h, o = {}) {
    const ink = WT.C.ink, hz = o.horizon ?? h * .72;
    ctx.fillStyle = WT.C.wall; ctx.fillRect(0, 0, w, hz);
    ctx.fillStyle = WT.C.floor; ctx.fillRect(0, hz, w, h - hz);
    ctx.fillStyle = '#ddd1bf'; ctx.fillRect(0, hz - 14, w, 14);
    ctx.strokeStyle = WT.rgba(ink, .5); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, hz); ctx.lineTo(w, hz); ctx.stroke();
    if (kind === 'office') {
      // a window with blinds and soft daylight, a partition, a shelf
      const wx = o.wx ?? w * .56, ww = o.ww ?? w * .36, wy = hz * .12, wh = hz * .52;
      ctx.fillStyle = '#dcebf6'; ctx.fillRect(wx, wy, ww, wh); const g = ctx.createLinearGradient(wx, wy, wx, wy + wh); g.addColorStop(0, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = 'rgba(160,180,200,.45)'; for (let i = 0; i < 9; i++) ctx.fillRect(wx, wy + 10 + i * wh / 9, ww, 7);
      ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.strokeRect(wx, wy, ww, wh); ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
      ctx.save(); ctx.globalAlpha = .18; ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx + ww, wy + wh); ctx.lineTo(wx + ww + ww * .5, hz + 40); ctx.lineTo(wx + ww * .1, hz + 40); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#e1d6c6'; ctx.fillRect(w * .05, hz * .3, w * .3, 14); ctx.strokeStyle = WT.rgba(ink, .6); ctx.strokeRect(w * .05, hz * .3, w * .3, 14);
      const bk = ['#9fb5cf', '#d9a7a0', '#b8c9a8', '#e6cf9c', '#a9a3c9']; for (let i = 0; i < 7; i++) { const bx = w * .07 + i * 26, bh = 70 + (i * 37 % 30); ctx.fillStyle = bk[i % 5]; ctx.fillRect(bx, hz * .3 - bh, 22, bh); ctx.strokeRect(bx, hz * .3 - bh, 22, bh); }
      ctx.fillStyle = '#c9cfd8'; ctx.fillRect(0, hz - 260, w * .03 + (o.partition ? w : 0), 0);
    } else if (kind === 'pantry') {
      // tiled backsplash band, a cabinet row up top, a small window
      const ty = hz * .38, th2 = hz * .3; ctx.fillStyle = '#eef3f2'; ctx.fillRect(0, ty, w, th2);
      ctx.strokeStyle = 'rgba(150,170,175,.55)'; ctx.lineWidth = 2; for (let y = ty; y <= ty + th2; y += 46) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      for (let r = 0; r * 46 < th2; r++) for (let x = (r % 2) * 46; x < w; x += 92) { ctx.beginPath(); ctx.moveTo(x, ty + r * 46); ctx.lineTo(x, Math.min(ty + th2, ty + r * 46 + 46)); ctx.stroke(); }
      const cab = WT.rr(w * .04, hz * .04, w * .92, hz * .26, 6); WT.inked(ctx, cab, '#f3ede3', 2.6, ink);
      const n = Math.max(2, Math.round(w / 260)); ctx.strokeStyle = WT.rgba(ink, .6); ctx.lineWidth = 2.4; for (let i = 1; i < n; i++) { const xx = w * .04 + w * .92 * i / n; ctx.beginPath(); ctx.moveTo(xx, hz * .05); ctx.lineTo(xx, hz * .29); ctx.stroke(); }
    } else if (kind === 'door' || kind === 'hall') {
      const dx = o.dx ?? w * .3, dw = o.dw ?? w * .4, dh = hz * .86, k = clamp(o.door ?? 0);
      ctx.fillStyle = '#3b3f4b'; ctx.fillRect(dx, hz - dh, dw, dh);
      if (o.light) { ctx.save(); ctx.globalAlpha = o.light; ctx.fillStyle = '#fff3d0'; ctx.fillRect(dx, hz - dh, dw, dh); ctx.beginPath(); ctx.moveTo(dx, hz); ctx.lineTo(dx + dw, hz); ctx.lineTo(dx + dw * 1.5, h); ctx.lineTo(dx - dw * .5, h); ctx.fill(); ctx.restore(); }
      const leaf = WT.poly([[dx, hz - dh], [dx + dw * (1 - k * .75), hz - dh - k * 16], [dx + dw * (1 - k * .75), hz + k * 16], [dx, hz]]);
      WT.inked(ctx, leaf, '#d9c3a2', 2.6, ink); ctx.fillStyle = '#9aa0ab'; ctx.beginPath(); ctx.arc(dx + dw * (1 - k * .75) - 22, hz - dh * .45, 8, 0, TAU); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.strokeRect(dx - 6, hz - dh - 6, dw + 12, dh + 6);
      if (kind === 'door') { const sg = WT.rr(dx + dw * .2, hz - dh - 70, dw * .6, 46, 6); WT.inked(ctx, sg, '#fbfaf6', 2.4, ink); Pilot.text(ctx, '탕비실', dx + dw * .5, hz - dh - 36, { size: 28, font: WT.F.talk, color: '#5a5258' }); }
    }
  };

  window.Cast = C;
})();

/* kit-storybook.js — 그림책 과슈 (textured gouache picture book) house style for word-log.  Global: window.Storybook
   Worked example: sermons/2026-10-24-cross-styles/film/scenes/cs-storybook.html. Card + pitfalls: styles/storybook/STYLE.md.

   The look: a teal swamp forest at night in flat opaque gouache — pale misty trunks far → dark teal near, a pale moon,
   rounded hills, still water; every shape has a rough (never ruler-straight) edge and a chalky dry-brush tooth inside;
   diamond motes float; blue-leafed swamp plants sway over the frame's bottom. The characters are animals in cloaks (the
   default: an orange fox with a white knit collar; grey foxes in slate cloaks for the others), jointed with 2-bone IK.
   The ONE warm thing is lantern gold (Storybook.ACCENT) with a grainy dotted halo.

   A frame:   const cm = { x, y, z, sx, sy };                       // camera: world point at screen centre, zoom, shake px
              Storybook.backdrop(ctx, t, cm);                         // sky + far / mid / near sheets
              Storybook.layer(ctx, cm, 1, () => {
                Storybook.ground(ctx, t, cm, lk);                     // ravine, embankment, water, gate + lantern
                Storybook.figures(ctx, cm, fc => { …figures and objects drawn into fc… });   // chalk tooth laid on them
                …glows on top (halo / soft), flecks, dust, splash… });
              Storybook.fore(ctx, t, cm); Storybook.post(ctx, cm, lk); Storybook.endPlate(ctx, t, at);
              Storybook.captions(ctx, t, lines, at); Storybook.endCard(ctx, t, card, at);
   Units: world px (the lanes sit at y ≈ 1250–1300; the water line at 1880 on a 1080×1920 frame).
   Load after lib.js (Pilot) and story.js (Story). Deterministic and seek-safe: seeded rng only; the painted sheets, textures
   and sprites are built once in init()/buildWorld(); draw functions keep no state between frames. */
(function () {
  const { clamp, lerp, ss, eo, eio, rng, noise } = Pilot;
  const K = {};
  const W = 1080, H = 1920, TAU = Math.PI * 2;

  // ------------------------------------------------------------------ palette & type
  const C = K.C = {
    sky0: '#1d4256', sky1: '#3b7583', sky2: '#5e9a9c', far: '#4a8189', far2: '#3c717d', mid: '#28525f', near: '#173444', near2: '#10283a',
    hill: '#2a5a60', hillT: '#3a7471', hill2: '#25525a', bush: '#1b3f52', bush2: '#21506a',
    water0: '#3f8f98', water1: '#6cc3c2', water2: '#8fded5', leaf: '#2d6cb8', leaf2: '#4a92d6', stem: '#0f2534', moon: '#f1fbf4',
    moss: '#3d7a72', moss2: '#2c6064', moss3: '#22505a', cliff: '#214a55', cliff2: '#1a3d48', cliffL: '#2c5c66',
    cloak: '#1f2633', cloak2: '#2b3444', sleeve: '#323d50', fox: '#c4612c', fox2: '#9b4420', white: '#f2eee2', leg: '#2a1a16', paw: '#e6dccb',
    gcloak: '#2e3b45', gcloak2: '#3a4a54', gsleeve: '#3b4955', gfur: '#8c8579', gfur2: '#6b655c', gwhite: '#d6d2c6', gleg: '#2a2622', gpaw: '#cfc8ba',
    wood: '#eab55c', woodL: '#ffdc8e', woodD: '#b07832', xwood: '#6b5a48', xwoodL: '#8a7760', xwoodD: '#4e4134',
    gold: '#ffd16a', gate: '#e8a64a', warm: '#ffd16a', warm2: '#ffb14a', stone: '#9fb6ae', stone2: '#7e9890', ink: '#f4f0e2',
    steel: '#c3d0cc', steelD: '#8a9c99', handle: '#6a4228',
  };
  K.ACCENT = C.gold;                                    // the one warm colour: lantern gold
  /* character palettes: the lead (orange fox, dark cloak) and the others (grey fox, slate cloak). A figure takes F.pal. */
  K.FOX = { cl: C.cloak, cl2: C.cloak2, sl: C.sleeve, fur: C.fox, fur2: C.fox2, wh: C.white, leg: C.leg, paw: C.paw };
  K.GREY = { cl: C.gcloak, cl2: C.gcloak2, sl: C.gsleeve, fur: C.gfur, fur2: C.gfur2, wh: C.gwhite, leg: C.gleg, paw: C.gpaw };
  K.FONT = "'Gowun Batang',serif";
  K.FONTS = ["700 60px 'Gowun Batang'", "700 72px 'Gowun Batang'", "400 34px 'Noto Sans KR'", "500 34px 'Noto Sans KR'"];   // Pilot.run({fonts})
  /* layout (world y): FY front lane (the lead's feet), BY back lane, RT the embankment's far edge, LIP its front edge,
     WATER the water line below */
  K.Y = { FY: 1300, BY: 1252, RT: 1212, LIP: 1372, WATER: 1880 };

  // ------------------------------------------------------------------ shapes
  K.shade = (hex, k) => { const c = Pilot.hex(hex); return `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`; };   // hex × k (clamped)
  K.t12 = t => Math.floor(t * 12 + 1e-6) / 12;         // pose on twos (12 fps), like a hand-animated picture book
  K.frac = x => x - Math.floor(x);
  const pathOf = K.pathOf = (pts, closed = true) => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); if (closed) p.closePath(); return p; };
  const mid2 = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  /* smooth(pts, closed) — a soft Path2D through points (quadratic midpoints) */
  const smooth = K.smooth = function (pts, closed = true) {
    const p = new Path2D(), n = pts.length;
    if (closed) { const m0 = mid2(pts[n - 1], pts[0]); p.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) { const a = pts[i], m = mid2(a, pts[(i + 1) % n]); p.quadraticCurveTo(a[0], a[1], m[0], m[1]); } p.closePath(); }
    else { p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n - 1; i++) { const m = mid2(pts[i], pts[i + 1]); p.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); } p.lineTo(pts[n - 1][0], pts[n - 1][1]); }
    return p;
  };
  /* rough(pts, amp, seed, step, closed) — resample a polyline and push points off by low noise: a gouache edge */
  const rough = K.rough = function (pts, amp, seed, step = 10, closed = true) {
    const o = [], n = pts.length, m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % n], Ln = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.round(Ln / step));
      for (let j = 0; j < k; j++) { const u = j / k, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
        o.push([x + (noise(x * .02 + seed, y * .02) - .5) * amp, y + (noise(y * .02 + seed * 1.7, x * .02 + 9) - .5) * amp]); } }
    if (!closed) o.push(pts[n - 1]);
    return o;
  };
  /* ell(cx, cy, rx, ry, n) — ellipse points (feed to rough + smooth for a painted blob) */
  const ell = K.ell = (cx, cy, rx, ry, n = 28) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };
  /* capsule(a, b, wa, wb, n) — points of a tapered limb with round ends */
  const capsule = K.capsule = function (a, b, wa, wb, n = 7) {
    const dx = b[0] - a[0], dy = b[1] - a[1], an = Math.atan2(dy, dx), pts = [];
    for (let i = 0; i <= n; i++) { const q = an + Math.PI / 2 + Math.PI * i / n; pts.push([a[0] + Math.cos(q) * wa / 2, a[1] + Math.sin(q) * wa / 2]); }
    for (let i = 0; i <= n; i++) { const q = an - Math.PI / 2 + Math.PI * i / n; pts.push([b[0] + Math.cos(q) * wb / 2, b[1] + Math.sin(q) * wb / 2]); }
    return pts;
  };

  // ------------------------------------------------------------------ textures
  const TX = K.TX = {};
  function chalkTexture(w, h, seed, k = 1) {   // white & dark dry-brush speckle with soft blotches; transparent elsewhere
    const c = Pilot.canvas(w, h), x = c.getContext('2d'), d = x.createImageData(w, h), r = rng(seed), q = d.data;
    for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
      const b = noise(i / 60 + seed, y / 60) * .55 + noise(i / 13, y / 13 + seed) * .3 + noise(i / 140, y / 9 + seed) * .4;
      const v = (b - .62) * 1.25 + (r() - .5) * .95, o = (y * w + i) * 4;
      if (v > 0) { q[o] = 236; q[o + 1] = 250; q[o + 2] = 244; q[o + 3] = Math.min(255, v * 70 * k); }
      else { q[o] = 6; q[o + 1] = 22; q[o + 2] = 34; q[o + 3] = Math.min(255, -v * 80 * k); }
    }
    x.putImageData(d, 0, 0); return c;
  }
  function grainTile(n, seed) { const c = Pilot.canvas(n, n), x = c.getContext('2d'), d = x.createImageData(n, n), r = rng(seed);
    for (let i = 0; i < n * n; i++) { const v = 128 + (r() - .5) * 90; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; }
    x.putImageData(d, 0, 0); return c; }
  /* paint(g, path, col, tex) — THE gouache stroke: fill a path flat, then lay the chalk tooth inside it (tex 0..1) */
  const paint = K.paint = function (g, path, col, tex = .9) {
    g.fillStyle = col; g.fill(path);
    if (tex > 0) { g.save(); g.clip(path); g.globalAlpha *= tex; g.fillStyle = TX.chalkPat; g.fill(path); g.restore(); }
  };
  function haloSprite() {   // the lantern's grainy, dotted gouache halo
    const n = 360, c = Pilot.canvas(n, n), x = c.getContext('2d'), r = rng(77);
    for (let i = 0; i < 3400; i++) { const a = r() * TAU, d = Math.pow(r(), .7) * n / 2, k = 1 - d / (n / 2);
      x.fillStyle = `rgba(255,${200 + r() * 50 | 0},${90 + r() * 60 | 0},${.18 + k * .75})`; const s = 1.8 + r() * 3 * k;
      x.fillRect(n / 2 + Math.cos(a) * d, n / 2 + Math.sin(a) * d, s, s); }
    return c;
  }
  /* sprite(N, stops) — an N×N radial-gradient sprite */
  const sprite = K.sprite = function (N, stops) { const c = Pilot.canvas(N, N), g = c.getContext('2d'), gr = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2); for (const [o, col] of stops) gr.addColorStop(o, col); g.fillStyle = gr; g.fillRect(0, 0, N, N); return c; };

  let SOFTG = null, MIST = null, SHADE = null, PLATE = null, FIG = {}, VIG = null, GRAIN = null, PLANTS = [], MOTES = [], DASH = [], DROPS = [];
  /* init() — build the chalk tooth (frame-sized), the grainy halo, glows, vignette, grain, the end plate, the figure buffer
     and the two foreground swamp plants (once, first thing in the scene's init — beamSprite and buildWorld need the tooth) */
  K.init = function () {
    TX.chalk = chalkTexture(W, H, 5); TX.chalkPat = Pilot.canvas(1, 1).getContext('2d').createPattern(TX.chalk, 'repeat'); TX.halo = haloSprite();
    FIG.c = Pilot.canvas(W, H); FIG.x = FIG.c.getContext('2d');
    SOFTG = sprite(256, [[0, 'rgba(255,214,140,.9)'], [.35, 'rgba(255,190,110,.35)'], [1, 'rgba(255,170,90,0)']]);
    MIST = sprite(128, [[0, 'rgba(200,240,232,.6)'], [1, 'rgba(200,240,232,0)']]);
    SHADE = sprite(128, [[0, 'rgba(6,26,36,.8)'], [.6, 'rgba(6,26,36,.45)'], [1, 'rgba(6,26,36,0)']]);
    VIG = Pilot.canvas(W, H); { const x = VIG.getContext('2d'), g = x.createRadialGradient(W / 2, H * .5, H * .3, W / 2, H * .5, H * .78); g.addColorStop(0, 'rgba(6,20,30,0)'); g.addColorStop(1, 'rgba(6,20,30,.42)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    GRAIN = Pilot.canvas(1, 1).getContext('2d').createPattern(grainTile(256, 3), 'repeat');
    PLATE = Pilot.canvas(W, H); { const x = PLATE.getContext('2d'); x.fillStyle = '#16323f'; x.fillRect(0, 0, W, H);
      const g = x.createRadialGradient(540, 940, 60, 540, 940, 900); g.addColorStop(0, 'rgba(70,130,135,.55)'); g.addColorStop(1, 'rgba(70,130,135,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.globalAlpha = .9; x.drawImage(TX.chalk, 0, 0); x.globalAlpha = 1;
      x.strokeStyle = 'rgba(214,240,232,.35)'; x.lineWidth = 3; x.stroke(smooth(rough([[110, 620], [970, 620], [970, 1480], [110, 1480]], 8, 3, 20))); }
    PLANTS = [{ c: plantSprite(3, false), x: 60, y: 1990, s: .78, f: .9, p: 0 }, { c: plantSprite(8, true), x: 1030, y: 1990, s: .7, f: .75, p: 2 }];
    Object.assign(K, { SOFTG, MIST });
  };

  // ------------------------------------------------------------------ the figure rig (jointed: 2-bone IK, poses on twos)
  /* ik(a, t, l1, l2, pick) — 2-bone IK with FIXED bone lengths (target clamped to reach); pick chooses the middle joint */
  const ik = K.ik = function (a, t, l1, l2, pick) {
    let dx = t[0] - a[0], dy = t[1] - a[1], d = Math.hypot(dx, dy) || 1e-6; const dd = clamp(d, Math.abs(l1 - l2) + .5, l1 + l2 - .5);
    const tx = a[0] + dx / d * dd, ty = a[1] + dy / d * dd, an = Math.atan2(ty - a[1], tx - a[0]), b = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
    const j1 = [a[0] + Math.cos(an + b) * l1, a[1] + Math.sin(an + b) * l1], j2 = [a[0] + Math.cos(an - b) * l1, a[1] + Math.sin(an - b) * l1];
    return [pick(j1, j2), [tx, ty]];
  };
  /* frame(F) — torso frame: P(a, b) = hip + forward·a + up·b (body units × F.s) */
  const frame = K.frame = function (F) {
    const up = [Math.sin(F.ang), -Math.cos(F.ang)], fw = [F.f * Math.cos(F.ang), F.f * Math.sin(F.ang)], s = F.s;
    return { up, fw, P: (a, b) => [F.hip[0] + fw[0] * a * s + up[0] * b * s, F.hip[1] + fw[1] * a * s + up[1] * b * s] };
  };
  const shoulderOf = K.shoulderOf = F => frame(F).P(4, 136);
  K.BODY = { HIPH: 178, LEG1: 96, LEG2: 90, ARM1: 78, ARM2: 74 };   // the cloaked animal at s = 1: hip height, thigh, shin, upper arm, forearm
  /* handShape(ctx, hd, an, type, f, s, col) — a paw AT point hd: 'fist', 'flat' (pressing down), 'open' (along angle an) */
  const handShape = K.handShape = function (ctx, hd, an, type, f, s, col) {
    let pts;
    if (type === 'flat') pts = [[-4, -7], [10, -8], [24, -5], [28, 0], [22, 4], [-2, 6], [-8, 2]].map(([u, v]) => [hd[0] + f * u * s, hd[1] + v * s - 4 * s]);
    else if (type === 'open') pts = [[-6, -8], [16, -9], [26, -4], [18, -2], [27, 2], [16, 5], [-2, 9], [-8, 2]].map(([u, v]) => [hd[0] + (Math.cos(an) * u - Math.sin(an) * v) * s, hd[1] + (Math.sin(an) * u + Math.cos(an) * v) * s]);
    else { pts = []; for (let i = 0; i < 10; i++) { const q = i / 10 * TAU; pts.push([hd[0] + Math.cos(q) * 11.5 * s, hd[1] + Math.sin(q) * 10 * s]); }
      pts.splice(7, 0, [hd[0] + Math.cos(an - 1.9) * 14 * s, hd[1] + Math.sin(an - 1.9) * 14 * s]); }   // a thumb bump
    ctx.fillStyle = col; ctx.fill(pathOf(pts));
    if (type === 'fist') { ctx.strokeStyle = 'rgba(20,45,70,.55)'; ctx.lineWidth = 1.5 * s; ctx.beginPath(); for (let i = 0; i < 3; i++) { const q = an + .5 + i * .45; ctx.moveTo(hd[0] + Math.cos(q) * 4 * s, hd[1] + Math.sin(q) * 4 * s); ctx.lineTo(hd[0] + Math.cos(q) * 9.5 * s, hd[1] + Math.sin(q) * 9.5 * s); } ctx.stroke(); }
  };
  /* figure(ctx, F, mid, back, mid0) — a fox in a cloak: thin dark legs, a bushy tail, a heavy dark cloak to the knees,
     a pale knit collar, a big fox head. F = a pose (walk/stand/kneel/crouch/mix…): { s, f ±1, gy, hip, ang, feet [far, near],
       hands [far, near] grip points or null (hanging), hand ['fist'|'flat'|'open' ×2], tilt, eye 'calm'|'strain'|'down'|'shock',
       sway, alpha, me (the lead: K.FOX palette; else K.GREY), pal (a palette override, see K.FOX), sq (squash for turns),
       toes [far, near] (paw angle override), farFront / farOver (far-arm layering) }.
     Hooks: back() before the body, mid0() over the cloak (an object the far arm reaches around), mid() over the head, under
     the near arm (a held object). The near arm always ends on top, the paw AT its grip point. */
  K.figure = function (ctx, F, mid, back, mid0) {
    const s = F.s, f = F.f, me = !!F.me, { up, fw, P } = frame(F);
    const al = F.alpha ?? 1; if (al <= 0) return; ctx.save(); ctx.globalAlpha = al;
    if (F.sq != null && F.sq !== 1) { ctx.translate(F.hip[0], F.gy); ctx.scale(F.sq, 1); ctx.translate(-F.hip[0], -F.gy); }
    const Kp = F.pal || (me ? K.FOX : K.GREY);
    const sh = P(4, 136), shF = P(-3, 134);
    const elbowPick = (a, b) => (a[1] - f * a[0] * .35) > (b[1] - f * b[0] * .35) ? a : b, kneePick = (a, b) => f * a[0] > f * b[0] ? a : b;
    const arm = (S0, T, c, type) => {
      if (!T) T = [S0[0] - f * 8 * s, S0[1] + 140 * s];
      const [el, hd] = ik(S0, T, 78 * s, 74 * s, elbowPick);
      ctx.fillStyle = c; ctx.fill(pathOf(capsule(S0, el, 26 * s, 21 * s))); ctx.fill(pathOf(capsule(el, hd, 21 * s, 15 * s)));
      handShape(ctx, hd, Math.atan2(hd[1] - el[1], hd[0] - el[0]), type, f, s, Kp.paw);
    };
    const leg = (T, c, i) => {
      const hp = P(-2, -2), ank = [T[0], T[1] - 8 * s];
      const [kn, an] = ik(hp, ank, 96 * s, 90 * s, kneePick);
      ctx.fillStyle = c; ctx.fill(pathOf(capsule(hp, kn, 18 * s, 14 * s))); ctx.fill(pathOf(capsule(kn, an, 14 * s, 11 * s)));
      const lift = Math.max(0, F.gy - T[1]), toe = F.toes && F.toes[i] != null ? F.toes[i] : lift > 6 * s ? .35 : 0;
      const paw = [[-8, -10], [10, -11], [24, -5], [26, 1], [-9, 1]].map(([u, v]) => { const cu = Math.cos(toe), su = Math.sin(toe); return [an[0] + f * (u * cu - v * su) * s, an[1] + 8 * s + (u * su + v * cu) * s]; });
      ctx.fill(smooth(paw));
    };
    if (back) back();
    if (!F.farFront && !mid0 && !F.farOver) arm(shF, F.hands[0], K.shade(Kp.sl, .78), F.hand?.[0] || 'fist');
    leg(F.feet[0], K.shade(Kp.leg, .7), 0);
    // the tail: bushy, low, swishing with the step
    const tp = P(-26, 8), tw = (F.sway || 0) * .012 + .1;
    ctx.save(); ctx.translate(tp[0], tp[1]); ctx.scale(f, 1); ctx.rotate(.15 + tw - F.ang * f * .5); ctx.scale(1.39 * s, 1.39 * s);
    const tail = smooth([[0, -10], [-40, -12], [-92, 4], [-130, 22], [-112, 34], [-70, 30], [-26, 20], [4, 10]]);
    ctx.fillStyle = Kp.fur; ctx.fill(tail); ctx.save(); ctx.clip(tail); ctx.fillStyle = Kp.wh; ctx.beginPath(); ctx.ellipse(-124, 26, 28, 20, .2, 0, TAU); ctx.fill();
    ctx.fillStyle = Kp.fur2; ctx.beginPath(); ctx.ellipse(-40, -16, 60, 12, .1, 0, TAU); ctx.fill(); ctx.restore(); ctx.restore();
    // the cloak: one heavy dark bell from the shoulders to the knees, a lighter fold and two dark fold lines
    const hemD = Math.max(40 * s, F.gy - F.hip[1] - 70 * s), sw = (F.sway || 0) * s;
    const skx = (a, b) => [F.hip[0] + f * a * s + sw * b / hemD, F.hip[1] + b];
    const capePts = [P(18, 150), P(30, 118), P(34, 62), P(33, 4), skx(42, hemD * .5), skx(52, hemD - 4), skx(30, hemD + 2), skx(6, hemD - 2), skx(-18, hemD + 3), skx(-40, hemD - 2),
      [F.hip[0] - f * 56 * s + sw * 1.4, F.hip[1] + hemD - 12 * s], skx(-48, hemD * .45), P(-42, 36), P(-38, 96), P(-30, 138), P(-12, 152)];
    const cape = smooth(capePts); ctx.fillStyle = Kp.cl; ctx.fill(cape);
    ctx.save(); ctx.clip(cape); const fo = P(22, 40); ctx.fillStyle = Kp.cl2; ctx.beginPath(); ctx.ellipse(fo[0], fo[1] + 30 * s, 22 * s, 110 * s, F.ang, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 4 * s; for (const k of [-22, 4]) { const a = P(k, 70), b = skx(k - 6, hemD - 8); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }
    ctx.restore();
    leg(F.feet[1], Kp.leg, 1);
    if (mid0) mid0();
    if (mid0 && !F.farFront) arm(shF, F.hands[0], K.shade(Kp.sl, .78), F.hand?.[0] || 'fist');
    const nearUp = !!(F.hands[1] && F.hands[1][1] < sh[1] - 6 * s);   // a hand up on a carried beam: the arm goes behind the head, not across the face
    if (nearUp) arm(sh, F.hands[1], Kp.sl, F.hand?.[1] || 'fist');
    // collar: a pale knit band with a dotted pattern
    const c0 = P(-12, 128), c1 = P(34, 128); ctx.strokeStyle = Kp.wh; ctx.lineWidth = 16 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(...c0); ctx.lineTo(...c1); ctx.stroke();
    ctx.fillStyle = Kp.cl; for (let k = 0; k < 5; k++) { const p = [lerp(c0[0], c1[0], .1 + k * .2), lerp(c0[1], c1[1], .1 + k * .2)]; ctx.fillRect(p[0] - 2.5 * s, p[1] - 2.5 * s, 5 * s, 5 * s); }
    // the head (fox, ×1.39), on the neck
    const tilt = F.ang + (F.tilt || 0), hu = [Math.sin(tilt), -Math.cos(tilt)], hf = [f * Math.cos(tilt), f * Math.sin(tilt)], N = P(10, 150);
    ctx.save(); ctx.transform(hf[0] * s, hf[1] * s, -hu[0] * s, -hu[1] * s, N[0], N[1]); ctx.scale(1.39, 1.39);
    ctx.fillStyle = Kp.fur; ctx.beginPath(); ctx.ellipse(-4, 6, 20, 16, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = Kp.wh; ctx.beginPath(); ctx.ellipse(10, 8, 13, 11, 0, 0, TAU); ctx.fill();
    const ears = [[[-22, -24], [-30, -74], [-4, -30]], [[-2, -30], [6, -78], [16, -28]]];
    ears.forEach((e, i) => { const p = pathOf(e); ctx.fillStyle = i ? Kp.fur : Kp.fur2; ctx.fill(p);
      ctx.save(); ctx.clip(p); ctx.fillStyle = '#2a1712'; ctx.beginPath(); ctx.ellipse(e[1][0], e[1][1] + 6, 14, 16, 0, 0, TAU); ctx.fill();
      if (i) { ctx.fillStyle = me ? 'rgba(242,238,226,.85)' : 'rgba(214,210,198,.7)'; ctx.beginPath(); ctx.moveTo(e[0][0] + 6, e[0][1]); ctx.lineTo(e[1][0] - 1, e[1][1] + 22); ctx.lineTo(e[2][0] - 6, e[2][1]); ctx.fill(); } ctx.restore(); });
    const hp = smooth([[-30, -6], [-20, -30], [6, -34], [26, -22], [66, -4], [62, 4], [34, 14], [-6, 18], [-28, 10]]);
    ctx.fillStyle = Kp.fur; ctx.fill(hp);
    ctx.save(); ctx.clip(hp); ctx.fillStyle = Kp.wh; ctx.beginPath(); ctx.moveTo(8, 4); ctx.quadraticCurveTo(40, -6, 70, -2); ctx.lineTo(60, 24); ctx.lineTo(0, 30); ctx.fill();
    ctx.fillStyle = Kp.fur2; ctx.beginPath(); ctx.ellipse(-22, 4, 14, 20, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#1a0f0c'; ctx.beginPath(); ctx.ellipse(65, -2, 5, 4, 0, 0, TAU); ctx.fill();   // nose
    const eye = F.eye || 'calm', op = eye === 'strain' ? .2 : eye === 'down' ? 0 : eye === 'shock' ? 1 : .75;
    ctx.fillStyle = '#16100e'; ctx.strokeStyle = '#16100e';
    if (op <= 0) { ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(18, -13); ctx.quadraticCurveTo(24, -9, 30, -13); ctx.stroke(); }
    else { ctx.beginPath(); ctx.ellipse(24, -14, eye === 'shock' ? 6 : 5.5, 1.5 + 4.2 * op, -.15, 0, TAU); ctx.fill();
      if (op > .6) { ctx.fillStyle = 'rgba(255,240,200,.9)'; ctx.beginPath(); ctx.arc(26, -16, 1.6, 0, TAU); ctx.fill(); } }
    if (eye === 'strain') { ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(16, -22); ctx.lineTo(30, -19); ctx.stroke(); }
    ctx.restore();
    if (mid) mid();
    if (F.farOver && !F.farFront && !mid0) arm(shF, F.hands[0], K.shade(Kp.sl, .78), F.hand?.[0] || 'fist');
    if (F.farFront) arm(shF, F.hands[0], K.shade(Kp.sl, .78), F.hand?.[0] || 'fist');
    if (!nearUp) arm(sh, F.hands[1], Kp.sl, F.hand?.[1] || 'fist');
    ctx.restore();
  };

  // ------------------------------------------------------------------ poses (pure data: build, mix, then draw with figure())
  /* walk(x, gy, s, f, ph, stride, lean, lift) — walking pose: hip at x, ground gy, scale s, facing f, step phase ph (cycles;
     integrate x/stride), stride px, torso lean (rad), foot lift px. Hands hang (null). */
  K.walk = function (x, gy, s, f, ph, stride, lean, lift = 22) {
    const feet = [0, 1].map(i => { const p = K.frac(ph + i * .5); let off, up = 0;
      if (p < .58) off = stride * (.29 - p); else { const u = (p - .58) / .42; off = -.29 * stride + .58 * stride * eio(u); up = lift * Math.sin(Math.PI * u); }
      return [x + f * off * s, gy - up * s]; });
    const hipH = (176 - 5 * Math.abs(Math.sin(TAU * ph))) * s;
    return { s, f, gy, hip: [x, gy - hipH], ang: f * lean, feet, hands: [null, null], hand: ['fist', 'fist'], tilt: 0, eye: 'calm', sway: -f * 7 * Math.sin(TAU * ph), ph };
  };
  /* stand(x, gy, s, f, lean) — standing, hands hanging */
  K.stand = function (x, gy, s, f, lean = .05) { return { s, f, gy, hip: [x, gy - 178 * s], ang: f * lean, feet: [[x - f * 18 * s, gy], [x + f * 22 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: 0, eye: 'calm', sway: 0 }; };
  /* kneel(x, gy, s, f, lean) — down on the far knee (shin behind, toes tucked), near foot planted forward. Lean ~.25 upright,
     ~1.25 bent to the ground in front (planting, reaching down). */
  K.kneel = function (x, gy, s, f, lean = .25) { return { s, f, gy, hip: [x, gy - 96 * s], ang: f * lean, feet: [[x - f * 92 * s, gy - 18 * s], [x + f * 62 * s, gy]], toes: [2.3, null], hands: [null, null], hand: ['fist', 'fist'], tilt: .1, eye: 'calm', sway: 0 }; };
  /* crouch(x, gy, s, f, lean) — a deep squat, both feet down (the lay-it-down pose of the worked example) */
  K.crouch = function (x, gy, s, f, lean = 1.2) { return { s, f, gy, hip: [x - f * 14 * s, gy - 92 * s], ang: f * lean, feet: [[x - f * 52 * s, gy], [x + f * 22 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: -.5, eye: 'calm', sway: 0 }; };
  const hangHands = K.hangHands = function (F, swing = 0) { const fr = frame(F), sh = fr.P(4, 136); return [[sh[0] - F.f * (10 + swing) * F.s, sh[1] + 140 * F.s], [sh[0] - F.f * (10 - swing) * F.s, sh[1] + 140 * F.s]]; };
  /* hangGrip(F, sw) — a hand at the side holding a tool (a saw, a lantern) */
  K.hangGrip = (F, sw = 0) => { const sh = shoulderOf(F); return [sh[0] + F.f * (16 + sw) * F.s, sh[1] + 128 * F.s]; };
  /* walkFree(…) — a walk with both arms swinging */
  K.walkFree = function (x, gy, s, f, ph, stride, lean, lift) { const F = K.walk(x, gy, s, f, ph, stride, lean, lift); F.hands = hangHands(F, 26 * Math.sin(TAU * ph)); return F; };
  /* mix(A, B, k) — in-between of two poses; facing/hand types switch at .5. ≥ .3 s for stand↔kneel/crouch. */
  K.mix = function (A, B, k) {
    if (k <= 0) return A; if (k >= 1) return B;
    const l2 = (a, b) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], hA = hangHands(A), hB = hangHands(B);
    const pick = k < .5 ? A : B;
    return { ...pick, s: lerp(A.s, B.s, k), gy: lerp(A.gy, B.gy, k), hip: l2(A.hip, B.hip), ang: lerp(A.ang, B.ang, k), feet: [l2(A.feet[0], B.feet[0]), l2(A.feet[1], B.feet[1])],
      hands: [0, 1].map(i => l2(A.hands[i] || hA[i], B.hands[i] || hB[i])), hand: pick.hand.slice(), tilt: lerp(A.tilt || 0, B.tilt || 0, k), sway: lerp(A.sway || 0, B.sway || 0, k),
      ...(A.toes || B.toes ? { toes: [0, 1].map(i => (A.toes?.[i] ?? B.toes?.[i]) == null ? null : lerp(A.toes?.[i] ?? 0, B.toes?.[i] ?? 0, k)) } : {}) };
  };
  /* turn(A, B, k) — mix two poses facing opposite ways with a horizontal squash through the flip */
  K.turn = function (A, B, k) { const F = K.mix(A, B, k); if (k > 0 && k < 1) F.sq = Math.max(.3, Math.abs(Math.cos(Math.PI * k))); return F; };
  /* reach(F, i, p, type) — paw i (0 far, 1 near) to world point p (keep within ~150·s of the shoulder) */
  K.reach = function (F, i, p, type) { F.hands = F.hands.slice(); F.hands[i] = p; if (type) { F.hand = (F.hand || ['fist', 'fist']).slice(); F.hand[i] = type; } return F; };
  /* lookAt(F, p, max) — tilt the head toward world point p; lookUp(F, k) — muzzle up by k */
  K.lookAt = function (F, p, max = .7) { const fr = frame(F), N = fr.P(10, 176), dx = p[0] - N[0], dy = p[1] - N[1];
    const T = F.f > 0 ? Math.atan2(dy, dx) : Math.atan2(-dy, -dx); F.tilt = clamp(T - F.ang, -max, max); return F; };
  K.lookUp = function (F, k = 1) { F.tilt = (F.tilt || 0) * (1 - k) - .45 * k; return F; };
  K.handR = F => F.f > 0 ? 1 : 0; K.handL = F => F.f > 0 ? 0 : 1;

  // ------------------------------------------------------------------ long held objects (a beam, a cross, a staff, a plank)
  const cpt = K.pt = (X, u, v = 0) => [X.x + Math.cos(X.a) * u - Math.sin(X.a) * v, X.y + Math.sin(X.a) * u + Math.cos(X.a) * v];
  /* carry(F, a0, w, contact) — an object of width w resting ON the shoulder (behind the head), tilted a0; `contact` px along
     it sits on the shoulder. → {x, y, a, contact}. Then grip(F, X, uFar, uNear). */
  K.carry = function (F, a0, w, contact) {
    const fr = frame(F), sh = fr.P(-10, 128), T = [sh[0] + fr.up[0] * 10 * F.s, sh[1] + fr.up[1] * 10 * F.s];
    const a = F.f > 0 ? a0 : Math.PI - a0, d = [Math.cos(a), Math.sin(a)]; let n = [d[1], -d[0]]; if (n[1] > 0) n = [-n[0], -n[1]];
    return { x: T[0] + n[0] * w / 2 - d[0] * contact, y: T[1] + n[1] * w / 2 - d[1] * contact, a, contact };
  };
  /* inFront(F, len, dx, dy) — held level in front at the waist, both paws on it; upright(F, len, dx) — stood on the ground */
  K.inFront = function (F, len, dx = 40, dy = 6) { const a = F.f > 0 ? 0 : Math.PI, cx = F.hip[0] + F.f * dx * F.s, X = { x: cx - Math.cos(a) * len / 2, y: F.hip[1] + dy * F.s, a };
    F.hands = [cpt(X, len * .5 + 28), cpt(X, len * .5 - 28)]; F.hand = ['fist', 'fist']; return X; };
  K.upright = function (F, len, dx = 70) { const X = { x: F.hip[0] + F.f * dx * F.s, y: F.gy, a: -Math.PI / 2 };
    F.hands = [F.hands[0], cpt(X, 120 * F.s + (F.gy - F.hip[1]) * .3)]; F.hand = [F.hand[0], 'fist']; return X; };
  K.grip = function (F, X, u0, u1) { F.hands = [cpt(X, u0), cpt(X, u1)]; F.hand = ['fist', 'fist']; return F; };
  K.mixX = (A, B, k) => k <= 0 ? A : k >= 1 ? B : { ...B, x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), a: lerp(A.a, B.a, k), u0: B.u0, lie: k > .62 ? B.lie : A.lie };
  K.rotAbout = function (X, pv, th) { const ox = X.x - pv[0], oy = X.y - pv[1]; return { ...X, x: pv[0] + ox * Math.cos(th) - oy * Math.sin(th), y: pv[1] + ox * Math.sin(th) + oy * Math.cos(th), a: X.a + th }; };
  /* beamSprite({len, w, bar: {at, w}, hb, lit, seed}) — a painted beam along +x (foot at x=0): rough gouache edge, lit and
     shaded faces, brushed grain, chalk tooth; lit = lantern-gold wood (the accent), else muted brown. bar adds a crossbar of
     half-height hb. drawBeam(ctx, X, u0, u1, x, y, a, alpha) draws the part [u0, u1] of it. */
  const KX = 2, CPAD = 14;
  K.beamSprite = function (o) {
    const L = o.len, PW = o.w, bar = o.bar, hb = bar ? o.hb : PW / 2, w = (L + 2 * CPAD) * KX, h = (2 * hb + 2 * CPAD) * KX, c = Pilot.canvas(w, h), g = c.getContext('2d');
    const CBX = bar ? bar.at : -1e4, CBW = bar ? bar.w : 0;
    g.setTransform(KX, 0, 0, KX, CPAD * KX, (hb + CPAD) * KX);
    const out = bar ? [[0, -PW / 2], [CBX - CBW / 2, -PW / 2], [CBX - CBW / 2, -hb], [CBX + CBW / 2, -hb], [CBX + CBW / 2, -PW / 2], [L, -PW / 2], [L, PW / 2],
      [CBX + CBW / 2, PW / 2], [CBX + CBW / 2, hb], [CBX - CBW / 2, hb], [CBX - CBW / 2, PW / 2], [0, PW / 2]] : [[0, -PW / 2], [L, -PW / 2], [L, PW / 2], [0, PW / 2]];
    const p = smooth(rough(out, 1.6, o.lit ? 3 : 5, 8)), [b, l, d] = o.lit ? [C.wood, C.woodL, C.woodD] : [C.xwood, C.xwoodL, C.xwoodD];
    g.fillStyle = b; g.fill(p); g.save(); g.clip(p);
    g.fillStyle = l; g.fillRect(0, -PW / 2 - 4, L + 4, PW * .38); if (bar) g.fillRect(CBX - CBW / 2 - 4, -hb - 4, CBW * .38, 2 * hb + 8);   // the lit faces
    g.fillStyle = d; g.fillRect(0, PW * .22, L + 4, PW); if (bar) g.fillRect(CBX + CBW * .2, -hb - 4, CBW, 2 * hb + 8);                     // the shaded faces
    if (bar) { g.fillStyle = b; g.fillRect(CBX - CBW / 2 + CBW * .38, -PW / 2 + PW * .38, CBW * .58, PW * .6); }
    const r = rng(o.seed ?? 11); g.strokeStyle = o.lit ? 'rgba(130,70,20,.4)' : 'rgba(30,22,16,.4)'; g.lineWidth = 2; g.lineCap = 'round';
    for (let k = 0; k < 6; k++) { const y0 = -PW / 2 + 5 + r() * (PW - 10), x0 = r() * L * .8; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + 40 + r() * 90, y0 + (r() - .5) * 3); g.stroke(); }   // brushed grain
    g.globalAlpha = .9; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = TX.chalkPat; g.fillRect(0, 0, w, h);
    g.restore();
    return { c, hb, L };
  };
  K.drawBeam = function (ctx, X, u0, u1, x, y, a, alpha = 1) {
    if (u1 - u0 < .5 || alpha <= 0) return;
    const L = X.L;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = alpha;
    const hb = X.hb, dh = 2 * hb + 2 * CPAD, left = u0 <= .5 ? -CPAD : u0, right = u1 >= L - .5 ? L + CPAD : u1;
    ctx.drawImage(X.c, (left + CPAD) * KX, 0, (right - left) * KX, dh * KX, left, -hb - CPAD, right - left, dh);
    ctx.restore();
  };
  /* beamHalo(ctx, X, u0, u1, k) — the lantern's grainy halo laid along a held beam between u0 and u1 (the accent glow) */
  K.beamHalo = function (ctx, X, u0, u1, k) {
    if (k <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .2 * k;
    const n = Math.max(1, Math.round((u1 - u0) / 90));
    for (let i = 0; i <= n; i++) { const u = lerp(u0, u1, n ? i / n : .5), p = [X.x + Math.cos(X.a) * u, X.y + Math.sin(X.a) * u], R = 56; ctx.drawImage(TX.halo, p[0] - R, p[1] - R, 2 * R, 2 * R); }
    ctx.restore();
  };

  // ------------------------------------------------------------------ the picture-book world
  let E = null, G = 0, GX = null, GAY = 0, ROADX0 = -1600, ROADX1 = 0, FY = 1300, BY = 1252, RT = 1212, LIP = 1372, WATER = 1880;
  const SH = K.SH = {};
  /* sheet(x0, y0, x1, y1, draw, K) — paint a static world-space plate once (draw(g) in world coords); drawSheet(ctx, s)
     blits only its visible part (any transform) */
  const sheet = K.sheet = function (x0, y0, x1, y1, draw, Ks = 1) {
    const c = Pilot.canvas(Math.ceil((x1 - x0) * Ks), Math.ceil((y1 - y0) * Ks)), g = c.getContext('2d'); g.setTransform(Ks, 0, 0, Ks, -x0 * Ks, -y0 * Ks); g.lineJoin = 'round'; draw(g);
    return { c, x0, y0, x1, y1, K: Ks };
  };
  const drawSheet = K.drawSheet = function (ctx, s) {
    const m = ctx.getTransform(), inv = m.inverse(), p0 = inv.transformPoint(new DOMPoint(0, 0)), p1 = inv.transformPoint(new DOMPoint(W, H));
    const x0 = Math.max(s.x0, Math.min(p0.x, p1.x) - 4), x1 = Math.min(s.x1, Math.max(p0.x, p1.x) + 4), y0 = Math.max(s.y0, Math.min(p0.y, p1.y) - 4), y1 = Math.min(s.y1, Math.max(p0.y, p1.y) + 4);
    if (x1 <= x0 || y1 <= y0) return;
    ctx.drawImage(s.c, (x0 - s.x0) * s.K, (y0 - s.y0) * s.K, (x1 - x0) * s.K, (y1 - y0) * s.K, x0, y0, x1 - x0, y1 - y0);
  };
  /* trunk(x, w, top, bot, seed, lean) — a painted tree-trunk path; branch(g, x, y, ang, len, wd, col, seed) a forking twig;
     fern(g, x, y, h, col, ang, seed); bushClump(g, cx, cy, rw, rh, col, top, seed) — the forest's painted pieces */
  const trunk = K.trunk = function (x, w, top, bot, seed, lean = 0) { return smooth(rough([[x - w / 2, bot], [x - w * .42 + lean, top], [x + w * .42 + lean, top], [x + w / 2, bot]], Math.min(10, w * .25), seed, 14)); };
  const branch = K.branch = function (g, x, y, ang, len, wd, col, seed, depth = 0) {
    const r = rng(seed); g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
    let px = x, py = y, a = ang; const pts = [[px, py]];
    for (let i = 0; i < 5; i++) { a += (r() - .5) * .5; px += Math.cos(a) * len / 5; py += Math.sin(a) * len / 5; pts.push([px, py]); }
    g.lineWidth = wd; g.stroke(smooth(pts, false));
    if (depth < 2) for (let i = 1; i < 5; i++) if (r() < .55) branch(g, pts[i][0], pts[i][1], a + (r() < .5 ? -1 : 1) * (.5 + r() * .5) - .3, len * (.35 + r() * .25), Math.max(1.4, wd * .55), col, seed * 7 + i, depth + 1);
  };
  const fern = K.fern = function (g, x, y, h, col, ang = 0, seed = 1) {
    const r = rng(seed); g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round';
    g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(h * .08, -h * .5, h * .02, -h); g.stroke();
    for (let i = 1; i < 11; i++) { const u = i / 11, yy = -h * u, xx = h * .08 * Math.sin(u * 2.2), Lf = h * .34 * (1 - u * .75);
      for (const sg of [-1, 1]) { const p = new Path2D(); p.moveTo(xx, yy); p.quadraticCurveTo(xx + sg * Lf * .6, yy - Lf * .1, xx + sg * Lf, yy - Lf * .55 - r() * 6); p.quadraticCurveTo(xx + sg * Lf * .5, yy + 4, xx, yy + 5); g.fill(p); } }
    g.restore();
  };
  const bushClump = K.bushClump = function (g, cx, cy, rw, rh, col, top, seed) {
    const r = rng(seed), pts = [];
    for (let i = 0; i <= 16; i++) { const u = i / 16, a = Math.PI + u * Math.PI, bump = 1 + .12 * Math.sin(u * 23 + seed) + (r() - .5) * .08; pts.push([cx + Math.cos(a) * rw * bump, cy + Math.sin(a) * rh * bump]); }
    pts.push([cx + rw, cy + 8], [cx - rw, cy + 8]);
    const p = smooth(rough(pts, 6, seed, 9)); paint(g, p, col, 1);
    g.save(); g.clip(p); g.strokeStyle = top; g.lineWidth = 3; g.globalAlpha = .55;
    for (let i = 0; i < 14; i++) { const a = Math.PI * (1.1 + r() * .8), x = cx + Math.cos(a) * rw * .8, y = cy + Math.sin(a) * rh * .8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 7, y - 4); g.stroke(); }
    g.restore();
  };
  const inGap = K.inGap = (x, pad = 0) => E != null && x > E - pad && x < E + G + pad;
  const nearGate = (x, d) => GX != null && Math.abs(x - GX) < d;
  /* buildWorld(o) — paint every sheet once. o:
       x0, x1     the embankment's extent (world x)
       gap        { x, w } a ravine cut through the embankment down to dark water (near lip x, width w) — or omit
       gate       { x } a round stone arch in a hillside, warm lantern light pouring out, the lantern on its hooked pole — or omit
       clearOK    x => bool — false where no fern/bush may stand on the far edge (where figures kneel)
       moon       [x, y] on the far sheet (parallax .15; default [640, 250]); screen x ≈ 540 + (x − .15·cam.x)·1.06
       FY BY RT LIP WATER   layout overrides (K.Y) */
  K.buildWorld = function (o = {}) {
    ({ FY, BY, RT, LIP, WATER } = Object.assign({}, K.Y, o));
    ROADX0 = o.x0 ?? -1600; ROADX1 = o.x1 ?? 3000;
    if (o.gap) { E = o.gap.x; G = o.gap.w; } else { E = null; G = 0; }
    if (o.gate) { GX = o.gate.x; GAY = BY + 4 - 300; } else GX = null;
    const clearOK = o.clearOK || (() => true), MOON = o.moon || [640, 250];
    // far (parallax .15): the sky, the moon, misty light columns, pale far trunks
    SH.far = sheet(-900, -250, 1500, 1320, g => {
      const r = rng(11), sg = g.createLinearGradient(0, -250, 0, 1320); sg.addColorStop(0, C.sky0); sg.addColorStop(.5, C.sky1); sg.addColorStop(1, C.sky2);
      g.fillStyle = sg; g.fillRect(-900, -250, 2400, 1570);
      const [MX, MY] = MOON, mg = g.createRadialGradient(MX, MY, 40, MX, MY, 700); mg.addColorStop(0, 'rgba(200,240,232,.38)'); mg.addColorStop(1, 'rgba(200,240,232,0)'); g.fillStyle = mg; g.fillRect(-900, -250, 2400, 1570);
      g.save(); g.globalAlpha = .5; g.fillStyle = TX.chalkPat; g.fillRect(-900, -250, 2400, 1570); g.restore();
      for (let x = -860; x < 1480; x += 110 + r() * 170) { g.save(); g.globalAlpha = .1 + r() * .07; paint(g, trunk(x, 22 + r() * 44, -260, 1300, x), '#d6f2ea', .4); g.restore(); }
      const halo = g.createRadialGradient(MX, MY, 50, MX, MY, 210); halo.addColorStop(0, 'rgba(240,255,248,.55)'); halo.addColorStop(1, 'rgba(240,255,248,0)'); g.fillStyle = halo; g.fillRect(MX - 260, MY - 250, 520, 520);
      paint(g, smooth(rough(ell(MX, MY, 60, 58, 22), 5, 4, 8)), C.moon, .35);
      for (let x = -880; x < 1480; x += 50 + r() * 60) { if (Math.abs(x - MX) < 80) continue; const w = 14 + r() * 22;
        paint(g, trunk(x, w, -260, 1300, x * .1, (r() - .5) * 8), r() < .5 ? C.far : C.far2, .6);
        g.save(); g.globalAlpha = .9; branch(g, x, 200 + r() * 500, -Math.PI / 2 + (r() < .5 ? -.9 : .9), 70 + r() * 60, 4, C.far2, x + 900); g.restore(); }
    });
    // mid (parallax .42): mid trunks with branches, rounded hills with bushes and ferns
    SH.mid = sheet(-800, -300, 2200, 1360, g => {
      const r = rng(23);
      for (let x = -760; x < 2180; x += 150 + r() * 200) { const w = 26 + r() * 36; paint(g, trunk(x, w, -300, 1300, x * .3, (r() - .5) * 12), C.mid, .8);
        branch(g, x, 200 + r() * 300, -Math.PI / 2 + (r() < .5 ? .8 : -.8), 150, 7, C.mid, x + 1000); branch(g, x, 450 + r() * 250, -Math.PI / 2 + (r() < .5 ? -.9 : .9), 120, 6, C.mid, x + 2000); }
      for (let x = -900; x < 2300; x += 520 + r() * 300) { const w = 300 + r() * 160, h = 120 + r() * 90, base = 1150;
        const pts = [[x - w, base + 200]]; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push([x - w + 2 * w * u, base - Math.sin(u * Math.PI) * h]); } pts.push([x + w, base + 200]);
        const hp = smooth(rough(pts, 7, x, 12)); paint(g, hp, r() < .5 ? C.hill : C.hill2, 1);
        g.save(); g.clip(hp); const hg = g.createLinearGradient(0, base - h, 0, base - h + 90); hg.addColorStop(0, C.hillT); hg.addColorStop(1, 'rgba(58,116,113,0)'); g.fillStyle = hg; g.fillRect(x - w, base - h - 10, 2 * w, 120); g.restore();
        bushClump(g, x + w * .5, base - 10, 70 + r() * 40, 80 + r() * 50, C.bush, C.bush2, x | 0); fern(g, x - w * .4, base + 6, 90, C.near, -.1, x | 0); }
    });
    // near (parallax .7): the far bank (bushes, ferns, a few dark trunks) and the strip of still water behind the embankment
    SH.near = sheet(-900, -400, 3100, 1340, g => {
      const r = rng(37), wl = 1150;
      const wg = g.createLinearGradient(0, wl, 0, 1340); wg.addColorStop(0, C.water0); wg.addColorStop(1, C.water1); g.fillStyle = wg; g.fillRect(-900, wl, 4000, 200);
      g.fillStyle = 'rgba(214,250,240,.45)'; for (let i = 0; i < 160; i++) { const y = wl + 12 + r() * 170; g.fillRect(-900 + r() * 4000, y, 16 + r() * 60, 2 + r() * 1.5); }
      g.save(); g.globalAlpha = .5; g.fillStyle = TX.chalkPat; g.fillRect(-900, wl, 4000, 200); g.restore();
      const bank = [[-900, wl + 8]]; for (let x = -900; x <= 3100; x += 40) bank.push([x, wl - 6 - 10 * Pilot.fbm(x / 140, 3, 3)]); bank.push([3100, wl + 8], [3100, wl + 30], [-900, wl + 30]);
      paint(g, smooth(rough(bank, 5, 9, 14)), C.hill2, 1);
      for (let x = -880; x < 3080; x += 230 + r() * 320) { if (r() < .45) bushClump(g, x, wl + 6, 60 + r() * 60, 60 + r() * 70, C.bush, C.bush2, x | 0); else fern(g, x, wl + 8, 70 + r() * 60, C.near, (r() - .5) * .4, x | 0); }
      for (let x = -700; x < 3000; x += 700 + r() * 500) { const w = 60 + r() * 40; paint(g, trunk(x, w, -400, wl + 20, x, (r() - .5) * 10), C.near, .8);
        branch(g, x, 100 + r() * 300, -Math.PI / 2 + (r() < .5 ? -.7 : .7), 190, 9, C.near, x + 3000); }
    });
    // the ravine inside the gap: dark teal walls stepping down, dark water far below
    if (E != null) SH.rav = sheet(E - 40, RT - 20, E + G + 40, WATER + 20, g => {
      const r = rng(41), rg = g.createLinearGradient(0, RT, 0, WATER); rg.addColorStop(0, '#1d4652'); rg.addColorStop(.3, '#10303c'); rg.addColorStop(.7, '#0a2230'); rg.addColorStop(1, '#061822');
      g.fillStyle = rg; g.fillRect(E - 40, RT - 20, G + 80, WATER - RT + 140);
      for (const [col, inset, yTop] of [['#1a3f4b', 14, RT + 30], ['#123441', 40, RT + 150], ['#0c2835', 70, RT + 300], ['#081e2a', 100, RT + 450]]) {
        const lw = [], rw = []; for (let y = yTop; y <= WATER + 40; y += 22) { lw.push([E + inset + r() * 14 + (y - yTop) * .13, y]); rw.push([E + G - inset - r() * 14 - (y - yTop) * .13, y]); }
        paint(g, smooth(rough([[E - 40, yTop - 30], ...lw, [E - 40, WATER + 60]], 5, inset, 12)), col, .9); paint(g, smooth(rough([[E + G + 40, yTop - 30], ...rw, [E + G + 40, WATER + 60]], 5, inset + 7, 12)), col, .9); }
    });
    else SH.rav = null;
    // the embankment: a mossy walking surface, a rough earth face below it down to the water (the gap cut through both)
    let parts, LE = null, RE = null;
    if (E != null) {
      const top0 = rough([[ROADX0, RT], [E, RT]], 4, 2, 14, false), top1 = rough([[E + G, RT], [ROADX1, RT]], 4, 3, 14, false);
      const lipEdge = (x, dir, seed) => { const q = rng(seed), o = []; for (let y = RT; y <= WATER + 20; y += 16) o.push([x + dir * (y < RT + 40 ? q() * 3 : (4 + q() * 12 + (y - RT) * .03)), y]); return o; };
      LE = lipEdge(E, 1, 71); RE = lipEdge(E + G, -1, 73);
      parts = () => [smooth([...top0, ...LE, [ROADX0, WATER + 20]].map(p => p)), smooth([...RE.slice().reverse(), ...top1, [ROADX1, WATER + 20], [E + G, WATER + 20]])];
    } else {
      const top = rough([[ROADX0, RT], [ROADX1, RT]], 4, 2, 14, false);
      parts = () => [smooth([...top, [ROADX1, WATER + 20], [ROADX0, WATER + 20]])];
    }
    SH.ground = sheet(ROADX0, RT - 30, ROADX1, WATER + 30, g => {
      const r = rng(53);
      for (const part of parts()) {
        g.save(); g.clip(part);
        const bg = g.createLinearGradient(0, RT, 0, LIP); bg.addColorStop(0, C.moss); bg.addColorStop(.6, C.moss2); bg.addColorStop(1, C.moss3); g.fillStyle = bg; g.fillRect(ROADX0, RT - 30, ROADX1 - ROADX0, LIP - RT + 30);
        const face = smooth(rough([[ROADX0, LIP + 4], [ROADX1, LIP + 4], [ROADX1, WATER + 40], [ROADX0, WATER + 40]], 8, 5, 18)); paint(g, face, C.cliff, 1);
        const fg = g.createLinearGradient(0, LIP, 0, WATER); fg.addColorStop(0, 'rgba(10,30,40,.35)'); fg.addColorStop(.25, 'rgba(10,30,40,0)'); fg.addColorStop(1, 'rgba(60,120,125,.25)'); g.fillStyle = fg; g.fillRect(ROADX0, LIP, ROADX1 - ROADX0, WATER - LIP + 40);
        for (let i = 0; i < (ROADX1 - ROADX0) / 70; i++) { const x = ROADX0 + r() * (ROADX1 - ROADX0), y = LIP + 90 + r() * (WATER - LIP - 120), rw = 30 + r() * 60, rh = rw * (.5 + r() * .3);
          paint(g, smooth(rough(ell(x, y, rw, rh, 16), 5, i, 9)), r() < .5 ? C.cliffL : C.cliff2, .9); }
        g.strokeStyle = C.cliffL; g.lineWidth = 4; g.beginPath(); for (let x = ROADX0; x <= ROADX1; x += 30) g.lineTo(x, LIP + 8 + 4 * Math.sin(x / 47)); g.stroke();   // the lit lip
        g.strokeStyle = '#0d2230'; g.lineWidth = 3; for (let x = ROADX0 + 40; x < ROADX1; x += 120 + r() * 200) { const l = 30 + r() * 90; g.beginPath(); g.moveTo(x, LIP + 10); g.quadraticCurveTo(x + 10, LIP + l * .6, x + (r() - .5) * 16, LIP + l); g.stroke(); }   // roots
        g.fillStyle = 'rgba(170,225,205,.4)'; for (let i = 0; i < 900; i++) { const x = ROADX0 + r() * (ROADX1 - ROADX0), y = RT + 10 + r() * (LIP - RT - 20); g.fillRect(x, y, 6, 2); }   // pale grass dashes
        g.globalAlpha = .9; g.fillStyle = TX.chalkPat; g.fillRect(ROADX0, RT - 30, ROADX1 - ROADX0, WATER - RT + 60);
        g.restore();
      }
      if (LE) { g.strokeStyle = 'rgba(170,225,210,.55)'; g.lineWidth = 3; for (const ed of [LE, RE]) { g.beginPath(); g.moveTo(...ed[0]); for (const q of ed) { if (q[1] > LIP + 10) break; g.lineTo(...q); } g.stroke(); } }
      // ferns and tufts along the far edge (not at the gap or the gate, not where clearOK says no)
      for (let x = ROADX0 + 60; x < ROADX1 - 60; x += 120 + r() * 200) { if (inGap(x, 90) || nearGate(x, 260) || !clearOK(x)) continue;
        if (r() < .5) fern(g, x, RT + 10, 60 + r() * 50, r() < .5 ? C.near : C.near2, (r() - .5) * .4, x | 0); else bushClump(g, x, RT + 14, 40 + r() * 30, 34 + r() * 26, C.bush, C.bush2, x | 0); }
    });
    // the gate: a plain round stone arch in a hillside on the far side
    if (GX != null) SH.gate = sheet(GX - 320, 280, ROADX1, BY + 30, g => {
      const r = rng(61), hp = [[GX - 300, BY + 20]]; for (let i = 0; i <= 24; i++) { const u = i / 24; hp.push([GX - 320 + u * 760, BY + 10 - Math.pow(Math.sin(Math.min(1, u * 1.1) * Math.PI / 2), .8) * 540]); } hp.push([ROADX1, BY - 520], [ROADX1, BY + 20]);
      const hill = smooth(rough(hp, 9, 6, 14)); paint(g, hill, '#1d4652', 1);
      g.save(); g.clip(hill); const hg = g.createLinearGradient(GX - 300, 0, GX + 300, 0); hg.addColorStop(0, 'rgba(58,116,113,.6)'); hg.addColorStop(1, 'rgba(58,116,113,0)'); g.fillStyle = hg; g.fillRect(GX - 320, 280, 800, BY);
      g.fillStyle = 'rgba(150,210,200,.22)'; for (let i = 0; i < 160; i++) g.fillRect(GX - 280 + r() * 900, 500 + r() * 700, 5, 2); g.restore();
      for (let i = 0; i < 13; i++) { const a0 = Math.PI + Math.PI * i / 13, a1 = Math.PI + Math.PI * (i + 1) / 13 - .03;   // stones around the opening
        const pts = [[GX + Math.cos(a0) * 98, GAY + Math.sin(a0) * 98], [GX + Math.cos(a0) * 134, GAY + Math.sin(a0) * 134], [GX + Math.cos(a1) * 134, GAY + Math.sin(a1) * 134], [GX + Math.cos(a1) * 98, GAY + Math.sin(a1) * 98]];
        paint(g, smooth(rough(pts, 2, i, 6)), i % 2 ? C.stone : C.stone2, .8); }
      for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) { const y0 = GAY + k * 76, pts = [[GX + sx * 98, y0], [GX + sx * 134, y0], [GX + sx * 134, y0 + 72], [GX + sx * 98, y0 + 72]];
        paint(g, smooth(rough(pts, 2, k + sx * 9, 6)), (k + (sx > 0)) % 2 ? C.stone : C.stone2, .8); }
      g.save(); g.globalCompositeOperation = 'destination-out'; g.fill(K.archPath(97)); g.restore();
      bushClump(g, GX + 230, BY + 12, 80, 90, C.bush, C.bush2, 64); fern(g, GX - 200, BY + 14, 90, C.near, -.15, 65);
    });
    // water glints, splash drops, floating diamond motes (one seeded stream)
    const r = rng(101);
    for (let i = 0; i < 160; i++) { const y = WATER + 20 + Math.pow(r(), 1.3) * 600; DASH.push({ x: ROADX0 + r() * (ROADX1 - ROADX0), y, l: 20 + r() * 70, w: 2 + r() * 1.5, a: .35 + r() * .35, f: .8 + r() * 1.6, p: r() * TAU }); }
    for (let i = 0; i < 18; i++) DROPS.push({ vx: (r() - .5) * 360, vy: 300 + r() * 360, s: 3 + r() * 4 });
    for (let i = 0; i < 40; i++) MOTES.push({ x: r() * 1180, y: 160 + r() * 1400, s: 3 + r() * 5, a: .3 + r() * .45, f: .4 + r() * .7, p: r() * TAU });
    Object.assign(K, { GX, GAY, ROADX0, ROADX1 });
  };
  /* archPath(r) — the gate's round-arched opening (radius r) */
  K.archPath = function (r) { const p = new Path2D(), gy = BY + 4; p.moveTo(GX - r, gy); p.lineTo(GX - r, GAY); p.arc(GX, GAY, r, Math.PI, TAU); p.lineTo(GX + r, gy); p.closePath(); return p; };
  /* lantern(ctx, x, y, px, gy, lit) — the lantern hanging at (x, y) from a hooked pole standing at px on ground gy, lit 0..1+
     (warm screen glow + the grainy halo). The worked example hangs it beside the gate: (GX+128, BY−236, GX+190, BY). */
  K.lantern = function (ctx, x, y, px, gy, lit) {
    ctx.save(); ctx.strokeStyle = '#0c1d29'; ctx.lineCap = 'round'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(px, gy + 6); ctx.lineTo(px - 6, y - 80); ctx.stroke();
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(px - 6, y - 80); ctx.quadraticCurveTo(px - 30, y - 104, x + 4, y - 66); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(x, y, 8, x, y, 420); g.addColorStop(0, `rgba(255,220,130,${.9 * lit})`); g.addColorStop(.14, `rgba(255,190,100,${.4 * lit})`); g.addColorStop(.5, `rgba(255,160,80,${.1 * lit})`); g.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 420, y - 420, 840, 840); ctx.globalAlpha = Math.min(1, lit); ctx.drawImage(TX.halo, x - 150, y - 150, 300, 300); ctx.restore();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 4, y - 66); ctx.lineTo(x, y - 30); ctx.stroke();
    const glass = new Path2D(); glass.roundRect(x - 13, y - 22, 26, 36, 7); ctx.fillStyle = `rgb(255,${200 + 20 * lit | 0},${110 + 10 * lit | 0})`; ctx.fill(glass);
    ctx.fillStyle = '#0b1a24'; ctx.fillRect(x - 17, y - 30, 34, 9); ctx.fillRect(x - 15, y + 13, 30, 8); ctx.fillRect(x - 2, y - 22, 4, 36);
    ctx.beginPath(); ctx.moveTo(x - 10, y - 30); ctx.lineTo(x, y - 38); ctx.lineTo(x + 10, y - 30); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,240,190,${.8 * lit})`; ctx.beginPath(); ctx.ellipse(x, y - 4, 6, 9, 0, 0, TAU); ctx.fill();
    ctx.restore();
  };
  /* flicker(t) — the lantern's small living flicker multiplier (~±6 %) */
  K.flicker = t => 1 + .06 * Math.sin(t * 13.3) + .04 * Math.sin(t * 23.1 + 1);

  // ------------------------------------------------------------------ live bits
  /* hitLight(t, at, depth) — the light multiplier for a hit at `at`: dips by depth in .06 s, back over ~1.7 s */
  K.hitLight = (t, at, depth = .5) => 1 - depth * ss(at, at + .06, t) * (1 - ss(at + .35, at + 1.7, t));
  /* flecks(ctx, t, list) — little diamonds thrown up and landing: { t0, x, y, vx, vy (up < 0), land, sz, col } */
  K.flecks = function (ctx, t, list) {
    for (const q of list) {
      const u = t - q.t0; if (u < 0) continue; const al = 1 - ss(q.t0 + 1.0, q.t0 + 1.6, t); if (al <= 0) continue;
      const tl = (-q.vy + Math.sqrt(q.vy * q.vy + 4 * 700 * (q.land - q.y))) / 1400, uu = Math.min(u, Math.max(0, tl));
      const x = q.x + q.vx * uu, y = q.y + q.vy * uu + 700 * uu * uu, z = q.sz * .9;
      ctx.globalAlpha = al; ctx.fillStyle = q.col; ctx.beginPath(); ctx.moveTo(x, y - z); ctx.lineTo(x + z * .7, y); ctx.lineTo(x, y + z); ctx.lineTo(x - z * .7, y); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  /* dust(ctx, t, at, x, y) — the hit: a half-ring of chalk-dust diamonds from (x, y) over 1.1 s */
  K.dust = function (ctx, t, at, x, y) {
    if (t > at && t < at + 1.2) { const u = clamp((t - at) / 1.1); ctx.save(); ctx.fillStyle = '#e4f4ec';
      for (let k = 0; k < 22; k++) { const a = Math.PI + (k / 21) * Math.PI, R = 14 + eo(u) * (70 + (k % 3) * 30), px = x + Math.cos(a) * R * 1.5, py = y + Math.sin(a) * R * .55 - u * 16, z = 4;
        ctx.globalAlpha = .85 * (1 - u); ctx.beginPath(); ctx.moveTo(px, py - z); ctx.lineTo(px + z * .7, py); ctx.lineTo(px, py + z); ctx.lineTo(px - z * .7, py); ctx.fill(); } ctx.restore(); }
  };
  /* splash(ctx, t, at, x) — something hits the water at x: three widening rings + drops for ~2 s */
  K.splash = function (ctx, t, at, x) {
    if (t > at && t < at + 2) { const age = t - at, sx = x; ctx.save();
      for (let j = 0; j < 3; j++) { const a2 = age - j * .25; if (a2 < 0) continue; const k = Math.min(1, a2 / 1.5), rr = 14 + 70 * eo(k); ctx.strokeStyle = `rgba(226,252,244,${.45 * (1 - k)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sx, WATER + 10, rr, rr * .18, 0, 0, TAU); ctx.stroke(); }
      if (age < 1) { ctx.fillStyle = 'rgba(226,250,242,.95)'; for (const d of DROPS) { const px = sx + d.vx * age * .5, py = WATER - d.vy * age * .5 + 450 * age * age; if (py > WATER + 6) continue; ctx.beginPath(); ctx.ellipse(px, py, d.s, d.s * 1.3, 0, 0, TAU); ctx.fill(); } }
      ctx.restore(); }
  };
  /* halo(ctx, x, y, R, a) — the grainy lantern halo (additive); soft(ctx, x, y, R, a) — a smooth warm glow */
  K.halo = function (ctx, x, y, R, a) { if (a <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(TX.halo, x - R, y - R, 2 * R, 2 * R); ctx.restore(); };
  K.soft = function (ctx, x, y, R, a) { if (a <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(SOFTG, x - R, y - R, 2 * R, 2 * R); ctx.restore(); };
  /* sprout(g, t, x, y, grow, o) — a painted swamp sprout rising from (x, y = ground): wiry dark stem, blue leaves, a lantern-
     gold bud at the tip. Draw it inside figures() so the chalk tooth lands on it; put its glow on top with sproutGlow().
     o: { h height (300), sway }. → the tip [x, y]. */
  K.sprout = function (g, t, x, y, grow, o = {}) {
    const h = (o.h || 300) * eo(grow), sw = (o.sway ?? 1) * Math.sin(t * 1.1) * 7 * grow, tip = [x + sw, y - h];
    if (grow <= 0) return tip;
    const pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push([x + Math.sin(u * 2.3 + 1) * 10 * grow + sw * u * u, y - h * u]); }
    g.save(); g.strokeStyle = C.stem; g.lineWidth = 9; g.lineCap = 'round'; g.stroke(smooth(pts, false));
    for (let i = 2; i <= 7; i++) { const k = clamp((grow - i / 10) / .25); if (k <= 0) continue;
      const [px, py] = pts[i], side = i % 2 ? 1 : -1, Lf = (84 + 18 * Math.sin(i * 1.7)) * k * (1.2 - i * .06), an = -Math.PI / 2 + side * (.8 + .06 * Math.sin(t * 1.4 + i));
      g.save(); g.translate(px, py); g.rotate(an + Math.PI / 2);
      const lp = smooth([[0, 0], [Lf * .34, -Lf * .4], [0, -Lf], [-Lf * .34, -Lf * .4]]);
      g.fillStyle = i % 3 ? C.leaf2 : '#7fb4e6'; g.fill(lp); g.fillStyle = 'rgba(14,40,90,.35)'; g.save(); g.clip(lp); g.fillRect(-Lf, -Lf, Lf, 2 * Lf); g.restore();
      g.restore(); }
    const br = 26 * clamp((grow - .3) / .4); if (br > 0) {
      const bud = smooth([[tip[0], tip[1] - br * 1.9], [tip[0] + br * .9, tip[1] - br * .9], [tip[0] + br * .7, tip[1]], [tip[0] - br * .7, tip[1]], [tip[0] - br * .9, tip[1] - br * .9]]);
      g.fillStyle = C.gold; g.fill(bud); g.save(); g.clip(bud); g.fillStyle = C.woodD; g.fillRect(tip[0] + br * .15, tip[1] - br * 2, br, br * 2.2);
      g.fillStyle = '#fff3c8'; g.beginPath(); g.ellipse(tip[0] - br * .3, tip[1] - br * 1.1, br * .22, br * .45, -.3, 0, TAU); g.fill(); g.restore(); }
    g.restore();
    return tip;
  };
  /* sproutGlow(ctx, tip, k) — the lantern-gold light of the bud (draw after figures(), unchalked) */
  K.sproutGlow = function (ctx, tip, k) { if (k <= 0) return; K.soft(ctx, tip[0], tip[1] - 20, 200 + 140 * k, .6 * k); K.halo(ctx, tip[0], tip[1] - 20, 100 + 70 * k, .85 * k); };

  // ------------------------------------------------------------------ the frame's layers
  /* layer(ctx, cm, p, fn) — draw fn in world coordinates at parallax p; cm = { x, y, z, sx, sy } */
  const layer = K.layer = function (ctx, cm, p, fn) { const z = 1 + (cm.z - 1) * p, cx = cm.x * p, cy = 960 + (cm.y - 960) * p; ctx.save(); ctx.setTransform(z, 0, 0, z, 540 - cx * z + cm.sx * p, 960 - cy * z + cm.sy * p); fn(); ctx.restore(); };
  K.cam = (x, y = 1050, z = 1.03) => ({ x, y, z, sx: 0, sy: 0 });
  K.mixCam = (a, b, k) => k <= 0 ? a : k >= 1 ? b : { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
  /* shake(c, t, at) — sets c.sx/c.sy: the hit's camera shake (15/11 px decaying over .55 s from `at`) */
  K.shake = function (c, t, at) { const k = 1 - ss(at, at + .55, t); c.sx = t >= at ? 15 * k * Math.sin(t * 97) : 0; c.sy = t >= at ? 11 * k * Math.sin(t * 131 + 1) : 0; return c; };
  /* backdrop(ctx, t, cm) — the sky colour and the far / mid / near sheets (parallax .15 / .42 / .7) */
  K.backdrop = function (ctx, t, cm) {
    ctx.fillStyle = C.sky1; ctx.fillRect(0, 0, W, H);
    layer(ctx, cm, .15, () => drawSheet(ctx, SH.far));
    layer(ctx, cm, .42, () => drawSheet(ctx, SH.mid));
    layer(ctx, cm, .7, () => drawSheet(ctx, SH.near));
  };
  /* ground(ctx, t, cm, lk, inGate) — the world plane's ground (inside layer(…, 1, …)): the ravine and its mist, the embankment,
     the bright water and its glints, the gate (inGate() draws whoever walks into its light, between the light and the
     stones) and the lantern. Then figures(), then glows. */
  K.ground = function (ctx, t, cm, lk, inGate) {
    const xa = cm.x - 540 / cm.z - 60, xb = cm.x + 540 / cm.z + 60;
    if (SH.rav) { drawSheet(ctx, SH.rav);
      ctx.save(); for (let k = 0; k < 2; k++) { const mx = E + G * .5 + 30 * Math.sin(t * .4 + k * 2), my = RT + 330 + k * 230; ctx.globalAlpha = .16 + .12 * k; ctx.drawImage(MIST, mx - 300, my - 140, 600, 280); } ctx.restore(); }   // depth haze, thicker further down
    drawSheet(ctx, SH.ground);
    const wg = ctx.createLinearGradient(0, WATER - 40, 0, WATER + 700); wg.addColorStop(0, C.water0); wg.addColorStop(.3, C.water1); wg.addColorStop(1, C.water2);
    ctx.fillStyle = wg; ctx.fillRect(xa - 100, WATER, xb - xa + 200, 1200);
    ctx.fillStyle = 'rgba(30,80,92,.55)'; ctx.fillRect(xa - 100, WATER, xb - xa + 200, 70);   // the embankment's reflection
    if (E != null) { const sg = ctx.createRadialGradient(E + G / 2, WATER + 10, 10, E + G / 2, WATER + 10, G * .7); sg.addColorStop(0, 'rgba(6,22,30,.85)'); sg.addColorStop(1, 'rgba(6,22,30,0)');   // the cleft's shadow on the water
      ctx.save(); ctx.translate(E + G / 2, WATER + 10); ctx.scale(1, .22); ctx.translate(-(E + G / 2), -(WATER + 10)); ctx.fillStyle = sg; ctx.fillRect(E - G * .2, WATER + 10 - G * .7, G * 1.4, G * 1.4); ctx.restore(); }
    ctx.save(); ctx.lineCap = 'round';
    for (const d of DASH) { const xx = d.x + Math.sin(t * .6 + d.p) * 12; if (xx < xa - 100 || xx > xb) continue; const a = .5 + .5 * Math.sin(t * d.f + d.p); if (a < .15) continue;
      ctx.strokeStyle = `rgba(214,250,240,${a * d.a})`; ctx.lineWidth = d.w; ctx.beginPath(); ctx.moveTo(xx, d.y); ctx.lineTo(xx + d.l, d.y); ctx.stroke(); }
    ctx.restore();
    if (GX != null && GX - 500 < xb) {
      const ga = ctx.createRadialGradient(GX, BY - 120, 10, GX, BY - 120, 300); ga.addColorStop(0, '#fff6d8'); ga.addColorStop(.5, C.warm); ga.addColorStop(1, C.warm2);
      ctx.fillStyle = ga; ctx.fill(K.archPath(99));
      if (inGate) inGate();
      drawSheet(ctx, SH.gate);
      ctx.save(); ctx.globalCompositeOperation = 'screen'; const sp = ctx.createRadialGradient(GX, BY - 120, 20, GX, BY - 80, 420);
      sp.addColorStop(0, 'rgba(255,214,140,.4)'); sp.addColorStop(1, 'rgba(255,170,90,0)'); ctx.fillStyle = sp; ctx.fillRect(GX - 420, BY - 540, 840, 640);
      ctx.fillStyle = 'rgba(255,200,120,.22)'; ctx.beginPath(); ctx.moveTo(GX - 90, BY + 4); ctx.lineTo(GX + 90, BY + 4); ctx.lineTo(GX + 170, LIP); ctx.lineTo(GX - 290, LIP); ctx.closePath(); ctx.fill(); ctx.restore();
      K.lantern(ctx, GX + 128, BY - 236, GX + 190, BY, lk * K.flicker(t));
    }
  };
  /* figures(ctx, cm, draw) — the figures layer: draw(fc) paints figures and their objects into a frame-sized buffer (fc has
     the world transform), then the chalk tooth is laid on them (locked to the world) and the band they can occupy
     (world y FY−700 … WATER) is composited. Call inside layer(…, 1, …). */
  K.figures = function (ctx, cm, draw) {
    const xa = cm.x - 540 / cm.z - 60, xb = cm.x + 540 / cm.z + 60;
    const fc = FIG.x, m = ctx.getTransform(); fc.setTransform(1, 0, 0, 1, 0, 0); fc.globalCompositeOperation = 'source-over'; fc.globalAlpha = 1;
    { const y0 = clamp(Math.floor(m.f + m.d * (FY - 720)), 0, H), y1 = clamp(Math.ceil(m.f + m.d * (WATER + 40)), 0, H); if (y1 > y0) fc.clearRect(0, y0, W, y1 - y0); } fc.setTransform(m);
    draw(fc);
    const by0 = clamp(Math.floor(m.f + m.d * (FY - 700)), 0, H), by1 = clamp(Math.ceil(m.f + m.d * (WATER + 20)), 0, H);
    if (by1 > by0) { fc.globalCompositeOperation = 'source-atop'; fc.globalAlpha = .8; fc.fillStyle = TX.chalkPat; fc.fillRect(xa - 200, FY - 700, xb - xa + 400, WATER - FY + 720); fc.globalAlpha = 1; fc.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(FIG.c, 0, by0, W, by1 - by0, 0, by0, W, by1 - by0); ctx.restore(); }
  };
  function plantSprite(seed, flip) {   // a tall swaying swamp plant: wiry dark stem, blue oval leaves
    const c = Pilot.canvas(320, 640), x = c.getContext('2d'), r = rng(seed);
    x.translate(160, 640); if (flip) x.scale(-1, 1);
    for (const [sx, sy, h, a] of [[0, 0, 600, .06], [-30, 0, 430, -.25], [40, 0, 360, .3]]) {
      const pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push([sx + Math.sin(u * 2.3 + seed) * 22 + a * h * u, sy - h * u]); }
      x.strokeStyle = C.stem; x.lineWidth = 6; x.lineCap = 'round'; x.stroke(smooth(pts, false));
      for (let i = 2; i <= 8; i++) { const [px, py] = pts[i], side = i % 2 ? 1 : -1, Lf = 36 + r() * 22, an = -Math.PI / 2 + side * (.7 + r() * .4);
        x.save(); x.translate(px, py); x.rotate(an + Math.PI / 2);
        const lp = smooth([[0, 0], [Lf * .32, -Lf * .4], [0, -Lf], [-Lf * .32, -Lf * .4]]);
        x.fillStyle = r() < .5 ? C.leaf : C.leaf2; x.fill(lp); x.fillStyle = 'rgba(14,40,90,.35)'; x.save(); x.clip(lp); x.fillRect(-Lf, -Lf, Lf, 2 * Lf); x.restore();
        x.restore(); }
    }
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = .9; x.drawImage(TX.chalk, -200, -900);
    return c;
  }
  /* fore(ctx, t, cm) — floating diamond motes, then the two tall swamp plants swaying over the frame's bottom corners */
  K.fore = function (ctx, t, cm) {
    for (const m of MOTES) { const xx = ((m.x - cm.x * .8 + Math.sin(t * m.f * .7 + m.p * 2) * 10) % 1180 + 1180) % 1180 - 50, yy = m.y + Math.sin(t * m.f + m.p) * 14;
      const a = m.a * (.55 + .45 * Math.sin(t * m.f * 1.7 + m.p)); ctx.fillStyle = `rgba(206,236,234,${a})`;
      ctx.beginPath(); ctx.moveTo(xx, yy - m.s); ctx.lineTo(xx + m.s * .7, yy); ctx.lineTo(xx, yy + m.s); ctx.lineTo(xx - m.s * .7, yy); ctx.closePath(); ctx.fill(); }
    for (const p of PLANTS) { ctx.save(); ctx.translate(p.x + cm.sx * 1.2, p.y + cm.sy * 1.2); ctx.rotate(Math.sin(t * p.f + p.p) * .035 + Math.sin(t * p.f * 2.3) * .01); ctx.scale(p.s, p.s); ctx.drawImage(p.c, -160, -640); ctx.restore(); }
  };
  /* post(ctx, cm, lk) — the vignette, the hit's dim (lk < 1), and the paper grain locked to the world */
  K.post = function (ctx, cm, lk) {
    ctx.drawImage(VIG, 0, 0);
    const dim = 1 - lk; if (dim > 0) { ctx.fillStyle = `rgba(6,20,30,${.5 * dim})`; ctx.fillRect(0, 0, W, H); }
    ctx.save(); ctx.globalAlpha = .06;
    GRAIN.setTransform(new DOMMatrix([cm.z, 0, 0, cm.z, 540 - cm.x * cm.z, 960 - cm.y * cm.z])); ctx.fillStyle = GRAIN; ctx.fillRect(0, 0, W, H); ctx.restore();
  };

  // ------------------------------------------------------------------ words
  /* captionShade(ctx, t, lines) — a soft dark behind the words (no box) */
  K.captionShade = function (ctx, t, lines) {
    let a = 0, three = false; for (const [s0, s1, s, src] of lines) { const w = Pilot.win(t, s0, s1, .35, .45); if (w > a) { a = w; three = !!src; } }
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a * .6; ctx.translate(540, three ? 490 : 440); ctx.scale(1, three ? .42 : .3); ctx.drawImage(SHADE, -560, -560, 1120, 1120); ctx.restore();
  };
  /* captions(ctx, t, lines, end, o) — Gowun Batang 700 / 60 px, cream, y 430, until the end card at `end` */
  K.captions = function (ctx, t, lines, end, o = {}) {
    if (t >= end) return;
    K.captionShade(ctx, t, lines);
    Story.captions(ctx, t, lines, Object.assign({ font: K.FONT, weight: 700, size: 60, color: C.ink, srcColor: '#cfe6e0', y: 430, shadow: 'rgba(6,26,36,.85)', shadowBlur: 20 }, o));
  };
  /* endPlate(ctx, t, at) — a painted teal page (chalk tooth, a hand-drawn frame) comes over the picture, a little lantern
     halo low on it */
  K.endPlate = function (ctx, t, at) {
    const k = ss(at - .2, at + .35, t); if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = k; ctx.drawImage(PLATE, 0, 0); ctx.restore();
    if (k > .05) { const x = 540, y = 1390; ctx.save(); ctx.globalAlpha = k; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(TX.halo, x - 90, y - 90, 180, 180); ctx.restore(); }
  };
  K.endCard = (ctx, t, card, at, o = {}) => Story.endCard(ctx, t, card, at, Object.assign({ font: K.FONT, color: C.ink, srcColor: '#cfe6e0', y: 880, titleShadow: 'rgba(6,26,36,.6)' }, o));

  window.Storybook = K;
})();

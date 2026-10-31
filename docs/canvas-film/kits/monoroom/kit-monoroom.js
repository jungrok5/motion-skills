/* kit-monoroom.js — house style "one-hue print" (보라 단색) for word-log films.  Global: window.Mono
   Everything is violet in four values (pale sky, mid, deep, near-black ink) plus the cream of the people; heavy mottled
   grain over all of it; a firm black line that only BREATHES (a faint boil on twos — calmer than risoline). Texture does
   the work colour can't: cross-hatching on dark things, pinstriped trousers, wet tufty hair. The weather is the world:
   a storm band, wind-bent trees with torn pale leaves, slanting rain, puddles with rings. ONE colour — a lamp yellow —
   for the one thing the film is about; it flickers on like a lamp (Mono.flicker). Light that is NOT the accent is a
   lighter VALUE of the same violet (Mono.glow(…, pale)). The hit is the storm's own: a lightning bolt and a bleached frame.
   The figures are the style lab's wet-haired kid in a hoodie and pinstriped trousers, on a 2-bone IK rig (Mono.Rig):
   the accent kid in cream, the others in mid violet + hatching.
   First film: sermons/2026-10-24-cross-styles/film/scenes/cs-monoroom.html (잘라 낸 건 다리였다 · 08 — the worked example).
   Style card: styles/monoroom/STYLE.md. Template: styles/monoroom/template.html.

   HOW A FRAME IS MADE (draw(ctx, t) → Mono.onTwos(ctx, t, scene) → captions / end card on ones)
     scene(ctx, t):  Mono.boil(t);  Mono.sky(ctx, cm);  Mono.storm(ctx, cm, t);
                     Mono.cam(ctx, cm, 1);  ground.draw(ctx, x0, x1, t);  …figures (Mono.kid), things (Mono.beam), marks…
                     Mono.screen(ctx);  Mono.rain(ctx, t);  Mono.lightning(…hit…);  Mono.endPlate(…);  Mono.grain(ctx, cm);
   World units = px at zoom 1 (camera cm = { x, y, z, sx, sy }: the world point at the frame centre, zoom, shake).
   Pure and seek-safe: seeded randomness only (Pilot.rng / Pilot.noise / Pilot.fbm); textures built once in init().
   Load after lib.js (Pilot) and story.js (Story). */
(function () {
  const { clamp, lerp, ss, eo, eio, rng, noise } = Pilot;
  const TAU = Math.PI * 2;
  const M = {};

  /* ---------------------------------------------------------------- palette, type */
  const C = M.C = { sky: '#b3b7da', wall: '#8b8fc4', mid: '#6b71aa', deep: '#454a86', deep2: '#363a6e', ink: '#15172b', cream: '#f2eee4', cream2: '#e2ddd2',
    yel: '#f1e27c', yelL: '#f8efaa', leaf: '#c7cae8', pale: '#dcdef2' };
  M.ACCENT = C.yel;                                   // the one colour (the lab's lamp)
  M.FONT = "'Gamja Flower',cursive";                  // captions + end card (Google Fonts: Gamja Flower)
  M.FONTS = ["400 76px 'Gamja Flower'"];              // Pilot.run({ fonts })
  M.FONT_CSS = 'https://fonts.googleapis.com/css2?family=Gamja+Flower&display=swap';

  /* ---------------------------------------------------------------- the breathing hand line */
  let K = 0, LWK = 1, AMPK = 1, TS = 1;
  /* M.boil(t) — set the boil frame for this picture (call first in scene()) */
  M.boil = t => { K = Math.round(t * 12); };
  /* M.lw(v?) — get (or set, returning the old value) the line-width multiplier */
  M.lw = v => { const o = LWK; if (v != null) LWK = v; return o; };
  function wob(p, amp, k = K) {
    const x = p[0], y = p[1], f = .02;
    return [x + (noise(x * f + k * 7.31, y * f + .37) - .5) * 2 * amp + (noise(x * .06 + 40, y * .06) - .5) * 1.4 * AMPK,
            y + (noise(x * f + 11.3, y * f + k * 5.17) - .5) * 2 * amp + (noise(x * .06, y * .06 + 90) - .5) * 1.4 * AMPK];
  }
  function chaikin(pts, closed, it = 2) {
    for (let r = 0; r < it; r++) { const o = [], n = pts.length, m = closed ? n : n - 1; if (!closed) o.push(pts[0]);
      for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % n]; o.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); }
      if (!closed) o.push(pts[n - 1]); pts = o; }
    return pts;
  }
  function resample(pts, closed, step) {
    const o = [], n = pts.length, m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % n], d = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(d / step));
      for (let j = 0; j < k; j++) o.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]); }
    if (!closed) o.push(pts[n - 1]); return o;
  }
  function pathOf(pts, closed = true, smooth = true) {
    const p = new Path2D(), n = pts.length;
    if (!smooth || n < 3) { p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) p.lineTo(pts[i][0], pts[i][1]); if (closed) p.closePath(); return p; }
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (closed) { const s = mid(pts[n - 1], pts[0]); p.moveTo(s[0], s[1]);
      for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); p.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); } p.closePath(); }
    else { p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n - 1; i++) { const m = mid(pts[i], pts[i + 1]); p.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); } p.lineTo(pts[n - 1][0], pts[n - 1][1]); }
    return p;
  }
  const ell = (cx, cy, rx, ry, n = 20, rot = 0) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    o.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); } return o; };
  const rot2 = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
  function tube(line, wd) {
    const Lf = [], Rt = [];
    for (let i = 0; i < line.length; i++) { const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      Lf.push([line[i][0] - dy * wd[i], line[i][1] + dx * wd[i]]); Rt.push([line[i][0] + dy * wd[i], line[i][1] - dx * wd[i]]); }
    return Lf.concat(Rt.reverse());
  }
  /* ink(ctx, pts, o) — THE primitive: an inked shape (fill sits on the line — no misregistration in this style), optional
     hatch (o.tone = Mono.pat(…)), then the breathing black line drawn twice (o.lw px, 0 = none; o.single = one pass).
     o: { fill, tone, lw, col, closed (true), smooth (true), raw, step, amp, single } → the Path2D */
  function ink(ctx, pts, o = {}) {
    const closed = o.closed !== false, sm = o.smooth !== false && !o.raw && pts.length > 2;
    const step = (o.step || 11) * clamp(LWK, .6, 1.6);
    const base = o.raw ? pts : resample(sm ? chaikin(pts, closed, 2) : pts, closed, step);
    const amp = (o.amp ?? 1.0) * AMPK;
    const P = base.map(p => wob(p, amp)), path = pathOf(P, closed, sm);
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(path); }
    if (o.tone) { ctx.fillStyle = o.tone; ctx.fill(path); }
    if (o.lw !== 0) { const lw = (o.lw || 5.5) * LWK; ctx.strokeStyle = o.col || C.ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.lineWidth = lw * .88; ctx.stroke(path);
      if ((o.lw || 5.5) > 3.5 && !o.single) { ctx.lineWidth = lw * .7; ctx.stroke(pathOf(base.map(p => wob(p, amp * .9, K + 50.5)), closed, sm)); } }
    return path;
  }
  /* line(ctx, a, b, lw) — one inked stroke */
  const line = (ctx, a, b, lw = 4) => ink(ctx, [a, b], { closed: false, lw, single: true });
  Object.assign(M, { wob, chaikin, resample, pathOf, ink, line, ell, rot2, tube });

  /* ---------------------------------------------------------------- textures (built once) */
  let GRAIN, GLOW, PALE, CACHE = null; const PAT = {};
  function hash2(x, y) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
  function pnoise(x, y, p) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), m = q => ((q % p) + p) % p;
    const a = hash2(m(xi), m(yi)), b = hash2(m(xi + 1), m(yi)), c = hash2(m(xi), m(yi + 1)), d = hash2(m(xi + 1), m(yi + 1));
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function mkHatch(cell, col, lw, a) { const c = Pilot.canvas(cell, cell), x = c.getContext('2d'); x.strokeStyle = col; x.globalAlpha = a; x.lineWidth = lw;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(cell, cell); x.moveTo(cell, 0); x.lineTo(0, cell); x.moveTo(-cell / 2, cell / 2); x.lineTo(cell / 2, cell * 1.5); x.moveTo(cell / 2, -cell / 2); x.lineTo(cell * 1.5, cell / 2); x.stroke(); return c; }
  function mkDiag(cell, col, lw, a) { const c = Pilot.canvas(cell, cell), x = c.getContext('2d'); x.strokeStyle = col; x.globalAlpha = a; x.lineWidth = lw;
    x.beginPath(); x.moveTo(-1, cell + 1); x.lineTo(cell + 1, -1); x.moveTo(-cell / 2, cell / 2); x.lineTo(cell / 2, -cell / 2); x.moveTo(cell / 2, cell * 1.5); x.lineTo(cell * 1.5, cell / 2); x.stroke(); return c; }
  /* M.init() — build the hatches (cross 'hatch' / lighter 'hatch2' / single 'diag' / trouser 'stripe'), the yellow and
     pale glow sprites, the violet grain, the mottling and the on-twos cache. Call once from the scene's init(). */
  M.init = function () {
    const W = Pilot.W, H = Pilot.H, c0 = Pilot.canvas(2, 2).getContext('2d');
    const STRIPE = Pilot.canvas(13, 4); { const x = STRIPE.getContext('2d'); x.fillStyle = C.ink; x.fillRect(5, 0, 3.4, 4); }
    PAT.hatch = c0.createPattern(mkHatch(14, C.ink, 2, .55), 'repeat'); PAT.hatch2 = c0.createPattern(mkHatch(12, C.ink, 1.8, .5), 'repeat');
    PAT.diag = c0.createPattern(mkDiag(12, C.ink, 1.6, .45), 'repeat'); PAT.stripe = c0.createPattern(STRIPE, 'repeat');
    GLOW = Pilot.canvas(256, 256); { const x = GLOW.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, 'rgba(246,236,140,1)'); g.addColorStop(.3, 'rgba(240,226,120,.75)'); g.addColorStop(.62, 'rgba(232,218,120,.2)'); g.addColorStop(1, 'rgba(230,215,120,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); }
    PALE = Pilot.canvas(256, 256); { const x = PALE.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);   // a lighter VALUE, same hue
      g.addColorStop(0, 'rgba(226,228,248,.85)'); g.addColorStop(.4, 'rgba(196,200,236,.4)'); g.addColorStop(1, 'rgba(170,176,222,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); }
    const N = 512; GRAIN = Pilot.canvas(N, N); const g = GRAIN.getContext('2d'), gd = g.createImageData(N, N), r = rng(808);
    const hn = N >> 1, hr = new Float32Array(hn * hn); for (let i = 0; i < hr.length; i++) hr[i] = r();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = (y * N + x) * 4, v = .62 * hr[(y >> 1) * hn + (x >> 1)] + .38 * r() - .5;
      if (v > 0) { gd.data[i] = 236; gd.data[i + 1] = 236; gd.data[i + 2] = 255; gd.data[i + 3] = Math.min(255, v * v * 4 * 150); }
      else { gd.data[i] = 12; gd.data[i + 1] = 12; gd.data[i + 2] = 40; gd.data[i + 3] = Math.min(255, v * v * 4 * 170); } }
    g.putImageData(gd, 0, 0); PAT.grain = c0.createPattern(GRAIN, 'repeat');
    const mw = 128, Mt = Pilot.canvas(mw, mw), mx = Mt.getContext('2d'), md = mx.createImageData(mw, mw);
    for (let y = 0; y < mw; y++) for (let x = 0; x < mw; x++) { const v = pnoise(x / 16, y / 16, 8) * .55 + pnoise(x / 8 + 3, y / 8, 16) * .3 + pnoise(x / 4, y / 4 + 5, 32) * .15, i = (y * mw + x) * 4, k = (v - .5) * 2.2;
      md.data[i] = md.data[i + 1] = md.data[i + 2] = k > 0 ? 255 : 10; md.data[i + 3] = Math.min(255, Math.abs(k) * 44); }
    mx.putImageData(md, 0, 0); { const big = Pilot.canvas(1024, 1024), bx = big.getContext('2d'); bx.imageSmoothingEnabled = true; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) bx.drawImage(Mt, i * 1024, j * 1024, 1024, 1024); PAT.mottle = c0.createPattern(big, 'repeat'); }   // pre-scaled: an unscaled pattern fill is ~3x cheaper
    CACHE = [0, 1].map(() => ({ c: Pilot.canvas(W, H), t: -1 }));
  };
  /* M.pat(name, ox, oy) — a texture fill style anchored at (ox, oy): 'hatch' | 'hatch2' | 'diag' | 'stripe' | 'grain' */
  const pat = M.pat = (name, ox, oy) => { const p = PAT[name]; p.setTransform(new DOMMatrix().translate(Math.round(ox), Math.round(oy)).scale(TS)); return p; };
  /* M.tone(dense, ox, oy) — shade: cross-hatch (dense) or the lighter hatch */
  const tone = M.tone = (dense, ox, oy) => pat(dense ? 'hatch' : 'hatch2', ox, oy);
  /* M.glow(ctx, x, y, r, a, pale) — the yellow lamp light, or (pale = true) a lighter value of the violet */
  const glow = M.glow = (ctx, x, y, r, a, pale) => { if (a <= 0) return; const spr = pale === true ? PALE : pale || GLOW; ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(spr, x - r, y - r, r * 2, r * 2); ctx.restore(); };
  /* M.flicker(k) — the lab lamp coming on, k = seconds since it was switched (0 before): flash, dip, on, settle, hum */
  M.flicker = function (k) { if (k < 0) return 0; if (k < .09) return .8; if (k < .17) return .1; if (k < .25) return 1; if (k < .3) return .35; return .94 + .06 * Math.sin(k * 3.1); };

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
  M.Rig = Rig; Rig.ANK = 14;
  const { frame, headFrame, armGeo, cpt, SHN, SHF, LEG1, LEG2 } = Rig, lerp2 = Rig.lerp2;

  /* ---------------------------------------------------------------- the wet-haired kid (drawn on the rig) */
  const FACE = M.FACE = [[-50, -18], [-54, 20], [-40, 50], [-8, 60], [28, 56], [48, 38], [56, 8], [62, -4], [56, -14], [50, -30], [30, -48], [0, -54], [-32, -46]];
  const HAIR = M.HAIR = [[-56, 0], [-58, 30], [-44, 58], [-20, 72], [6, 70], [30, 64], [50, 48], [60, 22], [52, 18], [44, 30], [34, 18], [22, 30], [10, 16], [-6, 28], [-14, 12], [-30, 20], [-40, -6]];
  /* M.head(ctx, F, HF, s, me) — face, tufty wet hair (strand lines), freckles, ear, eye, mouth.
     F.eye: 'dot' | 'tired' | 'happy' | 'down' | 'shock' | 'worry' | 'glint' (yellow glint);  F.mouth: 'flat' | 'smile' | 'o' | 'wavy' | 'sad' */
  function drawHead(ctx, F, HF, s, me) {
    ink(ctx, FACE.map(q => HF(q[0], q[1])), { fill: C.cream });
    ink(ctx, HAIR.map(q => HF(q[0], q[1])), { fill: F.hair || (me ? C.cream : C.cream2) });
    for (const [u0, v0, u1, v1] of [[-30, 52, -24, 34], [-8, 62, -6, 42], [14, 60, 12, 42], [34, 52, 30, 36]]) line(ctx, HF(u0, v0), HF(u1, v1), 3.6);
    ctx.fillStyle = C.ink; for (const [u, v] of [[18, -18], [26, -22], [12, -24]]) { const q = HF(u, v); ctx.beginPath(); ctx.arc(q[0], q[1], 1.9 * s, 0, TAU); ctx.fill(); }
    ink(ctx, [HF(-28, -2), HF(-38, -10), HF(-34, -26), HF(-24, -22)], { closed: false, lw: 4, single: true });
    const e = HF(32, -6), eye = F.eye || 'dot';
    if (eye === 'tired') ink(ctx, [HF(22, -4), HF(32, -10), HF(42, -6)], { closed: false, lw: 4, single: true });
    else if (eye === 'happy') ink(ctx, [HF(22, -10), HF(32, -1), HF(42, -9)], { closed: false, lw: 4, single: true });
    else if (eye === 'down') ink(ctx, [HF(24, -12), HF(32, -14), HF(41, -12)], { closed: false, lw: 4, single: true });
    else { const r = (eye === 'shock' ? 8 : 5.6) * s * 1.18; ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(e[0], e[1], r, r * 1.15, 0, 0, TAU); ctx.fill();
      if (eye === 'glint' || eye === 'shock') { ctx.fillStyle = eye === 'glint' ? C.yel : C.cream; ctx.beginPath(); ctx.arc(e[0] + F.f * r * .3, e[1] - r * .4, r * .34, 0, TAU); ctx.fill(); } }
    if (eye === 'shock' || eye === 'worry') ink(ctx, [HF(20, 10), HF(32, 14), HF(42, 8)], { closed: false, lw: 3.6, single: true });
    const mo = F.mouth || 'flat';
    if (mo === 'smile') ink(ctx, [HF(38, -32), HF(45, -37), HF(51, -30)], { closed: false, lw: 3.6, single: true });
    else if (mo === 'o') ink(ctx, ell(...HF(44, -33), 4.5 * s * 1.18, 5.5 * s * 1.18, 10), { fill: C.ink, lw: 3, single: true });
    else if (mo === 'wavy') ink(ctx, [HF(36, -34), HF(41, -31), HF(46, -35), HF(51, -31)], { closed: false, lw: 3.4, single: true, smooth: false });
    else if (mo === 'sad') ink(ctx, [HF(38, -35), HF(45, -31), HF(51, -35)], { closed: false, lw: 3.6, single: true });
    else ink(ctx, [HF(38, -34), HF(50, -32)], { closed: false, lw: 3.6, single: true });
  }
  /* pinstriped trouser leg + sneaker (knees/toes overridable through F.knees / F.toes) */
  function drawLeg(ctx, F, i, P) {
    const s = F.s, f = F.f, hp = P(i ? 8 : -6, -2), foot = F.feet[i], ank = [foot[0], foot[1] - 14 * s];
    const kneePick = (a, b) => f * a[0] > f * b[0] ? a : b;
    const kn = F.knees && F.knees[i] ? F.knees[i] : Rig.ik(hp, ank, LEG1 * s, LEG2 * s, kneePick)[0];
    const top = P(i ? 8 : -6, 16), m1 = lerp2(hp, kn, .5), m2 = lerp2(kn, ank, .5);
    ink(ctx, tube([top, m1, kn, m2, ank], [36, 36, 33, 31, 30].map(w => w * s)), { fill: i ? C.cream : C.cream2, tone: pat('stripe', hp[0], 0) });
    const lift = Math.max(0, F.gy - foot[1]), toe = F.toes && F.toes[i] != null ? F.toes[i] : lift > 4 * s ? .25 : 0;
    const sh = [[-24, -12], [8, -14], [30, -8], [40, 2], [30, 8], [-24, 8]].map(p => { const q = rot2(p, -toe); return [foot[0] + f * (q[0] + 6) * s, foot[1] + (q[1] - 6) * s]; });
    ink(ctx, sh, { fill: i ? C.cream : C.cream2, lw: 5 });
    const a = rot2([-18, -2], -toe), b = rot2([40, -2], -toe);
    line(ctx, [foot[0] + f * a[0] * s, foot[1] + a[1] * s], [foot[0] + f * b[0] * s, foot[1] + b[1] * s], 3.2);
  }
  /* M.sleeve(ctx, A, s, fill, tone) / M.mitten(ctx, A, s, type, f) — an arm from Rig.armGeo and its mitten */
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
  /* M.kid(ctx, F, back, mid) — draw a figure in pose F (see Rig). Layer order: shadow, far arm, back() (a thing carried
     behind), legs, hoodie (ribbed hem, kangaroo pocket), neck, hood on the back, head, mid() (a thing between head and near
     arm), F.held(ctx, F) (a tool in the near hand), near arm + mitten. F.me → the accent kid (cream hoodie); others are mid
     violet + hatch. Options: F.body (hoodie fill), F.hair, F.sx squash. → { AF, AN } */
  function drawKid(ctx, F, back, mid) {
    const al = F.alpha ?? 1; if (al <= 0) return;
    ctx.save(); ctx.globalAlpha *= al;
    if (F.sx != null && F.sx !== 1) { ctx.translate(F.hip[0], 0); ctx.scale(F.sx, 1); ctx.translate(-F.hip[0], 0); }
    const s = F.s, f = F.f, me = !!F.me, { P } = frame(F);
    const body = F.body || (me ? C.cream : C.mid), bodyT = me ? null : tone(false, F.hip[0], F.hip[1]);
    ctx.save(); ctx.globalAlpha *= .45; ink(ctx, ell(F.hip[0], F.gy + 6 * s, 96 * s, 11 * s, 16), { fill: C.ink, lw: 0 }); ctx.restore();
    const AF = armGeo(F, P(SHF[0], SHF[1]), F.hands[0], true), AN = armGeo(F, P(SHN[0], SHN[1]), F.hands[1], false);
    const hand = F.hand || ['grip', 'grip'];
    sleeve(ctx, AF, s, me ? C.cream2 : C.deep, me ? null : bodyT); if (!F.farOver && !F.farMid) mitten(ctx, AF, s, hand[0], f);
    if (back) back();
    if (F.farMid) mitten(ctx, AF, s, hand[0], f);
    drawLeg(ctx, F, 0, P); drawLeg(ctx, F, 1, P);
    ink(ctx, [[-50, -20], [-58, 36], [-56, 92], [-44, 126], [-14, 142], [22, 140], [46, 122], [58, 90], [64, 46], [64, 6], [54, -24], [0, -28]].map(q => P(q[0], q[1])), { fill: body, tone: bodyT });
    line(ctx, P(-40, -12), P(52, -14), 4);
    ink(ctx, [P(-4, 8), P(44, 6), P(50, 40), P(2, 44)], { closed: false, lw: 3.6, single: true });
    const { HF } = headFrame(F);
    ink(ctx, [P(2, 124), P(26, 124), P(28, 150), P(2, 152)], { fill: C.cream, lw: 4.5 });
    ink(ctx, [P(-46, 118), P(-58, 150), P(-30, 162), P(-4, 150), P(-8, 128)], { fill: body, tone: bodyT, lw: 4.5 });   // the hood lying flat on the back (round, never pointed)
    drawHead(ctx, F, HF, s, me);
    if (mid) mid();
    if (F.farOver) mitten(ctx, AF, s, hand[0], f);
    if (F.held) F.held(ctx, F);
    sleeve(ctx, AN, s, me ? C.cream : C.mid, me ? null : bodyT); mitten(ctx, AN, s, hand[1], f);
    ctx.restore();
    return { AF, AN };
  }
  Object.assign(M, { kid: drawKid, head: drawHead, leg: drawLeg, sleeve, mitten });

  /* ---------------------------------------------------------------- long things */
  /* M.beam(ctx, B, X, u0, u1, accent, alpha) — a plank / cross (B = Rig.Beam / Rig.CROSS) placed at X, drawn u0…u1:
     accent → lamp yellow with a highlight, else pale cream with single hatching; grain lines. X.sx → yaw squash about X.px */
  function beam(ctx, B, X, u0, u1, accent, alpha = 1) {
    if (!X || u1 - u0 < .5 || alpha <= 0) return;
    if (X.sx != null) { ctx.save(); ctx.translate(X.px, 0); ctx.scale(X.sx, 1); ctx.translate(-X.px, 0); beam(ctx, B, { ...X, sx: null }, u0, u1, accent, alpha); ctx.restore(); return; }
    const PW = B.PW, at = B.bar ? B.bar.at : null, pts = B.poly(u0, u1, B.halfBar(X)).map(([u, v]) => cpt(X, u, v));
    ctx.save(); ctx.globalAlpha *= alpha;
    ink(ctx, pts, { fill: accent ? C.yel : C.cream2, tone: accent ? null : pat('diag', X.x, X.y), smooth: false, lw: 5.2, step: 12 });
    const g0 = Math.max(u0 + 18, 30), g1 = at != null ? Math.min(u1 - 18, at - 30) : u1 - 18;
    if (g1 - g0 > 30) ink(ctx, [cpt(X, g0, -4), cpt(X, lerp(g0, g1, .55), -2)], { closed: false, lw: 3.2, single: true });
    if (at != null && u1 > at + 40 && u0 < at + 30) ink(ctx, [cpt(X, at + 34, 5), cpt(X, Math.min(u1 - 14, at + 92), 6)], { closed: false, lw: 3.2, single: true });
    if (accent) { ctx.save(); ctx.globalAlpha *= .85; ctx.strokeStyle = C.yelL; ctx.lineWidth = 4 * LWK; ctx.lineCap = 'round'; const a = cpt(X, u0 + 10, -PW / 2 + 7), b = cpt(X, u1 - 10, -PW / 2 + 7);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore(); }
    ctx.restore();
  }
  M.beam = beam;

  /* ---------------------------------------------------------------- the storm world */
  /* M.sky(ctx, cm) — the violet sky gradient (mid → wall → pale sky) + mottling drifting with the camera. Screen space. */
  M.sky = function (ctx, cm) {
    const W = Pilot.W, H = Pilot.H; ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sk = ctx.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, C.mid); sk.addColorStop(.55, C.wall); sk.addColorStop(1, C.sky);
    ctx.fillStyle = sk; ctx.fillRect(0, 0, W, H);
    ctx.save(); PAT.mottle.setTransform(new DOMMatrix().translate(Math.round(-cm.x * .12), Math.round(-cm.y * .12))); ctx.fillStyle = PAT.mottle; ctx.fillRect(0, 0, W, H); ctx.restore();
  };
  /* M.stormBand(ctx, x0, x1, t) — lumpy mid-value cloud mass with a deep core, drifting; wind dashes below (world x range) */
  function stormBand(ctx, x0, x1, t) {
    const dr = t * 14, xa = Math.floor((x0 - 80) / 40) * 40, xb = x1 + 80, bot = [], core = [];
    for (let x = xa; x <= xb; x += 40) { const u = (x + dr) / 300; bot.push([x, 560 + 50 * Math.sin(u * 1.3 + 1) + 30 * Math.abs(Math.sin(u * 3.1 + 2)) + 26 * Pilot.fbm(x / 500, 1, 2)]);
      core.push([x, 330 + 46 * Math.sin(u * 1.7) + 22 * Math.abs(Math.sin(u * 4.3))]); }
    ink(ctx, [[xa, -400], [xb, -400], ...bot.slice().reverse()], { fill: C.mid, lw: 5, smooth: true });
    ink(ctx, [[xa, -400], [xb, -400], ...core.slice().reverse()], { fill: C.deep, lw: 5, smooth: true });
    for (let i = 0; i < 9; i++) { const px = xa + ((i * 173 + dr * 2.2) % (xb - xa)), py = 700 + (i % 3) * 30 + (i * 37 % 50); line(ctx, [px, py], [px + 18, py - 5], 3); line(ctx, [px + 26, py - 6], [px + 38, py - 9], 3); }
  }
  /* M.ridge(ctx, x0, x1, y) — a far mid-violet ridge whose base line is y (the horizon) */
  function ridge(ctx, x0, x1, RT = 1180) {
    const pts = []; for (let x = Math.floor((x0 - 60) / 30) * 30; x <= x1 + 60; x += 30) pts.push([x, RT - 70 - 70 * Pilot.fbm(x / 420 + 4, 2, 3) - 14 * Math.sin(x / 90)]);
    ink(ctx, [...pts, [x1 + 60, RT + 600], [x0 - 60, RT + 600]], { fill: C.mid, lw: 5 });
  }
  M.TREES = []; { const r = rng(61); for (let x = -900; x < 4600; x += 340 + r() * 300) M.TREES.push([x, .75 + r() * .45, r() * 6]); }
  /* M.tree(ctx, bx, by, s, ph, t) — the lab's wind-bent tree: black trunk, pale leaf streamers torn to the right, a few
     leaves flying off (ph = phase/seed) */
  function tree(ctx, bx, by, s, ph, t) {
    const sway = .06 * Math.sin(t * 4.2 + ph) + .025 * Math.sin(t * 9.1 + ph * 2), lean = .36 + sway, len = 470 * s, tr = [];
    for (let i = 0; i <= 8; i++) { const u = i / 8, a2 = lean + u * u * (.5 + sway * 2); tr.push(i ? [tr[i - 1][0] + Math.sin(a2) * len / 8, tr[i - 1][1] - Math.cos(a2) * len / 8] : [bx, by]); }
    const lr = rng(31 + Math.round(ph * 10));
    const leaf = j => { const p0 = tr[Math.min(8, 3 + (j % 5))], fl = Math.sin(t * 6 + j * 1.3 + ph) * 10;
      const Ll = (80 + lr() * 70) * s, wd = (18 + lr() * 12) * s, ang = .25 + lr() * .35 + Math.sin(t * 5 + j) * .05, pts = [];
      for (let k = 0; k <= 6; k++) { const u = k / 6; pts.push([u * Ll, -wd * Math.sin(Math.PI * Math.pow(u, .7))]); }
      for (let k = 6; k >= 0; k--) { const u = k / 6; pts.push([u * Ll, wd * .8 * Math.sin(Math.PI * Math.pow(u, .7)) + 6 * Math.sin(u * 7 + j)]); }
      ink(ctx, pts.map(q => { const r2 = rot2(q, ang); return [p0[0] + r2[0] - 10 + fl * .5, p0[1] + r2[1] - 20 + (j % 3) * 18 + fl * .3]; }), { fill: C.leaf, lw: 4.2, single: true }); };
    for (let j = 0; j < 4; j++) leaf(j);
    ink(ctx, tube(tr, [36, 32, 28, 25, 21, 17, 13, 9, 5].map(v => v * s)), { fill: C.ink, lw: 4, single: true });
    for (let j = 4; j < 7; j++) leaf(j);
    for (let j = 0; j < 3; j++) { const k = ((t * .7 + j / 3 + ph) % 1), fx = tr[8][0] + 10 + k * 260, fy = tr[6][1] + j * 34 - k * 30 + Math.sin(k * 9 + j) * 14;
      ink(ctx, ell(fx, fy, (13 - j * 2) * s, 6 * s, 10), { fill: C.leaf, lw: 3.2, single: true }); }
  }
  Object.assign(M, { stormBand, ridge, tree });
  /* M.storm(ctx, cm, t, o) — the backdrop stack: storm band (parallax .2), ridge (.45, base o.horizon = 1180), wind-bent
     trees (.8, standing on o.treeY = 1220; o.trees [[x, scale, phase]…] default M.TREES). Leaves the .8 transform set. */
  M.storm = function (ctx, cm, t, o = {}) {
    const vis = (p, z) => { const cx = cm.x * p; return [cx - 540 / z - 80, cx + 540 / z + 80]; };
    let z = M.cam(ctx, cm, .2); stormBand(ctx, ...vis(.2, z), t);
    z = M.cam(ctx, cm, .45); { const [a, b] = vis(.45, z); ridge(ctx, a, b, o.horizon ?? 1180); }
    z = M.cam(ctx, cm, .8); { const [a, b] = vis(.8, z), ty = o.treeY ?? 1220; for (const [x, sc, ph] of (o.trees || M.TREES)) if (x > a - 500 && x < b + 100) tree(ctx, x, ty, sc, ph, t); }
  };
  /* M.makeGround(o) → ground with ground.draw(ctx, x0, x1, t): deep-violet ground below the horizon o.top (1180), the lab's
     floor lines, puddles with rain rings; at each gap [a, b] in o.gaps a ravine (hatched walls sinking to ink, rough below
     o.lane + 70). o: { top: 1180, lane: 1300, gaps: [], span: [-900, 4600] (puddles) } */
  M.makeGround = function (o = {}) {
    const RT = o.top ?? 1180, FY = o.lane ?? 1300, gaps = (o.gaps || []).slice().sort((a, b) => a[0] - b[0]), [sx0, sx1] = o.span || [-900, 4600];
    const wallPts = (x, dir, seed) => { const q = rng(seed), w = [[x, RT]]; for (let y = RT + 40; y <= 2900; y += 44) w.push([x + dir * (y < FY + 70 ? 0 : 8 + q() * 24 + (y - FY) * .05), y]); return w; };
    const WALLS = gaps.map((g, i) => [wallPts(g[0], 1, 71 + 4 * i), wallPts(g[1], -1, 73 + 4 * i)]);
    const PUDDLES = []; { const r = rng(91); for (let x = sx0; x < sx1; x += 200 + r() * 260) PUDDLES.push([x, RT + 40 + r() * 460, 50 + r() * 60]); }
    const draw = (ctx, x0, x1, t) => {
      const segs = []; for (let i = 0; i <= gaps.length; i++) { const sa = i ? gaps[i - 1][1] : null, sb = i < gaps.length ? gaps[i][0] : null;
        if ((sb == null || x0 < sb) && (sa == null || x1 > sa)) segs.push({ sa, sb, wA: i ? WALLS[i - 1][1] : null, wB: i < gaps.length ? WALLS[i][0] : null }); }
      for (const S of segs) {
        const xa = x0 - 60, xb = x1 + 60;
        const poly = !S.wA && S.wB ? [[xa, RT], ...S.wB, [xa, 2900]] : S.wA && !S.wB ? [...S.wA, [xb, 2900], [xb, RT]] : S.wA ? [...S.wA, ...S.wB.slice().reverse()] : [[xa, RT], [xb, RT], [xb, 2900], [xa, 2900]];
        ink(ctx, poly, { fill: C.deep, lw: 0, smooth: false });
      }
      gaps.forEach(([E, E2], i) => {   // the ravine: deep violet hatched near the top, sinking to ink
        if (!(x1 > E - 20 && x0 < E2 + 20)) return; const G = E2 - E, [w0, w1] = WALLS[i];
        const pth = pathOf([...w0, ...w1.slice().reverse()]); ctx.save(); ctx.fillStyle = C.deep2; ctx.fill(pth); ctx.clip(pth);
        ctx.fillStyle = pat('hatch', E, RT); ctx.fillRect(E - 50, RT, G + 100, 1800);
        const gg = ctx.createLinearGradient(0, RT + 80, 0, RT + 620); gg.addColorStop(0, 'rgba(21,23,43,0)'); gg.addColorStop(1, 'rgba(21,23,43,1)'); ctx.fillStyle = gg; ctx.fillRect(E - 50, RT, G + 100, 1800); ctx.restore();
        ink(ctx, w0.slice(0, 20), { closed: false, lw: 5.5, smooth: false }); ink(ctx, w1.slice(0, 20), { closed: false, lw: 5.5, smooth: false });
        for (const [x, y, dx] of [[E + 16, FY + 130, 40], [E + 30, FY + 300, 30], [E + G - 20, FY + 190, -40], [E + G - 30, FY + 380, -28]]) ink(ctx, [[x, y], [x + dx * .5, y + 22], [x + dx, y + 14]], { closed: false, lw: 3.6, single: true });
      });
      for (const S of segs) line(ctx, [S.sa ?? x0 - 40, RT], [S.sb ?? x1 + 40, RT], 5.5);
      // the lab's floor lines (broken by the gaps), and puddles with rain rings
      for (let x = Math.floor((x0 - 400) / 520) * 520; x < x1 + 400; x += 520) for (const [dx, dy, l] of [[0, 70, 260], [210, 150, 300], [90, 230, 200], [330, 330, 340], [40, 450, 380], [280, 580, 300], [120, 720, 420]]) {
        const a = x + dx, b = a + l, hit = gaps.filter(g => !(b < g[0] - 10 || a > g[1] + 10));
        if (!hit.length) { if (b > x0 - 50 && a < x1 + 50) line(ctx, [a, RT + dy], [b, RT + dy], 3.2); continue; }
        let c = a; for (const g of hit) { if (c < g[0] - 10) line(ctx, [c, RT + dy], [g[0] - 10, RT + dy], 3.2); c = Math.max(c, g[1] + 10); }
        if (b > c) line(ctx, [c, RT + dy], [b, RT + dy], 3.2);
      }
      for (const [px, py, pw] of PUDDLES) { if (px < x0 - 150 || px > x1 + 150 || gaps.some(g => px > g[0] - pw - 20 && px < g[1] + pw + 20)) continue;
        ink(ctx, ell(px, py, pw, pw * .16, 18), { fill: C.mid, tone: pat('diag', px, py), lw: 3.4, single: true });
        const k = Rig.frac(t * 1.4 + px * .013); ctx.save(); ctx.globalAlpha *= 1 - k; ink(ctx, ell(px + (px % 37) - 18, py, 8 + k * 30, (8 + k * 30) * .22, 14), { closed: true, lw: 2.6, single: true, col: C.pale }); ctx.restore(); }
    };
    return { draw, top: RT, gaps, WALLS };
  };
  /* M.arch(ctx, x, gy, t, o) — an open arched door on gy, lit by a lighter VALUE of the violet (not the accent). Draws the
     light now; → { op (opening outline, for clipping figures walking in), draw() (hatched frame + leaves) }.
     o: { R: 104, r: 74, h: 300, light: C.cream (the opening's fill — pass C.yel to make the doorway the accent) } */
  M.arch = function (ctx, x, gy, t, o = {}) {
    const Ro = o.R ?? 104, r0 = o.r ?? 74, ay = gy - (o.h ?? 300), ay0 = ay + 30;
    glow(ctx, x, gy - 170, 420, .9, PALE); glow(ctx, x, gy - 150, 220, 1, PALE);
    ctx.save(); ctx.globalAlpha *= .45; ink(ctx, [[x - r0, gy], [x + r0, gy], [x + 200, gy + 80], [x - 220, gy + 80]], { fill: C.pale, lw: 0, smooth: false }); ctx.restore();
    const op = [[x - r0, gy]]; for (let i = 0; i <= 16; i++) { const a = Math.PI + Math.PI * i / 16; op.push([x + Math.cos(a) * r0, ay0 + Math.sin(a) * r0]); } op.push([x + r0, gy]);
    ink(ctx, op, { fill: o.light || C.cream, lw: 0, smooth: false });
    return { op, draw: () => {
      const fr = [[x - Ro, gy]]; for (let i = 0; i <= 18; i++) { const a = Math.PI + Math.PI * i / 18; fr.push([x + Math.cos(a) * Ro, ay + Math.sin(a) * Ro + 30]); } fr.push([x + Ro, gy]);
      ink(ctx, fr.concat(op.slice().reverse()), { fill: C.deep2, tone: pat('hatch', x, gy), smooth: false, lw: 5.5 });
      ink(ctx, [[x - Ro, gy], [x - Ro - 46, gy + 22], [x - Ro - 46, ay0 - 30], [x - Ro, ay0 - 10]], { fill: C.deep, tone: pat('hatch2', x, gy), lw: 5, smooth: false });
      ink(ctx, [[x + Ro, gy], [x + Ro + 46, gy + 22], [x + Ro + 46, ay0 - 30], [x + Ro, ay0 - 10]], { fill: C.deep, tone: pat('hatch2', x, gy), lw: 5, smooth: false });
    } };
  };
  /* M.dashed(ctx, pts, t) — a marching dashed outline (black under cream): "the missing shape", a plan, a ghost */
  M.dashed = function (ctx, pts, t) {
    const P = resample(pts, true, 10 * LWK).map(p => wob(p, 1.2 * AMPK)), path = pathOf(P, true, false);
    ctx.save(); ctx.lineCap = 'butt'; ctx.setLineDash([18 * LWK, 12 * LWK]); ctx.lineDashOffset = -t * 20;
    ctx.lineWidth = 10 * LWK; ctx.strokeStyle = C.ink; ctx.stroke(path); ctx.lineWidth = 5 * LWK; ctx.strokeStyle = C.cream; ctx.stroke(path); ctx.setLineDash([]); ctx.restore(); return path;
  };
  /* M.chips(ctx, t, list) — inked triangle chips thrown up and landing (gravity 700 px/s²), fading after 1.2 s.
     list item: { t0, x, y, vx, vy, land, r0, vr, sz, col } — build once, seeded */
  M.chips = function (ctx, t, list) {
    for (const q of list) {
      const u = t - q.t0; if (u < 0) continue; const al = 1 - ss(q.t0 + 1.2, q.t0 + 1.8, t); if (al <= 0) continue;
      const tl = (-q.vy + Math.sqrt(q.vy * q.vy + 4 * 700 * (q.land - q.y))) / 1400, uu = Math.min(u, Math.max(0, tl));
      const x = q.x + q.vx * uu, y = q.y + q.vy * uu + 700 * uu * uu, r = q.r0 + q.vr * uu;
      ctx.save(); ctx.globalAlpha *= al; const pts = []; for (let i = 0; i < 3; i++) { const a = r + i * TAU / 3; pts.push([x + Math.cos(a) * q.sz, y + Math.sin(a) * q.sz * .7]); }
      ctx.fillStyle = q.col; ctx.fill(pathOf(pts, true, false)); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4 * LWK; ctx.stroke(pathOf(pts, true, false)); ctx.restore();
    }
  };

  /* ---------------------------------------------------------------- marks in the lab's manner: water, not comic symbols */
  /* M.drips(ctx, hc, s, t) — drips falling off wet hair (head centre hc) */
  M.drips = function (ctx, hc, s, t) {
    for (let j = 0; j < 4; j++) { const t0 = Math.floor(t / .7) * .7 + j * .175, k = t - t0; if (k < 0 || k > .45) continue;
      const bx = hc[0] + (-50 + j * 22) * s, by = hc[1] + 30 * s + 1800 * k * k; ink(ctx, [[bx, by - 11], [bx + 5, by], [bx, by + 5], [bx - 5, by]], { fill: C.cream2, lw: 3, single: true }); }
  };
  /* M.splashes(ctx, F, gy, k) — splashes kicked up behind a running figure's feet (uses F.ph; k = alpha) */
  M.splashes = function (ctx, F, gy, kk = 1) { if (kk <= 0) return; ctx.save(); ctx.globalAlpha *= kk; const f = F.f;
    for (const i of [0, 1]) { const ph = Rig.frac((F.ph ?? 0) + i * .5); if (ph < .25) { const k = ph / .25, fx = F.feet[i][0];
      for (let d = 0; d < 4; d++) { const a = -2.2 - d * .28, r = 30 + k * (50 + d * 12); ink(ctx, ell(fx - f * 20 + f * Math.cos(a) * r, gy - 6 + Math.sin(a) * r * .8 + k * k * 30, 5 - d * .6, 6 - d * .6, 8), { fill: C.pale, lw: 2.6, single: true }); } } }
    ctx.restore(); };
  /* M.grit(ctx, x, y, t, t0) — six grains of grit dropping off an edge at (x, y) from t0 (0.8 s) */
  M.grit = function (ctx, x0, y0, t, t0) {
    const im = t >= t0 ? 1 - ss(t0 + .4, t0 + .8, t) : 0; if (im <= 0) return;
    for (let i = 0; i < 6; i++) { const k = t - t0, x = x0 + i * 9, y = y0 + 900 * k * k + i * 6; ink(ctx, ell(x + i * k * 30, y, 4, 3.4, 7), { fill: C.cream2, lw: 2.4, single: true }); }
  };
  /* M.rain(ctx, t) — slanting rain over everything (screen space, on twos with the scene) */
  M.rain = function (ctx, t, n = 150) {
    const W = Pilot.W, H = Pilot.H; ctx.save(); ctx.strokeStyle = 'rgba(232,232,250,.5)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath();
    const r = rng(4);
    for (let i = 0; i < n; i++) { const sx = r() * (W + 500) - 300, sp = 1700 + r() * 600, ph = r(), k = Rig.frac(t * sp / (H + 300) + ph), px = sx + k * 330, py = -150 + k * (H + 300);
      ctx.moveTo(px, py); ctx.lineTo(px + 13, py + 42); }
    ctx.stroke(); ctx.restore();
  };
  /* M.flash(k) — lightning flash level k s after the strike: two hard flashes, then a fade (0 outside) */
  M.flash = function (k) { if (k < 0) return 0; if (k < .085) return 1; if (k < .17) return .25; if (k < .25) return .75; if (k < .5) return .15 * (1 - (k - .25) / .25); return 0; };
  /* M.lightning(ctx, t, t0, sx) — THE HIT at t0: a bolt down to screen x ≈ sx and the frame bleached to the palest value.
     Screen space (call after M.screen) */
  M.lightning = function (ctx, t, t0, sx) {
    const f = M.flash(t - t0); if (f <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .62 * f; ctx.fillStyle = C.pale; ctx.fillRect(0, 0, Pilot.W, Pilot.H); ctx.restore();
    if (t - t0 < .3) { const r = rng(9), pts = [[sx + 160, -20]]; let x = sx + 160, y = -20; while (y < 760) { y += 60 + r() * 50; x += (r() - .55) * 90; pts.push([x, y]); }
      ctx.save(); ctx.globalAlpha = Math.min(1, f * 1.4); ctx.lineJoin = 'miter';
      ctx.strokeStyle = C.ink; ctx.lineWidth = 30; ctx.stroke(pathOf(pts, false, false)); const br = pts.slice(3, 6).map((p, i) => [p[0] + i * 70 + 10, p[1] + i * 60]); ctx.lineWidth = 18; ctx.stroke(pathOf([pts[3], ...br], false, false)); ctx.strokeStyle = C.cream; ctx.lineWidth = 8; ctx.stroke(pathOf([pts[3], ...br], false, false)); ctx.lineWidth = 15; ctx.stroke(pathOf(pts, false, false)); ctx.restore(); }
  };

  /* ---------------------------------------------------------------- end card */
  /* M.endPlate(ctx, t, at, o) — a deep-violet hatched plate with an inner rule, sliding up into place at `at`, the frame
     dimmed behind; o.stamp(ctx, y0) draws a small accent icon above the title (inside the plate's alpha; see M.stamp).
     Screen space. */
  M.endPlate = function (ctx, t, at, o = {}) {
    const k = ss(at - .2, at + .15, t); if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = .5 * k; ctx.fillStyle = C.deep2; ctx.fillRect(0, 0, Pilot.W, Pilot.H); ctx.restore();
    const dy = (1 - k) * 40, x0 = 96, x1 = 984, y0 = 618 + dy, y1 = 1262 + dy;
    ctx.save(); ctx.globalAlpha = k;
    ink(ctx, resample([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true, 18), { fill: C.deep2, tone: pat('diag', 0, 0), raw: true, lw: 6.5 });
    ink(ctx, resample([[x0 + 22, y0 + 22], [x1 - 22, y0 + 22], [x1 - 22, y1 - 22], [x0 + 22, y1 - 22]], true, 18), { fill: C.deep2, raw: true, lw: 3, col: C.mid });
    if (o.stamp) o.stamp(ctx, y0);
    ctx.restore();
  };
  /* M.stamp(ctx, x, y, sc, rot, draw) — draw(ctx) an icon at (x, y), scaled and rotated, line kept at print weight */
  M.stamp = function (ctx, x, y, sc, rot, draw) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
    const lw0 = LWK; LWK = 1 / sc * .75; draw(ctx); LWK = lw0; ctx.restore();
  };
  /* M.sproutIcon(ctx, glowToo) — a small yellow sprout centred on (0, 0), ~120 units tall (a default stamp) */
  M.sproutIcon = function (ctx, glowToo = true) {
    if (glowToo) glow(ctx, 0, -10, 150, .6);
    ink(ctx, tube([[0, 60], [2, 20], [0, -20]], [6, 6, 5]), { fill: C.yel, lw: 5 });
    ink(ctx, [[0, -10], [-34, -40], [-62, -36], [-40, -6]], { fill: C.yel, lw: 5 });
    ink(ctx, [[0, -22], [30, -62], [62, -58], [40, -20]], { fill: C.yel, lw: 5 });
  };
  /* M.captions / M.endCard — Story captions / end card in Gamja Flower, cream on violet with a soft violet shadow */
  M.captions = (ctx, t, lines, o = {}) => Story.captions(ctx, t, lines, Object.assign({ font: M.FONT, weight: 400, size: 76, y: 400, color: C.cream, shadow: 'rgba(21,23,43,.6)', shadowBlur: 10, srcColor: C.pale }, o));
  M.endCard = (ctx, t, card, at, o = {}) => Story.endCard(ctx, t, card, at, Object.assign({ font: M.FONT, srcFont: M.FONT, color: C.cream, srcColor: C.sky, y: 870, titleShadow: '' }, o));

  /* ---------------------------------------------------------------- camera, timing, print pass */
  M.mixCam = (a, b, k) => k <= 0 ? a : k >= 1 ? b : { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
  /* M.shake(t, t0, len, ax, ay) → [sx, sy] screen-px shake decaying over len s after t0 */
  M.shake = (t, t0, len = .55, ax = 16, ay = 12) => { if (t < t0) return [0, 0]; const k = 1 - ss(t0, t0 + len, t); return [ax * k * Math.sin(t * 97), ay * k * Math.sin(t * 131 + 1)]; };
  /* M.cam(ctx, cm, p) — world transform for a layer at parallax p (1 = the world); scales line/jitter/hatch to it → zoom */
  M.cam = function (ctx, cm, p) {
    const z = 1 + (cm.z - 1) * p, cx = cm.x * p, cy = 960 + (cm.y - 960) * p;
    ctx.setTransform(z, 0, 0, z, 540 - cx * z + (cm.sx || 0) * p, 960 - cy * z + (cm.sy || 0) * p);
    LWK = Math.pow(z, -.8); AMPK = 1.2 / z; TS = 1 / z; return z;
  };
  /* M.screen(ctx) — back to screen space (identity, print-size lines) */
  M.screen = ctx => { ctx.setTransform(1, 0, 0, 1, 0, 0); LWK = 1; AMPK = 1.2; TS = 1; };
  /* M.grain(ctx, cm) — the heavy violet grain over everything, locked to the camera's pan (last pass of scene()) */
  M.grain = function (ctx, cm) { ctx.save(); PAT.grain.setTransform(new DOMMatrix().translate(-(cm.x * cm.z) % 512, -(cm.y * cm.z) % 512)); ctx.fillStyle = PAT.grain; ctx.fillRect(0, 0, Pilot.W, Pilot.H); ctx.restore(); };
  M.t12 = t => Math.floor(t * 12 + 1e-6) / 12;
  /* M.onTwos(ctx, t, scene) — draw scene(ctx2, t12) once per pose into a 2-slot cache and blit it (seek-safe) */
  M.onTwos = function (ctx, t, scene) {
    const tp = M.t12(t);
    let slot = CACHE.find(c => c.t === tp);
    if (!slot) { slot = CACHE[CACHE.next = 1 - (CACHE.next || 0)]; const c = slot.c.getContext('2d'); c.save(); scene(c, tp); c.restore(); slot.t = tp; }
    ctx.drawImage(slot.c, 0, 0);
  };
  M.lwk = () => LWK;

  window.Mono = M;
})();

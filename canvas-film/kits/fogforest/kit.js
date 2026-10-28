/* kit-fogforest.js — house style "misty silhouette forest" (안개 숲 실루엣) for word-log films. Global: window.FogForest
   Flat silhouettes in depth planes that fade toward ONE teal fog colour; gnarled mossy trees, hanging moss, drifting fog
   banks between the planes, a rim of fog light on the figures, dry-brush streak mottling + grain. ONE warm accent (amber:
   a lantern, a lit wooden thing, the light in an arch) — everything else is teal.
   First film: sermons/2026-10-24-cross-styles/film/scenes/cs-fogforest.html (잘라 낸 건 다리였다 · 01, the worked example).
   Style card: styles/fogforest/STYLE.md. Template: styles/fogforest/template.html.

   HOW A FRAME IS MADE (world units = px at zoom 1; ground of the near lane ≈ y 1300, path's far edge y 1212)
     const cm = camAt(t), [z1, ex1, ey1] = FF.layerM(cm, 1);
     FF.backdrop(ctx, cm, t);                                 sky + 5 parallax planes + fog banks between them
     FF.layer(ctx, cm, 1, () => { FF.drawRoad(ctx, road); … gap, arch, props … });     the world plane
     FF.midFog(ctx, cm, t);                                   a thin fog bank in front of the world plane
     FF.action(ctx, z1, ex1, ey1, wy0, wy1, a => { …FF.figure(a, F, …)… });   figures/props on the action buffer
     FF.rim(ctx, …FF.RIM_FOG(z1)); FF.rim(ctx, …FF.RIM_WARM(z1), k);              rim light on everything in the action layer
     FF.layer(ctx, cm, 1, () => FF.glowAt(…));               warm light on the accent
     FF.foreground(ctx, cm, t);  FF.captions(…);  FF.endPlate(ctx, t, at);  FF.endCard(…)
   Pure and seek-safe: every texture is built once in init()/forest()/buildFrame()/road()/gap() from seeded rng; scratch
   buffers are fully cleared on every use. No network, no images. Load after lib.js (Pilot) and story.js (Story). */
(function () {
  const { clamp, lerp, ss, eo, eio, rng } = Pilot;
  const W = 1080, H = 1920, TAU = Math.PI * 2;
  const FF = {};
  const hx = Pilot.hex, mixHex = (a, b, k) => Pilot.rgb(Pilot.mix(hx(a), hx(b), k));
  FF.mixHex = mixHex;

  /* ---------------------------------------------------------------- palette, type */
  // sky0/sky1 sky, fog/fogD fog light/shade, p1…p7 the depth planes far → near (p7 = the black foreground frame),
  // me / pil the hero and the other figures, gold/goldL/goldD THE warm accent (body, light, shade), ink caption colour.
  const C = FF.C = {
    sky0: '#2f5a60', sky1: '#7cb0b2', fog: '#9fcaca', fogD: '#6f9ea1',
    p1: '#86b5b6', p2: '#6f9fa2', p3: '#5b8b8f', p4: '#3e6b70', p5: '#2b5257', p6: '#16343a', p7: '#0b1c20',
    me: '#0a171a', pil: '#163238', gold: '#e4a35c', goldL: '#ffdca6', goldD: '#9c5b26', steel: '#a9cfcd',
    ink: '#eef6f4', warmCore: '#fff0cf', handle: '#5a7574',
  };
  FF.ACCENT = C.gold;
  FF.FONT = "'Gowun Batang',serif";
  FF.FONTS = ["700 60px 'Gowun Batang'", "400 28px 'Noto Sans KR'", "500 34px 'Noto Sans KR'"];   // Pilot.run({ fonts })
  FF.RIM_FOG = z => [-2.6 * z, 2.8 * z, 'rgba(196,232,230,.75)'];      // rim(ctx, ...RIM_FOG(z1), 1): fog light from the upper left
  FF.RIM_WARM = z => [-3.6 * z, .8 * z, 'rgba(255,196,128,.9)'];       // rim(ctx, ...RIM_WARM(z1), k): warm light from the right (an arch, a lamp)

  /* ---------------------------------------------------------------- state (built once) */
  const TX = FF.TX = {};          // textures: streak, sky, top, plate, fogHi, fogA, fogB, fogLow, frame, bank
  const PL = FF.PL = [];          // parallax planes { c, p, x0, y0, w, h }
  let GRAIN = null, WARM = null, PUFF = null, ACT = null, RIM = null, TMP = null, CAM = null, DUR = 30, FDY = 0;
  let BAND = [0, H];
  const LM = [];
  const FM = FF.FM = 220;         // the foreground frame's extra width each side (parallax room)

  /* init({ cam, dur }) — build the textures and buffers. cam(t) → { x, y, z } is the scene's camera (world point at the frame
     centre, zoom); dur its length: planes are sized to everything the camera ever sees (call init after the camera can run). */
  FF.init = function (o = {}) {
    CAM = o.cam || (() => ({ x: 540, y: 960, z: 1 })); DUR = o.dur ?? 30;
    TX.streak = streakTex();
    GRAIN = Pilot.canvas(1, 1).getContext('2d').createPattern(grainTex(), 'repeat');
    TX.sky = Pilot.canvas(W, H); { const g = TX.sky.getContext('2d'), lg = g.createLinearGradient(0, 0, 0, H);
      lg.addColorStop(0, C.sky0); lg.addColorStop(.34, C.sky1); lg.addColorStop(.6, '#a9d0cf'); lg.addColorStop(1, '#8ab7b7'); g.fillStyle = lg; g.fillRect(0, 0, W, H);
      const rg = g.createRadialGradient(620, 1000, 30, 620, 1000, 820); rg.addColorStop(0, 'rgba(214,238,236,1)'); rg.addColorStop(.45, 'rgba(184,222,220,.5)'); rg.addColorStop(1, 'rgba(180,218,216,0)');
      g.fillStyle = rg; g.fillRect(0, 0, W, H); }
    TX.top = Pilot.canvas(W, 700); { const g = TX.top.getContext('2d'), lg = g.createLinearGradient(0, 0, 0, 700);
      lg.addColorStop(0, 'rgba(8,24,27,.62)'); lg.addColorStop(.6, 'rgba(8,24,27,.22)'); lg.addColorStop(1, 'rgba(8,24,27,0)'); g.fillStyle = lg; g.fillRect(0, 0, W, 700); }
    TX.plate = Pilot.canvas(W, H); { const g = TX.plate.getContext('2d'), lg = g.createLinearGradient(0, 0, 0, H);
      lg.addColorStop(0, '#0b2024'); lg.addColorStop(.45, '#1a3d42'); lg.addColorStop(1, '#0a1b1f'); g.fillStyle = lg; g.fillRect(0, 0, W, H);
      const rg = g.createRadialGradient(540, 900, 20, 540, 900, 700); rg.addColorStop(0, 'rgba(120,170,170,.28)'); rg.addColorStop(1, 'rgba(120,170,170,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); }
    TX.fogHi = fogTex(270, 130, 1, 60, .42, '#b6dcda');
    TX.fogA = fogTex(300, 110, 2, 46, .45, '#a8d2d0');
    TX.fogB = fogTex(300, 110, 3, 40, .42, '#9ec9c8');
    TX.fogLow = fogTex(300, 70, 4, 34, .38, '#a0c8c7', 'low');
    WARM = warmSprite(); PUFF = puffSprite(); TX.warm = WARM; TX.puff = PUFF;
    ACT = Pilot.canvas(W, H); RIM = Pilot.canvas(W, H); TMP = Pilot.canvas(W, H);
    LM.length = 0; const r = rng(44); for (let i = 0; i < 6; i++) LM.push({ x: 330 + i * 80 + r() * 30, y: 380 - i * 30 + r() * 30, len: 70 + r() * 110, n: 12, w: 2 + r() * 1.4, amp: 6 + r() * 6, ph: r() * 6 });
  };

  /* ---------------------------------------------------------------- silhouette builders (draw into a plane's g, fill = g.fillStyle) */
  // quadSeg: a tapered limb from (x0,y0) width w0 to (x1,y1) width w1, round tip.
  function quadSeg(g, x0, y0, w0, x1, y1, w1) {
    const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a);
    g.beginPath(); g.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2); g.lineTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2);
    g.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2); g.lineTo(x0 - nx * w0 / 2, y0 - ny * w0 / 2); g.closePath(); g.fill();
    g.beginPath(); g.arc(x1, y1, w1 / 2, 0, TAU); g.fill();
  }
  // moss: a strand of hanging moss from (x,y), length len px (wd = width scale); r = rng.
  function moss(g, r, x, y, len, wd = 1) {
    const tw = (2.4 + r() * 3) * wd, L0 = len * (.5 + r() * .6), pts = [], q = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12, wv = tw * Math.pow(1 - u, .7) * (.6 + .4 * Math.sin(u * 9 + x));
      const cx = x + Math.sin(u * 5 + y) * 2.5 * u; pts.push([cx - wv, y + L0 * u]); q.push([cx + wv, y + L0 * u]); }
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); for (const p of q.reverse()) g.lineTo(p[0], p[1]); g.closePath(); g.fill();
    const n = 2 + (r() * 4 | 0);
    for (let k = 0; k < n; k++) {
      let px = x + (r() - .5) * tw * 3, py = y + r() * L0 * .3; const Lm = len * (.25 + r() * .7), steps = 8;
      for (let i = 0; i < steps; i++) { const nx = px + (r() - .5) * 2, ny = py + Lm / steps;
        g.lineWidth = (.7 + r() * .7) * wd * (1 - i / steps * .5); g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke(); px = nx; py = ny; }
    }
  }
  // branch: a kinked limb from (x,y) at angle ang (rad), length len, base width wd, recursion depth; o = { kink, up, moss, mossDepth, mossLen, mossW }.
  function branch(g, r, x, y, ang, len, wd, depth, o) {
    const n = 5 + (r() * 4 | 0), seg = len / n;
    for (let i = 0; i < n; i++) {
      ang += (r() - .5) * o.kink + (o.up ?? .05) * Math.sign(-Math.PI / 2 - ang) * .2;
      const x2 = x + Math.cos(ang) * seg, y2 = y + Math.sin(ang) * seg, w2 = Math.max(.9, wd * (1 - .55 / n * (i + 1)));
      quadSeg(g, x, y, wd, x2, y2, w2);
      if (o.moss && depth <= o.mossDepth && Math.abs(Math.sin(ang)) < .55 && r() < o.moss) moss(g, r, x2, y2 + w2 * .3, o.mossLen * (.5 + r()), o.mossW || 1);
      if (depth > 0 && i > 0 && r() < .42) branch(g, r, x2, y2, ang + (r() < .5 ? -1 : 1) * (.45 + r() * .6), len * (.45 + r() * .3), w2 * .8, depth - 1, o);
      x = x2; y = y2; wd = w2;
    }
    if (depth === 0 || wd < 3) twigs(g, r, x, y, ang, len * .3, Math.min(wd, 2.2), 3);
    else branch(g, r, x, y, ang + (r() - .5) * .8, len * .55, wd * .75, depth - 1, o);
  }
  function twigs(g, r, x, y, ang, len, wd, d) {
    if (d < 0 || len < 4) return;
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    g.lineWidth = wd; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    const k = 1 + (r() < .6);
    for (let i = 0; i <= k; i++) twigs(g, r, x2, y2, ang + (r() - .5) * 1.4, len * (.5 + r() * .3), wd * .7, d - 1);
  }
  // trunk: a flared, wobbling trunk standing on yb, height h, base width w; o = { lean, bend }. Returns its spine [[x, y, width] × 41] for branches.
  function trunk(g, r, x, yb, h, w, o = {}) {
    const N = 40, Lp = [], R = [], sp = [], lean = o.lean || 0, bend = o.bend || 0, ph = r() * 9;
    for (let i = 0; i <= N; i++) {
      const u = i / N, y = yb - h * u;
      const cx = x + lean * h * u + bend * Math.sin(u * Math.PI) * h * .12 + (Pilot.noise(u * 5 + ph, 1) - .5) * w * .5;
      const flare = 1 + 1.4 * Math.pow(Math.max(0, .14 - u) / .14, 2), wu = w * (1 - .62 * u) * flare;
      const jag = (Pilot.noise(u * 22 + ph, 3) - .5) * w * .12;
      Lp.push([cx - wu / 2 + jag, y]); R.push([cx + wu / 2 + jag * .6, y]); sp.push([cx, y, wu]);
    }
    g.beginPath(); g.moveTo(Lp[0][0] - w * .6, yb + 4); for (const p of Lp) g.lineTo(p[0], p[1]);
    for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]); g.lineTo(R[0][0] + w * .6, yb + 4); g.closePath(); g.fill();
    for (const s of [-1, 1]) for (let k = 0; k < 2; k++) quadSeg(g, x + s * w * .25, yb - h * .03, w * .35, x + s * w * (.9 + r() * .8), yb + 6, w * .08);
    return sp;
  }
  // ridge: fill the ground under the curve yf(x) from x0 to x1 down to yBot.
  function ridge(g, x0, x1, yf, col, yBot) {
    g.fillStyle = col; g.beginPath(); g.moveTo(x0, yBot); for (let x = x0; x <= x1; x += 6) g.lineTo(x, yf(x)); g.lineTo(x1, yBot); g.closePath(); g.fill();
  }
  // grass: n tufts of blades (height hgt) on the curve yf between x0 and x1 (stroke = g.strokeStyle).
  function grass(g, r, x0, x1, yf, n, hgt) {
    for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0), y = yf(x) + 2, k = 2 + (r() * 4 | 0);
      for (let j = 0; j < k; j++) { const a = -Math.PI / 2 + (r() - .5) * .9, l = hgt * (.4 + r());
        g.lineWidth = 1.2 + r(); g.beginPath(); g.moveTo(x + j * 2, y); g.quadraticCurveTo(x + j * 2 + Math.cos(a) * l * .3, y - l * .6, x + j * 2 + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } }
  }
  // bramble: a thorny twig bush of height h rooted at (x,y).
  function bramble(g, r, x, y, h) { for (let k = 0; k < 7; k++) twigBranch(g, r, x + (r() - .5) * 10, y, -Math.PI / 2 + (r() - .5) * 1.5, h * (.5 + r() * .6), 3.2, 4); }
  function twigBranch(g, r, x, y, a, l, w, d) {
    if (d < 0) return; const n = 4; let px = x, py = y;
    for (let i = 0; i < n; i++) { a += (r() - .5) * .5; const nx = px + Math.cos(a) * l / n, ny = py + Math.sin(a) * l / n;
      g.lineWidth = w * (1 - i / n * .5); g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
      if (r() < .5) twigBranch(g, r, nx, ny, a + (r() < .5 ? -1 : 1) * (.5 + r() * .5), l * .45, w * .6, d - 1); px = nx; py = ny; }
  }
  // gnarled: a trunk plus o.n branches from spine index ≥ o.from; o = { lean, bend, n, from, len, depth, side, moss, mossLen, mossW }.
  function gnarled(g, r, x, yb, h, w, o) {
    const sp = trunk(g, r, x, yb, h, w, o);
    for (let k = 0; k < o.n; k++) { const s = sp[o.from + (r() * (40 - o.from) | 0)], side = o.side ? o.side * (k % 3 === 2 ? -1 : 1) : (k % 2 ? 1 : -1);
      branch(g, r, s[0], s[1], -Math.PI / 2 + side * (.45 + r() * .75), o.len * (.6 + r() * .6), s[2] * .5, o.depth || 3, { kink: .6, moss: o.moss || 0, mossDepth: 3, mossLen: o.mossLen || 60, mossW: o.mossW || 1 }); }
    return sp;
  }
  // stag: the lab's colossal stag standing in the fog (faces left), feet on yb, s = scale (≈ 1 → 650 px tall incl. antlers).
  function stag(g, r, x, yb, s) {
    g.save(); g.translate(x, yb); g.scale(s, s);
    const leg = (pts, w0, w1) => { for (let i = 0; i < pts.length - 1; i++) { const u0 = i / (pts.length - 1), u1 = (i + 1) / (pts.length - 1);
      quadSeg(g, pts[i][0], pts[i][1], lerp(w0, w1, u0), pts[i + 1][0], pts[i + 1][1], lerp(w0, w1, u1)); } };
    leg([[-112, -280], [-122, -150], [-116, -60], [-112, 0]], 34, 9);
    leg([[118, -290], [146, -170], [128, -70], [134, 0]], 40, 9);
    g.beginPath(); g.moveTo(160, -350);
    g.bezierCurveTo(90, -372, -20, -366, -92, -384); g.bezierCurveTo(-128, -420, -150, -470, -176, -548);
    g.bezierCurveTo(-190, -566, -214, -560, -232, -540); g.bezierCurveTo(-250, -520, -262, -504, -276, -480);
    g.bezierCurveTo(-282, -468, -270, -458, -254, -462); g.bezierCurveTo(-232, -470, -214, -474, -204, -480);
    g.bezierCurveTo(-188, -440, -184, -392, -170, -352); g.bezierCurveTo(-176, -318, -160, -280, -132, -262);
    g.bezierCurveTo(-60, -238, 40, -240, 112, -258); g.bezierCurveTo(150, -268, 176, -300, 178, -332);
    g.lineTo(186, -342); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-196, -552); g.quadraticCurveTo(-176, -590, -150, -584); g.quadraticCurveTo(-166, -566, -184, -542); g.fill();
    leg([[-92, -280], [-90, -150], [-96, -60], [-90, 0]], 36, 10);
    leg([[96, -284], [122, -170], [100, -70], [104, 0]], 44, 10);
    for (const [bx, by, sp, wd, sc] of [[-206, -556, -.32, 16, .9], [-184, -560, .1, 19, 1]]) {
      let px = bx, py = by, a = -1.5 + sp, w = wd;
      for (let i = 0; i < 8; i++) { a += .12 + (r() - .5) * .06; const l = (30 - i * 1.5) * sc, nx = px + Math.cos(a) * l, ny = py + Math.sin(a) * l, nw = w * .86;
        quadSeg(g, px, py, w, nx, ny, nw);
        if (i === 0 || i === 2 || i === 4 || i === 6) { let tx = nx, ty = ny, ta = a - 1.25 - (i === 0 ? .5 : 0), tw = nw * .85;
          for (let j = 0; j < 5; j++) { ta += .2; const tl = (i === 0 ? 14 : 19 - j * 2) * sc, ux = tx + Math.cos(ta) * tl, uy = ty + Math.sin(ta) * tl; quadSeg(g, tx, ty, tw, ux, uy, tw * .72); tx = ux; ty = uy; tw *= .72; } }
        px = nx; py = ny; w = nw; }
      for (let j = 0; j < 3; j++) { const ta = a - .3 + (j - 1) * .45; quadSeg(g, px, py, w, px + Math.cos(ta) * 24 * sc, py + Math.sin(ta) * 24 * sc, 1.6); }
    }
    for (let k = 0; k < 5; k++) moss(g, r, -250 + k * 24 + r() * 10, -650 - r() * 50, 50 + r() * 50, 1.3);
    g.restore();
  }
  Object.assign(FF, { quadSeg, moss, branch, twigs, trunk, ridge, grass, bramble, gnarled, stag });

  /* ---------------------------------------------------------------- textures */
  function streakTex() {   // 256² tileable dry-brush streak mask (white/black, alpha = strength)
    const N = 256, c = Pilot.canvas(N, N), g = c.getContext('2d'), d = g.createImageData(N, N);
    const tile = (f, x, y) => { const a = f(x, y), b = f(x - N, y), cc = f(x, y - N), e = f(x - N, y - N), u = x / N, v = y / N;
      return a * (1 - u) * (1 - v) + b * u * (1 - v) + cc * (1 - u) * v + e * u * v; };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = tile((a, b) => Pilot.fbm(a / 40 + 3, b / 60, 4), x, y) * .75 + tile((a, b) => Pilot.noise(a / 3 + 9, b / 12), x, y) * .25, i = (y * N + x) * 4;
      const k = (v - .5) * 2; d.data[i] = d.data[i + 1] = d.data[i + 2] = k > 0 ? 255 : 0; d.data[i + 3] = Math.min(1, Math.abs(k) * 1.6) * 255; }
    g.putImageData(d, 0, 0); return c;
  }
  // fogTex(w, h, seed, scale, threshold, colour, 'band'|'low') — a horizontally tileable fog bank texture.
  function fogTex(w, h, seed, sc, thr, col, shape = 'band') {
    const c = Pilot.canvas(w, h), g = c.getContext('2d'), d = g.createImageData(w, h), [R, G2, Bc] = hx(col), o = seed * 13.1;
    for (let y = 0; y < h; y++) { const v = y / h, m = shape === 'band' ? Math.pow(Math.sin(Math.PI * v), 1.4) : Math.pow(v, .8);
      for (let x = 0; x < w; x++) {
        const f = (xx) => Pilot.fbm(xx / sc + o, y / (sc * .55) + o, 5);
        const n = ((w - x) * f(x) + x * f(x - w)) / w;
        const a = clamp((n - thr) * 2.6) * m, i = (y * w + x) * 4;
        d.data[i] = R; d.data[i + 1] = G2; d.data[i + 2] = Bc; d.data[i + 3] = a * 255; } }
    g.putImageData(d, 0, 0); return c;
  }
  FF.fogTex = fogTex;
  function grainTex() {
    const N = 256, c = Pilot.canvas(N, N), g = c.getContext('2d'), d = g.createImageData(N, N), r = rng(91);
    for (let i = 0; i < N * N; i++) { const v = 128 + (r() - .5) * 46; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; }
    g.putImageData(d, 0, 0); return c;
  }
  function warmSprite() { const N = 256, c = Pilot.canvas(N, N), g = c.getContext('2d'), gr = g.createRadialGradient(N / 2, N / 2, 1, N / 2, N / 2, N / 2);
    gr.addColorStop(0, 'rgba(255,214,150,1)'); gr.addColorStop(.18, 'rgba(246,178,104,.6)'); gr.addColorStop(.5, 'rgba(214,160,110,.2)'); gr.addColorStop(1, 'rgba(200,160,120,0)');
    g.fillStyle = gr; g.fillRect(0, 0, N, N); return c; }
  function puffSprite() { const N = 128, c = Pilot.canvas(N, N), g = c.getContext('2d'), gr = g.createRadialGradient(N / 2, N / 2, 1, N / 2, N / 2, N / 2);
    gr.addColorStop(0, 'rgba(200,228,226,1)'); gr.addColorStop(.5, 'rgba(184,218,216,.45)'); gr.addColorStop(1, 'rgba(180,214,212,0)');
    g.fillStyle = gr; g.fillRect(0, 0, N, N); return c; }

  /* ---------------------------------------------------------------- camera */
  // cm = { x, y, z, sx?, sy? }: world point at the frame centre, zoom, screen shake. p = parallax depth (1 = the world plane).
  FF.mixCam = (a, b, k) => k <= 0 ? a : k >= 1 ? b : { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
  // layerM(cm, p) → [zoom, ex, ey]: the transform of depth p.
  FF.layerM = (cm, p) => { const z = 1 + (cm.z - 1) * p, cx = cm.x * p, cy = 960 + (cm.y - 960) * p; return [z, 540 - cx * z + (cm.sx || 0) * p, 960 - cy * z + (cm.sy || 0) * p]; };
  // layer(ctx, cm, p, fn): run fn with ctx in depth p's world coordinates.
  FF.layer = function (ctx, cm, p, fn) { const [z, ex, ey] = FF.layerM(cm, p); ctx.save(); ctx.setTransform(z, 0, 0, z, ex, ey); fn(); ctx.restore(); };
  // shake(c, t, at, dur, ax, ay): the hit — sets c.sx/c.sy to a decaying shake that starts at `at` (px). Returns c.
  FF.shake = function (c, t, at, dur = .55, ax = 15, ay = 11) { const k = 1 - ss(at, at + dur, t); c.sx = t >= at ? ax * k * Math.sin(t * 97) : 0; c.sy = t >= at ? ay * k * Math.sin(t * 131 + 1) : 0; return c; };

  /* ---------------------------------------------------------------- depth planes (world-anchored, camera-sized) */
  function extents(p, m = 140) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let t = 0; t <= DUR; t += .05) { const cm = CAM(t), z = 1 + (cm.z - 1) * p, cx = cm.x * p, cy = 960 + (cm.y - 960) * p;
      x0 = Math.min(x0, cx - 540 / z); x1 = Math.max(x1, cx + 540 / z); y0 = Math.min(y0, cy - 960 / z); y1 = Math.max(y1, cy + 960 / z); }
    return [Math.floor(x0 - m), Math.ceil(x1 + m), Math.floor(y0 - m), Math.ceil(y1 + m)];
  }
  FF.extents = extents;
  /* plane(p, K, col, streak, veil, build) — one parallax plane at depth p, resolution K (px per world px), silhouette colour col.
     build(g, x0, x1, y0, y1) draws silhouettes (fill/stroke = col) in world coords; then the plane gets the streak mottling
     (alpha `streak`), fog veils [[yTop, yBottom, alpha, colour?], …] fading toward the fog colour below yTop, and grain. */
  FF.plane = function (p, K, col, streak, veil, build) {
    const [x0, x1, y0, y1] = extents(p), c = Pilot.canvas(Math.ceil((x1 - x0) * K), Math.ceil((y1 - y0) * K)), g = c.getContext('2d');
    g.setTransform(K, 0, 0, K, -x0 * K, -y0 * K); g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
    build(g, x0, x1, y0, y1);
    const m = Pilot.canvas(c.width, c.height); m.getContext('2d').drawImage(c, 0, 0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = streak; g.fillStyle = g.createPattern(TX.streak, 'repeat'); g.fillRect(0, 0, c.width, c.height); g.globalAlpha = 1;
    g.setTransform(K, 0, 0, K, -x0 * K, -y0 * K);
    for (const [v0, v1, a, vc] of veil) { const [r, gg, b] = hx(vc || C.fog), lg = g.createLinearGradient(0, v0, 0, v1);
      lg.addColorStop(0, `rgba(${r},${gg},${b},0)`); lg.addColorStop(1, `rgba(${r},${gg},${b},${a})`); g.fillStyle = lg; g.fillRect(x0, v0, x1 - x0, y1 - v0); }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = .4; g.fillStyle = GRAIN; g.fillRect(0, 0, c.width, c.height);
    g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in'; g.drawImage(m, 0, 0); g.restore();
    const P = { c, p, x0, y0, w: x1 - x0, h: y1 - y0 }; PL.push(P); return P;
  };
  // trees(g, r, x0, x1, y0, yb, gap, o): a row of gnarled trees across a plane (o = gnarled options + w, skip(x)).
  FF.trees = function (g, r, x0, x1, y0, yb, gap, o) {
    for (let x = x0 + r() * gap * .5; x < x1; x += gap * (.7 + r() * .6)) {
      if (o.skip && o.skip(x)) continue;
      const w = o.w * (.75 + r() * .5), h = yb - y0 + 120 + r() * 200;
      gnarled(g, r, x, yb + r() * 10, h, w, { bend: (r() - .5) * 1.6, lean: (r() - .5) * .06, n: o.n, from: o.from, len: o.len, depth: o.depth || 3, side: r() < .5 ? -1 : 1, moss: o.moss || 0, mossLen: o.mossLen || 60, mossW: o.mossW || 1 });
    }
  };
  /* forest({ dy, stag }) — the style's standard world: 5 planes far → near (p .12 .25 .42 .62 .82) of gnarled mossy trees,
     ridges, grass and brambles, each fading into fog. dy shifts every ground line (default horizon ≈ y 1150–1214);
     stag = { x, y, s } puts the giant stag in plane 2 (p .25; x in that plane's coords ≈ world x × .25). Call once after init. */
  FF.forest = function (o = {}) {
    const dy = o.dy || 0; FDY = dy; PL.length = 0;
    FF.plane(.12, .45, C.p1, .04, [[300 + dy, 1150 + dy, .6]], (g, x0, x1, y0, y1) => { const r = rng(11);
      FF.trees(g, r, x0, x1, y0, 1150 + dy, 210, { w: 30, n: 5, from: 14, len: 200, depth: 2 }); ridge(g, x0, x1, x => 1150 + dy + Math.sin(x / 170) * 10, C.p1, y1); });
    FF.plane(.25, .5, C.p2, .05, [[500 + dy, 1170 + dy, .5]], (g, x0, x1, y0, y1) => { const r = rng(12);
      FF.trees(g, r, x0, x1, y0, 1160 + dy, 380, { w: 40, n: 7, from: 12, len: 230, moss: .25, mossLen: 50 });
      if (o.stag) stag(g, rng(77), o.stag.x, o.stag.y ?? 1166 + dy, o.stag.s ?? .55);
      ridge(g, x0, x1, x => 1160 + dy + Math.sin(x / 210) * 12, C.p2, y1); });
    FF.plane(.42, .55, C.p3, .06, [[800 + dy, 1190 + dy, .36]], (g, x0, x1, y0, y1) => { const r = rng(13), RG = x => 1180 + dy + Math.sin(x / 210) * 14 + Math.sin(x / 77) * 4;
      FF.trees(g, r, x0, x1, y0, 1186 + dy, 640, { w: 52, n: 7, from: 20, len: 230, moss: .3, mossLen: 70 });
      ridge(g, x0, x1, RG, C.p3, y1); grass(g, r, x0, x1, RG, (x1 - x0) / 14 | 0, 16);
      for (let x = x0 + 200; x < x1; x += 500 + r() * 400) bramble(g, r, x, RG(x), 70 + r() * 30); });
    FF.plane(.62, .6, C.p4, .07, [[900 + dy, 1220 + dy, .3]], (g, x0, x1, y0, y1) => { const r = rng(14), RG = x => 1200 + dy + Math.sin(x / 120) * 8;
      FF.trees(g, r, x0, x1, y0, 1200 + dy, 620, { w: 66, n: 8, from: 22, len: 240, moss: .3, mossLen: 90, mossW: 1.1 });
      ridge(g, x0, x1, RG, C.p4, y1); grass(g, r, x0, x1, RG, (x1 - x0) / 12 | 0, 18); });
    FF.plane(.82, .7, C.p5, .08, [[1000 + dy, 1240 + dy, .22, C.fogD]], (g, x0, x1, y0, y1) => { const r = rng(15);
      FF.trees(g, r, x0, x1, y0, 1214 + dy, 820, { w: 92, n: 7, from: 20, len: 280, moss: .35, mossLen: 120, mossW: 1.3 });
      for (let x = x0 + 300; x < x1; x += 700 + r() * 500) bramble(g, r, x, 1216 + dy, 140 + r() * 60); });
  };
  // putPlane(ctx, cm, i): draw plane i (0 = farthest) at its depth.
  FF.putPlane = function (ctx, cm, i) { const P = PL[i]; FF.layer(ctx, cm, P.p, () => ctx.drawImage(P.c, P.x0, P.y0, P.w, P.h)); };
  // bank(ctx, cm, p, tex, Yw, h, speed, t, alpha): a drifting fog bank at depth p, world top Yw, height h, drift speed px/s.
  FF.bank = function (ctx, cm, p, tex, Yw, h, speed, t, alpha) {
    const [z, ex, ey] = FF.layerM(cm, p), y = Yw * z + ey, hh = h * z, tw = W * 1.6 * Math.max(.8, z), off = ((t * speed - ex) % tw + tw) % tw;
    if (y > H || y + hh < 0 || alpha <= 0) return;
    ctx.globalAlpha = alpha; for (let x = -off; x < W; x += tw) ctx.drawImage(tex, x, y, tw, hh); ctx.globalAlpha = 1;
  };
  // backdrop(ctx, cm, t): the sky, the 5 forest planes and the fog banks drifting between them (everything behind the world plane).
  FF.backdrop = function (ctx, cm, t) {
    const d = FDY, bank = FF.bank;
    ctx.drawImage(TX.sky, 0, 0);
    bank(ctx, cm, .06, TX.fogHi, 520 + d, 560, 8, t, .4);
    FF.putPlane(ctx, cm, 0);
    bank(ctx, cm, .15, TX.fogA, 900 + d, 460, 12, t, .5);
    FF.putPlane(ctx, cm, 1);
    bank(ctx, cm, .3, TX.fogB, 1040 + d, 360, -10, t, .55);
    FF.putPlane(ctx, cm, 2);
    bank(ctx, cm, .5, TX.fogB, 1080 + d, 360, 20, t, .55);
    FF.putPlane(ctx, cm, 3);
    bank(ctx, cm, .7, TX.fogA, 1130 + d, 300, -16, t, .45);
    FF.putPlane(ctx, cm, 4);
    bank(ctx, cm, .9, TX.fogLow, 1140 + d, 110, 22, t, .55);
  };
  // midFog(ctx, cm, t): the thin fog bank just in front of the world plane (between the road and the figures).
  FF.midFog = (ctx, cm, t) => FF.bank(ctx, cm, 1, TX.fogA, 1150 + FDY, 150, 26, t, .3);

  /* ---------------------------------------------------------------- the foreground frame (screen space, a little parallax) */
  // buildFrame(): a huge trunk at the left and right with mossy limbs arching over the top, and a dark bank of earth, grass
  // and brambles along the bottom (the platform-UI band). Call once after init.
  FF.buildFrame = function () {
    const c = Pilot.canvas(W + 2 * FM, H), g = c.getContext('2d'), r = rng(17);
    g.translate(FM, 0); g.fillStyle = C.p7; g.strokeStyle = C.p7; g.lineCap = 'round'; g.lineJoin = 'round';
    const sp = trunk(g, r, -110, 2000, 2150, 210, { bend: .5 });
    branch(g, r, sp[25][0] + 60, sp[25][1], -.5, 700, 78, 3, { kink: .35, up: 0, moss: .3, mossDepth: 3, mossLen: 160, mossW: 1.5 });
    branch(g, r, sp[33][0] + 30, sp[33][1], -1.1, 420, 50, 3, { kink: .5, moss: .3, mossDepth: 3, mossLen: 110, mossW: 1.3 });
    const sp2 = trunk(g, r, 1220, 2000, 2150, 190, { bend: -.6 });
    branch(g, r, sp2[30][0] - 40, sp2[30][1], Math.PI + .45, 460, 56, 3, { kink: .45, up: 0, moss: .35, mossDepth: 3, mossLen: 130, mossW: 1.4 });
    g.setTransform(1, 0, 0, 1, 0, 0);
    TX.frame = c;
    const f = Pilot.canvas(W + 2 * FM, 620), h = f.getContext('2d'); h.translate(FM, -1500); h.fillStyle = C.p7; h.strokeStyle = C.p7; h.lineCap = 'round';
    const FR = x => 1790 + (x - 300) * (x - 300) / 9000 * .3 - ss(700, 1250, x) * 40;
    ridge(h, -FM, W + FM, FR, C.p7, 2130); bramble(h, r, 930, FR(930), 200); bramble(h, r, 140, FR(140), 140); grass(h, r, -FM, W + FM, FR, 120, 40);
    TX.bank = f;
  };
  function liveMoss(ctx, t, fx) {   // moss strands hanging from the frame's limb, swaying
    ctx.save(); ctx.strokeStyle = C.p7; ctx.lineCap = 'round';
    for (const m of LM) { const x0 = m.x + fx; let px = x0, py = m.y;
      for (let i = 1; i <= m.n; i++) { const u = i / m.n, sw = Math.sin(t * TAU / 3 + m.ph + u * 1.6) * m.amp * u * u;
        const nx = x0 + sw + Math.sin(i * 1.3 + m.ph) * 2, ny = m.y + m.len * u;
        ctx.lineWidth = m.w * (1 - u * .75); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke(); px = nx; py = ny; } }
    ctx.restore();
  }
  /* foreground(ctx, cm, t, { cx }) — low fog over the path, the dark bank, the framing trunks + swaying moss (parallax around
     world x = cx, default 1200), and the dark canopy at the top that keeps the captions readable. Draw after the action layer. */
  FF.foreground = function (ctx, cm, t, o = {}) {
    FF.bank(ctx, cm, 1.15, TX.fogA, 1290 + FDY, 200, 34, t, .26);
    const fx = clamp(-(cm.x - (o.cx ?? 1200)) * .06, -FM + 20, FM - 20), fz = 1 + (cm.z - 1) * .12;
    ctx.save(); ctx.translate(540, 960); ctx.scale(fz, fz); ctx.translate(-540, -960);
    ctx.drawImage(TX.bank, -FM + fx * 1.3, 1500); ctx.drawImage(TX.frame, -FM + fx, 0); liveMoss(ctx, t, fx); ctx.restore();
    ctx.drawImage(TX.top, 0, 0);
  };

  /* ---------------------------------------------------------------- the ground: road, a gap (ravine), an arch of light */
  /* road({ x0, x1, top, gaps }) — a path whose far edge is the wobbling line top (default 1212) from x0 to x1, with a grass
     strip along that edge, broken at each gap { x, w }. Returns the road object for drawRoad / roadTop. */
  FF.road = function (o) {
    const R = { x0: o.x0, x1: o.x1, top: o.top ?? 1212, strips: [] }, RT = R.top;
    R.yAt = x => RT + Math.sin(x / 37) * 2 + Math.sin(x / 13) * 1;
    const strip = (xa, xb, seed) => { const c = Pilot.canvas(Math.ceil(xb - xa), 60), g = c.getContext('2d'), r = rng(seed); g.translate(-xa, -(RT - 40));
      g.strokeStyle = '#33605f'; g.lineCap = 'round'; grass(g, r, xa, xb, R.yAt, (xb - xa) / 9 | 0, 22); return { c, x: xa, y: RT - 40 }; };
    let xa = o.x0, seed = 3;
    for (const gp of (o.gaps || [])) { R.strips.push(strip(xa, gp.x - 8, seed++)); xa = gp.x + gp.w + 8; }
    R.strips.push(strip(xa, o.x1, seed));
    return R;
  };
  // drawRoad(ctx, R): the path (teal, darkening toward the viewer) and its grass edge — in the world layer.
  FF.drawRoad = function (ctx, R) {
    const RT = R.top, gr = ctx.createLinearGradient(0, RT, 0, RT + 520);
    gr.addColorStop(0, '#4b7b7d'); gr.addColorStop(.12, '#3c6c6f'); gr.addColorStop(.3, '#2a5559'); gr.addColorStop(.55, '#173539'); gr.addColorStop(1, '#0c1e22');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(R.x0, 3000); for (let x = R.x0; x <= R.x1; x += 12) ctx.lineTo(x, R.yAt(x)); ctx.lineTo(R.x1, 3000); ctx.closePath(); ctx.fill();
    for (const s of R.strips) ctx.drawImage(s.c, s.x, s.y);
  };
  /* gap({ x, w, top, seed }) — a ravine cut down through the path from x to x + w (world px), ragged ledges narrowing into the
     dark, roots hanging from the lips. Returns { x, w, top, path (Path2D, clip to it), edge, tex }. Draw: drawGap, gapMist, gapEdges. */
  FF.gap = function (o) {
    const E = o.x, G = o.w, RT = o.top ?? 1212, r = rng(o.seed ?? 81), Lw = [], Rw = [];
    for (const [side, arr, x0] of [[1, Lw, E], [-1, Rw, E + G]]) { let y = RT;
      while (y < RT + 1500) { const d = y - RT, ins = Math.min(G / 2 - 34, d < 140 ? d * .1 : 14 + (d - 140) * .2);
        arr.push([x0 + side * (ins + r() * 7), y]); y += 22 + r() * 30; if (r() < .25 && d > 100) { arr.push([x0 + side * (ins + 10 + r() * 14), y]); y += 6; } } }
    const VOID = new Path2D(); VOID.moveTo(E, RT - 2); for (const p of Lw) VOID.lineTo(...p); for (const p of Rw.slice().reverse()) VOID.lineTo(...p); VOID.lineTo(E + G, RT - 2); VOID.closePath();
    const RX0 = E - 10, RX1 = E + G + 10, RY0 = RT - 4, RY1 = RT + 1500, c = Pilot.canvas(RX1 - RX0, RY1 - RY0), g = c.getContext('2d');
    g.translate(-RX0, -RY0); g.clip(VOID);
    const bg = g.createLinearGradient(0, RT, 0, RT + 700); bg.addColorStop(0, '#0f262b'); bg.addColorStop(.3, '#0a1d22'); bg.addColorStop(1, '#040b0e');
    g.fillStyle = bg; g.fillRect(RX0, RY0, RX1 - RX0, RY1 - RY0);
    for (const [col, sh] of [['#1a393f', 34], ['#11292e', 14]]) for (const arr of [Lw, Rw]) {
      const side = arr === Lw ? 1 : -1; g.fillStyle = col; g.beginPath(); g.moveTo(side > 0 ? RX0 : RX1, RT + 90);
      for (const p of arr) if (p[1] > RT + 90) g.lineTo(p[0] + side * (sh + Math.sin(p[1] / 40) * 8), p[1] + 10); g.lineTo(side > 0 ? RX0 : RX1, RY1); g.closePath(); g.fill(); }
    g.strokeStyle = '#0a1c20'; g.lineCap = 'round';
    for (const [x, dir] of [[E, 1], [E + G, -1]]) for (let k = 0; k < 6; k++) { let px = x + dir * (2 + r() * 8), py = RT + 8 + r() * 60;
      for (let i = 0; i < 10; i++) { const nx = px + dir * (r() * 5 - 1), ny = py + 10; g.lineWidth = 3.4 * (1 - i / 11); g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke(); px = nx; py = ny; } }
    return { x: E, w: G, top: RT, path: VOID, edge: [Lw, Rw], tex: { c, x: RX0, y: RY0 } };
  };
  FF.drawGap = (ctx, gp) => ctx.drawImage(gp.tex.c, gp.tex.x, gp.tex.y);
  /* gapMist(ctx, t, gp, hitAt) — mist rising in the ravine (clipped to it), and a gust of mist billowing up out of it from
     hitAt (the hit; omit for none). Draw after drawGap and anything sinking into the gap. */
  FF.gapMist = function (ctx, t, gp, hitAt) {
    const E = gp.x, G = gp.w, RT = gp.top;
    ctx.save(); ctx.clip(gp.path);
    for (let k = 0; k < 4; k++) { const yy = RT + 250 + k * 46 - 30 * Math.sin(t * .7 + k), tw = 760, off = ((t * (12 + k * 7) + k * 260) % tw);
      ctx.globalAlpha = [.35, .5, .7, .85][k]; for (let x = E - off - 40; x < E + G + 40; x += tw) ctx.drawImage(k % 2 ? TX.fogA : TX.fogB, x, yy, tw, 150 + k * 30); }
    { const sg = ctx.createLinearGradient(0, RT + 300, 0, RT + 560); sg.addColorStop(0, 'rgba(120,168,168,0)'); sg.addColorStop(.5, 'rgba(120,168,168,.55)'); sg.addColorStop(1, 'rgba(96,140,142,.75)');
      ctx.globalAlpha = 1; ctx.fillStyle = sg; ctx.fillRect(E - 4, RT + 300, G + 8, 2600); }
    ctx.globalAlpha = 1;
    if (hitAt != null && t > hitAt) FF.gust(ctx, t, hitAt, E + G / 2, RT + 360, G);
    ctx.restore();
  };
  // gust(ctx, t, at, x, y, w): the hit's mist gust — 7 puffs billowing up from (x, y) across width w over 1.6 s.
  FF.gust = function (ctx, t, at, x, y, w) {
    const u = clamp((t - at) / 1.6);
    for (let i = 0; i < 7; i++) { const s = (i - 3) / 3, R0 = 60 + eo(u) * (180 + i * 14), cx = x + s * w * .38 + Math.sin(i * 2.1) * 20, cy = y - eo(u) * (300 + i * 22);
      ctx.globalAlpha = .55 * (1 - u) * (1 - .2 * Math.abs(s)); ctx.drawImage(PUFF, cx - R0, cy - R0, 2 * R0, 2 * R0); } ctx.globalAlpha = 1;
  };
  // gapEdges(ctx, gp): the ravine's lips catching the fog light.
  FF.gapEdges = function (ctx, gp) {
    ctx.save(); ctx.strokeStyle = 'rgba(170,214,212,.45)'; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
    for (const arr of gp.edge) { ctx.beginPath(); ctx.moveTo(arr === gp.edge[0] ? gp.x : gp.x + gp.w, gp.top); for (const p of arr) { if (p[1] > gp.top + 700) break; ctx.lineTo(...p); } ctx.stroke(); }
    ctx.restore();
  };
  // archPath(A, r): the round-arch outline of radius r for arch A = { x, cy, base } (centre x, arch centre y, ground y − 4).
  FF.archPath = function (A, r) { const p = new Path2D(), gy = A.base + 4; p.moveTo(A.x - r, gy); p.lineTo(A.x - r, A.cy); p.arc(A.x, A.cy, r, Math.PI, TAU); p.lineTo(A.x + r, gy); p.closePath(); return p; };
  /* arch(ctx, t, A) — a stone arch on two piers with warm light filling its opening, a halo in the fog, light spilling onto
     the path and soft shafts rising through the fog. A = { x, cy, base }: opening 98 px radius, stone 136 px. World layer. */
  FF.arch = function (ctx, t, A) {
    const GX = A.x, GAY = A.cy, BY = A.base, archPath = r => FF.archPath(A, r);
    const fl = 1 - .05 * (.5 + .5 * Math.sin(t * 7.3)) * (.5 + .5 * Math.sin(t * 3.1));
    FF.warm(ctx, GX, BY - 170, 560, .5 * fl, 'screen');
    const lg = ctx.createLinearGradient(0, GAY - 98, 0, BY); lg.addColorStop(0, '#ffe6b8'); lg.addColorStop(.6, '#fff4da'); lg.addColorStop(1, '#ffd79a');
    ctx.fillStyle = lg; ctx.fill(archPath(98));
    ctx.save(); ctx.fillStyle = '#1c3b40'; ctx.fill(archPath(136)); ctx.restore();
    ctx.fillStyle = lg; ctx.fill(archPath(98));
    ctx.fillStyle = '#1c3b40'; ctx.fillRect(GX - 150, BY - 30, 300, 34);
    ctx.strokeStyle = 'rgba(160,200,198,.35)'; ctx.lineWidth = 2; ctx.stroke(archPath(136));
    for (let i = 0; i < 11; i++) { const a = Math.PI + Math.PI * (i + .5) / 11; ctx.beginPath(); ctx.moveTo(GX + Math.cos(a) * 100, GAY + Math.sin(a) * 100); ctx.lineTo(GX + Math.cos(a) * 134, GAY + Math.sin(a) * 134); ctx.stroke(); }
    FF.warm(ctx, GX, BY - 150, 300, .55 * fl, 'screen');
    ctx.save(); ctx.globalCompositeOperation = 'screen'; const sp = ctx.createLinearGradient(0, BY - 30, 0, BY + 90);
    sp.addColorStop(0, 'rgba(255,206,140,.45)'); sp.addColorStop(1, 'rgba(255,190,120,0)'); ctx.fillStyle = sp;
    ctx.beginPath(); ctx.moveTo(GX - 90, BY + 4); ctx.lineTo(GX + 90, BY + 4); ctx.lineTo(GX + 260, BY + 90); ctx.lineTo(GX - 300, BY + 90); ctx.fill();
    FF.shafts(ctx, GX, GAY);
    ctx.restore();
  };
  // shafts(ctx, x, y): three soft warm light shafts rising up-left through the fog from (x, y) (call inside 'screen').
  FF.shafts = function (ctx, GX, GAY) {
    for (const [dx, w, al] of [[-60, 70, .12], [20, 90, .1], [80, 60, .08]]) {
      const sg = ctx.createLinearGradient(GX, GAY, GX - 260, GAY - 700); sg.addColorStop(0, `rgba(255,214,160,${al})`); sg.addColorStop(1, 'rgba(255,214,160,0)'); ctx.fillStyle = sg;
      ctx.beginPath(); ctx.moveTo(GX + dx - w / 2, GAY + 40); ctx.lineTo(GX + dx + w / 2, GAY + 40); ctx.lineTo(GX + dx - 180 + w, GAY - 760); ctx.lineTo(GX + dx - 180 - w, GAY - 760); ctx.fill(); }
  };

  /* ---------------------------------------------------------------- warm light (THE accent) */
  // warm(ctx, x, y, R, a, mode): a soft warm halo of radius R (sprite), alpha a, composite mode (default source-over; 'screen' in fog).
  FF.warm = function (ctx, x, y, R, a, mode = 'source-over') {
    if (a <= 0) return; ctx.save(); ctx.globalCompositeOperation = mode; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(WARM, x - R, y - R, 2 * R, 2 * R); ctx.restore();
  };
  // glowAt(ctx, x, y, R, a): an additive warm glow (radial gradient, 'lighter') — the light a warm object gives off.
  FF.glowAt = function (ctx, x, y, R, a) {
    if (a <= 0) return; const g = ctx.createRadialGradient(x, y, 6, x, y, R);
    g.addColorStop(0, `rgba(255,214,150,${a})`); g.addColorStop(.4, `rgba(246,178,104,${a * .4})`); g.addColorStop(1, 'rgba(240,170,100,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - R, y - R, 2 * R, 2 * R); ctx.restore();
  };
  // flecks(ctx, t, list): little triangles thrown up and falling to their landing y (sawdust, sparks, seeds).
  //   item = { t0, x, y, vx, vy, land, r0, vr, sz, col } (px, px/s); each fades 1.0–1.6 s after t0. Gravity 1400 px/s².
  FF.flecks = function (ctx, t, list) {
    for (const q of list) {
      const u = t - q.t0; if (u < 0) continue; const al = 1 - ss(q.t0 + 1.0, q.t0 + 1.6, t); if (al <= 0) continue;
      const tl = (-q.vy + Math.sqrt(q.vy * q.vy + 4 * 700 * (q.land - q.y))) / 1400, uu = Math.min(u, Math.max(0, tl));
      const x = q.x + q.vx * uu, y = q.y + q.vy * uu + 700 * uu * uu, r = q.r0 + q.vr * uu;
      ctx.globalAlpha = al; ctx.fillStyle = q.col; ctx.beginPath();
      for (let i = 0; i < 3; i++) { const a = r + i * TAU / 3 + (i === 1 ? .5 : 0); ctx.lineTo(x + Math.cos(a) * q.sz, y + Math.sin(a) * q.sz * .7); } ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  /* ---------------------------------------------------------------- the action layer + rim light */
  /* action(ctx, z1, ex1, ey1, wy0, wy1, fn) — draw figures/props with fn(a) on the action buffer in world coords (a = its
     context, transform = the world plane's), only for world rows wy0…wy1 (the band where figures can be), then composite it.
     Follow with rim() passes: they light the silhouettes' edges from the same buffer. */
  FF.action = function (ctx, z1, ex1, ey1, wy0, wy1, fn) {
    BAND = [Math.max(0, Math.floor(wy0 * z1 + ey1)), Math.min(H, Math.ceil(wy1 * z1 + ey1))];
    const a = ACT.getContext('2d'); a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, BAND[0], W, BAND[1] - BAND[0]); a.setTransform(z1, 0, 0, z1, ex1, ey1);
    a.lineCap = 'round'; a.lineJoin = 'round';
    fn(a);
    ctx.drawImage(ACT, 0, BAND[0], W, BAND[1] - BAND[0], 0, BAND[0], W, BAND[1] - BAND[0]);
  };
  // rim(ctx, dx, dy, col, a): light the edges of the action layer — the silhouette minus itself shifted by (dx, dy) screen px, in col, 'screen'.
  FF.rim = function (ctx, dx, dy, col, a) {
    if (a <= 0) return; const r = RIM.getContext('2d'), [y0, y1] = BAND, h = y1 - y0; if (h <= 0) return;
    r.globalCompositeOperation = 'copy'; r.drawImage(ACT, 0, y0, W, h, 0, y0, W, h); r.globalCompositeOperation = 'destination-out'; r.drawImage(ACT, 0, y0, W, h, dx, y0 + dy, W, h);
    r.globalCompositeOperation = 'source-in'; r.fillStyle = col; r.fillRect(0, y0, W, h); r.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = a; ctx.drawImage(RIM, 0, y0, W, h, 0, y0, W, h); ctx.restore();
  };
  // withAlpha(ctx, a, fn): draw fn(g) as ONE layer at opacity a (a figure fading out without its overlapping parts showing through).
  FF.withAlpha = function (ctx, a, fn) {
    if (a >= 1) return fn(ctx); if (a <= 0) return;
    const g = TMP.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.setTransform(ctx.getTransform()); fn(g);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.drawImage(TMP, 0, 0); ctx.restore();
  };

  /* ---------------------------------------------------------------- the figure: a hooded silhouette on a 2-bone IK rig */
  /* A pose F = { s scale (1 ≈ 340 px tall), f facing (1 right / −1 left), gy ground y, hip [x, y], ang body lean (rad, f folded in),
       feet [[x, y] far, [x, y] near], hands [far, near] grip points ([x, y] or null = hanging), hand ['fist'|'flat'|'open' ×2],
       tilt head turn relative to the body (+ = clockwise), sway cloak sway px, ph walk phase,
       col body colour, armCol near-arm colour (a shade lighter so it reads over the body), edge outline colour for the arms,
       farFront draw the far arm over the body (both hands busy in front), alpha (via withAlpha), sq horizontal squash (turns) }.
     Bones (× s): thigh 96, shin 90, upper arm 78, forearm 74. Shoulder = body point (6, 140) — at the top of the back behind
     the neck (body-check fix); the far arm hangs from (−2, 138) in the far colour. Hands are drawn AT the grip point. */
  function ik(a, t, l1, l2, pick) {
    let dx = t[0] - a[0], dy = t[1] - a[1], d = Math.hypot(dx, dy) || 1e-6; const dd = clamp(d, Math.abs(l1 - l2) + .5, l1 + l2 - .5);
    const tx = a[0] + dx / d * dd, ty = a[1] + dy / d * dd, an = Math.atan2(ty - a[1], tx - a[0]), b = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
    const j1 = [a[0] + Math.cos(an + b) * l1, a[1] + Math.sin(an + b) * l1], j2 = [a[0] + Math.cos(an - b) * l1, a[1] + Math.sin(an - b) * l1];
    return [pick(j1, j2), [tx, ty]];
  }
  // basis(F) → { up, fw, P(a, b) }: body axes; P maps body coords (a forward, b up, × s) to world px.
  function basis(F) {
    const up = [Math.sin(F.ang), -Math.cos(F.ang)], fw = [F.f * Math.cos(F.ang), F.f * Math.sin(F.ang)], s = F.s;
    return { up, fw, P: (a, b) => [F.hip[0] + fw[0] * a * s + up[0] * b * s, F.hip[1] + fw[1] * a * s + up[1] * b * s] };
  }
  const shoulderOf = F => basis(F).P(6, 140);
  function capsule(a, b, wa, wb, n = 7) {
    const dx = b[0] - a[0], dy = b[1] - a[1], an = Math.atan2(dy, dx), pts = [];
    for (let i = 0; i <= n; i++) { const q = an + Math.PI / 2 + Math.PI * i / n; pts.push([a[0] + Math.cos(q) * wa / 2, a[1] + Math.sin(q) * wa / 2]); }
    for (let i = 0; i <= n; i++) { const q = an - Math.PI / 2 + Math.PI * i / n; pts.push([b[0] + Math.cos(q) * wb / 2, b[1] + Math.sin(q) * wb / 2]); }
    return pts;
  }
  function poly(ctx, pts, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); }
  Object.assign(FF, { ik, basis, shoulderOf, capsule, poly });
  /* figure(ctx, F, mid, back) — draw the hooded figure. back() is drawn first (behind everything: a thing carried behind the
     body), mid() between the body/head and the near arm (a thing held in front of the body, under the near hand). */
  FF.figure = function (ctx, F, mid, back) {
    const sq = F.sq != null && F.sq !== 1; if (sq) { ctx.save(); ctx.translate(F.hip[0], 0); ctx.scale(F.sq, 1); ctx.translate(-F.hip[0], 0); }
    const s = F.s, f = F.f, col = F.col || C.me, far = F.farCol || mixHex(col, C.fogD, .16), { P } = basis(F);
    const sh = P(6, 140), shF = P(-2, 138);
    const elbowPick = (a, b) => (a[1] - f * a[0] * .35) > (b[1] - f * b[0] * .35) ? a : b, kneePick = (a, b) => f * a[0] > f * b[0] ? a : b;
    const arm = (S0, T, c, type) => {
      if (!T) T = [S0[0] - f * 8 * s, S0[1] + 140 * s];
      const [el, hd] = ik(S0, T, 78 * s, 74 * s, elbowPick);
      poly(ctx, capsule(S0, el, 21 * s, 16 * s), c); poly(ctx, capsule(el, hd, 16 * s, 12 * s), c);
      if (F.edge && c !== far) { ctx.strokeStyle = F.edge; ctx.lineWidth = 1.8; for (const q of [capsule(S0, el, 21 * s, 16 * s), capsule(el, hd, 16 * s, 12 * s)]) { ctx.beginPath(); ctx.moveTo(...q[0]); for (const v of q) ctx.lineTo(...v); ctx.closePath(); ctx.stroke(); } }
      const an = Math.atan2(hd[1] - el[1], hd[0] - el[0]);
      let pts;
      if (type === 'flat') pts = [[-4, -7], [10, -8], [24, -5], [28, 0], [22, 4], [-2, 6], [-8, 2]].map(([u, v]) => [hd[0] + f * u * s, hd[1] + v * s - 4 * s]);
      else if (type === 'open') pts = [[-6, -8], [16, -9], [26, -4], [18, -2], [27, 2], [16, 5], [-2, 9], [-8, 2]].map(([u, v]) => [hd[0] + (Math.cos(an) * u - Math.sin(an) * v) * s, hd[1] + (Math.sin(an) * u + Math.cos(an) * v) * s]);
      else { pts = []; for (let i = 0; i < 12; i++) { const q = i / 12 * TAU; pts.push([hd[0] + Math.cos(q) * 13 * s, hd[1] + Math.sin(q) * 11.5 * s]); }
        pts.splice(8, 0, [hd[0] + Math.cos(an - 1.9) * 16 * s, hd[1] + Math.sin(an - 1.9) * 16 * s]); }
      poly(ctx, pts, c);
    };
    const leg = (T, c) => {
      const hp = P(-2, -2), ank = [T[0], T[1] - 9 * s];
      const [kn, an] = ik(hp, ank, 96 * s, 90 * s, kneePick);
      poly(ctx, capsule(hp, kn, 26 * s, 20 * s), c); poly(ctx, capsule(kn, an, 20 * s, 14 * s), c);
      const lift = Math.max(0, F.gy - T[1]), toe = lift > 6 * s ? .35 : 0;
      poly(ctx, [[-11, -14], [8, -13], [30, -6], [36, 1], [-12, 1]].map(([u, v]) => { const cu = Math.cos(toe), su = Math.sin(toe); return [an[0] + f * (u * cu - v * su) * s, an[1] + 9 * s + (u * su + v * cu) * s]; }), c);
    };
    if (back) back();
    if (!F.farFront) arm(shF, F.hands[0], far, F.hand?.[0] || 'fist');
    leg(F.feet[0], far); leg(F.feet[1], col);
    const hemD = Math.max(40 * s, F.gy - F.hip[1] - 70 * s), sw = (F.sway || 0) * s;
    const skx = (a, b) => [F.hip[0] + f * a * s + sw * b / hemD, F.hip[1] + b];
    const cl = [skx(-30, -10), skx(28, -10), skx(40, hemD * .55)];
    for (let i = 0; i <= 9; i++) { const u = i / 9, a = lerp(50, -50, u); cl.push(skx(a, hemD + (i % 2 ? -7 : 3) * s + Math.sin(i * 1.7 + (F.ph || 0) * 6) * 2 * s)); }
    cl.push(skx(-40, hemD * .55)); poly(ctx, cl, col);
    poly(ctx, [[-26, -6], [-33, 40], [-34, 100], [-27, 138], [-10, 152], [10, 154], [25, 142], [29, 110], [31, 60], [26, -6]].map(([a, b]) => P(a, b)), col);
    const tilt = F.ang + (F.tilt || 0), hu = [Math.sin(tilt), -Math.cos(tilt)], hf = [f * Math.cos(tilt), f * Math.sin(tilt)], N = P(6, 146);
    const Hc = [N[0] + hu[0] * 30 * s + hf[0] * 4 * s, N[1] + hu[1] * 30 * s + hf[1] * 4 * s], Q = (a, b) => [Hc[0] + (hf[0] * a + hu[0] * b) * s, Hc[1] + (hf[1] * a + hu[1] * b) * s];
    poly(ctx, [[-30, -40], [-36, -20], [-37, 0], [-33, 18], [-23, 31], [-8, 38], [8, 38], [20, 32], [28, 21], [31, 10], [36, 3], [38, -3], [33, -7], [31, -12], [28, -19], [20, -26], [8, -31], [2, -42], [-16, -47]].map(([a, b]) => Q(a, b)), col);
    if (mid) mid();
    if (F.farFront) arm(shF, F.hands[0], far, F.hand?.[0] || 'fist');
    arm(sh, F.hands[1], F.armCol || col, F.hand?.[1] || 'fist');
    if (sq) ctx.restore();
  };

  /* ---------------------------------------------------------------- poses (all return a fresh F; positions in world px) */
  // walk(x, gy, s, f, ph, stride, lean, lift): a walking step. ph = phase (cycles; tie it to distance: x / (stride·s) → no foot sliding),
  //   stride px per cycle, lean rad, lift foot height px. Arms hang (hands null) unless set.
  FF.walk = function (x, gy, s, f, ph, stride, lean, lift = 22) {
    const frac = v => v - Math.floor(v);
    const feet = [0, 1].map(i => { const p = frac(ph + i * .5); let off, up = 0;
      if (p < .58) off = stride * (.29 - p); else { const u = (p - .58) / .42; off = -.29 * stride + .58 * stride * eio(u); up = lift * Math.sin(Math.PI * u); }
      return [x + f * off * s, gy - up * s]; });
    const hipH = (176 - 5 * Math.abs(Math.sin(TAU * ph))) * s;
    return { s, f, gy, hip: [x, gy - hipH], ang: f * lean, feet, hands: [null, null], hand: ['fist', 'fist'], tilt: 0, sway: -f * 7 * Math.sin(TAU * ph), ph };
  };
  // stand(x, gy, s, f, lean): standing at rest.
  FF.stand = function (x, gy, s, f, lean = .05) { return { s, f, gy, hip: [x, gy - 178 * s], ang: f * lean, feet: [[x - f * 18 * s, gy], [x + f * 22 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: 0, sway: 0 }; };
  // crouch(x, gy, s, f, bend): squatting low, bent far over the ground in front (working on the ground: sawing, digging). Hands reach ≈ x + f·(60…130)·s at ground level.
  FF.crouch = function (x, gy, s, f, bend = 1.1) { return { s, f, gy, hip: [x, gy - 84 * s], ang: f * bend, feet: [[x - f * 74 * s, gy], [x + f * 60 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: -f * .32, sway: 0 }; };
  // kneel(x, gy, s, f, bend): down on the far knee (shin flat behind), near foot planted in front, back bent by `bend` (0 upright … .9 over the ground).
  FF.kneel = function (x, gy, s, f, bend = .3) { return { s, f, gy, hip: [x, gy - 98 * s], ang: f * bend, feet: [[x - f * 92 * s, gy], [x + f * 58 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: 0, sway: 0, knee: true }; };
  // hangHands(F, swing): where relaxed hands hang (far, near), swing px fore/aft (walk: 18·sin(2π·ph)).
  FF.hangHands = function (F, swing = 0) { const sh = basis(F).P(4, 136); return [[sh[0] - F.f * (10 + swing) * F.s, sh[1] + 140 * F.s], [sh[0] - F.f * (10 - swing) * F.s, sh[1] + 140 * F.s]]; };
  /* mix(A, B, k): in-between two poses (k 0→1; ease it). Hands left null take the hanging position. Facing/hand shapes switch at k .5.
     Body-check rule: every stand↔kneel/crouch change and every pick-up/set-down gets ≥ .3–.4 s of mix, with the hands ON the object. */
  FF.mix = function (A, Bs, k) {
    if (k <= 0) return A; if (k >= 1) return Bs;
    const l2 = (a, b) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], hA = FF.hangHands(A), hB = FF.hangHands(Bs);
    const pick = k < .5 ? A : Bs;
    return { ...pick, s: lerp(A.s, Bs.s, k), gy: lerp(A.gy, Bs.gy, k), hip: l2(A.hip, Bs.hip), ang: lerp(A.ang, Bs.ang, k), feet: [l2(A.feet[0], Bs.feet[0]), l2(A.feet[1], Bs.feet[1])],
      hands: [0, 1].map(i => l2(A.hands[i] || hA[i], Bs.hands[i] || hB[i])), hand: pick.hand.slice(), tilt: lerp(A.tilt || 0, Bs.tilt || 0, k), sway: lerp(A.sway || 0, Bs.sway || 0, k) };
  };
  // turn(A, B, k): mix, plus a squash through the turn (the body thins to a sliver at k .5 where the facing flips). Use ≥ .35 s.
  FF.turn = function (A, Bs, k) { const F = FF.mix(A, Bs, k); if (k > 0 && k < 1) F.sq = Math.max(.3, Math.abs(Math.cos(Math.PI * k))); return F; };
  // knee(F, i): where knee i (0 far, 1 near) is in this pose (same IK as the drawing) — e.g. to rest a hand on it.
  FF.knee = function (F, i = 1) { const s = F.s, f = F.f, hp = basis(F).P(-2, -2), T = F.feet[i];
    return ik(hp, [T[0], T[1] - 9 * s], 96 * s, 90 * s, (a, b) => f * a[0] > f * b[0] ? a : b)[0]; };
  // look(F, a): turn the head by a rad relative to the body (+ = looks down/forward, − = looks up). Returns F.
  FF.look = function (F, a) { F.tilt = F.f * a; return F; };
  // reach(F, far, near, shapes): put the hands on grip points (null = hang); shapes e.g. ['fist', 'open']. Returns F.
  FF.reach = function (F, far, near, shapes) { F.hands = [far, near]; if (shapes) F.hand = shapes.slice(); return F; };

  /* ---------------------------------------------------------------- long things held (poles, planks, crosses) */
  // A held thing X = { x, y, a } = where its local u = 0 end is and its angle; pt(X, u, v) maps along (u) / across (v) it.
  FF.pt = (X, u, v = 0) => [X.x + Math.cos(X.a) * u - Math.sin(X.a) * v, X.y + Math.sin(X.a) * u + Math.cos(X.a) * v];
  FF.mixX = (A, Bx, k) => k <= 0 ? A : k >= 1 ? Bx : { ...Bx, x: lerp(A.x, Bx.x, k), y: lerp(A.y, Bx.y, k), a: lerp(A.a, Bx.a, k), u0: Bx.u0, lie: k > .62 ? Bx.lie : A.lie };
  FF.rotAbout = function (X, pv, th) { const ox = X.x - pv[0], oy = X.y - pv[1]; return { ...X, x: pv[0] + ox * Math.cos(th) - oy * Math.sin(th), y: pv[1] + ox * Math.sin(th) + oy * Math.cos(th), a: X.a + th }; };
  /* onShoulder(F, a0, contact, thick) — a long thing resting on the near shoulder, sloping back-down at a0 (rad, for f = 1;
     mirrored for f = −1), touching the shoulder at u = contact; thick = its thickness px. Draw it as F's back() (behind the
     body); grip it with pt(X, contact + 64) (far hand) and pt(X, contact + 106) (near hand, chest height, never at the face). */
  FF.onShoulder = function (F, a0, contact, thick) {
    const fr = basis(F), sh = shoulderOf(F), T = [sh[0] - fr.up[0] * 6 * F.s, sh[1] - fr.up[1] * 6 * F.s];
    const a = F.f > 0 ? a0 : Math.PI - a0, d = [Math.cos(a), Math.sin(a)]; let n = [d[1], -d[0]]; if (n[1] > 0) n = [-n[0], -n[1]];
    return { x: T[0] + n[0] * thick / 2 - d[0] * contact, y: T[1] + n[1] * thick / 2 - d[1] * contact, a, contact };
  };
  // upright(F, foot, dx): a long thing stood on the ground in front (foot end at u = foot), dx·s ahead of the hip; grip near its top.
  FF.upright = function (F, foot = 0, dx = 58) { return { x: F.hip[0] + dx * F.s, y: F.gy + 2 + foot, a: -Math.PI / 2 }; };
  // inFront(F, len, lift): carried level across the front at chest height (u 0 … len, centred on the body); hands at u = len·.3 / .7.
  FF.inFront = function (F, len, lift = 0) { const c = basis(F).P(30, 96 + lift); return { x: c[0] - len / 2, y: c[1], a: 0 }; };

  /* ---------------------------------------------------------------- the cross prop (channel staple; any plank: kind = colour) */
  FF.CROSS = { L: 520, PW: 34, CBX: 390, CBW: 32, CBH: 118, CBHL: 50 };   // post length, width; crossbar position (from foot), width, half-length upright / lying
  /* cross(ctx, kind, u0, u1, x, y, a, lying, K) — the cross material between u0 and u1 along the post (foot at u = 0), foot at
     (x, y), angle a. kind 'warm' = the accent wood (gradient, grain, fresh cut faces), else a flat silhouette colour. */
  FF.cross = function (ctx, kind, u0, u1, x, y, a, lying, K = FF.CROSS) {
    const { L, PW, CBX, CBW, CBH, CBHL } = K;
    if (u1 - u0 < .5) return;
    const hb = lying ? CBHL : CBH;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.beginPath(); ctx.rect(u0, -hb - 6, u1 - u0, 2 * hb + 12); ctx.clip();
    if (kind === 'warm' || kind === 'mine') {
      const gp = ctx.createLinearGradient(0, -PW / 2, 0, PW / 2); gp.addColorStop(0, C.goldL); gp.addColorStop(.35, C.gold); gp.addColorStop(1, C.goldD);
      ctx.fillStyle = gp; ctx.fillRect(0, -PW / 2, L, PW);
      const gb = ctx.createLinearGradient(CBX - CBW / 2, 0, CBX + CBW / 2, 0); gb.addColorStop(0, C.goldD); gb.addColorStop(.4, C.gold); gb.addColorStop(1, C.goldL);
      ctx.fillStyle = gb; ctx.fillRect(CBX - CBW / 2, -hb, CBW, 2 * hb);
      ctx.strokeStyle = 'rgba(120,64,24,.45)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); for (const v of [-7, 3, 10]) { ctx.moveTo(4, v); for (let u = 4; u < L - 4; u += 40) ctx.lineTo(u + 40, v + Math.sin(u * .05 + v) * 1.5); } ctx.stroke();
      if (u0 > .5) { ctx.fillStyle = C.goldL; ctx.fillRect(u0, -PW / 2, 3.5, PW); }
      if (u1 < L - .5) { ctx.fillStyle = C.goldL; ctx.fillRect(u1 - 3.5, -PW / 2, 3.5, PW); }
    } else {
      ctx.fillStyle = kind; ctx.fillRect(0, -PW / 2, L, PW); ctx.fillRect(CBX - CBW / 2, -hb, CBW, 2 * hb);
    }
    ctx.restore();
  };
  // crossOutline(x, y, K): the outline points of a lying cross with its foot-end centre at (x, y) (for a dashed "missing" outline).
  FF.crossOutline = function (x, y, K = FF.CROSS) {
    const { L, PW, CBX, CBW, CBHL } = K, hb = CBHL; return [[0, -PW / 2], [CBX - CBW / 2, -PW / 2], [CBX - CBW / 2, -hb], [CBX + CBW / 2, -hb], [CBX + CBW / 2, -PW / 2], [L, -PW / 2], [L, PW / 2],
      [CBX + CBW / 2, PW / 2], [CBX + CBW / 2, hb], [CBX - CBW / 2, hb], [CBX - CBW / 2, PW / 2], [0, PW / 2]].map(([a, b]) => [x + a, y + b]);
  };

  /* ---------------------------------------------------------------- words, end */
  // captions / endCard: Story's, in the style's serif and fog-ink colours (o overrides).
  FF.captions = (ctx, t, lines, o = {}) => Story.captions(ctx, t, lines, { font: FF.FONT, weight: 700, size: 60, color: C.ink, srcColor: '#cfe6e3', y: 430, shadow: 'rgba(6,22,24,.95)', shadowBlur: 22, ...o });
  FF.endCard = (ctx, t, card, at, o = {}) => Story.endCard(ctx, t, card, at, { font: FF.FONT, color: C.ink, srcColor: '#bcd8d5', y: 860, titleShadow: 'rgba(0,0,0,.5)', ...o });
  // endPlate(ctx, t, at): the fog closes in for the end card — a deep teal plate (in over −.3…+.25 s around `at`) with fog drifting across it.
  FF.endPlate = function (ctx, t, at) {
    const k = ss(at - .3, at + .25, t); if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = k * .9; ctx.drawImage(TX.plate, 0, 0); ctx.globalAlpha = 1; ctx.restore();
    const cm = { x: 0, y: 960, z: 1 };
    FF.bank(ctx, cm, 1, TX.fogHi, 1180, 420, 18, t, .16 * k); FF.bank(ctx, cm, 1, TX.fogA, 440, 300, -12, t, .1 * k);
  };

  window.FogForest = FF;
})();

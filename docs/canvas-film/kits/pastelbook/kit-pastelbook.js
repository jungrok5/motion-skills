/* kit-pastelbook.js — house style "pastel coloured-pencil picture book" for word-log films (global: window.Pastelbook).
   A sunny picture-book meadow in soft coloured pencil: flat light fills with pencil grain and paper tooth, thin wobbly
   outlines in a darker pencil of each colour, puffy union-of-circles clouds, cone and lollipop trees, a cream path, a
   pink-roofed cottage with a warm open door. The cast are small round bears (a cream "me", quieter grey/beige others),
   jointed and posed with 2-bone IK (fixed bone lengths). One accent: honey-coloured wood / warm gold light.
   Figures pose on twos (12 fps, `t12`); the camera moves on ones.
   First film: sermons/2026-10-24-cross-styles/film/scenes/cs-pastelbook.html (잘라 낸 건 다리였다 · 10, the worked example).
   Style card: styles/pastelbook/STYLE.md. Template: styles/pastelbook/template.html.

   HOW A FRAME IS MADE (world px: the 1080×1920 frame at zoom 1; ground lanes around y 1250–1300)
     ctx.drawImage(P.sky, 0, 0);                                       flat sky (built in init)
     P.layer(ctx, cm, .12, () => P.drawClouds(ctx, t, clouds));        parallax: clouds .12, far hills .35, meadow .65
     P.layer(ctx, cm, .35, () => P.drawSheet(ctx, far)); …
     P.layer(ctx, cm, 1, () => { road/ravine/cottage sheets, figures (P.drawBear), props, effects });
     P.paperPass(ctx, cm);  P.endPlate(ctx, t, at);  P.captions(ctx, t, lines);  P.endCard(ctx, t, card, at);
   cm = { x, y, z, sx, sy } (world point at the frame centre, zoom, shake px). Static scenery goes on sheets (canvases
   built once, drawn by visible part). Pure functions of their arguments; seeded randomness only (Pilot.rng / noise);
   no network, no images. Load after lib.js and story.js; call P.init() first in the scene's init(). */
(function () {
  const { clamp, lerp, ss, eo, eio, rng } = Pilot;
  const TAU = Math.PI * 2;
  const P = {};
  const PAT = {};
  let W = 1080, H = 1920;

  /* ---------------------------------------------------------------- palette, cast colours, type */
  P.C = {
    sky0: '#a9d4ea', sky1: '#d4ebf2', cloud: '#fdfcf6', cloudL: '#b9a596',
    hillF: '#a7cf93', hillFL: '#86b07a', hill: '#b4da98', hillL: '#8fba7f', mead: '#bfe0a0', meadL: '#97c084', meadD: '#aed392',
    cone: '#86bd78', coneL: '#5f9862', round: '#99cc84', roundD: '#86bb74', roundL: '#6aa064', trunk: '#b48a72', trunkL: '#87604f',
    path: '#f5efc4', pathL: '#d5c993', wall: '#fbf5e6', wallL: '#c4ad98', roof: '#f3b6c0', roofD: '#e9a1ae', roofL: '#c08593',
    win: '#e8e2c4', warm: '#ffd77a', door: '#d9b494', doorL: '#a98466',
    earth: '#e6c9ab', earth2: '#d9b597', earthL: '#ad8a70', haze: '#d4cde6', deep: '#b3add6', deep2: '#9c95c6', abyss: '#4a4276', water: '#a9dcd8', waterL: '#7fb3ad',
    flowerW: '#fffdf4', flowerY: '#f8de7c', flowerP: '#f6c0c8', ink: '#8a6450', inkD: '#5a4034', blush: '#f4b3a8', sweat: '#cfeaf6', sweatL: '#8dbfd6',
    saw: '#dde3e8', sawL: '#8b96a2', handle: '#d79a68', handleL: '#93603f',
  };
  const C = P.C;
  // bears: f fur, d far-limb fur, l outline pencil, mz muzzle/belly, bl blush, in inner ear. ME = the hero (cream), PALS = the others.
  P.ME = { f: '#ecd0a6', d: '#dcb98b', l: '#a57d5a', mz: '#f8ecd6', bl: '#f4b3a8', in: '#f2b7ae' };
  P.PALS = [
    { f: '#ddd5ca', d: '#cdc3b6', l: '#9d9184', mz: '#f1ece4', bl: '#e8c4bc', in: '#e6c6c0' },
    { f: '#d5cdd3', d: '#c6bdc4', l: '#9a8f98', mz: '#eee9ec', bl: '#e6c3c6', in: '#e3c5c9' },
    { f: '#d6c7b4', d: '#c7b7a3', l: '#988670', mz: '#efe6da', bl: '#e6c1b6', in: '#e4c4ba' },
    { f: '#cfcbc0', d: '#c0bbaf', l: '#938d80', mz: '#ecebe4', bl: '#e2c3bb', in: '#e0c5bf' },
  ];
  P.bearPal = (f, o = {}) => ({ f, d: o.d || Pilot.rgb(Pilot.mix(Pilot.hex(f), [120, 90, 60], .12)), l: o.l || Pilot.rgb(Pilot.mix(Pilot.hex(f), [70, 45, 30], .42)),
    mz: o.mz || '#f8ecd6', bl: o.bl || '#f4b3a8', in: o.in || '#f2b7ae' });   // a recoloured bear from one fur colour (#hex)
  // wood: f body, h top-edge light, g grain/shade, l outline, end cut end-grain. XME = THE accent (honey wood); XPIL = weathered grey wood.
  P.XME = { f: '#eba54c', h: '#f8cf82', g: '#c47a2c', l: '#94582a', end: '#f6d9a2' };
  P.XPIL = { f: '#d6cabb', h: '#e8dfd3', g: '#b5a796', l: '#968574', end: '#ebe3d8' };
  P.ACCENT = P.XME.f; P.GLOW = '255,222,150';                  // the accent colour; rgb of the warm light (glows, sparkles)
  P.FONT = "'Gamja Flower',sans-serif"; P.SANS = "'Noto Sans KR',sans-serif";
  P.FONTS = ["400 74px 'Gamja Flower'", "500 34px 'Noto Sans KR'", "400 28px 'Noto Sans KR'"];   // for Pilot.run({fonts})
  P.HIPH = 104;                                                 // the bear's hip height at scale 1 (px)
  P.t12 = t => Math.floor(t * 12 + 1e-6) / 12;                  // time on twos (figure poses, boil)
  const t12 = P.t12;
  P.frac = x => x - Math.floor(x);
  const frac = P.frac;

  /* ---------------------------------------------------------------- pencil marks */
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  // smooth(pts, closed) → Path2D: quadratic curve through the midpoints (soft hand-drawn corners)
  function smooth(pts, closed = true) {
    const p = new Path2D(), n = pts.length;
    if (closed) { const m0 = mid(pts[n - 1], pts[0]); p.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) { const a = pts[i], m = mid(a, pts[(i + 1) % n]); p.quadraticCurveTo(a[0], a[1], m[0], m[1]); } p.closePath(); }
    else { p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n - 1; i++) { const m = mid(pts[i], pts[i + 1]); p.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); } p.lineTo(pts[n - 1][0], pts[n - 1][1]); }
    return p;
  }
  // rough(pts, amp px, seed, step px, closed) → points resampled every `step` and wobbled by noise (a hand's line; fixed per seed, never crawls)
  function rough(pts, amp, seed, step = 10, closed = true) {
    const o = [], n = pts.length, m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % n], Ln = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.round(Ln / step));
      for (let j = 0; j < k; j++) { const u = j / k, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
        o.push([x + (Pilot.noise(x * .03 + seed, y * .03) - .5) * amp, y + (Pilot.noise(y * .03 + seed * 1.7, x * .03 + 9) - .5) * amp]); } }
    if (!closed) o.push(pts[n - 1]);
    return o;
  }
  const ellPts = (cx, cy, rx, ry, n = 22) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };
  const linePath = (pts, closed = true) => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); if (closed) p.closePath(); return p; };
  // pencil(ctx, path, col, w): a pencil line — the main stroke plus a faint second pass slightly off, like a pencil going over its own line
  function pencil(ctx, path, col, w = 2.6) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.globalAlpha *= .9; ctx.stroke(path);
    ctx.translate(.8, .6); ctx.globalAlpha *= .3; ctx.lineWidth = w * .7; ctx.stroke(path); ctx.restore();
  }
  // fillPencil(ctx, path, col, {shade, shadeDir:[x0,y0,x1,y1] in bbox units, bbox, grain (0–1, default .5), pat, rule}):
  // coloured-pencil fill — flat colour, a shade band toward one side, then the pencil grain (a tiling pattern, cheap live)
  function fillPencil(ctx, path, col, o = {}) {
    ctx.fillStyle = col; ctx.fill(path, o.rule || 'nonzero');
    if (o.shade && o.bbox) { const [x0, y0, x1, y1] = o.shadeDir || [0, 0, 0, 1], b = o.bbox;
      const g = ctx.createLinearGradient(lerp(b[0], b[2], x0), lerp(b[1], b[3], y0), lerp(b[0], b[2], x1), lerp(b[1], b[3], y1));
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.55, 'rgba(0,0,0,0)'); g.addColorStop(1, o.shade); ctx.fillStyle = g; ctx.fill(path, o.rule || 'nonzero'); }
    const a = o.grain ?? .5; if (a > 0) { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = o.pat || PAT.grain; ctx.fill(path, o.rule || 'nonzero'); ctx.restore(); }
  }
  // shape(ctx, pts, fill, line, {amp, seed, step, lw, …fillPencil opts}) → Path2D: a wobbly pencil-outlined filled polygon
  function shape(ctx, pts, fill, line, o = {}) {
    const p = smooth(o.amp === 0 ? pts : rough(pts, o.amp ?? 3, o.seed ?? 1, o.step ?? 9));
    const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
    fillPencil(ctx, p, fill, { ...o, bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] });
    if (line) pencil(ctx, p, line, o.lw || 2.6);
    return p;
  }
  // blobs(ctx, [[cx, cy, r], …], fill, line, {sq (y squash), amp, seed, lw, …}) → Path2D: union of wobbly circles with ONE outer outline
  // (stroke all at double width, then fill all over it) — clouds, bushes, tree crowns, puffs
  function blobs(ctx, circles, fill, line, o = {}) {
    const p = new Path2D(); let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    circles.forEach(([cx, cy, r], i) => { p.addPath(smooth(rough(ellPts(cx, cy, r, r * (o.sq || 1), 20), o.amp ?? 3, (o.seed || 1) + i * 3.3, 8)));
      bx0 = Math.min(bx0, cx - r); by0 = Math.min(by0, cy - r); bx1 = Math.max(bx1, cx + r); by1 = Math.max(by1, cy + r); });
    if (line) { ctx.save(); ctx.strokeStyle = line; ctx.lineWidth = (o.lw || 2.6) * 2; ctx.lineJoin = 'round'; ctx.globalAlpha *= .9; ctx.stroke(p); ctx.restore(); }
    fillPencil(ctx, p, fill, { ...o, bbox: [bx0, by0, bx1, by1] });
    return p;
  }
  // periodic value noise (lattice periods px, py) so the grain tiles without seams
  function pnoise(x, y, px, py) {
    const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi, sm = q => q * q * (3 - 2 * q);
    const h = (a, b) => { a = ((a % px) + px) % px; b = ((b % py) + py) % py; let k = Math.imul(a, 374761393) + Math.imul(b, 668265263) | 0; k = Math.imul(k ^ k >>> 13, 1274126177); return ((k ^ k >>> 16) >>> 0) / 4294967296; };
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1), U = sm(u), V = sm(v);
    return a + (b - a) * U + (c - a) * V + (a - b - c + d) * U * V;
  }
  function strokesTile(N, seed) {   // pencil grain: diagonal streaks, paper-tooth specks (white where the pencil skipped)
    const c = Pilot.canvas(N, N), x = c.getContext('2d'), d = x.createImageData(N, N), q = d.data, r = rng(seed);
    for (let y = 0; y < N; y++) for (let i = 0; i < N; i++) {
      const s = pnoise((i + y) * .5, (i - y) * .125, N / 2, N / 8) - .5, tooth = r(), o = (y * N + i) * 4;
      if (tooth > .91 || s > .25) { q[o] = q[o + 1] = q[o + 2] = 255; q[o + 3] = tooth > .91 ? 120 : (s - .25) * 380; }
      else if (s < -.28) { q[o] = 60; q[o + 1] = 50; q[o + 2] = 40; q[o + 3] = (-s - .28) * 180; }
    }
    x.putImageData(d, 0, 0); return c;
  }
  function paperTile(N, seed) {   // final pass: fine tooth + soft warm unevenness
    const c = Pilot.canvas(N, N), x = c.getContext('2d'), d = x.createImageData(N, N), q = d.data, r = rng(seed);
    for (let y = 0; y < N; y++) for (let i = 0; i < N; i++) {
      const lo = pnoise(i / 128, y / 128, N / 128, N / 128) - .5, t = r(), o = (y * N + i) * 4, v = 128 + lo * 40 + (t - .5) * 46 + (t > .97 ? 50 : 0);
      q[o] = q[o + 1] = q[o + 2] = v; q[o + 3] = 255; }
    x.putImageData(d, 0, 0); return c;
  }
  Object.assign(P, { mid, smooth, rough, ellPts, linePath, pencil, fillPencil, shape, blobs, pnoise });
  P.grain = () => PAT.grain;                                    // the pencil-grain pattern (fill/stroke style)
  // grainScaled(k): the grain pattern scaled 1/k — for sprites drawn at k× and scaled down (so the grain matches the world's)
  P.grainScaled = k => { const key = 'g' + k; if (!PAT[key]) { PAT[key] = Pilot.canvas(1, 1).getContext('2d').createPattern(PAT.tile, 'repeat'); PAT[key].setTransform(new DOMMatrix([1 / k, 0, 0, 1 / k, 0, 0])); } return PAT[key]; };

  /* ---------------------------------------------------------------- init */
  // init({grainSeed=3, paperSeed=7}): grain + paper tiles (512²), the flat sky, the dust puff, the end-plate frame, the bear's parts (≈ 0.3 s)
  P.init = function (o = {}) {
    W = Pilot.W; H = Pilot.H;
    const st = strokesTile(512, o.grainSeed ?? 3), pp = paperTile(512, o.paperSeed ?? 7), mk = Pilot.canvas(1, 1).getContext('2d');
    PAT.tile = st; PAT.grain = mk.createPattern(st, 'repeat'); PAT.paper = mk.createPattern(pp, 'repeat');
    P.sky = Pilot.canvas(W, H); { const x = P.sky.getContext('2d'), g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, o.sky0 || C.sky0); g.addColorStop(.6, o.sky1 || C.sky1); g.addColorStop(1, o.sky1 || C.sky1); x.fillStyle = g; x.fillRect(0, 0, W, H); x.globalAlpha = .22; x.fillStyle = PAT.grain; x.fillRect(0, 0, W, H); }
    P.puff = Pilot.canvas(120, 120); { const x = P.puff.getContext('2d'); blobs(x, [[60, 66, 30], [40, 72, 22], [80, 72, 22], [60, 46, 22]], '#fbf8f2', '#c2b3a6', { seed: 5, lw: 2.4, grain: .2 }); }
    P.frame = smooth(rough([[70, 300], [1010, 300], [1010, 1420], [70, 1420]], 5, 12, 20));
    buildBear();
  };

  /* ---------------------------------------------------------------- meadow furniture */
  // cone(ctx, x, y (foot of the crown), h, seed): a cone tree on a short trunk
  function cone(ctx, x, y, h, seed) {
    shape(ctx, [[x - 9, y], [x - 7, y + 30], [x + 7, y + 30], [x + 9, y]], C.trunk, C.trunkL, { seed, amp: 1.5, lw: 2.2 });
    const w = h * .42, pts = [[x, y - h], [x + w * .45, y - h * .55], [x + w * .32, y - h * .55], [x + w * .8, y - h * .12], [x + w * .5, y - h * .12], [x + w, y + 4], [x - w, y + 4], [x - w * .5, y - h * .12], [x - w * .8, y - h * .12], [x - w * .32, y - h * .55], [x - w * .45, y - h * .55]];
    shape(ctx, pts, C.cone, C.coneL, { seed: seed + 1, amp: 3, shade: 'rgba(40,90,50,.22)', shadeDir: [0, 0, 1, .4] });
    ctx.save(); ctx.strokeStyle = C.coneL; ctx.lineWidth = 2; ctx.globalAlpha = .55; ctx.lineCap = 'round';
    for (const [dx, dy] of [[-w * .2, -h * .3], [w * .25, -h * .05], [-w * .35, h * .02]]) { ctx.beginPath(); ctx.moveTo(x + dx, y + dy); ctx.lineTo(x + dx + 6, y + dy - 10); ctx.stroke(); }
    ctx.restore();
  }
  // roundTree(ctx, x, y (crown centre-ish), r, seed, trunkH): a lollipop tree — blob crown, a few leaf ticks
  function roundTree(ctx, x, y, r, seed, trunkH = 60) {
    shape(ctx, [[x - 12, y - r * .3], [x - 13, y + trunkH], [x + 13, y + trunkH], [x + 12, y - r * .3]], C.trunk, C.trunkL, { seed, amp: 2 });
    const rr = rng(seed), cs = [[x, y - r * .55, r * .72], [x - r * .5, y - r * .1, r * .6], [x + r * .5, y - r * .12, r * .62], [x, y + r * .05, r * .6], [x - r * .1, y - r * 1.0, r * .5]];
    blobs(ctx, cs.map(c => [c[0] + (rr() - .5) * 8, c[1], c[2]]), rr() < .5 ? C.round : C.roundD, C.roundL, { seed, shade: 'rgba(40,90,50,.22)', shadeDir: [.2, 0, .9, 1] });
    ctx.save(); ctx.strokeStyle = C.roundL; ctx.lineWidth = 2.2; ctx.globalAlpha = .6; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const a = rr() * TAU, d = r * .4 * rr(); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * d, y - r * .4 + Math.sin(a) * d); ctx.quadraticCurveTo(x + Math.cos(a) * d + 8, y - r * .4 + Math.sin(a) * d - 4, x + Math.cos(a) * d + 12, y - r * .4 + Math.sin(a) * d - 14); ctx.stroke(); }
    ctx.restore();
  }
  // bushRow(ctx, x, y, n bumps, r, seed, col, line): a row of round bushes (one outline)
  function bushRow(ctx, x, y, n, r, seed, col = C.meadD, line = C.meadL) {
    const rr = rng(seed), cs = []; for (let i = 0; i < n; i++) cs.push([x + i * r * 1.25, y - rr() * r * .3, r * (.8 + rr() * .4)]);
    blobs(ctx, cs, col, line, { seed, sq: .78, lw: 2.2 });
  }
  // flower(ctx, x, y (stem foot), h stem, s scale, col petals, sw sway rad): a five-petal daisy
  function flower(ctx, x, y, h, s, col, sw = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
    ctx.strokeStyle = C.meadL; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(3, -h * .5, 0, -h); ctx.stroke();
    ctx.translate(0, -h); ctx.fillStyle = col; ctx.strokeStyle = 'rgba(170,140,120,.8)'; ctx.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 7 * s, Math.sin(a) * 7 * s, 6 * s, 4.5 * s, a, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = C.flowerY; ctx.beginPath(); ctx.arc(0, 0, 4.5 * s, 0, TAU); ctx.fill(); ctx.restore();
  }
  // grassTicks(ctx, n, x0, x1, y0, y1, seed, skip(x, y)?): little V pencil ticks scattered over a band
  function grassTicks(ctx, n, x0, x1, y0, y1, seed, skip) {
    const r = rng(seed); ctx.save(); ctx.strokeStyle = C.meadL; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.globalAlpha = .7;
    for (let i = 0; i < n; i++) { const gx = lerp(x0, x1, r()), gy = lerp(y0, y1, r()), s = .8 + r() * .6; if (skip && skip(gx, gy)) continue;
      ctx.beginPath(); ctx.moveTo(gx - 5 * s, gy - 8 * s); ctx.lineTo(gx, gy); ctx.lineTo(gx + 3 * s, gy - 10 * s); ctx.stroke(); }
    ctx.restore();
  }
  // cloudSprite(w, h, seed, n bumps) → canvas (with .pd padding): a puffy cloud, round bumps on a flat-ish base, blue-grey underside
  function cloudSprite(w, h, seed, n) {
    const pd = Math.round(h * .5), c = Pilot.canvas(w + 2 * pd, h + 2 * pd), x = c.getContext('2d'), r = rng(seed), cs = [];
    const base = pd + h;
    for (let i = 0; i < n; i++) { const u = (i + .5) / n, rr = h * (.3 + .3 * Math.sin(u * Math.PI)) * (.85 + r() * .3);
      cs.push([pd + w * (.06 + .88 * u), base - rr * .75 - Math.sin(u * Math.PI) * h * .3, rr]); }
    for (let i = 0; i < n - 1; i++) { const u = (i + 1) / n; cs.push([pd + w * (.06 + .88 * u), base - h * .3, h * .3]); }
    blobs(x, cs, C.cloud, C.cloudL, { seed, lw: 2.4, grain: .2 });
    x.globalCompositeOperation = 'source-atop'; const g = x.createLinearGradient(0, base - h * .5, 0, base); g.addColorStop(0, 'rgba(170,200,220,0)'); g.addColorStop(1, 'rgba(170,200,220,.32)'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    c.pd = pd; return c;
  }
  Object.assign(P, { cone, roundTree, bushRow, flower, grassTicks, cloudSprite });
  // clouds() → the film's seven drifting clouds [{c, x, y, v px/s}] (parallax .12 layer); pass your own list for another sky
  P.clouds = () => [{ c: cloudSprite(560, 190, 1, 6), x: -700, y: 520, v: 4 }, { c: cloudSprite(520, 210, 2, 6), x: -100, y: 590, v: 5 }, { c: cloudSprite(300, 110, 3, 4), x: 80, y: 200, v: 7 },
    { c: cloudSprite(220, 90, 4, 3), x: 760, y: 140, v: 6 }, { c: cloudSprite(480, 180, 5, 5), x: 520, y: 560, v: 4 }, { c: cloudSprite(260, 100, 6, 4), x: 1000, y: 260, v: 6 }, { c: cloudSprite(520, 200, 7, 6), x: 1100, y: 600, v: 5 }];
  P.drawClouds = (ctx, t, list) => { for (const c of list) ctx.drawImage(c.c, c.x - c.c.pd + t * c.v, c.y - c.c.pd); };
  // butterfly(ctx, t, x, y, alpha): a yellow butterfly flapping on twos at (x, y) — the meadow's ambient life (you move it)
  P.butterfly = function (ctx, t, x, y, alpha = 1) {
    const flap = Math.abs(Math.sin(t12(t) * 14));
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * .7) * .3); ctx.globalAlpha = alpha;
    ctx.fillStyle = '#f9dd86'; ctx.strokeStyle = '#c9a060'; ctx.lineWidth = 1.8;
    for (const s of [-1, 1]) { ctx.save(); ctx.scale(s * (.35 + .65 * flap), 1); ctx.beginPath(); ctx.ellipse(11, -7, 11, 10, -.4, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(8, 8, 7, 6, .4, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, 11); ctx.stroke(); ctx.restore();
  };

  /* ---------------------------------------------------------------- sheets (static scenery, built once) */
  // sheet(x0, y0, x1, y1, fn(g), K) → {c, x0, y0, x1, y1, K}: a canvas covering that world rectangle at K px per world px; fn draws in world coords
  function sheet(x0, y0, x1, y1, fn, K = 1) {
    const c = Pilot.canvas(Math.ceil((x1 - x0) * K), Math.ceil((y1 - y0) * K)), g = c.getContext('2d'); g.setTransform(K, 0, 0, K, -x0 * K, -y0 * K); g.lineJoin = 'round'; fn(g);
    return { c, x0, y0, x1, y1, K };
  }
  // drawSheet(ctx, s): draws only the part of the sheet visible through the current transform
  function drawSheet(ctx, s) {
    const m = ctx.getTransform(), inv = m.inverse(), p0 = inv.transformPoint(new DOMPoint(0, 0)), p1 = inv.transformPoint(new DOMPoint(W, H));
    const x0 = Math.max(s.x0, Math.min(p0.x, p1.x) - 4), x1 = Math.min(s.x1, Math.max(p0.x, p1.x) + 4), y0 = Math.max(s.y0, Math.min(p0.y, p1.y) - 4), y1 = Math.min(s.y1, Math.max(p0.y, p1.y) + 4);
    if (x1 <= x0 || y1 <= y0) return;
    ctx.drawImage(s.c, (x0 - s.x0) * s.K, (y0 - s.y0) * s.K, (x1 - x0) * s.K, (y1 - y0) * s.K, x0, y0, x1 - x0, y1 - y0);
  }
  // ridge(x0, x1, base y, amp, fq, seed, bottom) → closed polygon of a soft rolling hill line down to `bottom`; ridgeY = its height at x
  function ridge(x0, x1, base, amp, fq, seed, bottom) {
    const pts = [[x0, bottom]]; for (let x = x0; x <= x1; x += 40) pts.push([x, base - amp * (Pilot.fbm(x / fq + seed * 7, seed, 3) - .3) * 1.6]); pts.push([x1, bottom]); return pts;
  }
  const ridgeY = (x, base, amp, fq, seed) => base - amp * (Pilot.fbm(x / fq + seed * 7, seed, 3) - .3) * 1.6;
  const crestY = (x, ridgeAt = 1040) => ridgeAt - 14 * Pilot.fbm(x / 400, 2, 3);   // the near meadow's grassy crest line
  Object.assign(P, { sheet, drawSheet, ridge, ridgeY, crestY });

  // farHills(x0, x1) → sheet for parallax .35: two pale hill bands (y ≈ 900 / 1010) with cone and round trees, bush rows
  P.farHills = (x0 = -1300, x1 = 2500) => sheet(x0, 600, x1, 1800, g => {
    shape(g, ridge(x0, x1, 900, 110, 700, 1, 1800), C.hillF, C.hillFL, { seed: 2, amp: 2, step: 14, shade: 'rgba(60,110,70,.12)' });
    const r = rng(11); for (let x = x0 + 100; x < x1 - 50; x += 160 + r() * 260) { const y = ridgeY(x, 900, 110, 700, 1) + 10; r() < .7 ? cone(g, x, y, 110 + r() * 60, 20 + x) : roundTree(g, x, y - 10, 46 + r() * 14, 30 + x, 34); }
    shape(g, ridge(x0, x1, 1010, 90, 520, 3, 1800), C.hill, C.hillL, { seed: 4, amp: 2, step: 14 });
    for (let x = x0 + 50; x < x1 - 50; x += 300 + r() * 300) bushRow(g, x, ridgeY(x + 30, 1010, 90, 520, 3) + 22, 2 + (r() * 2 | 0), 22, 40 + x, C.hill, C.hillL);
  });
  // midMeadow(x0, x1) → sheet for parallax .65: a meadow band (y ≈ 1120) with lollipop trees, cones, bush rows, grass ticks
  P.midMeadow = (x0 = -1300, x1 = 3800) => sheet(x0, 820, x1, 1800, g => {
    shape(g, ridge(x0, x1, 1120, 50, 600, 5, 1800), C.meadD, C.meadL, { seed: 6, amp: 2, step: 14 });
    const r = rng(17);
    for (let x = x0 + 100; x < x1 - 50; x += 230 + r() * 330) { const y = ridgeY(x, 1120, 50, 600, 5) + 30;
      const k = r(); if (k < .45) roundTree(g, x, y - 40, 62 + r() * 26, 60 + x, 60); else if (k < .75) cone(g, x, y, 150 + r() * 70, 70 + x); else bushRow(g, x, y + 10, 3, 26, 80 + x); }
    grassTicks(g, Math.round((x1 - x0) / 5100 * 160), x0, x1, 1130, 1260, 19);
  });

  // ravine({E, G, top, bottom, ridge}) → {E, G, trench(y) → [left lip, right lip], path (Path2D of the cut), sheet (its inside)}:
  // a gap in the ground — exact width G between x = E and E + G across the path band [top, bottom], narrowing into the distance
  // up to the ridge, widening toward us; inside, earth walls fall into a violet dark with mist wisps (no bottom in sight).
  // Draw rv.sheet BEFORE the road sheet (the road has the cut taken out of it: pass the ravine as road({gap})).
  P.ravine = function ({ E, G, top: RT = 1212, bottom: PB = 1352, ridge: RIDGE = 1040 }) {
    function trench(y) {
      const n1 = (Pilot.noise(y * .03, 71) - .5) * 10, n2 = (Pilot.noise(y * .03, 73) - .5) * 10;
      if (y < RT) { const k = clamp((RT - y) / (RT - RIDGE + 30)), cx = E + G / 2 + 60 * k, w = lerp(G, 130, Math.pow(k, .85)); return [cx - w / 2 + n1 * k, cx + w / 2 + n2 * k]; }
      if (y <= PB) return [E, E + G];
      const d = (y - PB) * .14, kk = clamp((y - PB) / 60); return [E - d + n1 * kk, E + G + d + n2 * kk];
    }
    const L1 = [], R1 = []; for (let y = RIDGE - 60; y <= 2820; y += 8) { const [a, b] = trench(y); L1.push([a, y]); R1.push([b, y]); }
    const path = linePath([...L1, ...R1.reverse()]);
    const rv = { E, G, top: RT, bottom: PB, ridge: RIDGE, trench, path };
    rv.sheet = sheet(E - 280, RIDGE - 40, E + G + 280, 2800, g => {
      g.clip(path); { const cp = new Path2D(); cp.moveTo(E - 300, 2900); for (let x = E - 300; x <= E + G + 300; x += 20) cp.lineTo(x, crestY(x, RIDGE) + 2); cp.lineTo(E + G + 300, 2900); cp.closePath(); g.clip(cp); }
      // the depth: dark at the middle of the cut, a little lighter toward the walls; the far end fades into haze
      g.fillStyle = C.abyss; g.fillRect(E - 280, RIDGE - 40, G + 560, 2840 - RIDGE);
      g.save(); g.globalAlpha = .5; g.fillStyle = PAT.grain; g.fillRect(E - 280, RIDGE - 40, G + 560, 2840 - RIDGE); g.restore();
      const ww = y => y < RT ? lerp(150, 30, clamp((RT - y) / (RT - RIDGE))) : 150 + (y - RT) * .09;
      const ys = []; for (let y = RIDGE - 40; y <= 2800; y += 20) ys.push(y);
      for (const side of [0, 1]) {
        const dir = side ? -1 : 1, outer = ys.map(y => [trench(y)[side] - dir * 30, y]), inner = ys.map(y => [trench(y)[side] + dir * ww(y), y]);
        const p = shape(g, [...outer, ...inner.slice().reverse()], side ? C.earth2 : C.earth, null, { seed: 84 + side, amp: 4, step: 14, grain: .5 });
        g.save(); g.clip(p);
        const r = rng(85 + side); g.strokeStyle = C.earthL; g.lineWidth = 1.8; g.globalAlpha = .5; g.lineCap = 'round';   // ledges and roots
        for (let y = RIDGE + 10; y < 2780; y += 26 + r() * 30) { const x0 = trench(y)[side], w = ww(y); g.beginPath(); g.moveTo(x0 + dir * w * (.08 + r() * .15), y); g.lineTo(x0 + dir * w * (.4 + r() * .3), y + 4 + r() * 6); g.stroke(); }
        // the wall darkens as it falls away from the lip (the face turns down into the dark)
        g.globalAlpha = 1; for (let i = 0; i < ys.length - 1; i++) { const y = ys[i], xl = trench(y)[side], w = ww(y), hg = g.createLinearGradient(xl, 0, xl + dir * w, 0);
          hg.addColorStop(0, 'rgba(60,46,90,0)'); hg.addColorStop(.35, 'rgba(70,56,104,.18)'); hg.addColorStop(1, 'rgba(48,38,80,.88)'); g.fillStyle = hg; g.fillRect(Math.min(xl, xl + dir * w) - 1, y, w + 2, 21); }
        if (side) { g.globalAlpha = .25; g.fillStyle = '#5d5090'; g.fill(p); }
        g.restore();
      }
      // the dark core down the middle, and soft wisps of mist hanging in the depth (fixed, picture-book)
      for (let i = 0; i < ys.length - 1; i++) { const y = ys[i], [a, b] = trench(y), m = (a + b) / 2, hw = (b - a) / 2, cg = g.createLinearGradient(a, 0, b, 0);
        cg.addColorStop(0, 'rgba(36,30,64,0)'); cg.addColorStop(.5, 'rgba(36,30,64,.55)'); cg.addColorStop(1, 'rgba(36,30,64,0)'); g.fillStyle = cg; g.fillRect(m - hw, y, 2 * hw, 21); }
      const r = rng(89);
      for (let y = RT + 60; y < 2700; y += 150 + r() * 120) { const [a, b] = trench(y), w = (b - a) * (.35 + r() * .3), cx = lerp(a + w / 2, b - w / 2, r());
        g.save(); g.globalAlpha = .22 + r() * .12; blobs(g, [[cx - w * .3, y, w * .16], [cx, y - 8, w * .2], [cx + w * .3, y, w * .15]], '#d9d2ee', null, { seed: y, sq: .45, grain: .2 }); g.restore(); }
      // haze at the far end (the ravine goes on into the distance)
      const hz = g.createLinearGradient(0, RIDGE, 0, RT + 220); hz.addColorStop(0, 'rgba(214,206,236,.95)'); hz.addColorStop(.6, 'rgba(206,198,232,.45)'); hz.addColorStop(1, 'rgba(206,198,232,0)');
      g.fillStyle = hz; g.fillRect(E - 280, RIDGE - 40, G + 560, RT + 200 - RIDGE);
    });
    return rv;
  };

  // road({x0, x1, ridge, top, bottom, pathEnd, y1, gap}) → sheet (parallax 1): the near meadow from a grassy crest (y ≈ ridge)
  // down to y1 — far bank with small cones/bushes, a cream path between y = top and bottom (rounded end at pathEnd), pebbles,
  // then the near meadow (bush rows, trees, grass ticks, daisies). gap = a P.ravine(): cut out of the sheet, lips pencilled,
  // grass tufts hanging over the path's corners, nothing planted inside it.
  P.road = function ({ x0: ROADX0, x1: ROADX1, ridge: RIDGE = 1040, top: RT = 1212, bottom: PB = 1352, pathEnd, y1 = 2700, gap = null }) {
    const y0 = RIDGE - 40, pe = pathEnd ?? ROADX1, trench = gap && gap.trench;
    const inTrench = (x, y, pad = 40) => { if (!gap) return false; const [a, b] = trench(y); return x > a - pad && x < b + pad; };
    return sheet(ROADX0, y0, ROADX1, y1, g => {
      const r = rng(61);
      const crest = [[ROADX0, y1]]; for (let x = ROADX0; x <= ROADX1; x += 60) crest.push([x, crestY(x, RIDGE)]); crest.push([ROADX1, y1]);
      shape(g, crest, C.mead, C.meadL, { seed: 62, amp: 2, step: 16 });
      // the far bank: small far bushes and cones on the crest, a few tiny flowers
      for (let x = ROADX0 + 40; x < ROADX1; x += 220 + r() * 300) { const y = RIDGE + 10 + r() * 30; if (inTrench(x, y, 80)) continue; r() < .5 ? cone(g, x, y, 70 + r() * 30, 500 + x) : bushRow(g, x, y + 6, 2, 14 + r() * 5, 600 + x); }
      grassTicks(g, Math.round((ROADX1 - ROADX0) / 30), ROADX0, ROADX1, RIDGE + 50, RT - 30, 64, (x, y) => inTrench(x, y));
      for (let x = ROADX0 + 40; x < ROADX1; x += 170 + r() * 260) { if (inTrench(x, RT - 6, 70) || inTrench(x + 80, RT - 6, 70)) continue; bushRow(g, x, RT - 6, 2 + (r() * 3 | 0), 20 + r() * 8, 100 + x); }
      // the path: a cream band
      const top = [], bot = [];
      for (let x = ROADX0; x <= pe; x += 40) { top.push([x, RT + 2 * Math.sin(x * .013)]); bot.push([x, PB + 4 * Math.sin(x * .009 + 1)]); }
      const pp = smooth([...top, [pe + 30, (RT + PB) / 2], ...bot.reverse()]);
      fillPencil(g, pp, C.path, { grain: .45 }); pencil(g, pp, C.pathL, 2.4);
      g.save(); g.strokeStyle = C.pathL; g.lineWidth = 2; g.lineCap = 'round'; g.globalAlpha = .6;   // pebbles and worn dashes
      for (let x = ROADX0; x < pe; x += 70 + r() * 90) { const y = lerp(RT + 18, PB - 14, r()); if (r() < .5) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 18 + r() * 14, y + (r() - .5) * 3); g.stroke(); }
        else { g.beginPath(); g.ellipse(x, y, 5 + r() * 3, 3.5, 0, 0, TAU); g.stroke(); } }
      g.restore();
      // the near meadow: bush rows, trees, flowers, grass ticks
      for (let x = ROADX0 + 100; x < ROADX1; x += 380 + r() * 420) { const y = 1560 + r() * 160; if (inTrench(x, y, 60) || inTrench(x + 110, y, 60)) continue; bushRow(g, x, y, 2 + (r() * 3 | 0), 30 + r() * 10, 200 + x); }
      for (let x = ROADX0 + 300; x < ROADX1; x += 700 + r() * 500) { const y = 1700 + r() * 80; if (inTrench(x, y, 160)) continue; roundTree(g, x, y, 90 + r() * 40, 300 + x, 90); }
      for (let x = ROADX0 + 60; x < ROADX1; x += 300 + r() * 300) { const y = 2000 + r() * 120; if (inTrench(x, y, 60) || inTrench(x + 140, y, 60)) continue; bushRow(g, x, y, 3, 46 + r() * 10, 400 + x); }
      grassTicks(g, Math.round((ROADX1 - ROADX0) / 9), ROADX0, ROADX1, PB + 20, 2500, 63, (x, y) => inTrench(x, y, 10));
      for (let i = 0; i < (ROADX1 - ROADX0) / 40; i++) { const x = lerp(ROADX0, ROADX1, r()), y = PB + 40 + r() * 600; if (inTrench(x, y, 20)) continue; flower(g, x, y, 14 + r() * 10, .8 + r() * .4, r() < .65 ? C.flowerW : C.flowerP, (r() - .5) * .3); }
      if (!gap) return;
      // the ravine: cut away the ground between the lips; pencil the cut edges; grass tufts hang over the path's corners
      const E = gap.E, G = gap.G;
      g.save(); g.globalCompositeOperation = 'destination-out'; g.fill(gap.path); g.restore();
      for (const side of [0, 1]) { const pts = []; for (let y = RIDGE - 30; y <= y1 + 10; y += 12) pts.push([trench(y)[side], y]); pencil(g, smooth(pts, false), C.earthL, 2.8); }
      for (const [x, dir] of [[E, -1], [E + G, 1]]) for (const yy of [RT + 4, PB - 2]) for (let k = 0; k < 4; k++) { const gx = x + dir * (3 + k * 8), gy = yy + k * 2;
        g.strokeStyle = C.meadL; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(gx, gy); g.quadraticCurveTo(gx - dir * 8, gy + 8, gx - dir * 5, gy + 18); g.stroke(); }
    });
  };

  // cottage({x, base, doorW, doorTop, wins:[x, x], spillTo}) → {sheet, back(ctx, t), front(ctx, t), …}: cream walls, pink roof,
  // chimney, flower pots, two lit windows, an open arched door full of warm gold light. Draw order: cot.back(ctx, t) (the light
  // inside the door) → anything walking IN the doorway → cot.front(ctx, t) (walls, windows, glow, light spill to y = spillTo,
  // sparkle ticks around the arch, chimney smoke). `x` = door centre, `base` = ground line under the door.
  P.cottage = function ({ x: GX, base: BY, doorW = 96, doorTop, wins, spillTo = 1352 }) {
    const DOOR = { w: doorW, top: doorTop ?? BY - 250 }, WINS = wins || [GX - 185, GX + 175];
    const cot = { x: GX, base: BY, door: DOOR, wins: WINS };
    cot.sheet = sheet(GX - 340, BY - 860, GX + 340, BY + 30, g => {
      const by = BY - 2, x0 = GX - 270, x1 = GX + 250, wy = by - 470;
      shape(g, [[x0, by], [x0, wy], [x1, wy], [x1, by]], C.wall, C.wallL, { seed: 61, amp: 1.8, shade: 'rgba(120,100,80,.14)', shadeDir: [0, 0, 0, 1] });
      shape(g, [[x0 + 60, wy - 10], [x0 + 60, wy - 120], [x1 - 60, wy - 120], [x1 - 60, wy - 10]], C.wall, C.wallL, { seed: 62, amp: 1.5 });   // the attic strip under the roof
      shape(g, [[x0 - 46, wy + 6], [x0 + 70, by - 820], [x1 - 70, by - 820], [x1 + 46, wy + 6]], C.roof, C.roofL, { seed: 63, amp: 2, shade: 'rgba(200,110,130,.25)', shadeDir: [0, 0, 0, 1] });
      g.save(); g.strokeStyle = C.roofL; g.globalAlpha = .45; g.lineWidth = 2; for (let k = 1; k < 5; k++) { const y = lerp(by - 820, wy + 6, k / 5); g.beginPath(); g.moveTo(lerp(x0 + 70, x0 - 46, k / 5) + 14, y); g.lineTo(lerp(x1 - 70, x1 + 46, k / 5) - 14, y); g.stroke(); } g.restore();
      shape(g, [[x0 + 120, by - 760], [x0 + 120, by - 880], [x0 + 176, by - 880], [x0 + 176, by - 790]], C.roofD, C.roofL, { seed: 65, amp: 1 });   // chimney
      shape(g, [[x0 + 110, by - 880], [x0 + 110, by - 898], [x0 + 186, by - 898], [x0 + 186, by - 880]], C.roof, C.roofL, { seed: 66, amp: 1 });
      // the door: an arch opening with a wooden frame; the open leaf swung back against the wall
      const dw = DOOR.w, ay = DOOR.top, arch = []; arch.push([GX - dw, by]); for (let i = 0; i <= 24; i++) { const a = Math.PI + Math.PI * i / 24; arch.push([GX + Math.cos(a) * dw, ay + Math.sin(a) * dw]); } arch.push([GX + dw, by]);
      const frame = []; frame.push([GX - dw - 18, by]); for (let i = 0; i <= 24; i++) { const a = Math.PI + Math.PI * i / 24; frame.push([GX + Math.cos(a) * (dw + 18), ay + Math.sin(a) * (dw + 18)]); } frame.push([GX + dw + 18, by]);
      shape(g, frame, C.door, C.doorL, { seed: 67, amp: 1.2, step: 8 });
      const op = smooth(rough(arch, 1, 68, 8)); g.save(); g.globalCompositeOperation = 'destination-out'; g.fill(op); g.restore(); pencil(g, op, C.doorL, 2.4);
      // a doorstep, flower pots, window boxes
      shape(g, [[GX - dw - 30, by + 2], [GX - dw - 24, by - 16], [GX + dw + 24, by - 16], [GX + dw + 30, by + 2]], '#e4ded2', '#b2a898', { seed: 70, amp: 1 });
      for (const [px, c] of [[GX - dw - 90, C.flowerP], [x1 - 40, C.flowerW]]) { shape(g, [[px - 22, by], [px - 26, by - 36], [px + 26, by - 36], [px + 22, by]], '#e7a98c', '#b77a5e', { seed: px, amp: 1 });
        blobs(g, [[px - 14, by - 46, 16], [px + 10, by - 50, 17], [px, by - 62, 14]], C.round, C.roundL, { seed: px + 1, lw: 2 });
        for (const [fx, fy] of [[px - 12, by - 54], [px + 10, by - 60], [px - 1, by - 70]]) { g.fillStyle = c; g.beginPath(); g.arc(fx, fy, 5, 0, TAU); g.fill(); g.fillStyle = C.flowerY; g.beginPath(); g.arc(fx, fy, 2, 0, TAU); g.fill(); } }
      for (const wx of WINS) { shape(g, [[wx - 48, wy + 150], [wx - 48, wy + 142], [wx + 48, wy + 142], [wx + 48, wy + 150]].map(p => [p[0], p[1] + 132]), C.door, C.doorL, { seed: wx, amp: .8 }); }
    });
    cot.back = (ctx, t) => {   // warm light inside the arch
      const by = BY - 2, ay = DOOR.top;
      const lg = ctx.createLinearGradient(0, ay - DOOR.w, 0, by); lg.addColorStop(0, '#fff4cf'); lg.addColorStop(1, C.warm);
      ctx.fillStyle = lg; ctx.fillRect(GX - DOOR.w - 4, ay - DOOR.w - 4, 2 * DOOR.w + 8, by - ay + DOOR.w + 8);
    };
    cot.front = (ctx, t) => {
      const by = BY - 2, ay = DOOR.top, flick = 1 + .03 * Math.sin(t * 7);
      drawSheet(ctx, cot.sheet);
      for (const wx of WINS) { const wy = BY - 2 - 470 + 230, wp = smooth(rough([[wx - 40, wy - 54], [wx + 40, wy - 54], [wx + 40, wy + 40], [wx - 40, wy + 40]], 1, wx, 8));
        ctx.fillStyle = C.warm; ctx.fill(wp); pencil(ctx, wp, C.wallL, 2.6);
        ctx.strokeStyle = C.wallL; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(wx, wy - 52); ctx.lineTo(wx, wy + 38); ctx.moveTo(wx - 38, wy - 7); ctx.lineTo(wx + 38, wy - 7); ctx.stroke(); }
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      const g = ctx.createRadialGradient(GX, by - 160, 20, GX, by - 160, 420); g.addColorStop(0, `rgba(255,222,140,${.55 * flick})`); g.addColorStop(.45, 'rgba(255,214,140,.2)'); g.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = g; ctx.fillRect(GX - 420, by - 580, 840, 840);
      ctx.fillStyle = 'rgba(255,226,150,.35)'; ctx.beginPath(); ctx.moveTo(GX - DOOR.w + 6, by + 2); ctx.lineTo(GX + DOOR.w - 6, by + 2); ctx.lineTo(GX + DOOR.w + 120, spillTo - 6); ctx.lineTo(GX - DOOR.w - 150, spillTo - 6); ctx.closePath(); ctx.fill();
      ctx.restore();
      P.sparkles(ctx, GX, ay - 10, DOOR.w + 40, .8, t, 7);
      // chimney smoke: soft outlined puffs
      for (let i = 0; i < 5; i++) { const k = frac(t / 3.2 + i / 5), px = GX - 270 + 148 + Math.sin(k * 5 + i) * 12 + k * 50, py = by - 900 - k * 200, rr = 14 + k * 30;
        ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * Math.min(1, k * 1.3)) * .9; ctx.drawImage(P.puff, px - rr, py - rr, rr * 2, rr * 2); ctx.restore(); }
    };
    return cot;
  };

  /* ---------------------------------------------------------------- the bear (jointed, posed in a torso frame) */
  // A pose F = { s scale, f (+1 faces right), pal, gy ground y, hip:[x, y], ang (torso lean rad, + = toward +x), feet:[far, near] targets,
  //   hands:[far, near] targets or null (null = hangs), hand:[type far, type near] ('fist' | 'flat' | 'open' | 'grip'), tilt (head nod,
  //   + = forward / − = looks up), eye ('calm' | 'strain' | 'shock' | 'down' | 'happy' | 'up'), sweat 0–1, farFront (far arm drawn
  //   in front of the body), sq (squash, 1 = none; for turns/landings — about the feet; don't combine with gripped hands), alpha }.
  // Legs: thigh 58, shin 54; arms: upper 50, forearm 48 (× s) — fixed: IK clamps an out-of-reach target, it never stretches.
  // ik(a, t, l1, l2, pick) → [joint, end]: 2-bone IK from a to target t; pick(j1, j2) chooses the bend side
  function ik(a, t, l1, l2, pick) {
    let dx = t[0] - a[0], dy = t[1] - a[1], d = Math.hypot(dx, dy) || 1e-6; const dd = clamp(d, Math.abs(l1 - l2) + .5, l1 + l2 - .5);
    const tx = a[0] + dx / d * dd, ty = a[1] + dy / d * dd, an = Math.atan2(ty - a[1], tx - a[0]), b = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
    const j1 = [a[0] + Math.cos(an + b) * l1, a[1] + Math.sin(an + b) * l1], j2 = [a[0] + Math.cos(an - b) * l1, a[1] + Math.sin(an - b) * l1];
    return [pick(j1, j2), [tx, ty]];
  }
  // frame(F) → {up, fw, P(a, b)}: torso frame, P(a, b) = hip + forward·a + up·b (× s)
  function frame(F) {
    const up = [Math.sin(F.ang), -Math.cos(F.ang)], fw = [F.f * Math.cos(F.ang), F.f * Math.sin(F.ang)], s = F.s;
    return { up, fw, P: (a, b) => [F.hip[0] + fw[0] * a * s + up[0] * b * s, F.hip[1] + fw[1] * a * s + up[1] * b * s] };
  }
  const shoulderOf = F => frame(F).P(6, 100);   // near shoulder (world); the far one is P(-4, 98)
  const BEAR = {};
  function buildBear() {   // body parts as Path2D in local units (x forward, y down), roughened once so outlines never crawl
    const R = (pts, seed, amp = 1.4, step = 7) => smooth(rough(pts, amp, seed, step));
    BEAR.body = R([[-38, 12], [-14, 22], [16, 20], [34, 4], [40, -30], [37, -70], [27, -102], [8, -120], [-16, -121], [-32, -106], [-41, -72], [-45, -30]], 81);
    BEAR.belly = R(ellPts(20, -52, 15, 40, 16), 82, 1);
    BEAR.tail = R(ellPts(-44, -16, 13, 12, 12), 83, 1);
    BEAR.head = R(ellPts(5, -43, 55, 50, 24), 93);
    BEAR.earB = R(ellPts(-31, -79, 18, 17, 14), 90); BEAR.earF = R(ellPts(22, -86, 18, 17, 14), 91);
    BEAR.muzzle = R(ellPts(43, -30, 21, 16, 14), 94, 1);
  }
  function drawFace(x, F, pal) {   // in head-local units, facing +x
    const eye = F.eye || 'calm';
    x.fillStyle = C.inkD; x.beginPath(); x.ellipse(60, -36, 6.5, 5, 0, 0, TAU); x.fill();
    x.strokeStyle = C.inkD; x.lineWidth = 2.6; x.lineCap = 'round';
    if (eye === 'strain') {   // squeezed shut ( > ), a wavy pressed mouth
      x.beginPath(); x.moveTo(28, -66); x.lineTo(38, -59); x.lineTo(28, -53); x.stroke();
      x.beginPath(); x.moveTo(36, -18); x.quadraticCurveTo(41, -21, 45, -18); x.quadraticCurveTo(49, -15, 53, -18); x.stroke();
    } else if (eye === 'shock') {
      x.fillStyle = '#fffdf6'; x.beginPath(); x.ellipse(33, -60, 8.5, 9.5, 0, 0, TAU); x.fill(); x.lineWidth = 2.2; x.stroke();
      x.fillStyle = C.inkD; x.beginPath(); x.arc(35, -59, 4.2, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(46, -17, 4.5, 5.5, 0, 0, TAU); x.fill();
    } else if (eye === 'down') {   // a heavy lid, looking down
      x.fillStyle = C.inkD; x.beginPath(); x.ellipse(34, -55, 3.8, 3, 0, 0, TAU); x.fill();
      x.beginPath(); x.moveTo(26, -60); x.quadraticCurveTo(34, -64, 41, -59); x.stroke();
      x.beginPath(); x.moveTo(40, -17); x.quadraticCurveTo(45, -20, 50, -17); x.stroke();
    } else if (eye === 'happy') {
      x.beginPath(); x.arc(33, -55, 6, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
      x.beginPath(); x.arc(44, -22, 6, .3, Math.PI - .3); x.stroke();
    } else if (eye === 'up') {   // wide, looking up: the pupil high in the eye, a small open "o"
      x.fillStyle = '#fffdf6'; x.beginPath(); x.ellipse(34, -60, 6.5, 8, 0, 0, TAU); x.fill(); x.lineWidth = 2; x.stroke();
      x.fillStyle = C.inkD; x.beginPath(); x.arc(36, -64, 3.8, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(45, -19, 3.4, 4.2, 0, 0, TAU); x.fill();
    } else {
      x.fillStyle = C.inkD; x.beginPath(); x.ellipse(33, -58, 4.2, 5.4, 0, 0, TAU); x.fill();
      x.beginPath(); x.arc(44, -21, 5, .4, Math.PI - .6); x.stroke();
    }
    x.fillStyle = pal.bl; x.globalAlpha *= .65; x.beginPath(); x.ellipse(22, -30, 11, 7, 0, 0, TAU); x.fill();
  }
  // sweat(ctx, x, y, k): a picture-book sweat drop
  function sweat(x, px, py, k = 1) {
    const p = new Path2D(); p.moveTo(px, py - 14 * k); p.quadraticCurveTo(px + 9 * k, py, px, py + 5 * k); p.quadraticCurveTo(px - 9 * k, py, px, py - 14 * k);
    x.fillStyle = C.sweat; x.fill(p); x.strokeStyle = C.sweatL; x.lineWidth = 2; x.stroke(p);
  }
  // drawBear(ctx, F, mid?, back?): back() draws before the body (e.g. a load carried behind), mid() between the body/head and
  // the near arm (a held object: the near paw closes over it). Order: back → far arm (unless farFront) → legs → body → head → mid
  // → far arm (if farFront) → near arm.
  function drawBear(ctx, F, mid, back) {
    const s = F.s, f = F.f, pal = F.pal, al = F.alpha ?? 1; if (al <= 0) return;
    const { P: Pt } = frame(F);
    ctx.save(); ctx.globalAlpha = al;
    if (F.sq && F.sq !== 1) { ctx.translate(F.hip[0], F.gy); ctx.scale(1 / Math.sqrt(F.sq), F.sq); ctx.translate(-F.hip[0], -F.gy); }
    const sh = Pt(6, 100), shF = Pt(-4, 98);
    const elbowPick = (a, b) => (a[1] - f * a[0] * .35) > (b[1] - f * b[0] * .35) ? a : b, kneePick = (a, b) => f * a[0] > f * b[0] ? a : b;
    const limb = (pts, w, fill, line) => { const p = linePath(pts, false); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = line; ctx.lineWidth = w + 5.5 * s; ctx.stroke(p); ctx.strokeStyle = fill; ctx.lineWidth = w; ctx.stroke(p);
      ctx.save(); ctx.globalAlpha *= .4; ctx.strokeStyle = PAT.grain; ctx.lineWidth = w - 3; ctx.stroke(p); ctx.restore(); };
    const paw = (hd, an, type, fill) => {
      const p = new Path2D();
      if (type === 'flat') p.ellipse(hd[0] + f * 4 * s, hd[1] - 2 * s, 15 * s, 9.5 * s, 0, 0, TAU);
      else p.ellipse(hd[0], hd[1], 13 * s, 12 * s, an, 0, TAU);
      fillPencil(ctx, p, fill, { grain: .35 }); pencil(ctx, p, pal.l, 2.4 * s);
      ctx.strokeStyle = pal.l; ctx.lineWidth = 2 * s; ctx.lineCap = 'round';
      if (type === 'grip' || type === 'fist') {   // the thumb wrapped over the handle / post
        const q = an - f * 1.9; ctx.beginPath(); ctx.arc(hd[0] + Math.cos(q) * 4 * s, hd[1] + Math.sin(q) * 4 * s, 7 * s, q - 1.2, q + 1.2); ctx.stroke(); }
      else if (type === 'open') { for (let i = -1; i <= 1; i++) { const q = an + i * .45; ctx.beginPath(); ctx.moveTo(hd[0] + Math.cos(q) * 7 * s, hd[1] + Math.sin(q) * 7 * s); ctx.lineTo(hd[0] + Math.cos(q) * 12 * s, hd[1] + Math.sin(q) * 12 * s); ctx.stroke(); } }
    };
    const arm = (S0, T, far, type) => {
      if (!T) T = [S0[0] - f * 8 * s, S0[1] + 92 * s];
      const [el, hd] = ik(S0, T, 50 * s, 48 * s, elbowPick);
      limb([S0, el, hd], 21 * s, far ? pal.d : pal.f, pal.l);
      paw(hd, Math.atan2(hd[1] - el[1], hd[0] - el[0]), type, far ? pal.d : pal.f);
    };
    const leg = (T, far) => {
      const hp = Pt(far ? -10 : 4, 8), ank = [T[0], T[1] - 9 * s];
      const [kn, an] = ik(hp, ank, 58 * s, 54 * s, kneePick);
      limb([hp, kn, an], 27 * s, far ? pal.d : pal.f, pal.l);
      const lift = Math.max(0, F.gy - T[1]), toe = lift > 6 * s ? .35 : 0, p = new Path2D();
      ctx.save(); ctx.translate(an[0], an[1] + 1 * s); ctx.scale(f, 1); ctx.rotate(toe);
      p.ellipse(8 * s, 2 * s, 20 * s, 11 * s, 0, 0, TAU); fillPencil(ctx, p, far ? pal.d : pal.f, { grain: .35 }); pencil(ctx, p, pal.l, 2.4 * s);
      ctx.restore();
    };
    if (back) back();
    if (!F.farFront) arm(shF, F.hands[0], true, F.hand?.[0] || 'fist');
    leg(F.feet[0], true); leg(F.feet[1], false);
    // body
    ctx.save(); ctx.translate(F.hip[0], F.hip[1]); ctx.rotate(F.ang); ctx.scale(f * s, s);
    fillPencil(ctx, BEAR.tail, pal.f, { grain: .35 }); pencil(ctx, BEAR.tail, pal.l, 2.4);
    fillPencil(ctx, BEAR.body, pal.f, { shade: 'rgba(160,110,60,.22)', shadeDir: [.9, 0, .1, 1], bbox: [-45, -121, 40, 22] }); pencil(ctx, BEAR.body, pal.l, 2.8);
    ctx.save(); ctx.globalAlpha *= .75; fillPencil(ctx, BEAR.belly, pal.mz, { grain: .3 }); ctx.restore();
    ctx.restore();
    // head
    const N = Pt(8, 116), tilt = F.ang + f * (F.tilt || 0);
    ctx.save(); ctx.translate(N[0], N[1]); ctx.rotate(tilt); ctx.scale(f * s, s);
    for (const e of [BEAR.earB, BEAR.earF]) { fillPencil(ctx, e, pal.f, { grain: .35 }); pencil(ctx, e, pal.l, 2.6); }
    ctx.fillStyle = pal.in; ctx.globalAlpha *= .8; ctx.beginPath(); ctx.arc(-30, -78, 8, 0, TAU); ctx.arc(23, -85, 8, 0, TAU); ctx.fill(); ctx.globalAlpha = al;
    fillPencil(ctx, BEAR.head, pal.f, { shade: 'rgba(160,110,60,.18)', shadeDir: [.9, 0, .2, 1], bbox: [-50, -93, 60, 7] }); pencil(ctx, BEAR.head, pal.l, 2.8);
    fillPencil(ctx, BEAR.muzzle, pal.mz, { grain: .3 }); pencil(ctx, BEAR.muzzle, pal.l, 2.2);
    ctx.save(); drawFace(ctx, F, pal); ctx.restore();
    if (F.sweat) { ctx.globalAlpha = al * F.sweat; sweat(ctx, -6, -104 - 6 * (1 - F.sweat), 1.1); if (F.eye === 'shock') sweat(ctx, -46, -88, .9); ctx.globalAlpha = al; }
    ctx.restore();
    if (mid) mid();
    if (F.farFront) arm(shF, F.hands[0], true, F.hand?.[0] || 'fist');
    arm(sh, F.hands[1], false, F.hand?.[1] || 'fist');
    ctx.restore();
  }
  // bearShadow(ctx, F, a): a soft contact shadow under the feet (optional; the film draws none)
  P.bearShadow = (ctx, F, a = .18) => { ctx.save(); ctx.globalAlpha = (F.alpha ?? 1) * a; ctx.fillStyle = '#5c7a4e'; ctx.beginPath(); ctx.ellipse(F.hip[0], F.gy + 4 * F.s, 52 * F.s, 9 * F.s, 0, 0, TAU); ctx.fill(); ctx.restore(); };

  // ---- poses (all return a fresh F; set F.pal yourself, or pass o.pal)
  // walkSpec(x, gy, s, f, ph (step phase, 1 = one full cycle), stride px, lean rad, lift px, bounce px): walk/run cycle
  function walkSpec(x, gy, s, f, ph, stride, lean, lift = 14, bounce = 4) {
    const feet = [0, 1].map(i => { const p = frac(ph + i * .5); let off, up = 0;
      if (p < .58) off = stride * (.29 - p); else { const u = (p - .58) / .42; off = -.29 * stride + .58 * stride * eio(u); up = lift * Math.sin(Math.PI * u); }
      return [x + f * off * s, gy - up * s]; });
    const hipH = (P.HIPH - 3 - bounce + bounce * 2 * Math.abs(Math.sin(TAU * ph))) * s;
    return { s, f, gy, hip: [x, gy - hipH], ang: f * lean, feet, hands: [null, null], hand: ['fist', 'fist'], tilt: 0, eye: 'calm', ph };
  }
  // standSpec(x, gy, s, f, lean): standing, feet apart, arms hanging
  function standSpec(x, gy, s, f, lean = .05) { return { s, f, gy, hip: [x, gy - P.HIPH * s], ang: f * lean, feet: [[x - f * 12 * s, gy], [x + f * 16 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: 0, eye: 'calm' }; }
  // hangHands(F, swing px) → [far, near] hand targets hanging at the sides (an arm swing of ±swing)
  function hangHands(F, swing = 0) { const sh = shoulderOf(F); return [[sh[0] - F.f * (8 + swing) * F.s, sh[1] + 92 * F.s], [sh[0] - F.f * (8 - swing) * F.s, sh[1] + 92 * F.s]]; }
  // hangGrip(F, sw) → a hand target a little in front of the hip (carrying a small thing: a tool, a lantern, a seed bag)
  const hangGrip = (F, sw = 0) => { const sh = shoulderOf(F); return [sh[0] + F.f * (14 + sw) * F.s, sh[1] + 80 * F.s]; };
  // mixSpec(A, B, k): in-between two poses (positions lerp; hand types / face / f switch at k = .5; null hands = hanging)
  function mixSpec(A, Bs, k) {
    if (k <= 0) return A; if (k >= 1) return Bs;
    const l2 = (a, b) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], hA = hangHands(A), hB = hangHands(Bs);
    const pick = k < .5 ? A : Bs;
    return { ...pick, s: lerp(A.s, Bs.s, k), gy: lerp(A.gy, Bs.gy, k), hip: l2(A.hip, Bs.hip), ang: lerp(A.ang, Bs.ang, k), feet: [l2(A.feet[0], Bs.feet[0]), l2(A.feet[1], Bs.feet[1])],
      hands: [0, 1].map(i => l2(A.hands[i] || hA[i], Bs.hands[i] || hB[i])), hand: pick.hand.slice(), tilt: lerp(A.tilt || 0, Bs.tilt || 0, k), sweat: lerp(A.sweat || 0, Bs.sweat || 0, k),
      ...(A.sq || Bs.sq ? { sq: lerp(A.sq || 1, Bs.sq || 1, k) } : {}) };
  }
  // crouchSpec(x, gy, s, f, o): bent low over the ground in front (hip 46 px up, torso ~70° forward) — to pick up / work on something
  const crouchSpec = (x, gy, s, f, o = {}) => ({ ...standSpec(x, gy, s, f), hip: [x, gy - (o.hipH ?? 46) * s], ang: f * (o.lean ?? 1.25), feet: [[x + f * 30 * s, gy], [x - f * 48 * s, gy]], tilt: o.tilt ?? -.3, eye: o.eye || 'calm' });
  // kneelSpec(x, gy, s, f, o): one knee down (near leg folded under, far foot planted ahead), torso a little forward
  const kneelSpec = (x, gy, s, f, o = {}) => ({ ...standSpec(x, gy, s, f), hip: [x, gy - (o.hipH ?? 64) * s], ang: f * (o.lean ?? .28), feet: [[x + f * 40 * s, gy], [x - f * 52 * s, gy]], tilt: o.tilt ?? .15, eye: o.eye || 'calm' });
  // lookUp(F, k): tip the head back (k 0–1) and widen the eyes; leans the torso back a little
  const lookUp = (F, k = 1) => ({ ...F, tilt: lerp(F.tilt || 0, -.42, k), ang: F.ang - F.f * .08 * k, eye: k > .5 ? 'up' : F.eye });
  // reach(F, far, near, types): hands to world grip points (null = hang); the arm comes from the shoulder, the paw lands AT the
  // point if it's within 98·s of the shoulder (else it stops short — move the body, don't stretch)
  const reach = (F, far, near, types) => ({ ...F, hands: [far, near], hand: types || ['fist', 'fist'] });
  // turn(A, B, k): turn around between two poses (B usually has the other f) with a squash at the middle
  const turn = (A, Bs, k) => { const F = mixSpec(A, Bs, k); if (k > 0 && k < 1) F.sq = 1 - .08 * Math.sin(Math.PI * k); return F; };
  Object.assign(P, { ik, frame, shoulderOf, drawFace, sweat, drawBear, walkSpec, standSpec, hangHands, hangGrip, mixSpec, crouchSpec, kneelSpec, lookUp, reach, turn, BEAR });

  // ---- long objects held by a bear (a beam, a cross, a staff, a plank). X = { x, y, a } = the object's foot (u = 0) and angle;
  //      points along it: cpt(X, u along, v across) → world point.
  const cpt = (X, u, v = 0) => [X.x + Math.cos(X.a) * u - Math.sin(X.a) * v, X.y + Math.sin(X.a) * u + Math.cos(X.a) * v];
  // carryLong(F, a0, {w, contact}) → X: on the shoulder — the point `contact` (px from the foot) rests on top of the shoulder,
  // the object rising ahead at angle a0 (rad, negative = up toward the facing side). Then put the paws on it with gripLong.
  function carryLong(F, a0, o) {
    const fr = frame(F), T = fr.P(2, 116), w = o.w ?? 34;
    const a = F.f > 0 ? a0 : Math.PI - a0, d = [Math.cos(a), Math.sin(a)]; let n = [d[1], -d[0]]; if (n[1] > 0) n = [-n[0], -n[1]];
    return { x: T[0] + n[0] * w / 2 - d[0] * o.contact, y: T[1] + n[1] * w / 2 - d[1] * o.contact, a, contact: o.contact };
  }
  // gripLong(F, X, [uFar, vFar], [uNear, vNear], types) → F with both paws ON the object at those (u, v) points
  const gripLong = (F, X, gf, gn, types = ['fist', 'fist']) => { F.hands = [cpt(X, gf[0], gf[1] || 0), cpt(X, gn[0], gn[1] || 0)]; F.hand = types; return F; };
  // holdFront(F, len, o) → X: held level in front of the belly with both paws (u ≈ len/2 ± 14·s); o.dy raises it
  function holdFront(F, len, o = {}) { const sh = shoulderOf(F), X = { x: sh[0] - F.f * len / 2 + F.f * 40 * F.s, y: sh[1] + (64 - (o.dy || 0)) * F.s, a: F.f > 0 ? 0 : Math.PI };
    if (F.f < 0) X.x = sh[0] + len / 2 - 40 * F.s; gripLong(F, X, [len / 2 + 16 * F.s, 4], [len / 2 - 16 * F.s, 6]); return X; }
  // holdUpright(F, len, o) → X: standing on the ground beside the near foot (a staff / signpost), near paw at shoulder height
  function holdUpright(F, len, o = {}) { const X = { x: F.hip[0] + F.f * (o.dx ?? 34) * F.s, y: F.gy, a: -Math.PI / 2 }; const sh = shoulderOf(F);
    F.hands = [F.hands[0], [X.x, sh[1] + 30 * F.s]]; F.hand = [F.hand[0], 'fist']; return X; }
  const mixX = (A, Bx, k) => k <= 0 ? A : k >= 1 ? Bx : { ...Bx, x: lerp(A.x, Bx.x, k), y: lerp(A.y, Bx.y, k), a: lerp(A.a, Bx.a, k), u0: Bx.u0, lie: k > .62 ? Bx.lie : A.lie };
  function rotAbout(X, pv, th) { const ox = X.x - pv[0], oy = X.y - pv[1]; return { ...X, x: pv[0] + ox * Math.cos(th) - oy * Math.sin(th), y: pv[1] + ox * Math.sin(th) + oy * Math.cos(th), a: X.a + th }; }
  Object.assign(P, { cpt, carryLong, gripLong, holdFront, holdUpright, mixX, rotAbout });

  /* ---------------------------------------------------------------- wood: a cross / beam in coloured pencil */
  // D = dims {L post length, PW post width, CBX crossbar centre (from the foot), CBW crossbar thickness, CBH / CBHL crossbar
  // half-length upright / lying (foreshortened)}; CBX: null = a plain beam (no crossbar). Sprites are drawn at KX = 2.
  P.CROSS = { L: 520, PW: 34, CBX: 408, CBW: 32, CBH: 94, CBHL: 40 };
  const KX = 2, CPAD = 14;
  // crossPts(hb, D) → outline points (foot at 0, along +x); hb = crossbar half-length
  P.crossPts = (hb, D = P.CROSS) => { const { L, PW, CBX, CBW } = D; if (CBX == null) return [[0, -PW / 2], [L, -PW / 2], [L, PW / 2], [0, PW / 2]];
    return [[0, -PW / 2], [CBX - CBW / 2, -PW / 2], [CBX - CBW / 2, -hb], [CBX + CBW / 2, -hb], [CBX + CBW / 2, -PW / 2], [L, -PW / 2], [L, PW / 2],
    [CBX + CBW / 2, PW / 2], [CBX + CBW / 2, hb], [CBX - CBW / 2, hb], [CBX - CBW / 2, PW / 2], [0, PW / 2]]; };
  // crossSprite(pal (P.XME / P.XPIL), lying, seed, D) → {c, sh (soft cast shadow), hb, pal, D}: wood with grain lines, knots, nails;
  // lying = seen from above on the ground (a front face below, crossbar foreshortened)
  P.crossSprite = function (pal, lying, seed, D = P.CROSS) {
    const { L, PW, CBX, CBW, CBH, CBHL } = D, bar = CBX != null;
    const hb = bar ? (lying ? CBHL : CBH) : PW / 2, w = (L + 2 * CPAD) * KX, h = (2 * hb + 2 * CPAD) * KX, c = Pilot.canvas(w, h), g = c.getContext('2d');
    g.setTransform(KX, 0, 0, KX, CPAD * KX, (hb + CPAD) * KX);
    const p = smooth(rough(P.crossPts(hb, D), 1.3, seed, 7)), r = rng(seed), gS = P.grainScaled(KX);
    if (lying) { g.save(); g.translate(0, 9); fillPencil(g, p, pal.g, { pat: gS, grain: .4 }); pencil(g, p, pal.l, 2.4); g.restore(); }   // the plank's front face below its top
    fillPencil(g, p, pal.f, { pat: gS, grain: .55 });
    g.save(); g.clip(p);
    // shading: light along the top edges, darker along the bottom edges
    g.fillStyle = pal.h; g.globalAlpha = .7; g.fillRect(-2, -PW / 2, L + 4, 7); if (bar) g.fillRect(CBX - CBW / 2, -hb, 7, 2 * hb);
    g.fillStyle = pal.g; g.globalAlpha = .35; g.fillRect(-2, PW / 2 - 7, L + 4, 8); if (bar) g.fillRect(CBX + CBW / 2 - 7, -hb, 8, 2 * hb);
    // wood grain: long wavy pencil lines along the post, short ones down the crossbar, two knots
    g.globalAlpha = .75; g.strokeStyle = pal.g; g.lineWidth = 1.5; g.lineCap = 'round';
    for (const v of [-9, -2, 6, 11]) { g.beginPath(); let started = false;
      for (let u = 4; u <= L - 4; u += 8) { if (bar && Math.abs(u - CBX) < CBW / 2 + 2) { started = false; continue; } const y = v + Math.sin(u * .021 + v) * 2.2 + Math.sin(u * .07 + seed) * .8;
        if (!started) { g.moveTo(u, y); started = true; } else g.lineTo(u, y); }
      g.stroke(); }
    if (bar) for (const u of [-10, -3, 5, 11]) { g.beginPath(); for (let v = -hb + 4; v <= hb - 4; v += 8) { if (Math.abs(v) < PW / 2 + 2) { g.stroke(); g.beginPath(); continue; } g.lineTo(CBX + u + Math.sin(v * .05 + u) * 1.6, v); } g.stroke(); }
    for (const [ku, kv] of [[110 + r() * 40, 3], [260 + r() * 60, -4]]) { g.beginPath(); g.ellipse(ku, kv, 9, 4.2, 0, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(ku, kv, 4, 1.8, 0, 0, TAU); g.stroke(); }
    g.restore();
    pencil(g, p, pal.l, 2.6);
    // two nail heads at the crossing
    if (bar) { g.fillStyle = pal.l; for (const dv of [-7, 7]) { g.beginPath(); g.arc(CBX + (dv > 0 ? 3 : -3), dv, 2.6, 0, TAU); g.fill(); } }
    // the cast shadow: a soft tinted silhouette (used when it lies on the ground)
    const sh = Pilot.canvas(w + 24, h + 24), sg = sh.getContext('2d'); sg.filter = 'blur(5px)'; sg.drawImage(c, 12, 12); sg.filter = 'none';
    sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgba(120,120,70,.42)'; sg.fillRect(0, 0, sh.width, sh.height);
    return { c, sh, hb, pal, D };
  };
  // drawCross(ctx, X sprite, u0, u1, x, y, a, alpha, shadow): the material [u0, u1] (px along the post) with the foot at (x, y),
  // angle a; a cut end gets an end-grain face; shadow (0–1) draws the soft cast shadow under it (for lying wood)
  P.drawCross = function (ctx, X, u0, u1, x, y, a, alpha = 1, shadow = 0) {
    const { L, PW } = X.D;
    if (u1 - u0 < .5 || alpha <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha *= alpha;
    const hb = X.hb, dh = 2 * hb + 2 * CPAD, left = u0 <= .5 ? -CPAD : u0, right = u1 >= L - .5 ? L + CPAD : u1;
    if (shadow) { ctx.save(); ctx.rotate(-a); ctx.translate(2, 9); ctx.rotate(a); ctx.globalAlpha *= shadow;
      ctx.drawImage(X.sh, (left + CPAD) * KX + 12, 12, (right - left) * KX, dh * KX, left, -hb - CPAD, right - left, dh); ctx.restore(); }
    ctx.drawImage(X.c, (left + CPAD) * KX, 0, (right - left) * KX, dh * KX, left, -hb - CPAD, right - left, dh);
    for (const [u, k] of [[u0, 1], [u1, -1]]) { if ((k > 0 && u <= .5) || (k < 0 && u >= L - .5)) continue;
      ctx.fillStyle = X.pal.end; ctx.fillRect(u - (k > 0 ? 0 : 4), -PW / 2 + 1, 4, PW - 2);
      ctx.strokeStyle = X.pal.l; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(u + k * .5, -PW / 2 + 1); ctx.lineTo(u + k * .5 + .8, PW / 2 - 1); ctx.stroke();
      ctx.lineWidth = 1.2; ctx.globalAlpha *= .6; ctx.beginPath(); ctx.arc(u + k * 2, 0, 6, -1, 1); ctx.stroke(); ctx.globalAlpha /= .6; }
    ctx.restore();
  };

  /* ---------------------------------------------------------------- effects (picture-book marks) */
  // sparkles(ctx, x, y, r0, k alpha, t, n, seed): "glow" ticks on an upper arc around (x, y) — the warm-light sign of the style
  P.sparkles = function (ctx, x, y, r0, k, t, n = 6, seed = 0) {
    if (k <= 0) return; ctx.save(); ctx.strokeStyle = `rgba(232,166,70,${k})`; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const tw = t12(t); for (let i = 0; i < n; i++) { const a = -Math.PI * (.05 + i * .9 / (n - 1)) + seed, rr = r0 + (i % 2) * 8 + Math.sin(tw * 6 + i + seed) * 3;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); ctx.lineTo(x + Math.cos(a) * (rr + 16), y + Math.sin(a) * (rr + 16)); ctx.stroke(); }
    ctx.restore();
  };
  // warmGlow(ctx, x, y, R, a): a soft round screen glow of the accent light (alpha a at the centre)
  P.warmGlow = function (ctx, x, y, R, a) {
    if (a <= 0) return; const g = ctx.createRadialGradient(x, y, 8, x, y, R);
    g.addColorStop(0, `rgba(255,222,150,${a})`); g.addColorStop(.5, `rgba(255,214,140,${a * .33})`); g.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(x - R, y - R, 2 * R, 2 * R); ctx.restore();
  };
  // chips(ctx, t, list): little pencil-outlined chips flung out and landing (sawdust, crumbs, soil). Each item:
  // { t0, x, y, vx, vy, land (y where it stops), r0, vr, sz, col, line } — gravity 700 px/s², fade 1.2–1.8 s after t0
  P.chips = function (ctx, t, list) {
    for (const q of list) {
      const u = t - q.t0; if (u < 0) continue; const al = 1 - ss(q.t0 + 1.2, q.t0 + 1.8, t); if (al <= 0) continue;
      const tl = (-q.vy + Math.sqrt(q.vy * q.vy + 4 * 700 * (q.land - q.y))) / 1400, uu = Math.min(u, Math.max(0, tl));
      const x = q.x + q.vx * uu, y = q.y + q.vy * uu + 700 * uu * uu, r = q.r0 + q.vr * uu;
      ctx.save(); ctx.globalAlpha = al; ctx.translate(x, y); ctx.rotate(r);
      ctx.fillStyle = q.col; ctx.strokeStyle = q.line; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(0, 0, q.sz, q.sz * .6, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  };
  // snapTicks(ctx, t, at, cx, cy, col): five pencil impact ticks above (cx, cy) for .25 s after `at` (a snap, a click, a pop)
  P.snapTicks = function (ctx, t, at, cx, cy, col = P.XME.l) {
    if (t < at || t >= at + .25) return;
    const k = (t12(t) - at) / .25; ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.globalAlpha = 1 - k;
    for (let i = 0; i < 5; i++) { const a = -Math.PI * (.1 + i * .2), r0 = 30 + k * 16; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * (r0 + 16), cy + Math.sin(a) * (r0 + 16)); ctx.stroke(); }
    ctx.restore();
  };
  // hit(ctx, t, at, cx, cy, o): THE HIT — dust curls rolling off both sides and a burst of long pencil ticks (.9 s). o.col dust, o.tick ticks
  P.hit = function (ctx, t, at, cx, cy, o = {}) {
    if (t < at || t >= at + .9) return;
    const k = (t12(t) - at) / .9; ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = o.col || C.earthL; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const px = cx + s * (40 + k * 70 + i * 18), py = cy - 6 - i * 12 - k * 18; ctx.beginPath(); ctx.arc(px, py, 8 + i * 2, s > 0 ? Math.PI : 0, s > 0 ? Math.PI * 2.4 : Math.PI * 1.4, s < 0); ctx.stroke(); }
    if (k < .45) { ctx.strokeStyle = o.tick || P.XME.l; for (let i = 0; i < 7; i++) { const a = -Math.PI * (.08 + i * .14); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 70, cy + Math.sin(a) * 60); ctx.lineTo(cx + Math.cos(a) * 104, cy + Math.sin(a) * 92); ctx.stroke(); } }
    ctx.restore();
  };
  // speedLines(ctx, t, x, y, k): three wobbling pencil speed ticks trailing left of (x, y) (k = alpha; mirror with ctx.scale for leftward runs)
  P.speedLines = function (ctx, t, x, y, k) {
    if (k <= 0) return; const tw = t12(t); ctx.save(); ctx.strokeStyle = C.ink; ctx.lineCap = 'round'; ctx.lineWidth = 3.6; ctx.globalAlpha = .8 * k;
    for (let i = 0; i < 3; i++) { const yy = y - i * 46, l = 50 + 24 * Math.sin(tw * 9 + i * 2), x0 = x - 30 - i * 14; ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 - l, yy); ctx.stroke(); } ctx.restore();
  };
  // dust(ctx, t, steps, gy): a puff at each footfall {t, x} for .55 s (drifting back), on the ground line gy
  P.dust = function (ctx, t, steps, gy) {
    for (const q of steps) { const u = t - q.t; if (u < 0 || u > .55) continue; const r = 24 + u * 70; ctx.save(); ctx.globalAlpha = (1 - u / .55); ctx.drawImage(P.puff, q.x - 30 - u * 60 - r, gy - 10 - r * 1.3, r * 2, r * 2); ctx.restore(); }
  };
  // dashedOutline(ctx, path, t, o): a crawling dashed pencil outline (a "should be here" ghost), o = {col, w, fill, dash, speed}
  P.dashedOutline = function (ctx, path, t, o = {}) {
    ctx.save(); if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(path); }
    ctx.setLineDash(o.dash || [14, 10]); ctx.lineDashOffset = -t * (o.speed ?? 16); ctx.lineCap = 'round'; ctx.lineWidth = o.w || 4; ctx.strokeStyle = o.col || P.XME.l; ctx.stroke(path); ctx.setLineDash([]);
    ctx.restore();
  };

  /* ---------------------------------------------------------------- camera */
  // a camera is { x, y, z, sx, sy }: world point at the frame centre, zoom, shake px. mixCam lerps two (ignores shake).
  P.mixCam = (a, b, k) => k <= 0 ? a : k >= 1 ? b : { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
  // layer(ctx, cm, p, fn): run fn with the world transform of parallax depth p (1 = the world, < 1 = farther, > 1 = foreground)
  P.layer = function (ctx, cm, p, fn) { const z = 1 + (cm.z - 1) * p, cx = cm.x * p, cy = H / 2 + (cm.y - H / 2) * p; ctx.save(); ctx.setTransform(z, 0, 0, z, W / 2 - cx * z + (cm.sx || 0) * p, H / 2 - cy * z + (cm.sy || 0) * p); fn(z); ctx.restore(); };
  // shakeAt(t, at, dur, ax, ay) → [sx, sy]: the hit's camera shake, decaying over dur
  P.shakeAt = (t, at, dur = .55, ax = 15, ay = 11) => { const k = 1 - ss(at, at + dur, t); return t >= at ? [ax * k * Math.sin(t * 97), ay * k * Math.sin(t * 131 + 1)] : [0, 0]; };
  // crashZoom(cm, t, at, target, dur): snap the camera to target over .09 s at `at` (the hit), then ease back over dur from at + .65
  P.crashZoom = (cm, t, at, target, back) => { let c = cm; if (t >= at) c = P.mixCam(c, target, eo((t - at) / .09)); if (back && t >= at + .65) c = P.mixCam(c, back, eio((t - at - .65) / .7)); return c; };

  /* ---------------------------------------------------------------- post + words */
  // paperPass(ctx, cm): paper tooth + soft warm unevenness over everything, locked to the world so it never crawls on a move
  P.paperPass = function (ctx, cm) {
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = .55;
    PAT.paper.setTransform(new DOMMatrix([cm.z, 0, 0, cm.z, W / 2 - cm.x * cm.z + (cm.sx || 0), H / 2 - cm.y * cm.z + (cm.sy || 0)])); ctx.fillStyle = PAT.paper; ctx.fillRect(0, 0, W, H); ctx.restore();
  };
  // endPlate(ctx, t, at): a cream page laid over the picture from at − .15 (wobbly pencil frame, three daisies) — under the end card
  P.endPlate = function (ctx, t, at) {
    const k = eo((t - (at - .15)) / .45); if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = '#f8f0dc'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = k * .5; ctx.fillStyle = PAT.grain; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = k; pencil(ctx, P.frame, C.ink, 3);
    flower(ctx, 150, 1352, 26, 1.3, C.flowerW, -.12); flower(ctx, 190, 1360, 18, 1, C.flowerP, .1); flower(ctx, 900, 1352, 22, 1.15, C.flowerP, .1);
    ctx.restore();
  };
  const PLATES = new Map();
  // capPlates(ctx, t, lines, o): a cream paper slip behind each caption (soft pencil edge) so words stay clear over clouds/meadow
  P.capPlates = function (ctx, t, lines, o = {}) {
    const Y = o.y ?? 410, size = o.size ?? 74;
    lines.forEach(([a, b, str, src], i) => {
      const al = Pilot.win(t, a, b, .35, .45); if (al <= 0) return;
      const key = i + '|' + str + '|' + (src || '') + '|' + Y;
      if (!PLATES.has(key)) { const ls = Pilot.tr(str).split('\n'), mc = Pilot.canvas(4, 4).getContext('2d'); mc.font = `400 ${size}px ${P.FONT}`;
        let w = Math.max(...ls.map(l => mc.measureText(l).width)); if (src) { mc.font = "400 28px 'Noto Sans KR'"; w = Math.max(w, mc.measureText(Pilot.tr(src)).width); }
        w = Math.min(980, w + 90); const top = Y - size - 22, bot = Y + (ls.length - 1) * size * 1.55 + 34 + (src ? 76 : 0);
        PLATES.set(key, smooth(rough([[W / 2 - w / 2, top], [W / 2 + w / 2, top], [W / 2 + w / 2, bot], [W / 2 - w / 2, bot]], 6, 30 + i, 26))); }
      const pl = PLATES.get(key);
      ctx.save(); ctx.globalAlpha = al * .8; ctx.fillStyle = '#fffaf0'; ctx.fill(pl); ctx.globalAlpha = al * .35; pencil(ctx, pl, C.ink, 2.4); ctx.restore();
    });
  };
  // captions(ctx, t, lines, o): paper slips + hand-lettered Gamja Flower captions at y = 410 (o overrides Story.captions options)
  P.captions = function (ctx, t, lines, o = {}) {
    P.capPlates(ctx, t, lines, o);
    Story.captions(ctx, t, lines, { font: P.FONT, weight: 400, size: 74, color: '#4e3324', srcColor: '#5a3c2c', y: 410, shadow: 'rgba(255,252,240,1)', shadowBlur: 14, ...o });
  };
  // endCard(ctx, t, card, at, o): the end card on the cream page (title in Gamja Flower, credits in Noto Sans KR), y = 860
  P.endCard = (ctx, t, card, at, o = {}) => Story.endCard(ctx, t, card, at, { font: P.FONT, srcFont: P.SANS, color: '#4a3022', srcColor: '#5a3c2c', y: 860, titleShadow: 'rgba(255,252,240,.95)', ...o });

  window.Pastelbook = P;
})();

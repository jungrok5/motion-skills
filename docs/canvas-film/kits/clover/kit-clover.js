/* kit-clover.js — house style "pastel clover picnic (watercolour + coloured pencil)" for word-log films (global: window.Clover).
   Every shape is a transparent wash on cold-press paper: flat colour with soft blooms, pigment pooled darker at the edges,
   a thin broken coloured-pencil contour in a darker shade of itself. Depth by softness and value: pale blurred clover far,
   crisp saturated leaves near. Big three-leaf clovers with pale chevrons, white clover flower balls, grass blades, violets.
   The cast are round little hamsters (an orange "me", pale grey/cream others), rigged with 2-bone IK (fixed bone lengths).
   One accent: honey-gold wood and warm sunlight (a willow arch with a sunbeam pouring through, motes, a glow).
   Figures pose on twos (12 fps, `t12`); the camera moves on ones.
   First film: sermons/2026-10-24-cross-styles/film/scenes/cs-clover.html (잘라 낸 건 다리였다 · 11, the worked example).
   Style card: styles/clover/STYLE.md. Template: styles/clover/template.html.

   HOW A FRAME IS MADE (world px: the 1080×1920 frame at zoom 1; the sandy path between y ≈ 1204 and 1352)
     ctx.fillStyle = K.C.sky1; ctx.fillRect(0, 0, W, H);
     K.layer(ctx, cm, .1, () => K.drawSheet(ctx, sky)); .32 far meadow; .55 K.drawTall; .72 mid clover band;
     K.layer(ctx, cm, 1, () => { gully, brook, ground, K.drawDapple, arch.back → figures inside → arch.front, figures, props });
     K.layer(ctx, cm, 1.18, () => K.drawFore(ctx, t, fore));        swaying foreground clover (a ladybug on one)
     K.warmWash → K.flash → K.endPlate → K.paperPass → K.captions → K.endCard
   cm = { x, y, z, sx, sy }. Static scenery is built once on sheets; builders that scatter things take an rng `r` so a scene
   can share ONE random stream across them (call them in the same order every time). Pure functions of their arguments;
   seeded randomness only; no network, no images. Load after lib.js and story.js; call K.init() first in the scene's init(). */
(function () {
  const { clamp, lerp, ss, eo, eio, rng, noise } = Pilot;
  const TAU = Math.PI * 2;
  const K = {}, TX = {};
  let W = 1080, H = 1920;

  /* ---------------------------------------------------------------- palette, cast colours, type */
  K.C = {
    sky0: '#b9e0dc', sky1: '#e9f3d6', far: '#a3d38c', farL: '#86bd76', mid: '#79c164', midL: '#4f9a4a', near: '#66b558', nearL: '#3f8a40', deep: '#55a64f',
    chev: 'rgba(232,248,210,.55)', blade: '#8cc67a', bladeL: '#5d9a58', stem: '#9ccc86', flower: '#fdfdf8', flowerL: '#c6cdb9', flowerC: '#dfe6c8',
    path: '#efe2c2', pathD: '#dcc59a', pathL: '#b89a6e', earth: '#caa47a', earthD: '#9b7651', earthL: '#6f5238', water: '#a7d4dd', waterD: '#6fa7b6', waterL: '#effaf6',
    gold: '#ebb35a', goldD: '#c27f2c', goldL: '#8f5d24', xw: '#cdc6b7', xwD: '#a49b8a', xwL: '#7b7366',
    saw: '#c4c9d0', sawL: '#7c838e', handle: '#c48a55', handleL: '#8a5a32', warm: '#ffd88a', ink: '#5f7f52', inkD: '#335a2c', twig: '#a9825c', twigL: '#6f523a',
  };
  const C = K.C;
  // hamsters: ham fur, hamD ears/far limbs, hamL outline, belly, pink paws/inner ear, nose, edge (pigment pooled at the rim)
  K.PAL = {
    me: { ham: '#f3bf8a', hamD: '#e3a46e', hamL: '#b97c4e', belly: '#fffaf1', pink: '#f5b8b0', nose: '#e88f8c', edge: 'rgba(200,120,70,.42)' },
    p: [{ ham: '#dcd5ca', hamD: '#c9c0b2', hamL: '#8f877d', belly: '#fbf9f4', pink: '#ebc9c3', nose: '#d8a6a0', edge: 'rgba(120,108,96,.32)' },
        { ham: '#d3d6d4', hamD: '#bcc1c0', hamL: '#828a8a', belly: '#fafbf8', pink: '#e8c8c4', nose: '#d4a3a0', edge: 'rgba(100,110,112,.32)' },
        { ham: '#e5dcc9', hamD: '#d3c6ad', hamL: '#978a73', belly: '#fdfbf4', pink: '#eecbc2', nose: '#dba69e', edge: 'rgba(130,112,84,.32)' },
        { ham: '#d9d0cc', hamD: '#c5bab5', hamL: '#8c817c', belly: '#fbf8f6', pink: '#eac6c2', nose: '#d6a29e', edge: 'rgba(118,102,98,.32)' }],
  };
  const shade = (hex, k) => { const c = Pilot.hex(hex); return `rgb(${c[0] * k | 0},${c[1] * k | 0},${c[2] * k | 0})`; };
  K.shade = shade;   // shade('#hex', k) → that colour × k (darker for k < 1)
  // hamPal('#fur'): a recoloured hamster from one fur colour
  K.hamPal = (ham, o = {}) => ({ ham, hamD: o.hamD || shade(ham, .93), hamL: o.hamL || shade(ham, .7), belly: o.belly || '#fffaf1', pink: o.pink || '#f5b8b0', nose: o.nose || '#e88f8c', edge: o.edge || 'rgba(160,110,80,.36)' });
  K.ACCENT = C.gold; K.GLOW = '255,214,140';            // the accent colour; rgb of the warm light
  K.FONT = "'Hi Melody',sans-serif"; K.SANS = "'Noto Sans KR',sans-serif";
  K.FONTS = ["400 76px 'Hi Melody'", "400 28px 'Noto Sans KR'", "500 34px 'Noto Sans KR'", "600 32px 'Noto Sans KR'"];   // for Pilot.run({fonts})
  K.t12 = t => Math.floor(t * 12 + 1e-6) / 12;          // time on twos (figure poses)
  K.frac = x => x - Math.floor(x);
  const frac = K.frac;

  /* ---------------------------------------------------------------- watercolour + pencil */
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  // smooth(pts, closed) → Path2D through the midpoints (soft corners)
  function smooth(pts, closed = true) {
    const p = new Path2D(), n = pts.length;
    if (closed) { const m0 = mid(pts[n - 1], pts[0]); p.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) { const a = pts[i], m = mid(a, pts[(i + 1) % n]); p.quadraticCurveTo(a[0], a[1], m[0], m[1]); } p.closePath(); }
    else { p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n - 1; i++) { const m = mid(pts[i], pts[i + 1]); p.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); } p.lineTo(pts[n - 1][0], pts[n - 1][1]); }
    return p;
  }
  // rough(pts, amp px, seed, step px, closed) → resampled points wobbled by noise (fixed per seed + position: build once, then transform)
  function rough(pts, amp, seed, step = 10, closed = true) {
    const o = [], n = pts.length, m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % n], Ln = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.round(Ln / step));
      for (let j = 0; j < k; j++) { const u = j / k, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
        o.push([x + (noise(x * .03 + seed, y * .03) - .5) * amp, y + (noise(y * .03 + seed * 1.7, x * .03 + 9) - .5) * amp]); } }
    if (!closed) o.push(pts[n - 1]);
    return o;
  }
  const pathOf = (pts, closed = true) => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); if (closed) p.closePath(); return p; };
  const ellPts = (cx, cy, rx, ry, n = 22) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };
  // wash(ctx, path, col, edge, {bloom .5, ew 9 (edge width), pool .4, line, lw, la, dash, seed}): THE mark of the style —
  // colour + blooms + pigment pooled at the edge (layered inner strokes) + a thin, slightly broken coloured-pencil contour
  function wash(ctx, path, col, edge, o = {}) {
    ctx.save(); ctx.fillStyle = col; ctx.fill(path); ctx.clip(path);
    ctx.globalAlpha = o.bloom ?? .5; ctx.fillStyle = TX.bloomPat; ctx.fill(path); ctx.globalAlpha = 1;
    if (edge) { const ew = o.ew ?? 9, pool = o.pool ?? .4; ctx.strokeStyle = edge; ctx.lineJoin = 'round';
      for (const [w, a] of [[ew * 1.8, .18], [ew, .3], [ew * .4, .45]]) { ctx.globalAlpha = pool * a * 1.6; ctx.lineWidth = w; ctx.stroke(path); } ctx.globalAlpha = 1; }
    ctx.restore();
    if (o.line) { ctx.save(); ctx.strokeStyle = o.line; ctx.lineWidth = o.lw || 2; ctx.globalAlpha = o.la ?? .75; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash(o.dash || [140, 5, 90, 4, 200, 6]); ctx.lineDashOffset = (o.seed || 0) * 13; ctx.stroke(path); ctx.restore(); }
  }
  function bloomTexture(w, h, seed) {   // soft light/dark blooms + granulation, transparent; seamless (it is used as a repeating pattern)
    const c = Pilot.canvas(w, h), x = c.getContext('2d'), d = x.createImageData(w, h), q = d.data, r = rng(seed);
    const nb = (i, y) => noise(i / 70 + seed, y / 70) * .6 + noise(i / 22, y / 22 + seed) * .4;
    for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
      const u = i / w, v0 = y / h, bs = nb(i, y) * (1 - u) * (1 - v0) + nb(i + w, y) * u * (1 - v0) + nb(i, y + h) * (1 - u) * v0 + nb(i + w, y + h) * u * v0;
      const k = Math.sqrt((1 - u) * (1 - u) + u * u) * Math.sqrt((1 - v0) * (1 - v0) + v0 * v0);   // keep the contrast where the four blend
      const b = (bs - .5) / k, g = r(), o = (y * w + i) * 4, v = b * 1.6 + (g - .5) * .35;
      if (v > 0) { q[o] = 255; q[o + 1] = 255; q[o + 2] = 245; q[o + 3] = Math.min(255, v * 150); } else { q[o] = 40; q[o + 1] = 70; q[o + 2] = 40; q[o + 3] = Math.min(255, -v * 110); } }
    x.putImageData(d, 0, 0); return c;
  }
  function paperTexture(w, h, seed) {   // cold-press watercolour paper
    const c = Pilot.canvas(w, h), x = c.getContext('2d'), d = x.createImageData(w, h), q = d.data, r = rng(seed);
    for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
      const tooth = noise(i / 3.5, y / 3.5 + seed) * .6 + noise(i / 9, y / 9) * .4, lo = noise(i / 200, y / 200 + seed), o = (y * w + i) * 4, v = 128 + (tooth - .5) * 46 + (lo - .5) * 26 + (r() - .5) * 10;
      q[o] = q[o + 1] = q[o + 2] = v; q[o + 3] = 255; }
    x.putImageData(d, 0, 0); return c;
  }
  Object.assign(K, { smooth, rough, pathOf, ellPts, wash });
  K.bloom = () => TX.bloomPat;   // the bloom pattern (fill style) — lay it at alpha .3–.5 over any flat area to make it a wash

  /* ---------------------------------------------------------------- clover pieces */
  function leaflet(s) {
    const p = new Path2D(); p.moveTo(0, 0);
    p.bezierCurveTo(-s * .5, -s * .18, -s * .66, -s * .98, -s * .3, -s * 1.08);
    p.quadraticCurveTo(-s * .07, -s * 1.12, 0, -s * .95);
    p.quadraticCurveTo(s * .07, -s * 1.12, s * .3, -s * 1.08);
    p.bezierCurveTo(s * .66, -s * .98, s * .5, -s * .18, 0, 0); p.closePath(); return p;
  }
  const LEAFS = ['#6fbd5c', '#5daf52', '#86ca6a', '#4fa24c', '#93d070', '#72b95f'];
  // cloverLeaf(ctx, x, y, s size, rot, tilt (y squash), col, line, seed, {keep, noLine, lineCol}): three heart leaflets with pale chevrons
  function cloverLeaf(ctx, x, y, s, rot, tilt, col, line, seed, o = {}) {
    if (!o.keep) col = Pilot.rgb(Pilot.mix(Pilot.hex(col), Pilot.hex(LEAFS[Math.abs(seed | 0) % LEAFS.length]), .45));
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, tilt);
    const r = rng(seed);
    for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i - 1) * 2.15 + (r() - .5) * .2;
      ctx.save(); ctx.rotate(a + Math.PI / 2); const lp = leaflet(s * (.92 + r() * .16));
      wash(ctx, lp, col, line, { bloom: .4, line: o.noLine ? null : (o.lineCol || '#3f7d40'), la: .85, lw: 2.4 / Math.sqrt(tilt), seed: seed + i, ew: s * .12 });
      { const g = ctx.createLinearGradient(0, 0, 0, -s * 1.1); g.addColorStop(0, 'rgba(30,80,40,.32)'); g.addColorStop(.5, 'rgba(30,80,40,.06)'); g.addColorStop(1, 'rgba(240,255,210,.12)');
        ctx.save(); ctx.clip(lp); ctx.fillStyle = g; ctx.fillRect(-s, -s * 1.2, 2 * s, s * 1.3); ctx.restore(); }
      ctx.strokeStyle = C.chev; ctx.lineWidth = Math.max(2, s * .045); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-s * .3, -s * .78); ctx.quadraticCurveTo(-s * .1, -s * .56, 0, -s * .5); ctx.quadraticCurveTo(s * .1, -s * .56, s * .3, -s * .78); ctx.stroke();
      ctx.strokeStyle = 'rgba(60,110,60,.25)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -s * .05); ctx.lineTo(0, -s * .9); ctx.stroke();
      ctx.restore(); }
    ctx.restore();
  }
  // leafSprite(s, tilt, col, line, seed, o) → canvas: a leaf without its stem, centred (stamp it with K.stamp)
  function leafSprite(s, tilt, col, line, seed, o = {}) {
    const pad = s * 1.25, c = Pilot.canvas(Math.ceil(pad * 2), Math.ceil(pad * 2 * Math.max(tilt, .5))), x = c.getContext('2d');
    cloverLeaf(x, c.width / 2, c.height / 2, s, (rng(seed)() - .5) * .5, tilt, col, line, seed, o); return c;
  }
  // cloverSprite(s, tilt, col, line, seed, stemH, stemCol) → canvas with .px/.py = the stem's foot (pivot for swaying)
  function cloverSprite(s, tilt, col, line, seed, stemH, stemCol) {
    const pad = s * 1.3, c = Pilot.canvas(Math.ceil(pad * 2 + 20), Math.ceil(pad * 2 * tilt + stemH + 40)), x = c.getContext('2d');
    const cx = c.width / 2, cy = pad * tilt + 20;
    x.strokeStyle = stemCol || C.stem; x.lineWidth = Math.max(4, s * .08); x.lineCap = 'round';
    x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(cx + s * .15, cy + stemH * .5, cx, cy + stemH); x.stroke();
    cloverLeaf(x, cx, cy, s, (rng(seed)() - .5) * .5, tilt, col, line, seed);
    c.px = cx; c.py = cy + stemH; return c;
  }
  // flowerSprite(r, seed, pale 0–1) → canvas (2.8r square): a white clover flower ball of many small reflexed florets
  function flowerSprite(r, seed, pale = 0) {
    const c = Pilot.canvas(r * 2.8, r * 2.8), x = c.getContext('2d'), rr = rng(seed), cx = c.width / 2, cy = c.height / 2;
    x.fillStyle = C.flowerC; x.beginPath(); x.ellipse(cx, cy + r * .1, r * .75, r * .7, 0, 0, TAU); x.fill();
    const n = 70; for (let i = 0; i < n; i++) { const a = rr() * TAU, d = Math.sqrt(rr()) * r * .8, px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d * .9;
      const ang = Math.atan2(py - cy + r * .3, px - cx), Lf = r * (.38 + rr() * .2);
      x.save(); x.translate(px, py); x.rotate(ang + Math.PI / 2); const p = new Path2D(); p.ellipse(0, Lf * .45, Lf * .22, Lf * .55, 0, 0, TAU);
      x.fillStyle = rr() < .12 ? '#f3efe6' : C.flower; x.fill(p); x.strokeStyle = C.flowerL; x.lineWidth = 1.4; x.globalAlpha = .7; x.stroke(p); x.globalAlpha = 1; x.restore(); }
    x.globalCompositeOperation = 'source-atop'; const g = x.createLinearGradient(0, cy - r, 0, cy + r); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(150,170,130,.28)'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    if (pale) { x.fillStyle = `rgba(225,238,230,${pale})`; x.fillRect(0, 0, c.width, c.height); }
    return c;
  }
  // blade(ctx, x, y (foot), h, bend px, w, col, line): one grass blade
  function blade(ctx, x, y, h, bend, w, col, line) {
    const p = new Path2D(); p.moveTo(x - w / 2, y); p.quadraticCurveTo(x - w * .3 + bend * .4, y - h * .6, x + bend, y - h); p.quadraticCurveTo(x + w * .3 + bend * .4, y - h * .6, x + w / 2, y); p.closePath();
    ctx.fillStyle = col; ctx.fill(p); if (line) { ctx.strokeStyle = line; ctx.lineWidth = 1.6; ctx.globalAlpha = .6; ctx.stroke(p); ctx.globalAlpha = 1; }
  }
  // violet(ctx, x, y, s): a lilac five-petal violet with white rays
  function violet(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (let i = 0; i < 5; i++) { ctx.save(); ctx.rotate(i / 5 * TAU); const p = new Path2D(); p.ellipse(0, -24, 19, 24, 0, 0, TAU); ctx.fillStyle = '#b4b9ec'; ctx.fill(p); ctx.strokeStyle = '#7f86c9'; ctx.lineWidth = 2; ctx.globalAlpha = .7; ctx.stroke(p); ctx.restore(); }
    ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.save(); ctx.rotate(i / 5 * TAU); ctx.fillRect(-1.5, -18, 3, 14); ctx.restore(); } ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill(); ctx.restore();
  }
  // stamp(g, sprite, x, y, scale): draw a sprite centred at (x, y)
  function stamp(g, spr, x, y, sc) { g.drawImage(spr, x - spr.width * sc / 2, y - spr.height * sc / 2, spr.width * sc, spr.height * sc); }
  Object.assign(K, { leaflet, cloverLeaf, leafSprite, cloverSprite, flowerSprite, blade, violet, stamp, LEAFS });

  /* ---------------------------------------------------------------- init */
  // init(): bloom (1024²) + paper (W×H) textures, the 18 leaf stamps K.LS, a flower ball K.flowerS, the hamster body,
  // the end plate and the caption glow (≈ 0.9 s)
  K.init = function () {
    W = Pilot.W; H = Pilot.H;
    TX.bloom = bloomTexture(1024, 1024, 3); TX.bloomPat = Pilot.canvas(1, 1).getContext('2d').createPattern(TX.bloom, 'repeat');
    TX.paper = paperTexture(W, H, 9);
    TX.paperM = Pilot.canvas(W, H); { const x = TX.paperM.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.globalAlpha = .9; x.drawImage(TX.paper, 0, 0); }
    K.flowerS = flowerSprite(40, 77);
    TX.body = rough(ellPts(0, -58, 60, 54, 24), 1.4, 3, 7);
    K.LS = []; for (let i = 0; i < 18; i++) K.LS.push(leafSprite(70, .5 + (i % 4) * .08, [C.mid, C.near, C.deep, C.mid][i % 4], C.midL, 300 + i * 7));
    TX.plate = buildPlate();
    { const c = Pilot.canvas(400, 200), x = c.getContext('2d'); for (let i = 0; i < 24; i++) { const k = i / 23; x.fillStyle = `rgba(252,250,240,${.075})`; const p = new Path2D(), m = 4 + k * 70;
        p.roundRect(m * 1.6, m * .8, 400 - m * 3.2, 200 - m * 1.6, 100 - m * .8); x.fill(p); } TX.capGlow = c; }
  };

  /* ---------------------------------------------------------------- sheets */
  // sheet(x0, y0, x1, y1, fn(g), K) → {c, x0, y0, x1, y1, K}: a canvas for that world rectangle at K px per world px
  function sheet(x0, y0, x1, y1, fn, Kk = 1) {
    const c = Pilot.canvas(Math.ceil((x1 - x0) * Kk), Math.ceil((y1 - y0) * Kk)), g = c.getContext('2d'); g.setTransform(Kk, 0, 0, Kk, -x0 * Kk, -y0 * Kk); g.lineJoin = 'round'; fn(g);
    return { c, x0, y0, x1, y1, K: Kk };
  }
  // drawSheet(ctx, s): only the part visible through the current transform
  function drawSheet(ctx, s) {
    const m = ctx.getTransform(), inv = m.inverse(), p0 = inv.transformPoint(new DOMPoint(0, 0)), p1 = inv.transformPoint(new DOMPoint(W, H));
    const x0 = Math.max(s.x0, Math.min(p0.x, p1.x) - 4), x1 = Math.min(s.x1, Math.max(p0.x, p1.x) + 4), y0 = Math.max(s.y0, Math.min(p0.y, p1.y) - 4), y1 = Math.min(s.y1, Math.max(p0.y, p1.y) + 4);
    if (x1 <= x0 || y1 <= y0) return;
    ctx.drawImage(s.c, (x0 - s.x0) * s.K, (y0 - s.y0) * s.K, (x1 - x0) * s.K, (y1 - y0) * s.K, x0, y0, x1 - x0, y1 - y0);
  }
  Object.assign(K, { sheet, drawSheet });

  /* ---------------------------------------------------------------- the world (builders take the scene's shared rng r) */
  // skySheet(r) → sheet for parallax .1: teal-to-cream sky with soft bright patches and pale watercolour clouds
  K.skySheet = r => sheet(-900, -400, 1100, 2400, g => {
    const gr = g.createLinearGradient(0, -400, 0, 1150); gr.addColorStop(0, '#a9d8d6'); gr.addColorStop(.45, C.sky0); gr.addColorStop(1, C.sky1); g.fillStyle = gr; g.fillRect(-900, -400, 2000, 2800);
    for (let i = 0; i < 9; i++) { const bx = -900 + r() * 2000, by = -300 + r() * 1200, br = 160 + r() * 240, bg = g.createRadialGradient(bx, by, 0, bx, by, br); bg.addColorStop(0, 'rgba(250,252,240,.4)'); bg.addColorStop(1, 'rgba(250,252,240,0)'); g.fillStyle = bg; g.fillRect(bx - br, by - br, br * 2, br * 2); }
    // soft watercolour clouds: overlapping pale washes
    for (let k = 0; k < 4; k++) { const cx = -700 + k * 520 + r() * 160, cy = 120 + r() * 380; for (let j = 0; j < 6; j++) { const ex = cx + (j - 2.5) * 52 + r() * 30, ey = cy - Math.sin(j / 5 * Math.PI) * 40 + r() * 16, rr = 60 + r() * 50;
      const cg = g.createRadialGradient(ex, ey, 0, ex, ey, rr); cg.addColorStop(0, 'rgba(255,255,252,.55)'); cg.addColorStop(.7, 'rgba(255,255,252,.35)'); cg.addColorStop(1, 'rgba(255,255,252,0)'); g.fillStyle = cg; g.fillRect(ex - rr, ey - rr, rr * 2, rr * 2); } }
    g.fillStyle = '#b6dba4'; g.fillRect(-900, 1150, 2000, 1300);
  }, .5);
  // farMeadow(r, x0, x1) → sheet for parallax .32: pale, blurred clover and flower heads (depth by softness)
  K.farMeadow = (r, x0 = -1100, x1 = 1900) => {
    const w = x1 - x0, n = k => Math.round(k * w / 3000);
    const fs = sheet(x0, 600, x1, 2500, g => {
      for (let i = 0; i < n(26); i++) { const px = x0 + r() * w, py = 760 + r() * 260, rr = 26 + r() * 18; g.strokeStyle = '#c3debb'; g.lineWidth = 6; g.beginPath(); g.moveTo(px, py); g.lineTo(px + 6, 1200); g.stroke(); g.drawImage(flowerSprite(rr, i + 40, .35), px - rr * 1.4, py - rr * 1.4); }
      for (let i = 0; i < n(30); i++) blade(g, x0 + r() * w, 1180, 200 + r() * 160, (r() - .5) * 120, 24, '#c1dfb1', null);
      g.fillStyle = '#a9d39a'; g.fillRect(x0, 1130, w, 1400);
      for (let i = 0; i < n(110); i++) { const px = x0 + r() * w, py = 1030 + r() * 140; stamp(g, K.LS[i % K.LS.length], px, py, .55 + r() * .3); }
      { const hz = g.createLinearGradient(0, 600, 0, 1000); hz.addColorStop(0, 'rgba(233,241,223,0)'); hz.addColorStop(1, 'rgba(233,241,223,.45)'); g.fillStyle = hz; g.fillRect(x0, 600, w, 400); g.fillStyle = 'rgba(233,241,223,.45)'; g.fillRect(x0, 1000, w, 1500); }
    }, .5);
    const c2 = Pilot.canvas(fs.c.width, fs.c.height), x2 = c2.getContext('2d'); x2.filter = 'blur(3px)'; x2.drawImage(fs.c, 0, 0); fs.c = c2; return fs;
  };
  // midBand(r, x0, x1, nBlades) → sheet for parallax .72: a clover band (three rows of leaf stamps) with tall grass blades
  K.midBand = (r, x0, x1, nBlades = 40) => sheet(x0, 860, x1, 2500, g => {
    g.fillStyle = '#86bf76'; g.fillRect(x0, 1170, x1 - x0, 1400); g.save(); g.globalAlpha = .4; g.fillStyle = TX.bloomPat; g.fillRect(x0, 1170, x1 - x0, 1400); g.restore();
    for (let i = 0; i < nBlades; i++) blade(g, x0 + r() * (x1 - x0), 1260, 140 + r() * 200, (r() - .5) * 80, 20, C.blade, C.bladeL);
    for (let row = 0; row < 3; row++) for (let x = x0; x < x1; x += 95 + r() * 40) stamp(g, K.LS[(x / 7 | 0) % K.LS.length & 15], x, 1040 + row * 70 + r() * 40, 1.0 + row * .14 + r() * .2);
  });
  // tallFlowers(r, x0, x1) → list for parallax .55: tall clover flowers on long stems (drawn live with drawTall: they sway)
  K.tallFlowers = (r, x0, x1) => { const o = []; for (let x = x0; x < x1; x += 200 + r() * 160) o.push({ x, base: 1200, h: 280 + r() * 300, w: 6 + r() * 2, c: flowerSprite(48 + r() * 34, (x | 0) + 7), f: .6 + r() * .5, p: r() * TAU, bend: (r() - .5) * 40 }); return o; };
  K.drawTall = (ctx, t, list) => { const m = ctx.getTransform().inverse(), lx = m.transformPoint(new DOMPoint(-200, 0)).x, rx = m.transformPoint(new DOMPoint(W + 200, 0)).x;
    for (const f of list) { if (f.x < lx || f.x > rx) continue; const a = Math.sin(t * f.f + f.p) * .025; ctx.save(); ctx.translate(f.x, f.base); ctx.rotate(a);
      ctx.strokeStyle = C.stem; ctx.lineWidth = f.w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(f.bend, -f.h * .5, 0, -f.h); ctx.stroke();
      ctx.drawImage(f.c, -f.c.width / 2, -f.h - f.c.height / 2); ctx.restore(); } };
  // ground(r, {x0, x1, top, bottom, y1, gap:{E, G}}) → sheet (parallax 1): clover tufts and blades behind the path, the sandy
  // path between y = top and bottom (pebbles, a shadow under the far edge), the clover bank in front (rows of leaves growing
  // bigger toward us, flower balls, violets). gap: a gully cut out between x = E and E + G with earth faces and overhanging blades.
  K.ground = (r, { x0: ROADX0, x1: ROADX1, top: RT = 1204, bottom: PN = 1352, y1 = 2560, gap = null }) => sheet(ROADX0, 1060, ROADX1, y1, g => {
    for (let x = ROADX0; x < ROADX1; x += 70 + r() * 50) stamp(g, K.LS[(r() * 18) | 0], x, RT - 40 - r() * 50, .8 + r() * .35);
    for (let i = 0; i < (ROADX1 - ROADX0) / 60; i++) blade(g, ROADX0 + r() * (ROADX1 - ROADX0), RT + 10, 90 + r() * 110, (r() - .5) * 60, 16, r() < .5 ? C.blade : '#7cbd6c', C.bladeL);
    // the path: a sandy wash with rough edges
    const top = [], bot = []; for (let x = ROADX0; x <= ROADX1; x += 40) { top.push([x, RT + (noise(x * .01, 3) - .5) * 14]); bot.push([x, PN + (noise(x * .012, 7) - .5) * 18]); }
    const pp = smooth(top.concat(bot.reverse()));
    wash(g, pp, C.path, C.pathD, { bloom: .45, ew: 18, pool: .5, line: C.pathL, lw: 2, la: .55 });
    g.save(); g.clip(pp); const sh = g.createLinearGradient(0, RT, 0, RT + 60); sh.addColorStop(0, 'rgba(90,120,80,.28)'); sh.addColorStop(1, 'rgba(90,120,80,0)'); g.fillStyle = sh; g.fillRect(ROADX0, RT - 10, ROADX1 - ROADX0, 80);
    for (let i = 0; i < (ROADX1 - ROADX0) / 26; i++) { const px = ROADX0 + r() * (ROADX1 - ROADX0), py = RT + 14 + r() * (PN - RT - 20), rr = 3 + r() * 6; g.fillStyle = r() < .5 ? 'rgba(190,165,125,.5)' : 'rgba(225,210,180,.7)'; g.beginPath(); g.ellipse(px, py, rr * 1.4, rr, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(140,115,85,.45)'; g.lineWidth = 1; g.stroke(); }
    g.restore();
    // the clover bank in front of the path: rows of leaves, bigger and nearer as they go down
    g.fillStyle = '#78b866'; g.fillRect(ROADX0, PN + 20, ROADX1 - ROADX0, y1 - PN); g.save(); g.globalAlpha = .45; g.fillStyle = TX.bloomPat; g.fillRect(ROADX0, PN + 20, ROADX1 - ROADX0, y1 - PN); g.restore();
    for (let row = 0; row < 14; row++) { const yy = PN + 26 + row * 78, sc = .85 + row * .09; for (let x = ROADX0 + (row % 2) * 50; x < ROADX1; x += (90 + r() * 50) * (.8 + row * .05)) stamp(g, K.LS[(r() * 18) | 0], x, yy + r() * 30, sc + r() * .2); }
    for (let i = 0; i < (ROADX1 - ROADX0) / 300; i++) { const px = ROADX0 + r() * (ROADX1 - ROADX0), py = PN + 140 + r() * 700; g.drawImage(K.flowerS, px - 30, py - 30, 60, 60); }
    for (let i = 0; i < (ROADX1 - ROADX0) / 420; i++) violet(g, ROADX0 + r() * (ROADX1 - ROADX0), PN + 200 + r() * 700, .8 + r() * .4);
    if (!gap) return;
    const E = gap.E, G = gap.G;
    // the gully: cut out, with ragged lips; earth faces on both cut sides
    const lip = (x, dir, seed) => { const q = rng(seed), o = []; for (let y = RT + 6; y <= y1 + 10; y += 16) o.push([x + dir * (y < RT + 40 ? 0 : (6 + q() * 12 + (y - RT) * .05)), y]); return o; };
    const L1 = lip(E, 1, 71), L2 = lip(E + G, -1, 73);
    g.save(); g.globalCompositeOperation = 'destination-out'; g.fill(pathOf(L1.concat(L2.slice().reverse()))); g.restore();
    for (const [Lp, dir] of [[L1, 1], [L2, -1]]) { const face = Lp.map(([x, y]) => [x - dir * 26, y]); const fp = pathOf(Lp.filter(p => p[1] >= RT - 4).concat(face.filter(p => p[1] >= RT - 4).reverse()));
      wash(g, fp, C.earth, C.earthD, { bloom: .5, ew: 8, pool: .55, line: C.earthL, lw: 1.8, la: .6 });
      g.save(); g.clip(fp); g.strokeStyle = 'rgba(110,80,55,.5)'; g.lineWidth = 2; const q = rng(dir > 0 ? 81 : 82);
      for (let k = 0; k < 14; k++) { const yy = RT + 40 + q() * 900, xx = Lp[0][0] - dir * 6; g.beginPath(); g.moveTo(xx, yy); g.quadraticCurveTo(xx + dir * 14, yy + 18, xx + dir * (8 + q() * 20), yy + 40 + q() * 30); g.stroke(); }
      const dk = g.createLinearGradient(0, RT + 120, 0, RT + 700); dk.addColorStop(0, 'rgba(36,40,34,0)'); dk.addColorStop(1, 'rgba(36,40,34,.8)'); g.fillStyle = dk; g.fillRect(Lp[0][0] - 60, RT, 120, y1 - RT);
      g.restore(); }
    // grass tufts overhanging the lips
    for (const [x0, dir] of [[E, 1], [E + G, -1]]) for (let k = 0; k < 7; k++) blade(g, x0 - dir * (6 + k * 7), RT + 12 + k * 4, 50 + r() * 40, dir * (20 + r() * 30), 10, C.blade, C.bladeL);
  });
  // gully(r, {E, G, top, y1}) → sheet (draw BEFORE the ground): inside the gap — an earthy back wall stepping down in darker
  // ledges to a shadowed brook you can't see the bottom of, moss and roots near the top, a cold breath of mist
  K.gully = (r, { E, G, top: RT = 1204, y1 = 2560 }) => sheet(E - 40, RT - 90, E + G + 40, y1, g => {
    const top = []; for (let x = E - 40; x <= E + G + 40; x += 18) top.push([x, RT - 40 + (noise(x * .02, 5) - .5) * 40]);
    const wp = smooth(top.concat([[E + G + 40, y1], [E - 40, y1]]));
    const gr = g.createLinearGradient(0, RT - 40, 0, RT + 760); gr.addColorStop(0, '#b4946c'); gr.addColorStop(.25, '#8a6e52'); gr.addColorStop(.55, '#4d4538'); gr.addColorStop(1, '#23272a');
    g.fillStyle = gr; g.fill(wp); g.save(); g.clip(wp); g.globalAlpha = .45; g.fillStyle = TX.bloomPat; g.fillRect(E - 40, RT - 90, G + 80, y1 - RT + 90); g.restore();
    for (let k = 0; k < 4; k++) { const y0 = RT + 60 + k * 150, inset = 30 + k * 34, sh = .2 + k * .17;
      for (const dir of [1, -1]) { const x0 = dir > 0 ? E : E + G, pts = [[x0 - dir * 10, y0 - 40]]; for (let y = y0 - 40; y <= y1; y += 30) pts.push([x0 + dir * (inset + (noise(y * .02, k + dir) - .5) * 26 + (y - y0) * .04), y]); pts.push([x0 - dir * 10, y1]);
        const lp = smooth(pts); g.fillStyle = `rgba(${Math.round(150 - k * 30)},${Math.round(118 - k * 22)},${Math.round(88 - k * 14)},1)`; g.fill(lp);
        g.save(); g.clip(lp); const dg = g.createLinearGradient(0, y0, 0, y0 + 500); dg.addColorStop(0, `rgba(30,32,30,${sh})`); dg.addColorStop(1, 'rgba(30,32,30,.85)'); g.fillStyle = dg; g.fillRect(E - 40, y0 - 60, G + 80, y1 - y0 + 60);
        g.globalAlpha = .3; g.fillStyle = TX.bloomPat; g.fillRect(E - 40, y0 - 60, G + 80, y1 - y0 + 60); g.restore();
        g.strokeStyle = 'rgba(40,30,22,.45)'; g.lineWidth = 2; g.stroke(lp); } }
    for (let i = 0; i < 18; i++) { const x = E + 30 + r() * (G - 60), y = RT + 10 + r() * 160; g.fillStyle = `rgba(110,150,90,${.2 + r() * .25})`; g.beginPath(); g.ellipse(x, y, 16 + r() * 26, 7 + r() * 8, 0, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(80,58,40,.5)'; g.lineWidth = 2; for (let i = 0; i < 16; i++) { const x = E + 30 + r() * (G - 60), y = RT + 10 + r() * 160; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 10, y + 30, x - 12, y + 60, x + 4, y + 90 + r() * 60); g.stroke(); }
    const mg = g.createLinearGradient(0, RT + 380, 0, RT + 620); mg.addColorStop(0, 'rgba(200,215,215,0)'); mg.addColorStop(.5, 'rgba(200,215,215,.14)'); mg.addColorStop(1, 'rgba(200,215,215,0)'); g.fillStyle = mg; g.fillRect(E - 40, RT + 380, G + 80, 240);
  });
  // brook(ctx, t, x0, w, y): faint glints of water far below, moving with the current (clipped to [x0 + 150, x0 + w − 150])
  K.brook = (ctx, t, E, G, WATER) => {
    ctx.save(); ctx.beginPath(); ctx.rect(E + 150, WATER - 10, G - 300, 200); ctx.clip(); ctx.strokeStyle = 'rgba(190,220,225,.28)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const yy = WATER + 8 + i * 16, x = E + 150 + ((i * 97 + t * (40 + i * 10)) % (G - 200)) - 40; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + 40, yy); ctx.stroke(); }
    ctx.restore();
  };
  // dapple() → canvas: drifting leaf-shade light for the path; drawDapple(ctx, t, x0, x1, top, bottom) lays it (soft-light)
  K.dapple = () => { const w = 300, h = 90, c = Pilot.canvas(w, h), x = c.getContext('2d'), d = x.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) { const n = noise(i / 18, y / 8) * .7 + noise(i / 7, y / 4 + 3) * .3, v = n > .55 ? 255 : 60, o = (y * w + i) * 4;
      d.data[o] = d.data[o + 1] = v; d.data[o + 2] = v * .85; d.data[o + 3] = Math.abs(n - .5) > .08 ? 120 : 40; }
    x.putImageData(d, 0, 0); const c2 = Pilot.canvas(1200, 360), x2 = c2.getContext('2d'); x2.filter = 'blur(10px)'; x2.drawImage(c, 0, 0, 1200, 360); return c2; };
  K.drawDapple = (ctx, t, dap, x0, x1, RT, PN) => {
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = .5;
    { const m = ctx.getTransform().inverse(), lx = m.transformPoint(new DOMPoint(0, 0)).x, rx = m.transformPoint(new DOMPoint(W, 0)).x, ox = Math.sin(t * .35) * 40;
      ctx.beginPath(); ctx.rect(x0, RT - 20, x1 - x0, PN - RT + 50); ctx.clip();
      for (let x = Math.floor((lx - ox) / 1200) * 1200 + ox; x < rx; x += 1200) ctx.drawImage(dap, x, RT - 60 + Math.cos(t * .3) * 8); }
    ctx.restore();
  };
  // sunbeam(r) → canvas (quarter res, 1400×1700 world): soft rays from the upper right; motes(r, x) → dust motes for it
  K.sunbeam = r => { const q = 4, w = 1400, h = 1700, c = Pilot.canvas(w / q, h / q), x = c.getContext('2d'); x.scale(1 / q, 1 / q);
    for (let i = 0; i < 7; i++) { const x0 = 900 + i * 70, dx = (i - 3) * 60, ww = 50 + r() * 70, a = .14 + r() * .12, gg = x.createLinearGradient(x0, 0, 700 + dx, 1500);
      gg.addColorStop(0, `rgba(255,226,150,${a * 2.4})`); gg.addColorStop(.7, `rgba(255,226,150,${a * 1.4})`); gg.addColorStop(1, 'rgba(255,226,150,0)');
      x.fillStyle = gg; x.beginPath(); x.moveTo(x0 - ww, 0); x.lineTo(x0 + ww, 0); x.lineTo(700 + dx + ww * .5, 1500); x.lineTo(700 + dx - ww * .5, 1500); x.fill(); }
    const c2 = Pilot.canvas(w / q, h / q), x2 = c2.getContext('2d'); x2.filter = 'blur(6px)'; x2.drawImage(c, 0, 0); return c2; };
  K.motes = (r, GX) => { const o = []; for (let i = 0; i < 30; i++) o.push({ x0: GX + 100 + r() * 400, dx: (r() - .5) * 300, v: .05 + r() * .08, p: r(), s: 2 + r() * 3, a: .5 + r() * .5 }); return o; };
  // drawMotes(ctx, t, list, x, base): motes drifting down the beam toward (x, base)
  K.drawMotes = (ctx, t, list, GX, BY) => { for (const m of list) { const u = ((t * m.v + m.p) % 1), px = lerp(m.x0, GX + m.dx, u) + Math.sin(t * 1.3 + m.p * 9) * 10, py = lerp(BY - 900, BY - 60, u);
    ctx.fillStyle = `rgba(255,244,205,${m.a * Math.sin(Math.PI * u)})`; ctx.beginPath(); ctx.arc(px, py, m.s, 0, TAU); ctx.fill(); } };
  // arch({x, top, base, R0}, beam, motes) → {sheet, back(ctx), clip(ctx), front(ctx, t)}: a round arch of bent willow twig wound
  // with leaves and clover heads, warm sunlight pouring through. Draw: back (the light in the opening) → clip (save/clip,
  // then figures walking IN) → restore → front (the twig frame, the sunbeam, a light spill, motes).
  K.arch = function ({ x: GX, top: GAY, base: BY, R0 = 150 }, beam, motes) {
    const A = { x: GX, top: GAY, base: BY };
    A.sheet = sheet(GX - 220, GAY - 220, GX + 220, BY + 30, g => {
      const tw = (pts, w, seed) => { const p = smooth(rough(pts, 3, seed, 14), false); g.lineCap = 'round'; g.strokeStyle = C.twigL; g.lineWidth = w + 4; g.stroke(p); g.strokeStyle = C.twig; g.lineWidth = w; g.stroke(p);
        g.strokeStyle = 'rgba(255,240,215,.45)'; g.lineWidth = w * .25; g.stroke(p); };
      const arcPts = (rr, dx) => { const o = [[GX - rr + dx, BY + 8]]; for (let i = 0; i <= 18; i++) { const a = Math.PI + Math.PI * i / 18; o.push([GX + Math.cos(a) * rr + dx, GAY + Math.sin(a) * rr]); } o.push([GX + rr + dx, BY + 8]); return o; };
      tw(arcPts(R0, 0), 18, 3); tw(arcPts(R0 - 14, 4), 9, 5);
      for (let i = 0; i < 9; i++) { const a = Math.PI + Math.PI * (i + .5) / 9, x = GX + Math.cos(a) * R0, y = GAY + Math.sin(a) * R0; g.drawImage(K.LS[i % 18], x - 30, y - 22, 60, 44); if (i % 3 === 1) g.drawImage(K.flowerS, x - 22, y - 30, 44, 44); }
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) g.drawImage(K.LS[(k + 5) % 18], GX + sx * R0 - 28, GAY + 60 + k * 70, 56, 40);
    });
    A.back = ctx => {
      const lg = ctx.createRadialGradient(GX, BY - 190, 20, GX, BY - 190, 300); lg.addColorStop(0, 'rgba(255,248,222,1)'); lg.addColorStop(.5, 'rgba(255,226,160,.85)'); lg.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = lg; ctx.fillRect(GX - 300, BY - 500, 600, 520);
      { const p = new Path2D(), r0 = 134; p.moveTo(GX - r0, BY + 6); p.lineTo(GX - r0, GAY); p.arc(GX, GAY, r0, Math.PI, TAU); p.lineTo(GX + r0, BY + 6); p.closePath();
        const ig = ctx.createLinearGradient(0, GAY - r0, 0, BY); ig.addColorStop(0, '#fff6dc'); ig.addColorStop(1, '#ffe4a8'); ctx.fillStyle = ig; ctx.fill(p); }
    };
    A.clip = ctx => { const ap = new Path2D(), r0 = 136; ap.moveTo(GX - r0, BY + 8); ap.lineTo(GX - r0, GAY); ap.arc(GX, GAY, r0, Math.PI, TAU); ap.lineTo(GX + r0, BY + 8); ap.lineTo(GX + r0, BY + 60); ap.lineTo(GX - r0, BY + 60); ap.closePath(); ctx.clip(ap); };
    A.front = (ctx, t) => {
      drawSheet(ctx, A.sheet);
      if (beam) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .85 + .1 * Math.sin(t * 1.7); ctx.drawImage(beam, GX - 900, BY - 1650, 1400, 1700); ctx.restore(); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,214,150,.16)'; ctx.beginPath(); ctx.moveTo(GX - 110, BY + 4); ctx.lineTo(GX + 110, BY + 4); ctx.lineTo(GX + 200, BY + 90); ctx.lineTo(GX - 220, BY + 90); ctx.fill(); ctx.restore();
      if (motes) K.drawMotes(ctx, t, motes, GX, BY);
    };
    return A;
  };
  // foreLeaves(r, x0, x1) → list for parallax 1.18: big swaying clover on stems along the bottom; drawFore(ctx, t, list, bug)
  // draws them (bug = index of the leaf a ladybug walks on, −1 = none)
  K.foreLeaves = (r, x0, x1) => { const o = []; for (let x = x0; x < x1; x += 300 + r() * 260) o.push({ c: cloverSprite(130 + r() * 60, .7 + r() * .1, r() < .5 ? C.near : C.deep, C.nearL, (x | 0) + 11, 220 + r() * 120, C.stem), x, y: 2120 + r() * 80, f: .7 + r() * .6, p: r() * TAU, amp: .02 + r() * .015 }); return o; };
  K.drawFore = (ctx, t, list, bug = 4) => { const m = ctx.getTransform().inverse(), lx = m.transformPoint(new DOMPoint(-300, 0)).x, rx = m.transformPoint(new DOMPoint(W + 300, 0)).x;
    list.forEach((l, i) => { if (l.x < lx || l.x > rx) return; ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(Math.sin(t * l.f + l.p) * l.amp); ctx.drawImage(l.c, -l.c.px, -l.c.py);
      if (i === bug) K.ladybug(ctx, t, 0, -l.c.py + l.c.px * .35 + 20); ctx.restore(); }); };
  // ladybug(ctx, t, cx, cy): walks slowly along an arc (radius 120 × 80) around (cx, cy), legs ticking
  K.ladybug = function (ctx, t, cx, cy) {
    const ang = -2.6 + t * .12, x = cx + Math.cos(ang) * 120, y = cy + Math.sin(ang) * 80, dir = Math.atan2(Math.cos(ang) * 80, -Math.sin(ang) * 120);
    ctx.save(); ctx.translate(x, y); ctx.rotate(dir); ctx.scale(1.4, 1.4); ctx.strokeStyle = '#3a302c'; ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) for (const s of [-1, 1]) { const st = Math.sin(t * 14 + i * 2 + (s > 0 ? Math.PI : 0)) * 3; ctx.beginPath(); ctx.moveTo(i * 7, s * 8); ctx.lineTo(i * 7 + st, s * 16); ctx.stroke(); }
    ctx.fillStyle = '#3a302c'; ctx.beginPath(); ctx.ellipse(16, 0, 8, 9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e2533f'; ctx.beginPath(); ctx.ellipse(-2, 0, 18, 15, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#a63a2c'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-20, 0); ctx.stroke();
    ctx.fillStyle = '#fff6ec'; for (const [dx, dy] of [[6, -7], [6, 7], [-6, -9], [-6, 9], [-14, -4], [-14, 4]]) { ctx.beginPath(); ctx.arc(dx, dy, 2.6, 0, TAU); ctx.fill(); }
    ctx.restore();
  };

  /* ---------------------------------------------------------------- the hamster (lab units: feet at y = 0, body centre (0, −58), 60 × 54) */
  // A pose F = { x, gy, k (world px per lab unit; 2.2–2.5), f (+1 faces right), lean rad, bob, crouch 0–1, sq (squash), breath,
  //   head (+ = face tilts up), eye ('open' | 'strain' | 'closed' | 'down' | 'shock' | 'wet' | 'up'), feet: [[u, up] far, near],
  //   paws: [far, near] world targets | null, pal, alpha, rim (warm rim light 0–1), farBehind (far arm behind the body),
  //   nearLow (near arm drawn before the held thing), farSh/nearSh (shoulder overrides, lab units), tag }.
  // Arms: upper 20, forearm 21 (lab units) — fixed; an unreachable target leaves the paw short (window.__reachLog lists them).
  const SH_N = [26, -50], SH_F = [36, -58], UA = 20, FA = 21;
  K.HAM = { SH_N, SH_F, UA, FA };
  function bodyPt(F, u, v) {
    const lean = F.lean || 0, cr = F.crouch || 0, sq = F.sq || 1, cl = Math.cos(lean), sl = Math.sin(lean);
    const x = u / Math.sqrt(sq), y = v * (1 - .17 * cr) * sq, dy = y + 20;
    return [x * cl - dy * sl, -20 + x * sl + dy * cl - (F.bob || 0)];
  }
  // worldPt(F, u, v) → world point of body point (u, v) (lab units; e.g. (34, −26) the chest, (24, −70) the face)
  const worldPt = (F, u, v) => { const p = bodyPt(F, u, v); return [F.x + F.f * F.k * p[0], F.gy + F.k * p[1]]; };
  function capsule(a, b, wa, wb, n = 7) {
    const dx = b[0] - a[0], dy = b[1] - a[1], an = Math.atan2(dy, dx), pts = [];
    for (let i = 0; i <= n; i++) { const q = an + Math.PI / 2 + Math.PI * i / n; pts.push([a[0] + Math.cos(q) * wa / 2, a[1] + Math.sin(q) * wa / 2]); }
    for (let i = 0; i <= n; i++) { const q = an - Math.PI / 2 + Math.PI * i / n; pts.push([b[0] + Math.cos(q) * wb / 2, b[1] + Math.sin(q) * wb / 2]); }
    return pts;
  }
  // drawHam(ctx, F, mid?, front?): mid() draws held things between the body and the paws (world coords; the paws close over
  // them); front = {between(), after()} for things between the far and near arm / over everything
  function drawHam(ctx, F, mid, front) {
    const al = F.alpha ?? 1; if (al <= 0) return;
    const P = F.pal, k = F.k, f = F.f, lean = F.lean || 0, br = F.breath || 1, m0 = ctx.getTransform();
    const Bp = (u, v) => bodyPt(F, u, v), toL = p => [(p[0] - F.x) / (f * k), (p[1] - F.gy) / k];
    ctx.save(); ctx.globalAlpha = al; ctx.translate(F.x, F.gy); ctx.scale(f * k, k);
    const feet = F.feet || [[-12, 0], [12, 0]];
    const foot = ([u, up], near) => { const p = new Path2D(); p.ellipse(u + (near ? 14 : -10), -up - 5, 12, 7, 0, 0, TAU); ctx.fillStyle = near ? P.pink : shade(P.pink, .92); ctx.fill(p);
      ctx.strokeStyle = shade(P.nose, .85); ctx.lineWidth = 1.1; ctx.globalAlpha = al * .55; ctx.stroke(p); ctx.globalAlpha = al; };
    foot(feet[0], false);
    const rB = F.farBehind ? farReach() : null; if (rB) limb(rB, false);   // the far arm behind the body; its paw comes after the beam
    // body: rough contour cached (no boiling), breathing scales it about the centre
    const raw = TX.body; const body = smooth(raw.map(([u, v]) => Bp(u, -58 + (v + 58) * br)));
    ctx.fillStyle = P.ham; ctx.fill(body);
    ctx.save(); ctx.clip(body);
    const bel = Bp(22, -34); ctx.fillStyle = P.belly; ctx.beginPath(); ctx.ellipse(bel[0], bel[1], 40, 32, lean - .3, 0, TAU); ctx.fill();
    const g0 = Bp(-10, -80), g1 = Bp(0, -58), g = ctx.createRadialGradient(g0[0], g0[1], 10, g1[0], g1[1], 70);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.75, 'rgba(255,255,255,0)'); g.addColorStop(1, P.edge); ctx.fillStyle = g; ctx.fillRect(-90, -160, 180, 180);
    ctx.globalAlpha = al * .35; ctx.fillStyle = TX.bloomPat; ctx.fillRect(-90, -160, 180, 180); ctx.globalAlpha = al;
    if (F.rim) { ctx.globalCompositeOperation = 'source-atop'; const rg = ctx.createLinearGradient(Bp(30, -60)[0], 0, Bp(66, -60)[0], 0); rg.addColorStop(0, 'rgba(255,220,150,0)'); rg.addColorStop(1, `rgba(255,214,140,${F.rim})`); ctx.fillStyle = rg; ctx.fillRect(-90, -160, 180, 180); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
    ctx.strokeStyle = P.hamL; ctx.lineWidth = 2.2 / Math.sqrt(k / 1.7); ctx.globalAlpha = al * .8; ctx.setLineDash([40, 4, 26, 3]); ctx.stroke(body); ctx.setLineDash([]); ctx.globalAlpha = al;
    // face: tilts with the body and the head
    const fc = Bp(24, -70); ctx.save(); ctx.translate(fc[0], fc[1]); ctx.rotate(lean * .55 - (F.head || 0) * .8);
    for (const [ex, ey] of [[-30, -34], [2, -40]]) { ctx.fillStyle = P.hamD; ctx.beginPath(); ctx.ellipse(ex, ey, 13, 12, 0, 0, TAU); ctx.fill(); ctx.fillStyle = P.pink; ctx.beginPath(); ctx.ellipse(ex + 1, ey + 1, 7, 6, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = P.hamL; ctx.lineWidth = 1.8; ctx.globalAlpha = al * .7; ctx.beginPath(); ctx.ellipse(ex, ey, 13, 12, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); ctx.globalAlpha = al; }
    ctx.fillStyle = P.belly; ctx.beginPath(); ctx.ellipse(22, 8, 20, 16, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = P.nose; ctx.beginPath(); ctx.ellipse(38, 2, 5, 4, 0, 0, TAU); ctx.fill();
    const eye = F.eye || 'open', ink = '#3b2c26';
    ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineCap = 'round';
    if (eye === 'strain' || eye === 'closed') { ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(14, -16, 5.5, .35, Math.PI - .35); ctx.stroke();
      if (eye === 'strain') { ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(6, -27); ctx.lineTo(18, -24); ctx.stroke(); } }
    else if (eye === 'down') { ctx.beginPath(); ctx.ellipse(14, -10, 4.2, 3.4, 0, 0, TAU); ctx.fill(); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(8, -13); ctx.lineTo(20, -13); ctx.stroke(); }
    else if (eye === 'up') { ctx.beginPath(); ctx.ellipse(15, -15, 4.6, 5.6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(16.6, -18.2, 1.8, 0, TAU); ctx.fill(); ctx.fillStyle = ink;
      ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(14, -16, 9, Math.PI * 1.15, Math.PI * 1.75); ctx.stroke(); }
    else { const big = eye === 'shock' ? 1.3 : 1; ctx.beginPath(); ctx.ellipse(14, -12, 4.4 * big, 5.2 * big, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(15.6, -14.2, 1.6 * big, 0, TAU); ctx.fill(); ctx.fillStyle = ink;
      if (eye === 'wet') { ctx.strokeStyle = 'rgba(160,210,230,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(14, -11, 6.5, .4, Math.PI - .5); ctx.stroke(); ctx.strokeStyle = ink; } }
    // mouth
    ctx.lineWidth = 1.5; ctx.strokeStyle = shade(P.nose, .7);
    if (eye === 'shock') { ctx.fillStyle = '#c9776f'; ctx.beginPath(); ctx.ellipse(31, 15, 3.2, 4, 0, 0, TAU); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(37, 6); ctx.quadraticCurveTo(36, 11, 32, 12); ctx.stroke(); }
    ctx.fillStyle = P.pink; ctx.globalAlpha = al * .6; ctx.beginPath(); ctx.ellipse(4, 6, 9, 6, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = al;
    ctx.strokeStyle = '#a2786a'; ctx.lineWidth = 1.2; ctx.globalAlpha = al * .8; for (const q of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(34, 8 + q * 3); ctx.lineTo(54, 6 + q * 7); ctx.stroke(); } ctx.globalAlpha = al;
    ctx.restore();
    // arms: short furry limbs from the shoulders to the paw targets (far first, darker). With F.nearLow the near arm hangs
    // from below a carried post (its root hidden behind the beam), so no arm ever crosses the object.
    function reach(sh, tgt, near) {   // two-bone IK, bones never stretch: an unreachable target leaves the paw short of it
      const S0 = Bp(sh[0], sh[1]); let T = tgt ? toL(tgt) : Bp(near ? 40 : 47, near ? -27 : -33);
      let dx = T[0] - S0[0], dy = T[1] - S0[1], d = Math.hypot(dx, dy) || 1e-6; const mx = UA + FA - .4;
      if (d > mx) { if (tgt && window.__reachLog && d > mx + 2) window.__reachLog.push([F.tag || '?', near ? 'near' : 'far', +(d / mx).toFixed(2)]); T = [S0[0] + dx / d * mx, S0[1] + dy / d * mx]; d = mx; }
      const dd = Math.max(d, Math.abs(UA - FA) + .5), an = Math.atan2(T[1] - S0[1], T[0] - S0[0]), b = Math.acos(clamp((UA * UA + dd * dd - FA * FA) / (2 * UA * dd), -1, 1));
      const e1 = [S0[0] + Math.cos(an + b) * UA, S0[1] + Math.sin(an + b) * UA], e2 = [S0[0] + Math.cos(an - b) * UA, S0[1] + Math.sin(an - b) * UA], El = e1[1] > e2[1] ? e1 : e2;   // elbow bends down
      return { S0, El, T, an: Math.atan2(T[1] - El[1], T[0] - El[0]) };
    }
    function farReach() { return reach(F.farSh || SH_F, (F.paws || [])[0], false); }
    function limb(r, near) { ctx.fillStyle = near ? P.ham : P.hamD; ctx.strokeStyle = P.hamL; ctx.lineWidth = 1.4;
      for (const ap of [pathOf(capsule(r.S0, r.El, 16, 13.5)), pathOf(capsule(r.El, r.T, 13.5, 11))]) { ctx.fill(ap); ctx.globalAlpha = al * .55; ctx.stroke(ap); ctx.globalAlpha = al; } }
    function pawD(r, near) { const T = r.T, an = r.an, pp = new Path2D(); pp.ellipse(T[0], T[1], 8.5, 6.8, an, 0, TAU); ctx.fillStyle = near ? P.pink : shade(P.pink, .93); ctx.fill(pp);
      ctx.strokeStyle = shade(P.nose, .8); ctx.lineWidth = 1.1; ctx.globalAlpha = al * .7; ctx.stroke(pp);
      for (const q of [-.5, .5]) { ctx.beginPath(); ctx.moveTo(T[0] + Math.cos(an + q) * 4, T[1] + Math.sin(an + q) * 4); ctx.lineTo(T[0] + Math.cos(an + q * .8) * 8, T[1] + Math.sin(an + q * .8) * 8); ctx.stroke(); }
      ctx.globalAlpha = al; }
    const paws = F.paws || [null, null], rN = reach(F.nearSh || SH_N, paws[1], true), rF = F.farBehind ? null : reach(SH_F, paws[0], false);
    if (F.nearLow) limb(rN, true);
    if (mid) { ctx.save(); ctx.setTransform(m0); mid(); ctx.restore(); }
    if (rF) { limb(rF, false); pawD(rF, false); } if (rB) pawD(rB, false);
    if (front && front.between) { ctx.save(); ctx.setTransform(m0); front.between(); ctx.restore(); }
    if (!F.nearLow) limb(rN, true); pawD(rN, true);
    foot(feet[1], true);
    ctx.restore();
    if (front && front.after) { ctx.save(); ctx.setTransform(m0); front.after(); ctx.restore(); }
  }
  // hamShadow(ctx, F, a): a soft blue-grey contact shadow (shrinks while airborne)
  function hamShadow(ctx, F, k2 = 1) { if ((F.alpha ?? 1) <= 0) return; ctx.save(); ctx.globalAlpha = (F.alpha ?? 1) * k2; ctx.fillStyle = 'rgba(70,110,130,.2)';
    const lift = Math.max(0, (F.bob || 0)) * F.k, sc = 1 - Math.min(.4, lift / 300); ctx.beginPath(); ctx.ellipse(F.x - F.f * 6, F.gy + 2, 40 * F.k * sc, 6 * F.k * sc, 0, 0, TAU); ctx.fill(); ctx.restore(); }

  // ---- poses (return a fresh F; set F.pal yourself)
  function footAt(u, s, lift) { if (u < .5) return [s / 2 - s * (u / .5), 0]; const w = (u - .5) / .5, e = w * w * (3 - 2 * w); return [-s / 2 + s * e, lift * Math.sin(Math.PI * w)]; }
  // hamWalk(x, gy, k, f, ph, {stride, lift, lean, waddle, bob, squash, head, eye} | {hop: height, lean, head, eye}):
  // 'waddle' (feet alternate, small bob) or 'hop' (bounding: stretch in the air, squash on landing); ph = cycles
  function hamWalk(x, gy, k, f, ph, o = {}) {
    const u = frac(ph);
    if (o.hop) { const air = u > .14 && u < .9, w = clamp((u - .14) / .76), hb = o.hop * Math.sin(Math.PI * w);
      const land = u < .14 ? Math.sin(Math.PI * u / .14) : 0;
      return { x, gy, k, f, lean: (o.lean ?? .28) + .1 * Math.sin(Math.PI * w) * (air ? 1 : 0) - .08 * land, bob: air ? hb : 0, sq: air ? 1 + .06 * Math.sin(Math.PI * w) : 1 - .09 * land,
        feet: air ? [[-30 + 10 * w, hb * .85 + 4], [28 - 8 * w, hb * .85 + 8]] : [[-8, 0], [10, 0]], head: o.head ?? 0, eye: o.eye || 'open', ph };
    }
    const s = o.stride ?? 26, lift = o.lift ?? 9;
    const a = footAt(frac(u + .5), s, lift), b = footAt(u, s, lift);
    return { x, gy, k, f, lean: (o.lean ?? .16) + Math.sin(ph * TAU) * (o.waddle ?? .05), bob: Math.abs(Math.sin(ph * TAU)) * (o.bob ?? 4), sq: 1 - Math.abs(Math.sin(ph * TAU + 1)) * (o.squash ?? 0),
      feet: [[a[0], a[1]], [b[0], b[1]]], head: o.head ?? 0, eye: o.eye || 'open', ph };
  }
  // stepTo(F, maxShift): step in / crouch until both paws reach their grips with fixed bones (reach comes from the body)
  function stepTo(F, maxShift = 80) {
    const R0 = (UA + FA - 2) * F.k;
    for (let it = 0; it < 6; it++) { let need = 0, dir = 0, vert = 0;
      [[SH_F, 0], [SH_N, 1]].forEach(([sh, i]) => { const T = F.paws?.[i]; if (!T) return; const S0 = worldPt(F, sh[0], sh[1]), dx = T[0] - S0[0], dy = T[1] - S0[1], d = Math.hypot(dx, dy);
        if (d - R0 > need) { need = d - R0; dir = Math.sign(dx); vert = Math.abs(dy) / d; } });
      if (need <= .5) break;
      if (vert > .7 && (F.crouch || 0) < 1) F.crouch = Math.min(1, (F.crouch || 0) + .2); else { const sh = clamp(need * dir, -maxShift, maxShift); F.x += sh; maxShift -= Math.abs(sh); if (maxShift <= 0) break; }
    }
    return F;
  }
  function standSpec(x, gy, k, f, o = {}) { return { x, gy, k, f, lean: o.lean ?? .06, bob: 0, crouch: o.crouch || 0, feet: [[-14, 0], [12, 0]], head: o.head ?? 0, eye: o.eye || 'open', paws: [null, null] }; }
  // mixSpec(A, B, k): in-between (null paws = resting paws); face, f and flags switch at k = .5
  function mixSpec(A, Bs, k) {
    if (k <= 0) return A; if (k >= 1) return Bs;
    const l2 = (a, b) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], pick = k < .5 ? A : Bs;
    const pw = (i) => { const a = A.paws?.[i], b = Bs.paws?.[i]; if (!a && !b) return null; const ra = a || worldPt(A, i ? 40 : 47, i ? -27 : -33), rb = b || worldPt(Bs, i ? 40 : 47, i ? -27 : -33); return l2(ra, rb); };
    const fA = A.feet || [[-12, 0], [12, 0]], fB = Bs.feet || [[-12, 0], [12, 0]];
    return { ...pick, x: lerp(A.x, Bs.x, k), gy: lerp(A.gy, Bs.gy, k), k: lerp(A.k, Bs.k, k), lean: lerp(A.lean || 0, Bs.lean || 0, k), bob: lerp(A.bob || 0, Bs.bob || 0, k),
      crouch: lerp(A.crouch || 0, Bs.crouch || 0, k), sq: lerp(A.sq || 1, Bs.sq || 1, k), head: lerp(A.head || 0, Bs.head || 0, k), feet: [l2(fA[0], fB[0]), l2(fA[1], fB[1])], paws: [pw(0), pw(1)] };
  }
  // kneelSpec(x, gy, k, f, o): sitting low on the haunches, leaning in toward the ground in front (to dig, plant, pick up)
  const kneelSpec = (x, gy, k, f, o = {}) => ({ ...standSpec(x, gy, k, f, { lean: o.lean ?? .5, crouch: o.crouch ?? 1, head: o.head ?? -.15, eye: o.eye || 'open' }), feet: [[-22, 0], [18, 0]] });
  // lookUp(F, k): face tilted up (k 0–1), body leaning back a little, eyes up
  const lookUp = (F, k = 1) => ({ ...F, head: lerp(F.head || 0, .55, k), lean: (F.lean || 0) - .12 * k, eye: k > .5 ? 'up' : F.eye });
  // reach(F, far, near): paws to world grip points (null = resting); then stepTo(F) if they might be out of reach
  const reach = (F, far, near) => ({ ...F, paws: [far, near] });
  // turn(A, B, k): turn around (B has the other f) with a squash at the middle
  const turn = (A, Bs, k) => { const F = mixSpec(A, Bs, k); if (k > 0 && k < 1) F.sq = (F.sq || 1) - .09 * Math.sin(Math.PI * k); return F; };
  Object.assign(K, { bodyPt, worldPt, capsule, drawHam, hamShadow, footAt, hamWalk, stepTo, standSpec, mixSpec, kneelSpec, lookUp, reach, turn });

  // ---- long things (a cross, a beam, a staff). X = { x, y, a } = the object's foot (u = 0) and angle; cpt(X, u, v) → world point
  const cpt = (X, u, v = 0) => [X.x + Math.cos(X.a) * u - Math.sin(X.a) * v, X.y + Math.sin(X.a) * u + Math.cos(X.a) * v];
  // upOn(X, u, off) → the point `off` px above the object's centre line at u (where a paw rests ON it)
  const upOn = (X, u, off = 17) => { const n = [Math.sin(X.a), -Math.cos(X.a)], s = n[1] > 0 ? -1 : 1, p = cpt(X, u); return [p[0] + n[0] * s * off, p[1] + n[1] * s * off]; };
  // carryLong(F, a0, {contact, u0, at}) → X: hugged against the chest (body point `at`, default (34, −26)), rising ahead at a0;
  // the point `contact` (px from the foot) rests on the chest; the angle is limited so the foot (from u0) never goes through the ground
  function carryLong(F, a0, o) {
    const pc = worldPt(F, ...(o.at || [34, -26])), contact = o.contact, u0 = o.u0 || 0;
    a0 = Math.min(a0, Math.asin(clamp((F.gy - 8 - pc[1]) / Math.max(1, contact - u0), 0, 1)));
    const a = F.f > 0 ? -a0 : Math.PI + a0, d = [Math.cos(a), Math.sin(a)];
    return { x: pc[0] - d[0] * contact, y: pc[1] - d[1] * contact, a, contact };
  }
  // holdFront(F, len) → X: held level in front of the belly, both paws on its upper edge; holdUpright(F, len) → X: standing
  // beside the near foot, the near paw around it at chest height
  function holdFront(F, len, o = {}) { const c = worldPt(F, 44, -30 + (o.dv || 0)), X = { x: c[0] - F.f * len / 2, y: c[1], a: F.f > 0 ? 0 : Math.PI }; if (F.f < 0) X.x = c[0] + len / 2;
    F.paws = [upOn(X, len / 2 + 10 * F.k, 6), upOn(X, len / 2 - 4 * F.k, 6)]; return X; }
  function holdUpright(F, len, o = {}) { const X = { x: F.x + F.f * (o.du ?? 30) * F.k, y: F.gy, a: -Math.PI / 2 }; F.paws = [F.paws?.[0] || null, [X.x - F.f * 4, worldPt(F, 40, -40)[1]]]; return X; }
  const mixX = (A, Bx, k) => k <= 0 ? A : k >= 1 ? Bx : { ...Bx, x: lerp(A.x, Bx.x, k), y: lerp(A.y, Bx.y, k), a: lerp(A.a, Bx.a, k), u0: Bx.u0, lie: k > .62 ? Bx.lie : A.lie };
  function rotAbout(X, pv, th) { const ox = X.x - pv[0], oy = X.y - pv[1]; return { ...X, x: pv[0] + ox * Math.cos(th) - oy * Math.sin(th), y: pv[1] + ox * Math.sin(th) + oy * Math.cos(th), a: X.a + th }; }
  Object.assign(K, { cpt, upOn, carryLong, holdFront, holdUpright, mixX, rotAbout });

  /* ---------------------------------------------------------------- wood: a watercolour cross / beam (post along +x, foot at 0) */
  // D = {L, PW, CBX (crossbar centre from the foot; null = a plain beam), CBW, CBH / CBHL (crossbar half-length upright / lying)}
  K.CROSS = { L: 520, PW: 34, CBX: 380, CBW: 32, CBH: 104, CBHL: 40 };
  const KX = 2, CPAD = 14;
  K.crossPts = (hb, D = K.CROSS, cw = D.CBW) => { const { L, PW, CBX } = D; if (CBX == null) return [[0, -PW / 2], [L, -PW / 2], [L, PW / 2], [0, PW / 2]];
    return [[0, -PW / 2], [CBX - cw / 2, -PW / 2], [CBX - cw / 2, -hb], [CBX + cw / 2, -hb], [CBX + cw / 2, -PW / 2], [L, -PW / 2], [L, PW / 2],
    [CBX + cw / 2, PW / 2], [CBX + cw / 2, hb], [CBX - cw / 2, hb], [CBX - cw / 2, PW / 2], [0, PW / 2]]; };
  // crossSprite(col, edge, line, lying, seed, D, endc) → {c, hb, D, endc}: a wash of wood with pencil grain, knots, a light top
  // edge; `glowSprite(X)` adds X.glow (a soft warm halo used by drawCross's glow argument). Accent: (C.gold, C.goldD, C.goldL); others (C.xw, C.xwD, C.xwL)
  K.crossSprite = function (col, edge, line, lying, seed, D = K.CROSS, endc) {
    const { L, PW, CBX, CBW, CBH, CBHL } = D, bar = CBX != null;
    const hb = bar ? (lying ? CBHL : CBH) : PW / 2, w = (L + 2 * CPAD) * KX, h = (2 * hb + 2 * CPAD) * KX, c = Pilot.canvas(w, h), g = c.getContext('2d');
    g.setTransform(KX, 0, 0, KX, CPAD * KX, (hb + CPAD) * KX);
    const cw = lying ? CBW * .9 : CBW;
    const p = pathOf(rough(K.crossPts(hb, D, cw), 1.6, seed, 12));
    wash(g, p, col, edge, { bloom: .35, ew: 7, pool: .55 });
    g.save(); g.clip(p);
    // wood grain: thin wavy pencil strokes along the post and the crossbar
    const r = rng(seed); g.strokeStyle = edge; g.lineCap = 'round';
    for (let k = 0; k < 6; k++) { const yy = -PW / 2 + 5 + k * (PW - 10) / 5 + (r() - .5) * 3; g.globalAlpha = .28 + r() * .2; g.lineWidth = .9 + r() * .6; g.beginPath();
      for (let x = 2; x < L; x += 14) { const yv = yy + Math.sin(x / 40 + k * 2 + seed) * 1.6; x === 2 ? g.moveTo(x, yv) : g.lineTo(x, yv); } g.stroke(); }
    if (bar) for (let k = 0; k < 3; k++) { const xx = CBX - cw / 2 + 6 + k * (cw - 12) / 2; g.globalAlpha = .26; g.lineWidth = 1; g.beginPath(); g.moveTo(xx, -hb + 4); g.lineTo(xx + Math.sin(k) * 1.5, hb - 4); g.stroke(); }
    // a knot or two, light along the top edge
    g.globalAlpha = .35; g.lineWidth = 1.3; for (const kx of [L * .3, L * .62]) { g.beginPath(); g.ellipse(kx, 3, 7, 3, 0, 0, TAU); g.stroke(); }
    g.globalAlpha = .5; g.strokeStyle = 'rgba(255,250,232,.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(4, -PW / 2 + 3); g.lineTo(L - 4, -PW / 2 + 3); g.stroke();
    g.restore();
    g.save(); g.strokeStyle = line; g.lineWidth = 2; g.globalAlpha = .8; g.setLineDash([120, 4, 70, 3, 160, 5]); g.lineJoin = 'round'; g.stroke(p); g.restore();
    return { c, hb, D, endc };
  };
  K.glowSprite = X => { const gc = Pilot.canvas(X.c.width, X.c.height), gx = gc.getContext('2d'); gx.filter = 'blur(14px)'; gx.drawImage(X.c, 0, 0); gx.filter = 'blur(5px)'; gx.drawImage(X.c, 0, 0);
    gx.filter = 'none'; gx.globalCompositeOperation = 'source-in'; gx.fillStyle = 'rgba(255,214,130,1)'; gx.fillRect(0, 0, gc.width, gc.height); X.glow = gc; return X; };
  // drawCross(ctx, X, u0, u1, x, y, a, alpha, glow): material [u0, u1] (px along the post), foot at (x, y), angle a; cut ends
  // get a pale end-grain bar (X.endc); glow 0–1 adds the warm halo (needs glowSprite(X))
  K.drawCross = function (ctx, X, u0, u1, x, y, a, alpha = 1, glow = 0) {
    const { L, PW } = X.D;
    if (u1 - u0 < .5 || alpha <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = alpha;
    const hb = X.hb, dh = 2 * hb + 2 * CPAD, left = u0 <= .5 ? -CPAD : u0, right = u1 >= L - .5 ? L + CPAD : u1;
    if (glow > 0 && X.glow) { const gp = 12, l2 = Math.max(-CPAD, left - gp), r2 = Math.min(L + CPAD, right + gp); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * glow * .7;
      ctx.drawImage(X.glow, (l2 + CPAD) * KX, 0, (r2 - l2) * KX, dh * KX, l2, -hb - CPAD, r2 - l2, dh); ctx.restore(); }
    ctx.drawImage(X.c, (left + CPAD) * KX, 0, (right - left) * KX, dh * KX, left, -hb - CPAD, right - left, dh);
    ctx.fillStyle = X.endc;
    for (const u of [u0 > .5 ? u0 : null, u1 < L - .5 ? u1 : null]) if (u != null) { ctx.globalAlpha = alpha * .9; ctx.fillRect(u - 2.5, -PW / 2 + 1, 5, PW - 2); }
    ctx.restore();
  };

  /* ---------------------------------------------------------------- effects */
  // chips(ctx, t, list): little watercolour chips flung out and landing (sawdust, crumbs, soil). Each item:
  // { t0, x, y, vx, vy, land, r0, vr, sz, col } — gravity 700 px/s², fade 1.2–1.8 s after t0
  K.chips = function (ctx, t, list) {
    for (const q of list) {
      const u = t - q.t0; if (u < 0) continue; const al = 1 - ss(q.t0 + 1.2, q.t0 + 1.8, t); if (al <= 0) continue;
      const tl = (-q.vy + Math.sqrt(q.vy * q.vy + 4 * 700 * (q.land - q.y))) / 1400, uu = Math.min(u, Math.max(0, tl));
      ctx.globalAlpha = al; ctx.fillStyle = q.col; ctx.beginPath(); ctx.ellipse(q.x + q.vx * uu, q.y + q.vy * uu + 700 * uu * uu, q.sz, q.sz * .65, q.r0 + q.vr * uu, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  // splashDrops(seed, n) → droplets for splash(); splash(ctx, u (s since impact), x0, y0, drops, {clip:[x, y, w, h], scale, alpha}):
  // THE HIT — a watercolour splash: rings, a crown, droplets (1.6 s)
  K.splashDrops = (seed = 200, n = 34) => { const r = rng(seed), o = []; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (r() - .5) * 1.9, v = 260 + r() * 420; o.push({ x: (r() - .5) * 120, vx: Math.cos(a) * v, vy: Math.sin(a) * v, sz: 4 + r() * 9, d: r() * .08 }); } return o; };
  K.splash = function (ctx, u, x0, y0, drops, o = {}) {
    if (u < 0 || u > 1.6) return;
    const sc = o.scale ?? .45; ctx.save(); ctx.globalAlpha = o.alpha ?? .45; ctx.translate(x0, y0); ctx.scale(sc, sc); ctx.translate(-x0, -y0);
    ctx.save(); if (o.clip) { ctx.beginPath(); ctx.rect(...o.clip); ctx.clip(); }
    for (let k = 0; k < 3; k++) { const v = u - k * .18; if (v <= 0) continue; const rr = 30 + v * 260, a = (1 - v / 1.4) * .8; if (a <= 0) continue;
      ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x0, y0 + 6, rr, rr * .2, 0, 0, TAU); ctx.stroke(); }
    if (u < .55) { const k = Math.sin(Math.PI * u / .55); ctx.fillStyle = `rgba(214,238,244,${.75 * k})`; ctx.strokeStyle = `rgba(120,175,195,${.6 * k})`; ctx.lineWidth = 2;
      const pts = []; for (let i = 0; i <= 10; i++) { const xx = x0 - 100 + i * 20, hh = (i % 2 ? 130 : 70) * k * (1 - Math.abs(i - 5) / 7); pts.push([xx, y0 - hh]); }
      const cp = smooth([[x0 - 110, y0 + 6], ...pts, [x0 + 110, y0 + 6]]); ctx.fill(cp); ctx.stroke(cp); }
    for (const d of drops) { const v = u - d.d; if (v <= 0) continue; const x = x0 + d.x * .5 + d.vx * v, y = y0 + d.vy * v + 1100 * v * v; if (y > y0 + 20) continue;
      ctx.fillStyle = `rgba(215,238,245,${.9 * (1 - ss(.8, 1.2, v))})`; ctx.beginPath(); ctx.ellipse(x, y, d.sz * .8, d.sz, Math.atan2(d.vy + 2200 * v, d.vx), 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(110,165,185,.6)'; ctx.lineWidth = 1.2; ctx.stroke(); }
    ctx.restore(); ctx.restore();
  };
  // warmGlow(ctx, x, y, R, a): a soft round 'lighter' glow of the accent light (alpha a at the centre)
  K.warmGlow = function (ctx, x, y, R, a) { if (a <= 0) return; const g = ctx.createRadialGradient(x, y, 10, x, y, R);
    g.addColorStop(0, `rgba(255,222,150,${a})`); g.addColorStop(1, 'rgba(255,200,120,0)'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - R, y - R, 2 * R, 2 * R); ctx.restore(); };
  // cutFlash(ctx, x, y, h): a one-frame pale stroke at a cut / snap
  K.cutFlash = (ctx, x, y, h) => { ctx.strokeStyle = 'rgba(255,250,225,.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - h / 2); ctx.lineTo(x, y + h / 2); ctx.stroke(); };
  // flash(ctx, t, at, dur, a): a screen-wide pale flash at the hit
  K.flash = (ctx, t, at, dur = .3, a = .35) => { if (t >= at && t < at + dur) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,255,250,${a * (1 - (t - at) / dur)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); } };
  // warmWash(ctx, k): warm soft-light over the frame (k 0–1) once the light is in view
  K.warmWash = (ctx, k) => { if (k > 0) { ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `rgba(255,214,150,${.22 * k})`; ctx.fillRect(0, 0, W, H); ctx.restore(); } };

  /* ---------------------------------------------------------------- camera */
  K.mixCam = (a, b, k) => k <= 0 ? a : k >= 1 ? b : { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
  // layer(ctx, cm, p, fn(z)): run fn with the world transform of parallax depth p (1 = the world, < 1 farther, > 1 foreground)
  K.layer = function (ctx, cm, p, fn) { const z = 1 + (cm.z - 1) * p, cx = cm.x * p, cy = H / 2 + (cm.y - H / 2) * p; ctx.save(); ctx.setTransform(z, 0, 0, z, W / 2 - cx * z + (cm.sx || 0) * p, H / 2 - cy * z + (cm.sy || 0) * p); fn(z); ctx.restore(); };
  // shakeAt(t, at, dur, ax, ay) → [sx, sy]: the hit's camera shake, decaying over dur
  K.shakeAt = (t, at, dur = .6, ax = 16, ay = 12) => { const k = 1 - ss(at, at + dur, t); return t >= at ? [ax * k * Math.sin(t * 97), ay * k * Math.sin(t * 131 + 1)] : [0, 0]; };

  /* ---------------------------------------------------------------- post + words */
  // paperPass(ctx): cold-press paper over the whole frame (multiply .07 + soft-light .38), screen-locked
  K.paperPass = ctx => { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .07; ctx.drawImage(TX.paperM, 0, 0); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = .38; ctx.drawImage(TX.paper, 0, 0); ctx.restore(); };
  function buildPlate() {   // the end plate: cream paper, two gingham ribbons (the picnic cloth), a clover sprig and flowers
    const c = Pilot.canvas(W, H), x = c.getContext('2d');
    x.fillStyle = 'rgba(250,247,234,1)'; x.fillRect(0, 0, W, H);
    x.save(); x.globalAlpha = .25; x.fillStyle = TX.bloomPat; x.fillRect(0, 0, W, H); x.restore();
    for (const y of [600, 1290]) { const p = smooth(rough([[110, y - 22], [970, y - 22], [970, y + 22], [110, y + 22]], 3, y, 20));
      wash(x, p, '#dbe9f1', '#9fc3d8', { bloom: .25, ew: 6, pool: .4, line: '#9fc3d8', lw: 1.6 });
      x.save(); x.clip(p); x.strokeStyle = 'rgba(140,185,212,.6)'; x.lineWidth = 6; for (let xx = 120; xx < 980; xx += 22) { x.beginPath(); x.moveTo(xx, y - 30); x.lineTo(xx, y + 30); x.stroke(); }
      x.lineWidth = 6; for (const yy of [y - 11, y + 11]) { x.beginPath(); x.moveTo(100, yy); x.lineTo(980, yy); x.stroke(); } x.restore(); }
    for (const [px, py, s] of [[130, 1310, 1.1], [950, 580, .9]]) { x.drawImage(K.LS[3], px - 60 * s, py - 50 * s, 120 * s, 100 * s); }
    x.drawImage(K.flowerS, 900, 1250, 80, 80); x.drawImage(K.flowerS, 100, 540, 66, 66);
    return c;
  }
  // endPlate(ctx, t, at): the gingham end page fading in over .7 s around `at` (under the end card)
  K.endPlate = (ctx, t, at) => { const k = ss(at - .25, at + .45, t); if (k <= 0) return; ctx.save(); ctx.globalAlpha = k; ctx.drawImage(TX.plate, 0, 0); ctx.restore(); };
  // capGlow(ctx, t, lines, y): a soft wash of paper behind each caption (so words read over leaves and sky)
  K.capGlow = function (ctx, t, lines, Y = 420) {
    for (const [a, b, s0, src] of lines) {
      const al = Pilot.win(t, a, b, .35, .45); if (al <= 0) continue;
      const ls = Pilot.tr(s0).split('\n'); ctx.font = "400 76px 'Hi Melody'"; let w = Math.max(...ls.map(l => ctx.measureText(l).width));
      if (src) { ctx.font = "400 28px 'Noto Sans KR'"; w = Math.max(w, ctx.measureText(src).width); }
      const top = Y - 90, bot = Y + (ls.length - 1) * 118 + (src ? 76 + 22 : 0) + 40;
      ctx.save(); ctx.globalAlpha = al * .82; ctx.drawImage(TX.capGlow, W / 2 - w / 2 - 120, top - 50, w + 240, bot - top + 100); ctx.restore();
    }
  };
  // captions(ctx, t, lines, o): paper glow + Hi Melody captions in deep clover green at y = 420
  K.captions = function (ctx, t, lines, o = {}) {
    K.capGlow(ctx, t, lines, o.y ?? 420);
    Story.captions(ctx, t, lines, { font: K.FONT, weight: 400, size: 76, color: C.inkD, srcColor: '#3f5137', y: 420, shadow: 'rgba(252,251,242,.95)', shadowBlur: 14, ...o });
  };
  // endCard(ctx, t, card, at, o): the end card on the gingham page (y = 860, no title glow)
  K.endCard = (ctx, t, card, at, o = {}) => Story.endCard(ctx, t, card, at, { font: K.FONT, color: C.inkD, srcColor: '#46573d', y: 860, titleShadow: null, ...o });

  window.Clover = K;
})();

/* kit-flatnight.js — house style "flat vector night forest" for word-log films (global: window.Flatnight).
   Every surface is ONE flat fill of blue/indigo: no outlines, no gradients, no texture. Depth is value steps between
   parallax layers (bare trunks → tree row A → tree row B → bushes → road → a dark foreground of plants). Light is the
   style's one trick: the whole world is painted twice — a NIGHT palette and a LIT palette with the same keys — and the lit
   one shows through soft-edged discs (a lantern, a doorway, a glowing thing), with a faint warm screen on top. The figures
   are near-black hooded travellers with a pink face and mitten hands (the lab's traveller), rigged with 2-bone IK.
   One warm accent (honey wood / lantern gold); everything else is blue.
   First film: sermons/2026-10-24-cross-styles/film/scenes/cs-flatnight.html (잘라 낸 건 다리였다 · 04, the worked example).
   Style card: styles/flatnight/STYLE.md. Template: styles/flatnight/template.html.

   HOW A FRAME IS MADE
     const cm = { x, y, z, sx, sy };                         world camera (x,y = world point at the frame centre, z = zoom)
     const pass = (g, k) => {                               k = 'd' (night) or 'l' (lit) — draw the SAME world with DK / LT
       Flatnight.backdrop(g, cm, k === 'd' ? DK : LT, forest);       sky, moon, parallax forest
       Flatnight.layer(g, cm, 1, () => { road, things, figures… });    world layer (parallax 1)
     };
     pass(ctx, 'd');  Flatnight.lit(ctx, discsOnScreen, g => pass(g, 'l'));   lit world through the light discs
     overlays (outline, hit ring) → Flatnight.foreground → Flatnight.endPlate → Flatnight.captions → Flatnight.endCard
   World units = px at zoom 1 (the 1080×1920 frame; ground of the road at y ≈ 1212–1300). Pure functions of their
   arguments; seeded randomness only (Pilot.rng); no network, no images. The two offscreen canvases are made in init().
   Load after lib.js and story.js. */
(function () {
  const { clamp, lerp, ss, eo, eio, rng } = Pilot;
  const TAU = Math.PI * 2;
  const N = {};
  let OFF = null, MSK = null;

  /* ---------------------------------------------------------------- palette, type, body */
  // night palette (DK) and lit palette (LT, what shows inside a light disc) — same keys; draw the world once with each
  N.DK = { sky: '#131c81', trunk: '#151878', trunk2: '#14146f', hill: '#121a76', hill2: '#14146f',
    rowA: '#17209a', rowAm: '#1a2ab4', rowAb: '#121777', rowB: '#152ec3', rowBm: '#1b5af4', rowBb: '#101c8e',
    ground: '#14115f', bush: '#1826b4', bush2: '#131a7c', sprout: '#14146f',
    road: '#14115f', road2: '#110d55', tuft: '#18157a', chasm: '#0b0842', chasm2: '#070530', deep: '#020114', gate: '#1b2192', gate2: '#151a7c', spill: '#1d1f8a' };
  N.LT = { sky: '#2939ff', trunk: '#2632ee', trunk2: '#2530e4', hill: '#2a34ea', hill2: '#2730dc',
    rowA: '#2c3ff8', rowAm: '#3550ff', rowAb: '#2633e2', rowB: '#3249ff', rowBm: '#4f74ff', rowBb: '#2836e6',
    ground: '#282ade', bush: '#2e44f5', bush2: '#2a37e8', sprout: '#2531d8',
    road: '#282ade', road2: '#2326cc', tuft: '#3040f0', chasm: '#1a1cb4', chasm2: '#121288', deep: '#07063e', gate: '#3c4fff', gate2: '#3141f0', spill: '#5a6cff' };
  N.FG = { dark: '#130a53', dark2: '#0c0642', mark: '#1c1676', ground: '#18146b', ground2: '#120d58', plant: '#0e0848', plant2: '#0a053a' };   // the dark foreground (never lit)
  N.RED = '#ff2d5a'; N.RED2 = '#c8164a'; N.PINK = '#ec99d4'; N.PINK2 = '#d27cbd';
  N.FLAME = '#ffe6f2'; N.GLASS = '#ffd1e3';                       // doorway core / dashed outline
  N.WARM = '255,176,90';                                          // rgb of the warm screen inside lit discs
  N.WOOD = { a: '#e0a052', b: '#a8642a', c: '#f8d394', grain: '#c07c3a' };   // THE warm accent (honey wood / lantern gold): body, shade, highlight, grain
  N.WOOD_COLD = { l: { a: '#5a24a8', b: '#3b137a', c: '#7a3ccc' }, d: { a: '#2f1272', b: '#220b58', c: '#3f1a8a' } };   // a quiet purple wood for everyone else ([k] = lit/dark)
  // figures: the hooded traveller. [k] = 'l' (lit) / 'd' (night). c cloak, c2 cloak edge, cd far arm / hood back, face, hand2 thumb,
  // fr hood rim, leg / leg2 far / near leg, eye. `me` is the hero (pink face), `other` the quieter crowd (lilac face).
  N.FIG = {
    me: { l: { c: '#0c0936', c2: '#25309e', cd: '#06041f', face: '#ec99d4', hand2: '#d27cbd', fr: '#3a4cff', leg: '#04031a', leg2: '#080626', eye: '#3b1366' },
          d: { c: '#08062a', c2: '#18207a', cd: '#040316', face: '#8a5aa8', hand2: '#744a90', fr: '#2433b0', leg: '#030212', leg2: '#05041c', eye: '#1a0a3a' } },
    other: { l: { c: '#0e0b40', c2: '#1d2690', cd: '#07052a', face: '#c4b4ee', hand2: '#a594d8', fr: '#3d5cf0', leg: '#05041c', leg2: '#08062a', eye: '#2a1a66' },
             d: { c: '#07051f', c2: '#10145a', cd: '#040312', face: '#6556b4', hand2: '#544698', fr: '#1c26a0', leg: '#030210', leg2: '#05041a', eye: '#120a3a' } } };
  N.figPal = (o = {}) => ({ l: { ...N.FIG.me.l, ...(o.l || o) }, d: { ...N.FIG.me.d, ...(o.d || {}) } });   // a recoloured traveller (e.g. { face: '#…' })
  N.FONT = "'Noto Sans KR',sans-serif";
  N.FONTS = ["700 62px 'Noto Sans KR'", "500 34px 'Noto Sans KR'", "400 28px 'Noto Sans KR'"];   // for Pilot.run({fonts})
  N.BODY = { HIPH: 124, LEG1: 74, LEG2: 70, ARM1: 70, ARM2: 68 };   // the traveller at s = 1 (px): hip height, thigh, shin, upper arm, forearm
  const BD = N.BODY;

  /* ---------------------------------------------------------------- init */
  // init(): the two full-frame offscreen canvases for the lit pass (W×H of the film). Call once from the scene's init().
  N.init = function () { OFF = Pilot.canvas(Pilot.W, Pilot.H); MSK = Pilot.canvas(Pilot.W, Pilot.H); };

  /* ---------------------------------------------------------------- flat shapes (fill with ctx.fillStyle set by the caller unless a colour is passed) */
  // leaf(ctx, x, y, len, wid, ang): a pointed leaf (two quadratic curves), centred at x,y, long axis at angle ang (0 = vertical). Fills.
  N.leaf = function (ctx, x, y, len, wid, ang) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(0, -len / 2);
    ctx.quadraticCurveTo(wid, 0, 0, len / 2); ctx.quadraticCurveTo(-wid, 0, 0, -len / 2); ctx.fill(); ctx.restore();
  };
  // drop(ctx, cx, cy, r, tx, ty, bulge): adds a teardrop sub-path (circle r at cx,cy pulled to a tip at tx,ty) — no fill.
  N.drop = function (ctx, cx, cy, r, tx, ty, bulge = .32) {
    const a = Math.atan2(ty - cy, tx - cx), d = Math.hypot(tx - cx, ty - cy), be = Math.acos(clamp(r / d, -1, 1));
    const p1 = [cx + r * Math.cos(a + be), cy + r * Math.sin(a + be)], p2 = [cx + r * Math.cos(a - be), cy + r * Math.sin(a - be)];
    const ctl = (p, sgn) => { const mx = (p[0] + tx) / 2, my = (p[1] + ty) / 2, dx = p[0] - tx, dy = p[1] - ty, Ln = Math.hypot(dx, dy);
      return [mx + sgn * -dy / Ln * Ln * bulge, my + sgn * dx / Ln * Ln * bulge]; };
    const c1 = ctl(p1, -1), c2 = ctl(p2, 1);
    ctx.moveTo(tx, ty); ctx.quadraticCurveTo(c1[0], c1[1], p1[0], p1[1]); ctx.arc(cx, cy, r, a + be, a - be + TAU);
    ctx.quadraticCurveTo(c2[0], c2[1], tx, ty); ctx.closePath();
  };
  function crownTiers(cx, top, h, w, n) {
    const T = [{ c: [cx, top + h * .34], r: w * .25, tip: [cx, top] }];
    for (let i = 1; i < n; i++) { const f = i / (n - 1 || 1);
      for (const s of [-1, 1]) T.push({ c: [cx + s * w * lerp(.25, .29, f), top + h * lerp(.53, .79, f)], r: w * lerp(.18, .21, f),
        tip: [cx + s * w * lerp(.47, .53, f), top + h * lerp(.25, .50, f)], s, i }); }
    return T;
  }
  // tree(ctx, cx, ground, h, w, n, c, seed): the lab's leafy tree — a crown of n teardrop tiers on a tapering trunk, a
  // branch arc, a few leaf marks. c = { crown, mark, branch } colours. h = height above ground, w = crown width (px).
  N.tree = function (ctx, cx, ground, h, w, n, c, seed) {
    const r = rng(seed), ch = Math.min(h * .62, w * 1.55), top = ground - h;
    const T = crownTiers(cx, top, ch, w, n);
    ctx.fillStyle = c.crown; ctx.beginPath();
    for (const l of T) N.drop(ctx, l.c[0], l.c[1], l.r, l.tip[0], l.tip[1]);
    ctx.ellipse(cx, top + ch * .70, w * .2, ch * .28, 0, 0, TAU); ctx.fill('nonzero');
    ctx.fillStyle = c.branch; const tw = w * .06;
    ctx.beginPath(); ctx.moveTo(cx - tw, ground); ctx.lineTo(cx - tw * .5, top + ch * .30); ctx.arc(cx, top + ch * .30, tw * .5, Math.PI, 0); ctx.lineTo(cx + tw, ground); ctx.fill();
    ctx.strokeStyle = c.branch; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(4, w * .035);
    const yb = top + ch * .80;
    ctx.beginPath(); ctx.moveTo(cx - w * .26, yb - ch * .07); ctx.quadraticCurveTo(cx, yb + ch * .09, cx + w * .26, yb - ch * .07); ctx.stroke();
    if (n > 2) { const s = r() < .5 ? -1 : 1, ym = top + ch * .55;
      ctx.beginPath(); ctx.moveTo(cx, ym + ch * .04); ctx.quadraticCurveTo(cx + s * w * .10, ym + ch * .03, cx + s * w * .12, ym - ch * .05); ctx.stroke(); }
    ctx.fillStyle = c.mark;
    for (const l of T) { if (!l.s || r() < .3) continue;
      const a = Math.atan2(l.tip[1] - l.c[1], l.tip[0] - l.c[0]);
      N.leaf(ctx, lerp(l.c[0], l.tip[0], .3), lerp(l.c[1], l.tip[1], .3), w * .10, w * .04, a + Math.PI / 2); }
    if (r() < .7) N.leaf(ctx, cx + w * .1, top + ch * .38, w * .09, w * .036, .6);
  };
  // trunk(ctx, x, w, col, seed, top, ground): a bare flat trunk (x centre, w wide) from top to ground with 3 curved twigs (twig y 200–1000).
  N.trunk = function (ctx, x, w, col, seed, top, ground) {
    const r = rng(seed); ctx.fillStyle = col; ctx.fillRect(x - w / 2, top, w, ground - top);
    ctx.strokeStyle = col; ctx.lineWidth = w * .45; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const y = 200 + r() * 800, s = r() < .5 ? -1 : 1, Ln = w * (1.2 + r() * 1.6);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * Ln * .9, y - Ln * .1, x + s * Ln, y - Ln * .8); ctx.stroke(); }
  };
  // bush(ctx, x, y, w, h, col): a three-lobed flat bush sitting on y (x = centre).
  N.bush = function (ctx, x, y, w, h, col) {
    ctx.fillStyle = col; ctx.beginPath(); const n = 3; ctx.moveTo(x - w / 2, y);
    for (let i = 0; i < n; i++) { const a = x - w / 2 + w * i / n, b = a + w / n, hh = h * (i === 1 ? 1 : .72); ctx.bezierCurveTo(a, y - hh * 1.2, b, y - hh * 1.2, b, y); }
    ctx.closePath(); ctx.fill();
  };
  // sprout(ctx, x, y, s, col, sway): a small three-leaf sprout standing on x,y (≈ 60·s px tall); sway −1..1 bends it.
  N.sprout = function (ctx, x, y, s, col, sway = 0) {
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x, y - 20 * s, x + sway * 10 * s, y - 34 * s); ctx.stroke();
    N.leaf(ctx, x + sway * 10 * s, y - 46 * s, 28 * s, 11 * s, sway * .2);
    N.leaf(ctx, x - 14 * s + sway * 4 * s, y - 24 * s, 26 * s, 10 * s, -1.0 + sway * .2);
    N.leaf(ctx, x + 14 * s + sway * 4 * s, y - 24 * s, 26 * s, 10 * s, 1.0 + sway * .2);
  };
  // clump(ctx, x, y, s, col, sway, seed): a fan of five long blades (grass / fern) rooted at x,y, ≈ 90–150·s px long.
  N.clump = function (ctx, x, y, s, col, sway, seed) {
    const r = rng(seed); ctx.fillStyle = col;
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .42 + (r() - .5) * .2 + sway * .06, Ln = s * (90 + r() * 60);
      const tx = x + Math.cos(a) * Ln, ty = y + Math.sin(a) * Ln, nx = -Math.sin(a), ny = Math.cos(a), wd = s * 20;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a) * Ln * .5 + nx * wd, y + Math.sin(a) * Ln * .5 + ny * wd, tx + (i - 2) * s * 10, ty + s * 6);
      ctx.quadraticCurveTo(x + Math.cos(a) * Ln * .5 - nx * wd, y + Math.sin(a) * Ln * .5 - ny * wd, x, y); ctx.fill(); }
  };
  // hillY(x, base, amps): the height of a gentle sine hill at x; amps = [[amplitude, period, phase], …].
  N.hillY = (x, base, amps) => base + amps.reduce((s, [a, per, ph]) => s + a * Math.sin(TAU * x / per + ph), 0);
  // hill(ctx, x0, x1, base, amps, col): fills everything below the hill line between x0 and x1 (8-px steps).
  N.hill = function (ctx, x0, x1, base, amps, col) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0, 4000);
    for (let x = Math.floor(x0 / 8) * 8; x <= x1 + 8; x += 8) ctx.lineTo(x, N.hillY(x, base, amps)); ctx.lineTo(x1 + 8, 4000); ctx.fill();
  };

  /* ---------------------------------------------------------------- the parallax forest */
  // forest(seed = 5, o): builds the four background layers once (call in init). o.from / o.to = world x range (default
  // −2600…5200), o.maxEyes (40). Returns { layers: [{ id, p, items }], eyes: [{x, y, s, seed}] } — p = parallax factor.
  // Layer ground lines: trunks/hill 1080–1100, row A 1118, row B 1162, bushes 1212 (= the far edge of the road).
  N.forest = function (seed = 5, o = {}) {
    const layers = [{ id: 'trunks', p: .22, items: [] }, { id: 'rowA', p: .38, items: [] }, { id: 'rowB', p: .58, items: [] }, { id: 'mid', p: .82, items: [] }];
    const eyes = [], r = rng(seed), from = o.from ?? -2600, to = o.to ?? 5200, maxE = o.maxEyes ?? 40;
    for (const Ly of layers) {
      let x = from; const it = Ly.items;
      while (x < to) {
        if (Ly.id === 'trunks') { it.push({ k: 'trunk', x, w: 12 + r() * 20, c: r() < .5 ? 'trunk' : 'trunk2', seed: 100 + it.length }); x += 70 + r() * 90; }
        if (Ly.id === 'rowA') { it.push({ k: 'tree', x, g: 1118, h: 520 + r() * 90, w: 190 + r() * 40, n: 3, seed: 300 + it.length }); x += 230 + r() * 110; }
        if (Ly.id === 'rowB') { it.push({ k: 'tree', x, g: 1162, h: 760 + r() * 120, w: 280 + r() * 50, n: 4, seed: 500 + it.length });
          if (r() < .6) it.push({ k: 'bush', x: x + 150 + r() * 60, y: 1160, w: 150, h: 46, c: 'bush2' }); x += 330 + r() * 170; }
        if (Ly.id === 'mid') { const k = r();
          if (k < .3) it.push({ k: 'trunkM', x, w: 26 + r() * 10, seed: 700 + it.length });
          it.push({ k: 'bush', x: x + 60, y: 1212, w: 170 + r() * 70, h: 52 + r() * 14, c: 'bush' });
          if (r() < .5) it.push({ k: 'bush', x: x + 170, y: 1214, w: 120, h: 36, c: 'bush2' });
          if (r() < .4 && eyes.length < maxE) eyes.push({ x: x + 60, y: 1196, s: 1.4, seed: eyes.length * 7 + 3 });
          x += 260 + r() * 160; }
      }
    }
    return { layers, eyes };
  };
  // drawLayer(ctx, Ly, C, x0, x1): one forest layer in palette C (DK or LT), only items between x0 and x1 (layer coords).
  N.drawLayer = function (ctx, Ly, C, x0, x1) {
    const id = Ly.id;
    if (id === 'trunks') { for (const o of Ly.items) if (o.x > x0 - 80 && o.x < x1 + 80) N.trunk(ctx, o.x, o.w, C[o.c], o.seed, -1400, 1100);
      N.hill(ctx, x0, x1, 1080, [[16, 900, .4], [8, 430, 1.7]], C.hill); }
    if (id === 'rowA') { const c = { crown: C.rowA, mark: C.rowAm, branch: C.rowAb };
      for (const o of Ly.items) if (o.x > x0 - 200 && o.x < x1 + 200) N.tree(ctx, o.x, o.g, o.h, o.w, o.n, c, o.seed);
      N.hill(ctx, x0, x1, 1120, [[10, 700, 2.1], [5, 260, .3]], C.hill2); }
    if (id === 'rowB') { const c = { crown: C.rowB, mark: C.rowBm, branch: C.rowBb };
      for (const o of Ly.items) if (o.x > x0 - 260 && o.x < x1 + 260) { if (o.k === 'tree') N.tree(ctx, o.x, o.g, o.h, o.w, o.n, c, o.seed); else N.bush(ctx, o.x, o.y, o.w, o.h, C[o.c]); }
      N.hill(ctx, x0, x1, 1162, [[10, 800, 2.1], [5, 300, .3]], C.hill2); }
    if (id === 'mid') {
      for (const o of Ly.items) if (o.x > x0 - 200 && o.x < x1 + 200) { if (o.k === 'trunkM') N.trunk(ctx, o.x, o.w, C.ground, o.seed, -1400, 1220); }
      for (const o of Ly.items) if (o.x > x0 - 200 && o.x < x1 + 200) { if (o.k === 'bush') N.bush(ctx, o.x, o.y, o.w, o.h, C[o.c]); }
      N.hill(ctx, x0, x1, 1214, [[6, 600, .9], [3, 210, 2.4]], C.ground);
    }
  };
  // backdrop(g, cm, C, forest, o): the sky fill, every forest layer at its parallax, and the moon (after the trunk layer,
  // so the trees cross in front of it). o.moon = [x, y] screen px or false (default [318, 196]).
  N.backdrop = function (g, cm, C, forest, o = {}) {
    g.fillStyle = C.sky; g.fillRect(0, 0, Pilot.W, Pilot.H);
    const mo = o.moon === undefined ? [318, 196] : o.moon;
    for (const Ly of forest.layers) { N.layer(g, cm, Ly.p, (x0, x1) => N.drawLayer(g, Ly, C, x0, x1)); if (Ly.id === 'trunks' && mo) N.moon(g, mo[0], mo[1]); }
  };
  // moon(ctx, x, y): a flat white crescent on the screen (x, y = centre of the bite, px).
  N.moon = function (ctx, x = 318, y = 196) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, Pilot.W, 600); ctx.arc(x, y, 34, 0, TAU); ctx.clip('evenodd');
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x - 20, y + 15, 36, 0, TAU); ctx.fill(); ctx.restore();
  };
  // eyes(ctx, t, cm, eyes, p = .82): pairs of white eyes blinking and glancing in the dark bushes (the lab's). Night pass only.
  N.eyes = function (ctx, t, cm, eyes, p = .82) {
    const T = N.layerT(cm, p);
    for (const e of eyes) { const sx = T.e + e.x * T.z; if (sx < -40 || sx > Pilot.W + 40) continue; const sy = T.f + e.y * T.z, s = e.s * T.z, r = rng(e.seed);
      const period = 1.7 + r() * .9, ph = r() * period, bt = ((t + ph) % period), closed = bt < .12 ? 1 - Math.abs(bt - .06) / .06 : 0, look = Math.round(Math.sin(t * .9 + e.seed) * 2);
      ctx.fillStyle = '#ffffff';
      for (const sg of [-1, 1]) { const ex = sx + sg * 15 * s + look, h = 7 * s * (1 - closed) + 1;
        ctx.beginPath(); ctx.moveTo(ex - 8 * s, sy); ctx.quadraticCurveTo(ex, sy - h * 1.4, ex + 8 * s, sy + sg * -3 * s * (1 - closed)); ctx.quadraticCurveTo(ex, sy + h * .5, ex - 8 * s, sy); ctx.fill(); } }
  };
  // foreground(ctx, cm, t, o): the dark foreground at parallax 1.45 — a wavy ground at y ≈ 1700 and swaying plants every
  // 320 px (clumps and sprouts). o.y moves the ground line (layer coords), o.p the parallax.
  N.foreground = function (ctx, cm, t, o = {}) {
    const y0 = o.y ?? 1700, FG = N.FG;
    N.layer(ctx, cm, o.p ?? 1.45, (x0, x1) => {
      ctx.fillStyle = FG.ground; ctx.beginPath(); ctx.moveTo(x0 - 10, 4000);
      for (let x = Math.floor(x0 / 8) * 8; x <= x1 + 8; x += 8) ctx.lineTo(x, y0 + 18 * Math.sin(x / 160) + 9 * Math.sin(x / 53 + 1)); ctx.lineTo(x1 + 10, 4000); ctx.fill();
      for (let x = Math.floor(x0 / 320) * 320; x < x1 + 320; x += 320) { const sw = Math.sin(t * 1.7 + x * .01), q = (x / 320) & 3;
        if (q === 0) N.clump(ctx, x + 40, y0 + 60, 1.3, FG.plant, sw, 5); else if (q === 1) N.sprout(ctx, x + 60, y0 + 30, 1.8, FG.plant, -sw * .5);
        else if (q === 2) N.clump(ctx, x + 120, y0 + 70, .9, FG.plant, -sw, 8); else N.sprout(ctx, x + 10, y0 + 20, 1.3, FG.plant, sw * .5); }
    });
  };
  // fireflies(ctx, t, cm, o): little flat warm dots drifting over the road (ambient for a wait). o = { n: 14, seed: 9,
  // x0, x1 (world x range), y0, y1 (world y range), lit: 0..1 (brighter), p: parallax }. Night pass or overlay.
  N.fireflies = function (ctx, t, cm, o = {}) {
    const n = o.n ?? 14, r = rng(o.seed ?? 9), x0 = o.x0 ?? -400, x1 = o.x1 ?? 1400, y0 = o.y0 ?? 900, y1 = o.y1 ?? 1250;
    N.layer(ctx, cm, o.p ?? 1, () => {
      for (let i = 0; i < n; i++) { const bx = lerp(x0, x1, r()), by = lerp(y0, y1, r()), ph = r() * TAU, sp = .25 + r() * .35;
        const x = bx + 60 * Math.sin(t * sp + ph), y = by + 26 * Math.sin(t * sp * 1.7 + ph * 2), on = .5 + .5 * Math.sin(t * (1.3 + r()) + ph * 3);
        if (on < .25) continue;
        ctx.fillStyle = `rgba(255,214,150,${(.35 + .5 * on) * (o.alpha ?? 1)})`; ctx.beginPath(); ctx.arc(x, y, 3.2 + 1.6 * on, 0, TAU); ctx.fill(); }
    });
  };

  /* ---------------------------------------------------------------- camera */
  // A camera is { x, y, z, sx, sy }: world point at the frame centre, zoom, screen shake px. Parallax p scales the move.
  // layerT(cm, p) → { z, e, f, cx }: the transform of a layer with parallax p (screen = e + x·z, f + y·z).
  N.layerT = function (cm, p) { const z = 1 + (cm.z - 1) * p, cx = cm.x * p, cy = 960 + (cm.y - 960) * p; return { z, e: 540 - cx * z + (cm.sx || 0) * p, f: 960 - cy * z + (cm.sy || 0) * p, cx }; };
  // layer(ctx, cm, p, fn): draw fn(x0, x1) in a layer's coordinates (x0..x1 = the visible layer x range).
  N.layer = function (ctx, cm, p, fn) { const T = N.layerT(cm, p); ctx.save(); ctx.setTransform(T.z, 0, 0, T.z, T.e, T.f); fn((0 - T.e) / T.z, (Pilot.W - T.e) / T.z); ctx.restore(); };
  // toScreen(cm, x, y) → [sx, sy]: a world point (parallax 1) on the screen.
  N.toScreen = (cm, x, y) => [540 + (x - cm.x) * cm.z + (cm.sx || 0), 960 + (y - cm.y) * cm.z + (cm.sy || 0)];
  // mixCam(a, b, k): blend two cameras (x, y, z; shake is set after). k ≤ 0 → a, ≥ 1 → b.
  N.mixCam = (a, b, k) => k <= 0 ? a : k >= 1 ? b : { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
  // shake(t, at, dur = .55, ax = 15, ay = 11) → [sx, sy]: the hit's screen shake, decaying over dur s after `at`.
  N.shake = function (t, at, dur = .55, ax = 15, ay = 11) { const k = 1 - ss(at, at + dur, t); return t >= at ? [ax * k * Math.sin(t * 97), ay * k * Math.sin(t * 131 + 1)] : [0, 0]; };

  /* ---------------------------------------------------------------- light: the lit world through soft discs */
  // discs(cm, D) → screen discs: D = [{ x, y, r, warm }] in world coords → [{ x, y, r·z, warm }].
  N.discs = (cm, D) => D.map(d => { const [x, y] = N.toScreen(cm, d.x, d.y); return { x, y, r: d.r * cm.z, warm: d.warm }; });
  // lit(ctx, D, paint): D = screen discs; paint(g) draws the LIT world into the offscreen g. The lit world shows through
  // radial pools (solid to 45 % of r, soft to r), then a faint warm screen (rgba N.WARM, .22·warm) on discs with warm > 0.
  N.lit = function (ctx, D, paint) {
    if (!D.length) return;
    const o = OFF.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1; paint(o);
    const m = MSK.getContext('2d'); m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, Pilot.W, Pilot.H); m.globalCompositeOperation = 'lighter';
    for (const d of D) if (d.r > 2) { const g = m.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.45, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      m.fillStyle = g; m.fillRect(d.x - d.r, d.y - d.r, 2 * d.r, 2 * d.r); }
    o.globalCompositeOperation = 'destination-in'; o.drawImage(MSK, 0, 0); o.globalCompositeOperation = 'source-over';
    ctx.drawImage(OFF, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (const d of D) if (d.warm && d.r > 2) { const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * .8); g.addColorStop(0, `rgba(${N.WARM},${.22 * d.warm})`); g.addColorStop(1, `rgba(${N.WARM},0)`);
      ctx.fillStyle = g; ctx.fillRect(d.x - d.r, d.y - d.r, 2 * d.r, 2 * d.r); }
    ctx.restore();
  };
  // warmBar(ctx, x0, x1, y, h, k, fl): a warm glowing strip (an accent piece lighting up): body x0..x1 centred on y,
  // h tall, alpha k, flash fl ≥ 1 (1 = steady), plus an additive halo. World coords inside a layer.
  N.warmBar = function (ctx, x0, x1, y, h, k, fl = 1) {
    ctx.save(); ctx.globalAlpha = k;
    ctx.fillStyle = `rgba(255,200,124,${Math.min(.92, .62 * fl)})`; ctx.beginPath(); ctx.roundRect(x0, y - h / 2, x1 - x0, h, 4); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient((x0 + x1) / 2, y, 4, (x0 + x1) / 2, y, 80);
    g.addColorStop(0, `rgba(255,170,80,${.42 * fl})`); g.addColorStop(1, 'rgba(255,170,80,0)'); ctx.fillStyle = g; ctx.fillRect(x0 - 80, y - 80, x1 - x0 + 160, 160);
    ctx.restore();
  };
  // halo(ctx, x, y, r, a): an additive warm halo (world coords) — for a glowing seed, a lantern, a sprout.
  N.halo = function (ctx, x, y, r, a = 1) {
    if (r <= 1 || a <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, `rgba(255,170,80,${.5 * a})`); g.addColorStop(1, 'rgba(255,170,80,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore();
  };

  /* ---------------------------------------------------------------- world pieces */
  // road(ctx, C, x0, x1, o): the road from x0 to x1 (world): far band from o.top (1212) down, near band from o.near (1370).
  // o.gap = [x, w] cuts a chasm: walls stepping into the dark (C.chasm, C.chasm2, C.deep), lips with an overhang;
  // o.inGap() is called after the dark is filled and before the walls (for things falling between them). Tufts on the far edge.
  N.road = function (ctx, C, x0, x1, o = {}) {
    const RT = o.top ?? 1212, NY = o.near ?? 1370, gp = o.gap, E = gp ? gp[0] : 0, G = gp ? gp[1] : 0;
    if (gp) {
      ctx.fillStyle = C.deep; ctx.fillRect(E, RT, G, 3000);
      if (o.inGap) o.inGap();
      const wall = (side, col, inset, y0, slope) => { const r = rng(side > 0 ? 71 : 73), q = []; const xe = side > 0 ? E : E + G;
        q.push([xe, y0 - 6]); for (let y = y0; y <= 3200; y += 46) { const w = Math.min(G / 2 - 6, inset + r() * 16 + (y - y0) * slope); q.push([xe + side * w, y], [xe + side * w, y + 23]); }
        q.push([xe, 3200]); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(...q[0]); for (const p of q.slice(1)) ctx.lineTo(...p); ctx.closePath(); ctx.fill(); };
      wall(1, C.chasm2, 26, RT + 10, .55); wall(-1, C.chasm2, 26, RT + 10, .55); wall(1, C.chasm, 8, RT + 10, .24); wall(-1, C.chasm, 8, RT + 10, .24);
    }
    for (const [a, b] of (gp ? [[x0 - 20, E], [E + G, x1 + 20]] : [[x0 - 20, x1 + 20]])) { if (b <= a) continue;
      ctx.fillStyle = C.road; ctx.fillRect(a, RT, b - a, 3000);
      ctx.fillStyle = C.road2; ctx.fillRect(a, NY, b - a, 3000); }
    if (gp) {
      ctx.fillStyle = C.road; ctx.beginPath(); ctx.moveTo(E - 2, RT); ctx.lineTo(E + 16, RT); ctx.quadraticCurveTo(E + 18, RT + 18, E, RT + 34); ctx.fill();
      ctx.beginPath(); ctx.moveTo(E + G + 2, RT); ctx.lineTo(E + G - 16, RT); ctx.quadraticCurveTo(E + G - 18, RT + 18, E + G, RT + 34); ctx.fill();
    }
    ctx.fillStyle = C.tuft;
    for (let x = Math.floor(x0 / 90) * 90; x < x1 + 90; x += 90) { const xx = x + 30 * Math.sin(x * .7); if (gp && xx > E - 30 && xx < E + G + 30) continue;
      N.leaf(ctx, xx, RT + 2, 30, 10, -.4); N.leaf(ctx, xx + 12, RT, 36, 11, .25); }
  };
  // gate(ctx, C, x, gy, inner): a plain stone arch (posts r 140 / 96 px, 300 px to the spring) with hedges, standing on gy.
  // inner = true draws ONLY the doorway's light (spill on the road, glowing arch core) — draw inner, then what walks in it, then the arch.
  N.gate = function (ctx, C, x, gy, inner) {
    const ay = gy - 300;
    const arch = r => { ctx.beginPath(); ctx.moveTo(x - r, gy); ctx.lineTo(x - r, ay); ctx.arc(x, ay, r, Math.PI, TAU); ctx.lineTo(x + r, gy); ctx.closePath(); };
    if (inner) {
      ctx.fillStyle = C.spill; ctx.beginPath(); ctx.moveTo(x - 92, gy); ctx.lineTo(x + 92, gy); ctx.lineTo(x + 170, gy + 70); ctx.lineTo(x - 210, gy + 70); ctx.fill();
      ctx.fillStyle = '#ff9cc4'; arch(96); ctx.fill(); ctx.fillStyle = N.FLAME; arch(80); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x, gy - 120, 34, 110, 0, 0, TAU); ctx.fill();
      return; }
    ctx.fillStyle = C.gate; ctx.beginPath(); ctx.moveTo(x - 140, gy); ctx.lineTo(x - 140, ay); ctx.arc(x, ay, 140, Math.PI, TAU); ctx.lineTo(x + 140, gy); ctx.lineTo(x + 96, gy); ctx.lineTo(x + 96, ay); ctx.arc(x, ay, 96, 0, Math.PI, true); ctx.lineTo(x - 96, gy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.gate2; ctx.beginPath(); ctx.moveTo(x + 140, gy); ctx.lineTo(x + 140, ay); ctx.arc(x, ay, 140, 0, -.9, true); ctx.lineTo(x + Math.cos(-.9) * 118, ay + Math.sin(-.9) * 118); ctx.arc(x, ay, 118, -.9, 0); ctx.lineTo(x + 118, gy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.gate; ctx.fillRect(x - 156, gy - 26, 60, 26); ctx.fillRect(x + 96, gy - 26, 60, 26);
    ctx.fillStyle = C.gate2; ctx.beginPath(); ctx.arc(x, ay - 140, 10, 0, TAU); ctx.fill();
    N.bush(ctx, x - 250, gy, 190, 60, C.bush); N.bush(ctx, x + 260, gy, 210, 66, C.bush); N.bush(ctx, x + 400, gy, 150, 44, C.bush2);
  };
  // dashed(ctx, pts, t, al, clip): a closed outline of what is missing / promised: pale fill + marching dashes (GLASS),
  // clipped to clip = [x, y, w, h] (grow w to draw it on). World coords inside a layer.
  N.dashed = function (ctx, pts, t, al, clip) {
    const p = new Path2D(); p.moveTo(...pts[0]); for (const q of pts.slice(1)) p.lineTo(...q); p.closePath();
    ctx.save(); ctx.globalAlpha = al; if (clip) { ctx.beginPath(); ctx.rect(...clip); ctx.clip(); }
    ctx.fillStyle = 'rgba(255,209,227,.16)'; ctx.fill(p);
    ctx.setLineDash([16, 10]); ctx.lineDashOffset = -t * 18; ctx.lineWidth = 5; ctx.strokeStyle = N.GLASS; ctx.stroke(p); ctx.setLineDash([]);
    ctx.restore();
  };
  // hitRing(ctx, t, at, x, y, o): THE hit — a hard flash ring expanding from x,y (r 60 → 580) over o.dur (.22 s) after `at`.
  N.hitRing = function (ctx, t, at, x, y, o = {}) {
    const dur = o.dur ?? .22; if (t < at || t >= at + dur) return;
    const u = (t - at) / dur; ctx.strokeStyle = o.color || N.FLAME; ctx.lineWidth = 10 * (1 - u) + 2; ctx.beginPath(); ctx.arc(x, y, 60 + 520 * eo(u), 0, TAU); ctx.stroke();
  };
  // endPlate(ctx, t, at): the night closes in for the end card (flat dark indigo, .84) and the moon comes back.
  N.endPlate = function (ctx, t, at) {
    const ke = ss(at - .2, at + .35, t);
    if (ke > 0) { ctx.fillStyle = `rgba(12,8,62,${.84 * ke})`; ctx.fillRect(0, 0, Pilot.W, Pilot.H); if (ke > .5) { ctx.save(); ctx.globalAlpha = (ke - .5) * 2; N.moon(ctx); ctx.restore(); } }
  };
  // captions(ctx, t, lines, o) / endCard(ctx, t, card, at, o): Story.captions / Story.endCard in the style's type
  // (Noto Sans KR 700, pale periwinkle on a deep indigo shadow; captions at y 420, end card at y 860). o overrides.
  N.captions = (ctx, t, lines, o = {}) => Story.captions(ctx, t, lines, { font: N.FONT, weight: 700, color: '#e4e7ff', srcColor: '#c3c9ff', y: 420, shadow: 'rgba(8,4,52,.8)', shadowBlur: 16, ...o });
  N.endCard = (ctx, t, card, at, o = {}) => Story.endCard(ctx, t, card, at, { font: N.FONT, color: '#eef0ff', srcColor: '#b9c1ff', y: 860, titleShadow: 'rgba(0,0,0,.35)', ...o });

  /* ---------------------------------------------------------------- long things: a cross / plank / pole */
  // A long object is described by a geometry g = { L, PW, CBX, CBW, CBH, CBHL }: length along its axis (foot at u = 0, top
  // at u = L), width, and an optional crossbar at u = CBX (CBW thick, half-length CBH upright / CBHL lying — lying flat
  // the bar is foreshortened). CBW = 0 → a plain plank / pole. Its placement is X = { x, y, a, u0, lie }: foot point,
  // angle, cut-off start u0 (0 = whole), lying flag.
  N.crossGeo = (o = {}) => ({ L: 520, PW: 36, CBX: 442, CBW: 34, CBH: 86, CBHL: 40, ...o });
  // cross(ctx, K, g, u0, u1, x, y, a, lying, alpha): draws the part u0..u1 of a long object in flat wood K = { a body,
  // b shade, c highlight, grain? } — a shade strip, a 4-px highlight, optional grain strokes, fresh pale cut faces.
  N.cross = function (ctx, K, g, u0, u1, x, y, a, lying, alpha = 1) {
    if (u1 - u0 < .5 || alpha <= 0) return;
    const { L, PW, CBX, CBW } = g, hb = lying ? g.CBHL : g.CBH;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); if (alpha < 1) ctx.globalAlpha *= alpha;
    ctx.beginPath(); ctx.rect(u0, -hb - 6, u1 - u0, 2 * hb + 12); ctx.clip();
    ctx.fillStyle = K.a; ctx.beginPath(); ctx.roundRect(0, -PW / 2, L, PW, 5); if (CBW) ctx.roundRect(CBX - CBW / 2, -hb, CBW, 2 * hb, 5); ctx.fill();
    ctx.fillStyle = K.b; ctx.beginPath(); ctx.rect(0, PW / 2 - 9, L, 9); if (CBW) ctx.rect(CBX + CBW / 2 - 9, -hb + 4, 9, 2 * hb - 8); ctx.fill();
    ctx.fillStyle = K.c; ctx.beginPath(); ctx.rect(8, -PW / 2 + 5, L - 16, 4); ctx.fill();
    if (K.grain) { ctx.strokeStyle = K.grain; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(30, -2); ctx.lineTo(CBX - 40, -2); ctx.moveTo(60, 6); ctx.lineTo(CBX - 70, 6); ctx.moveTo(CBX + 30, 1); ctx.lineTo(L - 16, 1); ctx.stroke();
      ctx.fillStyle = K.grain; for (const u of [150, 330]) { ctx.beginPath(); ctx.ellipse(u, 1, 7, 3.5, 0, 0, TAU); ctx.fill(); } }
    ctx.fillStyle = K.c;
    if (u0 > .5) ctx.fillRect(u0, -PW / 2, 6, PW);
    if (u1 < L - .5) ctx.fillRect(u1 - 6, -PW / 2, 6, PW);
    ctx.restore();
  };
  // outline(g, x, y) → points of the whole object lying flat with its foot at x (axis at y) — for dashed().
  N.outline = function (g, x, y) {
    const { L, PW, CBX, CBW } = g, hb = g.CBHL;
    if (!CBW) return [[0, -PW / 2], [L, -PW / 2], [L, PW / 2], [0, PW / 2]].map(([a, b]) => [x + a, y + b]);
    return [[0, -PW / 2], [CBX - CBW / 2, -PW / 2], [CBX - CBW / 2, -hb], [CBX + CBW / 2, -hb], [CBX + CBW / 2, -PW / 2], [L, -PW / 2], [L, PW / 2],
      [CBX + CBW / 2, PW / 2], [CBX + CBW / 2, hb], [CBX - CBW / 2, hb], [CBX - CBW / 2, PW / 2], [0, PW / 2]].map(([a, b]) => [x + a, y + b]);
  };
  // cpt(X, u, v) → the world point at u along the object and v across it (v < 0 = its top side when lying).
  N.cpt = (X, u, v = 0) => [X.x + Math.cos(X.a) * u - Math.sin(X.a) * v, X.y + Math.sin(X.a) * u + Math.cos(X.a) * v];
  // mixX(A, B, k): blend two placements (position, angle; lie flips at k > .62).
  N.mixX = (A, Bx, k) => k <= 0 ? A : k >= 1 ? Bx : { ...Bx, x: lerp(A.x, Bx.x, k), y: lerp(A.y, Bx.y, k), a: lerp(A.a, Bx.a, k), u0: Bx.u0, lie: k > .62 ? Bx.lie : A.lie };
  // rotAbout(X, pv, th): the placement rotated by th about the world point pv (tipping over an edge, swinging).
  N.rotAbout = function (X, pv, th) { const ox = X.x - pv[0], oy = X.y - pv[1]; return { ...X, x: pv[0] + ox * Math.cos(th) - oy * Math.sin(th), y: pv[1] + ox * Math.sin(th) + oy * Math.cos(th), a: X.a + th }; };
  // carry(F, g, left, a0, contact) → X: the object ON THE SHOULDER of figure F (the classic carry: the crossing just
  // ahead of the shoulder, the post trailing behind, sloping a0 rad; left = the part still there, 0..1).
  N.carry = function (F, g, left, a0, contact) {
    const fr = N.frame(F), sh = N.shoulderOf(F), T = [sh[0] + fr.up[0] * 14 * F.s, sh[1] + fr.up[1] * 14 * F.s];
    const a = F.f > 0 ? a0 : Math.PI - a0, d = [Math.cos(a), Math.sin(a)]; let n = [d[1], -d[0]]; if (n[1] > 0) n = [-n[0], -n[1]];
    contact = contact ?? g.CBX - 128;
    return { x: T[0] + n[0] * g.PW / 2 - d[0] * contact, y: T[1] + n[1] * g.PW / 2 - d[1] * contact, a, contact, u0: g.L * (1 - left), lie: false };
  };
  // gripCarry(F, X, g): the hands for a shoulder carry — far hand on the crossbar (58 px out), near fist just behind the
  // shoulder contact; the far arm is drawn over the cloak (farOver). Returns F.
  N.gripCarry = function (F, X, g) { F.hands = [N.cpt(X, g.CBX, 58), N.cpt(X, X.contact - 48)]; F.hand = ['fist', 'fist']; F.farOver = true; return F; };
  // holdUpright(F, g, left, dx = 96) → X: the object stood upright on the ground beside F (dx px ahead), the near hand on
  // it at the crossbar's height minus 40; mark X.held so the scene draws it behind the gripping arm. Sets F.hands.
  N.holdUpright = function (F, g, left, dx = 96) {
    const u0 = g.L * (1 - left), X = { x: F.hip[0] + dx * F.s * F.f, y: F.gy - 2 + u0, a: -Math.PI / 2, u0, lie: false, held: true };
    F.hands = [N.hangHands(F)[0], N.cpt(X, g.CBX - 40, 4)]; F.hand = ['fist', 'fist']; F.farOver = false; return X;
  };
  // holdFront(F, g, left, lift = 0) → X: the object held level in front of the body with both hands (a plank, a gift,
  // a pole offered), axis at the hands' height (≈ waist − lift px). Sets F.hands to grip it a hand-span apart.
  N.holdFront = function (F, g, left, lift = 0) {
    const fr = N.frame(F), c = fr.P(58, 70 + lift), u0 = g.L * (1 - left), mid = (u0 + g.L) / 2, a = F.f > 0 ? 0 : Math.PI;
    const X = { x: c[0] - Math.cos(a) * mid, y: c[1] + 6, a, u0, lie: true };
    F.hands = [N.cpt(X, mid + 46, -g.PW / 2 + 4), N.cpt(X, mid - 46, -g.PW / 2 + 4)]; F.hand = ['fist', 'fist']; return X;
  };

  /* ---------------------------------------------------------------- the figure rig */
  // A pose ("spec") F = { s scale, f facing (+1 right), gy ground y, hip [x,y], ang body lean (rad, + = forward when f=1),
  //   feet [far, near] targets, hands [far, near] targets (null = hanging), hand [type far, type near] 'fist'|'flat'|'open',
  //   tilt head tilt (+ = down/forward, − = up), eye 'calm'|'strain'|'down'|'closed'|'shock'|'up', sway cloak hem,
  //   farFront (far arm in front of the body), farOver (far arm over a carried load), alpha, sq (x-squash for a turn) }.
  // Limbs are 2-bone IK with FIXED lengths (BODY); hands are drawn AT their target; elbows bend down/back, knees forward.
  // ik(a, t, l1, l2, pick) → [joint, end]: 2-bone IK from a toward t (clamped to reach); pick chooses the bend.
  N.ik = function (a, t, l1, l2, pick) {
    let dx = t[0] - a[0], dy = t[1] - a[1], d = Math.hypot(dx, dy) || 1e-6; const dd = clamp(d, Math.abs(l1 - l2) + .5, l1 + l2 - .5);
    const tx = a[0] + dx / d * dd, ty = a[1] + dy / d * dd, an = Math.atan2(ty - a[1], tx - a[0]), b = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
    const j1 = [a[0] + Math.cos(an + b) * l1, a[1] + Math.sin(an + b) * l1], j2 = [a[0] + Math.cos(an - b) * l1, a[1] + Math.sin(an - b) * l1];
    return [pick(j1, j2), [tx, ty]];
  };
  // frame(F) → { up, fw, P(a, b) }: body axes; P(a, b) = the point a px forward and b px up from the hip (× s).
  N.frame = function (F) {
    const up = [Math.sin(F.ang), -Math.cos(F.ang)], fw = [F.f * Math.cos(F.ang), F.f * Math.sin(F.ang)], s = F.s;
    return { up, fw, P: (a, b) => [F.hip[0] + fw[0] * a * s + up[0] * b * s, F.hip[1] + fw[1] * a * s + up[1] * b * s] };
  };
  // shoulderOf(F): the shoulder point a load rests on.
  N.shoulderOf = F => N.frame(F).P(2, 118);
  // hood(ctx, N, rot, f, k, C, eye): the head in its hood at neck point N, rotated rot, facing f, scale k.
  N.hood = function (ctx, Nk, rot, f, k, C, eye) {
    ctx.save(); ctx.translate(Nk[0], Nk[1]); ctx.rotate(rot); ctx.scale(f * k, k);
    ctx.fillStyle = C.c; ctx.beginPath();
    ctx.moveTo(-40, 10); ctx.bezierCurveTo(-58, -40, -40, -98, 8, -100); ctx.bezierCurveTo(48, -100, 64, -60, 58, -20);
    ctx.bezierCurveTo(56, 0, 40, 14, 20, 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.face; ctx.beginPath(); ctx.moveTo(16, -64); ctx.bezierCurveTo(44, -66, 54, -40, 50, -16); ctx.bezierCurveTo(46, -2, 30, 4, 18, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.fr; ctx.beginPath(); ctx.moveTo(10, -70); ctx.bezierCurveTo(34, -78, 54, -62, 54, -38); ctx.bezierCurveTo(42, -52, 26, -50, 14, -40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.cd; ctx.beginPath(); ctx.moveTo(-6, -92); ctx.bezierCurveTo(-30, -84, -40, -30, -30, 6); ctx.lineTo(-40, 10); ctx.bezierCurveTo(-58, -40, -40, -98, 8, -100); ctx.fill();
    ctx.strokeStyle = C.eye; ctx.fillStyle = C.eye; ctx.lineWidth = 4; ctx.lineCap = 'round';
    if (eye === 'strain') { ctx.beginPath(); ctx.moveTo(33, -36); ctx.lineTo(41, -31); ctx.lineTo(33, -27); ctx.stroke(); }
    else if (eye === 'down' || eye === 'closed') { ctx.beginPath(); ctx.moveTo(34, -32); ctx.quadraticCurveTo(40, -27, 46, -31); ctx.stroke(); }
    else if (eye === 'shock') { ctx.beginPath(); ctx.ellipse(41, -35, 4.6, 7, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(34, -50); ctx.lineTo(46, -53); ctx.stroke(); }
    else if (eye === 'up') { ctx.beginPath(); ctx.ellipse(43, -39, 3.6, 5.4, 0, 0, TAU); ctx.fill(); }
    else { ctx.beginPath(); ctx.ellipse(41, -34, 3.6, 5.4, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  };
  // figure(ctx, F, C, mid, back, over): draws the traveller in pose F with palette C (N.FIG.me.l etc.). Draw order:
  // back() · far arm · legs · cloak · over() (a load on the shoulder; the far arm hugs it when F.farOver) · head ·
  // mid() (a thing in front of the body, under the near arm: a held tool, a lying object) · near arm.
  N.figure = function (ctx, F, C, mid, back, over) {
    const s = F.s, f = F.f, { P } = N.frame(F);
    const al = F.alpha ?? 1; if (al <= 0) return; ctx.save(); if (al < 1) ctx.globalAlpha *= al;
    if (F.sq != null && F.sq !== 1) { ctx.translate(F.hip[0], 0); ctx.scale(F.sq, 1); ctx.translate(-F.hip[0], 0); }
    const sh = P(12, 114), shF = P(-8, 112);
    const elbowPick = (a, b) => (a[1] - f * a[0] * .35) > (b[1] - f * b[0] * .35) ? a : b, kneePick = (a, b) => f * a[0] > f * b[0] ? a : b;
    const arm = (S0, T, c, type) => {
      if (!T) T = [S0[0] - f * 8 * s, S0[1] + 116 * s];
      const [el, hd] = N.ik(S0, T, BD.ARM1 * s, BD.ARM2 * s, elbowPick);
      ctx.strokeStyle = c; ctx.lineWidth = 27 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(...S0); ctx.lineTo(...el); ctx.lineTo(hd[0] - (hd[0] - el[0]) * .12, hd[1] - (hd[1] - el[1]) * .12); ctx.stroke();
      const an = Math.atan2(hd[1] - el[1], hd[0] - el[0]); ctx.fillStyle = C.face;
      if (type === 'flat') { ctx.beginPath(); ctx.ellipse(hd[0] + f * 6 * s, hd[1] - 3 * s, 17 * s, 8.5 * s, 0, 0, TAU); ctx.fill(); }
      else if (type === 'open') { ctx.beginPath(); ctx.arc(hd[0], hd[1], 12 * s, 0, TAU); ctx.fill();
        for (const q of [-.55, 0, .55]) { ctx.beginPath(); ctx.ellipse(hd[0] + Math.cos(an + q) * 15 * s, hd[1] + Math.sin(an + q) * 15 * s, 6.5 * s, 4 * s, an + q, 0, TAU); ctx.fill(); } }
      else { ctx.beginPath(); ctx.arc(hd[0], hd[1], 12 * s, 0, TAU); ctx.fill();   // a mitten fist with the thumb wrapped over the top
        let n = [-Math.sin(an), Math.cos(an)]; if (n[1] > 0) n = [-n[0], -n[1]];
        ctx.fillStyle = C.hand2; ctx.beginPath(); ctx.ellipse(hd[0] + Math.cos(an) * 3 * s + n[0] * 8 * s, hd[1] + Math.sin(an) * 3 * s + n[1] * 8 * s, 7.5 * s, 4.5 * s, an, 0, TAU); ctx.fill(); }
    };
    const leg = (T, c) => {
      const hp = P(0, -4), ank = [T[0], T[1] - 10 * s];
      const [kn, a2] = N.ik(hp, ank, BD.LEG1 * s, BD.LEG2 * s, kneePick);
      ctx.strokeStyle = c; ctx.lineWidth = 23 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(...hp); ctx.lineTo(...kn); ctx.lineTo(...a2); ctx.stroke();
      const lift = Math.max(0, F.gy - T[1]), toe = lift > 6 * s ? .3 : 0;
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(a2[0] + f * 9 * s, a2[1] + 5 * s, 22 * s, 11 * s, f * toe, 0, TAU); ctx.fill();
    };
    if (back) back();
    if (!F.farFront && !(over && F.farOver)) arm(shF, F.hands[0], C.cd, F.hand?.[0] || 'fist');
    leg(F.feet[0], C.leg); leg(F.feet[1], C.leg2);
    // cloak: a bell from the shoulders to the shins (the hem swings a little with the stride)
    const sw = F.sway || 0, Q = (a, b) => P(a + sw * clamp(-b / 66, 0, 1), b);
    ctx.fillStyle = C.c; ctx.beginPath();
    ctx.moveTo(...Q(-68, -64)); ctx.bezierCurveTo(...Q(-66, 18), ...Q(-56, 96), ...Q(-26, 132)); ctx.lineTo(...Q(34, 134));
    ctx.bezierCurveTo(...Q(54, 80), ...Q(66, 10), ...Q(80, -64)); ctx.quadraticCurveTo(...Q(46, -76), ...Q(18, -60)); ctx.quadraticCurveTo(...Q(-24, -80), ...Q(-68, -64)); ctx.fill();
    ctx.fillStyle = C.c2; ctx.beginPath(); ctx.moveTo(...Q(28, 128)); ctx.bezierCurveTo(...Q(44, 76), ...Q(56, 20), ...Q(72, -62));
    ctx.lineTo(...Q(54, -64)); ctx.bezierCurveTo(...Q(46, 10), ...Q(34, 70), ...Q(16, 124)); ctx.fill();
    ctx.fillStyle = C.face; ctx.beginPath(); const bt = P(30, 60); ctx.arc(bt[0], bt[1], 5 * s, 0, TAU); ctx.fill();   // the cloak's one button
    if (over) { over(); if (F.farOver && !F.farFront) arm(shF, F.hands[0], C.cd, F.hand?.[0] || 'fist'); }
    const Nk = P(8, 128), rot = F.ang + f * (F.tilt || 0);
    N.hood(ctx, Nk, rot, f, 1.18 * s, C, F.eye || 'calm');
    if (mid) mid();
    if (F.farFront) arm(shF, F.hands[0], C.cd, F.hand?.[0] || 'fist');
    arm(sh, F.hands[1], C.c, F.hand?.[1] || 'fist');
    ctx.restore();
  };
  const frac = x => x - Math.floor(x);
  // walk(x, gy, s, f, ph, stride, lean, lift = 22): a walking pose at hip x, walk phase ph (cycles; 1 = two steps),
  // stride (px at s = 1), body lean (rad), foot lift. Feet plant for 58 % of the cycle (no sliding when ph ∝ distance/stride).
  N.walk = function (x, gy, s, f, ph, stride, lean, lift = 22) {
    const feet = [0, 1].map(i => { const p = frac(ph + i * .5); let off, up = 0;
      if (p < .58) off = stride * (.29 - p); else { const u = (p - .58) / .42; off = -.29 * stride + .58 * stride * eio(u); up = lift * Math.sin(Math.PI * u); }
      return [x + f * off * s, gy - up * s]; });
    const hipH = (BD.HIPH - 6 * Math.abs(Math.sin(TAU * ph))) * s;
    return { s, f, gy, hip: [x, gy - hipH], ang: f * lean, feet, hands: [null, null], hand: ['fist', 'fist'], tilt: 0, eye: 'calm', sway: -f * 8 * Math.sin(TAU * ph), ph };
  };
  // stand(x, gy, s, f, lean = .05): standing, feet apart, hands hanging.
  N.stand = function (x, gy, s, f, lean = .05) { return { s, f, gy, hip: [x, gy - (BD.HIPH + 1) * s], ang: f * lean, feet: [[x - f * 16 * s, gy], [x + f * 20 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: 0, eye: 'calm', sway: 0 }; };
  // kneel(x, gy, s, f, lean = .25): on one knee — the far knee on the ground (its foot tucked behind), the near foot planted
  // ahead with the knee up; hip 64 px up. lean > .6 = bent over something on the ground.
  N.kneel = function (x, gy, s, f, lean = .25) { return { s, f, gy, hip: [x, gy - 64 * s], ang: f * lean, feet: [[x - f * 96 * s, gy - 2 * s], [x + f * 52 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: .2, eye: 'calm', sway: 0 }; };
  // crouch(x, gy, s, f, lean = .5): squatting low on both feet (hip 70 px up), leaning over the ground ahead.
  N.crouch = function (x, gy, s, f, lean = .5) { return { s, f, gy, hip: [x, gy - 70 * s], ang: f * lean, feet: [[x - f * 18 * s, gy], [x + f * 40 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: .25, eye: 'calm', sway: 0 }; };
  // lookUp(F, k = 1): tilt the head back (tilt −.35·k) with eyes up; returns F.
  N.lookUp = function (F, k = 1) { F.tilt = (F.tilt || 0) * (1 - k) - .35 * k; F.eye = k > .5 ? 'up' : F.eye; return F; };
  // hangHands(F, swing) → [far, near]: where hanging hands rest (swing px back/forth with a walk).
  N.hangHands = function (F, swing = 0) { const fr = N.frame(F), sh = fr.P(4, 114); return [[sh[0] - F.f * (10 + swing) * F.s, sh[1] + 116 * F.s], [sh[0] - F.f * (10 - swing) * F.s, sh[1] + 116 * F.s]]; };
  // hangGrip(F, sw) → a near-hand point at the side, a little forward (holding a tool down by the hip).
  N.hangGrip = (F, sw = 0) => { const sh = N.shoulderOf(F); return [sh[0] + F.f * (18 + sw) * F.s, sh[1] + 92 * F.s]; };
  // reach(F, i, p, type): put hand i (0 far, 1 near) at world point p (IK does the arm). Returns F.
  N.reach = function (F, i, p, type) { F.hands = F.hands.slice(); F.hands[i] = p; if (type) { F.hand = (F.hand || ['fist', 'fist']).slice(); F.hand[i] = type; } return F; };
  // handR(F) / handL(F): the index of the figure's right / left hand (near/far swap when it turns).
  N.handR = F => F.f > 0 ? 1 : 0; N.handL = F => F.f > 0 ? 0 : 1;
  // mix(A, B, k): blend two poses (hip, feet, hands — a null hand blends from where it would hang; discrete fields switch at .5).
  N.mix = function (A, Bs, k) {
    if (k <= 0) return A; if (k >= 1) return Bs;
    const l2 = (a, b) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], hA = N.hangHands(A), hB = N.hangHands(Bs);
    const pick = k < .5 ? A : Bs;
    return { ...pick, s: lerp(A.s, Bs.s, k), gy: lerp(A.gy, Bs.gy, k), hip: l2(A.hip, Bs.hip), ang: lerp(A.ang, Bs.ang, k), feet: [l2(A.feet[0], Bs.feet[0]), l2(A.feet[1], Bs.feet[1])],
      hands: [0, 1].map(i => l2(A.hands[i] || hA[i], Bs.hands[i] || hB[i])), hand: pick.hand.slice(), tilt: lerp(A.tilt || 0, Bs.tilt || 0, k), sway: lerp(A.sway || 0, Bs.sway || 0, k) };
  };
  // turn(A, B, k): turn around from A to B (facing flips at k = .5) with a squash: the body narrows to 25 % mid-turn.
  N.turn = function (A, Bs, k) { const F = N.mix(A, Bs, k); if (k > 0 && k < 1) F.sq = Math.max(.25, Math.abs(Math.cos(Math.PI * k))); return F; };

  window.Flatnight = N;
})();

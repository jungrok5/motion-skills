/* kit-diorama.js — a symmetrical pastel diorama (a Grand-Budapest-like stage set), as a reusable house style.  Global: window.Diorama
   Dead-centre one-point symmetry: purple swag curtains with a scalloped pelmet, gold fringe, tie-backs and a medallion
   frame a dusty-pink room (darker dado, soft vertical shading); a window in the middle whose view is a swappable layer
   (night harbour / pastel day); pink table lamps with gold stems that glow; a table with a white lace-edged cloth;
   flat pastel shapes with thin darker outlines and a gentle top light; paper grain and a soft vignette; a frontal
   pastel figure rig (2-bone IK arms in 3-D, frontal legs that walk / kneel / sit); hanging title cards in a centred serif.
   Provenance: borrowed craft from prompt-motion.com/itsolelehmann-e47532 ("Four seasons train window", @itsolelehmann);
   own renderer, no shot, character or text copied.
   Load after lib.js and story.js:  <script src="lib.js"></script><script src="story.js"></script><script src="kit-diorama.js"></script>
   Design space is the portrait frame 1080×1920 (Diorama.W × Diorama.H); in landscape Diorama.begin pillarboxes it.
   Pure and deterministic: no state but the textures built by init (rebuildable any time), seeded noise only. */
(function () {
  const { clamp, lerp, ss, eo, eio, rng, noise, fbm, canvas } = Pilot;
  const K = {};
  K.W = 1080; K.H = 1920;
  const CX = 540;

  // ---------------- palette & type ----------------
  // Dusty pink room, plum velvet, old gold, cream linen, mint upholstery; night blues for the view. ONE saturated accent
  // (K.ACCENT) for the subject only — nothing else in the set is that hue.
  K.C = {
    wall: '#d29aa3', wallLt: '#e0aeb5', wallDk: '#a8717f',      // dusty-pink wall, its lit top, its shaded sides
    stripe: '#d9a6ae',                                           // the faint wallpaper stripe
    dado: '#a4687b', dadoDk: '#8a5268', panel: '#b47a8b',        // the darker dado and its panel mouldings
    rail: '#6f3a52', skirt: '#6a3550',                           // chair rail, skirting
    floorA: '#ecd9cf', floorB: '#bf8f9f',                        // checker floor
    plum: '#53296f', plumDk: '#371a52', plumLt: '#7a4ea5',       // velvet curtains and pelmet
    gold: '#d9b264', goldDk: '#9b7636', goldLt: '#f4dea0',       // fringe, tie-backs, lamp stems, frames
    shade: '#e7a0b2', shadeLit: '#fbd2d6', bulb: '#fff1cf',      // lamp shade, lit, the light itself
    cloth: '#f7f2ec', clothDk: '#e1d4d8', lace: '#fffaf3',       // tablecloth top, its front drop, the lace edge
    frame: '#5b3270', sill: '#8d5068',                           // window frame, sill
    mint: '#a8cdb8', mintDk: '#7fa894',                          // chair upholstery
    cream: '#f8f0e0', ink: '#4a2440', inkSoft: '#7d5870',        // title cards and their type
    night: ['#121f45', '#18295a', '#1f346c', '#28427e', '#34528f'],   // the night view's painted sky bands, top → horizon
    sea: '#111c40', hill: '#0c1532', moon: '#f7edd2', lamp: '#ffd98a',
    day: ['#a9cfe6', '#bcdaea', '#cfe4ec', '#e1ece9', '#f2eadf'],     // the day view's sky bands
    hillA: '#b9b3d8', hillB: '#a9cfa7', hillC: '#8fbf8f', tree: '#6fa77a', cloud: '#fffaf4',
    skin: '#f4d2bd', cheek: '#f0a3a6', mouth: '#7a2f45',
  };
  K.ACCENT = '#d9432b';     // the one saturated colour (the subject). Change via init({ accent }).
  K.SERIF = "'Noto Serif KR',serif"; K.SANS = "'Noto Sans KR',sans-serif";
  // pass to Pilot.run({ fonts: Diorama.FONTS }) so every face is loaded before the first frame
  K.FONTS = [`600 56px ${K.SERIF}`, `700 72px ${K.SERIF}`, `500 34px ${K.SANS}`, `400 30px ${K.SANS}`];

  // ---------------- colour helpers ----------------
  const TONE = new Map();
  // tone(color, k) (hex or rgb()/rgba()): k > 0 lightens toward warm white, k < 0 darkens toward deep plum (keeps shading in the pastel family).
  K.tone = function (c, k) {
    const key = c + k; let v = TONE.get(key); if (v) return v;
    const a = c[0] === '#' ? Pilot.hex(c) : c.match(/[\d.]+/g).slice(0, 3).map(Number), b = k > 0 ? [255, 250, 244] : [42, 18, 46];
    v = Pilot.rgb(Pilot.mix(a, b, Math.abs(k))); TONE.set(key, v); return v;
  };
  // line(hex): the thin darker outline every flat shape gets.
  K.line = c => K.tone(c, -.42);
  // rgba(hex, a): a hex colour at alpha a.
  K.rgba = (c, a) => { const v = c[0] === '#' ? Pilot.hex(c) : c.match(/[\d.]+/g).slice(0, 3).map(Number); return `rgba(${v[0]},${v[1]},${v[2]},${a})`; };

  // ---------------- setup ----------------
  let grain = null, vig = null;
  // init({ accent?, grainSeed = 11 }): builds the paper grain (half-res, ~40 ms) and the vignette. Call once from
  // Pilot.run({ init }). Everything else is stateless.
  K.init = function (o = {}) {
    if (o.accent) K.ACCENT = o.accent;
    const w = 540, h = 960; grain = canvas(w, h);
    const x = grain.getContext('2d'), d = x.createImageData(w, h), r = rng(o.grainSeed ?? 11);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {   // soft mottling + fine tooth, multiplied (white = no change)
      const m = fbm(i * .02, j * .02, 3), v = 255 - 9 * m - 7 * r() - (r() < .0015 ? 14 : 0);
      const p = (j * w + i) * 4; d.data[p] = v; d.data[p + 1] = v - 1; d.data[p + 2] = v - 2; d.data[p + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    vig = canvas(270, 480); const vx = vig.getContext('2d'), g = vx.createRadialGradient(135, 240, 60, 135, 240, 300);
    g.addColorStop(0, 'rgba(60,24,62,0)'); g.addColorStop(.55, 'rgba(60,24,62,.06)'); g.addColorStop(1, 'rgba(48,16,52,.55)');
    vx.fillStyle = g; vx.fillRect(0, 0, 270, 480);
  };

  // ---------------- timing ----------------
  // slide(t, at, dur = .8): 0 → 1 with ease-in-out — every straight, on-axis move (curtains, push-ins, objects).
  K.slide = (t, at, dur = .8) => eio((t - at) / dur);
  // spring(x): 0 → 1 with a tiny (~2.5 %) overshoot. The only "bounce" the kit allows.
  K.spring = x => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-7 * x) * Math.cos(6 * x);
  // blink(t, seed) → 0 open … 1 closed: a ~0.14 s blink every ~2.8–4.6 s, phase and period from the seed.
  K.blink = function (t, seed = 1) {
    const r = rng(seed * 977 + 3), per = 2.8 + r() * 1.8, off = r() * per, u = (t + off) % per;
    return u < .14 ? 1 - Math.abs(u / .07 - 1) : 0;
  };
  // laugh(t, at, dur = 2.5, amp = 7, hz = 4.2) → px: small decaying laugh bounces (upward), 0 outside [at, at+dur].
  K.laugh = function (t, at, dur = 2.5, amp = 7, hz = 4.2) {
    if (t < at || t > at + dur) return 0; const u = (t - at) / dur;
    return amp * Math.abs(Math.sin(Math.PI * hz * (t - at))) * Math.pow(1 - u, 1.3) * ss(0, .06, u);
  };

  // ---------------- flat shapes ----------------
  // flat(ctx, build, fill, { y0, y1, light = .1, dark = .06, line, lw = 2.5 }): a flat pastel shape — build(ctx) adds the
  // path; filled flat, or with the gentle top light (lighter at y0, a touch darker at y1) when y0/y1 are given; then the
  // thin darker outline (lw 0 = none).
  K.flat = function (ctx, build, fill, o = {}) {
    ctx.beginPath(); build(ctx);
    if (o.y0 != null) {
      const g = ctx.createLinearGradient(0, o.y0, 0, o.y1);
      g.addColorStop(0, K.tone(fill, o.light ?? .1)); g.addColorStop(1, K.tone(fill, -(o.dark ?? .06))); ctx.fillStyle = g;
    } else ctx.fillStyle = fill;
    ctx.fill();
    if (o.lw !== 0) { ctx.strokeStyle = o.line || K.line(fill); ctx.lineWidth = o.lw || 2.5; ctx.lineJoin = 'round'; ctx.stroke(); }
  };
  // rr(ctx, x, y, w, h, r): add a rounded-rectangle sub-path.  ell(ctx, x, y, rx, ry, rot = 0): add an ellipse sub-path.
  K.rr = (c, x, y, w, h, r) => { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  K.ell = (c, x, y, rx, ry, rot = 0) => { c.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); };
  // poly(ctx, pts, closed = true): add a polyline sub-path.
  K.poly = (c, pts, closed = true) => { pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); if (closed) c.closePath(); };
  // mirror(ctx, fn): fn(ctx, +1) as drawn, then fn(ctx, −1) mirrored about the centre line x = 540 — the diorama's
  // symmetry in one call (shapes only; never mirror words).
  K.mirror = function (ctx, fn) { fn(ctx, 1); ctx.save(); ctx.translate(K.W, 0); ctx.scale(-1, 1); fn(ctx, -1); ctx.restore(); };
  // glow(ctx, x, y, r, a, color = bulb): a soft additive halo (screen). ONLY around a light source (a lamp, the moon).
  K.glow = function (ctx, x, y, r, a, col = K.C.bulb) {
    if (a <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, K.rgba(col, .55 * a)); g.addColorStop(.35, K.rgba(col, .22 * a)); g.addColorStop(1, K.rgba(col, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore();
  };

  // ---------------- the room ----------------
  // room(ctx, { dado = 1200, floor = 1640, horizon = 1000, panels = true, stripes = true }): the back wall (dusty pink,
  // faint wallpaper stripes, soft vertical shading darker toward both sides), the darker dado with panel mouldings and a
  // rail, the skirting, and a pastel checker floor in one-point perspective toward (540, horizon).
  K.room = function (ctx, o = {}) {
    const C = K.C, dy = o.dado ?? 1200, fy = o.floor ?? 1640, H = K.H;
    let g = ctx.createLinearGradient(0, 0, 0, dy); g.addColorStop(0, C.wallLt); g.addColorStop(1, C.wall);
    ctx.fillStyle = g; ctx.fillRect(-60, -60, K.W + 120, dy + 60);
    if (o.stripes !== false) { ctx.fillStyle = K.rgba(C.stripe, .55); for (let x = CX - 30 - 60 * 9; x < K.W + 60; x += 60) ctx.fillRect(x, 0, 22, dy); }
    g = ctx.createLinearGradient(0, 0, K.W, 0);   // soft vertical shading
    g.addColorStop(0, K.rgba(C.wallDk, .75)); g.addColorStop(.26, K.rgba(C.wallDk, 0)); g.addColorStop(.74, K.rgba(C.wallDk, 0)); g.addColorStop(1, K.rgba(C.wallDk, .75));
    ctx.fillStyle = g; ctx.fillRect(-60, -60, K.W + 120, dy + 60);
    // dado
    g = ctx.createLinearGradient(0, dy, 0, fy); g.addColorStop(0, C.dado); g.addColorStop(1, C.dadoDk);
    ctx.fillStyle = g; ctx.fillRect(-60, dy, K.W + 120, fy - dy);
    if (o.panels !== false) K.mirror(ctx, c => {   // panel mouldings, symmetric about the centre
      c.strokeStyle = K.rgba(C.panel, .9); c.lineWidth = 3;
      for (const [x0, x1] of [[40, 250], [290, 520]]) { c.beginPath(); K.rr(c, x0, dy + 36, x1 - x0, fy - dy - 80, 6); c.stroke(); }
      c.strokeStyle = K.rgba(C.dadoDk, .6); c.lineWidth = 2;
      for (const [x0, x1] of [[40, 250], [290, 520]]) { c.beginPath(); K.rr(c, x0 + 3, dy + 39, x1 - x0, fy - dy - 80, 6); c.stroke(); }
    });
    ctx.fillStyle = C.rail; ctx.fillRect(-60, dy - 8, K.W + 120, 14); ctx.fillStyle = K.rgba(C.gold, .8); ctx.fillRect(-60, dy - 8, K.W + 120, 3);
    ctx.fillStyle = C.skirt; ctx.fillRect(-60, fy - 30, K.W + 120, 30); ctx.fillStyle = K.rgba(C.gold, .55); ctx.fillRect(-60, fy - 30, K.W + 120, 2);
    K.floor(ctx, fy, H + 60, o);
    // the wall/floor seam shadow
    g = ctx.createLinearGradient(0, fy, 0, fy + 40); g.addColorStop(0, 'rgba(50,20,50,.25)'); g.addColorStop(1, 'rgba(50,20,50,0)');
    ctx.fillStyle = g; ctx.fillRect(-60, fy, K.W + 120, 40);
  };
  // floor(ctx, y0, y1, { horizon = 1000, tile = 96, depth = 9, step = .75, floorA, floorB }): checker tiles in one-point
  // perspective (rows in true depth steps from `depth` toward the camera by `step`, columns converging on x = 540).
  K.floor = function (ctx, y0, y1, o = {}) {
    const hz = o.horizon ?? 1000, tw = o.tile ?? 96, A = o.floorA || K.C.floorA, B = o.floorB || K.C.floorB;
    ctx.fillStyle = A; ctx.fillRect(-60, y0, K.W + 120, y1 - y0);
    const k0 = y0 - hz, rows = [], z0 = o.depth ?? 9, dz = o.step ?? .75;
    for (let i = 0; ; i++) { const z = z0 - i * dz; const y = z > .05 ? hz + k0 * z0 / z : y1 + 1; rows.push(Math.min(y, y1 + 1)); if (y > y1) break; }
    ctx.fillStyle = B;
    for (let i = 0; i < rows.length - 1; i++) {
      const ya = rows[i], yb = rows[i + 1], sa = (ya - hz) / k0, sb = (yb - hz) / k0;
      for (let j = -9; j <= 9; j++) { if ((i + j) & 1) continue;
        const xa = j - .5, xb = j + .5;
        ctx.beginPath(); ctx.moveTo(CX + xa * tw * sa, ya); ctx.lineTo(CX + xb * tw * sa, ya); ctx.lineTo(CX + xb * tw * sb, yb); ctx.lineTo(CX + xa * tw * sb, yb); ctx.fill(); }
    }
  };

  // ---------------- the window and its views ----------------
  // window(ctx, r, view, t, { bars = 0, sill = true }): an opening r = { x, y, w, h } in the back wall. view(ctx, r, t) is
  // drawn clipped inside it (swap the view to change place, season, time); then a faint glass sheen, the reveal's soft
  // shade, a plum frame with a gold bead, optional vertical glazing bars, and a sill ledge.
  K.window = function (ctx, r, view, t, o = {}) {
    const C = K.C;
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    view(ctx, r, t);
    ctx.fillStyle = 'rgba(255,255,255,.05)';   // glass sheen: two pale vertical smears
    ctx.fillRect(r.x + r.w * .18, r.y, r.w * .07, r.h); ctx.fillRect(r.x + r.w * .29, r.y, r.w * .025, r.h);
    let g = ctx.createLinearGradient(0, r.y, 0, r.y + 46); g.addColorStop(0, 'rgba(30,10,40,.35)'); g.addColorStop(1, 'rgba(30,10,40,0)');
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, 46);
    ctx.restore();
    const n = o.bars || 0; for (let i = 1; i <= n; i++) { const x = r.x + r.w * i / (n + 1);
      K.flat(ctx, c => c.rect(x - 5, r.y, 10, r.h), C.frame, { lw: 2 }); }
    // frame: plum moulding + inner gold bead
    ctx.lineJoin = 'miter';
    ctx.strokeStyle = K.line(C.frame); ctx.lineWidth = 26; ctx.strokeRect(r.x - 12, r.y - 12, r.w + 24, r.h + 24);
    ctx.strokeStyle = C.frame; ctx.lineWidth = 21; ctx.strokeRect(r.x - 12, r.y - 12, r.w + 24, r.h + 24);
    ctx.strokeStyle = K.tone(C.frame, .18); ctx.lineWidth = 4; ctx.strokeRect(r.x - 18, r.y - 18, r.w + 36, r.h + 36);
    ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.strokeRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
    if (o.sill !== false) {
      const y = r.y + r.h + 4;
      K.flat(ctx, c => c.rect(r.x - 44, y, r.w + 88, 14), K.tone(C.sill, .15), { lw: 2 });
      K.flat(ctx, c => c.rect(r.x - 38, y + 14, r.w + 76, 16), C.sill, { lw: 2 });
      ctx.fillStyle = 'rgba(50,20,50,.18)'; ctx.fillRect(r.x - 38, y + 30, r.w + 76, 10);
    }
  };
  K.views = {};
  // views.night(ctx, r, t, { horizon = .78, moon = true, moonY = .36, harbour = true, boat = true, seed = 7 }): a deep-blue
  // night painted in flat bands, twinkling stars, a moon with its halo, a symmetric far shore with a row of harbour
  // lights and their reflections, and (optionally) a little boat with a lantern bobbing under the moon.
  K.views.night = function (ctx, r, t, o = {}) {
    const C = K.C, hz = r.y + r.h * (o.horizon ?? .78), cx = r.x + r.w / 2, rr = rng(o.seed ?? 7), N = C.night.length;
    for (let i = 0; i < N; i++) { const a = r.y + (hz - r.y) * Math.pow(i / N, .85), b = r.y + (hz - r.y) * Math.pow((i + 1) / N, .85);
      ctx.fillStyle = C.night[i]; ctx.fillRect(r.x, a, r.w, b - a + 1); }
    for (let i = 0; i < 34; i++) {   // stars
      const x = r.x + rr() * r.w, y = r.y + rr() * (hz - r.y) * .82, s = .8 + rr() * 1.8, tw = .55 + .45 * Math.sin(t * (1 + rr()) * 2.2 + i * 1.7);
      ctx.fillStyle = `rgba(255,246,220,${.35 + .55 * tw})`; ctx.beginPath(); ctx.moveTo(x, y - s * 2.4); ctx.lineTo(x + s * .6, y); ctx.lineTo(x, y + s * 2.4); ctx.lineTo(x - s * .6, y); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - s * 2.4, y); ctx.lineTo(x, y + s * .6); ctx.lineTo(x + s * 2.4, y); ctx.lineTo(x, y - s * .6); ctx.fill();
    }
    const my = r.y + r.h * (o.moonY ?? .36), mr = r.w * .085;
    if (o.moon !== false) {
      for (const [k, a] of [[3.1, .06], [2.2, .08], [1.55, .1]]) { ctx.fillStyle = `rgba(190,205,240,${a})`; ctx.beginPath(); ctx.arc(cx, my, mr * k, 0, 7); ctx.fill(); }
      K.flat(ctx, c => c.arc(cx, my, mr, 0, 7), C.moon, { y0: my - mr, y1: my + mr, line: '#c9bfa6', lw: 2 });
      ctx.fillStyle = 'rgba(200,185,150,.35)';
      for (const [dx, dy, rad] of [[-.32, -.18, .2], [.28, .22, .15], [.05, .42, .1], [-.1, .1, .08]]) { ctx.beginPath(); ctx.arc(cx + dx * mr, my + dy * mr, rad * mr, 0, 7); ctx.fill(); }
    }
    // far shore: a symmetric ridge (noise of the distance from the centre)
    ctx.fillStyle = C.hill; ctx.beginPath(); ctx.moveTo(r.x - 2, hz + 2);
    for (let x = r.x - 2; x <= r.x + r.w + 2; x += 6) { const d = Math.abs(x - cx); ctx.lineTo(x, hz - 6 - 34 * fbm(d * .006 + 3, 1.3, 3) * ss(30, 260, d)); }
    ctx.lineTo(r.x + r.w + 2, hz + 2); ctx.fill();
    ctx.fillStyle = C.sea; ctx.fillRect(r.x, hz, r.w, r.y + r.h - hz);
    ctx.fillStyle = 'rgba(120,150,210,.35)'; ctx.fillRect(r.x, hz, r.w, 2);
    if (o.moon !== false) for (let i = 0; i < 9; i++) {   // the moon's path on the water
      const y = hz + 8 + i * (r.y + r.h - hz - 10) / 9, w = mr * (1.3 - i * .08) * (.75 + .25 * Math.sin(t * 2.1 + i * 1.9)), dx = 4 * Math.sin(t * 1.3 + i);
      ctx.fillStyle = `rgba(247,237,210,${.5 - i * .035})`; ctx.fillRect(cx - w / 2 + dx, y, w, 3);
    }
    if (o.harbour !== false) {   // the harbour lights row + reflections, mirrored about the centre
      const r2 = rng((o.seed ?? 7) + 40), xs = [];
      for (let d = 70; d < r.w / 2 + 10; d += 16 + r2() * 14) xs.push([d, r2()]);
      for (const sgn of [-1, 1]) for (const [d, q] of xs) {
        const x = cx + sgn * d, tw = .7 + .3 * Math.sin(t * 2.6 + d), y = hz - 4 - 3 * q;
        ctx.fillStyle = K.rgba(C.lamp, .9 * tw); ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill();
        for (let j = 1; j < 4; j++) { ctx.fillStyle = K.rgba(C.lamp, (.4 - j * .1) * tw); ctx.fillRect(x - 3 + 2 * Math.sin(t * 2 + j + d), hz + 4 + j * 7, 6, 2); }
      }
    }
    if (o.boat !== false) {   // a small boat with a lantern bobbing under the moon
      const by = hz + (r.y + r.h - hz) * .5 + 2 * Math.sin(t * 1.6), rot = .03 * Math.sin(t * 1.2);
      ctx.save(); ctx.translate(cx, by); ctx.rotate(rot);
      ctx.fillStyle = C.hill; ctx.beginPath(); ctx.moveTo(-34, -8); ctx.lineTo(34, -8); ctx.lineTo(24, 4); ctx.lineTo(-24, 4); ctx.fill();
      ctx.fillRect(-12, -22, 22, 14); ctx.fillRect(-1, -46, 2.5, 26);
      ctx.fillStyle = C.lamp; ctx.beginPath(); ctx.arc(1, -48, 3, 0, 7); ctx.fill();
      ctx.restore(); K.glow(ctx, cx, by - 48, 26, .8, C.lamp);
    }
  };
  // views.day(ctx, r, t, { horizon = .7, dusk = 0, drift = 6, seed = 3 }): a pastel day in flat bands, drifting outlined
  // clouds, layered hills and symmetric round trees; dusk 0 → 1 warms the sky toward peach.
  K.views.day = function (ctx, r, t, o = {}) {
    const C = K.C, hz = r.y + r.h * (o.horizon ?? .7), cx = r.x + r.w / 2, dk = o.dusk || 0, N = C.day.length;
    const warm = ['#f2b8a8', '#f5c6ae', '#f8d4b4', '#f9e0bd', '#fbe9cc'];
    for (let i = 0; i < N; i++) { const a = r.y + (hz - r.y) * i / N, b = r.y + (hz - r.y) * (i + 1) / N;
      ctx.fillStyle = Pilot.rgb(Pilot.mix(Pilot.hex(C.day[i]), Pilot.hex(warm[i]), dk)); ctx.fillRect(r.x, a, r.w, b - a + 1); }
    const rr = rng(o.seed ?? 3), drift = o.drift ?? 6;
    for (let i = 0; i < 5; i++) {   // clouds drift right and wrap
      const span = r.w + 260, x = r.x - 130 + ((rr() * span + t * drift * (.7 + rr() * .6)) % span), y = r.y + 50 + rr() * (hz - r.y) * .45, s = .6 + rr() * .5;
      K.flat(ctx, c => { K.ell(c, x, y, 46 * s, 18 * s); K.ell(c, x - 30 * s, y + 4 * s, 26 * s, 14 * s); K.ell(c, x + 30 * s, y + 3 * s, 30 * s, 15 * s); K.ell(c, x + 6 * s, y - 12 * s, 28 * s, 17 * s); }, C.cloud, { line: '#d8d6e2', lw: 1.6 });
    }
    const ridge = (base, amp, f, col, sd) => { ctx.beginPath(); ctx.moveTo(r.x - 2, r.y + r.h + 2);
      for (let x = r.x - 2; x <= r.x + r.w + 2; x += 6) { const d = Math.abs(x - cx); ctx.lineTo(x, base - amp * fbm(d * f + sd, sd, 3)); }
      ctx.lineTo(r.x + r.w + 2, r.y + r.h + 2); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = K.line(col); ctx.lineWidth = 2; ctx.stroke(); };
    ridge(hz, 110, .005, Pilot.rgb(Pilot.mix(Pilot.hex(C.hillA), Pilot.hex('#d9a3b8'), dk * .5)), 2);
    ridge(hz + 30, 40, .008, C.hillB, 5);
    ridge(hz + 70, 20, .01, C.hillC, 9);
    K.mirror(ctx, c => { for (const [d, s] of [[r.w * .38, 1], [r.w * .27, .8]]) {   // round trees, mirrored
      const x = cx - d, y = hz + 66;
      K.flat(c, q => q.rect(x - 3 * s, y - 10, 6 * s, 30 * s), '#9b7458', { lw: 1.5 });
      K.flat(c, q => K.ell(q, x, y - 26 * s, 22 * s, 28 * s), C.tree, { y0: y - 54 * s, y1: y, lw: 2 }); } });
  };

  // ---------------- curtains & pelmet ----------------
  // curtains(ctx, k, { top = 240, tieY = 1000, openTop = 205, openTie = 96, openBot = 150, bottom = 1960, folds = 16 }):
  // the two front velvet curtains. k = 0 closed (they meet at the centre) … 1 open and gathered at the gold tie-backs —
  // they always move symmetrically. Folds are flat bands of plum shades; a gold edge runs down each inner edge.
  K.curtains = function (ctx, k, o = {}) {
    const C = K.C, top = o.top ?? 240, ty = o.tieY ?? 1000, bot = o.bottom ?? K.H + 40, xo = -30;
    const xT = o.openTop ?? 205, xI = o.openTie ?? 96, xB = o.openBot ?? 150, n = o.folds ?? 16, e = clamp(k);
    const open = y => y < ty ? lerp(xI, xT, Math.pow((ty - y) / (ty - top), 1.7)) : lerp(xI, xB, Math.pow((y - ty) / (bot - ty), .75));
    const inner = y => lerp(CX + 6, open(y), e);
    const ys = []; for (let y = top; y < bot; y += 24) ys.push(y); ys.push(bot);
    const shades = [C.plumLt, K.tone(C.plum, .12), C.plum, K.tone(C.plum, -.12), C.plumDk, K.tone(C.plum, -.12), C.plum, K.tone(C.plum, .12)];
    K.mirror(ctx, c => {
      for (let j = 0; j < n; j++) {   // fold bands between outer edge and inner edge
        const f0 = j / n, f1 = (j + 1) / n, col = shades[(j * 3) % shades.length];
        c.beginPath();
        ys.forEach((y, i) => { const x = lerp(xo, inner(y), f0) - .5; i ? c.lineTo(x, y) : c.moveTo(x, y); });
        for (let i = ys.length - 1; i >= 0; i--) c.lineTo(lerp(xo, inner(ys[i]), f1) + .5, ys[i]);
        c.closePath(); c.fillStyle = col; c.fill();
      }
      c.strokeStyle = K.rgba(C.plumDk, .55); c.lineWidth = 1.5;   // a thin valley line on each fold
      for (let j = 1; j < n; j += 2) { c.beginPath(); ys.forEach((y, i) => { const x = lerp(xo, inner(y), j / n); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); }
      c.beginPath(); ys.forEach((y, i) => i ? c.lineTo(inner(y), y) : c.moveTo(inner(y), y));
      c.strokeStyle = K.line(C.plum); c.lineWidth = 6; c.stroke(); c.strokeStyle = C.gold; c.lineWidth = 3; c.stroke();
      // shade on the curtain just under the pelmet and a soft top light down the middle
      const g = c.createLinearGradient(0, top, 0, top + 140); g.addColorStop(0, 'rgba(30,8,40,.45)'); g.addColorStop(1, 'rgba(30,8,40,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(xo, top); c.lineTo(inner(top), top); c.lineTo(inner(top + 140), top + 140); c.lineTo(xo, top + 140); c.fill();
      // tie-back: gold rope + tassel, once the curtain has gathered
      const ta = ss(.72, .95, e);
      if (ta > 0) {
        c.save(); c.globalAlpha *= ta;
        const xi = inner(ty);
        c.lineCap = 'round'; c.strokeStyle = C.goldDk; c.lineWidth = 17; c.beginPath(); c.moveTo(xo, ty - 6); c.quadraticCurveTo((xo + xi) / 2, ty + 10, xi + 8, ty); c.stroke();
        c.strokeStyle = C.gold; c.lineWidth = 12; c.stroke();
        c.strokeStyle = C.goldDk; c.lineWidth = 1.5;
        for (let x = xo + 6; x < xi + 4; x += 9) { const yy = ty - 6 + 16 * (x - xo) / (xi - xo) * (1 - (x - xo) / (xi - xo)) * 2; c.beginPath(); c.moveTo(x - 3, yy - 5); c.lineTo(x + 3, yy + 5); c.stroke(); }
        K.tassel(c, xi + 10, ty + 2, 1);
        c.restore();
      }
    });
  };
  // tassel(ctx, x, y, s = 1): a small gold tassel hanging from (x, y): knob, waist, fringe.
  K.tassel = function (ctx, x, y, s = 1) {
    const C = K.C;
    K.flat(ctx, c => K.ell(c, x, y + 6 * s, 7 * s, 7 * s), C.gold, { lw: 1.5, line: C.goldDk });
    K.flat(ctx, c => { c.moveTo(x - 5 * s, y + 13 * s); c.lineTo(x + 5 * s, y + 13 * s); c.lineTo(x + 11 * s, y + 42 * s); c.quadraticCurveTo(x, y + 47 * s, x - 11 * s, y + 42 * s); c.closePath(); }, C.gold, { y0: y, y1: y + 46 * s, lw: 1.5, line: C.goldDk });
    ctx.strokeStyle = C.goldDk; ctx.lineWidth = 1.2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 3 * s, y + 20 * s); ctx.lineTo(x + i * 4.2 * s, y + 43 * s); ctx.stroke(); }
    K.flat(ctx, c => c.rect(x - 6 * s, y + 12 * s, 12 * s, 5 * s), C.goldLt, { lw: 1.2, line: C.goldDk });
  };
  // pelmet(ctx, { y = 250, swags = 9, dip = 36, medY = 175, shadow = true }): the valance across the top — a plum band
  // (the top 160 px stay plain), a scalloped lower edge with a gold braid and fringe, tassels where the swags meet, and a
  // gold medallion at dead centre. It casts a soft shadow on what is below it.
  K.pelmet = function (ctx, o = {}) {
    const C = K.C, y1 = o.y ?? 250, n = o.swags ?? 9, dip = o.dip ?? 36, x0 = -20, x1 = K.W + 20, sw = (x1 - x0) / n;
    if (o.shadow !== false) { const g = ctx.createLinearGradient(0, y1, 0, y1 + dip + 120); g.addColorStop(0, 'rgba(30,8,40,.4)'); g.addColorStop(1, 'rgba(30,8,40,0)');
      ctx.fillStyle = g; ctx.fillRect(-60, y1, K.W + 120, dip + 120); }
    const edge = c => { c.moveTo(x0, -40); c.lineTo(x0, y1); for (let i = 0; i < n; i++) { const a = x0 + i * sw; c.quadraticCurveTo(a + sw / 2, y1 + dip * 2, a + sw, y1); } c.lineTo(x1, -40); c.closePath(); };
    K.flat(ctx, edge, C.plum, { y0: 0, y1: y1 + dip, light: .14, dark: .1, lw: 3 });
    ctx.save(); ctx.beginPath(); edge(ctx); ctx.clip();   // velvet folds on the band, a darker crescent in each swag
    for (let x = CX - 15 - 30 * 20; x < K.W + 40; x += 30) { ctx.fillStyle = 'rgba(30,8,40,.12)'; ctx.fillRect(x, 0, 12, y1 + dip * 2); }
    for (let i = 0; i < n; i++) { const a = x0 + i * sw; ctx.fillStyle = 'rgba(30,8,40,.22)'; ctx.beginPath(); ctx.moveTo(a, y1 - 2);
      ctx.quadraticCurveTo(a + sw / 2, y1 + dip * 2, a + sw, y1 - 2); ctx.quadraticCurveTo(a + sw / 2, y1 + dip * 1.1, a, y1 - 2); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 3;   // braid along the scallops and two gold lines along the band
    ctx.beginPath(); ctx.moveTo(x0, y1 - 12); for (let i = 0; i < n; i++) { const a = x0 + i * sw; ctx.quadraticCurveTo(a + sw / 2, y1 + dip * 2 - 12, a + sw, y1 - 12); } ctx.stroke();
    for (const y of [y1 - 70, y1 - 62]) { ctx.lineWidth = y === y1 - 70 ? 3 : 1.5; ctx.beginPath(); ctx.moveTo(-20, y); ctx.lineTo(K.W + 20, y); ctx.stroke(); }
    ctx.lineWidth = 2.2;   // fringe
    for (let i = 0; i < n; i++) { const a = x0 + i * sw;
      for (let u = .02; u < 1; u += .028) { const x = (1 - u) * (1 - u) * a + 2 * u * (1 - u) * (a + sw / 2) + u * u * (a + sw), y = (1 - u) * (1 - u) * y1 + 2 * u * (1 - u) * (y1 + dip * 2) + u * u * y1;
        ctx.strokeStyle = C.goldDk; ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.lineTo(x, y + 13); ctx.stroke();
        ctx.strokeStyle = C.gold; ctx.beginPath(); ctx.moveTo(x + 1.2, y - 1); ctx.lineTo(x + 1.2, y + 11); ctx.stroke(); } }
    for (let i = 0; i <= n; i++) K.tassel(ctx, x0 + i * sw, y1 - 4, .9);
    const my = o.medY ?? 175;   // medallion
    K.flat(ctx, c => K.ell(c, CX, my, 40, 31), C.gold, { y0: my - 31, y1: my + 31, light: .25, lw: 2.5, line: C.goldDk });
    K.flat(ctx, c => K.ell(c, CX, my, 30, 22), C.shade, { y0: my - 22, y1: my + 22, lw: 2, line: C.goldDk });
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDk; ctx.lineWidth = 1.2;   // a tiny crest: three points and a band
    ctx.beginPath(); ctx.moveTo(CX - 15, my + 7); ctx.lineTo(CX - 15, my - 6); ctx.lineTo(CX - 8, my); ctx.lineTo(CX, my - 11); ctx.lineTo(CX + 8, my); ctx.lineTo(CX + 15, my - 6); ctx.lineTo(CX + 15, my + 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (const dx of [-15, 0, 15]) { ctx.beginPath(); ctx.arc(CX + dx, my + (dx ? -8 : -13), 2.4, 0, 7); ctx.fill(); }
  };

  // ---------------- lamps ----------------
  // lamp(ctx, x, y, s = 1, on = 1): a table lamp standing on (x, y): round gold foot, a gold stem with two knobs, a pink
  // pleated shade with a bead fringe. on (0..1) lights the shade from inside. Returns the shade centre [x, y].
  K.lamp = function (ctx, x, y, s = 1, on = 1) {
    const C = K.C, hs = 150 * s, sy0 = y - hs - 70 * s, sy1 = y - hs;
    K.flat(ctx, c => { c.moveTo(x - 30 * s, y); c.quadraticCurveTo(x - 28 * s, y - 14 * s, x, y - 15 * s); c.quadraticCurveTo(x + 28 * s, y - 14 * s, x + 30 * s, y); c.closePath(); }, C.gold, { y0: y - 15 * s, y1: y, light: .3, lw: 2, line: C.goldDk });
    K.flat(ctx, c => c.rect(x - 4.5 * s, sy1, 9 * s, hs - 12 * s), C.gold, { lw: 2, line: C.goldDk });
    ctx.fillStyle = K.rgba(C.goldLt, .8); ctx.fillRect(x - 3 * s, sy1, 2.2 * s, hs - 12 * s);
    for (const [u, r] of [[.25, 10], [.62, 8]]) K.flat(ctx, c => K.ell(c, x, sy1 + (hs - 12 * s) * u, r * s, 6 * s), C.gold, { y0: sy1 + (hs - 12 * s) * u - 6 * s, y1: sy1 + (hs - 12 * s) * u + 6 * s, light: .35, lw: 1.8, line: C.goldDk });
    const col = Pilot.rgb(Pilot.mix(Pilot.hex(C.shade), Pilot.hex(C.shadeLit), on)), tw = 30 * s, bw = 56 * s;
    if (on > 0) { ctx.fillStyle = K.rgba(C.bulb, .9 * on); ctx.beginPath(); ctx.ellipse(x, sy1, bw * .85, 7 * s, 0, 0, 7); ctx.fill(); }
    K.flat(ctx, c => { c.moveTo(x - tw, sy0); c.lineTo(x + tw, sy0); c.lineTo(x + bw, sy1); c.quadraticCurveTo(x, sy1 + 9 * s, x - bw, sy1); c.closePath(); }, col, { y0: sy0, y1: sy1, light: .12 + .1 * on, dark: .05, lw: 2.2, line: K.tone(C.shade, -.35) });
    ctx.strokeStyle = K.rgba(K.tone(C.shade, -.25), .55); ctx.lineWidth = 1.4;   // pleats
    for (let i = -4; i <= 4; i++) { if (!i) continue; ctx.beginPath(); ctx.moveTo(x + tw * i / 5, sy0 + 2); ctx.lineTo(x + bw * i / 5, sy1 + 2 - Math.abs(i) * .6); ctx.stroke(); }
    ctx.fillStyle = K.tone(C.shade, on > .5 ? .3 : -.1);   // bead fringe
    for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.arc(x + bw * i / 6.4, sy1 + 4 * s + 4 * s * (1 - Math.pow(i / 6, 2)) + 3 * s, 2.3 * s, 0, 7); ctx.fill(); }
    K.flat(ctx, c => K.ell(c, x, sy0 - 3 * s, 6 * s, 4 * s), C.gold, { lw: 1.4, line: C.goldDk });
    return [x, (sy0 + sy1) / 2];
  };
  // lampGlow(ctx, x, y, s = 1, on = 1): the lamp's light — a warm halo round the shade and a pool on the surface it
  // stands on. Draw it AFTER whatever stands near the lamp (people, wall) so the light falls on them.
  K.lampGlow = function (ctx, x, y, s = 1, on = 1) {
    if (on <= 0) return; const sy = y - 150 * s - 35 * s;
    K.glow(ctx, x, sy, 300 * s, .9 * on); K.glow(ctx, x, sy, 120 * s, .8 * on);
    ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(x, y, 0, x, y, 120 * s);
    g.addColorStop(0, K.rgba(K.C.bulb, .35 * on)); g.addColorStop(1, K.rgba(K.C.bulb, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, 120 * s, 34 * s, 0, 0, 7); ctx.fill(); ctx.restore();
  };

  // ---------------- furniture ----------------
  // table(ctx, r, { flare = 14, folds = 6, lace = 15, band = pink | false }): a table under a white cloth; r = { x, y, w, d, h }: the top's far
  // edge at y (px), its depth d (px down to the near edge), the front drop h (px), flared `flare` px at the near edge.
  // Returns { top: [y, y + d], front: [y + d, y + d + h] }. An embroidered band and lace scallops finish the hem.
  K.table = function (ctx, r, o = {}) {
    const C = K.C, f = o.flare ?? 14, y0 = r.y, y1 = r.y + r.d, y2 = y1 + r.h, x0 = r.x, x1 = r.x + r.w, L = o.lace ?? 15;
    ctx.fillStyle = 'rgba(50,20,50,.22)'; ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, y2 + 30, r.w * .56, 40, 0, 0, 7); ctx.fill();   // on the floor
    K.flat(ctx, c => { c.moveTo(x0, y0); c.lineTo(x1, y0); c.lineTo(x1 + f, y1); c.lineTo(x0 - f, y1); c.closePath(); }, C.cloth, { y0, y1, light: .5, dark: .02, lw: 2.2, line: K.tone(C.clothDk, -.25) });
    K.flat(ctx, c => c.rect(x0 - f, y1, r.w + 2 * f, r.h), C.clothDk, { y0: y1, y1: y2, light: .35, dark: .05, lw: 2.2, line: K.tone(C.clothDk, -.3) });
    const nf = o.folds ?? 6; ctx.fillStyle = 'rgba(120,80,110,.08)';   // soft vertical folds in the drop
    for (let i = 0; i < nf; i++) { const x = x0 - f + (r.w + 2 * f) * (i + .5) / nf; ctx.fillRect(x - 10, y1 + 4, 20, r.h - 4); }
    ctx.fillStyle = 'rgba(80,40,70,.12)'; ctx.fillRect(x0 - f, y1, r.w + 2 * f, 6);   // the near edge's shade line
    if (o.band !== false) {   // an embroidered band above the hem: two thin lines and a row of small dots
      const by = y2 - 30, bc = o.band || '#e6a9b8'; ctx.strokeStyle = bc; ctx.lineWidth = 2;
      for (const yy of [by - 9, by + 9]) { ctx.beginPath(); ctx.moveTo(x0 - f + 10, yy); ctx.lineTo(x1 + f - 10, yy); ctx.stroke(); }
      ctx.fillStyle = bc; for (let x = x0 - f + 24; x < x1 + f - 16; x += 26) { ctx.beginPath(); ctx.moveTo(x, by - 4); ctx.lineTo(x + 4, by); ctx.lineTo(x, by + 4); ctx.lineTo(x - 4, by); ctx.fill(); }
    }
    // lace: scallops along the hem
    const w = r.w + 2 * f, m = Math.max(4, Math.round(w / (L * 2))), sw = w / m;
    K.flat(ctx, c => { c.moveTo(x0 - f, y2 - 2); for (let i = 0; i < m; i++) { const a = x0 - f + i * sw; c.arc(a + sw / 2, y2 - 2, sw / 2, Math.PI, 0, true); } c.closePath(); }, C.lace, { lw: 1.6, line: '#cbbcc4' });
    ctx.fillStyle = K.rgba(C.clothDk, .9);
    for (let i = 0; i < m; i++) { const a = x0 - f + i * sw + sw / 2; ctx.beginPath(); ctx.arc(a, y2 + sw * .18, sw * .1, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(a - sw * .26, y2 + 1, sw * .06, 0, 7); ctx.arc(a + sw * .26, y2 + 1, sw * .06, 0, 7); ctx.fill(); }
    ctx.strokeStyle = K.rgba('#cbbcc4', .9); ctx.lineWidth = 1.2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(x0 - f + 4, y2 - 9); ctx.lineTo(x1 + f - 4, y2 - 9); ctx.stroke(); ctx.setLineDash([]);
    return { top: [y0, y1], front: [y1, y2] };
  };
  // chair(ctx, x, y, s = 1, { fill = mint, frame = gold }): an upholstered chair back seen from the front, its seat line
  // at y (a seated figure's hip) — it stands behind the figure, its arched top just above the shoulders.
  K.chair = function (ctx, x, y, s = 1, o = {}) {
    const C = K.C, fill = o.fill || C.mint, fr = o.frame || C.gold, w = 98 * s, top = y - 262 * s;
    K.flat(ctx, c => { c.moveTo(x - w, y); c.lineTo(x - w, top + 60 * s); c.bezierCurveTo(x - w, top - 8 * s, x + w, top - 8 * s, x + w, top + 60 * s); c.lineTo(x + w, y); c.closePath(); }, fr, { y0: top, y1: y, light: .25, lw: 2.2, line: C.goldDk });
    const v = 14 * s;
    K.flat(ctx, c => { c.moveTo(x - w + v, y); c.lineTo(x - w + v, top + 62 * s); c.bezierCurveTo(x - w + v, top + 8 * s, x + w - v, top + 8 * s, x + w - v, top + 62 * s); c.lineTo(x + w - v, y); c.closePath(); }, fill, { y0: top, y1: y, light: .18, lw: 2, line: o.line || C.mintDk });
    ctx.fillStyle = K.rgba(K.line(fill), .5);   // button tufts
    for (const [dx, dy] of [[-40, 60], [0, 44], [40, 60], [-20, 100], [20, 100]]) { ctx.beginPath(); ctx.arc(x + dx * s, top + dy * s, 3.2 * s, 0, 7); ctx.fill(); }
    K.flat(ctx, c => K.ell(c, x, top + 6 * s, 9 * s, 7 * s), fr, { lw: 1.6, line: C.goldDk });
  };

  // ---------------- figures (frontal pastel rig) ----------------
  // Units at s = 1 (px). A figure F is placed by its pelvis (F.x, F.y); everything else is solved by pose(F).
  K.BODY = { headRx: 47, headRy: 53, neck: 14, shW: 70, torso: 200, hipW: 44, arm1: 108, arm2: 102, armW: 30, hand: 14, leg1: 112, leg2: 106, legW: 46, foot: 20 };
  // A look: clothes and hair. hair: 'short' | 'bun' | 'bob' | 'wave'; collar: 'round' | 'v' | 'shirt'; apron: a colour or null.
  K.LOOK = { top: '#86a9a3', apron: null, skin: '#f4d2bd', hair: '#4b3530', hairStyle: 'short', legs: '#5d4e6e', shoe: '#4a3040', collar: 'round', glasses: false, cheek: '#f0a3a6' };
  // ik3(a, t, l1, l2, hint) → { el, end, ok }: two-bone IK in 3-D (x right, y down, z toward the camera). Bone lengths are
  // kept; the elbow/knee bends toward `hint` (a direction); the end is clamped to reach (ok = false if it had to be).
  // Points are [x, y, z]; z of the target may be omitted (0).
  K.ik3 = function (a, t, l1, l2, hint) {
    const az = a[2] || 0, d = [t[0] - a[0], t[1] - a[1], (t[2] || 0) - az], D = Math.hypot(d[0], d[1], d[2]);
    const mx = (l1 + l2) * .999, mn = Math.abs(l1 - l2) + 1, Dc = clamp(D, mn, mx), u = D > 1e-6 ? d.map(v => v / D) : [0, 1, 0];
    const end = [a[0] + u[0] * Dc, a[1] + u[1] * Dc, az + u[2] * Dc];
    const x1 = (l1 * l1 - l2 * l2 + Dc * Dc) / (2 * Dc), h = Math.sqrt(Math.max(0, l1 * l1 - x1 * x1));
    const pd = hint[0] * u[0] + hint[1] * u[1] + hint[2] * u[2]; let v = [hint[0] - pd * u[0], hint[1] - pd * u[1], hint[2] - pd * u[2]];
    const vn = Math.hypot(v[0], v[1], v[2]) || 1; v = v.map(q => q / vn);
    return { el: [a[0] + u[0] * x1 + v[0] * h, a[1] + u[1] * x1 + v[1] * h, az + u[2] * x1 + v[2] * h], end, ok: D <= mx };
  };
  // standY(floor, s = 1) / kneelY(floor, s = 1): the pelvis height for a figure standing / kneeling on the floor row.
  K.standY = (floor, s = 1) => floor - K.BODY.foot * s - (K.BODY.leg1 + K.BODY.leg2) * s * .985;
  K.kneelY = (floor, s = 1) => floor - 16 * s - K.BODY.leg1 * s * .56;
  // walkFeet(x0, x, step = 70, lift = 20) → { feet: [x, x], lift: [px, px], dir }: a planted walk along the floor from x0
  // to the pelvis at x — each foot stays put while it carries the weight, the other swings past it. No sliding.
  K.walkFeet = function (x0, x, step = 70, lift = 20) {
    const dir = x >= x0 ? 1 : -1, D = Math.abs(x - x0), n = Math.floor(D / step), p = D / step - n, H0 = x0 + dir * n * step;
    const st = H0 + dir * step / 2, sw = H0 + dir * lerp(-step / 2, 1.5 * step, eio(p)), lf = lift * Math.sin(Math.PI * p);
    return n % 2 ? { feet: [sw, st], lift: [lf, 0], dir } : { feet: [st, sw], lift: [0, lf], dir };
  };
  // pose(F) → G, the solved figure. F = {
  //   x, y        pelvis (px);  s = 1 scale;  look (overrides LOOK);  seed (blinks)
  //   lean        torso tilt (rad, + to screen right);  bow 0..1 (a nod / bow);  bob (px up, e.g. laugh());  tilt (head, rad)
  //   turn        −1..1 face turned toward screen left/right (features slide, far ear hides)
  //   eyes        'open' | 'closed' | 'smile' (^ ^) | 'wide';  blink 0..1 (adds to 'open');  brows (px up)
  //   mouth       'smile' | 'open' (laugh) | 'o' | 'chew' | 'flat';  open 0..1 (how wide 'open'/'chew' is)
  //   hands       [screenLeft, screenRight]: null (hangs at the side) or a target [x, y, z?] (z toward the camera; leave it
  //               out for "auto": the hand comes forward just enough for a relaxed bend — use it for things on a table)
  //   elbows      [hint, hint] optional 3-D bend hints (default a little out, down and back)
  //   legs        null (hidden: seated behind something) or { floor, feet: [x, x], lift: [px, px], kneel 0..1, dir }
  // }  G = { F, L, s, hip, sh: [[x,y],[x,y]], neck, head: [x, y] (centre), mouth: [x, y], arms: [{ sh, el, hand, ok, ang }], legs }
  K.pose = function (F) {
    const B = K.BODY, s = F.s || 1, L = Object.assign({}, K.LOOK, F.look || {});
    const hip = [F.x, F.y - (F.bob || 0)], ang = F.lean || 0, bow = F.bow || 0;
    const up = [Math.sin(ang), -Math.cos(ang)], rt = [Math.cos(ang), Math.sin(ang)];
    const T = (a, b) => [hip[0] + (rt[0] * a + up[0] * b) * s, hip[1] + (rt[1] * a + up[1] * b) * s];
    const th = B.torso * (1 - .1 * bow);
    const sh = [T(-B.shW, th - 8), T(B.shW, th - 8)], neck = T(0, th);
    const ha = ang + (F.tilt || 0);   // head angle
    const hy = -(B.neck + B.headRy - 6) * (1 - .12 * bow) + 16 * bow;   // head centre in the neck frame (same as body())
    const head = [neck[0] - Math.sin(ha) * hy * s, neck[1] + Math.cos(ha) * hy * s];
    const turn = F.turn || 0, mloc = [turn * 11, 31 + 3 * bow];
    const mouth = [head[0] + (Math.cos(ha) * mloc[0] - Math.sin(ha) * mloc[1]) * s, head[1] + (Math.sin(ha) * mloc[0] + Math.cos(ha) * mloc[1]) * s];
    const arms = [0, 1].map(i => {
      const side = i ? 1 : -1, a = [sh[i][0], sh[i][1], 0], l1 = B.arm1 * s, l2 = B.arm2 * s;
      let tg = F.hands && F.hands[i];
      if (!tg) tg = [a[0] + side * 12 * s + up[0] * -(l1 + l2) * .95, a[1] + (l1 + l2) * .95 * -up[1], 8 * s];
      else if (tg[2] == null) { const d2 = Math.hypot(tg[0] - a[0], tg[1] - a[1]), rch = (l1 + l2) * .86; tg = [tg[0], tg[1], Math.sqrt(Math.max(0, rch * rch - d2 * d2))]; }
      const hint = (F.elbows && F.elbows[i]) || [side * .5, .85, -.45];
      const r = K.ik3(a, tg, l1, l2, hint);
      return { side, sh: a, el: r.el, hand: r.end, ok: r.ok, ang: Math.atan2(r.end[1] - r.el[1], r.end[0] - r.el[0]) };
    });
    let legs = null;
    if (F.legs) {
      const Lg = F.legs, kn = Lg.kneel || 0, l1 = B.leg1 * s, l2 = B.leg2 * s;
      legs = [0, 1].map(i => {
        const side = i ? 1 : -1, hj = T(side * (B.hipW - 20), 6), lift = (Lg.lift && Lg.lift[i]) || 0;
        const ank = [Lg.feet ? Lg.feet[i] : hj[0] + side * 6 * s, Lg.floor - B.foot * s - lift];
        const d = Math.hypot(ank[0] - hj[0], ank[1] - hj[1]), bend = Math.sqrt(Math.max(0, Math.pow((l1 + l2) / 2, 2) - Math.pow(d / 2, 2)));
        const f = l1 / (l1 + l2), dir = Lg.dir || 0;
        let knee = [lerp(hj[0], ank[0], f) + (side * .3 + dir * .45) * bend, lerp(hj[1], ank[1], f) + bend * .08];
        const kk = [hj[0] + side * 10 * s, Lg.floor - 16 * s];   // kneeling: the knee on the floor, the shin hidden behind
        knee = [lerp(knee[0], kk[0], kn), lerp(knee[1], kk[1], kn)];
        const ankle = [lerp(ank[0], kk[0], kn), lerp(ank[1], kk[1] - 6 * s, kn)];
        return { side, hip: hj, knee, ankle, foot: 1 - ss(.35, .8, kn), dir };
      });
    }
    return { F, L, s, hip, ang, up, rt, T, th, sh, neck, head, ha, mouth, arms, legs, turn };
  };
  // tube(ctx, pts, w, fill): a limb — a round-capped polyline with the thin darker outline.
  K.tube = function (ctx, pts, w, fill, line) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); K.poly(ctx, pts, false);
    ctx.strokeStyle = line || K.line(fill); ctx.lineWidth = w + 5; ctx.stroke(); ctx.strokeStyle = fill; ctx.lineWidth = w; ctx.stroke();
  };
  // body(ctx, G): the legs (if any), torso, collar/apron, neck, head, face and hair — everything but the arms.
  K.body = function (ctx, G) {
    const B = K.BODY, L = G.L, s = G.s, F = G.F;
    if (G.legs) for (const g of G.legs) {
      K.tube(ctx, [g.hip, g.knee, g.ankle], B.legW * s, L.legs);
      if (g.foot > .02) K.flat(ctx, c => K.ell(c, g.ankle[0] + g.dir * 8 * s, g.ankle[1] + 10 * s, 21 * s * g.foot, 11 * s * g.foot), L.shoe, { lw: 2 });
    }
    // torso (local frame: x right, y up = negative)
    ctx.save(); ctx.translate(G.hip[0], G.hip[1]); ctx.rotate(G.ang); ctx.scale(s, s);
    const th = G.th, w = B.shW, hw = B.hipW;
    const torso = c => { c.moveTo(-18, -th - 2); c.quadraticCurveTo(-w + 6, -th + 2, -w - 4, -th + 30); c.lineTo(-hw - 8, 10); c.lineTo(hw + 8, 10); c.lineTo(w + 4, -th + 30); c.quadraticCurveTo(w - 6, -th + 2, 18, -th - 2); c.closePath(); };
    K.flat(ctx, torso, L.top, { y0: -th, y1: 0, light: .12, dark: .08 });
    if (G.legs) K.flat(ctx, c => { c.moveTo(-hw - 8, -28); c.lineTo(hw + 8, -28); c.quadraticCurveTo(hw + 12, 0, hw + 4, 16); c.lineTo(-hw - 4, 16); c.quadraticCurveTo(-hw - 12, 0, -hw - 8, -28); c.closePath(); }, L.legs, { lw: 2.2 });
    if (G.legs && L.belt !== false) { ctx.fillStyle = K.tone(L.legs, -.25); ctx.fillRect(-hw - 8, -30, 2 * hw + 16, 6); }
    if (L.collar === 'v') K.flat(ctx, c => { c.moveTo(-20, -th); c.lineTo(0, -th + 34); c.lineTo(20, -th); c.closePath(); }, L.skin, { lw: 2 });
    else if (L.collar === 'shirt') { K.flat(ctx, c => { c.moveTo(-22, -th - 1); c.lineTo(-4, -th + 26); c.lineTo(-30, -th + 20); c.closePath(); c.moveTo(22, -th - 1); c.lineTo(4, -th + 26); c.lineTo(30, -th + 20); c.closePath(); }, K.tone(L.top, .55), { lw: 2 }); }
    else { ctx.strokeStyle = K.tone(L.top, -.22); ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, -th + 2, 22, 12, 0, .15, Math.PI - .15); ctx.stroke(); }
    if (L.apron) {   // a bib apron: neck strap, bib, a pocket
      ctx.strokeStyle = K.line(L.apron); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-30, -th + 52); ctx.lineTo(-17, -th - 1); ctx.moveTo(30, -th + 52); ctx.lineTo(17, -th - 1); ctx.stroke();
      ctx.strokeStyle = L.apron; ctx.lineWidth = 4.5; ctx.stroke();
      K.flat(ctx, c => { c.moveTo(-36, -th + 50); c.lineTo(36, -th + 50); c.lineTo(44, 14); c.lineTo(-44, 14); c.closePath(); }, L.apron, { y0: -th + 50, y1: 0, light: .12 });
      K.flat(ctx, c => c.rect(-20, -th + 92, 40, 30), K.tone(L.apron, -.08), { lw: 1.8 });
    }
    ctx.restore();
    // head frame: the neck pivots at the top of the torso
    ctx.save(); ctx.translate(G.neck[0], G.neck[1]); ctx.rotate(G.ha); ctx.scale(s, s);
    const hy = -(B.neck + B.headRy - 6) * (1 - .12 * (F.bow || 0)) + 16 * (F.bow || 0), rx = B.headRx, ry = B.headRy, tn = G.turn;
    K.flat(ctx, c => c.rect(-12, hy + 30, 24, -hy - 26), L.skin, { lw: 2 });
    ctx.fillStyle = K.rgba(K.tone(L.skin, -.2), .5); ctx.beginPath(); ctx.ellipse(0, hy + ry - 4, 16, 8, 0, 0, Math.PI); ctx.fill();   // chin shade on the neck
    ctx.translate(0, hy);
    K.hairBack(ctx, L, tn);
    for (const sd of [-1, 1]) { const vis = 1 - clamp(-sd * tn * 1.4); if (vis > .05) K.flat(ctx, c => K.ell(c, sd * (rx - 1 + tn * 6), 6, 9 * vis, 13), L.skin, { lw: 2 }); }
    K.flat(ctx, c => K.ell(c, 0, 0, rx, ry), L.skin, { y0: -ry, y1: ry, light: .12, dark: .04, line: K.tone(L.skin, -.4) });
    K.face(ctx, G);
    K.hairFront(ctx, L, tn);
    if (L.glasses) { const fx = tn * 12; ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 2.6;
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(fx + sd * 18, 2, 14, 0, 7); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(fx - 4, 0); ctx.quadraticCurveTo(fx, -4, fx + 4, 0); ctx.stroke(); }
    ctx.restore();
  };
  // face(ctx, G): eyes (open / blink / closed / smile ^ ^ / wide), brows, nose, cheeks, mouth — in the head frame.
  K.face = function (ctx, G) {
    const F = G.F, L = G.L, fx = G.turn * 12, ink = '#3d2236', bl = F.blink || 0, eyes = F.eyes || 'open';
    ctx.fillStyle = K.rgba(L.cheek, .55); for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(fx + sd * 27, 20, 9, 6, 0, 0, 7); ctx.fill(); }
    ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineCap = 'round';
    for (const sd of [-1, 1]) {
      const ex = fx + sd * 18, ey = 3;
      if (eyes === 'smile') { ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(ex, ey + 4, 7, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      else if (eyes === 'closed' || bl > .65) { ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ex, ey - 2, 7, Math.PI * .2, Math.PI * .8); ctx.stroke(); }
      else { const big = eyes === 'wide' ? 1.25 : 1, k = 1 - bl; ctx.beginPath(); ctx.ellipse(ex, ey, 4.8 * big, 6.6 * big * Math.max(.15, k), 0, 0, 7); ctx.fill();
        if (k > .5) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 1.6, ey - 2.4, 1.5, 0, 7); ctx.fill(); ctx.fillStyle = ink; } }
      ctx.strokeStyle = K.tone(L.hair, -.1); ctx.lineWidth = 3.2; const by = -15 - (F.brows || 0) - (eyes === 'wide' ? 4 : 0);   // brows
      ctx.beginPath(); ctx.moveTo(ex - 8, by + 2); ctx.quadraticCurveTo(ex, by - 3, ex + 8, by + 2); ctx.stroke(); ctx.strokeStyle = ink;
    }
    ctx.strokeStyle = K.tone(L.skin, -.35); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(fx + G.turn * 3 - 2, 18); ctx.quadraticCurveTo(fx + G.turn * 3 + 3, 21, fx + G.turn * 3 + 1, 23); ctx.stroke();
    const m = F.mouth || 'smile', op = F.open ?? 1, my = 33;
    if (m === 'open' || (m === 'chew' && op > .05)) {
      const w = 13, h = (m === 'chew' ? 6 : 13) * op;
      ctx.fillStyle = K.C.mouth; ctx.beginPath(); ctx.moveTo(fx - w, my - 2); ctx.quadraticCurveTo(fx, my + 1, fx + w, my - 2); ctx.quadraticCurveTo(fx + w * .7, my + h * 1.3, fx, my + h * 1.35); ctx.quadraticCurveTo(fx - w * .7, my + h * 1.3, fx - w, my - 2); ctx.fill();
      if (h > 6) { ctx.fillStyle = '#ef8f98'; ctx.beginPath(); ctx.ellipse(fx, my + h * 1.05, w * .5, h * .25, 0, 0, 7); ctx.fill(); }
      ctx.strokeStyle = K.tone(K.C.mouth, -.2); ctx.lineWidth = 1.8; ctx.stroke();
    } else if (m === 'o') { ctx.fillStyle = K.C.mouth; ctx.beginPath(); ctx.ellipse(fx, my + 2, 5.5, 7 * op + 1, 0, 0, 7); ctx.fill(); }
    else if (m === 'flat') { ctx.strokeStyle = K.C.mouth; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx - 7, my); ctx.lineTo(fx + 7, my); ctx.stroke(); }
    else { ctx.strokeStyle = K.C.mouth; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(fx, my - 8, 11, Math.PI * .22, Math.PI * .78); ctx.stroke(); }
  };
  // hairBack / hairFront(ctx, look, turn): the hair behind and over the head (head frame, head centre at 0, 0).
  K.hairBack = function (ctx, L, tn) {
    const c0 = L.hair, rx = K.BODY.headRx;
    if (L.hairStyle === 'bun') K.flat(ctx, c => K.ell(c, tn * -4, -K.BODY.headRy - 8, 23, 20), c0, { y0: -90, y1: -40, light: .14 });
    if (L.hairStyle === 'bob') K.flat(ctx, c => { c.moveTo(-rx - 8, -10); c.bezierCurveTo(-rx - 16, 30, -rx - 14, 50, -rx + 4, 58); c.lineTo(rx - 4, 58); c.bezierCurveTo(rx + 14, 50, rx + 16, 30, rx + 8, -10); c.closePath(); }, K.tone(c0, -.08));
  };
  K.hairFront = function (ctx, L, tn) {
    const c0 = L.hair, rx = K.BODY.headRx, ry = K.BODY.headRy, st = L.hairStyle, o = { y0: -ry - 8, y1: 10, light: .16 }, sx = tn * 6;
    if (st === 'short') K.flat(ctx, c => { c.moveTo(-rx - 3, 8); c.bezierCurveTo(-rx - 8, -ry * 1.52, rx + 8, -ry * 1.52, rx + 3, 8);
      c.quadraticCurveTo(rx - 4, -14, rx - 14, -20); c.quadraticCurveTo(sx + 14, -10, sx - 6, -26); c.quadraticCurveTo(sx - 22, -12, -rx + 12, -18); c.quadraticCurveTo(-rx + 2, -10, -rx - 3, 8); c.closePath(); }, c0, o);
    else if (st === 'bun') K.flat(ctx, c => { c.moveTo(-rx - 2, 4); c.bezierCurveTo(-rx - 6, -ry * 1.5, rx + 6, -ry * 1.5, rx + 2, 4);
      c.quadraticCurveTo(rx - 6, -24, sx + 2, -34); c.quadraticCurveTo(-rx + 6, -24, -rx - 2, 4); c.closePath(); }, c0, o);
    else if (st === 'bob') K.flat(ctx, c => { c.moveTo(-rx - 9, 30); c.bezierCurveTo(-rx - 14, -ry * 1.62, rx + 14, -ry * 1.62, rx + 9, 30);
      c.quadraticCurveTo(rx + 2, 34, rx - 6, 12); c.lineTo(rx - 10, -18); c.quadraticCurveTo(sx + 20, -24, sx, -20); c.quadraticCurveTo(sx - 20, -24, -rx + 10, -18); c.lineTo(-rx + 6, 12); c.quadraticCurveTo(-rx - 2, 34, -rx - 9, 30); c.closePath(); }, c0, o);
    else K.flat(ctx, c => { c.moveTo(-rx - 2, 0);   // 'wave': short curls — a row of bumps over the brow
      for (let i = 0; i <= 8; i++) { const a = Math.PI + Math.PI * i / 8, x = Math.cos(a) * (rx + 6), y = Math.sin(a) * (ry + 6) - 4; c.arc(x, y, 14, a - 1.2, a + 1.2); }
      c.lineTo(rx - 4, -14); c.quadraticCurveTo(sx + 12, -30, sx - 4, -22); c.quadraticCurveTo(-rx + 10, -30, -rx + 4, -14); c.closePath(); }, c0, o);
  };
  // arms(ctx, G, { only: 0 | 1, held: [fn, fn] }): the sleeves (shoulder → elbow → wrist) and the hands. held[i](ctx, hand,
  // ang, G) draws what hand i holds BEFORE the hand, so the fingers close over it (hand = the grip point, ang = forearm
  // direction). Draw arms after the body and after a table they rest on.
  K.arms = function (ctx, G, o = {}) {
    const B = K.BODY, L = G.L, s = G.s;
    for (const i of o.only != null ? [o.only] : [0, 1]) {
      const a = G.arms[i], h = a.hand, dx = Math.cos(a.ang), dy = Math.sin(a.ang);
      const fl = Math.hypot(h[0] - a.el[0], h[1] - a.el[1]), cut = Math.min(fl * .5, 11 * s), wr = [h[0] - dx * cut, h[1] - dy * cut];
      K.tube(ctx, [a.sh, a.el, wr], B.armW * s, L.top);
      ctx.strokeStyle = K.tone(L.top, -.18); ctx.lineWidth = 3 * s; ctx.lineCap = 'butt';   // cuff
      ctx.beginPath(); ctx.moveTo(wr[0] - dy * 13 * s, wr[1] + dx * 13 * s); ctx.lineTo(wr[0] + dy * 13 * s, wr[1] - dx * 13 * s); ctx.stroke();
      if (o.held && o.held[i]) o.held[i](ctx, h, a.ang, G);
      K.hand(ctx, h, a.ang, a.side, s, L.skin);
    }
  };
  // hand(ctx, p, ang, side, s, skin): a mitten hand at the grip point p, along the forearm direction ang, thumb on top.
  K.hand = function (ctx, p, ang, side, s, skin) {
    ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(ang); ctx.scale(s, s);
    const up = Math.cos(ang) >= 0 ? -1 : 1;   // the thumb stays on the upper side
    K.flat(ctx, c => K.ell(c, 2, 0, 14, 12), skin, { lw: 2, line: K.tone(skin, -.4) });
    K.flat(ctx, c => K.ell(c, 4, up * 10, 7, 5, .4 * up), skin, { lw: 1.8, line: K.tone(skin, -.4) });
    ctx.restore();
  };
  // figure(ctx, F) → G: pose + body + arms in one call (standing figures with nothing in front of their torso).
  K.figure = function (ctx, F, o = {}) { const G = K.pose(F); K.body(ctx, G); K.arms(ctx, G, o); return G; };

  // ---------------- small marks ----------------
  // steam(ctx, x, y, w, h, t, a = 1): three soft wisps rising from a hot dish (tied to it): width w, height h px.
  K.steam = function (ctx, x, y, w, h, t, a = 1) {
    if (a <= 0) return; ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const bx = x + (i - 1) * w / 3, ph = i * 2.1, N = 22; let px = bx, py = y;
      for (let j = 1; j <= N; j++) { const u = j / N, nx = bx + Math.sin(u * 5.5 - t * 2.2 + ph) * (5 + 16 * u) + (i - 1) * 10 * u, ny = y - u * h * (1 - .08 * i);
        ctx.strokeStyle = `rgba(255,250,244,${a * .5 * Math.sin(Math.PI * u) * (1 - u * .4)})`; ctx.lineWidth = 9 - 5 * u;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke(); px = nx; py = ny; }
    }
    ctx.restore();
  };
  // clink(ctx, x, y, k, s = 1): a small symmetric impact mark above a meeting point (glasses, hands): five short gold
  // strokes fanning upward that fly out and fade as k goes 0 → 1. No particles.
  K.clink = function (ctx, x, y, k, s = 1) {
    if (k <= 0 || k >= 1) return; const a = 1 - k * k, r0 = (16 + 26 * eo(k)) * s, len = 22 * (1 - .6 * k) * s;
    ctx.save(); ctx.lineCap = 'round';
    for (const d of [-64, -32, 0, 32, 64]) { const an = (-90 + d) * Math.PI / 180, c = Math.cos(an), sn = Math.sin(an), l = d ? len * .8 : len;
      ctx.strokeStyle = K.rgba(K.C.ink, .5 * a); ctx.lineWidth = 7 * s; ctx.beginPath(); ctx.moveTo(x + c * r0, y + sn * r0); ctx.lineTo(x + c * (r0 + l), y + sn * (r0 + l)); ctx.stroke();
      ctx.strokeStyle = K.rgba(K.C.goldLt, a); ctx.lineWidth = 4 * s; ctx.stroke(); }
    ctx.restore();
  };

  // ---------------- camera, frame, post ----------------
  // begin(ctx): black, pillarbox the portrait frame in landscape (?o=h), fill the wall colour. Call first in draw().
  K.begin = function (ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, Pilot.W, Pilot.H);
    if (Pilot.ori !== 'v') { ctx.translate((Pilot.W - K.W * Pilot.H / K.H) / 2, 0); ctx.scale(Pilot.H / K.H, Pilot.H / K.H); ctx.beginPath(); ctx.rect(0, 0, K.W, K.H); ctx.clip(); }
    ctx.fillStyle = K.C.wall; ctx.fillRect(0, 0, K.W, K.H);
  };
  // cam(ctx, s = 1, x = 540, y = 960): scale the world about (x, y) — the straight push-in. Wrap in save()/restore().
  K.cam = function (ctx, s = 1, x = CX, y = 960) { ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y); };
  // push(t, a, b, from = 1, to = 1.08) → scale: a slow, straight, eased push between a and b (s).
  K.push = (t, a, b, from = 1, to = 1.08) => lerp(from, to, eio((t - a) / (b - a)));
  // finish(ctx, { vignette = 1, grain = 1 }): paper grain (multiply) and the soft plum vignette over the picture.
  // Draw the words after it.
  K.finish = function (ctx, o = {}) {
    if (grain && (o.grain ?? 1) > 0) { ctx.save(); ctx.globalAlpha = o.grain ?? 1; ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(grain, 0, 0, K.W, K.H); ctx.restore(); }
    if (vig && (o.vignette ?? 1) > 0) { ctx.save(); ctx.globalAlpha = o.vignette ?? 1; ctx.drawImage(vig, 0, 0, K.W, K.H); ctx.restore(); }
  };
  // night(ctx, a = .5, color = '#c9b6d6'): evening in the room — a cool lavender multiplied over everything drawn so far
  // (draw lampGlow AFTER it, so the lamps warm the table back up). a = 0 is day.
  K.night = function (ctx, a = .5, col = '#c9b6d6') { if (a <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = clamp(a); ctx.fillStyle = col; ctx.fillRect(-200, -200, K.W + 400, K.H + 400); ctx.restore(); };
  // dim(ctx, a): lay a plum dusk over the frame (0..1 → 0..~.62) — for the end card.
  K.dim = function (ctx, a) { if (a <= 0) return; ctx.fillStyle = `rgba(34,14,40,${.62 * clamp(a)})`; ctx.fillRect(0, 0, K.W, K.H); };
  // fade(ctx, t, dur, fi = .5, fo = .5): from black at the start and to black at the end (films join cleanly).
  K.fade = (ctx, t, dur, fi = .5, fo = .5) => Story.fadeBlack(ctx, t, dur, fi, fo);

  // ---------------- words ----------------
  // card(ctx, s, y, a = 1, { size = 54, hang = 286, minW = 380, x = 540 }): a cream title card centred on x at row y (its
  // middle), thin plum line + inner gold line, Noto Serif KR 600 in plum ink, hung on two thin gold cords from the pelmet
  // (y = hang; 0 = no cords). s = the whole Korean string (translated inside), ≤ 2 lines. a = its alpha.
  K.card = function (ctx, s, y, a = 1, o = {}) {
    if (a <= 0) return; const C = K.C, str = Pilot.tr(s), lines = String(str).split('\n'), size = o.size || 54, lh = size * 1.42, x = o.x ?? CX;
    ctx.save(); ctx.font = `600 ${size}px ${K.SERIF}`;
    const tw = Math.max(...lines.map(l => ctx.measureText(l).width)), w = Math.max(o.minW ?? 380, tw + 132), h = lines.length * lh + 58;
    const x0 = x - w / 2, y0 = y - h / 2;
    ctx.globalAlpha = a;
    const hang = o.hang ?? 286;
    if (hang) { ctx.strokeStyle = C.goldDk; ctx.lineWidth = 2; for (const d of [-w / 2 + 40, w / 2 - 40]) { ctx.beginPath(); ctx.moveTo(x + d, hang); ctx.lineTo(x + d, y0 + 4); ctx.stroke(); } }
    ctx.fillStyle = 'rgba(40,12,44,.28)'; ctx.fillRect(x0 + 7, y0 + 9, w, h);   // the card's paper shadow on the set
    K.flat(ctx, c => c.rect(x0, y0, w, h), C.cream, { y0, y1: y0 + h, light: .3, dark: .03, line: C.ink, lw: 2.5 });
    ctx.strokeStyle = C.gold; ctx.lineWidth = 1.6; ctx.strokeRect(x0 + 8, y0 + 8, w - 16, h - 16);
    ctx.fillStyle = C.gold; for (const sx of [x0 + 8, x0 + w - 8]) { ctx.beginPath(); ctx.moveTo(sx, y - 7); ctx.lineTo(sx + 6, y); ctx.lineTo(sx, y + 7); ctx.lineTo(sx - 6, y); ctx.fill(); }
    if (hang) { ctx.fillStyle = C.gold; for (const d of [-w / 2 + 40, w / 2 - 40]) { ctx.beginPath(); ctx.arc(x + d, y0 + 4, 4, 0, 7); ctx.fill(); } }
    ctx.restore();
    Pilot.text(ctx, s, x, y - (lines.length - 1) * lh / 2 + size * .36, { size, weight: 600, font: K.SERIF, color: C.ink, alpha: a, lh: 1.42 });
  };
  // captions(ctx, t, lines, { y = 455, size, hang }): SCRIPT.lines ([from, to, text]) as hanging title cards: each drops
  // in straight down (0.45 s, eased, no bounce) and fades out. ≤ 2 lines each.
  K.captions = function (ctx, t, lines, o = {}) {
    for (const [a, b, s] of lines) {
      const al = Pilot.win(t, a, b, .3, .35); if (al <= 0) continue;
      const dy = -26 * (1 - eo((t - a) / .45));
      K.card(ctx, s, (o.y ?? 455) + dy, al, o);
    }
  };
  // endCard(ctx, t, card, at, { y = 640, dim = true, hang = 262 }): the room dims, a framed cream plaque drops in (hung from the
  // pelmet) and the shared Story.endCard (title · passage · by) is set on it in Serif/Sans plum.
  K.endCard = function (ctx, t, card, at, o = {}) {
    const a = ss(at, at + (card.compact ? .5 : .9), t); if (a <= 0) return;
    if (o.dim !== false) K.dim(ctx, ss(at - .4, at + .4, t));
    const C = K.C, y = o.y ?? 640, dy = -22 * (1 - eo((t - at) / .55)), x0 = 170, w = 740, y0 = y - (card.kicker ? 192 : 118), h = y + 352 - y0;
    const two = String(Pilot.tr(card.title)).includes('\n');
    ctx.save(); ctx.translate(0, dy); ctx.globalAlpha = a;
    ctx.strokeStyle = C.goldDk; ctx.lineWidth = 2; for (const d of [-290, 290]) { ctx.beginPath(); ctx.moveTo(CX + d, (o.hang ?? 262) - dy); ctx.lineTo(CX + d, y0 + 4); ctx.stroke(); }
    ctx.fillStyle = 'rgba(20,6,24,.35)'; ctx.fillRect(x0 + 9, y0 + 11, w, h);
    K.flat(ctx, c => c.rect(x0, y0, w, h), C.cream, { y0, y1: y0 + h, light: .3, dark: .04, line: C.ink, lw: 3 });
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.strokeRect(x0 + 12, y0 + 12, w - 24, h - 24); ctx.lineWidth = 1; ctx.strokeRect(x0 + 18, y0 + 18, w - 36, h - 36);
    ctx.fillStyle = C.gold; for (const d of [-290, 290]) { ctx.beginPath(); ctx.arc(CX + d, y0 + 4, 4.5, 0, 7); ctx.fill(); }
    // an ornament between title and the small lines: a rule with a diamond
    ctx.strokeStyle = C.gold; ctx.lineWidth = 1.6; const oy = y + (two ? 184 : 118); ctx.beginPath(); ctx.moveTo(CX - 120, oy); ctx.lineTo(CX - 14, oy); ctx.moveTo(CX + 14, oy); ctx.lineTo(CX + 120, oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CX, oy - 8); ctx.lineTo(CX + 8, oy); ctx.lineTo(CX, oy + 8); ctx.lineTo(CX - 8, oy); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(0, dy);
    Story.endCard(ctx, t, card, at, { y, font: K.SERIF, srcFont: K.SANS, color: C.ink, srcColor: C.inkSoft, ctaColor: C.ink, titleShadow: '', ...o });
    ctx.restore();
  };

  window.Diorama = K;
})();

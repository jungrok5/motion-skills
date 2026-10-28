/* kit-spiritglow.js — house style "dark forest, glowing spirits" (어두운 숲 · 빛나는 영혼) for word-log films. Global: window.SpiritGlow
   A dark painterly forest at night: thin black trunks with broken lit edges, rock slabs cut with a palette knife, shallow
   pools glowing cyan-white from the small figures standing in them, a far crowd of tiny flickering lights, heavy grain.
   Everything static is painted ONCE (shapes → a knife pass that re-paints each plane in short flat strokes sampled from
   itself → grain); the life is drawn on top (glows breathe, the far crowd flickers, motes rise). The figures are hooded
   travellers in slate cloaks with a warm face in profile; a cyan bloom + a bright rim make them glow. ONE warm accent:
   amber (a lit wooden thing, a lamp, an arch of light) — everything else is teal/cyan on near-black.
   First film: sermons/2026-10-24-cross-styles/film/scenes/cs-spiritglow.html (잘라 낸 건 다리였다 · 02, the worked example).
   Style card: styles/spiritglow/STYLE.md. Template: styles/spiritglow/template.html.

   HOW A FRAME IS MADE (world units = px at zoom 1; near lane y ≈ 1300, the path's far edge y 1212)
     const cm = camAt(t), [z1, ex1, ey1] = SG.layerM(cm, 1);
     SG.backdrop(ctx, cm, t);                                  sky, far trunks, the far crowd, pools with breathing glows
     SG.layer(ctx, cm, 1, () => { SG.drawGround(ctx); SG.gate(…); SG.groundGlow(…) … });   the world plane
     SG.figures(ctx, z1, ex1, ey1, wy0, wy1, [['act', a => …, .8], ['me', a => …, 1]]);   figures: cyan bloom + rim
     SG.layer(ctx, cm, 1, () => SG.sprite(…TX.warm…));        the accent's light ('lighter')
     SG.foreground(ctx, cm, t);  SG.captions(…);  SG.endPlate(ctx, t, at);  SG.endCard(…)
   Pure and seek-safe: every texture is built once from seeded rng; buffers are fully cleared on use. No network, no images.
   Load after lib.js (Pilot) and story.js (Story). */
(function () {
  const { clamp, lerp, ss, eo, eio, rng } = Pilot;
  const W = 1080, H = 1920, TAU = Math.PI * 2;
  const SG = {};
  const hx = Pilot.hex, mixHex = (a, b, k) => Pilot.rgb(Pilot.mix(hx(a), hx(b), k));
  const pathOf = pts => { const p = new Path2D(); p.moveTo(...pts[0]); for (const q of pts.slice(1)) p.lineTo(...q); p.closePath(); return p; };
  SG.mixHex = mixHex; SG.pathOf = pathOf;

  /* ---------------------------------------------------------------- palette, type */
  // top/trunk the darks, ink caption colour, fogD teal shade; me / pil cloaks (hero / others), arm hero near arm, skin / skinP
  // faces & hands (hero / others), legs; gold/goldL/goldD THE warm accent; wood/woodL the others' dark wood and its cyan edge.
  const C = SG.C = {
    top: '#03090c', trunk: '#040d10', ink: '#e4fbf5', fogD: '#2a7a72',
    me: '#2e4d59', pil: '#172a30', arm: '#43697a', skin: '#e3b48e', skinP: '#c79a7a', legs: '#142329', gold: '#ffbe62', goldL: '#fff1cc', goldD: '#d9782a',
    steel: '#5f8f8b', handle: '#8a5a32', wood: '#0d2526', woodL: 'rgba(150,250,228,.8)',
  };
  SG.ACCENT = C.gold;
  SG.FONT = "'Nanum Myeongjo','NanumMyeongjo',serif";
  SG.FONTS = ["700 60px 'NanumMyeongjo'", "700 60px 'Nanum Myeongjo'", "400 28px 'Noto Sans KR'", "500 34px 'Noto Sans KR'"];   // Pilot.run({ fonts })
  SG.RIM = 'rgba(170,255,236,.95)';     // the figures' bright cyan rim
  SG.BLOOM = 'rgb(110,235,210)';        // the figures' halo colour

  /* ---------------------------------------------------------------- state (built once) */
  const TX = SG.TX = {};      // glow, warm (sprites), sky, fg, vig, plate, ravine
  const PL = SG.PL = [];      // painted planes { c, p, x0, y0, w, h, SP: [[x, y, h] glowing figures in its pools] }
  let GRAINT = null, CAM = null, DUR = 30, SM, ACT, MEL, BLOOM, BLOOM2, TMP, RIM, BAND = [0, H];
  const TINY = SG.TINY = [], MOTES = SG.MOTES = [];
  const FM = SG.FM = 220;

  /* init({ cam, dur }) — grain, glow sprites and buffers. cam(t) → { x, y, z } is the scene's camera (planes are sized to
     everything it sees; call init when the camera can run). Then forest(), ground()/gap(), life(), finish() — see below. */
  SG.init = function (o = {}) {
    CAM = o.cam || (() => ({ x: 540, y: 960, z: 1 })); DUR = o.dur ?? 30;
    { const N = 512, t = Pilot.canvas(N, N), tg = t.getContext('2d'), id = tg.createImageData(N, N), r = rng(5);
      for (let i = 0; i < N * N; i++) { const v = 128 + (r() - .5) * 68; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; } tg.putImageData(id, 0, 0); GRAINT = t; }
    TX.glow = glowSprite(256, [[0, 'rgba(160,255,232,.9)'], [.3, 'rgba(70,210,190,.4)'], [1, 'rgba(30,120,110,0)']]);
    TX.warm = glowSprite(256, [[0, 'rgba(255,236,190,1)'], [.15, 'rgba(255,190,110,.75)'], [.45, 'rgba(220,130,60,.22)'], [1, 'rgba(160,90,40,0)']]);
  };
  /* finish() — the screen-space pieces: sky, foreground trunks, vignette, end plate, the figure buffers. Call last in init. */
  SG.finish = function () {
    TX.sky = Pilot.canvas(W, H); { const g = TX.sky.getContext('2d'), sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, C.top); sky.addColorStop(.38, '#07181c'); sky.addColorStop(.5, '#0e3634'); sky.addColorStop(.56, '#0b2b2b'); sky.addColorStop(1, '#061416'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
      const hz = g.createRadialGradient(560, 960, 20, 560, 960, 620); hz.addColorStop(0, 'rgba(60,190,170,.5)'); hz.addColorStop(.5, 'rgba(30,120,112,.2)'); hz.addColorStop(1, 'rgba(20,80,80,0)');
      g.save(); g.scale(1, .7); g.fillStyle = hz; g.fillRect(0, 0, W, H / .7); g.restore(); grainOn(TX.sky, .4); }
    TX.fg = Pilot.canvas(W + 2 * FM, H); { const g = TX.fg.getContext('2d'), r = rng(303); g.translate(FM, 0);
      for (const [x, w, lr] of [[-10, 110, true], [150, 40, true], [1070, 84, false], [960, 30, false]]) trunkShape(g, r, x, H + 20, w, -60, C.trunk, 'rgba(70,170,160,.45)', 10, lr);
      g.setTransform(1, 0, 0, 1, 0, 0); knife(TX.fg, 1500, rng(9), 1, 0, 99999); }
    TX.vig = Pilot.canvas(W, H); { const g = TX.vig.getContext('2d'), vg = g.createLinearGradient(0, 0, 0, 760); vg.addColorStop(0, 'rgba(1,5,7,.88)'); vg.addColorStop(1, 'rgba(1,5,7,0)');
      g.fillStyle = vg; g.fillRect(0, 0, W, 760); const bg = g.createLinearGradient(0, 1640, 0, H); bg.addColorStop(0, 'rgba(2,8,9,0)'); bg.addColorStop(1, 'rgba(2,8,9,.8)'); g.fillStyle = bg; g.fillRect(0, 1640, W, 280); }
    TX.plate = Pilot.canvas(W, H); { const g = TX.plate.getContext('2d'), lg = g.createLinearGradient(0, 0, 0, H);
      lg.addColorStop(0, '#020709'); lg.addColorStop(.45, '#08201f'); lg.addColorStop(1, '#020709'); g.fillStyle = lg; g.fillRect(0, 0, W, H);
      const rg = g.createRadialGradient(540, 900, 20, 540, 900, 700); rg.addColorStop(0, 'rgba(60,170,150,.22)'); rg.addColorStop(1, 'rgba(60,170,150,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); grainOn(TX.plate, .45); }
    ACT = Pilot.canvas(W, H); TMP = Pilot.canvas(W, H); RIM = Pilot.canvas(W, H); MEL = Pilot.canvas(W, H); SM = Pilot.canvas(W / 6, H / 6); BLOOM = Pilot.canvas(W / 6, H / 6); BLOOM2 = Pilot.canvas(W / 18, H / 18);
  };

  /* ---------------------------------------------------------------- painting helpers (from the lab) */
  // glowSprite(N, stops): an N² radial gradient sprite (stops [[offset, css colour], …]).
  function glowSprite(N, stops) { const c = Pilot.canvas(N, N), g = c.getContext('2d'), gr = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
    for (const [o, col] of stops) gr.addColorStop(o, col); g.fillStyle = gr; g.fillRect(0, 0, N, N); return c; }
  // trunkShape(g, r, x, yb, w, top, col, colL, spikes, litRight): a thin wobbling trunk from yb up to top, width w, with a
  //   broken lit edge (colL) on the right or left side and `spikes` broken-branch stubs.
  function trunkShape(g, r, x, yb, w, top, col, colL, spikes, litRight) {
    const N = 30, Lp = [], R = [];
    for (let i = 0; i <= N; i++) { const u = i / N, y = lerp(yb, top, u), ww = w * (1 - u * .35), dx = (Pilot.noise(u * 6 + x, 2) - .5) * w * .35;
      Lp.push([x + dx - ww / 2 + (r() - .5) * w * .08, y]); R.push([x + dx + ww / 2 + (r() - .5) * w * .08, y]); }
    g.fillStyle = col; g.beginPath(); g.moveTo(...Lp[0]); for (const p of Lp) g.lineTo(...p); for (const p of R.slice().reverse()) g.lineTo(...p); g.closePath(); g.fill();
    g.strokeStyle = colL; g.lineCap = 'butt'; const side = litRight ? R : Lp, sd = litRight ? 2 : -2;
    for (let i = 0; i < N; i++) { if (r() < .35) continue; const p = side[N - i], q = side[N - i - 1];
      g.lineWidth = 1 + r() * w * .12; g.globalAlpha = .4 + r() * .4; g.beginPath(); g.moveTo(p[0] - sd, p[1]); g.lineTo(q[0] - sd, q[1]); g.stroke(); }
    g.globalAlpha = 1; g.fillStyle = col;
    for (let k = 0; k < spikes; k++) { const y = lerp(yb - 60, top, r() * .9), s = r() < .5 ? -1 : 1, l = 20 + r() * 60 * (w / 30), a = .12 + r() * .35;
      g.beginPath(); g.moveTo(x + s * w * .3, y - 3); g.lineTo(x + s * (w * .3 + l), y + l * a * (r() < .5 ? -1 : 1) * .6); g.lineTo(x + s * w * .3, y + 3); g.closePath(); g.fill(); }
  }
  // spiritPath(x, y, h, kind, face): the lab's little glowing person from the waterline up (kind 1 = seated, 0 = standing), as a Path2D.
  function spiritPath(x, y, h, kind, face) {
    const s = h / 100, p = new Path2D();
    if (kind === 1) {
      p.ellipse(x, y - 62 * s, 13 * s, 15 * s, 0, 0, TAU);
      p.moveTo(x - 30 * s, y); p.lineTo(x - 30 * s, y - 30 * s); p.quadraticCurveTo(x - 28 * s, y - 44 * s, x - 10 * s, y - 46 * s);
      p.lineTo(x + 10 * s, y - 46 * s); p.quadraticCurveTo(x + 28 * s, y - 44 * s, x + 30 * s, y - 30 * s); p.lineTo(x + 30 * s, y); p.closePath();
    } else {
      p.ellipse(x + face * 1.5 * s, y - 88 * s, 10.5 * s, 12.5 * s, 0, 0, TAU);
      p.rect(x - 4.5 * s, y - 78 * s, 9 * s, 8 * s);
      p.moveTo(x - 14 * s, y); p.lineTo(x - 16 * s, y - 50 * s); p.quadraticCurveTo(x - 17 * s, y - 68 * s, x - 6 * s, y - 72 * s);
      p.lineTo(x + 6 * s, y - 72 * s); p.quadraticCurveTo(x + 17 * s, y - 68 * s, x + 16 * s, y - 50 * s); p.lineTo(x + 14 * s, y); p.closePath();
      for (const sd of [-1, 1]) { p.moveTo(x + sd * 15 * s, y - 68 * s); p.quadraticCurveTo(x + sd * 22 * s, y - 64 * s, x + sd * 22 * s, y - 50 * s); p.lineTo(x + sd * 21 * s, y - 26 * s);
        p.quadraticCurveTo(x + sd * 19.5 * s, y - 22 * s, x + sd * 18 * s, y - 26 * s); p.lineTo(x + sd * 17.5 * s, y - 52 * s); p.closePath(); }
    }
    return p;
  }
  // knife(c, n, r, K, wy0, groundY): re-paint canvas c with n short flat strokes sampled from itself (vertical above the world
  //   ground line groundY, flat and sparser below); K = canvas px per world px, wy0 = world y of the canvas top.
  function knife(c, n, r, K, wy0, groundY) {
    const g = c.getContext('2d'), w = c.width, h = c.height, d = g.getImageData(0, 0, w, h).data, keep = Pilot.canvas(w, h); keep.getContext('2d').drawImage(c, 0, 0);
    for (let k = 0; k < n; k++) {
      const x = r() * w, y = r() * h, i = ((y | 0) * w + (x | 0)) * 4; if (d[i + 3] < 40) continue;
      const ground = y / K + wy0 > groundY, j = ground ? .9 + r() * .22 : .94 + r() * .1;
      const a = ground ? (r() - .5) * .9 : Math.PI / 2 + (r() - .5) * .25, l = (ground ? 16 + r() * 70 : 14 + r() * 60) * K, ww = (ground ? 5 + r() * 12 : 2 + r() * 5) * K;
      if (ground && r() < .4) continue;
      g.fillStyle = `rgba(${d[i] * j | 0},${d[i + 1] * j | 0},${d[i + 2] * j | 0},${(ground ? .3 + r() * .4 : .4 + r() * .4) * d[i + 3] / 255})`;
      g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(-l / 2, -ww / 2); g.lineTo(l / 2, -ww / 2 + (r() - .5) * 2 * K); g.lineTo(l / 2 - 2 * K, ww / 2); g.lineTo(-l / 2 + K, ww / 2); g.closePath(); g.fill(); g.restore();
    }
    g.save(); g.globalCompositeOperation = 'destination-in'; g.drawImage(keep, 0, 0); g.restore();
  }
  // grainOn(c, alpha): overlay the heavy grain on canvas c (keeps its alpha).
  function grainOn(c, alpha = .55) {
    const g = c.getContext('2d'), keep = Pilot.canvas(c.width, c.height); keep.getContext('2d').drawImage(c, 0, 0);
    g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = alpha; g.fillStyle = g.createPattern(GRAINT, 'repeat'); g.fillRect(0, 0, c.width, c.height);
    g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in'; g.drawImage(keep, 0, 0); g.restore();
  }
  // slabs(g, r, x0, x1, yA, yB, n, scA, scB, lit, avoid): n knife-cut rock slabs scattered in perspective between yA (far,
  //   scale scA) and yB (near, scB); lit 0…1 = how much cyan light catches their tops; avoid(x, y) → true skips one.
  function slabs(g, r, x0, x1, yA, yB, n, scA, scB, lit, avoid) {
    const list = []; for (let i = 0; i < n; i++) { const v = Math.pow(r(), .9); list.push([x0 + r() * (x1 - x0), yA + v * (yB - yA), v]); }
    list.sort((a, b) => a[1] - b[1]);
    for (const [cx, y, v] of list) {
      if (avoid && avoid(cx, y)) continue;
      const sc = lerp(scA, scB, v), w = (110 + r() * 230) * sc, rh = (30 + r() * 40) * sc, x = cx - w / 2, Lt = lit * (.6 + r() * .6);
      const tilt = (r() - .5) * rh * .6, top = rh * (.25 + r() * .3), k = .7 + r() * .3;
      const pts = [[x + r() * 6 * sc, y + rh + 3], [x, y + tilt * .3 + r() * 5 * sc], [x + w * (.25 + r() * .4), y - r() * 5 * sc], [x + w, y + tilt], [x + w - r() * 12 * sc, y + rh + 3]];
      g.fillStyle = Pilot.rgb([lerp(4, 14, k * (.2 + Lt)), lerp(12, 44, k * (.2 + Lt)), lerp(14, 44, k * (.2 + Lt))]);
      g.beginPath(); g.moveTo(...pts[0]); for (const q of pts) g.lineTo(...q); g.closePath(); g.fill();
      g.fillStyle = Pilot.rgb([lerp(14, 70, Lt), lerp(40, 178, Lt), lerp(42, 164, Lt)], (.12 + Lt * .85) * k); g.beginPath(); g.moveTo(...pts[1]); g.lineTo(...pts[2]); g.lineTo(...pts[3]);
      g.lineTo(pts[3][0] - r() * 8 * sc, pts[3][1] + top); g.lineTo(lerp(pts[1][0], pts[3][0], .5 + r() * .3), pts[2][1] + top * (.7 + r() * .5)); g.lineTo(pts[1][0] + r() * 6, pts[1][1] + top * (.5 + r() * .6)); g.closePath(); g.fill();
      if (Lt > .3 && r() < .5) { g.strokeStyle = `rgba(170,255,236,${(Lt - .25) * .45})`; g.lineWidth = .8 + sc; g.beginPath(); g.moveTo(...pts[1]); g.lineTo(...pts[2]); g.lineTo(...pts[3]); g.stroke(); }
    }
  }
  // pool(g, r, cx, cy, rw, rh, figs, SP): a shallow pool lit from inside by glowing water-lilies (figs [[fx −1…1, h], …]);
  //   pushes each light's [x, y, size] onto SP (backdrop() breathes a glow there).
  function pool(g, r, cx, cy, rw, rh, figs, SP) {
    const pts = []; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; pts.push([cx + Math.cos(a) * rw * (.8 + r() * .3), cy + Math.sin(a) * rh * (.75 + r() * .35)]); }
    const p = pathOf(pts); g.save(); g.clip(p); g.fillStyle = '#0d4442'; g.fillRect(cx - rw * 1.3, cy - rh * 1.4, rw * 2.6, rh * 2.8);
    for (const [fx, h] of figs) { const sx = cx + fx * rw, R = h * 3.2 + 40, gr = g.createRadialGradient(sx, cy, 2, sx, cy, R);
      gr.addColorStop(0, 'rgba(225,255,248,1)'); gr.addColorStop(.22, 'rgba(120,240,220,.85)'); gr.addColorStop(.6, 'rgba(40,170,160,.45)'); gr.addColorStop(1, 'rgba(20,100,96,0)');
      g.fillStyle = gr; g.save(); g.translate(sx, cy); g.scale(1, .45); g.translate(-sx, -cy); g.fillRect(sx - R, cy - R, 2 * R, 2 * R); g.restore(); }
    for (let k = 0; k < rw * 3; k++) { const x = cx + (r() - .5) * rw * 2, y = cy + (r() - .5) * rh * 2; g.fillStyle = r() < .5 ? 'rgba(4,40,40,.35)' : 'rgba(190,255,236,.18)'; g.fillRect(x, y, 1 + r() * 3, 1 + r() * 2); }
    g.restore();
    for (const [fx, h] of figs) { const x = cx + fx * rw, R = h * .22; g.save(); g.shadowColor = 'rgba(150,255,230,.9)'; g.shadowBlur = R * 1.4;
      g.fillStyle = 'rgba(40,110,96,.9)'; g.beginPath(); g.ellipse(x, cy + 1, R * 1.7, R * .35, 0, 0, TAU); g.fill();
      for (let i = 0; i < 7; i++) { const a = Math.PI + (i + .5) / 7 * Math.PI, px = x + Math.cos(a) * R * .55, py = cy - R * .2 + Math.sin(a) * R * .55;
        g.fillStyle = i % 2 ? '#d8fff4' : '#b9f6e6'; g.beginPath(); g.ellipse(px, py, R * .22, R * .6, a + Math.PI / 2, 0, TAU); g.fill(); }
      g.fillStyle = '#f2fffb'; g.beginPath(); g.ellipse(x, cy - R * .3, R * .3, R * .25, 0, 0, TAU); g.fill(); g.restore(); SP.push([x, cy, h * .45]); }
  }
  Object.assign(SG, { glowSprite, trunkShape, spiritPath, knife, grainOn, slabs, pool });

  /* ---------------------------------------------------------------- camera */
  SG.mixCam = (a, b, k) => k <= 0 ? a : k >= 1 ? b : { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
  // layerM(cm, p) → [zoom, ex, ey] of depth p;  layer(ctx, cm, p, fn) runs fn in depth p's world coords.
  SG.layerM = (cm, p) => { const z = 1 + (cm.z - 1) * p, cx = cm.x * p, cy = 960 + (cm.y - 960) * p; return [z, 540 - cx * z + (cm.sx || 0) * p, 960 - cy * z + (cm.sy || 0) * p]; };
  SG.layer = function (ctx, cm, p, fn) { const [z, ex, ey] = SG.layerM(cm, p); ctx.save(); ctx.setTransform(z, 0, 0, z, ex, ey); fn(); ctx.restore(); };
  // shake(c, t, at, dur, ax, ay): the hit — decaying shake from `at` into c.sx/c.sy (px). Returns c.
  SG.shake = function (c, t, at, dur = .55, ax = 15, ay = 11) { const k = 1 - ss(at, at + dur, t); c.sx = t >= at ? ax * k * Math.sin(t * 97) : 0; c.sy = t >= at ? ay * k * Math.sin(t * 131 + 1) : 0; return c; };

  /* ---------------------------------------------------------------- painted planes (camera-sized) */
  function extents(p, m = 140) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let t = 0; t <= DUR; t += .05) { const cm = CAM(t), z = 1 + (cm.z - 1) * p, cx = cm.x * p, cy = 960 + (cm.y - 960) * p;
      x0 = Math.min(x0, cx - 540 / z); x1 = Math.max(x1, cx + 540 / z); y0 = Math.min(y0, cy - 960 / z); y1 = Math.max(y1, cy + 960 / z); }
    return [Math.floor(x0 - m), Math.ceil(x1 + m), Math.floor(y0 - m), Math.ceil(y1 + m)];
  }
  SG.extents = extents;
  /* plane(p, K, groundY, knifeN, seed, build, yTop) — a painted plane at depth p, K canvas px per world px: build(g, x0, x1,
     y0, y1, SP) paints it in world coords, then the knife pass (knifeN strokes, seed; flat strokes below world y groundY) and
     grain. yTop clips the plane's top (world y) to save memory. Returns { c, p, x0, y0, w, h, SP } (also pushed on PL). */
  SG.plane = function (p, K, groundY, knifeN, seed, build, yTop) {
    let [x0, x1, y0, y1] = extents(p); if (yTop != null) y0 = Math.max(y0, yTop);
    const c = Pilot.canvas(Math.ceil((x1 - x0) * K), Math.ceil((y1 - y0) * K)), g = c.getContext('2d'), SP = [];
    g.setTransform(K, 0, 0, K, -x0 * K, -y0 * K); g.lineJoin = 'round'; build(g, x0, x1, y0, y1, SP); g.setTransform(1, 0, 0, 1, 0, 0);
    knife(c, knifeN, rng(seed), K, y0, groundY); grainOn(c);
    const P = { c, p, x0, y0, w: x1 - x0, h: y1 - y0, SP }; PL.push(P); return P;
  };
  /* forest() — the style's standard backdrop: plane 0 (p .18) far trunks in haze, plane 1 (p .45) mid trunks + far pools
     with tiny glowing figures + slabs, plane 2 (p .75) nearer pools with bigger figures + a few trunks. Call once after init. */
  SG.forest = function () {
    PL.length = 0;
    SG.plane(.18, .5, 1000, 2600, 1, (g, x0, x1, y0, y1) => { const r = rng(201);
      for (let x = x0; x < x1; x += 40 + r() * 70) { const w = 4 + r() * 8, k = r(); trunkShape(g, r, x, 990 + r() * 30, w, y0 - 40, `rgb(${lerp(8, 22, k) | 0},${lerp(30, 64, k) | 0},${lerp(34, 66, k) | 0})`, 'rgba(60,150,140,.5)', 5, r() < .5); }
      const gr = g.createLinearGradient(0, 995, 0, 1100); gr.addColorStop(0, '#0d2c2c'); gr.addColorStop(1, '#081c1e'); g.fillStyle = gr;
      g.beginPath(); g.moveTo(x0, y1); for (let x = x0; x <= x1; x += 30) g.lineTo(x, 1000 + Math.sin(x / 90) * 5); g.lineTo(x1, y1); g.closePath(); g.fill();
      for (let k = 0; k < (x1 - x0) / 9; k++) { const x = x0 + r() * (x1 - x0), y = 1004 + r() * 40; g.fillStyle = `rgba(120,230,210,${.08 + r() * .2})`; g.fillRect(x, y, 6 + r() * 30, 1.5); }
    }, -200);
    SG.plane(.45, .6, 1040, 5200, 2, (g, x0, x1, y0, y1, SP) => { const r = rng(202);
      g.fillStyle = '#081c1e'; g.beginPath(); g.moveTo(x0, y1); for (let x = x0; x <= x1; x += 30) g.lineTo(x, 1036 + Math.sin(x / 70) * 4); g.lineTo(x1, y1); g.closePath(); g.fill();
      for (let x = x0 + 100; x < x1; x += 330 + r() * 260) pool(g, r, x, 1062 + r() * 30, 60 + r() * 50, 9 + r() * 5, [[(r() - .5) * .8, 26 + r() * 22, r() < .4 ? 1 : 0, r() < .5 ? 1 : -1]].concat(r() < .5 ? [[(r() - .5) * .8, 20 + r() * 16, 0, 1]] : []), SP);
      slabs(g, r, x0, x1, 1040, 1120, (x1 - x0) / 9, .12, .3, .25);
      for (let x = x0 + r() * 200; x < x1; x += 160 + r() * 260) trunkShape(g, r, x, 1050 + r() * 20, 8 + r() * 9, y0 - 40, '#06171a', 'rgba(80,190,175,.55)', 8, r() < .5);
    }, -300);
    SG.plane(.75, .75, 1120, 6000, 3, (g, x0, x1, y0, y1, SP) => { const r = rng(203);
      g.fillStyle = '#071a1c'; g.beginPath(); g.moveTo(x0, y1); for (let x = x0; x <= x1; x += 30) g.lineTo(x, 1118 + Math.sin(x / 80) * 5); g.lineTo(x1, y1); g.closePath(); g.fill();
      slabs(g, r, x0, x1, 1118, 1210, (x1 - x0) / 12, .3, .55, .3);
      for (let x = x0 + 200; x < x1; x += 620 + r() * 420) pool(g, r, x, 1160 + r() * 20, 110 + r() * 60, 14 + r() * 6, [[(r() - .5) * .7, 54 + r() * 40, r() < .3 ? 1 : 0, r() < .5 ? 1 : -1], [(r() - .5) * .8, 36 + r() * 24, r() < .5 ? 1 : 0, 1]], SP);
      for (let x = x0 + r() * 300; x < x1; x += 420 + r() * 380) trunkShape(g, r, x, 1150 + r() * 30, 14 + r() * 10, y0 - 40, '#05131a', 'rgba(80,190,175,.5)', 9, r() < .5);
    }, -300);
  };
  SG.putPlane = function (ctx, cm, P) { SG.layer(ctx, cm, P.p, () => ctx.drawImage(P.c, P.x0, P.y0, P.w, P.h)); };
  /* life({ warmX, motes }) — the living lights: TINY = the far crowd (fireflies over the far pools, p .3; the ones within 90 px
     of world x warmX catch the warm light), MOTES = 40 motes rising (motes = { x, w, y }: world band x…x+w from y down 900 px;
     defaults to a band around the frame centre). Call once after forest(). */
  SG.life = function (o = {}) {
    TINY.length = 0; MOTES.length = 0;
    const r = rng(505), [tx0, tx1] = extents(.3), wx = o.warmX ?? -1e9;
    for (let x = tx0; x < tx1; x += 7 + r() * 16) { const d = r(), y = 960 + Math.pow(r(), .7) * 60 - Math.abs(r() - .5) * 40 * d;
      TINY.push({ x, y, s: 4 + d * 6, a: .35 + r() * .5, ph: r() * TAU, p: [2, 3, 6][r() * 3 | 0], warm: Math.abs(x - wx * .3) < 90 }); }
    const M = o.motes || { x: 300, w: 480, y: 1612 };
    for (let i = 0; i < 40; i++) MOTES.push({ x: M.x + r() * M.w, y: M.y + r() * 900, v: 20 + r() * 30, a: .25 + r() * .4, r: 1.2 + r() * 2, ph: r() * TAU });
  };
  // breathe(t, ph, period) → 0…1: the slow pulse every glow in this style follows.
  const breathe = SG.breathe = (t, ph, p = 3) => .5 + .5 * Math.sin(TAU * t / p + ph);
  // sprite(ctx, S, x, y, rx, ry, a): draw sprite S stretched to an ellipse rx × ry at alpha a (set the composite yourself).
  function sprite(ctx, S0, x, y, rx, ry, a) { if (a <= 0) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(S0, x - rx, y - ry, 2 * rx, 2 * ry); }
  SG.sprite = sprite;
  /* backdrop(ctx, cm, t) — sky, plane 0, the far crowd flickering (p .3), planes 1–2 with their pools' glows breathing. */
  SG.backdrop = function (ctx, cm, t) {
    ctx.drawImage(TX.sky, 0, 0);
    SG.putPlane(ctx, cm, PL[0]);
    SG.layer(ctx, cm, .3, () => { for (const q of TINY) { const b = .55 + .45 * breathe(t, q.ph, q.p); ctx.globalAlpha = q.a * b; ctx.fillStyle = q.warm ? '#ffe2b0' : '#c8fff0';
      const fx = q.x + Math.sin(t * .7 + q.ph) * 7, fy = q.y - q.s * 2 + Math.cos(t * .9 + q.ph * 1.3) * 5;
      ctx.beginPath(); ctx.arc(fx, fy, q.s * .22, 0, TAU); ctx.fill(); ctx.globalAlpha *= .18; ctx.beginPath(); ctx.arc(fx, fy, q.s * .8, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; });
    for (const i of [1, 2]) { const P = PL[i]; SG.putPlane(ctx, cm, P);
      SG.layer(ctx, cm, P.p, () => { ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const [x, y, h] of P.SP) { const R = h * 1.5 + 24; sprite(ctx, TX.glow, x, y - h * .5, R, R * .8, .14 + .1 * breathe(t, x * .01)); } ctx.restore(); }); }
  };

  /* ---------------------------------------------------------------- the ground: rock path, gaps (ravines), an arch of light */
  /* gap({ x, w, top, seed }) — a ravine from x to x + w through the path (top = its far edge y, default 1212): black depths,
     knife-cut ledges, a faint teal haze far down. Returns { x, w, top, path (Path2D), edge, tex }. Build gaps BEFORE ground(). */
  SG.gap = function (o) {
    const E = o.x, G = o.w, RT = o.top ?? 1212, r = rng(o.seed ?? 81), Lw = [], Rw = [];
    for (const [side, arr, x0] of [[1, Lw, E], [-1, Rw, E + G]]) { let y = RT;
      while (y < RT + 1500) { const d = y - RT, ins = Math.min(G / 2 - 34, d < 140 ? d * .1 : 14 + (d - 140) * .2);
        arr.push([x0 + side * (ins + r() * 7), y]); y += 22 + r() * 30; if (r() < .25 && d > 100) { arr.push([x0 + side * (ins + 10 + r() * 14), y]); y += 6; } } }
    const VOID = new Path2D(); VOID.moveTo(E, RT - 2); for (const p of Lw) VOID.lineTo(...p); for (const p of Rw.slice().reverse()) VOID.lineTo(...p); VOID.lineTo(E + G, RT - 2); VOID.closePath();
    return { x: E, w: G, top: RT, path: VOID, edge: [Lw, Rw], tex: null };
  };
  function gapTex(gp) {
    const E = gp.x, G = gp.w, RT = gp.top, [Lw, Rw] = gp.edge, VOID = gp.path;
    const RX0 = E - 10, RX1 = E + G + 10, RY0 = RT - 4, RY1 = RT + 1500, c = Pilot.canvas(RX1 - RX0, RY1 - RY0), g = c.getContext('2d');
    g.translate(-RX0, -RY0); g.clip(VOID);
    const bg = g.createLinearGradient(0, RT, 0, RT + 1000); bg.addColorStop(0, '#061517'); bg.addColorStop(.35, '#020809'); bg.addColorStop(.6, '#05201f'); bg.addColorStop(1, '#010405');
    g.fillStyle = bg; g.fillRect(RX0, RY0, RX1 - RX0, RY1 - RY0);
    { const hz = g.createLinearGradient(0, RT + 150, 0, RT + 900); hz.addColorStop(0, 'rgba(40,150,138,0)'); hz.addColorStop(.35, 'rgba(46,160,146,.55)'); hz.addColorStop(.6, 'rgba(30,120,112,.4)'); hz.addColorStop(1, 'rgba(10,50,50,0)');
      g.fillStyle = hz; g.fillRect(RX0, RT + 150, RX1 - RX0, 750); }
    for (const [col, sh] of [['#0b2324', 30], ['#071718', 12]]) for (const arr of [Lw, Rw]) {
      const side = arr === Lw ? 1 : -1; g.fillStyle = col; g.beginPath(); g.moveTo(side > 0 ? RX0 : RX1, RT + 60);
      for (const p of arr) if (p[1] > RT + 60) g.lineTo(p[0] + side * (sh + Math.sin(p[1] / 40) * 8), p[1] + 10); g.lineTo(side > 0 ? RX0 : RX1, RY1); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(110,220,200,.18)'; g.lineWidth = 1.6; g.beginPath(); for (let i = 1; i < arr.length - 1; i += 2) { const p = arr[i]; g.moveTo(p[0] + side * (sh + 4), p[1] + 10); g.lineTo(p[0] + side * (sh + 30), p[1] + 12); } g.stroke(); }
    gp.tex = { c, x: RX0, y: RY0 };
  }
  /* ground({ top, gaps }) — the path as a painted plane at p = 1: dark rock with knife-cut slabs in perspective, a cyan edge
     line, each gap cut out of it (and each gap's inside painted). Returns the plane; draw it with drawGround(ctx) in the world layer. */
  let GROUND = null;
  SG.ground = function (o = {}) {
    const RT = o.top ?? 1212, gaps = o.gaps || [];
    GROUND = SG.plane(1, 1, 0, 9000, 4, (g, x0, x1, y0, y1) => { const q = rng(204);
      const gr = g.createLinearGradient(0, RT, 0, RT + 700); gr.addColorStop(0, '#174043'); gr.addColorStop(.2, '#0e2a2d'); gr.addColorStop(1, '#030b0d');
      g.fillStyle = gr; g.beginPath(); g.moveTo(x0, y1); for (let x = x0; x <= x1; x += 14) g.lineTo(x, RT + Math.sin(x / 37) * 2 + Math.sin(x / 13) * 1.2); g.lineTo(x1, y1); g.closePath(); g.fill();
      g.save(); g.clip(new Path2D(`M${x0} ${RT - 4}H${x1}V${y1}H${x0}Z`));
      slabs(g, q, x0, x1, RT + 4, RT + 520, (x1 - x0) / 5, .45, 1.6, .22);
      g.restore();
      g.strokeStyle = 'rgba(120,230,210,.35)'; g.lineWidth = 2; g.beginPath(); for (let x = x0; x <= x1; x += 14) g.lineTo(x, RT + Math.sin(x / 37) * 2 + Math.sin(x / 13) * 1.2 + 1); g.stroke();
      for (const gp of gaps) { g.save(); g.globalCompositeOperation = 'destination-out'; g.fill(gp.path); g.restore(); }
    }, RT - 60);
    PL.pop();   // the ground is drawn by drawGround, not by backdrop
    for (const gp of gaps) gapTex(gp);
    return GROUND;
  };
  SG.roadY = (x, top = 1212) => top + Math.sin(x / 37) * 2 + Math.sin(x / 13) * 1.2;   // the path's far edge at x
  SG.drawGround = ctx => ctx.drawImage(GROUND.c, GROUND.x0, GROUND.y0, GROUND.w, GROUND.h);
  SG.drawGap = (ctx, gp) => ctx.drawImage(gp.tex.c, gp.tex.x, gp.tex.y);
  /* gapLife(ctx, t, gp, inside) — cyan motes rising in the gap (clipped to it, 'lighter'); inside() runs in the same clip
     (draw a thing sinking into the gap there; set the composite you need). Draw after drawGap, before drawGround. */
  SG.gapLife = function (ctx, t, gp, inside) {
    const RT = gp.top;
    ctx.save(); ctx.clip(gp.path); ctx.globalCompositeOperation = 'lighter';
    for (const m of MOTES) { const y = m.y - ((t * m.v) % 900), al = m.a * ss(RT + 40, RT + 260, y) * (.6 + .4 * breathe(t, m.ph, 2)); if (al > 0) { ctx.fillStyle = `rgba(150,255,230,${al})`; ctx.beginPath(); ctx.arc(m.x, y, m.r, 0, TAU); ctx.fill(); } }
    if (inside) inside();
    ctx.restore();
  };
  // motes(ctx, t, top, fade, k, bottom): the same rising motes anywhere (not clipped): visible between world y top (fading in
  //   over `fade` px below it) and bottom (e.g. the ground line), at strength k. Set life({ motes }) to where they should rise.
  SG.motes = function (ctx, t, top, fade = 220, k = 1, bottom = 1e9) {
    if (k <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const m of MOTES) { const y = m.y - ((t * m.v) % 900), al = k * m.a * ss(top, top + fade, y) * (1 - ss(bottom - 40, bottom, y)) * (.6 + .4 * breathe(t, m.ph, 2)); if (al > 0) { ctx.fillStyle = `rgba(150,255,230,${al})`; ctx.beginPath(); ctx.arc(m.x, y, m.r, 0, TAU); ctx.fill(); } }
    ctx.restore();
  };
  SG.gapEdges = function (ctx, gp) {
    ctx.save(); ctx.strokeStyle = 'rgba(150,245,225,.7)'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    for (const arr of gp.edge) { ctx.beginPath(); ctx.moveTo(arr === gp.edge[0] ? gp.x : gp.x + gp.w, gp.top); for (const p of arr) { if (p[1] > gp.top + 280) break; ctx.lineTo(...p); } ctx.stroke(); }
    ctx.restore();
  };
  // archPath(A, r): round-arch outline of radius r for A = { x, cy, base } (centre x, arch centre y, ground y − 4).
  SG.archPath = function (A, r) { const p = new Path2D(), gy = A.base + 4; p.moveTo(A.x - r, gy); p.lineTo(A.x - r, A.cy); p.arc(A.x, A.cy, r, Math.PI, TAU); p.lineTo(A.x + r, gy); p.closePath(); return p; };
  /* gate(ctx, t, A) — a black stone arch with amber light filling its opening, a halo, voussoirs, light pooling at its foot. */
  SG.gate = function (ctx, t, A) {
    const GX = A.x, GAY = A.cy, BY = A.base, archPath = r => SG.archPath(A, r);
    const fl = .93 + .07 * breathe(t, 0, .37);
    ctx.save(); ctx.globalCompositeOperation = 'screen'; sprite(ctx, TX.warm, GX, BY - 170, 620, 560, .55 * fl); ctx.restore();
    const lg = ctx.createLinearGradient(0, GAY - 98, 0, BY); lg.addColorStop(0, '#ffe2a6'); lg.addColorStop(.6, '#fff3d6'); lg.addColorStop(1, '#ffc878');
    ctx.fillStyle = '#071416'; ctx.fill(archPath(138)); ctx.fillRect(GX - 152, BY - 30, 304, 34);
    ctx.fillStyle = lg; ctx.fill(archPath(98));
    ctx.strokeStyle = 'rgba(255,200,130,.35)'; ctx.lineWidth = 2.4; ctx.stroke(archPath(138));
    for (let i = 0; i < 11; i++) { const a = Math.PI + Math.PI * (i + .5) / 11; ctx.beginPath(); ctx.moveTo(GX + Math.cos(a) * 100, GAY + Math.sin(a) * 100); ctx.lineTo(GX + Math.cos(a) * 136, GAY + Math.sin(a) * 136); ctx.stroke(); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; sprite(ctx, TX.warm, GX, BY - 150, 260, 300, .5 * fl); sprite(ctx, TX.warm, GX, BY + 40, 360, 60, .55 * fl); ctx.restore();
  };
  // groundGlow(ctx, x, y, w, a, warm): a flat pool of light on the rock (w wide, 0.2·w tall) — cyan under a figure, amber under the accent.
  SG.groundGlow = function (ctx, x, y, w, a, warm) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; sprite(ctx, warm ? TX.warm : TX.glow, x, y, w, w * .2, a); ctx.restore(); };
  // warmLight(ctx, x, y, R, a): the accent's amber light ('lighter', round).
  SG.warmLight = function (ctx, x, y, R, a) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; sprite(ctx, TX.warm, x, y, R, R, a); ctx.restore(); };
  // flecks(ctx, t, list): triangles thrown up and falling to their landing y ({ t0, x, y, vx, vy, land, r0, vr, sz, col }); fade 1.0–1.6 s.
  SG.flecks = function (ctx, t, list) {
    for (const q of list) {
      const u = t - q.t0; if (u < 0) continue; const al = 1 - ss(q.t0 + 1.0, q.t0 + 1.6, t); if (al <= 0) continue;
      const tl = (-q.vy + Math.sqrt(q.vy * q.vy + 4 * 700 * (q.land - q.y))) / 1400, uu = Math.min(u, Math.max(0, tl));
      const x = q.x + q.vx * uu, y = q.y + q.vy * uu + 700 * uu * uu, r = q.r0 + q.vr * uu;
      ctx.globalAlpha = al; ctx.fillStyle = q.col; ctx.beginPath();
      for (let i = 0; i < 3; i++) { const a = r + i * TAU / 3 + (i === 1 ? .5 : 0); ctx.lineTo(x + Math.cos(a) * q.sz, y + Math.sin(a) * q.sz * .7); } ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  /* ---------------------------------------------------------------- figures: bloom + rim */
  function rim(ctx, ACTc, dx, dy, col, a) {   // the edge of the silhouette, lit
    const r = RIM.getContext('2d'), [y0, y1] = BAND, h = y1 - y0; if (h <= 0 || a <= 0) return;
    r.globalCompositeOperation = 'copy'; r.drawImage(ACTc, 0, y0, W, h, 0, y0, W, h); r.globalCompositeOperation = 'destination-out'; r.drawImage(ACTc, 0, y0, W, h, dx, y0 + dy, W, h);
    r.globalCompositeOperation = 'source-in'; r.fillStyle = col; r.fillRect(0, y0, W, h); r.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = a; ctx.drawImage(RIM, 0, y0, W, h, 0, y0, W, h); ctx.restore();
  }
  /* figures(ctx, z1, ex1, ey1, wy0, wy1, layers) — draw the figure layers, each [slot 'act'|'me', fn(a), halo 0…1]: fn draws
     in world coords on that slot's buffer (rows wy0…wy1 only); then each gets a cyan bloom (its silhouette, blurred at 1/6 and
     1/18), is composited, and gets the bright rim. Two slots so the hero can glow stronger than the crowd. */
  SG.figures = function (ctx, z1, ex1, ey1, wy0, wy1, layers) {
    BAND = [Math.max(0, Math.floor(wy0 * z1 + ey1)), Math.min(H, Math.ceil(wy1 * z1 + ey1))];
    const hb = BAND[1] - BAND[0];
    for (const [slot, fn, hal] of layers) {
      const cv = slot === 'me' ? MEL : ACT;
      const a = cv.getContext('2d'); a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, BAND[0], W, hb); a.setTransform(z1, 0, 0, z1, ex1, ey1);
      a.lineCap = 'round'; a.lineJoin = 'round'; fn(a);
      if (hb <= 0) continue;
      const b = BLOOM.getContext('2d'), b2 = BLOOM2.getContext('2d');
      const sm = SM.getContext('2d'); sm.globalCompositeOperation = 'source-over'; sm.clearRect(0, 0, SM.width, SM.height); sm.drawImage(cv, 0, BAND[0], W, hb, 0, BAND[0] / 6, W / 6, hb / 6);
      sm.globalCompositeOperation = 'source-in'; sm.fillStyle = SG.BLOOM; sm.fillRect(0, 0, SM.width, SM.height); sm.globalCompositeOperation = 'source-over';
      b.clearRect(0, 0, BLOOM.width, BLOOM.height); b.filter = 'blur(3px)'; b.drawImage(SM, 0, 0); b.filter = 'none';
      b2.clearRect(0, 0, BLOOM2.width, BLOOM2.height); b2.filter = 'blur(4px)'; b2.drawImage(BLOOM, 0, 0, BLOOM2.width, BLOOM2.height); b2.filter = 'none';
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .42 * hal; ctx.drawImage(BLOOM, 0, 0, W, H); ctx.globalAlpha = .38 * hal; ctx.drawImage(BLOOM2, 0, 0, W, H); ctx.restore();
      ctx.drawImage(cv, 0, BAND[0], W, hb, 0, BAND[0], W, hb);
      rim(ctx, cv, 2.6 * z1, 2.2 * z1, SG.RIM, .9 * hal);
    }
  };
  // withAlpha(ctx, a, fn): draw fn(g) as ONE layer at opacity a (inside a figures() layer fn — uses the current band).
  SG.withAlpha = function (ctx, a, fn) {
    if (a >= 1) return fn(ctx); if (a <= 0) return;
    const g = TMP.getContext('2d'), [y0, y1] = BAND; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, y0, W, y1 - y0); g.setTransform(ctx.getTransform()); fn(g);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.drawImage(TMP, 0, y0, W, y1 - y0, 0, y0, W, y1 - y0); ctx.restore();
  };

  /* ---------------------------------------------------------------- the figure: hooded traveller on a 2-bone IK rig */
  /* Pose F = { s, f (1 right / −1 left), gy, hip [x, y], ang (lean, f folded in), feet [far, near], hands [far, near] (grip
       points or null), hand ['fist'|'flat'|'open' ×2], tilt (head turn vs body), sway, ph, col (cloak), armCol (near sleeve,
       lighter than the cloak), skin (face + near hand; far hand 30 % darker), legCol, edge (dark outline on the arms — keeps the
       arm readable over the glowing body), blink, farFront, alpha (withAlpha), sq (turn squash) }.
     Bones ×s: thigh 96, shin 90, upper arm 78, forearm 74; shoulder at body (6, 140) behind the neck, far arm from (−2, 138). */
  function ik(a, t, l1, l2, pick) {
    let dx = t[0] - a[0], dy = t[1] - a[1], d = Math.hypot(dx, dy) || 1e-6; const dd = clamp(d, Math.abs(l1 - l2) + .5, l1 + l2 - .5);
    const tx = a[0] + dx / d * dd, ty = a[1] + dy / d * dd, an = Math.atan2(ty - a[1], tx - a[0]), b = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
    const j1 = [a[0] + Math.cos(an + b) * l1, a[1] + Math.sin(an + b) * l1], j2 = [a[0] + Math.cos(an - b) * l1, a[1] + Math.sin(an - b) * l1];
    return [pick(j1, j2), [tx, ty]];
  }
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
  Object.assign(SG, { ik, basis, shoulderOf, capsule, poly });
  /* figure(ctx, F, mid, back) — draw the traveller: back() first (a thing carried behind the body), mid() between the head and
     the near arm (a thing held in front, under the near hand). Colours default to the hero's (C.me / C.arm / C.skin / C.legs). */
  SG.figure = function (ctx, F, mid, back) {
    const sq = F.sq != null && F.sq !== 1; if (sq) { ctx.save(); ctx.translate(F.hip[0], 0); ctx.scale(F.sq, 1); ctx.translate(-F.hip[0], 0); }
    const s = F.s, f = F.f, col = F.col || C.me, far = mixHex(col, '#000000', .35), skin = F.skin || C.skin, skinF = mixHex(skin, '#000000', .3), { P } = basis(F);
    const sh = P(6, 140), shF = P(-2, 138);
    const elbowPick = (a, b) => (a[1] - f * a[0] * .35) > (b[1] - f * b[0] * .35) ? a : b, kneePick = (a, b) => f * a[0] > f * b[0] ? a : b;
    const arm = (S0, T, c, type, hc) => {
      if (!T) T = [S0[0] - f * 8 * s, S0[1] + 140 * s];
      const [el, hd] = ik(S0, T, 78 * s, 74 * s, elbowPick);
      poly(ctx, capsule(S0, el, 21 * s, 16 * s), c); poly(ctx, capsule(el, hd, 16 * s, 12 * s), c);
      if (F.edge && c !== far) { ctx.strokeStyle = F.edge; ctx.lineWidth = 2.4; for (const q of [capsule(S0, el, 21 * s, 16 * s), capsule(el, hd, 16 * s, 12 * s)]) { ctx.beginPath(); ctx.moveTo(...q[0]); for (const v of q) ctx.lineTo(...v); ctx.closePath(); ctx.stroke(); } }
      const an = Math.atan2(hd[1] - el[1], hd[0] - el[0]);
      let pts;
      if (type === 'flat') pts = [[-4, -7], [10, -8], [24, -5], [28, 0], [22, 4], [-2, 6], [-8, 2]].map(([u, v]) => [hd[0] + f * u * s, hd[1] + v * s - 4 * s]);
      else if (type === 'open') pts = [[-6, -8], [16, -9], [26, -4], [18, -2], [27, 2], [16, 5], [-2, 9], [-8, 2]].map(([u, v]) => [hd[0] + (Math.cos(an) * u - Math.sin(an) * v) * s, hd[1] + (Math.sin(an) * u + Math.cos(an) * v) * s]);
      else { pts = []; for (let i = 0; i < 12; i++) { const q = i / 12 * TAU; pts.push([hd[0] + Math.cos(q) * 13 * s, hd[1] + Math.sin(q) * 11.5 * s]); }
        pts.splice(8, 0, [hd[0] + Math.cos(an - 1.9) * 16 * s, hd[1] + Math.sin(an - 1.9) * 16 * s]); }
      poly(ctx, capsule(el, [lerp(el[0], hd[0], .82), lerp(el[1], hd[1], .82)], 17 * s, 14 * s), c);   // the sleeve
      poly(ctx, pts, hc);
    };
    const leg = (T, c) => {
      const hp = P(-2, -2), ank = [T[0], T[1] - 9 * s];
      const [kn, an] = ik(hp, ank, 96 * s, 90 * s, kneePick);
      poly(ctx, capsule(hp, kn, 26 * s, 20 * s), c); poly(ctx, capsule(kn, an, 20 * s, 14 * s), c);
      const lift = Math.max(0, F.gy - T[1]), toe = lift > 6 * s ? .35 : 0;
      poly(ctx, [[-11, -14], [8, -13], [30, -6], [36, 1], [-12, 1]].map(([u, v]) => { const cu = Math.cos(toe), su = Math.sin(toe); return [an[0] + f * (u * cu - v * su) * s, an[1] + 9 * s + (u * su + v * cu) * s]; }), c);
    };
    if (back) back();
    if (!F.farFront) arm(shF, F.hands[0], far, F.hand?.[0] || 'fist', skinF);
    leg(F.feet[0], far); leg(F.feet[1], F.legCol || col);
    const hemD = Math.max(40 * s, F.gy - F.hip[1] - 70 * s), sw = (F.sway || 0) * s;
    const skx = (a, b) => [F.hip[0] + f * a * s + sw * b / hemD, F.hip[1] + b];
    const cl = [skx(-30, -10), skx(28, -10), skx(40, hemD * .55)];
    for (let i = 0; i <= 9; i++) { const u = i / 9, a = lerp(50, -50, u); cl.push(skx(a, hemD + (i % 2 ? -7 : 3) * s + Math.sin(i * 1.7 + (F.ph || 0) * 6) * 2 * s)); }
    cl.push(skx(-40, hemD * .55)); poly(ctx, cl, col);
    poly(ctx, [[-26, -6], [-33, 40], [-34, 100], [-27, 138], [-10, 152], [10, 154], [25, 142], [29, 110], [31, 60], [26, -6]].map(([a, b]) => P(a, b)), col);
    const tilt = F.ang + (F.tilt || 0), hu = [Math.sin(tilt), -Math.cos(tilt)], hf = [f * Math.cos(tilt), f * Math.sin(tilt)], N = P(6, 146);
    const Hc = [N[0] + hu[0] * 30 * s + hf[0] * 4 * s, N[1] + hu[1] * 30 * s + hf[1] * 4 * s], Q = (a, b) => [Hc[0] + (hf[0] * a + hu[0] * b) * s, Hc[1] + (hf[1] * a + hu[1] * b) * s];
    // the hood, a little fuller than the head, with the face in profile inside its opening
    poly(ctx, [[-32, -42], [-39, -20], [-40, 2], [-35, 22], [-24, 36], [-8, 44], [10, 44], [24, 36], [32, 22], [34, 10], [30, -14], [24, -26], [10, -34], [2, -44], [-16, -50]].map(([a, b]) => Q(a, b)), col);
    poly(ctx, [[10, 26], [21, 23], [28, 15], [31, 8], [36, 2], [38, -3], [33, -7], [31, -12], [28, -19], [20, -25], [11, -27], [6, -12], [5, 10]].map(([a, b]) => Q(a, b)), skin);
    ctx.strokeStyle = col; ctx.lineWidth = 7 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(...Q(9, 30)); ctx.quadraticCurveTo(...Q(1, 2), ...Q(9, -30)); ctx.stroke();
    ctx.fillStyle = mixHex(skin, '#000000', .25); ctx.beginPath(); ctx.moveTo(...Q(12, 27)); ctx.lineTo(...Q(28, 22)); ctx.lineTo(...Q(31, 12)); ctx.lineTo(...Q(16, 18)); ctx.closePath(); ctx.fill();
    const E0 = Q(24, 8); ctx.fillStyle = '#1b1210'; ctx.beginPath(); ctx.ellipse(E0[0], E0[1], 2.6 * s, (F.blink ? .6 : 3) * s, tilt, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.moveTo(...Q(20, 15)); ctx.lineTo(...Q(28, 15.5)); ctx.stroke();
    if (mid) mid();
    if (F.farFront) arm(shF, F.hands[0], far, F.hand?.[0] || 'fist', skinF);
    arm(sh, F.hands[1], F.armCol || col, F.hand?.[1] || 'fist', skin);
    if (sq) ctx.restore();
  };
  // hero(F, t) / other(F): the film's two colourings (hero: slate cloak, lighter sleeve, warm face, blinking; others: darker, paler face).
  SG.hero = (F, t = 0) => Object.assign(F, { col: C.me, armCol: C.arm, edge: 'rgba(4,14,18,.75)', skin: C.skin, legCol: C.legs, blink: (t % 3.7) > 3.58 });
  SG.other = F => Object.assign(F, { col: C.pil, edge: 'rgba(4,14,18,.6)', armCol: '#22404a', skin: C.skinP, legCol: C.legs });

  /* ---------------------------------------------------------------- poses (same rig and rules as fogforest; fresh F each call) */
  SG.walk = function (x, gy, s, f, ph, stride, lean, lift = 22) {
    const frac = v => v - Math.floor(v);
    const feet = [0, 1].map(i => { const p = frac(ph + i * .5); let off, up = 0;
      if (p < .58) off = stride * (.29 - p); else { const u = (p - .58) / .42; off = -.29 * stride + .58 * stride * eio(u); up = lift * Math.sin(Math.PI * u); }
      return [x + f * off * s, gy - up * s]; });
    const hipH = (176 - 5 * Math.abs(Math.sin(TAU * ph))) * s;
    return { s, f, gy, hip: [x, gy - hipH], ang: f * lean, feet, hands: [null, null], hand: ['fist', 'fist'], tilt: 0, sway: -f * 7 * Math.sin(TAU * ph), ph };
  };
  SG.stand = function (x, gy, s, f, lean = .05) { return { s, f, gy, hip: [x, gy - 178 * s], ang: f * lean, feet: [[x - f * 18 * s, gy], [x + f * 22 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: 0, sway: 0 }; };
  SG.crouch = function (x, gy, s, f, bend = 1.1) { return { s, f, gy, hip: [x, gy - 84 * s], ang: f * bend, feet: [[x - f * 74 * s, gy], [x + f * 60 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: -f * .32, sway: 0 }; };
  SG.kneel = function (x, gy, s, f, bend = .3) { return { s, f, gy, hip: [x, gy - 98 * s], ang: f * bend, feet: [[x - f * 92 * s, gy], [x + f * 58 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: 0, sway: 0, knee: true }; };
  SG.hangHands = function (F, swing = 0) { const sh = basis(F).P(4, 136); return [[sh[0] - F.f * (10 + swing) * F.s, sh[1] + 140 * F.s], [sh[0] - F.f * (10 - swing) * F.s, sh[1] + 140 * F.s]]; };
  SG.mix = function (A, Bs, k) {
    if (k <= 0) return A; if (k >= 1) return Bs;
    const l2 = (a, b) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], hA = SG.hangHands(A), hB = SG.hangHands(Bs);
    const pick = k < .5 ? A : Bs;
    return { ...pick, s: lerp(A.s, Bs.s, k), gy: lerp(A.gy, Bs.gy, k), hip: l2(A.hip, Bs.hip), ang: lerp(A.ang, Bs.ang, k), feet: [l2(A.feet[0], Bs.feet[0]), l2(A.feet[1], Bs.feet[1])],
      hands: [0, 1].map(i => l2(A.hands[i] || hA[i], Bs.hands[i] || hB[i])), hand: pick.hand.slice(), tilt: lerp(A.tilt || 0, Bs.tilt || 0, k), sway: lerp(A.sway || 0, Bs.sway || 0, k) };
  };
  SG.turn = function (A, Bs, k) { const F = SG.mix(A, Bs, k); if (k > 0 && k < 1) F.sq = Math.max(.3, Math.abs(Math.cos(Math.PI * k))); return F; };
  SG.knee = function (F, i = 1) { const s = F.s, f = F.f, hp = basis(F).P(-2, -2), T = F.feet[i];
    return ik(hp, [T[0], T[1] - 9 * s], 96 * s, 90 * s, (a, b) => f * a[0] > f * b[0] ? a : b)[0]; };
  SG.look = function (F, a) { F.tilt = F.f * a; return F; };
  SG.reach = function (F, far, near, shapes) { F.hands = [far, near]; if (shapes) F.hand = shapes.slice(); return F; };

  /* ---------------------------------------------------------------- long things held + the cross prop */
  SG.pt = (X, u, v = 0) => [X.x + Math.cos(X.a) * u - Math.sin(X.a) * v, X.y + Math.sin(X.a) * u + Math.cos(X.a) * v];
  SG.mixX = (A, Bx, k) => k <= 0 ? A : k >= 1 ? Bx : { ...Bx, x: lerp(A.x, Bx.x, k), y: lerp(A.y, Bx.y, k), a: lerp(A.a, Bx.a, k), u0: Bx.u0, lie: k > .62 ? Bx.lie : A.lie };
  SG.rotAbout = function (X, pv, th) { const ox = X.x - pv[0], oy = X.y - pv[1]; return { ...X, x: pv[0] + ox * Math.cos(th) - oy * Math.sin(th), y: pv[1] + ox * Math.sin(th) + oy * Math.cos(th), a: X.a + th }; };
  SG.onShoulder = function (F, a0, contact, thick) {
    const fr = basis(F), sh = shoulderOf(F), T = [sh[0] - fr.up[0] * 6 * F.s, sh[1] - fr.up[1] * 6 * F.s];
    const a = F.f > 0 ? a0 : Math.PI - a0, d = [Math.cos(a), Math.sin(a)]; let n = [d[1], -d[0]]; if (n[1] > 0) n = [-n[0], -n[1]];
    return { x: T[0] + n[0] * thick / 2 - d[0] * contact, y: T[1] + n[1] * thick / 2 - d[1] * contact, a, contact };
  };
  SG.upright = function (F, foot = 0, dx = 58) { return { x: F.hip[0] + dx * F.s, y: F.gy + 2 + foot, a: -Math.PI / 2 }; };
  SG.inFront = function (F, len, lift = 0) { const c = basis(F).P(30, 96 + lift); return { x: c[0] - len / 2, y: c[1], a: 0 }; };
  SG.CROSS = { L: 520, PW: 34, CBX: 390, CBW: 32, CBH: 118, CBHL: 50 };
  /* cross(ctx, kind, u0, u1, x, y, a, lying, K) — 'warm'/'mine' = glowing amber wood (the accent); anything else = dark wood
     whose edges are lit cyan by its bearer's glow. Material between u0…u1 along the post, foot at (x, y), angle a. */
  SG.cross = function (ctx, kind, u0, u1, x, y, a, lying, K = SG.CROSS) {
    const { L, PW, CBX, CBW, CBH, CBHL } = K;
    if (u1 - u0 < .5) return;
    const hb = lying ? CBHL : CBH;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.beginPath(); ctx.rect(u0, -hb - 6, u1 - u0, 2 * hb + 12); ctx.clip();
    if (kind === 'mine' || kind === 'warm') {
      const gp = ctx.createLinearGradient(0, -PW / 2, 0, PW / 2); gp.addColorStop(0, C.goldL); gp.addColorStop(.45, C.gold); gp.addColorStop(1, C.goldD);
      ctx.fillStyle = gp; ctx.fillRect(0, -PW / 2, L, PW);
      const gb = ctx.createLinearGradient(CBX - CBW / 2, 0, CBX + CBW / 2, 0); gb.addColorStop(0, C.goldD); gb.addColorStop(.5, C.gold); gb.addColorStop(1, C.goldL);
      ctx.fillStyle = gb; ctx.fillRect(CBX - CBW / 2, -hb, CBW, 2 * hb);
      ctx.strokeStyle = 'rgba(170,90,30,.4)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); for (const v of [-7, 3, 10]) { ctx.moveTo(4, v); for (let u = 4; u < L - 4; u += 40) ctx.lineTo(u + 40, v + Math.sin(u * .05 + v) * 1.5); } ctx.stroke();
      if (u0 > .5) { ctx.fillStyle = '#fffbe8'; ctx.fillRect(u0, -PW / 2, 3.5, PW); }
      if (u1 < L - .5) { ctx.fillStyle = '#fffbe8'; ctx.fillRect(u1 - 3.5, -PW / 2, 3.5, PW); }
    } else {
      ctx.fillStyle = C.wood; ctx.fillRect(0, -PW / 2, L, PW); ctx.fillRect(CBX - CBW / 2, -hb, CBW, 2 * hb);
      ctx.strokeStyle = C.woodL; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(1.5, -PW / 2 + 1.5); ctx.lineTo(CBX - CBW / 2, -PW / 2 + 1.5); ctx.moveTo(CBX + CBW / 2, -PW / 2 + 1.5); ctx.lineTo(L - 1.5, -PW / 2 + 1.5); ctx.lineTo(L - 1.5, PW / 2);
      ctx.moveTo(CBX - CBW / 2 + 1.5, -PW / 2); ctx.lineTo(CBX - CBW / 2 + 1.5, -hb + 1.5); ctx.lineTo(CBX + CBW / 2 - 1.5, -hb + 1.5); ctx.stroke();
      ctx.strokeStyle = 'rgba(150,250,228,.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, PW / 2 - 1); ctx.lineTo(L, PW / 2 - 1); ctx.stroke();
    }
    ctx.restore();
  };
  SG.crossOutline = function (x, y, K = SG.CROSS) {
    const { L, PW, CBX, CBW, CBHL } = K, hb = CBHL; return [[0, -PW / 2], [CBX - CBW / 2, -PW / 2], [CBX - CBW / 2, -hb], [CBX + CBW / 2, -hb], [CBX + CBW / 2, -PW / 2], [L, -PW / 2], [L, PW / 2],
      [CBX + CBW / 2, PW / 2], [CBX + CBW / 2, hb], [CBX - CBW / 2, hb], [CBX - CBW / 2, PW / 2], [0, PW / 2]].map(([a, b]) => [x + a, y + b]);
  };

  /* ---------------------------------------------------------------- foreground, words, end */
  // foreground(ctx, cm, t, { cx }): the black framing trunks (parallax around world x cx, default 1200) and the top/bottom vignette.
  SG.foreground = function (ctx, cm, t, o = {}) {
    const fx = clamp(-(cm.x - (o.cx ?? 1200)) * .08, -FM + 20, FM - 20);
    ctx.drawImage(TX.fg, -FM + fx, 0);
    ctx.drawImage(TX.vig, 0, 0);
  };
  SG.captions = (ctx, t, lines, o = {}) => Story.captions(ctx, t, lines, { font: SG.FONT, weight: 700, size: 60, color: C.ink, srcColor: '#bfe9df', y: 430, shadow: 'rgba(0,8,10,.95)', shadowBlur: 20, ...o });
  SG.endCard = (ctx, t, card, at, o = {}) => Story.endCard(ctx, t, card, at, { font: SG.FONT, color: C.ink, srcColor: '#b5e3d8', y: 860, titleShadow: 'rgba(0,0,0,.6)', ...o });
  // endPlate(ctx, t, at): the dark plate for the end card (in over −.3…+.25 s around `at`) with the motes rising across it.
  SG.endPlate = function (ctx, t, at) {
    const k = ss(at - .3, at + .25, t); if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = k * .92; ctx.drawImage(TX.plate, 0, 0); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const m of MOTES) { const y = 1900 - ((t * m.v * .6 + m.y) % 1900), x = (m.x * 7.3) % W; const al = k * m.a * .8 * (.6 + .4 * breathe(t, m.ph, 2)); ctx.fillStyle = `rgba(150,255,230,${al})`; ctx.beginPath(); ctx.arc(x, y, m.r, 0, TAU); ctx.fill(); }
    ctx.restore();
  };

  window.SpiritGlow = SG;
})();

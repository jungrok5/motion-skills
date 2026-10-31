/* kit-mograph.js — 「word-log 교실」 motion-graphics house style (모션그래픽 · 박자마다 세계가 바뀐다).  Global: window.Mograph
   One character stays at the centre and keeps moving while the whole world (background, medium, graphics) swaps on bar
   lines: ① a grid of app windows, hers gold-framed → ② a red stage with orbiting chunky 3-D words → ③ a blue drafting sheet
   where she is drawn in line and then coloured → ④ yellow + a 3-D keyboard: her footfalls press keys, jamo pop out and
   assemble into a Korean word → ⑤ pink bubbles, a status pill, neon typing → ⑥ black-and-white manga panels (threshold +
   screentone, focus lines, onomatopoeia, ink burst) → ⑦ a kaleidoscope of the earlier worlds + the title.
   The character is an ACTOR: either a keyed video-model sprite sequence (spriteActor — owner's request only) or the code
   figure (codeActor — the default, a rigged hoodie girl drawn in code). Both expose the same API, so every module and code
   filter (line art, manga, white silhouette) works on either.
   Load after lib.js and story.js:  <script src="lib.js"></script><script src="story.js"></script><script src="kit-mograph.js"></script>
   Portrait only (1080×1920). Pure and deterministic: caches only memoise pure functions of their keys; seeded randomness only;
   any seek order. No network; the only images are the optional sprite frames.
   Worked example: sermons/2026-10-24-intro/film/scenes/intro-class.html (word-log 교실 · 채널 소개). */
(function () {
  const { clamp, lerp, ss, eo, eio, rng } = Pilot;
  const M = {}, TAU = Math.PI * 2, W = 1080, H = 1920;
  M.W = W; M.H = H; M.TAU = TAU;

  // ================================================================ palette, type
  M.INK = '#26182c';      // chunky-letter outline / extrusion, title-block ink
  M.MAG = '#ff2f9e';      // THE accent: key glow, neon, flying caps, the "hit" light. init({ accent }) to change.
  M.MAG2 = '#ff8fd0';     // light accent (sparks, removed-key cross)
  M.BLUE = '#2350c8';     // drafting-sheet ink
  M.GOLD = '#f0b84a';     // the hero window's frame
  M.SUN = '#ffd84a';      // big star / title sparks
  M.DISPLAY = "'Do Hyeon',sans-serif"; M.SANS = "'Noto Sans KR',sans-serif";
  // pass to Pilot.run({ fonts: Mograph.FONTS }) so the faces are loaded before the first frame
  M.FONTS = ["400 200px 'Do Hyeon'", "700 46px 'Noto Sans KR'", "500 34px 'Noto Sans KR'"];

  // ================================================================ easing, beat grid
  M.backOut = (u, k = 1.70158) => 1 + (k + 1) * Math.pow(u - 1, 3) + k * Math.pow(u - 1, 2);   // overshoot ease (0→1)
  M.elastic = u => u <= 0 ? 0 : u >= 1 ? 1 : Math.pow(2, -10 * u) * Math.sin((u * 10 - .75) * TAU / 3) + 1;   // spring ease
  M.pulse = (t, at, len = .25) => { const u = (t - at) / len; return u < 0 || u > 1 ? 0 : 1 - u; };   // 1 → 0 over len s after `at`
  // popScale(u, d): [sx, sy] for a word popping in (squash → elastic settle over d s; u = s since it appeared; [0,0] before)
  M.popScale = (u, d = .5) => { if (u <= 0) return [0, 0]; const e = M.elastic(clamp(u / d, 0, 1)); return [1.2 - .2 * e, .65 + .35 * e].map(v => v * Math.min(1, u / .06 + .3)); };
  // tempo(bpm): sets M.BPM, M.BEAT (s), M.BAR (4/4, s). Cut worlds on bar lines, pop words on beats.
  M.tempo = bpm => { M.BPM = bpm; M.BEAT = 60 / bpm; M.BAR = 4 * M.BEAT; return M; };
  M.tempo(128);
  M.beatPulse = t => { const u = ((t % M.BEAT) + M.BEAT) % M.BEAT / M.BEAT; return Math.pow(1 - u, 3); };   // 1 on each beat, decays
  M.bar = n => n * M.BAR; M.beat = n => n * M.BEAT;               // bar / beat number → seconds
  M.snapBar = t => Math.round(t / M.BAR) * M.BAR;                 // nearest bar line (snap storyboard times to it)
  // sceneTable([{id, at}, …], dur): adds .end (next scene's start, or dur) to every scene
  M.sceneTable = (scenes, dur) => scenes.map((s, i) => ({ ...s, end: i + 1 < scenes.length ? scenes[i + 1].at : dur }));
  M.sceneOf = (SC, t) => SC[Math.max(0, SC.findIndex(s => t >= s.at && t < s.end))];   // the scene playing at t
  // flash(ctx, a, col): full-frame flash (the hard cut on a bar line: flash(ctx, .85 * pulse(t, cutAt, .18)))
  M.flash = function (ctx, a, col = '#fff') { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); ctx.restore(); };

  // ================================================================ small helpers
  M.poly = function (ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); };
  // lru(n): a memo (key, make) → value that keeps the n most recently used values (filter frames, glyphs …)
  M.lru = n => { const C = new Map(); return (key, make) => { if (C.has(key)) { const v = C.get(key); C.delete(key); C.set(key, v); return v; }
    const v = make(); C.set(key, v); if (C.size > n) C.delete(C.keys().next().value); return v; }; };
  M.off = () => M._off || (M._off = Pilot.canvas(W, H));        // one shared full-frame offscreen canvas (transitions, pull-back)
  M.loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error(src)); i.src = src; });

  // ================================================================ chunky 3-D letters (the style's type)
  const GLY = new Map();
  // chunky(str, size, o): a cached sprite of `str` in Do Hyeon, white gradient face over an ink extrusion + outline.
  //   o = { face, face2 (gradient top/bottom), ink (outline+extrusion), depth (× size, default .085), font, weight }
  //   returns { c (canvas), ax, ay (centre), w, h }; draw it with glyph()
  M.chunky = function (str, size, o = {}) {
    const key = [str, size, o.font || M.DISPLAY, o.face || '', o.face2 || '', o.ink || '', o.depth ?? ''].join('|');
    if (GLY.has(key)) return GLY.get(key);
    const font = `${o.weight || 400} ${size}px ${o.font || M.DISPLAY}`, m = Pilot.canvas(4, 4).getContext('2d'); m.font = font;
    const mt = m.measureText(str), dep = Math.round(size * (o.depth ?? .085)), ol = Math.max(3, size * .055), pad = Math.ceil(ol * 2 + dep + 8);
    const asc = Math.ceil(mt.actualBoundingBoxAscent), dsc = Math.ceil(mt.actualBoundingBoxDescent), w = Math.ceil(mt.width);
    const c = Pilot.canvas(w + 2 * pad, asc + dsc + 2 * pad), x = c.getContext('2d');
    x.font = font; x.lineJoin = 'round';
    const ox = pad, oy = pad + asc, ink = o.ink || M.INK;
    x.fillStyle = ink; x.strokeStyle = ink; x.lineWidth = ol * 2;
    for (let i = dep; i >= 0; i--) { x.strokeText(str, ox + i * .55, oy + i); x.fillText(str, ox + i * .55, oy + i); }
    const g = x.createLinearGradient(0, oy - asc, 0, oy + dsc); g.addColorStop(0, o.face || '#ffffff'); g.addColorStop(1, o.face2 || '#e6e1ee');
    x.fillStyle = g; x.fillText(str, ox, oy);
    const r = { c, ax: ox + w / 2, ay: oy - (asc - dsc) / 2, w, h: asc + dsc }; GLY.set(key, r); return r;
  };
  // glyph(ctx, g, x, y, sx, sy, rot, a): draw a chunky() sprite centred at (x, y), scaled/rotated, alpha a
  M.glyph = function (ctx, g, x, y, sx = 1, sy = 1, rot = 0, a = 1) {
    if (a <= 0 || sx <= 0 || sy <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx, sy); ctx.drawImage(g.c, -g.ax, -g.ay); ctx.restore();
  };
  // pop(ctx, t, at, str, x, y, size, o): a chunky word that pops in at `at` with an elastic squash (+ a spark burst if o.burst)
  //   o = chunky options + { d (settle s), rot, burst: [n, R, seed, cols] }
  M.pop = function (ctx, t, at, str, x, y, size, o = {}) {
    const u = t - at; if (u <= 0) return; const [sx, sy] = M.popScale(u, o.d ?? .5);
    M.glyph(ctx, M.chunky(str, size, o), x, y, sx, sy, o.rot || 0, o.alpha ?? 1);
    if (o.burst) M.sparkBurst(ctx, x, y, u / .5, ...o.burst);
  };
  // sparkBurst(ctx, x, y, u, n, R, seed, cols, yk, lw): n spark dashes flying out to radius R as u goes 0 → 1 (the "hit")
  M.sparkBurst = function (ctx, x, y, u, n, R, seed, cols = ['#fff', M.MAG2], yk = .7, lw = 5) {
    if (u < 0 || u > 1) return; const r = rng(seed); ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) { const a = r() * TAU, d0 = R * (.25 + .5 * eo(u)) * (.6 + .5 * r()), len = R * .16 * (1 - u) * (.6 + .6 * r());
      ctx.strokeStyle = cols[i % cols.length]; ctx.globalAlpha = 1 - u; ctx.lineWidth = lw * (1 - u) + 1.5;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0 * yk); ctx.lineTo(x + Math.cos(a) * (d0 + len), y + Math.sin(a) * (d0 + len) * yk); ctx.stroke(); }
    ctx.restore();
  };
  // star4(ctx, x, y, r, col, a): a four-point sparkle of radius r
  M.star4 = function (ctx, x, y, r, col, a = 1) { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = col; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * .22 : r; ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr); } ctx.fill(); ctx.restore(); };
  // pill(ctx, str, x, y, size, bg, fg, a): a rounded capsule label (status pill, subtitle under a title)
  M.pill = function (ctx, str, x, y, size, bg, fg, a = 1) { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.font = `700 ${size}px ${M.SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(str).width + size * 1.3, hh = size * 1.65; ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x - w / 2, y - hh / 2, w, hh, hh / 2); ctx.fill();
    ctx.fillStyle = fg; ctx.fillText(str, x, y + size * .04); ctx.restore(); };
  // sparkleTrail(ctx, x, y, t): three sparkles circling a point (fingertip magic)
  M.sparkleTrail = function (ctx, x, y, t) {
    for (let k = 0; k < 3; k++) { const ph = t * 3 + k * 2.1; M.star4(ctx, x + Math.cos(ph) * 26, y + Math.sin(ph * 1.3) * 22, 14 + 8 * Math.sin(ph * 2), k ? '#ffd35a' : '#fff', .9); }
  };

  // ================================================================ ACTORS (sprite sequence or code figure, same API)
  // Actor API (all coordinates in "sprite px": the actor's own frame, w × h, ground anchor (ax, ay), figure height figH):
  //   fidx(t) → frame index · frame(i) → image/canvas · feet(i) → [lx, ly, rx, ry, minx, maxx] · hands(i) → [lx, ly, rx, ry]
  //   place(x, y, h) → { s, ox, oy, X(px), Y(py) }: screen mapping for the actor drawn with its anchor at (x, y), figure h px tall
  //   draw(ctx, t, x, y, h, { mode: 'line'|'manga'|'white' }) → the place() it used (undefined if the frame is missing)
  //   shadow(ctx, t, x, y, h, col, squash) · lineArt(i) / manga(i) / white(i): filtered frames (cached)
  //   contacts: [{ t, x, y, foot }] footfalls (film time, sprite px) · tOfFrame(f) · highHand(t, p) → screen [x, y] of the higher hand
  function actorCommon(A) {
    const cached = M.lru(90);
    A.place = (x, y, h) => { const s = h / A.figH; return { s, ox: x - A.ax * s, oy: y - A.ay * s, X: px => x + (px - A.ax) * s, Y: py => y + (py - A.ay) * s }; };
    A.shadow = function (ctx, t, x, y, h, col = 'rgba(0,0,0,.42)', sq = .16) {   // two soft contact shadows that shrink as a foot lifts
      const i = A.fidx(t), f = A.feet(i), p = A.place(x, y, h);
      ctx.save(); ctx.filter = `blur(${Math.max(4, 10 * p.s)}px)`; ctx.fillStyle = col;
      for (const [fx, fy] of [[f[0], f[1]], [f[2], f[3]]]) { const lift = clamp((A.ay - fy) / (A.figH * .1), 0, 1), r = A.figH * .085 * p.s * (1 - .35 * lift);
        ctx.globalAlpha = 1 - .55 * lift; ctx.beginPath(); ctx.ellipse(p.X(fx), y + 4 * p.s, r, r * sq * 2, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    };
    A.draw = function (ctx, t, x, y, h, o = {}) {
      const i = A.fidx(t), img = A.frame(i); if (!img) return;
      const p = A.place(x, y, h);
      const src = o.mode === 'line' ? A.lineArt(i) : o.mode === 'manga' ? A.manga(i) : o.mode === 'white' ? A.white(i) : img;
      ctx.drawImage(src, p.ox, p.oy, A.w * p.s, A.h * p.s);
      return p;
    };
    const pixels = i => { const c = Pilot.canvas(A.w, A.h), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(A.frame(i), 0, 0); return [c, x, x.getImageData(0, 0, A.w, A.h)]; };
    // drafting look: the drawing's own dark line work + the silhouette edge, in blue ink
    A.lineArt = i => cached('L' + i, () => { const [c, x, im] = pixels(i), d = im.data, w = A.w, h = A.h, o = new Uint8ClampedArray(d.length);
      const [ir, ig, ib] = A.lineInk || [35, 80, 200];
      for (let y = 1; y < h - 1; y++) for (let X = 1; X < w - 1; X++) { const k = (y * w + X) * 4, a = d[k + 3]; if (a < 100) continue;
        const lum = .3 * d[k] + .59 * d[k + 1] + .11 * d[k + 2];
        const edge = d[k - 4 + 3] < 100 || d[k + 4 + 3] < 100 || d[k - w * 4 + 3] < 100 || d[k + w * 4 + 3] < 100;
        // local contrast: darker than the neighbourhood = a drawn line
        const nl = (.3 * (d[k - 8] + d[k + 8]) + .59 * (d[k - 7] + d[k + 9]) + .11 * (d[k - 6] + d[k + 10])) / 2;
        const ink = edge ? 1 : lum < 70 ? 1 : (nl - lum > 26 ? clamp((nl - lum - 26) / 30, 0, 1) : 0);
        if (ink > 0) { o[k] = ir; o[k + 1] = ig; o[k + 2] = ib; o[k + 3] = 255 * ink; } }
      x.putImageData(new ImageData(o, w, h), 0, 0); return c; });
    // B/W manga: black ink, 45° screentone for the mid tones, paper-white highlights, a black outline
    A.manga = i => cached('M' + i, () => { const [c, x, im] = pixels(i), d = im.data, w = A.w, h = A.h, o = new Uint8ClampedArray(d.length);
      const P = 7 * A.h / 1000;   // dot pitch in sprite px
      for (let y = 1; y < h - 1; y++) for (let X = 1; X < w - 1; X++) { const k = (y * w + X) * 4, a = d[k + 3]; if (a < 100) continue;
        const lum = .3 * d[k] + .59 * d[k + 1] + .11 * d[k + 2];
        const edge = d[k - 4 + 3] < 100 || d[k + 4 + 3] < 100 || d[k - w * 4 + 3] < 100 || d[k + w * 4 + 3] < 100;
        let v = 255;
        if (edge || lum < 80) v = 12;
        else if (lum < 226) { const u = (X + y) / P / 1.414, q = (X - y) / P / 1.414, fu = u - Math.floor(u) - .5, fq = q - Math.floor(q) - .5;
          const r = Math.hypot(fu, fq), cov = .12 + clamp((226 - lum) / 140, 0, 1) * .5; v = r < cov ? 18 : 250; }
        o[k] = o[k + 1] = o[k + 2] = v; o[k + 3] = 255; }
      x.putImageData(new ImageData(o, w, h), 0, 0); return c; });
    A.white = i => cached('W' + i, () => { const c = Pilot.canvas(A.w, A.h), x = c.getContext('2d'); x.drawImage(A.frame(i), 0, 0);
      x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, A.w, A.h); return c; });
    A.highHand = (t, p) => { const hd = A.hands(A.fidx(t)); if (!hd) return null; const [lx, ly, rx, ry] = hd, hx = ly < ry ? lx : rx, hy = Math.min(ly, ry);
      return { x: p.X(hx), y: p.Y(hy), sx: hx, sy: hy }; };
    return A;
  }

  // spriteActor(meta, frames, { dur }): a keyed video-model sequence (prep_dance.py → art/<name>/f000.webp … + meta.js).
  //   meta = window.DANCE { fps, n, clips: [[first, count], …], w, h, ax, ay, figH, feet, hands, contacts:[{f, x, y}] }
  //   Film time → frame: clip A, then clip B, … each clip once (each starts and ends on the same pose), wrapping every `dur` s.
  M.spriteActor = function (DN, frames, o = {}) {
    const dur = o.dur || window.SCRIPT.DUR;
    const A = { meta: DN, fps: DN.fps, n: DN.n, w: DN.w, h: DN.h, ax: DN.ax, ay: DN.ay, figH: DN.figH, frames };
    const CLIPS = (DN.clips || [[0, DN.n]]).map(([a, n]) => ({ a, n, len: n / DN.fps }));
    A.fidx = t => {
      let tt = ((t % dur) + dur) % dur;
      for (let c = 0; c < CLIPS.length; c++) { const C = CLIPS[c], last = c === CLIPS.length - 1;
        if (tt < C.len || last) return C.a + Math.min(C.n - 1, Math.floor(tt * DN.fps + 1e-6)); tt -= C.len; }
      return 0;
    };
    A.frame = i => frames[i];
    A.feet = i => (DN.feet && DN.feet[i]) || [DN.ax - 60, DN.ay, DN.ax + 60, DN.ay, DN.ax - 90, DN.ax + 90];
    A.hands = i => DN.hands && DN.hands[i];
    A.tOfFrame = f => { let t = 0; for (const C of CLIPS) { if (f < C.a + C.n) return t + (f - C.a) / DN.fps; t += C.len; } return null; };
    A.contacts = (DN.contacts || []).map(c => ({ t: A.tOfFrame(c.f), x: c.x, y: c.y, foot: c.foot }));
    return actorCommon(A);
  };
  // loadSprite(meta, dir, { dur }) → Promise<actor>: loads dir/f000.<ext> … (call in init)
  M.loadSprite = async function (DN, dir, o = {}) {
    const frames = await Promise.all(Array.from({ length: DN.n }, (_, i) => M.loadImg(`${dir}/f${String(i).padStart(3, '0')}.${DN.ext}`)));
    return M.spriteActor(DN, frames, o);
  };

  // ---------------------------------------------------------------- the code figure (no video model)
  // FIG: the default character — the intro dancer's design: brown bob with a star clip, cream hoodie (blue cords and cuffs),
  // light-blue wide jeans, white sneakers. Pass { colors: { … } } to codeActor to recolour.
  M.FIG = { line: '#2b1d1a', skin: '#ffe3d2', skin2: '#f4c3ab', blush: '#ff9e9e', hair: '#7b4526', hair2: '#9c6038', eye: '#3a2218',
    hood: '#f7f1e6', hood2: '#e2d7c6', cord: '#4f8fd6', cuff: '#5b9be0', jeans: '#a8c7ec', jeans2: '#88aad8', shoe: '#ffffff', shoe2: '#5b9be0', clip: '#ffffff' };
  // body lengths in sprite px (figure 820 px tall, ground at y 960 of an 800 × 1000 frame, anchor x 380)
  const BODY = { thigh: 210, shin: 205, ankle: 14, torso: 235, neck: 18, head: 70, ua: 165, fa: 155, hand: 28, hipW: 10, stride: 80, lift: 46 };
  M.BODY = BODY;
  // 2-bone IK: joint for a chain root → end with bone lengths l1, l2 (target pulled in if out of reach). bend = +1 / −1 picks
  // the side (in y-up maths: +1 = counter-clockwise from root→target — knees forward; −1 — elbows back/down). Returns [mid, end].
  M.ik2 = function (root, target, l1, l2, bend) {
    let dx = target[0] - root[0], dy = target[1] - root[1], d = Math.hypot(dx, dy);
    const dmax = (l1 + l2) * .9995, dmin = Math.abs(l1 - l2) + 1e-3;
    if (d > dmax || d < dmin) { const k = clamp(d, dmin, dmax) / (d || 1); dx *= k; dy *= k; d = Math.hypot(dx, dy); }
    const a = Math.atan2(dy, dx), A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)) * bend;
    const mid = [root[0] + l1 * Math.cos(a + A), root[1] + l1 * Math.sin(a + A)];
    return [mid, [root[0] + dx, root[1] + dy]];
  };
  // rig(pose) → joints in local y-up px (x forward of the hip's ground point, y up from the ground). Pose (all optional):
  //   walk: distance walked (px; phase = walk / (4·stride) — one cycle = two steps) · walkAmt 0..1 · armSwing 0..1 (default walkAmt;
  //   set 0 to let the arms hang after stopping mid-stride) · march: in-place steps (cycles) · marchAmt 0..1
  //   kneel 0..1 (right knee down, left foot forward) · lean (rad, + = forward) · bounce (px up) · look (rad, + = up)
  //   reach / reachFar: [x, y] grip point (local px) for the near / far hand · reachAmt / reachFarAmt 0..1
  //   cheer 0..1 (both arms thrown forward-up — a profile figure can't raise them overhead without crossing its face) · swing (rad, extra arm swing) · face: +1 right … −1 left (in between = squash turn)
  M.rig = function (P = {}) {
    const B = BODY, wa = P.walkAmt ?? (P.walk != null ? 1 : 0), ma = P.marchAmt ?? (P.march != null ? 1 : 0), kn = eio(P.kneel || 0);
    const S = B.stride, ph = (P.walk || 0) / (4 * S);
    // legs: ankle targets per leg (near = 0, far = 1)
    const legFoot = (q, side) => {
      q = ((q % 1) + 1) % 1; let x, y;
      if (q < .5) { x = S * (1 - 4 * q); y = 0; } else { const v = (q - .5) / .5; x = -S + 2 * S * eio(v); y = B.lift * Math.sin(Math.PI * v); }
      const st = side ? -16 : 16;                                    // standing stance (feet a little apart in depth → x)
      let fx = lerp(st, x, wa), fy = y * wa;
      if (ma > 0) { const m = (((P.march || 0) + (side ? .5 : 0)) % 1 + 1) % 1, up = m < .5 ? Math.sin(Math.PI * m / .5) : 0; fy += 70 * up * ma; fx += 18 * up * ma; }
      return [fx, fy + B.ankle];
    };
    let hipY = B.thigh + B.shin + B.ankle - 4 + (P.bounce || 0);
    hipY += 7 * Math.cos(4 * Math.PI * (ph - .25)) * wa;
    if (ma > 0) hipY -= 10 * Math.abs(Math.sin(2 * Math.PI * (P.march || 0))) * ma;
    let hip = [0, hipY], fN = legFoot(ph, 0), fF = legFoot(ph + .5, 1);
    if (kn > 0) {   // kneel: hip down and a little back, near foot forward flat, far knee on the ground (toes behind)
      hip = [lerp(hip[0], -10, kn), lerp(hip[1], 250, kn)];
      const st = Math.sin(Math.PI * kn) * 40;                         // each foot steps (lifts) on its way, never slides
      fN = [lerp(fN[0], 150, kn), lerp(fN[1], 14, kn) + st]; fF = [lerp(fF[0], -210, kn), lerp(fF[1], 40, kn) + st];
    }
    const [kN, aN] = M.ik2(hip, fN, B.thigh, B.shin, 1), [kF, aF] = M.ik2(hip, fF, B.thigh, B.shin, 1);
    // torso
    const lean = (P.lean || 0) + .04 * wa, td = [Math.sin(lean), Math.cos(lean)];
    const sh = [hip[0] + td[0] * B.torso, hip[1] + td[1] * B.torso];
    const neck = [sh[0] + td[0] * B.neck, sh[1] + td[1] * B.neck];
    const hl = lean * .55 - (P.look || 0), hd = [Math.sin(hl), Math.cos(hl)];
    const head = [neck[0] + hd[0] * (B.head - 6), neck[1] + hd[1] * (B.head - 6)];
    // arms: FK rest/swing pose → optional blend to a grip point → IK with fixed lengths (the hand lands on the grip)
    const arm = (side, grip, amt) => {
      const s0 = [sh[0] + (side ? -8 : 0), sh[1] - 6];
      const sw = (P.swing || 0) + (-Math.cos(2 * Math.PI * (ph + (side ? .5 : 0))) * .42 * (P.armSwing ?? wa)), ch = P.cheer || 0;
      let ua = lerp(-Math.PI / 2 + sw, side ? .45 : -.1, ch);   // upper-arm angle (y-up); cheer: both arms forward-up, hands open (clear of the face)
      const fa = ua + lerp(.32 + .25 * Math.max(0, sw), side ? .55 : .9, ch);                                  // forearm bends forward
      const el = [s0[0] + Math.cos(ua) * B.ua, s0[1] + Math.sin(ua) * B.ua];
      let hand = [el[0] + Math.cos(fa) * (B.fa + B.hand * .5), el[1] + Math.sin(fa) * (B.fa + B.hand * .5)];
      if (grip && amt > 0) hand = [lerp(hand[0], grip[0], eio(amt)), lerp(hand[1], grip[1], eio(amt))];
      const [e, hnd] = M.ik2(s0, hand, B.ua, B.fa + B.hand * .5, -1);
      return { s: s0, e, h: hnd };
    };
    return { hip, kN, aN, kF, aF, sh, neck, head, hd, td, lean, aNear: arm(0, P.reach, P.reachAmt ?? (P.reach ? 1 : 0)),
      aFar: arm(1, P.reachFar, P.reachFarAmt ?? (P.reachFar ? 1 : 0)), face: P.face ?? 1, look: P.look || 0, blink: P.blink || 0, mouth: P.mouth ?? .3 };
  };
  // codeActor({ pose: t => pose, dur, fps = 12, colors }): the code figure as an actor (frames drawn on demand at fps —
  // 12 = anime "on twos", like the sprite). pose(t) returns a rig() pose; the scene moves the actor across the screen itself
  // (for walking: screen x = x0 + walk · place().s, so the planted foot stays put).
  M.codeActor = function (o = {}) {
    const fps = o.fps || 12, dur = o.dur || window.SCRIPT.DUR, C = Object.assign({}, M.FIG, o.colors || {});
    const A = { fps, n: Math.ceil(dur * fps), w: 800, h: 1000, ax: 380, ay: 960, figH: 820, colors: C, lineInk: o.lineInk };
    const rigs = M.lru(64), frames = M.lru(48);
    A.fidx = t => clamp(Math.floor((((t % dur) + dur) % dur) * fps + 1e-6), 0, A.n - 1);
    A.tOfFrame = f => f / fps;
    A.rig = i => rigs(i, () => M.rig(o.pose(i / fps)));
    const SX = (r, x) => A.ax + x * r.face, SY = y => A.ay - y;   // local → sprite px
    A.feet = i => { const r = A.rig(i), xs = [SX(r, r.aN[0]), SX(r, r.aF[0])];
      return [xs[0], SY(r.aN[1] - BODY.ankle), xs[1], SY(r.aF[1] - BODY.ankle), Math.min(...xs) - 30, Math.max(...xs) + 60]; };
    A.hands = i => { const r = A.rig(i); return [SX(r, r.aNear.h[0]), SY(r.aNear.h[1]), SX(r, r.aFar.h[0]), SY(r.aFar.h[1])]; };
    A.frame = i => frames(i, () => { const c = Pilot.canvas(A.w, A.h), x = c.getContext('2d'); M.drawFigure(x, A.rig(i), C, A.ax, A.ay); return c; });
    A.contacts = M.detectContacts(A);
    return actorCommon(A);
  };
  // detectContacts(actor): footfalls — a foot that comes back down to the ground after being lifted ≥ 3.5 % of the figure
  M.detectContacts = function (A) {
    const out = [], lift = .035 * A.figH, near = .012 * A.figH;
    for (const [xi, yi, foot] of [[0, 1, 'L'], [2, 3, 'R']]) { let up = false;
      for (let i = 0; i < A.n; i++) { const f = A.feet(i), y = f[yi];
        if (A.ay - y > lift) up = true; else if (up && A.ay - y < near) { out.push({ t: A.tOfFrame(i), f: i, x: f[xi], y, foot }); up = false; } } }
    return out.sort((a, b) => a.t - b.t);
  };
  // drawFigure(ctx, rig, colors, ax, ay): the code figure, flat cel colours with a dark outline (so the line/manga filters read it)
  M.drawFigure = function (ctx, r, C, ax, ay) {
    const L = C.line, LW = 5;
    ctx.save(); ctx.translate(ax, ay); ctx.scale(r.face, -1);     // local y-up, facing +x
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const cap = (pts, w, fill) => {   // tapered capsule chain: pts [[x, y, width, flat?], …] (flat = no round end) — outline pass then fill pass
      for (const pass of [0, 1]) { ctx.strokeStyle = pass ? fill : L;
        for (let i = 0; i < pts.length - 1; i++) { const [x0, y0, w0] = pts[i], [x1, y1, w1] = pts[i + 1], a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a);
          const e = pass ? 0 : LW;
          ctx.fillStyle = pass ? fill : L; ctx.beginPath();
          ctx.moveTo(x0 + nx * (w0 / 2 + e), y0 + ny * (w0 / 2 + e)); ctx.lineTo(x1 + nx * (w1 / 2 + e), y1 + ny * (w1 / 2 + e));
          ctx.lineTo(x1 - nx * (w1 / 2 + e), y1 - ny * (w1 / 2 + e)); ctx.lineTo(x0 - nx * (w0 / 2 + e), y0 - ny * (w0 / 2 + e)); ctx.closePath(); ctx.fill();
          for (const [x, y, ww, flat] of [pts[i], pts[i + 1]]) if (!flat) { ctx.beginPath(); ctx.arc(x, y, ww / 2 + e, 0, TAU); ctx.fill(); } } }
    };
    const shoe = (a, k, far) => {   // sneaker at ankle a, heel back, toe forward along the ground (tilts with the shin when lifted)
      const tilt = clamp((a[1] - BODY.ankle) / 60, 0, 1) * -.35, c = Math.cos(tilt), s = Math.sin(tilt), P = (x, y) => [a[0] + x * c - y * s, a[1] - 10 + x * s + y * c];
      const pts = [P(-34, -4), P(86, -4), P(94, 16), P(72, 40), P(18, 46), P(-34, 32)];
      ctx.fillStyle = far ? '#e6e9f0' : C.shoe; ctx.strokeStyle = L; ctx.lineWidth = LW; M.poly(ctx, pts); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = C.shoe2; ctx.lineWidth = 6; ctx.beginPath(); const q0 = P(30, 12), q1 = P(70, 28); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke();
      ctx.strokeStyle = L; ctx.lineWidth = 3; ctx.beginPath(); const z0 = P(-32, 6), z1 = P(88, 6); ctx.moveTo(z0[0], z0[1]); ctx.lineTo(z1[0], z1[1]); ctx.stroke();
    };
    const leg = (k, a, far) => { const j = far ? C.jeans2 : C.jeans;
      shoe(a, k, far);
      cap([[r.hip[0], r.hip[1], 84], [k[0], k[1], 80], [a[0] - 6, a[1] + 18, 92, 1]], 0, j);   // wide leg, flat hem over the shoe
      // seam + hem
      ctx.strokeStyle = far ? 'rgba(40,60,110,.35)' : 'rgba(40,60,110,.28)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(k[0], k[1]); ctx.lineTo(a[0] + 10, a[1] + 22); ctx.stroke();
    };
    const armDraw = (A, far) => { const h = far ? C.hood2 : C.hood;
      const dx = A.h[0] - A.e[0], dy = A.h[1] - A.e[1], dl = Math.hypot(dx, dy) || 1, wr = [A.h[0] - dx / dl * (BODY.hand * .5 + 4), A.h[1] - dy / dl * (BODY.hand * .5 + 4)];
      cap([[A.s[0], A.s[1], 58], [A.e[0], A.e[1], 50], [wr[0], wr[1], 46]], 0, h);
      const cf = [wr[0] - dx / dl * 14, wr[1] - dy / dl * 14];
      cap([[cf[0], cf[1], 46], [wr[0], wr[1], 46]], 0, C.cuff);
      ctx.fillStyle = far ? C.skin2 : C.skin; ctx.strokeStyle = L; ctx.lineWidth = LW; ctx.beginPath(); ctx.arc(A.h[0], A.h[1], BODY.hand * .62, 0, TAU); ctx.fill(); ctx.stroke();
    };
    // far side first
    armDraw(r.aFar, 1); leg(r.kF, r.aF, 1); leg(r.kN, r.aN, 0);
    // torso (hoodie) in torso frame: u along the spine (up), v forward
    const T = (v, u) => [r.hip[0] + r.td[0] * u + r.td[1] * v, r.hip[1] + r.td[1] * u - r.td[0] * v];
    const body = [T(-78, -40), T(84, -40), T(88, 20), T(76, 170), T(52, 228), T(14, 248), T(-40, 250), T(-80, 214), T(-86, 120)];
    ctx.fillStyle = C.hood; ctx.strokeStyle = L; ctx.lineWidth = LW;
    ctx.beginPath(); ctx.moveTo(...body[0]); for (let i = 1; i < body.length; i++) { const p = body[i], q = body[(i + 1) % body.length]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.hood2; ctx.beginPath(); ctx.moveTo(...T(-78, -40)); ctx.lineTo(...T(84, -40)); ctx.lineTo(...T(86, -14)); ctx.lineTo(...T(-82, -14)); ctx.closePath(); ctx.fill();   // rib hem
    ctx.strokeStyle = L; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(...T(-80, -14)); ctx.lineTo(...T(86, -14)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(...T(10, 30)); ctx.quadraticCurveTo(...T(40, 90), ...T(80, 70)); ctx.stroke();                                // pocket
    ctx.strokeStyle = C.cord; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(...T(40, 232)); ctx.lineTo(...T(48, 150)); ctx.stroke();       // cord
    ctx.fillStyle = C.hood2; ctx.strokeStyle = L; ctx.lineWidth = LW; ctx.beginPath(); ctx.ellipse(...T(-46, 246), 52, 30, Math.atan2(r.td[1], r.td[0]) - Math.PI / 2 - .3, 0, TAU); ctx.fill(); ctx.stroke();   // hood
    // head (head frame: up = hd, forward = perpendicular)
    const hdA = Math.atan2(r.hd[0], r.hd[1]);
    ctx.save(); ctx.translate(r.head[0], r.head[1]); ctx.rotate(-hdA);
    ctx.fillStyle = C.skin; ctx.beginPath(); ctx.ellipse(14, -50, 20, 26, 0, 0, TAU); ctx.fill();   // neck
    ctx.fillStyle = C.hair; ctx.strokeStyle = L; ctx.lineWidth = LW;
    ctx.beginPath(); ctx.moveTo(-70, -48); ctx.quadraticCurveTo(-84, 30, -40, 70); ctx.quadraticCurveTo(10, 92, 52, 62); ctx.quadraticCurveTo(70, 30, 62, 0); ctx.lineTo(-30, -60); ctx.closePath(); ctx.fill(); ctx.stroke();   // back hair + bob
    ctx.fillStyle = C.skin; ctx.beginPath(); ctx.moveTo(-8, 40); ctx.quadraticCurveTo(66, 52, 70, 0); ctx.quadraticCurveTo(72, -42, 40, -60); ctx.quadraticCurveTo(0, -70, -14, -40); ctx.closePath(); ctx.fill(); ctx.stroke();   // face (3/4, chin forward)
    ctx.fillStyle = C.blush; ctx.globalAlpha = .45; ctx.beginPath(); ctx.ellipse(46, -22, 13, 7, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    const bl = r.blink; ctx.fillStyle = C.eye;   // eye (big anime eye, highlight) — blink squashes it
    ctx.beginPath(); ctx.ellipse(40, 4, 11, 17 * (1 - .9 * bl), 0, 0, TAU); ctx.fill();
    if (bl < .5) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(44, 11, 4.5, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = L; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(26, 24); ctx.quadraticCurveTo(40, 30, 54, 22); ctx.stroke();   // lash line
    ctx.fillStyle = '#c4505a'; ctx.beginPath(); ctx.ellipse(56, -36, 7, 3 + 6 * r.mouth, 0, 0, TAU); ctx.fill();                       // mouth
    ctx.fillStyle = C.hair; ctx.strokeStyle = L; ctx.lineWidth = LW;   // bangs over the forehead
    ctx.beginPath(); ctx.moveTo(-44, 50); ctx.quadraticCurveTo(10, 98, 66, 58); ctx.lineTo(70, 30); ctx.lineTo(54, 40); ctx.lineTo(48, 18); ctx.lineTo(32, 36); ctx.lineTo(20, 22); ctx.lineTo(-4, 40); ctx.quadraticCurveTo(-30, 30, -44, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.hair2; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-30, 60); ctx.quadraticCurveTo(0, 78, 30, 72); ctx.stroke();   // shine
    ctx.restore();
    M.star4(ctx, ...((p => [p[0], p[1]])([r.head[0] + r.hd[0] * 52 - r.hd[1] * 18, r.head[1] + r.hd[1] * 52 + r.hd[0] * 18])), 15, C.clip);   // star clip
    armDraw(r.aNear, 0);
    ctx.restore();
  };

  // ================================================================ ① a grid of windows (the hero window gold-framed)
  M.WIN = { x: 230, y: 410, w: 620, h: 1090, bar: 54 };       // the hero window (screen px at zoom 1)
  M.kfull = (win = M.WIN) => Math.max(W / win.w, H / win.h);     // zoom at which the hero window fills the frame
  // winFrame(ctx, x, y, w, h, title, gold, t, win): an app window (traffic lights + title); gold = the hero, glowing on the beat
  M.winFrame = function (ctx, x, y, w, h, title, gold, t, win = M.WIN) {
    ctx.save();
    if (gold) { ctx.shadowColor = 'rgba(255,190,80,.85)'; ctx.shadowBlur = 40 + 14 * M.beatPulse(t); }
    ctx.fillStyle = gold ? '#f6edd8' : '#221c18'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = gold ? '#3a2a1a' : '#2f2722'; ctx.beginPath(); ctx.roundRect(x, y, w, win.bar, [18, 18, 0, 0]); ctx.fill();
    [['#ff6058', 0], ['#ffbd2e', 1], ['#28c840', 2]].forEach(([c, k]) => { ctx.fillStyle = gold ? c : '#4a3f38'; ctx.beginPath(); ctx.arc(x + 24 + k * 22, y + win.bar / 2, 7, 0, TAU); ctx.fill(); });
    ctx.font = `700 ${gold ? 27 : 23}px ${M.SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = gold ? '#ffd98a' : '#8d7f73';
    ctx.fillText(title, x + w / 2 + 20, y + win.bar / 2 + 1);
    ctx.strokeStyle = gold ? M.GOLD : 'rgba(255,255,255,.07)'; ctx.lineWidth = gold ? 6 : 2; ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.stroke();
    ctx.restore();
  };
  // sidePage(ctx, x, y, w, h, t, seed, win): a page of "text" — quiet bars scrolling, one line lit gold now and then
  M.sidePage = function (ctx, x, y, w, h, t, seed, win = M.WIN) {
    const r = rng(seed); ctx.save(); ctx.beginPath(); ctx.rect(x, y + win.bar, w, h - win.bar); ctx.clip();
    const off = (t * 26 + r() * 200) % 46;
    for (let k = -1; k < 26; k++) { const yy = y + win.bar + 30 + k * 46 - off, lw = (w - 70) * (.45 + .55 * r());
      const lit = (k + Math.floor(t * 26 / 46) + seed) % 7 === 0;
      ctx.fillStyle = lit ? 'rgba(240,184,74,.75)' : 'rgba(255,255,255,.10)'; ctx.beginPath(); ctx.roundRect(x + 34, yy, lw, 12, 6); ctx.fill(); }
    ctx.restore();
  };
  // windowGrid(ctx, t, u, inner, { side, hero, win }): the dark desk of windows; side = [[title, col, row], …] (col/row −1..1
  // around the hero), hero = the gold window's title; inner(ctx) draws the hero window's content (clipped to it)
  M.windowGrid = function (ctx, t, u, inner, o = {}) {
    const win = o.win || M.WIN, side = o.side || M.SIDE;
    ctx.fillStyle = '#120e0b'; ctx.fillRect(-W, -H, 3 * W, 3 * H);
    side.forEach(([title, cx, cy], k) => { const x = win.x + cx * (win.w + 34), y = win.y + cy * (win.h + 34);
      M.winFrame(ctx, x, y, win.w, win.h, title, false, t, win); M.sidePage(ctx, x, y, win.w, win.h, u, k + 3, win); });
    M.winFrame(ctx, win.x, win.y, win.w, win.h, o.hero || 'word-log', true, t, win);
    ctx.save(); ctx.beginPath(); ctx.roundRect(win.x + 3, win.y + win.bar, win.w - 6, win.h - win.bar - 3, [0, 0, 16, 16]); ctx.clip(); inner(ctx); ctx.restore();
  };
  M.SIDE = [['창세기 1', -1, -1], ['시편 23', 0, -1], ['이사야 40', 1, -1], ['마태복음 5', -1, 0], ['요한복음 3', 1, 0], ['로마서 8', -1, 1], ['빌립보서 4', 0, 1], ['잠언 3', 1, 1]];
  // heroPage(ctx, win): the hero window's cream ruled page; returns its content rect { x0, y0, w, h }
  M.heroPage = function (ctx, win = M.WIN) {
    const x0 = win.x, y0 = win.y + win.bar, w = win.w, h = win.h - win.bar;
    const g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, '#fbf3df'); g.addColorStop(1, '#eedfbd'); ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = 'rgba(160,120,60,.16)'; ctx.lineWidth = 2; for (let k = 1; k < 21; k++) { ctx.beginPath(); ctx.moveTo(x0 + 30, y0 + k * 52); ctx.lineTo(x0 + w - 30, y0 + k * 52); ctx.stroke(); }
    return { x0, y0, w, h };
  };
  // gridView(ctx, k, win): camera on the grid — k = 1: the grid as framed at rest; k = kfull(): the hero window fills the frame
  // (dive in: k = 1 → kfull; pull back for the loop: kfull → 1)
  M.gridView = function (ctx, k, win = M.WIN) {
    const KF = M.kfull(win), cx = win.x + win.w / 2, cy = win.y + (win.h + win.bar) / 2, v = (KF - k) / (KF - 1);
    ctx.translate(W / 2 + (cx - W / 2) * v, H / 2 + (cy - H / 2) * v); ctx.scale(k, k); ctx.translate(-cx, -cy);
  };

  // ================================================================ ② red stage, orbiting 3-D words
  // stageBack(ctx, t, u): red radial backdrop, a beat-pulsing orange disc, two counter-rotating dashed rings, an oval floor.
  // Returns the floor point { x: 540, y: 1488 } to stand the actor on.
  M.stageBack = function (ctx, t, u) {
    const bp = M.beatPulse(t);
    const g = ctx.createRadialGradient(540, 900, 100, 540, 960, 1300); g.addColorStop(0, '#f2492f'); g.addColorStop(1, '#8e1216'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ff6a3d'; ctx.beginPath(); ctx.arc(540, 930, 440 + 14 * bp, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(540, 930); ctx.rotate(u * .5); ctx.strokeStyle = 'rgba(255,220,190,.55)'; ctx.lineWidth = 6; ctx.setLineDash([26, 22]);
    ctx.beginPath(); ctx.arc(0, 0, 500, 0, TAU); ctx.stroke(); ctx.rotate(-u * 1.1); ctx.setLineDash([6, 18]); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 560, 0, TAU); ctx.stroke(); ctx.restore();
    ctx.setLineDash([]);
    ctx.fillStyle = '#b3201f'; ctx.beginPath(); ctx.ellipse(540, 1500, 420, 92, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d8382a'; ctx.beginPath(); ctx.ellipse(540, 1488, 404, 80, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,170,.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(540, 1488, 404, 80, 0, 0, TAU); ctx.stroke();
    return { x: 540, y: 1488 };
  };
  // orbit(ctx, words, u, { scatter: s when they fly off, size, face, face2, depth }) → { back(), front() }: chunky words
  // circling the actor on an ellipse (fly in from wide over .5 s; scatter outward + fade from `scatter`). Call back() before
  // drawing the actor and front() after, so the ring passes behind and in front of her.
  M.orbit = function (ctx, words, u, o = {}) {
    const sc0 = o.scatter ?? 1e9;
    const items = words.map((s, k) => { const a = u * TAU / 2.8 + k * TAU / words.length, scatter = eo(ss(sc0, sc0 + .6, u));
      const intro = eo(ss(0, .5, u)), rx = 410 * lerp(2.2, 1, intro) * (1 + 1.4 * scatter), ry = 120 * lerp(2.2, 1, intro);
      return { s, z: Math.sin(a), x: 540 + Math.cos(a) * rx, y: 1060 + Math.sin(a) * ry - 40 * Math.cos(a), a, sc: .78 + .22 * (Math.sin(a) + 1) / 2, al: 1 - scatter }; });
    const one = it => M.glyph(ctx, M.chunky(it.s, o.size || 128, { face: o.face || '#fff', face2: o.face2 || '#ffe0d2', depth: o.depth ?? .14 }), it.x, it.y, it.sc, it.sc, Math.cos(it.a) * .12, it.al);
    return { back: () => items.filter(i => i.z < 0).forEach(one), front: () => items.filter(i => i.z >= 0).forEach(one) };
  };

  // ================================================================ ③ drafting sheet ("drawn in", then coloured)
  // paperSheet(): cream paper with a blue 40/200 px drafting grid + speckle (built once, cached)
  M.paperSheet = function () {
    if (M._paper) return M._paper;
    const P = M._paper = Pilot.canvas(W, H), x = P.getContext('2d'); x.fillStyle = '#f3ecdc'; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(35,80,200,.13)'; x.lineWidth = 1.5; for (let k = 0; k <= W; k += 40) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, H); x.stroke(); } for (let k = 0; k <= H; k += 40) { x.beginPath(); x.moveTo(0, k); x.lineTo(W, k); x.stroke(); }
    x.strokeStyle = 'rgba(35,80,200,.24)'; x.lineWidth = 2; for (let k = 0; k <= W; k += 200) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, H); x.stroke(); } for (let k = 0; k <= H; k += 200) { x.beginPath(); x.moveTo(0, k); x.lineTo(W, k); x.stroke(); }
    const sp = Pilot.speckle ? Pilot.speckle(W / 2, H / 2, 18, 3, .6) : null; if (sp) { x.globalCompositeOperation = 'multiply'; x.globalAlpha = .25; x.drawImage(sp, 0, 0, W, H); }
    return P;
  };
  // compass(ctx, cc, R, u, col): a circle with ticks drawn by a compass over u = .1 … 1.3 s (the compass arm leaves by 1.5)
  M.compass = function (ctx, cc, R, u, col = M.BLUE) {
    const arc = eio(ss(.1, 1.3, u)) * TAU;
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cc[0], cc[1], R, -Math.PI / 2, -Math.PI / 2 + arc); ctx.stroke();
    for (let k = 0; k < 72; k++) { const a = -Math.PI / 2 + k / 72 * TAU; if (a > -Math.PI / 2 + arc) break; const l = k % 6 ? 12 : 28;
      ctx.beginPath(); ctx.moveTo(cc[0] + Math.cos(a) * R, cc[1] + Math.sin(a) * R); ctx.lineTo(cc[0] + Math.cos(a) * (R - l), cc[1] + Math.sin(a) * (R - l)); ctx.stroke(); }
    if (u < 1.5) { const a = -Math.PI / 2 + arc, px = cc[0] + Math.cos(a) * R, py = cc[1] + Math.sin(a) * R, hx = (cc[0] + px) / 2 + Math.cos(a - Math.PI / 2) * 40, hy = Math.min(cc[1], py) - 260;
      ctx.globalAlpha = 1 - ss(1.3, 1.5, u); ctx.lineWidth = 7; ctx.strokeStyle = '#3a3f4f'; ctx.beginPath(); ctx.moveTo(cc[0], cc[1]); ctx.lineTo(hx, hy); ctx.lineTo(px, py); ctx.stroke();
      ctx.fillStyle = '#3a3f4f'; ctx.beginPath(); ctx.arc(hx, hy, 14, 0, TAU); ctx.fill(); }
    ctx.restore();
  };
  // guides(ctx, vp, pts, a, col): dashed perspective guides from a vanishing point to each of pts
  M.guides = function (ctx, vp, pts, a, col = M.BLUE) {
    ctx.save(); ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = 1.6; ctx.setLineDash([10, 10]);
    for (const p of pts) { ctx.beginPath(); ctx.moveTo(vp[0], vp[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); }
    ctx.setLineDash([]); ctx.restore();
  };
  // dimension(ctx, x, y0, y1, label, a, col): a vertical dimension line with end ticks and a label to its right
  M.dimension = function (ctx, x, y0, y1, label, a, col = M.BLUE) {
    if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.moveTo(x - 18, y0); ctx.lineTo(x + 18, y0); ctx.moveTo(x - 18, y1); ctx.lineTo(x + 18, y1); ctx.stroke();
    ctx.font = `700 30px ${M.SANS}`; ctx.textAlign = 'left'; ctx.fillText(label, x + 16, (y0 + y1) / 2); ctx.restore();
  };
  // titleBlock(ctx, a, title, left, right, leader, box, col): a drawing's title block (big title over two small cells) with
  // a curved leader line to point `leader` ([x, y] or null). box = [x, y, w, h] (default top-left [80, 170, 360, 190]).
  M.titleBlock = function (ctx, a, title, left, right, leader, box = [80, 170, 360, 190], col = M.BLUE) {
    if (a <= 0) return; const [bx, by, bw, bh] = box, mid = by + bh * 120 / 190, cx = bx + bw / 2;
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.fill(); ctx.stroke(); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, mid); ctx.lineTo(bx + bw, mid); ctx.moveTo(cx, mid); ctx.lineTo(cx, by + bh); ctx.stroke();
    ctx.fillStyle = col; ctx.font = `400 104px ${M.DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(title, cx, by + 64);
    ctx.font = `700 26px ${M.SANS}`; ctx.fillText(left, bx + 90, by + 156); ctx.fillText(right, bx + 270, by + 156);
    if (leader) { ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(bx + bw, by + 95); ctx.quadraticCurveTo(bx + bw + 80, by + 130, leader[0], leader[1]); ctx.stroke(); }
    ctx.restore();
  };
  // drawIn(ctx, t, actor, x, y, h, lv, cv, col): the actor as a construction drawing — line work wipes in top→bottom (lv 0→1,
  // with the pencil edge), then colour fills bottom→top (cv 0→1, with a hatched edge); plus a faint contact shadow. Returns place().
  M.drawIn = function (ctx, t, A, x, y, h, lv, cv, col = M.BLUE) {
    const p = A.place(x, y, h), x0 = p.ox, y0 = p.oy, wd = A.w * p.s, ht = A.h * p.s;
    A.shadow(ctx, t, x, y, h, `rgba(35,80,200,${.18 * cv})`);
    if (cv < 1) { ctx.save(); ctx.beginPath(); ctx.rect(x0 - 10, y0 - 10, wd + 20, (ht + 20) * lv); ctx.clip(); A.draw(ctx, t, x, y, h, { mode: 'line' }); ctx.restore();
      if (lv > 0 && lv < 1) { const yy = y0 + ht * lv; ctx.fillStyle = col; ctx.fillRect(x0, yy - 2, wd, 4); } }
    if (cv > 0) { ctx.save(); ctx.beginPath(); ctx.rect(x0 - 10, y0 + ht * (1 - cv) - 10, wd + 20, ht * cv + 20); ctx.clip(); A.draw(ctx, t, x, y, h); ctx.restore();
      if (cv < 1) { ctx.save(); ctx.globalAlpha = .9; ctx.strokeStyle = col; ctx.lineWidth = 3; const yy = y0 + ht * (1 - cv);
        for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.moveTo(x0 + k * wd / 14, yy + 18); ctx.lineTo(x0 + (k + 1) * wd / 14, yy - 18); ctx.stroke(); } ctx.restore(); } }
    return p;
  };

  // ================================================================ ④ 3-D keyboard (key units; x across, y up, z away)
  const CAP0 = .06, CAPH = .44, CAPTOP = CAP0 + CAPH, INSET = .045, TOPIN = .13, CASE = -.75;
  const YAW = -7 * Math.PI / 180, PITCH = 39 * Math.PI / 180, F = 1850, FOOT = { x: -.35, z: -.02 };
  M.KB = { anchor: [540, 1515], figu: 6.9, CAPTOP };   // where the actor's feet stand on screen; her height in key units
  // keyCam(D, sway, yaw) → cam { P(x, y, z) → [sx, sy, depth], un(sx, sy, Y) → [x, z] (screen → keyboard plane), ppu (px per unit) }
  //   looking down 39° at the actor's foot spot, D units away (≈13.4; smaller = closer), sway = sideways drift in units
  M.keyCam = function (D, sway = 0, yaw = YAW) {
    const ANCHOR = M.KB.anchor;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(PITCH), sp = Math.sin(PITCH);
    const T = [FOOT.x * cy + FOOT.z * sy + sway, CAPTOP, -FOOT.x * sy + FOOT.z * cy], C = [T[0], T[1] + D * sp, T[2] - D * cp];
    const P = (x, y, z) => { const X = x * cy + z * sy - C[0], Y = y - C[1], Z = -x * sy + z * cy - C[2];
      const zc = -Y * sp + Z * cp, yc = Y * cp + Z * sp; return [ANCHOR[0] + F * X / zc, ANCHOR[1] - F * yc / zc, zc]; };
    const un = (sx, sy2, Yp = CAPTOP) => { const xc = (sx - ANCHOR[0]) / F, yc = -(sy2 - ANCHOR[1]) / F;
      const d = [xc, yc * cp - sp, yc * sp + cp], lam = (Yp - C[1]) / d[1], X = C[0] + lam * d[0], Z = C[2] + lam * d[2];
      return [X * cy - Z * sy, X * sy + Z * cy]; };
    return { P, un, C, cy, sy, ppu: F / D, D };
  };
  const ROWS = [
    [[1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [2, '⌫']],
    [[1.5], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1.5]],
    [[1.75], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [2.25, '↵']],
    [[2.25, '⇧'], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [2.75, '⇧']],
    [[1.25], [1.25], [1.25], [6.25], [1.25], [1.25], [1.25], [1.25]],
  ];
  const KEYS = M.KEYS = [];   // { r (row 0 = top), x0, x1, z0, z1, lab, id } in key units, centred on the board
  ROWS.forEach((row, r) => { let x = -7.5; for (const [w, lab] of row) { KEYS.push({ r, x0: x, x1: x + w, z0: 1.5 - r, z1: 2.5 - r, lab: lab || '', id: KEYS.length }); x += w; } });
  M.keyAt = (x, z) => KEYS.find(k => x >= k.x0 && x < k.x1 && z >= k.z0 && z < k.z1);   // the key under a board point
  M.keyTop = (k, cam) => cam.P((k.x0 + k.x1) / 2, CAPTOP, (k.z0 + k.z1) / 2);           // screen point of a key's top centre
  function roundRect(x0, z0, x1, z1, r, n = 6) { const pts = [], cs = [[x1 - r, z0 + r, -Math.PI / 2], [x1 - r, z1 - r, 0], [x0 + r, z1 - r, Math.PI / 2], [x0 + r, z0 + r, Math.PI]];
    for (const [cx, cz, a0] of cs) for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]); } return pts; }
  const CASEPTS = roundRect(-7.5 - .42, -2.5 - .42, 7.5 + .42, 2.5 + .42, .55);
  function keyCorners(k, cam, dip) {
    const b = [[k.x0 + INSET, k.z0 + INSET], [k.x1 - INSET, k.z0 + INSET], [k.x1 - INSET, k.z1 - INSET], [k.x0 + INSET, k.z1 - INSET]];
    const tp = [[k.x0 + TOPIN, k.z0 + TOPIN * 1.1], [k.x1 - TOPIN, k.z0 + TOPIN * 1.1], [k.x1 - TOPIN, k.z1 - TOPIN * .7], [k.x0 + TOPIN, k.z1 - TOPIN * .7]];
    return { B: b.map(([x, z]) => cam.P(x, CAP0 - dip, z)), T: tp.map(([x, z]) => cam.P(x, CAPTOP - dip, z)), tl: tp };
  }
  // wireKeyboard(ctx, cam, u, col, a): the keyboard as a construction drawing, case outline then keys row by row (u 0 → ~1.4)
  M.wireKeyboard = function (ctx, cam, u, col = M.BLUE, a = 1) {
    ctx.save(); ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = 2.2;
    const outline = CASEPTS.map(([x, z]) => cam.P(x, 0, z)); const n = Math.floor(outline.length * clamp(u * 1.6, 0, 1));
    if (n > 1) { ctx.beginPath(); ctx.moveTo(outline[0][0], outline[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(outline[i][0], outline[i][1]); if (n === outline.length) ctx.closePath(); ctx.stroke(); }
    for (const k of KEYS) { const v = clamp((u - .25 - (4 - k.r) * .12 - (k.x0 + 7.5) * .012) / .25, 0, 1); if (v <= 0) continue;
      const q = keyCorners(k, cam, 0); ctx.globalAlpha = a * v; M.poly(ctx, q.T); ctx.stroke(); ctx.globalAlpha = a * v * .5; M.poly(ctx, q.B); ctx.stroke(); }
    ctx.restore();
  };
  const mix = (c1, c2, u) => c1.map((v, i) => Math.round(v + (c2[i] - v) * u));
  const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  function drawCase(ctx, cam) {
    const top = CASEPTS.map(([x, z]) => cam.P(x, 0, z)), bot = CASEPTS.map(([x, z]) => cam.P(x, CASE, z));
    ctx.save(); ctx.filter = 'blur(26px)'; ctx.fillStyle = 'rgba(120,60,0,.35)';
    M.poly(ctx, CASEPTS.map(([x, z]) => cam.P(x * 1.01 + .25, CASE - .02, z * 1.01 - .35))); ctx.fill(); ctx.restore();
    for (let i = 0; i < CASEPTS.length; i++) { const j = (i + 1) % CASEPTS.length, a = top[i], b = top[j];
      const cross = (b[0] - a[0]) * (bot[i][1] - a[1]) - (b[1] - a[1]) * (bot[i][0] - a[0]); if (cross <= 0) continue;
      const nx = CASEPTS[j][1] - CASEPTS[i][1], lit = .5 + .5 * clamp(-nx * 2, -1, 1);
      ctx.fillStyle = `rgb(${18 + 14 * lit},${18 + 14 * lit},${22 + 15 * lit})`; M.poly(ctx, [a, b, bot[j], bot[i]]); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.fillStyle = '#121215'; M.poly(ctx, top); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.13)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#08080a'; M.poly(ctx, roundRect(-7.55, -2.55, 7.55, 2.55, .12, 2).map(([x, z]) => cam.P(x, .001, z))); ctx.fill();
  }
  // drawKey(ctx, k, cam, { dip, glow, gone, legend }): one key — dip (units pressed), glow 0..1 (accent), gone (cap flown off:
  // the bare switch + a cross), legend (a big glowing letter on the cap)
  M.drawKey = function (ctx, k, cam, st) {
    const { dip = 0, glow = 0, gone = 0, legend = '' } = st, MAG = M.MAG;
    const cx = (k.x0 + k.x1) / 2, cz = (k.z0 + k.z1) / 2;
    if (gone) { const sw = [[cx - .3, cz - .3], [cx + .3, cz - .3], [cx + .3, cz + .3], [cx - .3, cz + .3]];
      ctx.fillStyle = '#1b1b20'; M.poly(ctx, sw.map(([x, z]) => cam.P(x, .08, z))); ctx.fill();
      ctx.strokeStyle = M.MAG2; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath();
      let a = cam.P(cx - .12, .2, cz), b = cam.P(cx + .12, .2, cz); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      a = cam.P(cx, .2, cz - .12); b = cam.P(cx, .2, cz + .12); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); return; }
    const q = keyCorners(k, cam, dip), { B: b, T: tp } = q;
    if (glow > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = MAG; ctx.shadowBlur = 40 * glow; ctx.fillStyle = `rgba(255,47,158,${.85 * glow})`;
      const e = .06; M.poly(ctx, [[k.x0 - e, k.z0 - e], [k.x1 + e, k.z0 - e], [k.x1 + e, k.z1 + e], [k.x0 - e, k.z1 + e]].map(([x, z]) => cam.P(x, .01, z))); ctx.fill(); ctx.restore(); }
    for (const [i, j, n, kind] of [[0, 1, [0, 0, -1], 'f'], [1, 2, [1, 0, 0], 's'], [3, 0, [-1, 0, 0], 's'], [2, 3, [0, 0, 1], 'b']]) {
      const wx = n[0] * cam.cy + n[2] * cam.sy, wz = -n[0] * cam.sy + n[2] * cam.cy;
      const px = cx * cam.cy + cz * cam.sy + n[0] * .5, pz = -cx * cam.sy + cz * cam.cy + n[2] * .5;
      if ((cam.C[0] - px) * wx + (cam.C[2] - pz) * wz <= 0) continue;
      const base = kind === 'f' ? [24, 24, 29] : kind === 's' ? (n[0] > 0 ? [30, 30, 36] : [20, 20, 25]) : [34, 34, 40];
      ctx.fillStyle = rgb(mix(base, [150, 24, 92], glow * .75)); M.poly(ctx, [b[i], b[j], tp[j], tp[i]]); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.2; ctx.stroke(); }
    const g = ctx.createLinearGradient(0, tp[3][1], 0, tp[0][1]);
    g.addColorStop(0, rgb(mix([56, 56, 64], [255, 120, 200], glow * .55))); g.addColorStop(1, rgb(mix([40, 40, 46], [190, 40, 120], glow * .55)));
    ctx.fillStyle = g; M.poly(ctx, tp); ctx.fill();
    ctx.strokeStyle = glow > .05 ? `rgba(255,143,208,${.4 + .6 * glow})` : 'rgba(255,255,255,.10)'; ctx.lineWidth = glow > .05 ? 3 : 1.6;
    ctx.beginPath(); ctx.moveTo(tp[3][0], tp[3][1]); ctx.lineTo(tp[2][0], tp[2][1]); ctx.stroke(); if (glow > .05) { M.poly(ctx, tp); ctx.lineWidth = 2.4; ctx.stroke(); }
    const lab = legend || k.lab;
    if (lab) { const [p0, p1, , p3] = tp, ux = [p1[0] - p0[0], p1[1] - p0[1]], vx = [p3[0] - p0[0], p3[1] - p0[1]];
      const kw = q.tl[1][0] - q.tl[0][0], kd = q.tl[3][1] - q.tl[0][1];
      ctx.save(); ctx.transform(ux[0] / kw, ux[1] / kw, -vx[0] / kd, -vx[1] / kd, p0[0] + vx[0], p0[1] + vx[1]);
      ctx.font = `400 ${legend ? .5 : .34}px ${legend ? M.DISPLAY : M.SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (legend) { ctx.shadowColor = MAG; ctx.shadowBlur = 18 * glow; }
      ctx.fillStyle = legend ? `rgba(255,${200 + 55 * glow},${235 + 20 * glow},${.55 + .45 * glow})` : 'rgba(210,210,220,.55)';
      ctx.fillText(lab, kw / 2, kd / 2); ctx.restore(); }
  };
  // keyboardBG(): the yellow radial backdrop with halftone dots (built once)
  M.keyboardBG = function () {
    if (M._kbg) return M._kbg;
    const K = M._kbg = Pilot.canvas(W, H), x = K.getContext('2d'), g = x.createRadialGradient(540, 700, 80, 540, 820, 1250);
    g.addColorStop(0, '#f9d257'); g.addColorStop(.55, '#f4c02f'); g.addColorStop(1, '#e3a91c'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(160,96,0,.09)'; for (let yy = 0; yy < H; yy += 22) for (let xx = (yy / 22 & 1) * 11; xx < W; xx += 22) {
      const d = Math.min(Math.hypot(xx - 1080, yy), Math.hypot(xx, yy - 1300)) / 520, r = 5.2 * (1 - d); if (r > .6) { x.beginPath(); x.arc(xx, yy, r, 0, TAU); x.fill(); } }
    return K;
  };
  // drawKeyboard(ctx, cam, st): case + every key far-to-near; st = Map(key id → drawKey state) from keyState()
  M.drawKeyboard = function (ctx, cam, st) {
    drawCase(ctx, cam);
    KEYS.map(k => [k, cam.P((k.x0 + k.x1) / 2, CAPTOP, (k.z0 + k.z1) / 2)[2]]).sort((a, b) => b[1] - a[1]).forEach(([k]) => M.drawKey(ctx, k, cam, st.get(k.id) || {}));
  };
  // footHits(actor, { t0, t1, need, before, camAt }) → hits [{ t, x, y, j, m: { key, x, y } }]: the actor's footfalls in (t0, t1)
  //   mapped to the key under the sole (camAt(t) = the keyboard cam at time t). The first `need` footfalls before `before`
  //   (≥ .3 s apart) get j = 0 … need−1 (they carry the jamo); if there are too few, beats fill in under the lower foot.
  M.footHits = function (A, o) {
    const C = A.contacts.filter(c => c.t != null && c.t > o.t0 && c.t < o.t1).map(c => ({ t: c.t, x: c.x, y: c.y }));
    const need = o.need ?? 0, before = o.before ?? o.t1;
    let jam = C.filter(c => c.t < before), pick = [], last = -9;
    for (const c of jam) if (c.t - last > .3 && pick.length < need) { pick.push(c); last = c.t; }
    for (let bt = Math.ceil((o.t0 + .2) / M.BEAT) * M.BEAT; pick.length < need && bt < before; bt += M.BEAT)
      if (C.every(p => Math.abs(p.t - bt) > .3)) { const f = A.feet(A.fidx(bt)), lf = f[1] >= f[3]; pick.push({ t: bt, x: lf ? f[0] : f[2], y: Math.max(f[1], f[3]), fill: 1 }); }
    pick.sort((a, b) => a.t - b.t); pick = pick.slice(0, need); pick.forEach((p, i) => p.j = i);
    const hits = [...pick, ...C.filter(c => !pick.includes(c)).map(c => ({ ...c, j: -1 }))].sort((a, b) => a.t - b.t);
    for (const h of hits) { const cam = o.camAt(h.t), p = A.place(M.KB.anchor[0], M.KB.anchor[1], M.KB.figu * cam.ppu), x = p.X(h.x), y = p.Y(h.y);
      const [lx, lz] = cam.un(x, y - .42 * cam.ppu);   // the sole's centre, a little behind its front edge
      h.m = { key: M.keyAt(lx, lz), x, y }; }
    return hits;
  };
  // flyCaps(hits, [[j, dcol, dir], …]) → caps that pop off a key dcol keys beside the jamo hit j and fly out (dir ±1)
  M.flyCaps = function (hits, spec) {
    const out = [];
    for (const [j, dc, dir] of spec) { const h = hits.find(q => q.j === j); if (!h || !h.m.key) continue;
      const key = M.keyAt((h.m.key.x0 + h.m.key.x1) / 2 + dc, (h.m.key.z0 + h.m.key.z1) / 2) || h.m.key; out.push({ t: h.t + .05, key, dir, j }); }
    return out;
  };
  // keyState(t, hits, fly, legends) → Map(key id → { dip, glow, legend, gone }): pressed keys dip and glow; jamo keys show legends[j]
  M.keyState = function (t, hits, fly, legends) {
    const st = new Map();
    for (const h of hits) { if (t < h.t - .06 || t > h.t + 1.6 || !h.m.key) continue;
      const u = t - h.t, dip = u < 0 ? .16 * ss(-.06, 0, u) : .16 * (1 - ss(.05, .3, u)), glow = u < 0 ? 0 : (h.j >= 0 ? 1 : .8) * (1 - ss(.25, h.j >= 0 ? 1.5 : .8, u));
      const s0 = st.get(h.m.key.id) || { dip: 0, glow: 0 }; st.set(h.m.key.id, { dip: Math.max(s0.dip, dip), glow: Math.max(s0.glow, glow), legend: h.j >= 0 && u < 1.5 ? legends[h.j] : s0.legend }); }
    for (const f of fly) if (t >= f.t) st.set(f.key.id, { ...(st.get(f.key.id) || {}), gone: 1 });
    return st;
  };
  // hitSparks(ctx, t, hits): a spark burst at every sole as it lands (bigger for jamo hits)
  M.hitSparks = function (ctx, t, hits) {
    for (const h of hits) { const v = (t - h.t) / .34; if (v >= 0 && v <= 1) M.sparkBurst(ctx, h.m.x, h.m.y, v, h.j >= 0 ? 14 : 8, h.j >= 0 ? 170 : 110, Math.round(h.t * 100)); }
  };
  // capSprite(): a loose keycap with an accent rim (built once)
  M.capSprite = function () {
    if (M._cap) return M._cap;
    const c = M._cap = Pilot.canvas(240, 260), x = c.getContext('2d'), rr = (X, Y, w, h, r) => { x.beginPath(); x.roundRect(X, Y, w, h, r); };
    x.fillStyle = '#16161a'; rr(20, 40, 200, 200, 36); x.fill(); x.fillStyle = '#2b2b31'; rr(20, 20, 200, 190, 36); x.fill();
    const g = x.createLinearGradient(0, 40, 0, 190); g.addColorStop(0, '#45454e'); g.addColorStop(1, '#303037'); x.fillStyle = g; rr(44, 34, 152, 144, 26); x.fill();
    x.strokeStyle = 'rgba(255,47,158,.9)'; x.lineWidth = 5; rr(22, 22, 196, 214, 36); x.stroke(); return c;
  };
  // flyingCaps(ctx, t, cam, fly, legends): the popped caps arc out of frame, spinning, each with its jamo
  M.flyingCaps = function (ctx, t, cam, fly, legends) {
    const CAP = M.capSprite();
    for (const f of fly) { const v = (t - f.t) / 1.25; if (v < 0 || v > 1) continue;
      const [x0, y0] = cam.P((f.key.x0 + f.key.x1) / 2, CAPTOP, (f.key.z0 + f.key.z1) / 2);
      const x = x0 + f.dir * 760 * eo(v), y = y0 - 900 * Math.sin(Math.min(1, v * 1.25) * Math.PI * .55) + 260 * v * v, s = (.55 + 1.4 * eo(v)) * cam.ppu / 140 * .75;
      ctx.save(); ctx.translate(x, y); ctx.rotate(f.dir * v * 4.2); ctx.scale(s, s); ctx.shadowColor = M.MAG; ctx.shadowBlur = 30; ctx.drawImage(CAP, -120, -130);
      ctx.font = `400 96px ${M.DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffd1ec'; ctx.shadowBlur = 16; ctx.fillText(legends[f.j], 0, -18); ctx.restore(); }
  };
  // ---- Korean word assembly: jamo pop out of the keys, park in their syllable slots, then snap into the syllables ----
  const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ', JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ', JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
  // jamoOf('말') → ['ㅁ', 'ㅏ', 'ㄹ'] (compatibility jamo; a non-Hangul character comes back as itself)
  M.jamoOf = ch => { const c = ch.charCodeAt(0) - 0xAC00; if (c < 0 || c > 11171) return [ch];
    const l = Math.floor(c / 588), v = Math.floor(c % 588 / 28), f = c % 28; return [CHO[l], JUNG[v], ...(f ? [JONG[f]] : [])]; };
  // jamoLayout(word, { cx, y, size }) → { jamo, syl, xs, y, size, park: [[dx, dy, sz, syllable], …] } for jamoLayer():
  //   each syllable's slot positions follow Korean block shape (vertical vowel ㅏㅓㅣ…: initial left, vowel right; horizontal
  //   vowel ㅗㅜㅡ…: initial top, vowel middle; final consonant at the bottom). Default: 300 px syllables at y 360, centred.
  M.jamoLayout = function (word, o = {}) {
    const syl = Array.from(word), n = syl.length, size = o.size || 300, cx = o.cx ?? 540, jamo = [], park = [];
    const xs = syl.map((_, i) => cx + (i - (n - 1) / 2) * 2 * size * .54);
    syl.forEach((ch, s) => { const j = M.jamoOf(ch); jamo.push(...j);
      const horiz = j.length > 1 && 'ㅗㅛㅜㅠㅡ'.includes(j[1]), fin = j.length > 2;
      const P = horiz ? (fin ? [[0, -.29, .46], [0, .04, .62], [0, .32, .44]] : [[0, -.18, .5], [0, .2, .62]])
        : (fin ? [[-.2, -.2, .5], [.3, -.06, .62], [0, .3, .48]] : [[-.2, 0, .55], [.3, 0, .7]]);
      j.forEach((_, i) => park.push([...(P[i] || [0, 0, .5]), s])); });
    return { jamo, syl, xs, y: o.y ?? 360, size, park, cx };
  };
  // jamoLayer(ctx, t, hits, L, at, bang): every jamo hit's letter jumps from the sole to its slot (squash, bob while waiting);
  //   at `at` they spread → snap together and the syllables spring in (+ bang, e.g. '!', after the last one) with a burst
  M.jamoLayer = function (ctx, t, hits, L, at, bang = '!') {
    const n = L.syl.length, SY = L.y, SYL = L.size;
    const parkPos = (i, spread) => { const [dx, dy, sz, s] = L.park[i], sg = n === 1 ? 0 : s < (n - 1) / 2 ? -1 : s > (n - 1) / 2 ? 1 : 0;
      return [L.xs[s] + dx * SYL * spread + sg * (spread - 1) * 70, SY + dy * SYL * spread, sz * SYL]; };
    for (const h of hits) { if (h.j < 0 || t < h.t) continue;
      const u = t - h.t, i = h.j, [px, py, sz] = parkPos(i, lerp(1.32, 1, eio(ss(at, at + .3, t))));
      const k = eo(ss(0, .55, u)), bob = t < at ? Math.sin((t - h.t) * 5.2 + i) * 6 : 0;
      const x = lerp(h.m.x, px, k), y = lerp(h.m.y - 30, py, k) - Math.sin(Math.PI * k) * 240 + bob;
      let sx = 1, sy = 1; if (u < .12) { const v = u / .12; sx = .5 + .4 * v; sy = .3 + 1.1 * v; } else if (u < .55) { sx = .9 + .1 * ss(.12, .45, u); sy = 1.4 - .4 * ss(.12, .45, u); }
      else { const v = (u - .55) / .35; if (v < 1) { const w = Math.sin(v * Math.PI) * (1 - v); sx = 1 + .22 * w; sy = 1 - .2 * w; } }
      const sc = lerp(.55, 1, k); M.glyph(ctx, M.chunky(L.jamo[i], Math.round(sz)), x, y, sx * sc, sy * sc, (1 - k) * (i % 2 ? .3 : -.3), 1 - ss(at + .15, at + .35, t)); }
    if (t >= at + .15) { const u = t - at - .15;
      L.syl.forEach((s, i) => { const v = clamp((u - i * .06) / .7, 0, 1), e = M.elastic(v);
        M.glyph(ctx, M.chunky(s, SYL), L.xs[i] - 40 + (i ? 1 : -1) * 6 * (1 - e), SY, 1.25 - .25 * e, .7 + .3 * e, 0, ss(0, .06, v)); });
      const v = u - .35; if (v > 0 && bang) { const [sx, sy] = M.popScale(v); M.glyph(ctx, M.chunky(bang, SYL), L.xs[n - 1] + SYL * .62, SY, sx, sy, .1); }
      M.sparkBurst(ctx, L.cx, SY, u / .5, 26, 380, 12); }
  };

  // ================================================================ ⑤ pink bubbles, status pill, neon typing
  // bubble(ctx, x, y, r, a): a soap bubble (iridescent rim, highlight arc, glint)
  M.bubble = function (ctx, x, y, r, a) {
    ctx.save(); ctx.globalAlpha *= a;
    const g = ctx.createRadialGradient(x - r * .3, y - r * .35, r * .1, x, y, r); g.addColorStop(0, 'rgba(255,255,255,.08)'); g.addColorStop(.75, 'rgba(255,220,250,.10)'); g.addColorStop(.93, 'rgba(170,230,255,.55)'); g.addColorStop(1, 'rgba(255,170,230,.0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = Math.max(2, r * .05); ctx.beginPath(); ctx.arc(x, y, r * .72, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(x + r * .4, y + r * .35, r * .06, 0, TAU); ctx.fill(); ctx.restore();
  };
  // bubbleSky(ctx, u): pink → lilac gradient with 46 drifting twinkling sparkles
  M.bubbleSky = function (ctx, u) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffb3d9'); g.addColorStop(.6, '#e7a5f0'); g.addColorStop(1, '#b28af0'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const r = rng(77);
    for (let k = 0; k < 46; k++) { const x = r() * W, sp = 30 + r() * 50, y = (r() * H - u * sp + H) % H; M.star4(ctx, x + Math.sin(u + k) * 14, y, 6 + r() * 10, '#fff', .55 + .4 * Math.sin(u * 3 + k)); }
  };
  // lightCross(ctx, t, x, y): a soft white cross of light under the feet, breathing on the beat
  M.lightCross = function (ctx, t, x, y) {
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(14px)'; ctx.fillStyle = `rgba(255,255,255,${.75 + .2 * M.beatPulse(t)})`;
    ctx.beginPath(); ctx.ellipse(x, y, 300, 44, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(x, y, 70, 150, 0, 0, TAU); ctx.fill(); ctx.restore();
  };
  // bubblesBack(ctx, u) / bubblesFront(ctx, u): 16 big bubbles rising behind the actor (every other one skips the actor's
  // column) and 6 small ones in front
  M.bubblesBack = function (ctx, u) {
    for (let k = 0; k < 16; k++) { const rr = rng(200 + k), x = 80 + rr() * 920, sp = 90 + rr() * 140, y = 1950 - ((u * sp + rr() * 2000) % 2100), R = 30 + rr() * 70;
      if (Math.abs(x - 540) < 230 && y > 500 && y < 1500 && k % 2) continue; M.bubble(ctx, x + Math.sin(u * 1.3 + k) * 20, y, R, .95); }
  };
  M.bubblesFront = function (ctx, u) {
    for (let k = 0; k < 6; k++) { const rr = rng(400 + k), x = 260 + rr() * 560, sp = 120 + rr() * 80, y = 1750 - ((u * sp + rr() * 900) % 1300); M.bubble(ctx, x, y, 18 + rr() * 30, .9); }
  };
  // statusPill(ctx, label, u, x, y, o): '묵상 중...' — a capsule whose dots count up on the beat (fades in at u .2–.5)
  M.statusPill = function (ctx, label, u, x = 540, y = 250, o = {}) {
    const cv = ss(.2, .5, u), dots = Math.floor(u / (M.BEAT)) % 4;
    M.pill(ctx, label + '.'.repeat(dots).padEnd(3, ' '), x, y, o.size || 40, o.bg || 'rgba(255,255,255,.88)', o.fg || '#8a3f8f', cv);
  };
  // neonType(ctx, t, u, chars, times, x, y, size): neon letters typed on beats (chars[i] appears at times[i]; flicker on each
  // new letter; a caret blinks on the beat). x = centre of the full string.
  M.neonType = function (ctx, t, u, chars, times, x = 540, y = 440, size = 170) {
    let str = ''; times.forEach((bt, i) => { if (t >= bt) str += chars[i]; });
    ctx.save(); ctx.font = `400 ${size}px ${M.DISPLAY}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const full = ctx.measureText(chars.join('')).width, x0 = x - full / 2, part = str ? ctx.measureText(str).width : 0;
    if (str) { const last = times.filter(b => t >= b).pop(), fl = 1 - .35 * M.pulse(t, last, .25) * (Math.sin(t * 90) > 0 ? 1 : 0);
      ctx.globalAlpha = fl; ctx.shadowColor = '#ff2fa8'; ctx.shadowBlur = 60; ctx.fillStyle = 'rgba(120,0,90,.55)'; ctx.fillText(str, x0, y);
      ctx.lineWidth = 16; ctx.strokeStyle = '#ff3fb4'; ctx.strokeText(str, x0, y); ctx.shadowBlur = 30; ctx.strokeText(str, x0, y);
      ctx.shadowColor = '#fff'; ctx.shadowBlur = 16; ctx.lineWidth = 6; ctx.strokeStyle = '#fff6fc'; ctx.strokeText(str, x0, y); }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    if ((u / M.BEAT | 0) % 2 === 0 && u > .3) { ctx.fillStyle = '#fff'; ctx.fillRect(x0 + part + 12, y - size * .4, 10, size * .8); }
    ctx.restore();
  };

  // ================================================================ ⑥ manga panels
  // mangaPaper(ctx): off-white page with a faint dot screentone in the gutters
  M.mangaPaper = function (ctx) {
    ctx.fillStyle = '#fbfaf6'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,.06)'; for (let y = 0; y < H; y += 14) for (let x = (y / 14 & 1) * 7; x < W; x += 14) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill(); }
  };
  // focusLines(ctx, cx, cy, x0, y0, w, h, seed, a): 120 black speed/focus wedges converging on (cx, cy)
  M.focusLines = function (ctx, cx, cy, x0, y0, w, h, seed, a = 1) {
    const r = rng(seed); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#111';
    for (let k = 0; k < 120; k++) { const ang = r() * TAU, w0 = .004 + r() * .012, r0 = 300 + r() * 260, r1 = 1600;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); ctx.lineTo(cx + Math.cos(ang - w0) * r1, cy + Math.sin(ang - w0) * r1); ctx.lineTo(cx + Math.cos(ang + w0) * r1, cy + Math.sin(ang + w0) * r1); ctx.fill(); }
    ctx.restore();
  };
  // inkBurst(ctx, x, y, R, seed, u, fill): a spiky ink balloon (outlined, with ink drops) that bursts open over u 0 → .25
  M.inkBurst = function (ctx, x, y, R, seed, u, fill = '#fff') {
    const r = rng(seed), n = 18; ctx.save(); ctx.translate(x, y); ctx.scale(eo(clamp(u / .25, 0, 1)), eo(clamp(u / .25, 0, 1)));
    ctx.beginPath(); for (let k = 0; k <= n * 2; k++) { const a = k / (n * 2) * TAU, rr = k % 2 ? R * (.62 + .1 * r()) : R * (1 + .25 * r()); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * .8); }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 9; ctx.strokeStyle = '#111'; ctx.stroke();
    for (let k = 0; k < 7; k++) { const a = r() * TAU, d = R * (1.1 + .3 * r()); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d * .8, 6 + r() * 14, 0, TAU); ctx.fill(); }
    ctx.restore();
  };
  // panel(ctx, x, y, w, h, u, from, draw): a white manga panel with a thick black border that slides in from 'l' | 'r' | 'd'
  //   (backOut over .35 s from u = 0); draw() paints its content, clipped to the panel
  M.panel = function (ctx, x, y, w, h, u, from, draw) {
    if (u <= 0) return; const e = M.backOut(clamp(u / .35, 0, 1), 1.4), dx = from === 'l' ? -(1 - e) * (x + w) : from === 'r' ? (1 - e) * (W - x) : 0, dy = from === 'd' ? (1 - e) * (H - y) : 0;
    ctx.save(); ctx.translate(dx, dy); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fillStyle = '#fff'; ctx.fill(); ctx.save(); ctx.clip(); draw(); ctx.restore();
    ctx.lineWidth = 10; ctx.strokeStyle = '#111'; ctx.strokeRect(x, y, w, h); ctx.restore();
  };
  // MANGA_WORD: chunky options for onomatopoeia on white ('두근!') and on black ('쿵!')
  M.MANGA_WORD = { face: '#ffffff', face2: '#f2f2f2', ink: '#111', depth: .05 };
  M.MANGA_WORD_NEG = { face: '#111', face2: '#111', ink: '#fff', depth: .02 };

  // ================================================================ ⑦ kaleidoscope + title
  // snap(drawFn, w, h): a half-size still of another world, for the kaleidoscope (drawFn(ctx) draws at full 1080×1920)
  M.snap = function (drawFn, w = 540, h = 960) { const c = Pilot.canvas(w, h), x = c.getContext('2d'); x.scale(w / W, h / H); drawFn(x); return c; };
  // kaleido(ctx, snaps, u, { cx, cy, n, bg }): n wedges rotating about (cx, cy), each showing a snap, white spokes between
  M.kaleido = function (ctx, snaps, u, o = {}) {
    const n = o.n || 8, cx = o.cx ?? 540, cy = o.cy ?? 900, rot = u * .35;
    ctx.fillStyle = o.bg || '#1b1430'; ctx.fillRect(0, 0, W, H);
    for (let k = 0; k < n; k++) { const s = snaps[k % snaps.length]; if (!s) continue; const a0 = rot + k / n * TAU, a1 = a0 + TAU / n;
      ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 2000, a0, a1); ctx.closePath(); ctx.clip();
      const am = (a0 + a1) / 2; ctx.translate(cx + Math.cos(am) * 380, cy + Math.sin(am) * 380); ctx.rotate(am + Math.PI / 2); ctx.drawImage(s, -s.width / 2, -s.height * .55); ctx.restore();
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * 2000, cy + Math.sin(a0) * 2000); ctx.stroke(); ctx.restore(); }
  };
  // bigStar(ctx, u, x, y, col): a spinning five-point star that springs in from u = .2 (behind the actor)
  M.bigStar = function (ctx, u, x = 540, y = 1000, col = M.SUN) {
    const sv = M.backOut(clamp((u - .2) / .5, 0, 1), 1.6);
    if (sv > 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(u * .6); ctx.scale(sv, sv); ctx.beginPath();
      for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, r = k % 2 ? 230 : 520; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 16; ctx.strokeStyle = M.INK; ctx.stroke(); ctx.restore(); }
  };

  // ================================================================ transitions (between worlds, on bar lines)
  // wipeUp(ctx, v, drawNext): the next world floods up from the bottom (v 0 → 1)
  M.wipeUp = function (ctx, v, drawNext) { ctx.save(); ctx.beginPath(); ctx.rect(0, H * (1 - v), W, H * v); ctx.clip(); drawNext(ctx); ctx.restore(); };
  // bubblePop(ctx, v, drawNext, x, y): a bubble grows from (x, y) with the next world inside (v 0 → 1)
  M.bubblePop = function (ctx, v, drawNext, x = 540, y = 1000) {
    const o = M.off().getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); drawNext(o);
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, 1200 * v, 0, TAU); ctx.clip(); ctx.drawImage(M.off(), 0, 0); ctx.restore(); M.bubble(ctx, x, y, 1200 * v, 1);
  };
  // inkWipe(ctx, v, x, y): a black ink burst swallows the frame (v 0 → 1)
  M.inkWipe = function (ctx, v, x = 540, y = 900) { M.inkBurst(ctx, x, y, 1500 * v + 1, 17, 1, '#111'); };
  // pullBack(ctx, t, v, drawLast, inner, o): the loop seam — the current world (drawLast(ctx) at full frame) shrinks into the
  //   hero window of the grid (v 0 → 1: zoom kfull → 1) while the window's own page (inner(ctx)) shows through; o = windowGrid opts
  M.pullBack = function (ctx, t, v, drawLast, inner, o = {}) {
    const win = o.win || M.WIN, KF = M.kfull(win), k = Math.pow(KF, 1 - v), off = M.off(), oc = off.getContext('2d');
    oc.setTransform(1, 0, 0, 1, 0, 0); drawLast(oc);
    ctx.save(); M.gridView(ctx, k, win);
    M.windowGrid(ctx, t, 0, c => { inner(c); const x0 = win.x, y0 = win.y + win.bar, w = win.w, h = win.h - win.bar;
      c.globalAlpha = 1 - ss(.45, .95, v); c.drawImage(off, x0 + w / 2 - W / 2 / KF, y0 + h / 2 - H / 2 / KF, W / KF, H / KF); c.globalAlpha = 1; }, o);
    ctx.restore();
  };

  // ================================================================ captions, end card (the style's type)
  // captions(ctx, t, lines, o): chunky 3-D words that pop in (elastic squash) and fade out; ≤ 2 lines, centred at o.y (300)
  //   lines: SCRIPT.lines [[from, to, '한 줄\n두 줄', '출처'?], …]; the source line goes under them in a small ink pill
  M.captions = function (ctx, t, lines, o = {}) {
    for (const [a, b, s0, src] of lines) { if (t < a || t > b) continue;
      const s = Pilot.tr(s0), ls = s.split('\n'), size = o.size || (ls.length > 1 ? 92 : 104), y = o.y || 300, lh = size * 1.12;
      const [sx, sy] = M.popScale(t - a, .5), al = 1 - ss(b - .3, b, t);
      ls.forEach((l, i) => M.glyph(ctx, M.chunky(l, size, o.chunky || {}), 540, y + (i - (ls.length - 1) / 2) * lh, sx, sy, 0, al));
      if (src) M.pill(ctx, Pilot.tr(src), 540, y + (ls.length / 2) * lh + 50, 28, M.INK, '#fff3c4', al * ss(a + .3, a + .6, t)); }
  };
  // endCard(ctx, t, card, at, o): the end card inside a gold hero window (cream page, ink type) over whatever world is behind;
  //   card = SCRIPT.endCard (Story.card(SOURCE)); everything is in within .5 s and held (≈ 4 s, readable over the loop seam)
  M.endCard = function (ctx, t, card, at, o = {}) {
    if (!card || t < at) return; const a = ss(at, at + .3, t), e = M.backOut(clamp((t - at) / .35, 0, 1), 1.3);
    const box = o.box || [90, 560, 900, 720];
    ctx.save(); ctx.globalAlpha = .55 * a; ctx.fillStyle = '#120e0b'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.translate(540, box[1] + box[3] / 2); ctx.scale(e, e); ctx.translate(-540, -(box[1] + box[3] / 2));
    M.winFrame(ctx, box[0], box[1], box[2], box[3], o.title || 'word-log', true, t);
    ctx.restore();
    if (e > .9) Story.endCard(ctx, t, card, at, { font: M.SANS, color: M.INK, srcColor: '#6b4a3a', titleShadow: '', y: box[1] + 250, srcFont: M.SANS, ...o });
  };

  // init({ bpm, accent }): tempo + textures (paper sheet, keyboard backdrop, keycap) — call once in the scene's init
  M.init = function (o = {}) {
    if (o.bpm) M.tempo(o.bpm);
    if (o.accent) M.MAG = o.accent;
    M.paperSheet(); M.keyboardBG(); M.capSprite(); M.off();
    return M;
  };

  window.Mograph = M;
})();

/* kit-bass.js — Saul Bass graphic title sequence, as a reusable word-log house style.  Global: window.Bass
   Flat ink black / paper white cut paper with scissor-cut edges, one sheet of paper texture multiplied over the frame,
   thin grey title lines that slide in and build a one-point-perspective set (in metres), light that is a flat paper
   shape cast through a gap by true rays, a single flat red accent, motion on twos, moves that stop dead on the beat,
   and Bass captions: words that cut on (no fades), cut-paper strips that slide in and stop dead, verses that snap in
   word by word with a source line under a rule.
   Load after lib.js and story.js:  <script src="lib.js"></script><script src="story.js"></script><script src="kit-bass.js"></script>
   Design space is the portrait frame 1080×1920 (Bass.W × Bass.H); in landscape Bass.begin pillarboxes it.
   Pure and deterministic: no state but the textures built by init (rebuildable any time), seeded noise only. */
(function () {
  const { clamp, lerp, ss, eio, rng, noise, fbm, canvas, text } = Pilot;
  const K = {};
  K.W = 1080; K.H = 1920;

  // ---------------- palette & type ----------------
  // Four-step greys from ink to paper (the Apartment set) plus ONE flat red. Light is always a paper/grey shape.
  K.C = {
    ink: '#0c0b0a',      // ground: flat black ink
    paper: '#f1ede4',    // paper white (light, caption strips, words)
    line: '#8d867c',     // title lines (casings, baseboards)
    floor: '#2b2724',    // dark floor/grid lines on the ink ground
    grey1: '#38342f',    // deepest flat grey (recesses)
    grey2: '#47423d',    // flat grey plane (a door, a wall piece)
    grey3: '#5d574f',    // dim light (after the dark turn)
    grey4: '#a49c90',    // light grey detail (a knob, a rim)
    src: '#d3ccc0',      // source lines / small type
    warm: '#f4d79a',     // warm light for a resolution (light only, never a second accent)
  };
  K.RED = '#9c1a1a';     // the single accent (blood, the one thing that matters). Change via init({ accent }).
  K.SANS = "'Noto Sans KR',sans-serif"; K.SERIF = "'Noto Serif KR',serif";
  // pass to Pilot.run({ fonts: Bass.FONTS }) so every face is loaded before the first frame
  K.FONTS = [`900 60px ${K.SANS}`, `900 60px ${K.SERIF}`, `700 72px ${K.SERIF}`, `600 28px ${K.SANS}`, `500 34px ${K.SANS}`, `400 30px ${K.SANS}`];

  // ---------------- setup ----------------
  let paper = null, lit = null, lc = null;
  // init({ accent?, paperSeed = 5, paperScale = .5 }): builds the paper sheet (half-res, ~60 ms) and the light layer.
  // Call once from Pilot.run({ init }). Everything else is stateless.
  K.init = function (o = {}) {
    if (o.accent) K.RED = o.accent;
    lit = canvas(K.W, K.H); lc = lit.getContext('2d');
    const sc = o.paperScale || .5, w = Math.round(K.W * sc), h = Math.round(K.H * sc);
    paper = canvas(w, h); const x = paper.getContext('2d'), d = x.createImageData(w, h), r = rng(o.paperSeed ?? 5);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {   // mottling + faint vertical fibres + rare ink voids
      const m = fbm(i * .013, j * .013, 4), fib = noise(i * .5, j * .045), v = 255 - 15 * m - 6 * Math.max(0, fib - .6) * 2.5 - (r() < .002 ? 18 : 0);
      const p = (j * w + i) * 4; d.data[p] = v; d.data[p + 1] = v - 1; d.data[p + 2] = v - 4; d.data[p + 3] = 255;
    }
    x.putImageData(d, 0, 0);
  };

  // ---------------- timing: snap, twos, flicker ----------------
  // eo4(x): quartic ease-out, 0..1 → 0..1. The Bass landing: fast, then stops dead.
  K.eo4 = x => { x = clamp(x); return 1 - Math.pow(1 - x, 4); };
  // snap(t, at, dur = .2): 0 before `at`, lands at 1 after `dur` s with eo4. Use for every move that hits a beat.
  K.snap = (t, at, dur = .2) => K.eo4((t - at) / dur);
  // twos(t, fps = 12): time held on twos (12 drawings/s). Puppets and cut-outs move on twos; camera and lines on ones.
  K.twos = (t, fps = 12) => Math.floor(t * fps + 1e-6) / fps;
  // flicker(t, at, vals, before = 0, after = 1): a stepped value on twos — vals[i] for the i-th 1/12 s after `at`
  // (a light switching on: [.55, .1, .1, .35] → then 1). No in-betweens.
  K.flicker = (t, at, vals, before = 0, after = 1) => {
    const i = Math.round((K.twos(t) - at) * 12); return i < 0 ? before : i < vals.length ? vals[i] : after;
  };

  // ---------------- cut paper ----------------
  // jag(pts, amp px, seed, step px = 9) → new closed point list: the outline resampled every `step` px and pushed along
  // its normal by smooth noise (amp ~1–2.5 px, bigger for bigger shapes). Same seed + same shape = same cut, so give a
  // moving piece a fixed seed. Corners taper to 0 so they stay sharp.
  K.jag = function (pts, amp, seed, step = 9) {
    const out = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      if (len < 1e-6) continue;
      const nx = -dy / len, ny = dx / len, m = Math.max(1, Math.ceil(len / step));
      for (let j = 0; j < m; j++) {
        const s = j / m, d = s * len, taper = Math.min(1, d / 14, (len - d) / 14);
        const e = amp * taper * (noise(seed * 3.1 + i * 13.7 + d * 0.055, seed * .71) - .5) * 2;
        out.push([a[0] + dx * s + nx * e, a[1] + dy * s + ny * e]);
      }
    }
    return out;
  };
  // poly(c, pts): path a closed polygon (no fill) — follow with c.fill() / c.clip().
  K.poly = function (c, pts) { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); };
  // cut(c, pts, color, amp = 1.6, seed = 1, step = 9): fill a hand-cut piece of flat ink (jag + poly + fill).
  K.cut = function (c, pts, color, amp = 1.6, seed = 1, step = 9) { c.fillStyle = color; K.poly(c, K.jag(pts, amp, seed, step)); c.fill(); };
  // paperShadow(c, pts, dx = 5, dy = 4, alpha = .35): the small hard shadow a lifted cut-out throws on the sheet;
  // draw it just before the piece itself (pts already jagged).
  K.paperShadow = function (c, pts, dx = 5, dy = 4, alpha = .35) {
    c.save(); c.translate(dx, dy); c.fillStyle = `rgba(0,0,0,${alpha})`; K.poly(c, pts); c.fill(); c.restore();
  };
  // mirror(half, tail = []) → a symmetric outline from its right half [[v, u], …] (v ≥ 0 across, u along), mirrored
  // to −v and closed; `tail` points are appended (e.g. a gap between legs). For silhouettes and shadow cut-outs.
  K.mirror = (half, tail = []) => half.concat(half.slice(0, -1).reverse().map(([v, u]) => [-v, u])).concat(tail);
  // swipe(c, a, z, dir, k, color, seed): a flat paint/blood swipe filling the box a=[x0,y0] → z=[x1,y1], grown to
  // fraction k along x (dir 'h') or down y (dir 'v') with a torn, toothed leading edge that settles when k = 1.
  K.swipe = function (c, a, z, dir, k, color, seed) {
    if (k <= 0) return;
    const [x0, y0] = a, [x1, y1] = z, r = rng(300 + seed);
    let pts;
    if (dir === 'h') {
      const xe = lerp(x0, x1, k), teeth = [];
      for (let j = 0; j <= 6; j++) teeth.push([xe - (j % 2 ? 10 + r() * 14 : r() * 4) * (k < 1 ? 1 : .6), lerp(y1, y0, j / 6)]);
      pts = [[x0, y0]].concat(teeth.reverse(), [[x0, y1]]);
    } else {
      const ye = lerp(y0, y1, k), teeth = [];
      for (let j = 0; j <= 5; j++) teeth.push([lerp(x1, x0, j / 5), ye - (j % 2 ? 9 + r() * 16 : r() * 4) * (k < 1 ? 1 : .6)]);
      pts = [[x0, y0 + 3], [x1, y0]].concat(teeth);
    }
    c.fillStyle = color; K.poly(c, K.jag(pts, 1.6, 90 + seed * 7, 7)); c.fill();
  };

  // ---------------- lines that draw themselves ----------------
  // seg(c, a, b, k, color, width): a straight title line from a toward b, drawn to fraction k (0..1). Butt caps.
  K.seg = function (c, a, b, k, col, w) { if (k <= 0) return; c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(lerp(a[0], b[0], k), lerp(a[1], b[1], k)); c.stroke(); };
  // drawOn(c, pts, k, color, width): an open polyline drawn to fraction k of its total length (outlines, a path, a
  // signature line). Points in px.
  K.drawOn = function (c, pts, k, col, w) {
    if (k <= 0 || pts.length < 2) return;
    let tot = 0; const L = [0]; for (let i = 1; i < pts.length; i++) L.push(tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const lim = tot * clamp(k); c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      if (L[i] <= lim) { c.lineTo(pts[i][0], pts[i][1]); continue; }
      const f = (lim - L[i - 1]) / (L[i] - L[i - 1] || 1); c.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)); break;
    }
    c.stroke();
  };

  // ---------------- one-point perspective in metres ----------------
  // view({ F = 1200 px focal, eye = 1.5 m camera height, horizon = 800 px, cx = 540 px }) → V with
  //   V.P(x, y, z) → [px, py]   x right, y up (floor = 0), z away from the camera (m)
  //   V.zAt(py)   → floor depth seen at screen row py (below the horizon)
  //   V.quad(x0, x1, y0, y1, z) → the 4 screen corners of an upright wall-plane rectangle (TL, TR, BR, BL)
  K.view = function (o = {}) {
    const F = o.F ?? 1200, CH = o.eye ?? 1.5, YH = o.horizon ?? 800, CX = o.cx ?? 540;
    const V = { F, eye: CH, horizon: YH, cx: CX };
    V.P = (x, y, z) => [CX + F * x / z, YH - F * (y - CH) / z];
    V.zAt = py => F * CH / (py - YH);
    V.quad = (x0, x1, y0, y1, z) => [V.P(x0, y1, z), V.P(x1, y1, z), V.P(x1, y0, z), V.P(x0, y0, z)];
    return V;
  };
  // gridBuild(c, V, { xs, zFar, zNear, t, at, stagger = .12, dur = .45, color, width = 2 }): floor lines at each x (m)
  // that grow from the far wall toward the camera, the centre first, outer ones `stagger` s/m later — the opening
  // "lines slide in and build the set" move.
  K.gridBuild = function (c, V, o) {
    const st = o.stagger ?? .12, du = o.dur ?? .45, w = o.width ?? 2;
    o.xs.forEach(x => {
      const k = K.eo4((o.t - o.at - Math.abs(x) * st) / du);
      if (k > 0) K.seg(c, V.P(x, 0, o.zFar), V.P(x, 0, lerp(o.zFar, o.zNear, k)), 1, o.color, w);
    });
  };

  // ---------------- light: true rays through a gap ----------------
  // ray(L, x, z, zTo): plan view (x–z). The ray from point light L {x, z} through (x, z), carried on to depth zTo → x.
  // Use it for where a door edge's shadow lands on the wall plane, or where a gap's edge ray crosses the floor.
  K.ray = (L, x, z, zTo) => x + (x - L.x) * (zTo - z) / (z - L.z);
  // wedge(V, L, x0, x1, zWall, zNear) → screen polygon of the floor light that a gap x0..x1 (m) in the wall at zWall
  // lets through from a light L beyond the wall (L.z > zWall), out to depth zNear in front.
  K.wedge = (V, L, x0, x1, zWall, zNear) => [V.P(x0, 0, zWall), V.P(x1, 0, zWall), V.P(K.ray(L, x1, zWall, zNear), 0, zNear), V.P(K.ray(L, x0, zWall, zNear), 0, zNear)];
  // toFloor(L, [x, y, z]) → [x, 0, z]: 3-D point light L {x, y, z} casts point p onto the floor (y = 0). Light patch of a
  // window = its 4 corners through toFloor; a standing cut-out's shadow = its outline (in metres) through toFloor.
  K.toFloor = (L, p) => { const s = L.y / (L.y - p[1]); return [L.x + (p[0] - L.x) * s, 0, L.z + (p[2] - L.z) * s]; };
  // castShadow(V, L, shape, { x, z, width, yTip }) → screen points of a flat cut-out shadow lying on the floor along the
  // light's rays (plan view): shape = [[v, u]…], v = metres across (widened with distance, as the rays spread), u = 0
  // at the feet (x, z) … 1 at the tip, which reaches screen row yTip (px, toward the camera). Use mirror() for shape.
  K.castShadow = function (V, L, shape, o) {
    const fz = o.z, y0 = V.P(0, 0, fz)[1], dx = o.x - L.x, dz = fz - L.z, D0 = Math.hypot(dx, dz), ux = dx / D0, uz = dz / D0, wv = o.width;
    return shape.map(([v, u]) => {
      const y = lerp(y0, o.yTip, u), Z = V.zAt(y), al = (Z - fz) / uz, sp = 1 + al / D0;
      return V.P(o.x + ux * al - uz * v * wv * sp, 0, Z + ux * v * wv * sp);
    });
  };
  // floodFront(V, zFront, zWall, { x0 = -7, x1 = 7, zBack = 9, zMin = .6, seed = 5 }) → a floor polygon whose toothed
  // near edge sits at depth zFront (ink spreading toward the camera; water, a crowd, darkness). Fill it with ink.
  K.floodFront = function (V, zf, zWall, o = {}) {
    const x0 = o.x0 ?? -7, x1 = o.x1 ?? 7, sd = o.seed ?? 5, pts = [];
    for (let x = x0; x <= x1 + .001; x += .07) {
      const tooth = (noise(x * 2.3, sd) - .5) * .5 + (noise(x * 9, sd + 2) - .5) * .22;
      pts.push(V.P(x, 0, Math.max(o.zMin ?? .6, zf + tooth * (zWall - zf + .2) * .5)));
    }
    pts.push(V.P(x1, 0, o.zBack ?? 9), V.P(x0, 0, o.zBack ?? 9));
    return pts;
  };
  // The light layer: an offscreen sheet where light shapes are drawn as flat paper, then shadows/details cut INTO them
  // (source-atop), then the sheet is laid on the frame. lightBegin(cam?) → its cleared ctx (camera applied if given);
  // lightAtop(fn) runs fn(lc) clipped to what is lit; lightEnd(ctx) composites it (call with ctx's camera restored).
  K.lightBegin = function (cam) { lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, K.W, K.H); if (cam) K.applyCam(lc, cam); return lc; };
  K.lightAtop = function (fn) { lc.globalCompositeOperation = 'source-atop'; fn(lc); lc.globalCompositeOperation = 'source-over'; };
  K.lightEnd = function (ctx) { ctx.drawImage(lit, 0, 0); };

  // ---------------- camera ----------------
  // cam(s = 1, x = 540, y = 960, jx = 0, jy = 0) → camera {s scale, x/y the fixed point px, jx/jy jolt px}.
  K.cam = (s = 1, x = 540, y = 960, jx = 0, jy = 0) => ({ s, x, y, jx, jy });
  // applyCam(c, cam): scale about (x, y), then offset by the jolt. Wrap in c.save()/c.restore().
  K.applyCam = function (c, m) { c.translate(m.x + m.jx, m.y + m.jy); c.scale(m.s, m.s); c.translate(-m.x, -m.y); };
  // crashPush(t, at, to = 1.72, dur = .32) → scale: a hard push onto a detail that lands dead in `dur` s.
  K.crashPush = (t, at, to = 1.72, dur = .32) => lerp(1, to, K.eo4((t - at) / dur));
  // pullBack(t, at, to = .6, dur = .75) → scale: an eased pull-out (for the end card).
  K.pullBack = (t, at, to = .6, dur = .75) => lerp(1, to, eio((t - at) / dur));
  // jolt(t, at, dur = .25, ax = 26, ay = 18) → [jx, jy] px: a seeded per-frame (30 fps) shake after a slam.
  K.jolt = (t, at, dur = .25, ax = 26, ay = 18) => {
    if (!(t > at && t < at + dur)) return [0, 0];
    const r = rng(Math.floor(t * 30)); return [(r() - .5) * ax, (r() - .5) * ay];
  };

  // ---------------- frame & post passes ----------------
  // begin(ctx): black, pillarbox the portrait frame in landscape (?o=h), fill the ink ground. Call first in draw().
  K.begin = function (ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, Pilot.W, Pilot.H);
    if (Pilot.ori !== 'v') { ctx.translate((Pilot.W - K.W * Pilot.H / K.H) / 2, 0); ctx.scale(Pilot.H / K.H, Pilot.H / K.H); ctx.beginPath(); ctx.rect(0, 0, K.W, K.H); ctx.clip(); }
    ctx.fillStyle = K.C.ink; ctx.fillRect(0, 0, K.W, K.H);
  };
  // paperPass(ctx): multiply the paper sheet over everything drawn so far (ink stays ink, white reads as paper).
  // Draw words AFTER it so type stays crisp.
  K.paperPass = function (ctx) { ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(paper, 0, 0, K.W, K.H); ctx.globalCompositeOperation = 'source-over'; };
  // negFlash(ctx, t, at, dur = .07): the frame in negative for ~2 frames — a stab on a slam/cut.
  K.negFlash = function (ctx, t, at, dur = .07) {
    if (t >= at && t < at + dur) { ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = K.C.paper; ctx.fillRect(0, 0, K.W, K.H); ctx.globalCompositeOperation = 'source-over'; }
  };
  // fadeOut(ctx, t, dur, fo = .6): to black over the last `fo` s (films join cleanly). Bass opens on ink, no fade in.
  K.fadeOut = function (ctx, t, dur, fo = .6) { const a = ss(dur - fo, dur, t); if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, K.W, K.H); } };

  // ---------------- words ----------------
  // wordsLine(ctx, s, cx, y, { weight, size, font, color, maxW = 880 }, nShow): one centred line, only its first
  // nShow words drawn (the rest keep their place) — words snap on, no fades. Shrinks to maxW. s already translated.
  K.wordsLine = function (ctx, s, cx, y, o, nShow) {
    ctx.font = `${o.weight} ${o.size}px ${o.font}`;
    let ws = s.split(' '), sp = ctx.measureText(' ').width, wd = ws.map(w => ctx.measureText(w).width);
    let tot = wd.reduce((a, b) => a + b, 0) + sp * (ws.length - 1), size = o.size;
    if (tot > (o.maxW || 880)) { size = o.size * (o.maxW || 880) / tot; ctx.font = `${o.weight} ${size}px ${o.font}`; sp = ctx.measureText(' ').width; wd = ws.map(w => ctx.measureText(w).width); tot = wd.reduce((a, b) => a + b, 0) + sp * (ws.length - 1); }
    let x = cx - tot / 2; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = o.color;
    ws.forEach((w, i) => { if (i < nShow) ctx.fillText(w, x, y); x += wd[i] + sp; });
    return tot;
  };
  // srcLine(ctx, src, y, a, rule = 64): a source line (e.g. '창세기 4:7 (개역개정)') under a short paper rule `rule` px
  // wide; a = 0 hides it, 1 shows it (cut on).
  K.srcLine = function (ctx, src, y, a, rule = 64) {
    if (a <= 0) return;
    ctx.fillStyle = `rgba(241,237,228,${a})`; ctx.fillRect(540 - rule / 2, y - 52, rule, 4);
    text(ctx, src, 540, y, { size: 27, weight: 600, font: K.SANS, color: K.C.src, alpha: a, ls: 3 });
  };
  // stripCaption(ctx, s, dt, { cx, cy, angle°, from = ±1, slide = .2, size = 62, seed, paper, ink, maxW = 800 }):
  // a cut-paper strip with ink words that slides in from off-frame (from −1 left / +1 right) and stops dead.
  // dt = seconds since the line started. s already translated, one line.
  K.stripCaption = function (ctx, s, dt, o) {
    const size = o.size || 62, maxW = o.maxW || 800, k = K.eo4(dt / (o.slide ?? .2)), dx = (o.from ?? -1) * 900 * (1 - k);
    ctx.font = `900 ${size}px ${K.SANS}`; const tw = Math.min(maxW, ctx.measureText(s).width);
    ctx.translate(o.cx + dx, o.cy); ctx.rotate((o.angle || 0) * Math.PI / 180);
    const hw = tw / 2 + 46, hh = size * 56 / 62;
    ctx.fillStyle = o.paper || K.C.paper; K.poly(ctx, K.jag([[-hw, -hh], [hw, -hh + 3], [hw - 6, hh], [-hw + 4, hh - 2]], 2.4, o.seed ?? 401, 9)); ctx.fill();
    K.wordsLine(ctx, s, 0, size * 22 / 62, { weight: 900, size, font: K.SANS, color: o.ink || K.C.ink, maxW }, 99);
  };

  // The Bass caption system: captions(ctx, t, lines, { specs, strips }) draws SCRIPT.lines ([from, to, text, src?]).
  // Lines cut on at `from` and off at `to` — never fade. Each line gets a spec (specs[i], or specs(i, line) → spec);
  // missing specs/fields come from the automatic choice:
  //   line 0                → { mode: 'snap', half: .7 }   first half of the words, the rest after .7 s (the hook)
  //   a line with a source  → { mode: 'verse' }            serif, word by word (1 line) or line by line (2), source + rule
  //   any other line        → { mode: 'strip' }            cut-paper strip, placements cycle through `strips`
  // Modes and their fields (times are seconds after the line's `from`; for a story beat pass beat − from):
  //   snap : y = 470, size = 64, font = SANS, color = paper, half (s; show ceil(n/2) words until then), wordEvery (s/word)
  //   strip: cx, cy, angle, from (−1|+1), slide = .2, size = 62, seed = 400 + i
  //   verse: y (470 one line / 420 two), size (66 / 56), font = SERIF, wordEvery (.14 for one line, else none),
  //          lineDelay (s between lines, .5), srcAt (.45 / .9), rule = [from px, to px, delay s, dur s] (grows) or px
  K.STRIPS = [[380, 455, -4, -1], [630, 500, 3, 1], [520, 440, -2, -1]];   // cx, cy, angle°, slide-from
  // autoSpec(i, line, lines, strips = STRIPS) → the spec captions() uses when none is given for line i.
  K.autoSpec = function (i, line, lines, strips = K.STRIPS) {
    if (i === 0 && !line[3]) return { mode: 'snap', half: .7 };
    if (line[3]) { const two = line[2].includes('\n');
      return two ? { mode: 'verse', y: 420, size: 56, lineDelay: .5, srcAt: .9, rule: [64, 520, .9, 2.6] } : { mode: 'verse', y: 470, size: 66, wordEvery: .14, srcAt: .45 }; }
    let n = 0; for (let j = 1; j < i; j++) if (!lines[j][3]) n++;   // this is the nth strip line
    const [cx, cy, angle, from] = strips[n % strips.length]; return { mode: 'strip', cx, cy, angle, from };
  };
  K.captions = function (ctx, t, lines, o = {}) {
    lines.forEach((line, idx) => {
      const [a, b, s0, src] = line;
      if (t < a || t >= b) return;                                  // cut on, cut off
      const given = typeof o.specs === 'function' ? o.specs(idx, line) : o.specs && o.specs[idx];
      const sp = Object.assign(K.autoSpec(idx, line, lines, o.strips), given || {});
      const s = Pilot.tr(s0), ls = s.split('\n'), dt = t - a;
      ctx.save();
      if (sp.mode === 'snap') {
        const nw = s.split(' ').length;
        const n = sp.wordEvery ? 1 + Math.floor(dt / sp.wordEvery) : sp.half != null ? (dt < sp.half ? Math.ceil(nw / 2) : nw) : 99;
        let left = n;
        ls.forEach((ln, i) => { const size = sp.size || 64;
          K.wordsLine(ctx, ln, 540, (sp.y || 470) + i * size * 1.5, { weight: 900, size, font: sp.font || K.SANS, color: sp.color || K.C.paper }, left);
          left -= ln.split(' ').length; });
      } else if (sp.mode === 'strip') {
        K.stripCaption(ctx, ls[0], dt, { ...sp, seed: sp.seed ?? 400 + idx });
      } else {
        const size = sp.size || 56, y0 = sp.y || 420, lh = size * 1.5;
        ls.forEach((ln, i) => {
          if (dt < i * (sp.lineDelay ?? .5)) return;
          const n = sp.wordEvery ? 1 + Math.floor(dt / sp.wordEvery) : 99;
          K.wordsLine(ctx, ln, 540, y0 + i * lh, { weight: 900, size, font: sp.font || K.SERIF, color: sp.color || K.C.paper }, n);
        });
        if (src) {
          const ys = y0 + (ls.length - 1) * lh + 78, at = sp.srcAt ?? .9, r = sp.rule ?? 64;
          const rule = Array.isArray(r) ? lerp(r[0], r[1], eio((dt - r[2]) / r[3])) : r;
          K.srcLine(ctx, src, ys, dt >= at ? 1 : 0, rule);
        }
      }
      ctx.restore();
    });
  };
  // plainCaptions(ctx, t, lines, o): the shared fading Story.captions in Bass type (for a quiet film that wants fades).
  K.plainCaptions = (ctx, t, lines, o = {}) => Story.captions(ctx, t, lines, { font: K.SERIF, srcFont: K.SANS, color: K.C.paper, srcColor: K.C.src, weight: 900, ...o });
  // endCard(ctx, t, card, at, o): the shared end card (title · passage · by · cta) in Bass type, upper third.
  K.endCard = (ctx, t, card, at, o = {}) => Story.endCard(ctx, t, card, at, { y: 430, font: K.SERIF, srcFont: K.SANS, color: K.C.paper, srcColor: K.C.src, ctaColor: K.C.paper, ...o });

  window.Bass = K;
})();

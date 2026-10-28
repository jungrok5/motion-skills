/* kit-graphite.js — house style "graphite & charcoal picture book at night" for word-log films (global: window.Graphite).
   A night picture book drawn in soft pencil on dark toothed paper: grainy charcoal masses, graphite hatching, white-pencil
   highlights (moon, rims, flowers), a little town (scalloped shingles, clapboard, picket fence), black bushes and a big
   charcoal trunk in the foreground, a grain flicker on 8 fps and a soft vignette — and ONE warm colour: the yellow of a
   flashlight / lit doorway (#f6e4b0), the thing that matters.
   Default character: a little sheet-ghost (a child under a sheet: dark oval eyes with a glint, pink cheeks, sleeves with
   round mittens, small shoes under the hem — gentle, never spooky).
   Worked example: sermons/2026-10-24-cross-styles/film/scenes/cs-graphite.html (잘라 낸 건 다리였다 · 13).
   Style card: styles/graphite/STYLE.md. New scene: styles/graphite/template.html + script.example.js.

   HOW A FRAME IS MADE
     init:  K.init() (grain masks, sprites, vignette, flicker, end plate) → build the world ONCE into layer canvases
            (K.layerCanvas; marks: K.fillG / K.strokeG / K.hatch / K.smudge; pieces: K.nightSky, K.street, K.groundStrip, …)
     frame: K.ground(ctx) → K.layer(ctx, cam, .5 | 1 | 1.3, () => K.drawSheet(ctx, layer)) → live things inside the plate
            (light K.drawBeam / K.warmHaze, figures K.drawFig) → K.post(ctx, t) (vignette + grain flicker) → K.endPlate →
            K.captions → K.endCard.
   Units: world px (authored around a 1080×1920 frame; camera {x, y, z} looks at world (x, y) with zoom z, world y = 960 is
   the frame centre at z = 1). Figure scale s = 1 ≈ a 330-px-tall figure. Grain patterns are locked to the world (they
   move with the layer, never slide over the drawing). Deterministic: seeded randomness only — any seek order gives the same
   frame. No network, no images. Load after lib.js and story.js. */
(function () {
  const TAU = Math.PI * 2;
  const { clamp, lerp, ss, eo, eio, rng, noise, fbm } = Pilot;
  const K = {};
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  /* ================================================================ palette, type */
  // graphite values (rgb): black masses, dark, mid, light, chalk (white pencil), warm (THE accent: torch / lamp light)
  const C = { black: [30, 28, 27], dark: [52, 49, 47], mid: [104, 99, 94], light: [158, 152, 145], chalk: [232, 227, 219], warm: [246, 228, 176] };
  K.C = C;
  K.INK = '#1e1c1b';
  K.BG = '#3a3734';                   // the night page under everything
  K.FONT = "'Gamja Flower',cursive";  // hand-lettered captions and end card (a child's pencil hand)
  K.FONTS = ["400 74px 'Gamja Flower'"];
  K.rgba = rgba;                      // rgba([r,g,b], a) → css

  /* ================================================================ HD — the hand-drawn line toolkit (shared with inkwash)
     Lines are variable-width ribbons along densely sampled polylines; points are [x, y] arrays. */
  const HD = {};
  HD.hash = (i, s = 0) => { let h = (Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  HD.t12 = t => Math.floor(t * 12 + 1e-6) / 12;   // time quantised to 12 fps (motion on twos)
  HD.spline = (P, step = 3, closed = false) => {   // Catmull-Rom through P, resampled every `step` px
    const n = P.length; if (n < 2) return P.map(p => p.slice());
    const get = i => closed ? P[((i % n) + n) % n] : P[clamp(i, 0, n - 1)];
    const out = [], segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), m = Math.max(1, Math.ceil(L / step));
      for (let j = 0; j < m; j++) { const t = j / m, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(k => .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3))); }
    }
    out.push(closed ? out[0].slice() : P[n - 1].slice()); return out;
  };
  HD.seg = (a, b, step = 4) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(L / step)), o = [];
    for (let i = 0; i <= m; i++) o.push([lerp(a[0], b[0], i / m), lerp(a[1], b[1], i / m)]); return o; };
  HD.poly = (P, closed = false, step = 4) => { const o = []; const n = P.length, m = closed ? n : n - 1; for (let i = 0; i < m; i++) { const sg = HD.seg(P[i], P[(i + 1) % n], step); if (i) sg.shift(); o.push(...sg); } return o; };
  HD.arc = (cx, cy, rx, ry, a0, a1, step = 4, rot = 0) => { const L = Math.abs(a1 - a0) * Math.max(rx, ry), m = Math.max(2, Math.ceil(L / step)), o = [], c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i <= m; i++) { const a = lerp(a0, a1, i / m), x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * c - y * s, cy + x * s + y * c]); } return o; };
  HD.normals = pts => pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
  HD.lengths = pts => { const s = [0]; for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return s; };
  HD.wob = (pts, seed, amp, wl = 120) => { if (!amp || pts.length < 2) return pts; const N = HD.normals(pts), Sx = HD.lengths(pts), oy = (seed * 17.37) % 997;
    return pts.map((p, i) => { const d = (noise(Sx[i] / wl, oy) - .5) * 2 * amp; return [p[0] + N[i][0] * d, p[1] + N[i][1] * d]; }); };
  HD.boil = (pts, seed, f, amp, wl = 90) => { if (!amp) return pts; const s = (seed * 31 + f * 977) | 0, dx = (HD.hash(s, 1) - .5) * amp, dy = (HD.hash(s, 2) - .5) * amp;
    return HD.wob(pts, s, amp, wl).map(p => [p[0] + dx, p[1] + dy]); };
  HD.ribbon = (pts, wf) => {
    const n = pts.length, N = HD.normals(pts), Sx = HD.lengths(pts), L = Sx[n - 1] || 1, Lf = [], Rt = [], ws = [];
    for (let i = 0; i < n; i++) { const w = Math.max(0, wf(Sx[i] / L, Sx[i], i, L)) / 2; ws.push(w); Lf.push([pts[i][0] + N[i][0] * w, pts[i][1] + N[i][1] * w]); Rt.push([pts[i][0] - N[i][0] * w, pts[i][1] - N[i][1] * w]); }
    const p = new Path2D(); p.moveTo(Lf[0][0], Lf[0][1]); for (let i = 1; i < n; i++) p.lineTo(Lf[i][0], Lf[i][1]);
    const ae = Math.atan2(N[n - 1][1], N[n - 1][0]); if (ws[n - 1] > .4) p.arc(pts[n - 1][0], pts[n - 1][1], ws[n - 1], ae, ae + Math.PI, true); else p.lineTo(Rt[n - 1][0], Rt[n - 1][1]);
    for (let i = n - 1; i >= 0; i--) p.lineTo(Rt[i][0], Rt[i][1]);
    const a0 = Math.atan2(N[0][1], N[0][0]); if (ws[0] > .4) p.arc(pts[0][0], pts[0][1], ws[0], a0 + Math.PI, a0, true);
    p.closePath(); return p;
  };
  /* HD.ink(ctx, pts, o) — a pressure stroke: o.w px, ts / te taper lengths, mn / mnE tip width factor, press, pw, rough,
     seed, col (colour or a grain pattern — K.PAT.*) */
  HD.ink = (ctx, pts, o = {}) => {
    if (!pts || pts.length < 2) return;
    const w = o.w ?? 8, ts = o.ts ?? w * 2.5, te = o.te ?? w * 3.5, mn = o.mn ?? .2, press = o.press ?? .3, pw = o.pw ?? 70, rough = o.rough ?? .08, seed = o.seed ?? 1, mnE = o.mnE ?? mn;
    const wf = (u, s, i, L) => { const k = Math.min(1, mn + (1 - mn) * ss(0, ts, s)) * Math.min(1, mnE + (1 - mnE) * ss(0, te, L - s));
      return w * k * (1 + press * (noise(s / pw, seed * 3.7 % 500) - .5) * 2) * (1 + rough * (HD.hash(i, seed) - .5) * 2); };
    ctx.fillStyle = o.col || '#151312'; ctx.fill(HD.ribbon(pts, wf));
  };
  HD.pathOf = pts => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (const q of pts) p.lineTo(q[0], q[1]); p.closePath(); return p; };
  K.HD = HD;
  K.t12 = HD.t12;

  /* ================================================================ graphite tooth: one periodic tile → grain masks
     K.PAT.black[0..2] / chalk[0..2] (light → dense), mid, dark (= black[2]), light (= chalk[1]), warm, brown, sheet (the
     ghost's white-pencil strokes). A grain mask is a colour only on the tooth peaks: fill a region with it to "pencil" it. */
  const NT = 1008, TX = {}, PAT = {};
  K.TX = TX; K.PAT = PAT;
  function pnoise(x, y, P, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const h = (a, b) => HD.hash((((a % P) + P) % P) * 7919 + (((b % P) + P) % P), s);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function tile(fn) { const c = Pilot.canvas(NT, NT), g = c.getContext('2d'), d = g.createImageData(NT, NT); for (let i = 0; i < NT * NT; i++) fn(i, d.data, i * 4); g.putImageData(d, 0, 0); return c; }
  function buildTiles() {
    const T = new Float32Array(NT * NT);
    for (let y = 0; y < NT; y++) for (let x = 0; x < NT; x++) T[y * NT + x] = .62 * pnoise(x / 5.6, y / 5.6, 180, 1) + .38 * pnoise(x / 2.1, y / 2.1, 480, 2);
    const mask = (hex, thr, soft, amax) => { const rgb = Pilot.hex(hex); return tile((i, D, o) => { D[o] = rgb[0]; D[o + 1] = rgb[1]; D[o + 2] = rgb[2]; D[o + 3] = clamp((T[i] - thr) / soft) * amax * 255; }); };
    const pc = Pilot.canvas(2, 2).getContext('2d'), pat = c => pc.createPattern(c, 'repeat');
    PAT.black = [mask('#1e1c1b', .6, .3, .35), mask('#1e1c1b', .48, .34, .6), mask('#1e1c1b', .32, .36, .9)].map(pat);
    PAT.chalk = [mask('#e8e3db', .6, .3, .3), mask('#e8e3db', .48, .34, .55), mask('#e8e3db', .34, .36, .85)].map(pat);
    PAT.mid = pat(mask('#8a847d', .4, .3, .9)); PAT.dark = PAT.black[2]; PAT.light = PAT.chalk[1];
    PAT.warm = pat(mask('#f3dfae', .34, .36, .9)); PAT.brown = pat(mask('#6a4a2a', .3, .36, .95));
    // the sheet's white-pencil texture (strokes laid one way)
    { const c = Pilot.canvas(300, 320), g = c.getContext('2d'), r = rng(77);
      for (let i = 0; i < 300; i++) { const x = r() * 300, y = r() * 320, l = 20 + r() * 40, a = -1.1 + (r() - .5) * .3;
        for (const [ox, oy] of [[0, 0], [-300, 0], [300, 0], [0, -320], [0, 320]]) HD.ink(g, [[x + ox, y + oy], [x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l]], { w: 2.4 + r() * 2, ts: 6, te: 10, mn: .3, press: .4, seed: i, col: `rgba(246,243,238,${.35 + r() * .4})` }); }
      PAT.sheet = pc.createPattern(c, 'repeat'); }
  }

  /* ================================================================ marks (world coordinates; grain locked to the world) */
  const bbx = (pts, pad = 8) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } return [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad]; };
  K.bbx = bbx;
  K.R4 = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];   // a rectangle as points
  /* fillG(g, pts, col, a, dens = 1, tone = 'black') — a pencilled mass: flat col at a·.8, then the grain (tone 'black' |
     'chalk' at density 0..2, or 'warm' / 'mid'…) at a·.6. a > 1 is allowed (fully opaque body + heavier grain). */
  K.fillG = function (g, pts, col, a, dens = 1, tone = 'black') { const p = HD.pathOf(pts), b = bbx(pts);
    g.save(); g.clip(p); g.fillStyle = rgba(col, a * .8); g.fillRect(...b); g.globalAlpha = a * .6; g.fillStyle = PAT[tone][dens]; g.fillRect(...b); g.restore(); };
  /* strokeG(g, pts, seed, pat, o) — a pencil line in grain pattern pat (K.PAT.light for white pencil, .black[2] dark,
     .brown wood…). o: w (2.6), ts / te tapers, wob. */
  K.strokeG = function (g, pts, seed, pat, o = {}) { HD.ink(g, HD.wob(pts, seed, o.wob ?? 1.2, 60), { w: o.w ?? 2.6, ts: o.ts ?? 10, te: o.te ?? 16, mn: .25, press: .4, pw: 40, rough: .15, seed, col: pat }); };
  /* hatch(g, pts, ang, sp, len, pat, a, seed, o) — loose parallel pencil hatching inside pts: angle ang (rad), row spacing
     sp px, stroke length len px, pattern pat, alpha a. o.w stroke width. */
  K.hatch = function (g, pts, ang, sp, len, pat, a, seed, o = {}) {
    const r = rng(seed), [bx, by, bw, bh] = bbx(pts, len); g.save(); g.clip(HD.pathOf(pts)); g.globalAlpha = a;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let y = by; y < by + bh; y += sp * (.6 + .8 * r())) for (let x = bx + (r() - .5) * len; x < bx + bw; x += len * (.5 + .7 * r())) {
      const l = len * (.6 + .7 * r()), x0 = x + (r() - .5) * sp * 2, y0 = y + (r() - .5) * sp;
      K.strokeG(g, HD.seg([x0, y0], [x0 + ca * l, y0 + sa * l], 6), seed + (x * 7 + y * 13 | 0), pat, { w: (o.w ?? 2.8) * (.75 + .6 * r()), ts: l * .3, te: l * .4 }); }
    g.restore();
  };
  /* smudge(g, pts, col, a, blur, seed) — a finger-rubbed soft tone (blurred, wobbly outline) */
  K.smudge = function (g, pts, col, a, blur, seed) { g.save(); g.filter = `blur(${blur}px)`; g.fillStyle = rgba(col, a); g.fill(HD.pathOf(HD.wob(HD.spline(pts, 6, true), seed, 10, 60))); g.restore(); };
  const fillG = K.fillG, strokeG = K.strokeG, hatch = K.hatch, smudge = K.smudge, R4 = K.R4;
  /* tuft(g, x, yb, h, n, spread, seed, light) — a grass tuft: n blades of height ≈ h fanned over `spread` rad; light =
     share of white-pencil blades. flower(g, x, y, r, seed) — a white-headed flower on a pencil stalk. */
  K.tuft = (g, x, yb, h, n, spread, seed, light) => { const q = rng(seed); for (let j = 0; j < n; j++) { const an = -Math.PI / 2 + (j / (n - 1) - .5) * spread + (q() - .5) * .2, hh = h * (.6 + .5 * q()), bend = (q() - .5) * .5 + (j / (n - 1) - .5) * .6;
    const p1 = [x + Math.cos(an) * hh * .5, yb + Math.sin(an) * hh * .5], p2 = [x + Math.cos(an + bend) * hh, yb + Math.sin(an + bend) * hh]; strokeG(g, HD.spline([[x + (q() - .5) * 8, yb], p1, p2], 4), seed + j, q() < light ? PAT.light : PAT.black[1], { w: 2.2 + q() * 1.8, ts: 6, te: hh * .6 }); } };
  K.flower = (g, x, y, r, seed) => { strokeG(g, HD.seg([x, y + 4], [x + (HD.hash(seed, 1) - .5) * 8, y + 40 + 40 * HD.hash(seed, 2)], 3), seed, PAT.light, { w: 1.8 }); g.fillStyle = rgba(C.chalk, .72); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = rgba(C.black, .45); g.beginPath(); g.arc(x, y, r * .4, 0, TAU); g.fill(); };
  const tuft = K.tuft, flower = K.flower;
  /* prop({ w, h, ox, oy, k = 2, draw(g) }) → a canvas sprite of a thing (local coords: (ox, oy) at its top-left, k px per
     unit, round joins) — draw it with drawImage. */
  K.prop = function (o) { const k = o.k ?? 2, c = Pilot.canvas(o.w, o.h), g = c.getContext('2d'); g.setTransform(k, 0, 0, k, -o.ox * k, -o.oy * k); g.lineJoin = g.lineCap = 'round'; if (o.draw) o.draw(g); return c; };

  /* ================================================================ camera and layers
     cam = { x, y, z, sx?, sy? }; a layer of parallax p moves p× as far and zooms 1 + (z − 1)·p (far .5, plate 1, fg 1.3). */
  K.layer = function (ctx, cm, p, fn) { const W2 = Pilot.W / 2, H2 = Pilot.H / 2, z = 1 + (cm.z - 1) * p, cx = cm.x * p, cy = H2 + (cm.y - H2) * p; ctx.save(); ctx.setTransform(z, 0, 0, z, W2 - cx * z + (cm.sx || 0) * p, H2 - cy * z + (cm.sy || 0) * p); fn(); ctx.restore(); };
  K.vis = function (ctx) { const m = ctx.getTransform().inverse(), a = m.transformPoint(new DOMPoint(0, 0)), b = m.transformPoint(new DOMPoint(Pilot.W, Pilot.H)); return { x0: Math.min(a.x, b.x) - 2, y0: Math.min(a.y, b.y) - 2, x1: Math.max(a.x, b.x) + 2, y1: Math.max(a.y, b.y) + 2 }; };
  K.mixCam = (a, b, k) => k <= 0 ? a : k >= 1 ? b : { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
  /* camExtent(camAt, dur, p = 1, pad = 40) → [x0, x1]: the world x range a layer of parallax p shows over the film */
  K.camExtent = function (camAt, dur, p = 1, pad = 40) { let x0 = 1e9, x1 = -1e9;
    for (let t = 0; t <= dur; t += .05) { const c = camAt(t), z = 1 + (c.z - 1) * p, hw = Pilot.W / 2 / z + pad; x0 = Math.min(x0, c.x * p - hw); x1 = Math.max(x1, c.x * p + hw); } return [x0, x1]; };
  /* hitShake(t, at, dur = .55, ax = 15, ay = 11) → [sx, sy]: the "hit" jolt dying over dur */
  K.hitShake = function (t, at, dur = .55, ax = 15, ay = 11) { const k = 1 - ss(at, at + dur, t); return t >= at ? [ax * k * Math.sin(t * 97), ay * k * Math.sin(t * 131 + 1)] : [0, 0]; };
  /* layerCanvas(x0, y0, x1, y1) → { c, g, x0, y0, k: 1 } — a transparent canvas for a world rect; drawSheet(ctx, s) shows
     its visible part inside K.layer */
  K.layerCanvas = function (x0, y0, x1, y1) { const c = Pilot.canvas(Math.ceil(x1 - x0), Math.ceil(y1 - y0)), g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, -x0, -y0); g.lineJoin = g.lineCap = 'round'; return { c, g, x0, y0, k: 1 }; };
  K.drawSheet = function (ctx, s) { const v = K.vis(ctx), x0 = Math.max(s.x0, v.x0), y0 = Math.max(s.y0, v.y0), x1 = Math.min(s.x0 + s.c.width, v.x1), y1 = Math.min(s.y0 + s.c.height, v.y1);
    if (x1 <= x0 || y1 <= y0) return; ctx.drawImage(s.c, x0 - s.x0, y0 - s.y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0); };
  K.ground = function (ctx) { ctx.fillStyle = K.BG; ctx.fillRect(0, 0, Pilot.W, Pilot.H); };   // the night page
  /* post(ctx, t) — the page's finish on the frame: soft vignette, then the grain flicker (3 speckle drawings on 8 fps,
     overlay .2) — the style's ambient life */
  K.post = function (ctx, t) {
    ctx.drawImage(TX.vig, 0, 0);
    const gf = Math.floor(t * 8 + 1e-6) % 3; ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .2; ctx.drawImage(TX.flick[gf], 0, 0, Pilot.W, Pilot.H); ctx.restore();
  };

  /* ================================================================ the figure rig — the sheet-ghost
     Spec fields (same rig as every word-log figure kit): s scale, f facing ±1, gy ground y, hip [x, y], ang torso lean
     (f·lean), feet [[far], [near]] ankle targets, hands [far, near] grip points or null (hangs), hand ['fist'|'flat'|'open'],
     tilt (head), eye 'calm' | 'strain' | 'down' | 'shock' | 'up', sway, me (the brightest sheet: the main character),
     sheet [r,g,b] (others' sheet grey), seed, alpha, farFront (far sleeve in front), lit 0..1 (warm light on the sheet),
     after() (drawn last: a torch in the hand), sx (squash 0..1, K.turn).
     Sleeves are 2-bone IK (78·s + 74·s) rooted on the sheet's FRONT edge at shoulder height (below the face — never from
     the cheek or mouth), back edge when reaching behind; the mitten is drawn AT the grip point. */
  function ik(a, t, l1, l2, pick) {
    let dx = t[0] - a[0], dy = t[1] - a[1], d = Math.hypot(dx, dy) || 1e-6; const dd = clamp(d, Math.abs(l1 - l2) + .5, l1 + l2 - .5);
    const tx = a[0] + dx / d * dd, ty = a[1] + dy / d * dd, an = Math.atan2(ty - a[1], tx - a[0]), b = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
    const j1 = [a[0] + Math.cos(an + b) * l1, a[1] + Math.sin(an + b) * l1], j2 = [a[0] + Math.cos(an - b) * l1, a[1] + Math.sin(an - b) * l1];
    return [pick(j1, j2), [tx, ty]];
  }
  K.ik = ik;
  function frame(F) { const up = [Math.sin(F.ang), -Math.cos(F.ang)], fw = [F.f * Math.cos(F.ang), F.f * Math.sin(F.ang)], s = F.s;
    return { up, fw, P: (a, b) => [F.hip[0] + fw[0] * a * s + up[0] * b * s, F.hip[1] + fw[1] * a * s + up[1] * b * s] }; }
  K.frame = frame;   // frame(F).P(a, b) = hip + a·s forward + b·s up
  K.shoulderOf = F => frame(F).P(4, 136);   // top of the shoulder line (where a carried beam rests)
  K.drawFig = function (ctx, F, mid, back) {
    const s = F.s, f = F.f, me = !!F.me, al = F.alpha ?? 1; if (al <= 0) return;
    ctx.save(); ctx.globalAlpha = al; ctx.lineJoin = ctx.lineCap = 'round';
    if (F.sx != null && F.sx !== 1) { ctx.translate(F.hip[0], 0); ctx.scale(F.sx, 1); ctx.translate(-F.hip[0], 0); }
    const { up, fw, P } = frame(F), sd = F.seed || (me ? 7 : 3), SH = me ? [226, 222, 214] : (F.sheet || [170, 165, 158]);
    // soft charcoal shadow on the road
    ctx.save(); ctx.globalAlpha = al * .5; ctx.drawImage(TX.shad, F.hip[0] - 100 * s, F.gy - 16 * s, 200 * s, 34 * s); ctx.restore();
    const sh = P(56, 84), shF = F.farFront ? P(52, 90) : P(8, 128);   // sleeves root on the front edge at shoulder height, below the face (the far one hides behind the head when raised)
    const elbowPick = (a, b) => (a[1] - f * a[0] * .35) > (b[1] - f * b[0] * .35) ? a : b, kneePick = (a, b) => f * a[0] > f * b[0] ? a : b;
    const outlineC = me ? PAT.mid : PAT.dark;
    const hand = (hd, el, type) => {
      const an = Math.atan2(hd[1] - el[1], hd[0] - el[0]); let n1 = [-Math.sin(an), Math.cos(an)]; if (n1[1] > 0) n1 = [-n1[0], -n1[1]];
      const parts = [];
      if (type === 'flat') parts.push([hd[0] + f * 6 * s, hd[1] - 3 * s, 17 * s, 9 * s, 0]);
      else if (type === 'open') { parts.push([hd[0], hd[1], 13 * s, 10 * s, an]); for (const k of [-.5, 0, .5]) parts.push([hd[0] + Math.cos(an + k) * 14 * s, hd[1] + Math.sin(an + k) * 14 * s, 5 * s, 4.2 * s, an + k]); }
      else { parts.push([hd[0], hd[1], 12.5 * s, 11.5 * s, an]); parts.push([hd[0] + n1[0] * 10 * s + Math.cos(an) * 3 * s, hd[1] + n1[1] * 10 * s + Math.sin(an) * 3 * s, 6.5 * s, 5 * s, an]); }
      ctx.fillStyle = me ? 'rgba(70,66,62,1)' : 'rgba(30,28,27,1)'; for (const [x, y, rx, ry, r] of parts) { ctx.beginPath(); ctx.ellipse(x, y, rx + 2.6 * s, ry + 2.6 * s, r, 0, TAU); ctx.fill(); }
      ctx.fillStyle = rgba(SH, 1); for (const [x, y, rx, ry, r] of parts) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, r, 0, TAU); ctx.fill(); }
    };
    const arm = (S0, T, type) => {   // a sheet sleeve ending in a round mitten
      if (!T) T = [S0[0] - f * 8 * s, S0[1] + 140 * s];
      const [el, hd] = ik(S0, T, 78 * s, 74 * s, elbowPick), pts = HD.spline([S0, el, hd], 3);
      const len = 152 * s, o1 = { w: 30 * s, mn: 1, mnE: .55, ts: 1, te: len, press: .04, rough: 0 };   // a sleeve: wide at the shoulder, narrowing to the wrist
      HD.ink(ctx, pts, { ...o1, col: me ? 'rgba(70,66,62,1)' : 'rgba(30,28,27,1)' });
      HD.ink(ctx, pts, { ...o1, w: 25 * s, col: rgba(SH, 1) });
      ctx.save(); ctx.globalAlpha = al * .5; HD.ink(ctx, pts, { ...o1, w: 25 * s, col: PAT.sheet }); ctx.restore();
      ctx.fillStyle = rgba(SH, 1); ctx.beginPath(); ctx.arc(S0[0], S0[1], 14 * s, 0, TAU); ctx.fill();   // the sleeve joins the sheet without a seam
      HD.ink(ctx, HD.spline([[lerp(S0[0], el[0], .35), lerp(S0[1], el[1], .35)], el, [lerp(el[0], hd[0], .4), lerp(el[1], hd[1], .4)]], 3), { w: 2 * s, ts: 6, te: 10, mn: .2, press: .4, seed: sd + 70, col: PAT.mid });   // a fold at the elbow
      hand(hd, el, type);
    };
    const leg = T => {   // a thin dark stocking (mostly under the sheet) and a little shoe
      const hp = P(-2, -2), ank = [T[0], T[1] - 9 * s];
      const [kn, an] = ik(hp, ank, 96 * s, 90 * s, kneePick);
      HD.ink(ctx, HD.spline([hp, kn, an], 3), { w: 9 * s, mn: .8, ts: 2, te: 2, press: .1, seed: sd + 21, col: 'rgba(40,37,35,1)' });
      const lift = Math.max(0, F.gy - T[1]), toe = lift > 6 * s ? .4 : 0, c0 = [an[0] + f * 6 * s, an[1] + 3 * s];
      ctx.save(); ctx.translate(c0[0], c0[1]); ctx.rotate(f * toe); ctx.fillStyle = 'rgba(34,31,30,1)'; ctx.beginPath(); ctx.ellipse(f * 4 * s, 0, 17 * s, 8.5 * s, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = PAT.light; ctx.globalAlpha = .6; ctx.beginPath(); ctx.ellipse(f * 8 * s, -4 * s, 7 * s, 2.4 * s, 0, 0, TAU); ctx.fill(); ctx.restore();
    };
    if (back) back();
    if (!F.farFront) arm(shF, F.hands[0], F.hand?.[0] || 'fist');
    leg(F.feet[0]); leg(F.feet[1]);
    // the sheet: body in the torso frame, a dome head that tilts, a hem hanging from the hip with a soft scallop
    const hemD = Math.max(44 * s, F.gy - F.hip[1] - 30 * s), sw = (F.sway || 0) * s;
    const skx = (a, b) => [F.hip[0] + f * a * s + sw * b / hemD, F.hip[1] + b];
    const tilt = F.ang + (F.tilt || 0), hu = [Math.sin(tilt), -Math.cos(tilt)], hf = [f * Math.cos(tilt), f * Math.sin(tilt)], N0 = P(2, 128);
    const Q = (a, b) => [N0[0] + (hf[0] * a + hu[0] * b) * s, N0[1] + (hf[1] * a + hu[1] * b) * s];
    const dome = []; for (let i = 0; i <= 16; i++) { const th = lerp(-.12, Math.PI + .12, i / 16); dome.push(Q(Math.cos(th) * 62, 50 + Math.sin(th) * 60)); }
    const side = HD.spline([skx(72, hemD * .45), skx(64, 0), P(62, 60), ...dome, P(-64, 60), skx(-68, 0), skx(-80, hemD * .45)], 5);
    const hem = []; for (let i = 0; i <= 30; i++) { const u = i / 30, a = lerp(-90, 90, u), y = hemD - 6 * Math.cos(u * 3 * TAU + (F.sway || 0) * 1.6) - 3; hem.push(skx(a, y)); }
    const out = side.concat(hem), body = HD.pathOf(out);
    ctx.fillStyle = rgba(SH, 1); ctx.fill(body);
    ctx.save(); ctx.clip(body);
    ctx.globalAlpha = al * (me ? .95 : .4); ctx.fillStyle = PAT.sheet; ctx.fill(body);
    ctx.globalAlpha = al * .3; ctx.fillStyle = PAT.black[0]; ctx.fill(body); ctx.globalAlpha = al;
    // shading: the back half in pencil hatching, a soft shade under the hem
    const r = rng(sd * 11);
    for (let i = 0; i < 24; i++) { const b0 = 230 - i * 11, a0 = -70 + r() * 12, l = 26 + r() * 34; HD.ink(ctx, [P(a0, b0), P(a0 + l, b0 - 16)], { w: 2.4 * s, ts: 6, te: 10, mn: .2, press: .4, seed: sd + i, col: PAT.mid }); }
    for (let i = 0; i < 10; i++) { const y = hemD * (.2 + i * .08), a0 = -92 + r() * 12; HD.ink(ctx, [skx(a0, y), skx(a0 + 30 + r() * 20, y + 12)], { w: 2.4 * s, ts: 6, te: 10, mn: .2, press: .4, seed: sd + 40 + i, col: PAT.mid }); }
    if (F.lit > 0) { const c = Q(30, 20), lg = ctx.createRadialGradient(c[0], c[1], 10, c[0], c[1], 220 * s); lg.addColorStop(0, rgba(C.warm, .5 * F.lit)); lg.addColorStop(1, rgba(C.warm, 0)); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = lg; ctx.fillRect(c[0] - 240 * s, c[1] - 240 * s, 480 * s, 480 * s); }
    ctx.restore();
    HD.ink(ctx, out.concat([out[0]]), { w: 3 * s, ts: 2, te: 2, mn: 1, press: .5, pw: 30, rough: .2, seed: sd + 5, col: outlineC });
    // the face: dark oval eyes with a glint, pink cheeks (gentle — never hollow)
    const eye = F.eye || 'calm', dy = eye === 'down' ? -6 : eye === 'up' ? 5 : 0;
    for (const ex of [16, 40]) { const e = Q(ex, 58 + dy);
      if (eye === 'strain') { HD.ink(ctx, HD.spline([Q(ex - 7, 58), Q(ex, 55), Q(ex + 7, 58)], 2), { w: 3.6 * s, mn: .6, ts: 2, te: 2, col: 'rgba(30,28,27,.95)' }); continue; }
      const k = eye === 'shock' ? 1.2 : 1; ctx.fillStyle = 'rgba(30,28,27,.94)'; ctx.beginPath(); ctx.ellipse(e[0], e[1], 7 * s * k, (eye === 'down' ? 7.5 : 10) * s * k, tilt, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(240,236,228,.75)'; ctx.beginPath(); ctx.arc(e[0] + 1.8 * s, e[1] - 3.4 * s, 2 * s, 0, TAU); ctx.fill(); }
    for (const ex of [6, 52]) { const e = Q(ex, 36); ctx.fillStyle = 'rgba(214,150,150,.45)'; ctx.beginPath(); ctx.ellipse(e[0], e[1], 9.5 * s, 5.5 * s, tilt, 0, TAU); ctx.fill(); }
    if (eye === 'shock') { const m = Q(29, 34); ctx.fillStyle = 'rgba(30,28,27,.85)'; ctx.beginPath(); ctx.ellipse(m[0], m[1], 4 * s, 5.5 * s, 0, 0, TAU); ctx.fill(); }
    if (mid) mid();
    if (F.farFront) arm(shF, F.hands[0], F.hand?.[0] || 'fist');
    const rootN = T => T && f * (T[0] - F.hip[0]) < -6 * s ? P(-46, 112) : sh;   // sleeves start at the shoulder on the outline — front, or back when reaching behind
    arm(rootN(F.hands[1]), F.hands[1], F.hand?.[1] || 'fist');
    if (F.after) F.after();
    ctx.restore();
  };

  /* ---------------------------------------------------------------- poses (specs; mix with K.mix, in-betweens on twos) */
  const frac = x => x - Math.floor(x);
  /* walk(x, gy, s, f, ph, stride, lean, lift = 22) — walk cycle at phase ph (advance by distance / (stride·s)) */
  K.walk = function (x, gy, s, f, ph, stride, lean, lift = 22) {
    const feet = [0, 1].map(i => { const p = frac(ph + i * .5); let off, up = 0;
      if (p < .58) off = stride * (.29 - p); else { const u = (p - .58) / .42; off = -.29 * stride + .58 * stride * eio(u); up = lift * Math.sin(Math.PI * u); }
      return [x + f * off * s, gy - up * s]; });
    const hipH = (176 - 5 * Math.abs(Math.sin(TAU * ph))) * s;
    return { s, f, gy, hip: [x, gy - hipH], ang: f * lean, feet, hands: [null, null], hand: ['fist', 'fist'], tilt: 0, eye: 'calm', sway: -f * 7 * Math.sin(TAU * ph), ph };
  };
  K.stand = function (x, gy, s, f, lean = .05) { return { s, f, gy, hip: [x, gy - 178 * s], ang: f * lean, feet: [[x - f * 18 * s, gy], [x + f * 22 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: 0, eye: 'calm', sway: 0 }; };
  /* crouch(x, gy, s, f, k = 1) — bent over the ground in front (lay down / pick up), k = depth 0..1; set hands yourself */
  K.crouch = function (x, gy, s, f, k = 1) { return { ...K.stand(x, gy, s, f), hip: [x + f * 18 * s * k, gy - lerp(178, 82, k) * s], ang: f * lerp(.05, 1.12, k), feet: [[x - f * 44 * s, gy], [x + f * 44 * s, gy]], tilt: .3 * k }; };
  /* kneel(x, gy, s, f, lean = .35) — on the far knee, near foot planted in front; lean .1 upright … .75 bowed (the sleeves
     root low, so .75 already reaches the soil: K.reachGround; past .8 the hip drops and the sheet lies flat — avoid) */
  K.kneel = function (x, gy, s, f, lean = .35) { return { s, f, gy, hip: [x, gy - (lean > .8 ? 84 : 104) * s], ang: f * lean, feet: [[x - f * 92 * s, gy], [x + f * 62 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: .2, eye: 'down', sway: 0 }; };
  /* reachGround(F, d = 120) → a ground point the near mitten really reaches (≤ 146·s from the shoulder root on the front
     edge), at most d·s in front of the hip — null if too far: bow deeper */
  K.reachGround = function (F, d = 120) { const sh = frame(F).P(56, 84), y = F.gy - 8 * F.s, dy = y - sh[1], R = 146 * F.s; if (dy > R) return null;
    const dx = Math.sqrt(R * R - dy * dy), x = F.f > 0 ? Math.min(sh[0] + dx, F.hip[0] + d * F.s) : Math.max(sh[0] - dx, F.hip[0] - d * F.s); return [x, y]; };
  /* lookUp(F, k) — head back by k (0..1), eyes up; returns F */
  K.lookUp = function (F, k = 1) { F.tilt = (F.tilt || 0) - .45 * k; if (k > .3) F.eye = 'up'; return F; };
  /* hangHands(F, swing) → the two hanging mitten points (at the sheet's front edge, not mid-body) */
  K.hangHands = function (F, swing = 0) { const fr = frame(F), sh = fr.P(52, 118); return [[sh[0] - F.f * (10 + swing) * F.s, sh[1] + 140 * F.s], [sh[0] - F.f * (10 - swing) * F.s, sh[1] + 140 * F.s]]; };
  K.mix = function (A, Bs, k) {
    if (k <= 0) return A; if (k >= 1) return Bs;
    const l2 = (a, b) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], hA = K.hangHands(A), hB = K.hangHands(Bs);
    const pick = k < .5 ? A : Bs;
    return { ...pick, s: lerp(A.s, Bs.s, k), gy: lerp(A.gy, Bs.gy, k), hip: l2(A.hip, Bs.hip), ang: lerp(A.ang, Bs.ang, k), feet: [l2(A.feet[0], Bs.feet[0]), l2(A.feet[1], Bs.feet[1])],
      hands: [0, 1].map(i => l2(A.hands[i] || hA[i], Bs.hands[i] || hB[i])), hand: pick.hand.slice(), tilt: lerp(A.tilt || 0, Bs.tilt || 0, k), sway: lerp(A.sway || 0, Bs.sway || 0, k) };
  };
  /* turn(A, B, k) — turn around with a squash (width → 15 % at the flip), never a one-frame mirror */
  K.turn = function (A, B, k) { const F = K.mix(A, B, k); if (k > 0 && k < 1) F.sx = Math.max(.15, Math.abs(Math.cos(Math.PI * k))); return F; };
  /* long objects: X = { x, y, a } (start, angle); beamPt(X, u, v) a point u along / v across (− = top side) */
  K.beamPt = (X, u, v = 0) => [X.x + Math.cos(X.a) * u - Math.sin(X.a) * v, X.y + Math.sin(X.a) * u + Math.cos(X.a) * v];
  /* onShoulder(F, thick, a0, contact) — resting on the shoulder at u = contact, tilted a0 (mirrored for f = −1). Grip one
     mitten high on the beam (contact + 140) and one low behind (contact − 150) with gripBeam; keep it behind the head. */
  K.onShoulder = function (F, thick, a0, contact) { const fr = frame(F), sh = K.shoulderOf(F), T = [sh[0] + fr.up[0] * 11 * F.s, sh[1] + fr.up[1] * 11 * F.s];
    const a = F.f > 0 ? a0 : Math.PI - a0, d = [Math.cos(a), Math.sin(a)]; let n = [d[1], -d[0]]; if (n[1] > 0) n = [-n[0], -n[1]];
    return { x: T[0] + n[0] * thick / 2 - d[0] * contact, y: T[1] + n[1] * thick / 2 - d[1] * contact, a, contact }; };
  /* inFront(F, len, at = .5, drop = 70) — carried level in front of the chest (draw in mid(), farFront: true) */
  K.inFront = function (F, len, at = .5, drop = 70) { const sh = K.shoulderOf(F), c = [sh[0] + F.f * 70 * F.s, sh[1] + drop * F.s], a = F.f > 0 ? 0 : Math.PI;
    return { x: c[0] - Math.cos(a) * len * at, y: c[1], a }; };
  /* upright(F, len, foot = 0) — stood on end beside the near foot; grip the near mitten at len·.55 */
  K.upright = function (F, len, foot = 0) { return { x: F.hip[0] + F.f * 80 * F.s, y: F.gy - foot, a: -Math.PI / 2 }; };
  K.gripBeam = function (F, X, uFar, uNear, v = 0) { F.hands = [uFar != null ? K.beamPt(X, uFar, v) : null, uNear != null ? K.beamPt(X, uNear, v) : null]; F.hand = ['fist', 'fist']; return F; };
  K.mixBeam = (A, B, k) => k <= 0 ? A : k >= 1 ? B : { ...B, x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), a: lerp(A.a, B.a, k) };
  K.rotAbout = function (X, pv, th) { const ox = X.x - pv[0], oy = X.y - pv[1]; return { ...X, x: pv[0] + ox * Math.cos(th) - oy * Math.sin(th), y: pv[1] + ox * Math.sin(th) + oy * Math.cos(th), a: X.a + th }; };

  /* ================================================================ world pieces (draw into layer canvases; world px)
     The defaults are the worked example's numbers (a street whose houses stand on y = 1180, road far edge ≈ 1212). */
  /* nightSky(g, x0, y0, x1, y1, o) — the far layer's sky: dark grainy charcoal, pencil hatching (dark low, white-pencil
     high), a darker smudge at the top. o: hatchY [900, 600] (lower edge of each hatch band), smudgeY 200. */
  K.nightSky = function (g, x0, y0, x1, y1, o = {}) { const [h1, h2] = o.hatchY || [900, 600];
    fillG(g, R4(x0, y0, x1, y1), [62, 59, 56], 1.25, 1, 'black');
    hatch(g, R4(x0, y0, x1, h1), -.12, 16, 120, PAT.black[1], .45, 501, { w: 3.4 }); hatch(g, R4(x0, y0, x1, h2), -.3, 18, 90, PAT.chalk[0], .25, 502, { w: 3 });
    smudge(g, R4(x0, y0, x1, o.smudgeY ?? 200), C.black, .3, 30, 503); };
  /* moon(g, x, y, r = 46) — a moon in white pencil with a soft halo (gentle, never a face) */
  K.moon = function (g, MX, MY, r = 46) { smudge(g, HD.arc(MX, MY, r * 150 / 46, r * 150 / 46, 0, TAU, 20), C.chalk, .07, 40, 504);
    fillG(g, HD.arc(MX, MY, r, r, 0, TAU, 4), C.chalk, 1.1, 2, 'chalk'); strokeG(g, HD.arc(MX, MY, r, r, 0, TAU, 4), 505, PAT.light, { w: 3 }); };
  /* hills(g, x0, x1, base = 980, amp = 120, bottom) — a far line of low dark hills */
  K.hills = function (g, x0, x1, base = 980, amp = 120, bottom = 1330) { const top = []; for (let x = x0; x <= x1; x += 30) top.push([x, base - amp * fbm(x / 600 + 4, 2, 3)]);
    fillG(g, [...top, [x1, bottom], [x0, bottom]], [38, 36, 35], 1.1, 2); };
  /* house(g, x0, w, kind, seed, base = 1180) — the lab's street, one house: grey wall (kind 1 scalloped shingles, 0
     clapboard), black roof with white-pencil courses, black windows framed in white pencil, maybe a door */
  K.house = function (g, x0, w, kind, seed, base = 1180) {
    const r = rng(seed), wt = 760 + r() * 70 + (base - 1180), roofT = wt - 170 - r() * 60, x1 = x0 + w;
    const wall = R4(x0, wt, x1, base);
    fillG(g, wall, C.light, .55, 1, 'chalk'); fillG(g, wall, C.mid, .4, kind ? 1 : 0);
    if (kind) { for (let row = 0, y = wt + 26; y < base; y += 30, row++) for (let x = x0 + (row % 2) * 18; x < x1; x += 36) strokeG(g, HD.arc(x + 18, y, 18, 15, Math.PI * .05, Math.PI * .95, 3), seed + row * 50 + x, PAT.black[2], { w: 2.2, ts: 4, te: 6 }); }
    else for (let y = wt + 20; y < base; y += 26) strokeG(g, HD.seg([x0, y + 2], [x1, y - 2], 6), seed + y, PAT.black[2], { w: 2.6 });
    hatch(g, wall, -1.25, 10, 44, PAT.black[1], .45, seed + 1);
    const roof = [[x0 - 30, wt + 4], [x0 + w * .5, roofT], [x1 + 30, wt + 4]];
    fillG(g, roof, C.black, .95, 2); hatch(g, roof, -1.05, 8, 60, PAT.black[2], .5, seed + 2);
    for (let y = roofT + 40; y < wt; y += 34) { const k = (y - roofT) / (wt - roofT); strokeG(g, HD.seg([x0 + w * .5 - k * (w * .5 + 30), y], [x0 + w * .5 + k * (w * .5 + 30), y], 6), seed + 3 + y, PAT.chalk[0], { w: 2.2 }); }
    strokeG(g, HD.seg([x0 - 30, wt + 4], [x1 + 30, wt + 4], 6), seed + 4, PAT.light, { w: 6 });
    const nW = Math.max(1, Math.floor(w / 190));
    for (let i = 0; i < nW; i++) { const cx = x0 + w * (i + .5) / nW, wy = wt + 70, ww = 100, wh = 130, arched = (seed + i) % 3 === 0;
      const pts = arched ? HD.arc(cx, wy + 50, ww / 2, ww / 2, Math.PI, TAU, 4).concat([[cx + ww / 2, wy + wh], [cx - ww / 2, wy + wh]]) : R4(cx - ww / 2, wy, cx + ww / 2, wy + wh);
      fillG(g, pts, C.black, .92, 2); strokeG(g, pts.concat([pts[0]]), seed + 10 + i, PAT.light, { w: 5 });
      strokeG(g, HD.seg([cx, wy + (arched ? 8 : 0)], [cx, wy + wh], 4), seed + 20 + i, PAT.light, { w: 3.4 }); strokeG(g, HD.seg([cx - ww / 2, wy + wh * .5], [cx + ww / 2, wy + wh * .5], 4), seed + 30 + i, PAT.light, { w: 3.4 });
      if ((seed + i) % 2) hatch(g, pts, 1.4, 6, 50, PAT.chalk[0], .35, seed + 40 + i); }
    if (r() > .4) { const dx = x0 + 40 + r() * (w - 180), door = R4(dx, base - 210, dx + 90, base); fillG(g, door, C.mid, .8, 1); hatch(g, door, 1.45, 7, 30, PAT.black[2], .5, seed + 50); strokeG(g, door.concat([door[0]]), seed + 51, PAT.black[2], { w: 4 }); }
  };
  /* farTree(g, x, seed, y0 = 1190) — a bare black tree (trunk + two limbs) standing at y0 */
  K.farTree = function (g, x, seed, y0 = 1190) { const r = rng(seed), h = 520 + r() * 200;
    const limb = (pts, w0, w1, sd) => HD.ribbon(HD.wob(HD.spline(pts, 6), sd, 6, 140), (u, sl) => lerp(w0, w1, Math.pow(u, .7)) * (1 + .1 * (noise(sl / 30, sd) - .5) * 2));
    const ls = [limb([[x, y0], [x + 6, y0 - h * .5], [x - 10, y0 - h * .8], [x + 20, y0 - h]], 40, 10, seed), limb([[x + 4, y0 - h * .55], [x + 60, y0 - h * .75], [x + 120, y0 - h * .85]], 18, 5, seed + 1), limb([[x - 4, y0 - h * .65], [x - 70, y0 - h * .8], [x - 110, y0 - h * .95]], 16, 4, seed + 2)];
    for (const p of ls) { g.fillStyle = rgba(C.black, .95); g.fill(p); } };
  /* street(g, x0, x1, o) — houses and bare trees across the street, then the black ground they stand on (down to
     o.bottom). o: seed 510, base 1180, bottom 1330. */
  K.street = function (g, x0, x1, o = {}) { const r = rng(o.seed ?? 510), base = o.base ?? 1180; let x = x0 - 60, i = 0;
    while (x < x1) { const w = 360 + r() * 200; if (r() > .25) K.house(g, x, w, i % 2, 600 + i * 37, base); else K.farTree(g, x + w * .5, 700 + i, base + 10); if (r() > .5) K.farTree(g, x + w + 40, 800 + i, base + 10); x += w + 90 + r() * 120; i++; }
    fillG(g, R4(x0, base, x1, o.bottom ?? 1330), C.black, 1.1, 2); };
  /* picketFence(g, x0, x1, o) — white-pencil pickets every 34 px with two rails, a dark smudge at their feet.
     o: top 1120, base 1186, rails [1140, 1170], smudge [1150, 1330]. */
  K.picketFence = function (g, x0, x1, o = {}) { const top = o.top ?? 1120, base = o.base ?? 1186, [ra, rb] = o.rails || [1140, 1170], [s0, s1] = o.smudge || [1150, 1330];
    for (let px = x0; px < x1; px += 34) { const y0 = top + 6 * HD.hash(px | 0, 3); fillG(g, [[px, y0 + 8], [px + 7, y0], [px + 14, y0 + 8], [px + 14, base], [px, base]], [190, 184, 176], .9, 1, 'chalk'); }
    strokeG(g, HD.seg([x0, ra], [x1, ra], 8), 520, PAT.light, { w: 5 }); strokeG(g, HD.seg([x0, rb], [x1, rb], 8), 521, PAT.light, { w: 4 });
    smudge(g, R4(x0, s0, x1, s1), C.black, .4, 20, 522); };
  /* groundStrip(g, a, b, R, r) — one stretch [a, b] of the plate's ground: a black garden bed (tufts, white-headed flowers)
     behind a light slab road (pencil hatch, oblique joints, white far edge, dark near edge, curb), darker ground below.
     R = { top (road far edge), near (road near edge), bottom }; r = a shared Pilot.rng for the tufts and flowers. */
  K.groundStrip = function (g, a, b, R, r) {
    const RT = R.top, RN = R.near, PY1 = R.bottom;
    const bed = [[a, RT - 70 - 10 * HD.hash(a | 0, 1)], [b, RT - 70], [b, RT + 4], [a, RT + 4]]; fillG(g, bed, C.black, 1.1, 2);
    for (let x = a + 10; x < b - 10; x += 26 + 30 * r()) tuft(g, x, RT + 2, 40 + r() * 60, 6 + Math.floor(r() * 5), 1.6, 2000 + (x | 0), .5);
    for (let x = a + 30; x < b - 30; x += 50 + 90 * r()) flower(g, x, RT - 40 - r() * 50, 3 + r() * 3, 3000 + (x | 0));
    const road = R4(a, RT, b, RN); fillG(g, road, [176, 170, 162], 1.1, 2, 'chalk'); fillG(g, road, C.mid, .22, 0);
    hatch(g, road, -.05, 7, 70, PAT.light, .5, 18 + (a | 0));
    for (let x = Math.ceil(a / 210) * 210; x < b; x += 210) { const x1 = x - 60; if (x1 < a + 6 || x > b - 6) continue; strokeG(g, HD.seg([x, RT + 2], [x1, RN - 2], 5), 480 + (x | 0), PAT.black[1], { w: 2.6 }); }
    strokeG(g, HD.seg([a, RT + 3], [b, RT + 1], 6), 489 + (a | 0), PAT.light, { w: 4 });
    strokeG(g, HD.seg([a, RN], [b, RN], 6), 490 + (a | 0), PAT.black[2], { w: 5 });
    fillG(g, R4(a, RN, b, RN + 28), C.dark, 1, 1);
    const ground = R4(a, RN + 28, b, PY1); fillG(g, ground, C.mid, .9, 1); fillG(g, ground, C.dark, .45, 0);
    hatch(g, ground, -.07, 9, 90, PAT.black[1], .6, 19 + (a | 0)); hatch(g, ground, -.12, 13, 120, PAT.chalk[0], .45, 190 + (a | 0), { w: 3.4 });
    smudge(g, R4(a, RN + 120, b, PY1), C.black, .3, 30, 24);
  };
  /* field(g, x0, x1, top, bottom, seed = 1300) — open ground to stand, kneel and plant on (a garden, a meadow): a dark
     pencilled soil with white-pencil furrows getting wider toward the viewer, grass tufts and a few white flowers along
     its far edge, a darker smudge low down. */
  K.field = function (g, x0, x1, top, bottom, seed = 1300) {
    const r = rng(seed), soil = R4(x0, top, x1, bottom);
    fillG(g, soil, C.mid, .9, 1); fillG(g, soil, C.dark, .45, 0);
    hatch(g, soil, -.06, 9, 90, PAT.black[1], .6, seed + 1); hatch(g, soil, -.1, 13, 120, PAT.chalk[0], .45, seed + 4, { w: 3.4 });
    for (let k = 0, y = top + 16; y < bottom; k++, y += 14 + k * 7) strokeG(g, HD.seg([x0, y], [x1, y + (r() - .5) * 10], 8), seed + 10 + k, PAT.chalk[1], { w: 2.4 + k * .3 });
    strokeG(g, HD.seg([x0, top + 1], [x1, top - 1], 6), seed + 2, PAT.light, { w: 4 });
    for (let x = x0 + 10; x < x1 - 10; x += 30 + 40 * r()) tuft(g, x, top + 4, 34 + r() * 50, 5 + Math.floor(r() * 4), 1.5, seed + 100 + (x | 0), .5);
    for (let x = x0 + 40; x < x1 - 40; x += 90 + 160 * r()) flower(g, x, top - 18 - r() * 30, 3 + r() * 3, seed + 900 + (x | 0));
    smudge(g, R4(x0, top + 260, x1, bottom), C.black, .35, 30, seed + 3);
  };
  /* gap(g, Gp) — a charcoal-black cut through the ground, ragged walls lit at the rim in white pencil.
     Gp = { e (left lip x), w (width), top (road far edge y), bottom, seed 81 } → fills Gp.lw / Gp.rw (the walls). */
  K.gap = function (g, Gp) {
    const E = Gp.e, G = Gp.w, RT = Gp.top, PY1 = Gp.bottom;
    const lw = [], rw = [], q = rng(Gp.seed ?? 81);
    for (let y = RT - 74; y <= PY1; y += 16) { const d = Math.max(0, y - RT); lw.push([E + (d < 14 ? 0 : 4 + q() * 12 + d * .03), y]); rw.push([E + G - (d < 14 ? 0 : 4 + q() * 12 + d * .03), y]); }
    Gp.lw = lw; Gp.rw = rw;
    fillG(g, [[E - 6, RT - 74], [E + G + 6, RT - 74], [E + G + 6, PY1], [E - 6, PY1]], [36, 34, 33], 1.1, 1);
    const inner = [...lw, ...rw.slice().reverse()];
    fillG(g, inner, [18, 17, 16], 1.2, 2);
    hatch(g, inner, 1.48, 10, 90, PAT.black[2], .7, 31); hatch(g, inner.map(([x, y]) => [x, Math.min(y, RT + 400)]), 1.5, 14, 70, PAT.chalk[0], .18, 32, { w: 3 });
    for (const Wl of [lw, rw]) { const dir = Wl === lw ? 1 : -1;
      for (let i = 0; i < Wl.length - 1; i += 2) { const p = Wl[i], k = clamp(1 - (p[1] - RT) / 700); if (k <= 0) break; strokeG(g, [p, [p[0] + dir * (12 + 10 * q()), p[1] + 10]], 40 + i + (dir > 0 ? 0 : 500), PAT.chalk[0], { w: 2.6 * k + .5 }); }
      strokeG(g, Wl.slice(4, 30), dir > 0 ? 50 : 51, PAT.chalk[1], { w: 3.4 }); }
    strokeG(g, HD.seg([E - 30, RT + 2], [E + 2, RT + 2], 3), 60, PAT.chalk[2], { w: 6 }); strokeG(g, HD.seg([E + G - 2, RT + 2], [E + G + 30, RT + 2], 3), 61, PAT.chalk[2], { w: 6 });
    smudge(g, R4(E + 20, RT + 500, E + G - 20, PY1), C.black, .5, 40, 62);
  };
  /* archDoor(g, A) — a low stone wall with a plain arched door ajar, warm light inside and spilling onto the ground.
     A = { x (centre), base (ground y), cy (centre of the arch curve), ra (opening radius 98), ro (outer 134) } */
  K.archDoor = function (g, A) {
    const GX = A.x, gy = A.base, GAY = A.cy, RA = A.ra, RO = A.ro;
    const wallP = [[GX - 300, gy], [GX - 300, gy - 190], [GX - 240, gy - 240], [GX - 160, GAY - 120], [GX, GAY - 168], [GX + 160, GAY - 120], [GX + 240, gy - 250], [GX + 300, gy - 200], [GX + 300, gy]];
    const wallS = HD.spline(wallP, 6); fillG(g, wallS, [128, 122, 116], 1.1, 1, 'chalk'); fillG(g, wallS, C.mid, .4, 1);
    for (let k = 0; k < 9; k++) { const y = gy - 22 - k * 30; for (let x = GX - 296 + (k % 2) * 28; x < GX + 296; x += 56 + 16 * HD.hash(k, x | 0)) {
      if (Math.abs(x + 26 - GX) < RO + 30) continue; const st = R4(x, y - 26, x + 50, y); strokeG(g, st.concat([st[0]]), 4500 + k * 30 + (x | 0), k % 2 ? PAT.light : PAT.black[2], { w: 2.2, ts: 4, te: 4 }); } }
    hatch(g, wallS, -1.2, 9, 50, PAT.black[1], .4, 4600);
    const arch = R => { const o = [[GX - R, gy]]; for (let i = 0; i <= 24; i++) { const a = Math.PI + Math.PI * i / 24; o.push([GX + Math.cos(a) * R, GAY + Math.sin(a) * R]); } o.push([GX + R, gy]); return o; };
    fillG(g, arch(RO), C.dark, 1.1, 2); for (let i = 1; i < 9; i++) { const a = Math.PI + Math.PI * i / 9; strokeG(g, [[GX + Math.cos(a) * RA, GAY + Math.sin(a) * RA], [GX + Math.cos(a) * RO, GAY + Math.sin(a) * RO]], 4410 + i, PAT.light, { w: 3 }); }
    strokeG(g, HD.arc(GX, GAY, RO, RO, Math.PI, TAU, 5), 4402, PAT.light, { w: 4 });
    const op = arch(RA); { const lg = g.createLinearGradient(0, GAY - RA, 0, gy); lg.addColorStop(0, 'rgb(236,206,140)'); lg.addColorStop(1, 'rgb(252,238,196)'); g.fillStyle = lg; g.fill(HD.pathOf(op)); }
    g.save(); g.clip(HD.pathOf(op)); g.globalAlpha = .45; g.fillStyle = PAT.warm; g.fillRect(GX - RA, GAY - RA, 2 * RA, gy - GAY + RA); g.restore();
    const leaf = [[GX - RA, gy], [GX - RA, GAY], [GX - RA + 60, GAY - 70], [GX - RA + 64, gy + 8]];   // the door leaf, swung half open
    fillG(g, leaf, [70, 56, 46], 1.15, 2); for (let k = 1; k < 3; k++) strokeG(g, HD.seg([GX - RA + k * 20, GAY - 20 * k + 6], [GX - RA + k * 21, gy], 4), 4430 + k, PAT.black[2], { w: 2.4 });
    strokeG(g, leaf.concat([leaf[0]]), 4434, PAT.black[2], { w: 3 });
    g.save(); g.globalCompositeOperation = 'screen'; const sp = g.createRadialGradient(GX, gy + 40, 10, GX, gy + 40, 300); sp.addColorStop(0, 'rgba(160,130,70,.55)'); sp.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sp; g.fillRect(GX - 320, gy - 300, 640, 420); g.restore();
  };
  /* bushes(g, x0, x1, o) — the foreground (parallax 1.3): black bushes with grass and white-headed flowers along the
     bottom. o: y 1700 (their top), bottom 2900, seed 91. trunk(g, x, o) — one big charcoal trunk sweeping up out of
     frame with a lifted white-pencil edge (o.bottom 2900). */
  K.bushes = function (g, x0, x1, o = {}) { const r = rng(o.seed ?? 91), Y = o.y ?? 1700, GY1 = o.bottom ?? 2900, top = []; for (let x = x0; x <= x1; x += 60) top.push([x, Y + 40 * Math.sin(x / 140) + 30 * r()]);
    const fg = HD.spline([...top, [x1, GY1], [x0, GY1]], 8, true); fillG(g, fg, C.black, 1.2, 2);
    for (let x = x0; x < x1; x += 40 + 50 * r()) tuft(g, x, Y + 80 + r() * 40, 140 + r() * 140, 9 + Math.floor(r() * 6), 1.9, 600 + (x | 0), .45);
    for (let x = x0 + 20; x < x1; x += 60 + 80 * r()) flower(g, x, Y - 40 + r() * 120, 5 + r() * 4, 1000 + (x | 0)); };
  K.trunk = function (g, x, o = {}) { const GY1 = o.bottom ?? 2900, limb = (pts, w0, w1, sd) => HD.ribbon(HD.wob(HD.spline(pts, 6), sd, 9, 140), (u, sl) => lerp(w0, w1, Math.pow(u, .7)) * (1 + .1 * (noise(sl / 30, sd) - .5) * 2));
    const ls = [limb([[x, GY1], [x - 12, 1500], [x + 4, 1000], [x - 10, 600], [x - 40, 300], [x - 120, 60], [x - 210, -300]], 210, 70, 31), limb([[x - 8, 760], [x + 50, 560], [x + 130, 380], [x + 260, 240]], 90, 36, 32)];
    for (const p of ls) { g.save(); g.clip(p); g.fillStyle = rgba(C.black, 1); g.fillRect(x - 500, -400, 1000, 3400); g.globalAlpha = .7; g.fillStyle = PAT.black[2]; g.fillRect(x - 500, -400, 1000, 3400); g.restore(); }
    strokeG(g, HD.wob(HD.spline([[x - 104, GY1], [x - 110, 1500], [x - 96, 1000], [x - 104, 700]], 6), 36, 8, 120), 37, PAT.light, { w: 5, ts: 80, te: 200 }); };

  /* ================================================================ light: the one warm colour
     A flashlight is a clean cone: apex at the lens, edges tangent to the pool ellipse, the torch rigid on its axis.
     torchGeo(F, aim) → { hand, d, lens } for a figure holding a torch forward at shoulder height pointed at aim [x, y];
     drawBeam(ctx, lens, c, rx, ry, on) cone + pool (on 0..1); drawTorch(ctx, hand, d, on); lensGlow(ctx, lens, on);
     warmHaze(ctx, c, on) — the light falling on whatever stands in the pool (soft-light + screen). */
  K.torchGeo = function (F, aim) { const sh = K.shoulderOf(F), hand = [sh[0] + F.f * 64 * F.s, sh[1] + 6 * F.s];
    const dx = aim[0] - hand[0], dy = aim[1] - hand[1], l = Math.hypot(dx, dy) || 1, d = [dx / l, dy / l];
    return { hand, d, lens: [hand[0] + d[0] * 34, hand[1] + d[1] * 34] }; };
  K.cone = function (lens, c, rx, ry) {   // lens → tangent points of the pool ellipse → the far arc back (never self-intersecting)
    const lx = (lens[0] - c[0]) / rx, ly = (lens[1] - c[1]) / ry, dd = Math.hypot(lx, ly);
    if (dd <= 1.02) return null;
    const ph = Math.atan2(ly, lx), al = Math.acos(1 / dd), pts = [lens];
    for (let i = 0; i <= 32; i++) { const a = ph + al + (TAU - 2 * al) * i / 32; pts.push([c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry]); }
    return pts;
  };
  K.drawBeam = function (ctx, lens, c, rx, ry, on) {
    if (on <= 0) return; const pts = K.cone(lens, c, rx, ry); if (!pts) return;
    ctx.save();
    const g1 = ctx.createLinearGradient(lens[0], lens[1], c[0], c[1]); g1.addColorStop(0, rgba(C.warm, .62 * on)); g1.addColorStop(.55, rgba(C.warm, .26 * on)); g1.addColorStop(1, rgba(C.warm, .4 * on));
    const p = HD.pathOf(pts); ctx.fillStyle = g1; ctx.fill(p);
    ctx.save(); ctx.clip(p); ctx.globalAlpha = .3 * on; ctx.fillStyle = PAT.black[1]; ctx.fill(p); ctx.restore();
    ctx.beginPath(); ctx.ellipse(c[0], c[1], rx, ry, 0, 0, TAU); const pg = ctx.createRadialGradient(c[0], c[1], 8, c[0], c[1], rx); pg.addColorStop(0, rgba(C.warm, .85 * on)); pg.addColorStop(.75, rgba(C.warm, .55 * on)); pg.addColorStop(1, rgba(C.warm, 0));
    ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(1, ry / rx); ctx.translate(-c[0], -c[1]); const pg2 = ctx.createRadialGradient(c[0], c[1], 8, c[0], c[1], rx); pg2.addColorStop(0, rgba(C.warm, .8 * on)); pg2.addColorStop(.7, rgba(C.warm, .5 * on)); pg2.addColorStop(1, rgba(C.warm, 0));
    ctx.fillStyle = pg2; ctx.beginPath(); ctx.arc(c[0], c[1], rx, 0, TAU); ctx.fill(); ctx.restore();
    ctx.restore();
  };
  K.lensGlow = function (ctx, lens, on) { if (on <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'screen'; const lg = ctx.createRadialGradient(lens[0], lens[1], 2, lens[0], lens[1], 44); lg.addColorStop(0, rgba(C.warm, .9 * on)); lg.addColorStop(1, rgba(C.warm, 0)); ctx.fillStyle = lg; ctx.fillRect(lens[0] - 44, lens[1] - 44, 88, 88); ctx.restore(); };
  K.drawTorch = function (ctx, hand, d, on) { const n = [-d[1], d[0]], P = (u, v) => [hand[0] + d[0] * u + n[0] * v, hand[1] + d[1] * u + n[1] * v];
    const body = [P(-14, -7), P(22, -7), P(24, -10), P(34, -10), P(34, 10), P(24, 10), P(22, 7), P(-14, 7)];
    ctx.fillStyle = 'rgba(40,37,35,1)'; ctx.fill(HD.pathOf(body)); ctx.fillStyle = PAT.chalk[1]; ctx.globalAlpha = .5; ctx.fill(HD.pathOf([P(-12, -6), P(20, -6), P(20, -2), P(-12, -2)])); ctx.globalAlpha = 1;
    ctx.fillStyle = rgba(C.warm, on ? 1 : .3); ctx.fill(HD.pathOf([P(32, -8), P(35, -8), P(35, 8), P(32, 8)])); };
  K.warmHaze = function (ctx, c, on) {
    if (on <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; const lg = ctx.createRadialGradient(c[0], c[1] - 60, 20, c[0], c[1] - 60, 320); lg.addColorStop(0, rgba(C.warm, .7 * on)); lg.addColorStop(1, rgba(C.warm, 0)); ctx.fillStyle = lg; ctx.fillRect(c[0] - 340, c[1] - 400, 680, 680);
    ctx.globalCompositeOperation = 'screen'; const l2 = ctx.createRadialGradient(c[0], c[1], 10, c[0], c[1], 220); l2.addColorStop(0, rgba([120, 100, 60], .45 * on)); l2.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = l2; ctx.fillRect(c[0] - 240, c[1] - 240, 480, 480); ctx.restore();
  };
  /* glow(ctx, cx, cy, hl, pulse = 1, R = 140) — a found / precious thing glowing warm (screen) */
  K.glow = function (ctx, cx, cy, hl, pulse = 1, R = 140) {
    if (hl <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, R);
    g.addColorStop(0, rgba([170, 140, 80], .6 * hl * pulse)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R); ctx.restore();
  };
  /* ghostOutline(ctx, pts, t, al, glow, clip) — "what should be there": a dashed white-pencil outline that crawls, a pale
     fill, a warm halo when glow > 0; clip = [x, y, w, h] reveals it */
  K.ghostOutline = function (ctx, pts, t, al, glow = 0, clip = null) {
    if (al <= 0) return;
    const pth = HD.pathOf(HD.poly(pts, true, 6));
    ctx.save(); ctx.globalAlpha = al; if (clip) { ctx.beginPath(); ctx.rect(...clip); ctx.clip(); }
    ctx.fillStyle = `rgba(232,220,196,${.14 + .14 * glow})`; ctx.fill(pth);
    ctx.setLineDash([16, 10]); ctx.lineDashOffset = -t * 16; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(236,231,222,.95)'; ctx.lineWidth = 5 + 3 * glow; ctx.stroke(pth); ctx.setLineDash([]);
    if (glow > 0) { ctx.globalCompositeOperation = 'screen'; ctx.strokeStyle = rgba(C.warm, .35 * glow); ctx.lineWidth = 16; ctx.stroke(pth); }
    ctx.restore();
  };
  /* puff(ctx, x, y, k) — the "hit": a pale dust puff at (x, y) growing and fading as k goes 0 → 1 (over ≈ 1.2 s) */
  K.puff = function (ctx, x, y, k) { const w2 = 2 * (120 + 140 * k), h2 = 2 * (26 + 30 * k); ctx.save(); ctx.globalAlpha = .55 * (1 - k); ctx.drawImage(TX.puff, x - w2 / 2, y - h2 / 2 - 30 * k, w2, h2); ctx.restore(); };

  /* ================================================================ words, end card */
  /* captions(ctx, t, lines, o) — Story.captions in this style: Gamja Flower 74 px (both one and two lines), warm white
     #efe9df on a soft dark shadow, source line #d8cfc2, y = 420 */
  K.captions = function (ctx, t, lines, o = {}) { Story.captions(ctx, t, lines, { font: K.FONT, srcFont: K.FONT, weight: 400, size: 74, y: 420, color: '#efe9df', srcColor: '#d8cfc2', shadow: 'rgba(10,9,8,.9)', shadowBlur: 16, ...o }); };
  /* endPlate(ctx, t, at) — from at − .2 s the page settles to a calm opaque charcoal plate (hatched, a smudged lighter band,
     one pencil rule under the title) */
  K.endPlate = function (ctx, t, at) { const k = ss(at - .2, at + .35, t); if (k <= 0) return; ctx.save(); ctx.globalAlpha = k; ctx.drawImage(TX.endPlate, 0, 0); ctx.restore(); };
  K.endCard = function (ctx, t, card, at, o = {}) { Story.endCard(ctx, t, card, at, { font: K.FONT, srcFont: K.FONT, color: '#efe9df', srcColor: '#d4cabd', y: 860, titleShadow: 'rgba(10,9,8,.8)', ...o }); };

  /* ================================================================ init */
  /* init() — grain masks (≈ 1 s), figure shadow, dust puff, vignette, grain flicker, end plate. Call first. */
  K.init = function () {
    buildTiles();
    const W = Pilot.W, H = Pilot.H;
    { const c = Pilot.canvas(200, 40), g = c.getContext('2d'); g.filter = 'blur(6px)'; g.fillStyle = rgba(C.black, 1); g.beginPath(); g.ellipse(100, 20, 84, 11, 0, 0, TAU); g.fill(); TX.shad = c; }
    { const c = Pilot.canvas(200, 60), g = c.getContext('2d'); g.filter = 'blur(8px)'; g.fillStyle = rgba(C.light, 1); g.beginPath(); g.ellipse(100, 30, 80, 16, 0, 0, TAU); g.fill(); TX.puff = c; }
    { const c = Pilot.canvas(W, H), g = c.getContext('2d'), rg = g.createRadialGradient(W / 2, H / 2 + 40, 300, W / 2, H / 2 + 40, 1200); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(10,9,8,.38)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); TX.vig = c; }
    TX.flick = [0, 1, 2].map(i => Pilot.speckle(W / 2, H / 2, 60, 40 + i, .6));
    { const c = Pilot.canvas(W, H), g = c.getContext('2d'), cx = W / 2, cy = H / 2; g.lineJoin = g.lineCap = 'round'; g.fillStyle = 'rgb(40,38,36)'; g.fillRect(0, 0, W, H); fillG(g, R4(0, 0, W, H), [40, 38, 36], 1.2, 1); hatch(g, R4(0, 0, W, H), -.15, 16, 120, PAT.black[1], .4, 991, { w: 3 });
      smudge(g, [[cx - 460, cy - 260], [cx + 460, cy - 270], [cx + 470, cy + 300], [cx - 470, cy + 310]], [70, 66, 62], .5, 40, 992); HD.ink(g, HD.wob(HD.seg([cx - 180, cy + 50], [cx + 180, cy + 46], 6), 993, 1.2, 60), { w: 3, ts: 30, te: 40, mn: .3, press: .4, seed: 993, col: 'rgba(214,208,198,.55)' }); TX.endPlate = c; }
  };

  window.Graphite = K;
})();

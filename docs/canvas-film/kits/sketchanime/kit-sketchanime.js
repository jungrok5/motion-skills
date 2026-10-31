/* kit-sketchanime.js — a light anime-studio promotional sketch, as a reusable house style.  Global: window.SketchAnime
   The look: lots of white paper; a thin, confident pencil/brush line in dark grey-brown with pressure (thick on contours
   and the shadow side, hairline on folds), a little sketchy — strokes overshoot or stop short of closing, and boil gently
   on twos; soft pastel marker/watercolour washes laid under the line a hair out of register, with stroke texture, soft
   light and paper left showing; one flat shadow tone; grey ink wash on machines; chrome as white paper with black
   reflections; big soft cumulus dust clouds; speed as a few loose pencil hairlines; titles hand-lettered in pastel with
   a darker wobbly outline. A side-view figure rig (2-bone IK, fixed bones, one bend direction per limb, wrists ≤ 80°)
   draws people in this line with wind-blown hair and clothes.
   Provenance: an anime-studio promotional sketch illustration the owner shared (a countdown drawing: riders on an old
   motorbike in a dust cloud). Feel borrowed, own renderer; no drawing, character or text copied.
   Load after lib.js and story.js:  <script src="lib.js"></script><script src="story.js"></script><script src="kit-sketchanime.js"></script>
   Design space is the portrait frame 1080×1920 (SketchAnime.W × H); in landscape begin() pillarboxes it.
   Pure and deterministic: the only state is init()'s textures and the per-frame stroke counter frame(t) resets. */
(function () {
  const { clamp, lerp, ss, eo, eio, rng, noise, canvas } = Pilot;
  const K = {};
  K.W = 1080; K.H = 1920;
  const TAU = Math.PI * 2;

  // ---------------- palette & type ----------------
  // White paper, grey-brown ink, soft pastel washes. ONE saturated accent (K.ACCENT) — a coral red, like a countdown
  // number lettered in red among pastel letters; nothing else is that hue.
  K.C = {
    paper: '#fdfbf7', ink: '#3b302e', inkSoft: '#75655f', pencil: '#8a7f7c',
    skin: '#fbe2d2', skinSh: '#f0c2ac', blush: '#f29d98', lip: '#c9606a', mouth: '#8f4650', tongue: '#f2a0a4',
    pink: '#f4b8bd', rose: '#eea3a8', salmon: '#f2a594', peach: '#f8cfa9', butter: '#f6d88f', lemon: '#f4e08a',
    sage: '#b8ccb2', mint: '#bcdcca', teal: '#a9cbc9', sky: '#bcd3e8', blue: '#a9b8da', lavender: '#bfbcd8',
    lilac: '#d2c3e0', grey: '#b9b6bf', slate: '#8f93a8', sand: '#e6d2b0', cream: '#f5ead6', brown: '#c4a68e',
    navy: '#7d87ad', chrome: '#f7f7f8', steel: '#9c9aa3', rubber: '#3d3536',
    dust: '#f3e4dc', dustSh: '#e8d3ca', shadow: '#6e6584',
  };
  K.ACCENT = '#ef5a50';
  K.HAND = "'Jua',sans-serif";               // the hand-lettered titles (rounded, chunky)
  K.PEN = "'Gaegu',sans-serif";              // small handwritten words
  K.SANS = "'Noto Sans KR',sans-serif";      // end-card small lines
  // pass to Pilot.run({ fonts: SketchAnime.FONTS }) so every face is loaded before the first frame
  K.FONTS = [`400 80px ${K.HAND}`, `400 40px ${K.PEN}`, `500 30px ${K.SANS}`, `400 28px ${K.SANS}`];

  // ---------------- colour ----------------
  const hexA = c => c[0] === '#' ? Pilot.hex(c) : c.match(/[\d.]+/g).slice(0, 3).map(Number);
  const TONE = new Map();
  // tone(c, k): k > 0 lightens toward paper; k < 0 darkens toward the cool lavender shadow (anime shadow tone, never grey-black).
  K.tone = function (c, k) {
    const key = c + '|' + k; let v = TONE.get(key); if (v) return v;
    const a = hexA(c), b = k > 0 ? [253, 251, 247] : [96, 84, 118];
    v = Pilot.rgb(Pilot.mix(a, b, Math.min(1, Math.abs(k)))); TONE.set(key, v); return v;
  };
  // shadeOf(c): the one flat shadow tone of a wash colour.
  K.shadeOf = c => K.tone(c, -.26);
  K.rgba = (c, a) => { const v = hexA(c); return `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${a})`; };

  // ---------------- boil + seeds ----------------
  let K12 = 0, SEQ = 0, BOIL = 1;
  // frame(t, { boil = 1 }): call FIRST in draw(). Sets the boil frame (on twos: the line re-draws 12×/s) and resets the
  // stroke counter that seeds each stroke's wobble (so the same drawing order gives the same lines every frame).
  K.frame = function (t, o = {}) { K12 = Math.floor(t * 12 + 1e-6); SEQ = 0; BOIL = o.boil ?? 1; };
  // t12(t): time snapped to twos (12 poses/s) — pose figures with it for a hand-drawn cadence (optional).
  K.t12 = t => Math.floor(t * 12 + 1e-6) / 12;
  const h1 = x => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  K.hash = h1;

  // ---------------- the pen: paths as point lists ----------------
  // pen() → a path builder that keeps its points (so one shape feeds the paper knock-out, the wash and the line):
  //   .m(x,y) .l(x,y) .q(cx,cy,x,y) .c(c1x,c1y,c2x,c2y,x,y) .z()  ·  .ell(x,y,rx,ry,rot)  ·  .poly(pts, closed)  ·
  //   .smooth(pts, closed) (Catmull-Rom through the points)  ·  .path() → Path2D  ·  .bbox → [x0,y0,x1,y1]
  const STEP = 5;
  function Pen() { this.subs = []; this.cur = null; this.bb = [1e9, 1e9, -1e9, -1e9]; this._p = null; }
  Pen.prototype._add = function (x, y) { this.cur.push([x, y]); const b = this.bb; if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; };
  Pen.prototype.m = function (x, y) { this.cur = []; this.cur.closed = false; this.subs.push(this.cur); this._add(x, y); this._p = null; return this; };
  Pen.prototype.l = function (x, y) { const p = this.cur[this.cur.length - 1], n = Math.max(1, Math.ceil(Math.hypot(x - p[0], y - p[1]) / (STEP * 2)));
    for (let i = 1; i <= n; i++) this._add(lerp(p[0], x, i / n), lerp(p[1], y, i / n)); return this; };
  Pen.prototype.q = function (cx, cy, x, y) { const p = this.cur[this.cur.length - 1], n = Math.max(3, Math.ceil((Math.hypot(cx - p[0], cy - p[1]) + Math.hypot(x - cx, y - cy)) / STEP));
    for (let i = 1; i <= n; i++) { const u = i / n, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; this._add(a * p[0] + b * cx + c * x, a * p[1] + b * cy + c * y); } return this; };
  Pen.prototype.c = function (ax, ay, bx, by, x, y) { const p = this.cur[this.cur.length - 1], n = Math.max(4, Math.ceil((Math.hypot(ax - p[0], ay - p[1]) + Math.hypot(bx - ax, by - ay) + Math.hypot(x - bx, y - by)) / STEP));
    for (let i = 1; i <= n; i++) { const u = i / n, v = 1 - u; this._add(v * v * v * p[0] + 3 * v * v * u * ax + 3 * v * u * u * bx + u * u * u * x, v * v * v * p[1] + 3 * v * v * u * ay + 3 * v * u * u * by + u * u * u * y); } return this; };
  Pen.prototype.z = function () { this.cur.closed = true; this._p = null; return this; };
  Pen.prototype.ell = function (x, y, rx, ry, rot = 0, a0 = 0, a1 = TAU) {
    const full = Math.abs(a1 - a0) >= TAU - 1e-6, n = Math.max(12, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry) / STEP)), cr = Math.cos(rot), sr = Math.sin(rot);
    this.cur = []; this.subs.push(this.cur);
    for (let i = 0; i < (full ? n : n + 1); i++) { const a = a0 + (a1 - a0) * i / n, px = Math.cos(a) * rx, py = Math.sin(a) * ry; this._add(x + px * cr - py * sr, y + px * sr + py * cr); }
    this.cur.closed = full; this._p = null; return this;
  };
  Pen.prototype.poly = function (pts, closed = false) { this.m(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) this.l(pts[i][0], pts[i][1]); if (closed) this.z(); return this; };
  Pen.prototype.smooth = function (pts, closed = false, tension = .5) {
    const n = pts.length, P = i => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
    this.m(pts[0][0], pts[0][1]);
    for (let i = 0; i < (closed ? n : n - 1); i++) { const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), k = tension / 3;
      this.c(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]); }
    if (closed) { this.cur.pop(); this.z(); } return this;
  };
  Pen.prototype.path = function () { if (this._p) return this._p; const p = new Path2D();
    for (const s of this.subs) { if (!s.length) continue; p.moveTo(s[0][0], s[0][1]); for (let i = 1; i < s.length; i++) p.lineTo(s[i][0], s[i][1]); p.closePath(); }
    return (this._p = p); };
  Object.defineProperty(Pen.prototype, 'bbox', { get() { return this.bb; } });
  K.pen = () => new Pen();
  K.Pen = Pen;
  // curve(pts, closed) → points along a smooth Catmull-Rom curve through pts (for strokes built from a few control points).
  K.curve = (pts, closed = false) => new Pen().smooth(pts, closed).subs[0];

  // ---------------- the line ----------------
  // ink(ctx, penOrPts, o): the pressure line — each stroke a filled ribbon whose width follows a tapered pressure curve
  // with a slow noise, heavier on the side facing o.heavy (a direction; the shadow side) and boiled on twos.
  //  o = { lw = 2.6, col = C.ink, a = .92, press = .45 (pressure noise), boil = 1 (px), over = 0 (px each end of an open
  //        stroke), loop (closed strokes: fraction of the perimeter drawn — > 1 overshoots the join, < 1 leaves it open;
  //        default: 1.05 or .95 by seed), heavy = [.55,.83] (null = even), hv = .8 (how much heavier), c (centre for heavy),
  //        taper = 1 (end taper length ×), min = .12 (thinnest end), sketch = 0 (chance of a second hairline beside part
  //        of the stroke), seed }
  const HEAVY = [.55, .83];
  K.ink = function (ctx, P, o = {}) {
    const subs = P instanceof Pen ? P.subs : (Array.isArray(P[0][0]) ? P : [P]);
    const c = o.c || (P instanceof Pen ? [(P.bb[0] + P.bb[2]) / 2, (P.bb[1] + P.bb[3]) / 2] : null);
    ctx.save(); ctx.fillStyle = o.col || K.C.ink; ctx.globalAlpha *= (o.a ?? .92);
    subs.forEach((s, si) => stroke(ctx, s, o, c, si));
    ctx.restore();
  };
  function stroke(ctx, S, o, c, si = 0) {
    const n0 = S.length; if (n0 < 2) return;
    const seed = o.seed != null ? o.seed + si * 1.13 : (++SEQ) * 7.31, bo = (o.boil ?? 1) * BOIL, lw = o.lw ?? 2.2;
    let pts;
    if (S.closed) {
      const s0 = Math.floor(h1(seed) * n0), fr = o.loop ?? (h1(seed + 3) < .72 ? 1.04 + .05 * h1(seed + 4) : .93 + .04 * h1(seed + 4));
      const m = Math.max(2, Math.round(n0 * fr)); pts = []; for (let i = 0; i <= m; i++) pts.push(S[(s0 + i) % n0]);
    } else pts = S;
    const n = pts.length, X = new Float32Array(n + 2), Y = new Float32Array(n + 2);
    const kb = K12 * 1.71, sd = seed * 3.7;
    for (let i = 0; i < n; i++) { X[i + 1] = pts[i][0] + (noise(i * .21, sd + kb) - .5) * 2 * bo; Y[i + 1] = pts[i][1] + (noise(i * .21 + 50, sd + kb) - .5) * 2 * bo; }
    let N = n;
    const over = S.closed ? 0 : (o.over ?? 0);
    if (over) {   // overshoot: extend both ends along their tangents
      let dx = X[1] - X[2], dy = Y[1] - Y[2], d = Math.hypot(dx, dy) || 1, e = over * (.6 + .8 * h1(seed + 7)); X[0] = X[1] + dx / d * e; Y[0] = Y[1] + dy / d * e;
      dx = X[n] - X[n - 1]; dy = Y[n] - Y[n - 1]; d = Math.hypot(dx, dy) || 1; e = over * (.6 + .8 * h1(seed + 8)); X[n + 1] = X[n] + dx / d * e; Y[n + 1] = Y[n] + dy / d * e; N = n + 2;
    } else { for (let i = 0; i < n; i++) { X[i] = X[i + 1]; Y[i] = Y[i + 1]; } }
    const cum = new Float32Array(N); for (let i = 1; i < N; i++) cum[i] = cum[i - 1] + Math.hypot(X[i] - X[i - 1], Y[i] - Y[i - 1]);
    const L = cum[N - 1]; if (L < .5) return;
    const tl = Math.min(L * .38, (7 * lw + 10) * (o.taper ?? 1)), mn = o.min ?? .12, pr = o.press ?? .45, hv = o.heavy === null ? null : (o.heavy || HEAVY), hk = o.hv ?? .55;
    const Lx = new Float32Array(N), Ly = new Float32Array(N), Rx = new Float32Array(N), Ry = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1); let tx = X[b] - X[a], ty = Y[b] - Y[a]; const tn = Math.hypot(tx, ty) || 1; tx /= tn; ty /= tn;
      const e = Math.min(cum[i], L - cum[i]) / tl, tp = mn + (1 - mn) * Math.sin(Math.min(1, e) * Math.PI / 2);
      let w = lw * tp * (1 + pr * (noise(cum[i] / 70 + seed, 9.5) - .5) * 2);
      if (hv && c) { const qx = X[i] - c[0], qy = Y[i] - c[1], qn = Math.hypot(qx, qy) || 1; w *= 1 + hk * Math.max(0, (qx * hv[0] + qy * hv[1]) / qn); }
      const nx = -ty * w / 2, ny = tx * w / 2; Lx[i] = X[i] + nx; Ly[i] = Y[i] + ny; Rx[i] = X[i] - nx; Ry[i] = Y[i] - ny;
    }
    ctx.beginPath(); ctx.moveTo(Lx[0], Ly[0]); for (let i = 1; i < N; i++) ctx.lineTo(Lx[i], Ly[i]); for (let i = N - 1; i >= 0; i--) ctx.lineTo(Rx[i], Ry[i]); ctx.closePath(); ctx.fill();
    if (o.sketch && h1(seed + 11) < o.sketch && N > 8) {   // a second, lighter hairline beside part of the stroke
      const i0 = Math.floor(N * (.1 + .4 * h1(seed + 12))), i1 = Math.min(N - 1, i0 + Math.floor(N * (.25 + .25 * h1(seed + 13)))), side = h1(seed + 14) < .5 ? -1 : 1, off = (1.6 + lw * .5) * side;
      const sub = []; for (let i = i0; i <= i1; i++) { const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1), tx = X[b] - X[a], ty = Y[b] - Y[a], tn = Math.hypot(tx, ty) || 1; sub.push([X[i] - ty / tn * off, Y[i] + tx / tn * off]); }
      const ga = ctx.globalAlpha; ctx.globalAlpha = ga * .5; stroke(ctx, sub, { ...o, lw: lw * .45, sketch: 0, over: 0, seed: seed + 99 }, null); ctx.globalAlpha = ga;
    }
  }
  // line(ctx, pts, o): one open stroke through the points (smoothed with o.smooth). Defaults: a little overshoot.
  K.line = function (ctx, pts, o = {}) { K.ink(ctx, o.smooth ? K.curve(pts) : densify(pts), { over: 3, heavy: null, ...o }); };
  function densify(pts) { const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (STEP * 2)));
    for (let j = 1; j <= n; j++) out.push([lerp(a[0], b[0], j / n), lerp(a[1], b[1], j / n)]); } return out; }
  K.densify = densify;

  // ---------------- washes ----------------
  // The marker/watercolour pass: a per-colour tileable texture (diagonal marker strokes, a few lighter streaks, softened)
  // filled into the shape a hair out of register. Built lazily per colour (≈ 3 ms each), cached.
  const PAT = new Map(); let patCtx = null;
  function pattern(col) {
    let p = PAT.get(col); if (p) return p;
    const T = 256, big = canvas(T * 3, T * 3), bx = big.getContext('2d'), r = rng(Math.floor(h1(col.length + hexA(col)[0] * .37 + hexA(col)[1] * .11) * 1e6));
    const base = hexA(col);
    bx.fillStyle = Pilot.rgb(base, .9); bx.fillRect(0, 0, T * 3, T * 3);
    const streak = (x, y, w, len, ang, style) => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      bx.save(); bx.translate(T + x + i * T, T + y + j * T); bx.rotate(ang); bx.fillStyle = style; bx.beginPath(); bx.ellipse(0, 0, len / 2, w / 2, 0, 0, TAU); bx.fill(); bx.restore(); } };
    for (let k = 0; k < 14; k++) streak(r() * T, r() * T, 18 + 30 * r(), 160 + 220 * r(), -.55 + .2 * r(), Pilot.rgb(Pilot.mix(base, [96, 84, 118], .06), .06 + .08 * r()));
    for (let k = 0; k < 7; k++) streak(r() * T, r() * T, 8 + 14 * r(), 110 + 160 * r(), -.55 + .2 * r(), `rgba(253,251,247,${.08 + .12 * r()})`);
    for (let k = 0; k < 5; k++) streak(r() * T, r() * T, 30 + 40 * r(), 160 + 160 * r(), -.55 + .3 * r(), Pilot.rgb(base, .18 + .1 * r()));
    const c = canvas(T, T), x = c.getContext('2d'); x.filter = 'blur(3px)'; x.drawImage(big, -T, -T); x.filter = 'none';
    if (!patCtx) patCtx = canvas(2, 2).getContext('2d');
    p = patCtx.createPattern(c, 'repeat'); PAT.set(col, p); return p;
  }
  K.pattern = pattern;
  // knock(ctx, pen): fill the exact silhouette with paper — what is behind disappears (draw it first for every opaque shape).
  K.knock = function (ctx, pen) { ctx.fillStyle = K.C.paper; ctx.fill(pen.path()); };
  // wash(ctx, pen, col, o): the colour pass. o = { a = .9 (strength), mis = 1 (misregistration ×, ~3 px), off: [dx,dy]
  //   (overrides), knock = true, light = .35 (paper-light from the top-left: soft gradient), lightAng, edge = .22 (marker
  //   pooling along the edge, inside), gaps = 0 (n paper streaks left in the wash), gapAng = -.55, gapW = 5, seed }
  K.wash = function (ctx, pen, col, o = {}) {
    const path = pen.path(), seed = o.seed ?? (SEQ + 1) * 3.3 + hexA(col)[0] * .1, mis = o.mis ?? 1, bb = pen.bb;
    if (o.knock !== false) K.knock(ctx, pen);
    const off = o.off || [(h1(seed) - .5) * 6.5 * mis, (h1(seed + 1) - .5) * 5 * mis];
    ctx.save(); ctx.translate(off[0], off[1]);
    const p = pattern(col); p.setTransform(new DOMMatrix([1, 0, 0, 1, h1(seed + 2) * 256, h1(seed + 3) * 256]));
    ctx.globalAlpha *= (o.a ?? .9); ctx.fillStyle = p; ctx.fill(path);
    const lt = o.light ?? .35;
    if (lt > 0 || (o.edge ?? .22) > 0 || o.gaps) {
      ctx.clip(path);
      if (lt > 0) { const an = o.lightAng ?? -2.3, cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2, R = Math.max(bb[2] - bb[0], bb[3] - bb[1]) * .6 + 1;
        const g = ctx.createLinearGradient(cx + Math.cos(an) * R, cy + Math.sin(an) * R, cx, cy);
        g.addColorStop(0, `rgba(253,251,247,${lt})`); g.addColorStop(1, 'rgba(253,251,247,0)'); ctx.fillStyle = g; ctx.fill(path); }
      const ed = o.edge ?? .22;
      if (ed > 0) { ctx.strokeStyle = K.rgba(K.tone(col, -.12), ed); ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.stroke(path); }
      if (o.gaps) gapStrokes(ctx, bb, o.gaps, o.gapAng ?? -.55, o.gapW ?? 5, seed);
    }
    ctx.restore();
  };
  function gapStrokes(ctx, bb, n, ang, w, seed) {
    ctx.fillStyle = 'rgba(253,251,247,.88)';
    const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2, R = Math.hypot(bb[2] - bb[0], bb[3] - bb[1]) / 2;
    for (let i = 0; i < n; i++) {
      const u = (i + .5) / n - .5 + (h1(seed + i * 5) - .5) * .25, len = R * (.6 + .8 * h1(seed + i * 5 + 1)), ww = w * (.5 + h1(seed + i * 5 + 2));
      ctx.save(); ctx.translate(cx - Math.sin(ang) * u * R * 1.6, cy + Math.cos(ang) * u * R * 1.6); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.quadraticCurveTo(0, -ww, len / 2, 0); ctx.quadraticCurveTo(0, ww * .4, -len / 2, 0); ctx.fill(); ctx.restore();
    }
  }
  // shade(ctx, clipPen, shadePen, col, o): the ONE flat shadow tone of col, laid inside clipPen where shadePen covers it
  // (o.a = .75, o.tone = the shadow colour, default shadeOf(col)).
  K.shade = function (ctx, clipPen, shadePen, col, o = {}) {
    ctx.save(); ctx.clip(clipPen.path()); ctx.globalAlpha *= (o.a ?? .75);
    const p = pattern(o.tone || K.shadeOf(col)); p.setTransform(new DOMMatrix([1, 0, 0, 1, 37, 91])); ctx.fillStyle = p; ctx.fill(shadePen.path()); ctx.restore();
  };
  // greyWash(ctx, pen, o): a grey ink wash (machines, shadows on metal), multiplied. o = { a = .55, col = steel, clip }
  K.greyWash = function (ctx, pen, o = {}) {
    ctx.save(); if (o.clip) ctx.clip(o.clip.path()); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha *= (o.a ?? .55);
    const p = pattern(o.col || K.C.steel); p.setTransform(new DOMMatrix([1, 0, 0, 1, 11, 53])); ctx.fillStyle = p; ctx.fill(pen.path()); ctx.restore();
  };
  // shape(ctx, pen, col, o): knock + wash + ink in one call. o.wash → wash options, o.line → ink options (lw …), col null = no wash.
  K.shape = function (ctx, pen, col, o = {}) {
    if (col) K.wash(ctx, pen, col, o.wash || {}); else if (o.knock !== false) K.knock(ctx, pen);
    if (o.line !== false) K.ink(ctx, pen, o.line || {});
  };

  // tube(ctx, spine, widths, col, o) → { pen, left, right }: a limb / sleeve / pipe along a polyline (smoothed) whose
  // width runs through `widths` (one per spine point). Knock + wash (col) + the two sides as separate open strokes
  // (overshooting a little); o.caps: [start, end] round caps drawn; o.line (ink options); o.wash; o.noLine.
  K.tube = function (ctx, spine, widths, col, o = {}) {
    const S = o.joint != null && spine.length === 3 ? jointSpine(spine, o.joint) : spine.length > 2 ? K.curve(spine) : densify(spine), n = S.length;
    const cum = [0]; for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]));
    const Lt = cum[n - 1] || 1, segL = []; let acc = 0; segL.push(0);
    for (let i = 1; i < spine.length; i++) { acc += Math.hypot(spine[i][0] - spine[i - 1][0], spine[i][1] - spine[i - 1][1]); segL.push(acc); }
    const wAt = u => { const d = u * acc; let j = 1; while (j < segL.length - 1 && d > segL[j]) j++; const k = clamp((d - segL[j - 1]) / ((segL[j] - segL[j - 1]) || 1)); return lerp(widths[j - 1], widths[j], k); };
    const left = [], right = [];
    for (let i = 0; i < n; i++) { const a = S[Math.max(0, i - 1)], b = S[Math.min(n - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const tn = Math.hypot(tx, ty) || 1; tx /= tn; ty /= tn;
      const w = wAt(cum[i] / Lt) / 2; left.push([S[i][0] - ty * w, S[i][1] + tx * w]); right.push([S[i][0] + ty * w, S[i][1] - tx * w]); }
    const pen = new Pen(); pen.m(left[0][0], left[0][1]); for (let i = 1; i < n; i++) pen.l(left[i][0], left[i][1]);
    const caps = o.caps || [false, false];
    // a round cap from p to q around c, bulging away from `away` (the tube's inside)
    const capPts = (p, q, c, away) => { const r = Math.hypot(p[0] - q[0], p[1] - q[1]) / 2, a0 = Math.atan2(p[1] - c[1], p[0] - c[0]);
      const am = a0 + Math.PI / 2, sg = (Math.cos(am) * (away[0] - c[0]) + Math.sin(am) * (away[1] - c[1])) > 0 ? -1 : 1, out = [];
      for (let k = 1; k < 10; k++) { const a = a0 + Math.PI * k / 10 * sg; out.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); } return out; };
    let endCap = null, startCap = null;
    if (caps[1]) { endCap = capPts(left[n - 1], right[n - 1], S[n - 1], S[Math.max(0, n - 3)]); for (const p of endCap) pen.l(p[0], p[1]); }
    for (let i = n - 1; i >= 0; i--) pen.l(right[i][0], right[i][1]);
    if (caps[0]) { startCap = capPts(right[0], left[0], S[0], S[Math.min(n - 1, 2)]); for (const p of startCap) pen.l(p[0], p[1]); }
    pen.z();
    if (col) K.wash(ctx, pen, col, o.wash || {}); else if (o.knock !== false) K.knock(ctx, pen);
    if (!o.noLine) { const lo = { lw: 2.4, over: 2, heavy: null, ...(o.line || {}) };
      K.ink(ctx, caps[1] ? left.concat(endCap, [right[n - 1]]) : left, lo);
      K.ink(ctx, caps[0] ? right.slice().reverse().concat(startCap) : right, { ...lo, lw: (lo.lw) * (o.rightK ?? 1.25) }); }
    return { pen, left, right, spine: S };
  };

  // a limb spine: straight bones with a short rounded joint (radius r) — knees and elbows stay crisp
  function jointSpine([p0, p1, p2], r) {
    const d1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1, d2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 1, r1 = Math.min(r, d1 * .4), r2 = Math.min(r, d2 * .4);
    const a = [p1[0] - (p1[0] - p0[0]) / d1 * r1, p1[1] - (p1[1] - p0[1]) / d1 * r1], b = [p1[0] + (p2[0] - p1[0]) / d2 * r2, p1[1] + (p2[1] - p1[1]) / d2 * r2];
    const out = densify([p0, a]); for (let i = 1; i <= 6; i++) { const u = i / 6, v = 1 - u; out.push([v * v * a[0] + 2 * u * v * p1[0] + u * u * b[0], v * v * a[1] + 2 * u * v * p1[1] + u * u * b[1]]); }
    const tail = densify([b, p2]); tail.shift(); return out.concat(tail);
  }
  // chromeTube(ctx, spine, w, o): a chrome pipe / bar (exhaust, fork, handlebar): white paper body, a broken black
  // reflection band along one side and a grey one along the other, inked edges. o = { lw = 2, band = .26, grey = .5, seed }
  K.chromeTube = function (ctx, spine, w, o = {}) {
    const T = K.tube(ctx, spine, spine.map(() => w), null, { line: { lw: o.lw ?? 2.1, over: 1.5 }, caps: o.caps });
    const S = T.spine, n = S.length, seed = o.seed ?? SEQ * 1.7;
    ctx.save(); ctx.clip(T.pen.path());
    const band = (off, wk, col, a, brk) => {
      let run = [];
      const flush = () => { if (run.length > 2) K.ink(ctx, run, { lw: w * wk, col, a, heavy: null, press: .5, boil: .6, taper: .7 }); run = []; };
      for (let i = 0; i < n; i++) { const a0 = S[Math.max(0, i - 1)], b0 = S[Math.min(n - 1, i + 1)], tx = b0[0] - a0[0], ty = b0[1] - a0[1], tn = Math.hypot(tx, ty) || 1;
        if (brk && noise(i * .09, seed) < .32) { flush(); continue; }
        run.push([S[i][0] - ty / tn * w * off, S[i][1] + tx / tn * w * off]); }
      flush();
    };
    band(-.18, o.band ?? .26, K.C.ink, .9, true);
    band(.28, .18, K.C.steel, o.grey ?? .5, false);
    ctx.restore();
    return T;
  };
  // coil(ctx, a, b, r, turns, o): a coil spring between a and b (radius r) — the suspension.
  K.coil = function (ctx, a, b, r, turns = 7, o = {}) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, pts = [];
    for (let i = 0; i <= turns * 14; i++) { const u = i / (turns * 14), ph = u * turns * TAU; pts.push([a[0] + ux * L * u - uy * Math.sin(ph) * r, a[1] + uy * L * u + ux * Math.sin(ph) * r]); }
    K.ink(ctx, pts, { lw: o.lw ?? 2.2, heavy: null, press: .3, over: 0 });
  };

  // wheel(ctx, x, y, r, ang, o): a spoked wheel (tyre, chrome rim, spokes, hub), rotated by ang (rad). o = { blur 0..1
  //  (spokes melt into a grey disc + streaks at speed), spokes = 28, tyre = .16 (×r), hub = .2 (×r), drum, seed }
  K.wheel = function (ctx, x, y, r, ang, o = {}) {
    const blur = clamp(o.blur || 0), tw = r * (o.tyre ?? .16), hub = r * (o.hub ?? .2), rim = r - tw, seed = o.seed ?? 5;
    const outer = new Pen().ell(x, y, r, r), inner = new Pen().ell(x, y, rim, rim);
    K.knock(ctx, outer);
    // tyre: rubber wash with broken highlight arcs
    ctx.save(); ctx.fillStyle = K.C.rubber; ctx.globalAlpha = .92; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.arc(x, y, rim, 0, TAU, true); ctx.fill('evenodd'); ctx.restore();
    for (let k = 0; k < 4; k++) { const a0 = -2.4 + k * 1.55 + (h1(seed + k) - .5) * .5 + (blur > .3 ? 0 : ang * .0), len = .5 + .5 * h1(seed + k + 9), rr = r - tw * (.35 + .25 * h1(seed + k + 3));
      const pts = []; for (let i = 0; i <= 16; i++) { const a = a0 + len * i / 16; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
      K.ink(ctx, pts, { col: '#e9e6ea', lw: tw * .22, heavy: null, a: .75, boil: .5 }); }
    // rim + spokes
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, rim, 0, TAU); ctx.clip();
    ctx.fillStyle = K.C.paper; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    if (blur > .02) { const g = ctx.createRadialGradient(x, y, hub, x, y, rim); g.addColorStop(0, `rgba(150,146,158,${.35 * blur})`); g.addColorStop(1, `rgba(120,116,128,${.5 * blur})`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rim, 0, TAU); ctx.fill(); }
    const ns = o.spokes ?? 28; ctx.strokeStyle = K.rgba(K.C.ink, .78 * (1 - .75 * blur)); ctx.lineWidth = 1.3;
    for (let i = 0; i < ns; i++) { const a = ang + i * TAU / ns, b = a + (i % 2 ? .5 : -.5); ctx.beginPath(); ctx.moveTo(x + Math.cos(b) * hub * .8, y + Math.sin(b) * hub * .8); ctx.lineTo(x + Math.cos(a) * rim, y + Math.sin(a) * rim); ctx.stroke(); }
    if (blur > .05) for (let k = 0; k < 7; k++) { const rr = hub + (rim - hub) * (.2 + .75 * h1(seed + k * 3)), a0 = h1(seed + k * 3 + 1) * TAU + ang * .15, len = (.6 + 1.4 * h1(seed + k * 3 + 2)) * blur;
      const pts = []; for (let i = 0; i <= 14; i++) { const a = a0 + len * i / 14; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
      K.ink(ctx, pts, { lw: 2.2, heavy: null, a: .55 * blur, boil: .4 }); }
    ctx.restore();
    // chrome rim band: a broken dark reflection
    const rp = []; for (let i = 0; i <= 40; i++) { const a = -2.9 + 2.2 * i / 40; rp.push([x + Math.cos(a) * (rim - 4), y + Math.sin(a) * (rim - 4)]); }
    K.ink(ctx, rp, { lw: 3.2, heavy: null, a: .8 });
    K.ink(ctx, inner, { lw: 1.6, heavy: null, loop: 1.02 });
    K.ink(ctx, outer, { lw: 2.6, loop: 1.03 });
    // hub (drum) with a reflection
    const hp = new Pen().ell(x, y, hub, hub); K.knock(ctx, hp); K.greyWash(ctx, new Pen().ell(x + hub * .2, y + hub * .2, hub * .8, hub * .8), { a: .5, clip: hp });
    K.ink(ctx, hp, { lw: 2, loop: 1.04 });
    K.ink(ctx, new Pen().ell(x, y, hub * .32, hub * .32), { lw: 1.6, heavy: null });
    const hr = []; for (let i = 0; i <= 10; i++) { const a = -2.6 + 1.3 * i / 10; hr.push([x + Math.cos(a) * hub * .66, y + Math.sin(a) * hub * .66]); }
    K.ink(ctx, hr, { lw: 3, heavy: null, a: .8 });
  };

  // ---------------- motion helpers (pure functions of t) ----------------
  // spring(x): 0 → 1 with a small overshoot (≈ 6 %); pop-ins, letters, a bounce settling.
  K.spring = x => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-6 * x) * Math.cos(9 * x);
  // sway(t, hz = .8, amp = 1, ph = 0): a smooth sine sway.
  K.sway = (t, hz = .8, amp = 1, ph = 0) => amp * Math.sin(t * hz * TAU + ph);
  // flutter(t, seed, hz = 2.4): −1..1, an irregular flap (three detuned sines) — cloth and hair in wind.
  K.flutter = (t, seed = 0, hz = 2.4) => (Math.sin(t * hz * TAU + seed) * .55 + Math.sin(t * hz * 1.73 * TAU + seed * 2.1) * .3 + Math.sin(t * hz * 2.91 * TAU + seed * 3.7) * .15);
  // bump(t, at, amp = 1, dur = .5): a single damped kick after `at` (a pothole, a landing): 0 before, decays to 0.
  K.bump = (t, at, amp = 1, dur = .5) => { const u = (t - at) / dur; return u <= 0 || u > 3 ? 0 : amp * Math.sin(u * Math.PI * 1.6) * Math.exp(-2.4 * u); };
  // strand(ctx, root, ang, len, w, t, o): a wind-blown lock of hair / a ribbon end — a tapered wedge from `root` along
  //   `ang` (rad), whose spine waves (a travelling wave, stronger toward the tip). o = { col, wind = 1, hz = 3, amp = .16
  //   (×len), curl = 0 (bend, rad over the length), seed, lw = 1.8, wash (false = line only), tipW = .05 }
  K.strand = function (ctx, root, ang, len, w, t, o = {}) {
    const seed = o.seed ?? 1, wind = o.wind ?? 1, hz = o.hz ?? 3, amp = (o.amp ?? .16) * len * wind, N = 9, sp = [];
    let a = ang, p = root.slice();
    for (let i = 0; i <= N; i++) { const u = i / N; sp.push(p.slice());
      const wave = Math.sin(t * hz * TAU - u * 4.2 + seed) * amp * u * 1.2 / N * 4;
      a += (o.curl ?? 0) / N; p = [p[0] + Math.cos(a) * len / N - Math.sin(a) * wave * .25, p[1] + Math.sin(a) * len / N + Math.cos(a) * wave * .25]; }
    const ws = sp.map((_, i) => w * Math.max(o.tipW ?? .05, Math.pow(1 - i / N, .9)));
    return K.tube(ctx, sp, ws, o.wash === false ? null : (o.col || K.C.pink), { line: { lw: o.lw ?? 1.8, over: 0 }, rightK: 1.1, knock: o.wash !== false, wash: o.washO || { light: .2, edge: .1, mis: .5 } });
  };
  // ribbon(ctx, root, ang, len, w0, w1, t, col, o): a tie / scarf / shirt tail flapping in wind — like strand but a flat
  //   band of widths w0 → w1 that twists (its width pulses as it turns). o = { wind = 1, hz = 3.2, amp = .22, seed, lw }
  K.ribbon = function (ctx, root, ang, len, w0, w1, t, col, o = {}) {
    const seed = o.seed ?? 2, wind = o.wind ?? 1, N = 10, sp = [], ws = []; let p = root.slice();
    for (let i = 0; i <= N; i++) { const u = i / N; sp.push(p.slice());
      ws.push(lerp(w0, w1, u) * (.55 + .45 * Math.abs(Math.cos(t * (o.hz ?? 3.2) * TAU * .5 - u * 2.6 + seed))));
      const a = ang + Math.sin(t * (o.hz ?? 3.2) * TAU - u * 3.4 + seed) * (o.amp ?? .22) * wind * (.3 + u) + (o.droop ?? 0) * (1 - wind) * u;
      p = [p[0] + Math.cos(a) * len / N, p[1] + Math.sin(a) * len / N]; }
    return K.tube(ctx, sp, ws, col, { line: { lw: o.lw ?? 2, over: 0 }, caps: [false, true] });
  };

  // ---------------- dust / cumulus ----------------
  // cloudMass(ctx, lobes, o): draws a union of round lobes as ONE soft cumulus: a pale wash (knocks out what is behind),
  //  a shadow tone on the lower lobes, the OUTER outline only (arcs inside the mass are hidden), plus the upper arcs of
  //  lobes flagged `inner` as light interior lines. lobes: [{ x, y, r, sq = 1 (y squash), inner, a (outline 0..1) }]
  //  Lobes with layer > 0 are front puffs of the same mass: only their top arcs are inked (the scalloped lines inside a
  //  cumulus); they are not repainted.
  //  o = { col = C.dust, sh = C.dustSh, lw = 2.2, a (outline alpha), shade = .6 (how much of the lower part is shaded),
  //        line = true, wash, ground (y: flatten the bottom at this row), seed }
  K.cloudMass = function (ctx, lobes, o = {}) {
    lobes = lobes.filter(l => l.r > 1.5); if (!lobes.length) return;
    if (!o._layer && lobes.some(l => l.layer)) {   // layered: each layer is its own outlined mass, back to front
      const ls = [...new Set(lobes.map(l => l.layer || 0))].sort((a, b) => a - b);
      for (const k of ls) K.cloudMass(ctx, lobes.filter(l => (l.layer || 0) === k), { ...o, _layer: 1, topOnly: k > 0, seed: (o.seed ?? 4) + k });
      return;
    }
    const pen = new Pen(); for (const l of lobes) pen.ell(l.x, l.y, l.r, l.r * (l.sq || 1));
    let clipG = null;
    if (o.ground != null) { ctx.save(); clipG = new Path2D(); clipG.rect(-4000, -4000, 9000, 4000 + o.ground); ctx.clip(clipG); }
    if (!o.topOnly) K.wash(ctx, pen, o.col || K.C.dust, { a: .92, edge: 0, light: .45, mis: .5, seed: o.seed ?? 4, ...(o.wash || {}) });
    if ((o.shade ?? .6) > 0 && !o.topOnly) {   // shadow under each puff + the lower part of the mass, clipped to the union
      const bb = pen.bb, sh = o.shade ?? .6, scol = o.sh || K.C.dustSh;
      ctx.save(); ctx.clip(pen.path());
      const g = ctx.createLinearGradient(0, bb[1] + (bb[3] - bb[1]) * .35, 0, bb[3]); g.addColorStop(0, K.rgba(scol, 0)); g.addColorStop(1, K.rgba(scol, .85 * sh));
      ctx.fillStyle = g; ctx.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]);
      ctx.lineCap = 'round';
      const midY = (bb[1] + bb[3]) / 2;
      for (const l of lobes) { if (l.r < 18 || l.y < midY - l.r * .2) continue; ctx.strokeStyle = K.rgba(scol, .4 * sh * (l.a ?? 1)); ctx.lineWidth = l.r * .3;
        ctx.beginPath(); ctx.ellipse(l.x - l.r * .05, l.y - l.r * .02, l.r * .84, l.r * (l.sq || 1) * .84, 0, Math.PI * .12, Math.PI * .8); ctx.stroke(); }
      ctx.restore();
    }
    if (o.line !== false) {
      const inside = (px, py, skip) => { for (let j = 0; j < lobes.length; j++) { if (j === skip) continue; const q = lobes[j], dx = px - q.x, dy = (py - q.y) / (q.sq || 1); if (dx * dx + dy * dy < q.r * q.r * .97) return true; } return false; };
      for (let i = 0; i < lobes.length; i++) {
        const l = lobes[i], M = Math.max(14, Math.ceil(TAU * l.r / 6)), al = (o.a ?? 1) * (l.a ?? 1); if (al < .03) continue;
        let run = []; const runs = [], inner = [];
        let innerRun = [];
        for (let k = 0; k <= M; k++) { const a = -Math.PI / 2 + TAU * k / M, px = l.x + Math.cos(a) * l.r, py = l.y + Math.sin(a) * l.r * (l.sq || 1);
          const below = o.ground != null && py > o.ground - 2;
          const hid = below || inside(px, py, i) || (o.topOnly && Math.sin(a) > -.3);   // front puffs: only their tops (the cumulus lines inside the mass)
          if (!hid) run.push([px, py]); else if (run.length) { runs.push(run); run = []; }
          if (l.inner && hid && !below && Math.sin(a) < -.15) innerRun.push([px, py]); else if (innerRun.length) { inner.push(innerRun); innerRun = []; } }
        if (run.length) runs.push(run); if (innerRun.length) inner.push(innerRun);
        for (const rn of runs) if (rn.length > 2) K.ink(ctx, rn, { lw: o.lw ?? 2.2, a: .9 * al, over: 1.5, heavy: [.4, .9], c: [l.x, l.y - l.r] });
        for (const rn of inner) if (rn.length > 5) K.ink(ctx, rn.slice(1, -1), { lw: (o.lw ?? 2.2) * .6, a: .55 * al, over: 0, heavy: null });
      }
    }
    if (clipG) ctx.restore();
  };
  // cloud(ctx, x, y, rx, ry, t, o) → lobes: a billowing cumulus of about rx × ry centred at (x, y): a ring of lobes on the
  //  top and sides, a flatter base, interior lobes with inner lines; each lobe breathes. o = { seed, n = 14, billow = .06,
  //  draw = true, …cloudMass options }
  K.cloudLobes = function (x, y, rx, ry, t, o = {}) {
    const r = rng(o.seed ?? 7), n = o.n ?? 12, L = [], bil = o.billow ?? .06, br = (i, ph) => 1 + bil * Math.sin(t * 1.3 + i * 1.9 + ph);
    for (let i = 0; i < n; i++) { const a = Math.PI * 1.02 + Math.PI * .96 * (i + .5) / n + (r() - .5) * .2, rr = Math.min(rx, ry) * (.36 + .2 * r());
      L.push({ x: x + Math.cos(a) * (rx - rr * .8), y: y + Math.sin(a) * (ry - rr * .8) + rr * .15, r: rr * br(i, 0) }); }
    for (let i = 0; i < 5; i++) { const rr = rx * (.3 + .06 * r()); L.push({ x: x + (i - 2) * rx * .36, y: y + ry * .5 - rr * .42, r: rr * br(i, 2), sq: .5 }); }   // a flat, gently wavy base
    L.push({ x, y: y + ry * .1, r: rx * .62, sq: ry / rx * 1.1 });   // the body (fills the middle of the ring)
    // the front layer: a few puffs low in the middle — their outlines are the cumulus lines inside the mass
    const m = o.front ?? Math.max(1, Math.round(n * .2));
    for (let i = 0; i < m; i++) { const rr = Math.min(rx, ry) * (.24 + .22 * r()), u = (i + .5) / m - .5;
      L.push({ x: x + u * rx * 1.2 + (r() - .5) * rx * .45, y: y + ry * (.05 + .4 * r()) - rr * .3, r: rr * br(i, 4), layer: 1, a: .8 }); }
    return L;
  };
  K.cloud = function (ctx, x, y, rx, ry, t, o = {}) { const L = K.cloudLobes(x, y, rx, ry, t, o); if (o.draw !== false) K.cloudMass(ctx, L, o); return L; };
  // dustLobes(t, src, o) → lobes: a dust trail kicked up behind a moving thing — a puff every o.dt s from src(te) → [x, y]
  //  (where it was at time te), each puff growing (r0 → r1 over its life), drifting (o.drift [vx, vy] px/s) and sinking back
  //  to nothing at the end. Feed the lobes (plus any others) to cloudMass so the whole trail is ONE outlined mass.
  //  o = { dt = .07, life = 2.6, r0 = 22, r1 = 120, drift = [60, -18], from = 0, until = 1e9, spread = 20, seed }
  K.dustLobes = function (t, src, o = {}) {
    const dt = o.dt ?? .07, life = o.life ?? 2.6, r0 = o.r0 ?? 22, r1 = o.r1 ?? 120, dr = o.drift || [60, -18], out = [], sp = o.spread ?? 20;
    const k0 = Math.max(Math.ceil((o.from ?? 0) / dt), Math.ceil((t - life) / dt)), k1 = Math.floor(Math.min(t, o.until ?? 1e9) / dt);
    for (let k = k0; k <= k1; k++) { const te = k * dt, a = t - te; if (a < 0 || a > life) continue; const p = src(te); if (!p) continue;
      const u = a / life, gr = Math.pow(u, .4), str = o.strength ? o.strength(te) : 1; if (str <= .01) continue;
      const hs = o.seed ?? 3, front = h1(k * .7 + hs) < (o.front ?? .4), rise = .5 + h1(k * 3.3 + hs);
      const r = (r0 + (r1 - r0) * gr) * (1 - ss(.7, 1, u)) * str * (front ? .62 : 1) * (.8 + .4 * h1(k * 5.1 + hs));
      out.push({ x: p[0] + dr[0] * a * (1 - u * .4) + (h1(k * 1.3 + hs) - .5) * sp, y: p[1] + dr[1] * a * rise - r * (front ? .2 : .5) + (h1(k * 2.1 + hs) - .5) * sp * .4, r, layer: front ? 1 : 0, a: 1 - ss(.75, 1, u) });
    }
    return out;
  };

  // ---------------- speed ----------------
  // speed(ctx, t, o): loose pencil speed strokes — sparse long hairlines streaming past (not manga wedges). o = { x0, x1,
  //   y0, y1 (the band), n = 14, v = 2400 (px/s, + = streaming toward +x), len = [120, 420], lw = 1.4, a = .55, seed, ang = 0 }
  K.speed = function (ctx, t, o = {}) {
    const n = o.n ?? 14, x0 = o.x0 ?? 0, x1 = o.x1 ?? K.W, y0 = o.y0 ?? 0, y1 = o.y1 ?? K.H, v = o.v ?? 2400, span = x1 - x0, seed = o.seed ?? 21;
    const [l0, l1] = o.len || [120, 420];
    for (let i = 0; i < n; i++) { const len = l0 + (l1 - l0) * h1(seed + i * 3.1), y = y0 + (y1 - y0) * h1(seed + i * 5.7), sp = v * (.7 + .6 * h1(seed + i * 1.9));
      const tot = span + len * 2; let x = ((t * sp + h1(seed + i * 7.3) * tot) % tot + tot) % tot - len; x = v >= 0 ? x0 + x : x1 - x - len;
      const a = (o.a ?? .55) * (.5 + .5 * h1(seed + i * 4.4)), ang = o.ang ?? 0, wv = 3 * (h1(seed + i) - .5);
      const pts = []; for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push([x + len * u * Math.cos(ang), y + len * u * Math.sin(ang) + Math.sin(u * Math.PI) * wv]); }
      K.ink(ctx, pts, { lw: (o.lw ?? 1.4) * (.7 + .6 * h1(seed + i * 2.2)), a, heavy: null, taper: 2.5, min: .05, boil: .5 });
    }
  };
  // whoosh(ctx, pts, o): 2–3 parallel tapered hairlines following a path behind a moving thing (a swing, a lunge). o = { n = 3, gap = 9, lw = 1.6, a = .7 }
  K.whoosh = function (ctx, pts, o = {}) {
    const n = o.n ?? 3, S = K.curve(pts);
    for (let k = 0; k < n; k++) { const off = (k - (n - 1) / 2) * (o.gap ?? 9), sub = [];
      const cut = Math.floor(S.length * (.1 + .25 * h1(k + 3)));
      for (let i = cut; i < S.length; i++) { const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], tn = Math.hypot(tx, ty) || 1; sub.push([S[i][0] - ty / tn * off, S[i][1] + tx / tn * off]); }
      K.ink(ctx, sub, { lw: (o.lw ?? 1.6) * (k === 1 ? 1.2 : .8), a: o.a ?? .7, heavy: null, taper: 3, min: .04 }); }
  };
  // spinArcs(ctx, x, y, r, t, o): short curved motion marks round a spinning wheel / a turning thing. o = { n = 3, len = .7 (rad), a = .6, dir = 1 }
  K.spinArcs = function (ctx, x, y, r, t, o = {}) {
    const n = o.n ?? 3, d = o.dir ?? 1;
    for (let k = 0; k < n; k++) { const a0 = (o.a0 ?? -2.4) + k * (o.step ?? .9) + .15 * Math.sin(t * 9 + k), rr = r * (1.08 + .06 * k), len = o.len ?? .7, pts = [];
      for (let i = 0; i <= 12; i++) { const a = a0 + d * len * i / 12; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
      K.ink(ctx, pts, { lw: 1.8, a: o.a ?? .6, heavy: null, taper: 2, min: .05 }); }
  };

  // ---------------- small marks ----------------
  // blush(ctx, x, y, r, a = 1): soft pink cheek + three short hatch strokes.
  K.blush = function (ctx, x, y, r, a = 1) {
    if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, K.rgba(K.C.blush, .55)); g.addColorStop(1, K.rgba(K.C.blush, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * .62, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 3; i++) K.ink(ctx, [[x - r * .45 + i * r * .32, y + r * .22], [x - r * .2 + i * r * .32, y - r * .2]], { lw: 1.3, col: K.C.lip, a: .7, heavy: null, over: 0 });
    ctx.restore();
  };
  // sweat(ctx, x, y, s = 1, ang = 0): a sweat drop (pale blue wash, inked), tip up.
  K.sweat = function (ctx, x, y, s = 1, ang = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
    const p = new Pen().m(0, -14).q(9, 2, 6, 8).q(0, 14, -6, 8).q(-9, 2, 0, -14).z();
    K.shape(ctx, p, K.C.sky, { wash: { light: .5, mis: .3 }, line: { lw: 1.8, loop: 1.02 } }); ctx.restore();
  };
  // pop(ctx, x, y, r, k, o): little burst ticks (a surprise, a bump) — n short strokes flying out as k goes 0 → 1.
  K.pop = function (ctx, x, y, r, k, o = {}) {
    if (k <= 0 || k >= 1) return; const n = o.n ?? 5, a0 = o.a0 ?? -Math.PI / 2, spread = o.spread ?? 1.6;
    for (let i = 0; i < n; i++) { const a = a0 + (i / (n - 1) - .5) * spread * 2, r0 = r * (1 + .5 * eo(k)), len = r * .5 * (1 - k * .7);
      K.ink(ctx, [[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * (r0 + len), y + Math.sin(a) * (r0 + len)]], { lw: o.lw ?? 2.4, a: 1 - k * k, heavy: null, over: 0 }); }
  };

  // ---------------- the figure rig (side view, 2-bone IK) ----------------
  // Units at s = 1 (px). A figure faces screen-right in its own frame; dir = −1 mirrors it (faces left). Placed by the
  // pelvis (F.x, F.y). Bones never change length; knees bend forward, elbows back/down, one way only.
  K.BODY = { torso: 146, neck: 9, headR: 33, arm1: 84, arm2: 78, hand: 24, leg1: 110, leg2: 104, ankle: 11, foot: 40,
    armW: [26, 21, 17], legW: [40, 30, 21] };
  K.LOOK = { skin: K.C.skin, hair: K.C.pink, hairStyle: 'bob', top: K.C.sage, sleeve: 'short', topStyle: 'shirt', bottom: K.C.lavender,
    skirt: false, shoe: K.C.brown, tie: null, clip: null, glasses: false, collar: K.C.cream, sock: null, ahoge: false };
  // ik2(a, b, l1, l2, bend) → { j, end, ok }: two-bone IK in 2-D. The joint goes to the side `bend` (+1 / −1) of the a→b
  //   line (in the figure's facing-right frame: elbows +1, knees −1). The end is clamped to reach (ok = false then).
  K.ik2 = function (a, b, l1, l2, bend) {
    const dx = b[0] - a[0], dy = b[1] - a[1], D = Math.hypot(dx, dy) || 1e-6, Dc = clamp(D, Math.abs(l1 - l2) + 1, (l1 + l2) * .9995), ux = dx / D, uy = dy / D;
    const x = (l1 * l1 - l2 * l2 + Dc * Dc) / (2 * Dc), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
    return { j: [a[0] + ux * x - uy * h * bend, a[1] + uy * x + ux * h * bend], end: [a[0] + ux * Dc, a[1] + uy * Dc], ok: D <= (l1 + l2) * .9995 };
  };
  const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const angD = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
  // walkFeet(x0, x, step = 90, lift = 16) → { feet: [near, far] x, lift: [px, px] }: a planted walk (each foot stays put
  //   while it carries the weight; the other swings past it). x = the pelvis, walking toward +x or −x.
  K.walkFeet = function (x0, x, step = 90, lift = 16) {
    const dir = x >= x0 ? 1 : -1, D = Math.abs(x - x0), n = Math.floor(D / step), p = D / step - n, H0 = x0 + dir * n * step;
    const st = H0 + dir * step / 2, sw = H0 + dir * lerp(-step / 2, 1.5 * step, eio(p)), lf = lift * Math.sin(Math.PI * p);
    return n % 2 ? { feet: [sw, st], lift: [lf, 0] } : { feet: [st, sw], lift: [0, lf] };
  };
  // standY(ground, s): the pelvis row of a figure standing on `ground`.
  K.standY = (ground, s = 1) => ground - (K.BODY.ankle + (K.BODY.leg1 + K.BODY.leg2) * .985) * s;
  // pose(F) → G. F = {
  //   x, y   pelvis (world px);  s = 1;  dir = 1 (faces right) | −1 (faces left);  lean (rad, + = forward);  bob (px up)
  //   look   overrides LOOK: { skin, hair, hairStyle 'bob'|'messy'|'spiky'|'long', top, topStyle 'shirt'|'hoodie'|'cardigan',
  //          sleeve 'short'|'long'|'rolled', bottom, skirt (bool), shoe, tie (colour), clip (colour), glasses, ahoge }
  //   head   { tilt (rad, + = chin up), turn (0 = 3/4, 1 = toward the camera) }   neck (rad: head pitch relative to torso)
  //   face   { eyes 'open'|'wide'|'laugh'|'smug'|'closed'|'squint'|'panic', mouth 'smile'|'laugh'|'grit'|'smug'|'o'|'flat'|'yell',
  //            brows 'calm'|'up'|'worry'|'angry', blush 0..1, sweat 0..n, look [dx, dy] (pupils), blink 0..1 }
  //   hands  [near, far]: null (hangs relaxed) or { at: [x, y] world GRIP point, ang (world rad, the hand's direction; clamped
  //          ≤ 80° off the forearm), kind 'grip'|'open'|'flat'|'fist'|'hold' }
  //   legs   [near, far]: null (standing straight under the hip on F.ground) or { at: [x, y] world ankle, ang (foot, world rad),
  //          lift } ; ground (world y) for standing / walking;  kneel 0..1 (near knee down; needs ground)
  //   wind   0..1 (head-on wind: hair and clothes stream back);  t (time, for wind);  seed
  // }  G = { F, L, s, dir, toW(p) (frame → world), hip, sh: [near, far], neck, head (frame), arms[i] { sh, el, wr, grip, ang, ok }, legs[i] { hip, kn, an, ok } }
  K.pose = function (F) {
    const B = K.BODY, s = F.s || 1, dir = F.dir || 1, L = Object.assign({}, K.LOOK, F.look || {}), lean = F.lean || 0;
    const toF = p => [(p[0] - F.x) * dir / s, (p[1] - F.y) / s + (F.bob || 0) / s];
    const toW = p => [F.x + p[0] * s * dir, F.y + (p[1] * s) - (F.bob || 0)];
    const angF = a => dir > 0 ? a : Math.PI - a, angW = a => dir > 0 ? a : Math.PI - a;
    const T = (a, b) => rot([a, b], lean);
    const th = B.torso;
    const sh = [T(-2, -th + 20), T(12, -th + 13)], neck = T(3, -th - 2), hips = [T(2, -4), T(10, -8)];
    const pitch = lean * .55 + (F.neck || 0);
    const ha = pitch - ((F.head && F.head.tilt) || 0);
    const nt = add(neck, rot([3, -B.neck], ha)), head = add(nt, rot([4, -B.headR * .82], ha));
    const arms = [0, 1].map(i => {
      const hd = F.hands && F.hands[i], a = sh[i], l1 = B.arm1, l2 = B.arm2;
      if (!hd) { const tg = add(a, rot([10 + 6 * i, l1 + l2 - 14], lean * .4)), r = K.ik2(a, tg, l1, l2, 1); const ang = Math.atan2(r.end[1] - r.j[1], r.end[0] - r.j[0]);
        return { sh: a, el: r.j, wr: r.end, grip: add(r.end, rot([B.hand * .5, 0], ang)), ang, fa: ang, ok: true, kind: 'relax' }; }
      const g = toF(hd.at); let ang = hd.ang != null ? angF(hd.ang) : null, r, fa;
      for (let it = 0; it < 3; it++) {   // the grip is AT the target; the wrist sits a half hand behind it along the hand's direction
        const ha2 = ang == null ? Math.atan2(g[1] - a[1], g[0] - a[0]) : ang, wr = add(g, rot([-B.hand * .5, 0], ha2));
        r = K.ik2(a, wr, l1, l2, (hd.bend ?? 1)); fa = Math.atan2(r.end[1] - r.j[1], r.end[0] - r.j[0]);
        const want = ang == null ? fa : ang, d = clamp(angD(want, fa), -1.39, 1.39); ang = fa + d;
      }
      const grip = add(r.end, rot([B.hand * .5, 0], ang));
      return { sh: a, el: r.j, wr: r.end, grip, ang, fa, ok: r.ok && Math.hypot(grip[0] - g[0], grip[1] - g[1]) < 6, kind: hd.kind || 'grip' };
    });
    let legs;
    const gY = F.ground != null ? toF([0, F.ground])[1] : null;
    legs = [0, 1].map(i => {
      const hd = F.legs && F.legs[i], hp = hips[i], l1 = B.leg1, l2 = B.leg2;
      let an, fang = 0;
      if (hd) { an = toF(hd.at); fang = hd.ang != null ? angF(hd.ang) : 0; if (hd.lift) an = [an[0], an[1] - hd.lift / s]; }
      else an = [hp[0] + (i ? 10 : -2), (gY != null ? gY : hp[1] + l1 + l2) - B.ankle];
      if (i === 0 && F.kneel && gY != null) {   // near knee to the floor, shin back along it
        const k = F.kneel, kn = [hp[0] + 6, gY - 8], ank = [kn[0] - l2 * .97, gY - B.ankle];
        an = [lerp(an[0], ank[0], k), lerp(an[1], ank[1], k)]; fang = lerp(fang, .35, k);
      }
      const r = K.ik2(hp, an, l1, l2, -1);
      return { hip: hp, kn: r.j, an: r.end, ang: fang, ok: r.ok };
    });
    return { F, L, s, dir, toW, toF, angW, hip: [0, 0], sh, neck, nt, head, ha, lean, arms, legs, hips, t: F.t || 0, wind: F.wind || 0 };
  };

  // frame transform: draw in the figure's facing-right units
  const enter = (ctx, G) => { ctx.save(); ctx.translate(G.F.x, G.F.y - (G.F.bob || 0)); ctx.scale(G.s * G.dir, G.s); };
  // figure(ctx, G, o): draw the figure. o.parts (default all, in this order): 'farArm', 'farLeg', 'hairBack', 'body', 'nearLeg',
  //   'head', 'nearArm'. Split the call to slip things in between (a bike between the far and near legs: parts
  //   ['farArm','farLeg'] → bike → the rest). o.held = [near, far]: fn(ctx, G, arm) draws what that hand holds BEFORE the
  //   hand (in the figure frame — use G.toW / world drawing after leaving it, or draw in frame coords).
  K.PARTS = ['farArm', 'farLeg', 'hairBack', 'body', 'nearLeg', 'head', 'nearArm'];
  K.figure = function (ctx, G, o = {}) {
    const parts = o.parts || K.PARTS;
    for (const p of parts) {
      enter(ctx, G);
      if (p === 'farArm') arm(ctx, G, 1, o);
      else if (p === 'farLeg') leg(ctx, G, 1);
      else if (p === 'hairBack') hairBack(ctx, G);
      else if (p === 'body') body(ctx, G);
      else if (p === 'nearLeg') leg(ctx, G, 0);
      else if (p === 'head') headDraw(ctx, G);
      else if (p === 'nearArm') arm(ctx, G, 0, o);
      ctx.restore();
    }
    return G;
  };
  function lineK(G) { return 1 / Math.sqrt(G.s); }    // keep strokes about the same on screen at any figure scale
  // locks(pts) → Pen: a closed outline through points [x, y, sharp]: sharp points are corners the line passes through
  //   (lock tips), the others are curve controls between them — hair silhouettes, flames, torn edges.
  K.locks = function (pts) {
    const n = pts.length, pen = new Pen(), s0 = pts.findIndex(p => p[2]); if (s0 < 0) return pen.smooth(pts, true);
    const P = i => pts[((i % n) + n) % n];
    pen.m(P(s0)[0], P(s0)[1]);
    for (let k = 1; k <= n; k++) { const p = P(s0 + k), pv = P(s0 + k - 1), nx = P(s0 + k + 1);
      if (p[2]) { if (pv[2]) pen.l(p[0], p[1]); }
      else { const e = nx[2] ? nx : [(p[0] + nx[0]) / 2, (p[1] + nx[1]) / 2]; pen.q(p[0], p[1], e[0], e[1]); } }
    return pen.z();
  };
  function arm(ctx, G, i, o) {
    const B = K.BODY, L = G.L, A = G.arms[i], far = i === 1, lk = lineK(G), t = G.t, wd = G.wind;
    const skinCol = far ? K.tone(L.skin, -.06) : L.skin, topCol = far ? K.tone(L.top, -.1) : L.top;
    K.tube(ctx, [A.sh, A.el, A.wr], B.armW, skinCol, { line: { lw: 1.9 * lk }, wash: { light: .25 }, joint: 12 });
    // the sleeve: short (flares and flaps in the wind), rolled (to below the elbow, a cuff roll) or long (to the wrist)
    const l1 = B.arm1, l2 = B.arm2, frac = L.sleeve === 'long' ? .93 : L.sleeve === 'rolled' ? .6 : .34, cut = frac * (l1 + l2);
    const at = d => d <= l1 ? add(A.sh, [(A.el[0] - A.sh[0]) * d / l1, (A.el[1] - A.sh[1]) * d / l1]) : add(A.el, [(A.wr[0] - A.el[0]) * (d - l1) / l2, (A.wr[1] - A.el[1]) * (d - l1) / l2]);
    const sp = cut <= l1 ? [at(4), at(cut * .5), at(cut)] : [at(4), A.el, at(cut)], jt = cut <= l1 ? undefined : 13;
    const fl = K.flutter(t, (G.F.seed || 1) + i * 3, 3.4), flare = L.sleeve === 'short' ? 9 + wd * (5 + 4 * fl) : L.sleeve === 'rolled' ? 8 : 4;
    const sw = [B.armW[0] + 10, (cut <= l1 ? B.armW[0] + 7 : B.armW[1] + 8), (cut <= l1 ? B.armW[0] : B.armW[2]) + flare];
    const T = K.tube(ctx, sp, sw, topCol, { line: { lw: 2.1 * lk }, caps: [true, false], wash: { mis: .3 }, joint: jt });
    const e = T.spine.length - 1;
    K.ink(ctx, [T.left[e], T.right[e]], { lw: 1.8 * lk, over: 1.5, heavy: null });
    if (L.sleeve === 'rolled') { const d = [T.spine[e][0] - T.spine[e - 4][0], T.spine[e][1] - T.spine[e - 4][1]], dn = Math.hypot(d[0], d[1]) || 1, k = 6 / dn;
      K.ink(ctx, [[T.left[e][0] - d[0] * k, T.left[e][1] - d[1] * k], [T.right[e][0] - d[0] * k, T.right[e][1] - d[1] * k]], { lw: 1.1 * lk, heavy: null, over: 1 }); }
    // one fold across the sleeve
    const m = Math.floor(e * .55); K.ink(ctx, [lerpP(T.left[m], T.right[m], .15), lerpP(T.left[m + 2] || T.left[m], T.right[m + 2] || T.right[m], .55)], { lw: 1 * lk, heavy: null, over: 0, a: .6 });
    if (o.held && o.held[i]) { ctx.save(); o.held[i](ctx, G, A); ctx.restore(); }
    hand(ctx, A.wr, A.ang, A.kind, skinCol, lk);
  }
  const lerpP = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  // hand(ctx, wrist, ang, kind, skin, lk): drawn along ang from the wrist; the grip point is half a hand (12 px) out.
  function hand(ctx, w, ang, kind, skin, lk = 1) {
    ctx.save(); ctx.translate(w[0], w[1]); ctx.rotate(ang);
    const up = Math.cos(ang) >= -.2 ? 1 : -1;   // keep the thumb on the upper side
    ctx.scale(1, up);
    const sh = (p, lw = 1.8) => K.shape(ctx, p, skin, { wash: { light: .3, mis: .35, edge: .12 }, line: { lw: lw * lk, loop: 1.03 } });
    if (kind === 'grip' || kind === 'fist') {   // a fist round a bar at (12, 0): knuckles forward, thumb wrapped over the top
      sh(new Pen().m(-1, -7).q(6, -10, 12, -10).q(20, -10, 22, -3).q(23, 5, 18, 9).q(10, 12, 2, 9).q(-2, 6, -1, -7).z());
      K.ink(ctx, [[19, -4], [21, 1], [18, 6]], { lw: 1 * lk, heavy: null, over: 0, a: .75 });
      K.ink(ctx, [[14, -1], [17, 0]], { lw: .9 * lk, heavy: null, over: 0, a: .6 });
      K.ink(ctx, [[2, -8], [8, -12], [15, -9]], { lw: 1.4 * lk, heavy: null, over: 0, smooth: true });
    } else if (kind === 'flat' || kind === 'hold') {   // fingers together, palm pushing (holding a thing up / against a thing)
      sh(new Pen().m(-1, -6).q(8, -8, 16, -7).q(25, -6, 28, -3).q(30, 0, 27, 2).q(18, 4, 10, 5).q(3, 7, -1, 6).z());
      K.ink(ctx, [[12, -2], [25, -2]], { lw: .9 * lk, heavy: null, over: 0, a: .6 });
      K.ink(ctx, [[3, -6], [9, -11], [14, -9]], { lw: 1.4 * lk, heavy: null, over: 0, smooth: true });
    } else if (kind === 'open') {   // spread fingers (a wave, panic)
      sh(new Pen().m(-1, -7).q(6, -9, 12, -8).l(24, -15).q(27, -13, 16, -5).l(28, -5).q(29, -1, 17, -1).l(26, 5).q(25, 8, 15, 4).q(8, 10, 0, 8).q(-2, 0, -1, -7).z(), 1.7);
    } else {   // relax: a loose curl
      sh(new Pen().m(-1, -7).q(8, -9, 16, -6).q(23, -2, 20, 4).q(16, 9, 8, 8).q(2, 8, -1, 7).z());
      K.ink(ctx, [[11, 1], [17, 2]], { lw: .9 * lk, heavy: null, over: 0, a: .6 });
    }
    ctx.restore();
  }
  K.hand = hand;
  function leg(ctx, G, i) {
    const B = K.BODY, L = G.L, g = G.legs[i], far = i === 1, lk = lineK(G);
    const col = far ? K.tone(L.bottom, -.1) : L.bottom;
    if (L.skirt) { const sc = L.sock || L.skin; K.tube(ctx, [g.hip, g.kn, g.an], [B.legW[0] - 8, B.legW[1] - 8, B.legW[2] - 3], far ? K.tone(sc, -.06) : sc, { line: { lw: 1.9 * lk }, joint: 16 }); }
    else K.tube(ctx, [g.hip, g.kn, g.an], [B.legW[0] + 2, B.legW[1], B.legW[2] + 1], col, { line: { lw: 2.2 * lk }, wash: { gaps: far ? 0 : 1, gapW: 3 }, joint: 18 });
    const ka = Math.atan2(g.an[1] - g.kn[1], g.an[0] - g.kn[0]), ta = Math.atan2(g.kn[1] - g.hip[1], g.kn[0] - g.hip[0]);
    if (!L.skirt) {   // folds behind the knee and at the hip
      K.ink(ctx, [add(g.kn, rot([-3, -12], ka)), add(g.kn, rot([9, -6], ka))], { lw: 1 * lk, heavy: null, over: 0, a: .6 });
      K.ink(ctx, [add(g.hip, rot([30, 8], ta)), add(g.hip, rot([48, 12], ta))], { lw: .9 * lk, heavy: null, over: 0, a: .5 });
    }
    // shoe: heel at the ankle, toe forward along the foot angle
    ctx.save(); ctx.translate(g.an[0], g.an[1]); ctx.rotate(g.ang || 0);
    const f = B.foot, p = new Pen().m(-10, -9).q(-1, -12, 9, -8).q(f * .72, -6, f, 1).q(f + 2, 8, f - 5, 9).l(-9, 9).q(-14, 1, -10, -9).z();
    K.shape(ctx, p, far ? K.tone(L.shoe, -.1) : L.shoe, { wash: { light: .3, mis: .4 }, line: { lw: 2 * lk, loop: 1.03 } });
    K.ink(ctx, [[-9, 7], [f - 4, 7]], { lw: 1.2 * lk, heavy: null, over: 0, a: .7 });
    ctx.restore();
  }
  function body(ctx, G) {
    const B = K.BODY, L = G.L, th = B.torso, t = G.t, wd = G.wind, lk = lineK(G), lean = G.lean, sd = (G.F.seed || 1);
    const T = (a, b) => rot([a, b], lean);
    const fl = K.flutter(t, sd, 2.6), puff = wd * (10 + 6 * fl);
    // the pelvis / seat in the bottom colour (under the shirt hem)
    const pv = new Pen().smooth([T(-22, -10), T(-24, 12), T(-6, 22), T(18, 18), T(22, -4), T(0, -16)], true);
    K.shape(ctx, pv, L.skirt ? L.bottom : L.bottom, { line: { lw: 2 * lk } });
    // the torso: shoulders, chest, waist; the back puffed out by the wind
    const p = new Pen().smooth([T(-19, 8), T(-21 - puff * .5, -36), T(-24 - puff, -84), T(-22 - puff * .5, -th + 24), T(-13, -th + 4), T(-5, -th - 4), T(8, -th - 4),
      T(16, -th + 4), T(23, -th + 30), T(22, -th + 64), T(16, -46), T(19, -12), T(17, 10)], true, .45);
    const top = L.top;
    K.wash(ctx, p, top, { light: .32 });
    K.shade(ctx, p, new Pen().smooth([T(-34 - puff, -th), T(-14 - puff * .5, -th + 30), T(-8, -70), T(-6, 0), T(-12, 22), T(-40 - puff, 22)], true), top, { a: .6 });
    K.ink(ctx, p, { lw: 2.3 * lk, heavy: [-.4, .9] });
    // wind folds from the shoulder blade sweeping back, a fold under the chest
    for (let k = 0; k < 2; k++) { const y = -th + 40 + k * 34 + 4 * fl;
      K.ink(ctx, [T(2, y - 6), T(-10 - puff * .3, y + 2), T(-22 - puff * .9, y + 4 + 6 * k)], { lw: 1 * lk, heavy: null, a: .7, over: 2, smooth: true }); }
    K.ink(ctx, [T(17, -th + 70), T(8, -th + 78), T(1, -th + 76)], { lw: 1 * lk, heavy: null, a: .65, over: 1, smooth: true });
    if (L.topStyle === 'hoodie') { const hp = new Pen().smooth([T(-20, -th + 8), T(-28 - puff * .4, -th - 8), T(-14, -th - 16), T(2, -th - 6), T(-6, -th + 10)], true);
      K.shape(ctx, hp, K.tone(top, -.05), { line: { lw: 1.9 * lk } });
      for (const dx of [11, 15]) K.ink(ctx, [T(dx - 2, -th + 4), T(dx + 2, -th + 30 + (dx - 11) * 2 + 6 * wd * fl)], { lw: 1.2 * lk, heavy: null, a: .8 }); }
    else if (L.topStyle === 'cardigan') { K.ink(ctx, [T(7, -th - 2), T(14, -th + 50), T(16, -6)], { lw: 1.3 * lk, heavy: null, smooth: true });
      for (let k = 0; k < 3; k++) K.ink(ctx, new Pen().ell(...T(18, -th + 58 + k * 28), 2.2, 2.2), { lw: 1.2 * lk, heavy: null }); }
    K.ink(ctx, [T(-20, 7), T(0, 11), T(18, 9)], { lw: 1.3 * lk, heavy: null, a: .75, smooth: true });
    if (L.tie) { const kn = T(9, -th + 9), wind = clamp(wd), ang = lerp(Math.PI / 2 + lean * .9 - .15, Math.PI + .3, wind);
      K.ribbon(ctx, kn, ang, 62, 8, 13, t, L.tie, { wind, seed: sd + 1, amp: .4, lw: 1.7 * lk });
      K.shape(ctx, new Pen().ell(kn[0], kn[1], 5, 4.5), L.tie, { line: { lw: 1.4 * lk } }); }
  }
  // ---------------- head (3/4, facing right; head frame: cranium centre at 0, 0; r = 33) ----------------
  function hairPts(G, front) {
    const L = G.L, t = G.t, wd = G.wind, st = L.hairStyle, sd = (G.F.seed || 1) * 2.3;
    const f = k => K.flutter(t, sd + k * 1.7, 3.1), w = wd;
    if (st === 'bob' || st === 'long') {
      if (front) { const lf = w * 7;
        return [[-37, 6, 1], [-46, -22], [-30, -46], [-12 - w * 9, -54 + 2 * f(5) * w, 1], [-2, -50], [18, -52], [38, -34], [42 - lf * .6, -4 - lf, 1], [33, -14], [30 - lf * .5, 4 - lf * .8 + 2 * f(1) * w, 1], [25, -12],
          [19 - lf * .4, 0 - lf * .6, 1], [14, -13], [8 - lf * .3, -5 - lf * .4, 1], [4, -14], [1, -10, 1], [2, 8], [-1 - w * 3, 32 - w * 7 + 2 * f(2) * w, 1], [-7, 14], [-12, 4, 1], [-20, 2], [-26, 14 - w * 4, 1], [-30, 0]]; }
      const tr = w * (14 + 6 * f(3)), len = st === 'long' ? 34 : 0;
      return [[18, -42, 1], [-26, -52], [-46, -34], [-56 - tr * 1.1, -26 + 3 * f(6) * w, 1], [-48, -14], [-60 - tr * 1.2, -2 + 3 * f(7) * w, 1], [-50, 8 + len * .4], [-56 - tr * 1.3, 26 + len - w * 10 + 4 * f(4) * w, 1], [-44 - tr * .6, 28 + len],
        [-40 - tr * .7, 40 + len - w * 10, 1], [-30, 30 + len * .6], [-20 - tr * .3, 40 + len - w * 6, 1], [-8, 24], [6, 4, 1], [10, -20]];
    }
    if (st === 'messy') {
      if (front) { const lf = w * 8;
        return [[-38, 4, 1], [-44, -20], [-40 - w * 10, -40 + f(1) * 3 * w, 1], [-26, -42], [-22 - w * 12, -58 + f(2) * 3 * w, 1], [-6, -48], [4 - w * 10, -60 + f(3) * 3 * w, 1], [16, -46],
          [30 - w * 8, -48 + f(4) * 2 * w, 1], [32, -34], [40 - lf * .7, -12 - lf, 1], [30, -20], [24 - lf * .5, -2 - lf * .8, 1], [20, -14], [11 - lf * .3, -4 - lf * .6, 1], [6, -16], [0, -12, 1],
          [-1, 8], [-5 - w * 3, 20 - w * 4, 1], [-10, 6], [-17, -2, 1], [-28, -2]]; }
      const tr = w * (14 + 6 * f(5));
      return [[16, -42, 1], [-20, -54], [-44 - tr * .5, -34 + f(6) * 2 * w, 1], [-40, -22], [-54 - tr, -12 + f(7) * 3 * w, 1], [-42, -4], [-50 - tr * .9, 10 + f(8) * 3 * w, 1], [-38, 12], [-40 - tr * .6, 26 - w * 6, 1],
        [-26, 18], [-20, 26, 1], [-8, 14], [6, 2, 1], [10, -20]];
    }
    // spiky: short, swept back hard
    if (front) { const lf = w * 6;
      return [[-36, 4, 1], [-40, -14], [-48 - w * 12, -30 + f(1) * 3 * w, 1], [-30, -36], [-34 - w * 12, -54 + f(2) * 3 * w, 1], [-14, -46], [-12 - w * 12, -64 + f(3) * 3 * w, 1], [4, -50],
        [8 - w * 10, -64 + f(4) * 2 * w, 1], [20, -46], [26 - w * 6, -54, 1], [32, -36], [38 - lf, -22 - lf, 1], [28, -22], [22 - lf * .5, -12 - lf * .6, 1], [14, -20], [4, -14, 1],
        [0, 2], [-2, 12, 1], [-10, 2], [-17, -2, 1], [-28, -2]]; }
    const tr = w * (10 + 5 * f(5));
    return [[14, -40, 1], [-20, -50], [-46 - tr, -30 + f(6) * 2 * w, 1], [-40, -18], [-50 - tr, -6, 1], [-38, 4], [-44 - tr * .6, 16, 1], [-30, 14], [-18, 22, 1], [-6, 10], [6, 0, 1], [10, -20]];
  }
  function hairBack(ctx, G) {
    const L = G.L, lk = lineK(G), wd = G.wind, t = G.t, sd = (G.F.seed || 1) * 1.7;
    ctx.translate(G.head[0], G.head[1]); ctx.rotate(G.ha); ctx.scale(1.07, 1.07);
    const p = K.locks(hairPts(G, false));
    K.shape(ctx, p, K.tone(L.hair, -.06), { wash: { gaps: 1, gapW: 3, light: .25 }, line: { lw: 2 * lk, loop: 1.02 } });
    if (wd > .2) K.strand(ctx, [-44 - wd * 10, 0], Math.PI + .15, 16 + 14 * wd, 5, t, { col: L.hair, wind: wd, seed: sd, lw: 1.1 * lk, curl: .25, wash: false });
  }
  function headDraw(ctx, G) {
    const B = K.BODY, L = G.L, F = G.F, lk = lineK(G), fc = F.face || {};
    K.tube(ctx, [add(G.neck, rot([0, 8], G.lean)), G.nt, add(G.head, rot([-3, 12], G.ha))], [18, 15, 15], L.skin, { line: { lw: 1.8 * lk }, wash: { light: .15 } });
    if (L.collar && L.topStyle !== 'hoodie') {   // the shirt collar wraps the neck: its front point over the neck
      ctx.save(); const T = (a, b) => rot([a, b], G.lean), th = B.torso;
      const cp = new Pen().m(...T(-10, -th - 2)).q(...T(0, -th - 8), ...T(12, -th - 4)).l(...T(17, -th + 12)).q(...T(9, -th + 8), ...T(3, -th + 2)).q(...T(-4, -th + 4), ...T(-10, -th - 2)).z();
      K.shape(ctx, cp, L.collar, { line: { lw: 1.5 * lk } }); ctx.restore(); }
    ctx.translate(G.head[0], G.head[1]); ctx.rotate(G.ha); ctx.scale(1.07, 1.07);
    const sk = new Pen().m(-35, -2).c(-37, -48, 30, -48, 29, -15).q(33, -4, 32, 8).q(32, 20, 26, 27).q(21, 35, 14, 36).q(5, 36, -3, 28).q(-12, 18, -19, 15).q(-34, 14, -35, -2).z();
    K.wash(ctx, sk, L.skin, { light: .3, mis: .45, edge: .1 });
    K.shade(ctx, sk, new Pen().m(-40, -8).q(-14, 2, -4, 40).l(-40, 40).z(), L.skin, { a: .5 });
    K.ink(ctx, new Pen().m(29, -16).q(33, -4, 32, 8).q(32, 20, 26, 27).q(21, 35, 14, 36).q(6, 36, -1, 30), { lw: 2.1 * lk, over: 2, heavy: [.6, .8], c: [0, 0] });
    K.wash(ctx, new Pen().ell(-15, 8, 6, 8.5, -.15), L.skin, { mis: .3, light: 0, edge: 0 });
    K.ink(ctx, new Pen().m(-11, 1).q(-22, -5, -21, 8).q(-20, 18, -10, 16), { lw: 1.7 * lk, heavy: null });
    K.ink(ctx, [[-13, 5], [-16, 9], [-13, 12]], { lw: .9 * lk, heavy: null, over: 0, a: .6 });
    face(ctx, G, fc, lk);
    K.figureHair(ctx, G);
    if (L.glasses) glasses(ctx, lk);
  }
  K.figureHair = function (ctx, G) {
    const L = G.L, lk = lineK(G), t = G.t, wd = G.wind, sd = (G.F.seed || 1) * 2.9;
    const p = K.locks(hairPts(G, true));
    K.shape(ctx, p, L.hair, { wash: { gaps: 2, gapW: 3, light: .38 }, line: { lw: 1.9 * lk, loop: 1.02, hv: .35 } });
    // inner strand lines following the sweep
    const r = rng(Math.floor(sd * 100)); for (let k = 0; k < 4; k++) { const x = -26 + k * 13 + r() * 4, y = -40 + Math.abs(k - 1.5) * 4;
      K.ink(ctx, [[x, y], [x + 8 - wd * 8, y + 12], [x + 10 - wd * 14, y + 22]], { lw: .9 * lk, heavy: null, a: .6, over: 0, smooth: true }); }
    if (L.clip) { ctx.save(); ctx.translate(6, -30); ctx.rotate(-.55); K.shape(ctx, new Pen().m(-10, -3).l(10, -3).q(13, 0, 10, 3).l(-10, 3).q(-13, 0, -10, -3).z(), L.clip, { line: { lw: 1.4 * lk } }); ctx.restore(); }
    if (L.ahoge) { const sw = Math.sin(t * 5.5) * .25 + wd * .6; K.ink(ctx, K.curve([[-6, -46], [-10 - 12 * sw, -62], [2 - 18 * sw, -70]]), { lw: 1.8 * lk, heavy: null, over: 2 }); }
  };
  function face(ctx, G, fc, lk) {
    const eyes = fc.eyes || 'open', mouth = fc.mouth || 'smile', brows = fc.brows || 'calm', lp = fc.look || [0, 0], bl = clamp(fc.blink || 0);
    const E = [[12, 5, 1], [28, 4, .55]];   // near eye, far eye (x, y, width factor)
    for (const [ex, ey, wf] of E) {
      const o = { lw: 2.4 * lk, heavy: null, over: 1 };
      if (eyes === 'laugh') K.ink(ctx, K.curve([[ex - 7 * wf, ey + 3], [ex, ey - 4], [ex + 7 * wf, ey + 3]]), o);
      else if (eyes === 'closed' || (eyes === 'open' && bl > .7)) K.ink(ctx, K.curve([[ex - 7 * wf, ey + 1], [ex, ey + 4], [ex + 7 * wf, ey + 1]]), o);
      else if (eyes === 'smug') { K.ink(ctx, K.curve([[ex - 7 * wf, ey + 2], [ex - 1, ey - 2], [ex + 7 * wf, ey + 3]]), o); K.ink(ctx, [[ex - 7 * wf, ey + 2], [ex - 11 * wf, ey]], { lw: 1.3 * lk, heavy: null, over: 0 }); }
      else if (eyes === 'squint') K.ink(ctx, [[ex - 7 * wf, ey + 1], [ex + 7 * wf, ey]], o);
      else {   // open / wide / panic: a thick upper lid with a lash flick, iris + catch-light, a lower-lid tick
        const wide = eyes === 'wide' || eyes === 'panic', rx = 7 * wf, ry = wide ? 9.5 : 8.5;
        if (wide) { const wp = new Pen().ell(ex, ey + 1, rx + 1, ry); K.knock(ctx, wp); K.ink(ctx, wp, { lw: 1.1 * lk, heavy: null, loop: .95 }); }
        const ir = wide ? 2.4 : 4.6, ix = ex + lp[0] * 2.5 + (wide ? 0 : wf < 1 ? 1 : 1.2), iy = ey + (wide ? 1 : 2.4) + lp[1] * 2;
        ctx.save(); ctx.fillStyle = K.rgba(K.C.ink, .9); ctx.beginPath(); ctx.ellipse(ix, iy, ir * (wide ? 1 : wf < 1 ? .62 : .8), ir * (wide ? 1 : 1.32), 0, 0, TAU); ctx.fill();
        if (!wide) { ctx.fillStyle = K.rgba(K.C.blue, .55); ctx.beginPath(); ctx.ellipse(ix, iy + 2.2, ir * .5 * wf, ir * .55, 0, 0, Math.PI); ctx.fill();
          ctx.fillStyle = K.C.paper; ctx.beginPath(); ctx.arc(ix + 1.6, iy - 2.6, 1.7, 0, TAU); ctx.fill(); }
        ctx.restore();
        K.ink(ctx, K.curve([[ex - rx - 2, ey - ry * .15], [ex - 2, ey - ry * .95], [ex + rx + 1, ey - ry * .45]]), { lw: 2.9 * lk, heavy: null, over: 1.5 });
        if (wf === 1) K.ink(ctx, [[ex - rx - 2, ey - ry * .15], [ex - rx - 6, ey - ry * .45]], { lw: 1.4 * lk, heavy: null, over: 0 });
        K.ink(ctx, [[ex - rx * .5, ey + ry * .9], [ex + rx * .4, ey + ry * .85]], { lw: 1 * lk, heavy: null, over: 0, a: .6 });
      }
      const up = brows === 'up' || eyes === 'wide' || eyes === 'panic' ? 5 : brows === 'angry' ? -2 : 0, by = ey - 14 - up, bw = 8 * wf;
      const inner = brows === 'worry' || eyes === 'panic' ? -4 : brows === 'angry' ? 4 : 0;   // the inner end (toward the nose: +x)
      K.ink(ctx, K.curve([[ex - bw, by + 1], [ex, by - 2], [ex + bw, by + 1 + inner]]), { lw: 1.7 * lk, heavy: null, over: 1 });
    }
    K.ink(ctx, [[33, 9], [36, 15], [32, 17]], { lw: 1.3 * lk, heavy: null, over: 0 });   // nose
    K.blush(ctx, 13, 18, 8, fc.blush ?? .55);
    const mx = 24, my = 25;
    if (mouth === 'laugh' || mouth === 'yell') {
      const big = mouth === 'yell' ? 1.2 : 1, p = new Pen().m(mx - 8, my - 2).q(mx + 2, my, mx + 10, my - 4).q(mx + 9 * big, my + 11 * big, mx, my + 11 * big).q(mx - 7, my + 8, mx - 8, my - 2).z();
      K.shape(ctx, p, K.C.mouth, { wash: { light: .1, mis: .2, edge: 0, a: .95 }, line: { lw: 1.8 * lk, loop: 1.03 } });
      ctx.save(); ctx.clip(p.path()); K.wash(ctx, new Pen().ell(mx, my + 10 * big, 6, 4), K.C.tongue, { knock: false, mis: 0, light: 0, edge: 0 }); ctx.restore();
      K.ink(ctx, [[mx - 6, my], [mx + 8, my - 2]], { lw: 1.6 * lk, col: K.C.paper, a: .95, heavy: null, over: 0 });
    } else if (mouth === 'grit') {
      const p = new Pen().m(mx - 10, my - 3).q(mx, my - 6, mx + 10, my - 4).q(mx + 11, my + 3, mx + 8, my + 6).q(mx - 1, my + 8, mx - 9, my + 4).q(mx - 12, my + 1, mx - 10, my - 3).z();
      K.shape(ctx, p, null, { line: { lw: 1.8 * lk, loop: 1.03 } });
      K.ink(ctx, [[mx - 10, my + 1], [mx + 9, my + 1]], { lw: 1 * lk, heavy: null, over: 0 });
      for (let k = -2; k <= 2; k++) K.ink(ctx, [[mx + k * 4, my - 4], [mx + k * 4, my + 5]], { lw: .8 * lk, heavy: null, over: 0, a: .75 });
    } else if (mouth === 'smug') {
      K.ink(ctx, K.curve([[mx - 7, my + 1], [mx, my + 3], [mx + 8, my - 2]]), { lw: 1.7 * lk, heavy: null });
      K.shape(ctx, new Pen().m(mx + 1, my + 2).q(mx + 12, my + 1, mx + 12, my + 8).q(mx + 7, my + 12, mx + 3, my + 5).z(), K.C.tongue, { line: { lw: 1.4 * lk } });
    } else if (mouth === 'o') K.shape(ctx, new Pen().ell(mx, my + 2, 3.5, 5), K.C.mouth, { line: { lw: 1.6 * lk } });
    else if (mouth === 'flat') K.ink(ctx, [[mx - 6, my + 1], [mx + 6, my]], { lw: 1.6 * lk, heavy: null });
    else K.ink(ctx, K.curve([[mx - 7, my - 1], [mx, my + 3], [mx + 7, my - 2]]), { lw: 1.7 * lk, heavy: null });
    if (fc.sweat) for (let k = 0; k < fc.sweat; k++) K.sweat(ctx, -2 - k * 13, -22 + k * 11, .75 - k * .1, -.3);
  }
  function glasses(ctx, lk) {
    const near = new Pen().ell(12, 6, 10.5, 9.5), far = new Pen().ell(28.5, 5, 5, 9);
    ctx.save(); ctx.fillStyle = 'rgba(220,232,245,.22)'; ctx.fill(near.path()); ctx.restore();
    K.ink(ctx, near, { lw: 1.8 * lk, heavy: null, loop: 1.02 }); K.ink(ctx, far, { lw: 1.6 * lk, heavy: null, loop: .97 });
    K.ink(ctx, [[22.5, 4], [24, 3]], { lw: 1.4 * lk, heavy: null, over: 0 }); K.ink(ctx, [[1.5, 4], [-12, 1]], { lw: 1.4 * lk, heavy: null, over: 0 });
    K.ink(ctx, [[7, 1], [10, -2]], { lw: 1.4 * lk, col: K.C.paper, heavy: null, over: 0 });
  }

  // ---------------- words: hand lettering ----------------
  // letter(ctx, s, x, y, o) → { w, h, glyphs: [{ x, y, w }] }: hand-lettered words (translated inside) — Jua glyphs, each
  //   tilted and bobbed a little, a pastel fill printed a hair off the line, a darker wobbly outline drawn twice (one
  //   thinner offset pass), boiling gently. o = { size = 92, fill = butter, color(i, ch) → fill, ink = C.ink, lw = 3.4,
  //   align 'center'|'left'|'right', k = 1 (reveal: glyphs pop in one after another as k goes 0 → 1), rot = .07, jit = 5,
  //   ls = 4, seed, font = HAND, lh = 1.2, alpha, maxW (shrink to fit), scale(i, ch) → extra per-glyph scale (pop one glyph),
  //   shake (px: jitter every glyph on twos — urgency), mis = 1 (fill offset ×) }
  K.letter = function (ctx, s, x, y, o = {}) {
    const str = Pilot.tr(s), lines = String(str).split('\n'), font = o.font || K.HAND, seed = o.seed ?? 3, ls = o.ls ?? 4;
    let size = o.size ?? 92; ctx.save(); ctx.font = `400 ${size}px ${font}`;
    const meas = l => Pilot.chars(l).reduce((w, ch) => w + ctx.measureText(ch).width + ls, -ls);
    if (o.maxW) { const mw = Math.max(...lines.map(meas)); if (mw > o.maxW) { size *= o.maxW / mw; ctx.font = `400 ${size}px ${font}`; } }
    const lh = size * (o.lh ?? 1.2), all = lines.reduce((n, l) => n + Pilot.chars(l).length, 0), out = { glyphs: [], w: 0, h: lines.length * lh };
    const k = o.k ?? 1, al = o.alpha ?? 1; ctx.globalAlpha *= al; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
    let gi = 0;
    lines.forEach((ln, li) => {
      const ch = Pilot.chars(ln), w = meas(ln); out.w = Math.max(out.w, w);
      let cx = (o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2);
      const yy = y + li * lh;
      ch.forEach((c, i) => {
        const cw = ctx.measureText(c).width, g = gi++, r1 = h1(seed + g * 1.37), r2 = h1(seed + g * 2.71), r3 = h1(seed + g * 4.13);
        const kk = clamp(k * (all + 2) - g), sc = K.spring(kk) * (o.scale ? o.scale(g, c) : 1);
        if (c.trim() && sc > .01) {
          const sh = 1.4 + 2 * (o.shake || 0), bx = (noise(g * .7, K12 * 1.3 + seed) - .5) * sh, by = (noise(g * .7 + 9, K12 * 1.3 + seed) - .5) * sh;
          ctx.save(); ctx.translate(cx + cw / 2 + bx, yy - size * .36 + (r2 - .5) * (o.jit ?? 5) + by); ctx.rotate((r1 - .5) * 2 * (o.rot ?? .07)); ctx.scale(sc * (1 + (r3 - .5) * .1), sc * (1 + (r3 - .5) * .1));
          const fill = o.color ? o.color(g, c) : (o.fill || K.C.butter);
          ctx.fillStyle = fill; ctx.fillText(c, -cw / 2 + 2.6 * (o.mis ?? 1), size * .36 + 2.2 * (o.mis ?? 1));
          ctx.strokeStyle = o.ink || K.C.ink; ctx.lineWidth = (o.lw ?? 3.4) * size / 92; ctx.strokeText(c, -cw / 2, size * .36);
          ctx.globalAlpha *= .55; ctx.lineWidth = (o.lw ?? 3.4) * .42 * size / 92; ctx.strokeText(c, -cw / 2 + (r2 - .5) * 2.4, size * .36 + (r1 - .5) * 2.4);
          ctx.restore();
        }
        out.glyphs.push({ x: cx, y: yy, w: cw, ch: c }); cx += cw + ls;
      });
    });
    ctx.restore(); out.size = size; return out;
  };
  // scribble(ctx, x, y, w, h, k, o): a quick hand cross-out over a box (a number struck out), drawn on as k goes 0 → 1.
  K.scribble = function (ctx, x, y, w, h, k, o = {}) {
    if (k <= 0) return; const n = o.n ?? 5, pts = [];
    for (let i = 0; i <= n; i++) { pts.push([x - w / 2 + w * (i % 2), y - h / 2 + h * i / n + (h1(i + 3) - .5) * 6]); }
    const D = K.curve(pts, false), m = Math.max(2, Math.floor(D.length * clamp(k)));
    K.ink(ctx, D.slice(0, m), { lw: o.lw ?? 5, col: o.col || K.C.ink, heavy: null, over: 0, a: .9 });
  };
  // caption(ctx, s, x, y, a, o): a small handwritten line (Gaegu — film.json maps the family to Gaegu-Bold.ttf — in ink) with a light paper halo — narration.
  K.caption = function (ctx, s, x, y, a = 1, o = {}) {
    if (a <= 0) return;
    Pilot.text(ctx, s, x, y, { size: o.size ?? 50, weight: 400, font: K.PEN, color: o.color || K.C.ink, alpha: a, shadow: 'rgba(253,251,247,.95)', shadowBlur: 14, align: o.align, lh: 1.3, maxW: 940 });
  };
  // captions(ctx, t, lines, o): SCRIPT.lines as hand-lettered titles (letters pop in, fade out). o = { y = 330, size = 84, fill, color, small (use the pen caption instead) }
  K.captions = function (ctx, t, lines, o = {}) {
    for (const [a, b, s] of lines) {
      const al = Pilot.win(t, a, b, .25, .4); if (al <= 0) continue;
      if (o.small) { K.caption(ctx, s, K.W / 2, o.y ?? 330, al, o); continue; }
      const two = String(Pilot.tr(s)).includes('\n');
      K.letter(ctx, s, K.W / 2, (o.y ?? 330) - (two ? (o.size ?? 84) * .6 : 0), { size: o.size ?? 84, k: clamp((t - a) / .7), alpha: al, fill: o.fill, color: o.color, seed: a * 10, maxW: 960 });
    }
  };
  // endCard(ctx, t, card, at, o): the paper washes back over the picture (o.veil = .86) and the title is hand-lettered
  //   (pastel, the accent on o.accentWord's letters), the small lines in Gaegu / Noto Sans below. o = { y = 760, veil, fill }
  K.endCard = function (ctx, t, card, at, o = {}) {
    const a = ss(at, at + .6, t); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a * (o.veil ?? .86); ctx.fillStyle = K.C.paper; ctx.fillRect(0, 0, K.W, K.H); ctx.restore();
    const y = o.y ?? 760;
    const tl = String(Pilot.tr(card.title)).split('\n').length;
    if (card.kicker) K.caption(ctx, card.kicker, K.W / 2, y - (tl - 1) * 50 - 120, a, { size: 40, color: K.C.inkSoft });
    K.letter(ctx, card.title, K.W / 2, y - (tl - 1) * 50, { size: 100, k: clamp((t - at) / .9), alpha: a, fill: o.fill || K.C.pink, color: o.color, seed: 17, maxW: 960 });
    const q = ss(at + .5, at + 1.1, t);
    if (card.passage) Pilot.text(ctx, card.passage, K.W / 2, y + 60 + tl * 60, { size: 40, weight: 400, font: K.PEN, color: K.C.inkSoft, alpha: a * q });
    if (card.by) Pilot.text(ctx, card.by, K.W / 2, y + 116 + tl * 60, { size: 28, weight: 400, font: K.SANS, color: K.C.inkSoft, alpha: a * q * .9 });
    if (card.cta) Pilot.text(ctx, card.cta, K.W / 2, y + 200 + tl * 60, { size: 30, weight: 500, font: K.SANS, color: K.C.ink, alpha: a * ss(at + 1.2, at + 2, t) });
  };

  // ---------------- setup, frame, post ----------------
  let post = null;
  // init({ accent, paperSeed = 11 }): bakes the paper (a faint warm mottling + fine tooth, multiplied in finish()). ~60 ms.
  K.init = function (o = {}) {
    if (o.accent) K.ACCENT = o.accent;
    const w = 540, h = 960, g = canvas(w, h), x = g.getContext('2d'), d = x.createImageData(w, h), r = rng(o.paperSeed ?? 11);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const m = Pilot.fbm(i * .012, j * .012, 3), v = 255 - 3 * m - 2.5 * r();
      const p = (j * w + i) * 4; d.data[p] = v; d.data[p + 1] = v - .6; d.data[p + 2] = v - 1.6; d.data[p + 3] = 255;
    }
    x.putImageData(d, 0, 0); post = canvas(K.W, K.H); post.getContext('2d').drawImage(g, 0, 0, K.W, K.H);
    for (const c of Object.values(K.C)) if (typeof c === 'string' && c[0] === '#') pattern(c);
  };
  // begin(ctx, t): black, pillarbox the portrait frame in landscape (?o=h), fill paper; calls frame(t).
  K.begin = function (ctx, t = 0) {
    K.frame(t);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, Pilot.W, Pilot.H);
    if (Pilot.ori !== 'v') { ctx.translate((Pilot.W - K.W * Pilot.H / K.H) / 2, 0); ctx.scale(Pilot.H / K.H, Pilot.H / K.H); ctx.beginPath(); ctx.rect(0, 0, K.W, K.H); ctx.clip(); }
    ctx.fillStyle = K.C.paper; ctx.fillRect(0, 0, K.W, K.H);
  };
  // cam(ctx, s = 1, x = 540, y = 960): scale the world about (x, y). Wrap in save()/restore().
  K.cam = function (ctx, s = 1, x = 540, y = 960) { ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y); };
  // finish(ctx, a = 1): the paper tooth multiplied over the picture. Draw words after it.
  K.finish = function (ctx, a = 1) { if (!post || a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(post, 0, 0); ctx.restore(); };
  // fade(ctx, t, dur, fi = .4, fo = .4): from / to black.
  K.fade = (ctx, t, dur, fi = .4, fo = .4) => Story.fadeBlack(ctx, t, dur, fi, fo);

  window.SketchAnime = K;
})();

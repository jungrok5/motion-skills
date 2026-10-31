/* donut-manga.js — the premium monochrome-manga finish for 「마지막 도넛」 + the line/tone primitives the cast is drawn with.
   Global: window.Manga. Load after lib.js (Pilot) and BEFORE donut-cast.js (the cast draws through Manga.ink / Manga.paint).

   LOOK: warm cream paper, one pure black ink, round-dot screentone on a 45° grid (pitch ≈ 7.1 px at 1080 wide, the same grid
   everywhere so drawn tones and graded tones line up), bold tapered focus / speed lines, halftone dust puffs, a ✱ caption tag,
   chunky white SFX with a thick black outline — and ONE colour: the donut pink #ff6fa3 (kept through the grade).
   Character construction follows the risograph dinner scene the owner liked (table-risoline face(): round head, dot/arc eyes,
   hatched blush, open laughing mouth, thick boiling line) — see donut-cast.js.

   API
     Manga.C                         palette { paper, paperL, ink, pink, pinkD }
     Manga.boil(t)                   set the boil frame (on twos, 12 fps) — the cast calls it; call it yourself before raw ink()
     Manga.figure(lwScreen)          set the line weight (screen px) for the figure being drawn (the cast sets it per figure)
     Manga.ink(ctx, pts, o)          THE line primitive: a boiling inked shape → Path2D. o { fill, tone (0…1 coverage), shade: { tone, dx, dy }
                                       (a cel band of darker dots where the shape is shifted away from the light), lw (× figure weight, 1),
                                       closed (true), smooth (true), raw, amp (screen px, .7), single, col }
     Manga.taper(ctx, pts, w0, w1, o) a tapered open stroke (thick → thin, × figure weight), boiling — brows, strands, folds, marks
     Manga.ell(cx, cy, rx, ry, n, rot) · Manga.tube(line, widths) · Manga.resample · Manga.chaikin · Manga.pathOf
     Manga.tone(ctx, c)              the dot-screen fill style for coverage c (0…1), anchored to the canvas pixel grid
     Manga.grade(ctx, o)             full-frame post pass: luminance → paper / light dots / mid dots / dark dots / ink, the accent pink kept.
                                       o { white .80, black .30, levels [.14, .38, .62, .86] (darkness cut points), cover [.16, .34, .58]
                                       (dot coverage per band), smooth (false: continuous AM halftone instead of bands), accent (true),
                                       paper, ink, grain (.35), rect [x, y, w, h] (canvas px; default the whole canvas) } → ms
     Manga.focus(ctx, t, o)          bold tapered focus lines (black wedges) round a clear oval. o { x, y, w, h (rect), cx, cy, rx, ry, n, wMax,
                                       col, seed, fps (10), inner (0…1 jitter of the inner end) }
     Manga.speed(ctx, t, o)          thick tapered speed lines across a rect, sliding. o { x, y, w, h, ang (0 = horizontal), n, wMax, col, seed,
                                       v (px/s slide), gap: { cx, cy, rx, ry } (a clear zone) }
     Manga.puff(ctx, t, x, y, r, o)  a halftone dust puff (lumpy cloud, ink outline, mid dots), o { at, life, dir, tone, seed }
     Manga.ticks(ctx, x, y, r, o)    impact ticks (short black wedges fanning up/out from a contact point), o { n, a0, a1, len }
     Manga.tag(ctx, text, x, y, o)   the caption tag: cream box, thick black border, offset black shadow, a pink ✱ before the text.
                                       o { size (40), at, font, pad, mark ('✱'), markCol, alpha }  (x, y) = top-left
     Manga.sfx(ctx, t, o)            chunky white letters, thick black outline, a hard drop shadow; per-letter tilt + pop.
                                       o { text, x, y, size, at, rot, fill ('#fff'), line, shadow [dx, dy], gap (letter spacing ×), font }
     Manga.laugh(ctx, t, G, k)       laugh marks (little ticks round a head G.head), k = size
   All pure functions of t (seeded randomness only). */
(function () {
  const { clamp, lerp, ss, eo, rng, noise } = Pilot, TAU = Math.PI * 2;
  const M = {};
  M.C = { paper: '#efe9dd', paperL: '#f7f3ea', ink: '#17151a', pink: '#ff6fa3', pinkD: '#d94a85' };

  /* ---------------------------------------------------------------- the dot screen (one 45° grid for everything)
     A 10×10 px tile holds two dot centres — (0,0) and (5,5) — so the dot pitch is 10/√2 ≈ 7.07 px along the 45° rows.
     coverage c ≤ .5: ink dots of radius √(50c/π) round those centres; c > .5: paper holes round the other two lattice points
     ((5,0), (0,5)) of radius √(50(1−c)/π). Anti-aliased by distance. Drawn tones and the grade share this function. */
  const TS = 10, HT = TS / 2, CA = TS * TS / 2, D1 = new Float32Array(TS * TS), D2 = new Float32Array(TS * TS);
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
    const px = x + .5, py = y + .5; let a = 1e9, b = 1e9;
    for (const [cx, cy] of [[0, 0], [TS, 0], [0, TS], [TS, TS], [HT, HT]]) a = Math.min(a, Math.hypot(px - cx, py - cy));
    for (const [cx, cy] of [[HT, 0], [0, HT], [TS, HT], [HT, TS]]) b = Math.min(b, Math.hypot(px - cx, py - cy));
    D1[y * TS + x] = a; D2[y * TS + x] = b;
  }
  const inkAt = (c, i) => { if (c <= 0) return 0; if (c >= 1) return 1;
    if (c <= .5) { const r = Math.sqrt(CA * c / Math.PI); return clamp(r - D1[i] + .5); }
    const r = Math.sqrt(CA * (1 - c) / Math.PI); return 1 - clamp(r - D2[i] + .5); };
  M.inkAt = inkAt;
  const PAT = new Map();
  /* tone(ctx, c) → a fill style: ink dots at coverage c, locked to the canvas pixel grid (the pattern is counter-transformed) */
  M.tone = function (ctx, c) {
    const key = Math.round(clamp(c) * 40);
    let P = PAT.get(key);
    if (!P) { const cv = Pilot.canvas(TS, TS), g = cv.getContext('2d'), d = g.createImageData(TS, TS), ink = Pilot.hex(M.C.ink), cc = key / 40;
      for (let i = 0; i < TS * TS; i++) { d.data[i * 4] = ink[0]; d.data[i * 4 + 1] = ink[1]; d.data[i * 4 + 2] = ink[2]; d.data[i * 4 + 3] = Math.round(255 * inkAt(cc, i)); }
      g.putImageData(d, 0, 0); P = { cv, pat: null }; PAT.set(key, P); }
    const pat = ctx.createPattern(P.cv, 'repeat'); pat.setTransform(ctx.getTransform().inverse()); return pat;
  };

  /* ---------------------------------------------------------------- the boiling line */
  let BK = 0, LW = 3.2;
  M.boil = t => { BK = Math.floor(t * 12 + 1e-6); };   // on twos: a fresh jitter 12×/s (every other frame at 24 fps)
  M.figure = lw => { const o = LW; if (lw != null) LW = lw; return o; };
  M.lwScreen = () => LW;
  const scaleOf = ctx => { const m = ctx.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; };
  M.scaleOf = scaleOf;
  function chaikin(pts, closed, it = 2) {
    for (let r = 0; r < it; r++) { const o = [], n = pts.length, m = closed ? n : n - 1; if (!closed) o.push(pts[0]);
      for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % n]; o.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); }
      if (!closed) o.push(pts[n - 1]); pts = o; }
    return pts;
  }
  function resample(pts, closed, step) {
    const o = [], n = pts.length, m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % n], d = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(d / step));
      for (let j = 0; j < k; j++) o.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]); }
    if (!closed) o.push(pts[n - 1]); return o;
  }
  function pathOf(pts, closed = true, smooth = true) {
    const p = new Path2D(), n = pts.length; if (!n) return p;
    if (!smooth || n < 3) { p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) p.lineTo(pts[i][0], pts[i][1]); if (closed) p.closePath(); return p; }
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (closed) { const s = mid(pts[n - 1], pts[0]); p.moveTo(s[0], s[1]);
      for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); p.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); } p.closePath(); }
    else { p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n - 1; i++) { const m = mid(pts[i], pts[i + 1]); p.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); } p.lineTo(pts[n - 1][0], pts[n - 1][1]); }
    return p;
  }
  // wob: a point displaced by the boil. Noise is sampled in SCREEN-size units of the LOCAL coords (S = current scale), so a figure that
  //   moves keeps its line between boil frames and the wobble is the same size on screen at any zoom.
  const wob = (p, amp, S, k = BK) => { const x = p[0] * S, y = p[1] * S, f = .03;
    return [p[0] + (noise(x * f + k * 7.31, y * f + .37) - .5) * 2 * amp, p[1] + (noise(x * f + 11.3, y * f + k * 5.17) - .5) * 2 * amp]; };
  const ell = (cx, cy, rx, ry, n = 22, rot = 0) => { const o = [], c = Math.cos(rot), s = Math.sin(rot); for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * c - y * s, cy + x * s + y * c]); } return o; };
  function tube(line, wd) {
    const Lf = [], Rt = [];
    for (let i = 0; i < line.length; i++) { const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d; const w = wd[i] ?? wd[wd.length - 1];
      Lf.push([line[i][0] - dy * w, line[i][1] + dx * w]); Rt.push([line[i][0] + dy * w, line[i][1] - dx * w]); }
    return Lf.concat(Rt.reverse());
  }
  Object.assign(M, { chaikin, resample, pathOf, ell, tube, wob });

  /* ink(ctx, pts, o): an inked shape in the current coords. Fill (paper / colour / ink) + dot tone + a cel band, then the boiling line drawn
     twice with two jitters (the overlap gives a living thick–thin edge). → the Path2D of the (jittered) shape, for clipping. */
  M.ink = function (ctx, pts, o = {}) {
    if (!pts || pts.length < 2) return new Path2D();
    const S = scaleOf(ctx), closed = o.closed !== false, sm = o.smooth !== false && !o.raw && pts.length > 2;
    const step = (o.step || 7) / S, base = o.raw ? pts : resample(sm ? chaikin(pts, closed, 2) : pts, closed, step);
    const amp = (o.amp ?? .7) / S, P = amp > 0 ? base.map(p => wob(p, amp, S)) : base, path = pathOf(P, closed, sm);
    if (o.fill || o.tone || o.shade) {
      if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(path); }
      if (o.tone > .01) { ctx.fillStyle = M.tone(ctx, o.tone); ctx.fill(path); }
      if (o.shade && o.shade.tone > .01) { const sh = o.shade; ctx.save(); ctx.clip(path);
        const cut = new Path2D(); cut.rect(-1e5, -1e5, 2e5, 2e5); const m = new DOMMatrix().translate(sh.dx || 0, sh.dy || 0); cut.addPath(path, m);
        ctx.fillStyle = M.tone(ctx, sh.tone); ctx.fill(cut, 'evenodd'); ctx.restore(); }
    }
    if (o.lw !== 0) { const lw = (o.lw ?? 1) * LW / S; ctx.strokeStyle = o.col || M.C.ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.lineWidth = lw * .82; ctx.stroke(path);
      if (!o.single && amp > 0) { ctx.lineWidth = lw * .7; ctx.stroke(pathOf(base.map(p => wob(p, amp * .9, S, BK + 50.5)), closed, sm)); } }
    return path;
  };
  /* taper(ctx, pts, w0, w1, o): a tapered stroke along pts (smoothed), widths × the figure line weight (screen px) → filled ink */
  M.taper = function (ctx, pts, w0 = 1, w1 = .3, o = {}) {
    if (pts.length < 2) return; const S = scaleOf(ctx), base = resample(o.raw ? pts : chaikin(pts, false, 2), false, 5 / S), amp = (o.amp ?? .5) / S;
    const P = amp > 0 ? base.map(p => wob(p, amp, S)) : base, n = P.length, mid = o.mid ?? Math.max(w0, w1);
    const wd = P.map((_, i) => { const u = i / (n - 1), w = o.belly ? (u < .35 ? lerp(w0, mid, u / .35) : lerp(mid, w1, (u - .35) / .65)) : lerp(w0, w1, u); return w * LW * .5 / S; });
    ctx.fillStyle = o.col || M.C.ink; ctx.fill(pathOf(tube(P, wd), true, true));
  };

  /* ---------------------------------------------------------------- the grade (full-frame manga print) */
  let OUT = null, OUTKEY = '';
  M.grade = function (ctx, o = {}) {
    const t0 = performance.now(), cv = ctx.canvas, [rx, ry, rw, rh] = o.rect || [0, 0, cv.width, cv.height];
    const wp = o.white ?? .80, bp = o.black ?? .30, cuts = o.levels || [.14, .38, .62, .86], cover = o.cover || [.16, .34, .58];
    const paper = Pilot.hex(o.paper || M.C.paper), ink = Pilot.hex(o.ink || M.C.ink), smooth = !!o.smooth, keep = o.accent !== false;
    // per (darkness band, tile px) packed output colours, rebuilt only when the options change
    const key = [wp, bp, cuts, cover, paper, ink, smooth].join('|');
    if (key !== OUTKEY) { OUTKEY = key; const NL = smooth ? 33 : cuts.length + 1; OUT = { NL, px: new Uint32Array(NL * TS * TS), lut: new Uint8Array(256) };
      const covOf = l => smooth ? l / 32 : (l === 0 ? 0 : l === NL - 1 ? 1 : cover[l - 1]);
      for (let l = 0; l < NL; l++) { const c = covOf(l); for (let i = 0; i < TS * TS; i++) { const a = inkAt(c, i);
        const r = Math.round(lerp(paper[0], ink[0], a)), g = Math.round(lerp(paper[1], ink[1], a)), b = Math.round(lerp(paper[2], ink[2], a));
        OUT.px[l * TS * TS + i] = (255 << 24) | (b << 16) | (g << 8) | r; } }
      for (let v = 0; v < 256; v++) { const d = 1 - clamp((v / 255 - bp) / (wp - bp)); let l;
        if (smooth) l = Math.round(d * 32); else { l = 0; while (l < cuts.length && d >= cuts[l]) l++; }
        OUT.lut[v] = l; } }
    const img = ctx.getImageData(rx, ry, rw, rh), d8 = img.data, d32 = new Uint32Array(d8.buffer), { px, lut } = OUT, T2 = TS * TS;
    let i = 0;
    for (let y = 0; y < rh; y++) { const ty = ((y + ry) % TS) * TS; let tx = (rx % TS);
      for (let x = 0; x < rw; x++, i++) {
        const j = i << 2, r = d8[j], g = d8[j + 1], b = d8[j + 2];
        if (keep && r > 120 && b > g) { const mx = r, mn = g < b ? g : b, dd = mx - mn;   // the accent: hue ≈ 322–350°, saturated → keep as is
          if (dd > 40 && mx >= b && dd > mx * .26) { const h = (g - b) / dd; if (h > -.64 && h < -.15) { if (++tx === TS) tx = 0; continue; } } }
        const L = (77 * r + 150 * g + 29 * b) >> 8;
        d32[i] = px[lut[L] * T2 + ty + tx];
        if (++tx === TS) tx = 0;
      } }
    ctx.putImageData(img, rx, ry);
    if ((o.grain ?? .35) > 0) M.grain(ctx, o.grain ?? .35, [rx, ry, rw, rh]);
    return performance.now() - t0;
  };
  let GR = null;
  M.grain = function (ctx, a = .35, rect) {
    if (!GR) { const N = 256, c = Pilot.canvas(N, N), g = c.getContext('2d'), d = g.createImageData(N, N), r = rng(91);
      for (let i = 0; i < N * N; i++) { const v = r(); const dark = v < .5; d.data[i * 4] = dark ? 40 : 255; d.data[i * 4 + 1] = dark ? 34 : 250; d.data[i * 4 + 2] = dark ? 30 : 238; d.data[i * 4 + 3] = (Math.pow(Math.abs(v - .5) * 2, 3) * 60) | 0; }
      g.putImageData(d, 0, 0); GR = c; }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.fillStyle = ctx.createPattern(GR, 'repeat'); const [x, y, w, h] = rect || [0, 0, ctx.canvas.width, ctx.canvas.height]; ctx.fillRect(x, y, w, h); ctx.restore();
  };

  /* ---------------------------------------------------------------- bold lines, puffs, ticks */
  // a black wedge from a (wide end, width w) to b (point)
  const wedge = (ctx, a, b, w) => { const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d * w / 2, ny = dx / d * w / 2;
    ctx.beginPath(); ctx.moveTo(a[0] + nx, a[1] + ny); ctx.quadraticCurveTo((a[0] + b[0]) / 2 + nx * .35, (a[1] + b[1]) / 2 + ny * .35, b[0], b[1]); ctx.quadraticCurveTo((a[0] + b[0]) / 2 - nx * .35, (a[1] + b[1]) / 2 - ny * .35, a[0] - nx, a[1] - ny); ctx.closePath(); ctx.fill(); };
  M.wedge = wedge;
  M.focus = function (ctx, t, o = {}) {
    const x = o.x || 0, y = o.y || 0, w = o.w || 1080, h = o.h || 1920, cx = o.cx ?? x + w / 2, cy = o.cy ?? y + h / 2, rx = o.rx ?? w * .3, ry = o.ry ?? h * .22;
    const n = o.n || 70, wMax = o.wMax || 22, f = Math.floor(t * (o.fps || 10) + 1e-6), r = rng((o.seed || 1) * 977 + f * 13), R = Math.hypot(w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.fillStyle = o.col || M.C.ink;
    for (let i = 0; i < n; i++) { const a = (i + r() * .8) / n * TAU, ca = Math.cos(a), sa = Math.sin(a), k = .9 + r() * (o.inner ?? .55);
      const inner = [cx + ca * rx * k, cy + sa * ry * k], outer = [cx + ca * R, cy + sa * R], ww = wMax * (.25 + r() * r() * 1.1);
      wedge(ctx, outer, inner, ww); if (r() < .35) { const k2 = k + .25 + r() * .4; wedge(ctx, outer, [cx + ca * rx * k2 + sa * ww, cy + sa * ry * k2 - ca * ww], ww * .45); } }
    ctx.restore();
  };
  M.speed = function (ctx, t, o = {}) {
    const x = o.x || 0, y = o.y || 0, w = o.w || 1080, h = o.h || 600, ang = o.ang || 0, n = o.n || 26, wMax = o.wMax || 12, r = rng(o.seed || 3), v = o.v ?? 900;
    const c = Math.cos(ang), s = Math.sin(ang), L = Math.hypot(w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.fillStyle = o.col || M.C.ink; ctx.translate(x + w / 2, y + h / 2); ctx.rotate(ang);
    for (let i = 0; i < n; i++) { const yy = (r() - .5) * L, len = L * (.2 + r() * .45), sp = v * (.6 + r() * .8), x0 = ((r() * L + t * sp) % (L * 1.6)) - L * .8, ww = wMax * (.3 + r() * .9);
      if (o.gap) { const gx = (o.gap.cx - x - w / 2), gy = (o.gap.cy - y - h / 2), lx = gx * c + gy * s, ly = -gx * s + gy * c; if (Math.abs(yy - ly) < o.gap.ry && x0 - len < lx + o.gap.rx && x0 > lx - o.gap.rx) continue; }
      wedge(ctx, [x0, yy], [x0 - len, yy], ww); }
    ctx.restore();
  };
  M.puff = function (ctx, t, x, y, r, o = {}) {
    const at = o.at ?? -1e9, life = o.life ?? .9, u = (t - at) / life; if (u < 0 || u > 1) return; M.boil(t);
    const R = r * (.55 + .6 * eo(u)), dir = o.dir ?? 0, rr = rng(o.seed || 7), pts = [];
    const lobes = 7; for (let i = 0; i < lobes; i++) { const a = i / lobes * TAU, lr = R * (.32 + rr() * .16), cx = x + dir * R * .5 * u + Math.cos(a) * R * .55, cy = y - R * .3 + Math.sin(a) * R * .38;
      for (let j = 0; j < 7; j++) { const b = a - 1.3 + j / 6 * 2.6; pts.push([cx + Math.cos(b) * lr, cy + Math.sin(b) * lr]); } }
    ctx.save(); ctx.globalAlpha *= 1 - ss(.7, 1, u);
    const S = scaleOf(ctx), hull = []; for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; let best = 0; for (const p of pts) { const d = (p[0] - x - dir * R * .5 * u) * Math.cos(a) + (p[1] - y + R * .3) * Math.sin(a); if (d > best) best = d; }
      hull.push([x + dir * R * .5 * u + Math.cos(a) * best, y - R * .3 + Math.sin(a) * best * (1 + .08 * Math.sin(a * 5 + (o.seed || 7)))]); }
    const old = LW; LW = o.lw ?? Math.max(2.4, r * .06 * S);
    M.ink(ctx, hull, { fill: M.C.paper, tone: o.tone ?? .34, amp: .5 }); LW = old; ctx.restore();
  };
  M.ticks = function (ctx, x, y, r, o = {}) {
    const n = o.n || 7, a0 = o.a0 ?? Math.PI + .25, a1 = o.a1 ?? TAU - .25, len = o.len ?? .9, rr = rng(o.seed || 4); ctx.save(); ctx.fillStyle = o.col || M.C.ink;
    for (let i = 0; i < n; i++) { const a = lerp(a0, a1, i / (n - 1)) + (rr() - .5) * .12, r0 = r * (.15 + rr() * .2), r1 = r * (len + rr() * .5);
      wedge(ctx, [x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1], r * .09 * (.6 + rr())); }
    ctx.restore();
  };
  M.laugh = function (ctx, t, G, k = 1) {
    const h = G.head || G, ph = Math.floor(t * 6) % 2, r = h.r * k; ctx.save(); ctx.translate(h.x, h.y); if (h.tilt) ctx.rotate(h.tilt);
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const a = (sx > 0 ? -.5 : Math.PI + .5) + (i - 1) * .42 * sx, r0 = r * (1.28 + ph * .05), r1 = r0 + r * .3;
      wedge(ctx, [Math.cos(a) * r0, -r * .15 + Math.sin(a) * r0], [Math.cos(a) * r1, -r * .15 + Math.sin(a) * r1], r * .085); }
    ctx.restore();
  };

  /* ---------------------------------------------------------------- caption tag (✱) and SFX lettering */
  M.FONT = "'Noto Sans KR',sans-serif";
  M.tag = function (ctx, text, x, y, o = {}) {
    const at = o.at ?? -1e9, tt = o.t ?? 1e9; if (tt < at) return;
    const size = o.size || 40, font = `700 ${size}px ${o.font || M.FONT}`, pad = o.pad ?? size * .5, s = Pilot.tr(text);
    ctx.save(); ctx.font = font; const tw = ctx.measureText(s).width; ctx.restore();
    const mw = size * 1.05, w = pad * 2 + mw + tw, h = size * 1.7, k = tt - at < .25 ? eo((tt - at) / .25) : 1;
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha; ctx.translate(x, y); ctx.scale(1, k);
    const bw = Math.max(4, size * .13), sh = size * .2;
    ctx.fillStyle = M.C.ink; ctx.fillRect(sh, sh, w, h);                        // the offset black shadow
    ctx.fillStyle = o.bg || M.C.paperL; ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = bw; ctx.strokeStyle = M.C.ink; ctx.strokeRect(bw / 2, bw / 2, w - bw, h - bw);
    // ✱ (drawn, not a glyph: six petals)
    ctx.save(); ctx.translate(pad + mw * .4, h / 2); ctx.fillStyle = o.markCol || M.C.pink;
    for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.ellipse(0, -size * .2, size * .085, size * .2, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = M.C.ink; ctx.font = font; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(s, pad + mw, h / 2 + size * .04);
    ctx.restore(); return { w, h };
  };
  M.sfx = function (ctx, t, o) {
    const at = o.at ?? -1e9; if (t < at) return; const u = t - at, s = Pilot.chars(Pilot.tr(o.text)), size = o.size || 120, font = `400 ${size}px ${o.font || "'Black Han Sans',sans-serif"}`;
    const r = rng(o.seed || 11), [sdx, sdy] = o.shadow || [size * .06, size * .07], lw = o.line ?? size * .16;
    ctx.save(); ctx.font = font; const ws = s.map(c => ctx.measureText(c).width), gap = (o.gap ?? -.06) * size, W = ws.reduce((a, b) => a + b, 0) + gap * (s.length - 1);
    ctx.translate(o.x, o.y); ctx.rotate(o.rot ?? -.08); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    let cx = -W / 2; const L = s.map((c, i) => { const p = { c, x: cx + ws[i] / 2, rot: (r() - .5) * .22, dy: (r() - .5) * size * .14, sc: 1 + (r() - .5) * .14 }; cx += ws[i] + gap; return p; });
    for (const pass of [0, 1, 2]) L.forEach((p, i) => { const k = clamp((u - i * .06) / .16); if (k <= 0) return; const pop = k < 1 ? .6 + .55 * eo(k) - .15 * k : 1;
      ctx.save(); ctx.translate(p.x, p.dy); ctx.rotate(p.rot); ctx.scale(p.sc * pop, p.sc * pop);
      if (pass === 0) { ctx.translate(sdx, sdy); ctx.strokeStyle = ctx.fillStyle = o.shadowCol || M.C.ink; ctx.lineWidth = lw; ctx.strokeText(p.c, 0, 0); ctx.fillText(p.c, 0, 0); }
      else if (pass === 1) { ctx.strokeStyle = o.lineCol || M.C.ink; ctx.lineWidth = lw; ctx.strokeText(p.c, 0, 0); }
      else { ctx.fillStyle = o.fill || '#ffffff'; ctx.fillText(p.c, 0, 0); }
      ctx.restore(); });
    ctx.restore();
  };

  window.Manga = M;
})();

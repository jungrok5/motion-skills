/* kit-papercut.js — 붉은 전지 오림 (red paper-cut, folk window-flower) house style for word-log.  Global: window.Papercut
   Worked example: 잘라 낸 건 다리였다 ⑥ (sermons/2026-10-11-1cor4/film/scenes/cross-papercut.html). Card: styles/papercut/STYLE.md.

   Rendering model — every thing is a piece of paper cut with scissors and laid on a dark indigo backing:
     no outlines, no gradients inside a piece; detail is what was CUT AWAY (inset slits, sawtooth edges, crescents, diamond
     lace) so the backing shows through. A piece = flat fill + tight two-step paper shadow + a light cut face upper-left
     and a dark one lower-right (`paper`), or a prebuilt textured sprite (`finish` = soft-light grain + cut faces, holes kept).
     The whole world is one red (and its indigo backing); the protagonist's thing is the ONE piece cut from another paper
     (gold, `Papercut.ACCENT`). Light = the backing lit from behind, seen through cut holes (`lightWindow`), + a 'lighter' spill.
   A frame:  fill the backing → parallax layers (Papercut.layer: clouds .15, mountains .35, hills .65, world 1)
             → the world (sheets, sprites, jointed figures) → Papercut.grain → captions / curtain + end card.
   Units: world px; the camera is { x, y, z } (world point at the screen centre, zoom). Figures pose on 12 fps (t12),
   the camera on ones. Load after lib.js (Pilot) and story.js (Story). Deterministic: seeded rng only; sheets and sprites
   are built once in init / your build step. */
(function () {
  const { clamp, lerp, ss, eo, eio, rng } = Pilot;
  const P = {}, TAU = Math.PI * 2;

  // ------------------------------------------------------------------ palette & type
  const C = P.C = {
    back: '#10132a', back2: '#161b36', cloud: '#1b2142', mt: '#1c2550', mt2: '#222d5f', hill: '#29366c', hill2: '#212c5b',
    road: '#33427a', roadD: '#2a3768', cliff1: '#212a57', cliff2: '#171e40', gate: '#b8171f',
    me: '#de2a22', pil: '#c41b23', xred: '#9b1220', gold: '#ebc472', saw: '#8f95a6', wood: '#5a1916',
    light: '#fff1cc', light2: '#f6b866', ink: '#f7ecd8',
  };
  P.ACCENT = C.gold;                                     // the one piece cut from a different paper
  P.SERIF = "'Noto Serif KR',serif"; P.SANS = "'Noto Sans KR',sans-serif";
  P.FONTS = ["700 60px 'Noto Serif KR'", "600 60px 'Noto Serif KR'", "400 28px 'Noto Sans KR'", "500 34px 'Noto Sans KR'"];   // Pilot.run({ fonts })
  P.CAP = { font: P.SERIF, weight: 700, color: C.ink, srcColor: '#e3d3b8', y: 440, shadow: 'rgba(4,4,14,.85)', shadowBlur: 14 };

  // ------------------------------------------------------------------ small maths
  P.shade = (hex, k) => { const c = Pilot.hex(hex); return `rgb(${c[0] * k | 0},${c[1] * k | 0},${c[2] * k | 0})`; };   // darker paper of the same colour
  const t12 = P.t12 = t => Math.floor(t * 12 + 1e-6) / 12;                                                              // figures pose on 12 fps
  const frac = P.frac = x => x - Math.floor(x);
  const pathOf = P.pathOf = (pts, closed = true) => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); if (closed) p.closePath(); return p; };

  // ------------------------------------------------------------------ paper pieces (drawn every frame, world coords)
  /* paper(ctx, p, col, o): a hand-cut piece — tight paper shadow (o.sh scale, 0 = none), flat fill, light cut face
     upper-left and dark lower-right; o.inset (px) = a slit cut that far inside the outline (double outline), o.slit colour. */
  const paper = P.paper = function (ctx, p, col, o = {}) {
    const sh = o.sh ?? 1;
    if (sh > 0) { ctx.fillStyle = 'rgba(6,3,12,.42)'; ctx.save(); ctx.translate(2.4 * sh, 3.4 * sh); ctx.fill(p); ctx.restore();
      ctx.fillStyle = 'rgba(6,3,12,.22)'; ctx.save(); ctx.translate(4.2 * sh, 6 * sh); ctx.fill(p); ctx.restore(); }
    ctx.fillStyle = col; ctx.fill(p);
    ctx.save(); ctx.clip(p);
    if (o.inset) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.slit || C.back; ctx.lineWidth = 2 * (o.inset + 1.6); ctx.stroke(p); ctx.strokeStyle = col; ctx.lineWidth = 2 * o.inset; ctx.stroke(p); }
    ctx.lineWidth = 2.6; ctx.translate(1.4, 1.4); ctx.strokeStyle = 'rgba(255,214,196,.30)'; ctx.stroke(p);
    ctx.translate(-2.8, -2.8); ctx.strokeStyle = 'rgba(30,0,8,.42)'; ctx.stroke(p);
    ctx.restore();
  };
  // capsule(a, b, wa, wb, n) → pts: a tapered limb with round ends (widths wa at a, wb at b)
  const capsule = P.capsule = function (a, b, wa, wb, n = 7) {
    const dx = b[0] - a[0], dy = b[1] - a[1], an = Math.atan2(dy, dx), pts = [];
    for (let i = 0; i <= n; i++) { const q = an + Math.PI / 2 + Math.PI * i / n; pts.push([a[0] + Math.cos(q) * wa / 2, a[1] + Math.sin(q) * wa / 2]); }
    for (let i = 0; i <= n; i++) { const q = an - Math.PI / 2 + Math.PI * i / n; pts.push([b[0] + Math.cos(q) * wb / 2, b[1] + Math.sin(q) * wb / 2]); }
    return pts;
  };
  // holes(ctx, list, col): "cut" holes by filling them with the backing colour (for pieces drawn live, not sprites)
  const holes = P.holes = function (ctx, list, col = C.back) { ctx.fillStyle = col; const p = new Path2D(); for (const h of list) { p.moveTo(h[0][0], h[0][1]); for (let i = 1; i < h.length; i++) p.lineTo(h[i][0], h[i][1]); p.closePath(); } ctx.fill(p); };
  const diamond = P.diamond = (x, y, rx, ry) => [[x, y - ry], [x + rx, y], [x, y + ry], [x - rx, y]];
  // crescentPts(cx, cy, r, a0, a1, t, n) → pts: a crescent hole (arc a0..a1 of radius r, t thick at the middle)
  const crescentPts = P.crescentPts = function (cx, cy, r, a0, a1, t, n = 10) { const o = [], q = [];
    for (let i = 0; i <= n; i++) { const u = i / n, a = a0 + (a1 - a0) * u, k = Math.sin(Math.PI * u); o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); q.push([cx + Math.cos(a) * (r - t * k), cy + Math.sin(a) * (r - t * k)]); }
    return o.concat(q.reverse()); };
  // sawEdge(x0, x1, y, h, sp, seed, dir) → polyline: a sawtooth (grass / ridge / hem) edge, teeth h high every sp px
  const sawEdge = P.sawEdge = function (x0, x1, y, h, sp, seed, dir = -1) {
    const r = rng(seed), o = []; for (let x = x0, i = 0; x <= x1; x += sp / 2, i++) o.push([x, y + (i % 2 ? dir * h * (.6 + .8 * r()) : 0)]); return o; };
  // swirlPts(cx, cy, r, turns, rot, dir) → polyline of a spiral (cloud scroll slits)
  P.swirlPts = function (cx, cy, r, turns, rot, dir = 1) { const o = [], n = Math.ceil(turns * 30); for (let i = 0; i <= n; i++) { const u = i / n, a = rot + dir * u * turns * TAU, rr = r * (1 - u * .85); o.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return o; };

  // ------------------------------------------------------------------ setup: grain; sprites and sheets (prebuilt paper)
  const TX = P.TX = {};
  /* init(): build the paper grain tile (~0.15 s). Call first in the scene's init (sprites and sheets need it). */
  P.init = function () { TX.grain = grainTile(); P.GRAIN = Pilot.canvas(1, 1).getContext('2d').createPattern(TX.grain, 'repeat'); };
  function grainTile(N = 512) {
    const c = Pilot.canvas(N, N), g = c.getContext('2d'), d = g.createImageData(N, N), r = rng(7);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const f = (Pilot.noise(x / 64, y / 64) - .5) * 1.0 + (Pilot.noise(x / 16 + 9, y / 16) - .5) * .5 + (Pilot.noise(x / 4, y / 4 + 3) - .5) * .25;
      const v = 128 + f * 40 + (r() > .994 ? -30 : 0), i = (y * N + x) * 4; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
    g.lineCap = 'round';
    for (let k = 0; k < 520; k++) { const x = r() * N, y = r() * N, a = r() * TAU, l = 10 + r() * 28; g.globalAlpha = .1 + r() * .14; g.strokeStyle = k % 3 ? '#fff' : '#000'; g.lineWidth = .8 + r() * .5;
      for (const [ox, oy] of [[0, 0], [-N, 0], [N, 0], [0, -N], [0, N]]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.quadraticCurveTo(x + ox + Math.cos(a + .4) * l / 2, y + oy + Math.sin(a + .4) * l / 2, x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke(); } }
    return c;
  }
  /* finish(c, seed, edge): texture a canvas of cut paper — soft-light grain, light/dark cut faces `edge` px wide, then its
     own alpha restored (holes stay holes). */
  const finish = P.finish = function (c, seed = 0, edge = 2) {
    const g = c.getContext('2d'), w = c.width, h = c.height, m = Pilot.canvas(w, h); m.getContext('2d').drawImage(c, 0, 0);
    g.save(); const pat = g.createPattern(TX.grain, 'repeat'); pat.setTransform(new DOMMatrix([1, 0, 0, 1, (seed * 137) % 512, (seed * 71) % 512]));
    g.globalCompositeOperation = 'soft-light'; g.fillStyle = pat; g.fillRect(0, 0, w, h);
    const r = Pilot.canvas(w, h), rg = r.getContext('2d');
    rg.drawImage(m, 0, 0); rg.globalCompositeOperation = 'destination-out'; rg.drawImage(m, edge, edge); rg.globalCompositeOperation = 'source-in'; rg.fillStyle = 'rgba(255,214,190,.5)'; rg.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-atop'; g.drawImage(r, 0, 0);
    rg.globalCompositeOperation = 'source-over'; rg.clearRect(0, 0, w, h); rg.drawImage(m, 0, 0); rg.globalCompositeOperation = 'destination-out'; rg.drawImage(m, -edge, -edge);
    rg.globalCompositeOperation = 'source-in'; rg.fillStyle = 'rgba(40,0,8,.5)'; rg.fillRect(0, 0, w, h); g.drawImage(r, 0, 0);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(m, 0, 0); g.restore(); return c;
  };
  // shadowOf(c, blur) → canvas (12 px padding each side): the soft paper shadow of a sprite
  const shadowOf = P.shadowOf = function (c, blur = 5) { const s = Pilot.canvas(c.width + 24, c.height + 24), g = s.getContext('2d'); g.filter = `blur(${blur}px)`; g.drawImage(c, 12, 12); g.filter = 'none';
    g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgba(6,3,12,.62)'; g.fillRect(0, 0, s.width, s.height); return s; };
  // canvas cut helpers for sheet/sprite builders (g = a canvas context): fill a polygon, cut holes, cut a slit along a polyline
  const fillPts = P.fillPts = function (g, pts, col) { g.fillStyle = col; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath(); g.fill(); };
  const cutPts = P.cutPts = function (g, list) { g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.beginPath(); for (const h of list) { g.moveTo(...h[0]); for (const p of h.slice(1)) g.lineTo(...p); g.closePath(); } g.fill(); g.restore(); };
  const cutSlit = P.cutSlit = function (g, pts, w) { g.save(); g.globalCompositeOperation = 'destination-out'; g.strokeStyle = '#000'; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.stroke(); g.restore(); };
  /* sheet(x0, y0, x1, y1, draw, seed, K) → a prebuilt sheet of cut paper covering that world rect: draw(g) cuts it in world
     coords (fillPts / cutPts / cutSlit), then it is finished as paper. Draw it every frame with drawSheet(ctx, s). */
  const sheet = P.sheet = function (x0, y0, x1, y1, draw, seed, K = 1) {
    const c = Pilot.canvas((x1 - x0) * K, (y1 - y0) * K), g = c.getContext('2d'); g.setTransform(K, 0, 0, K, -x0 * K, -y0 * K); g.lineJoin = 'round'; draw(g);
    g.setTransform(1, 0, 0, 1, 0, 0); finish(c, seed, 2); return { c, x0, y0, x1, y1, K, sh: null };
  };
  // drawSheet(ctx, s): blit only the part of a sheet that is on screen (under the current transform)
  P.drawSheet = function (ctx, s) {
    const W = Pilot.W, H = Pilot.H, m = ctx.getTransform(), inv = m.inverse(), p0 = inv.transformPoint(new DOMPoint(0, 0)), p1 = inv.transformPoint(new DOMPoint(W, H));
    const x0 = Math.max(s.x0, Math.min(p0.x, p1.x) - 4), x1 = Math.min(s.x1, Math.max(p0.x, p1.x) + 4), y0 = Math.max(s.y0, Math.min(p0.y, p1.y) - 4), y1 = Math.min(s.y1, Math.max(p0.y, p1.y) + 4);
    if (x1 <= x0 || y1 <= y0) return;
    ctx.drawImage(s.c, (x0 - s.x0) * s.K, (y0 - s.y0) * s.K, (x1 - x0) * s.K, (y1 - y0) * s.K, x0, y0, x1 - x0, y1 - y0);
  };
  /* sprite(x0, y0, x1, y1, draw, seed, o) → { c, sh, x0, y0, x1, y1, K }: a small cut piece (a seed, a leaf, a flower, a prop)
     drawn once at K× (o.K = 2) in local coords x0..x1 × y0..y1, finished as paper, with a soft shadow. Draw it with
     drawSprite(ctx, S, x, y, a, scale, alpha) — local (0, 0) lands on (x, y). */
  P.sprite = function (x0, y0, x1, y1, draw, seed, o = {}) {
    const K = o.K ?? 2, c = Pilot.canvas(Math.ceil((x1 - x0) * K), Math.ceil((y1 - y0) * K)), g = c.getContext('2d');
    g.setTransform(K, 0, 0, K, -x0 * K, -y0 * K); g.lineJoin = 'round'; draw(g); g.setTransform(1, 0, 0, 1, 0, 0);
    finish(c, seed, o.edge ?? 2.4); return { c, sh: shadowOf(c, o.blur ?? 4), x0, y0, x1, y1, K };
  };
  P.drawSprite = function (ctx, S, x, y, a = 0, sc = 1, alpha = 1, shadow = 1) {
    if (alpha <= 0 || sc <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(sc, sc); ctx.globalAlpha *= alpha;
    const w = S.x1 - S.x0, h = S.y1 - S.y0;
    if (shadow) { ctx.save(); ctx.rotate(-a); ctx.translate(3 * shadow / sc, 4.5 * shadow / sc); ctx.rotate(a); ctx.drawImage(S.sh, S.x0 - 12 / S.K, S.y0 - 12 / S.K, w + 24 / S.K, h + 24 / S.K); ctx.restore(); }
    ctx.drawImage(S.c, S.x0, S.y0, w, h); ctx.restore();
  };

  // ------------------------------------------------------------------ a long cut piece: the cross / beam (with lace)
  /* crossSprite(col, lying, seed, d) → sprite of a cross cut from one sheet: post along +x (foot x = 0, top x = d.L), crossbar
     near the top; diamond lace down the middle, a four-petal rosette at the crossing, swallow-tail notched ends, a slit a few
     px inside the outline. lying = crossbar foreshortened (lying flat). d = { L 520, PW 34 (post width), CBX L−130 (crossbar
     centre), CBW 32, CBH 118 / CBHL 50 (half crossbar upright / lying), KX 2 (resolution), CPAD 14 }. */
  P.CROSS = { L: 520, PW: 34, CBX: 390, CBW: 32, CBH: 118, CBHL: 50, KX: 2, CPAD: 14 };
  P.crossSprite = function (col, lying, seed, d = P.CROSS) {
    const { L, PW, CBX, CBW, CBH, CBHL, KX, CPAD } = d;
    const hb = lying ? CBHL : CBH, w = (L + 2 * CPAD) * KX, h = (2 * hb + 2 * CPAD) * KX, c = Pilot.canvas(w, h), g = c.getContext('2d');
    g.setTransform(KX, 0, 0, KX, CPAD * KX, (hb + CPAD) * KX);
    const out = [[0, -PW / 2], [CBX - CBW / 2, -PW / 2], [CBX - CBW / 2, -hb], [CBX + CBW / 2, -hb], [CBX + CBW / 2, -PW / 2], [L, -PW / 2], [L, PW / 2],
      [CBX + CBW / 2, PW / 2], [CBX + CBW / 2, hb], [CBX - CBW / 2, hb], [CBX - CBW / 2, PW / 2], [0, PW / 2]];
    const p = pathOf(out); g.fillStyle = col; g.fill(p);
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
    const notch = (pts) => { g.beginPath(); g.moveTo(...pts[0]); for (const q of pts.slice(1)) g.lineTo(...q); g.closePath(); g.fill(); };
    notch([[L + 1, -6], [L - 9, 0], [L + 1, 6]]);
    notch([[CBX - 6, -hb - 1], [CBX, -hb + (lying ? 5 : 9)], [CBX + 6, -hb - 1]]); notch([[CBX - 6, hb + 1], [CBX, hb - (lying ? 5 : 9)], [CBX + 6, hb + 1]]);
    g.save(); g.clip(p); g.globalCompositeOperation = 'destination-out'; g.lineJoin = 'miter'; g.strokeStyle = '#000'; g.lineWidth = 2 * (4.2 + 1.5); g.stroke(p);
    g.globalCompositeOperation = 'source-over'; g.strokeStyle = col; g.lineWidth = 2 * 4.2; g.stroke(p); g.restore();
    g.globalCompositeOperation = 'destination-out';
    for (let x = 22; x < L - 14; x += 26) { if (Math.abs(x - CBX) < 30) continue; g.beginPath(); for (const [a, b] of diamond(x, 0, 6.5, 4.6)) g.lineTo(a, b); g.closePath(); g.fill(); }
    for (let y = 30; y < hb - 10; y += lying ? 18 : 24) for (const sgn of [-1, 1]) { g.beginPath(); for (const [a, b] of diamond(CBX, sgn * y, 4, lying ? 3.4 : 5.4)) g.lineTo(a, b); g.closePath(); g.fill(); }
    for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + TAU / 8; g.beginPath(); g.ellipse(CBX + Math.cos(a) * 6.5, Math.sin(a) * 6.5 * (lying ? .6 : 1), 3.6, 2.2, a, 0, TAU); g.fill(); }
    g.beginPath(); g.arc(CBX, 0, 1.8, 0, TAU); g.fill();
    g.setTransform(1, 0, 0, 1, 0, 0); finish(c, seed, 2.4);
    return { c, sh: shadowOf(c, 4), hb, L, KX, CPAD };
  };
  /* drawCross(ctx, X, u0, u1, x, y, a, alpha, shadow): draw only the material [u0, u1] (along the post, foot = 0) of a cross
     sprite X with its foot origin at (x, y), angle a — a sawn-off cross is the same sprite with u0 > 0. */
  P.drawCross = function (ctx, X, u0, u1, x, y, a, alpha = 1, shadow = 1) {
    if (u1 - u0 < .5 || alpha <= 0) return;
    const L = X.L, KX = X.KX, CPAD = X.CPAD;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = alpha;
    const hb = X.hb, dh = 2 * hb + 2 * CPAD;
    const left = u0 <= .5 ? -CPAD : u0, right = u1 >= L - .5 ? L + CPAD : u1;
    if (shadow) { ctx.save(); ctx.rotate(-a); ctx.translate(3 * shadow, 4.5 * shadow); ctx.rotate(a);
      ctx.drawImage(X.sh, (left + CPAD) * KX + 12, 0, (right - left) * KX, X.sh.height, left - 6 / KX * 0, -hb - CPAD - 12 / KX, right - left, dh + 24 / KX); ctx.restore(); }
    ctx.drawImage(X.c, (left + CPAD) * KX, 0, (right - left) * KX, dh * KX, left, -hb - CPAD, right - left, dh);
    ctx.restore();
  };
  // crossOutline(x, y, d) → pts of a lying cross's outline with its foot at (x, y) (for a dashed scissor guide)
  P.crossOutline = function (x, y, d = P.CROSS) { const { L, PW, CBX, CBW } = d, hb = d.CBHL;
    return [[0, -PW / 2], [CBX - CBW / 2, -PW / 2], [CBX - CBW / 2, -hb], [CBX + CBW / 2, -hb], [CBX + CBW / 2, -PW / 2], [L, -PW / 2], [L, PW / 2],
      [CBX + CBW / 2, PW / 2], [CBX + CBW / 2, hb], [CBX - CBW / 2, hb], [CBX - CBW / 2, PW / 2], [0, PW / 2]].map(([a, b]) => [x + a, y + b]); };

  // ------------------------------------------------------------------ background sheets (build once; draw in parallax layers)
  // clouds(x0, y0, x1, y1, o): dark scroll clouds with cut swirls (o.n 6, o.step 430, o.seed 31, o.col) — layer parallax .15
  P.clouds = (x0, y0, x1, y1, o = {}) => sheet(x0, y0, x1, y1, g => {
    const r = rng(o.seed ?? 31);
    for (let k = 0; k < (o.n ?? 6); k++) { const cx = (x0 + 100) + k * (o.step ?? 430) + r() * 120, cy = (y0 + 160) + r() * 220, rx = 150 + r() * 90;
      const pts = []; for (let i = 0; i <= 40; i++) { const a = Math.PI + Math.PI * i / 40; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * rx * .42 - Math.abs(Math.sin(a * 3)) * 26]); }
      fillPts(g, pts, o.col || C.cloud); cutSlit(g, P.swirlPts(cx - rx * .35, cy - 22, 26, 1.5, 0), 4); cutSlit(g, P.swirlPts(cx + rx * .3, cy - 30, 20, 1.4, Math.PI, -1), 3.5);
      cutSlit(g, [[cx - rx * .8, cy - 6], [cx + rx * .8, cy - 6]], 3); }
  }, o.sheetSeed ?? 3);
  /* mountains(x0, y0, x1, y1, o): sawtooth ridges in two tones with crescent strata and a slit along each ridge.
     o.layers [[col, base y, amp, seed]…] (default far 880/190, near 980/140) — layer parallax .35 */
  P.mountains = (x0, y0, x1, y1, o = {}) => sheet(x0, y0, x1, y1, g => {
    const r = rng(o.seed ?? 41);
    for (const [col, base, amp, seed] of (o.layers || [[C.mt, 880, 190, 1], [C.mt2, 980, 140, 2]])) {
      const top = []; for (let x = x0; x <= x1; x += 6) { const n = Pilot.fbm(x / 420 + seed * 7, seed, 3); top.push([x, base - amp * n * 1.4 + amp * .3]); }
      const saw = []; top.forEach((p, i) => saw.push([p[0], p[1] - (i % 2 ? 9 + 6 * r() : 0)]));
      fillPts(g, saw.concat([[x1, y1], [x0, y1]]), col);
      const hs = []; for (let x = x0 + 20; x < x1; x += 34) for (let k = 1; k < 4; k++) { const yy = top[clamp(Math.round((x - x0) / 6), 0, top.length - 1)][1] + 40 * k + (k % 2) * 10; if (yy < y1 - 20) hs.push(crescentPts(x + (k % 2) * 17, yy, 11, .25, Math.PI - .25, 4)); }
      cutPts(g, hs);
      cutSlit(g, top.map(p => [p[0], p[1] + 16]), 2.2);
    }
  }, o.sheetSeed ?? 5);
  /* hills(x0, y0, x1, y1, o): a rolling hill with a sawtooth top, a diamond row, and bare forked trees whose tips are plum
     holes. o.base (1100), o.amp (70), o.trees (true) — layer parallax .65. Returns the sheet with .top (the skyline). */
  P.hills = (x0, y0, x1, y1, o = {}) => { let top; const s = sheet(x0, y0, x1, y1, g => {
    const r = rng(o.seed ?? 53); top = []; for (let x = x0; x <= x1; x += 5) top.push([x, (o.base ?? 1100) - (o.amp ?? 70) * Pilot.fbm(x / 300 + 3, 2, 3) + 20]);
    const saw = top.map((p, i) => [p[0], p[1] - (i % 2 ? 7 + 4 * r() : 0)]);
    fillPts(g, saw.concat([[x1, y1], [x0, y1]]), o.col || C.hill);
    const hs = []; for (let x = x0 + 20; x < x1; x += 26) hs.push(diamond(x, top[clamp(Math.round((x - x0) / 5), 0, top.length - 1)][1] + 40, 5, 3.5));
    cutPts(g, hs);
    if (o.trees !== false) for (let x = x0 + 100; x < x1 - 50; x += 240 + r() * 200) {
      const ty = top[clamp(Math.round((x - x0) / 5), 0, top.length - 1)][1] + 8, h = 110 + r() * 70;
      g.fillStyle = o.tree || C.hill2; g.strokeStyle = o.tree || C.hill2; g.lineCap = 'round';
      const br = (bx, by, a, l, w, d) => { const ex = bx + Math.cos(a) * l, ey = by + Math.sin(a) * l; g.lineWidth = w; g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke();
        if (d > 0) { br(ex, ey, a - .45 - r() * .2, l * .68, w * .62, d - 1); br(ex, ey, a + .4 + r() * .2, l * .62, w * .62, d - 1); } else { g.beginPath(); g.arc(ex, ey, 6, 0, TAU); g.fill(); } };
      br(x, ty, -Math.PI / 2 + (r() - .5) * .2, h * .45, 11, 3);
    }
  }, o.sheetSeed ?? 7); s.top = top; return s; };
  /* road(x0, x1, top, y1, o): the walking surface — a sheet from `top` (its far edge, sawtooth grass) down to y1 with a slit
     inside the grass line, two crescent rows, a diamond band, two slits and a field of big crescents below (rows at
     top + 180 / 216 / 268 / 348…). o.gap [xa, xb]: a ragged chasm cut right through it (the backing shows). */
  P.road = (x0, x1, top, y1, o = {}) => sheet(x0, top - 30, x1, y1, g => {
    const RT = top, edge = sawEdge(x0, x1, RT, 16, 12, o.seed ?? 9);
    fillPts(g, edge.concat([[x1, y1], [x0, y1]]), o.col || C.road);
    cutSlit(g, [[x0, RT + 12], [x1, RT + 12]], 2.4);
    const hs = [];
    for (let x = x0; x < x1; x += 30) { hs.push(crescentPts(x, RT + 180, 12, .3, Math.PI - .3, 4.4)); hs.push(crescentPts(x + 15, RT + 216, 12, .3, Math.PI - .3, 4.4)); }
    for (let x = x0; x < x1; x += 22) hs.push(diamond(x, RT + 268, 6, 4));
    for (let x = x0; x < x1; x += 60) for (let k = 0; k < 4; k++) hs.push(crescentPts(x + (k % 2) * 30, RT + 348 + k * 44, 18, .3, Math.PI - .3, 5));
    cutPts(g, hs);
    cutSlit(g, [[x0, RT + 243], [x1, RT + 243]], 2.2); cutSlit(g, [[x0, RT + 293], [x1, RT + 293]], 2.2);
    if (o.gap) {   // a ragged vertical cut-away (lips slightly overhang, walls step inward as they go down)
      const lip = (x, dir, seed) => { const q = rng(seed), out = []; for (let y = RT - 40; y <= y1 + 10; y += 14) out.push([x + dir * (y < RT + 30 ? 0 : (6 + q() * 16 + (y - RT) * .05)), y]); return out; };
      const L1 = lip(o.gap[0], 1, 71), L2 = lip(o.gap[1], -1, 73);
      cutPts(g, [L1.concat(L2.slice().reverse())]);
    }
  }, o.sheetSeed ?? 11);
  // chasm(xa, xb, top, y1): the inside of a gap — two rock layers stepping down into the dark, crescent strata (behind the road)
  P.chasm = (E, E2, RT, y1) => sheet(E - 40, RT - 10, E2 + 40, y1, g => {
    const r = rng(81);
    for (const [col, inset, yTop] of [[C.cliff1, 20, RT + 60], [C.cliff2, 60, RT + 230]]) {
      const lw = [], rw = []; for (let y = yTop; y <= y1; y += 18) { lw.push([E + inset + r() * 22 + (y - yTop) * .1, y]); rw.push([E2 - inset - r() * 22 - (y - yTop) * .1, y]); }
      fillPts(g, [[E - 40, yTop - 20], ...lw, [E - 40, y1]], col); fillPts(g, [[E2 + 40, yTop - 20], ...rw, [E2 + 40, y1]], col);
      const hs = []; for (let y = yTop + 40; y < y1 - 20; y += 46) { hs.push(crescentPts(E + inset * .5 + 4, y, 10, -.9, .9, 4)); hs.push(crescentPts(E2 - inset * .5 - 4, y + 20, 10, Math.PI - .9, Math.PI + .9, 4)); }
      cutPts(g, hs);
    }
  }, 13);
  /* gate(x, by, top): a plain red arch (two posts, a round arch with diamond lace) with two lattice door leaves ajar — the
     light comes through its holes. (x, by) = centre on the lane's ground; arch centre at by + 4 − 330; sheet from `top`. */
  P.gate = (x, by, top) => sheet(x - 160, top, x + 160, by + 8, g => {
    const gy = by + 4, ay = gy - 330, arc = (r, a0, a1, n = 36) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([x + Math.cos(a) * r, ay + Math.sin(a) * r]); } return o; };
    fillPts(g, [[x - 134, gy], ...arc(134, Math.PI, TAU), [x + 134, gy], [x + 98, gy], ...arc(98, 0, -Math.PI), [x - 98, gy]], C.gate);
    fillPts(g, [[x - 146, gy], [x - 146, gy - 34], [x - 90, gy - 34], [x - 90, gy]], C.gate); fillPts(g, [[x + 90, gy], [x + 90, gy - 34], [x + 146, gy - 34], [x + 146, gy]], C.gate);
    const hs = []; for (let i = 0; i < 15; i++) { const a = Math.PI + Math.PI * (i + .5) / 15; hs.push(diamond(x + Math.cos(a) * 116, ay + Math.sin(a) * 116, 6, 6)); }
    for (let yy = ay + 20; yy < gy - 50; yy += 26) { hs.push(diamond(x - 116, yy, 5, 7)); hs.push(diamond(x + 116, yy, 5, 7)); }
    cutPts(g, hs); cutSlit(g, [[x - 146, gy - 40], [x + 146, gy - 40]].map(p => p), 0.1);
    for (const sgn of [-1, 1]) {
      const r = 94, inner = sgn * 15, outer = sgn * 94, leaf = [[x + inner, gy], [x + outer, gy], [x + outer, ay]];
      const a0 = sgn < 0 ? Math.PI : 0, a1 = sgn < 0 ? Math.PI * 1.5 - Math.asin(15 / r) * 0 : -Math.PI / 2;
      for (let i = 1; i <= 24; i++) { const a = a0 + (a1 - a0) * i / 24, px = x + Math.cos(a) * r; if (sgn * (px - x) < 15) break; leaf.push([px, ay + Math.sin(a) * r]); }
      leaf.push([x + inner, ay - Math.sqrt(r * r - 15 * 15)]);
      fillPts(g, leaf, C.gate);
      const hl = [];
      for (let yy = ay - 70; yy < gy - 150; yy += 22) for (let xx = 26; xx < 86; xx += 18) { const px = x + sgn * (xx + ((yy / 22 | 0) % 2) * 9), dx = px - x;
        if (Math.abs(dx) > 84 || Math.abs(dx) < 24) continue; if (yy < ay && (yy - 12) < ay - Math.sqrt(Math.max(0, (r - 14) ** 2 - dx * dx))) continue; hl.push(diamond(px, yy, 7, 9)); }
      cutPts(g, hl);
      const cx = x + sgn * 55, cy = gy - 90; g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
      for (let k = 0; k < 8; k++) { const an = k * TAU / 8; g.beginPath(); g.ellipse(cx + Math.cos(an) * 17, cy + Math.sin(an) * 17, 9, 4.2, an, 0, TAU); g.fill(); }
      g.beginPath(); g.arc(cx, cy, 5.5, 0, TAU); g.fill(); g.restore();
    }
  }, 17);
  P.archPath = function (x, by, r) { const p = new Path2D(), gy = by + 4, ay = gy - 330; p.moveTo(x - r, gy); p.lineTo(x - r, ay); p.arc(x, ay, r, Math.PI, TAU); p.lineTo(x + r, gy); p.closePath(); return p; };
  /* gateLight(ctx, x, by): the backing lit from behind the arch (draw BEFORE the gate sheet); gateSpill(ctx, x, by): the warm
     'lighter' spill and the light on the road in front (draw AFTER it). */
  P.gateLight = function (ctx, x, by) {
    const lg = ctx.createRadialGradient(x, by - 180, 20, x, by - 180, 280); lg.addColorStop(0, C.light); lg.addColorStop(.5, C.light2); lg.addColorStop(1, 'rgba(236,140,60,0)');
    ctx.fillStyle = lg; ctx.fillRect(x - 280, by - 470, 560, 480);
    ctx.fillStyle = C.light; ctx.fill(P.archPath(x, by, 97));
  };
  P.gateSpill = function (ctx, x, by) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const sp = ctx.createRadialGradient(x, by - 170, 10, x, by - 120, 300);
    sp.addColorStop(0, 'rgba(255,214,150,.28)'); sp.addColorStop(1, 'rgba(255,170,90,0)'); ctx.fillStyle = sp; ctx.fillRect(x - 320, by - 520, 640, 560);
    ctx.fillStyle = 'rgba(255,200,130,.16)'; ctx.beginPath(); ctx.moveTo(x - 20, by + 2); ctx.lineTo(x + 20, by + 2); ctx.lineTo(x + 150, by + 60); ctx.lineTo(x - 170, by + 60); ctx.fill(); ctx.restore();
  };
  /* lightWindow(ctx, x, y, r, a, o): the accent light — the backing glows warm (C.light → C.light2) in a disc of radius r
     behind the pieces, a = 0..1. Draw it in the world after the ground sheet and before the pieces it backlights;
     o.rays = number of pale ray strips (0), o.rayA their alpha (.35), o.rot their rotation. */
  P.lightWindow = function (ctx, x, y, r, a, o = {}) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; const lg = ctx.createRadialGradient(x, y, r * .07, x, y, r); lg.addColorStop(0, C.light); lg.addColorStop(.45, C.light2); lg.addColorStop(1, 'rgba(236,140,60,0)');
    ctx.fillStyle = lg; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    const n = o.rays || 0; if (n) { ctx.fillStyle = `rgba(255,236,190,${o.rayA ?? .35})`; for (let i = 0; i < n; i++) { const an = (o.rot || 0) + i * TAU / n, w = .07;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(an - w) * r * 1.1, y + Math.sin(an - w) * r * 1.1); ctx.lineTo(x + Math.cos(an + w) * r * 1.1, y + Math.sin(an + w) * r * 1.1); ctx.fill(); } }
    ctx.restore();
  };
  // glow(ctx, x, y, R, a, rgb0, rgb1): a warm 'lighter' glow (pieces that matter light up)
  P.glow = function (ctx, x, y, R, a, rgb0 = '255,214,140', rgb1 = '255,190,110') {
    const g = ctx.createRadialGradient(x, y, 10, x, y, R); g.addColorStop(0, `rgba(${rgb0},${a})`); g.addColorStop(1, `rgba(${rgb1},0)`);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - R, y - R, 2 * R, 2 * R); ctx.restore();
  };
  /* scissorGuide(ctx, t, pts, clip, al, glow): a dashed scissor guide (crawling dashes) round an outline of what should be
     there; clip = [x, y, w, h] reveals it progressively; glow 0..1 adds a warm 'lighter' halo. */
  P.scissorGuide = function (ctx, t, pts, clip, al, glow = 0) {
    ctx.save(); ctx.globalAlpha = al; ctx.beginPath(); ctx.rect(...clip); ctx.clip();
    ctx.fillStyle = 'rgba(235,196,114,.22)'; ctx.fill(pathOf(pts));
    ctx.setLineDash([14, 9]); ctx.lineDashOffset = -t * 18; ctx.lineWidth = 4.5; ctx.strokeStyle = `rgba(242,214,150,${.8 + .2 * glow})`; ctx.stroke(pathOf(pts)); ctx.setLineDash([]);
    if (glow > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 12; ctx.strokeStyle = `rgba(255,210,140,${.25 * glow})`; ctx.stroke(pathOf(pts)); }
    ctx.restore();
  };
  /* flecks — THE HIT / a cut: paper scraps thrown off and settling. fleck(o) → spec { t0, x, y, vx, vy, land (y where it
     settles), r0, vr, sz, col }; drawFlecks(ctx, t, list) draws them (fade 1.2–1.8 s after t0). */
  P.drawFlecks = function (ctx, t, list) {
    for (const q of list) {
      const u = t - q.t0; if (u < 0) continue; const al = 1 - ss(q.t0 + 1.2, q.t0 + 1.8, t); if (al <= 0) continue;
      const tl = (-q.vy + Math.sqrt(q.vy * q.vy + 4 * 700 * (q.land - q.y))) / 1400, uu = Math.min(u, Math.max(0, tl));
      const x = q.x + q.vx * uu, y = q.y + q.vy * uu + 700 * uu * uu, r = q.r0 + q.vr * uu;
      ctx.globalAlpha = al; ctx.fillStyle = q.col; ctx.beginPath();
      for (let i = 0; i < 3; i++) { const a = r + i * TAU / 3 + (i === 1 ? .5 : 0); ctx.lineTo(x + Math.cos(a) * q.sz, y + Math.sin(a) * q.sz * .7); } ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  // burst(list, n, seed, o): push n flecks thrown from (o.x, o.y) at o.t0 (o.spread px wide, o.up px/s, o.land, o.cols)
  P.burst = function (list, n, seed, o) { const r = rng(seed);
    for (let i = 0; i < n; i++) list.push({ t0: o.t0 + r() * (o.dt ?? .1), x: o.x + (r() - .5) * (o.spread ?? 30), y: o.y, vx: (r() - .5) * (o.vx ?? 300), vy: -((o.up0 ?? 80) + r() * (o.up ?? 240)),
      land: o.land ?? o.y + 30, r0: r() * TAU, vr: (r() - .5) * 22, sz: 4 + r() * 5, col: (o.cols || [C.gold])[i % (o.cols || [C.gold]).length] }); return list; };

  // ------------------------------------------------------------------ the jointed cut-out figure (rig)
  /* A figure spec F = { s (scale; 1 ≈ 400 px tall), f (+1 faces right, −1 left; fractional = a squashed turn), col, gy (ground y),
       hip: [x, y], ang (torso lean, + = toward +x: use f·lean), feet: [far, near] ground targets, hands: [far, near] grip
       targets or null (hang), hand: [far, near] 'fist' | 'flat' | 'open', tilt (head nod, same sign rule as ang),
       eye 'calm' | 'strain' | 'shock' | 'down', sway (skirt swing px), farFront (far arm drawn over the body), alpha }.
     Pieces: head (hood with a slit, crescent eye), tunic with a belt slit + diamond lace, skirt with a sawtooth hem,
     2-bone arms (upper 78, fore 74) and legs (thigh 96, shin 90), shoes — each pinned paper with an inset slit.
     Joints by IK with fixed bone lengths: elbows hang down/back, knees point forward. */
  const ik = P.ik = function (a, t, l1, l2, pick) {
    let dx = t[0] - a[0], dy = t[1] - a[1], d = Math.hypot(dx, dy) || 1e-6; const dd = clamp(d, Math.abs(l1 - l2) + .5, l1 + l2 - .5);
    const tx = a[0] + dx / d * dd, ty = a[1] + dy / d * dd, an = Math.atan2(ty - a[1], tx - a[0]), b = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
    const j1 = [a[0] + Math.cos(an + b) * l1, a[1] + Math.sin(an + b) * l1], j2 = [a[0] + Math.cos(an - b) * l1, a[1] + Math.sin(an - b) * l1];
    return [pick(j1, j2), [tx, ty]];
  };
  // frame(F) → { up, fw, P(a, b) }: the torso frame — P(a, b) = hip + forward·a + up·b (× s)
  const frame = P.frame = function (F) {
    const up = [Math.sin(F.ang), -Math.cos(F.ang)], fw = [F.f * Math.cos(F.ang), F.f * Math.sin(F.ang)], s = F.s;
    return { up, fw, P: (a, b) => [F.hip[0] + fw[0] * a * s + up[0] * b * s, F.hip[1] + fw[1] * a * s + up[1] * b * s] };
  };
  const shoulderOf = P.shoulderOf = F => frame(F).P(4, 136);
  /* drawFig(ctx, F, mid, back): draw a figure. back() runs first (a load behind the body), mid() after the head and before
     the near arm (a thing held in front of the body: the near hand then closes over it). Layers: back → far arm (unless
     farFront) → far leg → near leg → skirt → tunic → head → mid → far arm (if farFront) → near arm. */
  P.drawFig = function (ctx, F, mid, back) {
    const s = F.s, f = F.f, col = F.col, far = P.shade(col, .74), { up, fw, P: Pt } = frame(F);
    const al = F.alpha ?? 1; if (al <= 0) return; ctx.save(); ctx.globalAlpha = al;
    const sh = Pt(4, 136), shF = Pt(-3, 134);
    const elbowPick = (a, b) => (a[1] - f * a[0] * .35) > (b[1] - f * b[0] * .35) ? a : b, kneePick = (a, b) => f * a[0] > f * b[0] ? a : b;
    const arm = (S0, T, c, type, k) => {
      if (!T) T = [S0[0] - f * 8 * s, S0[1] + 140 * s];
      const [el, hd] = ik(S0, T, 78 * s, 74 * s, elbowPick);
      paper(ctx, pathOf(capsule(S0, el, 19 * s, 15 * s)), c, { inset: 2.2 * s, sh: .8 });
      paper(ctx, pathOf(capsule(el, hd, 15 * s, 11 * s)), c, { inset: 2 * s, sh: .8 });
      const an = Math.atan2(hd[1] - el[1], hd[0] - el[0]);
      let pts;
      if (type === 'flat') pts = [[-4, -7], [10, -8], [24, -5], [28, 0], [22, 4], [-2, 6], [-8, 2]].map(([u, v]) => [hd[0] + f * u * s, hd[1] + v * s - 4 * s]);
      else if (type === 'open') pts = [[-6, -8], [16, -9], [26, -4], [18, -2], [27, 2], [16, 5], [-2, 9], [-8, 2]].map(([u, v]) => [hd[0] + (Math.cos(an) * u - Math.sin(an) * v) * s, hd[1] + (Math.sin(an) * u + Math.cos(an) * v) * s]);
      else { pts = []; for (let i = 0; i < 10; i++) { const q = i / 10 * TAU; pts.push([hd[0] + Math.cos(q) * 12.5 * s, hd[1] + Math.sin(q) * 11 * s]); }
        pts.splice(7, 0, [hd[0] + (Math.cos(an - 1.9) * 15) * s, hd[1] + (Math.sin(an - 1.9) * 15) * s]); }
      paper(ctx, pathOf(pts), c, { sh: .8 });
      if (type === 'fist') { ctx.strokeStyle = C.back; ctx.lineWidth = 1.6 * s; ctx.beginPath(); for (let i = 0; i < 3; i++) { const q = an + .5 + i * .45; ctx.moveTo(hd[0] + Math.cos(q) * 4 * s, hd[1] + Math.sin(q) * 4 * s); ctx.lineTo(hd[0] + Math.cos(q) * 10 * s, hd[1] + Math.sin(q) * 10 * s); } ctx.stroke(); }
    };
    const leg = (T, c) => {
      const hp = Pt(-2, -2), ank = [T[0], T[1] - 9 * s];
      const [kn, an] = ik(hp, ank, 96 * s, 90 * s, kneePick);
      paper(ctx, pathOf(capsule(hp, kn, 24 * s, 19 * s)), c, { inset: 2.2 * s, sh: .8 });
      paper(ctx, pathOf(capsule(kn, an, 19 * s, 13 * s)), c, { inset: 2 * s, sh: .8 });
      const lift = Math.max(0, F.gy - T[1]), toe = lift > 6 * s ? .35 : 0;
      const shoe = [[-10, -12], [8, -12], [30, -5], [36, 1], [-11, 1]].map(([u, v]) => { const cu = Math.cos(toe), su = Math.sin(toe); return [an[0] + f * (u * cu - v * su) * s, an[1] + 9 * s + (u * su + v * cu) * s]; });
      paper(ctx, pathOf(shoe), c, { sh: .8 });
    };
    if (back) back();
    if (!F.farFront) arm(shF, F.hands[0], far, F.hand?.[0] || 'fist', 0);
    leg(F.feet[0], far); leg(F.feet[1], P.shade(col, .9));
    const hemD = Math.max(36 * s, F.gy - F.hip[1] - 44 * s), sw = (F.sway || 0) * s;
    const skx = (a, b) => [F.hip[0] + f * a * s + sw * b / hemD, F.hip[1] + b];
    const sk = [skx(-28, -8), skx(27, -8), skx(38, hemD * .55), skx(48, hemD), skx(-46, hemD), skx(-38, hemD * .55)];
    paper(ctx, pathOf(sk), col, { inset: 3.2 * s });
    const hs = []; for (let i = 0; i < 8; i++) { const u = -40 + i * 11.5, p = skx(u, hemD - 2); hs.push([[p[0] - 3.5 * s, p[1]], [p[0] + 3.5 * s, p[1]], [p[0] + f * .5, p[1] - 13 * s]]); }
    for (let i = 0; i < 3; i++) { const p = skx(-22 + i * 22, hemD * .45); hs.push(crescentPts(p[0], p[1], 9 * s, .3, Math.PI - .3, 3.5 * s, 8)); }
    holes(ctx, hs);
    const tor = [[-26, -6], [-31, 40], [-32, 100], [-25, 138], [-10, 150], [10, 152], [24, 141], [28, 110], [30, 60], [26, -6]].map(([a, b]) => Pt(a, b));
    paper(ctx, pathOf(tor), col, { inset: 3.4 * s });
    const th = [[Pt(-30, 14), Pt(-28, 8), Pt(28, 8), Pt(27, 14)]]; for (let k = 0; k < 4; k++) { const c0 = Pt(12, 40 + k * 22); th.push(diamond(c0[0], c0[1], 4.5 * s, 6 * s)); }
    holes(ctx, th);
    const tilt = F.ang + (F.tilt || 0), hu = [Math.sin(tilt), -Math.cos(tilt)], hf = [f * Math.cos(tilt), f * Math.sin(tilt)], N = Pt(6, 146);
    const Hc = [N[0] + hu[0] * 30 * s + hf[0] * 4 * s, N[1] + hu[1] * 30 * s + hf[1] * 4 * s], Q = (a, b) => [Hc[0] + (hf[0] * a + hu[0] * b) * s, Hc[1] + (hf[1] * a + hu[1] * b) * s];
    const head = [[-22, -40], [-33, -18], [-37, 4], [-34, 22], [-24, 34], [-8, 40], [6, 40], [16, 32], [26, 20], [30, 8], [37, 0], [30, -5], [31, -11], [27, -15], [28, -20], [20, -27], [8, -32], [6, -44], [-14, -46]].map(([a, b]) => Q(a, b));
    paper(ctx, pathOf(head), col, { inset: 2.6 * s });
    ctx.strokeStyle = C.back; ctx.lineCap = 'round'; ctx.lineWidth = 3 * s;
    ctx.beginPath(); const hv = [[14, 31], [4, 22], [0, 6], [2, -12], [8, -28]].map(([a, b]) => Q(a, b)); ctx.moveTo(...hv[0]); for (const p of hv.slice(1)) ctx.lineTo(...p); ctx.stroke();
    const eye = F.eye || 'calm', E0 = Q(19, 8);
    if (eye === 'strain') { ctx.lineWidth = 2.6 * s; ctx.beginPath(); ctx.moveTo(...Q(12, 9)); ctx.lineTo(...Q(19, 6)); ctx.lineTo(...Q(25, 9)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(...Q(12, 16)); ctx.lineTo(...Q(24, 13)); ctx.stroke(); }
    else if (eye === 'down') { ctx.lineWidth = 2.6 * s; ctx.beginPath(); ctx.moveTo(...Q(13, 6)); ctx.quadraticCurveTo(...Q(19, 2), ...Q(25, 6)); ctx.stroke(); }
    else { const r0 = eye === 'shock' ? 6.5 : 5; holes(ctx, [crescentPts(E0[0], E0[1], r0 * s, Math.atan2(hu[1], hu[0]) - 1.2, Math.atan2(hu[1], hu[0]) + 1.2, 2.4 * s, 8)]);
      ctx.fillStyle = C.back; ctx.beginPath(); ctx.arc(E0[0] + hf[0] * 1.5 * s, E0[1] + hf[1] * 1.5 * s, (eye === 'shock' ? 2.2 : 2.6) * s, 0, TAU); ctx.fill(); }
    ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(...Q(24, -11)); ctx.lineTo(...Q(30, eye === 'shock' ? -13 : -10)); ctx.stroke();
    if (mid) mid();
    if (F.farFront) arm(shF, F.hands[0], far, F.hand?.[0] || 'fist', 0);
    arm(sh, F.hands[1], col, F.hand?.[1] || 'fist', 1);
    ctx.restore();
  };
  // ---- pose specs (all return a fresh F; combine with mixSpec; pose on 12 fps steps: pass t12(t))
  // walkSpec(x, gy, s, f, ph, stride, lean, lift): a walk at phase ph (0..1) — feet planted for 58 % of the cycle (no sliding)
  P.walkSpec = function (x, gy, s, f, ph, stride, lean, lift = 22) {
    const feet = [0, 1].map(i => { const p = frac(ph + i * .5); let off, up = 0;
      if (p < .58) off = stride * (.29 - p); else { const u = (p - .58) / .42; off = -.29 * stride + .58 * stride * eio(u); up = lift * Math.sin(Math.PI * u); }
      return [x + f * off * s, gy - up * s]; });
    const hipH = (176 - 5 * Math.abs(Math.sin(TAU * ph))) * s;
    return { s, f, gy, hip: [x, gy - hipH], ang: f * lean, feet, hands: [null, null], hand: ['fist', 'fist'], tilt: 0, eye: 'calm', sway: -f * 7 * Math.sin(TAU * ph), ph };
  };
  P.standSpec = function (x, gy, s, f, lean = .05) { return { s, f, gy, hip: [x, gy - 178 * s], ang: f * lean, feet: [[x - f * 18 * s, gy], [x + f * 22 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: 0, eye: 'calm', sway: 0 }; };
  // crouchSpec(x, gy, s, f, lean): squatting over something on the ground, feet wide (lean ≈ 1.1 = bent right over)
  P.crouchSpec = function (x, gy, s, f, lean = 1.1) { return { s, f, gy, hip: [x, gy - 84 * s], ang: f * lean, feet: [[x - f * 74 * s, gy], [x + f * 60 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: .32, eye: 'calm', sway: 0 }; };
  /* kneelSpec(x, gy, s, f, lean): one knee down — the far leg kneels (knee on the ground ahead of the hip, shin and toes
     flat behind), the near foot is planted forward with its knee up. Bone lengths stay exact. */
  P.kneelSpec = function (x, gy, s, f, lean = .25) {
    const K = [x + f * 26 * s, gy - 6 * s], th = .3, hip = [K[0] - f * Math.sin(th) * 96 * s, K[1] - Math.cos(th) * 96 * s];
    const ank = [K[0] - f * Math.cos(.06) * 90 * s, K[1] + Math.sin(.06) * 90 * s];
    return { s, f, gy, hip, ang: f * lean, feet: [[ank[0], ank[1] + 9 * s], [x + f * 92 * s, gy]], hands: [null, null], hand: ['fist', 'fist'], tilt: 0, eye: 'calm', sway: 0, kneel: true };
  };
  // hangHands(F, swing) → [far, near] relaxed hand targets (swing px fore/aft, e.g. 26·sin(2π·ph) when walking)
  const hangHands = P.hangHands = function (F, swing = 0) { const fr = frame(F), sh = fr.P(4, 136); return [[sh[0] - F.f * (10 + swing) * F.s, sh[1] + 140 * F.s], [sh[0] - F.f * (10 - swing) * F.s, sh[1] + 140 * F.s]]; };
  // mixSpec(A, B, k): an in-between of two specs (hips, feet, hands lerp; null hands become hanging hands)
  P.mixSpec = function (A, B, k) {
    if (k <= 0) return A; if (k >= 1) return B;
    const l2 = (a, b) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], hA = hangHands(A), hB = hangHands(B);
    const pick = k < .5 ? A : B;
    return { ...pick, s: lerp(A.s, B.s, k), gy: lerp(A.gy, B.gy, k), hip: l2(A.hip, B.hip), ang: lerp(A.ang, B.ang, k), feet: [l2(A.feet[0], B.feet[0]), l2(A.feet[1], B.feet[1])],
      hands: [0, 1].map(i => l2(A.hands[i] || hA[i], B.hands[i] || hB[i])), hand: pick.hand.slice(), tilt: lerp(A.tilt || 0, B.tilt || 0, k), sway: lerp(A.sway || 0, B.sway || 0, k) };
  };
  // turn(t, at, from, to, dur): a stepped (12 fps) turn passing through squashed in-betweens (±.4) — use as F.f
  P.turn = function (t, at, from, to, dur = .25) { const u = clamp((t12(t) - at) / dur); return u <= 0 ? from : u >= 1 ? to : u < .5 ? from * .4 : to * .4; };
  // ---- a long piece held by a figure. X = { x, y, a, u0, lie } = foot origin, angle, material start (cut-off), lying?
  /* carry(F, d, left, a0) → X: a long piece on the shoulder (d = P.CROSS-like dims; left = fraction of its length still
     there; a0 = its tilt for a figure facing right, −.5 ≈ head up and forward). The post rests on the shoulder. */
  P.carry = function (F, d, left, a0) {
    const L = d.L, PW = d.PW, fr = frame(F), sh = shoulderOf(F), T = [sh[0] + fr.up[0] * 11 * F.s, sh[1] + fr.up[1] * 11 * F.s];
    const a = F.f > 0 ? a0 : Math.PI - a0, dv = [Math.cos(a), Math.sin(a)]; let n = [dv[1], -dv[0]]; if (n[1] > 0) n = [-n[0], -n[1]];
    const contact = L - Math.min(282, left * L - 36);
    return { x: T[0] + n[0] * PW / 2 - dv[0] * contact, y: T[1] + n[1] * PW / 2 - dv[1] * contact, a, contact, u0: L * (1 - left), lie: false };
  };
  const cpt = P.cpt = (X, u, v = 0) => [X.x + Math.cos(X.a) * u - Math.sin(X.a) * v, X.y + Math.sin(X.a) * u + Math.cos(X.a) * v];   // a point u along / v across a piece
  // gripCarry(F, X, L): both hands on the carried post, ahead of the shoulder contact (mutates and returns F)
  P.gripCarry = function (F, X, L = P.CROSS.L) { F.hands = [cpt(X, Math.min(L - 16, X.contact + 26)), cpt(X, Math.min(L - 14, X.contact + 80))]; F.hand = ['fist', 'fist']; return F; };
  P.mixX = (A, B, k) => k <= 0 ? A : k >= 1 ? B : { ...B, x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), a: lerp(A.a, B.a, k), u0: B.u0, lie: k > .62 ? B.lie : A.lie };
  P.rotAbout = function (X, pv, th) { const ox = X.x - pv[0], oy = X.y - pv[1]; return { ...X, x: pv[0] + ox * Math.cos(th) - oy * Math.sin(th), y: pv[1] + ox * Math.sin(th) + oy * Math.cos(th), a: X.a + th }; };
  P.hangGrip = (F, sw = 0) => { const sh = shoulderOf(F); return [sh[0] + F.f * (16 + sw) * F.s, sh[1] + 128 * F.s]; };   // a hand carrying something light at the side
  P.rIdx = F => F.f > 0 ? 1 : 0; P.lIdx = F => F.f > 0 ? 0 : 1;   // which hand index is the figure's right / left

  // ------------------------------------------------------------------ camera
  P.mixCam = (a, b, k) => k <= 0 ? a : k >= 1 ? b : { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
  /* layer(ctx, cm, p, fn): draw fn() in a parallax layer — p = 1 world, .65 hills, .35 mountains, .15 clouds (moves and zooms
     less the further back). cm = { x, y, z, sx?, sy? } (sx/sy: shake px). */
  P.layer = function (ctx, cm, p, fn) { const W2 = Pilot.W / 2, H2 = Pilot.H / 2, z = 1 + (cm.z - 1) * p, cx = cm.x * p, cy = H2 + (cm.y - H2) * p; ctx.save(); ctx.setTransform(z, 0, 0, z, W2 - cx * z + (cm.sx || 0) * p, H2 - cy * z + (cm.sy || 0) * p); fn(); ctx.restore(); };
  // shake(t, at, dur, amp): { sx, sy } decaying after a hit
  P.shake = (t, at, dur = .55, amp = 15) => { const k = 1 - ss(at, at + dur, t); return t >= at ? { sx: amp * k * Math.sin(t * 97), sy: amp * .73 * k * Math.sin(t * 131 + 1) } : { sx: 0, sy: 0 }; };
  // grain(ctx, cm): paper grain over everything (soft-light .55), locked to the world so it moves with the camera
  P.grain = function (ctx, cm) {
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = .55;
    P.GRAIN.setTransform(new DOMMatrix([cm.z, 0, 0, cm.z, Pilot.W / 2 - cm.x * cm.z, Pilot.H / 2 - cm.y * cm.z])); ctx.fillStyle = P.GRAIN; ctx.fillRect(0, 0, Pilot.W, Pilot.H); ctx.restore();
  };

  // ------------------------------------------------------------------ words
  // captionPlates(ctx, t, lines): a dark paper plate with notched ends behind each line, dropping in on 12 fps
  P.captionPlates = function (ctx, t, lines) {
    const SERIF = P.SERIF, SANS = P.SANS, cx = Pilot.W / 2;
    for (const [a, b, s, src] of lines) {
      const al = Pilot.win(t, a, b, .35, .45); if (al <= 0) continue;
      const ls = s.split('\n'), size = ls.length > 1 ? 54 : 62, y = 440, lh = size * 1.55;
      ctx.font = `700 ${size}px ${SERIF}`; let w = Math.max(...ls.map(l => ctx.measureText(Pilot.tr(l)).width));
      let top = y - size * 1.08 - 26, bot = y + (ls.length - 1) * lh + size * .38 + 26;
      if (src) { ctx.font = `400 28px ${SANS}`; w = Math.max(w, ctx.measureText(src).width); bot = y + (ls.length > 1 ? size * 1.55 : 0) + 76 + 22; }
      const hw = w / 2 + 64, drop = 14 * (1 - eo(clamp((t12(t) - a) / .17))), x0 = cx - hw, x1 = cx + hw, mY = (top + bot) / 2;
      const pts = [[x0, top + drop], [x1, top + drop], [x1 - 26, mY + drop], [x1, bot + drop], [x0, bot + drop], [x0 + 26, mY + drop]];
      ctx.save(); ctx.globalAlpha = al * .82; paper(ctx, pathOf(pts), '#0b0d1f', { sh: 1.2 }); ctx.restore();
    }
  };
  // captions(ctx, t, lines, end): plates + words (hidden from `end` on, when the curtain comes down)
  P.captions = function (ctx, t, lines, end = Infinity) { if (t < end) { P.captionPlates(ctx, t, lines); Story.captions(ctx, t, lines, P.CAP); } };
  /* curtain(ctx, t, at): the end — a dark sheet with a sawtooth edge drops over the frame (from at − .15, .4 s), with red
     paper border strips (diamond lace, sawtooth teeth) above and below where the card sits. */
  P.curtain = function (ctx, t, at) {
    const W = Pilot.W, H = Pilot.H;
    const k = eo((t - (at - .15)) / .4); if (k <= 0) return;
    const yb = lerp(-60, H + 60, k), r = rng(5), edge = []; for (let x = -20, i = 0; x <= W + 20; x += 14, i++) edge.push([x, yb + (i % 2 ? 16 + 6 * r() : 0)]);
    paper(ctx, pathOf([[-20, -20], [W + 20, -20], ...edge.reverse()]), C.back2, { sh: 2 });
    for (const [y, dir] of [[560, -1], [1210, 1]]) { const sy = y - (H - yb) * 1.0; if (sy > yb) continue;
      const top = [[120, sy - 6], [W - 120, sy - 6], [W - 120, sy + 6], [120, sy + 6]];
      paper(ctx, pathOf(top), C.gate, { sh: 1 }); holes(ctx, [...Array(28)].map((_, i) => diamond(150 + i * 28.7, sy, 4.5, 3)));
      const teeth = []; for (let x = 128; x < W - 128; x += 16) teeth.push([[x, sy + dir * 6], [x + 8, sy + dir * 18], [x + 16, sy + dir * 6]]);
      ctx.fillStyle = C.gate; for (const q of teeth) { ctx.beginPath(); ctx.moveTo(...q[0]); ctx.lineTo(...q[1]); ctx.lineTo(...q[2]); ctx.fill(); } }
  };
  // endCard(ctx, t, card, at): the card in cream on the curtain (portrait y 860)
  P.endCard = function (ctx, t, card, at) { Story.endCard(ctx, t, card, at, { font: P.SERIF, color: C.ink, srcColor: '#ddcdb3', y: 860, titleShadow: 'rgba(0,0,0,.5)' }); };

  window.Papercut = P;
})();

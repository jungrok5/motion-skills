/* ep3-twist-fx.js — small drawing helpers for 「마지막 도넛」 ep3 that neither the webtoon kit nor donut-cast.js has (yet).
   Global: window.EP3. Load after kit-webtoon.js and donut-cast.js. All pure functions of their arguments (t passed in).
     EP3.plan(S, stops)          camera stops written as absolute { arrive, leave } times → Webtoon.camera (glide = arrive − previous leave)
     EP3.stack(ctx, x, y, w, n, o) n closed donut boxes stacked (x, y = bottom box's front-bottom centre) → top y
     EP3.collar(ctx, a, b, col, w) a shirt collar stretched like rubber from a neck a to a fist b (SD drag gag)
     EP3.rubble(ctx, x, y, w, seed, o) a little heap of grey stone rubble (what is left after Cast.crumble), o.k grows it in
     EP3.dust(ctx, t, x, y, o)   trailing dust puffs behind something sliding (drag / skid), o { dir, n, r, rate, seed }
     EP3.streaks(ctx, t, pts, o) motion streaks along a path (a fast hand entering): white lines behind the moving point
     EP3.crumbs(ctx, t, t0, x, y, o) bite crumbs that burst out and fall (바삭), o { n, r, g, seed, col }
     EP3.nextLine(ctx, t, at, s, o) the end card's "다음 화" line on our own timing (the kit's endCard shows it only at +1 s) */
(function () {
  const WT = window.Webtoon, C = window.Cast, { clamp, lerp, ss, eo, rng } = Pilot, TAU = Math.PI * 2;
  const E = {};
  E.plan = function (S, stops) {
    const out = []; let prev = null;
    for (const s of stops) { const st = Object.assign({}, s); delete st.arrive; delete st.leave;
      if (prev != null) { const g = s.arrive - prev; if (g <= 0) st.cut = true; else st.glide = g; }
      st.hold = Math.max(0, s.leave - s.arrive); out.push(st); prev = s.leave; }
    return WT.camera(S, out, { t0: stops[0].arrive });
  };
  E.stack = function (ctx, x, y, w, n = 3, o = {}) {
    const h = w * .2; let yy = y;
    for (let i = 0; i < n; i++) { const dx = (o.jig || [0, -8, 6, -4])[i % 4] * w / 260; C.box(ctx, x + dx, yy, w, { open: false, t: o.t, seed: 3 + i }); yy -= h; }
    return yy - w * .42;
  };
  E.collar = function (ctx, a, b, col, w = 18) {
    const ink = WT.C.ink, mid = [lerp(a[0], b[0], .5), lerp(a[1], b[1], .5) + 10], pts = WT.qb(a, mid, b, 12);
    WT.taper(ctx, pts, w + 8, w * .45 + 8, ink); WT.taper(ctx, pts, w, w * .45, col);
    ctx.save(); ctx.strokeStyle = WT.rgba(ink, .35); ctx.lineWidth = 2; ctx.lineCap = 'round';   // a couple of stretch creases
    for (const k of [.3, .55, .78]) { const p = pts[Math.round(k * 12)], q = pts[Math.min(12, Math.round(k * 12) + 1)], ang = Math.atan2(q[1] - p[1], q[0] - p[0]) + Math.PI / 2, L = w * (1 - k * .5) * .32;
      ctx.beginPath(); ctx.moveTo(p[0] - Math.cos(ang) * L, p[1] - Math.sin(ang) * L); ctx.lineTo(p[0] + Math.cos(ang) * L * .4, p[1] + Math.sin(ang) * L * .4); ctx.stroke(); }
    ctx.restore();
  };
  E.rubble = function (ctx, x, y, w, seed = 1, o = {}) {
    const k = o.k ?? 1; if (k <= 0) return; const r = rng(seed), ink = WT.C.ink, N = o.n || 9;
    ctx.save(); ctx.fillStyle = 'rgba(60,60,80,.16)'; ctx.beginPath(); ctx.ellipse(x, y + 4, w * .62, w * .12, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < N; i++) { const u = i / N, px = x + (r() - .5) * w * (1 - u * .55), sz = w * (.13 + r() * .1) * (1 - u * .35) * k, py = y - sz * .5 - u * w * .32 * k;
      const pts = []; const m = 5 + (r() * 3 | 0); for (let j = 0; j < m; j++) { const a = j / m * TAU + r() * .5, rr = sz * (.65 + r() * .45); pts.push([px + Math.cos(a) * rr, py + Math.sin(a) * rr * .8]); }
      const p = WT.poly(pts), g = 140 + (r() * 60 | 0), c = `rgb(${g},${g},${g + 6})`; WT.inked(ctx, p, c, Math.max(2, w * .012), ink); WT.cel(ctx, p, c, WT.shadeOf(c), sz * .25, sz * .2); }
    ctx.restore();
  };
  E.dust = function (ctx, t, x, y, o = {}) {
    const dir = o.dir ?? 1, n = o.n ?? 5, R = o.r ?? 26, rate = o.rate ?? 2.2, r = rng(o.seed ?? 5);
    ctx.save(); ctx.lineWidth = o.lw ?? 3; ctx.strokeStyle = WT.rgba(WT.C.ink, .55);
    for (let i = 0; i < n; i++) { const ph = r(), u = ((t * rate + ph + i / n) % 1), px = x + dir * u * (o.len ?? 220) + (r() - .5) * 20, py = y - u * 30 - r() * 14, rr = R * (.5 + u * 1.1);
      ctx.globalAlpha = (1 - u) * .9; ctx.fillStyle = '#f4efe6'; ctx.beginPath(); ctx.arc(px, py, rr, 0, TAU); ctx.arc(px + dir * rr * .7, py - rr * .35, rr * .7, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  };
  E.streaks = function (ctx, t, a, b, o = {}) {   // lines from a toward b (b = the moving thing), offset sideways
    const n = o.n ?? 7, r = rng(o.seed ?? 9), dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, al = o.alpha ?? 1; if (al <= 0) return;
    ctx.save(); ctx.globalAlpha *= al; ctx.strokeStyle = o.col || '#ffffff'; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) { const off = (r() - .5) * (o.w ?? 180), k0 = .1 + r() * .3, k1 = .6 + r() * .35; ctx.lineWidth = 3 + r() * 6;
      ctx.beginPath(); ctx.moveTo(a[0] + dx * k0 + nx * off, a[1] + dy * k0 + ny * off); ctx.lineTo(a[0] + dx * k1 + nx * off, a[1] + dy * k1 + ny * off); ctx.stroke(); }
    ctx.restore();
  };
  E.crumbs = function (ctx, t, t0, x, y, o = {}) {
    const u = t - t0; if (u < 0 || u > (o.life ?? 1.1)) return; const r = rng(o.seed ?? 3), n = o.n ?? 12, g = o.g ?? 1600;
    ctx.save(); ctx.strokeStyle = WT.C.ink; ctx.lineWidth = 2;
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (r() - .5) * 2.4 + (o.dir ?? 0), v = 240 + r() * 360, px = x + Math.cos(a) * v * u, py = y + Math.sin(a) * v * u + .5 * g * u * u, s = (o.r ?? 7) * (.6 + r() * .8);
      ctx.globalAlpha = 1 - ss(.7, 1.1, u); ctx.fillStyle = i % 3 ? '#e8c48e' : '#d6914c'; ctx.beginPath(); ctx.ellipse(px, py, s, s * .75, r() * 3, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  };
  E.nextLine = function (ctx, t, at, s, o = {}) {
    const a = ss(at, at + .35, t); if (a <= 0) return;
    Pilot.text(ctx, s, o.x ?? 540, o.y ?? 1360, { size: o.size || 40, font: WT.F.talk, color: o.color || '#5d545a', alpha: a });
  };
  window.EP3 = E;
})();

/* ten-second-scene · brush.js — one painted stroke for Canvas 2D, built the way the source describes them:
   every stroke has its own size and colour, a rounded head, a tail that thins out, a few bristle streaks, and a lit
   ridge on the side facing the light so overlapping strokes read as paint with thickness, not ribbons. */
(function (g) {
  'use strict';
  const T = g.TSS, { clamp, lerp, css, mix, tweak, col, rng, PI } = T;

  // o: { x, y, angle, len, width, color, alpha, taper (0..1), bend (-1..1, curvature), seed, bristles (0..8), dry (0..1),
  //      light: [lx, ly] (screen direction TOWARDS the light, unit), impasto (0..1) }
  function stroke(ctx, o) {
    const r = rng((o.seed ?? 1) * 2654435761 >>> 0);
    const N = 10, len = o.len, w = o.width, a = o.angle, taper = o.taper ?? .72, bend = (o.bend ?? 0) * len * .35;
    const c = col(o.color), alpha = o.alpha ?? 1, ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
    // centreline: a gentle arc from head (u=0) to tail (u=1)
    const pt = u => { const along = (u - .5) * len, off = bend * (1 - (2 * u - 1) ** 2); return [o.x + ca * along + nx * off, o.y + sa * along + ny * off]; };
    const wid = u => w * .5 * Math.sqrt(clamp(u / .1)) * (1 - taper * Math.pow(u, 1.4)) * (1 + .08 * Math.sin(u * 9 + r() * 6));
    const L = [], R = [];
    for (let i = 0; i <= N; i++) { const u = i / N, p = pt(u), hw = wid(u) + .2; L.push([p[0] + nx * hw, p[1] + ny * hw]); R.push([p[0] - nx * hw, p[1] - ny * hw]); }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = css(c);
    ctx.beginPath();
    const h = pt(0);
    ctx.moveTo(L[1][0], L[1][1]);
    ctx.arc(h[0] + ca * w * .12, h[1] + sa * w * .12, w * .5 * .95, a - PI / 2, a + PI / 2, true);   // round head
    for (let i = 1; i <= N; i++) ctx.lineTo(R[i][0], R[i][1]);
    for (let i = N; i >= 1; i--) ctx.lineTo(L[i][0], L[i][1]);
    ctx.closePath(); ctx.fill();
    // bristle streaks: lighter and darker hairs along the stroke, broken up towards a dry tail
    const nb = o.bristles ?? 3, dry = o.dry ?? .25;
    if (nb && w > 2.2) {
      ctx.lineCap = 'round';
      for (let b = 0; b < nb; b++) {
        const v = r.range(-.75, .75), dl = r.range(-.09, .09), u1 = 1 - dry * r.range(.2, 1);
        ctx.strokeStyle = css(tweak(c, dl, 1 + r.range(-.2, .25))); ctx.lineWidth = Math.max(.5, w * r.range(.06, .14));
        ctx.globalAlpha = alpha * .55;
        ctx.beginPath();
        for (let i = 0; i <= 8; i++) { const u = .04 + (u1 - .04) * i / 8, p = pt(u), hw = wid(u) * v; i ? ctx.lineTo(p[0] + nx * hw, p[1] + ny * hw) : ctx.moveTo(p[0] + nx * hw, p[1] + ny * hw); }
        ctx.stroke();
      }
    }
    // impasto: a lit ridge on the side facing the light, a darker lip on the other side
    const imp = o.impasto ?? .35;
    if (imp > 0 && w > 3) {
      const lx = o.light ? o.light[0] : -.6, ly = o.light ? o.light[1] : -.8, sgn = (nx * lx + ny * ly) >= 0 ? 1 : -1;
      ctx.lineWidth = Math.max(.6, w * .13); ctx.lineCap = 'round';
      for (const [k, tone, al] of [[.55, mix(c, '#fffbea', .45), imp * .8], [-.6, tweak(c, -.12, 1.1), imp * .55]]) {
        ctx.strokeStyle = css(tone); ctx.globalAlpha = alpha * al;
        ctx.beginPath();
        for (let i = 1; i <= 7; i++) { const u = .05 + .62 * i / 7, p = pt(u), hw = wid(u) * k * sgn; i > 1 ? ctx.lineTo(p[0] + nx * hw, p[1] + ny * hw) : ctx.moveTo(p[0] + nx * hw, p[1] + ny * hw); }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  // Paint a field: fill a rectangle with strokes whose colour and direction come from your functions.
  // o: { x, y, w, h, count, size:[min,max], aspect:[min,max], colorAt(x,y,r)→rgb, angleAt(x,y)→rad, seed, mask(x,y)→bool, ...stroke opts }
  function field(ctx, o) {
    const r = rng(o.seed ?? 7); let n = 0;
    for (let i = 0; i < o.count; i++) {
      const x = o.x + r() * o.w, y = o.y + r() * o.h;
      if (o.mask && !o.mask(x, y)) continue;
      const s = lerp(o.size[0], o.size[1], Math.pow(r(), 1.6)), asp = lerp((o.aspect || [2.5, 5])[0], (o.aspect || [2.5, 5])[1], r());
      stroke(ctx, Object.assign({}, o, { x, y, width: s, len: s * asp, angle: o.angleAt(x, y, r) + r.normal(0, o.jitter ?? .12), color: o.colorAt(x, y, r), seed: (o.seed ?? 7) * 100003 + i, bend: r.range(-.6, .6) }));
      n++;
    }
    return n;
  }

  T.Brush = { stroke, field };
})(window);

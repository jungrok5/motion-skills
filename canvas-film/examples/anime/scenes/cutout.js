/* cutout.js — draw keyed character art (PNG with alpha) in a code-driven scene, the Rain Station way:
   the picture comes from an image model, the life comes from code.
   - Cutout.load(name, src): preload; Cutout.img(name) → the image.
   - Cutout.warp(ctx, img, x, y, w, h, field, opt): draw the image as a grid of triangles, each vertex moved by
     field(u, v) → [dx, dy] in output pixels (u, v in 0..1 over the image). Breathing, hair sway, wind on the skirt.
   - Cutout.relight(ctx, img, x, y, w, h, o): light that belongs to the scene, added on top of the art:
     o.rim = { c, dx, dy } a rim from the alpha shifted toward the light; o.band = { c, x0, x1, a } a sweeping light band;
     o.tint = { c, a } a colour grade multiplied into the figure; o.shade = { c, x0, x1, a } a multiplied gradient (shadow side);
     o.sil = colour turns it into a silhouette.
   All drawing is deterministic (no time inside; pass t through field). */
const Cutout = (() => {
  const store = {};
  const load = (name, src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => { store[name] = i; ok(i); }; i.onerror = no; i.src = src; });
  // affine map of triangle s → triangle d, then draw the image clipped to d
  function tri(ctx, img, s0, s1, s2, d0, d1, d2) {
    const den = s0[0] * (s1[1] - s2[1]) + s1[0] * (s2[1] - s0[1]) + s2[0] * (s0[1] - s1[1]); if (!den) return;
    const a = (d0[0] * (s1[1] - s2[1]) + d1[0] * (s2[1] - s0[1]) + d2[0] * (s0[1] - s1[1])) / den;
    const b = (d0[1] * (s1[1] - s2[1]) + d1[1] * (s2[1] - s0[1]) + d2[1] * (s0[1] - s1[1])) / den;
    const c = (d0[0] * (s2[0] - s1[0]) + d1[0] * (s0[0] - s2[0]) + d2[0] * (s1[0] - s0[0])) / den;
    const d = (d0[1] * (s2[0] - s1[0]) + d1[1] * (s0[0] - s2[0]) + d2[1] * (s1[0] - s0[0])) / den;
    const e = (d0[0] * (s1[0] * s2[1] - s2[0] * s1[1]) + d1[0] * (s2[0] * s0[1] - s0[0] * s2[1]) + d2[0] * (s0[0] * s1[1] - s1[0] * s0[1])) / den;
    const f = (d0[1] * (s1[0] * s2[1] - s2[0] * s1[1]) + d1[1] * (s2[0] * s0[1] - s0[0] * s2[1]) + d2[1] * (s0[0] * s1[1] - s1[0] * s0[1])) / den;
    // grow the clip triangle by ~0.6 px so neighbouring triangles overlap (no hairline seams)
    const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3, g = p => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * .6, p[1] + dy / l * .6]; };
    const [e0, e1, e2] = [g(d0), g(d1), g(d2)];
    ctx.save(); ctx.beginPath(); ctx.moveTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.closePath(); ctx.clip();
    const sx = Math.max(0, Math.floor(Math.min(s0[0], s1[0], s2[0])) - 2), sy = Math.max(0, Math.floor(Math.min(s0[1], s1[1], s2[1])) - 2);
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const sw = Math.min(iw, Math.ceil(Math.max(s0[0], s1[0], s2[0])) + 2) - sx, sh = Math.min(ih, Math.ceil(Math.max(s0[1], s1[1], s2[1])) + 2) - sy;
    ctx.transform(a, b, c, d, e, f); if (sw > 0 && sh > 0) ctx.drawImage(img, sx, sy, sw, sh, sx, sy, sw, sh); ctx.restore();
  }
  function warp(ctx, img, x, y, w, h, field, o = {}) {
    if (!field) { ctx.drawImage(img, x, y, w, h); return; }
    const nx = o.nx || 14, ny = o.ny || 20, U0 = o.u0 ?? 0, V0 = o.v0 ?? 0, U1 = o.u1 ?? 1, V1 = o.v1 ?? 1, iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, P = [];
    for (let j = 0; j <= ny; j++) { const row = []; for (let i = 0; i <= nx; i++) { const u = U0 + (U1 - U0) * i / nx, v = V0 + (V1 - V0) * j / ny, [dx, dy] = field(u, v); row.push([[u * iw, v * ih], [x + u * w + dx, y + v * h + dy]]); } P.push(row); }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const A = P[j][i], B = P[j][i + 1], C = P[j + 1][i], D = P[j + 1][i + 1];
      tri(ctx, img, A[0], B[0], C[0], A[1], B[1], C[1]); tri(ctx, img, B[0], D[0], C[0], B[1], D[1], C[1]);
    }
  }
  // scene light on top of the art: the figure is rendered once into F, then composited with light built from its alpha
  let F, FX, R, RX;
  function relight(ctx, draw, o = {}) {
    const W = ctx.canvas.width, H = ctx.canvas.height, mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    if (!F || F.width !== W || F.height !== H) { F = mk(); FX = F.getContext('2d'); R = mk(); RX = R.getContext('2d'); }
    const T = ctx.getTransform();
    FX.setTransform(1, 0, 0, 1, 0, 0); FX.clearRect(0, 0, W, H); FX.setTransform(T); draw(FX); FX.setTransform(1, 0, 0, 1, 0, 0);
    const fromF = (col, op = 'source-in') => { RX.setTransform(1, 0, 0, 1, 0, 0); RX.globalCompositeOperation = 'source-over'; RX.globalAlpha = 1; RX.clearRect(0, 0, W, H);
      RX.drawImage(F, 0, 0); RX.globalCompositeOperation = op; RX.fillStyle = col; RX.fillRect(0, 0, W, H); RX.globalCompositeOperation = 'source-over'; };
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (o.sil) { fromF(o.sil); ctx.drawImage(R, 0, 0); ctx.restore(); return; }
    ctx.drawImage(F, 0, 0);
    if (o.tint) { fromF(o.tint.c); ctx.globalCompositeOperation = o.tint.op || 'multiply'; ctx.globalAlpha = o.tint.a ?? .3; ctx.drawImage(R, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    if (o.rim) { fromF(o.rim.c); RX.globalCompositeOperation = 'destination-out'; RX.drawImage(F, o.rim.dx, o.rim.dy); RX.globalCompositeOperation = 'source-over';
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = o.rim.a ?? .8; ctx.drawImage(R, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    if (o.band) { RX.setTransform(1, 0, 0, 1, 0, 0); RX.clearRect(0, 0, W, H); RX.drawImage(F, 0, 0); RX.globalCompositeOperation = 'source-in';
      const g = RX.createLinearGradient(o.band.x0, 0, o.band.x1, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, o.band.c); g.addColorStop(1, 'rgba(0,0,0,0)');
      RX.fillStyle = g; RX.fillRect(0, 0, W, H); RX.globalCompositeOperation = 'source-over'; ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = o.band.a ?? .6; ctx.drawImage(R, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    if (o.shade) { RX.setTransform(1, 0, 0, 1, 0, 0); RX.globalCompositeOperation = 'source-over'; RX.clearRect(0, 0, W, H); RX.drawImage(F, 0, 0); RX.globalCompositeOperation = 'source-in';   // the side away from the light, multiplied darker
      const g = RX.createLinearGradient(o.shade.x0, o.shade.y0 ?? 0, o.shade.x1, o.shade.y1 ?? 0); g.addColorStop(0, o.shade.c); g.addColorStop(1, '#ffffff');
      RX.fillStyle = g; RX.fillRect(0, 0, W, H); RX.globalCompositeOperation = 'source-over'; ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = o.shade.a ?? .5; ctx.drawImage(R, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    ctx.restore();
  }
  return { load, img: n => store[n], warp, relight, tri };
})();

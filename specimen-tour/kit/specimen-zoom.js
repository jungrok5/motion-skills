// specimen-zoom — a Canvas 2D kit for "fly into a specimen" shorts: a painted cutaway overview, close-up plates for
// each part, camera transitions that pull out to the overview and push into the next part, and a sci-fi HUD.
// Machinery only: no subject, palette or layout of its own. See STYLE.md. Every frame is a pure function of t.
// Load as a classic script; everything is on window.SZ.  Fonts (OFL) are loaded from ./fonts next to this file.
(function () {
  'use strict';
  const KIT_BASE = document.currentScript ? new URL('.', document.currentScript.src).href : '';
  const TAU = Math.PI * 2;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const TEX = {};
  // ---------- maths ----------
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const p = (u, a, d) => clamp((u - a) / d);
  const eo = x => 1 - Math.pow(1 - x, 3);
  const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const ss = x => x * x * (3 - 2 * x);
  const wob = (t, s) => Math.sin(t * 1.3 + s) * .5 + Math.sin(t * 2.7 + s * 1.7) * .3 + Math.sin(t * 5.1 + s * 3.1) * .2; // smooth −1..1

  // ---------- colour ----------
  const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const WHITE = [255, 255, 255], BLACK = [0, 0, 0];
  const lit = (c, k) => mix(c, WHITE, k), drk = (c, k) => mix(c, BLACK, k);

  // ---------- paths ----------
  const circleP = (x, y, r) => { const P = new Path2D(); P.arc(x, y, r, 0, TAU); return P; };
  const ellP = (x, y, rx, ry, rot = 0) => { const P = new Path2D(); P.ellipse(x, y, rx, ry, rot, 0, TAU); return P; };
  function lineP(pts, close) { const P = new Path2D(); P.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) P.lineTo(pts[i][0], pts[i][1]); if (close) P.closePath(); return P; }
  function cr(pts, seg = 10, closed = false) { // Catmull-Rom → dense polyline
    const out = [], n = pts.length, P = i => closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))], m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      for (let s = 0; s < seg; s++) {
        const t = s / seg, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(k => .5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  }
  const smoothP = (pts, closed = true) => lineP(cr(pts, 12, closed), closed);
  function blobPts(cx, cy, rx, ry, n, seed, amp) { const R = rng(seed), out = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + (R() - .5) * 2 * amp; out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); } return out; }
  function insetPoly(poly, d) { // offset a convex polygon inward by d
    const n = poly.length, L = [];
    let area = 0; for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
    const sgn = area > 0 ? 1 : -1;
    for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); const nx = -dy / l * sgn, ny = dx / l * sgn; L.push([a[0] + nx * d, a[1] + ny * d, dx, dy]); }
    const out = [];
    for (let i = 0; i < n; i++) { const A = L[(i + n - 1) % n], B = L[i]; const den = A[2] * B[3] - A[3] * B[2]; const t = ((B[0] - A[0]) * B[3] - (B[1] - A[1]) * B[2]) / den; out.push([A[0] + A[2] * t, A[1] + A[3] * t]); }
    return out;
  }
  function reflect(pt, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy, t = ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / l2; const fx = a[0] + dx * t, fy = a[1] + dy * t; return [2 * fx - pt[0], 2 * fy - pt[1]]; }

  // ---------- texture ----------
  function noiseTex(size, seed, base = 8, oct = 5, contrast = 1, gain = .55) {
    const c = mk(size, size), g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data, R = rng(seed), lat = [];
    for (let o = 0; o < oct; o++) { const n = base << o, a = new Float32Array(n * n); for (let i = 0; i < n * n; i++) a[i] = R(); lat.push([n, a]); }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let v = 0, amp = 1, tot = 0;
      for (let o = 0; o < oct; o++) {
        const [n, a] = lat[o], fx = x / size * n, fy = y / size * n, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), x0 = ix % n, x1 = (ix + 1) % n, y0 = iy % n, y1 = (iy + 1) % n;
        const v0 = a[y0 * n + x0] + (a[y0 * n + x1] - a[y0 * n + x0]) * sx, v1 = a[y1 * n + x0] + (a[y1 * n + x1] - a[y1 * n + x0]) * sx;
        v += (v0 + (v1 - v0) * sy) * amp; tot += amp; amp *= gain;
      }
      const k = clamp((v / tot - .5) * contrast + .5) * 255 | 0, i = (y * size + x) * 4; d[i] = d[i + 1] = d[i + 2] = k; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); return c;
  }
  function texOver(g, P, tex, o = {}) {
    g.save(); g.clip(P); g.globalCompositeOperation = o.mode || 'overlay'; g.globalAlpha = o.alpha ?? .5;
    const pat = g.createPattern(tex, 'repeat'); pat.setTransform(new DOMMatrix().translate(o.ox || 0, o.oy || 0).rotate(o.rot || 0).scale(o.scale || 1));
    g.fillStyle = pat; g.fill(P); g.restore();
  }
  function devScale(g) { const m = g.getTransform(); return Math.hypot(m.a, m.b); }
  function innerShadow(g, P, color, blur, dx = 0, dy = 0) {
    const k = devScale(g); g.save(); g.clip(P);
    const o = new Path2D(); o.rect(-1e4, -1e4, 3e4, 3e4); o.addPath(P);
    g.shadowColor = color; g.shadowBlur = blur * k; g.shadowOffsetX = dx * k; g.shadowOffsetY = dy * k; g.fillStyle = '#000'; g.fill(o, 'evenodd'); g.restore();
  }
  function blurLayer(g, px, fn) { // paint fn on a scratch canvas with g's transform, composite it blurred
    const c = mk(g.canvas.width, g.canvas.height), t = c.getContext('2d'); t.setTransform(g.getTransform()); fn(t);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.filter = `blur(${px}px)`; g.drawImage(c, 0, 0); g.restore();
  }
  function bloom(c, a = .32, r = 7) {
    const s = mk(c.width >> 2, c.height >> 2), t = s.getContext('2d'); t.filter = `blur(${r}px)`; t.drawImage(c, 0, 0, s.width, s.height);
    const g = c.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'screen'; g.globalAlpha = a; g.drawImage(s, 0, 0, c.width, c.height); g.restore();
  }

  // ---------- generic painters ----------
  function sphere(g, x, y, r, c, o = {}) {
    const hi = o.hi || lit(c, .55), lo = o.lo || drk(c, .72), P = circleP(x, y, r);
    const gr = g.createRadialGradient(x - r * .38, y - r * .42, r * .04, x - r * .12, y - r * .12, r * 1.12);
    gr.addColorStop(0, rgba(hi, o.a ?? 1)); gr.addColorStop(.42, rgba(c, o.a ?? 1)); gr.addColorStop(1, rgba(lo, o.a ?? 1));
    g.fillStyle = gr; g.fill(P);
    if (o.tex && r > 8) texOver(g, P, o.tex, { alpha: o.texA ?? .45, scale: o.texS ?? Math.max(.08, r / 260), ox: x, oy: y });
    if (o.rim !== false) { const rg = g.createRadialGradient(x + r * .2, y + r * .24, r * .55, x, y, r * 1.02); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, rgba(o.rimC || lit(c, .45), o.rimA ?? .38)); g.fillStyle = rg; g.fill(P); }
    const sp = o.spec ?? 1;
    if (sp > 0) { const sx = x - r * .36, sy = y - r * .42, sr = r * .42, sg = g.createRadialGradient(sx, sy, 0, sx, sy, sr); sg.addColorStop(0, `rgba(255,255,255,${.8 * sp})`); sg.addColorStop(.3, `rgba(255,255,255,${.25 * sp})`); sg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill(); }
  }
  function body(g, P, bb, c, o = {}) {
    const [x, y, w, h] = bb, R = Math.max(w, h);
    const gr = g.createRadialGradient(x + w * .3, y + h * .28, 0, x + w * .42, y + h * .42, R * .8);
    gr.addColorStop(0, rgba(lit(c, o.hiK ?? .42))); gr.addColorStop(.5, rgba(c)); gr.addColorStop(1, rgba(drk(c, o.loK ?? .62)));
    g.fillStyle = gr; g.fill(P);
    if (o.tex) texOver(g, P, o.tex, { alpha: o.texA ?? .5, scale: o.texS ?? 1, mode: o.texM, ox: x, oy: y });
    innerShadow(g, P, rgba(drk(c, .85), .85), R * (o.isb ?? .07), -R * .015, -R * .02);
    innerShadow(g, P, rgba(lit(c, .65), .55), R * .025, R * .008, R * .01);
  }
  function tube(g, P, w, c, o = {}) {
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; const al = o.alpha ?? 1;
    const hl = o.hl ?? 1, L = [[0, 0, 1, drk(c, .68), 1], [-.05, -.07, .8, c, 1], [-.1, -.13, .46, lit(c, .32 * hl), .85], [-.14, -.18, .16, lit(c, .8 * hl), .75 * hl]];
    for (const [dx, dy, k, col, a] of L) { g.save(); g.translate(dx * w, dy * w); g.strokeStyle = rgba(col, a * al); g.lineWidth = w * k; g.stroke(P); g.restore(); }
    g.restore();
  }
  function fiberBand(g, A, B, T, seed, o = {}) { // fibrous band centred on A→B, thickness T, lit from the top-left (walls, tendons, wood, cloth)
    const R = rng(seed), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    const dark = o.dark || [14, 52, 12], mid = o.mid || [74, 160, 34], light = o.light || [196, 255, 112];
    const ext = o.ext ?? T * .5, sc = o.sc ?? 1;
    // which side faces the light (screen top-left)
    const nx = -Math.sin(ang), ny = Math.cos(ang), litSide = (nx * -.6 + ny * -.8) > 0 ? 1 : -1;
    g.save(); g.translate(A[0], A[1]); g.rotate(ang);
    if (o.base !== false) {
      const gr = g.createLinearGradient(0, -T / 2, 0, T / 2), s0 = litSide > 0 ? 1 : 0;
      gr.addColorStop(0, rgba(drk(mid, s0 ? .25 : .7))); gr.addColorStop(.5, rgba(drk(mid, .2))); gr.addColorStop(1, rgba(drk(mid, s0 ? .7 : .25)));
      g.fillStyle = gr; g.fillRect(-ext, -T / 2, L + 2 * ext, T);
    }
    const n = Math.floor((L + 2 * ext) * T * (o.density ?? .05) / (sc * sc));
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const v = R() * 2 - 1, cyl = Math.sqrt(1 - v * v), side = clamp(.6 + .4 * v * litSide);
      const sh = clamp(cyl * side * (.45 + .75 * R()));
      const col = sh < .5 ? mix(dark, mid, sh * 2) : mix(mid, light, (sh - .5) * 2);
      const u = -ext + R() * (L + 2 * ext), len = (25 + R() * 120) * sc, y = v * T / 2, amp = (R() - .5) * 7 * sc;
      g.strokeStyle = rgba(col, .5 + .5 * R()); g.lineWidth = (.5 + R() * R() * 2.8) * sc * (o.lw ?? 1);
      g.beginPath(); g.moveTo(u, y); g.quadraticCurveTo(u + len / 2, y + amp * 2, u + len, y + amp); g.stroke();
    }
    // rope-like microfibril bundles: dark groove, lit crest
    const nb = Math.floor((L + 2 * ext) * T * (o.bundles ?? .0012) / (sc * sc));
    for (let i = 0; i < nb; i++) {
      const v = R() * 1.8 - .9, y = v * T / 2, u = -ext + R() * (L + 2 * ext), len = (120 + R() * 320) * sc, bw = (3 + R() * 7) * sc, amp = (R() - .5) * 10 * sc;
      const cyl = Math.sqrt(1 - v * v) * clamp(.6 + .4 * v * litSide), q = new Path2D(); q.moveTo(u, y); q.bezierCurveTo(u + len * .33, y + amp, u + len * .66, y - amp, u + len, y + amp * .5);
      g.strokeStyle = rgba(dark, .55); g.lineWidth = bw * 1.5; g.stroke(q);
      g.save(); g.translate(-bw * .15 * litSide * Math.sin(ang), -bw * .25); g.strokeStyle = rgba(mix(mid, light, cyl), .85); g.lineWidth = bw * .8; g.stroke(q);
      g.translate(-bw * .1, -bw * .15); g.strokeStyle = rgba(lit(light, .3), .5 * cyl); g.lineWidth = bw * .25; g.stroke(q); g.restore();
    }
    g.restore();
  }
  function layer(g, fn, o = {}) { // paint into a scratch layer, optionally texture what was painted (source-atop) and blur it
    const c = mk(g.canvas.width, g.canvas.height), t = c.getContext('2d'); t.setTransform(g.getTransform()); fn(t);
    if (o.tex) { // overlay-blend a texture only where something was painted
      const m = mk(c.width, c.height), mt = m.getContext('2d'), pat = mt.createPattern(o.tex, 'repeat'); pat.setTransform(new DOMMatrix().scale(o.texS ?? 1));
      mt.fillStyle = pat; mt.fillRect(0, 0, m.width, m.height); mt.globalCompositeOperation = 'destination-in'; mt.drawImage(c, 0, 0);
      t.save(); t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'overlay'; t.globalAlpha = o.texA ?? .5; t.drawImage(m, 0, 0); t.restore();
    }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); if (o.blur) g.filter = `blur(${o.blur}px)`; if (o.shadow) { g.shadowColor = 'rgba(0,0,0,.75)'; g.shadowBlur = o.shadow; g.shadowOffsetX = o.shadow * .3; g.shadowOffsetY = o.shadow * .45; } g.drawImage(c, 0, 0); g.restore();
  }
  function network(g, x0, y0, w, h, n, seed, o = {}) { // wandering strands (cytoskeleton, fibres, cracks)
    const R = rng(seed), cols = o.cols || [[60, 130, 255], [90, 170, 255], [120, 90, 230], [70, 210, 255]];
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < n; i++) {
      let x = x0 + R() * w, y = y0 + R() * h, a = R() * TAU; const col = cols[(R() * cols.length) | 0], st = o.step || 8;
      g.strokeStyle = rgba(col, (o.alpha ?? .5) * (.35 + .65 * R())); g.lineWidth = lerp(o.lw0 ?? .5, o.lw1 ?? 2, R() * R());
      if (o.glow) { g.shadowColor = rgba(col, .8); g.shadowBlur = o.glow * devScale(g); }
      g.beginPath(); g.moveTo(x, y); const steps = (o.s0 ?? 6) + (R() * (o.s1 ?? 16) | 0);
      for (let s = 0; s < steps; s++) { a += (R() - .5) * (o.curl ?? .9); x += Math.cos(a) * st; y += Math.sin(a) * st; g.lineTo(x, y); }
      g.stroke();
    }
    g.restore();
  }
  function dots(g, x0, y0, w, h, n, seed, c, r0, r1, o = {}) { const R = rng(seed); for (let i = 0; i < n; i++) { const x = x0 + R() * w, y = y0 + R() * h, r = lerp(r0, r1, R() * R()); if (o.test && !o.test(x, y)) continue; sphere(g, x, y, r, c, { spec: o.spec ?? .9, rimA: .25 }); } }
  function liquidBody(g, P, bb, o = {}) {
    const [x, y, w, h] = bb, R = Math.max(w, h);
    const gr = g.createRadialGradient(x + w * .38, y + h * .3, 0, x + w * .5, y + h * .5, R * .75);
    gr.addColorStop(0, rgba([200, 250, 255])); gr.addColorStop(.35, rgba([90, 215, 245])); gr.addColorStop(.8, rgba([28, 130, 200])); gr.addColorStop(1, rgba([16, 70, 150]));
    g.fillStyle = gr; g.fill(P);
    texOver(g, P, TEX.caus, { mode: 'screen', alpha: o.caus ?? .35, scale: o.cs ?? Math.max(.2, R / 900), ox: x, oy: y });
    innerShadow(g, P, 'rgba(10,60,140,.9)', R * .06, -R * .01, -R * .012);
    innerShadow(g, P, 'rgba(220,255,255,.85)', R * .02, R * .006, R * .008);
    // tonoplast rim
    g.save(); g.lineWidth = Math.max(2, R * .012); g.strokeStyle = rgba([150, 245, 255], .8); g.stroke(P); g.restore();
    // highlights
    g.save(); g.clip(P); g.globalCompositeOperation = 'screen';
    const hs = g.createRadialGradient(x + w * .3, y + h * .22, 0, x + w * .3, y + h * .22, R * .3); hs.addColorStop(0, 'rgba(255,255,255,.55)'); hs.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hs; g.fillRect(x, y, w, h); g.restore();
  }
  function bubbles(g, x0, y0, w, h, n, seed, r0, r1, test) {
    const R = rng(seed); g.save();
    for (let i = 0; i < n; i++) {
      const x = x0 + R() * w, y = y0 + R() * h, r = lerp(r0, r1, R() * R() * R()); if (test && !test(x, y)) continue;
      const gr = g.createRadialGradient(x - r * .3, y - r * .3, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.25)'); gr.addColorStop(.7, 'rgba(160,240,255,.08)'); gr.addColorStop(1, 'rgba(220,255,255,.55)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x - r * .35, y - r * .38, r * .18, 0, TAU); g.fill();
    }
    g.restore();
  }
  function fieldBase(g, x, y, w, h, seed, o = {}) {
    const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, rgba(o.c0 || [12, 30, 92])); gr.addColorStop(1, rgba(o.c1 || [6, 16, 54]));
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    const P = new Path2D(); P.rect(x, y, w, h); texOver(g, P, TEX.grain, { alpha: .5, scale: o.ts ?? 1 });
    network(g, x, y, w, h, o.n ?? 600, seed, { alpha: .55, lw0: .4 * (o.lw ?? 1), lw1: 2.2 * (o.lw ?? 1), step: o.step ?? 9, glow: o.glow });
  }


  // ---------- base textures ----------
  function baseTextures() {
    TEX.grain = noiseTex(256, 1, 16, 4, 2.2, .6);                  // bumpy, granular surfaces
    TEX.fine = noiseTex(256, 2, 8, 5, 1.6);                        // soft relief for any body
    const cz = noiseTex(512, 3, 4, 4, 1.4), t = cz.getContext('2d'), im = t.getImageData(0, 0, 512, 512), d = im.data;
    for (let i = 0; i < d.length; i += 4) { const v = d[i] / 255, rr = Math.pow(1 - Math.abs(2 * v - 1), 5); d[i] = d[i + 1] = d[i + 2] = 255 * clamp(rr); }
    t.putImageData(im, 0, 0); const c2 = mk(512, 512), t2 = c2.getContext('2d'); t2.filter = 'blur(2.5px)';
    for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) t2.drawImage(cz, ox, oy);
    TEX.caus = c2;                                                 // ridged caustic lines for liquids
    return TEX;
  }
  // tileable fibre sheet (crossed strands) — map it onto 3D faces or fill shapes with it
  function fiberTex(seed, o = {}) {
    const Z = o.size || 512, F = mk(Z, Z), f = F.getContext('2d'), R = rng(seed), dark = o.dark || [16, 60, 12], mid = o.mid || [80, 170, 36], light = o.light || [200, 255, 120];
    f.fillStyle = rgba(o.base || drk(mid, .35)); f.fillRect(0, 0, Z, Z); f.lineCap = 'round';
    for (let i = 0; i < (o.n ?? 2600) * (Z / 512) ** 2; i++) {
      const x = R() * Z, y = R() * Z, a = (R() < .6 ? .5 : -.9) + (R() - .5) * .5, len = 20 + R() * 70, sh = R();
      const col = sh < .5 ? mix(dark, mid, sh * 2) : mix(mid, light, (sh - .5) * 2);
      f.strokeStyle = rgba(col, .6); f.lineWidth = .6 + R() * R() * 2.6;
      for (const ox of [-Z, 0, Z]) for (const oy of [-Z, 0, Z]) { f.beginPath(); f.moveTo(x + ox, y + oy); f.quadraticCurveTo(x + ox + Math.cos(a) * len / 2 + (R() - .5) * 6, y + oy + Math.sin(a) * len / 2, x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len); f.stroke(); }
    }
    const all = new Path2D(); all.rect(0, 0, Z, Z); texOver(f, all, TEX.fine, { alpha: .75, scale: 2 }); texOver(f, all, TEX.fine, { alpha: .5, scale: .7, mode: 'multiply' });
    return F;
  }
  // edge-detect a painting into a teal-on-black "x-ray" with a measuring grid
  function xrayOf(c, o = {}) {
    const w = c.width >> 1, h = c.height >> 1, s = mk(w, h), sg = s.getContext('2d'); sg.filter = 'blur(1px)'; sg.drawImage(c, 0, 0, w, h);
    const src = sg.getImageData(0, 0, w, h).data, out = sg.createImageData(w, h), q = out.data, L = new Float32Array(w * h), col = o.color || [40, 255, 205];
    for (let i = 0; i < w * h; i++) L[i] = src[i * 4] * .3 + src[i * 4 + 1] * .59 + src[i * 4 + 2] * .11;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x, gx = L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1], gy = L[i + w - 1] + 2 * L[i + w] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - w] - L[i - w + 1];
      const k = Math.pow(clamp(Math.hypot(gx, gy) / (o.gain ?? 260)), .8); q[i * 4] = col[0] * k; q[i * 4 + 1] = col[1] * k; q[i * 4 + 2] = col[2] * k; q[i * 4 + 3] = 255;
    }
    sg.filter = 'none'; sg.putImageData(out, 0, 0);
    sg.save(); sg.strokeStyle = rgba(col, .12); sg.lineWidth = 1; const gs = o.grid ?? 32;
    for (let x = 0; x < w; x += gs) { sg.beginPath(); sg.moveTo(x + .5, 0); sg.lineTo(x + .5, h); sg.stroke(); }
    for (let y = 0; y < h; y += gs) { sg.beginPath(); sg.moveTo(0, y + .5); sg.lineTo(w, y + .5); sg.stroke(); }
    sg.restore(); bloom(s, .5, 4); return s;
  }

  // ---------- extruded polygon (a closed box of any outline), orthographic, fibre-textured faces ----------
  function rot3(yaw, pitch, x, y, z) { const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch); const x1 = x * cy + z * sy, z1 = -x * sy + z * cy; return [x1, y * cp - z1 * sp, y * sp + z1 * cp]; }
  // poly: outline in world units (clockwise on screen) · centre: [x, y] it rotates about · S(q) → screen point for a world-relative 3D point
  function prism(g, poly, centre, depth, yaw, pitch, S, tex, o = {}) {
    const loc = poly.map(q => [q[0] - centre[0], q[1] - centre[1]]), R3 = (x, y, z) => rot3(yaw, pitch, x, y, z);
    const F = loc.map(([x, y]) => R3(x, y, 0)), B = loc.map(([x, y]) => R3(x, y, -depth)), Lv = o.light || [-.45, -.6, .66], faces = [], n = loc.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, ex = loc[j][0] - loc[i][0], ey = loc[j][1] - loc[i][1], l = Math.hypot(ex, ey), nn = R3(ey / l, -ex / l, 0);
      if (nn[2] > 0) faces.push({ pts: [F[i], F[j], B[j], B[i]], n: nn, z: (F[i][2] + F[j][2] + B[i][2] + B[j][2]) / 4, side: true });
    }
    faces.sort((a, b) => a.z - b.z); const nc = R3(0, 0, 1); if (nc[2] > 0) faces.push({ pts: F, n: nc, cap: true });
    faces.forEach(f => f.b = .32 + .68 * Math.max(0, f.n[0] * Lv[0] + f.n[1] * Lv[1] + f.n[2] * Lv[2]));
    g.save(); g.filter = 'blur(18px)'; g.fillStyle = 'rgba(0,0,0,.7)'; g.fill(lineP(F.map(S).map(([x, y]) => [x + 30, y + 40]), true)); g.restore();
    const pat = g.createPattern(tex, 'repeat');
    for (const f of faces) {
      const P = f.pts.map(S), path = lineP(P, true);
      g.save(); g.clip(path);
      if (f.cap) { const o0 = S([0, 0, 0]), ex = S(R3(1, 0, 0)), ey = S(R3(0, 1, 0)); g.transform(ex[0] - o0[0], ex[1] - o0[1], ey[0] - o0[0], ey[1] - o0[1], o0[0], o0[1]); g.fillStyle = pat; g.fillRect(-1500, -1500, 3000, 3000); }
      else { const O = P[0], U = [P[1][0] - O[0], P[1][1] - O[1]], V = [P[3][0] - O[0], P[3][1] - O[1]], lu = Math.hypot(...U), lv = Math.max(1e-3, Math.hypot(...V)); g.transform(U[0] / lu, U[1] / lu, V[0] / lv, V[1] / lv, O[0], O[1]); g.fillStyle = pat; g.fillRect(0, 0, lu, lv * 1.02 + 1); }
      g.restore();
      g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = rgba([255 * f.b, 255 * f.b, 255 * f.b]); g.fill(path); g.restore();
      if (f.cap && o.capGlow !== false) { g.save(); g.clip(path); const c = S([0, 0, 0]), k = o.scale || 1, rg = g.createRadialGradient(c[0] - 120 * k, c[1] - 160 * k, 0, c[0], c[1], 420 * k); rg.addColorStop(0, rgba(o.glow || [200, 255, 120], .22)); rg.addColorStop(1, 'rgba(0,20,0,.35)'); g.fillStyle = rg; g.fill(path); g.restore(); }
    }
    if (o.edge) { const ew = (o.edgeW || 20) * (o.scale || 1); for (const f of faces) if (f.side) tube(g, lineP([S(f.pts[1]), S(f.pts[2])]), ew * .75, o.edge); for (let i = 0; i < n; i++) tube(g, lineP([S(F[i]), S(F[(i + 1) % n])]), ew, o.edge); }
  }

  // ---------- film: overview + close-up plates + transitions ----------
  const LAYOUT = {   // screen zones; v0..v1 is the picture window between the HUD panels
    '9:16': { W: 1080, H: 1920, top: 110, v0: 350, v1: 1288, bot: 1312, focus: [540, 820] },   // shorts: app bars ~110 px top, ~280 px bottom
    '4:5': { W: 1080, H: 1350, top: 10, v0: 240, v1: 966, bot: 985, focus: [540, 605] },
  };
  function film(cfg) {
    const L = cfg.layout, W = L.W, H = L.H, [FX, FY] = L.focus, SHOT = cfg.shot ?? 2, N = cfg.shots.length, DURATION = SHOT * N, TR = cfg.transition ?? .42;
    const O = cfg.overview, OS = O.scale ?? 1.6, PL = cfg.plates || { paint: {} };
    const PW = PL.w ?? W + 160, PH = PL.h ?? H + 280, PCX = PW / 2, PCY = FY + (PH - H) / 2, PY0 = (PL.designCY ?? PCY) - PCY;
    const F = { cfg, L, W, H, FX, FY, SHOT, N, DURATION, PW, PH, PY0, OS, plates: {}, over: null, xray: null, scene: mk(W, H) };
    const sctx = F.scene.getContext('2d');
    F.shotAt = t => { t = ((t % DURATION) + DURATION) % DURATION; const k = Math.min(N - 1, Math.floor(t / SHOT)); return { t, k, lt: t - k * SHOT }; };
    F.camOf = (k, lt) => { const s = cfg.shots[k], [x, y, z] = s.t; return { x, y, z: z * (s.plate ? 1 : 1 + (s.drift ?? .04) * lt / SHOT) }; };
    F.toScreen = (cam, x, y) => [FX + (x - cam.x) * cam.z, FY + (y - cam.y) * cam.z];
    F.drawOverview = (g, cam, blur = 0) => {
      const dx = FX + (O.x - cam.x) * cam.z, dy = FY + (O.y - cam.y) * cam.z, dw = O.w * cam.z, dh = O.h * cam.z;
      g.drawImage(F.over, dx, dy, dw, dh);
      if (blur > .02) for (const k of [1, 2]) { const s = 1 + blur * .045 * k; g.globalAlpha = .32 / k; g.drawImage(F.over, FX + (dx - FX) * s, FY + (dy - FY) * s, dw * s, dh * s); g.globalAlpha = 1; }
    };
    F.drawXray = (g, cam, cut, alpha) => {
      if (alpha <= 0 || cut >= W || !F.xray) return;
      const dx = FX + (O.x - cam.x) * cam.z, dy = FY + (O.y - cam.y) * cam.z;
      g.save(); g.globalAlpha = alpha; g.beginPath(); g.rect(cut, 0, W - cut, H); g.clip(); g.fillStyle = '#000'; g.fillRect(cut, 0, W - cut, H); g.drawImage(F.xray, dx, dy, O.w * cam.z, O.h * cam.z); g.restore();
      g.save(); g.globalAlpha = alpha; const lg = g.createLinearGradient(cut - 14, 0, cut + 14, 0); lg.addColorStop(0, 'rgba(63,240,200,0)'); lg.addColorStop(.5, 'rgba(200,255,240,.9)'); lg.addColorStop(1, 'rgba(63,240,200,0)'); g.fillStyle = lg; g.fillRect(cut - 14, 0, 28, H); g.restore();
    };
    F.drawPlate = (g, key, lt, alpha, extra = 1) => {
      const c = F.plates[key]; if (!c || alpha <= 0) return false;
      const s = (1 + (cfg.push ?? .075) * clamp(lt / SHOT, -.5, 1.5)) * extra;
      g.save(); g.globalAlpha = alpha; g.drawImage(c, FX - PCX * s, FY - PCY * s, PW * s, PH * s); g.restore(); return true;
    };
    F.thumb = (cx, cy, w, h, worldH) => { // a picture of the overview for a locator box
      const c = mk(w * 2, h * 2), ww = worldH * w / h; c.getContext('2d').drawImage(F.over, (cx - ww / 2 - O.x) * OS, (cy - worldH / 2 - O.y) * OS, ww * OS, worldH * OS, 0, 0, c.width, c.height);
      return Object.assign(c, { region: { cx, cy, w: ww, h: worldH } });
    };
    function motes(g, t, seed, alpha, c) { // drifting out-of-focus particles in front of the close-ups
      const R = rng(900 + seed); g.save();
      for (let i = 0; i < 26; i++) {
        const x0 = R() * W, y0 = R() * H, vx = (R() - .5) * 22, vy = (R() - .5) * 16 - 6, r = 2 + R() * R() * 16, a = (.12 + R() * .35) * alpha;
        const x = ((x0 + vx * t) % W + W) % W, y = ((y0 + vy * t) % H + H) % H, col = R() < .5 ? lit(c, .5) : [200, 240, 255];
        const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
      g.restore();
    }
    function drawShot(g, k, lt, alpha, cam, z0) {
      const s = cfg.shots[k]; if (alpha <= 0) return;
      if (s.draw) return s.draw(g, cam, lt, alpha, F);
      if (F.drawPlate(g, s.plate, lt, alpha, cam.z / z0) && cfg.motes !== false) motes(g, lt + k * 7, k, alpha, s.rgb || [200, 240, 255]);
    }
    F.renderScene = (g, t) => {
      const { k, lt } = F.shotAt(t);
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      let A = k, B = k, u = null;
      if (lt < TR) { A = (k + N - 1) % N; u = (lt + TR) / (2 * TR); } else if (lt > SHOT - TR) { B = (k + 1) % N; u = (lt - (SHOT - TR)) / (2 * TR); }
      if (u === null) {
        const cam = F.camOf(k, lt), s = cfg.shots[k];
        if (!s.plate || !F.plates[s.plate]) F.drawOverview(g, cam);
        drawShot(g, k, lt, 1, cam, cam.z);
      } else {
        // pull back towards the overview and push into the next target, in log(zoom)
        const ltA = A === k ? lt : lt + SHOT, ltB = B === k ? lt : lt - SHOT, ca = F.camOf(A, SHOT - TR), cb = F.camOf(B, TR), s = eio(u);
        const la = Math.log(ca.z), lb = Math.log(cb.z), dip = clamp(Math.min(la, lb) * .65 + .18, .18, .9);
        const cam = { x: lerp(ca.x, cb.x, s), y: lerp(ca.y, cb.y, s), z: Math.exp(lerp(la, lb, s) - dip * Math.sin(Math.PI * s)) };
        F.drawOverview(g, cam, Math.sin(Math.PI * u) * (dip + Math.abs(lb - la) * .3));
        drawShot(g, A, ltA, 1 - ss(clamp(u / .4)), cam, ca.z);
        drawShot(g, B, ltB, ss(clamp((u - .6) / .4)), cam, cb.z);
      }
      if (cfg.vignette !== false) { const vg = g.createRadialGradient(FX, FY, 300, FX, FY, Math.max(W, H) * .62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, H); }
    };
    F.renderAt = (g, t) => { F.renderScene(sctx, t); g.drawImage(F.scene, 0, 0); if (cfg.hud) cfg.hud(g, t, F); };
    F.build = async (progress = () => {}, onBasic) => {
      await loadFonts();
      const keys = Object.keys(PL.paint || {}), total = keys.length + 2; let done = 0;
      const step = async () => { done++; progress(done / total); await new Promise(r => setTimeout(r, 0)); };
      baseTextures(); if (cfg.textures) cfg.textures(TEX, F); await step();
      const c = mk(O.w * OS, O.h * OS), g = c.getContext('2d'); g.setTransform(OS, 0, 0, OS, -O.x * OS, -O.y * OS);
      O.paint(g, F); bloom(c, O.bloom ?? .3, 6); F.over = c; if (O.xray) F.xray = xrayOf(c, O.xray === true ? {} : O.xray);
      if (cfg.built) cfg.built(F); await step();
      if (onBasic) onBasic();
      for (const k of keys) { const pc = mk(PW, PH), pg = pc.getContext('2d'); pg.translate(0, -PY0); PL.paint[k](pg, F); bloom(pc, PL.bloom ?? .28, 6); F.plates[k] = pc; await step(); }
    };
    return F;
  }

  // ---------- fonts ----------
  const FONT = { body: '"Barlow Condensed", sans-serif', display: '"Saira Condensed", "Barlow Condensed", sans-serif', mono: '"JetBrains Mono", monospace' };
  let fontsP = null;
  function loadFonts() {
    if (fontsP) return fontsP;
    const list = [['Barlow Condensed', 'BarlowCondensed-400', '400'], ['Barlow Condensed', 'BarlowCondensed-500', '500'], ['Barlow Condensed', 'BarlowCondensed-600', '600'], ['Barlow Condensed', 'BarlowCondensed-700', '700'], ['Saira Condensed', 'SairaCondensed-700', '700'], ['JetBrains Mono', 'JetBrainsMono', '400']];
    fontsP = Promise.all(list.map(([fam, file, w]) => { const f = new FontFace(fam, `url(${KIT_BASE}fonts/${file}.woff2)`, { weight: w }); document.fonts.add(f); return f.load().catch(() => null); }));
    return fontsP;
  }

  // ---------- HUD primitives (bound to a film for the frosted-glass backdrop) ----------
  function ui(F) {
    const U = {};
    U.T = (g, s, x, y, o = {}) => { g.font = `${o.w || 500} ${o.s || 13}px ${o.f || FONT.body}`; g.fillStyle = o.c || '#dbe6de'; g.textAlign = o.a || 'left'; g.textBaseline = 'alphabetic'; g.letterSpacing = (o.ls || 0) + 'px'; g.globalAlpha = o.al ?? 1; g.fillText(s, x, y); g.globalAlpha = 1; g.letterSpacing = '0px'; };
    U.glass = (g, x, y, w, h, r, tint = [6, 16, 14], a = .58, stroke = 'rgba(190,255,215,.16)') => { // frosted panel: blurs the picture under it
      const P = new Path2D(), m = g.getTransform(), ox = m.e, oy = m.f; P.roundRect(x, y, w, h, r);
      g.save(); g.clip(P); g.filter = 'blur(14px)';
      const sx = Math.max(0, x + ox - 30), sy = Math.max(0, y + oy - 30), sw = Math.min(F.W, x + ox + w + 30) - sx, sh = Math.min(F.H, y + oy + h + 30) - sy;
      if (sw > 0 && sh > 0) g.drawImage(F.scene, sx, sy, sw, sh, sx - ox, sy - oy, sw, sh); g.filter = 'none';
      g.fillStyle = rgba(tint, a); g.fill(P);
      const sg = g.createLinearGradient(0, y, 0, y + h); sg.addColorStop(0, 'rgba(255,255,255,.07)'); sg.addColorStop(.35, 'rgba(255,255,255,0)'); g.fillStyle = sg; g.fill(P);
      g.restore(); g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(P);
    };
    U.head = (g, a, x, y, r, rx, rc) => { U.T(g, a, x, y, { w: 600, s: 12.5, ls: 2.2 }); if (r) U.T(g, r, rx, y, { f: FONT.mono, w: 400, s: 12, a: 'right', c: rc || '#8dff5a' }); };
    U.bar = (g, x, y, w, h, f, c) => { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x, y, w, h); g.fillStyle = c; g.fillRect(x, y, w * clamp(f), h); };
    U.corners = (g, x0, y0, x1, y1, arm = 26, col = 'rgba(255,255,255,.75)') => { g.save(); g.strokeStyle = col; g.lineWidth = 2; [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(([x, y, sx, sy]) => { g.beginPath(); g.moveTo(x, y + sy * arm); g.lineTo(x, y); g.lineTo(x + sx * arm, y); g.stroke(); }); g.restore(); };
    U.live = (g, x, y, text, t, dot = '#a6ff4a') => { g.font = `600 13px ${FONT.body}`; g.letterSpacing = '2px'; const w = g.measureText(text).width + 40; g.letterSpacing = '0px'; g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.roundRect(x, y, w, 28, 5); g.fill(); g.fillStyle = rgba(hx(dot), .55 + .45 * Math.sin(t * 6) ** 2); g.beginPath(); g.arc(x + 15, y + 14, 4.5, 0, TAU); g.fill(); U.T(g, text, x + 28, y + 19, { w: 600, s: 13, ls: 2, c: '#eef4f0' }); };
    U.pill = (g, cx, y, text, dot) => { g.font = `600 13px ${FONT.body}`; g.letterSpacing = '2.6px'; const w = g.measureText(text).width + 44; g.letterSpacing = '0px'; g.fillStyle = 'rgba(8,20,24,.6)'; g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1.2; g.beginPath(); g.roundRect(cx - w / 2, y, w, 30, 15); g.fill(); g.stroke(); g.fillStyle = dot; g.beginPath(); g.arc(cx - w / 2 + 17, y + 15, 4, 0, TAU); g.fill(); U.T(g, text, cx + 8, y + 20, { w: 600, s: 13, ls: 2.6, a: 'center', c: '#eef4f0' }); };
    U.typed = (str, lt, t0, cps) => str.slice(0, Math.max(0, Math.floor((lt - t0) * cps)));
    U.card = (g, x, y, w, h, c, title, sub, bullets, lt) => { // caption card: title types in, subtitle fades, bullets type one by one
      const rgb = hx(c); U.glass(g, x, y, w, h, 10, drk(rgb, .82), .6, 'rgba(255,255,255,.14)'); g.fillStyle = c; g.fillRect(x, y + 4, 3, h - 8);
      U.T(g, U.typed(title, lt, .05, 40), x + 19, y + 38, { f: FONT.display, w: 700, s: 28, c });
      U.T(g, sub, x + 19, y + 61, { w: 400, s: 15, c: '#e5ece7', al: eo(p(lt, .3, .3)) });
      bullets.forEach((b, i) => U.T(g, '› ' + U.typed(b, lt, .5 + i * .18, 60), x + 19, y + 86 + i * 18, { f: FONT.mono, w: 400, s: 12.5, c: '#d6dfd9' }));
    };
    U.reticle = (g, x, y, lt, rgb, label = 'FOCUS LOCK') => { const fk = eo(p(lt, .15, .5)), rs = 100 * (1.35 - .35 * fk);
      g.save(); g.globalAlpha = .4 + .6 * fk; g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { g.beginPath(); g.moveTo(x + sx * rs, y + sy * (rs - 14)); g.lineTo(x + sx * rs, y + sy * rs); g.lineTo(x + sx * (rs - 14), y + sy * rs); g.stroke(); });
      g.fillStyle = rgba(drk(rgb, .55), .55); g.fillRect(x + rs - 6, y - rs - 12, 112, 22); U.T(g, `${label} · ${(97 + 2 * fk).toFixed(0)}%`, x + rs + 2, y - rs + 4, { w: 600, s: 11.5, ls: 1.5, c: '#e8f0ea' }); g.restore(); };
    U.scaleBar = (g, x, y, len, text) => { g.save(); g.strokeStyle = '#eef4f0'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x, y + 6); g.moveTo(x, y); g.lineTo(x + len, y); g.moveTo(x + len, y - 6); g.lineTo(x + len, y + 6); g.stroke(); g.restore(); U.T(g, text, x + len / 2, y - 10, { f: FONT.mono, w: 400, s: 13, a: 'center', c: '#eef4f0' }); };
    U.locator = (g, x, y, w, h, thumb, cam, viewH, c) => { // overview thumbnail + the camera's current window
      const R = thumb.region, sc = w / R.w, vw = F.W / cam.z, vh = viewH / cam.z, bx = x + (cam.x - vw / 2 - (R.cx - R.w / 2)) * sc, by = y + (cam.y - vh / 2 - (R.cy - R.h / 2)) * sc;
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.drawImage(thumb, x, y, w, h); g.strokeStyle = c; g.lineWidth = 2; g.strokeRect(bx, by, vw * sc, vh * sc); g.fillStyle = rgba(hx(c), .12); g.fillRect(bx, by, vw * sc, vh * sc); g.restore();
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, w, h);
    };
    U.seq = (g, x, y, colors, k, step = 17.8) => colors.forEach((c, i) => { const on = i === k; g.fillStyle = rgba(hx(c), on ? 1 : .35); if (on) { g.shadowColor = c; g.shadowBlur = 10; } g.fillRect(x + i * step - (on ? 1 : 0), y - (on ? 1 : 0), on ? 14 : 12, on ? 14 : 12); g.shadowBlur = 0; });
    U.segMeter = (g, x, y, w, n, f, c0 = [60, 210, 100], c1 = [190, 255, 90]) => { const fill = Math.round(clamp(f) * n), st = w / n; for (let i = 0; i < n; i++) { g.fillStyle = i < fill ? rgba(mix(c0, c1, i / Math.max(1, fill))) : 'rgba(255,255,255,.08)'; g.fillRect(x + i * st, y, st - 2.1, 8); } };
    U.gauge = (g, x, y, r, f, text, unit, c = '#4fc4ff') => { g.save(); g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.strokeStyle = c; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, r, Math.PI * .75, Math.PI * .75 + TAU * .75 * clamp(f)); g.stroke(); g.restore(); U.T(g, text, x, y + 6, { w: 700, s: 16, a: 'center', c: '#f2f6f3' }); if (unit) U.T(g, unit, x, y + 42, { f: FONT.mono, w: 400, s: 9.5, a: 'center', c: '#9fb0a5' }); };
    U.histo = (g, x, y, n, step, t, c = [120, 255, 90]) => { for (let i = 0; i < n; i++) { const h = 4 + 18 * clamp(.5 + .5 * wob(t * 2.2 + i * .37, i * 1.7)); g.fillStyle = rgba(c, .35 + .6 * (h / 22)); g.fillRect(x + i * step, y - h, step * .63, h); } };
    U.wave = (g, x, y, w, t, c = 'rgba(232,199,90,.85)') => { g.save(); g.strokeStyle = c; g.lineWidth = 1.6; g.beginPath(); for (let i = 0; i <= w; i += 3) { const yy = y + Math.sin(i * .05 + t * 4) * 6 * Math.sin(i * .013 + t) + Math.sin(i * .17 - t * 6) * 1.5; i ? g.lineTo(x + i, yy) : g.moveTo(x, yy); } g.stroke(); g.restore(); };
    U.stream = (g, x, y, w, rows, t, seq, pair) => { // scrolling letter rows (DNA, hex, telemetry)
      g.save(); g.beginPath(); g.rect(x - 2, y - 18, w + 2, rows.length * 18 + 6); g.clip();
      rows.forEach(([c, a, sp, flip], r) => { const off = t * sp, i0 = Math.floor(off), fr = off - i0;
        for (let j = -1; j < w / 15.2 + 1; j++) { const ch = seq[((i0 + j + r * 97) % seq.length + seq.length) % seq.length], xx = x + (j - fr) * 15.2; U.T(g, flip && pair ? pair[ch] || ch : ch, xx, y + r * 18, { f: FONT.mono, w: 400, s: 14, c: rgba(c, a * clamp((x + w - xx) / 60)) }); } });
      g.restore(); };
    U.log = (g, x, y, w, h, lines, t, rate = 1.6, shown = 9) => { const lp = t * rate, li = Math.floor(lp), lf = lp - li;
      g.save(); g.beginPath(); g.rect(x - 2, y, w, h); g.clip();
      for (let j = 0; j <= shown; j++) { const yy = y + 17 + (j - lf) * 17, last = j === shown - 1, line = lines[(((li + j) % lines.length) + lines.length) % lines.length], fade = clamp((yy - y - 3) / 40) * (j >= shown ? 0 : 1);
        U.T(g, (last ? '› ' : '  ') + line, x, yy, { f: FONT.mono, w: 400, s: 12, c: last ? '#eef4f0' : '#9fb0a5', al: fade * (last ? 1 : .85) }); }
      g.restore(); };
    return U;
  }

  // ---------- player: render hooks for render.mjs (?render) + a small play/seek bar ----------
  function player(F, canvas, el = {}) {
    const RENDER = new URLSearchParams(location.search).has('render'), ctx = canvas.getContext('2d');
    canvas.width = F.W; canvas.height = F.H; if (el.stage) el.stage.style.aspectRatio = `${F.W} / ${F.H}`;
    if (RENDER) document.documentElement.classList.add('render');
    window.DURATION = F.DURATION; window.renderAt = t => F.renderAt(ctx, t);
    let resolve; window.ready = new Promise(r => resolve = r);
    let playing = !RENDER, t0 = 0, cur = +(new URLSearchParams(location.search).get('t') || 0) % F.DURATION || 0, basic = false;   // ?t=12 starts there
    const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const set = v => { playing = v; if (el.pp) el.pp.textContent = v ? '❚❚' : '▶'; if (v) t0 = performance.now() / 1000 - cur; };
    if (el.seek) { el.seek.max = F.DURATION; el.seek.oninput = () => { cur = +el.seek.value; if (playing) t0 = performance.now() / 1000 - cur; }; }
    if (el.pp) el.pp.onclick = () => set(!playing);
    if (el.stage) el.stage.onclick = () => set(!playing);
    document.addEventListener('keydown', e => { if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); set(!playing); } });
    const frame = now => {
      if (basic) { if (playing) { cur = ((now / 1000 - t0) % F.DURATION + F.DURATION) % F.DURATION; if (el.seek) el.seek.value = cur; } F.renderAt(ctx, cur); if (el.time) el.time.textContent = `${fmt(cur)} / ${fmt(F.DURATION)}`; }
      requestAnimationFrame(frame);
    };
    F.build(f => { if (el.load) el.load.textContent = `building… ${Math.round(f * 100)}%`; }, () => { basic = true; t0 = performance.now() / 1000 - cur; if (el.load) el.load.style.opacity = 0; })
      .then(() => { if (el.load) el.load.remove(); resolve(); });
    if (!RENDER) requestAnimationFrame(frame);
  }

  window.SZ = {
    TAU, mk, TEX, rng, clamp, lerp, p, eo, eio, ss, wob, hx, mix, rgba, WHITE, BLACK, lit, drk,
    circleP, ellP, lineP, cr, smoothP, blobPts, insetPoly, reflect,
    noiseTex, texOver, devScale, innerShadow, blurLayer, layer, bloom, baseTextures, fiberTex, xrayOf,
    sphere, body, tube, fiberBand, network, dots, liquidBody, bubbles, fieldBase, prism, rot3,
    LAYOUT, film, FONT, loadFonts, ui, player,
  };
})();

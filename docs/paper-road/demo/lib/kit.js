/* paper-road · lib/kit.js — paper props drawn in code (window.PK). Each prop is a card (see R.card in paper.js):
   `shape` is the silhouette (shadow + paper grain), `paint` is ordinary Canvas 2D drawing in local units where
   x runs right, y runs DOWN, and y = 0 is the card's base. 1 local unit = 1 world unit at scale 1.
   Every prop takes {pop: {t, dur, mode}} so it can fold up, drop in or scale in at a moment. */
(function (root) {
  'use strict';
  const { clamp, lerp, mix, shade, rng, EASE, V } = root.PR;
  const INK = '#211d1a';
  const outline = (g, w = 2.4) => { g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = w; g.stroke(); };

  // ---------------------------------------------------------------------------------------------------
  // car: a toy car (side view, facing +x) that drives along a path.
  // car(R, {path, s: t => arc length, color, driver: {hat, glasses, scarf}, wave: t => 0..1, scale, name})
  // returns {pos(t), s(t)} so a camera can follow it.
  function car(R, o) {
    const P = o.path, s = o.s, col = o.color || '#ea6a2c', sc = o.scale || 1, name = o.name || 'car';
    const lenUnits = 170;
    const pos = t => { const a = P.at(s(t)); return V.add(a.P, V.mul(a.N, 1)); };
    const face = t => {
      const a = P.at(s(t));
      // keep the side view: damp how much the car turns into depth, so floor curves read as a toy turning, not a card going edge-on
      let U = V.norm([a.T[0], a.T[1], a.T[2] * 0.35]);
      const flip = U[0] < 0; if (flip) U = V.mul(U, -1);
      return { U, V: a.N };
    };
    const mirror = t => P.at(s(t)).T[0] < 0;
    const shape = g => { g.beginPath(); bodyPath(g); g.rect(-70, -34, 40, 34); g.rect(30, -34, 40, 34); };
    R.card({
      name, at: t => pos(t), face, mirror, scale: sc, box: [-100, -120, 100, 6], shadow: 0.55, boil: 0.7, zBias: -6, ...o.card,
      shape, paint: (g, t) => {
        const S = s(t), spin = S / 17;
        const bob = Math.sin(S * 0.09) * 0.8;
        // contact shadow on the road
        g.save(); g.translate(0, 1); g.scale(1, 0.075); const sg = g.createRadialGradient(0, 0, 0, 0, 0, 92);
        sg.addColorStop(0, 'rgba(30,20,10,0.34)'); sg.addColorStop(0.7, 'rgba(30,20,10,0.22)'); sg.addColorStop(1, 'rgba(30,20,10,0)');
        g.fillStyle = sg; g.fillRect(-95, -95, 190, 190); g.restore();
        g.save(); g.translate(0, bob);
        paintCar(g, t, { col, driver: o.driver || {}, wave: o.wave ? o.wave(t) : 0, scarf: o.scarf !== false, pose: R.pose, spin });
        g.restore();
        wheel(g, -50, -17, 17, spin); wheel(g, 52, -17, 17, spin);
      },
    });
    return { pos, s, length: lenUnits * sc };
  }
  function bodyPath(g) {
    g.moveTo(-86, -22);
    g.bezierCurveTo(-90, -42, -78, -60, -58, -70);
    g.bezierCurveTo(-36, -84, 4, -86, 24, -70);
    g.bezierCurveTo(32, -62, 38, -54, 44, -50);
    g.bezierCurveTo(64, -48, 84, -44, 88, -30);
    g.lineTo(88, -20);
    g.lineTo(-86, -18);
    g.closePath();
  }
  function paintCar(g, t, o) {
    const col = o.col;
    // body
    g.beginPath(); bodyPath(g);
    const gr = g.createLinearGradient(0, -86, 0, -18);
    gr.addColorStop(0, shade(col, 0.22)); gr.addColorStop(0.55, col); gr.addColorStop(1, shade(col, -0.22));
    g.fillStyle = gr; g.fill(); outline(g, 2.6);
    // wheel arches
    g.fillStyle = shade(col, -0.45);
    for (const x of [-50, 52]) { g.beginPath(); g.arc(x, -18, 23, Math.PI, 0); g.closePath(); g.fill(); outline(g, 2); }
    // window + driver
    g.save();
    g.beginPath(); g.moveTo(-58, -50); g.bezierCurveTo(-54, -64, -40, -76, -14, -77); g.bezierCurveTo(4, -77, 18, -68, 32, -52); g.closePath();
    g.fillStyle = '#cfe6e4'; g.fill(); g.clip();
    driver(g, o);
    g.restore();
    g.beginPath(); g.moveTo(-58, -50); g.bezierCurveTo(-54, -64, -40, -76, -14, -77); g.bezierCurveTo(4, -77, 18, -68, 32, -52); g.closePath(); outline(g, 2.2);
    g.beginPath(); g.moveTo(-20, -77); g.lineTo(-22, -50); outline(g, 2);                       // window pillar
    arm(g, o);
    // door, handle, light, bumpers
    g.beginPath(); g.moveTo(-26, -48); g.lineTo(-24, -24); g.moveTo(28, -50); g.quadraticCurveTo(30, -36, 26, -24); outline(g, 1.6);
    g.beginPath(); g.moveTo(14, -44); g.lineTo(22, -44); outline(g, 2.6);
    g.beginPath(); g.arc(78, -38, 7, 0, Math.PI * 2); g.fillStyle = '#fff4cf'; g.fill(); outline(g, 1.8);
    g.beginPath(); g.arc(-80, -40, 5, 0, Math.PI * 2); g.fillStyle = '#c8342a'; g.fill(); outline(g, 1.6);
    g.fillStyle = '#d9d6cf';
    g.beginPath(); g.rect(76, -24, 16, 6); g.fill(); outline(g, 1.6);
    g.beginPath(); g.rect(-92, -24, 14, 6); g.fill(); outline(g, 1.6);
    // highlight
    g.globalAlpha = 0.45; g.strokeStyle = '#fff6e6'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-60, -66); g.bezierCurveTo(-40, -80, -8, -82, 12, -74); g.stroke(); g.globalAlpha = 1;
  }
  function driver(g, o) {
    const d = o.driver; if (d === false) return;
    const skin = d.skin || '#f0cfae', x = 2, y = -62;
    // body + scarf
    g.fillStyle = d.shirt || '#f39a3c'; g.beginPath(); g.ellipse(x, y + 18, 16, 12, 0, 0, Math.PI * 2); g.fill(); outline(g, 1.6);
    g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fillStyle = skin; g.fill(); outline(g, 1.8);
    if (d.glasses !== false) { g.fillStyle = INK; g.beginPath(); g.roundRect(x + 1, y - 4, 13, 6, 2); g.fill(); g.beginPath(); g.roundRect(x - 9, y - 4, 8, 6, 2); g.fill(); }
    if (d.hat !== false) {
      g.fillStyle = d.hatColor || '#eee3cc';
      g.beginPath(); g.moveTo(x - 17, y - 6); g.quadraticCurveTo(x - 12, y - 10, x - 9, y - 12); g.quadraticCurveTo(x, y - 24, x + 10, y - 12);
      g.quadraticCurveTo(x + 14, y - 10, x + 18, y - 7); g.quadraticCurveTo(x, y - 10, x - 17, y - 6); g.closePath(); g.fill(); outline(g, 1.6);
    }
  }
  function wheel(g, x, y, r, spin) {
    g.save(); g.translate(x, y);
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fillStyle = '#1d1b1d'; g.fill(); outline(g, 2);
    g.beginPath(); g.arc(0, 0, r * 0.55, 0, Math.PI * 2); g.fillStyle = '#d8d4cc'; g.fill(); outline(g, 1.5);
    g.rotate(spin); g.strokeStyle = '#6d6a66'; g.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * 3, Math.sin(a) * 3); g.lineTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); g.stroke(); }
    g.beginPath(); g.arc(0, 0, 2.6, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
    g.restore();
  }
  // an arm out of the window, drawn after the window clip so a wave can reach above the roof
  function arm(g, o) {
    if (!(o.wave > 0.01) || o.driver === false) return;
    const a = -0.35 - o.wave * (1.0 + 0.35 * Math.sin(o.pose * 2.1));
    const sx = 16, sy = -50, l1 = 22, l2 = 20;
    const ex = sx + Math.cos(a + 0.6) * l1, ey = sy + Math.sin(a + 0.6) * l1, hx = ex + Math.cos(a) * l2, hy = ey + Math.sin(a) * l2;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.lineTo(hx, hy);
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = INK; g.lineWidth = 8.4; g.stroke();
    g.strokeStyle = o.driver.shirt || '#f39a3c'; g.lineWidth = 5.4; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
    g.strokeStyle = o.driver.skin || '#f0cfae'; g.beginPath(); g.moveTo(ex, ey); g.lineTo(hx, hy); g.stroke();
    g.beginPath(); g.arc(hx, hy, 5, 0, Math.PI * 2); g.fillStyle = o.driver.skin || '#f0cfae'; g.fill(); outline(g, 1.6);
  }

  // ---------------------------------------------------------------------------------------------------
  // mountain: a folded paper peak with a crease, a lit and a shaded face and an optional snow cap.
  // mountain(R, {x, z, w, h, peak: -0.5..0.5, snow: 0..0.5, lit, dark, pop, scale, seed})
  function mountain(R, o) {
    const w = o.w || 300, h = o.h || 260, px = (o.peak ?? 0) * w * 0.5, cx = px + w * (o.crease ?? 0.1), sn = o.snow ?? 0.24;
    const lit = o.lit || '#eee4cf', dark = o.dark || shade(lit, -0.2), r = rng(o.seed || (w * 7 + h) | 0);
    const zz = []; const nz = 5; for (let i = 0; i <= nz; i++) zz.push(r.range(-0.35, 0.35));
    const edgeAt = (side, f) => side < 0 ? [lerp(px, -w / 2, f), lerp(-h, 0, f)] : [lerp(px, w / 2, f), lerp(-h, 0, f)];
    const shape = g => { g.moveTo(-w / 2, 0); g.lineTo(px, -h); g.lineTo(w / 2, 0); g.closePath(); };
    R.card({
      name: o.name || 'mountain', at: [o.x, o.y || 0, o.z || 300], scale: o.scale || 1, pop: o.pop, out: o.out, box: [-w / 2 - 4, -h - 4, w / 2 + 4, 4],
      shadow: o.shadow ?? 0.9, clipFloor: true, boil: o.boil ?? 0.6, blur: o.blur,
      shape, paint: g => {
        g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(px, -h); g.lineTo(cx, 0); g.closePath(); g.fillStyle = lit; g.fill();
        g.beginPath(); g.moveTo(cx, 0); g.lineTo(px, -h); g.lineTo(w / 2, 0); g.closePath(); g.fillStyle = dark; g.fill();
        // a second, softer fold on the lit face
        g.beginPath(); g.moveTo(px, -h); g.lineTo(lerp(-w / 2, cx, 0.45), 0); g.lineTo(cx, 0); g.closePath(); g.fillStyle = shade(lit, -0.06); g.fill();
        if (sn > 0) {
          const L = edgeAt(-1, sn), Rr = edgeAt(1, sn * 0.9), C = [lerp(px, cx, sn), lerp(-h, 0, sn)];
          const zig = []; for (let i = 0; i <= nz; i++) { const f = i / nz; const x = lerp(L[0], Rr[0], f), y = lerp(L[1], Rr[1], f); zig.push([x, y + (i % 2 ? -1 : 1) * h * 0.035 + zz[i] * h * 0.03]); }
          g.beginPath(); g.moveTo(px, -h); zig.forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fillStyle = '#fbf8f1'; g.fill();
          g.save(); g.beginPath(); g.moveTo(cx, 0); g.lineTo(px, -h); g.lineTo(w / 2, 0); g.closePath(); g.clip();
          g.beginPath(); g.moveTo(px, -h); zig.forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fillStyle = '#ddd8cf'; g.fill(); g.restore();
          g.beginPath(); zig.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); outline(g, 1.6);
        }
        g.beginPath(); g.moveTo(px, -h); g.lineTo(cx, 0); g.globalAlpha = 0.55; outline(g, 1.4); g.globalAlpha = 1;
        g.beginPath(); shape(g); outline(g, 2.2);
      },
    });
  }
  // range: a row of mountains with seeded variety. range(R, {x0, x1, z, n, h: [min,max], seed, pop: {t0, step, dur}})
  function range(R, o) {
    const r = rng(o.seed || 3), n = o.n || 5, out = [];
    for (let i = 0; i < n; i++) {
      const f = n === 1 ? 0.5 : i / (n - 1), h = r.range(o.h ? o.h[0] : 180, o.h ? o.h[1] : 320), w = h * r.range(1.0, 1.35);
      const m = { x: lerp(o.x0, o.x1, f) + r.range(-40, 40), z: (o.z || 400) + r.range(-60, 60), w, h, peak: r.range(-0.35, 0.35), snow: o.snow ?? r.range(0.15, 0.3),
        lit: o.lit, dark: o.dark, seed: (o.seed || 3) * 100 + i, scale: 1, blur: o.blur, name: o.name };
      if (o.pop) m.pop = { t: (typeof o.pop.t === 'function' ? o.pop.t(m.x) : o.pop.t0 + i * (o.pop.step || 0.15)), dur: o.pop.dur || 0.5, mode: o.pop.mode || 'fold' };
      mountain(R, m); out.push(m);
    }
    return out;
  }

  // cloud: a cut-paper cloud. cloud(R, {x, y, z, w, drift: px per s, pop})
  function cloud(R, o) {
    const w = o.w || 160, r = rng(o.seed || (w | 0) + 11);
    const puffs = [[-0.3, -0.14, 0.2], [-0.05, -0.26, 0.25], [0.24, -0.18, 0.21], [0.05, -0.1, 0.2]].map(([x, y, rr]) => [x * w + r.range(-4, 4), y * w, rr * w * r.range(0.9, 1.1)]);
    const shape = g => { for (const [x, y, rr] of puffs) { g.moveTo(x + rr, y); g.arc(x, y, rr, 0, Math.PI * 2); } g.rect(-0.46 * w, -0.13 * w, 0.92 * w, 0.13 * w); };
    R.card({
      name: o.name || 'cloud', at: t => [o.x + (o.drift || 0) * t, o.y || 300, o.z || 700], scale: o.scale || 1, pop: o.pop || null, box: [-w * 0.6, -w * 0.6, w * 0.6, 4],
      shadow: 0.7, boil: 0.8, blur: o.blur,
      shape, paint: g => {
        g.beginPath(); shape(g); g.lineWidth = 4.6; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke();
        g.fillStyle = o.color || '#f3ead8'; g.fill();
        g.save(); g.beginPath(); shape(g); g.clip(); g.fillStyle = shade(o.color || '#f3ead8', -0.1); g.fillRect(-w, -0.06 * w, 2 * w, 0.06 * w); g.restore();
      },
    });
  }

  // sun: a paper disc. sun(R, {x, y: t => y, z, r, color, pop})
  function sun(R, o) {
    const rr = o.r || 260, col = o.color || '#f0622d';
    const shape = g => { g.arc(0, -rr, rr, 0, Math.PI * 2); };
    R.card({
      name: o.name || 'sun', at: t => [o.x, typeof o.y === 'function' ? o.y(t) : (o.y || 0), o.z || 1400], scale: 1, pop: o.pop, box: [-rr - 4, -2 * rr - 4, rr + 4, 4],
      shadow: 0.6, boil: 0.5, clipFloor: true, blur: o.blur,
      shape, paint: g => {
        g.beginPath(); shape(g);
        const gr = g.createRadialGradient(-rr * 0.3, -rr * 1.35, rr * 0.1, 0, -rr, rr);
        gr.addColorStop(0, shade(col, 0.28)); gr.addColorStop(1, shade(col, -0.08));
        g.fillStyle = gr; g.fill(); outline(g, 2.4);
      },
    });
  }

  // pine: a stacked-triangle paper tree. pine(R, {x, z, h, color, pop})
  function pine(R, o) {
    const h = o.h || 150, w = h * 0.5, col = o.color || '#e7dcc4', tiers = o.tiers || 3;
    const shape = g => { for (let i = 0; i < tiers; i++) { const y0 = -h * 0.15 - i * h * 0.25, hh = h * 0.42; const ww = w * (1 - i * 0.22); g.moveTo(-ww / 2, y0); g.lineTo(0, y0 - hh); g.lineTo(ww / 2, y0); g.closePath(); } g.rect(-w * 0.06, -h * 0.16, w * 0.12, h * 0.16); };
    R.card({
      name: o.name || 'pine', at: [o.x, 0, o.z || 300], scale: o.scale || 1, pop: o.pop, box: [-w, -h - 10, w, 4], shadow: 0.8, boil: 0.6, clipFloor: true, blur: o.blur,
      shape, paint: g => {
        g.fillStyle = shade(col, -0.35); g.beginPath(); g.rect(-w * 0.06, -h * 0.16, w * 0.12, h * 0.16); g.fill(); outline(g, 1.6);
        for (let i = 0; i < tiers; i++) {
          const y0 = -h * 0.15 - i * h * 0.25, hh = h * 0.42, ww = w * (1 - i * 0.22);
          g.beginPath(); g.moveTo(-ww / 2, y0); g.lineTo(0, y0 - hh); g.lineTo(0, y0); g.closePath(); g.fillStyle = col; g.fill();
          g.beginPath(); g.moveTo(0, y0); g.lineTo(0, y0 - hh); g.lineTo(ww / 2, y0); g.closePath(); g.fillStyle = shade(col, -0.18); g.fill();
          g.beginPath(); g.moveTo(-ww / 2, y0); g.lineTo(0, y0 - hh); g.lineTo(ww / 2, y0); g.closePath(); outline(g, 1.8);
        }
      },
    });
  }

  // hill: a rounded paper mound. hill(R, {x, z, w, h, color, pop})
  function hill(R, o) {
    const w = o.w || 500, h = o.h || 120, col = o.color || '#e3d6b9';
    const shape = g => { g.moveTo(-w / 2, 0); g.bezierCurveTo(-w * 0.3, -h * 1.3, w * 0.3, -h * 1.3, w / 2, 0); g.closePath(); };
    R.card({
      name: o.name || 'hill', at: [o.x, 0, o.z || 500], scale: 1, pop: o.pop, box: [-w / 2, -h * 1.1, w / 2, 4], shadow: 0.7, boil: 0.4, clipFloor: true, blur: o.blur,
      shape, paint: g => { g.beginPath(); shape(g); const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0); gr.addColorStop(0, shade(col, 0.08)); gr.addColorStop(1, shade(col, -0.12)); g.fillStyle = gr; g.fill(); outline(g, 2); },
    });
  }

  // sign: a road sign on a post (no text — a symbol: 'end' (T-bar), 'curve', 'loop'). sign(R, {x, z, h, symbol, pop})
  function sign(R, o) {
    const h = o.h || 170, s = 34;
    const shape = g => { g.rect(-3, -h, 6, h); g.moveTo(0, -h - s); g.lineTo(s, -h); g.lineTo(0, -h + s); g.lineTo(-s, -h); g.closePath(); };
    R.card({
      name: o.name || 'sign', at: [o.x, 0, o.z || 120], scale: o.scale || 1, pop: o.pop, box: [-s - 4, -h - s - 4, s + 4, 4], shadow: 0.8, boil: 0.6, clipFloor: true,
      shape, paint: g => {
        g.fillStyle = '#9b958c'; g.beginPath(); g.rect(-3, -h, 6, h); g.fill(); outline(g, 1.6);
        g.beginPath(); g.moveTo(0, -h - s); g.lineTo(s, -h); g.lineTo(0, -h + s); g.lineTo(-s, -h); g.closePath(); g.fillStyle = o.color || '#f2c230'; g.fill(); outline(g, 2.2);
        g.save(); g.translate(0, -h); g.strokeStyle = INK; g.lineWidth = 5; g.lineCap = 'butt';
        const sym = o.symbol || 'end';
        if (sym === 'end') { g.beginPath(); g.moveTo(0, 14); g.lineTo(0, -6); g.moveTo(-12, -8); g.lineTo(12, -8); g.stroke(); }
        if (sym === 'curve') { g.beginPath(); g.moveTo(-4, 14); g.bezierCurveTo(-4, 0, 8, 0, 6, -12); g.stroke(); }
        if (sym === 'loop') { g.beginPath(); g.moveTo(-12, 12); g.lineTo(-2, 4); g.arc(2, -3, 8, Math.PI * 0.8, Math.PI * 2.6); g.lineTo(12, 12); g.stroke(); }
        g.restore();
      },
    });
  }

  root.PK = { car, mountain, range, cloud, sun, pine, hill, sign, INK, outline, paintCar, wheel };
})(typeof window !== 'undefined' ? window : globalThis);

/* sea-pixelsea-props.js — the film's own pixel props for scene sea-pixelsea (쭈꾸미 낚시), drawn with the Pixelsea kit.
   NOT part of the kit: the 쭈꾸미 (the one red thing), the 에기 lure, the sinker, the bucket, the fisher's palette.
   Every function draws in BUFFER pixels of the current Pixelsea buffer, whole pixels only. Global: window.SeaProps */
(function () {
  const PS = Pixelsea, { clamp, lerp } = Pilot, R = PS.R;
  const SP = {};
  // 명현 (the fisher, scene 1 — see BRIEF.md CAST): a woman, dark hair tied back in a low bun under the mustard bucket hat
  // (her identity mark #e2a93b), navy top.
  SP.MH = { skin: '#f2c49e', skinS: '#cc916c', hair: '#231a22', top: '#26386a', topS: '#18244a', topHi: '#3a5294', pants: '#3b3a4c', shoe: '#1c1820', hat: '#e2a93b', hatS: '#a8761e', hatStyle: 'bucket', hairStyle: 'tied', tie: '#a8761e' };
  SP.ROD = '#2a2230'; SP.ROD_TIP = '#d8cce0'; SP.LINE = '#f2ecff';
  // the 쭈꾸미: accent red body, a darker red shade, a warm highlight, pale suckers
  SP.OCTO = { body: PS.ACCENT, shade: '#9a2a20', hi: '#f2805c', sucker: '#f6c0a2', eye: '#fff8ec' };

  // octo(c, x, y, s, o): one 쭈꾸미. (x, y) = where the eight arms meet, the mantle above; s = mantle width (px, 6–30).
  // o.mode 'crawl' (arms spread on the ground, tips curling), 'hang' (lifted: arms hanging, swaying), 'cling' (wrapped
  // round a point o.at below/beside it), 'rim' (draped over a bucket rim: arms hang down both sides of row y),
  // o.ph (phase, advance it on steps), o.f (±1 which way it looks), o.lean (px the mantle leans), o.outline (default ink).
  SP.octo = function (c, x, y, s, o = {}) {
    x = Math.round(x); y = Math.round(y);
    const C = SP.OCTO, mode = o.mode || 'crawl', ph = o.ph || 0, f = o.f ?? -1, mh = Math.round(s * 1.15), La = s * (o.reach ?? 1.4), n = 7, th = s >= 16 ? 3 : s >= 10 ? 2 : 1;
    const mc = [x + (o.lean || 0), y - Math.round(mh * .5)];
    const arms = [];
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1, k = Math.abs(i - 3.5) / 3.5, root = [x + Math.round((i - 3.5) * s * .1), y];
      let a, curl, step = La / n;
      if (mode === 'crawl') {                    // fanned out along the ground, tips curling up; the front pair reaching
        const front = side === f, w = Math.sin(ph * 2.1 + i * 1.3);
        a = side > 0 ? lerp(1.15, .05, k) : lerp(2.0, 3.1, k); a += (front ? -.12 : .1) * side * w;
        curl = -side * (.22 + .12 * Math.sin(ph * 1.7 + i)); step *= front && k > .5 ? 1.15 + .12 * w : 1;
      } else if (mode === 'hang') {              // hanging down, swaying together, tips curling out
        a = Math.PI / 2 + (i - 3.5) * .16 + .25 * Math.sin(ph * 1.6) * (.4 + k); curl = side * (.06 + .16 * k) + .08 * Math.sin(ph * 2.3 + i);
      } else if (mode === 'cling') {             // gathered round the point o.at, curling in on it
        const t = o.at || [x, y + s], d = Math.atan2(t[1] - y, t[0] - x); a = d + (i - 3.5) * .2; curl = -(i - 3.5) * .09 + .05 * Math.sin(ph * 3 + i);
        step = Math.max(1.2, Math.hypot(t[0] - x, t[1] - y) * 1.25 / n);
      } else {                                   // rim: outer arms over the rim, inner ones splayed inside
        a = side > 0 ? lerp(.9, .1, k) : lerp(2.2, 3.0, k); curl = -side * (k > .6 ? -.35 : .25) + .1 * Math.sin(ph * 2 + i); if (k > .6) { step *= 1.1; }
      }
      const pts = [root]; let p = root.slice(), ang = a;
      for (let j = 0; j < n; j++) { ang += curl * (j > 4 ? 2.6 : j > 2 ? 1.5 : .5); p = [p[0] + Math.cos(ang) * step, p[1] + Math.sin(ang) * step]; if (mode === 'crawl' && p[1] > y + 1) p[1] = y + 1; pts.push(p.slice()); }
      arms.push({ pts, back: i % 2 === 1 });
    }
    const xs = [], ys = []; arms.forEach(A => A.pts.forEach(p => { xs.push(p[0]); ys.push(p[1]); })); xs.push(mc[0] - s, mc[0] + s); ys.push(mc[1] - mh);
    const draw = g => {
      const arm = (A, col) => A.pts.forEach((p, j) => { if (j) PS.pxLine(g, A.pts[j - 1][0], A.pts[j - 1][1], p[0], p[1], j < 3 ? th : j < 5 ? Math.max(1, th - 1) : 1, col); });
      arms.filter(A => A.back).forEach(A => arm(A, C.shade));
      arms.filter(A => !A.back).forEach(A => arm(A, C.body));
      if (s >= 12) arms.filter(A => !A.back).forEach(A => [2, 4].forEach(j => R(g, A.pts[j][0], A.pts[j][1] + 1, 1, 1, C.sucker)));
      // the mantle: a round bag, shaded on the side away from the light, a highlight top-left
      PS.pxEllipse(g, mc[0] + .5, mc[1], s / 2, mh / 2, C.body);
      g.save(); g.beginPath(); g.rect(mc[0] + Math.round(s * .12), mc[1] - mh, s, 2 * mh); g.clip(); PS.pxEllipse(g, mc[0] + .5, mc[1], s / 2, mh / 2, C.shade); g.restore();
      PS.pxEllipse(g, mc[0] + .5 + Math.round(s * .06), mc[1] - 1, s / 2 - 1, mh / 2 - 1, C.body);
      R(g, mc[0] - Math.round(s * .26), mc[1] - Math.round(mh * .3), Math.max(1, Math.round(s * .16)), Math.max(1, Math.round(s * .1)), C.hi);
      // the head band between mantle and arms, with the eyes
      const ey = y - Math.max(1, Math.round(s * .14)), ex = x + Math.round(f * s * .08);
      R(g, x - Math.round(s * .42), ey - 1, Math.round(s * .84), Math.max(2, Math.round(s * .22)), C.body);
      if (s >= 9) { for (const sx of [-1, 1]) { const e = ex + sx * Math.round(s * .22); R(g, e - 1, ey - 1, 2, 2, C.eye); R(g, e + (f > 0 ? 0 : -1), ey - (o.look === 'up' ? 1 : 0), 1, 1, PS.INK); } }
      else { R(g, ex - 2, ey, 1, 1, PS.INK); R(g, ex + 1, ey, 1, 1, PS.INK); }
    };
    const box = [Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) - Math.min(...xs) + 3, Math.max(...ys) - Math.min(...ys) + 3];
    if (o.outline === false) draw(c); else PS.stamp(c, box, draw, o.outline || '#2a0c14');
  };

  // egi(c, x, y, ang, len): the 에기 (squid-jig lure, ochre with a green back — NOT red): nose at (x, y), body along ang.
  // A shrimp body, an eye, side fins, the umbrella of hook pins at the tail.
  SP.egi = function (c, x, y, ang, len) {
    const ca = Math.cos(ang), sa = Math.sin(ang), P = (u, v) => [x + ca * u - sa * v, y + sa * u + ca * v], h = Math.max(1.5, len * .2);
    PS.stamp(c, [x - len - 6, y - len - 6, 2 * len + 12, 2 * len + 12], g => {
      for (let i = -2; i <= 2; i++) { const a = P(len + 1, 0), b = P(len + 4, i * 1.3); PS.pxLine(g, a[0], a[1], b[0], b[1], 1, '#c8ccd8'); }   // hook pins
      PS.pxPoly(g, [P(0, 0), P(len * .2, -h), P(len * .85, -h * .9), P(len + 1, -h * .3), P(len + 1, h * .4), P(len * .7, h), P(len * .2, h * .8)], '#e0a848');
      PS.pxPoly(g, [P(len * .15, -h * .9), P(len * .85, -h * .9), P(len * .85, -h * .2), P(len * .15, -h * .3)], '#4f8a4a');
      if (len >= 8) { const e = P(len * .18, -h * .1); R(g, e[0], e[1], 1, 1, PS.INK); const fn = P(len * .5, h * .9); PS.pxLine(g, fn[0], fn[1], fn[0] - ca * 2 - sa * 2, fn[1] - sa * 2 + ca * 2, 1, '#f2d27a'); }
    }, '#2a1a1a');
  };
  // sinker(c, x, y): the lead weight (a grey drop) hanging from the line at (x, y).
  SP.sinker = function (c, x, y) { PS.stamp(c, [x - 3, y - 1, 7, 7], g => { R(g, x - 1, y, 3, 1, '#9aa0ae'); R(g, x - 2, y + 1, 5, 3, '#8a8f9c'); R(g, x - 1, y + 4, 3, 1, '#6a6f7c'); R(g, x - 1, y + 1, 1, 2, '#c8ccd8'); }, '#20182a'); };

  // bucket(c, x, y, w, h, o): a plastic fishing bucket, top-centre (x, y), w wide at the rim, h tall; o.back = true draws only
  // the inside back wall (draw it first, then the contents, then the bucket front). Returns the rim row.
  SP.BUCKET = { body: '#a9bdd2', shade: '#7489a6', rim: '#e2ecf4', band: '#5f7aa0', inside: '#3e4c66' };
  SP.bucket = function (c, x, y, w, h, o = {}) {
    const B = SP.BUCKET, hw = w / 2, bw = w * .4;
    if (o.back) { PS.pxEllipse(c, x, y + 1, hw - 1, Math.max(1.5, w * .09), B.inside); return y; }
    PS.stamp(c, [x - hw - 2, y - 2, w + 4, h + 4], g => {
      PS.pxPoly(g, [[x - hw, y + 1], [x + hw, y + 1], [x + bw, y + h], [x - bw, y + h]], B.body);
      PS.pxPoly(g, [[x + hw * .45, y + 1], [x + hw, y + 1], [x + bw, y + h], [x + bw * .45, y + h]], B.shade);
      const by = y + Math.round(h * .28); PS.pxPoly(g, [[x - hw * .93, by], [x + hw * .93, by], [x + hw * .9, by + Math.max(1, Math.round(h * .1))], [x - hw * .9, by + Math.max(1, Math.round(h * .1))]], B.band);
      R(g, x - hw, y, w, Math.max(1, Math.round(h * .06)), B.rim);
      if (w >= 20) R(g, x - hw * .6, y + Math.round(h * .45), 1, Math.round(h * .35), B.rim);
    }, '#1e1a2c');
    return y;
  };

  window.SeaProps = SP;
})();

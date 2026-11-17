/* wet-ink.js — a live web page printed in wet ink.
 *
 * The page is ordinary HTML laid out inside a <canvas> (HTML-in-Canvas, through lib/hic.js). WebGL draws it as if every
 * mark on it were wet ink floating on a bath, the way a marbler's tray holds colour:
 *
 *   velocity   a small 2D fluid (stable fluids: splat → advect → project), damped by the ink's viscosity
 *   map        a displacement map, screen uv → sheet uv (sheet = uv + map(uv)), advected by the velocity every step.
 *              The live page is read through it, so the letters themselves are carried, combed and folded
 *   pigment    ribbons and drops laid by the comb, stored ON THE SHEET (through the map) as a distance-like ramp, so they
 *              are carried with the print and stay sharp however far they are pulled
 *   film       small snapshots of the map, recorded while it flows; Esc plays them backwards and everything settles home
 *   hit test   a small copy of the map read back to the CPU (async, PBO + fence). The page is placed for hit testing with
 *              the map's local affine at the pointer (S.placeLocal), so the word under the pointer is the word you click,
 *              wherever it has drifted. __hic.screenOf(el) inverts the map for checks
 *
 * Usage (see templates/index.html):
 *   <canvas id="stage" layoutsubtree content="drawable"><main id="page" drawable> …the page… </main></canvas>
 *   <script src="lib/hic.js"></script><script src="lib/wet-ink.js"></script>
 *   <script> window.INK = { pigments: 'input[name=pigment]', viscosity: { input: '#thick' }, … }; WetInk.start(INK); </script>
 *
 * Everything that changes with the topic is in the config object (WetInk.defaults lists every field with a comment).
 * Read references/ENGINE.md for the API, the test hook (window.__hic.ink) and how to add behaviour in a project.
 * No dependencies besides hic.js, no network.
 */
(function (root) {
  'use strict';
  var HIC = root.HIC, doc = root.document;
  var WetInk = { version: '1.0.0' };

  // ------------------------------------------------------------------------------------------------ defaults (the config)
  // Every number here is a starting point for a topic, not a law. Units: "sheet heights" (h) = fractions of the page
  // height, so the same numbers work at any window size; colours are CSS hex.
  WetInk.defaults = {
    canvas: '#stage',              // the <canvas layoutsubtree content="drawable">
    page: '#page',                 // its one drawable child: the whole page, sized to the window
    paper: null,                   // paper colour; null = the page's computed background colour. Print must be darker
    // Pigments: a selector for radio inputs (data-color="#hex", optional data-cover=".9"; value="none" stirs without
    // laying colour), or an array [{ name, color, cover }]. Up to 8. `cover` = how opaque the floated colour is (0–1).
    pigments: 'input[name=pigment]',
    pigment: 0,                    // index picked at start when pigments is an array
    viscosity: {
      input: null,                 // a range input (0–100) bound to it, or null
      value: 0.6,                  // 0 = thin (flows far, coasts long), 1 = thick (short drag, settles fast)
      damp: [0.5, 4.2],            // velocity damping per second, thin → thick (eased by value^1.6)
      radius: [0.035, 0.085]       // how wide the comb drags the bath (h), thin → thick
    },
    comb: {
      teeth: 1,                    // tines dragged side by side (1 = a stylus, 3–7 = a comb / a whisk)
      spacing: 0.035,              // between tines (h)
      push: 0.62,                  // how much of the hand's speed the bath takes
      cap: 4,                      // fastest the bath moves (h / s)
      ribbon: 0.024,               // widest ribbon of pigment a tine lays (half width, h); 0 lays none
      swell: 0.75,                 // hand speed (h / s) at which the ribbon reaches full width: slow = fine, quick = fat
      threads: 0.5,                // 0–1: tone lines along the ribbon, as a comb leaves them
      marker: 9                    // radius (px) of the ring drawn round each tine during the idle demo
    },
    drop: {
      radius: 0.05,                // a press without a drag lays a drop this size (h) once it has bloomed
      rings: 0,                    // 0 = a solid drop; n = n concentric bands (a marbler's bullseye, latte art)
      spread: 1,                   // 0–1: how hard it pushes the print aside as it blooms (area-preserving push)
      bloom: 0.45                  // seconds it takes to open
    },
    hover: 0.2,                    // a hand passing over (mouse, no button) stirs this much; 0 = off
    look: {
      grain: 1,                    // paper grain and fibres
      rim: 0.3,                    // ink pooling inside the edge of a shape
      thin: 0.45,                  // ink drawn out thins (lighter), squeezed ink darkens
      vein: 0.4,                   // print pulled very far opens into hairline rifts of paper
      sheen: 0.35,                 // wet highlight while the bath moves
      halo: 0.55,                  // a pale line where a ribbon pushes the print aside
      vignette: 0.08,
      markInk: null                // colour of the demo's comb rings (default: the darkest pigment)
    },
    settle: {
      key: 'Escape',               // key that settles everything (null = none)
      button: null,                // a button that does the same
      idle: 14,                    // seconds of stillness after which it settles by itself (0 = never)
      min: 1.1, max: 4.2           // the rewind takes this long (s), longer for a longer stir
    },
    // The page stirs itself until someone takes over. steps: { at, to, path } a stroke of the ghost comb along a path
    // (uv points or WetInk.path.*), { at, drop: [u, v] }, { at, type: 'text', into: '#field' }, { at, pick: '#radio' },
    // { at, settle: true }. Times in seconds from the start of the demo.
    demo: null,                    // { delay: 2.5, again: 40, steps: [...] }
    sound: null,                   // { toggle: '#sound', labels: ['Sound off', 'Sound on'], volume: 0.5 } — synthesised
    on: {},                        // hooks: stir(), drop(u, v), settle(), pigment(i, name), type()
    acts: {},                      // named scripted states for stills: { name: function (ink) { ink.stroke(…) } }
    quality: 'auto'                // 'auto' steps the canvas resolution down on a slow machine; or a number 0.5–1
  };

  // ------------------------------------------------------------------------------------------------ small helpers
  function merge(a, b) {
    var o = {};
    for (var k in a) o[k] = a[k];
    if (b) for (var j in b) {
      var v = b[j];
      o[j] = (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof root.Element) && a[j] && typeof a[j] === 'object' && !Array.isArray(a[j])) ? merge(a[j], v) : v;
    }
    return o;
  }
  function $(s) { return typeof s === 'string' ? doc.querySelector(s) : s; }
  function hexRGB(h) {
    h = String(h || '').trim();
    if (/^#[0-9a-f]{3}$/i.test(h)) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h);
    if (m) return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
    m = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/.exec(h);
    if (m) return [m[1] / 255, m[2] / 255, m[3] / 255];
    return [0.1, 0.1, 0.1];
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  var CONTROL = 'input,button,a[href],label,select,textarea,summary,[contenteditable]:not([contenteditable=false]),[data-ink-control]';
  function controlOf(t) { return t && t.closest ? t.closest(CONTROL) : null; }

  // ------------------------------------------------------------------------------------------------ paths for the ghost comb
  // Each returns function(asp) → [[u, v], …] in page fractions; asp (width / height) keeps circles round.
  WetInk.path = {
    line: function (x0, y0, x1, y1) { return function () { return [[x0, y0], [x1, y1]]; }; },
    // a wave from (x0,y0) to (x1,y1): amp in h, waves = number of crests
    wave: function (x0, y0, x1, y1, amp, waves) {
      return function (asp) {
        var pts = [], n = Math.max(8, Math.round(waves * 8)), dx = (x1 - x0) * asp, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
        for (var i = 0; i <= n; i++) {
          var s = i / n, o = amp * Math.sin(s * waves * 2 * Math.PI);
          pts.push([x0 + (x1 - x0) * s + (-dy / L) * o / asp, y0 + dy * s + (dx / L) * o]);
        }
        return pts;
      };
    },
    // a spiral round (cx, cy) from radius r0 to r1 (h) over `turns`
    spiral: function (cx, cy, r0, r1, turns, start) {
      return function (asp) {
        var pts = [], n = Math.max(12, Math.round(turns * 20)), a0 = start || 0;
        for (var i = 0; i <= n; i++) { var s = i / n, r = lerp(r0, r1, s), a = a0 + s * turns * 2 * Math.PI; pts.push([cx + Math.cos(a) * r / asp, cy + Math.sin(a) * r]); }
        return pts;
      };
    },
    // a loop (circle) of radius r (h), `turns` times round
    loop: function (cx, cy, r, turns, start) { return WetInk.path.spiral(cx, cy, r, r, turns || 1, start); },
    // a zigzag (the marbler's "get-gel" back-and-forth): `n` passes from x0 to x1 stepping down from y0 to y1
    zigzag: function (x0, y0, x1, y1, n) {
      return function () { var pts = []; for (var i = 0; i <= n; i++) pts.push([i % 2 ? x1 : x0, lerp(y0, y1, i / n)]); return pts; };
    }
  };
  function resolvePath(p, asp) { return typeof p === 'function' ? p(asp) : p; }
  // Catmull-Rom through the points, s in [0, 1]
  function along(pts, s) {
    if (pts.length === 1) return pts[0].slice();
    var f = clamp(s, 0, 1) * (pts.length - 1), i = Math.min(Math.floor(f), pts.length - 2), t = f - i;
    var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)], t2 = t * t, t3 = t2 * t;
    return [0, 1].map(function (k) {
      return 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
    });
  }
  function ease(x) { return x * x * (3 - 2 * x); }

  // Fit a headline into its box: the largest font size (px) between min and max at which it neither overflows its width
  // nor grows taller than maxHeight. Call after its text changes and on resize.
  WetInk.fitText = function (el, o) {
    o = o || {};
    var lo = o.min || 12, hi = o.max || 200, maxH = o.maxHeight || Infinity;
    for (var i = 0; i < 14; i++) {
      var mid = (lo + hi) / 2;
      el.style.fontSize = mid + 'px';
      if (el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= maxH + 1) lo = mid; else hi = mid;
    }
    el.style.fontSize = Math.floor(lo) + 'px';
    return lo;
  };

  // ------------------------------------------------------------------------------------------------ shaders
  var HEAD = '#version 300 es\nprecision highp float;\nprecision highp sampler2D;\nin vec2 vUv;\nout vec4 o;\n';
  var SEG = 'float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-10), 0., 1.); return length(pa - ba * h); }\n';
  // All simulation textures are addressed in "page uv" with y down (row 0 = the top of the page), the way the live
  // page's pixels arrive. Only the final pass flips to the screen. Positions in sheet units: x in [0, asp], y in [0, 1].
  var FS = {
    // The comb pushes the bath: each tine adds the hand's velocity along its segment, with a gaussian falloff.
    splat: HEAD + SEG + [
      'uniform sampler2D uV; uniform vec2 uA, uB, uVel; uniform float uR, uGain, uAsp, uSpace; uniform int uTeeth;',
      'void main(){',
      '  vec2 p = vUv * vec2(uAsp, 1.), ba = uB - uA; float L = length(ba); vec2 dir = L > 1e-6 ? ba / L : vec2(1., 0.), nr = vec2(-dir.y, dir.x);',
      '  float w = 0.;',
      '  for (int i = 0; i < 8; i++) { if (i >= uTeeth) break; float off = (float(i) - float(uTeeth - 1) * .5) * uSpace;',
      '    float d = seg(p, uA + nr * off, uB + nr * off) / uR; w = max(w, exp(-d * d)); }',
      '  vec2 v = texture(uV, vUv).xy; o = vec4(mix(v, uVel, clamp(w * uGain, 0., 1.)), 0., 1.); }'
    ].join('\n'),
    // Semi-Lagrangian advection of the velocity, damped by viscosity, held still at the tray's edges.
    advect: HEAD + [
      'uniform sampler2D uV; uniform float uDt, uDamp, uAsp;',
      'void main(){ vec2 v = texture(uV, vUv).xy; vec2 back = vUv - v * uDt / vec2(uAsp, 1.);',
      '  vec2 n = texture(uV, back).xy * uDamp; vec2 e = min(vUv, 1. - vUv) * vec2(textureSize(uV, 0));',
      '  o = vec4(n * smoothstep(0., 3., min(e.x, e.y)), 0., 1.); }'
    ].join('\n'),
    divergence: HEAD + [
      'uniform sampler2D uV;',
      'void main(){ vec2 t = 1. / vec2(textureSize(uV, 0));',
      '  float l = texture(uV, vUv - vec2(t.x, 0.)).x, r = texture(uV, vUv + vec2(t.x, 0.)).x;',
      '  float u = texture(uV, vUv - vec2(0., t.y)).y, d = texture(uV, vUv + vec2(0., t.y)).y;',
      '  o = vec4(.5 * (r - l + d - u), 0., 0., 1.); }'
    ].join('\n'),
    jacobi: HEAD + [
      'uniform sampler2D uP, uD;',
      'void main(){ vec2 t = 1. / vec2(textureSize(uP, 0));',
      '  float s = texture(uP, vUv - vec2(t.x, 0.)).x + texture(uP, vUv + vec2(t.x, 0.)).x + texture(uP, vUv - vec2(0., t.y)).x + texture(uP, vUv + vec2(0., t.y)).x;',
      '  o = vec4((s - texture(uD, vUv).x) * .25, 0., 0., 1.); }'
    ].join('\n'),
    gradient: HEAD + [
      'uniform sampler2D uP, uV;',
      'void main(){ vec2 t = 1. / vec2(textureSize(uP, 0));',
      '  float l = texture(uP, vUv - vec2(t.x, 0.)).x, r = texture(uP, vUv + vec2(t.x, 0.)).x, u = texture(uP, vUv - vec2(0., t.y)).x, d = texture(uP, vUv + vec2(0., t.y)).x;',
      '  o = vec4(texture(uV, vUv).xy - .5 * vec2(r - l, d - u), 0., 1.); }'
    ].join('\n'),
    // The map follows the bath: the sheet point now under x is the one that was under x - v dt a step ago.
    //   sheet(x) = x + m(x)  →  m'(x) = m(x - s) - s,  s = v dt (in uv)
    carry: HEAD + [
      'uniform sampler2D uV, uM; uniform float uDt, uAsp;',
      'void main(){ vec2 s = texture(uV, vUv).xy * uDt / vec2(uAsp, 1.); o = vec4(texture(uM, vUv - s).xy - s, 0., 1.); }'
    ].join('\n'),
    // A drop blooming: an area-preserving push away from its centre (r → sqrt(r² - R²), softened near the centre so the
    // map never folds). Applied in small increments, so the drop opens over a few frames and pushes the print aside.
    bloom: HEAD + [
      'uniform sampler2D uM; uniform vec2 uC; uniform float uQ, uR, uAsp;',
      'void main(){ vec2 p = vUv * vec2(uAsp, 1.), dl = p - uC; float r2 = dot(dl, dl);',
      '  float r02 = max(r2 - uQ * (1. - exp(-r2 / (uR * uR * .5))), 0.);',
      '  float f = r2 > 1e-12 ? sqrt(r02 / r2) : sqrt(max(1. - uQ / (uR * uR * .5), 0.));',
      '  vec2 src = (uC + dl * f) / vec2(uAsp, 1.);',
      '  o = vec4(texture(uM, src).xy + (src - vUv), 0., 1.); }'
    ].join('\n'),
    copy: HEAD + 'uniform sampler2D uA; void main(){ o = texture(uA, vUv); }',
    // One frame of the film between two snapshots, each enlarged with a cubic B-spline (four bilinear taps) so the
    // small snapshots come back smooth, not blocky.
    film: HEAD + [
      'uniform sampler2D uA, uB; uniform float uT;',
      'vec4 cubic(sampler2D s, vec2 uv){ vec2 n = vec2(textureSize(s, 0)), x = uv * n - .5, i = floor(x), f = x - i;',
      '  vec2 f2 = f * f, f3 = f2 * f;',
      '  vec2 w0 = (1. - 3. * f + 3. * f2 - f3) / 6., w1 = (4. - 6. * f2 + 3. * f3) / 6., w2 = (1. + 3. * f + 3. * f2 - 3. * f3) / 6., w3 = f3 / 6.;',
      '  vec2 g0 = w0 + w1, g1 = w2 + w3, h0 = (i - .5 + w1 / g0) / n, h1 = (i + 1.5 + w3 / g1) / n;',
      '  return g0.y * (g0.x * texture(s, h0) + g1.x * texture(s, vec2(h1.x, h0.y))) + g1.y * (g0.x * texture(s, vec2(h0.x, h1.y)) + g1.x * texture(s, h1)); }',
      'void main(){ o = mix(cubic(uA, vUv), cubic(uB, vUv), uT); }'
    ].join('\n'),
    // What you see. The live page is read through the map, treated as ink on paper (absorbance), then the ribbons of
    // pigment, the paper and the wet sheen go on top.
    show: HEAD + [
      'uniform sampler2D uPage, uMap, uVel, uStA, uStB;',
      'uniform vec2 uRes, uBack, uPageTex; uniform vec3 uPaper, uMarkInk;',
      'uniform vec3 uPig[8]; uniform float uCover[8]; uniform int uPigN;',
      'uniform float uStain, uGrain, uRim, uThin, uVein, uSheen, uHalo, uThreads, uVignette;',
      'uniform vec4 uGhost; uniform vec3 uComb;',
      'float h21(vec2 p){ p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }',
      'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);',
      '  return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + 1.), f.x), f.y); }',
      // ink as light it takes away from the paper; print lighter than the paper gives a little negative (it lifts)
      'vec3 absorb(vec3 c){ return clamp(-log(max(c, vec3(.003)) / uPaper), -1., 6.); }',
      'float lum(vec3 a){ return dot(a, vec3(1. / 3.)); }',
      'void main(){',
      '  vec2 uv = vec2(vUv.x, 1. - vUv.y), px = uv * uRes;',
      // the map and its Jacobian: how this spot of the screen was stretched and turned
      '  vec2 tm = 1. / vec2(textureSize(uMap, 0));',
      '  vec2 d = texture(uMap, uv).xy;',
      '  vec2 ddx = (texture(uMap, uv + vec2(tm.x, 0.)).xy - texture(uMap, uv - vec2(tm.x, 0.)).xy) / (2. * tm.x);',
      '  vec2 ddy = (texture(uMap, uv + vec2(0., tm.y)).xy - texture(uMap, uv - vec2(0., tm.y)).xy) / (2. * tm.y);',
      '  vec2 jx = vec2(1., 0.) + ddx, jy = vec2(0., 1.) + ddy;',
      '  float k = uRes.x / uRes.y, a = jx.x, b = jy.x * k, c = jx.y / k, e = jy.y;',
      '  float det = a * e - b * c, fro = a * a + b * b + c * c + e * e, disc = sqrt(max(fro * fro - 4. * det * det, 0.));',
      '  float s1 = sqrt(.5 * (fro + disc)), s2 = sqrt(max(.5 * (fro - disc), 1e-6)), pull = s1 / s2;',
      '  float bent = smoothstep(1.05, 1.8, pull), far = smoothstep(2.5, 8., pull);',
      '  vec2 p = uv + d, pp = p * uRes;',
      '  vec2 in2 = smoothstep(vec2(-.002), vec2(.002), p) * smoothstep(vec2(-.002), vec2(.002), 1. - p);',
      '  float inside = in2.x * in2.y;',
      // the print, sampled with the stretch as its footprint (no shimmer when it is drawn into threads)
      '  vec3 A = absorb(textureGrad(uPage, p, jx / uBack.x, jy / uBack.y).rgb);',
      '  float lodB = log2(max(uPageTex.y / uRes.y, 1.)) + 2.2 + log2(max(s1, 1.));',
      '  vec3 Ab = absorb(textureLod(uPage, p, lodB).rgb);',
      '  A += uRim * (.4 + .6 * bent) * max(A - Ab, 0.);',                           // pooling inside the edges
      '  A *= clamp(pow(max(abs(det), 1e-3), uThin), .45, 1.3);',                  // drawn out = thinner
      '  float gs = vn(pp / 2.2) * .5 + vn(pp / 7. + 19.) * .5;',                 // grain that lives on the sheet
      '  A *= 1. - uVein * smoothstep(.6, .72, gs) * far;',
      '  A *= inside;',
      // paper (stays put: the ink floats over it)
      '  float g = vn(px * .8) * .45 + vn(px * 2.3) * .3 + vn(vec2(px.x * .045, px.y * 1.6) + 7.) * .25;',
      '  float fib = smoothstep(.72, .9, vn(vec2(px.x * .035 + vn(px * .02) * 3., px.y * .9)));',
      '  vec3 paper = uPaper * (1. - uGrain * (.05 * (g - .5) + .02 * fib));',
      '  vec2 q = uv - .5; paper *= 1. - uVignette * dot(q, q) * 2.;',
      // ribbons of pigment: the colour whose ramp is highest wins (floated colours do not mix), a hairline of paper
      // where two meet, a pale halo where a ribbon pushed the print aside
      '  float band = 0., c1 = 0., c2 = 0., seam = 0.; int bi = 0;',
      '  if (uStain > 0.) {',
      '    vec4 sa = texture(uStA, p), sb = texture(uStB, p);',
      '    float cv[8] = float[8](sa.r, sa.g, sa.b, sa.a, sb.r, sb.g, sb.b, sb.a);',
      '    for (int i = 0; i < 8; i++) { if (i >= uPigN) break; float v = cv[i]; if (v > c1) { c2 = c1; c1 = v; bi = i; } else if (v > c2) c2 = v; }',
      '    float cc = c1 + (vn(pp / 9. + 3.) - .5) * .05 * step(.02, c1);',
      '    float w = max(fwidth(cc) * .8, .003);',
      '    band = smoothstep(.5 - w, .5 + w, cc) * uStain * inside;',
      '    seam = (1. - smoothstep(0., w * 2.5 + .012, c1 - c2)) * step(.5, c2);',
      '    float halo = smoothstep(.5 - w - .09, .5 - w - .025, cc) * (1. - band) * uStain;',
      '    A *= 1. - uHalo * halo;',
      '  }',
      '  vec3 under = paper * exp(-A), col = under;',
      '  if (band > 0.) {',
      '    float resolved = 1. - smoothstep(.015, .05, fwidth(c1));\n    float tone = (1. - uThreads * resolved * .22 * (.5 + .5 * cos(6.2832 * (c1 - .5) * 7.)) * smoothstep(.56, .8, c1)) * (.95 + .1 * vn(pp / 30. + 50.));',
      '    vec3 rib = uPig[bi] * mix(vec3(1.), under / paper, 1. - uCover[bi]) * tone;',
      '    col = mix(col, rib, band);',
      '    col = mix(col, paper, seam * band * .85);',
      '  }',
      // wet: a soft highlight on the relief of the ink while the bath still moves
      '  float wet = smoothstep(.03, .6, length(texture(uVel, uv).xy));',
      '  if (wet > 0. && uSheen > 0.) {',
      '    float h = lum(max(Ab, 0.)) + band * .8;',
      '    vec3 n = normalize(vec3(-dFdx(h) * 7., dFdy(h) * 7., 1.));',
      '    float sp = pow(max(dot(n, normalize(vec3(-.35, .45, 1.))), 0.), 40.);',
      '    col += sp * wet * uSheen * smoothstep(.12, .5, h) * .7;',
      '  }',
      // the idle demo shows where its comb is: a ring round each tine
      '  if (uGhost.z > 0.) {',
      '    vec2 dir = vec2(cos(uGhost.w), sin(uGhost.w)), nr = vec2(-dir.y, dir.x); float rg = 1e9;',
      '    for (int i = 0; i < 8; i++) { if (float(i) >= uComb.x) break; float off = (float(i) - (uComb.x - 1.) * .5) * uComb.y;',
      '      rg = min(rg, abs(length(px - uGhost.xy - nr * off) - uComb.z)); }',
      '    col = mix(col, uMarkInk, uGhost.z * .75 * (1. - smoothstep(.6, 1.7, rg)));',
      '  }',
      '  col += (h21(px * 1.37 + 5.) - .5) * .012;',
      '  o = vec4(col, 1.);',
      '}'
    ].join('\n')
  };
  // Lays pigment. A small mesh round the stroke (in screen sheet units) is carried through the map onto the sheet, so the
  // mark is stored where the sheet was at that moment. The fragment writes a ramp (1 at the tine, .5 at the ribbon's
  // edge), blended with MAX: the display thresholds it at .5, so it stays sharp however far it is pulled later.
  var LAY_VS = [
    '#version 300 es', 'precision highp float; precision highp sampler2D;',
    'in vec2 a; out vec2 hs; uniform sampler2D uMap; uniform vec2 uLo, uHi; uniform float uAsp;',
    'void main(){ hs = mix(uLo, uHi, a); vec2 uv = hs / vec2(uAsp, 1.); vec2 q = uv + texture(uMap, uv).xy; gl_Position = vec4(q * 2. - 1., 0., 1.); }'
  ].join('\n');
  var LAY_FS = [
    '#version 300 es', 'precision highp float;', SEG,
    'in vec2 hs; uniform vec2 uA, uB; uniform float uR, uRings, uSpace; uniform int uTeeth; uniform vec4 uCa, uCb;',
    'layout(location = 0) out vec4 o0; layout(location = 1) out vec4 o1;',
    'void main(){',
    '  vec2 ba = uB - uA; float L = length(ba); vec2 dir = L > 1e-6 ? ba / L : vec2(1., 0.), nr = vec2(-dir.y, dir.x);',
    '  float c = 0.;',
    '  for (int i = 0; i < 8; i++) { if (i >= uTeeth) break; float off = (float(i) - float(uTeeth - 1) * .5) * uSpace;',
    '    float dd = seg(hs, uA + nr * off, uB + nr * off), ci;',
    '    if (uRings > 0.) {',      // concentric bands: a triangle wave in r whose zero crossings are the band edges
    '      float f = fract(dd / uR * uRings + .5), tri = .25 - abs(f - .5);',
    '      ci = dd < uR ? .5 + tri * 1.6 : .9 - (dd - uR) / uR * 8.;',
    '    } else ci = 1. - dd / (2. * uR);',
    '    c = max(c, ci); }',
    '  c = clamp(c, 0., 1.); o0 = uCa * c; o1 = uCb * c; }'
  ].join('\n');

  // ------------------------------------------------------------------------------------------------ start
  WetInk.start = function (userCfg) {
    var cfg = merge(WetInk.defaults, userCfg || {});
    var canvas = $(cfg.canvas), page = $(cfg.page);
    if (!canvas || !page) throw new Error('wet-ink: no canvas or page (' + cfg.canvas + ', ' + cfg.page + ')');
    var settleBtn = cfg.settle.button ? $(cfg.settle.button) : null;

    function plainPage(note) {
      if (settleBtn) settleBtn.hidden = true;
      HIC.fallback(canvas, note ? { note: note } : undefined);
      return null;
    }
    if (!HIC.supported('webgl')) return plainPage(cfg.fallbackNote);
    var S = HIC.stage(canvas, { gl: { antialias: false, depth: false, stencil: false, alpha: false } });
    var gl = S.gl;
    if (!gl || !S.way || !gl.getExtension('EXT_color_buffer_float')) return plainPage('This page needs WebGL2 with float textures to float its ink. Here it is as an ordinary page.');
    var floatLinear = !!gl.getExtension('OES_texture_float_linear');
    var aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    var G = HIC.gl, probe = root.__hic;
    var still = HIC.still !== null, calm = HIC.calm;

    // ---- programs
    var P = {};
    for (var name in FS) P[name] = G.program(gl, null, FS[name]);
    P.lay = G.program(gl, LAY_VS, LAY_FS, ['a']);
    var MESH = 32, meshVao = gl.createVertexArray();
    (function () {
      var pts = [];
      for (var y = 0; y < MESH; y++) for (var x = 0; x < MESH; x++) {
        var x0 = x / MESH, x1 = (x + 1) / MESH, y0 = y / MESH, y1 = (y + 1) / MESH;
        pts.push(x0, y0, x1, y0, x0, y1, x0, y1, x1, y0, x1, y1);
      }
      gl.bindVertexArray(meshVao);
      var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
    })();
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);

    function pass(prog, out, texs, set) {
      prog.use(); G.bind(gl, prog, texs || {});
      if (set) set(prog.u);
      if (out) { gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb); gl.viewport(0, 0, out.w, out.h); }
      else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); }
      G.fullscreen(gl);
    }
    function clearT(t) { gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    var RG32 = { internal: floatLinear ? gl.RG32F : gl.RG16F, format: gl.RG, type: gl.FLOAT };
    function tgt(w, h, fmt, filter) { return G.target(gl, w, h, { internal: fmt.internal, format: fmt.format, type: fmt.type, filter: filter }); }
    function free(t) { if (!t) return; gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); }

    // ---- the page texture (uploaded only on paint)
    var pageTex = G.texture(gl, { mips: true });
    if (aniso) { gl.bindTexture(gl.TEXTURE_2D, pageTex); gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT))); }
    var pageReady = false, pageW = 0, pageH = 0;

    // ---- paper and pigments
    var paperRGB = hexRGB(cfg.paper || getComputedStyle(page).backgroundColor);
    var pigInputs = typeof cfg.pigments === 'string' ? [].slice.call(doc.querySelectorAll(cfg.pigments)) : [];
    var pigs = (pigInputs.length ? pigInputs.map(function (el) {
      var lab = el.closest('label');
      return { name: el.getAttribute('data-name') || (lab ? lab.textContent.trim() : el.value), color: el.getAttribute('data-color') || el.value, cover: parseFloat(el.getAttribute('data-cover') || '0.9'), none: el.value === 'none' && !el.getAttribute('data-color'), el: el };
    }) : (Array.isArray(cfg.pigments) ? cfg.pigments : [])).slice(0, 8);
    var colourPigs = pigs.filter(function (p) { return !p.none; });
    var PIG = new Float32Array(24), COVER = new Float32Array(8);
    colourPigs.forEach(function (p, i) { var c = hexRGB(p.color); PIG[i * 3] = c[0]; PIG[i * 3 + 1] = c[1]; PIG[i * 3 + 2] = c[2]; COVER[i] = p.cover == null ? 0.9 : p.cover; });
    var pigIndex = -1;            // index into colourPigs; -1 = clear water (stir only)
    function pickFromInputs() {
      var el = pigInputs.filter(function (x) { return x.checked; })[0];
      var p = el ? pigs[pigInputs.indexOf(el)] : null;
      pigIndex = p && !p.none ? colourPigs.indexOf(p) : -1;
    }
    if (pigInputs.length) pickFromInputs(); else pigIndex = colourPigs.length ? clamp(cfg.pigment | 0, 0, colourPigs.length - 1) : -1;
    var markInk = hexRGB(cfg.look.markInk || (colourPigs.slice().sort(function (a, b) { var x = hexRGB(a.color), y = hexRGB(b.color); return (x[0] + x[1] + x[2]) - (y[0] + y[1] + y[2]); })[0] || { color: '#222' }).color);

    // ---- viscosity
    var visc = cfg.viscosity.value;
    var viscInput = cfg.viscosity.input ? $(cfg.viscosity.input) : null;
    if (viscInput) { visc = viscInput.value / (parseFloat(viscInput.max) || 100); viscInput.addEventListener('input', function () { visc = viscInput.value / (parseFloat(viscInput.max) || 100); }); }
    function damping() { return lerp(cfg.viscosity.damp[0], cfg.viscosity.damp[1], Math.pow(clamp(visc, 0, 1), 1.6)); }
    function radius() { return lerp(cfg.viscosity.radius[0], cfg.viscosity.radius[1], clamp(visc, 0, 1)); }

    // ---- sizes and state
    var W = 1, H = 1, ASP = 1, vel, prs, dvg, map, top, zero, rb, stain = null, pbo = null, cpu = null, RW = 0, RH = 0, KW = 0, KH = 0;
    var keys = [], pool = [], KMAX = 90, keyEvery = 4;
    var DT = 1 / 60, simT = 0, stepN = 0, flowUntil = 0, flowing = false, blooms = [], rewind = null;
    var atRest = true, stainOn = false, dirty = true, mapDirty = true, sync = null, maxShift = 0;
    var quality = typeof cfg.quality === 'number' ? cfg.quality : 1, slow = 0;
    var qParam = HIC.param('q'); if (qParam !== null && qParam !== '') quality = clamp(parseFloat(qParam) || 1, 0.3, 1);
    var autoQuality = cfg.quality === 'auto' && qParam === null && !still;
    var stats = { strokes: 0, drops: 0, settles: 0, laid: 0 };

    function build() {
      S.quality = quality; S.resize();
      W = S.W; H = S.H; ASP = W / H;
      [vel && vel.read, vel && vel.write, prs && prs.read, prs && prs.write, dvg, map && map.read, map && map.write, top, zero, rb].forEach(free);
      keys.concat(pool).forEach(free); keys = []; pool = []; keyEvery = 4;
      var SH = 144, SW = Math.max(8, Math.round(SH * ASP));
      var MH = clamp(Math.round(H * 0.5), 240, 520), MW = Math.max(8, Math.round(MH * ASP));
      KH = 128; KW = Math.max(8, Math.round(KH * ASP));
      RH = 150; RW = Math.max(8, Math.round(RH * ASP));
      vel = G.pingpong(gl, SW, SH, { internal: gl.RG16F, format: gl.RG, type: gl.FLOAT });
      prs = G.pingpong(gl, SW, SH, { internal: gl.R16F, format: gl.RED, type: gl.FLOAT, filter: 'nearest' });
      dvg = tgt(SW, SH, { internal: gl.R16F, format: gl.RED, type: gl.FLOAT }, 'nearest');
      map = G.pingpong(gl, MW, MH, RG32);
      top = tgt(MW, MH, RG32);
      zero = tgt(4, 4, RG32);
      rb = tgt(RW, RH, { internal: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT }, 'nearest');
      [vel.read, vel.write, prs.read, prs.write, map.read, map.write, top, zero].forEach(clearT);
      // the pigment store: 8 channels in two RGBA16F textures, written together (MRT)
      if (stain) { gl.deleteTexture(stain.a); gl.deleteTexture(stain.b); gl.deleteFramebuffer(stain.fb); }
      var sd = Math.min(S.dpr / S.quality, 1.5);
      stain = { w: Math.round(W * sd), h: Math.round(H * sd), fb: gl.createFramebuffer() };
      gl.bindFramebuffer(gl.FRAMEBUFFER, stain.fb);
      ['a', 'b'].forEach(function (k, i) {
        var t = stain[k] = G.texture(gl, { w: stain.w, h: stain.h, internal: gl.RGBA16F, format: gl.RGBA, type: gl.FLOAT });
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0);
      });
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      clearStain();
      if (pbo) gl.deleteBuffer(pbo);
      pbo = gl.createBuffer(); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo); gl.bufferData(gl.PIXEL_PACK_BUFFER, RW * RH * 16, gl.STREAM_READ); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      cpu = new Float32Array(RW * RH * 4); if (sync) { gl.deleteSync(sync); sync = null; }
      rewind = null; flowUntil = 0; flowing = false; blooms = []; atRest = true; maxShift = 0; dirty = mapDirty = true;
      user.fresh = ghost.fresh = true;
    }
    function clearStain() { gl.bindFramebuffer(gl.FRAMEBUFFER, stain.fb); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); stainOn = false; }
    function setBacking(q) { quality = q; S.quality = q; S.resize(); dirty = true; }

    // ---- pointers: the user's hand and the demo's ghost comb
    var user = { on: false, x: 0, y: 0, px: 0, py: 0, fresh: true, gain: 0, sw: 0, lay: true };
    var ghost = { on: false, x: 0, y: 0, px: 0, py: 0, fresh: true, gain: 1, sw: 0, lay: true, a: 0, ang: 0 };

    // ------------------------------------------------------------------------------------------------ simulation
    function lay(ax, ay, bx, by, r, rings) {
      if (pigIndex < 0 || r <= 0) return;
      var teeth = rings ? 1 : clamp(cfg.comb.teeth | 0, 1, 8), half = (teeth - 1) * 0.5 * cfg.comb.spacing, pad = (rings ? r * 1.2 : r * 2.1) + half;
      P.lay.use(); G.bind(gl, P.lay, { uMap: map.read.tex });
      var u = P.lay.u;
      gl.uniform2f(u.uLo, Math.min(ax, bx) - pad, Math.min(ay, by) - pad); gl.uniform2f(u.uHi, Math.max(ax, bx) + pad, Math.max(ay, by) + pad);
      gl.uniform1f(u.uAsp, ASP); gl.uniform2f(u.uA, ax, ay); gl.uniform2f(u.uB, bx, by); gl.uniform1f(u.uR, r);
      gl.uniform1f(u.uRings, rings || 0); gl.uniform1f(u.uSpace, cfg.comb.spacing); gl.uniform1i(u.uTeeth, teeth);
      var ca = [0, 0, 0, 0], cb = [0, 0, 0, 0]; (pigIndex < 4 ? ca : cb)[pigIndex % 4] = 1;
      gl.uniform4fv(u.uCa, ca); gl.uniform4fv(u.uCb, cb);
      gl.bindFramebuffer(gl.FRAMEBUFFER, stain.fb); gl.viewport(0, 0, stain.w, stain.h);
      gl.enable(gl.BLEND); gl.blendEquation(gl.MAX); gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(meshVao); gl.drawArrays(gl.TRIANGLES, 0, MESH * MESH * 6);
      gl.disable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD); gl.bindVertexArray(null);
      stainOn = true; atRest = false; dirty = true; stats.laid++;
    }
    // The hand (or the ghost) moved since the last step: push the bath along the segment, lay a ribbon.
    function splat(ptr) {
      if (!ptr.on) { ptr.fresh = true; ptr.sw = 0; return; }
      if (ptr.fresh) { ptr.px = ptr.x; ptr.py = ptr.y; ptr.fresh = false; return; }
      var ax = ptr.px * ASP, ay = ptr.py, bx = ptr.x * ASP, by = ptr.y, dx = bx - ax, dy = by - ay, dist = Math.hypot(dx, dy);
      ptr.px = ptr.x; ptr.py = ptr.y;
      if (dist < 1e-5) return;
      var vx = cfg.comb.push * dx / DT, vy = cfg.comb.push * dy / DT, sp = Math.hypot(vx, vy);
      if (sp > cfg.comb.cap) { vx *= cfg.comb.cap / sp; vy *= cfg.comb.cap / sp; sp = cfg.comb.cap; }
      var teeth = clamp(cfg.comb.teeth | 0, 1, 8), r = radius() / Math.sqrt(teeth);
      pass(P.splat, vel.write, { uV: vel.read.tex }, function (u) {
        gl.uniform2f(u.uA, ax, ay); gl.uniform2f(u.uB, bx, by); gl.uniform2f(u.uVel, vx, vy); gl.uniform1f(u.uR, r);
        gl.uniform1f(u.uGain, ptr.gain); gl.uniform1f(u.uAsp, ASP); gl.uniform1f(u.uSpace, cfg.comb.spacing); gl.uniform1i(u.uTeeth, teeth);
      });
      vel.swap();
      if (ptr.gain > 0.5 && ptr.lay && cfg.comb.ribbon > 0) {
        // the ribbon swells from a point as the hand speeds up and tails off as it slows
        var want = Math.min(Math.hypot(dx, dy) / DT / cfg.comb.swell, 1);
        ptr.sw += (want - ptr.sw) * 0.22;
        var rr = cfg.comb.ribbon * ease(ptr.sw);
        if (rr > 0.0012) lay(ax, ay, bx, by, rr, 0);
      }
      flowUntil = Math.max(flowUntil, simT + 4.2 / damping() + 0.25);
      if (rewind) stopRewind(false);
      atRest = false;
      if (ptr === user && ptr.gain > 0.5) { stats.strokes++; }
    }
    // A press without a drag: lay a drop at a third of its size, then let it bloom open (pushing the print aside).
    function drop(u, v, o) {
      o = o || {};
      if (rewind) stopRewind(false);
      var R = (o.radius || cfg.drop.radius), rings = o.rings != null ? o.rings : cfg.drop.rings, spread = clamp(o.spread != null ? o.spread : cfg.drop.spread, 0, 1);
      if (!keys.length) pushKey();
      var lr = spread > 0 ? R * Math.sqrt(1 - 0.85 * spread) : R;
      lay(u * ASP, v, u * ASP, v, lr, rings);
      if (spread > 0) blooms.push({ x: u * ASP, y: v, R: R, total: 0.85 * spread * R * R, done: 0, t: 0, dur: Math.max(DT, cfg.drop.bloom) });
      atRest = false; stats.drops++;
      fire('drop', u, v); sound.plip();
    }
    function stepBlooms() {
      for (var i = blooms.length - 1; i >= 0; i--) {
        var b = blooms[i]; b.t += DT;
        var e = 1 - Math.pow(1 - clamp(b.t / b.dur, 0, 1), 3), want = b.total * e, q = want - b.done;
        if (q > 0) {
          pass(P.bloom, map.write, { uM: map.read.tex }, function (u) { gl.uniform2f(u.uC, b.x, b.y); gl.uniform1f(u.uQ, q); gl.uniform1f(u.uR, b.R); gl.uniform1f(u.uAsp, ASP); });
          map.swap(); b.done = want; mapDirty = true;
        }
        if (b.t >= b.dur) blooms.splice(i, 1);
      }
    }
    function step() {
      simT += DT; stepN++;
      if (demo.running) demo.update(DT);
      splat(user); splat(ghost);
      var moved = false;
      if (blooms.length) { stepBlooms(); moved = true; }
      if (simT < flowUntil) {
        flowing = true;
        pass(P.advect, vel.write, { uV: vel.read.tex }, function (u) { gl.uniform1f(u.uDt, DT); gl.uniform1f(u.uDamp, Math.exp(-damping() * DT)); gl.uniform1f(u.uAsp, ASP); }); vel.swap();
        pass(P.divergence, dvg, { uV: vel.read.tex });
        for (var i = 0; i < 20; i++) { pass(P.jacobi, prs.write, { uP: prs.read.tex, uD: dvg.tex }); prs.swap(); }
        pass(P.gradient, vel.write, { uP: prs.read.tex, uV: vel.read.tex }); vel.swap();
        pass(P.carry, map.write, { uV: vel.read.tex, uM: map.read.tex }, function (u) { gl.uniform1f(u.uDt, DT); gl.uniform1f(u.uAsp, ASP); }); map.swap();
        moved = true;
      } else if (flowing) {
        [vel.read, vel.write, prs.read, prs.write].forEach(clearT); flowing = false; flowUntil = 0; pushKey();
      }
      if (moved) { mapDirty = true; if (stepN % keyEvery === 0) pushKey(); }
      dirty = true;
    }
    function busy() { return user.on || ghost.on || demo.running || simT < flowUntil || blooms.length > 0; }

    // ---- the film: small snapshots of the map, played backwards to settle
    function pushKey() {
      if (keys.length >= KMAX) {        // full: keep every other frame and record half as often from now on
        var kept = [];
        keys.forEach(function (k, i) { ((keys.length - 1 - i) % 2 === 0 ? kept : pool).push(k); });
        keys = kept; keyEvery *= 2;
      }
      var k = pool.pop() || tgt(KW, KH, RG32);
      pass(P.copy, k, { uA: map.read.tex }); keys.push(k);
    }
    function startRewind() {
      if (rewind || (atRest && !keys.length)) return false;
      pass(P.copy, top, { uA: map.read.tex });
      [vel.read, vel.write, prs.read, prs.write].forEach(clearT); flowUntil = 0; flowing = false; blooms = [];
      var n = keys.length + 1, d = calm ? 0.6 : clamp(0.9 + 0.03 * n, cfg.settle.min, cfg.settle.max);
      rewind = { n: n, t: 0, dur: d, at: n };
      stats.settles++; fire('settle'); sound.whoosh(d);
      return true;
    }
    function frameAt(i) { return i <= 0 ? zero : i <= keys.length ? keys[i - 1] : top; }
    function rewindStep(dt) {
      var r = rewind; r.t = Math.min(r.t + dt / r.dur, 1);
      var e = r.t < 0.5 ? 4 * r.t * r.t * r.t : 1 - Math.pow(-2 * r.t + 2, 3) / 2;
      r.at = r.n * (1 - e);
      var i = Math.min(Math.floor(r.at), r.n - 1);
      pass(P.film, map.write, { uA: frameAt(i).tex, uB: frameAt(i + 1).tex }, function (u) { gl.uniform1f(u.uT, r.at - i); }); map.swap();
      mapDirty = dirty = true;
      if (r.t >= 1) stopRewind(true);
    }
    function stopRewind(done) {
      if (!rewind) return;
      if (done) { pool.push.apply(pool, keys); keys = []; keyEvery = 4; clearT(map.read); clearT(map.write); clearStain(); atRest = true; maxShift = 0; }
      else { var keep = Math.min(Math.floor(rewind.at), keys.length); pool.push.apply(pool, keys.splice(keep)); }
      rewind = null; mapDirty = dirty = true;
    }
    function stainFade() { return !stainOn ? 0 : rewind ? 1 - Math.pow(clamp((rewind.t - 0.45) / 0.45, 0, 1), 2) : 1; }

    // ------------------------------------------------------------------------------------------------ draw
    function render() {
      if (!pageReady) return;
      pass(P.show, null, { uPage: pageTex, uMap: map.read.tex, uVel: vel.read.tex, uStA: stain.a, uStB: stain.b }, function (u) {
        gl.uniform2f(u.uRes, W, H); gl.uniform2f(u.uBack, canvas.width, canvas.height); gl.uniform2f(u.uPageTex, pageW, pageH);
        gl.uniform3fv(u.uPaper, paperRGB); gl.uniform3fv(u.uMarkInk, markInk);
        gl.uniform3fv(u.uPig, PIG); gl.uniform1fv(u.uCover, COVER); gl.uniform1i(u.uPigN, colourPigs.length);
        var L = cfg.look;
        gl.uniform1f(u.uStain, stainFade()); gl.uniform1f(u.uGrain, L.grain); gl.uniform1f(u.uRim, L.rim); gl.uniform1f(u.uThin, L.thin);
        gl.uniform1f(u.uVein, L.vein); gl.uniform1f(u.uSheen, L.sheen); gl.uniform1f(u.uHalo, L.halo); gl.uniform1f(u.uThreads, cfg.comb.threads); gl.uniform1f(u.uVignette, L.vignette);
        gl.uniform4f(u.uGhost, ghost.x * W, ghost.y * H, ghost.a, ghost.ang);
        gl.uniform3f(u.uComb, clamp(cfg.comb.teeth | 0, 1, 8), cfg.comb.spacing * H, cfg.comb.marker);
      });
      dirty = false;
    }

    // ------------------------------------------------------------------------------------------------ the map on the CPU
    // A small copy comes back from the GPU a frame or two later, without stalling it.
    function requestReadback() {
      if (sync || !mapDirty) return;
      pass(P.copy, rb, { uA: map.read.tex });
      gl.bindFramebuffer(gl.FRAMEBUFFER, rb.fb); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
      gl.readPixels(0, 0, RW, RH, gl.RGBA, gl.FLOAT, 0);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush();
      mapDirty = false;
    }
    function pollReadback() {
      if (!sync) return;
      var s = gl.clientWaitSync(sync, 0, 0);
      if (s === gl.TIMEOUT_EXPIRED || s === gl.WAIT_FAILED) return;
      gl.deleteSync(sync); sync = null;
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo); gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, cpu); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      afterRead();
    }
    function afterRead() {
      var m = 0;
      for (var i = 0; i < cpu.length; i += 4) { var s2 = cpu[i] * cpu[i] * W * W + cpu[i + 1] * cpu[i + 1] * H * H; if (s2 > m) m = s2; }
      maxShift = Math.sqrt(m);
      placeNow();
    }
    // A blocking read (checks, stills, screenOf). A fence never reports done inside the task that made it (WebGL 2
    // spec), so waiting on the async one here would return the previous copy: read straight into the CPU array.
    function readNow() {
      if (sync) { gl.deleteSync(sync); sync = null; }
      pass(P.copy, rb, { uA: map.read.tex });
      gl.bindFramebuffer(gl.FRAMEBUFFER, rb.fb);
      gl.readPixels(0, 0, RW, RH, gl.RGBA, gl.FLOAT, cpu);
      mapDirty = false; afterRead();
    }
    function offsetAt(u, v) {
      if (!cpu || maxShift < 1e-3) return [0, 0];
      var x = clamp(u * RW - 0.5, 0, RW - 1.001), y = clamp(v * RH - 0.5, 0, RH - 1.001);
      var x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, i = (y0 * RW + x0) * 4, j = i + RW * 4, c = cpu;
      return [
        (c[i] * (1 - fx) + c[i + 4] * fx) * (1 - fy) + (c[j] * (1 - fx) + c[j + 4] * fx) * fy,
        (c[i + 1] * (1 - fx) + c[i + 5] * fx) * (1 - fy) + (c[j + 1] * (1 - fx) + c[j + 5] * fx) * fy
      ];
    }
    // screen (canvas CSS px) → the page point drawn there (page-local CSS px)
    function toPage(x, y) { var d = offsetAt(x / W, y / H); return [x + d[0] * W, y + d[1] * H]; }
    // page point → where it is on screen now (Newton on toPage, seeded by a coarse search of the CPU map)
    function screenAt(qx, qy) {
      if (!cpu || maxShift < 0.05) return [qx, qy];
      var best = 1e18, sx = qx, sy = qy;
      for (var y = 0; y < RH; y += 2) for (var x = 0; x < RW; x += 2) {
        var i = (y * RW + x) * 4, px = (x + 0.5) / RW * W, py = (y + 0.5) / RH * H;
        var ex = px + cpu[i] * W - qx, ey = py + cpu[i + 1] * H - qy, e2 = ex * ex + ey * ey;
        if (e2 < best) { best = e2; sx = px; sy = py; }
      }
      for (var k = 0; k < 12; k++) {
        var p0 = toPage(sx, sy), p1 = toPage(sx + 1, sy), p2 = toPage(sx, sy + 1);
        var a = p1[0] - p0[0], b = p2[0] - p0[0], c = p1[1] - p0[1], d = p2[1] - p0[1], det = a * d - b * c;
        if (!(Math.abs(det) > 1e-6)) break;
        var ex2 = qx - p0[0], ey2 = qy - p0[1];
        sx = clamp(sx + (d * ex2 - b * ey2) / det, 0, W); sy = clamp(sy + (-c * ex2 + a * ey2) / det, 0, H);
      }
      return [sx, sy];
    }

    // ------------------------------------------------------------------------------------------------ hit testing
    var mx = -1, my = -1, probing = false, probed = false;
    function placeNow() {
      if (probing || !probed) return;
      var x = mx < 0 ? W / 2 : mx, y = my < 0 ? H / 2 : my;
      if (!cpu || maxShift < 0.05) S.place(page, [1, 0, 0, 1, 0, 0]);
      else S.placeLocal(page, x, y, toPage);
    }
    function boxOf(el) { return HIC.box(page, el); }
    // which control is drawn at this page point (the smallest that contains it)
    function controlAtPage(q) {
      var best = null, area = Infinity;
      [].forEach.call(page.querySelectorAll(CONTROL), function (el) {
        if (!el.offsetParent && el !== page) return;
        var b = boxOf(el);
        if (q[0] >= b[0] && q[0] <= b[0] + b[2] && q[1] >= b[1] && q[1] <= b[1] + b[3] && b[2] * b[3] < area) { area = b[2] * b[3]; best = el; }
      });
      return best;
    }
    // The browser applies a new placement a frame after it is told. A press that lands inside that frame is checked
    // against the map and, if it went astray, given to the control that is drawn under the pointer.
    var rescuing = false;
    function rescue(el, q) {
      rescuing = true;
      try {
        var lab = el.tagName === 'LABEL' ? el : null, target = lab && lab.control ? lab.control : el;
        if (target.type === 'range') {
          var b = boxOf(target), max = parseFloat(target.max) || 100, min = parseFloat(target.min) || 0;
          target.value = min + (max - min) * clamp((q[0] - b[0]) / b[2], 0, 1);
          target.dispatchEvent(new Event('input', { bubbles: true })); target.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) && !/^(checkbox|radio|button|submit|reset)$/.test(target.type) || target.isContentEditable) {
          target.focus({ preventScroll: true });
        } else target.click();
      } finally { rescuing = false; }
    }

    // ------------------------------------------------------------------------------------------------ input
    var dragging = false, dragDist = 0, lastMove = 0, lastUser = performance.now(), blockClick = false, selecting = false;
    function local(e) { var r = canvas.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; }
    function userActed() { lastUser = performance.now(); if (demo.running) demo.stop(false); }
    function fire(name) { var f = cfg.on && cfg.on[name]; if (f) try { f.apply(null, [].slice.call(arguments, 1)); } catch (err) { console.error(err); } }

    root.addEventListener('pointermove', function (e) {
      local(e); lastMove = performance.now();
      if (probing) return;
      placeNow();
      if (still) return;
      if (dragging) {
        dragDist += Math.hypot(e.movementX || 0, e.movementY || 0);
        user.on = true; user.gain = 1; user.x = mx / W; user.y = my / H;
        if (dragDist > 60) fire('stir');
        userActed();
      } else if (e.buttons === 0 && e.pointerType === 'mouse' && cfg.hover > 0 && !calm && !controlOf(e.target) && !selecting) {
        user.on = true; user.gain = cfg.hover; user.x = mx / W; user.y = my / H;     // a hand passing over the bath
      } else if (!dragging) user.on = false;
    }, true);
    root.addEventListener('pointerdown', function (e) {
      local(e); userActed();
      if (probing || still) return;
      placeNow(); blockClick = false; selecting = false;
      if (e.button !== 0) return;
      if (e.isTrusted && cpu && maxShift > 0.5) {
        var q = toPage(mx, my), want = controlAtPage(q), got = controlOf(e.target);
        if (got && !page.contains(got)) got = null;
        if (want !== got && (want || got)) {
          e.preventDefault(); e.stopPropagation(); blockClick = true; user.on = false;
          if (want) rescue(want, q);
          return;
        }
      }
      if (controlOf(e.target)) { user.on = false; return; }
      if (e.shiftKey) { selecting = true; user.on = false; return; }          // Shift-drag selects text instead
      dragging = true; dragDist = 0; page.classList.add('ink-stirring');
      user.on = true; user.fresh = true; user.sw = 0; user.gain = 1; user.x = mx / W; user.y = my / H;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }, true);
    function endDrag() {
      if (dragging && dragDist < 4 && !still) drop(mx / W, my / H);
      if (dragging) page.classList.remove('ink-stirring');
      dragging = false; user.on = false; selecting = false;
    }
    root.addEventListener('pointerup', endDrag, true);
    root.addEventListener('pointercancel', endDrag, true);
    root.addEventListener('blur', endDrag);
    root.addEventListener('click', function (e) { if (blockClick && e.isTrusted) { e.preventDefault(); e.stopPropagation(); } blockClick = false; }, true);
    // Stirring must not start a text selection or take the caret out of the text box.
    root.addEventListener('mousedown', function (e) {
      if (blockClick) { e.preventDefault(); e.stopPropagation(); return; }
      if (!controlOf(e.target) && !e.shiftKey && page.contains(e.target)) e.preventDefault();
    }, true);
    root.addEventListener('keydown', function (e) {
      userActed();
      if (cfg.settle.key && e.key === cfg.settle.key) { startRewind(); e.preventDefault(); }
    }, true);
    root.addEventListener('wheel', userActed, { passive: true, capture: true });
    if (settleBtn) settleBtn.addEventListener('click', function () { startRewind(); });
    pigInputs.forEach(function (el) {
      el.addEventListener('change', function () {
        pickFromInputs();
        var p = pigIndex >= 0 ? colourPigs[pigIndex] : null;
        fire('pigment', pigIndex, p ? p.name : 'none');
      });
    });
    root.addEventListener('input', function (e) {
      if (page.contains(e.target) && e.target !== viscInput && pigInputs.indexOf(e.target) < 0) { lastUser = performance.now(); if (!atRest && (e.isTrusted || rescuing)) fire('type'); }
    }, true);

    // ------------------------------------------------------------------------------------------------ the idle demo
    var demo = (function () {
      var D = cfg.demo, T = 0, running = false, runs = 0, done = {}, typed = {}, picked = null, endAt = 0, lastStep = null;
      function stepsOf() { return (D && D.steps) || []; }
      function start() {
        if (!D || calm || running) return;
        running = true; T = 0; done = {}; typed = {}; picked = null; endAt = 0; runs++;
        lastStep = stepsOf().reduce(function (m, s) { return Math.max(m, s.to || s.at || 0); }, 0);
      }
      function stop(restore) {
        if (!running) return;
        running = false; ghost.on = false; ghost.a = 0; dirty = true;
        if (restore) {
          // put back what the demo typed or picked, unless someone changed it since
          for (var sel in typed) { var el = $(sel); if (el && el.value === typed[sel]) { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); if (doc.activeElement === el) el.blur(); } }
          if (picked && picked.el.checked && picked.prev) { picked.prev.checked = true; picked.prev.dispatchEvent(new Event('change', { bubbles: true })); }
        }
      }
      function update(dt) {
        if (!running) return;
        T += dt;
        var on = false, list = stepsOf();
        for (var i = 0; i < list.length; i++) {
          var s = list[i];
          if (s.path && T >= s.at && T <= s.to) {
            var pts = s._pts || (s._pts = resolvePath(s.path, ASP)), f = ease(clamp((T - s.at) / (s.to - s.at), 0, 1));
            var p = along(pts, f), nx = p[0], ny = p[1];
            if (ghost.on && Math.hypot((nx - ghost.x) * W, (ny - ghost.y) * H) > 0.3) ghost.ang = Math.atan2((ny - ghost.y) * H, (nx - ghost.x) * W);
            ghost.x = nx; ghost.y = ny; ghost.gain = s.gain || 1; ghost.lay = s.lay !== false; on = true;
            ghost.a = Math.min(1, (T - s.at) * 4, (s.to - T) * 4);
          } else if (!s.path && T >= s.at && !done[i]) {
            if (s.drop) { done[i] = true; drop(s.drop[0], s.drop[1], s); }
            else if (s.pick) { done[i] = true; var el = $(s.pick); if (el) { var prev = pigInputs.filter(function (x) { return x.checked; })[0]; if (!picked) picked = { el: el, prev: prev }; else picked.el = el; el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); } }
            else if (s.settle) { done[i] = true; startRewind(); }
            else if (s.type) {
              var f2 = $(s.into), n = Math.min(s.type.length, Math.floor((T - s.at) / (s.rate || 0.11)) + 1);
              if (f2 && f2.value === (typed[s.into] || '') && n > (typed[s.into] || '').length) {
                if (doc.activeElement !== f2 && !still) f2.focus({ preventScroll: true });
                f2.value = typed[s.into] = s.type.slice(0, n); f2.dispatchEvent(new Event('input', { bubbles: true }));
              }
              if (n >= s.type.length) done[i] = true;
            }
          }
        }
        if (!on) ghost.a = 0;
        if (on && !ghost.on) ghost.fresh = true;
        ghost.on = on;
        if (T > lastStep && !rewind && !endAt) endAt = T + 1.2;
        if (endAt && T > endAt) stop(true);
      }
      return { start: start, stop: stop, update: update, get running() { return running; }, get runs() { return runs; }, get t() { return T; } };
    })();

    // ------------------------------------------------------------------------------------------------ sound (synthesised)
    var sound = (function () {
      var o = cfg.sound, btn = o && o.toggle ? $(o.toggle) : null, ctx = null, on = false, bed = null, bedGain = null, filt = null, vol = (o && o.volume) || 0.5;
      var labels = (o && o.labels) || null;
      function noiseBuf(sec) { var n = Math.round(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), last = 0, r = HIC.rng(7); for (var i = 0; i < n; i++) { last = (last + 0.02 * (r() * 2 - 1)) / 1.02; d[i] = last * 3.5; } return b; }
      function init() {
        ctx = new (root.AudioContext || root.webkitAudioContext)();
        bed = ctx.createBufferSource(); bed.buffer = noiseBuf(3); bed.loop = true;
        filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 400; filt.Q.value = 0.8;
        bedGain = ctx.createGain(); bedGain.gain.value = 0;
        bed.connect(filt); filt.connect(bedGain); bedGain.connect(ctx.destination); bed.start();
      }
      function show() { if (!btn) return; btn.setAttribute('aria-pressed', on ? 'true' : 'false'); if (labels) btn.textContent = labels[on ? 1 : 0]; }
      if (btn) { btn.addEventListener('click', function () { if (!ctx) init(); on = !on; if (on) ctx.resume(); else bedGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05); show(); }); show(); }
      return {
        // the bath swishes with the speed of the hand
        update: function (speed) { if (!on) return; var t = ctx.currentTime; bedGain.gain.setTargetAtTime(Math.min(speed * 0.35, 0.22) * vol, t, 0.08); filt.frequency.setTargetAtTime(260 + Math.min(speed, 3) * 520, t, 0.1); },
        // a drop: a falling sine "plip" and a tiny noise tick
        plip: function () {
          if (!on) return; var t = ctx.currentTime, g = ctx.createGain(), s = ctx.createOscillator();
          s.type = 'sine'; s.frequency.setValueAtTime(980, t); s.frequency.exponentialRampToValueAtTime(240, t + 0.16);
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.28 * vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
          s.connect(g); g.connect(ctx.destination); s.start(t); s.stop(t + 0.35);
        },
        // settling: a long soft sweep down
        whoosh: function (d) {
          if (!on) return; var t = ctx.currentTime, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
          src.buffer = noiseBuf(d + 0.3); f.type = 'lowpass'; f.frequency.setValueAtTime(1600, t); f.frequency.exponentialRampToValueAtTime(220, t + d);
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2 * vol, t + d * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
          src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(t); src.stop(t + d + 0.3);
        },
        get on() { return on; }
      };
    })();

    // ------------------------------------------------------------------------------------------------ paint, time
    build();
    var preRan = false;
    S.onPaint(function () {
      var dpr = Math.min(2, root.devicePixelRatio || 1);
      var r = S.upload(page, pageTex, Math.round(page.offsetWidth * dpr), Math.round(page.offsetHeight * dpr));
      if (!r) return;
      pageW = r.w; pageH = r.h; dirty = true;
      if (!pageReady) {
        pageReady = true;
        probing = true;
        S.probe(page, cfg.probe ? $(cfg.probe) : null).then(function (mode) {
          probing = false; probed = true;
          S.place(page, [1, 0, 0, 1, 0, 0]);      // S.probe leaves the page where it put it; bring it home
          if (still) preRun();
          S.requestPaint();
          S.ready({ mode: mode, engine: 'wet-ink ' + WetInk.version, pigments: colourPigs.length, floatLinear: floatLinear });
        });
      }
    });
    // #still=<t>: the page as the idle demo leaves it t seconds after load (deterministic: fixed steps, no clock)
    function preRun() {
      if (preRan) return; preRan = true;
      var t = HIC.still || 0, D = cfg.demo;
      if (!D || calm) return;
      var tDemo = t - (D.delay != null ? D.delay : 2.5);
      if (tDemo <= 0) return;
      demo.start();
      var n = Math.round(tDemo / DT);
      for (var i = 0; i < n && demo.running; i++) { if (rewind && !ghost.on) { demo.update(DT); rewindStep(DT); } else step(); }
      demo.stop(false); ghost.a = 0; ghost.on = false;
      readNow(); dirty = true;
    }
    var acc = 0, idleSince = performance.now();
    S.loop(function (t, dt) {
      pollReadback();
      if (!pageReady || probing) return;
      var now = performance.now();
      if (!still) {
        if (user.on && !dragging && now - lastMove > 120) user.on = false;
        var stirring = user.on && user.gain > 0.5;
        if (busy() || rewind) {
          acc = Math.min(acc + dt, 2 * DT + 0.001);
          var did = false;
          while (acc >= DT) {
            acc -= DT; did = true;
            if (rewind && !stirring && !ghost.on) { if (demo.running) demo.update(DT); rewindStep(DT); } else step();
          }
          if (did && autoQuality) {       // a slow machine: draw the canvas smaller, never the page texture
            if (dt > 0.03) { if (++slow > 24 && quality > 0.5) { setBacking(quality > 0.8 ? 0.75 : 0.5); slow = 0; } }
            else if (dt < 0.019) slow = Math.max(0, slow - 1);
          }
          idleSince = now;
        } else {
          acc = 0;
          if (cfg.settle.idle > 0 && !atRest && now - Math.max(idleSince, lastUser) > cfg.settle.idle * 1000 && api.auto) startRewind();
          if (cfg.demo && atRest && api.auto && now - Math.max(lastUser, idleSince) > 1000 * (demo.runs ? (cfg.demo.again || 40) : (cfg.demo.delay != null ? cfg.demo.delay : 2.5))) demo.start();
        }
        sound.update(user.on ? Math.hypot(user.x - user.px, user.y - user.py) / DT : 0);
      }
      requestReadback();
      if (dirty) render();
    });
    var resizeT = 0;
    root.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(function () { build(); fire('resize'); S.requestPaint(); }, 60); });

    // ------------------------------------------------------------------------------------------------ the API (+ test hook)
    function syncAll() { readNow(); render(); gl.finish(); }
    var api = {
      cfg: cfg, S: S, gl: gl, auto: true,
      get state() {
        return { W: W, H: H, quality: quality, atRest: atRest, flowing: simT < flowUntil, rewinding: !!rewind, keys: keys.length, maxShift: +maxShift.toFixed(2),
          stain: stainOn, pigment: pigIndex, pigments: colourPigs.map(function (p) { return p.name; }), viscosity: visc, demo: demo.running, demoRuns: demo.runs, stats: stats, probed: probed };
      },
      // a stroke along points [[u, v], …] (or a WetInk.path) over `steps` simulation steps, then `coast` more steps
      stroke: function (pts, o) {
        o = o || {};
        pts = resolvePath(pts, ASP);
        var n = o.steps || 60;
        ghost.on = true; ghost.fresh = true; ghost.sw = 0; ghost.gain = o.gain || 1; ghost.lay = o.lay !== false;
        for (var i = 0; i <= n; i++) { var p = along(pts, ease(i / n)); ghost.x = p[0]; ghost.y = p[1]; step(); }
        ghost.on = false; ghost.a = 0;
        for (var j = 0; j < (o.coast || 0); j++) step();
        syncAll(); return api.state;
      },
      drop: function (u, v, o) { drop(u, v, o); var n = Math.ceil(cfg.drop.bloom / DT) + 1; for (var i = 0; i < n; i++) step(); syncAll(); return api.state; },
      run: function (n) { for (var i = 0; i < n; i++) { if (rewind) rewindStep(DT); else step(); } syncAll(); return api.state; },
      settle: function () { return startRewind(); },
      finish: function () { var guard = 0; while (rewind && guard++ < 2000) rewindStep(DT); syncAll(); return api.state; },
      reset: function () { demo.stop(false); build(); syncAll(); return api.state; },
      pick: function (i) { if (pigInputs.length) { var el = pigInputs.filter(function (x) { var p = pigs[pigInputs.indexOf(x)]; return colourPigs.indexOf(p) === i; })[0]; if (el) { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); } } else pigIndex = i; return pigIndex; },
      viscosity: function (v) { visc = clamp(v, 0, 1); if (viscInput) viscInput.value = Math.round(visc * (parseFloat(viscInput.max) || 100)); return visc; },
      demo: function (on) { if (on === false) { api.auto = false; demo.stop(false); } else { api.auto = true; demo.start(); } return demo.running; },
      act: function (name) { var f = (cfg.acts && cfg.acts[name]) || BUILTIN_ACTS[name]; if (!f) throw new Error('no act ' + name); api.auto = false; demo.stop(false); f(api); syncAll(); return api.state; },
      sync: syncAll, toPage: toPage, screenAt: screenAt, offsetAt: offsetAt,
      get maxShift() { return maxShift; },
      path: WetInk.path
    };
    // scripted states every page has (a page adds its own in cfg.acts)
    var BUILTIN_ACTS = {
      rest: function () {},
      comb: function (ink) { ink.stroke(WetInk.path.wave(0.08, 0.36, 0.9, 0.42, 0.12, 1.5), { steps: 110, coast: 24 }); },
      drops: function (ink) { ink.drop(0.62, 0.38); ink.pick(1 % Math.max(1, colourPigs.length)); ink.drop(0.7, 0.55); ink.pick(2 % Math.max(1, colourPigs.length)); ink.drop(0.54, 0.6); },
      swirl: function (ink) { ink.stroke(WetInk.path.spiral(0.5, 0.45, 0.04, 0.3, 1.6), { steps: 140, coast: 30 }); },
      'settle-half': function (ink) { BUILTIN_ACTS.comb(ink); startRewind(); var n = Math.round(rewind.dur * 0.5 / DT); for (var i = 0; i < n && rewind; i++) rewindStep(DT); }
    };
    probe.ink = api;
    probe.screenOf = function (el) { if (!cpu) return null; readNow(); var b = boxOf(el); return screenAt(b[0] + b[2] / 2, b[1] + b[3] / 2); };
    root.INK_API = api;

    S.requestPaint();
    return api;
  };

  root.WetInk = WetInk;
})(typeof window !== 'undefined' ? window : globalThis);

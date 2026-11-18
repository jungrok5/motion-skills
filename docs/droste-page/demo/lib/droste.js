/* droste.js — the Droste engine for live HTML-in-Canvas pages (droste-page skill).
 *
 * One real DOM page is drawn through a conformal map so that a framed window on the page shows the page itself, which
 * shows the page again, without end. Everything you see in every copy is the same live DOM, uploaded once per paint:
 * type into it and every copy changes; click anything at any depth and the click lands on that element, because the
 * page element is placed for hit testing with the map's local affine under the pointer (a conformal map is locally a
 * turn and a scale, which one matrix says exactly).
 *
 * The map (all coordinates in CSS px; F is the window's fixed point, see layout()):
 *     q  = screen point − F                       z  = log q = (ln|q|, θ)          θ measured from the cut angle
 *     z' = α · (z + i·spin) − frac(fall) · ln S   α  = 1 − i · wind · ln S / 2π    (complex product)
 *     w  = exp z'                                  then w is multiplied or divided by S until it is on the page and
 *                                                  not inside the window; page point = F + w, level = how many times ×S
 * wind = 0 is plain nesting (a picture in a picture, zoomed about F). wind = 1 is Escher's one-turn spiral: walking once
 * round the centre you pass one copy deeper. wind = 2 is a double spiral. Between whole numbers the log plane does not
 * close, and the mismatch shows as a seam along the cut, mended in the seam style. fall moves the camera through the
 * copies: +1 is exactly one copy deeper, which looks identical except for what changes per copy (the number on the
 * counter, the hour of light).
 *
 *   var D = Droste.create({
 *     canvas, page,                              // <canvas layoutsubtree content="drawable"> and its drawable child
 *     window: '#window',                         // the hole; its CSS box must be the page scaled by 1/S (see SKILL.md)
 *     frame: { style: 'gilt', width: 3 },         // moulding drawn round the window (width in U); 'none': the DOM draws it
 *     surfaces: { base: { type: 'plaster' }, wainscot: { type: 'wood', plank: 7 } },   // [data-surface="wainscot"]
 *     light: { moods: Droste.MOODS.day, lamp: '#lamp', panes: { x: -4, y: 4, w: 44, h: 52 } },
 *     counter: { el: '#num', offset: 1 },        // per-copy number composed from a digit strip kept behind the copy
 *     wind: { input: '#wind', rest: 1, max: 2 },  // a real <input type=range>
 *     fall: { rest: -0.25, opening: 3.6, drift: 0 },
 *     sound: 'ceramic', soundToggle: '#sound',   // lib/droste-sound.js presets, or an object
 *     glow: '#fff3d4', seam: { style: 'crease' }, ripple: '#ffd36b'
 *   });
 *   D.tap(el, note)    ripple from an element + a tap sound pitched by the depth that was clicked
 *   D.pose({fall, wind}), D.state(), D.screenOf(el), D.map(x, y)
 *
 * Needs lib/hic.js (HIC). Optional lib/droste-sound.js (DrosteSound). No network. References: references/ENGINE.md.
 */
(function (root) {
  'use strict';
  var HIC = root.HIC;
  var TAU = Math.PI * 2;
  var Droste = { version: '1.0.0' };

  // ================================================================== presets (examples of the style, not menus)
  // Frame mouldings, outer edge (x = 0) to sight edge (x = 1). Each member: [x0, slope, material, kind, colour, spec]
  //   slope > 0 faces outward (catches the light on the upper and left members), < 0 faces the picture
  //   material 0 lacquered wood · 1 gilt metal · 2 matte (paper mat, print) · 3 gloss black
  //   kind 0 flat slope · 1 cove (slope × sin over the member) · 2 ripple (a fine wave, only where the frame is big)
  Droste.FRAMES = {
    gilt: [[0, 1.7, 0, 0, '#2a1a12', .9], [.09, .7, 0, 0, '#2a1a12', .9], [.15, -1.3, 0, 0, '#241610', .9], [.21, .9, 0, 2, '#2c1c13', .9],
      [.48, -1.6, 0, 1, '#1e130d', .9], [.77, 0, 0, 0, '#120c08', .4], [.80, 1.3, 1, 0, '#c99a3c', 1.3], [.86, -.8, 1, 1, '#c08f36', 1.3], [.95, 0, 0, 0, '#100b07', .2]],
    gold: [[0, 1.9, 1, 0, '#b8862f', 1.2], [.12, -1.1, 1, 1, '#a87a2a', 1.1], [.3, .8, 1, 2, '#c39338', 1.3], [.62, -1.5, 1, 1, '#9c7026', 1.1],
      [.86, 1.1, 1, 0, '#d0a447', 1.4], [.94, 0, 0, 0, '#2a1d10', .3]],
    oak: [[0, 1.4, 0, 0, '#9a6b3c', .5], [.18, .2, 0, 0, '#a77445', .5], [.6, -1.2, 0, 1, '#8a5d33', .5], [.88, 0, 0, 0, '#3b2614', .2]],
    black: [[0, 1.2, 3, 0, '#151515', 1], [.22, 0, 3, 0, '#1b1b1b', 1], [.34, -.6, 3, 0, '#111', 1], [.42, 0, 2, 0, '#f1ede4', .1], [.97, -2, 2, 0, '#d8d2c4', .1]],
    print: [[0, 0, 2, 0, '#c8202a', .15], [.62, 0, 2, 0, '#ffffff', .15], [.78, 0, 2, 0, '#1d2f7a', .15]]
  };
  // Per-copy light, cycled one entry per copy (and continuously round the spiral when wound).
  //   amb: light on the wall · sun: light through the panes · lamp: 0..1 picture lamp · side: panes from the left 0 / right 1
  Droste.MOODS = {
    day: [{ amb: [.93, .94, .99], sun: [1.08, 1.05, 1], lamp: 0, side: 0 }, { amb: [.91, .78, .62], sun: [1.32, 1.05, .74], lamp: 0, side: 0 },
      { amb: [.5, .53, .76], sun: [.6, .6, .8], lamp: .45, side: 1 }, { amb: [.17, .2, .36], sun: [.17, .2, .36], lamp: 1, side: 1 },
      { amb: [.82, .82, .88], sun: [1.06, .96, .86], lamp: .05, side: 1 }],
    kitchen: [{ amb: [1, .97, .9], sun: [1.25, 1.12, .9], lamp: 0, side: 0 }, { amb: [.96, .98, 1], sun: [1.05, 1.06, 1.08], lamp: 0, side: 1 },
      { amb: [.96, .82, .66], sun: [1.3, 1, .7], lamp: .2, side: 1 }, { amb: [.7, .64, .74], sun: [.8, .7, .76], lamp: 1, side: 0 }],
    even: [{ amb: [1, 1, 1], sun: [1, 1, 1], lamp: 0, side: 0 }]
  };
  var SURF = { flat: 0, tiles: 1, plaster: 2, wood: 3, card: 4, glass: 5, metal: 6 };
  Droste.SURFACES = Object.keys(SURF);

  // ================================================================== small helpers
  function q$(x, scope) { return typeof x === 'string' ? (scope || document).querySelector(x) : x || null; }
  function rgb(c) {
    if (Array.isArray(c)) return c.slice(0, 3);
    if (typeof c !== 'string') return [1, 1, 1];
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
    if (m) { var h = m[1]; if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]; }
    m = /rgba?\(([^)]+)\)/.exec(c);
    if (m) { var p = m[1].split(/[ ,\/]+/).map(parseFloat); return [p[0] / 255, p[1] / 255, p[2] / 255]; }
    return [1, 1, 1];
  }
  function sstep(a, b, x) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); }

  // ================================================================== the shader
  // Kept in step with mapPoint() below: change one, change the other (the check compares them through screenOf()).
  var MAXR = 12, MAXSEG = 10, MAXMOOD = 8;
  var FRAG = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vUv; out vec4 o;',
    'uniform sampler2D uPage;',
    'uniform vec2 uRes, uP, uF, uAlpha;',
    'uniform float uDpr, uS, uL, uTf, uLev0, uSpin, uCut, uWind, uTexScale, uU, uTime, uWinR;',
    'uniform vec4 uWin;',
    // frame
    'uniform float uFB; uniform int uNSeg; uniform vec4 uSeg[' + MAXSEG + ']; uniform vec4 uSegC[' + MAXSEG + '];',
    // surfaces: rect, A (type, p1, p2, p3), B, C, D
    'uniform int uNR; uniform vec4 uRR[' + MAXR + '], uRA[' + MAXR + '], uRB[' + MAXR + '], uRC[' + MAXR + '], uRD[' + MAXR + '];',
    // light
    'uniform vec3 uKey; uniform int uNMood; uniform vec3 uMA[' + MAXMOOD + '], uMS[' + MAXMOOD + ']; uniform vec2 uML[' + MAXMOOD + '];',
    'uniform vec4 uLamp; uniform vec3 uLampC; uniform vec4 uPanes, uPaneG; uniform vec3 uGlow; uniform float uShadow;',
    // seam, ripple, counter
    'uniform vec4 uSeamC; uniform float uSeamStyle, uSeamOn; uniform vec4 uRip; uniform vec3 uRipC;',
    'uniform vec4 uCnt, uCntCell; uniform vec2 uAtlas; uniform vec3 uCntInk; uniform float uCntOff, uCntOn;',
    'const float PI = 3.14159265, TAU = 6.2831853;',
    'float h21(vec2 p){ p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }',
    'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);',
    '  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }',
    'float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++){ s += a * vn(p); p = p * 2.03 + 17.1; a *= .5; } return s; }',
    'float sdBox(vec2 p, vec4 r){ vec2 c = (r.xy + r.zw) * .5, h = (r.zw - r.xy) * .5; vec2 d = abs(p - c) - h; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }',
    'float sdRound(vec2 p, vec4 r, float rad){ vec2 c = (r.xy + r.zw) * .5, h = (r.zw - r.xy) * .5 - rad; vec2 d = abs(p - c) - h; return length(max(d, 0.)) + min(max(d.x, d.y), 0.) - rad; }',
    // distance to the nearest cell wall of a jittered grid: cracks in a glaze
    'float cells(vec2 p){ vec2 i = floor(p), f = fract(p); float a = 9., b = 9.;',
    '  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 g = vec2(float(x), float(y)); vec2 d = g + vec2(h21(i+g), h21(i+g+5.3)) - f; float l = dot(d, d); if (l < a){ b = a; a = l; } else if (l < b) b = l; }',
    '  return sqrt(b) - sqrt(a); }',
    'float luma(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }',

    // ---- the window test in w-space (page point minus F): the hole is the page scaled by 1/S about F
    'bool inPage(vec2 w){ return all(greaterThanEqual(w, -uF)) && all(lessThanEqual(w, uP - uF)); }',
    'bool inHole(vec2 w){ vec2 e = w + uF; if (e.x < uWin.x || e.y < uWin.y || e.x > uWin.z || e.y > uWin.w) return false;',
    '  return uWinR <= 0. || sdRound(e, uWin, uWinR) <= 0.; }',

    // ---- surfaces. Each modulates the page colour and returns a normal, a gloss exponent and a specular strength.
    'void surface(int k, vec2 e, float dpp, inout vec3 col, out vec3 n, out float gl, out float sp){',
    '  vec4 R = uRR[k], A = uRA[k], B = uRB[k], C = uRC[k], D = uRD[k]; int ty = int(A.x + .5);',
    '  n = vec3(0, 0, 1); gl = 20.; sp = .1;',
    '  if (ty == 1) {',      // tiles: A(type, size px, grout frac, bevel) B(wobble, tilt, craze, chips) C(grout rgb, tint) D(gloss, hue, 0, 0)
    '    vec2 T = A.y > 0. ? vec2(A.y) : (R.zw - R.xy); vec2 g = (e - R.xy) / T, id = floor(g); vec2 pl = (g - id) * T, ph = T - pl;',
    '    float fine = smoothstep(4., 22., T.x * dpp), h = h21(id + 3.7), h2 = h21(id * 1.7 + 9.1), h3 = h21(id * 2.3 + 1.3);',
    '    col *= mix(vec3(1., .985, .95), mix(vec3(.95, .97, 1.), vec3(1., .95, .9), D.y), h2) * (1. - C.w + 2. * C.w * h);',
    '    col *= .985 + .035 * vn(g * 1.7 + h * 31.) * fine;',
    '    float bw = min(T.x, T.y) * A.w; vec2 sl = vec2(smoothstep(bw, 0., pl.x) - smoothstep(bw, 0., ph.x), smoothstep(bw, 0., pl.y) - smoothstep(bw, 0., ph.y));',
    '    vec2 tilt = (vec2(h3, h21(id + 7.7)) - .5) * B.y; vec2 wv = (vec2(vn(g * 2.6 + 5.), vn(g * 2.6 + 19.)) - .5) * B.x * fine;',
    '    n = normalize(vec3(-sl * .6 * fine - tilt - wv, 1.)); gl = 140. * D.x + 8.; sp = .45 * D.x * mix(.35, 1., fine);',
    '    if (fine > .5 && h3 > 1. - B.z){ float cs = 9. + 5. * h; float cz = cells(g * cs + h * 40.) / cs * T.x * dpp; col *= 1. - .06 * fine * smoothstep(1.2, .3, cz) * smoothstep(.2, .7, vn(g * 1.3 + h * 9.)); }',
    '    float de = min(min(pl.x, ph.x), min(pl.y, ph.y)); float aa = .7 / dpp;',
    '    col *= 1. - .1 * smoothstep(bw * .8, 0., de) * fine;',
    '    float gw = min(T.x, T.y) * A.z * (.7 + .7 * vn(e / T.x * 3.1)); float gr = 1. - smoothstep(gw - aa, gw + aa, de); gr *= mix(clamp(gw * 2. * dpp, 0., 1.), 1., fine);',
    '    col = mix(col, C.rgb * (.85 + .3 * h21(floor(e * .5))), gr * .88); sp *= 1. - gr;',
    '    if (B.w > 0. && fine > .4){ vec2 vid = floor(g + .5); vec2 pv = (g - vid) * T; float hv = h21(vid * 1.3 + 2.2); float rc = T.x * (.018 + .05 * h21(vid + 5.1));',
    '      float dv = max(abs(pv.x), abs(pv.y)) * .6 + length(pv) * .4 + (vn(pv / T.x * 26. + vid * 7.) - .5) * T.x * .03;',
    '      float chip = smoothstep(rc + aa, rc - aa, dv) * step(1. - B.w, hv) * fine * step(gw, de); col = mix(col, vec3(.7, .5, .37) * (.75 + .4 * vn(pv / T.x * 40. + vid)), chip * .9); }',
    '  } else if (ty == 2) {', // plaster: A(type, scale px, rough, mottle) B(gloss)
    '    vec2 p = e / max(A.y, 1.); float fine = smoothstep(.5, 3., A.y * dpp);',
    '    float hx = fbm(p + vec2(.07, 0.)) - fbm(p - vec2(.07, 0.)), hy = fbm(p + vec2(0., .07)) - fbm(p - vec2(0., .07));',
    '    n = normalize(vec3(-vec2(hx, hy) * 2.2 * A.z * fine, 1.)); col *= 1. - A.w + 2. * A.w * fbm(p * .23 + 4.); gl = 6. + 30. * B.x; sp = .05 + .3 * B.x;',
    '  } else if (ty == 3) {', // wood: A(type, plank px, grain, vertical) B(gloss, gap, tone)
    '    vec2 p = A.w > .5 ? e.yx : e; vec2 o = A.w > .5 ? R.yx : R.xy; float pw = max(A.y, 2.); float row = floor((p.y - o.y) / pw), v = (p.y - o.y) / pw - row;',
    '    float hr = h21(vec2(row, 3.1)); float fine = smoothstep(1., 6., pw * dpp);',
    '    float gr = fbm(vec2(p.x / (pw * 3.) + hr * 40., v * 6. + hr * 9.) ) ; float ring = sin((v * 9. + gr * 6. + hr * 30.) * PI) * .5 + .5;',
    '    col *= (1. - B.z + 2. * B.z * hr) * (1. - .12 * A.z * ring * fine) * (1. - .06 * A.z * vn(vec2(p.x * .4, v * 40.)) * fine);',
    '    float gap = 1. - smoothstep(0., B.y, min(v, 1. - v)); col *= 1. - .45 * gap * fine;',
    '    vec2 sl = vec2(0., smoothstep(.12, 0., v) - smoothstep(.12, 0., 1. - v)); if (A.w > .5) sl = sl.yx;',
    '    n = normalize(vec3(-sl * .5 * fine, 1.)); gl = 10. + 60. * B.x; sp = .3 * B.x * (1. - gap);',
    '  } else if (ty == 4) {', // card: A(type, fiber, halftone dot px, varnish) B(crease)
    '    float fine = smoothstep(.5, 2.5, dpp); col *= 1. - .035 * A.y * (vn(e * vec2(.9, 3.1)) - .5) * fine;',
    '    if (A.z > 0.){ float dot_ = A.z; mat2 rot = mat2(.7071, .7071, -.7071, .7071); vec2 hp = rot * e / dot_; vec2 c = fract(hp) - .5;',
    '      float ink = clamp(1. - luma(col) / .96, 0., 1.); float rr = sqrt(ink) * .62; float d = length(c);',
    '      float on = smoothstep(rr + .08, rr - .08, d); float vis = smoothstep(1.5, 5., dot_ * dpp);',
    // printed colour as dots: paper between them, the ink a little denser inside them
    '      vec3 paper = vec3(.99, .975, .95); col = mix(col, mix(paper, col * .82, on), vis * .55); }',
    '    gl = 18. + 70. * A.w; sp = .55 * A.w; n = normalize(vec3((vn(e * .05) - .5) * .05, (vn(e * .05 + 7.) - .5) * .05, 1.));',
    '  } else if (ty == 5) {', // glass: A(type, sheen)
    '    gl = 200.; sp = .9; float band = smoothstep(.0, .25, fract((e.x - e.y * .6) / (uP.x * .9) + .3)) * smoothstep(.5, .25, fract((e.x - e.y * .6) / (uP.x * .9) + .3));',
    '    col += vec3(1.) * band * .08 * A.y;',
    '  } else if (ty == 6) {', // metal: A(type, brush, gloss, vertical)
    '    vec2 p = A.w > .5 ? e.yx : e; float fine = smoothstep(.5, 3., uU * dpp);',
    '    col *= .9 + .16 * vn(vec2(p.x / uU * .5, p.y / uU * 16.)) * A.y * fine + .05 * vn(vec2(p.x / uU * 3., p.y / uU * 40.)) * fine;',
    '    vec2 rc = (e - R.xy) / max(R.zw - R.xy, vec2(1.)); col *= .86 + .3 * smoothstep(.55, 0., abs(rc.x * .7 + rc.y * .5 - .42));',
    '    float dE = -sdBox(e, R); col *= 1. - .28 * exp(-dE / (.28 * uU));',
    '    n = normalize(vec3(0., (smoothstep(.0, .2, rc.y) - smoothstep(.8, 1., rc.y)) * -.3, 1.)); gl = 60. * A.z + 10.; sp = .9 * A.z;',
    '  } else {',
    '    gl = 10. + 60. * B.x; sp = .3 * B.x;',
    '  }',
    '}',

    // ---- the moulding round the window
    'vec3 moulding(vec2 e, float dpp, out float metal){',
    '  vec4 Fo = vec4(uWin.xy - uFB, uWin.zw + uFB); vec2 c = (Fo.xy + Fo.zw) * .5, hf = (Fo.zw - Fo.xy) * .5; vec2 p = e - c, d = abs(p) - hf;',
    '  bool sx = d.x > d.y; vec2 ow = sx ? vec2(sign(p.x), 0.) : vec2(0., sign(p.y));',
    '  float x = clamp(-max(d.x, d.y) / uFB, 0., 1.); float al = (sx ? p.y : p.x) / uU; float big = clamp((uFB * dpp - 14.) / 40., 0., 1.);',
    '  int k = 0; for (int i = 1; i < ' + MAXSEG + '; i++){ if (i < uNSeg && x >= uSeg[i].x) k = i; }',
    '  vec4 s = uSeg[k], sc = uSegC[k]; float x1 = k + 1 < uNSeg ? uSeg[k + 1].x : 1.; float u = clamp((x - s.x) / max(x1 - s.x, 1e-3), 0., 1.);',
    '  float sl = s.y; int kind = int(s.w + .5); if (kind == 1) sl = s.y * sin(u * PI); if (kind == 2) sl = s.y * sin(u * 46.) * big;',
    '  vec3 n = normalize(vec3(ow * sl, 1.)); float dif = max(dot(n, uKey), 0.); vec3 H = normalize(uKey + vec3(0, 0, 1)); float nh = max(dot(n, H), 0.);',
    '  int mat = int(s.z + .5); vec3 col; metal = 0.;',
    '  if (mat == 0){ float g1 = vn(vec2(al * .22, x * 7. + 3.)), g3 = vn(vec2(al * .06, x * 3. + 9.)); vec3 base = sc.rgb * (.8 + .35 * g3) * (.85 + .3 * g1 * big);',
    '    col = base * (.2 + 2.3 * dif) + vec3(.85, .78, .68) * (pow(nh, 60.) * .9 + pow(nh, 7.) * .1) * sc.w; }',
    '  else if (mat == 1){ vec3 gb = sc.rgb * (.93 + .1 * vn(vec2(al * 1.6, x * 30.)) * big + .05 * vn(e / uU * 14.) * big);',
    '    gb = mix(gb, gb * vec3(.62, .4, .3), .22 * smoothstep(.55, .95, vn(vec2(al * .5, x * 9.) + 3.)));',
    '    col = gb * (.24 + 1.2 * dif) + vec3(1., .94, .74) * (pow(nh, 90.) * 1.2 + pow(nh, 12.) * .12) * sc.w; metal = .7; }',
    '  else if (mat == 2){ col = sc.rgb * (.62 + .45 * dif) + vec3(1.) * pow(nh, 30.) * .1 * sc.w; col *= .97 + .05 * vn(e * .8); }',
    '  else { col = sc.rgb * (.35 + .9 * dif) + vec3(1.) * (pow(nh, 140.) * 1.1 + pow(nh, 14.) * .08) * sc.w; }',
    '  col *= 1. - .34 * smoothstep(.04 * uFB, 0., abs(d.x - d.y));',   // the mitre
    '  col *= 1. - .7 * smoothstep(.04, 0., abs(x - s.x)) * step(.5, float(k)) * .25;',
    '  return mix(sc.rgb * .7, col, clamp(uFB * dpp / 6., 0., 1.));',
    '}',

    // ---- light through panes thrown aslant across the wall (uPanes: x, y, w, h in U; uPaneG: cols, rows, skew, strength)
    'float panes(vec2 e){ if (uPaneG.w <= 0.) return 0.; vec2 p = vec2(e.x - uPaneG.z * e.y, e.y) / uU; vec2 q = (p - uPanes.xy) / uPanes.zw;',
    '  float inside = smoothstep(0., .03, q.x) * smoothstep(1., .97, q.x) * smoothstep(0., .025, q.y) * smoothstep(1., .975, q.y);',
    '  vec2 c = fract(q * uPaneG.xy); float bars = smoothstep(.03, .085, c.x) * smoothstep(.97, .915, c.x) * smoothstep(.025, .07, c.y) * smoothstep(.975, .93, c.y);',
    '  return inside * bars * uPaneG.w; }',

    'void main(){',
    '  vec2 Q = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;',
    '  vec2 q = Q - uF; float r = max(length(q), 1e-4);',
    '  float rel = mod(atan(q.y, q.x) - uCut, TAU); float th = uCut + rel;',
    '  vec2 z = vec2(log(r), th + uSpin);',
    '  vec2 zp = vec2(uAlpha.x * z.x - uAlpha.y * z.y, uAlpha.x * z.y + uAlpha.y * z.x); zp.x -= uTf * uL;',
    '  float m = exp(zp.x); vec2 w = m * vec2(cos(zp.y), sin(zp.y)); float pps = length(uAlpha) * m / r;',
    '  float lev = 0.;',
    '  for (int i = 0; i < 4; i++){ if (!inPage(w)){ w /= uS; pps /= uS; lev -= 1.; } }',
    '  for (int i = 0; i < 26; i++){ if (inHole(w)){ w *= uS; pps *= uS; lev += 1.; } else break; }',
    '  vec2 e = w + uF;',
    '  float dpx = uDpr / pps; float dEdge = min(max(sdBox(e, uWin), 0.) + (uWinR > 0. ? 1e4 : 0.), min(min(e.x, uP.x - e.x), min(e.y, uP.y - e.y))) * dpx;',
    '  float lod = max(log2(pps * uTexScale / uDpr) - .25, 0.);',
    '  vec3 col = textureLod(uPage, e / uP, lod).rgb;',
    '  float dpp = uDpr / pps;',
    '  float copyN = lev + uLev0;',
    '  vec3 n = vec3(0, 0, 1); float gl = 20., sp = 0., metal = 0.;',
    '  float dF = sdBox(e, vec4(uWin.xy - uFB, uWin.zw + uFB));',
    '  if (uFB > 0. && dF <= 0.) { col = moulding(e, dpp, metal); }',
    '  else {',
    '    int k = 0; for (int i = 1; i < ' + MAXR + '; i++){ if (i < uNR){ vec4 R = uRR[i]; if (e.x >= R.x && e.y >= R.y && e.x <= R.z && e.y <= R.w) k = i; } }',
    '    surface(k, e, dpp, col, n, gl, sp);',
    '    if (int(uRA[k].x + .5) == 6) metal = 1.;',
    // the per-copy number
    '    if (uCntOn > .5 && e.x >= uCnt.x && e.y >= uCnt.y && e.x <= uCnt.z && e.y <= uCnt.w){',
    '      float num = copyN + uCntOff; float neg = num < -.5 ? 1. : 0.; float an = min(abs(num), 9999.);',
    '      float nd = an < 9.5 ? 1. : an < 99.5 ? 2. : an < 999.5 ? 3. : 4.; float tot = nd + neg;',
    '      vec2 cc = vec2((uCnt.x + uCnt.z) * .5 - tot * uCntCell.x * .5, (uCnt.y + uCnt.w) * .5 - uCntCell.y * .5);',
    '      float xi = floor((e.x - cc.x) / uCntCell.x); float fy = e.y - cc.y;',
    '      if (xi >= 0. && xi < tot && fy >= 0. && fy < uCntCell.y){',
    '        float gi = 10.; if (!(neg > .5 && xi < .5)){ float di = xi - neg; gi = mod(floor(an / pow(10., nd - 1. - di) + .0001), 10.); }',
    '        vec2 cell = vec2(mod(gi, 6.), floor(gi / 6.)); vec2 ap = uAtlas + cell * uCntCell.xy + vec2(e.x - cc.x - xi * uCntCell.x, fy);',
    '        float a = clamp(1. - luma(textureLod(uPage, ap / uP, lod).rgb), 0., 1.); col = mix(col, uCntInk, a); } }',
    '  }',
    // light: a raking key from the upper left, panes, the per-copy hour, the picture lamp
    '  float dif = dot(n, uKey) / uKey.z; float fall = clamp(e.x / uP.x * .42 + e.y / uP.y * .58, 0., 1.);',
    '  vec3 Lp = vec3(uP.x * .2, -uP.y * .08, uP.x * 1.1); vec3 Ld = normalize(Lp - vec3(e, 0.)); float nh = max(dot(n, normalize(Ld + vec3(0, 0, 1))), 0.);',
    '  float spec = (pow(nh, gl) * .6 + pow(nh, gl * .12) * .08) * sp;',
    '  float Dh = copyN + uWind * rel / TAU; int nm = max(uNMood, 1); float hp = mod(Dh, float(nm)); int ia = int(floor(hp)); float f = hp - floor(hp); f = f * f * (3. - 2. * f);',
    '  int ib = ia + 1 >= nm ? 0 : ia + 1; vec3 amb = mix(uMA[ia], uMA[ib], f), sun = mix(uMS[ia], uMS[ib], f); float lamp = mix(uML[ia].x, uML[ib].x, f), side = mix(uML[ia].y, uML[ib].y, f);',
    '  float pm = mix(panes(e), panes(vec2(uP.x - e.x, e.y)), side);',
    '  vec3 light = mix(amb, sun, pm) * mix(1., dif, .45) * mix(1.04, .78, fall * fall);',
    '  vec3 Lc = vec3(0.); if (uLamp.z > uLamp.x){ vec2 lp = vec2((uLamp.x + uLamp.z) * .5, uLamp.w); vec2 dd = (e - lp) / uU;',
    '    float ang = abs(dd.x) / max(dd.y + 3., .5); float cone = smoothstep(1.8, 1.1, ang) * smoothstep(-1.2, .6, dd.y);',
    '    float pool = .62 * exp(-(dd.x * dd.x * .001 + dd.y * dd.y * (dd.y < 0. ? .006 : .001))) + .5 * cone * exp(-(dd.x * dd.x * .0007 + dd.y * dd.y * .0011)) + .1 * exp(-dot(dd, dd) * .006);',
    '    Lc = uLampC * pool * lamp * (.95 + .5 * metal); }',
    '  float lum = max(max(light.r, light.g), light.b);',
    '  col = col * light + col * Lc + vec3(1., .97, .92) * spec * mix(.25, 1., clamp(lum, 0., 1.)) + uLampC * spec * lamp * .5;',
    // the frame casts a shadow away from the light; each copy sits behind its frame
    '  if (uFB > 0. && dF > 0.){ vec2 so = -uKey.xy / uKey.z * uU * 1.6; float ds = sdBox(e - so, vec4(uWin.xy - uFB, uWin.zw + uFB));',
    '    col *= 1. - uShadow * exp(-max(ds, 0.) / (2.4 * uU)); col *= 1. - .3 * uShadow * exp(-dF / (.22 * uU)); }',
    '  vec2 dl = e, dh = uP - e; float din = exp(-dl.y / (1.1 * uU)) * .4 + exp(-dl.x / (.9 * uU)) * .3 + exp(-dh.x / (.5 * uU)) * .12 + exp(-dh.y / (.5 * uU)) * .1;',
    '  col *= 1. - min(din, .7) * uShadow;',
    // a tap rings out across every copy at once
    '  if (uRip.w > 0.){ float dr = length(e - uRip.xy) - uRip.z; float ring = uRip.w * exp(-dr * dr / (uU * uU * 6.)); col = mix(col, uRipC * (1. + .3 * metal), clamp(ring * .5, 0., 1.)); }',
    // far copies melt into light; so does the very centre
    '  col = mix(col, uGlow, (1. - smoothstep(.5, 2.6, uU / pps)) * .9);',
    '  col = mix(col, uGlow, min(1., exp(-r / (2.4 * uU)) * 1.1));',
    // the seam: where a part-wound spiral does not close
    '  if (uSeamOn > 0.){ float sd = min(rel, TAU - rel) * r; float sg = rel < PI ? 1. : -1.;',
    '    float wid = uSeamC.w * uSeamOn * smoothstep(0., 80., r) * (.6 + .4 * vn(vec2(r * .03, 1.7)));',
    '    float a = smoothstep(wid + .6, wid - .6, sd); float across = sg * sd / max(wid, .5);',
    '    if (uSeamStyle < .5){', // crease: a fold, dark on one side and caught by the light on the other
    '      col *= 1. - .45 * smoothstep(wid * 3. + 1., 0., sd) * step(sg, 0.) * uSeamOn; col = mix(col, col * 1.25 + .05, smoothstep(wid * 2. + 1., 0., sd) * step(0., sg) * .5 * uSeamOn);',
    '      col = mix(col, uSeamC.rgb, a * .8); }',
    '    else {', // bead: a raised line of metal laid in the cut
    '      float dome = sqrt(max(0., 1. - across * across)); vec3 b = uSeamC.rgb * (.5 + .42 * across + .3 * dome) + vec3(1., .96, .82) * pow(max(0., 1. - abs(across - .4) * 1.7), 5.) * .8;',
    '      col *= 1. - smoothstep(wid + 6., wid, sd) * step(sg, 0.) * .4 * uSeamOn * (1. - a); col = mix(col, b, a); } }',
    '  col = mix(col, vec3(.05, .04, .035), (1. - smoothstep(0., 1.3, dEdge)) * smoothstep(.5, 2.6, uU / pps));',
    '  vec2 sc = gl_FragCoord.xy / uRes - .5; col *= 1. - dot(sc, sc) * .22;',
    '  o = vec4(pow(max(col, 0.), vec3(1.03)), 1.);',
    '}'
  ].join('\n');

  // ================================================================== the engine
  Droste.create = function (cfg) {
    cfg = cfg || {};
    var canvas = q$(cfg.canvas || '#stage'), page = q$(cfg.page || '#page');
    var D = { cfg: cfg, canvas: canvas, page: page, fallback: false };
    if (!HIC.supported('webgl')) {
      HIC.fallback(canvas, { note: cfg.note });
      D.fallback = true;
      return D;
    }
    var winEl = q$(cfg.window || '[data-droste-window]', page);
    var frameCfg = typeof cfg.frame === 'string' ? { style: cfg.frame } : (cfg.frame || { style: 'gilt' });
    var segs = frameCfg.style === 'none' ? [] : (frameCfg.segments || Droste.FRAMES[frameCfg.style] || Droste.FRAMES.gilt);
    var light = cfg.light || {};
    var moods = light.moods || Droste.MOODS.day;
    var lampEl = light.lamp ? q$(light.lamp, page) : null;
    var windCfg = cfg.wind || {}, fallCfg = cfg.fall || {};
    var windIn = windCfg.input ? q$(windCfg.input, page) : null;
    var WMAX = windCfg.max != null ? windCfg.max : 2;
    var cntCfg = cfg.counter || null, cntEl = cntCfg ? q$(cntCfg.el, page) : null;
    var spin = windCfg.spin != null ? windCfg.spin : 0.7;
    var cut = (cfg.seam && cfg.seam.angle != null ? cfg.seam.angle : 0.75) * Math.PI;   // the cut runs from the centre toward the lower left

    // #q=0.5 draws at half resolution (slow software GL in checks); cfg.quality does the same for a page
    var qh = parseFloat(HIC.param('q'));
    var S = HIC.stage(canvas, { maxDpr: 2, quality: qh > 0 ? qh : (cfg.quality || 1) }), gl = S.gl;
    if (!gl) { HIC.fallback(canvas, { note: cfg.note }); D.fallback = true; return D; }
    var prog = HIC.gl.program(gl, null, FRAG);
    var texHi = HIC.gl.texture(gl, { mips: true }), texLo = HIC.gl.texture(gl, { mips: true }), texCur = null, texScale = 1;

    // ------------------------------------------------------------ layout: everything the shader needs, read from the DOM
    var G = { W: 0, H: 0, U: 10, S: 2.2, L: Math.log(2.2), F: [0, 0], win: [0, 0, 1, 1], B: 0, regions: [], lamp: [0, 0, 0, 0], cnt: null, atlas: [0, 0], cell: [0, 0] };
    var atlas = null;
    function unitFor(W, H) { return W < H ? W / 62 : Math.min(W, H * 1.5) / 100; }
    function layout() {
      S.resize();
      var W = S.W, H = S.H, U = unitFor(W, H);
      G.W = W; G.H = H; G.U = U;
      page.style.width = W + 'px'; page.style.height = H + 'px';
      page.style.setProperty('--u', U + 'px');
      G.B = segs.length ? (frameCfg.width != null ? frameCfg.width : 3) * U : 0;
      page.style.setProperty('--frame-b', G.B + 'px');
      // the window: its box decides S and the fixed point. It must be the page scaled by 1/S (same aspect).
      var b = HIC.box(page, winEl);
      var s = W / b[2];
      if (Math.abs(b[3] * s - H) > 1.5) {   // force the aspect rather than draw a broken recursion
        winEl.style.height = (H / s) + 'px';
        b = HIC.box(page, winEl);
        root.__hic.info.warn = 'window height forced to the page aspect';
      }
      G.S = s; G.L = Math.log(s);
      G.win = [b[0], b[1], b[0] + b[2], b[1] + b[3]];
      G.F = [b[0] / (1 - 1 / s), b[1] / (1 - 1 / s)];
      G.winR = cfg.windowRadius ? cfg.windowRadius * U : 0;
      // surfaces: region 0 is the whole page (surfaces.base), then every [data-surface] element in document order
      var surfs = cfg.surfaces || {};
      G.regions = [{ rect: [0, 0, W, H], s: surfs.base || { type: 'flat' } }];
      [].forEach.call(page.querySelectorAll('[data-surface]'), function (el) {
        if (G.regions.length >= MAXR) return;
        var name = el.getAttribute('data-surface'), sc = surfs[name] || (SURF[name] != null ? { type: name } : null);
        if (!sc || el.offsetWidth === 0) return;
        var bx = HIC.box(page, el);
        G.regions.push({ rect: [bx[0], bx[1], bx[0] + bx[2], bx[1] + bx[3]], s: sc });
      });
      if (lampEl) { var lb = HIC.box(page, lampEl); G.lamp = [lb[0], lb[1], lb[0] + lb[2], lb[1] + lb[3]]; }
      layoutCounter();
      D.U = U; D.G = G;
    }
    // The number on the counter is composed per copy from a strip of real digits kept inside the window, where the
    // next copy covers it: black glyphs on white, in the counter's own font, so the shader can read their coverage.
    var cntInk = [0, 0, 0];
    function layoutCounter() {
      if (!cntEl) return;
      var cs = getComputedStyle(cntEl);
      if (!atlas) {
        cntInk = rgb(cntCfg.ink || cs.color);
        atlas = document.createElement('div');
        atlas.setAttribute('aria-hidden', 'true'); atlas.setAttribute('data-droste-atlas', '');
        for (var i = 0; i < 11; i++) { var sp = document.createElement('span'); sp.textContent = i < 10 ? String(i) : '−'; atlas.appendChild(sp); }
        page.appendChild(atlas);
        cntEl.setAttribute('data-droste-counter', '');
      }
      var fs = parseFloat(cs.fontSize), cw = Math.ceil(fs * (cntCfg.cell || 0.64)), ch = Math.ceil(fs * 1.25);
      var ax = G.win[0] + G.U, ay = G.win[1] + G.U;
      atlas.style.cssText = 'position:absolute;left:' + ax + 'px;top:' + ay + 'px;width:' + (6 * cw) + 'px;height:' + (2 * ch) + 'px;background:#fff;color:#000;' +
        'font:' + cs.fontStyle + ' ' + cs.fontWeight + ' ' + fs + 'px/' + ch + 'px ' + cs.fontFamily + ';letter-spacing:0;pointer-events:none;display:flex;flex-wrap:wrap;' +
        'text-shadow:none;-webkit-text-fill-color:#000;font-variant-numeric:lining-nums tabular-nums';
      [].forEach.call(atlas.children, function (sp) { sp.style.cssText = 'display:block;width:' + cw + 'px;height:' + ch + 'px;text-align:center;flex:none'; });
      var b = HIC.box(page, cntEl);
      G.cnt = [b[0], b[1], b[0] + b[2], b[1] + b[3]];
      G.atlas = [ax, ay]; G.cell = [cw, ch];
    }

    // ------------------------------------------------------------ uniforms that only change with layout
    function setStatic() {
      prog.use(); var u = prog.u;
      gl.uniform2f(u.uP, G.W, G.H); gl.uniform2f(u.uF, G.F[0], G.F[1]);
      gl.uniform4f(u.uWin, G.win[0], G.win[1], G.win[2], G.win[3]); gl.uniform1f(u.uWinR, G.winR);
      gl.uniform1f(u.uS, G.S); gl.uniform1f(u.uL, G.L); gl.uniform1f(u.uU, G.U); gl.uniform1f(u.uCut, cut);
      // frame
      gl.uniform1f(u.uFB, G.B); gl.uniform1i(u.uNSeg, Math.min(MAXSEG, segs.length));
      var sg = new Float32Array(MAXSEG * 4), sc = new Float32Array(MAXSEG * 4);
      segs.slice(0, MAXSEG).forEach(function (s, i) { var c = rgb(s[4]); sg.set([s[0], s[1], s[2], s[3]], i * 4); sc.set([c[0], c[1], c[2], s[5] != null ? s[5] : 1], i * 4); });
      if (u.uSeg) { gl.uniform4fv(u.uSeg, sg); gl.uniform4fv(u.uSegC, sc); }
      // surfaces
      var RR = new Float32Array(MAXR * 4), RA = new Float32Array(MAXR * 4), RB = new Float32Array(MAXR * 4), RC = new Float32Array(MAXR * 4), RD = new Float32Array(MAXR * 4);
      G.regions.forEach(function (rg, i) { var p = packSurface(rg.s); RR.set(rg.rect, i * 4); RA.set(p[0], i * 4); RB.set(p[1], i * 4); RC.set(p[2], i * 4); RD.set(p[3], i * 4); });
      gl.uniform1i(u.uNR, G.regions.length);
      gl.uniform4fv(u.uRR, RR); gl.uniform4fv(u.uRA, RA); gl.uniform4fv(u.uRB, RB); gl.uniform4fv(u.uRC, RC); gl.uniform4fv(u.uRD, RD);
      // light
      var k = light.key || [-0.46, -0.6, 0.65], kl = Math.hypot(k[0], k[1], k[2]);
      gl.uniform3f(u.uKey, k[0] / kl, k[1] / kl, k[2] / kl);
      var MA = new Float32Array(MAXMOOD * 3), MS = new Float32Array(MAXMOOD * 3), ML = new Float32Array(MAXMOOD * 2);
      moods.slice(0, MAXMOOD).forEach(function (m, i) { MA.set(rgb(m.amb), i * 3); MS.set(rgb(m.sun || m.amb), i * 3); ML.set([m.lamp || 0, m.side || 0], i * 2); });
      gl.uniform1i(u.uNMood, Math.min(MAXMOOD, moods.length));
      gl.uniform3fv(u.uMA, MA); gl.uniform3fv(u.uMS, MS); gl.uniform2fv(u.uML, ML);
      gl.uniform4f(u.uLamp, G.lamp[0], G.lamp[1], G.lamp[2], G.lamp[3]);
      var lc = rgb(light.lampColor || [1.12, 0.76, 0.4]); gl.uniform3f(u.uLampC, lc[0], lc[1], lc[2]);
      var pn = light.panes || null;
      gl.uniform4f(u.uPanes, pn ? pn.x : 0, pn ? pn.y : 0, pn ? pn.w : 1, pn ? pn.h : 1);
      gl.uniform4f(u.uPaneG, pn ? (pn.cols || 2) : 1, pn ? (pn.rows || 3) : 1, pn ? (pn.skew != null ? pn.skew : 0.62) : 0, pn ? (pn.strength != null ? pn.strength : 1) : 0);
      var gw = rgb(cfg.glow || '#fff3d6'); gl.uniform3f(u.uGlow, gw[0], gw[1], gw[2]);
      gl.uniform1f(u.uShadow, light.shadow != null ? light.shadow : 1);
      var seam = cfg.seam || {}, smc = rgb(seam.color || (seam.style === 'bead' ? '#d6a33f' : '#3a2e26'));
      gl.uniform4f(u.uSeamC, smc[0], smc[1], smc[2], seam.width != null ? seam.width : (seam.style === 'bead' ? 3.4 : 1.4));
      gl.uniform1f(u.uSeamStyle, seam.style === 'bead' ? 1 : 0);
      var rc = rgb(cfg.ripple || '#ffd36b'); gl.uniform3f(u.uRipC, rc[0], rc[1], rc[2]);
      gl.uniform1f(u.uCntOn, G.cnt ? 1 : 0);
      if (G.cnt) {
        gl.uniform4f(u.uCnt, G.cnt[0], G.cnt[1], G.cnt[2], G.cnt[3]); gl.uniform4f(u.uCntCell, G.cell[0], G.cell[1], 0, 0);
        gl.uniform2f(u.uAtlas, G.atlas[0], G.atlas[1]); gl.uniform3f(u.uCntInk, cntInk[0], cntInk[1], cntInk[2]);
        gl.uniform1f(u.uCntOff, cntOffset());
      }
    }
    // shown number = copy level + offset. By default the copy that holds the rest view's frame (one level out from
    // the copy at the rest fall) reads counter.start (1), the picture in it 2, and so on inward.
    // The copy whose counter looks biggest at the rest pose reads counter.start (default 1); deeper copies count up.
    var cntOff = null;
    function cntOffset() {
      if (cntCfg.offset != null) return cntCfg.offset;
      if (cntOff === null) {
        var keep = [st.fall, st.wind]; st.fall = restFall; st.wind = restWind;
        var p = D.screenOf(cntEl); st.fall = keep[0]; st.wind = keep[1];
        cntOff = (cntCfg.start != null ? cntCfg.start : 1) - ((p ? p[2] : -1) + Math.floor(restFall + 1e-6));
      }
      return cntOff;
    }
    // friendly surface settings → four vec4 (see the shader's surface() for the packing)
    function packSurface(s) {
      var t = SURF[s.type] != null ? SURF[s.type] : 0, U = G.U, A = [t, 0, 0, 0], B = [0, 0, 0, 0], C = [0, 0, 0, 0], Dd = [0, 0, 0, 0];
      var v = function (k, d) { return s[k] != null ? s[k] : d; };
      if (t === 1) {
        var gc = rgb(v('groutColor', '#7a7770'));
        A = [t, s.size === 'fit' ? 0 : v('size', 9) * U, v('grout', 0.008), v('bevel', 0.05)];
        B = [v('wobble', 0.13), v('tilt', 0.12), v('craze', 0.26), v('chips', 0.2)];
        C = [gc[0], gc[1], gc[2], v('tint', 0.04)]; Dd = [v('gloss', 1), v('warm', 0), 0, 0];
      } else if (t === 2) { A = [t, v('scale', 3) * U, v('rough', 1), v('mottle', 0.05)]; B = [v('gloss', 0.1), 0, 0, 0]; }
      else if (t === 3) { A = [t, v('plank', 6) * U, v('grain', 1), v('dir', 'v') === 'v' ? 1 : 0]; B = [v('gloss', 0.4), v('gap', 0.035), v('tone', 0.08), 0]; }
      else if (t === 4) { A = [t, v('fiber', 1), v('halftone', 0) * U, v('varnish', 0.4)]; }
      else if (t === 5) { A = [t, v('sheen', 1), 0, 0]; }
      else if (t === 6) { A = [t, v('brush', 1), v('gloss', 1), v('dir', 'h') === 'v' ? 1 : 0]; }
      else { B = [v('gloss', 0), 0, 0, 0]; }
      return [A, B, C, Dd];
    }

    // ------------------------------------------------------------ the map (JS twin of the shader)
    var st = { fall: 0, fallGoal: 0, wind: 0, windGoal: 0, settle: false, opening: null, lastInput: -1e9 };
    function alpha() { return [1, -st.wind * G.L / TAU]; }
    function tf() { return st.fall - Math.floor(st.fall); }
    function inPage(x, y) { return x >= -G.F[0] && y >= -G.F[1] && x <= G.W - G.F[0] && y <= G.H - G.F[1]; }
    function inHole(x, y) {
      var ex = x + G.F[0], ey = y + G.F[1], w = G.win;
      if (ex < w[0] || ey < w[1] || ex > w[2] || ey > w[3]) return false;
      if (G.winR <= 0) return true;
      var cx = (w[0] + w[2]) / 2, cy = (w[1] + w[3]) / 2, hx = (w[2] - w[0]) / 2 - G.winR, hy = (w[3] - w[1]) / 2 - G.winR;
      var dx = Math.max(Math.abs(ex - cx) - hx, 0), dy = Math.max(Math.abs(ey - cy) - hy, 0);
      return Math.hypot(dx, dy) <= G.winR;
    }
    // canvas CSS px → { ex, ey (page px), lev, pps (page px per screen px), rel (angle from the cut) }
    function mapPoint(X, Y) {
      var a = alpha(), qx = X - G.F[0], qy = Y - G.F[1];
      var r = Math.max(Math.hypot(qx, qy), 1e-4);
      var rel = ((Math.atan2(qy, qx) - cut) % TAU + TAU) % TAU, th = cut + rel + st.wind * spin;
      var lr = Math.log(r);
      var zx = a[0] * lr - a[1] * th - tf() * G.L, zy = a[0] * th + a[1] * lr;
      var m = Math.exp(zx), wx = m * Math.cos(zy), wy = m * Math.sin(zy), pps = Math.hypot(a[0], a[1]) * m / r, lev = 0, i;
      for (i = 0; i < 4; i++) if (!inPage(wx, wy)) { wx /= G.S; wy /= G.S; pps /= G.S; lev--; }
      for (i = 0; i < 26; i++) { if (inHole(wx, wy)) { wx *= G.S; wy *= G.S; pps *= G.S; lev++; } else break; }
      return { ex: wx + G.F[0], ey: wy + G.F[1], lev: lev, pps: pps, rel: rel };
    }
    D.map = mapPoint;
    // page point (ex, ey) on copy `k` levels in → screen candidates (inverse of the map, every branch of the log)
    function screenCandidates(ex, ey, k) {
      var a = alpha(), n2 = a[0] * a[0] + a[1] * a[1], out = [];
      var sk = Math.pow(G.S, k), wx = (ex - G.F[0]) / sk, wy = (ey - G.F[1]) / sk;
      var zx0 = 0.5 * Math.log(wx * wx + wy * wy) + tf() * G.L, zy0 = Math.atan2(wy, wx);
      for (var m = -3; m <= 3; m++) {
        var zy = zy0 + m * TAU;
        // z = z' / α (complex division), then undo the spin
        var lr = (zx0 * a[0] + zy * a[1]) / n2, th = (zy * a[0] - zx0 * a[1]) / n2 - st.wind * spin;
        var X = G.F[0] + Math.exp(lr) * Math.cos(th), Y = G.F[1] + Math.exp(lr) * Math.sin(th);
        out.push([X, Y]);
      }
      return out;
    }
    // where on screen an element is drawn (its centre), at the copy where it looks biggest and is really visible
    D.screenAt = function (el, lev) {
      var b = HIC.box(page, el), ex = b[0] + b[2] / 2, ey = b[1] + b[3] / 2, best = null;
      for (var k = -3; k <= 8; k++) screenCandidates(ex, ey, k).forEach(function (p) {
        if (p[0] < 2 || p[1] < 2 || p[0] > G.W - 2 || p[1] > G.H - 2) return;
        var f = mapPoint(p[0], p[1]);
        if (f.lev !== lev || Math.abs(f.ex - ex) > 0.75 || Math.abs(f.ey - ey) > 0.75) return;
        if (!best || f.pps < best[3]) best = [p[0], p[1], f.lev, f.pps];
      });
      return best;
    };
    D.screenOf = function (el) {
      var b = HIC.box(page, el), ex = b[0] + b[2] / 2, ey = b[1] + b[3] / 2, best = null;
      for (var k = -3; k <= 8; k++) {
        screenCandidates(ex, ey, k).forEach(function (p) {
          if (p[0] < 2 || p[1] < 2 || p[0] > G.W - 2 || p[1] > G.H - 2) return;
          var f = mapPoint(p[0], p[1]);
          if (Math.abs(f.ex - ex) > 0.75 || Math.abs(f.ey - ey) > 0.75) return;
          if (!best || f.pps < best.pps) best = { x: p[0], y: p[1], pps: f.pps, lev: f.lev };
        });
      }
      return best ? [best.x, best.y, best.lev, 1 / best.pps] : null;
    };

    // ------------------------------------------------------------ uploads: sharp when quiet, smaller while it changes
    var up = { last: 0, quick: 0, needHi: true, timer: 0, n: 0, size: [0, 0], cost: 0 };
    var maxTex = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE));
    var sharp = cfg.sharp != null ? cfg.sharp : 2.2, budget = cfg.budget || 9e6;
    function upload() {
      var now = performance.now(), dt = now - up.last; up.last = now;
      up.quick = dt < Math.max(140, 1.8 * frameMs, 2 * up.cost + 80) ? up.quick + 1 : 0;   // "quick succession" allows for slow frames and slow uploads
      var fast = up.quick >= 2 && !up.needHi;
      var long = Math.max(G.W, G.H) * S.dpr;
      // the outermost copy is magnified up to S× just before it is passed, so the sharp upload is bigger than the screen
      var ss = fast ? Math.min(1, 2200 / long) : Math.min(sharp, maxTex / long, Math.sqrt(budget / (G.W * G.H * S.dpr * S.dpr)));
      ss = Math.max(ss, 0.25);
      var w = Math.round(G.W * S.dpr * ss), h = Math.round(G.H * S.dpr * ss), tex = fast ? texLo : texHi;
      var t0 = performance.now(), r = S.upload(page, tex, w, h);
      up.cost += (performance.now() - t0 - up.cost) * 0.5;
      if (!r) return false;
      texCur = tex; texScale = r.w / G.W; up.n++; dirty = true; up.size = [r.w, r.h]; up.needHi = false;
      clearTimeout(up.timer);
      if (fast) up.timer = setTimeout(function () { up.needHi = true; S.requestPaint(); }, 220);
      return true;
    }

    // ------------------------------------------------------------ drawing
    var rip = { x: 0, y: 0, t0: -1e9 }, clock = 0, frameMs = 16, lastNow = 0, dirty = true;
    function draw(t) {
      if (!texCur) return;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
      prog.use(); var u = prog.u, a = alpha();
      HIC.gl.bind(gl, prog, { uPage: texCur });
      gl.uniform2f(u.uRes, canvas.width, canvas.height); gl.uniform1f(u.uDpr, canvas.width / G.W);
      gl.uniform2f(u.uAlpha, a[0], a[1]); gl.uniform1f(u.uSpin, st.wind * spin);
      gl.uniform1f(u.uTf, tf()); gl.uniform1f(u.uLev0, Math.floor(st.fall + 1e-6));
      gl.uniform1f(u.uWind, st.wind); gl.uniform1f(u.uTexScale, texScale); gl.uniform1f(u.uTime, t % 1000);
      var fr = Math.abs(st.wind - Math.round(st.wind)); gl.uniform1f(u.uSeamOn, Math.min(1, fr * 12));
      var rt = (clock - rip.t0), rd = 1.4;
      if (rt >= 0 && rt < rd) { var k = rt / rd; gl.uniform4f(u.uRip, rip.x, rip.y, (1 - Math.pow(1 - k, 2.2)) * Math.hypot(G.W, G.H) * 0.6, Math.pow(1 - k, 1.4)); }
      else gl.uniform4f(u.uRip, 0, 0, 0, 0);
      HIC.gl.fullscreen(gl);
    }

    // ------------------------------------------------------------ motion: fall, wind, the opening, drift
    var restFall = fallCfg.rest != null ? fallCfg.rest : -0.25, restWind = windCfg.rest != null ? windCfg.rest : 1;
    var openDur = fallCfg.opening != null ? fallCfg.opening : 3.6, drift = fallCfg.drift || 0;
    var hFall = HIC.param('fall'), hWind = HIC.param('wind');
    st.wind = st.windGoal = hWind !== null ? parseFloat(hWind) || 0 : restWind;
    st.fall = st.fallGoal = hFall !== null ? parseFloat(hFall) || 0 : restFall;
    if (HIC.still === null && !HIC.calm && hFall === null && openDur > 0 && HIC.param('nointro') === null) st.opening = { t0: -1 };
    function openPose(k) { st.fall = st.fallGoal = restFall - 1.7 * Math.pow(1 - k, 2.6); }
    if (st.opening) openPose(0);
    function endOpening() { if (st.opening) { st.opening = null; st.fallGoal = restFall; st.settle = true; } }
    function setWindInput(v) { if (!windIn) return; var s = v.toFixed(3); if (windIn.value !== s) { windIn.value = s; fillRail(); } }
    function fillRail() { if (windIn) windIn.style.setProperty('--p', (parseFloat(windIn.value) / WMAX * 100).toFixed(1) + '%'); }
    var shownCopy = null, wasWhole = true;
    function step(t, dt) {
      var moved = false;
      if (st.opening) {
        if (st.opening.t0 < 0) st.opening.t0 = t;
        var k = Math.min(1, (t - st.opening.t0) / openDur);
        openPose(k); moved = true;
        if (k >= 1) { st.opening = null; st.fall = st.fallGoal = restFall; }
      } else {
        if (drift && !HIC.calm && HIC.still === null && clock - st.lastInput > 4 && document.activeElement && !document.activeElement.isContentEditable && document.activeElement.tagName !== 'INPUT') st.fallGoal += drift * dt;
        if (Math.abs(st.fallGoal - st.fall) > 1e-4) {
          st.fall += (st.fallGoal - st.fall) * (1 - Math.exp(-dt / (st.settle ? 0.32 : 0.12)));
          if (Math.abs(st.fallGoal - st.fall) <= 1e-4) st.fall = st.fallGoal;
          moved = true;
        }
        if (Math.abs(st.windGoal - st.wind) > 1e-4) {
          st.wind += (st.windGoal - st.wind) * (1 - Math.exp(-dt / (st.settle ? 0.32 : 0.07)));
          if (Math.abs(st.windGoal - st.wind) <= 1e-4) st.wind = st.windGoal;
          if (st.settle) setWindInput(st.wind);
          moved = true;
        }
        if (!moved) st.settle = false;
      }
      var copy = Math.floor(st.fall + 1e-6);
      if (copy !== shownCopy) {
        if (shownCopy !== null && !st.opening) snd('pass', copy > shownCopy ? 1 : -1);
        shownCopy = copy;
        if (cntEl) cntEl.setAttribute('aria-label', (cntCfg.label || 'Copy number') + ' ' + (copy - 1 + cntOffset()));
      }
      var whole = Math.abs(st.wind - Math.round(st.wind)) < 1e-3;
      if (whole && !wasWhole) snd('heal');
      wasWhole = whole;
      return moved;
    }

    // ------------------------------------------------------------ hit testing: place the page under the pointer
    var ptr = { x: 0, y: 0, inside: false, down: false, lev: 0, touchFall: null };
    var ready = false;
    function place() {
      if (!ready || !ptr.inside || ptr.down) return;
      var q = S.placeLocal(page, ptr.x, ptr.y, function (x, y) { var p = mapPoint(x, y); return [p.ex, p.ey]; });
      if (q) ptr.lev = mapPoint(ptr.x, ptr.y).lev;
    }
    function at(ev) { var b = canvas.getBoundingClientRect(); ptr.x = ev.clientX - b.left; ptr.y = ev.clientY - b.top; ptr.inside = true; }
    function poke() { st.lastInput = clock; }
    root.addEventListener('pointermove', function (ev) {
      poke();
      if (ptr.touchFall) {   // a finger dragged on the page (not on a control) falls in, like a wheel
        var dy = ev.clientY - ptr.touchFall.y; ptr.touchFall.y = ev.clientY;
        st.fallGoal += -dy * 0.006; st.settle = false; hideHint(); return;
      }
      if (ptr.down) return;
      at(ev); place();
    }, true);
    root.addEventListener('pointerdown', function (ev) {
      poke(); endOpening(); stopIntro(); wake();
      if (!ptr.down) at(ev);
      ptr.down = true;
      var tg = ev.target;
      if (ev.pointerType === 'touch' && !(tg && tg.closest && tg.closest('input, button, a, label, [contenteditable], select, textarea'))) ptr.touchFall = { y: ev.clientY };
    }, true);
    function release(ev) { ptr.down = false; ptr.touchFall = null; if (ev && ev.clientX != null) at(ev); place(); }
    root.addEventListener('pointerup', release, true);
    root.addEventListener('pointercancel', release, true);
    root.addEventListener('blur', function () { ptr.down = false; ptr.touchFall = null; });
    document.documentElement.addEventListener('pointerleave', function () { if (!ptr.down) ptr.inside = false; });
    root.addEventListener('wheel', function (ev) {
      ev.preventDefault(); poke(); endOpening(); stopIntro(); hideHint();
      var dy = ev.deltaY * (ev.deltaMode === 1 ? 32 : ev.deltaMode === 2 ? 600 : 1);
      if (ev.ctrlKey) dy *= 4;
      st.settle = false;
      st.fallGoal += Math.max(-0.5, Math.min(0.5, dy * (fallCfg.wheel || 0.0012)));
    }, { passive: false, capture: true });
    root.addEventListener('keydown', function (ev) {
      poke(); endOpening(); stopIntro();
      var el = document.activeElement;
      if (el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
      var d = ev.key === 'ArrowDown' || ev.key === 'PageDown' ? 1 : ev.key === 'ArrowUp' || ev.key === 'PageUp' ? -1 : 0;
      if (d) { ev.preventDefault(); st.settle = false; hideHint(); st.fallGoal = Math.round((st.fallGoal + d * (ev.key.indexOf('Page') === 0 ? 1 : 0.25)) * 4) / 4; }
    });
    if (windIn) {
      windIn.min = '0'; windIn.max = String(WMAX); windIn.step = '0.001'; setWindInput(st.wind);
      windIn.addEventListener('input', function () {
        var v = parseFloat(windIn.value); fillRail(); st.settle = false; endOpening(); poke();
        st.windGoal = Math.abs(v - Math.round(v)) < 0.035 ? Math.round(v) : v;   // whole turns are sticky
      });
      windIn.addEventListener('change', function () { if (st.windGoal === Math.round(st.windGoal)) setWindInput(st.windGoal); });
    }
    var hintEl = cfg.hint ? q$(cfg.hint, page) : null;
    function hideHint() { if (hintEl && !hintEl.hidden && !cfg.keepHint) { hintEl.hidden = true; S.requestPaint(); } }

    // ------------------------------------------------------------ sound
    var SND = null, soundOn = false, toggle = cfg.soundToggle ? q$(cfg.soundToggle, page) : null;
    if (cfg.sound && root.DrosteSound) SND = root.DrosteSound.create(cfg.sound);
    function wake() { if (SND && soundOn) try { SND.wake(); } catch (e) {} }
    function snd(name, arg) { if (SND && soundOn) try { SND[name](arg); } catch (e) {} }
    function showToggle() {
      if (!toggle) return;
      toggle.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
      var lab = toggle.querySelector('[data-label]') || toggle;
      lab.textContent = soundOn ? (toggle.getAttribute('data-on') || 'Sound on') : (toggle.getAttribute('data-off') || 'Sound off');
    }
    if (toggle) {
      if (!SND) toggle.hidden = true;
      toggle.addEventListener('click', function () { soundOn = !soundOn; if (soundOn) { wake(); snd('tap', { note: 4, level: 0, pan: 0 }); } showToggle(); D.tap(toggle, null, true); });
      showToggle();
    }

    // ------------------------------------------------------------ taps: a ring across every copy, a note per depth
    D.tap = function (el, note, quiet) {
      var b = Array.isArray(el) ? [el[0], el[1], 0, 0] : HIC.box(page, el);
      rip.x = b[0] + b[2] / 2; rip.y = b[1] + b[3] / 2; rip.t0 = clock;
      if (!quiet) snd('tap', { note: note != null ? note : Math.round(rip.x / G.U + rip.y / G.U) % 9, level: Math.max(0, Math.min(6, ptr.lev | 0)), pan: Math.max(-0.8, Math.min(0.8, (ptr.x / G.W - 0.5) * 1.6)) });
    };
    D.level = function () { return ptr.lev; };

    // ------------------------------------------------------------ an intro the page can run (typed text); any input stops it
    var intro = 0;
    function stopIntro() { if (intro) { clearTimeout(intro); intro = 0; } }
    D.intro = HIC.still === null && !HIC.calm && HIC.param('nointro') === null;
    D.typeInto = function (el, text, done) {
      if (!D.intro) { el.textContent = text; if (done) done(); return; }
      var i = 0;
      (function next() {
        if (i > text.length) { intro = 0; if (done) done(); return; }
        el.textContent = text.slice(0, i++);
        intro = setTimeout(next, 38 + (i * 37 % 29));
      })();
    };

    // ------------------------------------------------------------ test and still hooks
    D.state = function () { return { fall: st.fall, wind: st.wind, S: G.S, F: G.F.slice(), win: G.win.slice(), U: G.U, uploads: up.n, tex: up.size.slice(), lev: ptr.lev, mode: S.mode, opening: !!st.opening, sound: soundOn }; };
    D.pose = function (o) {
      endOpening(); st.settle = false; st.opening = null; poke();
      if (o.fall != null) st.fall = st.fallGoal = o.fall;
      if (o.wind != null) { st.wind = st.windGoal = o.wind; setWindInput(o.wind); }
      return new Promise(function (res) { requestAnimationFrame(function () { requestAnimationFrame(function () { res(D.state()); }); }); });
    };
    D.goal = function (o) { if (o.fall != null) st.fallGoal = o.fall; if (o.wind != null) st.windGoal = o.wind; };
    D.stage = S;

    // ------------------------------------------------------------ start
    layout(); page.classList.add('droste-live'); setStatic();
    root.addEventListener('resize', function () { layout(); cntOff = null; setStatic(); up.needHi = true; dirty = true; S.requestPaint(); });
    S.onPaint(function () {
      if (!upload()) return;
      if (!ready) {
        ready = true;
        S.probe(page, q$(cfg.probe || '[data-hic-edit]', page) || page.firstElementChild).then(function (mode) {
          S.place(page, null);   // probe() leaves the page at its probe offset: hide it until the pointer places it
          place();
          root.__hic.screenOf = function (el) { var p = D.screenOf(el); return p ? [p[0], p[1]] : null; };
          S.ready({ mode: mode, S: G.S });
          if (cfg.onReady) cfg.onReady(D);
        });
      }
    });
    S.loop(function (t, dt) {
      var now = performance.now(); if (lastNow) frameMs += (Math.min(1000, now - lastNow) - frameMs) * 0.1; lastNow = now;
      clock = t;
      var moved = step(t, dt);
      if (ready && ptr.inside && !ptr.down && moved) place();
      // draw only when something changed: a new upload, a move of fall or wind, a ripple still ringing, a resize
      if (moved || dirty || clock - rip.t0 < 1.5) { dirty = false; draw(t); }
    });
    root.__droste = D;
    return D;
  };

  root.Droste = Droste;
})(typeof window !== 'undefined' ? window : globalThis);

/* cube.js — the app-cube engine.
 *
 * Six ordinary DOM sections become the six faces of a glossy 3×3 twisty cube standing in a small photo studio, drawn in
 * WebGL2 through HTML-in-Canvas (lib/hic.js). Every face stays a working web page. The tile under the pointer is placed for
 * hit testing with its own projective matrix (a homography from the tile's square of the app to the tile's quad on screen),
 * so clicks, typing, carets, selections and slider drags land on the real element. That holds after the layers have been
 * twisted and the apps lie scattered across the cube as tiles: each tile still maps back to its own ninth of its own app.
 *
 *   <canvas id="stage" layoutsubtree content="drawable">
 *     <section class="face" drawable> …one app… </section>   × 6, each FACE × FACE CSS px, position:absolute; left:0; top:0
 *   </canvas>
 *   <script src="lib/hic.js"></script><script src="lib/cube.js"></script>
 *   <script> const cube = AppCube.create(canvas, { faces: ['#a', '#b', '#c', '#d', '#e', '#f'], body: {…}, studio: {…} }); </script>
 *
 * Face order: front (+Z), right (+X), top (+Y), back (−Z), left (−X), bottom (−Y). The home view shows front, right and top.
 * Each face is cut into nine tiles of FACE/3 px (240 px for a 720 px face). Design the apps on that grid: a control sits
 * inside one tile; text may run across tiles.
 *
 * Gestures on the canvas
 *   hover a tile          that tile's app is placed under the pointer (it is the only hit-testable face)
 *   click / type          the real element gets it; focus stays in a text field through twists (mousedown is kept off the caret)
 *   drag a tile           turns its layer (mode 'auto': unless the press is on text, a text field, a slider or [data-drag];
 *                         Shift+drag always turns; mode 'twist' always turns; mode 'write' never turns)
 *   drag the backdrop     orbits the cube, with inertia; double-click the backdrop to go home
 * Wired automatically inside the faces: [data-cube="scramble|undo|solve|home|sound"], [data-cube="mode"][data-mode="auto|write|twist"]
 * Events on window: 'cubechange' {solved, moves, log, last, user}, 'cubeuse' {face, afterTwist}
 *
 * The API returned by create() is listed at the end of the file and in references/ENGINE.md.
 * Rules kept here (references/HIC.md): uploads happen only on paint, the page falls back to plain HTML without the feature,
 * #still=<s> freezes time, #calm drops idle motion, scrambles are seeded, sound is synthesised and starts at a gesture.
 */
(function (root) {
  'use strict';
  var HIC = root.HIC;
  var PI = Math.PI;
  var AppCube = { version: '1.0.0' };

  // ================================================================== defaults (every one can be overridden in create())
  var DEFAULTS = {
    faces: null,                 // six selectors or elements: front, right, top, back, left, bottom
    face: 720,                   // CSS px of each face section (square)
    texScale: 1,                 // texture resolution × face × min(2, dpr); lower it for slow machines
    mode: 'auto',                // 'auto' | 'write' | 'twist'
    view: {
      yaw: -0.62, pitch: 0.44,   // home orientation (radians): front + right + top visible
      fov: 26, distance: 14.2, height: 1.9, lookY: -0.25,
      fitAspect: 0.92,           // below this aspect (portrait) the camera backs off so the cube still fits
      offset: [0, 0], midOffset: [0.1, -0.04], phoneOffset: [0, -0.06]   // NDC shift of the picture (to clear a HUD): ≥ 900 px, 640–900 px, < 640 px
    },
    intro: { yaw: -2.5, pitch: 0.16, dur: 1.15 },           // the cube swings in from here on load
    idle: { sway: 0.075, speed: 0.42, resume: 7 },          // turntable sway while nobody touches it (radians, Hz, s)
    body: { color: '#0c0c11', gloss: 1.0, roughness: 0.1, metal: 0.0, radius: 0.085, groove: 0.55 },
    tile: { size: 0.935, radius: 0.11, glass: 0.18, rim: 0.55, bevel: 0.75, emit: 0.86, light: 0.22, hot: '#ffffff' },
    studio: {
      ambient: ['#020203', '#0c0d14'],
      lights: [   // softboxes reflected by the cube: dir (world, camera looks down −Z), size (half extents), colour, power, soft
        { dir: [0.38, 0.80, 0.46], size: [0.58, 0.33], color: '#fff5e8', power: 2.5, soft: 0.05 },
        { dir: [-0.90, 0.20, 0.38], size: [0.20, 0.85], color: '#a3bcff', power: 1.1, soft: 0.08 },
        { dir: [0.66, 0.14, -0.74], size: [0.20, 0.70], color: '#ffcfa3', power: 0.8, soft: 0.10 },
        { dir: [-0.12, 0.66, -0.74], size: [0.90, 0.15], color: '#dfe7ff', power: 0.5, soft: 0.06 },
        { dir: [-0.46, 0.33, 0.82], size: [0.07, 1.30], color: '#f3f5ff', power: 1.9, soft: 0.05 }
      ],
      key: [0.38, 0.80, 0.46]    // the direction that lights tiles and the body diffusely
    },
    backdrop: { center: '#1b2244', edge: '#05060b', glowA: { at: [-0.62, -0.18], color: '#3a0c2a', size: 3.0 }, glowB: { at: [0.66, 0.26], color: '#0b2246', size: 2.6 }, centre: [0.5, 0.57] },
    floor: { y: -2.75, reflect: 0.42, blur: 0.55, shadow: 0.92, tint: '#0d0f1a', fade: [9, 30] },
    sweep: { color: '#fff3df', power: 0.55, dur: 0.95 },
    turn: { flick: 2.4, freq: 4.2, zeta: 0.52, dur: 0.16, scramble: 20, scrambleDur: 0.085, seed: 11, tickDeg: 18, recoil: 0.035 },
    sound: { on: true, volume: 0.55, snap: { freq: 150, body: 0.09, click: 2600 }, tick: { freq: 3400, gain: 0.12 }, chime: [72, 76, 79, 84], chimeWave: 'sine' },
    onChange: null,              // fn({solved, moves, log, last, user})
    onReady: null                // fn(api)
  };

  // ================================================================== small maths
  function merge(a, b) {
    var o = {}, k;
    for (k in a) o[k] = a[k];
    for (k in b) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && !(b[k] instanceof Element) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) o[k] = merge(a[k], b[k]);
      else if (b[k] !== undefined) o[k] = b[k];
    }
    return o;
  }
  function lin(hex) {   // '#rrggbb' → linear rgb
    var h = String(hex).replace('#', ''); if (h.length === 3) h = h.replace(/(.)/g, '$1$1');
    var n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map(function (v) { return Math.pow(v, 2.2); });
  }
  var sub = function (a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; };
  var add = function (a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; };
  var scl = function (a, s) { return [a[0] * s, a[1] * s, a[2] * s]; };
  var dot = function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; };
  var cross = function (a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; };
  var norm = function (a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  // 3×3 row-major
  var I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  function m3mul(a, b) { var o = new Array(9); for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]; return o; }
  function m3v(m, v) { return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]]; }
  function axisRot(a, t) {   // right-handed rotation about axis a (0 x, 1 y, 2 z)
    var c = Math.cos(t), s = Math.sin(t);
    if (a === 0) return [1, 0, 0, 0, c, -s, 0, s, c];
    if (a === 1) return [c, 0, s, 0, 1, 0, -s, 0, c];
    return [c, -s, 0, s, c, 0, 0, 0, 1];
  }
  var round3 = function (m) { return m.map(function (v) { return Math.round(v) || 0; }); };
  // quaternions [x, y, z, w]
  function qmul(a, b) {
    return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
      a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  }
  function qaxis(ax, t) { var s = Math.sin(t / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(t / 2)]; }
  function qnorm(q) { var l = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]; }
  function qslerp(a, b, t) {
    var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = b.map(function (x) { return -x; }); d = -d; }
    if (d > 0.9995) return qnorm(a.map(function (x, i) { return x + (b[i] - x) * t; }));
    var th = Math.acos(d), s = Math.sin(th), p = Math.sin((1 - t) * th) / s, q = Math.sin(t * th) / s;
    return a.map(function (x, i) { return x * p + b[i] * q; });
  }
  function qmat(q) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    return [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
      2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
      2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
  }
  function qfromTo(a, b) {   // the shortest rotation taking unit vector a to unit vector b
    var ax = cross(a, b), s = Math.hypot(ax[0], ax[1], ax[2]), ang = Math.atan2(s, dot(a, b));
    return s < 1e-6 ? (ang < 1 ? [0, 0, 0, 1] : qaxis([0, 1, 0], PI)) : qaxis(norm(ax), ang);
  }
  var viewQ = function (yaw, pitch) { return qmul(qaxis([1, 0, 0], pitch), qaxis([0, 1, 0], yaw)); };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var easeInOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var backOut = function (t) { var k = 1.25; return 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2); };   // lands with a small overshoot

  // Projective map that takes the unit square (0,0) (1,0) (1,1) (0,1) to the quad p0..p3 (closed form, Heckbert 1989).
  // Returned as a 3×3 row-major matrix H with [X Y W] = H · [u v 1].
  function squareToQuad(p) {
    var x0 = p[0][0], y0 = p[0][1], x1 = p[1][0], y1 = p[1][1], x2 = p[2][0], y2 = p[2][1], x3 = p[3][0], y3 = p[3][1];
    var sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3, g = 0, h = 0;
    if (Math.abs(sx) > 1e-9 || Math.abs(sy) > 1e-9) {
      var dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, den = dx1 * dy2 - dx2 * dy1;
      if (Math.abs(den) < 1e-12) return null;
      g = (sx * dy2 - dx2 * sy) / den; h = (dx1 * sy - sx * dy1) / den;
    }
    return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
  }
  function happly(H, x, y) { var w = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; }
  function hinv(m) {
    var a = m[0], b = m[1], c = m[2], d = m[3], e = m[4], f = m[5], g = m[6], h = m[7], i = m[8];
    var A = e * i - f * h, B = f * g - d * i, C = d * h - e * g, det = a * A + b * B + c * C;
    if (Math.abs(det) < 1e-12) return null;
    return [A / det, (c * h - b * i) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, (c * d - a * f) / det, C / det, (b * g - a * h) / det, (a * e - b * d) / det];
  }
  // 3×3 homography → the 16 numbers of a CSS matrix3d (column-major), mapping element (x, y, 0) to canvas px
  function cssOf(H) { return [H[0], H[3], 0, H[6], H[1], H[4], 0, H[7], 0, 0, 1, 0, H[2], H[5], 0, H[8]]; }

  // ================================================================== the cube as data: 26 cubies, 54 stickers, moves
  // Faces: n = outward normal, u = the app's +x (right), v = the app's −y (up). u × v = n for every face.
  var FACE_DIRS = [
    { name: 'front', n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
    { name: 'right', n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
    { name: 'top', n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
    { name: 'back', n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
    { name: 'left', n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
    { name: 'bottom', n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] }
  ];
  // Standard notation: letter → [axis, layer, quarter turns (right-handed about +axis)] for the plain (clockwise) move.
  var LETTERS = { R: [0, 1, 3], L: [0, -1, 1], M: [0, 0, 1], U: [1, 1, 3], D: [1, -1, 1], E: [1, 0, 1], F: [2, 1, 3], B: [2, -1, 1], S: [2, 0, 3] };
  function moveName(m) {
    var q = ((m.q % 4) + 4) % 4; if (!q) return '';
    for (var k in LETTERS) {
      var L = LETTERS[k];
      if (L[0] === m.a && L[1] === m.l) return k + (q === 2 ? '2' : q === L[2] ? '' : '′');
    }
    return '';
  }
  function parseMoves(s) {
    var out = [], re = /([RLMUDEFBS])(2|'|′)?/g, x;
    while ((x = re.exec(String(s)))) { var L = LETTERS[x[1]], q = x[2] === '2' ? 2 : x[2] ? (4 - L[2]) % 4 : L[2]; out.push({ a: L[0], l: L[1], q: q }); }
    return out;
  }

  function Model() {
    var cubies = [], stickers = [];
    for (var x = -1; x <= 1; x++) for (var y = -1; y <= 1; y++) for (var z = -1; z <= 1; z++) {
      if (x || y || z) cubies.push({ home: [x, y, z], pos: [x, y, z], rot: I3.slice() });
    }
    var find = function (p) { return cubies.filter(function (c) { return c.home[0] === p[0] && c.home[1] === p[1] && c.home[2] === p[2]; })[0]; };
    FACE_DIRS.forEach(function (d, f) {
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) {
        var h = [0, 1, 2].map(function (k) { return d.n[k] + (c - 1) * d.u[k] + (1 - r) * d.v[k]; });
        stickers.push({ i: f * 9 + r * 3 + c, f: f, r: r, c: c, cubie: find(h), n: d.n, u: d.u, v: d.v, scr: [[0, 0], [0, 0], [0, 0], [0, 0]], depth: 0, facing: false, N: [0, 0, 1], C: [0, 0, 0] });
      }
    });
    return {
      cubies: cubies, stickers: stickers,
      apply: function (a, l, q) {
        q = ((q % 4) + 4) % 4; if (!q) return;
        var R = round3(axisRot(a, q * PI / 2));
        cubies.forEach(function (cb) { if (cb.pos[a] === l) { cb.pos = round3(m3v(R, cb.pos)); cb.rot = round3(m3mul(R, cb.rot)); } });
      },
      solved: function () {
        var R = cubies[0].rot;
        return cubies.every(function (cb) {
          if (!cb.rot.every(function (v, i) { return v === R[i]; })) return false;
          var p = m3v(R, cb.home); return p[0] === cb.pos[0] && p[1] === cb.pos[1] && p[2] === cb.pos[2];
        });
      },
      // where sticker (f, r, c) sits now: the face slot it occupies and how many quarter turns its tile is rotated
      slot: function (s) {
        var cb = s.cubie, n = round3(m3v(cb.rot, s.n)), v = round3(m3v(cb.rot, s.v));
        var F = FACE_DIRS.findIndex(function (d) { return d.n[0] === n[0] && d.n[1] === n[1] && d.n[2] === n[2]; }), d = FACE_DIRS[F];
        var col = dot(cb.pos, d.u) + 1, row = 1 - dot(cb.pos, d.v);
        var turn = dot(v, d.v) === 1 ? 0 : dot(v, d.u) === 1 ? 1 : dot(v, d.v) === -1 ? 2 : 3;
        return { face: F, row: row, col: col, turn: turn };
      }
    };
  }

  // ================================================================== geometry: a rounded cubie
  function roundedBox(h, r) {
    var g = [-h, -h + r * 0.3, -h + r * 0.7, -h + r, h - r, h - r * 0.7, h - r * 0.3, h], n = g.length, lim = h - r;
    var pos = [], nor = [], idx = [];
    FACE_DIRS.forEach(function (d) {
      var base = pos.length / 3;
      for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
        var p = [0, 1, 2].map(function (k) { return g[i] * d.u[k] + g[j] * d.v[k] + h * d.n[k]; });
        var q = p.map(function (v) { return Math.max(-lim, Math.min(lim, v)); }), nn = norm(sub(p, q));
        pos.push(q[0] + nn[0] * r, q[1] + nn[1] * r, q[2] + nn[2] * r); nor.push(nn[0], nn[1], nn[2]);
      }
      for (var jj = 0; jj < n - 1; jj++) for (var ii = 0; ii < n - 1; ii++) { var a = base + jj * n + ii; idx.push(a, a + 1, a + n + 1, a, a + n + 1, a + n); }
    });
    return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx) };
  }

  // ================================================================== shaders
  var GLSL_COMMON = [
    // NL (the number of softboxes) is fixed when the shader is compiled; each box's plane basis comes from the CPU
    'uniform vec4 uLd[NL]; uniform vec4 uLs[NL]; uniform vec3 uLc[NL], uLx[NL], uLy[NL]; uniform vec3 uAmbLo, uAmbHi;',
    // a rectangular softbox seen in direction d (gnomonic projection onto the plane facing the box)
    'float softbox(vec3 d, int i, float blur){',
    '  float z = dot(d, uLd[i].xyz); if (z <= 0.) return 0.;',
    '  vec2 q = abs(vec2(dot(d, uLx[i]), dot(d, uLy[i])) / z) - uLs[i].xy;',
    '  float e = length(max(q, 0.)) + min(max(q.x, q.y), 0.), s = uLs[i].z + blur;',
    '  return 1. - smoothstep(-s, s, e);',
    '}',
    'vec3 studio(vec3 d, float blur){',
    '  vec3 c = mix(uAmbLo, uAmbHi, smoothstep(-.5, .9, d.y));',
    '  for (int i = 0; i < NL; i++) c += uLc[i] * uLd[i].w * softbox(d, i, blur);',
    '  return c;',
    '}',
    'uniform vec3 uBgC, uBgE, uGlA, uGlB; uniform vec4 uGlAp, uGlBp; uniform vec2 uBgO;',
    'vec3 backdrop(vec2 uv, float asp){',
    '  vec2 p = (uv - uBgO) * vec2(asp, 1.);',
    '  vec3 c = mix(uBgC, uBgE, smoothstep(0., .95, length(p)));',
    '  vec2 a = p - uGlAp.xy, b = p - uGlBp.xy;',
    '  return c + uGlA * exp(-dot(a, a) * uGlAp.z) + uGlB * exp(-dot(b, b) * uGlBp.z);',
    '}',
    // linear up to .76, then a soft shoulder that never clips; then sRGB-ish gamma
    'vec3 toDisplay(vec3 c){ c = max(c, 0.); vec3 k = vec3(.76); vec3 s = k + (1. - k) * (1. - exp(-(c - k) / (1. - k))); c = mix(c, s, step(k, c)); return pow(clamp(c, 0., 1.), vec3(1. / 2.2)); }',
    'float grain(vec2 p){ return (fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) - .5) / 255.; }'
  ].join('\n');

  var VS_BODY = [
    '#version 300 es',
    'in vec3 aPos; in vec3 aNor; uniform mat4 uVP, uModel; out vec3 vW, vN, vL;',
    'void main(){ vec4 w = uModel * vec4(aPos, 1.); vW = w.xyz; vL = aPos; vN = mat3(uModel) * aNor; gl_Position = uVP * w; }'
  ].join('\n');
  var FS_BODY = [
    '#version 300 es', 'precision highp float;', GLSL_COMMON,
    'in vec3 vW, vN, vL; uniform vec3 uEye, uAlb, uKey; uniform float uGloss, uRough, uMetal, uHalf, uGroove, uFloorY, uMirror; out vec4 o;',
    'void main(){',
    '  vec3 N = normalize(vN), V = normalize(uEye - vW), R = reflect(-V, N);',
    '  float ndv = clamp(dot(N, V), 0., 1.);',
    '  vec3 F0 = mix(vec3(.04), uAlb, uMetal), F = F0 + (1. - F0) * pow(1. - ndv, 5.);',
    // the grooves between cubies: darker where two local coordinates are near the cubie's edge
    '  vec3 a = abs(vL); float mid = a.x + a.y + a.z - max(a.x, max(a.y, a.z)) - min(a.x, min(a.y, a.z));',
    '  float ao = 1. - uGroove * smoothstep(uHalf - .1, uHalf - .004, mid);',
    '  vec3 irr = vec3(max(dot(N, uKey), 0.)) * .6 + mix(uAmbLo, uAmbHi, N.y * .5 + .5) * 3. + .04;',
    '  vec3 col = uAlb * (1. - uMetal) * irr;',
    '  col += studio(R, uRough) * F * uGloss;',
    '  col *= ao;',
    '  col *= mix(1., .55, smoothstep(.0, -.9, N.y));',      // the floor side is in shade
    '  float fade = uMirror > .5 ? exp(-(uFloorY - vW.y) * -1.6) : 1.;',
    '  o = vec4(toDisplay(col) * fade + grain(gl_FragCoord.xy), 1.);',
    '}'
  ].join('\n');

  var VS_TILE = [
    '#version 300 es',
    'in vec3 aPos; in vec3 aNor; in vec2 aUV; in vec2 aQ; in vec4 aT; uniform mat4 uVP; out vec3 vW, vN, vT; out vec2 vUV, vQ; flat out float vId;',
    'void main(){ vW = aPos; vN = aNor; vUV = aUV; vQ = aQ; vT = aT.xyz; vId = aT.w; gl_Position = uVP * vec4(aPos, 1.); }'
  ].join('\n');
  var FS_TILE = [
    '#version 300 es', 'precision highp float;', GLSL_COMMON,
    'in vec3 vW, vN, vT; in vec2 vUV, vQ; flat in float vId; uniform sampler2D uTex; uniform vec3 uEye, uKey, uHotC, uSwC, uSwD;',
    'uniform float uRad, uGlass, uRim, uBevel, uEmit, uLight, uHot, uSweep, uSwP, uFloorY, uMirror; out vec4 o;',
    'void main(){',
    '  vec2 q = abs(vQ) - (1. - uRad);',
    '  float sd = length(max(q, 0.)) + min(max(q.x, q.y), 0.) - uRad;',   // rounded square, 0 at the edge, < 0 inside
    '  float aa = max(fwidth(sd), 1e-4), a = 1. - smoothstep(-aa, aa * .5, sd);',
    '  if (a < .003) discard;',
    '  vec3 t = pow(texture(uTex, vUV).rgb, vec3(2.2));',
    // a slab of glass over each tile: flat in the middle, rolling off at the rim
    '  vec2 g = q.x > 0. && q.y > 0. ? normalize(q) : (q.x > q.y ? vec2(1., 0.) : vec2(0., 1.));',
    '  g *= sign(vQ); float roll = smoothstep(-.17, 0., sd);',
    '  vec3 N0 = normalize(vN), T = normalize(vT), B = cross(N0, T);',
    '  vec3 N = normalize(N0 + (T * g.x + B * g.y) * roll * uBevel);',
    '  vec3 V = normalize(uEye - vW), R = reflect(-V, N);',
    '  float ndv = clamp(dot(N, V), 0., 1.), F = .04 + .96 * pow(1. - ndv, 5.);',
    '  float key = max(dot(N0, uKey), 0.);',
    '  vec3 col = t * (uEmit + uLight * key);',
    '  col *= 1. - .3 * smoothstep(-.07, 0., sd);',                                   // the screen sinks a little at its edge
    '  vec3 env = studio(R, .03);',
    '  col += env * min(F, uGlass) * mix(1., .5, smoothstep(.55, 1., 1. - ndv));',
    '  float rim = smoothstep(-.05, -.022, sd) * smoothstep(0., -.02, sd);',
    '  col += env * rim * uRim * (.2 + .6 * F) + vec3(.6) * rim * uRim * .06;',
    '  if (abs(vId - uHot) < .5) col += uHotC * (rim * .9 + smoothstep(-.12, 0., sd) * .05);',
    '  if (uSweep > 0.) { float w = dot(vW, uSwD) - mix(-4.2, 4.2, uSweep); col += uSwC * exp(-w * w * 2.4) * uSwP; }',
    '  float fade = uMirror > .5 ? exp(-(uFloorY - vW.y) * -1.6) : 1.;',
    '  o = vec4((toDisplay(col) * fade + grain(gl_FragCoord.xy)) * a, a);',
    '}'
  ].join('\n');

  var FS_BACK = [
    '#version 300 es', 'precision highp float;', GLSL_COMMON,
    'in vec2 vUv; uniform float uAsp; uniform sampler2D uRefl; out vec4 o;',
    'void main(){',
    '  vec2 p = (vUv - uBgO) * vec2(uAsp, 1.);',
    '  vec3 spill = textureLod(uRefl, vec2(.5, .35), 9.).rgb;',              // the cube's own colour, glowing on the wall
    '  vec3 c = backdrop(vUv, uAsp) + spill * spill * 1.6 * exp(-dot(p, p) * 3.5);',
    '  o = vec4(toDisplay(c) + grain(gl_FragCoord.xy) * 3., 1.);',
    '}'
  ].join('\n');
  var VS_FLOOR = [
    '#version 300 es',
    'in vec2 aPos; uniform mat4 uVP; uniform float uY; out vec3 vW;',
    'void main(){ vW = vec3(aPos.x * 60., uY, aPos.y * 60.); gl_Position = uVP * vec4(vW, 1.); }'
  ].join('\n');
  var FS_FLOOR = [
    '#version 300 es', 'precision highp float;', GLSL_COMMON,
    'in vec3 vW; uniform sampler2D uRefl; uniform vec2 uRes, uFade, uLow; uniform vec3 uEye, uTint; uniform float uAsp, uRefK, uBlur, uShadow, uLift; out vec4 o;',
    'vec3 tap(vec2 uv, float l){ return pow(textureLod(uRefl, uv, l).rgb, vec3(2.2)); }',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / uRes;',
    '  float d = length(vW.xz), dl = length(vW.xz - uLow);',
    '  float lod = clamp(d * uBlur, 0., 5.5); vec2 px = exp2(lod) / uRes;',
    '  vec3 refl = (tap(uv, lod) * 2. + tap(uv + px * vec2(1.2, .5), lod + .5) + tap(uv - px * vec2(1.2, .5), lod + .5)) * .25;',
    '  vec3 bg = pow(backdrop(uv, uAsp), vec3(1.));',
    '  vec3 V = normalize(uEye - vW); float F = .05 + .95 * pow(1. - abs(V.y), 5.);',
    '  vec3 col = bg * .8 + uTint * exp(-d * d * .03);',
    '  float sh = exp(-d * d / (3.6 + uLift * 2.)) * .75 + exp(-dl * dl * 2.2) * .5;',  // a broad soft shadow and a dark core at the contact
    '  col *= 1. - uShadow * clamp(sh, 0., 1.) / (1. + uLift * 1.5);',
    '  col += refl * uRefK * (.55 + .45 * F);',
    '  float far = length(vW.xz - uEye.xz);',
    '  col = mix(col, bg, smoothstep(uFade.x, uFade.y, far));',
    '  o = vec4(toDisplay(col) + grain(gl_FragCoord.xy) * 3., 1.);',
    '}'
  ].join('\n');

  // ================================================================== sound: synthesised, started by a gesture
  function Sound(cfg) {
    var ctx = null, out = null, on = !!cfg.on, unlocked = false, buttons = [];
    function ensure() {
      if (ctx || !on || !unlocked) return ctx;
      var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return null;
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(ctx.destination);
      out = ctx.createGain(); out.gain.value = cfg.volume; out.connect(comp);
      return ctx;
    }
    function noise(dur) {
      var n = Math.max(1, Math.round(ctx.sampleRate * dur)), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 12345;
      for (var i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = (s / 0x3fffffff - 1) * (1 - i / n); }
      var src = ctx.createBufferSource(); src.buffer = b; return src;
    }
    function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
    var api = {
      get on() { return on; },
      get running() { return !!ctx; },
      unlock: function () { unlocked = true; if (on) { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); } },
      set: function (v) { on = !!v; if (on) api.unlock(); else if (ctx) { ctx.close(); ctx = null; } buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(on)); }); },
      toggle: function () { api.set(!on); return on; },
      bind: function (b) { buttons.push(b); b.setAttribute('aria-pressed', String(on)); },
      // a tone for the apps: tone(hz, seconds, {type, gain, attack, at, glide})
      tone: function (hz, dur, o) {
        if (!ensure()) return; o = o || {};
        var t = ctx.currentTime + (o.at || 0), osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(hz, t); if (o.glide) osc.frequency.exponentialRampToValueAtTime(o.glide, t + dur);
        osc.connect(g); g.connect(out); env(g, t, o.attack || 0.004, o.gain || 0.2, dur); osc.start(t); osc.stop(t + dur + 0.05);
      },
      // a dry click for buttons: click(brightness 0..1)
      click: function (k) {
        if (!ensure()) return; k = k == null ? 0.5 : k;
        var t = ctx.currentTime, n = noise(0.03), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'bandpass'; f.frequency.value = 1200 + 3000 * k; f.Q.value = 3; n.connect(f); f.connect(g); g.connect(out);
        env(g, t, 0.001, 0.25, 0.03); n.start(t);
      },
      // a detent as the turning layer passes a notch
      tick: function () {
        if (!ensure()) return;
        var t = ctx.currentTime, n = noise(0.012), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'highpass'; f.frequency.value = cfg.tick.freq; n.connect(f); f.connect(g); g.connect(out);
        env(g, t, 0.0008, cfg.tick.gain, 0.012); n.start(t);
      },
      // the layer lands: a low knock under a short click
      snap: function (k) {
        if (!ensure()) return; k = k == null ? 1 : k;
        var t = ctx.currentTime, s = cfg.snap, osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(s.freq * 2.2, t); osc.frequency.exponentialRampToValueAtTime(s.freq * 0.6, t + s.body);
        osc.connect(g); g.connect(out); env(g, t, 0.002, 0.5 * k, s.body); osc.start(t); osc.stop(t + s.body + 0.05);
        var n = noise(0.02), f = ctx.createBiquadFilter(), g2 = ctx.createGain();
        f.type = 'bandpass'; f.frequency.value = s.click; f.Q.value = 1.4; n.connect(f); f.connect(g2); g2.connect(out);
        env(g2, t, 0.0008, 0.3 * k, 0.02); n.start(t);
      },
      // solved: the chime notes (MIDI) as a rising arpeggio of soft bells
      chime: function () {
        if (!ensure()) return;
        (cfg.chime || []).forEach(function (m, i) {
          var hz = 440 * Math.pow(2, (m - 69) / 12);
          api.tone(hz, 1.1, { type: cfg.chimeWave || 'sine', gain: 0.13, at: i * 0.085 });
          api.tone(hz * 2.76, 0.35, { type: 'sine', gain: 0.025, at: i * 0.085 });
        });
      }
    };
    return api;
  }

  // ================================================================== create
  AppCube.create = function (canvas, options) {
    var cfg = merge(DEFAULTS, options || {});
    if (typeof canvas === 'string') canvas = document.querySelector(canvas);
    var faces = (cfg.faces || [].slice.call(canvas.children, 0, 6)).map(function (f) { return typeof f === 'string' ? canvas.querySelector(f) : f; });
    if (faces.length !== 6 || faces.some(function (f) { return !f || f.parentNode !== canvas; })) throw new Error('AppCube: give six faces that are direct children of the canvas');
    var cubeButtons = canvas.querySelectorAll('[data-cube]');

    // ---- no feature: the six apps as an ordinary page, scaled to fit the width
    function fallback(note) {
      [].forEach.call(cubeButtons, function (b) { if (b.dataset.cube !== 'sound') b.disabled = true; });
      var wrap = HIC.fallback(canvas, { note: note });
      wrap.classList.add('cube-fallback');
      function fit() { var k = Math.min(1, (document.documentElement.clientWidth - 24) / cfg.face); faces.forEach(function (f) { f.style.zoom = k; }); }
      fit(); root.addEventListener('resize', fit);
      return null;
    }
    if (!HIC.supported('webgl')) return fallback();
    // #quality=0.6 starts at a lower backing resolution (checks on a loaded machine); it never changes the page's size
    var q0 = parseFloat(HIC.param('quality')) || 1;
    var S = HIC.stage(canvas, { maxDpr: 2, quality: HIC.clamp(q0, 0.3, 1) }), gl = S.gl;
    if (!gl || !S.way) return fallback();

    var FACE = cfg.face, T = FACE / 3, model = Model(), stickers = model.stickers, cubies = model.cubies;
    var HALF = 0.49, LIFT = 0.004, TS = cfg.tile.size * HALF;   // cubie half size, tile lift, tile half size
    var probe = root.__hic;

    // ------------------------------------------------------------------ GL objects
    var NL = Math.max(1, Math.min(6, cfg.studio.lights.length));
    var withNL = function (src) { return src.replace('precision highp float;', 'precision highp float;\n#define NL ' + NL); };
    var P = {
      body: HIC.gl.program(gl, VS_BODY, withNL(FS_BODY), ['aPos', 'aNor']),
      tile: HIC.gl.program(gl, VS_TILE, withNL(FS_TILE), ['aPos', 'aNor', 'aUV', 'aQ', 'aT']),
      back: HIC.gl.program(gl, null, withNL(FS_BACK)),
      floor: HIC.gl.program(gl, VS_FLOOR, withNL(FS_FLOOR), ['aPos'])
    };
    function vao(setup) { var v = gl.createVertexArray(); gl.bindVertexArray(v); setup(); gl.bindVertexArray(null); return v; }
    function buf(target, data, usage) { var b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, usage || gl.STATIC_DRAW); return b; }
    var mesh = roundedBox(HALF, cfg.body.radius);
    var bodyV = vao(function () {
      buf(gl.ARRAY_BUFFER, mesh.pos); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      buf(gl.ARRAY_BUFFER, mesh.nor); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
      buf(gl.ELEMENT_ARRAY_BUFFER, mesh.idx);
    });
    var STRIDE = 14, TV = new Float32Array(54 * 4 * STRIDE), tileB;   // per vertex: pos 3, normal 3, uv 2, q 2, tangent 3 + id 1
    var tileV = vao(function () {
      tileB = buf(gl.ARRAY_BUFFER, TV, gl.DYNAMIC_DRAW);
      [[0, 3, 0], [1, 3, 3], [2, 2, 6], [3, 2, 8], [4, 4, 10]].forEach(function (a) { gl.enableVertexAttribArray(a[0]); gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, STRIDE * 4, a[2] * 4); });
      var ix = new Uint16Array(54 * 6);
      for (var i = 0; i < 54; i++) ix.set([i * 4 + 3, i * 4 + 2, i * 4 + 1, i * 4 + 3, i * 4 + 1, i * 4], i * 6);   // CCW seen from outside
      buf(gl.ELEMENT_ARRAY_BUFFER, ix);
    });
    var floorV = vao(function () { buf(gl.ARRAY_BUFFER, new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1])); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); });
    var aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    var tex = faces.map(function () {
      var t = HIC.gl.texture(gl, { mips: true });
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      return t;
    });
    // the mirrored cube, rendered at half size with a mip chain so the floor can blur it with distance
    var refl = { w: 0, h: 0, tex: null, fb: null, depth: null };
    function reflTarget(w, h) {
      if (w === refl.w && h === refl.h) return;
      if (refl.tex) { gl.deleteTexture(refl.tex); gl.deleteRenderbuffer(refl.depth); gl.deleteFramebuffer(refl.fb); }
      refl.w = w; refl.h = h;
      refl.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, refl.tex);
      gl.texStorage2D(gl.TEXTURE_2D, Math.floor(Math.log2(Math.max(w, h))) + 1, gl.RGBA8, w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      refl.depth = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, refl.depth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      refl.fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, refl.fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, refl.tex, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, refl.depth);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // static uniforms (the look), set once per program
    var L = cfg.studio.lights.slice(0, NL), Ld = [], Ls = [], Lc = [], Lx = [], Ly = [];
    L.forEach(function (l) {
      var d = norm(l.dir), ax = norm(cross(Math.abs(d[1]) > 0.97 ? [1, 0, 0] : [0, 1, 0], d)), ay = cross(d, ax);
      Ld.push(d[0], d[1], d[2], l.power); Ls.push(l.size[0], l.size[1], l.soft || 0.06, 0); Lc.push.apply(Lc, lin(l.color)); Lx.push.apply(Lx, ax); Ly.push.apply(Ly, ay);
    });
    var bd = cfg.backdrop;
    function common(p) {
      p.use(); var u = p.u;
      if (u.uLd) { gl.uniform4fv(u.uLd, Ld); gl.uniform4fv(u.uLs, Ls); gl.uniform3fv(u.uLc, Lc); gl.uniform3fv(u.uLx, Lx); gl.uniform3fv(u.uLy, Ly); }
      if (u.uAmbLo) { gl.uniform3fv(u.uAmbLo, lin(cfg.studio.ambient[0])); gl.uniform3fv(u.uAmbHi, lin(cfg.studio.ambient[1])); }
      if (u.uBgC) {
        gl.uniform3fv(u.uBgC, lin(bd.center)); gl.uniform3fv(u.uBgE, lin(bd.edge)); gl.uniform2fv(u.uBgO, bd.centre);
        gl.uniform3fv(u.uGlA, lin(bd.glowA.color)); gl.uniform4f(u.uGlAp, bd.glowA.at[0], bd.glowA.at[1], bd.glowA.size, 0);
        gl.uniform3fv(u.uGlB, lin(bd.glowB.color)); gl.uniform4f(u.uGlBp, bd.glowB.at[0], bd.glowB.at[1], bd.glowB.size, 0);
      }
      if (u.uKey) gl.uniform3fv(u.uKey, norm(cfg.studio.key));
      if (u.uFloorY) gl.uniform1f(u.uFloorY, cfg.floor.y);
    }
    [P.body, P.tile, P.back, P.floor].forEach(common);
    P.body.use();
    gl.uniform3fv(P.body.u.uAlb, lin(cfg.body.color)); gl.uniform1f(P.body.u.uGloss, cfg.body.gloss); gl.uniform1f(P.body.u.uRough, cfg.body.roughness);
    gl.uniform1f(P.body.u.uMetal, cfg.body.metal); gl.uniform1f(P.body.u.uHalf, HALF); gl.uniform1f(P.body.u.uGroove, cfg.body.groove);
    P.tile.use();
    var tc = cfg.tile;
    gl.uniform1f(P.tile.u.uRad, tc.radius); gl.uniform1f(P.tile.u.uGlass, tc.glass); gl.uniform1f(P.tile.u.uRim, tc.rim); gl.uniform1f(P.tile.u.uBevel, tc.bevel);
    gl.uniform1f(P.tile.u.uEmit, tc.emit); gl.uniform1f(P.tile.u.uLight, tc.light); gl.uniform3fv(P.tile.u.uHotC, lin(tc.hot).map(function (v) { return v * 0.35; }));
    gl.uniform3fv(P.tile.u.uSwC, lin(cfg.sweep.color)); gl.uniform3fv(P.tile.u.uSwD, norm([0.7, 0.5, 0.4])); gl.uniform1f(P.tile.u.uSwP, cfg.sweep.power);
    gl.uniform1i(P.tile.u.uTex, 0);
    P.floor.use();
    gl.uniform3fv(P.floor.u.uTint, lin(cfg.floor.tint)); gl.uniform1f(P.floor.u.uRefK, cfg.floor.reflect); gl.uniform1f(P.floor.u.uBlur, cfg.floor.blur);
    gl.uniform1f(P.floor.u.uShadow, cfg.floor.shadow); gl.uniform2fv(P.floor.u.uFade, cfg.floor.fade); gl.uniform1f(P.floor.u.uY, cfg.floor.y);

    // ------------------------------------------------------------------ state
    var HOME = viewQ(cfg.view.yaw, cfg.view.pitch);
    var still = HIC.still !== null, calm = HIC.calm;
    var Q = still || calm ? HOME.slice() : viewQ(cfg.intro.yaw, cfg.intro.pitch);
    var intro = still || calm ? null : { t: 0, from: Q.slice() };
    var spin = null, vel = [0, 0], recoil = { x: [0, 0, 0], v: [0, 0, 0] };
    var turn = null, queue = [], history = [], hold = null, lastMove = null;
    var sway = still ? 1 : (calm ? 0 : 1), swayT = 0, pristine = !calm, lastTouch = -1e9, clock = 0;
    var sweep = 0, hop = -1, cy = 0, cyV = 0, cySet = false, lowXZ = [0, 0];
    var eye = [0, 0, 14], VP = null, VPm = null, eyeM = null, hot = -1, needsDraw = true, everTwisted = false;
    var mode = cfg.mode, scrambles = 0, ready = false, lastSettle = 0;
    var sound = Sound(cfg.sound);
    var M16 = new Float32Array(16);

    // ------------------------------------------------------------------ camera and layout (every frame)
    function cubeQ() {   // the orientation drawn: Q with the snap recoil on top
      var r = recoil.x, a = Math.hypot(r[0], r[1], r[2]);
      return a > 1e-6 ? qnorm(qmul(qaxis(scl(r, 1 / a), a), Q)) : Q;
    }
    function camera() {
      var asp = S.W / S.H, phone = S.W < 640;
      var dist = cfg.view.distance * Math.max(1, cfg.view.fitAspect / asp);
      eye = [0, cy + cfg.view.height * (dist / cfg.view.distance), dist];
      var Pm = HIC.mat4.perspective(cfg.view.fov * PI / 180, asp, 0.5, 140);
      var off = phone ? cfg.view.phoneOffset : (S.W < 900 ? cfg.view.midOffset : cfg.view.offset);
      if (off[0] || off[1]) { var Tm = HIC.mat4.ident(); Tm[8] = -off[0]; Tm[9] = -off[1]; Pm = HIC.mat4.mul(Tm, Pm); }
      VP = HIC.mat4.mul(Pm, HIC.mat4.lookAt(eye, [0, cy + cfg.view.lookY, 0], [0, 1, 0]));
      var fy = cfg.floor.y, Mir = HIC.mat4.ident(); Mir[5] = -1; Mir[13] = 2 * fy;
      VPm = HIC.mat4.mul(VP, Mir); eyeM = [eye[0], 2 * fy - eye[1], eye[2]];
    }
    function project(p) {
      var m = VP, w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
      return [((m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]) / w * 0.5 + 0.5) * S.W, (0.5 - (m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]) / w * 0.5) * S.H, w];
    }
    var CORNERS = []; [-1, 1].forEach(function (x) { [-1, 1].forEach(function (y) { [-1, 1].forEach(function (z) { CORNERS.push([x * 1.49, y * 1.49, z * 1.49]); }); }); });
    function layout(dt) {
      var Qd = cubeQ(), Qm = qmat(Qd), Rt = turn ? axisRot(turn.a, turn.angle) : null;
      // rest the cube on the floor: its lowest corner sits just above it; the height eases (weight) as it rolls onto an edge
      var minY = 1e9, low = null;
      CORNERS.forEach(function (c) { var p = m3v(Qm, c); if (p[1] < minY) { minY = p[1]; low = p; } });
      var target = cfg.floor.y + 0.035 - minY + (hop >= 0 ? hopHeight(hop) : 0);
      if (!cySet || still) { cy = target; cyV = 0; cySet = true; }
      else { var s = HIC.spring(cy, cyV, target, 2.4, 0.8, dt); cy = s[0]; cyV = s[1]; }
      lowXZ = [low[0], low[2]];
      camera();
      cubies.forEach(function (cb) {
        var M = cb.rot, p = cb.pos;
        if (turn && cb.pos[turn.a] === turn.l) { M = m3mul(Rt, M); p = m3v(Rt, p); }
        cb.M = m3mul(Qm, M); cb.T = add(m3v(Qm, p), [0, cy, 0]);
      });
      var o = 0, SG = [[-1, 1], [1, 1], [1, -1], [-1, -1]];
      stickers.forEach(function (s) {
        var cb = s.cubie, N = m3v(cb.M, s.n), U = m3v(cb.M, s.u), V = m3v(cb.M, s.v);
        var C = add(cb.T, scl(N, HALF + LIFT));
        s.N = N; s.C = C; s.facing = dot(N, sub(eye, C)) > 0.02; s.depth = 0;
        for (var k = 0; k < 4; k++) {
          var sx = SG[k][0], sy = SG[k][1], p = add(C, add(scl(U, sx * TS), scl(V, sy * TS))), q = project(p);
          s.scr[k] = [q[0], q[1]]; s.depth += q[2] / 4;
          TV[o++] = p[0]; TV[o++] = p[1]; TV[o++] = p[2]; TV[o++] = N[0]; TV[o++] = N[1]; TV[o++] = N[2];
          TV[o++] = (s.c + (sx + 1) / 2) / 3; TV[o++] = (s.r + (1 - sy) / 2) / 3;
          TV[o++] = sx; TV[o++] = sy; TV[o++] = U[0]; TV[o++] = U[1]; TV[o++] = U[2]; TV[o++] = s.i;
        }
      });
    }
    function hopHeight(k) { return k < 1 ? 0.32 * Math.sin(PI * k) : (k < 1.45 ? 0.05 * Math.sin(PI * (k - 1) / 0.45) : 0); }

    // which sticker is drawn at canvas point (x, y): the nearest facing quad that contains it
    function pick(x, y) {
      var best = null;
      stickers.forEach(function (s) {
        if (!s.facing) return;
        var q = s.scr, sign = 0;
        for (var k = 0; k < 4; k++) {
          var a = q[k], b = q[(k + 1) % 4], cr = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
          if (cr) { var sg = cr > 0 ? 1 : -1; if (sign && sg !== sign) return; sign = sg; }
        }
        if (!best || s.depth < best.depth) best = s;
      });
      return best;
    }
    // the homography from the sticker's square of its app (face px) to its quad on the canvas (canvas CSS px)
    function tileH(s) {
      var H = squareToQuad(s.scr); if (!H) return null;
      var x0 = s.c * T, y0 = s.r * T, k = 1 / T;
      return m3mul(H, [k, 0, -x0 * k, 0, k, -y0 * k, 0, 0, 1]);
    }

    // ------------------------------------------------------------------ hit testing: only the tile under the pointer is live
    var bound = -1, boundS = null, boundKey = '', boundH = null, boundStamp = 0;
    function bust() { if (S.mode === 'geo') document.documentElement.setAttribute('data-cube-hit', String(++boundStamp % 997)); }
    function bindTile(s) {
      var H = tileH(s); if (!H) return unbind();
      var key = s.i + ':' + H.map(function (v) { return v.toFixed(4); }).join(',');
      if (key === boundKey) return;
      if (bound >= 0 && bound !== s.f) S.place(faces[bound], null);
      S.place(faces[s.f], cssOf(H)); bust();
      bound = s.f; boundS = s; boundKey = key; boundH = H;
    }
    function unbind() {
      if (bound >= 0) { S.place(faces[bound], null); bust(); }
      bound = -1; boundS = null; boundKey = ''; boundH = null;
    }
    // measure inside a face in its own px, with the face placed flat for a moment (perspective would skew client rects)
    function measureIn(f, fn) {
      var face = faces[f], wasBound = bound === f && boundH;
      if (wasBound && S.mode === 'css') { face.style.transform = 'none'; }
      else if (wasBound) S.place(face, [1, 0, 0, 1, 0, 0]);
      var fr = face.getBoundingClientRect(), r;
      try { r = fn(fr); } finally {
        if (wasBound && S.mode === 'css') face.style.transform = face.__hicCss;
        else if (wasBound) S.place(face, cssOf(boundH));
      }
      return r;
    }
    function faceOf(el) { while (el && el.parentNode !== canvas) el = el.parentNode; return el ? faces.indexOf(el) : -1; }
    // an element's box in its face's px: [x, y, w, h]
    function localBox(el) {
      var f = faceOf(el); if (f < 0) return null;
      if (el.offsetParent !== undefined && el.offsetWidth !== undefined && !(el instanceof SVGElement)) {
        var x = 0, y = 0, n = el;
        while (n && n !== faces[f]) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
        if (n === faces[f]) return [x, y, el.offsetWidth, el.offsetHeight];
      }
      return measureIn(f, function (fr) { var b = el.getBoundingClientRect(); return [b.left - fr.left, b.top - fr.top, b.width, b.height]; });
    }
    function stickerAt(f, x, y) {
      var r = Math.max(0, Math.min(2, Math.floor(y / T))), c = Math.max(0, Math.min(2, Math.floor(x / T)));
      return stickers[f * 9 + r * 3 + c];
    }
    // face point → canvas point (null if that tile faces away or is covered)
    function toScreen(f, x, y) {
      var s = stickerAt(f, x, y), H = tileH(s); if (!H || !s.facing) return null;
      var p = happly(H, x, y);
      return pick(p[0], p[1]) === s ? p : null;
    }
    // client point → face px, through the tile that is live now (for apps that draw: canvases, SVG)
    function toLocal(el, cx, cy2) {
      var f = typeof el === 'number' ? el : faceOf(el), cr = canvas.getBoundingClientRect();
      var s = bound === f && boundS ? boundS : pick(cx - cr.left, cy2 - cr.top);
      if (!s || s.f !== f) return null;
      var Hi = hinv(tileH(s)); return Hi ? happly(Hi, cx - cr.left, cy2 - cr.top) : null;
    }

    // ------------------------------------------------------------------ turning layers
    function record(m) {
      var last = history[history.length - 1];
      if (last && last.a === m.a && last.l === m.l) { last.q = (last.q + m.q) % 4; if (!last.q) history.pop(); }
      else history.push({ a: m.a, l: m.l, q: m.q % 4 });
      if (model.solved()) history = [];
    }
    function announce(user) {
      var st = state();
      st.user = !!user;
      try { if (cfg.onChange) cfg.onChange(st); } catch (e) { probe.errors.push('onChange: ' + e.message); }
      root.dispatchEvent(new CustomEvent('cubechange', { detail: st }));
    }
    function commit(m, user, rec) {
      var q = ((m.q % 4) + 4) % 4; if (!q) return;
      var was = model.solved();
      model.apply(m.a, m.l, q);
      if (rec !== false) record({ a: m.a, l: m.l, q: q }); else if (model.solved()) history = [];
      lastMove = moveName({ a: m.a, l: m.l, q: q }); everTwisted = true;
      var now = model.solved();
      if (rec !== false && m.fast !== true) sound.snap(user ? 1 : 0.7);
      else if (m.fast) sound.tick();
      // recoil: the whole cube gives a little against the turn, then settles
      if (!calm && !still) { var ax = m3v(qmat(Q), [m.a === 0 ? 1 : 0, m.a === 1 ? 1 : 0, m.a === 2 ? 1 : 0]), sgn = q === 3 ? -1 : 1; recoil.v = add(recoil.v, scl(ax, -sgn * cfg.turn.recoil * (user ? 9 : 4))); }
      if (now && !was && !queue.length) celebrate();
      announce(user);
    }
    function celebrate() {
      sound.chime();
      if (!calm && !still) { sweep = 0.0001; hop = 0; }
    }
    function enqueue(list, dur, rec, fast) {
      list.forEach(function (m) { queue.push({ a: m.a, l: m.l, q: m.q, dur: dur, rec: rec, fast: fast }); });
      needsDraw = true;
    }
    var inverse = function (m) { return { a: m.a, l: m.l, q: (4 - m.q) % 4 }; };
    function scramble(n) {
      if (queue.length || turn) return;
      var rnd = HIC.rng((cfg.turn.seed + 1) * 7919 + (scrambles++) * 104729), list = [], pa = -1, pl = 9;
      n = n || cfg.turn.scramble;
      while (list.length < n) {
        var a = Math.floor(rnd() * 3), l = [-1, 0, 1][Math.floor(rnd() * 3)];
        if (a === pa && l === pl) continue;
        list.push({ a: a, l: l, q: [1, 3, 2][Math.floor(rnd() * 3)] }); pa = a; pl = l;
      }
      enqueue(list, cfg.turn.scrambleDur, true, true);
    }
    function solve() {
      if (queue.length || turn || !history.length) return;
      var list = history.slice().reverse().map(inverse);
      enqueue(list, Math.max(0.04, Math.min(0.14, 2.4 / list.length)), true, list.length > 4);
    }
    function undo() {
      if (queue.length || turn || !history.length) return;
      enqueue([inverse(history[history.length - 1])], cfg.turn.dur * 1.25, true, false);
    }
    // apply moves at once, without animation (stills, restoring a saved state)
    function applyNow(list, rec) {
      if (typeof list === 'string') list = parseMoves(list);
      list.forEach(function (m) { model.apply(m.a, m.l, m.q); if (rec !== false) record(m); });
      if (list.length) { everTwisted = true; lastMove = moveName(list[list.length - 1]); }
      needsDraw = true; announce(false);
    }

    // ------------------------------------------------------------------ pointer
    var ptr = { x: 0, y: 0, on: false }, drag = null, eatClick = false, lastDown = 0;
    function rel(e) { var r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function inCanvas(e) { return e.target === canvas || canvas.contains(e.target); }
    function touched() { lastTouch = clock; pristine = false; }
    function hover() {
      if (drag || !ready) return;
      var s = ptr.on ? pick(ptr.x, ptr.y) : null;
      if (s) bindTile(s); else unbind();
      var h = s ? s.i : -1; if (h !== hot) { hot = h; needsDraw = true; }
      canvas.style.cursor = s ? '' : 'grab';
    }
    // which way the layer turns: the candidate axis whose motion on screen best matches the drag
    function startTwist(e) {
      var s = drag.s, p = rel(e), dx = p[0] - drag.x, dy = p[1] - drag.y;
      if (turn || queue.length) { drag.mode = 'dead'; return; }
      var cb = s.cubie, nl = round3(m3v(cb.rot, s.n)), pc = add(cb.pos, scl(nl, 0.5)), Qm = qmat(cubeQ()), base = project(s.C), best = null;
      for (var a = 0; a < 3; a++) {
        if (nl[a]) continue;
        var ax = [0, 0, 0]; ax[a] = 1;
        var tw = m3v(Qm, cross(ax, pc)), q = project(add(s.C, scl(tw, 0.01)));
        var sx = (q[0] - base[0]) / 0.01, sy = (q[1] - base[1]) / 0.01, len = Math.hypot(sx, sy) || 1;
        var score = Math.abs(dx * sx + dy * sy) / len;
        if (!best || score > best.score) best = { a: a, score: score, dir: [sx / len, sy / len], len: len };
      }
      drag.mode = 'twist'; drag.dir = best.dir; drag.len = best.len; drag.speed = 0; drag.time = performance.now(); drag.ticks = 0;
      turn = { a: best.a, l: cb.pos[best.a], angle: 0 };
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      eatClick = true; unbind(); hot = -1; touched();
    }
    function onMove(e) {
      var p = rel(e); ptr.x = p[0]; ptr.y = p[1]; ptr.on = true;
      if (!drag) { hover(); return; }
      if (e.pointerId !== drag.id) return;
      var dx = p[0] - drag.x, dy = p[1] - drag.y;
      if (drag.mode === 'maybe' && Math.hypot(dx, dy) > 6) startTwist(e);
      if (drag.mode === 'twist') {
        var ang = HIC.clamp((dx * drag.dir[0] + dy * drag.dir[1]) / drag.len, -PI, PI), now = performance.now();
        drag.speed = drag.speed * 0.5 + 0.5 * (ang - turn.angle) / Math.max(1, now - drag.time) * 1000; drag.time = now;
        turn.angle = ang; needsDraw = true;
        var tk = Math.floor(Math.abs(ang) / (cfg.turn.tickDeg * PI / 180));
        if (tk !== drag.ticks) { drag.ticks = tk; sound.tick(); }
      } else if (drag.mode === 'orbit') {
        var mx = p[0] - drag.px, my = p[1] - drag.py; drag.px = p[0]; drag.py = p[1];
        Q = qnorm(qmul(qaxis([1, 0, 0], my * 0.0085), qmul(qaxis([0, 1, 0], mx * 0.0085), Q)));
        vel = [mx, my]; needsDraw = true;
      }
    }
    function onDown(e) {
      sound.unlock();
      if (e.button !== 0 || drag || !ready) return;
      if (!inCanvas(e)) return;
      var p = rel(e); ptr.x = p[0]; ptr.y = p[1]; ptr.on = true;
      intro = null; spin = null; vel = [0, 0]; touched();
      var s = pick(p[0], p[1]);
      if (!s) {
        drag = { mode: 'orbit', id: e.pointerId, px: p[0], py: p[1] };
        try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
        unbind(); canvas.style.cursor = 'grabbing';
        var now = performance.now(); if (now - lastDown < 320) home(); lastDown = now;
        e.preventDefault(); return;
      }
      var stray = !faces[s.f].contains(e.target);   // the press reached the canvas before the tile was live (touch)
      bindTile(s);
      var t = e.target, textish = !stray && t.closest && t.closest('[contenteditable]:not([contenteditable=false]),input:not([type=button]):not([type=checkbox]):not([type=radio]):not([type=submit]),textarea,select,[data-drag]');
      var dom = mode === 'write' || (mode === 'auto' && !e.shiftKey && !!textish);
      if (mode === 'twist' || e.shiftKey) dom = false;
      drag = { mode: dom ? 'dom' : 'maybe', id: e.pointerId, s: s, x: p[0], y: p[1], stray: stray, write: mode === 'write' };
      if (e.shiftKey || mode === 'twist') e.preventDefault();
    }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null; canvas.style.cursor = '';
      if (d.mode === 'twist' && turn) {
        var qt = PI / 2, q = Math.round(turn.angle / qt);
        if (q === 0 && (Math.abs(turn.angle) > 0.32 || Math.abs(d.speed) > cfg.turn.flick) && Math.sign(d.speed || turn.angle) === Math.sign(turn.angle)) q = Math.sign(turn.angle);
        turn.settle = { to: q * qt, v: d.speed * 0.6, q: q, t0: clock };
      } else if (d.mode === 'maybe' && d.stray && e.type === 'pointerup') {
        var t = document.elementFromPoint(e.clientX, e.clientY);
        if (t && t !== canvas && canvas.contains(t)) { if (t.focus) t.focus(); if (t.click) t.click(); }
      } else if (d.mode === 'maybe' && d.write) { /* write mode, no move: an ordinary click */ }
      hover(); needsDraw = true;
    }
    root.addEventListener('pointermove', onMove, true);
    root.addEventListener('pointerdown', onDown, true);
    root.addEventListener('pointerup', onUp, true);
    root.addEventListener('pointercancel', onUp, true);
    root.addEventListener('click', function (e) { if (eatClick) { eatClick = false; if (inCanvas(e)) { e.stopPropagation(); e.preventDefault(); } } }, true);
    root.addEventListener('pointerdown', function () { eatClick = false; }, true);
    root.addEventListener('keydown', function () { sound.unlock(); touched(); }, true);
    document.documentElement.addEventListener('pointerleave', function () { ptr.on = false; if (!drag) { unbind(); hot = -1; needsDraw = true; } });
    root.addEventListener('blur', function () { ptr.on = false; if (!drag) unbind(); });
    canvas.addEventListener('dragstart', function (e) { e.preventDefault(); });
    // Pressing a button or a tile must not take the caret out of the text, so typing carries on after a twist.
    canvas.addEventListener('mousedown', function (e) {
      if (!(e.target.closest && e.target.closest('[contenteditable]:not([contenteditable=false]),input,textarea,select,label'))) e.preventDefault();
    });

    // ------------------------------------------------------------------ keep what is being used in view
    function reveal(f, x, y) {
      var s = stickerAt(f, x, y);
      if (!s || !VP) return;
      var toEye = norm(sub(eye, s.C));
      if (dot(s.N, toEye) > 0.35) return;
      // turn the tile to face the camera, then roll about that axis so the tile's own "up" points up (text reads upright)
      // the goal is where the front face sits in the home view, so the cube keeps its three-quarter look
      var Hm = qmat(HOME), goal = m3v(Hm, [0, 0, 1]), arc = qfromTo(norm(s.N), goal);
      var up = m3v(qmat(arc), m3v(s.cubie.M, s.v)), hv = m3v(Hm, [0, 1, 0]), want = norm(sub(hv, scl(goal, dot(hv, goal))));
      var roll = Math.atan2(dot(cross(up, want), goal), dot(up, want));
      var to = qnorm(qmul(qaxis(goal, roll), qmul(arc, Q)));
      spin = { from: Q.slice(), to: to, t: 0, dur: 0.6 }; vel = [0, 0]; intro = null; needsDraw = true;
    }
    function revealCaret(f) {
      var sel = root.getSelection && root.getSelection();
      if (!sel || !sel.rangeCount || !faces[f].contains(sel.focusNode)) return;
      var pt = measureIn(f, function (fr) {
        var r = document.createRange(); r.setStart(sel.focusNode, sel.focusOffset); r.collapse(true);
        var rc = r.getClientRects()[0];
        if (!rc && sel.focusNode.nodeType === 1) { var n = sel.focusNode.childNodes[Math.max(0, sel.focusOffset - 1)] || sel.focusNode; if (n.getBoundingClientRect) rc = n.getBoundingClientRect(); }
        return rc ? [rc.left - fr.left, rc.top + rc.height / 2 - fr.top] : null;
      });
      if (pt) reveal(f, pt[0], pt[1]);
    }
    function used(f) { root.dispatchEvent(new CustomEvent('cubeuse', { detail: { face: f, afterTwist: everTwisted } })); }
    canvas.addEventListener('input', function (e) {
      var f = faceOf(e.target); if (f < 0) return;
      used(f);
      if (e.target.isContentEditable) revealCaret(f);
      else { var b = localBox(e.target); if (b) reveal(f, b[0] + b[2] / 2, b[1] + b[3] / 2); }
    }, true);
    canvas.addEventListener('keyup', function (e) { var f = faceOf(e.target); if (f >= 0 && e.target.isContentEditable && /^(Arrow|Home|End|Page)/.test(e.key)) revealCaret(f); }, true);
    canvas.addEventListener('click', function (e) { var f = faceOf(e.target); if (f >= 0) used(f); });
    // Tab into a control on a hidden tile: turn the cube to show it
    canvas.addEventListener('focusin', function (e) {
      if (drag) return;
      var f = faceOf(e.target); if (f < 0 || e.target === faces[f]) return;
      if (e.target.isContentEditable) { setTimeout(function () { revealCaret(f); }, 0); return; }
      var b = localBox(e.target); if (b) reveal(f, b[0] + b[2] / 2, b[1] + b[3] / 2);
    });

    // ------------------------------------------------------------------ controls wired by attribute
    function setMode(m) {
      mode = m === 'write' || m === 'twist' ? m : 'auto';
      [].forEach.call(canvas.querySelectorAll('[data-cube="mode"]'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === mode)); });
    }
    [].forEach.call(cubeButtons, function (b) {
      var k = b.dataset.cube;
      if (k === 'sound') { sound.bind(b); b.addEventListener('click', function () { sound.unlock(); sound.toggle(); if (sound.on) sound.click(0.6); }); return; }
      b.addEventListener('click', function () {
        sound.click(0.4);
        if (k === 'scramble') scramble(); else if (k === 'undo') undo(); else if (k === 'solve') solve();
        else if (k === 'home') home(); else if (k === 'mode') setMode(b.dataset.mode);
      });
    });
    setMode(mode);
    function home(dur) { spin = { from: Q.slice(), to: HOME.slice(), t: 0, dur: dur || 0.9 }; vel = [0, 0]; intro = null; needsDraw = true; }

    // ------------------------------------------------------------------ uploads: only when a face's pixels changed
    var dirty = faces.map(function () { return true; }), up = faces.map(function () { return false; }), anyChange = false;
    var hicPaint = canvas.onpaint;
    canvas.onpaint = function (e) {   // note which faces changed, then let hic.js decide whether this paint is real
      var seen = false;
      if (e && e.changedElements) [].forEach.call(e.changedElements, function (el) { var f = faces.indexOf(el); if (f < 0) f = faceOf(el); if (f >= 0) { dirty[f] = true; seen = true; } });
      if (!seen) anyChange = true;
      return hicPaint.call(canvas, e);
    };
    var texSize = function () { return Math.min(2048, Math.round(FACE * Math.min(2, S.dpr) * cfg.texScale)); };
    S.onPaint(function () {
      var focusF = faceOf(document.activeElement), n = texSize();
      if (anyChange) { if (bound >= 0) dirty[bound] = true; if (focusF >= 0) dirty[focusF] = true; if (!ready) dirty = dirty.map(function () { return true; }); anyChange = false; }
      for (var f = 0; f < 6; f++) {
        if (!dirty[f] && up[f]) continue;
        if (S.upload(faces[f], tex[f], n, n)) { dirty[f] = false; up[f] = true; needsDraw = true; }
      }
      if (!ready && up.every(Boolean)) start();
      else if (!ready) setTimeout(function () { S.requestPaint(); }, 60);
    });
    var starting = false;
    function start() {
      if (starting) return; starting = true;
      S.probe(faces[0], faces[0].firstElementChild || faces[0]).then(function (m) {
        faces.forEach(function (f) { f.__hicCss = ''; S.place(f, null); });
        ready = true; needsDraw = true;
        S.ready({ mode: m, engine: 'app-cube', faces: faces.map(function (f) { return f.id; }) });
        if (cfg.onReady) cfg.onReady(api);
        announce(false);
      });
    }
    faces.forEach(function (f) { S.place(f, null); });

    // ------------------------------------------------------------------ time
    function step(t, dt) {
      var busy = false;
      clock += dt;
      if (intro) {
        intro.t += dt / cfg.intro.dur; var k = Math.min(1, intro.t);
        Q = qslerp(intro.from, HOME, backOut(k)); if (k >= 1) intro = null; busy = true;
      }
      if (spin) { spin.t += dt / spin.dur; var ks = Math.min(1, spin.t); Q = qslerp(spin.from, spin.to, easeInOut(ks)); if (ks >= 1) spin = null; busy = true; }
      if (!drag && (Math.abs(vel[0]) > 0.04 || Math.abs(vel[1]) > 0.04)) {
        var f60 = dt * 60;
        Q = qnorm(qmul(qaxis([1, 0, 0], vel[1] * 0.0085 * f60), qmul(qaxis([0, 1, 0], vel[0] * 0.0085 * f60), Q)));
        var fr = Math.exp(-dt * 4.2); vel = [vel[0] * fr, vel[1] * fr]; busy = true;
      }
      // the next queued move
      if (!turn && queue.length && !hold) {
        var m = queue.shift(), qq = m.q === 3 ? -1 : m.q;
        turn = { a: m.a, l: m.l, angle: 0, anim: { to: qq * PI / 2, t: 0, dur: m.dur * (m.q === 2 ? 1.5 : 1), m: m } };
      }
      if (turn && turn.anim) {
        var an = turn.anim; an.t += dt / an.dur; var ka = Math.min(1, an.t);
        turn.angle = an.to * (an.m.fast ? easeInOut(ka) : backOut(ka));
        if (ka >= 1) { var mv = an.m; turn = null; commit({ a: mv.a, l: mv.l, q: mv.q, fast: mv.fast }, false, mv.rec); }
        busy = true;
      } else if (turn && turn.settle) {
        // a released layer swings to the nearest quarter on a spring: weight, a small overshoot, then rest
        var sp = HIC.spring(turn.angle, turn.settle.v, turn.settle.to, cfg.turn.freq, cfg.turn.zeta, dt);
        turn.angle = sp[0]; turn.settle.v = sp[1];
        if (Math.abs(sp[0] - turn.settle.to) < 0.002 && Math.abs(sp[1]) < 0.05) {
          var tq = turn.settle.q, ta = turn.a, tl = turn.l; lastSettle = clock - turn.settle.t0; turn = null;
          if (tq) commit({ a: ta, l: tl, q: tq }, true, true); else sound.tick();
        }
        busy = true;
      } else if (hold) { turn = { a: hold.a, l: hold.l, angle: hold.angle }; }
      if (queue.length) busy = true;
      // recoil spring
      var rmag = Math.hypot(recoil.x[0], recoil.x[1], recoil.x[2]) + Math.hypot(recoil.v[0], recoil.v[1], recoil.v[2]);
      if (rmag > 1e-5) {
        for (var i = 0; i < 3; i++) { var r = HIC.spring(recoil.x[i], recoil.v[i], 0, 3.2, 0.32, dt); recoil.x[i] = r[0]; recoil.v[i] = r[1]; }
        busy = true;
      } else { recoil.x = [0, 0, 0]; recoil.v = [0, 0, 0]; }
      if (sweep > 0) { sweep += dt / cfg.sweep.dur; if (sweep >= 1) sweep = 0; busy = true; }
      if (hop >= 0) { hop += dt / 0.42; if (hop > 1.5) hop = -1; busy = true; }
      // turntable sway while nobody is touching; it eases out under the pointer and comes back after a rest
      if (still) { sway = pristine ? 1 : 0; }
      else {
        var want = !calm && !intro && !spin && !drag && !turn && !queue.length && !(ptr.on && pick(ptr.x, ptr.y)) && (pristine || clock - lastTouch > cfg.idle.resume) ? 1 : 0;
        sway += (want - sway) * (1 - Math.exp(-dt * (want ? 0.8 : 4)));
      }
      if (sway > 0.002) {
        var prev = swayAngle(swayT); swayT = still ? t : swayT + dt * sway;
        var dA = still ? 0 : (swayAngle(swayT) - prev) * Math.min(1, sway * 1.5);
        if (still) { if (pristine) Q = qnorm(qmul(qaxis([0, 1, 0], swayAngle(t)), HOME)); }
        else Q = qnorm(qmul(qaxis([0, 1, 0], dA), Q));
        busy = busy || !still;
      }
      return busy;
    }
    function swayAngle(t) { return cfg.idle.sway * Math.sin(t * cfg.idle.speed * 2 * PI) * (1 - Math.exp(-t * 0.8)); }

    function drawCube(vp, eyeP, mirror) {
      gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.disable(gl.BLEND); gl.depthMask(true);
      var pb = P.body.use();
      gl.uniformMatrix4fv(pb.u.uVP, false, vp); gl.uniform3fv(pb.u.uEye, eyeP); gl.uniform1f(pb.u.uMirror, mirror ? 1 : 0);
      gl.bindVertexArray(bodyV);
      cubies.forEach(function (cb) {
        var m = cb.M, t = cb.T;
        M16[0] = m[0]; M16[1] = m[3]; M16[2] = m[6]; M16[3] = 0; M16[4] = m[1]; M16[5] = m[4]; M16[6] = m[7]; M16[7] = 0;
        M16[8] = m[2]; M16[9] = m[5]; M16[10] = m[8]; M16[11] = 0; M16[12] = t[0]; M16[13] = t[1]; M16[14] = t[2]; M16[15] = 1;
        gl.uniformMatrix4fv(pb.u.uModel, false, M16);
        gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_SHORT, 0);
      });
      var pt = P.tile.use();
      gl.uniformMatrix4fv(pt.u.uVP, false, vp); gl.uniform3fv(pt.u.uEye, eyeP); gl.uniform1f(pt.u.uMirror, mirror ? 1 : 0);
      gl.uniform1f(pt.u.uHot, mirror ? -1 : hot); gl.uniform1f(pt.u.uSweep, sweep);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(tileV); gl.activeTexture(gl.TEXTURE0);
      for (var f = 0; f < 6; f++) { if (!up[f]) continue; gl.bindTexture(gl.TEXTURE_2D, tex[f]); gl.drawElements(gl.TRIANGLES, 54, gl.UNSIGNED_SHORT, f * 54 * 2); }
      gl.disable(gl.BLEND);
    }
    function render() {
      var W = canvas.width, H = canvas.height, asp = W / H;
      gl.bindBuffer(gl.ARRAY_BUFFER, tileB); gl.bufferSubData(gl.ARRAY_BUFFER, 0, TV);
      // 1 the cube mirrored in the floor, at half size
      reflTarget(Math.max(2, W >> 1), Math.max(2, H >> 1));
      gl.bindFramebuffer(gl.FRAMEBUFFER, refl.fb); gl.viewport(0, 0, refl.w, refl.h);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.frontFace(gl.CW); drawCube(VPm, eyeM, true); gl.frontFace(gl.CCW);
      gl.bindTexture(gl.TEXTURE_2D, refl.tex); gl.generateMipmap(gl.TEXTURE_2D);
      // 2 the studio: backdrop, then the floor that reflects
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
      gl.clear(gl.DEPTH_BUFFER_BIT); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
      var pk = P.back.use(); gl.uniform1f(pk.u.uAsp, asp); HIC.gl.bind(gl, pk, { uRefl: refl.tex }); HIC.gl.fullscreen(gl);
      gl.enable(gl.DEPTH_TEST);
      var pf = P.floor.use();
      gl.uniformMatrix4fv(pf.u.uVP, false, VP); gl.uniform2f(pf.u.uRes, W, H); gl.uniform3fv(pf.u.uEye, eye); gl.uniform1f(pf.u.uAsp, asp);
      gl.uniform2fv(pf.u.uLow, lowXZ); gl.uniform1f(pf.u.uLift, Math.max(0, cy - (cfg.floor.y + 0.035) - 1.49) + (hop >= 0 ? hopHeight(hop) * 3 : 0));
      HIC.gl.bind(gl, pf, { uRefl: refl.tex });
      gl.bindVertexArray(floorV); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      // 3 the cube
      drawCube(VP, eye, false);
      gl.bindVertexArray(null);
    }
    var lastW = 0, lastH = 0;
    root.addEventListener('resize', function () { S.resize(); needsDraw = true; });
    // when this machine cannot keep up while things move, draw fewer pixels (down to half); the page stays the same size
    var slow = 0, lastNow = 0;
    S.loop(function (t, dt) {
      if (S.W !== lastW || S.H !== lastH) { lastW = S.W; lastH = S.H; needsDraw = true; }
      var busy = step(t, dt), now = performance.now();
      if (busy || needsDraw || !VP) {
        if (busy && lastNow && !still) {
          slow = now - lastNow > 45 ? slow + 1 : Math.max(0, slow - 0.5);
          if (slow > 8 && S.quality > 0.5) { S.quality = Math.max(0.5, S.quality * 0.8); S.resize(); slow = 0; }
        }
        layout(dt);
        if (ready && !drag) hover();
        render(); needsDraw = false;
      }
      lastNow = busy ? now : 0;
    });
    gl.canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); probe.errors.push('webgl context lost'); });

    // ------------------------------------------------------------------ the API
    function state() {
      return {
        solved: model.solved(), moves: history.length, log: history.map(moveName), last: lastMove, busy: !!turn || queue.length > 0,
        mode: mode, sound: sound.on, twisted: everTwisted,
        // engine time (s, the sum of frame steps): checks measure settling in it, so a slow machine does not fail them
        clock: clock, settle: lastSettle, spinning: !!spin || !!intro || Math.abs(vel[0]) > 0.04 || Math.abs(vel[1]) > 0.04
      };
    }
    var api = {
      faces: faces, model: model, stickers: stickers, sound: sound, stage: S,
      scramble: scramble, undo: undo, solve: solve, home: home, setMode: setMode,
      turn: function (a, l, q) { enqueue([{ a: a, l: l, q: ((q % 4) + 4) % 4 }], cfg.turn.dur, true, false); },
      moves: function (s, dur) { enqueue(parseMoves(s), dur || cfg.turn.dur, true, false); },
      apply: applyNow,
      parse: parseMoves, name: moveName,
      hold: function (a, l, angle) { hold = a == null ? null : { a: a, l: l, angle: angle }; if (!hold) turn = null; needsDraw = true; },
      view: function (yaw, pitch) { Q = viewQ(yaw, pitch); intro = null; spin = null; vel = [0, 0]; pristine = false; sway = 0; lastTouch = clock; needsDraw = true; },
      reveal: function (el) { var f = faceOf(el), b = localBox(el); if (f >= 0 && b) reveal(f, b[0] + b[2] / 2, b[1] + b[3] / 2); },
      state: state,
      slotOf: function (f, r, c) { return model.slot(stickers[f * 9 + r * 3 + c]); },
      toScreen: toScreen, toLocal: toLocal, localBox: localBox, faceOf: faceOf,
      tileAt: function (x, y) { var s = pick(x, y); return s ? { face: s.f, row: s.r, col: s.c, index: s.i } : null; },
      visibleTiles: function () {
        return stickers.filter(function (s) { return s.facing; }).map(function (s) {
          var c = [0, 0]; s.scr.forEach(function (p) { c[0] += p[0] / 4; c[1] += p[1] / 4; });
          return { face: s.f, row: s.r, col: s.c, index: s.i, x: c[0], y: c[1], top: pick(c[0], c[1]) === s };
        });
      },
      get mode() { return mode; },
      get ready() { return ready; }
    };
    // for checks and stills: where an element is drawn now (inverts the tile's projective map)
    probe.screenOf = function (el) {
      var f = faceOf(el), b = localBox(el); if (f < 0 || !b) return null;
      // the element's centre, moved off a tile seam (seams are the gaps between cubies) while staying inside the element
      var x = b[0] + b[2] / 2, y = b[1] + b[3] / 2, m = 26;
      var cx = Math.floor(Math.min(FACE - 1, x) / T), ry = Math.floor(Math.min(FACE - 1, y) / T);
      x = Math.max(Math.max(b[0] + 4, cx * T + m), Math.min(Math.min(b[0] + b[2] - 4, (cx + 1) * T - m), x));
      y = Math.max(Math.max(b[1] + 4, ry * T + m), Math.min(Math.min(b[1] + b[3] - 4, (ry + 1) * T - m), y));
      var p = toScreen(f, x, y);
      if (!p) { var s = stickerAt(f, x, y), H = tileH(s); return H ? happly(H, x, y) : null; }
      return p;
    };
    root.__cube = api;
    return api;
  };

  AppCube.DEFAULTS = DEFAULTS;
  AppCube.FACES = FACE_DIRS.map(function (d) { return d.name; });
  AppCube.parse = parseMoves;
  root.AppCube = AppCube;
})(typeof window !== 'undefined' ? window : globalThis);

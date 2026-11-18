/* knit.js — the Knitted Page engine: a live web page drawn as hand knitting, stitch by stitch.
 *
 * A page (ordinary HTML inside <canvas layoutsubtree content="drawable">, see hic.js) is laid out in stitch units. Its
 * pixels are uploaded to WebGL on every paint; a downsample pass gives every stitch ONE yarn colour (the colour that
 * covers most of the stitch, optionally snapped to the topic's yarn palette). A full-screen pass then draws each stitch as
 * a V of two tilted, twisted yarn legs with plies, fibres, fuzz, contact shadows and a lamp, on a table (wood, linen,
 * gingham or felt). A loose thread hangs off the last stitch. Pull it (or press the page's [data-knit-unravel] control)
 * and the knitting unravels row by row, top first, into a crinkled heap drawn as yarn ribbons; under it the table shows,
 * and an optional second live layer (#under) — what unravelling reveals — becomes clickable. Release early, or press a
 * [data-knit-back] control, and needles knit it back up. Typing into the page re-knits the changed stitches row by row.
 *
 * The page is drawn at its own layout position (identity mapping), so what you see is exactly what you click. A safety
 * net still works a control when a press lands on nothing while the picture shows that control.
 *
 *   var knit = Knit.start({ ...config... });     // see Knit.DEFAULTS below and references/ENGINE.md
 *   knit.unravel(); knit.knitBack(); knit.sound(true); knit.mode();
 *
 * Address flags: #still=<s> (frozen, composed), #pose=idle|pull|bare|knit &u=0.4 (a frozen state for stills),
 * #calm (no intro, no idle sway), #nointro, #q=0.5 (scene render scale), #fallback (the plain page).
 * Test hook: window.__knit (info, manual, advance, unravel, knitBack, pose, stitch, rope, heap).
 * Needs lib/hic.js. No dependencies, no network.
 */
(function (root) {
  'use strict';
  var HIC = root.HIC;
  var Knit = { version: '1.0.0' };

  // ================================================================== config
  Knit.DEFAULTS = {
    canvas: '#stage', page: '#page', card: '#card', under: '#under',
    stitch: [10, 8],                 // design px per stitch (width, height): lay the card out in these units
    palette: null,                   // yarns: ['--bg', '--ink', '#c33'] — a stitch near one of these takes it exactly
    paletteReach: 0.03,              // how near (squared distance in √linear RGB; 0.03 ≈ a tenth of the range per channel)
    yarn: { thick: 0.21, ply: 3, twist: 0.55, fuzz: 0.75, sheen: 0.22, sparkle: 0.25, wobble: 0.16 },
    table: { kind: 'wood', a: '#1c0e07', b: '#58331b', c: '#80512c', scale: 16 },   // wood | linen | gingham | felt
    lamp: { x: 0.34, y: 0.28, r: 0.68, floor: 0.42, key: '#fff0d8', amb: '#b9c7ec' },
    needles: { shaft: '#cfa46a', knob: '#6d2a1c', metal: 0 },
    margin: { side: 0.06, top: 0.07, bottom: 0.1, min: 22 },
    thread: { length: 22 },          // rope points; the loose end is about this many stitches long
    heap: { x: 0.8, y: 0.8, size: 1 },   // where the unravelled yarn piles up (fractions of the card) and how big
    reveal: { hold: 0 },             // seconds bare before knitting back by itself; 0 = until [data-knit-back] or the thread
    knit: { secs: 2.4 },             // a full knit-back takes about this long
    unravel: { secs: 2.8 },          // the Unravel control's pull takes about this long
    intro: true,                     // the page knits itself up from half-way on load (not with #calm / #still / #nointro)
    caret: { width: 2, color: '' },  // drawn caret, in stitches (a 1 px caret is thinner than a stitch); color '' = accent
    motifs: {},                      // name → { rows: ['..1..'], colors: ['var(--ink)'], repeat: true } for [data-knit-motif]
    hint: '#hint', sound: '#sound', soundPitch: 1,
    seed: 7, onMode: null
  };
  function merge(a, b) {
    var o = {}, k;
    for (k in a) o[k] = a[k];
    for (k in b || {}) {
      var v = b[k];
      o[k] = (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) ? merge(a[k], v) : v;
    }
    return o;
  }
  function $(s, r) { return typeof s === 'string' ? (r || document).querySelector(s) : s; }

  // CSS colour (any syntax the browser knows, or '--var' read from an element) → [r, g, b] 0..1 sRGB
  var cctx = null;
  function rgb(str, from) {
    if (!cctx) cctx = document.createElement('canvas').getContext('2d');
    str = String(str || '').trim();
    if (str.indexOf('--') === 0) str = getComputedStyle(from || document.documentElement).getPropertyValue(str).trim();
    var m = /^var\((--[^,)]+)/.exec(str);
    if (m) str = getComputedStyle(from || document.documentElement).getPropertyValue(m[1]).trim();
    cctx.fillStyle = '#000'; cctx.fillStyle = str || '#000';
    var s = cctx.fillStyle;
    if (s[0] === '#') return [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255];
    var n = s.match(/[\d.]+/g) || [0, 0, 0];
    return [n[0] / 255, n[1] / 255, n[2] / 255];
  }
  function lin(c) { return c.map(function (x) { return Math.pow(x, 2.2); }); }
  function ease(u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }

  // ================================================================== motifs: a pattern one stitch per cell
  // el gets one <i> per colour; each <i> is one stitch big and its box-shadows paint the cells (box-shadow has no colour,
  // so it uses the <i>'s currentColor, and a colourway change recolours the motif with no script).
  // spec: { rows: ['..1..', '.121.'], colors: ['var(--ink)', 'var(--accent)'], repeat: true|false, gap: 0 }
  //   digits index colors; any other character is empty. repeat: tile across el's width (centred); false: one picture.
  Knit.motif = function (el, spec, sw, sh) {
    if (!el || !spec || !spec.rows) return;
    var rows = spec.rows, th = rows.length, tw = 0, gap = spec.gap || 0;
    rows.forEach(function (r) { tw = Math.max(tw, r.length); });
    var period = tw + gap, cols = spec.repeat === false ? tw : Math.max(1, Math.floor(el.offsetWidth / sw));
    var reps = Math.floor((cols + gap) / period), off = spec.repeat === false ? 0 : Math.floor((cols - (reps * period - gap)) / 2);
    var sets = [];
    for (var y = 0; y < th; y++) for (var x = 0; x < cols; x++) {
      var xx = x - off; if (spec.repeat !== false && (xx < 0 || xx >= reps * period)) continue;
      var c = rows[y][((xx % period) + period) % period];
      if (c === undefined || c < '0' || c > '9') continue;
      (sets[+c] = sets[+c] || []).push(((x + 1) * sw) + 'px ' + ((y + 1) * sh) + 'px');
    }
    el.textContent = '';
    el.setAttribute('aria-hidden', 'true');
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.style.height = (th * sh) + 'px';
    if (spec.repeat === false) el.style.width = (tw * sw) + 'px';
    sets.forEach(function (list, k) {
      if (!list) return;
      var i = document.createElement('i');
      i.style.cssText = 'position:absolute;display:block;left:' + (-sw) + 'px;top:' + (-sh) + 'px;width:' + sw + 'px;height:' + sh +
        'px;color:' + ((spec.colors || [])[k] || 'currentColor') + ';box-shadow:' + list.join(',');
      el.appendChild(i);
    });
  };
  function layoutMotifs(rootEl, cfg) {
    if (!rootEl) return;
    rootEl.querySelectorAll('[data-knit-motif]').forEach(function (el) {
      Knit.motif(el, cfg.motifs[el.getAttribute('data-knit-motif')], cfg.stitch[0], cfg.stitch[1]);
    });
  }

  // ================================================================== the plain page (feature off)
  Knit.fallback = function (canvas, cfg) {
    cfg = merge(Knit.DEFAULTS, cfg || {});
    canvas = $(canvas || cfg.canvas);
    var card = $(cfg.card), under = $(cfg.under);
    var wrap = HIC.fallback(canvas, { note: cfg.fallbackNote });
    [card, under && under.querySelector('.knit-under')].forEach(function (box) {
      if (!box) return;
      box.style.zoom = '1';
      layoutMotifs(box, cfg);
      var fit = function () { box.style.zoom = String(Math.min(1, (innerWidth - 16) / Math.max(1, box.offsetWidth / (parseFloat(box.style.zoom) || 1)))); };
      fit(); addEventListener('resize', fit);
    });
    [cfg.hint, cfg.sound].forEach(function (s) { var e = $(s); if (e) e.hidden = true; });
    return wrap;
  };

  // ================================================================== shaders
  var COMMON = [
    '#version 300 es',
    'precision highp float;',
    'precision highp int;',
    'uniform sampler2D uNoise;',
    'uniform vec3 uKey, uAmb;',
    'uniform vec4 uLamp;            // x, y, radius (css px), floor',
    'uniform vec4 uYarn;            // plies, twist, sheen, sparkle',
    'const vec3 LIGHT = vec3(-0.46, -0.56, 0.69);   // towards the lamp: up-left and above (x right, y down, z up)',
    'float n1(vec2 x) { return texture(uNoise, x / 256.0).r; }',
    'vec2 n2(vec2 x) { return texture(uNoise, x / 256.0).gb; }',
    'float h21(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }',
    'float h11(float x) { return h21(vec2(x, x * 1.618 + 0.5)); }',
    'vec3 toLin(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }',
    'float lampAt(vec2 p) { vec2 d = (p - uLamp.xy) / uLamp.z; return uLamp.w + (1.38 - uLamp.w) * exp(-dot(d, d)); }',
    // one strand of yarn. s: across it (-1..1). l: along it, in diameters. T: its direction on screen. tilt: how its height
    // slopes along T. detail: how much fine structure the pixel size allows. bend: extra normal tilt (folds, the dent).
    'vec3 shadeYarn(vec3 alb, float s, float l, vec2 T, float tilt, float detail, float ao, float seed, vec2 bend) {',
    '  vec2 P = vec2(-T.y, T.x);',
    '  float h = sqrt(max(1.0 - s * s, 0.0));',
    '  // plies twisted round each other show as diagonal bands across the strand',
    '  float ph = (l * uYarn.y + s * 0.22) * uYarn.x + seed * 3.0;',
    '  float ply = 0.5 + 0.5 * cos(6.2831853 * ph), dply = sin(6.2831853 * ph);',
    '  vec2 fq = vec2(l * 2.6 + s * 0.9, s * 4.8 - l * 1.3) * 1.7 + seed * 53.0;',
    '  float fa = n1(fq), fb = n1(fq * vec2(0.5, 2.1) + 31.0);',
    '  vec3 N = vec3(P * s * 0.95 - T * tilt, h + 0.10);',
    '  N.xy += (T * 0.7 + P * 0.45) * dply * 0.38 * detail * h;',
    '  N.xy += (vec2(fa, fb) - 0.5) * 0.8 * detail;',
    '  N.xy += bend;',
    '  N = normalize(N);',
    '  float wrap = clamp((dot(N, LIGHT) + 0.32) / 1.32, 0.0, 1.0);',
    '  wrap = mix(wrap, wrap * wrap * (3.0 - 2.0 * wrap), 0.45);',
    '  float amb = 0.30 + 0.16 * N.z;',
    '  float groove = mix(1.0, 0.6 + 0.4 * smoothstep(0.05, 0.75, ply), detail);',
    '  vec3 a = alb * (0.82 + 0.36 * mix(0.5, fa, detail));',
    '  vec3 c = a * (uKey * wrap * 1.3 + uAmb * amb) * groove * ao;',
    '  float rim = pow(1.0 - h, 2.2) * clamp(dot(P * sign(s + 1e-4), LIGHT.xy) + 0.5, 0.0, 1.0);',
    '  c += mix(a, vec3(0.92, 0.88, 0.82), 0.4) * rim * uYarn.z * ao;',
    '  float glint = smoothstep(0.66, 0.96, n1(fq * vec2(2.7, 0.8) + 91.0));',
    '  c += a * glint * uYarn.w * detail * ao * uKey;',
    '  return c;',
    '}',
    'vec3 finish(vec3 c, vec2 frag) {',
    '  c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);',
    '  c = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));',
    '  return c + (h21(frag + 0.71) - 0.5) * 0.006;',
    '}'
  ].join('\n');

  // The knitted fabric as a field: for a point in stitch units, which yarn is on top, how high, which way it runs.
  // Every stitch is a V of two legs. A leg is a "grain": an ellipse tilted inward at the bottom, with a blunt (cubic)
  // profile so it reads as a strand, rising in the middle and tucking under its neighbours at both ends.
  var FIELD = [
    'uniform vec4 uCard;            // card x, y, w, h (css px)',
    'uniform vec2 uGrid;            // columns, rows',
    'uniform float uU;              // stitches unravelled, in unravel order (top row first, from the top right)',
    'uniform float uThick;          // yarn radius / stitch width',
    'uniform vec2 uWob;             // hand-knit unevenness, in stitches',
    'uniform sampler2D uNew;        // rgb: colour now, a: how far a re-knit has come',
    'uniform sampler2D uOld;        // rgb: colour before, a: lift while the stitch is being worked',
    'struct Hit { float z; float cov; float s; float l; float tilt; float seed; float m; float under; float lift;',
    '  vec2 T; vec3 a; vec3 b; float back; vec3 backCol; float fuzz; vec3 fuzzCol; };',
    'float orderOf(ivec2 c) { int n = int(uGrid.x); return float(c.y * n + ((c.y & 1) == 0 ? n - 1 - c.x : c.x)); }',
    'float existsAt(ivec2 c) { return clamp(orderOf(c) + 1.0 - uU, 0.0, 1.0); }',
    'vec2 clothCoord(vec2 p) {',
    '  vec2 f = (p - uCard.xy) / (uCard.zw / uGrid);',
    '  return f + (n2(f * 0.21 + 5.0) - 0.5) * uWob;',
    '}',
    'Hit field(vec2 f, float W, float H, float aa) {',
    '  Hit h; h.z = -1.0; h.cov = 0.0; h.s = 0.0; h.l = 0.0; h.tilt = 0.0; h.seed = 0.0; h.m = 0.0; h.under = 0.0; h.lift = 0.0;',
    '  h.T = vec2(0.0, 1.0); h.a = vec3(0.0); h.b = vec3(0.0); h.back = 0.0; h.backCol = vec3(0.0); h.fuzz = 0.0; h.fuzzCol = vec3(0.0);',
    '  ivec2 cell = ivec2(floor(f)); vec2 uv = fract(f);',
    '  int cols = int(uGrid.x), rows = int(uGrid.y);',
    '  if (cell.x < 0 || cell.x >= cols || cell.y < -1 || cell.y > rows) return h;',
    '  float R0 = uThick * W;',
    '  for (int dj = -1; dj <= 1; dj++) {',
    '    ivec2 c = ivec2(cell.x, cell.y + dj);',
    '    if (c.y < 0 || c.y >= rows) continue;',
    '    float e = existsAt(c); if (e <= 0.0) continue;',
    '    vec4 A = texelFetch(uOld, c, 0), B = texelFetch(uNew, c, 0);',
    '    float g = B.a, lift = A.a, seed = h21(vec2(c) + 0.37);',
    '    float v = uv.y - float(dj);',
    '    if (dj == 0) { h.back = e * smoothstep(0.0, 0.1, min(uv.x, 1.0 - uv.x) + 0.12); h.backCol = g > 0.5 ? B.rgb : A.rgb; }',
    '    vec2 lp = vec2(uv.x * W, v * H);',
    '    float R = R0 * (0.94 + 0.12 * seed) * (1.0 + 0.25 * lift);',
    '    if (v > -0.25 && v < 1.4) for (int k = 0; k < 2; k++) {',
    '      float sd = k == 0 ? -1.0 : 1.0;',
    '      vec2 D = vec2(-sd * 0.28 * W, 1.36 * H), dir = normalize(D), perp = vec2(dir.y, -dir.x);',
    '      float Ah = 0.5 * length(D);',
    '      vec2 q = lp - vec2((0.5 + sd * 0.19) * W, 0.56 * H);',
    '      float al = dot(q, dir), ac = dot(q, perp);',
    '      float amin = -Ah + 2.0 * Ah * (1.0 - e);          // a stitch being unravelled loses its top first',
    '      float mid = 0.5 * (amin + Ah), hl = 0.5 * (Ah - amin);',
    '      float tl = (al - mid) / max(hl, 1e-3), ta = al / Ah;',
    '      if (abs(tl) > 1.0) continue;',
    '      float r = R * pow(max(1.0 - pow(abs(tl), 3.0), 0.0), 0.3333);',
    '      float d = abs(ac);',
    '      float fill = sd < 0.0 ? clamp(g * 2.0, 0.0, 1.0) : clamp(g * 2.0 - 1.0, 0.0, 1.0);',
    '      float frac = sd < 0.0 ? 0.5 + 0.5 * ta : 0.5 - 0.5 * ta;   // the new yarn runs down the left leg, up the right',
    '      float m = g >= 1.0 ? 1.0 : smoothstep(-0.06, 0.06, fill - frac);',
    '      float fz = smoothstep(r * 1.9, r * 0.95, d);',
    '      if (fz > h.fuzz) { h.fuzz = fz; h.fuzzCol = mix(A.rgb, B.rgb, m); }',
    '      float cov = smoothstep(r + aa, r - aa, d);',
    '      if (cov < 0.004) continue;',
    '      float zc = 0.55 * R * (1.0 - ta * ta) + 0.4 * lift * R;',
    '      float s = clamp(ac / max(r, 1e-3), -1.0, 1.0);',
    '      float z = zc + r * sqrt(max(1.0 - s * s, 0.0)) + sd * 0.02 * R;',
    '      if (z > h.z) {',
    '        h.under = max(h.under, h.z);',
    '        h.z = z; h.cov = cov; h.s = s; h.T = dir; h.l = al / (2.0 * R) + seed * 7.0 + sd * 0.3;',
    '        h.tilt = -1.1 * R * ta / Ah; h.seed = seed + sd * 0.17; h.a = A.rgb; h.b = B.rgb; h.m = m; h.lift = lift;',
    '      } else h.under = max(h.under, z);',
    '    }',
    '    // a live loop shows on top of a stitch that has nothing knitted above it',
    '    bool open = c.y == 0 || existsAt(ivec2(c.x, c.y - 1)) <= 0.0;',
    '    if (open && e >= 1.0 && v > -0.6 && v < 0.35) {',
    '      vec2 rad = vec2(0.3 * W, 0.36 * H);',
    '      vec2 qn = (lp - vec2(0.5 * W, 0.0)) / rad;',
    '      float rho = length(qn), m0 = min(rad.x, rad.y);',
    '      float d = abs(rho - 1.0) * m0, r = R * 0.85;',
    '      float top = smoothstep(0.35, -0.05, qn.y);',
    '      float cov = smoothstep(r + aa, r - aa, d) * top;',
    '      float fz = smoothstep(r * 1.9, r * 0.95, d) * top;',
    '      if (fz > h.fuzz) { h.fuzz = fz; h.fuzzCol = B.rgb; }',
    '      float z = 0.32 * R + r * sqrt(max(1.0 - (d / r) * (d / r), 0.0));',
    '      if (cov > 0.004 && z > h.z) {',
    '        h.under = max(h.under, h.z);',
    '        h.z = z; h.cov = cov; h.s = clamp((rho - 1.0) * m0 / r, -1.0, 1.0);',
    '        h.T = normalize(vec2(-qn.y * rad.x, qn.x * rad.y) + 1e-5);',
    '        h.l = atan(qn.y, qn.x) * m0 / (2.0 * R) + seed * 7.0; h.tilt = 0.0;',
    '        h.seed = seed + 0.41; h.a = A.rgb; h.b = B.rgb; h.m = g >= 0.5 ? 1.0 : 0.0; h.lift = 0.0;',
    '      }',
    '    }',
    '  }',
    '  return h;',
    '}'
  ].join('\n');

  var VIEW = [
    'uniform vec2 uRes;             // target size (device px)',
    'uniform float uDpr;            // device px per css px in this target',
    'uniform vec2 uView;            // canvas size (css px)',
    'uniform vec3 uCam;             // focus x, y (css px) and zoom',
    'vec2 worldAt(vec2 fragGL) { vec2 pc = vec2(fragGL.x, uRes.y - fragGL.y) / uDpr; return uCam.xy + (pc - uView * 0.5) / uCam.z; }'
  ].join('\n');

  // pass 1: the cloth's height and coverage, so the shading pass can cast shadows from neighbours and onto the table
  var FS_HEIGHT = COMMON + '\n' + VIEW + '\n' + FIELD + '\n' + [
    'out vec4 o;',
    'void main() {',
    '  vec2 p = worldAt(gl_FragCoord.xy);',
    '  float W = uCard.z / uGrid.x, H = uCard.w / uGrid.y;',
    '  Hit h = field(clothCoord(p), W, H, 0.6 / (uDpr * uCam.z));',
    '  float zn = h.cov > 0.0 ? clamp(h.z / (2.0 * uThick * W), 0.0, 1.0) * h.cov : 0.0;',
    '  o = vec4(zn, max(h.cov, h.back * 0.9), 0.0, 1.0);',
    '}'
  ].join('\n');

  // pass 2: the table, what lies under the knitting, the stitches, the needles, the light
  var FS_SHADE = COMMON + '\n' + VIEW + '\n' + FIELD + '\n' + [
    'uniform sampler2D uHeight;     // pass 1, with mips',
    'uniform sampler2D uUnder;      // the reveal layer (premultiplied), with mips',
    'uniform float uHasUnder;',
    'uniform vec4 uTab;             // kind (0 wood, 1 linen, 2 gingham, 3 felt), scale (stitches), -, -',
    'uniform vec3 uTabA, uTabB, uTabC;',
    'uniform vec4 uDent;            // x, y, radius, depth: the cloth gives under the pointer',
    'uniform vec4 uNeedle[2];       // tip x, y, angle, visibility',
    'uniform vec3 uShaft, uKnob;',
    'uniform vec2 uNeedleLR;        // length, radius (css px)',
    'uniform float uMetal, uFuzz;',
    'out vec4 o;',
    'vec3 tableAt(vec2 p, float unit) {',
    '  vec2 q = p / unit;',
    '  int kind = int(uTab.x + 0.5);',
    '  if (kind == 1) {   // linen: plain weave, slubby threads',
    '    vec2 w = q * 2.2;',
    '    float over = mod(floor(w.x) + floor(w.y), 2.0);',
    '    float th = mix(0.5 + 0.5 * sin(fract(w.y) * 3.14159), 0.5 + 0.5 * sin(fract(w.x) * 3.14159), over);',
    '    float slub = n1(vec2(q.x * 0.25, q.y * 7.0)) * 0.5 + n1(vec2(q.x * 7.0, q.y * 0.25)) * 0.5;',
    '    vec3 c = mix(uTabA, uTabB, clamp(0.25 + 0.35 * th + 0.5 * (slub - 0.5), 0.0, 1.0));',
    '    return c * (0.9 + 0.12 * n1(q * 0.07));',
    '  }',
    '  if (kind == 2) {   // gingham: two crossing stripes, darker where they cross, woven',
    '    vec2 g = fract(q / uTab.y);',
    '    float k = step(0.5, g.x) + step(0.5, g.y);',
    '    vec3 c = k > 1.5 ? uTabB : (k > 0.5 ? mix(uTabA, uTabB, 0.45) : uTabA);',
    '    vec2 w = q * 2.4;',
    '    float th = 0.5 + 0.5 * sin(w.x * 6.2831853) * sin(w.y * 6.2831853);',
    '    return c * (0.88 + 0.12 * th + 0.1 * (n1(q * 1.7) - 0.5)) * (0.94 + 0.08 * n1(q * 0.05));',
    '  }',
    '  if (kind == 3) {   // felt or slate: matted, no direction',
    '    float n = n1(q * 1.3) * 0.5 + n1(q * 4.1 + 7.0) * 0.3 + n1(q * 11.0) * 0.2;',
    '    return mix(uTabA, uTabB, n) * (0.92 + 0.1 * n1(q * 0.06));',
    '  }',
    '  // wood: planks across, each with its own grain, rings and tone',
    '  float pl = q.y / uTab.y + 0.31, id = floor(pl), fy = fract(pl);',
    '  float o0 = h11(id) * 400.0;',
    '  vec2 g = vec2(q.x * 0.018 + o0, (q.y + id * 7.0) * 0.32);',
    '  float warp = (n1(g * vec2(1.0, 2.0)) - 0.5) * 2.6 + (n1(g * 3.7 + 13.0) - 0.5) * 0.7;',
    '  float ring = fract((q.y + id * 3.1) * 0.55 + warp);',
    '  float fine = n1(vec2(q.x * 0.45 + o0, (q.y + warp) * 5.5));',
    '  float grain = smoothstep(0.0, 0.55, ring) * smoothstep(1.0, 0.6, ring) * 0.55 + fine * 0.45;',
    '  vec3 c = mix(uTabA, uTabB, grain);',
    '  c = mix(c, uTabC, 0.3 * smoothstep(0.68, 0.95, n1(g * 2.0 + 40.0)));',
    '  c *= 1.0 - 0.35 * smoothstep(0.7, 0.95, n1(vec2(q.x * 0.9, (q.y + warp) * 9.0) + 70.0));',
    '  c *= 0.84 + 0.3 * h11(id + 1.3);',
    '  float seam = smoothstep(0.0, 0.012, fy) * smoothstep(1.0, 0.988, fy);',
    '  return c * mix(0.32, 1.0, seam) * (1.0 + 0.2 * smoothstep(0.97, 0.985, fy) * seam);',
    '}',
    'void main() {',
    '  vec2 p = worldAt(gl_FragCoord.xy);',
    '  float px = 1.0 / (uDpr * uCam.z);',
    '  float W = uCard.z / uGrid.x, H = uCard.w / uGrid.y, R0 = uThick * W;',
    '  float lamp = lampAt(p);',
    '  vec2 suv = gl_FragCoord.xy / uRes;',
    '  vec2 toL = vec2(LIGHT.x, -LIGHT.y) * uCam.z / uView;          // one css px towards the lamp, in scene uv',
    '  vec3 col = tableAt(p, W) * lamp;',
    '  // what lies under the knitting: a flat live layer on the table, with its own soft shadow',
    '  if (uHasUnder > 0.5) {',
    '    vec2 puv = p / uView;',
    '    vec4 U = texture(uUnder, puv);',
    '    float ush = textureLod(uUnder, puv + LIGHT.xy * W * 0.9 / uView, 3.5).a;',
    '    col *= 1.0 - 0.42 * ush * (1.0 - U.a);',
    '    vec3 ul = U.a > 0.001 ? toLin(U.rgb / U.a) * U.a : vec3(0.0);',
    '    col = col * (1.0 - U.a) + ul * lamp * (0.95 + 0.06 * n1(p * 0.8));',
    '  }',
    '  // the cloth shadows what is under it (blurred by the height pass mips)',
    '  float cs1 = textureLod(uHeight, suv + toL * W * 1.2, 3.0).g, cs2 = textureLod(uHeight, suv + toL * W * 3.0, 5.0).g;',
    '  col *= 1.0 - 0.5 * cs1 - 0.22 * cs2;',
    '  // the cloth gives a little under the pointer, and it lies in soft folds',
    '  vec2 dd = (p - uDent.xy) / uDent.z;',
    '  float press = exp(-dot(dd, dd) * 1.7) * uDent.w;',
    '  vec2 bend = dd * press * 1.8;',
    '  vec2 f = clothCoord(p);',
    '  vec2 fo = f * 0.035 + 17.0; float fe = 0.035;',
    '  bend += vec2(n1(fo + vec2(fe, 0.0)) - n1(fo - vec2(fe, 0.0)), n1(fo + vec2(0.0, fe)) - n1(fo - vec2(0.0, fe))) * 8.0;',
    '  Hit h = field(f, W, H, px * 0.8);',
    '  float detail = smoothstep(2.0, 6.0, 2.0 * R0 / px);',
    '  // stocking stitch rolls at its sides: the roll catches the light, then turns under',
    '  float eL = f.x, eR = uGrid.x - f.x;',
    '  float roll = 1.0 + 0.1 * smoothstep(2.5, 0.8, eL) - 0.2 * smoothstep(0.8, 0.0, eL) - 0.06 * smoothstep(2.5, 0.8, eR) - 0.22 * smoothstep(0.8, 0.0, eR);',
    '  float rowTone = (0.965 + 0.07 * h11(floor(f.y) * 1.7 + 4.0)) * roll;',
    '  if (h.back > 0.0) col = mix(col, toLin(h.backCol) * 0.08 * lamp, h.back);',
    '  if (h.cov > 0.0) {',
    '    vec3 alb = toLin(mix(h.a, h.b, h.m)) * rowTone * (0.94 + 0.12 * fract(h.seed * 7.1));',
    '    float zn = clamp(h.z / (2.0 * R0), 0.0, 1.0);',
    '    float ao = mix(0.3, 1.0, smoothstep(0.05, 0.9, zn));',
    '    ao *= mix(1.0, 0.8 + 0.2 * smoothstep(0.0, 0.5 * R0, h.z - h.under), 0.6);',
    '    // contact shadow: a neighbouring strand between this one and the lamp',
    '    float hz1 = texture(uHeight, suv + toL * R0 * 0.8).r, hz2 = texture(uHeight, suv + toL * R0 * 1.8).r;',
    '    float occ = smoothstep(0.0, 0.25, hz1 - zn - 0.16) * 0.55 + smoothstep(0.0, 0.3, hz2 - zn - 0.34) * 0.45;',
    '    ao *= (1.0 - 0.6 * occ) * (1.0 - 0.22 * press);',
    '    vec3 yc = shadeYarn(alb, h.s, h.l, h.T, h.tilt, detail, ao, h.seed, bend) * lamp * (1.0 + 0.45 * h.lift);',
    '    col = mix(col, yc, h.cov);',
    '  }',
    '  if (h.fuzz > 0.0) {   // loose fibres stand off the yarn',
    '    float fn = n1(f * vec2(43.0, 35.0) + 5.0) * 0.6 + n1(f * vec2(17.0, 21.0)) * 0.4;',
    '    float fa = h.fuzz * (1.0 - h.cov) * smoothstep(0.25, 0.8, fn + h.fuzz * 0.4) * (0.3 + 0.6 * detail) * uFuzz;',
    '    col = mix(col, toLin(h.fuzzCol) * lamp * 0.7, fa * 0.85);',
    '  }',
    '  // needles: a pair of rods meeting where the next stitch is made, with their shadows',
    '  for (int n = 0; n < 2; n++) {',
    '    vec4 nd = uNeedle[n];',
    '    if (nd.w <= 0.0) continue;',
    '    vec2 ax = -vec2(cos(nd.z), sin(nd.z));',
    '    float L = uNeedleLR.x, Rn = uNeedleLR.y;',
    '    for (int pass = 0; pass < 2; pass++) {',
    '      vec2 q = p - nd.xy;',
    '      float lift = 0.5 + clamp(dot(q, ax), 0.0, L) * 0.04;',
    '      if (pass == 0) q += LIGHT.xy * lift * W * 0.8;',
    '      float tau = clamp(dot(q, ax), 0.0, L);',
    '      vec2 off = q - ax * tau;',
    '      float knob = smoothstep(L - 1.4 * W, L - 0.3 * W, tau);',
    '      float rr = Rn * mix(0.2, 1.0, smoothstep(0.0, 6.0 * W, tau)) * (1.0 + 0.9 * knob);',
    '      float d = length(off);',
    '      if (pass == 0) { float soft = (0.5 + lift * 0.5) * W * 0.5; col *= 1.0 - 0.5 * smoothstep(rr + soft, rr - soft * 0.6, d) * nd.w; }',
    '      else {',
    '        float cov = smoothstep(rr + px, rr - px, d) * nd.w;',
    '        if (cov > 0.0) {',
    '          vec2 P = vec2(ax.y, -ax.x);',
    '          float s = clamp(dot(off, P) / rr, -1.0, 1.0);',
    '          vec3 N = normalize(vec3(P * s, sqrt(max(1.0 - s * s, 0.0)) + 0.05));',
    '          float gr = n1(vec2(tau / W * 0.5, s * 2.2 + float(n) * 9.0));',
    '          vec3 alb = mix(toLin(uShaft) * (0.78 + 0.4 * gr), toLin(uShaft), uMetal);',
    '          alb = mix(alb, toLin(uKnob), knob);',
    '          float nl = clamp((dot(N, LIGHT) + 0.25) / 1.25, 0.0, 1.0);',
    '          float sp = pow(max(dot(N, normalize(LIGHT + vec3(0.0, 0.0, 1.0))), 0.0), mix(60.0, 140.0, uMetal));',
    '          vec3 nc = alb * (uKey * nl * 1.2 + uAmb * 0.3) * lamp + uKey * sp * mix(0.5, 1.6, uMetal) * lamp;',
    '          col = mix(col, nc, cov);',
    '        }',
    '      }',
    '    }',
    '  }',
    '  vec2 vq = (vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr) / uView - 0.5;',
    '  col *= 1.0 - 0.5 * smoothstep(0.35, 0.95, length(vq * vec2(1.0, 0.92)) * 1.25);',
    '  o = vec4(finish(col, gl_FragCoord.xy), 1.0);',
    '}'
  ].join('\n');

  // every stitch gets one yarn: the colour that covers more of it (two clusters, never a blur), then the nearest yarn
  var FS_DOWN = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D uPage;',
    'uniform vec4 uCardUV;          // the card in page uv (top-down)',
    'uniform vec2 uGrid;',
    'uniform vec3 uPal[12];',
    'uniform int uPalN;',
    'uniform float uPalMax;         // snap only colours this close to a yarn (a photo or a swatch keeps its own)',
    'out vec4 o;',
    'void main() {',
    '  vec2 ij = floor(gl_FragCoord.xy);',
    '  vec3 t[16]; vec3 mean = vec3(0.0);',
    '  for (int a = 0; a < 4; a++) for (int b = 0; b < 4; b++) {',
    '    vec2 f = (ij + (vec2(float(a), float(b)) + 0.5) * 0.25) / uGrid;',
    '    vec3 c = pow(textureLod(uPage, uCardUV.xy + f * uCardUV.zw, 0.0).rgb, vec3(2.2));',
    '    t[a * 4 + b] = c; mean += c;',
    '  }',
    '  mean /= 16.0;',
    '  vec3 lo = t[0], hi = t[0]; float ylo = 9.0, yhi = -1.0;',
    '  for (int n = 0; n < 16; n++) { float y = dot(t[n], vec3(0.2126, 0.7152, 0.0722)); if (y < ylo) { ylo = y; lo = t[n]; } if (y > yhi) { yhi = y; hi = t[n]; } }',
    '  vec3 outc = mean, ax = hi - lo; float d2 = dot(ax, ax);',
    '  if (d2 > 0.0015) {',
    '    vec3 sa = vec3(0.0), sb = vec3(0.0); float na = 0.0, nb = 0.0;',
    '    for (int n = 0; n < 16; n++) { if (dot(t[n] - lo, ax) / d2 < 0.5) { sa += t[n]; na += 1.0; } else { sb += t[n]; nb += 1.0; } }',
    '    // the winner is shown by its purest tap (the extreme), so anti-aliased edges never invent an in-between yarn',
    '    outc = nb > na ? hi : (nb < na ? lo : (dot(sb, vec3(1.0)) > dot(sa, vec3(1.0)) ? hi : lo));',
    '  }',
    '  if (uPalN > 0) {',
    '    float best = 1e9; vec3 bc = outc;',
    '    for (int n = 0; n < 12; n++) { if (n >= uPalN) break; vec3 d = sqrt(outc) - sqrt(uPal[n]); float e = dot(d, d); if (e < best) { best = e; bc = uPal[n]; } }',
    '    if (best < uPalMax) outc = bc;',
    '  }',
    '  o = vec4(pow(outc, vec3(1.0 / 2.2)), 1.0);',
    '}'
  ].join('\n');

  var FS_COPY = '#version 300 es\nprecision highp float;\nin vec2 vUv; out vec4 o; uniform sampler2D uTex;\nvoid main() { o = vec4(texture(uTex, vUv).rgb, 1.0); }';
  var FS_BLOB = '#version 300 es\nprecision highp float;\nuniform vec4 uBlob; out vec4 o;\nvoid main() { vec2 d = (gl_FragCoord.xy - uBlob.xy) / uBlob.z; o = vec4(0.0, 0.0, 0.0, exp(-dot(d, d) * 2.0) * uBlob.w); }';

  // loose yarn (the thread, the strand, the heap) as ribbons: two vertices per point, shaded as one strand
  var VS_YARN = [
    '#version 300 es',
    'precision highp float;',
    'precision highp int;',
    'layout(location = 0) in vec4 aPT;    // position, tangent',
    'layout(location = 1) in vec4 aSL;    // side, length along (units), stitch fraction, order',
    'layout(location = 2) in float aW;    // width scale',
    'uniform vec2 uOrigin; uniform float uScale, uHalf, uShadow, uCount;',
    'uniform vec3 uCam; uniform vec2 uView, uGrid;',
    'uniform sampler2D uNew;',
    'out float vS; out float vL; out float vAge; out float vSeed; out vec2 vT; out vec2 vP; out vec3 vCol;',
    'void main() {',
    '  vec2 T = normalize(aPT.zw + 1e-6), P = vec2(-T.y, T.x);',
    '  vec2 pos = uOrigin + aPT.xy * uScale + P * aSL.x * uHalf * aW * mix(1.0, 1.7, uShadow);',
    '  pos += vec2(0.63, 0.77) * uHalf * 1.5 * uShadow;',
    '  int cols = int(uGrid.x), nst = cols * int(uGrid.y);',
    '  int k = clamp(int(aSL.z * float(nst)), 0, nst - 1);',
    '  int j = k / cols, ii = k - j * cols, i = (j & 1) == 0 ? cols - 1 - ii : ii;',
    '  vCol = texelFetch(uNew, ivec2(i, j), 0).rgb;',
    '  vS = aSL.x; vL = aSL.y * uScale / (2.0 * uHalf); vT = T; vP = pos; vAge = uCount - aSL.w; vSeed = fract(aSL.z * 913.7 + aSL.w * 0.013);',
    '  vec2 sc = (pos - uCam.xy) * uCam.z + uView * 0.5;',
    '  gl_Position = vec4(sc.x / uView.x * 2.0 - 1.0, 1.0 - sc.y / uView.y * 2.0, 0.0, 1.0);',
    '}'
  ].join('\n');
  var FS_YARN = COMMON + '\n' + [
    'in float vS; in float vL; in float vAge; in float vSeed; in vec2 vT; in vec2 vP; in vec3 vCol;',
    'uniform float uHalf, uPx, uShadow, uBury;',
    'out vec4 o;',
    'void main() {',
    '  float a = abs(vS);',
    '  if (uShadow > 0.5) { float k = 1.0 - a * a; o = vec4(0.0, 0.0, 0.0, 0.32 * k * k); return; }',
    '  vec2 T = normalize(vT);',
    '  float detail = smoothstep(2.0, 6.0, 2.0 * uHalf / uPx);',
    '  float bury = uBury * smoothstep(0.0, 1.0, vAge / 4000.0);   // older yarn lies deeper in the heap',
    '  float ao = mix(1.0, 0.4, bury);',
    '  vec3 c = shadeYarn(toLin(vCol), vS, vL, T, 0.0, detail, ao, vSeed, vec2(0.0)) * lampAt(vP);',
    '  float cov = smoothstep(1.0, 1.0 - 1.6 * uPx / uHalf, a);',
    '  float fz = n1(vec2(vL * 6.0, vS * 2.5 + vSeed * 40.0));',
    '  cov *= mix(1.0, smoothstep(0.1, 0.55, fz + (1.0 - a) * 2.0), detail * 0.7);',
    '  o = vec4(finish(c, gl_FragCoord.xy) * cov, cov);',
    '}'
  ].join('\n');

  // ================================================================== the engine
  Knit.start = function (userCfg) {
    var cfg = merge(Knit.DEFAULTS, userCfg || {});
    var canvas = $(cfg.canvas), page = $(cfg.page), card = $(cfg.card), under = $(cfg.under);
    if (!canvas || !page || !card) throw new Error('knit: canvas, page and card are required');
    if (!HIC.supported('webgl')) { Knit.fallback(canvas, cfg); return null; }

    var S = HIC.stage(canvas, { gl: { antialias: false, preserveDrawingBuffer: true, alpha: false } });
    var gl = S.gl, G = HIC.gl;
    var hint = $(cfg.hint), sndBtn = $(cfg.sound);
    var mount = card.parentElement;
    var underBox = under ? under.querySelector('.knit-under') : null, underMount = underBox ? underBox.parentElement : null;
    var SW = cfg.stitch[0], SH = cfg.stitch[1];
    var qParam = HIC.param('q'), fixedQ = qParam !== null ? Math.max(0.25, Math.min(1, parseFloat(qParam) || 1)) : (HIC.still !== null ? 1 : 0);
    var noIntro = HIC.param('nointro') !== null || HIC.calm || HIC.still !== null || !cfg.intro;

    var P = {
      down: G.program(gl, null, FS_DOWN),
      height: G.program(gl, null, FS_HEIGHT),
      shade: G.program(gl, null, FS_SHADE),
      copy: G.program(gl, null, FS_COPY),
      blob: G.program(gl, null, FS_BLOB),
      yarn: G.program(gl, VS_YARN, FS_YARN)
    };

    // ---- textures
    var noise = (function () {
      var n = 256, d = new Uint8Array(n * n * 4), r = HIC.rng(cfg.seed * 7919 + 13);
      for (var i = 0; i < d.length; i++) d[i] = (r() * 256) | 0;
      var t = G.texture(gl, { w: n, h: n, data: d, wrap: 'repeat', mips: true });
      gl.generateMipmap(gl.TEXTURE_2D);
      return t;
    })();
    var texPage = G.texture(gl, { mips: true }), texUnder = G.texture(gl, { mips: true });
    var texNew = null, texOld = null, down = null;
    var heightT = null, sceneT = null, sceneW = 0, sceneH = 0;

    // ---- the grid and the stitches (CPU side)
    var L = { cols: 0, rows: 0, NST: 0, z: 1, cx: 0, cy: 0, cw: 1, ch: 1, W: 10, H: 8, Cw: 0, Ch: 0, q: fixedQ || 1 };
    var bufNew, bufOld, target, readBuf, t0, isActive, active = [], texDirty = true, firstRead = true, pageFresh = false;
    var stats = { reads: 0, lastChanged: 0, lastRows: 0, sweeps: 0 };
    var sweep = null;

    function allocGrid(cols, rows) {
      L.cols = cols; L.rows = rows; L.NST = cols * rows;
      var n = L.NST * 4;
      bufNew = new Uint8Array(n); bufOld = new Uint8Array(n); target = new Uint8Array(n); readBuf = new Uint8Array(n);
      t0 = new Float32Array(L.NST); isActive = new Uint8Array(L.NST); active = [];
      [texNew, texOld].forEach(function (t) { if (t) gl.deleteTexture(t); });
      if (down) { gl.deleteFramebuffer(down.fb); gl.deleteTexture(down.tex); }
      texNew = G.texture(gl, { w: cols, h: rows, filter: 'nearest' });
      texOld = G.texture(gl, { w: cols, h: rows, filter: 'nearest' });
      down = G.target(gl, cols, rows, { filter: 'nearest' });
      firstRead = true; texDirty = true;
    }
    function sceneTarget(old, w, h, mips) {
      if (old) { gl.deleteFramebuffer(old.fb); gl.deleteTexture(old.tex); }
      var o = { w: w, h: h, tex: G.texture(gl, { w: w, h: h, mips: mips }) };
      if (mips) gl.generateMipmap(gl.TEXTURE_2D);
      o.fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, o.fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, o.tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return o;
    }
    function allocScene() {
      var w = Math.max(2, Math.round(canvas.width * L.q)), h = Math.max(2, Math.round(canvas.height * L.q));
      if (w === sceneW && h === sceneH) return;
      sceneW = w; sceneH = h;
      sceneT = sceneTarget(sceneT, w, h, false);
      heightT = sceneTarget(heightT, w, h, true);
      sceneDirty = true;
    }
    // stitch k in unravel order → its column and row; its screen position (top of the stitch)
    function ij(k) {
      k = Math.max(0, Math.min(L.NST - 1, Math.floor(k)));
      var j = Math.floor(k / L.cols), ii = k - j * L.cols;
      return [(j & 1) === 0 ? L.cols - 1 - ii : ii, j];
    }
    function stitchPos(k) { var c = ij(k); return [L.cx + (c[0] + 0.5) * L.W, L.cy + (c[1] + 0.1) * L.H]; }

    // ---- state
    var K = {
      mode: 'boot', U: 0, speed: 0, T: 0, introT: 0, autoT: 0, knitT: 0, bareT: 0,
      hand: { x: 0, y: 0 }, handFrom: [0, 0], cam: { x: 0, y: 0, z: 1 },
      dent: { x: -1e4, y: -1e4, d: 0, on: 0, tx: -1e4, ty: -1e4, press: 0 },
      needle: [{ x: 0, y: 0, a: 0, v: 0 }, { x: 0, y: 0, a: 0, v: 0 }], needleOn: 0, nx: 0, ny: 0, heapShown: 0, touched: false
    };
    var sceneDirty = true, manual = false, probed = false, readyDone = false, posed = null;

    // ---- the loose thread: a little verlet rope
    var RN = Math.max(8, cfg.thread.length | 0);
    var rope = { x: new Float32Array(RN), y: new Float32Array(RN), px: new Float32Array(RN), py: new Float32Array(RN), seg: 10, pin: false, ex: 0, ey: 0, energy: 0, sway: new Float32Array(RN * 2) };
    function ropeReset() {
      var a = stitchPos(0);
      rope.seg = L.W * 1.05; rope.pin = false;
      // it lies on the table beside the cloth: out to the side, then down along the edge in a lazy S
      var room = Math.max(1.4, Math.min(5.5, (S.W - L.cx - L.cw) / L.W - 1.0));
      for (var i = 0; i < RN; i++) {
        var u = i / (RN - 1);
        rope.x[i] = rope.px[i] = a[0] + L.W * (0.3 + room * (0.7 * (1 - Math.pow(1 - Math.min(1, u * 2.6), 3)) + 0.22 * Math.sin(u * 6.5) * u));
        rope.y[i] = rope.py[i] = a[1] + L.W * ((RN - 1) * 0.86 * u - 1.0 * Math.sin(u * 3.0));
      }
      rope.sway.fill(0);
      for (var n = 0; n < 60; n++) ropeStep(1 / 60, rope.x[0], rope.y[0]);
    }
    function ropeStep(dt, ax, ay) {
      var damp = 0.82, en = 0, i;
      for (i = 1; i < RN; i++) {
        if (rope.pin && i === RN - 1) continue;
        var vx = (rope.x[i] - rope.px[i]) * damp, vy = (rope.y[i] - rope.py[i]) * damp;
        rope.px[i] = rope.x[i]; rope.py[i] = rope.y[i];
        rope.x[i] += vx; rope.y[i] += vy; en += vx * vx + vy * vy;
      }
      for (var it = 0; it < 10; it++) {
        rope.x[0] = ax; rope.y[0] = ay;
        if (rope.pin) { rope.x[RN - 1] = rope.ex; rope.y[RN - 1] = rope.ey; }
        for (i = 0; i < RN - 1; i++) {
          var dx = rope.x[i + 1] - rope.x[i], dy = rope.y[i + 1] - rope.y[i], d = Math.hypot(dx, dy) || 1e-6, df = (d - rope.seg) / d;
          var m0 = i === 0 ? 0 : 1, m1 = (rope.pin && i + 1 === RN - 1) ? 0 : 1, mt = m0 + m1;
          if (!mt) continue;
          rope.x[i] += dx * df * m0 / mt; rope.y[i] += dy * df * m0 / mt;
          rope.x[i + 1] -= dx * df * m1 / mt; rope.y[i + 1] -= dy * df * m1 / mt;
        }
      }
      rope.energy = en / (L.W * L.W);
    }
    // the idle breathes: a slow wave runs down the loose end (a draught over the table), never in #calm or stills
    function ropeSway(t) {
      if (HIC.calm) return;
      for (var i = 1; i < RN; i++) {
        var u = i / (RN - 1), amp = 0.22 * L.W * u * u;
        var sx = Math.sin(t * 1.15 - i * 0.42) * amp, sy = Math.sin(t * 0.83 - i * 0.31 + 1.7) * amp * 0.5;
        var ox = rope.sway[i * 2], oy = rope.sway[i * 2 + 1];
        rope.x[i] += sx - ox; rope.y[i] += sy - oy; rope.px[i] += sx - ox; rope.py[i] += sy - oy;
        rope.sway[i * 2] = sx; rope.sway[i * 2 + 1] = sy;
      }
    }
    function ropeDist(x, y) { var b = 1e9; for (var i = 2; i < RN; i++) b = Math.min(b, Math.hypot(rope.x[i] - x, rope.y[i] - y)); return b; }

    // ---- the heap: one long tangled line laid down in order, in stitch widths around (0, 0)
    var HEAP_N = 16000, heapPts = new Float32Array(HEAP_N * 2);
    (function () {
      var r = HIC.rng(cfg.seed * 31 + 5), tab = new Float32Array(1024), i;
      for (i = 0; i < 1024; i++) tab[i] = r();
      var nz = function (x) { var i0 = Math.floor(x), f = x - i0, a = tab[i0 & 1023], b = tab[(i0 + 1) & 1023], u = f * f * (3 - 2 * f); return a + (b - a) * u; };
      var phi = 0, orbit = 0;
      for (var n = 0; n < HEAP_N; n++) {
        var u = n / HEAP_N, Rm = 2.2 + 17.5 * Math.sqrt(u);
        orbit += 0.0085 + 0.03 * (nz(n * 0.0019 + 11) - 0.4);
        var cr = Rm * (0.08 + 0.92 * Math.pow(nz(n * 0.0033 + 3), 0.8)), ca = orbit + 4.5 * nz(n * 0.0011 + 70);
        var lr = 1.5 + 3.3 * nz(n * 0.012 + 29);
        phi += 0.5 / lr * (nz(n * 0.0007 + 300) > 0.22 ? 1 : -1);
        var x = cr * Math.cos(ca) + lr * Math.cos(phi) * (0.75 + 0.5 * nz(n * 0.005 + 150));
        var y = (cr * Math.sin(ca) + lr * Math.sin(phi)) * 0.84;
        // unravelled yarn keeps a crimp: one wave per stitch it used to be
        var cw = Math.sin(n * 2.5133) * (0.12 + 0.12 * nz(n * 0.03 + 500));
        heapPts[n * 2] = x + Math.cos(phi) * cw; heapPts[n * 2 + 1] = y + Math.sin(phi) * cw;
      }
    })();
    var STRIDE = 9;
    function ribbon(maxPts) {
      var vao = gl.createVertexArray(), vbo = gl.createBuffer(), data = new Float32Array(maxPts * 2 * STRIDE);
      gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, STRIDE * 4, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, STRIDE * 4, 16);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, STRIDE * 4, 32);
      gl.bindVertexArray(null);
      return { vao: vao, vbo: vbo, data: data };
    }
    // pts: [x, y, …]; idx(i, len) → stitch fraction (colour); wid(i) → width scale; ord(i) → order (heap depth)
    function fillRibbon(rb, pts, count, start, idx, wid, ord) {
      var d = rb.data, o = start * 2 * STRIDE, len = 0;
      for (var i = 0; i < count; i++) {
        var x = pts[i * 2], y = pts[i * 2 + 1], a = Math.max(0, i - 1), b = Math.min(count - 1, i + 1);
        var tx = pts[b * 2] - pts[a * 2], ty = pts[b * 2 + 1] - pts[a * 2 + 1], tl = Math.hypot(tx, ty) || 1;
        if (i > 0) len += Math.hypot(x - pts[i * 2 - 2], y - pts[i * 2 - 1]);
        var k = idx(i, len), w = wid ? wid(i) : 1, n = ord ? ord(i) : 1e9;
        for (var s = -1; s <= 1; s += 2) { d[o++] = x; d[o++] = y; d[o++] = tx / tl; d[o++] = ty / tl; d[o++] = s; d[o++] = len; d[o++] = k; d[o++] = n; d[o++] = w; }
      }
      return start + count;
    }
    var heap = ribbon(HEAP_N);
    fillRibbon(heap, heapPts, HEAP_N, 0, function (i) { return i / HEAP_N; }, null, function (i) { return i; });
    gl.bindBuffer(gl.ARRAY_BUFFER, heap.vbo); gl.bufferSubData(gl.ARRAY_BUFFER, 0, heap.data);
    var strand = ribbon(1600), strandPts = new Float32Array(1600 * 2);
    var heapScale = 1;
    function heapAt() { return [L.cx + L.cw * cfg.heap.x, L.cy + L.ch * cfg.heap.y]; }
    function heapTop() {
      var n = Math.max(0, Math.min(HEAP_N - 1, K.heapShown - 1)), c = heapAt();
      return [c[0] + heapPts[n * 2] * L.W * heapScale, c[1] + heapPts[n * 2 + 1] * L.W * heapScale];
    }

    // ---- layout: the card is laid out in design px and zoomed to fit; the page is drawn exactly where it is laid out
    function layout() {
      S.resize();
      card.style.zoom = '1'; if (underBox) underBox.style.zoom = '1';
      layoutMotifs(card, cfg);
      L.Cw = card.offsetWidth; L.Ch = card.offsetHeight;
      if (underBox) { underBox.style.width = L.Cw + 'px'; underBox.style.height = L.Ch + 'px'; layoutMotifs(underBox, cfg); }
      var cols = Math.max(4, Math.round(L.Cw / SW)), rows = Math.max(4, Math.round(L.Ch / SH));
      var mg = cfg.margin, mx = Math.max(mg.min, S.W * mg.side), mt = Math.max(mg.min, S.H * mg.top), mb = Math.max(mg.min * 1.5, S.H * mg.bottom);
      L.z = Math.max(0.15, Math.min((S.W - 2 * mx) / L.Cw, (S.H - mt - mb) / L.Ch));
      L.cw = L.Cw * L.z; L.ch = L.Ch * L.z; L.W = SW * L.z; L.H = SH * L.z;
      L.cx = Math.round((S.W - L.cw) / 2); L.cy = Math.round(mt + (S.H - mt - mb - L.ch) / 2);
      [mount, underMount].forEach(function (m) { if (m) { m.style.left = L.cx + 'px'; m.style.top = L.cy + 'px'; } });
      card.style.zoom = String(L.z); if (underBox) underBox.style.zoom = String(L.z);
      heapScale = Math.sqrt(L.NST ? cols * rows / 9600 : 1) * cfg.heap.size;
      if (cols !== L.cols || rows !== L.rows) { allocGrid(cols, rows); heapScale = Math.sqrt(cols * rows / 9600) * cfg.heap.size; if (K.mode !== 'boot' && K.mode !== 'intro') { K.U = 0; setMode('idle'); } }
      allocScene();
      K.cam.x = S.W / 2; K.cam.y = S.H / 2;
      if (K.mode !== 'boot') { if (posed) pose(posed.name, posed.u); else if (K.mode === 'idle') ropeReset(); }
      placeCaret();
      sceneDirty = true;
      S.requestPaint();
    }

    // ---- reading the page into stitches
    var palLin = new Float32Array(36), palN = 0;
    function readPalette() {
      palN = 0;
      (cfg.palette || []).slice(0, 12).forEach(function (s) { var c = lin(rgb(s, card)); palLin[palN * 3] = c[0]; palLin[palN * 3 + 1] = c[1]; palLin[palN * 3 + 2] = c[2]; palN++; });
    }
    function readStitches() {
      pageFresh = false;
      readPalette();
      gl.bindFramebuffer(gl.FRAMEBUFFER, down.fb); gl.viewport(0, 0, L.cols, L.rows);
      P.down.use(); G.bind(gl, P.down, { uPage: texPage });
      gl.uniform4f(P.down.u.uCardUV, L.cx / S.W, L.cy / S.H, L.cw / S.W, L.ch / S.H);
      gl.uniform2f(P.down.u.uGrid, L.cols, L.rows);
      gl.uniform3fv(P.down.u.uPal, palLin); gl.uniform1i(P.down.u.uPalN, palN); gl.uniform1f(P.down.u.uPalMax, cfg.paletteReach);
      gl.disable(gl.BLEND); G.fullscreen(gl);
      gl.readPixels(0, 0, L.cols, L.rows, gl.RGBA, gl.UNSIGNED_BYTE, readBuf);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      stats.reads++;
      var NST = L.NST, k, o;
      if (firstRead) {
        firstRead = false;
        for (k = 0; k < NST; k++) { o = k * 4; for (var c = 0; c < 3; c++) target[o + c] = bufNew[o + c] = bufOld[o + c] = readBuf[o + c]; bufNew[o + 3] = 255; bufOld[o + 3] = 0; }
        texDirty = true; return;
      }
      // which stitches changed, row by row
      var rowsHit = [], changed = 0;
      for (var j = 0; j < L.rows; j++) {
        var list = null;
        for (var i = 0; i < L.cols; i++) {
          o = (j * L.cols + i) * 4;
          if (Math.abs(readBuf[o] - target[o]) + Math.abs(readBuf[o + 1] - target[o + 1]) + Math.abs(readBuf[o + 2] - target[o + 2]) > 9) (list = list || []).push(i);
        }
        if (list) { rowsHit.push([j, list]); changed += list.length; }
      }
      if (!changed) return;
      stats.lastChanged = changed; stats.lastRows = rowsHit.length;
      // not idle (being pulled, bare, being knitted): the change goes straight in
      var animate = K.mode === 'idle' && HIC.still === null;
      // knitted in the way knitting grows: the lowest changed row first, each row in its own direction
      var rowLag = Math.min(0.02, 0.6 / rowsHit.length), rank = 0, sw = { t0: K.T, t1: K.T, rows: [] };
      for (var r = rowsHit.length - 1; r >= 0; r--) {
        var jj = rowsHit[r][0], li = rowsHit[r][1], x0 = li[0], x1 = li[li.length - 1], span = x1 - x0 + 1;
        var dur = Math.min(0.45, Math.max(0.06, span * 0.012)), ltr = (jj & 1) === 0, base = K.T + rank * rowLag; rank++;
        sw.rows.push([jj, x0, x1, ltr, base, dur]); sw.t1 = Math.max(sw.t1, base + dur);
        for (var n = 0; n < li.length; n++) {
          var ii2 = li[n], idx = jj * L.cols + ii2; o = idx * 4;
          if (bufNew[o + 3] >= 128) { bufOld[o] = bufNew[o]; bufOld[o + 1] = bufNew[o + 1]; bufOld[o + 2] = bufNew[o + 2]; }
          bufNew[o] = target[o] = readBuf[o]; bufNew[o + 1] = target[o + 1] = readBuf[o + 1]; bufNew[o + 2] = target[o + 2] = readBuf[o + 2];
          if (!animate) { bufNew[o + 3] = 255; bufOld[o + 3] = 0; continue; }
          bufNew[o + 3] = 0; bufOld[o + 3] = 0;
          t0[idx] = base + (ltr ? ii2 - x0 : x1 - ii2) / span * dur;
          if (!isActive[idx]) { isActive[idx] = 1; active.push(idx); }
        }
      }
      if (animate && changed >= 40) {
        // the strand that feeds the needles is the yarn most of the change is knitted in
        var tally = {}, bestK = 0, bestN = 0;
        rowsHit.forEach(function (rh) { rh[1].forEach(function (x) { var o2 = (rh[0] * L.cols + x) * 4, key = readBuf[o2] + ',' + readBuf[o2 + 1] + ',' + readBuf[o2 + 2];
          var n = tally[key] = (tally[key] || 0) + 1; if (n > bestN) { bestN = n; bestK = rh[0] * L.cols + ((rh[0] & 1) === 0 ? L.cols - 1 - x : x); } }); });
        sw.k = (bestK + 0.5) / L.NST; sweep = sw; stats.sweeps++;
      }
      texDirty = true;
    }
    var STITCH_SECS = 0.16;
    function stepStitches() {
      if (!active.length) return;
      var w = 0;
      for (var n = 0; n < active.length; n++) {
        var idx = active[n], o = idx * 4, p = (K.T - t0[idx]) / STITCH_SECS;
        if (p >= 1) { bufNew[o + 3] = 255; bufOld[o + 3] = 0; isActive[idx] = 0; continue; }
        if (p > 0) { bufNew[o + 3] = Math.round(p * 255); bufOld[o + 3] = Math.round(Math.sin(Math.PI * p) * 255); }
        active[w++] = idx;
      }
      active.length = w; texDirty = true;
    }
    function sweepFront() {
      if (!sweep || K.T > sweep.t1 + 0.15) { sweep = null; return null; }
      var row = sweep.rows[0];
      for (var i = 0; i < sweep.rows.length; i++) { if (sweep.rows[i][4] <= K.T) row = sweep.rows[i]; else break; }
      var u = Math.max(0, Math.min(1, (K.T - row[4]) / row[5])), x = row[3] ? row[1] + (row[2] - row[1]) * u : row[2] - (row[2] - row[1]) * u;
      var fade = Math.max(0, Math.min(1, (K.T - sweep.t0) / 0.1, (sweep.t1 + 0.15 - K.T) / 0.15));
      return [L.cx + (x + 0.5) * L.W, L.cy + (row[0] + 0.5) * L.H, sweep.k, fade];
    }
    function uploadStitches() {
      if (!texDirty) return;
      texDirty = false;
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.bindTexture(gl.TEXTURE_2D, texNew); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, L.cols, L.rows, gl.RGBA, gl.UNSIGNED_BYTE, bufNew);
      gl.bindTexture(gl.TEXTURE_2D, texOld); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, L.cols, L.rows, gl.RGBA, gl.UNSIGNED_BYTE, bufOld);
      sceneDirty = true;
    }

    // ---- modes and who can be clicked: the knitted page when idle, the reveal when bare, nothing while it moves
    function setMode(m) {
      if (K.mode === m) return;
      K.mode = m;
      page.style.pointerEvents = m === 'idle' ? '' : 'none';
      if (under) under.style.pointerEvents = m === 'bare' ? 'auto' : 'none';
      canvas.setAttribute('data-knit-mode', m);
      if (m !== 'idle') { K.dent.on = 0; canvas.classList.remove('knit-grab'); }
      if (typeof cfg.onMode === 'function') try { cfg.onMode(m); } catch (e) { console.warn(e); }
      sceneDirty = true;
    }
    function touched() { if (!K.touched) { K.touched = true; if (hint) hint.classList.add('gone'); } }
    function unravel() {
      if (K.mode !== 'idle') return false;
      touched(); setMode('auto'); K.autoT = 0; K.speed = 0;
      K.handFrom = [rope.x[RN - 1], rope.y[RN - 1]]; K.hand.x = K.handFrom[0]; K.hand.y = K.handFrom[1];
      return true;
    }
    function knitBack() {
      if (K.mode !== 'bare' && K.mode !== 'pull' && K.mode !== 'auto') return false;
      if (K.U <= 0) { setMode('idle'); ropeReset(); return true; }
      setMode('knit'); K.knitT = 0; K.speed = 0; rope.pin = false;
      return true;
    }

    // ---- the drawn caret: two stitches wide, so it is knitted too (the browser's is thinner than a stitch)
    var caretEl = document.createElement('i');
    caretEl.className = 'knit-caret'; caretEl.setAttribute('aria-hidden', 'true');
    caretEl.style.cssText = 'position:absolute;left:0;top:0;width:' + (SW * cfg.caret.width) + 'px;height:' + (SH * 6) + 'px;pointer-events:none;visibility:hidden;background:' + (cfg.caret.color || 'var(--accent, currentColor)');
    card.appendChild(caretEl);
    var caretKickT = 0, caretShown = '';
    function caretRect() {
      var ae = document.activeElement;
      if (!ae || !card.contains(ae) || !ae.isContentEditable) return null;
      var sel = getSelection();
      if (!sel.rangeCount || !sel.isCollapsed || !ae.contains(sel.anchorNode)) return null;
      var rg = sel.getRangeAt(0), rc = rg.getClientRects()[0], cr = card.getBoundingClientRect(), fs = parseFloat(getComputedStyle(ae).fontSize);
      if (!rc || (!rc.width && !rc.height)) {
        var node = rg.startContainer, off = rg.startOffset;
        if (node.nodeType === 3 && off > 0) { var r2 = document.createRange(); r2.setStart(node, off - 1); r2.setEnd(node, off); var q = r2.getClientRects(); var l = q[q.length - 1]; if (l) rc = { left: node.data[off - 1] === '\n' ? ae.getBoundingClientRect().left : l.right, top: node.data[off - 1] === '\n' ? l.bottom : l.top, height: l.height }; }
        if (!rc) { var b = ae.getBoundingClientRect(); rc = { left: b.left, top: b.top, height: fs * L.z }; }
      }
      return { x: (rc.left - cr.left) / L.z, y: (rc.top - cr.top) / L.z, h: (rc.height || fs * L.z) / L.z, fs: fs };
    }
    function placeCaret() {
      var c = caretRect(), on = c && ((K.T - caretKickT) % 1.3) < 0.8 && K.mode === 'idle', key;
      if (!on) key = 'off';
      else {
        var h = Math.max(2, Math.round(c.fs * 0.78 / SH)) * SH, x = Math.round((c.x + 2) / SW) * SW, y = Math.round((c.y + (c.h - h) * 0.5) / SH) * SH;
        key = x + ',' + y + ',' + h;
      }
      if (key === caretShown) return;
      caretShown = key;
      if (key === 'off') { caretEl.style.visibility = 'hidden'; return; }
      var p = key.split(',');
      caretEl.style.transform = 'translate(' + p[0] + 'px,' + p[1] + 'px)'; caretEl.style.height = p[2] + 'px'; caretEl.style.visibility = 'visible';
    }
    function caretKick() { caretKickT = K.T; placeCaret(); }
    document.addEventListener('selectionchange', caretKick);
    card.addEventListener('input', caretKick);
    card.addEventListener('focusout', function () { setTimeout(placeCaret, 0); });

    // ---- pointer: the cloth gives, the thread pulls; a press that lands on nothing still works the control it shows
    function local(e) { var r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    var grabR = function () { return Math.max(14, L.W * 1.6); };
    addEventListener('pointermove', function (e) {
      var p = local(e);
      if (K.mode === 'pull') { K.hand.x = p[0]; K.hand.y = p[1]; return; }
      K.dent.tx = p[0]; K.dent.ty = p[1];
      K.dent.on = (K.mode === 'idle' && p[0] > L.cx && p[0] < L.cx + L.cw && p[1] > L.cy && p[1] < L.cy + L.ch) ? 1 : 0;
      canvas.classList.toggle('knit-grab', (K.mode === 'idle' || K.mode === 'bare') && ropeDist(p[0], p[1]) < grabR());
    }, true);
    addEventListener('pointerdown', function (e) {
      var p = local(e);
      if (K.mode === 'intro') skipIntro();
      if ((K.mode === 'idle' || K.mode === 'bare') && ropeDist(p[0], p[1]) < grabR()) {
        e.preventDefault(); e.stopPropagation();
        touched();
        if (K.mode === 'bare') { knitBack(); return; }          // the end picked up again: knit it back
        setMode('pull'); K.hand.x = p[0]; K.hand.y = p[1]; K.speed = 0;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
        canvas.classList.add('knit-pull');
        return;
      }
      K.dent.press = 1;
      netDown(e);
    }, true);
    function endPull() {
      canvas.classList.remove('knit-pull');
      if (K.mode !== 'pull') return;
      if (K.U >= L.NST) { setMode('bare'); K.bareT = 0; }
      else if (K.U > 0) knitBack();
      else { setMode('idle'); rope.pin = false; }
    }
    addEventListener('pointerup', function (e) { K.dent.press = 0; endPull(); netUp(e); }, true);
    addEventListener('pointercancel', function () { K.dent.press = 0; endPull(); }, true);
    document.addEventListener('pointerleave', function () { K.dent.on = 0; });

    var LIVE = 'button, input, select, textarea, label, a[href], [data-knit-live]';
    var netPick = null;
    function pickAt(x, y) {
      var scope = K.mode === 'bare' ? underBox : (K.mode === 'idle' ? card : null);
      if (!scope) return null;
      var els = scope.querySelectorAll(LIVE), best = null;
      for (var i = 0; i < els.length; i++) {
        var el = els[i], r = el.getBoundingClientRect();
        if (r.width && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom && (!best || best.contains(el))) best = el;
      }
      return best;
    }
    function netDown(e) {
      netPick = null;
      var pick = pickAt(e.clientX, e.clientY);
      if (pick && !(e.target instanceof Node && (pick.contains(e.target) || e.target.contains && e.target !== canvas && e.target !== page && e.target !== under && pick.closest('label') && pick.closest('label').contains(e.target)))) netPick = pick;
    }
    function netUp(e) {
      var pick = netPick; netPick = null;
      if (!pick || pickAt(e.clientX, e.clientY) !== pick) return;
      var el = pick.matches('label') ? (pick.control || pick.querySelector('input, button, select')) || pick : pick;
      stats.net = (stats.net || 0) + 1;
      if (el.type === 'range') {
        var r = el.getBoundingClientRect(), u = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        el.value = String(+el.min + u * (+el.max - +el.min)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (el.isContentEditable || /^(text|search|email|number|url|tel)$/.test(el.type || '') || el.tagName === 'TEXTAREA') el.focus();
      else el.click();
    }
    card.querySelectorAll('[data-knit-unravel]').forEach(function (b) { b.addEventListener('click', function () { unravel(); }); });
    if (under) under.querySelectorAll('[data-knit-back]').forEach(function (b) { b.addEventListener('click', function () { knitBack(); }); });

    function skipIntro() {
      if (K.mode !== 'intro') return;
      K.U = 0; K.cam.z = 1; K.cam.x = S.W / 2; K.cam.y = S.H / 2; K.needleOn = 0;
      setMode('idle'); ropeReset();
    }

    // ---- sound: a dry rasp while yarn runs, wooden ticks while the needles work (all synthesised; off until asked)
    var A = null, snd = { on: false, nextTick: 0, side: 0 };
    function soundOn(on) {
      on = !!on;
      if (on && !A) {
        try {
          var AC = root.AudioContext || root.webkitAudioContext; A = { ctx: new AC() };
          var c = A.ctx, n = c.sampleRate * 2, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0), r = HIC.rng(cfg.seed + 99), last = 0;
          for (var i = 0; i < n; i++) { last = last * 0.55 + (r() * 2 - 1) * 0.45; d[i] = last; }
          A.src = c.createBufferSource(); A.src.buffer = buf; A.src.loop = true;
          A.bp = c.createBiquadFilter(); A.bp.type = 'bandpass'; A.bp.Q.value = 1.4; A.bp.frequency.value = 900;
          A.rasp = c.createGain(); A.rasp.gain.value = 0;
          A.master = c.createGain(); A.master.gain.value = 0;
          A.src.connect(A.bp); A.bp.connect(A.rasp); A.rasp.connect(A.master); A.master.connect(c.destination);
          A.src.start();
        } catch (err) { A = null; return; }
      }
      snd.on = on && !!A;
      if (A) { if (A.ctx.state === 'suspended') A.ctx.resume(); A.master.gain.setTargetAtTime(snd.on ? 0.8 : 0, A.ctx.currentTime, 0.05); }
      if (sndBtn) { sndBtn.setAttribute('aria-pressed', String(snd.on)); sndBtn.classList.toggle('on', snd.on); }
    }
    if (sndBtn) sndBtn.addEventListener('click', function () { soundOn(!snd.on); });
    function tick(when, hi) {
      var c = A.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.value = (hi ? 2300 : 1750) * cfg.soundPitch;
      g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(0.09, when + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.03);
      o.connect(g); g.connect(A.master); o.start(when); o.stop(when + 0.04);
    }
    function stepSound() {
      if (!snd.on || !A) return;
      var c = A.ctx, now = c.currentTime, rate = K.speed / Math.max(1, L.NST);
      var running = K.mode === 'pull' || K.mode === 'auto';
      A.rasp.gain.setTargetAtTime(running ? Math.min(0.4, rate * 0.7) : 0, now, 0.04);
      A.bp.frequency.setTargetAtTime((650 + 2600 * Math.min(1, rate)) * cfg.soundPitch, now, 0.05);
      var knitting = (K.mode === 'knit' || K.mode === 'intro') && K.U > 0;
      if (knitting || sweep) {
        if (snd.nextTick < now) snd.nextTick = now;
        var gap = knitting ? 1 / (3 + 9 * Math.min(1, rate)) : 0.09;
        while (snd.nextTick < now + 0.1) { tick(snd.nextTick, (snd.side ^= 1) === 1); snd.nextTick += gap * (0.85 + 0.3 * ((snd.side * 7919) % 5) / 5); }
      }
    }

    // ---- one step of everything
    function frontPos() { return stitchPos(K.U); }
    function update(dt) {
      K.T += dt;
      if (pageFresh && probed) readStitches();
      if (caretRect() || caretShown !== 'off') placeCaret();
      stepStitches();
      var U0 = K.U, NST = L.NST, room = Math.max(3 * L.W, S.W - L.cx - L.cw - 12);
      if (K.mode === 'boot' && probed && !firstRead) {
        if (posed) pose(posed.name, posed.u);
        else if (noIntro) { setMode('idle'); K.U = 0; ropeReset(); }
        else { setMode('intro'); K.U = NST * 0.55; K.introT = 0; }
      }
      if (posed && HIC.still !== null) dt = 0;    // a pose for a still does not move on
      if (K.mode === 'intro') {
        K.introT += dt;
        K.speed = Math.max(NST * 0.1, K.U / 0.42);
        K.U = Math.max(0, K.U - K.speed * dt);
        var e = ease(K.introT / 2.3), fp = frontPos();
        K.cam.z = 1 + 1.5 * (1 - e) * (1 - e);
        var fx = L.cx + L.cw * 0.42, fy = fp[1] + L.H * 3;
        K.cam.x = fx + (S.W / 2 - fx) * e; K.cam.y = fy + (S.H / 2 - fy) * e;
        if (K.U <= 0 && K.introT >= 2.3) { K.cam.z = 1; K.cam.x = S.W / 2; K.cam.y = S.H / 2; setMode('idle'); ropeReset(); }
        sceneDirty = true;
      } else if (K.mode === 'pull' || K.mode === 'auto') {
        var a = frontPos(), free = (RN - 1) * L.W * 1.05, vT;
        if (K.mode === 'auto') {
          K.autoT += dt;
          var tx = L.cx + L.cw + Math.min(room, 7 * L.W), ty = L.cy + L.ch * 0.36;
          if (K.autoT < 0.35) {   // anticipation: a little slack is taken back towards the cloth first
            var u0 = ease(K.autoT / 0.35);
            K.hand.x = K.handFrom[0] + (a[0] - K.handFrom[0]) * 0.18 * u0; K.hand.y = K.handFrom[1] + (a[1] - K.handFrom[1]) * 0.18 * u0;
            vT = 0;
          } else {
            var k2 = Math.min(1, dt * 6);
            K.hand.x += (tx - K.hand.x) * k2; K.hand.y += (ty - K.hand.y) * k2;
            vT = NST / cfg.unravel.secs * 1.25 * ease((K.autoT - 0.35) / 1.1) + NST * 0.02;
          }
        } else {
          // how far the hand is out beyond the cloth (not from the running front, which races across a row)
          var bx = Math.max(L.cx, Math.min(L.cx + L.cw, K.hand.x)), by = Math.max(L.cy, Math.min(L.cy + L.ch, K.hand.y));
          var over = (Math.hypot(K.hand.x - bx, K.hand.y - by) - free * 0.35) / (free * 0.5);
          vT = over > 0 ? NST * (0.02 + 0.3 * Math.pow(Math.min(over, 2), 1.5)) : 0;   // pull further, it runs faster
        }
        // weight: the cloth gives slowly, then runs; it never stops dead
        K.speed += (vT - K.speed) * Math.min(1, dt * 3.2);
        K.U = Math.min(NST, K.U + K.speed * dt);
        rope.pin = true; rope.ex = K.hand.x; rope.ey = K.hand.y;
        rope.seg = Math.max(L.W * 1.05, Math.hypot(K.hand.x - a[0], K.hand.y - a[1]) / (RN - 1) * 1.01);
        if (K.U >= NST) {
          if (K.mode === 'auto' || HIC.still !== null) { setMode('bare'); K.bareT = 0; rope.pin = false; rope.seg = L.W * 1.05; }
          // a hand-held pull stays 'pull' until released (endPull → bare)
        }
      } else if (K.mode === 'bare') {
        K.bareT += dt;
        if ((cfg.reveal.hold > 0 && K.bareT > cfg.reveal.hold) || (!underBox && K.bareT > 1.2)) knitBack();
      } else if (K.mode === 'knit') {
        K.knitT += dt;
        var rate = NST / cfg.knit.secs * 1.15 * ease((K.knitT - 0.2) / 0.5);    // the needles arrive before the first stitch
        rate = Math.min(rate, Math.max(NST * 0.06, K.U * 2.4));                  // and the last rows slow down: it settles
        K.speed += (rate - K.speed) * Math.min(1, dt * 6);
        K.U = Math.max(0, K.U - K.speed * dt);
        if (K.U <= 0) { setMode('idle'); ropeReset(); }
      }
      if (K.U !== U0) sceneDirty = true;
      K.heapShown = K.mode === 'intro' ? 0 : Math.round(HEAP_N * Math.pow(K.U / Math.max(1, NST), 0.85));

      // needles: where the next stitch is made; they slide in, work with a rhythm, and slide out
      var sf = K.mode === 'idle' ? sweepFront() : null;
      var knitting = ((K.mode === 'intro' || K.mode === 'knit') && K.U > 0) || !!sf;
      if (!(posed && HIC.still !== null)) K.needleOn += ((knitting ? 1 : 0) - K.needleOn) * Math.min(1, dt * (knitting ? 10 : 5));
      if (K.needleOn > 0.003) {
        var fpn = sf ? [sf[0], sf[1]] : frontPos();
        if (knitting) {
          if (!K.nx) { K.nx = fpn[0]; K.ny = fpn[1]; }
          var kk = Math.min(1, dt * 22); K.nx += (fpn[0] - K.nx) * kk; K.ny += (fpn[1] - K.ny) * kk;
        }
        var ph = K.T * (sf ? 30 : 38), w1 = Math.sin(ph), w2 = Math.cos(ph), out = (1 - K.needleOn) * 60 * L.W;
        var a0 = -0.62 + 0.04 * w2, a1 = Math.PI + 0.5 - 0.06 * w1;
        K.needle[0] = { x: K.nx + Math.cos(a0) * (2.1 * L.W - out), y: K.ny + Math.sin(a0) * (2.1 * L.W - out) + 0.4 * L.H, a: a0, v: Math.min(1, K.needleOn * 3) };
        K.needle[1] = { x: K.nx + Math.cos(a1) * (1.9 * L.W + w1 * 0.8 * L.W - out), y: K.ny + Math.sin(a1) * (1.9 * L.W + w1 * 0.8 * L.W - out) + 0.2 * L.H, a: a1, v: Math.min(1, K.needleOn * 3) };
        sceneDirty = true;
      } else { if (K.needle[0].v) sceneDirty = true; K.needle[0].v = K.needle[1].v = 0; K.nx = 0; }

      // the dent under the pointer
      var D = K.dent, want = D.on * (0.5 + 0.5 * D.press);
      if (Math.abs(want - D.d) > 0.003 || (D.d > 0.003 && (Math.abs(D.tx - D.x) > 0.3 || Math.abs(D.ty - D.y) > 0.3))) {
        if (D.d < 0.01) { D.x = D.tx; D.y = D.ty; }
        var kf = Math.min(1, dt * 16); D.x += (D.tx - D.x) * kf; D.y += (D.ty - D.y) * kf;
        D.d += (want - D.d) * Math.min(1, dt * 9);
        sceneDirty = true;
      }

      // the thread
      var anchor = null;
      if (K.mode === 'idle') anchor = stitchPos(0);
      else if (K.mode === 'pull' || K.mode === 'auto') anchor = frontPos();
      else if (K.mode === 'bare') anchor = heapTop();
      if (anchor && dt > 0) {
        ropeStep(Math.min(dt, 0.033), anchor[0] + (K.mode === 'bare' ? 0 : L.W * 0.3), anchor[1]);
        if (rope.pin) {   // pulled tight it is a straight line from the cloth to the hand
          var dd = Math.hypot(rope.ex - anchor[0], rope.ey - anchor[1]), taut = Math.max(0, Math.min(1, (dd / ((RN - 1) * L.W * 1.05) - 0.85) * 4));
          for (var i = 1; i < RN - 1; i++) {
            var uu = i / (RN - 1), lx = anchor[0] + (rope.ex - anchor[0]) * uu, ly = anchor[1] + (rope.ey - anchor[1]) * uu;
            rope.x[i] += (lx - rope.x[i]) * 0.7 * taut; rope.y[i] += (ly - rope.y[i]) * 0.7 * taut; rope.px[i] = rope.x[i]; rope.py[i] = rope.y[i];
          }
        } else if (K.mode === 'idle') ropeSway(K.T);
      }
      stepSound();
    }

    // ---- drawing
    var col3 = function (c) { return lin(rgb(c)); };
    var C = {
      key: col3(cfg.lamp.key), amb: col3(cfg.lamp.amb), a: col3(cfg.table.a), b: col3(cfg.table.b), c: col3(cfg.table.c),
      shaft: rgb(cfg.needles.shaft), knob: rgb(cfg.needles.knob),
      kind: { wood: 0, linen: 1, gingham: 2, felt: 3, slate: 3 }[cfg.table.kind] || 0
    };
    function common(p) {
      var u = p.u;
      if (u.uKey) gl.uniform3fv(u.uKey, C.key);
      if (u.uAmb) gl.uniform3fv(u.uAmb, C.amb);
      if (u.uLamp) gl.uniform4f(u.uLamp, S.W * cfg.lamp.x, S.H * cfg.lamp.y, Math.max(S.W, S.H) * cfg.lamp.r, cfg.lamp.floor);
      if (u.uYarn) gl.uniform4f(u.uYarn, cfg.yarn.ply, cfg.yarn.twist, cfg.yarn.sheen, cfg.yarn.sparkle);
    }
    function fabricUniforms(p, w, h) {
      var u = p.u;
      common(p);
      gl.uniform2f(u.uRes, w, h); gl.uniform1f(u.uDpr, w / S.W); gl.uniform2f(u.uView, S.W, S.H);
      gl.uniform3f(u.uCam, K.cam.x, K.cam.y, K.cam.z);
      gl.uniform4f(u.uCard, L.cx, L.cy, L.cw, L.ch); gl.uniform2f(u.uGrid, L.cols, L.rows);
      gl.uniform1f(u.uU, K.U); gl.uniform1f(u.uThick, cfg.yarn.thick);
      gl.uniform2f(u.uWob, cfg.yarn.wobble, cfg.yarn.wobble * 1.25);
    }
    var sceneMs = 0;
    function drawScene() {
      var t = performance.now();
      sceneDirty = false;
      gl.disable(gl.BLEND);
      // pass 1: height
      gl.bindFramebuffer(gl.FRAMEBUFFER, heightT.fb); gl.viewport(0, 0, sceneW, sceneH);
      P.height.use(); G.bind(gl, P.height, { uNoise: noise, uNew: texNew, uOld: texOld });
      fabricUniforms(P.height, sceneW, sceneH);
      G.fullscreen(gl);
      gl.bindTexture(gl.TEXTURE_2D, heightT.tex); gl.generateMipmap(gl.TEXTURE_2D);
      // pass 2: shade
      gl.bindFramebuffer(gl.FRAMEBUFFER, sceneT.fb); gl.viewport(0, 0, sceneW, sceneH);
      var p = P.shade.use(), u = p.u;
      G.bind(gl, p, { uNoise: noise, uNew: texNew, uOld: texOld, uHeight: heightT.tex, uUnder: texUnder });
      fabricUniforms(p, sceneW, sceneH);
      gl.uniform1f(u.uHasUnder, underBox && texUnder.w ? 1 : 0);
      gl.uniform4f(u.uTab, C.kind, cfg.table.scale, 0, 0);
      gl.uniform3fv(u.uTabA, C.a); gl.uniform3fv(u.uTabB, C.b); gl.uniform3fv(u.uTabC, C.c);
      gl.uniform4f(u.uDent, K.dent.x, K.dent.y, 8 * L.W, K.dent.d);
      gl.uniform4fv(u.uNeedle, [K.needle[0].x, K.needle[0].y, K.needle[0].a, K.needle[0].v, K.needle[1].x, K.needle[1].y, K.needle[1].a, K.needle[1].v]);
      gl.uniform3fv(u.uShaft, C.shaft); gl.uniform3fv(u.uKnob, C.knob);
      gl.uniform2f(u.uNeedleLR, 60 * L.W, 0.55 * L.W);
      gl.uniform1f(u.uMetal, cfg.needles.metal); gl.uniform1f(u.uFuzz, cfg.yarn.fuzz);
      G.fullscreen(gl);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      sceneMs += (performance.now() - t - sceneMs) * 0.3;
    }
    function yarnUniforms(origin, scale, bury, count, shadow) {
      var u = P.yarn.u;
      common(P.yarn);
      gl.uniform2f(u.uOrigin, origin[0], origin[1]); gl.uniform1f(u.uScale, scale);
      gl.uniform1f(u.uHalf, cfg.yarn.thick * 1.3 * L.W); gl.uniform1f(u.uShadow, shadow ? 1 : 0); gl.uniform1f(u.uCount, count);
      gl.uniform3f(u.uCam, K.cam.x, K.cam.y, K.cam.z); gl.uniform2f(u.uView, S.W, S.H); gl.uniform2f(u.uGrid, L.cols, L.rows);
      gl.uniform1f(u.uPx, S.W / canvas.width / K.cam.z); gl.uniform1f(u.uBury, bury);
    }
    // a smooth line through the rope's points, with the crimp of yarn that was knitted
    function crimp(o, n, amp) {
      var len = 0, out = strandPts;
      for (var i = 1; i < n - 1; i++) {
        var a = (o + i) * 2, tx = out[a + 2] - out[a - 2], ty = out[a + 3] - out[a - 1], tl = Math.hypot(tx, ty) || 1;
        len += Math.hypot(out[a] - out[a - 2], out[a + 1] - out[a - 1]);
        var c = Math.sin(len / (2.5 * L.W) * 6.2831853) * amp * Math.min(1, i / 4, (n - 1 - i) / 4);
        out[a] += -ty / tl * c; out[a + 1] += tx / tl * c;
      }
    }
    function ropePts(o, tension) {
      var n = 0, SUB = 5, out = strandPts, X = rope.x, Y = rope.y;
      for (var i = 0; i < RN - 1; i++) {
        var i0 = Math.max(0, i - 1), i3 = Math.min(RN - 1, i + 2);
        for (var s = 0; s < SUB; s++) {
          var t = s / SUB, t2 = t * t, t3 = t2 * t;
          var cr = function (p0, p1, p2, p3) { return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3); };
          out[(o + n) * 2] = cr(X[i0], X[i], X[i + 1], X[i3]); out[(o + n) * 2 + 1] = cr(Y[i0], Y[i], Y[i + 1], Y[i3]); n++;
        }
      }
      out[(o + n) * 2] = X[RN - 1]; out[(o + n) * 2 + 1] = Y[RN - 1]; n++;
      crimp(o, n, 0.2 * L.W * (1 - tension));
      return n;
    }
    function curvePts(o, ax, ay, bx, by, sag) {
      var d = Math.hypot(bx - ax, by - ay), n = Math.max(8, Math.min(260, Math.round(d / 3))), mx = (ax + bx) / 2, my = (ay + by) / 2 + sag;
      for (var i = 0; i <= n; i++) { var t = i / n, u = 1 - t; strandPts[(o + i) * 2] = u * u * ax + 2 * u * t * mx + t * t * bx; strandPts[(o + i) * 2 + 1] = u * u * ay + 2 * u * t * my + t * t * by; }
      crimp(o, n + 1, 0.2 * L.W);
      return n + 1;
    }
    function present() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.BLEND);
      P.copy.use(); G.bind(gl, P.copy, { uTex: sceneT.tex }); G.fullscreen(gl);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      var NST = L.NST, kNow = K.U;
      // the heap: a soft contact shadow, then the yarn (its own shadow first)
      if (K.heapShown > 4) {
        var c = heapAt(), grow = Math.sqrt(K.heapShown / HEAP_N), dpr = canvas.width / S.W;
        P.blob.use();
        var bx = (c[0] + L.W * 1.0 - K.cam.x) * K.cam.z + S.W / 2, by = (c[1] + L.W * 1.6 - K.cam.y) * K.cam.z + S.H / 2;
        gl.uniform4f(P.blob.u.uBlob, bx * dpr, canvas.height - by * dpr, (5 + 22 * grow) * heapScale * L.W * dpr * K.cam.z, 0.6 * Math.min(1, grow * 3));
        G.fullscreen(gl);
        P.yarn.use(); G.bind(gl, P.yarn, { uNoise: noise, uNew: texNew });
        gl.bindVertexArray(heap.vao);
        yarnUniforms(c, L.W * heapScale, 1, K.heapShown, true); gl.drawArrays(gl.TRIANGLE_STRIP, 0, K.heapShown * 2);
        yarnUniforms(c, L.W * heapScale, 1, K.heapShown, false); gl.drawArrays(gl.TRIANGLE_STRIP, 0, K.heapShown * 2);
      }
      // the thread, the strand pulled to the hand and on to the heap, the strand the needles take
      var n = 0, draws = [], fracAt = function (len) { return Math.max(0, kNow - len / (2.6 * L.W)) / NST; };
      if (K.mode === 'idle' || K.mode === 'pull' || K.mode === 'auto' || K.mode === 'bare') {
        var ax = rope.x[0], ay = rope.y[0], dl = Math.hypot(rope.x[RN - 1] - ax, rope.y[RN - 1] - ay);
        var tension = rope.pin ? Math.max(0, Math.min(1, (dl / ((RN - 1) * L.W * 1.05) - 0.8) * 3)) : 0;
        var cN = ropePts(n, tension * 0.85);
        draws.push([n, cN, K.mode === 'bare' ? function () { return Math.max(0, NST - 1) / NST; } : function (i, len) { return fracAt(len); }, !rope.pin]); n += cN;
        if (rope.pin && K.heapShown > 4) {
          var ht = heapTop(), d2 = Math.hypot(ht[0] - K.hand.x, ht[1] - K.hand.y);
          var c2 = curvePts(n, K.hand.x, K.hand.y, ht[0], ht[1], 10 + d2 * 0.22);
          draws.push([n, c2, function (i, len) { return fracAt(len + (RN - 1) * rope.seg); }, false]); n += c2;
        }
      } else if ((K.mode === 'knit' && K.heapShown > 4) || (K.mode === 'intro' && K.U > 0)) {
        var from = K.mode === 'intro' ? [L.cx + L.cw + 24 * L.W, L.cy + L.ch * 0.92] : heapTop(), at = [K.nx || frontPos()[0], K.ny || frontPos()[1]];
        var d3 = Math.hypot(from[0] - at[0], from[1] - at[1]);
        var c3 = curvePts(n, at[0], at[1], from[0], from[1], 8 + d3 * 0.1);
        draws.push([n, c3, function (i, len) { return fracAt(-len * 0.0); }, false]); n += c3;
      }
      var sf = K.mode === 'idle' ? sweepFront() : null;
      if (sf) {
        var ex = S.W + 30, ey = sf[1] + (S.W - sf[0]) * 0.2 + 4 * L.W, d4 = Math.hypot(ex - sf[0], ey - sf[1]);
        var c4 = curvePts(n, sf[0], sf[1], ex, ey, -d4 * 0.1);
        draws.push([n, c4, function () { return sf[2]; }, false, sf[3]]); n += c4;
      }
      if (n) {
        var v = 0;
        draws.forEach(function (dr) {
          var sub = strandPts.subarray(dr[0] * 2, (dr[0] + dr[1]) * 2), cnt = dr[1], fade = dr[4];
          v = fillRibbon(strand, sub, cnt, v, dr[2], fade !== undefined ? function () { return fade; } : (dr[3] ? function (i) { return i > cnt - 4 ? 0.55 + 0.15 * (cnt - 1 - i) : 1; } : null), null);
        });
        gl.bindBuffer(gl.ARRAY_BUFFER, strand.vbo); gl.bufferSubData(gl.ARRAY_BUFFER, 0, strand.data.subarray(0, v * 2 * STRIDE));
        P.yarn.use(); G.bind(gl, P.yarn, { uNoise: noise, uNew: texNew }); gl.bindVertexArray(strand.vao);
        for (var pass = 0; pass < 2; pass++) {
          yarnUniforms([0, 0], 1, 0, 0, pass === 0);
          var o = 0; draws.forEach(function (dr) { gl.drawArrays(gl.TRIANGLE_STRIP, o * 2, dr[1] * 2); o += dr[1]; });
        }
      }
      gl.disable(gl.BLEND); gl.bindVertexArray(null);
    }

    // ---- the page texture: upload on paint only
    var editable = card.querySelector('[data-hic-edit]') || card.querySelector('[contenteditable]') || card.firstElementChild;
    S.onPaint(function () {
      if (!S.upload(page, texPage)) return;
      if (under) S.upload(under, texUnder);
      pageFresh = true; sceneDirty = true;
      if (!probed && !probing) {
        probing = true;
        if (under) under.style.pointerEvents = 'none';
        S.probe(page, editable).then(function () {
          // the probe leaves the page at its test offset: put both layers back where they are drawn
          S.place(page, [1, 0, 0, 1, 0, 0]); if (under) S.place(under, [1, 0, 0, 1, 0, 0]);
          probed = true;
          requestAnimationFrame(function () { S.requestPaint(); });
        });
      }
    });
    var probing = false;

    // ---- the loop, with back-pressure (never queue a frame while the GPU still draws the last one)
    var inflight = null, lastDraw = 0, gpuMs = 16, slowFrames = 0;
    function render() {
      uploadStitches();
      if (sceneDirty) drawScene();
      present();
    }
    function adapt() {
      if (fixedQ) return;
      if (gpuMs > 45) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 12 && L.q > 0.5) { L.q = Math.max(0.5, L.q * 0.8); slowFrames = 0; allocScene(); }
    }
    S.loop(function (t, dt) {
      if (manual) return;
      if (HIC.still !== null) dt = posed ? 0 : 1 / 60;
      var busy = false, now = performance.now();
      if (inflight) {
        if (gl.clientWaitSync(inflight, 0, 0) === gl.TIMEOUT_EXPIRED) busy = true;
        else { gl.deleteSync(inflight); inflight = null; gpuMs += (Math.min(2000, now - lastDraw) - gpuMs) * 0.3; adapt(); }
      }
      if (busy) return;
      var step = Math.min(0.05, Math.max(0.001, (now - (lastDraw || now - 16)) / 1000));
      if (HIC.still !== null) K.T = HIC.still;
      update(HIC.still !== null ? 0 : step);
      if (!probed || firstRead) { if (pageFresh && probed) readStitches(); return; }
      render();
      lastDraw = now;
      inflight = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush();
      if (!readyDone) { readyDone = true; S.ready({ cols: L.cols, rows: L.rows, stitches: L.NST, stitch: [SW, SH], table: cfg.table.kind, under: !!underBox }); }
    });

    addEventListener('resize', function () { layout(); });
    if (root.ResizeObserver) new ResizeObserver(function () { if (Math.abs(canvas.getBoundingClientRect().width - S.W) > 0.5) layout(); }).observe(canvas);

    // ---- frozen states for stills: idle | pull | bare | knit (u = how much is unravelled)
    function pose(name, u) {
      posed = { name: name, u: u };
      u = Math.max(0, Math.min(1, u === undefined ? 0.4 : u));
      K.cam = { x: S.W / 2, y: S.H / 2, z: 1 };
      var NST = L.NST, room = Math.max(3 * L.W, S.W - L.cx - L.cw - 12);
      if (name === 'idle') { K.U = 0; setMode('idle'); ropeReset(); }
      if (name === 'pull') {
        setMode('idle'); ropeReset();
        K.U = Math.round(NST * u) + 0.5; setMode('pull');
        K.hand.x = L.cx + L.cw + Math.min(room, 7 * L.W); K.hand.y = L.cy + L.ch * 0.34; K.speed = NST * 0.4;
        rope.pin = true; rope.ex = K.hand.x; rope.ey = K.hand.y;
        var a = frontPos(); rope.seg = Math.max(L.W * 1.05, Math.hypot(K.hand.x - a[0], K.hand.y - a[1]) / (RN - 1) * 1.01);
        for (var i = 0; i < RN; i++) { var t = i / (RN - 1); rope.x[i] = rope.px[i] = a[0] + (K.hand.x - a[0]) * t; rope.y[i] = rope.py[i] = a[1] + (K.hand.y - a[1]) * t; }
      }
      if (name === 'bare') {
        K.U = NST; setMode('bare'); K.heapShown = HEAP_N;
        var ht = heapTop(); rope.pin = false; rope.seg = L.W * 1.05;
        for (var j = 0; j < RN; j++) { var s = j / (RN - 1); rope.x[j] = rope.px[j] = ht[0] + L.W * (2 + 9 * s); rope.y[j] = rope.py[j] = ht[1] - L.W * (1 + 6 * s) + L.W * 2 * Math.sin(s * 4); }
        for (var n2 = 0; n2 < 80; n2++) ropeStep(1 / 60, ht[0], ht[1]);
      }
      if (name === 'knit') {
        K.U = Math.round(NST * u); setMode('knit'); K.knitT = 1; K.needleOn = 1;
        var f = frontPos(); K.nx = f[0]; K.ny = f[1];
      }
      K.heapShown = Math.round(HEAP_N * Math.pow(K.U / Math.max(1, NST), 0.85));
      sceneDirty = true;
    }
    var hp = HIC.param('pose');
    if (hp) posed = { name: hp, u: parseFloat(HIC.param('u') || '0.4') };

    // ---- the test hook (scripts/check.mjs, scripts/still.mjs)
    function info() {
      return {
        mode: K.mode, U: K.U, NST: L.NST, cols: L.cols, rows: L.rows, z: L.z, stitchPx: [L.W, L.H], card: [L.cx, L.cy, L.cw, L.ch],
        heapShown: K.heapShown, heap: heapAt(), heapR: 21 * heapScale * L.W, active: active.length, reads: stats.reads, lastChanged: stats.lastChanged,
        lastRows: stats.lastRows, sweeps: stats.sweeps, net: stats.net || 0, needles: K.needleOn, sceneMs: +sceneMs.toFixed(1), q: L.q, gpuMs: +gpuMs.toFixed(1),
        rope: { end: [rope.x[RN - 1], rope.y[RN - 1]], mid: [rope.x[RN >> 1], rope.y[RN >> 1]], energy: rope.energy }, caret: caretShown, sound: snd.on
      };
    }
    root.__knit = {
      info: info,
      manual: function () { manual = true; },
      advance: function (sec, step) {
        step = step || 1 / 30;
        for (var t = 0; t < sec - 1e-6; t += step) update(Math.min(step, sec - t));
        if (probed && !firstRead) render();
        return info();
      },
      unravel: unravel, knitBack: knitBack, pose: function (n, u) { pose(n, u); render(); return info(); },
      stitch: function (i, j) { var o = (j * L.cols + i) * 4; return [bufNew[o], bufNew[o + 1], bufNew[o + 2], bufNew[o + 3]]; },
      stitchAt: function (x, y) { var i = Math.floor((x - L.cx) / L.W), j = Math.floor((y - L.cy) / L.H); return i < 0 || j < 0 || i >= L.cols || j >= L.rows ? null : root.__knit.stitch(i, j); },
      ropePoint: function (i) { i = Math.max(0, Math.min(RN - 1, i)); return [rope.x[i], rope.y[i]]; },
      layout: layout
    };
    root.__hic.screenOf = function (el) {
      var r = el.getBoundingClientRect(), c = canvas.getBoundingClientRect();
      return [r.left - c.left + r.width / 2, r.top - c.top + r.height / 2];
    };

    if (underBox) under.style.pointerEvents = 'none';
    layout();
    return {
      unravel: unravel, knitBack: knitBack, sound: soundOn,
      mode: function () { return K.mode; }, info: info, config: cfg
    };
  };

  root.Knit = Knit;
})(typeof window !== 'undefined' ? window : globalThis);

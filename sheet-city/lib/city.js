/* city.js — Sheet City engine: a live spreadsheet (lib/sheet.js, ordinary DOM inside an HTML-in-Canvas <canvas>) drawn by
 * WebGL2 as a model city standing on a desk.
 *
 *   SheetCity.start({ canvas, sheet: hostEl, book, …config })   → the engine, or null when the plain page is shown
 *
 * What it draws
 *   - the sheet as a card slab on a desk; its printed face is the live DOM, uploaded as a texture on each paint
 *   - every cell of the book's city range as a building: height = value / unit storeys, a loss is a pit; the cell's
 *     printed number is the roof (the same texture), the cell's fill colour is the facade, one window row per storey
 *   - window light: a low sun through a window pane (soft edges, optional mullions), soft shadow-mapped shadows,
 *     ambient occlusion straight from the height grid, glass that reflects the sky, a few lit windows
 *   - desk props built from lathe / ball / box / torus parts (designed per topic); one of them can make the first edit
 *   - a change runs as light along the streets to the cells that depend on it (the formula graph), the dependants hold
 *     their old figure until the light arrives and then count to the new one; a ring spreads from the edited building
 * What stays live
 *   - the sheet is placed for hit testing on the plane under the pointer (roof height on a building, sheet level on
 *     the street, the cell under the pointer on a wall), so clicks, hovers, typing, the slider and selection are real
 *   - drag on the desk or a building orbits, wheel / pinch zooms; #still=<s> freezes, #calm drops motion, #nointro starts
 *     at rest without the opening swoop, #q=0.6 fixes the drawing resolution
 * Config: see DEFAULTS below and references/ENGINE.md. Requires lib/hic.js and lib/sheet.js (and lib/sound.js for sound).
 */
(function (root) {
  'use strict';
  var HICR = root.HIC, V = HICR.vec, clamp = HICR.clamp, mix = HICR.mix;

  var DEFAULTS = {
    unit: 1000,            // value of one storey (a row may override with row.unit)
    storey: 15,            // px of one storey (the sheet's own px are world units)
    tallest: 520, deepest: 70,
    inset: 6,              // street half-width: buildings stand this far inside their cell
    slab: 9,               // thickness of the sheet's card
    texScale: 2,           // texture px per sheet px (sharp numbers on near roofs)
    shadowSize: 1536,
    facade: { 'default': 'punched' },     // row class → 'punched' | 'ribbon' | 'bays' | 'curtain'
    camera: { yaw: -0.27, pitch: 0.6, fov: 26, margin: 0.9, phonePitch: 0.95 },
    look: {
      backdrop: '#3b4648', desk: '#173032', deskLine: '#6f9090', deskKind: 'mat', deskGrid: 0.14, grain: 0.18,
      paper: '#f4f1ea', sky: '#5d6f9c', bounce: '#86705a', ambient: 1.0,
      sun: [-0.66, 0.46, -0.40], sunColor: '#ffe8bf', sunPower: 1.25,
      window: { x0: 0.02, y0: -0.02, x1: 1.02, y1: 1.0, soft: 0.13, bars: [1, 0], bar: 0.010 },
      glass: '#5f6f92', lit: '#ffbf70', litShare: 0.09,
      accent: '#2b5cff', pulse: '#5a8cff', ring: '#ffc77a', loss: '#9c2a20',
      vignette: 0.24, contrast: 0.18, textShadow: 0.6
    },
    props: null,           // function (P, W, H) → [object, …]  (see SheetCity.parts)
    intro: { swoop: true, write: null },  // write: { cell: 'B9', text: '1200' } — the writer prop makes the first edit
    sound: {},             // passed to CitySound
    hint: 'Click a rooftop, type a number, press Enter'
  };
  var STYLE = { punched: 0, ribbon: 1, bays: 2, curtain: 3 };

  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b || {}) o[k] = (a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) && typeof b[k] === 'object' && !Array.isArray(b[k])) ? merge(a[k], b[k]) : b[k]; return o; }
  function lin(hex) { var h = hex.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255].map(function (c) { return Math.pow(c, 2.2); }); }
  function ease(t) { t = clamp(t, 0, 1); return t * t * t * (t * (6 * t - 15) + 10); }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }

  // ================================================================== shaders
  var HEAD = '#version 300 es\nprecision highp float;\nprecision highp sampler2DShadow;\n';
  var VS_BOX = HEAD + [
    'layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNorm;',
    'layout(location=2) in vec4 aRect;   // x0 z0 x1 z1 of the footprint',
    'layout(location=3) in vec4 aInfo;   // y0 y1 flash selected',
    'layout(location=4) in vec4 aCell;   // column row style seed',
    'layout(location=5) in vec2 aTint;   // where the cell\'s fill colour is on the sheet texture',
    'uniform mat4 uVP; uniform sampler2D uSheet; uniform sampler2D uHeights; uniform vec2 uCells; uniform int uKit; uniform int uLid; uniform float uStorey; uniform float uTall;',
    'out vec3 vP; out vec3 vN; flat out vec4 vRect; flat out vec4 vInfo; flat out vec4 vCell; flat out vec3 vTint; flat out vec4 vNb; flat out vec4 vNd;',
    'float hv(ivec2 c){ if (c.x < 0 || c.y < 0 || c.x >= int(uCells.x) || c.y >= int(uCells.y)) return 0.0; return texelFetch(uHeights, c, 0).r; }',
    'void main(){',
    '  vec4 r = aRect; float y0 = aInfo.x, y1 = aInfo.y; vec3 n = aNorm; bool show = true;',
    '  float w = r.z - r.x, d = r.w - r.y, h = y1;',
    '  if (uKit == 1) { r = vec4(r.x + 3.0, r.y + 2.0, r.x + 3.0 + min(15.0, w * 0.2), r.y + 2.0 + min(7.0, d * 0.16)); y0 = h; y1 = h + 5.5; show = h > uStorey * 2.5; }',
    '  else if (uKit == 2) { r = vec4(r.z - 3.0 - min(11.0, w * 0.14), r.y + 2.0, r.z - 3.0, r.y + 2.0 + min(8.0, d * 0.18)); y0 = h; y1 = h + 9.0; show = h > uStorey * 5.5; }',
    '  else if (uKit == 3) { float cx = r.x + w * 0.31, cz = r.y + 4.5; r = vec4(cx, cz, cx + 1.8, cz + 1.8); y0 = h; y1 = h + 28.0; show = h > uTall * 0.7; }',
    '  vec3 p = vec3(mix(r.x, r.z, aPos.x), mix(y0, y1, aPos.y), mix(r.y, r.w, aPos.z));',
    '  if (uLid == 1) { p.y = 0.0; show = aNorm.y > 0.5 && aInfo.y < -0.5; }        // the glass lid over a pit',
    '  if (y1 < y0 && n.y < 0.5) n = -n;                                               // a pit\'s walls are seen from inside',
    '  vP = p; vN = n; vRect = r; vInfo = vec4(y0, y1, aInfo.zw); vCell = aCell;',
    '  vTint = pow(textureLod(uSheet, aTint, 0.0).rgb, vec3(2.2));',
    '  ivec2 c = ivec2(aCell.xy);                                                      // neighbours\' heights, for occlusion',
    '  vNb = vec4(hv(c + ivec2(-1, 0)), hv(c + ivec2(1, 0)), hv(c + ivec2(0, -1)), hv(c + ivec2(0, 1)));',
    '  vNd = vec4(hv(c + ivec2(-1, -1)), hv(c + ivec2(1, -1)), hv(c + ivec2(-1, 1)), hv(c + ivec2(1, 1)));',
    '  gl_Position = show ? uVP * vec4(p, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);',
    '}'].join('\n');

  // lighting shared by the boxes and the props
  var POISSON = '-0.613,0.617, 0.170,-0.040, -0.299,-0.792, 0.645,0.493, -0.651,-0.117, 0.421,-0.661, -0.039,0.919, 0.893,-0.170';
  var LIGHT = [
    'uniform sampler2DShadow uShadow; uniform mat4 uSunVP; uniform vec3 uSun; uniform vec3 uSunC; uniform vec3 uSky; uniform vec3 uBounce;',
    'uniform float uAmb; uniform vec3 uCam; uniform float uTexel; uniform vec4 uPane; uniform vec4 uPaneB; uniform vec3 uBackdrop;',
    'uniform vec2 uRes; uniform float uVig; uniform float uContrast;',
    '#ifdef LITE\nconst int TAPS = 3;\n#else\nconst int TAPS = 8;\n#endif',
    'const vec2 PD[8] = vec2[8](' + POISSON.split(',').reduce(function (a, v, i, all) { if (i % 2) a.push('vec2(' + all[i - 1] + ',' + v + ')'); return a; }, []).join(',') + ');',
    'float hash(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }',
    'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }',
    '// The sun comes in through a window: a soft pane of light, in the light\'s own coordinates, with mullion shadows.',
    'float pane(vec2 q){',
    '  vec4 R = uPane; float s = uPaneB.z;',
    '  float m = smoothstep(R.x - s, R.x + s, q.x) * (1.0 - smoothstep(R.z - s, R.z + s, q.x)) * smoothstep(R.y - s, R.y + s, q.y) * (1.0 - smoothstep(R.w - s, R.w + s, q.y));',
    '  vec2 f = (q - R.xy) / (R.zw - R.xy), sz = R.zw - R.xy;',
    '  if (uPaneB.x > 0.5) { float d = abs(fract(f.x * (uPaneB.x + 1.0) + 0.5) - 0.5) / (uPaneB.x + 1.0) * sz.x; m *= mix(0.25, 1.0, smoothstep(uPaneB.w, uPaneB.w + s * 0.35, d)); }',
    '  if (uPaneB.y > 0.5) { float d = abs(fract(f.y * (uPaneB.y + 1.0) + 0.5) - 0.5) / (uPaneB.y + 1.0) * sz.y; m *= mix(0.25, 1.0, smoothstep(uPaneB.w, uPaneB.w + s * 0.35, d)); }',
    '  return m;',
    '}',
    'float sunVis(vec3 P, vec3 N){',
    '  vec4 s = uSunVP * vec4(P + N * 1.2, 1.0); vec3 q = s.xyz * 0.5 + 0.5;',
    '  float w = pane(q.xy);',
    '  if (w < 0.003 || q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) return w;',
    '  float a = hash(gl_FragCoord.xy) * 6.283, c = cos(a), sn = sin(a), sum = 0.0;',
    '  for (int i = 0; i < TAPS; i++) { vec2 o = PD[i]; o = vec2(c * o.x - sn * o.y, sn * o.x + c * o.y); sum += texture(uShadow, vec3(q.xy + o * uTexel * 2.6, min(q.z, 1.0) - 0.0016)); }',
    '  return w * sum / float(TAPS);',
    '}',
    '// k: how fully a surface takes the shade. Printed faces take less, so their numbers stay dark on light.',
    'vec3 shade(vec3 alb, vec3 N, vec3 P, float ao, float k){',
    '  float ndl = max(dot(N, uSun), 0.0);',
    '  float vis = ndl > 0.0 ? sunVis(P, N) : 0.0;',
    '  vis = mix(max(vis, 0.55), vis, k);',
    '  vec3 amb = mix(uBounce, uSky, N.y * 0.5 + 0.5) * uAmb;',
    '  return alb * (amb * ao + uSunC * ndl * vis * mix(0.75, 1.0, ao));',
    '}',
    'vec3 finish(vec3 c){',
    '  c = c / (1.0 + max(c - 0.85, 0.0) * 1.6);                       // soft shoulder for the brightest light',
    '  c = pow(max(c, 0.0), vec3(1.0 / 2.2));',
    '  c = mix(c, c * c * (3.0 - 2.0 * c), uContrast);',
    '  vec2 q = gl_FragCoord.xy / uRes - 0.5; q.x *= uRes.x / uRes.y * 0.62;',
    '  c *= 1.0 - uVig * smoothstep(0.32, 0.85, length(q));',
    '  c += (hash(gl_FragCoord.xy + 7.0) - 0.5) / 255.0;',
    '  return c;',
    '}'].join('\n');

  var FS_BOX = HEAD + [
    'in vec3 vP; in vec3 vN; flat in vec4 vRect; flat in vec4 vInfo; flat in vec4 vCell; flat in vec3 vTint; flat in vec4 vNb; flat in vec4 vNd;',
    'uniform int uMode;            // 0 sheet slab, 1 building, 2 desk, 3 rooftop part, 4 pit lid',
    'uniform sampler2D uSheet; uniform sampler2D uHeights; uniform vec4 uGrid; uniform vec2 uCells; uniform vec2 uSheetSize;',
    'uniform float uInset; uniform float uStorey; uniform float uSlab; uniform float uTextK;',
    'uniform vec3 uDesk; uniform vec3 uDeskLine; uniform int uDeskKind; uniform float uDeskGrid; uniform float uGrain; uniform vec3 uPaper;',
    'uniform vec3 uGlass; uniform vec3 uLit; uniform float uLitShare; uniform vec3 uAccent; uniform vec3 uLoss;',
    'uniform vec4 uPulse[8]; uniform vec2 uPulseT[8]; uniform int uPulseN; uniform vec3 uPulseC;',
    'uniform vec4 uRing[6]; uniform int uRingN; uniform vec3 uRingC;',
    LIGHT,
    'out vec4 o;',
    'float hAt(ivec2 c){ if (c.x < 0 || c.y < 0 || c.x >= int(uCells.x) || c.y >= int(uCells.y)) return 0.0; return texelFetch(uHeights, c, 0).r; }',
    'ivec2 lotAt(vec2 xz){ return ivec2(floor((xz - uGrid.xy) / uGrid.zw)); }',
    'bool inLot(vec2 xz, out ivec2 c){ c = lotAt(xz); vec2 f = (xz - uGrid.xy) - vec2(c) * uGrid.zw;',
    '  return f.x > uInset && f.y > uInset && f.x < uGrid.z - uInset && f.y < uGrid.w - uInset; }',
    '// Ambient occlusion from the height grid: taller neighbours close off the sky.',
    'float occOne(vec3 P, ivec2 n, float h){',
    '  float dh = h - P.y; if (dh <= 0.0) return 0.0;',
    '  vec2 lo = uGrid.xy + vec2(n) * uGrid.zw + uInset, hi = lo + uGrid.zw - 2.0 * uInset;',
    '  float d = length(max(max(lo - P.xz, P.xz - hi), 0.0));',
    '  return dh / sqrt(dh * dh + d * d + 9.0) / (1.0 + d * d / 420.0);',
    '}',
    'float aoCurve(float occ){ return 1.0 - 0.7 * (1.0 - exp(-occ * 0.6)); }',
    '// on a building: its eight neighbours, fetched once per vertex',
    'float occlusionLot(vec3 P, ivec2 c){',
    '  float o = occOne(P, c + ivec2(-1, 0), vNb.x) + occOne(P, c + ivec2(1, 0), vNb.y) + occOne(P, c + ivec2(0, -1), vNb.z) + occOne(P, c + ivec2(0, 1), vNb.w);',
    '  o += occOne(P, c + ivec2(-1, -1), vNd.x) + occOne(P, c + ivec2(1, -1), vNd.y) + occOne(P, c + ivec2(-1, 1), vNd.z) + occOne(P, c + ivec2(1, 1), vNd.w);',
    '  return aoCurve(o);',
    '}',
    '// in a street: the four lots around the nearest crossing',
    'float occlusionStreet(vec3 P){',
    '#ifdef LITE\n  return 1.0;\n#endif',
    '  vec2 g = (P.xz - uGrid.xy) / uGrid.zw; ivec2 c = ivec2(floor(g)); vec2 f = fract(g);',
    '  ivec2 s = ivec2(f.x < 0.5 ? -1 : 1, f.y < 0.5 ? -1 : 1);',
    '  ivec2 a = c, b = c + ivec2(s.x, 0), d = c + ivec2(0, s.y), e = c + s;',
    '  return aoCurve(occOne(P, a, hAt(a)) + occOne(P, b, hAt(b)) + occOne(P, d, hAt(d)) + occOne(P, e, hAt(e)));',
    '}',
    '// A change runs along the streets (first down the column line, then along the row line) to a cell that reads it.',
    'float trail(float u){ return u > 0.0 ? exp(-u / 150.0) : exp(u / 8.0); }',
    'float pulses(vec2 p){',
    '  float g = 0.0;',
    '  for (int i = 0; i < 8; i++) { if (i >= uPulseN) break;',
    '    vec4 q = uPulse[i]; float head = uPulseT[i].x, fade = uPulseT[i].y;',
    '    float l1 = abs(q.w - q.y), l2 = abs(q.z - q.x), s1d = sign(q.w - q.y), s2d = sign(q.z - q.x);',
    '    float s1 = clamp((p.y - q.y) * s1d, 0.0, l1), s2 = clamp((p.x - q.x) * s2d, 0.0, l2);',
    '    float a = length(p - vec2(q.x, q.y + s1d * s1)), b = length(p - vec2(q.x + s2d * s2, q.w));',
    '    g += fade * (exp(-a * a / 60.0) * trail(head - s1) + exp(-b * b / 60.0) * trail(head - l1 - s2));',
    '  }',
    '  return g;',
    '}',
    'float rings(vec2 p){ float g = 0.0; for (int i = 0; i < 6; i++) { if (i >= uRingN) break; float d = (length(p - uRing[i].xy) - uRing[i].z) / 5.0; g += uRing[i].w * exp(-d * d); } return g; }',
    'vec3 sheetAt(vec2 xz, float bias){ return pow(texture(uSheet, (xz + uSheetSize * 0.5) / uSheetSize, bias).rgb, vec3(2.2)); }',
    'void main(){',
    '  vec3 N = normalize(vN), P = vP, col; float alpha = 1.0;',
    '  ivec2 c;',
    '  if (uMode == 2) {',
    '    // the desk',
    '    if (inLot(P.xz, c) && hAt(c) < 0.0 && max(abs(P.x) - uSheetSize.x * 0.5, abs(P.z) - uSheetSize.y * 0.5) < 0.0) discard;',
    '    float d = length(max(abs(P.xz) - uSheetSize * 0.5, 0.0));',
    '    float contact = 1.0 - 0.55 * exp(-d / 6.0) - 0.22 * exp(-d / 45.0);',
    '    vec3 alb = uDesk;',
    '    if (uDeskKind == 1) {           // wood: long grain along x, a few growth rings',
    '      float g = noise(vec2(P.x * 0.004, P.z * 0.05)) * 0.7 + noise(vec2(P.x * 0.02, P.z * 0.25)) * 0.3;',
    '      float rings = abs(fract(P.z * 0.011 + g * 2.2) - 0.5);',
    '      alb *= 0.78 + 0.3 * smoothstep(0.05, 0.45, rings) + 0.1 * g;',
    '      alb *= 1.0 - 0.25 * (1.0 - smoothstep(0.0, 2.0, abs(fract(P.z / 230.0) - 0.5) * 230.0));   // board joints',
    '    } else if (uDeskKind == 2) {    // linen: a fine weave',
    '      alb *= 0.9 + 0.12 * (noise(P.xz * vec2(0.9, 0.08)) * noise(P.xz * vec2(0.08, 0.9)) * 1.6);',
    '    } else {                        // a cutting mat printed with a grid that carries on the sheet\'s own lines',
    '      vec2 g = (P.xz - uGrid.xy) / uGrid.zw, gw = fwidth(g) + 1e-5, dl = abs(fract(g - 0.5) - 0.5);',
    '      vec2 ln = 1.0 - smoothstep(vec2(0.012), vec2(0.012) + gw * 1.4, dl);',
    '      float keep = clamp(1.2 - max(gw.x, gw.y) * 6.0, 0.0, 1.0);',
    '      alb = mix(alb, uDeskLine, uDeskGrid * max(ln.x, ln.y) * keep);',
    '    }',
    '    alb *= 1.0 - uGrain + 2.0 * uGrain * noise(P.xz * 0.35) * noise(P.xz * 0.05 + 9.0);',
    '    col = shade(alb, vec3(0, 1, 0), P, contact, 1.0);',
    '    if (uRingN > 0) col += uRingC * rings(P.xz) * 0.25;',
    '    col = mix(col, uBackdrop, smoothstep(1800.0, 6500.0, length(P.xz)));',
    '  } else if (uMode == 0) {',
    '    // the sheet: a card slab whose face is the live page',
    '    if (N.y > 0.5) {',
    '      bool lot = inLot(P.xz, c);',
    '      if (lot && hAt(c) < -0.5) discard;                                   // a pit opens here',
    '      vec3 alb = sheetAt(P.xz, -0.5);',
    '      float ao = occlusionStreet(P);',
    '      col = shade(alb, N, P, ao, uTextK);',
    '      if (uPulseN > 0) col += uPulseC * pulses(P.xz) * 2.4;',
    '      if (uRingN > 0) col += uRingC * rings(P.xz) * 0.5;',
    '    } else {',
    '      vec3 alb = uPaper * (0.86 + 0.14 * step(0.5, fract((P.y + uSlab) / 1.5)));   // stacked card at the edge',
    '      col = shade(alb, N, P, 0.9, 1.0);',
    '    }',
    '  } else if (uMode == 4) {',
    '    // a loss keeps its number: printed on frosted glass at sheet level over the pit',
    '    vec3 t = sheetAt(P.xz, -0.5);',
    '    float ink = smoothstep(0.02, 0.12, distance(t, vTint));',
    '    alpha = mix(0.32, 1.0, ink);',
    '    col = shade(mix(t, vec3(1.0), 0.25 * (1.0 - ink)), vec3(0, 1, 0), P, 1.0, uTextK);',
    '  } else if (uMode == 3) {',
    '    // rooftop plant rooms, tanks and masts',
    '    vec3 alb = mix(vec3(0.42), vTint, 0.35) * (N.y > 0.5 ? 1.0 : 0.8);',
    '    if (vRect.z - vRect.x < 2.0) alb = vec3(0.05);',
    '    col = shade(alb, N, P, 0.92, 1.0);',
    '  } else {',
    '    // a building',
    '    ivec2 cell = ivec2(vCell.xy); float top = vInfo.y;',
    '    float sel = vInfo.w, flash = vInfo.z;',
    '    if (N.y > 0.5) {',
    '      if (P.y < -0.5) {                                                    // pit floor',
    '        vec3 alb = uLoss * 0.55 * (0.8 + 0.4 * noise(P.xz * 0.5));',
    '        col = shade(alb, N, P, 0.55, 1.0);',
    '      } else {                                                             // the roof carries the cell\'s number',
    '        vec3 alb = sheetAt(P.xz, -0.6);',
    '        vec2 e = min(P.xz - vRect.xy, vRect.zw - P.xz); float rim = min(e.x, e.y), aw = fwidth(rim) + 0.001;',
    '        alb *= mix(1.08, 1.0, smoothstep(1.2 - aw, 1.2 + aw, rim));         // parapet cap',
    '        alb *= mix(0.80, 1.0, smoothstep(1.2, 2.4 + aw, rim));               // its shadow on the roof',
    '        alb = mix(alb, alb * 1.2 + 0.06, 0.6 * flash);',
    '        col = shade(alb, N, P, occlusionLot(P, cell), uTextK);',
    '      }',
    '    } else if (P.y < 0.0) {                                                // pit walls, shored in layers',
    '      vec3 alb = uLoss * (0.8 + 0.2 * step(0.5, fract(P.y / 6.0)));',
    '      col = shade(alb, N, P, mix(0.9, 0.45, clamp(-P.y / 70.0, 0.0, 1.0)), 1.0);',
    '    } else {',
    '      // facade: one row of windows per storey, the cell\'s fill colour as the wall',
    '      bool sx = abs(N.x) > 0.5;',
    '      float along = sx ? P.z - vRect.y : P.x - vRect.x, len = sx ? vRect.w - vRect.y : vRect.z - vRect.x;',
    '      int style = int(vCell.z + 0.5);',
    '      float bw = style == 2 ? 10.0 : style == 3 ? 12.5 : 15.5;',
    '      float bays = max(1.0, floor(len / bw + 0.5));',
    '      vec2 g = vec2(along / len * bays, P.y / uStorey), id = floor(g), f = fract(g), aa = fwidth(g) + 1e-5;',
    '      vec4 r = style == 0 ? vec4(0.22, 0.78, 0.26, 0.80) : style == 1 ? vec4(-0.1, 1.1, 0.30, 0.82) : style == 2 ? vec4(0.26, 0.74, 0.08, 0.94) : vec4(0.05, 0.95, 0.06, 0.95);',
    '      if (id.y < 0.5 && top > uStorey * 1.6 && style != 1) r.zw = vec2(0.12, 0.88);      // taller shopfront glazing',
    '      float wx = smoothstep(r.x - aa.x, r.x + aa.x, f.x) * (1.0 - smoothstep(r.y - aa.x, r.y + aa.x, f.x));',
    '      float wy = smoothstep(r.z - aa.y, r.z + aa.y, f.y) * (1.0 - smoothstep(r.w - aa.y, r.w + aa.y, f.y));',
    '      float keep = clamp(1.3 - max(aa.x, aa.y) * 3.5, 0.0, 1.0);             // far away: the average, no shimmer',
    '      float w = mix(clamp(r.y - r.x, 0.0, 1.0) * (r.w - r.z), wx * wy, keep);',
    '      if (P.y > top - 4.0 || (id.y + r.w) * uStorey > top - 3.0) w = 0.0;     // parapet, no half windows under it',
    '      vec3 alb = vTint;',
    '      float rnd = hash(id + vec2(cell) * 7.31 + N.xz * 3.7 + vCell.w);',
    '      vec3 Vv = normalize(uCam - P), Rr = reflect(-Vv, N);',
    '      float fres = 0.2 + 0.8 * pow(1.0 - max(dot(Vv, N), 0.0), 3.0);',
    '      vec3 sky = mix(uBounce * 0.7, uSky * 1.25, smoothstep(-0.2, 0.7, Rr.y));',
    '      float blind = step(0.92, rnd);',
    '      vec3 glass = mix(uGlass * mix(vec3(1.0), vTint, 0.35) * (0.7 + 0.5 * smoothstep(r.z, r.w, f.y)), vTint * 0.9, blind);',
    '      vec3 glow = w * fres * sky * 0.45 * (1.0 - blind);',
    '      glow += w * step(rnd, uLitShare * (1.0 + sel * 2.0)) * (1.0 - blind) * uLit * (1.1 - 0.5 * smoothstep(r.z, r.w, f.y));',
    '      alb *= 1.0 - 0.10 * (1.0 - smoothstep(0.04, 0.04 + aa.y, f.y)) * keep * step(P.y, top - 4.0);   // floor lines',
    '      if (style == 0) alb *= 1.0 - 0.07 * (1.0 - smoothstep(0.03, 0.03 + aa.x, min(f.x, 1.0 - f.x))) * keep;   // pilasters',
    '      alb = mix(alb, glass, w);',
    '      alb *= 1.0 + 0.10 * step(top - 4.0, P.y);                                 // the parapet band catches light',
    '      alb *= 1.0 - 0.2 * (1.0 - smoothstep(1.5, 2.5, P.y));                     // plinth',
    '      alb *= 0.97 + 0.06 * noise(vec2(along, P.y) * 0.8 + vec2(cell) * 17.0);   // card stock',
    '      float ao = occlusionLot(P, cell) * (0.62 + 0.38 * smoothstep(0.0, 36.0, P.y));',
    '      if (uPulseN > 0) glow += uPulseC * pulses(P.xz) * exp(-P.y / 26.0) * 2.0;',
    '      if (uRingN > 0) glow += uRingC * rings(P.xz) * exp(-P.y / 20.0) * 0.9;',
    '      glow += uAccent * sel * (0.05 + 0.35 * exp(-(top - P.y) / 16.0));          // the selected one is lit from its roof',
    '      alb = mix(alb, alb * 1.25 + 0.08, 0.6 * flash);',
    '      col = shade(alb, N, P, ao, 1.0) + glow * (0.45 + 0.55 * ao);',
    '    }',
    '  }',
    '  o = vec4(finish(col), alpha);',
    '}'].join('\n');

  var VS_MESH = HEAD + [
    'layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNorm; layout(location=2) in vec4 aCol;',
    'uniform mat4 uVP; uniform mat4 uM; out vec3 vP; out vec3 vN; out vec4 vC;',
    'void main(){ vec4 p = uM * vec4(aPos, 1.0); vP = p.xyz; vN = mat3(uM) * aNorm; vC = aCol; gl_Position = uVP * p; }'].join('\n');
  var FS_MESH = HEAD + 'in vec3 vP; in vec3 vN; in vec4 vC;\n' + LIGHT + [
    '',
    'uniform float uSlab; out vec4 o;',
    'void main(){',
    '  vec3 N = normalize(vN), Vv = normalize(uCam - vP);',
    '  float gloss = vC.a;                                                       // lacquer, glaze and foil shine',
    '  float under = 0.5 + 0.5 * smoothstep(-0.8, 0.4, N.y) * smoothstep(-uSlab - 1.0, -uSlab + 14.0, vP.y);   // darker where it meets the desk',
    '  vec3 col = shade(vC.rgb * (0.96 + 0.08 * noise(vP.xz * 1.1)), N, vP, under, 1.0);',
    '  float ndl = max(dot(N, uSun), 0.0);',
    '  col += gloss * uSunC * pow(max(dot(N, normalize(uSun + Vv)), 0.0), 60.0) * 0.8 * (ndl > 0.0 ? sunVis(vP, N) : 0.0);',
    '  col += gloss * (0.04 + 0.3 * pow(1.0 - max(dot(N, Vv), 0.0), 3.0)) * mix(uBounce, uSky, N.y * 0.5 + 0.5);',
    '  o = vec4(finish(col), 1.0);',
    '}'].join('\n');
  var FS_NONE = HEAD + 'out vec4 o; void main(){ o = vec4(1.0); }';

  // ================================================================== props: parts → meshes
  // Everything on the desk is built from these parts, in the object's own frame (y up, origin on the desk, px).
  // Colours are '#rrggbb' strings; gloss 0 (paper, wood) .. 1 (lacquer, glaze, metal).
  var parts = {
    // a surface turned around an axis: profile [[pos, radius], …] along y (upright) or x (lying); colours per segment
    lathe: function (profile, colours, o) { return Object.assign({ kind: 'lathe', profile: profile, colours: [].concat(colours) }, o || {}); },
    ball: function (c, r, colour, gloss, scale) { return { kind: 'ball', c: c, r: r, colour: colour, gloss: gloss || 0.2, scale: scale || [1, 1, 1] }; },
    box: function (lo, hi, colour, gloss) { return { kind: 'box', lo: lo, hi: hi, colour: colour, gloss: gloss || 0.1 }; },
    torus: function (c, R, r, colour, gloss, axis) { return { kind: 'torus', c: c, R: R, r: r, colour: colour, gloss: gloss || 0.3, axis: axis || 'y' }; },
    // an object on the desk: at [x, z] in sheet px from the sheet's centre, turned by yaw, raised by lift
    object: function (o) { return Object.assign({ at: [0, 0], yaw: 0, lift: 0, parts: [] }, o); },
    // presets (examples of the parts in use; a topic designs its own)
    pencil: function (o) {
      o = Object.assign({ length: 520, r: 12, body: '#d9821a', ferrule: '#b9b3a6', eraser: '#d77b78', wood: '#d8b38a', lead: '#1e1e22' }, o);
      var L = o.length, r = o.r, P = parts;
      return P.object(Object.assign({}, o, {
        lift: r * 0.87, tip: [L, 0, 0], writer: !!o.writer,
        parts: [
          P.lathe([[0, r * 0.82], [L * 0.05, r * 0.82]], o.eraser, { axis: 'x', gloss: 0.05, capStart: true }),
          P.lathe([[L * 0.05, r * 0.9], [L * 0.07, r * 0.9], [L * 0.072, r * 0.84], [L * 0.09, r * 0.84], [L * 0.092, r * 0.9], [L * 0.13, r * 0.9]], o.ferrule, { axis: 'x', gloss: 0.9 }),
          P.lathe([[L * 0.13, r], [L * 0.86, r]], o.body, { axis: 'x', sides: 6, smooth: false, gloss: 0.8, capStart: true }),
          P.lathe([[L * 0.86, r * 0.93], [L * 0.97, r * 0.3]], o.wood, { axis: 'x', gloss: 0.05 }),
          P.lathe([[L * 0.97, r * 0.3], [L, 0.4]], o.lead, { axis: 'x', gloss: 0.5 })
        ]
      }));
    }
  };

  function meshBuilder() {
    var out = [];
    function push(p, n, col) { out.push(p[0], p[1], p[2], n[0], n[1], n[2], col[0], col[1], col[2], col[3]); }
    function C(hex, gloss) { var c = lin(hex || '#cccccc'); return [c[0], c[1], c[2], gloss == null ? 0.2 : gloss]; }
    function quad(a, b, c, d, na, nb, nc, nd, col) { push(a, na, col); push(b, nb, col); push(c, nc, col); push(a, na, col); push(c, nc, col); push(d, nd, col); }
    return {
      add: function (p) {
        if (p.kind === 'lathe') {
          var sides = p.sides || 24, smooth = p.smooth !== false, ax = p.axis === 'x', pr = p.profile;
          var at = function (s, r, a) { return ax ? [s, Math.sin(a) * r, Math.cos(a) * r] : [Math.cos(a) * r, s, Math.sin(a) * r]; };
          var nrm = function (a, tilt) { var n = ax ? [tilt, Math.sin(a), Math.cos(a)] : [Math.cos(a), tilt, Math.sin(a)]; return V.norm(n); };
          for (var k = 0; k + 1 < pr.length; k++) {
            var s0 = pr[k][0], r0 = pr[k][1], s1 = pr[k + 1][0], r1 = pr[k + 1][1], col = C(p.colours[Math.min(k, p.colours.length - 1)], p.gloss);
            var tilt = (r0 - r1) / Math.max(1e-3, Math.abs(s1 - s0));
            for (var i = 0; i < sides; i++) {
              var a0 = i / sides * 2 * Math.PI, a1 = (i + 1) / sides * 2 * Math.PI, am = (a0 + a1) / 2;
              var n0 = smooth ? nrm(a0, tilt) : nrm(am, tilt), n1 = smooth ? nrm(a1, tilt) : n0;
              if (ax) quad(at(s0, r0, a0), at(s0, r0, a1), at(s1, r1, a1), at(s1, r1, a0), n0, n1, n1, n0, col);
              else quad(at(s0, r0, a0), at(s1, r1, a0), at(s1, r1, a1), at(s0, r0, a1), n0, n0, n1, n1, col);
            }
          }
          var cap = function (s, r, sign, col) {
            if (r <= 0.01) return;
            var n = ax ? [sign, 0, 0] : [0, sign, 0];
            for (var i = 0; i < sides; i++) { var a0 = i / sides * 2 * Math.PI, a1 = (i + 1) / sides * 2 * Math.PI; push(at(s, 0, 0), n, col); push(at(s, r, a0), n, col); push(at(s, r, a1), n, col); }
          };
          if (p.capStart) cap(pr[0][0], pr[0][1], -1, C(p.colours[0], p.gloss));
          if (p.capEnd !== false) cap(pr[pr.length - 1][0], pr[pr.length - 1][1], 1, C(p.colours[p.colours.length - 1], p.gloss));
        } else if (p.kind === 'ball') {
          var col2 = C(p.colour, p.gloss), sc = p.scale, NB = 12, MB = 20;
          var S = function (i, j) { var th = i / NB * Math.PI, ph = j / MB * 2 * Math.PI; return [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; };
          var P2 = function (q) { return [p.c[0] + q[0] * p.r * sc[0], p.c[1] + q[1] * p.r * sc[1], p.c[2] + q[2] * p.r * sc[2]]; };
          var N2 = function (q) { return V.norm([q[0] / sc[0], q[1] / sc[1], q[2] / sc[2]]); };
          for (var bi = 0; bi < NB; bi++) for (var bj = 0; bj < MB; bj++) {
            var q00 = S(bi, bj), q01 = S(bi, bj + 1), q11 = S(bi + 1, bj + 1), q10 = S(bi + 1, bj);
            quad(P2(q00), P2(q01), P2(q11), P2(q10), N2(q00), N2(q01), N2(q11), N2(q10), col2);
          }
        } else if (p.kind === 'box') {
          var l = p.lo, h = p.hi, col3 = C(p.colour, p.gloss);
          var f = function (a, b, c, d, n) { quad(a, b, c, d, n, n, n, n, col3); };
          f([l[0], h[1], l[2]], [l[0], h[1], h[2]], [h[0], h[1], h[2]], [h[0], h[1], l[2]], [0, 1, 0]);
          f([l[0], l[1], h[2]], [h[0], l[1], h[2]], [h[0], h[1], h[2]], [l[0], h[1], h[2]], [0, 0, 1]);
          f([h[0], l[1], l[2]], [l[0], l[1], l[2]], [l[0], h[1], l[2]], [h[0], h[1], l[2]], [0, 0, -1]);
          f([h[0], l[1], h[2]], [h[0], l[1], l[2]], [h[0], h[1], l[2]], [h[0], h[1], h[2]], [1, 0, 0]);
          f([l[0], l[1], l[2]], [l[0], l[1], h[2]], [l[0], h[1], h[2]], [l[0], h[1], l[2]], [-1, 0, 0]);
        } else if (p.kind === 'torus') {
          var col4 = C(p.colour, p.gloss), NT = 28, NS = 12;
          var T = function (i, j) {
            var u = i / NT * 2 * Math.PI, v = j / NS * 2 * Math.PI, cx = Math.cos(u), sx = Math.sin(u);
            var n = [cx * Math.cos(v), Math.sin(v), sx * Math.cos(v)], q = [cx * (p.R + p.r * Math.cos(v)), p.r * Math.sin(v), sx * (p.R + p.r * Math.cos(v))];
            var sw = function (a) { return p.axis === 'x' ? [a[1], a[0], a[2]] : p.axis === 'z' ? [a[0], a[2], a[1]] : a; };
            q = sw(q); n = sw(n);
            return { p: [p.c[0] + q[0], p.c[1] + q[1], p.c[2] + q[2]], n: n };
          };
          for (var ti = 0; ti < NT; ti++) for (var tj = 0; tj < NS; tj++) {
            var a = T(ti, tj), b = T(ti + 1, tj), cc = T(ti + 1, tj + 1), d = T(ti, tj + 1);
            quad(a.p, b.p, cc.p, d.p, a.n, b.n, cc.n, d.n, col4);
          }
        }
      },
      data: function () { return new Float32Array(out); }
    };
  }

  // ================================================================== the engine
  function start(cfg) {
    cfg = merge(DEFAULTS, cfg || {});
    var canvas = cfg.canvas, host = cfg.sheet, book = cfg.book, doc = root.document;
    var hint = doc.createElement('p'); hint.className = 'sc-hint'; hint.textContent = cfg.hint;
    if (!HICR.supported('webgl')) { HICR.fallback(canvas, cfg.fallbackNote ? { note: cfg.fallbackNote } : undefined); doc.documentElement.classList.add('sc-plain'); return null; }
    var S = HICR.stage(canvas, { gl: { antialias: false, alpha: false, preserveDrawingBuffer: false }, maxDpr: 2 }), gl = S.gl;
    if (!gl || !S.way) { HICR.fallback(canvas); doc.documentElement.classList.add('sc-plain'); return null; }
    canvas.parentNode.appendChild(hint);
    var STILL = HICR.still !== null, CALM = HICR.calm;
    var L = cfg.look;

    // ---- the sheet's geometry, in its own CSS px (= world units); the sheet's centre is the world origin
    var W = host.offsetWidth, H = host.offsetHeight, TS = cfg.texScale;
    var SLAB = cfg.slab, INSET = cfg.inset;
    var lots = book.lots(), NT = lots.length, lotOf = {};
    lots.forEach(function (t, k) { lotOf[t.i] = k; });
    var GC = book.CITY.c1 - book.CITY.c0 + 1, GR = book.CITY.r1 - book.CITY.r0 + 1;
    var G = { x: lots[0].x - W / 2, z: lots[0].y - H / 2, w: lots[0].w, h: lots[0].h };
    var uniform = lots.every(function (t) { return Math.abs(t.w - G.w) < 1.5 && Math.abs(t.h - G.h) < 1.5; });
    var hNow = new Float32Array(NT), hVel = new Float32Array(NT), hGoal = new Float32Array(NT), wait = new Float32Array(NT), flash = new Float32Array(NT);
    var pending = new Uint8Array(NT);
    function heightFor(i) {
      var v = book.value(i);
      if (typeof v !== 'number' || !isFinite(v) || v === 0) return 0;
      var s = v / (book.unitOf(i) || cfg.unit);
      return s > 0 ? Math.min(cfg.tallest, s * cfg.storey) : -Math.min(cfg.deepest, 10 + 16 * Math.sqrt(-s));
    }
    lots.forEach(function (t, k) { hGoal[k] = heightFor(t.i); });

    // ---- GL programs and buffers
    var G_ = HICR.gl;
    var progBox = G_.program(gl, VS_BOX, FS_BOX), progMesh = G_.program(gl, VS_MESH, FS_MESH);
    // a lighter variant (3 shadow taps, no street occlusion) for slow devices; built only when needed
    var liteOf = function (fs) { return fs.replace(HEAD, HEAD + '#define LITE 1\n'); };
    function goLite() { if (lite) return; lite = true; progBox = G_.program(gl, VS_BOX, liteOf(FS_BOX)); progMesh = G_.program(gl, VS_MESH, liteOf(FS_MESH)); }
    var lite = false;
    var depthBox = G_.program(gl, VS_BOX, FS_NONE), depthMesh = G_.program(gl, VS_MESH, FS_NONE);
    var cube = [];
    function face(n, a, b, c, d) { [a, b, c, a, c, d].forEach(function (v) { cube.push(v[0], v[1], v[2], n[0], n[1], n[2]); }); }
    face([-1, 0, 0], [0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]);
    face([1, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]);
    face([0, 0, -1], [0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]);
    face([0, 0, 1], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]);
    face([0, 1, 0], [0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]);   // vertices 24..29: the top
    var cubeBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cube), gl.STATIC_DRAW);
    var STRIDE = 14, inst = new Float32Array(NT * STRIDE), instBuf = gl.createBuffer();
    function vao(instanced) {
      var v = gl.createVertexArray(); gl.bindVertexArray(v);
      gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuf);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
      if (instanced) {
        gl.bindBuffer(gl.ARRAY_BUFFER, instBuf); gl.bufferData(gl.ARRAY_BUFFER, inst.byteLength, gl.DYNAMIC_DRAW);
        [[2, 4, 0], [3, 4, 16], [4, 4, 32], [5, 2, 48]].forEach(function (a) { gl.enableVertexAttribArray(a[0]); gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, STRIDE * 4, a[2]); gl.vertexAttribDivisor(a[0], 1); });
      }
      gl.bindVertexArray(null); return v;
    }
    var lotVAO = vao(true), oneVAO = vao(false);

    // the live page as a texture (mipmapped: roofs are seen smaller than 1:1)
    var sheetTex = G_.texture(gl, { mips: true });
    var aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    var heightTex = G_.texture(gl, { w: GC, h: GR, internal: gl.R32F, format: gl.RED, type: gl.FLOAT, filter: 'nearest' });
    var heightData = new Float32Array(GC * GR);

    // shadow map
    var SM = cfg.shadowSize;
    var shadowTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, shadowTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SM, SM);
    [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
      [gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE], [gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL]].forEach(function (p) { gl.texParameteri(gl.TEXTURE_2D, p[0], p[1]); });
    var shadowFB = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadowTex, 0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE); gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // ---- the frame: drawn into a multisampled target and resolved (or straight to the canvas on a slow device)
    var AA = Math.min(4, gl.getParameter(gl.MAX_SAMPLES)), aaChecked = false, msFB = null, msColor = null, msDepth = null, msW = 0, msH = 0;
    function msTarget(w, h) {
      if (w === msW && h === msH && msFB) return;
      if (msFB) { gl.deleteFramebuffer(msFB); gl.deleteRenderbuffer(msColor); gl.deleteRenderbuffer(msDepth); }
      msW = w; msH = h;
      msColor = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, msColor); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, AA, gl.RGB8, w, h);   // = the canvas's own format (alpha: false), or the resolve fails
      msDepth = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, msDepth); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, AA, gl.DEPTH_COMPONENT24, w, h);
      msFB = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, msFB);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msColor);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, msDepth);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // ---- props
    var props = (typeof cfg.props === 'function' ? cfg.props(parts, W, H) : cfg.props) || [];
    props.forEach(function (o) {
      var mb = meshBuilder(); o.parts.forEach(mb.add);
      var data = mb.data(), buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      var v = gl.createVertexArray(); gl.bindVertexArray(v);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 40, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 40, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 40, 24);
      gl.bindVertexArray(null);
      o.vao = v; o.count = data.length / 10; o.M = new Float32Array(16);
      o.pose = { u: 0, goal: 0, cell: -1, wiggle: 0 };
    });
    var writer = props.filter(function (o) { return o.writer; })[0] || null;
    // rest pose: lying on the desk, turned by yaw; writing pose: tip on the cell's roof, the body raised toward the viewer
    function poseProp(o, clock) {
      var yaw = o.yaw || 0, dRest = [Math.cos(yaw), 0, Math.sin(yaw)];
      var origin = [o.at[0], -SLAB + (o.lift || 0), o.at[1]], d = dRest;
      if (o.writer && o.pose.u > 0.0005 && o.pose.cell >= 0) {
        var e = o.pose.u, b = book.box(book.td(o.pose.cell)), k = lotOf[o.pose.cell], L0 = o.tip[0];
        var target = [b.x + b.w * 0.7 - W / 2, (k === undefined ? 0 : Math.max(0, hNow[k])) + 1.5, b.y + b.h * 0.62 - H / 2];
        var d1 = V.norm([-0.42, -0.78, -0.46]);
        var tip0 = [origin[0] + dRest[0] * L0, origin[1], origin[2] + dRest[2] * L0];
        var s = e < 0.16 ? -0.05 * Math.sin(Math.PI * e / 0.16) : 1 - Math.pow(1 - (e - 0.16) / 0.84, 3) * (1 - 1.7 * (e - 0.16) / 0.84 * 0);  // pull back, then go
        var arc = Math.sin(Math.PI * clamp(s, 0, 1));
        d = V.norm([mix(dRest[0], d1[0], clamp(s, 0, 1)), mix(dRest[1], d1[1], clamp(s, 0, 1)), mix(dRest[2], d1[2], clamp(s, 0, 1))]);
        var tip = [mix(tip0[0], target[0], s), mix(tip0[1], target[1], clamp(s, 0, 1)) + 70 * arc + (e < 0.16 ? 14 * Math.sin(Math.PI * e / 0.16) : 0), mix(tip0[2], target[2], s)];
        if (o.pose.wiggle) { tip[0] += 2.4 * Math.sin(clock * 37); tip[2] += 1.6 * Math.cos(clock * 29); tip[1] += 0.6 + 0.6 * Math.sin(clock * 23); }
        origin = [tip[0] - d[0] * L0, tip[1] - d[1] * L0, tip[2] - d[2] * L0];
      }
      var side = V.norm(V.cross(d, [0, 1, 0])), up = V.cross(side, d);
      if (o.writer || (o.parts[0] && o.parts[0].axis === 'x')) o.M.set([d[0], d[1], d[2], 0, up[0], up[1], up[2], 0, side[0], side[1], side[2], 0, origin[0], origin[1], origin[2], 1]);
      else { var c = Math.cos(yaw), sn = Math.sin(yaw); o.M.set([c, 0, sn, 0, 0, 1, 0, 0, -sn, 0, c, 0, origin[0], origin[1], origin[2], 1]); }
    }

    // ---- the sun and its shadow frustum (fitted around the sheet, the props and the tallest tower)
    var SUN = V.norm(L.sun);
    var propReach = 0; props.forEach(function (o) { propReach = Math.max(propReach, Math.abs(o.at[0]) - W / 2 + 160, Math.abs(o.at[1]) - H / 2 + 160); });
    var margin = Math.max(80, propReach);
    var sunVP = (function () {
      var f = [-SUN[0], -SUN[1], -SUN[2]], r = V.norm(V.cross(f, [0, 1, 0])), u = V.cross(r, f), eye = [SUN[0] * 4000, SUN[1] * 4000, SUN[2] * 4000];
      var view = viewOf(eye, r, u, f), lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
      [-W / 2 - margin, W / 2 + margin].forEach(function (x) { [-SLAB - 2, cfg.tallest + 40].forEach(function (y) { [-H / 2 - margin, H / 2 + margin].forEach(function (z) {
        for (var k = 0; k < 3; k++) { var p = view[k] * x + view[4 + k] * y + view[8 + k] * z + view[12 + k]; lo[k] = Math.min(lo[k], p); hi[k] = Math.max(hi[k], p); }
      }); }); });
      return HICR.mat4.mul(ortho(lo[0], hi[0], lo[1], hi[1], -hi[2] - 10, -lo[2] + 10), view);
    })();
    function viewOf(e, r, u, f) { return new Float32Array([r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -V.dot(r, e), -V.dot(u, e), V.dot(f, e), 1]); }
    function ortho(l, r, b, t, n, f) { return new Float32Array([2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0, -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1]); }

    // ---- camera: orbit around a target on the desk
    var FOV = cfg.camera.fov * Math.PI / 180;
    var cam = { yaw: 0, pitch: 1.4, dist: 3000, tx: 0, ty: 0, tz: 0 }, home = null;
    var VP = new Float32Array(16), camPos = [0, 0, 0], camR = [1, 0, 0], camU = [0, 1, 0], camF = [0, 0, -1], near = 40, far = 20000, camKey = '', camStamp = 0;
    function basis(yaw, pitch) {
      var cp = Math.cos(pitch), sp = Math.sin(pitch);
      var f = [-cp * Math.sin(yaw), -sp, -cp * Math.cos(yaw)], r = [Math.cos(yaw), 0, -Math.sin(yaw)];
      return { f: f, r: r, u: V.cross(r, f) };
    }
    // the view that shows the whole model (tallest tower included) with a margin, centred
    function fit(yaw, pitch, only) {
      var b = basis(yaw, pitch), asp = S.W / S.H, ty = Math.tan(FOV / 2), tx = ty * asp, m = cfg.camera.margin;
      var pts = [];
      [-W / 2, W / 2].forEach(function (x) { [-H / 2, H / 2].forEach(function (z) { pts.push([x, 0, z]); }); });
      if (!only) props.forEach(function (o) { pts.push([o.at[0], 0, o.at[1]]); });
      if (!only) for (var k = 0; k < NT; k++) { var t = lots[k], y = Math.min(Math.max(hGoal[k], 0), cfg.tallest); if (y > 30) pts.push([t.x - W / 2, y, t.y - H / 2], [t.x + t.w - W / 2, y, t.y + t.h - H / 2]); }
      var target = [0, 0, 0], dist = 3000;
      for (var n = 0; n < 6; n++) {
        var need = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        pts.forEach(function (p) {
          var d = sub(p, target), a = V.dot(d, b.r), c = V.dot(d, b.u), z = V.dot(d, b.f);
          need = Math.max(need, Math.abs(a) / (tx * m) - z, Math.abs(c) / (ty * m) - z);
          var sx = a / ((dist + z) * tx), sy = c / ((dist + z) * ty);
          x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
        });
        if (n) for (var q = 0; q < 3; q++) target[q] += b.r[q] * (x0 + x1) / 2 * dist * tx + b.u[q] * (y0 + y1) / 2 * dist * ty;
        dist = need;
      }
      return { yaw: yaw, pitch: pitch, dist: dist, tx: target[0], ty: target[1], tz: target[2] };
    }
    function homeView() { var portrait = S.W / S.H < 0.9; return fit(cfg.camera.yaw * (portrait ? 0.5 : 1), portrait ? cfg.camera.phonePitch : cfg.camera.pitch); }
    function updateCamera() {
      var b = basis(cam.yaw, cam.pitch);
      camF = b.f; camR = b.r; camU = b.u;
      camPos = [cam.tx - camF[0] * cam.dist, cam.ty - camF[1] * cam.dist, cam.tz - camF[2] * cam.dist];
      var key = [cam.yaw, cam.pitch, cam.dist, cam.tx, cam.ty, cam.tz, S.W, S.H].map(function (v) { return v.toFixed(3); }).join();
      if (key !== camKey) { camKey = key; camStamp++; }
      near = Math.max(30, cam.dist * 0.15); far = cam.dist * 3 + 9000;
      VP = HICR.mat4.mul(HICR.mat4.perspective(FOV, S.W / S.H, near, far), viewOf(camPos, camR, camU, camF));
    }
    function project(p) {
      var x = VP[0] * p[0] + VP[4] * p[1] + VP[8] * p[2] + VP[12], y = VP[1] * p[0] + VP[5] * p[1] + VP[9] * p[2] + VP[13], w = VP[3] * p[0] + VP[7] * p[1] + VP[11] * p[2] + VP[15];
      return w > 1e-6 ? [(x / w * 0.5 + 0.5) * S.W, (0.5 - y / w * 0.5) * S.H] : null;
    }

    // ---- hit testing: find what is under the pointer, then tell the browser where the sheet is drawn there
    function rayAt(px, py) {
      var ty = Math.tan(FOV / 2), tx = ty * S.W / S.H, nx = (px / S.W * 2 - 1) * tx, ny = (1 - py / S.H * 2) * ty;
      return V.norm([camF[0] + camR[0] * nx + camU[0] * ny, camF[1] + camR[1] * nx + camU[1] * ny, camF[2] + camR[2] * nx + camU[2] * ny]);
    }
    function pick(px, py) {
      var d = rayAt(px, py), o = camPos, best = { kind: 'none', t: Infinity };
      for (var k = 0; k < NT; k++) {
        var h = hNow[k]; if (h <= 0.5) continue;
        var b = k * STRIDE, lo = [inst[b], 0, inst[b + 1]], hi = [inst[b + 2], h, inst[b + 3]], t0 = -Infinity, t1 = Infinity, axis = -1, miss = false;
        for (var a = 0; a < 3; a++) {
          if (Math.abs(d[a]) < 1e-9) { if (o[a] < lo[a] || o[a] > hi[a]) { miss = true; break; } continue; }
          var ta = (lo[a] - o[a]) / d[a], tb = (hi[a] - o[a]) / d[a];
          if (ta > tb) { var s = ta; ta = tb; tb = s; }
          if (ta > t0) { t0 = ta; axis = a; }
          if (tb < t1) t1 = tb;
          if (t0 > t1) { miss = true; break; }
        }
        if (miss || t0 <= 0 || t0 >= best.t) continue;
        best = { kind: axis === 1 ? 'roof' : 'wall', k: k, t: t0 };
      }
      if (d[1] < -1e-6) {
        var t = -o[1] / d[1];
        if (t > 0 && t < best.t) { var x = o[0] + d[0] * t, z = o[2] + d[2] * t; if (Math.abs(x) <= W / 2 && Math.abs(z) <= H / 2) best = { kind: 'sheet', t: t, x: x + W / 2, z: z + H / 2 }; }
      }
      best.depth = isFinite(best.t) ? best.t * V.dot(d, camF) : 0;
      return best;
    }
    // The matrix (CSS matrix3d order) that carries the flat sheet onto the horizontal plane y of the scene, in canvas px.
    function planeMatrix(y) {
      var col = function (i) { return [VP[i * 4], VP[i * 4 + 1], VP[i * 4 + 2], VP[i * 4 + 3]]; };
      var cx = col(0), cy = col(1), cz = col(2), c3 = col(3);
      var c1 = [0, 1, 2, 3].map(function (k) { return -W / 2 * cx[k] + y * cy[k] - H / 2 * cz[k] + c3[k]; });
      var X = function (c) { return 0.5 * S.W * (c[0] + c[3]); }, Y = function (c) { return 0.5 * S.H * (c[3] - c[1]); };
      if (!(c1[3] > 1e-4)) return null;
      var k = 1 / c1[3];
      return [X(cx) * k, Y(cx) * k, 0, cx[3] * k, X(cz) * k, Y(cz) * k, 0, cz[3] * k, 0, 0, 1, 0, X(c1) * k, Y(c1) * k, 0, 1];
    }
    var ptr = { x: 0, y: 0, inside: false }, hit = { kind: 'none' }, lock = null, placeSig = '';
    function syncPlace(force) {
      if (!ready) return;
      if (!lock) hit = ptr.inside && !orbit ? pick(ptr.x, ptr.y) : { kind: 'none' };
      var h = lock || hit, m = null, sig;
      if (h.kind === 'sheet') { m = planeMatrix(0); sig = 's' + camStamp; }
      else if (h.kind === 'roof') { m = planeMatrix(hNow[h.k]); sig = 'r' + camStamp + ':' + hNow[h.k].toFixed(1); }
      else if (h.kind === 'wall') { var t = lots[h.k]; m = [1, 0, 0, 1, ptr.x - (t.x + t.w / 2), ptr.y - (t.y + t.h / 2)]; sig = 'w' + h.k + ':' + (ptr.x | 0) + ':' + (ptr.y | 0); }
      else if (book.editing >= 0) { var k = lotOf[book.editing], y = k === undefined ? 0 : Math.max(0, hNow[k]); m = planeMatrix(y); sig = 'e' + camStamp + ':' + y.toFixed(1); }
      else sig = 'n';
      if (sig === placeSig && !force) return;
      placeSig = sig;
      S.place(host, m);
    }

    // ---- input: orbit, zoom, pinch
    var orbit = false, press = null, yawVel = 0, pitchVel = 0, lastMove = 0, touched = false, acted = false, pointers = {};
    var snd = root.CitySound ? root.CitySound(cfg.sound) : null;
    function act() { if (!acted) { acted = true; stopDemo(); } }
    root.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.inside = ptr.x >= 0 && ptr.y >= 0 && ptr.x <= r.width && ptr.y <= r.height;
      if (pointers[e.pointerId]) pointers[e.pointerId] = [e.clientX, e.clientY];
      var ids = Object.keys(pointers);
      if (ids.length === 2 && press && press.pinch) {
        var a = pointers[ids[0]], b = pointers[ids[1]], dd = Math.hypot(a[0] - b[0], a[1] - b[1]);
        cam.dist = clamp(press.dist * press.pinch / Math.max(20, dd), home.dist * 0.25, home.dist * 1.6); dirty = true;
      } else if (press && !orbit && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) {
        orbit = true; touched = true; tween = null; canvas.classList.add('sc-orbit');
        press = { x: e.clientX, y: e.clientY, yaw: cam.yaw, pitch: cam.pitch };
        var sel = root.getSelection && root.getSelection(); if (sel && book.editing < 0) sel.removeAllRanges();
      }
      if (orbit && press) {
        var yaw = press.yaw - (e.clientX - press.x) * 0.0045, pitch = clamp(press.pitch + (e.clientY - press.y) * 0.0035, 0.22, 1.45);
        var now = performance.now(), dtm = Math.max(4, now - lastMove) / 1000;
        yawVel = mix(yawVel, (yaw - cam.yaw) / dtm, 0.5); pitchVel = mix(pitchVel, (pitch - cam.pitch) / dtm, 0.5); lastMove = now;
        cam.yaw = yaw; cam.pitch = pitch; dirty = true;
      }
      syncPlace();
    }, true);
    doc.documentElement.addEventListener('pointerleave', function () { ptr.inside = false; syncPlace(); });
    var LIVE = 'input, button, select, textarea, label, [contenteditable], output';
    canvas.addEventListener('pointerdown', function (e) {
      act();
      if (snd && acted && e.target === book.soundButton) return;
      pointers[e.pointerId] = [e.clientX, e.clientY];
      if (Object.keys(pointers).length === 2) { var ids = Object.keys(pointers), a = pointers[ids[0]], b = pointers[ids[1]]; press = { pinch: Math.hypot(a[0] - b[0], a[1] - b[1]), dist: cam.dist }; orbit = false; return; }
      if (e.button !== 0) return;
      if (e.target !== canvas) lock = hit.kind === 'none' ? null : hit;      // keep the sheet where it is while a press lasts
      if (e.target.closest && e.target.closest(LIVE)) return;                 // text fields, the slider and buttons keep their own drag
      press = { x: e.clientX, y: e.clientY, yaw: cam.yaw, pitch: cam.pitch }; yawVel = pitchVel = 0;
    });
    function release(e) {
      delete pointers[e.pointerId];
      press = null; lock = null;
      if (orbit) { orbit = false; canvas.classList.remove('sc-orbit'); if (performance.now() - lastMove > 90) yawVel = pitchVel = 0; }
      syncPlace(true);
    }
    root.addEventListener('pointerup', release, true);
    root.addEventListener('pointercancel', release, true);
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault(); act(); tween = null; touched = true;
      cam.dist = clamp(cam.dist * Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), home.dist * 0.25, home.dist * 1.6); dirty = true;
    }, { passive: false });
    doc.addEventListener('keydown', function () { act(); }, true);
    canvas.addEventListener('dragstart', function (e) { e.preventDefault(); });
    root.addEventListener('resize', function () { S.resize(); if (!touched && !tween) { home = homeView(); Object.assign(cam, home); } else home = homeView(); dirty = true; S.requestPaint(); });
    if (book.soundButton) {
      if (!snd) book.soundButton.hidden = true;
      else book.soundButton.addEventListener('click', function () {
        var on = snd.on ? (snd.disable(), false) : snd.enable();
        book.soundButton.setAttribute('aria-pressed', String(on));
        book.soundButton.classList.toggle('on', on);
      });
    }
    if (book.editor) book.editor.addEventListener('input', function () { if (snd) snd.tick(); });

    // ---- the sheet drives the city
    var pulses = [], ringsNow = [], rolls = {}, simTime = 0, stats = { pulses: 0, rings: 0, edits: 0 };
    var corner = function (i) { var b = book.box(book.td(i)); return [b.x + b.w - W / 2, b.y + b.h - H / 2]; };
    var SPEED = 900;
    book.on(function (e) {
      dirty = true;
      if (e.kind === 'select') { if (snd && e.source >= 0) snd.tap(); syncPlace(true); return; }
      if (e.kind === 'edit' || e.kind === 'cancel') { syncPlace(true); return; }
      if (e.kind === 'init') return;
      var src = e.source, changed = {};
      e.changed.forEach(function (i) { changed[i] = true; });
      // new heights
      var moved = [];
      e.changed.forEach(function (i) {
        var k = lotOf[i]; if (k === undefined) return;
        var g = heightFor(i); if (g === hGoal[k]) return;
        moved.push({ k: k, i: i, up: g > hGoal[k] });
        hGoal[k] = g;
      });
      if (e.kind === 'slide') {
        if (snd && book.slider) snd.slide((book.slider.value - book.slider.min) / (book.slider.max - book.slider.min));
        moved.forEach(function (m) { if (rolls[m.i]) { delete rolls[m.i]; book.unshow(m.i); } wait[m.k] = 0; });
        return;
      }
      // type / undo: the change travels the dependency graph; each dependant waits for its light to arrive
      stats.edits++;
      var delay = {}; delay[src] = 0;
      var queue = [src], routes = [];
      while (queue.length) {
        var p = queue.shift(), from = corner(p);
        book.dependents(p).forEach(function (d) {
          if (!changed[d]) return;
          var to = corner(d), len = Math.abs(to[0] - from[0]) + Math.abs(to[1] - from[1]), t = delay[p] + len / SPEED;
          if (delay[d] === undefined || t < delay[d] - 1e-6) { delay[d] = t; queue.push(d); routes.push({ a: from, b: to, len: len, start: delay[p], d: d }); }
        });
      }
      routes.forEach(function (r) { if (delay[r.d] !== undefined && Math.abs(r.start + r.len / SPEED - delay[r.d]) < 1e-6) { pulses.push({ a: r.a, b: r.b, len: r.len, t0: simTime + r.start }); stats.pulses++; } });
      if (pulses.length > 24) pulses.splice(0, pulses.length - 24);
      moved.forEach(function (m) {
        var dl = delay[m.i] !== undefined ? delay[m.i] : 0;
        if (m.i === src) { wait[m.k] = 0; flash[m.k] = 0.6; if (snd) snd.grow(Math.abs(hGoal[m.k]) / cfg.tallest, 0, m.up); }
        else { wait[m.k] = CALM ? 0 : dl; pending[m.k] = 1;
          if (snd) snd.grow(Math.abs(hGoal[m.k]) / cfg.tallest, dl, m.up);
        }
      });
      // every dependant, building or printed, holds its old figure until its light arrives, then counts to the new one
      if (!CALM) e.changed.forEach(function (i) {
        var before = e.before[i], now = book.value(i);
        if (i !== src && delay[i] !== undefined && typeof before === 'number' && typeof now === 'number') { rolls[i] = { from: before, to: now, t: 0, at: simTime + delay[i] }; book.show(i, before); }
      });
      var ks = lotOf[src];
      if (ks !== undefined && !CALM) { ringsNow.push({ k: ks, t: 0 }); stats.rings++; }
      if (acted) hint.classList.remove('show');
    });

    // ---- simulation (runs on simulated seconds: #still freezes it; advance() steps it for stills and checks)
    var dirty = true, shadowDirty = true, tween = null, released = STILL || CALM, stiffness = 1, idleFrom = 0, script = [], demoTyping = false, holdCam = false;
    function step(dt) {
      simTime += dt;
      runScript();
      var moving = false;
      for (var k = 0; k < NT; k++) {
        if (!released) continue;
        if (wait[k] > 0) { wait[k] -= dt; moving = true; if (wait[k] > 0) continue; }
        if (pending[k]) { pending[k] = 0; flash[k] = 1; }
        var x = hGoal[k] - hNow[k];
        if (Math.abs(x) > 0.03 || Math.abs(hVel[k]) > 0.05) {
          // weight sets timing: a tall building is heavier, so it starts later and settles slower; calm = no overshoot
          var heavy = clamp(Math.abs(hGoal[k]) / cfg.tallest, 0, 1), kk = mix(150, 80, heavy) * stiffness, cc = CALM ? 2 * Math.sqrt(kk) : mix(15, 12, heavy) * Math.sqrt(stiffness);
          var was = hNow[k];
          hVel[k] += (kk * x - cc * hVel[k]) * dt; hNow[k] += hVel[k] * dt;
          if ((hGoal[k] >= 0 && was >= 0 && hNow[k] < 0) || (hGoal[k] <= 0 && was <= 0 && hNow[k] > 0)) { hNow[k] = 0; hVel[k] = 0; }   // a tower never dips into a pit
          moving = true;
        } else if (hNow[k] !== hGoal[k]) { hNow[k] = hGoal[k]; hVel[k] = 0; moving = true; }
        if (flash[k] > 0.004) { flash[k] *= Math.exp(-dt * 3); moving = true; } else flash[k] = 0;
      }
      if (moving) { dirty = true; shadowDirty = true; }
      // a dependant holds its old figure until its light arrives, then counts to the new one
      Object.keys(rolls).forEach(function (i) {
        var r = rolls[i]; i = +i;
        if (book.editing === i) { delete rolls[i]; return; }
        if (simTime < r.at) return;
        r.t += dt / 0.5;
        if (r.t >= 1) { delete rolls[i]; book.unshow(i); }
        else { var e = 1 - Math.pow(1 - r.t, 3); book.show(i, r.from + (r.to - r.from) * e); }
        dirty = true;
      });
      for (var n = 0; n < pulses.length; n++) { if ((simTime - pulses[n].t0) * SPEED > pulses[n].len + 450) pulses.splice(n--, 1); dirty = true; }
      for (n = 0; n < ringsNow.length; n++) { ringsNow[n].t += dt; if (ringsNow[n].t > 0.9) ringsNow.splice(n--, 1); dirty = true; }
      props.forEach(function (o) {
        var p = o.pose;
        if (p.u !== p.goal || p.wiggle) { p.u = p.goal > p.u ? Math.min(p.goal, p.u + dt / 1.0) : Math.max(p.goal, p.u - dt / 0.85); dirty = shadowDirty = true; }
      });
      if (tween) {
        tween.t += dt / tween.dur; var e = ease(tween.t);
        for (var key in tween.to) cam[key] = tween.via ? (1 - e) * (1 - e) * tween.from[key] + 2 * e * (1 - e) * tween.via[key] + e * e * tween.to[key] : mix(tween.from[key], tween.to[key], e);
        if (tween.t >= 1) tween = null;
        dirty = true;
      } else if (!orbit && (Math.abs(yawVel) > 0.003 || Math.abs(pitchVel) > 0.003)) {
        cam.yaw += yawVel * dt; cam.pitch = clamp(cam.pitch + pitchVel * dt, 0.22, 1.45);
        var dk = Math.exp(-dt * 5); yawVel *= dk; pitchVel *= dk; dirty = true;
      }
    }
    function later(s, f) { script.push({ at: simTime + s, f: f }); }
    function runScript() { for (var n = 0; n < script.length; n++) if (script[n].at <= simTime) { var e = script.splice(n--, 1)[0]; e.f(); } }
    function rise() {
      released = true; stiffness = 0.75;                                     // springier while the city first comes up
      var rnd = HICR.rng(7);
      lots.forEach(function (t, k) { wait[k] = 0.05 * t.c + 0.025 * t.r + 0.04 * rnd(); });
      later(2.6, function () { stiffness = 1; });
    }
    function stopDemo() {
      script = []; stiffness = 1; holdCam = false;
      if (writer) { writer.pose.goal = 0; writer.pose.wiggle = 0; }
      if (demoTyping) { demoTyping = false; book.cancel(); }
      if (!released) rise();
      hint.classList.add('show');
      if (!touched && home && (tween || Math.abs(cam.dist - home.dist) > 30 || Math.abs(cam.pitch - home.pitch) > 0.02)) tween = { from: Object.assign({}, cam), to: home, t: 0, dur: 1.3 };
    }
    function intro() {
      home = homeView();
      if (STILL || CALM || !cfg.intro.swoop || HICR.param('nointro') !== null) {
        Object.assign(cam, home); released = true;
        for (var k = 0; k < NT; k++) hNow[k] = hGoal[k];
        if (!STILL) hint.classList.add('show');
        return;
      }
      // open flat and close: plainly a spreadsheet, for a blink; then one swoop down low and back out to the whole desk
      var flat = fit(0, 1.45, true), a = lots[Math.min(NT - 1, GC + 1)], mid = lots[Math.floor(NT / 2)];
      Object.assign(cam, { yaw: -0.08, pitch: 1.3, dist: flat.dist * 0.55, tx: a.x - W / 2, ty: 0, tz: a.y - H / 2 });
      var low = { yaw: -0.9, pitch: 0.12, dist: home.dist * 0.32, tx: mid.x - W / 2, ty: 60, tz: mid.y - H / 2 };
      later(0.05, function () { if (!acted) { tween = { from: Object.assign({}, cam), via: low, to: home, t: 0, dur: 3.0 }; idleFrom = simTime + 3.0; } });
      later(0.1, rise);
      var w = cfg.intro.write, cell = w ? book.parse(w.cell) : -1;
      if (writer && cell >= 0) {
        // the writer prop makes the first edit, and the camera follows the light down to what it changed
        var b = book.box(book.td(cell));
        var nearV = { yaw: -0.42, pitch: 0.62, dist: home.dist * 0.45, tx: b.x - W / 2 + 160, ty: 20, tz: b.y - H / 2 + 50 };
        later(3.0, function () { holdCam = true; tween = { from: Object.assign({}, cam), to: nearV, t: 0, dur: 1.4 }; writer.pose.cell = cell; writer.pose.goal = 1; });
        later(4.05, function () { demoTyping = true; book.edit(cell, ''); writer.pose.wiggle = 1; });
        String(w.text).split('').forEach(function (ch, n) { later(4.25 + n * 0.22, function () { if (demoTyping) { book.editor.value += ch; if (snd) snd.tick(); S.requestPaint(); } }); });
        var tEnd = 4.25 + String(w.text).length * 0.22;
        later(tEnd + 0.15, function () { writer.pose.wiggle = 0; writer.pose.goal = 0; });
        later(tEnd + 0.4, function () { demoTyping = false; book.commit(); tween = { from: Object.assign({}, cam), to: Object.assign({}, nearV, { dist: nearV.dist * 0.92, tz: nearV.tz + 60 }), t: 0, dur: 1.6 }; });
        later(tEnd + 3.4, function () { tween = { from: Object.assign({}, cam), to: home, t: 0, dur: 2.2 }; idleFrom = simTime + 2.2; });
        later(tEnd + 5.6, function () { holdCam = false; hint.classList.add('show'); });
      } else later(3.2, function () { hint.classList.add('show'); });
    }

    // ---- drawing
    function fillInstances() {
      var sel = book.selected;
      for (var k = 0; k < NT; k++) {
        var t = lots[k], b = k * STRIDE, h = hNow[k];
        inst[b] = t.x - W / 2 + INSET; inst[b + 1] = t.y - H / 2 + INSET; inst[b + 2] = t.x + t.w - W / 2 - INSET; inst[b + 3] = t.y + t.h - H / 2 - INSET;
        if (Math.abs(h) < 0.5) { inst[b + 2] = inst[b]; inst[b + 3] = inst[b + 1]; }       // flat: no building at all
        inst[b + 4] = 0; inst[b + 5] = h; inst[b + 6] = flash[k]; inst[b + 7] = t.i === sel ? 1 : 0;
        inst[b + 8] = t.c; inst[b + 9] = t.r; inst[b + 10] = t.style; inst[b + 11] = t.seed;
        inst[b + 12] = (t.x + 3) / W; inst[b + 13] = (t.y + 3) / H;
        heightData[t.r * GC + t.c] = h;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, instBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst);
      gl.bindTexture(gl.TEXTURE_2D, heightTex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, GC, GR, gl.RED, gl.FLOAT, heightData);
    }
    lots.forEach(function (t) { var cls = (t.row && t.row.cls) || ''; t.style = STYLE[(t.row && t.row.facade) || cfg.facade[cls] || cfg.facade['default']] || 0; t.seed = (t.i * 0.6180339) % 1 * 10; });
    var U = {
      sun: SUN, sunC: lin(L.sunColor).map(function (c) { return c * L.sunPower; }), sky: lin(L.sky), bounce: lin(L.bounce), backdrop: lin(L.backdrop),
      desk: lin(L.desk), deskLine: lin(L.deskLine), paper: lin(L.paper), glass: lin(L.glass), lit: lin(L.lit), accent: lin(L.accent), pulse: lin(L.pulse), ring: lin(L.ring), loss: lin(L.loss)
    };
    var bg = (function () { var c = lin(L.backdrop).map(function (v) { return Math.pow(v, 1 / 2.2); }); return c; })();
    function lighting(p) {
      var u = p.u;
      gl.uniformMatrix4fv(u.uSunVP, false, sunVP); gl.uniform3fv(u.uSun, U.sun); gl.uniform3fv(u.uSunC, U.sunC);
      gl.uniform3fv(u.uSky, U.sky); gl.uniform3fv(u.uBounce, U.bounce); gl.uniform1f(u.uAmb, L.ambient); gl.uniform3fv(u.uCam, camPos);
      gl.uniform1f(u.uTexel, 1 / SM); gl.uniform3fv(u.uBackdrop, U.backdrop);
      var w = L.window, bars = w.bars || [0, 0];
      gl.uniform4f(u.uPane, w.x0, w.y0, w.x1, w.y1); gl.uniform4f(u.uPaneB, bars[0], bars[1], w.soft, w.bar || 0.01);
      gl.uniform2f(u.uRes, canvas.width, canvas.height); gl.uniform1f(u.uVig, L.vignette); gl.uniform1f(u.uContrast, L.contrast);
      if (u.uShadow) { gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, shadowTex); gl.uniform1i(u.uShadow, 2); }
    }
    function boxUniforms(p, vp) {
      var u = p.u;
      gl.uniformMatrix4fv(u.uVP, false, vp);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sheetTex); gl.uniform1i(u.uSheet, 0);
      if (u.uHeights) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, heightTex); gl.uniform1i(u.uHeights, 1); }
      if (u.uCells) gl.uniform2f(u.uCells, GC, GR);
      gl.uniform1i(u.uKit, 0); gl.uniform1i(u.uLid, 0); gl.uniform1f(u.uStorey, cfg.storey); if (u.uTall) gl.uniform1f(u.uTall, cfg.tallest);
      if (u.uGrid) {
        gl.uniform4f(u.uGrid, G.x, G.z, G.w, G.h); gl.uniform2f(u.uCells, GC, GR); gl.uniform2f(u.uSheetSize, W, H);
        gl.uniform1f(u.uInset, INSET); gl.uniform1f(u.uSlab, SLAB); gl.uniform1f(u.uTextK, L.textShadow);
        gl.uniform3fv(u.uDesk, U.desk); gl.uniform3fv(u.uDeskLine, U.deskLine); gl.uniform1i(u.uDeskKind, { mat: 0, wood: 1, linen: 2 }[L.deskKind] || 0);
        gl.uniform1f(u.uDeskGrid, L.deskGrid); gl.uniform1f(u.uGrain, L.grain); gl.uniform3fv(u.uPaper, U.paper);
        gl.uniform3fv(u.uGlass, U.glass); gl.uniform3fv(u.uLit, U.lit); gl.uniform1f(u.uLitShare, L.litShare); gl.uniform3fv(u.uAccent, U.accent); gl.uniform3fv(u.uLoss, U.loss);
        gl.uniform3fv(u.uPulseC, U.pulse); gl.uniform3fv(u.uRingC, U.ring);
      }
    }
    function one(p, mode, rect, y0, y1, first, count) {
      if (p.u.uMode) gl.uniform1i(p.u.uMode, mode);
      gl.vertexAttrib4f(2, rect[0], rect[1], rect[2], rect[3]); gl.vertexAttrib4f(3, y0, y1, 0, 0); gl.vertexAttrib4f(4, -9, -9, 0, 0); gl.vertexAttrib2f(5, 0.5, 0.5);
      gl.drawArrays(gl.TRIANGLES, first, count);
    }
    function drawBoxes(p, full) {
      gl.bindVertexArray(lotVAO);
      if (p.u.uMode) gl.uniform1i(p.u.uMode, 1);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 30, NT);
      if (p.u.uMode) gl.uniform1i(p.u.uMode, 3);
      for (var kit = 1; kit <= 3; kit++) { gl.uniform1i(p.u.uKit, kit); gl.drawArraysInstanced(gl.TRIANGLES, 0, 30, NT); }
      gl.uniform1i(p.u.uKit, 0);
      gl.bindVertexArray(oneVAO);
      one(p, 0, [-W / 2, -H / 2, W / 2, H / 2], -SLAB, 0, 0, 30);
      if (full) one(p, 2, [-30000, -30000, 30000, 30000], -SLAB, -SLAB, 24, 6);
      gl.bindVertexArray(null);
    }
    function drawProps(p) {
      props.forEach(function (o) { gl.uniformMatrix4fv(p.u.uM, false, o.M); gl.bindVertexArray(o.vao); gl.drawArrays(gl.TRIANGLES, 0, o.count); });
      gl.bindVertexArray(null);
    }
    var pulseA = new Float32Array(32), pulseT = new Float32Array(16), ringA = new Float32Array(24), renders = 0;
    function render() {
      updateCamera();
      props.forEach(function (o) { poseProp(o, simTime); });
      fillInstances();
      gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
      if (shadowDirty) {
        shadowDirty = false;
        gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFB); gl.viewport(0, 0, SM, SM); gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(2, 4);
        depthBox.use(); boxUniforms(depthBox, sunVP); drawBoxes(depthBox, false);
        depthMesh.use(); gl.uniformMatrix4fv(depthMesh.u.uVP, false, sunVP); drawProps(depthMesh);
        gl.disable(gl.POLYGON_OFFSET_FILL);
      }
      var cw = canvas.width, ch = canvas.height;
      if (AA > 1) { msTarget(cw, ch); gl.bindFramebuffer(gl.FRAMEBUFFER, msFB); } else gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, cw, ch);
      gl.clearColor(bg[0], bg[1], bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      progBox.use(); boxUniforms(progBox, VP); lighting(progBox);
      var np = 0;
      for (var n = 0; n < pulses.length && np < 8; n++) {
        var pl = pulses[n], head = (simTime - pl.t0) * SPEED; if (head < 0) continue;
        pulseA.set([pl.a[0], pl.a[1], pl.b[0], pl.b[1]], np * 4); pulseT[np * 2] = head; pulseT[np * 2 + 1] = clamp((pl.len + 450 - head) / 260, 0, 1); np++;
      }
      gl.uniform1i(progBox.u.uPulseN, np); if (np) { gl.uniform4fv(progBox.u.uPulse, pulseA); gl.uniform2fv(progBox.u.uPulseT, pulseT); }
      var nr = Math.min(6, ringsNow.length);
      for (n = 0; n < nr; n++) { var rg = ringsNow[ringsNow.length - 1 - n], t = lots[rg.k], u = rg.t / 0.9; ringA.set([t.x + t.w / 2 - W / 2, t.y + t.h / 2 - H / 2, 30 + 150 * (1 - Math.pow(1 - u, 2)), Math.pow(1 - u, 2)], n * 4); }
      gl.uniform1i(progBox.u.uRingN, nr); if (nr) gl.uniform4fv(progBox.u.uRing, ringA);
      drawBoxes(progBox, true);
      progMesh.use(); gl.uniformMatrix4fv(progMesh.u.uVP, false, VP); lighting(progMesh); gl.uniform1f(progMesh.u.uSlab, SLAB); drawProps(progMesh);
      // pit lids last, blended, so a loss keeps its printed number at sheet level
      if (hasPits()) {
        progBox.use(); gl.uniform1i(progBox.u.uLid, 1); gl.uniform1i(progBox.u.uMode, 4);
        gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE); gl.depthMask(false);
        gl.bindVertexArray(lotVAO); gl.drawArraysInstanced(gl.TRIANGLES, 0, 30, NT); gl.bindVertexArray(null);
        gl.disable(gl.BLEND); gl.depthMask(true); gl.uniform1i(progBox.u.uLid, 0);
      }
      if (AA > 1) {
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msFB); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        gl.blitFramebuffer(0, 0, cw, ch, 0, 0, cw, ch, gl.COLOR_BUFFER_BIT, gl.NEAREST);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        if (!aaChecked) { aaChecked = true; if (gl.getError() !== gl.NO_ERROR) { AA = 0; render(); return; } }
      }
      renders++;
    }
    // On a slow device (software GL, an old laptop) drop the multisampling and draw fewer pixels; stills keep full quality.
    function measure() {
      var px = new Uint8Array(4);
      dirty = false; render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);   // the first frame compiles shaders: not timed
      if (STILL) return 0;
      var t0 = performance.now(); render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      var ms = performance.now() - t0;
      if (!STILL && !(qParam > 0)) {
        if (ms > 90) AA = 0;
        if (ms > 250) { goLite(); minGap = Math.min(1500, ms); S.quality = ms > 900 ? 0.5 : 0.65; MINQ = Math.min(MINQ, S.quality); S.resize(); dirty = true; }
      }
      return ms;
    }
    function hasPits() { for (var k = 0; k < NT; k++) if (hNow[k] < -0.5) return true; return false; }

    // ---- the loop, uploads and readiness
    var ready = false, lastT = -1, minGap = 0, lastRender = 0, frameTimes = [], MINQ = 0.5, qParam;
    qParam = parseFloat(HICR.param('q')); if (qParam > 0) { S.quality = clamp(qParam, 0.3, 1); MINQ = S.quality; S.resize(); }
    S.onPaint(function () {
      if (!S.upload(host, sheetTex, Math.round(W * TS), Math.round(H * TS))) return;
      dirty = true;
      if (!ready && !probing) {
        probing = true;
        S.probe(host, book.fx).then(function (mode) { ready = true; var ms = measure(); syncPlace(true); S.ready({ mode: mode, lots: NT, uniformGrid: uniform, firstFrameMs: Math.round(ms), aa: AA, quality: S.quality }); });
      }
    });
    var probing = false;
    intro();
    S.loop(function (t, dt) {
      if (!STILL) step(dt);
      if (!ready) return;
      if (tween || orbit || Math.abs(yawVel) > 0.003) syncPlace();
      else if (lock === null && hit.kind === 'roof') syncPlace();                // a building under the pointer may still be growing
      if (dirty) {
        // adaptive resolution: if frames are slow while things move, draw fewer pixels (never in stills)
        var now = performance.now();
        if (!STILL && lastT > 0) { frameTimes.push(Math.min(2000, now - lastT)); if (frameTimes.length > 8) frameTimes.shift(); }
        lastT = now;
        if (!STILL && frameTimes.length >= 6 && (S.quality > MINQ || AA > 1)) {
          var avg = frameTimes.reduce(function (a, b) { return a + b; }, 0) / frameTimes.length;
          if (avg > 70) { if (AA > 1) AA = 0; else { S.quality = Math.max(MINQ, S.quality * 0.75); S.resize(); } frameTimes = []; dirty = true; }
        }
        if (minGap && now - lastRender < minGap) return;       // a slow device: leave the GPU room between frames
        dirty = false; render(); lastRender = performance.now();
      } else lastT = -1;
    });

    // ---- what the page exposes (checks, stills, the page's own code)
    function lotByAddr(a) { var i = typeof a === 'number' ? a : book.parse(a); return lotOf[i]; }
    var api = {
      book: book, stage: S, config: cfg, get simTime() { return simTime; },
      heightOf: function (a) { var k = lotByAddr(a); return k === undefined ? 0 : hNow[k]; },
      goalOf: function (a) { var k = lotByAddr(a); return k === undefined ? 0 : hGoal[k]; },
      lots: function () { return lots.map(function (t, k) { return { i: t.i, addr: book.addr(t.i), value: book.value(t.i), h: hNow[k], goal: hGoal[k], dependents: book.dependents(t.i).length, precedents: book.precedents(t.i).length }; }); },
      state: function () {
        var moving = false; for (var k = 0; k < NT; k++) if (Math.abs(hGoal[k] - hNow[k]) > 0.05 || wait[k] > 0 || Math.abs(hVel[k]) > 0.05) moving = true;
        return { moving: moving, pulses: pulses.length, rings: ringsNow.length, spawned: Object.assign({}, stats), tween: !!tween, demo: script.length > 0 || demoTyping, acted: acted, quality: S.quality, renders: renders, sim: simTime, cam: Object.assign({}, cam), uniformGrid: uniform, sound: !!(snd && snd.on) };
      },
      // where a page element is drawn, in canvas px (on its roof when it is a building)
      screenOf: function (el, fx, fy) {
        var b = book.box(el), i = book.cellOf(el), k = lotOf[i], y = k === undefined ? 0 : Math.max(0, hNow[k]);
        updateCamera();
        return project([b.x + b.w * (fx == null ? 0.5 : fx) - W / 2, y, b.y + b.h * (fy == null ? 0.5 : fy) - H / 2]);
      },
      roofPoint: function (a) { var i = book.parse(a), k = lotOf[i]; if (k === undefined) return null; var t = lots[k]; updateCamera(); return project([t.x + t.w / 2 - W / 2, Math.max(0, hNow[k]), t.y + t.h / 2 - H / 2]); },
      pick: function (x, y) { updateCamera(); var h = pick(x, y); return { kind: h.kind, addr: h.k !== undefined ? book.addr(lots[h.k].i) : null }; },
      advance: function (s, quiet) { var n = Math.max(1, Math.round(s * 60)); for (var i = 0; i < n; i++) step(1 / 60); dirty = true; if (!quiet) { render(); dirty = false; syncPlace(true); } return simTime; },
      settle: function (max) { var n = 0; while (n++ < (max || 600) && (api.state().moving || pulses.length || tween)) step(1 / 60); dirty = true; render(); syncPlace(true); return n / 60; },
      camera: function (o) { if (o) { Object.assign(cam, o); touched = true; tween = null; dirty = true; render(); syncPlace(true); } return Object.assign({}, cam); },
      home: function () { return Object.assign({}, home); },
      stopDemo: function () { act(); },
      sound: snd,
      parts: parts
    };
    root.__hic.screenOf = api.screenOf;
    root.__city = api;
    return api;
  }

  root.SheetCity = { start: start, parts: parts, DEFAULTS: DEFAULTS };
})(typeof window !== 'undefined' ? window : globalThis);

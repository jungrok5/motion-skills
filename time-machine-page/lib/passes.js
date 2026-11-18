/* passes.js — the era treatments of time-machine-page, as composable shader passes.
 *
 * An era's look is a list of passes: [['paper', {tint: '#eadfc4'}], ['letterpress', {}], ['halftone', {pitch: 4}], ['desk', {}]].
 * time-machine.js sorts them by stage and compiles one fragment shader per era:
 *
 *   warp      vec2 pass_<name>(vec2 uv, Ctx x)   where on the page this screen point shows (CRT bulge, gate weave)
 *   page      vec3 pass_<name>(vec3 c, Ctx x)    the material: ink, dots, grain, phosphor, dither, hologram
 *   surround  vec3 pass_<name>(vec3 c, Ctx x)    what is around the page: a desk, a cinema, a monitor, a dark lab
 *   post      vec3 pass_<name>(vec3 c, Ctx x)    the whole frame: vignette, flicker, grade
 *
 * In a pass's GLSL, `$name` is the pass's parameter `name` (a uniform u_<pass>_<name>). Numbers become float, '#rrggbb'
 * becomes vec3, [a, b] / [a, b, c] become vec2 / vec3. Helpers inside a pass must be prefixed with the pass name.
 * A warp pass also gives `toPage(uv, p)` in JS, the same maths, so clicks land on what is drawn (time-machine.js inverts it).
 * `animated: true` marks a pass that changes with time (the engine then draws every frame).
 *
 * Ctx (built by the engine for every pixel):
 *   x.sp   screen position, device px, y down          x.suv  position in the page rectangle before warps (0..1 on the page)
 *   x.uv   page uv after warps (outside 0..1 = beyond the page: the margin of a sheet, a screen's black border)
 *   x.px   page CSS px (x.uv * uPageCss)                x.u    device px per page px (grows as the camera dives)
 *   x.t    seconds (fixed under #still / #calm)          x.src  the page's own colour at x.uv, before any page pass
 * Common GLSL: hash11 hash12 hash22 vnoise fbm sdBox sdRoundBox luma toneOf page(uv) pageLod(uv, lod) bayer4,
 * uniforms uRes uRect uPageCss uTime uSheet uSeed.
 *
 * toneOf(c) is the "picture" marker: pixels tinted like sepia (red above green above blue) are continuous tone and get
 * screened (halftone, woodcut hatching); neutral greys and blacks are type and rules and stay solid, and so does red type
 * (a rubric: green ≈ blue). Draw pictures that an
 * era should screen in warm tones (CSS variables per era), set type in neutral black.
 *
 * Add one in a project:  TimeMachine.pass('ditto', { stage: 'page', params: {...}, glsl: `vec3 pass_ditto(vec3 c, Ctx x) {...}` });
 * before TimeMachine.start(). See references/ENGINE.md.
 */
(function (root) {
  'use strict';
  var TM = root.TimeMachine = root.TimeMachine || { passes: {} };
  TM.passes = TM.passes || {};
  TM.pass = function (name, def) {
    if (!/^[a-z][a-z0-9]*$/.test(name)) throw new Error('pass name must be lower-case letters and digits: ' + name);
    if (['warp', 'page', 'surround', 'post'].indexOf(def.stage) < 0) throw new Error('pass ' + name + ': stage must be warp, page, surround or post');
    if (def.glsl.indexOf('pass_' + name + '(') < 0) throw new Error('pass ' + name + ': its GLSL must define pass_' + name + '(…)');
    def.name = name; def.params = def.params || {};
    TM.passes[name] = def;
    return def;
  };
  var P = TM.pass;

  // ======================================================================================== warps
  // CRT glass: the picture bulges toward the viewer; the corners fall off the tube. The edges' midpoints stay put.
  P('barrel', {
    stage: 'warp', params: { k: 0.09 },
    glsl: 'vec2 pass_barrel(vec2 uv, Ctx x) { vec2 d = uv - 0.5; float r2 = dot(d, d); return 0.5 + d * (1.0 + $k * r2) / (1.0 + $k * 0.25); }',
    toPage: function (u, v, p) { var dx = u - 0.5, dy = v - 0.5, r2 = dx * dx + dy * dy, f = (1 + p.k * r2) / (1 + p.k * 0.25); return [0.5 + dx * f, 0.5 + dy * f]; }
  });
  // Gate weave: film never sits still in the projector gate. Under a page px, so clicks still land (no toPage needed).
  P('weave', {
    stage: 'warp', animated: true, params: { amount: 0.8, fps: 24 },
    glsl: [
      'vec2 pass_weave(vec2 uv, Ctx x) {',
      '  float f = floor(x.t * $fps);',
      '  vec2 j = hash22(vec2(f, 4.2)) - 0.5;',
      '  vec2 s = vec2(sin(x.t * 1.3) + 0.5 * sin(x.t * 3.7), sin(x.t * 1.9 + 1.0) + 0.4 * sin(x.t * 5.3));',
      '  return uv + (j * vec2(0.5, 1.0) + s * 0.25) * $amount / uPageCss;',
      '}'].join('\n')
  });

  // ======================================================================================== page materials
  // Paper: the white of the page becomes stock with cloud, fibres (they resolve as you dive), age toward the sheet's edge,
  // a few specks and an optional fold. Ink stays ink (multiplied).
  P('paper', {
    stage: 'page', params: { tint: '#ece3cc', fibre: 0.6, age: 0.5, specks: 0.3, fold: -1.0 },
    glsl: [
      'vec3 pass_paper(vec3 c, Ctx x) {',
      '  vec2 q = x.px;',
      '  float cloud = vnoise(q * 0.045 + uSeed) * 0.55 + vnoise(q * 0.011 + 3.0) * 0.45;',
      '  float kF = smoothstep(1.4, 5.0, x.u);',
      '  float fib = 0.0;',
      '  if (kF > 0.0) {',
      '    vec2 r = vec2(q.x * 0.8 + q.y * 0.6, q.y * 0.8 - q.x * 0.6);',
      '    fib = (vnoise(vec2(r.x * 2.2, r.y * 0.35)) - 0.5) + (vnoise(vec2(r.y * 2.6, r.x * 0.3) + 9.0) - 0.5) * 0.8;',
      '    fib += (vnoise(q * 6.0 + 2.0) - 0.5) * 0.5 * smoothstep(5.0, 14.0, x.u);',
      '  }',
      '  vec3 p = $tint * (0.95 + 0.07 * cloud + $fibre * 0.09 * fib * kF);',
      '  vec2 e = min(x.px + uSheet, uPageCss + uSheet - x.px);',
      '  float de = max(min(e.x, e.y), 0.0);',
      '  float a = $age * (exp(-de / 34.0) * 0.8 + smoothstep(0.35, 0.9, vnoise(q * 0.007 + 5.0)) * 0.45);',
      '  p *= mix(vec3(1.0), vec3(0.86, 0.76, 0.58), clamp(a, 0.0, 1.0));',
      '  vec2 sg = q / 9.0, si = floor(sg); vec2 sh = hash22(si + 17.0);',
      '  float sr = sh.x > 1.0 - 0.03 * $specks ? 0.08 + 0.12 * sh.y : 0.0;',
      '  float speck = 1.0 - smoothstep(sr * 0.5, sr, length(fract(sg) - 0.5 - (sh - 0.5) * 0.5));',
      '  p = mix(p, vec3(0.25, 0.17, 0.1), speck * 0.7);',
      '  if ($fold >= 0.0) { float d = x.px.y - $fold * uPageCss.y; p *= 1.0 + 0.07 * exp(-d * d / 4.0) - 0.09 * exp(-(d - 3.0) * (d - 3.0) / 14.0); }',
      '  return c * p;',
      '}'].join('\n')
  });
  // Letterpress: type is metal pressed into paper. Neutral darks become ink with a ragged, squeezed edge (sharp when you
  // dive) and uneven inking. Coloured type (a red rubric) keeps its colour; warm "picture" pixels are left to a screen pass.
  P('letterpress', {
    stage: 'page', params: { ink: '#16130f', rough: 0.6, gain: 0.08, uneven: 0.12 },
    glsl: [
      'vec3 pass_letterpress(vec3 c, Ctx x) {',
      '  float tone = toneOf(x.src);',
      '  float chroma = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));',
      '  float inkAmt = 1.0 - max(c.r, max(c.g, c.b));',
      '  float k = smoothstep(0.9, 3.0, x.u);',
      '  float n = (vnoise(x.px * 1.4) - 0.5) * 0.6 + (vnoise(x.px * 4.1 + 5.0) - 0.5) * 0.4;',
      '  float e = inkAmt + $gain + n * $rough * 0.32;',
      '  float w = fwidth(e) * 0.8 + 0.01;',
      '  float cov = mix(clamp(inkAmt + $gain * 0.5, 0.0, 1.0), smoothstep(0.5 - w, 0.5 + w, e), k);',
      '  float rim = smoothstep(0.5, 0.75, e) * (1.0 - smoothstep(0.75, 1.1, e)) * k;',
      '  float even = 1.0 - $uneven * smoothstep(0.3, 0.8, vnoise(x.px * 0.012 + 7.0));',
      '  vec3 ink = $ink * (1.0 + 1.5 * (1.0 - rim) * smoothstep(4.0, 12.0, x.u));',
      '  vec3 inked = mix(vec3(1.0), ink, clamp(cov * even, 0.0, 1.0));',
      '  return mix(inked, c, max(tone, smoothstep(0.12, 0.3, chroma)));',
      '}'].join('\n')
  });
  // Halftone: the picture as a screen of round dots (light) that merge into holes (dark), at an angle. Dots are drawn in
  // page px, so as the camera dives they grow into discs you can count.
  P('halftone', {
    stage: 'page', params: { pitch: 4.2, angle: 45, ink: '#16130f', gain: 0.05 },
    glsl: [
      'vec3 pass_halftone(vec3 c, Ctx x) {',
      '  float tone = toneOf(x.src);',
      '  if (tone <= 0.0) return c;',
      '  float a = radians($angle); mat2 R = mat2(cos(a), sin(a), -sin(a), cos(a));',
      '  vec2 g = R * x.px / $pitch;',
      '  float D = clamp(1.0 - luma(x.src) + $gain + (vnoise(x.px * 1.7) - 0.5) * 0.05, 0.0, 1.0);',
      '  float f = 0.5 - 0.25 * (cos(6.2831853 * g.x) + cos(6.2831853 * g.y));',
      '  float w = fwidth(f) * 0.75 + 1e-4;',
      '  float dots = 1.0 - smoothstep(D - w, D + w, f);',
      '  float cov = mix(D, dots, smoothstep(1.3, 2.8, $pitch * x.u));',
      '  return mix(c, mix(vec3(1.0), $ink, cov), tone);',
      '}'].join('\n')
  });
  // Woodcut: type cut in relief, gouged and blotchy; the picture becomes parallel cut lines whose width follows the dark,
  // bending with the wood, with a cross-cut in the deepest shadows.
  P('woodcut', {
    stage: 'page', params: { pitch: 3.4, angle: 28, ink: '#1b130c', rough: 1.0 },
    glsl: [
      'float woodcut_lines(vec2 px, float ang, float pitch, float D) {',
      '  vec2 d = vec2(cos(ang), sin(ang));',
      '  float s = dot(px, vec2(-d.y, d.x)) + 2.2 * sin(dot(px, d) * 0.045) + (vnoise(px * 0.035) - 0.5) * 4.0;',
      '  float v = abs(fract(s / pitch) - 0.5) * 2.0;',
      '  float w = fwidth(v) * 0.8 + 1e-4;',
      '  return 1.0 - smoothstep(D - w, D + w, v);',
      '}',
      'vec3 pass_woodcut(vec3 c, Ctx x) {',
      '  float tone = toneOf(x.src);',
      '  float D = clamp(1.0 - luma(x.src), 0.0, 1.0);',
      '  float k = smoothstep(1.1, 2.6, $pitch * x.u);',
      '  float a = radians($angle);',
      '  float lines = woodcut_lines(x.px, a, $pitch, D * 0.95);',
      '  lines = max(lines, woodcut_lines(x.px, a + 1.2, $pitch * 1.1, (D - 0.62) * 2.2));',
      '  float pic = mix(D, lines, k);',
      '  float inkAmt = 1.0 - max(c.r, max(c.g, c.b));',
      '  float n = (vnoise(x.px * 0.9) - 0.5) * 0.7 + (vnoise(x.px * 3.3 + 4.0) - 0.5) * 0.5;',
      '  float e = inkAmt + 0.1 + n * $rough * 0.35;',
      '  float w = fwidth(e) * 0.8 + 0.01;',
      '  float kk = smoothstep(0.8, 2.5, x.u);',
      '  float type = mix(inkAmt, smoothstep(0.5 - w, 0.5 + w, e), kk);',
      '  float grain = smoothstep(0.62, 0.8, vnoise(vec2(x.px.x * 0.06, x.px.y * 1.3) + 11.0)) * 0.55;',
      '  type *= 1.0 - grain * kk * smoothstep(0.6, 1.0, inkAmt);',
      '  float cov = mix(type, pic, tone);',
      '  float chroma = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));',
      '  vec3 res = mix(vec3(1.0), $ink, clamp(cov, 0.0, 1.0));',
      '  return mix(res, c * mix(vec3(1.0), $ink * 3.0, cov), smoothstep(0.25, 0.4, chroma) * (1.0 - tone));',
      '}'].join('\n')
  });
  // Monochrome: the whole page mapped through one dark → light ramp (film stock, a phosphor, a spirit duplicator).
  P('mono', {
    stage: 'page', params: { dark: '#060606', light: '#f1ede2', contrast: 1.1, gamma: 1.0 },
    glsl: [
      'vec3 pass_mono(vec3 c, Ctx x) {',
      '  float L = clamp((luma(c) - 0.5) * $contrast + 0.5, 0.0, 1.0);',
      '  return mix($dark, $light, pow(L, $gamma));',
      '}'].join('\n')
  });
  // Film grain: clumps of silver, new every frame, strongest in the mid tones. Grain is in page px: diving turns it into
  // soft blobs, as a print under a loupe does.
  P('grain', {
    stage: 'page', animated: true, params: { amount: 0.11, size: 1.1, fps: 24 },
    glsl: [
      'vec3 pass_grain(vec3 c, Ctx x) {',
      '  float f = floor(x.t * $fps);',
      '  vec2 o = hash22(vec2(f, 1.7)) * 300.0;',
      '  vec2 q = x.px / $size + o;',
      '  float n = (vnoise(q) - 0.5) + (vnoise(q * 2.13 + 7.0) - 0.5) * 0.6 + (vnoise(q * 0.47 + 3.0) - 0.5) * 0.5;',
      '  float L = luma(c);',
      '  return c + n * $amount * (3.2 * L * (1.0 - L) + 0.2);',
      '}'].join('\n')
  });
  // Dust and scratches: a few specks per frame and now and then a bright scratch that wanders down the reel.
  P('dust', {
    stage: 'page', animated: true, params: { amount: 1.0, fps: 24 },
    glsl: [
      'vec3 pass_dust(vec3 c, Ctx x) {',
      '  float f = floor(x.t * $fps);',
      '  vec2 cell = vec2(96.0, 88.0), id = floor(x.px / cell);',
      '  vec2 h = hash22(id + f * vec2(13.1, 7.7));',
      '  float m = 0.0;',
      '  if (h.x < 0.035 * $amount) {',
      '    vec2 q = x.px - (id + 0.2 + 0.6 * hash22(id + f + 3.0)) * cell;',
      '    float r = 0.7 + 2.2 * h.y;',
      '    m = 1.0 - smoothstep(r * 0.55, r, length(q * vec2(1.0, 0.6 + h.y)));',
      '  }',
      '  float sl = floor(x.t * 0.6);',
      '  float sx = (0.12 + 0.76 * hash11(sl * 3.1 + 0.4)) * uPageCss.x + 5.0 * sin(x.t * 1.1 + sl);',
      '  float on = step(0.4, hash11(sl * 7.7 + 0.2)) * step(0.25, hash11(f * 0.37 + 1.0)) * $amount;',
      '  float sw = 1.1 / max(x.u, 0.5);',
      '  float s = on * (1.0 - smoothstep(0.0, sw, abs(x.px.x - sx))) * smoothstep(0.35, 0.6, vnoise(vec2(x.px.y * 0.02, f * 0.3)));',
      '  c = mix(c, vec3(0.02), m * 0.85);',
      '  return mix(c, vec3(0.96), clamp(s, 0.0, 1.0) * 0.55);',
      '}'].join('\n')
  });
  // Scanlines: the beam draws lines; bright lines swell and nearly close the gaps, dark ones leave them open.
  P('scanlines', {
    stage: 'page', params: { pitch: 2.4, depth: 0.5 },
    glsl: [
      'vec3 pass_scanlines(vec3 c, Ctx x) {',
      '  float k = smoothstep(1.3, 3.2, $pitch * x.u);',
      '  float s = 0.5 + 0.5 * cos(6.2831853 * x.px.y / $pitch);',
      '  float prof = mix(s, sqrt(s), clamp(luma(c) * 1.4, 0.0, 1.0));',
      '  return c * mix(1.0 - 0.45 * $depth, 1.0 - $depth * (1.0 - prof), k);',
      '}'].join('\n')
  });
  // Shadow mask: red, green and blue phosphor stripes, visible only once you dive.
  P('mask', {
    stage: 'page', params: { pitch: 2.6, depth: 0.55 },
    glsl: [
      'vec3 pass_mask(vec3 c, Ctx x) {',
      '  float k = smoothstep(2.5, 6.0, $pitch * x.u) * $depth;',
      '  float ph = x.px.x / $pitch * 6.2831853;',
      '  vec3 m = 0.5 + 0.5 * cos(ph - vec3(0.0, 2.094, 4.189));',
      '  m = m * m * 1.9 + 0.12;',
      '  return c * mix(vec3(1.0), m, k);',
      '}'].join('\n')
  });
  // Bloom / phosphor glow: light spills from bright marks (a blurred copy of the page from its mipmaps).
  // colour 0 = glow in `tint` by brightness (a monochrome tube), 1 = glow in the page's own colours.
  P('bloom', {
    stage: 'page', params: { amount: 0.6, lod: 3.0, tint: '#ffffff', colour: 0.0 },
    glsl: [
      'vec3 pass_bloom(vec3 c, Ctx x) {',
      '  vec3 g = pageLod(x.uv, $lod) * 0.55 + pageLod(x.uv, $lod + 1.6) * 0.45;',
      '  vec3 add = mix($tint * luma(g), g, $colour);',
      '  return c + add * add * $amount;',
      '}'].join('\n')
  });
  // Ordered dither: every channel quantised to a few levels through a 4×4 Bayer matrix (6 levels = the 216 web colours).
  P('dither', {
    stage: 'page', params: { levels: 6.0, cell: 1.0 },
    glsl: [
      'vec3 pass_dither(vec3 c, Ctx x) {',
      '  float b = bayer4(floor(x.px / $cell)) - 0.5;',
      '  float L = $levels - 1.0;',
      '  return floor(clamp(c, 0.0, 1.0) * L + 0.5 + b) / L;',
      '}'].join('\n')
  });
  // Chroma: colour channels misregistered and smeared sideways (tape, cheap composite video).
  P('chroma', {
    stage: 'page', params: { shift: 1.4, bleed: 0.45 },
    glsl: [
      'vec3 pass_chroma(vec3 c, Ctx x) {',
      '  float s = $shift / uPageCss.x;',
      '  vec3 c2 = vec3(page(x.uv + vec2(s, 0.0)).r, c.g, page(x.uv - vec2(s, 0.0)).b);',
      '  vec3 bl = pageLod(x.uv + vec2(s * 2.0, 0.0), 1.6);',
      '  return mix(c2, luma(c2) + (bl - luma(bl)), $bleed);',
      '}'].join('\n')
  });
  // Hologram: the page as light, not ink. Colour fringes, interference bands that crawl, a bright sweep, flicker and
  // the odd torn line. Output is light to be added to a dark room (use the `lab` surround).
  P('holo', {
    stage: 'page', animated: true, params: { tint: '#62f0ff', bands: 3.0, fringe: 1.6, glitch: 0.5, flicker: 0.08 },
    glsl: [
      'vec3 pass_holo(vec3 c, Ctx x) {',
      '  float f = floor(x.t * 12.0);',
      '  float by = hash11(f * 1.9) * uPageCss.y, bh = 3.0 + 16.0 * hash11(f * 3.1);',
      '  float gl = step(1.0 - 0.3 * $glitch, hash11(f * 0.71)) * step(abs(x.px.y - by), bh);',
      '  vec2 uv = x.uv + vec2(gl * (hash11(f * 5.3) - 0.5) * 18.0 / uPageCss.x, 0.0);',
      '  float fs = $fringe / uPageCss.x;',
      '  vec3 s = vec3(luma(page(uv + vec2(fs, 0.0))), luma(page(uv)), luma(page(uv - vec2(fs, 0.0))));',
      '  vec3 light = $tint * s.g + vec3(s.r - s.g, 0.0, s.b - s.g) * 0.9;',
      '  light += vec3(0.8, 1.0, 1.0) * smoothstep(0.75, 1.0, s.g) * 0.35;',
      '  float k = smoothstep(1.0, 2.6, $bands * x.u);',
      '  float band = mix(0.86, 0.72 + 0.28 * (0.5 + 0.5 * sin(6.2831853 * x.px.y / $bands - x.t * 7.0)), k);',
      '  float sweep = exp(-pow((fract(x.px.y / uPageCss.y * 0.5 - x.t * 0.12) - 0.5) * 9.0, 2.0)) * 0.35;',
      '  float fl = 1.0 - $flicker * hash11(floor(x.t * 30.0) * 0.37);',
      '  return light * (band + sweep) * fl;',
      '}'].join('\n')
  });

  // ======================================================================================== surrounds
  // A desk under a lamp: the page is a sheet (grown by the era's `sheet` margin) with a soft, slightly ragged edge and a
  // shadow, lying on wood. Everything is in page px, so the desk dives with the page.
  P('desk', {
    stage: 'surround', params: { wood: '#4a2d18', light: '#ffe6bd', lamp: [-0.35, -0.55], shadow: 0.55, pool: 1.0 },
    glsl: [
      'vec3 pass_desk(vec3 c, Ctx x) {',
      '  vec2 hs = 0.5 * uPageCss + uSheet;',
      '  vec2 q = x.px - 0.5 * uPageCss;',
      '  float along = abs(q.x) > abs(q.y) * uPageCss.x / uPageCss.y ? q.y * 1.3 + sign(q.x) * 900.0 : q.x;',
      '  float wob = (vnoise(vec2(along * 0.04, 3.0)) - 0.5) * 1.8 + (vnoise(vec2(along * 0.35, 7.0)) - 0.5) * 0.7 * smoothstep(1.0, 4.0, x.u);',
      '  float d = sdBox(q, hs) + wob;',
      '  float aa = 0.75 / x.u;',
      '  float on = 1.0 - smoothstep(-aa, aa, d);',
      '  vec2 w = q / uPageCss.y;',
      '  float ring = fbm(vec2(w.x * 1.6, w.y * 26.0 + 2.0 * vnoise(w * 3.0)));',
      '  vec3 wood = $wood * (0.62 + 0.62 * ring) * (0.9 + 0.2 * vnoise(vec2(w.x * 2.0, w.y * 90.0)));',
      '  float ds = sdBox(q - vec2(7.0, 11.0), hs);',
      '  wood *= 1.0 - $shadow * (1.0 - smoothstep(-10.0, 22.0, ds));',
      '  wood *= 1.0 - 0.5 * (1.0 - smoothstep(0.0, 2.5, d));',
      '  vec2 l = w - $lamp;',
      '  float pool = mix(1.0, 1.35 / (1.0 + 1.5 * dot(l, l)), $pool);',
      '  vec3 col = mix(wood, c, on) * $light * pool;',
      '  col *= 1.0 + (1.0 - smoothstep(0.0, aa * 3.0, abs(d))) * (q.y < 0.0 ? 0.04 : -0.15) * on;',
      '  return col;',
      '}'].join('\n')
  });
  // A cinema: the page is the screen; black masking round it, the room dark but lit by what is on the screen, folded
  // curtains at the sides and a row of heads below, against the light.
  P('cinema', {
    stage: 'surround', params: { room: '#070606', curtain: '#6a1418', spill: 0.8, heads: 1.0, mask: 6.0 },
    glsl: [
      'vec3 pass_cinema(vec3 c, Ctx x) {',
      '  vec2 q = (x.suv - 0.5) * uPageCss; vec2 hs = 0.5 * uPageCss;',
      '  float d = sdBox(q, hs);',
      '  float aa = 0.75 / x.u;',
      '  float on = 1.0 - smoothstep(-aa, aa, d);',
      '  vec3 avg = pageLod(vec2(0.5), 14.0);',
      '  float lit = $spill * (0.25 + 1.2 * luma(avg));',
      '  vec2 w = q / uPageCss.y;',
      '  float glow = exp(-max(d, 0.0) / (uPageCss.y * 0.4));',
      '  vec3 col = $room + vec3(0.05, 0.045, 0.04) * glow * lit;',
      '  float side = abs(w.x) - hs.x / uPageCss.y - 0.05;',
      '  if (side > 0.0) {',
      '    float fx = w.x * 34.0 + 1.6 * vnoise(vec2(w.x * 5.0, 1.0)) + 0.6 * w.y;',
      '    float fold = pow(0.5 + 0.5 * sin(fx), 1.6);',
      '    vec3 cur = $curtain * (0.2 + 0.9 * fold) * (0.25 + 0.75 * exp(-side * 2.5)) * (0.15 + lit);',
      '    col = mix(col, cur, smoothstep(0.0, 0.012, side));',
      '  }',
      '  float top = -w.y - hs.y / uPageCss.y - 0.035;',
      '  if (top > 0.0) {',
      '    float sw = fract(w.x / 0.42) - 0.5; float hem = 0.03 - 0.12 * sw * sw;',
      '    float pel = 1.0 - smoothstep(hem - 0.004, hem + 0.004, top);',
      '    float fo = pow(0.5 + 0.5 * sin(w.x * 60.0 + sw * top * 40.0), 1.4);',
      '    col = mix(col, $curtain * (0.15 + 0.7 * fo) * (0.2 + 0.8 * lit) * 1.1, 1.0 - pel);',
      '  }',
      '  float yb = w.y - hs.y / uPageCss.y - 0.05;',
      '  if ($heads > 0.0 && yb > -0.01) {',
      '    float sx = w.x / 0.13; float id = floor(sx); float lx = (fract(sx) - 0.5) * 0.13;',
      '    vec2 hh = hash22(vec2(id, 3.0));',
      '    float hy = 0.07 + 0.03 * hh.x;',
      '    float head = length(vec2(lx - (hh.y - 0.5) * 0.03, (yb - hy) * 0.9)) - 0.034 - 0.008 * hh.y;',
      '    float body = sdRoundBox(vec2(lx, yb - hy - 0.11), vec2(0.055, 0.09), 0.04);',
      '    float sil = min(head, body);',
      '    float m = step(0.25, hh.x + 0.4) * (1.0 - smoothstep(-0.002, 0.002, sil));',
      '    float rim = (1.0 - smoothstep(0.0, 0.006, abs(sil))) * step(yb, hy + 0.01) * lit * 0.08;',
      '    col = mix(col, vec3(0.004), m) + rim * vec3(1.0, 0.95, 0.85);',
      '  }',
      '  float mk = 1.0 - smoothstep(-aa, aa, d - $mask);',
      '  col = mix(col, vec3(0.006), mk);',
      '  return mix(col, c, on);',
      '}'].join('\n')
  });
  // A monitor: plastic bezel round a rounded tube. The tube's glass is dark beyond the picture, with a soft reflection.
  P('monitor', {
    stage: 'surround', params: { plastic: '#cfc6b2', room: '#1c1a17', glass: '#0a0d0b', bezel: 46.0, radius: 30.0, sheen: 0.05 },
    glsl: [
      'vec3 pass_monitor(vec3 c, Ctx x) {',
      '  vec2 q = (x.suv - 0.5) * uPageCss; vec2 hs = 0.5 * uPageCss;',
      '  float aa = 0.75 / x.u;',
      '  float dG = sdRoundBox(q, hs + 9.0, $radius * 0.7);',
      '  float dB = sdRoundBox(q, hs + $bezel, $radius);',
      '  vec2 w = q / uPageCss.y;',
      '  vec3 col = $room * (0.85 + 0.3 * vnoise(w * 6.0)) * (1.0 - 0.35 * dot(w, w));',
      '  col *= 1.0 - 0.6 * (1.0 - smoothstep(0.0, 40.0, dB)) * step(0.0, dB);',
      '  float depth = -dB;',
      '  float shade = 0.82 + 0.28 * smoothstep(hs.y + $bezel, -hs.y - $bezel, q.y);',
      '  float bevel = 1.0 + 0.18 * (1.0 - smoothstep(0.0, 6.0, depth)) * (q.y < 0.0 ? 1.0 : -1.4);',
      '  float lip = 1.0 - 0.45 * (1.0 - smoothstep(0.0, 10.0, dG)) * step(0.0, dG);',
      '  vec3 pl = $plastic * shade * bevel * lip * (0.96 + 0.06 * vnoise(q * 0.6));',
      '  col = mix(col, pl, 1.0 - smoothstep(-aa, aa, dB));',
      '  vec2 iq = (x.uv - 0.5) * uPageCss;',
      '  float img = 1.0 - smoothstep(-aa, aa, sdBox(iq, hs));',
      '  vec3 glass = $glass + c * img;',
      '  glass += $sheen * smoothstep(0.55, 0.0, length((x.suv - vec2(0.22, 0.12)) * vec2(1.0, 1.7)));',
      '  glass *= 1.0 - 0.55 * (1.0 - smoothstep(-34.0, 0.0, dG));',
      '  return mix(col, glass, 1.0 - smoothstep(-aa, aa, dG));',
      '}'].join('\n')
  });
  // A dark lab with an emitter ring under the page: the page (light from `holo`) is added to the room.
  P('lab', {
    stage: 'surround', animated: true, params: { room: '#04070b', emitter: '#3fd8ff', gain: 1.0 },
    glsl: [
      'vec3 pass_lab(vec3 c, Ctx x) {',
      '  vec2 q = (x.suv - 0.5) * uPageCss; vec2 hs = 0.5 * uPageCss;',
      '  vec2 w = q / uPageCss.y;',
      '  vec3 col = $room * (1.15 - 0.4 * length(w));',
      '  float by = hs.y / uPageCss.y + 0.07;',
      '  vec2 e = vec2(w.x / (hs.x / uPageCss.y * 0.8), (w.y - by) / 0.045);',
      '  float r = length(e);',
      '  col += $emitter * (exp(-pow((r - 1.0) * 5.0, 2.0)) * 0.9 + exp(-r * r * 0.7) * 0.18);',
      '  float up = smoothstep(by, -hs.y / uPageCss.y, w.y) * step(w.y, by);',
      '  float haze = exp(-pow(w.x / (hs.x / uPageCss.y * 0.9), 6.0)) * up * 0.07;',
      '  col += $emitter * haze * (0.75 + 0.25 * vnoise(vec2(w.x * 30.0, x.t * 0.7)));',
      '  float aa = 0.75 / x.u;',
      '  float img = 1.0 - smoothstep(-aa, aa, sdBox((x.uv - 0.5) * uPageCss, hs));',
      '  return col + c * img * $gain;',
      '}'].join('\n')
  });

  // ======================================================================================== post (whole frame)
  P('vignette', {
    stage: 'post', params: { amount: 0.45 },
    glsl: 'vec3 pass_vignette(vec3 c, Ctx x) { vec2 v = x.sp / uRes - 0.5; return c * (1.0 - $amount * dot(v, v) * 2.0); }'
  });
  P('flicker', {
    stage: 'post', animated: true, params: { amount: 0.07, fps: 24 },
    glsl: 'vec3 pass_flicker(vec3 c, Ctx x) { float f = floor(x.t * $fps); return c * (1.0 + $amount * (hash11(f * 1.37 + 2.0) - 0.5) + 0.02 * sin(x.t * 2.3)); }'
  });
  P('grade', {
    stage: 'post', params: { contrast: 1.0, saturation: 1.0, lift: '#000000', gain: '#ffffff' },
    glsl: [
      'vec3 pass_grade(vec3 c, Ctx x) {',
      '  c = (c - 0.5) * $contrast + 0.5;',
      '  c = mix(vec3(luma(c)), c, $saturation);',
      '  return $lift + c * ($gain - $lift);',
      '}'].join('\n')
  });
})(typeof window !== 'undefined' ? window : globalThis);

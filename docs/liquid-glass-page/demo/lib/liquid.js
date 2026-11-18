/* liquid.js — liquid lying on a live web page, drawn with HTML-in-Canvas (liquid-glass-page skill).
 *
 * The page is ordinary DOM inside <canvas layoutsubtree content="drawable">. hic.js uploads its pixels to a WebGL texture
 * whenever they change; this file draws that texture seen through a layer of liquid:
 *
 *   1 ripples   a damped wave equation on a small float texture (height, velocity), stepped at a fixed rate;
 *               pointer moves, clicks, rain hits and typing push impulses into it.
 *   2 beads     every bead (and the big drop) is a soft kernel added into one float texture: the metaball field (r),
 *               field × radius (g, so the local bead radius is g / r) and the field gradient (b, a). Beads that touch
 *               flow together because their kernels add up; a moving bead is drawn out into a teardrop.
 *   3 glass     one full-screen pass: the field becomes a surface (a spherical cap per bead), the surface refracts the
 *               page texture with Snell's law at several wavelengths (dispersion), the liquid absorbs (Beer–Lambert
 *               tint), scatters (cloudy liquids) or mirrors (metals), casts a contact shadow and focuses a caustic,
 *               and reflects a small room (a window toward the light, a sky) weighted by Fresnel.
 *   The big drop is also an exact magnifying lens: toPage() maps a screen point to the page point drawn there, and the
 *   page is placed for hit testing with it, so clicks through the lens reach what the lens shows.
 *
 * The beads themselves are simulated here in JS: they sit until they are heavy enough to slide (stick-slip), slide at
 * a speed set by the liquid's viscosity, leave trails, merge (volume kept), evaporate, pool at the bottom edge, and are
 * swallowed by the big drop. Rain, drips and wind come from the weather. Everything random uses HIC.rng(seed).
 *
 *   const L = Liquid.start({ canvas: '#stage', page: '#page', liquid: 'water', weather: { rain: .1 }, lens: { anchor: '#lensHome' } });
 *   L.set({ ior: 1.52 })   L.splash(x, y)   L.wipe()   L.liquid('honey')   L.run(60)
 *
 * Config: see DEFAULTS and LIQUIDS below, and references/ENGINE.md. No dependencies besides hic.js, no network.
 */
(function (root) {
  'use strict';
  var HIC = root.HIC;

  // ------------------------------------------------------------------ liquids (examples of the style, not a menu)
  // Optical: ior, dispersion (0..1), tint (colour the liquid lets through), density (how fast it absorbs per px of
  // depth), scatter / scatterColor (cloudiness), metal / metalColor (0 = clear, 1 = a mirror like mercury), sheen
  // (thin-film rainbow at the rims, oil / soap), cap (bead height ÷ radius), capExp (0.5 = round cap, higher = flatter
  // top, steeper rim), lens (how strongly a bead acts as a ball lens: high values show a small upside-down copy),
  // body (colour even a thin film shows, 0..1), film (how visible ripples are), shadow, caustic, rim (dark edge).
  // Motion: slide (sliding speed, 1 = water), stick (radius in px above which a bead slides), trail (how much a sliding
  // bead leaves behind), ribbon (trail beads stay joined, like honey), merge (reach of merging), evaporate (px/s that
  // small beads lose), bead [min, max] (radius of new beads), lobes (how irregular big beads are), ripple { speed,
  // damp, decay } (wave speed, velocity damping, height decay per step), wobble (how much the big drop jiggles).
  var LIQUIDS = {
    water: {
      ior: 1.33, dispersion: .35, tint: [.95, .985, 1.0], density: .15, scatter: 0, scatterColor: [1, 1, 1],
      metal: 0, metalColor: [1, 1, 1], sheen: 0, cap: .62, capExp: .55, lens: 1.7, film: 1, shadow: .42, caustic: .55, rim: .2,
      slide: 1, stick: 9, trail: 1, ribbon: 0, merge: .85, evaporate: .06, bead: [2.8, 6.2], lobes: .6,
      ripple: { speed: 1.55, damp: .993, decay: .9994 }, wobble: 1
    },
    honey: {
      ior: 1.49, dispersion: .1, tint: [1.0, .62, .14], density: 2.4, body: .4, scatter: .06, scatterColor: [1.0, .78, .36],
      metal: 0, metalColor: [1, 1, 1], sheen: 0, cap: .42, capExp: .75, lens: 1.1, film: .55, shadow: .5, caustic: 1.0, rim: .14,
      slide: .085, stick: 6.5, trail: 2.4, ribbon: 1, merge: 1.0, evaporate: 0, bead: [3.6, 8.5], lobes: .35,
      ripple: { speed: .7, damp: .955, decay: .996 }, wobble: .35
    },
    oil: {
      ior: 1.47, dispersion: .22, tint: [1.0, .95, .62], density: .55, body: .15, scatter: 0, scatterColor: [1, 1, 1],
      metal: 0, metalColor: [1, 1, 1], sheen: .55, cap: .3, capExp: .8, lens: 1.0, film: .8, shadow: .3, caustic: .45, rim: .12,
      slide: .4, stick: 6, trail: 1.6, ribbon: .5, merge: 1.0, evaporate: .005, bead: [3.4, 8], lobes: .7,
      ripple: { speed: 1.1, damp: .975, decay: .998 }, wobble: .6
    },
    mercury: {
      ior: 1.6, dispersion: 0, tint: [1, 1, 1], density: 0, scatter: 0, scatterColor: [1, 1, 1],
      metal: 1, metalColor: [.80, .82, .85], sheen: 0, cap: .82, capExp: .5, lens: 1, film: .5, shadow: .55, caustic: 0, rim: .1,
      slide: 1.8, stick: 4.5, trail: 0, ribbon: 0, merge: 1.15, evaporate: 0, bead: [2.4, 6.5], lobes: .15,
      ripple: { speed: 1.4, damp: .985, decay: .999 }, wobble: 1.4
    },
    resin: {
      ior: 1.54, dispersion: .45, tint: [1.0, .99, .96], density: .2, scatter: 0, scatterColor: [1, 1, 1],
      metal: 0, metalColor: [1, 1, 1], sheen: 0, cap: .55, capExp: .6, lens: 1.8, film: .15, shadow: .4, caustic: .7, rim: .22,
      slide: 0, stick: 999, trail: 0, ribbon: 0, merge: .6, evaporate: 0, bead: [3, 7], lobes: .5,
      ripple: { speed: 1.2, damp: .9, decay: .99 }, wobble: .2
    }
  };

  var DEFAULTS = {
    canvas: '#stage', page: '#page',
    liquid: 'water',
    seed: 7,
    // weather: rain (0..1), wind (-1..1, leans rain and sliding beads), drip ({ at: [x fractions], every: s, size: px }
    // drops that run down from the top edge), intro ('sheet' a sheet of liquid runs down and leaves the beads,
    // 'fall' the beads land one by one, 'none')
    weather: { rain: .1, wind: 0, drip: null, intro: 'sheet' },
    // light: dir (2D, from a point toward the lamp, screen axes x right / y down), window (the bright shape the beads
    // reflect: dist from the zenith, half sizes, panes per side, glow, colour), sky (colour above), bounce (cool fill
    // light from the far side), paper ([r,g,b] or null = read the page's background)
    light: {
      dir: [-.56, -.83], window: { dist: .42, w: .1, h: .14, panes: 2, glow: 26, color: [1, .99, .96] },
      sky: [.95, .96, .98], skyDark: [.55, .68, 1.0], bounce: [.85, .92, 1.0]
    },
    // lens: the big drop. radius (× the short side of the screen; clamped to [min, max] px), magnify (lens strength;
    // the pull is magnify × (1 − 1/ior), so air is flat and diamond pulls hardest), anchor (a selector it sits on at
    // load), on
    lens: { on: true, radius: .14, min: 52, max: 136, magnify: 1.9, anchor: null },
    // beads seeded at load: density (1 = like a page after a shower), clusters, sizes per 1.3 megapixels
    beads: { density: 1, clusters: 11, big: 5, mid: 15, small: 120 },
    keepDry: '',     // selector list: big beads are not seeded on these (headlines, small print you want readable)
    noTrail: '',     // extra selectors where the wet fingertip leaves no beads (controls never get a trail)
    typeWet: 'input[type=text], input:not([type]), textarea, [contenteditable]', // typing here wets the letters
    dryUnder: null,  // a function (x, y) → true where rain may not land (rarely needed)
    spectral: 5,     // wavelengths sampled per pixel where there is liquid (3 is cheaper, 5 shows clean fringes)
    fieldScale: 1,   // resolution of the bead field × CSS px (lower on very large screens)
    rippleCell: 2,   // CSS px per ripple cell
    maxDrops: 1500,
    onReady: null
  };

  var CONTROL = 'input,button,select,textarea,a,label,summary,[contenteditable],[role=button],[role=slider]';
  var SUPPORT = 1.6;                              // a bead's kernel reaches SUPPORT × its radius
  var T = Math.pow(1 - 1 / (SUPPORT * SUPPORT), 2); // the field value at the bead's edge

  function merge(a, b) {
    var o = {}, k;
    for (k in a) o[k] = a[k];
    for (k in b) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) o[k] = merge(a[k], b[k]);
      else if (b[k] !== undefined) o[k] = b[k];
    }
    return o;
  }
  function liquidOf(spec) {
    if (!spec) return merge(LIQUIDS.water, {});
    if (typeof spec === 'string') return merge(LIQUIDS[spec] || LIQUIDS.water, {});
    return merge(LIQUIDS[spec.extends] || LIQUIDS.water, spec);
  }
  function $(s) { return typeof s === 'string' ? document.querySelector(s) : s; }

  // ------------------------------------------------------------------ shaders
  var FS_RIPPLE = [
    '#version 300 es', 'precision highp float;',
    'uniform sampler2D uPrev; uniform vec2 uCell, uSize; uniform float uC, uDamp, uDecay;',
    'uniform vec4 uHit[16]; uniform int uHits;',
    'in vec2 vUv; out vec4 o;',
    'void main(){',
    '  vec2 s = texture(uPrev, vUv).rg;',                                   // r = height, g = velocity
    '  float n = texture(uPrev, vUv + vec2(0., uCell.y)).r, so = texture(uPrev, vUv - vec2(0., uCell.y)).r;',
    '  float e = texture(uPrev, vUv + vec2(uCell.x, 0.)).r, w = texture(uPrev, vUv - vec2(uCell.x, 0.)).r;',
    '  float lap = (n + so + e + w) * .25 - s.x;',
    '  float v = (s.y + lap * uC) * uDamp;',
    '  float h = (s.x + v) * uDecay;',
    '  vec2 p = vec2(vUv.x, 1. - vUv.y) * uSize;',                          // CSS px, top-left origin
    '  for (int i = 0; i < 16; i++) { if (i >= uHits) break; vec2 d = p - uHit[i].xy; h -= uHit[i].w * exp(-dot(d, d) / (uHit[i].z * uHit[i].z)); }',
    '  if (!(abs(h) < 60.) || !(abs(v) < 60.)) { h = 0.; v = 0.; }',
    '  o = vec4(h, v, 0., 1.);',
    '}'
  ].join('\n');

  var VS_FIELD = [
    '#version 300 es',
    'layout(location=0) in vec2 aCorner; layout(location=1) in vec3 aBead; layout(location=2) in vec2 aPull;',
    'uniform vec2 uSize; uniform float uSupport;',
    'out vec2 vD; flat out float vR; flat out vec2 vPull;',
    'void main(){',
    '  float a = length(aPull);',
    '  float ext = aBead.z * uSupport * (1. + 1.9 * a) + 2.;',
    '  vD = aCorner * ext; vR = aBead.z; vPull = aPull;',
    '  vec2 p = aBead.xy + vD;',
    '  gl_Position = vec4(p.x / uSize.x * 2. - 1., 1. - p.y / uSize.y * 2., 0., 1.);',
    '}'
  ].join('\n');
  // one bead: k = (1 − q²)², q = distance ÷ (support × radius) in coordinates stretched along the pull. The leading
  // side stays round and the trailing side draws out, so a sliding bead is a teardrop. Writes (k, k·R, ∇k).
  var FS_FIELD = [
    '#version 300 es', 'precision highp float;',
    'uniform float uSupport;',
    'in vec2 vD; flat in float vR; flat in vec2 vPull; out vec4 o;',
    'void main(){',
    '  float a = length(vPull);',
    '  vec2 u = a > 1e-4 ? vPull / a : vec2(0., 1.); vec2 w = vec2(-u.y, u.x);',
    '  float al = dot(vD, u), pe = dot(vD, w);',
    '  float ka = al >= 0. ? 1. / (1. + .3 * a) : 1. / (1. + 1.9 * a);',
    '  float kp = 1. + .3 * a;',
    '  float S = vR * uSupport;',
    '  float q2 = (al * al * ka * ka + pe * pe * kp * kp) / (S * S);',
    '  if (q2 >= 1.) discard;',
    '  float t = 1. - q2;',
    '  vec2 dq2 = 2. * (al * ka * ka * u + pe * kp * kp * w) / (S * S);',
    '  o = vec4(t * t, t * t * vR, -2. * t * dq2);',
    '}'
  ].join('\n');

  var FS_GLASS = [
    '#version 300 es', 'precision highp float;',
    'uniform sampler2D uPage, uField, uRip;',
    'uniform vec2 uSize, uCanvas, uRipTexel; uniform float uDpr, uRipCell, uT, uS2;',
    'uniform float uBody, uIor, uDisp, uCap, uCapExp, uLensB, uFilm, uDensity, uScatter, uMetal, uSheen, uShadow, uCaustic, uRim;',
    'uniform vec3 uTint, uScatterCol, uMetalCol;',
    'uniform vec2 uL; uniform vec4 uWin; uniform float uPanes, uGlow; uniform vec3 uWinCol, uSky, uSkyDark, uBounce;',
    'uniform float uDark; uniform vec4 uHero; uniform float uPlain; uniform int uSpec;',
    'out vec4 o;',
    'vec3 page(vec2 q){ return texture(uPage, clamp(q / uSize, vec2(0.), vec2(1.))).rgb; }',
    'vec2 fuv(vec2 q){ return vec2(q.x / uSize.x, 1. - q.y / uSize.y); }',
    // the room above the page, seen in a reflection direction r (x right, y down, z toward the viewer)
    'vec3 room(vec3 r, vec2 p){',
    '  if (r.z < .05) return page(p + r.xy * 40.) * mix(.55, 1., uDark) * (1. - .4 * uDark);', // grazing: the paper around the bead
    '  vec2 q = r.xy / (1. + r.z);',                                                   // looking up: project the ceiling
    '  vec2 w = q - uL * uWin.x;',
    '  vec2 b = abs(w) - uWin.yz;',
    '  float inside = 1. - smoothstep(-.012, .012, max(b.x, b.y));',
    '  vec2 cell = fract((w + uWin.yz) / (2. * uWin.yz) * uPanes);',                     // mullions between the panes
    '  float bars = smoothstep(.0, .07, min(cell.x, cell.y)) * smoothstep(.0, .07, min(1. - cell.x, 1. - cell.y));',
    '  float glow = exp(-dot(w, w) / (uWin.y * uWin.z * 6.));',
    '  float ql = length(q);',
    '  vec3 sky = mix(uSky * .9, uSkyDark * .6, uDark) * smoothstep(1.3, .2, ql) * (.75 + .25 * dot(normalize(q + 1e-4), uL));',
    '  vec2 f2 = q + uL * .7; float fill = exp(-dot(f2, f2) / .05);',
    '  return uWinCol * uGlow * (inside * bars + glow * .06) + sky + uBounce * fill * mix(1.2, 2.4, uDark);',
    '}',
    'vec3 rainbow(float x){ return .5 + .5 * cos(6.2832 * (x + vec3(0., .33, .67))); }',
    'void main(){',
    '  vec2 suv = gl_FragCoord.xy / uCanvas;',
    '  vec2 p = vec2(suv.x, 1. - suv.y) * uSize;',
    '  if (uPlain > .5) { o = vec4(page(p), 1.); return; }',
    // ripples: height and its slope (per CSS px, y down)
    '  float hc = texture(uRip, suv).r;',
    '  float hE = texture(uRip, suv + vec2(uRipTexel.x, 0.)).r, hW = texture(uRip, suv - vec2(uRipTexel.x, 0.)).r;',
    '  float hN = texture(uRip, suv + vec2(0., uRipTexel.y)).r, hS = texture(uRip, suv - vec2(0., uRipTexel.y)).r;',
    '  vec2 gr = vec2(hE - hW, hS - hN) / (2. * uRipCell) * uFilm;',
    '  float lapR = (hE + hW + hN + hS - 4. * hc) / (uRipCell * uRipCell) * uFilm;',
    // beads: the field becomes a cap of height h with slope gh
    '  vec4 F = texture(uField, suv);',
    '  float f = F.r, R = F.g / max(f, 1e-5);',
    '  vec2 gf = F.ba; float gl = max(length(gf), 1e-5);',
    '  float m = clamp((f - uT) / gl * uDpr + .5, 0., 1.);',
    '  float sf = sqrt(max(f, 1e-6));',
    '  float u = clamp(1. - uS2 * (1. - sf), 0., 1.);',                    // 0 at the bead edge, 1 at its centre
    '  float h = R * uCap * pow(u, uCapExp) * m;',
    '  vec2 gh = R * uCap * uCapExp * pow(max(u, .006), uCapExp - 1.) * (uS2 * .5 / sf) * gf * m;',
    '  float big = smoothstep(30., 64., R) * step(.5, uHero.z);',           // the big drop magnifies instead
    '  vec3 n = normalize(vec3(-(gh + gr * 2.), 1.));',
    // the big drop: an exact lens around its centre (the same mapping as toPage() in JS)
    '  vec2 dc = p - uHero.xy; float rho = uHero.z > .5 ? length(dc) / uHero.z : 9.;',
    '  float lensW = rho < 1. ? (1. - rho * rho) * (1. - rho * rho) : 0.;',
    '  float wet = max(m, smoothstep(0., .015, length(gr)));',
    '  vec3 col;',
    '  if (m > .002 || lensW > 0.) {',                                     // beads and the lens: refract at several wavelengths
    '    col = vec3(0.); vec3 wsum = vec3(0.);',
    '    float depth = (h * 1.1 + R * uLensB * m) * (1. - big);',
    '    for (int i = 0; i < 5; i++) {',
    '      if (i >= uSpec) break;',
    '      float t = uSpec > 1 ? float(i) / float(uSpec - 1) : .5;',
    '      float ior = max(1.0001, uIor * (1. + (t - .5) * uDisp * .09));',
    '      vec3 rr = refract(vec3(0., 0., -1.), n, 1. / ior);',
    '      vec2 off = rr.xy / max(-rr.z, .22) * depth;',
    '      off += -gr * (1. - 1. / ior) * 260.;',
    '      float K = uHero.w * (1. + (t - .5) * uDisp * .16);',
    '      off += -dc * K * lensW;',
    '      vec3 wt = vec3(max(0., 1. - 2. * t), max(0., 1. - 2. * abs(t - .5)), max(0., 2. * t - 1.));',
    '      if (uSpec == 1) wt = vec3(1.);',
    '      col += page(p + off) * wt; wsum += wt;',
    '    }',
    '    col /= max(wsum, vec3(1e-3));',
    '  } else if (dot(gr, gr) > 1e-9) col = page(p - gr * (1. - 1. / uIor) * 260.);', // ripples only: one sample is enough
  '  else col = page(p);',
    // ripples gather and spread the light a little
    '  float face = dot(-gr, uL);',
    '  col *= 1. - clamp(-face * 2.2, 0., .12) - clamp(lapR * 2.5, 0., .05);',
    '  col += vec3(.95, .97, 1.) * pow(clamp(face * 12., 0., 1.), 3.) * .5 * (1. - m);',
    // contact shadow away from the lamp, and the light the bead gathers into a crescent on its far side
    '  float sh = 0., cau = 0.;',
    '  if (f > .0005 && m < .999) {',
    '    vec4 Fa = texture(uField, fuv(p + uL * 2.5));',
    '    float Ra = Fa.g / max(Fa.r, 1e-5);',
    '    vec4 Fb = texture(uField, fuv(p + uL * (2.5 + .07 * min(Ra, 36.))));',
    '    float band = (uT - Fb.r) / max(length(Fb.ba), 1e-5);',  // px outside the shadow-casting edge
    '    sh = (1. - smoothstep(0., 1.5 + .05 * min(Ra, 60.), band)) * (1. - m);',
    '  }',
    '  if (f > .0005) {',
    '    vec4 Fc = texture(uField, fuv(p + uL * .5 * min(R, 40.)));',
    '    cau = smoothstep(uT * 1.4, uT * 2.4, Fc.r) * (1. - smoothstep(.1, .65, u)) * smoothstep(uT * .5, uT, f) * (1. - big);',
    '  }',
    '  vec3 shCol = mix(mix(vec3(.62, .68, .82), vec3(.72), uDark), uTint * .7, clamp(uDensity * .25, 0., .8));',
    '  col *= mix(vec3(1.), shCol, sh * uShadow * (1. - .8 * cau));',
    '  col += cau * uCaustic * mix(vec3(1.), uTint, .6) * mix(.32, .2, uDark);',
    // the liquid absorbs (Beer–Lambert) and clouds
    '  float d = h + R * .1 * m * (1. - big);',
  '  d = d / (1. + d * .05);',                                            // thick liquid saturates instead of going black
    '  col *= exp(-(1. - uTint) * uDensity * d * .045);',
    '  col = mix(col, uScatterCol * mix(.9, .35, uDark), (1. - exp(-uScatter * d * .08)) * m);',
  '  col *= mix(vec3(1.), uTint, uBody * m);',                            // even a thin film of a coloured liquid is coloured
    // edge of the bead: darker toward the lamp, a little light on the far side
    '  float side = dot(n.xy, uL);',
    '  float edge = 1. - smoothstep(0., .32, u);',
    '  col *= 1. - m * uRim * edge * (.55 + .9 * smoothstep(-.2, .9, side)) * (1. - .75 * big) * (1. - .6 * uDark);',
    '  col *= 1. - big * m * .12 * edge;',
    '  col += m * uDark * edge * (.12 + .4 * smoothstep(-.2, 1., side)) * vec3(.78, .88, 1.) * (1. - uMetal);',
    // thin-film colours at the rim (oil, soap)
    '  col += uSheen * m * edge * .22 * (rainbow(h * .09 + R * .02) - .5);',
    // the room reflected, weighted by Fresnel; a metal reflects nearly everything, tinted by its colour
    '  vec3 rf = reflect(vec3(0., 0., -1.), n);',
    '  vec3 env = room(rf, p);',
    '  float F0 = pow((uIor - 1.) / (uIor + 1.), 2.);',
    '  float fr = clamp(F0 + (1. - F0) * pow(1. - clamp(n.z, 0., 1.), 5.), 0., 1.);',
    '  col = mix(col, env, fr * wet * (1. - uMetal));',
    '  vec3 metal = env * uMetalCol * (.75 + .25 * pow(1. - n.z, 2.)) * (1. - .55 * edge);',
    '  col = mix(col, metal, uMetal * m);',
    '  if (!(col.r >= 0.) || !(col.g >= 0.) || !(col.b >= 0.)) col = page(p);',
    '  o = vec4(clamp(col, 0., 1.), 1.);',
    '}'
  ].join('\n');

  // ------------------------------------------------------------------ start
  function start(userCfg) {
    var cfg = merge(DEFAULTS, userCfg || {});
    // #liquid=honey swaps the liquid for one of LIQUIDS (stills, quick looks); the page's own config is the default
    if (HIC.param('liquid') && LIQUIDS[HIC.param('liquid')]) cfg.liquid = HIC.param('liquid');
    var canvas = $(cfg.canvas), page = $(cfg.page);
    if (!canvas || !page) throw new Error('liquid: canvas or page not found');
    var L = { cfg: cfg, ready: false, fallback: false };
    root.__liquid = L;

    if (!HIC.supported('webgl')) { HIC.fallback(canvas, cfg.fallbackNote ? { note: cfg.fallbackNote } : undefined); L.fallback = true; return L; }

    var S = HIC.stage(canvas), gl = S.gl;
    if (!gl) { HIC.fallback(canvas); L.fallback = true; return L; }
    var floatOK = !!gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');
    var rng = HIC.rng(cfg.seed >>> 0 || 7);
    var calm = HIC.calm, still = HIC.still;
    var mat = liquidOf(cfg.liquid);
    // live parameters (what L.set() changes)
    var P = {
      ior: mat.ior, dispersion: mat.dispersion, rain: calm ? 0 : cfg.weather.rain, wind: cfg.weather.wind,
      lens: cfg.lens.on, magnify: cfg.lens.magnify, slide: mat.slide, plain: false
    };
    L.params = P; L.mat = mat;

    // ---- programs and buffers
    var progRip = HIC.gl.program(gl, null, FS_RIPPLE);
    var progField = HIC.gl.program(gl, VS_FIELD, FS_FIELD, ['aCorner', 'aBead', 'aPull']);
    var progGlass = HIC.gl.program(gl, null, FS_GLASS);
    var pageTex = HIC.gl.texture(gl, {});
    var MAXI = cfg.maxDrops * 2 + 64;
    var inst = new Float32Array(MAXI * 5);
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    var qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var ib = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ib);
    gl.bufferData(gl.ARRAY_BUFFER, inst.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 20, 0); gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 20, 12); gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);
    var zeroTex = HIC.gl.texture(gl, { w: 1, h: 1, data: new Uint8Array(4) });

    var W = 1, H = 1, rip = null, field = null, ripW = 0, ripH = 0;
    var FT = floatOK ? { internal: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT } : null;
    function disposeT(t) { if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); } }
    function targets() {
      W = S.W; H = S.H;
      if (!FT) return;
      if (rip) { disposeT(rip.read); disposeT(rip.write); }
      disposeT(field);
      ripW = Math.max(8, Math.round(W / cfg.rippleCell)); ripH = Math.max(8, Math.round(H / cfg.rippleCell));
      rip = HIC.gl.pingpong(gl, ripW, ripH, FT);
      var fs = cfg.fieldScale * (W * H > 2.4e6 ? .7 : 1);
      field = HIC.gl.target(gl, Math.max(8, Math.round(W * fs)), Math.max(8, Math.round(H * fs)), FT);
      [rip.read, rip.write, field].forEach(function (t) { gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); });
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // ---- geometry of the page (offsets, so a hit-test transform on the page does not disturb them)
    function boxOf(el) {
      var x = 0, y = 0, n = el;
      while (n && n !== page) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      if (n !== page) { var a = page.getBoundingClientRect(), b = el.getBoundingClientRect(), cb = canvas.getBoundingClientRect(); return [b.left - cb.left, b.top - cb.top, b.width, b.height, a]; }
      return [x - page.scrollLeft, y - page.scrollTop, el.offsetWidth, el.offsetHeight];
    }
    L.boxOf = boxOf;
    function boxes(sel) { if (!sel) return []; return [].slice.call(page.querySelectorAll(sel)).map(boxOf); }

    // ---- the beads
    var drops = [], impulses = [], hero = { x: -1e4, y: -1e4, vx: 0, vy: 0, tx: 0, ty: 0, R: 90, k: 0, w: 0, wv: 0, placed: false, moved: false, lobes: [] };
    var drag = null;
    L.drops = drops; L.hero = hero;
    function impulse(x, y, r, s) { if (impulses.length < 256) impulses.push(x, y, r, s); }
    function addDrop(x, y, r, vx, vy) {
      if (drops.length >= cfg.maxDrops) return null;
      var d = { x: x, y: y, r: r, vx: vx || 0, vy: vy || 0, th: mat.stick * (.85 + rng() * .4), slip: 1, slipT: rng(), trail: r * 2,
        age: 0, hold: 0, dying: false, pool: false, lobes: null, kind: 'bead' };
      // water never sits in perfect circles: bigger beads are a few overlapping lobes
      if (r > 5.2 && rng() < .3 + mat.lobes) {
        d.lobes = [];
        for (var i = 1 + (rng() * 2.6 | 0); i > 0; i--) d.lobes.push(rng() * 6.2832, (.25 + rng() * .4) * mat.lobes / .6, .48 + rng() * .32);
      }
      drops.push(d); return d;
    }
    function newSize() { var u = rng(), b = mat.bead; return u < .8 ? b[0] + rng() * (b[1] - b[0]) * .45 : u < .95 ? b[0] + (b[1] - b[0]) * (.45 + rng() * .55) : b[1] * (1.3 + rng() * .9); }
    L.addDrop = addDrop; L.impulse = impulse;

    // seeding: clusters of beads that avoid the controls, the keep-dry text and the big drop
    var pending = [], introT = 0, front = 1e9, introDur = (calm || still !== null || cfg.weather.intro === 'none') ? 0 : (cfg.weather.intro === 'fall' ? 1.4 : 1.6);
    function seed() {
      drops.length = 0; pending.length = 0;
      var ctl = boxes(CONTROL + ',' + (cfg.noTrail || CONTROL)), dry = boxes(cfg.keepDry);
      var near = function (bs, x, y, r) { for (var i = 0; i < bs.length; i++) { var b = bs[i]; if (x > b[0] - r && x < b[0] + b[2] + r && y > b[1] - r && y < b[1] + b[3] + r) return true; } return false; };
      var ok = function (x, y, r) {
        if (x < 3 || y < 3 || x > W - 3 || y > H - 3) return false;
        if (near(ctl, x, y, r * .5 + 2)) return false;
        if (r > 6 && near(dry, x, y, r)) return false;
        if (hero.placed && P.lens && Math.hypot(x - hero.x, y - hero.y) < hero.R + r + 8) return false;
        return true;
      };
      var B = cfg.beads, area = W * H / 1.3e6 * B.density, cl = [];
      for (var i = 0; i < B.clusters; i++) cl.push([rng() * W, rng() * H, 40 + rng() * 120]);
      function place(r, tries) {
        for (var t = 0; t < tries; t++) {
          var x, y;
          if (rng() < .78) { var c = cl[rng() * cl.length | 0], a = rng() * 6.2832, q = Math.sqrt(-2 * Math.log(1 - rng() * .98)) * c[2]; x = c[0] + Math.cos(a) * q; y = c[1] + Math.sin(a) * q; }
          else { x = rng() * W; y = rng() * H; }
          if (ok(x, y, r)) { var d = addDrop(x, y, r); if (d) d.th = Math.max(d.th, r * 1.25 + 2); return; }
        }
      }
      var b = mat.bead, i2;
      for (i2 = 0; i2 < Math.round(B.big * area) + 1; i2++) place(b[1] * (2.2 + rng() * rng() * 3), 50);
      for (i2 = 0; i2 < Math.round(B.mid * area); i2++) place(b[1] * (1 + rng() * 1.3), 30);
      for (i2 = 0; i2 < Math.round(B.small * area); i2++) place(b[0] + rng() * rng() * (b[1] - b[0]), 8);
      // drips that have been running a while: a joined ribbon from the top edge down to a heavy head bead
      var drip = cfg.weather.drip;
      if (drip && drip.preRun !== 0) {
        (drip.at || [.5]).forEach(function (fx) {
          var x = fx * W + (rng() - .5) * 8, len = H * (.12 + rng() * .3) * (drip.preRun || 1), y = 0;
          while (y < len) { var tb = addDrop(x + (rng() - .5) * 2, y, mat.bead[0] * (1.05 + rng() * .35)); if (tb) { tb.th = 999; tb.kind = 'trail'; tb.hold = mat.ribbon ? 1e9 : 0; tb.lobes = null; } y += mat.bead[0] * (mat.ribbon ? .9 : 3); }
          var hd = addDrop(x, len + mat.bead[1], (drip.size || mat.bead[1] * 1.6)); if (hd) { hd.th = 0; hd.lobes = null; }
        });
      }
      if (introDur > 0) { pending = drops.splice(0).sort(function (a, c) { return c.y - a.y; }); front = -1e9; introT = 0; }
      else front = 1e9;
    }
    function placeHero() {
      hero.R = HIC.clamp(Math.min(W, H) * cfg.lens.radius, cfg.lens.min, cfg.lens.max);
      var a = cfg.lens.anchor ? page.querySelector(cfg.lens.anchor) : null, x = W * .62, y = H * .42;
      if (a) { var b = boxOf(a); x = b[0] + b[2] * .5; y = b[1] + b[3] * .62; }
      hero.x = hero.tx = HIC.clamp(x, hero.R * .7, W - hero.R * .7); hero.y = hero.ty = HIC.clamp(y, hero.R * .7, H - hero.R * .7);
      hero.vx = hero.vy = 0;
      hero.placed = true;
      if (!hero.lobes.length) for (var i = 0; i < 3; i++) hero.lobes.push({ a: rng() * 6.2832, d: .14 + rng() * .12, s: .5 + rng() * .14, ph: rng() * 6.2832 });
    }

    function shake(x, y, power) {
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i], dx = d.x - x, dy = d.y - y, q = dx * dx + dy * dy;
        if (q > 160 * 160) continue;
        var l = Math.sqrt(q) + 1e-3, a = (1 - l / 160) * power;
        d.vx += dx / l * 80 * a * (mat.slide > .3 ? 1 : .3); d.vy += dy / l * 80 * a * (mat.slide > .3 ? 1 : .3);
        if (rng() < a * .5) d.th = Math.min(d.th, d.r - .2);
      }
    }
    function splash(x, y, power) {
      power = power || 1;
      var n = Math.round(48 * power);
      for (var i = 0; i < n; i++) {
        var a = rng() * 6.2832, sp = (90 + rng() * rng() * 720) * (mat.slide < .3 ? .55 : 1), r = rng() < .85 ? mat.bead[0] * (.8 + rng() * .9) : mat.bead[1] * (1 + rng() * .5);
        addDrop(x + Math.cos(a) * 8, y + Math.sin(a) * 8, r, Math.cos(a) * sp, Math.sin(a) * sp);
      }
      impulse(x, y, 24, 2.4 * power); shake(x, y, power);
    }
    function wipe() { for (var i = 0; i < drops.length; i++) drops[i].dying = true; for (var k = 0; k < 7; k++) impulse(W * (k + .5) / 7, H * .5, 40, .5); }
    L.splash = splash; L.wipe = wipe; L.shake = shake;

    // ---- the simulation step (JS beads + the big drop)
    var rainAcc = 0, dripAcc = .6, grid = new Map(), simTime = 0;
    function heroRadius() { return hero.R * hero.k * (1 + hero.w * .05); }
    function step(dt) {
      simTime += dt;
      if (!hero.placed && W > 1) { placeHero(); seed(); }
      // intro: a sheet of liquid runs down (or the beads land) and leaves the beads behind
      if (introDur > 0 && front < 1e8) {
        introT += dt;
        var u = HIC.clamp(introT / introDur, 0, 1), s = u * u * (3 - 2 * u);
        if (cfg.weather.intro === 'fall') { var keep = Math.floor(pending.length * (1 - s)); while (pending.length > keep) { var dd = pending.splice((rng() * pending.length) | 0, 1)[0]; drops.push(dd); impulse(dd.x, dd.y, 3 + dd.r * .6, .12 + dd.r * .03); } }
        else {
          front = s * (H + 160) - 80;
          while (pending.length && pending[pending.length - 1].y < front - 8) drops.push(pending.pop());
          if (u > 0 && u < 1) for (var k = 0; k < 6; k++) impulse(rng() * W, front + (rng() - .5) * 12, 12, .45);
        }
        if (u >= 1) { while (pending.length) drops.push(pending.pop()); front = 1e9; }
      }
      var raining = front > 1e8;
      // weather
      if (P.rain > 0 && raining) {
        rainAcc += dt * (.3 + 44 * P.rain * P.rain) * Math.min(2.2, W * H / 9.2e5);
        while (rainAcc > 1) {
          rainAcc--;
          var r = newSize(), x = rng() * W, y = rng() * H;
          if (cfg.dryUnder && cfg.dryUnder(x, y)) continue;
          if (addDrop(x, y, r, P.wind * 60, 0)) impulse(x, y, 3 + r * .6, .1 + r * .035);
        }
      }
      var drip = cfg.weather.drip;
      if (drip && raining && !calm) {
        dripAcc += dt / (drip.every || 2.5);
        while (dripAcc > 1) { dripAcc--; var at = drip.at || [.5]; var xx = at[(rng() * at.length) | 0] * W + (rng() - .5) * 10; var dd2 = addDrop(xx, -2, (drip.size || mat.bead[1] * 1.6) * (.85 + rng() * .3), 0, 20); if (dd2) { dd2.th = 0; dd2.slip = 1; } }
      }
      // the big drop: a spring toward the pointer while dragged, coasting with friction after; it jiggles (w)
      var kt = P.lens && front > hero.y ? 1 : 0; hero.k += (kt - hero.k) * Math.min(1, dt * 7);
      if (drag) { hero.vx += ((hero.tx - hero.x) * 240 - hero.vx * 22) * dt; hero.vy += ((hero.ty - hero.y) * 240 - hero.vy * 22) * dt; }
      else { var fr = Math.exp(-dt * 5.5); hero.vx *= fr; hero.vy *= fr; }
      hero.x += hero.vx * dt; hero.y += hero.vy * dt;
      hero.x = HIC.clamp(hero.x, 0, W); hero.y = HIC.clamp(hero.y, 0, H);
      hero.wv += (-hero.w * 210 - hero.wv * 8) * dt; hero.w += hero.wv * dt;
      var hr = heroRadius(), hs = Math.hypot(hero.vx, hero.vy);
      if (hs > 30 && hero.k > .5 && rng() < dt * 30) impulse(hero.x, hero.y, hr * .5, Math.min(.5, hs / 2400));

      // beads
      var damp = Math.exp(-dt * 4.2), crowd = drops.length > cfg.maxDrops * .7, slideK = P.slide, gx = P.wind * .35, gy = 1;
      var gl2 = Math.hypot(gx, gy); gx /= gl2; gy /= gl2;
      grid.clear();
      for (var i = drops.length - 1; i >= 0; i--) {
        var d = drops[i];
        d.age += dt;
        if (d.dying) d.r *= Math.exp(-dt * 8);
        else if (d.r < mat.bead[1] * .8) d.r -= dt * (crowd ? .5 : d.kind === 'wet' ? (d.age < d.hold ? .03 : .3) : mat.evaporate);
        if (d.pool) d.r -= dt * (mat.evaporate * 6 + .05);
        if (d.r < (d.kind === 'wet' ? 1.5 : 2.2) || d.y - d.r > H + 30 || d.x < -40 || d.x > W + 40) { drops[i] = drops[drops.length - 1]; drops.pop(); continue; }
        if (d.r > d.th && !d.pool && slideK > 0) {
          // heavy enough to slide: stick-slip toward a terminal speed set by size and viscosity
          d.slipT -= dt;
          if (d.slipT < 0) { d.slip = rng() < .2 ? .04 : .3 + rng() * .7; d.slipT = .2 + rng() * 1.3; }
          var e = d.r - d.th * .55, vt = Math.min(560, e * e * 2.3 + 14) * d.slip * slideK;
          var along = d.vx * gx + d.vy * gy;
          var dv = (vt - along) * Math.min(1, dt * 4);
          d.vx += gx * dv + ((rng() - .5) * 70 * Math.min(1, slideK * 2) - d.vx * 1.6) * dt * 3 * (1 - Math.abs(gx));
          d.vy += gy * dv;
          // a sliding bead leaves a trail of small beads (a ribbon for viscous liquids)
          d.trail -= Math.abs(along) * dt;
          if (mat.trail > 0 && d.trail < 0 && d.r > mat.bead[0] * 1.6) {
            var tr = d.r * (.16 + rng() * .14) * (1 + mat.ribbon * .9);
            var tb = addDrop(d.x + (rng() - .5) * d.r * .4 * (1 - mat.ribbon), d.y - d.r * .8, Math.max(mat.bead[0] * .8, tr));
            if (tb) { tb.th = 999; tb.kind = 'trail'; tb.hold = mat.ribbon ? 1e9 : 0; tb.lobes = null; }
            d.r = Math.cbrt(Math.max(1, d.r * d.r * d.r - tr * tr * tr * (1 - mat.ribbon * .55)));
            d.trail = d.r * (mat.ribbon ? .35 + rng() * .3 : 1.3 + rng() * 3) / mat.trail;
          }
        } else { d.vx *= damp; d.vy *= damp; }
        d.fly = d.vx * d.vx + d.vy * d.vy > 2500 && !(d.r > d.th);
        d.x += d.vx * dt; d.y += d.vy * dt;
        // liquid that reaches the bottom edge gathers there and slowly dries
        if (d.y > H - d.r * .3) { d.y = H - d.r * .3; d.vy = 0; d.pool = true; }
        // swallowed by the big drop
        if (hero.k > .6) {
          var hx = d.x - hero.x, hy = d.y - hero.y;
          if (hx * hx + hy * hy < hr * hr * .86) { hero.wv += Math.min(3, d.r * .2) * mat.wobble; drops[i] = drops[drops.length - 1]; drops.pop(); continue; }
        }
        var key = (d.x >> 6) + (d.y >> 6) * 4096, cell = grid.get(key);
        if (!cell) grid.set(key, cell = []);
        cell.push(d);
      }
      // beads that touch become one bead (volume kept)
      for (var j = 0; j < drops.length; j++) {
        var a = drops[j]; if (a.r <= 0) continue;
        var cx = a.x >> 6, cy = a.y >> 6;
        for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {
          var c = grid.get(cx + ox + (cy + oy) * 4096); if (!c) continue;
          for (var m = 0; m < c.length; m++) {
            var b = c[m];
            if (b === a || b.r <= 0 || b.r > a.r || (b.r === a.r && b.x <= a.x) || a.fly || b.fly) continue;
            if ((a.hold && a.age < a.hold) && (b.hold && b.age < b.hold)) continue;
            if (b.kind === 'trail' && a.kind === 'trail' && mat.ribbon) continue;
            var dx = b.x - a.x, dy = b.y - a.y, rr = (a.r + b.r) * mat.merge;
            if (dx * dx + dy * dy < rr * rr) {
              var va = a.r * a.r * a.r, vb = b.r * b.r * b.r, vs = va + vb;
              a.x = (a.x * va + b.x * vb) / vs; a.y = (a.y * va + b.y * vb) / vs;
              a.vx = (a.vx * va + b.vx * vb) / vs; a.vy = (a.vy * va + b.vy * vb) / vs;
              a.r = Math.cbrt(vs); a.dying = a.dying && b.dying; b.r = 0;
              if (a.kind === 'trail' && b.kind !== 'trail') { a.kind = 'bead'; a.th = mat.stick; a.hold = 0; }
            }
          }
        }
      }
      for (var z = drops.length - 1; z >= 0; z--) if (drops[z].r <= 0) { drops[z] = drops[drops.length - 1]; drops.pop(); }
    }

    // ---- instances for the field
    function fill() {
      var n = 0;
      function put(x, y, r, sx, sy) { if (n >= MAXI) return; var o = n * 5; inst[o] = x; inst[o + 1] = y; inst[o + 2] = r; inst[o + 3] = sx; inst[o + 4] = sy; n++; }
      var hr = heroRadius();
      if (hr > 2) {
        var s = Math.hypot(hero.vx, hero.vy), a = Math.min(.28, s / 2800) + Math.abs(hero.w) * .03;
        var ux = s > 1 ? hero.vx / s : 1, uy = s > 1 ? hero.vy / s : 0;
        put(hero.x, hero.y, hr, ux * a, uy * a);
        // the big drop's lobes breathe and lag behind when it moves (inertia), so its edge is never a perfect circle
        for (var i = 0; i < hero.lobes.length; i++) {
          var lb = hero.lobes[i], br = calm ? 0 : Math.sin(simTime * (1.1 + i * .37) + lb.ph) * .025;
          var lx = Math.cos(lb.a) * lb.d * hr - hero.vx * .018, ly = Math.sin(lb.a) * lb.d * hr - hero.vy * .018;
          put(hero.x + lx, hero.y + ly, hr * (lb.s + br + hero.w * .02), ux * a, uy * a);
        }
      }
      for (var j = 0; j < drops.length; j++) {
        var d = drops[j], sp = Math.hypot(d.vx, d.vy), st = Math.min(.45, sp / 600);
        var sx = sp > 1 ? d.vx / sp * st : 0, sy = sp > 1 ? d.vy / sp * st : 0;
        put(d.x, d.y, d.lobes ? d.r * .9 : d.r, sx, sy);
        if (d.lobes) for (var k = 0; k < d.lobes.length; k += 3) put(d.x + Math.cos(d.lobes[k]) * d.lobes[k + 1] * d.r, d.y + Math.sin(d.lobes[k]) * d.lobes[k + 1] * d.r, d.lobes[k + 2] * d.r, sx, sy);
      }
      return n;
    }

    // ---- GPU passes
    var hitBuf = new Float32Array(64), ripAcc = 0, RATE = 120;
    function rippleSteps(count) {
      if (!FT || count <= 0) return;
      progRip.use();
      gl.disable(gl.BLEND);
      gl.viewport(0, 0, ripW, ripH);
      gl.uniform2f(progRip.u.uCell, 1 / ripW, 1 / ripH); gl.uniform2f(progRip.u.uSize, W, H);
      var rp = mat.ripple;
      gl.uniform1f(progRip.u.uC, HIC.clamp(rp.speed, .05, 1.95)); gl.uniform1f(progRip.u.uDamp, rp.damp); gl.uniform1f(progRip.u.uDecay, rp.decay);
      for (var s = 0; s < count; s++) {
        var n = Math.min(16, impulses.length / 4);
        hitBuf.fill(0);
        for (var i = 0; i < n * 4; i++) hitBuf[i] = impulses[i];
        impulses.splice(0, n * 4);
        gl.uniform1i(progRip.u.uHits, n); gl.uniform4fv(progRip.u.uHit, hitBuf);
        gl.bindFramebuffer(gl.FRAMEBUFFER, rip.write.fb);
        HIC.gl.bind(gl, progRip, { uPrev: rip.read.tex });
        HIC.gl.fullscreen(gl);
        rip.swap();
      }
    }
    function drawField() {
      if (!FT) return;
      var n = fill();
      gl.bindFramebuffer(gl.FRAMEBUFFER, field.fb); gl.viewport(0, 0, field.w, field.h);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      if (!n) return;
      progField.use();
      gl.uniform2f(progField.u.uSize, W, H); gl.uniform1f(progField.u.uSupport, SUPPORT);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst.subarray(0, n * 5));
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
    }
    var dark = 0;
    // a mirror (metal) shows no page through it, so it does not magnify
    function lensK() { return HIC.clamp(P.magnify * (1 - 1 / Math.max(1, P.ior)) * .95, 0, .78) * (1 - (mat.metal || 0)); }
    function drawGlass() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
      var g = progGlass, u = g.u, lt = cfg.light, win = lt.window;
      g.use();
      HIC.gl.bind(gl, g, { uPage: pageTex, uField: FT ? field.tex : zeroTex, uRip: FT ? rip.read.tex : zeroTex });
      gl.uniform2f(u.uSize, W, H); gl.uniform2f(u.uCanvas, canvas.width, canvas.height);
      gl.uniform2f(u.uRipTexel, 1 / ripW, 1 / ripH); gl.uniform1f(u.uRipCell, W / Math.max(1, ripW));
      gl.uniform1f(u.uDpr, canvas.width / W); gl.uniform1f(u.uT, T); gl.uniform1f(u.uS2, SUPPORT * SUPPORT);
      gl.uniform1f(u.uIor, P.ior); gl.uniform1f(u.uDisp, P.dispersion);
      gl.uniform1f(u.uCap, mat.cap); gl.uniform1f(u.uCapExp, mat.capExp); gl.uniform1f(u.uLensB, mat.lens * HIC.clamp((P.ior - 1) / .33, 0, 2.2));
      gl.uniform1f(u.uBody, mat.body || 0); gl.uniform1f(u.uFilm, mat.film); gl.uniform1f(u.uDensity, mat.density); gl.uniform1f(u.uScatter, mat.scatter);
      gl.uniform1f(u.uMetal, mat.metal); gl.uniform1f(u.uSheen, mat.sheen); gl.uniform1f(u.uShadow, mat.shadow);
      gl.uniform1f(u.uCaustic, mat.caustic); gl.uniform1f(u.uRim, mat.rim);
      gl.uniform3fv(u.uTint, mat.tint); gl.uniform3fv(u.uScatterCol, mat.scatterColor); gl.uniform3fv(u.uMetalCol, mat.metalColor);
      var ll = Math.hypot(lt.dir[0], lt.dir[1]) || 1;
      gl.uniform2f(u.uL, lt.dir[0] / ll, lt.dir[1] / ll);
      gl.uniform4f(u.uWin, win.dist, win.w, win.h, 0); gl.uniform1f(u.uPanes, win.panes); gl.uniform1f(u.uGlow, win.glow);
      gl.uniform3fv(u.uWinCol, win.color); gl.uniform3fv(u.uSky, lt.sky); gl.uniform3fv(u.uSkyDark, lt.skyDark); gl.uniform3fv(u.uBounce, lt.bounce);
      gl.uniform1f(u.uDark, dark);
      var hr = heroRadius();
      gl.uniform4f(u.uHero, hero.x, hero.y, hr > 4 ? hr : 0, lensK() * HIC.smooth(.4, 1, hero.k));
      gl.uniform1f(u.uPlain, P.plain ? 1 : 0); gl.uniform1i(u.uSpec, cfg.spectral | 0);
      HIC.gl.fullscreen(gl);
    }

    // ---- the lens as a mapping (screen → page), shared by hit testing and __hic.screenOf
    function toPage(x, y) {
      var hr = heroRadius(), K = lensK() * HIC.smooth(.4, 1, hero.k);
      if (hr <= 4 || K <= 0) return [x, y];
      var dx = x - hero.x, dy = y - hero.y, rho = Math.hypot(dx, dy) / hr;
      if (rho >= 1) return [x, y];
      var w = (1 - rho * rho) * (1 - rho * rho), s = 1 - K * w;
      return [hero.x + dx * s, hero.y + dy * s];
    }
    function inLens(x, y) { var hr = heroRadius(); return P.lens && hr > 4 && Math.hypot(x - hero.x, y - hero.y) < hr; }
    L.toPage = toPage; L.inLens = inLens;
    root.__hic.screenOf = function (el) {
      var b = boxOf(el), q = [b[0] + b[2] / 2, b[1] + b[3] / 2], s = q.slice();
      for (var i = 0; i < 40; i++) { var p = toPage(s[0], s[1]); s[0] += (q[0] - p[0]) * .8; s[1] += (q[1] - p[1]) * .8; }
      return s;
    };
    var placed = '', pointer = null;
    function placeForHits() {
      if (!L.ready) return;
      if (pointer && inLens(pointer[0], pointer[1])) { S.placeLocal(page, pointer[0], pointer[1], toPage); placed = 'lens'; }
      else if (placed !== 'flat') { S.place(page, [1, 0, 0, 1, 0, 0]); placed = 'flat'; }
    }

    // ---- input
    var down = false, keyboard = false, trailAcc = 0, last = null;
    function local(e) { var b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }
    function onControl(e, extra) { return e.target instanceof Element && !!e.target.closest(CONTROL + (extra ? ',' + extra : '')); }
    root.addEventListener('pointerdown', function (e) {
      if (!L.ready) return;
      var p = local(e); keyboard = false; down = true; hero.moved = true; pointer = p;
      if (front < 1e8 && introDur > 0) { introT = introDur; }
      impulse(p[0], p[1], 9, 3); shake(p[0], p[1], .5);
      if (inLens(p[0], p[1]) && !onControl(e)) {
        drag = { id: e.pointerId, ox: hero.x - p[0], oy: hero.y - p[1] };
        hero.tx = hero.x; hero.ty = hero.y; hero.wv += 1.3 * mat.wobble;
        e.preventDefault(); page.classList.add('liquid-grabbing');
      }
      last = p;
    }, { capture: true });
    root.addEventListener('pointermove', function (e) {
      if (!L.ready) return;
      var p = local(e), sp = last ? Math.hypot(p[0] - last[0], p[1] - last[1]) : 0;
      pointer = p;
      if (drag && e.pointerId === drag.id) { hero.tx = p[0] + drag.ox; hero.ty = p[1] + drag.oy; }
      else if (down) { if (sp > 3) impulse(p[0], p[1], 7, Math.min(.5, sp * .03)); }
      else if (!calm && sp > 2 && last) {
        impulse(p[0], p[1], 6, Math.min(.1, sp * .006));
        // the pointer is a wet fingertip: it leaves a line of small beads that gather and run
        if (front > 1e8 && !onControl(e, cfg.noTrail) && !inLens(p[0], p[1])) {
          var gap = 2.3, n = Math.min(24, Math.floor((trailAcc + sp) / gap));
          for (var i = 1; i <= n; i++) {
            var t = (i * gap - trailAcc) / sp, d = addDrop(last[0] + (p[0] - last[0]) * t + (rng() - .5) * 1.2, last[1] + (p[1] - last[1]) * t + (rng() - .5) * 1.2, mat.bead[0] * (.62 + rng() * .3));
            if (d) { d.kind = 'wet'; d.th = mat.stick * .75 + rng() * 1.5; d.hold = .9 + rng() * 1.2; d.lobes = null; }
          }
          trailAcc = n ? trailAcc + sp - n * gap : trailAcc + sp;
        } else trailAcc = 0;
      }
      if (!drag) page.classList.toggle('liquid-grab', inLens(p[0], p[1]) && !onControl(e));
      placeForHits();
      last = p;
    }, { capture: true, passive: true });
    function endDrag() { down = false; if (drag) { drag = null; page.classList.remove('liquid-grabbing'); hero.wv -= 1.5 * mat.wobble; } }
    root.addEventListener('pointerup', endDrag, { capture: true });
    root.addEventListener('pointercancel', endDrag, { capture: true });
    document.documentElement.addEventListener('pointerleave', function () { pointer = null; placeForHits(); });
    root.addEventListener('touchmove', function (e) { if (drag) e.preventDefault(); }, { passive: false, capture: true });
    root.addEventListener('selectstart', function (e) { if (drag) e.preventDefault(); }, { capture: true });
    // a press that grabs the big drop must not clear a selection: seeing it through the drop is the point
    root.addEventListener('mousedown', function (e) { if (drag) e.preventDefault(); }, { capture: true });
    root.addEventListener('keydown', function (e) { if (e.key === 'Tab') keyboard = true; }, { capture: true });
    page.addEventListener('focusin', function (e) {
      if (!keyboard || !L.ready) return;
      var b = boxOf(e.target); impulse(b[0] + b[2] / 2, b[1] + b[3] / 2, HIC.clamp(b[3] * .6, 12, 40), .8);
    });
    // typing wets the letters: a ripple at the caret and now and then a bead
    var meas = document.createElement('canvas').getContext('2d'), typed = 0;
    page.addEventListener('input', function (e) {
      var el = e.target; if (!L.ready || !el.matches || !el.matches(cfg.typeWet)) return;
      var b = boxOf(el), cs = getComputedStyle(el), x = b[0] + b[2] / 2;
      if ('selectionStart' in el && typeof el.value === 'string') {
        meas.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        x = b[0] + parseFloat(cs.paddingLeft || 0) + Math.min(b[2] - 20, meas.measureText(el.value.slice(0, el.selectionStart || 0)).width);
      }
      var y = b[1] + b[3] / 2;
      if ((!e.inputType || e.inputType.indexOf('insert') === 0) && (typed++ % 2 === 0)) { var d = addDrop(x - 6, y + 6 + (rng() - .5) * 4, mat.bead[0] * (.9 + rng() * .3)); if (d) { d.th = mat.stick * .7; d.lobes = null; } }
      impulse(x, y, 8, .55);
    });

    // ---- paint: upload the page when its pixels change; check that the picture is real
    var uploaded = 0, emptyRuns = 0, probeFb = gl.createFramebuffer(), px4 = new Uint8Array(4);
    function pageLooksEmpty() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, probeFb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pageTex, 0);
      var empty = true;
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
        for (var i = 0; i < 9 && empty; i++) {
          gl.readPixels(Math.floor((i % 3 + .5) / 3 * pageTex.w), Math.floor(((i / 3 | 0) + .5) / 3 * pageTex.h), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px4);
          if (px4[3] > 0) empty = false;
        }
      } else empty = false;
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return empty;
    }
    function readPaper() {
      var c = cfg.light.paper, m;
      if (!c) { m = (getComputedStyle(page).backgroundColor.match(/[\d.]+/g) || [255, 255, 255]).map(Number); c = [m[0] / 255, m[1] / 255, m[2] / 255]; }
      dark = (.3 * c[0] + .59 * c[1] + .11 * c[2]) < .45 ? 1 : 0;
    }
    S.onPaint(function () {
      if (!S.upload(page, pageTex)) return;
      uploaded++;
      readPaper();
      if (!L.ready) {
        if (pageLooksEmpty()) {
          // the browser handed WebGL an empty picture: try a few times, then show the plain page instead of a blank canvas
          if (++emptyRuns >= 4) { root.__hic.errors.push('liquid: the uploaded page stayed empty'); L.stop && L.stop(); HIC.fallback(canvas, { note: 'This browser drew the page empty through HTML-in-Canvas, so here it is as an ordinary page.' }); L.fallback = true; return; }
          setTimeout(function () { S.requestPaint(); }, 120);
          return;
        }
        if (L.starting) return;
        L.starting = true;
        var target = cfg.probe ? page.querySelector(cfg.probe) : (page.querySelector('[data-hic-edit]') || page.firstElementChild);
        var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        fontsReady.then(function () { return S.probe(page, target); }).then(function (mode) {
          S.place(page, [1, 0, 0, 1, 0, 0]); placed = 'flat';   // probe leaves the page shifted: put it back
          targets(); placeHero(); seed();
          if (still !== null) { L.run(Math.round(still * 60)); frozen = true; }
          L.ready = true;
          S.ready({ mode: mode, liquid: cfg.liquid && cfg.liquid.name || cfg.liquid, floatTargets: !!FT });
          if (cfg.onReady) cfg.onReady(L);
        });
      }
    });

    // ---- time
    var frozen = false;
    // run(n): n fixed steps of 1/60 s (stills and checks advance a frozen page with it)
    L.run = function (n) {
      for (var i = 0; i < n; i++) { step(1 / 60); ripAcc += RATE / 60; var k = Math.floor(ripAcc); ripAcc -= k; rippleSteps(k); }
      if (L.ready) { drawField(); drawGlass(); }
      return L;
    };
    var stop = S.loop(function (t, dt) {
      if (!L.ready) return;
      if (!frozen) {
        step(dt);
        ripAcc = Math.min(ripAcc + dt * RATE, 6);
        var k = Math.floor(ripAcc); ripAcc -= k; rippleSteps(k);
      }
      drawField(); drawGlass();
      if (pointer && drag) placeForHits();
    });
    L.stop = stop;
    root.addEventListener('resize', function () {
      S.resize(); if (!L.ready) return;
      targets();
      if (!hero.moved) { placeHero(); seed(); } else { hero.x = Math.min(hero.x, W); hero.y = Math.min(hero.y, H); }
      for (var i = 0; i < drops.length; i++) { drops[i].x = Math.min(drops[i].x, W - 2); drops[i].y = Math.min(drops[i].y, H - 2); }
      S.requestPaint();
    });

    // ---- the API pages and controls use
    L.set = function (o) {
      for (var k in o) {
        if (k === 'lens') { P.lens = !!o.lens; continue; }
        if (k in P) P[k] = o[k];
        else if (k in mat) mat[k] = o[k];
      }
      return L;
    };
    L.liquid = function (spec) {
      var m2 = liquidOf(spec); for (var k in m2) mat[k] = m2[k];
      P.ior = mat.ior; P.dispersion = mat.dispersion; P.slide = mat.slide;
      for (var i = 0; i < drops.length; i++) drops[i].th = Math.min(drops[i].th, mat.stick * 1.2);
      return L;
    };
    L.lensK = lensK;
    L.freeze = function (v) { frozen = v !== false; return L; };
    L.state = function () {
      var cover = 0; for (var i = 0; i < drops.length; i++) cover += Math.PI * drops[i].r * drops[i].r;
      return { drops: drops.length, cover: cover / (W * H), hero: { x: hero.x, y: hero.y, r: heroRadius(), vx: hero.vx, vy: hero.vy, w: hero.w }, dark: dark, uploads: uploaded, W: W, H: H, frozen: frozen, lensK: lensK(), floatTargets: !!FT };
    };
    // the largest ripple height within r px of (x, y) (checks read it back from the float texture)
    L.rippleAt = function (x, y, r) {
      if (!FT) return 0;
      r = r || 12;
      var cx = Math.round(x / W * ripW), cy = Math.round((1 - y / H) * ripH), rr = Math.max(1, Math.round(r / (W / ripW)));
      var x0 = HIC.clamp(cx - rr, 0, ripW - 1), y0 = HIC.clamp(cy - rr, 0, ripH - 1), w = Math.min(ripW - x0, rr * 2 + 1), h = Math.min(ripH - y0, rr * 2 + 1);
      var buf = new Float32Array(w * h * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, rip.read.fb);
      gl.readPixels(x0, y0, w, h, gl.RGBA, gl.FLOAT, buf);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      var mx = 0; for (var i = 0; i < buf.length; i += 4) mx = Math.max(mx, Math.abs(buf[i]));
      return mx;
    };
    L.redraw = function () { if (L.ready) { drawField(); drawGlass(); } return L; };
    L.stage = S;
    return L;
  }

  // ------------------------------------------------------------------ small helpers for a page's controls
  // range(input, output, fn): keeps the track fill (--p) and the read-out in step; fn(value) → { label, set }
  function range(input, output, fn) {
    input = $(input); output = $(output);
    function sync() {
      var v = +input.value, p = (v - input.min) / ((+input.max) - (+input.min)) * 100;
      input.style.setProperty('--p', p + '%');
      var r = fn ? fn(v) : null;
      if (output && r && r.label !== undefined) output.textContent = r.label;
    }
    input.addEventListener('input', sync); sync();
    return sync;
  }

  root.Liquid = { start: start, LIQUIDS: LIQUIDS, DEFAULTS: DEFAULTS, range: range, liquidOf: liquidOf, version: '1.0.0' };
})(typeof window !== 'undefined' ? window : globalThis);

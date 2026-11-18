/* paper-desk.js — a live HTML sheet lying on a lamp-lit desk, drawn in WebGL2 through HTML-in-Canvas.
 *
 * The sheet is an ordinary element (<article id="sheet" drawable>) inside <canvas layoutsubtree content="drawable">.
 * Its pixels are uploaded (lib/hic.js) and printed onto a paper mesh: the DOM's white becomes the paper stock, its ink
 * stays ink. The mesh is bent on the CPU by the physical acts —
 *   curl     a corner (or any point) peels over a cylinder and springs back with the paper's weight
 *   fold     the same peel with a crease-sized radius; on release it stays folded and leaves a crease line
 *   crumple  press and hold: the sheet gathers onto a ball over a faceted height field; on release it opens, wrinkled
 *   burn     a click lights a burn front that eats outward along noise, with a glowing rim, char, embers and a hole
 *   stain    a click spills a liquid that spreads and dries with a darker ring
 * — and lit by a desk lamp (soft shadow map, contact shadow), the fire itself and a little room light, then tone-mapped
 * with bloom. Because the CPU knows every vertex, the element is placed for hit testing where it is drawn: the exact
 * plane homography while flat, the local affine of the triangle under the pointer while bent. Clicks, typing,
 * selection and find-in-page keep working on a curled, folded, crumpled or burning sheet. Holes are not hittable.
 *
 *   var desk = PaperDesk.create({ canvas, sheet, stock: 'laid', desk: 'walnut', props: [...], acts: {...} });
 *   desk.tool('burn'); desk.ignite(.5, .3); desk.flatten(); desk.fresh(); desk.lamp(false); desk.stock('kraft');
 *
 * Every number a topic changes lives in the config object (see DEFAULTS below and references/ENGINE.md). New paper
 * stocks, desk surfaces and props are added from the page (PaperDesk.STOCKS.x = {...}, PaperDesk.PROPS.x = fn) without
 * editing this file. Needs lib/hic.js. No dependencies, no network.
 */
(function (root) {
  'use strict';
  var HIC = root.HIC;
  var PD = { version: '1.0.0' };
  var clamp = HIC.clamp, mix = HIC.mix, sstep = HIC.smooth, M4 = HIC.mat4;

  // ================================================================== presets (examples of the style, extend per topic)
  // A stock is how the paper itself looks and behaves. tint: linear-ish albedo of the front; back: the reverse side;
  // laid: chain + laid lines (0..1); fibre: cloudy formation (0..1); sheen: specular (0..1); tooth: surface bump (0..1);
  // gsm: weight in g/m² (sets curl radius, spring stiffness, crumple speed); char: [r,g,b] of the burnt edge.
  PD.STOCKS = {
    wove:      { tint: [0.93, 0.92, 0.885], back: [0.86, 0.85, 0.82], laid: 0, fibre: 0.35, sheen: 0.12, tooth: 0.5, gsm: 90 },
    laid:      { tint: [0.92, 0.86, 0.74], back: [0.86, 0.80, 0.69], laid: 1, fibre: 0.55, sheen: 0.10, tooth: 0.7, gsm: 100 },
    copy:      { tint: [0.95, 0.95, 0.94], back: [0.90, 0.90, 0.89], laid: 0, fibre: 0.15, sheen: 0.18, tooth: 0.25, gsm: 80 },
    kraft:     { tint: [0.52, 0.37, 0.22], back: [0.47, 0.33, 0.20], laid: 0, fibre: 0.9, sheen: 0.08, tooth: 0.9, gsm: 120 },
    airmail:   { tint: [0.42, 0.60, 0.88], back: [0.40, 0.56, 0.82], laid: 0, fibre: 0.3, sheen: 0.15, tooth: 0.3, gsm: 45 },
    parchment: { tint: [0.86, 0.76, 0.55], back: [0.80, 0.70, 0.52], laid: 0, fibre: 1.0, sheen: 0.06, tooth: 1.0, gsm: 160 },
    card:      { tint: [0.94, 0.91, 0.84], back: [0.90, 0.87, 0.80], laid: 0, fibre: 0.4, sheen: 0.10, tooth: 0.6, gsm: 300 },
    rose:      { tint: [0.95, 0.85, 0.83], back: [0.90, 0.80, 0.78], laid: 1, fibre: 0.45, sheen: 0.10, tooth: 0.6, gsm: 100 }
  };
  // A desk surface. kind: felt | wood | leather | laminate. a, b: two linear colours; scale: pattern size; gloss 0..1.
  PD.DESKS = {
    felt:     { kind: 'felt', a: [0.010, 0.040, 0.026], b: [0.022, 0.070, 0.046], scale: 1, gloss: 0 },
    walnut:   { kind: 'wood', a: [0.060, 0.030, 0.014], b: [0.150, 0.080, 0.036], scale: 1, gloss: 0.35, plank: 2.6 },
    oak:      { kind: 'wood', a: [0.210, 0.120, 0.055], b: [0.380, 0.240, 0.120], scale: 1.2, gloss: 0.25, plank: 2.2 },
    leather:  { kind: 'leather', a: [0.090, 0.020, 0.012], b: [0.160, 0.045, 0.025], scale: 1, gloss: 0.3 },
    laminate: { kind: 'laminate', a: [0.120, 0.125, 0.130], b: [0.170, 0.175, 0.180], scale: 1, gloss: 0.45 }
  };
  var DESK_KIND = { felt: 0, wood: 1, leather: 2, laminate: 3 };

  // ================================================================== defaults (every field can be overridden by the page)
  var DEFAULTS = {
    stock: 'wove', gsm: null,              // gsm: null = the stock's own weight
    desk: 'felt',
    lamp: { on: true, pos: [-3.0, 2.6, 4.2], aim: [0.1, 0.0, 0], color: [1.0, 0.82, 0.60], power: 1.35, cone: 0.80 },
    room: { sky: [0.075, 0.085, 0.105], ground: [0.045, 0.035, 0.028], off: 0.16 },   // ambient; off = share left with the lamp off
    props: [],                              // [{ kind, at: [x, y] in half-sheets from the centre, rot (rad), scale, ...kind options }]
    acts: { curl: true, fold: { max: 4 }, crumple: true, burn: { max: 6, size: 0.36, speed: 2.6 }, stain: false },
    camera: { fov: 26, tilt: 15, margin: { top: 30, bottom: 112, side: 28 }, phone: { top: 54, bottom: 110, side: 10 } },
    look: { exposure: 1.0, bloom: 0.32, vignette: 0.6, grain: 1.0 },
    hints: {
      type: 'Click the page and type. Drag a corner to curl it.',
      curl: 'Drag anywhere on the page. Let go and it springs back.',
      fold: 'Drag to fold the page over. Let go to crease it.',
      crumple: 'Press and hold on the page.',
      burn: 'Click the page to light it.',
      stain: 'Click the page to spill.'
    },
    sound: true,                            // synthesised; starts on the first gesture; desk.sound(false) mutes
    idle: true,                             // a corner breathes when nobody has touched the sheet (off with #calm)
    quality: { grid: 120, shadow: 1024, msaa: 4, texScale: 0 },  // texScale 0 = auto (dpr × 1.5, 2..3)
    seed: 7,
    onAct: null                             // fn(name, info) — 'curl' 'fold' 'crumple' 'burn' 'stain' 'lamp' 'flatten' 'fresh' 'stock'
  };
  function merge(a, b) {
    var o = {}, k;
    for (k in a) o[k] = a[k];
    for (k in b) if (b[k] !== undefined) {
      if (a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) && b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) o[k] = merge(a[k], b[k]);
      else o[k] = b[k];
    }
    return o;
  }
  function hexLin(c) {   // '#rrggbb' or [r,g,b] (linear) → linear [r,g,b]
    if (Array.isArray(c)) return c.slice();
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(c || '#808080'));
    return [1, 2, 3].map(function (i) { return Math.pow(parseInt(m[i], 16) / 255, 2.2); });
  }
  PD.color = hexLin;

  // ================================================================== GLSL
  var HEAD = '#version 300 es\nprecision highp float; precision highp int; precision highp sampler2DShadow;\n';
  // Burn front and stain field. The CPU repeats exactly this (edgeNoise / burnAt below) for picking and particles.
  var FIELDS = [
    'uniform sampler2D uNoise; uniform vec2 uSize; uniform vec4 uBurn[6]; uniform vec4 uStain[6];',
    'float edgeNoise(vec2 p){ return (textureLod(uNoise, p*0.18+vec2(.11,.07), 0.).r-.5)*.42 + (textureLod(uNoise, p*0.75+vec2(.29,.41), 0.).g-.5)*.16; }',
    'float burnField(vec2 p, out float act, out float rad){',
    '  float n = edgeNoise(p), best = -9.; act = 0.; rad = 0.;',
    '  for (int i = 0; i < 6; i++) { vec4 b = uBurn[i]; if (b.z <= 0.) continue;',
    '    float f = b.z - distance(p, b.xy) + n*min(1., b.z*4.); if (f > best) { best = f; act = b.w; rad = b.z; } }',
    '  return best; }',
    // stains: the inside darkens a little; liquid gathers at the edge as it dries, so the rim is darker (coffee ring)
    'float stainField(vec2 p, out float ring){',
    '  float n = (textureLod(uNoise, p*0.42+vec2(.61,.23), 0.).a-.5)*.5 + (textureLod(uNoise, p*1.7+vec2(.17,.83), 0.).b-.5)*.1;',
    '  float inside = 0.; ring = 0.;',
    '  for (int i = 0; i < 6; i++) { vec4 s = uStain[i]; if (s.z <= 0.) continue;',
    '    float f = s.z - distance(p, s.xy) + n*s.z;',
    '    inside = max(inside, smoothstep(-0.004, 0.004, f)*s.w);',
    '    ring = max(ring, (1. - smoothstep(0.0, 0.014 + 0.02*s.z, abs(f - 0.006)))*s.w); }',
    '  return inside; }'
  ].join('\n');
  var LIGHT = [
    'uniform vec3 uCam, uLampPos, uLampDir, uLampCol, uAmbSky, uAmbGround; uniform float uLamp, uCone, uRoomOff, uShadowSoft, uTime;',
    'uniform mat4 uShadowMat; uniform sampler2DShadow uShadow; uniform vec4 uFire[4]; uniform vec3 uFireCol[4];',
    'float hash12(vec2 p){ vec3 q = fract(vec3(p.xyx)*.1031); q += dot(q, q.yzx+33.33); return fract((q.x+q.y)*q.z); }',
    // eight rotated Poisson-ish taps: a soft penumbra that widens with distance from the occluder is faked by uShadowSoft
    'float shadowAt(vec3 wp, vec3 n){',
    '  vec4 s = uShadowMat*vec4(wp + n*0.012, 1.); vec3 q = s.xyz/s.w;',
    '  if (q.x < 0. || q.x > 1. || q.y < 0. || q.y > 1. || q.z > 1.) return 1.;',
    '  float a = hash12(gl_FragCoord.xy)*6.2832, sum = 0.;',
    '  for (int i = 0; i < 8; i++) { float r = sqrt((float(i)+.5)/8.), t = a + float(i)*2.39996;',
    '    sum += texture(uShadow, vec3(q.xy + vec2(cos(t), sin(t))*r*uShadowSoft, q.z - 0.0012)); }',
    '  return sum/8.; }',
    'vec3 lampAt(vec3 wp, out vec3 L){',
    '  vec3 d = uLampPos - wp; float r2 = dot(d, d); L = d*inversesqrt(r2);',
    '  float cone = smoothstep(uCone, mix(uCone, 1., .8), dot(-L, uLampDir));',
    '  return uLampCol*uLamp*(0.05 + 0.95*cone)*(34./(r2 + 6.)); }',
    'vec3 fireAt(vec3 wp, vec3 n){ vec3 c = vec3(0.);',
    '  for (int i = 0; i < 4; i++) { if (uFire[i].w <= 0.) continue; vec3 d = uFire[i].xyz - wp; float r2 = dot(d, d);',
    '    c += uFireCol[i]*uFire[i].w*(0.25 + 0.75*max(dot(n, d*inversesqrt(r2)), 0.))/(0.1 + r2*8.); }',
    '  return c; }',
    'vec3 ambientAt(vec3 n){ return mix(uAmbGround, uAmbSky, n.z*.5+.5)*mix(uRoomOff, 1., uLamp); }'
  ].join('\n');

  var VS_PAPER = HEAD + [
    'layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec2 aUV; layout(location=3) in vec2 aFacet; layout(location=4) in vec4 aCrease;',
    'uniform mat4 uPV; out vec3 vW; out vec3 vN; out vec2 vUV; out vec2 vF; out vec4 vC;',
    'void main(){ vW = aPos; vN = aNor; vUV = aUV; vF = aFacet; vC = aCrease; gl_Position = uPV*vec4(aPos, 1.); }'
  ].join('\n');

  var FS_PAPER = HEAD + FIELDS + '\n' + LIGHT + '\n' + [
    'in vec3 vW; in vec3 vN; in vec2 vUV; in vec2 vF; in vec4 vC; out vec4 o;',
    'uniform sampler2D uDom; uniform float uDomOK, uLaid, uFibre, uSheen, uTooth, uWrinkle, uFacet;',
    'uniform vec3 uTint, uBack, uStainCol, uChar; uniform vec4 uBall;',
    'void main(){',
    '  vec2 p = vUV*uSize; float act, rad; float B = burnField(p, act, rad); if (B > 0.) discard;',
    '  vec3 N = normalize(vN);',
    '  vec3 dx = dFdx(vW), dy = dFdy(vW); vec3 Ng = cross(dx, dy); float gl0 = length(Ng);',
    '  if (gl0 > 1e-12) { Ng /= gl0; if (dot(Ng, N) < 0.) Ng = -Ng; N = normalize(mix(N, Ng, uFacet)); }',
    // fibre tooth: a small bump from the noise gradient (in sheet space; good enough on a gently bent sheet)
    '  float t0 = texture(uNoise, p*6.).b; vec2 g = vec2(texture(uNoise, p*6. + vec2(.003, 0.)).b - t0, texture(uNoise, p*6. + vec2(0., .003)).b - t0);',
    '  N = normalize(N + vec3(g.x, -g.y, 0.)*0.9*uTooth);',
    // fold creases: a thin valley line and a small tilt either side of it
    '  float cr = 0.;',
    '  for (int i = 0; i < 4; i++) { float d = vC[i]; if (abs(d) > 0.05) continue; cr = max(cr, 1. - smoothstep(0., 0.006, abs(d)));',
    '    N = normalize(N + vec3(0., 0., 0.) + sign(d)*0.12*(1. - smoothstep(0., 0.03, abs(d)))*normalize(vec3(dFdx(d), dFdy(d), 0.) + 1e-5)); }',
    '  bool front = gl_FrontFacing; vec3 Ns = front ? N : -N;',
    // the stock: cloudy formation, laid and chain lines, the reverse side shows the ink faintly through
    '  float cloud = texture(uNoise, p*1.9).r, fib = texture(uNoise, p*vec2(0.9, 7.)).a;',
    '  vec3 paper = uTint*(0.955 + uFibre*(0.09*(cloud - .5) + 0.04*(fib - .5)) + 0.02);',
    '  paper *= 1. - uLaid*0.045*smoothstep(0.30, 0.5, abs(fract(p.y*42.) - .5));',
    '  paper *= 1. - uLaid*0.06*(1. - smoothstep(0., 0.012, abs(fract(p.x*3.8) - .5)));',
    '  vec3 alb;',
    '  if (front) { vec3 dom = uDomOK > .5 ? texture(uDom, vUV, -0.4).rgb : vec3(1.); alb = paper*pow(dom, vec3(2.2)); }',
    '  else { float ink = uDomOK > .5 ? 1. - dot(pow(textureLod(uDom, vec2(vUV.x, vUV.y), 2.2).rgb, vec3(2.2)), vec3(.3, .6, .1)) : 0.;',
    '         alb = uBack*(0.96 + uFibre*0.08*(cloud - .5))*(1. - 0.14*ink); }',
    // crumple: ridges catch light, valleys and the sheltered underside darken; creases from folding
    '  float ridge = clamp(vF.y, -1., 1.)*uWrinkle; alb *= 1. + 0.10*ridge; alb *= 1. - 0.22*cr;',
    '  { float bd = distance(vW, uBall.xyz)/max(uBall.w, 1e-3); alb *= 1. - uFacet*0.45*smoothstep(1.05, 0.7, bd); }',
    // stains
    '  float ring; float st = stainField(p, ring); alb *= mix(vec3(1.), uStainCol*0.82, 0.6*st); alb *= mix(vec3(1.), uStainCol*uStainCol*0.6, 0.5*ring);',
    // the burn: toast → brown → char → glowing rim, the bands wobble with the fibre
    '  float bs = clamp(rad*3.2, 0.3, 1.), Bn = B + (fib - .5)*0.06*bs + (cloud - .5)*0.05;',
    '  alb = mix(alb, alb*vec3(0.78, 0.58, 0.36), smoothstep(-0.26*bs, -0.07*bs, Bn)*0.8);',
    '  alb = mix(alb, uChar*3., smoothstep(-0.16*bs, -0.06*bs, Bn)*0.9);',
    '  alb = mix(alb, uChar, smoothstep(-0.09*bs, -0.03*bs, Bn));',
    '  vec3 L; vec3 lc = lampAt(vW, L); float ndl = dot(Ns, L); float sh = shadowAt(vW, Ns);',
    // paper is thin: light from behind comes through, warmer
    '  vec3 col = alb*(ambientAt(Ns) + lc*sh*(max(ndl, 0.) + max(-ndl, 0.)*0.42*vec3(1., .9, .76)) + fireAt(vW, Ns) + fireAt(vW, -Ns)*0.3);',
    '  vec3 V = normalize(uCam - vW), H = normalize(L + V); col += lc*sh*pow(max(dot(Ns, H), 0.), 18.)*0.05*uSheen*(1. - smoothstep(-0.1, -0.03, Bn));',
    // the glowing rim breaks into flickering embers along the front
    '  float fl = texture(uNoise, p*2.7 + vec2(uTime*.27, -uTime*.21)).r*texture(uNoise, p*6.1 - vec2(uTime*.41, uTime*.12)).g*4.;',
    '  float brk = smoothstep(0.32, 0.9, fl); float e = smoothstep(-0.032, -0.004, B), hot = smoothstep(-0.010, -0.001, B);',
    '  col += (vec3(3.0, 0.55, 0.06)*e*e*brk + vec3(4.4, 2.2, 0.6)*hot*brk)*(0.12 + 0.88*act)*2.;',
    '  o = vec4(col, 1.);',
    '}'
  ].join('\n');

  // depth from the lamp (shadow map) and the top-down contact pass share one shader; burned holes cast no shadow
  var VS_DEPTH = HEAD + [
    'layout(location=0) in vec3 aPos; layout(location=2) in vec2 aUV; uniform mat4 uPV; out vec3 vW; out vec2 vUV;',
    'void main(){ vW = aPos; vUV = aUV; gl_Position = uPV*vec4(aPos, 1.); }'
  ].join('\n');
  var FS_DEPTH = HEAD + FIELDS + '\n' + [
    'in vec3 vW; in vec2 vUV; out vec4 o; uniform float uIsPaper;',
    'void main(){ if (uIsPaper > .5) { float a, r; if (burnField(vUV*uSize, a, r) > 0.) discard; } o = vec4(exp(-max(vW.z - 0.004, 0.)*6.)); }'
  ].join('\n');

  var VS_DESK = HEAD + [
    'layout(location=0) in vec3 aPos; uniform mat4 uPV; out vec3 vW;',
    'void main(){ vW = aPos; gl_Position = uPV*vec4(aPos, 1.); }'
  ].join('\n');
  var FS_DESK = HEAD + FIELDS + '\n' + LIGHT + '\n' + [
    'in vec3 vW; out vec4 o; uniform sampler2D uAO; uniform int uKind; uniform vec3 uDeskA, uDeskB; uniform float uDeskScale, uGloss, uPlank, uGrain;',
    'vec3 surface(vec2 p, out vec3 bump, out float gloss){',
    '  float f = uDeskScale; bump = vec3(0.); gloss = uGloss; vec3 c;',
    '  if (uKind == 0) {',   // felt / baize: mottled fibres
    '    float n1 = texture(uNoise, p*1.2*uGrain).b, n2 = texture(uNoise, p*vec2(2.5, .9)*uGrain + .37).b, n3 = texture(uNoise, p*vec2(.8, 2.6)*uGrain + .61).b;',
    '    float m = texture(uNoise, p*0.06*f + .2).r, m2 = texture(uNoise, p*0.25*f + .6).g;',
    '    c = mix(uDeskA, uDeskB, clamp(.5 + (m - .5) + .5*(m2 - .5), 0., 1.))*(0.66 + 0.68*(n1 + n2 + n3)/3.);',
    '    bump = vec3(n2 - .5, n3 - .5, 0.)*0.3;',
    '  } else if (uKind == 1) {',   // wood: planks, rings warped by noise, pores along the grain
    '    float pi = floor(p.x/uPlank + .5); float off = fract(sin(pi*12.9898)*43758.5453);',
    '    vec2 q = vec2(p.x - pi*uPlank, p.y + off*7.);',
    '    float w = (texture(uNoise, q*vec2(.10, .012)*f + off).r - .5)*2.2 + (texture(uNoise, q*vec2(.4, .03)*f).g - .5)*0.6;',
    '    float ring = fract(q.x*5.5*f + w); float late = smoothstep(0.5, 0.92, ring)*smoothstep(1., .95, ring);',
    '    float pores = texture(uNoise, q*vec2(1.6, 0.06)*f*uGrain).b;',
    '    c = mix(uDeskB, uDeskA, clamp(late*.8 + (pores - .5)*.6 + .15, 0., 1.))*(0.85 + 0.3*texture(uNoise, q*.05).a);',
    '    float seam = 1. - smoothstep(0.004, 0.012, abs(p.x - (pi + .5)*uPlank)); c *= 1. - 0.6*seam;',
    '    bump = vec3((pores - .5)*0.25, 0., 0.); gloss *= 1. - 0.5*late;',
    '  } else if (uKind == 2) {',   // leather: pebbled grain
    '    float a = texture(uNoise, p*3.5*uGrain).b, b = texture(uNoise, p*7.*uGrain + .3).b, m = texture(uNoise, p*.1*f).r;',
    '    float peb = smoothstep(.35, .75, a)*.7 + smoothstep(.4, .8, b)*.3;',
    '    c = mix(uDeskA, uDeskB, clamp(m*1.2 - .1 + peb*.3, 0., 1.)); bump = vec3(a - .5, b - .5, 0.)*0.5; gloss *= 0.6 + 0.6*peb;',
    '  } else {',                  // laminate / lino: flat colour, fine speckle
    '    float s = texture(uNoise, p*9.*uGrain).b, m = texture(uNoise, p*.08*f).r;',
    '    c = mix(uDeskA, uDeskB, clamp(m, 0., 1.))*(0.94 + 0.12*s); bump = vec3(s - .5, 0., 0.)*0.06;',
    '  }',
    '  return c; }',
    'void main(){',
    '  vec2 p = vW.xy; vec3 bump; float gloss; vec3 c = surface(p, bump, gloss);',
    '  vec3 N = normalize(vec3(0., 0., 1.) + bump);',
    '  vec3 L; vec3 lc = lampAt(vW, L); float sh = mix(0.12, 1., shadowAt(vW, vec3(0., 0., 1.)));',
    // contact shadow: the top-down coverage, blurred by its mip chain, darkens the desk under the sheet and the props
    '  vec2 auv = p/8. + .5; float a0 = textureLod(uAO, auv, 0.).r, a1 = textureLod(uAO, auv, 1.5).r, a2 = textureLod(uAO, auv, 3.).r, a3 = textureLod(uAO, auv, 4.5).r;',
    '  float ao = max(0.08, 1. - 0.30*a0 - 0.28*a1 - 0.24*a2 - 0.16*a3);',
    '  vec3 V = normalize(uCam - vW), H = normalize(L + V);',
    '  vec3 col = c*(ambientAt(N)*ao + lc*max(dot(N, L), 0.)*sh*ao) + c*fireAt(vW, N)*ao*1.6;',
    '  col += lc*sh*ao*gloss*(pow(max(dot(N, H), 0.), 40.)*0.25 + pow(max(dot(N, H), 0.), 6.)*0.02);',
    '  col *= 1. - smoothstep(6., 14., length(p));',
    '  o = vec4(col, 1.);',
    '}'
  ].join('\n');

  var VS_PROP = HEAD + [
    'layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec3 aCol; layout(location=3) in vec3 aMat;',
    'uniform mat4 uPV; out vec3 vW; out vec3 vN; out vec3 vCol; out vec3 vMat;',
    'void main(){ vW = aPos; vN = aNor; vCol = aCol; vMat = aMat; gl_Position = uPV*vec4(aPos, 1.); }'
  ].join('\n');
  var FS_PROP = HEAD + 'uniform sampler2D uNoise;\n' + LIGHT + '\n' + [
    'in vec3 vW; in vec3 vN; in vec3 vCol; in vec3 vMat; out vec4 o;',
    'void main(){',
    '  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N; vec3 V = normalize(uCam - vW);',
    '  float rough = clamp(vMat.x, 0.04, 1.), metal = vMat.y;',
    '  vec3 alb = vCol*(0.94 + 0.12*texture(uNoise, vW.xy*1.7 + vW.z).b);',
    '  vec3 L; vec3 lc = lampAt(vW, L); float sh = shadowAt(vW, N); float ndl = max(dot(N, L), 0.);',
    '  vec3 H = normalize(L + V); float nh = max(dot(N, H), 0.), a = rough*rough, a2 = a*a;',
    '  float D = a2/(3.14159*pow(nh*nh*(a2 - 1.) + 1., 2.));',
    '  vec3 F0 = mix(vec3(0.04), alb, metal); vec3 F = F0 + (1. - F0)*pow(1. - max(dot(V, H), 0.), 5.);',
    '  vec3 fr = F0 + (1. - F0)*pow(1. - max(dot(N, V), 0.), 5.)*(1. - rough);',
    '  float ground = mix(0.45, 1., smoothstep(0., 0.15, vW.z));',
    '  vec3 col = alb*(1. - metal)*(ambientAt(N)*ground + lc*ndl*sh + fireAt(vW, N));',
    '  col += lc*sh*ndl*min(D, 60.)*F*0.25 + (ambientAt(reflect(-V, N))*1.6 + fireAt(vW, N)*0.5)*fr*mix(1., 2.2, metal)*mix(vec3(1.), alb, metal);',
    '  col += vCol*vMat.z;',   // emissive (a flame, a screen)
    '  o = vec4(col, 1.);',
    '}'
  ].join('\n');

  // points: embers (additive, alpha 0) and smoke / ash (alpha) with premultiplied blending
  var VS_PART = HEAD + [
    'layout(location=0) in vec3 aPos; layout(location=1) in vec4 aCol; layout(location=2) in float aSize;',
    'uniform mat4 uPV; uniform float uPScale; out vec4 vCol;',
    'void main(){ gl_Position = uPV*vec4(aPos, 1.); gl_PointSize = clamp(aSize*uPScale/gl_Position.w, 1., 200.); vCol = aCol; }'
  ].join('\n');
  var FS_PART = HEAD + [
    'in vec4 vCol; out vec4 o;',
    'void main(){ vec2 q = gl_PointCoord*2. - 1.; float r = dot(q, q); if (r > 1.) discard; float a = (1. - r); a *= a;',
    '  if (vCol.a < 0.) o = vec4(vCol.rgb*a, 0.); else o = vec4(vCol.rgb*a*vCol.a, a*vCol.a); }'
  ].join('\n');

  // post: bright pass + downsample, separable blur, composite (bloom, ACES fit, vignette, dither)
  var FS_DOWN = HEAD + 'in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform vec2 uTexel; uniform float uThresh;\n' +
    'void main(){ vec3 c = vec3(0.); for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) { vec3 s = min(texture(uTex, vUv + (vec2(i, j) - .5)*uTexel).rgb, vec3(30.)); c += max(s - uThresh, 0.); } o = vec4(c*.25, 1.); }';
  var FS_BLUR = HEAD + 'in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform vec2 uDir;\n' +
    'void main(){ vec3 c = texture(uTex, vUv).rgb*.227; c += (texture(uTex, vUv + uDir*1.385).rgb + texture(uTex, vUv - uDir*1.385).rgb)*.316; c += (texture(uTex, vUv + uDir*3.231).rgb + texture(uTex, vUv - uDir*3.231).rgb)*.070; o = vec4(c, 1.); }';
  var FS_COMP = HEAD + [
    'in vec2 vUv; out vec4 o; uniform sampler2D uScene, uB1, uB2; uniform float uExpo, uBloom, uVig, uGrainAmt, uTime; uniform vec2 uRes;',
    'float hash12(vec2 p){ vec3 q = fract(vec3(p.xyx)*.1031); q += dot(q, q.yzx+33.33); return fract((q.x+q.y)*q.z); }',
    'void main(){',
    '  vec3 c = texture(uScene, vUv).rgb + (texture(uB1, vUv).rgb*.9 + texture(uB2, vUv).rgb*1.1)*uBloom;',
    '  vec2 q = vUv - .5; q.x *= uRes.x/uRes.y*.8; c *= 1. - smoothstep(.4, 1.05, length(q))*uVig;',
    '  c *= uExpo; c = clamp(c*(2.51*c + .03)/(c*(2.43*c + .59) + .14), 0., 1.); c = pow(c, vec3(1./2.2));',
    '  c += (hash12(gl_FragCoord.xy + fract(uTime)*97.3) - .5)/255.*2.*uGrainAmt;',
    '  o = vec4(c, 1.); }'
  ].join('\n');

  // ================================================================== value noise, shared by CPU and GPU
  // One 256² RGBA texture of tiling fbm. The CPU samples it exactly as the GPU does (bilinear, repeat, level 0), so the
  // burn front the shader cuts and the front the picker / embers use are the same curve.
  var NN = 256;
  function makeNoise(seed) {
    var rnd = HIC.rng(seed), data = new Uint8Array(NN * NN * 4);
    function layer(per) {
      var g = new Float32Array(per * per); for (var i = 0; i < g.length; i++) g[i] = rnd();
      return function (x, y) {
        var fx = x * per / NN, fy = y * per / NN, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
        tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        var x0 = ix % per, x1 = (ix + 1) % per, y0 = iy % per, y1 = (iy + 1) % per;
        var a = g[y0 * per + x0], b = g[y0 * per + x1], c = g[y1 * per + x0], d = g[y1 * per + x1];
        return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
      };
    }
    function fbm(p0, oct) { var ls = []; for (var o = 0; o < oct; o++) ls.push(layer(p0 << o)); return function (x, y) { var s = 0, a = 0.5, n = 0; for (var i = 0; i < ls.length; i++) { s += ls[i](x, y) * a; n += a; a *= 0.5; } return s / n; }; }
    var ch = [fbm(8, 4), fbm(16, 3), fbm(64, 2), fbm(32, 3)];
    for (var c = 0; c < 4; c++) {
      var tmp = new Float32Array(NN * NN), mn = 9, mx = -9;
      for (var y = 0; y < NN; y++) for (var x = 0; x < NN; x++) { var v = ch[c](x, y); tmp[y * NN + x] = v; if (v < mn) mn = v; if (v > mx) mx = v; }
      for (var i = 0; i < NN * NN; i++) data[i * 4 + c] = Math.round((tmp[i] - mn) / (mx - mn) * 255);
    }
    return data;
  }
  function sampler(data) {
    return function (c, x, y) {
      var fx = x * NN - 0.5, fy = y * NN - 0.5, ix = Math.floor(fx), iy = Math.floor(fy); fx -= ix; fy -= iy;
      var x0 = ((ix % NN) + NN) % NN, y0 = ((iy % NN) + NN) % NN, x1 = (x0 + 1) % NN, y1 = (y0 + 1) % NN;
      var a = data[(y0 * NN + x0) * 4 + c], b = data[(y0 * NN + x1) * 4 + c], d0 = data[(y1 * NN + x0) * 4 + c], d1 = data[(y1 * NN + x1) * 4 + c];
      return (a + (b - a) * fx + (d0 - a) * fy + (a - b - d0 + d1) * fx * fy) / 255;
    };
  }

  // ================================================================== crumple facets
  // A piecewise-linear height field: random heights on a jittered grid, each cell split into two flat triangles. Summed
  // at three scales and rotations it is still made of flat facets with straight creases, which is what crumpled paper is.
  function ihash(a, b, k) { var h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(k, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function facets(px, py, ang, cell, seed) {
    var ca = Math.cos(ang), sa = Math.sin(ang), cx = (px * ca - py * sa) / cell + 50, cy = (px * sa + py * ca) / cell + 50;
    var ix = Math.floor(cx), iy = Math.floor(cy);
    function P(a, b) { return [a + 0.5 + (ihash(a, b, seed) - 0.5) * 0.6, b + 0.5 + (ihash(a, b, seed + 1) - 0.5) * 0.6, ihash(a, b, seed + 2)]; }
    function side(A, B, x, y) { return (B[0] - A[0]) * (y - A[1]) - (B[1] - A[1]) * (x - A[0]); }
    for (var j = -1; j <= 0; j++) for (var i = -1; i <= 0; i++) {
      var a = ix + i, b = iy + j, p00 = P(a, b), p10 = P(a + 1, b), p01 = P(a, b + 1), p11 = P(a + 1, b + 1);
      var tris = ihash(a, b, seed + 3) < 0.5 ? [[p00, p10, p11], [p00, p11, p01]] : [[p00, p10, p01], [p10, p11, p01]];
      for (var t = 0; t < 2; t++) {
        var A = tris[t][0], Bq = tris[t][1], C = tris[t][2], ar = side(A, Bq, C[0], C[1]);
        if (Math.abs(ar) < 1e-9) continue;
        var w0 = side(Bq, C, cx, cy) / ar, w1 = side(C, A, cx, cy) / ar, w2 = 1 - w0 - w1;
        if (w0 >= -1e-6 && w1 >= -1e-6 && w2 >= -1e-6) return w0 * A[2] + w1 * Bq[2] + w2 * C[2];
      }
    }
    return 0.5;
  }

  // ================================================================== props: a tiny mesh kit
  // B.lathe(profile [[r, z]...], segments, colour, mat) · B.box(w, d, h, colour, mat) · B.surface(fn(u, v) → [p, n], nu, nv, colour, mat)
  // all in local space (z up, base on z = 0); B.push(matrix) / B.pop() transform what follows. mat = [roughness, metal, emissive].
  function builder() {
    var pos = [], nor = [], col = [], mat = [], idx = [], stack = [M4.ident()];
    function top() { return stack[stack.length - 1]; }
    function xp(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; }
    function xn(m, n) { var v = [m[0] * n[0] + m[4] * n[1] + m[8] * n[2], m[1] * n[0] + m[5] * n[1] + m[9] * n[2], m[2] * n[0] + m[6] * n[1] + m[10] * n[2]]; return HIC.vec.norm(v); }
    var B = {
      vert: function (p, n, c, m) { var t = top(), q = xp(t, p), nn = xn(t, n); pos.push(q[0], q[1], q[2]); nor.push(nn[0], nn[1], nn[2]); col.push(c[0], c[1], c[2]); mat.push(m[0], m[1], m[2] || 0); return pos.length / 3 - 1; },
      tri: function (a, b, c) { idx.push(a, b, c); },
      quad: function (a, b, c, d) { idx.push(a, b, c, a, c, d); },
      push: function (m) { stack.push(M4.mul(top(), m)); return B; },
      pop: function () { if (stack.length > 1) stack.pop(); return B; },
      surface: function (fn, nu, nv, c, m) {
        var rows = [];
        for (var j = 0; j <= nv; j++) { var r = []; for (var i = 0; i <= nu; i++) { var s = fn(i / nu, j / nv); r.push(B.vert(s[0], s[1], c, m)); } rows.push(r); }
        for (j = 0; j < nv; j++) for (i = 0; i < nu; i++) B.quad(rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]);
      },
      lathe: function (prof, seg, c, m) {
        var n = prof.length;
        B.surface(function (u, v) {
          var k = Math.min(n - 1, Math.round(v * (n - 1))), a = u * Math.PI * 2, P = prof[k];
          var p0 = prof[Math.max(0, k - 1)], p1 = prof[Math.min(n - 1, k + 1)], dr = p1[0] - p0[0], dz = p1[1] - p0[1], l = Math.hypot(dr, dz) || 1;
          var nr = dz / l, nz = -dr / l;
          return [[P[0] * Math.cos(a), P[0] * Math.sin(a), P[1]], [nr * Math.cos(a), nr * Math.sin(a), nz]];
        }, seg, n - 1, c, m);
      },
      box: function (w, d, h, c, m) {
        var x = w / 2, y = d / 2, F = [[[0, 0, 1], [-x, -y, h], [x, -y, h], [x, y, h], [-x, y, h]], [[0, 0, -1], [-x, y, 0], [x, y, 0], [x, -y, 0], [-x, -y, 0]],
          [[1, 0, 0], [x, -y, 0], [x, y, 0], [x, y, h], [x, -y, h]], [[-1, 0, 0], [-x, y, 0], [-x, -y, 0], [-x, -y, h], [-x, y, h]],
          [[0, 1, 0], [x, y, 0], [-x, y, 0], [-x, y, h], [x, y, h]], [[0, -1, 0], [-x, -y, 0], [x, -y, 0], [x, -y, h], [-x, -y, h]]];
        F.forEach(function (f) { var a = B.vert(f[1], f[0], c, m), b = B.vert(f[2], f[0], c, m), cc = B.vert(f[3], f[0], c, m), d4 = B.vert(f[4], f[0], c, m); B.quad(a, b, cc, d4); });
      },
      // a cylinder lying along x, from x0 to x1, radius r (a pen body); sides only, plus flat end caps
      rod: function (x0, x1, r, seg, c, m, caps) {
        B.surface(function (u, v) { var a = u * Math.PI * 2; return [[mix(x0, x1, v), r * Math.cos(a), r * Math.sin(a)], [0, Math.cos(a), Math.sin(a)]]; }, seg, 1, c, m);
        if (caps !== false) [x0, x1].forEach(function (x, k) { var s = k ? 1 : -1, c0 = B.vert([x, 0, 0], [s, 0, 0], c, m), ring = []; for (var i = 0; i <= seg; i++) { var a = i / seg * Math.PI * 2; ring.push(B.vert([x, r * Math.cos(a), r * Math.sin(a)], [s, 0, 0], c, m)); } for (i = 0; i < seg; i++) B.tri(c0, ring[i], ring[i + 1]); });
      },
      flames: [], lights: [],
      data: function () { return { pos: new Float32Array(pos), nor: new Float32Array(nor), col: new Float32Array(col), mat: new Float32Array(mat), idx: new Uint32Array(idx) }; }
    };
    return B;
  }
  var R = { matte: [0.85, 0, 0], satin: [0.45, 0, 0], gloss: [0.18, 0, 0], metal: [0.3, 1, 0], brass: [0.28, 1, 0], glass: [0.06, 0, 0] };
  PD.MAT = R;
  // Each prop draws itself in local space (1 unit = 10 cm; z up; base at z = 0). o: the prop's entry from cfg.props.
  PD.PROPS = {
    mug: function (B, o) {
      var c = hexLin(o.color || '#e8e2d6'), f = hexLin(o.fill || '#2a1406'), r = 0.4, h = 0.92;
      B.lathe([[0, 0], [r - 0.03, 0], [r, 0.03], [r, h], [r - 0.035, h + 0.012], [r - 0.045, h], [r - 0.045, 0.1], [0, 0.1]], 40, c, R.gloss);
      if (o.fill !== false) B.lathe([[0, h - 0.13], [r - 0.045, h - 0.13]], 40, f, [0.08, 0, 0]);
      B.push(M4.translate(r + 0.02, 0, h * 0.52)).push(M4.rotX(Math.PI / 2));
      B.surface(function (u, v) { var a = -Math.PI / 2 + u * Math.PI, b = v * Math.PI * 2, R0 = 0.24, r0 = 0.05, cx = Math.cos(a), sx = Math.sin(a);
        return [[cx * (R0 + r0 * Math.cos(b)) - 0.02, sx * (R0 + r0 * Math.cos(b)), r0 * Math.sin(b)], [cx * Math.cos(b), sx * Math.cos(b), Math.sin(b)]]; }, 20, 10, c, R.gloss);
      B.pop().pop();
    },
    inkwell: function (B, o) {
      var c = hexLin(o.color || '#1d2a3a'), k = hexLin(o.ink || '#0a0d1a');
      B.lathe([[0, 0], [0.30, 0], [0.33, 0.04], [0.33, 0.26], [0.27, 0.34], [0.13, 0.38], [0.12, 0.46], [0.14, 0.48], [0.14, 0.52], [0.10, 0.52], [0.10, 0.4], [0, 0.4]], 36, c, R.glass);
      B.lathe([[0, 0.42], [0.1, 0.42]], 24, k, [0.05, 0, 0]);
    },
    pen: function (B, o) {   // a fountain pen lying on the desk, along x
      var c = hexLin(o.color || '#14161c'), m = hexLin(o.trim || '#c9a55a'), L = (o.length || 1.4), r = 0.05;
      B.push(M4.translate(-L / 2, 0, r));
      B.rod(0, L * 0.55, r, 20, c, R.gloss); B.rod(L * 0.55, L * 0.58, r * 1.04, 20, m, R.brass, false); B.rod(L * 0.58, L * 0.86, r * 0.92, 20, c, R.gloss);
      B.surface(function (u, v) { var a = u * Math.PI * 2, rr = r * 0.85 * (1 - v); return [[L * 0.86 + v * L * 0.12, rr * Math.cos(a), rr * Math.sin(a)], [0.3, Math.cos(a), Math.sin(a)]]; }, 16, 1, m, R.brass);
      B.push(M4.translate(L * 0.24, 0, r * 1.6)); B.box(L * 0.3, 0.016, 0.014, m, R.brass); B.pop();
      B.pop();
    },
    pencil: function (B, o) {
      var c = hexLin(o.color || '#e3b21c'), L = o.length || 1.6, r = 0.04, wood = hexLin('#d8b58a'), lead = hexLin('#2b2b2e');
      B.push(M4.translate(-L / 2, 0, r));
      B.surface(function (u, v) { var a = Math.floor(u * 6) / 6 * Math.PI * 2 + (u * 6 % 1 > 0.5 ? Math.PI / 3 : 0); var aa = u * Math.PI * 2; return [[v * L * 0.86, r * Math.cos(Math.round(aa / (Math.PI / 3)) * Math.PI / 3), r * Math.sin(Math.round(aa / (Math.PI / 3)) * Math.PI / 3)], [0, Math.cos(a), Math.sin(a)]]; }, 6, 1, c, R.satin);
      B.surface(function (u, v) { var a = u * Math.PI * 2, rr = r * (1 - v); return [[L * 0.86 + v * L * 0.12, rr * Math.cos(a), rr * Math.sin(a)], [0.3, Math.cos(a), Math.sin(a)]]; }, 12, 1, wood, R.matte);
      B.surface(function (u, v) { var a = u * Math.PI * 2, rr = r * 0.3 * (1 - v); return [[L * 0.955 + v * L * 0.04, rr * Math.cos(a), rr * Math.sin(a)], [0.3, Math.cos(a), Math.sin(a)]]; }, 8, 1, lead, R.satin);
      B.rod(-0.08, 0, r * 1.02, 14, hexLin('#b8b8b0'), R.metal, false); B.rod(-0.16, -0.08, r, 14, hexLin(o.eraser || '#e58a8a'), R.matte);
      B.pop();
    },
    candle: function (B, o) {   // a brass dish and a candle; o.lit adds a flame and a flickering light
      var dish = hexLin(o.dish || '#b08a3e'), wax = hexLin(o.color || '#efe6cf'), h = o.height || 0.7;
      B.lathe([[0, 0], [0.34, 0], [0.36, 0.05], [0.33, 0.07], [0.12, 0.06], [0.12, 0.16], [0, 0.16]], 32, dish, R.brass);
      B.lathe([[0, 0.12], [0.1, 0.12], [0.1, 0.12 + h], [0.085, 0.12 + h + 0.015], [0, 0.12 + h + 0.005]], 28, wax, [0.55, 0, 0]);
      B.box(0.012, 0.012, 0.18 + h, hexLin('#1a1410'), R.matte);
      if (o.lit !== false) { B.flames.push([0, 0, 0.12 + h + 0.09]); B.lights.push([0, 0, 0.12 + h + 0.16]); }
    },
    coin: function (B, o) { B.lathe([[0, 0], [0.12, 0], [0.125, 0.01], [0.12, 0.02], [0, 0.02]], 28, hexLin(o.color || '#c9a55a'), R.brass); },
    seal: function (B, o) {   // a wax seal: an irregular blob with a raised rim
      var c = hexLin(o.color || '#8e1b1b');
      B.lathe([[0, 0.035], [0.08, 0.034], [0.1, 0.045], [0.12, 0.04], [0.16, 0.02], [0.17, 0], [0, 0]].reverse(), 36, c, [0.35, 0, 0]);
    },
    book: function (B, o) {
      var c = hexLin(o.color || '#3a2418'), pg = hexLin(o.pages || '#e9dfc8'), w = o.w || 1.5, d = o.d || 2.1, h = o.h || 0.32;
      B.box(w, d, 0.03, c, R.satin); B.push(M4.translate(0.02, 0, 0.03)); B.box(w - 0.06, d - 0.08, h - 0.06, pg, R.matte); B.pop();
      B.push(M4.translate(0, 0, h - 0.03)); B.box(w, d, 0.03, c, R.satin); B.pop();
      B.push(M4.translate(-w / 2 + 0.02, 0, 0)); B.box(0.04, d, h, c, R.satin); B.pop();
    },
    block: function (B, o) { B.box(o.w || 0.6, o.d || 0.3, o.h || 0.2, hexLin(o.color || '#808080'), o.mat || R.satin); },
    clip: function (B, o) {   // a paperclip, flat on the desk
      var c = hexLin(o.color || '#b9bcc2'), r = 0.007, pts = [[0, 0], [0.3, 0], [0.3, 0.09], [0.04, 0.09], [0.04, 0.025], [0.25, 0.025]];
      for (var i = 0; i < pts.length - 1; i++) { var a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        B.push(M4.mul(M4.translate(a[0], a[1], r), M4.rotZ(ang))); B.rod(0, L, r, 8, c, R.metal); B.pop(); }
    }
  };

  // ================================================================== sound (Web Audio, synthesised, starts on a gesture)
  function makeSound() {
    var A = { on: true, ctx: null };
    A.start = function () {
      if (A.ctx || !A.on) return;
      var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return;
      try {
        var c = A.ctx = new AC(), n = c.sampleRate * 2, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0), rnd = HIC.rng(91), b = 0;
        for (var i = 0; i < n; i++) { var w = rnd() * 2 - 1; b = b * 0.97 + w * 0.2; d[i] = w * 0.55 + b * 0.45; }
        A.buf = buf; A.master = c.createGain(); A.master.gain.value = 0.55; A.master.connect(c.destination);
        A.rustle = A.loop('bandpass', 2600, 0.7); A.fire = A.loop('lowpass', 480, 0.4);
      } catch (e) { A.ctx = null; }
    };
    A.loop = function (type, f, q) {
      var c = A.ctx, s = c.createBufferSource(); s.buffer = A.buf; s.loop = true;
      var fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      var g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(A.master); s.start(0, 0.37); return g;
    };
    A.level = function (g, v, tc) { if (A.ctx && g) g.gain.setTargetAtTime(A.on ? v : 0, A.ctx.currentTime, tc || 0.05); };
    // a filtered noise burst: crease snaps, crackles, the swish of a fresh sheet
    A.burst = function (f, dur, vol, type, q, f2) {
      if (!A.ctx || !A.on) return;
      var c = A.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = A.buf;
      var fl = c.createBiquadFilter(); fl.type = type || 'bandpass'; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q || 1;
      var g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
      s.connect(fl); fl.connect(g); g.connect(A.master); s.start(t, (t * 7.3) % 1.5, dur + 0.05);
    };
    A.tone = function (f, f2, dur, vol, type) {   // a pitched blip: a drip, a lamp switch's click body
      if (!A.ctx || !A.on) return;
      var c = A.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur); o.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur + 0.02);
    };
    A.set = function (on) { A.on = !!on; if (A.on) A.start(); else { A.level(A.rustle, 0); A.level(A.fire, 0); } };
    return A;
  }

  // ================================================================== the desk
  PD.create = function (opts) {
    var cfg = merge(DEFAULTS, opts || {});
    if (HIC.param('q') === 'low') cfg.quality = merge(cfg.quality, { msaa: 0, grid: Math.min(cfg.quality.grid, 90), shadow: 512 });
    var canvas = cfg.canvas, sheet = cfg.sheet;
    if (!HIC.supported('webgl')) return stub(HIC.fallback(canvas, { note: cfg.fallbackNote }));
    var S = HIC.stage(canvas, { gl: { antialias: false, alpha: false }, maxDpr: 2 });
    var gl = S.gl;
    if (!gl) return stub(HIC.fallback(canvas, { note: cfg.fallbackNote }));
    var rnd = HIC.rng(cfg.seed);

    // ---- sizes: the sheet is EW × EH CSS px; in the world it is W wide (1 unit = 10 cm, so an A4 sheet is 2.1)
    var EW = sheet.offsetWidth, EH = sheet.offsetHeight;
    var W = cfg.sheetWidth || 2.1, H = W * EH / EW;
    var NX = Math.max(24, Math.round(cfg.quality.grid)), NY = Math.max(24, Math.round(NX * H / W)), VX = NX + 1, VY = NY + 1, NV = VX * VY;
    var Z0 = 0.004;
    var stockOf = function (s) { return typeof s === 'string' ? (PD.STOCKS[s] || PD.STOCKS.wove) : merge(PD.STOCKS.wove, s || {}); };
    var deskOf = function (d) { return typeof d === 'string' ? (PD.DESKS[d] || PD.DESKS.felt) : merge(PD.DESKS.felt, d || {}); };
    var acts = cfg.acts;
    function actOn(n) { return !!acts[n]; }
    function actOpt(n, k, dflt) { var a = acts[n]; return a && typeof a === 'object' && a[k] !== undefined ? a[k] : dflt; }

    // ---- state (everything the frame reads; the page can read desk.state)
    var st = {
      tool: 'type', clock: 0, touched: false,
      stock: stockOf(cfg.stock), stockName: typeof cfg.stock === 'string' ? cfg.stock : 'custom',
      tint: null, back: null, gsm: 90, stiff: 0.125,
      lamp: cfg.lamp.on ? 1 : 0, lampT: cfg.lamp.on ? 1 : 0,
      folds: [], creases: 0, unfolding: false, restK: 1,
      wrinkle: 0, wrinkleT: null, cr: 0, crHold: false, crC: [0, 0], crPeak: 0, crFreeze: false,
      burns: [], stains: [], slide: 0, slideRot: 0, sliding: null, ready: false
    };
    st.tint = st.stock.tint.slice(); st.back = st.stock.back.slice();
    st.gsm = cfg.gsm || st.stock.gsm || 90; st.stiff = clamp((st.gsm - 40) / 260, 0, 1);
    var peel = { on: false, g: [0, 0], m: [0, 0], v: [0, 0], mt: [0, 0], r: 0.2, kind: 'curl', drag: false, hint: false };
    var geomDirty = true, spDirty = true, placeDirty = true;

    // ---- noise
    var noiseData = makeNoise(cfg.seed * 7 + 1), noise = sampler(noiseData);
    var T = {};
    T.noise = HIC.gl.texture(gl, { w: NN, h: NN, data: noiseData, wrap: 'repeat', mips: true });
    gl.bindTexture(gl.TEXTURE_2D, T.noise); gl.generateMipmap(gl.TEXTURE_2D);
    function edgeNoise(x, y) { return (noise(0, x * 0.18 + 0.11, y * 0.18 + 0.07) - 0.5) * 0.42 + (noise(1, x * 0.75 + 0.29, y * 0.75 + 0.41) - 0.5) * 0.16; }
    function burnAt(x, y, list) { var n = edgeNoise(x, y), b = -9; for (var i = 0; i < list.length; i++) { var q = list[i]; var f = q[2] - Math.hypot(x - q[0], y - q[1]) + n * Math.min(1, q[2] * 4); if (f > b) b = f; } return b; }

    // ---- programs
    var P = {
      paper: HIC.gl.program(gl, VS_PAPER, FS_PAPER), depth: HIC.gl.program(gl, VS_DEPTH, FS_DEPTH), desk: HIC.gl.program(gl, VS_DESK, FS_DESK),
      prop: HIC.gl.program(gl, VS_PROP, FS_PROP), part: HIC.gl.program(gl, VS_PART, FS_PART),
      down: HIC.gl.program(gl, null, FS_DOWN), blur: HIC.gl.program(gl, null, FS_BLUR), comp: HIC.gl.program(gl, null, FS_COMP)
    };
    function U(prog, name) { return prog.u[name]; }
    function setF(prog, name) { var l = prog.u[name]; if (!l) return; var a = [].slice.call(arguments, 2); gl['uniform' + a.length + 'f'].apply(gl, [l].concat(a)); }
    function setM(prog, name, m) { var l = prog.u[name]; if (l) gl.uniformMatrix4fv(l, false, m); }
    function setT(prog, name, unit, tex) { var l = prog.u[name]; if (!l) return; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(l, unit); }

    // ---- the paper grid
    var PP = new Float32Array(NV * 3), PN = new Float32Array(NV * 3), PUV = new Float32Array(NV * 2), PF = new Float32Array(NV * 2), PC = new Float32Array(NV * 4).fill(9);
    var REST = new Float32Array(NV), HF = new Float32Array(NV), J1 = new Float32Array(NV), J2 = new Float32Array(NV), EN = new Float32Array(NV);
    // A sheet at rest is never perfectly flat: a slow bow and two corners lifted a few millimetres.
    function restZ(u, v) {
      return 0.012 * sstep(0.3, 0.9, noise(0, u * 0.13 + 0.3, v * 0.17 + 0.5)) + 0.05 * (1 - sstep(0, 0.5, Math.hypot(u * W, (1 - v) * H))) + 0.03 * (1 - sstep(0, 0.45, Math.hypot((1 - u) * W, v * H)));
    }
    (function () {
      var hs = [], m = 0;
      for (var j = 0; j < VY; j++) for (var i = 0; i < VX; i++) {
        var id = j * VX + i, u = i / NX, v = j / NY, x = u * W, y = v * H;
        PUV[id * 2] = u; PUV[id * 2 + 1] = v; REST[id] = restZ(u, v);
        var h = 0.55 * Math.max(facets(x, y, 0.4, 0.46, 11), facets(x, y, 1.8, 0.24, 23)) + 0.30 * facets(x, y, 1.1, 0.11, 31) + 0.15 * facets(x, y, 2.6, 0.06, 37);
        HF[id] = h; m += h;
        J1[id] = noise(3, u * 0.7 + 0.1, v * 0.9 + 0.4); J2[id] = noise(2, u * 0.5 + 0.6, v * 0.6 + 0.2);
        EN[id] = edgeNoise(x, y);
      }
      m /= NV; var vv = 0; for (var k = 0; k < NV; k++) vv += (HF[k] - m) * (HF[k] - m); var sd = Math.sqrt(vv / NV) || 1;
      for (k = 0; k < NV; k++) HF[k] = clamp((HF[k] - m) / (4 * sd), -0.5, 0.5);
      // crease sign per vertex (ridge +, valley −) from the discrete Laplacian: non-zero only along facet edges
      var ls = 0;
      for (j = 0; j < VY; j++) for (i = 0; i < VX; i++) { var a = j * VX + i, l = i > 0 ? a - 1 : a, r = i < NX ? a + 1 : a, t = j > 0 ? a - VX : a, b = j < NY ? a + VX : a; var lap = 4 * HF[a] - HF[l] - HF[r] - HF[t] - HF[b]; PF[a * 2] = HF[a]; PF[a * 2 + 1] = lap; ls += lap * lap; }
      ls = Math.sqrt(ls / NV) || 1; for (k = 0; k < NV; k++) PF[k * 2 + 1] = clamp(PF[k * 2 + 1] / (2 * ls), -1, 1);
    })();
    var paperIdx = new Uint32Array(NX * NY * 6);
    (function () { var k = 0; for (var j = 0; j < NY; j++) for (var i = 0; i < NX; i++) { var a = j * VX + i, b = a + 1, c = a + VX, d = c + 1; paperIdx[k++] = a; paperIdx[k++] = c; paperIdx[k++] = b; paperIdx[k++] = b; paperIdx[k++] = c; paperIdx[k++] = d; } })();
    function vao(attrs, idx) {
      var o = { vao: gl.createVertexArray(), bufs: [], n: idx.length };
      gl.bindVertexArray(o.vao);
      attrs.forEach(function (a, i) { if (!a) return; var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, a.data, a.dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW); gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, a.size, gl.FLOAT, false, 0, 0); o.bufs[i] = b; });
      var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      gl.bindVertexArray(null); return o;
    }
    function draw(o) { gl.bindVertexArray(o.vao); gl.drawElements(gl.TRIANGLES, o.n, gl.UNSIGNED_INT, 0); }
    var paperMesh = vao([{ data: PP, size: 3, dyn: 1 }, { data: PN, size: 3, dyn: 1 }, { data: PUV, size: 2 }, { data: PF, size: 2 }, { data: PC, size: 4, dyn: 1 }], paperIdx);
    var deskMesh = vao([{ data: new Float32Array([-30, -30, 0, 30, -30, 0, 30, 30, 0, -30, 30, 0]), size: 3 }], new Uint32Array([0, 1, 2, 0, 2, 3]));

    // ---- props (static: baked into one mesh in world space)
    var flames = [], propLights = [], propMesh = null;
    (function () {
      var B = builder();
      (cfg.props || []).forEach(function (o) {
        var fn = typeof o.kind === 'function' ? o.kind : PD.PROPS[o.kind];
        if (!fn) { console.warn('paper-desk: no prop kind ' + o.kind); return; }
        var at = o.at || [1.4, 0], s = o.scale || 1;
        var mx = M4.mul(M4.translate(at[0] * W / 2, at[1] * H / 2, o.z || 0), M4.mul(M4.rotZ(o.rot || 0), M4.scale(s, s, s)));
        var f0 = B.flames.length, l0 = B.lights.length;
        B.push(mx); fn(B, o); B.pop();
        function xf(p) { return [mx[0] * p[0] + mx[4] * p[1] + mx[8] * p[2] + mx[12], mx[1] * p[0] + mx[5] * p[1] + mx[9] * p[2] + mx[13], mx[2] * p[0] + mx[6] * p[1] + mx[10] * p[2] + mx[14]]; }
        for (var i = f0; i < B.flames.length; i++) flames.push({ p: xf(B.flames[i]), seed: i * 1.7 + 0.3 });
        for (i = l0; i < B.lights.length; i++) propLights.push({ p: xf(B.lights[i]), col: hexLin(o.light || '#ffb255'), power: o.power || 0.55, seed: i * 2.3 });
      });
      var d = B.data();
      if (d.idx.length) propMesh = vao([{ data: d.pos, size: 3 }, { data: d.nor, size: 3 }, { data: d.col, size: 3 }, { data: d.mat, size: 3 }], d.idx);
    })();

    // ---- render targets
    var SHADOW = cfg.quality.shadow, AOS = 256;
    T.shadow = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, T.shadow);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, SHADOW, SHADOW, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
      [gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE], [gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL]].forEach(function (p) { gl.texParameteri(gl.TEXTURE_2D, p[0], p[1]); });
    var FB = { shadow: gl.createFramebuffer() };
    gl.bindFramebuffer(gl.FRAMEBUFFER, FB.shadow); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, T.shadow, 0); gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
    var aoT = HIC.gl.target(gl, AOS, AOS, { }); gl.bindTexture(gl.TEXTURE_2D, aoT.tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    T.dom = HIC.gl.texture(gl, { w: 2, h: 2, data: new Uint8Array(16).fill(255), mips: true });
    var aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    if (aniso) { gl.bindTexture(gl.TEXTURE_2D, T.dom); gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT))); }
    var floatOK = !!gl.getExtension('EXT_color_buffer_float'), HDR = floatOK ? gl.RGBA16F : gl.RGBA8;
    var RT = null, RW = 0, RH = 0;
    function colorTarget(w, h) { var t = HIC.gl.texture(gl, { w: w, h: h, internal: HDR, format: gl.RGBA, type: floatOK ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE }); var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t: t, f: f, w: w, h: h }; }
    function buildTargets() {
      if (RT) { ['res', 'h', 'q1', 'q2', 'e1', 'e2'].forEach(function (k) { gl.deleteTexture(RT[k].t); gl.deleteFramebuffer(RT[k].f); }); if (RT.ms) { gl.deleteRenderbuffer(RT.c); gl.deleteRenderbuffer(RT.d); gl.deleteFramebuffer(RT.ms); } else gl.deleteRenderbuffer(RT.d); }
      RT = {};
      var maxS = 0; try { var ss = gl.getInternalformatParameter(gl.RENDERBUFFER, HDR, gl.SAMPLES); maxS = ss && ss.length ? ss[0] : 0; } catch (e) {}
      var samples = Math.min(cfg.quality.msaa || 0, maxS);
      RT.res = colorTarget(RW, RH);
      if (samples > 1) {
        RT.c = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, RT.c); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, HDR, RW, RH);
        RT.d = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, RT.d); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, RW, RH);
        RT.ms = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, RT.ms);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, RT.c); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, RT.d);
      } else {
        RT.d = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, RT.d); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, RW, RH);
        gl.bindFramebuffer(gl.FRAMEBUFFER, RT.res.f); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, RT.d);
      }
      var hw = Math.max(2, RW >> 1), hh = Math.max(2, RH >> 1);
      RT.h = colorTarget(hw, hh); RT.q1 = colorTarget(Math.max(1, hw >> 1), Math.max(1, hh >> 1)); RT.q2 = colorTarget(RT.q1.w, RT.q1.h);
      RT.e1 = colorTarget(Math.max(1, hw >> 2), Math.max(1, hh >> 2)); RT.e2 = colorTarget(RT.e1.w, RT.e1.h);
      RT.samples = samples;
    }

    // ---- camera: the sheet fits the free area between the page's top bar and its dock, seen from 15° off vertical
    var CAM = { pv: null, eye: [0, 0, 10], pscale: 1 };
    function persp(fov, asp) { return M4.perspective(fov, asp, 0.5, 80); }
    function layoutCamera() {
      var phone = S.W < 700, mg = phone ? cfg.camera.phone : cfg.camera.margin;
      var fov = cfg.camera.fov * Math.PI / 180, tilt = cfg.camera.tilt * Math.PI / 180, asp = S.W / S.H;
      var corners = [[-W / 2, H / 2], [W / 2, H / 2], [-W / 2, -H / 2], [W / 2, -H / 2]];
      function build(D, P0) { var eye = [0, -Math.sin(tilt) * D, Math.cos(tilt) * D]; return { eye: eye, pv: M4.mul(P0 || persp(fov, asp), M4.lookAt(eye, [0, 0, 0], [0, 1, 0])) }; }
      function bounds(pv) { var b = [1e9, -1e9, 1e9, -1e9]; corners.forEach(function (c) { var q = xf4(pv, c[0], c[1], 0); var sx = (q[0] / q[3] * 0.5 + 0.5) * S.W, sy = (0.5 - q[1] / q[3] * 0.5) * S.H; b[0] = Math.min(b[0], sx); b[1] = Math.max(b[1], sx); b[2] = Math.min(b[2], sy); b[3] = Math.max(b[3], sy); }); return b; }
      var lo = 1, hi = 80;
      for (var i = 0; i < 30; i++) { var D = (lo + hi) / 2, b = bounds(build(D).pv); if (b[1] - b[0] > S.W - 2 * mg.side || b[3] - b[2] > S.H - mg.top - mg.bottom) lo = D; else hi = D; }
      var c = build(hi), bb = bounds(c.pv), want = mg.top + (S.H - mg.top - mg.bottom) / 2, have = (bb[2] + bb[3]) / 2, oy = 2 * (have - want) / S.H;
      var P0 = persp(fov, asp); for (var k = 0; k < 4; k++) P0[k * 4 + 1] += oy * P0[k * 4 + 3];   // shift the image, keep the view
      c = build(hi, P0);
      CAM.pv = c.pv; CAM.eye = c.eye; CAM.pscale = RH / (2 * Math.tan(fov / 2)); CAM.grain = clamp((bb[1] - bb[0]) / W * S.dpr / 300, 0.7, 2.4);
      spDirty = placeDirty = true;
    }
    function xf4(m, x, y, z) { return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14], m[3] * x + m[7] * y + m[11] * z + m[15]]; }
    function toScreen(p) { var q = xf4(CAM.pv, p[0], p[1], p[2]); return [(q[0] / q[3] * 0.5 + 0.5) * S.W, (0.5 - q[1] / q[3] * 0.5) * S.H, q[2] / q[3]]; }
    var lampPV, shadowMat, lampDir;
    function layoutLamp() {
      var L = cfg.lamp.pos, A = cfg.lamp.aim;
      lampPV = M4.mul(M4.perspective(64 * Math.PI / 180, 1, 2, 20), M4.lookAt(L, A, [0, 0, 1]));
      shadowMat = M4.mul(new Float32Array([0.5, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0.5, 0, 0.5, 0.5, 0.5, 1]), lampPV);
      lampDir = HIC.vec.norm([A[0] - L[0], A[1] - L[1], A[2] - L[2]]);
    }
    var aoPV = (function () { var m = M4.ident(); m[0] = m[5] = 1 / 4; m[10] = -1 / 10; return m; })();   // top-down, ±4 units
    function resize() {
      S.resize();
      if (canvas.width !== RW || canvas.height !== RH) { RW = canvas.width; RH = canvas.height; buildTargets(); }
      layoutCamera(); needRender = true;
    }
    layoutLamp();

    // ================================================================ deformation
    function curlR() { return 0.09 + 0.36 * st.stiff; }
    function stackH() { return st.folds.length ? st.folds[st.folds.length - 1].r * 2 : Z0 + 0.002; }
    function wrinkleNow() { return Math.min(1, st.wrinkle + 0.6 * st.crPeak); }
    // Wrap the part of the sheet beyond line f around a cylinder of radius f.r, by angle f.th (π = flat over on top).
    function wrap(q, f) {
      var d = (q[0] - f.ox) * f.nx + (q[1] - f.oy) * f.ny; if (d <= 0) return;
      var bx = q[0] - d * f.nx, by = q[1] - d * f.ny, rho = Math.max(f.r - q[2], 0.0006), arc = f.r * f.th, off, z;
      if (d < arc) { var a = d / f.r; off = rho * Math.sin(a); z = f.r - rho * Math.cos(a); }
      else { var e = d - arc, s = Math.sin(f.th), c = Math.cos(f.th); off = rho * s + e * c; z = f.r - rho * c + e * s; }
      q[0] = bx + f.nx * off; q[1] = by + f.ny * off; q[2] = z;
    }
    // The cylinder line that carries the grabbed point g onto the pointer m (exact for a full wrap; bisection otherwise).
    function peelLine() {
      if (!peel.on) return null;
      var dx = peel.g[0] - peel.m[0], dy = peel.g[1] - peel.m[1], L = Math.hypot(dx, dy); if (L < 1e-4) return null;
      var r = peel.r, nx = dx / L, ny = dy / L, d;
      if (L >= Math.PI * r) d = (L + Math.PI * r) / 2;
      else { var lo = 0, hi = Math.PI * r; for (var i = 0; i < 24; i++) { var md = (lo + hi) / 2; if (md - r * Math.sin(md / r) < L) lo = md; else hi = md; } d = (lo + hi) / 2; }
      return { ox: peel.g[0] - nx * d, oy: peel.g[1] - ny * d, nx: nx, ny: ny, r: r, th: Math.PI };
    }
    var BV = [], SV = [];   // live burn and stain values: [x, y, radius, activity] in sheet units (from the top-left)
    function basePoint(u, v, id) {   // the sheet with its folds, before a curl or crumple (where a grab lands)
      var q = [(u - 0.5) * W, (0.5 - v) * H, Z0 + restZ(u, v) * st.restK + (id >= 0 ? wrinkleNow() * 0.03 * HF[id] : 0)];
      for (var k = 0; k < st.folds.length; k++) wrap(q, st.folds[k]);
      return q;
    }
    function deform() {
      var wr = wrinkleNow(), wz = wr * 0.03, pl = peelLine(), nf = st.folds.length, q = [0, 0, 0];
      var c = st.cr, ck = c * c * (3 - 2 * c), ballR = 0.46 + 0.1 * st.stiff, Rb = ballR / Math.max(ck, 1e-4), lift = 2 * ballR * ck, thMax = 2.9;
      var cs = Math.cos(st.slideRot), sn = Math.sin(st.slideRot), hasBurn = BV.length > 0;
      for (var id = 0; id < NV; id++) {
        var u = PUV[id * 2], v = PUV[id * 2 + 1];
        q[0] = (u - 0.5) * W; q[1] = (0.5 - v) * H; q[2] = Z0 + REST[id] * st.restK + wz * (HF[id] + 0.5);
        if (wz > 0) { q[0] += wz * 0.8 * (J1[id] - 0.5) - q[0] * wz * 0.5; q[1] += wz * 0.8 * (J2[id] - 0.5) - q[1] * wz * 0.5; }
        if (hasBurn) {   // charred paper near the front lifts and cups
          var b = -9, br = 0, x = u * W, y = v * H;
          for (var k = 0; k < BV.length; k++) { var f = BV[k][2] - Math.hypot(x - BV[k][0], y - BV[k][1]) + EN[id] * Math.min(1, BV[k][2] * 4); if (f > b) { b = f; br = BV[k][2]; } }
          q[2] += sstep(-0.24, -0.005, b) * 0.07 * (0.4 + J1[id]) * clamp(br * 3, 0.25, 1);
        }
        for (k = 0; k < nf; k++) wrap(q, st.folds[k]);
        if (pl) wrap(q, pl);
        if (ck > 0.0005) {   // gather onto a ball: the grabbed point rises to the top, the far edges tuck under
          var dx = q[0] - st.crC[0], dy = q[1] - st.crC[1], rho = Math.hypot(dx, dy) + 1e-6, tw = ck * 0.9 * (J1[id] - 0.5), ct = Math.cos(tw), stw = Math.sin(tw);
          var ex = (dx * ct - dy * stw) / rho, ey = (dx * stw + dy * ct) / rho;
          var th = rho / Rb; th = thMax * (1 - Math.exp(-th / thMax));
          var bumps = ck * (0.11 * HF[id] * 2 * (1 - 0.5 * sstep(1.4, 2.6, th)) + 0.015 * (J2[id] - 0.5) * sstep(0.8, 1.8, th));
          var rad = (Rb + (q[2] - Z0) * (1 - ck) + bumps) * (1 - 0.42 * ck * sstep(1.7, 2.75, th)), s2 = Math.sin(th);
          q[0] = st.crC[0] + ex * rad * s2; q[1] = st.crC[1] + ey * rad * s2; q[2] = Math.max(Z0, lift - Rb + rad * Math.cos(th));
        }
        if (st.slide || st.slideRot) { var x0 = q[0], y0 = q[1]; q[0] = x0 * cs - y0 * sn + st.slide; q[1] = x0 * sn + y0 * cs - st.slide * 0.25; }
        PP[id * 3] = q[0]; PP[id * 3 + 1] = q[1]; PP[id * 3 + 2] = q[2];
      }
      for (var j = 0; j < VY; j++) for (var i = 0; i < VX; i++) {
        var a = j * VX + i, l = (i > 0 ? a - 1 : a) * 3, r = (i < NX ? a + 1 : a) * 3, t = (j > 0 ? a - VX : a) * 3, bo = (j < NY ? a + VX : a) * 3;
        var ux = PP[r] - PP[l], uy = PP[r + 1] - PP[l + 1], uz = PP[r + 2] - PP[l + 2], vx = PP[bo] - PP[t], vy = PP[bo + 1] - PP[t + 1], vz = PP[bo + 2] - PP[t + 2];
        var nx = vy * uz - vz * uy, ny = vz * ux - vx * uz, nz = vx * uy - vy * ux, len = Math.hypot(nx, ny, nz) || 1;
        PN[a * 3] = nx / len; PN[a * 3 + 1] = ny / len; PN[a * 3 + 2] = nz / len;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, paperMesh.bufs[0]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, PP);
      gl.bindBuffer(gl.ARRAY_BUFFER, paperMesh.bufs[1]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, PN);
      geomDirty = false; spDirty = placeDirty = needRender = shadowDirty = true;
    }
    function surf(u, v) {   // a point of the bent sheet at (u, v), bilinear over the grid
      var fi = clamp(u, 0, 1) * NX, fj = clamp(v, 0, 1) * NY, i = Math.min(NX - 1, Math.floor(fi)), j = Math.min(NY - 1, Math.floor(fj)), tx = fi - i, ty = fj - j, a = (j * VX + i) * 3, o = [0, 0, 0];
      for (var k = 0; k < 3; k++) o[k] = mix(mix(PP[a + k], PP[a + 3 + k], tx), mix(PP[a + VX * 3 + k], PP[a + VX * 3 + 3 + k], tx), ty);
      return o;
    }

    // ================================================================ picking and hit-test placement
    var SP = new Float32Array(NV * 3);
    function project() { if (!spDirty) return; var m = CAM.pv; for (var id = 0; id < NV; id++) { var x = PP[id * 3], y = PP[id * 3 + 1], z = PP[id * 3 + 2], w = m[3] * x + m[7] * y + m[11] * z + m[15]; SP[id * 3] = ((m[0] * x + m[4] * y + m[8] * z + m[12]) / w * 0.5 + 0.5) * S.W; SP[id * 3 + 1] = (0.5 - (m[1] * x + m[5] * y + m[9] * z + m[13]) / w * 0.5) * S.H; SP[id * 3 + 2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w; } spDirty = false; }
    // The nearest visible triangle under a canvas point: { u, v, front, tri: [ids], w: [weights] } or null (desk, hole).
    function pick(x, y) {
      if (!(x > -1e4)) return null; project();
      var best = null, bd = 1e9;
      function test(i0, i1, i2) {
        var ax = SP[i0 * 3], ay = SP[i0 * 3 + 1], bx = SP[i1 * 3], by = SP[i1 * 3 + 1], cx = SP[i2 * 3], cy = SP[i2 * 3 + 1];
        var ar = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay); if (Math.abs(ar) < 1e-9) return;
        var w0 = ((bx - x) * (cy - y) - (cx - x) * (by - y)) / ar, w1 = ((cx - x) * (ay - y) - (ax - x) * (cy - y)) / ar, w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) return;
        var d = w0 * SP[i0 * 3 + 2] + w1 * SP[i1 * 3 + 2] + w2 * SP[i2 * 3 + 2]; if (d >= bd) return;
        var u = w0 * PUV[i0 * 2] + w1 * PUV[i1 * 2] + w2 * PUV[i2 * 2], v = w0 * PUV[i0 * 2 + 1] + w1 * PUV[i1 * 2 + 1] + w2 * PUV[i2 * 2 + 1];
        if (BV.length && burnAt(u * W, v * H, BV) > 0) return;   // a hole: what is under it is the desk
        bd = d; best = { u: u, v: v, front: ar < 0, tri: [i0, i1, i2], w: [w0, w1, w2] };
      }
      for (var j = 0; j < NY; j++) for (var i = 0; i < NX; i++) {
        var a = j * VX + i, b = a + 1, c = a + VX, d = c + 1, x0 = SP[a * 3], x1 = SP[b * 3], x2 = SP[c * 3], x3 = SP[d * 3];
        if ((x < x0 && x < x1 && x < x2 && x < x3) || (x > x0 && x > x1 && x > x2 && x > x3)) continue;
        var y0 = SP[a * 3 + 1], y1 = SP[b * 3 + 1], y2 = SP[c * 3 + 1], y3 = SP[d * 3 + 1];
        if ((y < y0 && y < y1 && y < y2 && y < y3) || (y > y0 && y > y1 && y > y2 && y > y3)) continue;
        test(a, c, b); test(b, c, d);
      }
      return best;
    }
    // The flat sheet is a plane, so element px → canvas px is one homography, given to the browser as a matrix3d.
    function flatHomography() {
      var m = CAM.pv, sx = W / EW, sy = -H / EH, ox = -W / 2 + st.slide, oy = H / 2, oz = Z0;
      var cx = xf4(m, sx, 0, 0), cy = xf4(m, 0, sy, 0), c0 = xf4(m, ox, oy, oz);
      cx[3] -= m[15]; cy[3] -= m[15]; cx[0] -= m[12]; cx[1] -= m[13]; cy[0] -= m[12]; cy[1] -= m[13];   // directions: drop the translation
      function row(c) { return [0.5 * S.W * (c[0] + c[3]), 0.5 * S.H * (c[3] - c[1]), c[3]]; }
      var X = row(cx), Y = row(cy), O = row(c0);
      return [X[0], X[1], 0, X[2], Y[0], Y[1], 0, Y[2], 0, 0, 1, 0, O[0], O[1], 0, O[2]];
    }
    function isFlat() { return !st.folds.length && !peel.on && st.cr < 0.002 && wrinkleNow() < 0.02 && !st.slide && !BV.some(function (b) { return b[3] > 0.02; }); }
    var ptr = { x: -1e5, y: -1e5, moved: true, kind: 'mouse' }, probing = true, hover = null;
    function place() {
      if (probing) return;
      hover = pick(ptr.x, ptr.y);
      if (st.sliding) { S.place(sheet, null); return; }
      if (isFlat()) { S.place(sheet, (hover || ptr.x < -1e4) ? flatHomography() : null); return; }
      if (!hover || !hover.front) { S.place(sheet, null); return; }
      // the affine of the triangle under the pointer: exact there, which is where the click will land
      var t = hover.tri, e = t.map(function (i) { return [PUV[i * 2] * EW, PUV[i * 2 + 1] * EH]; }), s = t.map(function (i) { return [SP[i * 3], SP[i * 3 + 1]]; });
      var det = (e[1][0] - e[0][0]) * (e[2][1] - e[0][1]) - (e[2][0] - e[0][0]) * (e[1][1] - e[0][1]); if (Math.abs(det) < 1e-9) { S.place(sheet, null); return; }
      function solve(k) { var a = ((s[1][k] - s[0][k]) * (e[2][1] - e[0][1]) - (s[2][k] - s[0][k]) * (e[1][1] - e[0][1])) / det, c = ((s[2][k] - s[0][k]) * (e[1][0] - e[0][0]) - (s[1][k] - s[0][k]) * (e[2][0] - e[0][0])) / det; return [a, c, s[0][k] - a * e[0][0] - c * e[0][1]]; }
      var X = solve(0), Y = solve(1);
      S.place(sheet, [X[0], Y[0], X[1], Y[1], X[2], Y[2]]);
    }
    function local(e) { var r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function rayDesk(x, y, z) {   // canvas point → the plane at height z
      var inv = M4.invert(CAM.pv), nx = x / S.W * 2 - 1, ny = 1 - y / S.H * 2, a = xf4(inv, nx, ny, -1), b = xf4(inv, nx, ny, 1);
      var p0 = [a[0] / a[3], a[1] / a[3], a[2] / a[3]], p1 = [b[0] / b[3], b[1] / b[3], b[2] / b[3]], t = (p0[2] - (z || 0)) / (p0[2] - p1[2]);
      return [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
    }

    // ================================================================ the DOM texture
    var domOK = false, uploads = 0, needRender = true, renders = 0, gpuEma = 16, inflight = null, lastRender = 0, slow = false, shadowDirty = true;
    function texScale() { return cfg.quality.texScale || clamp(S.dpr * 1.5, 2, 3); }
    S.onPaint(function () {
      var r = S.upload(sheet, T.dom, Math.round(EW * texScale()), Math.round(EH * texScale()));
      if (!r) return;
      domOK = true; uploads++; needRender = true;
      if (!st.ready) {
        st.ready = true;
        var target = sheet.querySelector('[data-pd-probe]') || sheet.querySelector('[data-hic-edit]') || sheet.firstElementChild;
        S.probe(sheet, target).then(function (mode) { probing = false; placeDirty = true; place(); S.ready({ mode: mode, sheet: [EW, EH], grid: [NX, NY], msaa: RT.samples }); stageFromHash(); });
      }
    });

    // ================================================================ particles (embers, sparks, smoke) and flames
    var MAXP = 1600, PA = { n: 0, pos: new Float32Array(MAXP * 3), vel: new Float32Array(MAXP * 3), col: new Float32Array(MAXP * 4), size: new Float32Array(MAXP), life: new Float32Array(MAXP), age: new Float32Array(MAXP), kind: new Uint8Array(MAXP), s0: new Float32Array(MAXP) };
    var partVao = gl.createVertexArray(); gl.bindVertexArray(partVao);
    var pb = [[PA.pos, 3], [PA.col, 4], [PA.size, 1]].map(function (a, i) { var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, a[0].byteLength + 64 * 16, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, a[1], gl.FLOAT, false, 0, 0); return b; });
    gl.bindVertexArray(null);
    var prnd = HIC.rng(cfg.seed + 101);
    function spawn(kind, p, v, life, size) { if (PA.n >= MAXP) return; var i = PA.n++; PA.pos.set(p, i * 3); PA.vel.set(v, i * 3); PA.life[i] = life; PA.age[i] = 0; PA.kind[i] = kind; PA.s0[i] = size; }
    function emitFromRim(b, rate, dt, fn) {
      var n = rate * dt, k = Math.floor(n) + (prnd() < n % 1 ? 1 : 0);
      for (var i = 0; i < k; i++) {
        var a = prnd() * 6.2832, r = b[2], px = b[0] + Math.cos(a) * r, py = b[1] + Math.sin(a) * r;
        var rr = r + burnAt(px, py, [b]) - 0.01; px = b[0] + Math.cos(a) * rr; py = b[1] + Math.sin(a) * rr;   // step onto the noisy front
        var u = px / W, v = py / H; if (u < 0 || u > 1 || v < 0 || v > 1 || burnAt(px, py, BV) > 0.015) continue;
        fn(surf(u, v));
      }
    }
    function updateParticles(dt, t) {
      for (var bi = 0; bi < BV.length; bi++) {
        var b = BV[bi], act = b[3]; if (act < 0.03) continue;
        emitFromRim(b, act * (60 + b[2] * 380), dt, function (p) { spawn(0, [p[0], p[1], p[2] + 0.01], [(prnd() - 0.5) * 0.2, (prnd() - 0.3) * 0.25, 0.4 + prnd() * 1.0], 0.15 + prnd() * 0.35, 0.01 + Math.pow(prnd(), 3) * 0.05); });
        emitFromRim(b, act * (5 + b[2] * 26), dt, function (p) { spawn(1, [p[0], p[1], p[2] + 0.03], [(prnd() - 0.5) * 0.6, (prnd() - 0.5) * 0.6, 0.5 + prnd() * 1.1], 0.8 + prnd() * 1.3, 0.005 + prnd() * 0.008); });
        emitFromRim(b, act * (8 + b[2] * 30), dt, function (p) { spawn(2, [p[0], p[1], p[2] + 0.05], [(prnd() - 0.5) * 0.1, 0.05 + prnd() * 0.1, 0.25 + prnd() * 0.3], 1.6 + prnd() * 1.6, 0.05 + prnd() * 0.05); });
      }
      var n = 0;
      for (var i = 0; i < PA.n; i++) {
        var age = PA.age[i] + dt; if (age >= PA.life[i]) continue;
        var k = age / PA.life[i], kind = PA.kind[i], vx = PA.vel[i * 3], vy = PA.vel[i * 3 + 1], vz = PA.vel[i * 3 + 2];
        if (kind === 1) { vx += (noise(0, PA.pos[i * 3] * 0.4 + t * 0.3, i * 0.013) - 0.5) * dt * 3; vy += (noise(1, PA.pos[i * 3 + 1] * 0.4, t * 0.3 + i * 0.013) - 0.5) * dt * 3; vz -= dt * 0.2; }
        else if (kind === 2) { vx += (noise(2, t * 0.2 + i * 0.01, 0.3) - 0.5) * dt * 0.6; vx *= 1 - dt * 0.3; vy *= 1 - dt * 0.3; }
        var x = PA.pos[i * 3] + vx * dt, y = PA.pos[i * 3 + 1] + vy * dt, z = PA.pos[i * 3 + 2] + vz * dt;
        PA.pos[n * 3] = x; PA.pos[n * 3 + 1] = y; PA.pos[n * 3 + 2] = z; PA.vel[n * 3] = vx; PA.vel[n * 3 + 1] = vy; PA.vel[n * 3 + 2] = vz;
        PA.life[n] = PA.life[i]; PA.age[n] = age; PA.kind[n] = kind; PA.s0[n] = PA.s0[i];
        var c, s;
        if (kind === 0) { var h = 1 - k, f = sstep(0, 0.15, k) * (1 - k); c = [(5.2 * h + 0.6) * f, (2.4 * h * h + 0.1) * f, 0.6 * h * h * h * f, -1]; s = PA.s0[i] * (0.5 + 0.9 * Math.sin(Math.min(1, k * 1.6) * 3.1416)); }
        else if (kind === 1) { var g = (1 - k) * (0.6 + 0.4 * Math.sin(age * 31 + i)); c = [6.5 * g, 2.0 * g, 0.3 * g, -1]; s = PA.s0[i]; }
        else { c = [0.16, 0.15, 0.14, 0.05 * sstep(0, 0.2, k) * (1 - k)]; s = PA.s0[i] * (1 + 3 * k); }
        PA.col.set(c, n * 4); PA.size[n] = s; n++;
      }
      PA.n = n;
    }

    // ================================================================ sound
    var snd = makeSound(); snd.on = cfg.sound !== false;
    var rustle = 0, crackleT = 0;

    // ================================================================ input: tools
    var overlay = document.createElement('div');
    overlay.className = 'pd-overlay'; overlay.setAttribute('aria-hidden', 'true');
    overlay.style.cssText = 'position:absolute;inset:0;display:none;touch-action:none;z-index:1';
    canvas.parentNode.insertBefore(overlay, canvas.nextSibling);
    var hintEl = document.querySelector('[data-pd-hint]');
    function fire(name, info) { if (typeof cfg.onAct === 'function') try { cfg.onAct(name, info || {}); } catch (e) { console.error(e); } }
    function setTool(t) {
      if (t !== 'type' && !actOn(t)) return;
      st.tool = t; overlay.style.display = t === 'type' ? 'none' : 'block';
      overlay.style.cursor = t === 'burn' || t === 'stain' ? 'crosshair' : 'grab';
      document.querySelectorAll('[data-pd-tool]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-pd-tool') === t)); });
      if (hintEl) hintEl.textContent = cfg.hints[t] || '';
      if (!peel.drag && peel.hint) { peel.hint = false; peel.mt = peel.g.slice(); }
    }
    function startPeel(g, kind, drag) {
      var was = peel.on; peel.on = true; peel.kind = kind; peel.drag = drag;
      peel.r = kind === 'fold' ? Math.max(stackH() * 1.15 + 0.006, 0.014) : Math.max(curlR(), stackH() + 0.01);
      if (!was || Math.hypot(peel.g[0] - g[0], peel.g[1] - g[1]) > 0.02) { peel.g = g.slice(); peel.m = g.slice(); peel.v = [0, 0]; }
      peel.mt = peel.m.slice(); geomDirty = true;
    }
    function dragPeel(x, y) { var m = rayDesk(x, y, 0.02), dx = m[0] - peel.g[0], dy = m[1] - peel.g[1], L = Math.hypot(dx, dy), mx = Math.max(W, H) * 1.1, k = L > mx ? mx / L : 1; peel.mt = [peel.g[0] + dx * k, peel.g[1] + dy * k]; }
    function endPeel() {
      if (!peel.on) return; peel.drag = false; overlay.style.cursor = 'grab';
      var L = Math.hypot(peel.g[0] - peel.m[0], peel.g[1] - peel.m[1]);
      if (peel.kind === 'fold' && L > 0.14) {
        peel.m = peel.mt.slice(); var f = peelLine(), ch = st.creases % 4; st.creases++;
        for (var id = 0; id < NV; id++) { var q = basePoint(PUV[id * 2], PUV[id * 2 + 1], id); PC[id * 4 + ch] = (q[0] - f.ox) * f.nx + (q[1] - f.oy) * f.ny; }
        gl.bindBuffer(gl.ARRAY_BUFFER, paperMesh.bufs[4]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, PC);
        st.folds.push(f); peel.on = false; geomDirty = true;
        snd.burst(1900, 0.09, 0.5, 'bandpass', 2, 900); fire('fold', { folds: st.folds.length });
        return;
      }
      if (L > 0.3) fire('curl', { lift: L });
      peel.mt = peel.g.slice();
    }
    function ignite(u, v, age) {
      if (!actOn('burn')) return false;
      if (st.burns.length >= actOpt('burn', 'max', 6)) { fire('burn-limit'); return false; }
      var size = actOpt('burn', 'size', 0.36);
      st.burns.push({ c: [u * W, v * H], age: age || 0, Rm: size * (0.85 + 0.35 * rnd()), tau: actOpt('burn', 'speed', 2.6), hold: age !== undefined });
      geomDirty = true; snd.burst(5200, 0.28, 0.5, 'bandpass', 0.8); snd.burst(800, 0.6, 0.35, 'lowpass');
      fire('burn', { u: u, v: v, count: st.burns.length }); return true;
    }
    function spill(u, v, age) {
      if (!actOn('stain')) return false;
      if (st.stains.length >= 6) st.stains.shift();
      var size = actOpt('stain', 'size', 0.24);
      st.stains.push({ c: [u * W, v * H], age: age || 0, Rm: size * (0.8 + 0.4 * rnd()), hold: age !== undefined });
      snd.tone(900, 260, 0.12, 0.25); snd.burst(600, 0.25, 0.15, 'lowpass');
      fire('stain', { u: u, v: v }); return true;
    }
    function down(x, y) {
      snd.start(); st.touched = true;
      var h = pick(x, y); if (!h || st.sliding || st.unfolding) return false;
      var g = basePoint(h.u, h.v, -1);
      if (st.tool === 'curl' || st.tool === 'fold') {
        if (st.tool === 'fold' && st.folds.length >= actOpt('fold', 'max', 4)) { fire('fold-limit'); return false; }
        if (st.cr > 0.01) return false;
        peel.on = false; peel.hint = false; startPeel([g[0], g[1]], st.tool, true); overlay.style.cursor = 'grabbing'; return true;
      }
      if (st.tool === 'crumple') { peel.on = false; if (st.cr < 0.01) st.crC = [g[0], g[1]]; st.crHold = true; return true; }
      if (st.tool === 'burn') ignite(h.u, h.v);
      if (st.tool === 'stain') spill(h.u, h.v);
      return false;
    }
    var dragging = false;
    overlay.addEventListener('pointerdown', function (e) { e.preventDefault(); var p = local(e); ptr.x = p[0]; ptr.y = p[1]; if (down(p[0], p[1])) { dragging = true; try { overlay.setPointerCapture(e.pointerId); } catch (_) {} } });
    overlay.addEventListener('pointermove', function (e) { if (dragging && peel.drag) { var p = local(e); dragPeel(p[0], p[1]); } });
    function up() { if (!dragging) return; dragging = false; if (peel.drag) endPeel(); if (st.crHold) { st.crHold = false; if (st.crPeak > 0.85) fire('crumple', { peak: st.crPeak }); } }
    overlay.addEventListener('pointerup', up); overlay.addEventListener('pointercancel', up);
    // In type mode the page gets the pointer, except at the corners, which can still be grabbed and curled.
    var cornerDrag = false;
    function nearCorner(h) { if (!h || !h.front || !actOn('curl')) return null; var du = Math.min(h.u, 1 - h.u) * W, dv = Math.min(h.v, 1 - h.v) * H; if (du > 0.18 || dv > 0.18) return null; return [h.u < 0.5 ? 0 : 1, h.v < 0.5 ? 0 : 1]; }
    canvas.addEventListener('pointerdown', function (e) {
      snd.start(); var p = local(e); ptr.x = p[0]; ptr.y = p[1]; if (st.tool !== 'type') return; st.touched = true;
      var c = nearCorner(pick(p[0], p[1])); if (!c || st.cr > 0.01 || st.sliding || st.unfolding) return;
      e.preventDefault(); e.stopPropagation(); var g = basePoint(c[0], c[1], -1); peel.hint = false; startPeel([g[0], g[1]], 'curl', true); cornerDrag = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    }, true);
    canvas.addEventListener('pointermove', function (e) { if (cornerDrag) { var p = local(e); dragPeel(p[0], p[1]); e.stopPropagation(); } }, true);
    function cornerUp(e) { if (cornerDrag) { cornerDrag = false; endPeel(); e.stopPropagation(); } }
    canvas.addEventListener('pointerup', cornerUp, true); canvas.addEventListener('pointercancel', cornerUp, true);
    root.addEventListener('pointermove', function (e) { var p = local(e); ptr.x = p[0]; ptr.y = p[1]; ptr.kind = e.pointerType; placeDirty = true; }, true);
    root.addEventListener('keydown', function () { snd.start(); }, true);
    document.documentElement.addEventListener('mouseleave', function () { ptr.x = ptr.y = -1e5; placeDirty = true; });
    root.addEventListener('resize', function () { resize(); S.requestPaint(); });

    function flatten() {
      snd.start(); var any = st.folds.length || st.wrinkle > 0.01;
      if (st.folds.length) st.unfolding = true;
      if (st.wrinkle > 0) st.wrinkleT = Math.max(0, st.wrinkle - 0.5);
      peel.hint = false; peel.mt = peel.g.slice();
      if (any) snd.burst(1300, 0.3, 0.4, 'bandpass', 0.8, 700);
      fire('flatten', { already: !any }); return !!any;
    }
    function reset() {
      st.folds = []; st.unfolding = false; st.wrinkle = 0; st.wrinkleT = null; st.cr = 0; st.crPeak = 0; st.crHold = false; st.crFreeze = false;
      st.burns = []; st.stains = []; BV = []; SV = []; peel.on = false; peel.hint = false; PC.fill(9); st.creases = 0; PA.n = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, paperMesh.bufs[4]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, PC);
    }
    function fresh() { snd.start(); if (!st.sliding) { st.sliding = { t: 0, phase: 0 }; snd.burst(2400, 0.35, 0.45, 'bandpass', 0.7, 900); } }
    function setLamp(on) { st.lampT = on ? 1 : 0; snd.tone(2200, 1400, 0.025, 0.25, 'square'); snd.burst(3000, 0.04, 0.4, 'highpass'); fire('lamp', { on: !!on }); }
    function setStock(s) { var o = stockOf(s); st.stock = o; st.stockName = typeof s === 'string' ? s : 'custom'; if (!cfg.gsm) setGsm(o.gsm || st.gsm); fire('stock', { name: st.stockName }); }
    function setGsm(g) { st.gsm = +g; st.stiff = clamp((st.gsm - 40) / 260, 0, 1); }

    // ================================================================ the frame
    var deskCfg = deskOf(cfg.desk), lastRustle = 0;
    function update(dt, t) {
      st.clock += dt;
      // a folded sheet loses its resting bow (the folds hold it down)
      var rk = (st.folds.length || (peel.on && peel.kind === 'fold')) ? 0 : 1;
      if (Math.abs(st.restK - rk) > 0.002) { st.restK += (rk - st.restK) * (1 - Math.exp(-dt * 12)); geomDirty = true; } else st.restK = rk;
      st.lamp += (st.lampT - st.lamp) * (1 - Math.exp(-dt * (st.lampT > st.lamp ? 7 : 12)));
      for (var k = 0; k < 3; k++) { st.tint[k] += (st.stock.tint[k] - st.tint[k]) * (1 - Math.exp(-dt * 6)); st.back[k] += (st.stock.back[k] - st.back[k]) * (1 - Math.exp(-dt * 6)); }
      // idle: nobody has touched it yet, so the bottom-right corner lifts and breathes; hovering a corner lifts it too
      if (st.tool === 'type' && !peel.drag && !st.sliding && !st.unfolding && st.cr < 0.01 && actOn('curl')) {
        var c = ptr.kind === 'mouse' ? nearCorner(hover) : null;
        var idle = cfg.idle && !HIC.calm && HIC.still === null && !slow && !st.touched && st.clock > 1.8;
        var want = c || (idle ? [1, 1] : null);
        if (want) {
          var g = basePoint(want[0], want[1], -1);
          if (peel.on && !peel.hint) { /* a real curl is springing back */ }
          else if (peel.on && peel.hint && Math.hypot(peel.g[0] - g[0], peel.g[1] - g[1]) > 0.05) peel.mt = peel.g.slice();
          else {
            if (!peel.on) { startPeel([g[0], g[1]], 'curl', false); peel.hint = true; }
            var amt = c ? 0.26 : 0.17 + 0.04 * Math.sin(st.clock * 1.4) + 0.015 * Math.sin(st.clock * 3.1), l = Math.hypot(g[0], g[1]) || 1;
            peel.mt = [peel.g[0] - g[0] / l * amt, peel.g[1] - g[1] / l * amt];
          }
          sheet.style.cursor = c ? 'grab' : '';
        } else if (peel.hint) { peel.mt = peel.g.slice(); sheet.style.cursor = ''; }
      }
      // the peel is a damped spring: a light sheet follows fast and settles quickly, card swings back with weight
      if (peel.on) {
        var freq = peel.drag ? 5.5 : 1.6 + 1.6 * st.stiff, zeta = peel.drag ? 1 : 0.55 + 0.25 * (1 - st.stiff), ox = peel.m[0], oy = peel.m[1];
        for (k = 0; k < 2; k++) { var r2 = HIC.spring(peel.m[k], peel.v[k], peel.mt[k], freq, zeta, dt); peel.m[k] = r2[0]; peel.v[k] = r2[1]; }
        var mv = Math.hypot(peel.m[0] - ox, peel.m[1] - oy); if (mv > 1e-5) { geomDirty = true; rustle += mv; }
        if (peel.kind !== 'fold') peel.r += (Math.max(curlR(), stackH() + 0.01) - peel.r) * (1 - Math.exp(-dt * 8));
        if (!peel.drag && Math.hypot(peel.m[0] - peel.g[0], peel.m[1] - peel.g[1]) < 0.003 && Math.hypot(peel.v[0], peel.v[1]) < 0.01 && Math.hypot(peel.mt[0] - peel.g[0], peel.mt[1] - peel.g[1]) < 0.003) { peel.on = false; peel.hint = false; geomDirty = true; }
      }
      // folds: the newest springs open a little; pressing again (a new drag, a crumple) presses them flat
      if (st.unfolding) { var f = st.folds[st.folds.length - 1]; if (!f) st.unfolding = false; else { f.th -= dt * 5.5; geomDirty = true; rustle += dt * 0.5; if (f.th <= 0.001) { st.folds.pop(); if (!st.folds.length) st.unfolding = false; } } }
      else if (st.folds.length) {
        var press = peel.drag || st.cr > 0.01;
        for (k = 0; k < st.folds.length; k++) { var fk = st.folds[k], tgt = press ? Math.PI : Math.PI - (fk.open !== undefined ? fk.open : k === st.folds.length - 1 ? 0.24 + 0.2 * st.stiff : 0.14); if (Math.abs(fk.th - tgt) > 0.002) { fk.th += (tgt - fk.th) * (1 - Math.exp(-dt * 10)); geomDirty = true; } }
      }
      if (st.wrinkleT !== null) { st.wrinkle += (st.wrinkleT - st.wrinkle) * (1 - Math.exp(-dt * 5)); geomDirty = true; if (Math.abs(st.wrinkle - st.wrinkleT) < 0.004) { st.wrinkle = st.wrinkleT; st.wrinkleT = null; } }
      // crumple: holding gathers it (heavier paper is slower), letting go opens it and leaves the wrinkles
      if (!st.crFreeze) {
        var ctgt = st.crHold ? 1 : 0;
        if (st.cr !== ctgt) {
          var o = st.cr, up = 1.0 - 0.45 * st.stiff;
          st.cr = clamp(st.cr + clamp(ctgt - st.cr, -dt * 1.3, dt * up), 0, 1); st.crPeak = Math.max(st.crPeak, st.cr);
          var dcr = Math.abs(st.cr - o); rustle += dcr * 1.6; geomDirty = true;
          crackleT += dcr * 40; while (crackleT > 1) { crackleT -= 1; snd.burst(1800 + prnd() * 4500, 0.012 + prnd() * 0.03, 0.15 + prnd() * 0.35, 'highpass'); }
          if (st.cr === 0) { st.wrinkle = Math.min(1, st.wrinkle + 0.6 * st.crPeak); st.crPeak = 0; }
        }
      }
      // a fresh sheet: the old one slides away to the right, the new one comes in from the left and settles
      if (st.sliding) {
        var sl = st.sliding; sl.t += dt;
        if (sl.phase === 0) { var a = Math.min(1, sl.t / 0.4); st.slide = 7 * a * a * a; st.slideRot = -0.25 * a * a; if (a >= 1) { reset(); sl.phase = 1; sl.t = 0; st.slide = -7; st.slideRot = 0.12; } }
        else { var b2 = Math.min(1, sl.t / 0.6), e = 1 - Math.pow(1 - b2, 3); st.slide = -7 * (1 - e) + 0.04 * Math.sin(b2 * Math.PI) * (1 - b2); st.slideRot = 0.12 * (1 - e); if (b2 >= 1) { st.slide = 0; st.slideRot = 0; st.sliding = null; fire('fresh'); } }
        geomDirty = true;
      }
      // burns grow along the noise, fast then slower, and burn out; stains spread and dry
      var still = HIC.still !== null;
      BV = st.burns.map(function (b) { if (!(still && b.hold)) b.age += dt; var kx = Math.exp(-b.age / b.tau); return [b.c[0], b.c[1], b.Rm * (1 - kx) + 0.03, Math.min(1, kx * 1.3 + (b.age < 0.3 ? 1 : 0))]; });
      SV = st.stains.map(function (s) { if (!(still && s.hold)) s.age += dt; return [s.c[0], s.c[1], s.Rm * (1 - Math.exp(-s.age / 0.5)) + 0.01, 1]; });
      var burning = BV.reduce(function (m, b) { return Math.max(m, b[3]); }, 0);
      if (burning > 0.004 && !(still && st.burns.every(function (b) { return b.hold; }))) geomDirty = true;
      if (!(still && st.particlesFrozen)) updateParticles(dt, t);
      // sound
      rustle *= Math.exp(-dt * 9); snd.level(snd.rustle, Math.min(0.5, rustle * 5)); snd.level(snd.fire, burning * 0.5, 0.12);
      if (burning > 0.03 && prnd() < burning * dt * 14) snd.burst(1500 + prnd() * 5000, 0.01 + prnd() * 0.03, 0.1 + prnd() * 0.35, 'highpass');
    }
    function common(p, pv) {
      p.use(); setM(p, 'uPV', pv); setF(p, 'uCam', CAM.eye[0], CAM.eye[1], CAM.eye[2]);
      var L = cfg.lamp.pos, lc = cfg.lamp.color, pw = cfg.lamp.power;
      setF(p, 'uLampPos', L[0], L[1], L[2]); setF(p, 'uLampDir', lampDir[0], lampDir[1], lampDir[2]); setF(p, 'uLampCol', lc[0] * pw, lc[1] * pw, lc[2] * pw);
      setF(p, 'uLamp', st.lamp); setF(p, 'uCone', cfg.lamp.cone); setF(p, 'uRoomOff', cfg.room.off);
      setF(p, 'uAmbSky', cfg.room.sky[0], cfg.room.sky[1], cfg.room.sky[2]); setF(p, 'uAmbGround', cfg.room.ground[0], cfg.room.ground[1], cfg.room.ground[2]);
      setF(p, 'uShadowSoft', (6 + 3 * st.cr) / SHADOW); setM(p, 'uShadowMat', shadowMat); setF(p, 'uTime', vtime); setF(p, 'uSize', W, H);
      setT(p, 'uNoise', 1, T.noise); setT(p, 'uShadow', 2, T.shadow);
      var bv = new Float32Array(24), sv = new Float32Array(24);
      BV.slice(0, 6).forEach(function (b, i) { bv.set(b, i * 4); }); SV.slice(0, 6).forEach(function (s, i) { sv.set(s, i * 4); });
      if (p.u.uBurn) gl.uniform4fv(p.u.uBurn, bv); if (p.u.uStain) gl.uniform4fv(p.u.uStain, sv);
      if (p.u.uFire) gl.uniform4fv(p.u.uFire, fireU); if (p.u.uFireCol) gl.uniform3fv(p.u.uFireCol, fireC);
    }
    var fireU = new Float32Array(16), fireC = new Float32Array(12), vtime = 0;
    function lights() {   // up to four warm point lights: the strongest burns, then lit candles
      fireU.fill(0); var n = 0, calmK = HIC.calm ? 0.3 : 1;
      BV.filter(function (b) { return b[3] > 0.02; }).sort(function (a, b) { return b[3] - a[3]; }).slice(0, 4).forEach(function (b, i) {
        var w = surf(b[0] / W, b[1] / H), fl = 0.75 + 0.5 * noise(0, vtime * 0.9 + i * 0.3, i * 0.21);
        fireU.set([w[0], w[1], w[2] + 0.3, b[3] * fl * (0.5 + b[2] * 2.2)], n * 4); fireC.set([1.0, 0.46, 0.13], n * 3); n++;
      });
      propLights.forEach(function (l) { if (n >= 4) return; var fl = 1 + calmK * (0.18 * (noise(1, vtime * 1.3 + l.seed, 0.4) - 0.5) + 0.08 * Math.sin(vtime * 23 + l.seed)); fireU.set([l.p[0], l.p[1], l.p[2], l.power * fl], n * 4); fireC.set(l.col, n * 3); n++; });
    }
    function render() {
      gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.CULL_FACE);
      lights();
      if (shadowDirty) {   // the lamp's shadow map and the contact coverage only change when the sheet moves
        shadowDirty = false;
      // 1 shadow map from the lamp
        gl.bindFramebuffer(gl.FRAMEBUFFER, FB.shadow); gl.viewport(0, 0, SHADOW, SHADOW); gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(2, 3);
        common(P.depth, lampPV); setF(P.depth, 'uIsPaper', 1); draw(paperMesh);
        if (propMesh) { setF(P.depth, 'uIsPaper', 0); draw(propMesh); }
        gl.disable(gl.POLYGON_OFFSET_FILL);
        // 2 contact shadow: how close above the desk anything is, seen from straight above (max blend), then mipmapped
        gl.bindFramebuffer(gl.FRAMEBUFFER, aoT.fb); gl.viewport(0, 0, AOS, AOS); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendEquation(gl.MAX); gl.blendFunc(gl.ONE, gl.ONE);
        setM(P.depth, 'uPV', aoPV); setF(P.depth, 'uIsPaper', 1); draw(paperMesh); if (propMesh) { setF(P.depth, 'uIsPaper', 0); draw(propMesh); }
        gl.blendEquation(gl.FUNC_ADD); gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST);
        gl.bindTexture(gl.TEXTURE_2D, aoT.tex); gl.generateMipmap(gl.TEXTURE_2D);
      }
      // 3 the scene into the HDR target
      gl.bindFramebuffer(gl.FRAMEBUFFER, RT.ms || RT.res.f); gl.viewport(0, 0, RW, RH); gl.clearColor(0.01, 0.008, 0.006, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      common(P.desk, CAM.pv); setT(P.desk, 'uAO', 3, aoT.tex);
      gl.uniform1i(P.desk.u.uKind, DESK_KIND[deskCfg.kind] || 0); setF(P.desk, 'uDeskA', deskCfg.a[0], deskCfg.a[1], deskCfg.a[2]); setF(P.desk, 'uDeskB', deskCfg.b[0], deskCfg.b[1], deskCfg.b[2]);
      setF(P.desk, 'uDeskScale', deskCfg.scale || 1); setF(P.desk, 'uGloss', deskCfg.gloss || 0); setF(P.desk, 'uPlank', deskCfg.plank || 2.4); setF(P.desk, 'uGrain', CAM.grain);
      draw(deskMesh);
      if (propMesh) { common(P.prop, CAM.pv); draw(propMesh); }
      common(P.paper, CAM.pv); setT(P.paper, 'uDom', 0, T.dom); setF(P.paper, 'uDomOK', domOK ? 1 : 0);
      var so = st.stock, ck = st.cr * st.cr * (3 - 2 * st.cr), Rb = (0.46 + 0.1 * st.stiff) / Math.max(ck, 1e-4);
      setF(P.paper, 'uTint', st.tint[0], st.tint[1], st.tint[2]); setF(P.paper, 'uBack', st.back[0], st.back[1], st.back[2]);
      setF(P.paper, 'uLaid', so.laid || 0); setF(P.paper, 'uFibre', so.fibre || 0); setF(P.paper, 'uSheen', so.sheen || 0); setF(P.paper, 'uTooth', so.tooth || 0);
      var ch = so.char || [0.012, 0.010, 0.009], sc = hexLin(actOpt('stain', 'color', '#7a4a22')), scm = Math.max(sc[0], sc[1], sc[2], 1e-3);
      sc = sc.map(function (x) { return Math.pow(x / scm, 0.6); });   // the stain is a tint: its hue, normalised (strength is in the shader)
      setF(P.paper, 'uChar', ch[0], ch[1], ch[2]); setF(P.paper, 'uStainCol', sc[0], sc[1], sc[2]);
      setF(P.paper, 'uWrinkle', wrinkleNow() * (1 - 0.5 * st.cr)); setF(P.paper, 'uFacet', 0.85 * ck);
      setF(P.paper, 'uBall', st.crC[0], st.crC[1], Z0 + 2 * (0.46 + 0.1 * st.stiff) * ck - Rb, Rb);
      draw(paperMesh);
      // 4 embers, sparks, smoke and candle flames
      var nP = PA.n, nF = flames.length * 3;
      if (nP + nF) {
        for (var i = 0; i < flames.length; i++) {   // a flame: three soft points stacked, swaying a little
          var fl = flames[i], sw = HIC.calm ? 0 : 0.012 * Math.sin(vtime * 7 + fl.seed) + 0.008 * Math.sin(vtime * 13.7 + fl.seed * 2), k2 = 1 + (HIC.calm ? 0 : 0.12 * Math.sin(vtime * 19 + fl.seed));
          [[0, 0.075, [3.2, 1.3, 0.35], 0.09], [0.6, 0.05, [5.0, 3.0, 1.1], 0.05], [1.4, 0.03, [1.4, 1.6, 4.0], 0.03]].forEach(function (s, j) {
            var at = (nP + i * 3 + j); PA.pos.set([fl.p[0] + sw * (2 - s[0]), fl.p[1], fl.p[2] + s[0] * -0.03], at * 3); PA.col.set([s[2][0] * k2, s[2][1] * k2, s[2][2] * k2, -1], at * 4); PA.size[at] = s[3];
          });
        }
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
        P.part.use(); setM(P.part, 'uPV', CAM.pv); setF(P.part, 'uPScale', CAM.pscale);
        gl.bindVertexArray(partVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, pb[0]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, PA.pos.subarray(0, (nP + nF) * 3));
        gl.bindBuffer(gl.ARRAY_BUFFER, pb[1]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, PA.col.subarray(0, (nP + nF) * 4));
        gl.bindBuffer(gl.ARRAY_BUFFER, pb[2]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, PA.size.subarray(0, nP + nF));
        gl.drawArrays(gl.POINTS, 0, nP + nF); gl.depthMask(true); gl.disable(gl.BLEND);
      }
      // 5 resolve, bloom, tone map to the screen
      if (RT.ms) { gl.bindFramebuffer(gl.READ_FRAMEBUFFER, RT.ms); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, RT.res.f); gl.blitFramebuffer(0, 0, RW, RH, 0, 0, RW, RH, gl.COLOR_BUFFER_BIT, gl.NEAREST); }
      gl.disable(gl.DEPTH_TEST);
      function pass(prog, dst, set) { gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.f : null); gl.viewport(0, 0, dst ? dst.w : RW, dst ? dst.h : RH); prog.use(); set(prog); HIC.gl.fullscreen(gl); }
      pass(P.down, RT.h, function (p) { setT(p, 'uTex', 0, RT.res.t); setF(p, 'uTexel', 1 / RW, 1 / RH); setF(p, 'uThresh', floatOK ? 1.6 : 0.9); });
      pass(P.down, RT.q1, function (p) { setT(p, 'uTex', 0, RT.h.t); setF(p, 'uTexel', 1 / RT.h.w, 1 / RT.h.h); setF(p, 'uThresh', 0); });
      pass(P.blur, RT.q2, function (p) { setT(p, 'uTex', 0, RT.q1.t); setF(p, 'uDir', 1 / RT.q1.w, 0); });
      pass(P.blur, RT.q1, function (p) { setT(p, 'uTex', 0, RT.q2.t); setF(p, 'uDir', 0, 1 / RT.q1.h); });
      pass(P.down, RT.e1, function (p) { setT(p, 'uTex', 0, RT.q1.t); setF(p, 'uTexel', 1 / RT.q1.w, 1 / RT.q1.h); setF(p, 'uThresh', 0); });
      pass(P.blur, RT.e2, function (p) { setT(p, 'uTex', 0, RT.e1.t); setF(p, 'uDir', 1 / RT.e1.w, 0); });
      pass(P.blur, RT.e1, function (p) { setT(p, 'uTex', 0, RT.e2.t); setF(p, 'uDir', 0, 1 / RT.e1.h); });
      var lk = cfg.look;
      pass(P.comp, null, function (p) { setT(p, 'uScene', 0, RT.res.t); setT(p, 'uB1', 1, RT.q1.t); setT(p, 'uB2', 2, RT.e1.t); setF(p, 'uExpo', lk.exposure); setF(p, 'uBloom', lk.bloom); setF(p, 'uVig', lk.vignette); setF(p, 'uGrainAmt', lk.grain); setF(p, 'uTime', vtime); setF(p, 'uRes', RW, RH); });
      gl.bindVertexArray(null);
    }
    resize(); deform();
    S.loop(function (t, dt) {
      vtime = t;
      if (canvas.clientWidth !== S.W || canvas.clientHeight !== S.H) resize();
      update(dt, t);
      // Back-pressure: never queue a frame while the GPU is still drawing the last one (software GL can take a second a
      // frame and a backlog starves the browser's compositor). How long the GPU takes also says whether this machine is
      // slow; a slow machine spaces heavy work out and skips decorative motion (idle corner, candle flicker).
      var nowMs = performance.now(), busy = false;
      if (inflight) {
        if (gl.clientWaitSync(inflight, 0, 0) === gl.TIMEOUT_EXPIRED) busy = true;
        else { gl.deleteSync(inflight); inflight = null; gpuEma += (Math.min(2000, nowMs - lastRender) - gpuEma) * 0.3; }
      }
      slow = gpuEma > 50;
      var gap = slow && !peel.drag && !st.crHold ? Math.min(800, gpuEma) : 0, turn = !busy && nowMs - lastRender >= gap;
      if (geomDirty && turn) deform();
      if (placeDirty) { placeDirty = false; place(); }
      // draw only when something on screen can have changed (software GL and battery both thank you)
      var live = HIC.still !== null ? (Math.abs(st.lamp - st.lampT) > 0.002 || Math.abs(st.tint[0] - st.stock.tint[0]) > 0.002) : PA.n > 0 || BV.some(function (b) { return b[3] > 0.004; }) || st.stains.some(function (s) { return s.age < 3; }) ||
        Math.abs(st.lamp - st.lampT) > 0.002 || Math.abs(st.tint[0] - st.stock.tint[0]) > 0.002 || (flames.length && HIC.still === null && !slow);   // a slow machine skips the candle's flicker
      if (live) needRender = true;   // a change skipped now (GPU busy) is still drawn on the next turn
      if (needRender && turn) { needRender = false; render(); renders++; lastRender = performance.now(); inflight = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush(); }
    });

    // ================================================================ staging (stills, checks, ?#act=)
    // desk.stage('curl' | 'fold' | 'crumple' | 'half' | 'wrinkled' | 'burn' | 'stain' | 'night' | 'select' | 'stock:<name>' | 'tool:<name>')
    function stage(name, o) {
      o = o || {}; st.touched = true; peel.hint = false;
      String(name).split(/[,+]/).forEach(function (n) {
        n = n.trim(); var arg = n.split(':')[1]; n = n.split(':')[0];
        if (n === 'curl') { var c = o.corner || [1, 1], g = basePoint(c[0], c[1], -1), to = o.to || [0.12, -0.35]; startPeel([g[0], g[1]], 'curl', true); peel.mt = [to[0] * W / 2, to[1] * H / 2]; peel.m = peel.mt.slice(); }
        if (n === 'fold') {   // one fold across the lower third, sprung open a little (a letter halfway into its envelope)
          var fr = o.from || [0.5, 1], tt = o.to || [0.5, 0.34], g2 = basePoint(fr[0], fr[1], -1);
          startPeel([g2[0], g2[1]], 'fold', true); peel.mt = [(tt[0] - 0.5) * W, (0.5 - tt[1]) * H]; peel.m = peel.mt.slice(); endPeel();
          if (st.folds.length) { var lf = st.folds[st.folds.length - 1]; lf.open = o.open || 0.24; lf.th = Math.PI - lf.open; }
        }
        if (n === 'crumple') { st.crC = o.at || [0.1 * W, -0.05 * H]; st.cr = 1; st.crPeak = 1; st.crHold = true; st.crFreeze = true; }
        if (n === 'half') { st.crC = o.at || [0.1 * W, -0.05 * H]; st.cr = o.amount || 0.5; st.crPeak = st.cr; st.crFreeze = true; }
        if (n === 'wrinkled') { st.wrinkle = o.wrinkle || 0.85; }
        if (n === 'burn') { (o.burns || [[0.68, 0.3, 2.3], [0.22, 0.82, 0.9]]).forEach(function (b) { ignite(b[0], b[1], b[2]); }); BV = st.burns.map(function (b) { var kx = Math.exp(-b.age / b.tau); return [b.c[0], b.c[1], b.Rm * (1 - kx) + 0.03, Math.min(1, kx * 1.3)]; }); for (var i = 0; i < 40; i++) updateParticles(1 / 30, i / 30); st.particlesFrozen = true; }
        if (n === 'stain') { (o.stains || [[0.74, 0.62, 2], [0.3, 0.2, 2]]).forEach(function (s) { spill(s[0], s[1], s[2]); }); }
        if (n === 'night') { st.lampT = 0; st.lamp = 0; }
        if (n === 'select') {
          var el = sheet.querySelector('[data-pd-select]') || sheet.querySelector('p'), tn = el && document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode();
          if (tn) { var rg = document.createRange(), sel = getSelection(); rg.setStart(tn, 0); rg.setEnd(tn, Math.min(o.chars || 40, tn.length)); sel.removeAllRanges(); sel.addRange(rg); }
        }
        if (n === 'stock' && arg) { var sel2 = document.querySelector('select[data-pd=stock]'); if (sel2) sel2.value = arg; setStock(arg); st.tint = st.stock.tint.slice(); st.back = st.stock.back.slice(); }
        if (n === 'tool' && arg) setTool(arg);
      });
      geomDirty = true;
    }
    function stageFromHash() { var a = HIC.param('act'); if (a) stage(a); }

    // ================================================================ the page's API
    function fresh2() { if (geomDirty) deform(); }   // the API always answers with the current shape
    function screenOf(el) {   // where an element of the sheet is on screen, through the bend (checks click here)
      fresh2(); var b = HIC.box(sheet, el), u = (b[0] + b[2] / 2) / EW, v = (b[1] + b[3] / 2) / EH;
      return toScreen(surf(u, v)).slice(0, 2);
    }
    var api = {
      fallback: false, state: st, peel: peel, config: cfg, stage: stage, screenOf: screenOf,
      get burns() { return BV; }, get particles() { return PA.n; }, get uploads() { return uploads; }, get renders() { return renders; }, get settled() { return !needRender && !inflight && !geomDirty; }, get hover() { return hover; },
      redraw: function () { needRender = true; }, tool: setTool, flatten: flatten, fresh: fresh, lamp: setLamp, stock: setStock, gsm: setGsm,
      ignite: ignite, stain: spill, sound: function (on) { snd.set(on); return snd.on; }, get audio() { return snd.ctx; },
      surface: function (u, v) { fresh2(); return surf(u, v); }, toScreen: toScreen, pick: function (x, y) { fresh2(); return pick(x, y); }, isFlat: isFlat,
      size: { W: W, H: H, EW: EW, EH: EH, grid: [NX, NY] },
      crumple: function (on, at) { if (at) st.crC = [(at[0] - 0.5) * W, (0.5 - at[1]) * H]; st.crHold = !!on; },
      wire: function (rootEl) { wire(api, rootEl || document); return api; }
    };
    root.__hic.screenOf = screenOf;
    root.__desk = api;
    setTool('type');
    return api;
  };

  // Wire ordinary controls declaratively: [data-pd-tool=curl], [data-pd=flatten|fresh|sound], input[data-pd=lamp],
  // select[data-pd=stock], input[type=range][data-pd=gsm] (+ output[data-pd=gsm-out]), input[type=radio][data-pd=ink] (sets --ink on the sheet).
  function wire(d, rootEl) {
    var q = function (s) { return [].slice.call(rootEl.querySelectorAll(s)); };
    q('[data-pd-tool]').forEach(function (b) {
      var t = b.getAttribute('data-pd-tool');
      if (t !== 'type' && !d.config.acts[t]) { b.hidden = true; return; }
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.addEventListener('click', function () { d.tool(t); });
    });
    q('[data-pd=flatten]').forEach(function (b) { b.addEventListener('mousedown', function (e) { e.preventDefault(); }); b.addEventListener('click', function () { d.flatten(); }); });
    q('[data-pd=fresh]').forEach(function (b) { b.addEventListener('mousedown', function (e) { e.preventDefault(); }); b.addEventListener('click', function () { d.fresh(); }); });
    q('[data-pd=sound]').forEach(function (b) { b.setAttribute('aria-pressed', String(d.config.sound !== false)); b.addEventListener('click', function () { var on = d.sound(b.getAttribute('aria-pressed') !== 'true'); b.setAttribute('aria-pressed', String(on)); }); });
    q('[data-pd=lamp]').forEach(function (b) { b.addEventListener('change', function () { d.lamp(b.checked); }); });
    q('[data-pd=stock]').forEach(function (s) { s.addEventListener('change', function () { d.stock(s.value); }); });
    q('[data-pd=gsm]').forEach(function (r) { var out = rootEl.querySelector('[data-pd=gsm-out]'); function on() { d.gsm(r.value); if (out) out.textContent = r.value + ' g/m²'; } r.addEventListener('input', on); });
    q('[data-pd=ink]').forEach(function (r) { r.addEventListener('change', function () { if (r.checked) d.config.sheet.style.setProperty('--ink', r.value); }); });
  }
  // the same API when the feature is off: the sheet is an ordinary page and nothing physical happens
  function stub(wrap) {
    var no = function () { return false; };
    document.documentElement.classList.add('pd-fallback');
    return { fallback: true, wrap: wrap, state: {}, tool: no, flatten: no, fresh: no, lamp: no, stock: no, gsm: no, ignite: no, stain: no, sound: no, stage: no, crumple: no, wire: function () { return this; } };
  }

  root.PaperDesk = PD;
})(typeof window !== 'undefined' ? window : globalThis);

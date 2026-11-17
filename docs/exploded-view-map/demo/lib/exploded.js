/* exploded.js — an ordinary web page taken apart in 3D: the engine of exploded-view-map.
 *
 * Global `ExplodedView`. Needs lib/hic.js (HIC) and lib/terrain.js (EVTerrain); lib/paper-sound.js (PaperSound) is optional.
 * The page is real DOM inside <canvas layoutsubtree content="drawable">. Every drawable piece of it (the base sheet, each
 * paper plate of the map, each UI card, each pin) is uploaded as a texture and drawn as a quad in WebGL2, and each piece is
 * placed for hit testing exactly where it is drawn, so the page keeps working while it is apart: type in the title, drag
 * the slider, press a waypoint, select text.
 *
 * The map is a stack of paper plates. Give the engine either
 *   terrain: { height(u, v), levels }   a height function over the unit square, cut into plates at the levels, or
 *   layers:  true                       plates the page wrote itself: [data-ev=plate] elements inside the map container,
 *                                       each holding an <svg viewBox="0 0 1000 H"> with a path.ev-fill (map units)
 * plus the cards ([data-ev=card]) and the base sheet ([data-ev=sheet]). Pull apart (scroll, the button, or the intro):
 * the plates gain thickness and stack into a terraced relief, then gaps open from the top down; the cards lean up like
 * lecterns and turn toward you; the pins stand up on stems. Drag turns it, a click on a plate lifts it with everything
 * above. The sun the page sets (setLight) lights it: shadows are rays marched through the plates above each point, the
 * plate field gives ambient occlusion at every step, and after dusk lamps glow at the pins.
 *
 * Markup (see templates/index.html):
 *   <canvas id="stage" layoutsubtree content="drawable">
 *     <div id="page">                                   layout root, at the canvas origin, not drawable
 *       <div data-ev="sheet" drawable> … <div data-ev-base></div> … </div>   the paper under everything
 *       <div data-ev-map></div>                         over [data-ev-base], same box: plates, pins and marker go here
 *       <section data-ev="card" drawable> … </section>  any number of cards (live HTML: inputs, buttons, text)
 *     </div>
 *   </canvas>
 *
 * const view = ExplodedView.create(canvas, cfg) — cfg (every field optional except a terrain or layers):
 *   page        '#page'
 *   terrain     { height(u,v), levels: [..] or { from, step, count }, grid: 170, minor: 4,
 *                 labels: { from:[u,v], to:[u,v], text(level) }, decorate(k, info) → svg string }
 *   layers      true (plates written by the page)
 *   variants    { name: { ramp: ['#hex', …] (low → high), base: '#hex', minor: 'css colour', label: 'css colour' } }
 *   variant     the first variant's name
 *   material    { thickness: 6, gap: 22, core: '#ece3d4', cardLift: 14, lean: 0.42, cardEdge: '#e9e4da', weight: 1, tooth: 1 }
 *   desk        { color: '#d6d1c7', lit: '#4b5874', pattern: 'wood' | 'mat' | 'plain' }
 *   atmos       { tint: '#9fd0e0', deep: 0, caustics: 0 }       underwater and other air: tint lower plates, moving light
 *   route       { points: [[u,v], …], color: '#e2482b', casing: '#ffffff', width: 3.4 }
 *   pins        [{ id, name, note, at: [u,v] }]; pinHTML(pin) → inner HTML of the pin button
 *   marker      true: a dot that setMarker(f) walks along the route
 *   camera      { yaw: 0.22, tilt: 0.98, fov: 0.5, bottom: 96 (px kept free for the bar) }
 *   intro       { delay: 0.7, apart: 1 } or false
 *   sound       true (PaperSound, if loaded; stays silent until the page's toggle enables it)
 *   tag         true: name the DOM element under the resting pointer
 * Hash flags: #still=<s> (frozen, springs snapped), #calm, #fallback, #nointro, #noidle (no idle animation), #q=0.5 (render scale),
 *   #apart=<0..1.2>, #yaw=<rad>, #tilt=<rad>, #zoom=<x>, #lift=<plate>, #variant=<name>
 *
 * view: apart(v), together(), setVariant(name), setLight({dir, col, amb, expo, night}), setMarker(f), hot(pinId),
 *   animateInput(input, value, perSecond), on('pin' | 'apart' | 'ready', fn), refresh(), pose(o), settle(),
 *   screenOf(el), route { pts, length, ascent, profile, at: {pinId: distance} }, heightAt(u,v), plates, levels, state
 * ExplodedView.daylight(f, o) → a light for a time-of-day slider (see below).
 */
(function (root) {
  'use strict';
  var HIC = root.HIC, TR = root.EVTerrain, EV = {};
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var mix = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  var MU = 1000;                                   // map units across the map's width
  var MAXP = 15;                                   // most plates the shader takes

  function hex(c) {
    if (Array.isArray(c)) return c;
    var m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim()); if (!m) return [0.5, 0.5, 0.5];
    var n = parseInt(m[1], 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  function css(rgb) { return 'rgb(' + rgb.map(function (v) { return Math.round(clamp(v, 0, 1) * 255); }).join(',') + ')'; }
  function ramp(stops, t) {
    var s = stops.map(hex), x = clamp(t, 0, 1) * (s.length - 1), i = Math.min(s.length - 2, Math.floor(x)), f = x - i;
    if (s.length === 1) return s[0];
    return [0, 1, 2].map(function (k) { return mix(s[i][k], s[i + 1][k], f); });
  }
  function svgEl(tag, attrs, parent) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n); return n;
  }
  function springStep(s, target, freq, zeta, dt) {           // s = {x, v}: a damped spring, sub-stepped
    var w = 2 * Math.PI * freq, n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (var i = 0; i < n; i++) { s.v += (-2 * zeta * w * s.v - w * w * (s.x - target)) * h; s.x += s.v * h; }
    return s;
  }

  // ======================================================================== shaders
  var VS = [
    '#version 300 es',
    'layout(location=0) in vec2 aQ;',
    'uniform mat4 uVP; uniform vec3 uO, uEx, uEy; uniform float uZoff;',
    'out vec2 vUv; out vec3 vW;',
    'void main(){ vec3 w = uO + aQ.x*uEx + aQ.y*uEy; w.z += uZoff; vW = w; vUv = aQ; gl_Position = uVP*vec4(w,1.); }'
  ].join('\n');
  var FS = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vUv; in vec3 vW; out vec4 o;',
    'uniform sampler2D uTex, uLev;',
    'uniform int uKind;            // 0 desk, 1 sheet, 2 plate top, 3 plate wall slice, 4 card, 5 solid, 6 pin',
    'uniform float uBand, uN, uZ[16], uTh[16];',
    'uniform vec4 uMap;            // map rect in page px: x, y, w, h',
    'uniform vec4 uPageR;          // page rect x0 y0 x1 y1',
    'uniform vec3 uSun, uSunCol, uAmb; uniform float uExpo, uLit, uNight, uTime;',
    'uniform vec4 uLamp[8]; uniform int uLampN;',
    'uniform vec4 uRect[8]; uniform float uRectZ[8]; uniform int uRectN;',
    'uniform vec3 uSolid, uNrm, uCore, uDesk, uDeskLit, uTint;',
    'uniform float uHot, uPattern, uDeep, uCaustic, uTooth;',
    'uniform vec2 uRes;',
    // the plate field: c >= j wherever plate j is (fractional at the cut edges)
    'float lev(vec2 p){ vec2 q = (p - uMap.xy)/uMap.zw; if(q.x<0.||q.y<0.||q.x>1.||q.y>1.) return 0.; return texture(uLev,q).r; }',
    'float hh(vec2 p){ uvec2 q = uvec2(ivec2(floor(p)) + 40000); uint n = q.x*1664525u ^ (q.y*1013904223u + 0x9e3779b9u); n ^= n>>15; n *= 2246822519u; n ^= n>>13; return float(n & 0xffffffu)/16777216.; }',
    'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hh(i),hh(i+vec2(1,0)),f.x), mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x), f.y); }',
    'vec2 run(){ return uSun.xy/max(uSun.z,0.07); }   // xy travelled toward the sun per unit of height',
    // A plate is a flat slab: the sun ray from P meets plate j's underside at a known height, and the field says whether
    // there is paper there. Far casters give softer, thinner shade (a big soft sky source).
    'float plateShadow(vec3 P, float from){',
    '  vec2 r = run(); float rl = length(r), vis = 1.;',
    '  for(int j=1;j<16;j++){ float fj = float(j); if(fj>uN) break; if(fj<from) continue;',
    '    float dz = uZ[j]-uTh[j]-P.z; if(dz<0.12) continue;',
    '    float c = lev(P.xy + r*dz), d = dz*rl, s = 0.035 + d*0.0018;',
    '    vis *= 1. - smoothstep(-s, s, c-fj)/(1. + d*0.0025);',
    '    if(vis<0.01) break; }',
    '  return vis; }',
    // sky still seen past an edge of height h at distance d (d<0: under it)
    'float edgeOcc(float d, float h){ return 0.5*(1. - d/sqrt(d*d + h*h + 1e-3)); }',
    'float rbox(vec2 p, vec4 r, float rad){ vec2 c = (r.xy+r.zw)*.5, h = (r.zw-r.xy)*.5; vec2 a = abs(p-c)-h+rad; return length(max(a,0.)) + min(max(a.x,a.y),0.) - rad; }',
    'vec2 cardShade(vec3 P){',
    '  vec2 r = run(); float l = length(r); if(l>0.9) r *= 0.9/l; float vis = 1., sky = 1.;',
    '  for(int i=0;i<8;i++){ if(i>=uRectN) break; float dz = uRectZ[i]-P.z; if(dz<0.3) continue;',
    '    float t = 1. - smoothstep(-2.-dz*.28, 2.+dz*.28, rbox(P.xy + r*dz, uRect[i], 10.));',
    '    vis *= 1. - 0.48*t*t*(3.-2.*t)/(1. + dz*.006);',
    '    sky *= 1. - 0.38*edgeOcc(rbox(P.xy, uRect[i], 10.), dz*.8+1.)/(1. + dz*.012); }',
    '  return vec2(vis, sky); }',
    'float caus(vec2 p){ p *= 0.05; float s = 0.;',
    '  for(int i=0;i<2;i++){ float fi = float(i); vec2 q = p*(1.+fi*.8) + vec2(uTime*.09*(1.+fi), -uTime*.06) + vn(p*1.3+uTime*.05)*1.5;',
    '    float v = vn(q*2.6) + vn(q*4.1 + 7.3); s += pow(1.-abs(v-1.), 7.); }',
    '  return s*.5; }',
    'vec3 shoulder(vec3 c){ vec3 x = max(c-.72,0.); return min(c,.72) + .26*(1.-exp(-x/.26)); }',
    'void main(){',
    '  vec3 P = vW, alb, n = vec3(0,0,1), add = vec3(0); float a = 1., sun = 1., ao = 1., amb = 1.;',
    '  float fw = length(fwidth(P.xy)), fine = clamp(1.5 - fw*.7, 0., 1.);',
    '  if(uKind==0){',
    '    alb = mix(uDesk, uDeskLit, uLit);',
    '    if(uPattern>1.5){ vec2 g = P.xy/36.; vec2 q = (fract(g-.5)-.5)*36.; float px = max(fw,1e-3);',
    '      float dotm = 1.-smoothstep(.9-px,.9+px,length(q)); vec2 q2 = abs((fract(P.xy/180.-.5)-.5)*180.);',
    '      float cr = (1.-smoothstep(.5-px*.5,.5+px*.5,min(q2.x,q2.y)))*(1.-smoothstep(6.,7.,max(q2.x,q2.y)));',
    '      alb *= 1. - (.1*dotm + .12*cr)/(1.+fw*fw); }',
    '    else if(uPattern>0.5){ float g = vn(vec2(P.x*.004, P.y*.06 + vn(P.xy*.002)*6.))*.7 + vn(P.xy*vec2(.02,.4))*.3;',
    '      float ring = sin(g*38.); alb *= 1. + (ring*.035 + (vn(P.xy*vec2(.05,1.2))-.5)*.05*fine - .02); }',
    '    float sd = rbox(P.xy, uPageR, 16.); ao *= 1. - .25*exp(-max(sd,0.)/8.) - .12*exp(-max(sd,0.)/50.);',
    '  } else if(uKind==5){ alb = uSolid; n = normalize(uNrm);',
    '  } else { vec4 t = texture(uTex, vUv); a = t.a; if(a<0.01) discard; alb = t.rgb/max(a,1e-3);',
    '    if(uKind==2||uKind==3){ float aw = max(fwidth(a),.04); a = clamp((a-.5)/aw+.5,0.,1.); if(a<0.01) discard; }',
    // a wall slice is the plate's whole shape: only its rim can be seen, the inside lies under the top face
    '    if(uKind==3 && lev(P.xy) > uBand + .35 && P.x > uMap.x + 2. && P.y > uMap.y + 2. && P.x < uMap.x + uMap.z - 2. && P.y < uMap.y + uMap.w - 2.) discard; }',
    '  if(uKind==2||uKind==3){',
    '    float e = 1.6, c = lev(P.xy); vec2 g = vec2(lev(P.xy+vec2(e,0.))-lev(P.xy-vec2(e,0.)), lev(P.xy+vec2(0.,e))-lev(P.xy-vec2(0.,e)))/(2.*e);',
    '    float gm = max(length(g),1e-4); int bi = int(uBand+.5), bu = min(bi+1,15); float has = step(float(bu), uN);',
    '    if(uKind==3){',
    '      vec2 nn = -g/gm, ql = P.xy - uMap.xy;',
    '      if(ql.x<1.5) nn = vec2(-1,0); else if(ql.x>uMap.z-1.5) nn = vec2(1,0); else if(ql.y<1.5) nn = vec2(0,-1); else if(ql.y>uMap.w-1.5) nn = vec2(0,1);',
    '      n = normalize(vec3(nn, .2));',
    '      float f = clamp((uZ[bi]-P.z)/max(uTh[bi],.01), 0., 1.);     // 0 at the top arris, 1 at the foot',
    '      float gapDn = uZ[bi]-uTh[bi]-uZ[max(bi-1,0)];',
    '      alb = mix(alb, uCore, .58)*.97;',
    '      alb *= 1. + (vn(vec2(dot(P.xy,vec2(.3,.21)), P.z*2.1+uBand*5.))-.5)*.06 + .07*(1.-smoothstep(0.,.25,f));',
    '      sun = plateShadow(P + vec3(nn*1.5,0.), uBand+1.); ao = 1. - .32*f*f*(1.-smoothstep(.3,6.,gapDn)); amb = .78;',
    '      add = alb*uSunCol*max(uSun.z,0.)*.18*sun*(.3+.7*f);',
    '    } else {',
    '      float gap = uZ[bu]-uTh[bu]-uZ[bi], din = (uBand+1.-c)/gm, dout = (c-uBand)/gm;',
    '      ao = 1. - has*min(.42, edgeOcc(din, uTh[bu]+.6*gap)*1.05/(1.+gap*.02) + .08*exp(-max(din,0.)/14.)*step(.4,uTh[bu]));',
    '      float rim = exp(-max(dout,0.)/1.3)*step(.4,uTh[bi]), face = dot(-g/gm, normalize(uSun.xy+1e-4));',
    '      add = vec3(.09*rim*max(face,0.) - .05*rim*max(-face,0.) + .025*rim);',
    '      sun = plateShadow(P, uBand+1.);',
    '      alb = mix(alb, alb*vec3(1.08,.96,.84)+vec3(.06,.03,0.), uHot*.6);',
    '      float tooth = (vn(P.xy*1.1)-.5)*fine + (vn(P.xy*vec2(.1,1.1)+uBand*31.)-.5)*.5*fine + (vn(P.xy*.03+uBand*9.)-.5)*.5;',
    '      alb *= 1. + (tooth*.04*uTooth + (hh(vec2(uBand,7.))-.5)*.02)*uLit;',
    '    }',
    '  } else if(uKind==0||uKind==1){',
    '    vec2 cs = cardShade(P); sun = plateShadow(P, 1.)*cs.x;',
    '    vec2 mc = clamp(P.xy, uMap.xy, uMap.xy+uMap.zw); float cb = lev(mc + (uMap.xy + uMap.zw*.5 - mc)*.002);',
    '    float inside = step(0., -rbox(P.xy, vec4(uMap.xy, uMap.xy+uMap.zw), 0.));',
    '    float c = lev(P.xy), e = 2.; vec2 g = vec2(lev(P.xy+vec2(e,0.))-c, lev(P.xy+vec2(0.,e))-c)/e;',
    '    float d = inside > .5 ? (1.-c)/max(length(g),1e-4) : (cb > .9 ? rbox(P.xy, vec4(uMap.xy, uMap.xy+uMap.zw), 0.) : 1e4);',
    '    ao *= cs.y*(1. - .55*edgeOcc(d, uZ[1]*.9+.5)*step(.4,uTh[1]));',
    '    if(uKind==1) alb *= 1. + ((vn(P.xy*1.1)-.5)*fine + (vn(P.xy*vec2(.1,1.1))-.5)*.5*fine)*.02*uLit*uTooth;',
    '  } else if(uKind==4){ n = normalize(uNrm); sun = plateShadow(P, 1.); alb *= 1. + (vn(P.xy*1.1)-.5)*fine*.015*uLit;',
    '  }',
    '  float ndl = max(dot(n, uSun), 0.);',
    '  // paper bounces light into the shade under the sheets, so creases go warm grey, never black',
    '  vec3 L = uAmb*amb*pow(vec3(ao), vec3(1.04,1.,.95)) + uSunCol*ndl*sun*mix(1.,ao,.35) + uSunCol*max(uSun.z,.1)*(.22*(1.-sun))*vec3(1.02,.97,.9)*(.5+.5*ao);',
    '  if(uCaustic>0. && uKind<=3) L += uSunCol*ndl*sun*uCaustic*caus(P.xy)*.9;',
    '  if(uNight>0.01){ vec3 lamp = vec3(0);',
    '    for(int i=0;i<8;i++){ if(i>=uLampN) break; vec3 d = uLamp[i].xyz-P; float r2 = dot(d,d);',
    '      lamp += vec3(1.,.66,.32)*uLamp[i].w*(.25+.75*max(dot(n,d)*inversesqrt(r2+1e-3),0.))/(1.+r2/2400.); }',
    '    L += lamp*uNight*mix(1.,ao,.6)*3.2; }',
    '  if(uKind==6||uKind==4) L = max(L, vec3(.62,.63,.68)*mix(.8,1.,1.-uNight));',
    '  vec3 col = alb*mix(vec3(1.), L*uExpo, uLit) + add*uLit*uExpo;',
    '  if(uDeep>0. && uKind!=6 && uKind!=4){ float k = (uKind==2||uKind==3) ? 1.-(uBand-1.)/max(uN-1.,1.) : 1.15; col *= mix(vec3(1.), uTint, clamp(uDeep*k,0.,1.)*uLit); }',
    '  col = mix(col, shoulder(col), uLit);',
    '  vec2 vq = gl_FragCoord.xy/uRes - .5; col *= 1. - .38*dot(vq,vq)*uLit;',
    '  col += (hh(gl_FragCoord.xy)-.5)/255.;',
    '  o = vec4(col*a, a); }'
  ].join('\n');
  var RVS = '#version 300 es\nlayout(location=0) in vec3 aP; layout(location=1) in vec4 aC; uniform mat4 uVP; out vec4 vC; void main(){ vC = aC; gl_Position = uVP*vec4(aP,1.); }';
  var RFS = '#version 300 es\nprecision highp float; in vec4 vC; out vec4 o; uniform float uK, uGlow; void main(){ vec3 c = vC.rgb*uK + vC.rgb*uGlow*step(vC.g*1.6, vC.r); o = vec4(c*vC.a, vC.a); }';

  // ======================================================================== light for a day slider
  // f: 0 sunrise … 0.9 sunset … 1 night. o: { rise: minutes, set: minutes, maxEl: radians, az0, az1: degrees (0 = north,
  // the top of the map), amber: 0..1, moon: true }. Returns { dir, col, amb, expo, night, minutes }.
  EV.daylight = function (f, o) {
    o = o || {};
    var DAY = o.day || 0.9, rise = o.rise || 360, set = o.set || 1200, day = Math.min(1, f / DAY), late = Math.max(0, (f - DAY) / (1 - DAY));
    var el = Math.max(0.09, (o.maxEl || 0.9) * Math.sin(Math.PI * (0.04 + 0.92 * day)));
    var az = mix(o.az0 == null ? 100 : o.az0, o.az1 == null ? 260 : o.az1, day) * Math.PI / 180;
    var dir = [Math.sin(az) * Math.cos(el), -Math.cos(az) * Math.cos(el), Math.sin(el)];
    var k = smooth((el - 0.09) / 0.55), amber = o.amber == null ? 1 : o.amber;
    var dusk = smooth((f - DAY + 0.1) / 0.1), night = smooth((f - DAY + 0.015) / 0.1);
    var col = [mix(1.0 + 0.45 * amber, 1.05, k), mix(0.97, 1.0, k), mix(1.0 - 0.5 * amber, 0.92, k)].map(function (c, i) { return c * (1 - dusk * [0.2, 0.35, 0.5][i]); });
    var amb = [mix(0.6, 0.52, k), mix(0.56, 0.59, k), mix(0.55, 0.74, k)];
    var lum = amb[1] + col[1] * dir[2], expo = 1.0 / Math.pow(lum, 0.85);
    if (night > 0) {
      var moon = [0.5, -0.46, 0.73], w = night > 0.5 ? (night - 0.5) * 2 : 1 - night * 2;
      if (night > 0.5) { dir = moon; col = [0.34, 0.42, 0.6]; }
      col = col.map(function (c) { return c * w; });
      amb = amb.map(function (c, i) { return mix(c, [0.11, 0.14, 0.23][i], night); });
      expo = mix(expo, 1.15, night);
    }
    return { dir: dir, col: col, amb: amb, expo: expo, night: night, minutes: rise + day * (set - rise) + late * 180 };
  };
  EV.clock = function (min) { min = Math.round(min / 5) * 5; return String(Math.floor(min / 60) % 24).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); };

  // ======================================================================== the map: plates from a height function
  function buildTerrain(cfg, map) {
    var t = cfg.terrain, aspect = map.h / map.w, MH = MU * aspect;
    var nx = t.grid || 170, ny = Math.max(8, Math.round(nx * aspect));
    var fn = t.height, g = TR.sample(fn, nx, ny);
    var lv = Array.isArray(t.levels) ? t.levels.slice() : (function () { var a = []; for (var i = 0; i < t.levels.count; i++) a.push(t.levels.from + i * t.levels.step); return a; })();
    var sx = MU / (nx - 1), sy = MH / (ny - 1), plates = [];
    var labels = t.labels, labelText = labels && labels.text || function (l) { return String(Math.round(l)); };
    lv.forEach(function (level, i) {
      var fill = TR.contours(g, level, true);
      if (!fill.length) return;
      var bb = TR.bbox(fill); bb = [Math.floor(bb[0] * sx) - 1, Math.floor(bb[1] * sy) - 1, Math.ceil(bb[2] * sx) + 1, Math.ceil(bb[3] * sy) + 1];
      bb = [Math.max(0, bb[0]), Math.max(0, bb[1]), Math.min(MU, bb[2]), Math.min(MH, bb[3])];
      if (bb[2] - bb[0] < 12 || bb[3] - bb[1] < 12) return;                       // a crumb at the top is not worth a sheet
      var next = lv[i + 1] != null ? lv[i + 1] : level + (lv[1] - lv[0] || 100), minor = [];
      for (var m = 1; m <= (t.minor == null ? 4 : t.minor); m++) minor = minor.concat(TR.contours(g, level + (next - level) * m / ((t.minor || 4) + 1), false));
      plates.push({ k: plates.length + 1, level: level, x: bb[0], y: bb[1], w: bb[2] - bb[0], h: bb[3] - bb[1],
        fill: TR.path(fill, sx, sy, bb[0], bb[1]), minor: TR.path(minor, sx, sy, bb[0], bb[1]), labels: [] });
    });
    var below = []; for (var m = 1; m <= (t.minor == null ? 4 : t.minor); m++) below = below.concat(TR.contours(g, lv[0] - (lv[1] - lv[0]) * m / ((t.minor || 4) + 1), false));
    var levels = plates.map(function (p) { return p.level; });
    // fractional plate index of a height: k where the height crosses plate k's level
    function index(h) {
      if (h < levels[0]) { var s0 = (levels[1] || levels[0] + 1) - levels[0]; return Math.max(0, 1 + (h - levels[0]) / s0); }
      for (var i = levels.length - 1; i >= 0; i--) if (h >= levels[i]) { var s = (levels[i + 1] != null ? levels[i + 1] : levels[i] + (levels[i] - (levels[i - 1] != null ? levels[i - 1] : levels[i] - 1))) - levels[i]; return Math.min(plates.length + 0.98, i + 1 + (h - levels[i]) / s); }
      return 0;
    }
    // contour labels: along a line, where it climbs onto each plate, turned to run along the contour
    if (labels) plates.forEach(function (p) {
      if (p.k < 2) return;
      for (var s = 0; s <= 1; s += 0.004) {
        var u = mix(labels.from[0], labels.to[0], s), v = mix(labels.from[1], labels.to[1], s), h = TR.at(g, u * (nx - 1), v * (ny - 1));
        if (h < p.level + (lv[1] - lv[0]) * 0.18) continue;
        var u2 = mix(labels.from[0], labels.to[0], s + 0.03), v2 = mix(labels.from[1], labels.to[1], s + 0.03);
        if (TR.at(g, u2 * (nx - 1), v2 * (ny - 1)) >= (p.level + (lv[1] - lv[0]) * 0.92)) break;   // the plate is too narrow here
        var gx = TR.at(g, u * (nx - 1) + 1, v * (ny - 1)) - TR.at(g, u * (nx - 1) - 1, v * (ny - 1)), gy = TR.at(g, u * (nx - 1), v * (ny - 1) + 1) - TR.at(g, u * (nx - 1), v * (ny - 1) - 1);
        var ang = Math.atan2(gx, -gy) * 180 / Math.PI; if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
        p.labels.push({ x: u * MU - p.x, y: v * MH - p.y, ang: ang, text: labelText(p.level) });
        break;
      }
    });
    return { plates: plates, grid: g, below: TR.path(below, sx, sy, 0, 0), index: index, height: fn, MH: MH,
      levelAt: function (u, v) { return index(TR.at(g, u * (nx - 1), v * (ny - 1))); }, valueAt: function (u, v) { return TR.at(g, u * (nx - 1), v * (ny - 1)); } };
  }

  // the plate field as a texture: from the height grid (terrain) or by rasterising each plate's path (layers)
  function fieldFromTerrain(T, size) {
    var W = size, H = Math.max(8, Math.round(size * T.MH / MU)), d = new Float32Array(W * H), g = T.grid;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) d[y * W + x] = T.index(TR.at(g, (x + 0.5) / W * (g.nx - 1), (y + 0.5) / H * (g.ny - 1)));
    return { w: W, h: H, d: d };
  }
  function fieldFromPaths(paths, MH, size) {
    var W = size, H = Math.max(8, Math.round(size * MH / MU)), c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d'), idx = new Float32Array(W * H);
    paths.forEach(function (d, i) {
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H); x.setTransform(W / MU, 0, 0, H / MH, 0, 0);
      try { x.fillStyle = '#fff'; x.fill(new Path2D(d), 'evenodd'); } catch (e) {}
      var px = x.getImageData(0, 0, W, H).data;
      for (var k = 0; k < W * H; k++) if (px[k * 4 + 3] > 127) idx[k] = i + 1;
    });
    // blur twice so the cut edges have a slope the shader can measure; +0.5 puts each edge at c = plate index
    var tmp = new Float32Array(W * H), R = 2;
    for (var pass = 0; pass < 2; pass++) {
      for (var y = 0; y < H; y++) for (var xx = 0; xx < W; xx++) { var s = 0, n = 0; for (var k2 = -R; k2 <= R; k2++) { var q = clamp(xx + k2, 0, W - 1); s += idx[y * W + q]; n++; } tmp[y * W + xx] = s / n; }
      for (y = 0; y < H; y++) for (xx = 0; xx < W; xx++) { s = 0; n = 0; for (k2 = -R; k2 <= R; k2++) { q = clamp(y + k2, 0, H - 1); s += tmp[q * W + xx]; n++; } idx[y * W + xx] = s / n; }
    }
    for (var k3 = 0; k3 < W * H; k3++) idx[k3] = idx[k3] > 0.02 ? Math.min(paths.length + 0.98, idx[k3] + 0.5) : 0;
    return { w: W, h: H, d: idx };
  }

  // ======================================================================== create
  EV.create = function (canvas, cfg) {
    cfg = cfg || {};
    var doc = document, html = doc.documentElement;
    var page = typeof cfg.page === 'string' ? doc.querySelector(cfg.page) : (cfg.page || doc.getElementById('page'));
    var sheetEl = page.querySelector('[data-ev=sheet]'), mapEl = page.querySelector('[data-ev-map]'), baseEl = page.querySelector('[data-ev-base]');
    var mat = Object.assign({ thickness: 6, gap: 22, core: '#ece3d4', cardLift: 14, lean: 0.42, cardEdge: '#e9e4da', weight: 1, tooth: 1 }, cfg.material || {});
    var desk = Object.assign({ color: '#d6d1c7', lit: '#4b5874', pattern: 'wood' }, cfg.desk || {});
    var atmos = Object.assign({ tint: '#9fd0e0', deep: 0, caustics: 0 }, cfg.atmos || {});
    var camCfg = Object.assign({ yaw: 0.22, tilt: 0.98, fov: 0.5, bottom: 96 }, cfg.camera || {});
    var variants = cfg.variants || { plain: { ramp: ['#e8e4da', '#f7f5ef'], base: '#d9d3c6' } };
    var variant = HIC.param('variant') || cfg.variant || Object.keys(variants)[0];
    var handlers = {}; function emit(n, a) { (handlers[n] || []).forEach(function (f) { try { f(a); } catch (e) { console.error(e); } }); }
    var view = { on: function (n, f) { (handlers[n] = handlers[n] || []).push(f); return view; } };
    html.classList.add('ev');

    // ---------------------------------------------------------------- map box (page px) and the plates as DOM
    function offsetIn(el, top) { var x = 0, y = 0, n = el; while (n && n !== top) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return [x, y]; }
    var mapBox = { x: 0, y: 0, w: 1, h: 1 };
    function measureMap() { var o = offsetIn(mapEl, page); mapBox = { x: o[0], y: o[1], w: mapEl.offsetWidth || 1, h: mapEl.offsetHeight || 1 }; }
    measureMap();
    var T = null, plateEls = [], platePaths = [], MH = MU * mapBox.h / mapBox.w;
    if (cfg.terrain) {
      T = buildTerrain(cfg, mapBox); MH = T.MH;
      if (T.plates.length > MAXP) T.plates.length = MAXP;
      T.plates.forEach(function (p) {
        var d = doc.createElement('div'); d.className = 'ev-plate'; d.setAttribute('drawable', ''); d.dataset.ev = 'plate'; d.dataset.level = p.level;
        d.style.cssText = 'position:absolute;left:' + (p.x / MU * 100) + '%;top:' + (p.y / MH * 100) + '%;width:' + (p.w / MU * 100) + '%;height:' + (p.h / MH * 100) + '%';
        var s = svgEl('svg', { viewBox: '0 0 ' + p.w + ' ' + p.h, preserveAspectRatio: 'none', role: 'img', 'aria-label': (cfg.terrain.aria || function (l) { return 'Ground from ' + l; })(p.level) }, d);
        svgEl('path', { class: 'ev-fill', d: p.fill, 'fill-rule': 'evenodd' }, s);
        if (p.minor) svgEl('path', { class: 'ev-minor', d: p.minor }, s);
        p.labels.forEach(function (L) { var tx = svgEl('text', { class: 'ev-label', x: L.x.toFixed(1), y: L.y.toFixed(1), transform: 'rotate(' + L.ang.toFixed(1) + ' ' + L.x.toFixed(1) + ' ' + L.y.toFixed(1) + ')' }, s); tx.textContent = L.text; });
        if (cfg.terrain.decorate) { var extra = cfg.terrain.decorate(p.k, { level: p.level, x: p.x, y: p.y, w: p.w, h: p.h, mu: MU, mh: MH, at: function (u, v) { return [u * MU - p.x, v * MH - p.y]; } }); if (extra) s.insertAdjacentHTML('beforeend', extra); }
        mapEl.appendChild(d); plateEls.push(d);
      });
      if (baseEl) {
        var bs = svgEl('svg', { viewBox: '0 0 ' + MU + ' ' + MH.toFixed(1), preserveAspectRatio: 'none', class: 'ev-base-svg', 'aria-hidden': 'true' }, baseEl);
        if (T.below) svgEl('path', { class: 'ev-minor', d: T.below }, bs);
        if (cfg.terrain.decorate) { var ex0 = cfg.terrain.decorate(0, { level: null, x: 0, y: 0, w: MU, h: MH, mu: MU, mh: MH, at: function (u, v) { return [u * MU, v * MH]; } }); if (ex0) bs.insertAdjacentHTML('beforeend', ex0); }
      }
    } else {
      plateEls = [].slice.call(mapEl.querySelectorAll('[data-ev=plate]'));
      plateEls.forEach(function (d) { d.classList.add('ev-plate'); d.setAttribute('drawable', ''); var f = d.querySelector('.ev-fill'); platePaths.push(f ? f.getAttribute('d') : 'M0 0H' + MU + 'V' + MH + 'H0Z'); });
      if (plateEls.length > MAXP) plateEls.length = MAXP;
    }
    var NP = plateEls.length;
    var heightAt = T ? T.valueAt : function (u, v) { return levelAt(u, v); };
    var field = null;
    function levelAt(u, v) { if (!field) return 0; var x = clamp(Math.floor(u * field.w), 0, field.w - 1), y = clamp(Math.floor(v * field.h), 0, field.h - 1); return field.d[y * field.w + x]; }

    function setVariant(name) {
      if (!variants[name]) return; variant = name; var V = variants[name];
      plateEls.forEach(function (d, i) { d.style.setProperty('--ev-fill', css(ramp(V.ramp, NP > 1 ? i / (NP - 1) : 0))); });
      page.style.setProperty('--ev-base', V.base || css(ramp(V.ramp, 0)));
      if (V.minor) page.style.setProperty('--ev-minor', V.minor);
      if (V.label) page.style.setProperty('--ev-label', V.label);
      page.dataset.variant = name;
      allDirty = true; if (S) S.requestPaint(); need = true;
    }

    // ---------------------------------------------------------------- route, pins, marker
    var route = { pts: [], length: 0, ascent: 0, profile: [], at: {} };
    var routeSvg = null;
    if (cfg.route && cfg.route.points) {
      var rp = TR.spline(cfg.route.points.map(function (p) { return [p[0] * MU, p[1] * MH]; }), 2.5);
      var acc = 0, up = 0;
      rp.forEach(function (p, i) {
        if (i) { acc += Math.hypot(p[0] - rp[i - 1][0], p[1] - rp[i - 1][1]); }
        var h = heightAt(p[0] / MU, p[1] / MH); if (i) { var dh = h - route.pts[i - 1][3]; if (dh > 0) up += dh; }
        route.pts.push([p[0], p[1], acc, h]);
      });
      route.length = acc; route.ascent = up;
      route.profile = route.pts.filter(function (p, i) { return i % 3 === 0 || i === route.pts.length - 1; }).map(function (p) { return [p[2] / MU, p[3]]; });
      route.length = acc / MU;                                     // in map widths: the page multiplies by its scale
      routeSvg = svgEl('svg', { class: 'ev-route', viewBox: '0 0 ' + MU + ' ' + MH.toFixed(1), preserveAspectRatio: 'none', 'aria-hidden': 'true' }, mapEl);
      var dpath = 'M' + rp.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L');
      svgEl('path', { class: 'ev-route-casing', d: dpath }, routeSvg); svgEl('path', { class: 'ev-route-line', d: dpath }, routeSvg);
    }
    function routeAt(f) {                       // f: 0..1 of the route → [x, y] in map units
      var P = route.pts; if (!P.length) return [MU / 2, MH / 2];
      var d = clamp(f, 0, 1) * P[P.length - 1][2], i = 1; while (i < P.length - 1 && P[i][2] < d) i++;
      var a = P[i - 1], b = P[i], t = clamp((d - a[2]) / Math.max(1e-6, b[2] - a[2]), 0, 1);
      return [mix(a[0], b[0], t), mix(a[1], b[1], t)];
    }
    var pinCfg = cfg.pins || [], pins = [];
    pinCfg.forEach(function (pc, i) {
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'ev-pin'; b.setAttribute('drawable', ''); b.dataset.pin = pc.id;
      b.innerHTML = cfg.pinHTML ? cfg.pinHTML(pc, i) : '<span><em></em><small></small></span>';
      if (!cfg.pinHTML) { b.querySelector('em').textContent = pc.name; b.querySelector('small').textContent = pc.note || ''; }
      mapEl.appendChild(b);
      var best = 0, bd = 1e9; route.pts.forEach(function (p) { var dd = Math.hypot(p[0] - pc.at[0] * MU, p[1] - pc.at[1] * MH); if (dd < bd) { bd = dd; best = p[2]; } });
      route.at[pc.id] = route.pts.length ? best / route.pts[route.pts.length - 1][2] : 0;
      pins.push({ cfg: pc, el: b, u: pc.at[0], v: pc.at[1], i: i, pop: { x: 0, v: 0 }, up: false });
    });
    var markerEl = null, markerF = 0;
    if (cfg.marker) { markerEl = doc.createElement('div'); markerEl.className = 'ev-marker'; markerEl.setAttribute('drawable', ''); markerEl.setAttribute('role', 'img'); markerEl.setAttribute('aria-label', cfg.marker.label || 'Position on the route'); mapEl.appendChild(markerEl); }
    function layoutPins() {
      pins.forEach(function (p) { p.el.style.left = (p.u * mapBox.w - p.el.offsetWidth / 2) + 'px'; p.el.style.top = (p.v * mapBox.h - p.el.offsetHeight) + 'px'; });
      if (markerEl) { var m = routeAt(markerF); markerEl.style.left = (m[0] / MU * mapBox.w - markerEl.offsetWidth / 2) + 'px'; markerEl.style.top = (m[1] / MH * mapBox.h - markerEl.offsetHeight / 2) + 'px'; }
    }
    function hot(id) { pins.forEach(function (p) { var on = p.cfg.id === id; p.el.classList.toggle('hot', on); }); doc.querySelectorAll('[data-pin]').forEach(function (e) { if (!e.classList.contains('ev-pin')) e.classList.toggle('hot', e.dataset.pin === id); }); }

    setVariant(variant);
    view.route = route; view.heightAt = heightAt; view.hot = hot; view.levels = T ? T.plates.map(function (p) { return p.level; }) : plateEls.map(function (_, i) { return i + 1; });
    view.plates = plateEls; view.setVariant = setVariant; view.MH = MH;
    // pins and rows light each other up; a press is the page's to handle (on('pin'))
    pins.forEach(function (p) {
      p.el.addEventListener('pointerenter', function () { hot(p.cfg.id); });
      p.el.addEventListener('pointerleave', function () { hot(null); });
      p.el.addEventListener('click', function () { emit('pin', p.cfg); });
    });
    doc.querySelectorAll('[data-pin]:not(.ev-pin)').forEach(function (e) {
      e.addEventListener('pointerenter', function () { hot(e.dataset.pin); }); e.addEventListener('pointerleave', function () { hot(null); });
      e.addEventListener('click', function () { var pc = pinCfg.filter(function (q) { return q.id === e.dataset.pin; })[0]; if (pc) emit('pin', pc); });
    });

    // ---------------------------------------------------------------- the plain page (feature off)
    var S = null, need = true, allDirty = true;
    if (!HIC.supported('webgl')) {
      var wrap = HIC.fallback(canvas, { note: cfg.fallbackNote });
      html.classList.add('ev-fallback');
      // inside the canvas the children had no layout; now they do: place the pins on the map
      var fit = function () { page.style.zoom = ''; var w = page.offsetWidth || 1; measureMap(); layoutPins(); page.style.zoom = Math.min(1, (wrap.clientWidth || innerWidth) / w); };
      fit(); addEventListener('resize', fit);
      return Object.assign(view, { fallback: true, apart: function () {}, together: function () {}, setLight: function () {}, refresh: function () {},
        setMarker: function (f) { markerF = f; layoutPins(); }, animateInput: function (inp, v) { inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); }, screenOf: function () { return null; } });
    }

    // ---------------------------------------------------------------- the live page
    var q = parseFloat(HIC.param('q')); if (!(q > 0)) q = 1;
    S = HIC.stage(canvas, { gl: { antialias: false, depth: true }, quality: q });
    var gl = S.gl;
    var prog = HIC.gl.program(gl, VS, FS), rib = HIC.gl.program(gl, RVS, RFS);
    var quad = gl.createVertexArray(); gl.bindVertexArray(quad);
    var qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var rva = gl.createVertexArray(); gl.bindVertexArray(rva);
    var rbuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, rbuf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12);
    gl.bindVertexArray(null);
    var ribData = new Float32Array(7 * 6 * 4000);

    // the plate field texture
    field = T ? fieldFromTerrain(T, 384) : fieldFromPaths(platePaths, MH, 384);
    var levTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, levTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, field.w, field.h, 0, gl.RED, gl.FLOAT, field.d);
    [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(function (p) { gl.texParameteri(gl.TEXTURE_2D, p[0], p[1]); });
    var plateOf = function (xMu, yMu) { return Math.floor(levelAt(xMu / MU, yMu / MH) + 1e-3); };   // which plate a map point is on

    // ---------------------------------------------------------------- pieces
    var pieces = [];
    function add(el, kind, extra) { var p = Object.assign({ el: el, kind: kind, tex: HIC.gl.texture(gl, { mips: true }), lx: 0, ly: 0, x: 0, y: 0, w: 1, h: 1, O: [0, 0, 0], ex: [1, 0, 0], ey: [0, 1, 0], nrm: [0, 0, 1], up: false }, extra || {}); pieces.push(p); return p; }
    var sheetP = add(sheetEl, 'sheet');
    var plateP = plateEls.map(function (el, i) { return add(el, 'plate', { k: i + 1, hot: { x: 0, v: 0 }, z: { x: 0, v: 0 }, th: { x: 0, v: 0 } }); });
    pins.forEach(function (p) { p.piece = add(p.el, 'pin', { pin: p }); });
    var markerP = markerEl ? add(markerEl, 'marker') : null;
    var cardP = [].slice.call(page.querySelectorAll('[data-ev=card]')).map(function (el, i) { return add(el, 'card', { order: i, lift: { x: 0, v: 0 } }); });
    var byEl = new Map(); pieces.forEach(function (p) { byEl.set(p.el, p); });
    var PW = 1, PH = 1;
    // Layout offsets: the page's own script may still change the layout after create() (readouts filled in, fonts),
    // so they are read again at every paint. A stale offset puts the CSS hit-test box away from the drawing.
    function measure(full) {
      measureMap(); layoutPins();
      PW = page.offsetWidth || 1; PH = page.offsetHeight || 1;
      var po = offsetIn(page, canvas), changed = false;
      pieces.forEach(function (p) {
        var o = offsetIn(p.el, page), w = p.el.offsetWidth || 1, h = p.el.offsetHeight || 1;
        if (o[0] !== p.x || o[1] !== p.y || w !== p.w || h !== p.h) { changed = true; if (w !== p.w || h !== p.h) p.stale = true; }
        p.x = o[0]; p.y = o[1]; p.lx = o[0] + po[0]; p.ly = o[1] + po[1]; p.w = w; p.h = h;
      });
      if (full) allDirty = true;
      if (changed || full) need = true;
      return changed;
    }

    // ---------------------------------------------------------------- state
    var still = HIC.still !== null, calm = HIC.calm, noIdle = HIC.param('noidle') !== null, noIntro = HIC.param('nointro') !== null || cfg.intro === false;
    var intro = cfg.intro === false ? null : Object.assign({ delay: 0.7, apart: 1 }, cfg.intro || {});
    var hp = function (k, d) { var v = parseFloat(HIC.param(k)); return isFinite(v) ? v : d; };
    var st = { e: { x: 0, v: 0 }, eT: 0, yaw: 0, tilt: 0, zoom: 1, yawT: hp('yaw', 0), tiltT: hp('tilt', 0), zoomT: hp('zoom', 1),
      peel: 0, peelT: Math.round(hp('lift', 0)), pk: { x: 0, v: 0 }, hotPlate: 0, light: EV.daylight(0.45), user: false, introDone: noIntro || !intro, settled: false };
    if (HIC.param('apart') !== null) { st.eT = hp('apart', 1); st.introDone = true; st.user = true; }
    var camRight = [1, 0, 0], camUp = [0, -1, 0], eye = [0, 0, 1], camYaw = 0, vp = new Float32Array(16), topZ = 0;
    var bandZ = new Float32Array(16), bandTh = new Float32Array(16);

    // the stack, for an apart amount e: first the plates gain thickness (lowest first), then gaps open (top first)
    function targetLevels(e, k) {
      var u = NP > 1 ? (k - 1) / (NP - 1) : 1;
      var th = mat.thickness * smooth((e - 0.08 * u) / 0.3);
      var gap = mat.gap * smooth((e - 0.3 - 0.28 * (1 - u)) / 0.42) * (1 + Math.max(0, e - 1) * 1.6);
      return [th, gap];
    }
    function stepState(dt, snap) {
      var w = mat.weight || 1;
      if (snap) { st.e.x = st.eT; st.e.v = 0; } else springStep(st.e, st.eT, 1.5 / Math.sqrt(w), 0.74, dt);
      var e = Math.max(0, st.e.x), ease = snap ? 1 : 1 - Math.exp(-dt * 9);
      st.yaw += (st.yawT - st.yaw) * ease; st.tilt += (st.tiltT - st.tilt) * ease; st.zoom += (st.zoomT - st.zoom) * ease;
      // peel: a plate (and all above it) lifted to look under it
      if (st.peelT !== st.peel && st.pk.x < 0.03) st.peel = st.peelT;
      var pkT = st.peel && st.peel === st.peelT ? 1 : 0;
      if (snap) { st.pk.x = pkT; st.pk.v = 0; } else springStep(st.pk, pkT, 2.2, 0.62, dt);
      var z = 0.0;
      for (var k = 1; k <= NP; k++) {
        var p = plateP[k - 1], tg = targetLevels(e, k);
        z += tg[0] + tg[1] + 0.06;
        var zt = z + (st.peel && k >= st.peel ? 44 * st.pk.x * smooth(e / 0.4) : 0);
        // each plate follows its target with its own spring: the light ones on top lag and overshoot a little
        if (snap) { p.z.x = zt; p.z.v = 0; p.th.x = tg[0]; p.th.v = 0; }
        else { springStep(p.z, zt, (3.4 - 1.2 * (k / NP)) / Math.sqrt(w), 0.6, dt); springStep(p.th, tg[0], 3, 0.8, dt); }
        bandZ[k] = p.z.x; bandTh[k] = Math.max(0, Math.min(p.th.x, p.z.x - (k > 1 ? bandZ[k - 1] : 0) + p.th.x));
        var hT = k === st.hotPlate ? 1 : 0; if (snap) p.hot.x = hT; else p.hot.x += (hT - p.hot.x) * (1 - Math.exp(-dt * 14));
      }
      for (var k2 = NP + 1; k2 < 16; k2++) { bandZ[k2] = bandZ[NP] || 0; bandTh[k2] = 0; }
      topZ = bandZ[NP] || 0;
      pins.forEach(function (p, i) {
        var t = smooth((e - 0.16 - i * 0.035) / 0.24);
        if (snap) { p.pop.x = t; p.pop.v = 0; } else springStep(p.pop, t, 2.6, 0.42, dt);   // a flag springs up past upright and settles
        var up = p.pop.x > 0.5; if (up && !p.up && root.PaperSound && cfg.sound !== false) PaperSound.flick(); p.up = up;
      });
      cardP.forEach(function (c) { var t = smooth((e - 0.12 - c.order * 0.06) / 0.5); if (snap) { c.lift.x = t; c.lift.v = 0; } else springStep(c.lift, t, 1.8 / Math.sqrt(w), 0.66, dt); });
      return Math.abs(st.e.x - st.eT) + Math.abs(st.e.v) + Math.abs(st.pk.x - pkT) + Math.abs(st.yaw - st.yawT) + Math.abs(st.tilt - st.tiltT) + Math.abs(st.zoom - st.zoomT)
        + plateP.reduce(function (s, p) { return s + Math.abs(p.z.v) * 0.05 + Math.abs(p.hot.x - (p.k === st.hotPlate ? 1 : 0)); }, 0)
        + pins.reduce(function (s, p) { return s + Math.abs(p.pop.v); }, 0) + cardP.reduce(function (s, c) { return s + Math.abs(c.lift.v); }, 0);
    }

    // ---------------------------------------------------------------- camera
    function buildVP(t, yaw, tilt, D, out) {
      var dir = [Math.sin(tilt) * Math.sin(yaw), Math.sin(tilt) * Math.cos(yaw), Math.cos(tilt)];
      var r = [Math.cos(yaw), -Math.sin(yaw), 0], u = [-Math.cos(tilt) * Math.sin(yaw), -Math.cos(tilt) * Math.cos(yaw), Math.sin(tilt)];
      var e = [t[0] + dir[0] * D, t[1] + dir[1] * D, t[2] + dir[2] * D];
      var f = 1 / Math.tan(camCfg.fov / 2), asp = S.W / S.H, n = D * 0.08, fa = D * 14, A = (fa + n) / (n - fa), B = 2 * fa * n / (n - fa);
      var V = [r, u, dir].map(function (ax) { return [ax[0], ax[1], ax[2], -(ax[0] * e[0] + ax[1] * e[1] + ax[2] * e[2])]; });
      var rows = [V[0].map(function (v) { return v * f / asp; }), V[1].map(function (v) { return v * f; }), V[2].map(function (v, i) { return v * A + (i === 3 ? B : 0); }), V[2].map(function (v) { return -v; })];
      for (var c = 0; c < 4; c++) for (var ri = 0; ri < 4; ri++) out[c * 4 + ri] = rows[ri][c];
      return { eye: e, r: r, u: u };
    }
    function proj(m, v) { var x = m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], y = m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], w = m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15]; return [x / w, y / w, w]; }
    var tmpVP = new Float32Array(16);
    function camera() {
      var e = Math.max(0, st.e.x), p = smooth(e / 0.45);
      var yaw = (camCfg.yaw + st.yaw) * p, tilt = clamp(camCfg.tilt * (PH > PW ? 0.72 : 1) + st.tilt, 0.05, 1.35) * p;
      var cardTop = cardP.reduce(function (m, c) { return Math.max(m, c.topZ || 0); }, 0);
      var pts = [[0, 0, 0], [PW, 0, 0], [0, PH, 0], [PW, PH, 0]];
      if (p > 0.001) pts.push([mapBox.x, mapBox.y, topZ * 0.5], [mapBox.x + mapBox.w, mapBox.y, topZ * 0.5], [mapBox.x, mapBox.y + mapBox.h, topZ * 0.4], [mapBox.x + mapBox.w, mapBox.y + mapBox.h, topZ * 0.4], [mapBox.x + mapBox.w / 2, mapBox.y + mapBox.h / 2, topZ + 50 * p]);
      cardP.forEach(function (c) {           // the cards' corners as last posed (they turn with the camera)
        if (!c.topZ) return;
        [[0, 0], [c.w, 0], [0, c.h], [c.w, c.h]].forEach(function (f) { pts.push([0, 1, 2].map(function (i) { return c.O[i] + c.ex[i] * f[0] + c.ey[i] * f[1]; })); });
      });
      var t = [PW / 2, PH / 2, topZ * 0.3 * p], D = (S.H / 2) / Math.tan(camCfg.fov / 2), lo = -1 + 2 * (camCfg.bottom + 10) / S.H, hi = 1 - 2 * 16 / S.H;
      var res;
      for (var it = 0; it < 4; it++) {
        res = buildVP(t, yaw, tilt, D, tmpVP);
        var x0 = 9, x1 = -9, y0 = 9, y1 = -9;
        pts.forEach(function (q) { var c = proj(tmpVP, q); x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]); });
        var m = Math.max((x1 - x0) / 1.9, (y1 - y0) / (hi - lo)), th = D * Math.tan(camCfg.fov / 2);
        var ox = (x1 + x0) / 2 * th * (S.W / S.H), oy = ((y1 + y0) / 2 - (hi + lo) / 2) * th;
        for (var k = 0; k < 3; k++) t[k] += res.r[k] * ox + res.u[k] * oy;
        D *= mix(1, m, 0.92);
      }
      D /= st.zoom;
      res = buildVP(t, yaw, tilt, D, vp); eye = res.eye; camRight = res.r; camUp = res.u; camYaw = yaw;
    }

    // ---------------------------------------------------------------- where every piece is (world = page px, z up)
    function pose() {
      var e = Math.max(0, st.e.x);
      sheetP.O = [0, 0, 0];
      plateP.forEach(function (p) { p.O = [p.x, p.y, bandZ[p.k]]; p.ex = [1, 0, 0]; p.ey = [0, 1, 0]; });
      // cards lean back like lecterns from their lower edge and turn toward the camera; each one is seated above the
      // card in front of it so none hides another
      var sorted = cardP.slice().sort(function (a, b) { return a.y - b.y; });
      cardP.forEach(function (c) {
        var k = c.lift.x, al = mat.lean * (PH > PW ? 0.3 : 1) * k, sa = Math.sin(al), ca = Math.cos(al), ph = camYaw * 0.75 * k, cp = Math.cos(ph), sp = Math.sin(ph);
        var seat = 0; sorted.forEach(function (o) { if (o.y > c.y && Math.abs(o.x + o.w / 2 - c.x - c.w / 2) < (o.w + c.w) / 2) seat += o.h * Math.sin(mat.lean * o.lift.x) * 0.92; });
        var z = mat.cardLift * k + seat + 0.3 + c.order * 0.02;
        c.ex = [cp, -sp, 0]; c.ey = [sp * ca, cp * ca, -sa]; c.nrm = [sp * sa, cp * sa, ca];
        var px = c.x + c.w / 2, py = c.y + c.h;
        c.O = [px - c.ex[0] * c.w / 2 - c.ey[0] * c.h, py - c.ex[1] * c.w / 2 - c.ey[1] * c.h, z - c.ey[2] * c.h];
        c.z = z; c.topZ = z + c.h * sa;
      });
      // pins: flat flags on the map, standing up on stems as the page comes apart, always facing the camera
      pins.forEach(function (p) {
        var s = p.pop.x, piece = p.piece, ax = mapBox.x + p.u * mapBox.w, ay = mapBox.y + p.v * mapBox.h;
        var base = bandZ[plateOf(p.u * MU, p.v * MH)] || 0, az = base + (26 + 0.4 * mat.gap) * Math.max(0, s) + 0.5;
        var sc = clamp(s, 0, 1.3), rx = mix(1, camRight[0], clamp(s, 0, 1)), ry = mix(0, camRight[1], clamp(s, 0, 1)), rl = Math.hypot(rx, ry) || 1;
        var upv = [mix(0, camUp[0], sc), mix(-1, camUp[1], sc), mix(0, camUp[2], sc)], ul = Math.hypot(upv[0], upv[1], upv[2]) || 1;
        piece.ex = [rx / rl, ry / rl, 0]; piece.ey = [-upv[0] / ul, -upv[1] / ul, -upv[2] / ul];
        piece.O = [ax - piece.ex[0] * piece.w / 2 - piece.ey[0] * piece.h, ay - piece.ex[1] * piece.w / 2 - piece.ey[1] * piece.h, az - piece.ey[2] * piece.h + 0.2];
        piece.anchor = [ax, ay, base, az];
      });
      if (markerP) {
        var m = routeAt(markerF), mx = mapBox.x + m[0] / MU * mapBox.w, my = mapBox.y + m[1] / MH * mapBox.h, mz = (bandZ[plateOf(m[0], m[1])] || 0) + 7 * smooth(e / 0.3) + 0.6;
        markerP.ex = camRight.slice(); markerP.ey = [-camUp[0], -camUp[1], -camUp[2]];
        if (e < 0.02) { markerP.ex = [1, 0, 0]; markerP.ey = [0, 1, 0]; }
        markerP.O = [mx - markerP.ex[0] * markerP.w / 2 - markerP.ey[0] * markerP.h / 2, my - markerP.ex[1] * markerP.w / 2 - markerP.ey[1] * markerP.h / 2, mz - markerP.ey[2] * markerP.h / 2];
        markerP.anchor = [mx, my, mz - 6 * smooth(e / 0.3), mz];
      }
    }
    // element px → canvas CSS px, as a CSS matrix3d (column-major), from the same camera the picture uses
    function screenMatrix(p) {
      var c0 = [p.ex[0], p.ex[1], p.ex[2], 0], c1 = [p.ey[0], p.ey[1], p.ey[2], 0], c3 = [p.O[0], p.O[1], p.O[2], 1], m = new Array(16).fill(0);
      [[0, c0], [1, c1], [3, c3]].forEach(function (cc) {
        var v = cc[1], x = vp[0] * v[0] + vp[4] * v[1] + vp[8] * v[2] + vp[12] * v[3], y = vp[1] * v[0] + vp[5] * v[1] + vp[9] * v[2] + vp[13] * v[3], w = vp[3] * v[0] + vp[7] * v[1] + vp[11] * v[2] + vp[15] * v[3];
        m[cc[0] * 4] = (x * 0.5 + w * 0.5) * S.W; m[cc[0] * 4 + 1] = (-y * 0.5 + w * 0.5) * S.H; m[cc[0] * 4 + 3] = w;
      });
      m[10] = 1;
      return m;
    }
    function placeAll() {
      pieces.forEach(function (p) {
        var m = screenMatrix(p);
        if (S.mode === 'css') for (var c = 0; c < 4; c++) { m[c * 4] -= p.lx * m[c * 4 + 3]; m[c * 4 + 1] -= p.ly * m[c * 4 + 3]; }   // CSS transforms start at the element's layout box
        if (p.kind === 'pin' && p.pin.pop.x < -0.5) m = null;
        S.place(p.el, m ? m.map(function (v) { return +v.toFixed(5); }) : null);
      });
    }
    // where a point of an element is drawn (canvas CSS px)
    function screenOf(el, fx, fy) {
      var host = el.closest('[drawable]'), p = host && byEl.get(host); if (!p) return null;
      var o = offsetIn(el, host), x = o[0] + el.offsetWidth * (fx == null ? 0.5 : fx), y = o[1] + el.offsetHeight * (fy == null ? 0.5 : fy);
      var w = [p.O[0] + p.ex[0] * x + p.ey[0] * y, p.O[1] + p.ex[1] * x + p.ey[1] * y, p.O[2] + p.ex[2] * x + p.ey[2] * y], c = proj(vp, w);
      return [(c[0] * 0.5 + 0.5) * S.W, (-c[1] * 0.5 + 0.5) * S.H];
    }
    // the element-local point under a screen point (inverse of the piece's homography)
    function localPoint(p, cx, cy) {
      var r = canvas.getBoundingClientRect(), sx = cx - r.left, sy = cy - r.top, m = screenMatrix(p);
      var a = m[0] - sx * m[3], b = m[4] - sx * m[7], c = sx * m[15] - m[12], d = m[1] - sy * m[3], e2 = m[5] - sy * m[7], f = sy * m[15] - m[13], det = a * e2 - b * d;
      return [(c * e2 - b * f) / det, (a * f - c * d) / det];
    }

    // ---------------------------------------------------------------- draw
    var deskC = hex(desk.color), deskLit = hex(desk.lit), coreC = hex(mat.core), edgeC = hex(mat.cardEdge), tintC = hex(atmos.tint);
    var routeC = hex((cfg.route && cfg.route.color) || '#e2482b'), casingC = hex((cfg.route && cfg.route.casing) || '#ffffff'), routeW = (cfg.route && cfg.route.width) || 3.4;
    var uploads = 0, drawn = 0, time0 = performance.now();
    function item(u, o) {
      gl.uniform1i(u.uKind, o.kind); gl.uniform3fv(u.uO, o.O); gl.uniform3fv(u.uEx, o.ex); gl.uniform3fv(u.uEy, o.ey); gl.uniform1f(u.uZoff, o.zoff || 0);
      gl.uniform1f(u.uBand, o.band || 0); gl.uniform1f(u.uHot, o.hot || 0);
      if (o.solid) gl.uniform3fv(u.uSolid, o.solid); if (o.nrm) gl.uniform3fv(u.uNrm, o.nrm);
      if (o.tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, o.tex); }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    function scaled(p) { return { ex: [p.ex[0] * p.w, p.ex[1] * p.w, p.ex[2] * p.w], ey: [p.ey[0] * p.h, p.ey[1] * p.h, p.ey[2] * p.h] }; }
    function ribbon(list) {                // list: [[x, y, z, …], rgba, width] polylines in page px → camera-facing quads
      var n = 0;
      function push(v, c) { if (n + 7 > ribData.length) return; ribData.set([v[0], v[1], v[2], c[0], c[1], c[2], c[3]], n); n += 7; }
      list.forEach(function (L) {
        var P = L.pts, c = L.color, w = L.width / 2, lift = L.lift || 0;
        for (var i = 0; i < P.length - 1; i++) {
          var A = P[i], B = P[i + 1], d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
          var ve = [eye[0] - m[0], eye[1] - m[1], eye[2] - m[2]], vl = Math.hypot(ve[0], ve[1], ve[2]) || 1;
          var s = [d[1] * ve[2] - d[2] * ve[1], d[2] * ve[0] - d[0] * ve[2], d[0] * ve[1] - d[1] * ve[0]], sl = Math.hypot(s[0], s[1], s[2]); if (sl < 1e-6) continue;
          var dl = Math.hypot(d[0], d[1], d[2]) || 1, x = w / dl * 0.5;
          var off = [ve[0] / vl * lift, ve[1] / vl * lift, ve[2] / vl * lift];
          s = [s[0] / sl * w, s[1] / sl * w, s[2] / sl * w];
          var a0 = [A[0] - d[0] * x, A[1] - d[1] * x, A[2] - d[2] * x], b0 = [B[0] + d[0] * x, B[1] + d[1] * x, B[2] + d[2] * x];
          var q = [[a0, -1], [a0, 1], [b0, -1], [b0, 1]].map(function (pp) { return [pp[0][0] + s[0] * pp[1] + off[0], pp[0][1] + s[1] * pp[1] + off[1], pp[0][2] + s[2] * pp[1] + off[2]]; });
          push(q[0], c); push(q[1], c); push(q[2], c); push(q[1], c); push(q[3], c); push(q[2], c);
        }
      });
      return n / 7;
    }
    function draw(t) {
      var L = st.light, e = Math.max(0, st.e.x), lit = smooth(e / 0.35);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
      var bg = [0, 1, 2].map(function (i) { return mix(deskC[i], deskLit[i], lit) * mix(1, 0.6, (L.night || 0) * lit); });
      gl.clearColor(bg[0], bg[1], bg[2], 1); gl.clearDepth(1); gl.depthMask(true); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      prog.use(); var u = prog.u; gl.bindVertexArray(quad);
      gl.uniformMatrix4fv(u.uVP, false, vp);
      gl.uniform1f(u.uN, NP); gl.uniform1fv(u.uZ, bandZ); gl.uniform1fv(u.uTh, bandTh);
      gl.uniform4f(u.uMap, mapBox.x, mapBox.y, mapBox.w, mapBox.h); gl.uniform4f(u.uPageR, 0, 0, PW, PH);
      gl.uniform3fv(u.uSun, HIC.vec.norm(L.dir)); gl.uniform3fv(u.uSunCol, L.col); gl.uniform3fv(u.uAmb, L.amb);
      gl.uniform1f(u.uExpo, L.expo || 1); gl.uniform1f(u.uLit, lit); gl.uniform1f(u.uNight, L.night || 0); gl.uniform1f(u.uTime, calm || still || noIdle ? 3.0 : t);
      gl.uniform3fv(u.uCore, coreC); gl.uniform3fv(u.uDesk, deskC); gl.uniform3fv(u.uDeskLit, deskLit); gl.uniform3fv(u.uTint, tintC);
      gl.uniform1f(u.uPattern, desk.pattern === 'mat' ? 2 : desk.pattern === 'wood' ? 1 : 0); gl.uniform1f(u.uDeep, atmos.deep || 0); gl.uniform1f(u.uCaustic, atmos.caustics || 0); gl.uniform1f(u.uTooth, mat.tooth);
      gl.uniform2f(u.uRes, canvas.width, canvas.height);
      var lamps = new Float32Array(32), ln = 0; pins.forEach(function (p) { if (ln < 8 && p.piece.anchor) { lamps.set([p.piece.anchor[0], p.piece.anchor[1], p.piece.anchor[3] - 6, 1], ln * 4); ln++; } });
      gl.uniform4fv(u.uLamp, lamps); gl.uniform1i(u.uLampN, ln);
      var rr = new Float32Array(32), rz = new Float32Array(8); cardP.slice(0, 8).forEach(function (c, i) { var sa = Math.abs(c.ey[2]); rr.set([c.x, c.y + c.h - c.h * Math.abs(c.ey[1]), c.x + c.w, c.y + c.h], i * 4); rz[i] = c.z + c.h * sa * 0.5; });
      gl.uniform4fv(u.uRect, rr); gl.uniform1fv(u.uRectZ, rz); gl.uniform1i(u.uRectN, Math.min(8, cardP.length));
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, levTex); gl.uniform1i(u.uLev, 1); gl.uniform1i(u.uTex, 0); gl.activeTexture(gl.TEXTURE0);
      var BIG = 30000;
      item(u, { kind: 0, O: [PW / 2 - BIG, PH / 2 - BIG, -0.5], ex: [2 * BIG, 0, 0], ey: [0, 2 * BIG, 0] });
      if (sheetP.ready) item(u, Object.assign({ kind: 1, O: sheetP.O, tex: sheetP.tex }, scaled(sheetP)));
      // plates bottom → top; each one's walls are its own cut shape repeated down its thickness, a slice per pixel
      plateP.forEach(function (p) {
        if (!p.ready) return; var sc = scaled(p), th = bandTh[p.k], n = th > 0.3 ? Math.min(7, Math.max(2, Math.ceil(th / 1.1))) : 0;
        for (var s = n; s >= 1; s--) item(u, { kind: 3, O: p.O, ex: sc.ex, ey: sc.ey, tex: p.tex, band: p.k, zoff: -th * s / n });
        item(u, { kind: 2, O: p.O, ex: sc.ex, ey: sc.ey, tex: p.tex, band: p.k, hot: p.hot.x });
      });
      // route ribbon + pin stems
      var lines = [];
      if (route.pts.length) {
        var P = [], prev = -1, Rp = route.pts;
        for (var i = 0; i < Rp.length; i++) {
          var b = plateOf(Rp[i][0], Rp[i][1]), x = mapBox.x + Rp[i][0] / MU * mapBox.w, y = mapBox.y + Rp[i][1] / MH * mapBox.h, z = (bandZ[b] || 0) + 0.35;
          if (prev >= 0 && b !== prev) { var lp = P[P.length - 1], mx = (lp[0] + x) / 2, my = (lp[1] + y) / 2; P.push([mx, my, lp[2]], [mx, my, z]); }
          P.push([x, y, z]); prev = b;
        }
        lines.push({ pts: P, color: casingC.concat(1), width: routeW + 2.4, lift: 0.1 }, { pts: P, color: routeC.concat(1), width: routeW, lift: 0.3 });
      }
      pins.concat(markerP ? [{ piece: markerP }] : []).forEach(function (p) { var a = p.piece.anchor; if (a && a[3] - a[2] > 1) lines.push({ pts: [[a[0], a[1], a[2]], [a[0], a[1], a[3]]], color: [0.2, 0.22, 0.27, 0.9], width: 1.3, lift: 0 }); });
      var nv = ribbon(lines);
      if (nv) {
        rib.use(); gl.uniformMatrix4fv(rib.u.uVP, false, vp);
        var sunK = mix(1, 0.72 + 0.4 * Math.max(0, HIC.vec.norm(L.dir)[2]) * (L.expo || 1), lit) * mix(1, 0.55, (L.night || 0) * lit);
        gl.uniform1f(rib.u.uK, sunK); gl.uniform1f(rib.u.uGlow, (L.night || 0) * lit * 0.8);
        gl.bindVertexArray(rva); gl.bindBuffer(gl.ARRAY_BUFFER, rbuf); gl.bufferData(gl.ARRAY_BUFFER, ribData.subarray(0, nv * 7), gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.TRIANGLES, 0, nv);
        prog.use(); gl.bindVertexArray(quad);
      }
      var ed = function (q) { return (q.O[0] - eye[0]) * (q.O[0] - eye[0]) + (q.O[1] - eye[1]) * (q.O[1] - eye[1]) + (q.O[2] - eye[2]) * (q.O[2] - eye[2]); };
      // pins over the relief (labels never sink into it) but under the cards, far → near
      gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
      var pl = pins.map(function (p) { return p.piece; }).concat(markerP ? [markerP] : []).filter(function (p) { return p.ready && p.anchor; });
      pl.sort(function (a, b) { return ed(b) - ed(a); }).forEach(function (p) { var sc = scaled(p); item(u, { kind: 6, O: p.O, ex: sc.ex, ey: sc.ey, tex: p.tex }); });
      gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
      // cards, far → near, each with its thickness (lower and side edges)
      cardP.slice().sort(function (a, b) { return ed(b) - ed(a); }).forEach(function (c) {
        if (!c.ready) return; var sc = scaled(c), T2 = 3 * c.lift.x, dn = c.nrm.map(function (v) { return -v * T2; });
        var at = function (fx, fy) { return [0, 1, 2].map(function (i) { return c.O[i] + c.ex[i] * fx + c.ey[i] * fy; }); };
        if (T2 > 0.2) {
          item(u, { kind: 5, solid: edgeC, nrm: [c.ey[0], c.ey[1], 0.3], O: at(8, c.h), ex: c.ex.map(function (v) { return v * (c.w - 16); }), ey: dn });
          item(u, { kind: 5, solid: edgeC, nrm: [-c.ex[0], -c.ex[1], 0.2], O: at(0, 8), ex: c.ey.map(function (v) { return v * (c.h - 16); }), ey: dn });
          item(u, { kind: 5, solid: edgeC, nrm: [c.ex[0], c.ex[1], 0.2], O: at(c.w, 8), ex: c.ey.map(function (v) { return v * (c.h - 16); }), ey: dn });
        }
        gl.uniform3fv(u.uNrm, c.nrm);
        item(u, { kind: 4, O: c.O, ex: sc.ex, ey: sc.ey, tex: c.tex });
      });
      drawn++;
    }

    // ---------------------------------------------------------------- uploads (only when the DOM's pixels changed)
    var probed = false, readyMarked = false;
    S.onPaint(function () {
      var any = false;
      measure(false);
      pieces.forEach(function (p) {
        var heavy = p.kind === 'plate' || p.kind === 'sheet';
        if (heavy && !allDirty && p.ready && !p.stale) return;
        p.stale = false;
        var k = (p.kind === 'card' || p.kind === 'pin' || p.kind === 'marker') ? Math.min(3, S.dpr * 1.5) : S.dpr;
        if (S.upload(p.el, p.tex, p.w * k, p.h * k)) { p.ready = true; uploads++; any = true; }
      });
      allDirty = false; need = true;
      if (any && !probed) {
        probed = true;
        // The probe asks the browser what is under a known point of the sheet; the map and the cards lie over the
        // sheet, so they are hidden from hit testing while it looks.
        var hide = [mapEl].concat(cardP.map(function (c) { return c.el; }));
        hide.forEach(function (h) { h.style.visibility = 'hidden'; });
        S.probe(sheetEl, sheetEl.firstElementChild).then(function (mode) {
          hide.forEach(function (h) { h.style.visibility = ''; });
          probeMode = mode; camera(); pose(); placeAll(); need = true;     // the probe left the sheet at its test offset
        });
      }
    });
    var probeMode = '';

    // ---------------------------------------------------------------- input
    var drag = null, tagEl = null, tagFor = '', tagTimer = 0;
    var INTERACTIVE = 'input,button,textarea,select,label,a,[contenteditable],[data-ev-text]';
    function sound(name, a, b) { if (cfg.sound !== false && root.PaperSound) PaperSound[name](a, b); }
    canvas.addEventListener('pointerdown', function (ev) {
      var t = ev.target; st.user = true; st.introDone = true;
      var range = t.closest && t.closest('input[type=range]');
      if (range) { rangeDown(ev, range); return; }
      if (t !== canvas && t.closest && t.closest(INTERACTIVE)) return;
      ev.preventDefault();
      if (doc.activeElement && doc.activeElement !== doc.body) doc.activeElement.blur();
      var pl = t.closest && t.closest('.ev-plate');
      drag = { x: ev.clientX, y: ev.clientY, moved: 0, plate: pl ? byEl.get(pl).k : 0 };
      canvas.setPointerCapture(ev.pointerId); canvas.classList.add('ev-turning'); tagOff();
    }, true);
    canvas.addEventListener('pointermove', function (ev) {
      if (!drag) { hover(ev); return; }
      var dx = ev.clientX - drag.x, dy = ev.clientY - drag.y; drag.x = ev.clientX; drag.y = ev.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.moved > 4 && st.eT < 0.45) apart(0.45);
      st.yawT = clamp(st.yawT - dx * 0.0055, -2.4, 2.4); st.tiltT = clamp(st.tiltT - dy * 0.0045, 0.08 - camCfg.tilt, 1.32 - camCfg.tilt); need = true;
    });
    function endDrag() {
      if (!drag) return; canvas.classList.remove('ev-turning');
      if (drag.moved < 5 && drag.plate > 1 && st.eT > 0.3) { st.peelT = st.peelT === drag.plate ? 0 : drag.plate; sound('lift'); }
      drag = null; need = true;
    }
    canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', function (ev) {
      ev.preventDefault(); st.user = true; st.introDone = true;
      if (ev.ctrlKey) { st.zoomT = clamp(st.zoomT * Math.exp(-ev.deltaY * 0.01), 0.6, 2.6); need = true; return; }
      apart(st.eT + (ev.deltaMode === 1 ? ev.deltaY * 30 : ev.deltaY) * 0.0011);
    }, { passive: false });
    addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { if (doc.activeElement) doc.activeElement.blur(); together(); } });
    function hover(ev) {
      var t = ev.target, pl = t.closest && t.closest('.ev-plate'), k = pl ? byEl.get(pl).k : 0;
      if (k !== st.hotPlate) { st.hotPlate = k; need = true; if (k) sound('touch'); }
      if (cfg.tag === false) return;
      if (!tagEl) { tagEl = doc.createElement('div'); tagEl.className = 'ev-tag'; tagEl.setAttribute('aria-hidden', 'true'); doc.body.appendChild(tagEl); }
      if (t === canvas || !t.tagName) { tagOff(); return; }
      var s;
      if (pl) s = '&lt;<b>path</b>&gt; ' + (cfg.terrain && cfg.terrain.tag ? cfg.terrain.tag(+pl.dataset.level) : 'plate ' + k);
      else {
        var el = t.closest('.ev-pin,[data-pin],button,input,label,output,h1,h2,h3,p,li,section') || t;
        if (el === page || el === canvas) { tagOff(); return; }
        var n = el.tagName.toLowerCase(), at = el.tagName === 'INPUT' ? ' type="' + el.type + '"' : el.id ? ' id="' + el.id + '"' : (typeof el.className === 'string' && el.className) ? ' class="' + el.className.replace(/\s*hot\b/, '') + '"' : '';
        s = '&lt;<b>' + n + '</b>' + at + '&gt;';
      }
      tagEl.style.transform = 'translate(' + Math.min(ev.clientX + 14, innerWidth - 260) + 'px,' + (ev.clientY + 22 > innerHeight - 40 ? ev.clientY - 34 : ev.clientY + 20) + 'px)';
      if (s === tagFor) return; tagEl.classList.remove('on'); clearTimeout(tagTimer); tagFor = s;
      tagTimer = setTimeout(function () { tagEl.innerHTML = s; tagEl.classList.add('on'); }, 420);
    }
    function tagOff() { if (tagEl) tagEl.classList.remove('on'); clearTimeout(tagTimer); tagFor = ''; }
    canvas.addEventListener('pointerleave', tagOff);
    // Range inputs are driven from the camera: the value comes from where the pointer is on the drawn slider, which is
    // right in both hit-test modes and at any tilt.
    function rangeDown(ev, inp) {
      var host = inp.closest('[drawable]'), p = byEl.get(host); if (!p) return;
      ev.preventDefault(); inp.focus({ preventScroll: true });
      var set = function (e2) {
        var l = localPoint(p, e2.clientX, e2.clientY), o = offsetIn(inp, host), th = 18;
        var f = clamp((l[0] - o[0] - th / 2) / Math.max(1, inp.offsetWidth - th), 0, 1), mn = +inp.min || 0, mx = inp.max === '' ? 100 : +inp.max, stp = +inp.step || 1;
        var v = String(Math.round((mn + f * (mx - mn)) / stp) * stp);
        if (inp.value !== v) { inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); sound('tick', f); }
      };
      set(ev);
      var mv = function (e2) { set(e2); }, upf = function () { removeEventListener('pointermove', mv, true); removeEventListener('pointerup', upf, true); inp.dispatchEvent(new Event('change', { bubbles: true })); };
      addEventListener('pointermove', mv, true); addEventListener('pointerup', upf, true);
    }

    // ---------------------------------------------------------------- API
    function apart(v) { st.eT = clamp(v, 0, 1.2); need = true; emit('apart', st.eT); }
    function together() { st.peelT = 0; st.yawT = 0; st.tiltT = 0; st.zoomT = 1; apart(0); }
    var animIn = [];
    Object.assign(view, {
      fallback: false, stage: S, apart: apart, together: together,
      setLight: function (L) { st.light = L; need = true; },
      setMarker: function (f) { markerF = clamp(f, 0, 1); need = true; },
      refresh: function () { allDirty = true; S.requestPaint(); },
      animateInput: function (inp, value, rate) { animIn = animIn.filter(function (a) { return a.inp !== inp; }); if (still || calm) { inp.value = value; inp.dispatchEvent(new Event('input', { bubbles: true })); } else animIn.push({ inp: inp, to: +value, rate: rate || 400 }); },
      pose: function (o) {
        st.user = true; st.introDone = true;
        if ('apart' in o) st.eT = o.apart; if ('yaw' in o) st.yawT = o.yaw; if ('tilt' in o) st.tiltT = o.tilt; if ('zoom' in o) st.zoomT = o.zoom; if ('lift' in o) st.peelT = o.lift;
        if (o.snap) { stepState(0, true); st.yaw = st.yawT; st.tilt = st.tiltT; st.zoom = st.zoomT; } need = true;
      },
      settle: function () { stepState(0, true); st.yaw = st.yawT; st.tilt = st.tiltT; st.zoom = st.zoomT; camera(); pose(); placeAll(); need = true; },
      screenOf: function (el, fx, fy) { return screenOf(el, fx, fy); },
      localPoint: function (el, cx, cy) { return localPoint(byEl.get(el.closest('[drawable]')), cx, cy); },
      pieces: pieces
    });
    // a live getter (Object.assign above would have copied a snapshot)
    Object.defineProperty(view, 'state', { get: function () { return { e: st.e.x, eT: st.eT, yaw: st.yaw, tilt: st.tilt, peel: st.peel, mode: S.mode, uploads: uploads, frames: drawn, plates: NP, topZ: topZ, settled: st.settled, motion: st.motion, peelT: st.peelT }; } });
    root.__hic.screenOf = function (el) { return screenOf(el); };
    root.__ev = view;

    // ---------------------------------------------------------------- go
    function onResize() { S.resize(); measure(true); S.requestPaint(); }
    addEventListener('resize', onResize);
    measure(true);
    if (still) { st.yaw = st.yawT; st.tilt = st.tiltT; st.zoom = st.zoomT; }
    var lastNow = performance.now(), wasAway = false;
    S.loop(function (t) {
      var nowT = performance.now(), dt = Math.min(0.25, (nowT - lastNow) / 1000); lastNow = nowT;
      // the intro: the page lies flat for a moment, then comes apart by itself
      if (!st.introDone && intro && (still ? t : (nowT - time0) / 1000) >= intro.delay) { st.introDone = true; if (!st.user) apart(intro.apart); }
      if (still && HIC.param('apart') === null && intro && !noIntro) st.eT = t >= intro.delay ? intro.apart : 0;
      for (var i = animIn.length - 1; i >= 0; i--) {
        var a = animIn[i], cur = +a.inp.value, d = a.to - cur, stp = Math.max(a.rate * dt, Math.abs(d) * 3 * dt);
        a.inp.value = String(Math.abs(d) <= stp ? a.to : Math.round(cur + Math.sign(d) * stp)); a.inp.dispatchEvent(new Event('input', { bubbles: true }));
        if (Math.abs(d) <= stp) animIn.splice(i, 1); need = true;
      }
      if (st.eT !== st.lastET) { st.lastET = st.eT; emit('apart', st.eT); }
      var prevE = st.e.x;
      var motion = stepState(dt, still || (calm && !drag));
      if (calm || still) { st.yaw = st.yawT; st.tilt = st.tiltT; st.zoom = st.zoomT; }
      var moving = motion > 1e-3; st.motion = motion;
      html.classList.toggle('ev-apart', st.e.x > 0.25);
      if (cfg.sound !== false && root.PaperSound) {
        PaperSound.riffle(clamp(st.e.x, 0, 1), dt > 0 ? (st.e.x - prevE) / dt : 0);
        var away = st.e.x > 0.15; if (wasAway && st.e.x < 0.01 && st.eT === 0) { PaperSound.land(1); wasAway = false; } else if (away) wasAway = true;
      }
      if (!probed || !sheetP.ready) return;
      if (moving || need || drag || (atmos.caustics && !calm && !still && !noIdle && st.e.x > 0.2)) {
        S.resize(); camera(); pose(); placeAll(); draw(t); need = false;
      }
      if (!st.settled && st.introDone && !moving && probeMode) {
        st.settled = true;
        if (!readyMarked) { readyMarked = true; S.ready({ mode: probeMode, plates: NP, engine: 'exploded-view-map' }); emit('ready', view); }
      } else if (moving) st.settled = false;
    });
    return view;
  };

  root.ExplodedView = EV;
})(typeof window !== 'undefined' ? window : globalThis);

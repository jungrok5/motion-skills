/* event-horizon.js — a compact massive object (black hole, neutron star or wormhole) floating over a live web page and
 * bending it by gravitational lensing. The page is ordinary DOM laid out inside a <canvas> (HTML-in-Canvas, through
 * lib/hic.js); this file draws it through the lens in WebGL2 and keeps every bent word selectable, typeable and clickable
 * by placing the page under the pointer with the inverse of the lens.
 *
 *   var E = EventHorizon.create({ canvas: '#stage', page: '#page', object: { kind: 'blackhole', ramp: [...] }, ... });
 *
 * Physics (units G = c = M = 1): light obeys u'' = 3u² − u along its orbit (u = 1/r, ' = d/dφ). Two tables are integrated
 * once on the CPU with RK4:
 *   α(b)     total deflection of a ray with impact parameter b (b > √27), used for the page behind the object and for clicks;
 *   u(b, φ)  where a ray is after turning through φ, used to find where it crosses the accretion disk (direct image, the
 *            lensed far side above the shadow, and the thin secondary arc under it).
 * The page is a plane a distance D behind the object; a ray seen at b lands on it at β = b / cos α − D tan α, so the page
 * point under screen point x is hole + ê · β · s (s = CSS px per M). The JS lens (sourceOf) and the GLSL lens read the same
 * α table, so what you click is what you see.
 *
 * Draw order each frame: the object's emission into a 256² buffer (its mip chain is the bloom) → the page through the lens
 * with the shadow / star / throat and the crisp emission on top → swallowed pieces (a mesh over a snapshot of each eaten
 * word, every vertex falling in along its own spiral, so letters stretch into strands).
 *
 * Read references/ENGINE.md for the config, the API and how to add an object kind. No dependencies besides hic.js.
 */
(function (root) {
  'use strict';
  var HIC = root.HIC, doc = root.document;
  var EH = { version: '1.0.0' };

  // ================================================================== physics
  var PI = Math.PI;
  var D = 50;                    // distance of the page plane behind the object, in M
  var BC = Math.sqrt(27);        // critical impact parameter: rays inside it are captured (the shadow)
  var THE = 2 * Math.sqrt(D);    // Einstein radius of a point lens at that distance (≈ 14.14 M)
  var T0 = 1.5 * THE, T1 = 3 * THE; // the lens fades out between these, so the far page is untouched
  var BA = T1 + 1;               // α table range [BC, BA]
  var NA = 1024;                 // α table size (b sampled densely near BC: b = BC + (BA − BC) t³)
  var BU = 40, NB = 384, NP = 256, PHIM = 3 * PI + 0.25; // u(b, φ) table: b ∈ (0, BU), φ ∈ (0, PHIM)
  var ACLICK = 1.22;             // deflection past which a pixel no longer shows a clickable page point
  var EXT = 32;                  // half-size of the emission buffer, in M
  EH.consts = { D: D, BC: BC, THE: THE, T0: T0, T1: T1 };

  function rk4(u, v, h) {
    var a1 = v, b1 = 3 * u * u - u;
    var u2 = u + .5 * h * a1, v2 = v + .5 * h * b1, a2 = v2, b2 = 3 * u2 * u2 - u2;
    var u3 = u + .5 * h * a2, v3 = v + .5 * h * b2, a3 = v3, b3 = 3 * u3 * u3 - u3;
    var u4 = u + h * a3, v4 = v + h * b3, a4 = v4, b4 = 3 * u4 * u4 - u4;
    return [u + h / 6 * (a1 + 2 * a2 + 2 * a3 + a4), v + h / 6 * (b1 + 2 * b2 + 2 * b3 + b4)];
  }
  // α(b): integrate from the observer (u = 0, u' = 1/b) until the ray leaves again (u < 0). Fine steps where the orbit is tight.
  function deflection(b) {
    var u = 0, v = 1 / b, phi = 0, pu, r;
    while (phi < PI + 14) {
      var h = u > .12 ? .0025 : .01;
      pu = u; r = rk4(u, v, h); u = r[0]; v = r[1]; phi += h;
      if (u < 0) { phi -= h * (-u) / (pu - u); return Math.min(phi - PI, 12); }
      if (u > .5) return 12;
    }
    return 12;
  }
  var TAB = null;
  function tables() {
    if (TAB) return TAB;
    var al = new Float32Array(NA), i, j, k;
    for (i = 0; i < NA; i++) { var t = (i + .5) / NA; al[i] = deflection(BC + (BA - BC) * t * t * t); }
    // u(b, φ) at texel centres; captured rays read 1 (r = 1, inside everything), escaped rays −1.
    var ut = new Float32Array(NB * NP), SUB = 8, h = PHIM / NP / SUB;
    for (i = 0; i < NB; i++) {
      var b = (i + .5) / NB * BU, u = 0, v = 1 / b, st = 0, rr;
      for (j = 0; j < NP; j++) {
        var n = j === 0 ? SUB / 2 : SUB;
        for (k = 0; k < n && st === 0; k++) { rr = rk4(u, v, h); u = rr[0]; v = rr[1]; if (u > .5) st = 1; else if (u < 0) st = 2; }
        ut[j * NB + i] = st === 0 ? u : st === 1 ? 1 : -1;
      }
    }
    TAB = { al: al, ut: ut };
    return TAB;
  }
  function alphaOf(b) {
    var T = tables();
    if (b <= BC) return 12;
    var x = Math.cbrt(Math.min(1, (b - BC) / (BA - BC))) * NA - .5;
    var i = Math.max(0, Math.min(NA - 2, Math.floor(x))), f = Math.max(0, Math.min(1, x - i));
    return T.al[i] * (1 - f) + T.al[i + 1] * f;
  }
  EH.alpha = alphaOf;
  function smooth(a, b, x) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); }

  // ================================================================== object kinds (defaults; a topic overrides any field)
  var KINDS = {
    blackhole: {
      size: [3.4, 11.5], ramp: ['#5a0f04', '#d2380a', '#ff8a24', '#ffd98f', '#fff8ec'],
      disk: { inner: 6, outer: 22, tilt: 80, roll: -12, gain: 1, beaming: 3, streaks: 1, speed: 1, spin: 1 },
      ring: 1, glow: 1, warm: .8, shadow: true
    },
    neutron: {
      size: [3.2, 10], ramp: ['#14204a', '#2f5bd8', '#61c8ff', '#d6f6ff', '#ffffff'],
      disk: false, ring: 0, glow: 1.1, warm: .6,
      star: { radius: 5, color: '#9fc4ff', hot: '#ffffff', spots: 1 },
      beams: { color: '#7fe8ff', tilt: 24, angle: 52, period: 2.4, length: 30, width: .085, gain: 1 }
    },
    wormhole: {
      size: [4.4, 13.5], ramp: ['#1d0b3d', '#5b2bd1', '#3fd6e8', '#c9fbff', '#ffffff'],
      disk: false, ring: 1.6, glow: 1.2, warm: .5,
      throat: { bg: '#1a1240', ink: '#f2e9ff', reach: 1.5 }
    }
  };
  EH.KINDS = KINDS;
  function merge(a, b) {
    if (b === false) return false;
    if (b === undefined) return a && typeof a === 'object' && !Array.isArray(a) ? merge({}, a) : a;
    if (!a || typeof a !== 'object' || Array.isArray(b) || typeof b !== 'object' || b === null) return b;
    var o = {}, k;
    for (k in a) o[k] = a[k];
    for (k in b) o[k] = merge(a[k], b[k]);
    return o;
  }
  function rgb(c) {
    if (Array.isArray(c)) return c;
    if (typeof c === 'string' && c[0] === '#') {
      var h = c.length === 4 ? c.replace(/#(.)(.)(.)/, '#$1$1$2$2$3$3') : c;
      return [parseInt(h.substr(1, 2), 16) / 255, parseInt(h.substr(3, 2), 16) / 255, parseInt(h.substr(5, 2), 16) / 255];
    }
    var m = /rgba?\(([^)]+)\)/.exec(String(c));
    if (m) { var p = m[1].split(/[ ,/]+/).map(parseFloat); return [p[0] / 255, p[1] / 255, p[2] / 255]; }
    return [1, 1, 1];
  }

  // ================================================================== shaders
  function num(x) { var s = String(+x.toFixed(6)); return s.indexOf('.') < 0 && s.indexOf('e') < 0 ? s + '.' : s; }
  var CONSTS = 'const float PI=3.14159265,BC=' + num(BC) + ',BA=' + num(BA) + ',BU=' + num(BU) + ',PHIM=' + num(PHIM) +
    ',D=' + num(D) + ',THE=' + num(THE) + ',T0=' + num(T0) + ',T1=' + num(T1) + ',EXT=' + num(EXT) + ',NA=' + num(NA) + ';';

  // Shared GLSL: the object's own light at impact parameter b, screen direction e2 (y down). Premultiplied RGBA.
  var EMIT = [
    '#version 300 es', 'precision highp float;', 'precision highp sampler2D;', CONSTS,
    'uniform sampler2D uU;',
    'uniform float uTime,uFlare;uniform int uKind;',
    'uniform vec3 uRamp[5];',
    'uniform vec4 uDisk;',    // inner, outer, cos(tilt), sin(tilt)
    'uniform vec4 uDisk2;',   // roll, gain, beaming, spin (+1 / −1)
    'uniform vec4 uDisk3;',   // streaks, speed, ring gain, disk on
    'uniform vec4 uStar;',    // surface b, radius, spot gain, beam gain
    'uniform vec3 uStarCol,uStarHot,uBeamCol,uMag;uniform vec2 uBeamWL;',
    'vec3 ramp(float x){x=clamp(x,0.,1.)*4.;int i=int(min(floor(x),3.));float f=x-float(i);return mix(uRamp[i],uRamp[i+1],f*f*(3.-2.*f));}',
    'float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}',
    // value noise, periodic in x (period per)
    'float vnp(vec2 p,float per){vec2 i=floor(p),f=fract(p),w=f*f*(3.-2.*f);float x0=mod(i.x,per),x1=mod(i.x+1.,per);',
    ' return mix(mix(h21(vec2(x0,i.y)),h21(vec2(x1,i.y)),w.x),mix(h21(vec2(x0,i.y+1.)),h21(vec2(x1,i.y+1.)),w.x),w.y);}',
    // gas: long along the orbit, fine across it. A in turns, L = log radius.
    'float gas(float A,float L){return .55*vnp(vec2(A*7.,L),7.)+.3*vnp(vec2(A*17.+3.,L*2.3+5.),17.)+.15*vnp(vec2(A*41.+7.,L*5.3+1.),41.);}',
    // Keplerian shear (Ω ∝ r^-1.5) winds the pattern up, so two copies restart half a period apart and cross-fade.
    'float flowGas(float th,float r,float t){float om=pow(r,-1.5)*uDisk3.y*uDisk2.w*.9;float P=8.;',
    ' float p1=fract(t/P),p2=fract(t/P+.5),w=abs(2.*p1-1.);float A=th/(2.*PI),L=log(r)*9.;',
    ' return mix(gas(A-om*p1*P,L),gas(A-om*p2*P+.37,L+17.),w);}',
    // the disk where the ray crosses its plane at orbit angle phi (radius 1/u)
    'vec4 diskAt(float u,float phi,vec3 e3){',
    ' if(u<=1e-4)return vec4(0.);float r=1./u,rin=uDisk.x,rout=uDisk.y;',
    ' float m=smoothstep(rin*.97,rin*1.07,r)*(1.-smoothstep(rout*.6,rout*1.05,r));if(m<=0.)return vec4(0.);',
    ' vec3 P=r*(sin(phi)*e3+vec3(0.,0.,cos(phi)));float ci=uDisk.z,si=uDisk.w;',
    ' float th=atan(P.y*ci-P.z*si,P.x);',
    ' float v=min(inversesqrt(max(r-2.,.6)),.7);float tz=-cos(th)*si*uDisk2.w;',          // orbital velocity toward the viewer
    ' float dop=sqrt(1.-v*v)/(1.-v*tz);float g=dop*sqrt(max(1.-2./r,0.));',                // Doppler × gravitational shift
    ' float prof=pow(rin/r,1.6)*(1.5-.6*sqrt(rin/r))*3.;',
    ' float n=smoothstep(.22,.86,flowGas(th,r,uTime));',
    ' float I=m*prof*pow(g,uDisk2.z)*mix(1.,.3+1.45*n*n,uDisk3.x)*uDisk2.y*(1.+1.3*uFlare);',
    ' float a=1.-exp(-4.8*I);return vec4(ramp(I*.5)*a,a);}',
    'vec4 emit(float b,vec2 e2){',
    ' vec4 acc=vec4(0.);float cr=cos(uDisk2.x),sr=sin(uDisk2.x);',
    ' vec2 e=vec2(e2.x,-e2.y);e=vec2(cr*e.x-sr*e.y,sr*e.x+cr*e.y);vec3 e3=vec3(e,0.);',
    ' bool surf=uKind==1&&b<uStar.x;',
    // photon ring: light that circled the photon sphere, brighter on the approaching side
    ' if(uKind!=1){float ring=exp(-pow((b-BC-.13)/.1,2.))*(.62+.38*(-e.x*uDisk2.w))*uDisk3.z*(1.+uFlare);',
    '  acc=vec4(ramp(.85+.15*ring)*ring,clamp(ring*.9,0.,1.));}',
    // neutron star surface: limb, two hot polar caps that turn with the star
    ' if(surf){float q=b/uStar.x,mu=sqrt(max(0.,1.-q*q));vec3 nr=vec3(e*q,mu);',
    '  float sp=pow(max(dot(nr,uMag),0.),22.)+pow(max(dot(nr,-uMag),0.),22.);',
    '  float gr=vnp(vec2(atan(nr.y,nr.x)/(2.*PI)*24.+uTime*.6,length(nr.xy)*9.),24.);',   // hot surface grain, turning
    '  vec3 c=uStarCol*(.55+.45*pow(mu,.5));c=mix(c,uStarHot,clamp(.55*pow(mu,1.6)+sp*uStar.z+.12*gr,0.,1.));c+=uStarCol*pow(1.-mu,6.)*.8;',
    '  float aa=1.-smoothstep(uStar.x-.12,uStar.x,b);acc=vec4(c*aa,aa);}',
    // accretion disk: up to three crossings (back to front) — the far side lensed over the top, the thin arc under it
    ' if(uDisk3.w>.5&&b<BU){float ph0=atan(uDisk.z,-e.y*uDisk.w);',
    '  for(int k=2;k>=0;k--){if(surf&&k>0)continue;float phi=ph0+float(k)*PI;if(phi>PHIM)continue;',
    '   float u=textureLod(uU,vec2(b/BU,phi/PHIM),0.).r;vec4 dk=diskAt(u,phi,e3);acc=acc*(1.-dk.a)+dk;}}',
    // pulsar beams: two cones along the magnetic axis, drawn in screen space; a flash when one points at you
    ' if(uKind==1&&uStar.w>0.){vec2 m2=uMag.xy;float L=length(m2);vec2 md=L>1e-3?m2/L:vec2(0.,1.);vec2 p=e*b;',
    '  for(int s=0;s<2;s++){float sg=s==0?1.:-1.;float al=dot(p,md*sg);float pe=abs(p.x*md.y-p.y*md.x);',
    '   float len=uBeamWL.y*(.25+.75*L);float w=uBeamWL.x*al+.9;',
    '   float I=exp(-pow(pe/w,2.))*smoothstep(uStar.x*.6,uStar.x*1.4,al)*(1.-smoothstep(len*.35,len,al))*(.5+.5*L);',
    '   float fl=pow(max(sg*uMag.z,0.),10.)*exp(-b/9.)*1.6;',
    '   float J=(I*.9+fl)*uStar.w*(1.+uFlare);acc.rgb+=mix(uBeamCol,vec3(1.),clamp(J*.35,0.,.6))*J;acc.a=clamp(acc.a+J*.45,0.,1.);}}',
    ' return acc;}'
  ].join('\n');

  // the page through the lens
  var FS_LENS = EMIT + '\n' + [
    'uniform sampler2D uPage,uA,uEm;uniform vec2 uRes,uHole;uniform float uS,uBloom,uWarm,uShadow,uReach;',
    'uniform vec3 uPaper,uThBg,uThInk;out vec4 o;',
    'float alphaTab(float b){float t=pow(clamp((b-BC)/(BA-BC),0.,1.),1./3.);float x=t*NA-.5;float i=clamp(floor(x),0.,NA-2.);float f=clamp(x-i,0.,1.);',
    ' return mix(texelFetch(uA,ivec2(int(i),0),0).r,texelFetch(uA,ivec2(int(i)+1,0),0).r,f);}',
    'vec3 pageAt(vec2 uv){vec2 m=step(vec2(0.),uv)*step(uv,vec2(1.));return mix(uPaper,texture(uPage,uv).rgb,m.x*m.y);}',
    'void main(){',
    ' vec2 f=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);vec2 d=f-uHole;float bp=length(d),b=bp/uS;vec2 e2=d/max(bp,1e-4);',
    ' vec3 col;',
    ' if(b>=T1)col=texture(uPage,f/uRes).rgb;',
    ' else{float a=alphaTab(max(b,BC+1e-3))*(1.-smoothstep(T0,T1,b));a=min(a,1.36);',
    '  float beta=b/cos(a)-D*tan(a);col=pageAt((uHole+e2*beta*uS)/uRes);}',
    ' float px=1./uS;',
    ' if(uKind==0)col*=mix(1.,smoothstep(BC-px,BC+px,b),uShadow);',
    // wormhole: through the throat, the page again as the far side sees it (mirrored, in the throat's colours)
    ' if(uKind==2&&b<BC+px){float rho=clamp(b/BC,0.,.999);float far=tan(rho*1.38)*BC*uReach;',
    '  vec3 c2=pageAt((uHole-e2*far*uS)/uRes);float ink=smoothstep(.06,.42,distance(c2,uPaper));',
    '  vec3 th=mix(uThBg,uThInk,ink)*(.62+.38*sqrt(1.-rho*rho))+ramp(.7)*pow(rho,6.)*.9;',
    '  col=mix(th,col,smoothstep(BC-px,BC+px,b));}',
    // bloom: the emission buffer, blurred through its mips; it tints the paper and adds light
    ' if(b<EXT){vec2 eu=vec2(d.x,-d.y)/uS/(2.*EXT)+.5;',
    '  vec3 bl=textureLod(uEm,eu,1.5).rgb*.45+textureLod(uEm,eu,3.).rgb*.7+textureLod(uEm,eu,4.5).rgb*.85+textureLod(uEm,eu,6.).rgb*.7;',
    '  bl*=(1.-smoothstep(EXT*.7,EXT,b))*uBloom;',
    '  float lb=max(max(bl.r,bl.g),bl.b);vec3 tint=bl/max(lb,1e-3);',
    '  col*=mix(vec3(1.),tint,clamp(lb*uWarm,0.,.75));col+=bl*(1.-col)*.85;}',
    ' vec4 g=emit(b,e2);col=col*(1.-g.a)+g.rgb;',
    ' o=vec4(col,1.);}'
  ].join('\n');
  // the emission alone, small, for the bloom
  var FS_EM = EMIT + '\n' + 'out vec4 o;void main(){vec2 d=(gl_FragCoord.xy/256.-.5)*2.*EXT;d.y=-d.y;float b=length(d);vec4 g=emit(b,d/max(b,1e-4));o=vec4(g.rgb*.55,1.);}';
  var FS_BLIT = '#version 300 es\nprecision highp float;in vec2 vUv;uniform sampler2D uPage;out vec4 o;void main(){o=vec4(texture(uPage,vec2(vUv.x,1.-vUv.y)).rgb,1.);}';

  // Swallowed pieces. a0 = home x, home y (page CSS px), start time, duration; a1 = lag (0 near side … 1 far side), strand id.
  var VS_BITS = [
    '#version 300 es', 'precision highp float;', CONSTS,
    'layout(location=0) in vec4 a0;layout(location=1) in vec2 a1;',
    'uniform vec2 uView,uHole;uniform float uS,uT,uRet,uSpin,uEnd;',
    'out vec2 vHome;out float vHeat,vFade,vTau,vId;',
    'void main(){',
    ' float tau=clamp((uT-a0.z)/a0.w,0.,1.);',
    ' if(uRet>=0.)tau=min(tau,1.-clamp((uT-uRet-a1.x*.45)/(a0.w*.85),0.,1.));',
    ' vec2 q=a0.xy-uHole;float beta=max(length(q),1e-3);vec2 dir=q/beta;float thE=THE*uS;',
    // start where the word is seen: the outer image of a point lens (b² − βb − θE² = 0), faded like the page lens
    ' float bi=.5*(beta+sqrt(beta*beta+4.*thE*thE));float r0=mix(beta,bi,1.-smoothstep(T0*uS,T1*uS,bi));',
    ' float rEnd=uS*uEnd;r0=max(r0,rEnd*1.06);',
    ' float k=pow(tau,2.2);float r=mix(r0,rEnd,k);',
    ' float turn=min(1.15*(pow(r0/r,1.5)-1.),mix(8.5,2.4,smoothstep(2.*thE,6.*thE,r0)));',
    ' float ang=atan(dir.y,dir.x)+uSpin*turn;vec2 P=uHole+vec2(cos(ang),sin(ang))*r;',
    ' gl_Position=vec4(P.x/uView.x*2.-1.,1.-P.y/uView.y*2.,0.,1.);',
    ' vHome=a0.xy;vTau=tau;vId=a1.y;',
    ' vHeat=smoothstep(thE*2.2,thE*.6,r)*smoothstep(0.,.12,tau);',
    ' vFade=(1.-smoothstep(.88,1.,tau))*smoothstep(rEnd,rEnd*1.4,r);}'
  ].join('\n');
  var FS_BITS = [
    '#version 300 es', 'precision highp float;',
    'uniform sampler2D uSnap;uniform vec2 uView;uniform vec3 uPaper,uRamp[5];in vec2 vHome;in float vHeat,vFade,vTau,vId;out vec4 o;',
    'vec3 ramp(float x){x=clamp(x,0.,1.)*4.;int i=int(min(floor(x),3.));float f=x-float(i);return mix(uRamp[i],uRamp[i+1],f);}',
    'void main(){vec3 c=texture(uSnap,vHome/uView).rgb;float ink=smoothstep(.05,.3,distance(c,uPaper));',
    // stretch: page area per screen pixel. Ink pulled to five times its length is a fifth as dense, and glows as it thins.
    ' float J=abs(dFdx(vHome).x*dFdy(vHome).y-dFdx(vHome).y*dFdy(vHome).x);',
    ' float dens=mix(clamp(sqrt(J)*1.1,0.,1.),1.,1.-smoothstep(.03,.3,vTau));',
    ' float strand=1.-smoothstep(.6,1.5,fwidth(vId));',
    ' float heat=max(vHeat*smoothstep(.15,.6,vTau),(1.-dens)*.85);',
    ' vec3 col=mix(c,ramp(.3+.5*heat),smoothstep(0.,.5,heat));',
    ' float a=ink*vFade*mix(dens,1.,.12)*mix(1.,strand,smoothstep(.1,.4,vTau));o=vec4(col*a,a);}'
  ].join('\n');

  // ================================================================== sound (Web Audio only; off until the toggle)
  function Sound(cfg) {
    cfg = merge({ root: 110, scale: [0, 2, 4, 7, 9, 12, 14, 16], bed: .5, timbre: 'sine', pulse: false }, cfg || {});
    var ctx = null, out, bedG, airG, airF, airP, rum, nodes = {}, seq = 0, last = 0, on = false;
    function note(i) { var sc = cfg.scale, o = Math.floor(i / sc.length); return cfg.root * 2 * Math.pow(2, (sc[((i % sc.length) + sc.length) % sc.length] + 12 * o) / 12); }
    function noiseBuf(sec) {
      var n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), r = HIC.rng(7), p = 0;
      for (var i = 0; i < n; i++) { p = .97 * p + .03 * (r() * 2 - 1); d[i] = p * 6 + (r() * 2 - 1) * .15; }
      return b;
    }
    function build() {
      ctx = new (root.AudioContext || root.webkitAudioContext)();
      out = ctx.createGain(); out.gain.value = 0;
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 5;
      out.connect(comp); comp.connect(ctx.destination);
      // bed: root, fifth and octave, each breathing on its own slow LFO, through a low-pass
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
      bedG = ctx.createGain(); bedG.gain.value = 0; lp.connect(bedG); bedG.connect(out);
      [[.5, .5, .05], [.75, .22, .07], [1, .3, .043], [1.5, .12, .09], [2, .06, .061]].forEach(function (p) {
        var o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
        o.type = cfg.timbre; o.frequency.value = cfg.root * p[0]; g.gain.value = p[1]; l.frequency.value = p[2]; lg.gain.value = p[1] * .4;
        l.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(lp); o.start(); l.start();
      });
      var nb = noiseBuf(3);
      rum = ctx.createBufferSource(); rum.buffer = nb; rum.loop = true; rum.playbackRate.value = .4;
      var rf = ctx.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 120; var rg = ctx.createGain(); rg.gain.value = .5;
      rum.connect(rf); rf.connect(rg); rg.connect(lp); rum.start();
      // air: band-passed noise that rises with the speed of the object, panned to where it is
      var air = ctx.createBufferSource(); air.buffer = nb; air.loop = true;
      airF = ctx.createBiquadFilter(); airF.type = 'bandpass'; airF.frequency.value = 300; airF.Q.value = 1.2;
      airG = ctx.createGain(); airG.gain.value = 0; airP = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      air.connect(airF); airF.connect(airG); airG.connect(airP); airP.connect(out); air.start();
      nodes.noise = nb;
    }
    function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + dec); }
    // a gulp: a note that sinks a fifth, with a slurp of noise
    function gulp(i, size, len) {
      if (!on) return; var t = ctx.currentTime; if (t - last < .04) return; last = t;
      var f = note(i), o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o2.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .667, t + len);
      o2.frequency.setValueAtTime(f * 2, t); o2.frequency.exponentialRampToValueAtTime(f * 1.33, t + len);
      var g2 = ctx.createGain(); g2.gain.value = .25; o2.connect(g2); g2.connect(g);
      o.connect(g); g.connect(out); env(g, t, .01, .16 + .14 * size, len + .3); o.start(t); o2.start(t); o.stop(t + len + .5); o2.stop(t + len + .5);
      var n = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain(); n.buffer = nodes.noise;
      nf.type = 'bandpass'; nf.Q.value = 3; nf.frequency.setValueAtTime(1400, t); nf.frequency.exponentialRampToValueAtTime(180, t + len);
      n.connect(nf); nf.connect(ng); ng.connect(out); env(ng, t, .02, .05 + .1 * size, len); n.start(t); n.stop(t + len + .2);
    }
    var api = {
      get enabled() { return on; },
      enable: function () { if (!ctx) build(); ctx.resume(); on = true; out.gain.setTargetAtTime(.8, ctx.currentTime, .3); },
      disable: function () { if (!ctx) return; on = false; out.gain.setTargetAtTime(0, ctx.currentTime, .15); },
      update: function (s) { if (!on) return; var t = ctx.currentTime;
        bedG.gain.setTargetAtTime(cfg.bed * s.g * (.35 + .65 * s.mass), t, .4);
        var sp = Math.min(1, s.speed / 1500); airG.gain.setTargetAtTime(sp * .35, t, .08); airF.frequency.setTargetAtTime(220 + sp * 900, t, .1);
        if (airP.pan) airP.pan.setTargetAtTime(Math.max(-1, Math.min(1, s.x * 2 - 1)) * .7, t, .1); },
      swallow: function (size) { seq = (seq + 1) % 12; gulp(cfg.scale.length + 5 - (seq % 7), size, .22 + .2 * size); },
      feed: function () { seq = 0; gulp(cfg.scale.length + 4, 1, .7); },
      giveBack: function () { if (!on) return; var t = ctx.currentTime;
        for (var i = 0; i < 6; i++) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = note(i * 2);
          o.connect(g); g.connect(out); env(g, t + i * .09, .01, .09, .5); o.start(t + i * .09); o.stop(t + i * .09 + .7); } },
      thump: function (k) { if (!on) return; var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(cfg.root * .7, t);
        o.frequency.exponentialRampToValueAtTime(cfg.root * .4, t + .25); o.connect(g); g.connect(out); env(g, t, .01, .22 * k, .35); o.start(t); o.stop(t + .5); },
      tick: function () { if (!on || !cfg.pulse) return; var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = note(cfg.scale.length * 2);
        var f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900; o.connect(f); f.connect(g); g.connect(out); env(g, t, .002, .05, .06); o.start(t); o.stop(t + .1); }
    };
    return api;
  }
  EH.Sound = Sound;

  // ================================================================== the page
  EH.create = function (cfg) {
    cfg = cfg || {};
    var $ = function (s) { return typeof s === 'string' ? doc.querySelector(s) : s; };
    var canvas = $(cfg.canvas || '#stage'), page = $(cfg.page || '#page');
    var eatRoot = $(cfg.eatRoot) || page;
    var ATOM = cfg.atoms || '[data-eh-atom]';
    var ctl = cfg.controls || {};
    var dock = $(cfg.dock || '[data-eh-dock]');
    var on = cfg.on || function () {};
    var style = doc.createElement('style');
    style.textContent = '[data-eh-eaten]{visibility:hidden!important}html.eh-grab,html.eh-grab *{cursor:grab!important}html.eh-grabbing,html.eh-grabbing *{cursor:grabbing!important;user-select:none!important}';
    doc.head.appendChild(style);

    // ---- fallback: the same HTML as an ordinary page
    if (!HIC.supported('webgl')) {
      HIC.fallback(canvas, { note: cfg.fallbackNote });
      if (dock) { dock.hidden = true; dock.style.display = 'none'; } // a page's own display rule would beat [hidden]
      var hf = $(cfg.hint && cfg.hint.el); if (hf) { hf.hidden = true; hf.style.display = 'none'; }
      var ff = cfg.feed && $(cfg.feed.form);
      if (ff) ff.addEventListener('submit', function (e) { e.preventDefault(); var i = $(cfg.feed.input), tr = $(cfg.feed.tray); if (i && tr && i.value.trim()) { var s = doc.createElement('span'); s.textContent = i.value.trim(); tr.appendChild(s); i.value = ''; } });
      return null;
    }

    var kindName = HIC.param('kind') || (cfg.object && cfg.object.kind) || 'blackhole';
    if (!KINDS[kindName]) kindName = 'blackhole';
    // a #kind= override previews another object with that kind's own defaults; otherwise the topic's object wins
    var O = HIC.param('kind') && HIC.param('kind') !== (cfg.object && cfg.object.kind) ? merge(KINDS[kindName], {}) : merge(KINDS[kindName], cfg.object || {});
    var KIND = { blackhole: 0, neutron: 1, wormhole: 2 }[kindName];
    var qh = parseFloat(HIC.param('q'));
    var S = HIC.stage(canvas, { quality: qh > 0 ? Math.min(1, qh) : 1, gl: { antialias: false, depth: false, stencil: false } });
    var gl = S.gl, G = HIC.gl;
    var T = tables();
    var paper = rgb(cfg.paper || root.getComputedStyle(page).backgroundColor);
    var rampF = new Float32Array(15); (O.ramp || KINDS.blackhole.ramp).forEach(function (c, i) { var v = rgb(c); rampF.set(v, i * 3); });

    // ---- GL resources
    var pLens = G.program(gl, null, FS_LENS), pEm = G.program(gl, null, FS_EM), pBlit = G.program(gl, null, FS_BLIT);
    var pBits = G.program(gl, VS_BITS, FS_BITS);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); // float uploads below would be dropped otherwise
    var texU = G.texture(gl, { w: NB, h: NP, internal: gl.R16F, format: gl.RED, type: gl.FLOAT, data: T.ut });
    var texA = G.texture(gl, { w: NA, h: 1, internal: gl.R32F, format: gl.RED, type: gl.FLOAT, data: T.al, filter: 'nearest' }); // read exactly, like the JS lens
    var em = G.target(gl, 256, 256);
    gl.bindTexture(gl.TEXTURE_2D, em.tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.generateMipmap(gl.TEXTURE_2D);
    var texPage = G.texture(gl, { mips: true }), texSnap = null, fboPage = gl.createFramebuffer(), TW = 0, TH = 0, have = false;

    // ---- state (CSS px)
    var E = {
      kind: kindName, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, s: 0, mass: cfg.mass !== undefined ? cfg.mass : (O.mass !== undefined ? O.mass : .45),
      g: 1, gT: 1, bonus: 0, bonusT: 0, flare: 0, flareT: 0, t: 0, speed: 0, drag: false, touched: false, eaten: 0, ret: -1, retEnd: 0,
      hungry: false, rest: [0, 0], frozen: HIC.still !== null, drawn: 0, moved: 0,
      phase: HIC.still !== null ? HIC.still / (((cfg.object || {}).beams || {}).period || 2.4) : 0
    };
    var snd = Sound(cfg.sound);
    var afterPaint = [], dirty = true;

    function sizeK() { return Math.max(.52, Math.min(1, Math.min(S.W, S.H * 1.7) / 1250)); }
    function baseS() { var a = O.size || [3.4, 11.5]; return (a[0] + (a[1] - a[0]) * Math.pow(E.mass, 1.2)) * sizeK(); }
    function scale() { return baseS() * (1 + E.bonus) * (E.g < .004 ? 0 : E.g); }
    function bInner() { return KIND === 1 ? O.star.radius / Math.sqrt(1 - 2 / O.star.radius) : BC; }

    // ---- the lens in JS: the page point (page CSS px) whose light reaches screen point (x, y); null where no page shows
    function sourceOf(x, y) {
      var s = E.s; if (s < .3) return [x, y];
      var dx = x - E.x, dy = y - E.y, bp = Math.hypot(dx, dy), b = bp / s;
      if (b >= T1) return [x, y];
      if (b <= bInner() * 1.02) return null;
      var a = alphaOf(b) * (1 - smooth(T0, T1, b));
      if (a > ACLICK) return null;
      var k = (b / Math.cos(a) - D * Math.tan(a)) * s / bp;
      return [E.x + dx * k, E.y + dy * k];
    }
    // the screen point where page point q is seen (the outer image), for checks and the hint
    function screenOf(q) {
      if (E.s < .3) return q.slice();
      var dx = q[0] - E.x, dy = q[1] - E.y, beta = Math.hypot(dx, dy) || 1e-3, thE = THE * E.s;
      var bi = .5 * (beta + Math.sqrt(beta * beta + 4 * thE * thE)), r0 = beta + (bi - beta) * (1 - smooth(T0 * E.s, T1 * E.s, bi));
      var p = [E.x + dx / beta * r0, E.y + dy / beta * r0];
      for (var i = 0; i < 40; i++) { var s = sourceOf(p[0], p[1]); if (!s) break; p[0] += (q[0] - s[0]) * .6; p[1] += (q[1] - s[1]) * .6; }
      return p;
    }

    // ---- measuring the page: rects are taken with the hit-test placement removed (it transforms the page in CSS mode)
    var pointer = null;
    function measure(fn) {
      var tr = page.style.transform, r;
      if (S.mode === 'geo') { try { canvas.updateElementGeometry(page, { canvasTransform: new DOMMatrix() }); } catch (e) {} }
      else page.style.transform = 'none';
      try { r = fn(page.getBoundingClientRect()); } finally {
        if (S.mode === 'geo') placePointer(true); else page.style.transform = tr;
      }
      return r;
    }
    function rel(o, r) { return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height }; }

    // ---- hit testing: slide the real page under the pointer with the lens's local affine
    function placePointer(force) {
      if (!have || E.drag) return;
      if (!pointer) { if (force) S.place(page, [1, 0, 0, 1, 0, 0]); return; }
      S.placeLocal(page, pointer[0], pointer[1], sourceOf);
    }
    function overHole(x, y) { return E.s > .8 && Math.hypot(x - E.x, y - E.y) < Math.max(24, E.s * bInner() * 1.7); }

    // ---- uploads: only when the browser says the page changed
    S.onPaint(function () {
      var r = S.upload(page, texPage); if (!r) return;
      if (r.w !== TW || r.h !== TH) {
        if (TW) finishAll();
        TW = r.w; TH = r.h;
        if (texSnap) gl.deleteTexture(texSnap);
        texSnap = G.texture(gl, { w: TW, h: TH });
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboPage);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texPage, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      have = true; dirty = true;
      if (afterPaint.length) { var l = afterPaint; afterPaint = []; l.forEach(function (f) { f(); }); }
      if (!E.ready0) { E.ready0 = true; boot(); }
    });

    // ================================================================ swallowed pieces
    var FL = 6, MAXV = 262144, MAXI = MAXV * 6, vd = new Float32Array(MAXV * FL), id = new Uint32Array(MAXI);
    var vc = 0, ic = 0, vsent = 0, isent = 0, lastFall = 0, rng = HIC.rng(cfg.seed || 1977);
    var vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, vd.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, FL * 4, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, FL * 4, 16);
    var ibuf = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, id.byteLength, gl.DYNAMIC_DRAW);
    gl.bindVertexArray(null);
    function clearBits() { vc = ic = vsent = isent = 0; dirty = true; }

    // tear rectangle r (page CSS px) off the page: copy its pixels aside and hang them on a mesh that falls in
    function tear(r, slow) {
      if (!have || !texSnap) return;
      r = { x: r.x - 2, y: r.y - r.h * .08, w: r.w + 4, h: r.h * 1.16 };
      var kx = TW / S.W, ky = TH / S.H;
      var x0 = Math.max(0, Math.floor(r.x * kx) - 2), y0 = Math.max(0, Math.floor(r.y * ky) - 2);
      var x1 = Math.min(TW, Math.ceil((r.x + r.w) * kx) + 2), y1 = Math.min(TH, Math.ceil((r.y + r.h) * ky) + 2);
      if (x1 <= x0 || y1 <= y0) return;
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fboPage); gl.bindTexture(gl.TEXTURE_2D, texSnap);
      gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, x0, y0, x0, y0, x1 - x0, y1 - y0);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      var cs = Math.max(2.4, Math.sqrt(r.w * r.h / 4200)), nx = Math.max(1, Math.round(r.w / cs)), ny = Math.max(1, Math.round(r.h / cs));
      if (vc + (nx + 1) * (ny + 1) > MAXV || ic + nx * ny * 6 > MAXI) return;
      var cx = r.x + r.w / 2, cy = r.y + r.h / 2, dist = Math.hypot(cx - E.x, cy - E.y);
      var dur = (slow ? 1.8 : 1.1) + Math.min(1.2, dist / 850), now = E.t;
      var nxp = Math.max(r.x, Math.min(E.x, r.x + r.w)), nyp = Math.max(r.y, Math.min(E.y, r.y + r.h));
      var nmin = Math.hypot(nxp - E.x, nyp - E.y), span = Math.hypot(r.w, r.h) + 1, ph = rng() * 6.283, base = vc, i, j;
      var angC = Math.atan2(cy - E.y, cx - E.x), K = Math.max(60, dist) / 3, off = rng() * 50;
      for (j = 0; j <= ny; j++) for (i = 0; i <= nx; i++) {
        var o = vc * FL, x = r.x + r.w * i / nx, y = r.y + r.h * j / ny, near = Math.hypot(x - E.x, y - E.y), ang = Math.atan2(y - E.y, x - E.x);
        // near side first; neighbouring directions leave a little apart, which pulls the sheet into strands
        var lag = Math.max(0, near - nmin) / span;
        var da = ang - angC; da -= Math.round(da / 6.2831853) * 6.2831853;
        vd[o] = x; vd[o + 1] = y; vd[o + 2] = now + .05 + lag * .75 + .014 * Math.sin(ang * 9 + ph); vd[o + 3] = dur; vd[o + 4] = lag; vd[o + 5] = off + da * K;
        vc++;
      }
      for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
        var a = base + j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
        id[ic++] = a; id[ic++] = b; id[ic++] = c; id[ic++] = b; id[ic++] = d; id[ic++] = c;
      }
      lastFall = Math.max(lastFall, now + dur + 1.3);
    }

    // ---- eating: words of eatRoot (text) and atoms (whole elements)
    var items = null;
    new MutationObserver(function () { items = null; }).observe(eatRoot, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['data-eh-eaten', 'class', 'hidden'] });
    function index() {
      return measure(function (o) {
        var list = [], range = doc.createRange(), n;
        var tw = doc.createTreeWalker(eatRoot, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: function (n) {
          if (n.nodeType === 1) {
            if (n.hasAttribute('data-eh-eaten') || n.hasAttribute('data-eh-keep') || n.hidden) return NodeFilter.FILTER_REJECT;
            if (n.matches(ATOM)) { var rr = n.getBoundingClientRect(); if (rr.width) list.push({ el: n, r: rel(o, rr) }); return NodeFilter.FILTER_REJECT; }
            return NodeFilter.FILTER_SKIP;
          }
          return NodeFilter.FILTER_ACCEPT;
        } });
        while ((n = tw.nextNode())) {
          var re = /\S+/g, m;
          while ((m = re.exec(n.data))) {
            range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
            var r = range.getBoundingClientRect();
            if (r.width > 0) list.push({ node: n, a: m.index, b: m.index + m[0].length, r: rel(o, r) });
          }
        }
        return list;
      });
    }
    // keep: tear a copy off and let it fall, but leave the element on the page (a fed word that stays in the record)
    function swallow(it, slow, keep) {
      tear(it.r, slow);
      if (keep) { E.flareT = Math.min(1.6, E.flareT + .5); snd.feed(); dirty = true; on('feed', it); return; }
      if (it.el) it.el.setAttribute('data-eh-eaten', '');
      else {
        var range = doc.createRange(), sp = doc.createElement('span');
        try { range.setStart(it.node, it.a); range.setEnd(it.node, it.b); sp.setAttribute('data-eh-eaten', 'w'); range.surroundContents(sp); } catch (e) { return; }
      }
      var area = it.r.w * it.r.h;
      E.flareT = Math.min(1.6, E.flareT + .3 + area / 60000);
      E.eaten++; E.bonusT = Math.min(.5, E.bonusT + Math.min(.03, area / 400000));
      if (!E.introEat) { if (slow) snd.feed(); else snd.swallow(Math.min(1, area / 40000)); }
      var rb = $(ctl.restore); if (rb) rb.disabled = false;
      dirty = true;
      // a change made inside a paint callback is not reported as a new paint: ask for one on the next frame
      requestAnimationFrame(function () { S.requestPaint(); });
      if (!E.introEat) on(slow ? 'feed' : 'eat', it);
    }
    var grazeAt = 0;
    function graze() {
      if (!E.hungry || E.s < 1 || E.ret !== -1 || !have || E.t < grazeAt) return;
      grazeAt = E.t + .06;
      if (!items) items = index();
      var R = E.s * bInner() * 1.35, hit = [], i, it, r, cx, cy;
      for (i = 0; i < items.length; i++) {
        it = items[i]; r = it.r;
        cx = Math.max(r.x, Math.min(E.x, r.x + r.w)); cy = Math.max(r.y, Math.min(E.y, r.y + r.h));
        if ((cx - E.x) * (cx - E.x) + (cy - E.y) * (cy - E.y) < R * R) hit.push(it);
      }
      if (!hit.length) return;
      hit.sort(function (p, q) { return (q.a || 0) - (p.a || 0); }); // later words in a text node first, so offsets stay valid
      hit.forEach(function (it) { swallow(it); });
      items = null;
    }
    function restoreDom() {
      [].slice.call(page.querySelectorAll('[data-eh-eaten]')).forEach(function (el) {
        if (el.getAttribute('data-eh-eaten') === 'w') { var p = el.parentNode; el.replaceWith(doc.createTextNode(el.textContent)); p.normalize(); }
        else el.removeAttribute('data-eh-eaten');
      });
      E.eaten = 0; items = null; var rb = $(ctl.restore); if (rb) rb.disabled = true;
    }
    function finishAll() { restoreDom(); clearBits(); E.ret = -1; E.bonusT = 0; }
    function giveBack() {
      if (!E.eaten || E.ret >= 0) return;
      E.ret = E.t; E.bonusT = 0; setHungry(false); E.flareT = 1.1; snd.giveBack();
      var maxd = 0; for (var i = 0; i < vc; i += 61) maxd = Math.max(maxd, vd[i * FL + 3]);
      E.retEnd = E.t + maxd * .85 + .7; dirty = true;
      on('restore');
    }
    function setHungry(v) {
      E.hungry = !!v; var h = $(ctl.hungry); if (h) h.checked = E.hungry;
      if (E.hungry && E.gT === 0) setGravity(true);
    }
    function setGravity(v) {
      E.gT = v ? 1 : 0; var g = $(ctl.gravity); if (g) g.checked = !!v;
      if (!v) { giveBack(); setHungry(false); }
      dirty = true;
    }
    // feed: the word appears in the tray, is drawn once, then is torn off and falls in
    function feed(text) {
      var tr = $(cfg.feed && cfg.feed.tray); text = String(text || '').trim(); if (!text || !tr) return null;
      var fed = tr.querySelectorAll('[data-eh-fed]');
      for (var i = 0; i <= fed.length - ((cfg.feed && cfg.feed.keep) || 8); i++) fed[i].remove();
      var sp = doc.createElement('span'); sp.textContent = text; sp.setAttribute('data-eh-fed', ''); tr.appendChild(sp);
      if (cfg.feed && cfg.feed.onFeed) cfg.feed.onFeed(text, sp, E);
      if (E.gT > 0 && E.ret < 0) {
        var go = function () {
          if (!sp.isConnected || sp.hasAttribute('data-eh-eaten')) return;
          var r = measure(function (o) { return rel(o, sp.getBoundingClientRect()); });
          swallow({ el: sp, r: r }, true, !!(cfg.feed && cfg.feed.leave));
        };
        afterPaint.push(go);
        setTimeout(function () { if (afterPaint.indexOf(go) >= 0) S.requestPaint(); }, 400);
      }
      S.requestPaint();
      return sp;
    }

    // ================================================================ controls
    function bindControls() {
      var g = $(ctl.gravity), m = $(ctl.mass), h = $(ctl.hungry), rb = $(ctl.restore), so = $(ctl.sound);
      if (g) { g.checked = true; g.addEventListener('change', function () { setGravity(g.checked); }); }
      if (m) { m.value = Math.round(E.mass * 100); m.addEventListener('input', function () { E.mass = +m.value / 100; dirty = true; }); }
      if (h) { h.checked = false; h.addEventListener('change', function () { setHungry(h.checked); if (h.checked) on('hungry'); }); }
      if (rb) { rb.disabled = true; rb.addEventListener('click', giveBack); }
      if (so) { so.checked = false; so.addEventListener('change', function () { if (so.checked) snd.enable(); else snd.disable(); }); }
      var f = cfg.feed && $(cfg.feed.form), inp = cfg.feed && $(cfg.feed.input);
      if (f) f.addEventListener('submit', function (e) { e.preventDefault(); var v = inp.value.trim(); if (!v) { inp.focus(); return; } inp.value = ''; feed(v); });
      page.addEventListener('input', function (e) { if (e.isTrusted && e.target.isContentEditable) on('type', e.target); });
      doc.addEventListener('selectionchange', function () {
        var s = root.getSelection(); if (downAt && s && !s.isCollapsed && String(s).length > 2 && E.s > 1 && page.contains(s.anchorNode)) on('select', String(s));
      });
    }

    // ================================================================ pointer
    var grab = [0, 0], downAt = 0, lastMoveT = 0, redo = null, dragDist = 0;
    function local(e) { var b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }
    root.addEventListener('pointermove', function (e) {
      var p = local(e);
      if (E.drag) {
        var now = performance.now(), dt = Math.max(1, now - lastMoveT); lastMoveT = now;
        var nx = p[0] - grab[0], ny = p[1] - grab[1];
        dragDist += Math.hypot(nx - E.tx, ny - E.ty);
        E.tx = Math.max(0, Math.min(S.W, nx)); E.ty = Math.max(0, Math.min(S.H, ny));
        if (E.frozen) { E.x = E.tx; E.y = E.ty; }
        if (dragDist > 50 && !E.dragTold) { E.dragTold = true; on('drag'); }
        dirty = true; e.preventDefault(); return;
      }
      if (dock && dock.contains(e.target)) { doc.documentElement.classList.remove('eh-grab'); return; }
      pointer = p; placePointer();
      doc.documentElement.classList.toggle('eh-grab', overHole(p[0], p[1]));
    }, true);
    root.addEventListener('pointerdown', function (e) {
      downAt = 1; stopIntro();
      if (dock && dock.contains(e.target)) return;
      var p = local(e); pointer = p;
      if (e.button === 0 && overHole(p[0], p[1])) {
        E.drag = true; E.touched = true; E.dragTold = false; dragDist = 0; grab = [p[0] - E.x, p[1] - E.y]; E.tx = E.x; E.ty = E.y; E.vx = E.vy = 0;
        lastMoveT = performance.now(); hideHint(); snd.thump(.7);
        doc.documentElement.classList.add('eh-grabbing');
        try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
        e.preventDefault(); e.stopPropagation(); return;
      }
      placePointer();
      // A press with no move before it (a tap) was hit-tested before the page slid into place. If the browser picked
      // something other than what is drawn under the pointer, give the press to the drawn element ourselves.
      var el = e.isTrusted ? doc.elementFromPoint(e.clientX, e.clientY) : null; redo = null;
      if (el && el !== e.target && page.contains(el) && !(e.target && e.target.contains && e.target.contains(el))) {
        redo = el; e.preventDefault(); e.stopPropagation();
        var f = el.closest('input,button,a,textarea,select,[contenteditable]');
        if (f) { try { f.focus({ preventScroll: true }); } catch (x) {}
          if (f.isContentEditable && doc.caretRangeFromPoint) { var cr = doc.caretRangeFromPoint(e.clientX, e.clientY); if (cr) { var sl = root.getSelection(); sl.removeAllRanges(); sl.addRange(cr); } } }
      }
    }, true);
    root.addEventListener('click', function (e) {
      if (!redo || !e.isTrusted) return; var el = redo; redo = null;
      e.preventDefault(); e.stopPropagation(); if (doc.elementFromPoint(e.clientX, e.clientY) === el) el.click();
    }, true);
    function endDrag(e) {
      downAt = 0; if (!E.drag) return; E.drag = false; snd.thump(.4);
      doc.documentElement.classList.remove('eh-grabbing');
      // the fling: keep the speed of the last moves unless the pointer rested before letting go
      if (performance.now() - lastMoveT > 90 || E.frozen) { E.vx = E.vy = 0; E.tx = E.x; E.ty = E.y; }
      try { canvas.releasePointerCapture(e.pointerId); } catch (x) {}
      E.touched = true; dirty = true;
    }
    root.addEventListener('pointerup', endDrag, true); root.addEventListener('pointercancel', endDrag, true);
    root.addEventListener('keydown', function () { stopIntro(); }, true);

    // ================================================================ hint pill (outside the canvas)
    var hint = $(cfg.hint && cfg.hint.el), hintAt = cfg.hint ? (cfg.hint.after || 4) : 0;
    function hideHint() { if (hint) hint.classList.remove('on'); hintAt = 0; }

    // ================================================================ rest place and the opening
    function restPos() {
      var r = cfg.rest || [.72, .3];
      if (Array.isArray(r)) return [S.W * r[0], S.H * r[1]];
      var el = $(r); if (!el) return [S.W * .72, S.H * .3];
      return measure(function (o) {
        var rg = doc.createRange(); rg.selectNodeContents(el); var rs = rg.getClientRects(), top = rs[0] || el.getBoundingClientRect();
        var R = THE * baseS();
        var x = top.right - o.left + R * 1.15, y = top.top - o.top + top.height * .5;
        var reach = Math.max(R * 1.25, (O.disk ? O.disk.outer : 0) * baseS() * 1.02); // keep the whole disk on screen
        x = Math.min(x, S.W - reach);
        if (x < top.right - o.left + R * .55) { x = S.W - R * 1.05; y = top.top - o.top - R * .5; } // no room beside the line (phones): above its end
        return [Math.max(R * .5, x), Math.min(S.H - R * .5, y)];
      });
    }
    var intro = { on: false };
    function stopIntro() {
      if (!intro.on) return; intro.on = false; E.introEat = false;
      if (intro.stage < 3) { E.x = E.tx = E.rest[0]; E.y = E.ty = E.rest[1]; if (E.eaten) giveBack(); }
    }
    function catmull(P, t) {
      if (t <= P[0][2]) return [P[0][0], P[0][1]];
      for (var i = 1; i < P.length; i++) if (t <= P[i][2]) {
        var a = P[i - 1], b = P[i], z = P[Math.max(0, i - 2)], n = P[Math.min(P.length - 1, i + 1)], u = (t - a[2]) / (b[2] - a[2]);
        var f = function (k) { var m1 = (b[k] - z[k]) * .5, m2 = (n[k] - a[k]) * .5, u2 = u * u, u3 = u2 * u;
          return (2 * u3 - 3 * u2 + 1) * a[k] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * b[k] + (u3 - u2) * m2; };
        return [f(0), f(1)];
      }
      var l = P[P.length - 1]; return [l[0], l[1]];
    }
    function startIntro() {
      var ic = cfg.intro; if (!ic || HIC.still !== null || HIC.calm || HIC.param('nointro') !== null) return;
      if (root.navigator && root.navigator.webdriver && HIC.param('intro') === null) return;
      var el = $(ic.in); if (!el) return;
      var tn = null, m = null, w = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT), n;
      while ((n = w.nextNode())) { m = new RegExp('\\b' + ic.word + '\\b').exec(n.data); if (m) { tn = n; break; } }
      if (!tn) return;
      var wr = measure(function (o) { var rg = doc.createRange(); rg.setStart(tn, m.index); rg.setEnd(tn, m.index + m[0].length); return rel(o, rg.getBoundingClientRect()); });
      var R = THE * baseS(), wy = wr.y + wr.h * .5;
      intro = { on: true, stage: 0, t0: E.t, word: { node: tn, a: m.index, b: m.index + m[0].length, r: wr },
        path: [[S.W + R * 1.3, wy - S.H * .12, 0], [wr.x + wr.w + R * .9, wy - 8, .8], [wr.x + wr.w * .6, wy, 1.35], [wr.x + wr.w * .55, wy + 3, 2.5], [E.rest[0], E.rest[1], 3.6], [E.rest[0], E.rest[1], 3.8]] };
      E.x = E.tx = intro.path[0][0]; E.y = E.ty = intro.path[0][1]; E.bonus = E.bonusT = .35;
    }

    // ================================================================ time
    function step(dt) {
      E.t += dt;
      var it = E.t - (intro.t0 || 0);
      if (intro.on && intro.stage < 3) {
        if (intro.stage === 0 && it > 1.25) { intro.stage = 1; E.introEat = true; swallow(intro.word, true); E.introEat = false; }
        if (intro.stage === 1 && it > 2.8) { intro.stage = 2; giveBack(); }
        if (intro.stage === 2 && it > 3.8 && E.ret === -1) { intro.stage = 3; intro.on = false; E.bonusT = 0; }
      }
      if (KIND === 1 && !HIC.calm) E.phase += dt / Math.max(.2, (O.beams && O.beams.period) || 2);
      E.g += (E.gT - E.g) * Math.min(1, dt * (E.gT ? 7 : 6));
      E.bonus += (E.bonusT - E.bonus) * Math.min(1, dt * 2.5);
      E.flareT = Math.max(0, E.flareT - dt * .9); E.flare += (E.flareT - E.flare) * Math.min(1, dt * 5);
      var ox = E.x, oy = E.y;
      if (intro.on && intro.stage < 3) { var p = catmull(intro.path, it); E.x = E.tx = p[0]; E.y = E.ty = p[1]; }
      else if (E.drag) {
        // a heavy thing on a short spring: it trails the hand a little and overshoots when the hand stops
        var fq = 7.5 - 3 * E.mass, sx = HIC.spring(E.x, E.vx, E.tx, fq, .62, dt), sy = HIC.spring(E.y, E.vy, E.ty, fq, .62, dt);
        E.x = sx[0]; E.vx = sx[1]; E.y = sy[0]; E.vy = sy[1];
      } else if (Math.abs(E.vx) > 1.5 || Math.abs(E.vy) > 1.5) {
        // the fling coasts and slows; walls give a soft bounce
        E.x += E.vx * dt; E.y += E.vy * dt; var k = Math.exp(-dt * (3.2 + 2.5 * E.mass)); E.vx *= k; E.vy *= k;
        if (E.x < 0 || E.x > S.W) { E.x = Math.max(0, Math.min(S.W, E.x)); E.vx *= -.35; }
        if (E.y < 0 || E.y > S.H) { E.y = Math.max(0, Math.min(S.H, E.y)); E.vy *= -.35; }
        E.tx = E.x; E.ty = E.y;
      } else { E.vx = E.vy = 0; }
      if (dt > 0) E.speed += (Math.hypot(E.x - ox, E.y - oy) / dt - E.speed) * Math.min(1, dt * 10);
      E.s = scale();
      graze();
      if (E.ret >= 0 && E.t > E.retEnd) { restoreDom(); E.ret = -2; afterPaint.push(function () { clearBits(); E.ret = -1; }); requestAnimationFrame(function () { S.requestPaint(); }); }
      if (E.ret === -1 && vc && E.t > lastFall && !E.eaten) clearBits();
    }
    // simulate n seconds at once (checks and stills on a frozen page)
    function run(n) { var k = Math.max(1, Math.round(n * 60)); for (var i = 0; i < k; i++) step(1 / 60); dirty = true; placePointer(); return E; }

    // ================================================================ draw
    var fence = null, lastSig = '', quality = { n: 0, acc: 0, slow: 0 };
    // the pulsar's turn is integrated (E.phase, in turns), so a topic may change O.beams.period live without a jump
    function magAxis() {
      var B = O.beams || KINDS.neutron.beams, tl = B.tilt * PI / 180, ch = B.angle * PI / 180, w = 2 * PI * E.phase;
      var s = [0, Math.cos(tl), Math.sin(tl)], p = [1, 0, 0], q = HIC.vec.cross(s, p);
      var c = Math.cos(w), sn = Math.sin(w);
      return [0, 1, 2].map(function (i) { return Math.cos(ch) * s[i] + Math.sin(ch) * (c * p[i] + sn * q[i]); });
    }
    function shaderTime() { return HIC.still !== null ? HIC.still : HIC.calm ? 0 : E.t; }
    function setEmit(p, tt) {
      var u = p.u, dk = O.disk, tilt = dk ? dk.tilt * PI / 180 : 1;
      gl.uniform1f(u.uTime, tt); gl.uniform1f(u.uFlare, E.flare); gl.uniform1i(u.uKind, KIND);
      gl.uniform3fv(u.uRamp, rampF);
      gl.uniform4f(u.uDisk, dk ? dk.inner : 6, dk ? dk.outer : 20, Math.cos(tilt), Math.sin(tilt));
      gl.uniform4f(u.uDisk2, (dk ? dk.roll : 0) * PI / 180, dk ? dk.gain : 1, dk ? dk.beaming : 3, dk ? (dk.spin || 1) : 1);
      gl.uniform4f(u.uDisk3, dk ? dk.streaks : 1, dk ? dk.speed : 1, O.ring || 0, dk ? 1 : 0);
      if (KIND === 1) {
        var st = O.star, bm = O.beams || { gain: 0, width: .08, length: 30 }, m = magAxis();
        gl.uniform4f(u.uStar, bInner(), st.radius, st.spots, bm.gain === undefined ? 1 : bm.gain);
        gl.uniform3fv(u.uStarCol, rgb(st.color)); gl.uniform3fv(u.uStarHot, rgb(st.hot)); gl.uniform3fv(u.uBeamCol, rgb(bm.color || '#ffffff'));
        gl.uniform3fv(u.uMag, m); gl.uniform2f(u.uBeamWL, bm.width, bm.length);
        E.facing = Math.max(m[2], -m[2]);
      }
    }
    function draw() {
      var W = canvas.width, H = canvas.height, d = W / S.W, live = E.s >= .3, tt = shaderTime();
      gl.disable(gl.BLEND);
      if (live) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, em.fb); gl.viewport(0, 0, 256, 256);
        pEm.use(); setEmit(pEm, tt); G.bind(gl, pEm, { uU: texU }); G.fullscreen(gl);
        gl.bindTexture(gl.TEXTURE_2D, em.tex); gl.generateMipmap(gl.TEXTURE_2D);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
      if (!live) { pBlit.use(); G.bind(gl, pBlit, { uPage: texPage }); G.fullscreen(gl); }
      else {
        var u = pLens.u; pLens.use(); setEmit(pLens, tt);
        G.bind(gl, pLens, { uPage: texPage, uA: texA, uEm: em.tex, uU: texU });
        gl.uniform2f(u.uRes, W, H); gl.uniform2f(u.uHole, E.x * d, E.y * d); gl.uniform1f(u.uS, E.s * d);
        gl.uniform1f(u.uBloom, O.glow); gl.uniform1f(u.uWarm, O.warm); gl.uniform1f(u.uShadow, O.shadow === false ? 0 : 1);
        gl.uniform3fv(u.uPaper, paper);
        var th = O.throat || KINDS.wormhole.throat;
        gl.uniform3fv(u.uThBg, rgb(th.bg)); gl.uniform3fv(u.uThInk, rgb(th.ink)); gl.uniform1f(u.uReach, th.reach || 2.4);
        G.fullscreen(gl);
      }
      if (ic && live && texSnap) {
        var v = pBits.u; pBits.use(); gl.bindVertexArray(vao);
        if (vsent < vc) { gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferSubData(gl.ARRAY_BUFFER, vsent * FL * 4, vd, vsent * FL, (vc - vsent) * FL); vsent = vc; }
        if (isent < ic) { gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, isent * 4, id, isent, ic - isent); isent = ic; }
        G.bind(gl, pBits, { uSnap: texSnap });
        gl.uniform2f(v.uView, S.W, S.H); gl.uniform2f(v.uHole, E.x, E.y); gl.uniform1f(v.uS, E.s); gl.uniform1f(v.uT, E.t);
        gl.uniform1f(v.uRet, E.ret >= 0 ? E.ret : -1); gl.uniform1f(v.uSpin, O.disk ? -(O.disk.spin || 1) : -1); gl.uniform1f(v.uEnd, bInner() * 1.08);
        gl.uniform3fv(v.uPaper, paper); gl.uniform3fv(v.uRamp, rampF);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawElements(gl.TRIANGLES, ic, gl.UNSIGNED_INT, 0);
        gl.disable(gl.BLEND); gl.bindVertexArray(null);
      }
      E.drawn++;
    }

    // ================================================================ boot and loop
    var ready = false, lastNow = 0, wasFacing = 0;
    function boot() {
      S.probe(page, $(cfg.probe) || page.querySelector('[data-hic-edit]') || page.firstElementChild).then(function (mode) {
        S.place(page, [1, 0, 0, 1, 0, 0]); // the probe leaves the page at its probe offset
        E.rest = restPos(); E.x = E.tx = E.rest[0]; E.y = E.ty = E.rest[1]; E.s = scale();
        bindControls(); startIntro();
        if (HIC.still !== null && !HIC.calm) idleDrift(HIC.still);
        ready = true; dirty = true;
        S.ready({ mode: mode, kind: kindName, intro: !!intro.on });
      });
    }
    // before it is touched, the object drifts slowly beside its rest place (a function of time, so stills are exact)
    function idleDrift(t) {
      if (E.touched || intro.on || HIC.calm || E.drag) return;
      var dr = Math.max(0, t - 1);
      E.x = E.tx = E.rest[0] + S.W * .012 * Math.sin(dr * .45); E.y = E.ty = E.rest[1] + S.H * .018 * Math.sin(dr * .31 + .6);
    }
    root.addEventListener('resize', function () {
      S.resize(); page.style.width = S.W + 'px'; page.style.height = S.H + 'px';
      if (ready) { E.rest = restPos(); if (!E.touched) { E.x = E.tx = E.rest[0]; E.y = E.ty = E.rest[1]; } }
      items = null; dirty = true; S.requestPaint();
    });
    page.style.width = S.W + 'px'; page.style.height = S.H + 'px';

    S.loop(function () {
      if (!ready || !have) return;
      var now = performance.now(), dt = lastNow ? Math.min(.1, (now - lastNow) / 1000) : 1 / 60; lastNow = now;
      // frozen (#still): time stands except while a hand drags; checks and stills move it with run()
      if (!E.frozen || E.drag) step(dt);
      if (!E.frozen && !HIC.calm) idleDrift(E.t);
      if (pointer && !E.drag) placePointer();
      if (hintAt && !E.frozen && E.t > hintAt && !E.touched && hint) { hint.classList.add('on'); hintAt = 0; }
      if (hint && hint.classList.contains('on')) {
        var R = E.s * 21, hy = E.y - R - 44 < 60 ? E.y + R + 14 : E.y - R - 44;
        hint.style.transform = 'translate(' + Math.round(E.x - hint.offsetWidth / 2) + 'px,' + Math.round(hy) + 'px)';
      }
      snd.update({ g: E.g, mass: E.mass, speed: E.speed, x: E.x / S.W });
      if (KIND === 1 && E.facing !== undefined) { if (E.facing > .93 && wasFacing <= .93) snd.tick(); wasFacing = E.facing; }
      // draw only when something changed, and never queue a frame while the GPU still works on the last one
      var sig = [E.x.toFixed(2), E.y.toFixed(2), E.s.toFixed(3), shaderTime(), E.flare.toFixed(3), ic ? E.t : 0, E.phase.toFixed(4)].join(',');
      if (sig !== lastSig) dirty = true;
      if (!dirty) return;
      if (fence) {
        var st = gl.getSyncParameter(fence, gl.SYNC_STATUS);
        if (st !== gl.SIGNALED && performance.now() - fence.t0 < 400) return;
        gl.deleteSync(fence); fence = null;
      }
      dirty = false; lastSig = sig;
      var t0 = performance.now();
      draw();
      fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); if (fence) fence.t0 = performance.now(); gl.flush();
      autoQuality(performance.now() - t0, dt);
    });
    // step the backing resolution down on slow machines (not in checks or stills, which need a fixed picture)
    function autoQuality(ms, dt) {
      if (E.frozen || qh > 0 || (root.navigator && root.navigator.webdriver)) return;
      quality.acc += dt; if (++quality.n < 45) return;
      var avg = quality.acc / quality.n; quality.n = 0; quality.acc = 0;
      if (avg > .026 && S.quality > .62) { if (++quality.slow >= 2) { S.quality = Math.max(.6, S.quality * .8); quality.slow = 0; S.resize(); S.requestPaint(); } }
      else quality.slow = 0;
    }

    // ================================================================ API (also the test hook)
    var api = {
      state: E, object: O, feedLeaves: !!(cfg.feed && cfg.feed.leave), sourceOf: sourceOf, screenOf: screenOf, run: run, feed: feed, giveBack: giveBack, restore: giveBack,
      hungry: setHungry, gravity: setGravity, sound: snd, alpha: alphaOf, consts: EH.consts,
      einstein: function () { return THE * E.s; },
      moveTo: function (x, y) { E.x = E.tx = x; E.y = E.ty = y; E.vx = E.vy = 0; E.touched = true; dirty = true; placePointer(); },
      setMass: function (m) { E.mass = m; var el = $(ctl.mass); if (el) el.value = Math.round(m * 100); E.s = scale(); dirty = true; },
      pieces: function () { return vc; },
      eatenCount: function () { return page.querySelectorAll('[data-eh-eaten]').length; },
      redraw: function () { dirty = true; }
    };
    root.__hic.eh = api;
    root.__hic.screenOf = function (el) { var b = HIC.box(page, el); return screenOf([b[0] + b[2] / 2, b[1] + b[3] / 2]); };
    return api;
  };

  root.EventHorizon = EH;
})(typeof window !== 'undefined' ? window : globalThis);

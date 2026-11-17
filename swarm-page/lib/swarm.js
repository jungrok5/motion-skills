/* swarm.js — a live page whose own pixels lift off as a flock and settle back into the readable page.
 *
 * The page is ordinary HTML inside <canvas layoutsubtree content="drawable"> (see hic.js). Its pixels are uploaded as a
 * texture; every cell of a grid over the page (2–4 CSS px) is one "grain" whose home is that cell. At rest the page is
 * drawn as itself, crisp, and every word is clickable and typeable where it is drawn. On the trigger the grains gather
 * (a quiver and a crouch, rippling out from where the flight starts), lift off in a wave, form a flock and fly; on
 * landing they glide home row by row, flare, dip past their place and settle, and the page is readable again.
 *
 * The flock: a few dozen lead birds (CPU) fly by the topological rule of real murmurations — each one aligns with and
 * keeps near its SEVEN nearest neighbours, reacting a fraction of a second late, so a turn runs through the flock as a
 * wave. Their turn rate is limited (no instant flips) and they bank into turns. Every grain (GPU) is bound to one lead
 * bird and its neighbour, holds a place in that bird's frame (a sheet, a ball or a stream) and follows it on a spring
 * with its own stiffness (inertia, lag, follow-through) and a cap on acceleration. Each grain carries the colour of its
 * page pixel and is drawn as the creature of the topic (starling, bee, firefly, fish, paper plane, or your own GLSL
 * shape) with a wingbeat that flaps when climbing and glides when diving.
 *
 * Usage (see templates/index.html):
 *   var swarm = Swarm.start({ page: '#page', scene: '#scene', sky: {...}, creature: {...}, flock: {...}, trigger: {...} });
 *   swarm.fly(fromEl)  swarm.land()  swarm.recall(el, secs)  swarm.reflow(mutate, els)  swarm.sound(on)
 * Test hook: window.__swarm (manual stepping, read-back of the grains, the ripple probe). Address flags: #still=<s>
 * (frozen, composed), #calm (no idle motion, no intro), #nointro, #q=0.5 (render scale), #grains=<n>, #fallback.
 * No dependencies besides hic.js, no network. Read references/ENGINE.md.
 */
(function (root) {
  'use strict';
  var HIC = root.HIC, doc = root.document;

  // ------------------------------------------------------------------ defaults (every field can be set per topic)
  var DEFAULTS = {
    canvas: '#stage', page: '#page', scene: '#scene',
    grains: 90000,            // grains over the full page (one per cell); fewer on small screens
    seed: 7,
    sky: {                    // painted once per resize; y runs 0 (top) → 1 (bottom)
      stops: [[0, '#6f86a8'], [0.45, '#b9b3c6'], [0.75, '#f0c2a2'], [1, '#f6a77e']],
      sun: null,              // { x, y, r, color, glow } (x, y in 0..1 of the view; r in 0..1 of the height)
      moon: null,             // { x, y, r, color, glow }
      stars: 0,               // 0..1 density of twinkling stars
      clouds: { amount: 0.5, y0: 0.45, y1: 0.85, shade: '#8d7f9c', lit: '#ffb98a', scale: 1 },
      cirrus: 0.3, rays: 0, vignette: 0.22
    },
    skyB: null,               // the second light (e.g. night); with light.turn every flight turns sky ⇄ skyB
    light: { turn: false, delay: 1.4, dur: 6 },
    water: null,              // { y: 0.9, deep: '#2c2f4a', mirror: 0.8, glint: '#ffd2a8', glintX: 0.75 }
    creature: {
      shape: 'starling',      // starling | bee | firefly | fish | plane | dot | custom (glsl)
      glsl: null,             // 'float shapeCustom(vec2 p, float ph, float bank){ … return coverage; }' (x = forward)
      size: 2.6,              // sprite length in cells
      flap: 7,                // wingbeats per second (fins, glow pulses)
      glide: 0.35,            // 0 = always flapping, 1 = mostly gliding
      tint: null, tintMix: 0, // the colour birds take in the air (mixed with the page ink they carry)
      tintB: null, tintMixB: 0,
      blend: 'over',          // over | add (glowing creatures)
      haze: '#a9b0c8'         // far birds fade towards this
    },
    flock: {
      leaders: 64, shape: 'sheet',   // sheet (murmuration) | ball (swarm) | stream (school, planes)
      speed: 300, minSpeed: 150, maxTurn: 2.2,   // px/s at an 800 px tall view; rad/s
      neighbours: 7, reaction: 0.09,             // topological neighbours; seconds before a bird answers its neighbours
      align: 6, salience: 5, cohere: 1.1, separate: 1.4, goal: 1.6, wander: 0.4,
      spread: 0.5, thick: 0.18, stretch: 1.4,    // flock size (of the short side); thickness and length of a bird's place
      area: [0.08, 0.08, 0.92, 0.62],            // where the flock may roam: x0 y0 x1 y1 of the view
      depth: 0.35, follow: [5, 18], jitter: 30, startle: [5, 9]
    },
    lift: { speed: 1300, jitter: 0.45, gather: 0.38, kick: 320 },
    land: { order: 'top', span: 1.5, jitter: 0.6 },
    idle: { hops: true, every: [1.4, 3.6], sheen: 0.035 },
    trigger: { fly: null, land: null, intro: null, escape: true, startle: true },
    sound: null,              // { kind: 'wings' | 'buzz' | 'paper' | 'hum', ambience: null | 'crickets' | 'birds', toggle: '#sound' }
    onMode: null              // fn(mode) — 'rest' | 'fly' | 'land'
  };
  var SHAPES = { starling: 0, bee: 1, firefly: 2, fish: 3, plane: 4, dot: 5, custom: 6 };

  function merge(a, b) {
    var o = {}, k;
    for (k in a) o[k] = a[k];
    if (b) for (k in b) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) o[k] = merge(a[k], b[k]);
      else o[k] = b[k];
    }
    return o;
  }
  function rgb(hex) {
    if (Array.isArray(hex)) return hex;
    var h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    var n = parseInt(h, 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  // ------------------------------------------------------------------ shaders
  var COMMON = [
    '#version 300 es',
    'precision highp float; precision highp int; precision highp sampler2D;',
    'uvec3 pcg3(uvec3 v){v=v*1664525u+1013904223u;v.x+=v.y*v.z;v.y+=v.z*v.x;v.z+=v.x*v.y;v^=v>>16u;v.x+=v.y*v.z;v.y+=v.z*v.x;v.z+=v.x*v.y;return v;}',
    'vec3 h3(ivec2 p,int s){return vec3(pcg3(uvec3(uint(p.x+8192),uint(p.y+8192),uint(s))))/4294967295.0;}',
    'float inRect(vec2 p,vec4 r,float soft){vec2 d=max(r.xy-p,p-(r.xy+r.zw));return 1.-smoothstep(0.,max(soft,1e-3),max(d.x,d.y));}',
    'float gauss(vec2 u){return sqrt(-2.*log(max(u.x,1e-6)))*cos(6.2831853*u.y);}',
    // the ink a grain carries: the strongest of five taps across its cell, so 1 px rules and thin strokes fly too
    'vec4 cellInk(sampler2D t,vec2 home,float cell,vec2 size){ vec4 b=texture(t,home/size); float k=cell*0.33;',
    '  for(int i=0;i<4;i++){ vec2 o=vec2(i<2?-k:k,(i==0||i==2)?-k:k); vec4 c=texture(t,(home+o)/size); if(c.a>b.a) b=c; } return b; }'
  ].join('\n');

  // Binding, once per flight: each grain picks its lead bird (the nearest spawn) and that bird's nearest other, and its
  // lift-off time (a wave from the origin). Output: (anchor, second, blend, liftAt).
  var FS_BIND = COMMON + [
    'uniform sampler2D uLead; uniform int uN; uniform float uCell,uLiftV,uLiftJ; uniform vec2 uOrigin;',
    'out vec4 o;',
    'void main(){ ivec2 tc=ivec2(gl_FragCoord.xy); vec2 home=(vec2(tc)+.5)*uCell;',
    '  float d1=1e9,d2=1e9; int a=0,b=0;',
    '  for(int i=0;i<128;i++){ if(i>=uN) break; vec2 s=texelFetch(uLead,ivec2(i,4),0).xy; float d=dot(s-home,s-home);',
    '    if(d<d1){d2=d1;b=a;d1=d;a=i;} else if(d<d2){d2=d;b=i;} }',
    '  vec3 r=h3(tc,5); float lift=length(home-uOrigin)/uLiftV+uLiftJ*r.x*r.x;',
    '  o=vec4(float(a),float(b),0.15+0.55*r.y,lift); }'
  ].join('\n');

  // One step of every grain. State: pos = (offset from home xyz in CSS px, birdness 0 pixel..1 bird),
  // vel = (velocity, wing phase), aux = (ink, |accel| this step, deepest dip below home while settling, in the air).
  var FS_SIM = COMMON + [
    'uniform sampler2D uPos,uVel,uAux,uBind,uLead,uPage;',
    'uniform vec2 uSize,uOrigin; uniform float uCell,uD,uTime,uDt,uFlyT,uLandT,uU,uInit;',
    'uniform float uEll,uStretch,uThick,uForm,uK0,uK1,uAmax,uVmax,uJit,uFlapHz,uGlide,uGather,uKick,uLandSpan,uLandJ,uLandOrder,uShapeKind;',
    'uniform vec4 uScope; uniform vec4 uHold[8]; uniform float uHoldW[8]; uniform vec4 uPtr; uniform vec4 uHop; uniform vec4 uMove[8]; uniform vec2 uMoveD[8]; uniform int uMoves;',
    'layout(location=0) out vec4 oPos; layout(location=1) out vec4 oVel; layout(location=2) out vec4 oAux;',
    'vec3 L(int i,int row){return texelFetch(uLead,ivec2(i,row),0).xyz;}',
    'void main(){',
    '  ivec2 tc=ivec2(gl_FragCoord.xy); vec2 home=(vec2(tc)+.5)*uCell;',
    '  vec4 P4=texelFetch(uPos,tc,0),V4=texelFetch(uVel,tc,0),A4=texelFetch(uAux,tc,0),B4=texelFetch(uBind,tc,0);',
    '  float ink=cellInk(uPage,home,uCell,uSize).a;',
    '  vec3 o=P4.xyz,v=V4.xyz; float bird=P4.w,ph=V4.w,dip=A4.z;',
    '  vec3 r=h3(tc,1),r2=h3(tc,2),r3=h3(tc,3);',
    '  if(uInit>0.5){ oPos=vec4(0.); oVel=vec4(0.,0.,0.,r.x*6.2831853); oAux=vec4(ink,0.,0.,0.); return; }',
    '  if(ink<0.03&&dot(o,o)<1e-4){ oPos=vec4(0.); oVel=vec4(0.,0.,0.,ph); oAux=vec4(ink,0.,0.,0.); return; }',
    // a block of the page that moved (a sorted row): its grains start where it was
    '  for(int i=0;i<8;i++){ if(i>=uMoves) break; if(inRect(home,uMove[i],0.5)>0.5&&dot(o,o)<4.){ o.xy+=uMoveD[i]; o.z+=6.+10.*r.z; v=vec3(0.); bird=0.3; } }',
    // a few grains shuffle on the roost (the idle): a small hop and back
    '  if(uHop.z>0.&&inRect(home,uHop,0.5)>0.5&&dot(o,o)<0.01&&r3.x<0.55){ v=vec3((r.x-.5)*30.,-(40.+70.*r.y)*uU,10.+20.*r.z); }',
    '  float hold=0.; for(int i=0;i<8;i++) hold=max(hold,inRect(home,uHold[i],3.)*uHoldW[i]);',
    '  float scoped=uScope.z>0.?inRect(home,uScope,2.):1.;',
    '  bool flying=uFlyT>=0.&&scoped>0.5;',
    '  float liftAt=B4.w, since=uFlyT-liftAt;',
    '  float ord=uLandOrder<0.5?home.y/uSize.y:(uLandOrder<1.5?length(home-uOrigin)/length(uSize):r3.y);',
    '  float landAt=0.15+uLandSpan*ord+uLandJ*r3.z;',
    '  bool landing=uLandT>=0.&&uLandT>landAt;',
    '  bool air=flying&&since>0.&&hold<0.5&&!landing;',
    '  vec3 a=vec3(0.); float amax=uAmax;',
    '  float d=length(o);',
    '  if(air){',
    // the place this grain keeps in the flock: in the frame of its lead bird, between it and its neighbour
    '    int ia=int(B4.x+.5), ib=int(B4.y+.5);',
    '    vec3 La=L(ia,0),Lb=L(ib,0),F=normalize(L(ia,1)+vec3(1e-4,0.,0.)),S=L(ia,2),U=L(ia,3),Sa=L(ia,4);',
    '    vec3 q=vec3(gauss(r.xy),gauss(r2.xy),gauss(vec2(r.z,r2.z)));',
    '    if(uShapeKind>1.5){q.x*=1.8;}',
    '    vec3 off=(q.x*uStretch*F+q.y*S+q.z*uThick*U)*uEll*0.55;',
    '    vec3 tgt=mix(La,Lb,B4.z)+off;',
    '    tgt+=vec3(sin(uTime*(1.3+r3.x)+r.z*9.),sin(uTime*(1.1+r3.y)+r.x*9.),sin(uTime*0.9+r.y*9.))*uJit;',
    '    float fr=smoothstep(0.,uForm,since);',
    '    tgt=mix(vec3(home,0.)+(La-Sa)*(0.6+0.4*r3.x),tgt,fr);',
    '    float k=mix(uK0,uK1,r2.x)*mix(2.2,1.,fr); vec3 P=vec3(home,0.)+o;',
    '    a=k*(tgt-P)-2.*0.78*sqrt(k)*v;',
    '    bird=min(1.,bird+uDt*3.);',
    '    dip=0.;',
    '  } else {',
    '    if(d>0.001||dot(v,v)>1e-4){',
    '      vec3 dir=-o/max(d,1e-4);',
    '      if(d>7.*uU){',
    // the glide home: fast while far, braking as it nears, coming in from above and in front (larger), then dropping
    '        vec3 des=dir*min(uVmax*0.75,d*5.5+40.*uU); a=(des-v)*7.5; a.z+=min(d,180.)*5.*smoothstep(9.*uU,60.*uU,d);',
    '        a.y-=min(d,200.)*1.2*smoothstep(30.*uU,120.*uU,d);',
    '      } else {',
    // the settle: an under-damped spring, so it dips past its place and comes back (landing with weight)
    '        float k=260.; a=-k*o-2.*0.74*sqrt(k)*v; amax=uAmax*3.;',
    '        dip=max(dip,o.y);',
    '      }',
    '      bird=landing||!flying?min(bird,smoothstep(1.5*uU,18.*uU,d)):bird;',
    '      if(!flying&&uLandT<0.) bird=min(bird,smoothstep(2.*uU,18.*uU,d));',
    '    }',
    // anticipation: before its lift the grain quivers and crouches; the wave of it runs ahead of the lift-off
    '    if(flying&&hold<0.5&&since>-uGather&&since<=0.){ float e=smoothstep(-uGather,0.,since);',
    '      vec3 qv=vec3(sin(uTime*47.+r.x*20.)*0.7,1.4+0.6*sin(uTime*31.+r.y*20.),0.)*e*uU; o=mix(o,qv,0.6); v=vec3(0.); a=vec3(0.); }',
    '  }',
    // the jump: one push up and out from the origin, the moment the grain lifts
    '  if(flying&&hold<0.5&&!landing&&since>0.&&since-uDt<=0.){ vec2 out2=normalize(home-uOrigin+vec2(1e-3)); v=vec3(out2*0.45,0.)*uKick+vec3((r.x-.5)*0.6,-1.,0.5+0.5*r.z)*uKick*(0.7+0.6*r.y); bird=0.2; }',
    // a hawk: the pointer scatters the birds near it (screen space)
    '  if(uPtr.z>0.&&bird>0.3){ vec3 P=vec3(home,0.)+o; float s=uD/(uD-P.z); vec2 scr=uSize*.5+(P.xy-uSize*.5)*s; vec2 dp=scr-uPtr.xy; float dl=length(dp);',
    '    if(dl<uPtr.w){ float w=1.-dl/uPtr.w; a.xy+=dp/max(dl,1.)*w*w*uPtr.z; a.z+=(r.z-.5)*w*uPtr.z*0.5; } }',
    // inertia: acceleration is capped, so nothing turns on the spot
    '  float am=length(a); if(am>amax) a*=amax/am;',
    '  v+=a*uDt; float sp=length(v); float vm=air?uVmax:uVmax*0.9; if(sp>vm) v*=vm/sp;',
    '  o+=v*uDt; d=length(o);',
    '  if(!air&&!(flying&&since>-uGather&&since<=0.)&&d<0.3*uU&&length(v)<6.*uU){o=vec3(0.);v=vec3(0.);bird=0.;}',
    // the wingbeat: flaps when climbing or slow, glides when diving; each grain on its own beat and its own gliding spells
    '  float climb=clamp(-v.y/(uVmax*0.35)+0.25,-1.,1.); float slow=1.-clamp(length(v)/(uVmax*0.6),0.,1.);',
    '  float spell=step(1.-2.*uGlide,sin(uTime*(0.5+0.6*r3.y)+r3.z*6.2831853));',
    '  float flap=climb>0.9?1.:1.-spell;',
    '  if(bird<0.05) flap=0.; else if(flap<0.3) ph=mix(ph,floor(ph/6.2831853)*6.2831853+1.2,0.08);',
    '  ph+=uDt*6.2831853*uFlapHz*(0.85+0.3*r.z)*max(flap,uShapeKind>1.5&&uShapeKind<2.5?1.:0.);',
    '  if(ph>6.2831853*64.) ph-=6.2831853*64.;',
    '  oPos=vec4(o,bird); oVel=vec4(v,ph); oAux=vec4(ink,length(a),dip,air?1.:0.);',
    '}'
  ].join('\n');

  // Typing at rest: grains whose page pixels changed arrive from the sky and land (new letters fly in).
  var FS_DIFF = COMMON + [
    'uniform sampler2D uPos,uVel,uAux,uPage,uPrev; uniform vec2 uSize; uniform float uCell,uU; uniform int uSeed;',
    'layout(location=0) out vec4 oPos; layout(location=1) out vec4 oVel; layout(location=2) out vec4 oAux;',
    'float changed(vec2 p){vec4 a=texture(uPage,p/uSize),b=texture(uPrev,p/uSize);return step(0.12,length(a-b));}',
    'void main(){ ivec2 tc=ivec2(gl_FragCoord.xy); vec4 o=texelFetch(uPos,tc,0),v=texelFetch(uVel,tc,0),x=texelFetch(uAux,tc,0);',
    '  vec2 home=(vec2(tc)+.5)*uCell; float c=uCell*.35;',
    '  float ch=max(max(changed(home),changed(home+vec2(c,c))),max(changed(home-vec2(c,c)),changed(home+vec2(c,-c))));',
    '  float ink=cellInk(uPage,home,uCell,uSize).a;',
    '  if(ch>0.5&&ink>0.05&&length(o.xyz)<2.){ vec3 r=h3(tc,uSeed);',
    '    o=vec4(vec3((r.x-.3)*50.,-(25.+55.*r.y),20.+30.*r.z)*uU,1.); v=vec4(vec3((r.z-.5)*40.,30.,0.)*uU,v.w); }',
    '  oPos=o; oVel=v; oAux=x; }'
  ].join('\n');

  // The birds: one point sprite per grain away from home, shaped as the creature, turned to its heading, banking.
  var VS_BIRD = COMMON + [
    'uniform sampler2D uPos,uVel,uAux,uBind,uLead,uPage; uniform vec2 uSize; uniform ivec2 uGrid;',
    'uniform float uCell,uD,uPx,uStride,uLen,uMirror,uWaterY,uTintMix,uGlow; uniform vec3 uTint,uHaze; uniform int uOff;',
    'flat out vec4 vCol; flat out vec2 vDir; flat out float vPh,vBank,vW,vSize;',
    'void cull(){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=1.;vCol=vec4(0.);}',
    'void main(){',
    '  int id=gl_VertexID*int(uStride)+uOff; ivec2 tc=ivec2(id%uGrid.x,id/uGrid.x);',
    '  if(tc.y>=uGrid.y){cull();return;}',
    '  vec4 o=texelFetch(uPos,tc,0); float d=length(o.xyz);',
    '  if(d<0.3){cull();return;}',
    '  vec2 home=(vec2(tc)+.5)*uCell; vec4 ink=cellInk(uPage,home,uCell,uSize);',
    '  if(ink.a<0.03){cull();return;}',
    '  vec3 P=vec3(home,0.)+o.xyz; float s=uD/max(uD-P.z,1.); vec2 scr=uSize*.5+(P.xy-uSize*.5)*s;',
    '  vec3 v=texelFetch(uVel,tc,0).xyz; vec2 sv=v.xy*s; float sl=length(sv);',
    '  vec2 dir=sl>1.?sv/sl:vec2(1.,0.);',
    '  float w=o.w; vec3 r=h3(tc,4);',
    '  if(uMirror>.5){ scr.y=2.*uWaterY*uSize.y-scr.y; dir.y=-dir.y; }',
    '  gl_Position=vec4(scr.x/uSize.x*2.-1.,1.-scr.y/uSize.y*2.,0.,1.);',
    '  vec4 B=texelFetch(uBind,tc,0); float bank=texelFetch(uLead,ivec2(int(B.x+.5),0),0).w*w;',
    '  vec4 X=texelFetch(uAux,tc,0);',
    // landing flare: the wings open wide just before touchdown
    '  float flare=(1.-X.w)*smoothstep(40.,10.,d)*smoothstep(1.,5.,d);',
    '  float len=uCell*uLen*pow(s,1.25)*(0.8+0.4*r.x)*(1.+0.35*flare)*(1.+uGlow*1.6);',
    '  float size=mix(uCell*1.05,len,w)*uPx;',
    '  vec3 c=ink.rgb/max(ink.a,1e-3); c=mix(c,uTint,uTintMix*w);',
    '  float far=clamp(-P.z/uD,0.,1.)*w; c=mix(c,uHaze,far*0.35);',
    '  float al=mix(ink.a,1.,w)*(1.-0.25*far);',
    '  if(size<1.6){al*=size*size/2.56;size=1.6;}',
    '  vCol=vec4(c*al,al); vDir=dir; vPh=texelFetch(uVel,tc,0).w; vBank=bank+(r.y-.5)*0.3*w; vW=w; vSize=size;',
    '  gl_PointSize=size*1.42+2.;',
    '}'
  ].join('\n');

  // shapes: p in the bird's frame (x forward, y to its left), about -1..1; ph the wing phase; bank −1..1; aa the edge width
  var SHAPE_LIB = [
    'float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}',
    'float ell(vec2 p,vec2 c,vec2 r){return length((p-c)/r)-1.;}',
    'float cover(float sd,float aa){return 1.-smoothstep(-aa,aa,sd);}',
    // starling: a short body and two swept wings whose span opens and closes with the beat; the inner wing shortens in a bank
    'float shStarling(vec2 p,float ph,float bank,float aa){',
    '  float open=0.3+0.7*abs(cos(ph)); float sweep=-0.25+0.2*sin(ph);',
    '  float sl=open*(1.-0.45*max(bank,0.)), sr=open*(1.-0.45*max(-bank,0.));',
    '  float body=ell(p,vec2(0.05,0.),vec2(0.55,0.16));',
    '  float wl=seg(p,vec2(0.1,0.),vec2(sweep,0.95*sl))-0.13, wr=seg(p,vec2(0.1,0.),vec2(sweep,-0.95*sr))-0.13;',
    '  float tail=seg(p,vec2(-0.3,0.),vec2(-0.62,0.))-0.1;',
    '  return cover(min(min(body,tail),min(wl,wr)),aa);}',
    // bee: a fat striped body and two pale wings in a blur that flickers with the beat
    'vec2 shBee(vec2 p,float ph,float bank,float aa){',
    '  float body=cover(ell(p,vec2(0.,0.),vec2(0.62,0.36)),aa);',
    '  float wing=max(cover(ell(p,vec2(-0.05,0.42),vec2(0.34,0.3+0.12*sin(ph))),aa),cover(ell(p,vec2(-0.05,-0.42),vec2(0.34,0.3+0.12*sin(ph))),aa));',
    '  float stripe=0.55+0.45*step(0.,sin(p.x*13.));',
    '  return vec2(max(body,wing*(0.45+0.25*sin(ph*1.7))),body*stripe+(1.-body)*1.6);}',
    // firefly: a glow that pulses on its own slow beat
    'float shFirefly(vec2 p,float ph,float bank,float aa){ float r=length(p); float pulse=0.2+0.8*pow(max(sin(ph*0.25),0.),2.);',
    '  return clamp(exp(-r*r*7.)*pulse+cover(r-0.16,aa)*(0.35+0.65*pulse),0.,1.);}',
    // fish: a lens body and a tail that sways with the beat
    'float shFish(vec2 p,float ph,float bank,float aa){ float w=1.-0.4*abs(bank);',
    '  float body=ell(p,vec2(0.15,0.),vec2(0.62,0.26*w)); vec2 t=p-vec2(-0.55,0.); t.y-=sin(ph)*0.18;',
    '  float tail=max(abs(t.y)-(0.05+0.42*(-t.x)),max(t.x,-t.x-0.38));',
    '  return cover(min(body,tail),aa);}',
    // paper plane: a dart; it narrows in a bank and its lit half changes side
    'vec2 shPlane(vec2 p,float ph,float bank,float aa){ float w=1.-0.55*abs(bank); vec2 q=vec2(p.x,p.y/w);',
    '  float sd=max(max(-q.x-0.75,abs(q.y)-(0.85-q.x)*0.55),q.x-0.85); float c=cover(sd,aa);',
    '  float lit=(q.y*bank>0.)?0.78:1.; lit*=1.-0.35*cover(abs(q.y)-0.05,aa)*step(q.x,0.6);',
    '  return vec2(c,lit);}',
    'float shDot(vec2 p,float aa){return cover(length(p)-0.5,aa);}'
  ].join('\n');

  function fsBird(custom) {
    return '#version 300 es\nprecision highp float;\n' + SHAPE_LIB + '\n' + (custom || 'float shapeCustom(vec2 p,float ph,float bank){return 0.;}') + [
      '',
      'uniform int uShape; uniform float uMirrorA;',
      'flat in vec4 vCol; flat in vec2 vDir; flat in float vPh,vBank,vW,vSize; out vec4 o;',
      'void main(){',
      '  vec2 p=(gl_PointCoord-.5)*2.*1.42*(vSize*1.42+2.)/(vSize*1.42); p.y=-p.y;',
      '  vec2 dir=vec2(vDir.x,-vDir.y); vec2 q=vec2(dot(p,dir),dot(p,vec2(-dir.y,dir.x)));',
      '  float aa=2.2/max(vSize,1.);',
      '  float sq=cover(max(abs(p.x),abs(p.y))-0.98,aa);',
      '  float cov=0., lum=1.;',
      '  if(uShape==0) cov=shStarling(q,vPh,vBank,aa);',
      '  else if(uShape==1){vec2 b=shBee(q,vPh,vBank,aa);cov=b.x;lum=b.y;}',
      '  else if(uShape==2) cov=shFirefly(q,vPh,vBank,aa);',
      '  else if(uShape==3) cov=shFish(q,vPh,vBank,aa);',
      '  else if(uShape==4){vec2 b=shPlane(q,vPh,vBank,aa);cov=b.x;lum=b.y;}',
      '  else if(uShape==5) cov=shDot(q,aa);',
      '  else cov=shapeCustom(q,vPh,vBank);',
      '  float m=mix(sq,cov,smoothstep(0.,0.7,vW)); vec4 c=vCol; c.rgb=min(c.rgb*mix(1.,lum,vW),vec3(c.a));',
      '  o=c*m*uMirrorA; }'
    ].join('\n');
  }

  // The sky (both lights), painted once per resize at half resolution.
  var FS_SKY = COMMON + [
    'uniform vec2 uRes; uniform vec3 uC[6]; uniform float uP[6]; uniform int uNs;',
    'uniform vec4 uSun; uniform vec3 uSunC; uniform vec4 uMoon; uniform vec3 uMoonC; uniform float uSunG,uMoonG;',
    'uniform vec4 uCloud; uniform vec3 uShade,uLit; uniform float uCirrus,uRays,uVig;',
    'out vec4 o;',
    'float vn(vec2 p){ivec2 i=ivec2(floor(p));vec2 f=fract(p);f=f*f*(3.-2.*f);',
    '  float a=h3(i,11).x,b=h3(i+ivec2(1,0),11).x,c=h3(i+ivec2(0,1),11).x,d=h3(i+ivec2(1,1),11).x;return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}',
    'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn(p);p=mat2(1.6,1.2,-1.2,1.6)*p+17.3;a*=.5;}return s;}',
    'vec3 ramp(float y){vec3 c=uC[0];for(int i=1;i<6;i++){if(i>=uNs)break;c=mix(c,uC[i],smoothstep(uP[i-1],uP[i],y));}return c;}',
    'void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 tv=vec2(uv.x,1.-uv.y); float asp=uRes.x/uRes.y; vec2 p=vec2(tv.x*asp,tv.y);',
    '  vec3 c=ramp(clamp(tv.y+0.04*(tv.x-.5),0.,1.));',
    '  if(uSun.z>0.){ float ds=length(p-vec2(uSun.x*asp,uSun.y)); c+=uSunC*(uSunG*exp(-ds*3.)+uSunG*0.8*exp(-ds*9.)); c=mix(c,uSunC*1.05,smoothstep(uSun.z,uSun.z*0.94,ds)); }',
    '  float moonA=0.;',
    '  if(uMoon.z>0.){ vec2 mp=p-vec2(uMoon.x*asp,uMoon.y); float dm=length(mp); c+=uMoonC*uMoonG*(0.12*exp(-dm*5.)+0.2*exp(-dm*20.));',
    '    float disc=smoothstep(uMoon.z,uMoon.z*0.93,dm); float mare=0.78+0.22*smoothstep(0.38,0.62,fbm(mp/uMoon.z*1.6+3.));',
    '    c=mix(c,uMoonC*mare,disc); moonA=disc; }',
    '  vec2 q=vec2(p.x*1.2-tv.y*0.7,tv.y*4.4)*uCloud.w; q+=0.9*vec2(fbm(q*.6+3.),fbm(q*.6+11.));',
    '  float ci=smoothstep(0.52,0.84,fbm(q))*smoothstep(0.02,0.12,tv.y)*smoothstep(0.62,0.25,tv.y)*uCirrus;',
    '  c=mix(c,mix(c,uLit,0.5)+0.06,ci*0.5);',
    '  vec2 b=vec2(p.x*0.8,tv.y*8.)*uCloud.w; b.x+=0.7*fbm(b*.6+5.);',
    '  float band=smoothstep(0.5,0.64,fbm(b))*smoothstep(uCloud.y,uCloud.y+0.12,tv.y)*smoothstep(uCloud.z,uCloud.z-0.1,tv.y)*uCloud.x;',
    '  float under=smoothstep(0.5,0.64,fbm(b+vec2(0.,-0.18)));',
    '  c=mix(c,uShade,band*0.6); c+=uLit*0.22*band*(1.-under);',
    '  if(uRays>0.){ float a=atan(p.x-0.5*asp,tv.y+0.25); c+=uLit*uRays*0.08*(0.5+0.5*sin(a*23.+fbm(vec2(a*6.,0.))*6.))*smoothstep(0.9,0.,tv.y); }',
    '  float vg=length((tv-.5)*vec2(1.,.8)); c*=1.-uVig*smoothstep(0.35,0.95,vg);',
    '  o=vec4(c,clamp(band*1.4+ci*1.2+moonA*2.,0.,1.)); }'
  ].join('\n');

  // Sky + water + the formed page. The page shows where its grain is at home; where the grain flew there is a hole.
  var FS_COMP = COMMON + [
    'uniform sampler2D uSkyA,uSkyB,uPage,uPos; uniform vec2 uRes,uSize; uniform ivec2 uGrid;',
    'uniform float uLight,uTime,uCell,uIdle,uStarsA,uStarsB,uWaterY,uMirror,uSheen,uGlintX; uniform vec3 uDeep,uGlint;',
    'out vec4 o;',
    'vec3 skyAt(vec2 tv){ vec2 sv=vec2(tv.x,1.-tv.y); vec4 a=texture(uSkyA,sv),b=texture(uSkyB,sv); vec3 c=mix(a.rgb,b.rgb,uLight); float cov=mix(a.a,b.a,uLight);',
    '  float st=mix(uStarsA,uStarsB,uLight); if(st>0.){ vec2 g=tv*uSize/2.8; ivec2 ci=ivec2(floor(g)); vec3 h=h3(ci,9);',
    '    if(h.x>1.-0.004*st){ vec2 d=fract(g)-.5-(h.yz-.5)*.6; float big=h.z*h.z; float tw=0.7+0.3*sin(uTime*(1.1+h.y*2.4)+h.z*40.);',
    '      c+=vec3(0.86,0.9,1.)*smoothstep(0.18+0.2*big,0.,length(d))*(0.25+0.75*big)*tw*smoothstep(0.85,0.4,tv.y)*(1.-cov); } }',
    '  return c; }',
    'void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 tv=vec2(uv.x,1.-uv.y); vec3 c;',
    '  if(tv.y<=uWaterY) c=skyAt(tv);',
    '  else { float d=(tv.y-uWaterY)/max(1.-uWaterY,1e-3); float px=tv.x*uSize.x, py=(tv.y-uWaterY)*uSize.y; float ph=py/(0.35+d*1.9);',
    '    float rip=0.62*sin(ph*1.15+uTime*1.25+sin(px*0.019+uTime*0.35)*2.2)+0.38*sin(ph*2.7-uTime*1.8+sin(px*0.043-uTime*0.5)*1.7+1.7);',
    '    vec2 mv=vec2(tv.x+rip*0.002*(0.4+d*2.),uWaterY-(tv.y-uWaterY)*3.2-rip*0.006*(0.25+d*1.6)); mv.y=clamp(mv.y,0.002,uWaterY);',
    '    c=mix(uDeep,skyAt(mv),uMirror*(1.-0.3*d));',
    '    float gl=pow(max(rip*.5+.5,0.),5.)*smoothstep(0.02,0.25,d)*exp(-pow((tv.x-uGlintX)/(0.03+0.12*d),2.));',
    '    c+=uGlint*gl*0.35+pow(max(rip,0.),8.)*0.04*(0.3+d); }',
    '  vec4 pg=texture(uPage,tv); float m=1.;',
    '  if(uIdle<0.5){ ivec2 ci=min(ivec2(tv*uSize/uCell),uGrid-1); m=1.-smoothstep(0.3,1.2,length(texelFetch(uPos,ci,0).xyz)); }',
    // the idle sheen: ink catches the light a little, slowly (a resting flock is never a still picture)
    '  float sh=1.+uSheen*sin(tv.x*uSize.x*0.03-tv.y*uSize.y*0.02+uTime*0.9)*sin(tv.y*uSize.y*0.05+uTime*0.6);',
    '  c=c*(1.-pg.a*m)+pg.rgb*m*sh;',
    '  vec3 n=h3(ivec2(gl_FragCoord.xy),5); c+=(n.x+n.y-1.)*0.01;',
    '  o=vec4(c,1.); }'
  ].join('\n');

  // The scene in front (reeds, roofs, hives), with its reflection in the water.
  var FS_SCENE = COMMON + [
    'uniform sampler2D uScene; uniform float uWaterY,uMirror,uTime; uniform vec2 uSize; out vec4 o;',
    'void main(){ vec2 tv=vec2(gl_FragCoord.x/uSize.x, 1.-gl_FragCoord.y/uSize.y); vec4 s=texture(uScene,tv);',
    '  if(tv.y>uWaterY){ float py=(tv.y-uWaterY)*uSize.y; float rip=sin(py*0.6+uTime*1.4+sin(tv.x*uSize.x*0.03)*2.);',
    '    vec2 mv=vec2(tv.x+rip*0.0015,2.*uWaterY-tv.y); vec4 r=mv.y>0.?texture(uScene,mv):vec4(0.);',
    '    s=s+r*uMirror*0.55*(1.-s.a); }',
    '  o=s; }'
  ].join('\n');

  // ------------------------------------------------------------------ the lead birds (CPU): topological flocking
  // N birds in page space (x, y in CSS px, y down; z towards the viewer). Each answers its K nearest neighbours as they
  // were `reaction` seconds ago: alignment, cohesion, separation; plus a slow goal, soft bounds, wander and startles.
  // Velocity turns at most maxTurn rad/s (panicked birds twice as fast); bank follows the turn with inertia.
  function Leaders(cfg) {
    var N = cfg.n, K = Math.min(cfg.k, N - 1);
    var L = {
      N: N, K: K, cfg: cfg, t: 0,
      p: new Float32Array(N * 3), v: new Float32Array(N * 3), s0: new Float32Array(N * 3),
      bank: new Float32Array(N), turn: new Float32Array(N), lift: new Float32Array(N), panic: new Float32Array(N), pdir: new Float32Array(N * 3),
      side: new Float32Array(N * 3), up: new Float32Array(N * 3), nb: new Int32Array(N * K),
      hist: [], histT: [], rng: HIC.rng(cfg.seed || 1), nextStartle: 0
    };
    L.reset = function (spawns, origin, liftV, u) {
      for (var i = 0; i < N; i++) {
        var s = spawns[i];
        L.p[i * 3] = s[0]; L.p[i * 3 + 1] = s[1]; L.p[i * 3 + 2] = 0;
        L.s0[i * 3] = s[0]; L.s0[i * 3 + 1] = s[1]; L.s0[i * 3 + 2] = 0;
        L.v[i * 3] = L.v[i * 3 + 1] = L.v[i * 3 + 2] = 0;
        L.bank[i] = 0; L.panic[i] = 0;
        L.lift[i] = Math.hypot(s[0] - origin[0], s[1] - origin[1]) / liftV;
        L.side[i * 3] = 0; L.side[i * 3 + 1] = 0; L.side[i * 3 + 2] = 1; L.up[i * 3] = 0; L.up[i * 3 + 1] = -1; L.up[i * 3 + 2] = 0;
      }
      L.t = 0; L.u = u; L.origin = origin; L.hist = []; L.histT = [];
      L.nextStartle = cfg.startle[0] + L.rng() * (cfg.startle[1] - cfg.startle[0]);
    };
    function delayed(j) {   // velocity of bird j `reaction` seconds ago
      var want = L.t - cfg.reaction, h = L.hist, ht = L.histT;
      for (var k = h.length - 1; k >= 0; k--) if (ht[k] <= want) return h[k].subarray(j * 3, j * 3 + 3);
      return h.length ? h[0].subarray(j * 3, j * 3 + 3) : L.v.subarray(j * 3, j * 3 + 3);
    }
    L.goal = function (t) {
      var a = cfg.area, cx = (a[0] + a[2]) / 2 * cfg.W, cy = (a[1] + a[3]) / 2 * cfg.H, hx = (a[2] - a[0]) / 2 * cfg.W, hy = (a[3] - a[1]) / 2 * cfg.H;
      return [cx + hx * (0.72 * Math.sin(t * 0.23 + 0.4) + 0.2 * Math.sin(t * 0.61 + 2.1)),
              cy + hy * (0.65 * Math.sin(t * 0.31 + 1.7) + 0.25 * Math.sin(t * 0.83)),
              cfg.D * cfg.depth * 0.8 * Math.sin(t * 0.19 + 0.9)];
    };
    L.startle = function (x, y, radius) {   // a hawk at screen point (x, y): birds near it panic away
      for (var i = 0; i < N; i++) {
        var P = L.p.subarray(i * 3, i * 3 + 3), dx = P[0] - x, dy = P[1] - y, d = Math.hypot(dx, dy);
        if (d < radius && L.t > L.lift[i]) { L.panic[i] = 0.45; L.pdir[i * 3] = dx / (d || 1); L.pdir[i * 3 + 1] = dy / (d || 1) - 0.3; L.pdir[i * 3 + 2] = (L.rng() - 0.5); }
      }
    };
    L.step = function (dt, flying) {
      L.t += dt;
      var snap = new Float32Array(L.v); L.hist.push(snap); L.histT.push(L.t);
      while (L.histT.length > 2 && L.histT[1] < L.t - cfg.reaction - 0.05) { L.hist.shift(); L.histT.shift(); }
      var u = L.u, ell = cfg.ell, i, j, k;
      // the K nearest neighbours of every bird (topological, not metric)
      var d2 = new Float32Array(N);
      for (i = 0; i < N; i++) {
        for (j = 0; j < N; j++) { var dx = L.p[j * 3] - L.p[i * 3], dy = L.p[j * 3 + 1] - L.p[i * 3 + 1], dz = L.p[j * 3 + 2] - L.p[i * 3 + 2]; d2[j] = j === i ? 1e20 : dx * dx + dy * dy + dz * dz; }
        for (k = 0; k < K; k++) { var best = -1, bd = 1e21; for (j = 0; j < N; j++) if (d2[j] < bd) { bd = d2[j]; best = j; } L.nb[i * K + k] = best; d2[best] = 1e21; }
      }
      if (flying && L.t > L.nextStartle) {   // now and then a bird at the edge takes fright and the turn runs through
        var e = Math.floor(L.rng() * N), ang = (L.rng() < 0.5 ? -1 : 1) * (1.2 + L.rng() * 0.8), V = L.v.subarray(e * 3, e * 3 + 3), sp = Math.hypot(V[0], V[1]) || 1;
        L.panic[e] = 0.5; L.pdir[e * 3] = (V[0] * Math.cos(ang) - V[1] * Math.sin(ang)) / sp; L.pdir[e * 3 + 1] = (V[0] * Math.sin(ang) + V[1] * Math.cos(ang)) / sp; L.pdir[e * 3 + 2] = 0;
        L.nextStartle = L.t + cfg.startle[0] + L.rng() * (cfg.startle[1] - cfg.startle[0]);
      }
      var G = L.goal(L.t), nv = new Float32Array(N * 3), A = cfg.area;
      for (i = 0; i < N; i++) {
        var P = L.p.subarray(i * 3, i * 3 + 3), Vi = L.v.subarray(i * 3, i * 3 + 3);
        var air = flying ? L.t - L.lift[i] : -1;
        if (air <= 0) { nv[i * 3] = Vi[0]; nv[i * 3 + 1] = Vi[1]; nv[i * 3 + 2] = Vi[2]; if (flying && air > -dt) { var ox = P[0] - L.origin[0], oy = P[1] - L.origin[1], ol = Math.hypot(ox, oy) || 1; nv[i * 3] = ox / ol * cfg.minSpeed * u * 0.5; nv[i * 3 + 1] = -cfg.minSpeed * u; nv[i * 3 + 2] = cfg.minSpeed * u * 0.3; } continue; }
        var ramp = Math.min(1, air / 1.2);
        var al = [0, 0, 0], co = [0, 0, 0], se = [0, 0, 0], wsum = 0;
        for (k = 0; k < K; k++) {
          // alignment with the neighbours as they flew `reaction` s ago; a neighbour that is turning catches the eye
          // (salience), which is what carries a turn across the flock instead of letting it fade
          j = L.nb[i * K + k]; var Dv = delayed(j), Q = L.p.subarray(j * 3, j * 3 + 3), wj = 1 + cfg.salience * L.turn[j];
          al[0] += Dv[0] * wj; al[1] += Dv[1] * wj; al[2] += Dv[2] * wj; wsum += wj;
          co[0] += Q[0]; co[1] += Q[1]; co[2] += Q[2];
          var sx = P[0] - Q[0], sy = P[1] - Q[1], sz = P[2] - Q[2], sd = Math.hypot(sx, sy, sz) || 1;
          if (sd < ell) { var f = (ell - sd) / ell / sd; se[0] += sx * f; se[1] += sy * f; se[2] += sz * f; }
        }
        var sp0 = Math.hypot(Vi[0], Vi[1], Vi[2]) || 1, cruise = cfg.speed * u;
        var ax = 0, ay = 0, az = 0;
        ax += (al[0] / wsum - Vi[0]) * cfg.align; ay += (al[1] / wsum - Vi[1]) * cfg.align; az += (al[2] / wsum - Vi[2]) * cfg.align;
        ax += (co[0] / K - P[0]) * cfg.cohere; ay += (co[1] / K - P[1]) * cfg.cohere; az += (co[2] / K - P[2]) * cfg.cohere;
        ax += se[0] * cruise * cfg.separate; ay += se[1] * cruise * cfg.separate; az += se[2] * cruise * cfg.separate;
        ax += (G[0] - P[0]) * cfg.goal * 0.35; ay += (G[1] - P[1]) * cfg.goal * 0.35; az += (G[2] - P[2]) * cfg.goal * 0.35;
        var x0 = A[0] * cfg.W, x1 = A[2] * cfg.W, y0 = A[1] * cfg.H, y1 = A[3] * cfg.H, zb = cfg.D * cfg.depth, wall = cruise * 4;
        if (P[0] < x0) ax += (x0 - P[0]) / ell * wall; if (P[0] > x1) ax -= (P[0] - x1) / ell * wall;
        if (P[1] < y0) ay += (y0 - P[1]) / ell * wall; if (P[1] > y1) ay -= (P[1] - y1) / ell * wall;
        if (P[2] < -zb) az += (-zb - P[2]) / ell * wall; if (P[2] > zb * 0.6) az -= (P[2] - zb * 0.6) / ell * wall;
        var wt = L.t * 0.7 + i * 1.37;
        ax += Math.sin(wt) * cruise * cfg.wander; ay += Math.sin(wt * 1.31 + 2) * cruise * cfg.wander; az += Math.sin(wt * 0.77 + 4) * cruise * cfg.wander;
        ax *= ramp; ay *= ramp; az *= ramp;
        // desired velocity, then turn towards it no faster than maxTurn
        var dvx = Vi[0] + ax * dt, dvy = Vi[1] + ay * dt, dvz = Vi[2] + az * dt;
        if (L.panic[i] > 0) { L.panic[i] -= dt; dvx = L.pdir[i * 3] * cruise * 1.3; dvy = L.pdir[i * 3 + 1] * cruise * 1.3; dvz = L.pdir[i * 3 + 2] * cruise * 1.3; }
        var dl = Math.hypot(dvx, dvy, dvz) || 1, fx = Vi[0] / sp0, fy = Vi[1] / sp0, fz = Vi[2] / sp0, tx = dvx / dl, ty = dvy / dl, tz = dvz / dl;
        var cosA = Math.max(-1, Math.min(1, fx * tx + fy * ty + fz * tz)), ang2 = Math.acos(cosA), lim = cfg.maxTurn * (L.panic[i] > 0 ? 2 : 1) * dt;
        if (ang2 > lim && ang2 > 1e-5) {   // slerp the heading by lim
          var kx = tx - fx * cosA, ky = ty - fy * cosA, kz = tz - fz * cosA, kl = Math.hypot(kx, ky, kz) || 1;
          kx /= kl; ky /= kl; kz /= kl; tx = fx * Math.cos(lim) + kx * Math.sin(lim); ty = fy * Math.cos(lim) + ky * Math.sin(lim); tz = fz * Math.cos(lim) + kz * Math.sin(lim); ang2 = lim;
        }
        var spd = Math.max(cfg.minSpeed * u, Math.min(cruise * 1.6, dl));
        spd = sp0 + (spd - sp0) * Math.min(1, dt * 2.5);   // speed changes slowly (mass)
        nv[i * 3] = tx * spd; nv[i * 3 + 1] = ty * spd; nv[i * 3 + 2] = tz * spd;
        // bank: the turn rate × speed is the lateral acceleration; the bird leans into it, with inertia
        var crz = fx * ty - fy * tx, target = Math.max(-1, Math.min(1, (ang2 / dt) * spd / (900 * u) * Math.sign(crz || 1)));
        L.bank[i] += (target - L.bank[i]) * Math.min(1, dt / 0.18);
        L.turn[i] += (ang2 / dt - L.turn[i]) * Math.min(1, dt / 0.12);
      }
      for (i = 0; i < N; i++) {
        L.v[i * 3] = nv[i * 3]; L.v[i * 3 + 1] = nv[i * 3 + 1]; L.v[i * 3 + 2] = nv[i * 3 + 2];
        L.p[i * 3] += L.v[i * 3] * dt; L.p[i * 3 + 1] += L.v[i * 3 + 1] * dt; L.p[i * 3 + 2] += L.v[i * 3 + 2] * dt;
        // the bird's frame: forward, side (its left), up; rolled by the bank
        var s = Math.hypot(L.v[i * 3], L.v[i * 3 + 1], L.v[i * 3 + 2]); if (s < 1e-3) continue;
        var F = [L.v[i * 3] / s, L.v[i * 3 + 1] / s, L.v[i * 3 + 2] / s], up0 = [0, -1, 0];
        var Sd = HIC.vec.norm(HIC.vec.cross(up0, F)); if (!isFinite(Sd[0])) Sd = [0, 0, 1];
        var Ud = HIC.vec.cross(F, Sd), b = L.bank[i], cb = Math.cos(b), sb = Math.sin(b);
        L.side[i * 3] = Sd[0] * cb + Ud[0] * sb; L.side[i * 3 + 1] = Sd[1] * cb + Ud[1] * sb; L.side[i * 3 + 2] = Sd[2] * cb + Ud[2] * sb;
        L.up[i * 3] = Ud[0] * cb - Sd[0] * sb; L.up[i * 3 + 1] = Ud[1] * cb - Sd[1] * sb; L.up[i * 3 + 2] = Ud[2] * cb - Sd[2] * sb;
      }
    };
    L.heading = function (i) { return Math.atan2(L.v[i * 3 + 1], L.v[i * 3]); };
    L.clone = function () {
      var c = Leaders(cfg); ['p', 'v', 's0', 'bank', 'turn', 'lift', 'panic', 'pdir', 'side', 'up', 'nb'].forEach(function (k) { c[k].set(L[k]); });
      c.t = L.t; c.u = L.u; c.origin = L.origin; c.nextStartle = 1e9; c.hist = L.hist.map(function (h) { return new Float32Array(h); }); c.histT = L.histT.slice();
      return c;
    };
    return L;
  }

  // ------------------------------------------------------------------ sound (Web Audio, off until a gesture)
  function Sound(cfg) {
    var A = null, bed = null, bedGain = null, amb = null, on = false, kind = cfg.kind || 'wings';
    function noise(sec) { var b = A.createBuffer(1, A.sampleRate * sec, A.sampleRate), d = b.getChannelData(0), r = HIC.rng(9); for (var i = 0; i < d.length; i++) d[i] = r() * 2 - 1; return b; }
    function init() {
      A = new (root.AudioContext || root.webkitAudioContext)();
      var master = A.createGain(); master.gain.value = 0.5; master.connect(A.destination); A.master = master;
      bedGain = A.createGain(); bedGain.gain.value = 0; bedGain.connect(master);
      if (kind === 'buzz' || kind === 'hum') {
        [0, 7, -5].forEach(function (det, i) { var o = A.createOscillator(); o.type = kind === 'buzz' ? 'sawtooth' : 'sine'; o.frequency.value = (kind === 'buzz' ? 196 : 110) + det; var f = A.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = kind === 'buzz' ? 900 : 400; o.connect(f); f.connect(bedGain); o.start(); });
      } else {
        var src = A.createBufferSource(); src.buffer = noise(2); src.loop = true;
        var bp = A.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = kind === 'paper' ? 2400 : 900; bp.Q.value = 0.8;
        var trem = A.createGain(); var lfo = A.createOscillator(); lfo.frequency.value = kind === 'paper' ? 3 : 13; var lg = A.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(trem.gain); trem.gain.value = 0.6; lfo.start();
        src.connect(bp); bp.connect(trem); trem.connect(bedGain); src.start();
      }
      bed = true;
      if (cfg.ambience === 'crickets' || cfg.ambience === 'birds') {
        amb = setInterval(function () {
          if (!on) return; var t = A.currentTime, o = A.createOscillator(), g = A.createGain();
          o.type = 'sine'; o.frequency.value = cfg.ambience === 'crickets' ? 4300 + Math.random() * 300 : 2600 + Math.random() * 1400; o.connect(g); g.connect(A.master);
          for (var i = 0; i < (cfg.ambience === 'crickets' ? 4 : 2); i++) { g.gain.setValueAtTime(0, t + i * 0.06); g.gain.linearRampToValueAtTime(0.025, t + i * 0.06 + 0.01); g.gain.linearRampToValueAtTime(0, t + i * 0.06 + 0.04); }
          if (cfg.ambience === 'birds') o.frequency.linearRampToValueAtTime(o.frequency.value * 1.3, t + 0.12);
          o.start(t); o.stop(t + 0.3);
        }, 700);
      }
    }
    return {
      toggle: function (v) { on = v === undefined ? !on : !!v; if (on && !A) init(); if (A) { if (on) A.resume(); bedGain.gain.setTargetAtTime(0, A.currentTime, 0.1); } return on; },
      get on() { return on; },
      level: function (x) { if (on && A) bedGain.gain.setTargetAtTime(Math.min(0.35, x * 0.35), A.currentTime, 0.25); },
      burst: function (sec, loud) {   // a rush of wings at lift-off, a patter at landing
        if (!on || !A) return; var t = A.currentTime, s = A.createBufferSource(); s.buffer = noise(sec + 0.1);
        var f = A.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(kind === 'paper' ? 3000 : 1300, t); f.frequency.exponentialRampToValueAtTime(500, t + sec);
        var g = A.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(loud || 0.4, t + 0.08); g.gain.exponentialRampToValueAtTime(0.001, t + sec);
        s.connect(f); f.connect(g); g.connect(A.master); s.start(t); s.stop(t + sec + 0.1);
      }
    };
  }

  // ------------------------------------------------------------------ scenery helpers (SVG path strings for #scene)
  var draw = {
    // a ridge or tree line: a filled band whose top wanders (freq = bumps across the width)
    ridge: function (w, y, amp, freq, seed, opts) {
      opts = opts || {}; var r = HIC.rng(seed || 1), lat = []; for (var i = 0; i < 64; i++) lat.push(r());
      var vn = function (x) { var i = Math.floor(x), t = x - i; t = t * t * (3 - 2 * t); return lat[i & 63] * (1 - t) + lat[(i + 1) & 63] * t; };
      var d = 'M0 ' + (opts.base || y + amp * 2).toFixed(1);
      for (var x = 0; x <= w + 6; x += 6) { var t = x / w, hh = vn(t * freq) * 0.6 + vn(t * freq * 4 + 9) * 0.3 + vn(t * freq * 13 + 3) * 0.1; if (opts.trees) hh += Math.max(0, Math.sin(x * 0.35 + vn(t * 30) * 6)) * 0.25 * vn(t * freq * 2 + 5); d += ' L' + x + ' ' + (y - amp * hh).toFixed(1); }
      return d + ' L' + w + ' ' + (opts.base || y + amp * 2).toFixed(1) + ' Z';
    },
    // grass, reeds or lavender: n blades rooted on baseline y, leaning; returns { stems, heads } path strings
    blades: function (x0, x1, y, n, hmin, hmax, seed, opts) {
      opts = opts || {}; var r = HIC.rng(seed || 2), stems = '', heads = '';
      for (var i = 0; i < n; i++) {
        var bx = x0 + (x1 - x0) * r(), h = hmin + (hmax - hmin) * r() * r(), lean = (r() - 0.45) * (opts.lean || 0.35), by = y + r() * (opts.depth || 4);
        var tx = bx + lean * h, ty = by - h;
        stems += 'M' + bx.toFixed(1) + ' ' + by.toFixed(1) + ' Q' + (bx + lean * h * 0.2).toFixed(1) + ' ' + (by - h * 0.6).toFixed(1) + ' ' + tx.toFixed(1) + ' ' + ty.toFixed(1);
        if (opts.head && r() < (opts.headChance || 0.5)) { var hl = h * (opts.headLen || 0.14), hw = opts.headW || 2.2; heads += 'M' + tx.toFixed(1) + ' ' + ty.toFixed(1) + ' l' + (lean * hl * 0.5 + hw).toFixed(1) + ' ' + (-hl * 0.5).toFixed(1) + ' l' + (lean * hl * 0.5 - hw).toFixed(1) + ' ' + (-hl * 0.5).toFixed(1) + ' l' + (-lean * hl * 0.5 - hw).toFixed(1) + ' ' + (hl * 0.5).toFixed(1) + 'Z'; }
      }
      return { stems: stems, heads: heads };
    },
    // rooftops: a run of houses with pitched or flat roofs and chimneys along baseline y
    roofs: function (x0, x1, y, hmin, hmax, seed) {
      var r = HIC.rng(seed || 3), d = '', x = x0;
      while (x < x1) {
        var w = 40 + r() * 90, h = hmin + (hmax - hmin) * r(), top = y - h, pitch = r() < 0.6 ? w * (0.25 + r() * 0.2) : 0;
        d += 'M' + x.toFixed(1) + ' ' + y + ' L' + x.toFixed(1) + ' ' + top.toFixed(1) + ' L' + (x + w / 2).toFixed(1) + ' ' + (top - pitch).toFixed(1) + ' L' + (x + w).toFixed(1) + ' ' + top.toFixed(1) + ' L' + (x + w).toFixed(1) + ' ' + y + 'Z';
        if (r() < 0.55) { var cx = x + w * (0.2 + r() * 0.5), ch = 10 + r() * 16; d += 'M' + cx.toFixed(1) + ' ' + (top - pitch * 0.4).toFixed(1) + ' h7 v' + (-ch).toFixed(1) + ' h-7Z'; }
        x += w + (r() < 0.3 ? r() * 20 : -2);
      }
      return d;
    }
  };

  // ------------------------------------------------------------------ the page
  function start(user) {
    var cfg = merge(DEFAULTS, user || {});
    var q = (HIC.param('q') !== null ? parseFloat(HIC.param('q')) : 1) || 1;
    if (HIC.param('grains')) cfg.grains = parseFloat(HIC.param('grains'));
    var canvas = doc.querySelector(cfg.canvas), page = doc.querySelector(cfg.page), scene = cfg.scene ? doc.querySelector(cfg.scene) : null;
    var ctl = { cfg: cfg, mode: 'rest', fly: function () {}, land: function () {}, recall: function () {}, reflow: function (m) { m(); }, sound: function () { return false; } };
    if (!HIC.supported('webgl')) { HIC.fallback(canvas); return ctl; }
    var S = HIC.stage(canvas, { gl: { antialias: false, alpha: false }, quality: q }), gl = S.gl;
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) { HIC.fallback(canvas); return ctl; }
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    var P = HIC.gl.program, still = HIC.still !== null, calm = HIC.calm;
    var nointro = HIC.param('nointro') !== null;
    var shapeId = SHAPES[cfg.creature.glsl ? 'custom' : cfg.creature.shape]; if (shapeId === undefined) shapeId = 0;
    var pSim = P(gl, null, FS_SIM), pBind = P(gl, null, FS_BIND), pDiff = P(gl, null, FS_DIFF), pSky = P(gl, null, FS_SKY), pComp = P(gl, null, FS_COMP), pScene = P(gl, null, FS_SCENE);
    var pBird = P(gl, VS_BIRD, fsBird(cfg.creature.glsl));
    var vao = gl.createVertexArray();

    // ---- buffers
    var W = 0, H = 0, cell = 1, GW = 0, GH = 0, D = 1000, U = 1, ell = 60;
    var state = [null, null], cur = 0, bindT = null, leadTex = null, skyT = [null, null];
    var pageTex = [HIC.gl.texture(gl), HIC.gl.texture(gl)], pageCur = 0, sceneTex = HIC.gl.texture(gl), uploaded = false;
    var NL = Math.max(8, Math.min(128, cfg.flock.leaders | 0)), leaders = null, leadData = new Float32Array(NL * 5 * 4);
    function ftex(w, h) { var t = HIC.gl.texture(gl, { w: w, h: h, internal: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT, filter: 'nearest' }); return t; }
    function fbo(texs) {
      var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      texs.forEach(function (t, i) { gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0); });
      gl.drawBuffers(texs.map(function (_, i) { return gl.COLOR_ATTACHMENT0 + i; }));
      return f;
    }
    var garbage = [];
    function allocate() {
      garbage.forEach(function (g) { if (g instanceof WebGLTexture) gl.deleteTexture(g); else gl.deleteFramebuffer(g); }); garbage = [];
      var area = Math.min(1, (W * H) / (1280 * 800));
      cell = Math.max(1.5, Math.sqrt(W * H / (cfg.grains * Math.max(0.35, area))));
      GW = Math.ceil(W / cell); GH = Math.ceil(H / cell); D = H * 1.4; U = Math.min(W, H) / 800;
      ell = Math.min(W, H) * cfg.flock.spread / Math.sqrt(NL) * 1.25;
      for (var i = 0; i < 2; i++) {
        var a = ftex(GW, GH), b = ftex(GW, GH), c = ftex(GW, GH);
        state[i] = { pos: a, vel: b, aux: c, fb: fbo([a, b, c]) }; garbage.push(a, b, c, state[i].fb);
      }
      bindT = ftex(GW, GH); bindT.fb = fbo([bindT]); garbage.push(bindT, bindT.fb);
      leadTex = ftex(NL, 5); garbage.push(leadTex);
      var sw = Math.max(2, Math.round(S.W * S.dpr / 2)), sh = Math.max(2, Math.round(S.H * S.dpr / 2));
      [cfg.sky, cfg.skyB || cfg.sky].forEach(function (sk, n) {
        var t = HIC.gl.texture(gl, { w: sw, h: sh, internal: gl.RGBA8 }), f = fbo([t]); skyT[n] = t; garbage.push(t, f);
        gl.viewport(0, 0, sw, sh); gl.disable(gl.BLEND); pSky.use(); paintSky(sk, sw, sh); HIC.gl.fullscreen(gl);
      });
      initState();
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    function paintSky(sk, sw, sh) {
      var u = pSky.u, st = sk.stops || DEFAULTS.sky.stops, cs = new Float32Array(18), ps = new Float32Array(6);
      st.slice(0, 6).forEach(function (s, i) { cs.set(rgb(s[1]), i * 3); ps[i] = s[0]; });
      gl.uniform2f(u.uRes, sw, sh); gl.uniform3fv(u.uC, cs); gl.uniform1fv(u.uP, ps); gl.uniform1i(u.uNs, Math.min(6, st.length));
      var sun = sk.sun, moon = sk.moon, cl = merge(DEFAULTS.sky.clouds, sk.clouds || {});
      gl.uniform4f(u.uSun, sun ? sun.x : 0, sun ? sun.y : 0, sun ? (sun.r || 0.03) : 0, 0); gl.uniform3fv(u.uSunC, rgb(sun ? sun.color || '#ffd9a0' : '#000')); gl.uniform1f(u.uSunG, sun ? (sun.glow === undefined ? 0.3 : sun.glow) : 0);
      gl.uniform4f(u.uMoon, moon ? moon.x : 0, moon ? moon.y : 0, moon ? (moon.r || 0.025) : 0, 0); gl.uniform3fv(u.uMoonC, rgb(moon ? moon.color || '#eeeadc' : '#000')); gl.uniform1f(u.uMoonG, moon ? (moon.glow === undefined ? 1 : moon.glow) : 0);
      gl.uniform4f(u.uCloud, cl.amount, cl.y0, cl.y1, cl.scale || 1); gl.uniform3fv(u.uShade, rgb(cl.shade)); gl.uniform3fv(u.uLit, rgb(cl.lit));
      gl.uniform1f(u.uCirrus, sk.cirrus === undefined ? 0.3 : sk.cirrus); gl.uniform1f(u.uRays, sk.rays || 0); gl.uniform1f(u.uVig, sk.vignette === undefined ? 0.22 : sk.vignette);
    }
    function simTarget() { var n = state[1 - cur]; gl.bindFramebuffer(gl.FRAMEBUFFER, n.fb); gl.viewport(0, 0, GW, GH); gl.disable(gl.BLEND); }
    function bindState(p) { HIC.gl.bind(gl, p, { uPos: state[cur].pos, uVel: state[cur].vel, uAux: state[cur].aux, uBind: bindT, uLead: leadTex, uPage: pageTex[pageCur], uPrev: pageTex[1 - pageCur] }); }
    function initState() {
      for (var i = 0; i < 2; i++) { gl.bindFramebuffer(gl.FRAMEBUFFER, state[i].fb); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
      gl.bindFramebuffer(gl.FRAMEBUFFER, bindT.fb); gl.clear(gl.COLOR_BUFFER_BIT);
      if (uploaded) { simTarget(); pSim.use(); bindState(pSim); simUniforms(0); gl.uniform1f(pSim.u.uInit, 1); HIC.gl.fullscreen(gl); cur = 1 - cur; }
      idle = true;
    }

    // ---- state
    var mode = 'rest', flyT = -1, landT = -1, simT = 0, origin = [0, 0], scope = [0, 0, 0, 0], idle = true, activeUntil = 0;
    var light = 0, lightGoal = 0, lightFrom = 0, lightT0 = 0, manual = still;
    var holds = [], hop = [0, 0, 0, 0], hopNext = 2, hopsN = 0, moves = null, ptr = { x: -1e4, y: -1e4, t: -1e9, f: 0 }, seed = 1, nextAir = 0;
    var snd = cfg.sound ? Sound(cfg.sound) : null;
    var rng = HIC.rng(cfg.seed);

    function rectOf(el) { var r = el.getBoundingClientRect(), c = canvas.getBoundingClientRect(); return [r.left - c.left, r.top - c.top, r.width, r.height]; }
    function inHold(n) { for (var e = n.nodeType === 1 ? n : n.parentElement; e && e !== page; e = e.parentElement) if (e.hasAttribute && e.hasAttribute('data-swarm-hold')) return true; return false; }
    // line boxes of the text the flock is made of (where the lead birds start)
    function textRects(scopeEl) {
      var out = [], w = doc.createTreeWalker(scopeEl || page, NodeFilter.SHOW_TEXT), n, rg = doc.createRange(), c = canvas.getBoundingClientRect();
      while ((n = w.nextNode())) {
        if (!n.nodeValue.trim() || inHold(n)) continue;
        rg.selectNodeContents(n); var rs = rg.getClientRects();
        for (var i = 0; i < rs.length; i++) if (rs[i].width > 1 && rs[i].height > 1) out.push([rs[i].left - c.left, rs[i].top - c.top, rs[i].width, rs[i].height]);
      }
      if (!out.length) out.push(scopeEl ? rectOf(scopeEl) : [W * 0.1, H * 0.1, W * 0.8, H * 0.6]);
      return out;
    }
    function spawns(rects) {
      var tot = 0, i, out = [], r2 = HIC.rng(cfg.seed + 11);
      rects.forEach(function (r) { tot += r[2] * r[3]; });
      for (i = 0; i < NL; i++) {
        var pick = r2() * tot, j = 0; while (j < rects.length - 1 && pick > rects[j][2] * rects[j][3]) { pick -= rects[j][2] * rects[j][3]; j++; }
        var r = rects[j]; out.push([r[0] + r2() * r[2], r[1] + r2() * r[3]]);
      }
      return out;
    }
    function uploadLeaders() {
      var L = leaders;
      for (var i = 0; i < NL; i++) {
        leadData.set([L.p[i * 3], L.p[i * 3 + 1], L.p[i * 3 + 2], L.bank[i]], (0 * NL + i) * 4);
        leadData.set([L.v[i * 3], L.v[i * 3 + 1], L.v[i * 3 + 2], 0], (1 * NL + i) * 4);
        leadData.set([L.side[i * 3], L.side[i * 3 + 1], L.side[i * 3 + 2], 0], (2 * NL + i) * 4);
        leadData.set([L.up[i * 3], L.up[i * 3 + 1], L.up[i * 3 + 2], 0], (3 * NL + i) * 4);
        leadData.set([L.s0[i * 3], L.s0[i * 3 + 1], L.s0[i * 3 + 2], 0], (4 * NL + i) * 4);
      }
      gl.bindTexture(gl.TEXTURE_2D, leadTex); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, NL, 5, gl.RGBA, gl.FLOAT, leadData); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    }
    function setMode(m) { mode = m; ctl.mode = m; if (m === 'fly') page.setAttribute('data-swarm-air', ''); else page.removeAttribute('data-swarm-air'); if (cfg.onMode) cfg.onMode(m); }

    // ---- fly / land / recall
    function fly(from, scopeEl) {
      if (mode === 'fly' || !uploaded) return;
      var r = from ? rectOf(from) : [W / 2, H / 2, 0, 0]; origin = [r[0] + r[2] / 2, r[1] + r[3] / 2];
      scope = scopeEl ? (function (b) { return [b[0] - 4, b[1] - 4, b[2] + 8, b[3] + 8]; })(rectOf(scopeEl)) : [0, 0, 0, 0];
      var fl = cfg.flock, sc = scopeEl ? Math.max(0.35, Math.min(1, Math.sqrt(scope[2] * scope[3] / (W * H)) * 1.6)) : 1;
      leaders = Leaders({ n: NL, k: fl.neighbours, W: W, H: H, D: D, ell: ell * sc, area: fl.area, depth: fl.depth, speed: fl.speed, minSpeed: fl.minSpeed, maxTurn: fl.maxTurn,
        align: fl.align, salience: fl.salience, cohere: fl.cohere, separate: fl.separate, goal: fl.goal, wander: fl.wander, reaction: fl.reaction, startle: fl.startle, seed: cfg.seed });
      leaders.ellScale = sc;
      leaders.reset(spawns(textRects(scopeEl)), origin, cfg.lift.speed * U, U);
      uploadLeaders();
      // bind every grain to its lead bird
      gl.bindFramebuffer(gl.FRAMEBUFFER, bindT.fb); gl.viewport(0, 0, GW, GH); gl.disable(gl.BLEND);
      pBind.use(); HIC.gl.bind(gl, pBind, { uLead: leadTex });
      gl.uniform1i(pBind.u.uN, NL); gl.uniform1f(pBind.u.uCell, cell); gl.uniform1f(pBind.u.uLiftV, cfg.lift.speed * U); gl.uniform1f(pBind.u.uLiftJ, cfg.lift.jitter); gl.uniform2f(pBind.u.uOrigin, origin[0], origin[1]);
      HIC.gl.fullscreen(gl);
      flyT = 0; landT = -1; idle = false; holds = holds.filter(function (h) { return h.until === Infinity; });
      setMode('fly');
      if (cfg.light.turn && !scopeEl) { lightFrom = light; lightGoal = lightGoal > 0.5 ? 0 : 1; lightT0 = simT + cfg.light.delay; }
      if (snd) snd.burst(1.6, 0.45);
    }
    function land() { if (mode !== 'fly') return; landT = 0; setMode('land'); if (snd) snd.burst(cfg.land.span + 1.2, 0.2); }
    // bring one element's birds home (it is being clicked or typed into while the page is in the air)
    function recall(el, secs) {
      if (!el || el === page) return;
      var h = null; holds.forEach(function (x) { if (x.el === el) h = x; });
      if (!h) { h = { el: el, w: 0 }; holds.push(h); }
      h.until = simT + (secs || 3); wake(4000);
    }
    function wake(ms) { activeUntil = Math.max(activeUntil, simT + ms / 1000); idle = false; }

    // ---- one step of everything
    var holdR = new Float32Array(32), holdW = new Float32Array(8), moveR = new Float32Array(32), moveD = new Float32Array(16);
    function simUniforms(dt) {
      var u = pSim.u, fl = cfg.flock, cr = cfg.creature;
      gl.uniform2f(u.uSize, W, H); gl.uniform2f(u.uOrigin, origin[0], origin[1]);
      gl.uniform1f(u.uCell, cell); gl.uniform1f(u.uD, D); gl.uniform1f(u.uTime, simT); gl.uniform1f(u.uDt, dt); gl.uniform1f(u.uU, U); gl.uniform1f(u.uInit, 0);
      gl.uniform1f(u.uFlyT, mode !== 'rest' ? flyT : -1); gl.uniform1f(u.uLandT, mode === 'land' ? landT : -1);
      gl.uniform1f(u.uEll, ell * (leaders ? leaders.ellScale : 1)); gl.uniform1f(u.uStretch, fl.shape === 'stream' ? fl.stretch * 1.8 : fl.stretch); gl.uniform1f(u.uThick, fl.shape === 'ball' ? 1 : fl.thick);
      gl.uniform1f(u.uForm, 1.6); gl.uniform1f(u.uK0, fl.follow[0]); gl.uniform1f(u.uK1, fl.follow[1]);
      gl.uniform1f(u.uAmax, 2600 * U); gl.uniform1f(u.uVmax, Math.max(900, fl.speed * 3) * U); gl.uniform1f(u.uJit, fl.jitter * U * 0.15);
      gl.uniform1f(u.uFlapHz, cr.flap); gl.uniform1f(u.uGlide, cr.glide); gl.uniform1f(u.uGather, cfg.lift.gather); gl.uniform1f(u.uKick, cfg.lift.kick * U);
      gl.uniform1f(u.uLandSpan, cfg.land.span); gl.uniform1f(u.uLandJ, cfg.land.jitter); gl.uniform1f(u.uLandOrder, { top: 0, origin: 1, random: 2 }[cfg.land.order] || 0);
      gl.uniform1f(u.uShapeKind, shapeId);
      gl.uniform4fv(u.uScope, scope);
      holdR.fill(0); holdW.fill(0);
      holds.slice(0, 8).forEach(function (h, i) { var r = rectOf(h.el); holdR.set([r[0] - 4, r[1] - 3, r[2] + 8, r[3] + 6], i * 4); holdW[i] = h.w; });
      gl.uniform4fv(u.uHold, holdR); gl.uniform1fv(u.uHoldW, holdW);
      var age = simT - ptr.t; gl.uniform4f(u.uPtr, ptr.x, ptr.y, (manual ? ptr.f : Math.max(0, 1 - age / 1.2)) * 9000 * U, 140 * U);
      gl.uniform4fv(u.uHop, hop);
      moveR.fill(0); moveD.fill(0); var nm = 0;
      if (moves) { moves.slice(0, 8).forEach(function (m, i) { moveR.set(m.rect, i * 4); moveD.set(m.d, i * 2); }); nm = Math.min(8, moves.length); moves = null; }
      gl.uniform4fv(u.uMove, moveR); gl.uniform2fv(u.uMoveD, moveD); gl.uniform1i(u.uMoves, nm);
    }
    function step(dt) {
      simT += dt;
      if (mode !== 'rest') flyT += dt;
      if (mode === 'land') landT += dt;
      if (light !== lightGoal && simT > lightT0) {
        var lt = Math.min(1, (simT - lightT0) / cfg.light.dur); lt = lt * lt * (3 - 2 * lt); light = lightFrom + (lightGoal - lightFrom) * lt;
        if (lt >= 1) light = lightGoal;
        var want = lightGoal > 0.5 ? 'b' : 'a'; if (lt > 0.5 && page.getAttribute('data-swarm-light') !== want) { page.setAttribute('data-swarm-light', want); if (scene) scene.setAttribute('data-swarm-light', want); }
      }
      holds.forEach(function (h) { var on = h.until === Infinity || simT < h.until; h.w = on ? Math.min(1, h.w + dt * 2) : Math.max(0, h.w - dt * 1.5); });
      holds = holds.filter(function (h) { return h.w > 0 || simT < h.until; });
      // the idle: now and then a few birds shuffle on the roost
      hop = [0, 0, 0, 0];
      if (mode === 'rest' && cfg.idle.hops && !calm && !still && simT > hopNext) {
        var rs = textRects(), r = rs[Math.floor(rng() * rs.length)], w = Math.min(r[2], 18 + rng() * 40);
        hop = [r[0] + rng() * Math.max(0, r[2] - w), r[1], w, r[3]]; hopsN++; hopNext = simT + cfg.idle.every[0] + rng() * (cfg.idle.every[1] - cfg.idle.every[0]); wake(1500);
      }
      if (leaders) {
        if (mode !== 'rest') {
          if (ptr.f > 0 || simT - ptr.t < 0.3) leaders.startle(ptr.x, ptr.y, 150 * U);
          leaders.step(dt, true); uploadLeaders();
        }
      }
      simTarget(); pSim.use(); bindState(pSim); simUniforms(dt); HIC.gl.fullscreen(gl); cur = 1 - cur;
      if (mode === 'land' && landT > cfg.land.span + cfg.land.jitter + 2.6) { setMode('rest'); flyT = -1; landT = -1; wake(800); }
      if (mode === 'fly' && cfg.trigger.intro && ctl.introOn && flyT > (cfg.trigger.intro.back || 3.5)) { ctl.introOn = false; land(); }
      if (snd) snd.level(mode === 'fly' ? 1 : mode === 'land' ? Math.max(0, 1 - landT / (cfg.land.span + 1)) : 0);
    }
    function diffKick() {
      simTarget(); pDiff.use(); bindState(pDiff);
      gl.uniform2f(pDiff.u.uSize, W, H); gl.uniform1f(pDiff.u.uCell, cell); gl.uniform1f(pDiff.u.uU, U); gl.uniform1i(pDiff.u.uSeed, 20 + (seed++ % 1000));
      HIC.gl.fullscreen(gl); cur = 1 - cur; wake(2500);
    }

    // ---- drawing
    var stride = 1, frameMs = [];
    function drawBirds(mirror) {
      var b = pBird.u, cr = cfg.creature;
      pBird.use(); HIC.gl.bind(gl, pBird, { uPos: state[cur].pos, uVel: state[cur].vel, uAux: state[cur].aux, uBind: bindT, uLead: leadTex, uPage: pageTex[pageCur] });
      gl.uniform2f(b.uSize, W, H); gl.uniform2i(b.uGrid, GW, GH); gl.uniform1f(b.uCell, cell); gl.uniform1f(b.uD, D); gl.uniform1f(b.uPx, S.dpr);
      gl.uniform1f(b.uStride, stride); gl.uniform1i(b.uOff, 0); gl.uniform1f(b.uLen, cr.size); gl.uniform1f(b.uMirror, mirror ? 1 : 0); gl.uniform1f(b.uWaterY, cfg.water ? cfg.water.y : 2);
      var tA = rgb(cr.tint || '#000'), tB = rgb(cr.tintB || cr.tint || '#000'), mA = cr.tint ? cr.tintMix : 0, mB = cr.tintB ? cr.tintMixB : mA;
      gl.uniform3f(b.uTint, tA[0] + (tB[0] - tA[0]) * light, tA[1] + (tB[1] - tA[1]) * light, tA[2] + (tB[2] - tA[2]) * light); gl.uniform1f(b.uTintMix, mA + (mB - mA) * light);
      gl.uniform3fv(b.uHaze, rgb(cr.haze)); gl.uniform1f(b.uGlow, cr.shape === 'firefly' ? 1 : 0); gl.uniform1i(b.uShape, shapeId); gl.uniform1f(b.uMirrorA, mirror ? 0.4 : 1);
      gl.enable(gl.BLEND); if (cr.blend === 'add') gl.blendFunc(gl.ONE, gl.ONE); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(vao); gl.drawArrays(gl.POINTS, 0, Math.ceil(GW * GH / stride));
      gl.disable(gl.BLEND);
    }
    function render(t) {
      var PW = canvas.width, PH = canvas.height;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, PW, PH); gl.disable(gl.BLEND);
      var c = pComp.u, wa = cfg.water;
      pComp.use(); HIC.gl.bind(gl, pComp, { uSkyA: skyT[0], uSkyB: skyT[1], uPage: pageTex[pageCur], uPos: state[cur].pos });
      gl.uniform2f(c.uRes, PW, PH); gl.uniform2f(c.uSize, W, H); gl.uniform2i(c.uGrid, GW, GH); gl.uniform1f(c.uCell, cell);
      gl.uniform1f(c.uLight, light); gl.uniform1f(c.uTime, t); gl.uniform1f(c.uIdle, idle ? 1 : 0);
      gl.uniform1f(c.uStarsA, cfg.sky.stars || 0); gl.uniform1f(c.uStarsB, (cfg.skyB || cfg.sky).stars || 0);
      gl.uniform1f(c.uWaterY, wa ? wa.y : 2); gl.uniform1f(c.uMirror, wa ? (wa.mirror === undefined ? 0.8 : wa.mirror) : 0); gl.uniform3fv(c.uDeep, rgb(wa ? wa.deep || '#2c2f4a' : '#000'));
      gl.uniform3fv(c.uGlint, rgb(wa ? wa.glint || '#ffd2a8' : '#000')); gl.uniform1f(c.uGlintX, wa ? (wa.glintX === undefined ? 0.75 : wa.glintX) : 0);
      gl.uniform1f(c.uSheen, calm || still ? 0 : cfg.idle.sheen);
      HIC.gl.fullscreen(gl);
      if (!idle) {
        drawBirds(false);
        if (wa) { gl.enable(gl.SCISSOR_TEST); gl.scissor(0, 0, PW, Math.round(PH * (1 - wa.y))); drawBirds(true); gl.disable(gl.SCISSOR_TEST); }
      }
      if (scene) {
        pScene.use(); HIC.gl.bind(gl, pScene, { uScene: sceneTex });
        gl.uniform1f(pScene.u.uWaterY, wa ? wa.y : 2); gl.uniform1f(pScene.u.uMirror, wa ? 1 : 0); gl.uniform1f(pScene.u.uTime, t); gl.uniform2f(pScene.u.uSize, PW, PH);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); HIC.gl.fullscreen(gl); gl.disable(gl.BLEND);
      }
    }

    // ---- size and upload
    function resize() {
      S.resize(); W = S.W; H = S.H;
      page.style.width = W + 'px'; page.style.height = H + 'px';
      if (scene) { scene.style.width = W + 'px'; scene.style.height = H + 'px'; }
      if (cfg.onResize) cfg.onResize(W, H);
      allocate(); if (mode !== 'rest') { setMode('rest'); flyT = landT = -1; }
      S.requestPaint();
    }
    var ready = false, lastPage = null;
    S.onPaint(function () {
      if (!W) return;
      var next = 1 - pageCur;
      if (!S.upload(page, pageTex[next])) return;
      if (scene) S.upload(scene, sceneTex);
      var first = !uploaded; pageCur = next; uploaded = true;
      if (first) { S.upload(page, pageTex[1 - pageCur]); initState(); }
      else if (moves) { wake(3500); }
      else if (mode === 'rest' && pendingDiff) diffKick();
      pendingDiff = false;
      if (!ready) {
        ready = true;
        var probeEl = page.querySelector('[data-hic-edit]') || page.firstElementChild;
        S.probe(page, probeEl).then(function (m) {
          S.place(page, [1, 0, 0, 1, 0, 0]); if (scene) S.place(scene, [1, 0, 0, 1, 0, 0]);
          S.ready({ mode: m, grains: GW * GH, cell: +cell.toFixed(2), leaders: NL, neighbours: cfg.flock.neighbours, shape: cfg.creature.shape });
          startIntro();
        });
      }
    });
    var pendingDiff = false;
    page.addEventListener('input', function (e) {
      pendingDiff = true;
      if (mode !== 'rest') recall(e.target.closest('[contenteditable],input,textarea,select') || e.target, 3);
    });
    page.addEventListener('beforeinput', function (e) { if (e.target.closest && e.target.closest('[data-swarm-oneline]') && (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak')) e.preventDefault(); });

    // ---- input
    canvas.addEventListener('pointermove', function (e) { var c = canvas.getBoundingClientRect(); ptr.x = e.clientX - c.left; ptr.y = e.clientY - c.top; if (mode !== 'rest') ptr.t = simT; });
    canvas.addEventListener('pointerleave', function () { ptr.t = -1e9; });
    canvas.addEventListener('pointerdown', function (e) {
      if (mode === 'rest') return;
      var t = e.target;
      if (t === page || t === canvas || (t.closest && !t.closest('a,button,input,textarea,select,[contenteditable],[data-swarm-hold],[data-swarm-piece]'))) {
        if (cfg.trigger.startle && leaders) { var c = canvas.getBoundingClientRect(); leaders.startle(e.clientX - c.left, e.clientY - c.top, 260 * U); }
      } else recall(t.closest('[data-swarm-piece],[contenteditable],input,textarea,select,button,a,td,th,li,p,h1,h2,h3') || t, 4);
    });
    var tr = cfg.trigger;
    function q$(s) { return typeof s === 'string' ? doc.querySelector(s) : s; }
    if (tr.fly) { var fb = q$(tr.fly); fb.addEventListener('mousedown', function (e) { e.preventDefault(); }); fb.addEventListener('click', function () { if (mode === 'rest') fly(fb); }); }
    if (tr.land) { var lb = q$(tr.land); lb.addEventListener('mousedown', function (e) { e.preventDefault(); }); lb.addEventListener('click', land); }
    if (tr.escape) doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mode === 'fly') land(); });
    [].forEach.call(page.querySelectorAll('[data-swarm-hold]'), function (el) { holds.push({ el: el, w: 1, until: Infinity }); });
    if (cfg.sound && cfg.sound.toggle) {
      var sb = q$(cfg.sound.toggle);
      if (sb) sb.addEventListener('click', function () { var on = snd.toggle(); sb.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    }
    function startIntro() {
      var it = cfg.trigger.intro;
      if (!it || calm || still || nointro) return;
      setTimeout(function () {
        if (mode !== 'rest' || doc.hidden) return;
        var el = q$(it.el); ctl.introOn = true; fly(el, it.scope === false ? null : el);
      }, (it.at || 1) * 1000);
    }

    // ---- reorder: elements that move in the layout fly from where they were
    function reflow(mutate, els) {
      els = els ? [].slice.call(els) : [];
      var before = els.map(rectOf); mutate();
      if (mode !== 'rest') return;
      var ms = [];
      els.forEach(function (el, i) { var a = rectOf(el), dx = before[i][0] - a[0], dy = before[i][1] - a[1]; if (Math.abs(dx) + Math.abs(dy) > 0.5) ms.push({ rect: [a[0], a[1] + 1, a[2], a[3] - 2], d: [dx, dy] }); });
      if (ms.length) { moves = ms; idle = false; wake(3500); } else pendingDiff = true;
    }

    // ---- the loop
    var last = 0, tick = 0;
    S.loop(function (t, dt) {
      if (!uploaded) return;
      if (!manual) {
        var active = mode !== 'rest' || simT < activeUntil || light !== lightGoal || holds.some(function (h) { return h.until !== Infinity; });
        if (active) { idle = false; step(dt); }
        else { simT += dt; if (!idle) { initState(); } if (cfg.idle.hops && !calm && simT > hopNext) step(dt); }
        if (mode === 'fly') { frameMs.push(dt * 1000); if (frameMs.length > 50) { var s = frameMs.slice().sort(function (a, b) { return a - b; }); if (s[25] > 30 && stride < 4) stride *= 2; frameMs = []; } }
      }
      render(manual ? simT : t);
    });
    root.addEventListener('resize', resize);
    resize();

    // ---- the test hook: deterministic stepping and read-back
    function readTex(tex) {
      var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      var a = new Float32Array(GW * GH * 4); gl.readPixels(0, 0, GW, GH, gl.RGBA, gl.FLOAT, a); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(f); return a;
    }
    root.__swarm = {
      fly: function (sel, scopeSel) { fly(sel ? q$(sel) : (tr.fly ? q$(tr.fly) : null), scopeSel ? q$(scopeSel) : null); },
      land: land, recall: function (sel, s) { recall(q$(sel), s); },
      manual: function (v) { manual = v !== false; },
      advance: function (sec, dt) { dt = dt || 1 / 30; for (var t = 0; t < sec - 1e-6; t += dt) { idle = false; step(dt); } render(simT); },
      pointer: function (x, y, f) { ptr.x = x; ptr.y = y; ptr.f = f || 0; ptr.t = simT; },
      // statistics of the grains that carry ink: how many are away, how far, accelerations, dips below home
      grains: function () {
        var p = readTex(state[cur].pos), x = readTex(state[cur].aux), n = 0, away = 0, birds = 0, quiver = 0, maxOff = 0, sumOff = 0, maxA = 0, dip = 0, air = 0;
        for (var i = 0; i < GW * GH; i++) { if (x[i * 4] < 0.05) continue; n++; var d = Math.hypot(p[i * 4], p[i * 4 + 1], p[i * 4 + 2]); if (d > 0.5) away++; if (p[i * 4 + 3] > 0.5) birds++; if (d > 0.2 && d < 3 && x[i * 4 + 3] < 0.5 && p[i * 4 + 3] < 0.5) quiver++; maxOff = Math.max(maxOff, d); sumOff += d; maxA = Math.max(maxA, x[i * 4 + 1]); dip = Math.max(dip, x[i * 4 + 2]); if (x[i * 4 + 3] > 0.5) air++; }
        return { ink: n, quiver: quiver / Math.max(1, n), away: away / Math.max(1, n), birds: birds / Math.max(1, n), air: air / Math.max(1, n), maxOff: maxOff, meanOff: sumOff / Math.max(1, n), maxAccel: maxA, dip: dip, amax: 2600 * U * 3 };
      },
      // offsets of the grains inside an element's box (to prove it re-formed)
      offsetIn: function (sel) {
        var r = rectOf(q$(sel)), p = readTex(state[cur].pos), x = readTex(state[cur].aux), m = 0, n = 0;
        for (var j = 0; j < GH; j++) for (var i = 0; i < GW; i++) { var hx = (i + 0.5) * cell, hy = (j + 0.5) * cell; if (hx < r[0] || hy < r[1] || hx > r[0] + r[2] || hy > r[1] + r[3]) continue; var k = (j * GW + i) * 4; if (x[k] < 0.05) continue; n++; m = Math.max(m, Math.hypot(p[k], p[k + 1], p[k + 2])); }
        return { n: n, max: m };
      },
      // the ripple probe: turn one edge bird hard and time when every other bird's heading departs from a twin flock
      ripple: function () {
        if (!leaders) return null;
        var A = leaders.clone(), B = leaders.clone(), e = 0, best = -1e9, c = [0, 0, 0], mv = [0, 0, 0], i, k;
        for (i = 0; i < NL; i++) for (k = 0; k < 3; k++) { c[k] += A.p[i * 3 + k] / NL; mv[k] += A.v[i * 3 + k] / NL; }
        for (i = 0; i < NL; i++) { var fr = (A.p[i * 3] - c[0]) * mv[0] + (A.p[i * 3 + 1] - c[1]) * mv[1] + (A.p[i * 3 + 2] - c[2]) * mv[2]; if (fr > best) { best = fr; e = i; } }   // the bird at the front
        A.panic[e] = 0.5; var h = A.heading(e) + 1.6; A.pdir[e * 3] = Math.cos(h); A.pdir[e * 3 + 1] = Math.sin(h); A.pdir[e * 3 + 2] = 0;
        var arr = new Float32Array(NL).fill(-1), dt = 1 / 60, turnFirst = -1;
        for (var s = 0; s < 240; s++) {
          A.step(dt, true); B.step(dt, true);
          for (i = 0; i < NL; i++) {
            if (arr[i] >= 0 || i === e) continue;
            var dh = Math.abs(Math.atan2(Math.sin(A.heading(i) - B.heading(i)), Math.cos(A.heading(i) - B.heading(i))));
            if (dh > 0.26) { arr[i] = (s + 1) * dt; }
          }
          if (turnFirst < 0) { var de = Math.abs(Math.atan2(Math.sin(A.heading(e) - B.heading(e)), Math.cos(A.heading(e) - B.heading(e)))); if (de > 0.26) turnFirst = (s + 1) * dt; }
        }
        var got = Array.from(arr).filter(function (x, i) { return i !== e && x >= 0; }).sort(function (a, b) { return a - b; });
        // the largest heading change any bird made in one step (turn-rate limit)
        return { birds: NL - 1, reached: got.length, first: got[0], median: got[got.length >> 1], last: got[got.length - 1], edgeTurn: turnFirst, reaction: cfg.flock.reaction, neighbours: leaders.K };
      },
      // the largest turn rate any lead bird makes (3D angle between successive velocities)
      maxTurnRate: function (sec) {
        if (!leaders) return null; var A = leaders.clone(), dt = 1 / 60, m = 0, prev = new Float32Array(A.v);
        for (var s = 0; s < sec * 60; s++) {
          A.step(dt, true);
          for (var i = 0; i < NL; i++) {
            var a0 = prev.subarray(i * 3, i * 3 + 3), a1 = A.v.subarray(i * 3, i * 3 + 3), l0 = Math.hypot(a0[0], a0[1], a0[2]), l1 = Math.hypot(a1[0], a1[1], a1[2]);
            if (l0 > 1 && l1 > 1 && A.t - A.lift[i] > 0.1) m = Math.max(m, Math.acos(Math.max(-1, Math.min(1, (a0[0] * a1[0] + a0[1] * a1[1] + a0[2] * a1[2]) / (l0 * l1)))) / dt);
          }
          prev.set(A.v);
        }
        return { maxRate: m, limit: cfg.flock.maxTurn * 2 };
      },
      // wingbeats: per-grain beat rate over `sec` of flight → how many flap, how many glide
      wings: function (sec) {
        sec = sec || 0.3; var a = readTex(state[cur].vel), p0 = readTex(state[cur].pos); root.__swarm.advance(sec, 1 / 60); var b = readTex(state[cur].vel), n = 0, flap = 0, glide = 0, hz = 0;
        for (var i = 0; i < GW * GH; i++) { if (p0[i * 4 + 3] < 0.9) continue; var d = b[i * 4 + 3] - a[i * 4 + 3]; if (d < -1) d += 6.2831853 * 64; var r = d / 6.2831853 / sec; n++; hz += r; if (r > 3) flap++; else if (r < 1) glide++; }
        return { birds: n, meanHz: hz / Math.max(1, n), flapping: flap / Math.max(1, n), gliding: glide / Math.max(1, n) };
      },
      info: function () { return { hops: hopsN, mode: mode, idle: idle, W: W, H: H, grid: [GW, GH], grains: GW * GH, cell: cell, leaders: NL, light: light, stride: stride, simT: simT, flyT: flyT, landT: landT }; },
      read: function () { gl.bindFramebuffer(gl.FRAMEBUFFER, null); var a = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, a); return Array.from(a); }
    };
    root.__hic.screenOf = function (el) { var b = HIC.box(page, el); return [b[0] + b[2] / 2, b[1] + b[3] / 2]; };
    ctl.fly = function (from, scopeEl) { fly(q$(from), q$(scopeEl)); }; ctl.land = land; ctl.recall = function (el, s) { recall(q$(el), s); }; ctl.reflow = reflow;
    ctl.sound = function (v) { return snd ? snd.toggle(v) : false; };
    return ctl;
  }

  root.Swarm = { start: start, DEFAULTS: DEFAULTS, SHAPES: SHAPES, draw: draw, version: '1.0.0' };
})(window);

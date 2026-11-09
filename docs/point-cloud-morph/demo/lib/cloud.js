// point-cloud-morph · cloud.js — one cloud of N points that holds a form, comes apart and becomes the next form.
// Every point keeps its index through the whole film; forms are sorted along a space-filling curve, so point i sits in
// the same relative place in every form and a morph flows (left goes left) instead of crossing at random.
//
//   const F = new Cloud({ count: 150000, accent: '#79a8ff', hud: { brand: 'NORRVIK', tabs: [...] } });
//   F.form('hall', (b) => b.building({ w: 30, d: 16, floors: 3, roof: 'truss' }));
//   F.form('tower', (b) => b.building({ w: 14, d: 14, floors: 12 }));
//   F.shot({ name: 'hall', form: 'hall', dur: 6, in: { style: 'scan', dur: 2.4 }, cam: { yaw: 30, pitch: 28, dist: 60 }, hud: {...} });
//   F.shot({ name: 'tower', form: 'tower', dur: 6, in: { style: 'nebula', dur: 2.6, sweep: 'up' }, cam: {...}, hud: {...} });
//   F.start();
//
// Every frame is a pure function of t (seek(t)); the live page adds drag-to-orbit and arrow keys on top.
import * as THREE from 'three';
import { Builder, rng, hashStr, D2R } from './forms.js';
import { Hud, loadFonts } from './hud.js';

export { Builder, rng, hashStr, D2R };
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const span = (t, a, b) => clamp((t - a) / (b - a));
export const ease = {
  linear: (t) => t, smooth: (t) => t * t * (3 - 2 * t), out: (t) => 1 - (1 - t) ** 3, in: (t) => t * t * t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2), sine: (t) => 0.5 - 0.5 * Math.cos(Math.PI * t),
};

// how a form comes apart and comes together. turb: noise displacement (× scene radius) at the middle of a point's move;
// expand: push out from the centre at the middle; win: share of the transition one point takes (small = a sharp sweep);
// flash: brightness and accent at the middle; freq: noise frequency (× 1 / radius)
export const STYLES = {
  nebula: { turb: 0.55, expand: 0.25, win: 0.5, flash: 0.35, freq: 1.4 },
  flow: { turb: 0.12, expand: 0.0, win: 0.6, flash: 0.15, freq: 2.0 },
  burst: { turb: 0.2, expand: 1.3, win: 0.35, flash: 0.5, freq: 1.2 },
  scan: { turb: 0.0, expand: 0.0, win: 0.07, flash: 1.6, freq: 1.0 },
  fold: { turb: 0.05, expand: -0.6, win: 0.5, flash: 0.3, freq: 1.0 },
  cut: { turb: 0, expand: 0, win: 1, flash: 0, freq: 1 },
};
const SWEEPS = { up: [0, 1, 0], down: [0, -1, 0], left: [-1, 0, 0], right: [1, 0, 0], front: [0, 0, 1], back: [0, 0, -1] };

const VERT = /* glsl */ `
attribute vec3 aA; attribute vec3 aB; attribute vec3 aWA; attribute vec3 aWB; attribute float aRand; attribute float aGA; attribute float aGB;
uniform vec3 uPivA[4]; uniform vec4 uRotA[4]; uniform vec3 uOffA[4]; uniform vec3 uPivB[4]; uniform vec4 uRotB[4]; uniform vec3 uOffB[4];
uniform float uP, uT, uTurb, uExpand, uWin, uFlash, uFreq, uKeyMin, uKeyMax, uSize, uPx, uRef, uFogNear, uFogFar, uFogMin, uShimmer, uTwinkle, uAlpha, uSpread;
uniform int uSweepMode; uniform vec3 uSweepDir, uCenter, uInk, uAccent;
varying vec3 vCol; varying float vA;
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;} vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 perm(vec4 x){return mod289(((x*34.)+1.)*x);} vec4 tis(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
 vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
 i=mod289(i);vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
 float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
 vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
 vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
 vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
 vec4 nm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=nm.x;p1*=nm.y;p2*=nm.z;p3*=nm.w;
 vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
float h11(float n){return fract(sin(n)*43758.5453123);}
vec3 rotp(vec3 p, vec3 c, vec4 r){ vec3 v=p-c; float sn=sin(r.w), co=cos(r.w); return c + v*co + cross(r.xyz,v)*sn + r.xyz*dot(r.xyz,v)*(1.-co); }
vec3 moveA(vec3 p){ int g=int(aGA+.5); for(int i=0;i<4;i++){ if(g==i+1){ p=rotp(p,uPivA[i],uRotA[i])+uOffA[i]; } } return p; }
vec3 moveB(vec3 p){ int g=int(aGB+.5); for(int i=0;i<4;i++){ if(g==i+1){ p=rotp(p,uPivB[i],uRotB[i])+uOffB[i]; } } return p; }
void main(){
  float key = uSweepMode==0 ? dot(aB-uCenter,uSweepDir) : uSweepMode==1 ? length(aB-uCenter) : uSweepMode==3 ? -length(aB-uCenter) : aRand;
  key = clamp((key-uKeyMin)/max(1e-5,uKeyMax-uKeyMin),0.,1.);
  float d = (key*(1.-uSpread) + h11(aRand*91.7)*uSpread)*(1.-uWin);
  float p = clamp((uP-d)/uWin,0.,1.);
  float q = p*p*p*(p*(p*6.-15.)+10.);
  vec3 pos = mix(aGA > .5 ? moveA(aA) : aA, aGB > .5 ? moveB(aB) : aB, q);
  float bump = sin(3.14159265*q);
  if (bump > 0.001 && (uTurb > 0. || uExpand != 0.)) {
    vec3 nq = pos*uFreq + vec3(0., uT*0.12, aRand*0.35);
    vec3 off = vec3(snoise(nq), snoise(nq+vec3(31.4,7.1,0.)), snoise(nq+vec3(0.,17.7,43.2)));
    pos += off*uTurb*bump;
    pos = uCenter + (pos-uCenter)*(1.+uExpand*bump*(0.6+0.8*h11(aRand*13.1)));
  }
  pos += vec3(sin(uT*1.7+aRand*61.), sin(uT*1.3+aRand*37.), sin(uT*1.9+aRand*17.))*uShimmer;
  vec3 w = mix(aWA,aWB,q);
  vec4 mv = modelViewMatrix*vec4(pos,1.);
  float z = max(0.01,-mv.z);
  float s = uSize*w.z*uPx*(uRef/z)*(1.+0.6*uFlash*bump);
  float a = 1.;
  if (s < 1.25) { a *= s/1.25; s = 1.25; }
  s = min(s, 24.*uPx);
  a *= mix(1., uFogMin, smoothstep(uFogNear,uFogFar,z));
  float ts = uT*3., tf = fract(ts); float tw = 1. - uTwinkle + uTwinkle*2.*mix(h11(aRand*517.+floor(ts)*13.17), h11(aRand*517.+(floor(ts)+1.)*13.17), tf*tf*(3.-2.*tf));
  vA = a*w.x*tw*uAlpha*(1.+uFlash*bump*1.6);
  vCol = mix(uInk, uAccent, clamp(w.y + 0.6*uFlash*bump, 0., 1.));
  gl_PointSize = s;
  gl_Position = projectionMatrix*mv;
}`;
const FRAG = /* glsl */ `
varying vec3 vCol; varying float vA;
void main(){ vec2 c = gl_PointCoord-.5; float d = dot(c,c)*4.; if (d>1.) discard; float a = exp(-d*3.2)*(1.-d*d); gl_FragColor = vec4(vCol, vA*a); }`;

export class Cloud {
  constructor(o = {}) {
    const q = new URLSearchParams(location.search);
    this.q = q;
    this.o = { count: 150000, seed: 1, ink: '#ece9e2', accent: '#7aa9ff', bg: '#040506', size: 2.0, alpha: 0.62, fps: 30, shimmer: 0.0015, twinkle: 0.1, loop: false, ...o };
    this.N = Math.min(262144, Math.max(1000, +(q.get('n') || this.o.count)));
    this.render$ = q.has('render');
    this.scale = +(q.get('scale') || (this.render$ ? 1 : 0)) || 0;
    this.off = new Set((q.get('off') || '').split(',').filter(Boolean));
    this.forms = new Map(); this.shots = []; this.rules = [];
    this.hudCfg = o.hud || {};
    this.W = 1920; this.H = 1080; this.FPS = this.o.fps;
    this.drag = { yaw: 0, pitch: 0 };
  }
  form(name, fn, o = {}) { this.forms.set(name, { name, fn, o }); return this; }
  shot(s) { this.shots.push(s); return this; }
  check(name, fn) { this.rules.push({ name, fn }); return this; }

  // ---- forms → GPU buffers
  _buildForm(f) {
    const n = this.N, use = clamp(f.o.use ?? 1, 0.05, 1), nShape = Math.round(n * use), b = new Builder(hashStr(f.name) ^ this.o.seed);
    f.fn(b, this);
    const s = b.sample(nShape, hashStr(f.name) + this.o.seed * 31);
    const pos = new Float32Array(n * 3), att = new Float32Array(n * 3), tags = new Uint8Array(n);
    pos.set(s.pos); att.set(s.att); tags.set(s.tags);
    // bbox / centre / radius from the shape points
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < nShape; i++) for (let a = 0; a < 3; a++) { const v = pos[i * 3 + a]; if (v < lo[a]) lo[a] = v; if (v > hi[a]) hi[a] = v; }
    const c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2], R = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2;
    // spare points (use < 1) become faint ambient specks around the form
    const r = rng(hashStr(f.name) + 5), sz = f.o.spare ?? 1.6;
    for (let i = nShape; i < n; i++) {
      for (let a = 0; a < 3; a++) pos[i * 3 + a] = c[a] + (r() - 0.5) * (hi[a] - lo[a] + R * 0.4) * sz;
      att[i * 3] = 0.12 + r() * 0.12; att[i * 3 + 1] = 0; att[i * 3 + 2] = 0.7;
    }
    // order: along a Morton curve over the form's own box (space) or shuffled (random)
    const idx = new Float64Array(n);
    if ((f.o.match ?? 'space') === 'random') { const rr = rng(hashStr(f.name) + 17); for (let i = 0; i < n; i++) idx[i] = Math.floor(rr() * 2 ** 30) * 262144 + i; }
    else {
      const ext = [hi[0] - lo[0] || 1, hi[1] - lo[1] || 1, hi[2] - lo[2] || 1];
      for (let i = 0; i < n; i++) {
        const qx = Math.max(0, Math.min(1023, ((pos[i * 3] - lo[0]) / ext[0]) * 1023 | 0)), qy = Math.max(0, Math.min(1023, ((pos[i * 3 + 1] - lo[1]) / ext[1]) * 1023 | 0)), qz = Math.max(0, Math.min(1023, ((pos[i * 3 + 2] - lo[2]) / ext[2]) * 1023 | 0));
        idx[i] = morton(qx, qy, qz) * 262144 + i;
      }
    }
    idx.sort();
    const P = new Float32Array(n * 3), A = new Float32Array(n * 3), T = new Uint8Array(n);
    for (let k = 0; k < n; k++) { const i = idx[k] % 262144; P[k * 3] = pos[i * 3]; P[k * 3 + 1] = pos[i * 3 + 1]; P[k * 3 + 2] = pos[i * 3 + 2]; A[k * 3] = att[i * 3]; A[k * 3 + 1] = att[i * 3 + 1]; A[k * 3 + 2] = att[i * 3 + 2]; T[k] = tags[i]; }
    const G = new Float32Array(n), mot = (f.o.motion || []).slice(0, 4);
    if (f.o.motion?.length > 4) console.warn(`form ${f.name}: only 4 motions are used`);
    mot.forEach((m, j) => { const id = s.tagNames.indexOf(m.tag) + 1; if (!id) console.warn(`form ${f.name}: motion tag "${m.tag}" matches no part`); for (let i = 0; i < n; i++) if (T[i] === id) G[i] = j + 1; });
    Object.assign(f, { motion: mot, grpAttr: new THREE.BufferAttribute(G, 1) });
    Object.assign(f, { pos: P, att: A, tags: T, tagNames: s.tagNames, lo, hi, c, R, L: s.L, nShape, posAttr: new THREE.BufferAttribute(P, 3), attAttr: new THREE.BufferAttribute(A, 3) });
  }
  _dustForm(R, c) {
    const n = this.N, P = new Float32Array(n * 3), A = new Float32Array(n * 3), r = rng(this.o.seed * 7 + 3);
    for (let i = 0; i < n; i++) {
      const z = 2 * r() - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z), rr = R * (0.6 + 1.6 * Math.cbrt(r()));
      P[i * 3] = c[0] + s * Math.cos(a) * rr; P[i * 3 + 1] = c[1] + z * rr * 0.6; P[i * 3 + 2] = c[2] + s * Math.sin(a) * rr;
      A[i * 3] = 0.05 + 0.1 * r(); A[i * 3 + 1] = 0; A[i * 3 + 2] = 0.6;
    }
    return { name: 'dust', motion: [], grpAttr: new THREE.BufferAttribute(new Float32Array(n), 1), pos: P, att: A, tags: new Uint8Array(n), tagNames: [], lo: [c[0] - R, c[1] - R, c[2] - R], hi: [c[0] + R, c[1] + R, c[2] + R], c, R: R * 2, nShape: n, posAttr: new THREE.BufferAttribute(P, 3), attAttr: new THREE.BufferAttribute(A, 3) };
  }

  // ---- timeline
  _plan() {
    let t = 0, prevCam = null, prevForm = null;
    const first = this.shots[0];
    for (const [i, s] of this.shots.entries()) {
      const st = { ...(STYLES[s.in?.style || (i === 0 ? 'scan' : 'nebula')] || STYLES.nebula), ...(s.in || {}) };
      st.style = s.in?.style || (i === 0 ? 'scan' : 'nebula');
      st.dur = st.style === 'cut' ? 0 : s.in?.dur ?? (i === 0 ? 2.4 : 2.6);
      st.from = s.in?.from || (i === 0 ? (this.o.loop ? this.shots[this.shots.length - 1].form : 'dust') : prevForm);
      st.spread = s.in?.spread ?? 0.25;
      Object.assign(s, { i, t0: t, t1: t + s.dur, in: st });
      if (!this.forms.has(s.form)) throw new Error(`shot ${s.name || i}: no form "${s.form}"`);
      // camera: prev end → cam over the transition, cam → to over the rest, plus yaw drift over the whole shot
      const base = { yaw: 30, pitch: 25, dist: 60, target: [0, 0, 0], fov: 32, frame: 0, ...(prevCam || {}) };
      const c = { ...base, frame: 0, frameY: 0, ...(s.cam || {}), target: (s.cam?.target || base.target).slice() };
      const to = s.cam?.to ? { ...c, ...s.cam.to, target: (s.cam.to.target || c.target).slice() } : null;
      s._cam = { from: i === 0 && !this.o.loop ? (s.cam?.from ? { ...c, ...s.cam.from } : c) : base, at: c, to, drift: s.cam?.drift ?? 1.2, easeIn: s.cam?.ease || 'inOut' };
      prevCam = this._camAt(s, s.dur); prevCam.drift = 0;
      prevForm = s.form; t += s.dur;
    }
    if (this.o.loop && first) first._cam.from = this._camAt(this.shots[this.shots.length - 1], this.shots[this.shots.length - 1].dur);
    this.DURATION = +t.toFixed(3);
  }
  _camAt(s, lt) {
    const C = s._cam, tin = Math.max(0.001, s.in.dur), mix = (a, b, k) => ({ yaw: lerp(a.yaw, b.yaw, k), pitch: lerp(a.pitch, b.pitch, k), dist: lerp(a.dist, b.dist, k), fov: lerp(a.fov, b.fov, k), frame: lerp(a.frame ?? 0, b.frame ?? 0, k), frameY: lerp(a.frameY ?? 0, b.frameY ?? 0, k), target: [0, 1, 2].map((j) => lerp(a.target[j], b.target[j], k)) });
    let v = lt < tin ? mix(C.from, C.at, ease[C.easeIn](span(lt, 0, tin))) : C.to ? mix(C.at, C.to, ease.sine(span(lt, tin, s.dur))) : mix(C.at, C.at, 0);
    v.yaw += C.drift * lt;
    return v;
  }
  shotAt(t) {
    const T = clamp(t, 0, this.DURATION - 1e-6); let s = this.shots[0];
    for (const x of this.shots) if (T >= x.t0) s = x;
    const lt = T - s.t0, p = s.in.dur > 0 ? clamp(lt / s.in.dur) : 1;
    return { s, i: s.i, name: s.name || s.form, lt, p, settled: p >= 1 };
  }

  // ---- three.js
  _setup() {
    const sc = this.scale || clamp((Math.min(innerWidth, (innerHeight * 16) / 9) * Math.min(2, devicePixelRatio || 1)) / 1920, 0.35, 1);
    this.k = sc; const W = Math.round(1920 * sc), H = Math.round(1080 * sc); this.w = W; this.h = H;
    this.gl = this.gl || new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, alpha: false, powerPreference: 'high-performance' });
    this.gl.setPixelRatio(1); this.gl.setSize(W, H, false); this.gl.setClearColor(new THREE.Color(this.o.bg), 1);
    this.frame = this.frame || document.getElementById('frame') || Object.assign(document.createElement('canvas'), { id: 'frame' });
    if (!this.frame.isConnected) document.body.appendChild(this.frame);
    this.frame.width = W; this.frame.height = H; this.g = this.frame.getContext('2d');
    if (!this.scene) {
      this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 5000);
      const geo = new THREE.BufferGeometry(), n = this.N, rnd = new Float32Array(n), r = rng(this.o.seed + 1);
      for (let i = 0; i < n; i++) rnd[i] = r();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
      this.geo = geo;
      this.uni = {
        uP: { value: 1 }, uT: { value: 0 }, uTurb: { value: 0 }, uExpand: { value: 0 }, uWin: { value: 1 }, uFlash: { value: 0 }, uFreq: { value: 1 }, uSpread: { value: 0.25 },
        uKeyMin: { value: 0 }, uKeyMax: { value: 1 }, uSweepMode: { value: 0 }, uSweepDir: { value: new THREE.Vector3(0, 1, 0) }, uCenter: { value: new THREE.Vector3() },
        uSize: { value: this.o.size }, uPx: { value: 1 }, uRef: { value: 60 }, uFogNear: { value: 40 }, uFogFar: { value: 120 }, uFogMin: { value: 0.3 },
        uShimmer: { value: 0 }, uTwinkle: { value: this.o.twinkle }, uAlpha: { value: this.o.alpha },
        uInk: { value: new THREE.Color(this.o.ink) }, uAccent: { value: new THREE.Color(this.o.accent) },
      };
      for (const X of ['A', 'B']) { this.uni['uPiv' + X] = { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) }; this.uni['uRot' + X] = { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 1, 0, 0)) }; this.uni['uOff' + X] = { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) }; }
      this.mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uni, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
      this.points = new THREE.Points(geo, this.mat); this.points.frustumCulled = false; this.scene.add(this.points);
    }
    this.uni.uPx.value = H / 1080;
  }
  _bind(s, p) {
    const A = s.in.from === 'dust' ? this.dust : this.forms.get(s.in.from), B = this.forms.get(s.form), u = this.uni, st = s.in;
    if (this._bound !== s) {
      this.geo.setAttribute('aA', A.posAttr); this.geo.setAttribute('aB', B.posAttr); this.geo.setAttribute('aWA', A.attAttr); this.geo.setAttribute('aWB', B.attAttr);
      this.geo.setAttribute('aGA', A.grpAttr); this.geo.setAttribute('aGB', B.grpAttr); this._mA = A.motion; this._mB = B.motion;
      this._bound = s;
      const R = Math.max(A === this.dust ? 0 : A.R, B.R), sw = st.sweep ?? (st.style === 'scan' ? 'up' : 'up');
      u.uTurb.value = st.turb * R; u.uExpand.value = st.expand; u.uWin.value = clamp(st.win, 0.02, 1); u.uFlash.value = this.off.has('flash') ? 0 : st.flash; u.uFreq.value = st.freq / Math.max(1e-3, R); u.uSpread.value = st.spread;
      const cB = B.c; u.uCenter.value.set(cB[0], cB[1], cB[2]);
      let mode = 0, dir = [0, 1, 0];
      if (sw === 'radial' || sw === 'in') mode = sw === 'radial' ? 1 : 3; else if (sw === 'random') mode = 2; else dir = Array.isArray(sw) ? norm(sw) : SWEEPS[sw] || SWEEPS.up;
      u.uSweepMode.value = mode; u.uSweepDir.value.set(dir[0], dir[1], dir[2]);
      // key range over the target form
      let kmin = Infinity, kmax = -Infinity; const P = B.pos;
      for (let i = 0; i < B.nShape; i += 7) { const x = P[i * 3] - cB[0], y = P[i * 3 + 1] - cB[1], z = P[i * 3 + 2] - cB[2], k = mode === 0 ? x * dir[0] + y * dir[1] + z * dir[2] : mode === 1 ? Math.hypot(x, y, z) : mode === 3 ? -Math.hypot(x, y, z) : 0; if (k < kmin) kmin = k; if (k > kmax) kmax = k; }
      if (mode === 2) { kmin = 0; kmax = 1; }
      u.uKeyMin.value = kmin; u.uKeyMax.value = kmax;
    }
    u.uP.value = p;
  }
  // tagged parts of a form move with time: spin (deg/s), sway { amp deg, hz, phase }, bob { amp [x,y,z], hz, phase }
  _motion(t) {
    for (const [X, M] of [['A', this._mA], ['B', this._mB]]) for (let j = 0; j < 4; j++) {
      const m = M?.[j], piv = this.uni['uPiv' + X].value[j], rot = this.uni['uRot' + X].value[j], off = this.uni['uOff' + X].value[j];
      if (!m) { rot.set(0, 1, 0, 0); off.set(0, 0, 0); continue; }
      const ax = norm(m.axis || [0, 1, 0]); piv.set(...(m.pivot || [0, 0, 0]));
      let ang = 0; if (m.spin) ang += m.spin * t * D2R; if (m.sway) ang += (m.sway.amp ?? 10) * D2R * Math.sin(2 * Math.PI * ((m.sway.hz ?? 0.5) * t + (m.sway.phase ?? 0)));
      rot.set(ax[0], ax[1], ax[2], ang);
      if (m.bob) { const k = Math.sin(2 * Math.PI * ((m.bob.hz ?? 0.4) * t + (m.bob.phase ?? 0))), a = m.bob.amp || [0, 1, 0]; off.set(a[0] * k, a[1] * k, a[2] * k); } else off.set(0, 0, 0);
    }
  }
  _camera(s, lt, live = true) {
    const c = this._camAt(s, lt), yaw = (c.yaw + (live ? this.drag.yaw : 0)) * D2R, pitch = clamp(c.pitch + (live ? this.drag.pitch : 0), -85, 85) * D2R;
    const cam = this.camera, T = c.target;
    cam.fov = c.fov; cam.aspect = 16 / 9;
    cam.position.set(T[0] + Math.sin(yaw) * Math.cos(pitch) * c.dist, T[1] + Math.sin(pitch) * c.dist, T[2] + Math.cos(yaw) * Math.cos(pitch) * c.dist);
    cam.up.set(0, 1, 0); cam.lookAt(T[0], T[1], T[2]);
    // frame: shift the subject right (+) or left (−) by a share of the width, frameY up (+) / down (−)
    if (c.frame || c.frameY) cam.setViewOffset(this.w, this.h, -c.frame * this.w, c.frameY * this.h, this.w, this.h); else cam.clearViewOffset();
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    this.uni.uRef.value = c.dist; this.uni.uFogNear.value = c.dist * 0.75; this.uni.uFogFar.value = c.dist * 1.6;
    return { ...c, yawShown: c.yaw + (live ? this.drag.yaw : 0), pitchShown: c.pitch + (live ? this.drag.pitch : 0) };
  }
  project(v, out = []) { const p = new THREE.Vector3(v[0], v[1], v[2]).project(this.camera); out[0] = (p.x * 0.5 + 0.5) * this.w; out[1] = (-p.y * 0.5 + 0.5) * this.h; out[2] = p.z < 1 && p.z > -1; return out; }

  // ---- one frame at t (seconds)
  renderAt(t, live = false) {
    const a = this.shotAt(t), s = a.s;
    this._bind(s, a.p); this._motion(t);
    const RA = (s.in.from === 'dust' ? this.forms.get(s.form) : this.forms.get(s.in.from)).R, RB = this.forms.get(s.form).R;
    this.uni.uT.value = t; this.uni.uShimmer.value = this.off.has('shimmer') ? 0 : this.o.shimmer * lerp(RA, RB, ease.smooth(a.p));
    const cam = this._camera(s, a.lt, live);
    this.gl.render(this.scene, this.camera);
    const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.drawImage(this.gl.domElement, 0, 0);
    if (!this.off.has('hud')) this.hud.draw(g, { t, a, s, cam, film: this, k: this.h / 1080, W: this.w, H: this.h });
    this.t = t;
  }

  // ---- checks (geometry, not pixels: check.mjs adds the pixel tests)
  runChecks() {
    const fail = [], warn = [], info = [], saveDrag = { ...this.drag }; this.drag = { yaw: 0, pitch: 0 };
    if (this.shots.length < 2) warn.push('one shot only: the style is a morph between at least two forms');
    if (this.DURATION < 6 || this.DURATION > 90) warn.push(`duration ${this.DURATION.toFixed(1)} s is outside 6–90 s`);
    const pt = [];
    for (const s of this.shots) {
      const nm = s.name || s.form, f = this.forms.get(s.form), hold = s.dur - s.in.dur;
      if (s.in.style !== 'cut' && s.in.dur < 1) warn.push(`${nm}: a ${s.in.dur}s transition is too fast to read as a morph (≥ 1.2 s)`);
      if (hold < 1.5) fail.push(`${nm}: the form holds only ${hold.toFixed(2)} s after its transition (≥ 1.5 s so it reads)`);
      if (s.i > 0 && s.in.from === s.form && s.in.style !== 'cut') warn.push(`${nm}: morphs from "${s.form}" into itself`);
      // the form at its settle moment (and at the shot end): inside the frame, big enough, clear of the copy
      for (const lt of [s.in.dur + Math.min(1, hold * 0.3), s.dur - 0.05]) {
        this._camera(s, lt, false);
        let inside = 0, n = 0; const xs = [], ys = [];
        for (let i = 0; i < f.nShape; i += 37) { this.project([f.pos[i * 3], f.pos[i * 3 + 1], f.pos[i * 3 + 2]], pt); n++; if (pt[2] && pt[0] >= 0 && pt[0] <= this.w && pt[1] >= 0 && pt[1] <= this.h) inside++; xs.push(pt[0] / this.w); ys.push(pt[1] / this.h); }
        xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
        const q = (A, k) => A[Math.floor(k * (A.length - 1))], wv = q(xs, 0.97) - q(xs, 0.03), hv = q(ys, 0.97) - q(ys, 0.03), out = 1 - inside / n;
        const when = lt === s.dur - 0.05 ? 'at the end' : 'when it settles';
        const edge = Math.max(-q(xs, 0.004), q(xs, 0.996) - 1, -q(ys, 0.004), q(ys, 0.996) - 1);
        if (!s.cam?.bleed && (out > 0.04 || edge > 0)) (out > 0.15 ? fail : warn).push(`${nm}: the form is cut by the frame ${when} (${(out * 100).toFixed(1)}% of its points outside) — pull back or move the target; cam.bleed: true if it is meant to overflow`);
        if (Math.max(wv, hv) < 0.3) warn.push(`${nm}: the form fills only ${(wv * 100).toFixed(0)}% × ${(hv * 100).toFixed(0)}% of the frame ${when} — move in`);
        const box = this.hud.copyBox(s);
        if (box) {
          let cnt = 0, tot = 0; for (let i = 0; i < f.nShape; i += 37) { this.project([f.pos[i * 3], f.pos[i * 3 + 1], f.pos[i * 3 + 2]], pt); tot++; const X = pt[0] / this.k, Y = pt[1] / this.k; if (X > box[0] && X < box[0] + box[2] && Y > box[1] && Y < box[1] + box[3]) cnt++; }
          if (cnt / tot > 0.08) warn.push(`${nm}: ${(100 * cnt / tot).toFixed(0)}% of the form sits under the copy ${when} — set cam.frame (e.g. 0.18) to push it right`); }
      }
      // callouts: anchors on screen, boxes apart, inside the shot's settled part
      const cs = this.hud.calloutBoxes(s);
      for (const [j, c] of cs.entries()) {
        if (!c.onScreen) fail.push(`${nm}: callout "${c.text}" points off screen`);
        if (c.box[0] < 24 || c.box[1] < 24 || c.box[0] + c.box[2] > 1896 || c.box[1] + c.box[3] > 1056) warn.push(`${nm}: callout "${c.text}" runs off the frame — change dx / dy`);
        if (c.at0 < s.in.dur * 0.8) warn.push(`${nm}: callout "${c.text}" appears before the form has formed`);
        for (const d of cs.slice(j + 1)) if (overlap(c.box, d.box)) fail.push(`${nm}: callouts "${c.text}" and "${d.text}" overlap`);
        const box = this.hud.copyBox(s); if (box && overlap(c.box, box)) fail.push(`${nm}: callout "${c.text}" covers the copy`);
      }
      info.push(`  ${s.t0.toFixed(2).padStart(6)} s  ${nm.padEnd(14)} ${s.in.style.padEnd(7)} in ${s.in.dur.toFixed(1)} s · hold ${hold.toFixed(1)} s · form "${s.form}" ${f.nShape} pts, R ${f.R.toFixed(1)}`);
    }
    for (const r of this.rules) { try { const v = r.fn(this); if (v === false || typeof v === 'string') fail.push(`${r.name}${typeof v === 'string' ? ': ' + v : ''}`); } catch (e) { fail.push(`${r.name}: ${e.message}`); } }
    this.drag = saveDrag;
    return { fail, warn, info };
  }
  cues() {
    const c = [];
    for (const s of this.shots) {
      if (s.in.dur > 0) c.push({ t: s.t0, kind: s.in.style, dur: s.in.dur });
      c.push({ t: s.t0 + s.in.dur, kind: 'settle' });
      for (const x of this.hud.calloutBoxes(s)) c.push({ t: s.t0 + x.at0, kind: 'callout' });
      if (s.hud?.title) c.push({ t: s.t0 + this.hud.copyIn(s), kind: 'copy' });
    }
    return { duration: this.DURATION, cues: c.sort((a, b) => a.t - b.t), shots: this.shots.map((s) => ({ name: s.name || s.form, t0: s.t0, dur: s.dur })) };
  }

  // ---- start: build, set the contract, run the live player unless ?render
  async start() {
    await loadFonts();
    this._plan();
    for (const f of this.forms.values()) this._buildForm(f);
    let R = 1, c = [0, 0, 0]; const used = this.shots.map((s) => this.forms.get(s.form));
    for (const f of used) R = Math.max(R, f.R); if (used[0]) c = used[0].c;
    this.dust = this._dustForm(R * 1.2, c);
    this.hud = new Hud(this, this.hudCfg);
    document.documentElement.style.background = this.o.bg;
    this._setup();
    Object.assign(window, {
      film: this, DURATION: this.DURATION, FPS: this.FPS, SIZE: { W: this.W, H: this.H },
      seek: (t) => { this.renderAt(t, !this.render$); return t; }, renderAt: (t) => this.renderAt(t, false),
      shotAt: (t) => { const a = this.shotAt(t); return { i: a.i, name: a.name, lt: a.lt, p: a.p }; }, runChecks: () => this.runChecks(), cues: () => this.cues(),
      showForm: (name, yaw = 0, pitch = 20) => this.showForm(name, yaw, pitch),
    });
    const t0 = this.q.has('t') ? +this.q.get('t') : 0;
    if (this.render$) { this.frame.style.cssText = 'display:block'; this.renderAt(t0, false); window.READY = window.__ready = true; return this; }
    this._live(t0);
    window.READY = window.__ready = true;
    return this;
  }
  // a form on its own, settled, turned to yaw (the form sheet: render.mjs --forms)
  showForm(name, yaw = 0, pitch = 20) {
    const f = this.forms.get(name); if (!f) throw new Error('no form ' + name);
    const fake = { in: { from: name, dur: 0, turb: 0, expand: 0, win: 1, flash: 0, freq: 1, spread: 0, style: 'cut' }, form: name, dur: 1, _cam: null, hud: {} };
    this._bound = null; this._bind(fake, 1); this._motion(0); this._bound = null;
    const fov = 32, dist = (f.R * 0.82) / Math.tan((fov / 2) * D2R);
    fake._cam = { from: { yaw, pitch, dist, fov, target: f.c, frame: 0 }, at: { yaw, pitch, dist, fov, target: f.c, frame: 0 }, to: null, drift: 0, easeIn: 'linear' };
    this._camera(fake, 1, false); this.uni.uShimmer.value = 0; this.uni.uT.value = 0;
    this.gl.render(this.scene, this.camera);
    const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(this.gl.domElement, 0, 0);
    this.hud.label(g, `${name.toUpperCase()} · YAW ${String(Math.round(((yaw % 360) + 360) % 360)).padStart(3, '0')} · ${f.nShape.toLocaleString('en')} PTS`, this.h / 1080);
  }

  // ---- live player: fits the window, loops, drag to orbit, ← → between shots, space pauses, ?scroll=1 scrubs by scroll
  _live(t0) {
    const css = document.createElement('style');
    css.textContent = `html,body{margin:0;height:100%;background:${this.o.bg};overflow:hidden}#frame{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);touch-action:none;cursor:grab}#frame.drag{cursor:grabbing}`;
    document.head.appendChild(css);
    const fit = () => { const W = innerWidth, H = innerHeight, k = Math.min(W / 16, H / 9); this.frame.style.width = `${16 * k}px`; this.frame.style.height = `${9 * k}px`; };
    fit();
    let resizeT = 0;
    addEventListener('resize', () => { fit(); clearTimeout(resizeT); resizeT = setTimeout(() => { const old = this.k; this._setup(); if (old !== this.k) this.renderAt(this.t || 0, true); }, 200); });
    const scroll = this.q.has('scroll');
    if (scroll) {
      const sp = document.createElement('div'); sp.style.cssText = `height:${Math.round(this.DURATION * 60)}vh`; document.body.appendChild(sp);
      document.documentElement.style.overflowY = 'auto'; document.body.style.overflowY = 'auto'; document.body.style.height = 'auto';
    }
    let t = t0, last = performance.now(), paused = this.q.has('t'), dragging = null;
    const jump = (d) => { const a = this.shotAt(t), i = clamp(a.i + d, 0, this.shots.length - 1), s = this.shots[i]; t = s.t0 + (d === 0 ? 0 : s.in.dur * 0.15); if (scroll) scrollTo(0, (t / this.DURATION) * (document.documentElement.scrollHeight - innerHeight)); };
    this.frame.addEventListener('pointerdown', (e) => { dragging = { x: e.clientX, y: e.clientY, moved: 0 }; this.frame.setPointerCapture(e.pointerId); this.frame.classList.add('drag'); });
    this.frame.addEventListener('pointermove', (e) => { if (!dragging) return; const k = 0.25 * (1920 / this.frame.clientWidth); this.drag.yaw -= (e.clientX - dragging.x) * k; this.drag.pitch = clamp(this.drag.pitch + (e.clientY - dragging.y) * k * 0.6, -40, 40); dragging.moved += Math.abs(e.clientX - dragging.x) + Math.abs(e.clientY - dragging.y); dragging.x = e.clientX; dragging.y = e.clientY; });
    const up = () => { if (dragging && dragging.moved < 4 && !scroll) paused = !paused; dragging = null; this.frame.classList.remove('drag'); };
    this.frame.addEventListener('pointerup', up); this.frame.addEventListener('pointercancel', up);
    addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') jump(1); else if (e.key === 'ArrowLeft') jump(-1); else if (e.key === ' ') { paused = !paused; e.preventDefault(); } else if (e.key === 'Home') { t = 0; } });
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (scroll) { const H = document.documentElement.scrollHeight - innerHeight; t = H > 0 ? (scrollY / H) * (this.DURATION - 0.01) : 0; }
      else if (!paused) { t += dt; if (t >= this.DURATION) t = this.o.loop ? t - this.DURATION : 0; }
      if (!dragging) { this.drag.yaw *= 0.985; this.drag.pitch *= 0.985; }
      this.renderAt(t, true);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

function morton(x, y, z) { const sp = (v) => { v = (v | (v << 16)) & 0x030000ff; v = (v | (v << 8)) & 0x0300f00f; v = (v | (v << 4)) & 0x030c30c3; v = (v | (v << 2)) & 0x09249249; return v >>> 0; }; return (sp(x) | (sp(y) << 1) | (sp(z) << 2)) >>> 0; }
function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function overlap(a, b) { return a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]; }

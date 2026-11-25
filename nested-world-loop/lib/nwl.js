/* nested-world-loop · nwl.js — the engine.
   A film is a RING of worlds. Each world is a three.js scene built in code at its own scale and in its own units; each
   holds a PORTAL (a similarity transform: position, rotation, uniform scale) where the next world sits, and the last
   world's portal holds the first — so one unbroken camera move goes in, and in, and arrives where it began.

   What this file does for you:
   - the camera rig: keys per world (pose + look target), joined across worlds into ONE path that is C1 everywhere,
     including the hand-offs, and timed by PERCEIVED distance (|move| / distance to what you look at), so a push
     from a desk into a 1/500 miniature feels like one steady dolly instead of a crawl followed by a rush;
   - the hand-off: the frame is rendered in the coordinates of the world the camera is in (the "root"); the enclosing
     world and the next two inner worlds are rendered in the same frame through their portal transforms, each in its
     own pass with its own lights, fog and shadows (light intensity, range, fog and shadow cameras are rescaled per
     pass so a world looks the same at any scale), sharing one logarithmic depth buffer so they occlude each other;
   - apertures: a portal may be a window / hatch / frame — the inner world is then stencil-masked to it until the
     camera passes through;
   - the lens and the print: depth of field focused on the look target, bloom, AgX tone map, grade, vignette,
     aberration, grain, optional bars;
   - the page contract: seek(t), DURATION, FPS, SIZE, __ready, a live player, ?render=1 ?t= ?scale= ?ss= ?debug=1,
     and window.__nwl (camera samples, seams, forced-root renders) for check.mjs.
   Everything is a pure function of t. */
import * as THREE from 'three';
export { THREE };

const TAU = Math.PI * 2;
// Fog that can START at a distance: an inner world's fog must begin where that world begins (its aperture / bounds),
// not at the camera standing in the outer world. Exp2 fog is carried as a linear Fog with far < 0 (= -density).
THREE.ShaderChunk.fog_fragment = `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogFactor = fogFar < 0.0 ? 1.0 - exp( - fogFar * fogFar * pow( max( vFogDepth - fogNear, 0.0 ), 2.0 ) ) : smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;
// three clamps a point / spot light's inverse-square falloff at 0.1 units (max(d², 0.01)); a world drawn at 1/100 puts its
// lamps closer than that, so the clamp would dim them only when they are small. Clamp at a scale no world reaches.
THREE.ShaderChunk.lights_pars_begin = THREE.ShaderChunk.lights_pars_begin.replace('max( pow( lightDistance, decayExponent ), 0.01 )', 'max( pow( lightDistance, decayExponent ), 1e-20 )');
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const mod = (n, m) => ((n % m) + m) % m;

// ---------- seeded randomness + noise (shared with make.js) ----------
export function rng(seed = 1) {
  let a = (seed >>> 0) || 0x9e3779b9;
  const r = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * r());
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.normal = (m = 0, s = 1) => m + s * Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(TAU * r());
  r.chance = p => r() < p;
  return r;
}
export const hash = (i, j = 0, s = 0) => { let h = (i * 374761393 + j * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
export const ease = {
  inOut: (p, k = 2) => { p = clamp(p); return p < .5 ? Math.pow(2 * p, k) / 2 : 1 - Math.pow(2 - 2 * p, k) / 2; },
  sine: p => .5 - .5 * Math.cos(Math.PI * clamp(p)),
  smooth: (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); },
};

// ---------- small vector helpers on arrays ----------
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
};

// ---------- portal transforms ----------
// portal: { at:[x,y,z], scale, rot:[rx,ry,rz] (radians, XYZ) } — maps a point of the NEXT world into THIS world.
function portalMatrix(p) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(p.rot || [0, 0, 0]), 'XYZ'));
  return m.compose(new THREE.Vector3(...p.at), q, new THREE.Vector3(p.scale, p.scale, p.scale));
}
const apply = (m, p) => new THREE.Vector3(...p).applyMatrix4(m).toArray();
const applyDir = (m, d) => new THREE.Vector3(...d).transformDirection(m).toArray();
const scaleOf = m => new THREE.Vector3().setFromMatrixColumn(m, 0).length();

// ---------- curve maths: centripetal Catmull–Rom (Barry–Goldman) on n-vectors with shared knots ----------
function bg(p0, p1, p2, p3, t0, t1, t2, t3, t) {
  const L = (a, b, ta, tb) => { const k = (t - ta) / (tb - ta || 1e-12); return a.map((v, i) => v + (b[i] - v) * k); };
  const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
  const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
  return L(B1, B2, t1, t2);
}
// Steffen monotone cubic: local tangents, never overshoots — used to time the move (τ → perceived distance).
function steffen(xs, ys) {
  const n = xs.length, h = [], s = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h[i] = xs[i + 1] - xs[i]; s[i] = (ys[i + 1] - ys[i]) / h[i]; }
  for (let i = 1; i < n - 1; i++) {
    const p = (s[i - 1] * h[i] + s[i] * h[i - 1]) / (h[i - 1] + h[i]);
    m[i] = (Math.sign(s[i - 1]) + Math.sign(s[i])) * Math.min(Math.abs(s[i - 1]), Math.abs(s[i]), .5 * Math.abs(p));
  }
  m[0] = s[0]; m[n - 1] = s[n - 2];
  const f = x => {
    let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
    const u = (x - xs[i]) / h[i], u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h[i] * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h[i] * m[i + 1];
  };
  f.d = x => { const e = 1e-4; return (f(x + e) - f(x - e)) / (2 * e); };
  return f;
}

// ---------- the film ----------
export function film(def) {
  const qs = new URLSearchParams(location.search);
  const RENDER = qs.has('render'), FREEZE = qs.has('t') ? +qs.get('t') : null, DEBUG = qs.has('debug');
  const ONLY = qs.has('only') ? qs.get('only').split(',').map(Number) : null;   // debug: draw only these passes (0 = the camera's world, 1 = next inner, -1 = enclosing)
  const SCALE = +(qs.get('scale') || 1), SS = +(qs.get('ss') || def.ss || 1);
  const [W, H] = def.size || [1920, 1080], FPS = def.fps || 30;
  const N = def.worlds.length;
  const look = Object.assign({ exposure: 0, bloom: { strength: .3, threshold: 1.1, radius: .75 }, dof: { maxBlur: 16 }, vignette: .28, grain: .035, aberration: .0012, bars: 0,
    grade: { lift: [0, 0, 0], gain: [1, 1, 1], sat: 1, contrast: 1, shadows: [0, 0, 0], highlights: [0, 0, 0] } }, def.look || {});
  look.grade = Object.assign({ lift: [0, 0, 0], gain: [1, 1, 1], sat: 1, contrast: 1, shadows: [0, 0, 0], highlights: [0, 0, 0] }, (def.look || {}).grade || {});
  look.bloom = Object.assign({ strength: .3, threshold: 1.1, radius: .75 }, (def.look || {}).bloom || {});
  look.dof = Object.assign({ maxBlur: 16 }, (def.look || {}).dof || {});

  // validate the ring
  // Timing: by default (keys without `at`) the engine times the move itself — constant PERCEIVED speed over the whole
  // ring, bent only by each key's `pace` (1 = cruise, .5 = linger, 1.5 = hurry) — and def.duration is the loop length.
  // Give every key an `at` and every world a `duration` to time it by hand instead.
  const AUTO = def.worlds.some(w => (w.keys || []).some(k => k.at === undefined));
  const problems = [];
  if (AUTO && !(def.duration > 0)) problems.push('auto timing (keys without `at`) needs film({ duration })');
  def.worlds.forEach((w, i) => {
    if (!w.id) problems.push(`world ${i} has no id`);
    if (AUTO) { w.duration = 1; (w.keys || []).forEach((k, j) => { k.at = j / Math.max(1, w.keys.length); }); }
    if (!(w.duration > 0)) problems.push(`${w.id}: duration must be > 0`);
    if (!w.portal || !(w.portal.scale > 0) || !w.portal.at) problems.push(`${w.id}: portal { at, scale } is required (where the next world sits)`);
    if (!w.keys || !w.keys.length) problems.push(`${w.id}: keys are required (the first key, at 0, is the entry pose)`);
    else {
      if (w.keys[0].at !== 0) problems.push(`${w.id}: the first key must be at 0 (the entry pose — the previous world's exit)`);
      w.keys.forEach((k, j) => { if (j && !(k.at > w.keys[j - 1].at)) problems.push(`${w.id}: keys must be in increasing time`); if (k.at >= w.duration) problems.push(`${w.id}: key at ${k.at} is not before the world's duration ${w.duration}`); if (!k.pos || !k.look) problems.push(`${w.id}: key ${j} needs pos and look`); });
    }
  });
  if (problems.length) throw new Error('nested-world-loop: ' + problems.join('; '));

  let starts = [], DURATION = 0; const reStart = () => { starts = []; DURATION = 0; for (const w of def.worlds) { starts.push(DURATION); DURATION += w.duration; } }; reStart();
  const M = def.worlds.map(w => portalMatrix(w.portal)), Minv = M.map(m => m.clone().invert());
  const Mof = n => M[mod(n, N)], MinvOf = n => Minv[mod(n, N)], Wof = n => worlds[mod(n, N)];

  // ---------- renderer + post targets ----------
  const canvas = document.createElement('canvas'); canvas.id = 'film';
  canvas.width = Math.round(W * SCALE); canvas.height = Math.round(H * SCALE);
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, logarithmicDepthBuffer: true, stencil: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(canvas.width, canvas.height, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  renderer.autoClear = false; renderer.localClippingEnabled = true;
  const IW = Math.round(canvas.width * SS), IH = Math.round(canvas.height * SS);
  const depthTex = new THREE.DepthTexture(IW, IH, THREE.UnsignedInt248Type); depthTex.format = THREE.DepthStencilFormat;
  const rtScene = new THREE.WebGLRenderTarget(IW, IH, { type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: true, depthTexture: depthTex, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const half = (w, h) => new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const rtDof = half(IW >> 1, IH >> 1);
  const bloomRT = [1, 2, 3, 4, 5].map(l => half(IW >> l, IH >> l)), bloomUp = [1, 2, 3, 4].map(l => half(IW >> l, IH >> l));

  const camera = new THREE.PerspectiveCamera(35, W / H, .01, 1e6);

  // ---------- build the worlds ----------
  const worlds = def.worlds.map((w, i) => ({ def: w, i, id: w.id, scene: new THREE.Scene(), root: new THREE.Group(), ticks: [], lights: [], mats: [], fogBase: null, aperture: null }));
  for (const W0 of worlds) {
    W0.scene.add(W0.root); W0.root.matrixAutoUpdate = false;
    const ctx = {
      THREE, renderer, root: W0.root, scene: W0.scene, world: W0.def, index: W0.i, get DURATION() { return DURATION; }, FPS, rng: rng(1000 + W0.i * 7919 + (def.seed || 0)),
      tick: fn => W0.ticks.push(fn),
      cycle: (t, n = 1) => mod(t / DURATION * n, 1),          // 0..1 phase that closes exactly at the loop (n whole cycles per loop)
      angle: (t, n = 1) => mod(t / DURATION * n, 1) * TAU,     // same, as an angle
      add: (...o) => { W0.root.add(...o); return o[0]; },
    };
    W0.def.build(ctx);
    if (W0.scene.fog) { const f = W0.scene.fog; W0.fogBase = f.isFogExp2 ? { density: f.density } : { near: f.near, far: f.far }; W0.scene.fog = new THREE.Fog(f.color, 1, 2); }
    W0.root.traverse(o => {
      if (o.isLight) {
        o.userData.base = { intensity: o.intensity, distance: o.distance ?? 0 };
        if (o.shadow && o.castShadow) { const c = o.shadow.camera; o.userData.base.shadow = { near: c.near, far: c.far, left: c.left, right: c.right, top: c.top, bottom: c.bottom, normalBias: o.shadow.normalBias, radius: o.shadow.radius }; }
        W0.lights.push(o);
      }
      if (o.material && [].concat(o.material).some(m => m.transparent)) { o.layers.set(1); W0.hasLayer1 = true; }
      if (o.material) for (const m of [].concat(o.material)) if (!W0.mats.includes(m)) { m.stencilWrite = true; m.stencilWriteMask = 0; m.stencilFunc = THREE.AlwaysStencilFunc; W0.mats.push(m); }
    });
    // aperture (optional): a window / hatch / frame the next world is seen through
    const ap = W0.def.portal.aperture;
    if (ap) {
      const g = ap.r ? new THREE.CircleGeometry(ap.r, 64) : new THREE.PlaneGeometry(ap.w, ap.h);
      const m = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false, side: THREE.DoubleSide, stencilWrite: true, stencilFunc: THREE.EqualStencilFunc, stencilZPass: THREE.IncrementStencilOp, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.IncrementStencilOp });
      const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false;
      const n = new THREE.Vector3(...(ap.normal || [0, 0, 1])).normalize(), up = new THREE.Vector3(...(ap.up || [0, 1, 0]));
      const basis = new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), n.clone().negate(), up);   // plane faces +n
      const local = new THREE.Matrix4().copy(basis).setPosition(new THREE.Vector3(...ap.center));
      const holder = new THREE.Group(); holder.matrixAutoUpdate = false; holder.add(mesh); mesh.matrixAutoUpdate = false; mesh.matrix.copy(local);
      const sc = new THREE.Scene(); sc.add(holder);
      W0.aperture = { scene: sc, holder, mat: m, center: ap.center, normal: n.toArray() };
    }
  }

  // ---------- the camera path ----------
  // keysAround(k): this world's keys + at least 3 keys on each side from the neighbouring worlds, mapped into world k's
  // coordinates, with τ = seconds from the start of world k. The same keys give the same curve in either world.
  function mapKey(key, G, tOff, scale) {
    return { tau: tOff + key.at, P: apply(G, key.pos), T: apply(G, key.look), U: applyDir(G, key.up || [0, 1, 0]), fov: key.fov ?? 35, roll: key.roll ?? 0, bokeh: key.bokeh ?? 0, exposure: key.exposure ?? 0, pace: key.pace ?? 1, scale };
  }
  const buildPath = k => {
    const own = def.worlds[k].keys.map(key => mapKey(key, new THREE.Matrix4(), 0, 1));
    const fwd = []; { let G = new THREE.Matrix4(), off = 0, n = k; while (fwd.length < 3) { G = G.clone().multiply(Mof(n)); off += Wof(n).def.duration; n++; for (const key of Wof(n).def.keys) fwd.push(mapKey(key, G, off, scaleOf(G))); } }
    const back = []; { let G = new THREE.Matrix4(), off = 0, n = k; while (back.length < 3) { n--; G = G.clone().multiply(MinvOf(n)); off -= Wof(n).def.duration; const ks = Wof(n).def.keys.map(key => mapKey(key, G, off, scaleOf(G))); back.unshift(...ks); } }
    const K = [...back, ...own, ...fwd];
    const i0 = back.length, i1 = back.length + own.length;          // segment range of this world: keys i0 … i1 (i1 = next entry)
    // shared knots (centripetal) from the combined pose + target chord
    const u = [0]; for (let i = 1; i < K.length; i++) { const d = Math.hypot(V.len(V.sub(K[i].P, K[i - 1].P)), V.len(V.sub(K[i].T, K[i - 1].T))); u.push(u[i - 1] + Math.sqrt(Math.max(d, 1e-9))); }
    const vec = i => [...K[i].P, ...K[i].T, ...K[i].U];
    const at = (j, f) => bg(vec(j - 1), vec(j), vec(j + 1), vec(j + 2), u[j - 1], u[j], u[j + 1], u[j + 2], lerp(u[j], u[j + 1], f));
    // perceived length per segment (sampled), cumulative at keys
    const S = 96, segs = [], ell = [0];
    for (let j = i0 - 1; j <= i1; j++) {
      const tab = [0]; let prev = at(j, 0);
      for (let s = 1; s <= S; s++) {
        const cur = at(j, s / S), P0 = prev.slice(0, 3), T0 = prev.slice(3, 6), P1 = cur.slice(0, 3), T1 = cur.slice(3, 6);
        const sig = Math.max(1e-9, .5 * (V.len(V.sub(P0, T0)) + V.len(V.sub(P1, T1))));
        tab.push(tab[s - 1] + Math.hypot(V.len(V.sub(P1, P0)), V.len(V.sub(T1, T0))) / sig); prev = cur;
      }
      segs[j] = tab;
    }
    const idx = []; for (let j = i0 - 1; j <= i1 + 1; j++) idx.push(j);
    const L = { [i0 - 1]: 0 }; for (let j = i0 - 1; j <= i1; j++) L[j + 1] = L[j] + segs[j][S];
    const timer = steffen(idx.map(j => K[j].tau), idx.map(j => L[j]));
    const sc = name => steffen(idx.map(j => K[j].tau), idx.map(j => K[j][name]));
    const fovF = sc('fov'), rollF = sc('roll'), bokehF = sc('bokeh'), expF = sc('exposure');
    function pose(tau) {
      const l = timer(tau);
      let j = i0 - 1; while (j < i1 && l > L[j + 1]) j++;
      const tab = segs[j], target = l - L[j];
      let lo = 0, hi = S; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (tab[mid] < target) lo = mid; else hi = mid; }
      const f = (lo + clamp((target - tab[lo]) / ((tab[hi] - tab[lo]) || 1e-12))) / S;
      const v = at(j, f);
      return { P: v.slice(0, 3), T: v.slice(3, 6), U: V.norm(v.slice(6, 9)), fov: fovF(tau), roll: rollF(tau), bokeh: Math.max(0, bokehF(tau)), exposure: expF(tau), speed: timer.d(tau) };
    }
    return { K, i0, i1, pose, segLen: j => segs[j][S] };
  };
  let paths = worlds.map((_, k) => buildPath(k));
  if (AUTO) {
    // seconds per segment ∝ perceived length / pace; then scale so the ring lasts def.duration
    const dt = paths.map(p => { const out = []; for (let j = p.i0; j < p.i1; j++) out.push(p.segLen(j) / Math.max(.05, .5 * (p.K[j].pace + p.K[j + 1].pace))); return out; });
    const total = dt.flat().reduce((a, b) => a + b, 0), k = def.duration / total;
    def.worlds.forEach((w, i) => { let acc = 0; w.keys.forEach((key, j) => { key.at = +(acc).toFixed(6); acc += dt[i][j] * k; }); w.duration = +acc.toFixed(6); });
    reStart(); paths = worlds.map((_, k) => buildPath(k));
  }

  // camera at film time t (in the world it is in, unless a root offset is forced: then mapped into world k+off)
  function camAt(t, off = 0) {
    const tt = mod(t, DURATION);
    let k = 0; while (k < N - 1 && tt >= starts[k + 1]) k++;
    const p = paths[k].pose(tt - starts[k]);
    p.k = k; p.tau = tt - starts[k]; p.sigma = V.len(V.sub(p.P, p.T));
    if (off) { // express the same pose in world k+off (for the invisible hand-off test)
      let G = new THREE.Matrix4();
      if (off > 0) for (let n = k; n < k + off; n++) G = MinvOf(n).clone().multiply(G);
      else for (let n = k - 1; n >= k + off; n--) G = Mof(n).clone().multiply(G);
      const s = scaleOf(G);
      Object.assign(p, { P: apply(G, p.P), T: apply(G, p.T), U: applyDir(G, p.U), k: k + off, sigma: p.sigma * s });
    }
    return p;
  }

  // ---------- post shaders ----------
  const quadGeo = new THREE.BufferGeometry(); quadGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quadScene = new THREE.Scene(), quad = new THREE.Mesh(quadGeo); quad.frustumCulled = false; quadScene.add(quad);
  const VS = `in vec3 position; out vec2 vUv; void main(){ vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`;
  const mk = (fs, uniforms) => new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: 'precision highp float; in vec2 vUv; out vec4 outColor;\n' + fs, uniforms, depthTest: false, depthWrite: false });
  const DEPTH = `uniform sampler2D tDepth; uniform float uFar, uFocus, uBokeh, uMax;
    float viewZ(vec2 uv){ float d = texture(tDepth, uv).r; return exp2(d * log2(uFar + 1.)) - 1.; }
    float coc(float z){ return clamp(uBokeh * abs(1. - uFocus / max(z, 1e-9)), 0., uMax); }`;
  const dofMat = mk(`uniform sampler2D tColor; uniform vec2 uPx; ${DEPTH}
    void main(){
      float z0 = viewZ(vUv), c0 = coc(z0); vec3 col = texture(tColor, vUv).rgb; float tot = 1.; float r = .7;
      float jit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831853;   // per-pixel turn of the spiral: no grid pattern in big blur
      for (int i = 0; i < 400; i++) {
        if (r >= uMax) break; float a = float(i) * 2.39996323 + jit;
        vec2 tc = vUv + vec2(cos(a), sin(a)) * uPx * r; float z = viewZ(tc), c = coc(z);
        if (z > z0) c = min(c, c0 * 2.);
        vec3 s = texture(tColor, tc).rgb; float m = smoothstep(r - .5, r + .5, c);
        col += mix(col / tot, s, m); tot += 1.; r += .55 / r;
      }
      outColor = vec4(col / tot, 1.);
    }`, { tColor: { value: null }, tDepth: { value: depthTex }, uPx: { value: new THREE.Vector2() }, uFar: { value: 1 }, uFocus: { value: 1 }, uBokeh: { value: 0 }, uMax: { value: 8 } });
  const downMat = mk(`uniform sampler2D tSrc; uniform vec2 uPx; uniform float uThresh;
    void main(){
      vec3 c = texture(tSrc, vUv + uPx * vec2(-1,-1)).rgb + texture(tSrc, vUv + uPx * vec2(1,-1)).rgb + texture(tSrc, vUv + uPx * vec2(-1,1)).rgb + texture(tSrc, vUv + uPx * vec2(1,1)).rgb;
      c = c * .125 + texture(tSrc, vUv).rgb * .5;
      if (uThresh > 0.) { float l = max(c.r, max(c.g, c.b)); c *= smoothstep(uThresh, uThresh * 1.6, l); c = min(c, vec3(60.)); }
      outColor = vec4(c, 1.);
    }`, { tSrc: { value: null }, uPx: { value: new THREE.Vector2() }, uThresh: { value: 0 } });
  const upMat = mk(`uniform sampler2D tLow, tHigh; uniform vec2 uPx; uniform float uRad;
    void main(){
      vec3 c = vec3(0.);
      for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) c += texture(tLow, vUv + uPx * vec2(x, y)).rgb * (x == 0 && y == 0 ? 4. : (x == 0 || y == 0 ? 2. : 1.));
      outColor = vec4(texture(tHigh, vUv).rgb + c / 16. * uRad, 1.);
    }`, { tLow: { value: null }, tHigh: { value: null }, uPx: { value: new THREE.Vector2() }, uRad: { value: 1 } });
  const finalMat = mk(`uniform sampler2D tColor, tDof, tBloom; uniform vec2 uPx; ${DEPTH}
    uniform float uExposure, uBloom, uVignette, uGrain, uAberr, uBars, uFrame, uAspect, uSat, uContrast, uSS;
    uniform vec3 uLift, uGain, uShadows, uHighs;
    vec3 agxCurve(vec3 x){ vec3 x2 = x*x, x4 = x2*x2; return 15.5*x4*x2 - 40.14*x4*x + 31.96*x4 - 6.868*x2*x + .4298*x2 + .1191*x - .00232; }
    vec3 agx(vec3 v){
      const mat3 m = mat3(.842479062253094, .0423282422610123, .0423756549057051, .0784335999999992, .878468636469772, .0784336, .0792237451477643, .0791661274605434, .879142973793104);
      const mat3 mi = mat3(1.19687900512017, -.0528968517574562, -.0529716355144438, -.0980208811401368, 1.15190312990417, -.0980434501171241, -.0990297440797205, -.0989611768448433, 1.15107367264116);
      v = m * max(v, vec3(1e-10)); v = clamp(log2(v), -12.47393, 4.026069); v = (v + 12.47393) / 16.499999;
      v = agxCurve(v); v = mi * v; return pow(max(v, vec3(0.)), vec3(2.2));
    }
    float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    vec3 lens(vec2 uv){
      vec3 s = texture(tColor, uv).rgb;
      if (uSS > 1.2) { vec2 o = uPx * .35; s = .25 * (texture(tColor, uv + o).rgb + texture(tColor, uv - o).rgb + texture(tColor, uv + vec2(o.x, -o.y)).rgb + texture(tColor, uv + vec2(-o.x, o.y)).rgb); }
      float c = coc(viewZ(uv)) * 2.;   // dof was computed at half resolution
      return mix(s, texture(tDof, uv).rgb, smoothstep(.6, 2.2, c));
    }
    void main(){
      vec2 uv = vUv, d = uv - .5;
      vec3 col;
      if (uAberr > 0.) { vec2 o = d * uAberr; col = vec3(lens(uv - o).r, lens(uv).g, lens(uv + o).b); } else col = lens(uv);
      col += texture(tBloom, uv).rgb * uBloom;
      col *= exp2(uExposure);
      col = agx(col);
      // grade (linear): split tone, lift / gain, contrast about mid grey, saturation
      float l = dot(col, vec3(.2126, .7152, .0722));
      col += uShadows * (1. - smoothstep(0., .35, l)) * .25 + uHighs * smoothstep(.3, 1., l) * .25;
      col = uLift + col * (uGain - uLift);
      col = pow(max(col, vec3(0.)), vec3(1. / 2.2)); col = (col - .5) * uContrast + .5; col = pow(max(col, vec3(0.)), vec3(2.2));
      l = dot(col, vec3(.2126, .7152, .0722)); col = max(vec3(0.), mix(vec3(l), col, uSat));
      float vig = 1. - uVignette * smoothstep(.25, .95, length(d * vec2(uAspect, 1.)) / length(vec2(uAspect, 1.) * .5) * .72);
      col *= vig;
      vec3 srgb = mix(col * 12.92, 1.055 * pow(max(col, vec3(0.)), vec3(1. / 2.4)) - .055, step(.0031308, col));
      float g = hash12(gl_FragCoord.xy + uFrame * 17.23) - .5; float gl = dot(srgb, vec3(.333));
      srgb += g * uGrain * (1.2 - gl);
      if (uBars > 0.) { float h = (1. - uAspect / uBars) * .5; if (uv.y < h || uv.y > 1. - h) srgb = vec3(0.); }
      outColor = vec4(clamp(srgb, 0., 1.), 1.);
    }`, {
    tColor: { value: rtScene.texture }, tDof: { value: rtDof.texture }, tBloom: { value: bloomUp[0].texture }, tDepth: { value: depthTex }, uPx: { value: new THREE.Vector2(1 / IW, 1 / IH) },
    uFar: { value: 1 }, uFocus: { value: 1 }, uBokeh: { value: 0 }, uMax: { value: 8 }, uExposure: { value: 0 }, uBloom: { value: look.bloom.strength }, uVignette: { value: look.vignette }, uGrain: { value: look.grain },
    uAberr: { value: look.aberration }, uBars: { value: look.bars || 0 }, uFrame: { value: 0 }, uAspect: { value: W / H }, uSat: { value: look.grade.sat }, uContrast: { value: look.grade.contrast }, uSS: { value: SS },
    uLift: { value: new THREE.Vector3(...look.grade.lift) }, uGain: { value: new THREE.Vector3(...look.grade.gain) }, uShadows: { value: new THREE.Vector3(...look.grade.shadows) }, uHighs: { value: new THREE.Vector3(...look.grade.highlights) },
  });
  const blit = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); };

  // ---------- portal bounds: the box (next world's units) the inner world occupies ----------
  // distance from the camera (root coords) to the box (0 inside); the box's 6 planes in root coords, normals out
  function boxLocal(b, G, camP) { return camP.clone().applyMatrix4(G.clone().invert()); }
  function boxDistance(b, G, camP) {
    const q = boxLocal(b, G, camP), dx = Math.max(b[0] - q.x, 0, q.x - b[3]), dy = Math.max(b[1] - q.y, 0, q.y - b[4]), dz = Math.max(b[2] - q.z, 0, q.z - b[5]);
    return Math.hypot(dx, dy, dz) * scaleOf(G);
  }
  const insideBox = (b, G, camP) => { const q = boxLocal(b, G, camP); return q.x > b[0] && q.x < b[3] && q.y > b[1] && q.y < b[4] && q.z > b[2] && q.z < b[5]; };
  function boxPlanes(b, G) {
    return [[1, 0, 0, b[3]], [-1, 0, 0, -b[0]], [0, 1, 0, b[4]], [0, -1, 0, -b[1]], [0, 0, 1, b[5]], [0, 0, -1, -b[2]]]
      .map(([x, y, z, d]) => new THREE.Plane(new THREE.Vector3(x, y, z), -d).applyMatrix4(G));
  }

  // ---------- one frame ----------
  const stats = { passes: 0 };
  function prepare(Wd, G, t, fogOff = 0) {
    Wd.root.matrix.copy(G); Wd.root.matrixWorldNeedsUpdate = true;
    const c = scaleOf(G);
    for (const L of Wd.lights) {
      const b = L.userData.base;
      if (L.isPointLight || L.isSpotLight) { L.intensity = b.intensity * c * c; L.distance = b.distance * c; }
      if (b.shadow) {
        const sc = L.shadow.camera; sc.near = b.shadow.near * c; sc.far = b.shadow.far * c;
        if (sc.isOrthographicCamera) { sc.left = b.shadow.left * c; sc.right = b.shadow.right * c; sc.top = b.shadow.top * c; sc.bottom = b.shadow.bottom * c; }
        L.shadow.normalBias = b.shadow.normalBias * c; sc.updateProjectionMatrix();
      }
    }
    if (Wd.scene.fog) { const f = Wd.scene.fog, b = Wd.fogBase; if (b.density !== undefined) { f.near = fogOff; f.far = -b.density / c; } else { f.near = b.near * c + fogOff; f.far = b.far * c + fogOff; } }
    return c;
  }
  function render(t, off = 0) {
    const cam = camAt(t, off), k = cam.k;
    // passes: the enclosing world, this one, and two inner ones (unrolled indices; a world may appear twice)
    const OUT = def.outer ?? 1, IN = def.inner ?? 2, list = [];
    const G = { [k]: new THREE.Matrix4() };
    for (let n = k + 1; n <= k + IN; n++) G[n] = G[n - 1].clone().multiply(Mof(n - 1));
    for (let n = k - 1; n >= k - OUT; n--) G[n] = G[n + 1].clone().multiply(MinvOf(n));
    const camP = new THREE.Vector3(...cam.P);
    let level = 0; const levels = {};
    for (let n = k - OUT; n <= k + IN; n++) {
      levels[n] = level;
      const ap = Wof(n).aperture; let active = false;
      if (ap) { const c = new THREE.Vector3(...ap.center).applyMatrix4(G[n]), nn = new THREE.Vector3(...ap.normal).transformDirection(G[n]); active = camP.clone().sub(c).dot(nn) > 0; }
      list.push({ n, active });
      if (active) level++;
    }
    // camera
    camera.position.copy(camP);
    const up = new THREE.Vector3(...cam.U);
    camera.up.copy(up); camera.lookAt(...cam.T);
    if (cam.roll) camera.rotateZ(cam.roll);
    camera.fov = cam.fov; camera.near = Math.max(1e-7, cam.sigma * .004); camera.far = cam.sigma * 2e5; camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    // animate every world that will be drawn (once per world, with the film time t)
    const seen = new Set(); for (const { n } of list) { const Wd = Wof(n); if (!seen.has(Wd)) { seen.add(Wd); for (const f of Wd.ticks) f(t, cam); } }
    // draw: clear, stencil apertures outer → inner, then worlds inner → outer (so glass in an outer world blends over the inner one)
    renderer.setRenderTarget(rtScene);
    const bg = new THREE.Color(Wof(k - OUT).def.background || '#000'); renderer.setClearColor(bg, 1); renderer.clear(true, true, true);
    for (const { n, active } of list) if (active) {
      const ap = Wof(n).aperture; ap.holder.matrix.copy(G[n]); ap.holder.matrixWorldNeedsUpdate = true; ap.mat.stencilRef = levels[n];
      renderer.render(ap.scene, camera);
    }
    // the camera's innermost region: the deepest world j whose box (its parent's portal.bounds) holds the camera, or
    // whose parent's aperture the camera has passed
    let hollowJ = -Infinity, hollowPlanes = null;
    for (const { n } of list) {
      const par = list.find(l => l.n === n - 1); if (!par) continue;
      const pb = Wof(n - 1).def.portal.bounds; if (!pb) continue;
      // through an aperture the region begins when the camera passes the opening; a containment portal's region when the camera enters its box
      if (Wof(n - 1).aperture ? !par.active : insideBox(pb, G[n], camP)) { hollowJ = n; hollowPlanes = boxPlanes(pb, G[n]); }
    }
    stats.passes = 0;
    // Two sweeps: every world's opaque surfaces first (inner → outer), then every world's glass, haze and glow (layer 1),
    // inner → outer — so a pane in an inner world is never painted over by an outer world's backdrop behind it, and the
    // outer world's glass (a bottle, a window) still lands over everything inside it.
    for (const layer of [0, 1]) {
      camera.layers.set(layer);
      for (let i = list.length - 1; i >= 0; i--) {
        const { n } = list[i], Wd = Wof(n), c = scaleOf(G[n]);
        if (c < 1e-6 || c > 1e6) continue;
        if (ONLY && !ONLY.includes(n - k)) continue;
        if (layer === 1 && !Wd.hasLayer1) continue;
        // fog of a world starts where that world starts: at its parent's aperture (while the camera is outside it), or
        // at the edge of the parent's portal.bounds box — so the fog of a world seen from outside is not the fog of
        // the whole distance from the camera
        let fogOff = 0;
        if (Wd.scene.fog) {
          const pp = Wof(n - 1).def.portal, parActive = list.find(l => l.n === n - 1)?.active;
          if (pp.aperture && parActive) fogOff = camP.distanceTo(new THREE.Vector3(...pp.aperture.center).applyMatrix4(G[n - 1] || G[n].clone().multiply(MinvOf(n - 1))));
          else if (pp.bounds) fogOff = boxDistance(pp.bounds, G[n], camP);
        }
        prepare(Wd, G[n], t, fogOff);
        // hollow: every world outside the camera's innermost region (see `hollowJ`) has its geometry inside that
        // region's box cut away, so an outer shell never intrudes on the world within.
        for (const m of Wd.mats) { m.clippingPlanes = n < hollowJ ? hollowPlanes : null; m.clipIntersection = n < hollowJ; }
        // stencil: a world draws at its own level (s == level). If its aperture is open to the camera, a second pass
        // draws what lies IN FRONT of the aperture plane over the deeper regions too (its frame, a lamp before the
        // picture) — what lies behind that plane never shows through the opening, so walls behind a window, or an
        // enclosing world's shell, can never cover the world inside.
        const lv = levels[n];
        const setStencil = (fn, ref) => { for (const m of Wd.mats) { m.stencilFunc = fn; m.stencilRef = ref; } };
        setStencil(THREE.EqualStencilFunc, lv);
        renderer.render(Wd.scene, camera); stats.passes++;
        if (list[i].active) {
          const ap = Wd.aperture, c0 = new THREE.Vector3(...ap.center).applyMatrix4(G[n]), nn = new THREE.Vector3(...ap.normal).transformDirection(G[n]);
          // (per-material clipping: renderer.clippingPlanes does not reach these passes reliably)
          const front = [new THREE.Plane(nn, -nn.dot(c0))];
          for (const m of Wd.mats) { m.clippingPlanes = front; m.clipIntersection = false; }
          renderer.shadowMap.autoUpdate = false; setStencil(THREE.LessEqualStencilFunc, lv + 1);
          renderer.render(Wd.scene, camera); stats.passes++;
          renderer.shadowMap.autoUpdate = true;
        }
      }
    }
    camera.layers.set(0);
    // lens: dof (half res) → bloom chain → final
    const far = camera.far, focus = cam.sigma, bokeh = cam.bokeh * IH / 1080 * .5;     // bokeh is in px at 1080p, dof runs at half res
    dofMat.uniforms.tColor.value = rtScene.texture; dofMat.uniforms.uPx.value.set(1 / rtDof.width, 1 / rtDof.height);
    Object.assign(dofMat.uniforms.uFar, { value: far }); dofMat.uniforms.uFocus.value = focus; dofMat.uniforms.uBokeh.value = bokeh; dofMat.uniforms.uMax.value = look.dof.maxBlur * IH / 1080 * .5;
    if (bokeh > .05) blit(dofMat, rtDof);
    let src = rtScene;
    bloomRT.forEach((rt, i) => { downMat.uniforms.tSrc.value = src.texture; downMat.uniforms.uPx.value.set(1 / src.width, 1 / src.height); downMat.uniforms.uThresh.value = i === 0 ? look.bloom.threshold : 0; blit(downMat, rt); src = rt; });
    for (let i = bloomUp.length - 1; i >= 0; i--) {
      const low = i === bloomUp.length - 1 ? bloomRT[i + 1] : bloomUp[i + 1];
      upMat.uniforms.tLow.value = low.texture; upMat.uniforms.tHigh.value = bloomRT[i].texture; upMat.uniforms.uPx.value.set(1 / low.width, 1 / low.height); upMat.uniforms.uRad.value = look.bloom.radius;
      blit(upMat, bloomUp[i]);
    }
    const u = finalMat.uniforms;
    u.uFar.value = far; u.uFocus.value = focus; u.uBokeh.value = bokeh > .05 ? bokeh : 0; u.uMax.value = dofMat.uniforms.uMax.value;
    u.uExposure.value = look.exposure + cam.exposure; u.uFrame.value = Math.round(mod(t, DURATION) * FPS);
    renderer.setClearColor(0x000000, 1); blit(finalMat, null);
    if (DEBUG) debugEl.textContent = `${Wof(k).id}  τ ${cam.tau.toFixed(2)}  t ${t.toFixed(2)}  σ ${cam.sigma.toPrecision(3)}  speed ${cam.speed.toFixed(2)}  passes ${stats.passes}  levels ${list.map(l => levels[l.n] + (l.active ? '*' : '')).join(',')}`;
    return cam;
  }

  // ---------- page contract + live player ----------
  const style = document.createElement('style');
  style.textContent = `html,body{margin:0;height:100%;background:#000;overflow:hidden}#film{position:absolute;inset:0;margin:auto;max-width:100%;max-height:100%;width:auto;height:auto;aspect-ratio:${W}/${H};display:block}
    #nwl-bar{position:absolute;left:0;right:0;bottom:0;height:4px;background:rgba(255,255,255,.12);cursor:pointer;opacity:0;transition:opacity .3s}body:hover #nwl-bar{opacity:1}#nwl-bar i{display:block;height:100%;background:rgba(255,220,170,.8);width:0}
    #nwl-debug{position:absolute;left:8px;top:8px;font:12px/1.4 ui-monospace,monospace;color:#fff;background:rgba(0,0,0,.55);padding:4px 8px;border-radius:4px}`;
  document.head.appendChild(style);
  const debugEl = document.createElement('div'); if (DEBUG) { debugEl.id = 'nwl-debug'; document.body.appendChild(debugEl); }
  let current = 0;
  window.DURATION = DURATION; window.FPS = FPS; window.SIZE = { W, H };
  window.seek = t => { current = t; render(t); return true; };
  window.filmInfo = () => ({ title: def.title, duration: DURATION, fps: FPS, size: [W, H], worlds: def.worlds.map((w, i) => ({ id: w.id, start: starts[i], duration: w.duration, scale: w.portal.scale, aperture: !!w.portal.aperture, keys: w.keys.length })), loopZoom: def.worlds.reduce((a, w) => a * w.portal.scale, 1) });
  window.__nwl = {
    seams: starts.slice(),
    cam: (t, off = 0) => { const c = camAt(t, off); return { k: c.k, P: c.P, T: c.T, U: c.U, fov: c.fov, sigma: c.sigma, speed: c.speed, bokeh: c.bokeh, tau: c.tau }; },
    renderAt: (t, off = 0) => { render(t, off); return true; },
    passes: () => stats.passes,
  };
  render(FREEZE ?? 0);
  window.__ready = true;

  if (!RENDER && FREEZE === null) {
    const bar = document.createElement('div'); bar.id = 'nwl-bar'; bar.innerHTML = '<i></i>'; document.body.appendChild(bar);
    let playing = true, base = performance.now() / 1000;
    const toggle = () => { playing = !playing; base = performance.now() / 1000 - current; };
    canvas.addEventListener('click', toggle);
    addEventListener('keydown', e => {
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { current = mod(current + (e.code === 'ArrowRight' ? 1 : -1), DURATION); base = performance.now() / 1000 - current; if (!playing) render(current); }
    });
    bar.addEventListener('click', e => { current = e.offsetX / bar.clientWidth * DURATION; base = performance.now() / 1000 - current; if (!playing) render(current); });
    const loop = () => { if (playing) { current = mod(performance.now() / 1000 - base, DURATION); render(current); } bar.firstChild.style.width = (current / DURATION * 100) + '%'; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  return { renderer, worlds, camAt, DURATION };
}

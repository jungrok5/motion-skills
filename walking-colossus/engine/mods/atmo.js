// Atmosphere & life module (round 2): local volumetric-looking effects that the post fog cannot give.
// Everything is a closed-form function of t (uniforms are recomputed from gait.js every frame).
//  - fogBanks : big soft world-stable mist sheets around the legs (alpha-blended; pushed by footfalls,
//               dragged along by lifting feet, warmed under the belly)
//  - glow     : additive warm light cones under the belly lamps + haze slabs in front of the lit facades
//  - plumes   : roof smoke, belly steam, hydraulic steam at knees/hips after a footfall, mist wake behind
//               a lifting foot. ALPHA-HASHED + depth-writing: the post fog replaces every pixel that has
//               no depth with sky, so blended sprites vanish against the sky; hashed ones do not and get
//               fogged correctly by distance.
//  - streaks  : additive rain catching window/lamp light near the facades, belly-edge drips, moths
//  - flock    : a few birds flushed out of the grass by some footfalls (opaque, fogged by post)
export async function create(ctx) {
  const { THREE, scene, walker, gait, LOOK, CFG, rng } = ctx;
  const AN = ctx.anchors;   // where this colossus hangs its lamps, hazes, chimneys, vents (colossus.js ANCHORS)
  const { GAIT, NLEGS, SPEED, LEGS } = gait;
  const T = GAIT.T, SWING = (1 - GAIT.duty) * T;
  const NS = 8, DSW = 0.28;
  const F = (v, d = 2) => Number(v).toFixed(d);

  // ---------------------------------------------------------------- shared uniforms
  const uTime = { value: 0 }, uCam = { value: new THREE.Vector3() }, uCtr = { value: new THREE.Vector2() };
  const uJit = { value: new THREE.Vector2() };
  const uPlant = { value: Array.from({ length: NLEGS }, () => new THREE.Vector4(0, 0, 99, 0)) };     // x, z, age, hash
  const uFootNow = { value: Array.from({ length: NLEGS }, () => new THREE.Vector4()) };               // ankle xyz, swing
  const uJoint = { value: Array.from({ length: NLEGS * 2 }, () => new THREE.Vector4(0, 0, 0, 99)) };  // knee/hip at touchdown, age
  const uLift = { value: new Array(NLEGS).fill(99) };
  const uFoot = { value: Array.from({ length: NLEGS * NS }, () => new THREE.Vector3()) };
  const uSpeed = { value: SPEED }, uRide = { value: CFG.RIDE_H };

  // tiling 4-channel fbm noise
  const tN = { value: (() => {
    const S = 128, r = rng(4242), data = new Uint8Array(S * S * 4);
    for (let ch = 0; ch < 4; ch++) {
      const acc = new Float32Array(S * S);
      let amp = 0.5;
      for (let o = 0; o < 5; o++) {
        const n = 4 << o, g = new Float32Array(n * n);
        for (let i = 0; i < n * n; i++) g[i] = r();
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          const fx = x / S * n, fy = y / S * n, ix = Math.floor(fx), iy = Math.floor(fy);
          let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
          const i1 = (ix + 1) % n, j1 = (iy + 1) % n;
          const a = g[iy * n + ix], b = g[iy * n + i1], c = g[j1 * n + ix], d = g[j1 * n + i1];
          acc[y * S + x] += amp * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
        }
        amp *= 0.5;
      }
      let lo = 1e9, hi = -1e9;
      for (let i = 0; i < S * S; i++) { lo = Math.min(lo, acc[i]); hi = Math.max(hi, acc[i]); }
      for (let i = 0; i < S * S; i++) data[i * 4 + ch] = Math.round(255 * (acc[i] - lo) / (hi - lo));
    }
    const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true; tex.needsUpdate = true;
    return tex;
  })() };

  const quad = (sx = 1, sy = 1) => { const g = new THREE.PlaneGeometry(1, 1, sx, sy); g.deleteAttribute('normal'); g.deleteAttribute('uv'); return g; };
  function instanced(base, attrs, n) {
    const ig = new THREE.InstancedBufferGeometry();
    ig.index = base.index; ig.setAttribute('position', base.getAttribute('position'));
    for (const k in attrs) ig.setAttribute(k, new THREE.InstancedBufferAttribute(attrs[k], attrs[k].length / n));
    ig.instanceCount = n;
    return ig;
  }
  const add = (m, name, order, parent = scene) => {
    m.frustumCulled = false; m.name = 'atmo-' + name; m.renderOrder = order; m.userData.noReflect = true;
    m.castShadow = false; m.receiveShadow = false; parent.add(m); return m;
  };
  const mistCol = LOOK.mistColor.clone().lerp(LOOK.fogColor, 0.25);

  // ================================================================ rolling ground-fog banks
  {
    const N = 84, WX = 250, WZ = 170, r = rng(1101);
    const off = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) { off[i * 4] = r() * WX; off[i * 4 + 1] = r() * WZ; off[i * 4 + 2] = r(); off[i * 4 + 3] = r(); }
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime, uCam, uCtr, uPlant, uFootNow, tN, uCol: { value: mistCol } },
      transparent: true, depthWrite: false,
      vertexShader: `
uniform float uTime; uniform vec3 uCam; uniform vec2 uCtr;
uniform vec4 uPlant[${NLEGS}]; uniform vec4 uFootNow[${NLEGS}];
attribute vec4 aOff;
varying vec2 vUv; varying float vA; varying float vY; varying vec2 vR; varying float vWarm;
void main(){
  vec2 HALF = vec2(${F(WX / 2, 1)}, ${F(WZ / 2, 1)});
  vec2 drift = vec2(-0.32, 0.2) * uTime * (0.7 + 0.6 * aOff.z);
  vec2 rel = mod(aOff.xy + drift - uCtr + HALF, HALF * 2.0) - HALF;
  vec2 xz = uCtr + rel;
  vec2 er = abs(rel) / HALF;
  float edge = (1.0 - smoothstep(0.72, 0.98, er.x)) * (1.0 - smoothstep(0.72, 0.98, er.y));
  // footfalls shove the fog outward and tear a hole; a lifting foot drags it along
  vec2 push = vec2(0.0); float thin = 0.0;
  for (int i = 0; i < ${NLEGS}; i++) {
    vec4 pl = uPlant[i];
    vec2 v = xz - pl.xy; float d = length(v) + 1e-3;
    float win = (1.0 - exp(-pl.z * 3.0)) * exp(-pl.z * 0.42) * smoothstep(${F(T)}, ${F(T * 0.6)}, pl.z);
    push += v / d * 7.0 * exp(-d * d / 200.0) * win;
    thin += exp(-d * d / 60.0) * win;
    vec4 f = uFootNow[i];
    vec2 fv = xz - f.xz;
    push += vec2(3.0, 0.0) * exp(-dot(fv, fv) / 110.0) * sin(3.14159 * f.w);
  }
  xz += push;
  float w = 24.0 + 30.0 * aOff.w, h = 3.2 + 3.6 * aOff.z;
  vec3 c = vec3(xz.x, h * 0.40, xz.y);
  vec3 toCam = uCam - c; float dist = length(toCam);
  vA = edge * smoothstep(9.0, 36.0, dist) * (0.55 + 0.45 * fract(aOff.w * 7.3)) * (1.0 - 0.7 * min(thin, 1.0));
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
  vec3 p = c + right * position.x * w + vec3(0.0, position.y * h, 0.0);
  // warm spill from the belly lamps
  vec3 q = vec3(max(abs(p.x - uCtr.x) - ${F(AN.spill.halfLen)}, 0.0), p.y - ${F(AN.spill.y)}, p.z);
  vWarm = 1.0 / (1.0 + dot(q, q) / 130.0);
  vUv = position.xy + 0.5; vY = p.y; vR = aOff.zw;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  if (vA < 1e-3) gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
}`,
      fragmentShader: `
uniform sampler2D tN; uniform vec3 uCol; uniform float uTime;
varying vec2 vUv; varying float vA; varying float vY; varying vec2 vR; varying float vWarm;
void main(){
  vec2 q = (vUv - 0.5) * 2.0;
  float env = smoothstep(1.0, 0.15, abs(q.x)) * smoothstep(1.0, -0.4, q.y) * smoothstep(-1.0, -0.6, q.y);
  vec2 np = vUv * vec2(1.3, 0.38) + vR * 9.0 + vec2(uTime * 0.007, uTime * 0.002);
  float n = texture2D(tN, np).r * 0.62 + texture2D(tN, np * 2.7 + 0.31).g * 0.38;
  float a = env * smoothstep(0.30, 0.74, n) * vA * smoothstep(-0.15, 0.9, vY);
  vec3 col = uCol * (1.06 + 0.2 * n) + vec3(0.42, 0.19, 0.06) * 0.16 * vWarm;
  gl_FragColor = vec4(col, a * 0.34);
}`,
    });
    add(new THREE.Mesh(instanced(quad(), { aOff: off }, N), mat), 'fogBanks', 1);
  }

  // ================================================================ additive light cones + facade haze
  {
    const list = [];  // [x, y, z, kind, len/halfW, width/halfH, intensity, rnd]
    const r = rng(2202);
    // cones under the six real belly lights (chassis PointLights)
    for (const [x, y, z] of AN.lamps)
      list.push([x, y + 0.5, z, 0, 9.5 + 2 * r(), 4.2 + 1.2 * r(), 0.075, r()]);
    // warm haze slabs hugging the lit faces (seen through mist at distance) and the end walls
    for (const [x, y, z, kind, hw, hh, I] of AN.hazes)
      list.push([x + (kind < 3 ? (r() - 0.5) * 5 : 0), y + (kind < 3 ? (r() - 0.5) * 3 : 0), z, kind, hw, hh, I * (kind < 3 ? 0.85 + 0.35 * r() : 1), r()]);
    if (!list.length) list.push([0, 0, 0, 0, 1, 1, 0, 0]);   // nothing to light: one invisible cone keeps the mesh valid
    const n = list.length, aP = new Float32Array(n * 4), aQ = new Float32Array(n * 4);
    list.forEach((L, i) => { aP.set(L.slice(0, 4), i * 4); aQ.set(L.slice(4, 8), i * 4); });
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime, uCam, tN },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `
uniform vec3 uCam;
attribute vec4 aP; attribute vec4 aQ;
varying vec2 vUv; varying float vI; varying float vK; varying float vR;
void main(){
  vec3 o = (modelMatrix * vec4(aP.xyz, 1.0)).xyz;
  vec3 p; float I = aQ.z;
  if (aP.w < 0.5) {
    float tt = 0.5 - position.y;                       // 0 at the lamp, 1 at the far end
    vec3 c = o - vec3(0.0, tt * aQ.x, 0.0);
    vec3 toCam = uCam - c;
    vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
    p = c + side * position.x * 2.0 * mix(0.35, aQ.y, tt);
    vec3 mid = o - vec3(0.0, aQ.x * 0.5, 0.0);
    vec3 vd = normalize(uCam - mid);
    I *= smoothstep(0.96, 0.7, abs(vd.y)) * smoothstep(5.0, 14.0, length(uCam - mid));
  } else {
    vec3 ax = aP.w < 2.5 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0);
    p = o + ax * position.x * 2.0 * aQ.x + vec3(0.0, position.y * 2.0 * aQ.y, 0.0);
    vec3 nrm = aP.w < 1.5 ? vec3(0.0, 0.0, 1.0) : aP.w < 2.5 ? vec3(0.0, 0.0, -1.0) : aP.w < 3.5 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 0.0) - vec3(1.0, 0.0, 0.0);
    vec3 toCam = uCam - o; float dist = length(toCam);
    I *= smoothstep(16.0, 95.0, dist) * smoothstep(0.02, 0.35, dot(toCam / dist, nrm));
  }
  vUv = position.xy + 0.5; vI = I; vK = aP.w; vR = aQ.w;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  if (I < 1e-4) gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
}`,
      fragmentShader: `
uniform sampler2D tN; uniform float uTime;
varying vec2 vUv; varying float vI; varying float vK; varying float vR;
void main(){
  vec2 q = (vUv - 0.5) * 2.0; float a;
  if (vK < 0.5) {
    float tt = 1.0 - vUv.y;
    float core = pow(max(1.0 - q.x * q.x, 0.0), 1.6);
    float n = texture2D(tN, vec2(q.x * 0.16 + vR * 3.0, tt * 0.22 - uTime * 0.012)).r;
    tt = clamp(tt, 0.0, 1.0);
    a = core * smoothstep(0.0, 0.05, tt) * pow(1.0 - tt, 1.4) / (1.0 + 2.5 * tt) * (0.45 + 1.1 * n);
  } else {
    float n = texture2D(tN, vUv * 0.55 + vR * 5.0 + vec2(uTime * 0.004, 0.0)).b;
    float g = exp(-dot(q, q) * 2.6) - 0.0743;
    a = max(g, 0.0) * (0.55 + 0.9 * n);
  }
  gl_FragColor = vec4(vec3(1.0, 0.47, 0.16) * a * vI, 1.0);
}`,
    });
    add(new THREE.Mesh(instanced(quad(2, 8), { aP, aQ }, n), mat), 'glow', 4, walker);
  }

  // ================================================================ plumes: smoke / steam / hydraulic puffs / foot wake
  {
    const list = [], r = rng(3303);
    const push = (x, y, z, kind, count) => { for (let i = 0; i < count; i++) list.push([x, y, z, kind, r(), (i + r()) / count, r(), r()]); };
    // roof chimneys (walker-local, above each roof section)
    for (const [x, y, z] of AN.smoke) push(x, y, z, 0, 14);
    // belly vents + stern exhaust
    for (const [x, y, z] of AN.vents) push(x, y, z, 1, 8);
    for (let l = 0; l < NLEGS; l++) { push(l * 2, 0, 0, 2, 6); push(l * 2 + 1, 0, 0, 2, 4); push(l, 0, 0, 3, 8); }
    const steam = new THREE.Color(0.150, 0.180, 0.235), smoke = new THREE.Color(0.105, 0.138, 0.200);   // close to the sky so the hash stipple stays low-contrast
    const mk = (hashed) => new THREE.ShaderMaterial({
      defines: hashed ? { HASHED: 1 } : {}, transparent: !hashed, depthWrite: hashed,
      uniforms: { uTime, uCam, uJit, uJoint, uLift, uFoot, uSpeed, uRide, tN, uSteam: { value: steam }, uSmoke: { value: smoke } },
      vertexShader: `
uniform float uTime, uSpeed, uRide; uniform vec3 uCam; uniform vec3 uSteam, uSmoke;
uniform vec4 uJoint[${NLEGS * 2}]; uniform float uLift[${NLEGS}]; uniform vec3 uFoot[${NLEGS * NS}];
attribute vec4 aEm; attribute vec4 aRnd;
varying vec2 vUv; varying float vA; varying vec3 vCol; varying vec2 vR;
void main(){
  float kind = aEm.w, age, size, alpha; vec3 p; vec3 col = uSteam;
  if (kind < 0.5) {
    float life = 11.0;
    age = fract(uTime / life + aRnd.y) * life;
    float te = uTime - age;
    p = vec3(uSpeed * te + aEm.x, uRide + aEm.y, aEm.z);
    p += vec3(-0.45, 0.0, 0.3) * age;
    p.y += 1.5 * (1.0 - exp(-0.24 * age)) / 0.24;
    p += vec3(sin(age * 0.6 + aRnd.x * 6.28), 0.3 * sin(age * 0.9 + aRnd.z * 6.28), cos(age * 0.5 + aRnd.w * 6.28)) * 0.22 * age;
    size = 0.75 + 0.42 * age;
    alpha = smoothstep(0.0, 0.5, age) * (1.0 - smoothstep(life * 0.45, life, age)) * 0.85 / (1.0 + 0.14 * age);
    col = mix(uSmoke, uSteam, 0.35 + 0.4 * aRnd.z);
  } else if (kind < 1.5) {
    float life = 4.2;
    age = fract(uTime / life + aRnd.y) * life;
    float te = uTime - age;
    p = vec3(uSpeed * te + aEm.x, uRide + aEm.y, aEm.z);
    p += vec3(-0.5 + (aRnd.x - 0.5), 0.0, (aRnd.w - 0.5) * 1.2) * age;
    p.y += -1.5 * (1.0 - exp(-1.3 * age)) + 0.22 * age * age;
    size = 0.5 + 0.6 * age;
    alpha = smoothstep(0.0, 0.3, age) * (1.0 - smoothstep(life * 0.4, life, age)) * 0.5;
    col = uSteam + vec3(0.22, 0.10, 0.03) * exp(-age * 0.8);
  } else if (kind < 2.5) {
    // hydraulic steam vented at knee (even) / hip (odd) right after the foot slams down
    int j = int(aEm.x);
    float hip = mod(aEm.x, 2.0);
    float td = aRnd.y * 0.55;
    age = uJoint[j].w - 0.08 - td;
    vec3 o = uJoint[j].xyz + vec3(uSpeed * (0.45 + 0.5 * hip) * td, 0.0, 0.0);
    float sgn = sign(o.z);
    vec3 dir = normalize(vec3(aRnd.x - 0.6, -0.15 + 0.7 * aRnd.z, sgn * (0.5 + aRnd.w)));
    p = o + dir * (0.9 + 3.6 * (1.0 - exp(-2.2 * max(age, 0.0))) / 2.2 * (0.6 + aRnd.w)) + vec3(-0.3, 0.55, 0.0) * max(age, 0.0);
    size = 0.45 + 1.0 * max(age, 0.0);
    alpha = step(0.0, age) * smoothstep(0.0, 0.12, age) * (1.0 - smoothstep(0.5, 2.6, age)) * 0.36;
    col = uSteam * 1.08;
  } else {
    // ground mist dragged along behind a lifting foot
    int leg = int(aEm.x);
    float td = (0.1 + 0.9 * aRnd.y) * ${F(SWING)};
    float f = clamp(td / ${F(DSW)}, 0.0, ${F(NS - 1.001, 3)});
    int k = int(floor(f));
    vec3 a0 = uFoot[leg * ${NS} + k], b0 = uFoot[leg * ${NS} + k + 1];
    vec3 fv = (b0 - a0) / ${F(DSW)};
    vec3 fp = mix(a0, b0, fract(f));
    age = uLift[leg] - td;
    float e = (1.0 - exp(-1.3 * max(age, 0.0))) / 1.3;
    p = vec3(fp.x - 2.5 + (aRnd.x - 0.5) * 5.0, 0.5 + 1.3 * aRnd.z, fp.z + (aRnd.w - 0.5) * 6.5);
    p += vec3(fv.x * 0.42 * e, 0.35 * max(age, 0.0) + min(fp.y, 3.0) * 0.35 * e, (aRnd.w - 0.5) * 1.5 * e);
    size = 1.5 + 0.9 * max(age, 0.0);
    alpha = step(0.0, age) * smoothstep(0.0, 0.35, age) * (1.0 - smoothstep(1.0, 3.4, age)) * 0.22;
    col = uSteam * 0.92;
  }
  float dist = length(uCam - p);
  alpha *= smoothstep(3.0, 8.0, dist);
  if (kind > 0.5) alpha *= 1.0 - 0.6 * smoothstep(0.08, 0.3, (uCam.y - p.y) / dist);   // puffs must not read as discs from above
  vec4 mv = viewMatrix * vec4(p, 1.0);
  float ang = aRnd.x * 6.28318 + age * (aRnd.z - 0.5) * 0.5;
  vec2 cr = vec2(cos(ang), sin(ang));
  mv.xy += (vec2(cr.x * position.x - cr.y * position.y, cr.y * position.x + cr.x * position.y)) * size * 2.0;
  vUv = position.xy + 0.5; vA = alpha; vCol = col; vR = aRnd.zw;
  gl_Position = projectionMatrix * mv;
  if (alpha < 1e-3) gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
}`,
      fragmentShader: `
uniform sampler2D tN; uniform vec2 uJit;
varying vec2 vUv; varying float vA; varying vec3 vCol; varying vec2 vR;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec2 q = (vUv - 0.5) * 2.0;
  float r = length(q);
  vec4 nz = texture2D(tN, vUv * 0.42 + vR * 7.0);
  float a = smoothstep(1.0, 0.25, r + (nz.r - 0.5) * 0.7) * smoothstep(0.18, 0.62, nz.g * 0.6 + nz.r * 0.4) * vA;
  vec3 col = vCol * (0.84 + 0.22 * q.y + 0.25 * nz.b);
#ifdef HASHED
  if (a <= h12(gl_FragCoord.xy + uJit)) discard;
  gl_FragColor = vec4(col, 1.0);
#else
  gl_FragColor = vec4(col, a * smoothstep(0.3, 0.75, nz.b * 0.5 + nz.g * 0.5));
#endif
}`,
    });
    const mkMesh = (rows, hashed, name, order) => {
      if (!rows.length) return;
      const n = rows.length, aEm = new Float32Array(n * 4), aRnd = new Float32Array(n * 4);
      rows.forEach((L, i) => { aEm.set(L.slice(0, 4), i * 4); aRnd.set(L.slice(4, 8), i * 4); });
      add(new THREE.Mesh(instanced(quad(), { aEm, aRnd }, n), mk(hashed)), name, order);
    };
    mkMesh(list.filter((L) => L[3] === 0), true, 'smoke', 0);
    mkMesh(list.filter((L) => L[3] !== 0), false, 'steam', 2);
  }

  // ================================================================ additive streaks: lit rain, belly drips, moths
  {
    const list = [], r = rng(4404);
    const RN = AN.rain, DR = AN.drips, RS = RN.y1 - RN.y0;
    for (let i = 0; i < 900; i++) { const s = r() < 0.6 ? 1 : -1; list.push([(r() * 2 - 1) * RN.x, r() * RS, s * (RN.z + 4.6 * r() * r()), 0, r(), r(), r(), r()]); }
    for (let i = 0; i < 170; i++) { const s = r() < 0.5 ? 1 : -1; list.push([(r() * 2 - 1) * DR.x, DR.y, s * (DR.z + 0.5 * r()), 1, r(), r(), r(), r()]); }
    for (const [x, y, z] of AN.lamps)
      for (let i = 0; i < 6; i++) list.push([x, y, z, 2, r(), r(), r(), r()]);
    const n = list.length, aP = new Float32Array(n * 4), aR = new Float32Array(n * 4);
    list.forEach((L, i) => { aP.set(L.slice(0, 4), i * 4); aR.set(L.slice(4, 8), i * 4); });
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime, uCam, uSpeed, uRide, tN },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
uniform float uTime, uSpeed, uRide; uniform vec3 uCam; uniform sampler2D tN;
attribute vec4 aP; attribute vec4 aR;
varying vec2 vUv; varying vec3 vC;
void main(){
  vec3 lp = aP.xyz, dir = vec3(0.0, -1.0, 0.0); float len, wid, I; vec3 col;
  if (aP.w < 0.5) {
    float vy = 7.0 + 2.5 * aR.x;
    lp.y = mod(aP.y - vy * uTime, ${F(RS)}) + ${F(RN.y0)};
    lp.x = mod(aP.x - (uSpeed + 0.5) * uTime + ${F(RN.x)}, ${F(2 * RN.x)}) - ${F(RN.x)};
    dir = normalize(vec3(-(uSpeed + 0.5), -vy, 0.0));
    len = 0.34; wid = 0.007;
    // pools of window light along the facade, belly-lamp light below it
    float lit = smoothstep(0.42, 0.8, texture2D(tN, vec2(lp.x * 0.021, lp.y * 0.034) + 0.37).a);
    float fac = lp.y > 0.5 ? lit * smoothstep(${F(RN.lit)}, ${F(RN.lit - 5)}, lp.y) : 0.55 * smoothstep(-7.0, -2.0, lp.y);
    I = fac * exp(-(abs(lp.z) - ${F(RN.z - 0.1)}) * 0.45) * 0.55 * smoothstep(0.0, 1.5, lp.y - ${F(RN.y0)});
    col = vec3(1.0, 0.52, 0.2);
  } else if (aP.w < 1.5) {
    float per = 1.3 + 2.8 * aR.x;
    float tau = fract(uTime / per + aR.y) * per;
    lp.y = aP.y - 4.9 * tau * tau;
    float v = 9.8 * tau;
    len = 0.05 + v * 0.022; wid = 0.012;
    I = step(-uRide + 0.2, lp.y) * (0.5 + 0.5 * aR.z) * 0.5;
    col = vec3(0.30, 0.36, 0.48) + vec3(0.5, 0.24, 0.08) * 0.7 * exp(-tau * 2.5);
  } else {
    // moths circling the lamps
    float w = 1.3 + 1.6 * aR.x, R = 0.5 + 1.1 * aR.y;
    lp += vec3(sin(uTime * w + aR.z * 6.28) * R, -0.5 + 0.55 * sin(uTime * w * 1.37 + aR.w * 6.28) * R, cos(uTime * w * 0.83 + aR.y * 6.28) * R);
    lp += vec3(sin(uTime * 17.0 + aR.w * 40.0), sin(uTime * 23.0 + aR.x * 40.0), sin(uTime * 19.0 + aR.z * 40.0)) * 0.07;
    len = 0.05; wid = 0.05;
    I = 0.8 * (0.45 + 0.55 * sin(uTime * 47.0 + aR.y * 60.0));
    col = vec3(1.0, 0.6, 0.28);
  }
  vec3 wp = (modelMatrix * vec4(lp, 1.0)).xyz;
  vec3 toCam = uCam - wp; float dist = length(toCam);
  float pxw = dist * 0.0011;                    // ~1 px at film framing: keep streaks from aliasing away
  float w2 = max(wid, pxw);
  I *= wid / w2 * smoothstep(2.5, 5.0, dist) * (1.0 - smoothstep(60.0, 110.0, dist));
  vec3 side = normalize(cross(dir, toCam));
  vec3 pp = wp + dir * position.y * max(len, pxw) + side * position.x * w2;
  vUv = position.xy + 0.5; vC = col * I;
  gl_Position = projectionMatrix * viewMatrix * vec4(pp, 1.0);
  if (I < 1e-3 || wp.y < 0.0) gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
}`,
      fragmentShader: `
varying vec2 vUv; varying vec3 vC;
void main(){
  float a = (1.0 - abs(vUv.x - 0.5) * 2.0) * sin(vUv.y * 3.14159);
  gl_FragColor = vec4(vC * a, 1.0);
}`,
    });
    add(new THREE.Mesh(instanced(quad(), { aP, aR }, n), mat), 'streaks', 5, walker);
  }

  // ================================================================ birds flushed out of the grass by a footfall
  {
    const P = [0, 0, 0.35, 0, 0, -0.3, -1, 0, 0, 0, 0, 0.35, 0, 0, -0.3, 1, 0, 0];
    const PER = 7, n = NLEGS * PER, r = rng(5505);
    const ig = new THREE.InstancedBufferGeometry();
    ig.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    const aB = new Float32Array(n * 4), aL = new Float32Array(n);
    for (let i = 0; i < n; i++) { aL[i] = Math.floor(i / PER); for (let q = 0; q < 4; q++) aB[i * 4 + q] = r(); }
    ig.setAttribute('aB', new THREE.InstancedBufferAttribute(aB, 4));
    ig.setAttribute('aL', new THREE.InstancedBufferAttribute(aL, 1));
    ig.instanceCount = n;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime, uCam, uPlant }, side: THREE.DoubleSide,
      vertexShader: `
uniform float uTime; uniform vec3 uCam; uniform vec4 uPlant[${NLEGS}];
attribute vec4 aB; attribute float aL;
void main(){
  vec4 pl = uPlant[int(aL)];
  float sgn = sign(pl.y);
  float a = pl.z - 0.12 - 0.7 * aB.x;                      // staggered take-off
  float on = step(pl.w, 0.4) * step(0.0, a);
  float h1 = fract(pl.w * 37.0), h2 = fract(pl.w * 91.0);
  vec3 s0 = vec3(pl.x + 5.0 + (h1 - 0.5) * 14.0 + (aB.y - 0.5) * 7.0, 0.35, pl.y + sgn * (10.0 + 7.0 * h2 + 5.0 * aB.z));
  vec3 dh = normalize(vec3(-0.9 + 1.4 * h2 + (aB.w - 0.5) * 0.5, 0.0, sgn * (0.8 + 0.4 * aB.y)));
  float aa = max(a, 0.0);
  float run = (8.0 + 3.0 * aB.w) * (aa - (1.0 - exp(-1.6 * aa)) / 1.6);
  vec3 c = s0 + dh * run + vec3(0.0, 4.5 * (1.0 - exp(-0.9 * aa)) + (0.9 + 0.8 * aB.z) * aa + 0.4 * sin(aa * 2.3 + aB.x * 9.0), 0.0);
  c += vec3(-dh.z, 0.0, dh.x) * sin(aa * 1.1 + aB.y * 6.28) * 1.5;
  vec3 rt = normalize(cross(dh, vec3(0.0, 1.0, 0.0)));
  float flap = sin(uTime * (17.0 + 6.0 * aB.w) + aB.w * 40.0);
  float sc = on * smoothstep(0.0, 0.3, a) * (1.0 - smoothstep(4.6, 5.6, a)) * smoothstep(7.0, 16.0, length(uCam - c));
  vec3 lp = position * 0.34 * sc;
  lp.y += abs(position.x) * flap * 0.3 * sc;
  vec3 wp = c + rt * lp.x + vec3(0.0, lp.y, 0.0) + dh * lp.z;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  if (sc < 1e-3) gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
}`,
      fragmentShader: `void main(){ gl_FragColor = vec4(0.014, 0.016, 0.022, 1.0); }`,
    });
    add(new THREE.Mesh(ig, mat), 'flock', 0);
  }

  // ================================================================ update (pure function of t)
  const fs = {}, fs2 = {}, bp = {}, hipA = [0, 0, 0], footA = [0, 0, 0], kneeA = [0, 0, 0], UP = [0, 1, 0];
  const fract = (x) => x - Math.floor(x);
  return {
    update(t, f) {
      uTime.value = t;
      uCam.value.setFromMatrixPosition(f.camera.matrixWorld);
      uCtr.value.set(SPEED * t, 0);
      uJit.value.set(fract(t * 61.7) * 113.0, fract(t * 37.3) * 71.0);
      for (let i = 0; i < NLEGS; i++) {
        const L = LEGS[i];
        gait.footState(i, t, fs);
        const nPlant = Math.floor(t / T + L.phase);
        uPlant.value[i].set(fs.plantX, fs.z, fs.plantAge, fract(Math.sin(nPlant * 12.9898 + i * 78.233) * 43758.5453));
        uFootNow.value[i].set(fs.x, fs.y, fs.z, fs.swing);
        // knee / hip where they were at the moment of touchdown
        const tp = t - fs.plantAge + 1e-4;
        gait.bodyPose(tp, bp); gait.footState(i, tp, fs2);
        hipA[0] = bp.x + L.hip[0]; hipA[1] = bp.y + L.hip[1]; hipA[2] = bp.z + L.hip[2];
        footA[0] = fs2.x; footA[1] = fs2.y; footA[2] = fs2.z;
        gait.solveKnee(hipA, footA, UP, CFG.THIGH, CFG.SHIN, kneeA);
        uJoint.value[i * 2].set(kneeA[0], kneeA[1] - 0.6, kneeA[2], fs.plantAge);
        uJoint.value[i * 2 + 1].set(hipA[0], hipA[1] - 0.4, hipA[2] + L.side * 1.6, fs.plantAge);
        // foot path after the last lift-off
        const ageL = fs.swing > 0 ? fs.liftAge : fs.plantAge + SWING;
        uLift.value[i] = ageL;
        const tl = t - ageL;
        for (let k = 0; k < NS; k++) {
          gait.footState(i, tl + k * DSW + 1e-4, fs2);
          uFoot.value[i * NS + k].set(fs2.x, Math.max(0, fs2.y - CFG.ANKLE_H), fs2.z);
        }
      }
    },
  };
}

// dragon-realm · 70_fx — effects as closed forms of time.  Nothing is simulated: every particle knows where it was
// born, when, and how it flies, and the vertex shader places it for the current film time.
//   DR.fx.sprites({ count, init(i, rng) → {p, v, t0, life, size, …}, … })   bursts, sprays, mist, embers, leaves, loops
//   DR.fx.rain({ count })                                                    streaks wrapped in a box round the lens
//   DR.fx.bolt({ t0, from, to, seed })                                       a lightning strike (+ DR.fx.flashAt(t))
//   DR.fx.glow({ at(t) → [x,y,z,size,k], color })                            a halo with rays (the pearl, a star)
//   DR.fx.splash({ t0, at, power })                                          a body breaking the water
// All of it draws in the effects layer after the air pass, with a soft manual depth test against the picture.
{
  const u = (v) => ({ value: v }), FX = (DR.fx = {});
  DR.fxU = { tDepth: u(null), uNF: u(new THREE.Vector2(0.5, 9000)) };
  const SOFT = /* glsl */`
    uniform sampler2D tDepth; uniform vec2 uNF;
    float drSceneZ(){ float z = texture2D(tDepth, gl_FragCoord.xy / uRes).r; return (uNF.x * uNF.y) / (uNF.y - z * (uNF.y - uNF.x)); }   // metres in front of the lens
    float drSoft(float viewZ, float range){ return clamp((drSceneZ() - viewZ) / range, 0.0, 1.0); }`;
  FX.SOFT = SOFT;
  const quad = () => { const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]); return g; };

  // ── sprites ──
  // opts: count, seed, init(i, rng) → { p:[x,y,z], v:[x,y,z], t0, life, size, grow (size multiplier at death), seed, col:[r,g,b] (linear), a }
  //   gravity (m/s², down positive), drag (1/s), kind: 'puff' (soft, eroded: mist, spray, smoke) | 'drop' (bright bead,
  //   stretched along its velocity) | 'spark' (additive point) | 'leaf' (a tumbling card), cover 0..1 (1 = hides what is
  //   behind, 0 = adds light), lit (how much the scene's light colours it), loop (seconds; 0 = once), wind (0..1 push)
  FX.sprites = (o) => {
    const S = { count: 100, seed: 1, gravity: 9.8, drag: 0.6, kind: 'puff', cover: 1, lit: 1, loop: 0, wind: 0, soft: 2.5, stretch: 0, bright: 1, ...o }, n = S.count, r = DR.rng(S.seed * 131 + 7);
    const A = new Float32Array(n * 4), B = new Float32Array(n * 4), Cc = new Float32Array(n * 4), D = new Float32Array(n * 4); let tMin = 1e9, tMax = -1e9;
    for (let i = 0; i < n; i++) { const q = S.init(i, r); A.set([q.p[0], q.p[1], q.p[2], q.t0], i * 4); B.set([q.v[0], q.v[1], q.v[2], q.life], i * 4); Cc.set([q.size, q.grow ?? 2, q.seed ?? r(), q.a ?? 1], i * 4); const c = q.col || [1, 1, 1]; D.set([c[0], c[1], c[2], q.spin ?? 0], i * 4); tMin = Math.min(tMin, q.t0); tMax = Math.max(tMax, q.t0 + q.life); }
    const g = quad(); g.setAttribute('aA', new THREE.InstancedBufferAttribute(A, 4)); g.setAttribute('aB', new THREE.InstancedBufferAttribute(B, 4)); g.setAttribute('aC', new THREE.InstancedBufferAttribute(Cc, 4)); g.setAttribute('aD', new THREE.InstancedBufferAttribute(D, 4)); g.instanceCount = n;
    const kind = { puff: 0, drop: 1, spark: 2, leaf: 3 }[S.kind];
    const mat = DR.shader({ uniforms: { ...DR.fxU, uP: u(new THREE.Vector4(S.gravity, S.drag, S.loop, S.wind)), uQ: u(new THREE.Vector4(S.cover, S.lit, S.soft, S.stretch)), uK: u(S.bright) },
      vertex: /* glsl */`
        attribute vec4 aA, aB, aC, aD; uniform vec4 uP, uQ; varying vec4 vC; varying vec3 vQ; varying float vZ;
        void main(){
          float age = uTime - aA.w; if (uP.z > 0.0) age = mod(age, uP.z);
          float life = aB.w, f = age / life;
          if (age < 0.0 || f >= 1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          float k = uP.y, e = k > 1e-4 ? (1.0 - exp(-k * age)) / k : age;
          vec3 vel = aB.xyz * exp(-k * age) + vec3(0.0, -uP.x * age, 0.0) * (k > 1e-4 ? 1.0 / (1.0 + k * age * 0.5) : 1.0);
          vec3 p = aA.xyz + aB.xyz * e + vec3(0.0, -0.5 * uP.x * age * age / (1.0 + k * age * 0.35), 0.0);
          p += vec3(uWind.x, 0.0, uWind.y) * uWind.z * uP.w * age * (1.5 + 2.0 * aC.z);
          float size = aC.x * mix(1.0, aC.y, f);
          vec4 mv = viewMatrix * vec4(p, 1.0);
          vec2 q = position.xy; float rot = aD.w * age + aC.z * 6.28;
          ${kind === 3 ? 'float cs = cos(rot), sn = sin(rot); q = vec2(q.x * cs - q.y * sn, q.x * sn + q.y * cs); q.y *= 0.35 + 0.65 * abs(sin(rot * 1.7 + aC.z * 9.0));' : ''}
          if (uQ.w > 0.0) { vec3 vv = (viewMatrix * vec4(vel, 0.0)).xyz; float sp = length(vv.xy); vec2 d = sp > 1e-3 ? vv.xy / sp : vec2(0.0, 1.0); float len = 1.0 + uQ.w * sp * 0.06; q = d * q.y * len + vec2(-d.y, d.x) * q.x; }
          mv.xy += q * size; vZ = -mv.z; gl_Position = projectionMatrix * mv;
          float fade = smoothstep(0.0, 0.08, f) * (1.0 - smoothstep(0.55, 1.0, f));
          vec3 light = mix(vec3(1.0), (mix(uSkyHor, uSkyZen, 0.4) * uAmb + uKeyCol * 0.32 * drCloudSun(p)) , uQ.y);
          vec3 fl = uFlash.xyz - p; light += uFlashCol * uFlash.w * 1.2 / (1.0 + dot(fl, fl) * 3.0e-5) * uQ.y;
          vec3 gl2 = uGlow.xyz - p; light += uGlowCol * uGlow.w * 1.5 / (1.0 + dot(gl2, gl2) * 0.004) * uQ.y;
          vC = vec4(aD.rgb * light, aC.w * fade); vQ = vec3(position.xy * 2.0, aC.z); vWPos = p;
        }`,
      fragment: /* glsl */`
        ${SOFT} uniform vec4 uQ; uniform float uK; varying vec4 vC; varying vec3 vQ; varying float vZ;
        void main(){
          float r = length(vQ.xy); if (r > 1.0) discard;
          float a;
          ${kind === 0 ? 'vec4 n = drN4(vQ.xy * 0.19 + vQ.z * 7.0 + vec2(0.0, uTime * 0.03)); a = smoothstep(1.0, 0.25, r + (n.r - 0.5) * 0.9) * (0.55 + 0.45 * n.g);'
          : kind === 1 ? 'a = smoothstep(1.0, 0.55, length(vQ.xy * vec2(1.0, 1.0)));'
          : kind === 2 ? 'a = pow(1.0 - r, 2.2);'
          : 'a = step(abs(vQ.x) * 1.2 + abs(vQ.y) * 0.9, 0.95 - 0.25 * sin(vQ.x * 9.0 + vQ.z * 20.0));'}
          a *= vC.a * drSoft(vZ, uQ.z); if (a < 0.004) discard;
          vec4 air = drAir(cameraPosition, normalize(vWPos - cameraPosition), vZ);
          vec3 c = mix(vC.rgb * uK, air.rgb, air.a * uQ.x);
          gl_FragColor = vec4(c * a, a * uQ.x);
        }`,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation });
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = S.order ?? 0; DR.fxScene.add(m);
    if (!S.loop) DR.onFrame((t) => { m.visible = t >= tMin - 0.05 && t <= tMax + 0.05; }, 62);
    return m;
  };

  // ── rain: streaks in a box that follows the lens ──
  FX.rain = (o = {}) => {
    const S = { count: 9000, box: [46, 34, 46], speed: 13, len: 0.9, ...o }, n = Math.round(S.count * DR.Q.dens), r = DR.rng(55), A = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) A.set([r() * S.box[0], r() * S.box[1], r() * S.box[2], r()], i * 4);
    const g = quad(); g.setAttribute('aA', new THREE.InstancedBufferAttribute(A, 4)); g.instanceCount = n;
    const mat = DR.shader({ uniforms: { ...DR.fxU, uBox: u(new THREE.Vector3(...S.box)), uRainK: u(0), uSp: u(new THREE.Vector2(S.speed, S.len)) },
      vertex: /* glsl */`attribute vec4 aA; uniform vec3 uBox; uniform float uRainK; uniform vec2 uSp; varying vec3 vQ; varying float vZ;
        void main(){ if (aA.w > uRainK) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          vec3 fall = vec3(uWind.x * uWind.z * 2.2, -uSp.x * (0.85 + 0.3 * aA.w), uWind.y * uWind.z * 2.2);
          vec3 p = mod(aA.xyz + fall * uTime - cameraPosition, uBox) + cameraPosition - uBox * 0.5;
          vec3 d = normalize(fall); vec3 toCam = normalize(cameraPosition - p); vec3 side = normalize(cross(d, toCam));
          float dist = length(p - cameraPosition), w = max(0.012, dist * uPx * 0.75);
          vec3 wp = p + d * position.y * uSp.y * (0.7 + 0.6 * aA.w) + side * position.x * w;
          vec4 mv = viewMatrix * vec4(wp, 1.0); vZ = -mv.z; gl_Position = projectionMatrix * mv; vQ = vec3(position.xy * 2.0, min(1.0, 0.012 / (dist * uPx * 0.75)) * smoothstep(0.6, 3.0, dist)); vWPos = wp; }`,
      fragment: /* glsl */`${SOFT} varying vec3 vQ; varying float vZ;
        void main(){ float a = (1.0 - abs(vQ.x)) * (1.0 - abs(vQ.y)) * 0.34 * vQ.z * drSoft(vZ, 0.6);
          vec3 c = mix(uSkyHor, uSkyZen, 0.3) * uAmb * 1.5 + uKeyCol * 0.1 + uFlashCol * uFlash.w * 0.5; gl_FragColor = vec4(c * a, a * 0.4); }`,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; DR.fxScene.add(m);
    DR.onFrame(() => { const k = DR.look.rain || 0; mat.uniforms.uRainK.value = k; m.visible = k > 0.003; }, 62);
    return m;
  };

  // ── lightning: a jagged ribbon with forks, lit for a few frames; flashes are summed for the scene light ──
  const flashes = [];
  FX.flashAt = (t) => { let best = null, k = 0; for (const f of flashes) { const a = t - f.t0; if (a < 0 || a > f.life) continue; const fl = Math.floor(a * 30), v = (a < 0.07 ? 1 : (0.25 + 0.75 * DR.hash2(fl, f.seed)) * Math.exp(-a * 5.5)) * f.k; if (v > k) { k = v; best = f; } } return best ? [best.at[0], best.at[1], best.at[2], k] : null; };
  FX.bolt = (o) => {
    const S = { t0: 0, from: [0, 300, 0], to: [0, 0, 0], seed: 1, life: 0.55, width: 1.1, forks: 4, k: 9, ...o }, r = DR.rng(S.seed * 17 + 3), segs = [];
    const walk = (a, b, w, depth) => { const n = Math.max(6, Math.round(DR.vec.dist(a, b) / 14)), pts = [a]; for (let i = 1; i < n; i++) { const f = i / n, p = DR.vec.lerp(a, b, f), j = DR.vec.dist(a, b) * 0.07 * Math.sin(f * Math.PI) + 3; pts.push([p[0] + r.gauss() * j, p[1] + r.gauss() * j * 0.4, p[2] + r.gauss() * j]); } pts.push(b);
      for (let i = 0; i < pts.length - 1; i++) { segs.push([pts[i], pts[i + 1], w * (1 - 0.5 * (i / pts.length))]); if (depth < 2 && r() < (S.forks / pts.length) * (depth ? 0.5 : 1)) { const d = DR.vec.sub(pts[i + 1], pts[i]), l = DR.vec.dist(a, b) * r.range(0.15, 0.4); walk(pts[i], [pts[i][0] + d[0] * 3 + r.gauss() * l * 0.6, pts[i][1] - l * r.range(0.3, 1), pts[i][2] + d[2] * 3 + r.gauss() * l * 0.6], w * 0.45, depth + 1); } } };
    walk(S.from, S.to, S.width, 0);
    const P = [], Q = [], I = []; segs.forEach((s, i) => { for (let k = 0; k < 4; k++) { P.push(...(k < 2 ? s[0] : s[1])); Q.push(...(k < 2 ? s[1] : s[0]), (k === 0 || k === 3 ? -1 : 1) * s[2]); } const b = i * 4; I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aO', new THREE.Float32BufferAttribute(Q, 4)); g.setIndex(I);
    const mat = DR.shader({ uniforms: { ...DR.fxU, uB: u(0) },
      vertex: /* glsl */`attribute vec4 aO; uniform float uB; varying float vS; varying float vZ;
        void main(){ vec3 d = normalize(aO.xyz - position), side = normalize(cross(d, normalize(cameraPosition - position)));
          float dist = length(position - cameraPosition), w = max(abs(aO.w), dist * uPx * 1.6) * (0.6 + 0.4 * uB);
          vec3 wp = position + side * sign(aO.w) * w * 0.5; vS = sign(aO.w); vec4 mv = viewMatrix * vec4(wp, 1.0); vZ = -mv.z; gl_Position = projectionMatrix * mv; vWPos = wp; }`,
      fragment: /* glsl */`${SOFT} uniform float uB; varying float vS; varying float vZ;
        void main(){ float a = pow(1.0 - abs(vS), 1.6); gl_FragColor = vec4(uFlashCol * (26.0 * a * a + 5.0 * a) * uB * drSoft(vZ, 6.0), 0.0); }`,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; DR.fxScene.add(m);
    const mid = DR.vec.lerp(S.from, S.to, 0.45); flashes.push({ t0: S.t0, life: S.life, at: mid, seed: S.seed, k: S.k });
    DR.onFrame((t) => { const a = t - S.t0, on = a >= 0 && a < S.life; m.visible = on; if (on) { const fl = Math.floor(a * 30); mat.uniforms.uB.value = a < 0.07 ? 1 : (DR.hash2(fl, S.seed) > 0.45 ? 0.9 : 0.12) * Math.exp(-a * 4.5); } }, 62);
    return m;
  };

  // ── a glow with soft rays: at(t) → [x, y, z, size (m), strength] ──
  FX.glow = (o) => {
    const S = { color: '#fff2c0', rays: 1, ...o }, g = new THREE.PlaneGeometry(1, 1), U = { ...DR.fxU, uAt: u(new THREE.Vector4()), uCol: u(new THREE.Vector3(...DR.rgb(S.color))), uK: u(0), uRays: u(S.rays) };
    const mat = DR.shader({ uniforms: U,
      vertex: `uniform vec4 uAt; varying vec2 vQ; varying float vZ; void main(){ vec4 mv = viewMatrix * vec4(uAt.xyz, 1.0); mv.xy += position.xy * uAt.w; vZ = -mv.z; vQ = position.xy * 2.0; gl_Position = projectionMatrix * mv; }`,
      fragment: /* glsl */`${SOFT} uniform vec3 uCol; uniform float uK, uRays; varying vec2 vQ; varying float vZ;
        void main(){ float r = length(vQ); if (r > 1.0) discard; float a = atan(vQ.y, vQ.x);
          float ray = 0.5 + 0.5 * sin(a * 6.0 + uTime * 0.35) * sin(a * 11.0 - uTime * 0.23 + 1.0);
          float g = pow(1.0 - r, 3.0) * (1.0 + uRays * 1.6 * ray * smoothstep(0.02, 0.3, r)) + 0.045 / (r * r * 40.0 + 0.02) * (1.0 - r);
          gl_FragColor = vec4(uCol * g * uK * (0.35 + 0.65 * drSoft(vZ, 3.0)), 0.0); }`,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 4; DR.fxScene.add(m);
    DR.onFrame((t) => { const a = S.at(t); m.visible = !!a && a[4] > 0.001; if (a) { U.uAt.value.set(a[0], a[1], a[2], a[3]); U.uK.value = a[4]; } }, 62);
    return m;
  };

  // ── a shaft of light between two points: at(t) → { a: [x,y,z], b: [x,y,z], width, k } ──
  FX.beam = (o) => {
    const S = { color: '#fff0c8', ...o }, g = new THREE.PlaneGeometry(1, 1, 1, 24), U = { ...DR.fxU, uA: u(new THREE.Vector3()), uB3: u(new THREE.Vector3()), uW: u(new THREE.Vector2(10, 0)), uCol: u(new THREE.Vector3(...DR.rgb(S.color))) };
    const mat = DR.shader({ uniforms: U,
      vertex: `uniform vec3 uA, uB3; uniform vec2 uW; varying vec2 vQ; varying float vZ; void main(){ float v = position.y + 0.5; vec3 c = mix(uA, uB3, v), d = normalize(uB3 - uA), side = normalize(cross(d, normalize(cameraPosition - c)));
        vec3 wp = c + side * position.x * uW.x * (1.0 + 0.9 * v); vec4 mv = viewMatrix * vec4(wp, 1.0); vZ = -mv.z; vQ = vec2(position.x * 2.0, v); gl_Position = projectionMatrix * mv; vWPos = wp; }`,
      fragment: `${SOFT} uniform vec3 uCol; uniform vec2 uW; varying vec2 vQ; varying float vZ;
        void main(){ float x = abs(vQ.x); float n = drN4(vec2(vQ.x * 0.35 + 0.5, vQ.y * 0.15 - uTime * 0.02)).r;
          float a = pow(1.0 - x, 2.4) * (0.55 + 0.9 * n) * smoothstep(0.0, 0.05, vQ.y) * smoothstep(1.0, 0.6, vQ.y) * (1.0 - 0.5 * vQ.y);
          gl_FragColor = vec4(uCol * a * uW.y * (0.3 + 0.7 * drSoft(vZ, 8.0)), 0.0); }`,
      transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; DR.fxScene.add(m);
    DR.onFrame((t) => { const q = S.at(t); m.visible = !!q && q.k > 0.002; if (q) { U.uA.value.fromArray(q.a); U.uB3.value.fromArray(q.b); U.uW.value.set(q.width, q.k); } }, 62);
    return m;
  };

  // ── a body breaking the water: a column, a crown of thrown beads, lingering mist ──
  FX.splash = (o) => {
    const S = { t0: 0, at: [0, 0, 0], power: 1, dir: [0, 1, 0], seed: 1, white: [0.9, 0.95, 1.0], ...o }, P = S.power, at = S.at, w = S.white;
    FX.sprites({ count: Math.round(800 * P), seed: S.seed, kind: 'puff', gravity: 8.5, drag: 0.8, cover: 0.85, soft: 3, init: (i, r) => { const a = r() * DR.TAU, q = Math.sqrt(r()), sp = r.range(8, 38) * P ** 0.5; return { p: [at[0] + Math.cos(a) * q * 5 * P, at[1], at[2] + Math.sin(a) * q * 5 * P], v: [Math.cos(a) * q * 7 + S.dir[0] * sp * 0.4, sp * (1.15 - q * 0.6), Math.sin(a) * q * 7 + S.dir[2] * sp * 0.4], t0: S.t0 + r() * 0.5, life: r.range(1.4, 3.2), size: r.range(1.0, 3.2) * P ** 0.5, grow: 2.4, a: r.range(0.3, 0.75), col: w }; } });
    FX.sprites({ count: Math.round(1500 * P), seed: S.seed + 1, kind: 'drop', gravity: 9.8, drag: 0.25, cover: 0.7, stretch: 1.6, soft: 1.5, bright: 1.5, init: (i, r) => { const a = r() * DR.TAU, ring = r() < 0.65, sp = ring ? r.range(12, 26) : r.range(6, 34), el = ring ? r.range(0.75, 1.25) : r.range(1.2, 1.55); return { p: [at[0] + Math.cos(a) * 4 * P, at[1] + 0.2, at[2] + Math.sin(a) * 4 * P], v: [Math.cos(a) * Math.cos(el) * sp, Math.sin(el) * sp * P ** 0.5, Math.sin(a) * Math.cos(el) * sp], t0: S.t0 + r() * 0.3, life: r.range(1.5, 3.6), size: r.range(0.1, 0.34), grow: 0.6, a: 0.9, col: w }; } });
    FX.sprites({ count: Math.round(140 * P), seed: S.seed + 2, kind: 'puff', gravity: -0.25, drag: 0.5, cover: 0.55, wind: 0.5, soft: 5, init: (i, r) => { const a = r() * DR.TAU, q = Math.sqrt(r()) * 16 * P; return { p: [at[0] + Math.cos(a) * q, at[1] + r.range(0.5, 5), at[2] + Math.sin(a) * q], v: [Math.cos(a) * 4, r.range(0.5, 3.5), Math.sin(a) * 4], t0: S.t0 + 0.4 + r() * 1.4, life: r.range(4, 8), size: r.range(5, 11), grow: 2.2, a: r.range(0.16, 0.34), col: w }; } });
  };
}

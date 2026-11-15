// living-realm · 60_fx — everything that floats, falls or glows: rain streaks and their splashes, snow, chimney
// smoke, flames, lamp halos, fireflies, birds, drifting leaves, motes in the sunlight, fountain water.
// All of it is stateless: positions are closed forms of time and an instance's random seed, wrapped round the eye,
// so nothing is simulated or uploaded per frame.  Drawn after the lit world, tested against its depth by hand.
{
  const T = THREE, FX = (LR.fx = { parts: {} });
  const quad = () => { const g = new T.InstancedBufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3)); g.setIndex([0, 1, 2, 0, 2, 3]); return g; };
  const seeds = (g, n, tag, fill) => { const a = new Float32Array(n * 4), r = LR.rng(tag); for (let i = 0; i < n; i++) { if (fill) fill(a, i, r); else { a[i * 4] = r(); a[i * 4 + 1] = r(); a[i * 4 + 2] = r(); a[i * 4 + 3] = r(); } } g.setAttribute('seed', new T.InstancedBufferAttribute(a, 4)); g.instanceCount = n; return g; };
  const HEAD = `//#include head
//#include hash
//#include pack
//#include frame
`;
  const DEPTH = `uniform sampler2D tDepth;
float softDepth(float soft){ float zs = viewZ(textureLod(tDepth, gl_FragCoord.xy * uRes.zw, 0.0).r), zp = viewZ(gl_FragCoord.z); return sat((zs - zp) / soft); }
`;
  const TOPO = `uniform sampler2D uTopo; uniform vec4 uTopoRect; uniform sampler2D uHeight; uniform vec4 uLandRect;
float roofAt(vec2 xz){ vec2 uv = (xz - uTopoRect.xy) * uTopoRect.zw; return textureLod(uTopo, uv, 0.0).r; }
float landAt(vec2 xz){ return textureLod(uHeight, (xz - uLandRect.xy) * uLandRect.zw, 0.0).r; }
`;
  const mk = (name, geo, vs, fs, o = {}) => {
    const R = LR.render, L = LR.land;
    const uniforms = Object.assign(LR.uni(R.FRAME + ' uFogCol uFog uSunDir uSunCol uSkyAmb uGroundAmb uCloud uCloudOff uTopo uTopoRect uShadowMap uShadowMat uShadowInfo uShadowTexel'), LR.sky.U, { tDepth: R.U.tDepth, uEnvMips: R.U.uEnvMips, uHeight: L.U.uHeight, uLandRect: L.U.uLandRect }, o.uniforms || {});
    const m = LR.material({ vertexShader: HEAD + vs, fragmentShader: HEAD + DEPTH + fs, uniforms, depthTest: false, depthWrite: false, transparent: true, side: T.DoubleSide, blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, blendSrcAlpha: T.OneFactor, blendDstAlpha: T.OneMinusSrcAlphaFactor, defines: o.defines || {} });
    const mesh = new T.Mesh(geo, m); mesh.frustumCulled = false; mesh.matrixAutoUpdate = false; mesh.renderOrder = o.order || 0; mesh.name = name; LR.world.forward.add(mesh); FX.parts[name] = mesh; return mesh;
  };
  const P = `uniform mat4 projectionMatrix, viewMatrix;\n`;
  const ENV = `uniform sampler2D uEnv; uniform float uEnvMips; vec3 envAt(vec3 d, float lod){ return textureLod(uEnv, octEnc(d) * (1.0 - 2.0 / 64.0) + 1.0 / 64.0, lod).rgb; }\n`;

  FX.init = () => {
    if (LR.off.has('fx')) return;
    const q = LR.gpu.tier.fx, W = LR.world;
    // ── rain ──
    mk('rain', seeds(quad(), Math.round(9000 * q), 'rain'), P + TOPO + `in vec3 position; in vec4 seed; out vec2 vQ; out float vA;
void main(){ const vec3 B = vec3(26.0, 18.0, 26.0); float sp = 15.0 + seed.w * 6.0;
  vec3 vel = vec3(uWind.x * (2.0 + 7.0 * uWind.z), -sp, uWind.y * (2.0 + 7.0 * uWind.z));
  vec3 p = seed.xyz * B + vel * uTime; p = mod(p - uCamPos + B * 0.5, B) - B * 0.5 + uCamPos;
  vec3 dir = normalize(vel), toEye = normalize(uCamPos - p), side = normalize(cross(dir, toEye));
  float len = 0.42 + seed.w * 0.3, wd = 0.006 + 0.004 * seed.x;
  vec3 wp = p + side * position.x * wd + dir * position.y * len;
  float roof = roofAt(p.xz), land = landAt(p.xz);
  vA = step(seed.y, uWx2.x) * step(max(roof, land), p.y) * smoothstep(13.0, 9.0, length(p - uCamPos)) * smoothstep(1.2, 3.5, length(p - uCamPos));
  vQ = position.xy; gl_Position = vA > 0.0 ? projectionMatrix * viewMatrix * vec4(wp, 1.0) : vec4(2.0, 2.0, 2.0, 1.0); }`,
      ENV + `in vec2 vQ; in float vA; out vec4 o; void main(){ float f = softDepth(0.3); if (f <= 0.0) discard; float a = (1.0 - abs(vQ.x)) * (1.0 - vQ.y * vQ.y) * vA * 0.34 * f;
  vec3 c = envAt(vec3(0.0, 1.0, 0.0), uEnvMips - 1.0) * 1.6 + uWx2.w * vec3(4.0, 5.0, 7.0); o = vec4(c * a, a * 0.55); }`);
    // ── splashes where rain meets a surface ──
    mk('splash', seeds(quad(), Math.round(2600 * q), 'splash'), P + TOPO + `in vec3 position; in vec4 seed; out vec2 vQ; out float vA;
void main(){ const float B = 22.0; float life = fract(uTime * (2.6 + seed.w) + seed.z * 9.0), gen = floor(uTime * (2.6 + seed.w) + seed.z * 9.0);
  vec2 h = hash22(seed.xy * 91.7 + gen * 0.37); vec2 xz = h * B; xz = mod(xz - uCamPos.xz + B * 0.5, B) - B * 0.5 + uCamPos.xz;
  float y = max(roofAt(xz), landAt(xz)); vec3 c = vec3(xz.x, y + 0.02, xz.y);
  vec3 toEye = normalize(uCamPos - c), side = normalize(cross(vec3(0.0, 1.0, 0.0), toEye)); float s = 0.03 + 0.07 * life;
  vec3 wp = c + side * position.x * s * 1.5 + vec3(0.0, 1.0, 0.0) * (position.y + 1.0) * s * (1.2 - life);
  vA = step(seed.y, uWx2.x) * (1.0 - life) * smoothstep(11.0, 8.0, length(c - uCamPos)) * step(y, uCamPos.y + 9.0);
  vQ = position.xy; gl_Position = vA > 0.0 ? projectionMatrix * viewMatrix * vec4(wp, 1.0) : vec4(2.0, 2.0, 2.0, 1.0); }`,
      ENV + `in vec2 vQ; in float vA; out vec4 o; void main(){ float f = softDepth(0.05) ; float r = length(vQ * vec2(1.0, 1.4) + vec2(0.0, 0.6)); float a = smoothstep(1.0, 0.75, r) * smoothstep(0.35, 0.7, r) * vA * 0.5 * max(f, 0.4);
  vec3 c = envAt(vec3(0.0, 1.0, 0.0), uEnvMips - 1.0) * 1.8 + uWx2.w * vec3(3.0, 4.0, 6.0); o = vec4(c * a, a * 0.5); }`);
    // ── snow ──
    mk('snow', seeds(quad(), Math.round(8000 * q), 'snow'), P + TOPO + `in vec3 position; in vec4 seed; out vec2 vQ; out float vA;
void main(){ const vec3 B = vec3(30.0, 20.0, 30.0); float sp = 0.9 + seed.w * 0.9;
  vec3 p = seed.xyz * B + vec3(uWind.x * (0.6 + 2.5 * uWind.z), -sp, uWind.y * (0.6 + 2.5 * uWind.z)) * uTime;
  p.x += sin(uTime * (0.7 + seed.x) + seed.y * 40.0) * 0.35; p.z += cos(uTime * (0.6 + seed.z) + seed.x * 40.0) * 0.35;
  p = mod(p - uCamPos + B * 0.5, B) - B * 0.5 + uCamPos;
  float d = length(p - uCamPos), s = (0.011 + 0.012 * seed.w) * (1.0 + 0.04 * d);
  vec3 r = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), u = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 wp = p + (r * position.x + u * position.y) * s;
  vA = step(seed.y, uWx2.y) * step(max(roofAt(p.xz), landAt(p.xz)), p.y) * smoothstep(15.0, 10.0, d) * smoothstep(0.25, 0.9, d);
  vQ = position.xy; gl_Position = vA > 0.0 ? projectionMatrix * viewMatrix * vec4(wp, 1.0) : vec4(2.0, 2.0, 2.0, 1.0); }`,
      ENV + `uniform vec3 uSunCol; in vec2 vQ; in float vA; out vec4 o; void main(){ float f = softDepth(0.25); if (f <= 0.0) discard; float a = smoothstep(1.0, 0.2, length(vQ)) * vA * 0.9 * f;
  vec3 c = envAt(vec3(0.0, 1.0, 0.0), uEnvMips - 1.0) * 2.4 + uSunCol * 0.25; o = vec4(c * a, a); }`);
    // ── smoke: K puffs per chimney on a rising, drifting path ──
    const K = 12, sm = W.smokers;
    if (sm.length) mk('smoke', seeds(quad(), sm.length * K, 'smoke', (a, i, r) => { const s = sm[Math.floor(i / K)]; a[i * 4] = s.x; a[i * 4 + 1] = s.y; a[i * 4 + 2] = s.z; a[i * 4 + 3] = ((i % K) + r() * 0.6) / K + Math.floor(s.amount || 1); }), P + `in vec3 position; in vec4 seed; out vec2 vQ; out float vA; out float vAge; out float vId;
void main(){ float amt = floor(seed.w), ph = fract(seed.w); float sp = 0.085; float age = fract(ph + uTime * sp + hash11(seed.x * 3.1 + seed.z)); vId = ph * 31.0 + seed.x;
  float cold = 0.55 + 0.45 * uWx.w, rise = 9.0 * age * (1.0 - 0.35 * age);
  vec3 p = seed.xyz + vec3(0.0, rise, 0.0) + vec3(uWind.x, 0.0, uWind.y) * (age * age * (5.0 + 16.0 * uWind.z) + age * 1.2);
  p.x += sin(age * 9.0 + vId) * 0.35 * age; p.z += cos(age * 7.0 + vId * 1.7) * 0.35 * age;
  float s = (0.28 + 2.1 * age) * (0.8 + 0.25 * amt);
  vec3 r = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), u = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 wp = p + (r * position.x + u * position.y) * s;
  vA = smoothstep(0.0, 0.07, age) * (1.0 - age) * (1.0 - age) * (0.3 + 0.2 * amt) * cold * (1.0 - 0.5 * uWx2.x); vAge = age; vQ = position.xy;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
      ENV + `uniform vec3 uSunCol, uSunDir; in vec2 vQ; in float vA; in float vAge; in float vId; out vec4 o;
void main(){ float f = softDepth(1.2); vec2 q = vQ; float n = texture(uNoise, q * 0.21 + vId * 0.37 + vec2(0.0, -vAge * 0.4)).r, n2 = texture(uNoise, q * 0.5 + vId).g;
  float a = smoothstep(1.0, 0.25, length(q) + (n - 0.5) * 0.7) * vA * (0.6 + 0.6 * n2) * f; if (a < 0.003) discard;
  float lit = 0.5 + 0.5 * (q.x * 0.5 + q.y * 0.6) * sign(uSunDir.y);
  vec3 c = envAt(vec3(0.0, 1.0, 0.0), uEnvMips - 1.0) * 1.5 + uSunCol * (0.10 + 0.22 * lit); c *= mix(vec3(0.55, 0.52, 0.5), vec3(0.95), sat(vAge * 2.5)); o = vec4(c * a, a); }`, { order: 2 });
    // ── flames ──
    const FK = 5, fr = W.fires;
    if (fr.length) mk('flame', seeds(quad(), fr.length * FK, 'flame', (a, i, r) => { const s = fr[Math.floor(i / FK)]; a[i * 4] = s.x; a[i * 4 + 1] = s.y - s.size * 0.6; a[i * 4 + 2] = s.z; a[i * 4 + 3] = (i % FK) + s.size * 0.5; }), P + `in vec3 position; in vec4 seed; out vec2 vQ; out float vId;
void main(){ float k = floor(seed.w), sz = fract(seed.w) * 2.0; vId = k + seed.x * 3.0;
  vec3 r = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]); vec3 c = seed.xyz + vec3(sin(vId * 2.4) * 0.3, 0.0, cos(vId * 1.7) * 0.3) * sz * 0.45;
  vec3 wp = c + r * position.x * sz * 0.42 + vec3(0.0, 1.0, 0.0) * (position.y + 1.0) * sz * (0.75 + 0.2 * sin(vId));
  vQ = position.xy; gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
      `in vec2 vQ; in float vId; out vec4 o; void main(){ float f = softDepth(0.25); vec2 q = vQ; float t = uTime * 1.6 + vId * 0.37;
  float n = texture(uNoise, vec2(q.x * 0.12 + vId * 0.21, q.y * 0.16 - t * 0.35)).r, n2 = texture(uNoise, vec2(q.x * 0.33 + 0.5, q.y * 0.3 - t * 0.6)).g;
  float y = q.y * 0.5 + 0.5, w = (1.0 - y) * 0.9 + 0.08; float shape = smoothstep(w, w * 0.25, abs(q.x + (n - 0.5) * 0.8 * y)) * smoothstep(1.0, 0.25, y + (n2 - 0.5) * 0.55) * smoothstep(0.0, 0.12, y);
  vec3 c = mix(vec3(1.0, 0.16, 0.02), vec3(1.0, 0.72, 0.22), smoothstep(0.25, 0.9, shape * (1.0 - y * 0.6))) * shape * 4.2 * f; o = vec4(c, shape * 0.2); }`, { order: 3 });
    // ── halos round lamps and fires, growing with the mist ──
    const lg = W.lights.filter((l) => l.glow);
    if (lg.length) mk('glow', seeds(quad(), lg.length, 'glow', (a, i) => { const l = lg[i]; a[i * 4] = l.x; a[i * 4 + 1] = l.y; a[i * 4 + 2] = l.z; a[i * 4 + 3] = (l.kind === 'fire' ? 1 : 0) + Math.min(0.99, l.power / 10); }), P + `in vec3 position; in vec4 seed; out vec2 vQ; out float vA; uniform vec4 uFog;
void main(){ float isFire = floor(seed.w), pw = fract(seed.w) * 10.0, on = isFire > 0.5 ? max(uWx2.z, 0.4) : uWx2.z;
  float d = length(seed.xyz - uCamPos), mist = sat(uFog.x * 110.0);
  float s = (0.34 + 1.5 * mist + 0.008 * d) * (0.8 + 0.03 * pw);
  vec3 r = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), u = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 wp = seed.xyz + (r * position.x + u * position.y) * s; vA = on * (0.10 + 0.3 * mist) * min(pw, 5.0) * 0.16 * smoothstep(110.0, 60.0, d) * (0.92 + 0.08 * sin(uTime * 9.0 + seed.x * 5.0));
  vQ = position.xy; gl_Position = vA > 0.001 ? projectionMatrix * viewMatrix * vec4(wp, 1.0) : vec4(2.0, 2.0, 2.0, 1.0); }`,
      `in vec2 vQ; in float vA; out vec4 o; void main(){ float f = softDepth(0.6); float r = length(vQ); float k = max(1.0 - r, 0.0); float g = k * k * k * k * 1.6 + 0.16 * k * k; o = vec4(vec3(1.0, 0.58, 0.24) * g * vA * f, 0.0); }`, { order: 4 });
    // ── fireflies on summer nights ──
    const ff = W.fireflyAreas || [];
    if (ff.length) { const NF = Math.round(260 * q); mk('fireflies', seeds(quad(), NF, 'ff', (a, i, r) => { const ar = ff[i % ff.length], an = r() * 6.28, d = Math.sqrt(r()) * ar.r; a[i * 4] = ar.x + Math.cos(an) * d; a[i * 4 + 1] = 0.3 + r() * 1.8; a[i * 4 + 2] = ar.z + Math.sin(an) * d; a[i * 4 + 3] = r() * 100; }), P + TOPO + `in vec3 position; in vec4 seed; out vec2 vQ; out float vA;
void main(){ float t = uTime * 0.35 + seed.w; vec3 p = vec3(seed.x + sin(t * 1.3 + seed.w) * 1.6 + sin(t * 0.37) * 2.0, 0.0, seed.z + cos(t * 1.1 + seed.w * 1.7) * 1.6 + cos(t * 0.29) * 2.0);
  p.y = landAt(p.xz) + seed.y + sin(t * 2.1 + seed.w) * 0.35;
  float blink = smoothstep(0.55, 0.95, sin(uTime * (1.2 + fract(seed.w) * 1.4) + seed.w * 7.0));
  vec3 r = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), u = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float d = length(p - uCamPos); vec3 wp = p + (r * position.x + u * position.y) * (0.05 + 0.004 * d);
  vA = blink * uWx2.z * (1.0 - uWx.w * 3.0) * (1.0 - uWx2.x) * smoothstep(70.0, 40.0, d); vQ = position.xy; gl_Position = vA > 0.001 ? projectionMatrix * viewMatrix * vec4(wp, 1.0) : vec4(2.0, 2.0, 2.0, 1.0); }`,
      `in vec2 vQ; in float vA; out vec4 o; void main(){ float f = softDepth(0.2); float r = length(vQ); float g = pow(max(1.0 - r, 0.0), 2.5); o = vec4(vec3(0.75, 1.0, 0.25) * g * vA * f * 9.0, 0.0); }`, { order: 5 }); }
    // ── birds: a few loose flocks wheeling high up by day ──
    { const NB = 46; const g = new T.InstancedBufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array([0, 0, 0.35, -1, 0, -0.25, 0, 0, -0.1, 0, 0, 0.35, 0, 0, -0.1, 1, 0, -0.25]), 3));
      mk('birds', seeds(g, NB, 'birds'), P + `in vec3 position; in vec4 seed; out float vA; out float vShade;
void main(){ float flock = floor(seed.x * 3.0), fph = flock * 2.1; float t = uTime * (0.05 + 0.012 * flock) + fph;
  vec3 c = vec3(sin(t) * (90.0 + 40.0 * flock) + 30.0 * sin(t * 0.37 + fph), 46.0 + 14.0 * flock + 6.0 * sin(t * 1.7), cos(t) * (80.0 + 30.0 * flock) + 30.0 * cos(t * 0.41));
  vec3 fwd = normalize(vec3(cos(t), 0.0, -sin(t))), sd = vec3(fwd.z, 0.0, -fwd.x);
  vec3 o3 = (seed.yzw - 0.5) * vec3(26.0, 7.0, 26.0); o3.x += sin(uTime * 0.3 + seed.y * 20.0) * 2.0;
  float flap = sin(uTime * (7.0 + seed.z * 3.0) + seed.w * 30.0); vec3 lp = position * 0.55; lp.y += abs(position.x) * flap * 0.5;
  vec3 wp = c + o3 + sd * lp.x + vec3(0.0, lp.y, 0.0) + fwd * lp.z;
  vA = (1.0 - uWx2.z) * (1.0 - uWx2.x * 0.9) * (1.0 - uWx2.y * 0.8); vShade = 0.5 + 0.5 * flap * sign(position.x + 0.001);
  gl_Position = vA > 0.01 ? projectionMatrix * viewMatrix * vec4(wp, 1.0) : vec4(2.0, 2.0, 2.0, 1.0); }`,
      `in float vA; in float vShade; out vec4 o; void main(){ float f = softDepth(1.0); if (f <= 0.0) discard; o = vec4(vec3(0.02, 0.022, 0.03) * (0.6 + 0.4 * vShade) * vA, vA * 0.92); }`, { order: -2 }); }
    // ── leaves coming down as the season turns ──
    mk('leaves', seeds(quad(), Math.round(900 * q), 'leaves'), P + TOPO + `in vec3 position; in vec4 seed; out vec2 vQ; out float vA; out float vHue;
void main(){ const vec3 B = vec3(36.0, 16.0, 36.0); float sp = 0.7 + seed.w * 0.6;
  vec3 p = seed.xyz * B + vec3(uWind.x * (1.0 + 4.0 * uWind.z), -sp, uWind.y * (1.0 + 4.0 * uWind.z)) * uTime; p.x += sin(uTime * 1.3 + seed.y * 50.0) * 0.8; p.z += cos(uTime * 1.1 + seed.x * 50.0) * 0.8;
  p = mod(p - uCamPos + B * 0.5, B) - B * 0.5 + uCamPos; float a = uTime * (2.0 + seed.x * 3.0) + seed.z * 20.0;
  vec3 ax = normalize(vec3(sin(seed.x * 30.0), 0.4, cos(seed.y * 30.0))), bx = normalize(cross(ax, vec3(0.0, 1.0, 0.0))), cx = cross(ax, bx);
  vec3 wp = p + (bx * cos(a) + cx * sin(a)) * position.x * 0.07 + ax * position.y * 0.05;
  float fall = smoothstep(0.18, 0.4, uWx.w) * smoothstep(0.86, 0.6, uWx.w);
  vA = step(seed.y, fall * 0.9) * step(max(roofAt(p.xz), landAt(p.xz)), p.y) * smoothstep(18.0, 13.0, length(p - uCamPos)); vHue = seed.w; vQ = position.xy;
  gl_Position = vA > 0.0 ? projectionMatrix * viewMatrix * vec4(wp, 1.0) : vec4(2.0, 2.0, 2.0, 1.0); }`,
      ENV + `uniform vec3 uSunCol; in vec2 vQ; in float vA; in float vHue; out vec4 o; void main(){ float f = softDepth(0.2); if (f <= 0.0 || length(vQ * vec2(1.0, 0.8)) > 1.0) discard;
  vec3 alb = mix(vec3(0.42, 0.16, 0.03), vec3(0.5, 0.36, 0.05), vHue); vec3 c = alb * (uSunCol * 0.55 + envAt(vec3(0.0, 1.0, 0.0), uEnvMips - 1.0) * 1.6); o = vec4(c * vA, vA); }`);
    // ── motes: pollen and dust that show where the sun comes through ──
    mk('motes', seeds(quad(), Math.round(1500 * q), 'motes'), P + TOPO + `//#include shadow
//#include shadowfast
in vec3 position; in vec4 seed; out vec2 vQ; out float vA; uniform vec3 uSunCol, uSunDir;
void main(){ const vec3 B = vec3(14.0, 7.0, 14.0); float t = uTime * 0.12;
  vec3 p = seed.xyz * B + vec3(sin(t * 3.0 + seed.w * 30.0) * 0.5 + uWind.x * uTime * 0.15, sin(t * 2.0 + seed.x * 40.0) * 0.4 + uTime * 0.02, cos(t * 2.6 + seed.y * 30.0) * 0.5 + uWind.y * uTime * 0.15);
  p = mod(p - uCamPos + B * 0.5, B) - B * 0.5 + uCamPos; float d = length(p - uCamPos);
  vec3 r = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), u = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 wp = p + (r * position.x + u * position.y) * (0.006 + 0.006 * seed.w);
  float day = sat(uSunCol.g * 0.3) * (1.0 - uWx2.z), fine = (1.0 - uWx2.x * 3.0) * (1.0 - uWx2.y * 3.0) * (1.0 - uWx.w * 0.8);
  vA = day * fine * shadowFast(p) * step(landAt(p.xz), p.y) * smoothstep(7.0, 4.5, d) * smoothstep(0.3, 0.9, d) * (0.4 + 0.6 * pow(sat(dot(normalize(p - uCamPos), uSunDir)), 2.0));
  vQ = position.xy; gl_Position = vA > 0.01 ? projectionMatrix * viewMatrix * vec4(wp, 1.0) : vec4(2.0, 2.0, 2.0, 1.0); }`,
      `uniform vec3 uSunCol; in vec2 vQ; in float vA; out vec4 o; void main(){ float f = softDepth(0.1); float g = pow(max(1.0 - length(vQ), 0.0), 1.5); o = vec4(uSunCol * vec3(1.0, 0.95, 0.75) * g * vA * f * 0.75, 0.0); }`, { order: 6 });
    // ── fountain water: threads falling from the bowl's rim ──
    const ft = W.fountains || [];
    if (ft.length) { const FN = 150; mk('fount', seeds(quad(), ft.length * FN, 'fount', (a, i, r) => { const s = ft[Math.floor(i / FN)]; a[i * 4] = s.x; a[i * 4 + 1] = s.y; a[i * 4 + 2] = s.z; a[i * 4 + 3] = r() * 100 + (s.r > 1.5 ? 0 : 0); }), P + `in vec3 position; in vec4 seed; out vec2 vQ; out float vA;
void main(){ float an = seed.w * 6.2832 * 7.0, life = fract(uTime * 0.9 + seed.w * 3.7), fall = 1.62; float tt = life * 0.62;
  vec3 p = seed.xyz + vec3(cos(an), 0.0, sin(an)) * (1.0 + tt * 0.55) + vec3(0.0, -4.9 * tt * tt, 0.0);
  vec3 vel = normalize(vec3(cos(an) * 0.55, -9.8 * tt - 0.2, sin(an) * 0.55)), toEye = normalize(uCamPos - p), side = normalize(cross(vel, toEye));
  vec3 wp = p + side * position.x * 0.014 + vel * position.y * (0.05 + 0.3 * tt);
  vA = (1.0 - smoothstep(0.85, 1.0, life)) * (1.0 - smoothstep(0.7, 0.95, uWx.w)) * smoothstep(60.0, 30.0, length(p - uCamPos)); vQ = position.xy;
  gl_Position = vA > 0.01 ? projectionMatrix * viewMatrix * vec4(wp, 1.0) : vec4(2.0, 2.0, 2.0, 1.0); }`,
      ENV + `uniform vec3 uSunCol; in vec2 vQ; in float vA; out vec4 o; void main(){ float f = softDepth(0.1); if (f <= 0.0) discard; float a = (1.0 - abs(vQ.x)) * vA * 0.55; vec3 c = envAt(vec3(0.0, 1.0, 0.0), uEnvMips - 1.0) * 2.0 + uSunCol * 0.2; o = vec4(c * a, a * 0.6); }`); }
  };
  LR.on('init', () => FX.init(), 60);
  // only draw what the weather needs
  LR.on('frame', () => { const p = FX.parts, w = LR.wx; if (p.rain) p.rain.visible = p.splash.visible = w.rain > 0.01; if (p.snow) p.snow.visible = w.snowfall > 0.01; if (p.leaves) p.leaves.visible = w.season > 0.16 && w.season < 0.88; if (p.fireflies) p.fireflies.visible = w.lampsOn > 0.02 && w.season < 0.3; if (p.birds) p.birds.visible = w.lampsOn < 0.95; if (p.motes) p.motes.visible = w.lampsOn < 0.9 && w.rain < 0.3 && w.snowfall < 0.3; if (p.glow) p.glow.visible = w.lampsOn > 0.005 || true; }, 40);
}

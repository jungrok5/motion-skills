// dragon-realm · 20_sky — the light of the film (looks keyed over time), the sky dome, and the air pass:
// ray-marched clouds and valley mist that know the depth of the picture, so peaks and creatures pass through them.
{
  const U = DR.U, u = (v) => ({ value: v });
  // ── looks: named states of light and weather; a timeline blends between them ──
  // Every field is optional in a look (missing = the default below).  Colours are '#hex' or linear [r,g,b].
  const DEF = {
    keyDir: null,                            // [az, el] to light the scene from somewhere other than the body named by `key` (a film light)
    sun: [60, 30], moon: [240, 35],          // [azimuth°, elevation°] — azimuth 0 = +z, 90 = +x
    key: 'sun', keyCol: '#fff1dc', keyK: 5,  // which body casts the shadows; its colour × strength
    sunCol: '#ffd9a8', sunK: 1, moonCol: '#cfe0ff', moonK: 0, sunSize: 1.3, moonSize: 2.2, sunDisc: '#fff0d8', sunDiscK: 40,
    zen: '#1d4f9e', hor: '#9cc3e6', gnd: '#3a3f47', warm: '#000000', skyK: 1,
    amb: 1, stars: 0,
    air: 0.0005, mist: 0.004, mistBase: 0, mistH: 26, fogCol: '#ffffff',
    cover: 0.35, shadowK: 0.8,               // cloud cover 0..1 and how dark the cloud shadows are
    cloud: [260, 560, 1 / 900, 0.05],        // base m, top m, noise scale 1/m, density
    cloudDark: 0, cloudDetail: 1, cloudSpeed: 1,
    haze: [2, 34, 0.0, 1 / 120],             // volumetric mist: base m, top m, density, noise scale
    wind: [0.9, 0.3, 0.6],                   // dir x, dir z, strength
    wet: 0, exposure: 1, rainbow: 0, rain: 0,
    grade: { lift: [0, 0, 0], gain: [1, 1, 1], sat: 1.08, contrast: 1.08 },
    bloom: 0.07, rays: 0.5, vignette: 0.3,
  };
  const conv = (L) => { const o = {}; for (const k in L) { const v = L[k]; o[k] = typeof v === 'string' && v[0] === '#' ? DR.rgb(v) : v; } return o; };
  const blend = (a, b, t) => { if (t <= 0) return a; if (t >= 1) return b; const o = {};
    for (const k in a) { const x = a[k], y = b[k];
      if (k === 'key' || k === 'keyDir') o[k] = t < 0.5 ? x : y;
      else if (k === 'grade') o[k] = { lift: DR.mix(x.lift, y.lift, t), gain: DR.mix(x.gain, y.gain, t), sat: DR.lerp(x.sat, y.sat, t), contrast: DR.lerp(x.contrast, y.contrast, t) };
      else if (k === 'sun' || k === 'moon') { let d = y[0] - x[0]; d = ((d + 540) % 360) - 180; o[k] = [x[0] + d * t, DR.lerp(x[1], y[1], t)]; }
      else o[k] = DR.mix(x, y, t); }
    return o; };
  const dirOf = (az, el, out) => { const a = az * DR.DEG, e = el * DR.DEG; return out.set(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)); };
  DR.looks = {}; DR.lookKeys = [];
  // DR.light({ dawn: {...}, storm: {...} }, [[0, 'dawn'], [20, 'dawn'], [26, 'storm', 'io3'], …])
  DR.light = (looks, timeline) => {
    for (const k in looks) DR.looks[k] = { ...conv(DEF), ...conv(looks[k]), grade: { ...DEF.grade, ...(looks[k].grade || {}) } };
    DR.lookKeys = timeline.map((k) => ({ t: k[0], look: DR.looks[k[1]], e: DR.ease[k[2] || 'io2'] }));
  };
  DR.lookAt = (t) => { const K = DR.lookKeys; if (!K.length) return { ...conv(DEF) }; if (t <= K[0].t) return K[0].look; const L = K[K.length - 1]; if (t >= L.t) return L.look;
    let i = 1; while (K[i].t < t) i++; const a = K[i - 1], b = K[i]; return a.look === b.look ? a.look : blend(a.look, b.look, b.e((t - a.t) / (b.t - a.t))); };

  // wind phase and cloud drift are integrals of speed over time: tabulated once so they stay pure functions of t
  let phaseTab = null, driftTab = null;
  const buildTabs = (dur) => { const n = Math.ceil(dur * 20) + 2; phaseTab = new Float32Array(n); driftTab = new Float32Array(n * 2); let ph = 0, dx = 0, dz = 0;
    for (let i = 0; i < n; i++) { const L = DR.lookAt(i / 20); phaseTab[i] = ph; driftTab[i * 2] = dx; driftTab[i * 2 + 1] = dz; const w = L.wind; ph += (0.35 + w[2] * 0.75) / 20; const s = 5 * L.cloudSpeed * (0.4 + w[2]) / 20, l = Math.hypot(w[0], w[1]) || 1; dx += (w[0] / l) * s; dz += (w[1] / l) * s; } };
  const tab = (T, t, st = 1, off = 0) => { const f = DR.clamp(t * 20, 0, T.length / st - 1.001), i = Math.floor(f); return DR.lerp(T[i * st + off], T[(i + 1) * st + off], f - i); };

  const CU = (DR.cloudU = {
    uCloudA: u(new THREE.Vector4(260, 560, 1 / 900, 0.05)), uCloudB: u(new THREE.Vector4(0.4, 0, 1, 0)), uCloudOff: u(new THREE.Vector3()),
    uRift: DR.U.uRift, uMistV: u(new THREE.Vector4(2, 34, 0, 1 / 120)), uRainbow: u(0), uSteps: u(48),
  });
  DR.weather = { rift: null, flash: null, glow: null };   // hooks a film may set: (t) → [x,z,radius,open] / [x,y,z,k] / [x,y,z,k]
  DR.look = conv(DEF);
  DR.applyLight = (t) => {
    if (!phaseTab) buildTabs(DR.DURATION || 120);
    const L = (DR.look = DR.lookAt(t));
    dirOf(L.sun[0], L.sun[1], U.uSunDir.value); dirOf(L.moon[0], L.moon[1], U.uMoonDir.value);
    const kd = L.key === 'moon' ? U.uMoonDir.value : U.uSunDir.value; if (L.keyDir) dirOf(L.keyDir[0], L.keyDir[1], U.uKeyDir.value); else U.uKeyDir.value.copy(kd);
    U.uKeyCol.value.set(L.keyCol[0], L.keyCol[1], L.keyCol[2]).multiplyScalar(L.keyK);
    U.uSunCol.value.set(L.sunCol[0], L.sunCol[1], L.sunCol[2]).multiplyScalar(L.sunK);
    U.uMoonCol.value.set(L.moonCol[0], L.moonCol[1], L.moonCol[2]).multiplyScalar(L.moonK);
    U.uSkyZen.value.fromArray(L.zen).multiplyScalar(L.skyK); U.uSkyHor.value.fromArray(L.hor).multiplyScalar(L.skyK); U.uSkyGnd.value.fromArray(L.gnd).multiplyScalar(L.skyK); U.uSkyWarm.value.fromArray(L.warm).multiplyScalar(L.skyK);
    U.uDisc.value.set(Math.cos(L.sunSize * DR.DEG), Math.cos(L.moonSize * DR.DEG), 0, 0); U.uSunDisc.value.fromArray(L.sunDisc).multiplyScalar(L.sunDiscK * (L.sunK > 0 ? 1 : 0));
    U.uAmb.value = L.amb; U.uStars.value = L.stars; U.uFog.value.set(L.air, L.mist, L.mistBase, 1 / L.mistH); U.uFogCol.value.fromArray(L.fogCol);
    U.uCover.value = L.cover; U.uShadowK.value = L.shadowK; U.uWet.value = L.wet; U.uTime.value = t;
    const wl = Math.hypot(L.wind[0], L.wind[1]) || 1; U.uWind.value.set(L.wind[0] / wl, L.wind[1] / wl, L.wind[2], tab(phaseTab, t));
    const dx = tab(driftTab, t, 2, 0), dz = tab(driftTab, t, 2, 1); U.uCloudDrift.value.set(-dx, -dz);
    CU.uCloudA.value.fromArray(L.cloud); CU.uCloudB.value.set(L.cover, L.cloudDark, L.cloudDetail, 0); CU.uCloudOff.value.set(-dx * L.cloud[2], t * 0.006 * L.cloudSpeed, -dz * L.cloud[2]);
    CU.uMistV.value.fromArray(L.haze); CU.uRainbow.value = L.rainbow;
    const W = DR.weather, r = W.rift && W.rift(t), f = W.flash && W.flash(t), g = W.glow && W.glow(t);
    if (r) CU.uRift.value.fromArray(r); else CU.uRift.value.w = 0;
    if (f) U.uFlash.value.fromArray(f); else U.uFlash.value.w = 0;
    if (g) U.uGlow.value.fromArray(g); else U.uGlow.value.w = 0;
    if (DR.sun) { DR.sun.color.setRGB(U.uKeyCol.value.x, U.uKeyCol.value.y, U.uKeyCol.value.z); DR.sun.intensity = 1; }
  };

  // ── the dome ──
  DR.makeSky = () => {
    const m = DR.shader({
      vertex: `void main(){ vWPos = position; vec4 p = projectionMatrix * viewMatrix * vec4(position * 1.0 + cameraPosition, 1.0); gl_Position = p.xyww; }`,
      fragment: `${DR.GLSL.sky}\n void main(){ vec3 d = normalize(vWPos); gl_FragColor = vec4(drSkyFull(d), 1.0); }`,
      side: THREE.BackSide, depthWrite: false, depthTest: true,
    });
    const s = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), m); s.frustumCulled = false; s.renderOrder = -100; s.name = 'sky';
    return s;
  };

  // ── the air pass: clouds + mist, marched to the depth of the picture ──
  DR.airFrag = /* glsl */`
    precision highp sampler3D;
    uniform sampler2D tDepth; uniform sampler3D uNoise3;
    uniform mat4 uInvProj, uCamW; uniform vec2 uNF; uniform vec3 uEye;
    uniform vec4 uCloudA, uCloudB, uMistV; uniform vec3 uCloudOff; uniform float uRainbow, uSteps;
    varying vec2 vUv;
    float weatherAt(vec3 p){
      float w = textureLod(uNoise, p.xz * 0.00037 + uCloudOff.xz * 0.33, 0.0).r;
      float cov = clamp(uCloudB.x + (w - 0.5) * 1.1 * (1.0 - uCloudB.x * uCloudB.x), 0.0, 1.0);
      float rr = length(p.xz - uRift.xy);
      float ragged = textureLod(uNoise, p.xz * 0.004 + 0.3, 0.0).g * 0.5;
      cov *= 1.0 - uRift.w * smoothstep(uRift.z * (1.25 + ragged), uRift.z * (0.55 + ragged), rr);
      return cov;
    }
    float cloudDen(vec3 p, float cov, float detail){
      float h = (p.y - uCloudA.x) / (uCloudA.y - uCloudA.x);
      if (h <= 0.0 || h >= 1.0 || cov <= 0.01) return 0.0;
      vec3 q = p * uCloudA.z + uCloudOff;
      float sh = textureLod(uNoise3, q, 0.0).r;
      float hg = smoothstep(0.0, 0.07, h) * smoothstep(1.0, mix(0.30, 0.75, cov), h);
      float d = sh * hg - (1.0 - cov) * 0.86;
      if (d <= 0.0) return 0.0;
      if (detail > 0.0) { vec4 n2 = textureLod(uNoise3, q * 3.9 + vec3(0.0, uTime * 0.012, 0.0), 0.0); d -= (1.0 - (n2.g * 0.62 + n2.b * 0.38)) * 0.36 * detail * uCloudB.z * (1.0 - smoothstep(0.0, 0.5, d)); }
      return max(d, 0.0) * uCloudA.w * 9.0;
    }
    void main(){
      vec2 ndc = vUv * 2.0 - 1.0;
      vec4 v4 = uInvProj * vec4(ndc, 1.0, 1.0); vec3 rv = normalize(v4.xyz / v4.w);
      vec3 rd = normalize((uCamW * vec4(rv, 0.0)).xyz), ro = uEye;
      float z = texture2D(tDepth, vUv).r;
      vec4 vp = uInvProj * vec4(ndc, z * 2.0 - 1.0, 1.0);          // unproject, so an oblique (mirror) projection works too
      float sceneD = z >= 0.999999 ? 1.0e6 : length(vp.xyz / vp.w);
      float jit = drHash(gl_FragCoord.xy + 0.37);
      vec3 acc = vec3(0.0); float T = 1.0; float firstD = -1.0;
      vec3 kd = uKeyDir; float cth = dot(rd, kd);
      float phase = 0.55 + 0.45 * cth * cth + 2.4 * pow(max(cth, 0.0), 12.0) + 0.25 * pow(max(-cth, 0.0), 3.0);
      vec3 keyC = uKeyCol * (1.0 - 0.75 * uCloudB.y);
      // ── valley mist (below the clouds) ──
      float mAcc = 0.0; vec3 mCol = vec3(0.0); float mT = 1.0;
      if (uMistV.z > 0.0) {
        float ya = uMistV.x, yb = uMistV.y; float ta = (ya - ro.y) / rd.y, tb = (yb - ro.y) / rd.y;
        float t0 = max(min(ta, tb), 0.0), t1 = min(max(ta, tb), min(sceneD, 2600.0));
        if (abs(rd.y) < 1e-4) { t0 = 0.0; t1 = (ro.y > ya && ro.y < yb) ? min(sceneD, 2600.0) : -1.0; }
        if (t1 > t0) {
          const int MS = 12; float dt = (t1 - t0) / float(MS); float t = t0 + dt * jit;
          vec3 skyA = drSkyBase(vec3(rd.x, 0.25, rd.z)) * uAmb;
          for (int i = 0; i < MS; i++) {
            vec3 p = ro + rd * t; float h = (p.y - ya) / (yb - ya);
            vec3 q = p * uMistV.w + vec3(uCloudOff.x * 2.0, -uTime * 0.01, uCloudOff.z * 2.0 + uTime * 0.004);
            float n = textureLod(uNoise3, q, 0.0).a * 0.65 + textureLod(uNoise3, q * 2.7 + 0.31, 0.0).r * 0.35;
            float d = uMistV.z * smoothstep(0.38, 0.72, n + (1.0 - h) * 0.22) * smoothstep(1.0, 0.55, h) * smoothstep(0.0, 0.12, h);
            if (d > 0.0) {
              float a = 1.0 - exp(-d * dt);
              float sun = drCloudSun(p) * exp(-(yb - p.y) * uMistV.z * 9.0 / max(kd.y, 0.15));
              vec3 c = skyA * 0.9 + keyC * sun * (0.06 + 0.5 * pow(max(cth, 0.0), 6.0) + 0.14 * cth * cth);
              vec3 fl = uFlash.xyz - p; c += uFlashCol * uFlash.w * 0.5 / (1.0 + dot(fl, fl) * 2.0e-5);
              vec3 gl = uGlow.xyz - p; c += uGlowCol * uGlow.w * 0.3 / (1.0 + dot(gl, gl) * 0.006);
              mCol += mT * a * c; mT *= 1.0 - a;
            }
            t += dt;
          }
        }
      }
      // ── clouds ──
      {
        float ya = uCloudA.x, yb = uCloudA.y; float ta = (ya - ro.y) / rd.y, tb = (yb - ro.y) / rd.y;
        float t0 = max(min(ta, tb), 0.0), t1 = min(max(ta, tb), min(sceneD, 14000.0));
        if (abs(rd.y) < 1e-4) { t0 = 0.0; t1 = (ro.y > ya && ro.y < yb) ? min(sceneD, 14000.0) : -1.0; }
        if (t1 > t0) {
          float dt = max(7.0, t0 * 0.03); float t = t0 + dt * jit; int n = int(uSteps);
          vec3 ambLo = mix(uSkyGnd, uSkyHor, 0.35) * uAmb * (1.0 - 0.6 * uCloudB.y), ambHi = (mix(uSkyHor, uSkyZen, 0.55) + uSkyWarm * 0.2) * uAmb * 1.25 * (1.0 - 0.45 * uCloudB.y);
          for (int i = 0; i < 80; i++) {
            if (i >= n || t >= t1 || T < 0.02) break;
            vec3 p = ro + rd * t; float cov = weatherAt(p);
            float d = cloudDen(p, cov, 1.0);
            if (d > 0.0) {
              if (firstD < 0.0) firstD = t;
              float h = (p.y - ya) / (yb - ya);
              float od = 0.0, ls = 26.0; vec3 lp = p;
              for (int j = 0; j < 4; j++) { lp += kd * ls; od += cloudDen(lp, cov, 0.0) * ls; ls *= 1.9; }
              float beer = exp(-od * 1.0) * 0.82 + exp(-od * 0.22) * 0.34 + exp(-od * 0.05) * 0.10;
              float powder = 1.0 - exp(-d * 60.0 - od * 2.0) * 0.55;
              vec3 c = keyC * beer * powder * phase * 0.62 + mix(ambLo, ambHi, smoothstep(0.0, 0.9, h)) * (0.55 + 0.45 * exp(-od * 0.6));
              vec3 fl = uFlash.xyz - p; float fd2 = dot(fl, fl); c += uFlashCol * uFlash.w * (0.9 / (1.0 + fd2 * 6.0e-5));
              vec3 gl = uGlow.xyz - p; c += uGlowCol * uGlow.w * (0.5 / (1.0 + dot(gl, gl) * 0.0035));
              float a = 1.0 - exp(-d * dt);
              acc += T * a * c; T *= 1.0 - a;
            }
            dt = max(7.0, t * 0.03) * (d > 0.0 ? 1.0 : 1.7); t += dt;
          }
        }
      }
      // far clouds sink into the air of the horizon
      if (firstD > 0.0) { vec4 ar = drAir(ro, rd, firstD); acc = mix(acc, ar.rgb * (1.0 - T), ar.a * 0.92); }
      // order: below the deck the mist is in front; above it the clouds are
      vec3 col; float Tt;
      if (ro.y < uCloudA.x) { col = mCol + mT * acc; } else { col = acc + T * mCol; }
      Tt = T * mT;
      // rainbow: a 42° ring round the point opposite the sun, in the lit rain between here and the far wall
      if (uRainbow > 0.0) {
        float ang = degrees(acos(clamp(dot(rd, -uSunDir), -1.0, 1.0)));
        float x = (ang - 40.4) / 2.2; float band = smoothstep(0.0, 0.25, x) * smoothstep(1.0, 0.75, x);
        vec3 rb = clamp(vec3(1.5 - abs(x * 3.2 - 2.6), 1.4 - abs(x * 3.2 - 1.7), 1.5 - abs(x * 3.2 - 0.8)), 0.0, 1.0);
        float x2 = (ang - 50.5) / 3.2; vec3 rb2 = clamp(vec3(1.5 - abs(x2 * 3.2 - 0.8), 1.4 - abs(x2 * 3.2 - 1.7), 1.5 - abs(x2 * 3.2 - 2.6)), 0.0, 1.0) * smoothstep(0.0, 0.25, x2) * smoothstep(1.0, 0.75, x2);
        float far = smoothstep(120.0, 700.0, min(sceneD, 5000.0)) * smoothstep(-0.02, 0.10, rd.y);
        col += (rb * band + rb2 * 0.22) * uRainbow * far * uSunCol * 0.55 * Tt;
      }
      gl_FragColor = vec4(col, Tt);
    }
  `;
}

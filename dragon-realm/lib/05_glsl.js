// dragon-realm · 05_glsl — the shared uniforms, the shader chunks every material uses (sky colour, air, cloud shadow,
// wind, noise), and DR.mat(): a three.js built-in material with those wired in and hooks for procedural surfaces.
{
  const U = DR.U, u = (v) => ({ value: v }), V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  Object.assign(U, {
    uTime: u(0),
    uKeyDir: u(V3(0.5, 0.5, 0.7).normalize()), uKeyCol: u(V3(4, 3.4, 2.8)),       // the light that casts shadows (sun or moon)
    uSunDir: u(V3(0.5, 0.4, 0.7).normalize()), uSunCol: u(V3(1, 0.8, 0.6)),        // the sun's place and glow in the sky
    uMoonDir: u(V3(-0.5, 0.5, -0.7).normalize()), uMoonCol: u(V3(0, 0, 0)),
    uSkyZen: u(V3(0.1, 0.2, 0.5)), uSkyHor: u(V3(0.5, 0.6, 0.8)), uSkyGnd: u(V3(0.2, 0.2, 0.2)), uSkyWarm: u(V3(0, 0, 0)),
    uAmb: u(1), uStars: u(0),
    uFog: u(new THREE.Vector4(0.0006, 0.004, 0, 1 / 28)),                          // air /m, mist /m at base, base height, 1/scale height
    uFogCol: u(V3(0.5, 0.6, 0.8)),                                                 // tint of the mist (× sky at the horizon)
    uCover: u(0.35), uCloudDrift: u(new THREE.Vector2(0, 0)), uShadowK: u(0.8),    // cloud-shadow cover 0..1, drift in metres, strength
    uWind: u(new THREE.Vector4(1, 0, 0.3, 0)),                                     // dir.xz, strength, phase (integrated)
    uWet: u(0), uFlash: u(new THREE.Vector4(0, 300, 0, 0)), uFlashCol: u(V3(0.7, 0.85, 1.6)),
    uGlow: u(new THREE.Vector4(0, 0, 0, 0)), uGlowCol: u(V3(1, 0.9, 0.6)),        // a point glow (the pearl): xyz, intensity
    uNoise: u(null), uNoise3: u(null), uRes: u(new THREE.Vector2(1920, 1080)), uPx: u(0.001),
    uRift: u(new THREE.Vector4(0, 0, 100, 0)), uMirror: u(0), uDisc: u(new THREE.Vector4(0.9997, 0.99925, 0, 0)), uSunDisc: u(V3(40, 32, 24)),
  });

  // ── tiling noise textures, made on the CPU at load ──
  DR.makeNoiseTex = () => {
    const N = 256, d = new Uint8Array(N * N * 4);
    const lat = (seed, per) => { const g = new Float32Array(per * per); for (let i = 0; i < per * per; i++) g[i] = DR.hash2(i, seed); return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      const a = g[DR.mod(yi, per) * per + DR.mod(xi, per)], b = g[DR.mod(yi, per) * per + DR.mod(xi + 1, per)], c = g[DR.mod(yi + 1, per) * per + DR.mod(xi, per)], e = g[DR.mod(yi + 1, per) * per + DR.mod(xi + 1, per)];
      return a + (b - a) * ux + (c - a) * uy + (a - b - c + e) * ux * uy; }; };
    const fbm = (seed, base, oct) => { const L = []; for (let o = 0; o < oct; o++) L.push(lat(seed + o * 7, base << o)); return (x, y) => { let v = 0, a = 0.5, n = 0; for (let o = 0; o < oct; o++) { v += a * L[o](x * (base << o), y * (base << o)); n += a; a *= 0.5; } return v / n; }; };
    const f0 = fbm(11, 4, 6), f1 = fbm(57, 8, 5), f2 = lat(91, 16);
    const cells = 12, cp = []; for (let i = 0; i < cells * cells; i++) cp.push([DR.hash2(i, 301), DR.hash2(i, 302)]);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const ux = x / N, uy = y / N, o = (y * N + x) * 4;
      let md = 9; const cx = Math.floor(ux * cells), cy = Math.floor(uy * cells);
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const gx = cx + i, gy = cy + j, p = cp[DR.mod(gy, cells) * cells + DR.mod(gx, cells)]; const dx = gx + p[0] - ux * cells, dy = gy + p[1] - uy * cells; md = Math.min(md, dx * dx + dy * dy); }
      d[o] = 255 * DR.sat((f0(ux, uy) - 0.5) * 1.9 + 0.5); d[o + 1] = 255 * DR.sat((f1(ux, uy) - 0.5) * 1.9 + 0.5); d[o + 2] = 255 * f2(ux * 16, uy * 16); d[o + 3] = 255 * DR.sat(Math.sqrt(md));
    }
    const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
    return t;
  };
  // 3-D: R = billowy shape (fbm × inverted worley), G = worley 6, B = worley 12, A = fbm.  Tiles in all three axes.
  DR.makeNoise3 = (N = 64) => {
    const d = new Uint8Array(N * N * N * 4);
    const worley = (cells, seed) => { const pts = new Float32Array(cells ** 3 * 3); for (let i = 0; i < pts.length; i++) pts[i] = DR.hash2(i, seed);
      return (x, y, z) => { const px = x * cells, py = y * cells, pz = z * cells, cx = Math.floor(px), cy = Math.floor(py), cz = Math.floor(pz); let md = 9;
        for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const gx = cx + i, gy = cy + j, gz = cz + k, q = ((DR.mod(gz, cells) * cells + DR.mod(gy, cells)) * cells + DR.mod(gx, cells)) * 3;
          const dx = gx + pts[q] - px, dy = gy + pts[q + 1] - py, dz = gz + pts[q + 2] - pz, dd = dx * dx + dy * dy + dz * dz; if (dd < md) md = dd; }
        return 1 - Math.min(1, Math.sqrt(md)); }; };
    const lat3 = (per, seed) => { const g = new Float32Array(per ** 3); for (let i = 0; i < g.length; i++) g[i] = DR.hash2(i, seed); const at = (x, y, z) => g[(DR.mod(z, per) * per + DR.mod(y, per)) * per + DR.mod(x, per)];
      return (x, y, z) => { x *= per; y *= per; z *= per; const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z); let fx = x - xi, fy = y - yi, fz = z - zi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
        const l = (a, b, t) => a + (b - a) * t;
        return l(l(l(at(xi, yi, zi), at(xi + 1, yi, zi), fx), l(at(xi, yi + 1, zi), at(xi + 1, yi + 1, zi), fx), fy), l(l(at(xi, yi, zi + 1), at(xi + 1, yi, zi + 1), fx), l(at(xi, yi + 1, zi + 1), at(xi + 1, yi + 1, zi + 1), fx), fy), fz); }; };
    const w3 = worley(3, 5), w6 = worley(6, 6), w12 = worley(12, 7), p4 = lat3(4, 8), p8 = lat3(8, 9), p16 = lat3(16, 10), p32 = lat3(32, 12);
    for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const ux = x / N, uy = y / N, uz = z / N, o = ((z * N + y) * N + x) * 4;
      const f = p4(ux, uy, uz) * 0.5 + p8(ux, uy, uz) * 0.27 + p16(ux, uy, uz) * 0.15 + p32(ux, uy, uz) * 0.08;
      const a = w3(ux, uy, uz), b = w6(ux, uy, uz), c = w12(ux, uy, uz), wf = a * 0.6 + b * 0.28 + c * 0.12;
      d[o] = 255 * DR.sat(DR.remap(f, 0.25, 0.75, 0, 1) * 0.55 + wf * 0.6 - 0.08); d[o + 1] = 255 * b; d[o + 2] = 255 * c; d[o + 3] = 255 * DR.sat((f - 0.5) * 1.8 + 0.5);
    }
    const t = new THREE.Data3DTexture(d, N, N, N); t.format = THREE.RGBAFormat; t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
    return t;
  };

  // ── chunks ──
  const G = (DR.GLSL = {});
  G.uniforms = /* glsl */`
    uniform float uTime, uAmb, uStars, uCover, uShadowK, uWet, uPx, uMirror;
    uniform vec3 uKeyDir, uKeyCol, uSunDir, uSunCol, uMoonDir, uMoonCol, uSkyZen, uSkyHor, uSkyGnd, uSkyWarm, uFogCol, uFlashCol, uGlowCol;
    uniform vec4 uFog, uWind, uFlash, uGlow, uDisc, uRift; uniform vec3 uSunDisc;
    uniform vec2 uCloudDrift, uRes;
    uniform sampler2D uNoise;
  `;
  G.common = /* glsl */`
    #ifndef DR_COMMON
    #define DR_COMMON
    float drSat(float x){ return clamp(x, 0.0, 1.0); }
    float drHash(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    float drHash3(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
    vec4 drN4(vec2 uv){ return texture2D(uNoise, uv); }
    float drFbm(vec2 uv){ return texture2D(uNoise, uv).r; }
    // the sky without sun or moon discs: what lights the shade side of things and colours the air
    vec3 drSkyBase(vec3 d){
      float h = max(d.y, 0.0), k = 1.0 - h;
      vec3 c = mix(uSkyZen, uSkyHor, k * k * k);
      float cs = max(dot(normalize(vec3(d.x, 0.0, d.z) + 1e-5), normalize(vec3(uSunDir.x, 0.0, uSunDir.z) + 1e-5)), 0.0);
      c = mix(c, uSkyWarm, min(1.0, dot(uSkyWarm, vec3(9.0))) * pow(k, 5.0) * (0.25 + 0.75 * cs * cs));
      float c3 = max(dot(d, uSunDir), 0.0);
      c += uSunCol * (0.05 * pow(c3, 5.0) + 0.22 * pow(c3, 48.0));
      return mix(c, uSkyGnd, smoothstep(0.0, -0.22, d.y));
    }
    // air between the eye and a point: thin blue air everywhere + a mist that thickens toward the valley floor
    vec4 drAir(vec3 ro, vec3 rd, float dist){
      float kH = uFog.w, y0 = max(ro.y - uFog.z, -12.0), dy = rd.y * dist;
      float e0 = exp(-kH * y0), q = kH * dy;
      float mean = abs(q) > 1e-3 ? (1.0 - exp(-max(q, -30.0))) / q : 1.0 - 0.5 * q;
      float tm = uFog.y * dist * min(e0 * mean, 6.0), ta = uFog.x * dist;
      float c = max(dot(rd, uKeyDir), 0.0), c2 = c * c;
      vec3 sky = drSkyBase(normalize(vec3(rd.x, max(rd.y, 0.0) * 0.4 + 0.03, rd.z)));
      vec3 key = uKeyCol * (1.0 - uCover * uShadowK * 0.7);
      vec3 mist = uFogCol * (sky * 0.95 + key * (0.012 + 0.02 * c2 + 0.10 * pow(c2, 16.0)));
      vec3 air = sky * 1.0 + key * (0.004 + 0.012 * c2 + 0.06 * pow(c2, 16.0));
      float tt = tm + ta;
      return vec4((mist * tm + air * ta) / max(tt, 1e-6), 1.0 - exp(-tt));
    }
    vec3 drAerial(vec3 col, vec3 wpos){ vec3 v = wpos - cameraPosition; float d = length(v); vec4 a = drAir(cameraPosition, v / d, d); return mix(col, a.rgb, a.a); }
    // how much of the key light reaches a point through the cloud deck (a drifting field, slid along the light)
    // (explicit level 0: this is also called inside loops and branches, where automatic mip selection is undefined)
    float drCloudSun(vec3 p){
      vec2 g = p.xz - uKeyDir.xz / max(uKeyDir.y, 0.12) * p.y + uCloudDrift;
      float n = textureLod(uNoise, g / 620.0, 0.0).r * 0.7 + textureLod(uNoise, g / 211.0 + 0.37, 0.0).g * 0.3;
      float cov = smoothstep(1.0 - uCover - 0.16, 1.0 - uCover + 0.16, n);
      cov *= 1.0 - uRift.w * smoothstep(uRift.z * (1.1 + 0.5 * n), uRift.z * (0.5 + 0.5 * n), length(g - uCloudDrift - uRift.xy));   // light falls through a tear in the deck
      return 1.0 - uShadowK * cov;
    }
    // wind: a lean plus gust waves that travel with the wind; w = how loose this vertex is (0 root … 1 tip)
    vec3 drWindAt(vec3 wp, float w){
      vec2 dir = uWind.xy; float ph = uWind.w, along = dot(wp.xz, dir);
      float gust = textureLod(uNoise, (wp.xz - dir * ph * 9.0) / 190.0, 0.0).r;
      float s = uWind.z * (0.35 + 1.3 * gust);
      float a = sin(ph * 1.9 - along * 0.11 + wp.y * 0.07) + 0.5 * sin(ph * 4.3 - along * 0.31 + wp.z * 0.13);
      vec3 o = vec3(dir.x, 0.0, dir.y) * (0.5 * s + 0.22 * s * a) * w;
      o.y -= 0.12 * s * w * w; return o;
    }
    #endif
  `;
  G.sky = /* glsl */`
    // the whole sky seen from the ground, with discs and stars (for the dome and for mirrors)
    vec3 drSkyFull(vec3 d){
      vec3 c = drSkyBase(d);
      float cs = dot(d, uSunDir);
      c += uSunDisc * smoothstep(uDisc.x - 0.00012, uDisc.x + 0.00012, cs) + uSunCol * pow(max(cs, 0.0), 900.0) * 3.0;
      float cm = dot(d, uMoonDir);
      if (cm > 0.99) {
        float disc = smoothstep(uDisc.y - 0.0001, uDisc.y + 0.0001, cm);
        vec3 mu = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0))), mv = cross(mu, uMoonDir);
        vec2 q = vec2(dot(d, mu), dot(d, mv)) / sqrt(max(1.0 - uDisc.y * uDisc.y, 1e-6));
        float mare = (0.70 + 0.30 * smoothstep(0.35, 0.7, textureLod(uNoise, q * 0.42 + 0.31, 0.0).r)) * (0.75 + 0.25 * sqrt(max(1.0 - dot(q, q), 0.0)));
        c += uMoonCol * (disc * mare * 3.2 + pow(max(cm, 0.0), 600.0) * 0.20 + pow(max(cm, 0.0), 60.0) * 0.035);
      } else c += uMoonCol * pow(max(cm, 0.0), 60.0) * 0.035;
      if (uStars > 0.003 && d.y > 0.0) {
        vec3 p = d * 190.0; vec3 ip = floor(p); float h = drHash3(ip);
        float st = step(0.9965, h) * smoothstep(0.42, 0.0, length(fract(p) - 0.5)) * (0.4 + 0.6 * drHash3(ip + 7.0));
        c += vec3(0.8, 0.9, 1.1) * st * uStars * 1.6 * smoothstep(0.0, 0.25, d.y);
      }
      return c;
    }
  `;

  // ── DR.mat: a built-in material + the shared light and air + hooks ──
  // opts: base 'standard' | 'lambert' | 'basic'; any three.js material parameters; and
  //   uniforms  { name: {value} }            extra uniforms (shared by reference)
  //   vHead / vBody                          vertex: vBody may change drPos, drNrm (object space, before instancing)
  //   fHead / fBody                          fragment: fBody may change diffuseColor, roughnessFactor, metalnessFactor,
  //                                          N (world normal), drAO, drSun (key-light share), drEmit (added light),
  //                                          drThrough (vec3: light let through from behind — leaves, fins, cloth)
  //   alpha                                  fragment code run first in colour AND depth passes; may `discard`
  //   air: false                             leave the air out (sky, emitters)
  //   depth: true                            also make the matching depth material (needed when vBody or alpha is set)
  let serial = 0;
  DR.mat = (o = {}) => {
    const { base = 'standard', uniforms = {}, vHead = '', vBody = '', fHead = '', fBody = '', alpha = '', air = true, depth = false, defines = {}, ...params } = o;
    const Cls = base === 'lambert' ? THREE.MeshLambertMaterial : base === 'basic' ? THREE.MeshBasicMaterial : base === 'physical' ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    if (typeof params.color === 'string' || typeof params.color === 'number') params.color = DR.col(params.color);
    if (typeof params.emissive === 'string') params.emissive = DR.col(params.emissive);
    const mat = new Cls(params), id = ++serial, lit = base !== 'basic', pbr = base === 'standard' || base === 'physical';
    mat.defines = { ...(mat.defines || {}), ...defines };
    const rep = (src, a, b, what) => { if (!src.includes(a)) { console.warn(`DR.mat: anchor not found (${what}): ${a}`); return src; } return src.replace(a, b); };
    const vertexStage = (vs, isDepth) => {
      vs = rep(vs, '#include <common>', `#include <common>\n varying vec3 vWPos; varying vec2 vUv0; varying vec3 vONrm; ${G.uniforms}\n${G.common}\n${vHead}`, 'v common');
      const flat = isDepth || base === 'basic';   // these have no normal stage to hook
      const body = `vec3 drPos = position; vec3 drNrm = ${isDepth ? 'vec3(0.0, 1.0, 0.0)' : flat ? 'normal' : 'objectNormal'}; vUv0 = uv;\n${vBody}\n`;
      if (flat) vs = rep(vs, '#include <begin_vertex>', `${body} vec3 transformed = drPos; ${isDepth ? '' : 'vONrm = drNrm;'}`, 'v begin (flat)');
      else { vs = rep(vs, '#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${body} objectNormal = drNrm; vONrm = drNrm;`, 'v normal'); vs = rep(vs, '#include <begin_vertex>', 'vec3 transformed = drPos;', 'v begin'); }
      vs = rep(vs, '#include <project_vertex>', `#include <project_vertex>\n vec4 drW = vec4(transformed, 1.0);\n #ifdef USE_INSTANCING\n drW = instanceMatrix * drW;\n #endif\n vWPos = (modelMatrix * drW).xyz;`, 'v project');
      return vs;
    };
    mat.onBeforeCompile = (sh) => {
      for (const k in U) sh.uniforms[k] = U[k];
      for (const k in uniforms) sh.uniforms[k] = uniforms[k];
      sh.vertexShader = vertexStage(sh.vertexShader, false);
      let fs = sh.fragmentShader;
      fs = rep(fs, '#include <common>', `#include <common>\n varying vec3 vWPos; varying vec2 vUv0; varying vec3 vONrm; ${G.uniforms}\n${G.common}\n${fHead}`, 'f common');
      if (alpha) fs = rep(fs, 'void main() {', `void main() {\n${alpha}\n`, 'f main');
      const hook = `
        vec3 N = inverseTransformDirection(normal, viewMatrix);
        float drAO = 1.0; float drSun = drCloudSun(vWPos); vec3 drEmit = vec3(0.0); vec3 drThrough = vec3(0.0);
        ${pbr ? '' : 'float roughnessFactor = 1.0; float metalnessFactor = 0.0;'}
        ${fBody}
        ${lit ? 'normal = normalize((viewMatrix * vec4(N, 0.0)).xyz);' : ''}
        #ifdef DR_WET
          { float w = uWet * smoothstep(-0.2, 0.5, N.y); diffuseColor.rgb *= mix(1.0, 0.62, w); ${pbr ? 'roughnessFactor = mix(roughnessFactor, 0.22, w * 0.85);' : ''} }
        #endif
      `;
      if (lit) {
        fs = rep(fs, '#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${hook}`, 'f hook');
        fs = rep(fs, '#include <lights_fragment_begin>', THREE.ShaderChunk.lights_fragment_begin
          .replace('getDirectionalLightInfo( directionalLight, directLight );', 'getDirectionalLightInfo( directionalLight, directLight ); directLight.color *= drSun;')
          + `
          { // the sky as the fill light, a lightning flash and the pearl's glow as point sources
            vec3 drSkyL = mix(uSkyGnd * 0.9 + uSkyHor * 0.12, mix(uSkyHor, uSkyZen, 0.6) + uSkyWarm * 0.15, N.y * 0.5 + 0.5) * uAmb;
            vec3 fl = uFlash.xyz - vWPos; float fd = length(fl);
            drSkyL += uFlashCol * uFlash.w * (0.35 + 0.65 * max(dot(N, fl / fd), 0.0)) / (1.0 + fd * fd * 2.0e-5) * mix(1.0, drSun, 0.3);
            vec3 gl = uGlow.xyz - vWPos; float gd2 = dot(gl, gl);
            drSkyL += uGlowCol * uGlow.w * max(dot(N, gl * inversesqrt(gd2)) * 0.75 + 0.25, 0.0) / (1.0 + gd2 * 0.01);
            irradiance += drSkyL * 3.14159;
          }`, 'f lights');
        if (pbr) fs = rep(fs, '#include <lights_fragment_maps>', `#include <lights_fragment_maps>\n {
            vec3 drR = inverseTransformDirection(reflect(-geometryViewDir, geometryNormal), viewMatrix);
            float ro = material.roughness;
            vec3 env = mix(drSkyBase(normalize(vec3(drR.x, abs(drR.y) * (1.0 - ro) + ro * 0.6, drR.z))), mix(uSkyGnd, uSkyHor, 0.5), ro * ro * 0.6);
            radiance += env * uAmb * mix(1.0, 0.25, ro);
          }`, 'f env');
        fs = rep(fs, '#include <lights_fragment_end>', `#include <lights_fragment_end>
          reflectedLight.indirectDiffuse *= drAO; ${pbr ? 'reflectedLight.indirectSpecular *= drAO;' : ''}
          reflectedLight.directDiffuse += drThrough * uKeyCol * drSun * max(dot(-N, uKeyDir), 0.0) * 0.3183;
          totalEmissiveRadiance += drEmit;`, 'f lights end');
      } else {
        fs = rep(fs, '#include <color_fragment>', `#include <color_fragment>\n vec3 normal = vec3(0.0, 0.0, 1.0);\n${hook}\n diffuseColor.rgb += drEmit;`, 'f hook (basic)');
      }
      fs = rep(fs, '#include <fog_fragment>', air ? 'gl_FragColor.rgb = drAerial(gl_FragColor.rgb, vWPos);' : '', 'f fog');
      sh.fragmentShader = fs;
      if (o.onShader) o.onShader(sh);
    };
    mat.customProgramCacheKey = () => 'dr' + id;
    if (depth) {
      const dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: params.side ?? THREE.FrontSide });
      dm.defines = { ...defines };
      dm.onBeforeCompile = (sh) => {
        for (const k in U) sh.uniforms[k] = U[k];
        for (const k in uniforms) sh.uniforms[k] = uniforms[k];
        sh.vertexShader = vertexStage(sh.vertexShader, true);
        let fs = sh.fragmentShader;
        fs = rep(fs, '#include <common>', `#include <common>\n varying vec3 vWPos; varying vec2 vUv0; ${G.uniforms}\n${G.common}\n${fHead}`, 'fd common');
        if (alpha) fs = rep(fs, 'void main() {', `void main() {\n${alpha}\n`, 'fd main');
        sh.fragmentShader = fs;
      };
      dm.customProgramCacheKey = () => 'drd' + id;
      mat.userData.depth = dm;
    }
    return mat;
  };
  // attach a mesh's matching depth material (call after creating the Mesh / InstancedMesh)
  DR.shadowed = (mesh, cast = true, receive = true) => { mesh.castShadow = cast; mesh.receiveShadow = receive; if (mesh.material.userData && mesh.material.userData.depth) mesh.customDepthMaterial = mesh.material.userData.depth; return mesh; };

  // a plain ShaderMaterial that knows the shared uniforms and chunks (sky, effects, post)
  DR.shader = ({ uniforms = {}, vertex, fragment, ...rest }) => new THREE.ShaderMaterial({
    uniforms: { ...U, ...uniforms },
    vertexShader: `varying vec3 vWPos; varying vec2 vUv0;\n${G.uniforms}\n${G.common}\n${vertex}`,
    fragmentShader: `varying vec3 vWPos; varying vec2 vUv0;\n${G.uniforms}\n${G.common}\n${fragment}`,
    ...rest,
  });
}

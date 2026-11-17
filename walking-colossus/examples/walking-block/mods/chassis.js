// CHASSIS: the mechanical belly between the apartment block and the legs.
// Walker-local frame: x along the block (±45), z across (±8.5), chassis band y ∈ [-4.5, 0] (hangs to ≈ -7).
// Everything is merged per material bucket (vertex colours carry tint / fake AO), so the whole module is
// ~20 draw calls. Warm work lamps light the machinery through a cheap per-fragment "fake lamp" term
// (up to 64 lamp points, no shadows) injected into every chassis material, plus ≤ 6 real PointLights.
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';

export async function create(ctx) {
  const { THREE, walker, CFG, Mats, rng, Q } = ctx;
  const T0 = performance.now();
  const R = rng(0xC4A551);
  const rnd = (a = 0, b = 1) => a + (b - a) * R();
  const pick = (arr) => arr[Math.floor(R() * arr.length) % arr.length];
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const SS = THREE.MathUtils.smoothstep;
  const root = new THREE.Group(); root.name = 'chassis';
  walker.add(root);

  const LEGX = CFG.LEG_X, HY = CFG.HIP_Y, HZ = CFG.HIP_Z;
  const HIPS = []; for (const hx of LEGX) for (const s of [1, -1]) HIPS.push(V3(hx, HY, s * HZ));
  const hipHit = (p, r = 0) => HIPS.some((h) => h.distanceTo(p) < 3.25 + r);
  const LINES = []; for (let i = 0; i <= 16; i++) LINES.push(-44 + 5.5 * i);   // structural bay lines
  const isHipLine = (x) => LEGX.some((hx) => Math.abs(hx - x) < 0.01);
  const DRUMS = [{ x: 0, r: 4.0, fan: 2.3, big: true }, { x: -22, r: 2.7, fan: 1.5 }, { x: 22, r: 2.7, fan: 1.5 }];
  // x-ranges of the edge band that are free (not in a hip bay)
  const EDGE_SEGS = [[-44.6, -37.6], [-28.4, -15.6], [-6.4, 6.4], [15.6, 28.4], [37.6, 44.6]];
  // x-ranges between the hip yokes (things at |z| > 4.9 stop at the cheek plates: hip recess)
  const BAY_SEGS = [[-44, -36.7], [-29.3, -14.7], [-7.3, 7.3], [14.7, 29.3], [36.7, 44]];

  // ------------------------------------------------------------------ fake lamp lighting
  const LAMP_N = 48;
  const lampU = {
    uLampP: { value: Array.from({ length: LAMP_N }, () => new THREE.Vector4(0, -1e4, 0, 0.001)) },
    uLampC: { value: Array.from({ length: LAMP_N }, () => new THREE.Vector3()) },
    uLampD: { value: Array.from({ length: LAMP_N }, () => new THREE.Vector4(0, -1, 0, -2)) },   // spot dir + cos(outer); w<-1.5 = omni
    uChsT: { value: 0 },
    uChsFill: { value: new THREE.Vector3(0.40, 0.37, 0.27) },
    uChsLampK: { value: 6.0 },
  };
  const DRIP_SRC = [];
  const lamps = []; // {p: Vector3 (local), c: [r,g,b], r: radius, w: priority}
  const addLight = (p, k = 1, r = 7, w = 1, col = [1.0, 0.46, 0.14], opt = {}) => { const L = { p: p.clone(), c: col.map((v) => v * k), r, w, ...opt }; lamps.push(L); return L; };

  const LAMPV = /* glsl */`
  {
    vec4 cLp = vec4(transformed, 1.0); vec3 cLn = objectNormal;
    #ifdef USE_INSTANCING
      cLp = instanceMatrix * cLp; cLn = mat3(instanceMatrix) * cLn;
    #endif
    vChsP = (modelMatrix * cLp).xyz;
    vChsN = normalize(mat3(modelMatrix) * cLn);
  }`;
  const SWAYV = /* glsl */`
  transformed.x += aSway.x * sin(uChsT * aSway.z + aSway.y);
  transformed.z += aSway.x * 0.7 * sin(uChsT * aSway.z * 0.73 + aSway.y * 1.9 + 1.3);
  transformed.y += aSway.x * 0.12 * sin(uChsT * aSway.z * 1.31 + aSway.y);
  `;
  const LAMPF = /* glsl */`
  {
    vec3 cN = normalize(vChsN) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 cAcc = vec3(0.0);
    for (int i = 0; i < ${LAMP_N}; i++) {
      vec4 lp = uLampP[i];
      vec3 L = lp.xyz - vChsP;
      float d2 = dot(L, L);
      float rr = lp.w * lp.w;
      if (d2 < rr) {
        float f = 1.0 - d2 / rr; f *= f;
        float inv = inversesqrt(d2 + 1e-4);
        float nd = dot(cN, L) * inv;
        vec4 ld = uLampD[i];
        float sp = ld.w < -1.5 ? 1.0 : smoothstep(ld.w, ld.w + 0.32, -dot(L, ld.xyz) * inv);
        cAcc += uLampC[i] * f * sp * (max(nd, 0.0) * 0.88 + 0.12) / (0.5 + d2 * 0.3);
      }
    }
    cAcc *= uChsLampK;
    // cool bounce from the fog / wet field below (the hemi light alone leaves the belly black)
    vec3 cFill = uChsFill * (0.35 + 0.65 * max(-cN.y, 0.0));
    reflectedLight.directDiffuse += (cAcc + cFill) * BRDF_Lambert(material.diffuseColor);
    reflectedLight.directSpecular += cAcc * material.specularColor * 0.12;
  }`;
  // round 2: extra wet grime on top of the shared weathering (mesh-local, uses the shared detail texture):
  // fine rust-brown run-off on vertical faces, moss + standing water on ledges, soot / oil / damp under faces.
  const GRIME_DEF = { uGrRust: { value: new THREE.Vector4(0.62, 0.42, 0.3, 0.5) }, uGrMoss: { value: 0.5 }, uGrSoot: { value: 0.6 } };
  const grime = (mat, r, g, b, a, moss, soot) => { mat.userData.grime = { uGrRust: { value: new THREE.Vector4(r, g, b, a) }, uGrMoss: { value: moss }, uGrSoot: { value: soot } }; return mat; };
  const GRIMEF = /* glsl */`
  {
    vec3 gp = vWp; vec3 gn = normalize(vWn);
    float gUp = gn.y, gVert = 1.0 - abs(gn.y);
    vec2 gs = vec2((gp.x + gp.z) * 0.9, gp.y * 0.045);
    float g1 = texture2D(uWDetail, gs).g;
    float g2 = texture2D(uWDetail, gs * vec2(0.31, 0.55) + 0.21).r;
    float gst = smoothstep(0.6, 0.86, g1 * 0.55 + g2 * 0.6) * gVert;
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uGrRust.rgb, gst * uGrRust.a);
    float g3 = texture2D(uWDetail, gp.xz * 0.13 + 0.4).a;
    float g4 = texture2D(uWDetail, gp.xz * 0.047 + 0.13).b;
    float gl = smoothstep(0.45, 0.9, gUp);
    float gMoss = gl * smoothstep(0.42, 0.62, g3) * uGrMoss;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.045, 0.07, 0.028) * (0.5 + 1.0 * g1), gMoss);
    float gPud = gl * smoothstep(0.52, 0.36, g3);
    diffuseColor.rgb *= 1.0 - 0.5 * gPud;
    float gd = smoothstep(0.4, 0.9, -gUp);
    float gSoot = gd * uGrSoot * smoothstep(0.42, 0.7, g4 * 0.7 + g3 * 0.3);
    diffuseColor.rgb *= 1.0 - 0.45 * gSoot;
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.8, 0.7, 0.55), gd * smoothstep(0.6, 0.8, g3) * uGrSoot);
    wWetA = max(wWetA, max(gPud * 0.95, gd * smoothstep(0.5, 0.75, g4) * 0.55 + gst * 0.35));
  }`;
  function patch(mat, sway = false) {
    const prev = mat.onBeforeCompile;
    const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : null;
    const hadPrev = !!(mat.userData && mat.userData.weather);
    mat.onBeforeCompile = (sh, r) => {
      if (hadPrev && prev) prev(sh, r);
      Object.assign(sh.uniforms, lampU);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vChsP; varying vec3 vChsN; uniform float uChsT;\n' + (sway ? 'attribute vec3 aSway;\n' : ''))
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + (sway ? SWAYV : '') + LAMPV);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vChsP; varying vec3 vChsN;\nuniform vec4 uLampP[${LAMP_N}]; uniform vec3 uLampC[${LAMP_N}]; uniform vec4 uLampD[${LAMP_N}]; uniform vec3 uChsFill; uniform float uChsLampK;\n` + (hadPrev ? 'uniform vec4 uGrRust; uniform float uGrMoss, uGrSoot;\n' : ''))
        .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + LAMPF);
      if (hadPrev) {
        Object.assign(sh.uniforms, mat.userData.grime || GRIME_DEF);
        sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', GRIMEF + '\n#include <roughnessmap_fragment>');
      }
    };
    mat.customProgramCacheKey = () => 'chs2' + (sway ? 's' : '') + (hadPrev && prevKey ? prevKey() : '');
    return mat;
  }

  // ------------------------------------------------------------------ materials
  const grateTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#fff';
    for (let i = 0; i < 64; i += 8) g.fillRect(i, 0, 4, 64);
    for (let j = 0; j < 64; j += 16) g.fillRect(0, j, 64, 4);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    return t;
  })();
  const signTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 512;
    const g = c.getContext('2d');
    // cell 0: long pale stencil warning plate (was hazard stripes: the look wants none)
    g.fillStyle = '#b9b7ab'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#23201c'; g.font = 'bold 30px Arial'; g.textAlign = 'center';
    g.fillText('НЕ СТОЙ ПОД', 128, 52); g.fillText('ШАРНИРОМ', 128, 96); g.strokeStyle = '#23201c'; g.lineWidth = 4; g.strokeRect(8, 8, 240, 112);
    // cell 1: red danger plate
    g.fillStyle = '#9a1f17'; g.fillRect(256, 0, 256, 128); g.fillStyle = '#e8e2d0'; g.font = 'bold 54px Arial'; g.textAlign = 'center';
    g.fillText('ОПАСНО', 384, 84); g.strokeStyle = '#e8e2d0'; g.lineWidth = 6; g.strokeRect(266, 10, 236, 108);
    // cell 2: white stencil number plate
    g.fillStyle = '#d8d6cc'; g.fillRect(0, 128, 256, 128); g.fillStyle = '#1b1b1b'; g.font = 'bold 72px Arial';
    g.fillText('Ж-4', 128, 218);
    // cell 3: yellow high-voltage
    g.fillStyle = '#d0a92a'; g.fillRect(256, 128, 256, 128); g.fillStyle = '#121212';
    g.beginPath(); g.moveTo(300, 236); g.lineTo(344, 148); g.lineTo(388, 236); g.closePath(); g.fill();
    g.fillStyle = '#d0a92a'; g.beginPath(); g.moveTo(348, 166); g.lineTo(334, 200); g.lineTo(346, 200); g.lineTo(338, 226); g.lineTo(358, 190); g.lineTo(346, 190); g.closePath(); g.fill();
    g.fillStyle = '#121212'; g.font = 'bold 30px Arial'; g.textAlign = 'left'; g.fillText('380 В', 402, 204);
    // row 2: cell 4 stencil block id, cell 5 blue instruction plate
    g.textAlign = 'center';
    g.fillStyle = '#8f9189'; g.fillRect(0, 256, 256, 128); g.fillStyle = '#1a1a18'; g.font = 'bold 44px Arial';
    g.fillText('БЛОК 7', 128, 318); g.font = 'bold 26px Arial'; g.fillText('СЕКЦИЯ Г-12', 128, 360);
    g.fillStyle = '#27456b'; g.fillRect(256, 256, 256, 128); g.fillStyle = '#d9d6c8'; g.font = 'bold 30px Arial';
    g.fillText('НЕ ВКЛЮЧАТЬ', 384, 312); g.fillText('РАБОТАЮТ ЛЮДИ', 384, 352);
    // row 3: cell 6 gauge dials, cell 7 arrow + ВЫХОД
    g.fillStyle = '#2a2b2a'; g.fillRect(0, 384, 256, 128);
    for (const gx of [64, 192]) {
      g.fillStyle = '#d6d2c2'; g.beginPath(); g.arc(gx, 448, 52, 0, 6.3); g.fill();
      g.strokeStyle = '#141414'; g.lineWidth = 3;
      for (let a = 0.75 * Math.PI; a <= 2.26 * Math.PI; a += 0.15 * Math.PI) { g.beginPath(); g.moveTo(gx + Math.cos(a) * 40, 448 + Math.sin(a) * 40); g.lineTo(gx + Math.cos(a) * 49, 448 + Math.sin(a) * 49); g.stroke(); }
      g.strokeStyle = '#8a1a12'; g.lineWidth = 5; g.beginPath(); g.arc(gx, 448, 45, 1.9 * Math.PI, 2.25 * Math.PI); g.stroke();
      g.strokeStyle = '#141414'; g.lineWidth = 4; const na = gx < 100 ? 1.35 * Math.PI : 1.8 * Math.PI;
      g.beginPath(); g.moveTo(gx, 448); g.lineTo(gx + Math.cos(na) * 40, 448 + Math.sin(na) * 40); g.stroke();
      g.fillStyle = '#141414'; g.beginPath(); g.arc(gx, 448, 6, 0, 6.3); g.fill();
    }
    g.fillStyle = '#2d5a3a'; g.fillRect(256, 384, 256, 128); g.fillStyle = '#dcd9cc'; g.font = 'bold 46px Arial';
    g.fillText('ВЫХОД', 364, 464); g.beginPath(); g.moveTo(500, 448); g.lineTo(468, 424); g.lineTo(468, 472); g.closePath(); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  })();

  const MAT = {
    concrete: grime(Mats.concreteDark({ color: 0x7a7c7e, w: { offset: V3(13, 2, 7), moss: 0.42, streak: 1.0, dirt: 0.9, wet: 0.4, bump: 0.018 } }), 0.6, 0.47, 0.36, 0.55, 0.75, 0.5),
    steel: grime(Mats.steel({ color: 0x43474c, w: { rust: 0.14, dirt: 0.85, streak: 0.8, offset: V3(3, 1, 9) } }), 0.62, 0.36, 0.24, 0.42, 0.3, 0.5),
    rust: Mats.rust({ color: 0x3f2c20, w: { rust: 0.55, offset: V3(7, 3, 1) } }),
    paint: grime(Mats.paintedMetal({ color: 0x9a9c96, w: { rust: 0.26, chip: 0.38, dirt: 0.9, moss: 0.12, offset: V3(5, 8, 2) } }), 0.6, 0.36, 0.24, 0.7, 0.45, 0.6),
    steelS: Mats.steel({ color: 0x4a4e53, w: { rust: 0.12, offset: V3(1, 7, 3) } }),
    rustS: Mats.rust({ color: 0x45301f, w: { rust: 0.5, offset: V3(9, 9, 4) } }),
    paintS: Mats.paintedMetal({ color: 0x9fa19b, w: { rust: 0.22, chip: 0.3, offset: V3(2, 2, 8) } }),
    chrome: Mats.chrome(),
    rubber: Mats.rubber({ color: 0x111214 }),
    sway: Mats.rubber({ color: 0x0f1012 }),
    grate: Mats.steel({ color: 0x4a4d50, w: { rust: 0.3, offset: V3(4, 4, 4) } }),
    signs: Mats.paint({ color: 0xffffff, w: { chip: 0.35, rust: 0.4, dirt: 0.75, streak: 0.8, offset: V3(6, 1, 6) } }),
    glass: new THREE.MeshStandardMaterial({ color: 0x20262c, roughness: 0.12, metalness: 0.5 }),
    emis: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    emisF: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),   // flickering practicals (colour driven by t)
  };
  // multiply-blended grime decals (rust runs, drip sets, oil / soot stains): one draw call, unlit, fog-correct (sits on the surface)
  const decalTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d'); const D = rng(0xDECA1); const dr = (a, b) => a + (b - a) * D();
    g.fillStyle = '#fff'; g.fillRect(0, 0, 512, 512);
    const streak = (x, y0, w, len, rgb, a) => {
      const gr = g.createLinearGradient(0, y0, 0, y0 + len);
      gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(0.35, `rgba(${rgb},${a * 0.7})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - w / 2, y0); g.lineTo(x + w / 2, y0); g.lineTo(x + w * 0.22, y0 + len); g.lineTo(x - w * 0.22, y0 + len); g.closePath(); g.fill();
    };
    g.save(); g.beginPath(); g.rect(6, 0, 244, 250); g.clip(); g.filter = 'blur(2.5px)';       // cell 0: single rust run from a point source
    for (let i = 0; i < 16; i++) streak(128 + dr(-34, 34) * dr(0.2, 1), 2, dr(6, 34), dr(90, 245), '96,50,24', dr(0.3, 0.7));
    g.fillStyle = 'rgba(52,26,12,0.85)'; g.beginPath(); g.ellipse(128, 8, 30, 9, 0, 0, 6.3); g.fill();
    g.restore();
    g.save(); g.beginPath(); g.rect(262, 0, 244, 250); g.clip(); g.filter = 'blur(2px)';       // cell 1: wet drip set under a leak line
    for (let i = 0; i < 26; i++) streak(dr(276, 492), 2, dr(5, 22), dr(50, 240), i % 3 ? '30,27,23' : '74,44,24', dr(0.35, 0.8));
    g.fillStyle = 'rgba(28,25,21,0.7)'; g.fillRect(270, 0, 228, 7);
    g.restore();
    g.save(); g.beginPath(); g.rect(6, 262, 244, 244); g.clip(); g.filter = 'blur(5px)';       // cell 2: oil / soot stain
    for (let i = 0; i < 40; i++) { const a = dr(0, 6.3), r = dr(0, 70) * dr(0.3, 1); g.fillStyle = `rgba(14,12,9,${dr(0.12, 0.4)})`; g.beginPath(); g.ellipse(128 + Math.cos(a) * r, 384 + Math.sin(a) * r, dr(10, 42), dr(10, 42), dr(0, 3), 0, 6.3); g.fill(); }
    g.filter = 'blur(1.5px)';
    for (let i = 0; i < 60; i++) { const a = dr(0, 6.3), r = dr(40, 105); g.fillStyle = `rgba(14,12,9,${dr(0.2, 0.6)})`; g.beginPath(); g.arc(128 + Math.cos(a) * r, 384 + Math.sin(a) * r, dr(1, 5), 0, 6.3); g.fill(); }
    g.restore();
    g.save(); g.beginPath(); g.rect(262, 262, 244, 244); g.clip(); g.filter = 'blur(3px)';     // cell 3: mottled rust bloom (around bolts, seams)
    for (let i = 0; i < 70; i++) { const a = dr(0, 6.3), r = dr(0, 95) * dr(0.4, 1); g.fillStyle = `rgba(${i % 4 ? '88,44,20' : '40,22,12'},${dr(0.12, 0.42)})`; g.beginPath(); g.ellipse(384 + Math.cos(a) * r, 384 + Math.sin(a) * r, dr(4, 22), dr(4, 22), dr(0, 3), 0, 6.3); g.fill(); }
    g.restore();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  })();
  const decalMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: decalTex } },
    vertexShader: 'attribute vec3 color; varying vec2 vUv; varying float vK;\n#include <common>\n#include <logdepthbuf_pars_vertex>\nvoid main(){ vUv = uv; vK = color.r; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: 'uniform sampler2D map; varying vec2 vUv; varying float vK;\n#include <common>\n#include <logdepthbuf_pars_fragment>\nvoid main(){\n#include <logdepthbuf_fragment>\n gl_FragColor = vec4(mix(vec3(1.0), texture2D(map, vUv).rgb, vK), 1.0); }',
    blending: THREE.MultiplyBlending, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, toneMapped: false,
  });
  MAT.grate.alphaMap = grateTex; MAT.grate.alphaTest = 0.5; MAT.grate.side = THREE.DoubleSide;
  MAT.signs.map = signTex;
  for (const [k, m] of Object.entries(MAT)) if (k !== 'emis' && k !== 'emisF') { m.vertexColors = true; patch(m, k === 'sway'); }
  MAT.decal = decalMat;

  // ------------------------------------------------------------------ buckets & geometry helpers
  const BK = {};
  const bucket = (name, opt = {}) => (BK[name] = { name, geoms: [], ...opt });
  bucket('concrete', { cast: true, recv: true });
  bucket('steel', { cast: true, recv: true });
  bucket('rust', { cast: true, recv: true });
  bucket('paint', { cast: true, recv: true });
  bucket('steelS', { recv: true }); bucket('rustS', { recv: true }); bucket('paintS', { recv: true });
  bucket('chrome', {}); bucket('rubber', {}); bucket('sway', { sway: true });
  bucket('grate', { uv: true, planar: true, recv: true }); bucket('signs', { uv: true });
  bucket('glass', {}); bucket('emis', { noAO: true }); bucket('emisF', { noAO: true }); bucket('decal', { noAO: true, uv: true });

  // fake ambient occlusion baked into vertex colours: deep inside the belly is darker
  const ao = (x, y, z) => {
    const depth = SS(-y, 0.6, 6.8);
    const edge = SS(Math.abs(z), 5.8, 10.0);
    const end = SS(Math.abs(x), 40.5, 46.0);
    return 0.36 + 0.64 * Math.min(1, depth * 0.7 + edge * 0.65 + end * 0.6);
  };
  function push(bn, g, tint = [1, 1, 1], vary = 0.08) {
    const b = BK[bn];
    for (const k of Object.keys(g.attributes)) if (!(k === 'position' || k === 'normal' || (k === 'uv' && b.uv) || (k === 'aSway' && b.sway))) g.deleteAttribute(k);
    if (!g.index) g = BGU.mergeVertices(g);
    const pos = g.attributes.position, n = pos.count;
    if (b.planar) {
      const uv = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) { uv[i * 2] = pos.getX(i) / 0.25; uv[i * 2 + 1] = pos.getZ(i) / 0.25; }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    const col = new Float32Array(n * 3);
    const v = b.name === 'decal' ? 1 : 1 + (R() * 2 - 1) * vary;
    for (let i = 0; i < n; i++) {
      const a = b.noAO ? 1 : ao(pos.getX(i), pos.getY(i), pos.getZ(i));
      col[i * 3] = tint[0] * v * a; col[i * 3 + 1] = tint[1] * v * a; col[i * 3 + 2] = tint[2] * v * a;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (b.sway && !g.attributes.aSway) g.setAttribute('aSway', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    b.geoms.push(g);
    return g;
  }
  const pushT = (bn, g, m, tint, vary) => push(bn, g.applyMatrix4(m), tint, vary);

  const UBOX = new THREE.BoxGeometry(1, 1, 1);
  const cylT = {}; const unitCyl = (seg) => (cylT[seg] ||= new THREE.CylinderGeometry(1, 1, 1, seg, 1));
  const sphT = {}; const unitSph = (seg) => (sphT[seg] ||= new THREE.SphereGeometry(1, seg, Math.max(3, seg >> 1)));
  const VUP = V3(0, 1, 0), VX = V3(1, 0, 0);
  function segMatrix(p0, p1, sx, sz, roll = 0) {
    const Y = V3().subVectors(p1, p0); const len = Y.length() || 1e-4; Y.divideScalar(len);
    const ref = Math.abs(Y.y) > 0.95 ? VX : VUP;
    const X = V3().crossVectors(ref, Y).normalize(); const Z = V3().crossVectors(X, Y);
    if (roll) { X.applyAxisAngle(Y, roll); Z.applyAxisAngle(Y, roll); }
    return new THREE.Matrix4().makeBasis(X.multiplyScalar(sx), Y.multiplyScalar(len), Z.multiplyScalar(sz))
      .setPosition((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2);
  }
  // ---- grime decals (own RNG so they never disturb the layout sequence)
  const DR = rng(0xD17C5); const drnd = (a = 0, b = 1) => a + (b - a) * DR();
  let decalN = 0;
  // cell 0 rust run, 1 drip set, 2 oil / soot stain, 3 rust bloom; `up` = direction of the texture top (the source of the run)
  function decal(cell, c, nrm, up, w, h, k = 1) {
    const nn = nrm.clone().normalize(), u = up.clone().normalize(), r = V3().crossVectors(u, nn).normalize();
    const o = c.clone().addScaledVector(nn, 0.012 + (decalN % 7) * 0.0015);
    const P = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([a, b]) => o.clone().addScaledVector(r, a * w / 2).addScaledVector(u, b * h / 2));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P.flatMap((p) => [p.x, p.y, p.z]), 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 2, 3].flatMap(() => [nn.x, nn.y, nn.z]), 3));
    const cu = (cell % 2) * 0.5, cv = cell < 2 ? 0.5 : 0, e = 0.014;
    g.setAttribute('uv', new THREE.Float32BufferAttribute([cu + e, cv + 0.5 - e, cu + 0.5 - e, cv + 0.5 - e, cu + e, cv + e, cu + 0.5 - e, cv + e], 2));
    g.setIndex([0, 2, 1, 1, 2, 3]);
    decalN++;
    push('decal', g, [k, k, k], 0);
  }
  const AUTO = { concrete: [0.2, 0.7], steel: [0.14, 0.3], paint: [0.3, 0.5] };   // [runs per metre of wall, stains per 10 m² of underside]
  const VDOWN = V3(0, -1, 0);
  function grimeBox(bn, xa, xb, ya, yb, za, zb) {
    const A = AUTO[bn]; if (!A) return;
    const x0 = Math.min(xa, xb), x1 = Math.max(xa, xb), y0 = Math.min(ya, yb), y1 = Math.max(ya, yb), z0 = Math.min(za, zb), z1 = Math.max(za, zb);
    const h = y1 - y0, sx = x1 - x0, sz = z1 - z0;
    if (h > 0.45) for (const [len, nrm, at] of [
      [sx, V3(0, 0, 1), (u) => V3(x0 + u, 0, z1)], [sx, V3(0, 0, -1), (u) => V3(x0 + u, 0, z0)],
      [sz, V3(1, 0, 0), (u) => V3(x1, 0, z0 + u)], [sz, V3(-1, 0, 0), (u) => V3(x0, 0, z0 + u)]]) {
      if (len < 0.9) continue;
      let cnt = len * A[0]; cnt = Math.floor(cnt) + (DR() < cnt % 1 ? 1 : 0);
      for (let i = 0; i < cnt; i++) {
        const wide = DR() < 0.35 && len > 2.4;
        const w = wide ? drnd(1.2, Math.min(3.4, len * 0.9)) : drnd(0.3, 0.85);
        const hh = Math.min(h, wide ? drnd(0.7, 2.4) : drnd(0.8, 3.2));
        const p = at(drnd(w / 2, len - w / 2)); p.y = y1 - hh / 2;
        const bloom = !wide && DR() < 0.22;
        decal(wide ? 1 : (bloom ? 3 : 0), p, nrm, VUP, bloom ? Math.min(w * 1.6, hh) : w, bloom ? Math.min(w * 1.6, hh) : hh, drnd(0.45, 0.95));
      }
    }
    if (sx > 1.4 && sz > 1.4) {
      let cnt = sx * sz / 10 * A[1]; cnt = Math.floor(cnt) + (DR() < cnt % 1 ? 1 : 0);
      for (let i = 0; i < cnt; i++) {
        const sw = drnd(1.0, Math.min(3.8, sx)), sd = drnd(1.0, Math.min(3.8, sz));
        decal(DR() < 0.25 ? 3 : 2, V3(drnd(x0 + sw / 2, x1 - sw / 2), y0, drnd(z0 + sd / 2, z1 - sd / 2)), VDOWN, VX, sd, sw, drnd(0.45, 0.9));
      }
    }
  }
  const box = (bn, x0, x1, y0, y1, z0, z1, tint, vary) => {
    const g = pushT(bn, UBOX.clone(),
      new THREE.Matrix4().makeScale(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)).setPosition((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), tint, vary);
    grimeBox(bn, x0, x1, y0, y1, z0, z1);
    return g;
  };
  const boxC = (bn, cx, cy, cz, sx, sy, sz, tint, vary, ry = 0) => {
    const m = new THREE.Matrix4().makeRotationY(ry).multiply(new THREE.Matrix4().makeScale(sx, sy, sz)).setPosition(cx, cy, cz);
    return pushT(bn, UBOX.clone(), m, tint, vary);
  };
  const beam = (bn, p0, p1, w, h, tint, vary, roll) => pushT(bn, UBOX.clone(), segMatrix(p0, p1, w, h, roll), tint, vary);
  const rod = (bn, p0, p1, r, seg = 8, tint, vary) => pushT(bn, unitCyl(seg).clone(), segMatrix(p0, p1, r, r), tint, vary);
  const cylY = (bn, cx, cz, y0, y1, r, seg = 24, tint, vary) => rod(bn, V3(cx, y0, cz), V3(cx, y1, cz), r, seg, tint, vary);
  const cylX = (bn, x0, x1, y, z, r, seg = 16, tint, vary) => rod(bn, V3(x0, y, z), V3(x1, y, z), r, seg, tint, vary);
  const cylZ = (bn, z0, z1, x, y, r, seg = 16, tint, vary) => rod(bn, V3(x, y, z0), V3(x, y, z1), r, seg, tint, vary);
  const sph = (bn, c, r, seg = 12, tint, sy = 1) => pushT(bn, unitSph(seg).clone(), new THREE.Matrix4().makeScale(r, r * sy, r).setPosition(c), tint);
  // torus ring; axis: 'x' | 'y' | 'z'; stretch: thickness multiplier along the axis
  function ring(bn, c, axis, Rr, r, tubSeg = 32, radSeg = 6, tint, stretch = 1) {
    const g = new THREE.TorusGeometry(Rr, r, radSeg, tubSeg);
    const m = new THREE.Matrix4();
    if (axis === 'y') m.makeRotationX(Math.PI / 2); else if (axis === 'x') m.makeRotationY(Math.PI / 2);
    m.multiply(new THREE.Matrix4().makeScale(1, 1, stretch));
    m.setPosition(c);
    return pushT(bn, g, m, tint);
  }
  // swept tube along points with parallel-transport frames; sw: optional per-point sway weight
  function sweepGeo(pts, r, rs = 8, sw = null, phase = 0, freq = 1) {
    const n = pts.length, pos = [], nor = [], idx = [], swa = [];
    const tans = pts.map((p, i) => V3().subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize());
    let N = Math.abs(tans[0].y) < 0.9 ? V3(0, 1, 0) : V3(1, 0, 0);
    N.sub(tans[0].clone().multiplyScalar(N.dot(tans[0]))).normalize();
    const q = new THREE.Quaternion(), B = V3(), d = V3();
    for (let i = 0; i < n; i++) {
      if (i > 0) { q.setFromUnitVectors(tans[i - 1], tans[i]); N.applyQuaternion(q); N.sub(tans[i].clone().multiplyScalar(N.dot(tans[i]))).normalize(); }
      B.crossVectors(tans[i], N);
      const rr = typeof r === 'function' ? r(i / (n - 1)) : r;
      for (let j = 0; j < rs; j++) {
        const a = j / rs * Math.PI * 2;
        d.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
        pos.push(pts[i].x + d.x * rr, pts[i].y + d.y * rr, pts[i].z + d.z * rr);
        nor.push(d.x, d.y, d.z);
        if (sw) swa.push(sw[i], phase, freq);
      }
    }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < rs; j++) {
      const a = i * rs + j, b = i * rs + (j + 1) % rs, c = (i + 1) * rs + j, e = (i + 1) * rs + (j + 1) % rs;
      idx.push(a, b, c, b, e, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    if (sw) g.setAttribute('aSway', new THREE.Float32BufferAttribute(swa, 3));
    g.setIndex(idx);
    return g;
  }
  // polyline with rounded corners -> dense points only in the bends
  function roundPath(pts, rad = 0.5, nArc = 6) {
    const out = [pts[0].clone()];
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i], a = V3().subVectors(pts[i - 1], p), b = V3().subVectors(pts[i + 1], p);
      const ra = Math.min(rad, a.length() * 0.45, b.length() * 0.45);
      a.normalize(); b.normalize();
      const s = p.clone().addScaledVector(a, ra), e = p.clone().addScaledVector(b, ra);
      for (let k = 0; k <= nArc; k++) {
        const t = k / nArc, u = 1 - t;
        out.push(V3(u * u * s.x + 2 * u * t * p.x + t * t * e.x, u * u * s.y + 2 * u * t * p.y + t * t * e.y, u * u * s.z + 2 * u * t * p.z + t * t * e.z));
      }
    }
    out.push(pts[pts.length - 1].clone());
    return out;
  }
  function pipe(bn, pts, r, opt = {}) {
    const rs = opt.rs ?? (r > 0.2 ? 14 : r > 0.09 ? 10 : 6);
    const path = roundPath(pts, opt.bend ?? Math.max(r * 2.2, 0.25), opt.nArc ?? 6);
    push(bn, sweepGeo(path, r, rs), opt.tint ?? [1, 1, 1], opt.vary ?? 0.12);
    // flanges at the ends + along straight runs
    if (opt.flanges !== false) {
      const fl = opt.flangeBn ?? 'steelS';
      const every = opt.every ?? 5.5;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], L = a.distanceTo(b);
        const dir = V3().subVectors(b, a).normalize();
        const cnt = Math.floor(L / every);
        for (let k = 1; k <= cnt; k++) {
          const c = a.clone().addScaledVector(dir, (k - 0.5) * (L / cnt) + rnd(-0.6, 0.6));
          rod(fl, c.clone().addScaledVector(dir, -0.045), c.clone().addScaledVector(dir, 0.045), r * 1.5 + 0.03, rs + 2);
          if (opt.valves && R() < opt.valves) valve(c.clone().addScaledVector(dir, 0.5), dir, r);
        }
      }
      for (const [p, q2] of [[pts[0], pts[1]], [pts[pts.length - 1], pts[pts.length - 2]]]) {
        if (opt.endFlange === false) break;
        const dir = V3().subVectors(q2, p).normalize();
        rod(fl, p.clone(), p.clone().addScaledVector(dir, 0.1), r * 1.55 + 0.03, rs + 2);
      }
    }
  }
  function valve(c, dir, r) {
    rod('paintS', c.clone().addScaledVector(dir, -r * 1.3), c.clone().addScaledVector(dir, r * 1.3), r * 1.35, 10, pick(TINT.machine));
    const up = Math.abs(dir.y) > 0.9 ? V3(1, 0, 0) : V3(0, -1, 0);
    const top = c.clone().addScaledVector(up, r * 1.4 + 0.25);
    rod('steelS', c, top, Math.max(0.035, r * 0.25), 6);
    const m = new THREE.Matrix4().makeBasis(dir.clone().cross(up).normalize(), dir.clone(), up.clone()).setPosition(top);
    pushT('rustS', new THREE.TorusGeometry(Math.max(0.14, r * 1.2), 0.025, 4, 14).applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2)), m, TINT.redwheel);
  }
  const catenary = (a, b, sag, n = 14) => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n; return V3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t), a.z + (b.z - a.z) * t);
  });
  function hoseLoop(a, b, sag, r = 0.05, swayAmp = 0.08) {
    const pts = catenary(a, b, sag, 14);
    const w = pts.map((_, i) => Math.sin(Math.PI * i / 14) * swayAmp * (0.5 + sag));
    push('sway', sweepGeo(pts, r, 6, w, rnd(0, 6.28), rnd(0.7, 1.4)), [1, 1, 1], 0.2);
  }
  function dangle(a, len, r = 0.03, swayAmp = 0.1, plug = true) {
    const n = 10, pts = [], w = [];
    const kink = V3(rnd(-0.15, 0.15), 0, rnd(-0.15, 0.15));
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push(V3(a.x + kink.x * t * t, a.y - len * t, a.z + kink.z * t * t)); w.push(Math.pow(t, 1.5) * swayAmp * len); }
    const ph = rnd(0, 6.28), fr = rnd(0.8, 1.6) / Math.sqrt(Math.max(0.6, len));
    push('sway', sweepGeo(pts, r, 5, w, ph, fr), [1, 1, 1], 0.2);
    if (plug) {
      const e = pts[n];
      const g = unitCyl(6).clone().applyMatrix4(new THREE.Matrix4().makeScale(r * 2.4, 0.16, r * 2.4).setPosition(e.x, e.y - 0.06, e.z));
      const sw = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < sw.length; i += 3) { sw[i] = w[n]; sw[i + 1] = ph; sw[i + 2] = fr; }
      g.setAttribute('aSway', new THREE.BufferAttribute(sw, 3));
      push('sway', g, [1.6, 1.5, 1.3]);
    }
  }

  const TINT = {
    concrete: [[0.95, 0.95, 0.97], [0.86, 0.87, 0.88], [1.02, 1.0, 0.97], [0.8, 0.82, 0.83]],
    steel: [1, 1, 1],
    machine: [[0.62, 0.68, 0.6], [0.55, 0.6, 0.66], [0.82, 0.68, 0.44], [0.66, 0.4, 0.29], [0.78, 0.79, 0.76], [0.5, 0.56, 0.5]],
    cabin: [[0.78, 0.8, 0.76], [0.66, 0.72, 0.66], [0.6, 0.66, 0.72], [0.82, 0.74, 0.58]],
    rail: [[0.85, 0.72, 0.42], [0.7, 0.72, 0.7], [0.9, 0.9, 0.88]],
    redwheel: [0.75, 0.2, 0.12],
  };
  const HOT = [2.4, 1.1, 0.32];
  const lampCol = (k = 1) => HOT.map((v) => v * k);

  // ---- lamp unit: bulkhead lamp with cage, light pointing along `dir` (default down)
  let lampSeq = 0;
  // round 2: the small bulkhead fittings are mostly dead glass (a few dim pilots); the visible pools come from
  // the big practicals below (flood / cageLamp / tubeLamp), ~20 over the whole belly.
  function lamp(p, dir = V3(0, -1, 0)) {
    const sq = lampSeq++;
    const q = new THREE.Quaternion().setFromUnitVectors(V3(0, -1, 0), dir.clone().normalize());
    const m = new THREE.Matrix4().compose(p, q, V3(1.6, 1.6, 1.6));
    const pilot = sq % 5 === 1;
    pushT('steelS', unitCyl(10).clone().applyMatrix4(new THREE.Matrix4().makeScale(0.17, 0.09, 0.17).setPosition(0, 0.05, 0)), m);
    if (pilot) pushT('emis', unitSph(8).clone().applyMatrix4(new THREE.Matrix4().makeScale(0.13, 0.17, 0.13).setPosition(0, -0.12, 0)), m, [1.9, 0.82, 0.23], 0);
    else pushT('glass', unitSph(8).clone().applyMatrix4(new THREE.Matrix4().makeScale(0.13, 0.17, 0.13).setPosition(0, -0.12, 0)), m, [1.3, 1.2, 1.0], 0.2);
    pushT('steelS', new THREE.TorusGeometry(0.17, 0.014, 3, 12).applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(0, -0.12, 0)), m);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      pushT('steelS', unitCyl(3).clone().applyMatrix4(new THREE.Matrix4().makeScale(0.012, 0.3, 0.012).setPosition(Math.cos(a) * 0.17, -0.12, Math.sin(a) * 0.17)), m);
    }
    if (pilot) addLight(p.clone().addScaledVector(dir, 0.3), 0.75, 6.5, 0.8);
  }
  const REAL_PL = [];
  // floodlight on a bracket: boxy head with fins, warm lens, spot pool along `dir`
  function flood(p, dir, o = {}) {
    dir = dir.clone().normalize();
    if (o.from) { rod('steelS', o.from, p, 0.04, 5); boxC('steelS', o.from.x, o.from.y, o.from.z, 0.24, 0.24, 0.24); }
    const a = p.clone().addScaledVector(dir, -0.2), b = p.clone().addScaledVector(dir, 0.2);
    beam('paintS', a, b, 0.6, 0.44, [0.42, 0.44, 0.42], 0.05);
    for (let i = 0; i < 3; i++) { const c = p.clone().addScaledVector(dir, -0.25 - i * 0.06); beam('steelS', c, c.clone().addScaledVector(dir, 0.025), 0.54, 0.38); }
    beam('steelS', b, b.clone().addScaledVector(dir, 0.1), 0.66, 0.5);                      // hood frame
    beam(o.flick ? 'emisF' : 'emis', b.clone().addScaledVector(dir, 0.1), b.clone().addScaledVector(dir, 0.115), 0.5, 0.34, lampCol(o.e ?? 0.85), 0);
    const lp = p.clone().addScaledVector(dir, 0.5);
    if (o.real) REAL_PL.push(lp.clone());
    return addLight(lp, o.k ?? 2.6, o.r ?? 18, 5, o.col ?? [1.0, 0.5, 0.17], { dir, cone: o.cone ?? 0.3, solo: true, flick: !!o.flick });
  }
  // big caged well-glass lamp on a stem (omni pool)
  function cageLamp(p, o = {}) {
    const sc = o.s ?? 1;
    if (o.from) rod('steelS', o.from, p.clone().add(V3(0, 0.1 * sc, 0)), 0.035, 5);
    const m = new THREE.Matrix4().makeScale(sc, sc, sc).setPosition(p);
    pushT('steelS', unitCyl(12).clone().applyMatrix4(new THREE.Matrix4().makeScale(0.3, 0.16, 0.3).setPosition(0, 0.05, 0)), m);
    pushT('steelS', unitCyl(12).clone().applyMatrix4(new THREE.Matrix4().makeScale(0.5, 0.025, 0.5).setPosition(0, 0.0, 0)), m);   // shade plate
    pushT(o.flick ? 'emisF' : 'emis', unitSph(10).clone().applyMatrix4(new THREE.Matrix4().makeScale(0.2, 0.27, 0.2).setPosition(0, -0.25, 0)), m, lampCol(o.e ?? 0.9), 0);
    for (const yy of [-0.16, -0.36]) pushT('steelS', new THREE.TorusGeometry(0.25, 0.016, 3, 14).applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(0, yy, 0)), m);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      pushT('steelS', unitCyl(3).clone().applyMatrix4(new THREE.Matrix4().makeScale(0.014, 0.56, 0.014).setPosition(Math.cos(a) * 0.25, -0.26, Math.sin(a) * 0.25)), m);
    }
    const lp = p.clone().add(V3(0, -0.45 * sc, 0));
    if (o.real) REAL_PL.push(lp.clone());
    return addLight(lp, o.k ?? 1.7, o.r ?? 11, 5, o.col ?? [1.0, 0.47, 0.15], { solo: true, flick: !!o.flick });
  }
  // twin fluorescent tube fitting (cooler light, optional flicker)
  function tubeLamp(p, ax, len = 1.5, o = {}) {
    ax = ax.clone().normalize();
    const a = p.clone().addScaledVector(ax, -len / 2), b = p.clone().addScaledVector(ax, len / 2);
    const side = V3(-ax.z, 0, ax.x);
    beam('paintS', a.clone().add(V3(0, 0.06, 0)), b.clone().add(V3(0, 0.06, 0)), 0.26, 0.08, [0.8, 0.82, 0.8]);
    for (const e of [a, b]) rod('steelS', e.clone().add(V3(0, 0.06, 0)), e.clone().add(V3(0, 0.06 + (o.drop ?? 0.4), 0)), 0.018, 4);
    for (const d of [-0.07, 0.07]) rod(o.flick ? 'emisF' : 'emis', a.clone().addScaledVector(side, d).addScaledVector(ax, 0.06), b.clone().addScaledVector(side, d).addScaledVector(ax, -0.06), 0.024, 6, o.ecol ?? [0.85, 1.2, 1.35], 0);
    return addLight(p.clone().add(V3(0, -0.3, 0)), o.k ?? 1.25, o.r ?? 9, 5, o.col ?? [0.5, 0.78, 0.95], { solo: true, flick: !!o.flick });
  }
  function pendant(x, yTop, z, drop = 0.4, k = 1, lightK = 1, lightR = 7.5, prio = 1) {
    rod('steelS', V3(x, yTop, z), V3(x, yTop - drop, z), 0.025, 4);
    lamp(V3(x, yTop - drop - 0.05, z), V3(0, -1, 0), k, lightK, lightR, prio);
  }

  // ---- railings / catwalks / ladders / stairs
  function railing(a, b, h = 1.05, tint) {
    tint = tint ?? TINT.rail[0];
    const L = a.distanceTo(b); const n = Math.max(1, Math.round(L / 1.5));
    for (let i = 0; i <= n; i++) { const p = a.clone().lerp(b, i / n); boxC('rustS', p.x, p.y + h / 2, p.z, 0.05, h, 0.05, tint, 0.15); }
    const up = V3(0, h, 0), mid = V3(0, h * 0.5, 0);
    rod('rustS', a.clone().add(up), b.clone().add(up), 0.028, 6, tint, 0.1);
    rod('rustS', a.clone().add(mid), b.clone().add(mid), 0.02, 5, tint, 0.1);
    beam('rustS', a.clone().add(V3(0, 0.07, 0)), b.clone().add(V3(0, 0.07, 0)), 0.012, 0.14, tint, 0.1);
  }
  // straight catwalk from a to b (same y), width w; rails: [left, right]; hang: y to hang from (or null)
  function catwalk(a, b, w = 1.1, rails = [true, true], hangY = null, hangEvery = 2.75) {
    const dir = V3().subVectors(b, a); const L = dir.length(); dir.normalize();
    const side = V3(-dir.z, 0, dir.x);
    const ang = Math.atan2(dir.z, dir.x);
    const c = a.clone().lerp(b, 0.5);
    const fg = new THREE.PlaneGeometry(L, w).applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
      .applyMatrix4(new THREE.Matrix4().makeRotationY(-ang)).applyMatrix4(new THREE.Matrix4().makeTranslation(c.x, c.y, c.z));
    push('grate', fg, [1, 1, 1], 0.1);
    for (const s of [-1, 1]) {
      const o = side.clone().multiplyScalar(s * w / 2);
      beam('steelS', a.clone().add(o).add(V3(0, -0.09, 0)), b.clone().add(o).add(V3(0, -0.09, 0)), 0.06, 0.2);
      if (rails[s < 0 ? 0 : 1]) railing(a.clone().add(o), b.clone().add(o));
    }
    // cross members under the grating
    const nX = Math.max(1, Math.round(L / 1.2));
    for (let i = 0; i <= nX; i++) {
      const p = a.clone().lerp(b, i / nX).add(V3(0, -0.14, 0));
      beam('steelS', p.clone().addScaledVector(side, -w / 2), p.clone().addScaledVector(side, w / 2), 0.05, 0.08);
    }
    if (hangY !== null) {
      const nH = Math.max(1, Math.round(L / hangEvery));
      for (let i = 0; i <= nH; i++) {
        const p = a.clone().lerp(b, i / nH);
        for (const s of [-1, 1]) {
          const q2 = p.clone().addScaledVector(side, s * (w / 2 + 0.03));
          rod('steelS', q2.clone().add(V3(0, -0.1, 0)), V3(q2.x, hangY, q2.z), 0.022, 4);
        }
      }
    }
  }
  function ladder(x, z, y0, y1, faceZ = true, cage = false) {
    const o = faceZ ? V3(0.22, 0, 0) : V3(0, 0, 0.22);
    rod('rustS', V3(x, y0, z).sub(o), V3(x, y1, z).sub(o), 0.025, 5, TINT.rail[0]);
    rod('rustS', V3(x, y0, z).add(o), V3(x, y1, z).add(o), 0.025, 5, TINT.rail[0]);
    for (let y = Math.min(y0, y1) + 0.15; y < Math.max(y0, y1); y += 0.3) rod('rustS', V3(x, y, z).sub(o), V3(x, y, z).add(o), 0.016, 4, TINT.rail[0]);
    if (cage) for (let y = Math.min(y0, y1) + 0.6; y < Math.max(y0, y1) - 0.3; y += 0.75) {
      ring('rustS', V3(x + (faceZ ? 0 : 0.35), y, z + (faceZ ? 0.35 : 0)), 'y', 0.38, 0.015, 12, 3, TINT.rail[0]);
    }
  }
  function stairs(a, b, w = 0.8) { // from a (low) to b (high) – treads perpendicular to horizontal dir
    const hor = V3(b.x - a.x, 0, b.z - a.z); const hl = hor.length(); hor.normalize();
    const side = V3(-hor.z, 0, hor.x);
    for (const s of [-1, 1]) {
      const o = side.clone().multiplyScalar(s * w / 2);
      beam('steelS', a.clone().add(o), b.clone().add(o), 0.05, 0.22, [1, 1, 1], 0.1, 0);
      railing2(a.clone().add(o), b.clone().add(o));
    }
    const n = Math.max(2, Math.round((b.y - a.y) / 0.2));
    for (let i = 1; i < n; i++) {
      const p = a.clone().lerp(b, i / n);
      boxC('steelS', p.x, p.y, p.z, Math.abs(hor.x) * 0.25 + Math.abs(side.x) * w, 0.04, Math.abs(hor.z) * 0.25 + Math.abs(side.z) * w);
    }
    void hl;
  }
  function railing2(a, b) { // sloped rail along a stair stringer
    const up = V3(0, 0.95, 0);
    rod('rustS', a.clone().add(up), b.clone().add(up), 0.025, 5, TINT.rail[0]);
    rod('rustS', a, a.clone().add(up), 0.022, 4, TINT.rail[0]);
    rod('rustS', b, b.clone().add(up), 0.022, 4, TINT.rail[0]);
    rod('rustS', a.clone().lerp(b, 0.5), a.clone().lerp(b, 0.5).add(up), 0.022, 4, TINT.rail[0]);
  }
  function sign(cell, c, normal, w, h) {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv; const cu = (cell % 2) * 0.5, cv = 0.75 - Math.floor(cell / 2) * 0.25;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, cu + uv.getX(i) * 0.5, cv + uv.getY(i) * 0.25);
    const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), normal.clone().normalize());
    pushT('signs', g, new THREE.Matrix4().compose(c.clone().addScaledVector(normal, 0.02), q, V3(1, 1, 1)), [0.8, 0.8, 0.8], 0.1);
  }
  function junction(c, faceN, s = 1) { // electrical box on a surface
    const n = faceN.clone().normalize();
    const w = 0.45 * s, h = 0.6 * s, d = 0.22 * s;
    const ang = Math.atan2(n.x, n.z);
    boxC('paintS', c.x + n.x * d / 2, c.y, c.z + n.z * d / 2, Math.abs(n.z) > 0.5 ? w : d, h, Math.abs(n.z) > 0.5 ? d : w, pick(TINT.cabin), 0.1);
    void ang;
    rod('steelS', V3(c.x + n.x * 0.12, c.y + h / 2, c.z + n.z * 0.12), V3(c.x + n.x * 0.12, c.y + h / 2 + rnd(0.4, 1.2), c.z + n.z * 0.12), 0.03, 5);
  }

  // ---- windowed cabin slung under the structure
  // doorFace: 'px'|'nx'|'pz'|'nz'
  function cabin(cx, cz, yTop, sx, sy, sz, opt = {}) {
    const y0 = yTop - sy, tint = opt.tint ?? pick(TINT.cabin);
    box('paint', cx - sx / 2, cx + sx / 2, y0, yTop - 0.12, cz - sz / 2, cz + sz / 2, tint, 0.05);
    // roof slab with overhang, floor frame
    box('steel', cx - sx / 2 - 0.15, cx + sx / 2 + 0.15, yTop - 0.12, yTop, cz - sz / 2 - 0.15, cz + sz / 2 + 0.15);
    box('steel', cx - sx / 2 - 0.08, cx + sx / 2 + 0.08, y0 - 0.16, y0, cz - sz / 2 - 0.08, cz + sz / 2 + 0.08);
    for (const fx of [-1, 1]) box('steelS', cx + fx * sx * 0.3 - 0.08, cx + fx * sx * 0.3 + 0.08, y0 - 0.34, y0 - 0.16, cz - sz / 2 - 0.25, cz + sz / 2 + 0.25);
    // corrugation ribs on walls
    for (let x = cx - sx / 2 + 0.2; x < cx + sx / 2 - 0.1; x += 0.32) for (const fz of [-1, 1]) box('paintS', x - 0.03, x + 0.03, y0 + 0.05, yTop - 0.15, cz + fz * sz / 2 - 0.02, cz + fz * (sz / 2 + 0.04), tint, 0.04);
    // windows
    const faces = opt.windows ?? ['pz', 'nz', 'px', 'nx'];
    const winY0 = y0 + sy * 0.42, winY1 = yTop - 0.4;
    let lit = 0;
    for (const f of faces) {
      const alongX = f === 'pz' || f === 'nz';
      const len = alongX ? sx : sz, nW = Math.max(1, Math.floor((len - 0.6) / 1.05));
      const sgn = f[0] === 'p' ? 1 : -1;
      for (let i = 0; i < nW; i++) {
        if (f === opt.door && i === 0) continue;
        const u = -len / 2 + 0.3 + (i + 0.5) * ((len - 0.6) / nW);
        const ww = Math.min(0.85, (len - 0.6) / nW - 0.18);
        const on = R() < (opt.litP ?? 0.72);
        const kk = on ? pick([0.8, 0.68, 0.58, 0.5, 0.4]) : 0;
        const px = alongX ? cx + u : cx + sgn * (sx / 2 + 0.05);
        const pz = alongX ? cz + sgn * (sz / 2 + 0.05) : cz + u;
        const gx = alongX ? ww : 0.02, gz = alongX ? 0.02 : ww;
        if (on) { box('emis', px - gx / 2, px + gx / 2, winY0, winY1, pz - gz / 2, pz + gz / 2, [2.4 * kk, 0.92 * kk, 0.22 * kk], 0); lit++; } else box('glass', px - gx / 2, px + gx / 2, winY0, winY1, pz - gz / 2, pz + gz / 2, [1, 1, 1], 0.3);
        // frame + mullion
        const fx2 = alongX ? ww + 0.12 : 0.06, fz2 = alongX ? 0.06 : ww + 0.12;
        box('steelS', px - fx2 / 2, px + fx2 / 2, winY0 - 0.07, winY0, pz - fz2 / 2, pz + fz2 / 2);
        box('steelS', px - fx2 / 2, px + fx2 / 2, winY1, winY1 + 0.06, pz - fz2 / 2, pz + fz2 / 2);
        box('steelS', px - (alongX ? 0.025 : 0.035), px + (alongX ? 0.025 : 0.035), winY0, winY1, pz - (alongX ? 0.035 : 0.025), pz + (alongX ? 0.035 : 0.025));
        if (on) addLight(V3(px + (alongX ? 0 : sgn * 0.8), (winY0 + winY1) / 2, pz + (alongX ? sgn * 0.8 : 0)), 0.55 * kk, 5.5, 0.6, [1.0, 0.45, 0.13]);
      }
    }
    // door
    if (opt.door) {
      const f = opt.door, alongX = f === 'pz' || f === 'nz', sgn = f[0] === 'p' ? 1 : -1, len = alongX ? sx : sz;
      const u = -len / 2 + 0.3 + 0.45;
      const px = alongX ? cx + u : cx + sgn * (sx / 2 + 0.03), pz = alongX ? cz + sgn * (sz / 2 + 0.03) : cz + u;
      box('steel', px - (alongX ? 0.42 : 0.04), px + (alongX ? 0.42 : 0.04), y0 + 0.02, y0 + 1.95, pz - (alongX ? 0.04 : 0.42), pz + (alongX ? 0.04 : 0.42), [0.7, 0.75, 0.7]);
      lamp(V3(px + (alongX ? 0 : sgn * 0.2), y0 + 2.12, pz + (alongX ? sgn * 0.2 : 0)), V3(alongX ? 0 : sgn, -1.2, alongX ? sgn : 0).normalize(), 1.0, 0.9, 6.5, 1.3);
      sign(2, V3(px + (alongX ? 0.75 : sgn * 0.03), y0 + 1.6, pz + (alongX ? sgn * 0.03 : 0.75)), V3(alongX ? 0 : sgn, 0, alongX ? sgn : 0), 0.42, 0.21);
    }
    // AC unit / vent box
    if (opt.ac !== false) {
      const f = R() < 0.5 ? 1 : -1;
      box('paintS', cx + f * sx / 2, cx + f * (sx / 2 + 0.45), y0 + 0.4, y0 + 1.0, cz - 0.4, cz + 0.4, [0.75, 0.76, 0.73]);
      ring('steelS', V3(cx + f * (sx / 2 + 0.46), y0 + 0.7, cz), 'x', 0.2, 0.02, 12, 3);
    }
    // hangers to structure above
    if (opt.hangTo !== undefined) for (const ex of [-1, 1]) for (const ez of [-1, 1])
      rod('steelS', V3(cx + ex * (sx / 2 + 0.05), yTop, cz + ez * (sz / 2 + 0.05)), V3(cx + ex * (sx / 2 + 0.05), opt.hangTo, cz + ez * (sz / 2 + 0.05)), 0.04, 5);
    // underside clutter: drain + dangling cable
    rod('steelS', V3(cx + sx * 0.3, y0 - 0.16, cz), V3(cx + sx * 0.3, y0 - 0.55, cz), 0.04, 6);
    dangle(V3(cx - sx * 0.25, y0 - 0.2, cz + sz * 0.2), rnd(0.5, 1.6), 0.025);
    return lit;
  }

  // =================================================================== 1. CONCRETE TRANSFER SLAB
  {
    const xs = [-45]; for (const hx of LEGX) xs.push(hx - 3.4, hx + 3.4); xs.push(45);
    for (let i = 0; i < xs.length - 1; i++) {
      if (i % 2 === 1) {   // hip bay: ~1 m recess around the hip (thigh fork clearance at extreme yaw)
        box('concrete', xs[i], xs[i + 1], -0.8, -0.25, -5.4, 5.4, TINT.concrete[0], 0.03);
        box('concrete', xs[i], xs[i + 1], -0.25, 0, -6.4, 6.4, TINT.concrete[0], 0.03);
      } else box('concrete', xs[i], xs[i + 1], -0.8, 0, -8.0, 8.0, TINT.concrete[0], 0.03);
    }
    // downstand beams on every bay line, with haunches
    for (const L of LINES) {
      const ze = isHipLine(L) ? 4.9 : 7.0;
      const x0 = Math.max(-45, L - 0.45), x1 = Math.min(45, L + 0.45);
      box('concrete', x0, x1, -2.2, -0.8, -ze, ze, pick(TINT.concrete), 0.05);
      box('concrete', Math.max(-45, L - 0.9), Math.min(45, L + 0.9), -1.15, -0.8, -ze, ze, pick(TINT.concrete), 0.05);
    }
    // stepped coffers per bay
    for (let i = 0; i < 16; i++) {
      const x0 = LINES[i] + 0.45, x1 = LINES[i + 1] - 0.45;
      const nearHip = isHipLine(LINES[i]) || isHipLine(LINES[i + 1]);
      const ze = nearHip ? 4.9 : 6.6;
      const kind = (i * 7 + 3) % 3;
      const t = pick(TINT.concrete);
      if (kind === 0) {
        box('concrete', x0, x1, -1.6, -0.8, -ze, ze, t, 0.05);
        box('concrete', x0 + 0.7, x1 - 0.7, -2.15, -1.6, -ze + 1.4, ze - 1.4, pick(TINT.concrete), 0.05);
      } else if (kind === 1) {
        box('concrete', x0, x1, -1.7, -0.8, 1.0, ze, t, 0.05);
        box('concrete', x0, x1, -1.7, -0.8, -ze, -1.0, t, 0.05);
        box('concrete', x0 + 0.5, x1 - 0.5, -2.1, -1.7, 3.0, ze - 0.5, pick(TINT.concrete), 0.05);
        box('concrete', x0 + 0.5, x1 - 0.5, -2.1, -1.7, -ze + 0.5, -3.0, pick(TINT.concrete), 0.05);
      } else {
        box('concrete', x0, x1, -1.35, -0.8, -ze, ze, t, 0.05);
        for (const s of [1, -1]) box('concrete', x0 + 0.3, x1 - 0.3, -2.05, -1.35, s > 0 ? 2.9 : -4.7, s > 0 ? 4.7 : -2.9, pick(TINT.concrete), 0.05);
      }
    }
    // edge beams (interrupted at hip bays) with a lip
    for (const [a, b] of EDGE_SEGS) for (const s of [1, -1]) {
      const za = s > 0 ? 7.0 : -8.0, zb = s > 0 ? 8.0 : -7.0;
      box('concrete', a, b, -2.0, -0.8, za, zb, pick(TINT.concrete), 0.04);
      box('concrete', a, b, -2.3, -2.0, s > 0 ? 7.55 : -8.0, s > 0 ? 8.0 : -7.55, pick(TINT.concrete), 0.04);
    }
    // deep concrete piers on the hip lines (carry the hip transverse girders)
    for (const hx of LEGX) {
      box('concrete', hx - 1.6, hx + 1.6, -2.9, -0.8, -1.7, 1.7, pick(TINT.concrete), 0.04);
      box('concrete', hx - 0.85, hx + 0.85, -3.5, -2.9, -1.2, 1.2, pick(TINT.concrete), 0.04);
      box('concrete', hx - 2.4, hx + 2.4, -1.5, -0.8, -2.0, 2.0, pick(TINT.concrete), 0.04);
    }
    // end beams
    for (const s of [1, -1]) box('concrete', s > 0 ? 44.0 : -45.0, s > 0 ? 45.0 : -44.0, -2.1, -0.8, -8.0, 8.0, TINT.concrete[1], 0.03);
  }

  // =================================================================== 2. STEEL SPACE FRAME
  {
    // outer trusses
    for (const s of [1, -1]) {
      const z = s * 5.6;
      for (const [ta, tb] of BAY_SEGS) {   // interrupted at the hip bays (recess)
        box('steel', ta, tb, -2.05, -1.7, z - 0.22, z + 0.22);
        box('steel', ta, tb, -4.42, -4.12, z - 0.3, z + 0.3);
        box('steel', ta, tb, -4.12, -3.85, z - 0.05, z + 0.05);
      }
      for (let i = 0; i < LINES.length; i++) {
        const L = LINES[i];
        if (!isHipLine(L)) {
          beam('steel', V3(L, -4.12, z), V3(L, -2.05, z), 0.32, 0.32);
          for (const zz of [z - 0.24, z + 0.24]) boxC('steelS', L, -2.4, zz, 1.0, 0.6, 0.04);
          for (const zz of [z - 0.33, z + 0.33]) boxC('steelS', L, -3.85, zz, 1.0, 0.55, 0.04);
        }
        if (i < LINES.length - 1) {
          const L2 = LINES[i + 1];
          const up = i % 2 === 0;
          beam('rust', V3(isHipLine(L) ? L + 3.7 : L + 0.2, up ? -4.1 : -2.1, z), V3(isHipLine(L2) ? L2 - 3.7 : L2 - 0.2, up ? -2.1 : -4.1, z), 0.22, 0.2, [0.9, 0.9, 0.9], 0.1);
          // bolt rows on chords (tiny)
        }
      }
    }
    // spine box girders (interrupted at the drums)
    const spineSegs = [[-44, -25.3], [-18.7, -4.9], [4.9, 18.7], [25.3, 44]];
    for (const s of [1, -1]) {
      const z = s * 2.2;
      for (const [a, b] of spineSegs) {
        box('steel', a, b, -3.6, -1.7, z - 0.42, z + 0.42);
        box('steel', a, b, -3.76, -3.6, z - 0.62, z + 0.62);
        for (let x = a + 0.55; x < b - 0.3; x += 1.1) for (const f of [-1, 1]) box('steelS', x - 0.03, x + 0.03, -3.58, -1.75, z + f * 0.42, z + f * 0.58);
      }
    }
    // cross beams on bay lines
    for (const L of LINES) {
      const hip = isHipLine(L);
      const drum = DRUMS.find((d) => Math.abs(d.x - L) < 0.01);
      const ze = hip ? 4.9 : 7.0;
      const spans = drum ? [[drum.r + 0.85, ze], [-ze, -(drum.r + 0.85)]] : [[-ze, ze]];
      for (const [za, zb] of spans) {
        if (hip) {
          box('steel', L - 0.55, L + 0.55, -4.1, -2.2, za, zb);
          box('steel', L - 0.75, L + 0.75, -4.25, -4.1, za, zb);
          for (let z = za + 0.6; z < zb - 0.2; z += 1.2) for (const f of [-1, 1]) box('steelS', L + f * 0.55, L + f * 0.62, -4.05, -2.25, z - 0.03, z + 0.03);
        } else {
          const xL = Math.max(-44.7, Math.min(44.7, L));
          box('steel', xL - 0.3, xL + 0.3, -2.3, -2.2, za, zb);
          box('steel', xL - 0.035, xL + 0.035, -3.7, -2.3, za, zb);
          box('steel', xL - 0.3, xL + 0.3, -3.8, -3.7, za, zb);
          for (let z = za + 0.7; z < zb - 0.2; z += 1.4) for (const f of [-1, 1]) box('steelS', xL + f * 0.035, xL + f * 0.27, -3.7, -2.3, z - 0.02, z + 0.02);
        }
      }
    }
    // ring girders around the drums
    for (const d of DRUMS) {
      const Rg = d.r + 0.85, n = 16;
      for (let i = 0; i < n; i++) {
        const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
        beam('steel', V3(d.x + Math.cos(a0) * Rg, -2.6, Math.sin(a0) * Rg), V3(d.x + Math.cos(a1) * Rg, -2.6, Math.sin(a1) * Rg), 0.45, 0.8);
      }
      // radial struts from ring to spine ends
      for (const s of [1, -1]) for (const f of [-1, 1]) beam('rust', V3(d.x + f * Rg * 0.7, -2.9, s * Rg * 0.72), V3(d.x + f * (Rg + 1.6), -3.2, s * 2.2), 0.3, 0.3);
    }
    // bottom X-bracing between trusses and spines
    for (let i = 0; i < 16; i++) {
      const x0 = LINES[i] + 0.3, x1 = LINES[i + 1] - 0.3;
      const xm = (x0 + x1) / 2;
      if (DRUMS.some((d) => Math.abs(d.x - xm) < d.r + 3.5)) continue;
      for (const s of [1, -1]) {
        const zo = isHipLine(LINES[i]) || isHipLine(LINES[i + 1]) ? 4.55 : 5.4;
        rod('rustS', V3(x0, -4.15, s * zo), V3(x1, -3.55, s * 2.6), 0.07, 6);
        rod('rustS', V3(x0, -3.55, s * 2.6), V3(x1, -4.15, s * zo), 0.07, 6);
        boxC('steelS', xm, -3.85, s * 4.0, 0.5, 0.06, 0.5);
      }
    }
  }

  // =================================================================== 3. HIP MOUNTING BAYS (yokes)
  {
    for (const hx of LEGX) for (const s of [1, -1]) {
      // cheek plates (extruded trapezoids), clear of the 3.2 m hip sphere
      const sh = new THREE.Shape();
      const P = [[5.0, -0.8], [10.0, -0.8], [11.3, -1.9], [11.3, -3.6], [10.3, -5.5], [7.6, -6.3], [5.0, -4.8]];
      P.forEach(([u, v], i) => (i ? sh.lineTo(u * s, v) : sh.moveTo(u * s, v)));
      sh.closePath();
      const eg = new THREE.ExtrudeGeometry(sh, { depth: 0.7, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.05, bevelSegments: 1, curveSegments: 1 });
      for (const dx of [-1, 1]) {
        const ox = dx > 0 ? hx + 4.1 : hx - 3.4;
        const m = new THREE.Matrix4().makeBasis(V3(0, 0, 1), V3(0, 1, 0), V3(-1, 0, 0)).setPosition(ox, 0, 0);
        pushT('paint', eg.clone(), m, [0.46, 0.47, 0.44], 0.06);
        // boss + bolt circle on outer face
        const xo = hx + dx * 4.1;
        cylX('steel', xo, xo + dx * 0.75, HY, s * HZ, 1.75, 32);
        cylX('steel', xo + dx * 0.75, xo + dx * 1.1, HY, s * HZ, 1.05, 24);
        ring('steelS', V3(xo + dx * 0.76, HY, s * HZ), 'x', 1.42, 0.07, 28, 4);
        for (let k = 0; k < 12; k++) {
          const a = k / 12 * Math.PI * 2;
          cylX('steelS', xo + dx * 0.75, xo + dx * 0.88, HY + Math.cos(a) * 1.42, s * HZ + Math.sin(a) * 1.42, 0.08, 6);
        }
        // stiffener ribs on outer face of the plate
        for (const [zz, y0, y1] of [[6.2, -5.4, -0.9], [11.0, -3.7, -1.9]]) box('steel', Math.min(xo, xo + dx * 0.35), Math.max(xo, xo + dx * 0.35), y0, y1, s * zz - 0.12, s * zz + 0.12);
        for (const [z0, z1, yy] of [[5.2, 10.0, -1.15], [5.4, 7.0, -4.3], [10.4, 11.2, -4.0]]) box('steel', Math.min(xo, xo + dx * 0.3), Math.max(xo, xo + dx * 0.3), yy - 0.1, yy + 0.1, Math.min(s * z0, s * z1), Math.max(s * z0, s * z1));
        for (let zz = 5.4; zz < 10.0; zz += 0.45) cylX('steelS', xo, xo + dx * 0.1, -0.98, s * zz, 0.05, 6);
        for (let yy = -1.5; yy > -4.4; yy -= 0.45) cylX('steelS', xo, xo + dx * 0.1, yy, s * 5.25, 0.05, 6);
        // hazard stripe plate along the lower edge
        sign(0, V3(xo + dx * 0.01, -5.65, s * 8.95), V3(dx, 0, 0), 2.6, 0.45);
        if (dx > 0) sign(hx > 0 ? 3 : 1, V3(xo + dx * 0.01, -1.6, s * 7.0), V3(dx, 0, 0), 0.8, 0.4);
        // work lamp on the cheek, pointing down/outward at the hip
        lamp(V3(hx + dx * 4.35, -5.8, s * 10.3), V3(dx * 0.3, -1, s * 0.5).normalize(), 1.1, 1.0, 8, 1.6);
      }
      // back wall + ribs + manifold
      // round 2: the bay wall sits 1 m further in (|z| 4.4..4.9) so the thigh fork never clips it at extreme yaw
      box('steel', hx - 3.4, hx + 3.4, -5.2, -0.8, s > 0 ? 4.4 : -4.9, s > 0 ? 4.9 : -4.4);
      for (const fx of [-2.4, -0.8, 0.8, 2.4]) box('steel', hx + fx - 0.09, hx + fx + 0.09, -5.0, -1.0, s > 0 ? 4.9 : -5.04, s > 0 ? 5.04 : -4.9);
      box('steel', hx - 3.4, hx + 3.4, -5.38, -5.2, s > 0 ? 4.3 : -5.08, s > 0 ? 5.08 : -4.3);
      box('paint', hx - 1.2, hx + 1.2, -4.5, -3.3, s > 0 ? 4.9 : -5.0, s > 0 ? 5.0 : -4.9, [0.66, 0.4, 0.29], 0.08);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; cylZ('steelS', s * 5.0, s * 5.06, hx + Math.cos(a) * 1.0, -3.9 + Math.sin(a) * 0.5, 0.045, 6); }
      sign(4, V3(hx - 2.2, -1.7, s * 4.9), V3(0, 0, s), 1.3, 0.65);
      for (const fx of [-1.9, -0.3, 1.4, 2.9]) decal(fx > 1 ? 1 : 0, V3(hx + fx, -2.3, s * 4.9), V3(0, 0, s), VUP, fx > 1 ? 1.5 : 0.6, 2.8, 0.85);
      // big diagonal struts from cheek bottoms to the spine
      for (const dx of [-1, 1]) beam('steel', V3(hx + dx * 3.75, -5.7, s * 7.2), V3(hx + dx * 3.2, -3.5, s * 2.7), 0.5, 0.55);
      // hose bundles heading for the hip housing
      for (let k = 0; k < 3; k++) {
        const x = hx + (k - 1) * 0.5 + 2.2 * (k % 2 ? 1 : -1);
        hoseLoop(V3(hx + (k - 1) * 0.6, -4.9, s * 5.0), V3(x, -5.5, s * (8.7 + k * 0.3)), 0.9 + k * 0.25, 0.07, 0.06);
      }
      dangle(V3(hx + 3.0, -5.3, s * 5.0), rnd(1.2, 2.6), 0.03);
    }
  }

  // =================================================================== 4. MACHINERY
  const fanList = []; // {x,y,z,r,spd,ph}
  // ---- drums (reactor + secondary turbines)
  for (const d of DRUMS) {
    const Rr = d.r, yTop = -1.75, yBot = d.big ? -5.0 : -4.6, cx = d.x;
    const tint = d.big ? [0.6, 0.64, 0.6] : [0.66, 0.6, 0.5];
    cylY('steel', cx, 0, yTop - 0.4, yTop, Rr + 0.6, 48);
    cylY('paint', cx, 0, yBot, yTop - 0.4, Rr, 48, tint, 0.03);
    const nr = d.big ? 24 : 16;
    for (let i = 0; i < nr; i++) {
      const a = (i + 0.5) / nr * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      beam('steel', V3(cx + c * (Rr + 0.24), yBot + 0.05, sn * (Rr + 0.24)), V3(cx + c * (Rr + 0.24), yTop - 0.42, sn * (Rr + 0.24)), 0.14, 0.5, [1, 1, 1], 0.08, -a);
    }
    for (const y of [yTop - 0.75, (yTop + yBot) / 2, yBot + 0.3]) ring('rustS', V3(cx, y, 0), 'y', Rr + 0.03, 0.09, 64, 5);
    cylY('steel', cx, 0, yBot - 0.25, yBot, Rr + 0.2, 48);
    // radial ribs under the bottom plate
    for (let i = 0; i < nr / 2; i++) {
      const a = i / (nr / 2) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      const r0 = d.fan + 0.95, r1 = Rr + 0.1;
      beam('steel', V3(cx + c * r0, yBot - 0.38, sn * r0), V3(cx + c * r1, yBot - 0.38, sn * r1), 0.12, 0.26);
    }
    for (const rr of [Rr - 0.25, Rr * 0.78]) ring('steelS', V3(cx, yBot - 0.27, 0), 'y', rr, 0.05, 48, 4);
    // second step + shroud + fan + grille
    const r2 = d.fan + 0.9;
    cylY('paint', cx, 0, yBot - 1.0, yBot - 0.25, r2, 40, d.big ? [0.42, 0.45, 0.43] : [0.5, 0.45, 0.38], 0.04);
    ring('rustS', V3(cx, yBot - 0.45, 0), 'y', r2 + 0.02, 0.07, 48, 4);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      beam('steelS', V3(cx + Math.cos(a) * (r2 + 0.06), yBot - 0.95, Math.sin(a) * (r2 + 0.06)), V3(cx + Math.cos(a) * (r2 + 0.06), yBot - 0.3, Math.sin(a) * (r2 + 0.06)), 0.1, 0.14, [1, 1, 1], 0.05, -a);
    }
    for (const rr of [r2 - 0.25, d.fan + 0.45]) ring('steelS', V3(cx, yBot - 1.02, 0), 'y', rr, 0.045, 40, 4);
    ring('steel', V3(cx, yBot - 1.35, 0), 'y', d.fan + 0.14, 0.17, 48, 8, [1, 1, 1], 2.4);
    const gy = yBot - 1.72, fr = d.fan + 0.05;
    for (let k = -4; k <= 4; k++) {
      const off = k * fr / 4.6, half = Math.sqrt(Math.max(0, fr * fr - off * off));
      if (half < 0.1) continue;
      box('steelS', cx + off - 0.025, cx + off + 0.025, gy - 0.03, gy + 0.03, -half, half);
      box('steelS', cx - half, cx + half, gy - 0.07, gy - 0.01, off - 0.025, off + 0.025);
    }
    ring('steelS', V3(cx, gy, 0), 'y', fr, 0.05, 40, 4);
    cylY('steel', cx, 0, yBot - 1.9, yBot - 1.0, d.fan * 0.2, 16);
    sph('steelS', V3(cx, yBot - 1.9, 0), d.fan * 0.2, 12, [1, 1, 1], 0.6);
    fanList.push({ x: cx, y: yBot - 1.35, z: 0, r: d.fan * 0.97, spd: d.big ? 1.9 : 2.6, ph: rnd(0, 6) });
    // warm-lit intake behind the fan + rim lamps
    cylY('emis', cx, 0, yBot - 1.06, yBot - 1.02, d.fan - 0.05, 32, [0.2, 0.075, 0.02], 0);
    addLight(V3(cx, yBot - 1.8, 0), 1.0, 6.5, 1.5);
    const nRim = d.big ? 4 : 3;
    for (let k = 0; k < nRim; k++) {
      const a = (k + 0.5) / nRim * Math.PI * 2;
      lamp(V3(cx + Math.cos(a) * (d.fan + 0.42), yBot - 1.62, Math.sin(a) * (d.fan + 0.42)), V3(Math.cos(a) * 0.3, -1, Math.sin(a) * 0.3).normalize(), 0.9, 0.5, 5, 0.9);
    }
    // nozzles / inspection hatches on the drum wall
    for (let i = 0; i < (d.big ? 8 : 5); i++) {
      const a = rnd(0, Math.PI * 2), y = rnd(yBot + 0.6, yTop - 1.0);
      const c = Math.cos(a), sn = Math.sin(a);
      if (R() < 0.5) {
        const p0 = V3(cx + c * Rr, y, sn * Rr), p1 = V3(cx + c * (Rr + 0.55), y, sn * (Rr + 0.55));
        rod('steelS', p0, p1, rnd(0.12, 0.22), 10);
        rod('steelS', p1, p1.clone().add(V3(c * 0.08, 0, sn * 0.08)), 0.3, 12);
      } else {
        boxC('paintS', cx + c * (Rr + 0.05), y, sn * (Rr + 0.05), 0.75, 0.9, 0.75, tint, 0.05, -a);
      }
    }
    if (d.big) for (let k = 0; k < 4; k++) {
      const a = k / 4 * Math.PI * 2 + 0.4;
      lamp(V3(cx + Math.cos(a) * (Rr + 0.62), yBot - 0.1, Math.sin(a) * (Rr + 0.62)), V3(Math.cos(a) * 0.4, -1, Math.sin(a) * 0.4).normalize(), 1.0, 1.1, 8, 1.4);
    }
    else for (const s of [1, -1]) lamp(V3(cx, yBot - 0.15, s * (Rr + 0.5)), V3(0, -1, s * 0.4).normalize(), 1.0, 1.0, 7.5, 1.2);
    sign(1, V3(cx - Rr - 0.01, (yTop + yBot) / 2, 0), V3(-1, 0, 0), 0.9, 0.45);
  }
  // ---- ceiling lamps up in the concrete coffers (light the stepped slab like ref5)
  for (let i = 0; i < 16; i++) {
    const xm = (LINES[i] + LINES[i + 1]) / 2;
    for (const z of i % 2 ? [-1.0] : [1.0]) pendant(xm + rnd(-1, 1), -1.75, z * rnd(0.6, 1.6), 0.25, 1.05, 1.1, 8.5, 1.15);
  }
  // ---- catwalk ring around the reactor
  {
    const Rc = 5.25, n = 20, y = -5.3;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      const p0 = V3(Math.cos(a0) * Rc, y, Math.sin(a0) * Rc), p1 = V3(Math.cos(a1) * Rc, y, Math.sin(a1) * Rc);
      const gap = Math.abs(Math.sin((a0 + a1) / 2)) > 0.62 && Math.abs(Math.cos((a0 + a1) / 2)) < 0.8;
      catwalk(p0, p1, 1.0, [!gap, false], i % 2 ? null : -2.6, 10);
    }
  }
  // ---- gearboxes + motors flanking the reactor
  for (const f of [-1, 1]) {
    const x0 = f * 5.3, x1 = f * 8.3;
    const gt = [0.78, 0.64, 0.4];
    box('paint', Math.min(x0, x1), Math.max(x0, x1), -4.6, -2.2, -1.5, 1.5, gt, 0.04);
    box('steel', Math.min(x0, x1) - 0.1, Math.max(x0, x1) + 0.1, -2.35, -2.2, -1.65, 1.65);
    box('steel', Math.min(x0, x1) - 0.1, Math.max(x0, x1) + 0.1, -3.5, -3.38, -1.6, 1.6);
    for (let k = 0; k < 6; k++) { const x = f * (5.5 + k * 0.5); for (const s of [1, -1]) box('paintS', x - 0.04, x + 0.04, -4.5, -2.4, s * 1.5, s * 1.62, gt); }
    cylX('chrome', f * 4.0, f * 5.3, -3.4, 0, 0.28, 16);
    cylX('steel', f * 4.4, f * 4.65, -3.4, 0, 0.62, 20);
    for (const z of [-0.8, 0.8]) {
      const mt = [0.5, 0.58, 0.66];
      cylX('paint', f * 8.3, f * 9.8, -3.5, z, 0.62, 24, mt, 0.04);
      for (let k = 0; k < 7; k++) ring('paintS', V3(f * (8.45 + k * 0.2), -3.5, z), 'x', 0.63, 0.035, 20, 3, mt);
      cylX('steel', f * 9.8, f * 10.05, -3.5, z, 0.45, 20);
      box('paintS', f * 9.0 - 0.25, f * 9.0 + 0.25, -2.85, -2.6, z - 0.2, z + 0.2, [0.4, 0.42, 0.45]);
    }
    // oil cooler + piping up into the slab
    pipe('rust', [V3(f * 6.0, -4.6, 1.0), V3(f * 6.0, -5.1, 1.0), V3(f * 3.6, -5.1, 1.0)], 0.1, { flanges: false });
    pipe('steel', [V3(f * 7.6, -2.2, -1.1), V3(f * 7.6, -1.7, -1.1)], 0.2, {});
    pipe('rust', [V3(f * 7.0, -4.6, -0.9), V3(f * 7.0, -4.95, -0.9), V3(f * 9.6, -4.95, -0.9), V3(f * 9.6, -4.95, -1.6), V3(f * 9.6, -2.2, -1.6)], 0.08, { flanges: false });
    sign(3, V3(f * 8.31, -3.0, 0.9), V3(f, 0, 0), 0.5, 0.25);
    lamp(V3(f * 9.6, -4.25, 0), V3(0, -1, 0), 0.95, 0.9, 7, 1.2);
  }
  // ---- tanks (horizontal capsules) above the service catwalks
  for (const f of [-1, 1]) for (const s of [1, -1]) {
    const xa = f * 11.9, xb = f * 15.7, z = s * 3.55, y = -2.35, r = 0.55;
    const tt = pick([[0.78, 0.79, 0.76], [0.6, 0.66, 0.6], [0.82, 0.7, 0.48]]);
    cylX('paint', xa, xb, y, z, r, 24, tt, 0.03);
    sph('paint', V3(xa, y, z), r, 16, tt, 1); sph('paint', V3(xb, y, z), r, 16, tt, 1);
    for (const x of [xa + f * 0.7, xb - f * 0.7]) {
      ring('rustS', V3(x, y, z), 'x', r + 0.02, 0.06, 24, 4);
      box('steelS', x - 0.08, x + 0.08, y + r * 0.5, -1.75, z - 0.06, z + 0.06);
    }
    pipe('steelS', [V3((xa + xb) / 2, y - r, z), V3((xa + xb) / 2, y - r - 0.2, z), V3((xa + xb) / 2 + f * 0.8, y - r - 0.2, s * 2.75)], 0.06, { flanges: false });
    rod('steelS', V3(xa + f * 0.6, y - r, z), V3(xa + f * 0.6, y - r - 0.35, z), 0.05, 6);
    if (s > 0) sign(2, V3((xa + xb) / 2, y, z + r + 0.01), V3(0, 0, 1), 0.6, 0.3);
  }
  // ---- central-lane cabins
  for (const f of [-1, 1]) {
    const cx = f * 14.3;
    cabin(cx, 0, -1.75, 3.0, 2.55, 2.5, { door: 'pz', windows: ['pz', 'nz', 'px', 'nx'], ac: true, litP: 0.8 });
    // door platform to the service catwalk + short stair
    catwalk(V3(cx - 0.3, -4.3, 1.35), V3(cx - 0.3, -4.3, 2.75), 0.9, [true, true], null);
    stairs(V3(cx - 0.3, -5.3, 3.75), V3(cx - 0.3, -4.3, 2.75), 0.8);
  }
  // ---- compressors (vertical finned) at ±29.5
  for (const f of [-1, 1]) for (const z of [-0.9, 0.9]) {
    const cx = f * 29.6, ct = [0.55, 0.6, 0.55];
    cylY('paint', cx, z, -4.5, -2.2, 0.62, 24, ct, 0.04);
    for (let y = -4.35; y < -2.4; y += 0.17) ring('paintS', V3(cx, y, z), 'y', 0.64, 0.035, 20, 3, ct);
    cylY('steel', cx, z, -4.85, -4.5, 0.48, 20);
    sph('steel', V3(cx, -4.85, z), 0.48, 14, [1, 1, 1], 0.5);
    box('paint', cx - 0.45, cx + 0.45, -2.2, -1.72, z - 0.45, z + 0.45, [0.45, 0.47, 0.5]);
    pipe('rust', [V3(cx, -3.0, z + Math.sign(z) * 0.6), V3(cx, -3.0, Math.sign(z) * 2.0), V3(cx - f * 1.5, -3.0, Math.sign(z) * 2.0)], 0.12, { flanges: false });
  }
  for (const f of [-1, 1]) lamp(V3(f * 29.6, -4.6, 0), V3(0, -1, 0), 1.0, 1.0, 7.5, 1.2);
  // ---- electrical cabinets at ±35.8, vertical tanks + pumps at the ends
  for (const f of [-1, 1]) {
    const cx = f * 35.8;
    for (let k = 0; k < 3; k++) {
      const z0 = -1.6 + k * 1.07;
      box('paint', cx - 0.55, cx + 0.55, -4.0, -2.2, z0 + 0.03, z0 + 1.04, pick(TINT.cabin), 0.05);
      box('steelS', cx - f * 0.57, cx - f * 0.6, -3.85, -2.35, z0 + 0.1, z0 + 0.97);
      if (k === 1) sign(3, V3(cx - f * 0.61, -2.75, z0 + 0.53), V3(-f, 0, 0), 0.4, 0.2);
      for (let j = 0; j < 3; j++) rod('steelS', V3(cx + rnd(-0.3, 0.3), -2.2, z0 + 0.5 + rnd(-0.3, 0.3)), V3(cx + rnd(-0.3, 0.3), -1.75, z0 + 0.5), 0.04, 5);
    }
    pendant(cx - f * 1.0, -2.3, 0, 1.5, 1.0, 1.0, 7, 1.2);
    // lit control cabin hanging under the block end + platform to the service walkways
    cabin(f * 40.3, 0, -1.8, 3.6, 2.6, 3.0, { door: 'pz', windows: ['pz', 'nz', 'px', 'nx'], litP: 0.92, hangTo: -0.85 });
    catwalk(V3(f * 39.6, -4.4, 1.6), V3(f * 39.6, -4.4, 2.9), 0.9, [true, true], null);
    stairs(V3(f * 39.6, -5.3, 3.7), V3(f * 39.6, -4.4, 2.9), 0.8);
    // pump skid
    box('steel', f * 43.2 - 0.5, f * 43.2 + 0.5, -3.6, -3.45, -1.3, 1.3);
    cylZ('paint', -0.9, 0.9, f * 43.2, -3.95, 0.4, 20, [0.5, 0.58, 0.66]);
    for (const s of [-1, 1]) rod('steelS', V3(f * 43.2, -3.45, s * 1.1), V3(f * 43.2, -2.1, s * 1.1), 0.05, 6);
    pipe('steel', [V3(f * 43.2, -3.95, 1.0), V3(f * 43.2, -3.95, 2.0), V3(f * 43.2, -3.3, 2.0)], 0.12, {});
  }

  // =================================================================== 5. SERVICES (pipes, trays, ducts)
  {
    // longitudinal pipe racks in the two service lanes
    const racks = [[2.95, -3.05, 0.3], [3.55, -3.2, 0.18], [4.05, -3.0, 0.13], [4.45, -3.35, 0.22], [3.25, -3.62, 0.1], [4.7, -3.66, 0.08]];
    for (const s of [1, -1]) for (const [zz, y, r] of racks) {
      const z = s * zz;
      // where would this pipe hit a drum?  -> end it into the drum wall
      const stops = [];
      for (const d of DRUMS) { const Rr = d.r + 0.55; if (Math.abs(z) < Rr) stops.push([d.x - Math.sqrt(Rr * Rr - z * z), d.x + Math.sqrt(Rr * Rr - z * z)]); }
      const tint = R() < 0.4 ? [0.85, 0.82, 0.78] : [1, 1, 1];
      const bn = R() < 0.45 ? 'rust' : 'steel';
      let x = -43.5;
      const segs = [];
      for (const [a, b] of stops.sort((p, q) => p[0] - q[0])) { segs.push([x, a]); x = b; }
      segs.push([x, 43.5]);
      for (const [a, b] of segs) {
        if (b - a < 1.0) continue;
        const pts = [];
        if (a < -43) pts.push(V3(a + 0.6, -1.75, z), V3(a + 0.6, y, z)); else pts.push(V3(a, y, z));
        if (b > 43) pts.push(V3(b - 0.6, y, z), V3(b - 0.6, -1.75, z)); else pts.push(V3(b, y, z));
        pipe(bn, pts, r, { tint, valves: 0.12, every: 5.5 });
      }
    }
    // cable trays
    for (const s of [1, -1]) {
      const z = s * 4.95, y = -4.0;
      for (const [ta, tb] of BAY_SEGS) {
        const a = Math.max(ta, -43.5), b = Math.min(tb, 43.5);
        box('steelS', a, b, y - 0.02, y + 0.01, z - 0.27, z + 0.27);
        for (const f of [-1, 1]) box('steelS', a, b, y, y + 0.12, z + f * 0.27 - 0.012, z + f * 0.27 + 0.012);
        for (let k = 0; k < 7; k++) {
          const zz = z - 0.21 + k * 0.07;
          rod('rubber', V3(a, y + 0.05 + (k % 2) * 0.04, zz), V3(b, y + 0.05 + (k % 2) * 0.04, zz), 0.03 + (k % 3) * 0.008, 5, k % 4 === 1 ? [3.2, 2.9, 2.2] : k % 4 === 3 ? [2.2, 0.9, 0.6] : [1, 1, 1]);
        }
      }
      for (const L of LINES) if (L > -44 && L < 44 && !isHipLine(L)) for (const f of [-1, 1]) rod('steelS', V3(L, -3.8, z + f * 0.28), V3(L, y, z + f * 0.28), 0.018, 4);
    }
    // high ducts between the spines and the trusses
    for (const s of [1, -1]) for (const [a, b] of [[-43.5, -25.6], [-18.4, -16.2], [-11.4, -5.2], [5.2, 11.4], [16.2, 18.4], [25.6, 43.5]]) {
      const z = s * 4.0;
      box('paintS', a, b, -2.2, -1.75, z - 0.45, z + 0.45, [0.62, 0.64, 0.62], 0.05);
      for (let x = a + 1.2; x < b - 0.5; x += 2.4) box('steelS', x - 0.05, x + 0.05, -2.24, -1.75, z - 0.5, z + 0.5);
    }
    // vertical risers from machinery to the slab + hose loops in the service lanes
    for (let i = 0; i < 16; i++) {
      const x0 = LINES[i];
      for (const s of [1, -1]) {
        if (R() < 0.75) {
          const xa = x0 + rnd(0.8, 2.0), xb = xa + rnd(1.8, 3.2);
          const za = s * rnd(2.8, 4.6), zb = s * rnd(2.8, 4.6);
          if (!DRUMS.some((d) => Math.abs(d.x - (xa + xb) / 2) < d.r + 1.5)) hoseLoop(V3(xa, -3.75, za), V3(xb, -3.75, zb), rnd(0.35, 1.0), rnd(0.035, 0.07), 0.07);
        }
        if (R() < 0.5) {
          const x = x0 + rnd(1.2, 4.3);
          if (!DRUMS.some((d) => Math.abs(d.x - x) < d.r + 1)) dangle(V3(x, -3.8, s * rnd(2.8, 4.6)), rnd(0.6, 1.4), 0.025);
        }
      }
    }
    // junction boxes on truss posts (outer faces) with conduit
    for (const L of LINES) for (const s of [1, -1]) if (R() < 0.7 && Math.abs(L) < 44 && !isHipLine(L)) junction(V3(L + 0.35, -3.1, s * 5.85), V3(0, 0, s), rnd(0.8, 1.2));
  }

  // =================================================================== 6. SERVICE CATWALKS + LAMPS (centre)
  {
    for (const s of [1, -1]) {
      const z = s * 3.8, y = -5.3;
      for (const [a, b] of [[-43.6, -4.4], [4.4, 43.6]]) catwalk(V3(a, y, z), V3(b, y, z), 1.1, s > 0 ? [true, true] : [true, true], -3.8, 5.5);
      for (const L of LINES) {
        if (Math.abs(L) < 4 || Math.abs(L) > 44) continue;
        pendant(L, isHipLine(L) ? -4.25 : -3.8, z, 0.12, 1.0, 1.0, 7.5, 1.0);
      }
      // retractable access ladders hanging below the walkways + ladders up into hatches
      for (const x of s > 0 ? [-38.2, 17.4] : [-17.6, 38.0]) ladder(x, z + s * 0.62, -5.3, -7.4, true, false);
      for (const x of s > 0 ? [-25.5, 30.8] : [-31.2, 8.6]) { ladder(x, s * 3.82, -5.3, -2.1, true, true); box('steel', x - 0.5, x + 0.5, -2.2, -2.1, s * 3.82 - 0.5, s * 3.82 + 0.5); }
      // cross-walks to the edge
    }
    // end catwalks across the block ends
    for (const f of [-1, 1]) {
      catwalk(V3(f * 44.9, -3.1, -7.4), V3(f * 44.9, -3.1, 7.4), 1.0, f > 0 ? [true, false] : [false, true], -2.1, 3.7);
      for (const z of [-6, -2, 2, 6]) pendant(f * 45.1, -2.1, z, 0.1, 1.0, 0.9, 7, 1.0);
      ladder(f * 45.0, -7.2, -3.1, -6.4, false, false);
      // connecting stair down from end catwalk to the service catwalk level
      stairs(V3(f * 43.0, -5.3, 3.8), V3(f * 44.6, -3.1, 3.8 + 0.0), 0.8);
    }
  }

  // =================================================================== 7. EDGE SKIRT
  const edgeCabins = [[-40.8, 1], [-24, 1], [-17.6, 1], [-1.5, 1], [20.2, 1], [26.0, 1], [41.0, 1], [-41.4, -1], [-25.6, -1], [-18.6, -1], [3.2, -1], [17.6, -1], [25.0, -1], [40.4, -1]];
  {
    const inCabin = (x, s, pad = 0) => edgeCabins.some(([cx, cs]) => cs === s && Math.abs(x - cx) < 1.6 + pad);
    for (const s of [1, -1]) {
      const zs = (z) => s * z;
      for (const [a, b] of EDGE_SEGS) {
        // fascia channel
        box('steel', a, b, -2.5, -2.3, Math.min(zs(7.95), zs(8.2)), Math.max(zs(7.95), zs(8.2)));
        box('steel', a, b, -2.5, -2.0, Math.min(zs(8.16), zs(8.22)), Math.max(zs(8.16), zs(8.22)));
        // brackets every 2.75 m
        for (let x = Math.ceil(a / 2.75) * 2.75; x <= b + 0.01; x += 2.75) {
          beam('steel', V3(x, -0.95, zs(7.6)), V3(x, -0.95, zs(9.55)), 0.16, 0.3);
          if (!inCabin(x, s, 0.2)) rod('rust', V3(x, -2.3, zs(7.95)), V3(x, -1.1, zs(9.4)), 0.06, 6);
          if (!inCabin(x, s, 0.2)) rod('steelS', V3(x, -1.1, zs(9.38)), V3(x, -3.1, zs(9.38)), 0.025, 4);
          boxC('steelS', x, -1.25, zs(7.62), 0.04, 0.6, 0.5);
        }
        // edge catwalk segments (cut around cabins)
        const cuts = edgeCabins.filter(([cx, cs]) => cs === s && cx > a && cx < b).map(([cx]) => [cx - 1.7, cx + 1.7]).sort((p, q) => p[0] - q[0]);
        let x = a + 0.1; const runs = [];
        for (const [c0, c1] of cuts) { runs.push([x, c0]); x = c1; }
        runs.push([x, b - 0.1]);
        for (const [r0, r1] of runs) if (r1 - r0 > 0.8) catwalk(V3(r0, -3.1, zs(8.75)), V3(r1, -3.1, zs(8.75)), 1.1, s > 0 ? [false, true] : [true, false], null);
        // wall-mounted pipes along fascia + under-floor pipes
        pipe('rust', [V3(a + 0.3, -2.0, zs(8.36)), V3(a + 0.3, -2.75, zs(8.36)), V3(b - 0.3, -2.75, zs(8.36)), V3(b - 0.3, -2.0, zs(8.36))], 0.11, { valves: 0.25 });
        pipe('steel', [V3(a + 0.6, -2.3, zs(8.3)), V3(a + 0.6, -2.42, zs(8.3)), V3(b - 0.6, -2.42, zs(8.3))], 0.07, { flanges: false });
        pipe('steel', [V3(a + 0.5, -2.5, zs(8.6)), V3(a + 0.5, -3.42, zs(8.6)), V3(b - 0.5, -3.42, zs(8.6)), V3(b - 0.5, -2.5, zs(8.6))], 0.17, { every: 4.5 });
        pipe('rust', [V3(a + 0.9, -3.35, zs(9.05)), V3(b - 0.9, -3.35, zs(9.05))], 0.1, { every: 3.5 });
        // hanging cable loops under the walkways
        for (let x2 = a + 1.0; x2 < b - 2.0; x2 += rnd(1.6, 3.2)) {
          const len = rnd(1.4, 3.0);
          if (x2 + len > b - 0.5) break;
          hoseLoop(V3(x2, -3.3, zs(rnd(8.4, 9.2))), V3(x2 + len, -3.3, zs(rnd(8.4, 9.2))), rnd(0.25, 0.9), rnd(0.025, 0.05), 0.06);
        }
        // lamps under the bracket arms
        for (let x2 = Math.ceil(a / 5.5) * 5.5 + 1.375; x2 < b; x2 += 5.5) {
          if (inCabin(x2, s, 0.3)) continue;
          pendant(x2, -1.1, zs(9.0), 0.15, 1.05, 1.0, 7.5, 1.1);
        }
        // drains with spouts (drips are animated)
        for (let x2 = a + 2.0; x2 < b - 1; x2 += rnd(4.5, 7.5)) {
          if (inCabin(x2, s, 0.3)) continue;
          pipe('rustS', [V3(x2, -2.2, zs(8.2)), V3(x2, -2.2, zs(9.75)), V3(x2, -2.55, zs(9.75))], 0.06, { flanges: false, bend: 0.12 });
          DRIP_SRC.push(V3(x2, -2.6, zs(9.75)));
        }
        // concrete corbels on the edge beam, fascia work lamps, utility boxes, downpipes
        for (let x2 = Math.ceil(a / 2.75) * 2.75 + 1.375; x2 < b - 0.2; x2 += 2.75) {
          box('concrete', x2 - 0.2, x2 + 0.2, -1.95, -0.8, Math.min(zs(7.9), zs(8.3)), Math.max(zs(7.9), zs(8.3)), pick(TINT.concrete), 0.05);
          if (inCabin(x2, s, 0.1)) continue;
          const r2 = R();
          if (r2 < 0.45) lamp(V3(x2 + 0.6, -1.75, zs(8.36)), V3(0, -0.7, s).normalize(), 1.0, 0.9, 6.5, 1.05);
          else if (r2 < 0.75) junction(V3(x2 + 0.7, -1.55, zs(8.0)), V3(0, 0, s), rnd(0.8, 1.3));
          else pipe('rustS', [V3(x2 + 0.5, -0.8, zs(8.45)), V3(x2 + 0.5, -2.9, zs(8.45)), V3(x2 + 0.5, -2.9, zs(9.1))], 0.07, { flanges: false });
        }
        // dangling cables off the walkway edge
        for (let k = 0; k < 3; k++) { const x2 = rnd(a + 0.5, b - 0.5); if (!inCabin(x2, s, 0.2)) dangle(V3(x2, -3.25, zs(9.3)), rnd(0.8, 2.8), rnd(0.02, 0.035)); }
      }
    }
    // edge cabins + small balconies
    for (const [cx, s] of edgeCabins) {
      const z = s * 9.2;
      cabin(cx, z, -1.12, 3.2, 2.25, 2.1, { door: Math.abs(cx) > 40 ? (cx > 0 ? 'nx' : 'px') : (cx < 0 ? 'px' : 'nx'), windows: [s > 0 ? 'pz' : 'nz', 'px', 'nx'], litP: 0.93 });
      ladder(cx + (cx < 0 ? -0.9 : 0.9), s * 10.45, -3.4, -5.2 - rnd(0, 1.2), true, false);
    }
    for (const [x, s] of [[-12.0, 1], [8.8, -1], [-35.0, -1], [35.5, 1]].filter(([x]) => !LEGX.some((hx) => Math.abs(hx - x) < 4.6))) {
      catwalk(V3(x - 1.2, -3.1, s * 9.9), V3(x + 1.2, -3.1, s * 9.9), 1.0, [true, true], -1.0, 2.4);
    }
    // ends: fascia, pipes, brackets
    for (const f of [-1, 1]) {
      box('steel', f * 44.9 - 0.12, f * 44.9 + 0.12, -2.5, -2.1, -8.0, 8.0);
      pipe('rust', [V3(f * 45.15, -1.9, -7.2), V3(f * 45.15, -2.35, -7.2), V3(f * 45.15, -2.35, 7.2), V3(f * 45.15, -1.9, 7.2)], 0.12, {});
      for (let z = -6.0; z <= 6.01; z += 4) dangle(V3(f * 45.35, -3.25, z + rnd(-1, 1)), rnd(0.8, 2.2), 0.03);
    }
  }

  // =================================================================== 8. ROUND 2: PRACTICALS, HANGING MODULES, FASCIA CLUTTER
  {
    const swayConst = (g, w, ph, fr) => {
      const sw = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < sw.length; i += 3) { sw[i] = w; sw[i + 1] = ph; sw[i + 2] = fr; }
      g.setAttribute('aSway', new THREE.BufferAttribute(sw, 3));
      return g;
    };
    // hanging chain with a hook (beaded tube, sways as one pendulum)
    function chain(a, len, hook = true) {
      const nL = Math.max(8, Math.round(len / 0.11)), pts = [], w = [];
      for (let i = 0; i <= nL; i++) { const t = i / nL; pts.push(V3(a.x, a.y - len * t, a.z)); w.push(Math.pow(t, 1.3) * 0.05 * len); }
      const ph = rnd(0, 6.28), fr = rnd(0.9, 1.3) / Math.sqrt(Math.max(0.8, len));
      push('sway', sweepGeo(pts, (t) => 0.022 + 0.022 * (Math.round(t * nL) % 2), 5, w, ph, fr), [2.6, 2.2, 1.8], 0.2);
      if (hook) {
        const e = pts[nL];
        push('sway', swayConst(new THREE.TorusGeometry(0.13, 0.035, 5, 10, Math.PI * 1.4).applyMatrix4(new THREE.Matrix4().makeRotationZ(-2.2).setPosition(e.x, e.y - 0.17, e.z)), w[nL], ph, fr), [2.4, 1.6, 1.1]);
        push('sway', swayConst(unitCyl(6).clone().applyMatrix4(new THREE.Matrix4().makeScale(0.07, 0.14, 0.07).setPosition(e.x, e.y - 0.02, e.z)), w[nL], ph, fr), [2.2, 2.0, 1.6]);
      }
    }
    // bundle of dangling cables / hoses of different lengths from one clamp
    function bundle(a, cnt, len, r = 0.03) {
      boxC('steelS', a.x, a.y + 0.05, a.z, 0.3, 0.1, 0.3);
      for (let i = 0; i < cnt; i++) dangle(V3(a.x + rnd(-0.12, 0.12), a.y, a.z + rnd(-0.12, 0.12)), len * rnd(0.45, 1.0), r * rnd(0.6, 1.3), 0.07, i % 2 === 0);
    }
    const gauge = (c, nrm, sz = 0.36) => { sign(6, c, nrm, sz * 2, sz); };

    // ---------------- practicals: ~20 big lamps for the whole belly, everything else stays dark
    // hip-bay work floods (6 of the 8 bays; they also carry the 6 real PointLights that spill onto the legs)
    for (const [hx, s, dx] of [[-33, 1, 1], [-11, 1, -1], [11, 1, 1], [33, 1, -1], [-11, -1, 1], [11, -1, -1]]) {
      const p = V3(hx + dx * 3.02, -0.72, s * 5.78);   // tucked into the top corner of the bay, 4.9 m from the hip
      flood(p, V3(hx - p.x, -3.4 - p.y, s * 9.6 - p.z), { from: V3(hx + dx * 3.4, -0.72, s * 5.78), k: 2.3, r: 14, cone: 0.25, real: true });
      sign(0, V3(hx + dx * 3.39, -2.2, s * 7.6), V3(-dx, 0, 0), 1.3, 0.65);
    }
    // fascia floods washing down the edge between cabins (partly hidden behind the bracket arms / pipes)
    for (const [x, s] of [[-20.8, 1], [23.1, 1], [-22.1, -1], [21.3, -1]]) {
      flood(V3(x, -1.25, s * 9.25), V3(0.15, -1, -s * 0.28), { from: V3(x, -0.95, s * 8.3), k: 2.0, r: 13, cone: 0.2 });
    }
    // cool fluorescent tubes by the mid-block cabins (one stutters)
    tubeLamp(V3(1.9, -1.45, 8.95), V3(1, 0, 0), 1.5, { flick: true, drop: 0.45 });
    tubeLamp(V3(-0.6, -1.45, -8.95), V3(1, 0, 0), 1.5, { drop: 0.45 });
    tubeLamp(V3(-41.6, -2.45, 3.4), V3(1, 0, 0), 1.5, { drop: 0.3, k: 1.0 });
    // block ends
    for (const f of [-1, 1]) cageLamp(V3(f * 45.15, -2.3, f * 2.2), { from: V3(f * 45.15, -2.1, f * 2.2), k: 1.5, r: 11, flick: f > 0 });
    // under the reactor + secondary drums: caged lamps light the ribbed bottom plates and shrouds
    for (const a of [0.9, 4.0]) cageLamp(V3(Math.cos(a) * 3.62, -5.42, Math.sin(a) * 3.62), { k: 1.8, r: 11, s: 1.1 });
    for (const f of [-1, 1]) cageLamp(V3(f * 22 + 2.25, -4.85, f * 2.3), { from: V3(f * 22 + 2.25, -3.0, f * 2.3), k: 1.6, r: 10 });
    // uplights from the service walkways: warm pools on the stepped concrete coffers (ref5)
    for (const [x, s] of [[-27.4, 1], [16.6, -1], [37.9, 1], [-5.6, -1]]) {
      flood(V3(x, -4.15, s * 3.25), V3(0.1, 1, -s * 0.55), { from: V3(x, -4.25, s * 3.8), k: 3.4, r: 15, cone: -0.05 });
    }

    // ---------------- concrete: stepped corbels under the transfer beams + secondary ribs in the coffers
    for (const L of LINES) {
      if (isHipLine(L) || Math.abs(L) > 43) continue;
      for (const s of [1, -1]) {
        box('concrete', L - 0.8, L + 0.8, -2.75, -2.2, Math.min(s * 5.98, s * 7.0), Math.max(s * 5.98, s * 7.0), pick(TINT.concrete), 0.05);
        box('concrete', L - 0.58, L + 0.58, -3.2, -2.75, Math.min(s * 6.4, s * 7.0), Math.max(s * 6.4, s * 7.0), pick(TINT.concrete), 0.05);
        box('concrete', L - 0.62, L + 0.62, -2.6, -2.2, Math.min(s * 0.35, s * 1.55), Math.max(s * 0.35, s * 1.55), pick(TINT.concrete), 0.05);
      }
    }
    for (let i = 0; i < 16; i++) {
      const x0 = LINES[i] + 0.45, x1 = LINES[i + 1] - 0.45, xm = (x0 + x1) / 2;
      if (DRUMS.some((d) => Math.abs(d.x - xm) < d.r + 2.2)) continue;
      box('concrete', xm - 0.22, xm + 0.22, -1.75, -0.8, -4.6, 4.6, pick(TINT.concrete), 0.05);     // mid-bay rib
      for (const s of [1, -1]) box('concrete', x0, x1, -1.95, -1.3, Math.min(s * 0.0, s * 0.28), Math.max(s * 0.0, s * 0.28), pick(TINT.concrete), 0.05);
    }

    // ---------------- transverse bridges between the two service catwalks (grated, hung)
    for (const x of [-37.4, -26.6, -18.2, 18.2, 26.6, 37.4]) {
      catwalk(V3(x, -5.3, -3.25), V3(x, -5.3, 3.25), 0.9, [true, true], -3.7, 2.17);
      chain(V3(x + 0.6, -5.45, rnd(-2, 2)), rnd(1.4, 3.2));
    }
    // chains + hose bundles under the machinery (sway)
    for (const [x, z, len] of [[-3.2, 4.6, 3.4], [3.6, -4.5, 2.6], [-8.9, 1.9, 2.2], [9.2, -1.9, 3.0], [-19.4, 3.1, 2.4], [24.9, -3.0, 2.0], [-30.6, 2.2, 2.8], [30.9, -2.3, 2.3], [-43.4, -2.4, 2.6], [43.5, 2.0, 2.2]]) {
      if (R() < 0.5) chain(V3(x, -4.7, z), len); else bundle(V3(x, -4.7, z), 4, len, 0.035);
    }
    for (const f of [-1, 1]) for (const s of [1, -1]) bundle(V3(f * 6.6, -4.6, s * 1.9), 5, rnd(1.6, 2.8), 0.04);

    // ---------------- outer cable trays on the truss faces, overflowing with cables
    for (const s of [1, -1]) for (const [ta, tb] of BAY_SEGS) {
      const z = s * 6.2, y = -3.42, a = Math.max(ta + 0.5, -43.6), b = Math.min(tb - 0.5, 43.6);
      box('steelS', a, b, y - 0.02, y + 0.01, z - 0.24, z + 0.24);
      for (const f of [-1, 1]) box('steelS', a, b, y, y + 0.1, z + f * 0.24 - 0.012, z + f * 0.24 + 0.012);
      for (let x = a + 0.4; x < b; x += 1.8) { box('steelS', x - 0.03, x + 0.03, y - 0.06, y - 0.02, z - 0.3, z + 0.3); rod('steelS', V3(x, y - 0.04, s * 5.92), V3(x, y + 0.5, s * 5.92), 0.02, 4); }
      for (let k = 0; k < 6; k++) rod('rubber', V3(a, y + 0.045 + (k % 2) * 0.035, z - 0.18 + k * 0.072), V3(b, y + 0.045 + (k % 2) * 0.035, z - 0.18 + k * 0.072), 0.028 + (k % 3) * 0.008, 5, k % 3 === 1 ? [3.0, 2.7, 2.1] : [1, 1, 1]);
      for (let x = a + rnd(0.5, 2); x < b - 3; x += rnd(2.2, 4.5)) hoseLoop(V3(x, y - 0.03, z + s * 0.2), V3(x + rnd(1.4, 2.8), y - 0.03, z + s * 0.2), rnd(0.3, 0.9), rnd(0.025, 0.045), 0.05);
    }

    // ---------------- lower tier of hanging service modules under the edge walkways (ref1)
    const pods = [[-21.0, 1, 0], [2.7, 1, 1], [23.2, 1, 2], [-41.6, 1, 1], [-22.0, -1, 2], [-2.2, -1, 0], [21.4, -1, 1], [42.0, -1, 0]];
    for (const [cx, s, kind] of pods) {
      const z = s * 9.35, yT = -3.78;
      if (kind === 0) {          // slung cabin with lit windows + balcony ledge + ladder up
        cabin(cx, z, yT, 2.9, 1.95, 1.9, { windows: [s > 0 ? 'pz' : 'nz', 'px', 'nx'], litP: 1.1, hangTo: -3.15 });
        catwalk(V3(cx - 1.45, yT - 1.95, s * 10.65), V3(cx + 1.45, yT - 1.95, s * 10.65), 0.7, s > 0 ? [false, true] : [true, false], null);
        ladder(cx + 1.75, s * 10.5, yT - 1.95, -3.1, true, true);
        sign(7, V3(cx - 0.9, yT - 0.32, s * (10.3 + 0.03)), V3(0, 0, s), 0.7, 0.35);
        DRIP_SRC.push(V3(cx + 0.87, yT - 2.55, z));
      } else if (kind === 1) {   // tank rack: two vertical receivers with gauges on a hung grating
        catwalk(V3(cx - 1.7, -5.75, z), V3(cx + 1.7, -5.75, z), 1.7, s > 0 ? [false, true] : [true, false], -3.2, 3.4);
        for (const dx of [-0.75, 0.75]) {
          const tt = pick([[0.78, 0.79, 0.76], [0.6, 0.66, 0.6], [0.82, 0.7, 0.48]]);
          cylY('paint', cx + dx, z - s * 0.15, -5.55, -4.1, 0.52, 20, tt, 0.04);
          sph('paint', V3(cx + dx, -4.1, z - s * 0.15), 0.52, 14, tt, 0.55); sph('paint', V3(cx + dx, -5.55, z - s * 0.15), 0.52, 14, tt, 0.45);
          for (const yy of [-4.45, -5.2]) ring('rustS', V3(cx + dx, yy, z - s * 0.15), 'y', 0.53, 0.035, 20, 3);
          pipe('rustS', [V3(cx + dx, -3.85, z - s * 0.15), V3(cx + dx, -3.3, z - s * 0.15)], 0.07, { flanges: false });
          gauge(V3(cx + dx, -4.75, z + s * 0.38), V3(0, 0, s), 0.3);
          decal(0, V3(cx + dx, -5.15, z + s * 0.385), V3(0, 0, s), VUP, 0.45, 0.8, 0.9);
        }
        pipe('steelS', [V3(cx - 0.75, -5.0, z - s * 0.15), V3(cx, -5.0, z - s * 0.15), V3(cx + 0.75, -5.0, z - s * 0.15)], 0.05, { flanges: false });
        valve(V3(cx, -5.0, z - s * 0.15), V3(1, 0, 0), 0.06);
        bundle(V3(cx + 1.3, -5.85, z), 4, rnd(1.6, 3.0), 0.03);
      } else {                   // machinery crate with louvres, exhaust stub and soot
        box('paint', cx - 1.3, cx + 1.3, -5.45, yT, z - 0.85, z + 0.85, pick(TINT.machine), 0.05);
        box('steel', cx - 1.4, cx + 1.4, yT, yT + 0.1, z - 0.95, z + 0.95);
        for (let yy = -5.2; yy < -4.3; yy += 0.14) box('steelS', cx - 0.95, cx + 0.15, yy, yy + 0.05, z + s * 0.85, z + s * 0.91);
        for (const ex of [-1, 1]) for (const ez of [-1, 1]) rod('steelS', V3(cx + ex * 1.25, yT, z + ez * 0.8), V3(cx + ex * 1.25, -3.15, z + ez * 0.8), 0.04, 5);
        pipe('rust', [V3(cx + 0.8, -5.45, z), V3(cx + 0.8, -6.1, z), V3(cx + 0.8, -6.1, z + s * 0.6)], 0.11, { flanges: false });
        decal(2, V3(cx - 0.4, -4.3, z + s * 0.92), V3(0, 0, s), VUP, 1.9, 1.5, 0.9);
        decal(2, V3(cx + 0.4, -5.45, z), VDOWN, VX, 1.7, 2.4, 0.95);
        sign(5, V3(cx + 0.75, -4.2, z + s * 0.86), V3(0, 0, s), 0.7, 0.35);
        DRIP_SRC.push(V3(cx + 0.8, -6.15, z + s * 0.62));
        chain(V3(cx - 1.0, -5.5, z + s * 0.5), rnd(1.5, 2.6));
      }
    }

    // ---------------- fascia silhouette: outriggers with strung cables, whip / yagi antennas, dishes, long cable bundles
    for (const s of [1, -1]) for (const [a, b] of EDGE_SEGS) {
      const tips = [];
      for (let x = a + rnd(0.8, 1.6); x < b - 0.6; x += rnd(3.4, 5.2)) {
        const kind = Math.floor(R() * 4), zt = s * rnd(10.7, 11.5), yt = rnd(-1.0, -0.45);
        rod('steelS', V3(x, -0.95, s * 9.5), V3(x, yt, zt), 0.035, 5);
        rod('steelS', V3(x, -2.3, s * 8.25), V3(x, yt - 0.25, s * (Math.abs(zt) - 0.5)), 0.022, 4);
        tips.push(V3(x, yt, zt));
        if (kind === 0) {        // yagi
          for (let k = 0; k < 5; k++) rod('steelS', V3(x - 0.45 + k * 0.05, yt + 0.05, zt - s * (0.15 + k * 0.28)), V3(x + 0.45 - k * 0.05, yt + 0.05, zt - s * (0.15 + k * 0.28)), 0.012, 4, [1.6, 1.6, 1.5]);
        } else if (kind === 1) { // dish
          pushT('paintS', new THREE.SphereGeometry(0.55, 14, 5, 0, Math.PI * 2, 0, 0.75), new THREE.Matrix4().makeRotationX(s * 2.0).setPosition(x, yt - 0.1, zt + s * 0.5), [0.8, 0.8, 0.77]);
        } else if (kind === 2) { // drooping whips
          for (const dx of [-0.25, 0.25]) dangle(V3(x + dx, yt, zt), rnd(1.6, 3.4), 0.014, 0.05, false);
        } else lamp(V3(x, yt - 0.05, zt), V3(0, -1, 0));
        if (R() < 0.7) bundle(V3(x + rnd(-0.8, 0.8), -3.3, s * rnd(9.25, 9.4)), 3 + Math.floor(R() * 3), rnd(2.2, 5.0), 0.03);
      }
      for (let i = 0; i < tips.length - 1; i++) hoseLoop(tips[i], tips[i + 1], rnd(0.5, 1.2), 0.016, 0.04);
      // stencil block ids + plates on the concrete edge beam, rust runs from the fascia channel bolts
      const xs2 = a + (b - a) * rnd(0.25, 0.75);
      sign(4, V3(xs2, -1.38, s * 8.0), V3(0, 0, s), 1.9, 0.95);
      for (let x = a + 0.7; x < b - 0.5; x += rnd(0.9, 2.1)) decal(DR() < 0.3 ? 1 : 0, V3(x, -2.75, s * 8.22), V3(0, 0, s), VUP, drnd(0.3, 0.8), 0.5, drnd(0.6, 0.95));
    }
    // end fascias: big block id + runs
    for (const f of [-1, 1]) {
      sign(4, V3(f * 45.0, -1.45, f * 3.4), V3(f, 0, 0), 2.4, 1.2);
      bundle(V3(f * 45.3, -3.25, -f * 5.2), 5, rnd(2.5, 4.5), 0.035);
    }
    // gauges on the capsule tanks + drum hatches, rust runs down the drum walls and cheek plates
    for (const f of [-1, 1]) for (const s of [1, -1]) gauge(V3(f * 13.8, -2.35, s * (3.55 + 0.56)), V3(0, 0, s), 0.26);
    for (const d of DRUMS) {
      const nr = d.big ? 24 : 16, yT = -2.2, yB = d.big ? -5.0 : -4.6;
      for (let i = 0; i < nr; i++) {
        if (DR() < 0.3) continue;
        const a = i / nr * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), hh = drnd(1.0, yT - yB);
        decal(DR() < 0.3 ? 3 : 0, V3(d.x + c * (d.r + 0.01), yT - hh / 2 - drnd(0, yT - yB - hh), sn * (d.r + 0.01)), V3(c, 0, sn), VUP, drnd(0.4, 0.75), hh, drnd(0.6, 1.0));
      }
      for (let k = 0; k < 5; k++) { const a = drnd(0, 6.28), r = drnd(d.fan + 1.2, d.r - 0.4); decal(2, V3(d.x + Math.cos(a) * r, yB - 0.26, Math.sin(a) * r), VDOWN, VX, drnd(1.2, 2.4), drnd(1.2, 2.4), 0.9); }
    }
    for (const hx of LEGX) for (const s of [1, -1]) for (const dx of [-1, 1]) {
      const xo = hx + dx * 4.1;
      for (let k = 0; k < 7; k++) decal(k % 3 === 2 ? 1 : 0, V3(xo, -1.05 - 0.9 - drnd(0, 0.5), s * drnd(5.5, 9.8)), V3(dx, 0, 0), VUP, k % 3 === 2 ? 1.6 : drnd(0.35, 0.7), 1.8, drnd(0.6, 0.95));
      for (let k = 0; k < 3; k++) decal(3, V3(xo, drnd(-4.6, -1.6), s * drnd(5.6, 7.2)), V3(dx, 0, 0), VUP, 1.3, 1.3, 0.8);
    }
  }

  // =================================================================== BUILD MESHES
  const meshes = [];
  for (const b of Object.values(BK)) {
    if (!b.geoms.length) continue;
    const g = BGU.mergeGeometries(b.geoms, false);
    for (const gg of b.geoms) gg.dispose();
    b.geoms.length = 0;
    if (!g) throw new Error('chassis merge failed for bucket ' + b.name);
    g.computeBoundingSphere(); g.computeBoundingBox();
    const m = new THREE.Mesh(g, MAT[b.name]);
    m.name = 'chassis_' + b.name;
    m.castShadow = !!b.cast; m.receiveShadow = !!b.recv;
    if (b.name === 'decal') m.renderOrder = -5;
    m.matrixAutoUpdate = false; m.updateMatrix();
    root.add(m); meshes.push(m);
  }

  // ---- rotating fans (instanced)
  let fanMesh = null;
  {
    const parts = [];
    const hub = new THREE.CylinderGeometry(0.22, 0.22, 0.3, 16); parts.push(hub);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      const bl = new THREE.BoxGeometry(0.76, 0.025, 0.24);
      bl.applyMatrix4(new THREE.Matrix4().makeRotationX(0.42));
      bl.applyMatrix4(new THREE.Matrix4().makeTranslation(0.58, 0, 0));
      bl.applyMatrix4(new THREE.Matrix4().makeRotationY(a));
      parts.push(bl);
    }
    for (const p of parts) { p.deleteAttribute('uv'); }
    const fg = BGU.mergeGeometries(parts.map((p) => (p.index ? p : BGU.mergeVertices(p))), false);
    const fm = patch(Mats.paintedMetal({ color: 0x5c605c, w: { rust: 0.6, chip: 0.4, offset: V3(3, 3, 3) } }));
    fanMesh = new THREE.InstancedMesh(fg, fm, fanList.length);
    fanMesh.name = 'chassis_fans';
    fanMesh.frustumCulled = false;
    root.add(fanMesh);
  }

  // ---- drips
  const DROPS_PER = 2;
  const dripSrc = DRIP_SRC.map((p) => ({ p, per: rnd(1.6, 3.2), ph: rnd(0, 1) }));
  const dripMat = patch(new THREE.MeshStandardMaterial({ color: 0xaab8c6, roughness: 0.05, metalness: 0.0, emissive: new THREE.Color(0.03, 0.04, 0.06) }));
  const dripMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), dripMat, Math.max(1, dripSrc.length * DROPS_PER));
  dripMesh.name = 'chassis_drips'; dripMesh.frustumCulled = false;
  root.add(dripMesh);

  // ---- real point lights (≤ 6)
  const PL = REAL_PL.slice(0, 6).map((p) => [p.x, p.y, p.z]);
  for (const [x, y, z] of PL) {
    const l = new THREE.PointLight(new THREE.Color(1.0, 0.5, 0.18), 34, 22, 2);
    l.position.set(x, y, z); l.castShadow = false;
    root.add(l);
  }

  // ---- cluster lamps for the shader (nearby lamps merge, energy is kept)
  lamps.sort((a, b) => b.w - a.w || a.p.x - b.p.x);
  let clusters = [];
  const solos = lamps.filter((L) => L.solo).map((L) => ({ ...L, e: 99, solo: true }));
  for (const L of lamps) {
    if (L.solo) continue;
    const e = L.c[0] + L.c[1] + L.c[2];
    const c = clusters.find((q) => q.p.distanceTo(L.p) < 2.6);
    if (c) {
      c.p.multiplyScalar(c.e).addScaledVector(L.p, e).divideScalar(c.e + e);
      c.c = c.c.map((v, i) => v + L.c[i]); c.r = Math.max(c.r, L.r) + 0.4; c.e += e; c.w = Math.max(c.w, L.w);
    } else clusters.push({ p: L.p.clone(), c: L.c.slice(), r: L.r, e, w: L.w });
  }
  clusters.sort((a, b) => b.e * b.w - a.e * a.w);
  const chosen = solos.concat(clusters).slice(0, LAMP_N);
  for (const c of chosen) if (!c.solo) { const k = Math.min(1, 2.2 / (c.c[0] || 1)); c.c = c.c.map((v) => v * k); }
  const hash1 = (v) => { const q = Math.sin(v * 127.1 + 3.7) * 43758.5453; return q - Math.floor(q); };
  const flickAt = (t) => {   // pure function of t: steady seconds, then stuttering bursts
    if (hash1(Math.floor(t * 0.8)) < 0.42) return 0.95 + 0.05 * Math.sin(t * 37.0);
    const f = hash1(Math.floor(t * 19.0) + 31.7);
    return f > 0.4 ? 1.0 : 0.12 + 0.5 * f;
  };
  const lampLocal = chosen.map((L) => L.p);
  chosen.forEach((L, i) => { lampU.uLampC.value[i].set(L.c[0], L.c[1], L.c[2]); lampU.uLampP.value[i].w = L.r; });

  const _hv = V3(), TB = performance.now();
  if (Q && Q.has('chsstats')) {
    let hipHits = 0, recessHits = 0;   // vertices inside the 3.2 m hip spheres / inside the hip recess volume
    for (const m of meshes) { const pa = m.geometry.attributes.position; for (let i = 0; i < pa.count; i++) {
      _hv.fromBufferAttribute(pa, i);
      if (HIPS.some((h) => h.distanceTo(_hv) < 3.2)) hipHits++;
      if (LEGX.some((hx) => Math.abs(_hv.x - hx) < 3.3) && Math.abs(_hv.z) > 5.1 && _hv.y < -0.3) recessHits++;
    } }
    console.error(`[chassis stats] buildMs=${Math.round(TB - T0)} hipSphereVerts=${hipHits} recessVerts=${recessHits}`);
    let tris = 0, calls = 0;
    root.traverse((o) => { if (o.isMesh) { calls++; const n = o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; tris += n * (o.isInstancedMesh ? o.count : 1); } });
    console.error(`[chassis stats] meshes=${calls} tris=${Math.round(tris)} lamps=${lamps.length} practicals=${solos.length} shaderLamps=${chosen.length} pointLights=${PL.length} drips=${dripSrc.length} decals=${decalN}`);
  }

  // =================================================================== UPDATE (pure function of t)
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = V3(), _s = V3(), _v = V3(), YAX = V3(0, 1, 0);
  return {
    update(t) {
      lampU.uChsT.value = t;
      const mw = walker.matrixWorld;
      const fl = flickAt(t);
      MAT.emisF.color.setScalar(fl);
      for (let i = 0; i < lampLocal.length; i++) {
        const L = chosen[i];
        _v.copy(lampLocal[i]).applyMatrix4(mw);
        lampU.uLampP.value[i].x = _v.x; lampU.uLampP.value[i].y = _v.y; lampU.uLampP.value[i].z = _v.z;
        if (L.dir) { _v.copy(L.dir).transformDirection(mw); lampU.uLampD.value[i].set(_v.x, _v.y, _v.z, L.cone); }
        if (L.flick) lampU.uLampC.value[i].set(L.c[0] * fl, L.c[1] * fl, L.c[2] * fl);
      }
      fanList.forEach((f, i) => {
        _q.setFromAxisAngle(YAX, t * f.spd + f.ph);
        _m4.compose(_p.set(f.x, f.y, f.z), _q, _s.set(f.r, f.r, f.r));
        fanMesh.setMatrixAt(i, _m4);
      });
      fanMesh.instanceMatrix.needsUpdate = true;
      let k = 0;
      for (const d of dripSrc) for (let j = 0; j < DROPS_PER; j++) {
        const u = ((t / d.per + d.ph + j / DROPS_PER) % 1 + 1) % 1;
        const tau = u * d.per;
        const fall = 0.5 * 9.8 * tau * tau;
        const vel = 9.8 * tau;
        const y = d.p.y - fall;
        if (y < -19) _m4.makeScale(0, 0, 0);
        else {
          const sy = 0.035 + Math.min(0.5, vel * 0.012);
          _m4.compose(_p.set(d.p.x, y, d.p.z), _q.identity(), _s.set(0.022, sy, 0.022));
        }
        dripMesh.setMatrixAt(k++, _m4);
      }
      dripMesh.instanceMatrix.needsUpdate = true;
    },
  };
}

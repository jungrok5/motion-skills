// manga-background-3d · engine.js — turns a Stage into the two looks of the film, from one camera:
//   model  — the grey clay render of the 3D set (what the artist built)
//   manga  — the same view as a manga background: flat screentone-like greys (quantised light, marker-uneven edges,
//            white windows with diagonal glare, glowing lamps at night) under hand-inked lines.
// The lines are not an image filter. Every edge of the geometry that matters — creases, silhouettes, open borders,
// wires — is found in 3D, tested against the depth buffer so only what is in view is inked, chained into strokes,
// and drawn with a pen's habits: overshoot past corners, a slight bow and wobble, pressure taper, ink dots, the odd
// doubled line. Each stroke's habits are seeded by its edge, so they stay put while the camera moves.
import * as THREE from 'three';
import { mergeGeometries } from './vendor/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from './vendor/jsm/loaders/GLTFLoader.js';
import { FLAG } from './kit.js';
import { hash01, noise1, clamp, smooth } from './core.js';

THREE.ColorManagement.enabled = false;

// the look: change per piece through new Film({ look: {...} }) — the defaults are the style
export const LOOK = {
  levels: [0.22, 0.4, 0.58, 0.72, 0.85, 0.975],   // the greys a page may use (darkest → paper)
  edge: 0.012,                                       // softness of a tone boundary (marker edge)
  uneven: 0.016,                                     // marker unevenness (large-scale) added before quantising
  sky: { day: 0.975, dusk: 0.72, night: 0.22 },        // on a level: the sky is one flat tone
  clay: { bg: [0.40, 0.395, 0.38], tint: [0.8, 0.79, 0.77] },
  light: { day: { ambient: 0.74, sun: 0.42 }, dusk: { ambient: 0.62, sun: 0.36 }, night: { ambient: 0.36, sun: 0.08 } },
  ink: '#141414',
  pen: { silhouette: 2.9, boundary: 2.6, crease: 2.0, wire: 1.3, overshoot: [5, 20], bow: 0.005, wobble: 0.45, dots: 0.38, doubles: 0.2, split: 0.5 },
  glass: { streaks: true, tone: 0.86 },
  glow: 1.0,
  grain: 0.022,
};

const lumaOf = c => 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;

// ── edges: found once per Stage ─────────────────────────────────────────────────────────────────
function buildEdges(stage) {
  const verts = [];          // world positions, xyz…
  const stat = [];           // [a, b, prim, kind]   kind 0 boundary · 1 crease · 2 wire
  const sil = [];            // [a, b, prim, nax, nay, naz, nbx, nby, nbz]
  const prims = stage.prims;
  for (const p of prims) {
    if (p.lines === 'none') continue;
    const pos = p.geo.attributes.position.array, nTri = pos.length / 9;
    const ids = new Map(), local = [];
    const vid = (i) => {
      const x = pos[i], y = pos[i + 1], z = pos[i + 2];
      const k = `${Math.round(x * 2000)},${Math.round(y * 2000)},${Math.round(z * 2000)}`;
      let v = ids.get(k);
      if (v === undefined) { v = verts.length / 3; verts.push(x, y, z); ids.set(k, v); local.push(v); }
      return v;
    };
    const fn = [], edges = new Map();
    for (let t = 0; t < nTri; t++) {
      const a = vid(t * 9), b = vid(t * 9 + 3), c = vid(t * 9 + 6);
      if (a === b || b === c || a === c) continue;
      const ux = pos[t * 9 + 3] - pos[t * 9], uy = pos[t * 9 + 4] - pos[t * 9 + 1], uz = pos[t * 9 + 5] - pos[t * 9 + 2];
      const vx = pos[t * 9 + 6] - pos[t * 9], vy = pos[t * 9 + 7] - pos[t * 9 + 1], vz = pos[t * 9 + 8] - pos[t * 9 + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz); if (l < 1e-12) continue;
      nx /= l; ny /= l; nz /= l;
      const f = fn.length / 3; fn.push(nx, ny, nz);
      for (const [i, j] of [[a, b], [b, c], [c, a]]) {
        const k = i < j ? i * 4194304 + j : j * 4194304 + i;
        const e = edges.get(k); if (e) e.push(f); else edges.set(k, [Math.min(i, j), Math.max(i, j), f]);
      }
    }
    const cosCrease = Math.cos(p.crease * Math.PI / 180);
    for (const e of edges.values()) {
      const [a, b, f1, f2] = e;
      if (e.length === 3) { stat.push(a, b, p.id, 0); continue; }                     // open border
      if (e.length > 4) { if (p.lines === 'all') stat.push(a, b, p.id, 1); continue; } // non-manifold
      const d = fn[f1 * 3] * fn[f2 * 3] + fn[f1 * 3 + 1] * fn[f2 * 3 + 1] + fn[f1 * 3 + 2] * fn[f2 * 3 + 2];
      if (d > 0.9998) continue;                                                       // flat: a triangulation seam
      if (d < cosCrease && p.lines === 'all') { stat.push(a, b, p.id, 1); continue; }
      sil.push(a, b, p.id, fn[f1 * 3], fn[f1 * 3 + 1], fn[f1 * 3 + 2], fn[f2 * 3], fn[f2 * 3 + 1], fn[f2 * 3 + 2]);
    }
  }
  const wireBase = prims.length;
  stage.lines.forEach((ln, li) => {
    const first = verts.length / 3;
    for (const q of ln.pts) verts.push(q[0], q[1], q[2]);
    for (let i = 0; i < ln.pts.length - 1; i++) stat.push(first + i, first + i + 1, wireBase + li, 2);
    if (ln.closed) stat.push(first + ln.pts.length - 1, first, wireBase + li, 2);
  });
  const meta = prims.map(p => ({ weight: p.weight, detail: p.detail }));
  stage.lines.forEach(l => meta.push({ weight: l.weight, detail: false, wire: true }));
  return { verts: new Float32Array(verts), stat: new Int32Array(stat), sil: new Float32Array(sil), meta };
}

// ── the three.js side ───────────────────────────────────────────────────────────────────────────
const FS_QUAD = new THREE.BufferGeometry();
FS_QUAD.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
const quadVS = `varying vec2 vUv; void main(){ vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`;
const infoVS = `varying float vDepth; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`;
const infoFS = `uniform float uFlag; varying float vDepth; void main(){ gl_FragColor = vec4(vDepth, uFlag, 0., 1.); }`;
const NOISE = `
float hh(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hh(i), hh(i + vec2(1, 0)), u.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), u.x), u.y); }`;
const glowMaskFS = `uniform sampler2D tInfo; varying vec2 vUv; void main(){ vec4 i = texture2D(tInfo, vUv); float m = (i.a > .5 && abs(i.g - 2.) < .1) ? 1. : 0.; gl_FragColor = vec4(m, m, m, 1.); }`;
const blurFS = `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
void main(){ float w[7]; w[0]=.1964; w[1]=.1748; w[2]=.1216; w[3]=.0665; w[4]=.0284; w[5]=.0095; w[6]=.0024;
  float s = texture2D(tSrc, vUv).r * w[0]; for (int i = 1; i < 7; i++){ s += texture2D(tSrc, vUv + uDir * float(i)).r * w[i]; s += texture2D(tSrc, vUv - uDir * float(i)).r * w[i]; }
  gl_FragColor = vec4(s, s, s, 1.); }`;
const postFS = `
uniform sampler2D tLit, tInfo, tGlow; uniform vec2 uRes; uniform float uWipe, uSky, uEdge, uUneven, uGlow, uGrain, uGlassTone, uStreaks, uMode, uSeed;
uniform float uLv[6]; uniform vec3 uClayBg, uClayTint; varying vec2 vUv;
${NOISE}
void main(){
  vec2 fc = gl_FragCoord.xy;
  vec3 lit = texture2D(tLit, vUv).rgb; vec4 info = texture2D(tInfo, vUv);
  bool sky = info.a < .5; float flag = info.g;
  // the clay model (right of the wipe, or uMode = 1)
  vec3 clay = sky ? uClayBg + lit : lit * uClayTint;      // (over the sky, lit holds only light added in front of it: beams)
  // the manga tone
  float L = dot(lit, vec3(.299, .587, .114));
  if (sky) L = uSky + L;
  float n = sky ? 0. : (vn(fc / 260. + uSeed) - .5) * uUneven * 2. + (vn(fc / 41. + uSeed * 1.7) - .5) * uUneven * .4;
  float t = uLv[0];
  for (int i = 1; i < 6; i++){ float th = (uLv[i - 1] + uLv[i]) * .5; t = mix(t, uLv[i], smoothstep(th - uEdge, th + uEdge, L + n)); }
  if (abs(flag - 1.) < .1) {                       // glass: paper white with diagonal glare bands
    float d = (fc.x * .62 + fc.y) / uRes.y;
    float band = smoothstep(.0, .012, fract(d * 1.6 + .3) - .80) * (1. - smoothstep(.0, .012, fract(d * 1.6 + .3) - .86))
               + smoothstep(.0, .008, fract(d * 1.6 + .3) - .90) * (1. - smoothstep(.0, .008, fract(d * 1.6 + .3) - .925));
    t = mix(uLv[5], uGlassTone, uStreaks * clamp(band, 0., 1.));
  }
  else if (abs(flag - 2.) < .1) t = 1.;
  float g = texture2D(tGlow, vUv).r * uGlow;
  t = mix(t, 1., clamp(g * 1.6, 0., 1.));
  t += (hh(fc + uSeed) - .5) * uGrain;
  vec3 manga = vec3(t);
  vec3 col = (uMode > .5 || fc.x >= uWipe) ? clay : manga;
  gl_FragColor = vec4(col, 1.);
}`;

export class Engine {
  constructor(o = {}) {
    this.look = { ...LOOK, ...(o.look || {}), pen: { ...LOOK.pen, ...(o.look?.pen || {}) } };
    this.canvas = o.canvas || document.createElement('canvas');
    this.gl = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, preserveDrawingBuffer: true, alpha: false, powerPreference: 'high-performance' });
    this.gl.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.gl.setPixelRatio(1);
    this.size = [0, 0];
    this.cam = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 400);
    const mk = (fs, uniforms) => new THREE.Mesh(FS_QUAD, new THREE.ShaderMaterial({ vertexShader: quadVS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false }));
    this.postQuad = mk(postFS, {
      tLit: { value: null }, tInfo: { value: null }, tGlow: { value: null }, uRes: { value: new THREE.Vector2() }, uWipe: { value: 1e9 },
      uSky: { value: 1 }, uEdge: { value: 0.02 }, uUneven: { value: 0.05 }, uGlow: { value: 1 }, uGrain: { value: 0.02 }, uGlassTone: { value: 0.86 },
      uStreaks: { value: 1 }, uMode: { value: 0 }, uSeed: { value: 0 }, uLv: { value: [0.2, 0.4, 0.58, 0.72, 0.85, 0.97] },
      uClayBg: { value: new THREE.Vector3() }, uClayTint: { value: new THREE.Vector3(1, 1, 1) },
    });
    this.glowMaskQuad = mk(glowMaskFS, { tInfo: { value: null } });
    this.blurQuad = mk(blurFS, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.loader = new GLTFLoader();
  }

  _targets(w, h) {
    if (this.size[0] === w && this.size[1] === h) return;
    this.size = [w, h];
    this.gl.setSize(w, h, false);
    for (const k of ['rtLit', 'rtInfo', 'rtG1', 'rtG2']) this[k]?.dispose();
    this.rtLit = new THREE.WebGLRenderTarget(w, h, { samples: 4, depthBuffer: true });
    this.rtInfo = new THREE.WebGLRenderTarget(w, h, { type: THREE.FloatType, depthBuffer: true, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    const gw = Math.max(8, Math.round(w / 4)), gh = Math.max(8, Math.round(h / 4));
    this.rtG1 = new THREE.WebGLRenderTarget(gw, gh, { type: THREE.HalfFloatType });
    this.rtG2 = new THREE.WebGLRenderTarget(gw, gh, { type: THREE.HalfFloatType });
    this.depth = new Float32Array(w * h * 4);
  }

  // Stage → a renderable set (merged meshes, lights, edges). Async because of GLB models and textures.
  async prepare(stage) {
    for (const m of stage.models) {
      const gltf = await this.loader.loadAsync(m.url);
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse(o => {
        if (!o.isMesh) return;
        const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
        let tone = m.o.tone;
        if (tone === undefined) {
          let l = lumaOf(o.material.color || new THREE.Color(1, 1, 1));
          const vc = g.attributes.color;
          if (vc) { let s = 0; for (let i = 0; i < vc.count; i++) s += 0.299 * vc.getX(i) + 0.587 * vc.getY(i) + 0.114 * vc.getZ(i); l *= s / vc.count; }
          tone = clamp(0.42 + 0.62 * l, 0.3, 1);
        }
        stage.stack.push(m.matrix); stage.mesh([0, 0, 0], g, { tone, crease: m.o.crease ?? 42, lines: m.o.lines, weight: m.o.weight, detail: m.o.detail }); stage.stack.pop();
      });
    }
    const scene = new THREE.Scene();
    const groups = new Map();
    for (const p of stage.prims) {
      const key = p.map || p.beam ? `own${p.id}` : `${p.flag}|${p.tone.toFixed(3)}|${p.cast}|${p.receive}|${p.double}|${p.see}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }
    const meshes = [];
    for (const list of groups.values()) {
      const p = list[0];
      const geo = list.length === 1 ? p.geo : mergeGeometries(list.map(q => q.geo), false);
      let mat;
      const c = new THREE.Color(p.tone, p.tone, p.tone);
      if (p.map) {
        const tex = new THREE.CanvasTexture(p.map); tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 4;
        mat = new THREE.MeshLambertMaterial({ map: tex });
      } else if (p.flag === FLAG.light) mat = new THREE.MeshLambertMaterial({ color: c, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0.9 });
      else mat = new THREE.MeshLambertMaterial({ color: c, side: p.flag === FLAG.glass || p.double ? THREE.DoubleSide : THREE.FrontSide });
      if (p.see) mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(1, 1, 1), transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
      if (p.beam) mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, mat);
      if (p.see) { mesh.castShadow = false; mesh.receiveShadow = false; mesh.userData.see = true; mesh.renderOrder = 2; }
      if (!p.see) { mesh.castShadow = p.cast && p.flag !== FLAG.glass; mesh.receiveShadow = p.receive; }
      mesh.userData.lit = mat;
      mesh.userData.info = new THREE.ShaderMaterial({ vertexShader: infoVS, fragmentShader: infoFS, uniforms: { uFlag: { value: p.flag } }, side: mat.side });
      scene.add(mesh); meshes.push(mesh);
    }
    const mood = stage.mood, L = this.look.light[mood] || this.look.light.day;
    scene.add(new THREE.AmbientLight(0xffffff, (stage.ambient ?? L.ambient) * Math.PI));   // three's lights are physical: ×π gives a white surface its tone
    const so = stage.sunOpt ?? { dir: [-0.5, 1, 0.35], area: { center: [0, 0, 0], radius: 12 }, shadow: true };
    const sun = new THREE.DirectionalLight(0xffffff, (so.strength ?? L.sun) * Math.PI);
    const d = new THREE.Vector3(...so.dir).normalize(), c0 = new THREE.Vector3(...so.area.center), R = so.area.radius;
    sun.position.copy(c0).addScaledVector(d, R * 2.5); sun.target.position.copy(c0);
    sun.castShadow = so.shadow !== false;
    Object.assign(sun.shadow.camera, { left: -R, right: R, top: R, bottom: -R, near: 0.1, far: R * 5 });
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025; sun.shadow.radius = 2;
    scene.add(sun, sun.target);
    for (const l of stage.lights.slice(0, 8)) {
      const pl = new THREE.PointLight(0xffffff, l.intensity * 1.6 * Math.PI, l.distance, 1.2); pl.position.set(...l.pos); scene.add(pl);
    }
    return { stage, scene, meshes, edges: buildEdges(stage), mood, sky: this.look.sky[mood] ?? this.look.sky.day };
  }

  // set the camera: {pos, look, fov} (fov = vertical degrees)
  aim(view, w, h) {
    const c = this.cam;
    c.fov = view.fov ?? 50; c.aspect = w / h; c.near = view.near ?? 0.15; c.far = view.far ?? 400;   // near 0.15: depth precision for 2–5 mm offsets at 50 m
    c.position.set(...view.pos); c.up.set(0, 1, 0); c.lookAt(...view.look);
    if (view.roll) c.rotateZ(view.roll * Math.PI / 180);
    c.updateProjectionMatrix(); c.updateMatrixWorld(true);
    return c;
  }

  // Render one view. Returns { canvas (the WebGL canvas: tone + clay), strokes (screen-space pen strokes) }.
  //   opt.wipe   — x in px: manga to the left of it, clay to the right (default: all manga)
  //   opt.mode   — 'manga' | 'model'
  //   opt.lines  — false skips the line work (clay only views)
  render(set, view, w, h, opt = {}) {
    this._targets(w, h);
    const gl = this.gl, cam = this.aim(view, w, h), lk = this.look;
    // 1 · lit pass (clay, and the light the tones are quantised from)
    for (const m of set.meshes) m.material = m.userData.lit;
    set.scene.background = null;
    gl.setRenderTarget(this.rtLit); gl.setClearColor(0x000000, 1); gl.clear(); gl.render(set.scene, cam);
    // 2 · info pass: view depth + flag (for the line visibility test, glass, lamps, sky)
    for (const m of set.meshes) { m.material = m.userData.info; if (m.userData.see) m.visible = false; }   // see-through glass hides nothing
    const sm = gl.shadowMap.enabled; gl.shadowMap.enabled = false;
    gl.setRenderTarget(this.rtInfo); gl.setClearColor(0x000000, 0); gl.clear(); gl.render(set.scene, cam);
    gl.shadowMap.enabled = sm;
    for (const m of set.meshes) { m.material = m.userData.lit; m.visible = true; }
    // 3 · glow (lamps bloom; strongest at night)
    const q = this.quadScene, run = (mesh, target) => { q.children.length = 0; q.add(mesh); gl.setRenderTarget(target); gl.render(q, this.quadCam); };
    this.glowMaskQuad.material.uniforms.tInfo.value = this.rtInfo.texture; run(this.glowMaskQuad, this.rtG1);
    const bu = this.blurQuad.material.uniforms, gw = this.rtG1.width, gh = this.rtG1.height;
    for (let i = 0; i < 2; i++) {
      bu.tSrc.value = this.rtG1.texture; bu.uDir.value.set((1.6 + i * 1.6) / gw, 0); run(this.blurQuad, this.rtG2);
      bu.tSrc.value = this.rtG2.texture; bu.uDir.value.set(0, (1.6 + i * 1.6) / gh); run(this.blurQuad, this.rtG1);
    }
    // 4 · post: manga tone | clay, onto the canvas
    const u = this.postQuad.material.uniforms;
    u.tLit.value = this.rtLit.texture; u.tInfo.value = this.rtInfo.texture; u.tGlow.value = this.rtG1.texture;
    u.uRes.value.set(w, h); u.uWipe.value = opt.wipe ?? 1e9; u.uMode.value = opt.mode === 'model' ? 1 : 0;
    u.uSky.value = set.sky; u.uEdge.value = lk.edge; u.uUneven.value = lk.uneven; u.uGrain.value = lk.grain;
    u.uGlow.value = lk.glow * (set.mood === 'night' ? 1 : set.mood === 'dusk' ? 0.6 : 0.25);
    u.uGlassTone.value = lk.glass.tone; u.uStreaks.value = lk.glass.streaks ? 1 : 0; u.uSeed.value = (view.seed ?? 0) % 97;
    u.uLv.value = lk.levels; u.uClayBg.value.set(...lk.clay.bg); u.uClayTint.value.set(...lk.clay.tint);
    run(this.postQuad, null);
    let strokes = [];
    if (opt.lines !== false && !(opt.mode === 'model')) {
      gl.readRenderTargetPixels(this.rtInfo, 0, 0, w, h, this.depth);
      strokes = this.ink(set, cam, w, h, opt.unit ?? h / 864);
    }
    gl.setRenderTarget(null);
    return { canvas: this.canvas, strokes };
  }

  // ── the line work ─────────────────────────────────────────────────────────────────────────────
  ink(set, cam, W, H, unit) {
    const { verts, stat, sil, meta } = set.edges, D = this.depth, pen = this.look.pen;
    const vp = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).elements;
    const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z, near = cam.near * 1.02;
    const depthAt = (x, y) => { // farthest depth in a 3×3 neighbourhood (sky = Infinity)
      let m = 0;
      for (let dy = -1; dy <= 1; dy++) { const yy = H - 1 - (y + dy); if (yy < 0 || yy >= H) continue;
        for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= W) continue;
          const i = (yy * W + xx) * 4; if (D[i + 3] < 0.5) return Infinity; if (D[i] > m) m = D[i]; } }
      return m;
    };
    const pieces = [];
    const clip = (i) => { const x = verts[i * 3], y = verts[i * 3 + 1], z = verts[i * 3 + 2];
      return [vp[0] * x + vp[4] * y + vp[8] * z + vp[12], vp[1] * x + vp[5] * y + vp[9] * z + vp[13], vp[3] * x + vp[7] * y + vp[11] * z + vp[15]]; };
    const edge = (a, b, prim, kind, eid) => {
      let A = clip(a), B = clip(b), ta = 0, tb = 1;
      if (A[2] < near && B[2] < near) return;
      if (A[0] > A[2] * 1.05 && B[0] > B[2] * 1.05 && A[2] > 0 && B[2] > 0) return;
      if (A[0] < -A[2] * 1.05 && B[0] < -B[2] * 1.05 && A[2] > 0 && B[2] > 0) return;
      if (A[1] > A[2] * 1.05 && B[1] > B[2] * 1.05 && A[2] > 0 && B[2] > 0) return;
      if (A[1] < -A[2] * 1.05 && B[1] < -B[2] * 1.05 && A[2] > 0 && B[2] > 0) return;
      const A0 = A, B0 = B;
      if (A[2] < near) { ta = (near - A0[2]) / (B0[2] - A0[2]); A = A0.map((v, k) => v + (B0[k] - v) * ta); }
      if (B[2] < near) { tb = (near - A0[2]) / (B0[2] - A0[2]); B = A0.map((v, k) => v + (B0[k] - v) * tb); }
      const sx = (c) => (c[0] / c[2] * 0.5 + 0.5) * W, sy = (c) => (0.5 - c[1] / c[2] * 0.5) * H;
      const ax = sx(A), ay = sy(A), bx = sx(B), by = sy(B), len = Math.hypot(bx - ax, by - ay);
      if (len < 1.5) return;
      const n = Math.min(1200, Math.ceil(len / 2) + 1);
      let runStart = -1, gap = 0, lastVis = -1;
      const vis = new Uint8Array(n + 1);
      for (let i = 0; i <= n; i++) {
        const s = i / n, cw = A[2] + (B[2] - A[2]) * s;
        const px = ((A[0] + (B[0] - A[0]) * s) / cw * 0.5 + 0.5) * W, py = (0.5 - (A[1] + (B[1] - A[1]) * s) / cw * 0.5) * H;
        if (px < 0 || py < 0 || px >= W || py >= H) continue;
        const dm = depthAt(px | 0, py | 0);
        if (cw <= dm * 1.004 + 0.012) vis[i] = 1;
      }
      for (let i = 1; i < n; i++) if (!vis[i] && vis[i - 1] && vis[i + 1]) vis[i] = 1; // close 1-sample gaps
      const m = meta[prim];
      const emit = (i0, i1) => {
        if (i1 - i0 < 2) return;
        const s0 = i0 / n, s1 = i1 / n, w0 = A[2] + (B[2] - A[2]) * s0, w1 = A[2] + (B[2] - A[2]) * s1;
        const p = {
          x0: ((A[0] + (B[0] - A[0]) * s0) / w0 * 0.5 + 0.5) * W, y0: (0.5 - (A[1] + (B[1] - A[1]) * s0) / w0 * 0.5) * H,
          x1: ((A[0] + (B[0] - A[0]) * s1) / w1 * 0.5 + 0.5) * W, y1: (0.5 - (A[1] + (B[1] - A[1]) * s1) / w1 * 0.5) * H,
          va: (i0 === 0 && ta === 0) ? a : -1, vb: (i1 === n && tb === 1) ? b : -1,
          ua: ta + (tb - ta) * s0, ub: ta + (tb - ta) * s1, eid, kind, prim, depth: (w0 + w1) / 2,
          len3: Math.hypot(verts[b * 3] - verts[a * 3], verts[b * 3 + 1] - verts[a * 3 + 1], verts[b * 3 + 2] - verts[a * 3 + 2]),
        };
        if (m.detail && (p.depth > 10 || Math.hypot(p.x1 - p.x0, p.y1 - p.y0) < 4 * unit)) return;
        pieces.push(p);
      };
      for (let i = 0; i <= n; i++) {
        if (vis[i]) { if (runStart < 0) runStart = i; lastVis = i; }
        else if (runStart >= 0) { emit(runStart, lastVis); runStart = -1; }
      }
      if (runStart >= 0) emit(runStart, lastVis);
    };
    for (let i = 0; i < stat.length; i += 4) edge(stat[i], stat[i + 1], stat[i + 2], stat[i + 3] === 2 ? 3 : stat[i + 3], i / 4);
    const nStat = stat.length / 4;
    for (let i = 0, k = 0; i < sil.length; i += 9, k++) {
      const a = sil[i], b = sil[i + 1];
      const px = verts[a * 3], py = verts[a * 3 + 1], pz = verts[a * 3 + 2];
      const f1 = sil[i + 3] * (cx - px) + sil[i + 4] * (cy - py) + sil[i + 5] * (cz - pz);
      const f2 = sil[i + 6] * (cx - px) + sil[i + 7] * (cy - py) + sil[i + 8] * (cz - pz);
      if ((f1 > 0) !== (f2 > 0)) edge(a, b, sil[i + 2], 2, nStat + k);
    }
    return this.chain(pieces, unit);
  }

  // join pieces that meet at a shared vertex and carry on in the same direction (rings, curves, wires) into strokes
  chain(pieces, unit) {
    const at = new Map();
    pieces.forEach((p, i) => { for (const v of [p.va, p.vb]) if (v >= 0) { if (!at.has(v)) at.set(v, []); at.get(v).push(i); } });
    const dir = (p, fromV) => { const fwd = p.va === fromV; const dx = fwd ? p.x1 - p.x0 : p.x0 - p.x1, dy = fwd ? p.y1 - p.y0 : p.y0 - p.y1, l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
    const link = new Map();   // `${i}:${v}` → j
    for (const [v, list] of at) {
      if (list.length !== 2) continue;
      const [i, j] = list, P = pieces[i], Q = pieces[j];
      if (i === j) continue;
      const di = dir(P, v), dj = dir(Q, v);
      const cos = -(di[0] * dj[0] + di[1] * dj[1]);   // continuing straight through v gives cos ≈ 1
      if (cos > Math.cos((P.kind === 3 || Q.kind === 3 ? 70 : 38) * Math.PI / 180)) { link.set(`${i}:${v}`, j); link.set(`${j}:${v}`, i); }
    }
    const used = new Uint8Array(pieces.length), strokes = [];
    const walk = (start, fromV) => {   // enter piece `start` at its end fromV (−1: its a end)
      const pts = [], arc = []; let i = start, v = fromV, s3 = 0, seed = Infinity, kind = 9, dsum = 0, cnt = 0, head = -1, tail = -1;
      while (i !== undefined && !used[i]) {
        used[i] = 1;
        const p = pieces[i], fwd = cnt === 0 ? (fromV === -1 || p.va === fromV) : p.va === v;
        const [x0, y0, x1, y1, va, vb, ua, ub] = fwd ? [p.x0, p.y0, p.x1, p.y1, p.va, p.vb, p.ua, p.ub] : [p.x1, p.y1, p.x0, p.y0, p.vb, p.va, 1 - p.ub, 1 - p.ua];
        if (cnt === 0) { head = va; s3 = ua * p.len3; pts.push([x0, y0]); arc.push(s3); }
        s3 += (ub - ua) * p.len3; pts.push([x1, y1]); arc.push(s3);
        seed = Math.min(seed, p.eid); dsum += p.depth; cnt++; kind = Math.min(kind, p.kind);
        tail = vb; v = vb;
        i = vb >= 0 ? link.get(`${i}:${vb}`) : undefined;
      }
      const closed = head >= 0 && head === tail && pts.length > 3;
      strokes.push({ pts, arc, seed, kind, prim: pieces[start].prim, depth: dsum / cnt, closed, osA: head >= 0 && !closed, osB: tail >= 0 && !closed });
    };
    // open chains first, each from an end with no link; then whatever is left is a closed loop
    pieces.forEach((p, i) => {
      if (used[i]) return;
      const aLinked = p.va >= 0 && link.has(`${i}:${p.va}`), bLinked = p.vb >= 0 && link.has(`${i}:${p.vb}`);
      if (!aLinked) walk(i, p.va);
      else if (!bLinked) walk(i, p.vb);
    });
    pieces.forEach((p, i) => { if (!used[i]) walk(i, p.va); });
    // the pen: widths by kind, depth and prim weight; ends that are real corners overshoot
    const pen = this.look.pen;
    for (const s of strokes) {
      const base = s.kind === 2 ? pen.silhouette : s.kind === 0 ? pen.boundary : s.kind === 3 ? pen.wire : pen.crease;
      s.w = base * unit * clamp(Math.pow(4.5 / Math.max(0.3, s.depth), 0.42), 0.48, 1.3);
    }
    return strokes;
  }

  // draw strokes onto a 2D context (offset ox, oy; everything in the render's pixels × k)
  draw(ctx, strokes, set, opt = {}) {
    const pen = this.look.pen, unit = opt.unit ?? 1, k = opt.k ?? 1, ox = opt.ox ?? 0, oy = opt.oy ?? 0;
    const meta = set.edges.meta;
    ctx.save();
    ctx.translate(ox, oy); ctx.scale(k, k);
    ctx.fillStyle = opt.ink ?? this.look.ink;
    for (const s of strokes) {
      const m = meta[s.prim] || { weight: 1, detail: false };
      const w = s.w * (m.weight ?? 1) * (m.detail ? 0.72 : 1);
      penStroke(ctx, s, w, unit, pen);
    }
    ctx.restore();
  }
}

// one inked line with a pen's habits
function penStroke(ctx, s, w, unit, pen) {
  let pts = s.pts.map(p => [p[0], p[1]]);
  const arc = s.arc.slice();
  const seed = s.seed | 0;
  // total screen length
  let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  if (L < 1.2) return;
  // overshoot past real corners
  const os = (end) => Math.min(L * 0.22, unit * (pen.overshoot[0] + (pen.overshoot[1] - pen.overshoot[0]) * hash01(seed, end ? 11 : 13)));
  if (s.osA) { const o = os(0), [a, b] = [pts[0], pts[1]], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; pts.unshift([a[0] - (b[0] - a[0]) / l * o, a[1] - (b[1] - a[1]) / l * o]); arc.unshift(arc[0] - 0.02); L += o; }
  if (s.osB) { const o = os(1), n = pts.length, [a, b] = [pts[n - 2], pts[n - 1]], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; pts.push([b[0] + (b[0] - a[0]) / l * o, b[1] + (b[1] - a[1]) / l * o]); arc.push(arc[arc.length - 1] + 0.02); L += o; }
  const straight = pts.length <= 4 && s.kind !== 3;
  // long straight lines are sometimes drawn in two reaches
  if (straight && L > 300 * unit && hash01(seed, 5) < pen.split) {
    const a = pts[0], b = pts[pts.length - 1], c = 0.35 + 0.3 * hash01(seed, 6), ov = 3 * unit / L;
    const mid = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    line(ctx, [a, mid(c + ov)], [arc[0], arc[0] + (arc[arc.length - 1] - arc[0]) * c], w, unit, pen, seed, true, false);
    line(ctx, [mid(c - ov), b], [arc[0] + (arc[arc.length - 1] - arc[0]) * c, arc[arc.length - 1]], w * 0.96, unit, pen, seed + 101, false, true);
    return;
  }
  line(ctx, straight ? [pts[0], pts[pts.length - 1]] : pts, straight ? [arc[0], arc[arc.length - 1]] : arc, w, unit, pen, seed, true, true, s.closed);
  // the odd doubled line (a second, lighter pass)
  if (straight && L > 50 * unit && hash01(seed, 3) < pen.doubles) {
    const a = pts[0], b = pts[pts.length - 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
    const off = (1.2 + 1.2 * hash01(seed, 8)) * unit * (hash01(seed, 9) < 0.5 ? -1 : 1), t0 = 0.1 * hash01(seed, 10), t1 = 1 - 0.3 * hash01(seed, 12);
    line(ctx, [[a[0] + (b[0] - a[0]) * t0 + nx * off, a[1] + (b[1] - a[1]) * t0 + ny * off], [a[0] + (b[0] - a[0]) * t1 + nx * off * 0.4, a[1] + (b[1] - a[1]) * t1 + ny * off * 0.4]],
      [arc[0], arc[arc.length - 1]], w * 0.5, unit, pen, seed + 57, false, false);
  }
}

// fill a variable-width line along pts (screen) with wobble parameterised by 3D arc length (stable under camera moves)
function line(ctx, pts, arc, w, unit, pen, seed, dotStart, taperEnd, closed = false) {
  // resample the polyline evenly
  const segL = [], P = []; let L = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segL.push(l); L += l; }
  if (L < 1) return;
  const n = Math.max(3, Math.min(90, Math.round(L / (6 * unit))));
  const bow = pts.length === 2 ? (hash01(seed, 1) * 2 - 1) * Math.min(L * pen.bow, 2.6 * unit) : 0;
  let si = 0, acc = 0;
  const left = [], right = [];
  for (let j = 0; j <= n; j++) {
    const d = (L * j) / n;
    while (si < segL.length - 1 && acc + segL[si] < d) { acc += segL[si]; si++; }
    const f = segL[si] ? (d - acc) / segL[si] : 0;
    const a = pts[si], b = pts[si + 1];
    const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
    const tx = (b[0] - a[0]) / (segL[si] || 1), ty = (b[1] - a[1]) / (segL[si] || 1), nx = -ty, ny = tx;
    const u = j / n, a3 = arc[si] + ((arc[si + 1] ?? arc[si]) - arc[si]) * f;
    const off = bow * 4 * u * (1 - u) + noise1(a3 * 2.6 + seed * 0.37, seed) * pen.wobble * unit;
    // pressure: quick press at the start, a lift at the end
    let pw = w * (0.62 + 0.38 * smooth(0, 0.07, u));
    if (taperEnd) pw *= 1 - 0.62 * smooth(0.8, 1, u); else pw *= 1 - 0.3 * smooth(0.9, 1, u);
    if (closed) pw = w * (0.85 + 0.15 * noise1(u * 5, seed));
    pw = Math.max(0.35 * unit, pw) / 2;
    left.push([x + nx * (off + pw), y + ny * (off + pw)]);
    right.push([x + nx * (off - pw), y + ny * (off - pw)]);
    if (j === 0) P.push([x + nx * off, y + ny * off]);
  }
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (let j = 1; j < left.length; j++) ctx.lineTo(left[j][0], left[j][1]);
  for (let j = right.length - 1; j >= 0; j--) ctx.lineTo(right[j][0], right[j][1]);
  ctx.closePath(); ctx.fill();
  if (dotStart && !closed && hash01(seed, 7) < pen.dots) { ctx.beginPath(); ctx.arc(P[0][0], P[0][1], w * 0.62, 0, Math.PI * 2); ctx.fill(); }
}

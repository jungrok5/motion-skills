// sight-gag-short · film.js — the film: one sunny set, shots that each hold one gag, cue marks that drive both the
// motion and the sound, the look (sky, warm sun with crisp shadows, blue sky fill, environment reflections, a mirror
// for puddles), the post chain (sub-frame motion blur → PBR-Neutral tone map → grade → vignette → grain → title
// overlay), painted FX (puffs, dizzy stars, sweat, splash drops, speed lines), a live player with sound, and the render
// contract (window.seek(t), DURATION, FPS, SIZE, __ready).
import * as THREE from "three";
import { K, clamp, lerp, rng, noise1, ease, TAU, DEG } from "./core.js";
import * as P from "./paint.js";
import * as KIT from "./kit.js";

const Q = new URLSearchParams(location.search);
export const RENDER = Q.has("render");

/** the look as numbers (override any of it with new Film({ look: { … } })) */
export const LOOK = {
  sky: { zenith: "#4f8fdc", mid: "#8cbcef", horizon: "#dcecf7" },
  sun: { dir: [-0.6, 0.8, 0.42], color: "#fff0da", i: 3.6, shadow: 2048, radius: 1.6, extent: 13 },
  hemi: { sky: "#b3d0ff", ground: "#e6d3bb", i: 1.1 },
  rim: { color: "#d6e4ff", i: 1.1 },
  env: 0.55,
  fog: { color: "#d2e3f2", near: 40, far: 170 },
  exposure: 1.0,
  grade: { sat: 1.1, contrast: 1.07, lift: [0.012, 0.018, 0.04], shadowTint: [0.9, 0.96, 1.1], highTint: [1.04, 1.0, 0.95], vignette: 0.2, grain: 0.022 },
  clouds: 7,
};

const POST_FRAG = `
precision highp float; varying vec2 vUv;
uniform sampler2D tScene, tTitle; uniform float uExposure, uSat, uContrast, uVig, uGrain, uSeed, uTitle, uFade;
uniform vec3 uLift, uShTint, uHiTint, uFadeCol; uniform vec2 uRes;
vec3 neutral(vec3 c){ const float s=0.8-0.04, d=0.15; float x=min(c.r,min(c.g,c.b)); float o=x<0.08?x-6.25*x*x:0.04; c-=o;
  float p=max(c.r,max(c.g,c.b)); if(p<s) return c; float n=1.0-s; float np=1.0-n*n/(p+n-s); c*=np/p; float g=1.0-1.0/(d*(p-np)+1.0); return mix(c,vec3(np),g); }
vec3 srgb(vec3 c){ return mix(c*12.92, 1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-0.055, step(vec3(0.0031308),c)); }
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))+uSeed)*43758.5453); }
void main(){
  vec3 c = texture2D(tScene, vUv).rgb * uExposure;
  c = neutral(c);
  float l = dot(c, vec3(0.2126,0.7152,0.0722));
  c *= mix(uShTint, uHiTint, smoothstep(0.15, 0.75, l));
  c = srgb(clamp(c,0.0,1.0));
  c = (c - 0.5) * uContrast + 0.5;
  float l2 = dot(c, vec3(0.2126,0.7152,0.0722));
  c = mix(vec3(l2), c, uSat);
  c += uLift * (1.0 - l2);
  vec2 q = vUv - 0.5; q.x *= uRes.x/uRes.y;
  c *= 1.0 - uVig * smoothstep(0.35, 1.05, length(q));
  c += (h(vUv*uRes) - 0.5) * uGrain;
  vec4 T = texture2D(tTitle, vUv); c = mix(c, T.rgb, T.a * uTitle);
  c = mix(c, uFadeCol, uFade);
  gl_FragColor = vec4(clamp(c,0.0,1.0), 1.0);
}`;
const QUAD_VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
const ACC_FRAG = "precision highp float; varying vec2 vUv; uniform sampler2D t; uniform float w; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb * w, 1.0); }";
const SKY_FRAG = `varying vec3 vD; uniform vec3 cz, cm, ch, cg; void main(){ vec3 d = normalize(vD); float e = d.y;
  vec3 c = e > 0.0 ? mix(ch, mix(cm, cz, smoothstep(0.18, 0.75, e)), smoothstep(0.0, 0.18, e)) : mix(ch, cg, smoothstep(0.0, -0.2, e)); gl_FragColor = vec4(c, 1.0); }`;
const SKY_VERT = "varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }";

const lin = (hex) => new THREE.Color(hex); // THREE.Color parses sRGB hex into linear working space

export class Film {
  /**
   * new Film({ W, H, fps, bpm, title, look, fonts })
   *   bpm: the groove tempo — cuts are checked against its beat grid. look: overrides of LOOK.
   */
  constructor(o = {}) {
    this.W = o.W || 1920; this.H = o.H || 1080; this.fps = o.fps || 30; this.bpm = o.bpm || 120; this.name = o.title || "film";
    this.look = deep(structuredClone(LOOK), o.look || {});
    this.shots = []; this.actors = []; this.mirrors = []; this.titles = []; this.duration = 0; this.ground = KIT.groundAt;
    this.scale = +(Q.get("scale") || (RENDER ? 1 : 0)) || 0;
    this.mbN = RENDER ? +(Q.get("mb") || 5) : 1;
    this.off = new Set((Q.get("off") || "").split(",").filter(Boolean));
    this.fonts = o.fonts || [];
  }

  /** load fonts (sign and title faces) — await before building signs */
  async load(base = new URL("../fonts/", import.meta.url).href) {
    const faces = [["Barlow Condensed", "BarlowCondensed-700.woff2", "700"], ...this.fonts];
    await Promise.all(faces.map(async ([fam, file, w]) => { try { const f = new FontFace(fam, `url(${file.includes("/") ? file : base + file})`, { weight: w }); await f.load(); document.fonts.add(f); } catch (e) { console.warn("font", file, e.message); } }));
    this.init(); return this;
  }

  init() {
    const L = this.look;
    let w = this.W, h = this.H;
    if (this.scale) { w = Math.round(this.W * this.scale); h = Math.round(this.H * this.scale); }
    else if (!RENDER) { const k = Math.min(1, Math.max(0.5, (Math.min(innerWidth, 1600) * Math.min(devicePixelRatio, 2)) / this.W)); w = Math.round(this.W * k); h = Math.round(this.H * k); }
    this.w = w; this.h = h;
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" }));
    r.setPixelRatio(1); r.setSize(w, h, false); r.toneMapping = THREE.NoToneMapping; r.outputColorSpace = THREE.LinearSRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap; r.localClippingEnabled = true;
    this.canvas = r.domElement;
    const samples = this.off.has("aa") ? 0 : 4;
    this.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples, colorSpace: THREE.LinearSRGBColorSpace });
    this.acc = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false });
    this.scene = new THREE.Scene(); this.world = new THREE.Group(); this.scene.add(this.world);
    this.camera = new THREE.PerspectiveCamera(30, this.W / this.H, 0.1, 600);
    this.scene.fog = new THREE.Fog(lin(L.fog.color), L.fog.near, L.fog.far);
    // sky dome
    const sky = new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { cz: { value: lin(L.sky.zenith) }, cm: { value: lin(L.sky.mid) }, ch: { value: lin(L.sky.horizon) }, cg: { value: lin(L.hemi.ground) } } });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), sky); this.sky.frustumCulled = false; this.sky.renderOrder = -10; this.scene.add(this.sky);
    // environment for reflections: the sky + a warm ground + a sun spot, prefiltered once
    const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), sky.clone()));
    const sunBall = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(L.sun.color).multiplyScalar(18) }));
    sunBall.position.set(...L.sun.dir.map((v) => v * 40)); envScene.add(sunBall);
    const pm = new THREE.PMREMGenerator(r); this.scene.environment = pm.fromScene(envScene, 0.02).texture; this.scene.environmentIntensity = L.env; pm.dispose();
    // lights
    this.hemi = new THREE.HemisphereLight(lin(L.hemi.sky), lin(L.hemi.ground), L.hemi.i);
    this.sun = new THREE.DirectionalLight(lin(L.sun.color), L.sun.i);
    this.sun.castShadow = !this.off.has("shadow"); this.sun.shadow.mapSize.set(L.sun.shadow, L.sun.shadow); this.sun.shadow.radius = L.sun.radius;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.025;
    // a cool back light from behind-right: a thin rim that lifts characters off the walls (no shadow)
    this.rim = new THREE.DirectionalLight(lin(L.rim?.color || "#cfe0ff"), L.rim?.i ?? 1.1); this.rim.position.set(6, 5, -8);
    this.scene.add(this.hemi, this.sun, this.sun.target, this.rim);
    // painted clouds on a far band behind the street
    this.clouds = new THREE.Group(); this.scene.add(this.clouds);
    // post
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.titleCanvas = P.canvas(w, h); this.titleTex = new THREE.CanvasTexture(this.titleCanvas); this.titleTex.colorSpace = THREE.NoColorSpace;
    this.post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: POST_FRAG, depthTest: false, depthWrite: false,
      uniforms: { tScene: { value: null }, tTitle: { value: this.titleTex }, uExposure: { value: L.exposure }, uSat: { value: L.grade.sat }, uContrast: { value: L.grade.contrast }, uVig: { value: this.off.has("vignette") ? 0 : L.grade.vignette },
        uGrain: { value: this.off.has("grain") ? 0 : L.grade.grain }, uSeed: { value: 0 }, uTitle: { value: 0 }, uFade: { value: 0 }, uFadeCol: { value: new THREE.Vector3(1, 1, 1) },
        uLift: { value: new THREE.Vector3(...L.grade.lift) }, uShTint: { value: new THREE.Vector3(...L.grade.shadowTint) }, uHiTint: { value: new THREE.Vector3(...L.grade.highTint) }, uRes: { value: new THREE.Vector2(w, h) } } }));
    this.postScene = new THREE.Scene(); this.postScene.add(this.post);
    this.accQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: ACC_FRAG, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true, uniforms: { t: { value: this.rt.texture }, w: { value: 1 } } }));
    this.accScene = new THREE.Scene(); this.accScene.add(this.accQuad);
    this.fx = new FX(this);
  }

  // ------------------------------------------------------------ building
  /** add objects to the set; meshes cast and receive shadows unless their flags were set false */
  add(...objs) { for (const o of objs) this.world.add(o); return objs[0]; }
  /** the kit bound to this film: S.building({...}) builds AND adds */
  get S() {
    if (this._S) return this._S;
    const S = {};
    for (const [k, fn] of Object.entries(KIT)) if (typeof fn === "function" && !["mat", "basic", "merge", "box", "uvScale", "boxUV", "mesh", "lathe", "rbox", "groundAt"].includes(k))
      S[k] = (o = {}) => { const obj = fn(o); const { at, ry = 0, s } = o; if (at) obj.position.set(at[0], at[1] ?? 0, at[2] ?? 0); if (ry) obj.rotation.y = ry; if (s) obj.scale.setScalar(s); this.world.add(obj); return obj; };
    return (this._S = S);
  }
  /** register something posed per shot (figures, gadgets, props that move): it is hidden at the start of every frame */
  actor(a) { this.actors.push(a); if (a.root && !a.root.parent) this.world.add(a.root); return a; }
  /** a prop that moves: an Object3D wrapped as an actor (hidden unless placed in the shot) */
  prop(obj) { this.world.add(obj); const a = { root: obj, reset() { obj.visible = false; }, at(p, rot = [0, 0, 0], s = 1) { obj.visible = true; obj.position.set(...p); obj.rotation.set(...rot); if (Array.isArray(s)) obj.scale.set(...s); else obj.scale.setScalar(s); return a; } }; this.actors.push(a); return a; }
  /** clouds({ n, z, y, seed }) — painted cumulus cards on a band behind the street */
  cloudBand(o = {}) {
    o = { n: this.look.clouds, from: -40, to: 120, z: -150, y: [28, 55], seed: 3, ...o }; const r = rng(o.seed);
    for (let i = 0; i < o.n; i++) {
      const c = P.cloud({ seed: o.seed * 10 + i }), m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), new THREE.MeshBasicMaterial({ map: c.map, transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1.15, 1.15, 1.18) }));
      const w = 40 + r() * 40; m.scale.set(w, w, 1); m.position.set(lerp(o.from, o.to, (i + r() * 0.6) / o.n), lerp(o.y[0], o.y[1], r()), o.z - r() * 30); m.renderOrder = -5; this.clouds.add(m);
    }
  }
  /** mirror({ at:[x,y,z], w, d, shape: "blob"|"ellipse"|"rect", tint, seed, rough }) — a reflective puddle / pond surface */
  mirror(o = {}) {
    o = { at: [0, 0.006, 1.6], w: 3, d: 1.2, shape: "blob", tint: "#9fb4c8", seed: 5, strength: 0.85, ...o };
    const res = RENDER ? 0.5 : 0.35, rt = new THREE.WebGLRenderTarget(Math.round(this.w * res), Math.round(this.h * res), { type: THREE.HalfFloatType });
    const mask = P.canvas(256, 256), g = mask.getContext("2d"), r = rng(o.seed);
    g.fillStyle = "#000"; g.fillRect(0, 0, 256, 256);
    if (o.shape === "rect") { g.fillStyle = "#fff"; g.fillRect(4, 4, 248, 248); }
    else if (o.shape === "ellipse") { g.fillStyle = "#fff"; g.beginPath(); g.ellipse(128, 128, 124, 124, 0, 0, 7); g.fill(); }
    else { g.filter = "blur(3px)"; for (let i = 0; i < 5; i++) { P.blob(g, r, 128 + (r() - 0.5) * 90, 128 + (r() - 0.5) * 50, 50 + r() * 40, 0.5, 16); g.fillStyle = "#fff"; g.fill(); } g.filter = "none"; }
    const mt = P.tex(mask, { srgb: false }); mt.wrapS = mt.wrapT = THREE.ClampToEdgeWrapping;
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false,
      uniforms: { tRef: { value: rt.texture }, tMask: { value: mt }, tint: { value: lin(o.tint) }, k: { value: o.strength }, texM: { value: new THREE.Matrix4() } },
      vertexShader: "varying vec2 vUv; varying vec4 vR; uniform mat4 texM; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vR = texM * w; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: "varying vec2 vUv; varying vec4 vR; uniform sampler2D tRef, tMask; uniform vec3 tint; uniform float k; void main(){ float m = texture2D(tMask, vUv).r; if (m < 0.02) discard; vec3 c = texture2DProj(tRef, vR).rgb; float edge = smoothstep(0.02, 0.5, m); gl_FragColor = vec4(mix(tint*0.6, c*tint*1.25, k), edge*0.97); }" });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.d).rotateX(-Math.PI / 2), mat); m.position.set(...o.at); m.renderOrder = 1; m.receiveShadow = false;
    this.world.add(m); const M = { mesh: m, rt, mat, y: o.at[1], o }; this.mirrors.push(M); return M;
  }

  // ------------------------------------------------------------ timeline
  /**
   * shot({ id, dur, marks, sfx, mb, fn }) — one gag (or a beat of one). fn(t, s) poses everything for local time t:
   *   s.cam(pos, at, fov, roll) · s.m (marks: name → local seconds) · s.u (t/dur) · s.T (absolute time) · s.fx (FX)
   *   marks are the gag's beats (e.g. { notice: .8, wind: 1.2, flick: 1.45, land: 1.8 }); motion keys use them, and
   *   sfx: [["snap", "flick"], ["clang", "land", 0.02], ["boing", 2.4]] turns them into sound cues (score.mjs, live ♪).
   */
  shot(o) {
    const s = { id: o.id || "s" + this.shots.length, dur: o.dur, marks: o.marks || {}, sfx: o.sfx || [], mb: o.mb ?? 0.5, fn: o.fn, from: this.duration, beats: o.beats, kind: o.kind || "gag" };
    s.to = s.from + s.dur; this.duration = s.to; this.shots.push(s); return s;
  }
  /** title({ at, dur, text, sub, font, color, ink, size, pos: "center"|"low", x: 0…1 }) — the pun card over the last beat (x: its centre, as a fraction of the width) */
  title(o) { this.titles.push({ at: 0, dur: 2.5, text: "", sub: "", color: "#ffffff", ink: "#20232b", pos: "center", ...o }); }
  /** all sound cues on the absolute timeline: [{ t, kind, gain, pitch, pan, shot }] */
  cues() {
    const out = [];
    for (const s of this.shots) for (const c of s.sfx) {
      const [kind, at, off = 0, extra = {}] = c, lt = typeof at === "number" ? at : s.marks[at];
      if (lt == null) { console.error(`shot ${s.id}: sfx ${kind} refers to unknown mark ${at}`); continue; }
      out.push({ t: +(s.from + lt + (typeof off === "number" ? off : 0)).toFixed(4), kind, shot: s.id, ...(typeof off === "object" ? off : extra) });
    }
    return out.sort((a, b) => a.t - b.t);
  }
  shotAt(t) { for (const s of this.shots) if (t < s.to) return s; return this.shots[this.shots.length - 1]; }

  // ------------------------------------------------------------ a frame
  pose(t) {
    t = clamp(t, 0, Math.max(0, this.duration - 1e-4));
    const s = this.shotAt(t), lt = t - s.from;
    const cam = this.camera; let roll = 0;
    const ctx = { dur: s.dur, m: s.marks, u: lt / s.dur, T: t, fx: this.fx, id: s.id, film: this,
      cam: (pos, at, fov = 30, rl = 0) => { cam.position.set(...pos); cam.up.set(0, 1, 0); cam.lookAt(...at); cam.fov = fov; roll = rl; cam.updateProjectionMatrix(); ctx._at = at; },
      shake: (amp, t0, decay = 7, hz = 19) => { const a = lt - t0; if (a < 0) return; const k = amp * Math.exp(-decay * a); cam.position.x += noise1(a * hz, 3) * k; cam.position.y += noise1(a * hz, 7) * k; },
      mirror: (m) => { m.mesh.visible = true; } };
    // two passes: anything a shot reads from another actor (a gaze at a head, a prop on a fingertip) is this frame's
    // value in the second pass whatever the order of the code — so a frame never depends on the previous one
    for (let pass = 0; pass < 2; pass++) {
      for (const a of this.actors) a.reset();
      for (const m of this.mirrors) m.mesh.visible = false;
      this.fx.begin(); roll = 0;
      s.fn(lt, ctx);
    }
    if (roll) cam.rotateZ(roll);
    cam.updateMatrixWorld();
    // the sun follows the framing so its shadow map always covers what the camera sees
    const at = ctx._at || [cam.position.x, 0, 0], L = this.look.sun, E = L.extent;
    const focus = new THREE.Vector3(at[0], 0, Math.min(at[2], 2));
    this.sun.target.position.copy(focus); this.sun.position.copy(focus).add(new THREE.Vector3(...L.dir).normalize().multiplyScalar(60));
    const sc = this.sun.shadow.camera; sc.left = -E; sc.right = E; sc.top = E; sc.bottom = -E; sc.near = 1; sc.far = 140; sc.updateProjectionMatrix();
    this.sky.position.copy(cam.position);
    this.clouds.position.x = cam.position.x * 0.85; // parallax: far clouds drift slower than the street
    this.fx.end();
    this._shot = s; this._lt = lt;
    return s;
  }
  renderMirrors() {
    const cam = this.camera;
    for (const M of this.mirrors) {
      if (!M.mesh.visible) continue;
      const y = M.mesh.position.y, rc = (M.cam ||= new THREE.PerspectiveCamera());
      rc.copy(cam); rc.position.y = 2 * y - cam.position.y;
      const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd); fwd.y *= -1;
      const up = cam.up.clone(); rc.up.set(0, 1, 0);
      rc.lookAt(rc.position.clone().add(fwd)); rc.scale.set(1, 1, 1); rc.updateMatrixWorld(); rc.projectionMatrix.copy(cam.projectionMatrix);
      // flip vertically in texture space instead of mirroring geometry: sample with a y-flipped projection
      const tm = M.mat.uniforms.texM.value;
      tm.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(rc.projectionMatrix).multiply(rc.matrixWorldInverse);
      M.mesh.visible = false; const fog = this.scene.fog; this.renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -y + 0.01)];
      this.renderer.setRenderTarget(M.rt); this.renderer.render(this.scene, rc); this.renderer.clippingPlanes = []; M.mesh.visible = true; this.scene.fog = fog;
    }
  }
  /** screen positions (px) of every visible actor's root, the glove's fingertip and every FX-free prop, at time t */
  screenPts(t) {
    this.pose(t); const out = [], v = new THREE.Vector3(), cam = this.camera;
    const push = (p) => { v.copy(p).project(cam); out.push([v.x * this.w * 0.5, v.y * this.h * 0.5]); };
    for (const a of this.actors) { if (!a.root?.visible) continue; push(a.root.getWorldPosition(new THREE.Vector3())); if (a.head) push(a.head.getWorldPosition(new THREE.Vector3())); if (a.fingers) push(new THREE.Vector3(...a.point("tip"))); }
    push(new THREE.Vector3(cam.position.x, cam.position.y, cam.position.z - 10)); // camera moves
    return out;
  }
  /** render time t to the canvas */
  seek(t) {
    const r = this.renderer, shot = this.shotAt(clamp(t, 0, this.duration - 1e-4));
    const N = this.off.has("mb") ? 1 : Math.max(1, this.mbN), shutter = typeof shot.mb === "function" ? shot.mb(t - shot.from) : shot.mb;
    let n = shutter > 0.01 ? N : 1;
    // auto: blur only frames where something actually moves fast on screen (> 2.5 px across the shutter)
    if (n > 1 && !this.off.has("mbauto")) { const a = this.screenPts(clamp(t - 0.5 * shutter / this.fps, shot.from, shot.to - 1e-4)), b = this.screenPts(clamp(t + 0.5 * shutter / this.fps, shot.from, shot.to - 1e-4)); let d = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) d = Math.max(d, Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1])); if (d < 2.5) n = 1; else n = Math.min(N, Math.max(3, Math.ceil(d / 6))); }
    if (n === 1) { this.pose(t); this.renderMirrors(); r.setRenderTarget(this.rt); r.render(this.scene, this.camera); this.post.material.uniforms.tScene.value = this.rt.texture; }
    else {
      r.setRenderTarget(this.acc); r.setClearColor(0x000000, 1); r.clear();
      for (let k = 0; k < n; k++) {
        let ts = t + ((k + 0.5) / n - 0.5) * (shutter / this.fps);
        ts = clamp(ts, shot.from, shot.to - 1e-4); // never blur across a cut
        this.pose(ts); this.renderMirrors(); r.setRenderTarget(this.rt); r.render(this.scene, this.camera);
        this.accQuad.material.uniforms.w.value = 1 / n; r.setRenderTarget(this.acc); r.autoClear = false; r.render(this.accScene, this.quadCam); r.autoClear = true;
      }
      this.pose(t);
      this.post.material.uniforms.tScene.value = this.acc.texture;
    }
    this.drawTitle(t);
    const U = this.post.material.uniforms; U.uSeed.value = (Math.round(t * this.fps) % 97) * 1.37;
    U.uFade.value = this.fade ? this.fade(t) : 0;
    r.setRenderTarget(null); r.render(this.postScene, this.quadCam);
  }
  drawTitle(t) {
    const g = this.titleCanvas.getContext("2d"), W = this.titleCanvas.width, H = this.titleCanvas.height, U = this.post.material.uniforms;
    const T = this.titles.find((x) => t >= x.at && t < x.at + x.dur);
    if (!T) { if (U.uTitle.value) { g.clearRect(0, 0, W, H); this.titleTex.needsUpdate = true; } U.uTitle.value = 0; return; }
    g.clearRect(0, 0, W, H); const lt = t - T.at, k = W / 1920;
    const out = 1 - ease("i2", (lt - (T.dur - 0.35)) / 0.35);
    const fs = (T.size || 150) * k, cy = T.pos === "low" ? H * 0.78 : H * 0.46, letters = [...T.text];
    g.font = `700 ${fs}px "${T.font || P.FONT.title}", sans-serif`; g.textBaseline = "middle"; g.textAlign = "left";
    const widths = letters.map((l) => g.measureText(l).width), total = widths.reduce((a, b) => a + b, 0) + (letters.length - 1) * fs * 0.02;
    const cx = W * (T.x ?? 0.5); let x = cx - total / 2;
    letters.forEach((l, i) => {
      const a = lt - i * 0.045, u = ease("back", a / 0.32), y = cy + (1 - u) * fs * 0.5, s = 0.4 + 0.6 * u;
      if (a > 0) {
        g.save(); g.translate(x + widths[i] / 2, y); g.scale(s, s); g.rotate((1 - u) * 0.25 * (i % 2 ? 1 : -1)); g.globalAlpha = clamp(a / 0.12) * out;
        g.lineJoin = "round"; g.lineWidth = fs * 0.16; g.strokeStyle = T.ink; g.strokeText(l, -widths[i] / 2, fs * 0.06);
        g.fillStyle = T.ink; g.fillText(l, -widths[i] / 2, fs * 0.09); g.fillStyle = T.color; g.fillText(l, -widths[i] / 2, 0); g.restore();
      }
      x += widths[i] + fs * 0.02;
    });
    if (T.sub) { const a = clamp((lt - 0.5) / 0.3) * out; g.globalAlpha = a; g.font = `700 ${fs * 0.26}px "${T.font || P.FONT.title}", sans-serif`; g.textAlign = "center"; g.lineWidth = fs * 0.06; g.strokeStyle = T.ink; g.strokeText(T.sub, cx, cy + fs * 0.72); g.fillStyle = T.color; g.fillText(T.sub, cx, cy + fs * 0.72); g.globalAlpha = 1; }
    this.titleTex.needsUpdate = true; U.uTitle.value = 1;
  }

  // ------------------------------------------------------------ rules
  /** the format's rules; returns warnings (check.mjs prints them; FAIL lines start with "FAIL") */
  check() {
    const w = [], beat = 60 / this.bpm, gags = this.shots.filter((s) => s.kind === "gag");
    if (this.duration < 18 || this.duration > 60) w.push(`duration ${this.duration.toFixed(1)} s (the format is 25–45 s)`);
    if (gags.length < 3) w.push(`only ${gags.length} gag shots (the format strings 4–7 gags)`);
    for (const s of this.shots) {
      if (s.kind === "gag" && (s.dur < 2.8 || s.dur > 7)) w.push(`shot ${s.id}: ${s.dur.toFixed(2)} s — a gag reads in 3.5–5 s`);
      const off = (s.to / beat) % 1; if (Math.min(off, 1 - off) * beat > 1.01 / this.fps && s !== this.shots[this.shots.length - 1]) w.push(`shot ${s.id} cuts ${(Math.min(off, 1 - off) * beat).toFixed(3)} s off the beat (${this.bpm} bpm)`);
      if (s.kind === "gag") for (const need of ["notice", "act", "button"]) if (!(need in s.marks)) w.push(`shot ${s.id}: no "${need}" mark (every gag has setup → notice → act → result → button)`);
      for (const [k, v] of Object.entries(s.marks)) if (v < 0 || v > s.dur) w.push(`FAIL shot ${s.id}: mark ${k}=${v} is outside the shot`);
    }
    return w;
  }

  // ------------------------------------------------------------ start: contract + live player
  start(SCORE, renderScore) {
    Object.assign(window, { SCORE: SCORE || null, film: this, seek: (t) => this.seek(t), DURATION: this.duration, FPS: this.fps, SIZE: { W: this.W, H: this.H }, shotAt: (t) => this.shotAt(t).id, cues: () => this.cues(), runChecks: () => this.check() });
    document.body.style.margin = "0"; document.body.style.background = "#0d0f14";
    const c = this.canvas; document.body.appendChild(c);
    if (RENDER) { c.style.cssText = "display:block"; this.seek(+(Q.get("t") || 0)); window.__ready = true; return; }
    if (Q.has("t")) { c.style.cssText = "display:block;width:min(100vw, calc(100vh*16/9));height:auto;margin:auto;position:absolute;inset:0"; this.seek(+Q.get("t")); window.__ready = true; return; }
    this.player(SCORE, renderScore); window.__ready = true;
  }
  player(SCORE, renderScore) {
    const c = this.canvas, wrap = document.createElement("div");
    wrap.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0d0f14";
    c.style.cssText = "max-width:100vw;max-height:100vh;width:auto;height:auto;aspect-ratio:16/9;width:min(100vw, calc(100vh*16/9));display:block";
    wrap.appendChild(c); document.body.appendChild(wrap);
    const bar = document.createElement("div");
    bar.style.cssText = "position:fixed;left:0;right:0;bottom:0;height:44px;display:flex;align-items:center;gap:10px;padding:0 12px;background:linear-gradient(transparent,rgba(0,0,0,.55));font:600 13px system-ui,sans-serif;color:#fff;opacity:.0;transition:opacity .25s";
    bar.innerHTML = `<button data-k="play" style="all:unset;cursor:pointer;width:28px;text-align:center;font-size:16px">❚❚</button><div data-k="track" style="flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.25);cursor:pointer;position:relative"><div data-k="fill" style="position:absolute;inset:0 auto 0 0;background:#f2c14e;border-radius:3px"></div></div><span data-k="time" style="min-width:70px;text-align:right;font-variant-numeric:tabular-nums">0.0</span><button data-k="snd" title="sound" style="all:unset;cursor:pointer;font-size:16px;width:24px;text-align:center">♪</button>`;
    document.body.appendChild(bar);
    const $ = (k) => bar.querySelector(`[data-k=${k}]`);
    let playing = !Q.has("paused"), t = 0, last = performance.now(), audio = null, src = null, ac = null, sound = false;
    const show = () => { bar.style.opacity = 1; clearTimeout(this._hide); this._hide = setTimeout(() => (bar.style.opacity = 0), 1800); };
    addEventListener("pointermove", show);
    const stopSnd = () => { try { src?.stop(); } catch {} src = null; };
    const startSnd = () => { if (!sound || !audio || !playing) return; stopSnd(); src = ac.createBufferSource(); src.buffer = audio; src.connect(ac.destination); src.start(0, t); this._sndT0 = ac.currentTime - t; };
    const toggle = () => { playing = !playing; $("play").textContent = playing ? "❚❚" : "►"; last = performance.now(); if (playing) startSnd(); else stopSnd(); };
    c.addEventListener("click", toggle); $("play").onclick = toggle;
    addEventListener("keydown", (e) => { if (e.code === "Space") { e.preventDefault(); toggle(); } if (e.code === "ArrowRight") { t = Math.min(this.duration - 0.01, t + 2); startSnd(); } if (e.code === "ArrowLeft") { t = Math.max(0, t - 2); startSnd(); } show(); });
    const seekBar = (e) => { const r = $("track").getBoundingClientRect(); t = clamp((e.clientX - r.left) / r.width) * this.duration; startSnd(); };
    $("track").addEventListener("pointerdown", (e) => { seekBar(e); const mv = (ev) => seekBar(ev); addEventListener("pointermove", mv); addEventListener("pointerup", () => removeEventListener("pointermove", mv), { once: true }); });
    $("snd").onclick = async () => {
      sound = !sound; $("snd").style.opacity = sound ? 1 : 0.5;
      if (sound && !audio && SCORE && renderScore) {
        $("snd").textContent = "…"; await new Promise((r) => setTimeout(r, 30));
        ac = new AudioContext(); const sr = ac.sampleRate, mix = renderScore({ ...SCORE, cues: this.cues() }, sr, this.duration);
        audio = ac.createBuffer(2, mix.L.length, sr); audio.copyToChannel(mix.L, 0); audio.copyToChannel(mix.R, 1); $("snd").textContent = "♪";
      }
      if (sound) { await ac.resume(); startSnd(); } else stopSnd();
    };
    $("snd").style.opacity = 0.5; if (!SCORE) $("snd").style.display = "none";
    const loop = (now) => {
      if (playing) { if (sound && src) t = ac.currentTime - this._sndT0; else t += (now - last) / 1000; if (t >= this.duration) { t = 0; startSnd(); } }
      last = now; this.seek(t); $("fill").style.width = (100 * t / this.duration).toFixed(2) + "%"; $("time").textContent = `${t.toFixed(1)} / ${this.duration.toFixed(0)}`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop); show();
  }
}

// ------------------------------------------------------------ FX: painted puffs, dizzy stars, sweat, drops, speed lines
/**
 * FX are evaluated from their start time each frame (no state): s.fx.puff(t0, { at, n, size, dur, rise, spread, color, seed })
 * draws the puff as it looks `t − t0` seconds after it started. Call them every frame of the shot with the same args.
 */
export class FX {
  constructor(film) {
    this.f = film; this.pool = []; this.used = 0; this.group = new THREE.Group(); film.scene.add(this.group);
    this.tex = { puff: P.puffTex(41).map, puff2: P.puffTex(43).map, spot: P.spot().map, star: starTex(), drop: dropTex(), line: lineTex() };
  }
  begin() { this.used = 0; this.t = this.f._ltNow; }
  end() { for (let i = this.used; i < this.pool.length; i++) this.pool[i].visible = false; }
  sprite(map, color = "#ffffff", opacity = 1, blending = THREE.NormalBlending) {
    let s = this.pool[this.used];
    if (!s) { s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); s.renderOrder = 3; this.group.add(s); this.pool.push(s); }
    this.used++; s.visible = true; const m = s.material; m.map = map; m.color.set(color); m.opacity = opacity; m.blending = blending; m.rotation = 0; m.needsUpdate = true; m.depthTest = true; m.fog = true;
    return s;
  }
  /** a puff of steam / dust: n lumps expanding, rising and fading over dur */
  puff(t, t0, o = {}) {
    o = { at: [0, 1, 0], n: 6, size: 0.5, dur: 0.9, rise: 0.6, spread: 0.5, color: "#ffffff", seed: 1, dir: [0, 0, 0], opacity: 0.95, ...o };
    const a = t - t0; if (a < 0 || a > o.dur) return; const r = rng(o.seed), u = a / o.dur;
    for (let i = 0; i < o.n; i++) {
      const ang = r() * TAU, sp = o.spread * (0.4 + r() * 0.6), k = 1 - (1 - u) ** 2.2, dl = r() * 0.15;
      if (u < dl) { r(); continue; }
      const s = this.sprite(i % 2 ? this.tex.puff : this.tex.puff2, o.color, o.opacity * (1 - u) ** 1.4 * clamp((u - dl) * 12));
      s.position.set(o.at[0] + Math.cos(ang) * sp * k + o.dir[0] * k, o.at[1] + o.rise * k + Math.sin(ang) * sp * 0.4 * k + o.dir[1] * k, o.at[2] + Math.sin(ang) * sp * 0.5 * k + o.dir[2] * k);
      const sz = o.size * (0.6 + r() * 0.6) * (0.5 + 0.9 * k); s.scale.set(sz, sz, 1); s.material.rotation = r() * 6 + u;
    }
  }
  /** a steady stream of steam puffs from a vent (e.g. the hero's backpack): rate per second */
  steam(t, at, o = {}) { o = { rate: 2.2, size: 0.28, dur: 1.1, rise: 0.7, seed: 9, ...o }; const p = 1 / o.rate; for (let k = Math.floor((t - o.dur) / p); k <= Math.floor(t / p); k++) this.puff(t, k * p, { at: typeof at === "function" ? at(k * p) : at, n: 2, size: o.size, dur: o.dur, rise: o.rise, spread: 0.12, seed: o.seed + k * 7, opacity: 0.8, dir: o.dir || [0.15, 0, 0] }); }
  /** dizzy stars circling a head point */
  stars(t, t0, at, o = {}) { o = { n: 4, r: 0.28, dur: 2.5, color: "#ffd84a", size: 0.17, ...o }; const a = t - t0; if (a < 0 || a > o.dur) return; const fade = clamp((o.dur - a) / 0.3) * clamp(a / 0.15); for (let i = 0; i < o.n; i++) { const ang = a * 5 + (i / o.n) * TAU; const s = this.sprite(this.tex.star, o.color, fade); s.position.set(at[0] + Math.cos(ang) * o.r, at[1] + Math.sin(ang * 2) * 0.04, at[2] + Math.sin(ang) * o.r * 0.6); const sz = o.size * (0.8 + 0.3 * Math.sin(a * 9 + i)); s.scale.set(sz, sz, 1); s.material.rotation = a * 3 + i; } }
  /** sweat drops springing off a head */
  sweat(t, t0, at, o = {}) { o = { n: 3, dur: 0.6, color: "#bfe3ff", size: 0.09, side: 1, ...o }; const a = t - t0; if (a < 0 || a > o.dur) return; const u = a / o.dur; for (let i = 0; i < o.n; i++) { const ang = 0.5 + i * 0.45; const s = this.sprite(this.tex.drop, o.color, 1 - u); s.position.set(at[0] + o.side * Math.cos(ang) * (0.15 + u * 0.25), at[1] + Math.sin(ang) * (0.1 + u * 0.3) - u * u * 0.3, at[2] + 0.05); s.scale.set(o.size, o.size * 1.3, 1); s.material.rotation = -o.side * ang; } }
  /** splash / debris drops on a ballistic arc */
  drops(t, t0, at, o = {}) { o = { n: 14, speed: 2.4, dur: 0.7, color: "#d7e9f7", size: 0.07, up: 1, seed: 3, g: 9, ...o }; const a = t - t0; if (a < 0 || a > o.dur) return; const r = rng(o.seed); for (let i = 0; i < o.n; i++) { const ang = r() * TAU, v = o.speed * (0.5 + r() * 0.6), vy = o.up * (1.5 + r() * 2); const s = this.sprite(this.tex.drop, o.color, 1 - a / o.dur); s.position.set(at[0] + Math.cos(ang) * v * a, at[1] + vy * a - 0.5 * o.g * a * a, at[2] + Math.sin(ang) * v * a * 0.6); s.scale.setScalar(o.size * (0.7 + r() * 0.6)); } }
  /** cartoon speed lines trailing a moving point (camera-facing streaks) */
  lines(t, t0, t1, at, dir, o = {}) { o = { n: 5, len: 0.9, spread: 0.35, color: "#ffffff", opacity: 0.7, seed: 4, ...o }; if (t < t0 || t > t1) return; const r = rng(o.seed), fade = Math.min(clamp((t - t0) / 0.06), clamp((t1 - t) / 0.12)); const ang = Math.atan2(dir[1], dir[0]); for (let i = 0; i < o.n; i++) { const s = this.sprite(this.tex.line, o.color, o.opacity * fade * (0.5 + r() * 0.5)); const off = (r() - 0.5) * o.spread, back = o.len * (0.6 + r() * 0.7); s.position.set(at[0] - Math.cos(ang) * back * 0.6 - Math.sin(ang) * off, at[1] - Math.sin(ang) * back * 0.6 + Math.cos(ang) * off, at[2] + 0.1); s.scale.set(back, 0.05, 1); s.material.rotation = ang; } }
  /** a soft dark contact spot on the ground (for things the sun shadow can't ground well: airborne props, feet) */
  shadow(at, size = 0.6, k = 0.35) { const s = this.sprite(this.tex.spot, "#283048", k); s.position.set(at[0], at[1] + 0.01, at[2]); s.scale.set(size, size * 0.4, 1); return s; }
}
function starTex() { const c = P.canvas(64, 64), g = c.getContext("2d"); g.fillStyle = "#fff"; g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, r = i % 2 ? 12 : 30; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.closePath(); g.fill(); g.strokeStyle = "rgba(120,80,0,.8)"; g.lineWidth = 3; g.stroke(); return P.tex(c); }
function dropTex() { const c = P.canvas(64, 64), g = c.getContext("2d"); const gr = g.createRadialGradient(26, 36, 2, 32, 36, 20); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "rgba(255,255,255,.75)"); g.fillStyle = gr; g.beginPath(); g.moveTo(32, 6); g.bezierCurveTo(44, 26, 52, 34, 52, 42); g.arc(32, 42, 20, 0, Math.PI); g.bezierCurveTo(12, 34, 20, 26, 32, 6); g.fill(); return P.tex(c); }
function lineTex() { const c = P.canvas(128, 16), g = c.getContext("2d"); const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(255,255,255,1)"); g.fillStyle = gr; g.beginPath(); g.roundRect(0, 4, 128, 8, 4); g.fill(); return P.tex(c); }

function deep(a, b) { for (const k of Object.keys(b)) { if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) a[k] = deep(a[k] || {}, b[k]); else a[k] = b[k]; } return a; }
export { THREE };

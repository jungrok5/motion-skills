// aesthetics-film · film.js — the film: sets (3D places built once with the kit), shots (a slow camera path through a
// set under a light preset), the essay as data (chapters, typed bilingual lines, callouts, the closing card), the
// picture chain (scene → crossfade / dip to paper → tone → grade → paper grain + vignette → chrome on top), a live
// player that synthesises the score in the browser, and the render contract (window.seek(t), DURATION, FPS, __ready).
import * as THREE from "three";
import * as KIT from "./kit.js";
import { LIGHTS, PAPER } from "./look.js";
import { Chrome, readTime, isWide, FONT_NATIVE, FONT_LATIN } from "./chrome.js";
import { rng } from "./tex.js";

export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const smooth = (x) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const smoother = (x) => { const u = clamp01(x); return u * u * u * (u * (6 * u - 15) + 10); };
export const lerp = (a, b, k) => a + (b - a) * k;
/** piecewise-linear lookup through [[x, y], ...] */
export const lin = (pts, x) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); }
  return pts[pts.length - 1][1];
};
export { rng };
const EASE = {
  glide: (u) => 0.3 * clamp01(u) + 0.7 * smoother(u),   // never quite stops: the camera of the source keeps drifting
  linear: (u) => clamp01(u), inout: smoother,
  in: (u) => clamp01(u) ** 2, out: (u) => 1 - (1 - clamp01(u)) ** 2,
};
const Q = new URLSearchParams(location.search);

// ---------------- a set: one 3D place ----------------
export class World {
  constructor(film, name, build, o = {}) {
    this.film = film; this.name = name; this.o = o;
    this.scene = new THREE.Scene();
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.fog = new THREE.Fog("#ffffff", 30, 500); this.scene.fog = this.fog;
    this.hemi = new THREE.HemisphereLight("#fff", "#888", 1);
    this.sun = new THREE.DirectionalLight("#fff", 2);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(film.shadowSize, film.shadowSize); this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.ticks = [];
    // the builder gets the kit bound to this set: S.hall({...}) builds AND adds; S.add(obj) adds anything
    const S = { set: this, root: this.root, THREE, KIT, add: (...objs) => { for (const ob of objs) this.adopt(ob); return objs[0]; } };
    for (const [k, fn] of Object.entries(KIT)) {
      if (typeof fn !== "function" || /^[A-Z]/.test(k) || ["mat", "flat", "merge", "bar", "taperTube", "mountainGeo", "latticeSegments", "V"].includes(k)) continue;
      S[k] = (opt) => this.adopt(fn(opt));
    }
    Object.assign(S, { mat: KIT.mat, flat: KIT.flat, MAT: KIT.MAT, merge: KIT.merge, bar: KIT.bar, taperTube: KIT.taperTube, V: KIT.V, latticeSegments: KIT.latticeSegments, mountainGeo: KIT.mountainGeo });
    S.mesh = (geo, m, at = [0, 0, 0]) => { const ms = new THREE.Mesh(geo, typeof m === "string" ? KIT.mat(m) : m); ms.position.set(...at); return this.adopt(ms); };
    S.tick = (fn) => this.ticks.push(fn);
    this.S = S;
    this.objects = build(S) || {};
    this.envCache = {};
  }
  /** add an object, set its shadow flags, collect its ticks */
  adopt(obj) {
    this.root.add(obj);
    obj.traverse((c) => {
      if (c.isMesh || c.isInstancedMesh) { const no = c.userData.noCast || obj.userData.noCast; c.castShadow = !no && c.castShadow !== false; c.receiveShadow = true; }
      if (c.userData.tick) this.ticks.push(c.userData.tick);
    });
    return obj;
  }
  /** a soft environment (sky gradient + one bright window) for glaze, lacquer and water reflections */
  env(lname) {
    if (this.envCache[lname]) return this.envCache[lname];
    const L = LIGHTS[lname], sc = new THREE.Scene();
    const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, uniforms: { top: { value: new THREE.Color(L.hemi[0]) }, mid: { value: new THREE.Color(L.bg) }, bot: { value: new THREE.Color(L.hemi[1]) } },
      vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 top, mid, bot; varying vec3 vP; void main(){ float y = normalize(vP).y; vec3 c = y > 0.0 ? mix(mid, top, smoothstep(0.0, 0.7, y)) : mix(mid, bot, smoothstep(0.0, -0.5, y)); gl_FragColor = vec4(c, 1.0); }",
    }));
    const win = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(L.sun[0]).multiplyScalar(2.2), side: THREE.DoubleSide }));
    win.position.set(-25, 18, -20); win.lookAt(0, 0, 0);
    sc.add(sky, win);
    const pm = new THREE.PMREMGenerator(this.film.renderer);
    return (this.envCache[lname] = pm.fromScene(sc, 0.04).texture);
  }
  /** pose lights, fog and background for preset lname around the focus point */
  apply(lname, sunOver, focus) {
    const L = LIGHTS[lname];
    this.scene.background = new THREE.Color(this.o.bg ?? L.bg);
    this.fog.color.set(this.o.fog ?? L.fog); this.fog.near = this.o.fogNear ?? L.fogNear; this.fog.far = this.o.fogFar ?? L.fogFar;
    this.hemi.color.set(L.hemi[0]); this.hemi.groundColor.set(L.hemi[1]); this.hemi.intensity = L.hemi[2];
    this.sun.color.set(L.sun[0]); this.sun.intensity = L.sun[1];
    const az = THREE.MathUtils.degToRad(sunOver?.az ?? this.o.sun?.az ?? L.az), el = THREE.MathUtils.degToRad(sunOver?.el ?? this.o.sun?.el ?? L.el);
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    this.sun.position.copy(focus).addScaledVector(dir, 120); this.sun.target.position.copy(focus);
    this.sun.castShadow = L.shadow && this.o.shadow !== false;
    const R = this.o.shadowR ?? 18, sc = this.sun.shadow.camera;
    sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 10; sc.far = 300; sc.updateProjectionMatrix();
    this.scene.environment = this.env(lname);
  }
}

// ---------------- the picture chain ----------------
const POST_FRAG = `
uniform sampler2D tA, tB, tOv; uniform float mixK, dip, grain, vig, sat, warm, contrast, exposure, frame; uniform vec3 dipCol; uniform vec2 res;
varying vec2 vUv;
vec3 neutral(vec3 c) { // Khronos PBR Neutral tone map: colours below ~0.76 pass through unchanged
  float x = min(c.r, min(c.g, c.b)); float off = x < 0.08 ? x - 6.25 * x * x : 0.04; c -= off;
  float peak = max(c.r, max(c.g, c.b)); if (peak < 0.76) return c;
  float d = 0.24; float np = 1.0 - d * d / (peak + d - 0.76); c *= np / peak; float g = 1.0 - 1.0 / (0.15 * (peak - np) + 1.0); return mix(c, vec3(np), g); }
vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h12(i), h12(i + vec2(1, 0)), f.x), mix(h12(i + vec2(0, 1)), h12(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec3 c = mix(texture2D(tA, vUv).rgb, texture2D(tB, vUv).rgb, mixK) * exposure;
  c = srgb(clamp(neutral(c), 0.0, 1.0));
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, sat); c = (c - 0.5) * contrast + 0.5; c += vec3(warm, warm * 0.35, -warm) * 0.25;
  c = mix(c, dipCol, dip);
  vec2 px = vUv * res;
  float fib = vn(px / (3.0 * res.y / 1080.0)) * 0.6 + vn(px / (11.0 * res.y / 1080.0)) * 0.4;   // paper tooth (fixed)
  c *= 1.0 + (fib - 0.5) * grain * 0.9 + (h12(px + frame * 17.0) - 0.5) * grain * 0.5;           // + film grain (per frame)
  vec2 q = vUv - 0.5; c *= 1.0 - vig * dot(q, q) * 1.6;
  vec4 ov = texture2D(tOv, vUv); c = mix(c, ov.rgb, ov.a);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

export class Film {
  /** o: { W, H, fps, scale, brand: { title, sub }, score (spec for lib/score.js), title, shadowSize, grain, vignette } */
  constructor(o = {}) {
    this.o = o; this.fps = o.fps ?? 30; this.scale = +(Q.get("scale") ?? o.scale ?? 1);
    this.W = Math.round((o.W ?? 1920) * this.scale); this.H = Math.round((o.H ?? 1080) * this.scale);
    this.shadowSize = o.shadowSize ?? (this.scale < 0.7 ? 1024 : 2048);
    this.title = o.title ?? "aesthetics film"; this.brandMark = o.brand ?? null; this.score = o.score ?? null;
    this.sets = {}; this.shots = []; this.lines = []; this.chapters = []; this.callouts = []; this.cards = []; this.overlays = [];
    this.duration = o.duration ?? 0; this.tail = o.tail ?? 1.2;
    this.canvas = document.createElement("canvas"); this.canvas.width = this.W; this.canvas.height = this.H;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace; this.renderer.toneMapping = THREE.NoToneMapping;
    const rt = () => new THREE.WebGLRenderTarget(this.W, this.H, { type: THREE.HalfFloatType, samples: Q.has("msaa") ? +Q.get("msaa") : (o.msaa ?? 4), colorSpace: THREE.LinearSRGBColorSpace });
    this.rtA = rt(); this.rtB = rt();
    this.chrome = new Chrome(this.W, this.H);
    this.ovTex = new THREE.CanvasTexture(this.chrome.canvas); this.ovTex.colorSpace = THREE.NoColorSpace; this.ovTex.minFilter = THREE.LinearFilter; this.ovTex.generateMipmaps = false;
    this.postMat = new THREE.ShaderMaterial({
      uniforms: { tA: { value: this.rtA.texture }, tB: { value: this.rtB.texture }, tOv: { value: this.ovTex }, mixK: { value: 0 }, dip: { value: 0 }, dipCol: { value: new THREE.Color(PAPER) }, grain: { value: o.grain ?? 0.06 }, vig: { value: o.vignette ?? 0.35 }, sat: { value: 1 }, warm: { value: 0 }, contrast: { value: 1 }, exposure: { value: 1 }, frame: { value: 0 }, res: { value: new THREE.Vector2(this.W, this.H) } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }", fragmentShader: POST_FRAG, depthTest: false, depthWrite: false,
    });
    this.postMat.uniforms.dipCol.value.setStyle(PAPER, THREE.NoColorSpace);
    this.postScene = new THREE.Scene(); const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMat); quad.frustumCulled = false; this.postScene.add(quad);
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.cam = new THREE.PerspectiveCamera(40, this.W / this.H, 0.1, 3000);
    this.curveCache = new Map();
  }

  // ---------------- authoring ----------------
  set(name, build, o) { this.sets[name] = new World(this, name, build, o); return this.sets[name]; }
  /** chapter badge from time `from`: { n, title, en } */
  chapter(c) { this.chapters.push({ ...c }); this.chapters.sort((a, b) => a.from - b.from); return c; }
  /** the essay lines, back to back from `from` with `gap` between them. Each: { text, en, accent: [words], dur?, at?, pause? }
   *  Returns the lines with their times ({ from, to }); shots and callouts are timed from them. */
  say(list, o = {}) {
    let t = o.from ?? (this.lines.length ? this.lines[this.lines.length - 1].to + (o.gap ?? 0.55) : 0.6);
    const out = [];
    for (const raw of list) {
      const L = { ...raw }; L.from = raw.at ?? t + (raw.pause ?? 0);
      const chars = [...L.text], wide = chars.filter(isWide).length;
      L.cps = raw.cps ?? (wide > chars.length / 2 ? 9 : 22);
      L.typeAt = []; let k = 0; for (const ch of chars) { L.typeAt.push(k / L.cps); k += /[，。、,.;:!?·]/.test(ch) ? 2.2 : ch === " " ? 0.5 : 1; }
      const typed = k / L.cps;
      L.enAt = raw.enAt ?? Math.min(typed * 0.6 + 0.25, typed);
      L.dur = raw.dur ?? +(typed + Math.max(1.5, readTime("", L.en ?? "") - typed * 0.4) + 0.55).toFixed(2);
      L.to = L.from + L.dur; t = L.to + (o.gap ?? 0.55);
      this.lines.push(L); out.push(L);
    }
    return out;
  }
  /** a callout on a 3D point in a set: { from, to, set, at: [x, y, z] | (lt) => [x, y, z], text, en, dx, dy } */
  callout(c) { this.callouts.push({ ...c }); return c; }
  /** the closing title card: { from, to?, title, sub, en, seal, footer, stroke } */
  card(c) { this.cards.push({ ...c }); return c; }
  /** a custom 2D drawing on the chrome layer: { from, to, draw(g, lt, k, W, H, s) } */
  overlay(o) { this.overlays.push({ ...o }); return o; }
  /** shot: { from, to?, set, light, cam: { path: [[x,y,z]…], look: [x,y,z] | [[…]…], fov: n | [a, b], roll, ease } | (lt, u) => ({ pos, look, fov }),
   *         update(lt, objects, t), xfade (s), dip (s, through paper), sun: { az, el }, chrome: "ink" | "pale" | false, exposure } */
  shot(s) {
    if (!this.sets[s.set]) throw new Error(`shot uses unknown set "${s.set}"`);
    const prev = this.shots[this.shots.length - 1];
    if (prev && prev.to === undefined) prev.to = s.from;
    this.shots.push({ light: "paper", ...s, id: this.shots.length });
    return this;
  }
  finish() {
    const ends = [...this.lines.map((l) => l.to + this.tail), ...this.cards.map((c) => c.to ?? c.from + 6)];
    const last = this.shots[this.shots.length - 1];
    if (!last) throw new Error("no shots");
    this.duration = this.duration || Math.max(...ends, last.from + 3);
    if (last.to === undefined) last.to = this.duration;
    for (const c of this.cards) { c.to = c.to ?? this.duration; c.dur = c.to - c.from; }
    for (let i = 0; i < this.shots.length; i++) {
      const s = this.shots[i];
      if (!(s.to > s.from)) throw new Error(`shot ${i} has no length (${s.from} → ${s.to})`);
      if (i && Math.abs(this.shots[i - 1].to - s.from) > 1e-6) throw new Error(`gap between shot ${i - 1} and ${i}`);
      if (!LIGHTS[s.light]) throw new Error(`shot ${i}: unknown light "${s.light}" (${Object.keys(LIGHTS).join(", ")})`);
    }
  }
  /** the score spec: SCORE may be an object or a function of the film (so sections follow the real chapter times) */
  scoreSpec() { const s = this.score; return typeof s === "function" ? s(this) : s; }
  /** every piece of text the film draws (fonts.mjs subsets the fonts to these characters) */
  allText() {
    const b = this.brandMark ? [this.brandMark.title, this.brandMark.sub] : [];
    return [...b, ...this.chapters.flatMap((c) => [c.title, c.en, String(c.n).padStart(2, "0")]), ...this.lines.flatMap((l) => [l.text, l.en]), ...this.callouts.flatMap((c) => [c.text, c.en]), ...this.cards.flatMap((c) => [c.title, c.sub, c.en, c.seal, c.footer]), ...(this.o.extraText ?? [])].filter(Boolean).join("\n");
  }

  // ---------------- camera ----------------
  camAt(s, lt) {
    const dur = s.to - s.from, u = lt / dur;
    if (typeof s.cam === "function") return s.cam(lt, u);
    const c = s.cam, e = (EASE[c.ease ?? "glide"] ?? EASE.glide)(u);
    const path = c.path ?? [c.pos], look = Array.isArray(c.look?.[0]) ? c.look : [c.look ?? [0, 0, 0]];
    const pt = (arr, key) => {
      if (arr.length === 1) return new THREE.Vector3(...arr[0]);
      let cv = this.curveCache.get(arr); if (!cv) { cv = new THREE.CatmullRomCurve3(arr.map((p) => new THREE.Vector3(...p)), false, "centripetal"); this.curveCache.set(arr, cv); }
      return cv.getPointAt(clamp01(e));
    };
    const fov = Array.isArray(c.fov) ? lin(c.fov.map((f, i) => [i / (c.fov.length - 1), f]), e) : c.fov ?? 40;
    const roll = Array.isArray(c.roll) ? lin(c.roll.map((f, i) => [i / (c.roll.length - 1), f]), e) : c.roll ?? 0;
    return { pos: pt(path), look: pt(look), fov, roll };
  }
  placeCam(s, lt) {
    const c = this.camAt(s, lt), cam = this.cam;
    cam.position.copy(c.pos.isVector3 ? c.pos : new THREE.Vector3(...c.pos)); cam.up.set(0, 1, 0);
    const look = c.look.isVector3 ? c.look : new THREE.Vector3(...c.look);
    cam.lookAt(look); cam.rotateZ(((c.roll ?? 0) * Math.PI) / 180);
    cam.fov = c.fov ?? 40; cam.aspect = this.W / this.H; cam.near = s.near ?? 0.1; cam.far = s.far ?? 3000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    return look;
  }
  /** draw shot s at film time t into target */
  drawShot(s, t, target) {
    const lt = t - s.from, set = this.sets[s.set];
    KIT.WIND.value = t;
    const look = this.placeCam(s, lt);
    set.apply(s.light, s.sun, s.focus ? new THREE.Vector3(...s.focus) : look);
    for (const f of set.ticks) f(t, this.cam);
    s.update?.(lt, set.objects, t, set);
    this.renderer.setRenderTarget(target); this.renderer.render(set.scene, this.cam);
    return this.cam;
  }
  project(p) {
    const v = (p.isVector3 ? p.clone() : new THREE.Vector3(...p)).project(this.cam);
    if (v.z > 1 || v.z < -1) return null;
    return [(v.x * 0.5 + 0.5) * this.W, (-v.y * 0.5 + 0.5) * this.H];
  }

  // ---------------- a frame ----------------
  seek(t) {
    if (!this.ready) return;
    t = Math.max(0, Math.min(this.duration - 1e-4, t));
    const frame = Math.round(t * this.fps);
    let i = this.shots.findIndex((s) => t >= s.from && t < s.to); if (i < 0) i = this.shots.length - 1;
    const s = this.shots[i], nx = this.shots[i + 1], U = this.postMat.uniforms;
    // crossfade window [B.from - x/2, B.from + x/2)
    let A = s, B = null, k = 0;
    if (s.xfade && i > 0 && t < s.from + s.xfade / 2) { A = this.shots[i - 1]; B = s; k = smooth((t - (s.from - s.xfade / 2)) / s.xfade); }
    else if (nx?.xfade && t >= nx.from - nx.xfade / 2) { B = nx; k = smooth((t - (nx.from - nx.xfade / 2)) / nx.xfade); }
    // draw the more visible shot last, so this.cam is its camera when callouts are projected
    if (B && k <= 0.5) { this.drawShot(B, t, this.rtB); this.drawShot(A, t, this.rtA); }
    else { this.drawShot(A, t, this.rtA); if (B) this.drawShot(B, t, this.rtB); }
    const camShot = B && k > 0.5 ? B : A;
    // dip through paper around a shot start
    let dip = 0;
    for (const sh of this.shots) if (sh.dip) dip = Math.max(dip, 1 - clamp01(Math.abs(t - sh.from) / (sh.dip / 2)));
    if (t < (this.o.fadeIn ?? 0.6)) dip = Math.max(dip, 1 - t / (this.o.fadeIn ?? 0.6));
    const LA = LIGHTS[A.light], LB = B ? LIGHTS[B.light] : LA, kk = B ? k : 0;
    U.mixK.value = kk; U.dip.value = smooth(dip);
    U.sat.value = lerp(LA.sat, LB.sat, kk); U.warm.value = lerp(LA.warm, LB.warm, kk); U.contrast.value = lerp(LA.contrast, LB.contrast, kk);
    U.exposure.value = lerp((A.exposure ?? 1) * LA.exposure, ((B ?? A).exposure ?? 1) * LB.exposure, kk); U.frame.value = frame % 97;
    this.drawChrome(t, camShot);
    this.ovTex.needsUpdate = true;
    this.renderer.setRenderTarget(null); this.renderer.render(this.postScene, this.postCam);
  }
  drawChrome(t, s) {
    const C = this.chrome; C.clear();
    const tone = s.chrome === false ? null : s.chrome ?? LIGHTS[s.light].chrome;
    const card = this.cards.find((c) => t >= c.from && t < c.to);
    const hideChrome = card && t > card.from + 0.8;
    if (tone && !hideChrome) {
      const ch = [...this.chapters].reverse().find((c) => t >= c.from);
      const ka = ch ? clamp01((t - ch.from) / 0.9) : 0;
      C.badge(ch, tone, ka * (card ? 1 - clamp01((t - card.from) / 0.8) : 1));
      C.brand(this.brandMark, tone, card ? 1 - clamp01((t - card.from) / 0.8) : 1);
      for (const c of this.callouts) {
        if (t < c.from || t >= c.to || (c.set && c.set !== s.set)) continue;
        const lt = t - c.from, k = Math.min(clamp01(lt / 0.9), clamp01((c.to - t) / 0.4));
        const p = typeof c.at === "function" ? c.at(lt) : c.at;
        C.callout(c, this.project(p), k, tone);
      }
    }
    for (const o of this.overlays) if (t >= o.from && t < o.to) { const lt = t - o.from; o.draw(C.g, lt, lt / (o.to - o.from), this.W, this.H, C.s, C, tone ?? "ink"); }
    for (const c of this.cards) if (t >= c.from && t < c.to) C.card(c, t - c.from);
    if (tone !== null || card) for (const L of this.lines) if (t >= L.from && t < L.to) C.line(L, t - L.from, card && t > card.from + 0.5 ? "ink" : tone ?? "ink");
  }

  // ---------------- start, player, checks ----------------
  async start() {
    this.finish();
    // fonts first: every glyph must be ready before the first frame (fonts/fonts.css from scripts/fonts.mjs)
    try { await Promise.all([document.fonts.load(`600 34px ${FONT_NATIVE}`, this.allText().slice(0, 200)), document.fonts.load(`italic 19px ${FONT_LATIN}`, "The"), document.fonts.load(`500 12px ${FONT_LATIN}`, "01")]); await document.fonts.ready; } catch {}
    this.ready = true;
    window.DURATION = this.duration; window.FPS = this.fps; window.film = this;
    window.seek = (t) => this.seek(t);
    for (const s of this.shots) { this.drawShot(s, s.from, this.rtA); }   // warm-up: compile every set's shaders once
    this.seek(Q.has("t") ? +Q.get("t") : 0);
    const render = Q.get("render") === "1";
    document.body.style.cssText = "margin:0;background:#16130f;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font:13px system-ui,sans-serif;color:#d8d0c2;overflow:hidden";
    this.canvas.style.cssText = render ? "display:block" : "display:block;width:min(100vw,calc((100vh - 46px) * 16 / 9));height:auto";
    document.body.append(this.canvas);
    if (!render) this.player();
    window.__ready = true;
  }
  player() {
    const bar = document.createElement("div");
    bar.style.cssText = "display:flex;gap:10px;align-items:center;height:46px;width:min(100vw,calc((100vh - 46px) * 16 / 9));box-sizing:border-box;padding:0 12px";
    const btn = document.createElement("button"); btn.textContent = "▶"; btn.title = "play / pause";
    btn.style.cssText = "font:inherit;width:34px;height:30px;border-radius:6px;border:0;background:#a3302b;color:#f6efe4;cursor:pointer";
    const pos = document.createElement("input"); pos.type = "range"; pos.min = 0; pos.max = this.duration; pos.step = 1 / this.fps; pos.value = Q.has("t") ? +Q.get("t") : 0; pos.style.cssText = "flex:1;accent-color:#a3302b";
    const lab = document.createElement("span"); lab.style.cssText = "font-variant-numeric:tabular-nums;min-width:86px;text-align:right";
    const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
    lab.textContent = `${fmt(+pos.value)} / ${fmt(this.duration)}`;
    bar.append(btn, pos, lab); document.body.append(bar);
    let playing = false, t0 = 0, w0 = 0, ctx = null, buf = null, src = null;
    const now = () => (src ? ctx.currentTime - t0 + w0 : w0 + (performance.now() - t0) / 1000);
    const stop = () => { playing = false; btn.textContent = "▶"; if (src) { try { src.stop(); } catch {} src = null; } };
    const loop = () => { if (!playing) return; const t = now(); if (t >= this.duration) { stop(); return; } this.seek(t); pos.value = t; lab.textContent = `${fmt(t)} / ${fmt(this.duration)}`; requestAnimationFrame(loop); };
    const play = async () => {
      w0 = +pos.value; playing = true; btn.textContent = "❚❚";
      if (this.score && !buf && Q.get("mute") !== "1") {
        try {
          ctx = ctx || new AudioContext(); lab.textContent = "sound…";
          const { renderScore } = await import("./score.js");
          const [L, R] = renderScore(this.scoreSpec(), ctx.sampleRate, this.duration);
          buf = ctx.createBuffer(2, L.length, ctx.sampleRate); buf.copyToChannel(L, 0); buf.copyToChannel(R, 1);
        } catch (e) { console.warn("score:", e.message); }
      }
      if (buf) { await ctx.resume(); src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); t0 = ctx.currentTime; src.start(0, w0); }
      else t0 = performance.now();
      loop();
    };
    btn.onclick = () => (playing ? (w0 = now(), pos.value = w0, stop()) : play());
    this.canvas.onclick = btn.onclick; this.canvas.style.cursor = "pointer";
    pos.oninput = () => { if (playing) stop(); w0 = +pos.value; this.seek(w0); lab.textContent = `${fmt(w0)} / ${fmt(this.duration)}`; };
  }
  /** problems a script can check (check.mjs prints these as warnings) */
  check() {
    const out = [];
    for (const s of this.shots) {
      const d = s.to - s.from;
      if (d < 1.5) out.push(`shot ${s.id} is only ${d.toFixed(2)} s (this style holds 4–12 s)`);
      if (d > 16) out.push(`shot ${s.id} holds ${d.toFixed(1)} s: split it or give the camera somewhere to go`);
      const c = s.cam; if (typeof c !== "function" && (c.path ?? [c.pos]).length < 2 && !Array.isArray(c.fov) && !Array.isArray(c.look?.[0])) out.push(`shot ${s.id}: the camera never moves (one path point, fixed fov) — it reads as a freeze`);
    }
    for (let i = 1; i < this.lines.length; i++) if (this.lines[i].from < this.lines[i - 1].to - 1e-6) out.push(`line ${i} ("${this.lines[i].text.slice(0, 12)}…") starts before line ${i - 1} ends`);
    for (const L of this.lines) { const need = readTime(L.text, L.en ?? ""); if (L.dur < need) out.push(`line "${L.text.slice(0, 14)}…" is on screen ${L.dur.toFixed(1)} s, needs ~${need.toFixed(1)} s to read`); if (L.text.length > 26 && [...L.text].filter(isWide).length > 20) out.push(`line "${L.text.slice(0, 14)}…" is ${[...L.text].length} characters: keep a line ≤ 20 (split it)`); }
    for (let i = 1; i < this.chapters.length; i++) if (this.chapters[i].n <= this.chapters[i - 1].n) out.push(`chapter ${this.chapters[i].n} is out of order`);
    return out;
  }
}
export { THREE, KIT };

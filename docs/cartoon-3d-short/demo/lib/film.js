// cartoon-3d-short · film.js — the film: sets (3D places built once), shots timed to the voice's words, the camera
// grammar of the reference (glides, creeping holds, cuts, impact kicks, rolls), a light preset per shot with a
// camera-relative sun frozen per shot, lens blur per shot, crossfades and the white flash, optional one-word captions,
// a live player with sound, and the render contract (window.seek(t), DURATION, FPS, __ready).
// Camera grammar and light rig follow mromidev/claude-animated-shorts templates/bridge/story.ts + world.ts (MIT).
import * as THREE from "three";
import { Post, NOINK } from "./post.js";
import { Stage } from "./cast.js";
import { LIGHTS, LOOK, GRADES } from "./look.js";
import { TONE, CHAR, untone } from "./shade.js";
import { ctex, cloudHD } from "./paint.js";
import * as KIT from "./kit.js";

export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const smooth = (x) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
/** the reference camera ease: symmetric smootherstep */
export const glide = (u) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const easeOut = (u) => 1 - (1 - clamp01(u)) ** 3;
export const easeIn = (u) => clamp01(u) ** 3;
export const lerp = (a, b, k) => a + (b - a) * k;
export const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
/** piecewise-linear lookup through [[x, y], ...] */
export const lin = (pts, x) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); }
  return pts[pts.length - 1][1];
};
/** a seeded random generator: const r = rng(7); r() → [0, 1) */
export const rng = (seed) => { let s = (seed * 9301 + 49297) % 233280 || 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };

const Q = new URLSearchParams(location.search);
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

// ---------------- a set (World): one 3D place with its sky, sun, fog, clouds and cast ----------------
const SKY_FRAG = `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; uniform float stars; varying vec3 vP;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() { vec3 d = normalize(vP); float el = asin(clamp(d.y, -1.0, 1.0));
  vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el)); c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el));
  if (stars > 0.0 && el > 0.08) { vec2 g = vec2(atan(d.z, d.x) * 120.0, el * 240.0); vec2 i = floor(g); float s = step(0.985, h(i)); vec2 f = fract(g) - 0.5; c += stars * s * smoothstep(0.22, 0.0, length(f)) * vec3(1.2, 1.2, 1.1) * h(i + 3.0); }
  gl_FragColor = vec4(c, 1.0); }`;

export class World {
  constructor(film, name, build) {
    this.film = film; this.name = name;
    this.scene = new THREE.Scene();
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.fog = new THREE.Fog("#b8d0ec", 25, 300); this.scene.fog = this.fog;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() }, stars: { value: 0 } },
      vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); this.scene.add(this.sky);
    const disc = ctex("sunDisc", 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "#fff"); gr.addColorStop(0.72, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const halo = ctex("sunHalo", 256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(0.25, "rgba(255,255,255,0.18)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, color: new THREE.Color(6, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); this.scene.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 0.5);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(film.shadowSize, film.shadowSize);
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.clouds = [];
    this.cloudMaps = {};
    this.stage = new Stage(this.root);
    this.waters = [];
    this.cloudN = 9;
    // the builder gets the kit bound to this set: S.house({...}) builds AND adds; S.add(obj) adds anything
    const S = { set: this, root: this.root, THREE, add: (...o) => { this.root.add(...o); return o[0]; } };
    for (const [k, fn] of Object.entries(KIT)) if (typeof fn === "function" && /^[a-z]/.test(k) && !["lam", "col", "paintMat", "glow", "unlit", "merge", "quad", "tri", "boxGeo", "quadUp"].includes(k))
      S[k] = (o) => { const obj = fn(o); obj.traverse?.((c) => { if (c.isMesh) { c.castShadow = !c.userData.water && !c.userData.noCast; c.receiveShadow = true; } }); this.root.add(obj); if (obj.userData.water) this.waters.push(obj); return obj; };
    Object.assign(S, { lam: KIT.lam, col: KIT.col, paintMat: KIT.paintMat, glow: KIT.glow, unlit: KIT.unlit, MAT: KIT.MAT, V: KIT.V, Batch: KIT.Batch, boxGeo: KIT.boxGeo, quad: KIT.quad, tri: KIT.tri });
    S.clouds = (n = 9) => { this.cloudN = n; };
    S.mesh = (geo, mat, at = [0, 0, 0]) => { const m = new THREE.Mesh(geo, typeof mat === "string" ? KIT.col(mat) : mat); m.position.set(...at); m.castShadow = m.receiveShadow = true; this.root.add(m); return m; };
    this.S = S;
    this.objects = build(S) || {};
    for (let i = 0; i < this.cloudN; i++) {
      const a = (i / Math.max(1, this.cloudN)) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60, w = 130 + (i % 4) * 30;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK);
      this.clouds.push(m); this.scene.add(m);
    }
  }
  /** pose the light rig for preset L (name), camera-relative sun direction, around the focus point */
  apply(lname, cam, sunDir, focus, t) {
    const L = LIGHTS[lname], K = LOOK[lname], dist = cam.position.distanceTo(focus);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let R = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (L.el < 15) R = Math.max(R, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (R / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad; CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((d) => THREE.MathUtils.degToRad(d)); su.e.value.set(e[1], e[2], e[3], e[4]); su.stars.value = K.stars;
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    const showSun = !!L.sunDisc;
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      const moon = lname === "night";
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.material.color.set(L.sunDisc).multiplyScalar(moon ? 2.2 : 5);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(moon ? 2.4 : 1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(moon ? 12 : 24)));
      this.sunHalo.material.color.set(L.sunDisc).multiplyScalar(moon ? 0.6 : 1.3);
    }
    if (!this.cloudMaps[lname]) this.cloudMaps[lname] = [0, 1, 2, 3].map((k) => cloudHD(k, K.cloud));
    this.clouds.forEach((m, i) => { m.lookAt(cam.position.x, m.position.y, cam.position.z); m.material.map = this.cloudMaps[lname][i % 4]; m.material.needsUpdate = true; m.position.x += 0; });
    for (const w of this.waters) {
      w.material.color.copy(untone(K.water.mid)); w.material.map.offset.set(t * 0.012, t * 0.02);
    }
    this.stage.blobCol = L.blob; this.stage.realShadow = L.actorShadow; this.stage.sun.copy(sunDir);
  }
}

// ---------------- the film ----------------
export class Film {
  /** o: { W, H, fps, words (array of {w,s,e} | script text to estimate at 3.7 words/s), audio (mix for the live player),
   *       captions (one-word captions, off by default), shadowSize, title, sources ([{ title, url }] under the player) } */
  constructor(o = {}) {
    this.fps = o.fps ?? 30; this.scale = +(Q.get("scale") ?? o.scale ?? 1);
    this.W = Math.round((o.W ?? 1080) * this.scale); this.H = Math.round((o.H ?? 1920) * this.scale);
    this.shadowSize = o.shadowSize ?? (this.scale < 0.95 ? 2048 : 4096);
    this.words = Array.isArray(o.words) ? o.words : typeof o.words === "string" ? Film.estimate(o.words) : [];
    this.captions = Q.has("captions") ? Q.get("captions") !== "0" : !!o.captions;
    this.audio = o.audio ?? null; this.title = o.title ?? "cartoon short";
    this.sources = o.sources ?? [];   // [{ title, url }] — shown as links under the live player (the facts' sources)
    this.sets = {}; this.shots = []; this.duration = o.duration ?? 0;
    const post = (Q.get("post") ?? "").split(",");
    this.canvas = document.createElement("canvas"); this.canvas.width = this.W; this.canvas.height = this.H;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.post = new Post(this.renderer, this.W, this.H, { ink: !post.includes("noink"), lens: !post.includes("nolens"), bloom: !post.includes("nobloom"), grade: !post.includes("nograde") });
    this.cam = new THREE.PerspectiveCamera(40, this.W / this.H, 0.2, 1500);
    this.sunCache = new Map();
    this.capCanvas = null;
  }
  /** word timings from text: ~3.7 words/s with small pauses after punctuation (until the real voice exists) */
  static estimate(text, wps = 3.7, start = 0.1) {
    const out = []; let t = start;
    for (const raw of text.split(/\s+/).filter(Boolean)) {
      const d = Math.max(0.16, (raw.replace(/[^A-Za-z0-9]/g, "").length * 0.055 + 0.08)) * (3.7 / wps);
      out.push({ w: raw, s: +t.toFixed(3), e: +(t + d).toFixed(3) });
      t += d + (/[.!?]$/.test(raw) ? 0.28 : /[,;:]$/.test(raw) ? 0.12 : 0.02);
    }
    return out;
  }
  /** start time of the n-th (1-based) occurrence of a word (or "two words") in the voice; throws if absent */
  at(word, n = 1, edge = "s") {
    const parts = word.split(/\s+/).map(norm);
    let k = 0;
    for (let i = 0; i + parts.length <= this.words.length; i++) {
      if (parts.every((p, j) => norm(this.words[i + j].w) === p) && ++k === n) return edge === "e" ? this.words[i + parts.length - 1].e : this.words[i].s;
    }
    throw new Error(`word "${word}" #${n} not in the voice`);
  }
  /** end time of a word occurrence */
  end(word, n = 1) { return this.at(word, n, "e"); }
  set(name, build) { this.sets[name] = new World(this, name, build); return this.sets[name]; }
  /** shot: { from, to?, set, light, cam: [keys], push, punch: [t], kicks: [t], roll, dof, focus, sun: {az, el},
   *          cast: (lt, t) => placements, fx: (lt, t) => effects, update: (lt, set, t) => void, xfade (frames), flash, exposure } */
  shot(s) {
    if (!this.sets[s.set]) throw new Error(`shot uses unknown set "${s.set}"`);
    if (!s.cam?.length) throw new Error("shot needs cam keys");
    const prev = this.shots[this.shots.length - 1];
    if (prev && prev.to === undefined) prev.to = s.from;
    this.shots.push({ light: "day", push: 0.2, dof: 0, ...s, id: this.shots.length });
    return this;
  }
  finish() {
    const last = this.shots[this.shots.length - 1];
    if (last.to === undefined) last.to = this.duration || (this.words.length ? this.words[this.words.length - 1].e + 0.4 : last.from + 4);
    this.duration = this.duration || last.to;
    for (let i = 0; i < this.shots.length; i++) {
      const s = this.shots[i];
      if (!(s.to > s.from)) throw new Error(`shot ${i} has no length (${s.from} → ${s.to})`);
      if (i && Math.abs(this.shots[i - 1].to - s.from) > 1e-6) throw new Error(`gap between shot ${i - 1} and ${i}`);
    }
  }
  // ---- camera ----
  camAt(s, lt) {
    const f = lt * this.fps, keys = s.cam;
    const full = (k) => ({ pos: k.pos, look: k.look, fov: k.fov ?? 40, roll: k.roll ?? 0 });
    let cur = full(keys[0]), since = 0;
    for (let i = 1; i < keys.length; i++) {
      const k = keys[i], kf = k.t * this.fps;
      if (f < kf) break;
      if (k.cut) { cur = full(k); since = kf; }
      else {
        const u = glide((f - kf) / (k.dur ?? 24)), b = full(k);
        cur = { pos: lerp3(cur.pos, b.pos, u), look: lerp3(cur.look, b.look, u), fov: lerp(cur.fov, b.fov, u), roll: lerp(cur.roll, b.roll, u) };
      }
    }
    // creeping push-in: the subject grows `push` % per frame since the shot (or the last cut) started; punch words faster
    const x = Math.max(0, f - since);
    let sPush = (s.push / 100) * x;
    for (const pt of s.punch ?? []) { const pf = (pt - s.from) * this.fps; if (pf < since) continue; for (let i = 0; i < Math.min(Math.max(0, f - pf), 35); i++) sPush += (0.006 - s.push / 100) * Math.max(0, Math.min(1, (i + 0.5) / 8, (35 - i - 0.5) / 8)); }
    const k = Math.exp(-sPush);
    // dolly toward a near subject; zoom (fov) when the look point is far, so the lens never flies past the foreground
    const far = Math.hypot(cur.pos[0] - cur.look[0], cur.pos[1] - cur.look[1], cur.pos[2] - cur.look[2]) > 14;
    if (s.zoomPush ?? far) cur.fov = (360 / Math.PI) * Math.atan(Math.tan((cur.fov * Math.PI) / 360) * k);
    else cur.pos = lerp3(cur.look, cur.pos, k);
    return cur;
  }
  placeCam(s, lt) {
    const c = this.camAt(s, lt), cam = this.cam;
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ((c.roll * Math.PI) / 180);
    // impact kick: flips sign every frame, decays over 7 frames
    const f = Math.round(lt * this.fps);
    for (const kt of s.kicks ?? []) {
      const kf = Math.round((kt - s.from) * this.fps), n = f - kf;
      if (n >= 0 && n < 7) { const d = cam.position.distanceTo(new THREE.Vector3(...c.look)); cam.translateY((n % 2 ? -1 : 1) * 0.018 * d * (1 - n / 7)); cam.rotateZ((n % 2 ? 1 : -1) * 0.012 * (1 - n / 7)); }
    }
    cam.fov = c.fov; cam.aspect = this.W / this.H; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    return c;
  }
  /** sun direction for a shot: the shot's mean view direction turned by az toward screen right, lifted by el (frozen) */
  sunFor(s) {
    let v = this.sunCache.get(s.id);
    if (v) return v;
    const L = LIGHTS[s.light];
    let fx = 0, fz = 0;
    for (let lt = 0; lt < s.to - s.from; lt += 0.1) { const c = this.camAt(s, lt), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sun?.az ?? L.az), el = THREE.MathUtils.degToRad(s.sun?.el ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(s.id, v);
    return v;
  }
  /** draw shot s at film time t into target (null = canvas) */
  drawShot(s, t, target, flash = 0) {
    const lt = t - s.from, set = this.sets[s.set];
    s.update?.(lt, set, t);
    const c = this.placeCam(s, lt), focusPt = new THREE.Vector3(...(typeof s.focus === "function" ? s.focus(lt) : s.focus ?? c.look));
    set.apply(s.light, this.cam, this.sunFor(s), new THREE.Vector3(...c.look), t);
    set.stage.update(this.cam, s.cast?.(lt, t) ?? [], s.fx?.(lt, t) ?? [], t, this.fps, this.H / 1920);
    const fwd = new THREE.Vector3(); this.cam.getWorldDirection(fwd);
    const focus = Math.max(0.3, focusPt.sub(this.cam.position).dot(fwd));
    const cInf = typeof s.dof === "function" ? s.dof(lt) : s.dof;
    this.post.render(set.scene, this.cam, { focus, cInf, grade: GRADES[s.light], flash, exposure: s.exposure ?? 1, bloom: s.bloom ?? 0.5 }, target);
  }
  seek(t) {
    if (!this.ready) return;
    t = Math.max(0, Math.min(this.duration - 1e-4, t));
    const f = Math.round(t * this.fps);
    let i = this.shots.findIndex((s) => t >= s.from && t < s.to); if (i < 0) i = this.shots.length - 1;
    const s = this.shots[i];
    // flash: white 4 frames at the start of a shot marked flash (the reference's cut after the hook)
    let flash = 0;
    for (const sh of this.shots) if (sh.flash) { const n = f - Math.round(sh.from * this.fps); if (n >= 0 && n < 4) flash = [1, 0.75, 0.45, 0.2][n]; }
    // crossfade window around a shot start: [from - x/2, from + x/2) frames
    const nx = this.shots[i + 1], cur = s.xfade && i > 0 && f < Math.round(s.from * this.fps) + s.xfade / 2 ? [this.shots[i - 1], s] : nx?.xfade && f >= Math.round(nx.from * this.fps) - nx.xfade / 2 ? [s, nx] : null;
    if (cur) {
      const [A, B] = cur, x = B.xfade, f0 = Math.round(B.from * this.fps) - x / 2, k = (f - f0 + 1) / (x + 1);
      this.post.crossfade((rt) => this.drawShot(A, Math.min(t, A.to - 1e-3), rt), (rt) => this.drawShot(B, Math.max(t, B.from), rt), k, flash);
    } else this.drawShot(s, t, null, flash);
    if (this.captions) this.caption(t);
  }
  /** one word at a time, white bold with a black outline, lower-middle (the reference's caption style) */
  caption(t) {
    const w = this.words.find((x) => t >= x.s && t < Math.max(x.e, x.s + 0.12));
    if (!w) return;
    if (!this.capScene) {
      this.capCanvas = document.createElement("canvas"); this.capCanvas.width = this.W; this.capCanvas.height = Math.round(this.H * 0.12);
      this.capTex = new THREE.CanvasTexture(this.capCanvas); this.capTex.colorSpace = THREE.NoColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2 * 0.12), new THREE.MeshBasicMaterial({ map: this.capTex, transparent: true, depthTest: false }));
      m.position.y = 1 - 2 * 0.66; this.capScene = new THREE.Scene(); this.capScene.add(m); this.capCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }
    const g = this.capCanvas.getContext("2d"), H = this.capCanvas.height;
    g.clearRect(0, 0, this.W, H);
    g.font = `800 ${Math.round(this.H * 0.04)}px "Arial Black", Arial, Helvetica, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineJoin = "round"; g.lineWidth = this.H * 0.009; g.strokeStyle = "#000"; g.fillStyle = "#fff";
    const txt = w.w.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9'!?.,]+$/g, "");
    g.strokeText(txt, this.W / 2, H / 2); g.fillText(txt, this.W / 2, H / 2);
    this.capTex.needsUpdate = true;
    this.renderer.autoClear = false; this.renderer.setRenderTarget(null); this.renderer.render(this.capScene, this.capCam); this.renderer.autoClear = true;
  }
  /** build everything, warm up, publish the contract, and (unless ?render=1) show the live player */
  start() {
    this.finish();
    this.ready = true;
    window.DURATION = this.duration; window.FPS = this.fps; window.film = this;
    window.seek = (t) => this.seek(t);
    // warm-up: compile every set's shaders once (first frame of each shot)
    for (const s of this.shots) this.drawShot(s, s.from, null);
    this.seek(Q.has("t") ? +Q.get("t") : 0);
    const render = Q.get("render") === "1";
    document.body.style.cssText = "margin:0;background:#111;display:grid;place-items:center;min-height:100vh;font:14px system-ui;color:#ddd";
    this.canvas.style.cssText = render ? "" : `height:min(calc(100vh - ${this.sources.length ? 112 : 64}px),177.7vw);width:auto;display:block`;   // room for the bar (+ sources)
    document.body.append(this.canvas);
    if (!render) this.player();
    window.__ready = true;
  }
  player() {
    const bar = document.createElement("div");
    bar.style.cssText = "display:flex;gap:10px;align-items:center;margin-top:8px";
    const btn = document.createElement("button"); btn.textContent = "▶ play"; btn.style.cssText = "font:inherit;padding:6px 14px;border-radius:8px;border:0;background:#f2c230;color:#111;cursor:pointer";
    const pos = document.createElement("input"); pos.type = "range"; pos.min = 0; pos.max = this.duration; pos.step = 1 / this.fps; pos.value = 0; pos.style.width = "min(60vw,420px)";
    const lab = document.createElement("span");
    bar.append(btn, pos, lab); document.body.append(bar);
    if (this.sources.length) {                        // the facts' sources, as links under the player
      const src = document.createElement("div");
      src.style.cssText = "max-width:min(92vw,520px);margin:6px auto 10px;font-size:12px;line-height:1.5;color:#aaa";
      src.append("Sources: ");
      this.sources.forEach((x, i) => { const a = document.createElement("a"); a.href = x.url; a.textContent = x.title; a.target = "_blank"; a.rel = "noopener"; a.style.color = "#f2c230"; src.append(...(i ? [" · ", a] : [a])); });
      document.body.append(src);
    }
    document.body.style.gridTemplateRows = "1fr auto";
    const audio = this.audio ? new Audio(this.audio) : null;
    let playing = false, t0 = 0, w0 = 0;
    const now = () => (audio && !audio.paused ? audio.currentTime : w0 + (performance.now() - t0) / 1000);
    const loop = () => { if (!playing) return; const t = now(); if (t >= this.duration) { playing = false; btn.textContent = "▶ play"; return; } this.seek(t); pos.value = t; lab.textContent = t.toFixed(1) + " s"; requestAnimationFrame(loop); };
    btn.onclick = () => {
      playing = !playing; btn.textContent = playing ? "❚❚ pause" : "▶ play";
      if (playing) { w0 = +pos.value; t0 = performance.now(); if (audio) { audio.currentTime = w0; audio.play().catch(() => {}); } loop(); } else audio?.pause();
    };
    pos.oninput = () => { if (playing) { playing = false; btn.textContent = "▶ play"; audio?.pause(); } this.seek(+pos.value); lab.textContent = (+pos.value).toFixed(1) + " s"; };
  }
  /** list problems a script can check (check.mjs prints these) */
  check() {
    const out = [];
    for (const s of this.shots) {
      const d = s.to - s.from;
      if (d < 0.6) out.push(`shot ${s.id} is only ${d.toFixed(2)} s`);
      if (d > 8) out.push(`shot ${s.id} holds ${d.toFixed(1)} s (the reference rarely holds a framing > 6 s)`);
      if (!LIGHTS[s.light]) out.push(`shot ${s.id}: unknown light "${s.light}"`);
      if ((s.push ?? 0) <= 0 && !(s.cam.length > 1)) out.push(`shot ${s.id} is a static hold (no push, one key): it reads as a freeze`);
    }
    return out;
  }
}
export { THREE, KIT };

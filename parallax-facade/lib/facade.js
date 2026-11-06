// parallax-facade · facade.js — the film: a 3D town that reads as one flat 2D facade through a long lens, the camera
// beats that break the illusion (dolly zoom, crane, orbit) and snap back, motion blur on every move, toon shading with
// a lavender shade colour, optional ink outlines, camera-independent haze, and the render contract
// (window.seek(t), DURATION, FPS, __ready). Every frame is a function of t; the last frame wraps to the first.
import * as THREE from "three";
export { THREE };

export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (x) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
/** a seeded random generator: const r = rng(7); r() → [0, 1) */
export const rng = (seed) => { let s = Math.abs(Math.floor(seed * 9301 + 49297)) % 2147483646 || 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
export const EASE = {
  /** the reference move: fast in, fast out, most travel in the middle third (easeInOutQuint) */
  snap: (u) => { const x = clamp01(u); return x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2; },
  /** softer: symmetric smootherstep */
  glide: (u) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); },
  /** a whip: exponential in and out */
  whip: (u) => { const x = clamp01(u); return x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2; },
  linear: (u) => clamp01(u),
};

const Q = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
const D2R = Math.PI / 180;

// ---------------- looks: two finishes of one style ----------------
// sky: the solid cobalt of the reference · shade: what a face turned from the sun is multiplied by (lavender) ·
// sun: how much the lit side gains · haze: distant rows fade toward this colour by depth (z), not by camera distance.
export const LOOKS = {
  soft: { sky: "#1238e6", shade: "#a6a8e6", sun: 1.0, haze: { color: "#e9e6f6", near: 30, far: 170, max: 0.55 }, ink: null, road: "#8d8fb8", ground: "#d9d6e6", steps: [0, 255] },
  ink: { sky: "#2c45cc", shade: "#b4b4dc", sun: 1.0, haze: { color: "#eceaf4", near: 60, far: 220, max: 0.35 }, ink: { color: "#2a2840", px: 1.6 }, road: "#a9aabd", ground: "#d6d6e0", steps: [0, 255] },
};

// ---------------- views: camera states. The pivot sits on the facade plane (z = 0); the camera stands on a sphere
// around it at the distance that keeps the facade frame height constant (the dolly zoom): D = H / (2 tan(fov / 2)).
// at: "facade" (the flat frame's centre) or "focus" (the gap the reveal looks through). px / py / pz move the pivot in
// units of the frame height H; yaw swings the camera right (+) or left (−); pitch raises it (+, looking down).
// eye: true (the film's eye height) or a world y — the camera height instead of a pitch. The flat view stands at the
// town's roofline: every row behind that is no taller lines up with the front row and vanishes (F.hide).
export const VIEWS = {
  flat: { fov: 6, eye: true, yaw: 0, at: "facade" },
  deep: { fov: 52, pitch: 3, yaw: 0, at: "focus" },
  rise: { fov: 46, pitch: 16, yaw: 0, at: "focus", py: -0.1, pz: -0.4 },
  high: { fov: 42, pitch: 25, yaw: 0, at: "focus", py: -0.3, pz: -2.6, zoom: 2.4 },
  left: { fov: 44, pitch: 20, yaw: -32, at: "focus", py: -0.05, zoom: 1.1 },
  right: { fov: 44, pitch: 20, yaw: 32, at: "focus", py: -0.05, zoom: 1.1 },
  low: { fov: 58, pitch: -1, yaw: 0, at: "focus", py: -0.3, zoom: 0.9 },
};
const NUM = ["fov", "pitch", "yaw", "roll", "px", "py", "pz", "zoom"];
const view = (v) => {
  const base = typeof v === "string" ? VIEWS[v] : VIEWS[v.view ?? "deep"];
  if (!base) throw new Error(`unknown view "${typeof v === "string" ? v : v.view}" (views: ${Object.keys(VIEWS).join(", ")})`);
  const o = { px: 0, py: 0, pz: 0, roll: 0, zoom: 1, ...base, ...(typeof v === "string" ? {} : v) };
  o.name = typeof v === "string" ? v : v.name ?? v.view ?? "custom";
  return o;
};

// ---------------- geometry helpers ----------------
/** merge-friendly geometry: non-indexed, with an "onrm" attribute = smoothed normals (welded by position) for the
 *  ink hull, so the outline of a box has no gaps at its corners */
export function prep(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position.array, n = g.attributes.normal.array, on = new Float32Array(p.length), acc = new Map();
  const key = (i) => `${Math.round(p[i] * 1000)},${Math.round(p[i + 1] * 1000)},${Math.round(p[i + 2] * 1000)}`;
  for (let i = 0; i < p.length; i += 3) { const k = key(i); const a = acc.get(k) || [0, 0, 0]; a[0] += n[i]; a[1] += n[i + 1]; a[2] += n[i + 2]; acc.set(k, a); }
  for (let i = 0; i < p.length; i += 3) { const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; on[i] = a[0] / l; on[i + 1] = a[1] / l; on[i + 2] = a[2] / l; }
  g.setAttribute("onrm", new THREE.BufferAttribute(on, 3));
  return g;
}
const GEO = {};
const unitBox = () => GEO.box ??= prep(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));

/** a triangle soup from [[x,y,z], ...] faces (each face a convex polygon, counter-clockwise seen from outside) */
export function polyGeo(faces) {
  const pos = [];
  for (const f of faces) for (let i = 1; i < f.length - 1; i++) pos.push(...f[0], ...f[i], ...f[i + 1]);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}

// ---------------- Batch: many small parts merged into one mesh (+ one ink hull) ----------------
// Parts are placed in world units; colours are CSS strings. Options per part: ink (default batch.ink), glow (unlit:
// windows at night, lanterns), haze (default true: distant parts fade toward the look's haze colour by their z).
export class Batch {
  constructor(film, o = {}) {
    this.film = film; this.ink = o.ink ?? true; this.cast = o.cast ?? true; this.receive = o.receive ?? true; this.haze = o.haze ?? true;
    this.parts = { lit: [], glow: [] }; this.name = o.name ?? "batch";
  }
  /** add any geometry (built around its own origin) with a transform { x, y, z, rx, ry, rz, sx, sy, sz } */
  add(geo, color, o = {}) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(o.x ?? 0, o.y ?? 0, o.z ?? 0),
      new THREE.Quaternion().setFromEuler(new THREE.Euler((o.rx ?? 0) * D2R, (o.ry ?? 0) * D2R, (o.rz ?? 0) * D2R, "YXZ")),
      new THREE.Vector3(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1));
    if (o.matrix) m.premultiply(o.matrix);
    const g = (geo.attributes.onrm ? geo : prep(geo)).clone().applyMatrix4(m);
    // onrm is a direction: rotate it with the part (applyMatrix4 only moves position / normal)
    const nm = new THREE.Matrix3().getNormalMatrix(m), on = g.attributes.onrm, v = new THREE.Vector3();
    for (let i = 0; i < on.count; i++) { v.fromBufferAttribute(on, i).applyMatrix3(nm).normalize(); on.setXYZ(i, v.x, v.y, v.z); }
    const c = new THREE.Color(color);
    if (this.haze && o.haze !== false) { g.computeBoundingBox(); const z = (g.boundingBox.min.z + g.boundingBox.max.z) / 2; c.lerp(this.film.hazeColor, this.film.hazeAt(z)); }
    (o.glow ? this.parts.glow : this.parts.lit).push({ g, c, ink: o.ink ?? this.ink });
    return this;
  }
  /** a box standing on y (x, z = centre of its footprint) */
  box(x, y, z, w, h, d, color, o = {}) { return this.add(unitBox(), color, { ...o, x, y, z, sx: w, sy: h, sz: d }); }
  /** a cylinder / cone standing on y; r1 = top radius (0 = cone), seg = sides (6–16 reads as toy) */
  cyl(x, y, z, r0, r1, h, color, o = {}) {
    const k = `cyl${o.seg ?? 12}`; GEO[k] ??= prep(new THREE.CylinderGeometry(1, 1, 1, o.seg ?? 12).translate(0, 0.5, 0));
    if (r1 === r0) return this.add(GEO[k], color, { ...o, x, y, z, sx: r0, sy: h, sz: r0 });
    return this.add(new THREE.CylinderGeometry(r1, r0, h, o.seg ?? 12).translate(0, h / 2, 0), color, { ...o, x, y, z });
  }
  /** a low-poly ball (icosahedron); s = [sx, sy, sz] squash */
  ball(x, y, z, r, color, o = {}) { GEO.ball ??= prep(new THREE.IcosahedronGeometry(1, 1)); return this.add(GEO.ball, color, { ...o, x, y, z, sx: r * (o.s?.[0] ?? 1), sy: r * (o.s?.[1] ?? 1), sz: r * (o.s?.[2] ?? 1) }); }
  /** a flat panel facing +z (signs, glass), centred on x, standing on y */
  panel(x, y, z, w, h, color, o = {}) { return this.box(x, y, z, w, h, o.t ?? 0.04, color, o); }
  /** merge into a Group: one lit mesh, one unlit mesh, one ink hull */
  build() {
    const F = this.film, group = new THREE.Group(); group.name = this.name;
    const merge = (list) => {
      if (!list.length) return null;
      let n = 0; for (const p of list) n += p.g.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), onr = new Float32Array(n * 3);
      let o = 0;
      for (const p of list) {
        const a = p.g.attributes; pos.set(a.position.array, o); nor.set(a.normal.array, o); onr.set(a.onrm.array, o);
        for (let i = 0; i < a.position.count; i++) col.set([p.c.r, p.c.g, p.c.b], o + i * 3);
        o += a.position.count * 3;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setAttribute("onrm", new THREE.BufferAttribute(onr, 3));
      g.computeBoundingSphere(); return g;
    };
    const lit = merge(this.parts.lit), glow = merge(this.parts.glow);
    if (lit) { const m = new THREE.Mesh(lit, F.mat.lit); m.castShadow = this.cast; m.receiveShadow = this.receive; group.add(m); }
    if (glow) { const m = new THREE.Mesh(glow, F.mat.glow); m.castShadow = this.cast; group.add(m); }
    if (F.look.ink) {
      const inked = merge([...this.parts.lit, ...this.parts.glow].filter((p) => p.ink));
      if (inked) { const h = new THREE.Mesh(inked, F.mat.hull); h.castShadow = false; h.receiveShadow = false; group.add(h); }
    }
    return group;
  }
}

// ---------------- the film ----------------
export class Film {
  /** o: { facade: { x, y, w, h } (the flat frame on the plane z = 0), focus: { x, y?, z? } (the gap the reveal looks
   *  through), finish: "soft" | "ink", look: overrides of LOOKS[finish], sun: { az, el } (deg; az 0 = from the camera
   *  side, + = from the right), aspect: "16:9" | "9:16", fps, blur: { samples, shutter } } */
  constructor(o = {}) {
    this.o = o;
    this.fps = +(Q.get("fps") ?? o.fps ?? 30);
    this.scale = +(Q.get("scale") ?? o.scale ?? 1);
    const ar = Q.get("ar") ?? o.aspect ?? "16:9";
    const [aw, ah] = ar.split(":").map(Number); this.aspect = aw / ah;
    const base = 1920;
    this.W = Math.round((this.aspect >= 1 ? base : base * this.aspect) * this.scale);
    this.H = Math.round((this.aspect >= 1 ? base / this.aspect : base) * this.scale);
    this.finishName = Q.get("finish") ?? o.finish ?? "soft";
    this.look = { ...LOOKS[this.finishName], ...(o.look ?? {}) };
    if (o.look?.haze) this.look.haze = { ...LOOKS[this.finishName].haze, ...o.look.haze };
    if (Q.get("ink") === "0") this.look.ink = null;
    this.hazeColor = new THREE.Color(this.look.haze.color);
    const f = o.facade ?? { x: 0, y: 6, w: 24, h: 13 };
    this.facade = { x: f.x ?? 0, y: f.y ?? f.h / 2, w: f.w ?? f.h * this.aspect, h: f.h };
    this.focus = { x: o.focus?.x ?? this.facade.x, y: o.focus?.y ?? this.facade.y, z: o.focus?.z ?? 0 };
    // the frame height on the facade plane: the facade rectangle must cover the frame in the flat view
    this.frameH = Math.max(this.facade.h, this.facade.w / this.aspect);
    // the flat eye height: at (or just under) the lowest roofline of the front row
    this.eye = o.eye ?? this.facade.y - 0.1 * this.frameH;
    // motion blur: sub-frames over the shutter (in frames), as many as the picture moves in pixels / px, up to samples
    this.blur = { samples: +(Q.get("blur") ?? o.blur?.samples ?? 24), shutter: o.blur?.shutter ?? 1.0, px: o.blur?.px ?? 3 };
    this.sun = { az: o.sun?.az ?? -38, el: o.sun?.el ?? 42 };
    this.beatsList = []; this.updates = []; this.landmarks = []; this.movers = []; this.cues = { sound: o.sound ?? {} };
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.look.sky);
    this.camera = new THREE.PerspectiveCamera(30, this.aspect, 0.1, 5000);
    this.makeMaterials();
    this.root = new THREE.Group(); this.scene.add(this.root);
  }
  /** haze factor 0..max for a part at depth z (behind the facade = negative z) */
  hazeAt(z) { const h = this.look.haze; const d = -z; return h.max * smooth((d - h.near) / Math.max(1, h.far - h.near)); }
  makeMaterials() {
    const L = this.look, steps = L.steps ?? [0, 255];
    const data = new Uint8Array(steps.length * 4); steps.forEach((v, i) => data.set([v, v, v, 255], i * 4));
    const grad = new THREE.DataTexture(data, steps.length, 1); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
    this.mat = {
      lit: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad }),
      glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
      hull: new THREE.ShaderMaterial({
        uniforms: { px: { value: (L.ink?.px ?? 1.5) * (this.H / 1080) }, res: { value: new THREE.Vector2(this.W, this.H) }, ink: { value: new THREE.Color(L.ink?.color ?? "#222") } },
        vertexShader: `attribute vec3 onrm; uniform float px; uniform vec2 res;
          void main() { vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            vec3 n = normalize(normalMatrix * onrm); vec4 q = projectionMatrix * vec4(n, 0.0);
            vec2 d = q.xy; float l = length(d); d = l > 1e-6 ? d / l : vec2(0.0);
            p.xy += d * px * 2.0 / res * p.w; gl_Position = p; }`,
        fragmentShader: `uniform vec3 ink; void main() { gl_FragColor = vec4(ink, 1.0);
          #include <colorspace_fragment>
          }`,
        side: THREE.BackSide,
      }),
    };
  }
  /** a new Batch (see Batch); call .build() and F.add() it when done — or use F.part(fn) */
  batch(o) { return new Batch(this, o); }
  /** build a batch with fn(B) and add it; returns the Group (keep it to move it in update) */
  part(fn, o = {}) { const B = this.batch(o); fn(B); const g = B.build(); this.add(g); return g; }
  add(obj) { this.root.add(obj); return obj; }
  /** mark the object the illusion hides (the far tower, the gate): check() proves it shows in the flat frame and shrinks
   *  in the reveal */
  landmark(obj, name = "landmark") { obj.userData.landmark = name; this.landmarks.push(obj); return obj; }
  /** fn(t, F) sets every moving thing for time t (cars, boats, birds, water). Never accumulate: set from t. */
  update(fn) { this.updates.push(fn); return this; }
  /** phase in [0, 1) that completes `laps` whole cycles per loop: x = x0 + span * F.lap(t, 2) loops seamlessly */
  lap(t, laps = 1) { const u = (t / this.duration) * laps; return u - Math.floor(u); }
  /** the camera script: a list of views, each held then moved to the next. Entries: "flat" | "deep" | { view, ...
   *  overrides, hold, move, ease }. The last entry must equal the first (the loop wraps). o: { beat, move, ease } */
  beats(list, o = {}) {
    const beat = o.beat ?? 1.0, move = o.move ?? 0.42, ease = o.ease ?? "snap";
    this.keys = []; let t = 0;
    for (let i = 0; i < list.length; i++) {
      const v = this.resolve(list[i]), e = typeof list[i] === "object" ? list[i] : {};
      if (i === 0) { this.keys.push({ t: 0, v }); continue; }
      const mv = e.move ?? move, hold = e.hold ?? (beat - mv);
      t += hold; this.keys.push({ t, v: this.keys[this.keys.length - 1].v, hold: true });
      t += mv; this.keys.push({ t, v, ease: e.ease ?? ease, move: true });
    }
    this.duration = +t.toFixed(4); this.beatList = list;
    this.cues.moves = this.keys.filter((k) => k.move).map((k, i, a) => {
      const prev = this.keys[this.keys.indexOf(k) - 1];
      return { from: +prev.t.toFixed(3), to: +k.t.toFixed(3), view: k.v.name, yaw: k.v.yaw - prev.v.yaw, fov: [prev.v.fov, k.v.fov] };
    });
    this.cues.beat = beat;
    return this;
  }
  /** a view with its eye height turned into a pitch */
  resolve(x) {
    const v = view(x);
    if (v.eye !== undefined && v.eye !== false) {
      const eye = v.eye === true ? this.eye : v.eye, D = (this.frameH / (2 * Math.tan((v.fov * D2R) / 2))) * v.zoom;
      v.pitch = Math.asin(Math.max(-1, Math.min(1, (eye - this.anchor(v).y) / D))) / D2R;
    }
    return v;
  }
  /** the flat camera's position (y, z) — available while building, before beats() */
  flatEye() { const v = this.resolve("flat"), D = (this.frameH / (2 * Math.tan((v.fov * D2R) / 2))) * v.zoom, p = this.anchor(v); return { y: p.y + D * Math.sin(v.pitch * D2R), z: p.z + D * Math.cos(v.pitch * D2R) }; }
  /** the tallest a building at depth z (< 0) may be and still hide behind a front roofline at height roof in the flat
   *  view. Use it to size the town behind: F.hide(z, 7.5) − 0.3. Taller things show over the roofline (a skyline, the
   *  landmark) — on purpose only. */
  hide(z, roof) { const c = this.flatEye(); return c.y + ((roof - c.y) * (c.z - z)) / c.z; }
  /** the camera state at time t (eased between keys; fov through log tan so the dolly zoom feels even) */
  stateAt(t) {
    const K = this.keys; t = ((t % this.duration) + this.duration) % this.duration;
    let i = 1; while (i < K.length - 1 && K[i].t < t) i++;
    const a = K[i - 1], b = K[i];
    const u = b.t > a.t ? (EASE[b.ease] ?? EASE.snap)((t - a.t) / (b.t - a.t)) : 1;
    const s = {};
    for (const k of NUM) s[k] = lerp(a.v[k], b.v[k], u);
    const lt = (f) => Math.log(Math.tan((f * D2R) / 2));
    s.fov = (2 * Math.atan(Math.exp(lerp(lt(a.v.fov), lt(b.v.fov), u)))) / D2R;
    const pa = this.anchor(a.v), pb = this.anchor(b.v);
    s.pivot = pa.lerp(pb, u); s.moving = b.move && u > 0 && u < 1;
    return s;
  }
  anchor(v) {
    const A = v.at === "facade" ? this.facade : this.focus, H = this.frameH;
    return new THREE.Vector3(A.x + v.px * H, A.y + v.py * H, (A.z ?? 0) + v.pz * H);
  }
  /** place the camera for state s */
  aim(s) {
    const H = this.frameH, D = (H / (2 * Math.tan((s.fov * D2R) / 2))) * s.zoom;
    const y = s.yaw * D2R, p = s.pitch * D2R, c = this.camera;
    c.fov = s.fov; c.position.set(s.pivot.x + D * Math.sin(y) * Math.cos(p), s.pivot.y + D * Math.sin(p), s.pivot.z + D * Math.cos(y) * Math.cos(p));
    c.up.set(Math.sin(s.roll * D2R), Math.cos(s.roll * D2R), 0); c.lookAt(s.pivot);
    c.near = Math.max(0.05, D * 0.03); c.far = D + this.radius * 2.5; c.updateProjectionMatrix();
    return D;
  }
  /** how far (px) the picture moves between two camera states: the largest shift of a few probe points (the flat
   *  frame's corners, the focus, the far end) */
  travel(a, b) {
    const H = this.frameH, W = H * this.aspect, f = this.facade, pts = [];
    for (const [x, y] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5], [0, 0]]) pts.push(new THREE.Vector3(f.x + x * W, f.y + y * H, 0));
    pts.push(new THREE.Vector3(this.focus.x, this.focus.y, -H * 2), new THREE.Vector3(this.focus.x, this.focus.y, -H * 6));
    for (const lm of this.landmarks) pts.push(new THREE.Box3().setFromObject(lm).getCenter(new THREE.Vector3()));
    const pa = pts.map((p) => this.project(p, a)), pb = pts.map((p) => this.project(p, b));
    let m = 0;
    for (let i = 0; i < pts.length; i++) { if (pa[i].z > 1 || pb[i].z > 1) continue; m = Math.max(m, Math.hypot((pa[i].x - pb[i].x) * this.W / 2, (pa[i].y - pb[i].y) * this.H / 2)); }
    return Math.min(m, this.W);
  }
  setTime(t) { for (const f of this.updates) f(t, this); }
  // ---------------- rendering ----------------
  initRenderer() {
    const canvas = document.createElement("canvas"); canvas.width = this.W; canvas.height = this.H; this.canvas = canvas;
    const r = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    r.setPixelRatio(1); r.setSize(this.W, this.H, false); r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.shadowMap.autoUpdate = false;
    this.renderer = r;
    const rt = (s) => new THREE.WebGLRenderTarget(this.W, this.H, { type: THREE.HalfFloatType, samples: s, depthBuffer: s > 0 });
    this.rtScene = rt(4); this.rtAcc = rt(0);
    const quad = (frag, extra) => { const m = new THREE.ShaderMaterial({ uniforms: { tex: { value: null }, w: { value: 1 } }, vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }", fragmentShader: frag, depthTest: false, depthWrite: false, ...extra }); const s = new THREE.Scene(); const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); q.frustumCulled = false; s.add(q); return { s, m }; };
    this.accPass = quad("uniform sampler2D tex; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tex, vUv).rgb * w, 1.0); }",
      { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation, transparent: true });
    this.outPass = quad("uniform sampler2D tex; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tex, vUv).rgb, 1.0);\n#include <colorspace_fragment>\n}");
    this.qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  /** lights: lavender ambient (the shade colour) + a sun that lifts the lit side to the albedo */
  initLights() {
    const L = this.look, sh = new THREE.Color(L.shade);
    this.scene.add(new THREE.AmbientLight(sh, Math.PI));
    const sun = new THREE.DirectionalLight(new THREE.Color(Math.max(0, 1 - sh.r), Math.max(0, 1 - sh.g), Math.max(0, 1 - sh.b)).multiplyScalar(L.sun), Math.PI);
    const box = new THREE.Box3().setFromObject(this.root), c = box.getCenter(new THREE.Vector3());
    // the shadow frustum covers the near town tightly (crisp facade shadows) — far rows rarely need cast shadows
    const reach = this.o.shadowReach ?? Math.max(this.frameH * 4.5, 40);
    const az = this.sun.az * D2R, el = this.sun.el * D2R, dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const tgt = new THREE.Vector3(this.focus.x, 0, -reach * 0.35);
    sun.position.copy(tgt).addScaledVector(dir, reach * 3); sun.target.position.copy(tgt);
    sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
    const sc = sun.shadow.camera; sc.left = -reach; sc.right = reach; sc.top = reach; sc.bottom = -reach; sc.near = 1; sc.far = reach * 6;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 1.5;
    this.scene.add(sun, sun.target); this.sunLight = sun;
    this.radius = box.getSize(new THREE.Vector3()).length() / 2 + c.length();
  }
  renderSub(t) {
    this.setTime(t); const s = this.stateAt(t); this.aim(s);
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.setRenderTarget(this.rtScene); this.renderer.render(this.scene, this.camera);
    return s;
  }
  /** draw frame t: K sub-frames over the shutter while the camera moves (motion blur), one when it holds */
  seek(t) {
    const r = this.renderer; t = Math.max(0, Math.min(this.duration, t));
    const dt = this.blur.shutter / this.fps, probe = this.stateAt(t), prev = this.stateAt(t - dt / 2), next = this.stateAt(t + dt / 2);
    const moving = probe.moving || prev.moving || next.moving;
    const K = moving ? Math.max(1, Math.min(this.blur.samples, Math.ceil(this.travel(prev, next) / this.blur.px))) : 1;
    r.setRenderTarget(this.rtAcc); r.setClearColor(0x000000, 1); r.clear();
    for (let i = 0; i < K; i++) {
      const ts = K === 1 ? t : t - dt / 2 + (dt * (i + 0.5)) / K;
      this.renderSub(ts);
      this.accPass.m.uniforms.tex.value = this.rtScene.texture; this.accPass.m.uniforms.w.value = 1 / K;
      r.setRenderTarget(this.rtAcc); r.autoClear = false; r.render(this.accPass.s, this.qcam); r.autoClear = true;
    }
    this.outPass.m.uniforms.tex.value = this.rtAcc.texture;
    r.setRenderTarget(null); r.render(this.outPass.s, this.qcam);
    this.t = t; this.state = probe;
    return probe;
  }
  // ---------------- checks (check.mjs prints these) ----------------
  /** project a world point with the camera state s → NDC */
  project(p, s) { this.aim(s); return p.clone().project(this.camera); }
  /** is any of the landmark's upper half visible from state s? (rays to sample points; the first hit must be it) */
  sees(obj, s) {
    this.aim(s); this.camera.updateMatrixWorld();
    const box = new THREE.Box3().setFromObject(obj), ray = new THREE.Raycaster(), out = { hits: 0, tries: 0 };
    const all = this.root.children;
    for (const fy of [0.55, 0.7, 0.85]) for (const fx of [0.3, 0.5, 0.7]) {
      const p = new THREE.Vector3(lerp(box.min.x, box.max.x, fx), lerp(box.min.y, box.max.y, fy), (box.min.z + box.max.z) / 2);
      const ndc = p.clone().project(this.camera); if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) continue;
      out.tries++; ray.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), this.camera);
      const h = ray.intersectObjects(all, true).find((x) => x.object.material !== this.mat.hull);
      let o = h?.object; while (o && o !== obj) o = o.parent; if (o === obj) out.hits++;
    }
    return out;
  }
  /** the landmark's height on screen (fraction of the frame) in state s */
  screenHeight(obj, s) {
    this.aim(s); const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3());
    const a = new THREE.Vector3(c.x, box.min.y, c.z).project(this.camera), b = new THREE.Vector3(c.x, box.max.y, c.z).project(this.camera);
    return Math.abs(b.y - a.y) / 2;
  }
  check() {
    const out = { warn: [], fail: [] }, K = this.keys, L = this.beatList;
    if (!K?.length) { out.fail.push("no camera beats: call F.beats([...])"); return out; }
    const name = (x) => (typeof x === "string" ? x : JSON.stringify(x));
    if (name(L[0]) !== name(L[L.length - 1])) out.fail.push(`the loop does not wrap: first view ${name(L[0])} ≠ last view ${name(L[L.length - 1])}`);
    if (this.resolve(L[0]).fov > 9) out.warn.push(`the opening view has fov ${view(L[0]).fov}° — the flat illusion needs a long lens (≤ 8°)`);
    if (Math.abs(this.resolve(L[0]).pitch) > 3) out.warn.push(`the opening view is pitched ${view(L[0]).pitch}° — a flat elevation is near level (|pitch| ≤ 2°)`);
    if (!L.some((v) => (typeof v === "string" ? v : v.view) === "flat")) out.warn.push("no flat view in the loop: the trick needs the flat facade");
    for (let i = 1; i < K.length; i++) if (K[i].move) {
      const d = K[i].t - K[i - 1].t; if (d < 0.2 || d > 1.0) out.warn.push(`move to ${K[i].v.name} at ${K[i - 1].t.toFixed(2)} s lasts ${d.toFixed(2)} s (reference 0.3–0.6 s)`);
    } else if (K[i].hold) { const d = K[i].t - K[i - 1].t; if (d < 0.25) out.warn.push(`hold on ${K[i].v.name} at ${K[i - 1].t.toFixed(2)} s is only ${d.toFixed(2)} s (the eye needs ≥ 0.3 s to read a view)`); }
    if (this.duration < 4 || this.duration > 20) out.warn.push(`the loop is ${this.duration.toFixed(1)} s (reference 8 s)`);
    if (!this.landmarks.length) out.warn.push("no landmark: mark the far object the flat view hides with F.landmark(obj)");
    // a camera that crowds a wall: most of a 3 × 3 grid of rays hit something closer than a fifth of the distance
    for (const k of K.filter((k) => k.hold)) {
      const s = this.stateAt(k.t - 0.01), D = this.aim(s); this.camera.updateMatrixWorld();
      const ray = new THREE.Raycaster(); let near = 0;
      for (const x of [-0.6, 0, 0.6]) for (const y of [-0.6, 0, 0.6]) {
        ray.setFromCamera(new THREE.Vector2(x, y), this.camera);
        const h = ray.intersectObjects(this.root.children, true).find((h) => h.object.material !== this.mat.hull);
        if (h && h.distance < D * 0.2) near++;
      }
      if (near >= 4) out.warn.push(`the ${k.v.name} view at ${k.t.toFixed(2)} s crowds a wall (${near}/9 rays hit within ${(D * 0.2).toFixed(1)} m): pull it back (zoom) or move the pivot`);
    }
    const flat = this.stateAt(0);
    for (const lm of this.landmarks) {
      const seen = this.sees(lm, flat); const n = lm.userData.landmark;
      if (!seen.tries) out.fail.push(`${n} is outside the flat frame`);
      else if (!seen.hits) out.fail.push(`${n} is hidden in the flat frame (nothing of its upper half is visible)`);
      const hFlat = this.screenHeight(lm, flat);
      const deepest = K.filter((k) => k.v.at === "focus").reduce((m, k) => Math.min(m, this.screenHeight(lm, this.stateAt(k.t))), Infinity);
      const ratio = hFlat / deepest;
      out.info = (out.info ?? []).concat(`${n}: ${(hFlat * 100).toFixed(0)}% of the frame height when flat, ${(deepest * 100).toFixed(0)}% at its smallest → shrinks ${ratio.toFixed(1)}×`);
      if (ratio < 2.5) out.warn.push(`${n} only shrinks ${ratio.toFixed(1)}× in the reveal (≥ 3× sells the trick): push it deeper (z) and scale it up`);
      if (hFlat < 0.12) out.warn.push(`${n} is small in the flat frame (${(hFlat * 100).toFixed(0)}% of the height): scale it up so the flat view reads as one picture`);
    }
    this.aim(this.stateAt(this.t ?? 0));
    return out;
  }
  // ---------------- start: build, warm up, publish the contract, live player ----------------
  start(o = {}) {
    if (!this.keys) this.beats(["flat", "deep", "flat"]);
    this.initLights(); this.initRenderer();
    this.cues.duration = this.duration; this.cues.fps = this.fps; this.cues.title = document.title;
    window.DURATION = this.duration; window.FPS = this.fps; window.film = this;
    window.seek = (t) => this.seek(t);
    this.seek(Q.has("t") ? +Q.get("t") : 0);
    const render = Q.get("render") === "1";
    document.body.style.cssText = "margin:0;background:#0d0d14;display:grid;place-items:center;min-height:100vh;font:14px system-ui;color:#ddd";
    const ar = this.W / this.H;
    this.canvas.style.cssText = render ? "" : `width:min(100vw,${(ar * 88).toFixed(2)}vh);height:auto;display:block`;
    document.body.append(this.canvas);
    if (!render) this.player(o.audio ?? this.o.audio);
    window.__ready = true;
  }
  player(src) {
    const bar = document.createElement("div");
    bar.style.cssText = "display:flex;gap:10px;align-items:center;margin:8px 0;flex-wrap:wrap;justify-content:center";
    const mk = (txt) => { const b = document.createElement("button"); b.textContent = txt; b.style.cssText = "font:inherit;padding:6px 14px;border-radius:8px;border:0;background:#f2c230;color:#111;cursor:pointer"; return b; };
    const btn = mk("▶ play"), snd = src ? mk("sound off") : null;
    if (snd) snd.style.background = "#444", snd.style.color = "#eee";
    const pos = document.createElement("input"); pos.type = "range"; pos.min = 0; pos.max = this.duration; pos.step = 1 / this.fps; pos.value = this.t ?? 0; pos.style.width = "min(56vw,420px)";
    const lab = document.createElement("span"); lab.style.minWidth = "4.5em";
    bar.append(btn, pos, lab); if (snd) bar.append(snd);
    document.body.append(bar); document.body.style.gridTemplateRows = "1fr auto";
    const audio = src ? new Audio(src) : null; if (audio) audio.loop = true;
    let sound = false, playing = false, t0 = 0, w0 = 0;
    // live preview: fewer blur samples so it keeps up; renders stay at full quality
    const liveBlur = Math.min(this.blur.samples, +(Q.get("liveblur") ?? 3));
    const now = () => (audio && sound && !audio.paused ? audio.currentTime : w0 + (performance.now() - t0) / 1000) % this.duration;
    const show = (t) => { lab.textContent = t.toFixed(2) + " s · " + (this.state?.moving ? "→" : this.viewAt(t)); };
    const loop = () => { if (!playing) return; const t = now(); const b = this.blur.samples; this.blur.samples = liveBlur; this.seek(t); this.blur.samples = b; pos.value = t; show(t); requestAnimationFrame(loop); };
    const play = (on) => {
      playing = on; btn.textContent = on ? "❚❚ pause" : "▶ play";
      if (on) { w0 = +pos.value; t0 = performance.now(); if (audio && sound) { audio.currentTime = w0; audio.play().catch(() => {}); } loop(); } else audio?.pause();
    };
    btn.onclick = () => play(!playing);
    this.canvas.onclick = () => play(!playing);
    if (snd) snd.onclick = () => { sound = !sound; snd.textContent = sound ? "sound on" : "sound off"; if (playing) { play(false); play(true); } };
    pos.oninput = () => { if (playing) play(false); this.seek(+pos.value); show(+pos.value); };
    show(this.t ?? 0);
    if (Q.get("autoplay") === "1") play(true);
  }
  /** the name of the view held at t (for the player label) */
  viewAt(t) { const K = this.keys; let v = K[0].v; for (const k of K) if (k.t <= t + 1e-6) v = k.v; return v.name; }
}

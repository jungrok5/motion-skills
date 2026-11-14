// colored-pencil-world · world.js — a walkable 3D world drawn in coloured pencil on a sketchbook page, and a film of
// someone walking through it.
//
// You describe the world in world.html: the light (sun, sky light, the pencils), the way (a path), the land (height and
// the colour of what covers it), the things that stand in it (kit.js: sky, ranges, ground, paving, water, houses,
// trees, props, bunting, boats, birds, smoke — or pieces of your own built from shape.js), the walker (figure.js) and
// the shots (where they walk and where the eye is). From start() on, a frame is a pure function of t: seek(t) walks the
// walker to their place on the way, plants their feet, puts the eye where the shot says and draws the picture. The same
// page plays live — and there you can take over and walk (W A S D, drag to look) — and renders to MP4 (scripts/render.mjs);
// scripts/check.mjs proves it first.
//
// Contract (set by start()): window.seek(t), renderAt(t), DURATION, FPS, SIZE, shotAt(t), runChecks(), showCast(i), film, READY.
// Query: ?render=1 (fixed canvas, no live loop) · ?t=12 (one frozen frame) · ?scale=.5 · ?px=4.6 (stroke spacing)
//        · ?walk=1 (start walking) · ?off=page,caption,figure,hud,<a thing's name> · ?aa=0 (no multisampling)
import * as THREE from 'three';
import { createPencil } from './pencil.js';
import { createPage } from './page.js';
export { THREE };

export const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sm = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const EASE = { linear: (p) => p, in: (p) => p * p, out: (p) => 1 - (1 - p) * (1 - p), inout: (p) => p * p * (3 - 2 * p) };
export function rng(seed = 1) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
const h2 = (i, j, seed) => { const s = Math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s); };
/** smooth value noise, 0..1 */
export function noise(x, z, seed = 0) {
  const i = Math.floor(x), j = Math.floor(z); let u = x - i, v = z - j; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  return lerp(lerp(h2(i, j, seed), h2(i + 1, j, seed), u), lerp(h2(i, j + 1, seed), h2(i + 1, j + 1, seed), u), v);
}
export function fbm(x, z, octaves = 4, seed = 0) { let a = 0, w = 0.5, t = 0; for (let o = 0; o < octaves; o++) { a += w * noise(x, z, seed + o * 13); t += w; x *= 2.03; z *= 2.03; w *= 0.5; } return a / t; }
/** a pencil colour a step darker (k < 1) or toward white (k > 1) */
export const tone = (c, k) => { const a = new THREE.Color(c); return k <= 1 ? '#' + a.multiplyScalar(k).getHexString() : '#' + a.lerp(new THREE.Color('#ffffff'), Math.min(1, k - 1)).getHexString(); };
const dirOf = (az, el) => { const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el); return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)); };
const FONT = new URL('./fonts/Caveat-500.woff2', import.meta.url).href;

export class World {
  /** o: { name, seed, extent (m, the land is ±extent), size: [1920, 1080], fps,
   *  sun: { az (compass bearing it shines from, 0 = -z), el (height, °), colour, strength }, sky: '#ffffff' (sky light), skyStrength, ground: '#000000',
   *  pencil: { px, warm, shadow, press: [warm, all over, strokes, shadow] }, page: { paper, margin, line, flecks },
   *  caption: 'the canal, october' | { text, at, size }, wind: { az, strength }, shadow: { box: [w, d], centre: [x, z], size } } */
  constructor(o = {}) {
    const q = new URLSearchParams(location.search);
    this.o = o; this.name = o.name || document.title;
    [this.W, this.H] = o.size || [1920, 1080]; this.FPS = o.fps || 30;
    this.render = q.has('render'); this.frozen = q.has('t'); this.scale = +(q.get('scale') || 1);
    this.off = new Set((q.get('off') || '').split(',').filter(Boolean)); this.query = q;
    this.extent = o.extent || 80; this.landRes = o.landRes || 321; this.seed = o.seed || 1; this.rand = rng(this.seed);
    this.things = []; this.colliders = []; this.fronts = []; this.rules = []; this.counts = {}; this.list = []; this.DURATION = 0;
    this.time = { value: 0 };
    const w = THREE.MathUtils.degToRad(o.wind?.az ?? 60); this.wind = { x: Math.sin(w), z: -Math.cos(w), strength: o.wind?.strength ?? 1 };

    const canvas = this.canvas = document.createElement('canvas'); canvas.id = 'frame';
    document.body.style.cssText = 'margin:0;background:#e9e4d8;overflow:hidden;height:100vh;display:grid;place-items:center';
    document.body.appendChild(canvas);
    const renderer = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: this.render, powerPreference: 'high-performance' });
    renderer.autoClear = false;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(0xffffff, 1);
    const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
    this.gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
    this.software = /swiftshader|llvmpipe|software/i.test(this.gpu);
    if (!this.render && !q.get('scale') && this.software) this.scale *= 0.5; // a live page with no GPU draws smaller so that it still moves

    const pc = o.pencil || {};
    this.pencil = createPencil({ ...pc, px: +(q.get('px') || pc.px || 4.6) });
    this.pxAt1080 = this.pencil.px.value;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, this.W / this.H, 0.12, 4000);
    // the light: a sun that casts shadows, and the sky's light in the shade (a pencil drawing's shade is a colour, never black)
    const sun = o.sun || {};
    this.sunDir = sun.dir ? new THREE.Vector3(...sun.dir).normalize() : dirOf(sun.az ?? 215, sun.el ?? 38);
    this.sun = new THREE.DirectionalLight(sun.colour || '#ffffff', Math.PI * (sun.strength ?? 1.25));
    this.sun.castShadow = true;
    this.scene.add(this.sun, this.sun.target, new THREE.AmbientLight(o.sky || '#ffffff', Math.PI * (o.skyStrength ?? 0.27)), new THREE.HemisphereLight(o.sky || '#ffffff', o.ground || '#000000', Math.PI * 0.2));
    this.#size();
    this.land({});
  }

  #size() {
    const live = !this.render, fit = live ? Math.min(innerWidth / this.W, innerHeight / this.H) : 1;
    const dpr = live ? Math.min(devicePixelRatio || 1, 2) : 1, k = live && !this.frozen ? Math.min(fit * dpr, 1) * this.scale : this.scale;
    this.bw = Math.max(2, Math.round(this.W * k)); this.bh = Math.max(2, Math.round(this.H * k));
    this.renderer.setSize(this.bw, this.bh, false);
    this.canvas.style.width = (live ? Math.round(this.W * fit) : this.W / 2) + 'px'; this.canvas.style.height = (live ? Math.round(this.H * fit) : this.H / 2) + 'px';
    this.pencil.px.value = (this.pxAt1080 * this.bh) / 1080; // strokes are as far apart on the picture at any size
    if (this.page) this.page.resize();
  }

  // ------------------------------------------------------------------------------------------------- the way
  /** The way through the world: points [x, z] joined by a smooth line. wayAt(s) is the point s metres along it. */
  way(points, { step = 0.25 } = {}) {
    const p = points.map(([x, z]) => new THREE.Vector3(x, 0, z)), curve = new THREE.CatmullRomCurve3(p, false, 'centripetal');
    const n = Math.max(8, Math.ceil(curve.getLength() / step)), pts = curve.getSpacedPoints(n);
    this.wayPts = pts; this.wayStep = curve.getLength() / n; this.wayLen = curve.getLength();
    return this;
  }
  wayAt(s) {
    const pts = this.wayPts, n = pts.length - 1, f = s / this.wayStep, i = cl(Math.floor(f), 0, n - 1), k = f - i, a = pts[i], b = pts[i + 1];
    const hx = b.x - a.x, hz = b.z - a.z, l = Math.hypot(hx, hz) || 1;
    return { x: a.x + hx * k, z: a.z + hz * k, hx: hx / l, hz: hz / l };
  }
  /** how far (x, z) is from the way */
  wayDist(x, z) {
    const pts = this.wayPts; if (!pts) return 1e9; let best = 1e18, bi = 0;
    for (let i = 0; i < pts.length; i += 4) { const d = (pts[i].x - x) ** 2 + (pts[i].z - z) ** 2; if (d < best) { best = d; bi = i; } }
    for (let i = Math.max(0, bi - 4); i < Math.min(pts.length - 1, bi + 4); i++) {
      const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dz = b.z - a.z, t = cl(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1));
      best = Math.min(best, (a.x + dx * t - x) ** 2 + (a.z + dz * t - z) ** 2);
    }
    return Math.sqrt(best);
  }

  // ------------------------------------------------------------------------------------------------ the land
  /** height(x, z) in metres, sampled into a grid; kit.ground draws it and groundAt reads it the same way */
  land({ height = () => 0 }) {
    const res = this.landRes, ext = this.extent, H = this.heights = new Float32Array(res * res);
    for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) H[i + j * res] = height(-ext + (2 * ext * i) / (res - 1), -ext + (2 * ext * j) / (res - 1));
    this.heightFn = height;
    return this;
  }
  /** the ground's height at (x, z), read from the grid exactly as the ground mesh lies */
  groundAt(x, z) {
    const res = this.landRes, ext = this.extent, fx = cl(((x + ext) / (2 * ext)) * (res - 1), 0, res - 1.001), fz = cl(((z + ext) / (2 * ext)) * (res - 1), 0, res - 1.001);
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, H = this.heights, k = i + j * res;
    // the same two triangles a grid square is drawn with
    return u + v <= 1 ? H[k] + (H[k + 1] - H[k]) * u + (H[k + res] - H[k]) * v : H[k + res + 1] + (H[k + res] - H[k + res + 1]) * (1 - u) + (H[k + 1] - H[k + res + 1]) * (1 - v);
  }
  /** where the walker stands: the ground, or a deck (a pier, a bridge) a thing has laid over it */
  standAt(x, z) { let y = this.groundAt(x, z); for (const th of this.things) if (th.floor) { const f = th.floor(x, z); if (f != null) y = Math.max(y, f); } return y; }

  // ------------------------------------------------------------------------------------------------- things
  /** thing: { name, group, colliders: [{x, z, r, top}], fronts (for water to mirror), count, floor(x, z), update(t, world, camera) } */
  add(thing) {
    if (!thing || this.off.has(thing.name)) return thing;
    this.things.push(thing);
    if (thing.group) this.scene.add(thing.group);
    if (thing.colliders) this.colliders.push(...thing.colliders);
    if (thing.fronts) this.fronts.push(...thing.fronts);
    if (thing.count) this.counts[thing.name || 'pieces'] = (this.counts[thing.name || 'pieces'] || 0) + thing.count;
    return thing;
  }
  /** the walker (figure.js) */
  figure(fig) { this.fig = fig; fig.attach(this); if (fig.count) this.counts.figure = fig.count; return fig; }
  /** a rule of your own: fn(world) → a string when it is broken (runChecks) */
  check(name, fn) { this.rules.push({ name, fn }); return this; }

  // -------------------------------------------------------------------------------------------------- shots
  /** shots: [{ name, dur, walk: [from, to] (metres along the way; left out: stands where the last shot ended), ease,
   *  look: [x, y, z] (what the walker turns their head to), figure: false | 'off-screen', caption: 'text' (this shot's),
   *  cam: {…} or { from: {…}, to: {…}, ease } }]. A camera key: { back, side, up, yaw } round the walker (yaw 0 is behind
   *  them, 180 in front), or at: [x, up, z] / way: [s, side, up] for an eye that stays put; look: [side, up, ahead] from
   *  their feet, or lookAt: [x, y, z]; fov. */
  shots(list) {
    let t = 0, at = 0, phase = 0;
    this.list = list.map((s, i) => {
      const walk = s.walk || [at, at], dur = s.dur, speed = Math.abs(walk[1] - walk[0]) / dur;
      const stride = this.fig ? this.fig.strideFor(speed) : 1.4;
      const shot = { ...s, i, name: s.name || `shot ${i + 1}`, t0: t, t1: t + dur, walk, speed, stride, phase0: phase, ease: EASE[s.ease || 'linear'], cam: s.cam?.from ? s.cam : { from: s.cam || {}, to: s.cam || {} } };
      shot.camEase = EASE[shot.cam.ease || 'inout'];
      t += dur; at = walk[1]; phase += Math.abs(walk[1] - walk[0]) / stride;
      return shot;
    });
    this.DURATION = t;
    return this;
  }
  shotAt(t) { const s = this.list.find((s) => t < s.t1) || this.list[this.list.length - 1]; return s && { i: s.i, name: s.name, lt: t - s.t0, p: cl((t - s.t0) / s.dur) }; }

  /** where the walker is at t, and how they are moving */
  walkAt(t) {
    t = cl(t, 0, this.DURATION - 1e-4);
    const sh = this.list.find((s) => t < s.t1) || this.list[this.list.length - 1], p = cl((t - sh.t0) / sh.dur);
    const s = lerp(sh.walk[0], sh.walk[1], sh.ease(p)), e = 0.01, back = sh.walk[1] < sh.walk[0] ? -1 : 1;
    const speed = Math.abs(sh.walk[1] - sh.walk[0]) * (sh.ease(Math.min(1, p + e)) - sh.ease(Math.max(0, p - e))) / ((Math.min(1, p + e) - Math.max(0, p - e)) * sh.dur);
    const w = this.wayAt(s);
    return { shot: sh, p, s, speed, phase: sh.phase0 + Math.abs(s - sh.walk[0]) / sh.stride, stride: sh.stride, x: w.x, z: w.z, hx: w.hx * back, hz: w.hz * back, look: sh.look, at: (ds) => this.wayAt(s + ds * back) };
  }
  #key(k, st, out) {
    const g = (x, z) => this.standAt(x, z), fx = st.x, fz = st.z, fy = g(fx, fz);
    const a = st.at(-2.5), b = st.at(2.5); let hx = b.x - a.x, hz = b.z - a.z; const l = Math.hypot(hx, hz) || 1; hx /= l; hz /= l;
    if (k.at) out.eye.set(k.at[0], g(k.at[0], k.at[2]) + k.at[1], k.at[2]);
    else if (k.way) { const w = this.wayAt(k.way[0]); const x = w.x - w.hz * k.way[1], z = w.z + w.hx * k.way[1]; out.eye.set(x, g(x, z) + k.way[2], z); }
    else {
      const yaw = THREE.MathUtils.degToRad(k.yaw || 0), c = Math.cos(yaw), s = Math.sin(yaw), bx = hx * c - hz * s, bz = hx * s + hz * c, back = k.back ?? 5, side = k.side || 0;
      const x = fx - bx * back - bz * side, z = fz - bz * back + bx * side;
      out.eye.set(x, Math.max(fy + (k.up ?? 1.9), g(x, z) + 0.3), z);
    }
    if (k.lookAt) out.look.set(k.lookAt[0], k.lookAt[1], k.lookAt[2]);
    else { const lk = k.look || [0, 1.25, 0]; out.look.set(fx - hz * lk[0] + hx * lk[2], fy + lk[1], fz + hx * lk[0] + hz * lk[2]); }
    out.fov = k.fov || 50;
    return out;
  }
  /** the eye at t: { eye, look, fov } */
  camAt(t, st = this.walkAt(t)) {
    const A = this.#key(st.shot.cam.from, st, { eye: new THREE.Vector3(), look: new THREE.Vector3() });
    const B = this.#key(st.shot.cam.to, st, { eye: new THREE.Vector3(), look: new THREE.Vector3() }), e = st.shot.camEase(st.p);
    A.eye.lerp(B.eye, e); A.look.lerp(B.look, e); A.fov = lerp(A.fov, B.fov, e);
    A.eye.y = Math.max(A.eye.y, this.groundAt(A.eye.x, A.eye.z) + 0.3);
    return A;
  }

  // -------------------------------------------------------------------------------------------------- frames
  #draw(t, st, cam, cast = false) {
    const c = this.camera;
    this.time.value = t;
    // the cast sheet stands the walker on the open land: only the backdrop (sky, ranges, ground, paving, water) is drawn,
    // so a turning eye never lands inside a house or a wall
    for (const th of this.things) if (th.group) th.group.visible = !cast || !!(th.sky || th.backdrop);
    if (this.fig) {
      const y = this.standAt(st.x, st.z);
      this.fig.group.visible = !this.off.has('figure') && st.shot?.figure !== false;
      this.fig.pose({ t, x: st.x, y, z: st.z, hx: st.hx, hz: st.hz, phase: st.phase, stride: st.stride, speed: st.speed, at: st.at, ground: (x, z) => this.standAt(x, z), look: st.look });
    }
    c.fov = cam.fov; c.aspect = this.W / this.H; c.position.copy(cam.eye); c.up.set(0, 1, 0); c.lookAt(cam.look);
    c.updateProjectionMatrix(); c.updateMatrixWorld(true);
    for (const th of this.things) th.update?.(t, this, c);
    const want = st.shot?.caption ?? this.captionText;
    if (want !== this.shownCaption && !this.off.has('caption')) { this.shownCaption = want; this.page.setCaption(want ? { ...this.captionOpts, text: want } : null); }
    if (this.off.has('page')) { this.renderer.setRenderTarget(null); this.renderer.clear(); this.renderer.render(this.scene, c); }
    else this.page.render(this.scene, c);
    this.now = { t, st, cam };
  }
  /** draw the film's frame at t (seconds) */
  renderAt(t) { const st = this.walkAt(t); this.#draw(t, st, this.camAt(t, st)); }

  // --------------------------------------------------------------------------------------------------- start
  start() {
    const o = this.o, sh = o.shadow || {}, pg = o.page || {};
    if (!this.list.length) this.shots([{ dur: 8, walk: [0, Math.min(this.wayLen || 0, 10)], cam: {} }]);
    // the sun's shadows cover where the film happens: the way, and a margin round it
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const p of this.wayPts || [new THREE.Vector3()]) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
    const cx = sh.centre ? sh.centre[0] : (x0 + x1) / 2, cz = sh.centre ? sh.centre[1] : (z0 + z1) / 2;
    const span = sh.box ? Math.max(...sh.box) : Math.min(140, Math.max(x1 - x0, z1 - z0) + 40), cy = this.groundAt(cx, cz);
    this.sun.target.position.set(cx, cy, cz); this.sun.position.copy(this.sunDir).multiplyScalar(span * 1.2).add(this.sun.target.position);
    const sc = this.sun.shadow.camera, half = span / 2;
    Object.assign(sc, { left: -half, right: half, top: half, bottom: -half, near: 1, far: span * 2.6 }); sc.updateProjectionMatrix();
    this.sun.shadow.mapSize.set(sh.size || 4096, sh.size || 4096); this.sun.shadow.bias = sh.bias ?? -0.0004; this.sun.shadow.normalBias = sh.normalBias ?? 0.03; this.sun.shadow.radius = 3;
    this.page = createPage(this.renderer, { samples: +(this.query.get('aa') ?? pg.samples ?? 4), ...pg });
    const c = typeof o.caption === 'string' ? { text: o.caption } : o.caption || null;
    this.captionText = c?.text || null; this.captionOpts = c || {}; this.shownCaption = undefined;
    this.total = Object.values(this.counts).reduce((a, b) => a + b, 0);
    Object.assign(window, {
      film: this, DURATION: this.DURATION, FPS: this.FPS, SIZE: { W: this.W, H: this.H },
      seek: (t) => { this.paused = true; this.renderAt(t); }, renderAt: (t) => this.renderAt(t), shotAt: (t) => this.shotAt(t),
      runChecks: () => this.runChecks(), showCast: (i) => this.showCast(i),
    });
    // the caption's handwriting is loaded before the first frame (it ships in lib/fonts: no network)
    const font = new FontFace('PencilHand', `url(${FONT})`);
    const go = () => {
      const t = this.query.get('t');
      this.renderAt(t != null ? +t : 0);
      if (!this.render && !this.frozen) this.#live(); else if (this.frozen) addEventListener('resize', () => { this.#size(); this.renderAt(+t); });
      window.READY = true;
    };
    font.load().then((f) => { document.fonts.add(f); }, () => {}).then(go);
    return this;
  }

  // ---------------------------------------------------------------------------------------------- the cast sheet
  /** the walker alone, turned every way and in every gait: view i of fig.cast(). Returns its label (or null past the end). */
  showCast(i) {
    const views = this.fig ? this.fig.cast() : [], v = views[i];
    if (!v) return null;
    const first = this.list[0], s0 = (first.walk[0] + first.walk[1]) / 2, w = this.wayAt(s0), stride = this.fig.strideFor(v.speed);
    const st = { shot: { figure: true, caption: v.label }, p: 0, s: s0, speed: v.speed, phase: v.phase, stride, x: w.x, z: w.z, hx: w.hx, hz: w.hz, at: (ds) => this.wayAt(s0 + ds), look: v.look };
    const k = { back: v.dist || this.fig.height * 2.5, up: this.fig.height * 0.62, yaw: v.yaw, look: [0, this.fig.height * 0.52, 0], fov: 30 };
    const flat = { ...st, at: (ds) => ({ x: w.x + w.hx * ds, z: w.z + w.hz * ds, hx: w.hx, hz: w.hz }) };
    this.#draw(v.t || 0, flat, this.#key(k, flat, { eye: new THREE.Vector3(), look: new THREE.Vector3() }), true);
    return v.label;
  }

  // ------------------------------------------------------------------------------------------------- the rules
  runChecks() {
    const fail = [], warn = [], info = [], g = (x, z) => this.groundAt(x, z), sa = (x, z) => this.standAt(x, z), e = this.extent;
    info.push(`${this.list.length} shots · ${this.DURATION.toFixed(1)} s · ${this.total.toLocaleString('en')} vertices drawn in pencil (${Object.entries(this.counts).map(([k, v]) => `${k} ${v.toLocaleString('en')}`).join(' · ')})`);
    if (!this.wayPts) fail.push('no way: call W.way([[x, z], …]) — the walker and the shots are placed along it');
    if (!this.things.some((t) => t.sky)) fail.push('no sky: W.add(kit.sky(W, {…})) — the paper behind everything must be drawn on');
    for (const s of this.list) {
      if (s.dur < 1.5) fail.push(`${s.name}: ${s.dur} s is too short to read (≥ 1.5 s)`);
      if (Math.max(...s.walk) > this.wayLen + 0.01 || Math.min(...s.walk) < -0.01) fail.push(`${s.name}: walks to ${Math.max(...s.walk).toFixed(1)} m but the way is ${this.wayLen.toFixed(1)} m long`);
      if (s.speed > 0.05 && s.speed < 0.5) warn.push(`${s.name}: ${s.speed.toFixed(2)} m/s is a shuffle — stand still, or walk at 0.9–1.8 m/s`);
      if (s.speed > 2.2 && s.speed < 2.8) warn.push(`${s.name}: ${s.speed.toFixed(1)} m/s is between a walk and a run — walk ≤ 2 m/s or run 3–5.5 m/s`);
      if (s.speed > 6.5) fail.push(`${s.name}: ${s.speed.toFixed(1)} m/s is faster than anyone runs`);
    }
    for (const p of this.wayPts || []) if (Math.abs(p.x) > e * 0.92 || Math.abs(p.z) > e * 0.92) { fail.push(`the way leaves the land (±${e} m) at ${p.x.toFixed(0)}, ${p.z.toFixed(0)}`); break; }
    const body = new Map(), eyeIn = new Set(), lost = new Map(), cut = new Map(), wet = new Set();
    const v = new THREE.Vector3(), cam = new THREE.PerspectiveCamera(50, this.W / this.H, 0.1, 3000);
    const water = this.things.find((t) => t.waterLevel != null);
    for (let t = 0; t < this.DURATION; t += 1 / 10) {
      const st = this.walkAt(t), c = this.camAt(t, st), sn = st.shot.name;
      if (c.eye.y < g(c.eye.x, c.eye.z) + 0.25) fail.push(`${sn} @${t.toFixed(1)}: the eye is in the ground`);
      for (const k of this.colliders) if (Math.hypot(c.eye.x - k.x, c.eye.z - k.z) < k.r + 0.2 && c.eye.y < (k.top ?? 1e9)) eyeIn.add(`${sn}: the eye passes through something solid at ${k.x.toFixed(1)}, ${k.z.toFixed(1)} — move the eye or the thing`);
      for (const k of this.colliders) if (Math.hypot(st.x - k.x, st.z - k.z) < k.r + 0.15 && sa(st.x, st.z) < (k.top ?? 1e9)) eyeIn.add(`${sn}: the walker walks through something solid at ${k.x.toFixed(1)}, ${k.z.toFixed(1)} — keep things off the way`);
      if (water && sa(st.x, st.z) < water.waterLevel + 0.05 && st.shot.figure !== false) wet.add(`${sn} @${t.toFixed(1)}: the walker is in the water at ${st.x.toFixed(1)}, ${st.z.toFixed(1)} — a bridge or a pier (kit.deck) or move the way`);
      if (this.fig && st.shot.figure !== false) {
        const y = sa(st.x, st.z);
        this.fig.pose({ t, x: st.x, y, z: st.z, hx: st.hx, hz: st.hz, phase: st.phase, stride: st.stride, speed: st.speed, at: st.at, ground: sa });
        for (const m of this.fig.audit()) body.set(`${sn}: ${m.replace(/-?\d+(\.\d+)?/g, '#')}`, `${sn} @${t.toFixed(1)}: ${m}`);
        cam.fov = c.fov; cam.position.copy(c.eye); cam.lookAt(c.look); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
        const ins = [0.02, 0.98].map((h) => { v.set(st.x, y + this.fig.height * h, st.z).project(cam); return v.z < 1 && Math.abs(v.x) < 0.94 && Math.abs(v.y) < 0.94; }), on = ins[0] || ins[1];
        if (on && !(ins[0] && ins[1]) && st.shot.figure !== 'off-screen') cut.set(sn, `${sn} @${t.toFixed(1)}: the walker reaches the unfinished edge of the page (their ${ins[0] ? 'head' : 'feet'} fade out) — step the eye back or look lower`);
        if (!on && st.shot.figure !== 'off-screen') lost.set(sn, `${sn} @${t.toFixed(1)}: the walker is out of the picture (figure: 'off-screen' if that is the shot, figure: false to leave them out)`);
        if (c.eye.distanceTo(v.set(st.x, y + this.fig.height * 0.6, st.z)) < 0.7) fail.push(`${sn} @${t.toFixed(1)}: the eye is inside the walker`);
      }
    }
    if (this.fig) {
      const first = this.list[0], s0 = (first.walk[0] + first.walk[1]) / 2, w = this.wayAt(s0);
      for (const c of this.fig.cast()) {
        this.fig.pose({ t: 0, x: w.x, y: sa(w.x, w.z), z: w.z, hx: w.hx, hz: w.hz, phase: c.phase, stride: this.fig.strideFor(c.speed), speed: c.speed, at: (ds) => this.wayAt(s0 + ds), ground: sa });
        for (const m of this.fig.audit()) body.set(`cast: ${m.replace(/-?\d+(\.\d+)?/g, '#')}`, `cast "${c.label}": ${m}`);
      }
      info.push(`the walker: ${this.fig.cast().length} cast poses and ${Math.round(this.DURATION * 10)} film poses audited against the joint ranges`);
    }
    fail.push(...body.values(), ...eyeIn, ...lost.values(), ...wet); warn.push(...cut.values());
    for (const r of this.rules) { try { const m = r.fn(this); if (m) fail.push(`${r.name}: ${m}`); } catch (err) { fail.push(`${r.name}: threw ${err.message}`); } }
    if (this.now) this.renderAt(this.now.t);
    return { fail, warn, info };
  }

  /** for check.mjs: the drawing with nothing laid over it and a clear colour no pencil would leave (magenta) */
  bare(on) {
    this.page.uniforms.uRaw.value = on ? 1 : 0;
    this.renderer.setClearColor(on ? 0xff00ff : 0xffffff, 1);
  }

  // -------------------------------------------------------------------------------------------- the live page
  // The film plays in a loop. Press W A S D (or the Walk button) and the walker is yours: drag to look round, the wheel
  // steps the eye back or in, Shift runs, F (or the Film button) goes back to the film, H hides the bar.
  #live() {
    const ui = { film: 'Film', walk: 'Walk', hint: 'W A S D walk · Shift run · drag to look · F film · H hide', ...(this.o.ui || {}) };
    const keys = new Set(), fig = this.fig;
    let mode = 'film', t0 = performance.now(), last = t0, tf = +(this.query.get('t0') || 0);
    const wk = { x: 0, z: 0, ang: 0, speed: 0, s: 0, phase: 0, trail: [], yaw: 0, pitch: 0.16, dist: 5.2, auto: false };
    const bar = document.createElement('div');
    if (!this.off.has('hud')) {
      bar.style.cssText = 'position:fixed;left:14px;bottom:12px;display:flex;gap:8px;align-items:center;font:12px/1.2 ui-sans-serif,system-ui,sans-serif;color:#3a3430;user-select:none';
      bar.innerHTML = `<button data-m="film"></button><button data-m="walk"></button><span></span>`;
      for (const b of bar.querySelectorAll('button')) { b.textContent = ui[b.dataset.m]; b.style.cssText = 'font:inherit;color:inherit;background:#fffc;border:1px solid #3a343055;border-radius:999px;padding:5px 12px;cursor:pointer'; b.onclick = () => set(b.dataset.m, true); }
      const sp = bar.querySelector('span'); sp.textContent = ui.hint; sp.style.cssText = 'background:#fffb;padding:3px 8px;border-radius:6px';
      document.body.appendChild(bar);
    }
    const set = (m, auto) => {
      if (m === 'walk' && !fig) return;
      if (m === 'walk' && mode !== 'walk') {
        const st = this.now.st; Object.assign(wk, { x: st.x, z: st.z, ang: Math.atan2(st.hx, st.hz), s: 0, phase: st.phase, speed: 0, trail: [{ s: 0, x: st.x, z: st.z }], auto: !!auto && matchMedia('(pointer: coarse)').matches });
        const c = this.now.cam, dx = c.eye.x - st.x, dz = c.eye.z - st.z; wk.yaw = Math.atan2(-dx, -dz); wk.dist = cl(Math.hypot(dx, dz), 3, 9);
      } else if (m === 'walk') wk.auto = !wk.auto && matchMedia('(pointer: coarse)').matches;
      if (m === 'film' && mode !== 'film') t0 = performance.now() - tf * 1000;
      mode = m;
      for (const b of bar.querySelectorAll('button')) b.style.background = b.dataset.m === mode ? '#3a3430' : '#fffc', b.style.color = b.dataset.m === mode ? '#fff' : 'inherit';
    };
    set('film');
    addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys.add(k); if (mode !== 'walk') set('walk'); e.preventDefault(); }
      if (k === 'shift') keys.add(k);
      if (k === 'f' || k === 'escape') set('film');
      if (k === 'h') bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
    });
    addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => keys.clear());
    let drag = null;
    this.canvas.style.touchAction = 'none';
    this.canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; this.canvas.setPointerCapture(e.pointerId); });
    this.canvas.addEventListener('pointermove', (e) => { if (!drag || mode !== 'walk') return; wk.yaw -= (e.clientX - drag.x) * 0.006; wk.pitch = cl(wk.pitch + (e.clientY - drag.y) * 0.004, -0.12, 1.1); drag = { x: e.clientX, y: e.clientY }; });
    addEventListener('pointerup', () => { drag = null; });
    this.canvas.addEventListener('wheel', (e) => { if (mode === 'walk') { wk.dist = cl(wk.dist * (e.deltaY > 0 ? 1.1 : 0.9), 2.2, 14); e.preventDefault(); } }, { passive: false });
    addEventListener('resize', () => this.#size());
    const water = this.things.find((t) => t.waterLevel != null);
    const trailAt = (s) => {
      const tr = wk.trail, n = tr.length;
      if (s >= wk.s) return { x: wk.x + Math.sin(wk.ang) * (s - wk.s), z: wk.z + Math.cos(wk.ang) * (s - wk.s) };
      for (let i = n - 1; i > 0; i--) if (tr[i - 1].s <= s) { const a = tr[i - 1], b = tr[i], k = (s - a.s) / (b.s - a.s || 1); return { x: lerp(a.x, b.x, k), z: lerp(a.z, b.z, k) }; }
      const a = tr[0], b = tr[1] || { x: wk.x, z: wk.z, s: wk.s }, l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      return { x: a.x + ((b.x - a.x) / l || -Math.sin(wk.ang)) * (s - a.s), z: a.z + ((b.z - a.z) / l || -Math.cos(wk.ang)) * (s - a.s) };
    };
    const step = (dt, now) => {
      let mx = 0, mz = 0;
      if (keys.has('w') || keys.has('arrowup') || wk.auto) mz += 1;
      if (keys.has('s') || keys.has('arrowdown')) mz -= 1;
      if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
      if (keys.has('d') || keys.has('arrowright')) mx += 1;
      const moving = mx || mz, want = moving ? (keys.has('shift') ? 4.4 : 1.5) : 0;
      wk.speed += (want - wk.speed) * Math.min(1, dt * 6);
      if (moving) { const a = wk.yaw + Math.atan2(-mx, mz); let d = a - wk.ang; d = Math.atan2(Math.sin(d), Math.cos(d)); wk.ang += d * Math.min(1, dt * 8); }
      const ds = wk.speed * dt; let x = wk.x + Math.sin(wk.ang) * ds, z = wk.z + Math.cos(wk.ang) * ds;
      for (const k of this.colliders) { const dx = x - k.x, dz = z - k.z, d = Math.hypot(dx, dz), r = k.r + 0.3; if (d < r && this.standAt(wk.x, wk.z) < (k.top ?? 1e9)) { x = k.x + (dx / d) * r; z = k.z + (dz / d) * r; } }
      if (water && this.standAt(x, z) < water.waterLevel + 0.05) { x = wk.x; z = wk.z; } // the water's edge stops them
      const lim = this.extent * 0.86; x = cl(x, -lim, lim); z = cl(z, -lim, lim);
      const moved = Math.hypot(x - wk.x, z - wk.z); wk.x = x; wk.z = z; wk.s += moved;
      const stride = fig.strideFor(Math.max(wk.speed, 0.6)); wk.phase += moved / stride;
      if (moved > 0 && wk.s - wk.trail[wk.trail.length - 1].s > 0.1) { wk.trail.push({ s: wk.s, x, z }); if (wk.trail.length > 120) wk.trail.shift(); }
      const hx = Math.sin(wk.ang), hz = Math.cos(wk.ang), y = this.standAt(x, z);
      const st = { shot: {}, p: 0, s: wk.s, speed: wk.speed, phase: wk.phase, stride, x, z, hx, hz, at: (d) => { const p = trailAt(wk.s + d); return { x: p.x, z: p.z, hx, hz }; } };
      const cp = Math.cos(wk.pitch), eye = new THREE.Vector3(x - Math.sin(wk.yaw) * cp * wk.dist, y + 1.3 + Math.sin(wk.pitch) * wk.dist, z - Math.cos(wk.yaw) * cp * wk.dist);
      eye.y = Math.max(eye.y, this.groundAt(eye.x, eye.z) + 0.3);
      this.#draw(now / 1000, st, { eye, look: new THREE.Vector3(x, y + fig.height * 0.75, z), fov: 50 });
    };
    if (this.query.has('walk')) set('walk', true);
    const tick = (now) => {
      requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (this.paused) return;
      if (mode === 'film') { tf = ((now - t0) / 1000) % this.DURATION; this.renderAt(tf); } else step(dt, now);
    };
    requestAnimationFrame(tick);
  }
}

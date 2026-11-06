// map-dive · dive.js — the engine: a film made of stages (a floating toy-map island, a close terrain, a city …) that the
// camera dives between. Every frame is a pure function of t: seek(t) sets each stage's camera, light, night and labels,
// renders the one or two stages on screen into render targets, and mixes them (crossfade + zoom blur on a dive).
//
//   const F = new Film({ duration: 30 });
//   const S = F.stage('island', { night: ramp(24, 25) });     // a scene with sky, sun, hemisphere light, fog
//   L.island(S, {...}); K.mountain(S, {...}); S.label('Hallasan', [x, y, z], { from: 3, to: 6 });
//   F.shot('island', { from: 0, to: 6.4, keys: [{ t: 0, at: [0, 0, 0], dist: 13, yaw: -8, elev: 38 }, …] });
//   F.title('Jeju', { from: .3, to: 5 }); F.start();
//
// Contract (set by start()): window.seek(t), DURATION, FPS, SIZE, runChecks(t), FILM, __ready.
// Query: ?render=1 fixed W×H canvas, no live loop · ?scale=.5 · ?t=12 frozen frame · ?msaa=0 · ?off=blur,shadow,labels,hud,glow
import * as THREE from 'three';
export { THREE };

// ---------------------------------------------------------------- determinism helpers
export function rng(seed = 1) {
  let a = seed >>> 0 || 1;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function hash(x, z = 0, s = 0) {
  let h = Math.imul((Math.floor(x) | 0) ^ 0x27d4eb2d, 0x165667b1) ^ Math.imul((Math.floor(z) | 0) + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s | 0, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
const fade = t => t * t * (3 - 2 * t);
export function noise(x, z, s = 0) {           // smooth value noise, 0..1
  const xi = Math.floor(x), zi = Math.floor(z), u = fade(x - xi), v = fade(z - zi);
  const a = hash(xi, zi, s), b = hash(xi + 1, zi, s), c = hash(xi, zi + 1, s), d = hash(xi + 1, zi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, z, oct = 4, s = 0) {    // fractal noise, ~0..1
  let f = 0, amp = .5, n = 0;
  for (let i = 0; i < oct; i++) { f += amp * noise(x, z, s + i * 17); n += amp; x = x * 2.03 + 3.1; z = z * 2.03 - 1.7; amp *= .5; }
  return f / n;
}
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ramp = (a, b, down = false) => t => down ? 1 - smooth(a, b, t) : smooth(a, b, t);   // night: ramp(20, 23)
export const ease = { inOut: t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2, out: t => 1 - (1 - t) ** 3, in: t => t * t * t };
export function spring(s) {                    // s = seconds since the pop; 0 → 1 with one soft overshoot
  if (s <= 0) return 0; return 1 - Math.exp(-7 * s) * Math.cos(11 * s);
}
export function hex(c) { const v = new THREE.Color(c); return [v.r, v.g, v.b]; }   // '#a8d26a' → linear rgb
export function mixc(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

// ---------------------------------------------------------------- geography
// projector({ center: [lon, lat], km: 6 }) → (lon, lat) => [x, z]: equirectangular around the centre, 1 unit = `km`
// kilometres, x east, z south (north is −z, so yaw 0 looks north). p.inv([x, z]) → [lon, lat].
export function projector({ center, km = 1 }) {
  const [lon0, lat0] = center, kx = 111.32 * Math.cos(lat0 * Math.PI / 180) / km, kz = 110.57 / km;
  const p = (lon, lat) => Array.isArray(lon) ? [(lon[0] - lon0) * kx, -(lon[1] - lat0) * kz] : [(lon - lon0) * kx, -(lat - lat0) * kz];
  p.inv = ([x, z]) => [lon0 + x / kx, lat0 - z / kz]; p.km = km;
  return p;
}
// closed Catmull-Rom through the points, resampled to n points evenly by arc length
export function smoothLoop(pts, n = 360, closed = true) {
  const P = pts.length, dense = [];
  const at = i => closed ? pts[(i + P) % P] : pts[Math.max(0, Math.min(P - 1, i))];
  const segs = closed ? P : P - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < 16; k++) {
      const t = k / 16, t2 = t * t, t3 = t2 * t;
      dense.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  if (!closed) dense.push(pts[P - 1]);
  return resample(dense, n, closed);
}
export function resample(pts, n, closed = true) {
  const L = [0]; const m = pts.length;
  for (let i = 1; i <= (closed ? m : m - 1); i++) { const a = pts[i - 1], b = pts[i % m]; L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const total = L[L.length - 1], out = []; let j = 0;
  const cnt = closed ? n : n - 1;
  for (let k = 0; k <= cnt - (closed ? 1 : 0); k++) {
    const s = total * k / cnt; while (j < L.length - 2 && L[j + 1] < s) j++;
    const a = pts[j], b = pts[(j + 1) % m], f = (s - L[j]) / Math.max(1e-9, L[j + 1] - L[j]);
    out.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f)]);
  }
  return out;
}
export function loopArea(loop) { let a = 0; for (let i = 0; i < loop.length; i++) { const p = loop[i], q = loop[(i + 1) % loop.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
// push every point out along its normal (smooth outlines only; d < the tightest bend radius)
export function offsetLoop(loop, d) {
  const n = loop.length, s = Math.sign(loopArea(loop)) || 1, out = [];
  for (let i = 0; i < n; i++) {
    const a = loop[(i - 1 + n) % n], b = loop[(i + 1) % n], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
    out.push([loop[i][0] + s * tz / l * d, loop[i][1] - s * tx / l * d]);
  }
  return out;
}
export function inside([x, z], loop) {
  let c = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const [xi, zi] = loop[i], [xj, zj] = loop[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c;
  }
  return c;
}
export function distToLine([x, z], pts, closed = false) {
  let d = Infinity; const n = pts.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % n], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / l2);
    d = Math.min(d, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return d;
}
// signed distance to a closed outline: negative inside
export const sdLoop = (p, loop) => (inside(p, loop) ? -1 : 1) * distToLine(p, loop, true);

// ---------------------------------------------------------------- camera keys (monotone cubic per channel)
function monotone(xs, ys) {
  const n = xs.length; if (n === 1) return () => ys[0];
  const d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return x => {
    if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
const KEY0 = { at: [0, 0, 0], dist: 10, yaw: 0, elev: 40, fov: 35, roll: 0 };
function cameraPath(keys) {
  const full = []; let prev = KEY0;
  for (const k of [...keys].sort((a, b) => a.t - b.t)) { prev = { ...prev, ...k }; full.push(prev); }
  const ts = full.map(k => k.t), ch = f => monotone(ts, full.map(f));
  const ax = ch(k => k.at[0]), ay = ch(k => k.at[1]), az = ch(k => k.at[2]), ld = ch(k => Math.log(k.dist));
  const yaw = ch(k => k.yaw), elev = ch(k => k.elev), fov = ch(k => k.fov), roll = ch(k => k.roll);
  return t => ({ at: [ax(t), ay(t), az(t)], dist: Math.exp(ld(t)), yaw: yaw(t), elev: elev(t), fov: fov(t), roll: roll(t) });
}
export function placeCamera(cam, c) {
  const y = c.yaw * Math.PI / 180, e = c.elev * Math.PI / 180;
  cam.position.set(c.at[0] + c.dist * Math.sin(y) * Math.cos(e), c.at[1] + c.dist * Math.sin(e), c.at[2] + c.dist * Math.cos(y) * Math.cos(e));
  cam.up.set(Math.sin(c.roll * Math.PI / 180) * Math.cos(y), Math.cos(c.roll * Math.PI / 180), -Math.sin(c.roll * Math.PI / 180) * Math.sin(y));
  cam.lookAt(c.at[0], c.at[1], c.at[2]);
  if (cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
  cam.near = Math.max(.002, c.dist * .02); cam.far = c.dist * 60 + 200; cam.updateProjectionMatrix();
}

// ---------------------------------------------------------------- text → canvas (labels, titles, painted names)
export const FONT = '"Map Sans", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "Inter", system-ui, sans-serif';
function textCanvas(draw, w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); draw(c.getContext('2d')); return c; }
function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

// a pin label: white pill with dark text, a stem and a dot on the anchor (anchor = bottom of the sprite)
function pinCanvas(text, { size = 34, weight = 700, color = '#16181d', bg = '#ffffff', stem = 1 } = {}) {
  const pad = size * .62, font = `${weight} ${size}px ${FONT}`;
  const m = document.createElement('canvas').getContext('2d'); m.font = font;
  const tw = m.measureText(text).width, bw = tw + pad * 2, bh = size * 1.75, stemH = stem ? size * 1.15 : 0, dot = stem ? size * .3 : 0;
  const W = bw + 16, H = bh + stemH + dot * 2 + 16;
  const c = textCanvas(g => {
    g.translate(8, 8); g.shadowColor = 'rgba(20,30,50,.28)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
    g.fillStyle = bg; const r = bh * .32;
    g.beginPath(); g.roundRect(0, 0, bw, bh, r); g.fill(); g.shadowColor = 'transparent';
    if (stem) {
      g.fillStyle = bg; g.fillRect(bw / 2 - size * .07, bh - 1, size * .14, stemH + 1);
      g.beginPath(); g.arc(bw / 2, bh + stemH + dot, dot, 0, Math.PI * 2); g.fillStyle = bg; g.fill();
      g.beginPath(); g.arc(bw / 2, bh + stemH + dot, dot * .55, 0, Math.PI * 2); g.fillStyle = color; g.fill();
    }
    g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, bw / 2, bh / 2 + size * .04);
  }, W, H);
  return { c, w: W, h: H, anchorY: (8 + (stem ? bh + stemH + dot : bh / 2)) / H };
}

// ---------------------------------------------------------------- stage
const SKY = {
  day: { top: '#a9d8f2', bottom: '#eef6fb', glow: '#fff1bf', glowAt: [.5, 1.05], glowR: .55 },
  dusk: { top: '#5b6fb0', bottom: '#f4b7a0', glow: '#ffd29a', glowAt: [.5, .1], glowR: .7 },
  night: { top: '#0a1230', bottom: '#1c2a5a', glow: '#2b3c7a', glowAt: [.5, 1.1], glowR: .6 },
};
const LIGHT = {
  day: { hemi: .62, sky: '#ffffff', ground: '#c9d6c0', sun: .5, sunColor: '#fff6e6' },
  night: { hemi: .3, sky: '#7d8fd0', ground: '#2a3050', sun: .16, sunColor: '#9fb3ff' },
};

export class Stage {
  constructor(film, name, o = {}) {
    this.film = film; this.name = name; this.o = o;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, film.W / film.H, .01, 1000);
    this.nightAt = typeof o.night === 'function' ? o.night : (() => +(o.night || 0));
    this.day = { ...SKY[o.sky || 'day'], ...(o.skyColors || {}) }; this.nite = { ...SKY[o.nightSky || 'night'], ...(o.nightColors || {}) };
    this.lightDay = { ...LIGHT.day, ...(o.light || {}) }; this.lightNight = { ...LIGHT.night, ...(o.nightLight || {}) };
    this.uNight = { value: 0 }; this.frames = []; this.labels = []; this.checks = []; this.glows = []; this.texts = [];
    // sky: a screen-space quad drawn first (gradient + a soft glow)
    this.sky = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() }, glow: { value: new THREE.Color() }, glowAt: { value: new THREE.Vector2() }, glowR: { value: .5 }, aspect: { value: film.W / film.H } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: `uniform vec3 top, bottom, glow; uniform vec2 glowAt; uniform float glowR, aspect; varying vec2 vUv;
        void main(){ vec3 c = mix(bottom, top, smoothstep(0., 1., vUv.y));
          float g = 1. - smoothstep(0., glowR, length((vUv - glowAt) * vec2(aspect, 1.)));
          c = mix(c, glow, g * g * .9); gl_FragColor = vec4(c, 1.); }`,
      depthWrite: false, depthTest: false,
    });
    this.skyScene = new THREE.Scene(); this.skyScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.sky));
    this.hemi = new THREE.HemisphereLight('#fff', '#ccc', 1); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff', 1);
    const sd = o.sunDir || [-.55, 1, .45]; this.sunDir = new THREE.Vector3(...sd).normalize();
    this.sun.castShadow = !film.off.has('shadow') && o.shadow !== false;
    this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -.0004; this.sun.shadow.normalBias = .02; this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target);
    // haze: fog that scales with the camera's distance to its target ([near, far] × dist), so a dive from 200 down to 20
    // stays clear at every height. fog: [near, far] in world units instead.
    this.haze = o.fog ? null : (o.haze === undefined ? [2.4, 7] : o.haze);
    this.fog = (o.fog || this.haze) ? new THREE.Fog('#fff', o.fog?.[0] ?? 1, o.fog?.[1] ?? 2) : null; this.scene.fog = this.fog;
    this.fitShadow(o.shadowHalf || 10, [0, 0, 0]);
  }
  // shadow camera covers a square of half-size `half` around `c`
  fitShadow(half, c = [0, 0, 0]) {
    const s = this.sun.shadow.camera; s.left = -half; s.right = half; s.top = half; s.bottom = -half; s.near = .1; s.far = half * 8; s.updateProjectionMatrix();
    this.sun.target.position.set(...c); this.sun.position.set(c[0] + this.sunDir.x * half * 3, c[1] + this.sunDir.y * half * 3, c[2] + this.sunDir.z * half * 3);
    this.sun.shadow.normalBias = half * .003;
  }
  add(...o) { this.scene.add(...o); return o[0]; }
  onFrame(fn) { this.frames.push(fn); return this; }
  check(name, fn) { this.checks.push({ name, fn }); return this; }
  // a pin label: text above a stem and a dot at `at` (world). Pops in at `from`, shrinks away at `to`. size = px at 1080p.
  label(text, at, { from = 0, to = Infinity, size = 34, stem = true, color, bg, weight } = {}) {
    const p = pinCanvas(text, { size: size * 2, stem, color, bg, weight });
    const m = new THREE.SpriteMaterial({ map: canvasTex(p.c), depthTest: false, depthWrite: false, sizeAttenuation: false, transparent: true, toneMapped: false });
    const s = new THREE.Sprite(m); s.center.set(.5, 1 - p.anchorY); s.position.set(...at); s.renderOrder = 1000;
    s.visible = false; this.scene.add(s);
    const L = { text, at, from, to, sprite: s, px: [p.w / 2, p.h / 2] };   // canvas is drawn at 2× → px at 1080p
    this.labels.push(L); this.film.texts.push(text); return L;
  }
  // soft additive light dots (street lamps, city glow); opacity follows night unless `day` is set
  glow(points, { size = .2, color = '#ffc76a', strength = 1, day = 0, attenuate = true } = {}) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    const m = new THREE.PointsMaterial({ map: glowTexture(), size, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: attenuate, opacity: 0, toneMapped: false });
    const P = new THREE.Points(g, m); P.renderOrder = 5; this.scene.add(P); this.glows.push({ m, strength, day }); return P;
  }
  update(t, cam) {
    const n = clamp(this.nightAt(t)); this.night = n; this.uNight.value = n;
    const D = this.day, N = this.nite, c = (a, b) => new THREE.Color(a).lerp(new THREE.Color(b), n);
    this.sky.uniforms.top.value.copy(c(D.top, N.top)); this.sky.uniforms.bottom.value.copy(c(D.bottom, N.bottom)); this.sky.uniforms.glow.value.copy(c(D.glow, N.glow));
    this.sky.uniforms.glowAt.value.set(lerp(D.glowAt[0], N.glowAt[0], n), lerp(D.glowAt[1], N.glowAt[1], n)); this.sky.uniforms.glowR.value = lerp(D.glowR, N.glowR, n);
    const ld = this.lightDay, ln = this.lightNight;
    this.hemi.intensity = lerp(ld.hemi, ln.hemi, n); this.hemi.color.copy(c(ld.sky, ln.sky)); this.hemi.groundColor.copy(c(ld.ground, ln.ground));
    this.sun.intensity = lerp(ld.sun, ln.sun, n); this.sun.color.copy(c(ld.sunColor, ln.sunColor));
    if (this.fog) this.fog.color.copy(c(this.o.fogColor || D.bottom, this.o.nightFogColor || N.bottom));
    for (const g of this.glows) g.m.opacity = this.film.off.has('glow') ? 0 : clamp(lerp(g.day, 1, n) * g.strength, 0, 1);
    for (const f of this.frames) f(t, n);
    if (cam) { placeCamera(this.camera, cam); if (this.haze) { this.fog.near = cam.dist * this.haze[0]; this.fog.far = cam.dist * this.haze[1]; } }
    // sizeAttenuation:false sprites: on-screen height = scale.y / tan(fov/2) × H/2 px → scale = px@1080 / 540 × tan(fov/2)
    const tanh = Math.tan(this.camera.fov * Math.PI / 360);
    for (const L of this.labels) {
      const on = t >= L.from && t <= L.to && !this.film.off.has('labels');
      const k = on ? spring(t - L.from) * (1 - smooth(L.to - .35, L.to, t)) : 0;
      L.sprite.visible = k > .001; L.sprite.material.opacity = clamp(k * 1.4);
      L.sprite.scale.set(Math.max(0, k) * L.px[0] / 540 * tanh, Math.max(0, k) * L.px[1] / 540 * tanh, 1);
    }
  }
  render(renderer, rt) {
    renderer.setRenderTarget(rt); renderer.autoClear = false; renderer.clear(true, true, true);
    renderer.render(this.skyScene, this.film.ortho); renderer.render(this.scene, this.camera);
  }
}

export async function loadFonts() {
  for (let i = 0; i < 50 && ![...document.styleSheets].some(s => /fonts\.css/.test(s.href || '')) && document.querySelector('link[href*="fonts.css"]'); i++) await new Promise(r => setTimeout(r, 20));
  const faces = [...document.fonts].filter(f => f.family.replace(/["']/g, '') === 'Map Sans');
  await Promise.all(faces.map(f => f.load().catch(() => null)));
  try { await document.fonts.ready; } catch { }
}

let _glowTex;
function glowTexture() {
  if (_glowTex) return _glowTex;
  const c = textCanvas(g => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }, 64, 64);
  return (_glowTex = new THREE.CanvasTexture(c));
}

// ---------------------------------------------------------------- film
export class Film {
  constructor({ duration = 30, fps = 30, W = 1920, H = 1080, seed = 1, background = '#000' } = {}) {
    const q = new URLSearchParams(location.search);
    this.q = q; this.render = q.has('render');
    // live pages size the canvas and the map textures to the screen (a phone gets ~half); renders are always full size
    const screen = Math.max(innerWidth, innerHeight) * (devicePixelRatio || 1);
    this.scale = +(q.get('scale') || (this.render || q.has('t') ? 1 : clamp(screen / 1920, .5, 1)));
    this.texScale = +(q.get('tex') || (this.render || q.has('t') ? 1 : (Math.min(screen, 1920) < 1300 ? .5 : 1)));
    this.off = new Set((q.get('off') || '').split(',').filter(Boolean));
    this.DURATION = duration; this.FPS = fps; this.W0 = W; this.H0 = H; this.seed = seed;
    this.W = Math.round(W * this.scale); this.H = Math.round(H * this.scale);
    this.stages = new Map(); this.shots = []; this.huds = []; this.checks = []; this.texts = [];
    this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    r.setPixelRatio(1); r.setSize(this.W, this.H, false); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.enabled = !this.off.has('shadow'); r.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(r.domElement); r.domElement.style.background = background;
    const samples = q.get('msaa') === '0' ? 0 : 4;
    const mk = () => new THREE.WebGLRenderTarget(this.W, this.H, { samples, colorSpace: THREE.SRGBColorSpace, depthBuffer: true });
    this.rtA = mk(); this.rtB = mk();
    this.mix = new THREE.ShaderMaterial({
      uniforms: { A: { value: this.rtA.texture }, B: { value: this.rtB.texture }, k: { value: 0 }, blurA: { value: 0 }, blurB: { value: 0 }, vig: { value: .18 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: `uniform sampler2D A, B; uniform float k, blurA, blurB, vig; varying vec2 vUv;
        vec3 zb(sampler2D t, vec2 uv, float b){ if (b < .0005) return texture2D(t, uv).rgb;
          vec3 c = vec3(0.); vec2 d = (uv - .5) * b; for (int i = 0; i < 12; i++) c += texture2D(t, uv - d * float(i) / 11.).rgb; return c / 12.; }
        void main(){ vec3 a = zb(A, vUv, blurA); vec3 c = k > .0005 ? mix(a, zb(B, vUv, blurB), k) : a;
          vec2 v = vUv - .5; c *= 1. - vig * dot(v, v) * 1.6; gl_FragColor = vec4(c, 1.);
          #include <colorspace_fragment>
        }`,
      depthTest: false, depthWrite: false,
    });
    this.post = new THREE.Scene(); this.post.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mix));
    this.hud = new THREE.Scene();
  }
  // const F = await Film.create({...}): loads the page's "Map Sans" faces (fonts/fonts.css) first, so names painted
  // into map textures use the right font from the first frame.
  static async create(o) { await loadFonts(); return new Film(o); }
  stage(name, o = {}) { const s = new Stage(this, name, o); this.stages.set(name, s); return s; }
  // a camera move on one stage. Consecutive shots that overlap crossfade; when both zoom the same way it is a dive
  // (zoom blur peaks mid-crossfade; `blur: 0` turns it off).
  shot(stage, { from, to, keys, blur }) {
    if (!this.stages.has(stage)) throw new Error(`shot: no stage "${stage}"`);
    const ks = keys.map(k => ({ ...k, t: k.t }));
    this.shots.push({ stage, from, to, path: cameraPath(ks), keys: ks, blur });
    this.shots.sort((a, b) => a.from - b.from); return this;
  }
  // a line of text on screen. pos: 'top' | 'bottom' | 'top-left' | 'center'. size = px at 1080p.
  title(text, { from = 0, to = Infinity, pos = 'top', size = 92, weight = 800, color = '#14161b', sub, subSize = .36, shadow = true } = {}) {
    const S = size * 2, font = `${weight} ${S}px ${FONT}`, sfont = `600 ${S * subSize}px ${FONT}`;
    const m = document.createElement('canvas').getContext('2d'); m.font = font; const tw = m.measureText(text).width; m.font = sfont; const sw = sub ? m.measureText(sub).width : 0;
    const W = Math.max(tw, sw) + S, H = S * 1.35 + (sub ? S * subSize * 1.6 : 0);
    const c = textCanvas(g => {
      g.textAlign = pos === 'top-left' ? 'left' : 'center'; const x = pos === 'top-left' ? S * .5 : W / 2;
      if (shadow) { g.shadowColor = color === '#14161b' ? 'rgba(255,255,255,.55)' : 'rgba(0,0,20,.35)'; g.shadowBlur = S * .12; }
      g.fillStyle = color; g.font = font; g.textBaseline = 'top'; g.fillText(text, x, S * .12);
      if (sub) { g.font = sfont; g.globalAlpha = .72; g.fillText(sub, x, S * 1.3); }
    }, W, H);
    const mat = new THREE.MeshBasicMaterial({ map: canvasTex(c), transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); this.hud.add(mesh);
    this.huds.push({ mesh, from, to, pos, w: W / 2, h: H / 2 }); this.texts.push(text, sub || ''); return this;
  }
  credit(text, o = {}) { return this.title(text, { pos: 'top-left', size: 30, weight: 700, color: '#ffffff', shadow: true, ...o }); }
  check(name, fn) { this.checks.push({ name, fn }); return this; }
  // what the score follows: transitions (dive / rise / dissolve), label pops, titles, and the night ramp of each stage
  cues() {
    const out = [];
    for (let i = 1; i < this.shots.length; i++) {
      const a = this.shots[i - 1], b = this.shots[i]; if (b.from >= a.to) { out.push({ t: b.from, kind: 'cut' }); continue; }
      const da = a.path(a.to).dist / a.path(b.from).dist, db = b.path(a.to).dist / b.path(b.from).dist;
      out.push({ t: b.from, end: a.to, kind: (da < 1) === (db < 1) ? (da < 1 ? 'dive' : 'rise') : 'dissolve' });
    }
    for (const S of this.stages.values()) for (const L of S.labels) out.push({ t: L.from, kind: 'pin' });
    for (const h of this.huds) out.push({ t: h.from, kind: 'title' });
    const night = []; for (let t = 0; t <= this.DURATION; t += .25) { const { a } = this.active(t); night.push(a ? +this.stages.get(a.stage).nightAt(t).toFixed(3) : 0); }
    return { duration: this.DURATION, cues: out.sort((x, y) => x.t - y.t), night, nightStep: .25 };
  }
  allText() { const s = new Set(this.texts.join('')); for (const st of this.stages.values()) for (const x of st.texts) for (const ch of x) s.add(ch); return [...s].join(''); }

  active(t) {
    const on = this.shots.filter(s => t >= s.from - 1e-6 && t <= s.to + 1e-6);
    if (on.length <= 1) return { a: on[0], b: null, k: 0 };
    const [a, b] = on.slice(-2);          // a ends, b begins
    const k = smooth(b.from, a.to, t);
    return { a, b, k };
  }
  seek(t) {
    t = clamp(t, 0, this.DURATION); this.t = t;
    const r = this.renderer, { a, b, k } = this.active(t);
    const blur = (s1, s2) => {
      if (!s2 || this.off.has('blur')) return 0;
      const d1 = s1.path(s1.to).dist / s1.path(s2.from).dist, d2 = s2.path(s1.to).dist / s2.path(s2.from).dist;
      const dive = (d1 < 1) === (d2 < 1);
      const amt = s2.blur ?? (dive ? .055 : 0); return amt * Math.sin(Math.PI * k);
    };
    const bl = blur(a, b);
    if (a) { const S = this.stages.get(a.stage); S.update(t, a.path(t)); S.render(r, this.rtA); }
    if (b) { const S = this.stages.get(b.stage); S.update(t, b.path(t)); S.render(r, this.rtB); }
    this.mix.uniforms.k.value = b ? k : 0; this.mix.uniforms.blurA.value = bl; this.mix.uniforms.blurB.value = bl;
    r.setRenderTarget(null); r.autoClear = true; r.render(this.post, this.ortho);
    // HUD
    r.autoClear = false;
    for (const h of this.huds) {
      const on = t >= h.from && t <= h.to && !this.off.has('hud');
      const f = on ? Math.min(smooth(h.from, h.from + .6, t), 1 - smooth(h.to - .5, h.to, t)) : 0;
      h.mesh.visible = f > .001; h.mesh.material.opacity = f;
      // canvas is drawn at 2× of 1080p px → NDC size = canvas px / 1920 (x) and / 1080 (y)
      const sx = h.w * 2 / this.W0, sy = h.h * 2 / this.H0, rise = (1 - f) * .02;
      h.mesh.scale.set(sx, sy, 1);
      const x = h.pos === 'top-left' ? -1 + sx * .5 + .03 : 0;
      const y = h.pos === 'top' ? 1 - sy * .5 - .07 - rise : h.pos === 'top-left' ? 1 - sy * .5 - .045 : h.pos === 'bottom' ? -1 + sy * .5 + .08 - rise : -rise;
      h.mesh.position.set(x, y, 0);
    }
    r.render(this.hud, this.ortho); r.autoClear = true;
  }
  runChecks(t) {
    const bad = [], { a, b } = this.active(t);
    if (!a) bad.push('every moment is inside a shot');
    if (a && b && a.stage === b.stage) bad.push('overlapping shots use different stages');
    for (const s of [a, b].filter(Boolean)) {
      const S = this.stages.get(s.stage); S.update(t, s.path(t));
      const cam = S.camera; cam.updateMatrixWorld();
      for (const L of S.labels) {
        if (!(t >= L.from + .3 && t <= L.to - .3) || (b && s === a && t > b.from)) continue;
        const v = new THREE.Vector3(...L.at).project(cam);
        if (v.z > 1 || Math.abs(v.x) > .88 || v.y < -.9 || v.y > .72) bad.push(`label "${L.text}" is on screen while shown`);
      }
      if (S.groundAt) { const p = cam.position; if (p.y < S.groundAt(p.x, p.z) + .05) bad.push(`camera stays above the ground (${S.name})`); }
      for (const c of S.checks) if (!c.fn(t)) bad.push(c.name);
    }
    for (const c of this.checks) if (!c.fn(t)) bad.push(c.name);
    return bad;
  }
  async start() {
    try { await document.fonts.ready; } catch { }
    for (const S of this.stages.values()) if (S.build) await S.build();
    const last = Math.max(...this.shots.map(s => s.to));
    if (last < this.DURATION - 1e-6) console.warn(`shots end at ${last} s but DURATION is ${this.DURATION}`);
    Object.assign(window, { seek: t => this.seek(t), DURATION: this.DURATION, FPS: this.FPS, SIZE: { W: this.W0, H: this.H0 }, runChecks: t => this.runChecks(t), FILM: this });
    const ft = this.q.get('t');
    if (this.render) { this.seek(+(ft || 0)); window.__ready = true; return; }
    if (ft != null) { this.fit(); this.seek(+ft); window.__ready = true; return; }   // a frozen frame, fitted to the window
    this.live(); window.__ready = true;
  }
  fit() {
    const cv = this.renderer.domElement, st = document.body.style; st.margin = 0; st.background = '#0d0f14'; st.overflow = 'hidden';
    const fit = () => { const k = Math.min(innerWidth / this.W, innerHeight / this.H); Object.assign(cv.style, { position: 'fixed', left: (innerWidth - this.W * k) / 2 + 'px', top: (innerHeight - this.H * k) / 2 + 'px', width: this.W * k + 'px', height: this.H * k + 'px' }); };
    addEventListener('resize', fit); fit();
  }
  live() {
    const cv = this.renderer.domElement; this.fit();
    const bar = document.createElement('div'); Object.assign(bar.style, { position: 'fixed', left: 0, bottom: 0, height: '3px', background: 'rgba(255,255,255,.7)', width: 0, zIndex: 2 }); document.body.appendChild(bar);
    let t = 0, last = performance.now(), paused = false, drag = null;
    const step = now => {
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      if (!paused && !drag) { t += dt; if (t > this.DURATION) t = 0; }
      this.seek(t); bar.style.width = (t / this.DURATION * 100) + '%'; requestAnimationFrame(step);
    };
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, t, moved: false }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 4) drag.moved = true; t = clamp(drag.t + dx / innerWidth * this.DURATION, 0, this.DURATION); });
    cv.addEventListener('pointerup', () => { if (drag && !drag.moved) paused = !paused; drag = null; });
    addEventListener('keydown', e => { if (e.key === ' ') paused = !paused; if (e.key === 'ArrowRight') t = Math.min(this.DURATION, t + 1); if (e.key === 'ArrowLeft') t = Math.max(0, t - 1); });
    requestAnimationFrame(step);
  }
}

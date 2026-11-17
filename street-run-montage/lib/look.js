// street-run-montage · look.js — the look as numbers and materials: two-tone cel materials whose shadow side is the
// light's cool tint (not a darker copy of the colour), inverted-hull ink for bodies, painted canvas textures, the sky
// dome, painted cumulus cards, the seasons and the light presets.
import * as THREE from 'three';
import { rng, n2, fbm, clamp, mix, shade, tweak, vary, canvas, lerp } from './core.js';

// ── light presets: sun direction (azimuth / elevation, degrees), the shadow tint, sky stops, haze ──
export const LIGHTS = {
  noon:      { az: 150, el: 58, shadow: '#7088c8', warm: '#fff6ea', zenith: '#1f63d6', mid: '#4b93ec', horizon: '#cfe6fb', haze: '#d9ecfb', hazeFar: 700, sunGlow: .5 },
  afternoon: { az: 215, el: 36, shadow: '#6a7fc4', warm: '#fff0dc', zenith: '#1e5fd0', mid: '#4a90e8', horizon: '#d6e8f8', haze: '#dfeaf4', hazeFar: 650, sunGlow: .65 },
  golden:    { az: 250, el: 14, shadow: '#6b6fb8', warm: '#ffd9a8', zenith: '#2f5fb8', mid: '#7f9fd8', horizon: '#ffd7a8', haze: '#f3d2b0', hazeFar: 520, sunGlow: 1 },
};
// ── seasons: what the trees, verges and ground wear ──
export const SEASONS = {
  autumn: { leaf: ['#e8782a', '#f09a2e', '#d85a22', '#f2b440', '#c9481e'], hedge: '#c98a2c', grass: '#c9a24a', bark: '#5a4436', petals: null, fall: '#e88a34' },
  spring: { leaf: ['#f6b8c8', '#f9cdd8', '#eea2b8', '#fbe0e6', '#8cbf5a'], hedge: '#5f9a3e', grass: '#8cc25a', bark: '#4e3c34', petals: '#f8c6d2', fall: '#f8c6d2' },
  summer: { leaf: ['#3f8f3a', '#56a443', '#2f7a34', '#6fb84c', '#478f3c'], hedge: '#3f8a36', grass: '#6cae46', bark: '#4a3a30', petals: null, fall: null },
  winter: { leaf: null, hedge: '#6f7f5a', grass: '#c9c3ae', bark: '#4d4038', petals: null, fall: null, snow: '#f4f7fb' },
};

/** linear-space colour */
export const col = c => new THREE.Color(c);

let GRAD = null;
/** the cel ramp: one hard step — a quarter of the lit hemisphere goes to shadow, the rest is fully lit */
export function gradient() {
  if (GRAD) return GRAD;
  const d = new Uint8Array([0, 255, 255, 255]);
  GRAD = new THREE.DataTexture(d, 4, 1, THREE.RedFormat); GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.needsUpdate = true;
  return GRAD;
}
const MATS = new Map();
/** a cel material (cached by key): colour or texture; opts: { map, side, transparent, alphaTest, emissive } */
export function cel(color = '#ffffff', o = {}) {
  const key = o.key || (typeof color === 'string' ? color : '') + (o.map ? o.map.uuid : '') + (o.side || '') + (o.alphaTest || '') + (o.emissive || '');
  if (key && MATS.has(key)) return MATS.get(key);
  const m = new THREE.MeshToonMaterial({ color: col(color), gradientMap: gradient(), map: o.map || null, side: o.side || THREE.FrontSide, transparent: !!o.transparent, alphaTest: o.alphaTest || 0 });
  if (o.emissive) { m.emissive = col(o.emissive); m.emissiveIntensity = o.emissiveIntensity ?? 1; }
  if (key) MATS.set(key, m);
  return m;
}
/** an unlit colour (signs, glows, the sun) */
export const flat = (color, o = {}) => new THREE.MeshBasicMaterial({ color: col(color), map: o.map || null, transparent: !!o.transparent, opacity: o.opacity ?? 1, side: o.side || THREE.FrontSide, depthWrite: o.depthWrite ?? true, fog: o.fog ?? true });

// ── ink: an inverted hull pushed out along the normal by a constant number of screen pixels ──
const INK = new Map();
export const RES = new THREE.Vector2(1920, 1080);
export function ink(color = '#2a2338', w = 2.2) {
  const key = color + w; if (INK.has(key)) return INK.get(key);
  const m = new THREE.ShaderMaterial({
    uniforms: { uC: { value: col(color) }, uW: { value: w }, uRes: { value: RES } },
    vertexShader: `uniform float uW; uniform vec2 uRes;
      void main(){ vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal); vec4 q = projectionMatrix * vec4(n, 0.0);
        vec2 d = q.xy; float l = length(d); d = l > 1e-5 ? d / l : vec2(0.0);
        p.xy += d * uW * p.w * 2.0 / uRes * (uRes.y / 1080.0); gl_Position = p; }`,
    fragmentShader: `uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0); }`,
    side: THREE.BackSide,
  });
  m.userData.ink = true; INK.set(key, m); return m;
}
/** add an ink hull to a mesh (same geometry, back faces, pushed out) */
export function inked(mesh, color, w) {
  const h = new THREE.Mesh(mesh.geometry, ink(color, w)); h.userData.hull = true; h.castShadow = false; h.receiveShadow = false;
  mesh.add(h); return mesh;
}

// ── painted textures (canvas, seeded, cached) ──
const TEX = new Map();
export function tex(key, w, h, paint, o = {}) {
  if (TEX.has(key)) return TEX.get(key);
  const c = canvas(w, h), g = c.getContext('2d'); paint(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (o.repeat !== false) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  TEX.set(key, t); return t;
}
const speckle = (g, w, h, seed, cols, n, r0, r1) => { const r = rng(seed); for (let i = 0; i < n; i++) { g.fillStyle = cols[Math.floor(r() * cols.length)]; const s = lerp(r0, r1, r()); g.fillRect(r() * w, r() * h, s, s); } };
/** asphalt: warm grey with patches, cracks and fleck */
export const asphalt = (base = '#8d8b8e') => tex('asphalt' + base, 512, 512, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const r = rng(11);
  for (let i = 0; i < 26; i++) { g.fillStyle = shade(base, (r() - .5) * .12); g.globalAlpha = .5; g.beginPath(); g.ellipse(r() * w, r() * h, 30 + r() * 90, 20 + r() * 50, r() * 3, 0, 7); g.fill(); }
  g.globalAlpha = 1; speckle(g, w, h, 12, [shade(base, -.18), shade(base, .14), shade(base, .25)], 3000, 1, 2.5);
  g.strokeStyle = shade(base, -.25); g.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - .5) * 40; y += (r() - .3) * 30; g.lineTo(x, y); } g.stroke(); }
});
/** sidewalk / plaza tiles */
export const tiles = (base = '#c9b9a3', n = 4) => tex('tiles' + base + n, 512, 512, (g, w, h) => {
  const r = rng(21), s = w / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = vary(base, r, .05); g.fillRect(i * s, j * s, s, s); }
  speckle(g, w, h, 22, [shade(base, -.12), shade(base, .1)], 1500, 1, 2);
  g.strokeStyle = shade(base, -.22); g.lineWidth = 3; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
});
/** concrete block wall (the grid of hollow blocks) */
export const blocks = (base = '#c8c4bc') => tex('blocks' + base, 512, 256, (g, w, h) => {
  const r = rng(31); g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.fillStyle = vary(base, r, .03); g.fillRect(i * 128 + 2, j * 64 + 2, 124, 60); }
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(80,70,60,.08)'; const x = r() * w; g.fillRect(x, r() * h * .3, 2 + r() * 6, h * (.3 + r() * .7)); }
  speckle(g, w, h, 32, [shade(base, -.15), shade(base, .12)], 1400, 1, 2);
  g.fillStyle = shade(base, -.22); for (let j = 0; j <= 4; j++) g.fillRect(0, j * 64 - 1.5, w, 3); for (let i = 0; i <= 4; i++) g.fillRect(i * 128 - 1.5, 0, 3, h);
});
/** bricks */
export const bricks = (base = '#b4643e') => tex('bricks' + base, 512, 512, (g, w, h) => {
  const r = rng(41), bw = 64, bh = 24; g.fillStyle = shade(base, .35); g.fillRect(0, 0, w, h);
  for (let j = 0; j < h / bh; j++) for (let i = -1; i < w / bw + 1; i++) { g.fillStyle = vary(base, r, .07); g.fillRect(i * bw + (j % 2) * bw / 2 + 2, j * bh + 2, bw - 4, bh - 4); }
  speckle(g, w, h, 42, [shade(base, -.2), shade(base, .15)], 1500, 1, 2);
});
/** facade: wall colour + a grid of windows (rows × cols per tile) with sills, frames and curtains */
export const facade = (wall = '#e8e0d2', glass = '#5d7fa8', cols = 2, rows = 2, seed = 1) => tex(`facade${wall}${glass}${cols}${rows}${seed}`, 256, 256, (g, w, h) => {
  const r = rng(seed); g.fillStyle = wall; g.fillRect(0, 0, w, h);
  speckle(g, w, h, seed + 5, [shade(wall, -.06), shade(wall, .05)], 600, 1, 3);
  const cw = w / cols, rh = h / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = i * cw + cw * .2, y = j * rh + rh * .22, ww = cw * .6, hh = rh * .5;
    g.fillStyle = shade(wall, -.25); g.fillRect(x - 3, y - 3, ww + 6, hh + 6);
    const gr = g.createLinearGradient(x, y, x + ww, y + hh); gr.addColorStop(0, shade(glass, .35)); gr.addColorStop(.5, glass); gr.addColorStop(1, shade(glass, -.2));
    g.fillStyle = gr; g.fillRect(x, y, ww, hh);
    if (r() < .6) { g.fillStyle = r() < .5 ? '#efe6d4' : '#d9c7a8'; g.fillRect(x, y, ww * (.2 + r() * .3), hh); }
    g.fillStyle = shade(wall, -.35); g.fillRect(x + ww / 2 - 1, y, 2, hh); g.fillStyle = shade(wall, .15); g.fillRect(x - 5, y + hh + 3, ww + 10, 4);
  }
});
/** roof tiles */
export const roof = (base = '#4b5a6e') => tex('roof' + base, 256, 256, (g, w, h) => {
  const r = rng(51); g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let j = 0; j < 16; j++) { g.fillStyle = shade(base, -.18); g.fillRect(0, j * 16 + 13, w, 3); for (let i = 0; i < 8; i++) { g.fillStyle = vary(base, r, .04); g.fillRect(i * 32 + (j % 2) * 16, j * 16, 30, 13); } }
});
/** water: banded blue with sparkle streaks */
export const water = (base = '#3f7fc0') => tex('water' + base, 512, 512, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rng(61);
  for (let i = 0; i < 220; i++) { const y = r() * h, x = r() * w, l = 20 + r() * 90; g.fillStyle = r() < .5 ? shade(base, .25) : shade(base, -.12); g.globalAlpha = .7; g.fillRect(x, y, l, 2 + r() * 3); }
  for (let i = 0; i < 60; i++) { g.fillStyle = '#ffffff'; g.globalAlpha = .8; g.fillRect(r() * w, r() * h, 8 + r() * 30, 2); }
  g.globalAlpha = 1;
});
/** a shop sign: text on a band (designed per topic: never a real brand) */
export function signTex(text, o = {}) {
  const { bg = '#ffffff', fg = '#2b3a67', stripe = '#f08a24', stripe2 = '#e8432e', font = '900 92px system-ui, sans-serif' } = o;
  return tex('sign' + text + bg + fg + stripe, 1024, 160, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = stripe; g.fillRect(0, h - 26, w, 14); g.fillStyle = stripe2; g.fillRect(0, h - 12, w, 12);
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h * .44, w * .92);
  }, { repeat: false });
}
/** a shop window: shelves of coloured goods behind glass */
export const shelves = (seed = 1) => tex('shelves' + seed, 512, 256, (g, w, h) => {
  const r = rng(seed); g.fillStyle = '#e9eef2'; g.fillRect(0, 0, w, h);
  for (let j = 0; j < 4; j++) { const y = 30 + j * 56; g.fillStyle = '#9aa6b0'; g.fillRect(0, y + 40, w, 5);
    for (let x = 4; x < w;) { const bw = 8 + r() * 18, bh = 16 + r() * 22; g.fillStyle = ['#e85a4a', '#f2b33d', '#4a8fd8', '#5bbf6a', '#f5f0e0', '#d9548f', '#8f6ad8'][Math.floor(r() * 7)]; g.fillRect(x, y + 40 - bh, bw, bh); x += bw + 2 + r() * 4; } }
  g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(w * .1, 0); g.lineTo(w * .3, 0); g.lineTo(w * .1, h); g.lineTo(-w * .1, h); g.fill();
}, { repeat: false });
/** chain-link mesh (alpha) */
export const chainLink = () => tex('chain', 128, 128, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.strokeStyle = '#9aa3a8'; g.lineWidth = 3;
  for (let i = -2; i < 4; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 128, 128); g.moveTo(i * 32 + 128, 0); g.lineTo(i * 32, 128); g.stroke(); }
});
/** a road line */
export const lineTex = () => tex('line', 64, 512, (g, w, h) => { g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, w, h); speckle(g, w, h, 71, ['#cfccc4', '#ffffff'], 300, 1, 3); });

// ── the sky: a dome with three stops and a sun glow, drawn behind everything; the sun disc is part of it ──
export function skyDome(L) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uZ: { value: col(L.zenith) }, uM: { value: col(L.mid) }, uH: { value: col(L.horizon) }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uGlow: { value: L.sunGlow }, uWarm: { value: col(L.warm) } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 uZ, uM, uH, uSun, uWarm; uniform float uGlow; varying vec3 vD;
      void main(){ float e = clamp(vD.y, -0.2, 1.0); vec3 c = e < 0.18 ? mix(uH, uM, smoothstep(-0.02, 0.18, e)) : mix(uM, uZ, smoothstep(0.18, 0.75, e));
        float s = max(dot(normalize(vD), normalize(uSun)), 0.0);
        c += uWarm * (pow(s, 12.0) * 0.35 + pow(s, 200.0) * 0.6) * uGlow; c = mix(c, vec3(1.0), smoothstep(0.9993, 0.9996, s));
        gl_FragColor = vec4(c, 1.0); #include <colorspace_fragment> }`,
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), m); mesh.renderOrder = -10; mesh.frustumCulled = false;
  mesh.onBeforeRender = (r, s, cam) => mesh.position.copy(cam.position);
  return mesh;
}
/** a painted cumulus card (seeded): crisp white puffs, lilac-blue undersides */
export function cloudTex(seed = 1, L = LIGHTS.noon) {
  return tex('cloud' + seed + L.shadow, 512, 256, (g, w, h) => {
    const r = rng(seed), puffs = [];
    for (let i = 0; i < 16; i++) { const x = w * (.15 + .7 * r()), base = h * .78, rr = h * (.12 + .2 * r()) * (1 - Math.abs(x / w - .5)); puffs.push([x, base - rr * (.4 + r() * .9), rr]); }
    const under = mix(L.shadow, '#ffffff', .45), mid = mix(L.shadow, '#ffffff', .75);
    for (const [x, y, rr] of puffs) { g.fillStyle = under; g.beginPath(); g.arc(x, y + rr * .18, rr, 0, 7); g.fill(); }
    for (const [x, y, rr] of puffs) { g.fillStyle = mid; g.beginPath(); g.arc(x - rr * .06, y - rr * .02, rr * .92, 0, 7); g.fill(); }
    for (const [x, y, rr] of puffs) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x - rr * .16, y - rr * .16, rr * .74, 0, 7); g.fill(); }
    g.globalCompositeOperation = 'destination-out'; g.fillRect(0, h * .8, w, h);
  }, { repeat: false });
}
/** a ring of cloud cards around the route (far away, fixed) */
export function clouds(scene, L, centre = new THREE.Vector3(), n = 14, seed = 3) {
  const r = rng(seed), group = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * .3, d = 420 + r() * 260, s = 90 + r() * 150;
    const m = new THREE.SpriteMaterial({ map: cloudTex(1 + (i % 6), L), fog: false, depthWrite: false, transparent: true });
    const sp = new THREE.Sprite(m); sp.scale.set(s * 2, s, 1); sp.position.set(centre.x + Math.cos(a) * d, 30 + r() * 80 + s * .3, centre.z + Math.sin(a) * d); sp.renderOrder = -5;
    group.add(sp);
  }
  scene.add(group); return group;
}

/** the lights for a preset: sun (casts the shadows) + ambient = the shadow tint, so lit + shade = the material colour */
export function lights(scene, L) {
  const sh = col(L.shadow), warm = col(L.warm);
  const amb = new THREE.AmbientLight(sh, Math.PI);
  const sun = new THREE.DirectionalLight(new THREE.Color(Math.max(0, warm.r - sh.r), Math.max(0, warm.g - sh.g), Math.max(0, warm.b - sh.b)), Math.PI);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  const c = sun.shadow.camera; c.left = -28; c.right = 28; c.top = 28; c.bottom = -28; c.near = 1; c.far = 260;
  scene.add(amb, sun, sun.target);
  const az = L.az * Math.PI / 180, el = L.el * Math.PI / 180;
  const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  return { amb, sun, dir };
}
export { clamp, mix, shade, tweak, n2, fbm };

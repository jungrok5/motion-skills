// pencil-live-action · plate.js — the live-action plate: a photographed place the drawing walks into.
//
// The "real" half of every frame is a three.js scene built from Poly Haven CC0 scans:
//   place      an HDRI: it lights everything (image-based light + a sun found in it) and, through its full-size JPG, is the
//              backdrop — projected onto a dome whose floor is flat (the photo's ground lies where the scene's ground is)
//   surfaces   scanned PBR materials (colour / normal / AO-rough-metal) on the things built here: the table, the ground
//   objects    scanned glTF models (what a drawing turns into, props)
//   built      the sketchbook page (paper tooth, a slight lift, spiral rings), a real pencil, a table — from numbers
// and it is shot through a lens: true depth of field from the depth buffer (focus distance, f-number, focal length), then
// a tone curve that the backdrop is pre-inverted through (so the photo shows as photographed), a warm/cool grade,
// vignette. Grain and the drawing go on top in film.js.
//
// No scans fetched? The plate falls back to a stand-in (a soft sky, procedural wood and stone) so pages still run offline;
// check.mjs reports it. Fetch with scripts/fetch-assets.mjs, or open the page with ?cdn=1 to read them from Poly Haven.
import * as THREE from 'three';
import { GLTFLoader } from './vendor/jsm/loaders/GLTFLoader.js';

const T = THREE;
export { THREE };

// ── HDR (Radiance .hdr, RLE RGBE) → Float32 RGBA ─────────────────────────────────────────────────────────────────────
export function parseHDR(buf) {
  const u = new Uint8Array(buf); let p = 0;
  const line = () => { let s = ''; while (p < u.length && u[p] !== 10) s += String.fromCharCode(u[p++]); p++; return s; };
  let l, w = 0, h = 0; for (let i = 0; i < 64; i++) { l = line(); const m = l.match(/^-Y (\d+) \+X (\d+)/); if (m) { h = +m[1]; w = +m[2]; break; } }
  if (!w) throw new Error('not a Radiance HDR');
  const rgbe = new Uint8Array(w * h * 4), row = new Uint8Array(w * 4);
  for (let y = 0; y < h; y++) {
    if (u[p] !== 2 || u[p + 1] !== 2 || (u[p + 2] << 8 | u[p + 3]) !== w) { rgbe.set(u.subarray(p, p + w * 4), y * w * 4); p += w * 4; continue; }   // flat
    p += 4;
    for (let c = 0; c < 4; c++) { let x = 0; while (x < w) { let n = u[p++]; if (n > 128) { n -= 128; const v = u[p++]; while (n--) row[(x++) * 4 + c] = v; } else while (n--) row[(x++) * 4 + c] = u[p++]; } }
    rgbe.set(row, y * w * 4);
  }
  const f = new Float32Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { const e = rgbe[i * 4 + 3], s = e ? Math.pow(2, e - 136) : 0; f[i * 4] = rgbe[i * 4] * s; f[i * 4 + 1] = rgbe[i * 4 + 1] * s; f[i * 4 + 2] = rgbe[i * 4 + 2] * s; f[i * 4 + 3] = 1; }
  return { w, h, data: f };   // row 0 = the top of the picture (straight up)
}
/** the same pixels with the rows reversed (for a GL upload with flipY = false: v = 1 is straight up) */
function flipRows({ w, h, data }) {
  const o = new Float32Array(data.length), n = w * 4; for (let y = 0; y < h; y++) o.set(data.subarray(y * n, y * n + n), (h - 1 - y) * n); return o;
}
/** the sun in an equirect HDR: its brightest pixels are taken OUT of the picture (clamped) and returned as a directional
 *  light — { dir (toward the sun), E (irradiance it gave: the light's intensity), col, mean, meanLo, sharp } — so it can cast
 *  shadows without being counted twice */
function findSun(hdr) {
  const { w, h, data } = hdr; let best = 0, mean = 0, meanLo = 0, nLo = 0;
  const lum = i => data[i] * .2126 + data[i + 1] * .7152 + data[i + 2] * .0722;
  for (let i = 0; i < w * h; i++) { const L = lum(i * 4); if (L > best) best = L; const y = Math.floor(i / w); mean += L; if (y > h * .55) { meanLo += L; nLo++; } }
  mean /= w * h; meanLo /= nLo || 1;
  const cut = Math.max(mean * 6, best * .3);
  let sx = 0, sy = 0, sz = 0, E = 0, cr = 0, cg = 0, cb = 0;
  for (let y = 0; y < h * .6; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, L = lum(i); if (L <= cut) continue;
    // the same convention as the shaders: u = atan(z, x)/2π + .5, latitude from the row (row 0 = straight up)
    const ph = ((x + .5) / w - .5) * Math.PI * 2, lat = (.5 - (y + .5) / h) * Math.PI, dO = (2 * Math.PI / w) * (Math.PI / h) * Math.cos(lat);
    const dx = Math.cos(ph) * Math.cos(lat), dz = Math.sin(ph) * Math.cos(lat), dy = Math.sin(lat), ex = (L - cut) * dO;
    sx += dx * ex; sy += dy * ex; sz += dz * ex; E += ex; cr += data[i] * ex / L; cg += data[i + 1] * ex / L; cb += data[i + 2] * ex / L;
    const k = cut / L; data[i] *= k; data[i + 1] *= k; data[i + 2] *= k;
  }
  const d = new T.Vector3(sx, sy, sz); if (d.lengthSq() < 1e-12) d.set(.3, .8, .2); d.normalize();
  const m = Math.max(cr, cg, cb) || 1;
  // irradiance on a horizontal surface (what lights the page): the sky that is left + the sun at its elevation
  let Eup = 0; for (let y = 0; y < h / 2; y++) { const lat = (.5 - (y + .5) / h) * Math.PI, dO = (2 * Math.PI / w) * (Math.PI / h) * Math.cos(lat), c = Math.sin(lat); for (let x = 0; x < w; x++) Eup += lum((y * w + x) * 4) * dO * c; }
  Eup += E * Math.max(0, d.y);
  return { dir: d, E, Eup, col: new T.Color(cr / m, cg / m, cb / m), mean, meanLo, sharp: best / (mean || 1) };
}

// ── textures ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function h2(a, b) { let x = Math.imul(a * 374761393 + b * 668265263, 1274126177); x ^= x >>> 13; x = Math.imul(x, 1103515245); return ((x ^ x >>> 16) >>> 0) / 4294967296; }
function vnoise(x, y, per) { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), m = v => ((v % per) + per) % per;
  const a = h2(m(i), m(j)), b = h2(m(i + 1), m(j)), c = h2(m(i), m(j + 1)), d = h2(m(i + 1), m(j + 1)); return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy; }
/** paper: tooth + fibres (colour map) — a sketchbook page */
export function paperTexture(tone = '#f4f1ea', N = 1024) {
  const c = cnv(N, N), x = c.getContext('2d'), d = x.createImageData(N, N), [R, G, B] = [1, 3, 5].map(i => parseInt(tone.slice(i, i + 2), 16));
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const n = vnoise(i / 64, j / 64, N / 64) * .5 + vnoise(i / 16, j / 16, N / 16) * .3 + vnoise(i / 3, j / 3, Math.round(N / 3)) * .2, v = (n - .5) * 16, k = (j * N + i) * 4;
    d.data[k] = R + v; d.data[k + 1] = G + v; d.data[k + 2] = B + v * 1.1; d.data[k + 3] = 255;
  }
  x.putImageData(d, 0, 0); x.globalAlpha = .05; x.strokeStyle = '#8a8478';
  for (let i = 0; i < 300; i++) { const a = h2(i, 1) * 6.28, px = h2(i, 2) * N, py = h2(i, 3) * N, L = 8 + h2(i, 4) * 30; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + .7) * L / 2, py + Math.sin(a + .7) * L / 2, px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke(); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
}
/** a stand-in surface when no scan is fetched: 'wood' (planks of grain) or 'stone' (setts) */
function standIn(kind, N = 512) {
  const c = cnv(N, N), x = c.getContext('2d'), d = x.createImageData(N, N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let r, g, b, k = (j * N + i) * 4;
    if (kind === 'wood') { const s = i / N * 40 + vnoise(i / 90, j / 9, Math.round(N / 9)) * 6, ring = .5 + .5 * Math.sin(s), n = vnoise(i / 4, j / 40, Math.round(N / 40)); r = 92 + ring * 38 + n * 20; g = 58 + ring * 24 + n * 12; b = 34 + ring * 12 + n * 6; }
    else { const cs = N / 8, ci = Math.floor((i + (Math.floor(j / cs) % 2) * cs / 2) / cs), cj = Math.floor(j / cs), fx = ((i + (Math.floor(j / cs) % 2) * cs / 2) % cs) / cs, fy = (j % cs) / cs;
      const edge = Math.min(fx, 1 - fx, fy, 1 - fy), mort = edge < .07, tone = h2(ci, cj) * 30, n = vnoise(i / 6, j / 6, Math.round(N / 6)) * 22; r = (mort ? 70 : 128 + tone) + n; g = (mort ? 66 : 124 + tone) + n; b = (mort ? 60 : 118 + tone * .8) + n; }
    d.data[k] = r; d.data[k + 1] = g; d.data[k + 2] = b; d.data[k + 3] = 255;
  }
  x.putImageData(d, 0, 0); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; return t;
}

// ── shaders ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const FULL_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
// the tone curve: T(x) = 1 - exp(-x·e) (invertible, so the backdrop can be fed through it unchanged)
const BACKDROP_FS = `
uniform sampler2D map; uniform float gain, expo, hasMap, linearMap; uniform vec3 skyA, skyB, gnd;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  vec3 c;
  if (hasMap > .5) { vec2 uv = vec2(atan(d.z, d.x) * .15915494 + .5, asin(clamp(d.y, -1., 1.)) * .31830989 + .5); c = texture2D(map, uv).rgb; }   // sRGB texture: the sampler decodes it
  else { float y = d.y; c = y > 0. ? mix(skyA, skyB, pow(1. - y, 3.)) : gnd * (.8 + .2 * smoothstep(-.3, 0., y)); }
  if (linearMap > .5) { gl_FragColor = vec4(c * gain, 1.); return; }   // an HDR backdrop is already light: it takes the tone curve like the scene
  c = clamp(c * gain, 0., .985);
  gl_FragColor = vec4(-log(1. - c) / expo, 1.);   // pre-inverse of the tone curve
}`;
const BACKDROP_VS = `attribute vec3 dir; varying vec3 vDir; void main(){ vDir = dir; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
// depth of field: gather with a Vogel disc, each sample weighted by whether its own circle of confusion reaches here
const DOF_FS = `
uniform sampler2D tCol, tDep; uniform vec2 res; uniform float near, far, focus, coc, maxR, on;
varying vec2 vUv;
float lin(float d){ float z = d * 2. - 1.; return 2. * near * far / (far + near - z * (far - near)); }
float cocAt(vec2 uv){ float z = lin(texture2D(tDep, uv).r); return clamp(coc * abs(1. - focus / z), 0., maxR); }
void main(){
  vec4 c0 = texture2D(tCol, vUv); if (on < .5) { gl_FragColor = c0; return; }
  float cc = cocAt(vUv); vec3 acc = c0.rgb; float wsum = 1.;
  const int N = 40; float ga = 2.39996323;
  for (int i = 1; i < N; i++) {
    float r = sqrt(float(i) / float(N)) * maxR, a = float(i) * ga; vec2 o = vec2(cos(a), sin(a)) * r;
    vec2 uv = vUv + o / res; float cs = cocAt(uv);
    float w = clamp(cs - r + 1., 0., 1.) * clamp(cc - r + 1.5, 0., 1.) + clamp(cs - r + 1., 0., 1.) * step(cc + .5, cs) * .8;
    acc += texture2D(tCol, uv).rgb * w; wsum += w;
  }
  gl_FragColor = vec4(acc / wsum, 1.);
}`;
// tone curve + grade (+ the front mask in alpha for the second pass)
const GRADE_FS = `
uniform sampler2D tCol, tMask; uniform float expo, warm, sat, lift, contrast, maskPass; uniform vec3 shadowTint, highTint;
varying vec2 vUv;
vec3 l2s(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
void main(){
  vec3 c = 1. - exp(-texture2D(tCol, vUv).rgb * expo);
  float L = dot(c, vec3(.2126, .7152, .0722));
  c = mix(vec3(L), c, sat);
  c *= mix(shadowTint, highTint, smoothstep(.05, .6, L));
  c = clamp((c - .5) * contrast + .5 + lift, 0., 1.);
  vec3 s = l2s(c);
  float m = maskPass > .5 ? texture2D(tMask, vUv).r : 1.;
  gl_FragColor = vec4(s * m, m);
}`;

// ── the plate ────────────────────────────────────────────────────────────────────────────────────────────────────────
export class Plate {
  /** o: { W, H, base (URL of the film folder), cdn (read scans from Poly Haven), look: { expo, warm, sat, contrast, … } } */
  constructor(o = {}) {
    this.W = o.W || 1920; this.H = o.H || 1080; this.base = o.base || './'; this.cdn = !!o.cdn;
    // light: a live page on the web — 1k scans from the CDN, textures ≤ 2048 px (≤ 1024 on a phone), and on a phone the HDR
    // itself as the backdrop (no 8k photo to decode). Renders (render.mjs) always load the full set.
    this.light = o.light || null; this.progress = { done: 0, total: 0, label: '' };
    this.look = Object.assign({ gain: 1, expo: null, sat: 1.04, contrast: 1.04, lift: 0, shadowTint: [.97, .99, 1.04], highTint: [1.07, 1.0, .9], fstop: 2.8, dof: true, sunBoost: 1 }, o.look || {});
    this.canvas = cnv(this.W, this.H);
    const r = this.renderer = new T.WebGLRenderer({ canvas: this.canvas, antialias: false, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    r.setPixelRatio(1); r.setSize(this.W, this.H, false); r.outputColorSpace = T.LinearSRGBColorSpace; r.toneMapping = T.NoToneMapping;
    r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; r.autoClear = true;
    this.scene = new T.Scene(); this.camera = new T.PerspectiveCamera(40, this.W / this.H, .005, 400);
    this.manifest = null; this.standIn = true; this.textures = {}; this.models = {}; this.front = []; this.notes = [];
    // a linear HDR target where the GPU can draw into half floats; 8-bit otherwise (some phones)
    const ex = r.extensions, hdrOK = ex.has('EXT_color_buffer_half_float') || ex.has('EXT_color_buffer_float');
    this.rtType = hdrOK ? T.HalfFloatType : T.UnsignedByteType; if (!hdrOK) this.notes.push('8-bit render targets (no half-float colour buffers here)');
    const rt = (o2 = {}) => new T.WebGLRenderTarget(this.W, this.H, { type: this.rtType, ...o2 });
    this.rtScene = rt({ depthTexture: new T.DepthTexture(this.W, this.H), samples: 0 });
    this.rtDof = rt(); this.rtMask = new T.WebGLRenderTarget(this.W, this.H, { depthTexture: new T.DepthTexture(this.W, this.H) });
    const quad = (fs, uniforms) => { const m = new T.ShaderMaterial({ vertexShader: FULL_VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false }); const s = new T.Scene(); s.add(new T.Mesh(new T.PlaneGeometry(2, 2), m)); return { m, s }; };
    this.qDof = quad(DOF_FS, { tCol: { value: null }, tDep: { value: null }, res: { value: new T.Vector2(this.W, this.H) }, near: { value: .005 }, far: { value: 400 }, focus: { value: 1 }, coc: { value: 8 }, maxR: { value: 14 }, on: { value: 1 } });
    this.qGrade = quad(GRADE_FS, { tCol: { value: null }, tMask: { value: null }, expo: { value: 1 }, warm: { value: 0 }, sat: { value: 1 }, lift: { value: 0 }, contrast: { value: 1 }, maskPass: { value: 0 }, shadowTint: { value: new T.Vector3() }, highTint: { value: new T.Vector3() } });
    this.qCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.maskMat = new T.MeshBasicMaterial({ color: 0xffffff }); this.blackMat = new T.MeshBasicMaterial({ color: 0x000000 });
  }

  // ── loading ──
  /** count a loading step (for the page's loading screen) */
  async step(label, fn) { this.progress.total++; this.progress.label = label; try { return await fn(); } finally { this.progress.done++; } }
  /** a CDN file at a lighter resolution when this is a light live page (Poly Haven names every size the same way) */
  lite(u, res = '1k') { return this.light && this.cdn && /^https:\/\/dl\.polyhaven\.org\//.test(u) ? u.replace(/\/(2k|4k)\//, `/${res}/`).replace(/_(2k|4k)\.(jpg|hdr|png)$/, `_${res}.$2`) : u; }
  async load() {
    const tryJSON = async u => { try { const r = await fetch(u); return r.ok ? await r.json() : null; } catch { return null; } };
    this.manifest = this.cdn ? await tryJSON(this.base + 'manifest.cdn.json') : (await tryJSON(this.base + 'assets/manifest.json'));
    if (!this.manifest && !this.cdn) { this.manifest = null; }
    this.standIn = !this.manifest || !this.manifest.hdri;
    if (this.standIn) this.notes.push('stand-in plate: no scans (run scripts/fetch-assets.mjs, or open with ?cdn=1)');
    const url = f => /^https?:/.test(f) ? f : this.base + f;
    // light
    let sun;
    if (!this.standIn) {
      const hdrURL = this.light === 'phone' ? url(this.manifest.hdri.hdr) : this.lite(url(this.manifest.hdri.hdr));
      const buf = await this.step('light', async () => (await fetch(hdrURL)).arrayBuffer()), hdr = parseHDR(buf);
      sun = this.sunInfo = findSun(hdr);   // (also takes the sun out of hdr.data)
      // half floats: filterable on every WebGL2 device (32-bit float filtering is not, e.g. on iPhones)
      const f = flipRows(hdr), h16 = new Uint16Array(f.length); for (let i = 0; i < f.length; i++) h16[i] = T.DataUtils.toHalfFloat(Math.min(f[i], 65000));
      const tex = new T.DataTexture(h16, hdr.w, hdr.h, T.RGBAFormat, T.HalfFloatType); tex.mapping = T.EquirectangularReflectionMapping; tex.magFilter = tex.minFilter = T.LinearFilter; tex.flipY = false; tex.wrapS = T.RepeatWrapping; tex.needsUpdate = true;
      const pm = new T.PMREMGenerator(this.renderer); this.scene.environment = pm.fromEquirectangular(tex).texture; pm.dispose();
      this.hdrTex = tex;
    } else {
      sun = this.sunInfo = { dir: new T.Vector3(-.5, .75, .35).normalize(), E: 2.2, Eup: 4, col: new T.Color(1, .95, .86), mean: 1.2, meanLo: .5, sharp: 30 };
      const s = new T.Scene(); s.background = null; const pm = new T.PMREMGenerator(this.renderer);
      const g = new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.ShaderMaterial({ side: T.BackSide, vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }', fragmentShader: 'varying vec3 p; void main(){ float y = normalize(p).y; gl_FragColor = vec4(y > 0. ? mix(vec3(1.3,1.45,1.7), vec3(.75,.8,.85), y) : vec3(.35,.32,.28), 1.); }' }));
      s.add(g); this.scene.environment = pm.fromScene(s, .02).texture; pm.dispose();
    }
    // exposure: a white page (albedo .8) lying in this light comes out at ~88 % — the photo itself passes through unchanged
    this.expo = (this.look.expo ?? (this.standIn ? 1.4 : Math.min(6, Math.max(.2, 1.386 / (.8 / Math.PI * Math.max(.05, sun.Eup)))))) * (this.look.bright ?? 1);
    // the sun: a directional light along the brightest patch (stronger the more the HDR is dominated by it)
    this.sun = new T.DirectionalLight(sun.col, (this.standIn ? 2.2 : sun.E) * this.look.sunBoost);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -.0002; this.sun.shadow.normalBias = .002; this.sun.shadow.radius = 3;
    const sc = this.sun.shadow.camera; sc.left = sc.bottom = -.6; sc.right = sc.top = .6; sc.near = .05; sc.far = 12;
    this.scene.add(this.sun, this.sun.target); this.scene.environmentIntensity = 1;
    // the backdrop
    let map = null, linear = false;
    if (!this.standIn && this.manifest.hdri.jpg && this.light !== 'phone') map = await this.step('backdrop', () => this.image(url(this.manifest.hdri.jpg), this.light ? 4096 : 4096));
    else if (!this.standIn) { map = this.hdrTex; linear = true; }          // a phone: the HDR is the backdrop (softer, but no 8k photo)
    if (this.hdrTex && !linear) { this.hdrTex.dispose(); this.hdrTex = null; }
    this.backdrop = this.dome(map, { linear });
    return this;
  }
  /** load an image (downscaled to maxW) as a texture */
  async image(u, maxW = 4096, srgb = true) {
    const r = await fetch(u); if (!r.ok) throw new Error(`${r.status} ${u}`); const blob = await r.blob(); let bmp;
    // downscale only (never up): read the size first, then resize if the picture is wider than maxW
    try { const full = await createImageBitmap(blob, { imageOrientation: 'flipY' }); if (full.width <= maxW) bmp = full; else { bmp = await createImageBitmap(full, { resizeWidth: maxW, resizeHeight: Math.round(full.height * maxW / full.width), resizeQuality: 'high' }); full.close(); } }
    catch { bmp = await createImageBitmap(blob, { imageOrientation: 'flipY' }); }
    const t = new T.Texture(bmp); t.flipY = false; if (srgb) t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.needsUpdate = true; return t;
  }
  /** the backdrop dome: a sphere (radius R) whose lower half is flattened at the ground, textured by direction from its centre
   *  (which sits at the HDRI camera's height h) — the photographed ground lands on the scene's ground */
  dome(map, o = {}) {
    const R = o.radius ?? 40, h = o.height ?? (this.manifest?.hdri?.height ?? 1.7), g = new T.SphereGeometry(R, 128, 64), pos = g.attributes.position, dir = new Float32Array(pos.count * 3), v = new T.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i); dir[i * 3] = v.x; dir[i * 3 + 1] = v.y; dir[i * 3 + 2] = v.z;
      if (v.y < 0) { const y1 = -h * 1.5, f = v.y < y1 ? -h / v.y : 1 - v.y * v.y / (3 * y1 * y1); v.multiplyScalar(f); pos.setXYZ(i, v.x, v.y, v.z); }
    }
    g.setAttribute('dir', new T.BufferAttribute(dir, 3));
    const m = new T.ShaderMaterial({ vertexShader: BACKDROP_VS, fragmentShader: BACKDROP_FS, side: T.BackSide, depthWrite: false,
      uniforms: { map: { value: map }, hasMap: { value: map ? 1 : 0 }, linearMap: { value: o.linear ? 1 : 0 }, gain: { value: this.look.gain }, expo: { value: this.expo }, skyA: { value: new T.Color(.62, .74, .9) }, skyB: { value: new T.Color(.93, .92, .9) }, gnd: { value: new T.Color(.36, .34, .31) } } });
    const mesh = new T.Mesh(g, m); mesh.position.set(0, h, 0); mesh.rotation.y = (o.turn || 0) * Math.PI / 180; mesh.renderOrder = -10; mesh.frustumCulled = false;
    this.scene.add(mesh); return mesh;
  }
  /** turn the place (deg): the backdrop and the light together */
  turn(deg) {
    const a = deg * Math.PI / 180; this.backdrop.rotation.y = a; this.scene.environmentRotation = new T.Euler(0, a, 0);
    this.sunDir = this.sunInfo.dir.clone().applyAxisAngle(new T.Vector3(0, 1, 0), a);
  }
  /** a scanned surface → MeshStandardMaterial (tile: metres per repeat); stand-in when missing */
  surface(id, o = {}) {
    const url = f => /^https?:/.test(f) ? f : this.base + f, te = this.manifest?.textures?.[id];
    const m = new T.MeshStandardMaterial({ color: 0xffffff, roughness: o.roughness ?? 1, metalness: 0, envMapIntensity: o.env ?? 1 });
    m.userData.tile = o.tile ?? te?.tile ?? 1;
    if (!te) { m.map = standIn(o.kind || (/wood|plank|table|oak|walnut/.test(id) ? 'wood' : 'stone')); m.roughness = o.kind === 'wood' ? .6 : .9; this.notes.push(`stand-in surface: ${id}`); return Promise.resolve(m); }
    return this.step(id, async () => {
      const mw = o.maxW || (this.light === 'phone' ? 1024 : this.light ? 2048 : 4096), U = f => this.lite(url(f));
      m.map = await this.image(U(te.files.diff), mw);
      if (te.files.nor) { m.normalMap = await this.image(U(te.files.nor), mw, false); m.normalScale = new T.Vector2(o.bump ?? 1, o.bump ?? 1); }
      if (te.files.arm) { const t = await this.image(U(te.files.arm), mw, false); m.aoMap = t; m.roughnessMap = t; m.metalnessMap = t; m.metalness = 1; m.roughness = o.roughness ?? 1; }
      return m;
    });
  }
  /** a scanned model (glTF) → Group, scaled to metres as authored */
  async model(id) {
    const me = this.manifest?.models?.[id]; if (!me) { this.notes.push(`missing model: ${id}`); return null; }
    const mgr = new T.LoadingManager(), base = /^https?:/.test(me.file) ? '' : this.base;
    if (me.inc) mgr.setURLModifier(u => { for (const [rel, abs] of Object.entries(me.inc)) if (u.endsWith(rel) || u.endsWith(encodeURI(rel))) return abs; return u; });
    const g = await this.step(id, () => new GLTFLoader(mgr).loadAsync(base + me.file));
    g.scene.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    return g.scene;
  }

  // ── the lens ──
  /** render one frame of the plate into this.canvas; cam = { pos, look, mm (focal length, full-frame), focus (m), fstop, roll } */
  render(cam, o = {}) {
    const r = this.renderer, c = this.camera, L = this.look;
    c.fov = 2 * Math.atan(12 / (cam.mm || 35)) * 180 / Math.PI; c.position.set(...cam.pos); c.up.set(Math.sin(cam.roll || 0), Math.cos(cam.roll || 0), 0); c.lookAt(...cam.look); c.updateProjectionMatrix(); c.updateMatrixWorld();
    // the sun's shadow box follows what the camera looks at
    const tgt = new T.Vector3(...(cam.shadowAt || cam.look)), sd = this.sunDir || this.sunInfo.dir, sh = cam.shadowSize || .6;
    this.sun.position.copy(tgt).addScaledVector(sd, 5); this.sun.target.position.copy(tgt); this.sun.target.updateMatrixWorld();
    const sc = this.sun.shadow.camera; sc.left = sc.bottom = -sh; sc.right = sc.top = sh; sc.updateProjectionMatrix();
    // scene → rtScene (linear HDR + depth)
    r.setRenderTarget(this.rtScene); r.setClearColor(0x000000, 1); r.clear(); r.render(this.scene, c);
    // depth of field: coc (px) for a thin lens: f²/(N(S−f)) on a 36 mm sensor scaled to the frame
    const f = (cam.mm || 35) / 1000, N = cam.fstop || L.fstop, S = Math.max(f * 1.5, cam.focus || 1), cocPx = (f * f / (N * (S - f))) / .036 * this.W * .5;
    const u = this.qDof.m.uniforms; u.tCol.value = this.rtScene.texture; u.tDep.value = this.rtScene.depthTexture; u.near.value = c.near; u.far.value = c.far; u.focus.value = S;
    u.coc.value = cocPx; u.maxR.value = Math.min(18, Math.max(1, cocPx * .9)) * (this.W / 1920 > .6 ? 1 : .5 / (this.W / 1920) * .5 + .5); u.on.value = (L.dof && !o.noDof) ? 1 : 0;
    this.cocPx = cocPx; this.focus = S;
    r.setRenderTarget(this.rtDof); r.render(this.qDof.s, this.qCam);
    // the front mask: real things that must cover the drawing (the pencil, a prop held in front) — white where visible
    const front = this.front.filter(m => m.visible);
    if (front.length) {
      const saveBg = this.scene.background, vis = []; this.scene.traverse(o2 => { if (o2.isMesh || o2.isPoints || o2.isLine) { vis.push([o2, o2.visible, o2.material]); } });
      for (const [m] of vis) { const isF = front.some(fm => fm === m || (fm.getObjectById && fm.getObjectById(m.id))); m.material = isF ? this.maskMat : this.blackMat; if (m === this.backdrop) m.visible = false; }
      const shadows = r.shadowMap.enabled; r.shadowMap.enabled = false;
      r.setRenderTarget(this.rtMask); r.setClearColor(0x000000, 1); r.clear(); r.render(this.scene, c);
      r.shadowMap.enabled = shadows; for (const [m, v, mat] of vis) { m.visible = v; m.material = mat; } this.scene.background = saveBg;
    }
    this.hasFront = front.length > 0;
    // grade → canvas
    const g = this.qGrade.m.uniforms; g.tCol.value = this.rtDof.texture; g.tMask.value = this.rtMask.texture; g.expo.value = this.expo; g.sat.value = L.sat; g.contrast.value = L.contrast; g.lift.value = L.lift;
    g.shadowTint.value.set(...L.shadowTint); g.highTint.value.set(...L.highTint); g.maskPass.value = 0;
    r.setRenderTarget(null); r.render(this.qGrade.s, this.qCam);
  }
  /** after render(): draw the plate's front layer (graded pixels where a front object is) into a 2-D context */
  drawFront(ctx) {
    if (!this.hasFront) return;
    const r = this.renderer; this.qGrade.m.uniforms.maskPass.value = 1; r.setRenderTarget(null); r.setClearColor(0x000000, 0); r.clear(); r.render(this.qGrade.s, this.qCam);
    ctx.drawImage(this.canvas, 0, 0);
  }
  /** the circle of confusion (px) at a world point — the drawing is blurred by the same lens */
  cocAt(p) { const v = new T.Vector3(...p).applyMatrix4(this.camera.matrixWorldInverse), z = -v.z; return z > 0 ? Math.min(18, this.cocPx * Math.abs(1 - this.focus / z)) : 0; }
  /** world → stage px ([x, y, depth]); behind the camera → null */
  project(p) { const v = (p.isVector3 ? p.clone() : new T.Vector3(...p)).project(this.camera); if (v.z > 1 || v.z < -1) return null; return [(v.x + 1) / 2 * this.W, (1 - v.y) / 2 * this.H, v.z]; }
  depth(p) { const v = new T.Vector3(...p).applyMatrix4(this.camera.matrixWorldInverse); return -v.z; }
}

// ── built things ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** planar UVs in metres / tile on any geometry (x, z of the world plane by default) */
export function planarUV(geo, tile = 1, axes = 'xz', rot = 0) {
  const p = geo.attributes.position, uv = new Float32Array(p.count * 2), c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < p.count; i++) { const a = axes === 'xz' ? p.getX(i) : axes === 'xy' ? p.getX(i) : p.getZ(i), b = axes === 'xz' ? p.getZ(i) : p.getY(i); uv[i * 2] = (a * c - b * s) / tile; uv[i * 2 + 1] = (a * s + b * c) / tile; }
  geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setAttribute('uv1', new T.BufferAttribute(uv.slice(), 2)); return geo;
}
/** a rounded-rectangle shape */
export function roundRect(w, h, r) { const s = new T.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }

/** a café table: o = { at: [x, z], top: .74 (height), size: [w, d] | r (round), thick, edge (bevel), mat, legs: 'pedestal' | 'four', legMat, rot } */
export function buildTable(o) {
  const g = new T.Group(), top = o.top ?? .74, th = o.thick ?? .035, bev = o.edge ?? .012;
  const shape = o.r ? (() => { const s = new T.Shape(); s.absarc(0, 0, o.r, 0, Math.PI * 2, false); return s; })() : roundRect(o.size[0], o.size[1], o.corner ?? .03);
  const geo = new T.ExtrudeGeometry(shape, { depth: th - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 48 });
  geo.rotateX(-Math.PI / 2); geo.translate(0, top - th + bev, 0); planarUV(geo, o.mat.userData.tile || 1, 'xz', o.grain || 0);
  const slab = new T.Mesh(geo, o.mat); slab.castShadow = slab.receiveShadow = true; g.add(slab);
  const lm = o.legMat || new T.MeshStandardMaterial({ color: 0x1d1c1b, roughness: .45, metalness: .8 });
  if ((o.legs || 'pedestal') === 'pedestal') {
    const col = new T.Mesh(new T.CylinderGeometry(.028, .032, top - th, 24), lm); col.position.y = (top - th) / 2; const foot = new T.Mesh(new T.CylinderGeometry(.06, .24, .03, 48), lm); foot.position.y = .015;
    const cap = new T.Mesh(new T.CylinderGeometry(.16, .16, .015, 48), lm); cap.position.y = top - th - .008; for (const m of [col, foot, cap]) { m.castShadow = m.receiveShadow = true; g.add(m); }
  } else {
    const [w, d] = o.size; for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = new T.Mesh(new T.BoxGeometry(.045, top - th, .045), o.legWood ? o.mat : lm); l.position.set(sx * (w / 2 - .07), (top - th) / 2, sz * (d / 2 - .07)); l.castShadow = l.receiveShadow = true; g.add(l); }
  }
  g.position.set(o.at?.[0] || 0, 0, o.at?.[1] || 0); g.rotation.y = (o.rot || 0) * Math.PI / 180;
  g.userData.top = top; return g;
}
/** the ground: a disc of scanned surface that fades into the photographed ground of the backdrop */
export function buildGround(mat, o = {}) {
  const R = o.radius ?? 4, geo = new T.CircleGeometry(R, 96); geo.rotateX(-Math.PI / 2); planarUV(geo, mat.userData.tile || 2, 'xz', o.grain || 0);
  mat.transparent = true; mat.depthWrite = true;
  mat.onBeforeCompile = sh => {
    sh.uniforms.uR = { value: R }; sh.uniforms.uC = { value: new T.Vector2(o.at?.[0] || 0, o.at?.[1] || 0) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vW; uniform float uR; uniform vec2 uC;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.a *= 1. - smoothstep(uR * .45, uR * .98, length(vW.xz - uC));');
  };
  const m = new T.Mesh(geo, mat); m.position.set(o.at?.[0] || 0, o.y ?? .0005, o.at?.[1] || 0); m.receiveShadow = true; m.renderOrder = -5; return m;
}
/** the sketchbook: a page (paper tooth, a slight lift at the free corner) with a block of pages under it and spiral rings;
 *  o = { at: [x, y, z] (centre on the table), size: [w, d] (.21 × .297 A4), rot (deg), rings: true, tone, lift } */
export function buildSketchbook(o = {}) {
  const g = new T.Group(), [w, d] = o.size || [.21, .297], lift = o.lift ?? .004, block = o.block ?? .006;
  const pg = new T.PlaneGeometry(w, d, 32, 32); pg.rotateX(-Math.PI / 2); const p = pg.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / w + .5, z = p.getZ(i) / d + .5, k = Math.max(0, x - .6) / .4 * Math.max(0, z - .55) / .45; p.setY(i, block + .0004 + lift * k * k + .0006 * Math.sin(x * 9.0) * x); }
  pg.computeVertexNormals();
  const paper = new T.MeshStandardMaterial({ map: paperTexture(o.tone || '#f5f2ea'), roughness: .92, metalness: 0, side: T.DoubleSide });
  paper.map.repeat.set(w / .2, d / .2);
  const page = new T.Mesh(pg, paper); page.receiveShadow = true; page.castShadow = true; g.add(page);
  const bm = new T.MeshStandardMaterial({ color: 0xe9e4d8, roughness: .95 }), cover = new T.MeshStandardMaterial({ color: o.cover || 0x2b2a28, roughness: .7 });
  const blk = new T.Mesh(new T.BoxGeometry(w * .995, block, d * .995), [bm, bm, bm, bm, bm, bm]); blk.position.y = block / 2 + .001; blk.castShadow = blk.receiveShadow = true; g.add(blk);
  const cv = new T.Mesh(new T.BoxGeometry(w * 1.01, .0015, d * 1.01), cover); cv.position.y = .00075; cv.receiveShadow = true; g.add(cv);
  if (o.rings !== false) {
    const rm = new T.MeshStandardMaterial({ color: 0xb9bcc0, roughness: .25, metalness: 1 }), n = Math.round(d / .0085);
    for (let i = 0; i < n; i++) { const t = new T.Mesh(new T.TorusGeometry(.0042, .0006, 6, 16, Math.PI * 1.35), rm); t.rotation.set(0, Math.PI / 2, Math.PI * .82); t.position.set(-w / 2 - .0005, block * .55, -d / 2 + (i + .5) * d / n); t.castShadow = true; g.add(t); }
  }
  g.position.set(...(o.at || [0, .74, 0])); g.rotation.y = (o.rot || 0) * Math.PI / 180;
  g.userData.surfaceY = (o.at ? o.at[1] : .74) + block + .0004; g.userData.size = [w, d]; g.userData.page = page;
  return g;
}
/** a real pencil, tip at the local origin pointing down −y… built along +y from the tip: o = { len: .175, colour, eraser } */
export function buildPencil(o = {}) {
  const g = new T.Group(), L = o.len ?? .175, R = .0037, cone = .018, lead = .004;
  const paint = new T.MeshPhysicalMaterial({ color: new T.Color(o.colour || '#2f4f3a'), roughness: .32, clearcoat: .7, clearcoatRoughness: .25, metalness: 0 });
  const woodC = cnv(64, 256), wx = woodC.getContext('2d'); for (let y = 0; y < 256; y++) { const v = 196 + 20 * Math.sin(y * .35 + Math.sin(y * .05) * 3); wx.fillStyle = `rgb(${v},${v * .78 | 0},${v * .55 | 0})`; wx.fillRect(0, y, 64, 1); }
  const wt = new T.CanvasTexture(woodC); wt.colorSpace = T.SRGBColorSpace;
  const wood = new T.MeshStandardMaterial({ map: wt, roughness: .75 }), graphite = new T.MeshStandardMaterial({ color: 0x2b2b2e, roughness: .38, metalness: .55 });
  const body = new T.Mesh(new T.CylinderGeometry(R, R, L - cone - .02, 6, 1), paint); body.position.y = cone + (L - cone - .02) / 2; g.add(body);
  const cw = new T.Mesh(new T.CylinderGeometry(R * .98, .0009, cone - lead, 24, 1, true), wood); cw.position.y = lead + (cone - lead) / 2; g.add(cw);
  const tip = new T.Mesh(new T.CylinderGeometry(.0009, .0002, lead, 12), graphite); tip.position.y = lead / 2; g.add(tip);
  const fer = new T.Mesh(new T.CylinderGeometry(R * 1.04, R * 1.04, .011, 24), new T.MeshStandardMaterial({ color: 0xc8b46a, roughness: .3, metalness: 1 })); fer.position.y = L - .02 + .0055; g.add(fer);
  const er = new T.Mesh(new T.CylinderGeometry(R * .98, R * .98, .009, 24), new T.MeshStandardMaterial({ color: new T.Color(o.eraser || '#e59a95'), roughness: .85 })); er.position.y = L - .0045; g.add(er);
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.userData.len = L; return g;
}

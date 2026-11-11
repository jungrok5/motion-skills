// kinetic-type-collage · type.js — type as geometry the camera can fly through.
// A string is drawn once on a 2D canvas with a bundled font, turned into a signed distance field, and shown on a plane
// with a shader that cuts the edge from that field. The edge stays sharp when one glyph is three frames wide, the plane
// writes depth (objects pass in front of and behind letters), and outline, label box and pixel type come from the same field.
import * as THREE from 'three';

const BASE = new URL('./fonts/', import.meta.url).href;
// family, file, descriptors — loaded only when a film uses the face
const FACE = {
  inter900: ['KTC Inter', 'Inter-900.woff2', { weight: '900' }],
  inter900i: ['KTC Inter', 'Inter-900i.woff2', { weight: '900', style: 'italic' }],
  inter500: ['KTC Inter', 'Inter-500.woff2', { weight: '500' }],
  inter400i: ['KTC Inter', 'Inter-400i.woff2', { weight: '400', style: 'italic' }],
  anton: ['KTC Anton', 'Anton-400.woff2', { weight: '400' }],
  notokr: ['KTC NotoKR', 'NotoSansKR-900-ksx1001.woff2', { weight: '900' }],
  blackhan: ['KTC BlackHan', 'BlackHanSans-ksx1001.woff2', { weight: '400' }],
  myeongjo: ['KTC Myeongjo', 'NanumMyeongjo-800-ksx1001.woff2', { weight: '800' }],
  brush: ['KTC Brush', 'NanumBrushScript-ksx1001.woff2', { weight: '400' }],
};
// the voices of the style (references/LOOK.md → Type). {px} is replaced by the raster size.
export const FONTS = {
  sans: { css: '900 {px}px "KTC Inter","KTC NotoKR"', faces: ['inter900', 'notokr'] },            // the heavy grotesque: most words
  italic: { css: 'italic 900 {px}px "KTC Inter","KTC NotoKR"', faces: ['inter900i', 'notokr'] }, // the shouted line
  cond: { css: '400 {px}px "KTC Anton","KTC BlackHan"', faces: ['anton', 'blackhan'] },           // tall condensed: bands, squeezes
  han: { css: '400 {px}px "KTC BlackHan"', faces: ['blackhan'] },                                   // Korean poster black
  serif: { css: '800 {px}px "KTC Myeongjo"', faces: ['myeongjo'] },                                 // the aside, in brackets
  brush: { css: '400 {px}px "KTC Brush"', faces: ['brush'] },                                       // one hand-written word
  text: { css: '500 {px}px "KTC Inter","KTC NotoKR"', faces: ['inter500', 'notokr'], px: 96 },      // captions, credits
  note: { css: 'italic 400 {px}px "KTC Inter","KTC NotoKR"', faces: ['inter400i', 'notokr'], px: 96 }, // light italic caption
};

// ---- exact Euclidean distance transform (Felzenszwalb & Huttenlocher), rows then columns
function edt1d(f, n, d, v, z, off, stride) {
  let k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
  for (let q = 1; q < n; q++) {
    const fq = f[off + q * stride]; let s;
    do { const r = v[k]; s = (fq + q * q - (f[off + r * stride] + r * r)) / (2 * q - 2 * r); } while (s <= z[k] && --k > -1);
    k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const r = v[k]; d[q] = (q - r) * (q - r) + f[off + r * stride]; }
  for (let q = 0; q < n; q++) f[off + q * stride] = d[q];
}
function edt(g, W, H) {
  const n = Math.max(W, H), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < W; x++) edt1d(g, H, d, v, z, x, W);
  for (let y = 0; y < H; y++) edt1d(g, W, d, v, z, y * W, 1);
}
// alpha (0–255, antialiased coverage) → field: 0.5 on the edge, 1 deep inside, 0 at `radius` px outside
function sdf(alpha, W, H, radius) {
  const N = W * H, out = new Float64Array(N), inn = new Float64Array(N), INF = 1e20;
  for (let i = 0; i < N; i++) {
    const a = alpha[i] / 255;
    if (a >= 1) { out[i] = 0; inn[i] = INF; } else if (a <= 0) { out[i] = INF; inn[i] = 0; } else { const d = 0.5 - a; out[i] = d > 0 ? d * d : 0; inn[i] = d < 0 ? d * d : 0; }
  }
  edt(out, W, H); edt(inn, W, H);
  const r = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const d = Math.sqrt(out[i]) - Math.sqrt(inn[i]); r[i] = Math.max(0, Math.min(255, Math.round(255 * (0.5 - d / (2 * radius))))); }
  return r;
}

const VERT = `varying vec2 vUv; void main(){ vUv = vec2(uv.x, 1.0 - uv.y); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = `
uniform sampler2D map; uniform vec3 uColor; uniform vec4 uBox; uniform vec4 uBoxUV; uniform float uOutline;
varying vec2 vUv;
void main(){
  float d = texture2D(map, vUv).r;
  float aa = clamp(fwidth(d) * 0.75, 0.0005, 0.25);
  float a = smoothstep(0.5 - aa, 0.5 + aa, d);
  if (uOutline > 0.0) a *= 1.0 - smoothstep(0.5 + uOutline - aa, 0.5 + uOutline + aa, d);
  vec4 c = vec4(uColor, a);
  if (uBox.a > 0.0) {
    vec2 f = fwidth(vUv) * 0.75;
    vec2 e = smoothstep(uBoxUV.xy - f, uBoxUV.xy + f, vUv) * (1.0 - smoothstep(uBoxUV.zw - f, uBoxUV.zw + f, vUv));
    c = vec4(mix(uBox.rgb, uColor, a), e.x * e.y);
  }
  if (c.a < 0.03) discard;
  gl_FragColor = c;
  #include <colorspace_fragment>
}`;
const PLANE = new THREE.PlaneGeometry(1, 1);

export class Typesetter {
  constructor(extra = {}) {
    this.fonts = { ...FONTS };
    this.loaded = new Set(); this.wanted = new Set(); this.cache = new Map(); this.failed = [];
    for (const [k, f] of Object.entries(extra)) this.fonts[k] = f;   // { css, files: [[family, url, descriptors]] } — url relative to the page
    this.cv = document.createElement('canvas'); this.g = this.cv.getContext('2d', { willReadFrequently: true });
  }
  css(key, px) { const f = this.fonts[key]; if (!f) throw new Error(`unknown font "${key}" (fonts: ${Object.keys(this.fonts).join(', ')})`); this.wanted.add(key); return f.css.replace('{px}', px); }
  // load every face the wanted fonts need; returns true if anything new was loaded
  async load() {
    const jobs = [];
    for (const key of this.wanted) {
      const f = this.fonts[key];
      const list = [...(f.faces || []).map((n) => [FACE[n][0], BASE + FACE[n][1], FACE[n][2]]), ...(f.files || []).map(([fam, url, d]) => [fam, new URL(url, location.href).href, d || {}])];
      for (const [fam, url, d] of list) {
        const id = fam + '|' + url; if (this.loaded.has(id)) continue; this.loaded.add(id);
        jobs.push(new FontFace(fam, `url("${url}")`, d).load().then((ff) => document.fonts.add(ff), (e) => this.failed.push(`${fam} (${url}): ${e.message}`)));
      }
    }
    await Promise.all(jobs); return jobs.length > 0;
  }
  // one string (may contain \n) → { tex, W, H, px, pad, ink: {x0,y0,w,h} in em from the origin (x right, y down; origin = pen start / line centre, first baseline), adv }
  record(text, font = 'sans', { px, track = 0, lh = 1.02, align = 'center', pad = 0, pixel = 0 } = {}) {
    px = px || this.fonts[font]?.px || 192;
    const key = [text, font, px, track, lh, align, pad, pixel].join('|');
    if (this.cache.has(key)) return this.cache.get(key);
    const g = this.g, lines = String(text).split('\n');
    let rpx = pixel ? pixel : px;   // pixel type: raster at `pixel` px per em, then blow each pixel up to a block
    const measure = () => {
      g.font = this.css(font, rpx); g.textBaseline = 'alphabetic'; g.textAlign = 'left'; if ('letterSpacing' in g) g.letterSpacing = `${track * rpx}px`;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, adv = 0; const rows = [];
      lines.forEach((s, i) => {
        const m = g.measureText(s), w = m.width - (track > 0 ? track * rpx : 0), xo = align === 'center' ? -w / 2 : align === 'right' ? -w : 0, y = i * lh * rpx;
        rows.push([s, xo, y]); adv = Math.max(adv, w);
        if (!s.trim()) return;
        x0 = Math.min(x0, xo - m.actualBoundingBoxLeft); x1 = Math.max(x1, xo + m.actualBoundingBoxRight);
        y0 = Math.min(y0, y - m.actualBoundingBoxAscent); y1 = Math.max(y1, y + m.actualBoundingBoxDescent);
      });
      if (x0 > x1) { x0 = 0; x1 = 1; y0 = -1; y1 = 0; }
      return { x0: Math.floor(x0), x1: Math.ceil(x1), y0: Math.floor(y0), y1: Math.ceil(y1), adv, rows };
    };
    let m = measure();
    if (!pixel) { const big = Math.max(m.x1 - m.x0, m.y1 - m.y0); if (big > 3600) { rpx = px = Math.floor((px * 3600) / big); m = measure(); } }
    const k = pixel ? Math.max(2, Math.round(px / pixel)) : 1, epx = rpx * k;                    // px per em in the final canvas
    const radius = Math.max(6, Math.round(epx * 0.1)), P = Math.max(radius + 2, Math.ceil(pad * epx) + 2);
    const iw = (m.x1 - m.x0) * k, ih = (m.y1 - m.y0) * k, W = iw + 2 * P, H = ih + 2 * P;
    let alpha;
    if (!pixel) {
      this.cv.width = W; this.cv.height = H; g.font = this.css(font, rpx); g.textBaseline = 'alphabetic'; g.textAlign = 'left'; if ('letterSpacing' in g) g.letterSpacing = `${track * rpx}px`;
      g.clearRect(0, 0, W, H); g.fillStyle = '#000';
      for (const [s, xo, y] of m.rows) g.fillText(s, P - m.x0 + xo, P - m.y0 + y);
      const d = g.getImageData(0, 0, W, H).data; alpha = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) alpha[i] = d[i * 4 + 3];
    } else {
      const sw = m.x1 - m.x0, sh = m.y1 - m.y0; this.cv.width = sw; this.cv.height = sh; g.font = this.css(font, rpx); g.textBaseline = 'alphabetic'; g.textAlign = 'left'; if ('letterSpacing' in g) g.letterSpacing = `${track * rpx}px`;
      g.clearRect(0, 0, sw, sh); g.fillStyle = '#000';
      for (const [s, xo, y] of m.rows) g.fillText(s, -m.x0 + xo, -m.y0 + y);
      const d = g.getImageData(0, 0, sw, sh).data; alpha = new Uint8Array(W * H);
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) if (d[(y * sw + x) * 4 + 3] > 110) for (let j = 0; j < k; j++) alpha.fill(255, (P + y * k + j) * W + P + x * k, (P + y * k + j) * W + P + x * k + k);
    }
    const tex = new THREE.DataTexture(sdf(alpha, W, H, radius), W, H, THREE.RedFormat, THREE.UnsignedByteType);
    tex.unpackAlignment = 1; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 8; tex.needsUpdate = true;
    const rec = { tex, W, H, px: epx, pad: P, radius, adv: (m.adv * k) / epx, ink: { x0: (m.x0 * k) / epx, y0: (m.y0 * k) / epx, w: iw / epx, h: ih / epx } };
    this.cache.set(key, rec); return rec;
  }
  // advance widths without rasterising (layout of single characters)
  advance(ch, font, px = 192, track = 0) { const g = this.g; g.font = this.css(font, px); if ('letterSpacing' in g) g.letterSpacing = '0px'; return g.measureText(ch).width / px + track; }
  material(rec, color, { box = null, boxPad = [0, 0], outline = 0 } = {}) {
    const u = { map: { value: rec.tex }, uColor: { value: color.clone() }, uBox: { value: new THREE.Vector4(0, 0, 0, 0) }, uBoxUV: { value: new THREE.Vector4(0, 0, 1, 1) }, uOutline: { value: 0 } };
    if (box) { u.uBox.value.set(box.r, box.g, box.b, 1); const bx = boxPad[0] * rec.px, by = boxPad[1] * rec.px; u.uBoxUV.value.set((rec.pad - bx) / rec.W, (rec.pad - by) / rec.H, (rec.W - rec.pad + bx) / rec.W, (rec.H - rec.pad + by) / rec.H); }
    if (outline) u.uOutline.value = Math.min(0.45, (outline * rec.px) / (2 * rec.radius));
    return new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: true, side: THREE.DoubleSide });
  }
  // a mesh for a record at em size s, placed so the record's origin is the parent's origin
  mesh(rec, s, mat) {
    const m = new THREE.Mesh(PLANE, mat), w = rec.W / rec.px, h = rec.H / rec.px, p = rec.pad / rec.px;
    m.scale.set(w * s, h * s, 1); m.position.set((rec.ink.x0 - p + w / 2) * s, -(rec.ink.y0 - p + h / 2) * s, 0);
    return m;
  }
}

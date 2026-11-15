// colored-pencil-world · pencil.js — coloured pencil, made in code.
//
// Adapted from Blendi's "Coloured pencil" (https://patch.gg/blendi/coloured-pencil, src/pencil.js, MIT © 2026 Patch,
// licence in LICENSE-coloured-pencil). What changed is in references/SOURCE.md: the pencils (sun yellow, shadow pencil,
// how hard each is pressed) are uniforms a world sets, and the batch merges without three's addons.
//
// A pencil drawing is colour laid in strokes, lightly, in layers, on white paper: a touch of warm yellow where the sun
// is; the thing's own colour lightly all over; more of it in strokes pressed harder toward the shade; and a second,
// cool shadow pencil across those strokes where the light does not reach. The paper's tooth breaks every layer.
//
// Nothing is a filter over a finished picture. Every vertex carries a `hatch` attribute — two numbers that change
// smoothly over the surface — and strokes are drawn along their level lines, so they belong to the thing and stay put
// as it and the eye move. Only how many strokes are drawn follows the eye: they are kept about uPx pixels apart by
// drawing every stroke, every second, every fourth…, the ones between fading in as a thing comes nearer. No stroke
// slides along its surface or is swapped for another.
import * as THREE from 'three';

export const PENCIL = /* glsl */ `
uniform float uPx;      // how far apart the strokes are, in pixels of the drawing buffer
uniform vec3 uWarm;     // the sunlight pencil (a warm yellow)
uniform vec3 uShadow;   // the shadow pencil (a blue-violet)
uniform vec4 uPress;    // x: warm, y: own colour all over, z: strokes into the shade, w: shadow pencil
float pcHash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float pcHash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float pcNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(pcHash3(i), pcHash3(i + vec3(1, 0, 0)), f.x), mix(pcHash3(i + vec3(0, 1, 0)), pcHash3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(pcHash3(i + vec3(0, 0, 1)), pcHash3(i + vec3(1, 0, 1)), f.x), mix(pcHash3(i + vec3(0, 1, 1)), pcHash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// the tooth of the paper as the thing meets it: 0 a valley the wax skips, 1 a height it catches on (evened out far off)
float pcTooth(vec3 at) {
  float fine = length(fwidth(at));
  return mix(0.5, pcNoise(at * 19.0), clamp(1.0 - fine * 14.0, 0.0, 1.0)) * 0.6 + mix(0.5, pcNoise(at * 47.0 + 5.0), clamp(1.0 - fine * 35.0, 0.0, 1.0)) * 0.4;
}
// one soft stroke W pixels wide, d pixels from its middle
float pcStroke(float W, float d) { return smoothstep(W * 0.5 + 1.0, W * 0.5 - 1.0, d) * min(1.0, W * 0.6); }
// a layer of strokes along the level lines of h, covering "cover" of the paper: how much wax, 0 to 1
float pcStrokes(float h, float cover) {
  float g = length(vec2(dFdx(h), dFdy(h))) + 1e-9;
  float k = -log2(g * uPx), kf = floor(k), t = k - kf, s = exp2(kf), P = 1.0 / (g * s), x = h * s;
  float ic = floor(x + 0.5), im = floor(x) + 0.5;
  float W = cover * P / (1.0 + t) * 1.3;
  float a = pcStroke(W * (0.65 + 0.7 * pcHash(ic / s + 3.7)), abs(x - ic) * P) * (0.55 + 0.45 * pcHash(ic / s));
  float b = pcStroke(W * t * (0.65 + 0.7 * pcHash(im / s + 3.7)), abs(x - im) * P) * (0.55 + 0.45 * pcHash(im / s));
  return max(a, b);
}
// what is left of the paper's white once a thing is drawn. local: its own pencil; D: 0 in the light … 1 in the dark
vec3 pcDraw(vec3 local, float D, vec2 h, vec3 at) {
  float tooth = pcTooth(at);
  vec2 wob = vec2(0.012 * sin(at.x * 5.0 + at.y * 3.0) + 0.01 * sin(at.z * 6.3 - at.y * 4.1), 0.012 * sin(at.z * 4.6 + at.x * 2.7) + 0.01 * sin(at.y * 5.9 + at.x * 3.3));
  vec3 shade = mix(local * 0.5, uShadow, 0.55);
  vec3 left = vec3(1.0);
  left *= mix(vec3(1.0), uWarm, clamp((1.0 - smoothstep(0.0, 0.4, D)) * 0.34 * uPress.x * (0.45 + 0.9 * tooth), 0.0, 1.0));
  left *= mix(vec3(1.0), local, clamp((0.36 + 0.45 * smoothstep(0.0, 0.7, D)) * uPress.y * (0.5 + 0.85 * tooth), 0.0, 1.0));
  left *= mix(vec3(1.0), local, clamp(pcStrokes(h.x + wob.x, 0.45 + 0.4 * D) * (0.62 + 0.5 * D) * uPress.z * (0.55 + 0.8 * tooth), 0.0, 1.0));
  left *= mix(vec3(1.0), shade, clamp(pcStrokes(h.y + wob.y, clamp((D - 0.24) * 1.35, 0.0, 0.82)) * (0.5 + 0.75 * tooth) * 0.95 * uPress.w, 0.0, 1.0));
  return left;
}`;

const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Color();
/** The default slant: the hatching of a right hand. */
export const SLANT = { a: [0.62, 1, 0.34], b: [-0.78, 1, 0.22] };
/** A piece's strokes as two flat slicings: they lie where planes square to `a` (and, in shade, to `b`) cut it. */
export function field(g, a = SLANT.a, b = SLANT.b) {
  A.set(...a).normalize(); B.set(...b).normalize();
  const p = g.attributes.position, h = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { h[i * 2] = p.getX(i) * A.x + p.getY(i) * A.y + p.getZ(i) * A.z; h[i * 2 + 1] = p.getX(i) * B.x + p.getY(i) * B.y + p.getZ(i) * B.z; }
  g.setAttribute('hatch', new THREE.BufferAttribute(h, 2));
  return g;
}
/** A piece's strokes from any rule: fn(x, y, z, i) → [h1, h2] (metres-ish: only the level lines matter). */
export function fieldBy(g, fn) {
  const p = g.attributes.position, h = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) h.set(fn(p.getX(i), p.getY(i), p.getZ(i), i), i * 2);
  g.setAttribute('hatch', new THREE.BufferAttribute(h, 2));
  return g;
}
/** Which pencil a piece is drawn with: a colour, or fn(x, y, z, i, nx, ny, nz) → a colour. */
export function hue(g, value) {
  const p = g.attributes.position, n = g.attributes.normal, c = new Float32Array(p.count * 3);
  if (typeof value !== 'function') C.set(value);
  for (let i = 0; i < p.count; i++) {
    if (typeof value === 'function') C.set(value(p.getX(i), p.getY(i), p.getZ(i), i, n?.getX(i) ?? 0, n?.getY(i) ?? 1, n?.getZ(i) ?? 0));
    c[i * 3] = C.r; c[i * 3 + 1] = C.g; c[i * 3 + 2] = C.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

/** The pencils of one world. o: { px (stroke spacing in px at 1080 lines), warm, shadow, press: [warm, all over, strokes, shadow] } */
export function createPencil(o = {}) {
  const u = {
    uPx: { value: o.px ?? 4.6 },
    uWarm: { value: new THREE.Color(o.warm || '#fff08f') },
    uShadow: { value: new THREE.Color(o.shadow || '#3d339e') },
    uPress: { value: new THREE.Vector4(...(o.press || [1, 1, 1, 1])) },
  };
  /** A material that draws what it is on in coloured pencil. flat: one even line of its colour (a string, smoke). */
  const make = ({ side = THREE.FrontSide, flat = false } = {}) => {
    const m = new THREE.MeshLambertMaterial({ vertexColors: true, side, depthWrite: !flat });
    m.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, u);
      s.vertexShader = 'attribute vec2 hatch; varying vec2 vHatch; varying vec3 vAt;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vHatch = hatch; vAt = position;');
      s.fragmentShader = 'varying vec2 vHatch; varying vec3 vAt;\n' + PENCIL + '\n' + s.fragmentShader.replace('#include <opaque_fragment>', flat ? 'gl_FragColor = vec4(mix(vec3(1.0), diffuseColor.rgb, 0.8), 1.0);'
        : 'float pcLit = dot(outgoingLight, vec3(0.3333)) / max(dot(diffuseColor.rgb, vec3(0.3333)), 0.03);\n  gl_FragColor = vec4(pcDraw(diffuseColor.rgb, 1.0 - clamp(pow(pcLit, 0.8), 0.0, 1.0), vHatch, vAt), 1.0);');
    };
    m.customProgramCacheKey = () => (flat ? 'pencil-flat' : side === THREE.DoubleSide ? 'pencil-both' : 'pencil');
    return m;
  };
  return { u, px: u.uPx, make, line: make(), both: make({ side: THREE.DoubleSide }), flat: make({ flat: true, side: THREE.DoubleSide }) };
}

/** Joins non-indexed geometries that carry the same attributes into one. */
export function merge(parts) {
  const names = Object.keys(parts[0].attributes), out = new THREE.BufferGeometry();
  for (const n of names) {
    const size = parts[0].attributes[n].itemSize, total = parts.reduce((a, g) => a + g.attributes[n].count, 0), arr = new Float32Array(total * size);
    let o = 0; for (const g of parts) { arr.set(g.attributes[n].array, o); o += g.attributes[n].array.length; }
    out.setAttribute(n, new THREE.BufferAttribute(arr, size));
  }
  return out;
}

/** Collects pieces and makes one mesh of them. add(g, colour, a, b): colour is its pencil (or fn), a/b its slant (field). */
export function createBatch(material) {
  const parts = [];
  return {
    add(g, colour = '#cccccc', a, b) {
      if (g.index) g = g.toNonIndexed();
      for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'color', 'hatch'].includes(n)) g.deleteAttribute(n);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.hatch) field(g, a, b);
      if (!g.attributes.color) hue(g, colour);
      parts.push(g);
      return g;
    },
    build() {
      const mesh = new THREE.Mesh(merge(parts), material);
      mesh.castShadow = mesh.receiveShadow = !!material.depthWrite;
      if (!material.depthWrite) mesh.renderOrder = 10;
      mesh.geometry.computeBoundingSphere();
      return mesh;
    },
    get count() { return parts.length; },
    get vertices() { return parts.reduce((a, g) => a + g.attributes.position.count, 0); },
  };
}

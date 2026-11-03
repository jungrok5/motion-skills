// cartoon-3d-short · post.js — the picture chain, in this order (every pixel size is given at 1080x1920 and scaled
// with the output height, so a --scale .5 still and the 2K final look the same):
//   scene (MSAA 4, HalfFloat, depth texture)
//   → ink    world-only outline pass: depth jumps + normal creases → near-black lines, fog-tinted far away.
//            Characters, effect cards, sky and clouds live on layer NOINK and are never outlined (they carry their own ink).
//   → lens   thin-lens depth of field, two deterministic gather passes (12-tap pre + 40-tap main + 20-tap near field)
//   → bloom  only HDR emissives (threshold 1.0): lamps, sun disc, lit windows
//   → tone   Khronos PBR Neutral, then the display-referred grade (curve, zone saturation, split tone, vignette)
//   → flash / crossfade
// The ink, lens and grade shaders are ported from mromidev/claude-animated-shorts templates/bridge/ink.ts, lensblur.ts
// and grade.ts (MIT, (c) 2026 Mr omi), where they were measured against the reference; the pass plumbing is ours
// (plain three.js, no postprocessing library).
import * as THREE from "three";
import { KX } from "./look.js";

/** layer for things that must never get world ink (billboards, effect cards, sky, clouds, smoke) */
export const NOINK = 3;

const VERT = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

// ---------------- ink ----------------
const NORMAL_VERT = /* glsl */ `
#include <common>
uniform mat3 cutUv;
varying vec3 vN; varying vec3 vV; varying vec2 vCut;
void main() {
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  vN = transformedNormal;
  vCut = (cutUv * vec3(uv, 1.0)).xy;
  #include <begin_vertex>
  #include <project_vertex>
  vV = mvPosition.xyz;
}`;
const NORMAL_FRAG = /* glsl */ `
uniform sampler2D tCut; uniform float cut;
varying vec3 vN; varying vec3 vV; varying vec2 vCut;
void main() {
  if (cut > 0.0 && texture2D(tCut, vCut).a < cut) discard;
  vec3 n;
  if (dot(vN, vN) < 1e-8) n = normalize(cross(dFdx(vV), dFdy(vV)));
  else n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
  gl_FragColor = vec4(n, 1.0);
}`;
const MASK_FRAG = /* glsl */ `
#include <packing>
uniform sampler2D tNormal; uniform sampler2D tDepth; uniform sampler2D tMainDepth;
uniform vec2 texel; uniform float cNear; uniform float cFar; uniform float p00; uniform float p11;
uniform float wNear; uniform float wFar; uniform float dNear; uniform float dFar; uniform float creaseScale;
uniform float depthLo; uniform float depthHi; uniform float cosLo; uniform float cosHi; uniform float concaveGain;
uniform float farOpacity; uniform float fadeNear; uniform float fadeFar; uniform float strength; uniform float pxScale;
uniform vec2 fogRange; uniform float fogStart;
varying vec2 vUv;
const vec2 STEP[4] = vec2[4](vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(1.0, 1.0), vec2(1.0, -1.0));
const float SLEN[4] = float[4](1.0, 1.0, 1.41421, 1.41421);
#define RMAX 9
float dist(sampler2D t, vec2 uv) { return -perspectiveDepthToViewZ(textureLod(t, uv, 0.0).x, cNear, cFar); }
vec3 viewPos(vec2 uv, float d) { vec2 n = uv * 2.0 - 1.0; return vec3(n.x * d / p00, n.y * d / p11, -d); }
float crease(vec3 n0, vec3 P0, float zc, vec2 uq, float zq) {
  vec4 nq = textureLod(tNormal, uq, 0.0);
  if (nq.a < 0.5 || abs(zq - zc) > zc * depthLo) return 0.0;
  float k = 1.0 - smoothstep(cosHi, cosLo, dot(n0, nq.xyz));
  if (dot(viewPos(uq, zq) - P0, n0) > 0.0) k *= concaveGain;
  return k;
}
void main() {
  vec4 nc = textureLod(tNormal, vUv, 0.0);
  if (nc.a < 0.5) { gl_FragColor = vec4(0.0); return; }
  float zc = dist(tDepth, vUv);
  // characters / cards in front of this world pixel: no world ink over them
  float zm = dist(tMainDepth, vUv);
  zm = min(zm, dist(tMainDepth, vUv + vec2(texel.x, 0.0))); zm = min(zm, dist(tMainDepth, vUv - vec2(texel.x, 0.0)));
  zm = min(zm, dist(tMainDepth, vUv + vec2(0.0, texel.y))); zm = min(zm, dist(tMainDepth, vUv - vec2(0.0, texel.y)));
  if (zm < zc * 0.985 - 0.03) { gl_FragColor = vec4(0.0); return; }
  float t = clamp(log(zc / dNear) / log(dFar / dNear), 0.0, 1.0);
  float w = mix(wNear, wFar, t) * pxScale, hc = 0.5 * w * creaseScale, Wc = 1.0 / zc;
  vec3 n0 = nc.xyz, P0 = viewPos(vUv, zc);
  float eD = 0.0, eN = 0.0;
  for (int a = 0; a < 4; a++) {
    for (int r = 1; r <= RMAX; r++) {
      vec2 o = STEP[a] * texel * float(r);
      float d = (float(r) - 0.5) * SLEN[a];
      float cw = clamp(w + 0.5 - d, 0.0, 1.0), ch = clamp(hc + 0.5 - d, 0.0, 1.0);
      if (cw <= 0.0 && ch <= 0.0) break;
      float z1 = dist(tDepth, vUv - o), z2 = dist(tDepth, vUv + o);
      float s = (1.0 / z1 + 1.0 / z2 - 2.0 * Wc) / Wc;                 // 2nd difference of 1/z: 0 on any plane
      eD = max(eD, smoothstep(depthLo, depthHi, -s) * cw);
      if (ch > 0.0) eN = max(eN, max(crease(n0, P0, zc, vUv - o, z1), crease(n0, P0, zc, vUv + o, z2)) * ch);
    }
  }
  float ink = max(eD, eN) * strength * mix(1.0, farOpacity, t) * (1.0 - smoothstep(fadeNear, fadeFar, zc));
  float f0 = max(fogRange.x, fogStart);
  float fogK = fogRange.y > f0 ? clamp((zc - f0) / (fogRange.y - f0), 0.0, 1.0) : 0.0;
  gl_FragColor = vec4(ink, fogK, 0.0, 1.0);
}`;
const INKCOMP_FRAG = /* glsl */ `
uniform sampler2D tColor; uniform sampler2D tMask; uniform vec2 texel; uniform vec3 inkColor; uniform vec3 fogColor; uniform float fogInk;
varying vec2 vUv;
float m(float x, float y) { return texture2D(tMask, vUv + vec2(x, y) * texel).r; }
void main() {
  float a = (4.0 * m(0.0, 0.0) + 2.0 * (m(1.0, 0.0) + m(-1.0, 0.0) + m(0.0, 1.0) + m(0.0, -1.0))
    + m(1.0, 1.0) + m(-1.0, 1.0) + m(1.0, -1.0) + m(-1.0, -1.0)) / 16.0;          // tent filter = anti-aliasing
  vec4 c = texture2D(tColor, vUv);
  float fk = texture2D(tMask, vUv).g;
  fk = max(fk, max(texture2D(tMask, vUv + vec2(texel.x, 0.0)).g, texture2D(tMask, vUv - vec2(texel.x, 0.0)).g));
  vec3 inkC = mix(inkColor, fogColor, fk * fogInk);
  vec3 g = pow(max(c.rgb, 0.0), vec3(1.0 / 2.2));                                // blend in display gamma like Canvas2D
  gl_FragColor = vec4(pow(mix(g, pow(inkC, vec3(1.0 / 2.2)), a), vec3(2.2)), c.a);
}`;

// ---------------- lens blur ----------------
const LENS_FRAG = /* glsl */ `
#include <packing>
uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 texel; uniform float cNear; uniform float cFar;
uniform float focus; uniform float cInf; uniform float nearScale; uniform float maxCoC; uniform float pxScale;
varying vec2 vUv;
#define GOLDEN 2.39996323
float distAt(vec2 uv) { return -perspectiveDepthToViewZ(textureLod(tDepth, uv, 0.0).x, cNear, cFar); }
float cocAt(float d) {
  float c = cInf * pxScale * (1.0 - focus / max(d, 1e-3));
  if (c < 0.0) c *= nearScale;
  return clamp(c, -maxCoC * pxScale, maxCoC * pxScale);
}
void main() {
  vec4 c0 = texture2D(tColor, vUv);
  if (cInf < 0.25) { gl_FragColor = c0; return; }
  float d0 = distAt(vUv), r0 = abs(cocAt(d0)), R = r0 * SPREAD;
  vec3 acc = c0.rgb; float wsum = 1.0;
  if (R > 0.5) {
    for (int i = 0; i < TAPS; i++) {
      float rr = sqrt((float(i) + 0.5) / float(TAPS)) * R, a = float(i) * GOLDEN + ROT;
      vec2 suv = vUv + vec2(cos(a), sin(a)) * rr * texel;
      float ds = distAt(suv), rs = abs(cocAt(ds)) * SPREAD;
      if (ds > d0) rs = min(rs, R);                // background never bleeds over a nearer pixel
      float w = clamp(rs - rr + 0.5, 0.0, 1.0);
      acc += texture2D(tColor, suv).rgb * w; wsum += w;
    }
  }
  vec3 col = acc / wsum;
#if NEAR_TAPS > 0
  float M = maxCoC * pxScale; vec3 fg = vec3(0.0); float fw = 0.0, cov = 0.0;
  for (int i = 0; i < NEAR_TAPS; i++) {
    float rr = sqrt((float(i) + 0.5) / float(NEAR_TAPS)) * M;
    if (rr <= R) continue;
    float a = float(i) * GOLDEN + 1.0;
    vec2 suv = vUv + vec2(cos(a), sin(a)) * rr * texel;
    float ds = distAt(suv);
    if (ds >= d0 * 0.97) continue;
    float rs = abs(cocAt(ds)), w = clamp(rs - rr + 0.5, 0.0, 1.0);
    fg += texture2D(tColor, suv).rgb * w; fw += w; cov += w * (M * M) / max(rs * rs, 1.0);
  }
  if (fw > 0.0) col = mix(col, fg / fw, clamp(cov / float(NEAR_TAPS), 0.0, 1.0));
#endif
  gl_FragColor = vec4(col, c0.a);
}`;

// ---------------- bloom ----------------
const BRIGHT_FRAG = `uniform sampler2D tColor; uniform float thr; varying vec2 vUv;
void main() { vec3 c = texture2D(tColor, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(thr, thr + 0.2, l) * (1.0 - thr / max(l, 1e-4) * 0.5), 1.0); }`;
const BLUR_FRAG = `uniform sampler2D tColor; uniform vec2 dir; varying vec2 vUv;
void main() { vec3 s = texture2D(tColor, vUv).rgb * 0.2270;
  s += (texture2D(tColor, vUv + dir * 1.3846).rgb + texture2D(tColor, vUv - dir * 1.3846).rgb) * 0.3162;
  s += (texture2D(tColor, vUv + dir * 3.2308).rgb + texture2D(tColor, vUv - dir * 3.2308).rgb) * 0.0703;
  gl_FragColor = vec4(s, 1.0); }`;

// ---------------- tone map + grade + flash ----------------
const FINAL_FRAG = /* glsl */ `
uniform sampler2D tColor; uniform sampler2D tB0; uniform sampler2D tB1; uniform sampler2D tB2; uniform sampler2D tB3;
uniform float bloom; uniform float exposure;
uniform float gradeKy[7]; uniform float gradeKm[7]; uniform vec3 gradeSat; uniform vec3 gradeTintS; uniform vec3 gradeTintM; uniform vec3 gradeTintH;
uniform vec2 gradeVig; uniform float gradeAmount; uniform vec3 flash; uniform float flashK;
varying vec2 vUv;
vec3 neutral(vec3 c) {
  float x = min(c.r, min(c.g, c.b)), off = x < 0.08 ? x - 6.25 * x * x : 0.04;
  c -= off; float peak = max(c.r, max(c.g, c.b)), S = 0.76;
  if (peak < S) return c;
  float d = 1.0 - S, np = 1.0 - d * d / (peak + d - S);
  c *= np / peak; float g = 1.0 - 1.0 / (0.15 * (peak - np) + 1.0);
  return mix(c, vec3(np), g);
}
vec3 enc(vec3 c) { c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }
float herm(float v, float x0, float x1, float y0, float y1, float m0, float m1) {
  float h = x1 - x0, t = (v - x0) / h, t2 = t * t, t3 = t2 * t;
  return (2.0 * t3 - 3.0 * t2 + 1.0) * y0 + (t3 - 2.0 * t2 + t) * h * m0 + (-2.0 * t3 + 3.0 * t2) * y1 + (t3 - t2) * h * m1;
}
float curve(float v) {
  v = clamp(v, 0.0, 1.0);
  if (v < 0.1) return herm(v, 0.0, 0.1, gradeKy[0], gradeKy[1], gradeKm[0], gradeKm[1]);
  if (v < 0.25) return herm(v, 0.1, 0.25, gradeKy[1], gradeKy[2], gradeKm[1], gradeKm[2]);
  if (v < 0.5) return herm(v, 0.25, 0.5, gradeKy[2], gradeKy[3], gradeKm[2], gradeKm[3]);
  if (v < 0.75) return herm(v, 0.5, 0.75, gradeKy[3], gradeKy[4], gradeKm[3], gradeKm[4]);
  if (v < 0.9) return herm(v, 0.75, 0.9, gradeKy[4], gradeKy[5], gradeKm[4], gradeKm[5]);
  return herm(v, 0.9, 1.0, gradeKy[5], gradeKy[6], gradeKm[5], gradeKm[6]);
}
void main() {
  vec3 c = texture2D(tColor, vUv).rgb * exposure;
  c += bloom * (texture2D(tB0, vUv).rgb * 0.35 + texture2D(tB1, vUv).rgb * 0.3 + texture2D(tB2, vUv).rgb * 0.22 + texture2D(tB3, vUv).rgb * 0.13);
  vec3 src = enc(neutral(c));
  vec3 g = vec3(curve(src.r), curve(src.g), curve(src.b));
  float y = dot(g, vec3(0.2126, 0.7152, 0.0722));
  float wS = 1.0 - smoothstep(0.0, 0.55, y), wH = smoothstep(0.45, 1.0, y), wM = 1.0 - wS - wH;
  float s = gradeSat.y + (gradeSat.x - gradeSat.y) * wS + (gradeSat.z - gradeSat.y) * wH;
  g = vec3(y) + s * (g - vec3(y));
  g += wS * gradeTintS + wM * gradeTintM + wH * gradeTintH;
  float r = length(vUv * 2.0 - 1.0) * 0.70710678;
  g *= 1.0 - gradeVig.x * smoothstep(gradeVig.y, 1.0, r);
  g = mix(src, clamp(g, 0.0, 1.0), gradeAmount);
  gl_FragColor = vec4(mix(g, flash, flashK), 1.0);                                // display-encoded output
}`;
const MIX_FRAG = `uniform sampler2D tA; uniform sampler2D tB; uniform float k; uniform vec3 flash; uniform float flashK; varying vec2 vUv;
void main() { vec3 c = mix(texture2D(tA, vUv).rgb, texture2D(tB, vUv).rgb, k); gl_FragColor = vec4(mix(c, flash, flashK), 1.0); }`;

const E_CB = [0.0, -0.18733, 1.8556], E_CR = [1.5748, -0.46813, 0.0];
const tintRGB = ([cb, cr]) => new THREE.Vector3(cb * E_CB[0] + cr * E_CR[0], cb * E_CB[1] + cr * E_CR[1], cb * E_CB[2] + cr * E_CR[2]);
/** Fritsch-Carlson monotone tangents for the 7 grade knots */
export function monoTangents(ky) {
  const n = KX.length, h = [], d = [], m = new Array(n).fill(0);
  for (let k = 0; k < n - 1; k++) { h.push(KX[k + 1] - KX[k]); d.push((ky[k + 1] - ky[k]) / h[k]); }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let k = 1; k < n - 1; k++) {
    if (d[k - 1] * d[k] <= 0) { m[k] = 0; continue; }
    const w1 = 2 * h[k] + h[k - 1], w2 = h[k] + 2 * h[k - 1];
    m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k]);
  }
  return m;
}

const rt = (w, h, o = {}) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false, depthBuffer: false, ...o });

export class Post {
  /** opts.ink / lens / bloom / grade false switch a stage off (debug: ?post=noink,nolens …) */
  constructor(renderer, W, H, opts = {}) {
    this.r = renderer; this.W = W; this.H = H; this.on = { ink: true, lens: true, bloom: true, grade: true, ...opts };
    this.ink = { widthNear: 5.1, widthFar: 3.3, distNear: 6, distFar: 90, creaseScale: 0.8, depthLo: 0.01, depthHi: 0.03, angleLo: 35, angleHi: 50,
      concaveGain: 0.7, farOpacity: 0.95, fadeNear: 150, fadeFar: 450, color: "#030303", fogInk: 0.3 };
    const depth = () => new THREE.DepthTexture(W, H, THREE.UnsignedIntType);
    this.main = rt(W, H, { depthBuffer: true, samples: 4, depthTexture: depth() });
    this.world = rt(W, H, { depthBuffer: true, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthTexture: depth() });
    this.mask = rt(W, H, { type: THREE.UnsignedByteType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.a = rt(W, H); this.b = rt(W, H);
    this.layer = [rt(W, H, { type: THREE.UnsignedByteType }), rt(W, H, { type: THREE.UnsignedByteType })];
    this.blm = [2, 4, 8, 16].map((k) => [rt(Math.ceil(W / k), Math.ceil(H / k)), rt(Math.ceil(W / k), Math.ceil(H / k))]);
    const texel = new THREE.Vector2(1 / W, 1 / H), px = H / 1920;
    const fs = (frag, uniforms, defines = {}) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, defines, depthTest: false, depthWrite: false });
    this.normalMat = new THREE.ShaderMaterial({ vertexShader: NORMAL_VERT, fragmentShader: NORMAL_FRAG, side: THREE.DoubleSide,
      uniforms: { tCut: { value: null }, cut: { value: 0 }, cutUv: { value: new THREE.Matrix3() } } });
    this.normalMat.onBeforeRender = (_r, _s, _c, _g, object, group) => {   // alpha-tested world planes keep their cut-out
      const mat = object.material, src = Array.isArray(mat) ? mat[group?.materialIndex ?? 0] : mat, u = this.normalMat.uniforms;
      const map = src && src.alphaTest > 0 ? src.map : null;
      u.tCut.value = map; u.cut.value = map ? src.alphaTest : 0;
      if (map) { map.updateMatrix(); u.cutUv.value.copy(map.matrix); }
      this.normalMat.uniformsNeedUpdate = true;
    };
    this.maskMat = fs(MASK_FRAG, {
      tNormal: { value: this.world.texture }, tDepth: { value: this.world.depthTexture }, tMainDepth: { value: this.main.depthTexture },
      texel: { value: texel }, cNear: { value: 0.2 }, cFar: { value: 1500 }, p00: { value: 1 }, p11: { value: 1 },
      wNear: { value: 0 }, wFar: { value: 0 }, dNear: { value: 0 }, dFar: { value: 0 }, creaseScale: { value: 0 }, depthLo: { value: 0 }, depthHi: { value: 0 },
      cosLo: { value: 0 }, cosHi: { value: 0 }, concaveGain: { value: 0 }, farOpacity: { value: 0 }, fadeNear: { value: 0 }, fadeFar: { value: 0 },
      strength: { value: 1 }, pxScale: { value: px }, fogRange: { value: new THREE.Vector2() }, fogStart: { value: 60 },
    });
    this.inkComp = fs(INKCOMP_FRAG, { tColor: { value: null }, tMask: { value: this.mask.texture }, texel: { value: texel },
      inkColor: { value: new THREE.Color() }, fogColor: { value: new THREE.Color() }, fogInk: { value: 0.3 } });
    const lens = (taps, spread, near, rot) => fs(LENS_FRAG, { tColor: { value: null }, tDepth: { value: this.main.depthTexture }, texel: { value: texel },
      cNear: { value: 0.2 }, cFar: { value: 1500 }, focus: { value: 10 }, cInf: { value: 0 }, nearScale: { value: 1.2 }, maxCoC: { value: 24 }, pxScale: { value: px } },
      { TAPS: taps, SPREAD: spread.toFixed(4), NEAR_TAPS: near, ROT: rot.toFixed(4) });
    this.lensPre = lens(12, 0.287, 0, 0.61); this.lensMain = lens(40, 0.958, 20, 0);   // source: 16 / 64 / 32 taps (halved for CPU renders)
    this.bright = fs(BRIGHT_FRAG, { tColor: { value: null }, thr: { value: 1.0 } });
    this.blur = fs(BLUR_FRAG, { tColor: { value: null }, dir: { value: new THREE.Vector2() } });
    this.final = fs(FINAL_FRAG, {
      tColor: { value: null }, tB0: { value: this.blm[0][0].texture }, tB1: { value: this.blm[1][0].texture }, tB2: { value: this.blm[2][0].texture }, tB3: { value: this.blm[3][0].texture },
      bloom: { value: 0.5 }, exposure: { value: 1 }, gradeKy: { value: [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1] }, gradeKm: { value: [1, 1, 1, 1, 1, 1, 1] },
      gradeSat: { value: new THREE.Vector3(1, 1, 1) }, gradeTintS: { value: new THREE.Vector3() }, gradeTintM: { value: new THREE.Vector3() }, gradeTintH: { value: new THREE.Vector3() },
      gradeVig: { value: new THREE.Vector2() }, gradeAmount: { value: 1 }, flash: { value: new THREE.Color(1, 1, 1) }, flashK: { value: 0 },
    });
    this.mix = fs(MIX_FRAG, { tA: { value: this.layer[0].texture }, tB: { value: this.layer[1].texture }, k: { value: 0 }, flash: { value: new THREE.Color(1, 1, 1) }, flashK: { value: 0 } });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.quad.frustumCulled = false;
    this.fsScene = new THREE.Scene(); this.fsScene.add(this.quad); this.fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.fsScene, this.fsCam); }
  setGrade(p, amount = 1) {
    const u = this.final.uniforms;
    u.gradeKy.value = p.ky.slice(); u.gradeKm.value = monoTangents(p.ky); u.gradeSat.value.set(...p.sat);
    u.gradeTintS.value.copy(tintRGB(p.tintS)); u.gradeTintM.value.copy(tintRGB(p.tintM)); u.gradeTintH.value.copy(tintRGB(p.tintH));
    u.gradeVig.value.set(...p.vig); u.gradeAmount.value = this.on.grade ? amount : 0;
  }
  /** render one finished frame of (scene, cam) into `target` (null = canvas). o = { focus, cInf, grade, flash, flashCol, exposure, bloom } */
  render(scene, cam, o = {}, target = null) {
    const r = this.r, I = this.ink;
    r.autoClear = true;
    cam.layers.enable(NOINK);
    r.setRenderTarget(this.main); r.clear(); r.render(scene, cam);
    let cur = this.main;
    if (this.on.ink) {
      // 1) world-only normals + depth (no NOINK layer, no sky, shadow maps not re-rendered)
      const bg = scene.background, sm = r.shadowMap.autoUpdate, cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha();
      cam.layers.disable(NOINK); scene.overrideMaterial = this.normalMat; scene.background = null; r.shadowMap.autoUpdate = false;
      r.setClearColor(0x000000, 0); r.setRenderTarget(this.world); r.clear(); r.render(scene, cam);
      cam.layers.enable(NOINK); scene.overrideMaterial = null; scene.background = bg; r.shadowMap.autoUpdate = sm; r.setClearColor(cc, ca);
      // 2) edge mask
      const u = this.maskMat.uniforms, e = cam.projectionMatrix.elements;
      Object.assign(u.cNear, { value: cam.near }); u.cFar.value = cam.far; u.p00.value = e[0]; u.p11.value = e[5];
      u.wNear.value = I.widthNear; u.wFar.value = I.widthFar; u.dNear.value = I.distNear; u.dFar.value = I.distFar; u.creaseScale.value = I.creaseScale;
      u.depthLo.value = I.depthLo; u.depthHi.value = I.depthHi; u.cosLo.value = Math.cos((I.angleLo * Math.PI) / 180); u.cosHi.value = Math.cos((I.angleHi * Math.PI) / 180);
      u.concaveGain.value = I.concaveGain; u.farOpacity.value = I.farOpacity; u.fadeNear.value = I.fadeNear; u.fadeFar.value = I.fadeFar;
      const fog = scene.fog;
      if (fog && fog.isFog) { u.fogRange.value.set(fog.near, fog.far); this.inkComp.uniforms.fogColor.value.copy(fog.color); } else u.fogRange.value.set(0, 0);
      this.pass(this.maskMat, this.mask);
      // 3) composite
      this.inkComp.uniforms.tColor.value = cur.texture; this.inkComp.uniforms.inkColor.value.set(I.color); this.inkComp.uniforms.fogInk.value = I.fogInk;
      this.pass(this.inkComp, this.a); cur = this.a;
    }
    if (this.on.lens && (o.cInf ?? 0) >= 0.25) {
      for (const [m, src, dst] of [[this.lensPre, cur, cur === this.a ? this.b : this.a], [this.lensMain, null, null]]) {
        const s = src ?? cur, d = dst ?? (cur === this.a ? this.b : this.a);
        m.uniforms.tColor.value = s.texture; m.uniforms.cNear.value = cam.near; m.uniforms.cFar.value = cam.far;
        m.uniforms.focus.value = o.focus ?? 10; m.uniforms.cInf.value = o.cInf;
        this.pass(m, d); cur = d;
      }
    }
    const bl = this.on.bloom ? (o.bloom ?? 0.5) : 0;
    if (bl > 0) {
      this.bright.uniforms.tColor.value = cur.texture; this.pass(this.bright, this.blm[0][0]);
      for (let i = 0; i < 4; i++) {
        const [p, q] = this.blm[i];
        if (i) { this.blur.uniforms.tColor.value = this.blm[i - 1][0].texture; this.blur.uniforms.dir.value.set(0, 0); this.pass(this.blur, p); }
        this.blur.uniforms.tColor.value = p.texture; this.blur.uniforms.dir.value.set(1 / p.width, 0); this.pass(this.blur, q);
        this.blur.uniforms.tColor.value = q.texture; this.blur.uniforms.dir.value.set(0, 1 / p.height); this.pass(this.blur, p);
      }
    }
    const f = this.final.uniforms;
    f.tColor.value = cur.texture; f.bloom.value = bl; f.exposure.value = o.exposure ?? 1;
    if (o.grade) this.setGrade(o.grade, o.gradeAmount ?? 1);
    f.flashK.value = o.flash ?? 0; f.flash.value.set(o.flashCol ?? "#ffffff");
    this.pass(this.final, target);
  }
  /** two finished layers mixed (place-change crossfade): drawA / drawB render into the given target */
  crossfade(drawA, drawB, k, flash = 0, flashCol = "#ffffff") {
    drawA(this.layer[0]); drawB(this.layer[1]);
    this.mix.uniforms.k.value = k; this.mix.uniforms.flashK.value = flash; this.mix.uniforms.flash.value.set(flashCol);
    this.pass(this.mix, null);
  }
}

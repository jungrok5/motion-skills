// Post chain: scene (HDR, MSAA, depth) -> height fog + sky -> DOF -> bloom -> grade/grain.
import * as THREE from 'three';
import { LOOK, SKY_GLSL } from './look.js';

const VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FOG_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tColor; uniform sampler2D tDepth; uniform sampler2D tAO; uniform float uAO;
uniform mat4 uInvProj, uCamWorld;
uniform vec3 uCamPos, uFogCol, uMistCol;
uniform float uTime, uDensity, uMist, uMistH, uMistNoise, uFrame;
uniform vec4 uGlowPos[10];   // xyz world, w radius falloff scale
uniform vec3 uGlowCol[10];
uniform int uGlowN;
${SKY_GLSL}
float hash13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash13(i), hash13(i+vec3(1,0,0)), f.x), mix(hash13(i+vec3(0,1,0)), hash13(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i+vec3(0,0,1)), hash13(i+vec3(1,0,1)), f.x), mix(hash13(i+vec3(0,1,1)), hash13(i+vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float s = 0.0, a = 0.5; for(int i=0;i<4;i++){ s += a*vnoise(p); p = p*2.02 + 7.1; a *= 0.5; } return s; }
float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main(){
  float d = texture2D(tDepth, vUv).r;
  vec4 clip = vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  vec4 vp = uInvProj * clip; vp /= vp.w;
  vec3 wp = (uCamWorld * vp).xyz;
  vec3 rd = normalize(wp - uCamPos);
  bool sky = d >= 0.99999;
  float dist = sky ? 6000.0 : length(wp - uCamPos);
  vec3 col = sky ? skyColor(rd) : texture2D(tColor, vUv).rgb;
  if (!sky) {
    // ambient obscurance (spare bright emitters)
    float aov = texture2D(tAO, vUv).r;
    float em = smoothstep(0.5, 1.6, max(col.r, max(col.g, col.b)));
    col *= mix(1.0, mix(aov, 1.0, em), uAO);
  }
  if (sky) {
    // overcast dusk: two drifting cloud layers, darker bellies higher up
    vec2 sp = rd.xz / (abs(rd.y) + 0.22);
    float c1 = fbm(vec3(sp * 0.9 + vec2(uTime * 0.003, 0.0), 0.3));
    float c2 = fbm(vec3(sp * 2.7 - vec2(uTime * 0.006, uTime * 0.002), 1.7));
    col *= 0.80 + 0.42 * (c1 * 0.65 + c2 * 0.35);
    col = mix(col, col * vec3(0.76, 0.81, 0.90), smoothstep(0.52, 0.78, c1) * 0.55 * smoothstep(0.04, 0.45, rd.y));
  }
  // --- analytic fog: homogeneous + exponential ground layer ---
  float od = uDensity * min(dist, 2500.0);
  float k = rd.y / uMistH;
  float base = uMist * exp(-max(uCamPos.y, 0.0) / uMistH);
  float lay = abs(k) < 1e-4 ? base * dist : base * (1.0 - exp(-k * dist)) / k;
  // keep the near field clear: ground mist only builds up beyond the first tens of metres
  float nearClear = smoothstep(6.0, 75.0, dist);
  // drifting fog banks: the layer is patchy over hundreds of metres
  vec3 pe = uCamPos + rd * min(dist, 420.0);
  float bank = fbm(vec3(pe.x * 0.011 - uTime * 0.012, 0.37, pe.z * 0.011 + uTime * 0.006));
  lay = max(lay, 0.0) * nearClear * (0.5 + 1.1 * bank);
  od += lay;
  float odHomog = od - lay;
  // --- wispy modulation, short raymarch through the mist layer ---
  float marchEnd = min(dist, 220.0);
  const int STEPS = 20;
  float jit = ign(gl_FragCoord.xy + uFrame * 5.588);
  float stepLen = marchEnd / float(STEPS);
  float nod = 0.0;
  for (int i = 0; i < STEPS; i++) {
    float s = (float(i) + jit) * stepLen;
    vec3 p = uCamPos + rd * s;
    // tongues of mist reach higher in places
    float tall = vnoise(vec3(p.x * 0.018 - uTime * 0.02, 1.3, p.z * 0.018));
    float hd = exp(-max(p.y, 0.0) / (uMistH * (1.0 + 1.9 * tall * tall)));
    if (hd < 0.02) continue;
    float n = fbm(vec3(p.x * 0.035 - uTime * 0.045, p.y * 0.11 + uTime * 0.01, p.z * 0.035 + uTime * 0.02)) * 0.72
            + vnoise(vec3(p.x * 0.13 - uTime * 0.09, p.y * 0.3, p.z * 0.13 + uTime * 0.05)) * 0.28;
    nod += uMist * hd * (n - 0.47) * 2.4 * stepLen;
  }
  od = max(od + nod * uMistNoise * nearClear, 0.0);
  float T = exp(-od);
  // fog colour: what the sky looks like near the horizon in this direction, a bit brighter low down
  vec3 fd = normalize(vec3(rd.x, max(rd.y, 0.0) * 0.35 + 0.03, rd.z));
  vec3 fogc = mix(uFogCol, skyColor(fd), 0.55);
  // where the ground mist dominates the optical depth, the fog turns paler and greyer
  float mw = clamp((od - odHomog) / max(od, 1e-4), 0.0, 1.0);
  fogc = mix(fogc, uMistCol, mw * 0.85);
  col = col * T + fogc * (1.0 - T);
  // --- warm volumetric halos around light clusters (analytic 1/r^2 line integral) ---
  vec3 glow = vec3(0.0);
  for (int i = 0; i < 10; i++) {
    if (i >= uGlowN) break;
    vec3 L = uGlowPos[i].xyz - uCamPos;
    float b = dot(L, rd);
    float h = sqrt(max(dot(L, L) - b * b, 0.0)) + uGlowPos[i].w;
    float I = (atan((dist - b) / h) + atan(b / h)) / h;
    float fade = exp(-uDensity * 1.5 * max(b, 0.0));
    glow += uGlowCol[i] * I * fade;
  }
  col += glow * 0.07;
  gl_FragColor = vec4(col, T);
}
`;

// Scalable ambient obscurance from the depth buffer (McGuire SAO estimator)
const AO_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tDepth; uniform mat4 uInvProj; uniform vec2 uRes; uniform float uRadius, uProjScale, uFrame;
vec3 viewPos(vec2 uv){ float d = texture2D(tDepth, uv).r; vec4 c = vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); vec4 v = uInvProj * c; return v.xyz / v.w; }
float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main(){
  float d = texture2D(tDepth, vUv).r;
  if (d >= 0.99999) { gl_FragColor = vec4(1.0); return; }
  vec2 px = 1.0 / uRes;
  vec3 p = viewPos(vUv);
  vec3 pr = viewPos(vUv + vec2(px.x, 0.0)), pl = viewPos(vUv - vec2(px.x, 0.0));
  vec3 pu = viewPos(vUv + vec2(0.0, px.y)), pd = viewPos(vUv - vec2(0.0, px.y));
  vec3 dx = abs(pr.z - p.z) < abs(p.z - pl.z) ? pr - p : p - pl;
  vec3 dy = abs(pu.z - p.z) < abs(p.z - pd.z) ? pu - p : p - pd;
  vec3 n = normalize(cross(dx, dy));
  float ao = 0.0;
  // two scales: wide (structures) and tight (creases)
  for (int s = 0; s < 2; s++) {
    float radius = s == 0 ? uRadius : uRadius * 0.28;
    float rpx = min(radius * uProjScale / max(-p.z, 0.1), 140.0);   // radius in pixels
    if (rpx < 1.5) { continue; }
    float r2 = radius * radius;
    float rot = ign(gl_FragCoord.xy + uFrame * 3.71 + float(s) * 17.0) * 6.2831853;
    float sum = 0.0;
    const int N = 9;
    for (int i = 0; i < N; i++) {
      float a = (float(i) + 0.5) / float(N);
      float ang = a * 6.2831853 * 2.6 + rot;
      vec2 off = vec2(cos(ang), sin(ang)) * a * rpx * px;
      vec3 v = viewPos(vUv + off) - p;
      float vv = dot(v, v), vn = dot(v, n);
      float f = max(r2 - vv, 0.0);
      sum += f * f * f * max((vn - 0.012 * (-p.z) * 0.02 - 0.015) / (0.01 + vv), 0.0);
    }
    ao += (5.0 / (r2 * r2 * r2)) * sum / float(N) * (s == 0 ? 1.0 : 0.45);
  }
  gl_FragColor = vec4(vec3(clamp(1.0 - ao * 1.15, 0.0, 1.0)), 1.0);
}
`;
const AOBLUR_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv; uniform sampler2D tAO; uniform sampler2D tDepth; uniform vec2 uRes; uniform float uNear, uFar;
float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
void main(){
  float zc = lin(texture2D(tDepth, vUv).r);
  float acc = 0.0, w = 0.0;
  for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) {
    vec2 uv = vUv + vec2(float(x), float(y)) * 1.5 / uRes;
    float z = lin(texture2D(tDepth, uv).r);
    float ww = max(0.0, 1.0 - abs(z - zc) / (0.04 * zc + 0.05));
    acc += texture2D(tAO, uv).r * ww; w += ww;
  }
  gl_FragColor = vec4(vec3(w > 0.0 ? acc / w : 1.0), 1.0);
}
`;

const DOF_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tColor; uniform sampler2D tDepth;
uniform vec2 uRes; uniform float uNear, uFar, uFocus, uAperture, uMaxBlur;
float linDepth(float d){ float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
float coc(float z){ return clamp(uAperture * (z - uFocus) / max(z, 0.01), -uMaxBlur, uMaxBlur); }
void main(){
  float zc = linDepth(texture2D(tDepth, vUv).r);
  float cc = coc(zc);
  vec3 acc = texture2D(tColor, vUv).rgb; float wsum = 1.0;
  float rad = abs(cc);
  if (rad > 0.6) {
    const float GA = 2.39996323;
    const int N = 40;
    vec2 px = 1.0 / uRes;
    for (int i = 1; i <= N; i++) {
      float r = sqrt(float(i) / float(N));
      float a = float(i) * GA;
      vec2 o = vec2(cos(a), sin(a)) * r;
      // gather radius: allow near-field blur to bleed over sharp areas
      vec2 uv = vUv + o * px * max(rad, uMaxBlur * 0.0);
      float zs = linDepth(texture2D(tDepth, uv).r);
      float cs = abs(coc(zs));
      float w = (zs < zc) ? 1.0 : smoothstep(0.0, 1.0, cs / max(rad * r, 0.5));
      vec3 s = texture2D(tColor, uv).rgb;
      w *= 1.0 + dot(s, vec3(0.3)) * 0.6;  // bokeh highlight weight
      acc += s * w; wsum += w;
    }
  }
  gl_FragColor = vec4(acc / wsum, 1.0);
}
`;

const DOWN_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThreshold, uFirst;
vec3 pre(vec3 c){
  if (uFirst < 0.5) return c;
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + 0.5, 0.0, 1.0); soft = soft * soft * 0.5;
  float contrib = max(soft, br - uThreshold) / max(br, 1e-4);
  return min(c * contrib, vec3(40.0));
}
void main(){
  vec2 t = uTexel;
  vec3 a = pre(texture2D(tSrc, vUv + t * vec2(-2, 2)).rgb), b = pre(texture2D(tSrc, vUv + t * vec2(0, 2)).rgb), c = pre(texture2D(tSrc, vUv + t * vec2(2, 2)).rgb);
  vec3 d = pre(texture2D(tSrc, vUv + t * vec2(-2, 0)).rgb), e = pre(texture2D(tSrc, vUv).rgb), f = pre(texture2D(tSrc, vUv + t * vec2(2, 0)).rgb);
  vec3 g = pre(texture2D(tSrc, vUv + t * vec2(-2, -2)).rgb), h = pre(texture2D(tSrc, vUv + t * vec2(0, -2)).rgb), i = pre(texture2D(tSrc, vUv + t * vec2(2, -2)).rgb);
  vec3 j = pre(texture2D(tSrc, vUv + t * vec2(-1, 1)).rgb), k = pre(texture2D(tSrc, vUv + t * vec2(1, 1)).rgb);
  vec3 l = pre(texture2D(tSrc, vUv + t * vec2(-1, -1)).rgb), m = pre(texture2D(tSrc, vUv + t * vec2(1, -1)).rgb);
  vec3 col = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  gl_FragColor = vec4(col, 1.0);
}
`;
const UP_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv; uniform sampler2D tSrc; uniform sampler2D tAdd; uniform vec2 uTexel; uniform float uMix;
void main(){
  vec2 t = uTexel;
  vec3 s = texture2D(tSrc, vUv + t * vec2(-1, 1)).rgb + texture2D(tSrc, vUv + t * vec2(1, 1)).rgb * 1.0
         + texture2D(tSrc, vUv + t * vec2(-1, -1)).rgb + texture2D(tSrc, vUv + t * vec2(1, -1)).rgb;
  s += 2.0 * (texture2D(tSrc, vUv + t * vec2(0, 1)).rgb + texture2D(tSrc, vUv + t * vec2(0, -1)).rgb
            + texture2D(tSrc, vUv + t * vec2(1, 0)).rgb + texture2D(tSrc, vUv + t * vec2(-1, 0)).rgb);
  s += 4.0 * texture2D(tSrc, vUv).rgb;
  s /= 16.0;
  gl_FragColor = vec4(texture2D(tAdd, vUv).rgb + s * uMix, 1.0);
}
`;

const COMB_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv; uniform sampler2D tColor; uniform sampler2D tBloom; uniform float uBloom, uWeight;
void main(){ vec3 b = texture2D(tBloom, vUv).rgb; b *= vec3(1.10, 1.0, 0.92);   // faint red-orange halation
  gl_FragColor = vec4((texture2D(tColor, vUv).rgb + b * uBloom) * uWeight, 1.0); }
`;

const FINAL_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tColor; uniform sampler2D tBloom;
uniform vec2 uRes;
uniform float uExposure, uBloom, uSat, uContrast, uVignette, uGrain, uChroma, uFrame, uFade, uLetterbox;
uniform vec3 uLift;
vec3 aces(vec3 x){ // Narkowicz fit
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec2 c = vUv - 0.5;
  float r2 = dot(c, c);
  vec2 off = c * r2 * uChroma * 8.0;
  vec3 col;
  col.r = texture2D(tColor, vUv + off).r;
  col.g = texture2D(tColor, vUv).g;
  col.b = texture2D(tColor, vUv - off).b;
  col *= uExposure;
  // vignette (pre-tonemap, so highlights survive)
  float vig = 1.0 - uVignette * smoothstep(0.08, 0.72, r2 * 1.9);
  col *= vig;
  col = aces(col);
  // grade
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSat);
  col = (col - 0.18) * uContrast + 0.18;
  col = max(col, 0.0);
  col += uLift * (1.0 - col);
  // gamma (sRGB OETF)
  col = mix(col * 12.92, 1.055 * pow(col, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, col));
  // film grain (coarse + fine, stronger in the mids)
  // film grain: bilinear value noise at ~1.8 px (soft clumps) + a little fine noise, slight chroma variation
  vec2 gq = gl_FragCoord.xy / 1.8 + vec2(uFrame * 13.7, uFrame * 7.3);
  vec2 gi = floor(gq), gf = fract(gq); gf = gf * gf * (3.0 - 2.0 * gf);
  float fo = uFrame * 0.61;
  float g2 = mix(mix(h12(gi + fo), h12(gi + vec2(1.0, 0.0) + fo), gf.x), mix(h12(gi + vec2(0.0, 1.0) + fo), h12(gi + vec2(1.0, 1.0) + fo), gf.x), gf.y) - 0.5;
  float g1 = h12(gl_FragCoord.xy + uFrame * 17.13) - 0.5;
  float g3 = h12(gi * 1.37 + 71.0 + fo) - 0.5;
  float lum = dot(col, vec3(0.33));
  float gamt = uGrain * (0.55 + 0.9 * (1.0 - abs(lum * 2.0 - 0.8)));
  col += (g2 * 1.7 + g1 * 0.35) * gamt + vec3(g3, -g3 * 0.5, -g3) * gamt * 0.35;
  col *= uFade;
  if (abs(c.y) > 0.5 - uLetterbox) col = vec3(0.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createPost(renderer, w, h) {
  const HF = THREE.HalfFloatType;
  const depthTex = new THREE.DepthTexture(w, h);
  depthTex.type = THREE.UnsignedIntType;
  const rtScene = new THREE.WebGLRenderTarget(w, h, { type: HF, samples: 4, depthTexture: depthTex, depthBuffer: true });
  const mk = (ww, hh) => new THREE.WebGLRenderTarget(ww, hh, { type: HF, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const rtFog = mk(w, h), rtDof = mk(w, h), rtComb = mk(w, h);
  const mk8 = () => new THREE.WebGLRenderTarget(w, h, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const rtAO = mk8(), rtAO2 = mk8();
  const LEVELS = 6;
  const down = [], up = [];
  let bw = w, bh = h;
  for (let i = 0; i < LEVELS; i++) {
    bw = Math.max(2, Math.round(bw / 2)); bh = Math.max(2, Math.round(bh / 2));
    down.push(mk(bw, bh)); up.push(mk(bw, bh));
  }
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  const qscene = new THREE.Scene(); qscene.add(quad);
  const mat = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });

  const glowPos = Array.from({ length: 10 }, () => new THREE.Vector4());
  const glowCol = Array.from({ length: 10 }, () => new THREE.Color());
  const fogMat = mat(FOG_FRAG, {
    tColor: { value: rtScene.texture }, tDepth: { value: depthTex },
    uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() },
    uCamPos: { value: new THREE.Vector3() }, uFogCol: { value: LOOK.fogColor }, uMistCol: { value: LOOK.mistColor },
    uTime: { value: 0 }, uFrame: { value: 0 },
    uDensity: { value: LOOK.fogDensity }, uMist: { value: LOOK.mistDensity },
    uMistH: { value: LOOK.mistHeight }, uMistNoise: { value: LOOK.mistNoise },
    uZenith: { value: LOOK.zenith }, uHorizon: { value: LOOK.horizon },
    uSkyGlowDir: { value: LOOK.skyGlowDir }, uSkyGlow: { value: LOOK.skyGlow },
    uGlowPos: { value: glowPos }, uGlowCol: { value: glowCol }, uGlowN: { value: 0 },
    tAO: { value: rtAO2.texture }, uAO: { value: 1 },
  });
  const aoMat = mat(AO_FRAG, { tDepth: { value: depthTex }, uInvProj: { value: new THREE.Matrix4() }, uRes: { value: new THREE.Vector2(w, h) }, uRadius: { value: 1.8 }, uProjScale: { value: 1 }, uFrame: { value: 0 } });
  const aoBlurMat = mat(AOBLUR_FRAG, { tAO: { value: rtAO.texture }, tDepth: { value: depthTex }, uRes: { value: new THREE.Vector2(w, h) }, uNear: { value: 0.3 }, uFar: { value: 3000 } });
  const dofMat = mat(DOF_FRAG, {
    tColor: { value: rtFog.texture }, tDepth: { value: depthTex },
    uRes: { value: new THREE.Vector2(w, h) }, uNear: { value: 0.3 }, uFar: { value: 3000 },
    uFocus: { value: 50 }, uAperture: { value: 0 }, uMaxBlur: { value: 18 },
  });
  const downMat = mat(DOWN_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 1 }, uFirst: { value: 0 } });
  const upMat = mat(UP_FRAG, { tSrc: { value: null }, tAdd: { value: null }, uTexel: { value: new THREE.Vector2() }, uMix: { value: 1 } });
  const combMat = mat(COMB_FRAG, { tColor: { value: null }, tBloom: { value: null }, uBloom: { value: 0.5 }, uWeight: { value: 1 } });
  combMat.blending = THREE.CustomBlending; combMat.blendEquation = THREE.AddEquation;
  combMat.blendSrc = THREE.OneFactor; combMat.blendDst = THREE.ZeroFactor; combMat.transparent = true;
  const finalMat = mat(FINAL_FRAG, {
    tColor: { value: null }, tBloom: { value: null }, uRes: { value: new THREE.Vector2(w, h) },
    uExposure: { value: 1 }, uBloom: { value: 0.5 }, uSat: { value: 1 }, uContrast: { value: 1 },
    uVignette: { value: 0.4 }, uGrain: { value: 0.05 }, uChroma: { value: 0.001 }, uFrame: { value: 0 },
    uFade: { value: 1 }, uLetterbox: { value: 0 }, uLift: { value: LOOK.lift },
  });

  function pass(material, target) {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(qscene, cam);
  }

  return {
    rtScene, depthTex, fogMat, finalMat, glowPos, glowCol,
    // o: { t, frame, dof:{focus, aperture}|null, fade, exposureMul, fogMul, mistMul }
    render(scene, camera, o = {}) {
      renderer.setRenderTarget(rtScene);
      renderer.clear();
      renderer.render(scene, camera);
      // ambient obscurance
      const aoAmt = LOOK.ao ?? 0.85;
      if (aoAmt > 0) {
        aoMat.uniforms.uInvProj.value.copy(camera.projectionMatrixInverse);
        aoMat.uniforms.uProjScale.value = h * 0.5 * camera.projectionMatrix.elements[5];
        aoMat.uniforms.uRadius.value = LOOK.aoRadius ?? 1.8;
        aoMat.uniforms.uFrame.value = o.frame ?? 0;
        pass(aoMat, rtAO);
        aoBlurMat.uniforms.uNear.value = camera.near; aoBlurMat.uniforms.uFar.value = camera.far;
        pass(aoBlurMat, rtAO2);
      }
      // fog
      const fu = fogMat.uniforms;
      fu.uAO.value = aoAmt;
      fu.uInvProj.value.copy(camera.projectionMatrixInverse);
      fu.uCamWorld.value.copy(camera.matrixWorld);
      fu.uCamPos.value.setFromMatrixPosition(camera.matrixWorld);
      fu.uTime.value = o.t ?? 0; fu.uFrame.value = o.frame ?? 0;
      fu.uDensity.value = LOOK.fogDensity * (o.fogMul ?? 1);
      fu.uMist.value = LOOK.mistDensity * (o.mistMul ?? 1);
      fu.uMistH.value = LOOK.mistHeight; fu.uMistNoise.value = LOOK.mistNoise;
      fu.uGlowN.value = o.glowN ?? 0;
      pass(fogMat, rtFog);
      let src = rtFog;
      if (o.dof && o.dof.aperture > 0) {
        const du = dofMat.uniforms;
        du.uNear.value = camera.near; du.uFar.value = camera.far;
        du.uFocus.value = o.dof.focus; du.uAperture.value = o.dof.aperture * (h / 1080);
        du.uMaxBlur.value = (o.dof.maxBlur ?? 16) * (h / 1080);
        pass(dofMat, rtDof);
        src = rtDof;
      }
      // bloom down
      let prev = src;
      for (let i = 0; i < LEVELS; i++) {
        downMat.uniforms.tSrc.value = prev.texture;
        downMat.uniforms.uTexel.value.set(1 / prev.width, 1 / prev.height);
        downMat.uniforms.uFirst.value = i === 0 ? 1 : 0;
        downMat.uniforms.uThreshold.value = LOOK.bloomThreshold;
        pass(downMat, down[i]);
        prev = down[i];
      }
      // bloom up
      let acc = down[LEVELS - 1];
      for (let i = LEVELS - 2; i >= 0; i--) {
        upMat.uniforms.tSrc.value = acc.texture;
        upMat.uniforms.tAdd.value = down[i].texture;
        upMat.uniforms.uTexel.value.set(1 / acc.width, 1 / acc.height);
        upMat.uniforms.uMix.value = 1.15;
        pass(upMat, up[i]);
        acc = up[i];
      }
      // combine scene + bloom into rtComb; with o.accum = {i, n} sub-frames are averaged (motion blur)
      const ac = o.accum;
      combMat.uniforms.tColor.value = src.texture; combMat.uniforms.tBloom.value = acc.texture;
      combMat.uniforms.uBloom.value = LOOK.bloom / LEVELS * 2.0;
      combMat.uniforms.uWeight.value = ac ? 1 / ac.n : 1;
      combMat.blendDst = ac && ac.i > 0 ? THREE.OneFactor : THREE.ZeroFactor;
      const ac0 = renderer.autoClear; renderer.autoClear = false;
      pass(combMat, rtComb);
      renderer.autoClear = ac0;
      if (ac && ac.i < ac.n - 1) return;
      const u = finalMat.uniforms;
      u.tColor.value = rtComb.texture;
      u.uExposure.value = LOOK.exposure * (o.exposureMul ?? 1);
      u.uSat.value = LOOK.saturation; u.uContrast.value = LOOK.contrast;
      u.uVignette.value = LOOK.vignette; u.uGrain.value = LOOK.grain; u.uChroma.value = LOOK.chroma;
      u.uFrame.value = o.frame ?? 0; u.uFade.value = o.fade ?? 1; u.uLetterbox.value = o.letterbox ?? 0;
      pass(finalMat, null);
    },
  };
}

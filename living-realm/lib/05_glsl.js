// living-realm · 05_glsl — shader chunks shared by every pass, the shared uniform holders, and LR.sh() which
// resolves `//#include name` lines.  All shaders are GLSL ES 3.00 (RawShaderMaterial, glslVersion GLSL3).
{
  const C = (LR.chunk = {});
  LR.sh = (src) => { for (let i = 0; i < 6 && src.includes('//#include'); i++) src = src.replace(/^[ \t]*\/\/#include +(\w+)[ \t]*$/gm, (m, n) => { if (!(n in C)) throw new Error('shader chunk not found: ' + n); return C[n]; }); return src; };

  // one object per uniform, shared by reference by every material that names it
  const v = (value) => ({ value });
  const U = (LR.U = {
    uTime: v(0), uFrame: v(0), uRes: v(new THREE.Vector4(1, 1, 1, 1)),            // render size x,y and 1/x,1/y
    uCamPos: v(new THREE.Vector3()), uNearFar: v(new THREE.Vector2(0.25, 4000)),
    uViewProj: v(new THREE.Matrix4()), uInvViewProj: v(new THREE.Matrix4()), uPrevViewProj: v(new THREE.Matrix4()), uView: v(new THREE.Matrix4()), uProj: v(new THREE.Matrix4()), uInvProj: v(new THREE.Matrix4()),
    uJitter: v(new THREE.Vector2()),
    uWx: v(new THREE.Vector4(0, 0, 0, 0)),                                         // wet, puddle, snow cover, season (0 summer … 1 winter)
    uWx2: v(new THREE.Vector4(0, 0, 0, 0)),                                        // rain rate, snowfall rate, lamps on 0..1, lightning flash
    uWind: v(new THREE.Vector4(0.8, 0.6, 0.3, 0)),                                 // dir x, dir z, strength, spare
    uTopo: v(null), uTopoRect: v(new THREE.Vector4(-192, -192, 1 / 384, 1 / 384)),
    uNoise: v(null), uMatA: v(null), uMatB: v(null),
    uSunDir: v(new THREE.Vector3(0.4, 0.8, 0.3)), uSunCol: v(new THREE.Vector3(8, 7.5, 6.5)),   // the key light (sun or moon) as it reaches the ground
    uSkyAmb: v(new THREE.Vector3(0.6, 0.8, 1.1)), uGroundAmb: v(new THREE.Vector3(0.2, 0.2, 0.15)),
    uFogCol: v(new THREE.Vector3(0.6, 0.7, 0.8)), uFog: v(new THREE.Vector4(0.004, 0.06, 0, 0.35)),   // density at y0, height falloff 1/m, y0, mie g
    uShadowMap: v(null), uShadowMat: v([new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()]),
    uShadowInfo: v(new THREE.Vector4(3, 1 / 2048, 1, 1)), uShadowTexel: v(new THREE.Vector3(0.05, 0.15, 0.5)),   // count, 1/size, strength, spare · world metres per texel
    uCloud: v(new THREE.Vector4(0.45, 0.5, 0, 0)), uCloudOff: v(new THREE.Vector4()),                   // coverage, density, spare, shadow strength · scroll
  });
  LR.uni = (names, extra) => { const o = {}; for (const n of names.split(/[\s,]+/).filter(Boolean)) { if (!(n in U)) throw new Error('no shared uniform ' + n); o[n] = U[n]; } return Object.assign(o, extra || {}); };

  C.head = `precision highp float; precision highp int; precision highp sampler2D; precision mediump sampler2DArray; precision highp sampler2DShadow;
#define PI 3.14159265359
#define TAU 6.28318530718
#define sat(x) clamp(x, 0.0, 1.0)
`;
  C.hash = `
float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 hash32(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yzz) * p3.zyx); }
vec3 hash33(vec3 p3){ p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y); }
`;
  C.pack = `
vec2 octEnc(vec3 n){ n /= (abs(n.x) + abs(n.y) + abs(n.z)); vec2 e = n.y >= 0.0 ? n.xz : (1.0 - abs(n.zx)) * vec2(n.x >= 0.0 ? 1.0 : -1.0, n.z >= 0.0 ? 1.0 : -1.0); return e * 0.5 + 0.5; }
vec3 octDec(vec2 e){ e = e * 2.0 - 1.0; vec3 n = vec3(e.x, 1.0 - abs(e.x) - abs(e.y), e.y); float t = max(-n.y, 0.0); n.x += n.x >= 0.0 ? -t : t; n.z += n.z >= 0.0 ? -t : t; return normalize(n); }
`;
  // frame uniforms every pass can name
  C.frame = `
uniform float uTime; uniform float uFrame; uniform vec4 uRes; uniform vec3 uCamPos; uniform vec2 uNearFar;
uniform mat4 uViewProj, uInvViewProj, uPrevViewProj, uView, uProj, uInvProj;
uniform vec4 uWx, uWx2, uWind; uniform sampler2D uNoise;
float viewZ(float d){ return uNearFar.x * uNearFar.y / (uNearFar.y - d * (uNearFar.y - uNearFar.x)); }
vec3 worldAt(vec2 uv, float d){ vec4 p = uInvViewProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.xyz / p.w; }
`;
  // wind: one travelling gust field shared by grass, leaves, cloth, smoke
  C.wind = `
float gustAt(vec2 xz, float t){
  vec2 d = uWind.xy, p = vec2(-d.y, d.x);
  float a = dot(xz, d), b = dot(xz, p);
  float g = sin(a * 0.043 - t * 0.85 + sin(b * 0.031 + t * 0.11) * 2.1) * 0.5 + 0.5;
  float h = sin(a * 0.17 - t * 1.9 + b * 0.07) * 0.5 + 0.5;
  return (g * g * 0.75 + h * 0.25) * (0.35 + uWind.z) ;
}
`;
  // G-buffer: three RGBA8 targets.  o0 rgb sqrt(albedo), a ao · o1 rgb normal (octahedral, 12 bits each), a roughness · o2 metal, translucency, emissive, snow
  C.gout = `
layout(location = 0) out vec4 o0; layout(location = 1) out vec4 o1; layout(location = 2) out vec4 o2;
vec3 nrmPack(vec3 n){ vec2 e = floor(octEnc(n) * 4095.0 + 0.5); float xh = floor(e.x / 16.0), xl = e.x - xh * 16.0, yh = floor(e.y / 256.0), yl = e.y - yh * 256.0; return vec3(xh, xl * 16.0 + yh, yl) / 255.0; }
void writeG(vec3 albedo, float ao, vec3 N, float rough, float metal, float trans, float emis, float snow){
  o0 = vec4(sqrt(sat(albedo)), ao); o1 = vec4(nrmPack(N), rough); o2 = vec4(metal, trans, sqrt(sat(emis / 64.0)), snow);
}
`;
  C.gin = `
vec3 nrmUnpack(vec3 c){ c = floor(c * 255.0 + 0.5); float xl = floor(c.g / 16.0), yh = c.g - xl * 16.0; return octDec(vec2(c.r * 16.0 + xl, yh * 256.0 + c.b) / 4095.0); }
`;
  // material arrays + the per-pixel tangent frame
  C.mats = `
uniform mediump sampler2DArray uMatA, uMatB;      // A: albedo (gamma 2) + height · B: normal xy, roughness, ao
mat3 cotFrame(vec3 N, vec3 p, vec2 uv){
  vec3 dp1 = dFdx(p), dp2 = dFdy(p); vec2 du1 = dFdx(uv), du2 = dFdy(uv);
  vec3 dp2p = cross(dp2, N), dp1p = cross(N, dp1);
  vec3 T = dp2p * du1.x + dp1p * du2.x, B = dp2p * du1.y + dp1p * du2.y;
  float inv = inversesqrt(max(max(dot(T, T), dot(B, B)), 1e-12));
  return mat3(T * inv, B * inv, N);
}
vec3 nrmDec(vec2 xy){ xy = xy * 2.0 - 1.0; return vec3(xy, sqrt(max(1.0 - dot(xy, xy), 0.0))); }
`;
  // weather on a surface: dampness and puddles from rain, snow cover from winter; both only where the sky is open above
  C.weather = `
uniform sampler2D uTopo; uniform vec4 uTopoRect;
float skyOpen(vec3 wp){
  vec2 uv = (wp.xz - uTopoRect.xy) * uTopoRect.zw;
  float h = textureLod(uTopo, uv, 0.0).r;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  return mix(1.0, smoothstep(1.1, 0.25, h - wp.y), inside);
}
vec2 rippleLayer(vec2 p, float t){
  vec2 ip = floor(p), fp = fract(p), acc = vec2(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 o = vec2(float(i), float(j)); vec3 r = hash32(ip + o);
    vec2 c = o + r.xy - fp; float d = length(c), tt = fract(t * (0.7 + r.z * 0.6) + r.z * 7.0);
    float ring = sin(46.0 * (d - tt * 0.8)) * smoothstep(0.0, 0.08, tt) * (1.0 - tt) * (1.0 - tt) * smoothstep(0.11, 0.0, abs(d - tt * 0.8));
    acc += c / max(d, 1e-4) * ring;
  }
  return acc;
}
// albedo/N/rough/ao are changed in place.  h: material height 0..1, Ng: geometric normal, por: porosity 0..1 (how much it darkens),
// pud: can hold puddles 0..1, stick: how much snow stays 0..1.  returns the snow mask.
float applyWeather(inout vec3 albedo, inout vec3 N, inout float rough, inout float ao, float h, vec3 wp, vec3 Ng, float por, float pud, float stick){
  float wet = uWx.x, snowAmt = uWx.z, snow = 0.0;
  if (wet + snowAmt + uWx.y < 0.002) return 0.0;
  float open = skyOpen(wp);
  vec4 nz = texture(uNoise, wp.xz * 0.043);
  if (wet + uWx.y > 0.002) {
    float w = wet * mix(0.3, 1.0, open) * (1.0 - snowAmt * 0.6);
    float soak = w * por;
    albedo *= mix(1.0, 0.52, soak);
    rough = mix(rough, max(0.08, rough * mix(0.34, 0.74, por * por)), w);
    if (pud > 0.01 && Ng.y > 0.85 && uWx.y > 0.01) {
      float lvl = uWx.y * 0.66 - h * 0.55 - nz.r * 0.72 + (nz.g - 0.5) * 0.2;
      float p = smoothstep(0.0, 0.05, lvl) * pud * open * smoothstep(0.85, 0.97, Ng.y);
      if (p > 0.0) {
        vec2 rp = vec2(0.0);
        if (uWx2.x > 0.02) rp = (rippleLayer(wp.xz * 3.1, uTime * 1.1) + rippleLayer(wp.xz * 5.3 + 7.7, uTime * 1.35)) * 0.16 * uWx2.x * open;
        vec3 flatN = normalize(vec3(rp.x, 1.0, rp.y));
        N = normalize(mix(N, flatN, p)); rough = mix(rough, 0.035, p); albedo *= mix(1.0, 0.45, p); ao = mix(ao, 1.0, p * 0.7);
      }
    }
  }
  if (snowAmt > 0.002 && stick > 0.0) {
    float up = N.y * 0.65 + Ng.y * 0.35;
    float cover = snowAmt * open * stick;
    float m = cover * 1.6 + (up - 0.62) * 2.4 - (1.0 - cover) * (h * 0.9 + nz.b * 0.45) - 0.5 + (nz.a - 0.5) * 0.3;
    snow = smoothstep(0.0, 0.32, m) * smoothstep(0.05, 0.3, up);
    if (snow > 0.0) {
      vec4 sa = texture(uMatA, vec3(wp.xz * 0.61 + wp.y * 0.37, float(SNOW_LAYER)));
      vec4 sb = texture(uMatB, vec3(wp.xz * 0.61 + wp.y * 0.37, float(SNOW_LAYER)));
      vec3 sn = nrmDec(sb.xy);
      vec3 Ns = normalize(mix(Ng, vec3(0.0, 1.0, 0.0), 0.35) + vec3(sn.x, 0.0, sn.y) * 0.55);
      albedo = mix(albedo, sa.rgb * sa.rgb, snow); N = normalize(mix(N, Ns, snow * 0.9));
      rough = mix(rough, sb.z, snow); ao = mix(ao, max(ao, 0.92), snow);
    }
  }
  return snow;
}
`;
  // cascaded shadows from one atlas (cascades side by side), percentage-closer filtered on a rotated disc
  C.shadow = `
uniform highp sampler2DShadow uShadowMap; uniform mat4 uShadowMat[3]; uniform vec4 uShadowInfo; uniform vec3 uShadowTexel;
const vec2 SH_DISC[8] = vec2[8](vec2(-0.613, 0.354), vec2(0.221, -0.722), vec2(0.787, 0.290), vec2(-0.274, -0.268), vec2(-0.090, 0.887), vec2(0.596, -0.386), vec2(-0.880, -0.343), vec2(0.176, 0.213));
float shadowTap(vec3 sc, float ci){ return texture(uShadowMap, vec3((sc.x + ci) / uShadowInfo.x, sc.y, sc.z)); }
// returns light visibility 0..1.  rnd: per-pixel noise 0..1.  taps: 1..8
float shadowAt(vec3 wp, vec3 N, float NoL, float rnd, int taps){
  if (uShadowInfo.z < 0.01) return 1.0;
  int n = int(uShadowInfo.x); float vis = 1.0;
  for (int i = 0; i < 3; i++) {
    if (i >= n) break;
    float tex = uShadowTexel[i];
    vec3 p = wp + N * tex * (1.2 + 2.2 * (1.0 - sat(NoL)));
    vec3 sc = (uShadowMat[i] * vec4(p, 1.0)).xyz;
    vec2 e = min(sc.xy, 1.0 - sc.xy); float edge = min(e.x, e.y);
    float band = 0.06;
    if (edge > 0.004 + band * rnd * (i < n - 1 ? 1.0 : 0.0) && sc.z < 1.0 && sc.z > 0.0) {
      float ang = rnd * TAU, ca = cos(ang), sa = sin(ang); mat2 R = mat2(ca, sa, -sa, ca);
      float rad = (i == 0 ? 1.9 : 1.5) * uShadowInfo.y; float s = 0.0;
      for (int k = 0; k < 8; k++) { if (k >= taps) break; vec2 o = R * SH_DISC[k] * rad; s += shadowTap(vec3(clamp(sc.xy + o, 0.002, 0.998), sc.z), float(i)); }
      vis = s / float(taps);
      if (i == n - 1) vis = mix(vis, 1.0, smoothstep(0.08, 0.0, edge));
      break;
    }
  }
  return mix(1.0, vis, uShadowInfo.z);
}
`;
  // cloud shadow on the ground and height fog — shared by lighting, air and forward passes
  C.air = `
uniform vec3 uFogCol; uniform vec4 uFog; uniform vec3 uSunDir, uSunCol, uSkyAmb, uGroundAmb; uniform vec4 uCloud, uCloudOff;
float cloudField(vec2 p){
  vec4 a = textureLod(uNoise, p * 0.00011 + uCloudOff.xy, 0.0), b = textureLod(uNoise, p * 0.00037 + uCloudOff.zw, 0.0);
  float d = a.r * 0.62 + b.g * 0.28 + b.b * 0.1;
  return smoothstep(1.0 - uCloud.x - 0.18, 1.0 - uCloud.x + 0.22, d);
}
float cloudShadow(vec3 wp){
  if (uCloud.w < 0.01) return 1.0;
  vec2 p = wp.xz + uSunDir.xz * ((1500.0 - wp.y) / max(uSunDir.y, 0.08));
  return 1.0 - cloudField(p) * uCloud.w;
}
// optical depth of the height fog along a ray from the eye: closed form
float fogDepth(vec3 ro, vec3 rd, float t){
  float k = uFog.y, a = uFog.x * exp(-k * (ro.y - uFog.z));
  float ky = k * rd.y; float f = abs(ky) < 1e-4 ? t : (1.0 - exp(-ky * t)) / ky;
  return a * f;
}
`;
  // the big triangle
  C.fsvs = `in vec3 position; out vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
}

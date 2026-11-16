// living-realm · 75_post — the frame after the G-buffer: ambient occlusion from depth, air (height fog with the sun's
// shafts marched through the shadow cascades), the lighting pass, see-through things, temporal anti-aliasing that also
// upsamples a smaller internal picture, bloom, eye adaptation, and the grade onto the canvas.
{
  const T = THREE, U = LR.U, R = LR.render, FRAME = R.FRAME;
  const v = (value) => ({ value }), MAXL = 24;
  const PU = (R.U = {
    tG0: v(null), tG1: v(null), tG2: v(null), tDepth: v(null), tAO: v(null), tAir: v(null), tGI: v(null), uBounce: v(1), tHistL: v(null), tHDR: v(null), tHist: v(null), tCopy: v(null), tBloom: v(null), tAdapt: v(null),
    uHalf: v(new T.Vector4(1, 1, 1, 1)), uOut: v(new T.Vector4(1, 1, 1, 1)), uJit: v(new T.Vector2()), uEnvMips: v(7),
    tCanopy: v(null), uCanopyRect: v(new T.Vector4(-256, -256, 1 / 512, 1 / 512)), uCanopy: v(new T.Vector4(0, 0, 0, 0)), uSplit: v(new T.Vector4(0.3, 0.5, 0.5, 0)),
    uLightPos: v(Array.from({ length: MAXL }, () => new T.Vector4())), uLightCol: v(Array.from({ length: MAXL }, () => new T.Vector4())), uLightN: v(0),
    uExposure: v(0.3), uKey: v(0.18), uGrade: v(new T.Vector4(1, 1, 0.3, 0.02)), uTintG: v(new T.Vector3(1, 1, 1)), uLiftG: v(new T.Vector3(0, 0, 0)), uBloomMix: v(0.06), uFill: v(0.62), uShaft: v(1), uHistOk: v(0), uSharp: v(0.4), uBlend: v(0.1), uDt: v(0.016),
  });
  const SKY = () => LR.sky.U;
  const AIRU = 'uFogCol uFog uSunDir uSunCol uSkyAmb uGroundAmb uCloud uCloudOff';
  const SHU = 'uShadowMap uShadowMat uShadowInfo uShadowTexel';

  LR.chunk.shadowfast = `
float shadowFast(vec3 wp){
  if (uShadowInfo.z < 0.01) return 1.0; int n = int(uShadowInfo.x);
  for (int i = 0; i < 3; i++) { if (i >= n) break; vec3 sc = (uShadowMat[i] * vec4(wp, 1.0)).xyz; vec2 e = min(sc.xy, 1.0 - sc.xy); if (min(e.x, e.y) > 0.01 && sc.z < 1.0 && sc.z > 0.0) return shadowTap(sc, float(i)); }
  return 1.0;
}`;
  LR.chunk.canopy = `
uniform sampler2D tCanopy; uniform vec4 uCanopyRect; uniform vec4 uCanopy;         // shade under crowns, extra mist under crowns
float canopyAt(vec3 p){ return textureLod(tCanopy, (p.xz - uCanopyRect.xy) * uCanopyRect.zw, 0.0).r * (1.0 - smoothstep(5.0, 13.0, p.y - uFog.z)); }
`;
  LR.chunk.half = `
uniform vec4 uHalf;
float halfDepth(sampler2D tD, vec2 c){ return textureLod(tD, c + uRes.zw * 0.25, 0.0).r; }
`;

  // ── ambient occlusion (ground-truth style horizons, half size) ──────────────────────────────────────────────────
  const aoFS = `//#include head
//#include hash
//#include pack
//#include frame
//#include gin
//#include half
in vec2 vUv; out vec4 o; uniform sampler2D tDepth, tG1;
vec3 vpos(vec2 uv){ float d = textureLod(tDepth, uv, 0.0).r; vec4 p = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.xyz / p.w; }
void main(){
  vec2 uvc = vUv + uRes.zw * 0.25; float d0 = textureLod(tDepth, uvc, 0.0).r; if (d0 >= 0.999999) { o = vec4(1.0); return; }
  vec3 P = vpos(uvc), V = normalize(-P); vec3 N = normalize(mat3(uView) * nrmUnpack(textureLod(tG1, uvc, 0.0).rgb));
  const float RAD = 1.6; float rpx = clamp(RAD * uProj[1][1] * 0.5 * uRes.y / -P.z, 6.0, 110.0);
  float n0 = ign(gl_FragCoord.xy + mod(uFrame, 32.0) * vec2(2.083, 4.867)), n1 = fract(n0 * 7.31 + 0.37);
  float vis = 0.0;
  for (int s = 0; s < AO_SLICES; s++) {
    float phi = (float(s) + n0) / float(AO_SLICES) * PI; vec2 dir = vec2(cos(phi), sin(phi));
    vec3 dv = vec3(dir, 0.0), ortho = normalize(dv - dot(dv, V) * V), axis = cross(dv, V); axis = normalize(axis);
    vec3 pn = N - axis * dot(N, axis); float pl = length(pn); float cn = sat(dot(pn / max(pl, 1e-4), V)), nA = sign(dot(ortho, pn)) * acos(cn);
    float hc0 = -1.0, hc1 = -1.0;
    for (int j = 0; j < AO_STEPS; j++) {
      float t = (float(j) + n1) / float(AO_STEPS); t = t * t; vec2 off = dir * (2.0 + rpx * t) * uRes.zw;
      vec3 s0 = vpos(uvc + off) - P; float l0 = length(s0); float c0 = dot(s0 / l0, V); hc0 = max(hc0, mix(c0, -1.0, sat(l0 / RAD * 1.2 - 0.2)));
      vec3 s1 = vpos(uvc - off) - P; float l1 = length(s1); float c1 = dot(s1 / l1, V); hc1 = max(hc1, mix(c1, -1.0, sat(l1 / RAD * 1.2 - 0.2)));
    }
    float h0 = nA + max(-acos(clamp(hc1, -1.0, 1.0)) - nA, -PI * 0.5), h1 = nA + min(acos(clamp(hc0, -1.0, 1.0)) - nA, PI * 0.5);
    float a0 = (cn + 2.0 * h0 * sin(nA) - cos(2.0 * h0 - nA)) * 0.25, a1 = (cn + 2.0 * h1 * sin(nA) - cos(2.0 * h1 - nA)) * 0.25;
    vis += pl * (a0 + a1);
  }
  vis = sat(vis / float(AO_SLICES));
  o = vec4(vis, 0.0, 0.0, 1.0);
}`;
  const aoBlurFS = `//#include head
//#include frame
//#include half
in vec2 vUv; out vec4 o; uniform sampler2D tAO, tDepth;
void main(){ float z = viewZ(halfDepth(tDepth, vUv)), s = 0.0, w = 0.0;
  for (int j = -1; j <= 2; j++) for (int i = -1; i <= 2; i++) { vec2 c = vUv + (vec2(float(i), float(j)) - 0.5) * uHalf.zw; float zs = viewZ(halfDepth(tDepth, c)); float k = 1.0 / (0.03 + abs(zs - z) / z * 30.0); s += textureLod(tAO, c, 0.0).r * k; w += k; }
  o = vec4(s / w, 0.0, 0.0, 1.0); }`;

  // ── bounce: one bounce of light off what is on screen ────────────────────────────────────────────────────────────
  // At half size, a few cosine-spread rays per pixel are marched through the depth buffer; where one meets a surface
  // that faces back, that surface's light in last frame's picture arrives here.  Because last frame already holds its
  // own bounce, light goes round more than once.  What the rays miss stays with the sky's light and the occlusion.
  const giFS = `//#include head
//#include hash
//#include pack
//#include frame
//#include gin
//#include half
in vec2 vUv; out vec4 o; uniform sampler2D tDepth, tG1, tHist;
void main(){
  vec2 uvc = vUv + uRes.zw * 0.25; float d0 = textureLod(tDepth, uvc, 0.0).r; if (d0 >= 0.999999) { o = vec4(0.0); return; }
  vec3 wp = worldAt(uvc, d0); float dist = distance(wp, uCamPos); if (dist > 70.0) { o = vec4(0.0); return; }
  vec3 N = nrmUnpack(textureLod(tG1, uvc, 0.0).rgb), T = normalize(abs(N.y) < 0.99 ? cross(N, vec3(0.0, 1.0, 0.0)) : vec3(1.0, 0.0, 0.0)), B = cross(N, T);
  float n0 = ign(gl_FragCoord.xy + mod(uFrame, 64.0) * vec2(3.137, 5.291)), n1 = fract(n0 * 7.31 + 0.37 + mod(uFrame, 16.0) * 0.618);
  vec3 p0 = wp + N * (0.03 + dist * 0.003), acc = vec3(0.0); float t0 = max(0.14, dist * 0.016);        // eight steps reach about eight metres
  for (int r = 0; r < GI_RAYS; r++) {
    float ph = TAU * (n0 + float(r) / float(GI_RAYS)), rr = sqrt((float(r) + n1) / float(GI_RAYS));
    vec3 dir = normalize(T * (rr * cos(ph)) + B * (rr * sin(ph)) + N * sqrt(max(1.0 - rr * rr, 0.04)));
    float t = t0 * (0.6 + 0.8 * fract(n1 + float(r) * 0.37));
    for (int i = 0; i < GI_STEPS; i++) {
      vec4 c = uViewProj * vec4(p0 + dir * t, 1.0); if (c.w <= 0.0) break; vec3 q = c.xyz / c.w * 0.5 + 0.5;
      if (q.x <= 0.0 || q.x >= 1.0 || q.y <= 0.0 || q.y >= 1.0) break;
      float ds = textureLod(tDepth, q.xy, 0.0).r, zr = viewZ(q.z), dz = zr - viewZ(ds);
      if (dz > 0.01 + 0.003 * zr && dz < 0.4 + 0.9 * t) {
#if GI_DEBUG == 1
        acc += vec3(1.0, 0.0, 0.0);
#endif
        if (dot(nrmUnpack(textureLod(tG1, q.xy, 0.0).rgb), dir) < -0.05) {
#if GI_DEBUG == 1
        acc += vec3(0.0, 1.0, 0.0);
#endif                 // it faces back: what it sent out last frame arrives here
          vec4 pc = uPrevViewProj * vec4(worldAt(q.xy, ds), 1.0); vec2 pu = pc.xy / pc.w * 0.5 + 0.5;
          if (pc.w > 0.0 && pu.x > 0.0 && pu.x < 1.0 && pu.y > 0.0 && pu.y < 1.0) acc += min(textureLod(tHist, pu, 0.0).rgb, vec3(14.0));
        }
        break;
      }
      t *= 1.8;
    }
  }
#if GI_DEBUG == 2
  { vec4 pc = uPrevViewProj * vec4(wp, 1.0); acc = textureLod(tHist, pc.xy / pc.w * 0.5 + 0.5, 0.0).rgb * float(GI_RAYS); }
#endif
  o = vec4(acc / float(GI_RAYS) * smoothstep(70.0, 50.0, dist), 1.0);
}`;
  const giBlurFS = `//#include head
//#include frame
//#include half
in vec2 vUv; out vec4 o; uniform sampler2D tGI, tDepth;
void main(){ float z = viewZ(halfDepth(tDepth, vUv)), w = 0.0; vec3 s = vec3(0.0);
  for (int j = -2; j <= 3; j++) for (int i = -2; i <= 3; i++) { vec2 c = vUv + (vec2(float(i), float(j)) - 0.5) * uHalf.zw; float zs = viewZ(halfDepth(tDepth, c)); float k = 1.0 / (0.03 + abs(zs - z) / z * 30.0); s += textureLod(tGI, c, 0.0).rgb * k; w += k; }
  o = vec4(s / w, 1.0); }`;

  // ── air: fog you can see the light in ───────────────────────────────────────────────────────────────────────────
  const airFS = `//#include head
//#include hash
//#include pack
//#include frame
//#include shadow
//#include shadowfast
//#include air
//#include sky
//#include half
//#include canopy
in vec2 vUv; out vec4 o; uniform sampler2D tDepth; uniform float uEnvMips, uShaft;
float hg(float mu, float g){ float g2 = g * g; return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * mu, 1.5)); }
void main(){
  float d = halfDepth(tDepth, vUv); vec2 uvd = vUv + uRes.zw * 0.25;
  vec3 wp = worldAt(uvd, min(d, 0.99999)); vec3 rd = wp - uCamPos; float dist = length(rd); rd /= dist; if (d >= 0.999999) dist = 60000.0;
  float mu = dot(rd, uSunDir), ph = min(mix(hg(mu, 0.74), hg(mu, -0.18), 0.22), 0.9) * 0.7 + 0.024;      // a little of the light goes every way: shafts read from the side too
  vec3 keyIn = uSunCol * PI * ph, amb = envAt(vec3(0.0, 1.0, 0.0), uEnvMips - 1.0) * 0.9;
  float tMax = min(dist, AIR_REACH), jit = ign(gl_FragCoord.xy + mod(uFrame, 32.0) * vec2(5.588, 3.371));
  vec3 ins = vec3(0.0); float Tr = 1.0, tPrev = 0.0, cs = cloudShadow(uCamPos + rd * min(tMax, 45.0));     // clouds are large: once per ray
  for (int i = 0; i < AIR_STEPS; i++) {
    float u = (float(i) + jit) / float(AIR_STEPS), t = tMax * u * u * (0.35 + 0.65 * u), ds = t - tPrev; tPrev = t;
    vec3 p = uCamPos + rd * t;
    float cv = canopyAt(p);
    float dens = uFog.x * exp(-uFog.y * max(p.y - uFog.z, -12.0)) + uCanopy.y * cv;                 // damp air under the trees
    float sh = shadowFast(p) * cs;
    float a = 1.0 - exp(-dens * ds);
    ins += Tr * a * (keyIn * sh + amb * (1.0 - 0.7 * cv) + uWx2.w * vec3(0.5, 0.6, 0.9) * 6.0);
    Tr *= 1.0 - a;
  }
  // the rest of the way: no shadow detail, the haze takes the colour of the sky it is seen against
  float cap = min(dist, 45000.0); float odFar = max(fogDepth(uCamPos, rd, cap) - fogDepth(uCamPos, rd, tMax), 0.0), Tf = exp(-odFar);
  vec3 hz = envAt(normalize(vec3(rd.x, 0.10 + max(rd.y, 0.0) * 0.5, rd.z)), 2.5);
  hz += uSunCol * PI * ph * 0.22 * (1.0 - uCloud.x * uCloud.w);
  ins += Tr * (1.0 - Tf) * hz; Tr *= Tf;
#if SHAFT_STEPS > 0
  // shafts: walk across the picture toward the sun; the more of that walk is open sky, the more of its light comes down
  // this line of sight through the haze.  Crowns and roofs cut it into rays.
  { vec4 sc = uViewProj * vec4(uCamPos + uSunDir * 1000.0, 1.0);
    if (sc.w > 0.0 && mu > 0.0) { vec2 suv = sc.xy / sc.w * 0.5 + 0.5, dv = suv - uvd; float len = length(dv * vec2(uRes.x / uRes.y, 1.0)); dv *= min(1.0, 0.85 / max(len, 1e-3));
      float acc = 0.0, ws = 0.0;
      for (int i = 0; i < SHAFT_STEPS; i++) { float f = (float(i) + jit) / float(SHAFT_STEPS); vec2 p = uvd + dv * f; float w = 1.0 - 0.55 * f;
        float open = (p.x <= 0.0 || p.x >= 1.0 || p.y <= 0.0 || p.y >= 1.0) ? 0.6 : step(0.999999, textureLod(tDepth, p, 0.0).r); acc += open * w; ws += w; }
      float glow = pow(mu, 22.0) * 0.55 + pow(mu, 150.0) * 1.3, hazy = 0.35 + 0.65 * sat(uFog.x * 260.0), lowSun = 0.45 + 0.55 * smoothstep(0.75, 0.12, uSunDir.y);
      float through = 1.0 - exp(-min(dist, 4000.0) * (0.006 + uFog.x * 5.0));                 // a ray shows in the air it crosses: nothing on the grass at your feet
      ins += uSunCol * (acc / ws) * (acc / ws) * glow * hazy * lowSun * through * 0.085 * uShaft * (1.0 - uCloud.x * uCloud.w); } }
#endif
  o = vec4(ins, Tr);
}`;

  // ── lighting ────────────────────────────────────────────────────────────────────────────────────────────────────
  const lightFS = `//#include head
//#include hash
//#include pack
//#include frame
//#include gin
//#include shadow
//#include air
//#include sky
//#include half
//#include canopy
in vec2 vUv; out vec4 o;
uniform sampler2D tG0, tG1, tG2, tDepth, tAO, tAir, tGI, tHist; uniform float uEnvMips, uBounce, uHistOk;
uniform float uFill;                                                                  // how much of the sky's light fills the shade
uniform vec4 uLightPos[${MAXL}]; uniform vec4 uLightCol[${MAXL}]; uniform int uLightN;
vec3 envBRDF(vec3 f0, float rough, float NoV){ vec4 c0 = vec4(-1.0, -0.0275, -0.572, 0.022), c1 = vec4(1.0, 0.0425, 1.04, -0.04); vec4 r = rough * c0 + c1; float a004 = min(r.x * r.x, exp2(-9.28 * NoV)) * r.x + r.y; vec2 AB = vec2(-1.04, 1.04) * a004 + r.zw; return f0 * AB.x + AB.y; }
#if CONTACT_STEPS > 0
// the small shadows the cascades are too coarse for (a blade on the ground, a sill on a wall, a barrel's foot): a short
// march toward the light through the depth buffer
float contactShadow(vec3 wp, vec3 N, float dist, float rnd){
  float len = clamp(dist * 0.035, 0.14, 1.1); vec3 p0 = wp + N * (0.012 + dist * 0.0016);
  for (int i = 0; i < CONTACT_STEPS; i++) {
    float t = len * (float(i) + 0.3 + rnd) / float(CONTACT_STEPS); vec4 c = uViewProj * vec4(p0 + uSunDir * t, 1.0); vec3 q = c.xyz / c.w * 0.5 + 0.5;
    if (c.w <= 0.0 || q.x <= 0.0 || q.x >= 1.0 || q.y <= 0.0 || q.y >= 1.0) break;
    float zr = viewZ(q.z), dz = zr - viewZ(textureLod(tDepth, q.xy, 0.0).r);
    if (dz > 0.006 + 0.002 * zr && dz < 0.10 + 0.5 * len) return 1.0 - (1.0 - 0.45 * float(i) / float(CONTACT_STEPS)) * smoothstep(80.0, 35.0, dist);
  }
  return 1.0;
}
#endif
#if SKY_REACH > 0
// how much of the sky the buildings round a point leave open, read off the top-down height map of built things: eight
// directions, one or two reaches.  A lane between houses sees a strip of sky, the foot of a wall half of it, a field all.
uniform sampler2D uTopo; uniform vec4 uTopoRect;
float skyShare(vec3 wp, vec3 N, float rnd){
  float a0 = rnd * 0.7854, vis = 0.0, ws = 0.0;
  for (int i = 0; i < 8; i++) { float a = a0 + float(i) * 0.7854; vec2 d = vec2(cos(a), sin(a)); float w = max(dot(N, normalize(vec3(d.x, 0.7, d.y))), 0.0) + 0.05, tn = 0.0;
    for (int j = 0; j < SKY_REACH; j++) { float rr = j == 0 ? 2.4 : 7.0; tn = max(tn, (textureLod(uTopo, (wp.xz + d * rr - uTopoRect.xy) * uTopoRect.zw, 0.0).r - wp.y - 0.3) / rr); }
    vis += (1.0 - tn / sqrt(1.0 + tn * tn)) * w; ws += w; }
  return vis / ws;
}
#endif
#if MIRROR_STEPS > 0
// wet paving and puddles mirror what stands over them: the reflected ray marched through the depth buffer, and where it
// lands, last frame's picture.  Only smooth surfaces ask (rain, ice, glass), so a dry day pays nothing.
vec4 mirror(vec3 wp, vec3 rd, float dist, float rnd){
  float t = (0.10 + 0.02 * dist) * (1.0 + 0.4 * rnd);
  for (int i = 0; i < MIRROR_STEPS; i++) {
    vec4 c = uViewProj * vec4(wp + rd * t, 1.0); if (c.w <= 0.0) break; vec3 q = c.xyz / c.w * 0.5 + 0.5;
    if (q.x <= 0.0 || q.x >= 1.0 || q.y <= 0.0 || q.y >= 1.0 || q.z >= 1.0) break;
    float ds = textureLod(tDepth, q.xy, 0.0).r, dz = viewZ(q.z) - viewZ(ds);
    if (dz > 0.0 && dz < 0.7 + 0.5 * t) {
      vec4 pc = uPrevViewProj * vec4(worldAt(q.xy, ds), 1.0); vec2 pu = pc.xy / pc.w * 0.5 + 0.5, e = min(pu, 1.0 - pu);
      return vec4(min(textureLod(tHist, pu, 0.0).rgb, vec3(24.0)), pc.w > 0.0 ? smoothstep(0.0, 0.07, min(e.x, e.y)) : 0.0);
    }
    t *= 1.3;
  }
  return vec4(0.0);
}
#endif
vec3 specGGX(vec3 f0, float a2, float NoH, float NoV, float NoL, float VoH){
  float dd = NoH * NoH * (a2 - 1.0) + 1.0, D = a2 / (dd * dd);
  float gv = NoL * sqrt(NoV * NoV * (1.0 - a2) + a2), gl = NoV * sqrt(NoL * NoL * (1.0 - a2) + a2), Vis = 0.5 / max(gv + gl, 1e-5);
  float f = pow(1.0 - VoH, 5.0); return (f0 + (1.0 - f0) * f) * min(D * Vis, 60.0);
}
void main(){
  float d = texture(tDepth, vUv).r; bool isSky = d >= 0.999999;
  vec3 wp = worldAt(vUv, isSky ? 0.99999 : d); vec3 Vv = uCamPos - wp; float dist = length(Vv); vec3 V = Vv / dist;
  float z = viewZ(d), rnd = ign(gl_FragCoord.xy + mod(uFrame, 64.0) * vec2(5.588, 3.193));
  // half-size buffers, joined with depth so edges stay clean
  float ssao = 0.0; vec4 air = vec4(0.0); vec3 gi = vec3(0.0);
  { vec2 f = vUv * uHalf.xy - 0.5, b = floor(f), fr = f - b; float ws = 0.0;
    for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) { vec2 c = (b + vec2(float(i), float(j)) + 0.5) * uHalf.zw; float zs = viewZ(halfDepth(tDepth, c));
      float w = (i == 0 ? 1.0 - fr.x : fr.x) * (j == 0 ? 1.0 - fr.y : fr.y); w = max(w / (0.02 + abs(zs - z) / z * 40.0), 1e-6);
      ssao += textureLod(tAO, c, 0.0).r * w; air += textureLod(tAir, c, 0.0) * w; gi += textureLod(tGI, c, 0.0).rgb * w; ws += w; }
    ssao /= ws; air /= ws; gi /= ws; }
  vec3 col;
  if (isSky) { col = skyAt(-V, true); col += uWx2.w * vec3(0.55, 0.62, 0.9) * 2.5 * uCloud.x; }
  else {
    vec4 g0 = textureLod(tG0, vUv, 0.0), g1 = textureLod(tG1, vUv, 0.0), g2 = textureLod(tG2, vUv, 0.0);   // explicit level: keeps this branch a branch
    vec3 albedo = g0.rgb * g0.rgb, N = nrmUnpack(g1.rgb); float rough = max(g1.a, 0.04), metal = g2.r, trans = g2.g, emis = g2.b * g2.b * 64.0, snow = g2.a;
    float ao = min(g0.a, ssao * sqrt(ssao)), NoV = max(dot(N, V), 1e-3);
    vec3 f0 = mix(vec3(0.04), albedo, metal), diff = albedo * (1.0 - metal);
    vec3 L = uSunDir, H = normalize(L + V); float NoLr = dot(N, L), NoL = sat(NoLr), a2 = rough * rough; a2 *= a2;
    // the key light
    float shNoL = trans > 0.0 ? max(NoLr, 0.35) : NoLr;
    float sh = (NoLr > -0.2 || trans > 0.0) ? shadowAt(wp, N, shNoL, rnd, SHADOW_TAPS) : 0.0;
    sh *= cloudShadow(wp);
#if CONTACT_STEPS > 0
    if (sh > 0.02 && NoLr > 0.0) sh *= contactShadow(wp, N, dist, rnd);
#endif
    float shT = trans > 0.0 ? mix(sh, 1.0, 0.22 + 0.2 * trans) : sh;                      // light filters down through leaves
    float micro = sat(NoL * 6.0 + ao * ao * 2.0 - 1.0);                              // light does not reach into tight creases
    vec3 dl = diff * (trans > 0.0 ? sat((NoLr + 0.45) / 1.45) : NoL) + specGGX(f0, a2, sat(dot(N, H)), NoV, NoL, sat(dot(V, H))) * NoL;
    col = dl * uSunCol * (trans > 0.0 ? mix(sh, shT, 0.5) : sh) * mix(1.0, micro, 0.6);
    if (trans > 0.0) { float back = pow(sat(dot(V, -L)), 2.0) * 1.1 + sat(-NoLr) * 0.5; col += diff * vec3(1.0, 1.08, 0.5) * uSunCol * back * trans * shT; }
    if (snow > 0.0) {                                                               // snow: glints on the lit side, light bleeding into the shade
      vec3 cell = floor(wp * 55.0); vec3 hr = hash33(cell) * 2.0 - 1.0; float sp = pow(sat(dot(normalize(N + hr * 0.55), H)), 260.0);
      col += uSunCol * sp * snow * sh * 3.0 * smoothstep(60.0, 8.0, dist); col += uSunCol * vec3(0.5, 0.75, 1.0) * 0.045 * snow * sat(0.6 - NoL) * (0.3 + 0.7 * sh);
    }
    // the sky's light and what the land throws back, through the occlusion (lighter surfaces lose less)
    vec3 aoc = max(vec3(ao), ((ao * (2.0404 * albedo - 0.3324) + (-4.7951 * albedo + 0.6417)) * ao + (2.7552 * albedo + 0.6903)) * ao);
    vec3 irr = envAt(N, uEnvMips - 2.0) * 0.6 + envAt(normalize(N + vec3(0.0, 0.6, 0.0)), uEnvMips - 1.0) * 0.4;
    float cv = canopyAt(wp), skyVis = 1.0 - uCanopy.x * cv;                                // under the crowns only part of the sky is seen
#if SKY_REACH > 0
    float share = dist < 90.0 ? mix(1.0, skyShare(wp, N, rnd), 0.85 * smoothstep(90.0, 60.0, dist)) : 1.0; skyVis *= share;   // and between houses only a strip of it
#endif
    irr = irr * skyVis + vec3(0.34, 0.42, 0.18) * uSunCol * (0.25 + max(uSunDir.y, 0.0)) * cv * 0.085;   // and what comes through the leaves is green
    col += diff * (irr * uFill + vec3(0.012, 0.014, 0.018) * (0.4 + uSunCol.g)) * aoc;
    col += diff * gi * uBounce;                                                        // light that has already met a surface (screen space)
    if (trans > 0.0) col += diff * envAt(-N, uEnvMips - 1.5) * trans * 0.35 * ao;
    vec3 Rr = reflect(-V, N); Rr.y = abs(Rr.y) * 0.9 + 0.1 * Rr.y;
    float so = sat(pow(NoV + ao, exp2(-16.0 * rough - 1.0)) - 1.0 + ao);
    vec3 seen = envAt(normalize(Rr), rough * (uEnvMips - 1.5)) * mix(1.0, skyVis, 0.85);
#if MIRROR_STEPS > 0
    if (rough < 0.46 && uHistOk > 0.5 && dist < 60.0) { vec3 mr = reflect(-V, N); if (mr.y > -0.2) { vec4 m = mirror(wp + N * 0.03, mr, dist, rnd); seen = mix(seen, m.rgb, m.a * smoothstep(0.46, 0.22, rough) * smoothstep(60.0, 40.0, dist)); } }
#endif
    col += seen * envBRDF(f0, rough, NoV) * so;
    // lamps, hearths, torches
    for (int i = 0; i < ${MAXL}; i++) { if (i >= uLightN) break; vec4 lp = uLightPos[i]; vec3 Lv = lp.xyz - wp; float d2 = dot(Lv, Lv), r2 = lp.w * lp.w; if (d2 > r2) continue;
      float dl2 = sqrt(d2); vec3 Lp = Lv / dl2; float win = 1.0 - d2 * d2 / (r2 * r2); float att = win * win / (d2 + 1.3);
      float nl = trans > 0.0 ? sat((dot(N, Lp) + 0.5) / 1.5) : sat(dot(N, Lp)); vec3 Hp = normalize(Lp + V);
      col += (diff * nl + specGGX(f0, a2, sat(dot(N, Hp)), NoV, nl, sat(dot(V, Hp))) * nl) * uLightCol[i].rgb * att * (0.35 + 0.65 * ao); }
    col += albedo * emis;
    col += diff * uWx2.w * vec3(0.6, 0.7, 1.0) * 5.0 * sat(N.y * 0.6 + 0.4) * ao;       // lightning
  }
  col = col * air.a + air.rgb;
#ifdef DEBUG_VIEW
  if (!isSky) { vec4 g0 = texture(tG0, vUv), g1 = texture(tG1, vUv), g2 = texture(tG2, vUv); vec3 N = nrmUnpack(g1.rgb); float k = 3.0;
    if (DEBUG_VIEW == 1) col = g0.rgb * g0.rgb * k; if (DEBUG_VIEW == 2) col = pow(N * 0.5 + 0.5, vec3(2.2)) * k; if (DEBUG_VIEW == 3) col = vec3(g1.a * g1.a) * k; if (DEBUG_VIEW == 4) col = vec3(ssao * ssao) * k; if (DEBUG_VIEW == 5) col = vec3(g0.a * g0.a) * k;
    if (DEBUG_VIEW == 6) col = vec3(shadowAt(wp, N, dot(N, uSunDir), rnd, SHADOW_TAPS) * cloudShadow(wp)) * k; if (DEBUG_VIEW == 7) col = air.rgb * 4.0; if (DEBUG_VIEW == 8) col = vec3(g2.a, g2.g, g2.b) * k; if (DEBUG_VIEW == 9) col = envAt(N, uEnvMips - 2.0) * 3.0; if (DEBUG_VIEW == 10) col = gi * k; }
#endif
  o = vec4(max(col, vec3(0.0)), 1.0);
}`;

  // ── temporal resolve: reproject, clip the history to what the neighbourhood allows, blend — onto the canvas grid ─
  const taaFS = `//#include head
//#include frame
in vec2 vUv; out vec4 o; uniform sampler2D tCur, tHist, tDepth; uniform vec2 uJit; uniform float uBlend;
vec3 tm(vec3 c){ return c / (1.0 + max(c.r, max(c.g, c.b))); } vec3 itm(vec3 c){ return c / max(1.0 - max(c.r, max(c.g, c.b)), 1e-3); }
vec3 ycc(vec3 c){ return vec3(dot(c, vec3(0.25, 0.5, 0.25)), dot(c, vec3(0.5, 0.0, -0.5)), dot(c, vec3(-0.25, 0.5, -0.25))); }
vec3 rgb(vec3 c){ return vec3(c.x + c.y - c.z, c.x + c.z, c.x - c.y - c.z); }
void main(){
  vec2 uv = vUv + uJit, tx = uRes.zw;
  float dmin = textureLod(tDepth, uv, 0.0).r;
  dmin = min(dmin, min(min(textureLod(tDepth, uv + vec2(tx.x, 0.0), 0.0).r, textureLod(tDepth, uv - vec2(tx.x, 0.0), 0.0).r), min(textureLod(tDepth, uv + vec2(0.0, tx.y), 0.0).r, textureLod(tDepth, uv - vec2(0.0, tx.y), 0.0).r)));
  vec3 wp = worldAt(uv, min(dmin, 0.99999)); if (dmin >= 0.999999) wp = uCamPos + (wp - uCamPos) * 1e4;
  vec4 pc = uPrevViewProj * vec4(wp, 1.0); vec2 puv = pc.xy / pc.w * 0.5 + 0.5;
  vec3 c = ycc(tm(textureLod(tCur, uv, 0.0).rgb)), m1 = c, m2 = c * c;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { if (i == 0 && j == 0) continue; vec3 s = ycc(tm(textureLod(tCur, uv + vec2(float(i), float(j)) * tx, 0.0).rgb)); m1 += s; m2 += s * s; }
  m1 /= 9.0; vec3 sd = sqrt(max(m2 / 9.0 - m1 * m1, 0.0)) * 1.15 + 0.004;
  vec3 h = ycc(tm(textureLod(tHist, puv, 0.0).rgb));
  h = clamp(h, m1 - sd, m1 + sd);
  float a = uBlend; if (puv.x < 0.0 || puv.y < 0.0 || puv.x > 1.0 || puv.y > 1.0 || pc.w <= 0.0) a = 1.0;
  o = vec4(itm(rgb(mix(h, c, a))), 1.0);
}`;
  const copyFS = `//#include head
in vec2 vUv; out vec4 o; uniform sampler2D tSrc; void main(){ o = texture(tSrc, vUv); }`;
  // dual-filter bloom
  const downFS = `//#include head
in vec2 vUv; out vec4 o; uniform sampler2D tSrc; uniform vec4 uT; uniform float uFirst;
vec3 pre(vec3 c){ float l = max(c.r, max(c.g, c.b)); return uFirst > 0.5 ? c * (smoothstep(0.5, 3.0, l) * 0.92 + 0.08) / (1.0 + l * 0.03) : c; }
void main(){ vec2 h = uT.xy * 0.5; vec3 s = pre(texture(tSrc, vUv).rgb) * 4.0;
  s += pre(texture(tSrc, vUv - h).rgb) + pre(texture(tSrc, vUv + h).rgb) + pre(texture(tSrc, vUv + vec2(h.x, -h.y)).rgb) + pre(texture(tSrc, vUv + vec2(-h.x, h.y)).rgb);
  o = vec4(s / 8.0, 1.0); }`;
  const upFS = `//#include head
in vec2 vUv; out vec4 o; uniform sampler2D tSrc, tAdd; uniform vec4 uT;
void main(){ vec2 h = uT.xy * 0.5; vec3 s = texture(tSrc, vUv + vec2(-h.x * 2.0, 0.0)).rgb + texture(tSrc, vUv + vec2(h.x * 2.0, 0.0)).rgb + texture(tSrc, vUv + vec2(0.0, -h.y * 2.0)).rgb + texture(tSrc, vUv + vec2(0.0, h.y * 2.0)).rgb;
  s += (texture(tSrc, vUv + vec2(-h.x, h.y)).rgb + texture(tSrc, vUv + h).rgb + texture(tSrc, vUv + vec2(h.x, -h.y)).rgb + texture(tSrc, vUv - h).rgb) * 2.0;
  o = vec4(s / 12.0 + texture(tAdd, vUv).rgb, 1.0); }`;
  // the eye: average brightness of the smallest bloom level → exposure correction, eased over time
  const adaptFS = `//#include head
in vec2 vUv; out vec4 o; uniform sampler2D tSrc, tPrev; uniform float uExposure, uKey, uDt;
void main(){ float s = 0.0, ws = 0.0;
  for (int j = 0; j < 4; j++) for (int i = 0; i < 4; i++) { vec2 p = vec2(float(i), float(j)); vec3 c = textureLod(tSrc, (p + 0.5) / 4.0, 0.0).rgb; float w = 1.0 - 0.4 * length(p - 1.5) / 2.12; s += log(max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 1e-4)) * w; ws += w; }
  float avg = exp(s / ws), target = clamp(uKey / max(avg * uExposure, 1e-4), 0.42, 2.2);
  float prev = texture(tPrev, vec2(0.5)).r; if (prev <= 0.0) prev = target;
  o = vec4(mix(prev, target, sat(1.0 - exp(-uDt * 1.6))), 0.0, 0.0, 1.0); }`;
  const finalFS = `//#include head
//#include hash
in vec2 vUv; out vec4 o; uniform sampler2D tColor, tBloom, tAdapt; uniform vec4 uOut; uniform float uExposure, uBloomMix, uSharp, uTime; uniform vec4 uGrade, uSplit; uniform vec3 uTintG, uLiftG;
// AgX display transform (Troy Sobotka; the constants as in three.js, MIT) with a look applied in its log space:
// power = contrast, satK = colour.  Bright saturated light goes pale instead of clipping to a flat primary.
vec3 agxCurve(vec3 x){ vec3 x2 = x * x, x4 = x2 * x2; return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232; }
vec3 agx(vec3 c, float power, float satK){
  const mat3 toWide = mat3(0.6274, 0.0691, 0.0164, 0.3293, 0.9195, 0.0880, 0.0433, 0.0113, 0.8956), toSRGB = mat3(1.6605, -0.1246, -0.0182, -0.5876, 1.1329, -0.1006, -0.0728, -0.0083, 1.1187);
  const mat3 inset = mat3(0.856627153315983, 0.137318972929847, 0.11189821299995, 0.0951212405381588, 0.761241990602591, 0.0767994186031903, 0.0482516061458583, 0.101439036467562, 0.811302368396859);
  const mat3 outset = mat3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826, -0.11060664309660323, 1.157823702216272, -0.11060664309660294, -0.016493938717834573, -0.016493938717834257, 1.2519364065950405);
  c = inset * (toWide * max(c, 0.0)); c = clamp((log2(max(c, 1e-10)) + 12.47393) / 16.5, 0.0, 1.0);
  c = agxCurve(c);
  c = pow(max(c, 0.0), vec3(power)); float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = l + satK * (c - l);
  c = outset * c; c = pow(max(c, 0.0), vec3(2.2)); return clamp(toSRGB * c, 0.0, 1.0);
}
void main(){
  vec3 c = texture(tColor, vUv).rgb;
  if (uSharp > 0.0) { vec2 t = uOut.zw; vec3 n = texture(tColor, vUv + vec2(t.x, 0.0)).rgb, s = texture(tColor, vUv - vec2(t.x, 0.0)).rgb, e = texture(tColor, vUv + vec2(0.0, t.y)).rgb, w = texture(tColor, vUv - vec2(0.0, t.y)).rgb;
    vec3 mn = min(c, min(min(n, s), min(e, w))), mx = max(c, max(max(n, s), max(e, w))); c = clamp(c + (c - (n + s + e + w) * 0.25) * uSharp, mn, mx); }
  vec3 b = texture(tBloom, vUv).rgb; c = mix(c, b, uBloomMix);
  c *= uExposure * texture(tAdapt, vec2(0.5)).r;
  c *= uTintG;
  vec2 q = vUv - 0.5; c *= 1.0 - dot(q, q) * uGrade.z * 1.6;
  c = agx(c, uGrade.x, uGrade.y);
  c = max(c + uLiftG * (1.0 - c), 0.0);
  c = mix(c, c * c * (3.0 - 2.0 * c), uSplit.x);                                           // a little more shoulder and toe
  float l2 = dot(c, vec3(0.2126, 0.7152, 0.0722)); c *= mix(vec3(1.0 - 0.07 * uSplit.y, 1.0, 1.0 + 0.10 * uSplit.y), vec3(1.0 + 0.05 * uSplit.z, 1.0, 1.0 - 0.07 * uSplit.z), smoothstep(0.12, 0.75, l2));   // cool shade, warm light
  c = pow(c, vec3(1.0 / 2.2));
  float g = hash13(vec3(gl_FragCoord.xy, mod(uTime * 60.0, 1000.0))) - 0.5; c += g * uGrade.w + (hash12(gl_FragCoord.xy + 0.5) - 0.5) / 255.0;
  o = vec4(c, 1.0);
}`;

  // ── targets ─────────────────────────────────────────────────────────────────────────────────────────────────────
  const disp = (x) => { if (!x) return; if (x.depthTexture) x.depthTexture.dispose(); x.dispose(); };
  R.resize = (W, H) => {
    const G = LR.gpu; R.W = Math.max(8, W | 0); R.H = Math.max(8, H | 0); G.renderer.setSize(R.W, R.H, false);
    [R.histA, R.histB].forEach(disp); (R.bloom || []).forEach(disp);
    R.histA = LR.rt(R.W, R.H, { type: G.hdrType }); R.histB = LR.rt(R.W, R.H, { type: G.hdrType }); R.histValid = false;
    R.bloom = []; let bw = R.W >> 1, bh = R.H >> 1; for (let i = 0; i < G.tier.bloom && bw > 4 && bh > 4; i++) { R.bloom.push(LR.rt(bw, bh, { type: G.hdrType })); bw >>= 1; bh >>= 1; }
    R.bloomUp = R.bloom.slice(0, -1).map((b) => LR.rt(b.width, b.height, { type: G.hdrType }));
    PU.uOut.value.set(R.W, R.H, 1 / R.W, 1 / R.H);
    R.setScale(R.scale, true);
  };
  R.setScale = (s, force) => {
    const G = LR.gpu; R.giOn = G.tier.gi > 0 && !LR.off.has('gi'); s = LR.clamp(s, 0.35, 1); const w = Math.max(8, Math.round(R.W * s)), h = Math.max(8, Math.round(R.H * s));
    if (!force && w === R.w && h === R.h) return; R.scale = s; R.w = w; R.h = h;
    [R.gbuf, R.hdr, R.ao, R.aoB, R.air, R.copy, R.gi, R.giB].forEach(disp);
    const dt = new T.DepthTexture(w, h); dt.type = T.UnsignedIntType; dt.format = T.DepthFormat; dt.minFilter = dt.magFilter = T.NearestFilter;
    R.gbuf = LR.rt(w, h, { count: 3, depth: true, depthTexture: dt, filter: T.NearestFilter });
    R.hdr = LR.rt(w, h, { type: G.hdrType });
    const hw = Math.max(4, w >> 1), hh = Math.max(4, h >> 1);
    R.ao = LR.rt(hw, hh, { format: T.RedFormat, filter: T.NearestFilter }); R.aoB = LR.rt(hw, hh, { format: T.RedFormat, filter: T.NearestFilter });
    R.air = LR.rt(hw, hh, { type: G.hdrType, filter: T.NearestFilter }); R.copy = LR.rt(hw, hh, { type: G.hdrType });
    if (R.giOn) { R.gi = LR.rt(hw, hh, { type: G.hdrType, filter: T.NearestFilter }); R.giB = LR.rt(hw, hh, { type: G.hdrType, filter: T.NearestFilter }); }
    PU.tG0.value = R.gbuf.textures[0]; PU.tG1.value = R.gbuf.textures[1]; PU.tG2.value = R.gbuf.textures[2]; PU.tDepth.value = dt; PU.tAir.value = R.air.texture; PU.tHDR.value = R.hdr.texture; PU.tCopy.value = R.copy.texture;
    PU.uHalf.value.set(hw, hh, 1 / hw, 1 / hh); U.uRes.value.set(w, h, 1 / w, 1 / h);
  };

  R.initPost = () => {
    const G = LR.gpu, tier = G.tier, S = SKY(); R.giOn = tier.gi > 0 && !LR.off.has('gi');
    const white = new T.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); white.needsUpdate = true; R.white = white; const black = new T.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); black.needsUpdate = true; R.black = black;
    PU.uEnvMips.value = LR.sky.envMips; PU.uSharp.value = tier.taaSharp; PU.tCanopy.value = white;
    const aoQ = [[2, 3], [2, 3], [2, 4], [3, 5]][tier.ao];
    R.mAO = LR.pass(aoFS, Object.assign(LR.uni(FRAME), { tDepth: PU.tDepth, tG1: PU.tG1, uHalf: PU.uHalf }), { defines: { AO_SLICES: aoQ[0], AO_STEPS: aoQ[1] } });
    R.mAOB = LR.pass(aoBlurFS, Object.assign(LR.uni(FRAME), { tDepth: PU.tDepth, tAO: v(null), uHalf: PU.uHalf }));
    if (R.giOn) { R.mGI = LR.pass(giFS, Object.assign(LR.uni(FRAME), { tDepth: PU.tDepth, tG1: PU.tG1, tHist: v(null), uHalf: PU.uHalf }), { defines: { GI_RAYS: tier.gi | 0, GI_STEPS: 8, GI_DEBUG: LR.qn('gidbg', 0) | 0 } }); R.mGIB = LR.pass(giBlurFS, Object.assign(LR.uni(FRAME), { tDepth: PU.tDepth, tGI: v(null), uHalf: PU.uHalf })); }
    R.mAir = LR.pass(airFS, Object.assign(LR.uni(FRAME + ' ' + AIRU + ' ' + SHU), S, { tDepth: PU.tDepth, uHalf: PU.uHalf, uEnvMips: PU.uEnvMips, tCanopy: PU.tCanopy, uCanopyRect: PU.uCanopyRect, uCanopy: PU.uCanopy, uShaft: PU.uShaft }), { defines: { AIR_STEPS: tier.vol, AIR_REACH: '150.0', SHAFT_STEPS: LR.off.has('shafts') ? 0 : tier.vol >= 24 ? 36 : tier.vol >= 16 ? 28 : tier.vol >= 12 ? 20 : 0 } });
    R.mLight = LR.pass(lightFS, Object.assign(LR.uni(FRAME + ' ' + AIRU + ' ' + SHU + ' uTopo uTopoRect'), S, { tG0: PU.tG0, tG1: PU.tG1, tG2: PU.tG2, tDepth: PU.tDepth, tAO: PU.tAO, tAir: PU.tAir, uHalf: PU.uHalf, uEnvMips: PU.uEnvMips, tCanopy: PU.tCanopy, uCanopyRect: PU.uCanopyRect, uCanopy: PU.uCanopy, uLightPos: PU.uLightPos, uLightCol: PU.uLightCol, uLightN: PU.uLightN, uFill: PU.uFill, tGI: PU.tGI, uBounce: PU.uBounce, tHist: PU.tHistL, uHistOk: PU.uHistOk }), { defines: Object.assign({ SHADOW_TAPS: tier.shadowTaps, SKY_REACH: LR.off.has('skyshare') ? 0 : tier.gi >= 3 ? 2 : tier.ao > 0 ? 1 : 0, CONTACT_STEPS: LR.off.has('contact') ? 0 : tier.contact | 0, MIRROR_STEPS: LR.off.has('mirror') || tier.ssr < 18 ? 0 : tier.ssr >= 26 ? 20 : 14 }, LR.qn('dbg', 0) ? { DEBUG_VIEW: LR.qn('dbg', 0) } : {}) });
    R.mTAA = LR.pass(taaFS, Object.assign(LR.uni(FRAME), { tCur: PU.tHDR, tHist: PU.tHist, tDepth: PU.tDepth, uJit: PU.uJit, uBlend: PU.uBlend }));
    R.mCopy = LR.pass(copyFS, { tSrc: v(null) });
    R.mDown = LR.pass(downFS, { tSrc: v(null), uT: v(new T.Vector4()), uFirst: v(0) });
    R.mUp = LR.pass(upFS, { tSrc: v(null), tAdd: v(null), uT: v(new T.Vector4()) });
    R.adaptA = LR.rt(1, 1, { type: G.hdrType, filter: T.NearestFilter }); R.adaptB = LR.rt(1, 1, { type: G.hdrType, filter: T.NearestFilter });
    R.mAdapt = LR.pass(adaptFS, { tSrc: v(null), tPrev: v(null), uExposure: PU.uExposure, uKey: PU.uKey, uDt: PU.uDt });
    R.mFinal = LR.pass(finalFS, { tColor: v(null), tBloom: PU.tBloom, tAdapt: PU.tAdapt, uOut: PU.uOut, uExposure: PU.uExposure, uBloomMix: PU.uBloomMix, uSharp: PU.uSharp, uTime: U.uTime, uGrade: PU.uGrade, uSplit: PU.uSplit, uTintG: PU.uTintG, uLiftG: PU.uLiftG });
  };

  // nearest lamps and fires → the lighting pass
  const lv = new T.Vector3();
  R.gatherLights = (cam, time) => {
    const all = LR.world.lights, on = U.uWx2.value.z, max = Math.min(MAXL, LR.gpu.tier.lights), list = [];
    for (let i = 0; i < all.length; i++) { const l = all[i]; const k = l.kind === 'fire' ? Math.max(on, l.day || 0.35) : on; if (k < 0.01) continue; const dx = l.x - cam.position.x, dy = l.y - cam.position.y, dz = l.z - cam.position.z, d = Math.hypot(dx, dy, dz); if (d > 75 + l.r) continue; l._d = d; l._k = k; list.push(l); }
    list.sort((a, b) => a._d - a.r * 1.5 - (b._d - b.r * 1.5)); const n = Math.min(max, list.length);
    for (let i = 0; i < n; i++) { const l = list[i]; const f = 1 + l.flicker * (Math.sin(time * 9.1 + l.phase) * 0.5 + Math.sin(time * 14.7 + l.phase * 2.3) * 0.3 + Math.sin(time * 3.3 + l.phase * 0.7) * 0.4);
      const p = l.power * l._k * f * LR.sm(75 + l.r, 55, l._d); PU.uLightPos.value[i].set(l.x, l.y, l.z, l.r); PU.uLightCol.value[i].set(l.color[0] * p, l.color[1] * p, l.color[2] * p, 0); }
    PU.uLightN.value = n; R.info.lights = n;
  };

  // ── one frame ───────────────────────────────────────────────────────────────────────────────────────────────────
  const P0 = new T.Matrix4(), VPu = new T.Matrix4(), prevVP = new T.Matrix4();
  R.draw = (cam, time, dt) => {
    const G = LR.gpu, r = G.renderer, W = LR.world, taa = !LR.off.has('taa');
    R.frame++; r.info.reset();
    cam.updateMatrixWorld(); cam.updateProjectionMatrix(); P0.copy(cam.projectionMatrix); VPu.multiplyMatrices(P0, cam.matrixWorldInverse);
    const k = R.frame % 16, jx = taa ? LR.halton(k + 1, 2) - 0.5 : 0, jy = taa ? LR.halton(k + 1, 3) - 0.5 : 0;
    cam.projectionMatrix.elements[8] += (2 * jx) / R.w; cam.projectionMatrix.elements[9] += (2 * jy) / R.h;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    U.uProj.value.copy(cam.projectionMatrix); U.uInvProj.value.copy(cam.projectionMatrixInverse); U.uView.value.copy(cam.matrixWorldInverse);
    U.uViewProj.value.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); U.uInvViewProj.value.copy(U.uViewProj.value).invert();
    U.uPrevViewProj.value.copy(R.histValid ? prevVP : VPu); prevVP.copy(VPu);
    PU.uJit.value.set(-jx / R.w, -jy / R.h);
    U.uCamPos.value.copy(cam.position); U.uNearFar.value.set(cam.near, cam.far); U.uTime.value = time; U.uFrame.value = R.frame; PU.uDt.value = LR.RENDER && !R.film ? 10 : dt;
    R.gatherLights(cam, time);
    // shadows, then the G-buffer
    R.updateShadows(cam, LR.RENDER || R.frame < 3);
    r.setRenderTarget(R.gbuf); r.setClearColor(0x000000, 0); r.clear(true, true, false); r.render(W.scene, cam);
    R.info.calls = r.info.render.calls; R.info.tris = r.info.render.triangles;
    // occlusion and air at half size
    if (G.tier.ao > 0 && !LR.off.has('ao')) { LR.blit(R.mAO, R.ao); R.mAOB.uniforms.tAO.value = R.ao.texture; LR.blit(R.mAOB, R.aoB); PU.tAO.value = R.aoB.texture; } else PU.tAO.value = R.white;
    LR.blit(R.mAir, R.air);
    // bounce: from last frame's picture (none on the first frame after a cut)
    if (R.giOn && R.histValid && taa) { R.mGI.uniforms.tHist.value = (R.frame & 1 ? R.histB : R.histA).texture; LR.blit(R.mGI, R.gi); R.mGIB.uniforms.tGI.value = R.gi.texture; LR.blit(R.mGIB, R.giB); PU.tGI.value = R.giB.texture; } else PU.tGI.value = R.black;
    { const ok = R.histValid && taa; PU.tHistL.value = ok ? (R.frame & 1 ? R.histB : R.histA).texture : R.black; PU.uHistOk.value = ok ? 1 : 0; }
    LR.blit(R.mLight, R.hdr);
    // see-through things: water reads a half-size copy of the lit picture
    if (W.forward.children.length) { R.mCopy.uniforms.tSrc.value = R.hdr.texture; LR.blit(R.mCopy, R.copy); r.setRenderTarget(R.hdr); r.render(W.forward, cam); }
    cam.projectionMatrix.copy(P0); cam.projectionMatrixInverse.copy(P0).invert();
    // resolve onto the canvas grid
    let colorTex;
    if (taa) { const dst = R.frame & 1 ? R.histA : R.histB, src = R.frame & 1 ? R.histB : R.histA; PU.tHist.value = src.texture; PU.uBlend.value = R.histValid ? (LR.RENDER && !R.film ? Math.max(0.06, 1 / Math.min(R.frame, 16)) : 0.1) : 1; LR.blit(R.mTAA, dst); R.histValid = true; colorTex = dst.texture; }
    else colorTex = R.hdr.texture;
    // bloom
    const B = R.bloom, BU = R.bloomUp;
    if (B.length && !LR.off.has('bloom')) {
      let src = colorTex, sw = R.W, sh = R.H;
      for (let i = 0; i < B.length; i++) { R.mDown.uniforms.tSrc.value = src; R.mDown.uniforms.uT.value.set(1 / sw, 1 / sh, 0, 0); R.mDown.uniforms.uFirst.value = i === 0 ? 1 : 0; LR.blit(R.mDown, B[i]); src = B[i].texture; sw = B[i].width; sh = B[i].height; }
      let up = B[B.length - 1];
      for (let i = B.length - 2; i >= 0; i--) { R.mUp.uniforms.tSrc.value = up.texture; R.mUp.uniforms.tAdd.value = B[i].texture; R.mUp.uniforms.uT.value.set(1 / up.width, 1 / up.height, 0, 0); LR.blit(R.mUp, BU[i]); up = BU[i]; }
      PU.tBloom.value = up.texture;
      const a = R.frame & 1 ? R.adaptA : R.adaptB, b = R.frame & 1 ? R.adaptB : R.adaptA; R.mAdapt.uniforms.tSrc.value = B[B.length - 1].texture; R.mAdapt.uniforms.tPrev.value = b.texture; LR.blit(R.mAdapt, a); PU.tAdapt.value = a.texture;
    } else { PU.tBloom.value = colorTex; PU.tAdapt.value = R.white; }
    R.mFinal.uniforms.tColor.value = colorTex;
    r.setRenderTarget(null); r.setViewport(0, 0, R.W, R.H); LR.blit(R.mFinal, null);
    R.info.allCalls = r.info.render.calls;
  };
}

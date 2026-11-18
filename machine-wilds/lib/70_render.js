// machine-wilds · 70_render — what is drawn into the G-buffer (built things, the land), the cascaded sun shadow with
// staggered updates, and the top-down rain map (which surfaces have open sky above them).
{
  const T = THREE, U = LR.U;
  const R = (LR.render = { frame: 0, scale: 1, info: {} });
  const FRAME = 'uTime uFrame uRes uCamPos uNearFar uViewProj uInvViewProj uPrevViewProj uView uProj uInvProj uWx uWx2 uWind uNoise uLod';
  R.FRAME = FRAME;

  // ── built things ────────────────────────────────────────────────────────────────────────────────────────────────
  const worldVS = `//#include head
//#include frame
//#include wind
in vec3 position; in vec4 normal; in vec2 uv; in vec4 color; in vec4 meta;
uniform mat4 projectionMatrix, viewMatrix, modelMatrix;
out vec3 vWorld; out vec3 vN; out vec2 vUv; out vec4 vCol; flat out vec4 vMeta;
#ifdef SKIN
// a machine: every vertex rides one bone; the bone's place this frame is three texels (the rows of a 3 × 4 matrix that
// takes the rest pose to the world) in the row of the texture that is this machine's
in float bone; uniform highp sampler2D tBones; uniform vec4 uBone; out vec3 vRest;
#endif
void main(){
  vec3 p = position, nrm = normal.xyz; int flags = int(meta.y + 0.5);
#ifdef KINETIC
  p = (modelMatrix * vec4(p, 1.0)).xyz; nrm = mat3(modelMatrix) * nrm;
#endif
#ifdef SKIN
  { ivec2 q = ivec2(int(bone + 0.5) * 3, int(uBone.x + 0.5)); vec4 r0 = texelFetch(tBones, q, 0), r1 = texelFetch(tBones, q + ivec2(1, 0), 0), r2 = texelFetch(tBones, q + ivec2(2, 0), 0);
    vRest = position; p = vec3(dot(r0.xyz, position) + r0.w, dot(r1.xyz, position) + r1.w, dot(r2.xyz, position) + r2.w); nrm = vec3(dot(r0.xyz, nrm), dot(r1.xyz, nrm), dot(r2.xyz, nrm)); }
#endif
  if ((flags & 4) != 0) { float w = meta.w / 255.0, g = gustAt(p.xz, uTime), ph = dot(p.xz, vec2(1.7, 2.3));
    p.xz += uWind.xy * (g * 0.32 + sin(uTime * 3.1 + ph + p.y * 2.0) * 0.05 * (0.5 + uWind.z)) * w; p.y += sin(uTime * 2.3 + ph) * 0.03 * w; }
  vWorld = p; vN = nrm; vUv = uv; vCol = color; vMeta = meta;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
  const worldFS = `//#include head
//#include hash
//#include pack
//#include frame
//#include mats
//#include weather
//#include gout
in vec3 vWorld; in vec3 vN; in vec2 vUv; in vec4 vCol; flat in vec4 vMeta;
uniform vec4 uMatP[48]; uniform vec4 uMatQ[48];
#ifdef SKIN
in vec3 vRest; uniform vec4 uBone;      // stains, moss and grain are laid in the machine's own space: they walk with it
#define SP vRest
#else
#define SP vWorld
#endif
void main(){
  float layer = floor(vMeta.x + 0.5); int li = int(layer), flags = int(vMeta.y + 0.5);
  vec3 Ng = normalize(vN); if (!gl_FrontFacing) Ng = -Ng;
  mat3 tbn = cotFrame(Ng, vWorld, vUv);
  vec2 uv = vUv; vec4 P = uMatP[li], Q = uMatQ[li];
#ifdef POM
  // relief: walk the eye's ray down through the height field (eight layers, then one interpolation) so stones stand
  // out of their joints and slide against each other as you pass
  if (P.w > 0.0) { vec3 V = normalize(uCamPos - vWorld); vec3 vt = vec3(dot(V, tbn[0]), dot(V, tbn[1]), dot(V, tbn[2])); float fade = smoothstep(24.0, 9.0, distance(uCamPos, vWorld));
    if (fade > 0.0 && vt.z > 0.02) { vec2 gx = dFdx(vUv) * LODK, gy = dFdy(vUv) * LODK, shift = vt.xy / max(vt.z, 0.3) * P.w * fade * 1.6, st = shift / 8.0, cu = uv + shift * 0.38;
      float cur = 0.0, dep = 1.0 - textureGrad(uMatA, vec3(cu, layer), gx, gy).a, prevDep = dep;
      for (int i = 0; i < 8; i++) { if (cur >= dep) break; cu -= st; cur += 0.125; prevDep = dep; dep = 1.0 - textureGrad(uMatA, vec3(cu, layer), gx, gy).a; }
      float after = dep - cur, before = prevDep - cur + 0.125; uv = mix(cu, cu + st, sat(after / min(after - before, -1e-4))); } }
#endif
  vec4 a = texture(uMatA, vec3(uv, layer), uLod), b = texture(uMatB, vec3(uv, layer), uLod);      // uLod: as fine as the canvas asks, when the frame is smaller than the canvas
  vec3 tint = vCol.rgb * 2.0; tint *= tint;
  if (Q.z > 0.0) tint = mix(vec3(1.0), tint, smoothstep(0.36, 0.47, a.a));               // where the paint has flaked the wood is its own colour
  vec3 albedo = a.rgb * a.rgb * tint;
  vec3 N = normalize(tbn * nrmDec(b.xy));
  float rough = b.z, ao = b.w * vCol.a, emis = 0.0, metal = Q.x, snow = 0.0, h = a.a;
  // at arm's length a baked texel is a centimetre wide and the surface goes smooth: a fine grain on top (normal, tone,
  // roughness) holds it together until the eye is against the wall
  { float near = smoothstep(8.0, 1.6, distance(uCamPos, vWorld)); if (near > 0.0) { vec4 d1 = texture(uNoise, uv * 19.0), d2 = texture(uNoise, uv * 67.0 + 0.31);
      vec2 dg = vec2(d1.r - d1.g + (d2.b - d2.a) * 0.7, d1.b - d1.a + (d2.r - d2.g) * 0.7) * 0.5 * near * (1.0 - metal * 0.6);
      N = normalize(N + tbn[0] * dg.x + tbn[1] * dg.y); albedo *= 1.0 + (d2.r - 0.5) * 0.18 * near; rough = sat(rough + (d1.g - 0.5) * 0.14 * near); } }
  // nothing built is clean: grime where it is creased or low, and broad stains so no wall is one flat colour
  { vec4 st = texture(uNoise, SP.xz * 0.063 + SP.y * 0.097), st2 = texture(uNoise, vec2(SP.x + SP.z, SP.y) * 0.31);
    float grime = smoothstep(1.0, 0.5, vCol.a) * (0.55 + 0.45 * st2.g);
    albedo *= mix(vec3(1.0), vec3(0.62, 0.57, 0.50), grime * 0.6 * (1.0 - metal));
    albedo *= 0.86 + 0.26 * st.r; rough = min(1.0, rough + grime * 0.1); }
#ifdef SKIN
  // a machine left out for decades: where the kit has aged it (the vertex's alpha) the steel under the paint and behind the
  // shells comes through as rust that has run down from seams and fittings — long streaks, laid in the machine's own space
  if (Q.y > 0.0 && (flags & 64) == 0) { float age = smoothstep(0.93, 0.5, vCol.a); if (age > 0.0) {
      vec4 r1 = texture(uNoise, vec2((SP.x + SP.z * 0.8) * 0.23, SP.y * 0.034) + 0.37), r2 = texture(uNoise, SP.xz * 0.41 + SP.y * 0.33);
      float rust = smoothstep(0.50, 0.70, r1.r * 0.62 + r2.g * 0.38 + age * 0.34 - 0.12) * age;
      albedo = mix(albedo, vec3(0.20, 0.088, 0.04) * (0.65 + 0.7 * r2.b), rust * 0.86); rough = mix(rough, 0.92, rust); metal *= 1.0 - rust * 0.85; } }
#endif
  // old plaster lets go: where it is low, creased or simply unlucky a patch has fallen and the brick behind shows
  if (li == PLASTER_LAYER) {
    vec2 wq = vec2(vWorld.x * -Ng.z + vWorld.z * Ng.x, vWorld.y);                           // along the wall, up the wall
    float big = texture(uNoise, wq * 0.043 + 0.13).b, mid = texture(uNoise, wq * 0.21 + 0.4).r, fine = texture(uNoise, wq * 1.1).g;
    float lost = smoothstep(0.405, 0.45, big * 0.62 + mid * 0.30 + fine * 0.07 + (1.0 - vCol.a) * 0.22 - 0.26);
    if (lost > 0.0) {
      vec2 bu = wq * 0.72; vec4 ba = texture(uMatA, vec3(bu, float(BRICK_LAYER)), uLod), bb = texture(uMatB, vec3(bu, float(BRICK_LAYER)), uLod);
      float rim = lost * (1.0 - lost) * 4.0;
      albedo = mix(albedo, ba.rgb * ba.rgb * (0.78 + 0.3 * mid), lost) * (1.0 - 0.45 * rim);
      N = normalize(mix(N, tbn * nrmDec(bb.xy), lost)); rough = mix(rough, bb.z, lost); ao *= mix(1.0, 0.86 * bb.w, lost); h = mix(h, ba.a * 0.6, lost);
    }
  }
  // moss and damp where things face north-ish, sit low, or hold water
  if (Q.y > 0.0) {
    vec4 nz = texture(uNoise, SP.xz * 0.13 + SP.y * 0.09), nz2 = texture(uNoise, SP.xz * 0.021 + SP.y * 0.013 + 0.4);
    float shade = sat(0.5 - Ng.z * 0.5) * 0.5 + sat(Ng.y) * 0.25;                           // north faces and tops keep damp
    float m = Q.y * (nz2.r * 1.1 + shade * 0.5 - 1.02) + (nz.g - 0.5) * 0.5 - (h - 0.42) * 1.15 + (1.0 - vCol.a) * 0.75 + uWx.x * 0.08;
    m = smoothstep(0.0, 0.2, m) * (1.0 - uWx.w * 0.5);
    if (m > 0.0) { vec4 ma = texture(uMatA, vec3(SP.xz * 0.9 + SP.y * 0.7, float(MOSS_LAYER))); albedo = mix(albedo, ma.rgb * ma.rgb * 0.7, m * 0.8); rough = mix(rough, 0.95, m); }
  }
  if ((flags & 1) != 0) {                                                   // a window: dark glass by day, lit from inside at night
    float seed = vMeta.z, on = step(hash11(seed * 7.13 + 2.0), uWx2.z * 1.25 - 0.12);
    float pane = smoothstep(0.92, 0.75, h);
    float flick = 0.86 + 0.14 * sin(uTime * (5.0 + hash11(seed) * 9.0) + seed) * sin(uTime * 2.3 + seed * 3.0);
    vec3 warm = mix(vec3(1.0, 0.52, 0.18), vec3(1.0, 0.72, 0.38), hash11(seed * 3.7));
    float inner = 0.55 + 0.45 * vnoise(vUv * 2.2 + seed);
    float lit = on * pane * inner * flick * smoothstep(0.0, 0.4, uWx2.z);
    albedo = mix(albedo, warm, lit); emis = lit * 1.5; rough = mix(rough, 0.3, lit);
  }
  if ((flags & 8) != 0) { float g = (vMeta.w / 255.0) * uWx2.z; albedo = mix(albedo, vec3(1.0, 0.62, 0.26), sat(g * 1.5)); emis = max(emis, g * 5.0); }
  if ((flags & 32) != 0) { float f = 0.75 + 0.25 * sin(uTime * 11.0 + vWorld.x * 3.0) * sin(uTime * 7.3 + vWorld.z * 2.0); albedo = mix(albedo, vec3(1.0, 0.42, 0.12), 0.9); emis = (vMeta.w / 255.0) * 9.0 * f; }
#ifdef SKIN
  if ((flags & 64) != 0) { albedo = tint; emis = (vMeta.w / 255.0) * uBone.y; rough = 0.25; metal = 0.0; }      // a lens: its colour rides the vertex, its strength the machine
#endif
  if ((flags & 2) == 0) snow = applyWeather(albedo, N, rough, ao, h, vWorld, Ng, P.x, P.y, P.z);
  writeG(albedo, ao, N, rough, metal, 0.0, emis, snow);
}`;
  const matParams = () => { const P = LR.mat.params, Q = []; for (let i = 0; i < 48; i++) { const d = LR.mat.defs[i]; Q.push(new T.Vector4(d ? d.metal || 0 : 0, d ? d.moss || 0 : 0, d ? d.paint || 0 : 0, 0)); } return { uMatP: { value: P }, uMatQ: { value: Q } }; };
  const defs = () => ({ SNOW_LAYER: LR.mat.L('snow'), MOSS_LAYER: LR.mat.L('moss'), PLASTER_LAYER: LR.mat.L('plaster'), BRICK_LAYER: LR.mat.L('brick') });
  const cache = {};
  R.matWorld = (o = {}) => {
    const key = 'w' + (o.double ? 'd' : 's') + (o.kinetic ? 'k' : ''); if (cache[key]) return cache[key];
    const d = defs(); if (LR.gpu.tier.pom) d.POM = 1; if (o.kinetic) d.KINETIC = 1;
    return (cache[key] = LR.material({ vertexShader: worldVS, fragmentShader: worldFS, defines: d, side: o.double ? T.DoubleSide : T.FrontSide,
      uniforms: Object.assign(LR.uni(FRAME + ' uMatA uMatB uTopo uTopoRect'), matParams()) }));
  };
  // a machine's own material (one per unit: its row in the bone texture and its lights' strength are its own uniforms)
  R.matMech = (o) => { const d = defs(); d.SKIN = 1; return LR.material({ vertexShader: worldVS, fragmentShader: worldFS, defines: d, side: T.DoubleSide,
    uniforms: Object.assign(LR.uni(FRAME + ' uMatA uMatB uTopo uTopoRect'), matParams(), { tBones: o.tBones, uBone: o.uBone }) }); };
  R.matMechShadow = (o) => LR.material({ vertexShader: shadowVS, fragmentShader: shadowFS, defines: { BUILT: 1, SKIN: 1 }, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1.6, polygonOffsetUnits: 2.5, uniforms: Object.assign(LR.uni(FRAME), { tBones: o.tBones, uBone: o.uBone }) });
  // depth only, for the shadow atlas
  const shadowVS = `//#include head
//#include frame
//#include wind
in vec3 position; in vec4 meta; uniform mat4 projectionMatrix, viewMatrix, modelMatrix;
#ifdef SKIN
in float bone; uniform highp sampler2D tBones; uniform vec4 uBone;
#endif
void main(){ vec3 p = position;
#ifdef KINETIC
  p = (modelMatrix * vec4(p, 1.0)).xyz;
#endif
#ifdef SKIN
  { ivec2 q = ivec2(int(bone + 0.5) * 3, int(uBone.x + 0.5)); vec4 r0 = texelFetch(tBones, q, 0), r1 = texelFetch(tBones, q + ivec2(1, 0), 0), r2 = texelFetch(tBones, q + ivec2(2, 0), 0);
    p = vec3(dot(r0.xyz, position) + r0.w, dot(r1.xyz, position) + r1.w, dot(r2.xyz, position) + r2.w); }
#endif
#ifdef BUILT
  int flags = int(meta.y + 0.5); if ((flags & 4) != 0) { float w = meta.w / 255.0, g = gustAt(p.xz, uTime); p.xz += uWind.xy * g * 0.32 * w; }
#endif
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`;
  const shadowFS = `precision highp float; out vec4 o; void main(){ ${LR.SHADOW_OUT} }`;
  R.matShadow = (o = {}) => {
    const key = 's' + (o.terrain ? 't' : 'b') + (o.kinetic ? 'k' : '') + (o.back ? 'x' : ''); if (cache[key]) return cache[key];             // back: only the faces turned from the light (a stand-in hull that must not shade what it stands for)
    return (cache[key] = LR.material({ vertexShader: shadowVS, fragmentShader: shadowFS, defines: Object.assign(o.terrain ? {} : { BUILT: 1 }, o.kinetic ? { KINETIC: 1 } : {}), side: o.terrain ? T.FrontSide : o.back ? T.BackSide : T.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: o.terrain ? 2.5 : 1.6, polygonOffsetUnits: o.terrain ? 4 : 2.5, uniforms: LR.uni(FRAME) }));
  };
  R.matTopo = () => cache.topo || (cache.topo = LR.material({ side: T.DoubleSide,
    // what sways in the wind is no roof (flags, washing, pot plants, hanging signs): it keeps nothing under it dry
    vertexShader: `precision highp float; in vec3 position; in vec4 meta; uniform mat4 projectionMatrix, viewMatrix; out float vY; out float vSway; void main(){ vY = position.y; vSway = (int(meta.y + 0.5) & 4) != 0 ? 1.0 : 0.0; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `precision highp float; in float vY; in float vSway; out vec4 o; void main(){ if (vSway > 0.5) discard; o = vec4(vY, 0.0, 0.0, 1.0); }`, uniforms: {} }));

  // ── the land ────────────────────────────────────────────────────────────────────────────────────────────────────
  // one colour law for grass, shared by the ground under it and the blades on it
  LR.chunk.grasscol = `
vec3 grassTint(vec2 xz, float tall){
  float a = texture(uNoise, xz * 0.0041).r, b = texture(uNoise, xz * 0.019 + 0.3).g, c = texture(uNoise, xz * 0.083 + 0.7).b;
  vec3 lush = vec3(0.070, 0.132, 0.034), mid = vec3(0.110, 0.158, 0.046), dry = vec3(0.215, 0.200, 0.078), deep = vec3(0.040, 0.088, 0.030);
  vec3 col = mix(lush, mid, smoothstep(0.3, 0.7, a)); col = mix(col, dry, smoothstep(0.52, 0.9, b * 0.6 + a * 0.4) * (0.35 + 0.5 * tall)); col = mix(col, deep, smoothstep(0.6, 0.95, c) * 0.5);
  float s = uWx.w;                                                          // toward winter: straw, then grey-brown
  col = mix(col, vec3(0.22, 0.19, 0.07), smoothstep(0.15, 0.6, s + (a - 0.5) * 0.3)); col = mix(col, vec3(0.13, 0.11, 0.07), smoothstep(0.6, 1.0, s) * 0.7);
  return col * (0.85 + 0.3 * c);
}`;
  const landVS = `//#include head
in vec3 position; in vec4 normal; in vec4 biome; uniform mat4 projectionMatrix, viewMatrix;
out vec3 vWorld; out vec3 vN; out vec4 vBiome;
void main(){ vWorld = position; vN = normal.xyz; vBiome = biome; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`;
  const landFS = `//#include head
//#include hash
//#include pack
//#include frame
//#include mats
//#include weather
//#include grasscol
//#include gout
in vec3 vWorld; in vec3 vN; in vec4 vBiome;
uniform sampler2D uSplat, uCover; uniform vec4 uLandRect; uniform float uWaterY; uniform vec4 uMatP[48];
uniform vec4 uTiles;                                                         // 1/tile of turf, dirt, cobble, litter
uniform vec4 uTiles2;                                                        // 1/tile of rock, gravel
vec3 gAlb; vec3 gNt; float gRough, gAo, gH, gPor, gPud;
float hb(float w, float hNew, float hOld){ return sat((w - 0.5) * 2.3 + (hNew - hOld) * 1.1 * (1.0 - abs(w * 2.0 - 1.0)) + 0.5); }
#ifdef NOTILE
// A tile laid edge to edge shows its repeat from any height: the same dark stone every two metres.  So each layer is
// read twice, each copy moved by an offset that changes from patch to patch of a slow noise (no two patches alike, and
// the noise itself never repeats), and the two are joined along whichever stands taller — the join runs round stones
// and clods, not through them.  Offsets only: the grain keeps its direction and its normals stay true.
float ntPick(vec2 p, float layer, out vec2 oa, out vec2 ob){
  p += layer * 13.7; float k = vnoise(p) * 0.62 + vnoise(p * 2.7 + 5.3) * 0.38, l = k * 7.0, i = floor(l);
  oa = hash22(vec2(i, layer + 0.5)); ob = hash22(vec2(i + 1.0, layer + 0.5)); return l - i; }
void ntRead(float layer, vec2 uv, vec2 dx, vec2 dy, vec2 p, out vec4 a, out vec4 b){
  vec2 oa, ob; float f = ntPick(p, layer, oa, ob);
  a = textureGrad(uMatA, vec3(uv + oa, layer), dx, dy); vec4 a2 = textureGrad(uMatA, vec3(uv + ob, layer), dx, dy);
  float m = smoothstep(0.36, 0.64, f + (a2.a - a.a) * 0.35);
  if (m < 0.002) b = textureGrad(uMatB, vec3(uv + oa, layer), dx, dy); else if (m > 0.998) b = textureGrad(uMatB, vec3(uv + ob, layer), dx, dy);
  else b = mix(textureGrad(uMatB, vec3(uv + oa, layer), dx, dy), textureGrad(uMatB, vec3(uv + ob, layer), dx, dy), m);
  a = mix(a, a2, m); }
#endif
void lay(float layer, float w, vec2 uv, vec2 dx, vec2 dy){
#ifdef NOTILE
  vec4 a, b; ntRead(layer, uv, dx, dy, vWorld.xz * NT_PATCH, a, b);
#else
  vec4 a = textureGrad(uMatA, vec3(uv, layer), dx, dy), b = textureGrad(uMatB, vec3(uv, layer), dx, dy);
#endif
  float m = hb(w, a.a, gH); vec4 P = uMatP[int(layer)];
  gAlb = mix(gAlb, a.rgb * a.rgb, m); gNt = mix(gNt, nrmDec(b.xy), m); gRough = mix(gRough, b.z, m); gAo = mix(gAo, b.w, m); gH = mix(gH, a.a, m); gPor = mix(gPor, P.x, m); gPud = mix(gPud, P.y, m);
}
void main(){
  vec3 Ng = normalize(vN); float dist = distance(vWorld, uCamPos), inner = vBiome.a;
  vec2 luv = (vWorld.xz - uLandRect.xy) * uLandRect.zw; vec4 sp = texture(uSplat, luv), cv = texture(uCover, luv);
  vec2 xz = vWorld.xz, dx = dFdx(xz) * LODK, dy = dFdy(xz) * LODK;
  vec4 nz = texture(uNoise, xz * 0.031);
  float slope = 1.0 - Ng.y;
  // turf: the grass colour law, with the texture as detail around it
  vec2 uvT = xz * uTiles.x;
#ifdef NOTILE
  vec4 ta, tb, ta2; ntRead(float(L_TURF), uvT, dx * uTiles.x, dy * uTiles.x, xz * NT_PATCH, ta, tb);
  { vec2 oa, ob, u2 = uvT * 0.19 + 0.37, gx = dx * uTiles.x * 0.19, gy = dy * uTiles.x * 0.19; float f = ntPick(xz * NT_PATCH * 0.23 + 31.0, float(L_TURF), oa, ob);       // the far copy: wider patches
    ta2 = mix(textureGrad(uMatA, vec3(u2 + oa, float(L_TURF)), gx, gy), textureGrad(uMatA, vec3(u2 + ob, float(L_TURF)), gx, gy), smoothstep(0.3, 0.7, f)); }
#else
  vec4 ta = texture(uMatA, vec3(uvT, float(L_TURF)), uLod), tb = texture(uMatB, vec3(uvT, float(L_TURF)), uLod);
  vec4 ta2 = texture(uMatA, vec3(uvT * 0.19 + 0.37, float(L_TURF)));
#endif
  vec3 detail = ta.rgb * ta.rgb / vec3(0.085, 0.150, 0.026); detail = mix(detail, ta2.rgb * ta2.rgb / vec3(0.085, 0.150, 0.026), smoothstep(12.0, 60.0, dist));
  float grassy = mix(1.0, sp.a, inner);
  vec3 gcol = grassTint(xz, cv.g) * clamp(detail, 0.35, 2.2);
  gcol = mix(vec3(0.085, 0.066, 0.045) * (0.7 + 0.6 * ta.a), gcol, smoothstep(0.02, 0.5, grassy));       // bare soil where nothing grows
  // under standing grass the ground is dark earth and old thatch: the blades carry the green and the gaps give it depth;
  // beyond the reach of the blades the ground takes the meadow's colour again
  { float blades = smoothstep(0.22, 0.7, grassy) * (1.0 - smoothstep(uTiles2.z * 0.22, uTiles2.z * 0.8, dist)) * step(1.0, uTiles2.z) * (1.0 - uWx.z);
    gcol = mix(gcol, mix(vec3(0.026, 0.028, 0.014), gcol, 0.22) * (0.7 + 0.6 * ta.a), blades * 0.9); }
  gAlb = gcol; gNt = nrmDec(tb.xy); gRough = tb.z; gAo = mix(tb.w, 1.0, smoothstep(8.0, 40.0, dist)); gH = ta.a; gPor = 0.6; gPud = 0.5 * (1.0 - smoothstep(0.1, 0.6, grassy));
  float wLit = sp.b * inner, wDirt = sp.r * inner, wPav = sp.g * inner, wShore = cv.b * inner;
  { float rag = texture(uNoise, xz * 0.83).r * 0.6 + texture(uNoise, xz * 0.21 + 0.3).b * 0.4 - 0.5;        // nothing trodden has a ruled edge
    wDirt = sat(wDirt + rag * 1.5 * wDirt * (1.0 - wDirt) * 4.0); wPav = sat(wPav + rag * 0.8 * wPav * (1.0 - wPav) * 4.0); }
  { float worn = texture(uNoise, xz * 0.017 + 0.61).g * 0.65 + nz.a * 0.35; float gap = smoothstep(0.54, 0.74, worn) * wPav; wPav *= 1.0 - gap * 0.55; wDirt = max(wDirt, gap * 0.8); }   // worn paving: earth shows through
  float wRock = smoothstep(0.30, 0.52, slope + (nz.r - 0.5) * 0.16) * mix(1.0, 0.0, wPav);
  if (wLit > 0.004) lay(float(L_LITTER), wLit, xz * uTiles.w, dx * uTiles.w, dy * uTiles.w);
  if (wDirt > 0.004) lay(float(L_DIRT), wDirt, xz * uTiles.y, dx * uTiles.y, dy * uTiles.y);
  if (wShore > 0.004) lay(float(L_GRAVEL), wShore, xz * uTiles2.y, dx * uTiles2.y, dy * uTiles2.y);
  if (wPav > 0.004) {                                                       // a street is relaid in stretches by different hands: other sizes, other directions
    vec2 uc = xz * uTiles.z; float pn = texture(uNoise, xz * 0.031 + 0.21).r, sc = 1.0;
    if (pn > 0.57) { uc = mat2(0.80, 0.60, -0.60, 0.80) * uc * 1.31 + 0.37; sc = 1.31; } else if (pn < 0.34) { uc = mat2(0.94, -0.34, 0.34, 0.94) * uc * 0.83; sc = 0.83; }
    lay(float(L_COBBLE), wPav, uc, dx * uTiles.z * sc, dy * uTiles.z * sc); }
  if (wRock > 0.004) lay(float(L_ROCK), wRock, xz * uTiles2.x + vWorld.y * 0.13, dx * uTiles2.x, dy * uTiles2.x);
  // far country: forest as paint, bare rock, snow line
  float far = 1.0 - inner;
  if (far > 0.0 || vBiome.r + vBiome.g + vBiome.b > 0.003) {
    vec4 fz = texture(uNoise, xz * 0.0062), fz2 = texture(uNoise, xz * 0.031 + 0.2);
    float canopy = fz2.r * 0.6 + fz2.g * 0.4;
    vec3 green = mix(vec3(0.008, 0.019, 0.009), vec3(0.022, 0.043, 0.015), canopy) * (0.75 + 0.5 * fz.g);      // a wood seen from across a valley is dark: its crowns shade each other (spruce, not meadow)
    vec3 autumn = mix(vec3(0.16, 0.085, 0.022), vec3(0.20, 0.14, 0.03), fz.b), bare = vec3(0.075, 0.062, 0.050) * (0.8 + 0.4 * canopy);
    vec3 fc = mix(green, autumn, smoothstep(0.2, 0.55, uWx.w + (fz.r - 0.5) * 0.3) * 0.85); fc = mix(fc, mix(bare, green * 0.8, step(0.72, fz.a)), smoothstep(0.55, 0.95, uWx.w));
    float fw = vBiome.r;
    gAlb = mix(gAlb, fc, fw); gRough = mix(gRough, 0.95, fw); gNt = normalize(mix(gNt, vec3((fz2.r - 0.5) * 1.6, (fz2.g - 0.5) * 1.6, 0.6), fw)); gAo = mix(gAo, 0.55 + 0.45 * canopy, fw);
    vec3 rc = mix(vec3(0.19, 0.185, 0.18), vec3(0.30, 0.27, 0.23), fz.r) * (0.7 + 0.6 * fz2.b);
    gAlb = mix(gAlb, rc, vBiome.g * (1.0 - wRock)); gAlb = mix(gAlb, vec3(0.86, 0.89, 0.93), vBiome.b); gRough = mix(gRough, 0.6, vBiome.b);
  }
  // large-scale light and dark so tiling never shows
  float macro = texture(uNoise, xz * 0.0031).g * 0.6 + nz.b * 0.4; gAlb *= mix(0.78, 1.18, macro);
  mat3 tbn = mat3(normalize(cross(vec3(0., 0., 1.), Ng)), normalize(cross(Ng, vec3(1., 0., 0.))), Ng);
  vec3 N = normalize(tbn * mix(gNt, vec3(0., 0., 1.), smoothstep(30.0, 140.0, dist) * 0.8));
  { float near = smoothstep(8.0, 1.6, dist) * inner; if (near > 0.0) { vec4 d1 = texture(uNoise, xz * 7.3), d2 = texture(uNoise, xz * 26.0 + 0.31);          // the same fine grain underfoot
      vec2 dg = vec2(d1.r - d1.g + (d2.b - d2.a) * 0.7, d1.b - d1.a + (d2.r - d2.g) * 0.7) * 0.5 * near;
      N = normalize(N + tbn[0] * dg.x + tbn[1] * dg.y); gAlb *= 1.0 + (d2.r - 0.5) * 0.2 * near; gRough = sat(gRough + (d1.g - 0.5) * 0.14 * near); } }
  // under the water line the bed is dark and wet
  float sub = smoothstep(0.62, 0.98, cv.b) * inner; gAlb *= mix(1.0, 0.45, sub); gRough = mix(gRough, 0.3, sub * 0.6);
  float ao = gAo; vec3 alb = gAlb; float rough = gRough;
  float snow = applyWeather(alb, N, rough, ao, gH, vWorld, Ng, gPor, gPud * (1.0 - sub), mix(1.0, 0.75, vBiome.r) * (1.0 - smoothstep(0.9, 1.0, cv.b) * inner));     // snow lies on the shore, not on the bed
  writeG(alb, ao, N, rough, 0.0, 0.0, 0.0, snow);
}`;
  R.matTerrain = () => {
    if (cache.land) return cache.land; const M = LR.mat, Ld = LR.land;
    const d = Object.assign(defs(), { L_TURF: M.L('turf'), L_DIRT: M.L('dirt'), L_COBBLE: M.L('cobble'), L_LITTER: M.L('litter'), L_ROCK: M.L('rock'), L_GRAVEL: M.L('gravel') });
    // high and ultra read each ground layer twice so its tile never shows a repeat (?off=notile to compare); NT_PATCH: patches per metre
    if ((LR.gpu.tier.name === 'high' || LR.gpu.tier.name === 'ultra') && !LR.off.has('notile')) { d.NOTILE = 1; d.NT_PATCH = (LR.qn('ntpatch', 0.3)).toFixed(4); }
    return (cache.land = LR.material({ vertexShader: landVS, fragmentShader: landFS, defines: d,
      uniforms: Object.assign(LR.uni(FRAME + ' uMatA uMatB uTopo uTopoRect'), matParams(), Ld.U, {
        uTiles: { value: new T.Vector4(1 / M.tile('turf'), 1 / M.tile('dirt'), 1 / M.tile('cobble'), 1 / M.tile('litter')) }, uTiles2: { value: new T.Vector4(1 / M.tile('rock'), 1 / M.tile('gravel'), LR.off.has('grass') ? 0 : LR.gpu.tier.grassDist, 0) } }) }));
  };

  // ── the rain map: looking straight down, the height of the highest built surface ────────────────────────────────
  R.bakeTopo = (half = 192) => {
    const G = LR.gpu, size = G.tier.topo, r = G.renderer;
    const rt = LR.rt(size, size, { type: T.HalfFloatType, format: T.RedFormat, depth: true, filter: T.LinearFilter });
    const cam = new T.OrthographicCamera(-half, half, half, -half, 0.5, 600); cam.position.set(0, 400, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    r.setRenderTarget(rt); r.setClearColor(new T.Color(-500, 0, 0), 1); r.clear(true, true, false); r.render(LR.world.topoScene, cam); r.setRenderTarget(null); r.setClearColor(0x000000, 1);
    // looking down with up = -z: texture u runs with +x, v runs with -z → flip v in the rect
    U.uTopo.value = rt.texture; U.uTopoRect.value.set(-half, half, 1 / (2 * half), -1 / (2 * half)); R.topo = rt;
  };

  // ── cascaded shadow atlas ───────────────────────────────────────────────────────────────────────────────────────
  const SH = (R.shadow = { cams: [], period: [1, 2, 4], last: [-99, -99, -99], splits: [] });
  R.initShadow = () => {
    const G = LR.gpu, n = G.tier.cascades, size = Math.min(G.tier.shadow, Math.floor(G.renderer.capabilities.maxTextureSize / n / 2) * 2);   // the atlas holds the cascades side by side
    const dt = new T.DepthTexture(size * n, size); dt.type = T.UnsignedIntType; dt.format = T.DepthFormat; dt.compareFunction = T.LessEqualCompare; dt.minFilter = dt.magFilter = T.LinearFilter;
    SH.rt = LR.rt(size * n, size, { format: T.RGFormat, type: T.UnsignedByteType, depth: true, depthTexture: dt, filter: T.NearestFilter });               // colour: the depth again, readable (LR.SHADOW_OUT)
    SH.n = n; SH.size = size; U.uShadowMap.value = dt; U.uShadowZ.value = SH.rt.texture; U.uShadowInfo.value.set(n, 1 / size, 1, 0);
    for (let i = 0; i < n; i++) { const c = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1); c.matrixAutoUpdate = false; SH.cams.push(c); }
    const d = G.tier.shadowDist; SH.splits = n === 3 ? [0, d * 0.085, d * 0.3, d] : [0, d * 0.2, d];
  };
  const v3 = (x, y, z) => new T.Vector3(x, y, z);
  const clr0 = new T.Color(), corners = [], ctr = v3(), lx = v3(), ly = v3(), lz = v3(), tmp = v3(), cf = v3(), cr = v3(), cu = v3(), bias = new T.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  for (let i = 0; i < 8; i++) corners.push(v3());
  R.updateShadows = (cam, force) => {
    const r = LR.gpu.renderer, n = SH.n, L = U.uSunDir.value, strength = LR.sm(0.0, 0.25, LR.sky.keyPower || 1);
    U.uShadowInfo.value.z = LR.off.has('shadow') ? 0 : 1;
    if (LR.off.has('shadow')) return;
    lz.copy(L).normalize(); lx.set(0, 1, 0).cross(lz); if (lx.lengthSq() < 1e-6) lx.set(1, 0, 0); lx.normalize(); ly.copy(lz).cross(lx).normalize();
    const tf = Math.tan((cam.fov * Math.PI) / 360), asp = cam.aspect, f = cf.set(0, 0, -1).applyQuaternion(cam.quaternion), rt_ = cr.set(1, 0, 0).applyQuaternion(cam.quaternion), up = cu.set(0, 1, 0).applyQuaternion(cam.quaternion);
    let drew = 0;
    for (let i = 0; i < n; i++) {
      if (!force && R.frame - SH.last[i] < SH.period[i]) continue;
      SH.last[i] = R.frame;
      const a = SH.splits[i], b = SH.splits[i + 1];
      // a sphere round the slice: its size does not change as the eye turns, so the shadow does not crawl
      const hb = b * tf, wb = hb * asp, cz = Math.min(b, (a + b) / 2 + (wb * wb + hb * hb) / (2 * (b - a)) * 0.5);
      ctr.copy(cam.position).addScaledVector(f, cz);
      let rad = 0; for (const z of [a, b]) for (const sx of [-1, 1]) for (const sy of [-1, 1]) { tmp.copy(cam.position).addScaledVector(f, z).addScaledVector(rt_, sx * z * tf * asp).addScaledVector(up, sy * z * tf); rad = Math.max(rad, tmp.distanceTo(ctr)); }
      rad = Math.ceil(rad * 1.06 * 4) / 4;
      const tex = (2 * rad) / SH.size;
      let x = ctr.dot(lx), y = ctr.dot(ly), z = ctr.dot(lz); x = Math.round(x / tex) * tex; y = Math.round(y / tex) * tex;
      const c = SH.cams[i], D = 420;
      c.left = -rad; c.right = rad; c.top = rad; c.bottom = -rad; c.near = 0; c.far = 2 * D; c.updateProjectionMatrix();
      tmp.set(0, 0, 0).addScaledVector(lx, x).addScaledVector(ly, y).addScaledVector(lz, z + D);
      c.matrix.makeBasis(lx, ly, lz); c.matrix.setPosition(tmp); c.updateMatrixWorld(true);
      U.uShadowMat.value[i].copy(bias).multiply(c.projectionMatrix).multiply(c.matrixWorldInverse);
      U.uShadowTexel.value.setComponent(i, tex);
      SH.rt.viewport.set(i * SH.size, 0, SH.size, SH.size); SH.rt.scissor.set(i * SH.size, 0, SH.size, SH.size); SH.rt.scissorTest = true;
      r.setRenderTarget(SH.rt); r.getClearColor(clr0); const ca0 = r.getClearAlpha(); r.setClearColor(0xff0000, 1); r.clear(true, true, false); r.setClearColor(clr0, ca0); r.render(LR.world.shadowScene, c); drew++;
    }
    R.info.shadowPasses = drew;
  };
}

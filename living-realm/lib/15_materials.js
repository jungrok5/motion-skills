// living-realm · 15_materials — every surface is a procedural PBR material baked on the GPU when the page loads:
// a tileable height + colour + roughness function per material → two texture arrays (albedo+height, normal+rough+ao).
// No image files.  LR.mat.define(name, { glsl, tile, bump, … }) adds one; LR.mat.bake() fills the arrays.
{
  const T = THREE;
  const M = (LR.mat = { defs: [], id: {}, size: 512 });
  // def: glsl — `void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal)`, uv in 0..1, MUST tile
  //      tile — metres one repeat covers · bump — relief depth in metres (drives the normal map) · ao — cavity strength
  //      por — porosity: how much rain darkens it · pud — can hold puddles · stick — how much snow stays · pom — parallax depth (m) · paint — 1: the vertex tint colours only what stands above height 0.45 (paint over bare wood)
  M.define = (name, def) => {
    if (name in M.id) { M.defs[M.id[name]] = Object.assign({ name }, M.defaults, def); return M.id[name]; }
    M.id[name] = M.defs.length; M.defs.push(Object.assign({ name }, M.defaults, def)); return M.id[name];
  };
  M.defaults = { tile: 2, bump: 0.01, ao: 1, por: 0.7, pud: 0, stick: 1, pom: 0 };
  M.L = (name) => { const i = M.id[name]; if (i === undefined) throw new Error('unknown material "' + name + '" (have: ' + Object.keys(M.id).join(', ') + ')'); return i; };
  M.tile = (name) => M.defs[M.L(name)].tile;

  // tileable building blocks for material functions
  const LIB = `
vec3 S(float r, float g, float b){ return pow(vec3(r, g, b), vec3(2.2)); }
vec3 S(vec3 c){ return pow(c, vec3(2.2)); }
float ph(vec2 i, float per){ return hash12(mod(i, per) + per * 17.0); }
vec2 ph2(vec2 i, float per){ return hash22(mod(i, per) + per * 29.0); }
// value noise, period per (in lattice cells): p = uv * per
float pn(vec2 p, float per){ vec2 i = floor(p), f = fract(p); f = f * f * f * (f * (f * 6. - 15.) + 10.);
  return mix(mix(ph(i, per), ph(i + vec2(1, 0), per), f.x), mix(ph(i + vec2(0, 1), per), ph(i + vec2(1, 1), per), f.x), f.y); }
// anisotropic value noise: per.x cells across, per.y cells up
float pn2(vec2 uv, vec2 per){ vec2 p = uv * per, i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  #define PH2(o) hash12(mod(i + o, per) + per * 13.0)
  return mix(mix(PH2(vec2(0, 0)), PH2(vec2(1, 0)), f.x), mix(PH2(vec2(0, 1)), PH2(vec2(1, 1)), f.x), f.y); }
// gradient noise 0..1
float pg(vec2 p, float per){ vec2 i = floor(p), f = fract(p), u = f * f * f * (f * (f * 6. - 15.) + 10.);
  #define PGR(o) dot(normalize(ph2(i + o, per) - 0.5), f - o)
  return 0.5 + 0.7 * mix(mix(PGR(vec2(0, 0)), PGR(vec2(1, 0)), u.x), mix(PGR(vec2(0, 1)), PGR(vec2(1, 1)), u.x), u.y); }
float fbm(vec2 uv, float f, int oct){ float s = 0., a = .5, n = 0.; for (int i = 0; i < 8; i++) { if (i >= oct) break; s += a * pg(uv * f + float(i) * 0.37, f); n += a; a *= .5; f *= 2.; } return s / n; }
float fbmv(vec2 uv, float f, int oct){ float s = 0., a = .5, n = 0.; for (int i = 0; i < 8; i++) { if (i >= oct) break; s += a * pn(uv * f + float(i) * 0.37, f); n += a; a *= .5; f *= 2.; } return s / n; }
float ridged(vec2 uv, float f, int oct){ float s = 0., a = .5, n = 0.; for (int i = 0; i < 8; i++) { if (i >= oct) break; float v = 1. - abs(pg(uv * f + float(i) * 0.53, f) * 2. - 1.); s += a * v * v; n += a; a *= .5; f *= 2.; } return s / n; }
// voronoi with n x n cells: x = distance to the cell border, y = cell id 0..1, z = distance to the cell centre, w = second id
vec4 vor(vec2 uv, vec2 n, float jit){
  vec2 p = uv * n, ip = floor(p), fp = fract(p); vec2 mc = vec2(0.), mo = vec2(0.); float md = 9.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 o = vec2(float(i), float(j)); vec2 r = hash22(mod(ip + o, n) + n * 3.1); vec2 c = o + 0.5 + (r - 0.5) * jit - fp; float d = dot(c, c); if (d < md) { md = d; mc = c; mo = o; } }
  float ed = 9.;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) { vec2 o = mo + vec2(float(i), float(j)); vec2 r = hash22(mod(ip + o, n) + n * 3.1); vec2 c = o + 0.5 + (r - 0.5) * jit - fp; vec2 dd = c - mc; if (dot(dd, dd) > 1e-5) ed = min(ed, dot(0.5 * (mc + c), normalize(dd))); }
  vec2 cell = mod(ip + mo, n);
  return vec4(ed, hash12(cell + n * 7.7), sqrt(md), hash12(cell * 1.7 + n * 2.3));
}
// running bond: n.x bricks across, n.y courses (n.y even).  returns xy = position inside the brick 0..1, zw = brick id
vec4 bond(vec2 uv, vec2 n, float shift){ vec2 p = uv * n; float row = floor(p.y); p.x += shift * mod(row, 2.0) + hash11(mod(row, n.y) + 3.0) * 0.0; vec2 id = vec2(mod(floor(p.x), n.x), mod(row, n.y)); return vec4(fract(p), id); }
float box2(vec2 f, vec2 gap){ vec2 e = min(f, 1.0 - f) / gap; return sat(min(e.x, e.y)); }
`;

  // pass A: the surface function → colour + height (half float), rough + metal
  const fragA = (glsl) => `${LR.chunk.head}${LR.chunk.hash}
in vec2 vUv; layout(location = 0) out vec4 oA; layout(location = 1) out vec4 oB;
${LIB}
${glsl}
void main(){ vec3 col; float h, rough, metal = 0.0; surf(vUv, col, h, rough, metal); oA = vec4(max(col, 0.0), sat(h)); oB = vec4(sat(rough), sat(metal), 0.0, 1.0); }`;
  const fragB1 = `//#include head
in vec2 vUv; out vec4 o; uniform sampler2D tA;
void main(){ vec4 a = texture(tA, vUv); o = vec4(sqrt(sat(a.rgb)), a.a); }`;
  const fragB2 = `//#include head
in vec2 vUv; out vec4 o; uniform sampler2D tA, tB; uniform vec4 uP;   // texel, slope scale, ao strength, ao radius (texels)
float H(vec2 uv){ return textureLod(tA, uv, 0.0).a; }
void main(){
  float e = uP.x;
  float hx = H(vUv + vec2(e, 0.)) - H(vUv - vec2(e, 0.)), hy = H(vUv + vec2(0., e)) - H(vUv - vec2(0., e));
  hx += 0.5 * (H(vUv + vec2(2. * e, 0.)) - H(vUv - vec2(2. * e, 0.))) * 0.5; hy += 0.5 * (H(vUv + vec2(0., 2. * e)) - H(vUv - vec2(0., 2. * e))) * 0.5;
  vec3 n = normalize(vec3(-hx * uP.y, -hy * uP.y, 1.0));
  float h0 = H(vUv), occ = 0.0;
  for (int i = 0; i < 16; i++) { float a = float(i) * 2.39996, r = (0.25 + 0.75 * sqrt((float(i) + 0.5) / 16.0)) * uP.w * e; float dh = H(vUv + vec2(cos(a), sin(a)) * r) - h0; occ += sat(dh * uP.y * e / r * 1.6); }
  float ao = sat(1.0 - occ / 16.0 * 2.6 * uP.z);
  vec2 rm = texture(tB, vUv).rg;
  o = vec4(n.xy * 0.5 + 0.5, rm.r, ao);
}`;

  M.bake = async (onStep) => {
    const G = LR.gpu, r = G.renderer, size = (M.size = G.tier.mat), n = M.defs.length;
    const mk = () => { const a = new T.WebGLArrayRenderTarget(size, size, n, { format: T.RGBAFormat, type: T.UnsignedByteType, depthBuffer: false, generateMipmaps: true }); const t = a.texture; t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = Math.min(G.tier.aniso, G.maxAniso); t.generateMipmaps = true; return a; };
    const A = mk(), B = mk();
    const tmp = LR.rt(size, size, { type: G.halfFloat ? T.HalfFloatType : T.UnsignedByteType, count: 2, wrap: T.RepeatWrapping, filter: T.LinearFilter });
    const b1 = LR.pass(fragB1, { tA: { value: tmp.textures[0] } });
    const b2 = LR.pass(fragB2, { tA: { value: tmp.textures[0] }, tB: { value: tmp.textures[1] }, uP: { value: new T.Vector4() } });
    // three regenerates mipmaps each time a target is left; do it once, after the last layer
    A.texture.generateMipmaps = B.texture.generateMipmaps = true;
    for (let i = 0; i < n; i++) {
      const d = M.defs[i];
      const a = new T.RawShaderMaterial({ glslVersion: T.GLSL3, vertexShader: LR.chunk.fsvs, fragmentShader: fragA(d.glsl), depthTest: false, depthWrite: false });
      LR.blit(a, tmp); a.dispose();
      const last = i === n - 1; if (i === 1) A.texture.generateMipmaps = B.texture.generateMipmaps = false; if (last) A.texture.generateMipmaps = B.texture.generateMipmaps = true;
      LR.blit(b1, A, i);
      b2.uniforms.uP.value.set(1 / size, (d.bump / d.tile) * size * 0.5, d.ao, Math.max(3, size / 48));
      LR.blit(b2, B, i);
      if (onStep) { onStep(i, n, d.name); await LR.breath(); }
    }
    r.setRenderTarget(null); tmp.dispose(); b1.dispose(); b2.dispose();
    M.A = A; M.B = B; LR.U.uMatA.value = A.texture; LR.U.uMatB.value = B.texture;
    // per-layer weather parameters for the world shaders: porosity, puddles, snow, parallax (in uv units)
    const P = (M.params = []); for (let i = 0; i < 48; i++) { const d = M.defs[i]; P.push(d ? new T.Vector4(d.por, d.pud, d.stick, d.pom / d.tile) : new T.Vector4(0.7, 0, 1, 0)); }
    return M;
  };

  // debug: the material sheet (?view=mats) — every layer lit by a raking light
  M.sheet = (cols = 6) => {
    const n = M.defs.length, rows = Math.ceil(n / cols);
    const m = LR.pass(`//#include head
in vec2 vUv; out vec4 o; uniform mediump sampler2DArray uMatA, uMatB; uniform vec3 uG; uniform float uT;
void main(){ vec2 g = vec2(vUv.x, 1.0 - vUv.y) * uG.xy; vec2 c = floor(g), f = fract(g); float id = c.y * uG.x + c.x; if (id >= uG.z) { o = vec4(0.03, 0.03, 0.04, 1.); return; }
  vec2 uv = f * 1.5; vec4 a = texture(uMatA, vec3(uv, id)), b = texture(uMatB, vec3(uv, id));
  vec3 alb = a.rgb * a.rgb; vec2 nx = b.xy * 2. - 1.; vec3 n = vec3(nx, sqrt(max(1. - dot(nx, nx), 0.)));
  vec3 L = normalize(vec3(cos(uT) * 0.8, sin(uT) * 0.8, 0.55)), V = vec3(0., 0., 1.), Hh = normalize(L + V);
  float r = max(b.z, 0.05), a2 = r * r * r * r, nh = max(dot(n, Hh), 0.), dd = nh * nh * (a2 - 1.) + 1.;
  vec3 col = alb * (max(dot(n, L), 0.) * 2.6 * vec3(1., .95, .85) + vec3(.25, .3, .4) * b.w) + vec3(0.04) * a2 / (PI * dd * dd) * max(dot(n, L), 0.) * 2.6;
  col = col / (col + 0.6) * 1.35; float edge = step(0.985, max(f.x, f.y)); o = vec4(pow(col, vec3(1. / 2.2)) * (1. - edge), 1.);
}`, { uMatA: LR.U.uMatA, uMatB: LR.U.uMatB, uG: { value: new T.Vector3(cols, rows, n) }, uT: { value: 0.9 } });
    return { material: m, cols, rows, names: M.defs.map((d) => d.name) };
  };
}

// living-realm · 16_matlib — the stock materials.  Each is a tileable function of uv (0..1): colour, height, roughness.
// A project adds its own with LR.mat.define() before the bake; these are the common ground of timber-and-stone worlds.
{
  const D = LR.mat.define;

  // ── walls ──────────────────────────────────────────────────────────────────────────────────────────────────────
  D('plaster', { tile: 2.4, bump: 0.006, por: 0.8, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float big = fbm(uv, 3., 4), mid = fbm(uv + 0.31, 12., 4), fine = fbmv(uv, 96., 3);
  float trowel = pn2(uv + vec2(big * 0.08, 0.), vec2(6., 28.));
  vec4 cr = vor(uv + (vec2(mid, big) - 0.5) * 0.12, vec2(4., 4.), 1.0);
  float crackMask = smoothstep(0.58, 0.68, fbm(uv + 0.7, 2., 3));
  float crack = (1.0 - smoothstep(0.0, 0.008, cr.x)) * crackMask;
  float chip = smoothstep(0.70, 0.73, fbm(uv + 0.13, 5., 5) * 0.75 + mid * 0.25);
  h = 0.62 + (big - 0.5) * 0.25 + (trowel - 0.5) * 0.12 + (fine - 0.5) * 0.08 - crack * 0.3 - chip * 0.3;
  vec3 base = S(0.90, 0.88, 0.83) * (0.90 + 0.16 * big);
  base = mix(base, S(0.80, 0.76, 0.68), smoothstep(0.45, 0.8, mid) * 0.35);
  float streak = pn2(uv + 0.2, vec2(26., 2.)) * smoothstep(0.4, 0.8, fbm(uv + 0.5, 2., 3)); base *= 1.0 - streak * 0.14;
  base = mix(base, S(0.62, 0.57, 0.50), chip * 0.8);
  base *= 1.0 - crack * 0.4;
  col = base * (0.95 + 0.1 * fine); rough = 0.88 + 0.08 * fine - chip * 0.04; metal = 0.;
}` });

  D('timber', { moss: 0.2, tile: 1.6, bump: 0.008, por: 0.75, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float warp = fbm(uv, 3., 3);
  vec2 g = vec2(uv.x, uv.y + (warp - 0.5) * 0.06);
  float grain = pn2(g, vec2(3., 90.)) * 0.6 + pn2(g + 0.37, vec2(7., 220.)) * 0.4;
  float rings = sin((g.y + pn2(g, vec2(2., 9.)) * 0.08) * 150.) * 0.5 + 0.5;
  float check = smoothstep(0.80, 0.86, pn2(g + 0.11, vec2(2., 26.))) * smoothstep(0.35, 0.6, pn2(uv + 0.5, vec2(5., 3.)));
  vec4 k = vor(uv, vec2(2., 3.), 0.9); float knot = smoothstep(0.10, 0.02, k.z) * step(0.72, k.y);
  h = 0.55 + (grain - 0.5) * 0.5 + (rings - 0.5) * 0.08 - check * 0.55 + knot * 0.15 + (fbmv(uv, 64., 2) - 0.5) * 0.06;
  vec3 a = S(0.33, 0.24, 0.17), b = S(0.47, 0.37, 0.27), gy = S(0.50, 0.46, 0.40);
  col = mix(a, b, grain); col = mix(col, gy, smoothstep(0.45, 0.9, fbm(uv + 0.2, 4., 4)) * 0.55);
  col *= 1.0 - check * 0.6; col = mix(col, a * 0.6, knot * 0.8); col *= 0.9 + 0.16 * rings;
  rough = 0.82 - knot * 0.1 + check * 0.1; metal = 0.;
}` });

  D('planks', { moss: 0.35, tile: 1.6, bump: 0.012, por: 0.8, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float N = 8.; float row = floor(uv.y * N), fy = fract(uv.y * N); float id = hash11(row + 5.0), id2 = hash11(row * 3.1 + 1.0);
  float ux = uv.x + id * 0.37; float joint = step(0.5, id2);
  float jx = fract(ux + id2 * 0.3);
  float gap = min(smoothstep(0.0, 0.045, fy), smoothstep(1.0, 0.955, fy)) * mix(1.0, smoothstep(0.0, 0.006, min(jx, 1. - jx)), joint);
  vec2 g = vec2(fy * 0.125 + row * 0.173, ux);
  float grain = pn2(vec2(ux, uv.y), vec2(4., 64.)) * 0.55 + pn2(vec2(ux, uv.y) + 0.2, vec2(12., 128.)) * 0.45;
  float wear = fbm(uv + id, 6., 4);
  float nail = smoothstep(0.012, 0.006, length(vec2(min(jx, 1. - jx) - 0.03, (fy - 0.5) * 0.125) * vec2(1., 1.))) * joint;
  h = (0.6 + (grain - 0.5) * 0.3 + (id - 0.5) * 0.12 + (wear - 0.5) * 0.1) * gap + nail * 0.1;
  vec3 a = S(0.34, 0.25, 0.17), b = S(0.50, 0.39, 0.27), gy = S(0.50, 0.47, 0.42);
  col = mix(a, b, grain * 0.7 + id * 0.3); col = mix(col, gy, smoothstep(0.4, 0.8, wear) * 0.5); col *= 0.25 + 0.75 * gap; col = mix(col, S(0.12, 0.11, 0.10), nail);
  rough = 0.84; metal = 0.;
}` });

  D('boards', { moss: 0.2, tile: 1.2, bump: 0.01, por: 0.6, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float N = 8.; float row = floor(uv.y * N), fy = fract(uv.y * N); float id = hash11(row + 5.0);
  float gap = min(smoothstep(0.0, 0.05, fy), smoothstep(1.0, 0.95, fy));
  float grain = pn2(uv + id, vec2(4., 64.)) * 0.55 + pn2(uv + 0.2 + id, vec2(12., 128.)) * 0.45;
  float worn = smoothstep(0.5, 0.78, fbm(uv + id * 3.0, 6., 4) * 0.7 + grain * 0.3);
  h = (0.6 + (grain - 0.5) * 0.25 + (id - 0.5) * 0.1 - worn * 0.1) * gap;
  vec3 paint = S(0.84, 0.83, 0.80) * (0.9 + 0.14 * id) * (0.94 + 0.1 * grain), wood = S(0.50, 0.42, 0.34) * (0.8 + 0.4 * grain);
  col = mix(paint, wood, worn * 0.85); col *= 0.3 + 0.7 * gap; rough = mix(0.62, 0.86, worn); metal = 0.;
}` });

  D('rubble', { moss: 0.9, tile: 2.0, bump: 0.032, ao: 0.5, por: 0.65, pom: 0.03, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  vec2 w = uv + (vec2(fbm(uv, 4., 3), fbm(uv + 0.5, 4., 3)) - 0.5) * 0.06;
  vec4 c = vor(w * vec2(1., 1.), vec2(7., 10.), 0.82);
  float stone = smoothstep(0.022, 0.085, c.x);
  float dome = pow(sat(c.x * 4.6), 0.5);
  float surfn = fbm(uv + c.y * 3.0, 14., 4), fine = fbmv(uv, 90., 3), pit = smoothstep(0.7, 0.8, fbmv(uv + 0.3, 46., 2));
  float tilt = (c.w - 0.5) * 0.2;
  h = mix(0.24 + fine * 0.1, 0.5 + dome * 0.34 + tilt + (surfn - 0.5) * 0.22 - pit * 0.08, stone);
  vec3 base = S(0.56, 0.53, 0.48);
  vec3 sc = base * (0.80 + 0.36 * c.y); sc = mix(sc, sc * vec3(1.10, 1.0, 0.86), smoothstep(0.5, 0.9, c.w)); sc = mix(sc, sc * vec3(0.90, 0.96, 1.06), smoothstep(0.5, 0.1, c.w) * 0.8);
  sc *= 0.80 + 0.38 * surfn; sc *= 1.0 - pit * 0.18;
  sc = mix(sc, sc * S(0.80, 0.82, 0.70), smoothstep(0.55, 0.8, fbm(uv + 0.9, 5., 4)) * 0.3);
  vec3 mortar = S(0.60, 0.57, 0.50) * (0.82 + 0.26 * fine);
  col = mix(mortar, sc, stone); col *= 0.94 + 0.06 * smoothstep(0.0, 0.1, c.x);
  rough = mix(0.95, 0.82 + 0.1 * surfn, stone); metal = 0.;
}` });

  D('ashlar', { moss: 0.7, tile: 2.4, bump: 0.03, por: 0.6, pom: 0.015, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  vec4 b = bond(uv, vec2(3., 8.), 0.5);
  float id = hash12(b.zw + 3.0), id2 = hash12(b.zw * 1.9 + 11.0);
  float e = box2(b.xy, vec2(0.035, 0.07));
  float chisel = fbm(uv + id, 18., 4), fine = fbmv(uv, 90., 3), pit = smoothstep(0.72, 0.8, fbmv(uv + 0.4, 40., 2));
  h = mix(0.18, 0.62 + (id - 0.5) * 0.12 + (chisel - 0.5) * 0.22 - pit * 0.2, smoothstep(0.0, 0.55, e)) + fine * 0.04;
  vec3 sc = mix(S(0.60, 0.57, 0.50), S(0.70, 0.66, 0.57), id); sc = mix(sc, S(0.50, 0.49, 0.47), step(0.8, id2) * 0.6);
  sc *= 0.82 + 0.3 * chisel; sc *= 1.0 - pit * 0.25;
  float stain = smoothstep(0.5, 0.8, fbm(uv * vec2(1., 1.) + 0.3, 3., 4)); sc = mix(sc, sc * S(0.72, 0.74, 0.62), stain * 0.4);
  col = mix(S(0.48, 0.45, 0.39) * (0.7 + 0.3 * fine), sc, smoothstep(0.0, 0.4, e));
  rough = 0.86 - 0.08 * chisel; metal = 0.;
}` });

  D('brick', { moss: 0.5, tile: 1.6, bump: 0.018, por: 0.75, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  vec4 b = bond(uv, vec2(6., 20.), 0.5);
  float id = hash12(b.zw + 1.0), id2 = hash12(b.zw * 2.3 + 5.0);
  float e = box2(b.xy, vec2(0.04, 0.12)); float n = fbm(uv + id, 24., 4), fine = fbmv(uv, 110., 2);
  h = mix(0.22 + fine * 0.08, 0.6 + (id - 0.5) * 0.14 + (n - 0.5) * 0.22, smoothstep(0.0, 0.7, e));
  vec3 a = S(0.56, 0.27, 0.19), c2 = S(0.66, 0.36, 0.24), d = S(0.36, 0.20, 0.16);
  vec3 bc = mix(a, c2, id); bc = mix(bc, d, step(0.82, id2) * 0.8); bc *= 0.8 + 0.35 * n;
  bc = mix(bc, S(0.16, 0.14, 0.13), smoothstep(0.45, 0.9, fbm(uv + 0.6, 3., 4)) * 0.35);
  col = mix(S(0.62, 0.59, 0.53) * (0.7 + 0.3 * fine), bc, smoothstep(0.0, 0.5, e)); rough = 0.9; metal = 0.;
}` });

  // ── ground ─────────────────────────────────────────────────────────────────────────────────────────────────────
  D('cobble', { tile: 2.4, bump: 0.032, ao: 0.5, por: 0.7, pud: 1, pom: 0.03, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  vec2 w = uv + (vec2(fbm(uv, 5., 3), fbm(uv + 0.5, 5., 3)) - 0.5) * 0.03;
  vec4 c = vor(w, vec2(19., 19.), 0.64);
  float stone = smoothstep(0.03, 0.085, c.x), dome = 1.0 - pow(1.0 - sat(c.x * 4.4), 2.4);
  float n = fbm(uv + c.y * 5., 26., 4), fine = fbmv(uv, 110., 3), wear = fbm(uv + 0.3, 2., 3), pit = smoothstep(0.72, 0.82, fbmv(uv + 0.6, 60., 2));
  h = mix(0.24 + fine * 0.14, 0.46 + dome * 0.34 + (c.w - 0.5) * 0.10 + (n - 0.5) * 0.10 - pit * 0.06, stone) + (wear - 0.5) * 0.2;
  vec3 base = S(0.48, 0.46, 0.43);
  vec3 sc = base * (0.86 + 0.26 * c.y); sc = mix(sc, sc * vec3(1.06, 1.0, 0.91), smoothstep(0.6, 0.95, c.w)); sc = mix(sc, sc * vec3(0.94, 0.98, 1.04), smoothstep(0.4, 0.05, c.w) * 0.7);
  sc *= 0.86 + 0.24 * n; sc *= 1.0 + 0.10 * dome * smoothstep(0.4, 0.7, wear); sc *= 1.0 - pit * 0.12;
  vec3 joint = S(0.43, 0.39, 0.32) * (0.8 + 0.4 * fine); joint = mix(joint, S(0.30, 0.35, 0.19), smoothstep(0.52, 0.76, fbm(uv + 0.2, 5., 4)) * 0.6);
  col = mix(joint, sc, stone); col *= 0.95 + 0.05 * smoothstep(0.0, 0.14, c.x);
  rough = mix(0.95, 0.56 + 0.26 * n - dome * 0.10, stone); metal = 0.;
}` });

  D('dirt', { tile: 3.0, bump: 0.03, por: 1.0, pud: 1, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float big = fbm(uv, 3., 5), mid = fbm(uv + 0.4, 12., 4), fine = fbmv(uv, 120., 3), grit = fbmv(uv + 0.3, 50., 3);
  vec4 p1 = vor(uv, vec2(34., 34.), 0.95), p2 = vor(uv + 0.13, vec2(13., 13.), 0.95);
  float peb = smoothstep(0.20, 0.36, p1.x) * step(0.80, p1.y), peb2 = smoothstep(0.24, 0.40, p2.x) * step(0.93, p2.y);
  float rut = smoothstep(0.35, 0.65, big), crk = (1.0 - smoothstep(0.0, 0.02, vor(uv + mid * 0.05, vec2(7., 7.), 1.0).x)) * smoothstep(0.55, 0.75, mid);
  h = 0.4 + (big - 0.5) * 0.5 + (mid - 0.5) * 0.2 + (fine - 0.5) * 0.08 + (grit - 0.5) * 0.1 + peb * 0.10 + peb2 * 0.2 - crk * 0.15;
  vec3 e1 = S(0.40, 0.33, 0.25), e2 = S(0.50, 0.43, 0.33), e3 = S(0.31, 0.26, 0.20);
  col = mix(e3, e1, rut); col = mix(col, e2, smoothstep(0.5, 0.8, mid) * 0.6); col *= 0.86 + 0.28 * fine; col *= 0.92 + 0.16 * grit; col *= 1.0 - crk * 0.3;
  vec3 pc = mix(S(0.46, 0.43, 0.38), S(0.52, 0.46, 0.38), p1.w) * (0.8 + 0.3 * mid);
  col = mix(col, pc, max(peb, peb2) * 0.7);
  rough = 0.94 - max(peb, peb2) * 0.12; metal = 0.;
}` });

  D('turf', { tile: 2.6, bump: 0.02, por: 0.6, pud: 0.35, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float big = fbm(uv, 3., 4), mid = fbm(uv + 0.2, 10., 4);
  float bl = pn2(uv + vec2(big * 0.1, 0.), vec2(150., 34.)) * 0.4 + pn2(uv.yx + vec2(mid * 0.1, 0.3), vec2(170., 40.)) * 0.35 + fbmv(uv, 180., 2) * 0.25;
  vec4 cl = vor(uv, vec2(30., 30.), 1.0); float clover = smoothstep(0.30, 0.12, cl.z) * step(0.78, cl.y);
  float bare = smoothstep(0.80, 0.92, fbm(uv + 0.6, 3., 4) * 0.85 + bl * 0.15);
  h = 0.45 + (bl - 0.5) * 0.6 + (big - 0.5) * 0.2 + clover * 0.08 - bare * 0.2;
  vec3 g1 = S(0.27, 0.37, 0.14), g2 = S(0.36, 0.45, 0.17), g3 = S(0.44, 0.48, 0.22), soil = S(0.33, 0.28, 0.20);
  col = mix(g1, g2, bl); col = mix(col, g3, smoothstep(0.5, 0.85, mid) * 0.45); col = mix(col, S(0.25, 0.40, 0.16), clover * 0.5);
  col = mix(col, mix(soil, g1, 0.5) * (0.85 + 0.3 * bl), bare * 0.5); col *= 0.92 + 0.14 * big;
  rough = 0.9; metal = 0.;
}` });

  D('litter', { tile: 2.6, bump: 0.025, por: 1.0, pud: 0.3, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float big = fbm(uv, 3., 4), fine = fbmv(uv, 110., 3), mid = fbm(uv + 0.5, 9., 3);
  vec3 soil = S(0.17, 0.135, 0.10) * (0.75 + 0.5 * fine); col = soil; h = 0.3 + (big - 0.5) * 0.25 + fine * 0.1;
  for (int k = 0; k < 3; k++) {
    float fk = float(k); vec2 o = vec2(0.37, 0.71) * fk; float n = 13. + fk * 7.;
    vec4 l = vor(uv + o + (vec2(fbm(uv + fk, 6., 2), fbm(uv - fk, 6., 2)) - 0.5) * 0.06, vec2(n, n), 1.0);
    float leaf = smoothstep(0.02, 0.06, l.x) * step(0.42 + fk * 0.1, l.y);
    float vein = 1.0 - smoothstep(0.0, 0.03, abs(fract(l.z * 6.0) - 0.5)) * 0.2;
    vec3 lc = l.w < 0.3 ? S(0.34, 0.24, 0.14) : l.w < 0.6 ? S(0.41, 0.31, 0.17) : l.w < 0.85 ? S(0.27, 0.20, 0.13) : S(0.45, 0.37, 0.21);
    lc *= (0.7 + 0.45 * l.y) * vein;
    col = mix(col, lc, leaf); h = mix(h, 0.5 + fk * 0.14 + l.z * 0.25, leaf);
  }
  float needles = smoothstep(0.55, 0.9, pn2(uv + big * 0.2, vec2(140., 30.)) * 0.5 + pn2(uv.yx + 0.4, vec2(120., 26.)) * 0.5) * smoothstep(0.4, 0.6, mid);
  col = mix(col, S(0.30, 0.22, 0.13), needles * 0.5); h += needles * 0.06;
  float tw = smoothstep(0.012, 0.004, abs(pn2(uv, vec2(5., 7.)) - 0.5)) * smoothstep(0.5, 0.7, fbm(uv + 0.8, 4., 3));
  col = mix(col, S(0.22, 0.17, 0.13), tw); h += tw * 0.25;
  float moss = smoothstep(0.50, 0.72, fbm(uv + 0.25, 4., 4)); col = mix(col, S(0.19, 0.28, 0.09) * (0.75 + 0.55 * fine), moss * 0.7); h += moss * 0.08;
  rough = 0.93; metal = 0.;
}` });

  D('gravel', { tile: 2.0, bump: 0.035, por: 0.6, pud: 0.6, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float fine = fbmv(uv, 100., 3); col = S(0.33, 0.30, 0.25) * (0.7 + 0.5 * fine); h = 0.2 + fine * 0.12;
  for (int k = 0; k < 3; k++) {
    float fk = float(k); float n = 10. + fk * 9.; vec4 p = vor(uv + vec2(0.21, 0.63) * fk, vec2(n, n), 0.9);
    float st = smoothstep(0.03, 0.12, p.x) * step(0.25, p.y); float dome = 1.0 - pow(1.0 - sat(p.x * 3.0), 2.0);
    vec3 pc = p.w < 0.25 ? S(0.55, 0.53, 0.50) : p.w < 0.5 ? S(0.62, 0.55, 0.44) : p.w < 0.75 ? S(0.40, 0.41, 0.43) : S(0.50, 0.40, 0.33);
    pc *= 0.8 + 0.35 * fbm(uv + p.y, 30., 2);
    col = mix(col, pc, st); h = mix(h, 0.35 + dome * 0.4 + fk * 0.08, st);
  }
  rough = 0.72; metal = 0.;
}` });

  D('rock', { moss: 1.0, tile: 4.0, bump: 0.12, por: 0.5, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float big = fbm(uv, 2., 5), rd = ridged(uv + big * 0.12, 4., 5), strata = pn2(uv + vec2(0., big * 0.25), vec2(3., 22.));
  vec4 cr = vor(uv + (vec2(big, rd) - 0.5) * 0.2, vec2(4., 4.), 1.0); float crack = 1.0 - smoothstep(0.0, 0.03, cr.x);
  float fine = fbmv(uv, 90., 4);
  h = 0.35 + rd * 0.4 + (strata - 0.5) * 0.16 + (cr.y - 0.5) * 0.12 - crack * 0.3 + (fine - 0.5) * 0.08;
  vec3 a = S(0.47, 0.46, 0.44), b = S(0.58, 0.54, 0.47), c = S(0.33, 0.34, 0.36);
  col = mix(a, b, strata); col = mix(col, c, smoothstep(0.4, 0.75, big) * 0.6); col *= 0.75 + 0.45 * rd; col *= 1.0 - crack * 0.5;
  float lichen = smoothstep(0.70, 0.76, fbm(uv + 0.4, 9., 4)); col = mix(col, S(0.66, 0.66, 0.50), lichen * 0.55);
  float lichen2 = smoothstep(0.74, 0.78, fbm(uv + 0.9, 14., 3)); col = mix(col, S(0.70, 0.56, 0.20), lichen2 * 0.5);
  rough = 0.86 - lichen * 0.05; metal = 0.;
}` });

  D('moss', { tile: 1.6, bump: 0.02, por: 0.9, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float big = fbm(uv, 4., 4); vec4 c = vor(uv, vec2(18., 18.), 1.0); float tuft = 1.0 - sat(c.z * 2.2);
  float fine = fbmv(uv, 140., 3), fil = pn2(uv + big * 0.1, vec2(160., 40.));
  h = 0.3 + tuft * 0.4 + (big - 0.5) * 0.3 + (fine - 0.5) * 0.2;
  vec3 a = S(0.16, 0.26, 0.06), b = S(0.33, 0.44, 0.10), d = S(0.45, 0.50, 0.16);
  col = mix(a, b, tuft * 0.7 + fil * 0.3); col = mix(col, d, smoothstep(0.55, 0.9, big) * 0.5 * fine * 2.0); col *= 0.8 + 0.4 * fine;
  rough = 0.95; metal = 0.;
}` });

  // ── roofs ──────────────────────────────────────────────────────────────────────────────────────────────────────
  D('slate', { moss: 0.85, tile: 1.6, bump: 0.035, por: 0.4, pom: 0.012, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float R = 8.; float row = floor(uv.y * R), fy = fract(uv.y * R);
  float C = 6.; float ux = uv.x * C + mod(row, 2.0) * 0.5 + hash11(row + 2.0) * 0.0; float cid = mod(floor(ux), C), fx = fract(ux);
  vec2 id = vec2(cid, row); float r1 = hash12(id + 1.3), r2 = hash12(id * 2.1 + 7.0), r3 = hash12(id * 3.3 + 2.0);
  float lip = fy + (r1 - 0.5) * 0.10 + (fbmv(uv, 40., 2) - 0.5) * 0.05;
  float edgeB = smoothstep(0.0, 0.07, lip);
  float gapX = smoothstep(0.0, 0.035, min(fx, 1.0 - fx));
  float n = fbm(uv + r1, 20., 4), cleave = pn2(uv + r2, vec2(14., 60.));
  h = (0.30 + 0.5 * (1.0 - fy) + (r2 - 0.5) * 0.10 + (n - 0.5) * 0.08 + (cleave - 0.5) * 0.06) * mix(0.55, 1.0, gapX) * mix(0.35, 1.0, edgeB);
  vec3 a = S(0.30, 0.34, 0.39), b = S(0.38, 0.40, 0.42), c = S(0.26, 0.28, 0.33), p = S(0.36, 0.33, 0.38);
  col = r3 < 0.35 ? a : r3 < 0.65 ? b : r3 < 0.88 ? c : p; col *= 0.8 + 0.35 * n; col *= 0.55 + 0.45 * gapX * edgeB;
  float lichen = smoothstep(0.68, 0.74, fbm(uv + 0.3, 10., 4)); col = mix(col, S(0.58, 0.60, 0.40), lichen * 0.6);
  float mossy = smoothstep(0.6, 0.85, fbm(uv + 0.8, 4., 3)) * (1.0 - edgeB * gapX * 0.6); col = mix(col, S(0.22, 0.32, 0.10), mossy * 0.4);
  rough = 0.62 + 0.2 * n + lichen * 0.1; metal = 0.;
}` });

  D('tiles', { moss: 0.6, tile: 1.6, bump: 0.04, por: 0.7, pom: 0.014, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float R = 8.; float row = floor(uv.y * R), fy = fract(uv.y * R);
  float C = 8.; float ux = uv.x * C + mod(row, 2.0) * 0.5; float cid = mod(floor(ux), C), fx = fract(ux);
  vec2 id = vec2(cid, row); float r1 = hash12(id + 4.3), r2 = hash12(id * 2.7 + 1.0), r3 = hash12(id * 1.3 + 9.0);
  float round_ = sqrt(max(0.0, 1.0 - pow(abs(fx - 0.5) * 2.0, 2.6)));
  float bottom = fy - (1.0 - round_) * 0.42 + (r1 - 0.5) * 0.06;
  float vis = smoothstep(0.0, 0.06, bottom);
  float gapX = smoothstep(0.0, 0.05, min(fx, 1.0 - fx));
  float n = fbm(uv + r1, 22., 4);
  h = (0.28 + 0.52 * (1.0 - fy) + (r2 - 0.5) * 0.12 + (n - 0.5) * 0.08 + round_ * 0.05) * mix(0.5, 1.0, gapX) * mix(0.3, 1.0, vis);
  vec3 a = S(0.60, 0.33, 0.22), b = S(0.67, 0.40, 0.27), c = S(0.48, 0.27, 0.20), d = S(0.56, 0.40, 0.30);
  col = r3 < 0.35 ? a : r3 < 0.65 ? b : r3 < 0.85 ? c : d; col *= 0.78 + 0.4 * n; col *= 0.5 + 0.5 * gapX * vis;
  float grime = smoothstep(0.45, 0.85, fbm(uv + 0.5, 3., 4)); col = mix(col, col * S(0.55, 0.52, 0.45), grime * 0.45);
  float lichen = smoothstep(0.71, 0.76, fbm(uv + 0.1, 11., 4)); col = mix(col, S(0.62, 0.62, 0.42), lichen * 0.5);
  rough = 0.82; metal = 0.;
}` });

  D('thatch', { moss: 0.7, tile: 1.8, bump: 0.05, por: 0.9, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float L = 3.; float lay = floor(uv.y * L), fy = fract(uv.y * L);
  float big = fbm(uv, 3., 3);
  float edge = fy + (pn2(uv + lay * 0.3, vec2(40., 1.)) - 0.5) * 0.18;
  float s1 = pn2(uv + vec2(big * 0.04, 0.), vec2(150., 5.)), s2 = pn2(uv + vec2(0.3, lay * 0.21), vec2(260., 9.)), s3 = pn2(uv + 0.6, vec2(70., 3.));
  float straw = s1 * 0.45 + s2 * 0.35 + s3 * 0.2;
  h = 0.25 + 0.45 * (1.0 - fy) + (straw - 0.5) * 0.45; h *= mix(0.45, 1.0, smoothstep(0.0, 0.10, edge));
  vec3 a = S(0.52, 0.42, 0.24), b = S(0.68, 0.58, 0.34), g = S(0.42, 0.40, 0.33), dk = S(0.26, 0.21, 0.14);
  col = mix(a, b, straw); col = mix(col, g, smoothstep(0.4, 0.8, big) * 0.55); col = mix(dk, col, smoothstep(0.0, 0.14, edge) * (0.6 + 0.4 * smoothstep(0.25, 0.6, straw)));
  float mossy = smoothstep(0.66, 0.84, fbm(uv + 0.42, 4., 4)); col = mix(col, S(0.25, 0.33, 0.11), mossy * 0.5);
  rough = 0.95; metal = 0.;
}` });

  // ── trees ──────────────────────────────────────────────────────────────────────────────────────────────────────
  D('bark', { tile: 1.4, bump: 0.05, por: 0.8, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float big = fbm(uv, 3., 3);
  vec2 w = vec2(uv.x + (pn2(uv, vec2(3., 5.)) - 0.5) * 0.07, uv.y);
  vec4 c = vor(w * vec2(1., 1.), vec2(9., 3.), 0.9);
  float plate = smoothstep(0.02, 0.16, c.x);
  float rid = pn2(w, vec2(22., 5.)) * 0.6 + pn2(w + 0.3, vec2(48., 9.)) * 0.4, fine = fbmv(uv, 100., 3);
  h = 0.12 + plate * (0.45 + (c.y - 0.5) * 0.25 + (rid - 0.5) * 0.3) + (fine - 0.5) * 0.08 + (big - 0.5) * 0.1;
  vec3 a = S(0.30, 0.25, 0.20), b = S(0.44, 0.40, 0.34), d = S(0.12, 0.10, 0.08);
  col = mix(a, b, rid * 0.6 + c.y * 0.4); col = mix(d, col, plate); col *= 0.8 + 0.35 * fine;
  float lichen = smoothstep(0.66, 0.74, fbm(uv + 0.37, 7., 4)); col = mix(col, S(0.52, 0.58, 0.44), lichen * 0.5 * plate);
  float mossy = smoothstep(0.62, 0.8, fbm(uv + 0.71, 3., 3)); col = mix(col, S(0.22, 0.32, 0.09), mossy * 0.45);
  rough = 0.92; metal = 0.;
}` });

  D('birch', { tile: 1.2, bump: 0.012, por: 0.5, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float big = fbm(uv, 3., 4), fine = fbmv(uv, 90., 3);
  float len = pn2(uv, vec2(5., 34.)); float lent = smoothstep(0.70, 0.76, len) * smoothstep(0.4, 0.6, pn2(uv + 0.5, vec2(9., 3.)));
  vec4 sc = vor(uv, vec2(3., 3.), 0.9); float scar = smoothstep(0.16, 0.04, sc.z * vec2(1.0, 1.0).x) * step(0.6, sc.y);
  float peel = smoothstep(0.6, 0.66, pn2(uv + 0.2, vec2(4., 14.)));
  h = 0.6 + (big - 0.5) * 0.15 - lent * 0.25 - scar * 0.4 + peel * 0.12 + (fine - 0.5) * 0.06;
  vec3 w = S(0.86, 0.85, 0.80), g = S(0.70, 0.68, 0.62), k = S(0.10, 0.09, 0.08);
  col = mix(w, g, smoothstep(0.4, 0.8, big)); col = mix(col, S(0.80, 0.70, 0.58), peel * 0.5); col = mix(col, k, max(lent * 0.85, scar)); col *= 0.92 + 0.12 * fine;
  rough = 0.6 + scar * 0.3; metal = 0.;
}` });

  D('pinebark', { tile: 1.4, bump: 0.045, por: 0.8, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  vec2 w = uv + (vec2(fbm(uv, 4., 2), 0.5) - 0.5) * 0.05; vec4 c = vor(w, vec2(7., 4.), 0.85);
  float plate = smoothstep(0.015, 0.11, c.x); float lay = fbm(uv + c.y * 4.0, 16., 4), fine = fbmv(uv, 100., 2);
  h = 0.1 + plate * (0.5 + (c.y - 0.5) * 0.3 + (lay - 0.5) * 0.25) + fine * 0.05;
  vec3 a = S(0.42, 0.27, 0.19), b = S(0.56, 0.39, 0.29), d = S(0.13, 0.09, 0.07), gy = S(0.44, 0.40, 0.37);
  col = mix(a, b, lay); col = mix(col, gy, step(0.7, c.w) * 0.5); col = mix(d, col, plate); col *= 0.85 + 0.3 * fine;
  rough = 0.9; metal = 0.;
}` });

  // ── made things ────────────────────────────────────────────────────────────────────────────────────────────────
  D('iron', { metal: 1, tile: 1.0, bump: 0.004, por: 0.2, stick: 0.8, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float n = fbm(uv, 8., 5), fine = fbmv(uv, 90., 3); vec4 d = vor(uv, vec2(14., 14.), 1.0); float dent = smoothstep(0.35, 0.0, d.z);
  float rust = smoothstep(0.56, 0.72, fbm(uv + 0.3, 5., 5));
  h = 0.5 + dent * 0.3 * (d.y - 0.3) + (n - 0.5) * 0.3 + rust * (fine - 0.3) * 0.3;
  col = mix(S(0.20, 0.20, 0.22) * (0.8 + 0.4 * n), S(0.36, 0.19, 0.10) * (0.7 + 0.6 * fine), rust);
  rough = mix(0.42 + 0.2 * n, 0.9, rust); metal = 1.0 - rust * 0.85;
}` });

  D('cloth', { tile: 1.0, bump: 0.003, por: 0.9, stick: 0.7, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float wa = sin(uv.x * TAU * 90.) * 0.5 + 0.5, we = sin(uv.y * TAU * 90.) * 0.5 + 0.5;
  float weave = mix(wa, we, step(0.5, fract(floor(uv.x * 90.) * 0.5 + floor(uv.y * 90.) * 0.5)));
  float slub = pn2(uv, vec2(8., 120.)) * 0.5 + pn2(uv.yx + 0.3, vec2(8., 120.)) * 0.5; float n = fbm(uv, 5., 4);
  h = 0.5 + (weave - 0.5) * 0.5 + (slub - 0.5) * 0.3 + (n - 0.5) * 0.2;
  col = S(0.80, 0.78, 0.74) * (0.85 + 0.18 * weave) * (0.88 + 0.2 * n); col = mix(col, col * S(0.80, 0.74, 0.62), smoothstep(0.5, 0.85, fbm(uv + 0.6, 3., 4)) * 0.5);
  rough = 0.9; metal = 0.;
}` });

  D('glass', { tile: 0.8, bump: 0.01, por: 0.0, stick: 0.25, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float N = 5.; vec2 d = vec2(uv.x + uv.y, uv.x - uv.y) * N; vec2 id = mod(floor(d), N * 2.0), f = fract(d);
  float lead = 1.0 - smoothstep(0.0, 0.07, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
  vec2 t = hash22(id + 2.0) - 0.5; float pane = 0.45 + dot(f - 0.5, t) * 0.5 + (fbm(uv, 12., 3) - 0.5) * 0.12;
  h = mix(pane, 1.0, lead);
  col = mix(S(0.10, 0.14, 0.15) * (0.7 + 0.6 * hash12(id + 9.0)), S(0.17, 0.17, 0.18), lead);
  rough = mix(0.10, 0.55, lead); metal = lead * 0.6;
}` });

  D('snow', { tile: 2.2, bump: 0.02, por: 0.0, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float drift = fbm(uv, 3., 4), mid = fbm(uv + 0.4, 10., 3), grain = fbmv(uv, 130., 3), sp = hash12(floor(uv * 512.));
  h = 0.5 + (drift - 0.5) * 0.6 + (mid - 0.5) * 0.18 + (grain - 0.5) * 0.12;
  col = S(0.93, 0.95, 0.98) * (0.93 + 0.07 * drift) * (0.97 + 0.05 * grain);
  rough = 0.72 - step(0.93, sp) * 0.35 - grain * 0.08; metal = 0.;
}` });

  D('waves', { tile: 4.0, bump: 0.10, por: 0.0, stick: 0, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float a = fbm(uv, 4., 5), b = ridged(uv + 0.3, 6., 4), c = fbm(uv + a * 0.15, 14., 3);
  h = a * 0.55 + (1.0 - b) * 0.25 + c * 0.2; col = vec3(h); rough = 0.05; metal = 0.;
}` });
}

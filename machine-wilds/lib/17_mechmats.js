// machine-wilds · 17_mechmats — what machines and the ruins they walk among are made of.  Tileable recipes like the
// stock ones (a scan can take any of their names with LR.mat.photo): light enough that a vertex tint sets the colour.
//   steel       forged and machined steel: joints, pins, drums, lugs        chrome     a cylinder's rod
//   paintmetal  painted plate: chipped at the edges, rust creeping under    rustplate  plate the paint left long ago
//   ceramic     the pale shell of the newer machines: fine crazing, stains   rubber     hoses, pads, bellows
//   concrete    board-marked, stained, spalled                              asphalt    cracked road, gravel showing
{
  const D = LR.mat.define;
  D('steel', { metal: 1, tile: 1.2, bump: 0.003, por: 0.15, stick: 0.7, moss: 0.25, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float n = fbm(uv, 6., 5), fine = fbmv(uv, 120., 3), turn = sin((uv.y + (fbm(uv, 3., 3) - 0.5) * 0.01) * 6.2832 * 46.0) * 0.5 + 0.5;      // the lathe's lines
  float pit = smoothstep(0.62, 0.78, fbm(uv + 0.6, 22., 4)), rust = smoothstep(0.56, 0.74, fbm(uv + 0.3, 5., 5)) * 0.8;
  h = 0.5 + (n - 0.5) * 0.12 + turn * 0.03 - pit * 0.2 + rust * (fine - 0.4) * 0.25;
  col = mix(S(0.52, 0.53, 0.55) * (0.8 + 0.35 * n), S(0.40, 0.22, 0.12) * (0.7 + 0.6 * fine), rust * 0.85); col *= 1.0 - pit * 0.35;
  rough = mix(0.34 + 0.2 * n + turn * 0.05, 0.9, max(rust, pit * 0.7)); metal = 1.0 - rust * 0.8;
}` });
  D('chrome', { metal: 1, tile: 1.0, bump: 0.001, por: 0.0, stick: 0.3, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float n = fbm(uv, 5., 4), sc = smoothstep(0.80, 0.86, fbmv(vec2(uv.x * 9.0, uv.y * 0.6), 30., 3)), film = fbm(uv + 0.2, 3., 3);      // long scores where the seal has dragged grit
  h = 0.5 - sc * 0.2; col = S(0.80, 0.81, 0.83) * (0.9 + 0.12 * n) * (1.0 - sc * 0.4) * mix(vec3(1.0), S(0.78, 0.66, 0.5), smoothstep(0.5, 0.8, film) * 0.4);
  rough = 0.10 + 0.10 * n + sc * 0.4 + smoothstep(0.5, 0.8, film) * 0.2; metal = 1.0;
}` });
  D('paintmetal', { metal: 0, tile: 1.6, bump: 0.006, por: 0.25, stick: 0.8, moss: 0.6, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float n = fbm(uv, 5., 5), fine = fbmv(uv, 70., 3), big = fbm(uv + 0.4, 2., 4);
  // paint lets go in patches that start at scratches and seams; rust runs down from them
  float chip = smoothstep(0.52, 0.60, n * 0.6 + fbm(uv + 0.7, 13., 4) * 0.4 + (big - 0.5) * 0.35);
  float run = smoothstep(0.45, 0.9, fbm(vec2(uv.x * 16.0, uv.y * 1.5) + 0.2, 4., 4)) * smoothstep(0.3, 0.7, big);
  float bare = smoothstep(0.86, 0.93, fbm(uv + 0.11, 26., 3) * 0.5 + chip * 0.5);
  h = 0.56 - chip * 0.16 + (fine - 0.5) * 0.06 * chip + (fbm(uv, 40., 2) - 0.5) * 0.03;
  vec3 paint = S(0.74, 0.74, 0.72) * (0.86 + 0.22 * big) * (1.0 - 0.25 * run), rust = mix(S(0.36, 0.19, 0.10), S(0.20, 0.11, 0.07), fine) * (0.8 + 0.5 * n);
  col = mix(paint, rust, chip); col = mix(col, S(0.42, 0.26, 0.15) * paint * 1.4, run * (1.0 - chip) * 0.55); col = mix(col, S(0.5, 0.5, 0.52), bare * 0.6);
  rough = mix(0.46 + 0.14 * n, 0.92, chip); rough = mix(rough, 0.4, bare * 0.6); metal = bare * 0.7;
}` });
  D('rustplate', { metal: 0.25, tile: 1.8, bump: 0.012, por: 0.5, stick: 0.9, moss: 0.9, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float n = fbm(uv, 4., 5), fine = fbmv(uv, 80., 3), scale = fbm(uv + 0.5, 15., 4), big = fbm(uv + 0.2, 2., 3);
  float flake = smoothstep(0.5, 0.62, scale), paint = smoothstep(0.66, 0.72, n * 0.55 + big * 0.45) * 0.7;      // a last skin of paint where the plate was sheltered
  float seam = 1.0 - smoothstep(0.0, 0.025, min(min(fract(uv.x * 2.0), 1.0 - fract(uv.x * 2.0)), min(fract(uv.y * 3.0), 1.0 - fract(uv.y * 3.0))));
  h = 0.5 + flake * 0.14 + (fine - 0.5) * 0.12 - seam * 0.22 + paint * 0.05;
  col = mix(S(0.33, 0.17, 0.09), S(0.50, 0.27, 0.12), n) * (0.72 + 0.5 * fine); col = mix(col, S(0.17, 0.10, 0.07), flake * 0.6); col = mix(col, S(0.60, 0.62, 0.58) * (0.8 + 0.3 * big), paint * (1.0 - flake));
  col *= 1.0 - seam * 0.45; rough = mix(0.9, 0.55, paint * (1.0 - flake)); metal = 0.0;
}` });
  D('ceramic', { metal: 0, tile: 1.6, bump: 0.002, por: 0.1, stick: 0.6, moss: 0.45, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float n = fbm(uv, 4., 4), big = fbm(uv + 0.3, 2., 3); vec4 c = vor(uv, vec2(9., 9.), 1.0);
  float craze = (1.0 - smoothstep(0.0, 0.035, c.x)) * smoothstep(0.45, 0.75, fbm(uv + 0.9, 3., 3));          // fine cracks in the glaze, in patches
  float chip = smoothstep(0.74, 0.80, fbm(uv + 0.5, 11., 4) * 0.6 + big * 0.4), streak = smoothstep(0.5, 0.95, fbm(vec2(uv.x * 14.0, uv.y * 1.2) + 0.6, 4., 4)) * smoothstep(0.35, 0.7, big);
  // a shell is panels: a groove where two meet (the tile's edges), a fastener every hand's breadth along it, dirt run down from both
  vec2 e = min(fract(uv), 1.0 - fract(uv)); float seam = 1.0 - smoothstep(0.004, 0.011, min(e.x, e.y));
  vec2 fa = vec2(fract(uv.x * 12.0) - 0.5, (e.y - 0.035) * 12.0), fb = vec2((e.x - 0.035) * 12.0, fract(uv.y * 12.0) - 0.5); float fast = max(1.0 - smoothstep(0.10, 0.15, length(fa)), 1.0 - smoothstep(0.10, 0.15, length(fb)));
  float grub = smoothstep(0.10, 0.0, min(e.x, e.y)) * (0.4 + 0.6 * fbm(uv + 0.2, 9., 3));
  h = 0.6 - craze * 0.08 - chip * 0.25 + (n - 0.5) * 0.03 - seam * 0.4 + fast * 0.12;
  col = S(0.86, 0.85, 0.82) * (0.9 + 0.14 * n); col = mix(col, S(0.42, 0.40, 0.36), craze * 0.7); col = mix(col, S(0.25, 0.25, 0.26) * (0.7 + 0.6 * n), chip); col *= mix(vec3(1.0), S(0.62, 0.58, 0.50), streak * 0.5);
  col *= 1.0 - grub * 0.28; col = mix(col, S(0.10, 0.10, 0.11), seam * 0.85); col = mix(col, S(0.46, 0.45, 0.44), fast * (1.0 - seam) * 0.85);
  rough = 0.24 + 0.16 * n + chip * 0.5 + streak * 0.2 + craze * 0.2 + grub * 0.2; rough = mix(rough, 0.42, fast); metal = fast * 0.7;
}` });
  D('rubber', { metal: 0, tile: 0.9, bump: 0.006, por: 0.1, stick: 0.5, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float rib = sin(uv.y * 6.2832 * 28.0) * 0.5 + 0.5, n = fbm(uv, 7., 4), dust = smoothstep(0.4, 0.8, fbm(uv + 0.4, 3., 4));
  h = 0.5 + rib * 0.25 + (n - 0.5) * 0.1; col = mix(S(0.16, 0.16, 0.165), S(0.38, 0.35, 0.30), dust * 0.45) * (0.8 + 0.3 * n); rough = 0.72 + 0.2 * dust - rib * 0.08; metal = 0.0;
}` });
  D('concrete', { metal: 0, tile: 3.0, bump: 0.02, por: 0.85, pud: 0.6, stick: 1, moss: 0.95, pom: 0.012, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float n = fbm(uv, 4., 5), fine = fbmv(uv, 90., 3), big = fbm(uv + 0.4, 2., 4), N = 6.0;
  float board = fract(uv.y * N), bid = floor(uv.y * N), bl = 1.0 - smoothstep(0.0, 0.045, min(board, 1.0 - board));           // the lines the shuttering left
  float grain = fbm(vec2(uv.x * 2.0, uv.y * 30.0) + bid * 0.37, 4., 3);
  vec4 c = vor(uv, vec2(5., 5.), 1.0); float crack = (1.0 - smoothstep(0.0, 0.02, c.x)) * smoothstep(0.52, 0.7, fbm(uv + 0.8, 2., 3));
  float spall = smoothstep(0.68, 0.76, fbm(uv + 0.25, 7., 4) * 0.65 + big * 0.35), hole = smoothstep(0.86, 0.9, fbmv(uv + 0.3, 46., 2));
  float stain = smoothstep(0.42, 0.9, fbm(vec2(uv.x * 9.0, uv.y * 1.1) + 0.5, 4., 4)) * smoothstep(0.3, 0.75, big);
  h = 0.6 + (n - 0.5) * 0.1 + (grain - 0.5) * 0.05 - bl * 0.07 - crack * 0.35 - spall * 0.3 * (0.6 + 0.4 * fine) - hole * 0.12;
  col = S(0.56, 0.55, 0.52) * (0.8 + 0.3 * n + 0.08 * hash11(bid)); col = mix(col, S(0.42, 0.39, 0.34) * (0.7 + 0.6 * fine), spall); col *= 1.0 - crack * 0.6 - bl * 0.18 - hole * 0.3;
  col = mix(col, col * S(0.50, 0.44, 0.34), stain * 0.7); col = mix(col, S(0.36, 0.22, 0.12), smoothstep(0.80, 0.86, fbm(uv + 0.05, 9., 3)) * spall);       // where the steel inside has bled
  rough = 0.82 + 0.1 * fine - stain * 0.1; metal = 0.0;
}` });
  D('asphalt', { metal: 0, tile: 3.2, bump: 0.024, por: 0.7, pud: 1, stick: 1, moss: 0.5, pom: 0.01, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float n = fbm(uv, 5., 5), big = fbm(uv + 0.3, 2., 4); vec4 st = vor(uv, vec2(64., 64.), 1.0), cr = vor(uv, vec2(4., 4.), 1.0);
  float stone = smoothstep(0.42, 0.1, st.z), crack = (1.0 - smoothstep(0.0, 0.03, cr.x)) * smoothstep(0.35, 0.6, fbm(uv + 0.7, 3., 3)), worn = smoothstep(0.45, 0.75, big);
  float pot = smoothstep(0.76, 0.84, fbm(uv + 0.6, 6., 4) * 0.6 + big * 0.4);
  h = 0.55 + stone * 0.12 * (0.4 + 0.6 * worn) + (n - 0.5) * 0.08 - crack * 0.4 - pot * 0.3;
  col = mix(S(0.20, 0.20, 0.21), S(0.34, 0.33, 0.32), worn * 0.7) * (0.85 + 0.25 * n); col = mix(col, mix(S(0.42, 0.40, 0.37), S(0.30, 0.28, 0.26), st.y), stone * worn * 0.6);
  col = mix(col, S(0.25, 0.20, 0.15) * (0.7 + 0.5 * n), max(crack, pot)); rough = 0.86 - stone * worn * 0.2; metal = 0.0;
}` });
}

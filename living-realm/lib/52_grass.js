// living-realm · 52_grass — ground cover without storing a single plant: grass blades, meadow flowers, ferns and
// broad-leaf weeds are placed in the vertex shader from the instance number on a world-fixed grid of cells, read the
// land's own maps (height, grass density, tall, flowers, fern, the rain map) and are drawn only in the tiles the eye
// can see (one draw call per layer: a list of visible tiles in a uniform array).  Rings of falling density and growing
// blade width carry the meadow out to tier.grassDist; blades are thinned and handed from ring to ring one by one, each
// at its own distance, so no ring edge shows.  Everything is opaque into the G-buffer; grass throws no shadow, ferns
// only into the nearest cascade.
//   what the land's maps mean here      splat.a  grass 0..1 (thin grass gathers into tufts) · cover.g  tall (blade height)
//                                       cover.r  flowers · cover.a  fern (ferns + weeds) · uTopo: nothing grows under built things
//   LR.grass.enabled = false            before start: no ground cover          (?off=grass does the same)
//   LR.grass.flowers = [{ color, center, size, height, share, petals, cup, eye }, …]   up to four kinds; set before 'init'
//   LR.grass.opts    = { density, height, flowerDensity, fernDensity, fernSize }       multipliers; set before 'init'
//   LR.grass.init(opts)                 runs by itself on 'init' (after the land is built and the rain map baked)
//   LR.render.info.grass                { tris, calls, tiles, <layer>: tris … } submitted this frame
{
  const T = THREE;
  const GR = (LR.grass = {
    enabled: true, ready: false, layers: [], info: { tris: 0, calls: 0, tiles: 0 },
    // the kinds of meadow flower: colour of the petals and of the eye, head radius (m), how far the head stands
    // above the grass (m), share of all flowers, number of petals.  Kinds grow in drifts (one kind leads locally).
    flowers: [
      { color: '#f2640c', center: '#1c1408', size: 0.052, height: 0.10, share: 0.5, petals: 5 },
      { color: '#f6f3e8', center: '#e2ac12', size: 0.030, height: 0.07, share: 0.3, petals: 13 },
      { color: '#4b62d6', center: '#ded79a', size: 0.024, height: 0.04, share: 0.2, petals: 5 },
    ],
    opts: { density: 1, height: 1, flowerDensity: 1, fernDensity: 1, fernSize: 1 },
  });

  // ── shared by every ground-cover vertex shader: which cell am I, what is the ground like there ─────────────────
  const PLACE = `
uniform mat4 projectionMatrix, viewMatrix;
uniform sampler2D uSplat, uCover, uHeight, uTopo; uniform vec4 uLandRect, uTopoRect, uHRect; uniform float uWaterY;
uniform vec4 uTiles[MAXT];
uniform vec4 uRing;                          // cell size · inner edge (0: none) · outer edge · band at the inner edge
uniform vec4 uRing2;                         // thinning starts · share kept at the outer edge · band at the outer edge · width scale
uniform vec4 uGrassOpt;                      // height · density · flower density · fern density
vec2 instCell(){ int tile = gl_InstanceID / CELLS, k = gl_InstanceID - tile * CELLS, kz = k / KDIM; return floor(uTiles[tile].xy / uRing.x + 0.5) + vec2(float(k - kz * KDIM), float(kz)); }
struct Ground { float y, grass, open, built, inside; vec4 cover; };
Ground groundAt(vec2 xz){
  Ground g; vec2 luv = (xz - uLandRect.xy) * uLandRect.zw;
  g.inside = step(0.002, luv.x) * step(luv.x, 0.998) * step(0.002, luv.y) * step(luv.y, 0.998);
  g.grass = textureLod(uSplat, luv, 0.0).a; g.cover = textureLod(uCover, luv, 0.0);
  g.y = textureLod(uHeight, ((xz + uHRect.x) * uHRect.y + 0.5) * uHRect.z, 0.0).r;
  vec2 tuv = (xz - uTopoRect.xy) * uTopoRect.zw; float th = textureLod(uTopo, tuv, 0.0).r - g.y;
  float tin = step(0.0, tuv.x) * step(tuv.x, 1.0) * step(0.0, tuv.y) * step(tuv.y, 1.0);
  g.open = mix(1.0, smoothstep(1.1, 0.25, th), tin);                 // open sky above (snow lies, rain falls)
  g.built = tin * smoothstep(0.30, 0.55, th);                        // something built stands on or over this spot
  return g;
}
float pixAt(float d){ return d * 2.0 / (uProj[1][1] * uRes.y); }       // metres one pixel covers at distance d
// cheap test before any map is read: is this spot outside the picture?  The tile knows its ground level and spread.
bool offView(vec2 xz, float d){
#ifdef NOCULL
  return false;
#else
  if (d < 2.5) return false;
  vec4 tl = uTiles[gl_InstanceID / CELLS]; vec4 vs = uView * vec4(xz.x, tl.z, xz.y, 1.0); float m = tl.w + 1.6, z = m - vs.z;
  return z < 0.0 || abs(vs.x) - m > z / uProj[0][0] || abs(vs.y) - m > z / uProj[1][1];
#endif
}
`;

  // ── grass ───────────────────────────────────────────────────────────────────────────────────────────────────────
  // vertex: position = (side -1 | 0 | +1, height along the blade 0..1, blade number in the cell)
  const grassVS = `//#include head
//#include hash
//#include frame
//#include wind
//#include grasscol
${PLACE}
in vec3 position;
out vec3 vCol; out vec3 vN; out vec4 vP;
void main(){
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vCol = vec3(0.0); vN = vec3(0.0, 1.0, 0.0); vP = vec4(0.0);
  vec2 cell = instCell(); float b = position.z;
  vec3 h1 = hash32(cell + b * vec2(37.17, 17.31) + 0.37), h2 = hash32(cell * 1.618 + b * vec2(11.13, 53.71) + 7.3);
  vec2 xz = (cell + h1.xy) * uRing.x; float d = distance(xz, uCamPos.xz);
  if (d > uRing.z + 1.0 || d < uRing.y - uRing.w - 1.0 || offView(xz, d)) return;
  float under = step(99.5, b);                                               // the low mat of short dark tufts that closes the ground near the eye
  if (under > 0.5 && d > 9.0) return;
  Ground g = groundAt(xz);
  float clump = vnoise(xz * 1.1) * 0.6 + vnoise(xz * 0.31 + 5.0) * 0.4;       // tufts: thicker and taller here, thinner there
  float tuft = vnoise(xz * 0.9 + 3.0) * 0.65 + vnoise(xz * 2.3 + 1.0) * 0.35;      // where grass is thin it gathers into tufts, it does not stand as single pins
  float tm = max(smoothstep(-0.03, 0.05, tuft - mix(0.86, 0.14, g.grass)), smoothstep(0.8, 0.95, g.grass)) * step(0.03, g.grass);
  float dens = tm * g.inside * (1.0 - g.built) * step(uWaterY + 0.05, g.y) * (0.5 + 0.85 * clump) * uGrassOpt.y;
  // one by one: fewer blades toward the ring's outer edge, each handed over to the next ring at its own distance
  float keep = mix(1.0, uRing2.y, smoothstep(uRing2.x, uRing.z, d));
  float s = smoothstep(0.0, 0.08, dens * mix(keep, 1.3 * smoothstep(9.0, 5.5, d), under) - h1.z);
  if (uRing.y > 0.0) s *= smoothstep(-0.5, 0.5, d - (uRing.y - uRing.w * h2.z));
  s *= smoothstep(0.5, -0.5, d - (uRing.z - uRing2.z * h2.z));
  float sn = uWx.z * g.open;                                                 // snow buries most of it where the sky is open
  s *= smoothstep(0.0, 0.10, h2.y + 0.11 - sn * 1.0);
  if (s < 0.01) return;
  vec3 h3 = hash32(cell * 2.317 + b * vec2(5.71, 3.13) + 19.1);
  float tall = g.cover.g, late = smoothstep(0.55, 1.0, uWx.w), t = position.y;
  float H = mix(0.12, 0.62, tall * tall) * (0.55 + 0.9 * h2.x) * mix(0.45, 1.0, smoothstep(0.05, 0.75, g.grass)) * (0.7 + 0.6 * clump) * uGrassOpt.x;
  float stalk = 0.0;
#ifdef STALKS
  stalk = step(0.968, h3.x) * step(0.3, tall) * (1.0 - late); H *= 1.0 + 0.5 * stalk;     // a stem with a seed head
#endif
  H = mix(H, (0.07 + 0.10 * h2.x) * (0.6 + 0.7 * tall) * uGrassOpt.x, under);
  H *= s * (1.0 - 0.45 * late) * (1.0 - 0.4 * sn);
  float yaw = h3.y * TAU; vec2 fd = vec2(cos(yaw), sin(yaw));
  float gust = gustAt(xz, uTime);
  vec2 push = uWind.xy * gust * (0.40 + 0.28 * tall);
  float fl = sin(uTime * (2.6 + h3.z * 3.4) + h3.x * 43.0) * (0.035 + 0.07 * uWind.z);
  vec2 bend = fd * (0.10 + 0.62 * h2.y * h2.y * h2.y + 0.5 * late * (1.0 - 0.7 * sn) + 0.12 * uWx.x + 0.08 * sn + 0.35 * under) + uWind.xy * 0.08 + push + vec2(-fd.y, fd.x) * fl;
  bend *= 1.0 - 0.55 * sn;
  float bl = length(bend); bend *= min(bl, 1.25) / max(bl, 1e-4); bl = min(bl, 1.25);
  vec3 p = vec3(xz.x, g.y - 0.025, xz.y);
  p.xz += bend * H * t * t * (0.75 + 0.5 * t); p.y += H * t * (1.0 - 0.34 * bl * bl * t);
  // the blade turns half toward the eye so it is never seen edge-on; far away it is at least a pixel wide
  vec2 toCam = normalize(uCamPos.xz - xz + 1e-4), cp = vec2(-toCam.y, toCam.x), sd = vec2(-fd.y, fd.x);
  sd = normalize(mix(sd, cp * (dot(sd, cp) < 0.0 ? -1.0 : 1.0), mix(0.3, 0.6, smoothstep(1.5, 8.0, d))));
  float W = max((0.0034 + 0.0032 * h3.z) * (1.0 + d * 0.11) * uRing2.w, pixAt(d) * 0.7);
  W = mix(W, 0.012 + 0.012 * h3.z, under) * (1.0 + 0.3 * sn);
  float prof = mix(1.0 - 0.72 * pow(t, 1.4), t < 0.55 ? 0.26 : 1.15, stalk);
  p.xz += sd * position.x * W * prof * min(1.0, s * 2.0);
  vec3 Tn = normalize(vec3(bend.x * 2.0 * t, 1.0 - 0.6 * bl * bl * t, bend.y * 2.0 * t));
  vec3 fN = normalize(cross(vec3(sd.x, 0.0, sd.y), Tn)); if (fN.y < 0.0) fN = -fN;
  // a meadow shades as a surface; gusts tilt it; each blade is a little rounded across
  vN = normalize(vec3(0.0, 0.7, 0.0) + fN * 0.3 + vec3(push.x, 0.0, push.y) * 0.55 * t + vec3(sd.x, 0.0, sd.y) * position.x * 0.22);
  // colour: the ground's own grass law, dark at the root, lighter and yellower toward the tip
  vec3 tint = grassTint(xz, tall);
#ifdef MACRO
  tint *= mix(0.78, 1.18, textureLod(uNoise, xz * 0.0031, 0.0).g * 0.6 + textureLod(uNoise, xz * 0.031, 0.0).b * 0.4);
#endif
  tint *= (0.82 + 0.36 * h2.x) * mix(0.8, 1.12, clump); tint = mix(tint, vec3(0.26, 0.23, 0.085), step(0.88, h3.z) * 0.55 * (1.0 - late) * (1.0 - under));
  vec3 col = tint * mix(0.17, 1.24, pow(t, 0.9));                                      // deep at the root: a meadow has depth because its roots are dark col = mix(col, col * vec3(1.18, 1.10, 0.62), t * t * 0.45); col *= 1.0 - 0.18 * under;
  col = mix(col, mix(tint * 2.2, vec3(0.30, 0.25, 0.10), 0.6) * (0.8 + 0.4 * h2.x), stalk * smoothstep(0.5, 0.67, t));
  col = mix(col, vec3(0.44, 0.34, 0.15) * (0.7 + 0.5 * h2.x), sn * 0.85);                     // what still stands above the snow is straw
  col *= 1.0 - 0.22 * uWx.x; col = mix(col, vec3(0.86, 0.89, 0.93), sn * smoothstep(0.45, 1.0, t) * 0.7);
  vCol = col; vP = vec4(mix(0.32, 1.0, pow(t, 0.8)) * (1.0 - 0.25 * under), (0.25 + 0.55 * t) * (1.0 - 0.4 * under), mix(0.9, 0.5, uWx.x), sn * t);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
  const grassFS = `//#include head
//#include pack
//#include gout
in vec3 vCol; in vec3 vN; in vec4 vP;
void main(){ writeG(vCol, vP.x, normalize(vN), vP.z, 0.0, vP.y, 0.0, vP.w); }`;

  // ── meadow flowers ──────────────────────────────────────────────────────────────────────────────────────────────
  // vertex: stem (side, t, 2·n) · head (x, y on the unit disc, 2·n + 1) for candidate n of the cell.  FAR: heads only, as dots.
  const flowerVS = `//#include head
//#include hash
//#include frame
//#include wind
${PLACE}
in vec3 position;
uniform vec4 uFlCol[4], uFlPar[4], uFlCen[4];          // petal rgb + head radius · stand above grass, cumulative share, petals, cup · eye rgb + eye radius
out vec3 vCol; out vec3 vN; out vec4 vP; out vec2 vDisc; flat out vec4 vK; flat out vec3 vCen;
void main(){
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vCol = vec3(0.0); vN = vec3(0.0, 1.0, 0.0); vP = vec4(0.0); vDisc = vec2(0.0); vK = vec4(0.0); vCen = vec3(0.0);
  vec2 cell = instCell(); float cand = floor(position.z * 0.5 + 0.01), part = position.z - cand * 2.0;
  vec3 h1 = hash32(cell + cand * vec2(23.3, 71.9) + 3.7), h2 = hash32(cell * 1.618 + cand * vec2(41.1, 9.7) + 11.3), h3 = hash32(cell * 2.317 + cand * 5.3 + 0.9);
  vec2 xz = (cell + h1.xy) * uRing.x; float d = distance(xz, uCamPos.xz);
  if (d > uRing.z + 1.5 || d < uRing.y - 1.5 || offView(xz, d)) return;
  Ground g = groundAt(xz);
  float drift = textureLod(uNoise, xz * 0.023 + 0.51, 0.0).r, kn = textureLod(uNoise, xz * 0.011 + 0.13, 0.0).b;
  float pr = g.cover.r * (0.04 + 0.34 * smoothstep(0.35, 0.72, drift)) * uGrassOpt.z * g.inside * (1.0 - g.built) * step(uWaterY + 0.05, g.y) * smoothstep(0.1, 0.4, g.grass);
  float s = smoothstep(0.0, 0.05, pr - h1.z), sn = uWx.z * g.open;
  s *= smoothstep(0.42, 0.14, uWx.w + (h2.y - 0.5) * 0.2) * (1.0 - smoothstep(0.04, 0.3, sn));   // gone by autumn, gone under snow
#ifdef FAR
  s *= smoothstep(-1.0, 1.0, d - uRing.y) * smoothstep(uRing.z, uRing.z * 0.8, d) * step(h3.z, mix(1.0, 0.4, smoothstep(uRing.y, uRing.z, d)));
#else
  s *= smoothstep(1.0, -1.0, d - uRing.z);
#endif
  if (s < 0.01) return;
  float xk = fract(h2.x * 0.5 + kn * 2.3); int kind = 0; for (int i = 0; i < 3; i++) if (xk > uFlPar[i].y) kind = i + 1;
  vec4 fc = uFlCol[kind], fp = uFlPar[kind], fz = uFlCen[kind];
  float tall = g.cover.g, Hf = (mix(0.12, 0.62, tall * tall) * uGrassOpt.x + fp.x * (0.7 + 0.6 * h2.z)) * (0.6 + 0.4 * s);
  float gust = gustAt(xz, uTime);
  vec2 tip = (uWind.xy * gust * (0.4 + 0.2 * tall) + (h3.xy - 0.5) * 0.3 + vec2(sin(uTime * (2.2 + h3.z * 2.0) + h3.x * 31.0), cos(uTime * (1.9 + h3.y * 2.0) + h3.z * 17.0)) * (0.03 + 0.05 * uWind.z)) * Hf * 0.6;
  vec3 root = vec3(xz.x, g.y - 0.02, xz.y), top = root + vec3(tip.x, Hf, tip.y), p;
  vec2 toCam = normalize(uCamPos.xz - xz + 1e-4); float size = fc.a * (0.8 + 0.4 * h3.z) * s, px = pixAt(d);
  vec3 col = fc.rgb * (0.82 + 0.3 * h2.y) * (1.0 - 0.15 * uWx.x); float ao = 1.0, tr = 0.0;
#ifdef FAR
  size = max(size * 1.1, px * 0.6);
  vec3 nrm = normalize(vec3(toCam.x * 0.75, 0.7, toCam.y * 0.75)), u = normalize(cross(nrm, vec3(0.0, 1.0, 0.001))), v = cross(nrm, u);
  p = top + (u * position.x + v * position.y) * size; vN = normalize(nrm + vec3(0.0, 0.6, 0.0)); vDisc = position.xy; tr = 0.5;
  vK = vec4(fp.z, fz.a, h3.x * TAU, 1.0); vCen = fz.rgb;
#else
  if (part < 0.5) {                                                    // the stem
    float t = position.y; p = root + vec3(tip.x * t * t, Hf * t, tip.y * t * t);
    p.xz += vec2(-toCam.y, toCam.x) * position.x * max(0.0028, px * 0.45);
    col = vec3(0.060, 0.115, 0.028) * mix(0.5, 1.0, t) * (1.0 - 0.2 * uWx.x); ao = mix(0.4, 1.0, t); vN = normalize(vec3(toCam.x * 0.3, 1.0, toCam.y * 0.3)); tr = 0.3;
  } else {                                                             // the head: a shallow cup that leans with the stem and a little toward the eye
    vec3 nrm = normalize(vec3(tip.x / Hf * 1.3 + (h3.x - 0.5) * 0.7 + toCam.x * 0.3, 1.0, tip.y / Hf * 1.3 + (h3.y - 0.5) * 0.7 + toCam.y * 0.3));
    vec3 u = normalize(cross(nrm, vec3(0.0, 0.0, 1.0))), v = cross(nrm, u); float r = length(position.xy);
    vec3 rad = u * position.x + v * position.y;
    p = top + rad * size + nrm * fp.w * size * r * r; vN = normalize(nrm + rad * 0.45); vDisc = position.xy; tr = 0.55;
    vK = vec4(fp.z, fz.a, h3.x * TAU, 1.0); vCen = fz.rgb;
  }
#endif
  vCol = col; vP = vec4(ao, tr, 0.5, 0.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
  const flowerFS = `//#include head
//#include pack
//#include gout
in vec3 vCol; in vec3 vN; in vec4 vP; in vec2 vDisc; flat in vec4 vK; flat in vec3 vCen;
void main(){
  vec3 col = vCol;
  if (vK.w > 0.5) { float r = length(vDisc);
#ifdef FAR
    if (r > 0.92) discard; col = mix(vCen, vCol, smoothstep(vK.y * 0.7, vK.y * 1.2 + 0.1, r));
#else
    float a = atan(vDisc.y, vDisc.x), edge = 0.60 + 0.32 * pow(abs(cos(a * vK.x * 0.5 + vK.z)), 0.55); if (r > edge) discard;
    col = mix(vCen, vCol * (0.78 + 0.3 * r), smoothstep(vK.y - 0.05, vK.y + 0.05, r));
#endif
  }
  writeG(col, vP.x, normalize(vN), vP.z, 0.0, vP.y, 0.0, 0.0);
}`;

  // ── ferns and broad-leaf weeds ──────────────────────────────────────────────────────────────────────────────────
  // vertex: position = (side -1 | 0 | +1 across the frond, 0..1 along it, frond number).  A frond is an arc that leaves the
  // crown steeply and droops at the tip; its picture (pinnae, or one broad leaf) is painted once in code.
  const fernVS = `//#include head
//#include hash
//#include frame
//#include wind
${PLACE}
in vec3 position;
out vec2 vUv; out vec3 vN; out vec3 vT; out vec3 vCol; out vec4 vP;
void main(){
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vUv = vec2(0.0); vN = vec3(0.0, 1.0, 0.0); vT = vec3(1.0, 0.0, 0.0); vCol = vec3(0.0); vP = vec4(0.0);
  vec2 cell = instCell(); vec3 h1 = hash32(cell + 0.71), h2 = hash32(cell * 1.618 + 3.3), h3 = hash32(cell * 2.317 + 9.1);
  vec2 xz = (cell + 0.08 + 0.84 * h1.xy) * uRing.x; float d = distance(xz, uCamPos.xz);
  if (d > uRing.z + 2.0 || offView(xz, d)) return;
  Ground g = groundAt(xz);
  float cl = textureLod(uNoise, xz * 0.047 + 0.23, 0.0).g;
  float pr = g.cover.a * (0.4 + 1.0 * smoothstep(0.3, 0.68, cl)) * uGrassOpt.w * g.inside * (1.0 - g.built) * step(uWaterY + 0.08, g.y);
  float s = smoothstep(0.0, 0.06, pr - h1.z);
#ifdef FAR
  s *= step(uRing.y - uRing.w * h3.x, d) * smoothstep(uRing.z, uRing.z * 0.78, d);         // each plant changes hands at its own distance
#else
  s *= step(d, uRing.z - uRing2.z * h3.x);
#endif
  if (s < 0.01) return;
  float kind = step(0.74, h2.x), fi = position.z, nF = mix(float(FRONDS), min(5.0, float(FRONDS)), kind);
  if (fi >= nF) return;
  float fh = hash11(fi * 7.31 + h1.z * 91.7), fh2 = hash11(fi * 3.17 + h2.z * 57.1), inner = mod(fi, 2.0) * (1.0 - kind);
  float sn = uWx.z * g.open, late = smoothstep(0.30, 0.78, uWx.w + (h3.y - 0.5) * 0.25);
  float size = mix(0.74 + 0.72 * h2.y * (0.5 + cl), 0.16 + 0.18 * h2.y, kind) * uRing2.w * s * (1.0 - 0.25 * late) * (1.0 - 0.3 * sn);
  float L = size * mix(1.0, 0.6, inner) * (0.8 + 0.35 * fh), gust = gustAt(xz, uTime);
  float a0 = mix(mix(0.42, 0.10, inner), 0.55, kind) + 0.45 * late + 0.3 * sn;              // angle from upright at the crown …
  float a1 = mix(mix(2.05, 1.25, inner), 1.45, kind) + 0.4 * fh2 + 0.4 * late + 0.3 * sn;   // … and at the tip
  a1 += (gust - 0.3) * 0.16 + sin(uTime * (1.3 + fh * 1.5) + fh2 * 30.0) * (0.03 + 0.05 * uWind.z);
  float ang = (fi + 0.7 * fh) / nF * TAU + h2.z * TAU; vec2 o = vec2(cos(ang), sin(ang));
  float t = position.y, al = a0 + (a1 - a0) * t, da = max(a1 - a0, 0.05);
  float hh = L * (cos(a0) - cos(al)) / da, vv = L * (sin(al) - sin(a0)) / da;
  vec3 p = vec3(xz.x, g.y - 0.03, xz.y) + vec3(o.x * hh, vv, o.y * hh);
  p.xz += uWind.xy * gust * 0.10 * L * t * t;
  vec3 nrm = vec3(-o.x * cos(al), sin(al), -o.y * cos(al)), side = vec3(-o.y, 0.0, o.x);
  float wh = L * mix(0.17, 0.30, kind);
  p += side * position.x * wh + nrm * abs(position.x) * wh * 0.2;                           // a shallow V: the pinnae rise from the midrib
  vN = normalize(nrm - side * position.x * 0.25); vT = vec3(o.x * sin(al), cos(al), o.y * sin(al));
  vUv = vec2((0.5 + 0.48 * position.x) * 0.5 + 0.5 * kind, t * 0.98 + 0.01);
  vCol = vec3((0.62 + 0.5 * h3.z) * mix(1.0, 1.25, inner) * mix(0.8, 1.1, t), late + 0.22 * step(0.86, fh) * (1.0 - kind), sn);
  vP = vec4(mix(0.22, 1.0, smoothstep(0.0, 0.6, t)), 0.42, mix(0.7, 0.36, uWx.x), 0.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
  const fernFS = `//#include head
//#include hash
//#include pack
//#include frame
//#include gout
uniform sampler2D tFern;
in vec2 vUv; in vec3 vN; in vec3 vT; in vec3 vCol; in vec4 vP;
void main(){
  vec4 tx = texture(tFern, vUv);
  if (tx.a < mix(0.15, 0.85, ign(gl_FragCoord.xy + mod(uFrame, 16.0) * vec2(3.17, 5.91)))) discard;      // hashed: soft edges once the frames add up
  vec3 alb = tx.rgb * tx.rgb * vCol.x * 0.78; float l = dot(alb, vec3(0.3, 0.6, 0.1));
  alb = mix(alb, l * vec3(2.1, 1.05, 0.38), vCol.y) * (1.0 - 0.2 * uWx.x);                               // bracken brown late in the year
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  float rib = sin(vUv.y * 46.0 * TAU) * step(vUv.x, 0.5) * smoothstep(0.6, 0.15, fwidth(vUv.y) * 46.0);  // each pinna tilts its own way: they catch the light one by one
  N = normalize(N + normalize(vT) * rib * 0.12);
  float snow = vCol.z * smoothstep(0.35, 0.85, N.y) * smoothstep(0.25, 0.6, tx.a + vUv.y * 0.3); alb = mix(alb, vec3(0.86, 0.89, 0.93), snow * 0.8);
  writeG(alb, vP.x, N, mix(vP.z, 0.6, snow), 0.0, vP.y * (1.0 - snow), 0.0, snow);
}`;
  const fernShadowFS = `precision highp float; uniform sampler2D tFern; in vec2 vUv; out vec4 o;
void main(){ if (texture(tFern, vUv).a < 0.4) discard; o = vec4(1.0); }`;

  // ── the frond pictures, painted in code: left half a fern frond, right half one broad leaf; base at v = 0 ────────
  const paintFronds = () => {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), r = LR.rng(4711);
    const rgb = (a, k = 1) => `rgb(${Math.round(a[0] * k)},${Math.round(a[1] * k)},${Math.round(a[2] * k)})`;
    // fern: a midrib with pairs of toothed pinnae, longest a third of the way up, all leaning toward the tip
    { const cx = S / 4, y0 = 6, y1 = S - 6, n = 46, half = S / 4 - 6;
      for (let i = 0; i < n; i++) { const u = 0.035 + 0.96 * (i / (n - 1)), y = y0 + (y1 - y0) * u * 0.93, len = half * 1.04 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.55)), 0.9) * (1 - 0.2 * u) * (0.93 + 0.1 * r()), pw = ((y1 - y0) / n) * 0.86, ang = LR.lerp(1.5, 1.08, u);
        for (const sgn of [-1, 1]) { const dx = Math.sin(ang) * sgn, dy = Math.cos(ang), px = -dy, py = dx, sh = 0.8 + 0.36 * r(), teeth = Math.max(4, Math.round(len / 6)), up = sgn > 0 ? 1 : -1;
          const wAt = (k) => pw * Math.pow(1 - k / (teeth * 2), 0.55) * (k % 2 ? 1.0 : 0.74);
          x.beginPath(); x.moveTo(cx, y);
          for (let k = 0; k <= teeth * 2; k++) { const v = k / (teeth * 2), w = wAt(k) * up; x.lineTo(cx + dx * len * v + px * w, y + dy * len * v + py * w); }
          for (let k = teeth * 2; k >= 0; k--) { const v = k / (teeth * 2), w = wAt(k) * up * 0.65; x.lineTo(cx + dx * len * v - px * w, y + dy * len * v - py * w); }
          x.closePath(); const gr = x.createLinearGradient(cx, y, cx + dx * len, y + dy * len); gr.addColorStop(0, rgb([26, 64, 20], sh)); gr.addColorStop(0.5, rgb([48, 104, 30], sh)); gr.addColorStop(1, rgb([84, 138, 44], sh)); x.fillStyle = gr; x.fill();
          x.strokeStyle = rgb([96, 146, 58], sh); x.lineWidth = 1; x.beginPath(); x.moveTo(cx, y); x.lineTo(cx + dx * len * 0.9, y + dy * len * 0.9); x.stroke(); } }
      x.strokeStyle = rgb([50, 70, 26]); x.lineWidth = 4.5; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx, 0); x.lineTo(cx, y1 - 60); x.stroke(); x.lineWidth = 2; x.beginPath(); x.moveTo(cx, y1 - 70); x.lineTo(cx, y1 - 8); x.stroke(); }
    // broad leaf: a short stalk, an ovate blade with a pale midrib and side veins
    { const cx = (S * 3) / 4, y0 = S * 0.16, y1 = S - 10, half = S / 4 - 14; const wAt = (v) => half * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.62)), 0.85) * (1 + 0.04 * Math.sin(v * 46));
      x.beginPath(); x.moveTo(cx, y0); for (let k = 0; k <= 60; k++) { const v = k / 60; x.lineTo(cx - wAt(v), y0 + (y1 - y0) * v); } for (let k = 60; k >= 0; k--) { const v = k / 60; x.lineTo(cx + wAt(v), y0 + (y1 - y0) * v); } x.closePath();
      const gr = x.createLinearGradient(cx - half, 0, cx + half, 0); gr.addColorStop(0, rgb([52, 104, 34])); gr.addColorStop(0.5, rgb([80, 134, 46])); gr.addColorStop(1, rgb([48, 98, 32])); x.fillStyle = gr; x.fill();
      x.strokeStyle = rgb([136, 176, 84]); x.lineCap = 'round';
      for (let k = 1; k < 9; k++) { const v = k / 9.5, y = y0 + (y1 - y0) * v; for (const sgn of [-1, 1]) { x.lineWidth = 1.6; x.beginPath(); x.moveTo(cx, y); x.quadraticCurveTo(cx + sgn * wAt(v) * 0.5, y + 16, cx + sgn * wAt(Math.min(1, v + 0.1)) * 0.93, y + 44); x.stroke(); } }
      x.lineWidth = 5; x.beginPath(); x.moveTo(cx, 0); x.lineTo(cx, y0 + 6); x.stroke(); x.lineWidth = 3; x.beginPath(); x.moveTo(cx, y0); x.lineTo(cx, y1 - 6); x.stroke(); }
    // unpainted texels take the leaf colour (alpha stays 0) so smaller mip levels do not darken the edges
    const im = x.getImageData(0, 0, S, S), d = im.data; for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 8) { d[i] = 50; d[i + 1] = 104; d[i + 2] = 32; d[i + 3] = 0; } }
    const t = new T.DataTexture(new Uint8Array(d.buffer.slice(0)), S, S, T.RGBAFormat, T.UnsignedByteType);
    t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter; t.generateMipmaps = true; t.wrapS = t.wrapT = T.ClampToEdgeWrapping; t.anisotropy = Math.min(4, LR.gpu.maxAniso || 1); t.needsUpdate = true;
    return t;
  };

  // ── geometry: what one cell draws ───────────────────────────────────────────────────────────────────────────────
  const instanced = (pos, idx) => { const g = new T.InstancedBufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3)); g.setIndex(new T.BufferAttribute(pos.length / 3 > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), 1)); g.boundingSphere = new T.Sphere(new T.Vector3(), 1e6); g.instanceCount = 0; g.userData.tris = idx.length / 3; return g; };
  const bladeGeo = (blades, segs, under = 0) => { const P = [], I = []; for (let b = 0; b < blades; b++) { const o = P.length / 3; for (let i = 0; i < segs; i++) P.push(-1, i / segs, b, 1, i / segs, b); P.push(0, 1, b); for (let i = 0; i < segs - 1; i++) { const a = o + i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } const a = o + (segs - 1) * 2; I.push(a, a + 1, a + 2); }
    for (let u = 0; u < under; u++) { const o = P.length / 3; P.push(-1, 0, 100 + u, 1, 0, 100 + u, 0, 1, 100 + u); I.push(o, o + 1, o + 2); } return instanced(P, I); };
  const flowerGeo = (cands, far) => { const P = [], I = []; for (let n = 0; n < cands; n++) {
      if (far) { const o = P.length / 3, z = n * 2 + 1; P.push(-1, -1, z, 1, -1, z, 1, 1, z, -1, 1, z); I.push(o, o + 1, o + 2, o, o + 2, o + 3); continue; }
      let o = P.length / 3; for (const t of [0, 0.5, 1]) P.push(-1, t, n * 2, 1, t, n * 2); I.push(o, o + 1, o + 2, o + 1, o + 3, o + 2, o + 2, o + 3, o + 4, o + 3, o + 5, o + 4);
      o = P.length / 3; P.push(0, 0, n * 2 + 1); for (let k = 0; k < 8; k++) { const a = (k / 8) * LR.TAU; P.push(Math.cos(a), Math.sin(a), n * 2 + 1); } for (let k = 0; k < 8; k++) I.push(o, o + 1 + k, o + 1 + ((k + 1) % 8)); }
    return instanced(P, I); };
  const fernGeo = (fronds, segs, vee) => { const P = [], I = []; for (let f = 0; f < fronds; f++) { const o = P.length / 3, w = vee ? 3 : 2;
      for (let i = 0; i <= segs; i++) { if (vee) P.push(-1, i / segs, f, 0, i / segs, f, 1, i / segs, f); else P.push(-1, i / segs, f, 1, i / segs, f); }
      for (let i = 0; i < segs; i++) for (let k = 0; k < w - 1; k++) { const a = o + i * w + k, b = a + 1, c = a + w, d = c + 1; I.push(a, b, c, b, d, c); } }
    return instanced(P, I); };

  // ── which 4 m blocks of the land hold any grass / flowers / fern at all (tiles over bare ground are never drawn) ─
  const occupancy = () => {
    const L = LR.land, cn = L.cn, nb = Math.ceil((2 * L.half) / 4), per = Math.round(4 / 0.5), g = new Uint8Array(nb * nb), f = new Uint8Array(nb * nb), e = new Uint8Array(nb * nb);
    for (let j = 0; j < cn; j++) { const bj = Math.min(nb - 1, Math.floor(j / per)), bj2 = j % per === 0 && j > 0 ? bj - 1 : bj;
      for (let i = 0; i < cn; i++) { const k = (j * cn + i) * 4, a = L.splat[k + 3]; if (a < 12) continue; const bi = Math.min(nb - 1, Math.floor(i / per)), bi2 = i % per === 0 && i > 0 ? bi - 1 : bi, fl = L.cover[k] > 5, fe = L.cover[k + 3] > 5;
        for (const y of bj2 === bj ? [bj] : [bj, bj2]) for (const x of bi2 === bi ? [bi] : [bi, bi2]) { const q = y * nb + x; g[q] = 1; if (fl) f[q] = 1; if (fe) e[q] = 1; } } }
    // ferns do not need grass under them
    for (let j = 0; j < cn; j++) { const bj = Math.min(nb - 1, Math.floor(j / per)); for (let i = 0; i < cn; i++) if (L.cover[(j * cn + i) * 4 + 3] > 5) { const bi = Math.min(nb - 1, Math.floor(i / per)); e[bj * nb + bi] = 1; if (i % per === 0 && i > 0) e[bj * nb + bi - 1] = 1; if (j % per === 0 && j > 0) e[(bj - 1) * nb + bi] = 1; } }
    return { nb, grass: g, flowers: f, fern: e };
  };
  const occupied = (grid, nb, half, x0, z0, S) => { const i0 = Math.floor((x0 + half) / 4), i1 = Math.ceil((x0 + S + half) / 4) - 1, j0 = Math.floor((z0 + half) / 4), j1 = Math.ceil((z0 + S + half) / 4) - 1; for (let j = Math.max(0, j0); j <= Math.min(nb - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(nb - 1, i1); i++) if (grid[j * nb + i]) return true; return false; };

  // ── init ────────────────────────────────────────────────────────────────────────────────────────────────────────
  GR.init = (opts) => {
    if (GR.ready || !GR.enabled || LR.off.has('grass')) return GR;
    const L = LR.land; if (!L || !L.heightTex || !L.U) return GR;
    Object.assign(GR.opts, opts || {});
    const G = LR.gpu, tier = G.tier, o = GR.opts, W = LR.world, tg = tier.grass * o.density, low = tier.name === 'low';
    const occ = (GR.occ = occupancy());
    const optU = { value: new T.Vector4(o.height, 1, o.flowerDensity, o.fernDensity) };
    const landU = Object.assign({}, L.U, { uHRect: { value: new T.Vector4(L.half, 1 / L.res, 1 / L.n, 0) }, uGrassOpt: optU });
    const baseU = () => Object.assign(LR.uni(LR.render.FRAME + ' uTopo uTopoRect'), landU);
    // a layer: one draw call — a list of visible tiles, each KDIM × KDIM cells
    const layer = (name, geo, vs, fs, defs, kdim, cell, ring, ring2, occGrid, extra = {}) => {
      const S = kdim * cell, rout = ring[2], maxT = Math.min(low ? 96 : 160, Math.ceil((Math.PI * (rout + S * 0.75) ** 2) / (S * S)) + 4);
      const tiles = new Float32Array(maxT * 4);
      const uniforms = Object.assign(baseU(), { uTiles: { value: tiles }, uRing: { value: new T.Vector4(cell, ring[0], ring[2], ring[1]) }, uRing2: { value: new T.Vector4(ring2[0], ring2[1], ring2[2], ring2[3]) } }, extra.uniforms || {});
      const mat = LR.material({ vertexShader: vs, fragmentShader: fs, defines: Object.assign({ MAXT: maxT, CELLS: kdim * kdim, KDIM: kdim }, defs), side: T.DoubleSide, uniforms, colorWrite: extra.shadow ? false : true });
      if (extra.shadow) { mat.polygonOffset = true; mat.polygonOffsetFactor = 1.6; mat.polygonOffsetUnits = 2.5; }
      const mesh = new T.Mesh(geo, mat); mesh.frustumCulled = false; mesh.matrixAutoUpdate = false; mesh.name = 'cover:' + name; mesh.renderOrder = extra.order === undefined ? -2 : extra.order;
      const Ly = { name, geo, mat, mesh, tiles, maxT, S, cells: kdim * kdim, rin: Math.max(0, ring[0] - ring[1] - 1), rout: rout + 1, occ: occGrid, top: extra.top || 1.3, shadow: !!extra.shadow, reach: extra.reach, count: 0 };
      (extra.shadow ? W.shadowScene : W.scene).add(mesh); GR.layers.push(Ly); return Ly;
    };
    // grass: three rings of 8 × 8-cell tiles (2 m, 4 m, 8 m).  blades per cell follow the tier; each ring ends with the density the next one starts with
    const dist = tier.grassDist, r0 = low ? 8 : 9.5, r1 = LR.clamp(dist * 0.44, 18, 32), r2 = dist;
    const tq = Math.pow(tg, 0.8), B = [Math.max(4, Math.round(22 * tq)), Math.max(4, Math.round(18 * tq)), Math.max(4, Math.round(20 * tq))], C = [0.25, 0.5, 1.0], segs = low ? [2, 2, 1] : [3, 2, 1];
    const dn = (i) => B[i] / (C[i] * C[i]), b01 = 3, b12 = 6;
    layer('grass0', bladeGeo(B[0], segs[0], Math.max(4, Math.round(10 * Math.min(1, tg + 0.3)))), grassVS, grassFS, Object.assign({ STALKS: 1 }, low ? {} : { MACRO: 1 }), 8, C[0], [0, 0, r0], [r0 * 0.3, dn(1) / dn(0), b01, 1], occ.grass, { order: -4 });
    layer('grass1', bladeGeo(B[1], segs[1]), grassVS, grassFS, { STALKS: 1, MACRO: 1 }, 8, C[1], [r0, b01, r1], [r0 + (r1 - r0) * 0.3, dn(2) / dn(1), b12, 1], occ.grass, { order: -3 });
    layer('grass2', bladeGeo(B[2], segs[2]), grassVS, grassFS, { MACRO: 1 }, 8, C[2], [r1, b12, r2], [r1 + (r2 - r1) * 0.45, 0, 2, 1], occ.grass, { order: -2 });
    // flowers: whole plants near, dots of colour beyond
    const fk = GR.flowers.slice(0, 4), tot = fk.reduce((a, k) => a + (k.share || 1), 0) || 1; let acc = 0;
    const col = [], par = [], cen = [];
    for (let i = 0; i < 4; i++) { const k = fk[Math.min(i, fk.length - 1)], c = LR.rgb(k.color || '#f2640c'), e = LR.rgb(k.center || '#1c1408'); if (i < fk.length) acc += (k.share || 1) / tot;
      col.push(new T.Vector4(c[0], c[1], c[2], k.size || 0.04)); par.push(new T.Vector4(k.height === undefined ? 0.08 : k.height, i >= fk.length - 1 ? 2 : acc, k.petals || 5, k.cup === undefined ? 0.45 : k.cup)); cen.push(new T.Vector4(e[0], e[1], e[2], k.eye === undefined ? 0.26 : k.eye)); }
    const flU = { uFlCol: { value: col }, uFlPar: { value: par }, uFlCen: { value: cen } }, fr = Math.min(16, dist * 0.4);
    if (fk.length && o.flowerDensity > 0) {
      layer('flowers0', flowerGeo(2, false), flowerVS, flowerFS, {}, 16, 0.5, [0, 0, fr], [0, 0, 0, 1], occ.flowers, { uniforms: flU, order: -1, top: 1.5 });
      layer('flowers1', flowerGeo(2, true), flowerVS, flowerFS, { FAR: 1 }, 16, 0.5, [fr, 0, dist], [0, 0, 0, 1], occ.flowers, { uniforms: flU, order: -1, top: 1.5 });
    }
    // ferns and weeds: full fronds near, a lighter plant beyond, a shadow only in the nearest cascade
    if (o.fernDensity > 0) {
      const tex = (GR.frondTex = paintFronds()), feU = { tFern: { value: tex } }, n1 = low ? 12 : 15, fb = 4, fo = LR.clamp(dist * 0.75, 26, 46), nf = low ? 8 : 12;
      layer('fern0', fernGeo(nf, low ? 3 : 4, true), fernVS, fernFS, { FRONDS: nf }, 5, 0.8, [0, 0, n1], [0, 0, fb, o.fernSize], occ.fern, { uniforms: feU, order: -1, top: 1.8 });
      layer('fern1', fernGeo(7, 2, false), fernVS, fernFS, { FRONDS: 7, FAR: 1 }, 10, 0.8, [n1, fb, fo], [0, 0, 0, o.fernSize], occ.fern, { uniforms: feU, order: -1, top: 1.8 });
      if (tier.cascades >= 3 && !LR.off.has('shadow')) {
        const sh = layer('fernShadow', fernGeo(7, 2, false), fernVS, fernShadowFS, { FRONDS: 7, NOCULL: 1 }, 10, 0.8, [0, 0, 400], [0, 0, 0, o.fernSize], occ.fern, { uniforms: feU, shadow: true, reach: 13, top: 1.6 });
        const c0 = LR.render.shadow.cams[0]; sh.mesh.onBeforeRender = (r, s, cam, geo) => { geo.instanceCount = cam === c0 ? sh.count * sh.cells : 0; };
      }
    }
    LR.on('frame', GR.update, 60);
    GR.ready = true; return GR;
  };

  // ── every frame: which tiles of each layer does the eye see ─────────────────────────────────────────────────────
  const fr = new T.Frustum(), pv = new T.Matrix4(), box = new T.Box3(), CAP = 1024, cx_ = new Float32Array(CAP), cz_ = new Float32Array(CAP), cd_ = new Float32Array(CAP), cy_ = new Float32Array(CAP), cs_ = new Float32Array(CAP), ord = new Uint16Array(CAP);
  GR.update = (time, dt, cam) => {
    if (!GR.ready) return; const L = LR.land, half = L.half, nb = GR.occ.nb;
    cam.updateMatrixWorld(); pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); fr.setFromProjectionMatrix(pv);
    const ex = cam.position.x, ez = cam.position.z; let tris = 0, calls = 0, nt = 0;
    for (const Ly of GR.layers) {
      const S = Ly.S, rout = Ly.shadow ? Ly.reach : Ly.rout, rin = Ly.rin; let n = 0;
      const i0 = Math.floor((ex - rout) / S), i1 = Math.floor((ex + rout) / S), j0 = Math.floor((ez - rout) / S), j1 = Math.floor((ez + rout) / S);
      for (let j = j0; j <= j1 && n < CAP; j++) for (let i = i0; i <= i1 && n < CAP; i++) {
        const x0 = i * S, z0 = j * S, x1 = x0 + S, z1 = z0 + S;
        const nx = ex < x0 ? x0 : ex > x1 ? x1 : ex, nz = ez < z0 ? z0 : ez > z1 ? z1 : ez, dn = Math.hypot(ex - nx, ez - nz); if (dn > rout) continue;
        if (rin > 0 && Math.hypot(Math.max(Math.abs(ex - x0), Math.abs(ex - x1)), Math.max(Math.abs(ez - z0), Math.abs(ez - z1))) < rin) continue;
        if (!occupied(Ly.occ, nb, half, x0, z0, S)) continue;
        let ym = 0, ys = 0;
        if (!Ly.shadow) { const xm = x0 + S / 2, zm = z0 + S / 2, a = L.h(x0, z0), b = L.h(x1, z0), c = L.h(x0, z1), d = L.h(x1, z1), e = L.h(xm, zm), lo = Math.min(a, b, c, d, e), hi = Math.max(a, b, c, d, e);
          box.min.set(x0 - 0.7, lo - 0.5, z0 - 0.7); box.max.set(x1 + 0.7, hi + Ly.top, z1 + 0.7); if (!fr.intersectsBox(box)) continue; ym = (lo + hi) / 2; ys = (hi - lo) / 2 + 0.3; }
        cx_[n] = x0; cz_[n] = z0; cd_[n] = dn; cy_[n] = ym; cs_[n] = ys; ord[n] = n; n++;
      }
      // nearest first (they hide the rest); if there are more than the layer holds, the farthest are left out
      for (let a = 1; a < n; a++) { const v = ord[a], dv = cd_[v]; let b = a - 1; while (b >= 0 && cd_[ord[b]] > dv) { ord[b + 1] = ord[b]; b--; } ord[b + 1] = v; }
      const cnt = Math.min(n, Ly.maxT), t = Ly.tiles; for (let k = 0; k < cnt; k++) { const q = ord[k]; t[k * 4] = cx_[q]; t[k * 4 + 1] = cz_[q]; t[k * 4 + 2] = cy_[q]; t[k * 4 + 3] = cs_[q]; }
      Ly.count = cnt; Ly.geo.instanceCount = cnt * Ly.cells; Ly.mesh.visible = cnt > 0; Ly.mat.uniformsNeedUpdate = true;
      if (cnt && !Ly.shadow) { const k = cnt * Ly.cells * Ly.geo.userData.tris; tris += k; calls++; nt += cnt; GR.info[Ly.name] = k; } else if (!Ly.shadow) GR.info[Ly.name] = 0;
    }
    GR.info.tris = tris; GR.info.calls = calls; GR.info.tiles = nt; LR.render.info.grass = GR.info;
  };

  LR.on('init', () => { if (GR.enabled && !GR.ready) GR.init(); }, 40);
}

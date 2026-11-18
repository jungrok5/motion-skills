// machine-wilds · 51_flora_species — the stock trees.  Each is only numbers for LR.flora.species(); a realm defines its
// own the same way (or overrides these by name) before it plants.
//
// kind      'broadleaf' | 'conifer' | 'bush'          variants  how many seeded individuals to grow (instances pick one)
// height    [lo, hi] metres                           bark      a baked material name ('barkoak', 'barksmooth', 'barkpine', 'birch', or your own)
// trunk     len (share of the height the trunk itself takes), radius (m at the foot, for a tree of mean height), taper,
//           lean, gnarl (how much it wanders), flare (root swell), segs
// levels    one entry per order of branching, from the limbs out to the twigs:
//           count [lo, hi] | whorl { step (m), per [lo, hi] }, from..to (where along the parent), angle [lo, hi] degrees
//           from the parent (or a function of position 0..1), topAngle (× angle for the uppermost), len [lo, hi] × the
//           parent's length | lenAbs(t, H) metres, lenByT(t), rad (× the parent's radius there), up (+ lifts, − droops;
//           number or function along the branch), gnarl, taper, segs, minY, leaves (cards along this order too)
// crown     r, ry (reach sideways and up, shares of the height), cy (height of its middle): branches are cut to fit
// leaf      spray 'oak' | 'ovate' | 'birch' | 'lance' | 'needle' | 'pine', mode 'tip' | 'fan', size [lo, hi] m (a card
//           is one painted spray), perTwig, from, droop, forward, spread, tilt, leafLen / leafAspect (inside the spray),
//           summer [colours], autumn [three colours], twig, trans (how much light comes through), snow (how much stays),
//           gloss (roughness of a leaf)
// wind      trunk, branch, flutter (× the shared wind)   lod1  keep (share of cards), grow (× card size), levels (branch orders kept)
// evergreen keeps its leaves and colour in winter       collide  the walker stops at the trunk
{
  const F = LR.flora, D = LR.mat.define;
  // barks of their own (u runs round the trunk, v up it)
  D('barkoak', { tile: 1.5, bump: 0.05, por: 0.8, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float big = fbm(uv, 3., 3), mid = fbm(uv + 0.3, 9., 3), fine = fbmv(uv, 90., 3);
  vec2 w = vec2(uv.x + (big - 0.5) * 0.09 + (pn2(uv, vec2(3., 7.)) - 0.5) * 0.05, uv.y);
  float a = pn2(w, vec2(13., 4.)), b = pn2(w + 0.37, vec2(27., 8.)), c = pn2(w + 0.71, vec2(56., 15.));
  float r1 = 1. - abs(a * 2. - 1.), r2 = 1. - abs(b * 2. - 1.), r3 = 1. - abs(c * 2. - 1.);
  float ridge = pow(r1, 0.8) * 0.58 + r2 * 0.28 + r3 * 0.14;
  float cross_ = smoothstep(0.80, 0.9, pn2(uv + 0.2, vec2(6., 34.))) * smoothstep(0.45, 0.7, ridge);
  h = sat(0.12 + smoothstep(0.30, 0.80, ridge) * 0.68 - cross_ * 0.09 + (fine - 0.5) * 0.14 + (mid - 0.5) * 0.1);
  vec3 deep = S(0.20, 0.17, 0.14), body = S(0.38, 0.33, 0.28), top = S(0.50, 0.47, 0.42);
  col = mix(deep, body, smoothstep(0.12, 0.5, h)); col = mix(col, top, smoothstep(0.55, 0.9, h) * (0.5 + 0.5 * mid));
  col *= 0.82 + 0.36 * fine;
  float lichen = smoothstep(0.66, 0.74, fbm(uv + 0.37, 6., 4)) * smoothstep(0.4, 0.7, h); col = mix(col, S(0.50, 0.55, 0.44), lichen * 0.55);
  float mossy = smoothstep(0.60, 0.80, fbm(uv + 0.71, 3., 3)) * (1. - smoothstep(0.3, 0.8, h) * 0.6); col = mix(col, S(0.20, 0.29, 0.09) * (0.7 + 0.6 * fine), mossy * 0.5);
  rough = 0.93; metal = 0.;
}` });
  D('barksmooth', { tile: 1.5, bump: 0.014, por: 0.6, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float big = fbm(uv, 2., 4), mid = fbm(uv + 0.3, 8., 4), fine = fbmv(uv, 100., 3);
  float streak = pn2(uv + vec2(big * 0.05, 0.), vec2(34., 3.)), band = pn2(uv + vec2(0., big * 0.04), vec2(4., 46.));
  float wr = smoothstep(0.74, 0.86, band) * smoothstep(0.35, 0.6, pn2(uv + 0.5, vec2(6., 5.)));
  vec4 sc = vor(uv, vec2(3., 4.), 0.9); float scar = smoothstep(0.14, 0.05, sc.z) * step(0.7, sc.y);
  h = sat(0.55 + (streak - 0.5) * 0.25 + (mid - 0.5) * 0.2 - wr * 0.3 - scar * 0.35 + (fine - 0.5) * 0.1);
  vec3 a = S(0.40, 0.39, 0.36), b = S(0.30, 0.29, 0.27), c = S(0.50, 0.49, 0.45);
  col = mix(a, b, smoothstep(0.35, 0.7, big)); col = mix(col, c, smoothstep(0.5, 0.85, mid) * 0.5); col *= 0.86 + 0.26 * streak; col *= 1. - wr * 0.4 - scar * 0.55;
  vec4 lc = vor(uv + 0.21, vec2(7., 7.), 1.0); float lichen = smoothstep(0.34, 0.2, lc.z) * step(0.8, lc.y) * (0.6 + 0.4 * fine); col = mix(col, lc.w < 0.5 ? S(0.46, 0.48, 0.43) : S(0.42, 0.50, 0.33), lichen * 0.55);
  float algae = smoothstep(0.55, 0.8, fbm(uv + 0.6, 3., 3)); col = mix(col, S(0.26, 0.33, 0.16), algae * 0.3);
  rough = 0.84; metal = 0.;
}` });
  D('barkpine', { tile: 1.5, bump: 0.045, por: 0.8, glsl: `
void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal){
  float big = fbm(uv, 3., 3), fine = fbmv(uv, 90., 3);
  vec2 w = uv + vec2((big - 0.5) * 0.06, 0.);
  vec4 c = vor(w, vec2(8., 3.), 0.92), c2 = vor(w + 0.4, vec2(17., 7.), 0.95);
  float gap = smoothstep(0.0, 0.05 + 0.07 * pn2(uv, vec2(5., 5.)), c.x);
  float lay = fbm(uv + c.y * 3.0, 14., 3), flake = floor((lay * 0.7 + c2.y * 0.3) * 4.0) / 4.0;
  float inner = smoothstep(0.0, 0.03, c2.x);
  h = sat(0.1 + gap * (0.4 + flake * 0.38 + (c.w - 0.5) * 0.18) * (0.8 + 0.2 * inner) + (fine - 0.5) * 0.1);
  vec3 a = S(0.38, 0.27, 0.20), b = S(0.50, 0.37, 0.28), gy = S(0.40, 0.37, 0.34), dk = S(0.11, 0.08, 0.065);
  col = mix(a, b, flake); col = mix(col, gy, smoothstep(0.55, 0.8, c.w) * 0.55); col *= 0.82 + 0.36 * fine; col = mix(dk, col, gap * (0.75 + 0.25 * inner));
  float lichen = smoothstep(0.7, 0.76, fbm(uv + 0.37, 7., 4)) * gap; col = mix(col, S(0.48, 0.53, 0.42), lichen * 0.45);
  rough = 0.92; metal = 0.;
}` });
  // the hero: a broad, old, gnarled oak
  F.species('oak', {
    kind: 'broadleaf', variants: 3, seed: 3, height: [10.5, 13.5], bark: 'barkoak',
    trunk: { len: 0.42, radius: 0.62, taper: 0.42, lean: 0.10, gnarl: 0.55, flare: 0.9, segs: 9 },
    levels: [
      { count: [5, 7], from: 0.42, to: 1.0, angle: [48, 80], topAngle: 0.45, len: [0.95, 1.35], rad: 0.62, up: 0.26, gnarl: 0.85, taper: 0.78, segs: 7, minY: 0.1 },
      { count: [4, 6], from: 0.25, to: 0.96, angle: [35, 65], len: [0.42, 0.62], rad: 0.5, up: 0.2, gnarl: 0.8, taper: 0.8, segs: 4, leaves: 4 },
      { count: [3, 5], from: 0.3, to: 1.0, angle: [30, 62], len: [0.4, 0.62], rad: 0.5, up: 0.08, gnarl: 0.7, taper: 0.85, segs: 3 },
    ],
    crown: { r: 0.56, ry: 0.36, cy: 0.66 },
    leaf: { spray: 'oak', size: [1.1, 1.6], perTwig: 8, from: 0.15, droop: 0.2, leafLen: 0.088, leafAspect: 0.32, summer: ['#476f2c', '#55803a', '#3b6226', '#5f8a3c'], autumn: ['#b8891f', '#a65a1a', '#7a3a16'], twig: '#3e342a', trans: 0.75, snow: 0.55 },
    wind: { trunk: 0.25, branch: 0.8, flutter: 1 },
  });
  // tall forest tree: a long clean trunk, the crown high up
  F.species('beech', {
    kind: 'broadleaf', variants: 2, seed: 5, height: [17, 22], bark: 'barksmooth',
    trunk: { len: 0.66, radius: 0.40, taper: 0.5, lean: 0.04, gnarl: 0.18, flare: 0.55, segs: 9 },
    levels: [
      { count: [6, 8], from: 0.5, to: 1.0, angle: [34, 60], topAngle: 0.5, len: [0.42, 0.6], rad: 0.5, up: 0.3, gnarl: 0.5, taper: 0.8, segs: 6, minY: 0.2 },
      { count: [4, 5], from: 0.25, to: 0.96, angle: [35, 60], len: [0.4, 0.58], rad: 0.5, up: 0.15, gnarl: 0.6, taper: 0.8, segs: 4, leaves: 2 },
      { count: [3, 4], from: 0.3, to: 1.0, angle: [30, 60], len: [0.4, 0.6], rad: 0.5, up: 0.05, gnarl: 0.6, taper: 0.85, segs: 3 },
    ],
    crown: { r: 0.32, ry: 0.3, cy: 0.74 },
    leaf: { spray: 'ovate', size: [1.2, 1.8], perTwig: 8, from: 0.15, droop: 0.25, leafLen: 0.078, leafAspect: 0.3, summer: ['#4c7632', '#5a873b', '#40692b', '#67913f'], autumn: ['#c9982a', '#b56a22', '#93501c'], twig: '#40372e', trans: 0.8, snow: 0.5 },
    wind: { trunk: 0.5, branch: 0.9, flutter: 1 },
  });
  // slender, white-barked, airy, the twigs hanging
  F.species('birch', {
    kind: 'broadleaf', variants: 2, seed: 7, height: [11, 14.5], bark: 'birch',
    trunk: { len: 0.92, radius: 0.17, taper: 0.86, lean: 0.12, gnarl: 0.2, flare: 0.25, segs: 9 },
    levels: [
      { count: [10, 13], from: 0.36, to: 0.97, angle: [30, 52], len: [0.2, 0.3], lenByT: (t) => 1 - 0.55 * t, rad: 0.4, up: (s) => 0.35 - 0.8 * s, gnarl: 0.4, taper: 0.85, segs: 5, leaves: 2 },
      { count: [3, 5], from: 0.3, to: 1.0, angle: [30, 55], len: [0.4, 0.62], rad: 0.5, up: -0.4, gnarl: 0.5, taper: 0.85, segs: 3 },
    ],
    crown: { r: 0.25, ry: 0.36, cy: 0.68 },
    leaf: { spray: 'birch', size: [0.9, 1.3], perTwig: 8, from: 0.15, droop: 0.5, leafLen: 0.062, leafAspect: 0.4, leafFill: 0.85, summer: ['#5a8537', '#6a9440', '#4c772f'], autumn: ['#d8b02a', '#c99a22', '#e0c040'], twig: '#3a2f2a', trans: 0.85, snow: 0.45, gloss: 0.4 },
    wind: { trunk: 1.0, branch: 1.2, flutter: 1.3 }, lod1: { keep: 0.5, grow: 1.45, levels: 1, minRad: 0.02 },
  });
  // conifer: whorls of drooping boughs, a spire
  F.species('spruce', {
    kind: 'conifer', evergreen: true, variants: 2, seed: 11, height: [13, 18], bark: 'barkpine',
    trunk: { len: 1.0, radius: 0.24, taper: 0.93, lean: 0.02, gnarl: 0.06, flare: 0.35, segs: 8 },
    levels: [
      { whorl: { step: 0.7, per: [4, 5] }, from: 0.14, to: 0.96, angle: (t) => 100 - 42 * t, lenAbs: (t, H) => H * 0.24 * Math.pow(1 - t, 0.85) + 0.35, rad: 0.3, up: (s) => -0.28 + 0.75 * s, gnarl: 0.12, taper: 0.85, segs: 3 },
    ],
    crown: { r: 0.24, ry: 0.45, cy: 0.55 },
    leaf: { spray: 'needle', mode: 'fan', step: 0.66, size: [1.0, 1.35], perTwig: 1, droop: 0.22, tilt: 0.25, summer: ['#2a4a28', '#33562d', '#233f23'], autumn: ['#284a22', '#284a22', '#284a22'], twig: '#3b2e22', trans: 0.3, snow: 1, gloss: 0.6 },
    wind: { trunk: 0.6, branch: 0.7, flutter: 0.5 }, lod1: { keep: 0.5, grow: 1.45, levels: 0 },
  });
  // pine: a bare red trunk, a flat crown of needle tufts high up
  F.species('pine', {
    kind: 'broadleaf', evergreen: true, variants: 2, seed: 13, height: [15, 19], bark: 'barkpine',
    trunk: { len: 0.82, radius: 0.3, taper: 0.6, lean: 0.08, gnarl: 0.25, flare: 0.4, segs: 9 },
    levels: [
      { count: [6, 8], from: 0.6, to: 1.0, angle: [55, 86], topAngle: 0.5, len: [0.22, 0.34], rad: 0.45, up: 0.25, gnarl: 0.7, taper: 0.8, segs: 5, leaves: 1 },
      { count: [4, 6], from: 0.3, to: 1.0, angle: [30, 62], len: [0.4, 0.62], rad: 0.55, up: 0.3, gnarl: 0.6, taper: 0.85, segs: 3 },
    ],
    crown: { r: 0.27, ry: 0.2, cy: 0.84 },
    leaf: { spray: 'pine', size: [1.2, 1.8], perTwig: 8, from: 0.35, droop: 0.0, forward: 0.9, spread: 0.55, leafLen: 0.3, summer: ['#35562e', '#406536', '#2e4a30'], autumn: ['#365a2c', '#365a2c', '#365a2c'], twig: '#4a3528', trans: 0.35, snow: 0.9, gloss: 0.55 },
    wind: { trunk: 0.7, branch: 0.8, flutter: 0.6 },
  });
  // a round shrub: stems straight from the ground
  // a climber: plant it at the foot of a wall (0.1 m out) and half of it disappears into the wall, the rest covers it.
  // Tall and narrow, small leaves, red in autumn, bare stems in winter.
  F.species('climber', {
    kind: 'bush', variants: 3, seed: 41, height: [2.6, 4.4], stems: [5, 8], bark: 'barksmooth', collide: false,
    trunk: { radius: 0.022 },
    levels: [
      { gnarl: 0.9, up: 0.6, taper: 0.85, segs: 6, leaves: 7 },
      { count: [3, 6], from: 0.12, to: 1.0, angle: [28, 70], len: [0.22, 0.42], rad: 0.6, up: 0.3, gnarl: 0.7, taper: 0.85, segs: 3 },
    ],
    crown: { r: 0.3, ry: 0.52, cy: 0.5 },
    leaf: { spray: 'ovate', size: [0.42, 0.7], perTwig: 8, from: 0.05, droop: 0.3, leafLen: 0.085, leafAspect: 0.5, summer: ['#3c6a2a', '#487a32', '#2f5a24', '#56883a'], autumn: ['#b02a1c', '#c8501e', '#8a1e16'], twig: '#3e3228', trans: 0.65, snow: 0.6 },
    wind: { trunk: 0.1, branch: 0.6, flutter: 1.3 }, lod1: { keep: 0.5, grow: 1.5, levels: 0 },
  });
  F.species('bush', {
    kind: 'bush', variants: 2, seed: 17, height: [1.3, 1.9], stems: [6, 9], bark: 'barksmooth', collide: false,
    trunk: { radius: 0.035 },
    levels: [
      { gnarl: 0.5, up: 0.22, taper: 0.8, segs: 4, leaves: 5 },
      { count: [2, 4], from: 0.35, to: 1.0, angle: [30, 62], len: [0.4, 0.62], rad: 0.6, up: 0.1, gnarl: 0.5, taper: 0.85, segs: 3 },
    ],
    crown: { r: 0.6, ry: 0.5, cy: 0.5 },
    leaf: { spray: 'ovate', size: [0.55, 0.9], perTwig: 7, from: 0.15, droop: 0.12, leafLen: 0.09, leafAspect: 0.33, summer: ['#44702c', '#538036', '#386126'], autumn: ['#b0401c', '#c8782a', '#8a2a18'], twig: '#43382c', trans: 0.7, snow: 0.7 },
    wind: { trunk: 0.3, branch: 1.2, flutter: 1.2 }, lod1: { keep: 0.5, grow: 1.45, levels: 0 },
  });
}

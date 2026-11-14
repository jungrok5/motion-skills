// 청룡 · 여의주 — 30_hanok: the Korean buildings and props of the film, built with DR.arch.
//   Hanok.nugak(opts)      the hero: a two-storey lake pavilion (누각), 5 × 3 bays, hip-and-gable double-eave roof, dancheong
//   Hanok.jeongja(opts)    a hexagonal pavilion (육모정) for a rock promontory
//   Hanok.pagoda(opts)     a three-storey granite pagoda in the Silla manner
//   Hanok.seokdeung(opts)  a stone lantern whose fire chamber glows
//   Hanok.sotdae(opts)     village bird poles (three stand together; opts.variant 0..2 for one)
//   Hanok.wall(points, opts)  a low stone-and-clay wall with a tile cap along a polyline [[x, y, z], …]
//   Hanok.bridge(opts)     a small arched granite bridge
// Each returns a THREE.Group: origin at ground centre, y = 0 the ground, front toward +z, metres; opts.seed.
// group.userData = { size: [x, y, z], anchors: {…}, tris }.
// Hanok.glow = { value } is the level of every warm light (paper doors, silk lanterns, the stone lantern's fire);
// Hanok.events = [] is the gust / shock table of the pendulums: push { t0, strength (rad), dir: [x, z], at?, speed? }.
const Hanok = { glow: { value: 1 }, events: [] };
{
  const A = DR.arch, PI = Math.PI, TAU = DR.TAU;
  // the five colours of dancheong and the grounds they sit on (sRGB; written into GLSL and vertex paint as linear)
  const C = { noerok: '#4f8a72', noerokD: '#3d7462', yangrok: '#86b58f', samcheong: '#2d5fa8', jangdan: '#cf5a30', red: '#b93427', hwang: '#e0b040', yuksaek: '#e6b79b', bun: '#e6e0cc', meok: '#1a1714',
    seokganju: '#7b3324', floor: '#7a5f43', granite: '#bdb9ae', graniteD: '#a09c92', clay: '#a3875f', bronze: '#8f6f3c', gilt: '#d9a53a', silkR: '#d8261f', silkB: '#2449b8', bare: '#8e867a', iron: '#2a2826' };
  const K = { PLAIN: 0, BEAM: 1, RAFTER: 2, RAFTER_END: 3, FLY: 4, FLY_END: 5, BRACKET: 6, COLUMN: 7, WOOD: 8, BOARD: 9, CEIL: 10, SIGN: 11, PLASTER: 12, BARE: 13, GABLE: 14 };
  Hanok.C = C; Hanok.K = K;
  const g3 = (hex) => { const c = DR.rgb(hex); return `vec3(${c[0].toFixed(4)}, ${c[1].toFixed(4)}, ${c[2].toFixed(4)})`; };

  // ── dancheong in GLSL: every member is painted from its own metres.  Beam ends carry the meoricho (end bands, a half
  //    lotus, a pomegranate, corner rosettes, then chevron stripes fading into the calm green middle); rafters carry
  //    bands and a rosette on the end grain; columns a hanging band under the capital. Detail fades to its mean by footprint. ──
  const DANCHEONG = /* glsl */`
    const vec3 cNR = ${g3(C.noerok)}, cND = ${g3(C.noerokD)}, cYR = ${g3(C.yangrok)}, cSC = ${g3(C.samcheong)}, cJD = ${g3(C.jangdan)}, cRD = ${g3(C.red)}, cHW = ${g3(C.hwang)}, cYK = ${g3(C.yuksaek)}, cBN = ${g3(C.bun)}, cMK = ${g3(C.meok)}, cSG = ${g3(C.seokganju)};
    float dcS(float e, float w){ return smoothstep(-w, w, e); }
    vec3 dcRose(vec2 p, float n, float w, vec3 ground){
      float rq = dot(p, p), r = sqrt(rq), c2 = (p.x * p.x - p.y * p.y) / (rq + 1e-5), c4 = 2.0 * c2 * c2 - 1.0;       // cos(nθ) without atan
      float cn = n < 7.0 ? c2 * (4.0 * c2 * c2 - 3.0) : (n < 9.0 ? 2.0 * c4 * c4 - 1.0 : c2 * (16.0 * c2 * c2 * c2 * c2 - 20.0 * c2 * c2 + 5.0));
      float lobe = 0.5 + 0.5 * cn, r2 = 0.50 + 0.12 * lobe, r3 = 0.80 + 0.08 * (1.0 - lobe);
      vec3 c = mix(cSC, ground, dcS(r - 0.97, w));
      c = mix(cMK, c, dcS(abs(r - 0.97) - 0.03, w));
      c = mix(cBN, c, dcS(r - r3 - 0.05, w)); c = mix(cYR, c, dcS(r - r3, w));
      c = mix(cBN, c, dcS(r - r2 - 0.05, w)); c = mix(mix(cRD, cYK, smoothstep(0.2, r2, r)), c, dcS(r - r2, w));
      return mix(cHW, c, dcS(r - 0.17, w));
    }
    void dcBeam(inout vec3 col, vec2 uv, float hw, float len, float px){
      float zone = min(5.2 * hw, 0.42 * len), k = zone / 5.2;
      float x = min(uv.x, len - uv.x) / k, y = uv.y / hw, ay = abs(y), w = px / k + 0.012, far = smoothstep(0.3, 1.0, px / k);
      vec3 c = mix(col, cBN, (dcS(ay - 0.80, w) - dcS(ay - 0.88, w)) * (1.0 - far));
      c = mix(c, cMK, dcS(ay - 0.90, w) * (1.0 - far) * 0.85);
      float q = x - 3.3 - 0.9 * (1.0 - ay);
      if (q < 1.6) {
        float bi = floor(q / 0.4), bf = fract(q / 0.4), w4 = w * 2.5;
        vec3 h = bi < 0.5 ? cJD : (bi < 1.5 ? cHW : (bi < 2.5 ? cSC : cYR));
        h = mix(cBN, h, dcS(bf - 0.2, w4)); h = mix(cMK, h, dcS(bf - 0.05, w4));
        if (q < 0.0) {
          h = cND;
          float pe = length(vec2(x - 2.25, y) * vec2(0.9, 1.6));
          h = mix(cBN, h, dcS(pe - 0.62, w)); h = mix(cRD, h, dcS(pe - 0.52, w)); h = mix(cHW, h, dcS(pe - 0.2, w));
          vec2 f = vec2(x - 0.5, y); if (dot(f, f) < 1.1) h = dcRose(f, 10.0, w, h);
          float gr = length(vec2(x - 2.2, ay - 1.0));
          h = mix(cBN, h, dcS(gr - 0.62, w)); h = mix(cSC, h, dcS(gr - 0.55, w)); h = mix(cBN, h, dcS(gr - 0.36, w)); h = mix(cJD, h, dcS(gr - 0.3, w));
          if (x < 0.5) h = mix(cJD, mix(cBN, cSC, dcS(x - 0.3, w)), dcS(x - 0.22, w));
          h = mix(cMK, h, dcS(abs(x - 0.5) - 0.03, w));
        }
        vec3 mean = mix(cJD * 0.28 + cSC * 0.24 + cYK * 0.22 + cND * 0.26, col, smoothstep(1.2, 5.2, x));
        c = mix(h, mean, far);
      }
      col = c;
    }
    void archPaint(inout vec3 col, inout float rough, inout float metal, vec2 uv, vec4 k, float px, vec3 op, vec3 on){
      float kd = k.x;
      if (kd < 0.5) return;
      if (kd < 1.5) { dcBeam(col, uv, k.y, k.z, px); }
      else if (kd < 2.5) {                                   // round rafter: u from the tip
        float d = 2.0 * k.y, x = uv.x / d, w = px / d + 0.02;
        if (x < 2.4) { vec3 h = x < 0.3 ? cJD : (x < 0.42 ? cBN : (x < 0.85 ? cSC : (x < 0.97 ? cBN : (x < 1.3 ? cHW : (x < 1.38 ? cMK : cYR)))));
          float sc = 1.95 + 0.3 * cos(uv.y / k.y * 2.0); if (x > 1.38) h = mix(mix(cYR, cRD, dcS(x - sc + 0.22, w)), col, dcS(x - sc, w));
          col = mix(h, mix(cSC * 0.4 + cJD * 0.3 + cBN * 0.3, col, smoothstep(0.4, 2.4, x)), smoothstep(0.25, 0.9, px / d)); }
      } else if (kd < 3.5) {                                 // rafter end grain: a rosette
        vec2 p = vec2(uv.x - k.z * 0.5, uv.y) / max(k.y, 0.01); float w = px / max(k.y, 0.01) + 0.03;
        col = mix(dcRose(p, 6.0, w, cNR), cSC * 0.35 + cYK * 0.4 + cBN * 0.25, smoothstep(0.35, 1.0, px / k.y));
      } else if (kd < 4.5) {                                 // square flying rafter
        float d = 0.1, x = uv.x / d; if (x < 1.5) { vec3 h = x < 0.4 ? cSC : (x < 0.52 ? cBN : (x < 0.9 ? cJD : (x < 1.02 ? cBN : (x < 1.4 ? cYR : cMK)))); col = mix(h, mix(cSC, cJD, 0.5) * 0.6 + cBN * 0.25, smoothstep(0.25, 0.9, px / d)); }
      } else if (kd < 5.5) {                                 // its end: a framed square with a lozenge
        vec2 p = vec2(uv.x - k.z * 0.5, uv.y) / max(k.y, 0.01); float m = max(abs(p.x), abs(p.y)), l = abs(p.x) + abs(p.y), w = px / max(k.y, 0.01) + 0.04;
        vec3 h = mix(cSC, cBN, dcS(m - 0.72, w)); h = mix(h, cMK, dcS(m - 0.9, w)); h = mix(cHW, h, dcS(l - 0.62, w)); h = mix(cRD, h, dcS(l - 0.3, w));
        col = mix(h, cSC * 0.5 + cBN * 0.3 + cHW * 0.2, smoothstep(0.4, 1.1, px / k.y));
      } else if (kd < 6.5) {                                 // bracket blocks: edge lines on box faces
        if (k.y > 0.02) { float ay = abs(uv.y) / k.y, ex = min(uv.x, k.z - uv.x) / k.y, e = min(1.0 - ay, ex), w = px / k.y + 0.02, nr = 1.0 - smoothstep(0.3, 0.9, px / k.y);
          col = mix(col, cBN, (dcS(0.26 - e, w) - dcS(0.12 - e, w)) * nr); col = mix(col, cMK, dcS(0.1 - e, w) * nr * 0.8); }
      } else if (kd < 7.5) {                                 // column: a hanging band under the capital
        float d = k.z - uv.x, w = px + 0.003;
        if (d < 0.62) { float sc = 0.46 + 0.07 * cos(uv.y / k.y * 8.0), sc2 = sc - 0.11;
          vec3 h = mix(cNR, col, dcS(d - sc, w)); h = mix(cBN, h, (dcS(d - sc + 0.022, w) - dcS(d - sc, w))); h = mix(mix(cRD, cYK, smoothstep(0.24, sc2, d)), h, dcS(d - sc2, w));
          h = d < 0.24 ? (d < 0.07 ? cJD : (d < 0.09 ? cBN : (d < 0.215 ? cSC : cBN))) : h; h = mix(cMK, h, dcS(abs(d - 0.24) - 0.008, w));
          col = mix(h, mix(cSC * 0.35 + cYR * 0.3 + cRD * 0.35, col, smoothstep(0.1, 0.62, d)), smoothstep(0.03, 0.12, px)); }
        rough = 0.66;
      } else if (kd < 8.5) {                                 // bare floor boards along u
        float pl = uv.y / 0.21, f = fract(pl), nr = 1.0 - smoothstep(0.02, 0.08, px);
        col *= 0.82 + 0.36 * drHash(vec2(floor(pl), 3.0)); col *= 1.0 - 0.55 * nr * (1.0 - smoothstep(0.0, 0.05, min(f, 1.0 - f)));
        col *= 0.8 + 0.4 * drN4(vec2(uv.x * 0.25, uv.y * 4.0)).g; rough = 0.6;
      } else if (kd < 9.5) {                                 // painted boards (soffits)
        float f = fract(uv.x / 0.31); col *= 1.0 - 0.3 * (1.0 - smoothstep(0.0, 0.06, min(f, 1.0 - f))) * (1.0 - smoothstep(0.02, 0.08, px));
      } else if (kd < 10.5) {                                // coffered ceiling: frames and a rosette in every panel
        vec2 cq = fract(uv / 0.62) - 0.5; float m = max(abs(cq.x), abs(cq.y)), w = px / 0.62 + 0.01, far = smoothstep(0.1, 0.4, px);
        vec3 h = dcRose(cq / 0.3, 8.0, w * 3.3, cND); h = mix(h, cBN, dcS(m - 0.40, w)); h = mix(h, cSG, dcS(m - 0.425, w));
        col = mix(h, cND * 0.6 + cSG * 0.25 + cSC * 0.15, far);
      } else if (kd < 11.5) { col = vec3(0.012, 0.011, 0.010); rough = 0.36;      // name board: black lacquer (its strokes are gilt geometry)
      } else if (kd < 12.5) { col *= 0.88 + 0.2 * drN4(uv * 0.6).r; rough = 0.92;
      } else if (kd < 13.5) {                                // bare weathered wood
        vec4 g = drN4(vec2(uv.x * 0.6, uv.y * 9.0 + k.w * 5.0)); col *= 0.7 + 0.6 * g.r; col *= 1.0 - 0.5 * smoothstep(0.78, 0.86, g.b) * (1.0 - smoothstep(0.004, 0.02, px)); rough = 0.9;
      } else {                                               // gable wall: courses of grey brick in lime
        vec2 b = vec2(uv.x / 0.26 + floor(uv.y / 0.075) * 0.5, uv.y / 0.075), f = fract(b); float j = min(min(f.x, 1.0 - f.x) * 3.4, min(f.y, 1.0 - f.y)), far = smoothstep(0.02, 0.06, px);
        col = mix(mix(col, vec3(0.20, 0.20, 0.21) * (0.8 + 0.4 * drHash(floor(b))), smoothstep(0.08, 0.16, j)), mix(col, vec3(0.20), 0.75), far); rough = 0.9;
      }
    }`;
  let MATS = null;
  Hanok.mats = () => MATS || (MATS = A.materials({ pattern: DR.P.has('nopat') ? undefined : DANCHEONG, lamp: Hanok.glow, events: Hanok.events }));
  const cumul = (bays) => { const tot = bays.reduce((s, x) => s + x, 0), out = [-tot / 2]; for (const w of bays) out.push(out[out.length - 1] + w); return out; };
  const finish = (W, size, anchors) => { const g = W.build(Hanok.mats()); g.userData.size = size; g.userData.anchors = anchors; return g; };
  const ROOF_KINDS = { rafter: K.RAFTER, rafterEnd: K.RAFTER_END, fly: K.FLY, flyEnd: K.FLY_END, board: K.PLAIN, soffit: K.BOARD, hip: K.BEAM, hipEnd: K.FLY_END, ceil: K.CEIL, gable: K.GABLE, barge: K.PLAIN };
  const ROOF_PAINTS = { rafter: C.noerok, rafterEnd: C.noerok, fly: C.noerok, flyEnd: C.samcheong, fascia: C.noerokD, fascia2: C.seokganju, soffit: C.noerokD, hip: C.noerok, hipEnd: C.samcheong, ceil: C.noerokD, gable: C.bun, barge: C.seokganju };

  // a wind chime (풍경): a small bronze bell on a hook and, on a longer wire through it, a fish-shaped plate that catches the wind
  const chime = (W, p, seed) => { W.fam('metal').shade(1);
    W.pivot(p, 0.16, seed).paint(C.iron).kind(1).tube([[p[0], p[1], p[2]], [p[0], p[1] - 0.09, p[2]]], 0.006, { seg: 4 });
    W.paint(C.bronze).kind(0, 0, 0, seed).at(p[0], p[1] - 0.21, p[2], (w) => w.lathe([[0.062, 0], [0.058, 0.02], [0.05, 0.07], [0.036, 0.105], [0.014, 0.12], [0, 0.122]], { seg: 10 }));
    W.pivot([p[0], p[1] - 0.12, p[2]], 0.34, DR.fract(seed * 7.3 + 0.31)).paint(C.iron).kind(1).tube([[p[0], p[1] - 0.12, p[2]], [p[0], p[1] - 0.36, p[2]]], 0.004, { seg: 4 });
    const fish = [[-0.1, 0], [-0.06, 0.04], [0.0, 0.05], [0.06, 0.025], [0.085, 0.05], [0.1, 0.055], [0.092, 0], [0.1, -0.055], [0.085, -0.05], [0.06, -0.025], [0.0, -0.05], [-0.06, -0.04]];
    W.paint(C.bronze).kind(0, 0, 0, seed + 0.2).push().move(p[0], p[1] - 0.42, p[2]).rotY(seed * 9).rotZ(-PI / 2).extrude(fish, 0.006).pop(); W.pivot(null); };
  // a silk lantern (청사초롱): red above, blue below, lit from inside, on a cord with a tassel
  const lantern = (W, p, seed, cord = 0.3) => { W.fam('metal').shade(1).pivot(p, cord + 0.25, seed);
    W.paint(C.meok).kind(4).tube([[p[0], p[1], p[2]], [p[0], p[1] - cord, p[2]]], 0.006, { seg: 4 });
    W.push().move(p[0], p[1] - cord, p[2]).rotY(seed * 5);
    W.paint(C.meok).kind(4).lathe([[0.0, 0.0], [0.11, -0.01], [0.125, -0.04]].reverse(), { seg: 6, flat: true });
    W.paint(C.silkR).kind(3, 0, 0, seed).lathe([[0.118, -0.22], [0.128, -0.13], [0.118, -0.04]], { seg: 6, flat: true });
    W.paint(C.silkB).kind(3, 0, 0, seed).lathe([[0.108, -0.4], [0.124, -0.31], [0.118, -0.22]], { seg: 6, flat: true });
    W.paint(C.meok).kind(4).lathe([[0.0, -0.44], [0.09, -0.43], [0.115, -0.4]], { seg: 6, flat: true });
    W.paint(C.red).kind(4).tube([[0, -0.44, 0], [0, -0.6, 0], [0, -0.72, 0]], (u) => 0.008 + 0.014 * DR.smooth(0.3, 0.7, u), { seg: 5 });
    W.pop().pivot(null); };
  Hanok.chime = chime; Hanok.lantern = lantern;

  // a bracket set (공포) on top of a column or between columns: capital block, two tiers of arms along the wall and
  // beaked arms across it, bearing blocks.  Local frame: x along the wall, z outward, y = 0 on the plate.
  const AMS = (L, h) => [[-L / 2, h], [-L / 2, 0.075], [-L / 2 + 0.045, 0.022], [-L / 2 + 0.12, 0], [L / 2 - 0.12, 0], [L / 2 - 0.045, 0.022], [L / 2, 0.075], [L / 2, h]];
  const BEAK_UP = [[-0.32, 0], [0.36, 0], [0.47, -0.035], [0.57, -0.005], [0.65, 0.09], [0.69, 0.215], [0.6, 0.135], [0.51, 0.105], [0.43, 0.17], [-0.32, 0.17]];
  const BEAK_DN = [[-0.38, 0], [0.58, 0], [0.7, -0.04], [0.8, -0.1], [0.88, -0.2], [0.87, -0.06], [0.81, 0.05], [0.72, 0.13], [0.62, 0.17], [-0.38, 0.17]];
  const bracket = (W, x, y, z, ang, diag) => { const rim = { w: 0.015, paint: C.bun }, ex = { rim, sidePaint: '#9c4a2e' };
    W.fam('timber').push().move(x, y, z).rotY(ang).shade(0.92);
    W.paint(C.noerok).kind(K.BRACKET, 0.1, 0, 0.3).box(0.25, 0.1, 0.25, { at: [0, 0, 0], base: true, top: [1.44], axis: 'y', skip: 'tb' }).box(0.36, 0.08, 0.36, { at: [0, 0.1, 0], base: true, skip: 'b' });
    W.kind(K.PLAIN).extrude(AMS(0.92, 0.17), 0.1, ex).at(0, 0.21, 0, (w) => w.extrude(AMS(1.34, 0.17), 0.1, ex)).at(0, 0.19, 0.33, (w) => w.extrude(AMS(0.84, 0.15), 0.09, ex));
    W.move(0, 0.15, 0);
    for (const [dx, dz, yy] of [[-0.37, 0, 0.17], [0.37, 0, 0.17], [0, 0.33, 0.17], [-0.58, 0, 0.38], [0.58, 0, 0.38], [-0.33, 0.33, 0.34], [0.33, 0.33, 0.34]]) W.paint(C.noerok).kind(K.BRACKET, 0.035, 0, 0.6).box(0.15, 0.07, 0.15, { at: [dx, yy - 0.15 + 0.0, dz], base: true, top: [1.25], axis: 'y', skip: 'b' });
    W.kind(K.PLAIN).paint(C.noerok);
    for (const a of diag ? [0, PI / 4, -PI / 4] : [0]) { const k = a ? 1.3 : 1; W.push().rotY(a - PI / 2).scale(k, 1, 1).extrude(BEAK_UP, 0.1, ex).at(0, 0.21, 0, (w) => w.extrude(BEAK_DN, 0.1, ex)).pop(); }
    W.shade(1).pop(); };

  // ── 누각: the lake pavilion ──────────────────────────────────────────────────────────────────────────────────
  Hanok.nugak = (opts = {}) => {
    const seed = opts.seed ?? 1, rnd = DR.rng(seed * 13 + 1);
    const xs = cumul(opts.baysX || [2.8, 3.1, 3.4, 3.1, 2.8]), zs = cumul(opts.baysZ || [2.9, 3.2, 2.9]), X = xs[xs.length - 1], Z = zs[zs.length - 1], nx = xs.length, nz = zs.length;
    const yP = 0.5, yF = 3.25, yC = 5.85, OV = 1.95, a = X + OV, b = Z + OV, yE = 6.5, FX = X + 0.62, FZ = Z + 0.62;
    const roofAO = A.eaveAO({ a, b, y: yE - 0.06, slope: 0.36 }), floorAO = A.eaveAO({ a: FX, b: FZ, y: yF - 0.3, min: 0.36 });
    const W = A.writer({ seed, sky: (x, y, z, n0, n1, n2) => { const r = roofAO(x, y, z, n0, n1, n2); return y < yF - 0.3 ? Math.min(r, floorAO(x, y, z, n0, n1, n2)) : r; } });
    // platform of long dressed blocks, paved; a plain stair at the front
    const PX = X + 1.55, PZ = Z + 1.55;
    W.fam('stone').paint(C.granite).kind(0);
    for (const [x0, z0, x1, z1] of [[-PX, PZ, PX, PZ], [PX, PZ, PX, -PZ], [PX, -PZ, -PX, -PZ], [-PX, -PZ, -PX, PZ]]) W.push().move(x0, 0, z0).rotY(-Math.atan2(z1 - z0, x1 - x0)).move(0, 0, -0.2).blockWall(Math.hypot(x1 - x0, z1 - z0), yP, 0.4, { faces: 'f', course: 0.25, block: 1.6, seed: seed + 3 + x0 + z0 * 3 }).pop();
    W.paint(C.granite, 0.92).kind(3, 0.36, 1.15, 0.4).poly([[-PX, yP, PZ], [PX, yP, PZ], [PX, yP, -PZ], [-PX, yP, -PZ]], { hint: [0, 1, 0], uvs: [[0, 0], [2 * PX, 0], [2 * PX, 2 * PZ], [0, 2 * PZ]] });
    W.paint(C.granite).kind(0).push().move(0, 0, PZ + 0.96).stairs(3.6, 3, yP / 3, 0.32, { blocks: 3, seed: seed + 5 }).pop();
    // ground storey: granite pillars on base stones carry the floor frame
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const x = xs[i], z = zs[j];
      W.fam('stone').paint(C.graniteD).kind(0, 0, 0, rnd()).box(0.78, 0.17, 0.78, { at: [x, yP, z], base: true, top: [0.9], skip: 'b' });
      W.paint(C.granite).kind(4, 0, 0, rnd()).box(0.5, 2.3, 0.5, { at: [x, yP + 0.17, z], base: true, top: [0.86], axis: 'y', skip: 'b' }); }
    W.fam('timber').paint(C.seokganju).kind(K.PLAIN);
    for (const z of zs) W.beam([-FX + 0.05, 3.08, z], [FX - 0.05, 3.08, z], 0.26, 0.24);
    for (const x of xs) W.beam([x, 3.07, -FZ + 0.05], [x, 3.07, FZ - 0.05], 0.26, 0.22);
    W.paint(C.floor).kind(K.WOOD).poly([[-FX, yF, FZ], [FX, yF, FZ], [FX, yF, -FZ], [-FX, yF, -FZ]], { hint: [0, 1, 0], uvs: [[-FX, FZ], [FX, FZ], [FX, -FZ], [-FX, -FZ]] });
    W.paint(C.floor, 0.5).kind(K.BOARD).poly([[-FX, yF - 0.06, FZ], [FX, yF - 0.06, FZ], [FX, yF - 0.06, -FZ], [-FX, yF - 0.06, -FZ]], { hint: [0, -1, 0], uvs: [[-FX, FZ], [FX, FZ], [FX, -FZ], [-FX, -FZ]] });
    const ringPts = [[-FX, FZ], [FX, FZ], [FX, -FZ], [-FX, -FZ]];
    for (let i = 0; i < 4; i++) { const p = ringPts[i], q = ringPts[(i + 1) % 4]; W.paint(C.seokganju).kind(K.BEAM).beam([p[0], yF - 0.14, p[1]], [q[0], yF - 0.14, q[1]], 0.1, 0.3); }
    // upper storey: round columns with entasis, tie beams, plates
    const colP = [[0.2, 0], [0.212, 0.55], [0.215, 0.9], [0.206, 1.6], [0.188, 2.2], [0.172, yC - yF]];
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) W.paint(C.seokganju).kind(K.COLUMN, 0, 0, rnd()).at(xs[i], yF, zs[j], (w) => w.lathe(colP, { seg: 14 }));
    const tie = (p, q, plate) => { W.paint(C.noerok).kind(K.BEAM, 0, 0, rnd()).beam([p[0], yC - 0.16, p[1]], [q[0], yC - 0.16, q[1]], 0.2, 0.32, { skip: 'lr' }); if (plate) W.beam([p[0], yC + 0.06, p[1]], [q[0], yC + 0.06, q[1]], 0.32, 0.12, { skip: 'lr' }); };
    for (let i = 0; i < nx - 1; i++) { tie([xs[i], Z], [xs[i + 1], Z], 1); tie([xs[i + 1], -Z], [xs[i], -Z], 1); if (i >= 1 && i <= nx - 3) { tie([xs[i], zs[2]], [xs[i + 1], zs[2]]); tie([xs[i + 1], zs[1]], [xs[i], zs[1]]); } }
    for (let j = 0; j < nz - 1; j++) { tie([X, zs[j + 1]], [X, zs[j]], 1); tie([-X, zs[j]], [-X, zs[j + 1]], 1); if (j === 1) { tie([xs[nx - 2], zs[2]], [xs[nx - 2], zs[1]]); tie([xs[1], zs[1]], [xs[1], zs[2]]); } }
    for (let i = 1; i < nx - 1; i++) W.paint(C.noerok).kind(K.BEAM, 0, 0, rnd()).beam([xs[i], yC + 0.42, -Z], [xs[i], yC + 0.42, Z], 0.3, 0.4);
    // brackets on every outer column and one between (dapo)
    const yB = yC + 0.12;
    for (let i = 0; i < nx; i++) for (const sz of [1, -1]) { const corner = i === 0 || i === nx - 1; bracket(W, xs[i], yB, sz * Z, corner ? Math.atan2(Math.sign(xs[i]), sz) : sz > 0 ? 0 : PI, corner); if (i < nx - 1) bracket(W, (xs[i] + xs[i + 1]) / 2, yB, sz * Z, sz > 0 ? 0 : PI); }
    for (let j = 0; j < nz - 1; j++) for (const sx of [1, -1]) { if (j > 0) bracket(W, sx * X, yB, zs[j], sx * PI / 2); bracket(W, sx * X, yB, (zs[j] + zs[j + 1]) / 2, sx * PI / 2); }
    // the roof
    const R = A.roof(W, { type: 'gablehip', a, b, y: yE, rise: opts.rise ?? 4.0, curve: { k: 0.6, e: 2.2 }, lift: opts.lift ?? 0.72, liftPow: 2.6, liftFall: 2.2, flare: 0.035, gable: 0.47, seed,
      tile: { w: 0.35, r: 0.082, seg: 8, round: 6 }, eave: { double: true, wall: OV, inner: 0.9 }, ridge: { style: opts.ridge || 'plaster', w: 0.36, h: 0.44, rise: 0.26 }, hipRidge: { w: 0.28, h: 0.27, rise: 0.08 }, figures: opts.figures ?? 3, kinds: ROOF_KINDS, paints: ROOF_PAINTS });
    // purlins under the rafters: on the column line and one step out on the brackets
    const E = R.eave, F0 = R.faces[0], yR = (m) => R.P(F0, 0, E.q(m), 0, E.rafterDrop)[1] - 0.075;
    const loop = (off, y, fn) => { const px = X + off, pz = Z + off, c = [[-px, pz], [px, pz], [px, -pz], [-px, -pz]]; for (let i = 0; i < 4; i++) fn([c[i][0], y, c[i][1]], [c[(i + 1) % 4][0], y, c[(i + 1) % 4][1]]); };
    W.fam('timber').shade(0.9);
    loop(0, yR(OV) - 0.14, (p, q) => W.paint(C.noerok).kind(K.BEAM, PI * 0.14, 0, rnd()).tube([p, q], 0.14, { seg: 10, up: [0, -1, 0] }));
    loop(0, (yB + 0.53 + yR(OV) - 0.28) / 2, (p, q) => W.paint(C.noerok).kind(K.BEAM, 0, 0, rnd()).beam(p, q, 0.1, Math.max(0.08, yR(OV) - 0.28 - yB - 0.53 + 0.02)));
    loop(0.33, yR(OV - 0.33) - 0.11, (p, q) => W.paint(C.noerok).kind(K.BEAM, PI * 0.11, 0, rnd()).tube([p, q], 0.11, { seg: 9, up: [0, -1, 0] }));
    loop(0.33, (yB + 0.49 + yR(OV - 0.33) - 0.22) / 2, (p, q) => W.paint(C.noerok).kind(K.BEAM, 0, 0, rnd()).beam(p, q, 0.09, Math.max(0.06, yR(OV - 0.33) - 0.22 - yB - 0.49 + 0.02)));
    W.shade(1);
    // the room in the middle: lattice doors backed with paper, wooden lower panels
    const lights = [];
    const doorBay = (p, q) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]), ang = -Math.atan2(q[1] - p[1], q[0] - p[0]), Lo = L - 0.4, hD = yC - 0.32 - yF, n = 4, lw = (Lo - 0.12) / n;
      W.push().move(p[0], yF, p[1]).rotY(ang).fam('timber').paint(C.seokganju).kind(K.PLAIN);
      W.box(Lo, 0.1, 0.14, { at: [L / 2, 0, 0], base: true }).box(Lo, 0.1, 0.12, { at: [L / 2, hD - 0.1, 0], base: true });
      for (const xx of [0.2 + 0.03, L - 0.2 - 0.03]) W.box(0.06, hD - 0.2, 0.12, { at: [xx, 0.1, 0], base: true, axis: 'y', skip: 'tb' });
      for (let k = 0; k < n; k++) { const x0 = 0.26 + k * lw, h0 = 0.1, h1 = hD - 0.1, st = 0.042, pb = h0 + 0.5;
        W.fam('timber').paint(C.noerokD).kind(K.PLAIN);
        for (const xx of [x0 + st / 2 + 0.004, x0 + lw - st / 2 - 0.004]) W.box(st, h1 - h0, 0.05, { at: [xx, h0, 0.02], base: true, axis: 'y', skip: 'tb' });
        for (const yy of [h0, pb - st, h1 - st]) W.box(lw - 2 * st, st, 0.05, { at: [x0 + lw / 2, yy, 0.02], base: true, skip: 'lr' });
        W.paint(C.noerok).kind(K.BRACKET, 0, 0, 0.5).box(lw - 2 * st, pb - st - h0 - st, 0.02, { at: [x0 + lw / 2, h0 + st, 0.015], base: true, skip: 'lrtbk' });
        const pw = lw - 2 * st - 0.008, ph = h1 - st - pb, xa = x0 + st + 0.004;
        W.fam('paper').paint(C.seokganju, 0.55).kind(0, pw / 2, ph, rnd()).poly([[xa, pb, 0.012], [xa + pw, pb, 0.012], [xa + pw, pb + ph, 0.012], [xa, pb + ph, 0.012]], { hint: [0, 0, 1], uvs: [[0, 0], [pw, 0], [pw, ph], [0, ph]] }); }
      W.pop(); };
    for (let i = 1; i <= nx - 3; i++) { doorBay([xs[i], zs[2]], [xs[i + 1], zs[2]]); doorBay([xs[i + 1], zs[1]], [xs[i], zs[1]]); }
    doorBay([xs[nx - 2], zs[2]], [xs[nx - 2], zs[1]]); doorBay([xs[1], zs[1]], [xs[1], zs[2]]);
    // balustrade round the floor (gyeja-nangan): S-shaped brackets leaning out, a pierced panel, a round handrail
    const GY = [[-0.035, 0], [0.04, 0], [0.05, 0.2], [0.09, 0.37], [0.165, 0.5], [0.215, 0.6], [0.215, 0.66], [0.15, 0.66], [0.1, 0.52], [0.035, 0.39], [-0.02, 0.22]];
    const HOLE = [[-0.17, 0], [-0.12, 0.035], [-0.05, 0.022], [0, 0.045], [0.05, 0.022], [0.12, 0.035], [0.17, 0], [0.12, -0.035], [0.05, -0.022], [0, -0.045], [-0.05, -0.022], [-0.12, -0.035]];
    const rail = (p, q, gap) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.round(L / 0.82), st = L / n;
      W.fam('timber').push().move(p[0], yF, p[1]).rotY(-Math.atan2(q[1] - p[1], q[0] - p[0]));
      for (const [x0, x1] of gap ? [[0, gap[0]], [gap[1], L]] : [[0, L]]) { W.paint(C.seokganju).kind(K.PLAIN).beam([x0, 0.04, -0.03], [x1, 0.04, -0.03], 0.09, 0.08).beam([x0, 0.33, -0.005], [x1, 0.33, -0.005], 0.06, 0.055);
        W.paint(C.seokganju).kind(K.PLAIN, 0.035, 0, 0.4).tube([[x0 - (x0 ? 0 : 0.2), 0.7, 0.19], [x1 + (x1 < L ? 0 : 0.2), 0.7, 0.19]], 0.038, { seg: 8, caps: 'se' }); }
      for (let k = 0; k <= n; k++) { const x = k * st; if (gap && x > gap[0] + 0.01 && x < gap[1] - 0.01) continue; if (k === n) continue;
        if (k) W.paint(C.noerok).kind(K.PLAIN).push().move(x, 0, 0).rotY(-PI / 2).extrude(GY, 0.065, { rim: { w: 0.012, paint: C.bun }, sidePaint: C.seokganju }).pop();
        if (gap && x + st > gap[0] + 0.01 && x < gap[1] - 0.01) continue;
        W.paint(C.noerok).kind(K.PLAIN).push().move(x + st / 2, 0.19, -0.01).extrude([[-st / 2 + 0.03, -0.11], [st / 2 - 0.03, -0.11], [st / 2 - 0.03, 0.11], [-st / 2 + 0.03, 0.11]], 0.022, { holes: [HOLE.map((h) => [h[0] * Math.min(1, st / 0.82), h[1]])], sidePaint: C.seokganju }).pop(); }
      W.pop(); };
    rail([-FX, FZ], [FX, FZ]); rail([FX, FZ], [FX, -FZ]); rail([FX, -FZ], [-FX, -FZ], [FX - 1.75, FX + 1.75]); rail([-FX, -FZ], [-FX, FZ]);
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) W.fam('timber').paint(C.noerok).kind(K.PLAIN).push().move(sx * FX, yF, sz * FZ).rotY(Math.atan2(sx, sz) - PI / 2).scale(1.3, 1, 1).extrude(GY, 0.07, { rim: { w: 0.012, paint: C.bun }, sidePaint: C.seokganju }).pop();
    // a wooden stair at the back up to the floor
    { const n = 11, rise = (yF - yP) / n, run = 0.27, z0 = -FZ - n * run; W.fam('timber').paint(C.seokganju).kind(K.PLAIN);
      for (const sx of [-1, 1]) W.beam([sx * 0.8, yP + 0.02, z0 - 0.1], [sx * 0.8, yF - 0.08, -FZ + 0.02], 0.08, 0.26).beam([sx * 0.8, yP + 0.95, z0 - 0.1], [sx * 0.8, yF + 0.85, -FZ + 0.02], 0.06, 0.06);
      for (const sx of [-1, 1]) for (const f of [0, 0.5, 1]) W.box(0.06, 0.95, 0.06, { at: [sx * 0.8, yP + (yF - yP) * f, z0 - 0.1 + (n * run + 0.12) * f], base: true, axis: 'y' });
      W.paint(C.floor).kind(K.WOOD); for (let i = 0; i < n; i++) W.box(1.56, 0.045, run + 0.03, { at: [0, yP + (i + 1) * rise - 0.045, z0 + (i + 0.5) * run], base: true }); }
    // the name board under the front eave: black, gilt frame, tilted toward whoever arrives
    W.fam('timber').push().move(0, yC + 0.62, Z + 0.78).rotX(0.22).paint(C.meok).kind(K.SIGN, 0, 0, seed * 0.37 % 1).box(2.1, 0.82, 0.05, { skip: 'k' });
    W.fam('metal').paint(C.gilt).kind(2);
    for (let c = 0; c < 3; c++) for (let i = 0; i < 5; i++) { const h1 = DR.hash3(seed, c, i), h2 = DR.hash3(seed, c, i + 9), h3 = DR.hash3(seed, c, i + 19), cx = (c - 1) * 0.6; let p, q;   // three "characters" of brush strokes
      if (i % 2 === 0) { p = [cx - 0.21 + h1 * 0.14, h2 * 0.44 - 0.22]; q = [p[0] + 0.2 + 0.14 * h3, p[1] + 0.03 - 0.06 * h1]; } else { p = [cx - 0.15 + h1 * 0.3, 0.26 - h2 * 0.12]; q = [p[0] + 0.05 * h3 - 0.025, p[1] - 0.26 - 0.2 * h3]; }
      W.beam([p[0], p[1], 0.03], [q[0], q[1], 0.03], 0.012, 0.03 + 0.03 * h2, { up: [0, 0, 1] }); }
    for (const sy of [-1, 1]) W.box(2.3, 0.1, 0.09, { at: [0, sy * 0.46, 0.02] }); for (const sx of [-1, 1]) W.box(0.1, 0.82, 0.09, { at: [sx * 1.1, 0, 0.02], axis: 'y' }); W.pop();
    // chimes at the four corners, silk lanterns along the front eave
    R.anchors.hipTips.forEach((p, i) => chime(W, [p[0], p[1] - 0.02, p[2]], DR.hash2(seed, i + 11) * 0.9 + 0.05));
    const lanternPoints = []; for (const s of opts.lanterns || [-0.66, -0.4, -0.135, 0.135, 0.4, 0.66]) { const p = R.eavePoint(0, s, E.dF + 0.03, E.q(0.3)); lanternPoints.push([p[0], p[1] - 0.52, p[2]]); lantern(W, p, DR.hash2(seed, Math.round(s * 100) + 50) * 0.9 + 0.05); }
    const g = finish(W, [2 * a, R.anchors.apex[1], 2 * b], { eaveCorners: R.anchors.eaveCorners, chimes: R.anchors.hipTips, lanternPoints, ridgeEnds: R.anchors.ridgeEnds, apex: R.anchors.apex, floorHeight: yF, platformHeight: yP, eaveHeight: yE,
      floor: [FX, FZ], platform: [PX, PZ], doorCentre: [0, yF + 1.2, zs[2]], sign: [0, yC + 0.62, Z + 0.8], stairFoot: [0, 0, PZ + 0.96], columns: [X, Z] });
    const M = Hanok.mats(), warm = '#ffcf98';
    M.pool(g, { a: [xs[1] + 0.4, yF + 1.25, zs[2] + 0.25], b: [xs[nx - 2] - 0.4, yF + 1.25, zs[2] + 0.25], color: warm, k: 1.0, r: 1.6, yMin: -1.45 });
    M.pool(g, { a: [xs[1] + 0.4, yF + 1.25, zs[1] - 0.25], b: [xs[nx - 2] - 0.4, yF + 1.25, zs[1] - 0.25], color: warm, k: 1.0, r: 1.6, yMin: -1.45 });
    M.pool(g, { a: lanternPoints[0], b: lanternPoints[lanternPoints.length - 1], color: '#ffb080', k: 0.45, r: 1.3, yMin: -1.6 });
    M.pool(g, { a: [xs[nx - 2] + 0.25, yF + 1.25, zs[1]], b: [xs[nx - 2] + 0.25, yF + 1.25, zs[2]], color: warm, k: 0.8, r: 1.4, yMin: -1.45 });
    return g;
  };

  // ── 육모정: a hexagonal pavilion with a pointed roof and a jar finial ───────────────────────────────────────────
  Hanok.jeongja = (opts = {}) => {
    const seed = opts.seed ?? 1, rnd = DR.rng(seed * 5 + 2), Rc = opts.radius || 2.25, ap = Rc * Math.cos(PI / 6), yP = 0.4, yF = 0.85, yC = 3.05, OV = 1.15, yE = 3.48;
    const W = A.writer({ seed, sky: A.eaveAO({ r: ap + OV, y: yE - 0.05, slope: 0.35 }) }), cor = (k, r = Rc) => [Math.sin(PI / 6 + k * PI / 3) * r, Math.cos(PI / 6 + k * PI / 3) * r];
    W.fam('stone').paint(C.granite).kind(4, 0, 0, 0.2).lathe([[Rc + 0.85, 0], [Rc + 0.85, yP]], { seg: 6, flat: true, caps: 't' });
    W.kind(0, 0, 0, 0.6).box(1.5, 0.2, 0.5, { at: [0, 0, ap + 0.85 * Math.cos(PI / 6) + 0.25], base: true, skip: 'b' });
    W.fam('timber').paint(C.floor).kind(K.WOOD).poly([0, 1, 2, 3, 4, 5].map((k) => { const c = cor(k, Rc + 0.25); return [c[0], yF, c[1]]; }), { hint: [0, 1, 0], uvs: [0, 1, 2, 3, 4, 5].map((k) => cor(k, Rc + 0.25)) });
    for (let k = 0; k < 6; k++) { const c = cor(k), d = cor(k + 1), c2 = cor(k, Rc + 0.25), d2 = cor(k + 1, Rc + 0.25);
      W.fam('stone').paint(C.graniteD).kind(4, 0, 0, rnd()).box(0.5, 0.12, 0.5, { at: [c[0], yP, c[1]], base: true, skip: 'b' });
      W.fam('timber').paint(C.seokganju).kind(K.COLUMN, 0, 0, rnd()).at(c[0], yP + 0.12, c[1], (w) => w.lathe([[0.15, 0], [0.158, 0.7], [0.15, 1.6], [0.132, yC - yP - 0.12]], { seg: 12 }));
      W.paint(C.seokganju).kind(K.PLAIN).beam([c2[0], yF - 0.13, c2[1]], [d2[0], yF - 0.13, d2[1]], 0.1, 0.26);
      W.paint(C.noerok).kind(K.BEAM, 0, 0, rnd()).beam([c[0], yC - 0.13, c[1]], [d[0], yC - 0.13, d[1]], 0.16, 0.26, { skip: 'lr' });
      W.push().move(c[0], yC, c[1]).rotY(PI / 6 + k * PI / 3).paint(C.noerok).kind(K.BRACKET, 0.09, 0, 0.3).box(0.3, 0.14, 0.3, { base: true, top: [1.25], axis: 'y', skip: 'b' })
        .kind(K.PLAIN).push().move(0, 0.12, 0).rotY(-PI / 2).scale(0.85, 0.85, 1).extrude(BEAK_UP, 0.09, { rim: { w: 0.014, paint: C.bun }, sidePaint: '#9c4a2e' }).pop().pop();
      if (k !== 5) { W.paint(C.seokganju).kind(K.PLAIN).railing([[c[0] * 1.04, yF, c[1] * 1.04], [d[0] * 1.04, yF, d[1] * 1.04]], { h: 0.5, step: 0.55, post: [0.055, 0.055], rails: [[0.47, 0.07, 0.06], [0.1, 0.05, 0.05]], cap: 0.02 }); } }
    const R = A.roof(W, { type: 'poly', n: 6, radius: ap + OV, y: yE, rise: opts.rise ?? 2.1, curve: { k: 0.62, e: 2.1 }, lift: 0.36, liftPow: 2.4, flare: 0.03, seed, tile: { w: 0.3, r: 0.07, seg: 7, round: 5 },
      eave: { double: false, wall: OV, inner: 0.7, rafter: { r: 0.06, step: 0.27 }, hip: { w: 0.16, h: 0.2 } }, hipRidge: { w: 0.24, h: 0.22 }, kinds: ROOF_KINDS, paints: ROOF_PAINTS });
    const yR = R.P(R.faces[0], 0, R.eave.q(OV), 0, R.eave.rafterDrop)[1] - 0.06;
    for (let k = 0; k < 6; k++) { const c = cor(k), d = cor(k + 1); W.fam('timber').paint(C.noerok).kind(K.BEAM, PI * 0.1, 0, rnd()).tube([[c[0], yR - 0.1, c[1]], [d[0], yR - 0.1, d[1]]], 0.1, { seg: 8, up: [0, -1, 0] }); }
    const ax = R.anchors.apex; W.fam('tile').kind(6, 0.3, 0, 0.4).bed([0, 1, 0]).at(0, ax[1] - 0.12, 0, (w) => w.lathe([[0.34, -0.3], [0.33, 0], [0.2, 0.1], [0.25, 0.2], [0.31, 0.34], [0.24, 0.5], [0.11, 0.57], [0.14, 0.66], [0.17, 0.74], [0.1, 0.85], [0, 0.92]], { seg: 12 }));
    R.anchors.hipTips.forEach((p, i) => chime(W, [p[0], p[1] - 0.02, p[2]], DR.hash2(seed, i + 31) * 0.9 + 0.05));
    return finish(W, [2 * (ap + OV), ax[1] + 0.8, 2 * (ap + OV)], { eaveCorners: R.anchors.eaveCorners, chimes: R.anchors.hipTips, apex: [0, ax[1] + 0.8, 0], floorHeight: yF, eaveHeight: yE, entrance: [0, yF, ap] });
  };

  // ── 석탑: a three-storey granite pagoda — two-tier base, body stones with corner pillars, thin stepped roof stones ──
  Hanok.pagoda = (opts = {}) => {
    const seed = opts.seed ?? 1, rnd = DR.rng(seed * 3 + 7), W = A.writer({ seed }); W.fam('stone').paint(C.granite);
    const slab = (w, h, y, k = 4) => W.kind(k, 0, 0, rnd()).paint(C.granite, 0.92 + 0.16 * rnd()).box(w, h, w, { at: [0, y, 0], base: true, skip: 'b' });
    const body = (w, h, y) => { slab(w, h, y); const pw = w * 0.13, o = w / 2 - pw / 2 + 0.014; for (const sx of [-1, 1]) for (const sz of [-1, 1]) W.box(pw, h, pw, { at: [sx * o, y, sz * o], base: true, axis: 'y', skip: 'tb' }); };
    let y = 0; slab(4.1, 0.16, y, 0); y += 0.16; body(3.4, 0.42, y); y += 0.42; slab(3.7, 0.12, y); y += 0.12; slab(2.75, 0.05, y); y += 0.05; body(2.5, 0.95, y); y += 0.95; slab(3.05, 0.15, y); y += 0.15; slab(1.95, 0.06, y); y += 0.06;
    const tiers = [[1.5, 1.2, 1.45], [1.3, 0.5, 1.28], [1.12, 0.45, 1.1]], roofs = [];
    tiers.forEach(([w, h, ap], i) => { body(w, h, y); y += h; for (let s = 0; s < 5; s++) slab(w + 0.1 + s * (2 * ap * 0.6 - w - 0.1) / 4, 0.05, y + s * 0.05); y += 0.25;
      const wn = tiers[i + 1] ? tiers[i + 1][0] : 0.56; W.kind(4, 0, 0, rnd()).paint(C.granite, 0.95);
      const R = A.slabRoof(W, { type: 'poly', n: 4, radius: ap, y: y + 0.12, rise: 0.36, curve: { k: 0.55, e: 2 }, lift: 0.11, liftPow: 4, liftFall: 1.5, flare: 0.012, thick: 0.12, under: 0.4, tTop: 1 - (wn / 2 + 0.09) / ap, tIn: 0.4 });
      roofs.push([0, y, 0, ap]); y = R.yTop; });
    slab(0.54, 0.3, y); y += 0.3; W.kind(4, 0, 0, 0.5).at(0, y, 0, (w) => w.lathe([[0.25, 0], [0.24, 0.08], [0.17, 0.17], [0.07, 0.21], [0.2, 0.25], [0.26, 0.33], [0.06, 0.36], [0.04, 0.4], [0.04, 1.75], [0.1, 1.8], [0.13, 1.9], [0.07, 2.0], [0, 2.08]], { seg: 12 }));
    for (const [yy, r] of [[0.62, 0.2], [0.9, 0.17], [1.18, 0.14], [1.44, 0.11]]) W.at(0, y + yy, 0, (w) => w.lathe([[0.04, 0], [r, 0.01], [r, 0.07], [0.04, 0.08]], { seg: 12 }));
    return finish(W, [4.1, y + 2.08, 4.1], { top: [0, y + 2.08, 0], roofs, base: [4.1, 1.91] });
  };

  // ── 석등: a stone lantern — lotus base, octagonal shaft, a fire chamber with four openings, roof stone, jewel ──
  Hanok.seokdeung = (opts = {}) => {
    const seed = opts.seed ?? 1, W = A.writer({ seed, sky: A.eaveAO({ r: 0.6, y: 1.98 }) }), petals = (n, k) => (an) => 1 + k * Math.pow(Math.abs(Math.cos(an * n / 2)), 0.6);
    W.fam('stone').paint(C.granite).kind(4, 0, 0, 0.3).box(1.15, 0.14, 1.15, { at: [0, 0, 0], base: true, skip: 'b' });
    W.at(0, 0.14, 0, (w) => w.lathe([[0.5, 0], [0.52, 0.07], [0.44, 0.19], [0.27, 0.26], [0.2, 0.28]], { seg: 32, mod: petals(8, 0.14), smooth: true }));
    W.kind(4, 0, 0, 0.7).lathe([[0.2, 0.42], [0.155, 0.47], [0.15, 1.2], [0.2, 1.25]], { seg: 8, flat: true, rot: PI / 8 });
    W.at(0, 1.25, 0, (w) => w.lathe([[0.2, 0], [0.34, 0.08], [0.47, 0.2], [0.47, 0.27]], { seg: 32, mod: petals(8, 0.1), smooth: true, caps: 't' }));
    const rc = 0.34, apc = rc * Math.cos(PI / 8), fw = 2 * rc * Math.sin(PI / 8) + 0.012;
    for (let k = 0; k < 8; k++) W.kind(4, 0, 0, 0.1 * k).push().rotY(PI / 2 - k * PI / 4).move(0, 1.75, apc - 0.03).extrude([[-fw / 2, -0.23], [fw / 2, -0.23], [fw / 2, 0.23], [-fw / 2, 0.23]], 0.06, { holes: k % 2 ? [] : [[[-0.075, -0.13], [0.075, -0.13], [0.075, 0.13], [-0.075, 0.13]]] }).pop();
    W.fam('paper').paint(C.meok).kind(4, 0.2, 0.4, seed * 0.13 % 1).shade(1).lathe([[0.2, 1.54], [0.2, 1.96]], { seg: 8, flat: true });
    W.fam('stone').paint(C.granite).kind(4, 0, 0, 0.9);
    const R = A.slabRoof(W, { type: 'poly', n: 8, radius: 0.62, y: 2.06, rise: 0.34, curve: { k: 0.5, e: 2 }, lift: 0.07, liftPow: 3, flare: 0.02, thick: 0.08, under: 0.4, tTop: 0.8, tIn: 0.5, step: 0.13 });
    W.at(0, R.yTop, 0, (w) => w.lathe([[0.115, 0], [0.13, 0.05], [0.07, 0.09], [0.1, 0.14], [0.125, 0.2], [0.09, 0.27], [0.03, 0.32], [0, 0.34]], { seg: 12 }));
    const g = finish(W, [1.24, R.yTop + 0.34, 1.24], { fire: [0, 1.75, 0], top: [0, R.yTop + 0.34, 0] });
    Hanok.mats().pool(g, { a: [0, 1.75, 0], color: '#ff8a40', k: 0.9, r: 0.55 }); return g;
  };

  // ── 솟대: village bird poles — tall, thin, a little crooked, a carved duck on top ───────────────────────────────
  Hanok.sotdae = (opts = {}) => {
    const seed = opts.seed ?? 1, W = A.writer({ seed }), vs = opts.variant !== undefined ? [opts.variant] : [0, 1, 2], tops = []; W.fam('timber').paint(C.bare);
    const duck = (p, yaw, s, up) => { W.push().move(p[0], p[1], p[2]).rotY(yaw).scale(s).kind(K.BARE, 0, 0, 0.3 + up)
      .tube([[-0.3, 0.08, 0], [-0.2, 0.035, 0], [-0.05, 0, 0], [0.1, 0.02, 0], [0.2, 0.08, 0], [0.25, 0.18 + up * 0.04, 0], [0.27 + up * 0.03, 0.28 + up * 0.08, 0], [0.33, 0.34 + up * 0.12, 0], [0.42, 0.345 + up * 0.17, 0], [0.53, 0.33 + up * 0.22, 0]], [0.012, 0.05, 0.088, 0.092, 0.072, 0.042, 0.037, 0.052, 0.03, 0.007], { seg: 8 }).pop(); };
    const spots = [[0, 0], [1.25, -0.55], [-0.95, 0.5]], hs = [6.6, 7.8, 5.9];
    vs.forEach((v, n) => { const o = vs.length > 1 ? spots[n] : [0, 0], h = hs[v] * (opts.scale || 1), path = [], sd = seed * 10 + v * 3;
      for (let i = 0; i <= 10; i++) { const f = i / 10; path.push([o[0] + (DR.noise1(f * 2.3, sd) * 0.16 + (v === 2 ? 0.25 * f * f : 0)) * (f > 0 ? 1 : 0), -0.3 + (h + 0.3) * f, o[1] + DR.noise1(f * 2.1 + 9, sd + 1) * 0.14 * (f > 0 ? 1 : 0)]); }
      W.paint(C.bare, 0.8 + 0.3 * DR.hash1(sd)).kind(K.BARE, 0, 0, DR.hash1(sd + 4)).tube(path, (u) => 0.085 - 0.045 * u, { seg: 8, caps: 'e' });
      const top = path[10], yaw = DR.hash1(sd + 2) * TAU;
      if (v === 1) { const c = Math.cos(yaw), s = Math.sin(yaw); W.tube([[top[0] - c * 0.55, top[1] - 0.05, top[2] + s * 0.55], [top[0], top[1], top[2]], [top[0] + c * 0.55, top[1] - 0.03, top[2] - s * 0.55]], 0.03, { seg: 6, caps: 'se' });
        duck([top[0] - c * 0.5, top[1] - 0.02, top[2] + s * 0.5], yaw + 0.5, 0.8, 0); duck([top[0] + c * 0.5, top[1], top[2] - s * 0.5], yaw - 0.4, 0.9, 0.5); }
      else duck([top[0], top[1] + 0.05, top[2]], yaw, 1.1, v === 2 ? 1 : 0.2);
      tops.push([top[0], top[1] + 0.4, top[2]]); });
    return finish(W, [3, 8.2, 2], { tops });
  };

  // ── 돌담: a low wall of field stones set in clay, capped with a small tile roof, along a polyline over uneven ground ──
  Hanok.wall = (pts, opts = {}) => {
    const seed = opts.seed ?? 1, rnd = DR.rng(seed * 9 + 4), W = A.writer({ seed }), h = opts.height || 1.45, t = opts.thick || 0.5, rows = Math.max(2, Math.round(h / (opts.stone || 0.3))), rh = (h - 0.06) / rows;
    for (let i = 0; i < pts.length - 1; i++) { const p = pts[i], q = pts[i + 1], L = Math.hypot(q[0] - p[0], q[2] - p[2]), sl = (q[1] - p[1]) / L, gy = (x) => p[1] + sl * x;
      W.push().move(p[0], 0, p[2]).rotY(-Math.atan2(q[2] - p[2], q[0] - p[0]));
      for (const sz of [1, -1]) { const z = sz * t / 2;
        W.fam('stone').paint(C.clay).kind(2, 0, 0, rnd()).poly([[-0.02, gy(0) - 0.4, z], [L + 0.02, gy(L) - 0.4, z], [L + 0.02, gy(L) + h, z], [-0.02, gy(0) + h, z]], { hint: [0, 0, sz], uvs: [[0, 0], [L, 0], [L, h], [0, h]] });
        for (let r = 0; r < rows; r++) { let x = -rnd() * 0.15; while (x < L - 0.05) { const w = Math.min(0.2 + rnd() * 0.3 + (r === 0 ? 0.12 : 0), L - x), x0 = Math.max(0, x) + 0.012, x1 = x + w - 0.012, y0 = r * rh + 0.012 + rnd() * 0.02, y1 = (r + 1) * rh - 0.012 - rnd() * 0.02, bul = 0.04 + rnd() * 0.05, g = 0.72 + rnd() * 0.4, cx = (x0 + x1) / 2;
          if (x1 - x0 > 0.06) { W.paint([0.33 * g, 0.31 * g, 0.27 * g * (0.85 + 0.3 * rnd())]).kind(1, (y1 - y0) / 2, x1 - x0, rnd());
            const cs = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map((c, n) => W.v(c[0], gy(c[0]) + c[1], z, (n === 0 || n === 3 ? -0.8 : 0.8), n < 2 ? -0.8 : 0.8, sz, c[0] - x0, c[1] - (y0 + y1) / 2, 0.6)), ct = W.v(cx, gy(cx) + (y0 + y1) / 2, z + sz * bul, 0, 0, sz, (x1 - x0) / 2, 0);
            for (let n = 0; n < 4; n++) sz > 0 ? W.tri(ct, cs[n], cs[(n + 1) % 4]) : W.tri(ct, cs[(n + 1) % 4], cs[n]); }
          x += w; } } }
      for (const [xe, sx] of [[0, -1], [L, 1]]) if ((sx < 0 && i === 0) || (sx > 0 && i === pts.length - 2)) W.fam('stone').paint(C.clay).kind(2, 0, 0, rnd()).poly([[xe, gy(xe) - 0.4, -t / 2], [xe, gy(xe) - 0.4, t / 2], [xe, gy(xe) + h, t / 2], [xe, gy(xe) + h, -t / 2]], { hint: [sx, 0, 0] });
      // the cap: two short tile slopes and a ridge row
      W.fam('tile'); const ez = t / 2 + 0.13, ye = h + 0.03, yr = h + 0.2, nl = Math.hypot(yr - ye, ez);
      for (const sz of [1, -1]) { const bn = [0, ez / nl, sz * (yr - ye) / nl]; W.bed(bn).kind(0, 0.12, 0, rnd()).poly([[0, gy(0) + ye, sz * ez], [L, gy(L) + ye, sz * ez], [L, gy(L) + yr, 0], [0, gy(0) + yr, 0]], { hint: [0, 1, sz * 0.3], uvs: [[0, 0], [0, 0.24], [nl, 0.24], [nl, 0]] });
        W.kind(3, 0.03, 0, 0.5).poly([[0, gy(0) + ye, sz * ez], [L, gy(L) + ye, sz * ez], [L, gy(L) + ye - 0.05, sz * (ez - 0.02)], [0, gy(0) + ye - 0.05, sz * (ez - 0.02)]], { hint: [0, 0, sz] });
        W.fam('stone').paint(C.clay, 0.6).kind(2).poly([[0, gy(0) + ye - 0.05, sz * (ez - 0.02)], [L, gy(L) + ye - 0.05, sz * (ez - 0.02)], [L, gy(L) + h, sz * t / 2], [0, gy(0) + h, sz * t / 2]], { hint: [0, -1, sz] }); W.fam('tile');
        const n = Math.max(1, Math.round(L / 0.25)); for (let k = 0; k < n; k++) { const x = (k + 0.5) * L / n; W.bed(bn).kind(1, 0.05, 0, rnd()).tube([[x, gy(x) + ye + 0.01, sz * (ez + 0.02)], [x, gy(x) + yr + 0.01, 0]], 0.05, { seg: 6, caps: 's', capKind: 2 }); } }
      W.bed([0, 1, 0]).kind(7, 0.07, 0, rnd()).tube([[-0.05, gy(0) + yr + 0.03, 0], [L + 0.05, gy(L) + yr + 0.03, 0]], 0.075, { seg: 7, caps: 'se', capKind: 6 });
      W.pop(); }
    return finish(W, [0, h + 0.3, t + 0.26], { points: pts, height: h });
  };

  // ── 홍예교: a small arched granite bridge ───────────────────────────────────────────────────────────────────────
  Hanok.bridge = (opts = {}) => {
    const seed = opts.seed ?? 1, rnd = DR.rng(seed * 11 + 1), W = A.writer({ seed }), L = opts.length || 9, w = opts.width || 3.2, ra = opts.radius || 2.15, top = (x) => ra + 0.95 - 1.9 * Math.pow(Math.abs(x) / (L / 2), 1.7);
    const out = [[-L / 2, -0.4], [-ra, -0.4]]; for (let i = 0; i <= 20; i++) { const a = PI - i * PI / 20; out.push([ra * Math.cos(a), 0.1 + ra * Math.sin(a)]); } out.push([ra, -0.4], [L / 2, -0.4]); for (let i = 0; i <= 16; i++) { const x = L / 2 - i * L / 16; out.push([x, top(x)]); }
    W.fam('stone').paint(C.granite).kind(3, 0.18, 0.95, 0.3).extrude(out, w, { sideKind: 4, crease: 50 });
    for (let i = 0; i < 15; i++) { const a0 = PI - i * PI / 15 - 0.004, a1 = PI - (i + 1) * PI / 15 + 0.004, r0 = ra - 0.03, r1 = ra + 0.44; W.paint(C.graniteD, 0.78 + 0.2 * rnd()).kind(4, 0, 0, rnd()).extrude([[r0 * Math.cos(a0), 0.1 + r0 * Math.sin(a0)], [r0 * Math.cos(a1), 0.1 + r0 * Math.sin(a1)], [r1 * Math.cos(a1), 0.1 + r1 * Math.sin(a1)], [r1 * Math.cos(a0), 0.1 + r1 * Math.sin(a0)]], w + 0.12); }
    for (const sz of [-1, 1]) { const path = []; for (let i = 0; i <= 16; i++) { const x = -L / 2 + i * L / 16; path.push([x, top(x) + 0.14, sz * (w / 2 - 0.14)]); } W.paint(C.granite).kind(4, 0, 0, rnd()).sweep([[-0.13, -0.15], [0.13, -0.15], [0.13, 0.15], [-0.13, 0.15]], path, { caps: 'se' }); }
    return finish(W, [L, top(0) + 0.3, w], { deck: [0, top(0), 0], ends: [[-L / 2, top(L / 2), 0], [L / 2, top(L / 2), 0]], arch: [0, 0, 0, ra] });
  };
}

// knit-diorama · knit.js — the engine: knitted materials, fuzz, the knitted world that knits itself, the yarn ball.
// Everything on screen is a function of t: window.seek(t) renders frame t, nothing carries over between frames.
// Contract (same as the other skills): window.seek(t), DURATION, FPS, SIZE, __ready, runChecks(t);
// ?render=1 fixed-size canvas, no UI · ?t=6.5 one frozen frame · ?scale=.5 preview size · ?lite=1 no sheen/shadows
// ?off=fuzz,shadow,seams,clip,needles,thread,ball,fog,blanket,pops switches a part off (debugging).
import * as THREE from 'three';
export { THREE };

const Q = new URLSearchParams(location.search);
export const RENDER = Q.has('render');
export const OFF = new Set((Q.get('off') || '').split(',').filter(Boolean));
const LITE = Q.has('lite');

// ───────────────────────────── small helpers ─────────────────────────────
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const col = c => new THREE.Color(c);
export const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
export const ease = {
  inOut: k => (k = clamp(k), k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  out: k => 1 - Math.pow(1 - clamp(k), 3),
  in: k => Math.pow(clamp(k), 3),
  sine: k => .5 - .5 * Math.cos(Math.PI * clamp(k)),
};
// seeded generator (mulberry32) and an integer hash → [0,1)
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function hash(a, b = 0, c = 0) {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1440670441) | 0;
  h = Math.imul(h ^ h >>> 13, 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}
// step response of a damped spring: 0 at s ≤ 0, overshoots, settles at 1. freq in rad/s, zeta < 1 = bouncy.
export function spring(s, freq = 14, zeta = .45) {
  if (s <= 0) return 0;
  const wd = freq * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * freq * s) * (Math.cos(wd * s) + zeta * freq / wd * Math.sin(wd * s));
}
// smooth 1-D value noise (deterministic wobble for bobbing boats, drifting clouds …)
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed) * 2 - 1, hash(i + 1, seed) * 2 - 1, u);
}
// rounded-square norm used for the world's outline and the knit front (n = 8 ≈ a pillow-cornered square)
export const SQ = 8;
export const sqNorm = (x, z) => Math.pow(Math.pow(Math.abs(x), SQ) + Math.pow(Math.abs(z), SQ) + 1e-12, 1 / SQ);

// ───────────────────────────── palette ─────────────────────────────
// Soft, slightly dusty yarn colours. Use 1 strong accent (coral or mustard) per scene; the rest stays sage/cream/sky.
export const PAL = {
  white: '#fbf5ea', cream: '#f2e3c8', oat: '#e2cba6', sand: '#ecc987', butter: '#f1d27c', mustard: '#e3a93f',
  coral: '#e87a66', rose: '#efa79c', brick: '#c25440', berry: '#b5536b', lilac: '#b9a3d8', lavender: '#9d8cc8',
  sage: '#a9c58e', moss: '#78a35f', pine: '#4e7c56', teal: '#5aa6a0', sky: '#a2cde8', sea: '#5f9fd0', denim: '#3e6c9c',
  bark: '#8b5a3c', stone: '#b7b0a5', slate: '#7d8590', charcoal: '#47423f',
};

// ───────────────────────────── stitch textures ─────────────────────────────
// Each stitch is drawn once into a 512² height field from yarn strokes (capsules with twisted plies), then turned into
// an albedo (shaded by height + ambient occlusion), a normal map and a roughness map. Textures tile seamlessly.
const TS = 512, TS2 = TS * TS, WR = i => i & (TS - 1), TAU = Math.PI * 2;
const newField = () => ({ h: new Float32Array(TS2), base: new Float32Array(TS2), tint: new Float32Array(TS2) });

// one strand of yarn from a to b, radius r (px). ply > 0 adds twisted plies (diagonal grooves) every lam px.
function stroke(F, ax, ay, bx, by, r, o = {}) {
  const { amp = 1, ply = 3, lam = r * 2.4, phase = 0, plyDepth = .3, taper = true, layer = 'h', tint = 0, pow = .5 } = o;
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, L = Math.sqrt(L2), buf = F[layer];
  const x0 = Math.floor(Math.min(ax, bx) - r) - 1, x1 = Math.ceil(Math.max(ax, bx) + r) + 1;
  const y0 = Math.floor(Math.min(ay, by) - r) - 1, y1 = Math.ceil(Math.max(ay, by) + r) + 1;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + .5 - ax, py = y + .5 - ay;
    const u = L2 > 0 ? clamp((px * dx + py * dy) / L2) : 0;
    const qx = px - u * dx, qy = py - u * dy, d = Math.sqrt(qx * qx + qy * qy) / r;
    if (d >= 1) continue;
    let v = Math.pow(1 - d * d, pow);
    if (taper) v *= .45 + .55 * Math.pow(Math.sin(Math.PI * u), .5);
    if (ply > 0) {
      const across = (dx * py - dy * px) >= 0 ? d : -d;           // −1 … 1 across the strand
      const w = (u * L + across * r * .9) / lam * ply + phase;     // diagonal ply coordinate
      const f = w - Math.floor(w) - .5, ridge = Math.sqrt(Math.max(0, 1 - 4 * f * f));
      v *= 1 - plyDepth + plyDepth * ridge;
    }
    v *= amp;
    const i = WR(y) * TS + WR(x);
    if (v > buf[i]) { buf[i] = v; if (layer === 'h') F.tint[i] = tint; }
  }
}
const cells = (F, cx, cy, fn) => { const w = TS / cx, h = TS / cy; for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) fn(i, j, i * w, j * h, w, h); };
// a knit stitch: two legs leaning into a V
function knitV(F, x, y, w, h, amp = 1, seed = 0) {
  for (const s of [-1, 1]) {
    const j = k => hash(x | 0, y | 0, seed * 16 + k + (s > 0 ? 8 : 0)) - .5;
    stroke(F, x + (.5 + .06 * s + .02 * j(0)) * w, y + 1.06 * h, x + (.5 + .29 * s + .02 * j(1)) * w, y - .06 * h, .22 * w,
      { amp: amp * (1 + .1 * j(2)), ply: 3, lam: .55 * h, phase: j(3), tint: j(4) * .08 });
  }
}
// a purl bump: a short horizontal loop
function purl(F, x, y, w, h, amp = 1, seed = 0) {
  const j = k => hash(x | 0, y | 0, 90 + seed * 16 + k) - .5;
  stroke(F, x + .1 * w, y + (.45 + .04 * j(0)) * h, x + .9 * w, y + (.5 + .04 * j(1)) * h, .3 * h,
    { amp: amp * (1 + .1 * j(2)), ply: 3, lam: .5 * w, phase: j(3), tint: j(4) * .08, taper: false });
}
const STITCH = {
  // smooth "jersey" fabric: columns of V's. 4 × 5 stitches per tile.
  stockinette: { cells: [4, 5], slope: 14, ao: 9, build: F => cells(F, 4, 5, (i, j, x, y, w, h) => knitV(F, x, y, w, h)) },
  // horizontal ridges (every row purled) — chunky and soft. 4 × 6.
  garter: { cells: [4, 6], slope: 14, ao: 9, build: F => cells(F, 4, 6, (i, j, x, y, w, h) => j % 2 ? purl(F, x, y, w, h, .9) : knitV(F, x, y, w, h, .55)) },
  // 2×2 rib: raised knit columns, sunken purl columns. 4 × 5.
  rib: { cells: [4, 5], slope: 15, ao: 12, build: F => cells(F, 4, 5, (i, j, x, y, w, h) => {
    if (i < 2) { stroke(F, x + .5 * w, y - .5 * h, x + .5 * w, y + 1.5 * h, .75 * w, { amp: .45, ply: 0, taper: false, layer: 'base', pow: .35 }); knitV(F, x, y, w, h, .75); }
    else purl(F, x, y, w, h, .4);
  }) },
  // seed / moss: knit and purl alternate in a checkerboard — pebbly. 8 × 8.
  seed: { cells: [8, 8], slope: 16, ao: 6, build: F => cells(F, 8, 8, (i, j, x, y, w, h) => (i + j) % 2 ? purl(F, x, y, w, h, 1) : knitV(F, x, y, w, h, .75)) },
  // rope cables on a purl ground: two strands cross, the left-to-right one always on top. 8 × 8.
  cable: { cells: [8, 8], slope: 14, ao: 11, build: F => {
    const w = TS / 8, h = TS / 8;
    cells(F, 8, 8, (i, j, x, y) => { if (i % 4 === 0 || i % 4 === 3) purl(F, x, y, w, h, .45); });
    for (const c of [2, 6]) for (let k = 0; k < 4; k++) {
      const y = k * 2 * h, x = c * w, ph = hash(c, k);
      stroke(F, x + .5 * w, y - .2 * h, x - .5 * w, y + 2.2 * h, .5 * w, { amp: .75, ply: 3, lam: 1.3 * h, phase: ph });
      stroke(F, x - .5 * w, y - .2 * h, x + .5 * w, y + 2.2 * h, .55 * w, { amp: 1.1, ply: 3, lam: 1.3 * h, phase: ph + .3 });
    }
  } },
  // bouclé: a tangle of little loops — clouds, sheep, bushes, pom-poms. Pair it with fuzz.
  boucle: { cells: [8, 8], slope: 20, ao: 8, build: F => {
    F.base.fill(.1); const R = rng(1337);
    for (const g of [{ n: 480, r: [9, 18], w: [4, 6.5] }, { n: 1300, r: [4, 9], w: [2.2, 3.6] }]) for (let k = 0; k < g.n; k++) {
      const cx = R() * TS, cy = R() * TS, rr = lerp(g.r[0], g.r[1], R()), ww = lerp(g.w[0], g.w[1], R());
      const a0 = R() * TAU, span = (1.1 + .9 * R()) * Math.PI, amp = .45 + .55 * R(), tint = (R() - .5) * .08;
      const steps = Math.ceil(span * rr / 3);
      for (let s = 0; s < steps; s++) {
        const a = a0 + span * s / steps, b = a0 + span * (s + 1) / steps, e = Math.sin(Math.PI * (s + .5) / steps);
        stroke(F, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, cx + Math.cos(b) * rr, cy + Math.sin(b) * rr, ww,
          { amp: amp * (.35 + .65 * e), ply: 0, taper: false, tint });
      }
    }
  } },
  // a single twisted strand, for anything round and thin: the thread, trunks, cords, the ball's wraps. Map u along it.
  strand: { cells: [1, 1], slope: 30, ao: 10, build: F => {
    F.base.fill(.08);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      let best = 0, tint = 0;
      for (let p = 0; p < 3; p++) {
        let d = y / TS - p / 3 - 2 * x / TS; d -= Math.floor(d + .5);
        const r = d / .17; if (Math.abs(r) >= 1) continue;
        const v = Math.sqrt(1 - r * r) * (.96 + .04 * Math.sin(TAU * 3.5 * r));
        if (v > best) { best = v; tint = (hash(p, 0, 5) - .5) * .08; }
      }
      F.h[y * TS + x] = best; F.tint[y * TS + x] = tint;
    }
  } },
  // felt: smooth, slightly lumpy — rocks, roofs seen from far, the needles' tips. No stitches.
  felt: { cells: [1, 1], slope: 6, ao: 14, build: F => {
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      let v = 0, a = .5, f = 4;
      for (let o = 0; o < 4; o++, a *= .5, f *= 2) {
        const fx = x / TS * f, fy = y / TS * f, ix = Math.floor(fx), iy = Math.floor(fy), ux = fx - ix, uy = fy - iy;
        const g = (i, j) => hash(((i % f) + f) % f, ((j % f) + f) % f, o);
        const sx = ux * ux * (3 - 2 * ux), sy = uy * uy * (3 - 2 * uy);
        v += a * lerp(lerp(g(ix, iy), g(ix + 1, iy), sx), lerp(g(ix, iy + 1), g(ix + 1, iy + 1), sx), sy);
      }
      F.h[y * TS + x] = .55 + .45 * v;
    }
  } },
};
export const STITCHES = Object.keys(STITCH);

// separable box blur with wrap-around, `passes` times
function blur(src, r, passes = 1) {
  let a = src;
  for (let p = 0; p < passes; p++) {
    const tmp = new Float32Array(TS2), out = new Float32Array(TS2), n = 2 * r + 1;
    for (let y = 0; y < TS; y++) { let s = 0; for (let k = -r; k <= r; k++) s += a[y * TS + WR(k)]; for (let x = 0; x < TS; x++) { tmp[y * TS + x] = s / n; s += a[y * TS + WR(x + r + 1)] - a[y * TS + WR(x - r)]; } }
    for (let x = 0; x < TS; x++) { let s = 0; for (let k = -r; k <= r; k++) s += tmp[WR(k) * TS + x]; for (let y = 0; y < TS; y++) { out[y * TS + x] = s / n; s += tmp[WR(y + r + 1) * TS + x] - tmp[WR(y - r) * TS + x]; } }
    a = out;
  }
  return a;
}
const toSRGB = v => (v = clamp(v), v <= .0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - .055);
function dataTex(bytes, srgb) {
  const t = new THREE.DataTexture(bytes, TS, TS, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 8; t.needsUpdate = true; return t;
}
const stitchCache = new Map();
function stitchMaps(name) {
  if (stitchCache.has(name)) return stitchCache.get(name);
  const S = STITCH[name]; if (!S) throw new Error(`knit: unknown stitch "${name}" (have ${STITCHES.join(', ')})`);
  const F = newField(); S.build(F);
  const H = new Float32Array(TS2); let mx = 1e-6;
  for (let i = 0; i < TS2; i++) { H[i] = F.h[i] + F.base[i]; if (H[i] > mx) mx = H[i]; }
  for (let i = 0; i < TS2; i++) H[i] /= mx;
  const h = blur(H, 1), aoH = blur(h, S.ao, 2), tint = blur(F.tint, 2);
  const alb = new Uint8Array(TS2 * 4), nor = new Uint8Array(TS2 * 4), rou = new Uint8Array(TS2 * 4);
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
    const i = y * TS + x, k = i * 4;
    let nx = -(h[y * TS + WR(x + 1)] - h[y * TS + WR(x - 1)]) * .5 * S.slope, ny = -(h[WR(y + 1) * TS + x] - h[WR(y - 1) * TS + x]) * .5 * S.slope;
    const m = 1 / Math.sqrt(nx * nx + ny * ny + 1); nx *= m; ny *= m;
    nor[k] = (nx * .5 + .5) * 255; nor[k + 1] = (ny * .5 + .5) * 255; nor[k + 2] = (m * .5 + .5) * 255; nor[k + 3] = 255;
    const ao = clamp((aoH[i] - h[i]) * 3), lift = .38 + .62 * smooth(0, .45, h[i]);
    const a = 255 * toSRGB(Math.max(.3, lift * (1 - .4 * ao)) * (1 + tint[i]));
    alb[k] = alb[k + 1] = alb[k + 2] = a; alb[k + 3] = 255;
    rou[k] = rou[k + 1] = rou[k + 2] = 255 * (1 - .12 * h[i]); rou[k + 3] = 255;
  }
  const out = { map: dataTex(alb, true), normalMap: dataTex(nor, false), roughnessMap: dataTex(rou, false), cells: S.cells };
  stitchCache.set(name, out); return out;
}

// ───────────────────────────── colourwork patterns ─────────────────────────────
// Two-colour patterns knitted into the fabric, one tone per stitch. '#' = colour 2. Rows are drawn top to bottom.
const MOTIF = {
  diamond: ['....#...', '...###..', '..##.##.', '.##...##', '..##.##.', '...###..', '....#...', '........'],
  zigzag: ['#.......', '.#.....#', '..#...#.', '...#.#..', '....#...', '........'],
  snow: ['....#....', '.#..#..#.', '..#.#.#..', '...###...', '#########', '...###...', '..#.#.#..', '.#..#..#.', '....#....', '.........', '.........'],
  dots: ['#.....', '......', '......', '...#..', '......', '......'],
  heart: ['.##.##..', '#######.', '#######.', '.#####..', '..###...', '...#....', '........', '........'],
};
function patternGrid(p) {
  if (typeof p === 'string' && MOTIF[p]) return MOTIF[p].map(r => [...r].map(c => c === '#' ? 1 : 0));
  if (p === 'stripe') p = { stripe: [2, 3] };
  if (p === 'check') p = { check: 4 };
  if (p && p.stripe) { const [on, off] = p.stripe; return Array.from({ length: on + off }, (_, j) => [j < on ? 1 : 0]); }
  if (p && p.check) { const c = p.check; return Array.from({ length: 2 * c }, (_, j) => Array.from({ length: 2 * c }, (_, i) => ((i / c | 0) + (j / c | 0)) & 1)); }
  if (p && p.rows) return p.rows.map(r => [...r].map(c => c === '#' ? 1 : 0));
  throw new Error(`knit: unknown pattern ${JSON.stringify(p)} (have ${Object.keys(MOTIF).join(', ')}, stripe, check, {stripe:[on,off]}, {check:n}, {rows:[…]})`);
}
function patternTex(grid) {
  const h = grid.length, w = grid[0].length, d = new Uint8Array(w * h * 4);
  // row 0 of the motif = top of the fabric: v grows upward in three's uv, so store it flipped
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = ((h - 1 - j) * w + i) * 4; d[k] = d[k + 1] = d[k + 2] = grid[j][i % grid[j].length] * 255; d[k + 3] = 255; }
  const t = new THREE.DataTexture(d, w, h, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = t.minFilter = THREE.NearestFilter; t.needsUpdate = true; return { tex: t, size: new THREE.Vector2(w, h) };
}

// chain shader patches: every patch is (shader) => void; they run in order in onBeforeCompile
export function patch(mat, key, fn) {
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey.bind(mat);
  mat.onBeforeCompile = (s, r) => { prev.call(mat, s, r); fn(s); };
  mat.customProgramCacheKey = () => prevKey() + '|' + key;
  mat.needsUpdate = true; return mat;
}

// yarn({ color, stitch, repeat, pattern, color2, sheen, roughness, flow }) → a knitted MeshPhysicalMaterial.
// repeat = tiles per uv unit (the world floor uses metres as uv, so repeat ≈ how many tiles per metre).
// pattern: 'diamond' | 'zigzag' | 'snow' | 'dots' | 'heart' | 'stripe' | 'check' | {stripe:[on,off]} | {check:n} | {rows:[…]}
export function yarn(o = {}) {
  if (typeof o === 'string') o = { color: o };
  const { color = PAL.cream, stitch = 'stockinette', repeat = [1, 1], pattern = null, color2 = PAL.white, sheen = 1, roughness = .92, emissive = null } = o;
  const S = stitchMaps(stitch), rep = Array.isArray(repeat) ? repeat : [repeat, repeat];
  const tile = t => { const c = t.clone(); c.repeat.set(rep[0], rep[1]); return c; };
  const base = col(color);
  const hsl = {}; base.getHSL(hsl);
  const M = LITE
    ? new THREE.MeshStandardMaterial({ color: base, map: tile(S.map), normalMap: tile(S.normalMap), roughnessMap: tile(S.roughnessMap), roughness, metalness: 0 })
    : new THREE.MeshPhysicalMaterial({ color: base, map: tile(S.map), normalMap: tile(S.normalMap), roughnessMap: tile(S.roughnessMap), roughness, metalness: 0,
        sheen, sheenRoughness: .5, sheenColor: new THREE.Color().setHSL(hsl.h, hsl.s * .7, hsl.l + (1 - hsl.l) * .4) });
  M.normalScale.set(1.5, 1.5);
  if (emissive) { M.emissive = col(emissive); M.emissiveIntensity = 1; }
  M.userData.yarn = { stitch, repeat: rep };
  if (pattern) {
    const P = patternTex(patternGrid(pattern)), c2 = col(color2);
    M.color.set('#ffffff');
    const U = { uPat: { value: P.tex }, uPatSize: { value: P.size }, uCells: { value: new THREE.Vector2(...S.cells) }, uC1: { value: base }, uC2: { value: c2 } };
    patch(M, 'pattern', s => {
      Object.assign(s.uniforms, U);
      s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
uniform sampler2D uPat; uniform vec2 uPatSize, uCells; uniform vec3 uC1, uC2;`).replace('#include <map_fragment>', `#include <map_fragment>
{ vec2 st = floor( vMapUv * uCells ); float tone = texture2D( uPat, ( mod( st, uPatSize ) + .5 ) / uPatSize ).r;
  diffuseColor.rgb *= mix( uC1, uC2, tone ); }`);
    });
    if (M.sheenColor) M.sheenColor.copy(base).lerp(c2, .5).lerp(new THREE.Color(1, 1, 1), .4);
  }
  if (o.flow) M.userData.flow = o.flow;   // [u, v] uv units per second: the engine slides the maps (water)
  return M;
}

// ───────────────────────────── fuzz (shell fibres) ─────────────────────────────
// fuzz(mesh, { color, length, density, layers, opacity }) adds `layers` offset shells drawn as ONE instanced mesh; each
// shell keeps only the fibres that reach it, so short fibres stop low and long ones stick out. Needs uv + normals.
export function fuzz(mesh, o = {}) {
  if (OFF.has('fuzz')) return null;
  const { color = '#ffffff', length = .03, density = 300, layers = LITE ? 6 : 12, opacity = 1, droop = .5 } = o;
  const g = mesh.geometry; if (!g.attributes.uv || !g.attributes.normal) throw new Error('fuzz: geometry needs uv and normal');
  const U = { uFzLen: { value: length }, uFzLayers: { value: layers }, uFzDroop: { value: droop }, uFzDensity: { value: density }, uFzOpacity: { value: opacity } };
  const m = new THREE.MeshStandardMaterial({ color: col(color), roughness: 1, metalness: 0 });
  patch(m, 'fuzz', s => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', `#include <common>
uniform float uFzLen, uFzLayers, uFzDroop; varying float vFzShell; varying vec2 vFzUv;`).replace('#include <begin_vertex>', `#include <begin_vertex>
{ float sh = float( gl_InstanceID + 1 ) / uFzLayers; vFzShell = sh; vFzUv = uv;
  vec3 down = normalize( ( vec4( 0., -1., 0., 0. ) * modelMatrix ).xyz );
  vec3 wob = vec3( sin( dot( position, vec3( 31., 17., 23. ) ) ), sin( dot( position, vec3( 13., 41., 19. ) ) ), sin( dot( position, vec3( 29., 11., 37. ) ) ) );
  transformed += normalize( objectNormal ) * uFzLen * sh + down * uFzDroop * uFzLen * sh * sh + wob * .2 * uFzLen * sh; }`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
uniform float uFzDensity, uFzOpacity; varying float vFzShell; varying vec2 vFzUv;
float fzH( vec2 p ) { vec3 q = fract( vec3( p.xyx ) * .1031 ); q += dot( q, q.yzx + 33.33 ); return fract( ( q.x + q.y ) * q.z ); }`).replace('#include <color_fragment>', `#include <color_fragment>
{ vec2 g = vFzUv * uFzDensity, c = floor( g ), l = fract( g ) - .5; float s = vFzShell;
  if ( fzH( c + 3.7 ) > .7 * uFzOpacity ) discard;
  float top = .2 + .85 * pow( fzH( c + 11.3 ), 1.5 ); if ( s > top ) discard;
  vec2 ctr = ( vec2( fzH( c + 5.1 ), fzH( c + 6.2 ) ) - .5 ) * .16 + ( vec2( fzH( c + 9.9 ), fzH( c + 8.4 ) ) - .5 ) * .34 * s;
  if ( length( l - ctr ) > .36 * ( 1. - .85 * s / top ) ) discard;
  diffuseColor.rgb *= mix( .6, 1.06, pow( s, .7 ) ) * mix( .92, 1.08, fzH( c + 1.9 ) ); }`);
  });
  const shells = new THREE.InstancedMesh(g, m, layers);
  const I = new THREE.Matrix4(); for (let i = 0; i < layers; i++) shells.setMatrixAt(i, I);
  shells.castShadow = false; shells.receiveShadow = true; shells.frustumCulled = false; shells.name = 'fuzz';
  shells.raycast = () => {};
  mesh.add(shells); return shells;
}

// ───────────────────────────── geometry helpers ─────────────────────────────
// a tube along points (Catmull-Rom), uv.x runs along it so the 'strand' stitch twists the right way
export function tube(points, r = .05, o = {}) {
  const { seg = Math.max(8, points.length * 6), radial = 8, closed = false } = o;
  const curve = new THREE.CatmullRomCurve3(points.map(p => Array.isArray(p) ? V(...p) : p), closed, 'centripetal');
  return new THREE.TubeGeometry(curve, seg, r, radial, closed);
}
// rounded-square outline (the world's edge) at half-size H
export function outline(H, n = 256) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU - Math.PI, c = Math.cos(a), s = Math.sin(a);
    const k = 1 / sqNorm(c, s); pts.push([c * k * H, s * k * H]);
  }
  return pts;
}

// ───────────────────────────── the diorama ─────────────────────────────
// const D = new Diorama({ dur, fps, W, H, half, knit:[t0,t1], unravel:[t2,t3], ball:{…}, blanket:{…}, light:{…} })
export class Diorama {
  constructor(o = {}) {
    this.o = o;
    this.dur = o.dur ?? 20; this.fps = o.fps ?? 30;
    this.W = o.W ?? 1920; this.H = o.H ?? 1080;
    this.half = o.half ?? 8;                 // the knitted world is a rounded square of half-size `half` (metres)
    this.thick = o.thick ?? .35;             // slab thickness: the world's top is at y ≈ 0, the blanket at −thick
    this.floorY = -this.thick;
    this.knit = o.knit ?? [2, 10];           // knitting window
    this.unravel = o.unravel ?? null;        // [t2, t3] or null
    this.loop = o.loop ?? !!this.unravel;
    this.spin = o.spin ?? 2.6;               // rad/s the knitting head travels round the front
    this.lead = o.lead ?? .55;               // how far the head runs ahead of the front (m)
    this.NB = 96;
    this.reach = this.half * 1.05 + this.lead + .3;
    this.knitU = { uKnit: { value: new Float32Array(this.NB) }, uKnitH: { value: this.half } };
    this.pops = []; this.checks = []; this.frameFns = []; this.flows = [];
    this.groundAt = () => 0;

    const scale = +(Q.get('scale') || 1);
    this.scale = scale;
    const canvas = document.createElement('canvas'); document.body.appendChild(canvas);
    document.body.style.cssText = 'margin:0;background:#efe2cf;overflow:hidden';
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = o.exposure ?? 1.05;
    r.shadowMap.enabled = !LITE && !OFF.has('shadow'); r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.size(RENDER || Q.has('t') ? null : 'fit');

    const S = this.scene = new THREE.Scene();
    const bg = col(o.bg ?? '#efe2cf'); S.background = bg;
    if (!OFF.has('fog')) S.fog = new THREE.Fog(bg, o.fogNear ?? 26, o.fogFar ?? 70);
    this.camera = new THREE.PerspectiveCamera(30, this.W / this.H, .1, 300);

    const L = Object.assign({ sky: '#fff3e2', ground: '#c9b79c', hemi: 1.35, sun: '#fff0d8', sunI: 2.4, sunDir: [-.55, 1, .45], ambient: .25 }, o.light || {});
    S.add(new THREE.HemisphereLight(col(L.sky), col(L.ground), L.hemi));
    S.add(new THREE.AmbientLight('#ffffff', L.ambient));
    const sun = this.sun = new THREE.DirectionalLight(col(L.sun), L.sunI);
    sun.position.copy(V(...L.sunDir).normalize().multiplyScalar(30)); sun.target.position.set(0, 0, 0);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera, e = this.half * 1.6; sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.near = 5; sc.far = 70;
    sun.shadow.bias = -.0004; sun.shadow.normalBias = .02; sun.shadow.radius = 4;
    S.add(sun, sun.target);

    this.world = new THREE.Group(); this.world.name = 'world'; S.add(this.world);
    this.props = new THREE.Group(); this.props.name = 'props'; S.add(this.props);
    if (!OFF.has('blanket')) this.blanket(o.blanket || {});
    this.yarnBall(o.ball || {});
    this.camKeys = [{ t: 0, yaw: 0, elev: 30, dist: 26, target: [0, 0, 0], fov: 30 }];
  }

  size(mode) {
    const r = this.renderer;
    if (mode === 'fit') {
      const fit = () => { const w = innerWidth, h = innerHeight; r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.setSize(w, h); this.camera && (this.camera.aspect = w / h, this.camera.updateProjectionMatrix()); this.aspectLive = w / h; };
      addEventListener('resize', fit); fit();
    } else { r.setPixelRatio(1); r.setSize(Math.round(this.W * this.scale), Math.round(this.H * this.scale)); }
  }

  // ── the knit front: a radius per angle, a pure function of t ──
  // k(t): 0 → 1 over the knit window (eased), radius r = reach · (1 − (1 − k)^1.7)
  progress(t) {
    const [a, b] = this.knit;
    if (t < a) return 0;
    if (this.unravel && t >= this.unravel[0]) { const [c, d] = this.unravel; return 1 - ease.inOut((t - c) / (d - c)); }
    return clamp((t - a) / (b - a));
  }
  radiusAtK(k) { return lerp(-.3, this.reach, 1 - Math.pow(1 - clamp(k), 1.7)); }
  radius(t) { return this.radiusAtK(this.progress(t)); }
  headAngle(t) { return this.spin * t; }
  phase(t) {
    const [a, b] = this.knit;
    if (t < a) return 'ball';
    if (t < b) return 'knit';
    if (this.unravel) { const [c, d] = this.unravel; if (t >= d) return 'ball'; if (t >= c) return 'unravel'; }
    return 'done';
  }
  front(t) {
    const F = this.knitU.uKnit.value, NB = this.NB, ph = this.phase(t), A = this.lead, sig = .16, step = 1 / 60;
    if (OFF.has('clip') || ph === 'done') { F.fill(99); return F; }
    if (ph === 'ball') { F.fill(-99); return F; }
    const knit = ph === 'knit', [t0] = knit ? this.knit : this.unravel;
    const rNow = this.radius(t); F.fill(rNow);
    // every past position of the head left a bump on the front: knit keeps the max, unravel the min
    for (let tau = t0; tau <= t + 1e-6; tau += step) {
      const rt = this.radius(tau), h = this.headAngle(tau);
      const c = ((h / TAU + .5) % 1 + 1) % 1 * NB;
      for (let d = -8; d <= 8; d++) {
        const i = ((Math.round(c) + d) % NB + NB) % NB, ang = (i / NB - .5) * TAU;
        let da = ang - h; da -= TAU * Math.round(da / TAU);
        const bump = A * Math.exp(-((da / sig) ** 2));
        if (knit) { if (rt + bump > F[i]) F[i] = rt + bump; } else if (rt - bump < F[i]) F[i] = rt - bump;
      }
    }
    return F;
  }
  frontAt(t, ang) {        // front radius at an angle (after front(t) ran)
    const F = this.knitU.uKnit.value, x = ((ang / TAU + .5) % 1 + 1) % 1 * this.NB, i = Math.floor(x) % this.NB;
    return lerp(F[i], F[(i + 1) % this.NB], x - Math.floor(x));
  }

  // makes a material show only inside the knit front, with a cream rim at the edge (edge: false = no rim)
  clip(mat, edge = true) {
    const U = this.knitU, NB = this.NB;
    const glsl = `
#define KNIT_NB ${NB}
uniform float uKnit[ KNIT_NB ]; uniform float uKnitH; varying vec2 vKnitXZ;
float knitMargin( vec2 xz ) {
  vec2 q = abs( xz ) / uKnitH; vec2 q2 = q * q, q4 = q2 * q2, q8 = q4 * q4;
  float a = pow( q8.x + q8.y + 1e-12, .125 ) * uKnitH;
  float ang = atan( xz.y, xz.x ), t = ( ang / 6.2831853 + .5 ) * float( KNIT_NB );
  int i0 = int( floor( t ) ); float fr = t - float( i0 ); i0 = i0 >= KNIT_NB ? KNIT_NB - 1 : i0; int i1 = i0 + 1 >= KNIT_NB ? 0 : i0 + 1;
  return mix( uKnit[ i0 ], uKnit[ i1 ], fr ) + .05 * abs( sin( ang * 52. ) ) - a;
}`;
    return patch(mat, edge ? 'knitEdge' : 'knitClip', s => {
      s.uniforms.uKnit = U.uKnit; s.uniforms.uKnitH = U.uKnitH;
      s.vertexShader = s.vertexShader.replace('#include <common>', `#include <common>
${glsl}`).replace('#include <project_vertex>', `#ifdef USE_INSTANCING
  vKnitXZ = ( modelMatrix * instanceMatrix * vec4( transformed, 1. ) ).xz;
#else
  vKnitXZ = ( modelMatrix * vec4( transformed, 1. ) ).xz;
#endif
#include <project_vertex>`);
      s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
${glsl}`);
      if (edge && s.fragmentShader.includes('#include <color_fragment>')) s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
{ float kd = knitMargin( vKnitXZ ); if ( kd < 0. ) discard;
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( .97, .9, .78 ), .5 * ( 1. - smoothstep( 0., .08, kd ) ) ); }`);
      else s.fragmentShader = s.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
if ( knitMargin( vKnitXZ ) < 0. ) discard;`);
    });
  }
  // clip every mesh under obj (materials are cloned once per original) and give them a clipped shadow caster
  clipTree(obj, edge = true) {
    const done = new Map(), depth = this.clip(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), false);
    obj.traverse(m => {
      if (!m.isMesh) return;
      const one = mt => { if (!done.has(mt)) { const c = mt.clone(); c.onBeforeCompile = mt.onBeforeCompile; c.customProgramCacheKey = mt.customProgramCacheKey; done.set(mt, this.clip(c, edge && m.name !== 'fuzz')); } return done.get(mt); };
      m.material = Array.isArray(m.material) ? m.material.map(one) : one(m.material);
      m.customDepthMaterial = depth;
    });
    return obj;
  }

  // ── the knitted ground ──
  // ground({ height:(x,z)=>y, region:(x,z)=>key, mats:{key:material}, seg, side, rim, seams })
  // Triangles are split exactly where region() changes, so field edges are smooth; those split lines become the seams
  // (a running stitch in `seams.color`). seams.skip(a,b) → true leaves a boundary unstitched.
  ground(o) {
    const H = this.half, seg = o.seg ?? 200, height = o.height ?? (() => 0), region = o.region ?? (() => 'base');
    const mats = o.mats, keys = Object.keys(mats);
    this.groundAt = (x, z) => height(x, z);
    // grid in the unit square mapped radially onto the rounded square
    const N = seg + 1, P = new Float32Array(N * N * 2), lab = new Int32Array(N * N);
    const keyOf = (x, z) => { const k = region(x, z); const i = keys.indexOf(k); if (i < 0) throw new Error(`ground: region "${k}" has no material`); return i; };
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const u = i / seg * 2 - 1, v = j / seg * 2 - 1, m = Math.max(Math.abs(u), Math.abs(v)), n = sqNorm(u, v), s = n > 0 ? m / n : 0;
      const x = u * s * H, z = v * s * H, k = j * N + i; P[k * 2] = x; P[k * 2 + 1] = z; lab[k] = keyOf(x, z);
    }
    const pos = [], uv = [], groups = keys.map(() => []);
    const edgeCache = new Map(), segs = [];
    const vert = (x, z) => { pos.push(x, height(x, z), z); uv.push(x, -z); return pos.length / 3 - 1; };
    const vcache = new Map();
    const gridV = k => { if (!vcache.has(k)) vcache.set(k, vert(P[k * 2], P[k * 2 + 1])); return vcache.get(k); };
    // the boundary point on edge a–b (bisection on region), shared by both triangles of the edge
    const cut = (a, b) => {
      const key = a < b ? a + ',' + b : b + ',' + a;
      if (edgeCache.has(key)) return edgeCache.get(key);
      let ax = P[a * 2], az = P[a * 2 + 1], bx = P[b * 2], bz = P[b * 2 + 1]; const la = lab[a];
      for (let it = 0; it < 10; it++) { const mx = (ax + bx) / 2, mz = (az + bz) / 2; if (keyOf(mx, mz) === la) { ax = mx; az = mz; } else { bx = mx; bz = mz; } }
      const x = (ax + bx) / 2, z = (az + bz) / 2, r = { v: vert(x, z), x, z, id: key };
      edgeCache.set(key, r); return r;
    };
    const tri = (g, a, b, c) => groups[g].push(a, b, c);
    const addTri = (a, b, c) => {
      const la = lab[a], lb = lab[b], lc = lab[c];
      if (la === lb && lb === lc) { tri(la, gridV(a), gridV(b), gridV(c)); return; }
      if (la !== lb && lb !== lc && la !== lc) {            // three regions meet: fan around the centroid's label
        const cx = (P[a * 2] + P[b * 2] + P[c * 2]) / 3, cz = (P[a * 2 + 1] + P[b * 2 + 1] + P[c * 2 + 1]) / 3;
        tri(keyOf(cx, cz), gridV(a), gridV(b), gridV(c)); return;
      }
      // rotate so that a is the odd one out
      let [p, q, r] = la === lb ? [c, a, b] : la === lc ? [b, c, a] : [a, b, c];
      const m1 = cut(p, q), m2 = cut(p, r);
      tri(lab[p], gridV(p), m1.v, m2.v);
      tri(lab[q], m1.v, gridV(q), gridV(r)); tri(lab[q], m1.v, gridV(r), m2.v);
      segs.push([m1, m2, lab[p], lab[q]]);
    };
    for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) {
      const a = j * N + i, b = a + 1, c = a + N, d = c + 1;
      if ((i + j) & 1) { addTri(a, c, b); addTri(b, c, d); } else { addTri(a, c, d); addTri(a, d, b); }
    }
    const G = new THREE.BufferGeometry(), idx = [];
    G.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); G.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    groups.forEach((g, i) => { G.addGroup(idx.length, g.length, i); for (const v of g) idx.push(v); });   // no spread: a big region overflows the stack
    G.setIndex(idx); G.computeVertexNormals();
    const top = new THREE.Mesh(G, keys.map(k => mats[k])); top.receiveShadow = true; top.castShadow = true; top.name = 'ground';
    this.world.add(top);

    // the slab's sides and the corded rim
    const ol = outline(H, 320), sidePos = [], sideUv = [], sideIdx = []; let acc = 0;
    ol.forEach(([x, z], i) => {
      const [px, pz] = ol[(i - 1 + ol.length) % ol.length]; if (i) acc += Math.hypot(x - px, z - pz);
      const y = height(x, z);
      sidePos.push(x, y, z, x, this.floorY, z); sideUv.push(acc, y, acc, this.floorY);
    });
    ol.push(ol[0]); { const [x, z] = ol[0], y = height(x, z), [px, pz] = ol[ol.length - 2]; acc += Math.hypot(x - px, z - pz); sidePos.push(x, y, z, x, this.floorY, z); sideUv.push(acc, y, acc, this.floorY); }
    for (let i = 0; i < ol.length - 1; i++) { const a = i * 2; sideIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const SG = new THREE.BufferGeometry(); SG.setAttribute('position', new THREE.Float32BufferAttribute(sidePos, 3));
    SG.setAttribute('uv', new THREE.Float32BufferAttribute(sideUv, 2)); SG.setIndex(sideIdx); SG.computeVertexNormals();
    const side = new THREE.Mesh(SG, o.side ?? yarn({ color: PAL.oat, stitch: 'rib', repeat: [3, 3] })); side.castShadow = side.receiveShadow = true; side.name = 'side';
    this.world.add(side);
    if (o.rim !== false) {
      const rp = outline(H + .02, 160).map(([x, z]) => V(x, height(x, z) + .02, z));
      const rim = new THREE.Mesh(tube(rp, .085, { closed: true, seg: 640, radial: 10 }), o.rim ?? yarn({ color: PAL.coral, stitch: 'strand', repeat: [160, 1] }));
      rim.castShadow = rim.receiveShadow = true; rim.name = 'rim'; this.world.add(rim);
    }
    if (o.seams !== false && !OFF.has('seams')) this.seams(segs, keys, o.seams || {}, height);
    this.clipTree(this.world);
    return top;
  }
  seams(segs, keys, o, height) {
    const { color = PAL.white, dash = .13, gap = .09, r = .028, skip = () => false } = o;
    // chain the split segments into polylines through their shared cut points
    const adj = new Map(), use = segs.filter(s => !skip(keys[s[2]], keys[s[3]]));
    for (const s of use) for (const [a, b] of [[s[0], s[1]], [s[1], s[0]]]) { if (!adj.has(a.id)) adj.set(a.id, []); adj.get(a.id).push(b); }
    const pt = new Map(); for (const s of use) { pt.set(s[0].id, s[0]); pt.set(s[1].id, s[1]); }
    const seen = new Set(), lines = [];
    const walk = start => { const line = [start]; seen.add(start.id); let cur = start;
      for (;;) { const nx = (adj.get(cur.id) || []).find(n => !seen.has(n.id)); if (!nx) break; seen.add(nx.id); line.push(nx); cur = nx; } return line; };
    for (const [id, p] of pt) if (!seen.has(id) && (adj.get(id) || []).length === 1) lines.push(walk(p));
    for (const [id, p] of pt) if (!seen.has(id)) lines.push(walk(p));
    const marks = [];
    for (const line of lines) {
      let run = 0, on = true, left = dash * .5;
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1], b = line[i], L = Math.hypot(b.x - a.x, b.z - a.z); let s = 0;
        while (s < L) {
          const take = Math.min(left, L - s);
          if (on) marks.push([a.x + (b.x - a.x) * (s + take / 2) / L, a.z + (b.z - a.z) * (s + take / 2) / L, Math.atan2(b.z - a.z, b.x - a.x), take]);
          s += take; left -= take; if (left <= 1e-6) { on = !on; left = on ? dash : gap; }
        }
        run += L;
      }
    }
    // merge consecutive partial dashes is unnecessary: a dash split by a polyline vertex just draws as two touching pieces
    const geo = new THREE.CapsuleGeometry(r, 1, 3, 6); geo.rotateZ(Math.PI / 2);
    const inst = new THREE.InstancedMesh(geo, yarn({ color, stitch: 'strand', repeat: [6, 1] }), marks.length);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = V();
    marks.forEach(([x, z, a, L], i) => {
      q.setFromAxisAngle(V(0, 1, 0), -a); sc.set(Math.max(.02, L - r * 1.2), 1, 1);
      M.compose(V(x, height(x, z) + r * .45, z), q, sc); inst.setMatrixAt(i, M);
    });
    inst.castShadow = false; inst.receiveShadow = true; inst.name = 'seams'; this.world.add(inst);
    return inst;
  }

  // ── props that pop out of the ball as the front reaches them ──
  // add(obj, { at:[x,z], kind:'pop'|'drop'|'none', rho, height, delay }) — obj is built at its final place;
  // the engine wraps it and flies it from the ball (pop) or drops it from the sky (drop) when the front passes rho.
  add(obj, o = {}) {
    const box = new THREE.Box3().setFromObject(obj), base = o.at ? V(o.at[0], this.groundAt(o.at[0], o.at[1]), o.at[1]) : V((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
    const w = new THREE.Group(); w.add(obj); obj.position.sub(base); this.props.add(w);
    const kind = o.kind ?? 'pop', rho = o.rho ?? sqNorm(base.x / this.half, base.z / this.half) * this.half;
    obj.traverse(m => { if (m.isMesh && m.name !== 'fuzz') { m.castShadow = m.castShadow || o.shadow !== false; m.receiveShadow = true; } });
    const P = { obj, w, base, kind, rho, delay: o.delay ?? 0, drop: o.height ?? 12, name: o.name || obj.name || 'prop' };
    P.tIn = this.whenRadius(rho + .15, 'knit') + P.delay;
    P.tOut = this.unravel ? this.whenRadius(rho + .25, 'unravel') : Infinity;
    this.pops.push(P); return obj;
  }
  // first time the base front radius crosses r (knit: going up, unravel: going down)
  whenRadius(r, which) {
    const [a, b] = which === 'knit' ? this.knit : this.unravel;
    const up = which === 'knit';
    if (up ? this.radius(a + 1e-4) >= r : this.radius(a + 1e-4) <= r) return a;
    if (up ? this.radius(b - 1e-4) < r : this.radius(b - 1e-4) > r) return b;
    let lo = a, hi = b;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; const ok = up ? this.radius(m) >= r : this.radius(m) <= r; if (ok) hi = m; else lo = m; }
    return hi;
  }
  posePop(P, t) {
    const { w, base } = P; const ball = this.ballAt(t);
    const show = (sx, sy, x, y, z) => { w.visible = true; w.scale.set(sx, sy, sx); w.position.set(x, y, z); };
    if (OFF.has('pops')) return show(1, 1, base.x, base.y, base.z);
    w.visible = false;
    if (P.kind === 'none') return show(1, 1, base.x, base.y, base.z);
    if (t < P.tIn) return;
    const fly = clamp(.42 + .06 * Math.hypot(base.x - ball.pos.x, base.z - ball.pos.z), .5, .95), arc = .6 + .12 * Math.hypot(base.x, base.z);
    if (t < P.tOut) {                                         // coming in
      const s = t - P.tIn;
      if (P.kind === 'drop') { const k = spring(s, 6.5, .78); return show(1, 1, base.x, base.y + P.drop * (1 - k), base.z); }
      if (s < fly) {
        const k = s / fly, r = (1 - k) * (1 - k), from = ball.pos;
        return show(Math.max(.001, lerp(1.14, .02, r)), Math.max(.001, lerp(.62, .02, r)), lerp(base.x, from.x, r), lerp(base.y, from.y, r) + arc * Math.sin(Math.PI * k), lerp(base.z, from.z, r));
      }
      const k = spring(s - fly, 15, .42);
      return show(lerp(1.14, 1, k), lerp(.62, 1, k), base.x, base.y, base.z);
    }
    const s = t - P.tOut;                                      // going back into the ball
    if (P.kind === 'drop') { if (s > 1.1) return; const k = (s / 1.1) ** 2; return show(1, 1, base.x, base.y + P.drop * k, base.z); }
    if (s < .2) { const k = smooth(0, 1, s / .2); return show(1 + .14 * k, 1 - .38 * k, base.x, base.y, base.z); }
    const k = clamp((s - .2) / fly); if (k >= 1) return;
    const r = k * k, to = ball.pos;
    return show(Math.max(.001, lerp(1.14, .02, r)), Math.max(.001, lerp(.62, .02, r)), lerp(base.x, to.x, r), lerp(base.y, to.y, r) + arc * Math.sin(Math.PI * k), lerp(base.z, to.z, r));
  }

  // ── the blanket the world sits on: a wavy patchwork of knitted squares ──
  blanket(o) {
    const { size = 120, patch: ps = 3.2, colors = ['#f3d9b8', '#f1c9a9', '#e9d6a0', '#d9dcae', '#f0d0c0', '#efe0c4', '#e6c9a2'], wave = .18, repeat = 2.2, seed = 7 } = o;
    const n = Math.round(size / ps), pos = [], uv = [], cl = [], ix = [], R = rng(seed);
    const flat = this.half * 1.12;   // flat under the world and round it, so the slab sits on it with no gaps
    const h = (x, z) => wave * smooth(flat, flat * 1.6, sqNorm(x, z)) * (Math.sin(x * .23 + 1.3) * Math.cos(z * .19 - .4) + .5 * Math.sin(x * .07 - z * .11));
    const sub = 4;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const c = col(colors[Math.floor(R() * colors.length)]), x0 = (i - n / 2) * ps, z0 = (j - n / 2) * ps, b = pos.length / 3;
      for (let v = 0; v <= sub; v++) for (let u = 0; u <= sub; u++) {
        const x = x0 + u / sub * ps, z = z0 + v / sub * ps; pos.push(x, this.floorY + h(x, z), z); uv.push(x, -z); cl.push(c.r, c.g, c.b);
      }
      for (let v = 0; v < sub; v++) for (let u = 0; u < sub; u++) { const a = b + v * (sub + 1) + u; ix.push(a, a + sub + 1, a + 1, a + 1, a + sub + 1, a + sub + 2); }
    }
    const G = new THREE.BufferGeometry();
    G.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); G.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    G.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); G.setIndex(ix); G.computeVertexNormals();
    const M = yarn({ color: '#ffffff', stitch: o.stitch ?? 'stockinette', repeat });
    M.vertexColors = true; M.sheen = 0;
    const m = new THREE.Mesh(G, M); m.receiveShadow = true; m.name = 'blanket';
    this.blanketAt = (x, z) => this.floorY + h(x, z);
    this.scene.add(m); return m;
  }

  // ── the yarn ball: sits on the blanket, lifts and spins while it knits, shrinks with the yarn it gave ──
  yarnBall(o) {
    const { color = PAL.coral, r = [.32, 1.15], home = null, hover = 2.6, needles = true, tail = null, pom = PAL.mustard } = o;
    this.ballO = { color, r, home, hover, tail };
    const g = this.ball = new THREE.Group(); g.name = 'ball'; this.scene.add(g);
    const spin = this.ballSpin = new THREE.Group(); g.add(spin);
    const M = yarn({ color, stitch: 'strand', repeat: [24, 1] });
    const core = new THREE.Mesh(new THREE.SphereGeometry(.9, 32, 20), yarn({ color, stitch: 'boucle', repeat: [2, 1] }));
    core.castShadow = true; spin.add(core);
    const R = rng(11);
    for (let i = 0; i < 26; i++) {               // wraps: great circles at random tilts, a hair apart
      const n = V(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1).normalize(), a = V(1, 0, 0).cross(n).normalize(), b = n.clone().cross(a);
      const rr = .93 + .05 * (i % 3), pts = [];
      for (let k = 0; k < 48; k++) { const th = k / 48 * TAU; pts.push(a.clone().multiplyScalar(Math.cos(th) * rr).add(b.clone().multiplyScalar(Math.sin(th) * rr))); }
      const m = new THREE.Mesh(tube(pts, .07, { closed: true, seg: 96, radial: 6 }), M); m.castShadow = true; spin.add(m);
    }
    // the thread (rebuilt per frame), its pom-pom end, and two knitting needles that ride the knitting head
    this.threadMat = yarn({ color, stitch: 'strand', repeat: [30, 1] });
    this.thread = new THREE.Mesh(new THREE.BufferGeometry(), this.threadMat); this.thread.castShadow = true; this.scene.add(this.thread);
    this.pom = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 12), yarn({ color: pom, stitch: 'boucle', repeat: [1, 1] }));
    this.pom.castShadow = true; fuzz(this.pom, { color: pom, length: .03, density: 60 }); this.scene.add(this.pom);
    if (needles && !OFF.has('needles')) {
      const nd = this.needles = new THREE.Group(); this.scene.add(nd);
      const wood = yarn({ color: '#c99a62', stitch: 'felt', roughness: .6, sheen: 0 }), tip = yarn({ color: PAL.berry, stitch: 'felt', roughness: .5, sheen: 0 });
      for (const s of [-1, 1]) {
        const n = new THREE.Group(); n.userData.s = s;
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.3, 10), wood); shaft.position.y = .65; shaft.castShadow = true;
        const point = new THREE.Mesh(new THREE.ConeGeometry(.03, .12, 10), wood); point.position.y = -.06; point.rotation.x = Math.PI;
        const knob = new THREE.Mesh(new THREE.SphereGeometry(.075, 14, 10), tip); knob.position.y = 1.32; knob.castShadow = true;
        n.add(shaft, point, knob); nd.add(n);
      }
    }
    if (OFF.has('ball')) g.visible = false;
  }
  // where the ball is, how big, how it spins — a pure function of t
  ballAt(t) {
    const B = this.ballO, [rmin, rmax] = B.r, [t0, t1] = this.knit, fy = this.floorY;
    const k = this.progress(t), frac = clamp(Math.pow(clamp(this.radius(t) / this.reach), 2));
    const r = Math.cbrt(rmin ** 3 + (rmax ** 3 - rmin ** 3) * (1 - frac));
    const rest = V(0, fy + rmax, 0), hover = V(0, B.hover + rmax, 0);
    const home = B.home ? V(B.home[0], (this.blanketAt ? this.blanketAt(B.home[0], B.home[1]) : fy) + rmin, B.home[1]) : null;
    let pos, squash = 1;
    const ph = this.phase(t);
    const lift = (s) => { const kk = spring(s, 7, .62); return rest.clone().lerp(hover, kk); };
    if (t < t0 - .25) pos = rest.clone();
    else if (t < t1) pos = lift(t - (t0 - .25));
    else if (!home) pos = hover.clone();
    else {
      const t2 = this.unravel ? this.unravel[0] : Infinity, go = .9;
      const arc = (a, b, s) => { const kk = ease.inOut(s); const p = a.clone().lerp(b, kk); p.y += 1.2 * Math.sin(Math.PI * kk); return p; };
      if (t < t1 + go) pos = arc(hover, home, (t - t1) / go);
      else if (t < t2 - go) { pos = home.clone(); squash = 1 - .25 * (1 - spring(t - t1 - go, 16, .35)); }
      else if (t < t2) pos = arc(home, hover, (t - (t2 - go)) / go);
      else pos = hover.clone();
    }
    if (this.unravel && t >= this.unravel[0]) {
      const [, t3] = this.unravel;
      if (t >= t3 - .6) { const kk = ease.inOut((t - (t3 - .6)) / .6); pos = hover.clone().lerp(rest, kk); if (t >= t3) { pos = rest.clone(); squash = 1 - .2 * (1 - spring(t - t3, 16, .4)); } }
    }
    if (ph === 'knit' || ph === 'unravel') pos.y += .12 * Math.sin(t * 3.1);
    const turn = 7 * k;           // winds out while knitting, back in while unravelling: same pose at both ends of a loop
    return { pos, r, squash, turn, k };
  }

  // ── camera: keys {t, yaw°, elev°, dist, target:[x,y,z], fov}; a monotone cubic through the keys (no overshoot:
  // two equal keys hold the camera still, a value never swings past its neighbours)
  cameraKeys(keys) { this.camKeys = keys.slice().sort((a, b) => a.t - b.t); }
  camAt(t) {
    const K = this.camKeys; if (K.length === 1) return K[0];
    const T = K.map(k => k.t);
    const curve = vals => {
      const n = vals.length; if (t <= T[0]) return vals[0]; if (t >= T[n - 1]) return vals[n - 1];
      let i = 0; while (t > T[i + 1]) i++;
      const sl = j => (vals[j + 1] - vals[j]) / (T[j + 1] - T[j]);
      const tan = j => { if (j === 0 || j === n - 1) return 0; const a = sl(j - 1), b = sl(j); return a * b <= 0 ? 0 : 2 / (1 / a + 1 / b); };
      const h = T[i + 1] - T[i], u = (t - T[i]) / h, u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * vals[i] + (u3 - 2 * u2 + u) * h * tan(i) + (-2 * u3 + 3 * u2) * vals[i + 1] + (u3 - u2) * h * tan(i + 1);
    };
    const f = k => curve(K.map(x => x[k] ?? K[0][k] ?? 30));
    return { yaw: f('yaw'), elev: f('elev'), dist: f('dist'), fov: f('fov'), target: [0, 1, 2].map(j => curve(K.map(x => x.target[j]))) };
  }

  onFrame(fn) { this.frameFns.push(fn); }
  check(name, fn) { this.checks.push({ name, fn }); }

  // ── one frame ──
  render(t) { this.pose(t); this.renderer.render(this.scene, this.camera); }
  // everything but drawing: the state of frame t (rules in runChecks read this)
  pose(t) {
    this.t = t;
    this.front(t);
    // the ball
    const B = this.ballAt(t), ph = this.phase(t);
    this.ball.position.copy(B.pos); this.ball.scale.set(B.r * (2 - B.squash) ** .5, B.r * B.squash, B.r * (2 - B.squash) ** .5);
    this.ballSpin.rotation.set(B.turn * .8, B.turn, B.turn * .3);
    this.ball.visible = !OFF.has('ball');
    // the knitting head and the thread from the ball to it
    const hA = this.headAngle(t), knitting = ph === 'knit' || ph === 'unravel';
    const hr = knitting ? Math.max(0, Math.min(this.frontAt(t, hA), this.half * .98)) : 0;
    const head = V(Math.cos(hA) * hr, 0, Math.sin(hA) * hr); head.y = this.groundAt(head.x, head.z) + .04;
    const [t0, t1] = this.knit, fy = this.floorY, t3 = this.unravel ? this.unravel[1] : Infinity;
    const tail = this.ballO.tail ?? [[0, 0], [1.2, .5], [2.1, 1.4], [2.9, 1.2]];
    const ballBottom = B.pos.clone().add(V(0, -B.r * .85, 0));
    // tug: 0 = the loose end lies slack on the blanket, 1 = pulled straight to the centre where knitting starts
    const tug = t < t0 ? smooth(t0 - .9, t0, t) : t >= t3 ? 1 - smooth(t3, t3 + .9, t) : 1;
    const tailEnd = V(tail[tail.length - 1][0], fy + .1, tail[tail.length - 1][1]), centre = V(0, fy + .05, 0);
    let end, show = true, pomK = 1, pts;
    if (ph === 'ball') {
      end = tailEnd.clone().lerp(centre, ease.inOut(tug));
      const n = tail.length; pts = [V(B.pos.x, fy + .06, B.pos.z + B.r * .2)];
      for (let i = 1; i < n - 1; i++) pts.push(V(tail[i][0], fy + .07, tail[i][1]).lerp(V(end.x * i / (n - 1), fy + .07, end.z * i / (n - 1)), ease.inOut(tug)));
      pts.push(end.clone());
    } else if (knitting) {
      end = head; pomK = ph === 'knit' ? 1 - smooth(t0, t0 + .4, t) : smooth(t3 - .5, t3, t);
      const mid = ballBottom.clone().lerp(end, .5); mid.y = Math.max(ballBottom.y, end.y) * .55 + .3;
      pts = [ballBottom, ballBottom.clone().lerp(mid, .5).add(V(0, .1, 0)), mid, mid.clone().lerp(end, .6).add(V(0, .05, 0)), end];
    } else { show = false; pomK = 0; }
    if (OFF.has('thread')) show = false;
    this.thread.visible = show; this.pom.visible = show && pomK > .01;
    if (show) {
      this.thread.geometry.dispose(); this.thread.geometry = tube(pts, .045, { seg: 48, radial: 6 });
      this.pom.position.copy(end).add(V(0, .08, 0)); this.pom.scale.setScalar(Math.max(.001, pomK));
    }
    if (this.needles) {
      const on = knitting ? smooth(t0, t0 + .5, t) * (1 - smooth(t1 - .5, t1, t)) : 0;
      const un = this.unravel && t >= this.unravel[0] ? smooth(this.unravel[0], this.unravel[0] + .5, t) * (1 - smooth(this.unravel[1] - .5, this.unravel[1], t)) : 0;
      const k = Math.max(on, un); this.needles.visible = k > .01;
      if (k > .01) {
        this.needles.position.copy(head); this.needles.scale.setScalar(k);
        this.needles.rotation.set(0, -hA, 0);
        this.needles.children.forEach(n => { const s = n.userData.s, click = Math.sin(t * 16 + (s > 0 ? 0 : 1.7)); n.rotation.set(s * (.42 + .08 * click), 0, .55 + .1 * click); });
      }
    }
    // props
    for (const P of this.pops) this.posePop(P, t);
    // flowing water etc.
    this.scene.traverse(m => { if (!m.isMesh) return; const ms = Array.isArray(m.material) ? m.material : [m.material];
      for (const mt of ms) { const f = mt.userData && mt.userData.flow; if (!f) continue; for (const k of ['map', 'normalMap', 'roughnessMap']) if (mt[k]) mt[k].offset.set(f[0] * t, f[1] * t); } });
    for (const fn of this.frameFns) fn(t, this);
    // camera
    const C = this.camAt(t), cam = this.camera, yaw = C.yaw * Math.PI / 180, el = C.elev * Math.PI / 180;
    const tg = V(...C.target);
    cam.position.set(tg.x + Math.sin(yaw) * Math.cos(el) * C.dist, tg.y + Math.sin(el) * C.dist, tg.z + Math.cos(yaw) * Math.cos(el) * C.dist);
    cam.fov = C.fov; cam.aspect = this.aspectLive ?? this.W / this.H;
    if (this.aspectLive && this.aspectLive < this.W / this.H) {       // narrow window: keep the film's horizontal framing
      const h = 2 * Math.atan(Math.tan(C.fov * Math.PI / 360) * (this.W / this.H) / this.aspectLive) * 180 / Math.PI; cam.fov = Math.min(h, 75);
    }
    cam.updateProjectionMatrix(); cam.lookAt(tg);
  }

  start() {
    window.DURATION = this.dur; window.FPS = this.fps; window.SIZE = { W: this.W, H: this.H };
    window.seek = t => { this.render(clamp(t, 0, this.dur)); return true; };
    window.runChecks = t => { this.pose(t); const bad = []; for (const c of this.checks) { let ok; try { ok = c.fn(t, this); } catch (e) { ok = false; } if (!ok) bad.push(c.name); } return bad; };
    window.D = this;
    // built-in rules
    this.check('every prop has popped by the end of knitting', t => this.phase(t) !== 'done' || this.pops.every(P => P.tIn <= this.knit[1] + .05));
    this.check('the ball stays above the blanket', t => this.ballAt(t).pos.y - this.ballAt(t).r * .9 >= this.floorY - .05);
    const tq = Q.get('t');
    if (RENDER || tq != null) { this.render(+(tq || 0)); window.__ready = true; return; }
    // live: plays and loops; drag sideways to pull the thread (scrub), click or space pauses, ← → step
    let t = 0, last = performance.now(), paused = false, drag = null;
    const el = this.renderer.domElement; el.style.cursor = 'grab'; el.style.touchAction = 'none';
    addEventListener('keydown', e => { if (e.code === 'Space') { paused = !paused; e.preventDefault(); } if (e.code === 'ArrowRight') t = Math.min(this.dur, t + 1); if (e.code === 'ArrowLeft') t = Math.max(0, t - 1); });
    el.addEventListener('pointerdown', e => { drag = { x: e.clientX, t, moved: false }; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; });
    el.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 4) drag.moved = true; if (drag.moved) t = clamp(drag.t + dx / innerWidth * this.dur * .8, 0, this.dur); });
    el.addEventListener('pointerup', () => { if (drag && !drag.moved) paused = !paused; drag = null; el.style.cursor = 'grab'; });
    const loop = now => {
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      if (!paused && !drag) { t += dt; if (t > this.dur) t = this.loop ? t - this.dur : this.dur; }
      this.render(t); requestAnimationFrame(loop);
    };
    window.__ready = true; requestAnimationFrame(loop);
  }
}

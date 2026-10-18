// ─────────────────────────────────────────────────────────────
//  profiler-lanes — a profiler / tracing timeline as 3D objects in three.js: lane beds, instanced timer blocks
//  (lit from within), nested scopes, hatched "waiting" blocks, budget sheets that turn red, a ms ruler, a playhead,
//  a stall band, and per-block dim / fold. Lives in any THREE.Group — on a level of zoom-levels, or on its own.
//
//  Profiler space: x = time (ms × xs, shifted by xo — a time zoom), y = up (block height), z = lanes.
//  Rotate / scale the parent group to stand the timeline up as a wall, lay it on a die, etc.
//
//  MACHINERY ONLY: which lanes exist, their names, colours, the blocks (what ran when) and the budget are the page's.
//  draw(state) is a pure function of the state you pass; compute that state from t (and seeded randomness).
//
//  Load: copy to <project>/assets/kits/profiler-lanes.js; the page's importmap maps 'three'.
//    import { createLanes } from '../assets/kits/profiler-lanes.js';
//  Source: mmo-server-explained server-tick-inside-wide (lines 491–508, 742–777: thread lanes, budget sheets, ruler,
//  playhead, STW band) and ue-client-threads-inside-wide (lines 444–468, 803–829: track headers, nested scopes, hatching).
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
/** unit box: origin at min-x, bottom, centred in z (x scale = length, y scale = height). */
export const UNIT = (() => { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(.5, .5, 0); return g; })();
const _o = new THREE.Object3D(), _c = new THREE.Color();

/** lit material whose instance colour also glows (emissive += colour × k): profiler blocks read as lit from within. */
export function glowMaterial(k = .42, o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .5, metalness: .05, ...o });
  m.userData.emiK = { value: k };
  m.onBeforeCompile = sh => { sh.uniforms.emiK = m.userData.emiK; sh.fragmentShader = 'uniform float emiK;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * emiK;'); };
  return m;
}
/**
 * translucent material with diagonal stripes in object space (instanced or not): "waiting / blocked" time.
 * period = stripe period in profiler units (1 / freq), lo / hi = alpha of the two stripes (× opacity).
 */
export function hatchMaterial(color, { opacity = .55, period = 1 / .32, lo = .28, hi = .75 } = {}) {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const f = (1 / period).toFixed(6);
  m.onBeforeCompile = sh => {
    sh.vertexShader = 'varying vec3 vP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\n vP = (instanceMatrix * vec4(position, 1.0)).xyz;\n#else\n vP = position;\n#endif');
    sh.fragmentShader = 'varying vec3 vP;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n float hz = step(.5, fract((vP.x + vP.y * .7 + vP.z * .3) * ${f}));\n diffuseColor.a *= mix(${lo.toFixed(4)}, ${hi.toFixed(4)}, hz);`);
  };
  m.customProgramCacheKey = () => `hatch${f}${lo}${hi}`;
  return m;
}
function dyn(parent, geo, mat, n) {
  const im = new THREE.InstancedMesh(geo, mat, n);
  for (let i = 0; i < n; i++) { im.setMatrixAt(i, new THREE.Matrix4()); im.setColorAt(i, _c.set('#ffffff')); }
  im.count = 0; im.frustumCulled = false; parent.add(im); return im;
}
function put(im, i, x, y, z, sx, sy, sz, col) {
  _o.position.set(x, y, z); _o.rotation.set(0, 0, 0); _o.scale.set(Math.max(1e-4, sx), Math.max(1e-4, sy), Math.max(1e-4, sz)); _o.updateMatrix();
  im.setMatrixAt(i, _o.matrix); if (col !== undefined) im.setColorAt(i, typeof col === 'string' ? _c.set(col) : col);
}
function fin(im, n) { im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }

/**
 * Build a lane set in `parent`. Everything is created once; draw() only rewrites instances.
 *   lanes     [{ z, color?, bed? }] lane centres along z (index = lane id used by blocks); color = header strip colour,
 *             bed = this lane's floor colour (else colors.bed).
 *   colors    REQUIRED palette from the topic: { bed, budget, over, tickMinor, tickMajor, playhead, stall, header?, wait? }
 *             (over = the one colour for "over budget / stalled").
 *   reg       material hook, e.g. m => mats.reg(2, m) so zoom-levels' dimLevel dims the lanes with their level.
 *   bed       { y, h, depth, x0, roughness, metalness, growLen, growDepth } — the lane floor (x0 = where it starts, ms units
 *             before xs); growLen / growDepth: laneK scales its length / depth.
 *   block     { h, depth, gap, minW, max, glow, growDepth } — h / depth in profiler units, gap = space between neighbours
 *             (number, or fn(widthUnits) → gap), minW = thinnest drawn block, max = instance capacity, glow = emissive k,
 *             growDepth: laneK scales depth too (else only height).
 *   nest      { h, inset } — nested scopes (block option dep: 1, 2 …) sit on top of the base block, `inset` thinner per level.
 *   wait      { max, opacity, period } — hatched blocks (block option wait: true); max 0 = none.
 *   sheet     { max, w, h, y, opacity, additive } — budget / frame-marker sheets standing across the lanes.
 *   ruler     { max, step, major, y, w, h, minorLen, majorLen, off } — ms ticks along the near edge (off = z beyond span[1]).
 *   playhead  { w, h, y, pad } · stall { h, y, opacity } — a band across all lanes (e.g. a stop-the-world pause).
 *   header    { x, w, y, h, strip } — optional track-header tiles left of x = 0 with a colour strip (null = none).
 * Returns { beds, headers, blocks, waits, sheets, ruler, playhead, stall, X, draw, top }.
 */
export function createLanes(parent, { lanes, colors, reg = m => m,
  bed = {}, block = {}, nest = {}, wait = {}, sheet = {}, ruler = {}, playhead = {}, stall = {}, header = null } = {}) {
  if (!colors) throw new Error('profiler-lanes: pass colors — the palette comes from the topic');
  const BD = { y: -.5, h: .5, depth: 17, x0: 0, roughness: .85, metalness: .15, growLen: false, growDepth: true, ...bed };
  const BK = { h: 5, depth: 14, gap: .3, minW: .05, max: 320, glow: .42, growDepth: true, ...block };
  const NS = { h: 2, inset: 1.2, ...nest };
  const WT = { max: 0, opacity: .55, period: 1 / .32, ...wait };
  const SH = { max: 16, w: .5, h: 13, y: -.5, opacity: .55, additive: true, ...sheet };
  const RU = { max: 80, step: 10, major: 50, y: -.45, w: .3, h: .3, minorLen: 1.6, majorLen: 3.6, off: 2.2, ...ruler };
  const PH = { w: .4, h: 15, y: -.5, pad: 6, ...playhead };
  const ST = { h: 14, y: -.5, opacity: .2, ...stall };
  const HD = header ? { x: -29, w: 26.4, y: -.45, h: .5, strip: .8, ...header } : null;

  const bedMat = c => reg(new THREE.MeshStandardMaterial({ color: c, roughness: BD.roughness, metalness: BD.metalness }));
  const bedM = bedMat(colors.bed);
  const beds = lanes.map(l => { const m = new THREE.Mesh(UNIT, l.bed ? bedMat(l.bed) : bedM); m.position.set(BD.x0, BD.y, l.z); parent.add(m); return m; });
  let headers = null;
  if (HD) {
    const hm = reg(new THREE.MeshStandardMaterial({ color: colors.header ?? colors.bed, roughness: .7, metalness: BD.metalness }));
    headers = lanes.map(l => {
      const tile = new THREE.Mesh(UNIT, hm); parent.add(tile);
      const strip = new THREE.Mesh(UNIT, reg(new THREE.MeshBasicMaterial({ color: l.color ?? colors.budget }))); parent.add(strip);
      return [tile, strip];
    });
  }
  const blocks = dyn(parent, UNIT, reg(glowMaterial(BK.glow)), BK.max);
  const waits = WT.max ? dyn(parent, UNIT, reg(hatchMaterial(colors.wait ?? colors.over, WT)), WT.max) : null;
  const sheets = dyn(parent, UNIT, reg(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: SH.opacity, depthWrite: false,
    blending: SH.additive ? THREE.AdditiveBlending : THREE.NormalBlending })), SH.max);
  const rulerI = dyn(parent, UNIT, reg(new THREE.MeshBasicMaterial({ color: '#ffffff' })), RU.max);
  const head = new THREE.Mesh(UNIT, reg(new THREE.MeshBasicMaterial({ color: colors.playhead }))); parent.add(head);
  const band = new THREE.Mesh(UNIT, reg(new THREE.MeshBasicMaterial({ color: colors.stall ?? colors.over, transparent: true, opacity: ST.opacity, depthWrite: false }))); parent.add(band);
  head.visible = band.visible = false;

  let xs = 1, xo = 0, laneZ = lanes.map(l => l.z);
  /** profiler x of a time in ms under the current time zoom: (ms + xo) × xs. */
  const X = ms => (ms + xo) * xs;
  const col = new THREE.Color();

  /**
   * Draw one frame. state:
   *   blocks   [[lane, startMs, lenMs, colour, label?, o?]] — o: { h, k (brightness 0..1), fold (height 0..1), dep (nesting),
   *            wait (hatched), y, depth (overrides) }. Labels are not drawn here (see top() for anchoring 2D labels).
   *   laneK    per-lane 0..1 (lanes grow in / out; 0 hides) · laneLen per-lane bed length in ms (× xs; starts at bed.x0)
 *   laneZ    per-lane z this frame (lanes can move: hide / reorder tracks per chapter)
   *   xs, xo   time zoom (profiler x = (ms + xo) × xs) · fade = height multiplier for every block
   *   now      playhead in ms (< 0 = none) · clip: blocks reveal up to `now` · lit / dim: blocks starting after `lit` ms
   *            are drawn at brightness `dim` (the playhead "lights" what has run)
   *   sheets   [[ms, over, k?]] budget lines (over → colors.over) or markers; k scales the sheet (0..1)
   *   span     [z0, z1] extent of sheets, playhead and stall band across the lanes · rulerTo: last ruler tick (ms)
   *   stall    [startMs, lenMs, zCentre, depth] band (shown once now passes its start, grows with now) · stallOpacity
   */
  function draw(S) {
    const K = S.laneK ?? lanes.map(() => 1), L = S.laneLen ?? lanes.map(() => 0);
    xs = S.xs ?? 1; xo = S.xo ?? 0; laneZ = S.laneZ ?? lanes.map(l => l.z);
    const fade = S.fade ?? 1, now = S.now ?? -1, lit = S.lit ?? 1e9, dim = S.dim ?? .3;
    beds.forEach((b, i) => {
      const k = K[i]; b.visible = k > .01;
      b.position.set(BD.x0, BD.y, laneZ[i]);
      b.scale.set(Math.max(.01, L[i] * xs * (BD.growLen ? k : 1)), BD.h, BD.depth * (BD.growDepth ? Math.max(.002, k) : 1));
    });
    if (headers) headers.forEach(([tile, strip], i) => {
      const k = K[i]; tile.visible = strip.visible = k > .01;
      tile.position.set(HD.x, HD.y, laneZ[i]); tile.scale.set(HD.w, HD.h * k, BD.depth);
      strip.position.set(HD.x, HD.y + .05, laneZ[i]); strip.scale.set(HD.strip, (HD.h + .1) * k, BD.depth);
    });
    let n = 0, nw = 0;
    for (const [li, x, len, c, , o = {}] of S.blocks ?? []) {
      const lk = K[li]; if (lk <= .01 || len <= .05) continue;
      const vis = S.clip ? clamp((now - x) / len) : 1; if (vis <= 0) continue;
      const wu = len * vis * xs, gap = typeof BK.gap === 'function' ? BK.gap(wu) : BK.gap;
      const dep = o.dep ?? 0;
      const y = o.y ?? (dep ? BK.h + (dep - 1) * NS.h : 0);
      const h = (o.h || (dep ? NS.h : BK.h)) * lk * fade * (o.fold ?? 1);
      const d = (o.depth ?? (BK.depth - dep * NS.inset)) * (BK.growDepth ? lk : 1);
      if (o.wait && waits) { put(waits, nw++, X(x) + gap / 2, y, laneZ[li], wu - gap, h, d, colors.wait ?? colors.over); continue; }
      col.set(c).multiplyScalar((x <= lit ? 1 : dim) * (o.k ?? 1));
      put(blocks, n++, X(x) + gap / 2, y, laneZ[li], Math.max(BK.minW, wu - gap), h, d, col);
      if (n >= BK.max) break;
    }
    fin(blocks, n); if (waits) fin(waits, nw);
    const span = S.span ?? [Math.min(...laneZ) - BD.depth / 2, Math.max(...laneZ) + BD.depth / 2];
    const mid = (span[0] + span[1]) / 2, wid = span[1] - span[0];
    n = 0;
    for (const [ms, over, k = 1] of S.sheets ?? []) { if (n >= SH.max) break; put(sheets, n++, X(ms) - SH.w / 2, SH.y, mid, SH.w, SH.h * k, wid * k, over ? colors.over : colors.budget); }
    fin(sheets, n);
    n = 0;
    const rl = S.rulerTo ?? Math.max(...L);
    if (S.ruler !== false) for (let ms = 0; ms <= rl + .1 && n < RU.max; ms += RU.step) { const mj = !(ms % RU.major); put(rulerI, n++, X(ms) - RU.w / 2, RU.y, span[1] + RU.off, RU.w, RU.h, mj ? RU.majorLen : RU.minorLen, mj ? colors.tickMajor : colors.tickMinor); }
    fin(rulerI, n);
    head.visible = now > 0 && now < rl;
    if (head.visible) { head.position.set(X(now) - PH.w / 2, PH.y, mid); head.scale.set(PH.w, PH.h, wid + PH.pad); }
    const s = S.stall;
    band.visible = !!s && now > s[0];
    if (band.visible) { band.position.set(X(s[0]), ST.y, s[2]); band.scale.set(Math.min(s[1], now - s[0]) * xs, ST.h, s[3]); band.material.opacity = (S.stallOpacity ?? ST.opacity) * fade; }
  }
  /** top-centre point of a block row [lane, start, len, …, o] in profiler units — anchor for a 2D label (pass through project()). */
  function top(b) {
    const [li, x, len, , , o = {}] = b, dep = o.dep ?? 0;
    return [X(x + len / 2), (o.y ?? (dep ? BK.h + (dep - 1) * NS.h : 0)) + (o.h || (dep ? NS.h : BK.h)), laneZ[li]];
  }
  return { beds, headers, blocks, waits, sheets, ruler: rulerI, playhead: head, stall: band, X, draw, top };
}

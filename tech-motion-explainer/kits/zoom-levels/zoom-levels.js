// ─────────────────────────────────────────────────────────────
//  zoom-levels — machinery for 분해해 들어가기 (open it up) pages in three.js.
//  Nested levels, each modelled in its own units and placed inside its parent at 1/10–1/1000 scale; every frame the
//  scene is re-rooted on the camera's level (matrices composed on the CPU in doubles), so a dive from metres to
//  microns has no precision jitter and needs no logarithmic depth buffer. Camera keys are (level, target, distance,
//  yaw, pitch, fov, view offset); dives fly at a constant rate in log(distance) through level changes.
//
//  MATERIALS AND MACHINERY ONLY. No scene, no palette, no layout: the page decides what exists at each level, where,
//  in which colours, and how the camera moves. Every function here is a pure function of its arguments (and of t),
//  so any frame can be rendered in any order.
//
//  Load: copy to <project>/assets/kits/zoom-levels.js; the page's importmap maps 'three' and 'three/addons/'.
//    import * as Z from '../assets/kits/zoom-levels.js';
//  Source: mmo-server-explained server-tick-inside-wide (lines 236–340, 543–601, 843–877, 1241–1256) and
//  ue-client-threads-inside-wide (its `blend` roots on the deeper level by unit — that fix is the one kept here).
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ── math / easing (the kit needs these; pages may import them or keep their own) ──
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
/** 0..1 progress of t through [s, s + d]. */
export const prog = (t, s, d) => clamp((t - s) / d);
export const eo = t => 1 - Math.pow(1 - t, 3);
export const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
/** smootherstep: zero velocity and acceleration at both ends (camera holds). */
export const ss = u => u * u * u * (u * (u * 6 - 15) + 10);
/** seeded PRNG (mulberry32); returns a () => [0, 1) generator. Use instead of Math.random. */
export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
/** one stable pseudo-random number per integer n. */
export const hash = n => rng(n * 7919 + 13)();
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
/** '#rrggbb' → 'rgba(r,g,b,a)' for the 2D overlay. */
export function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }

// ── renderer + composer ─────────────────────────────────────
/**
 * Offscreen WebGL renderer → EffectComposer (RenderPass, UnrealBloomPass, OutputPass), a perspective camera, a hemisphere
 * light and one directional "sun". Draw the result onto the page's 2D canvas with ctx.drawImage(stage.renderer.domElement, 0, 0).
 *   bg        required: the topic's background colour (scene background and fog colour).
 *   fog       [near, far] starting values (pages usually set them per frame from the camera distance, see fogByDistance).
 *   hemi      [sky colour, ground colour, intensity] · sun [colour, intensity] · lightDir [x, y, z] (normalised here).
 *   bloom     [strength, radius, threshold] — keep it on the accent only (threshold high, emissive accents).
 * Returns { W, H, renderer, scene, camera, hemi, sun, lightDir, composer, bloom, aniso, canvasTex }.
 */
export function createStage({ width = 1920, height = 1080, bg, fog = [10, 100], fov = 35, toneMapping = THREE.NeutralToneMapping,
  exposure = 1, hemi = ['#ffffff', '#202020', 1.5], sun = ['#ffffff', 2], lightDir = [-.45, 1, .6], bloom = [.5, .5, .8] } = {}) {
  if (!bg) throw new Error('zoom-levels createStage: pass bg — the background colour comes from the topic');
  const W = width, H = height;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = toneMapping;
  renderer.toneMappingExposure = exposure;
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  scene.fog = new THREE.Fog(bg, fog[0], fog[1]);
  const camera = new THREE.PerspectiveCamera(fov, W / H, .1, 1000);
  scene.add(camera);
  const hemiL = new THREE.HemisphereLight(hemi[0], hemi[1], hemi[2]);
  scene.add(hemiL);
  const sunL = new THREE.DirectionalLight(sun[0], sun[1]);
  scene.add(sunL, sunL.target);
  const LDIR = V3(...lightDir).normalize();
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloomP = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), bloom[0], bloom[1], bloom[2]);
  composer.addPass(bloomP);
  composer.addPass(new OutputPass());
  return { W, H, renderer, scene, camera, hemi: hemiL, sun: sunL, lightDir: LDIR, composer, bloom: bloomP, aniso,
    canvasTex: (w, h, draw, o = {}) => canvasTex(w, h, draw, { aniso, ...o }) };
}

// ── builders ─────────────────────────────────────────────────
/**
 * Procedural texture: draw(g, w, h) paints a w×h 2D canvas. rep = [u, v] repeats (RepeatWrapping), srgb for colour maps
 * (false for data maps), aniso = anisotropy (stage.canvasTex fills it in). Deterministic if draw uses rng(seed).
 */
export function canvasTex(w, h, draw, { rep = [1, 1], srgb = true, aniso = 1 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const tx = new THREE.CanvasTexture(c);
  if (srgb) tx.colorSpace = THREE.SRGBColorSpace;
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(rep[0], rep[1]); tx.anisotropy = aniso;
  return tx;
}
/** BoxGeometry w×h×d (centred) with a vertical vertex-colour gradient = cheap ambient occlusion: bottom lo, top 1. Use with vertexColors materials. */
export function boxAO(w, h, d, lo = .5) {
  const g = new THREE.BoxGeometry(w, h, d); const pos = g.attributes.position; const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const k = lo + (1 - lo) * Math.pow(clamp((pos.getY(i) + h / 2) / h), .7); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
/** add a Mesh(geo, mat) to parent at (x, y, z); returns it. */
export function mesh(parent, geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; }
/** a boxAO(w, h, d, lo) mesh centred at (x, y, z). */
export function box(parent, w, h, d, x, y, z, mat, lo = .6) { return mesh(parent, boxAO(w, h, d, lo), mat, x, y, z); }
const _o = new THREE.Object3D(), _c = new THREE.Color();
/**
 * Static InstancedMesh: list rows are [x, y, z, sx?, sy?, sz?, rx?, ry?, rz?]; colors (optional) one CSS colour per row.
 * mat may be an array (per box face). frustumCulled off (instances spread wider than the base geometry's bounds).
 */
export function inst(parent, geo, mat, list, colors) {
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  list.forEach((it, i) => {
    _o.position.set(it[0], it[1], it[2]); _o.rotation.set(it[6] || 0, it[7] || 0, it[8] || 0);
    _o.scale.set(it[3] ?? 1, it[4] ?? 1, it[5] ?? 1); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix);
    if (colors) im.setColorAt(i, _c.set(colors[i]));
  });
  im.count = list.length; im.frustumCulled = false; parent.add(im); return im;
}
/** InstancedMesh with capacity n, rewritten every frame: setI(...) per instance, then done(im, count). */
export function dynInst(parent, geo, mat, n) {
  const im = new THREE.InstancedMesh(geo, mat, n);
  for (let i = 0; i < n; i++) { im.setMatrixAt(i, new THREE.Matrix4()); im.setColorAt(i, _c.set('#ffffff')); }
  im.count = 0; im.frustumCulled = false; parent.add(im); return im;
}
/** instance i of im: position, scale (clamped ≥ 1e-4), colour (CSS string or THREE.Color; undefined keeps it), yaw ry. */
export function setI(im, i, x, y, z, sx, sy, sz, col, ry = 0) {
  _o.position.set(x, y, z); _o.rotation.set(0, ry, 0); _o.scale.set(Math.max(1e-4, sx), Math.max(1e-4, sy), Math.max(1e-4, sz)); _o.updateMatrix();
  im.setMatrixAt(i, _o.matrix); if (col !== undefined) im.setColorAt(i, typeof col === 'string' ? _c.set(col) : col);
}
/** finish a dynInst frame: draw n instances. */
export function done(im, n) { im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
/** unit box with its origin at the min-x end, bottom face, centred in z: scale x = length, y = height (blocks, bars, beds). */
export const UNIT = (() => { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(.5, .5, 0); return g; })();
/** unit box centred on its origin. */
export const UNITC = new THREE.BoxGeometry(1, 1, 1);

/**
 * Materials registered per dim group (usually one group per level) so a whole level can be dimmed without touching its meshes.
 *   groups  number of groups · std = defaults for the standard materials ({ roughness, metalness }).
 * Returns:
 *   reg(g, m)            register material m in group g (remembers base colour / emissive / opacity); returns m.
 *   dimLevel(g, k)       k = 0..1 brightness for group g (perceptual: colours scale by k^2.2). Materials with
 *                        m.userData.fadeOp = true also fade their opacity. Cached: no work when k is unchanged.
 *   M(g, color, o)       MeshStandardMaterial with vertexColors (pair with boxAO geometry) · MP(g, color, o) without.
 *   glowMat(g, k, o)     lit material whose instance / vertex colour also glows (emissive += colour × k); white base,
 *                        colour comes from setColorAt. m.userData.emiK.value can be animated.
 *   basic(g, color, o)   MeshBasicMaterial (unlit lines, sheets, markers).
 *   edges(parent, geo, color, op, g)  outline (EdgesGeometry) whose opacity fades with its group.
 *   DIMK                 the current k per group.
 */
export function createMaterials({ groups = 4, std = { roughness: .62, metalness: .15 } } = {}) {
  const MATS = Array.from({ length: groups }, () => []), DIMK = Array(groups).fill(1);
  function reg(L, m) { m.userData.base = m.color.clone(); m.userData.op = m.opacity; if (m.emissive) m.userData.emi = m.emissive.clone(); MATS[L].push(m); return m; }
  function dimLevel(L, k) {
    if (Math.abs(k - DIMK[L]) < 1e-4) return; DIMK[L] = k; k = Math.pow(k, 2.2);      // colours are linear: dim perceptually
    for (const m of MATS[L]) { m.color.copy(m.userData.base).multiplyScalar(k); if (m.userData.emi) m.emissive.copy(m.userData.emi).multiplyScalar(k); if (m.userData.fadeOp) m.opacity = m.userData.op * k; }
  }
  const M = (L, color, o = {}) => reg(L, new THREE.MeshStandardMaterial({ color, ...std, vertexColors: true, ...o }));
  const MP = (L, color, o = {}) => reg(L, new THREE.MeshStandardMaterial({ color, ...std, ...o }));
  const glowMat = (L, k = .35, o = {}) => reg(L, glowMaterial(k, o));
  const basic = (L, color, o = {}) => reg(L, new THREE.MeshBasicMaterial({ color, ...o }));
  function edges(parent, geo, color, op = .8, L = 0) {
    const m = reg(L, new THREE.LineBasicMaterial({ color, transparent: true, opacity: op }));
    m.userData.fadeOp = true;
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo), m); parent.add(l); return l;
  }
  return { MATS, DIMK, reg, dimLevel, M, MP, glowMat, basic, edges };
}
/** unregistered glow material (see createMaterials.glowMat). */
export function glowMaterial(k = .35, o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .5, metalness: .05, ...o });
  m.userData.emiK = { value: k };
  m.onBeforeCompile = sh => { sh.uniforms.emiK = m.userData.emiK; sh.fragmentShader = 'uniform float emiK;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * emiK;'); };
  return m;
}

// ── nested levels ────────────────────────────────────────────
/** Matrix4 from position [x, y, z], uniform scale s and optional Euler rotation [rx, ry, rz]. */
export function compose(pos, s = 1, rot = null) {
  const q = rot ? new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)) : new THREE.Quaternion();
  return new THREE.Matrix4().compose(V3(...pos), q, V3(s, s, s));
}
/**
 * The level graph. Declare levels outer → inner:
 *   const L1 = Lv.level('proc', 1e-4, 0, t => Z.compose([x, y, z], .018));
 *   name · unit = metres per unit of this level (only ratios matter; used for log-distance and for choosing the root)
 *   parent = index of the parent level (-1 for the outermost) · local(t) = Matrix4 placing this level in its parent's units.
 * Each level gets a THREE.Group (L.g, matrixAutoUpdate off) — build that level's meshes into it in its own units.
 * Returns { LV, level, chain, rel, keyIn, blend, path, reroot, REL }.
 *   chain(L, t)      level L → outermost coordinates.   rel(a, b, t)  level b coords → level a coords (doubles on the CPU).
 *   reroot(R, t, { keep: [outer, inner] })  every frame: put level R at the origin; each group's matrix = rel(R, i, t).
 *                    keep hides levels more than `outer` steps shallower or `inner` steps deeper than R (index order);
 *                    default keeps all. Returns REL (also stored on .REL) for project() and for your own maths.
 */
export function createLevels(scene) {
  const LV = [];
  const api = { LV, REL: [] };
  api.level = (name, unit, parent, local) => { const g = new THREE.Group(); g.matrixAutoUpdate = false; scene.add(g); const L = { name, unit, parent, local, g }; LV.push(L); return L; };
  api.chain = (L, t) => { let m = LV[L].local(t).clone(), q = LV[L].parent; while (q >= 0) { m.premultiply(LV[q].local(t)); q = LV[q].parent; } return m; };
  api.rel = (a, b, t) => api.chain(a, t).invert().multiply(api.chain(b, t));
  /** camera key k (in its own level) expressed in level D's coordinates. */
  api.keyIn = (k, D, t) => {
    const Mx = api.rel(D, k.L, t);
    return { T: k.T.clone().applyMatrix4(Mx), dir: k.dir.clone().transformDirection(Mx), up: V3(0, 1, 0).transformDirection(Mx), d: k.d * Mx.getMaxScaleOnAxis(), fov: k.fov, ox: k.ox, oy: k.oy };
  };
  /**
   * Camera between keys a and b at u = 0..1, rooted on the deeper level (smaller unit). Distance interpolates in log space and
   * the target moves so the zoom point stays put on screen. Returns { R, T, dir, up, d, fov, ox, oy } in level R's units.
   */
  api.blend = (a, b, u, t) => {
    const D = LV[a.L].unit < LV[b.L].unit ? a.L : b.L, A = api.keyIn(a, D, t), B = api.keyIn(b, D, t);
    const d = Math.exp(lerp(Math.log(A.d), Math.log(B.d), u));
    const w = Math.abs(Math.log(A.d / B.d)) < .15 ? 1 - u : (d - B.d) / (A.d - B.d);
    return { R: D, T: B.T.clone().add(A.T.clone().sub(B.T).multiplyScalar(w)), dir: A.dir.clone().lerp(B.dir, u).normalize(),
      up: A.up.clone().lerp(B.up, u).normalize(), d, fov: lerp(A.fov, B.fov, u), ox: lerp(A.ox, B.ox, u), oy: lerp(A.oy, B.oy, u) };
  };
  /**
   * A camera path. keys = rows [t, level, [tx, ty, tz], distance, yaw, pitch, fov, ox?, oy?] (seconds, level units, radians,
   * degrees, px view offset); chains = [[tStart, tEnd], …] — stretches (start and end must be key times) flown at a constant
   * rate in log(distance), so a dive keeps its speed through the keys and level changes inside it. Elsewhere each pair of keys
   * eases with keyEase (smootherstep: holds at keys). Returns { K, CHAINS, camAt(t) }.
   */
  api.path = (keys, chains = [], { chainEase = eio, keyEase = ss } = {}) => {
    const K = cameraKeys(keys);
    const CHAINS = chains.map(([a, b]) => [K.findIndex(k => k.t === a), K.findIndex(k => k.t === b)]);
    CHAINS.forEach(([i0, i1], j) => { if (i0 < 0 || i1 < 0) throw new Error(`zoom-levels path: chain ${j} must start and end on key times`); });
    const logM = (k, t) => Math.log(k.d * LV[k.L].unit);
    function camAt(t) {
      for (const [i0, i1] of CHAINS) {
        if (t < K[i0].t || t >= K[i1].t) continue;
        const g = chainEase(prog(t, K[i0].t, K[i1].t - K[i0].t));
        const target = lerp(logM(K[i0], t), logM(K[i1], t), g);
        for (let i = i0; i < i1; i++) {
          const a = logM(K[i], t), b = logM(K[i + 1], t);
          if ((target - a) * (target - b) <= 0 || i === i1 - 1) return api.blend(K[i], K[i + 1], clamp((target - a) / (b - a || 1)), t);
        }
      }
      let i = 0; while (i < K.length - 2 && t >= K[i + 1].t) i++;
      return api.blend(K[i], K[i + 1], keyEase(prog(t, K[i].t, K[i + 1].t - K[i].t)), t);
    }
    return { K, CHAINS, camAt };
  };
  api.reroot = (R, t, { keep = null } = {}) => {
    const REL = LV.map((_, i) => api.rel(R, i, t));
    LV.forEach((L, i) => {
      const vis = !keep || (i >= R - keep[0] && i <= R + keep[1]);
      L.g.visible = vis; if (vis) { L.g.matrix.copy(REL[i]); L.g.matrixWorldNeedsUpdate = true; }
    });
    api.REL = REL;
    return REL;
  };
  return api;
}
/** key rows → key objects { t, L, T, d, fov, ox, oy, dir } (dir from yaw / pitch: yaw 0 looks down −z, pitch π/2 looks straight down). */
export function cameraKeys(rows) {
  return rows.map(([t, L, T, d, yaw, pitch, fov, ox = 0, oy = 0]) => ({ t, L, T: V3(...T), d, fov, ox, oy, dir: V3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)) }));
}
/**
 * Point the camera for one frame from a camAt() result c (in the root level's units). near / far are multiples of the
 * camera distance (they follow the zoom), W / H the canvas size for the view offset (c.ox, c.oy px shift the framing).
 */
export function applyCamera(camera, c, { W = 1920, H = 1080, near = .02, far = 60 } = {}) {
  camera.fov = c.fov; camera.near = c.d * near; camera.far = c.d * far;
  camera.setViewOffset(W, H, c.ox, c.oy, W, H);
  camera.position.copy(c.T).addScaledVector(c.dir, c.d); camera.up.copy(c.up); camera.lookAt(c.T); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
}
/** keep the sun at a fixed direction and k camera-distances from the target (light does not jump with scale). */
export function aimSun(sun, c, dir, k = 4) { sun.target.position.copy(c.T); sun.position.copy(c.T).addScaledVector(dir, c.d * k); }
/** fog band in multiples of the camera distance (fog thins and thickens with the zoom). */
export function fogByDistance(fog, d, near, far) { fog.near = d * near; fog.far = d * far; }

// ── 2D labels anchored in 3D ─────────────────────────────────
/**
 * Labels drawn on the 2D overlay at points of any level.
 *   ctx, camera, levels (createLevels result — its REL is read every call), W, H
 *   sans, mono   font-family strings · text, dim  title / sub-line colours (from the topic)
 *   shadow       text shadow colour for lab() · margin  NDC limit for ok (≥ 1: allow anchors a bit off screen)
 *   mapPoint(L, pt) → [L', pt']  optional hook (e.g. a time zoom on one level: [0, [X(pt[0]), pt[1], pt[2]]])
 *   tag          tooltip look: { size, subSize, padTitle, padSub, hOne, hSub, titleX, titleDY, subX, subDY, radius, fill, stroke,
 *                lead (leader alpha), dot (anchor radius), marker: 'bar' | 'square' | fn(ctx, bx, by, w, h, col), top, bottom, side }
 *   lab          defaults for lab(): { size, weight, mono }
 * Returns { project, tag, lab, txt, tw, font }:
 *   project(L, [x, y, z]) → { x, y, ok }  screen px of a point in level L's units (ok = in front of the camera and on screen).
 *   tag(L, pt, title, sub, col, a, { dx, dy, size, subSize, align, lead, mono })  tooltip box offset (dx, dy) px from the anchor,
 *       a colour marker, a leader line and dot; kept inside the safe area. a = alpha. Returns the projected anchor or null.
 *   lab(L, pt, s, col, a, { size, weight, mono, align, dx, dy })  plain shadowed text at the anchor.
 */
export function createLabels({ ctx, camera, levels, W = 1920, H = 1080, sans = 'sans-serif', mono = 'monospace', text = '#ffffff', dim = '#aaaaaa',
  shadow = 'rgba(0,0,0,.85)', margin = 1.15, mapPoint = null, tag: tagStyle = {}, lab: labStyle = {} } = {}) {
  const TS = { size: 28, subSize: 24, padTitle: 34, padSub: 34, hOne: 22, hSub: 30, titleX: 18, titleDY: 8, subX: 18, subDY: 18, radius: 6,
    fill: 'rgba(10,10,12,.86)', stroke: 'rgba(255,255,255,.25)', lead: .7, dot: 4.5, marker: 'bar', top: 196, bottom: 120, side: 24, ...tagStyle };
  const LS = { size: 22, weight: 700, mono: true, ...labStyle };
  const MARK = {
    bar: (c, bx, by, w, h, col) => { c.fillStyle = col; c.fillRect(bx, by + 6, 4, h - 12); },
    square: (c, bx, by, w, h, col) => { c.fillStyle = col; c.fillRect(bx + 14, by + 14, 14, 14); },
  };
  const _v = new THREE.Vector3();
  const font = (sz, wt = 500, m = false) => { ctx.font = `${wt} ${sz}px ${m ? mono : sans}`; };
  const tw = (s, size, weight = 500, m = false) => { font(size, weight, m); return ctx.measureText(s).width; };
  function txt(s, x, y, o = {}) {
    const { size = 28, weight = 500, color = text, align = 'left', mono: m = false, alpha = 1, base = 'alphabetic', shadow: sh = false } = o;
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha *= alpha; font(size, weight, m); ctx.letterSpacing = '0px';
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
    if (sh) { ctx.shadowColor = shadow; ctx.shadowBlur = 10; }
    ctx.fillText(s, x, y); ctx.restore();
  }
  function project(L, pt) {
    if (mapPoint) [L, pt] = mapPoint(L, pt);
    const R = levels.REL[L];
    if (!R) return { ok: false };
    _v.set(pt[0], pt[1], pt[2]).applyMatrix4(R).project(camera);
    return { x: (_v.x + 1) / 2 * W, y: (1 - _v.y) / 2 * H, ok: _v.z < 1 && _v.z > -1 && Math.abs(_v.x) < margin && Math.abs(_v.y) < margin };
  }
  function tag(L, pt, title, sub, col, a, o = {}) {
    if (a <= 0) return null; const q = project(L, pt); if (!q.ok) return null;
    const { dx = 0, dy = -80, size = TS.size, subSize = TS.subSize, align = 'center', lead = true, mono: m = false } = o;
    const w = Math.max(tw(title, size, 700, m) + TS.padTitle, sub ? tw(sub, subSize, 500) + TS.padSub : 0);
    const h = sub ? size + subSize + TS.hSub : size + TS.hOne;
    let bx = q.x + dx - (align === 'center' ? w / 2 : align === 'right' ? w : 0), by = q.y + dy - h / 2;
    bx = clamp(bx, TS.side, W - TS.side - w); by = clamp(by, TS.top, H - TS.bottom - h);
    ctx.save(); ctx.globalAlpha *= a;
    if (lead) {
      const ex = clamp(q.x, bx, bx + w), ey = q.y < by ? by : q.y > by + h ? by + h : by + h / 2;
      ctx.strokeStyle = rgba(col, TS.lead); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(q.x, q.y, TS.dot, 0, 7); ctx.fill();
    }
    ctx.beginPath(); ctx.roundRect(bx, by, w, h, TS.radius); ctx.fillStyle = TS.fill; ctx.fill(); ctx.strokeStyle = TS.stroke; ctx.lineWidth = 1; ctx.stroke();
    (typeof TS.marker === 'function' ? TS.marker : MARK[TS.marker])(ctx, bx, by, w, h, col);
    txt(title, bx + TS.titleX, by + size + TS.titleDY, { size, weight: 700, color: text, mono: m });
    if (sub) txt(sub, bx + TS.subX, by + size + subSize + TS.subDY, { size: subSize, color: dim });
    ctx.restore();
    return q;
  }
  function lab(L, pt, s, col, a, o = {}) {
    if (a <= 0) return null; const q = project(L, pt); if (!q.ok) return null;
    const { size = LS.size, weight = LS.weight, mono: m = LS.mono, align = 'left', dx = 0, dy = 0 } = o;
    txt(s, q.x + dx, q.y + dy, { size, weight, mono: m, color: col, align, alpha: a, shadow: true });
    return q;
  }
  return { project, tag, lab, txt, tw, font };
}

// colored-pencil-world · kit.js — what a world is made of, every piece in coloured pencil.
//
// Each maker takes the world and options and returns a thing for W.add(): { name, group, colliders, fronts, count,
// floor(x, z), update(t, W, camera) }. All of them are built from shape.js's soft pieces (nothing flat or sharp), each
// piece given its pencil (a colour) and the slant of its strokes; nothing loads a model or a picture. Colours are
// pencils: the colour a thing is in the light, which the drawing deepens toward the shade and crosses with the world's
// shadow pencil. Keep them clear and fairly light (a pencil's own colour), never grey or black.
//
//   sky · ranges · ground · paving · water · house · row · trees · props · fence · wall · deck · bunting · boats ·
//   birds · flecks · smoke · make (a thing of your own)
import { THREE, cl, lerp, sm, rng, noise, fbm, tone } from './world.js';
import { PENCIL, createBatch, field, fieldBy, hue } from './pencil.js';
import { ball, block, knead, put, roll, turned, arched, prism } from './shape.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2, D2R = Math.PI / 180;
const lin = (c) => new THREE.Color(c);
const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const pickOf = (r) => (list) => list[Math.floor(r() * list.length) % list.length];
/** a matrix that turns (degrees about the upright) and moves a piece built round its own origin */
const placer = (x, y, z, turn = 0) => { const m = new THREE.Matrix4().makeRotationY(turn * D2R).setPosition(x, y, z); return (g) => g.applyMatrix4(m); };
/** circles along a box, for the walker and the eye to keep out of */
function boxColliders(x, z, w, d, turn = 0, top = 1e9) {
  const out = [], r = Math.min(w, d) / 2, long = Math.max(w, d), n = Math.max(1, Math.round(long / (r * 1.4))), c = Math.cos(turn * D2R), s = Math.sin(turn * D2R);
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : (i / (n - 1) - 0.5) * (long - 2 * r), lx = w >= d ? u : 0, lz = w >= d ? 0 : u;
    out.push({ x: x + lx * c + lz * s, z: z - lx * s + lz * c, r: r * 1.02, top });
  }
  return out;
}
function batches(W) { const p = W.pencil; return { line: createBatch(p.line), both: createBatch(p.both), flat: createBatch(p.flat) }; }
function build(B, group = new THREE.Group()) { let n = 0; for (const b of Object.values(B)) if (b.count) { group.add(b.build()); n += b.vertices; } return { group, n }; }

// =============================================================================================================== sky
/** The sky: blue laid lightly all over and in long slanting strokes, clouds left as bare paper, violet grey under them,
 *  warm round the sun. o: { horizon, zenith, cloud (0..1 how much), cloudShade, warm, scale (cloud size), drift (m/s) } */
export function sky(W, o = {}) {
  const u = {
    uSun: { value: W.sunDir }, uTime: W.time, uHor: { value: lin(o.horizon || '#9fcdf2') }, uZen: { value: lin(o.zenith || '#6fa6ea') },
    uCloud: { value: o.cloud ?? 0.45 }, uCloudShade: { value: lin(o.cloudShade || '#c2c4ea') }, uGlow: { value: lin(o.warm || '#ffe9a8') },
    uScale: { value: o.scale ?? 1.2 }, uDrift: { value: o.drift ?? 0.005 },
  };
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: { ...W.pencil.u, ...u },
    vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w * 0.99999; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir; uniform vec3 uSun; uniform float uTime; uniform vec3 uHor; uniform vec3 uZen; uniform float uCloud; uniform vec3 uCloudShade; uniform vec3 uGlow; uniform float uScale; uniform float uDrift;
      ${PENCIL}
      float sh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float sn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(sh(i), sh(i + vec2(1, 0)), f.x), mix(sh(i + vec2(0, 1)), sh(i + vec2(1, 1)), f.x), f.y); }
      float sf(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * sn(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
      void main() {
        vec3 d = normalize(vDir);
        float e = asin(clamp(d.y, -1.0, 1.0)), up = smoothstep(0.0, 0.8, d.y);
        vec2 c = d.xz / (abs(d.y) + 0.3) * uScale + vec2(uTime * uDrift, 0.0);
        float th = mix(0.72, 0.42, uCloud), m = sf(c * vec2(0.7, 1.25) + 3.0), cloud = smoothstep(th, th + 0.1, m) * smoothstep(0.0, 0.09, d.y);
        vec3 blue = mix(uHor, uZen, up);
        float tooth = pcTooth(d * 11.0);
        vec3 left = vec3(1.0);
        left *= mix(vec3(1.0), blue, clamp((0.3 + 0.4 * up) * (1.0 - cloud) * (0.5 + 0.85 * tooth), 0.0, 1.0));
        left *= mix(vec3(1.0), blue, clamp(pcStrokes(e * 26.0 + d.x * 9.0 + d.z * 5.0, (0.4 + 0.4 * up) * (1.0 - cloud)) * (0.5 + 0.8 * tooth) * 0.85, 0.0, 1.0));
        left *= mix(vec3(1.0), uCloudShade, clamp(pcStrokes(e * 30.0 - d.x * 8.0, cloud * smoothstep(th + 0.1, th + 0.28, m) * 0.7) * (0.5 + 0.7 * tooth) * 0.7, 0.0, 1.0));
        left *= mix(vec3(1.0), uGlow, 0.3 * exp(-acos(clamp(dot(d, uSun), -1.0, 1.0)) * 2.6) * (0.6 + 0.6 * tooth));
        gl_FragColor = vec4(left, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1800, 48, 24), m); mesh.frustumCulled = false; mesh.renderOrder = -10;
  const group = new THREE.Group(); group.add(mesh);
  return { name: o.name || 'sky', sky: true, group, update(t, W, cam) { mesh.position.copy(cam.position); } };
}

// ============================================================================================================ ranges
/** Hills and mountains far off, in rows: each a band of land at `dist` metres, `height` high, slopes facing the sun drawn
 *  light and the others crossed with the shadow pencil; far rows paler. rows: [{ dist, height, colour, haze (0..1 toward
 *  the paper), from, to (bearings, °, 0 = -z), seed, jag (0 soft … 1 sharp), snow: colour, trees: colour (dark dots of
 *  forest on the lower slopes) }] */
export function ranges(W, o = {}) {
  const B = batches(W);
  for (const [ri, r] of (o.rows || []).entries()) {
    const from = (r.from ?? 0) * D2R, to = (r.to ?? 360) * D2R, n = Math.max(24, Math.round(((to - from) * r.dist) / (r.step || 14))), depth = r.depth ?? r.height * 3.5, rows = 6, seed = r.seed ?? ri * 7 + 3;
    const pos = [], idx = [], col = r.haze ? '#' + lin(r.colour).lerp(lin('#ffffff'), r.haze).getHexString() : r.colour;
    const ridge = (a) => { let h = 0, amp = 1, f = 1.6; for (let k = 0; k < 5; k++) { const nn = noise(a * f * 3 + seed, seed * 0.37); h += amp * (r.jag ? lerp(nn, 1 - Math.abs(nn * 2 - 1), r.jag) : nn); amp *= 0.5; f *= 2.1; } return h / 1.9; };
    for (let i = 0; i <= n; i++) {
      const a = lerp(from, to, i / n), top = r.height * (0.35 + 0.9 * ridge(a));
      for (let j = 0; j <= rows; j++) {
        const v = j / rows, rad = r.dist + depth * v, y = (r.base ?? 0) - 20 + (top + 20) * Math.pow(Math.sin(v * Math.PI * 0.5), 1.3) * (1 - 0.0 * v) + noise(a * 40 + j, seed) * r.height * 0.06 * (1 - v);
        pos.push(Math.sin(a) * rad, j === rows ? y : y, -Math.cos(a) * rad);
      }
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < rows; j++) { const a = i * (rows + 1) + j, b = a + rows + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const snow = r.snow && lin(r.snow), trees = r.trees && lin(r.trees), cc = lin(col), tmp = new THREE.Color();
    hue(g, (x, y, z) => { tmp.copy(cc); if (snow) tmp.lerp(snow, sm(r.height * 0.55, r.height * 0.75, y + noise(x * 0.05, z * 0.05) * r.height * 0.15)); if (trees) tmp.lerp(trees, sm(0.55, 0.7, noise(x * 0.06, z * 0.06, 0) * 0.5 + 0.5) * (1 - sm(r.height * 0.2, r.height * 0.45, y)) * 0.7); return tmp; });
    // strokes down the fall of the slopes, crossed level in the shade
    fieldBy(g, (x, y, z) => [y * 0.9 + Math.atan2(x, -z) * r.dist * 0.35, y * 0.6 - Math.atan2(x, -z) * r.dist * 0.5]);
    B.line.add(g);
  }
  const { group, n } = build(B);
  return { name: o.name || 'ranges', group, count: n, backdrop: true };
}

// ============================================================================================================ ground
/** The land itself: the World's height grid drawn as one piece. colour: a pencil, or fn(x, z, y, slope) → a pencil (fields,
 *  a worn path, a beach); a, b: the slant of its strokes (default: long strokes across the view, like a hand shading ground). */
export function ground(W, o = {}) {
  const res = W.landRes, ext = W.extent, H = W.heights, g = new THREE.PlaneGeometry(2 * ext, 2 * ext, res - 1, res - 1).rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  // PlaneGeometry rotated: rows run +z; set heights to the grid (same triangles as groundAt)
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), gi = Math.round(((x + ext) / (2 * ext)) * (res - 1)), gj = Math.round(((z + ext) / (2 * ext)) * (res - 1)); p.setY(i, H[gi + gj * res]); }
  // match groundAt's diagonal: each square split k → k+1+res
  const idx = []; for (let j = 0; j < res - 1; j++) for (let i = 0; i < res - 1; i++) { const k = i + j * res; idx.push(k, k + res, k + 1, k + 1, k + res, k + res + 1); }
  g.setIndex(idx); g.computeVertexNormals();
  const fn = typeof o.colour === 'function' ? o.colour : () => o.colour || '#8cc063', nrm = g.attributes.normal;
  hue(g, (x, y, z, i) => fn(x, z, y, 1 - nrm.getY(i)));
  if (o.field) fieldBy(g, o.field); else field(g, o.a || [0.2, 0.05, 1], o.b || [1, 0.05, -0.35]);
  const B = batches(W); B.line.add(g);
  const { group, n } = build(B);
  return { name: o.name || 'ground', group, count: n, backdrop: true };
}

// ============================================================================================================ paving
/** Flagstones or cobbles, each a slightly kneaded slab with its own pencil, laid in running bond. Where: rect [x0, z0,
 *  x1, z1] (turned by `turn`°) and/or inside(x, z) → bool, or way: { width, from, to } (along the walker's way).
 *  size: [along, across] m, gap, colours: [...], lift (m above the ground), y (a fixed level instead of the ground) */
export function paving(W, o = {}) {
  const B = batches(W), r = rng(o.seed || 31), pick = pickOf(r), cols = o.colours || ['#e9dfc8', '#ddd2bb', '#f1e8d4', '#d6c9ae'];
  const [sa, sc] = o.size || [0.8, 0.55], gap = o.gap ?? 0.05, th = o.thick ?? 0.09, lift = o.lift ?? 0.02;
  let n = 0;
  const stone = (x, z, ang, w, d) => {
    const y = o.y != null ? o.y : W.groundAt(x, z);
    const g = knead(block(Math.max(0.05, w - gap), th, Math.max(0.05, d - gap), Math.min(0.03, th * 0.4), 0.5), th * 0.12, 3, n + 7);
    g.rotateY(ang).translate(x, y + lift + th / 2 - 0.035, z);
    const c = pick(cols); B.line.add(g, c, [Math.cos(ang) * 0.3, 0.05, -Math.sin(ang) * 0.3 + 1], [1, 0.05, -0.4]); n++;
  };
  if (o.way) {
    const { width = 2.4, from = 0, to = W.wayLen } = o.way, across = Math.max(1, Math.round(width / sc));
    for (let s = from, row = 0; s < to; s += sa, row++) {
      const w = W.wayAt(s), ang = Math.atan2(w.hx, w.hz);
      for (let k = 0; k < across; k++) { const off = (k + 0.5) / across * width - width / 2 + (row % 2 ? sc * 0.25 : -sc * 0.25); stone(w.x - w.hz * off, w.z + w.hx * off, ang, sc, sa); }
    }
  } else {
    const [x0, z0, x1, z1] = o.rect || [-10, -10, 10, 10], t = (o.turn || 0) * D2R, c = Math.cos(t), s = Math.sin(t), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    for (let lz = z0, row = 0; lz < z1; lz += sc, row++) for (let lx = x0 - (row % 2) * sa * 0.5; lx < x1; lx += sa) {
      const ax = Math.max(lx, x0), bx = Math.min(lx + sa, x1); if (bx - ax < 0.12) continue;
      const mx = (ax + bx) / 2 - cx, mz = Math.min(lz + sc / 2, (lz + z1) / 2) - cz, x = cx + mx * c + mz * s, z = cz - mx * s + mz * c;
      if (o.inside && !o.inside(x, z)) continue;
      stone(x, z, t, bx - ax, Math.min(sc, z1 - lz));
    }
  }
  const { group, n: v } = build(B);
  return { name: o.name || 'paving', group, count: v, stones: n, backdrop: true };
}

// ============================================================================================================= water
/** Water at `level`: green-blue near, deeper far, drawn level in one direction with its darks a second pencil along the
 *  same strokes; where the sun catches the ripples the paper is left bare; the sun's shadows fall on it; and it mirrors
 *  every front the world's things declare (housefronts, boats), broken by the ripples. Land above the level hides it.
 *  o: { level, near, far, dark, glints (0..1), ripple (0..1), mirror (0..1) } */
export function water(W, o = {}) {
  const N = 40, level = o.level ?? 0;
  const mU = { uFA: { value: Array.from({ length: N }, () => new THREE.Vector4(0, 0, 0, 0)) }, uFB: { value: Array.from({ length: N }, () => new THREE.Vector4(0, 0, 0, 0)) }, uFC: { value: Array.from({ length: N }, () => new THREE.Color()) }, uFR: { value: Array.from({ length: N }, () => new THREE.Color()) }, uFN: { value: 0 } };
  const u = { uTime: W.time, uNear: { value: lin(o.near || '#3fb6b4') }, uFar: { value: lin(o.far || '#3f74c8') }, uDark: { value: lin(o.dark || '#25358f') }, uLevel: { value: level }, uGlint: { value: o.glints ?? 1 }, uRip: { value: o.ripple ?? 1 }, uMirror: { value: o.mirror ?? 0.82 }, ...mU };
  const m = new THREE.MeshLambertMaterial({ color: '#ffffff' });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, W.pencil.u, u);
    s.vertexShader = 'varying vec3 vW;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vW = position;');
    s.fragmentShader = `varying vec3 vW; uniform float uTime; uniform vec3 uNear; uniform vec3 uFar; uniform vec3 uDark; uniform float uLevel; uniform float uGlint; uniform float uRip; uniform float uMirror;
      uniform vec4 uFA[${N}]; uniform vec4 uFB[${N}]; uniform vec3 uFC[${N}]; uniform vec3 uFR[${N}]; uniform int uFN;\n${PENCIL}\n` + s.fragmentShader.replace('#include <opaque_fragment>', /* glsl */ `
      float lit = clamp(dot(outgoingLight, vec3(0.3333)) / 0.62, 0.0, 1.0);
      vec2 p = vW.xz; vec3 eye = cameraPosition;
      float far = length(p - eye.xz);
      float sw = 0.5 * sin(p.x * 0.35 + p.y * 0.12 + uTime * 0.5) + 0.28 * sin(p.x * 0.83 - uTime * 0.8 + p.y * 0.4) + 0.12 * sin(p.x * 2.1 + uTime * 1.2 + p.y * 1.3);
      vec2 runD = normalize(p - eye.xz + 1e-4);
      float h = dot(p, vec2(-runD.y, runD.x)) * 0.0 + p.y * 0.55 + p.x * 0.2 + sw * 0.3 * uRip;
      vec3 local = mix(uNear, uFar, smoothstep(8.0, 140.0, far));
      float ripple = smoothstep(-0.25, 0.25, sin(dot(p, vec2(0.3, 5.5)) + sw * 6.0 + uTime * 0.9) + 0.5 * sin(p.y * 13.0 - uTime * 1.6 + p.x));
      // the mirror: the line from the eye to the water, turned over, goes on to whatever front stands in its way
      vec3 r = normalize(vec3(p.x - eye.x, eye.y - uLevel, p.y - eye.z));
      float best = 1e9; vec3 seen = vec3(0.0); float hit = 0.0;
      for (int i = 0; i < ${N}; i++) {
        if (i >= uFN) break;
        vec2 A = uFA[i].xy, B = uFB[i].xy, e = B - A, w = A - p;
        float den = r.x * e.y - r.z * e.x; if (abs(den) < 1e-5) continue;
        float s = (w.x * e.y - w.y * e.x) / den, k = (w.x * r.z - w.y * r.x) / den;
        float wob = (0.18 + 0.1 * s) * sin(p.y * 3.3 + sw * 4.0 + uTime * 1.1) * uRip;
        float Y = uLevel + r.y * s + 0.25 * sin(p.x * 2.1 + uTime * 0.7) * uRip;
        if (s > 0.0 && s < best && k > -0.02 + wob * 0.05 && k < 1.02 && Y > uFA[i].z && Y < uFB[i].w) {
          best = s; hit = 1.0; seen = Y < uFA[i].w ? uFC[i] : uFR[i];
        }
      }
      local = mix(local, seen, hit * ripple * uMirror);
      float D = clamp(0.4 + 0.22 * sin(p.y * 0.8 + sw * 2.2 + uTime * 0.3) + 0.2 * (1.0 - smoothstep(2.0, 40.0, far)) + 0.45 * (1.0 - lit), 0.0, 1.0);
      float bare = uGlint * smoothstep(0.6, 0.78, pcNoise(vec3(p * vec2(0.45, 2.0) + vec2(uTime * 0.2, 0.0), uTime * 0.25))) * (1.0 - 0.6 * smoothstep(60.0, 300.0, far)) * lit;
      float tooth = pcTooth(vec3(p.x, 0.0, p.y) * 0.6);
      vec3 left = vec3(1.0);
      left *= mix(vec3(1.0), local, clamp((0.4 + 0.35 * D) * (0.5 + 0.85 * tooth) * (1.0 - 0.85 * bare), 0.0, 1.0));
      left *= mix(vec3(1.0), local, clamp(pcStrokes(h, 0.5 + 0.35 * D) * (0.6 + 0.7 * tooth) * (1.0 - 0.9 * bare), 0.0, 1.0));
      left *= mix(vec3(1.0), uDark, clamp(pcStrokes(h + 0.37 + 0.2 * sin(p.x * 0.6), clamp((D - 0.42) * 1.5, 0.0, 0.7)) * (0.5 + 0.7 * tooth) * 0.85, 0.0, 1.0));
      gl_FragColor = vec4(left, 1.0);`);
  };
  m.customProgramCacheKey = () => 'pencil-water';
  const ext = W.extent * 1.2, g = new THREE.PlaneGeometry(2 * ext, 2 * ext, 1, 1).rotateX(-Math.PI / 2).translate(0, level, 0);
  const sea = new THREE.Mesh(g, m); sea.receiveShadow = true;
  if (o.open) { const far = new THREE.Mesh(new THREE.CircleGeometry(1700, 64).rotateX(-Math.PI / 2).translate(0, level - 0.01, 0), m); far.receiveShadow = true; far.renderOrder = -5; sea.add(far); }
  const group = new THREE.Group(); group.add(sea);
  let filled = false;
  return {
    name: o.name || 'water', group, waterLevel: level, backdrop: true,
    update(t, W) {
      if (filled) return; filled = true;
      const fr = W.fronts.slice(0, N);
      fr.forEach((f, i) => { mU.uFA.value[i].set(f.a[0], f.a[1], f.y0, f.y1); mU.uFB.value[i].set(f.b[0], f.b[1], 0, f.y1 + (f.roofH || 0)); mU.uFC.value[i].set(f.colour); mU.uFR.value[i].set(f.roof || f.colour); });
      mU.uFN.value = fr.length;
    },
  };
}

// ============================================================================================================= house
/** One house, built the way a house there is: walls, a moulding, a roof of tile rows (or slates, or flat with a parapet),
 *  a chimney with pots and smoke, windows with sills and shutters, a door (arched, a fanlight), a shop window under a
 *  striped awning, a hanging sign, a balcony with an iron rail, a drainpipe, a vine, pots on the step, a clock.
 *  o: { at: [x, z], turn (° — the front faces +z at 0, +x at 90), w, d, storeys, storey (m), wall, trim, base (a darker band),
 *    roof: { kind: 'gable' (ridge front-to-back) | 'eaves' (ridge along the front) | 'hip' | 'flat', pitch (rise/half-span),
 *      colours: [...], chimney: true | -1..1 (where across), smoke: true }, windows: { cols, shutters, arched, glass, boxes (0..1 flower boxes), blooms: [...] },
 *    door: { colour, arched, at (-1..1 across), fan }, shop: { awning, stripes, sign }, sign: { board, icon }, balcony: storey index,
 *    vine: { leaves, flowers }, pipe, pots: n, clock: true (on the top storey), name } — every option has a plain default. */
export function house(W, o = {}) {
  const B = batches(W), r = rng(o.seed || Math.round((o.at?.[0] || 0) * 13 + (o.at?.[1] || 0) * 7 + 101)), pick = pickOf(r);
  const [x, z] = o.at || [0, 0], turn = o.turn || 0, w = o.w || 4, d = o.d || 4, ns = o.storeys || 2, sh = o.storey || 2.7;
  const wall = o.wall || '#f3e9d6', trim = o.trim || '#f8f4ea', h = ns * sh + 0.4, cornerY = Math.min(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => W.groundAt(x + (a * w) / 2, z + (b * d) / 2)));
  const y0 = o.y ?? Math.min(W.groundAt(x, z), cornerY) - 0.02, P = placer(x, y0, z, turn), F = d / 2;
  const L = (g, colour, a, b, batch = B.line) => { if (colour && typeof colour === 'function') hue(g, colour); batch.add(P(g), typeof colour === 'function' ? undefined : colour, a, b); };
  let seed = 1; const next = () => seed++ * 17 + (o.seed || 3);
  // walls (they go down into the ground a little, so a slope never shows a gap), a darker foot, a moulding under the roof
  L(knead(block(w, h + 0.6, d, 0.06, 0.45), 0.018, 0.9, next()).translate(0, (h + 0.6) / 2 - 0.6, 0), wall);
  L(block(w + 0.04, 0.5, d + 0.04, 0.03, 0.4).translate(0, 0.0, 0), o.base || tone(wall, 0.84));
  L(block(w + 0.16, 0.14, d + 0.16, 0.04, 0.4).translate(0, h - 0.07, 0), trim);
  if (ns > 1 && o.band !== false) L(block(w + 0.06, 0.09, 0.08, 0.03, 0.5).translate(0, sh + 0.25, F + 0.02), trim);
  // the roof
  const rf = o.roof || {}, kind = rf.kind || 'gable', tiles = rf.colours || ['#c9663f', '#b5533c', '#d67a4a', '#bf5c3a'], ov = rf.overhang ?? 0.22;
  let roofTop = h;
  if (kind === 'flat') {
    for (const [px, pz, pw, pd] of [[0, F, w + 0.1, 0.18], [0, -F, w + 0.1, 0.18], [w / 2, 0, 0.18, d], [-w / 2, 0, 0.18, d]]) L(block(pw, 0.5, pd, 0.04, 0.4).translate(px, h + 0.2, pz), trim);
    roofTop = h + 0.45;
  } else if (kind === 'hip') {
    const rh = rf.height ?? Math.min(w, d) * (rf.pitch ?? 0.55), g = new THREE.ConeGeometry(Math.SQRT1_2 * 1.0, 1, 4, 6, true).rotateY(Math.PI / 4).toNonIndexed();
    g.scale(w + 2 * ov, rh, d + 2 * ov).translate(0, h + rh / 2 - 0.04, 0); g.computeVertexNormals();
    const tones = tiles.map(lin);
    L(g, (px, py) => tones[Math.floor(hash(Math.floor((py - h) / 0.3) * 3.7) * tones.length)], [0, 1, 0.05], [0.7, 0.4, 0.6]);
    roofTop = h + rh;
  } else {
    const gable = kind === 'gable', span = gable ? w : d, len = gable ? d : w, rh = rf.height ?? (span / 2) * (rf.pitch ?? (gable ? 0.88 : 0.75));
    // what the tiles lie on; its ends are the wall going up into the gable
    const g = block(w + 0.06, rh, d + 0.06, 0.04, 0.28), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 1 - 0.96 * (p.getY(i) / rh + 0.5); if (gable) p.setX(i, p.getX(i) * k); else p.setZ(i, p.getZ(i) * k); }
    g.computeVertexNormals(); g.translate(0, h + rh / 2 - 0.06, 0);
    const wc = lin(wall), dk = lin(tone(tiles[0], 0.8));
    L(g, (px, py, pz, i, nx, ny, nz) => (Math.abs(gable ? nz : nx) > 0.6 ? wc : dk));
    const H = span / 2 + ov, Lr = Math.hypot(H, rh), a = Math.atan2(rh, H), rows = Math.max(3, Math.round(Lr / 0.36)), rw = Lr / rows, tones = tiles.map(lin), ll = len + 2 * ov * 0.8;
    for (const s of [-1, 1]) for (let i = 0; i < rows; i++) {
      const t = (i + 0.5) / rows, off = s * H * (1 - t), lift = 0.05;
      const slab = knead(gable ? block(rw + 0.1, 0.07, ll, 0.03, 0.3) : block(ll, 0.07, rw + 0.1, 0.03, 0.3), 0.006, 4, next());
      if (gable) slab.rotateZ(-s * (a - 0.06)); else slab.rotateX(s * (a - 0.06));
      slab.translate(gable ? off + (s * rh / Lr) * lift : 0, h + rh * t + (H / Lr) * lift - 0.05, gable ? 0 : off + (s * rh / Lr) * lift);
      const ii = i;
      hue(slab, (px, py, pz) => tones[Math.floor(hash(Math.floor((gable ? pz : px) / 0.3) * 7.3 + ii * 3.1 + s) * tones.length)]);
      L(slab, null, gable ? [0, 0.05, 1] : [1, 0.05, 0], gable ? [1, 0.6, 0.3] : [0.3, 0.6, 1]);
    }
    const e = ll / 2;
    L(roll(gable ? [V(0, h + rh + 0.02, -e), V(0, h + rh + 0.02, e)] : [V(-e, h + rh + 0.02, 0), V(e, h + rh + 0.02, 0)], 0.1, { around: 8, every: 0.3 }), tone(tiles[0], 0.9), gable ? [0, 0, 1] : [1, 0, 0]);
    roofTop = h + rh;
  }
  // a chimney with its pots, and smoke from it
  let smokeAt = null;
  if (rf.chimney !== false && kind !== 'flat') {
    const cxp = (typeof rf.chimney === 'number' ? rf.chimney : r() > 0.5 ? 0.55 : -0.55) * (w / 2 - 0.4), czp = -d * 0.18, top = roofTop + 0.5;
    L(knead(block(0.55, top - h + 0.3, 0.5, 0.05, 0.3), 0.01, 2, next()).translate(cxp, h + (top - h + 0.3) / 2 - 0.3, czp), tone(wall, 0.92));
    L(block(0.68, 0.12, 0.62, 0.03, 0.3).translate(cxp, top, czp), trim);
    for (const k of [-0.12, 0.12]) L(turned([[0, 0], [0.09, 0], [0.08, 0.22], [0.1, 0.26], [0, 0.26]], 10).translate(cxp + k, top + 0.05, czp), '#c9714a', [0.2, 1, 0.1]);
    if (rf.smoke) smokeAt = new THREE.Vector3(cxp, top + 0.35, czp).applyAxisAngle(V(0, 1, 0), turn * D2R).add(V(x, y0, z));
  }
  // windows, a door, a shop
  const win = o.windows || {}, cols = win.cols ?? Math.max(1, Math.round((w - 0.6) / 1.5)), shut = win.shutters === undefined ? '#3f7f6a' : win.shutters, glass = win.glass || '#7f93b8';
  const door = o.door || {}, doorAt = (door.at ?? 0) * (w / 2 - 0.7), shop = o.shop;
  const window1 = (cx, cy, ww, wh, arch) => {
    L(arched(ww + 0.18, wh + 0.12, 0.08, arch).translate(cx, cy - 0.06, F + 0.03), trim);
    L(arched(ww, wh, 0.06, arch).translate(cx, cy, F + 0.06), glass, [0, 1, 0.02], [1, 0.3, 0]);
    L(block(0.05, wh * 0.92, 0.05, 0.02, 0.3).translate(cx, cy + wh * 0.46, F + 0.1), trim);
    L(block(ww, 0.05, 0.05, 0.02, 0.3).translate(cx, cy + wh * (arch ? 0.5 : 0.55), F + 0.1), trim);
    L(block(ww + 0.3, 0.07, 0.2, 0.03, 0.3).translate(cx, cy - 0.06, F + 0.1), trim);
    if (shut) for (const s of [-1, 1]) {
      const sg = block(ww * 0.52, wh, 0.05, 0.02, 0.2).translate(cx + s * (ww * 0.5 + ww * 0.27 + 0.08), cy + wh / 2, F + 0.06);
      L(sg, shut, [0, 1, 0.05], [1, 0.6, 0]);
    }
    if (win.boxes && r() < win.boxes) {
      L(block(ww + 0.1, 0.16, 0.2, 0.03, 0.3).translate(cx, cy + 0.04, F + 0.2), tone(shut || wall, 0.9));
      const bl = win.blooms || ['#e8554e', '#f08ab0', '#f2c12b', '#f3efe6'], gr = ['#5fa04a', '#74b356', '#4f8f44'];
      for (let k = 0; k < 6; k++) L(knead(ball(0.07 + 0.04 * r(), 2), 0.01, 9, next()).translate(cx + (k / 5 - 0.5) * ww, cy + 0.2 + 0.06 * r(), F + 0.22), k % 2 ? pick(bl) : pick(gr));
    }
  };
  for (let s = 0; s < ns; s++) {
    const cy = s * sh + (s === 0 ? 0.9 : 0.75), wh = s === 0 ? 1.3 : 1.35, ww = Math.min(0.8, (w - 0.8) / cols - 0.55);
    for (let c = 0; c < cols; c++) {
      const cx = cols === 1 ? 0 : (c / (cols - 1) - 0.5) * (w - 1.2);
      if (s === 0 && (Math.abs(cx - doorAt) < 0.9 || (shop && Math.abs(cx - doorAt) > 0.5))) continue;
      window1(cx, cy, ww, wh, win.arched && s === ns - 1);
    }
  }
  // the door
  const dc = door.colour || '#3f6f8a', dw = 0.95, dh = door.arched ? 2.25 : 2.05;
  L(arched(dw + 0.24, dh + 0.12, 0.1, !!door.arched).translate(doorAt, 0.12, F + 0.03), trim);
  L(arched(dw, dh, 0.08, !!door.arched).translate(doorAt, 0.15, F + 0.06), dc, [0, 1, 0.03], [1, 0.4, 0]);
  L(ball(0.04, 1).translate(doorAt + dw * 0.32, 1.1, F + 0.12), '#d9b13a');
  L(block(dw + 0.5, 0.15, 0.4, 0.04, 0.3).translate(doorAt, 0.07, F + 0.2), '#d6cbb4');
  if (shop) {
    const sx = doorAt + (doorAt <= 0 ? 1 : -1) * Math.min(1.5, w / 2 - 0.3) * 0.75, sw = Math.min(1.9, w - 2.0);
    if (sw > 0.6) {
      L(block(sw + 0.2, 1.65, 0.1, 0.03, 0.3).translate(sx, 1.42, F + 0.04), trim);
      L(block(sw, 1.45, 0.08, 0.02, 0.3).translate(sx, 1.42, F + 0.07), glass, [0, 1, 0.02], [1, 0.3, 0]);
      for (let k = 1; k < 3; k++) L(block(0.04, 1.45, 0.05, 0.02, 0.3).translate(sx + (k / 3 - 0.5) * sw, 1.42, F + 0.11), trim);
    }
    if (shop.awning) {
      const aw = w - 0.3, stripes = shop.stripes || '#f8f4ea', ac = lin(shop.awning), sc = lin(stripes), g = block(aw, 0.04, 1.1, 0.02, 0.18);
      g.rotateX(0.42).translate(0, 2.55, F + 0.55);
      hue(g, (px) => (Math.floor((px + aw / 2) / 0.32) % 2 ? sc : ac));
      L(g, null, [1, 0.1, 0], [0.2, 1, 0.4], B.both);
      const v = block(aw, 0.22, 0.03, 0.01, 0.18).translate(0, 2.2, F + 1.06); hue(v, (px) => (Math.floor((px + aw / 2) / 0.32) % 2 ? sc : ac)); L(v, null, [1, 0.1, 0], [0.2, 1, 0.4], B.both);
    }
  }
  // a hanging sign
  if (o.sign) {
    const sx = (doorAt <= 0 ? 1 : -1) * (w / 2 - 0.35);
    L(roll([V(sx, 2.75, F), V(sx, 2.75, F + 0.7)], 0.025, { around: 6 }), '#2f3a44');
    L(block(0.62, 0.48, 0.05, 0.03, 0.2).rotateY(Math.PI / 2).translate(sx, 2.35, F + 0.5), o.sign.board || '#f3e9d6');
    if (o.sign.icon) L(ball(0.13, 2).scale(0.5, 1, 1.2).translate(sx, 2.35, F + 0.5), o.sign.icon);
  }
  // a balcony with an iron rail
  if (o.balcony != null && o.balcony > 0 && o.balcony < ns) {
    const by = o.balcony * sh + 0.05, bw = Math.min(w - 0.4, 2.8), iron = o.iron || '#2f3a44';
    L(block(bw, 0.12, 0.7, 0.03, 0.3).translate(0, by, F + 0.35), trim);
    L(roll([V(-bw / 2, by + 0.95, F + 0.05), V(-bw / 2, by + 0.95, F + 0.68), V(bw / 2, by + 0.95, F + 0.68), V(bw / 2, by + 0.95, F + 0.05)], 0.025, { around: 6, every: 0.2 }), iron);
    for (let k = 0; k <= Math.round(bw / 0.14); k++) L(roll([V(-bw / 2 + k * 0.14, by + 0.06, F + 0.66), V(-bw / 2 + k * 0.14, by + 0.95, F + 0.66)], 0.012, { around: 4, every: 0.5 }), iron, [0, 1, 0]);
  }
  // a drainpipe; a vine up the wall; pots on the step
  if (o.pipe) { const px = (doorAt <= 0 ? -1 : 1) * (w / 2 - 0.12); L(roll([V(px, h - 0.1, F + 0.08), V(px, 0, F + 0.08)], 0.05, { around: 8, every: 0.5 }), tone(wall, 0.75), [0, 1, 0]); }
  if (o.vine) {
    const vx = (doorAt <= 0 ? -1 : 1) * (w / 2 - 0.5), leaves = o.vine.leaves || ['#5fa04a', '#74b356', '#4f8f44'], fl = o.vine.flowers || [];
    for (let k = 0; k < 3; k++) {
      const pts = []; for (let j = 0; j <= 8; j++) pts.push(V(vx + Math.sin(j * 0.9 + k * 2) * 0.35 + (k - 1) * 0.2, j * (h * 0.85) / 8, F + 0.06));
      L(roll(pts, 0.022, { around: 5, every: 0.3 }), o.vine.stem || '#8a6a4a', [0, 1, 0]);
      for (let j = 0; j < 70; j++) { const u = r() * 8, q = pts[Math.floor(u)].clone().lerp(pts[Math.min(8, Math.floor(u) + 1)], u % 1); L(knead(ball(0.09 + 0.07 * r(), 1).scale(1, 0.8, 0.5), 0.015, 6, next()).translate(q.x + (r() - 0.5) * 0.8, q.y + (r() - 0.5) * 0.4, F + 0.09 + 0.06 * r()), fl.length && r() < 0.4 ? pick(fl) : pick(leaves)); }
    }
  }
  for (let k = 0; k < (o.pots || 0); k++) {
    const px = doorAt + (k % 2 ? 1 : -1) * (0.85 + Math.floor(k / 2) * 0.55);
    L(turned([[0, 0], [0.15, 0], [0.21, 0.3], [0.235, 0.3], [0.235, 0.37], [0, 0.37]], 12).translate(px, 0.02, F + 0.35), '#c9714a', [0.2, 1, 0.1]);
    for (let j = 0; j < 7; j++) { const a = r() * TAU, rr = 0.15 * Math.sqrt(r()); L(knead(ball(0.09 + 0.05 * r(), 2), 0.012, 9, next()).translate(px + Math.cos(a) * rr, 0.45 + 0.2 * r(), F + 0.35 + Math.sin(a) * rr), j % 3 === 0 ? pick(['#e8554e', '#f08ab0', '#f2c12b', '#f3efe6']) : pick(['#5fa04a', '#74b356', '#4f8f44'])); }
  }
  if (o.clock) {
    const cy = h - sh * 0.45;
    L(turned([[0, 0], [0.62, 0], [0.62, 0.08], [0, 0.08]], 28).rotateX(Math.PI / 2).translate(0, cy, F + 0.1), '#f8f4ea', [1, 0.2, 0], [0, 1, 0.3]);
    L(roll([V(0, cy, F + 0.16), V(0.0, cy + 0.42, F + 0.16)], 0.025, { around: 4 }), '#2f3a44');
    L(roll([V(0, cy, F + 0.17), V(0.3, cy - 0.08, F + 0.17)], 0.03, { around: 4 }), '#2f3a44');
  }
  const { group, n } = build(B);
  const c = Math.cos(turn * D2R), s = Math.sin(turn * D2R), at = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const thing = { name: o.name || 'house', group, count: n, colliders: boxColliders(x, z, w + 0.2, d + 0.2, turn, y0 + roofTop + 1), fronts: [{ a: at(-w / 2, F + 0.05), b: at(w / 2, F + 0.05), y0: y0 - 0.5, y1: y0 + h, colour: wall, roof: kind === 'flat' ? trim : tiles[0], roofH: roofTop - h }], top: y0 + roofTop };
  if (smokeAt) { const sm2 = smoke(W, { at: [smokeAt.x, smokeAt.y, smokeAt.z], colour: rf.smokeColour }); group.add(sm2.group); thing.update = sm2.update; }
  return thing;
}

/** A row of houses side by side along a line: from [x, z] going `dir`° (0 = +x), each house's front facing `face`°
 *  (default: dir − 90, so the fronts look across the line). houses: [{ w, …house options }]; gap between them (m). */
export function row(W, o = {}) {
  const [x0, z0] = o.from || [0, 0], dir = (o.dir ?? 0) * D2R, gap = o.gap ?? 0, group = new THREE.Group(), out = { name: o.name || 'row', group, count: 0, colliders: [], fronts: [], houses: [] };
  const face = o.face ?? (o.dir ?? 0) - 90; let s = 0; const ups = [];
  for (const [i, h] of (o.houses || []).entries()) {
    const w = h.w || 4, d = h.d || o.d || 4, c = s + w / 2, back = (d / 2) * (o.inset ?? 1);
    const fx = Math.sin(face * D2R), fz = Math.cos(face * D2R);
    const at = [x0 + Math.cos(dir) * c - fx * back, z0 - Math.sin(dir) * c - fz * back];
    const th = house(W, { seed: (o.seed || 7) * 31 + i * 13, ...h, w, d, at, turn: face, name: `${out.name} ${i + 1}` });
    group.add(th.group); out.count += th.count; out.colliders.push(...th.colliders); out.fronts.push(...th.fronts); out.houses.push(th); if (th.update) ups.push(th.update);
    s += w + gap;
  }
  out.length = s - gap;
  if (ups.length) out.update = (t, W, c) => { for (const u of ups) u(t, W, c); };
  return out;
}

// ============================================================================================================= trees
/** Trees, each one of a kind drawn as a hand would: kinds 'round' (a crown of lumpy balls on a bent trunk), 'cypress'
 *  (a tall dark flame), 'poplar', 'pine' (an umbrella pine: flat crowns high on a leaning trunk), 'fir' (stacked cones),
 *  'bush', 'bare' (winter branches), 'fruit' (round, with fruit). list: [{ at: [x, z], kind, h, r, leaves: [...], trunk, fruit, seed }];
 *  or scatter: { n, inside(x, z), offWay (m), kinds: { round: 3, cypress: 1 }, h: [min, max], leaves, seed } */
export function trees(W, o = {}) {
  const B = batches(W), r = rng(o.seed || 41), pick = pickOf(r), colliders = [], list = [...(o.list || [])];
  const GREENS = o.leaves || ['#5fa04a', '#74b356', '#4f8f44', '#8cc063'];
  if (o.scatter) {
    const sc = o.scatter, kinds = Object.entries(sc.kinds || { round: 1 }), tot = kinds.reduce((a, [, v]) => a + v, 0), ext = W.extent * 0.9;
    for (let tries = 0, n = 0; n < (sc.n || 20) && tries < (sc.n || 20) * 40; tries++) {
      const x = (r() * 2 - 1) * ext, z = (r() * 2 - 1) * ext;
      if (sc.inside && !sc.inside(x, z)) continue;
      if (W.wayDist(x, z) < (sc.offWay ?? 3)) continue;
      if (list.some((t) => Math.hypot(t.at[0] - x, t.at[1] - z) < (sc.spacing ?? 2.5))) continue;
      let k = r() * tot, kind = kinds[0][0]; for (const [kk, v] of kinds) { if ((k -= v) <= 0) { kind = kk; break; } }
      const [h0, h1] = sc.h || [4, 7];
      list.push({ at: [x, z], kind, h: lerp(h0, h1, r()), leaves: sc.leaves }); n++;
    }
  }
  let seed = 5;
  for (const t of list) {
    const [x, z] = t.at, y = W.groundAt(x, z) - 0.05, h = t.h || 5, kind = t.kind || 'round', leaves = t.leaves || GREENS, trunk = t.trunk || '#8a6a4a', s = (t.seed ?? seed++) * 11;
    const lean = (r() - 0.5) * 0.3, la = r() * TAU;
    const trunkTo = (top, rad = 0.12 * Math.sqrt(h / 5)) => {
      const pts = [V(x, y, z), V(x + Math.cos(la) * lean * top * 0.3, y + top * 0.5, z + Math.sin(la) * lean * top * 0.3), V(x + Math.cos(la) * lean * top * 0.5, y + top, z + Math.sin(la) * lean * top * 0.5)];
      B.line.add(roll(pts, (u) => rad * (1.25 - 0.55 * u), { around: 8, every: 0.3 }), trunk, [0.15, 1, 0.1], [1, 0.3, 0.6]);
      return pts[2];
    };
    if (kind === 'cypress' || kind === 'poplar') {
      const rr = t.r || h * (kind === 'cypress' ? 0.14 : 0.17), prof = [[0, 0]]; for (let i = 1; i <= 10; i++) { const v = i / 10; prof.push([rr * Math.pow(Math.sin(Math.min(1, v * 1.15) * Math.PI), 0.8) * (v < 0.15 ? v / 0.15 : 1), v * h * 0.95]); } prof.push([0, h]);
      const g = knead(turned(prof, 14), rr * 0.25, 2.2, s, 4, rr * 0.8).translate(x, y + h * 0.05, z);
      B.line.add(g, leaves === GREENS ? (kind === 'cypress' ? '#3f7a45' : '#6aa64e') : pick(leaves), [0.1, 1, 0.15], [1, 0.4, 0.5]);
      colliders.push({ x, z, r: rr * 0.9 });
    } else if (kind === 'pine') {
      const top = trunkTo(h * 0.82, 0.13);
      for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + r(), rad = h * 0.18 * (1 - k * 0.15); B.line.add(knead(ball(1, 3).scale(rad, rad * 0.32, rad * 0.9), rad * 0.08, 2, s + k).translate(top.x + Math.cos(a) * rad * 0.5 * (k ? 1 : 0), top.y + k * 0.25 - 0.1, top.z + Math.sin(a) * rad * 0.5 * (k ? 1 : 0)), pick(leaves), [0.3, 0.1, 1], [1, 0.1, -0.4]); }
      colliders.push({ x, z, r: 0.3 });
    } else if (kind === 'fir') {
      const tr = trunkTo(h * 0.3, 0.12), rr = t.r || h * 0.28;
      for (let k = 0; k < 4; k++) { const v = k / 4, ch = h * 0.42; B.line.add(knead(turned([[0, 0], [rr * (1 - v * 0.6), 0], [rr * 0.3 * (1 - v * 0.6), ch * 0.6], [0, ch]], 12), rr * 0.06, 3, s + k).translate(x, y + h * 0.15 + v * h * 0.55, z), pick(leaves), [0.1, 1, 0.2], [1, 0.3, 0.4]); }
      colliders.push({ x, z, r: 0.35 });
    } else if (kind === 'bush') {
      const rr = t.r || h * 0.45;
      for (let k = 0; k < 6; k++) { const a = r() * TAU, d = rr * 0.5 * r(); B.line.add(knead(ball(rr * (0.5 + 0.3 * r()), 2), rr * 0.08, 3, s + k).scale(1, 0.85, 1).translate(x + Math.cos(a) * d, y + rr * 0.45 + r() * rr * 0.3, z + Math.sin(a) * d), pick(leaves), [Math.cos(a), 0.6, Math.sin(a)], [-Math.sin(a), 0.4, Math.cos(a)]); }
      colliders.push({ x, z, r: rr * 0.8 });
    } else if (kind === 'bare') {
      const top = trunkTo(h * 0.55, 0.14);
      const branch = (from, dir, len, rad, depth) => {
        const to = from.clone().addScaledVector(dir, len), mid = from.clone().lerp(to, 0.5).add(V((r() - 0.5) * len * 0.2, 0, (r() - 0.5) * len * 0.2));
        B.line.add(roll([from, mid, to], (u) => rad * (1 - 0.6 * u), { around: 5, every: 0.25 }), trunk, [0.15, 1, 0.1]);
        if (depth > 0) for (let k = 0; k < 2 + (depth > 1 ? 1 : 0); k++) { const nd = dir.clone().add(V((r() - 0.5) * 1.2, 0.4 + r() * 0.4, (r() - 0.5) * 1.2)).normalize(); branch(to, nd, len * 0.62, rad * 0.6, depth - 1); }
      };
      for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + r(); branch(top, V(Math.cos(a) * 0.7, 0.75, Math.sin(a) * 0.7).normalize(), h * 0.28, 0.07, 2); }
      colliders.push({ x, z, r: 0.3 });
    } else { // round / fruit
      const top = trunkTo(h * 0.55), rr = t.r || h * 0.32;
      const blobs = 6 + Math.floor(r() * 4);
      for (let k = 0; k < blobs; k++) {
        const a = (k / blobs) * TAU + r() * 0.6, up = k === 0 ? 1 : r() * 0.7, d = k === 0 ? 0 : rr * (0.45 + 0.25 * r());
        const c = V(top.x + Math.cos(a) * d, top.y + rr * 0.35 + up * rr * 0.55 - (1 - up) * rr * 0.15, top.z + Math.sin(a) * d);
        const rad = rr * (k === 0 ? 0.75 : 0.5 + 0.2 * r());
        B.line.add(knead(ball(rad, 3), rad * 0.1, 2.4 / rad, s + k, 2, rad * 0.6).translate(c.x, c.y, c.z), pick(leaves), [Math.cos(a) * 0.6, 1, Math.sin(a) * 0.6], [-Math.sin(a), 0.4, Math.cos(a)]);
        if (kind === 'fruit' || t.fruit) for (let j = 0; j < 4; j++) { const fa = r() * TAU, fe = (r() - 0.3) * 1.2; B.line.add(ball(0.07, 1).translate(c.x + Math.cos(fa) * Math.cos(fe) * rad, c.y + Math.sin(fe) * rad, c.z + Math.sin(fa) * Math.cos(fe) * rad), t.fruit || '#e8554e'); }
      }
      colliders.push({ x, z, r: 0.3 });
    }
  }
  const { group, n } = build(B);
  return { name: o.name || 'trees', group, count: n, colliders, list };
}

// ============================================================================================================= props
/** Small things a place is full of. list: [{ kind, at: [x, z], turn (°), colour, … }]. kinds: 'lamp' (post and lantern),
 *  'bench', 'barrel', 'crate', 'pot' (flowers), 'bollard', 'cafe' (table, two chairs, a parasol: colour, stripes),
 *  'stall' (a market stall: awning colour, produce colours), 'post' (a mooring post), 'hay' (a round bale), 'well',
 *  'sign' (a finger post: colour), 'cart' */
export function props(W, list = [], o = {}) {
  const B = batches(W), r = rng(o.seed || 77), pick = pickOf(r), colliders = [];
  const WOOD = ['#a8763f', '#96673c', '#b98a52'], IRON = '#2f3a44', GREENS = ['#5fa04a', '#74b356', '#4f8f44'], BLOOMS = ['#e8554e', '#f08ab0', '#f2c12b', '#f3efe6', '#b07ad6'];
  let seed = 9;
  for (const p of list) {
    const [x, z] = p.at, y = p.y ?? W.standAt(x, z), P = placer(x, y, z, p.turn || 0), L = (g, c, a, b, bt = B.line) => bt.add(P(g), c, a, b), k = p.kind;
    if (k === 'lamp') {
      const hgt = p.h || 3.2;
      L(turned([[0.14, 0], [0.12, 0.3], [0.06, 0.4], [0.05, hgt - 0.4], [0.07, hgt - 0.35], [0, hgt - 0.35]], 10), p.colour || IRON, [0, 1, 0]);
      L(turned([[0.05, 0], [0.18, 0.05], [0.2, 0.42], [0.25, 0.48], [0.05, 0.62], [0, 0.66]], 8).translate(0, hgt - 0.38, 0), p.colour || IRON, [0, 1, 0.2]);
      L(turned([[0, 0], [0.15, 0.03], [0.15, 0.36], [0, 0.38]], 8).translate(0, hgt - 0.33, 0), p.glass || '#fff3b0');
      colliders.push({ x, z, r: 0.2 });
    } else if (k === 'bench') {
      const c = p.colour || '#7aa3b8';
      for (let i = 0; i < 3; i++) L(block(1.6, 0.05, 0.12, 0.02, 0.3).translate(0, 0.45, (i - 1) * 0.14), c, [1, 0.05, 0]);
      for (let i = 0; i < 2; i++) L(block(1.6, 0.11, 0.04, 0.02, 0.3).translate(0, 0.65 + i * 0.16, -0.24).rotateX(-0.12), c, [1, 0.05, 0]);
      for (const sx of [-0.7, 0.7]) { L(block(0.06, 0.45, 0.4, 0.02, 0.2).translate(sx, 0.22, 0), IRON); L(block(0.06, 0.5, 0.06, 0.02, 0.2).translate(sx, 0.7, -0.26), IRON); }
      colliders.push({ x, z, r: 0.5 });
    } else if (k === 'barrel') {
      L(knead(turned([[0, 0], [0.28, 0], [0.33, 0.4], [0.28, 0.8], [0, 0.8]], 14), 0.01, 4, seed++), p.colour || pick(WOOD), [0, 1, 0.05], [1, 0.3, 0]);
      for (const hy of [0.12, 0.66]) L(turned([[0.305, 0], [0.315, 0.025], [0.305, 0.05]], 14).translate(0, hy, 0), IRON);
      colliders.push({ x, z, r: 0.35 });
    } else if (k === 'crate') {
      const s = p.size || 0.55; L(knead(block(s, s, s, 0.03, 0.2), 0.008, 3, seed++).translate(0, s / 2, 0), p.colour || pick(WOOD), [1, 0.05, 0], [0, 1, 0.2]);
      if (p.fill) for (let i = 0; i < 9; i++) L(ball(0.07, 1).translate((i % 3 - 1) * 0.15, s + 0.04, (Math.floor(i / 3) - 1) * 0.15), pick(p.fill));
      colliders.push({ x, z, r: s * 0.6 });
    } else if (k === 'pot') {
      const s = p.size || 1; L(turned([[0, 0], [0.15, 0], [0.21, 0.3], [0.235, 0.3], [0.235, 0.37], [0, 0.37]], 12).scale(s, s, s), p.colour || '#c9714a', [0.2, 1, 0.1]);
      for (let i = 0; i < 8; i++) { const a = r() * TAU, rr = 0.16 * Math.sqrt(r()) * s; L(knead(ball((0.09 + 0.05 * r()) * s, 2), 0.012 * s, 9, seed++).translate(Math.cos(a) * rr, (0.45 + 0.2 * r()) * s, Math.sin(a) * rr), i % 3 === 0 ? (p.bloom || pick(BLOOMS)) : pick(GREENS)); }
      colliders.push({ x, z, r: 0.25 * s });
    } else if (k === 'bollard' || k === 'post') {
      const tall = k === 'post' ? (p.h || 1.4) : 0.6, rad = k === 'post' ? 0.12 : 0.16;
      L(knead(turned(k === 'post' ? [[0, -1.5], [rad, -1.5], [rad, tall], [rad * 0.7, tall + 0.05], [0, tall + 0.06]] : [[0, 0], [rad, 0], [rad * 0.8, 0.3], [rad * 1.1, 0.48], [rad * 0.9, 0.58], [0, 0.6]], 10), 0.008, 5, seed++), p.colour || (k === 'post' ? '#8a5a34' : IRON), [0, 1, 0.1], [1, 0.3, 0]);
      colliders.push({ x, z, r: rad + 0.05 });
    } else if (k === 'cafe') {
      const c = p.colour || '#f3efe6', st = p.stripes || '#4f9bd8';
      L(turned([[0.3, 0.72], [0.3, 0.76], [0, 0.76]], 14), '#f8f4ea'); L(roll([V(0, 0, 0), V(0, 0.73, 0)], 0.03, { around: 5 }), IRON);
      for (const s of [-1, 1]) { L(block(0.4, 0.04, 0.4, 0.02, 0.2).translate(s * 0.55, 0.45, 0), p.chair || '#4f9bd8'); L(block(0.4, 0.4, 0.04, 0.02, 0.2).translate(s * 0.55, 0.68, s * 0.0 - 0.2).rotateY(0), p.chair || '#4f9bd8'); for (const [lx, lz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) L(roll([V(s * 0.55 + lx, 0, lz), V(s * 0.55 + lx, 0.45, lz)], 0.015, { around: 4 }), IRON); }
      L(roll([V(0, 0.76, 0), V(0, 2.3, 0)], 0.025, { around: 5 }), '#f8f4ea');
      const cone = new THREE.ConeGeometry(1.25, 0.45, 12, 2, true).toNonIndexed().translate(0, 2.35, 0), cc = lin(c), sc2 = lin(st);
      hue(cone, (px, py, pz) => (Math.floor(((Math.atan2(pz, px) + Math.PI) / TAU) * 12) % 2 ? sc2 : cc)); L(cone, null, [0, 1, 0.2], [1, 0.3, 0], B.both);
      colliders.push({ x, z, r: 0.9 });
    } else if (k === 'stall') {
      const c = p.colour || '#e8554e', st = p.stripes || '#f8f4ea', fill = p.fill || ['#e8554e', '#f2c12b', '#8cc063', '#f08a3c'];
      L(knead(block(2.2, 0.85, 0.9, 0.04, 0.3), 0.01, 2, seed++).translate(0, 0.42, 0), p.wood || '#b98a52', [1, 0.05, 0]);
      for (let i = 0; i < 4; i++) { L(block(0.48, 0.12, 0.7, 0.02, 0.2).translate(-0.78 + i * 0.52, 0.9, 0), '#d9b97a'); for (let j = 0; j < 8; j++) L(ball(0.075, 1).translate(-0.78 + i * 0.52 + (r() - 0.5) * 0.36, 1.0 + r() * 0.05, (r() - 0.5) * 0.55), fill[i % fill.length]); }
      for (const [lx, lz] of [[-1.05, -0.4], [1.05, -0.4], [-1.05, 0.4], [1.05, 0.4]]) L(roll([V(lx, 0, lz), V(lx, lz < 0 ? 2.35 : 2.05, lz)], 0.03, { around: 5 }), p.wood || '#8a5a34', [0, 1, 0]);
      const a = block(2.5, 0.04, 1.3, 0.02, 0.15).rotateX(0.24).translate(0, 2.2, 0), ac = lin(c), sc2 = lin(st);
      hue(a, (px) => (Math.floor((px + 1.25) / 0.31) % 2 ? sc2 : ac)); L(a, null, [1, 0.1, 0], [0.2, 1, 0.4], B.both);
      colliders.push(...boxColliders(x, z, 2.3, 1.0, p.turn || 0));
    } else if (k === 'hay') {
      L(knead(new THREE.CylinderGeometry(0.65, 0.65, 1.1, 18, 3).rotateZ(Math.PI / 2).translate(0, 0.65, 0), 0.03, 3, seed++), p.colour || '#e2c56a', [0, 0, 1], [0, 1, 0.3]);
      colliders.push({ x, z, r: 0.75 });
    } else if (k === 'well') {
      L(knead(turned([[0.75, 0], [0.75, 0.8], [0.6, 0.8], [0.6, 0.1], [0, 0.1]], 16), 0.02, 3, seed++), p.colour || '#d6cbb4', [0, 1, 0.1], [1, 0.3, 0]);
      for (const s of [-1, 1]) L(block(0.1, 1.5, 0.1, 0.02, 0.3).translate(s * 0.7, 1.4, 0), '#8a5a34', [0, 1, 0]);
      L(prism([[-0.95, 0], [0.95, 0], [0, 0.55]], 1.1).translate(0, 2.1, 0), p.roof || '#b5533c', [1, 0.6, 0], [0, 0.6, 1]);
      colliders.push({ x, z, r: 0.85 });
    } else if (k === 'sign') {
      L(roll([V(0, 0, 0), V(0, 2.1, 0)], 0.05, { around: 6 }), '#8a5a34', [0, 1, 0]);
      for (const [i, a] of [0.4, -0.5].entries()) L(prism([[0, -0.1], [0.75, -0.1], [0.9, 0], [0.75, 0.1], [0, 0.1]], 0.04).rotateY(a).translate(0, 1.85 - i * 0.3, 0), p.colour || '#f3e9d6', [1, 0.1, 0]);
      colliders.push({ x, z, r: 0.12 });
    } else if (k === 'cart') {
      L(knead(block(1.6, 0.35, 1.0, 0.04, 0.3), 0.01, 3, seed++).translate(0, 0.7, 0), p.colour || '#b98a52', [1, 0.05, 0]);
      for (const s of [-1, 1]) L(knead(new THREE.TorusGeometry(0.42, 0.05, 6, 16).translate(0, 0.45, s * 0.55), 0.005, 4, seed++), '#8a5a34');
      L(roll([V(0.8, 0.75, -0.3), V(1.9, 0.5, -0.3)], 0.035, { around: 5 }), '#8a5a34'); L(roll([V(0.8, 0.75, 0.3), V(1.9, 0.5, 0.3)], 0.035, { around: 5 }), '#8a5a34');
      if (p.fill) for (let i = 0; i < 16; i++) L(ball(0.12, 1).translate((r() - 0.5) * 1.2, 0.95, (r() - 0.5) * 0.7), pick(p.fill));
      colliders.push(...boxColliders(x, z, 1.7, 1.1, p.turn || 0));
    }
  }
  const { group, n } = build(B);
  return { name: o.name || 'props', group, count: n, colliders };
}

// ============================================================================================================ fences
/** A fence along points [[x, z], …]: kind 'picket' | 'rail' | 'rope' (posts and a rope); colour, h */
export function fence(W, o = {}) {
  const B = batches(W), pts = o.points || [], h = o.h || 1.0, kind = o.kind || 'picket', c = o.colour || '#f3efe6', colliders = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az), n = Math.max(1, Math.round(len / (kind === 'picket' ? 0.16 : 2)));
    for (let k = 0; k <= n; k++) {
      const x = lerp(ax, bx, k / n), z = lerp(az, bz, k / n), y = W.groundAt(x, z);
      if (kind === 'picket') B.line.add(prism([[-0.045, 0], [0.045, 0], [0.045, h - 0.08], [0, h], [-0.045, h - 0.08]], 0.025).rotateY(ang + Math.PI / 2).translate(x, y - 0.1, z), c, [0, 1, 0.05]);
      else B.line.add(knead(block(0.12, h + 0.2, 0.12, 0.03, 0.3), 0.01, 4, i * 31 + k).translate(x, y + h / 2 - 0.1, z), o.post || '#8a5a34', [0, 1, 0.1]);
      if (k < n && k % 3 === 0) colliders.push({ x, z, r: 0.12, top: y + h });
    }
    const rails = kind === 'picket' ? [0.25, h - 0.25] : kind === 'rail' ? [0.4, h * 0.85] : [h * 0.8];
    for (const ry of rails) {
      const line = []; for (let k = 0; k <= 8; k++) { const x = lerp(ax, bx, k / 8), z = lerp(az, bz, k / 8); line.push(V(x, W.groundAt(x, z) + ry - (kind === 'rope' ? Math.sin((k / 8) * Math.PI) * 0.18 : 0), z)); }
      B.line.add(roll(line, kind === 'rope' ? 0.025 : 0.035, { around: 5, every: 0.4 }), kind === 'rope' ? (o.rope || '#c9a978') : c, [1, 0.05, 0]);
    }
  }
  const { group, n } = build(B);
  return { name: o.name || 'fence', group, count: n, colliders };
}

/** A stone or rendered wall along points: h, w (thick), colour, coping (a top course), stones (draw stone courses),
 *  base (the level its foot stands at — a canal or quay wall going down into water; default: the ground). Water mirrors it. */
export function wall(W, o = {}) {
  const B = batches(W), pts = o.points || [], h = o.h || 1.2, th = o.w || 0.45, c = o.colour || '#e2d6bd', colliders = [], fronts = [], r = rng(o.seed || 13), cols = o.colours || [c, tone(c, 0.92), tone(c, 1.08)];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az) + Math.PI / 2, mx = (ax + bx) / 2, mz = (az + bz) / 2;
    const y = o.base ?? Math.min(W.groundAt(ax, az), W.groundAt(bx, bz), W.groundAt(mx, mz)) - 0.3;
    if (o.mirror !== false) fronts.push({ a: [ax, az], b: [bx, bz], y0: y - 1, y1: y + h + 0.37, colour: c, roof: o.coping || tone(c, 1.1), roofH: 0 });
    if (o.stones) {
      const sh2 = 0.32, rows = Math.ceil((h + 0.3) / sh2);
      for (let j = 0; j < rows; j++) for (let s = -(j % 2) * 0.35; s < len; s += 0.6 + r() * 0.2) {
        const sl = Math.min(0.55 + r() * 0.2, len - s); if (sl < 0.15) continue;
        B.line.add(knead(block(sl - 0.04, sh2 - 0.04, th, 0.06, 0.3), 0.025, 3, i * 97 + j * 13 + Math.round(s * 10)).translate(s + sl / 2 - len / 2, y + j * sh2 + sh2 / 2, 0).rotateY(ang).translate(mx, 0, mz), cols[Math.floor(r() * cols.length)]);
      }
    } else B.line.add(knead(block(len + th * 0.5, h + 0.3, th, 0.05, 0.45), 0.015, 1.5, i * 7).translate(0, y + (h + 0.3) / 2, 0).rotateY(ang).translate(mx, 0, mz), c);
    if (o.coping !== false) B.line.add(block(len + th * 0.6, 0.1, th + 0.1, 0.04, 0.4).translate(0, y + h + 0.32, 0).rotateY(ang).translate(mx, 0, mz), o.coping || tone(c, 1.1));
    const n = Math.max(1, Math.round(len / th)); for (let k = 0; k <= n; k++) colliders.push({ x: lerp(ax, bx, k / n), z: lerp(az, bz, k / n), r: th * 0.55, top: y + h + 0.4 });
  }
  const { group, n } = build(B);
  return { name: o.name || 'wall', group, count: n, colliders, fronts };
}

// ============================================================================================================== deck
/** A deck laid over ground or water: a pier, a boardwalk, a footbridge. from [x, z] → to [x, z], width, y (its level at
 *  the ends), arch (how much a bridge rises in the middle), planks colour(s), posts (true: piles under it), rail (true:
 *  a rail each side), stone (true: a stone arch bridge in place of planks). The walker stands on it (floor). */
export function deck(W, o = {}) {
  const B = batches(W), [ax, az] = o.from, [bx, bz] = o.to, width = o.width || 2.4, len = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az), hx = (bx - ax) / len, hz = (bz - az) / len;
  const y0 = o.y ?? Math.max(W.groundAt(ax, az), W.groundAt(bx, bz)), rise = o.arch || 0, yAt = (u) => y0 + rise * Math.sin(Math.PI * cl(u));
  const woods = o.planks ? [].concat(o.planks) : ['#a8763f', '#96673c', '#b98a52', '#8a5a34'], r = rng(o.seed || 23), colliders = [];
  if (o.stone) {
    const n = 18, c = o.colour || '#e2d6bd';
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n, um = (u0 + u1) / 2, x = ax + hx * len * um, z = az + hz * len * um, y = yAt(um), dy = yAt(u1) - yAt(u0);
      // (a piece is built across the bridge in x and along it in z; rotateY(ang) turns z onto the way across)
      const tilt = Math.atan2(dy, len / n);
      B.line.add(knead(block(width, 0.35, len / n + 0.05, 0.05, 0.4), 0.01, 3, i).rotateX(-tilt).rotateY(ang).translate(x, y - 0.17, z), c, [0.1, 0.1, 1]);
      for (const s of [-1, 1]) B.line.add(knead(block(0.28, 0.55, len / n + 0.06, 0.05, 0.3), 0.012, 3, i * 3 + s).rotateX(-tilt).rotateY(ang).translate(x + hz * s * (width / 2 - 0.1), y + 0.27, z - hx * s * (width / 2 - 0.1)), tone(c, 1.05), [0.1, 1, 0.3]);
    }
    // the arch beneath: an underside that comes down to the banks
    for (const s of [-1, 1]) {
      const pts = []; for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push([lerp(-len / 2, len / 2, u), yAt(u) - 0.35 - (1 - Math.sin(Math.PI * u)) * 0.0]); }
      const outline = [...pts.map(([px, py]) => [px, py]), [len / 2, y0 - 2.5], ...Array.from({ length: 13 }, (_, k) => { const u = 1 - k / 12; return [lerp(-len / 2, len / 2, u), y0 - 2.5 + (rise + 1.6) * Math.pow(Math.sin(Math.PI * u), 0.6)]; })];
      B.line.add(prism(outline, 0.12).rotateY(ang - Math.PI / 2).translate((ax + bx) / 2 + hz * s * (width / 2 - 0.1), 0, (az + bz) / 2 - hx * s * (width / 2 - 0.1)), tone(o.colour || '#e2d6bd', 0.95));
    }
  } else {
    const n = Math.round(len / 0.24);
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, x = ax + hx * len * u, z = az + hz * len * u, y = yAt(u), tilt = Math.atan2(yAt(u + 0.5 / n) - yAt(u - 0.5 / n), len / n);
      B.line.add(knead(block(width * (0.97 + 0.06 * r()), 0.08, 0.22, 0.025, 0.4), 0.006, 3, i).rotateX(-tilt).rotateY(ang).translate(x, y - 0.04, z), woods[Math.floor(r() * woods.length)], [1, 0.05, 0.1], [0.3, 0.1, 1]);
    }
    if (o.posts !== false) for (let i = 0; i <= Math.round(len / 2.2); i++) {
      const u = i / Math.round(len / 2.2), x = ax + hx * len * u, z = az + hz * len * u;
      for (const s of [-1, 1]) { const px = x + hz * s * (width / 2 + 0.08), pz = z - hx * s * (width / 2 + 0.08), top = yAt(u) + (o.rail ? 0.05 : 0.45); B.line.add(knead(turned([[0, -4], [0.13, -4], [0.13, top - yAt(u) + 0], [0.1, top - yAt(u) + 0.05], [0, top - yAt(u) + 0.06]], 9), 0.01, 4, i * 5 + s).translate(px, yAt(u), pz), '#8a5a34', [0, 1, 0.1]); }
    }
    if (o.rail) for (const s of [-1, 1]) {
      const pts = []; for (let k = 0; k <= 16; k++) { const u = k / 16; pts.push(V(ax + hx * len * u + hz * s * (width / 2 + 0.05), yAt(u) + 0.95, az + hz * len * u - hx * s * (width / 2 + 0.05))); }
      B.line.add(roll(pts, 0.04, { around: 6, every: 0.3 }), o.railColour || '#8a5a34', [1, 0.05, 0]);
      for (let k = 0; k <= Math.round(len / 1.2); k++) { const u = k / Math.round(len / 1.2), p = V(ax + hx * len * u + hz * s * (width / 2 + 0.05), yAt(u), az + hz * len * u - hx * s * (width / 2 + 0.05)); B.line.add(roll([p, p.clone().add(V(0, 0.95, 0))], 0.035, { around: 5 }), o.railColour || '#8a5a34', [0, 1, 0]); }
    }
  }
  if (o.rail || o.stone) for (const s of [-1, 1]) for (let k = 0; k <= Math.round(len / 0.6); k++) { const u = k / Math.round(len / 0.6); if (o.stone && (u < 0.04 || u > 0.96)) continue; colliders.push({ x: ax + hx * len * u + hz * s * (width / 2 + 0.3), z: az + hz * len * u - hx * s * (width / 2 + 0.3), r: 0.12, top: yAt(u) + 1 }); }
  const { group, n } = build(B);
  return {
    name: o.name || 'deck', group, count: n, colliders,
    floor(x, z) { const dx = x - ax, dz = z - az, along = dx * hx + dz * hz, side = Math.abs(-dx * hz + dz * hx); return along >= -0.05 && along <= len + 0.05 && side <= width / 2 ? yAt(along / len) : null; },
  };
}

// ============================================================================================================ bunting
/** Strings of little flags (or washing) between two points, fluttering in the wind. lines: [{ from: [x, y, z], to: [x, y, z],
 *  sag (m), colours, n }], kind: 'flags' | 'washing' */
export function bunting(W, o = {}) {
  const group = new THREE.Group(), B = batches(W), flags = [], lines = o.lines || [], washing = o.kind === 'washing';
  for (const [li, l] of lines.entries()) {
    const a = V(...l.from), b = V(...l.to), sag = l.sag ?? 0.6, n = l.n || Math.max(4, Math.round(a.distanceTo(b) / (washing ? 0.7 : 0.42))), cols = l.colours || ['#e8554e', '#f2c12b', '#4f9bd8', '#5fa04a', '#b07ad6', '#f3efe6'];
    const at = (u) => a.clone().lerp(b, u).add(V(0, -sag * 4 * u * (1 - u), 0));
    const pts = []; for (let k = 0; k <= 16; k++) pts.push(at(k / 16));
    B.flat.add(roll(pts, 0.012, { around: 4, every: 0.3 }), l.string || '#6a6a6a');
    for (let k = 0; k < n; k++) { const u = (k + 0.5) / n; flags.push({ p: at(u), q: at(u + 0.4 / n), c: cols[(k + li) % cols.length], ph: k * 1.7 + li * 3.1, w: washing ? 0.35 + 0.25 * hash(k + li * 7) : 0.3, h: washing ? 0.45 + 0.3 * hash(k * 3 + li) : 0.34 }); }
  }
  const per = washing ? 6 : 3, pos = new Float32Array(flags.length * per * 3), col = new Float32Array(flags.length * per * 3), hat = new Float32Array(flags.length * per * 2), C = new THREE.Color();
  flags.forEach((f, i) => { C.set(f.c); for (let k = 0; k < per; k++) { col.set([C.r, C.g, C.b], (i * per + k) * 3); } });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('hatch', new THREE.BufferAttribute(hat, 2).setUsage(THREE.DynamicDrawUsage));
  const mesh = new THREE.Mesh(g, W.pencil.both); mesh.castShadow = true; mesh.frustumCulled = false; group.add(mesh);
  const { n } = build(B, group);
  const wind = W.wind, d = V(), sd = V(), out = V();
  const update = (t) => {
    flags.forEach((f, i) => {
      d.subVectors(f.q, f.p).normalize();
      const sway = 0.5 + 0.35 * Math.sin(t * 2.3 + f.ph) * wind.strength + 0.15 * Math.sin(t * 5.1 + f.ph * 2);
      sd.set(wind.x, 0, wind.z).addScaledVector(d, -d.dot(V(wind.x, 0, wind.z))); if (sd.lengthSq() < 1e-4) sd.set(-d.z, 0, d.x); sd.normalize();
      const hang = V(0, -1, 0).multiplyScalar(Math.cos(sway * 0.9)).addScaledVector(sd, Math.sin(sway * 0.9));
      const base = (i * per) * 3, hb = (i * per) * 2;
      const p0 = f.p.clone().addScaledVector(d, -f.w / 2), p1 = f.p.clone().addScaledVector(d, f.w / 2);
      if (washing) {
        const p2 = p1.clone().addScaledVector(hang, f.h), p3 = p0.clone().addScaledVector(hang, f.h);
        [p0, p1, p2, p0, p2, p3].forEach((p, k) => { pos.set([p.x, p.y, p.z], base + k * 3); });
        [[0, 0], [f.w, 0], [f.w, f.h], [0, 0], [f.w, f.h], [0, f.h]].forEach(([u, v], k) => hat.set([u * 3 + v * 0.4 + i, v * 3 - u + i], hb + k * 2));
      } else {
        const tip = f.p.clone().addScaledVector(hang, f.h);
        [p0, p1, tip].forEach((p, k) => pos.set([p.x, p.y, p.z], base + k * 3));
        [[0, 0], [f.w, 0], [f.w / 2, f.h]].forEach(([u, v], k) => hat.set([u * 3 + v + i, v * 3 - u + i], hb + k * 2));
      }
    });
    g.attributes.position.needsUpdate = true; g.attributes.hatch.needsUpdate = true; g.computeVertexNormals();
  };
  update(0);
  return { name: o.name || 'bunting', group, count: n + flags.length * per, update };
}

// ============================================================================================================== boats
/** Boats at their moorings, bobbing: list: [{ at: [x, z], turn, hull, trim, kind: 'row' | 'sail', len, sail }]. level: the water's. */
export function boats(W, o = {}) {
  const group = new THREE.Group(), list = o.list || [], level = o.level ?? 0, ships = [], fronts = []; let count = 0;
  for (const [i, b] of list.entries()) {
    const B = batches(W), len = b.len || 3.2, wid = len * 0.36, hull = b.hull || '#f3efe6', trimC = b.trim || '#e8554e';
    const g = new THREE.SphereGeometry(1, 20, 10, 0, TAU, Math.PI / 2, Math.PI / 2).toNonIndexed(); g.scale(wid / 2, len * 0.17, len / 2);
    const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const zz = p.getZ(k) / (len / 2); p.setX(k, p.getX(k) * (1 - 0.35 * Math.max(0, zz) ** 2)); } g.computeVertexNormals();
    const hc = lin(hull), tc = lin(trimC);
    hue(g, (x, y) => (y > -len * 0.04 ? tc : hc)); B.both.add(g, null, [0, 1, 0.05], [0.3, 0.6, 1]);
    const rim = []; for (let k = 0; k <= 24; k++) { const a = (k / 24) * TAU, zz = Math.cos(a); rim.push(V(Math.sin(a) * wid / 2 * (1 - 0.35 * Math.max(0, zz) ** 2), 0.02, zz * len / 2)); }
    B.line.add(roll(rim, 0.04, { around: 5, closed: true, every: 0.2 }), tone(trimC, 0.85));
    B.line.add(block(wid * 0.8, 0.05, 0.25, 0.02, 0.2).translate(0, -0.05, 0), '#b98a52');
    if (b.kind === 'sail') {
      const mh = len * 1.3;
      B.line.add(roll([V(0, -0.2, len * 0.12), V(0, mh, len * 0.12)], 0.035, { around: 5 }), '#8a5a34', [0, 1, 0]);
      B.both.add(prism([[0, 0.3], [0, mh * 0.95], [-len * 0.55, 0.35]], 0.02).rotateY(Math.PI / 2).translate(0, 0, len * 0.12), b.sail || '#f8f4ea', [0, 1, 0.3], [1, 0.2, 0]);
    }
    const { group: bg, n } = build(B); count += n; group.add(bg);
    const [x, z] = b.at, turn = (b.turn || 0) * D2R;
    ships.push({ g: bg, x, z, turn, ph: i * 1.9 + 0.5, len });
    fronts.push({ a: [x - Math.cos(turn) * len * 0.4, z + Math.sin(turn) * len * 0.4], b: [x + Math.cos(turn) * len * 0.4, z - Math.sin(turn) * len * 0.4], y0: level - 0.1, y1: level + 0.35, colour: hull, roof: b.kind === 'sail' ? (b.sail || '#f8f4ea') : trimC, roofH: b.kind === 'sail' ? len : 0.05 });
  }
  const update = (t) => { for (const s of ships) { s.g.position.set(s.x, level + 0.05 + 0.05 * Math.sin(t * 1.3 + s.ph), s.z); s.g.rotation.set(0.025 * Math.sin(t * 1.1 + s.ph), s.turn, 0.04 * Math.sin(t * 0.9 + s.ph * 2), 'YXZ'); } };
  update(0);
  return { name: o.name || 'boats', group, count, fronts, update, colliders: ships.map((s) => ({ x: s.x, z: s.z, r: s.len * 0.25 })) };
}

// ============================================================================================================== birds
/** Birds going round overhead (gulls, pigeons, swallows): n, centre [x, y, z], radius, colour, size, flap (Hz) */
export function birds(W, o = {}) {
  const group = new THREE.Group(), n = o.n || 6, [cx, cy, cz] = o.centre || [0, 14, 0], R = o.radius || 12, size = o.size || 0.5, list = [];
  for (let i = 0; i < n; i++) {
    const B = batches(W), c = o.colour || '#f8f4ea';
    B.line.add(knead(ball(1, 2).scale(size * 0.13, size * 0.11, size * 0.4), 0.004, 9, i), c, [0, 0, 1], [1, 0.3, 0]);
    const wingL = new THREE.Group(), wingR = new THREE.Group();
    const wing = (s) => { const g = block(size, 0.02, size * 0.28, 0.01, 0.1).translate(s * size / 2, 0, 0); const p = g.attributes.position; for (let k = 0; k < p.count; k++) p.setZ(k, p.getZ(k) - Math.abs(p.getX(k)) * 0.25); g.computeVertexNormals(); return g; };
    const Bw = batches(W); Bw.both.add(wing(1), o.wing || c, [1, 0, 0.2], [0.2, 0, 1]); wingL.add(Bw.both.build());
    const Bw2 = batches(W); Bw2.both.add(wing(-1), o.wing || c, [1, 0, 0.2], [0.2, 0, 1]); wingR.add(Bw2.both.build());
    const body = build(B).group; body.add(wingL, wingR); group.add(body);
    list.push({ body, wingL, wingR, r: R * (0.6 + 0.4 * hash(i + 1)), h: (hash(i * 3 + 2) - 0.5) * 4, sp: (0.18 + 0.12 * hash(i * 7)) * (i % 3 ? 1 : -1), ph: hash(i * 11) * TAU, f: (o.flap || 2.2) * (0.8 + 0.4 * hash(i * 5)) });
  }
  const update = (t) => { for (const b of list) { const a = b.ph + t * b.sp, x = cx + Math.cos(a) * b.r, z = cz + Math.sin(a) * b.r; b.body.position.set(x, cy + b.h + Math.sin(t * 0.7 + b.ph) * 0.8, z); b.body.rotation.set(0, -a + (b.sp > 0 ? Math.PI : 0), 0.25 * Math.sign(b.sp)); const fl = Math.sin(t * b.f * TAU) * 0.6 * (0.5 + 0.5 * Math.sin(t * 0.4 + b.ph) ** 2); b.wingL.rotation.z = fl; b.wingR.rotation.z = -fl; } };
  update(0);
  return { name: o.name || 'birds', group, count: n * 200, update };
}

// ============================================================================================================= flecks
/** Things falling and drifting through the air — leaves, petals, snow, blossom: n, centre [x, z], radius (m), top (m above
 *  the ground), colours, size, fall (m/s), sway (m), spin. Each is a small double-sided piece with its own pencil. */
export function flecks(W, o = {}) {
  const n = o.n || 120, [cx, cz] = o.centre || [0, 0], R = o.radius || 12, top = o.top ?? 7, size = o.size || 0.09, fall = o.fall ?? 0.7, sway = o.sway ?? 0.6, r = rng(o.seed || 61);
  const cols = (o.colours || ['#e8862e', '#f2c12b', '#d9533f', '#c9a03a']).map(lin);
  const g = block(size, size * 0.06, size * 0.62, size * 0.02, size).toNonIndexed(); const p = g.attributes.position; for (let k = 0; k < p.count; k++) p.setY(k, p.getY(k) + Math.abs(p.getX(k)) * 0.35); g.computeVertexNormals();
  for (const nm of Object.keys(g.attributes)) if (!['position', 'normal'].includes(nm)) g.deleteAttribute(nm);
  field(g, [1, 0, 0.3], [0.3, 0, 1]); hue(g, '#ffffff');
  const mesh = new THREE.InstancedMesh(g, W.pencil.both, n); mesh.castShadow = true; mesh.frustumCulled = false;
  const list = Array.from({ length: n }, (_, i) => { const a = r() * TAU, d = R * Math.sqrt(r()); mesh.setColorAt(i, cols[i % cols.length]); return { x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d, ph: r() * 100, sp: 0.6 + 0.8 * r(), spin: (r() - 0.5) * 6 * (o.spin ?? 1) }; });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = V(1, 1, 1), at = V(), wind = W.wind;
  const update = (t) => {
    list.forEach((f, i) => {
      const life = top / (fall * f.sp), u = ((t + f.ph) % life) / life, drift = (t + f.ph) % life;
      at.set(f.x + Math.sin(t * 1.3 * f.sp + f.ph) * sway + wind.x * drift * 0.4 * wind.strength, W.groundAt(f.x, f.z) + top * (1 - u) + 0.05, f.z + Math.cos(t * 1.1 * f.sp + f.ph) * sway + wind.z * drift * 0.4 * wind.strength);
      e.set(t * f.spin + f.ph, t * f.spin * 0.7, Math.sin(t * 2 + f.ph) * 0.8); q.setFromEuler(e); m.compose(at, q, one); mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  const group = new THREE.Group(); group.add(mesh);
  return { name: o.name || 'flecks', group, count: n * g.attributes.position.count, update };
}

// ============================================================================================================== smoke
/** Smoke curling up from a chimney as one pencil line: at [x, y, z], colour, height */
export function smoke(W, o = {}) {
  const group = new THREE.Group(), [x, y, z] = o.at, hgt = o.height || 3.5, mat = W.pencil.flat, c = lin(o.colour || '#b8b4c4');
  let mesh = null; const wind = W.wind;
  const update = (t) => {
    const pts = []; for (let k = 0; k <= 10; k++) { const u = k / 10; pts.push(V(x + wind.x * u * u * hgt * 0.7 * wind.strength + Math.sin(t * 1.1 + u * 7) * 0.15 * u, y + u * hgt, z + wind.z * u * u * hgt * 0.7 * wind.strength + Math.cos(t * 0.9 + u * 6) * 0.15 * u)); }
    const g = roll(pts, (u) => 0.02 + 0.08 * u, { around: 5, every: 0.35 }).toNonIndexed(); hue(g, c); field(g);
    if (mesh) { mesh.geometry.dispose(); mesh.geometry = g; } else { mesh = new THREE.Mesh(g, mat); mesh.renderOrder = 10; mesh.frustumCulled = false; group.add(mesh); }
  };
  update(0);
  return { name: o.name || 'smoke', group, count: 400, update };
}

// =============================================================================================================== make
/** A thing of your own: fn(K) builds it, where K = { line, both, flat (batches: add(geometry, colour, a, b)), shapes:
 *  { ball, block, knead, put, roll, turned, arched, prism }, field, fieldBy, hue, rng, V, W }. Return extra fields
 *  (colliders, fronts, floor, update) from fn to have them on the thing. */
export function make(W, name, fn) {
  const B = batches(W), extra = fn({ ...B, shapes: { ball, block, knead, put, roll, turned, arched, prism }, field, fieldBy, hue, rng, V, W, tone }) || {};
  const { group, n } = build(B);
  if (extra.group) group.add(extra.group);
  return { name, ...extra, group, count: n };
}

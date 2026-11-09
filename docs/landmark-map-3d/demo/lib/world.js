// landmark-map-3d · world.js — the neighbourhood, built from place.json (OpenStreetMap) in the cute-map style:
// a painted ground map (sidewalks, parks, plazas, paths, soft contact shadows), water sunk below street level with stone
// quays and a planar reflection, roads as ribbons with curbs, lane dashes and zebra crossings, bridges with arches,
// buildings extruded from their real footprints and heights (window grids that light up at night, cornices, mansard /
// gable / hip roofs, roof boxes and chimneys, party walls detected), every mapped tree as a soft lumpy canopy, street
// lamps with glow and warm light pools. Everything is built once; update(t, look) only moves uniforms.
import { THREE, rng, pick, col, shade, clamp, smooth, hash, strHash, inPoly, polyArea, centroid, cumLen, along, distToSeg, Grid, fbm, mixc } from './core.js';

export const DEFAULT_PALETTE = {
  ground: '#efe8dc', plaza: '#ece2d2', path: '#f6efe2', parking: '#d9d5df', road: '#8f88a6', curb: '#f7f2ea', marking: '#ffffff',
  grass: '#a6d77f', park: '#97cf72', wood: '#78b45f', pitch: '#94d38c', sand: '#f2dea8', deck: '#e3d6c2', playground: '#f0d7a4',
  flower: ['#f59ac2', '#ffd56e', '#c9a0f2', '#ff9f7a'], quay: '#ddd0bb', bridge: '#e2d6c4',
  walls: ['#f4ede1', '#f1e2c8', '#f3d3b5', '#e9a594', '#a9cbe9', '#b9e0c7', '#f5dc8c'], wallW: [5, 3, 2, 1, 1, 1, 1],
  roofs: ['#dcd8e8', '#d2cfdf', '#e3dde0'], trim: '#fffaf2', glass: '#5d6f98', glassSky: '#b9cdee', mansard: '#8f99b0', chimney: '#e8b79c',
  trees: ['#5c9d48', '#6aaa50', '#4e8c42', '#7cb75a', '#588f3e'], trunk: '#8b6b53', lamp: '#3b3a48', lampLight: '#ffc277',
  winLit: ['#ffd89a', '#ffe7b8', '#ffc985', '#fff1d0', '#bcd6ff'],
};
const RW = { motorway: 20, trunk: 17, primary: 14, secondary: 11.5, tertiary: 9.5, unclassified: 7.5, residential: 7.5, living_street: 6, service: 4.5, busway: 7, motorway_link: 8, trunk_link: 8, primary_link: 7.5, secondary_link: 7, tertiary_link: 7 };
const DRIVE = new Set(Object.keys(RW));
const FOOT = { pedestrian: 7, footway: 2.4, path: 2, cycleway: 2.2, steps: 3, track: 3 };

// ------------------------------------------------------------------ geometry accumulator
class Geo {
  constructor(attrs = {}) { this.p = []; this.n = []; this.c = []; this.ex = Object.fromEntries(Object.entries(attrs).map(([k, s]) => [k, { s, a: [] }])); }
  v(x, y, z, nx, ny, nz, c, ex = {}) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(c.r, c.g, c.b); for (const [k, o] of Object.entries(this.ex)) { const v = ex[k] ?? new Array(o.s).fill(0); o.a.push(...v); } }
  tri(a, b, c, color, ex, nIn) {                   // a, b, c = [x, y, z]; faces toward nIn when given
    let ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const L = Math.hypot(nx, ny, nz);
    if (!(L > 1e-8)) return;                        // degenerate: a zero normal turns into NaN pixels on GPUs
    nx /= L; ny /= L; nz /= L;
    if (nIn && nx * nIn[0] + ny * nIn[1] + nz * nIn[2] < 0) { [b, c] = [c, b]; nx = -nx; ny = -ny; nz = -nz; }
    const e = Array.isArray(ex) ? ex : [ex, ex, ex];
    this.v(...a, nx, ny, nz, color, e[0]); this.v(...b, nx, ny, nz, color, e[1]); this.v(...c, nx, ny, nz, color, e[2]);
  }
  quad(a, b, c, d, color, ex, nIn) { const e = Array.isArray(ex) ? ex : [ex, ex, ex, ex]; this.tri(a, b, c, color, [e[0], e[1], e[2]], nIn); this.tri(a, c, d, color, [e[0], e[2], e[3]], nIn); }
  colorQuad(a, b, c, d, ca, cb, cc, cd, nIn) {     // per-vertex colours (gradients)
    for (const [p, q, r, cp, cq, cr] of [[a, b, c, ca, cb, cc], [a, c, d, ca, cc, cd]]) {
      let ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const L = Math.hypot(nx, ny, nz);
      if (!(L > 1e-8)) continue;
      nx /= L; ny /= L; nz /= L;
      let Q = q, R = r, CQ = cq, CR = cr;
      if (nIn && nx * nIn[0] + ny * nIn[1] + nz * nIn[2] < 0) { Q = r; R = q; CQ = cr; CR = cq; nx = -nx; ny = -ny; nz = -nz; }
      this.v(...p, nx, ny, nz, cp); this.v(...Q, nx, ny, nz, CQ); this.v(...R, nx, ny, nz, CR);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    for (const [k, o] of Object.entries(this.ex)) g.setAttribute(k, new THREE.Float32BufferAttribute(o.a, o.s));
    g.computeBoundingSphere(); return g;
  }
  get count() { return this.p.length / 3; }
}
export { Geo };

// a box of size (w, h, d) centred at (x, y0 + h/2, z), rotated by a around y
export function boxInto(G, x, y0, z, w, h, d, a, color, top = color) {
  const c = Math.cos(a), s = Math.sin(a), P = (u, y, v) => [x + u * c - v * s, y, z + u * s + v * c];
  const u = w / 2, v = d / 2, y1 = y0 + h;
  const C = [P(-u, 0, -v), P(u, 0, -v), P(u, 0, v), P(-u, 0, v)].map(p => [p[0], p[2]]);
  const ctr = [x, (y0 + y1) / 2, z];
  for (let i = 0; i < 4; i++) {
    const a0 = C[i], b0 = C[(i + 1) % 4], mx = (a0[0] + b0[0]) / 2 - x, mz = (a0[1] + b0[1]) / 2 - z;
    G.quad([a0[0], y0, a0[1]], [b0[0], y0, b0[1]], [b0[0], y1, b0[1]], [a0[0], y1, a0[1]], color, undefined, [mx, 0, mz]);
  }
  G.quad([C[0][0], y1, C[0][1]], [C[1][0], y1, C[1][1]], [C[2][0], y1, C[2][1]], [C[3][0], y1, C[3][1]], top, undefined, [0, 1, 0]);
  void ctr;
}

// offset a closed ring inward by d (miter, clamped); null when it folds over itself
function inset(p, d) {
  const n = p.length, A = polyArea(p), s = A > 0 ? 1 : -1, out = [];
  // shoelace sign convention as in fetch-place: outward normal of edge a→b is s'·(dz, −dx) with s' = sign(Σ x_i z_{i+1} − x_{i+1} z_i)
  let S = 0; for (let i = 0; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; S += a[0] * b[1] - b[0] * a[1]; }
  const so = Math.sign(S) || 1; void s;
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n];
    const e1 = [b[0] - a[0], b[1] - a[1]], e2 = [c[0] - b[0], c[1] - b[1]], l1 = Math.hypot(...e1) || 1, l2 = Math.hypot(...e2) || 1;
    const n1 = [so * e1[1] / l1, -so * e1[0] / l1], n2 = [so * e2[1] / l2, -so * e2[0] / l2];
    let mx = n1[0] + n2[0], mz = n1[1] + n2[1]; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
    const cos = mx * n1[0] + mz * n1[1], k = Math.min(d / Math.max(cos, .25), d * 3);
    out.push([b[0] - mx * k, b[1] - mz * k]);
  }
  const A2 = polyArea(out);
  if (Math.sign(A2) !== Math.sign(polyArea(p)) || Math.abs(A2) < Math.abs(polyArea(p)) * .2) return null;
  for (let i = 0; i < n; i++) {                    // no edge may flip direction
    const a = p[i], b = p[(i + 1) % n], a2 = out[i], b2 = out[(i + 1) % n];
    if ((b[0] - a[0]) * (b2[0] - a2[0]) + (b[1] - a[1]) * (b2[1] - a2[1]) <= 0) return null;
  }
  return out;
}
const ringSign = p => { let S = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; S += a[0] * b[1] - b[0] * a[1]; } return Math.sign(S) || 1; };
// best-fit rectangle (orientation of the longest-supported edge): {cx, cz, a, L, Wd, fill}
function obb(p) {
  let best = null; const A = Math.abs(polyArea(p));
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), c = Math.cos(ang), s = Math.sin(ang);
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (const q of p) { const u = q[0] * c + q[1] * s, v = -q[0] * s + q[1] * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const ar = (u1 - u0) * (v1 - v0);
    if (!best || ar < best.ar) { const uc = (u0 + u1) / 2, vc = (v0 + v1) / 2; best = { ar, a: ang, L: u1 - u0, Wd: v1 - v0, cx: uc * c - vc * s, cz: uc * s + vc * c }; }
  }
  if (best.Wd > best.L) { best.a += Math.PI / 2; [best.L, best.Wd] = [best.Wd, best.L]; }
  best.fill = A / best.ar; return best;
}
function ribbonInto(G, pts, w, y, color, { capRound = true, ex } = {}) {
  if (pts.length < 2) return;
  const h = w / 2, L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[Math.min(pts.length - 1, i + 1)];
    let d1x = b[0] - a[0], d1z = b[1] - a[1], d2x = c[0] - b[0], d2z = c[1] - b[1];
    const l1 = Math.hypot(d1x, d1z), l2 = Math.hypot(d2x, d2z);
    if (l1 < 1e-6) { d1x = d2x; d1z = d2z; } if (l2 < 1e-6) { d2x = d1x; d2z = d1z; }
    const n1 = [-d1z / (Math.hypot(d1x, d1z) || 1), d1x / (Math.hypot(d1x, d1z) || 1)], n2 = [-d2z / (Math.hypot(d2x, d2z) || 1), d2x / (Math.hypot(d2x, d2z) || 1)];
    let mx = n1[0] + n2[0], mz = n1[1] + n2[1]; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
    const k = h / Math.max(mx * n1[0] + mz * n1[1], .5);
    L.push([b[0] + mx * k, y, b[1] + mz * k]); R.push([b[0] - mx * k, y, b[1] - mz * k]);
  }
  for (let i = 0; i < pts.length - 1; i++) G.quad(L[i], R[i], R[i + 1], L[i + 1], color, ex, [0, 1, 0]);
  if (capRound) for (let i = 0; i < pts.length; i++) {
    const turn = i === 0 || i === pts.length - 1 || (() => { const a = pts[i - 1], b = pts[i], c = pts[i + 1]; const d1 = Math.atan2(b[1] - a[1], b[0] - a[0]), d2 = Math.atan2(c[1] - b[1], c[0] - b[0]); return Math.abs(((d2 - d1 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) > .35; })();
    if (!turn) continue;
    const [x, z] = pts[i], N = 12;
    for (let k = 0; k < N; k++) { const a0 = k / N * Math.PI * 2, a1 = (k + 1) / N * Math.PI * 2; G.tri([x, y, z], [x + Math.cos(a0) * h, y, z + Math.sin(a0) * h], [x + Math.cos(a1) * h, y, z + Math.sin(a1) * h], color, ex, [0, 1, 0]); }
  }
}
export { ribbonInto };

// ------------------------------------------------------------------ the window / facade shader (patched into MeshStandardMaterial)
export function facadeMaterial(U, P, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .86, metalness: 0, ...opts });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uLit: U.lit, uGlass: { value: col(P.glass) }, uGlassSky: { value: col(P.glassSky) }, uTrim: { value: col(P.trim) }, uWarm: U.warm, uDay: U.day, uTime: U.time });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute vec4 aWin; attribute vec2 aYB; varying vec4 vWin; varying vec2 vYB; varying vec3 vWP; varying vec3 vWN;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      vWin = aWin; vYB = aYB; vWP = (modelMatrix * vec4(transformed, 1.)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform float uLit, uDay, uTime; uniform vec3 uGlass, uGlassSky, uTrim, uWarm;
      varying vec4 vWin; varying vec2 vYB; varying vec3 vWP; varying vec3 vWN;
      float hh(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float box(vec2 p, vec2 lo, vec2 hi, vec2 aa){ vec2 a = smoothstep(lo - aa, lo + aa, p) * (1. - smoothstep(hi - aa, hi + aa, p)); return a.x * a.y; }
      vec3 winEmit = vec3(0.);`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      {
        float style = vWin.w; float u = vWin.x, len = vWin.y, seed = vWin.z;
        float y = vWP.y - vYB.x, top = vYB.y - vYB.x;
        bool wall = abs(vWN.y) < .55;
        // cornice: a light band under the roof line, and a soft rounded-edge highlight at wall corners
        if (wall && style > -.5) {
          float cor = smoothstep(.55, .0, top - y) * step(4., top);
          diffuseColor.rgb = mix(diffuseColor.rgb, uTrim, cor * .85);
          float edge = smoothstep(.45, .0, len * .5 - abs(u));
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.08 + .02, edge * .6);
          diffuseColor.rgb *= mix(.82, 1., smoothstep(0., 2.5, vWP.y));   // contact darkening at the street
        }
        if (wall && style > .5) {
          float fh = style > 3.5 && style < 4.5 ? 3. : 3.3;               // floor height
          float sp = style > 2.5 && style < 3.5 ? 1.7 : style > 3.5 && style < 4.5 ? 2.6 : 3.1;
          float cols = max(1., floor((len - 1.) / sp)); float cw = (len - 1.) / cols;
          float cu = (u + (len - 1.) * .5) / cw; float fu = fract(cu); float ci = floor(cu);
          float fl = y / fh; float fv = fract(fl); float fi = floor(fl);
          float inside = step(.5, len * .5 - abs(u) + .0) * step(0., y) * step(y, top - (style > 4.5 ? .3 : .9)) * step(-.001, cu) * step(cu, cols);
          vec2 aa = fwidth(vec2(cu, fl)) * 1.2;
          float ground = (style < 4.5 && fi < .5 && top > 7.) ? 1. : 0.;
          float win;
          if (style > 4.5) win = box(vec2(fu, fv), vec2(.36, .28), vec2(.64, .78), aa);                                 // dormers
          else if (style > 2.5 && style < 3.5) win = box(vec2(fu, fv), vec2(.06, .1), vec2(.94, .92), aa);              // curtain glass
          else if (style > 1.5 && style < 2.5) win = box(vec2(fu, fv), vec2(-.1, .3), vec2(1.1, .82), aa);              // ribbon bands
          else if (ground > .5) win = box(vec2(fu, fv), vec2(.1, .08), vec2(.9, .74), aa);                              // shopfronts
          else win = box(vec2(fu, fv), vec2(.3, .3), vec2(.7, .8), aa);                                                // punched windows
          win *= inside;
          float sill = box(vec2(fu, fv), vec2(.26, .22), vec2(.74, .3), aa) * inside * (1. - ground) * step(style, 1.5);
          diffuseColor.rgb = mix(diffuseColor.rgb, uTrim, sill * .9);
          float sky = clamp(.35 + .65 * fv, 0., 1.);
          vec3 glass = mix(uGlass, uGlassSky, sky * .55 * uDay);
          diffuseColor.rgb = mix(diffuseColor.rgb, glass, win);
          float r = hh(vec3(ci, fi, seed)); float on = step(1. - uLit * (ground > .5 ? 1.25 : 1.), r);
          vec3 wc = mix(uWarm, vec3(1., .93, .8), hh(vec3(ci * 1.7, fi, seed + 3.)));
          if (hh(vec3(ci, fi * 3.1, seed + 9.)) > .93) wc = vec3(.65, .78, 1.);
          winEmit = wc * on * win * (ground > .5 ? 1.5 : 1.15) * (.75 + .5 * hh(vec3(ci, fi, seed + 5.)));
        }
      }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += winEmit;`);
  };
  m.customProgramCacheKey = () => 'facade';
  return m;
}

// ------------------------------------------------------------------ the world
export class World {
  constructor(F, place, o = {}) {
    this.F = F; this.place = place; this.o = o;
    this.P = { ...DEFAULT_PALETTE, ...(o.palette || {}) };
    this.r = rng(o.seed ?? 7);
    const [W, H] = place.size; this.W = W; this.H = H;
    this.waterY = o.waterY ?? -2.4;
    this.group = new THREE.Group(); F.scene.add(this.group);
    this.U = F.U;                                     // shared uniforms (lit, lamps, warm, day, time, night)
    this.clear = (o.clear || []).map(c => ({ at: c.at, r: c.r ?? 40, poly: c.poly }));
    this.clearIds = new Set(o.clearIds || []);
    this.roadGrid = new Grid(30); this.bldGrid = new Grid(40);
    this.drive = []; this.walk = []; this.streetNames = [];
  }
  cleared(x, z) { return this.clear.some(c => c.poly ? inPoly([x, z], c.poly) : Math.hypot(x - c.at[0], z - c.at[1]) < c.r); }
  roadWidth(r) { return r.w ? clamp(r.w, 3, 40) : r.lanes && DRIVE.has(r.k) ? Math.max(RW[r.k] * .6, r.lanes * 3.1 + 1) : RW[r.k] ?? FOOT[r.k] ?? 4; }

  build() {
    const t0 = performance.now();
    for (const step of ['indexRoads', 'groundAtlas', 'water', 'roads', 'buildings', 'trees', 'lamps', 'props']) {
      const t1 = performance.now(); this[step](); this.F.log(`  ${step}: ${Math.round(performance.now() - t1)} ms`);
    }
    this.F.log(`world built in ${Math.round(performance.now() - t0)} ms`);
  }

  indexRoads() {
    for (const r of this.place.roads) {
      const w = this.roadWidth(r), item = { r, w };
      if (DRIVE.has(r.k)) this.drive.push(item); else this.walk.push(item);
      for (let i = 0; i < r.p.length - 1; i++) {
        const [ax, az] = r.p[i], [bx, bz] = r.p[i + 1];
        this.roadGrid.add(Math.min(ax, bx) - w, Math.min(az, bz) - w, Math.max(ax, bx) + w, Math.max(az, bz) + w, { r, w, i, drive: DRIVE.has(r.k) });
      }
    }
  }
  nearRoad(x, z, pad = 0, driveOnly = true) {
    for (const s of this.roadGrid.near(x, z, 20)) {
      if (driveOnly && !s.drive) continue;
      const [ax, az] = s.r.p[s.i], [bx, bz] = s.r.p[s.i + 1];
      if (distToSeg(x, z, ax, az, bx, bz) < s.w / 2 + pad) return s;
    }
    return null;
  }
  inBuilding(x, z) { for (const b of this.bldGrid.near(x, z, 0)) if (inPoly([x, z], b.p)) return b; return null; }

  // ---------------------------------------------------------------- the painted ground (+ water mask, shore gradient)
  groundAtlas() {
    const { W, H, P, place } = this, N = this.o.atlas ?? 4096, s = N / Math.max(W, H);
    const cw = Math.round(W * s), ch = Math.round(H * s);
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const g = cv.getContext('2d');
    const mk = document.createElement('canvas'); const ms = .5; mk.width = Math.round(cw * ms); mk.height = Math.round(ch * ms); const m = mk.getContext('2d');
    const X = x => (x + W / 2) * s, Z = z => (z + H / 2) * s;
    const path = (ctx, rings, k = 1) => { ctx.beginPath(); for (const r of rings) { r.forEach(([x, z], i) => i ? ctx.lineTo(X(x) * k, Z(z) * k) : ctx.moveTo(X(x) * k, Z(z) * k)); ctx.closePath(); } };
    const line = (ctx, p, k = 1) => { ctx.beginPath(); p.forEach(([x, z], i) => i ? ctx.lineTo(X(x) * k, Z(z) * k) : ctx.moveTo(X(x) * k, Z(z) * k)); };
    const hex = c => '#' + col(c).getHexString(THREE.SRGBColorSpace);
    g.fillStyle = hex(P.ground); g.fillRect(0, 0, cw, ch);
    // faint paving mottling so big plazas are not flat
    const R = rng(11);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${R() < .5 ? '255,255,255' : '120,100,90'},${.025 + R() * .03})`; const r = (4 + R() * 26) * s; g.beginPath(); g.arc(R() * cw, R() * ch, r, 0, 7); g.fill(); }
    const order = ['roadarea', 'parking', 'plaza', 'deck', 'sand', 'pitch', 'playground', 'grass', 'park', 'wood', 'flowerbed', 'fountain'];
    const fills = { roadarea: P.road, parking: P.parking, plaza: P.plaza, deck: P.deck, sand: P.sand, pitch: P.pitch, playground: P.playground, grass: P.grass, park: P.park, wood: P.wood, flowerbed: P.flower[0], fountain: P.quay };
    for (const k of order) for (const a of place.areas.filter(a => a.k === k)) {
      path(g, [a.p, ...(a.holes || [])]); g.fillStyle = hex(fills[k]); g.fill('evenodd');
      if (/grass|park|wood|pitch/.test(k)) {
        g.save(); g.clip('evenodd');
        // lawn mottling + a darker rim like a clipped hedge edge
        const r2 = rng(strHash(a.p[0].join())); const [x0, z0] = a.p.reduce(([a1, b1], [x, z]) => [Math.min(a1, x), Math.min(b1, z)], [1e9, 1e9]), [x1, z1] = a.p.reduce(([a1, b1], [x, z]) => [Math.max(a1, x), Math.max(b1, z)], [-1e9, -1e9]);
        const n = Math.min(400, Math.abs(polyArea(a.p)) / 60);
        for (let i = 0; i < n; i++) { g.fillStyle = r2() < .5 ? 'rgba(255,255,210,.07)' : 'rgba(30,70,20,.06)'; g.beginPath(); g.arc(X(x0 + r2() * (x1 - x0)), Z(z0 + r2() * (z1 - z0)), (3 + r2() * 9) * s, 0, 7); g.fill(); }
        if (k === 'pitch') { g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = .35 * s; path(g, [a.p]); g.stroke(); }
        g.strokeStyle = hex(shade(fills[k], .78)); g.lineWidth = 1.6 * s; path(g, [a.p]); g.stroke();
        g.restore();
      }
      if (k === 'flowerbed') { g.save(); path(g, [a.p]); g.clip(); const r2 = rng(strHash(a.p[0].join()) + 3); const [cx, cz] = centroid(a.p); const rad = Math.sqrt(Math.abs(polyArea(a.p))); for (let i = 0; i < rad * 6; i++) { g.fillStyle = hex(pick(r2, P.flower)); g.beginPath(); g.arc(X(cx + (r2() - .5) * rad * 1.6), Z(cz + (r2() - .5) * rad * 1.6), (.35 + r2() * .4) * s, 0, 7); g.fill(); } g.restore(); }
    }
    // paths and pedestrian streets
    g.lineCap = g.lineJoin = 'round';
    for (const { r, w } of this.walk) {
      if (r.crossing) continue;
      g.strokeStyle = hex(r.k === 'pedestrian' ? P.plaza : r.k === 'steps' ? shade(P.path, .93) : P.path);
      g.lineWidth = w * s; line(g, r.p); g.stroke();
    }
    // roads painted underneath their ribbons so joins never show a gap
    for (const { r, w } of this.drive) { if (r.bridge) continue; g.strokeStyle = hex(P.curb); g.lineWidth = (w + 1.2) * s; line(g, r.p); g.stroke(); }
    for (const { r, w } of this.drive) { if (r.bridge) continue; g.strokeStyle = hex(P.road); g.lineWidth = w * s; line(g, r.p); g.stroke(); }
    // soft contact shadows at building feet (the cheap ambient occlusion that makes the blocks sit down)
    {
      // one path, one blur: drawn on a half-size layer (the blur is soft anyway), then scaled onto the map
      const ao = document.createElement('canvas'); ao.width = cw >> 1; ao.height = ch >> 1; const a = ao.getContext('2d');
      const all = new Path2D();
      for (const b of place.buildings) { const c0 = centroid(b.p); if (b.mh || b.kind === 'roof' || b.part || this.cleared(...c0) || this.clearIds.has(b.id) || this.isWaterCanvas?.(c0)) continue; b.p.forEach(([x, z], i) => i ? all.lineTo(X(x) / 2, Z(z) / 2) : all.moveTo(X(x) / 2, Z(z) / 2)); all.closePath(); }
      a.filter = `blur(${Math.max(1, 1.1 * s)}px)`; a.fillStyle = 'rgba(40,30,60,.32)'; a.fill(all, 'nonzero');
      g.drawImage(ao, 0, 0, cw, ch);
    }
    // water mask (white land, black water) + quays painted on the colour map under the cut
    m.fillStyle = '#fff'; m.fillRect(0, 0, mk.width, mk.height); m.fillStyle = '#000'; m.strokeStyle = '#000'; m.lineCap = m.lineJoin = 'round';
    const waters = place.areas.filter(a => a.k === 'water' || a.k === 'fountain');
    for (const a of waters) { path(m, [a.p, ...(a.holes || [])], ms); m.fill('evenodd'); }
    this.rivers = place.rivers.map(rv => ({ ...rv, w: rv.w || (rv.k === 'river' ? 30 : rv.k === 'canal' ? 12 : 4) }));
    for (const rv of this.rivers) { if (waters.some(a => inPoly(rv.p[Math.floor(rv.p.length / 2)], a.p))) { rv.covered = true; continue; } m.lineWidth = rv.w * s * ms; line(m, rv.p, ms); m.stroke(); }
    // decks (bridges, piers) are land again
    m.fillStyle = '#fff'; for (const a of place.areas.filter(a => a.k === 'deck')) { path(m, [a.p], ms); m.fill(); }
    this.maskCanvas = mk; this.maskCtx = m; this.maskScale = s * ms;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = this.F.renderer.capabilities.getMaxAnisotropy(); tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    const mtex = new THREE.CanvasTexture(mk); mtex.generateMipmaps = false; mtex.minFilter = THREE.LinearFilter;
    const mat = new THREE.MeshStandardMaterial({ map: tex, alphaMap: mtex, alphaTest: .5, roughness: .95 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    this.group.add(ground); this.ground = ground;
    // a wide skirt beyond the data so the edge melts into the haze
    const skirt = new THREE.Mesh(new THREE.RingGeometry(Math.hypot(W, H) / 2 - 2, Math.max(W, H) * 5, 8, 1), new THREE.MeshStandardMaterial({ color: col(P.ground), roughness: 1 }));
    skirt.rotation.x = -Math.PI / 2; skirt.position.y = -.05; skirt.rotation.z = Math.PI / 8; this.group.add(skirt);
    // shore gradient for the water shader (blurred mask)
    const sh = document.createElement('canvas'); sh.width = 1024; sh.height = Math.round(1024 * ch / cw); const sg = sh.getContext('2d');
    sg.filter = 'blur(10px)'; sg.drawImage(mk, 0, 0, sh.width, sh.height);
    this.shoreTex = new THREE.CanvasTexture(sh); this.atlasTex = tex;
  }
  isWaterCanvas(c) { return this.place.areas.some(a => (a.k === 'water') && inPoly(c, a.p) && !(a.holes || []).some(h => inPoly(c, h))); }
  isWater(x, z) {
    const k = this.maskScale, px = Math.floor((x + this.W / 2) * k), pz = Math.floor((z + this.H / 2) * k);
    if (px < 0 || pz < 0 || px >= this.maskCanvas.width || pz >= this.maskCanvas.height) return false;
    this._md ??= this.maskCtx.getImageData(0, 0, this.maskCanvas.width, this.maskCanvas.height).data;
    return this._md[(pz * this.maskCanvas.width + px) * 4] < 128;
  }

  // ---------------------------------------------------------------- water: sunk plane with reflection + quay walls
  water() {
    const { W, H, P, waterY } = this, F = this.F;
    const waters = this.place.areas.filter(a => a.k === 'water' || a.k === 'fountain');
    if (!waters.length && !this.rivers.length) { this.hasWater = false; return; }
    this.hasWater = true;
    const rw = Math.round(F.W * .5), rh = Math.round(F.H * .5);
    this.reflRT = new THREE.WebGLRenderTarget(rw, rh, { type: THREE.HalfFloatType, samples: 2 });
    this.reflCam = new THREE.PerspectiveCamera();
    this.texMatrix = new THREE.Matrix4();
    const U = this.U;
    const mat = new THREE.ShaderMaterial({
      fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        tRefl: { value: null }, tShore: { value: this.shoreTex }, texM: { value: new THREE.Matrix4() }, deep: { value: new THREE.Color() }, shallow: { value: new THREE.Color() },
        refl: { value: .5 }, time: { value: 0 }, sunD: { value: new THREE.Vector3() }, sunC: { value: new THREE.Color() }, size: { value: new THREE.Vector2(W, H) }, glow: { value: 0 }, hemi: { value: new THREE.Color() },
      }]),
      vertexShader: `#include <fog_pars_vertex>
        uniform mat4 texM; varying vec4 vR; varying vec3 vW; varying vec2 vUv;
        void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vR = texM * w; vUv = uv; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `#include <common>
        #include <fog_pars_fragment>
        uniform sampler2D tRefl, tShore; uniform vec3 deep, shallow, sunC, hemi; uniform vec3 sunD; uniform float refl, time, glow; varying vec4 vR; varying vec3 vW; varying vec2 vUv;
        float wv(vec2 p){ return sin(p.x) * cos(p.y * .8) + sin(p.x * .7 + p.y * 1.3) * .5; }
        void main(){
          vec2 p = vW.xz;
          vec2 n = vec2(wv(p * .21 + vec2(time * .9, time * .4)) - wv(p * .21 + vec2(time * .9 + .7, time * .4)), wv(p * .19 + vec2(-time * .5, time * .7) + 3.1) - wv(p * .19 + vec2(-time * .5, time * .7 + .7) + 3.1));
          n += .5 * vec2(wv(p * .9 + time * 1.7) - wv(p * .9 + time * 1.7 + .5), wv(p.yx * .8 - time * 1.3) - wv(p.yx * .8 - time * 1.3 + .5));
          float sh = texture2D(tShore, vUv).r;                                  // blurred land mask: 0 mid-river, ~.5 at the bank
          vec3 base = mix(deep, shallow, smoothstep(.22, .5, sh) * .8);
          vec3 V = normalize(cameraPosition - vW); vec3 N = normalize(vec3(n.x * .06, 1., n.y * .06));
          float fr = .35 + .65 * pow(1. - max(dot(N, V), 0.), 3.);
          vec2 ruv = vR.xy / vR.w + n * .026;
          vec3 r = texture2D(tRefl, ruv).rgb;
          vec3 c = mix(base * (hemi * .55 + .45), r, refl * fr);
          vec3 H = normalize(normalize(sunD) + V); c += sunC * pow(max(dot(N, H), 0.), 220.) * 1.6;
          float foam = smoothstep(.36, .45, sh) * (1. - smoothstep(.5, .58, sh)); c = mix(c, vec3(1.) * (hemi * .6 + .4), foam * .22);
          gl_FragColor = vec4(c, 1.);
          #include <fog_fragment>
        }`,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat); plane.rotation.x = -Math.PI / 2; plane.position.y = waterY;
    this.group.add(plane); this.waterMesh = plane; this.waterMat = mat;
    // quays: vertical stone walls along every water edge that is not the edge of the map
    const G = new Geo(), top = col(P.quay), low = shade(P.quay, .62), lip = col(P.trim);
    const onEdge = (a, b) => (Math.abs(a[0] - b[0]) < .2 && Math.abs(Math.abs(a[0]) - W / 2) < .5) || (Math.abs(a[1] - b[1]) < .2 && Math.abs(Math.abs(a[1]) - H / 2) < .5);
    const wall = (a, b, inward) => {
      if (onEdge(a, b)) return;
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      G.colorQuad([a[0], .02, a[1]], [b[0], .02, b[1]], [b[0], waterY - .8, b[1]], [a[0], waterY - .8, a[1]], top, top, low, low, [inward[0], 0, inward[1]]);
      void mx; void mz;
      // a pale coping line
      G.colorQuad([a[0], .1, a[1]], [b[0], .1, b[1]], [b[0], -.15, b[1]], [a[0], -.15, a[1]], lip, lip, lip, lip, [inward[0], 0, inward[1]]);
    };
    for (const a of waters) for (const ring of [a.p, ...(a.holes || [])]) {
      const so = ringSign(ring), hole = ring !== a.p;
      for (let i = 0; i < ring.length; i++) {
        const p = ring[i], q = ring[(i + 1) % ring.length], dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz) || 1;
        let n = [so * dz / L, -so * dx / L]; if (!hole) n = [-n[0], -n[1]];          // into the water
        wall(p, q, n);
      }
    }
    for (const rv of this.rivers) {
      if (rv.covered) continue;
      for (const side of [1, -1]) {
        const off = rv.p.map((q, i) => { const a = rv.p[Math.max(0, i - 1)], b = rv.p[Math.min(rv.p.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1; return [q[0] - dz / L * rv.w / 2 * side, q[1] + dx / L * rv.w / 2 * side, dz / L * side, -dx / L * side]; });
        for (let i = 0; i < off.length - 1; i++) wall(off[i], off[i + 1], [off[i][2], off[i][3]]);
      }
    }
    if (G.count) { const mesh = new THREE.Mesh(G.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, side: THREE.DoubleSide })); mesh.receiveShadow = true; mesh.castShadow = false; this.group.add(mesh); }
  }
  // render the mirrored scene into reflRT (called by the film before the main pass)
  renderReflection(renderer, scene, camera) {
    if (!this.hasWater) return;
    const y = this.waterY, rc = this.reflCam;
    rc.copy(camera);
    const p = camera.position.clone(); p.y = 2 * y - p.y;
    const tgt = new THREE.Vector3(); camera.getWorldDirection(tgt); tgt.y = -tgt.y;
    rc.layers.set(0); rc.position.copy(p); rc.up.set(0, 1, 0); rc.lookAt(p.clone().add(tgt)); rc.updateMatrixWorld(); rc.projectionMatrix.copy(camera.projectionMatrix);
    this.texMatrix.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1).multiply(rc.projectionMatrix).multiply(rc.matrixWorldInverse);
    this.waterMat.uniforms.texM.value.copy(this.texMatrix);
    const vis = this.waterMesh.visible; this.waterMesh.visible = false;
    const clip = renderer.clippingPlanes; renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -y + .05)];
    renderer.setRenderTarget(this.reflRT); renderer.render(scene, rc);
    renderer.clippingPlanes = clip; this.waterMesh.visible = vis;
    this.waterMat.uniforms.tRefl.value = this.reflRT.texture;
  }

  // ---------------------------------------------------------------- roads, markings, crossings, bridges
  roads() {
    const { P } = this, G = new Geo(), M = new Geo(), B = new Geo();
    const road = col(P.road), curb = col(P.curb), mark = col(P.marking), brg = col(P.bridge), brgLow = shade(P.bridge, .7);
    for (const { r, w } of this.drive) {
      const y = r.bridge ? .34 : .06;
      ribbonInto(G, r.p, w + 1.2, y - .015, curb);
      ribbonInto(G, r.p, w, y, road);
      if (r.bridge) this.bridge(B, r, w, brg, brgLow);
      // markings: a dashed centre line on two-way roads of 9 m+, lane dashes on wide one-ways
      const major = /primary|secondary|tertiary|trunk|motorway/.test(r.k);
      const c = cumLen(r.p), L = c.at(-1);
      const dash = (off, dl = 3.6, gap = 4, wd = .36) => {
        for (let s = gap / 2; s < L - dl; s += dl + gap) {
          const [x0, z0, dx, dz] = along(r.p, c, s), [x1, z1] = along(r.p, c, s + dl);
          const nx = -dz, nz = dx;
          const a = [x0 + nx * (off - wd / 2), y + .012, z0 + nz * (off - wd / 2)], b = [x0 + nx * (off + wd / 2), y + .012, z0 + nz * (off + wd / 2)];
          const e = [x1 + nx * (off + wd / 2), y + .012, z1 + nz * (off + wd / 2)], d = [x1 + nx * (off - wd / 2), y + .012, z1 + nz * (off - wd / 2)];
          M.quad(a, b, e, d, mark, undefined, [0, 1, 0]);
        }
      };
      if (major && w >= 9 && !r.oneway) dash(0);
      else if (major && r.oneway && w >= 9) { const n = Math.max(2, Math.round(w / 3.4)); for (let k = 1; k < n; k++) dash(-w / 2 + w * k / n); }
    }
    // zebra crossings at crossing nodes, laid across the nearest drivable road
    for (const [x, z] of this.place.crossings) {
      const s = this.nearRoad(x, z, 1.5); if (!s || s.r.bridge) continue;
      const [ax, az] = s.r.p[s.i], [bx, bz] = s.r.p[s.i + 1], L = Math.hypot(bx - ax, bz - az) || 1, dx = (bx - ax) / L, dz = (bz - az) / L;
      const u = clamp(((x - ax) * dx + (z - az) * dz), 2, L - 2), cx = ax + dx * u, cz = az + dz * u, nx = -dz, nz = dx;
      const across = s.w - .6, depth = 3.2, n = Math.max(3, Math.floor(across / 1.1));
      for (let k = 0; k < n; k++) {
        const o0 = -across / 2 + (k + .2) * across / n, o1 = o0 + across / n * .55, y = .072;
        M.quad([cx + nx * o0 - dx * depth / 2, y, cz + nz * o0 - dz * depth / 2], [cx + nx * o1 - dx * depth / 2, y, cz + nz * o1 - dz * depth / 2], [cx + nx * o1 + dx * depth / 2, y, cz + nz * o1 + dz * depth / 2], [cx + nx * o0 + dx * depth / 2, y, cz + nz * o0 + dz * depth / 2], mark, undefined, [0, 1, 0]);
      }
    }
    // pedestrian bridges / piers over water: give their decks a body
    for (const a of this.place.areas.filter(a => a.k === 'deck')) {
      const so = ringSign(a.p);
      for (let i = 0; i < a.p.length; i++) {
        const p = a.p[i], q = a.p[(i + 1) % a.p.length], dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz) || 1;
        B.colorQuad([p[0], .03, p[1]], [q[0], .03, q[1]], [q[0], -1.3, q[1]], [p[0], -1.3, p[1]], brg, brg, brgLow, brgLow, [so * dz / L, 0, -so * dx / L]);
      }
    }
    const roadMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    const g = new THREE.Mesh(G.geometry(), roadMat); g.receiveShadow = true; this.group.add(g);
    if (M.count) { const mm = new THREE.Mesh(M.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })); mm.receiveShadow = true; this.group.add(mm); }
    if (B.count) { const bm = new THREE.Mesh(B.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, side: THREE.DoubleSide })); bm.castShadow = bm.receiveShadow = true; this.group.add(bm); }
  }
  bridge(B, r, w, brg, brgLow) {
    // a deck body with railings, and arches between piers where it crosses water
    const c = cumLen(r.p), L = c.at(-1), y = .34, wy = this.waterY, step = 1.5;
    const pts = []; for (let s = 0; s <= L + 1e-6; s += step) pts.push(along(r.p, c, Math.min(s, L)));
    const overW = pts.map(([x, z]) => this.isWater(x, z));
    const span = 26, hw = w / 2 + .8;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0, dx0, dz0] = pts[i], [x1, z1, dx1, dz1] = pts[i + 1];
      const s0 = i * step, s1 = Math.min((i + 1) * step, L);
      const bot = s => { const u = (s % span) / span; return overW[i] ? wy + .2 + (y - .9 - wy - .2) * Math.pow(Math.sin(Math.PI * u), .45) : y - 1.4; };
      for (const side of [1, -1]) {
        const a = [x0 - dz0 * hw * side, z0 + dx0 * hw * side], b = [x1 - dz1 * hw * side, z1 + dx1 * hw * side];
        B.colorQuad([a[0], y + .9, a[1]], [b[0], y + .9, b[1]], [b[0], bot(s1), b[1]], [a[0], bot(s0), a[1]], brg, brg, brgLow, brgLow, [-dz0 * side, 0, dx0 * side]);
      }
      // the deck's top between railing and road (sidewalk on the bridge)
      for (const side of [1, -1]) {
        const a0 = [x0 - dz0 * (w / 2) * side, z0 + dx0 * (w / 2) * side], a1 = [x0 - dz0 * hw * side, z0 + dx0 * hw * side];
        const b0 = [x1 - dz1 * (w / 2) * side, z1 + dx1 * (w / 2) * side], b1 = [x1 - dz1 * hw * side, z1 + dx1 * hw * side];
        B.quad([a0[0], y + .02, a0[1]], [a1[0], y + .02, a1[1]], [b1[0], y + .02, b1[1]], [b0[0], y + .02, b0[1]], col(this.P.curb), undefined, [0, 1, 0]);
      }
    }
    // piers at the arch springs
    for (let s = span; s < L; s += span) {
      const [x, z, dx, dz] = along(r.p, c, s); if (!this.isWater(x, z)) continue;
      boxInto(B, x, wy - .5, z, 2.6, y - wy - .4, w + 2.4, Math.atan2(dz, dx), brg);
    }
  }

  // ---------------------------------------------------------------- buildings
  buildings() {
    const { P, o } = this, R = rng(o.seed ?? 7);
    const levelH = o.levelH ?? 3.2, [lvA, lvB] = o.levels ?? [4, 7];
    const roofW = o.roofs ?? { flat: 1 };
    // facades and details (roof boxes, chimneys), one pair of meshes per map tile so tiles out of view are culled
    const TILE = o.tile ?? 240, tiles = new Map();
    const tileOf = p => { const [cx, cz] = centroid(p), key = `${Math.floor(cx / TILE)},${Math.floor(cz / TILE)}`; if (!tiles.has(key)) tiles.set(key, { G: new Geo({ aWin: 4, aYB: 2 }), D: new Geo() }); return tiles.get(key); };
    const list = this.place.buildings.filter(b => !this.clearIds.has(b.id) && !this.cleared(...centroid(b.p)));
    // party walls: an edge shared (reversed) with a neighbour gets no windows, and is skipped when the neighbour is as tall
    const eg = new Grid(20), info = [];
    for (const b of list) {
      const r = rng(strHash(String(b.id)));
      let h = b.h ?? (b.lv != null ? b.lv * levelH + (b.rlv ? b.rlv * levelH * .7 : 0) + 1 : (lvA + Math.floor(r() * (lvB - lvA + 1))) * levelH + 1.2);
      if (b.kind === 'roof') h = b.h ?? 4.5;
      if (/^(garage|garages|shed|kiosk|hut|carport|toilets)$/.test(b.kind)) h = b.h ?? 3.5;
      h *= o.heightScale ?? 1;
      let y0 = b.kind === 'roof' ? h - .6 : b.mh ?? (b.mlv ? b.mlv * levelH : 0);
      if (this.isWater(...centroid(b.p))) { const d = -this.waterY + .3; h = Math.min(h, 4.5) - d; y0 -= d; }
      const it = { b, h: Math.max(h, y0 + 2.5), y0, r };
      info.push(it); this.bldGrid.add(...bbox(b.p), { p: b.p, h: it.h, id: b.id });
      b.p.forEach((a, i) => { const q = b.p[(i + 1) % b.p.length]; const mx = (a[0] + q[0]) / 2, mz = (a[1] + q[1]) / 2; eg.add(mx, mz, mx, mz, { it, a, q, mx, mz }); });
    }
    const party = (it, a, q) => {
      const mx = (a[0] + q[0]) / 2, mz = (a[1] + q[1]) / 2, dx = q[0] - a[0], dz = q[1] - a[1], L = Math.hypot(dx, dz);
      let best = null;
      for (const e of eg.near(mx, mz, 1)) {
        if (e.it === it) continue;
        const ex = e.q[0] - e.a[0], ez = e.q[1] - e.a[1], el = Math.hypot(ex, ez);
        if ((dx * ex + dz * ez) / (L * el + 1e-9) > -.97) continue;
        // collinear and overlapping by most of this edge
        if (distToSeg(mx, mz, e.a[0], e.a[1], e.q[0], e.q[1]) > .8 || distToSeg(e.mx, e.mz, a[0], a[1], q[0], q[1]) > .8 + Math.abs(L - el)) continue;
        if (!best || e.it.h > best.h) best = e.it;
      }
      return best;
    };
    for (const it of info) {
      const { b, h, y0, r } = it, p = b.p, { G, D } = tileOf(p);
      const paint = o.paint ? o.paint(b, { h, r, P }) || {} : {};
      const wallC = col(paint.wall ?? (o.useOSMColours && b.c ? safeCol(b.c, null) : null) ?? pick(r, P.walls, P.wallW));
      const roofC = col(paint.roof ?? (o.useOSMColours && b.rc ? safeCol(b.rc, null) : null) ?? pick(r, P.roofs));
      const area = Math.abs(polyArea(p));
      let style = paint.windows ?? (/^(garage|garages|shed|kiosk|hut|carport|roof|industrial|warehouse|parking|toilets|service|transformer_tower|bunker)$/.test(b.kind) ? 0 : h > 42 ? 3 : /^(office|commercial|retail)$/.test(b.kind) && h > 12 ? 2 : /^(house|detached|semidetached_house|bungalow|terrace)$/.test(b.kind) ? 4 : 1);
      if (h - y0 < 3) style = 0;
      let roof = paint.roofStyle ?? normRoof(b.roof) ?? pick(r, Object.keys(roofW), Object.values(roofW));
      if (b.kind === 'roof' || b.part && b.mh) roof = 'flat';
      let wallTop = h, ins = null, box = null;
      if (roof === 'mansard') { const mh = Math.min(3.6, (h - y0) * .3); ins = h - y0 > 9 && area > 50 ? inset(p, Math.min(1.8, mh * .55)) : null; if (ins) wallTop = h - mh; else roof = 'flat'; }
      if (roof === 'gable' || roof === 'hip') { box = obb(p); if (box.fill < .82 || box.Wd > 22 || area < 20) { roof = 'flat'; box = null; } else wallTop = h - Math.min(box.Wd * .42, 6); }
      if (roof === 'dome' || roof === 'pyramid') { box = obb(p); wallTop = h - Math.min(box.Wd * .5, 12); }
      const seed = (b.id % 997) + .5, so = ringSign(p);
      const walls = (ring, hole) => {
        const s2 = ringSign(ring);
        for (let i = 0; i < ring.length; i++) {
          const a = ring[i], q = ring[(i + 1) % ring.length], dx = q[0] - a[0], dz = q[1] - a[1], L = Math.hypot(dx, dz); if (L < .05) continue;
          let n = [s2 * dz / L, -s2 * dx / L]; if (hole) n = [-n[0], -n[1]];
          const nb = hole ? null : party(it, a, q);
          if (nb && nb.h >= wallTop - .3 && nb.y0 <= y0 + .3) continue;
          const st = nb ? -.0 : style;                   // party walls: plain
          const ex = u => ({ aWin: [u, L, seed, st], aYB: [y0, wallTop] });
          G.quad([a[0], y0, a[1]], [q[0], y0, q[1]], [q[0], wallTop, q[1]], [a[0], wallTop, a[1]], wallC, [ex(-L / 2), ex(L / 2), ex(L / 2), ex(-L / 2)], [n[0], 0, n[1]]);
        }
      };
      walls(p, false); for (const hl of b.holes || []) walls(hl, true);
      void so;
      const flatTop = (ring, holes, y, c) => {
        const tris = THREE.ShapeUtils.triangulateShape(ring.map(([x, z]) => new THREE.Vector2(x, z)), (holes || []).map(hh => hh.map(([x, z]) => new THREE.Vector2(x, z))));
        const all = [...ring, ...(holes || []).flat()];
        const e = { aWin: [0, 0, 0, -1], aYB: [y0, h] };
        for (const [i, j, k] of tris) G.tri([all[i][0], y, all[i][1]], [all[j][0], y, all[j][1]], [all[k][0], y, all[k][1]], c, e, [0, 1, 0]);
      };
      const noWin = { aWin: [0, 0, 0, -1], aYB: [y0, h] };
      if (roof === 'flat') {
        flatTop(p, b.holes, wallTop, roofC);
        // parapet lip (a lighter inner ring) + roof boxes
        if (area > 90 && h > 6 && b.kind !== 'roof') {
          const n = Math.min(o.roofBoxes ?? 6, Math.floor(area / 160) + (r() < .5 ? 1 : 0));
          const ip = inset(p, 1.5) || p;
          for (let k = 0, tries = 0; k < n && tries < 40; tries++) {
            const [x0, z0, x1, z1] = bbox(ip), x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
            if (!inPoly([x, z], ip)) continue;
            const sz = 1.2 + r() * 2.2, kind = r();
            if (kind < .18 && o.waterTanks) { cylInto(D, x, wallTop, z, 1.3, 3.2, shade(P.chimney, .75)); }
            else boxInto(D, x, wallTop, z, sz, .8 + r() * 1.4, sz * (.6 + r() * .8), r() * Math.PI, shade(roofC, .9), shade(roofC, 1.06));
            k++;
          }
        }
      } else if (roof === 'mansard') {
        const mc = col(paint.mansard ?? P.mansard), topC = shade(roofC, 1.02);
        for (let i = 0; i < p.length; i++) {
          const a = p[i], q = p[(i + 1) % p.length], a2 = ins[i], q2 = ins[(i + 1) % p.length], L = Math.hypot(q[0] - a[0], q[1] - a[1]); if (L < .05) continue;
          const nb = party(it, a, q); if (nb && nb.h >= h - .3) continue;
          const mx = (a[0] + q[0]) / 2 - (a2[0] + q2[0]) / 2, mz = (a[1] + q[1]) / 2 - (a2[1] + q2[1]) / 2;
          const ex = u => ({ aWin: [u, L, seed + 50, nb ? 0 : 5], aYB: [wallTop, h] });
          G.quad([a[0], wallTop, a[1]], [q[0], wallTop, q[1]], [q2[0], h, q2[1]], [a2[0], h, a2[1]], mc, [ex(-L / 2), ex(L / 2), ex(L / 2), ex(-L / 2)], [mx, .6, mz]);
        }
        flatTop(ins, null, h, topC);
        // chimney stacks along the roof
        const nCh = Math.min(5, Math.floor(p.length / 2) + 1);
        for (let k = 0; k < nCh; k++) { const v = ins[Math.floor(r() * ins.length)]; const [cx, cz] = centroid(ins); const x = v[0] + (cx - v[0]) * .25, z = v[1] + (cz - v[1]) * .25; boxInto(D, x, h - .2, z, .9, 1.4 + r() * .8, 1.6 + r(), Math.atan2(ins[1][1] - ins[0][1], ins[1][0] - ins[0][0]), col(P.chimney), shade(P.chimney, .8)); }
      } else if (roof === 'gable' || roof === 'hip') {
        // walls already up to wallTop; ridge along the long axis
        const { cx, cz, a, L, Wd } = box, c = Math.cos(a), s = Math.sin(a), ov = .35;
        const Pt = (u, v, y) => [cx + u * c - v * s, y, cz + u * s + v * c];
        const hu = L / 2 + ov, hv = Wd / 2 + ov, ridge = roof === 'hip' ? Math.max(0, L / 2 - Wd / 2) : hu;
        const e0 = [Pt(-hu, -hv, wallTop - .15), Pt(hu, -hv, wallTop - .15), Pt(hu, hv, wallTop - .15), Pt(-hu, hv, wallTop - .15)], r0 = Pt(-ridge, 0, h), r1 = Pt(ridge, 0, h);
        G.quad(e0[0], e0[1], r1, r0, roofC, noWin, [-s, .8, c]); G.quad(e0[2], e0[3], r0, r1, roofC, noWin, [s, .8, -c]);
        if (roof === 'hip') { G.tri(e0[1], e0[2], r1, roofC, noWin, [c, .8, s]); G.tri(e0[3], e0[0], r0, roofC, noWin, [-c, .8, -s]); }
        else { const gw = Pt(hu - ov, 0, 0); void gw; G.tri(Pt(L / 2, -Wd / 2, wallTop), Pt(L / 2, Wd / 2, wallTop), Pt(L / 2, 0, h - .2), wallC, noWin, [c, 0, s]); G.tri(Pt(-L / 2, Wd / 2, wallTop), Pt(-L / 2, -Wd / 2, wallTop), Pt(-L / 2, 0, h - .2), wallC, noWin, [-c, 0, -s]); }
        if (r() < .5) boxInto(D, ...[Pt(L * .25 * (r() < .5 ? -1 : 1), Wd * .18, 0)].map(q => [q[0], h - 1.2, q[2]])[0], .8, 1.8, .8, a, col(P.chimney));
      } else if (roof === 'dome' || roof === 'pyramid') {
        flatTop(p, b.holes, wallTop, roofC);
        const [cx, cz] = centroid(p), rad = Math.min(box.Wd, box.L) * .45;
        if (roof === 'dome') domeInto(D, cx, wallTop, cz, rad, h - wallTop, roofC);
        else { const n = 4, pts = []; for (let k = 0; k < n; k++) pts.push([cx + Math.cos(box.a + k * Math.PI / 2 + Math.PI / 4) * rad * 1.41, cz + Math.sin(box.a + k * Math.PI / 2 + Math.PI / 4) * rad * 1.41]); for (let k = 0; k < n; k++) D.tri([pts[k][0], wallTop, pts[k][1]], [pts[(k + 1) % n][0], wallTop, pts[(k + 1) % n][1]], [cx, h, cz], roofC, undefined, [Math.cos(box.a + k * Math.PI / 2 + Math.PI * .75), .7, Math.sin(box.a + k * Math.PI / 2 + Math.PI * .75)]); }
      }
      // a slab soffit for raised parts and canopies
      if (y0 > .5) flatTop(p.slice().reverse(), null, y0, shade(wallC, .7));
    }
    this.facadeMat = facadeMaterial(this.U, P);
    const detailMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 });
    let tris = 0;
    for (const { G, D } of tiles.values()) {
      if (G.count) { const mesh = new THREE.Mesh(G.geometry(), this.facadeMat); mesh.castShadow = mesh.receiveShadow = true; this.group.add(mesh); tris += G.count / 3; }
      if (D.count) { const dm = new THREE.Mesh(D.geometry(), detailMat); dm.castShadow = dm.receiveShadow = true; this.group.add(dm); tris += D.count / 3; }
    }
    this.buildingInfo = info;
    this.F.log(`buildings: ${info.length} (${tris | 0} tris in ${tiles.size} tiles)`);
  }
  heightAt(x, z) { let h = 0; for (const b of this.bldGrid.near(x, z, 0)) if (inPoly([x, z], b.p)) h = Math.max(h, b.h); return h; }

  // ---------------------------------------------------------------- trees
  trees() {
    const { P, o } = this, R = rng((o.seed ?? 7) + 101), T = o.trees ?? {};
    const scale = T.scale ?? 1, list = [];
    const ok = (x, z, pad) => Math.abs(x) < this.W / 2 && Math.abs(z) < this.H / 2 && !this.cleared(x, z) && !this.isWater(x, z) && !this.inBuilding(x, z) && !this.nearRoad(x, z, pad);
    for (const t of this.place.trees) { const [x, z, hh] = t; if (this.cleared(x, z) || this.isWater(x, z) || this.inBuilding(x, z)) continue; list.push({ x, z, h: (hh ?? (8 + R() * 6)) * scale, kind: T.kind ?? 'round' }); }
    // fill woods and big parks that the data leaves bare
    const fill = { wood: 1 / 70, park: 1 / 420, grass: 1 / 900, ...(T.fill || {}) };
    const tg = new Grid(20); for (const t of list) tg.add(t.x, t.z, t.x, t.z, t);
    for (const a of this.place.areas) {
      const d = fill[a.k]; if (!d) continue;
      const A = Math.abs(polyArea(a.p)); if (A < 300) continue;
      const [x0, z0, x1, z1] = bbox(a.p), n = Math.min(1500, Math.round(A * d)), minD = a.k === 'wood' ? 5 : 9;
      let placed = 0;
      for (let k = 0; k < n * 4 && placed < n; k++) {
        const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0);
        if (!inPoly([x, z], a.p) || (a.holes || []).some(hl => inPoly([x, z], hl)) || !ok(x, z, 2)) continue;
        if ([...tg.near(x, z, minD)].some(t => Math.hypot(t.x - x, t.z - z) < minD)) continue;
        const t = { x, z, h: (a.k === 'wood' ? 9 + R() * 7 : 7 + R() * 6) * scale, kind: a.k === 'wood' && T.conifers ? (R() < T.conifers ? 'cone' : 'round') : (T.kind ?? 'round') };
        list.push(t); tg.add(x, z, x, z, t); placed++;
      }
    }
    for (const t of o.extraTrees || []) list.push({ x: t[0], z: t[1], h: (t[2] ?? 10) * scale, kind: t[3] ?? T.kind ?? 'round' });
    this.treeList = list;
    this.makeTrees(list);
  }
  makeTrees(list) {
    const { P } = this, TILE = this.o.tile ?? 240;
    const kinds = { round: canopyRound, cone: canopyCone, palm: canopyPalm, columnar: canopyColumnar };
    if (!list.length) return;
    const trunkG = new THREE.CylinderGeometry(.16, .26, 1, 6); trunkG.translate(0, .5, 0);
    const trunkM = new THREE.MeshStandardMaterial({ color: col(P.trunk), roughness: .9 });
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
    const greens = P.trees.map(c => col(c)), U = this.U, geos = {}, lows = {}, mats = {}; this.treeTiles = [];
    const matFor = k => mats[k] ??= (() => {
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92 });
      mat.onBeforeCompile = sh => {
        sh.uniforms.uTime = U.time;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
          { vec3 ip = vec3(instanceMatrix[3][0], 0., instanceMatrix[3][2]); float k = max(position.y - .2, 0.);
            transformed.x += sin(uTime * 1.3 + ip.x * .07 + ip.z * .05) * .035 * k; transformed.z += cos(uTime * 1.1 + ip.z * .06) * .03 * k; }`);
      };
      mat.customProgramCacheKey = () => 'tree'; return mat;
    })();
    // one instanced mesh per map tile and kind, so the tiles out of view (or out of the shadow box) are skipped
    const tiles = new Map();
    for (const t of list) { const key = `${Math.floor(t.x / TILE)},${Math.floor(t.z / TILE)}`; if (!tiles.has(key)) tiles.set(key, []); tiles.get(key).push(t); }
    const r = rng(17);
    for (const arr of tiles.values()) {
      const trunks = new THREE.InstancedMesh(trunkG, trunkM, arr.length); trunks.castShadow = true; let ti = 0;
      const byKind = {}; for (const t of arr) (byKind[t.kind] ??= []).push(t);
      for (const [k, ts] of Object.entries(byKind)) {
        const im = new THREE.InstancedMesh(geos[k] ??= (kinds[k] || canopyRound)(), matFor(k), ts.length); im.castShadow = im.receiveShadow = true;
        im.userData.lod = [geos[k], lows[k] ??= (k === 'round' ? canopyRound(true) : geos[k])];
        ts.forEach((t, i) => {
          const h = t.h, cr = k === 'cone' ? h * .22 : k === 'columnar' ? h * .2 : k === 'palm' ? h * .28 : h * .34, trunkH = k === 'palm' ? h * .82 : h * .42;
          e.set(0, r() * Math.PI * 2, 0); q.setFromEuler(e);
          v.set(t.x, trunkH, t.z); s.set(cr, k === 'palm' ? cr * .6 : (h - trunkH) * .62, cr);
          if (k === 'cone') s.y = h - trunkH * .55;
          m.compose(v, q, s); im.setMatrixAt(i, m);
          im.setColorAt(i, greens[Math.floor(r() * greens.length)].clone().multiplyScalar(.92 + r() * .16));
          v.set(t.x, 0, t.z); s.set(k === 'palm' ? 1.1 : 1, trunkH + .3, k === 'palm' ? 1.1 : 1); m.compose(v, q, s); trunks.setMatrixAt(ti++, m);
        });
        im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); this.group.add(im); this.treeTiles.push(im);
      }
      trunks.count = ti; trunks.computeBoundingSphere(); this.group.add(trunks);
    }
  }

  // ---------------------------------------------------------------- street lamps (+ glow + light pools at night)
  lamps() {
    const { P, o } = this, list = [];
    for (const [x, z] of this.place.lamps) if (!this.cleared(x, z) && !this.isWater(x, z) && !this.inBuilding(x, z)) list.push([x, z]);
    const totalLen = this.drive.reduce((s, d) => s + cumLen(d.r.p).at(-1), 0);
    if ((o.lamps?.auto ?? true) && list.length < totalLen / 70) {     // the data has few lamps: line the bigger roads
      for (const { r, w } of this.drive) {
        if (!/primary|secondary|tertiary|trunk|residential|unclassified/.test(r.k) || r.bridge) continue;
        const c = cumLen(r.p), L = c.at(-1);
        for (let s = 12; s < L - 6; s += 30) for (const side of [1, -1]) {
          const [x, z, dx, dz] = along(r.p, c, s + (side > 0 ? 0 : 15)), px = x - dz * (w / 2 + 1.3) * side, pz = z + dx * (w / 2 + 1.3) * side;
          if (!this.isWater(px, pz) && !this.inBuilding(px, pz) && !this.cleared(px, pz)) list.push([px, pz]);
        }
      }
    }
    for (const l of o.extraLamps || []) list.push(l);
    this.lampList = list; if (!list.length) return;
    const poleH = 5.2;
    const pole = new THREE.CylinderGeometry(.09, .12, poleH, 5); pole.translate(0, poleH / 2, 0);
    const pm = new THREE.InstancedMesh(pole, new THREE.MeshStandardMaterial({ color: col(P.lamp), roughness: .6 }), list.length);
    const head = new THREE.SphereGeometry(.38, 8, 6); head.translate(0, poleH + .2, 0);
    const hmat = new THREE.MeshStandardMaterial({ color: col('#fff6e6'), emissive: col(P.lampLight), emissiveIntensity: 0, roughness: .4 });
    this.lampHeadMat = hmat;
    const hm = new THREE.InstancedMesh(head, hmat, list.length);
    const m = new THREE.Matrix4();
    list.forEach(([x, z], i) => { m.makeTranslation(x, 0, z); pm.setMatrixAt(i, m); hm.setMatrixAt(i, m); });
    pm.castShadow = true; this.group.add(pm, hm);
    // light pools (additive discs on the ground) and glow sprites
    const pool = new THREE.CircleGeometry(1, 24); pool.rotateX(-Math.PI / 2);
    const poolMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { c: { value: col(P.lampLight) }, k: { value: 0 } },
      vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform vec3 c; uniform float k; varying vec2 vP; void main(){ float d = length(vP); float a = pow(max(1. - d, 0.), 1.8); gl_FragColor = vec4(c * a * k, 1.); }`,
    });
    const pl = new THREE.InstancedMesh(pool, poolMat, list.length);
    list.forEach(([x, z], i) => { m.makeScale(9, 1, 9).setPosition(x, .11, z); pl.setMatrixAt(i, m); });
    pl.renderOrder = 2; pl.layers.set(1); this.group.add(pl); this.poolMat = poolMat;
    const pts = new THREE.BufferGeometry(); pts.setAttribute('position', new THREE.Float32BufferAttribute(list.flatMap(([x, z]) => [x, poleH + .25, z]), 3));
    this.glowMat = glowMaterial(col(P.lampLight), 7);
    const glow = new THREE.Points(pts, this.glowMat); glow.renderOrder = 3; glow.frustumCulled = false; glow.layers.set(1); this.group.add(glow);
  }

  // street furniture from the data: benches, bus shelters (tiny, but they make close shots feel lived in)
  props() {
    const { P } = this, G = new Geo(), wood = col('#c99a6b'), metal = col('#4a4860'), glassC = col('#cfe3f2'), roof = col('#f2efe9');
    for (const [x, z] of this.place.benches || []) {
      if (this.cleared(x, z) || this.isWater(x, z) || this.inBuilding(x, z)) continue;
      const s = this.nearRoad(x, z, 6, false), a = s ? Math.atan2(s.r.p[s.i + 1][1] - s.r.p[s.i][1], s.r.p[s.i + 1][0] - s.r.p[s.i][0]) : hash(x, z) * 6.28;
      boxInto(G, x, .42, z, 1.8, .1, .5, a, wood); boxInto(G, x, 0, z, 1.6, .42, .08, a, metal);
    }
    for (const [x, z] of this.place.shelters || []) {
      if (this.cleared(x, z) || this.isWater(x, z) || this.inBuilding(x, z)) continue;
      const s = this.nearRoad(x, z, 8, true), a = s ? Math.atan2(s.r.p[s.i + 1][1] - s.r.p[s.i][1], s.r.p[s.i + 1][0] - s.r.p[s.i][0]) : 0;
      boxInto(G, x, 0, z, 4.2, 2.4, 1.4, a, glassC, glassC); boxInto(G, x, 2.4, z, 4.6, .18, 1.8, a, roof);
    }
    void P;
    if (G.count) { const m = new THREE.Mesh(G.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7 })); m.castShadow = m.receiveShadow = true; this.group.add(m); }
  }

  // distant tree tiles use the light canopy (the wide map shots draw every tree three times: shadow, reflection, view)
  lod(cam) {
    for (const im of this.treeTiles || []) { const d = im.boundingSphere.center.distanceTo(cam.position) - im.boundingSphere.radius; im.geometry = im.userData.lod[d > (this.o.treeLod ?? 650) ? 1 : 0]; }
  }
  update(t, L) {
    if (this.hasWater) {
      const u = this.waterMat.uniforms;
      u.deep.value.copy(col(L.water)); u.shallow.value.copy(col(L.shallow)); u.refl.value = L.waterRefl; u.time.value = t;
      u.hemi.value.copy(col(L.hemiSky)).multiplyScalar(L.hemiI * .8);
    }
    if (this.poolMat) this.poolMat.uniforms.k.value = L.lamps * .55;
    if (this.glowMat) this.glowMat.uniforms.k.value = L.lamps;
    if (this.lampHeadMat) this.lampHeadMat.emissiveIntensity = L.lamps * 3;
  }
}

// additive round glow sprites with world-size attenuation
export function glowMaterial(c, size = 6) {
  return new THREE.ShaderMaterial({ fog: false,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { c: { value: c }, k: { value: 0 }, size: { value: size }, scale: { value: 1000 } },
    vertexShader: `uniform float size, scale; attribute float aK; varying float vK; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = size * scale / -mv.z; vK = 1.; }`,
    fragmentShader: `uniform vec3 c; uniform float k; void main(){ vec2 d = gl_PointCoord - .5; float r = length(d) * 2.; float a = pow(max(1. - r, 0.), 2.2) + pow(max(1. - r * 3., 0.), 2.) * 1.5; gl_FragColor = vec4(c * a * k, 1.); }`,
  });
}

// ------------------------------------------------------------------ small geometry helpers
function bbox(p) { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const [x, z] of p) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); } return [x0, z0, x1, z1]; }
function normRoof(s) { if (!s) return null; s = String(s).toLowerCase(); if (/^(flat)$/.test(s)) return 'flat'; if (/gabl|saltbox|gambrel/.test(s)) return 'gable'; if (/hip|half-hip/.test(s)) return 'hip'; if (/mansard/.test(s)) return 'mansard'; if (/dome|onion|round/.test(s)) return 'dome'; if (/pyramid|cone/.test(s)) return 'pyramid'; return null; }
function safeCol(c, fallback) { try { const o = new THREE.Color(); o.setStyle(c); return o; } catch { return fallback; } }
export function cylInto(G, x, y0, z, r, h, c, n = 10) { for (let k = 0; k < n; k++) { const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2; const A = [x + Math.cos(a0) * r, z + Math.sin(a0) * r], B = [x + Math.cos(a1) * r, z + Math.sin(a1) * r]; G.quad([A[0], y0, A[1]], [B[0], y0, B[1]], [B[0], y0 + h, B[1]], [A[0], y0 + h, A[1]], c, undefined, [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)]); G.tri([x, y0 + h, z], [A[0], y0 + h, A[1]], [B[0], y0 + h, B[1]], c, undefined, [0, 1, 0]); } }
export function domeInto(G, x, y0, z, r, h, c, n = 16, m = 6) {
  for (let j = 0; j < m; j++) for (let k = 0; k < n; k++) {
    const p = (jj, kk) => { const ph = jj / m * Math.PI / 2, a = kk / n * Math.PI * 2; return [x + Math.cos(a) * Math.cos(ph) * r, y0 + Math.sin(ph) * h, z + Math.sin(a) * Math.cos(ph) * r]; };
    const a = p(j, k), b = p(j, k + 1), cc = p(j + 1, k + 1), d = p(j + 1, k);
    G.quad(a, b, cc, d, c, undefined, [(a[0] + cc[0]) / 2 - x, (a[1] + cc[1]) / 2 - y0 + .01, (a[2] + cc[2]) / 2 - z]);
  }
}
// canopies: unit-size, sitting on y = 0 (scaled per instance), with baked under-shading in vertex colours
function lumpy(geo, seed, amp) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = fbm(v.x * 1.7 + seed, v.z * 1.7 + v.y * 1.3 - seed, 3); v.multiplyScalar(1 + (n - .5) * amp); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals(); return geo;
}
function shadeVerts(geo, y0, y1) {
  const p = geo.attributes.position, c = [];
  for (let i = 0; i < p.count; i++) { const k = smooth(y0, y1, p.getY(i)); const v = .58 + .5 * k; c.push(v, v * 1.02, v * .96); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); return geo;
}
function merge(geos) {
  const out = new THREE.BufferGeometry(), pos = [], nor = [];
  for (const g of geos) { const gg = g.index ? g.toNonIndexed() : g; pos.push(...gg.attributes.position.array); nor.push(...gg.attributes.normal.array); }
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return out;
}
function canopyRound(low = false) {
  const a = lumpy(new THREE.IcosahedronGeometry(1, low ? 1 : 2), 1, .28); a.scale(1, .82, 1); a.translate(0, .82, 0);
  const b = lumpy(new THREE.IcosahedronGeometry(.62, low ? 0 : 1), 4, .3); b.translate(.55, .62, .25);
  const c = lumpy(new THREE.IcosahedronGeometry(.58, low ? 0 : 1), 7, .3); c.translate(-.45, .7, -.38);
  const d = lumpy(new THREE.IcosahedronGeometry(.5, low ? 0 : 1), 9, .3); d.translate(-.1, 1.35, .3);
  return shadeVerts(merge([a, b, c, d]), .1, 1.6);
}
function canopyCone() {
  const parts = [];
  for (let i = 0; i < 3; i++) { const g = new THREE.ConeGeometry(1 - i * .24, .55, 9, 1); g.translate(0, .3 + i * .27, 0); parts.push(lumpy(g.toNonIndexed(), i * 3, .12)); }
  return shadeVerts(merge(parts), 0, 1);
}
function canopyColumnar() { const a = lumpy(new THREE.IcosahedronGeometry(1, 3), 2, .22); a.scale(.55, 1, .55); a.translate(0, 1, 0); return shadeVerts(a, 0, 2); }
function canopyPalm() {
  const parts = [];
  for (let i = 0; i < 7; i++) { const g = new THREE.ConeGeometry(.22, 1.6, 4, 1); g.rotateZ(-Math.PI / 2 + .35); g.translate(.8, -.1, 0); g.rotateY(i / 7 * Math.PI * 2); parts.push(g.toNonIndexed()); }
  const m = merge(parts); m.computeVertexNormals(); return shadeVerts(m, -.6, .4);
}
export { bbox, canopyRound, canopyCone };

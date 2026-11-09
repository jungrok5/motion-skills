// landmark-map-3d · life.js — what moves: cars (and buses) on the real road network, people on footways and plazas,
// boats on the river, each a pure function of t. Roads are first joined into long routes (straightest continuation at
// every junction), so a car drives through the city instead of popping at the end of an OSM way.
import { THREE, rng, pick, col, shade, clamp, cumLen, along, strHash } from './core.js';
import { Geo, boxInto } from './world.js';

const DENS = { motorway: .05, trunk: .045, primary: .04, secondary: .032, tertiary: .022, unclassified: .012, residential: .01, living_street: .006, service: .004, busway: .01, motorway_link: .02, trunk_link: .02, primary_link: .02, secondary_link: .015, tertiary_link: .01 };
export const CAR_COLOURS = ['#ffffff', '#f6f3ec', '#e9e6f0', '#e8574e', '#f5c84c', '#6aa2e8', '#a7b0c4', '#5d6680', '#8fd0b6', '#f2a37a', '#ffffff', '#cfd6e6'];

// join polylines that meet end to end into long routes
export function routes(items, { minLen = 40, maxTurn = 65 } = {}) {
  const key = ([x, z]) => `${Math.round(x * 2)},${Math.round(z * 2)}`, ends = new Map();
  items.forEach((it, i) => { for (const e of [0, 1]) { const k = key(e ? it.p.at(-1) : it.p[0]); if (!ends.has(k)) ends.set(k, []); ends.get(k).push(i); } });
  const used = new Uint8Array(items.length), out = [];
  const dirAt = (p, end) => { const a = end ? p.at(-2) : p[1], b = end ? p.at(-1) : p[0]; return Math.atan2(b[1] - a[1], b[0] - a[0]); };
  const extend = (pts, ys, meta) => {
    for (;;) {
      const tail = pts.at(-1), hd = Math.atan2(tail[1] - pts.at(-2)[1], tail[0] - pts.at(-2)[0]);
      let best = -1, bestTurn = maxTurn * Math.PI / 180, rev = false;
      for (const j of ends.get(key(tail)) || []) {
        if (used[j]) continue; const p = items[j].p, atStart = key(p[0]) === key(tail);
        const d = atStart ? Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]) : dirAt(p, false) + Math.PI;
        const turn = Math.abs(((d - hd + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
        if (turn < bestTurn) { bestTurn = turn; best = j; rev = !atStart; }
      }
      if (best < 0) return;
      used[best] = 1; const it = items[best], p = rev ? it.p.slice().reverse() : it.p;
      for (let k = 1; k < p.length; k++) { pts.push(p[k]); ys.push(it.y); }
      meta.w = Math.max(meta.w, it.w); meta.oneway = meta.oneway && it.oneway; meta.k = meta.k || it.k;
    }
  };
  for (let i = 0; i < items.length; i++) {
    if (used[i]) continue; used[i] = 1;
    const it = items[i], meta = { w: it.w, oneway: !!it.oneway, k: it.k };
    let pts = it.p.slice(), ys = it.p.map(() => it.y);
    extend(pts, ys, meta);
    if (!it.oneway) { pts.reverse(); ys.reverse(); extend(pts, ys, meta); pts.reverse(); ys.reverse(); }
    const c = cumLen(pts); if (c.at(-1) < minLen) continue;
    out.push({ p: pts, ys, c, L: c.at(-1), ...meta });
  }
  return out;
}
function joinLines(lines) {
  const ls = lines.map(l => l.slice()), eq = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 2, out = [];
  while (ls.length) { let c = ls.shift(); for (let grew = true; grew;) { grew = false; for (let i = 0; i < ls.length; i++) { const d = ls[i]; if (eq(c.at(-1), d[0])) c = c.concat(d.slice(1)); else if (eq(c.at(-1), d.at(-1))) c = c.concat(d.slice().reverse().slice(1)); else if (eq(c[0], d.at(-1))) c = d.concat(c.slice(1)); else if (eq(c[0], d[0])) c = d.slice().reverse().concat(c.slice(1)); else continue; ls.splice(i, 1); grew = true; break; } } out.push(c); }
  return out;
}
function yAt(rt, s) { let lo = 0, hi = rt.c.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (rt.c[m] <= s) lo = m; else hi = m; } return Math.min(rt.ys[lo], rt.ys[hi]) < .2 && Math.max(rt.ys[lo], rt.ys[hi]) > .2 ? (rt.ys[lo] + rt.ys[hi]) / 2 : rt.ys[lo]; }

function carGeo(len = 4.2, wid = 1.8, hgt = 1.45, bus = false) {
  const G = new Geo({ aLight: 1 }), body = col('#ffffff'), glass = col('#2b3247'), dark = col('#26262e'), roof = col('#ffffff');
  const L = { aLight: [0] };
  const box = (x, y0, z, w, h, d, c, light = 0) => { const n = G.count; boxInto(G, x, y0, z, w, h, d, 0, c); if (light) for (let i = n; i < G.count; i++) G.ex.aLight.a[i] = light; };
  void L;
  if (bus) {
    box(0, .35, 0, len, hgt - .35, wid, body); box(0, hgt * .5, 0, len - .3, hgt * .32, wid + .02, glass);
    box(len / 2 - .02, .6, 0, .08, .35, wid * .8, col('#fff6dc'), 1); box(-len / 2 + .02, .6, 0, .08, .3, wid * .8, col('#ff4a3a'), 2);
  } else {
    box(0, .28, 0, len, .62, wid, body);                         // lower body
    box(-.15, .88, 0, len * .55, .5, wid * .86, glass);          // cabin glass band
    box(-.15, 1.36, 0, len * .5, .1, wid * .84, roof);           // roof
    box(len / 2 - .02, .55, wid * .3, .06, .18, .3, col('#fff6dc'), 1); box(len / 2 - .02, .55, -wid * .3, .06, .18, .3, col('#fff6dc'), 1);
    box(-len / 2 + .02, .6, wid * .3, .06, .16, .32, col('#ff4a3a'), 2); box(-len / 2 + .02, .6, -wid * .3, .06, .16, .32, col('#ff4a3a'), 2);
  }
  for (const sx of [len * .32, -len * .32]) for (const sz of [wid / 2 - .15, -wid / 2 + .15]) box(sx, 0, sz, .62, .55, .3, dark);
  return G.geometry();
}
function lightMat(U, extra = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .55, metalness: .05, ...extra });
  m.onBeforeCompile = sh => {
    sh.uniforms.uLamps = U.lamps;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aLight; varying float vLight;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLight = aLight;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uLamps; varying float vLight;').replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += (vLight > 1.5 ? vec3(1., .2, .12) * 2.2 : vLight > .5 ? vec3(1., .93, .78) * 3. : vec3(0.)) * (.25 + uLamps);`);
  };
  m.customProgramCacheKey = () => 'lightmat';
  return m;
}

export class Life {
  constructor(F, world, o = {}) {
    this.F = F; this.W = world; this.o = o; this.group = new THREE.Group(); F.scene.add(this.group);
    this.cars = []; this.people = []; this.boats = [];
  }
  build() {
    const { o } = this;
    if (o.cars !== 0) this.buildCars(o.cars ?? 1);
    if (o.people !== 0) this.buildPeople(o.people ?? 500);
    if (o.boats) this.buildBoats(o.boats);
  }
  buildCars(density) {
    const W = this.W, drive = o => o;
    const items = W.drive.filter(({ r }) => r.k !== 'service' || r.n).map(({ r, w }) => ({ p: r.p, w, oneway: r.oneway, k: r.k, y: r.bridge ? .34 : .06 }));
    this.carRoutes = routes(items.map(drive));
    const R = rng(this.o.seed ?? 21), side = this.o.drive === 'left' ? -1 : 1, colours = this.o.carColours ?? CAR_COLOURS;
    for (const rt of this.carRoutes) {
      const n = Math.round(rt.L * (DENS[rt.k] ?? .01) * density); if (!n) continue;
      const lanes = rt.oneway ? Math.max(1, Math.round(rt.w / 3.4)) : 1;
      const dirs = rt.oneway ? [1] : [1, -1];
      for (const dir of dirs) for (let lane = 0; lane < lanes; lane++) {
        const v = (5.5 + R() * 3) * (/primary|trunk|motorway/.test(rt.k) ? 1.15 : .9) * (this.o.speed ?? 1);
        const m = Math.max(1, Math.round(n / dirs.length / lanes)), gap = rt.L / m;
        const off = rt.oneway ? -rt.w / 2 + rt.w * (lane + .5) / lanes : side * rt.w * .25 * dir;
        for (let k = 0; k < m; k++) {
          const bus = /primary|secondary|trunk/.test(rt.k) && R() < (this.o.buses ?? .06);
          this.cars.push({ rt, s0: k * gap + R() * gap * .5, v, dir, off: rt.oneway ? off : side * rt.w * .25, bus, c: col(pick(R, colours)) });
        }
      }
    }
    const make = (geo, list) => { const im = new THREE.InstancedMesh(geo, lightMat(this.F.U), Math.max(1, list.length)); im.castShadow = true; im.receiveShadow = true; list.forEach((c, i) => im.setColorAt(i, c.c)); if (list.length) im.instanceColor.needsUpdate = true; im.count = list.length; this.group.add(im); return im; };
    this.carList = this.cars.filter(c => !c.bus); this.busList = this.cars.filter(c => c.bus);
    this.carMesh = make(carGeo(), this.carList); this.busMesh = make(carGeo(11, 2.5, 3.1, true), this.busList);
    // headlight pools on the road at night
    const pool = new THREE.PlaneGeometry(1, 1); pool.rotateX(-Math.PI / 2); pool.translate(.5, 0, 0);
    this.beamMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { k: { value: 0 } },
      vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform float k; varying vec2 vU; void main(){ float x = vU.x; float y = abs(vU.y - .5) * 2.; float a = (1. - x) * smoothstep(1., .2, y / (.35 + x * .65)) * smoothstep(0., .08, x); gl_FragColor = vec4(vec3(1., .9, .7) * a * k * .5, 1.); }`,
    });
    this.beams = new THREE.InstancedMesh(pool, this.beamMat, Math.max(1, this.cars.length)); this.beams.renderOrder = 2; this.beams.frustumCulled = false; this.beams.layers.set(1); this.group.add(this.beams);
    this.F.log(`cars: ${this.cars.length} on ${this.carRoutes.length} routes`);
  }
  carPose(c, t) {
    const rt = c.rt, L = rt.L;
    let s = ((c.s0 + c.v * t) % L + L) % L; if (c.dir < 0) s = L - s;
    const [x, z, dx, dz] = along(rt.p, rt.c, s), y = yAt(rt, s);
    const fx = dx * c.dir, fz = dz * c.dir;
    // one-way: a fixed lane across the polyline; two-way: the right (or left) half, seen in the direction of travel
    const px = rt.oneway ? x - dz * c.off : x - fz * c.off, pz = rt.oneway ? z + dx * c.off : z + fx * c.off;
    const k = clamp(Math.min(s, L - s) / 5, 0, 1);
    return { x: px, z: pz, y, a: Math.atan2(fz, fx), k };
  }
  buildPeople(n) {
    const W = this.W, R = rng((this.o.seed ?? 21) + 9);
    const items = W.walk.filter(({ r }) => /footway|pedestrian|path/.test(r.k) && !r.crossing).map(({ r, w }) => ({ p: r.p, w, oneway: false, k: r.k, y: .05 }));
    for (const { r, w } of W.drive) if (/residential|tertiary|secondary|primary|living_street|unclassified/.test(r.k) && !r.bridge) for (const side of [1, -1]) {
      // sidewalks: a parallel line just outside the curb
      const p = r.p.map((q, i) => { const a = r.p[Math.max(0, i - 1)], b = r.p[Math.min(r.p.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1; return [q[0] - dz / L * (w / 2 + 1.6) * side, q[1] + dx / L * (w / 2 + 1.6) * side]; });
      items.push({ p, w: 2, oneway: false, k: 'sidewalk', y: .05 });
    }
    const rts = routes(items, { minLen: 15, maxTurn: 80 });
    const tot = rts.reduce((s, r) => s + r.L * (r.k === 'pedestrian' ? 3 : 1), 0);
    for (const rt of rts) {
      const m = Math.round(n * rt.L * (rt.k === 'pedestrian' ? 3 : 1) / tot + (R() < .3 ? 1 : 0));
      for (let k = 0; k < m; k++) this.people.push({ rt, s0: R() * rt.L, v: (1.1 + R() * .5) * (R() < .5 ? 1 : -1), off: (R() - .5) * Math.min(rt.w, 5) * .8, ph: R() * 6.28, c: col(pick(R, this.o.clothes ?? ['#ffffff', '#f2c94c', '#e86a5a', '#4f7fd1', '#2d2d38', '#9ad0b8', '#f4a6c0', '#c8b49a'])) });
    }
    for (const cr of this.o.crowds || []) {
      const r2 = rng(strHash(cr.at.join())), N = cr.n ?? 60;
      for (let k = 0; k < N; k++) { const a = r2() * 6.28, d = Math.sqrt(r2()) * (cr.r ?? 15); this.people.push({ fixed: [cr.at[0] + Math.cos(a) * d, cr.at[1] + Math.sin(a) * d], a: r2() * 6.28, ph: r2() * 6.28, mill: cr.mill ?? .6, c: col(pick(r2, this.o.clothes ?? ['#ffffff', '#f2c94c', '#e86a5a', '#4f7fd1', '#2d2d38', '#9ad0b8', '#f4a6c0'])) }); }
    }
    const body = new THREE.CapsuleGeometry(.24, .78, 2, 6); body.translate(0, .63, 0);
    const head = new THREE.SphereGeometry(.17, 8, 6); head.translate(0, 1.47, 0);
    const N = Math.max(1, this.people.length);
    this.bodyMesh = new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ roughness: .8 }), N);
    this.headMesh = new THREE.InstancedMesh(head, new THREE.MeshStandardMaterial({ roughness: .7 }), N);
    const skins = ['#f2d0b4', '#e0ad86', '#b57c58', '#8a5a3e', '#f6dcc6'].map(c => col(c));
    this.people.forEach((p, i) => { this.bodyMesh.setColorAt(i, p.c); this.headMesh.setColorAt(i, skins[i % skins.length]); });
    if (this.people.length) { this.bodyMesh.instanceColor.needsUpdate = true; this.headMesh.instanceColor.needsUpdate = true; }
    this.bodyMesh.count = this.headMesh.count = this.people.length;
    this.bodyMesh.castShadow = true; this.group.add(this.bodyMesh, this.headMesh);
    this.F.log(`people: ${this.people.length}`);
  }
  buildBoats(o) {
    const W = this.W, R = rng((this.o.seed ?? 21) + 33);
    const paths = (o.paths || joinLines(W.rivers.map(r => r.p))).filter(p => cumLen(p).at(-1) > 100).sort((a, b) => cumLen(b).at(-1) - cumLen(a).at(-1));
    const n = o.n ?? 6;
    const G = new Geo({ aLight: 1 }), hull = col(o.hull ?? '#f4f1ea'), stripe = col(o.stripe ?? '#2c3e66'), glass = col('#3a4560'), deck = col(o.deck ?? '#d8c7a8');
    const L = o.len ?? 26, Wd = o.wid ?? 5.6;
    // hull with a pointed bow, a glass cabin with lit windows, a deck
    const hw = Wd / 2, bow = L / 2, st = -L / 2, y0 = -.6, y1 = .9;
    const outline = [[st, -hw], [bow - 5, -hw], [bow, 0], [bow - 5, hw], [st, hw]];
    for (let i = 0; i < outline.length; i++) { const a = outline[i], b = outline[(i + 1) % outline.length]; G.colorQuad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], stripe, stripe, hull, hull, [(a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2]); }
    G.tri([st, y1, -hw], [bow - 5, y1, -hw], [bow, y1, 0], deck, undefined, [0, 1, 0]); G.tri([st, y1, -hw], [bow, y1, 0], [bow - 5, y1, hw], deck, undefined, [0, 1, 0]); G.tri([st, y1, -hw], [bow - 5, y1, hw], [st, y1, hw], deck, undefined, [0, 1, 0]);
    const nC = G.count; boxInto(G, -1.5, y1, 0, L * .62, 1.7, Wd * .82, 0, glass, col('#e9eef6')); for (let i = nC; i < G.count; i++) G.ex.aLight.a[i] = 1;
    const geo = G.geometry();
    const mat = lightMat(this.F.U, { roughness: .4 });
    this.boatMesh = new THREE.InstancedMesh(geo, mat, n); this.boatMesh.castShadow = true; this.group.add(this.boatMesh);
    for (let i = 0; i < n; i++) { const p = paths[i % paths.length]; const c = cumLen(p); this.boats.push({ p, c, L: c.at(-1), s0: R() * c.at(-1), v: (2.8 + R() * 1.6) * (i % 2 ? 1 : -1), off: (i % 2 ? 1 : -1) * (o.lane ?? 12) }); }
    // wakes: additive V on the water
    const wg = new THREE.PlaneGeometry(1, 1); wg.rotateX(-Math.PI / 2); wg.translate(-.5, 0, 0);
    this.wakeMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { t: { value: 0 } },
      vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform float t; varying vec2 vU; void main(){ float x = 1. - vU.x; float y = abs(vU.y - .5) * 2.; float edge = abs(y - x * .9); float a = smoothstep(.12, .0, edge) * (1. - x) * .8 + smoothstep(.25, .0, y) * (1. - x) * .35 * (.6 + .4 * sin(x * 40. - t * 6.)); gl_FragColor = vec4(vec3(1.), a * .55); }`,
    });
    this.wakes = new THREE.InstancedMesh(wg, this.wakeMat, n); this.wakes.renderOrder = 1; this.wakes.layers.set(1); this.group.add(this.wakes);
  }
  boatPose(b, t) {
    const L = b.L; let s = ((b.s0 + b.v * t) % L + L) % L; const dir = Math.sign(b.v);
    const [x, z, dx, dz] = along(b.p, b.c, s);
    return { x: x - dz * b.off, z: z + dx * b.off, a: Math.atan2(dz * dir, dx * dir), k: clamp(Math.min(s, L - s) / 20, 0, 1) };
  }
  update(t, L) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
    const put = (im, i, x, y, z, a, k = 1, sx = 1, sy = 1, sz = 1) => { e.set(0, -a, 0); q.setFromEuler(e); v.set(x, y, z); s.set(sx * k, sy * k, sz * k); m.compose(v, q, s); im.setMatrixAt(i, m); };
    if (this.carMesh) {
      let bi = 0;
      const doList = (list, im, beamLen) => list.forEach((c, i) => {
        const p = this.carPose(c, t); put(im, i, p.x, p.y, p.z, p.a, p.k);
        put(this.beams, bi++, p.x + Math.cos(p.a) * beamLen, p.y + .04, p.z + Math.sin(p.a) * beamLen, p.a, p.k, 13, 1, 5);
      });
      doList(this.carList, this.carMesh, 2); doList(this.busList, this.busMesh, 5.4);
      this.beams.count = bi;
      this.carMesh.instanceMatrix.needsUpdate = this.busMesh.instanceMatrix.needsUpdate = this.beams.instanceMatrix.needsUpdate = true;
      this.beamMat.uniforms.k.value = L.lamps;
    }
    if (this.bodyMesh) {
      this.people.forEach((p, i) => {
        let x, z, a, bob;
        if (p.fixed) { x = p.fixed[0] + Math.sin(t * .3 + p.ph) * p.mill; z = p.fixed[1] + Math.cos(t * .27 + p.ph) * p.mill; a = p.a + Math.sin(t * .2 + p.ph) * .6; bob = 0; }
        else {
          const rt = p.rt, Lr = rt.L; let sp = ((p.s0 + p.v * t) % Lr + Lr) % Lr;
          const [px, pz, dx, dz] = along(rt.p, rt.c, sp); x = px - dz * p.off; z = pz + dx * p.off; a = Math.atan2(dz * Math.sign(p.v), dx * Math.sign(p.v));
          bob = Math.abs(Math.sin(t * 7.5 + p.ph)) * .07;
        }
        put(this.bodyMesh, i, x, .05 + bob, z, a); put(this.headMesh, i, x, .05 + bob, z, a);
      });
      this.bodyMesh.instanceMatrix.needsUpdate = this.headMesh.instanceMatrix.needsUpdate = true;
    }
    if (this.boatMesh) {
      const wy = this.W.waterY;
      this.boats.forEach((b, i) => { const p = this.boatPose(b, t); put(this.boatMesh, i, p.x, wy + Math.sin(t * 1.3 + i) * .06, p.z, p.a, p.k); put(this.wakes, i, p.x - Math.cos(p.a) * 12, wy + .03, p.z - Math.sin(p.a) * 12, p.a, p.k, 46, 1, 22); });
      this.boatMesh.instanceMatrix.needsUpdate = this.wakes.instanceMatrix.needsUpdate = true;
      this.wakeMat.uniforms.t.value = t;
    }
  }
}

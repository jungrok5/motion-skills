/* shatter.js — a live web page printed on a brittle pane (window glass, ice, porcelain, sugar glass …) that hangs in a
 * sunlit room. Strike it and it cracks from the impact point (radial cracks, stepped ring cracks, a crushed zone, long
 * daggers split again), the pieces fall as thin rigid plates, bounce, spin and settle on the floor, and the page stays
 * live on every piece: the shard under the pointer places the real DOM page with its own matrix, so a checkbox on a
 * flying shard ticks and a headline on a falling shard takes typing. Every step is recorded on a tape, so time can be
 * pulled back with a slider and the pane mended (optionally with seams drawn on the page where it broke).
 *
 *   <script src="lib/hic.js"></script><script src="lib/shatter-sound.js"></script><script src="lib/shatter.js"></script>
 *   Shatter.mount({ canvas, page, material: { base: 'glass', … }, room: {…}, impact: {…}, pane: {…}, mend: {…}, text: {…} })
 *
 * Sections: 1 config (materials, rooms, defaults) · 2 polygons · 3 fracture · 4 simulation + tape · 5 renderer ·
 * 6 mount (page wiring, hit testing, input, time, seams, test hook). Units are metres and seconds; the floor is y = 0,
 * the wall is the plane z = room.wallZ, the camera looks down -z. references/ENGINE.md documents the config.
 * Written for motion-skills/shatter-page. No dependencies but hic.js; no network.
 */
(function (root) {
  'use strict';
  var HIC = root.HIC, TAU = Math.PI * 2;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function mix(a, b, t) { return a + (b - a) * t; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function isObj(o) { return o && typeof o === 'object' && !Array.isArray(o); }
  function merge(a, b) { var o = {}, k; for (k in a) o[k] = isObj(a[k]) ? merge(a[k], {}) : a[k]; for (k in b || {}) o[k] = isObj(b[k]) && isObj(o[k]) ? merge(o[k], b[k]) : b[k]; return o; }
  function hex(c) { if (Array.isArray(c)) return c; var n = parseInt(String(c).replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }

  // =================================================================== 1. config
  // A material is the look, the crack pattern, the physics and the sound of the pane. These presets are examples of the
  // style: a project starts from the nearest one (`base`) and designs its own numbers for the topic.
  var MATERIALS = {
    glass: {
      opaque: false, thickness: 0.006, tint: '#cfeee2', body: 0.30, frost: 0, refract: 0.030, edge: '#4f9c83', edgeAlpha: 0.92,
      glaze: '#f4f4f0', back: '#f4f4f0', printBack: 0.85, shine: 1, rim: 0.0022,
      crack: { rays: 14, rayJitter: 0.5, rings: 5, ringGrow: 1.7, crush: 0.05, ringJitter: 0.22, ringSkip: 0.25, cleave: 0.035, crumble: 0.55, minArea: 3e-5 },
      physics: { density: 2500, bounce: 0.22, friction: 0.45, spin: 1, throw: 1, air: 1, breakSpeed: 0 },
      sound: { pitch: 1, ring: 1, crunch: 0.45, body: 0.2 }, dust: 110, dustColor: '#eefaf6'
    },
    frosted: { base: 'glass', tint: '#e6f2ef', body: 0.55, frost: 0.8, refract: 0.012, edge: '#7fb8a8' },
    ice: {
      base: 'glass', thickness: 0.016, tint: '#dcecf8', body: 0.48, frost: 0.45, refract: 0.05, edge: '#bcd8ee', edgeAlpha: 0.7, rim: 0.004,
      crack: { rays: 8, rayJitter: 0.85, rings: 3, ringGrow: 2.1, crush: 0.07, ringJitter: 0.35, ringSkip: 0.4, cleave: 0.05, crumble: 0.8, minArea: 6e-5 },
      physics: { density: 917, bounce: 0.12, friction: 0.04, spin: 0.8, throw: 0.9, air: 1, breakSpeed: 0 },
      sound: { pitch: 0.55, ring: 0.35, crunch: 1.1, body: 0.5 }, dust: 160, dustColor: '#ffffff'
    },
    porcelain: {
      opaque: true, thickness: 0.007, tint: '#ffffff', body: 1, frost: 0, refract: 0, edge: '#ebe6db', edgeAlpha: 1,
      glaze: '#f7f5ef', back: '#efece4', printBack: 0, shine: 0.8, rim: 0.0014,
      crack: { rays: 5, rayJitter: 0.7, rings: 2, ringGrow: 2.6, crush: 0.1, ringJitter: 0.3, ringSkip: 0.5, cleave: 0.12, crumble: 0.3, minArea: 4e-5 },
      physics: { density: 2400, bounce: 0.28, friction: 0.5, spin: 0.9, throw: 0.8, air: 1, breakSpeed: 3.0 },
      sound: { pitch: 0.62, ring: 0.5, crunch: 0.8, body: 0.6 }, dust: 50, dustColor: '#f4f1ea'
    },
    sugar: {
      base: 'glass', thickness: 0.005, tint: '#f6d28e', body: 0.42, frost: 0.15, refract: 0.02, edge: '#c98a2e', edgeAlpha: 0.85,
      crack: { rays: 20, rayJitter: 0.6, rings: 7, ringGrow: 1.5, crush: 0.08, ringJitter: 0.3, ringSkip: 0.15, cleave: 0.02, crumble: 0.9, minArea: 2e-5 },
      physics: { density: 1600, bounce: 0.08, friction: 0.7, spin: 1.2, throw: 1.1, air: 1.4, breakSpeed: 0 },
      sound: { pitch: 0.8, ring: 0.15, crunch: 1.3, body: 0.3 }, dust: 200, dustColor: '#fbe3b0'
    }
  };
  function material(m) {
    m = m || {};
    var chain = [], b = m;
    while (b) { chain.unshift(b); b = b.base ? (typeof b.base === 'string' ? MATERIALS[b.base] : b.base) : null; if (chain.length > 5) break; }
    var out = {};
    chain.forEach(function (x) { out = merge(out, x); });
    delete out.base;
    return out;
  }
  // A room: the wall, the floor and the light. Designed per topic like the material.
  var ROOM = {
    wall: '#dcd8d1', floor: '#bdb6aa', floorStyle: 'boards', boardWidth: 0.14, skirting: '#ece9e3', skirtingHeight: 0.07,
    wallZ: -0.38, gloss: 0.22, sun: '#ffeed6', sunPower: 1.05, ambient: '#c2c4c8', sunDir: [-0.5, 0.42, 0.76],
    window: { cols: 2, rows: 3, width: 1.3, height: 2.0, mullion: 0.07, soft: 0.05, at: [0.3, 0.35] }, vignette: 0.32
  };
  var DEFAULTS = {
    pane: { shape: 'rect', width: 0.8, at: [0, 0.95, 0], corner: 0.03 },
    impact: { kind: 'throw', strength: 0.85, slowmo: 0.14, prop: { color: '#9aa1aa', radius: 0.036, metal: 1 }, tip: 0.6 },
    mend: { style: 'none', color: '#b8892a', light: '#f3d27c', duration: 1.8 },
    text: {
      pieces: function (n) { return n === 1 ? '1 piece' : n + ' pieces'; },
      state: { whole: 'Whole', broken: 'Broken', held: 'Held', rewinding: 'Rewinding', mended: 'Mended' },
      clock: function (t) { return t.toFixed(2) + ' s'; }
    },
    seed: 7, maxShards: 420, camera: { fov: 30, margin: 1.22, follow: 1 }
  };

  // =================================================================== 2. polygons (convex, CCW, [[x,y],…])
  function area(P) { var a = 0; for (var i = 0, j = P.length - 1; i < P.length; j = i++) a += P[j][0] * P[i][1] - P[i][0] * P[j][1]; return a / 2; }
  function centroid(P) {
    var a = 0, cx = 0, cy = 0, ox = P[0][0], oy = P[0][1];
    for (var i = 0, j = P.length - 1; i < P.length; j = i++) {
      var x0 = P[j][0] - ox, y0 = P[j][1] - oy, x1 = P[i][0] - ox, y1 = P[i][1] - oy, c = x0 * y1 - x1 * y0;
      a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c;
    }
    return Math.abs(a) < 1e-14 ? [ox, oy] : [ox + cx / (3 * a), oy + cy / (3 * a)];
  }
  function perim(P) { var s = 0; for (var i = 0, j = P.length - 1; i < P.length; j = i++) s += Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]); return s; }
  // keep the part of P where nx*x + ny*y <= c (Sutherland–Hodgman against one line)
  function clip(P, nx, ny, c) {
    var out = [], n = P.length;
    if (!n) return out;
    var s = P[n - 1], ds = nx * s[0] + ny * s[1] - c;
    for (var i = 0; i < n; i++) {
      var e = P[i], de = nx * e[0] + ny * e[1] - c;
      if (de <= 0) { if (ds > 0) out.push(cut(s, e, ds, de)); out.push(e); }
      else if (ds <= 0) out.push(cut(s, e, ds, de));
      s = e; ds = de;
    }
    var res = [];
    for (var k = 0; k < out.length; k++) { var q = res[res.length - 1]; if (!q || Math.abs(q[0] - out[k][0]) + Math.abs(q[1] - out[k][1]) > 1e-9) res.push(out[k]); }
    if (res.length > 1 && Math.abs(res[0][0] - res[res.length - 1][0]) + Math.abs(res[0][1] - res[res.length - 1][1]) < 1e-9) res.pop();
    return res.length >= 3 ? res : [];
  }
  function cut(s, e, ds, de) { var u = ds / (ds - de); return [s[0] + u * (e[0] - s[0]), s[1] + u * (e[1] - s[1])]; }
  function inside(P, x, y) { for (var i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][0] - P[j][0]) * (y - P[j][1]) - (P[i][1] - P[j][1]) * (x - P[j][0]) < -1e-12) return false; return true; }
  function convex(P) { for (var i = 0; i < P.length; i++) { var a = P[i], b = P[(i + 1) % P.length], c = P[(i + 2) % P.length]; if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) < -1e-10) return false; } return true; }
  // the outline of the pane in pane metres (origin at its centre, y up)
  function outline(shape, W, H, corner, PW, PH) {
    var P = [], i, k = W / PW;
    if (Array.isArray(shape)) return shape.map(function (p) { return [(p[0] - PW / 2) * k, (PH / 2 - p[1]) * k]; });
    if (shape === 'disc') { var r = Math.min(W, H) / 2; for (i = 0; i < 56; i++) P.push([r * Math.cos(i / 56 * TAU), r * Math.sin(i / 56 * TAU)]); return P; }
    if (shape === 'rounded') {
      var rc = Math.min(corner, W / 2, H / 2), cs = [[W / 2 - rc, -H / 2 + rc, -0.25], [W / 2 - rc, H / 2 - rc, 0], [-W / 2 + rc, H / 2 - rc, 0.25], [-W / 2 + rc, -H / 2 + rc, 0.5]];
      cs.forEach(function (c) { for (var j = 0; j <= 5; j++) { var a = (c[2] + j / 5 * 0.25) * TAU; P.push([c[0] + rc * Math.cos(a), c[1] + rc * Math.sin(a)]); } });
      return P;
    }
    return [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]];
  }

  // =================================================================== 3. fracture
  // fracture(P, q, s, crack, rng, ref) → { cells: [convex polys], lost: area that became dust, rays: [angles], r0 }
  // Rays leave the impact point q; every sector between two rays is cut by its own ring chords (jittered per sector, so
  // rings read as broken, stepped arcs); the innermost cells are the crushed zone and crumble further; long daggers are
  // cleaved along or across their length. Every cell is P ∩ half-planes, so the cells partition P exactly.
  function fracture(P, q, s, C, rng, ref) {
    var A = Math.abs(area(P)), size = Math.sqrt(A), R = 0, i, k;
    for (i = 0; i < P.length; i++) R = Math.max(R, Math.hypot(P[i][0] - q[0], P[i][1] - q[1]));
    var scale = clamp(size / ref, 0.35, 1.3);
    var N = Math.max(3, Math.round(C.rays * (0.55 + 0.45 * s) * (0.55 + 0.45 * scale)));
    var base = rng() * TAU, th = [];
    for (i = 0; i < N; i++) th.push(base + (i + (rng() - 0.5) * C.rayJitter) * TAU / N);
    th.sort(function (a, b) { return a - b; });
    for (var guard = 0; guard < 6; guard++) { // no sector wider than ~130°, so every wedge stays convex
      var add = false;
      for (i = 0; i < th.length; i++) { var nx = i + 1 < th.length ? th[i + 1] : th[0] + TAU; if (nx - th[i] > 2.3) { th.splice(i + 1, 0, (th[i] + nx) / 2); add = true; i++; } }
      if (!add) break;
    }
    var r0 = C.crush * Math.max(size, ref * 0.5) * (0.6 + 0.6 * s), radii = [], r = r0;
    for (k = 0; k < 24 && r < R * 0.97 && radii.length < C.rings + 1; k++) { radii.push(r); r *= C.ringGrow * (0.85 + 0.3 * rng()); }
    var cells = [], lost = 0;
    function keep(cell, band, dir) { if (cell.length >= 3) cells.push({ p: cell, band: band, dir: dir }); }
    for (i = 0; i < th.length; i++) {
      var a = th[i], b = i + 1 < th.length ? th[i + 1] : th[0] + TAU;
      var da = [Math.cos(a), Math.sin(a)], db = [Math.cos(b), Math.sin(b)];
      var W = clip(P, da[1], -da[0], da[1] * q[0] - da[0] * q[1]);          // left of ray a
      W = clip(W, -db[1], db[0], -db[1] * q[0] + db[0] * q[1]);              // right of ray b
      if (W.length < 3) continue;
      var rest = W, pa = 0, pb = 0, band = 0, mid = (a + b) / 2;
      for (k = 0; k < radii.length; k++) {
        if (k > 0 && rng() < C.ringSkip) continue;
        var ra = radii[k] * (1 + (rng() - 0.5) * 2 * C.ringJitter), rb = radii[k] * (1 + (rng() - 0.5) * 2 * C.ringJitter);
        if (ra < pa * 1.12) ra = pa * 1.12 + 1e-4; if (rb < pb * 1.12) rb = pb * 1.12 + 1e-4;
        var Ax = q[0] + ra * da[0], Ay = q[1] + ra * da[1], Bx = q[0] + rb * db[0], By = q[1] + rb * db[1];
        var cnx = By - Ay, cny = Ax - Bx;                                        // chord normal, pointing away from q
        if (cnx * (q[0] - Ax) + cny * (q[1] - Ay) > 0) { cnx = -cnx; cny = -cny; }
        var cc = cnx * Ax + cny * Ay;
        keep(clip(rest, cnx, cny, cc), band++, mid);
        rest = clip(rest, -cnx, -cny, -cc);
        pa = ra; pb = rb;
        if (!rest.length) break;
      }
      keep(rest, band, mid);
    }
    // crumble the crushed zone, cleave long daggers
    var out = [], maxA = C.cleave * ref * ref;
    function split(cell, ang) {
      var c = centroid(cell), nx = Math.cos(ang), ny = Math.sin(ang), cc = nx * c[0] + ny * c[1];
      return [clip(cell, nx, ny, cc), clip(cell, -nx, -ny, -cc)];
    }
    function push(cell, depth, dir, band) {
      if (cell.length < 3) return;
      var ar = Math.abs(area(cell));
      if (ar > maxA && depth < 3) {
        var along = rng() < 0.6;                                                // along the dagger, or across it
        var sp = split(cell, dir + (along ? Math.PI / 2 : 0) + (rng() - 0.5) * 0.5);
        push(sp[0], depth + 1, dir, band); push(sp[1], depth + 1, dir, band); return;
      }
      if (band === 0 && depth === 0 && ar > 8 * C.minArea && rng() < C.crumble) {
        var s2 = split(cell, rng() * Math.PI);
        push(s2[0], 3, dir, band); push(s2[1], 3, dir, band); return;
      }
      var pe = perim(cell);
      if (ar < C.minArea || ar < 0.012 * pe * pe) { lost += ar; return; }  // slivers and crumbs turn to dust
      out.push(cell);
    }
    cells.forEach(function (c) { push(c.p, 0, c.dir, c.band); });
    return { cells: out, lost: lost, rays: th, r0: r0 };
  }

  // =================================================================== 4. simulation + tape
  // Thin rigid plates (and one kind of ball) under gravity and air, colliding with the floor and the back wall (not with
  // each other: a resting piece lies a hair above the floor by its id, so piles read without contact solving). Fixed
  // step H; a tape frame every KEY steps holds every body's full state, so any moment can be shown (poseAt) and the
  // simulation can resume from it (truncate).
  var H = 1 / 240, KEY = 6, STATE = 14, G = 9.81, SLOP = 0.0006;
  function quatMat(q) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    return [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y)];
  }
  function axisQuat(ax, ay, az, ang) { var l = Math.hypot(ax, ay, az) || 1, s = Math.sin(ang / 2) / l; return [ax * s, ay * s, az * s, Math.cos(ang / 2)]; }
  function qmul(a, b) { return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]; }
  function rot(R, x, y, z) { return [R[0] * x + R[3] * y + R[6] * z, R[1] * x + R[4] * y + R[7] * z, R[2] * x + R[5] * y + R[8] * z]; }
  function rotT(R, v) { return [R[0] * v[0] + R[1] * v[1] + R[2] * v[2], R[3] * v[0] + R[4] * v[1] + R[5] * v[2], R[6] * v[0] + R[7] * v[1] + R[8] * v[2]]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

  function Sim(o) {
    var M = o.material, P = M.physics, th = M.thickness, rng = HIC.rng(o.seed), sim = this;
    var bodies = [], frames = [], events = [], breaks = [];
    var time = 0, steps = 0, idle = true, refSize = o.refSize;
    sim.bodies = bodies; sim.frames = frames; sim.events = events;
    var planes = [{ n: [0, 1, 0], d: 0 }, { n: [0, 0, 1], d: o.wallZ }];

    function inertia(poly, m, ar) { // second moments of the polygon about its centroid (axes in the plane), plus thickness
      var ix = 0, iy = 0;
      for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        var x0 = poly[j][0], y0 = poly[j][1], x1 = poly[i][0], y1 = poly[i][1], c = x0 * y1 - x1 * y0;
        ix += c * (y0 * y0 + y0 * y1 + y1 * y1); iy += c * (x0 * x0 + x0 * x1 + x1 * x1);
      }
      var rho = m / Math.max(ar, 1e-9); ix = Math.abs(ix) / 12 * rho; iy = Math.abs(iy) / 12 * rho;
      var t2 = m * th * th / 12;
      return [1 / (ix + t2), 1 / (iy + t2), 1 / (ix + iy)];
    }
    // a shard from a pane-space polygon; pose: world position of its centroid, orientation of the pane frame
    function addShard(poly, pos, q, gen) {
      var c = centroid(poly), ar = Math.abs(area(poly)), m = Math.max(1e-5, ar * th * P.density), loc = [], rad = 0;
      for (var i = 0; i < poly.length; i++) { loc.push([poly[i][0] - c[0], poly[i][1] - c[1]]); rad = Math.max(rad, Math.hypot(loc[i][0], loc[i][1])); }
      var b = { id: bodies.length, kind: 'shard', poly: poly, c: c, loc: loc, area: ar, m: m, inv: inertia(loc, m, ar), rad: rad, gen: gen || 0,
        born: time, died: Infinity, p: pos.slice(), q: q.slice(), v: [0, 0, 0], w: [0, 0, 0], awake: 1, calm: 0, held: 0, release: 0, life: 0,
        lift: 0.0004 + (bodies.length % 9) * 0.00045, pp: pos.slice(), pq: q.slice() };
      bodies.push(b);
      return b;
    }
    function addBall(pos, vel, r, mass) {
      var b = { id: bodies.length, kind: 'ball', r: r, m: mass, inv: [0, 0, 0], area: 0, born: time, died: Infinity, p: pos.slice(), q: [0, 0, 0, 1], v: vel.slice(), w: [0, 0, 0],
        awake: 1, calm: 0, held: 0, release: 0, life: 0, lift: 0, pp: pos.slice(), pq: [0, 0, 0, 1] };
      bodies.push(b); return b;
    }
    sim.addShard = addShard; sim.addBall = addBall;
    sim.alive = function (b, t) { return b.born <= t && t < b.died; };

    function record() {
      var n = bodies.length, d = new Float32Array(n * STATE);
      for (var i = 0; i < n; i++) {
        var b = bodies[i], o2 = i * STATE;
        d[o2] = b.p[0]; d[o2 + 1] = b.p[1]; d[o2 + 2] = b.p[2]; d[o2 + 3] = b.q[0]; d[o2 + 4] = b.q[1]; d[o2 + 5] = b.q[2]; d[o2 + 6] = b.q[3];
        d[o2 + 7] = b.v[0]; d[o2 + 8] = b.v[1]; d[o2 + 9] = b.v[2]; d[o2 + 10] = b.w[0]; d[o2 + 11] = b.w[1]; d[o2 + 12] = b.w[2];
        d[o2 + 13] = b.awake + (b.held ? 2 : 0);
      }
      if (frames.length && frames[frames.length - 1].t === time) frames[frames.length - 1] = { t: time, n: n, d: d };
      else frames.push({ t: time, n: n, d: d });
    }
    sim.record = record;

    // world inverse inertia times x
    function iw(b, R, x) { var y = rotT(R, x); return rot(R, y[0] * b.inv[0], y[1] * b.inv[1], y[2] * b.inv[2]); }
    function impulseAt(b, R, r, n, j) {
      b.v[0] += n[0] * j / b.m; b.v[1] += n[1] * j / b.m; b.v[2] += n[2] * j / b.m;
      if (b.kind === 'shard') { var dw = iw(b, R, cross(r, [n[0] * j, n[1] * j, n[2] * j])); b.w[0] += dw[0]; b.w[1] += dw[1]; b.w[2] += dw[2]; }
    }
    function stepBody(b) {
      b.pp[0] = b.p[0]; b.pp[1] = b.p[1]; b.pp[2] = b.p[2]; b.pq[0] = b.q[0]; b.pq[1] = b.q[1]; b.pq[2] = b.q[2]; b.pq[3] = b.q[3];
      if (!b.awake) return;
      if (b.held) { if (b.release > 0 && time >= b.release) b.held = 0; else return; }
      b.life += H;
      var R = quatMat(b.q), i, k;
      // gravity, air: drag across the plate (with a centre of pressure ahead of the centroid, so big flat pieces glide
      // and tumble a little) plus plain damping
      b.v[1] -= G * H;
      if (b.kind === 'shard') {
        var n = [R[6], R[7], R[8]], vn = dot(b.v, n), f = -0.72 * P.air * b.area * vn * Math.abs(vn) / b.m * H;
        b.v[0] += n[0] * f; b.v[1] += n[1] * f; b.v[2] += n[2] * f;
        var vin = [b.v[0] - n[0] * vn, b.v[1] - n[1] * vn, b.v[2] - n[2] * vn], vl = Math.hypot(vin[0], vin[1], vin[2]);
        if (vl > 0.05) { var rc = [vin[0] / vl * b.rad * 0.25, vin[1] / vl * b.rad * 0.25, vin[2] / vl * b.rad * 0.25], tq = iw(b, R, cross(rc, [n[0] * f * b.m, n[1] * f * b.m, n[2] * f * b.m])); b.w[0] += tq[0]; b.w[1] += tq[1]; b.w[2] += tq[2]; }
        var ad = Math.exp(-0.35 * H); b.w[0] *= ad; b.w[1] *= ad; b.w[2] *= ad;
      }
      var ld = Math.exp(-0.04 * H); b.v[0] *= ld; b.v[1] *= ld; b.v[2] *= ld;
      // contacts with the floor and the wall
      var touching = false, hit = 0, hitAt = null, hitN = null;
      for (var pi = 0; pi < planes.length; pi++) {
        var pl = planes[pi], d0 = pl.d + (pi === 0 ? b.lift : 0), cs = [], deep = 0;
        if (b.kind === 'ball') {
          var dist = dot(pl.n, b.p) - d0 - b.r;
          if (dist < SLOP) { cs.push({ r: [-pl.n[0] * b.r, -pl.n[1] * b.r, -pl.n[2] * b.r], depth: -dist }); deep = Math.max(deep, -dist); }
        } else {
          for (i = 0; i < b.loc.length; i++) for (k = -1; k <= 1; k += 2) {
            var r = rot(R, b.loc[i][0], b.loc[i][1], k * th / 2), dd = pl.n[0] * (b.p[0] + r[0]) + pl.n[1] * (b.p[1] + r[1]) + pl.n[2] * (b.p[2] + r[2]) - d0;
            if (dd < SLOP) { cs.push({ r: r, depth: -dd }); if (-dd > deep) deep = -dd; }
          }
        }
        if (!cs.length) continue;
        touching = true;
        // one impulse at the centre of the contact patch (weighted by depth): a plate on its face takes no torque from
        // the floor, one on an edge or a corner tips over it
        var ra = [0, 0, 0], wsum = 0;
        for (i = 0; i < cs.length; i++) { var wt = cs[i].depth + SLOP; ra[0] += cs[i].r[0] * wt; ra[1] += cs[i].r[1] * wt; ra[2] += cs[i].r[2] * wt; wsum += wt; }
        ra = [ra[0] / wsum, ra[1] / wsum, ra[2] / wsum];
        for (var it = 0; it < 2; it++) {
          var vr = b.kind === 'ball' ? b.v.slice() : [b.v[0] + b.w[1] * ra[2] - b.w[2] * ra[1], b.v[1] + b.w[2] * ra[0] - b.w[0] * ra[2], b.v[2] + b.w[0] * ra[1] - b.w[1] * ra[0]];
          var vn2 = dot(vr, pl.n);
          if (it === 0 && -vn2 > hit) { hit = -vn2; hitAt = ra; hitN = pl.n; }
          if (vn2 >= 0) break;
          var e = it === 0 && vn2 < -0.7 ? (b.kind === 'ball' ? 0.45 : P.bounce) : 0;
          var rn = cross(ra, pl.n), kk = 1 / b.m + (b.kind === 'shard' ? dot(cross(iw(b, R, rn), ra), pl.n) : 0);
          var j = -(1 + e) * vn2 / kk;
          impulseAt(b, R, ra, pl.n, j);
          vr = b.kind === 'ball' ? b.v.slice() : [b.v[0] + b.w[1] * ra[2] - b.w[2] * ra[1], b.v[1] + b.w[2] * ra[0] - b.w[0] * ra[2], b.v[2] + b.w[0] * ra[1] - b.w[1] * ra[0]];
          var vnn = dot(vr, pl.n), vt = [vr[0] - pl.n[0] * vnn, vr[1] - pl.n[1] * vnn, vr[2] - pl.n[2] * vnn], vtl = Math.hypot(vt[0], vt[1], vt[2]);
          if (vtl > 1e-6) {
            var t = [-vt[0] / vtl, -vt[1] / vtl, -vt[2] / vtl], kt = 1 / b.m + (b.kind === 'shard' ? dot(cross(iw(b, R, cross(ra, t)), ra), t) : 0);
            impulseAt(b, R, ra, t, Math.min(vtl / kt, P.friction * Math.abs(j) + (cs.length >= 3 ? b.m * G * H * P.friction : 0)));
          }
          if (b.kind === 'shard' && cs.length >= 3) { var tw = dot(b.w, pl.n), sd = Math.min(Math.abs(tw), P.friction * G * H * 40) * Math.sign(tw); b.w[0] -= pl.n[0] * sd; b.w[1] -= pl.n[1] * sd; b.w[2] -= pl.n[2] * sd; } // a plate lying on its face stops turning
        }
        var corr = Math.max(0, deep - SLOP * 0.5) * 0.6; b.p[0] += pl.n[0] * corr; b.p[1] += pl.n[1] * corr; b.p[2] += pl.n[2] * corr;
        if (b.kind === 'shard' && cs.length >= 2) {                         // rolling resistance: a plate on its face stops rocking
          var rr = Math.exp(-(cs.length >= 3 ? 9 : 3) * H); b.w[0] *= rr; b.w[1] *= rr; b.w[2] *= rr;
        }
      }
      if (hit > 0.45) {
        events.push({ id: b.id, speed: hit, t: time, kind: b.kind, size: b.kind === 'ball' ? 0 : Math.sqrt(b.area) });
        if (b.kind === 'shard' && P.breakSpeed > 0 && hit > P.breakSpeed && b.area > Math.max(16 * M.crack.minArea, 0.012 * refSize * refSize) && b.gen < 3) {
          var lp = rotT(R, hitAt); breaks.push({ id: b.id, at: [lp[0] + b.c[0], lp[1] + b.c[1]], speed: hit, n: hitN });
        }
      }
      // clamp, integrate
      var sp = Math.hypot(b.v[0], b.v[1], b.v[2]); if (sp > 25) { b.v[0] *= 25 / sp; b.v[1] *= 25 / sp; b.v[2] *= 25 / sp; }
      var wl = Math.hypot(b.w[0], b.w[1], b.w[2]); if (wl > 60) { b.w[0] *= 60 / wl; b.w[1] *= 60 / wl; b.w[2] *= 60 / wl; }
      b.p[0] += b.v[0] * H; b.p[1] += b.v[1] * H; b.p[2] += b.v[2] * H;
      var q = b.q, w = b.w, h = H / 2;
      var qx = q[0] + h * (w[0] * q[3] + w[1] * q[2] - w[2] * q[1]), qy = q[1] + h * (w[1] * q[3] + w[2] * q[0] - w[0] * q[2]);
      var qz = q[2] + h * (w[2] * q[3] + w[0] * q[1] - w[1] * q[0]), qw = q[3] - h * (w[0] * q[0] + w[1] * q[1] + w[2] * q[2]), ql = Math.hypot(qx, qy, qz, qw);
      q[0] = qx / ql; q[1] = qy / ql; q[2] = qz / ql; q[3] = qw / ql;
      // sleep: slow and touching for a moment (or touching for a long time)
      if (touching && sp + wl * (b.rad || b.r) < 0.08) b.calm += H; else b.calm = 0;
      if (b.kind === 'shard' && touching && sp < 0.25 && wl < 2.5 && b.p[1] < th * 3 + b.lift) {   // nearly flat and slow on the floor: let it lie down
        var ny = R[7];
        if (Math.abs(ny) > 0.985) { var tgt = ny > 0 ? 1 : -1, ax = [R[8] * tgt, 0, -R[6] * tgt], an = Math.asin(clamp(Math.hypot(ax[0], ax[2]), 0, 1));
          if (an > 1e-5) { var dq = axisQuat(ax[0], 0, ax[2], -an * 0.15), nq = qmul(dq, b.q); b.q[0] = nq[0]; b.q[1] = nq[1]; b.q[2] = nq[2]; b.q[3] = nq[3]; }
          b.w[0] *= 0.9; b.w[2] *= 0.9; }
      }
      if (b.calm > 0.3 || (touching && b.life > 5 && sp < 0.3) || (touching && b.life > 12) || b.p[1] < -1) { b.awake = 0; b.v = [0, 0, 0]; b.w = [0, 0, 0]; b.calm = 0; }
    }

    sim.step = function () {
      events.length = 0;
      for (var i = 0; i < bodies.length; i++) { var b = bodies[i]; if (b.died === Infinity) stepBody(b); }
      time += H; steps++;
      if (breaks.length) { var bs = breaks.splice(0); bs.forEach(function (x) { var b = bodies[x.id]; if (b.died !== Infinity) return; var s = clamp(x.speed / 6, 0.35, 1), r = sim.strike(x.id, x.at, null, s, 'land'); if (sim.onBreak) sim.onBreak(r, s); }); }
      if (steps % KEY === 0) record();
      var any = false; for (i = 0; i < bodies.length && !any; i++) { var c = bodies[i]; if (c.died === Infinity && c.awake && !(c.held && !c.release)) any = true; }
      if (!any) { record(); idle = true; }
      return events;
    };
    Object.defineProperty(sim, 'time', { get: function () { return time; } });
    Object.defineProperty(sim, 'idle', { get: function () { return idle; } });
    sim.awakeCount = function () { var n = 0; bodies.forEach(function (b) { if (b.died === Infinity && b.awake && !(b.held && !b.release)) n++; }); return n; };
    // advance the tape one step if anything moves (the time when everything rests is cut out of the tape)
    sim.tick = function () { if (idle) return null; return sim.step(); };

    // strike body `id` at pane point `at` (shards) — dir: world direction of the blow (null for a landing) — kind:
    // 'blow' (a projectile or a tap pushes the pieces along dir) or 'land' (the piece hit the floor: pieces spray out
    // and up). Returns { pieces: [bodies], cracked, lost, rays, r0 }.
    sim.strike = function (id, at, dir, s, kind) {
      var b = bodies[id];
      if (!b || b.kind !== 'shard') return { pieces: [], cracked: false };
      // each blow has its own seeded stream (seed, piece, impact point): the same blow always makes the same pieces
      var rng = HIC.rng((o.seed * 7919 + b.id * 104729 + Math.round(at[0] * 1e4) * 31 + Math.round(at[1] * 1e4) * 17 + Math.round(time * 240)) >>> 0);
      if (time === 0) { record(); time = H; }                           // keep t = 0 as the intact pane on the tape
      idle = false;
      var R = quatMat(b.q), n = [R[6], R[7], R[8]];
      var res = bodies.length < o.maxShards - 4 && b.area > 6 * M.crack.minArea ? fracture(b.poly, at, s, M.crack, rng, refSize) : { cells: [], lost: 0, rays: [], r0: 0 };
      var hp = rot(R, at[0] - b.c[0], at[1] - b.c[1], 0); hp = [b.p[0] + hp[0], b.p[1] + hp[1], b.p[2] + hp[2]];
      var D = dir || [-n[0], -n[1], -n[2]];
      if (res.cells.length < 2) {                                         // too small to break: it is knocked away
        b.awake = 1; b.held = 0; b.calm = 0;
        impulseAt(b, R, [hp[0] - b.p[0], hp[1] - b.p[1], hp[2] - b.p[2]], kind === 'land' ? [0, 1, 0] : D, b.m * (kind === 'land' ? 0.5 : 2.2 * s));
        record();
        return { pieces: [b], cracked: false, lost: 0, rays: [], r0: 0 };
      }
      record();
      b.died = time;
      var pieces = [], heldParent = b.held && !b.release, Rr = res.r0 || 0.05, PH = M.physics;
      res.cells.forEach(function (cell) {
        var c = centroid(cell), lr = rot(R, c[0] - b.c[0], c[1] - b.c[1], 0);
        var ch = addShard(cell, [b.p[0] + lr[0], b.p[1] + lr[1], b.p[2] + lr[2]], b.q, b.gen + 1);
        var dx = c[0] - at[0], dy = c[1] - at[1], dl = Math.hypot(dx, dy) || 1e-6, near = Math.pow(clamp(1 - dl / (Rr * 3.2), 0, 1), 1.5);
        var out = rot(R, dx / dl, dy / dl, 0), wv = cross(b.w, lr);
        ch.v = [b.v[0] + wv[0], b.v[1] + wv[1], b.v[2] + wv[2]];
        var big = clamp(Math.sqrt(ch.area) / (refSize * 0.25), 0.2, 1.5), j = (rng() - 0.5);
        if (kind === 'land') {
          var up = Math.abs(ch.v[1]) * PH.bounce;
          ch.v[1] = Math.max(0, -ch.v[1] * 0.0) + up * (0.6 + 0.8 * rng());
          var spread = s * PH.throw * (1.2 + 2.4 * near) / Math.sqrt(big);
          ch.v[0] = ch.v[0] * 0.5 + out[0] * spread + j * 0.3; ch.v[2] = ch.v[2] * 0.5 + out[2] * spread + (rng() - 0.5) * 0.3; ch.v[1] += 0.4 * spread * rng();
        } else {
          var push = s * PH.throw * (0.25 + 3.6 * near) * (0.6 + 0.8 * rng()) / Math.sqrt(big), side = s * PH.throw * near * 0.9;
          ch.v[0] += D[0] * push + out[0] * side + j * 0.15; ch.v[1] += D[1] * push + out[1] * side + 0.25 * near; ch.v[2] += D[2] * push + out[2] * side;
        }
        // spin: crushed bits tumble fast; far daggers tip over along the blow and outwards
        var spin = PH.spin * (1 + 5 * near) / big, ax = [rng() - 0.5, rng() - 0.5, rng() - 0.5];
        var tip = cross(n, out), tipS = PH.spin * (kind === 'land' ? 2.5 : 1.6) * (1 - near) * (0.5 + rng());
        ch.w = [b.w[0] + ax[0] * spin * 2 + tip[0] * tipS, b.w[1] + ax[1] * spin * 2 + tip[1] * tipS, b.w[2] + ax[2] * spin * 2 + tip[2] * tipS];
        if (heldParent) { ch.held = 1; ch.release = time + dl * 0.05 * (0.7 + 0.6 * rng()) * (1 / Math.max(0.3, s)); }
        pieces.push(ch);
      });
      // wake and nudge what lies near
      bodies.forEach(function (o2) {
        if (o2.died !== Infinity || pieces.indexOf(o2) >= 0) return;
        var d = Math.hypot(o2.p[0] - hp[0], o2.p[1] - hp[1], o2.p[2] - hp[2]);
        if (d < 0.25) { o2.awake = 1; o2.calm = 0; o2.v[1] += 0.6 * (1 - d / 0.25) * s; o2.w[0] += (rng() - 0.5) * 3; o2.w[2] += (rng() - 0.5) * 3; }
      });
      record();
      return { pieces: pieces, cracked: true, lost: res.lost, rays: res.rays, r0: res.r0, at: hp };
    };
    // release a held body (the 'drop' impact): it slips and falls, tipping by `tip` rad/s
    sim.release = function (id, tip, push) {
      var b = bodies[id]; if (!b) return;
      var rng = HIC.rng((o.seed * 31 + id * 7 + Math.round(time * 240)) >>> 0);
      if (time === 0) { record(); time = H; }
      record();
      b.held = 0; b.awake = 1; b.w = [tip, (rng() - 0.5) * 0.3, (rng() - 0.5) * 0.4]; b.v = push || [0, 0, 0.05]; idle = false;
      record();
    };

    // the state of every body at tape time t, into view {p: Float32Array, q, alive: Uint8Array, n}
    sim.view = { p: new Float32Array(0), q: new Float32Array(0), alive: new Uint8Array(0), n: 0 };
    function viewSize(n) { var v = sim.view; if (v.alive.length < n) { v.p = new Float32Array(n * 3 + 96); v.q = new Float32Array(n * 4 + 128); v.alive = new Uint8Array(n + 32); } v.n = n; return v; }
    sim.liveView = function (alpha) { // the current state, blended from the previous step by alpha (smooth slow motion)
      var v = viewSize(bodies.length), a = alpha === undefined ? 1 : alpha;
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i]; v.alive[i] = b.died === Infinity ? 1 : 0;
        for (var k = 0; k < 3; k++) v.p[i * 3 + k] = mix(b.pp[k], b.p[k], a);
        var d = b.pq[0] * b.q[0] + b.pq[1] * b.q[1] + b.pq[2] * b.q[2] + b.pq[3] * b.q[3], sg = d < 0 ? -1 : 1, l = 0;
        for (k = 0; k < 4; k++) { v.q[i * 4 + k] = mix(b.pq[k] * sg, b.q[k], a); l += v.q[i * 4 + k] * v.q[i * 4 + k]; }
        l = Math.sqrt(l) || 1; for (k = 0; k < 4; k++) v.q[i * 4 + k] /= l;
      }
      return v;
    };
    function frameAt(t) { var lo = 0, hi = frames.length - 1; if (hi < 0) return -1; if (t < frames[0].t) return 0; while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (frames[mid].t <= t) lo = mid; else hi = mid - 1; } return lo; }
    sim.poseAt = function (t) {
      if (t >= time - 1e-9) return sim.liveView(1);
      var v = viewSize(bodies.length), k = frameAt(t), A = frames[k], B = frames[Math.min(k + 1, frames.length - 1)];
      var f = B.t > A.t ? clamp((t - A.t) / (B.t - A.t), 0, 1) : 0;
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i]; v.alive[i] = sim.alive(b, t) ? 1 : 0;
        if (!v.alive[i]) continue;
        var a = i < A.n ? A : B, c = i < B.n ? B : A, ff = a === c ? 0 : f, oa = i * STATE, l = 0, j;
        if (i >= a.n) { v.alive[i] = 0; continue; }
        for (j = 0; j < 3; j++) v.p[i * 3 + j] = mix(a.d[oa + j], c.d[oa + j], ff);
        var dq = a.d[oa + 3] * c.d[oa + 3] + a.d[oa + 4] * c.d[oa + 4] + a.d[oa + 5] * c.d[oa + 5] + a.d[oa + 6] * c.d[oa + 6], sg = dq < 0 ? -1 : 1;
        for (j = 0; j < 4; j++) { v.q[i * 4 + j] = mix(a.d[oa + 3 + j] * sg, c.d[oa + 3 + j], ff); l += v.q[i * 4 + j] * v.q[i * 4 + j]; }
        l = Math.sqrt(l) || 1; for (j = 0; j < 4; j++) v.q[i * 4 + j] /= l;
      }
      return v;
    };
    // resume from tape time t: everything after it is forgotten
    sim.truncate = function (t) {
      if (t >= time - 1e-9 || !frames.length) return;
      var k = frameAt(t), F = frames[k];
      frames.length = k + 1; time = F.t;
      var removed = bodies.splice(F.n);
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i], o2 = i * STATE, d = F.d;
        b.p = [d[o2], d[o2 + 1], d[o2 + 2]]; b.q = [d[o2 + 3], d[o2 + 4], d[o2 + 5], d[o2 + 6]]; b.v = [d[o2 + 7], d[o2 + 8], d[o2 + 9]]; b.w = [d[o2 + 10], d[o2 + 11], d[o2 + 12]];
        b.awake = d[o2 + 13] % 2; b.held = d[o2 + 13] >= 2 ? 1 : 0; b.calm = 0; b.pp = b.p.slice(); b.pq = b.q.slice();
        if (b.held && b.release && b.release <= time) b.held = 0;
        if (b.died > time) b.died = Infinity;
      }
      idle = sim.awakeCount() === 0;
      return removed;
    };
    sim.reset = function () { frames.length = 0; time = 0; steps = 0; idle = true; };
    // ray (world) against every alive shard at the current view; returns sorted hits {id, t, at: pane point}
    sim.pickAll = function (o3, d) {
      var v = sim.view, hits = [];
      for (var i = 0; i < v.n; i++) {
        var b = bodies[i]; if (!v.alive[i] || b.kind !== 'shard') continue;
        var q = [v.q[i * 4], v.q[i * 4 + 1], v.q[i * 4 + 2], v.q[i * 4 + 3]], R = quatMat(q), n = [R[6], R[7], R[8]], p = [v.p[i * 3], v.p[i * 3 + 1], v.p[i * 3 + 2]];
        var den = dot(n, d); if (Math.abs(den) < 1e-6) continue;
        var t = (dot(n, p) - dot(n, o3)) / den; if (t <= 0) continue;
        var l = rotT(R, [o3[0] + d[0] * t - p[0], o3[1] + d[1] * t - p[1], o3[2] + d[2] * t - p[2]]), ax = l[0] + b.c[0], ay = l[1] + b.c[1];
        if (inside(b.poly, ax, ay)) hits.push({ id: i, t: t, at: [ax, ay] });
      }
      return hits.sort(function (a, b) { return a.t - b.t; });
    };
  }

  // =================================================================== 5. renderer
  var VS_SHARD = [
    '#version 300 es', 'precision highp float;',
    'layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec2 aUv; layout(location=3) in vec2 aEt;',
    'uniform mat4 uVP, uModel;',
    'out vec3 vW, vN; out vec2 vUv; out float vEdge, vType, vZ;',
    'void main(){ vec4 w = uModel*vec4(aPos,1.); vW = w.xyz; vN = mat3(uModel)*aNrm; vUv = aUv; vEdge = aEt.x; vType = aEt.y; vZ = aPos.z; gl_Position = uVP*w; }'
  ].join('\n');
  // what a reflection sees: the bright window the sun comes through, a pale room, a darker floor
  var ENV = [
    'vec3 env(vec3 r){',
    '  float w = smoothstep(0.86, 0.97, dot(r, uSunDir));',
    '  vec3 room = mix(uFloorCol*0.7, uWallCol*1.05, smoothstep(-0.35, 0.25, r.y));',
    '  return room + uSunCol*w*1.4 + vec3(0.12)*smoothstep(0.2, 1.0, r.y); }'
  ].join('\n');
  var FS_SHARD = [
    '#version 300 es', 'precision highp float;',
    'in vec3 vW, vN; in vec2 vUv; in float vEdge, vType, vZ; out vec4 o;',
    'uniform sampler2D uPage, uRoom; uniform vec2 uRes; uniform mat4 uVP; uniform vec3 uCam, uSunDir, uSunCol, uAmb, uTint, uEdgeCol, uGlaze, uBackCol, uWallCol, uFloorCol;',
    'uniform float uOpaque, uBody, uFrost, uRefr, uTh, uSweep, uSeal, uFade, uPrintBack, uEdgeA, uRim, uShine, uPicked;',
    ENV,
    'vec3 shoulder(vec3 c){ return mix(c, 0.8 + 0.2*(1. - exp(-(c - 0.8)*4.)), step(0.8, c)); }',
    'void main(){',
    '  vec3 N = normalize(vN); if(!gl_FrontFacing) N = -N; vec3 V = normalize(uCam - vW);',
    '  float ndv = clamp(dot(N,V), 0., 1.), fres = 0.04 + 0.96*pow(1.-ndv, 5.);',
    '  vec3 R = reflect(-V, N); float rs = max(dot(R, uSunDir), 0.);',
    '  vec3 spec = uSunCol*(pow(rs, 220.)*4.0 + pow(rs, 18.)*0.12)*uShine;',
    '  float diff = max(dot(N, uSunDir), 0.); vec3 light = uAmb + uSunCol*diff*0.85;',
    '  vec2 suv = gl_FragCoord.xy/uRes;',
    '  float sweep = exp(-pow((vW.x + vW.y*0.55 - uSweep)*7., 2.))*0.35;',
    '  if (vType < 1.5) {',
    '    bool back = vType > 0.5; vec4 pg = texture(uPage, vUv);',
    '    float rim = smoothstep(uRim, 0., vEdge), seal = uSeal*smoothstep(uRim*2.5, 0., vEdge);',
    '    if (uOpaque > 0.5) {',
    '      vec3 base = back ? uBackCol : mix(uGlaze, pg.rgb, pg.a);',
    '      if (back && uPrintBack > 0.) base = mix(base, pg.rgb, pg.a*uPrintBack);',
    '      vec3 c = base*(uAmb*0.78 + uSunCol*diff*0.5) + env(R)*fres*0.5*uShine + spec*0.6 + vec3(sweep*0.3);',
    '      c = mix(c, uEdgeCol*light*1.05, rim*0.65) + rim*spec*2.;',
    '      o = vec4(shoulder(c)*uFade, uFade); return;',
    '    }',
    '    float a = pg.a * (back ? uPrintBack : 1.);',
    '    vec2 off = (uVP*vec4(N, 0.)).xy*uRefr;',
    '    vec3 bg = texture(uRoom, suv).rgb, rf = texture(uRoom, suv + off).rgb;',
    '    if (uFrost > 0.) { float k = uFrost*0.012; rf = (rf + texture(uRoom, suv+off+vec2(k,0.)).rgb + texture(uRoom, suv+off-vec2(k,0.)).rgb + texture(uRoom, suv+off+vec2(0.,k)).rgb + texture(uRoom, suv+off-vec2(0.,k)).rgb)/5.; }',
    '    float ob = clamp(uBody + fres*0.35, 0., 1.);',
    '    vec3 body = rf*uTint*(0.92 + 0.12*diff) + uTint*uFrost*0.12*light;',
    '    vec3 ink = pg.rgb/max(pg.a, 0.001)*(0.82 + 0.25*diff) * (back ? 0.85 : 1.);',
    '    vec3 c = ink*a + (1.-a)*(body*ob + (rf - bg)*(1.-ob));',
    '    float al = a + (1.-a)*ob;',
    '    vec3 refl = env(R)*fres*0.9 + spec + vec3(sweep) + uEdgeCol*rim*0.9 + vec3(rim*0.55) + vec3(seal)*vec3(1.,0.9,0.7) + vec3(uPicked*0.03);',
    '    c = shoulder(c + refl); al = clamp(al + rim*0.6 + fres*0.25 + sweep*0.3 + seal, 0., 1.);',
    '    o = vec4(c*uFade, al*uFade); return;',
    '  }',
    '  float z = abs(vZ)/(uTh*0.5), band = smoothstep(0.45, 1.0, z);',
    '  if (uOpaque > 0.5) {',
    '    vec3 c = mix(uEdgeCol, uGlaze, band*0.8)*(uAmb*0.8 + uSunCol*diff*0.55) + spec*band*0.6;',
    '    o = vec4(shoulder(c)*uFade, uFade); return;',
    '  }',
    '  vec3 c = uEdgeCol*(0.35 + 0.65*diff)*(0.55 + 0.75*(1.-ndv)) + vec3(0.55)*band + spec*2. + env(R)*fres*0.4;',
    '  o = vec4(c*uEdgeA*uFade, uEdgeA*uFade);',
    '}'
  ].join('\n');
  // shadow (transmittance) map: seen from the sun, the glass tints the light and the print shades it in its own colour
  var VS_SHADOW = [
    '#version 300 es', 'precision highp float;',
    'layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec2 aUv; layout(location=3) in vec2 aEt;',
    'uniform mat4 uModel; uniform vec3 uLC, uLU, uLV; uniform float uLE;',
    'out vec2 vUv; out float vType;',
    'void main(){ vec3 w = (uModel*vec4(aPos,1.)).xyz - uLC; vUv = aUv; vType = aEt.y; gl_Position = vec4(dot(w,uLU)/uLE, dot(w,uLV)/uLE, 0.5, 1.); }'
  ].join('\n');
  var FS_SHADOW = [
    '#version 300 es', 'precision highp float;', 'in vec2 vUv; in float vType; out vec4 o;',
    'uniform sampler2D uPage; uniform vec3 uTint, uEdgeCol; uniform float uOpaque, uBody;',
    'void main(){',
    '  if (vType > 0.5 && vType < 1.5) discard;',
    '  if (uOpaque > 0.5) { o = vec4(vec3(0.0), 1.); return; }',
    '  if (vType > 1.5) { o = vec4(uEdgeCol*0.35, 1.); return; }',
    '  vec4 pg = texture(uPage, vUv); vec3 glass = mix(vec3(1.), uTint, 0.55)*(1. - uBody*0.45);',
    '  o = vec4(mix(glass, pg.rgb/max(pg.a,0.001)*0.45, pg.a*0.9), 1.); }'
  ].join('\n');
  // the room: a ray per pixel against the floor and the wall, sunlight through a window, the coloured shadow of the glass
  var FS_ROOM = [
    '#version 300 es', 'precision highp float;', 'in vec2 vUv; out vec4 o;',
    'uniform mat4 uInv; uniform vec3 uCam, uSunDir, uSunCol, uAmb, uWallCol, uFloorCol, uSkirtCol, uLC, uLU, uLV, uBall;',
    'uniform float uWallZ, uLE, uSkirtH, uFloorStyle, uBoard, uVig, uBallR, uSunPow; uniform vec4 uWin, uWin2; uniform sampler2D uShadow;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }',
    'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }',
    'void main(){',
    '  vec2 nd = vUv*2. - 1.; vec4 a = uInv*vec4(nd, -1., 1.), b = uInv*vec4(nd, 1., 1.);',
    '  vec3 ro = uCam, rd = normalize(b.xyz/b.w - a.xyz/a.w);',
    '  float tF = rd.y < -1e-4 ? -ro.y/rd.y : 1e9, tW = rd.z < -1e-4 ? (uWallZ - ro.z)/rd.z : 1e9;',
    '  bool fl = tF < tW; float t = min(tF, tW); vec3 P = ro + rd*t, N = fl ? vec3(0,1,0) : vec3(0,0,1);',
    '  vec3 alb;',
    '  if (fl) {',
    '    alb = uFloorCol;',
    '    if (uFloorStyle < 0.5) { float bi = floor(P.x/uBoard); float sh = hash(vec2(bi, 3.)); float seam = smoothstep(0.004, 0.0, abs(fract(P.x/uBoard) - 0.5)*uBoard - uBoard*0.5 + 0.004);',
    '      float joint = smoothstep(0.003, 0.0, abs(fract(P.z/1.2 + sh) - 0.5)*1.2 - 0.597); alb *= (0.9 + 0.12*sh)*(0.94 + 0.08*noise(vec2(P.x*3., P.z*60.)))*(1. - 0.35*max(seam, joint)); }',
    '    else if (uFloorStyle < 1.5) { vec2 g = P.xz/uBoard; vec2 f = abs(fract(g) - 0.5); float grout = smoothstep(0.47, 0.5, max(f.x, f.y)); alb *= (0.9 + 0.14*hash(floor(g)))*(0.95 + 0.06*noise(P.xz*40.)); alb = mix(alb, uSkirtCol*0.8, grout); }',
    '    else alb *= 0.95 + 0.06*noise(P.xz*30.);',
    '  } else { alb = uWallCol*(0.97 + 0.035*noise(P.xy*35.) + 0.02*noise(P.xy*3.)); if (P.y < uSkirtH) alb = uSkirtCol*(P.y > uSkirtH - 0.006 ? 1.08 : 1.); }',
    '  vec3 L = uSunDir; float ndl = max(dot(N, L), 0.);',
    // the window, seen from P along the light: an orthographic projection on the plane across the sun
    '  vec3 U = normalize(cross(L, vec3(0,1,0))), Vv = cross(U, L); vec2 w = vec2(dot(P, U), dot(P, Vv)) - uWin2.xy;',
    '  vec2 hw = uWin.xy*0.5; float soft = uWin2.z;',
    '  float box = smoothstep(hw.x + soft, hw.x - soft, abs(w.x))*smoothstep(hw.y + soft, hw.y - soft, abs(w.y));',
    '  vec2 cs = uWin.xy/uWin.zw, f = abs(fract((w + hw)/cs) - 0.5)*cs, ed = cs*0.5 - f;',
    '  float lit = box*smoothstep(uWin2.w*0.5 - soft, uWin2.w*0.5 + soft, min(ed.x, ed.y));',
    '  vec3 q = P - uLC; vec2 suv = vec2(dot(q, uLU), dot(q, uLV))/uLE*0.5 + 0.5; vec3 T = vec3(0.);',
    '  float sk = 0.0018 + 0.0012*clamp(P.y + (fl ? 0. : (P.z - uWallZ)), 0., 2.);',
    '  for (int i = 0; i < 5; i++) { vec2 dd = i == 0 ? vec2(0.) : vec2(i==1?1.:i==2?-1.:0., i==3?1.:i==4?-1.:0.)*sk; T += texture(uShadow, suv + dd).rgb; } T /= 5.;',
    '  if (any(lessThan(suv, vec2(0.))) || any(greaterThan(suv, vec2(1.)))) T = vec3(1.);',
    '  if (uBallR > 0.) { vec3 bq = uBall - P; float along = dot(bq, L); vec3 perp = bq - L*along; float bd = length(perp); if (along > 0.) T *= mix(0.25, 1., smoothstep(uBallR*0.55, uBallR*1.5, bd)); }',
    '  float ao = 1. - 0.4*exp(-(fl ? P.z - uWallZ : P.y)*9.);',
    '  vec3 c = alb*(uAmb*ao + uSunCol*uSunPow*ndl*lit*T);',
    '  c = mix(c, 0.8 + 0.2*(1. - exp(-(c - 0.8)*4.)), step(0.8, c));',   // soft shoulder: the sun patch stays plaster, not white
    '  c *= 1. - uVig*pow(length(nd*vec2(0.85, 1.)), 2.4)*0.6;',
    '  o = vec4(c, 1.); }'
  ].join('\n');
  var FS_COPY = '#version 300 es\nprecision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uTex; void main(){ o = vec4(texture(uTex, vUv).rgb, 1.); }';
  // glass dust: each speck flies a closed-form arc from its strike, so it rewinds with the tape for free
  var VS_DUST = [
    '#version 300 es', 'precision highp float;',
    'layout(location=0) in vec3 aP; layout(location=1) in vec3 aV; layout(location=2) in vec2 aTS;',
    'uniform mat4 uVP; uniform float uT, uFocal; uniform vec3 uCam; out float vA; out float vS;',
    'void main(){ float t = uT - aTS.x; if (t < 0.) { gl_Position = vec4(2.,2.,2.,1.); gl_PointSize = 0.; vA = 0.; return; }',
    '  float vy = aV.y, y0 = aP.y, tl = (vy + sqrt(vy*vy + 2.*9.81*max(y0,0.)))/9.81; float tf = min(t, tl);',
    '  vec3 p = aP + vec3(aV.x, 0., aV.z)*tf + vec3(0., vy*tf - 4.905*tf*tf, 0.);',
    '  if (t > tl) { float s = min(t - tl, 0.12); p.xz += aV.xz*s*0.35; p.y = 0.0006; }',
    '  gl_Position = uVP*vec4(p, 1.); float d = length(uCam - p); gl_PointSize = clamp(aTS.y*uFocal/d, 1.0, 7.0); vA = 1.; vS = aTS.y; }'
  ].join('\n');
  var FS_DUST = '#version 300 es\nprecision highp float; in float vA; in float vS; out vec4 o; uniform vec3 uCol; void main(){ vec2 c = gl_PointCoord - 0.5; float r = length(c); if (r > 0.5 || vA <= 0.) discard; float k = smoothstep(0.5, 0.0, r); o = vec4(uCol*k, k*0.85); }';
  // the projectile: a sphere drawn on a point sprite
  var VS_BALL = '#version 300 es\nprecision highp float; uniform mat4 uVP; uniform vec3 uP, uCam; uniform float uR, uFocal; void main(){ gl_Position = uVP*vec4(uP,1.); gl_PointSize = 2.*uR*uFocal/length(uCam - uP); }';
  var FS_BALL = [
    '#version 300 es', 'precision highp float; out vec4 o; uniform vec3 uCol, uSunDir, uSunCol, uAmb, uWallCol, uFloorCol, uCam, uP; uniform float uMetal, uFade;',
    ENV,
    'void main(){ vec2 c = gl_PointCoord*2. - 1.; c.y = -c.y; float r2 = dot(c,c); if (r2 > 1.) discard;',
    '  vec3 V = normalize(uCam - uP), X = normalize(cross(vec3(0,1,0), V)), Y = cross(V, X); vec3 N = normalize(c.x*X + c.y*Y + sqrt(1.-r2)*V);',
    '  vec3 R = reflect(-V, N); float d = max(dot(N, uSunDir), 0.), s = pow(max(dot(R, uSunDir), 0.), 90.);',
    '  vec3 col = mix(uCol*(uAmb + uSunCol*d), env(R)*uCol*1.3, uMetal) + uSunCol*s*2.; o = vec4(col*uFade, uFade); }'
  ].join('\n');

  // =================================================================== 6. mount
  function mount(cfg) {
    var canvas = cfg.canvas, page = cfg.page;
    if (!HIC.supported('webgl')) { var fb = HIC.fallback(canvas, { note: cfg.fallbackNote }); return { fallback: fb }; }
    var M = material(cfg.material), ROOMC = merge(ROOM, cfg.room || {}), PANE = merge(DEFAULTS.pane, cfg.pane || {});
    var IMP = merge(DEFAULTS.impact, cfg.impact || {}), MEND = merge(DEFAULTS.mend, cfg.mend || {}), TEXT = merge(DEFAULTS.text, cfg.text || {}), CAM = merge(DEFAULTS.camera, cfg.camera || {});
    var q = parseFloat(HIC.param('q')) || cfg.quality || 1;
    var S = HIC.stage(canvas, { gl: { antialias: false, depth: true, stencil: false }, quality: q, maxDpr: 2 }), gl = S.gl;
    var sound = root.ShatterSound ? root.ShatterSound.create(M.sound) : null;
    var PW = page.offsetWidth, PH = page.offsetHeight, PWm = PANE.width, k = PWm / PW, PHm = PH * k, ref = Math.sqrt(PWm * PHm);
    var AT = PANE.at, poly0 = outline(PANE.shape, PWm, PHm, PANE.corner, PW, PH);
    var sim = new Sim({ material: M, seed: cfg.seed || DEFAULTS.seed, wallZ: ROOMC.wallZ, refSize: ref, maxShards: cfg.maxShards || DEFAULTS.maxShards });
    var col = {
      tint: hex(M.tint), edge: hex(M.edge), glaze: hex(M.glaze), back: hex(M.back), wall: hex(ROOMC.wall), floor: hex(ROOMC.floor), skirt: hex(ROOMC.skirting),
      sun: hex(ROOMC.sun), amb: hex(ROOMC.ambient), dust: hex(M.dustColor), ball: hex(IMP.prop.color)
    };
    var sunDir = HIC.vec.norm(ROOMC.sunDir);
    function newPane() {
      var c = centroid(poly0), b = sim.addShard(poly0, [AT[0] + c[0], AT[1] + c[1], AT[2]], [0, 0, 0, 1], 0);
      b.held = 1; b.release = 0; b.awake = 1; sim.record(); return b;
    }
    newPane();
    sim.onBreak = function (res, s) { syncGeo(); afterStrike(res, res.at, null, s); };

    // ---------------------------------------------------------------- GL objects
    var P = {
      shard: HIC.gl.program(gl, VS_SHARD, FS_SHARD), shadow: HIC.gl.program(gl, VS_SHADOW, FS_SHADOW), room: HIC.gl.program(gl, null, FS_ROOM),
      copy: HIC.gl.program(gl, null, FS_COPY), dust: HIC.gl.program(gl, VS_DUST, FS_DUST), ball: HIC.gl.program(gl, VS_BALL, FS_BALL)
    };
    var pageTex = HIC.gl.texture(gl, { mips: true });
    var emptyVao = gl.createVertexArray(), flatTex = HIC.gl.texture(gl, { w: 1, h: 1, data: new Uint8Array(hex(ROOMC.floor).map(function (x) { return x * 255; }).concat([255])) });
    var SHADOW = 1024, shadowT = HIC.gl.target(gl, SHADOW, SHADOW), roomT = null;
    var geo = [];                                    // per body: { vao, buf, count }
    function buildShard(b) {
      var n = b.loc.length, f = [], h = M.thickness / 2, cx = b.c[0], cy = b.c[1], i;
      function put(x, y, z, nx, ny, nz, e, type) { var X = x + cx, Y = y + cy; f.push(x, y, z, nx, ny, nz, X / PWm + 0.5, 0.5 - Y / PHm, e, type); }
      for (i = 0; i < n; i++) {
        var a = b.loc[i], c = b.loc[(i + 1) % n], ex = c[0] - a[0], ey = c[1] - a[1], len = Math.hypot(ex, ey) || 1e-9;
        var d = Math.abs(-a[0] * ey + a[1] * ex) / len;                 // centroid to this edge
        put(0, 0, h, 0, 0, 1, d, 0); put(a[0], a[1], h, 0, 0, 1, 0, 0); put(c[0], c[1], h, 0, 0, 1, 0, 0);
        put(0, 0, -h, 0, 0, -1, d, 1); put(c[0], c[1], -h, 0, 0, -1, 0, 1); put(a[0], a[1], -h, 0, 0, -1, 0, 1);
        var nx = ey / len, ny = -ex / len;
        put(a[0], a[1], -h, nx, ny, 0, 0, 2); put(c[0], c[1], -h, nx, ny, 0, 0, 2); put(c[0], c[1], h, nx, ny, 0, 0, 2);
        put(a[0], a[1], -h, nx, ny, 0, 0, 2); put(c[0], c[1], h, nx, ny, 0, 0, 2); put(a[0], a[1], h, nx, ny, 0, 0, 2);
      }
      var vao = gl.createVertexArray(), buf = gl.createBuffer();
      gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(f), gl.STATIC_DRAW);
      [[0, 3, 0], [1, 3, 12], [2, 2, 24], [3, 2, 32]].forEach(function (a) { gl.enableVertexAttribArray(a[0]); gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, 40, a[2]); });
      gl.bindVertexArray(null);
      geo[b.id] = { vao: vao, buf: buf, count: f.length / 10 };
    }
    function syncGeo() {
      for (var i = 0; i < sim.bodies.length; i++) if (sim.bodies[i].kind === 'shard' && (!geo[i] || geo[i].body !== sim.bodies[i])) { if (geo[i]) { gl.deleteVertexArray(geo[i].vao); gl.deleteBuffer(geo[i].buf); } buildShard(sim.bodies[i]); geo[i].body = sim.bodies[i]; }
      for (i = sim.bodies.length; i < geo.length; i++) if (geo[i]) { gl.deleteVertexArray(geo[i].vao); gl.deleteBuffer(geo[i].buf); }
      geo.length = sim.bodies.length;
    }
    syncGeo();
    // dust buffer: up to 1600 specks (p0, v0, t0 + size)
    var DUSTMAX = 1600, dustData = new Float32Array(DUSTMAX * 8), dustN = 0, dustVao = gl.createVertexArray(), dustBuf = gl.createBuffer(), dustLog = [];
    gl.bindVertexArray(dustVao); gl.bindBuffer(gl.ARRAY_BUFFER, dustBuf); gl.bufferData(gl.ARRAY_BUFFER, dustData.byteLength, gl.DYNAMIC_DRAW);
    [[0, 3, 0], [1, 3, 12], [2, 2, 24]].forEach(function (a) { gl.enableVertexAttribArray(a[0]); gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, 32, a[2]); });
    gl.bindVertexArray(null);
    var drng = HIC.rng((cfg.seed || 7) * 31 + 5);
    function spawnDust(at, dir, s, n, t) {
      n = Math.min(n, DUSTMAX - dustN); dustLog.push({ t: t, start: dustN }); drng = HIC.rng(((cfg.seed || 7) * 31 + Math.round(t * 240) * 13 + Math.round(at[0] * 1e4)) >>> 0);
      for (var i = 0; i < n; i++) {
        var o = (dustN + i) * 8, sp = (0.5 + 2.6 * drng()) * s, a = drng() * TAU, up = drng();
        var d = dir || [0, 0.5, 0];
        dustData[o] = at[0]; dustData[o + 1] = at[1]; dustData[o + 2] = at[2];
        dustData[o + 3] = Math.cos(a) * sp * 0.8 + d[0] * sp * 0.6; dustData[o + 4] = (up - 0.25) * sp + d[1] * sp * 0.5; dustData[o + 5] = Math.sin(a) * sp * 0.5 + d[2] * sp * 0.6;
        dustData[o + 6] = t; dustData[o + 7] = 0.0015 + 0.004 * drng() * drng();
      }
      dustN += n;
      gl.bindBuffer(gl.ARRAY_BUFFER, dustBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, dustData.subarray(0, dustN * 8));
    }
    function trimDust(t) { while (dustLog.length && dustLog[dustLog.length - 1].t > t + 1e-9) dustN = dustLog.pop().start; }

    // ---------------------------------------------------------------- camera
    var cam = { pos: [0, 1, 3], vp: null, inv: null, c: [AT[0], AT[1], AT[2]], rw: 0, rh: 0, low: 0, px: 0, py: 0, fov: CAM.fov * Math.PI / 180, focal: 1 };
    function aim() {                                  // what the camera wants to look at: the glass, weighted by area
      var v = sim.view, sw = 0, c = [0, 0, 0], i, b, n = 0;
      for (i = 0; i < v.n; i++) { b = sim.bodies[i]; if (!v.alive[i] || b.kind !== 'shard') continue; n++; sw += b.area; for (var j = 0; j < 3; j++) c[j] += v.p[i * 3 + j] * b.area; }
      if (!sw || (n === 1 && sim.time === 0)) return { c: [AT[0], AT[1], AT[2]], rw: PWm / 2, rh: PHm / 2, low: 0 };
      c = [c[0] / sw, c[1] / sw, c[2] / sw];
      var rr = 0; for (i = 0; i < v.n; i++) { b = sim.bodies[i]; if (!v.alive[i] || b.kind !== 'shard') continue; var dx = v.p[i * 3] - c[0], dy = v.p[i * 3 + 1] - c[1], dz = v.p[i * 3 + 2] - c[2]; rr += (dx * dx + dy * dy + dz * dz) * b.area; }
      var low = 1 - smooth(0.12, AT[1] * 0.8, c[1]), r = clamp(Math.sqrt(rr / sw) * 1.35 + ref * 0.22, ref * 0.42, ref * 1.1);
      var f = CAM.follow;
      return { c: [mix(AT[0], clamp(c[0], AT[0] - PWm * 0.6, AT[0] + PWm * 0.6), f), mix(AT[1], c[1], f), mix(AT[2], c[2], f)], rw: mix(PWm / 2, r, f), rh: mix(PHm / 2, r, f), low: low * f };
    }
    function updateCamera(dt, snap) {
      var a = aim(), k2 = snap ? 1 : 1 - Math.exp(-dt * 2.2), k3 = snap ? 1 : 1 - Math.exp(-dt * 1.3);
      for (var i = 0; i < 3; i++) cam.c[i] += (a.c[i] - cam.c[i]) * k2;
      if (!cam.rw) { cam.rw = a.rw; cam.rh = a.rh; }
      cam.rw += (a.rw - cam.rw) * k3; cam.rh += (a.rh - cam.rh) * k3; cam.low += (a.low - cam.low) * k3;
      var asp = S.W / S.H, half = Math.tan(cam.fov / 2);
      var dist = Math.max(cam.rh, cam.rw / asp) * CAM.margin / half;
      var elev = mix(0.05, 0.62, cam.low), az = HIC.calm ? 0 : cam.px * 0.05;
      var t = [cam.c[0], cam.c[1] - 0.01, cam.c[2] + cam.low * 0.05];
      var e = [t[0] + Math.sin(az) * Math.cos(elev) * dist, t[1] + Math.sin(elev) * dist + (HIC.calm ? 0 : cam.py * 0.02), t[2] + Math.cos(az) * Math.cos(elev) * dist];
      if (kick > 0 && !HIC.calm) { var kk = kick * Math.exp(-kickT * 9) * 0.01 * dist; e[0] += kk * Math.sin(kickT * 63); e[1] += kk * Math.cos(kickT * 47); }
      cam.pos = e;
      var proj = HIC.mat4.perspective(cam.fov, asp, 0.05, 40), view = HIC.mat4.lookAt(e, t, [0, 1, 0]);
      cam.vp = HIC.mat4.mul(proj, view); cam.inv = HIC.mat4.invert(cam.vp); cam.focal = S.H * S.dpr * 0.5 / half;
    }
    function rayAt(x, y) {
      var nx = x / S.W * 2 - 1, ny = 1 - y / S.H * 2, m = cam.inv;
      function un(z) { var w = m[3] * nx + m[7] * ny + m[11] * z + m[15]; return [(m[0] * nx + m[4] * ny + m[8] * z + m[12]) / w, (m[1] * nx + m[5] * ny + m[9] * z + m[13]) / w, (m[2] * nx + m[6] * ny + m[10] * z + m[14]) / w]; }
      var a = un(-1), b = un(1); return { o: cam.pos, d: HIC.vec.norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]) };
    }
    function toScreen(p) { var m = cam.vp, w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15]; return [((m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]) / w * 0.5 + 0.5) * S.W, (0.5 - (m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]) / w * 0.5) * S.H, w]; }
    function model(i) { var v = sim.view, q2 = [v.q[i * 4], v.q[i * 4 + 1], v.q[i * 4 + 2], v.q[i * 4 + 3]], R = quatMat(q2), m = new Float32Array(16); m[0] = R[0]; m[1] = R[1]; m[2] = R[2]; m[4] = R[3]; m[5] = R[4]; m[6] = R[5]; m[8] = R[6]; m[9] = R[7]; m[10] = R[8]; m[12] = v.p[i * 3]; m[13] = v.p[i * 3 + 1]; m[14] = v.p[i * 3 + 2]; m[15] = 1; return m; }
    // the face that looks at the camera carries the picture
    function facing(i, m) { var tc = [cam.pos[0] - m[12], cam.pos[1] - m[13], cam.pos[2] - m[14]]; return m[8] * tc[0] + m[9] * tc[1] + m[10] * tc[2] >= 0 ? 1 : -1; }
    // page CSS px → canvas CSS px for shard i (a projective matrix3d, so hit testing is exact on a tilted plane)
    function pageMatrix(i) {
      var b = sim.bodies[i], mdl = model(i), zf = facing(i, mdl) * M.thickness / 2;
      var p2l = new Float32Array(16); p2l[0] = k; p2l[5] = -k; p2l[10] = 1; p2l[12] = -PWm / 2 - b.c[0]; p2l[13] = PHm / 2 - b.c[1]; p2l[14] = zf; p2l[15] = 1;
      var m = HIC.mat4.mul(cam.vp, HIC.mat4.mul(mdl, p2l)), out = [], cols = [0, 1, 3];
      function r(row, c) { return m[c * 4 + row]; }
      var X = [], Y = [], Wv = [];
      cols.forEach(function (c) { X.push(0.5 * S.W * (r(0, c) + r(3, c))); Y.push(0.5 * S.H * (r(3, c) - r(1, c))); Wv.push(r(3, c)); });
      var n = 1 / Wv[2];
      out = [X[0] * n, Y[0] * n, 0, Wv[0] * n, X[1] * n, Y[1] * n, 0, Wv[1] * n, 0, 0, 1, 0, X[2] * n, Y[2] * n, 0, 1];
      return out;
    }
    function shardPoint(i, px, py) { // world point of page px on shard i (facing side)
      var b = sim.bodies[i], mdl = model(i), zf = facing(i, mdl) * M.thickness / 2, X = (px - PW / 2) * k - b.c[0], Y = (PH / 2 - py) * k - b.c[1];
      return [mdl[0] * X + mdl[4] * Y + mdl[8] * zf + mdl[12], mdl[1] * X + mdl[5] * Y + mdl[9] * zf + mdl[13], mdl[2] * X + mdl[6] * Y + mdl[10] * zf + mdl[14]];
    }

    // ---------------------------------------------------------------- the page: readouts, controls, seams
    function q$(sel) { return page.querySelector('[data-shatter="' + sel + '"]'); }
    function all$(sel) { return [].slice.call(page.querySelectorAll('[data-shatter="' + sel + '"]')); }
    var ui = { count: all$('count'), state: all$('state'), time: q$('time'), clock: all$('clock'), seams: q$('seams'),
      mends: [].slice.call(document.querySelectorAll('[data-shatter="mend"]')), sound: document.querySelector('[data-shatter="sound"]'), hint: document.querySelector('[data-shatter="hint"]') };
    if (!ui.seams) { ui.seams = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); page.insertBefore(ui.seams, page.firstChild); }
    ui.seams.setAttribute('viewBox', '0 0 ' + PW + ' ' + PH); ui.seams.setAttribute('aria-hidden', 'true');
    ui.seams.style.cssText += ';position:absolute;left:0;top:0;width:' + PW + 'px;height:' + PH + 'px;pointer-events:none;overflow:visible';
    if (getComputedStyle(page).position === 'static') page.style.position = 'relative';
    if (ui.time) { ui.time.min = 0; ui.time.max = 1000; ui.time.step = 1; ui.time.value = 0; }
    function setText(n, s) { if (Array.isArray(n)) { n.forEach(function (x) { setText(x, s); }); return; } if (n && n.textContent !== s) n.textContent = s; }
    var mode = 'live', tapeT = 0, mended = false, rew = null, strikes = [], acc = 0, kick = 0, kickT = 0, seal = 0, lastUi = 0;
    function aliveCount() { var v = sim.view, n = 0; for (var i = 0; i < v.n; i++) if (v.alive[i] && sim.bodies[i].kind === 'shard') n++; return n; }
    function syncUi(now, force) {
      var n = aliveCount(), broken = sim.time > 0;
      var st = mode === 'rewind' ? 'rewinding' : mode === 'scrub' ? 'held' : n > 1 ? 'broken' : mended ? 'mended' : 'whole';
      setText(ui.count, TEXT.pieces(n)); setText(ui.state, TEXT.state[st] || st); page.setAttribute('data-state', st);
      if (ui.time) {
        if (ui.time.disabled === broken) ui.time.disabled = !broken;
        if (mode !== 'scrub' && (force || now - lastUi > 0.2)) { var val = broken ? String(Math.round(1000 * tapeT / Math.max(sim.time, 1e-6))) : '0'; if (ui.time.value !== val) ui.time.value = val; }
      }
      if (force || now - lastUi > 0.2 || mode !== 'live') { setText(ui.clock, TEXT.clock(tapeT)); lastUi = now; }
      ui.mends.forEach(function (b) { var off = !broken || mode === 'rewind'; if (b.disabled !== off) b.disabled = off; b.classList.toggle('gone', !broken); });
      if (ui.hint) ui.hint.classList.toggle('gone', broken || mended);
    }
    // the cracks of the break being undone, as seams on the page (an SVG in the DOM, so they are part of the live page)
    var srng = HIC.rng((cfg.seed || 7) + 99);
    function recordSeams() {
      if (MEND.style === 'none') return;
      var v = sim.poseAt(sim.time), seen = {}, d = ['', ''], joints = {}, NS = 'http://www.w3.org/2000/svg';
      function px(p) { return [((p[0] / k) + PW / 2).toFixed(1), ((PH / 2) - p[1] / k).toFixed(1)]; }
      var outer = poly0;
      function onOutline(p) { for (var i = 0, j = outer.length - 1; i < outer.length; j = i++) { var a = outer[j], b = outer[i], ex = b[0] - a[0], ey = b[1] - a[1], l = Math.hypot(ex, ey); if (Math.abs((p[0] - a[0]) * ey - (p[1] - a[1]) * ex) / l < 1.5 * k) return true; } return false; }
      for (var i = 0; i < v.n; i++) {
        var b = sim.bodies[i]; if (!v.alive[i] || b.kind !== 'shard' || b.gen === 0) continue;
        for (var e = 0; e < b.poly.length; e++) {
          var A = b.poly[e], B = b.poly[(e + 1) % b.poly.length];
          if (onOutline(A) && onOutline(B) && onOutline([(A[0] + B[0]) / 2, (A[1] + B[1]) / 2])) continue;
          var pa = px(A), pb = px(B), key = pa < pb ? pa + pb : pb + pa; if (seen[key]) continue; seen[key] = 1;
          var w = Math.hypot(A[0] - B[0], A[1] - B[1]) / k > 30 && srng() < 0.55 ? 1 : 0;
          d[w] += 'M' + pa.join(' ') + 'L' + pb.join(' ');
          [pa.join(','), pb.join(',')].forEach(function (j2) { joints[j2] = (joints[j2] || 0) + 1; });
        }
      }
      var g = document.createElementNS(NS, 'g'), wd = MEND.style === 'gold' ? [1.6, 3.2] : [1.2, 2.2];
      [].slice.call(ui.seams.childNodes).forEach(function (n) { var o2 = (+n.getAttribute('opacity') || 1) * 0.6; if (o2 < 0.2) n.remove(); else n.setAttribute('opacity', o2.toFixed(2)); });
      g.setAttribute('opacity', '1'); g.setAttribute('fill', 'none'); g.setAttribute('stroke-linecap', 'round'); g.setAttribute('data-seams', '');
      [[MEND.color, 1], [MEND.light, 0.42]].forEach(function (layer, li) {
        d.forEach(function (dd, wi) { if (!dd) return; var p = document.createElementNS(NS, 'path'); p.setAttribute('d', dd); p.setAttribute('stroke', layer[0]); p.setAttribute('stroke-width', (wd[wi] * layer[1]).toFixed(2)); if (li) p.setAttribute('transform', 'translate(-0.4 -0.5)'); g.appendChild(p); });
      });
      Object.keys(joints).forEach(function (j2) {
        if (joints[j2] < 3 || srng() > 0.5) return; var xy = j2.split(','), c = document.createElementNS(NS, 'circle'), r = 1.6 + 2.2 * srng();
        c.setAttribute('cx', xy[0]); c.setAttribute('cy', xy[1]); c.setAttribute('r', r.toFixed(1)); c.setAttribute('fill', MEND.color); g.appendChild(c);
      });
      ui.seams.appendChild(g);
    }

    // ---------------------------------------------------------------- striking
    var balls = [], flights = [];
    function isControl(t) { return !!(t && t.closest && t.closest('input,button,label,select,textarea,a,[contenteditable]:not([contenteditable=false]),[data-shatter-control]')); }
    function timeScale() {
      if (IMP.slowmo >= 1 || HIC.calm) return 1;
      var last = -1; for (var i = strikes.length - 1; i >= 0; i--) if (strikes[i].t <= sim.time + 1e-9 && strikes[i].big) { last = strikes[i].t; break; }
      if (last < 0) return 1;
      var tau = sim.time - last, s = IMP.slowmo;
      if (tau < 0.02) return 1;
      if (tau < 0.15) return mix(1, s, smooth(0.02, 0.15, tau));
      if (tau < 0.45) return s;
      return mix(s, 1, smooth(0.45, 1.6, tau));
    }
    function afterStrike(res, at, dir, s) {
      syncGeo();
      if (!res.cracked) { if (sound) sound.clink({ size: 0.2, speed: 2 }); return; }
      strikes.push({ t: sim.time, big: res.pieces.length > 6 });
      spawnDust(res.at || at, dir, 0.6 + s, Math.round(M.dust * (0.4 + 0.6 * s) * clamp(res.pieces.length / 30, 0.3, 1.2)), sim.time);
      kick = 1; kickT = 0;
      if (sound) sound.shatter({ strength: s, pieces: res.pieces.length, pan: clamp((res.at || at)[0] / 1.2, -1, 1) });
    }
    // the main action: a click on the glass at canvas point (x, y)
    function strikeAtScreen(x, y) {
      if (mode !== 'live') resumeFrom(tapeT);
      sim.liveView(1);
      var r = rayAt(x, y), hits = sim.pickAll(r.o, r.d);
      if (!hits.length) return null;
      var h = hits[0], b = sim.bodies[h.id];
      if (IMP.kind === 'drop' && b.held && !b.release) { dropPane(b); return { dropped: true }; }
      var s = clamp(IMP.strength * (b.gen ? 0.75 : 1), 0.2, 1), hp = [r.o[0] + r.d[0] * h.t, r.o[1] + r.d[1] * h.t, r.o[2] + r.d[2] * h.t];
      if (IMP.kind === 'throw' && HIC.still === null) { flights.push({ x: x, y: y, u: 0, dur: 0.14, from: [cam.pos[0] + 0.15, cam.pos[1] - 0.3, cam.pos[2] - 0.3], to: hp, id: h.id, at: h.at, d: r.d, s: s }); return { flying: true }; }
      return hitShard(h.id, h.at, r.d, s, hp);
    }
    function hitShard(id, at, d, s, hp) {
      var res = sim.strike(id, at, d, s, 'blow');
      if (IMP.kind === 'throw') { var sp = res.cracked ? 4 + 6 * s : 2.5; sim.addBall(hp || res.at, [d[0] * sp + 0.2, d[1] * sp + 0.8, d[2] * sp], IMP.prop.radius, 0.25); }
      afterStrike(res, hp || res.at, d, s);
      if (sound && IMP.kind === 'throw') sound.thump({});
      return res;
    }
    function dropPane(b) {
      sim.release(b.id, IMP.tip || 0.6, [0, 0.15, 0.25]);
      strikes.push({ t: sim.time, big: false });
      if (sound) sound.tick();
    }
    function resumeFrom(t) {
      sim.truncate(t); tapeT = sim.time; mode = 'live'; rew = null;
      strikes = strikes.filter(function (s) { return s.t <= tapeT + 1e-9; }); trimDust(tapeT); syncGeo(); sim.liveView(1);
    }
    function startMend(instant) {
      if (sim.time <= 0 || mode === 'rewind') return;
      if (sound) { sound.unlock(); sound.rewind(true); }
      recordSeams(); flights.length = 0;
      if (instant) { finishMend(); return; }
      mode = 'rewind'; rew = { from: tapeT, u: 0, dur: clamp(MEND.duration * (0.6 + tapeT * 0.12), 1.0, 3.2) };
    }
    function finishMend() {
      sim.truncate(0); sim.reset(); sim.bodies.length = 1; var b = sim.bodies[0]; b.died = Infinity; b.held = 1; b.release = 0; b.awake = 1; b.p = [AT[0] + b.c[0], AT[1] + b.c[1], AT[2]]; b.q = [0, 0, 0, 1]; b.v = [0, 0, 0]; b.w = [0, 0, 0]; b.pp = b.p.slice(); b.pq = b.q.slice(); b.life = 0; b.calm = 0;
      sim.record(); tapeT = 0; mode = 'live'; rew = null; strikes = []; dustN = 0; dustLog = []; mended = true; seal = 1;
      syncGeo(); sim.liveView(1);
      if (sound) { sound.rewind(false); sound.mend(); }
    }
    ui.mends.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); startMend(false); }); });
    if (ui.sound) { ui.sound.addEventListener('click', function () { if (!sound) return; sound.unlock(); sound.setOn(!sound.on); ui.sound.setAttribute('aria-pressed', String(sound.on)); ui.sound.textContent = sound.on ? (ui.sound.getAttribute('data-on') || 'Sound on') : (ui.sound.getAttribute('data-off') || 'Sound off'); }); }

    // ---------------------------------------------------------------- hit testing: the page goes where the pointer's shard is
    var ptr = { x: -1e4, y: -1e4, in: false, down: false, lock: -1 }, pick = null, placed = '', ready = false, controls = [], controlsAt = -1;
    function measure() {
      controls = [].slice.call(page.querySelectorAll('input,button,label,textarea,select,a,[contenteditable],[data-shatter-control]')).map(function (e) { return { e: e, b: HIC.box(page, e) }; });
    }
    function controlAt(x, y) { for (var i = 0; i < controls.length; i++) { var b = controls[i].b; if (x >= b[0] && x <= b[0] + b[2] && y >= b[1] && y <= b[1] + b[3] && !controls[i].e.disabled) return true; } return false; }
    function choose(hits) { // glass is see-through: a control seen through a bare piece is what the visitor aims at
      if (!hits.length) return null;
      if (!M.opaque) for (var j = 0; j < hits.length && j < 4; j++) { var pp = toPagePx(hits[j].at); if (controlAt(pp[0], pp[1])) return hits[j]; }
      return hits[0];
    }
    function toPagePx(at) { return [at[0] / k + PW / 2, PH / 2 - at[1] / k]; }
    function updateHit() {
      if (!ready || !cam.vp) return;
      var id = -1;
      if (ptr.down && ptr.lock >= 0 && sim.view.alive[ptr.lock]) id = ptr.lock;
      else if (ptr.in) { if (controlsAt !== S.uploads) { measure(); controlsAt = S.uploads; } var r = rayAt(ptr.x, ptr.y); pick = choose(sim.pickAll(r.o, r.d)); if (pick) id = pick.id; }
      if (id < 0) { if (placed !== 'off') { S.place(page, null); placed = 'off'; } return; }
      var m = pageMatrix(id), key = m.map(function (x) { return x.toFixed(3); }).join(',');
      if (key !== placed) { S.place(page, m); placed = key; }
    }
    S.uploads = 0;
    function setPtr(e) { var r = canvas.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.in = ptr.x >= 0 && ptr.y >= 0 && ptr.x <= r.width && ptr.y <= r.height; }
    var scrub = { on: false, id: -1, x0: 0, v0: 0, len: 1 };
    root.addEventListener('pointermove', function (e) {
      setPtr(e);
      if (scrub.on && e.pointerId === scrub.id) { setTape(clamp(scrub.v0 + (e.clientX - scrub.x0) / scrub.len, 0, 1) * sim.time); e.preventDefault(); }
      cam.px = clamp(ptr.x / S.W * 2 - 1, -1, 1); cam.py = clamp(1 - ptr.y / S.H * 2, -1, 1);
      updateHit();
    }, true);
    root.addEventListener('pointerdown', function (e) {
      if (sound) sound.unlock();
      setPtr(e); if (!ptr.down) updateHit();
      ptr.down = true; ptr.lock = pick ? pick.id : -1;
      var t = e.target, onPage = page.contains(t) || t === canvas;
      if (ui.time && t === ui.time && !ui.time.disabled && pick) {     // the slider rides a moving shard: drive it by horizontal travel
        var bx = HIC.box(page, ui.time), y0 = bx[1] + bx[3] / 2, a = toScreen(shardPoint(pick.id, bx[0], y0)), b = toScreen(shardPoint(pick.id, bx[0] + bx[2], y0));
        var pp = toPagePx(pick.at), v = clamp((pp[0] - bx[0]) / bx[2], 0, 1);
        scrub.on = true; scrub.id = e.pointerId; scrub.x0 = e.clientX; scrub.v0 = v; scrub.len = Math.max(30, Math.hypot(b[0] - a[0], b[1] - a[1])) * (a[0] < b[0] ? 1 : -1);
        if (mode !== 'scrub') { mode = 'scrub'; flights.length = 0; }
        setTape(v * sim.time); e.preventDefault(); return;
      }
      if (onPage && !isControl(t) && e.button === 0) { e.preventDefault(); if (strikeAtScreen(ptr.x, ptr.y) && sound) sound.unlock(); }
    }, true);
    root.addEventListener('mousedown', function (e) { if (page.contains(e.target) && !isControl(e.target)) e.preventDefault(); }, true); // keep the caret where someone is typing
    function endPtr(e) { if (scrub.on && e.pointerId === scrub.id) { scrub.on = false; resumeFrom(tapeT); } ptr.down = false; ptr.lock = -1; updateHit(); }
    root.addEventListener('pointerup', endPtr, true); root.addEventListener('pointercancel', endPtr, true);
    root.addEventListener('pointerleave', function () { ptr.in = false; updateHit(); });
    if (ui.time) {
      ui.time.addEventListener('input', function () { if (scrub.on) return; mode = 'scrub'; flights.length = 0; setTape(+ui.time.value / 1000 * sim.time); });
      ui.time.addEventListener('change', function () { if (!scrub.on && mode === 'scrub') resumeFrom(tapeT); });
    }
    function setTape(t) { tapeT = clamp(t, 0, sim.time); if (sound) sound.grain(); if (ui.time) ui.time.value = String(Math.round(1000 * tapeT / Math.max(sim.time, 1e-6))); }
    root.addEventListener('resize', function () { S.resize(); roomT = null; S.requestPaint(); });

    // ---------------------------------------------------------------- upload
    S.onPaint(function () {
      if (!S.upload(page, pageTex)) return;
      S.uploads++;
      if (!ready) {
        S.probe(page, page.querySelector('[data-hic-edit]') || page.firstElementChild).then(function (md) {
          ready = true; placed = ''; S.place(page, null); placed = 'off'; updateHit();
          applyHash(); S.ready({ mode: md, material: cfg.material && cfg.material.base, pieces: aliveCount() });
        });
      }
    });

    // ---------------------------------------------------------------- frame
    var sweep = { x: -3, next: 2 }, lastT = 0;
    function frame(t, dt) {
      var still = HIC.still !== null;
      // flights of the projectile towards the glass
      for (var f = flights.length - 1; f >= 0; f--) { var fl = flights[f]; fl.u += dt / fl.dur; if (fl.u >= 1) { flights.splice(f, 1); if (sim.bodies[fl.id] && sim.bodies[fl.id].died === Infinity) hitShard(fl.id, fl.at, fl.d, fl.s, fl.to); } }
      // time
      var alpha = 1;
      if (mode === 'live') {
        var ts = timeScale(); acc += dt * ts; var n = 0;
        while (acc >= H && n < 14) {
          var ev = sim.tick(); acc -= H; n++;
          if (!ev) { acc = 0; break; }
          if (ev.length && sound) ev.forEach(function (e) { if (e.kind === 'ball') { if (e.speed > 0.8) sound.thump({ speed: e.speed }); } else sound.clink({ size: e.size, speed: e.speed }); });
          if (sim.bodies.length !== geo.length) syncGeo();
        }
        if (n >= 14) acc = 0;
        alpha = sim.idle ? 1 : clamp(acc / H, 0, 1);
        tapeT = sim.time; sim.liveView(alpha);
      } else if (mode === 'rewind') {
        rew.u += dt / rew.dur; var e2 = rew.u >= 1 ? 1 : rew.u * rew.u * (3 - 2 * rew.u);
        tapeT = rew.from * (1 - e2); sim.poseAt(tapeT);
        if (rew.u >= 1) finishMend();
      } else sim.poseAt(tapeT);
      seal = Math.max(0, seal - dt * 0.8); kick = Math.max(0, kick - dt * 0.9); kickT += dt;
      // a slow glint across the whole pane now and then, so it reads as glass before anyone touches it
      if (!HIC.calm) { sweep.next -= dt; if (sweep.next < 0) { sweep.x += dt * 1.6; if (sweep.x > 3) { sweep.x = -3; sweep.next = 5 + 3 * srng(); } } }
      if (still) sweep.x = 3;
      updateCamera(dt, still || !lastT); lastT = t;
      if (ready) updateHit();
      syncUi(t, false);
      draw(t);
    }

    function uniformsCommon(p) {
      var u = p.u;
      if (u.uSunDir) gl.uniform3fv(u.uSunDir, sunDir); if (u.uSunCol) gl.uniform3fv(u.uSunCol, col.sun.map(function (x) { return x * ROOMC.sunPower; }));
      if (u.uAmb) gl.uniform3fv(u.uAmb, col.amb); if (u.uWallCol) gl.uniform3fv(u.uWallCol, col.wall); if (u.uFloorCol) gl.uniform3fv(u.uFloorCol, col.floor); if (u.uCam) gl.uniform3fv(u.uCam, cam.pos);
    }
    // the light's orthographic frame for the shadow map, around the pane and the floor under it
    var LU = HIC.vec.norm(HIC.vec.cross(sunDir, [0, 1, 0])), LV = HIC.vec.cross(LU, sunDir), LE = Math.max(PWm, PHm) * 0.9 + 0.9, LC = [AT[0], AT[1] * 0.5, ROOMC.wallZ * 0.4];
    function drawShards(order, mirror, fade) {
      var p = P.shard.use(), u = p.u;
      uniformsCommon(p); HIC.gl.bind(gl, p, { uPage: pageTex, uRoom: mirror ? flatTex : roomT.tex });
      gl.uniformMatrix4fv(u.uVP, false, cam.vp); gl.uniform2f(u.uRes, canvas.width, canvas.height);
      gl.uniform3fv(u.uTint, col.tint); gl.uniform3fv(u.uEdgeCol, col.edge); gl.uniform3fv(u.uGlaze, col.glaze); gl.uniform3fv(u.uBackCol, col.back);
      gl.uniform1f(u.uOpaque, M.opaque ? 1 : 0); gl.uniform1f(u.uBody, M.body); gl.uniform1f(u.uFrost, M.frost); gl.uniform1f(u.uRefr, M.refract); gl.uniform1f(u.uTh, M.thickness);
      gl.uniform1f(u.uSweep, sweep.x + AT[0] + AT[1] * 0.55); gl.uniform1f(u.uSeal, seal); gl.uniform1f(u.uFade, fade); gl.uniform1f(u.uPrintBack, M.printBack);
      gl.uniform1f(u.uEdgeA, M.edgeAlpha); gl.uniform1f(u.uRim, M.rim); gl.uniform1f(u.uShine, M.shine);
      for (var j = 0; j < order.length; j++) {
        var i = order[j], mdl = model(i);
        if (mirror) { mdl[1] = -mdl[1]; mdl[5] = -mdl[5]; mdl[9] = -mdl[9]; mdl[13] = -mdl[13]; }
        gl.uniformMatrix4fv(u.uModel, false, mdl); gl.uniform1f(u.uPicked, pick && pick.id === i ? 1 : 0);
        gl.bindVertexArray(geo[i].vao); gl.drawArrays(gl.TRIANGLES, 0, geo[i].count);
      }
      gl.bindVertexArray(null);
    }
    function drawBalls(fade, mirror) {
      var list = [];
      var v = sim.view;
      for (var i = 0; i < v.n; i++) if (v.alive[i] && sim.bodies[i].kind === 'ball') list.push([v.p[i * 3], v.p[i * 3 + 1], v.p[i * 3 + 2], sim.bodies[i].r]);
      flights.forEach(function (fl) { var u = fl.u; list.push([mix(fl.from[0], fl.to[0], u), mix(fl.from[1], fl.to[1], u) + Math.sin(u * Math.PI) * 0.03, mix(fl.from[2], fl.to[2], u), IMP.prop.radius]); });
      if (!list.length) return list;
      var p = P.ball.use(), u = p.u; uniformsCommon(p);
      gl.uniformMatrix4fv(u.uVP, false, cam.vp); gl.uniform1f(u.uFocal, cam.focal); gl.uniform3fv(u.uCol, col.ball); gl.uniform1f(u.uMetal, IMP.prop.metal); gl.uniform1f(u.uFade, fade);
      gl.bindVertexArray(emptyVao); list.forEach(function (b) { gl.uniform3f(u.uP, b[0], mirror ? -b[1] : b[1], b[2]); gl.uniform1f(u.uR, b[3]); gl.drawArrays(gl.POINTS, 0, 1); }); gl.bindVertexArray(null);
      return list;
    }
    function draw(t) {
      var W = canvas.width, Hh = canvas.height, v = sim.view, i;
      if (!roomT || roomT.w !== W || roomT.h !== Hh) roomT = HIC.gl.target(gl, W, Hh);
      var order = [];
      for (i = 0; i < v.n; i++) if (v.alive[i] && sim.bodies[i].kind === 'shard' && geo[i]) order.push(i);
      var fw = [cam.pos[0] - cam.c[0], cam.pos[1] - cam.c[1], cam.pos[2] - cam.c[2]];
      order.sort(function (a, b) { return (v.p[a * 3] * fw[0] + v.p[a * 3 + 1] * fw[1] + v.p[a * 3 + 2] * fw[2]) - (v.p[b * 3] * fw[0] + v.p[b * 3 + 1] * fw[1] + v.p[b * 3 + 2] * fw[2]); });
      // 1 shadow (transmittance) map
      gl.bindFramebuffer(gl.FRAMEBUFFER, shadowT.fb); gl.viewport(0, 0, SHADOW, SHADOW);
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ZERO, gl.SRC_COLOR);
      var sp = P.shadow.use(); HIC.gl.bind(gl, sp, { uPage: pageTex });
      gl.uniform3fv(sp.u.uLC, LC); gl.uniform3fv(sp.u.uLU, LU); gl.uniform3fv(sp.u.uLV, LV); gl.uniform1f(sp.u.uLE, LE);
      gl.uniform3fv(sp.u.uTint, col.tint); gl.uniform3fv(sp.u.uEdgeCol, col.edge); gl.uniform1f(sp.u.uOpaque, M.opaque ? 1 : 0); gl.uniform1f(sp.u.uBody, M.body);
      order.forEach(function (j) { gl.uniformMatrix4fv(sp.u.uModel, false, model(j)); gl.bindVertexArray(geo[j].vao); gl.drawArrays(gl.TRIANGLES, 0, geo[j].count); });
      gl.bindVertexArray(null);
      // 2 the room, then the glass mirrored in the floor, into roomT (the glass refracts what is behind it from there)
      gl.bindFramebuffer(gl.FRAMEBUFFER, roomT.fb); gl.viewport(0, 0, W, Hh); gl.disable(gl.BLEND);
      var rp = P.room.use(), u = rp.u; uniformsCommon(rp); HIC.gl.bind(gl, rp, { uShadow: shadowT.tex });
      gl.uniformMatrix4fv(u.uInv, false, cam.inv); gl.uniform3fv(u.uSkirtCol, col.skirt); gl.uniform1f(u.uSunPow, 1);
      gl.uniform3fv(u.uLC, LC); gl.uniform3fv(u.uLU, LU); gl.uniform3fv(u.uLV, LV); gl.uniform1f(u.uLE, LE);
      gl.uniform1f(u.uWallZ, ROOMC.wallZ); gl.uniform1f(u.uSkirtH, ROOMC.skirtingHeight); gl.uniform1f(u.uFloorStyle, { boards: 0, tiles: 1, plain: 2 }[ROOMC.floorStyle] || 0); gl.uniform1f(u.uBoard, ROOMC.boardWidth); gl.uniform1f(u.uVig, ROOMC.vignette);
      var Wn = ROOMC.window; gl.uniform4f(u.uWin, Wn.width, Wn.height, Wn.cols, Wn.rows); gl.uniform4f(u.uWin2, Wn.at[0], Wn.at[1], Wn.soft, Wn.mullion);
      var bl = null; for (i = 0; i < v.n; i++) if (v.alive[i] && sim.bodies[i].kind === 'ball') bl = [v.p[i * 3], v.p[i * 3 + 1], v.p[i * 3 + 2], sim.bodies[i].r];
      gl.uniform3f(u.uBall, bl ? bl[0] : 0, bl ? bl[1] : -9, bl ? bl[2] : 0); gl.uniform1f(u.uBallR, bl ? bl[3] : 0);
      HIC.gl.fullscreen(gl);
      if (ROOMC.gloss > 0) {
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.CULL_FACE); gl.frontFace(gl.CW);
        var mo = order.slice().reverse();
        drawShards(mo, true, ROOMC.gloss); gl.frontFace(gl.CCW); gl.disable(gl.CULL_FACE); drawBalls(ROOMC.gloss * 0.8, true);
      }
      // 3 to the screen: the room, then the glass back to front
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, Hh); gl.disable(gl.BLEND);
      var cp = P.copy.use(); HIC.gl.bind(gl, cp, { uTex: roomT.tex }); HIC.gl.fullscreen(gl);
      gl.clear(gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      drawBalls(1, false);
      gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
      drawShards(order, false, 1);
      gl.disable(gl.CULL_FACE);
      // dust
      if (dustN) {
        gl.depthMask(false); var dp = P.dust.use();
        gl.uniformMatrix4fv(dp.u.uVP, false, cam.vp); gl.uniform1f(dp.u.uT, tapeT); gl.uniform1f(dp.u.uFocal, cam.focal); gl.uniform3fv(dp.u.uCam, cam.pos); gl.uniform3fv(dp.u.uCol, col.dust);
        gl.bindVertexArray(dustVao); gl.drawArrays(gl.POINTS, 0, dustN); gl.bindVertexArray(null); gl.depthMask(true);
      }
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    }

    // ---------------------------------------------------------------- the address (#break=u,v&at=s, #rest, #mended) and the test hook
    function strikePage(u, v2, s) {    // strike at page fraction (u, v) on whatever piece shows that point, straight on
      var px = u * PW, py = v2 * PH, X = (px - PW / 2) * k, Y = (PH / 2 - py) * k, best = -1, vw = sim.liveView(1);
      for (var i = 0; i < vw.n; i++) if (vw.alive[i] && sim.bodies[i].kind === 'shard' && inside(sim.bodies[i].poly, X, Y)) best = i;
      if (best < 0) return null;
      var b = sim.bodies[best];
      if (IMP.kind === 'drop' && b.held && !b.release) { dropPane(b); return { dropped: true, pieces: [] }; }
      var wp = shardPoint(best, px, py), d = HIC.vec.norm([wp[0] - cam.pos[0], wp[1] - cam.pos[1], wp[2] - cam.pos[2]]);
      return hitShard(best, [X, Y], d, s || clamp(IMP.strength * (b.gen ? 0.75 : 1), 0.2, 1), wp);
    }
    function advance(sec) { // step the simulation by hand (checks, stills), no slow motion
      var n = Math.round(sec / H);
      for (var i = 0; i < n; i++) { if (!sim.tick()) break; if (sim.bodies.length !== geo.length) syncGeo(); }
      tapeT = sim.time; sim.liveView(1); return sim.time;
    }
    function applyHash() {
      var br = HIC.param('break'), at = parseFloat(HIC.param('at'));
      if (br === null && HIC.param('mended') === null) return;
      updateCamera(0, true);
      var uv = (br || '0.5,0.4').split(',').map(Number);
      strikePage(uv[0], uv[1]);
      if (HIC.param('rest') !== null || HIC.param('mended') !== null) { for (var g2 = 0; g2 < 40 && !sim.idle; g2++) advance(0.5); }
      else advance(isFinite(at) ? at : (IMP.kind === 'drop' ? 1.2 : 0.5));
      if (HIC.param('mended') !== null) { startMend(true); return; }
      if (HIC.still !== null) mode = 'scrub';
      updateCamera(0, true);
    }
    root.__hic.screenOf = function (el) {
      if (!cam.vp) return null;
      var bx = HIC.box(page, el), pts = [[0.5, 0.5], [0.3, 0.5], [0.7, 0.5], [0.15, 0.5], [0.85, 0.5]];
      for (var j = 0; j < pts.length; j++) {
        var px = bx[0] + bx[2] * pts[j][0], py = bx[1] + bx[3] * pts[j][1], X = (px - PW / 2) * k, Y = (PH / 2 - py) * k, best = -1, bd = 1e9, v = sim.view;
        for (var i = 0; i < v.n; i++) {
          if (!v.alive[i] || sim.bodies[i].kind !== 'shard' || !inside(sim.bodies[i].poly, X, Y)) continue;
          var wp = shardPoint(i, px, py), dd = Math.hypot(wp[0] - cam.pos[0], wp[1] - cam.pos[1], wp[2] - cam.pos[2]);
          if (dd < bd) { bd = dd; best = i; }
        }
        if (best >= 0) { var s = toScreen(shardPoint(best, px, py)); if (s[0] > 2 && s[1] > 2 && s[0] < S.W - 2 && s[1] < S.H - 2) return [s[0], s[1]]; }
      }
      return null;
    };
    var api = root.__hic.shatter = {
      strikePage: function (u, v, s) { var r = strikePage(u, v, s); return r ? { pieces: r.pieces ? r.pieces.length : 0, cracked: !!r.cracked, lost: r.lost || 0, dropped: !!r.dropped } : null; },
      strikeScreen: strikeAtScreen, advance: advance,
      hold: function (t) { mode = 'scrub'; setTape(t === undefined ? sim.time : t); sim.poseAt(tapeT); updateCamera(0, true); return tapeT; },
      resume: function () { resumeFrom(tapeT); },
      mend: function (instant) { startMend(instant); },
      bare: function () { // a screen point on the glass with no control under it
        measure();
        for (var gy = 0.12; gy < 0.95; gy += 0.035) for (var gx = 0.08; gx < 0.95; gx += 0.035) {
          var px = gx * PW, py = gy * PH; if (controlAt(px, py) || controlAt(px + 12, py) || controlAt(px - 12, py) || controlAt(px, py + 12) || controlAt(px, py - 12)) continue;
          var X = (px - PW / 2) * k, Y = (PH / 2 - py) * k;
          if (!inside(sim.bodies[0].poly, X, Y) || !inside(poly0, X * 1.15, Y * 1.15)) continue;
          var s = toScreen(shardPoint(0, px, py)); return { x: s[0], y: s[1], u: gx, v: gy };
        }
        return null;
      },
      soundTest: function () { return root.ShatterSound ? root.ShatterSound.test(M.sound) : null; },
      state: function () {
        var v = sim.view, n = 0, ys = 0, aw = sim.awakeCount(), areaSum = 0, conv = true, spin = 0;
        for (var i = 0; i < v.n; i++) { var b = sim.bodies[i]; if (!v.alive[i] || b.kind !== 'shard') continue; n++; ys += v.p[i * 3 + 1]; areaSum += b.area; if (!convex(b.poly)) conv = false; spin = Math.max(spin, Math.abs(v.q[i * 4]) + Math.abs(v.q[i * 4 + 1]) + Math.abs(v.q[i * 4 + 2])); }
        var hsh = 0; for (i = 0; i < v.n * 3; i++) hsh = (hsh * 31 + Math.round(v.p[i] * 1e4)) % 1000000007;
        return { pieces: n, awake: aw, time: sim.time, tape: tapeT, mode: mode, meanY: n ? ys / n : 0, area: areaSum, paneArea: Math.abs(area(poly0)), convex: conv, tilt: spin,
          seams: ui.seams.querySelectorAll('path').length, state: page.getAttribute('data-state'), hash: hsh, idle: sim.idle, bodies: sim.bodies.length };
      }
    };
    updateCamera(0, true); sim.liveView(1); syncUi(0, true);
    S.loop(frame);
    return { sim: sim, stage: S, api: api, material: M };
  }

  root.Shatter = { mount: mount, MATERIALS: MATERIALS, ROOM: ROOM, DEFAULTS: DEFAULTS, material: material, fracture: fracture, Sim: Sim, outline: outline, polygon: { area: area, centroid: centroid, clip: clip, inside: inside, convex: convex } };
})(typeof window !== 'undefined' ? window : globalThis);

/* lit-room.js — a small 3D room, built from data, whose monitor shows a live web page that lights the room.
 *
 * The page is ordinary DOM inside <canvas layoutsubtree content="drawable"> (HTML-in-Canvas, through lib/hic.js). It is
 * uploaded as a texture whenever its pixels change and drawn on the monitor in perspective, and it is placed for hit
 * testing with the same projection (a matrix3d homography), so you click, select and type on the screen in 3D.
 * The screen is the room's main light: its picture is shrunk to a grid of cells (NX × NY, from the page texture's mips)
 * and every cell is a small area light, so a pink page bathes the desk pink and a lamp dragged to the left of the page
 * lights the left of the room. Glossy things reflect the page (a ray against the screen plane, blurred by the mip chain),
 * and things on the desk cast soft shadows away from the screen (a static shadow map, PCSS).
 *
 *   LitRoom.start({ canvas, page, room: ROOM, onReady(R) }) → R (see the bottom of this file, and references/ENGINE.md)
 *
 * The room is data (ROOM): size, shell (walls, floor, ceiling, holes for windows), outside (sky), ambient, screen,
 * lamps, props (each a function of the builder kit, lib/props.js or your own via LitRoom.prop), camera, look.
 * Kit: box (rounded), cyl, lathe, sphere, tube, quad, leaf; materials by kind; decals painted into an atlas with Canvas 2D.
 *
 * Hash flags: #still=<s> (time stands, no intro, no idle), #calm, #nointro, #q=0.5 (render scale; checks), #fallback.
 * No dependencies besides hic.js, no network, deterministic (seeded).
 */
(function (root) {
  'use strict';
  var HIC = root.HIC, M4 = HIC.mat4, V = HIC.vec;
  var LR = root.LitRoom = root.LitRoom || {};
  LR.version = '1.0.0';
  var PROPS = LR.props = LR.props || {};
  LR.prop = function (name, fn) { PROPS[name] = fn; return LR; };

  // ------------------------------------------------------------------ colour and small maths
  function toLin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  // '#rrggbb' | '#rgb' | [r,g,b] (sRGB 0..1) → linear [r,g,b]
  function col(c) {
    if (Array.isArray(c)) return [toLin(c[0]), toLin(c[1]), toLin(c[2])];
    var h = String(c || '#cccccc').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [toLin((n >> 16 & 255) / 255), toLin((n >> 8 & 255) / 255), toLin((n & 255) / 255)];
  }
  LR.col = col;
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mulS(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function len(a) { return Math.hypot(a[0], a[1], a[2]); }
  var dot = V.dot, cross = V.cross, norm = V.norm;
  function xp(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; }
  function xd(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2], m[1] * p[0] + m[5] * p[1] + m[9] * p[2], m[2] * p[0] + m[6] * p[1] + m[10] * p[2]]; }
  // inverse transpose of the upper 3×3, for normals under non-uniform scale
  function nmat(m) {
    var a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
    return [e * i - f * h, -(d * i - f * g), d * h - e * g, -(b * i - c * h), a * i - c * g, -(a * h - b * g), b * f - c * e, -(a * f - c * d), a * e - b * d];
  }
  function xn(n, v) { return norm([n[0] * v[0] + n[3] * v[1] + n[6] * v[2], n[1] * v[0] + n[4] * v[1] + n[7] * v[2], n[2] * v[0] + n[5] * v[1] + n[8] * v[2]]); }
  var D2R = Math.PI / 180;

  // ------------------------------------------------------------------ materials
  // kind ids shared with the shader. rough / spec are defaults; a prop can override them in b.mat(kind, colour, opts).
  var KIND = LR.KIND = {
    paint: [0, 0.75, 0.35], plaster: [0, 0.9, 0.2], wood: [1, 0.42, 0.7], planks: [2, 0.4, 0.75], plastic: [3, 0.38, 0.8],
    metal: [4, 0.32, 1], fabric: [5, 0.95, 0.12], ceramic: [6, 0.12, 1], paper: [7, 0.8, 0.25], leaf: [8, 0.45, 0.5],
    screen: [9, 0.05, 1], art: [10, 0.75, 0.3], glass: [11, 0.03, 1], rubber: [12, 0.7, 0.4], rug: [13, 0.98, 0.08],
    glow: [14, 1, 0], sky: [15, 1, 0], keycap: [16, 0.5, 0.6], brass: [17, 0.28, 1], soil: [18, 1, 0], boards: [19, 0.5, 0.6]
  };
  var F_TWO = 1, F_NOSCREENCAST = 2, F_NOCAST = 4, F_GLASS = 8;
  LR.FLAGS = { twoSided: F_TWO, noScreenCast: F_NOSCREENCAST, noCast: F_NOCAST, glass: F_GLASS };
  var STRIDE = 20;   // pos3 nor3 tex3 col3 kind rough spec flags key uv2 ao

  // ------------------------------------------------------------------ the builder kit
  // Every primitive is a parametric grid of points, tessellated finely enough (b.tess metres) that per-vertex lighting
  // from the screen is smooth. Positions go through the current matrix (b.move / rotX|Y|Z in degrees / scale).
  function Builder(room) {
    this.room = room;
    this.M = M4.ident(); this.stack = [];
    this.m = { kind: 0, col: [0.6, 0.6, 0.6], rough: 0.75, spec: 0.35, flags: 0, key: 0, power: 0 };
    this.tess = 0.1;
    this.V = []; this.I = []; this.IG = []; this.prim = []; this.vprim = [];
    this.boxes = []; this.nprim = 0;
    this.objInv = M4.ident(); this.objOff = [0, 0, 0];
    this.rand = HIC.rng((room && room.seed) || 7);
    this.screens = []; this.lights = []; this.rects = []; this.keys = {}; this.keyN = 0; this.atlasJobs = [];
    this.atlasCursor = { x: 0, y: 0, row: 0 }; this.ATLAS = 2048;
  }
  var B = Builder.prototype;
  B.push = function () { this.stack.push([this.M, this.m, this.tess]); this.m = Object.assign({}, this.m); return this; };
  B.pop = function () { var s = this.stack.pop(); this.M = s[0]; this.m = s[1]; this.tess = s[2]; return this; };
  B.at = function (fn) { this.push(); fn(this); this.pop(); return this; };
  B.x = function (m) { this.M = M4.mul(this.M, m); return this; };
  B.move = function (x, y, z) { if (Array.isArray(x)) { z = x[2]; y = x[1]; x = x[0]; } return this.x(M4.translate(x, y, z)); };
  B.rotX = function (d) { return this.x(M4.rotX(d * D2R)); };
  B.rotY = function (d) { return this.x(M4.rotY(d * D2R)); };
  B.rotZ = function (d) { return this.x(M4.rotZ(d * D2R)); };
  B.scale = function (x, y, z) { return this.x(M4.scale(x, y === undefined ? x : y, z === undefined ? x : z)); };
  // b.obj(fn): a new object — procedural texture coordinates become local to it, with a random offset so twins differ
  B.obj = function (fn) {
    this.push();
    var keep = [this.objInv, this.objOff];
    this.objInv = M4.invert(this.M); this.objOff = [this.rand() * 9, this.rand() * 9, this.rand() * 9];
    fn(this);
    this.objInv = keep[0]; this.objOff = keep[1];
    this.pop(); return this;
  };
  // b.mat(kind, colour, { rough, spec, power, twoSided, noCast, noScreenCast, glass, key })
  B.mat = function (kind, c, o) {
    o = o || {};
    var k = KIND[kind] || KIND.paint;
    this.m = { kind: k[0], col: c === undefined ? this.m.col : col(c), rough: o.rough !== undefined ? o.rough : k[1], spec: o.spec !== undefined ? o.spec : k[2],
      flags: (o.twoSided ? F_TWO : 0) | (o.noScreenCast || this.noScreenCast ? F_NOSCREENCAST : 0) | (o.noCast ? F_NOCAST : 0) | (kind === 'glass' ? F_GLASS : 0),
      key: o.key || 0, power: o.power || 0 };
    // a glowing part (bulb, flame, shade) belongs to the next light this prop registers: it dims with it (o.lamp = true)
    if (o.lamp) this.m.flags |= (this.lights.length + 1) << 4;
    if (kind === 'glow' || kind === 'sky') this.m.spec = o.power !== undefined ? o.power : 1;
    return this;
  };
  B.here = function (p) { return xp(this.M, p || [0, 0, 0]); };
  B.dir = function (d) { return xd(this.M, d); };
  B.r = function () { return this.rand(); };

  // The one primitive: (us.length × vs.length) points from f(u, v) → [x,y,z, nx,ny,nz] in local space.
  // opts.uv(u, v) → [s, t] in the atlas (decals); opts.ao === false keeps it out of the occluder list.
  B.grid = function (us, vs, f, opts) {
    opts = opts || {};
    var M = this.M, N = nmat(M), m = this.m, base = this.V.length / STRIDE, nu = us.length, nv = vs.length;
    var lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], id = this.nprim++;
    for (var j = 0; j < nv; j++) for (var i = 0; i < nu; i++) {
      var q = f(us[i], vs[j], i, j), p = xp(M, q), n = xn(N, [q[3], q[4], q[5]]);
      if (!isFinite(n[0])) n = [0, 1, 0];
      var t = xp(this.objInv, p), uv = opts.uv ? opts.uv(us[i], vs[j]) : null;
      this.V.push(p[0], p[1], p[2], n[0], n[1], n[2], t[0] + this.objOff[0], t[1] + this.objOff[1], t[2] + this.objOff[2],
        m.col[0], m.col[1], m.col[2], m.kind, m.rough, m.spec, m.flags, m.key, uv ? uv[0] : -1, uv ? uv[1] : -1, 1);
      this.vprim.push(id);
      for (var k = 0; k < 3; k++) { if (p[k] < lo[k]) lo[k] = p[k]; if (p[k] > hi[k]) hi[k] = p[k]; }
    }
    var I = (m.flags & F_GLASS) ? this.IG : this.I;
    for (j = 0; j < nv - 1; j++) for (i = 0; i < nu - 1; i++) {
      var a = base + j * nu + i, b = a + 1, c = a + nu + 1, d = a + nu;
      I.push(a, b, c, a, c, d);
    }
    if (opts.ao !== false && !(m.flags & F_GLASS) && m.kind !== 14 && m.kind !== 15) this.boxes.push({ lo: lo, hi: hi, id: id });
    return this;
  };
  function steps(n) { var a = []; for (var i = 0; i <= n; i++) a.push(i / n); return a; }
  B.n = function (l, min) { return Math.max(min || 1, Math.ceil(Math.abs(l) / this.tess)); };
  // quad from origin o along edges eu, ev (normal = eu × ev)
  B.quad = function (o, eu, ev, opts) {
    opts = opts || {};
    var n = norm(cross(eu, ev)); if (opts.flip) n = mulS(n, -1);
    return this.grid(steps(this.n(len(eu))), steps(this.n(len(ev))), function (u, v) {
      return [o[0] + eu[0] * u + ev[0] * v, o[1] + eu[1] * u + ev[1] * v, o[2] + eu[2] * u + ev[2] * v, n[0], n[1], n[2]];
    }, { ao: opts.ao, uv: opts.uv || (opts.decal ? function (u, v) { var r = opts.decal; return [r[0] + (r[2] - r[0]) * u, r[1] + (r[3] - r[1]) * v]; } : null) });
  };
  // grid lines across a half-extent hh with rounded ends of radius r (angles even in the arc, flats tessellated)
  function lines(hh, r, seg, tess) {
    var out = [], k, flat = hh - r;
    if (r > 1e-6) for (k = seg; k >= 1; k--) out.push(-flat - r * Math.tan(Math.PI / 4 * k / seg));
    var nf = Math.max(1, Math.ceil(2 * flat / tess));
    for (k = 0; k <= nf; k++) out.push(-flat + 2 * flat * k / nf);
    if (r > 1e-6) for (k = 1; k <= seg; k++) out.push(flat + r * Math.tan(Math.PI / 4 * k / seg));
    return out;
  }
  // box centred on the origin. opts: r (edge rounding), seg, faces ('xXyYzZ', lower = negative side),
  // decal: { face: 'Y', rect: [u0,v0,u1,v1] } maps that face onto an atlas rectangle
  B.box = function (w, h, d, opts) {
    opts = opts || {};
    var hs = [w / 2, h / 2, d / 2], r = Math.min(opts.r || 0, hs[0], hs[1], hs[2]), seg = opts.seg || 2, self = this;
    var faces = opts.faces || 'xXyYzZ';
    var defs = { X: [0, 1, 1, 2], x: [0, -1, 1, 2], Y: [1, 1, 0, 2], y: [1, -1, 0, 2], Z: [2, 1, 0, 1], z: [2, -1, 0, 1] };
    for (var fi = 0; fi < faces.length; fi++) {
      (function (fc) {
        var df = defs[fc], ax = df[0], sg = df[1], ua = df[2], va = df[3];
        var lu = lines(hs[ua], r, seg, self.tess), lv = lines(hs[va], r, seg, self.tess);
        var dec = opts.decal && opts.decal.face === fc ? opts.decal.rect : null;
        self.grid(lu, lv, function (cu, cv) {
          var q = [0, 0, 0]; q[ax] = sg * hs[ax]; q[ua] = cu; q[va] = cv;
          if (!r) { var nn = [0, 0, 0]; nn[ax] = sg; return [q[0], q[1], q[2], nn[0], nn[1], nn[2]]; }
          var c = [HIC.clamp(q[0], -hs[0] + r, hs[0] - r), HIC.clamp(q[1], -hs[1] + r, hs[1] - r), HIC.clamp(q[2], -hs[2] + r, hs[2] - r)];
          var n = norm(sub(q, c));
          return [c[0] + n[0] * r, c[1] + n[1] * r, c[2] + n[2] * r, n[0], n[1], n[2]];
        }, { ao: opts.ao, uv: dec ? function (cu, cv) { var s = (cu + hs[ua]) / (2 * hs[ua]), t = (cv + hs[va]) / (2 * hs[va]); return [dec[0] + (dec[2] - dec[0]) * s, dec[1] + (dec[3] - dec[1]) * t]; } : null });
      })(faces[fi]);
    }
    return this;
  };
  // box from its min corner (furniture is easier to place this way)
  B.boxAt = function (x, y, z, w, h, d, opts) { var s = this; return this.at(function () { s.move(x + w / 2, y + h / 2, z + d / 2).box(w, h, d, opts); }); };
  // surface of revolution around +Y. profile: [[radius, y], …] bottom → top, outside to the right of the direction of travel.
  // Corners sharper than 40° stay creased. opts: seg (around), sweep (deg), inside (flip normals), ao
  B.lathe = function (profile, opts) {
    opts = opts || {};
    var seg = opts.seg || 24, sweep = (opts.sweep || 360) * D2R, s = opts.inside ? -1 : 1, P = profile, n = P.length, self = this;
    var sn = [];
    for (var i = 0; i < n - 1; i++) { var dr = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], l = Math.hypot(dr, dy) || 1; sn.push([dy / l, -dr / l]); }
    function vn(i, k) { // normal at point k of segment i, smoothed with the neighbour if the corner is gentle
      var a = sn[i], o = k === 0 ? sn[i - 1] : sn[i + 1];
      if (o && a[0] * o[0] + a[1] * o[1] > 0.77) { var x = a[0] + o[0], y = a[1] + o[1], l = Math.hypot(x, y) || 1; return [x / l, y / l]; }
      return a;
    }
    var us = steps(seg);
    var lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (i = 0; i < n - 1; i++) {
      var p0 = P[i], p1 = P[i + 1], L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); if (L < 1e-7) continue;
      var n0 = vn(i, 0), n1 = vn(i, 1);
      self.grid(us, steps(self.n(L)), function (u, v) {
        var a = -sweep * u, c = Math.cos(a), sa = Math.sin(a), r = p0[0] + (p1[0] - p0[0]) * v, y = p0[1] + (p1[1] - p0[1]) * v;
        var nx = (n0[0] + (n1[0] - n0[0]) * v) * s, ny = (n0[1] + (n1[1] - n0[1]) * v) * s;
        return [r * c, y, r * sa, nx * c, ny, nx * sa];
      }, { ao: false });
    }
    // one occluder box for the whole solid
    if (opts.ao !== false) {
      var R = 0, y0 = 1e9, y1 = -1e9; P.forEach(function (p) { R = Math.max(R, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
      this.occluder([-R, y0, -R], [R, y1, R]);
    }
    return this;
  };
  // an extra occluder box (local corners) for the ambient-occlusion bake
  B.occluder = function (a, b) {
    var lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (var k = 0; k < 8; k++) { var p = xp(this.M, [k & 1 ? b[0] : a[0], k & 2 ? b[1] : a[1], k & 4 ? b[2] : a[2]]); for (var c = 0; c < 3; c++) { lo[c] = Math.min(lo[c], p[c]); hi[c] = Math.max(hi[c], p[c]); } }
    this.boxes.push({ lo: lo, hi: hi, id: -1 }); return this;
  };
  // cylinder standing on y = 0 (r2 = top radius for a cone; open: no caps)
  B.cyl = function (r, h, opts) {
    opts = opts || {};
    var r2 = opts.r2 !== undefined ? opts.r2 : r;
    var p = opts.open ? [[r, 0], [r2, h]] : [[0, 0], [r, 0], [r2, h], [0, h]];
    return this.lathe(p, opts);
  };
  B.sphere = function (r, opts) {
    var p = [], n = (opts && opts.rings) || 10;
    for (var i = 0; i <= n; i++) { var a = -Math.PI / 2 + Math.PI * i / n; p.push([Math.cos(a) * r, Math.sin(a) * r]); }
    p[0][0] = 0; p[n][0] = 0;
    return this.lathe(p, Object.assign({ seg: 20 }, opts));
  };
  // tube of radius rad (number or fn(t)) along local points
  B.tube = function (path, rad, opts) {
    opts = opts || {};
    var seg = opts.seg || 8, n = path.length, rf = typeof rad === 'function' ? rad : function () { return rad; };
    var T = [], i;
    for (i = 0; i < n; i++) T.push(norm(sub(path[Math.min(n - 1, i + 1)], path[Math.max(0, i - 1)])));
    var up = Math.abs(T[0][1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], nx = norm(cross(up, T[0])), F = [];
    for (i = 0; i < n; i++) { nx = norm(sub(nx, mulS(T[i], dot(nx, T[i])))); F.push([nx, cross(T[i], nx)]); }
    var ls = [0]; for (i = 1; i < n; i++) ls.push(ls[i - 1] + len(sub(path[i], path[i - 1])));
    var tot = ls[n - 1] || 1, vs = ls.map(function (x) { return x / tot; });
    return this.grid(steps(seg), vs, function (u, v, iu, jv) {
      var a = 2 * Math.PI * u, c = Math.cos(a), s = Math.sin(a), f = F[jv], r = rf(v), p = path[jv];
      var d = [f[0][0] * c + f[1][0] * s, f[0][1] * c + f[1][1] * s, f[0][2] * c + f[1][2] * s];
      return [p[0] + d[0] * r, p[1] + d[1] * r, p[2] + d[2] * r, d[0], d[1], d[2]];
    }, { ao: opts.ao === undefined ? false : opts.ao });
  };
  // a leaf / petal / blade: length l along +y, width w, curling forward by bend (radians over its length), two-sided
  B.leaf = function (l, w, bend, opts) {
    bend = bend || 0;
    return this.grid(steps(4), steps(6), function (u, v) {
      var a = bend * v, y = 0, z = 0, k, n = 12;
      for (k = 0; k < n * v; k++) { var aa = bend * k / n; y += Math.cos(aa) * l / n; z += Math.sin(aa) * l / n; }
      var x = (u - 0.5) * w * Math.sin(Math.PI * Math.min(1, v * 1.1 + 0.05)) * (1 - 0.25 * v);
      var cup = -Math.abs(u - 0.5) * w * 0.25;
      return [x, y - Math.sin(a) * cup, z + Math.cos(a) * cup, 0, -Math.sin(a), Math.cos(a)];
    }, Object.assign({ ao: false }, opts));
  };
  // a decal region in the atlas, painted with Canvas 2D: draw(g, w, h, rng). Returns [u0, v0, u1, v1].
  B.atlas = function (w, h, draw) {
    var C = this.atlasCursor, A = this.ATLAS;
    w = Math.min(A, Math.ceil(w)); h = Math.min(A, Math.ceil(h));
    if (C.x + w > A) { C.x = 0; C.y += C.row + 2; C.row = 0; }
    if (C.y + h > A) return [0, 0, 0, 0];
    var x = C.x, y = C.y; C.x += w + 2; C.row = Math.max(C.row, h);
    this.atlasJobs.push({ x: x, y: y, w: w, h: h, draw: draw, seed: Math.floor(this.rand() * 1e9) });
    return [(x + 0.5) / A, (y + 0.5) / A, (x + w - 0.5) / A, (y + h - 0.5) / A];
  };
  // a key on a keyboard: the KeyboardEvent.code it answers to → its id (vertices with that id sink when pressed)
  B.keyId = function (code) { if (!this.keys[code]) this.keys[code] = ++this.keyN; return this.keys[code]; };

  // ---- registrations (in world space, through the current matrix)
  // the monitor's picture: centred at the local origin, w × h, facing local +z
  B.screen = function (w, h) {
    var o = this.here([-w / 2, h / 2, 0]), u = this.dir([w, 0, 0]), v = this.dir([0, -h, 0]), n = norm(this.dir([0, 0, 1]));
    this.screens.push({ o: o, u: u, v: v, n: n, c: add(o, add(mulS(u, 0.5), mulS(v, 0.5))), w: w, h: h });
    return this;
  };
  // a lamp at the local origin shining along local dir. spec: { name, color, power, cone (deg, full), soft (deg), glow (0..1
  // of the power that goes everywhere, unshadowed), size (m, softness of its shadow), shadow (bool), on, flicker }
  B.light = function (spec) {
    var d = norm(this.dir(spec.dir || [0, -1, 0]));
    this.lights.push(Object.assign({ color: '#ffd8a8', power: 3, cone: 120, soft: 30, glow: 0.15, size: 0.05, shadow: true, on: true, flicker: 0 }, spec, { pos: this.here([0, 0, 0]), dirW: d }));
    return this;
  };
  // a constant-radiance rectangle light (window, bounce card), centred at the local origin, w × h, facing local +z
  B.rectLight = function (w, h, spec) {
    var o = this.here([-w / 2, -h / 2, 0]), u = this.dir([w, 0, 0]), v = this.dir([0, h, 0]), n = norm(this.dir([0, 0, 1]));
    this.rects.push(Object.assign({ o: o, u: u, v: v, n: n, c: add(o, add(mulS(u, 0.5), mulS(v, 0.5))), area: len(u) * len(v) }, spec));
    return this;
  };
  LR.Builder = Builder;

  // ------------------------------------------------------------------ the shell: walls with holes, floor, ceiling, outside
  // room.shell: { wall: {color, kind}, floor: {color, kind}, ceiling: {color}, skirting: {color, h}, back|left|right|front: {color,
  //   kind, holes: [{x, y, w, h, frame: '#hex', sill: true, bars: [cols, rows], glass: true}]} }
  // Wall-local x runs left → right as seen from inside the room, y up from the floor.
  function buildShell(b, room) {
    var S = room.size, W = S[0], H = S[1], D = S[2], sh = room.shell || {};
    var wallDef = sh.wall || {};
    b.tess = sh.tess || 0.1;
    var walls = {
      back: { o: [0, 0, 0], u: [1, 0, 0], n: [0, 0, 1], l: W },
      right: { o: [W, 0, 0], u: [0, 0, 1], n: [-1, 0, 0], l: D },
      front: { o: [W, 0, D], u: [-1, 0, 0], n: [0, 0, -1], l: W },
      left: { o: [0, 0, D], u: [0, 0, -1], n: [1, 0, 0], l: D }
    };
    var anyHole = false;
    Object.keys(walls).forEach(function (k) {
      var w = walls[k], spec = Object.assign({}, wallDef, sh[k] || {}), holes = spec.holes || [];
      if (spec.skip) return;
      b.mat(spec.kind || 'plaster', spec.color || '#b9aa98', { noCast: true });
      // split the wall at every hole edge, skip the cells inside holes
      var xs = [0, w.l], ys = [0, H];
      holes.forEach(function (h) { xs.push(h.x, h.x + h.w); ys.push(h.y, h.y + h.h); anyHole = true; });
      xs = xs.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, c) { return a - c; });
      ys = ys.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, c) { return a - c; });
      for (var i = 0; i < xs.length - 1; i++) for (var j = 0; j < ys.length - 1; j++) {
        var cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
        if (holes.some(function (h) { return cx > h.x && cx < h.x + h.w && cy > h.y && cy < h.y + h.h; })) continue;
        var o = add(w.o, add(mulS(w.u, xs[i]), [0, ys[j], 0]));
        b.quad(o, mulS(w.u, xs[i + 1] - xs[i]), [0, ys[j + 1] - ys[j], 0], { ao: false, flip: dot(cross(w.u, [0, 1, 0]), w.n) < 0 });
      }
      // wainscot: a lower band in another material
      if (spec.wainscot) {
        var ws = spec.wainscot;
        b.at(function () {
          b.mat(ws.kind || 'wood', ws.color || '#6b4a30', { noCast: true });
          var t = 0.02, o2 = add(w.o, mulS(w.n, t / 2));
          for (var x = 0; x < w.l - 1e-6; x += ws.board || 0.16) {
            var bw = Math.min(ws.board || 0.16, w.l - x) - 0.004, p = add(o2, mulS(w.u, x + bw / 2));
            if (holes.some(function (h) { return x + bw > h.x && x < h.x + h.w && h.y < ws.h; })) continue;
            b.at(function () { b.move(p[0], ws.h / 2, p[2]); b.rotY(Math.atan2(w.n[0], w.n[2]) / D2R); b.box(bw, ws.h, t, { ao: false }); });
          }
          var pr = add(w.o, add(mulS(w.u, w.l / 2), mulS(w.n, 0.02)));
          b.at(function () { b.move(pr[0], ws.h + 0.015, pr[2]); b.rotY(Math.atan2(w.n[0], w.n[2]) / D2R); b.box(w.l, 0.03, 0.04, { ao: false }); });
        });
      }
      // skirting board
      var sk = spec.skirting || sh.skirting;
      if (sk && !spec.wainscot) b.at(function () {
        b.mat(sk.kind || 'paint', sk.color || '#ddd4c6', { noCast: true });
        var p = add(w.o, add(mulS(w.u, w.l / 2), mulS(w.n, 0.008)));
        b.move(p[0], (sk.h || 0.08) / 2, p[2]); b.rotY(Math.atan2(w.n[0], w.n[2]) / D2R); b.box(w.l, sk.h || 0.08, 0.016, { ao: false });
      });
      // the holes: reveals (wall thickness), sill, frame, glazing bars, glass, and the window as a light
      holes.forEach(function (h) {
        var th = h.depth || 0.16, rot = Math.atan2(w.n[0], w.n[2]) / D2R;
        var c = add(w.o, add(mulS(w.u, h.x + h.w / 2), [0, h.y + h.h / 2, 0]));
        b.at(function () {
          b.move(c[0], c[1], c[2]); b.rotY(rot);       // local: x along the wall, y up, +z into the room
          b.mat(spec.kind || 'plaster', spec.color || wallDef.color || '#b9aa98', { noCast: true });
          b.quad([-h.w / 2, -h.h / 2, 0], [0, 0, -th], [0, h.h, 0], { ao: false });
          b.quad([h.w / 2, -h.h / 2, 0], [0, h.h, 0], [0, 0, -th], { ao: false });
          b.quad([-h.w / 2, h.h / 2, 0], [0, 0, -th], [h.w, 0, 0], { ao: false });
          b.quad([-h.w / 2, -h.h / 2, 0], [h.w, 0, 0], [0, 0, -th], { ao: false });
          var fc = h.frame || '#e9e2d6', fk = h.frameKind || 'paint';
          b.mat(fk, fc, { noScreenCast: false });
          var f = h.frameW || 0.045, z = -th + 0.03;
          b.boxAt(-h.w / 2, -h.h / 2, z - f / 2, f, h.h, f); b.boxAt(h.w / 2 - f, -h.h / 2, z - f / 2, f, h.h, f);
          b.boxAt(-h.w / 2, h.h / 2 - f, z - f / 2, h.w, f, f); b.boxAt(-h.w / 2, -h.h / 2, z - f / 2, h.w, f, f);
          var bars = h.bars || [1, 0], k;
          for (k = 1; k <= bars[0]; k++) b.boxAt(-h.w / 2 + h.w * k / (bars[0] + 1) - f / 3, -h.h / 2, z - f / 3, f / 1.5, h.h, f / 1.5);
          for (k = 1; k <= bars[1]; k++) b.boxAt(-h.w / 2, -h.h / 2 + h.h * k / (bars[1] + 1) - f / 3, z - f / 3, h.w, f / 1.5, f / 1.5);
          if (h.sill !== false) { b.mat(fk, fc); b.boxAt(-h.w / 2 - 0.05, -h.h / 2 - 0.03, -th, h.w + 0.1, 0.03, th + 0.06); }
          if (h.glass !== false) { b.mat('glass', '#ffffff'); b.quad([-h.w / 2, -h.h / 2, z - 0.005], [h.w, 0, 0], [0, h.h, 0], { ao: false }); }
          // the night outside comes in as a dim area light
          b.move(0, 0, -th * 0.5); b.rectLight(h.w, h.h, { L: null, outside: true });
        });
      });
    });
    // floor and ceiling
    var fl = sh.floor || {};
    b.mat(fl.kind || 'planks', fl.color || '#7a5536', { noCast: true });
    b.quad([0, 0, D], [W, 0, 0], [0, 0, -D], { ao: false });
    var ce = sh.ceiling || {};
    b.mat(ce.kind || 'plaster', ce.color || '#d8d0c4', { noCast: true });
    b.quad([0, H, 0], [W, 0, 0], [0, 0, D], { ao: false });
    // the outside: one large inward box whose faces draw the sky by view direction; only seen through holes
    if (anyHole) b.at(function () {
      b.tess = 40; b.mat('sky', '#000000', { noCast: true });
      b.move(W / 2, H / 2, D / 2); b.box(60, 60, 60, { ao: false });
    });
    // slabs behind every wall, floor and ceiling (occluders only), so the AO bake darkens corners
    var t = 0.4;
    [[[-t, -t, -t], [W + t, 0, D + t]], [[-t, H, -t], [W + t, H + t, D + t]], [[-t, 0, -t], [0, H, D + t]], [[W, 0, -t], [W + t, H, D + t]], [[-t, 0, -t], [W + t, H, 0]], [[-t, 0, D], [W + t, H, D + t]]]
      .forEach(function (s) { b.boxes.push({ lo: s[0], hi: s[1], id: -2 }); });
    b.tess = 0.1;
  }

  // ------------------------------------------------------------------ ambient occlusion, baked per vertex at load
  // Each vertex casts 12 rays over its hemisphere against the occluder boxes (every box, cylinder, lathe and the shell slabs);
  // near hits darken it. A uniform grid of cells keeps the box list short.
  function bakeAO(b, room) {
    var VA = b.V, n = VA.length / STRIDE, boxes = b.boxes, MAXD = (room.ao && room.ao.reach) || 0.45, STR = (room.ao && room.ao.strength) || 0.85;
    var S = room.size, CELL = 0.4, nx = Math.ceil(S[0] / CELL) + 2, ny = Math.ceil(S[1] / CELL) + 2, nz = Math.ceil(S[2] / CELL) + 2;
    var cells = new Array(nx * ny * nz);
    function ci(x, y, z) { return (HIC.clamp(Math.floor(z / CELL) + 1, 0, nz - 1) * ny + HIC.clamp(Math.floor(y / CELL) + 1, 0, ny - 1)) * nx + HIC.clamp(Math.floor(x / CELL) + 1, 0, nx - 1); }
    boxes.forEach(function (bx, k) {
      var a = [Math.floor((bx.lo[0] - MAXD) / CELL) + 1, Math.floor((bx.lo[1] - MAXD) / CELL) + 1, Math.floor((bx.lo[2] - MAXD) / CELL) + 1];
      var c = [Math.floor((bx.hi[0] + MAXD) / CELL) + 1, Math.floor((bx.hi[1] + MAXD) / CELL) + 1, Math.floor((bx.hi[2] + MAXD) / CELL) + 1];
      for (var z = Math.max(0, a[2]); z <= Math.min(nz - 1, c[2]); z++) for (var y = Math.max(0, a[1]); y <= Math.min(ny - 1, c[1]); y++) for (var x = Math.max(0, a[0]); x <= Math.min(nx - 1, c[0]); x++) {
        var i = (z * ny + y) * nx + x; (cells[i] || (cells[i] = [])).push(k);
      }
    });
    var NR = 12, dirs = [];
    for (var r = 0; r < NR; r++) { var u = (r + 0.5) / NR, ph = r * 2.39996, s = Math.sqrt(u); dirs.push([Math.cos(ph) * s, Math.sin(ph) * s, Math.sqrt(1 - u)]); }
    for (var i = 0; i < n; i++) {
      var o = i * STRIDE, kind = VA[o + 12];
      if (kind === 15 || kind === 14 || kind === 9) continue;
      var P = [VA[o], VA[o + 1], VA[o + 2]], N = [VA[o + 3], VA[o + 4], VA[o + 5]], own = b.vprim[i];
      var list = cells[ci(P[0], P[1], P[2])]; if (!list) continue;
      var T = norm(Math.abs(N[1]) < 0.9 ? cross([0, 1, 0], N) : cross([1, 0, 0], N)), Bt = cross(N, T);
      var O = [P[0] + N[0] * 0.002, P[1] + N[1] * 0.002, P[2] + N[2] * 0.002], occ = 0, two = VA[o + 15] & F_TWO;
      for (r = 0; r < NR; r++) {
        var d = dirs[r], R = [T[0] * d[0] + Bt[0] * d[1] + N[0] * d[2], T[1] * d[0] + Bt[1] * d[1] + N[1] * d[2], T[2] * d[0] + Bt[2] * d[1] + N[2] * d[2]];
        var best = MAXD;
        for (var q = 0; q < list.length; q++) {
          var bx = boxes[list[q]]; if (bx.id === own) continue;
          var lo = bx.lo, hi = bx.hi;
          if (O[0] > lo[0] && O[0] < hi[0] && O[1] > lo[1] && O[1] < hi[1] && O[2] > lo[2] && O[2] < hi[2]) continue;
          var t0 = 0, t1 = best, ok = true;
          for (var a = 0; a < 3 && ok; a++) {
            var inv = 1 / (R[a] || 1e-9), ta = (lo[a] - O[a]) * inv, tb = (hi[a] - O[a]) * inv;
            if (ta > tb) { var tt = ta; ta = tb; tb = tt; }
            if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) ok = false;
          }
          if (ok && t0 < best) best = t0;
        }
        if (best < MAXD) occ += 1 - best / MAXD * 0.6;
      }
      var ao = 1 - STR * Math.min(1, occ / NR * 1.25);
      VA[o + 19] = two ? Math.max(ao, 0.6) : Math.max(0.12, ao);
    }
  }

  // ------------------------------------------------------------------ shaders
  var H = '#version 300 es\nprecision highp float;\nprecision highp int;\n';
  var SCENE_VS = H + [
    'layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec3 aTex; layout(location=3) in vec4 aCol;',
    'layout(location=4) in vec4 aMat; layout(location=5) in vec2 aUv; layout(location=6) in float aAo;',
    'uniform mat4 uVP; uniform sampler2D uGrid, uKeys; uniform ivec2 uGridN; uniform float uKeyTravel;',
    'uniform vec3 uSO, uSU, uSV, uSN; uniform float uGain, uLightK;',
    'uniform int uRectN; uniform vec3 uRO[4], uRU[4], uRV[4], uRN[4], uRL[4];',
    'out vec3 vPos, vNor, vTex, vScr, vRect; out vec4 vCol, vMat; out vec2 vUv; out float vAo;',
    // irradiance at p (normal n) from a small patch at c (normal ns, area A); the A/π term keeps it finite up close
    'float patchE(vec3 p, vec3 n, vec3 c, vec3 ns, float A, bool two){ vec3 d = c - p; float r2 = dot(d,d) + 1e-6; vec3 dn = d * inversesqrt(r2);',
    '  float cr = dot(n, dn); cr = two ? abs(cr) * .7 : max(cr, 0.); return A * cr * max(-dot(ns, dn), 0.) / (r2 + A * .3183); }',
    'void main(){',
    '  vec3 p = aPos; int key = int(aMat.w + .5);',
    '  if (key > 0) p.y -= uKeyTravel * texelFetch(uKeys, ivec2(key, 0), 0).r;',
    '  vec3 n = normalize(aNor); bool two = (int(aMat.z + .5) & 1) != 0;',
    '  vec3 E = vec3(0.); float A = length(uSU) * length(uSV) / float(uGridN.x * uGridN.y);',
    '  for (int j = 0; j < 12; j++) { if (j >= uGridN.y) break; for (int i = 0; i < 16; i++) { if (i >= uGridN.x) break;',
    '    vec3 c = uSO + uSU * ((float(i) + .5) / float(uGridN.x)) + uSV * ((float(j) + .5) / float(uGridN.y));',
    '    vec3 g = texelFetch(uGrid, ivec2(i, j), 0).rgb; E += g * g * patchE(p, n, c, uSN, A, two); } }',
    '  vScr = E * uGain * uLightK;',
    '  vec3 R = vec3(0.);',
    '  for (int k = 0; k < 4; k++) { if (k >= uRectN) break; float a = length(uRU[k]) * length(uRV[k]) / 9.;',
    '    for (int j = 0; j < 3; j++) for (int i = 0; i < 3; i++) R += uRL[k] * patchE(p, n, uRO[k] + uRU[k] * ((float(i) + .5) / 3.) + uRV[k] * ((float(j) + .5) / 3.), uRN[k], a, two); }',
    '  vRect = R * aAo;',
    '  vPos = p; vNor = n; vTex = aTex; vCol = aCol; vMat = aMat; vUv = aUv; vAo = aAo;',
    '  gl_Position = uVP * vec4(p, 1.);',
    '}'].join('\n');

  var SCENE_FS = H + [
    'in vec3 vPos, vNor, vTex, vScr, vRect; in vec4 vCol, vMat; in vec2 vUv; in float vAo;',
    'uniform sampler2D uPage, uLin, uShadow, uNoise, uAtlas;',
    'uniform vec3 uCam, uSO, uSU, uSV, uSN; uniform float uGain, uPass, uHdr, uTime, uScrHdr;',
    'uniform mat4 uShM[4]; uniform vec4 uShT[4], uShP[4];',
    'uniform int uLampN; uniform vec4 uLP[6], uLD[6], uLC[6], uLX[6]; uniform float uLampLvl[6];',
    'uniform vec3 uAmbS, uAmbG; uniform vec4 uSky0, uSky1, uSky2, uSky3, uMoon;',
    'out vec4 o;',
    'const float PI = 3.14159265;',
    'vec3 lin(vec3 c){ return mix(c / 12.92, pow((c + .055) / 1.055, vec3(2.4)), step(.04045, c)); }',
    'vec4 nz(vec2 p){ return texture(uNoise, p); }',
    'float fbm(vec2 p){ return nz(p).r * .5 + nz(p * 2.03 + .37).g * .3 + nz(p * 4.1 + .71).b * .2; }',
    'float h12(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }',
    'float linz(float d, vec4 P){ return 2. * P.x * P.y / (P.y + P.x - (2. * d - 1.) * (P.y - P.x)); }',
    'const vec2 PD[12] = vec2[12](vec2(-.326,-.406), vec2(-.840,-.074), vec2(-.696,.457), vec2(-.203,.621), vec2(.962,-.195), vec2(.473,-.480),',
    '  vec2(.519,.767), vec2(.185,-.893), vec2(.507,.064), vec2(.896,.412), vec2(-.322,-.933), vec2(-.792,-.598));',
    // soft shadow from tile k of the atlas: blocker search, then a filter whose width grows with the gap (PCSS)
    'float shadowK(int k, vec3 P, vec3 N, float rot){',
    '  vec4 c = uShM[k] * vec4(P + N * .008, 1.); if (c.w <= 1e-4) return 1.;',
    '  vec3 q = c.xyz / c.w; if (abs(q.x) > 1. || abs(q.y) > 1. || q.z > 1.) return 1.;',
    '  vec4 T = uShT[k], S = uShP[k]; vec2 uv = T.xy + (q.xy * .5 + .5) * T.z; float zr = c.w, px = T.z / 1024.;',
    '  float uvW = .5 * T.w * T.z / zr;  /* atlas uv per metre at the receiver */',
    '  mat2 R = mat2(cos(rot), sin(rot), -sin(rot), cos(rot)); float bias = .006 + zr * .004;',
    '  float sr = clamp(S.z * uvW * .9, 2. * px, T.z * .06), zb = 0., nb = 0.;',
    '  for (int i = 0; i < 8; i++) { vec2 t = clamp(uv + R * PD[i] * sr, T.xy + px, T.xy + T.z - px); float z = linz(texture(uShadow, t).r, S);',
    '    if (z < zr - bias) { zb += z; nb += 1.; } }',
    '  if (nb < .5) return 1.;',
    '  zb /= nb; float pen = clamp(S.z * (zr - zb) / max(zb - S.w, .03) * uvW, 1.2 * px, T.z * .08);',
    '  float vis = 0.;',
    '  for (int i = 0; i < 12; i++) { vec2 t = clamp(uv + R * PD[i] * pen, T.xy + px, T.xy + T.z - px); vis += step(zr - bias, linz(texture(uShadow, t).r, S)); }',
    '  return vis / 12.; }',
    // the page reflected in glossy things: a ray against the screen plane, blurred by roughness through the mip chain
    'vec3 glint(vec3 P, vec3 R, float rough, out float cov){',
    '  cov = 0.; float dn = dot(R, uSN); if (dn > -1e-3) return vec3(0.);',
    '  float t = dot(uSO - P, uSN) / dn; if (t <= 1e-4) return vec3(0.);',
    '  vec3 h = P + R * t - uSO; vec2 uv = vec2(dot(h, uSU) / dot(uSU, uSU), dot(h, uSV) / dot(uSV, uSV));',
    '  float bw = t * (rough * rough * 1.1 + .003) / length(uSU); vec2 rr = vec2(bw, bw * length(uSU) / length(uSV));',
    '  vec2 c = clamp((min(uv + rr, 1.) - max(uv - rr, 0.)) / (2. * rr), 0., 1.); cov = c.x * c.y; if (cov <= 0.) return vec3(0.);',
    '  float lod = clamp(log2(max(bw * 256., 1.)), 0., 7.); vec2 q = clamp(uv, rr * .5, 1. - rr * .5);',
    '  vec3 g = textureLod(uLin, q, lod).rgb; return g * g * cov * uGain; }',
    // the night outside: gradient, glow at the horizon, stars, far lights or a sea with the moon on it
    'vec3 sky(vec3 d){',
    '  float el = d.y, az = atan(d.x, -d.z);',
    '  vec3 c = mix(uSky0.rgb, uSky1.rgb, smoothstep(-.02, .55, el)) + uSky2.rgb * exp(-max(el, 0.) * 9.);',
    '  vec2 g = vec2(az, el) * 60.; vec2 id = floor(g), f = fract(g) - .5; float r = h12(id);',
    '  c += vec3(.9, .92, 1.) * smoothstep(.07, 0., length(f - vec2(h12(id + 3.), h12(id + 7.)) + .5)) * step(.93, r) * uSky0.a * smoothstep(.05, .3, el) * .5;',
    '  vec3 md = normalize(uMoon.xyz); float mc = dot(d, md); c += vec3(1., .96, .86) * (smoothstep(1. - uMoon.w, 1. - uMoon.w * .8, mc) * 3. + exp((mc - 1.) * 300.) * .4);',
    '  if (el < 0.) {',
    '    if (uSky3.a > .5) { float w = fbm(vec2(az * 20., el * 60. + uTime * .02)); c = uSky3.rgb * (.6 + .5 * w) + vec3(1., .95, .8) * pow(max(dot(reflect(d, vec3(0., 1., 0.)), md), 0.), 60.) * .6 * (.4 + w);',
    '      c = mix(c, uSky2.rgb * .5 + uSky3.rgb, exp(el * 30.)); }',
    '    else { c = mix(c, uSky3.rgb, smoothstep(0., -.02, el));',
    '      vec2 q = vec2(az * 90., el * 140.); vec2 qi = floor(q); float lr = h12(qi + 11.); vec2 lp = fract(q) - .5;',
    '      c += mix(vec3(1., .7, .4), vec3(.7, .85, 1.), step(.7, h12(qi + 5.))) * step(1. - uSky1.a, lr) * step(-.25, el) * smoothstep(.3, 0., length(lp)) * 1.2; } }',
    '  return c * uSky2.a; }',
    'void main(){',
    '  int kind = int(vCol.a + .5), flags = int(vMat.z + .5);',
    '  vec3 N = normalize(vNor); vec3 V = normalize(uCam - vPos);',
    '  if ((flags & 1) != 0 && dot(N, V) < 0.) N = -N;',
    '  if (uPass > .5) {   /* glass: only what it reflects, added on top */',
    '    float nv = abs(dot(N, V)); float F = .04 + .96 * pow(1. - nv, 5.); float cov; vec3 R = reflect(-V, N);',
    '    vec3 g = glint(vPos, R, .05, cov); o = vec4((g * .9 + vScr * .002) * F * uHdr, 0.); return; }',
    '  if (kind == 9) {     /* the monitor: the page as authored (alpha 1 = display path in the post pass) */',
    '    vec2 uv = vec2(dot(vPos - uSO, uSU) / dot(uSU, uSU), dot(vPos - uSO, uSV) / dot(uSV, uSV));',
    '    vec3 c = lin(texture(uPage, uv).rgb); float nv = max(dot(N, V), 0.); c *= mix(.6, 1., smoothstep(0., .6, nv));',
    '    o = vec4(c * uScrHdr * uHdr, 1.); return; }',
    '  if (kind == 15) { o = vec4(sky(normalize(vPos - uCam)) * vMat.y * uHdr, 0.); return; }',
    '  vec3 alb = vCol.rgb; float rough = vMat.x, specK = vMat.y, metal = 0.; vec3 T = vTex;',
    '  if (kind == 14) { int li = (flags >> 4) - 1; float lv = li >= 0 ? uLampLvl[li] : 1.; o = vec4(alb * vMat.y * lv * uHdr, 0.); return; }',
    '  if (kind == 1) {          /* wood: grain along local x */',
    '    vec2 w = vec2(T.x * .5, T.y * 1.3 + T.z * .9);',
    '    float warp = nz(vec2(w.x * .4, w.y * .2)).r * 2.2, rg = fract(w.y * 5.5 + warp);',
    '    float late = smoothstep(.35, .9, rg) * (1. - smoothstep(.92, 1., rg)); float pore = smoothstep(.6, .85, nz(vec2(w.x * 3., w.y * 60.)).g);',
    '    alb *= mix(1.06, .74, late * .8) * mix(1., .8, pore * .5) * mix(.9, 1.08, nz(w * vec2(1.5, 9.)).b); rough *= mix(1., 1.25, pore);',
    '  } else if (kind == 2) {   /* floor planks running along z */',
    '    float pw = .15, row = floor(T.x / pw), off = h12(vec2(row, 3.)), along = T.z / 1.3 + off, seg = floor(along), id = h12(vec2(row, seg));',
    '    vec2 w = vec2(T.z * .5 + id * 7., T.x * 1.5 + id * 3.); float rg = fract(w.y * 6. + nz(vec2(w.x * .3, w.y * .2)).r * 2.);',
    '    alb *= mix(.8, 1.15, id) * mix(1.05, .8, smoothstep(.4, .9, rg)) * mix(.92, 1.06, nz(w * vec2(1., 12.)).g);',
    '    float gx = abs(fract(T.x / pw) - .5) * pw, gz = abs(fract(along) - .5) * 1.3;',
    '    float gap = min(smoothstep(pw * .5 - .001, pw * .5 - .003, gx), smoothstep(.65 - .001, .65 - .003, gz)); alb *= mix(.35, 1., gap); specK *= gap;',
    '  } else if (kind == 19) {  /* boards: horizontal planking on walls (rows along y, grain along the wall) */',
    '    float bw = .14, row = floor(T.y / bw), id = h12(vec2(row, 9.)); float al = T.x + T.z + id * 5.;',
    '    vec2 w = vec2(al * .5, T.y * 4. + id * 3.); float rg = fract(w.y * 1.5 + al * .03 + nz(vec2(w.x * .25, row * .37)).r * 1.6);',
    '    alb *= mix(.82, 1.12, id) * mix(1.04, .84, smoothstep(.45, .95, rg)) * mix(.93, 1.05, nz(vec2(al * 2., T.y * 30.)).g);',
    '    float gy = abs(fract(T.y / bw) - .5) * bw; float gap = smoothstep(bw * .5 - .0015, bw * .5 - .004, gy); alb *= mix(.3, 1., gap); specK *= gap;',
'  } else if (kind == 0) {   /* paint, plaster */',
    '    alb *= mix(.96, 1.03, fbm(T.xy * 1.7 + T.zx * 1.3)) * mix(.985, 1.01, nz((T.xy + T.zy) * 31.).r);',
    '  } else if (kind == 5 || kind == 13) {   /* fabric, rug: threads */',
    '    vec2 g = (T.xz + T.y * vec2(.7, .4)) * (kind == 13 ? .5 : 1.);',
    '    alb *= mix(.82, 1.12, .5 * (nz(vec2(g.x * 40., g.y * 2.)).r + nz(vec2(g.x * 2., g.y * 40.)).g)) * mix(.92, 1.06, fbm(g * 1.5));',
    '  } else if (kind == 4 || kind == 17) { metal = 1.; rough = clamp(rough + (nz(vec2(T.x * 3., T.y * 200. + T.z * 200.)).r - .5) * .12, .05, 1.);',
    '  } else if (kind == 8) { float vein = abs(fract(T.y * 14. + abs(T.x) * 6.) - .5); alb *= mix(.85, 1.15, fbm(T.xy * 6.)) * mix(1., 1.2, smoothstep(.08, 0., vein) * .4);',
    '  } else if (kind == 7) { alb *= mix(.95, 1.03, nz((T.xy + T.zx) * 14.).r);',
    '  } else if (kind == 18) { alb *= mix(.5, 1.3, nz(T.xz * 40.).r); }',
    '  if (vUv.x >= 0.) { vec4 a = texture(uAtlas, vUv); alb = mix(alb, lin(a.rgb) * (kind == 16 || kind == 10 ? vec3(1.) : alb / max(max(alb.r, alb.g), max(alb.b, .02))), a.a); }',
    '  float rot = h12(gl_FragCoord.xy) * 6.283;',
    '  float vis = (flags & 2) != 0 ? 1. : shadowK(0, vPos, N, rot);',
    '  vec3 E = vScr * mix(.1, 1., vis) + vRect + mix(uAmbG, uAmbS, N.y * .5 + .5) * vAo;',
    '  vec3 f0 = mix(vec3(.04), alb, metal), Ls = vec3(0.);',
    '  float nv = clamp(dot(N, V), 0., 1.); float a2 = max(rough * rough, .002); a2 *= a2;',
    '  for (int i = 0; i < 6; i++) { if (i >= uLampN) break;',
    '    vec3 L = uLP[i].xyz - vPos; float r2 = dot(L, L); L *= inversesqrt(r2);',
    '    float cone = smoothstep(uLD[i].w, uLX[i].x, dot(-L, uLD[i].xyz));',
    '    float sv = (uLP[i].w > -.5 && (flags & 4) == 0) ? shadowK(int(uLP[i].w + .5), vPos, N, rot) : 1.;',
    '    float k = uLC[i].w * vAo + (1. - uLC[i].w) * cone * sv;',
    '    float ndl = dot(N, L); ndl = (flags & 1) != 0 ? abs(ndl) * .8 : max(ndl, 0.);',
    '    vec3 Li = uLC[i].rgb * k / (r2 + uLX[i].y * uLX[i].y);',
    '    E += Li * ndl;',
    '    vec3 Hh = normalize(L + V); float nh = max(dot(N, Hh), 0.), dd = nh * nh * (a2 - 1.) + 1.;',
    '    Ls += Li * ndl * a2 / (PI * dd * dd + 1e-5) * .25 * cone * sv; }',
    '  vec3 F = f0 + (max(vec3(1. - rough), f0) - f0) * pow(1. - nv, 5.);',
    '  float cov; vec3 sr = glint(vPos, reflect(-V, N), rough, cov) * mix(.15, 1., vis);',
    '  vec3 col = (1. - metal) * alb * E / PI + (F * (sr + vScr / PI * (1. - cov) * .25) + Ls * F) * specK;',
    // metals have no diffuse: give them a rough stand-in for the room around them (the light that reaches them, blurred)
    '  col += metal * F * E / PI * (.35 + .4 * rough);',
    '  o = vec4(col * uHdr, 0.);',
    '}'].join('\n');

  var SHADOW_VS = H + 'layout(location=0) in vec3 aPos; layout(location=4) in vec4 aMat; uniform mat4 uVP; uniform int uMask;\n' +
    'void main(){ int f = int(aMat.z + .5); gl_Position = (f & uMask) != 0 ? vec4(2., 2., 2., 1.) : uVP * vec4(aPos, 1.); }';
  var SHADOW_FS = H + 'out vec4 o; void main(){ o = vec4(1.); }';

  // page → small linear-ish texture (stored as sqrt for 8-bit precision), and the cell grid the room is lit by
  var LIN_FS = H + [
    'in vec2 vUv; out vec4 o; uniform sampler2D uPage; uniform float uLod; uniform vec2 uTap;',
    'vec3 lin(vec3 c){ return mix(c / 12.92, pow((c + .055) / 1.055, vec3(2.4)), step(.04045, c)); }',
    'void main(){ vec3 s = vec3(0.); for (int j = 0; j < 4; j++) for (int i = 0; i < 4; i++) s += lin(textureLod(uPage, vUv + (vec2(i, j) - 1.5) * uTap, uLod).rgb);',
    '  o = vec4(sqrt(s / 16.), 1.); }'].join('\n');
  var POST_FS = H + [
    'in vec2 vUv; out vec4 o; uniform sampler2D uHdr; uniform float uExp, uBloom, uGrain, uVig, uHdrK, uScrK, uSeed; uniform vec2 uRes;',
    'vec3 srgb(vec3 c){ c = clamp(c, 0., 1.); return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }',
    'vec3 aces(vec3 x){ return clamp(x * (2.51 * x + .03) / (x * (2.43 * x + .59) + .14), 0., 1.); }',
    'float h12(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }',
    'vec3 tap(float l){ vec2 d = .7 / vec2(textureSize(uHdr, int(l))); return (textureLod(uHdr, vUv + d, l).rgb + textureLod(uHdr, vUv - d, l).rgb + textureLod(uHdr, vUv + vec2(d.x, -d.y), l).rgb + textureLod(uHdr, vUv - vec2(d.x, -d.y), l).rgb) * .25; }',
    'void main(){',
    '  vec4 c = texture(uHdr, vUv); c.rgb /= uHdrK;',
    '  vec3 b = (tap(2.) * .2 + tap(3.) * .3 + tap(4.) * .3 + tap(5.) * .2) / uHdrK;',
    '  vec2 q = vUv - .5; float vig = 1. - dot(q, q) * uVig;',
    '  vec3 scene = srgb(aces((c.rgb + b * uBloom) * uExp * vig));',
    '  vec3 disp = srgb(c.rgb * uExp / uScrK * mix(1., vig, .4));',
    '  vec3 r = mix(scene, disp, clamp(c.a, 0., 1.));',
    '  r += (h12(gl_FragCoord.xy + uSeed) - .5) * uGrain * (1. - dot(r, vec3(.33)) * .7);',
    '  o = vec4(r, 1.); }'].join('\n');

  // ------------------------------------------------------------------ start
  // opts: { canvas, page, room, onReady(R), note }
  LR.start = function (opts) {
    var canvas = opts.canvas, page = opts.page, room = opts.room;
    if (!HIC.supported('webgl')) { HIC.fallback(canvas, { note: opts.note }); return { fallback: true }; }
    var q = parseFloat(HIC.param('q')); if (!(q > 0)) q = 1;
    var STILL = HIC.still !== null, CALM = HIC.calm, NOINTRO = STILL || CALM || HIC.param('nointro') !== null;
    var S = HIC.stage(canvas, { gl: { antialias: false, alpha: false, depth: false, stencil: false }, quality: q, maxDpr: 2 });
    var gl = S.gl;
    if (!gl) { HIC.fallback(canvas, { note: opts.note }); return { fallback: true }; }
    // screenGain: the page's radiance in the reflections; screenLight: how strongly it lights the room; screenGlow: how bright it
    // looks after exposure (bloom from it)
    var look = Object.assign({ exposure: 1, bloom: 0.35, grain: 0.02, vignette: 0.55, screenGain: 1.6, screenLight: 6, screenGlow: 1.15 }, room.look || {});
    var PW = page.offsetWidth || 1280, PH = page.offsetHeight || 720;

    // ---- build
    var t0 = performance.now();
    var b = new Builder(room);
    buildShell(b, room);
    (room.props || []).forEach(function (p) {
      var fn = PROPS[p.type]; if (!fn) { console.warn('lit-room: no prop "' + p.type + '"'); return; }
      b.obj(function () { var a = p.at || [0, 0, 0]; b.move(a[0], a[1], a[2]); if (p.rot) b.rotY(p.rot); b.tess = p.tess || 0.06; fn(b, p, room); });
    });
    (room.lamps || []).forEach(function (l) { b.at(function () { b.move(l.at[0], l.at[1], l.at[2]); b.light(l); }); });
    if (!b.screens.length) throw new Error('lit-room: the room needs a monitor (a prop that calls b.screen)');
    var scr = b.screens[0];
    bakeAO(b, room);
    var buildMs = performance.now() - t0;

    // ---- geometry buffers
    var VBO = new Float32Array(b.V), IB = new Uint32Array(b.I.concat(b.IG)), nOpaque = b.I.length, nGlass = b.IG.length;
    var vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, VBO, gl.STATIC_DRAW);
    [[0, 3, 0], [1, 3, 3], [2, 3, 6], [3, 4, 9], [4, 4, 13], [5, 2, 17], [6, 1, 19]].forEach(function (a) {
      gl.enableVertexAttribArray(a[0]); gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, STRIDE * 4, a[2] * 4);
    });
    var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, IB, gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    var P = {
      scene: HIC.gl.program(gl, SCENE_VS, SCENE_FS), shadow: HIC.gl.program(gl, SHADOW_VS, SHADOW_FS),
      lin: HIC.gl.program(gl, null, LIN_FS), post: HIC.gl.program(gl, null, POST_FS)
    };
    var aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    var floatOK = !!gl.getExtension('EXT_color_buffer_float');
    var HDRF = floatOK ? gl.RGBA16F : gl.RGBA8, HDRK = floatOK ? 1 : 0.25;

    // ---- textures: noise, atlas, keys, page, lin, grid
    var noiseTex = (function () {
      var n = 256, d = new Uint8Array(n * n * 4), r = HIC.rng(911);
      [16, 32, 64, 128].forEach(function (g, c) {
        var lat = new Float32Array(g * g); for (var i = 0; i < g * g; i++) lat[i] = r();
        for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
          var fx = x / n * g, fy = y / n * g, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
          tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
          var a = lat[y0 * g + x0], bb = lat[y0 * g + (x0 + 1) % g], cc = lat[((y0 + 1) % g) * g + x0], dd = lat[((y0 + 1) % g) * g + (x0 + 1) % g];
          d[(y * n + x) * 4 + c] = Math.round(255 * ((a * (1 - tx) + bb * tx) * (1 - ty) + (cc * (1 - tx) + dd * tx) * ty));
        }
      });
      var t = HIC.gl.texture(gl, { w: n, h: n, data: d, wrap: 'repeat', mips: true }); gl.generateMipmap(gl.TEXTURE_2D);
      return t;
    })();
    var atlasTex = (function () {
      var A = b.ATLAS, c = document.createElement('canvas'); c.width = c.height = b.atlasJobs.length ? A : 4;
      var g = c.getContext('2d');
      b.atlasJobs.forEach(function (j) {
        g.save(); g.translate(j.x, j.y); g.beginPath(); g.rect(0, 0, j.w, j.h); g.clip();
        try { j.draw(g, j.w, j.h, HIC.rng(j.seed)); } catch (e) { console.warn('lit-room atlas', e); }
        g.restore();
      });
      var t = HIC.gl.texture(gl, { mips: true });
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, c); gl.generateMipmap(gl.TEXTURE_2D);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
      return t;
    })();
    var NKEY = 128, keyAmt = new Float32Array(NKEY), keyGoal = new Float32Array(NKEY), keyBytes = new Uint8Array(NKEY);
    var keyTex = HIC.gl.texture(gl, { w: NKEY, h: 1, internal: gl.R8, format: gl.RED, filter: 'nearest' });
    var pageTex = HIC.gl.texture(gl, { mips: true });
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    var LW = 256, LH = Math.max(8, Math.round(256 * PH / PW));
    var linT = HIC.gl.target(gl, LW, LH); gl.bindTexture(gl.TEXTURE_2D, linT.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.generateMipmap(gl.TEXTURE_2D);
    var GN = (room.screen && room.screen.grid) || [8, 5];
    var gridT = HIC.gl.target(gl, GN[0], GN[1], { filter: 'nearest' }), gridPx = new Uint8Array(GN[0] * GN[1] * 4);

    // ---- shadows: one depth atlas, tile 0 = the screen, tiles 1–3 = the first three shadowed lamps. Drawn once.
    var SHN = 2048, shTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, shTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SHN, SHN);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var shFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, shFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shTex, 0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    var shM = new Float32Array(64), shT = new Float32Array(16), shP = new Float32Array(16);
    function shadowView(k, eye, dir, upHint, fovDeg, near, far, size, z0) {
      var up = Math.abs(dot(upHint, dir)) > 0.95 ? [1, 0, 0] : upHint;
      var f = 1 / Math.tan(fovDeg * D2R / 2);
      var vp = M4.mul(M4.perspective(fovDeg * D2R, 1, near, far), M4.lookAt(eye, add(eye, dir), up));
      shM.set(vp, k * 16);
      shT.set([(k & 1) * 0.5, (k >> 1) * 0.5, 0.5, f], k * 4);
      shP.set([near, far, size, z0 || 0], k * 4);
      return vp;
    }
    var screenBack = 0.3;
    var views = [{ vp: shadowView(0, sub(scr.c, mulS(scr.n, screenBack)), scr.n, mulS(norm(scr.v), -1), 112, screenBack + 0.01, 9, Math.min(scr.w, 0.7) * 0.8, screenBack), mask: F_NOSCREENCAST | F_NOCAST }];
    var lamps = b.lights.slice(0, 6), lampTile = [];
    lamps.forEach(function (l) {
      if (l.shadow && views.length < 4) {
        var k = views.length, fov = Math.min(150, Math.max(40, (l.cone || 120) + 20));
        views.push({ vp: shadowView(k, l.pos, l.dirW, [0, 1, 0], fov, 0.04, 9, l.size || 0.05, 0), mask: F_NOCAST | (l.ignore ? F_NOSCREENCAST : 0) });
        lampTile.push(k);
      } else lampTile.push(-1);
    });
    function drawShadows() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, shFbo); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
      gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT);
      P.shadow.use(); gl.bindVertexArray(vao);
      views.forEach(function (v, k) {
        gl.viewport((k & 1) * SHN / 2, (k >> 1) * SHN / 2, SHN / 2, SHN / 2);
        gl.uniformMatrix4fv(P.shadow.u.uVP, false, v.vp); gl.uniform1i(P.shadow.u.uMask, v.mask);
        gl.drawElements(gl.TRIANGLES, nOpaque, gl.UNSIGNED_INT, 0);
      });
      gl.bindVertexArray(null); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // ---- render targets
    var RT = null;
    function makeTargets() {
      var w = canvas.width, h = canvas.height;
      if (RT) { RT.kill(); }
      var samples = q >= 0.99 ? Math.min(4, gl.getParameter(gl.MAX_SAMPLES)) : 0;
      var fb = gl.createFramebuffer(), cr = gl.createRenderbuffer(), dr = gl.createRenderbuffer();
      var levels = Math.floor(Math.log2(Math.max(w, h))) + 1, hdr = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, hdr); gl.texStorage2D(gl.TEXTURE_2D, levels, HDRF, w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var rf = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, rf); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, hdr, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.bindRenderbuffer(gl.RENDERBUFFER, dr);
      if (samples) {
        gl.bindRenderbuffer(gl.RENDERBUFFER, cr); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, HDRF, w, h);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, cr);
        gl.bindRenderbuffer(gl.RENDERBUFFER, dr); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
      } else {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, hdr, 0);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      }
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, dr);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      RT = { w: w, h: h, fb: fb, rf: rf, hdr: hdr, samples: samples, kill: function () { gl.deleteFramebuffer(fb); gl.deleteFramebuffer(rf); gl.deleteRenderbuffer(cr); gl.deleteRenderbuffer(dr); gl.deleteTexture(hdr); } };
    }

    // ---- camera: orbit around a target in front of the screen, eased; the screen faces +yaw 0
    var C = Object.assign({ fov: 40, yaw: [-1.1, 1.1], pitch: [-0.15, 0.62], dist: [0.55, 2.8], home: [0.32, 0.16, 1.7], start: [-0.18, 0.1, 1.15], close: [0, 0.06, 0.78] }, room.camera || {});
    var target = C.target || add(scr.c, [0, -0.06, 0]), yaw0 = Math.atan2(scr.n[0], scr.n[2]);
    var cam = { yaw: C.home[0], pitch: C.home[1], dist: C.home[2], ty: C.home[0], tp: C.home[1], td: C.home[2], eye: [0, 0, 0], vp: null, m: null, facing: true };
    var glide = null;
    if (!NOINTRO) { cam.yaw = cam.ty = C.start[0]; cam.pitch = cam.tp = C.start[1]; cam.dist = cam.td = C.start[2]; glide = { t: 0, dur: 6 }; }
    function stopGlide() { if (glide) { glide = null; cam.ty = cam.yaw; cam.tp = cam.pitch; cam.td = cam.dist; } }
    function updateCamera() {
      var cp = Math.cos(cam.pitch), y = yaw0 + cam.yaw, Sz = room.size, m = 0.12;
      var e = [target[0] + Math.sin(y) * cp * cam.dist, target[1] + Math.sin(cam.pitch) * cam.dist, target[2] + Math.cos(y) * cp * cam.dist];
      e = [HIC.clamp(e[0], m, Sz[0] - m), HIC.clamp(e[1], 0.3, Sz[1] - m), HIC.clamp(e[2], m, Sz[2] - m)];
      cam.eye = e;
      var asp = canvas.width / canvas.height, fy = C.fov * D2R;
      if (asp < 1.45) fy = Math.min(2 * Math.atan(Math.tan(fy / 2) * 1.45 / asp), 100 * D2R);
      cam.vp = M4.mul(M4.perspective(fy, asp, 0.03, 80), M4.lookAt(e, target, [0, 1, 0]));
    }
    // world → canvas CSS px (and w); the page's homography is built from it
    function clipOf(p, w) { var m = cam.vp; return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12] * w, m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13] * w, m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15] * w]; }
    function project(p) { var c = clipOf(p, 1); return c[2] > 1e-4 ? [S.W * 0.5 * (c[0] / c[2] + 1), S.H * 0.5 * (1 - c[1] / c[2]), c[2]] : null; }
    function homography() {
      var css = function (c) { return [0.5 * S.W * (c[0] + c[2]), 0.5 * S.H * (c[2] - c[1]), c[2]]; };
      var a = css(clipOf(mulS(scr.u, 1 / PW), 0)), bb = css(clipOf(mulS(scr.v, 1 / PH), 0)), o = css(clipOf(scr.o, 1));
      var corners = [o[2], o[2] + a[2] * PW, o[2] + bb[2] * PH, o[2] + a[2] * PW + bb[2] * PH];
      cam.facing = dot(sub(cam.eye, scr.c), scr.n) > 0.02 && corners.every(function (w) { return w > 0.02; });
      // z passes through (identity in row/column 3) so the CSS matrix stays invertible
      cam.m = [a[0], a[1], 0, a[2], bb[0], bb[1], 0, bb[2], 0, 0, 1, 0, o[0], o[1], 0, o[2]];
    }
    function pageToCanvas(x, y) { var m = cam.m, w = m[3] * x + m[7] * y + m[15]; return [(m[0] * x + m[4] * y + m[12]) / w, (m[1] * x + m[5] * y + m[13]) / w]; }
    function canvasToPage(X, Y) {
      var m = cam.m, a = m[0], bq = m[4], c = m[12], d = m[1], e = m[5], f = m[13], g = m[3], h = m[7], i = m[15];
      // solve the 3×3 homography for (x, y)
      var A = [a - g * X, bq - h * X, d - g * Y, e - h * Y], r = [X * i - c, Y * i - f], det = A[0] * A[3] - A[1] * A[2];
      return { x: (r[0] * A[3] - A[1] * r[1]) / det, y: (A[0] * r[1] - A[2] * r[0]) / det };
    }
    var placed = '', probing = true, geoPoke = 0;
    function place() {
      if (probing) return;
      var key = cam.facing ? cam.m.map(function (v) { return v.toFixed(3); }).join() : 'off';
      if (key === placed) return; placed = key;
      S.place(page, cam.facing ? cam.m : null);
      // some builds keep answering hit tests from before a geometry move until something outside the canvas changes
      if (S.mode === 'geo') document.documentElement.setAttribute('data-lr-g', String(geoPoke = (geoPoke + 1) % 997));
    }

    // ---- state
    var pageReady = false, pageDirty = false, relights = 0, uploads = 0, renders = 0, needRender = true, inflight = null, slow = false, gpuEma = 16, lastRender = 0;
    var shadowsDone = false, stats = { avg: [0, 0, 0], lum: 0 }, exposure = 1, expGoal = 1, lampOn = lamps.map(function (l) { return l.on !== false ? 1 : 0; }), lampLvl = lampOn.slice();
    var rectL = b.rects.map(function () { return [0, 0, 0]; });
    var OUT = Object.assign({ top: '#05070f', horizon: '#141c33', glow: '#3a2a28', stars: 1, lights: 0.15, ground: '#05060a', sea: false, moon: [0.3, 0.25, -1], moonSize: 0.0016, power: 1, window: 1 }, room.outside || {});
    var AMB = Object.assign({ sky: '#1c2236', ground: '#120d0a', power: 0.05 }, room.ambient || {});
    var BOUNCE = room.bounce || null;   // { at:[x,y,z], w, d, albedo:'#hex', k } — a lit desk top glows back up
    function skyAvg() { var a = col(OUT.horizon), c = col(OUT.glow); return mulS(add(a, mulS(c, 0.5)), OUT.power * OUT.window); }

    // relight: page → lin (with mips) → grid; read the grid back for the exposure and the bounce light
    function relight() {
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      P.lin.use();
      var lodL = Math.max(0, Math.log2((pageTex.w || PW) / LW) - 1.2), lodG = Math.max(0, Math.log2((pageTex.w || PW) / GN[0]) - 2.2);
      gl.bindFramebuffer(gl.FRAMEBUFFER, linT.fb); gl.viewport(0, 0, LW, LH);
      HIC.gl.bind(gl, P.lin, { uPage: pageTex }); gl.uniform1f(P.lin.u.uLod, lodL); gl.uniform2f(P.lin.u.uTap, 0.25 / LW, 0.25 / LH);
      HIC.gl.fullscreen(gl);
      gl.bindTexture(gl.TEXTURE_2D, linT.tex); gl.generateMipmap(gl.TEXTURE_2D);
      gl.bindFramebuffer(gl.FRAMEBUFFER, gridT.fb); gl.viewport(0, 0, GN[0], GN[1]);
      gl.uniform1f(P.lin.u.uLod, lodG); gl.uniform2f(P.lin.u.uTap, 0.25 / GN[0], 0.25 / GN[1]);
      HIC.gl.fullscreen(gl);
      gl.readPixels(0, 0, GN[0], GN[1], gl.RGBA, gl.UNSIGNED_BYTE, gridPx);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      var avg = [0, 0, 0], n = GN[0] * GN[1], E = [0, 0, 0];
      var bc = BOUNCE ? BOUNCE.at : null, A = scr.w * scr.h / n;
      for (var j = 0; j < GN[1]; j++) for (var i = 0; i < GN[0]; i++) {
        var k = (j * GN[0] + i) * 4, c = [gridPx[k] / 255, gridPx[k + 1] / 255, gridPx[k + 2] / 255]; c = [c[0] * c[0], c[1] * c[1], c[2] * c[2]];
        avg = add(avg, mulS(c, 1 / n));
        if (bc) { var pc = add(scr.o, add(mulS(scr.u, (i + 0.5) / GN[0]), mulS(scr.v, (j + 0.5) / GN[1]))), d = sub(pc, bc), r2 = dot(d, d), dn = mulS(d, 1 / Math.sqrt(r2));
          E = add(E, mulS(c, A * Math.max(dn[1], 0) * Math.max(-dot(scr.n, dn), 0) / (r2 + A / Math.PI) * look.screenGain * look.screenLight)); }
      }
      stats.avg = avg; stats.lum = 0.2126 * avg[0] + 0.7152 * avg[1] + 0.0722 * avg[2]; stats.bounceE = E;
      relights++;
    }
    function lightRects() {
      var sk = skyAvg();
      b.rects.forEach(function (r, i) { rectL[i] = r.outside ? sk : (r.L ? col(r.L) : [0, 0, 0]); });
      if (BOUNCE) {
        var alb = col(BOUNCE.albedo || '#8a6a4a'), k = (BOUNCE.k || 1) / Math.PI, E = stats.bounceE || [0, 0, 0];
        // lamps on the desk add to its glow
        lamps.forEach(function (l, i) { if (!lampLvl[i]) return; var d = sub(l.pos, BOUNCE.at), r2 = dot(d, d); var c = col(l.color); E = add(E, mulS(c, lampLvl[i] * l.power * Math.max(0, d[1] / Math.sqrt(r2)) / (r2 + 0.01) * 0.5)); });
        rectL[bounceIdx] = [E[0] * alb[0] * k, E[1] * alb[1] * k, E[2] * alb[2] * k];
      }
    }
    var bounceIdx = -1;
    if (BOUNCE) b.at(function () { b.move(BOUNCE.at[0], BOUNCE.at[1] + 0.002, BOUNCE.at[2]); b.rotX(-90); b.rectLight(BOUNCE.w || 1, BOUNCE.d || 0.6, {}); bounceIdx = b.rects.length - 1; rectL.push([0, 0, 0]); });
    function goalExposure() {
      var lampSum = 0; lamps.forEach(function (l, i) { lampSum += lampLvl[i] * l.power * (l.glow + (l.cone || 120) / 360) * 0.02; });
      return look.exposure * 2.8 / Math.pow(stats.lum * look.screenGain * look.screenLight * 0.05 + lampSum + 0.05, 0.5);
    }

    // ---- one frame of the room
    var flick = lamps.map(function () { return 1; });
    function render(t) {
      if (!RT || RT.w !== canvas.width || RT.h !== canvas.height) makeTargets();
      if (!shadowsDone) { drawShadows(); shadowsDone = true; }
      lightRects();
      gl.bindFramebuffer(gl.FRAMEBUFFER, RT.fb); gl.viewport(0, 0, RT.w, RT.h);
      gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
      var p = P.scene.use(), u = p.u;
      HIC.gl.bind(gl, p, { uGrid: gridT.tex, uKeys: keyTex, uPage: pageTex, uLin: linT.tex, uShadow: shTex, uNoise: noiseTex, uAtlas: atlasTex });
      gl.uniformMatrix4fv(u.uVP, false, cam.vp);
      gl.uniform2i(u.uGridN, GN[0], GN[1]); gl.uniform1f(u.uKeyTravel, 0.0035);
      gl.uniform3fv(u.uSO, scr.o); gl.uniform3fv(u.uSU, scr.u); gl.uniform3fv(u.uSV, scr.v); gl.uniform3fv(u.uSN, scr.n);
      gl.uniform1f(u.uGain, look.screenGain); gl.uniform1f(u.uLightK, look.screenLight); gl.uniform1f(u.uScrHdr, look.screenGlow / Math.max(exposure, 1e-3)); gl.uniform1f(u.uHdr, HDRK); gl.uniform1f(u.uTime, t || 0); gl.uniform1f(u.uPass, 0);
      var nr = Math.min(4, b.rects.length), ro = [], ru = [], rv = [], rn = [], rl = [];
      for (var i = 0; i < nr; i++) { var r = b.rects[i]; ro.push.apply(ro, r.o); ru.push.apply(ru, r.u); rv.push.apply(rv, r.v); rn.push.apply(rn, r.n); rl.push.apply(rl, rectL[i]); }
      gl.uniform1i(u.uRectN, nr);
      if (nr) { gl.uniform3fv(u.uRO, ro); gl.uniform3fv(u.uRU, ru); gl.uniform3fv(u.uRV, rv); gl.uniform3fv(u.uRN, rn); gl.uniform3fv(u.uRL, rl); }
      gl.uniform3fv(u.uCam, cam.eye);
      gl.uniformMatrix4fv(u.uShM, false, shM); gl.uniform4fv(u.uShT, shT); gl.uniform4fv(u.uShP, shP);
      var LP = [], LD = [], LC = [], LX = [];
      lamps.forEach(function (l, i) {
        var c = col(l.color), pw = l.power * lampLvl[i] * flick[i];
        LP.push(l.pos[0], l.pos[1], l.pos[2], lampTile[i]);
        var outer = Math.cos(Math.min(179, l.cone || 120) / 2 * D2R), inner = Math.cos(Math.max(0, (l.cone || 120) / 2 - (l.soft || 30)) * D2R);
        LD.push(l.dirW[0], l.dirW[1], l.dirW[2], outer); LC.push(c[0] * pw, c[1] * pw, c[2] * pw, l.glow); LX.push(inner, l.size || 0.05, 0, 0);
      });
      gl.uniform1i(u.uLampN, lamps.length);
      var LV = new Float32Array(6); lamps.forEach(function (l, i) { LV[i] = lampLvl[i] * flick[i]; }); gl.uniform1fv(u.uLampLvl, LV);
      if (lamps.length) { gl.uniform4fv(u.uLP, LP); gl.uniform4fv(u.uLD, LD); gl.uniform4fv(u.uLC, LC); gl.uniform4fv(u.uLX, LX); }
      var as = mulS(col(AMB.sky), AMB.power), ag = mulS(col(AMB.ground), AMB.power);
      gl.uniform3fv(u.uAmbS, as); gl.uniform3fv(u.uAmbG, ag);
      var s0 = col(OUT.horizon), s1 = col(OUT.top), s2 = col(OUT.glow), s3 = col(OUT.sea || OUT.ground);
      gl.uniform4f(u.uSky0, s0[0], s0[1], s0[2], OUT.stars); gl.uniform4f(u.uSky1, s1[0], s1[1], s1[2], OUT.lights);
      gl.uniform4f(u.uSky2, s2[0], s2[1], s2[2], OUT.power); gl.uniform4f(u.uSky3, s3[0], s3[1], s3[2], OUT.sea ? 1 : 0);
      var md = norm(OUT.moon); gl.uniform4f(u.uMoon, md[0], md[1], md[2], OUT.moonSize);
      gl.bindVertexArray(vao);
      gl.drawElements(gl.TRIANGLES, nOpaque, gl.UNSIGNED_INT, 0);
      if (nGlass) {
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false); gl.uniform1f(u.uPass, 1);
        gl.drawElements(gl.TRIANGLES, nGlass, gl.UNSIGNED_INT, nOpaque * 4);
        gl.disable(gl.BLEND); gl.depthMask(true);
      }
      gl.bindVertexArray(null);
      if (RT.samples) {
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, RT.fb); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, RT.rf);
        gl.blitFramebuffer(0, 0, RT.w, RT.h, 0, 0, RT.w, RT.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      }
      gl.bindTexture(gl.TEXTURE_2D, RT.hdr); gl.generateMipmap(gl.TEXTURE_2D);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.DEPTH_TEST);
      var pp = P.post.use();
      HIC.gl.bind(gl, pp, { uHdr: RT.hdr });
      gl.uniform1f(pp.u.uExp, exposure); gl.uniform1f(pp.u.uBloom, look.bloom); gl.uniform1f(pp.u.uGrain, look.grain);
      gl.uniform1f(pp.u.uVig, look.vignette); gl.uniform1f(pp.u.uHdrK, HDRK); gl.uniform1f(pp.u.uScrK, look.screenGlow); gl.uniform1f(pp.u.uSeed, 17.3);
      gl.uniform2f(pp.u.uRes, canvas.width, canvas.height);
      HIC.gl.fullscreen(gl);
    }

    // ---- the page: upload on paint, relight on the next frame
    S.onPaint(function () {
      if (!S.upload(page, pageTex)) return;
      uploads++; pageDirty = true; needRender = true;
      if (!pageReady) {
        pageReady = true;
        updateCamera(); homography();
        var target0 = page.querySelector('[data-lr-probe]') || page.querySelector('[data-hic-edit]') || page.firstElementChild;
        S.probe(page, target0).then(function (mode) {
          probing = false; placed = ''; updateCamera(); homography(); place(); needRender = true;
          readyWhenDrawn = { mode: mode };
        });
      }
    });
    var readyWhenDrawn = null, isReady = false;

    // ---- input: drag the room to look around, wheel / pinch to zoom, double-click to go close, keys press the keyboard
    var drag = null, pts = {};
    canvas.tabIndex = 0;
    canvas.addEventListener('pointerdown', function (e) {
      if (e.target !== canvas) return;
      stopGlide();
      if (document.activeElement && page.contains(document.activeElement)) document.activeElement.blur();
      pts[e.pointerId] = [e.clientX, e.clientY];
      drag = { x: e.clientX, y: e.clientY, yaw: cam.ty, pitch: cam.tp, dist: cam.td, pinch: 0 };
      if (Object.keys(pts).length === 2) { var k = Object.keys(pts); drag.pinch = Math.hypot(pts[k[0]][0] - pts[k[1]][0], pts[k[0]][1] - pts[k[1]][1]); }
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      canvas.classList.add('lr-drag');
    });
    canvas.addEventListener('pointermove', function (e) {
      stopGlide();
      if (!drag || !pts[e.pointerId]) return;
      pts[e.pointerId] = [e.clientX, e.clientY];
      var k = Object.keys(pts);
      if (k.length === 2 && drag.pinch) { var d = Math.hypot(pts[k[0]][0] - pts[k[1]][0], pts[k[0]][1] - pts[k[1]][1]); cam.td = HIC.clamp(drag.dist * drag.pinch / Math.max(d, 1), C.dist[0], C.dist[1]); return; }
      cam.ty = HIC.clamp(drag.yaw - (e.clientX - drag.x) * 0.0045, C.yaw[0], C.yaw[1]);
      cam.tp = HIC.clamp(drag.pitch + (e.clientY - drag.y) * 0.0035, C.pitch[0], C.pitch[1]);
    });
    function endDrag(e) { delete pts[e.pointerId]; if (!Object.keys(pts).length) { drag = null; canvas.classList.remove('lr-drag'); } }
    canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', function (e) { e.preventDefault(); stopGlide(); cam.td = HIC.clamp(cam.td * Math.exp(e.deltaY * 0.0012), C.dist[0], C.dist[1]); }, { passive: false });
    canvas.addEventListener('dblclick', function (e) {
      if (e.target !== canvas) return; stopGlide();
      var near = cam.td < (C.close[2] + C.home[2]) / 2, v = near ? C.home : C.close; cam.ty = v[0]; cam.tp = v[1]; cam.td = v[2];
    });
    canvas.addEventListener('keydown', function (e) {
      if (e.target !== canvas) return;
      var k = { ArrowLeft: [0.08, 0, 1], ArrowRight: [-0.08, 0, 1], ArrowUp: [0, 0, 0.9], ArrowDown: [0, 0, 1.1] }[e.key]; if (!k) return;
      e.preventDefault(); stopGlide(); cam.ty = HIC.clamp(cam.ty + k[0], C.yaw[0], C.yaw[1]); cam.td = HIC.clamp(cam.td * k[2], C.dist[0], C.dist[1]);
    });
    root.addEventListener('keydown', function (e) { var id = b.keys[e.code]; if (id) keyGoal[id] = 1; }, true);
    root.addEventListener('keyup', function (e) { var id = b.keys[e.code]; if (id) keyGoal[id] = 0; }, true);
    root.addEventListener('blur', function () { keyGoal.fill(0); });
    root.addEventListener('resize', function () { S.resize(); placed = ''; needRender = true; });

    // ---- the loop: ease, then draw only when something changed and the GPU has finished the last frame
    var lastT = 0;
    S.loop(function (t, dt) {
      if (glide) {
        glide.t += dt; var k = Math.min(1, glide.t / glide.dur), e = k * k * (3 - 2 * k);
        cam.yaw = cam.ty = HIC.mix(C.start[0], C.home[0], e); cam.pitch = cam.tp = HIC.mix(C.start[1], C.home[1], e); cam.dist = cam.td = HIC.mix(C.start[2], C.home[2], e);
        if (k >= 1) glide = null; needRender = true;
      }
      var moving = false;
      [['yaw', 'ty', 8], ['pitch', 'tp', 8], ['dist', 'td', 6]].forEach(function (a) {
        var d = cam[a[1]] - cam[a[0]];
        if (Math.abs(d) > 1e-4) { cam[a[0]] += d * (1 - Math.exp(-dt * a[2])); moving = true; } else cam[a[0]] = cam[a[1]];
      });
      if (moving) needRender = true;
      // keys sink fast and spring back with a small overshoot
      var keysMoving = false;
      for (var i = 1; i <= b.keyN; i++) {
        var d = keyGoal[i] - keyAmt[i];
        if (Math.abs(d) > 0.004) { keyAmt[i] += d * (1 - Math.exp(-dt * 40)); keysMoving = true; } else keyAmt[i] = keyGoal[i];
        keyBytes[i] = Math.round(HIC.clamp(keyAmt[i], 0, 1) * 255);
      }
      if (keysMoving || !lastT) { gl.bindTexture(gl.TEXTURE_2D, keyTex); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, NKEY, 1, gl.RED, gl.UNSIGNED_BYTE, keyBytes); needRender = needRender || keysMoving; }
      // lamps fade on and off; candle-like lamps flicker (not under #still / #calm, not on a slow GPU)
      lamps.forEach(function (l, i) {
        var dd = lampOn[i] - lampLvl[i];
        if (Math.abs(dd) > 0.002) { lampLvl[i] += dd * (STILL ? 1 : 1 - Math.exp(-dt * 7)); needRender = true; } else lampLvl[i] = lampOn[i];
        if (l.flicker && !STILL && !CALM && !slow && lampLvl[i] > 0) {
          flick[i] = 1 - l.flicker * (0.5 + 0.5 * Math.sin(t * 7.1 + i) * Math.sin(t * 3.3 + 2 * i) + 0.3 * Math.sin(t * 17 + i * 5)); needRender = true;
        } else flick[i] = 1;
      });
      if (!pageReady) return;
      if (inflight) {
        var st = gl.clientWaitSync(inflight, 0, 0);
        if (st === gl.TIMEOUT_EXPIRED) return;
        gl.deleteSync(inflight); inflight = null;
        gpuEma = gpuEma * 0.8 + (performance.now() - lastRender) * 0.2; slow = gpuEma > 60;
      }
      if (pageDirty) { relight(); pageDirty = false; needRender = true; expGoal = goalExposure(); if (!renders) exposure = expGoal; }
      var eg = goalExposure(); if (Math.abs(eg - expGoal) > 1e-4) expGoal = eg;
      if (Math.abs(expGoal - exposure) > expGoal * 0.002) { exposure += (expGoal - exposure) * (STILL ? 1 : 1 - Math.exp(-dt * 4)); needRender = true; } else exposure = expGoal;
      updateCamera(); homography(); place();
      if (!needRender) return;
      needRender = false;
      render(t); renders++; lastRender = performance.now(); lastT = t || 1e-3;
      inflight = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush();
      if (readyWhenDrawn && !isReady) { isReady = true; S.ready(Object.assign(readyWhenDrawn, { verts: VBO.length / STRIDE, tris: IB.length / 3, buildMs: Math.round(buildMs), grid: GN, msaa: RT.samples, float: floatOK })); if (opts.onReady) opts.onReady(R); }
    });

    // ---- the public face of the room
    var R = {
      fallback: false, room: room, builder: b, screen: scr, cam: cam, lamps: lamps, stage: S,
      get renders() { return renders; }, get relights() { return relights; }, get uploads() { return uploads; }, get exposure() { return exposure; },
      get stats() { return stats; }, get settled() { return !needRender && !inflight && !pageDirty && !glide && isReady; }, get slow() { return slow; },
      // view(yaw, pitch, dist, now): move the camera (eased, or at once with now = true)
      view: function (y, p, d, now) { stopGlide(); cam.ty = HIC.clamp(y, C.yaw[0], C.yaw[1]); cam.tp = HIC.clamp(p, C.pitch[0], C.pitch[1]); cam.td = HIC.clamp(d, C.dist[0], C.dist[1]); if (now) { cam.yaw = cam.ty; cam.pitch = cam.tp; cam.dist = cam.td; } needRender = true; },
      home: function () { R.view(C.home[0], C.home[1], C.home[2]); }, close: function () { R.view(C.close[0], C.close[1], C.close[2]); },
      // lamp(name | index, on?) → on; switches a room lamp (it fades)
      lamp: function (n, on) { var i = typeof n === 'number' ? n : lamps.findIndex(function (l) { return l.name === n; }); if (i < 0) return null; if (on !== undefined) { lampOn[i] = on ? 1 : 0; needRender = true; } return !!lampOn[i]; },
      project: project,
      // page px → canvas px (null when the screen faces away), and back
      pageToCanvas: function (x, y) { return cam.facing ? pageToCanvas(x, y) : null; },
      pagePoint: function (clientX, clientY) { var r = canvas.getBoundingClientRect(); return canvasToPage(clientX - r.left, clientY - r.top); },
      screenOf: function (el) { var bx = HIC.box(page, el); return R.pageToCanvas(bx[0] + bx[2] / 2, bx[1] + bx[3] / 2); },
      keyDepth: function (code) { var id = b.keys[code]; return id ? keyAmt[id] : null; },
      press: function (code, on) { var id = b.keys[code]; if (id) keyGoal[id] = on ? 1 : 0; },
      redraw: function () { needRender = true; }
    };
    root.__hic.screenOf = R.screenOf;
    root.__lit = R;
    return R;
  };

  // ------------------------------------------------------------------ page helpers (optional): tabs, draggable page lamps, presets
  // LitRoom.wire(page, R) wires these attributes inside the page:
  //   [data-tab="x"] buttons show [data-panel="x"] (aria-pressed / hidden)
  //   [data-lamp] elements are dragged around their offsetParent (pointer through R.pagePoint, arrow keys); style left/top = centre
  //   [data-mood="x"] buttons set page.dataset.mood = x (your CSS recolours the page, so the room changes colour)
  //   [data-room-lamp="name"] buttons switch a room lamp (aria-pressed)
  LR.wire = function (page, R) {
    var tabs = page.querySelectorAll('[data-tab]');
    function show(name) {
      tabs.forEach(function (t) { t.setAttribute('aria-pressed', String(t.dataset.tab === name)); });
      page.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.dataset.panel !== name; });
    }
    tabs.forEach(function (t) { t.addEventListener('click', function () { show(t.dataset.tab); }); });
    page.querySelectorAll('[data-mood]').forEach(function (m) {
      m.addEventListener('click', function () {
        page.dataset.mood = m.dataset.mood;
        page.querySelectorAll('[data-mood]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === m)); });
      });
    });
    page.querySelectorAll('[data-room-lamp]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!R || R.fallback) return;
        var on = !R.lamp(btn.dataset.roomLamp); R.lamp(btn.dataset.roomLamp, on); btn.setAttribute('aria-pressed', String(on));
      });
    });
    page.querySelectorAll('[data-lamp]').forEach(function (el) {
      var grab = null;
      function setPos(x, y) {
        var p = el.offsetParent || page, w = p.clientWidth, h = p.clientHeight, r = el.offsetWidth / 2;
        el.style.left = HIC.clamp(x, r * 0.4, w - r * 0.4) + 'px'; el.style.top = HIC.clamp(y, r * 0.4, h - r * 0.4) + 'px';
      }
      function local(e) {   // pointer → coordinates inside the lamp's offsetParent
        var pp = R && !R.fallback ? R.pagePoint(e.clientX, e.clientY) : null, par = el.offsetParent || page;
        if (!pp) { var rr = par.getBoundingClientRect(); return { x: e.clientX - rr.left, y: e.clientY - rr.top }; }
        var ox = 0, oy = 0; for (var n = par; n && n !== page; n = n.offsetParent) { ox += n.offsetLeft; oy += n.offsetTop; }
        return { x: pp.x - ox, y: pp.y - oy };
      }
      el.addEventListener('pointerdown', function (e) {
        e.preventDefault(); var l = local(e); grab = { dx: el.offsetLeft + el.offsetWidth / 2 - l.x, dy: el.offsetTop + el.offsetHeight / 2 - l.y };
        try { el.setPointerCapture(e.pointerId); } catch (err) {} el.classList.add('is-held');
      });
      el.addEventListener('pointermove', function (e) { if (!grab) return; var l = local(e); setPos(l.x + grab.dx, l.y + grab.dy); });
      function up() { grab = null; el.classList.remove('is-held'); }
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      el.addEventListener('keydown', function (e) {
        var d = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] }[e.key]; if (!d) return;
        e.preventDefault(); setPos(el.offsetLeft + el.offsetWidth / 2 + d[0], el.offsetTop + el.offsetHeight / 2 + d[1]);
      });
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);

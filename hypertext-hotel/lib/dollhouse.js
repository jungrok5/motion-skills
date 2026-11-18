/* dollhouse.js — a doll's-house cutaway of live HTML, drawn by WebGL through HTML-in-Canvas.
 *
 * A building is cut open at the front (the plane z = 0). Its rooms sit in a grid of columns × floors; each room is a lit
 * box with props, warm lamps that cast soft shadows, and live HTML controls mounted in it as objects: a checkbox is a lamp
 * switch, a range is a dimmer or a lever, a select is a dial, a text field is a ledger. Every control is a direct child
 * of the <canvas>, uploaded to its own texture, drawn on a rectangle in the room and placed for hit testing exactly where
 * it is drawn, so it still clicks, types and tabs. Each control also has a plain twin (the same element with no styles),
 * kept in step both ways; a magnifier lens and a "just HTML" switch show the twins.
 *
 *   var D = Dollhouse.start(cfg)          cfg: see references/ENGINE.md (building, ground, sky, look, rooms, lens, ready)
 *   Dollhouse.mat(colour, opts)           a material: {c2, pat, s, rough, metal, emit, glow, unlit, dyn, noShadow}
 *   Dollhouse.lift(B, R, opts)            a lift (or hoist, dumbwaiter) in a shaft room, driven by one vertical range
 *   Dollhouse.props                       the prop kit (lib/props.js)
 * Render: sky → per-zone forward lighting (≤ 3 point lights a zone, two with cube shadows, moonlight with a shadow map)
 * into HDR + normals + depth → ambient occlusion → bloom → tone map → anti-aliasing, the lens and the plain layer.
 * Hash: #still=<s> #calm #fallback (hic.js) and #nointro #q=0.5 (render scale) #lens=<key>|off #plain #view=<room>
 * #lift=<stop> #dark=<light,…>.  Needs lib/hic.js. No network.
 */
(function (root) {
  'use strict';
  var HIC = root.HIC, M4 = HIC.mat4, DEG = Math.PI / 180;
  var DH = root.Dollhouse = { version: '1.0.0', props: root.Dollhouse && root.Dollhouse.props || {} };

  // ------------------------------------------------------------------ colour and transforms
  function hex(c) {
    if (Array.isArray(c)) return c;
    c = String(c || '#888').replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var n = parseInt(c, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function lin(c) { return hex(c).map(function (v) { return Math.pow(v / 255, 2.2); }); }
  DH.hex = hex; DH.lin = lin;
  // {at:[x,y,z], rx, ry, rz (degrees), s: number | [sx,sy,sz]} → matrix
  function xform(t) {
    var a = t.at || [0, 0, 0], m = M4.translate(a[0], a[1], a[2]);
    if (t.ry) m = M4.mul(m, M4.rotY(t.ry * DEG));
    if (t.rx) m = M4.mul(m, M4.rotX(t.rx * DEG));
    if (t.rz) m = M4.mul(m, M4.rotZ(t.rz * DEG));
    if (t.s != null) { var s = Array.isArray(t.s) ? t.s : [t.s, t.s, t.s]; m = M4.mul(m, M4.scale(s[0], s[1], s[2])); }
    return m;
  }
  DH.xform = xform;
  function tp(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; }
  function tp4(m, p) { var r = tp(m, p); return [r[0], r[1], r[2], m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15]]; }
  function ortho(l, r, b, t, n, f) { var m = M4.ident(); m[0] = 2 / (r - l); m[5] = 2 / (t - b); m[10] = -2 / (f - n); m[12] = -(r + l) / (r - l); m[13] = -(t + b) / (t - b); m[14] = -(f + n) / (f - n); return m; }
  function frustum(l, r, b, t, n, f) { var m = new Float32Array(16); m[0] = 2 * n / (r - l); m[5] = 2 * n / (t - b); m[8] = (r + l) / (r - l); m[9] = (t + b) / (t - b); m[10] = -(f + n) / (f - n); m[11] = -1; m[14] = -2 * f * n / (f - n); return m; }

  // ------------------------------------------------------------------ materials
  // Patterns are drawn in the shader from the surface position, so they need no textures.
  var PAT = DH.PAT = { flat: 0, plaster: 1, wood: 2, planks: 3, stripes: 4, check: 5, tile: 6, brick: 7, dots: 8, diamond: 9, carpet: 10, quilt: 11, night: 12, books: 13, shingle: 14, metal: 15, hstripes: 16 };
  // mat(colour, {c2, pat, s (pattern size, m), rough 0..1, metal, emit 0..16, glow: light id (emission follows that light),
  //              unlit (emission only), dyn: 1|2 (colour from the zone's tint slot), noShadow})
  DH.mat = function (c, o) {
    o = o || {};
    return {
      c1: hex(c), c2: hex(o.c2 || c), rough: Math.round(255 * (o.rough == null ? 0.8 : o.rough)),
      emit: Math.round(Math.min(255, (o.emit || 0) * 16)), pat: typeof o.pat === 'string' ? PAT[o.pat] || 0 : (o.pat || 0),
      s: Math.max(1, Math.min(255, Math.round((o.s || 0.5) * 40))),
      flags: (o.metal ? 1 : 0) | (o.dyn === 1 ? 2 : 0) | (o.dyn === 2 ? 4 : 0) | (o.unlit ? 8 : 0), glow: o.glow || null, noShadow: !!o.noShadow
    };
  };
  var mat = DH.mat;

  // ------------------------------------------------------------------ meshes
  // vertex: position 3×f32 | normal 3×i8 + pad | colour 1 rgb + roughness | colour 2 rgb + emission | pattern, size, flags, glow
  var STRIDE = 28;
  function Mesh() { this.cap = 2048; this.buf = new ArrayBuffer(this.cap * STRIDE); this.n = 0; this.views(); }
  Mesh.prototype.views = function () { this.f = new Float32Array(this.buf); this.i8 = new Int8Array(this.buf); this.u8 = new Uint8Array(this.buf); };
  Mesh.prototype.push = function (p, n, mt, glow) {
    if (this.n >= this.cap) { var nb = new ArrayBuffer(this.cap * 2 * STRIDE); new Uint8Array(nb).set(this.u8); this.buf = nb; this.cap *= 2; this.views(); }
    var o = this.n * STRIDE, f = o >> 2, u = this.u8, i = this.i8;
    this.f[f] = p[0]; this.f[f + 1] = p[1]; this.f[f + 2] = p[2];
    i[o + 12] = Math.round(n[0] * 127); i[o + 13] = Math.round(n[1] * 127); i[o + 14] = Math.round(n[2] * 127);
    u[o + 16] = mt.c1[0]; u[o + 17] = mt.c1[1]; u[o + 18] = mt.c1[2]; u[o + 19] = mt.rough;
    u[o + 20] = mt.c2[0]; u[o + 21] = mt.c2[1]; u[o + 22] = mt.c2[2]; u[o + 23] = mt.emit;
    u[o + 24] = mt.pat; u[o + 25] = mt.s; u[o + 26] = mt.flags; u[o + 27] = glow;
    this.n++;
  };

  // ------------------------------------------------------------------ the builder (one per zone; movers get their own)
  // All sizes in metres. Inside a room build the origin is the room's front-left floor corner: x to the right (0..R.w),
  // y up (0..R.h), z toward the viewer (back wall at -R.d, open front at 0).
  function Builder(zone, base) {
    this.zone = zone; this.cast = new Mesh(); this.free = new Mesh();
    this.m = base || M4.ident(); this.nm = normalMat(this.m);
  }
  function normalMat(m) {
    var inv = M4.invert(m); // transpose of the inverse, 3×3 part
    return [inv[0], inv[4], inv[8], inv[1], inv[5], inv[9], inv[2], inv[6], inv[10]];
  }
  var BP = Builder.prototype;
  BP._v = function (p, n, mt) {
    var q = tp(this.m, p), k = this.nm, nx = k[0] * n[0] + k[3] * n[1] + k[6] * n[2], ny = k[1] * n[0] + k[4] * n[1] + k[7] * n[2], nz = k[2] * n[0] + k[5] * n[1] + k[8] * n[2];
    var l = Math.hypot(nx, ny, nz) || 1, g = 0;
    if (mt.glow != null) { var zi = this.zone.lightIndex[mt.glow]; g = zi == null ? 0 : zi + 1; }
    (mt.noShadow ? this.free : this.cast).push(q, [nx / l, ny / l, nz / l], mt, g);
  };
  BP.tri = function (a, b, c, na, nb, nc, mt) { this._v(a, na, mt); this._v(b, nb, mt); this._v(c, nc, mt); return this; };
  // a flat quad a,b,c,d (in order round the edge); its normal is worked out (the shader turns it toward the viewer)
  BP.quad = function (a, b, c, d, mt) {
    var u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]], n = HIC.vec.norm(HIC.vec.cross(u, v));
    return this.tri(a, b, c, n, n, n, mt).tri(a, c, d, n, n, n, mt);
  };
  BP.group = function (t, fn) {
    var pm = this.m, pn = this.nm; this.m = M4.mul(this.m, t instanceof Float32Array ? t : xform(t)); this.nm = normalMat(this.m);
    fn(this); this.m = pm; this.nm = pn; return this;
  };
  // an axis-aligned box from two corners; faces: optional subset of 'xXyYzZ' (lower case = the low side)
  BP.box = function (x0, y0, z0, x1, y1, z1, mt, faces) {
    var f = faces || 'xXyYzZ';
    if (f.indexOf('Z') >= 0) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], mt);
    if (f.indexOf('z') >= 0) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], mt);
    if (f.indexOf('X') >= 0) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], mt);
    if (f.indexOf('x') >= 0) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], mt);
    if (f.indexOf('Y') >= 0) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], mt);
    if (f.indexOf('y') >= 0) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], mt);
    return this;
  };
  // a box standing on the floor: centre x, z; base y; size sx, sy, sz
  BP.block = function (x, y, z, sx, sy, sz, mt, faces) { return this.box(x - sx / 2, y, z - sz / 2, x + sx / 2, y + sy, z + sz / 2, mt, faces); };
  // a cylinder or cone: base centre (x,y,z), radius r (top r2), height h; o: {r2, seg, axis: 'y'|'x'|'z', caps}
  BP.cyl = function (x, y, z, r, h, mt, o) {
    o = o || {}; var seg = o.seg || 16, r2 = o.r2 == null ? r : o.r2, ax = o.axis || 'y', k = (r - r2) / h, kl = Math.hypot(1, k);
    var P = function (a, rr, t) { var c = Math.cos(a) * rr, s = Math.sin(a) * rr; return ax === 'y' ? [x + c, y + t, z + s] : ax === 'x' ? [x + t, y + c, z + s] : [x + c, y + s, z + t]; };
    var N = function (a) { var c = Math.cos(a) / kl, s = Math.sin(a) / kl, q = k / kl; return ax === 'y' ? [c, q, s] : ax === 'x' ? [q, c, s] : [c, s, q]; };
    var up = ax === 'y' ? [0, 1, 0] : ax === 'x' ? [1, 0, 0] : [0, 0, 1], dn = [-up[0], -up[1], -up[2]];
    for (var i = 0; i < seg; i++) {
      var a0 = i / seg * 6.28319, a1 = (i + 1) / seg * 6.28319, A = P(a0, r, 0), B = P(a1, r, 0), C = P(a1, r2, h), E = P(a0, r2, h);
      this.tri(A, B, C, N(a0), N(a1), N(a1), mt).tri(A, C, E, N(a0), N(a1), N(a0), mt);
      if (o.caps !== false) { if (r2 > 0) this.tri(P(0, 0, h), E, C, up, up, up, mt); if (r > 0) this.tri(P(0, 0, 0), A, B, dn, dn, dn, mt); }
    }
    return this;
  };
  // a turned shape round the y axis: profile [[radius, y], …] from the bottom up
  BP.lathe = function (x, y, z, prof, mt, o) {
    o = o || {}; var seg = o.seg || 18;
    for (var j = 0; j < prof.length - 1; j++) {
      var ra = prof[j][0], ya = prof[j][1], rb = prof[j + 1][0], yb = prof[j + 1][1], dl = Math.hypot(rb - ra, yb - ya) || 1, ny = -(rb - ra) / dl, nr = (yb - ya) / dl;
      for (var i = 0; i < seg; i++) {
        var a0 = i / seg * 6.28319, a1 = (i + 1) / seg * 6.28319, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        var n0 = [c0 * nr, ny, s0 * nr], n1 = [c1 * nr, ny, s1 * nr];
        this.tri([x + c0 * ra, y + ya, z + s0 * ra], [x + c1 * ra, y + ya, z + s1 * ra], [x + c1 * rb, y + yb, z + s1 * rb], n0, n1, n1, mt);
        this.tri([x + c0 * ra, y + ya, z + s0 * ra], [x + c1 * rb, y + yb, z + s1 * rb], [x + c0 * rb, y + yb, z + s0 * rb], n0, n1, n0, mt);
      }
    }
    return this;
  };
  // a ball (or an ellipsoid with o.sx, o.sy, o.sz)
  BP.ball = function (x, y, z, r, mt, o) {
    o = o || {}; var seg = o.seg || 14, rings = o.rings || 9, sx = o.sx || 1, sy = o.sy || 1, sz = o.sz || 1;
    var P = function (i, j) { var th = j / rings * Math.PI, ph = i / seg * 6.28319, n = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; return [[x + n[0] * r * sx, y + n[1] * r * sy, z + n[2] * r * sz], HIC.vec.norm([n[0] / sx, n[1] / sy, n[2] / sz])]; };
    for (var j = 0; j < rings; j++) for (var i = 0; i < seg; i++) {
      var a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
      this.tri(a[0], b[0], c[0], a[1], b[1], c[1], mt).tri(a[0], c[0], d[0], a[1], c[1], d[1], mt);
    }
    return this;
  };
  // a square rod of thickness t between two points
  BP.bar = function (A, B, t, mt) {
    var d = HIC.vec.norm([B[0] - A[0], B[1] - A[1], B[2] - A[2]]), ref = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    var u = HIC.vec.norm(HIC.vec.cross(d, ref)), v = HIC.vec.cross(d, u), h = t / 2;
    var c = function (P, a, b) { return [P[0] + (u[0] * a + v[0] * b) * h, P[1] + (u[1] * a + v[1] * b) * h, P[2] + (u[2] * a + v[2] * b) * h]; };
    var k = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    for (var i = 0; i < 4; i++) { var p = k[i], q = k[(i + 1) % 4]; this.quad(c(A, p[0], p[1]), c(A, q[0], q[1]), c(B, q[0], q[1]), c(B, p[0], p[1]), mt); }
    return this;
  };
  // the inside of a room: back wall, sides, floor, ceiling (o: {wall, left, right, floor, ceil}); local coordinates
  BP.shell = function (R, o) {
    var w = R.w, h = R.h, d = R.d, e = 0.004;
    if (o.wall) this.quad([0, 0, -d + e], [w, 0, -d + e], [w, h, -d + e], [0, h, -d + e], o.wall);
    if (o.left || o.wall) this.quad([e, 0, 0], [e, 0, -d], [e, h, -d], [e, h, 0], o.left || o.wall);
    if (o.right || o.wall) this.quad([w - e, 0, -d], [w - e, 0, 0], [w - e, h, 0], [w - e, h, -d], o.right || o.wall);
    if (o.floor) this.quad([0, e, 0], [w, e, 0], [w, e, -d], [0, e, -d], o.floor);
    if (o.ceil !== false) this.quad([0, h - e, -d], [w, h - e, -d], [w, h - e, 0], [0, h - e, 0], o.ceil || mat('#e8e1d2', { rough: 0.95 }));
    return this;
  };
  // a lamp: {at, color, power (≈ 1–6), range (m), shadow (the first two lights of a zone only), on, flicker}. Returns its id.
  BP.light = function (id, o) {
    var Z = this.zone; if (Z.lights.length >= 3) { console.warn('dollhouse: a zone has at most 3 lights; ignored ' + id); return id; }
    var L = { id: id, zone: Z, p: tp(this.m, o.at || [0, 0, 0]), col: lin(o.color || '#ffd7a0'), power: o.power == null ? 3 : o.power, range: o.range || 6,
      shadow: o.shadow !== false && Z.lights.length < 2 && Z.id !== 'ext', on: o.on === false ? 0 : 1, level: o.on === false ? 0 : 1, flicker: o.flicker || 0, dirty: true, slot: -1 };
    Z.lightIndex[id] = Z.lights.length; Z.lights.push(L); this.zone.world.lights[id] = L;
    return id;
  };
  // a flame (fire, candle): an additive quad facing the viewer; o: {at, w, h, light: id it brightens with, seed}
  BP.flame = function (o) {
    var c = tp(this.m, o.at), F = this.zone.world.flames;
    F.push({ zone: this.zone, c: c, w: o.w, h: o.h, M: M4.mul(M4.translate(c[0], c[1] + o.h / 2, c[2]), M4.scale(o.w, o.h, 1)), light: o.light || null, seed: o.seed != null ? o.seed : F.length * 1.7, k: o.k || 2.2 });
    return this;
  };
  // a live HTML control on a rectangle: key = the element's data-k; o: {at (centre), w (m), rx, ry, rz, emit, unlit, rough}
  BP.panel = function (key, o) {
    var W = this.zone.world, sz = W.sizeOf(key);
    var h = o.w * sz[1] / sz[0];
    var M = M4.mul(this.m, M4.mul(xform({ at: o.at, rx: o.rx, ry: o.ry, rz: o.rz }), M4.scale(o.w, h, 1)));
    W.panelDefs.push({ key: key, zone: this.zone, M: M, w: o.w, h: h, emit: o.emit == null ? 0.06 : o.emit, unlit: !!o.unlit, rough: o.rough == null ? 0.7 : o.rough, base: this.m, o: o });
    return this;
  };
  // the aspect (height / width) of a control as laid out, for sizing what it hangs on
  BP.aspect = function (key) { var s = this.zone.world.sizeOf(key); return s[1] / s[0]; };
  // a movable mesh: fn(B) builds it round its own origin at o.at; returns a mover with .set({at, rx, ry, rz, s}) (relative)
  BP.mover = function (fn, o) {
    o = o || {}; var base = M4.mul(this.m, xform({ at: o.at || [0, 0, 0] })), b = new Builder(this.zone, M4.ident());
    fn(b);
    var mv = { zone: this.zone, base: base, m: base, cast: b.cast, free: b.free, shadow: o.shadow !== false, hidden: false, name: o.name };
    mv.set = function (t) { mv.m = M4.mul(base, xform(t)); mv.zone.world.dirty = true; if (mv.shadow) mv.zone.shadowDirty = true; return mv; };
    this.zone.movers.push(mv); if (o.name) this.zone.world.movers[o.name] = mv;
    return mv;
  };
  // where a local point is in the world
  BP.world = function (p) { return tp(this.m, p); };
  DH.Builder = Builder;

  // ------------------------------------------------------------------ shaders
  var NOISE = [
    'float h1(vec2 p){ p=fract(p*vec2(233.34,851.73)); p+=dot(p,p+23.45); return fract(p.x*p.y); }',
    'float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y); }',
    'float fbm(vec2 p){ return .5*vn(p)+.3*vn(p*2.13+4.1)+.2*vn(p*4.37+9.7); }'].join('\n');
  var VS_LIT = ['#version 300 es',
    'layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec4 aC1; layout(location=3) in vec4 aC2; layout(location=4) in vec4 aP;',
    'uniform mat4 uVP, uModel;',
    'out vec3 vW, vN, vL, vLN; out vec4 vC1, vC2; flat out vec4 vP; out vec2 vUV;',
    'void main(){ vec4 w=uModel*vec4(aPos,1.); vW=w.xyz; vN=mat3(uModel)*aNrm; vL=aPos; vLN=aNrm; vC1=aC1; vC2=aC2; vP=floor(aP*255.+.5); vUV=vec2(aPos.x+.5,.5-aPos.y); gl_Position=uVP*w; }'].join('\n');
  var FS_LIT = ['#version 300 es',
    'precision highp float; precision highp sampler2DShadow; precision highp samplerCubeShadow;',
    'in vec3 vW, vN, vL, vLN; in vec4 vC1, vC2; flat in vec4 vP; in vec2 vUV;',
    'uniform vec3 uLP[3], uLC[3], uLR[3]; uniform vec3 uLvl; uniform samplerCubeShadow uSh0, uSh1; uniform sampler2DShadow uMoonSh;',
    'uniform mat4 uMoonVP, uView; uniform vec3 uMoonDir, uMoonC, uAmb, uSkyA, uEye, uDyn0, uDyn1;',
    'uniform int uMode; uniform sampler2D uTex; uniform float uEmit, uRough, uUnlit, uTime, uSeed;',
    'layout(location=0) out vec4 oC; layout(location=1) out vec4 oN;',
    NOISE,
    'const float LN=.05, LF=14.;',
    'float cubeSh(samplerCubeShadow s, vec3 v, float a){',
    '  vec3 q=abs(v); float m=max(q.x,max(q.y,q.z)); float ref=((LF+LN)/(LF-LN)-2.*LF*LN/((LF-LN)*m))*.5+.5-.0004;',
    '  vec3 d=v/m, t1=normalize(cross(d,vec3(.27,.91,.31))), t2=cross(d,t1); float sum=0.;',
    '  for(int i=0;i<5;i++){ float an=a+float(i)*1.2566; float rr=.01+.014*fract(float(i)*.618+a); sum+=texture(s, vec4(d+(t1*cos(an)+t2*sin(an))*rr*3., ref)); }',
    '  return sum*.2; }',
    'float aaStep(float e, float x){ float w=fwidth(x)+1e-4; return smoothstep(e-w,e+w,x); }',
    // the surface patterns: a = colour 1, b = colour 2, s = size in metres
    'vec3 pat(int id, vec3 p, vec3 n, vec3 a, vec3 b, float s, inout float r, inout float em){',
    '  vec3 an=abs(n); vec2 uv = an.z>=an.x&&an.z>=an.y ? p.xy : (an.x>an.y ? p.zy : p.xz);',
    '  float nz=fbm(uv*7.);',
    '  if(id==1) return a*(.82+.3*fbm(uv*2.3))*(.96+.08*vn(uv*55.));',
    '  if(id==2){ float g=fbm(vec2(uv.x*1.3+nz, uv.y*26./s)); return mix(a,b,smoothstep(.25,.85,g))*(.92+.1*nz); }',
    '  if(id==3){ float row=floor(uv.y/s); float x=uv.x/(s*5.)+h1(vec2(row,2.))*3.; float pl=floor(x); float t=h1(vec2(pl,row));',
    '    float seam=aaStep(.03,fract(uv.y/s))*aaStep(.006,fract(x)); float g=vn(vec2(uv.x*4.,uv.y*70.)); r*=.7+.3*g; return mix(a,b,t*.7+g*.3)*mix(.5,1.,seam); }',
    '  if(id==4){ float f=fract(uv.x/s); return mix(a,b,aaStep(.5,f)-aaStep(.97,f))*(.95+.08*nz); }',
    '  if(id==16){ float f=fract(uv.y/s); return mix(a,b,aaStep(.5,f)-aaStep(.97,f))*(.95+.08*nz); }',
    '  if(id==5){ vec2 q=floor(uv/s); return mix(a,b,mod(q.x+q.y,2.))*(.95+.08*nz); }',
    '  if(id==6){ vec2 f=fract(uv/s); float g=aaStep(.04,f.x)*aaStep(.04,f.y); r*=.55; return mix(b,a*(.9+.15*h1(floor(uv/s))),g); }',
    '  if(id==7){ vec2 q=vec2(uv.x/(s*2.1),uv.y/s); q.x+=.5*mod(floor(q.y),2.); vec2 f=fract(q); float g=aaStep(.05,f.x)*aaStep(.1,f.y); return mix(b,a*(.75+.4*h1(floor(q)))*(.9+.2*nz),g); }',
    '  if(id==8){ vec2 q=uv/s; q.x+=.5*mod(floor(q.y),2.); float d=length(fract(q)-.5); return mix(a,b,1.-aaStep(.18,d))*(.95+.06*nz); }',
    '  if(id==9){ vec2 q=uv/s; vec2 f=abs(fract(q)-.5); return mix(a,b,1.-aaStep(.5,f.x+f.y))*(.95+.06*nz); }',
    '  if(id==10){ vec2 q=uv/s; vec2 f=abs(fract(q)-.5); float d=max(f.x,f.y); float bd=aaStep(.36,d)-aaStep(.43,d); r=.97; return mix(a,b,bd)*(.78+.3*vn(q*60.)+.1*nz); }',
    '  if(id==11){ vec2 c=floor(uv/s); float t=h1(c); vec3 k=mix(a,b,step(.5,t)); k*=.75+.5*h1(c+5.); vec2 f=fract(uv/s); return k*mix(.7,1.,aaStep(.04,f.x)*aaStep(.04,f.y)); }',
    '  if(id==12){ float t=clamp(fract(uv.y/max(s,.01)),0.,1.); vec3 c=mix(a,b,t); vec2 g=floor(uv*40.); c+=step(.975,h1(g))*vec3(.9,.9,1.)*h1(g+3.)*2.; em=max(em,.9); return c; }',
    '  if(id==13){ float row=floor(uv.y/s); float x=uv.x/(s*.16)+h1(vec2(row,7.))*9.; float i=floor(x); float fy=fract(uv.y/s); float hh=.62+.3*h1(vec2(i,row+1.));',
    '    float book=step(fy,hh)*aaStep(.08,fract(x))*(1.-aaStep(.92,fract(x))); float t=h1(vec2(i,row));',
    '    vec3 c=t<.33?vec3(.42,.08,.07):t<.55?vec3(.08,.2,.14):t<.75?vec3(.12,.12,.3):mix(a,b,t); c*=.6+.6*h1(vec2(i+2.,row)); c=mix(c,vec3(.75,.6,.3),step(.82,fract(fy/hh*5.))*step(.88,1.-fract(fy/hh*5.))*.0);',
    '    return mix(b*.25, c, book); }',
    '  if(id==14){ vec2 q=vec2(uv.x/s, uv.y/(s*.55)); q.x+=.5*mod(floor(q.y),2.); vec2 f=fract(q)-vec2(.5,1.); float d=length(f*vec2(1.,.8)); float t=h1(floor(q));',
    '    return mix(b,a*(.8+.35*t),1.-aaStep(.52,d))*(.55+.5*fract(q.y)); }',
    '  if(id==15){ float g=vn(vec2(uv.x*3.,uv.y*140.)); r*=.7+.5*g; return a*(.9+.15*g); }',
    '  return a*(.94+.1*nz); }',
    'void main(){',
    '  if(uMode==2){ vec2 q=vec2((vUV.x-.5)*2., 1.-vUV.y); float t=uTime;',
    '    float n=fbm(vec2(q.x*1.7+uSeed, q.y*2.2-t*1.6))*2.-1., n2=fbm(vec2(q.x*4.+uSeed*1.9, q.y*5.-t*2.7))*2.-1.;',
    '    float w=(1.-pow(q.y,1.2))*(.62+.15*n2)*smoothstep(-.02,.12,q.y)+.02; float dx=abs(q.x+n*.38*q.y+n2*.08*q.y);',
    '    float m=(1.-dx/w)*smoothstep(1.,.65,q.y+.15*n2); float al=smoothstep(0.,.35,m); if(al<.004) discard;',
    '    float heat=clamp(m*(1.1-q.y*.7),0.,1.); vec3 c=mix(vec3(.6,.06,.01),vec3(1.,.32,.04),smoothstep(0.,.4,heat)); c=mix(c,vec3(1.,.7,.2),smoothstep(.4,.75,heat)); c=mix(c,vec3(1.,.93,.6),smoothstep(.8,1.,heat));',
    '    oC=vec4(c*uEmit*(.4+1.6*heat),al); oN=vec4(0.); return; }',
    '  vec3 N=normalize(vN); vec3 V=normalize(uEye-vW); if(dot(N,V)<0.) N=-N;',
    '  vec3 alb; float rough, em, metal=0., alpha=1.;',
    '  if(uMode==1){ vec4 t=texture(uTex,vUV); if(t.a<.02) discard; alpha=t.a; alb=pow(t.rgb,vec3(2.2)); rough=uRough; em=uEmit; }',
    '  else { int fl=int(vP.z); metal=float(fl&1); vec3 a=pow(vC1.rgb,vec3(2.2)), b=pow(vC2.rgb,vec3(2.2));',
    '    if((fl&2)!=0){ b=b/max(a,vec3(.02))*uDyn0; a=uDyn0; } if((fl&4)!=0){ b=b/max(a,vec3(.02))*uDyn1; a=uDyn1; }',
    '    rough=vC1.a; em=vC2.a*255./16.; alb=pat(int(vP.x), vL, vLN, a, b, vP.y/40., rough, em);',
    '    int g=int(vP.w); if(g==1) em*=uLvl.x; else if(g==2) em*=uLvl.y; else if(g==3) em*=uLvl.z;',
    '    if((fl&8)!=0){ oC=vec4(alb*em,1.); oN=vec4(normalize(mat3(uView)*N)*.5+.5,1.); return; } }',
    '  float a0=fract(52.98*fract(dot(gl_FragCoord.xy,vec2(.0671,.00584))))*6.283;',
    '  vec3 dif=vec3(0.), spc=vec3(0.); float sp=mix(180.,6.,sqrt(rough)); float sk=(sp+8.)/25.*(1.-rough)*(1.-rough);',
    '  for(int i=0;i<3;i++){ vec3 lc=uLC[i]; if(lc.r+lc.g+lc.b<=1e-5) continue;',
    '    vec3 Lv=uLP[i]-vW; float d2=dot(Lv,Lv), d=sqrt(d2); vec3 L=Lv/d; float nl=dot(N,L); float wr=max((nl+.2)/1.2,0.); if(wr<=0.) continue;',
    '    float win=clamp(1.-pow(d/uLR[i].x,4.),0.,1.); float att=win*win/(d2+.3); float sh=1.;',
    '    if(uLR[i].y>-.5){ vec3 v=vW+N*.04-uLP[i]; sh = uLR[i].y<.5 ? cubeSh(uSh0,v,a0) : cubeSh(uSh1,v,a0); }',
    '    vec3 e=lc*att*sh; dif+=e*wr; spc+=e*max(nl,0.)*sk*pow(max(dot(N,normalize(L+V)),0.),sp); }',
    '  { float nl=dot(N,uMoonDir); if(nl>0.){ vec4 q=uMoonVP*vec4(vW+N*.05,1.); vec3 s=q.xyz*.5+.5; float sh=0.;',
    '    for(int i=0;i<4;i++){ float an=a0+float(i)*1.5708; sh+=texture(uMoonSh, vec3(s.xy+vec2(cos(an),sin(an))*.0012, s.z-.0015)); }',
    '    vec3 e=uMoonC*sh*.25; dif+=e*nl; spc+=e*nl*sk*pow(max(dot(N,normalize(uMoonDir+V)),0.),sp); } }',
    '  vec3 amb=uAmb*(.65+.35*N.y)+uSkyA*(.55+.45*N.y);',
    '  vec3 col; vec3 R=reflect(-V,N);',
    '  if(metal>.5){ vec3 env=(amb*2.2+uSkyA)*(.6+.8*smoothstep(-.2,.8,R.y)); col=alb*(dif*.35+amb*.5)+alb*spc*3.+alb*env*(1.2-rough); }',
    '  else { float fr=pow(1.-max(dot(N,V),0.),5.); col=alb*(dif+amb)+spc*.35+amb*fr*(1.-rough)*.5; }',
    '  if(uMode==1 && uUnlit>.5) col=alb*em; else col+=alb*em;',
    '  oC=vec4(col,alpha); oN=vec4(normalize(mat3(uView)*N)*.5+.5,1.); }'].join('\n');
  var VS_DEPTH = '#version 300 es\nlayout(location=0) in vec3 aPos; uniform mat4 uVP, uModel; void main(){ gl_Position=uVP*(uModel*vec4(aPos,1.)); }';
  var FS_DEPTH = '#version 300 es\nprecision mediump float; out vec4 o; void main(){ o=vec4(1.); }';
  var HEAD = '#version 300 es\nprecision highp float; in vec2 vUv; out vec4 o;\n' + NOISE + '\n';
  var FS_SKY = ['#version 300 es', 'precision highp float; in vec2 vUv; layout(location=0) out vec4 oC; layout(location=1) out vec4 oN;', NOISE,
    'uniform vec4 uWin, uMoon; uniform vec3 uTop, uMid, uLow, uGlow, uCity; uniform vec4 uOpt; uniform vec3 uGround; uniform float uTime, uY0, uY1, uYG;',
    'void main(){ vec2 w=uWin.xy+(vUv*2.-1.)*uWin.zw; float t=clamp((w.y-uY0)/(uY1-uY0),0.,1.);',
    '  vec3 c=mix(uLow,uMid,smoothstep(0.,.45,t)); c=mix(c,uTop,smoothstep(.4,1.,t)); c+=uGlow*exp(-max(w.y-uY0,0.)*.35);',
    '  vec2 g=w*2.4; vec2 id=floor(g); vec2 f=fract(g)-.5; float r=h1(id); vec2 off=vec2(h1(id+3.1),h1(id+7.3))-.5;',
    '  float tw=.75+.25*sin(uTime*(1.+r*2.)+r*40.); c+=uOpt.x*step(.82,r)*smoothstep(.06*(.4+r*.6),0.,length(f-off*.7))*(.5+2.5*h1(id+1.7))*tw*vec3(.8,.85,1.)*smoothstep(-.1,.4,t);',
    '  if(uOpt.y>0.){ float cl=vn(w*vec2(.08,.32)+3.)*vn(w*vec2(.2,.7)+uTime*.01); c+=uMid*1.1*smoothstep(.3,.7,cl)*uOpt.y; }',
    '  if(uOpt.z>0.){ float x=w.x/.9; float i=floor(x); float hh=uY0+.4+1.9*h1(vec2(i,3.))*h1(vec2(i*.31,9.)); float fx=fract(x);',
    '    hh+=uYG-uY0; float b=step(w.y,hh)*step(.05,fx)*step(fx,.95); c=mix(c,uCity,b*uOpt.z);',
    '    vec2 wc=vec2(fx*5.,(w.y-uYG)*3.6); vec2 wi=floor(wc), wf=fract(wc); c+=b*uOpt.z*step(.86,h1(wi+i*3.3))*step(.3,wf.x)*step(wf.x,.7)*step(.3,wf.y)*step(wf.y,.7)*vec3(.5,.36,.16)*.6; }',
    '  if(uMoon.z>0.){ vec2 mp=w-uMoon.xy; float d=length(mp), R=uMoon.z; float disc=smoothstep(R,R-.04,d);',
    '    vec3 mn=vec3(mp/R, sqrt(max(1.-d*d/(R*R),0.))); float lit=clamp(dot(mn,normalize(vec3(.4,.3,.85))),0.,1.);',
    '    float mare=fbm(mp*2.8+4.)*.6+vn(mp*9.)*.4; vec3 mc=vec3(1.,.96,.86)*(.45+.55*lit)*(.7+.35*mare);',
    '    c=mix(c,mc*uMoon.w,disc); c+=(vec3(.09,.11,.19)*exp(-d*.35)+vec3(.18,.2,.28)*exp(-max(d-R,0.)*2.4))*(1.-disc)*uMoon.w; }',
    '  c=mix(c,uGround*(.6+.4*smoothstep(uYG-3.,uYG,w.y)),step(w.y,uYG));',
    '  oC=vec4(c,1.); oN=vec4(.5,.5,1.,0.); }'].join('\n');
  var FS_AO = HEAD + ['uniform sampler2D uDepth, uNrm; uniform mat4 uProj, uInv; uniform float uRad;',
    'vec3 vpos(vec2 q){ float d=texture(uDepth,q).r; vec4 p=uInv*vec4(q*2.-1.,d*2.-1.,1.); return p.xyz/p.w; }',
    'void main(){ float d0=texture(uDepth,vUv).r; if(d0>=.99999){ o=vec4(1.); return; }',
    '  vec3 p=vpos(vUv), n=normalize(texture(uNrm,vUv).xyz*2.-1.); float a=h1(gl_FragCoord.xy)*6.283;',
    '  vec3 rv=vec3(cos(a),sin(a),.3); vec3 t=normalize(rv-n*dot(rv,n)), b=cross(n,t); float occ=0.;',
    '  for(int i=0;i<10;i++){ float fi=float(i); float s=(fi+1.)/10.; s=.2+.8*s*s; float an=fi*2.39996;',
    '    vec3 k=normalize(vec3(cos(an)*.8,sin(an)*.8,.35+.6*fract(fi*.618)))*s; vec3 sp=p+(t*k.x+b*k.y+n*k.z)*uRad;',
    '    vec4 q=uProj*vec4(sp,1.); vec2 u=q.xy/q.w*.5+.5; float z=vpos(u).z; float rc=smoothstep(0.,1.,uRad/max(abs(p.z-z),1e-4));',
    '    occ+=step(sp.z+.02,z)*rc; }',
    '  o=vec4(1.-occ/10.); }'].join('\n');
  var FS_BLUR = HEAD + 'uniform sampler2D uTex, uDepth; uniform vec2 uPx;\nvoid main(){ float d0=texture(uDepth,vUv).r; float s=0., w=0.;\n for(int y=-2;y<2;y++) for(int x=-2;x<2;x++){ vec2 q=vUv+(vec2(x,y)+.5)*uPx; float k=1./(1.+abs(texture(uDepth,q).r-d0)*3000.); s+=texture(uTex,q).r*k; w+=k; }\n o=vec4(s/w); }';
  var FS_DOWN = HEAD + 'uniform sampler2D uTex; uniform vec2 uPx; uniform float uKnee;\nvoid main(){ vec3 c=texture(uTex,vUv).rgb*.5+.125*(texture(uTex,vUv+uPx*vec2(-1,-1)).rgb+texture(uTex,vUv+uPx*vec2(1,-1)).rgb+texture(uTex,vUv+uPx*vec2(-1,1)).rgb+texture(uTex,vUv+uPx*vec2(1,1)).rgb);\n if(uKnee>0.){ float l=max(c.r,max(c.g,c.b)); c*=smoothstep(uKnee*.5,uKnee*2.,l); c=min(c,vec3(30.)); } o=vec4(c,1.); }';
  var FS_UP = HEAD + 'uniform sampler2D uTex; uniform vec2 uPx;\nvoid main(){ vec3 c=(texture(uTex,vUv+uPx*vec2(-1,0)).rgb+texture(uTex,vUv+uPx*vec2(1,0)).rgb+texture(uTex,vUv+uPx*vec2(0,-1)).rgb+texture(uTex,vUv+uPx*vec2(0,1)).rgb)*.25; o=vec4(c,1.); }';
  var FS_TONE = HEAD + ['uniform sampler2D uHdr, uAO, uBloom; uniform float uExp, uBloomK, uAOK, uGrain, uSeed;',
    'vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }',
    'void main(){ vec3 c=texture(uHdr,vUv).rgb; float ao=texture(uAO,vUv).r; float l=dot(c,vec3(.3,.6,.1));',
    '  c*=mix(1.,ao*ao,uAOK*(1.-smoothstep(.8,3.,l))); c+=texture(uBloom,vUv).rgb*uBloomK; c*=uExp;',
    '  float m=max(c.r,max(c.g,c.b)); vec3 a=aces(c), h=c*(aces(vec3(m)).r/max(m,1e-4)); c=mix(a,h,.55);',  // keeps the hue of bright lamps
    '  vec2 q=vUv-.5; c*=1.-dot(q,q)*.5; c=pow(c,vec3(1./2.2)); c+=(h1(gl_FragCoord.xy+uSeed)-.5)*uGrain;',
    '  o=vec4(c,dot(c,vec3(.299,.587,.114))); }'].join('\n');
  // final: anti-aliasing, the "just HTML" sheet and the lens
  var FS_FINAL = HEAD + ['uniform sampler2D uLdr, uNrm, uPlain, uPlainL; uniform vec2 uRes, uPx; uniform vec4 uLens; uniform vec4 uLensK; uniform float uFull; uniform vec3 uPaper, uInk, uRim;',
    'vec3 aa(vec2 uv){ vec4 m=texture(uLdr,uv); float n=texture(uLdr,uv+vec2(0,uPx.y)).a, s=texture(uLdr,uv-vec2(0,uPx.y)).a, e=texture(uLdr,uv+vec2(uPx.x,0)).a, w=texture(uLdr,uv-vec2(uPx.x,0)).a;',
    '  float lo=min(m.a,min(min(n,s),min(e,w))), hi=max(m.a,max(max(n,s),max(e,w))); if(hi-lo<max(.04,hi*.12)) return m.rgb;',
    '  vec2 d=normalize(vec2(-(n-s),e-w)+1e-5)*uPx; vec3 a=.5*(texture(uLdr,uv-d*.5).rgb+texture(uLdr,uv+d*.5).rgb);',
    '  vec3 b=a*.5+.25*(texture(uLdr,uv-d*2.).rgb+texture(uLdr,uv+d*2.).rgb); float lb=dot(b,vec3(.299,.587,.114)); return (lb<lo||lb>hi)?a:b; }',
    'float edge(vec2 uv, float k){ vec2 p=uPx*k; vec4 a=texture(uNrm,uv+vec2(p.x,0)), b=texture(uNrm,uv-vec2(p.x,0)), c=texture(uNrm,uv+vec2(0,p.y)), d=texture(uNrm,uv-vec2(0,p.y));',
    '  return clamp((length(a.xyz-b.xyz)+length(c.xyz-d.xyz))*1.6+abs(a.a-b.a)+abs(c.a-d.a),0.,1.); }',
    'vec3 sheet(vec2 uv, vec2 px, float k){ vec2 g=abs(fract(px/(22.*k))-.5); float grid=1.-smoothstep(0.,.04,min(g.x,g.y)); vec3 c=uPaper-grid*.035; return mix(c,uInk,edge(uv,k)*.55); }',
    'void main(){ vec2 px=vec2(vUv.x,1.-vUv.y)*uRes; vec3 col=aa(vUv);',
    '  if(uFull>0.){ vec4 pl=texture(uPlain,vUv); vec3 f=sheet(vUv,px,1.)*(1.-pl.a)+pl.rgb; col=mix(col,f,uFull); }',
    '  if(uLensK.x>0.){ vec2 L=uLens.xy; float R=uLens.z, mag=uLens.w, d=length(px-L), rw=max(5.,R*.09);',
    '    vec2 hd=normalize(vec2(.72,.69)); vec2 h0=L+hd*(R+rw*.5); float hl=R*.9+24., hwid=max(R*.085,6.); float th=clamp(dot(px-h0,hd)/hl,0.,1.); float dh=length(px-h0-hd*hl*th);',
    '    float sh=smoothstep(rw+14.,rw*.2,abs(length(px-L-vec2(6.,9.))-R-rw*.5))*.35+smoothstep(hwid+12.,hwid*.3,length(px-vec2(6.,9.)-h0-hd*hl*clamp(dot(px-vec2(6.,9.)-h0,hd)/hl,0.,1.)))*.35;',
    '    col*=1.-sh*uLensK.x*step(R,d);',
    '    if(d<R){ vec2 q=L+(px-L)/mag; vec2 quv=vec2(q.x/uRes.x,1.-q.y/uRes.y); vec4 pl=texture(uPlainL,vUv); vec3 in_=sheet(quv,q,1./mag)*(1.-pl.a)+pl.rgb;',
    '      float rr=d/R; in_*=1.-.18*pow(rr,6.); in_+=vec3(1.)*.18*smoothstep(.55,.95,1.-length((px-L)/R-vec2(-.42,-.45)))*(1.-rr*.4);',
    '      col=mix(col,in_,uLensK.x*smoothstep(R,R-1.5,d)); }',
    '    float ring=smoothstep(rw*.5+1.,rw*.5-.5,abs(d-R-rw*.5)); float rl=.55+.45*dot(normalize(px-L+1e-4),normalize(vec2(-.6,-.8)));',
    '    vec3 brass=uRim*(.55+.75*rl)*(1.+.6*smoothstep(.55,.0,abs(d-R-rw*.35)/rw));',
    '    float hand=smoothstep(hwid+.8,hwid-.6,dh)*step(.02,th); float hs=.55+.45*clamp(1.-(dh/hwid),0.,1.);',
    '    vec3 wood=mix(vec3(.18,.08,.04),vec3(.42,.2,.09),hs)*(.85+.15*sin(th*90.)); wood=mix(wood,uRim*hs,step(th,.18));',
    '    col=mix(col,wood,hand*uLensK.x); col=mix(col,brass*(1.+uLensK.y*.35),ring*uLensK.x); }',
    '  o=vec4(col,1.); }'].join('\n');
  var VS_PLAIN = '#version 300 es\nlayout(location=0) in vec3 aPos; uniform mat4 uVP, uModel; out vec2 vUV; void main(){ vUV=vec2(aPos.x+.5,.5-aPos.y); gl_Position=uVP*(uModel*vec4(aPos,1.)); }';
  var FS_PLAIN = '#version 300 es\nprecision highp float; in vec2 vUV; uniform sampler2D uTex; uniform float uHov; out vec4 o; void main(){ vec4 t=texture(uTex,vUV); vec3 c=t.rgb; c=mix(c,vec3(.25,.45,1.),uHov*.12); o=vec4(c*t.a,t.a); }';

  // ------------------------------------------------------------------ the world: zones, building, rooms
  function World(cfg, sizeOf) {
    this.cfg = cfg; this.sizeOf = sizeOf; this.zones = []; this.zoneById = {}; this.lights = {}; this.flames = []; this.panelDefs = [];
    this.movers = {}; this.dirty = true; this.rooms = []; this.animators = []; this.binds = [];
  }
  World.prototype.zone = function (id, o) {
    if (this.zoneById[id]) return this.zoneById[id];
    var Z = Object.assign({ id: id, world: this, lights: [], lightIndex: {}, movers: [], bounce: 1, moonK: 0.18, dyn: [[1, 1, 1], [1, 1, 1]], shadowDirty: true }, o || {});
    Z.b = new Builder(Z); this.zones.push(Z); this.zoneById[id] = Z; return Z;
  };
  // the grid: column x ranges, floor y ranges, the top of the building
  function gridOf(b) {
    var wall = b.wall || 0.22, slab = b.slab || 0.26, D = b.depth || 3.2, cols = b.cols || [5, 5], floors = b.floors || [2.8, 2.8];
    var Wt = cols.reduce(function (a, c) { return a + c; }, 0) + (cols.length + 1) * wall, X = [], Y = [], x = -Wt / 2 + wall, y = 0;
    cols.forEach(function (w) { X.push([x, x + w]); x += w + wall; });
    floors.forEach(function (h) { Y.push([y, y + h]); y += h + slab; });
    return { wall: wall, slab: slab, D: D, X: X, Y: Y, left: -Wt / 2, right: Wt / 2, top: Y[Y.length - 1][1] + slab };
  }
  DH.gridOf = gridOf;
  World.prototype.build = function () {
    var cfg = this.cfg, b = cfg.building || {}, G = this.G = gridOf(b), self = this;
    var ext = this.zone('ext', { moonK: 1, bounce: 0.6 });
    var occ = G.Y.map(function () { return G.X.map(function () { return null; }); });
    // rooms
    (cfg.rooms || []).forEach(function (r) {
      var c = r.cell, cs = c[2] || 1, fs = c[3] || 1, R = { id: r.id, name: r.name || r.id, x0: G.X[c[0]][0], x1: G.X[c[0] + cs - 1][1], y0: G.Y[c[1]][0], y1: G.Y[c[1] + fs - 1][1], d: G.D, cell: c, cfg: r };
      R.w = R.x1 - R.x0; R.h = R.y1 - R.y0;
      for (var f = c[1]; f < c[1] + fs; f++) for (var k = c[0]; k < c[0] + cs; k++) occ[f][k] = R;
      var Z = self.zone(r.id, { room: R, bounce: r.bounce == null ? 1 : r.bounce, moonK: r.moonK == null ? 0.16 : r.moonK });
      R.zone = Z; self.rooms.push(R);
      Z.b.group({ at: [R.x0, R.y0, 0] }, function (B) {
        B.shell(R, { wall: r.wall || mat('#d8cdb4', { pat: 'plaster' }), left: r.left, right: r.right, floor: r.floor || mat('#7a5232', { c2: '#5b3a22', pat: 'planks', s: 0.16, rough: 0.6 }), ceil: r.ceil });
        if (r.build) r.build(B, R, DH);
      });
    });
    this.occ = occ;
    var B = ext.b, frame = typeof b.frame === 'object' && b.frame.c1 ? b.frame : mat(b.frame || '#ece4d2', { pat: 'plaster', rough: 0.85 });
    var inlay = b.inlay === false ? null : mat(b.inlay || '#b48a3e', { metal: 1, rough: 0.35 });
    var D = G.D, wall = G.wall, slab = G.slab, nF = G.Y.length, nC = G.X.length, back = -D - wall;
    // walls between columns (and the outer two), floor by floor; a room spanning two columns has no wall between them
    for (var k = 0; k <= nC; k++) {
      var xa = k === 0 ? G.left : G.X[k - 1][1], xb = xa + wall;
      for (var f = 0; f < nF; f++) {
        if (k > 0 && k < nC && occ[f][k - 1] && occ[f][k - 1] === occ[f][k]) continue;
        B.box(xa, G.Y[f][0], back, xb, G.Y[f][1] + slab, 0, frame);
      }
    }
    // slabs; a room spanning two floors has no slab between them
    for (f = 0; f < nF; f++) for (k = 0; k < nC; k++) {
      if (f < nF - 1 && occ[f][k] && occ[f][k] === occ[f + 1][k]) continue;
      B.box(G.X[k][0] - 0.001, G.Y[f][1], back, G.X[k][1] + 0.001, G.Y[f][1] + slab, 0, frame);
      if (inlay) B.box(G.X[k][0], G.Y[f][1] + slab * 0.42, 0, G.X[k][1], G.Y[f][1] + slab * 0.58, 0.012, inlay);
    }
    // empty cells: a closed bay with a lit window
    var wf = b.wings || {}, wingFace = mat(wf.face || '#7b3b2b', { c2: wf.mortar || '#c9b9a0', pat: wf.pat || 'brick', s: wf.s || 0.09, rough: 0.9 });
    for (f = 0; f < nF; f++) for (k = 0; k < nC; k++) if (!occ[f][k]) { B.box(G.X[k][0], G.Y[f][0], back, G.X[k][1], G.Y[f][1], -0.02, wingFace); winBay(B, (G.X[k][0] + G.X[k][1]) / 2, G.Y[f][0], G.Y[f][1] - G.Y[f][0], Math.min(1.1, (G.X[k][1] - G.X[k][0]) * 0.5), wf, 0); }
    // wings: the outer walls of the building, brick with stone quoins and a window a floor
    var ww = b.wings === false ? 0 : (wf.w || 0.9), L = G.left - ww, Rr = G.right + ww; this.outer = [L, Rr];
    if (ww) {
      var quoin = mat(wf.quoin || '#d9d0bd', { pat: 'plaster', rough: 0.85 });
      [[G.left - ww, G.left, -1], [G.right, G.right + ww, 1]].forEach(function (s) {
        B.box(s[0], 0, back, s[1], G.top, 0, wingFace);
        var xo = s[2] < 0 ? s[0] : s[1];
        for (var y = 0, i = 0; y < G.top - 0.05; y += 0.3, i++) { var qw = i % 2 ? 0.22 : 0.36; B.box(s[2] < 0 ? xo - 0.02 : xo - qw, y + 0.015, -qw, s[2] < 0 ? xo + qw : xo + 0.02, Math.min(G.top, y + 0.285), 0.025, quoin); }
        if (wf.windows !== false) G.Y.forEach(function (yy) { winBay(B, (s[0] + s[1]) / 2 + s[2] * 0.06, yy[0], yy[1] - yy[0], Math.min(0.5, ww * 0.5), wf, 1); });
      });
    }
    // base, cornice, roof, sign, ground
    var bs = b.base || {}, baseH = bs.h == null ? 0.42 : bs.h; this.baseH = baseH;
    var baseMat = mat(bs.face || '#8f8778', { c2: bs.mortar || '#5d574d', pat: 'brick', s: 0.21, rough: 0.9 });
    B.box(L, -baseH, back, Rr, 0, 0.06, baseMat);
    if (bs.steps != null) { var sx = G.X[bs.steps]; for (var st = 0; st < 2; st++) B.box(sx[0] + 0.3 + st * 0.12, -baseH + st * baseH / 2, 0.06, sx[1] - 0.3 - st * 0.12, -baseH + (st + 1) * baseH / 2, 0.5 - st * 0.22, mat(bs.stepFace || '#b3aa98', { rough: 0.8 })); }
    var cor = mat(b.cornice || '#e9e1cd', { rough: 0.7 });
    B.box(L - 0.14, G.top, back - 0.12, Rr + 0.14, G.top + 0.17, 0.16, cor);
    for (var dx = L - 0.08; dx < Rr + 0.06; dx += 0.22) B.box(dx, G.top - 0.09, -0.02, dx + 0.1, G.top, 0.1, cor);
    var top = G.top + 0.17, rf = b.roof || { kind: 'flat' }; this.roofTop = top;
    if (rf.kind === 'gable') {
      var rh = rf.h || 2.2, eave = 0.25, sh = mat(rf.face || '#5a3a32', { c2: rf.c2 || '#2c1b16', pat: 'shingle', s: 0.32, rough: 0.75 });
      var x0 = L - eave, x1 = Rr + eave, xm = (x0 + x1) / 2, z0 = back - 0.2, z1 = 0.22;
      B.quad([x0, top, z1], [xm, top + rh, z1], [xm, top + rh, z0], [x0, top, z0], sh);
      B.quad([xm, top + rh, z1], [x1, top, z1], [x1, top, z0], [xm, top + rh, z0], sh);
      var gf = frame; B.tri([x0 + 0.3, top, 0.05], [x1 - 0.3, top, 0.05], [xm, top + rh - 0.18, 0.05], [0, 0, 1], [0, 0, 1], [0, 0, 1], gf);
      B.bar([x0, top - 0.02, z1 + 0.02], [xm, top + rh, z1 + 0.02], 0.1, cor); B.bar([xm, top + rh, z1 + 0.02], [x1, top - 0.02, z1 + 0.02], 0.1, cor);
      if (rf.oculus !== false) { var oy = top + rh * 0.42, orr = Math.min(0.42, rh * 0.18); B.cyl(xm, oy, 0.02, orr + 0.08, 0.08, cor, { axis: 'z', seg: 24 }); B.cyl(xm, oy, 0.08, orr, 0.03, mat(wf.glass || '#ffcf8a', { emit: 1.4, unlit: true, noShadow: true }), { axis: 'z', seg: 24 }); B.box(xm - 0.015, oy - orr, 0.1, xm + 0.015, oy + orr, 0.12, cor); B.box(xm - orr, oy - 0.015, 0.1, xm + orr, oy + 0.015, 0.12, cor); }
      this.roofTop = top + rh;
    } else if (rf.kind !== 'none') {
      B.box(L - 0.02, top, back, Rr + 0.02, top + 0.38, -0.02, mat(rf.parapet || b.cornice || '#e2d9c4', { pat: 'plaster', rough: 0.85 }));
      B.box(L + 0.1, top + 0.38, back + 0.1, Rr - 0.1, top + 0.4, -0.1, mat('#4a4642', { rough: 0.9 }));
      this.roofTop = top + 0.4;
    }
    (rf.chimneys || []).forEach(function (cx) {
      var cy = rf.kind === 'gable' ? top + (rf.h || 2.2) * (1 - Math.abs(cx - (L + Rr) / 2) / ((Rr - L) / 2 + 0.25)) - 0.3 : top + 0.3;
      B.box(cx - 0.3, cy, back * 0.6 - 0.35, cx + 0.3, cy + 1.1, back * 0.6 + 0.35, wingFace);
      B.box(cx - 0.36, cy + 1.1, back * 0.6 - 0.41, cx + 0.36, cy + 1.2, back * 0.6 + 0.41, cor);
      for (var p = -1; p <= 1; p += 2) B.cyl(cx + p * 0.13, cy + 1.2, back * 0.6, 0.08, 0.28, mat('#a65a36', { rough: 0.8 }), { seg: 10, r2: 0.065 });
      self.roofTop = Math.max(self.roofTop, cy + 1.5);
    });
    if (rf.build) rf.build(B, { L: L, R: Rr, top: top, back: back, G: G }, DH);
    var sg = b.sign; if (sg) this.signBuild(B, sg, L, Rr, top, back);
    this.groundBuild(cfg.ground || {}, L, Rr, back, baseH);
    // the page's own things outside (a doorbell, a bench, a bicycle): cfg.outside(B, {G, left, right, top, base, back})
    if (cfg.outside) cfg.outside(B, { G: G, left: L, right: Rr, wing: ww, top: top, base: -baseH, back: back }, DH);
    function winBay(B, cx, y0, h, w, wf, side) {
      var wy = y0 + h * 0.22, wh = h * 0.58, glass = mat(wf.glass || '#ffcf8a', { emit: wf.glow == null ? 1.6 : wf.glow, rough: 0.3, noShadow: true, unlit: true });
      var fr = mat(wf.frameC || '#e7dfcc', { rough: 0.7 });
      B.box(cx - w / 2, wy, -0.03, cx + w / 2, wy + wh, 0.005, glass);
      B.box(cx - w / 2 - 0.05, wy - 0.05, 0, cx + w / 2 + 0.05, wy, 0.07, fr); B.box(cx - w / 2 - 0.05, wy + wh, 0, cx + w / 2 + 0.05, wy + wh + 0.08, 0.05, fr);
      B.box(cx - w / 2 - 0.05, wy, 0, cx - w / 2, wy + wh, 0.04, fr); B.box(cx + w / 2, wy, 0, cx + w / 2 + 0.05, wy + wh, 0.04, fr);
      B.box(cx - 0.015, wy, 0, cx + 0.015, wy + wh, 0.02, fr); B.box(cx - w / 2, wy + wh * 0.55, 0, cx + w / 2, wy + wh * 0.55 + 0.03, 0.02, fr);
    }
  };
  // the sign: a live HTML element (usually contenteditable) drawn unlit on a dark board, on a steel lattice over the roof
  World.prototype.signBuild = function (B, sg, L, Rr, top, back) {
    var w = sg.w || (Rr - L) * 0.6, asp = B.aspect(sg.key), h = w * asp, cx = sg.x || 0;
    var y0 = sg.at === 'front' ? (sg.y != null ? sg.y : top - h - 0.3) : this.roofTop + (sg.lift || 0.35), steel = mat('#2a2e33', { rough: 0.5, metal: 1 }), z = sg.at === 'front' ? 0.2 : -0.6;
    if (sg.at !== 'front') {
      for (var x = cx - w / 2; x <= cx + w / 2 + 0.01; x += w / Math.max(2, Math.round(w / 1.2))) { B.bar([x, this.roofTop - 0.1, z - 0.15], [x, y0 + h, z - 0.15], 0.06, steel); }
      B.bar([cx - w / 2, y0 + 0.02, z - 0.15], [cx + w / 2, y0 + 0.02, z - 0.15], 0.06, steel);
      for (x = cx - w / 2; x < cx + w / 2 - 0.1; x += 0.6) B.bar([x, this.roofTop - 0.05, z - 0.15], [x + 0.6, y0 + 0.05, z - 0.15], 0.03, steel);
    }
    B.box(cx - w / 2 - 0.08, y0 - 0.08, z - 0.12, cx + w / 2 + 0.08, y0 + h + 0.08, z - 0.02, mat(sg.board || '#16141a', { rough: 0.6 }));
    B.panel(sg.key, { at: [cx, y0 + h / 2, z], w: w, unlit: true, emit: sg.emit || 1.7 });
    B.light('sign', { at: [cx, y0 + h / 2, z + 0.9], color: sg.color || '#ff5a7a', power: sg.power || 2.2, range: 5, shadow: false });
    this.signTop = y0 + h + 0.1; this.roofTop = Math.max(this.roofTop, this.signTop);
  };
  World.prototype.groundBuild = function (g, L, Rr, back, baseH) {
    var B = this.zoneById.ext.b, y = -baseH, pad = g.pad || 2.6, x0 = L - pad, x1 = Rr + pad, z0 = back - 0.8, z1 = 2.4;
    this.bounds = [x0, -baseH - 0.32, x1, 0];
    B.box(x0, y - 0.32, z0, x1, y, z1, mat(g.plinth || '#4b2c1c', { c2: '#331c10', pat: 'wood', s: 0.6, rough: 0.45 }));
    B.box(x0, y - 0.2, z1, x1, y - 0.17, z1 + 0.01, mat('#c49a4c', { metal: 1, rough: 0.3 }));
    if (g.kind === 'none') return;
    B.box(x0 + 0.04, y, z0 + 0.04, x1 - 0.04, y + 0.03, 1.25, mat(g.pave || '#8d8a84', { c2: '#5a5752', pat: 'tile', s: 0.42, rough: 0.8 }));
    B.box(x0 + 0.04, y, 1.25, x1 - 0.04, y + 0.05, 1.4, mat('#a29d94', { rough: 0.8 }));
    B.box(x0 + 0.04, y - 0.06, 1.4, x1 - 0.04, y, z1 - 0.04, mat(g.road || '#2d2c2e', { rough: 0.85 }));
    var iron = mat('#1d2125', { rough: 0.5, metal: 1 });
    if (g.lamps !== false) [[L - 0.75, 'lampL'], [Rr + 0.75, 'lampR']].forEach(function (p) {
      var x = p[0], z = 0.9; B.cyl(x, y, z, 0.09, 0.2, iron, { seg: 10, r2: 0.06 }); B.cyl(x, y + 0.2, z, 0.045, 2.5, iron, { seg: 8, r2: 0.035 });
      B.box(x - 0.16, y + 2.68, z - 0.16, x + 0.16, y + 2.72, z + 0.16, iron);
      B.box(x - 0.13, y + 2.72, z - 0.13, x + 0.13, y + 3.05, z + 0.13, mat(g.lampGlass || '#ffe0a8', { emit: 4, unlit: true, noShadow: true, glow: p[1] }));
      B.cyl(x, y + 3.05, z, 0.2, 0.14, iron, { seg: 8, r2: 0.02 });
      B.light(p[1], { at: [x, y + 2.9, z + 0.25], color: g.lampColor || '#ffcf8a', power: g.lampPower || 3.2, range: 7, shadow: false });
    });
    var trees = g.trees == null ? 1 : g.trees, leaf = mat(g.leaf || '#2e4a32', { c2: '#3d6040', pat: 'plaster', rough: 0.9 }), bark = mat('#4a3020', { rough: 0.9 });
    for (var i = 0; i < trees; i++) [-1, 1].forEach(function (s) {
      var x = s < 0 ? L - 1.7 - i * 0.9 : Rr + 1.7 + i * 0.9, z = -0.4 - i * 0.9; if (x < x0 + 0.4 || x > x1 - 0.4) return;
      B.cyl(x, y, z, 0.08, 0.6, bark, { seg: 8 });
      B.lathe(x, y + 0.5, z, [[0.62, 0], [0.5, 0.35], [0.56, 0.4], [0.4, 0.8], [0.45, 0.85], [0.25, 1.25], [0.28, 1.3], [0, 1.75]], leaf, { seg: 14 });
    });
  };

  // ------------------------------------------------------------------ GL resources
  function makeVAO(gl, mesh) {
    var vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(mesh.buf, 0, mesh.n * STRIDE), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.BYTE, true, STRIDE, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, STRIDE, 16);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, true, STRIDE, 20);
    gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 4, gl.UNSIGNED_BYTE, true, STRIDE, 24);
    gl.bindVertexArray(null); return { vao: vao, n: mesh.n };
  }
  function depthTex(gl, w, h) { var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, w, h); params(gl, gl.TEXTURE_2D, gl.NEAREST); return t; }
  function params(gl, tgt, filt, cmp) {
    gl.texParameteri(tgt, gl.TEXTURE_MIN_FILTER, filt); gl.texParameteri(tgt, gl.TEXTURE_MAG_FILTER, filt);
    gl.texParameteri(tgt, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(tgt, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (cmp) { gl.texParameteri(tgt, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(tgt, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL); }
  }
  function colorTex(gl, w, h, hdr) {
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    if (hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    params(gl, gl.TEXTURE_2D, gl.LINEAR); t.w = w; t.h = h; return t;
  }
  function fbo(gl, cols, depth) {
    var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    cols.forEach(function (c, i) { gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, c, 0); });
    if (depth) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0);
    f.w = cols[0].w; f.h = cols[0].h; return f;
  }
  var CUBE = [[[1, 0, 0], [0, -1, 0]], [[-1, 0, 0], [0, -1, 0]], [[0, 1, 0], [0, 0, 1]], [[0, -1, 0], [0, 0, -1]], [[0, 0, 1], [0, -1, 0]], [[0, 0, -1], [0, -1, 0]]];
  var SH = 256, MOON = 1024;

  // ------------------------------------------------------------------ start
  DH.start = function (cfg) {
    var canvas = typeof cfg.canvas === 'string' ? document.getElementById(cfg.canvas) : (cfg.canvas || document.querySelector('canvas'));
    canvas.setAttribute('data-dh', '');
    injectCSS();
    var els = [].slice.call(canvas.querySelectorAll(':scope > [data-k]')), byKey = {};
    els.forEach(function (e) { byKey[e.dataset.k] = e; if (!e.hasAttribute('drawable')) e.setAttribute('drawable', ''); });
    var sizeOf = function (k) { var e = byKey[k]; if (!e) { console.warn('dollhouse: no element with data-k="' + k + '"'); return [100, 40]; } return [Math.max(1, e.offsetWidth), Math.max(1, e.offsetHeight)]; };
    var W = new World(cfg, sizeOf);
    if (!HIC.supported('webgl')) return fallback(canvas, cfg, W, sizeOf);
    return run(canvas, cfg, W, byKey);
  };

  // the plain page: rooms become sections with their controls, in the same HTML
  function fallback(canvas, cfg, W) {
    try { W.build(); } catch (e) { console.warn(e); }
    var order = {};
    W.panelDefs.forEach(function (p) { if (!order[p.zone.id]) order[p.zone.id] = []; order[p.zone.id].push(p.key); });
    var kids = [].slice.call(canvas.children), placed = new Set();
    var head = document.createElement('h1'); head.textContent = cfg.title || document.title; canvas.insertBefore(head, canvas.firstChild);
    W.rooms.concat([{ id: 'ext', name: cfg.outsideName || 'Outside' }]).forEach(function (R) {
      var keys = order[R.id] || []; if (!keys.length) return;
      var sec = document.createElement('section'); sec.className = 'dh-room';
      var h = document.createElement('h2'); h.textContent = R.name || R.id; sec.appendChild(h);
      keys.forEach(function (k) { var e = kids.filter(function (x) { return x.dataset.k === k; })[0]; if (e) { sec.appendChild(e); placed.add(e); } });
      canvas.appendChild(sec);
    });
    kids.forEach(function (e) { if (!placed.has(e) && e.parentNode === canvas) canvas.appendChild(e); });
    var wrap = HIC.fallback(canvas, { note: cfg.fallbackNote });
    document.documentElement.classList.add('dh-fallback');   // the page scrolls again
    wrap.classList.add('dh-plainpage');
    var ui = document.getElementById('dh-ui'); if (ui) ui.remove();
    if (cfg.ready) try { cfg.ready(plainApi(byKeyFrom(wrap))); } catch (e) { console.warn(e); }
    return null;
  }
  function byKeyFrom(rootEl) { var o = {}; [].forEach.call(rootEl.querySelectorAll('[data-k]'), function (e) { o[e.dataset.k] = e; }); return o; }
  // the same binding API without a scene, so a page's ready() still wires its controls on the plain page
  function plainApi(byKey) {
    var noop = function () { return api; }, sp = function (v) { return { v: v, target: v, to: function (x) { this.v = this.target = x; } }; };
    var api = { plain: true, el: function (k) { return byKey[k]; }, field: function (k) { return fieldOf(byKey[k]); }, on: function (k, ev, fn) { var e = fieldOf(byKey[k]) || byKey[k]; if (e) e.addEventListener(ev, function (x) { fn(valueOf(e), x); }); return api; },
      light: function () { var L = { set: function () { return L; }, power: function () { return L; }, color: function () { return L; }, level: 0 }; return L; }, setLight: noop, tint: noop, flame: noop, sound: null,
      advance: noop, setPlain: noop, lensTo: noop, view: noop, spring: sp, animate: noop, mover: function () { return { set: noop }; }, touch: noop, sfx: noop, time: function () { return 0; } };
    return api;
  }
  var FIELD = 'input,select,textarea,output,[contenteditable]:not([contenteditable=false]),[data-sync]';
  function fieldOf(e) { if (!e) return null; return e.matches(FIELD) ? e : e.querySelector(FIELD); }
  function valueOf(e) { if (!e) return null; if (e.type === 'checkbox' || e.type === 'radio') return e.checked; if (e.type === 'range' || e.type === 'number') return +e.value; if ('value' in e && e.tagName !== 'OUTPUT') return e.value; return e.textContent; }
  DH.valueOf = valueOf;

  var cssDone = false;
  function injectCSS() {
    if (cssDone) return; cssDone = true;
    var s = document.createElement('style');
    s.textContent = [
      'canvas[data-dh] > * { position: absolute; left: 0; top: 0; margin: 0; box-sizing: border-box; }',
      '.dh-twin { all: initial; display: block; box-sizing: border-box; width: max-content; max-width: 300px; padding: 0 8px 8px; font: 15px/1.35 system-ui, sans-serif; color: #111; background: #fffefa; border: 1.5px solid #2f55c9; border-radius: 4px; color-scheme: light; }',
      '.dh-twin .dh-tag { display: block; margin: 0 -8px 7px; padding: 2px 8px 3px; font: 600 12px/1.4 ui-monospace, Menlo, Consolas, monospace; color: #fff; background: #2f55c9; white-space: nowrap; }',
      '.dh-twin input[type=range] { width: 180px; } .dh-twin textarea { width: 220px; }',
      '#dh-ui { position: fixed; left: 12px; bottom: 12px; display: flex; flex-wrap: wrap; gap: 6px; z-index: 3; max-width: calc(100vw - 24px); }',
      '#dh-ui button { font: 600 12px/1 system-ui, sans-serif; letter-spacing: .06em; color: var(--dh-ui-ink, #f4ecda); background: var(--dh-ui-bg, rgba(14, 16, 26, .78)); border: 1px solid var(--dh-ui-line, rgba(230, 190, 110, .55)); border-radius: 999px; padding: 10px 14px; cursor: pointer; }',
      '#dh-ui button[aria-pressed="true"] { background: var(--dh-ui-ink, #f4ecda); color: #15161d; }',
      '#dh-ui button:focus-visible { outline: 2px solid #ffd27a; outline-offset: 2px; }',
      'html.dh-fallback, html.dh-fallback body { overflow: auto !important; height: auto !important; }',
      '.dh-plainpage { max-width: 760px; margin: 0 auto; padding: 0 16px 40px; font: 16px/1.5 system-ui, sans-serif; }',
      '.dh-plainpage [data-k] { position: static !important; transform: none !important; margin: 8px 0; max-width: 100%; }',
      '.dh-plainpage .dh-room { border-top: 1px solid #ccc; padding: 6px 0 10px; }',
      '.dh-plainpage input[type=range] { writing-mode: horizontal-tb !important; direction: ltr !important; width: min(260px, 100%) !important; height: auto !important; }'].join('\n');
    document.head.appendChild(s);
  }

  function run(canvas, cfg, W, byKey) {
    var look = Object.assign({ exposure: 1.0, bloom: 0.55, ao: 0.85, grain: 0.025, moon: '#7d93d8', moonPower: 0.55, sky: '#1a2240', paper: '#f6f3ea', ink: '#1d2a4a', rim: '#d4a54a' }, cfg.look || {});
    var sky = Object.assign({ top: '#05070f', mid: '#0e1530', low: '#1d2346', glow: '#26182a', city: '#0b0f1f', ground: '#06070c', stars: 1, clouds: 0.5, skyline: 1, moon: [-0.72, 0.8, 0.85] }, cfg.sky || {});
    // listen for paints before the stage does, so the changed elements are known when the stage calls back
    var changed = new Set(), allChanged = true;
    canvas.addEventListener('paint', function (e) { if (e.changedElements) [].forEach.call(e.changedElements, function (x) { changed.add(x); }); else allChanged = true; });
    var S = HIC.stage(canvas, { gl: { antialias: false, depth: true, alpha: false }, maxDpr: 2 }), gl = S.gl;
    var api = {}, probe = window.__hic;
    var q = parseFloat(HIC.param('q')) || 1, rs = q, still = HIC.still, calm = HIC.calm || still !== null;
    var nointro = HIC.param('nointro') !== null || calm || cfg.intro === false;
    var hdr = !!gl.getExtension('EXT_color_buffer_float');

    W.build();
    W.zones.forEach(function (Z) { Z.lights.forEach(function (L) { L.level = L.on; }); });
    // ---- programs and static buffers
    var P = {
      lit: HIC.gl.program(gl, VS_LIT, FS_LIT), depth: HIC.gl.program(gl, VS_DEPTH, FS_DEPTH), sky: HIC.gl.program(gl, null, FS_SKY),
      ao: HIC.gl.program(gl, null, FS_AO), blur: HIC.gl.program(gl, null, FS_BLUR), down: HIC.gl.program(gl, null, FS_DOWN), up: HIC.gl.program(gl, null, FS_UP),
      tone: HIC.gl.program(gl, null, FS_TONE), fin: HIC.gl.program(gl, null, FS_FINAL), plain: HIC.gl.program(gl, VS_PLAIN, FS_PLAIN)
    };
    W.zones.forEach(function (Z) {
      Z.vC = makeVAO(gl, Z.b.cast); Z.vF = makeVAO(gl, Z.b.free);
      Z.movers.forEach(function (m) { m.vC = makeVAO(gl, m.cast); m.vF = makeVAO(gl, m.free); });
      Z.lights.forEach(function (L) { if (L.shadow) { L.cube = gl.createTexture(); gl.bindTexture(gl.TEXTURE_CUBE_MAP, L.cube); gl.texStorage2D(gl.TEXTURE_CUBE_MAP, 1, gl.DEPTH_COMPONENT24, SH, SH); params(gl, gl.TEXTURE_CUBE_MAP, gl.LINEAR, true); } });
    });
    var dummyCube = gl.createTexture(); gl.bindTexture(gl.TEXTURE_CUBE_MAP, dummyCube); gl.texStorage2D(gl.TEXTURE_CUBE_MAP, 1, gl.DEPTH_COMPONENT24, 4, 4); params(gl, gl.TEXTURE_CUBE_MAP, gl.LINEAR, true);
    var shFb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, shFb); for (var f = 0; f < 6; f++) { gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, dummyCube, 0); gl.clear(gl.DEPTH_BUFFER_BIT); }
    var moonTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, moonTex); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, MOON, MOON); params(gl, gl.TEXTURE_2D, gl.LINEAR, true);
    var quadMesh = new Mesh(), white = mat('#fff');
    [[-.5, -.5, 0], [.5, -.5, 0], [.5, .5, 0], [-.5, -.5, 0], [.5, .5, 0], [-.5, .5, 0]].forEach(function (p) { quadMesh.push(p, [0, 0, 1], white, 0); });
    var quad = makeVAO(gl, quadMesh);
    var G = W.G, out = W.outer, bnd = W.bounds;
    // the whole diorama, for the home view and the moon's shadow
    var box = { x0: bnd[0], x1: bnd[2], y0: bnd[1], y1: Math.max(W.roofTop, G.top) + 0.4 };
    var md = HIC.vec.norm(sky.moonDir || [-0.42, 0.5, 0.76]), mc = [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, -G.D / 2], mr = Math.max(box.x1 - box.x0, box.y1 - box.y0) * 0.6;
    var moonVP = M4.mul(ortho(-mr, mr, -mr, mr, 1, 120), M4.lookAt([mc[0] + md[0] * 50, mc[1] + md[1] * 50, mc[2] + md[2] * 50], mc, [0, 1, 0]));
    var moonDirty = true;

    // ---- panels: the live controls, their twins, textures
    var panels = W.panelDefs.map(function (d) {
      var el = byKey[d.key]; if (!el) return null;
      var p = Object.assign({}, d, { el: el, tex: HIC.gl.texture(gl, { mips: true }), ttex: HIC.gl.texture(gl, { mips: true }), hov: 0, hovT: 0, emitNow: null });
      if (d.o.fit) fitPanel(p);
      p.c = tp(p.M, [0, 0, 0]);
      return p;
    }).filter(Boolean);
    var byEl = new Map(), pByKey = {};
    panels.forEach(function (p) { p.twin = makeTwin(p.el); canvas.appendChild(p.twin); byEl.set(p.el, p); byEl.set(p.twin, p); pByKey[p.key] = p; p.cw = p.el.offsetWidth; p.ch = p.el.offsetHeight; });
    els_unused(byKey, pByKey);
    // a vertical range in a shaft: size the rectangle so its thumb travels exactly between the stops
    function fitPanel(p) {
      var fit = p.o.fit, e = p.el, cw = e.offsetWidth, ch = e.offsetHeight, th = +(e.dataset.thumb || 60), span = fit.y1 - fit.y0;
      var w = span * cw / Math.max(1, ch - th), h = w * ch / cw;
      p.w = w; p.h = h; p.M = M4.mul(p.base, M4.mul(xform({ at: [p.o.at[0], (fit.y0 + fit.y1) / 2, p.o.at[2]] }), M4.scale(w, h, 1)));
    }
    layoutTwins();

    // ---- frame targets
    var T = {}, tw = 0, th = 0;
    function targets() {
      var w = Math.max(2, Math.round(canvas.width * rs)), h = Math.max(2, Math.round(canvas.height * rs));
      if (w === tw && h === th && T.scene) return;
      tw = w; th = h;
      T.col = colorTex(gl, w, h, hdr); T.nrm = colorTex(gl, w, h, false); T.dep = depthTex(gl, w, h);
      T.scene = fbo(gl, [T.col, T.nrm], T.dep);
      var hw = Math.max(2, w >> 1), hh = Math.max(2, h >> 1);
      T.ao = colorTex(gl, hw, hh, false); T.aoF = fbo(gl, [T.ao]); T.ao2 = colorTex(gl, hw, hh, false); T.ao2F = fbo(gl, [T.ao2]);
      T.bl = []; var bw = w, bh = h; for (var i = 0; i < 5; i++) { bw = Math.max(2, bw >> 1); bh = Math.max(2, bh >> 1); var t = colorTex(gl, bw, bh, hdr); T.bl.push({ t: t, f: fbo(gl, [t]) }); }
      T.ldr = colorTex(gl, w, h, false); T.ldrF = fbo(gl, [T.ldr]);
      T.pl = colorTex(gl, canvas.width, canvas.height, false); T.plF = fbo(gl, [T.pl]);
      T.plL = colorTex(gl, canvas.width, canvas.height, false); T.plLF = fbo(gl, [T.plL]);
      T.white = T.white || (function () { var t = colorTex(gl, 2, 2, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255])); return t; })();
      sceneDirty = plainDirty = true;
    }

    // ---- camera: a window on the plane z = 0, seen from in front and a little above (an off-axis frustum keeps the cut
    // face square to the screen while the floors and side walls of the rooms show in perspective)
    var cam = { cx: 0, cy: 0, hw: 10 }, camT = { cx: 0, cy: 0, hw: 10 }, home = null, CM = null;
    function homeView() {
      var a = S.W / S.H, cx = (box.x0 + box.x1) / 2, w = (box.x1 - box.x0) / 2, h = (box.y1 - box.y0) / 2;
      var padB = 70 / S.H; // room for the buttons at the bottom
      var hw = Math.max(w * 1.04, h * 1.08 * a / (1 - padB));
      var hh = hw / a, cy = (box.y0 + box.y1) / 2 - hh * padB * 0.9;
      return { cx: cx, cy: cy, hw: hw };
    }
    function camMats(c) {
      var a = S.W / S.H, hh = c.hw / a, ez = c.hw * 3.1 + 4, ex = c.cx * 0.9, ey = c.cy + hh * 0.55, n = ez * 0.4, f = ez + 40, k = n / ez;
      var proj = frustum((c.cx - c.hw - ex) * k, (c.cx + c.hw - ex) * k, (c.cy - hh - ey) * k, (c.cy + hh - ey) * k, n, f);
      var view = M4.translate(-ex, -ey, -ez);
      return { proj: proj, view: view, vp: M4.mul(proj, view), eye: [ex, ey, ez], n: n, f: f, hh: hh };
    }
    function clampCam(c) {
      c.hw = HIC.clamp(c.hw, 1.6, home.hw);
      var a = S.W / S.H, mx = Math.max(0, home.hw - c.hw), my = Math.max(0, home.hw / a - c.hw / a);
      c.cx = HIC.clamp(c.cx, home.cx - mx, home.cx + mx); c.cy = HIC.clamp(c.cy, home.cy - my, home.cy + my);
    }
    function fitRect(x0, y0, x1, y1, pad) {
      var a = S.W / S.H, hw = Math.max((x1 - x0) / 2 * (pad || 1.15), (y1 - y0) / 2 * (pad || 1.15) * a);
      return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 - hw / a * 0.06, hw: hw };
    }
    // world point → canvas CSS px
    function project(vp, p) { var c = tp4(vp, p); return [(c[0] / c[3] * 0.5 + 0.5) * S.W, (0.5 - c[1] / c[3] * 0.5) * S.H, c[3]]; }

    // ---- lens
    var lensCfg = cfg.lens || {}, lens = { x: 0, y: 0, r: 100, tx: 0, ty: 0, vis: lensCfg.off ? 0 : 1, visT: lensCfg.off ? 0 : 1, hover: 0, hoverT: 0, mag: lensCfg.mag || 1.8 };
    var lensParam = HIC.param('lens'); if (lensParam === 'off') lens.vis = lens.visT = 0;
    function lensSize() { return HIC.clamp(Math.min(S.W, S.H) * 0.13, 58, 120); }
    function lensRest() { return [S.W - lensSize() - 36, S.H - lensSize() - (S.W < 600 ? 120 : 70)]; }
    function lensOver(key) { var p = pByKey[key]; if (!p || !p.TM) return null; var c = project(CM.vp, tp(p.TM, [0, 0, 0])); return c; }
    function lensVP() {
      var k = lens.mag, cx = lens.x / S.W * 2 - 1, cy = 1 - lens.y / S.H * 2, L = M4.ident();
      L[0] = k; L[5] = k; L[12] = cx * (1 - k); L[13] = cy * (1 - k);
      return M4.mul(L, CM.vp);
    }
    function lensPart(x, y) {
      var R = lens.r, rw = Math.max(5, R * 0.09), dx = x - lens.x, dy = y - lens.y, d = Math.hypot(dx, dy);
      var hd = HIC.vec.norm([0.72, 0.69, 0]), h0 = [lens.x + hd[0] * (R + rw * 0.5), lens.y + hd[1] * (R + rw * 0.5)], hl = R * 0.9 + 24, hw = Math.max(R * 0.085, 6);
      var t = HIC.clamp(((x - h0[0]) * hd[0] + (y - h0[1]) * hd[1]) / hl, 0, 1), dh = Math.hypot(x - h0[0] - hd[0] * hl * t, y - h0[1] - hd[1] * hl * t);
      if (lens.vis < 0.5) return '';
      if (Math.abs(d - R - rw / 2) < rw / 2 + 4 || dh < hw + 4) return 'rim';
      return d < R ? 'glass' : '';
    }

    // ---- state
    var plainT = HIC.param('plain') !== null ? 1 : 0, plain = plainT, viaLens = false, sceneDirty = true, plainDirty = true, placeDirty = true, finalDirty = true;
    var hovered = null, ptr = { x: -1, y: -1, in: false }, drag = null, time = still !== null ? still : 0, cost = 0, idleAt = 0, renders = 0;
    var springs = [], animators = [], frozenSet = false;
    var sound = root.DHSound ? root.DHSound.create(cfg.sound || {}) : null;

    // ---- the twins: the same control with no styles, kept in step both ways
    function makeTwin(el) {
      var c = el.cloneNode(true); scrub(c);
      var w = document.createElement('div'); w.className = 'dh-twin'; w.setAttribute('drawable', ''); w.setAttribute('aria-hidden', 'true');
      var ctl = fieldOf(el) || el.querySelector('button') || el, tag = '<' + ctl.tagName.toLowerCase();
      if (ctl.type && ctl.tagName === 'INPUT') tag += ' type="' + ctl.type + '"';
      if (ctl.isContentEditable || ctl.hasAttribute('contenteditable')) tag += ' contenteditable';
      tag += '>';
      var cap = document.createElement('code'); cap.className = 'dh-tag'; cap.textContent = el.dataset.tag || tag; w.appendChild(cap); w.appendChild(c);
      [].forEach.call(w.querySelectorAll('input,select,textarea,button,[contenteditable],a'), function (x) { x.tabIndex = -1; });
      var A = [].slice.call(el.querySelectorAll(FIELD)), Bf = [].slice.call(c.querySelectorAll(FIELD));
      if (el.matches(FIELD)) { A.unshift(el); Bf.unshift(c); }
      A.forEach(function (a, i) {
        var b = Bf[i]; if (!b) return; copy(a, b);
        ['input', 'change'].forEach(function (ev) {
          a.addEventListener(ev, function () { copy(a, b); });
          b.addEventListener(ev, function () { copy(b, a); a.dispatchEvent(new Event(ev, { bubbles: true })); });
        });
        if (a.tagName === 'OUTPUT' || a.isContentEditable || a.hasAttribute('data-sync')) new MutationObserver(function () { copy(a, b); }).observe(a, { childList: true, characterData: true, subtree: true, attributes: true });
      });
      var ba = [].slice.call(el.querySelectorAll('button')), bb = [].slice.call(c.querySelectorAll('button'));
      if (el.tagName === 'BUTTON') { ba.unshift(el); bb.unshift(c); }
      bb.forEach(function (b, i) { b.addEventListener('click', function (e) { e.preventDefault(); if (ba[i]) ba[i].click(); }); });
      w._pairs = [A, Bf];
      return w;
    }
    function scrub(n) {
      [].slice.call(n.attributes).forEach(function (a) {
        var k = a.name; if (k === 'class' || k === 'style' || k === 'id' || k === 'drawable' || k === 'for' || k === 'spellcheck' || (k.indexOf('data-') === 0 && k !== 'data-sync')) n.removeAttribute(k);
        else if (k === 'name') n.setAttribute('name', a.value + '-twin');
      });
      [].slice.call(n.children).forEach(function (c) { if (c.hasAttribute('data-twin-skip') || c.getAttribute('aria-hidden') === 'true') c.remove(); else scrub(c); });
    }
    function copy(a, b) {
      if (a.tagName === 'INPUT' && (a.type === 'checkbox' || a.type === 'radio')) { if (b.checked !== a.checked) b.checked = a.checked; }
      else if (a.tagName === 'INPUT' || a.tagName === 'SELECT' || a.tagName === 'TEXTAREA') { if (b.value !== a.value) b.value = a.value; }
      else if (b.textContent !== a.textContent) b.textContent = a.textContent;
    }
    function touch(key) { var p = pByKey[key]; if (!p) return; var pr = p.twin._pairs; pr[0].forEach(function (a, i) { if (pr[1][i]) copy(a, pr[1][i]); }); }
    function els_unused(byKey, pk) { for (var k in byKey) if (!pk[k]) { console.warn('dollhouse: element data-k="' + k + '" has no panel; it stays hidden'); } }
    // where the twins sit: on the front plane over their object, then pushed apart inside the room until none overlap
    function layoutTwins() {
      var PPM = cfg.twinScale || 95, eye = [0, G.top * 0.6, 40], items = [];
      panels.forEach(function (p) {
        var c = p.c, k = eye[2] / (eye[2] - c[2]), w = p.twin.offsetWidth / PPM, h = p.twin.offsetHeight / PPM;
        var R = p.zone.room || null;
        items.push({ p: p, R: R, ax: eye[0] + (c[0] - eye[0]) * k, ay: eye[1] + (c[1] - eye[1]) * k, w: w, h: h });
      });
      items.forEach(function (it) { it.x = it.ax; it.y = it.ay; });
      var clampIt = function (it) { var R = it.R; if (!R) return; if (R.w > it.w) it.x = HIC.clamp(it.x, R.x0 + it.w / 2 + 0.05, R.x1 - it.w / 2 - 0.05); if (R.h > it.h) it.y = HIC.clamp(it.y, R.y0 + it.h / 2 + 0.05, R.y1 - it.h / 2 - 0.05); };
      for (var pass = 0; pass < 8; pass++) {
        items.forEach(clampIt);
        for (var n = 0; n < 120; n++) {
          var moved = false;
          for (var i = 0; i < items.length; i++) for (var j = i + 1; j < items.length; j++) {
            var a = items[i], b = items[j]; if (a.p.zone !== b.p.zone) continue;
            var ox = (a.w + b.w) / 2 + 0.06 - Math.abs(a.x - b.x), oy = (a.h + b.h) / 2 + 0.06 - Math.abs(a.y - b.y); if (ox <= 0 || oy <= 0) continue;
            moved = true;
            if (ox < oy) { var dx = (a.x <= b.x ? -1 : 1) * ox / 2; a.x += dx; b.x -= dx; } else { var dy = (a.y <= b.y ? -1 : 1) * oy / 2; a.y += dy; b.y -= dy; }
          }
          items.forEach(clampIt); if (!moved) break;
        }
        var tight = items.some(function (a) { return items.some(function (b) { return a !== b && a.p.zone === b.p.zone && (a.w + b.w) / 2 - Math.abs(a.x - b.x) > 0.01 && (a.h + b.h) / 2 - Math.abs(a.y - b.y) > 0.01; }); });
        if (!tight) break;
        items.forEach(function (it) { if (it.R) { it.w *= 0.9; it.h *= 0.9; } it.x = it.ax; it.y = it.ay; });
      }
      items.forEach(function (it) { it.p.TM = M4.mul(M4.translate(it.x, it.y, 0.08), M4.scale(it.w, it.h, 1)); });
      placeDirty = plainDirty = true;
    }

    // ---- hit testing: each drawn rectangle's homography, element px → canvas px
    function homog(M, vp, cw, ch) {
      var E = new Float32Array([1 / cw, 0, 0, 0, 0, -1 / ch, 0, 0, 0, 0, 1, 0, -0.5, 0.5, 0, 1]);
      var Sx = new Float32Array([S.W / 2, 0, 0, 0, 0, -S.H / 2, 0, 0, 0, 0, 1, 0, S.W / 2, S.H / 2, 0, 1]);
      var F = M4.mul(Sx, M4.mul(vp, M4.mul(M, E)));
      F[2] = 0; F[6] = 0; F[10] = 1; F[14] = 0; F[8] = 0; F[9] = 0; F[11] = 0;
      return F;
    }
    function apply(F, x, y) { var w = F[3] * x + F[7] * y + F[15]; return [(F[0] * x + F[4] * y + F[12]) / w, (F[1] * x + F[5] * y + F[13]) / w]; }
    function placeAll() {
      if (!CM) return;
      var lvp = viaLens ? lensVP() : null;
      panels.forEach(function (p) {
        var cw = p.el.offsetWidth || 1, ch = p.el.offsetHeight || 1, tcw = p.twin.offsetWidth || 1, tch = p.twin.offsetHeight || 1;
        if (plainT > 0.5) { p.F = null; S.place(p.el, null); p.TF = homog(p.TM, CM.vp, tcw, tch); S.place(p.twin, Array.from(p.TF)); }
        else if (viaLens) { p.F = null; S.place(p.el, null); p.TF = homog(p.TM, lvp, tcw, tch); S.place(p.twin, Array.from(p.TF)); }
        else { p.TF = null; S.place(p.twin, null); p.F = homog(p.M, CM.vp, cw, ch); S.place(p.el, Array.from(p.F)); }
      });
      placeDirty = false;
    }

    // ---- uploads: only the elements whose pixels changed
    var ready = false;
    S.onPaint(function () {
      var list = allChanged ? panels.reduce(function (a, p) { a.push(p.el, p.twin); return a; }, []) : Array.from(changed);
      allChanged = false; changed.clear();
      list.forEach(function (el) {
        var p = byEl.get(el); if (!p) return;
        if (el === p.el) {
          var sc = HIC.clamp(p.w * (cfg.texPerMetre || 420) / Math.max(1, el.offsetWidth), 1, 3);
          if (S.upload(el, p.tex, el.offsetWidth * sc, el.offsetHeight * sc)) sceneDirty = true;
          if (el.offsetHeight !== p.ch || el.offsetWidth !== p.cw) { p.cw = el.offsetWidth; p.ch = el.offsetHeight; if (!p.o.fit) { p.h = p.w * p.ch / p.cw; p.M = M4.mul(p.base, M4.mul(xform({ at: p.o.at, rx: p.o.rx, ry: p.o.ry, rz: p.o.rz }), M4.scale(p.w, p.h, 1))); } placeDirty = true; }
        } else {
          if (S.upload(el, p.ttex, el.offsetWidth * 2, el.offsetHeight * 2)) plainDirty = true;
          if (p.tw0 && (Math.abs(p.tw0 - el.offsetWidth) > 2 || Math.abs(p.th0 - el.offsetHeight) > 2)) { layoutTwins(); }
          p.tw0 = el.offsetWidth; p.th0 = el.offsetHeight;
        }
      });
      finalDirty = true;
      if (!ready && panels.length) {
        ready = true;
        S.probe(panels[0].el, panels[0].el).then(function (mode) { placeDirty = true; placeAll(); S.ready({ mode: mode, panels: panels.length, rooms: W.rooms.length }); });
      }
    });
    if (!panels.length) S.ready({ panels: 0 });

    // ---- drawing
    var lvl3 = new Float32Array(3), px1 = new Uint8Array(4);
    function zoneUniforms(u, Z) {
      var lp = new Float32Array(9), lc = new Float32Array(9), lr = new Float32Array(9), amb = [0, 0, 0], slot = 0;
      for (var i = 0; i < 3; i++) {
        var L = Z.lights[i]; lvl3[i] = 1;
        if (!L) { lr[i * 3] = 1; lr[i * 3 + 1] = -1; continue; }
        var k = L.level * L.power * (L.flicker ? 1 - L.flicker * (0.5 + 0.5 * Math.sin(time * 13.1 + i * 2) * Math.sin(time * 7.3 + i)) : 1);
        lvl3[i] = 0.04 + 0.96 * L.level * (L.flicker ? k / Math.max(0.01, L.level * L.power) : 1) * Math.min(1.6, L.power / (L.power0 || (L.power0 = L.power)));
        lp.set(L.p, i * 3); lc.set([L.col[0] * k, L.col[1] * k, L.col[2] * k], i * 3);
        lr[i * 3] = L.range; lr[i * 3 + 1] = L.shadow ? slot++ : -1;
        for (var j = 0; j < 3; j++) amb[j] += L.col[j] * k * 0.035 * Z.bounce;
      }
      gl.uniform3fv(u.uLP, lp); gl.uniform3fv(u.uLC, lc); gl.uniform3fv(u.uLR, lr); gl.uniform3fv(u.uLvl, lvl3);
      gl.uniform3fv(u.uAmb, amb);
      var mk = Z.moonK * look.moonPower, mcol = lin(look.moon); gl.uniform3f(u.uMoonC, mcol[0] * mk, mcol[1] * mk, mcol[2] * mk);
      var sk = lin(look.sky); var skk = Z.id === 'ext' ? 0.25 : 0.06; gl.uniform3f(u.uSkyA, sk[0] * skk, sk[1] * skk, sk[2] * skk);
      gl.uniform3fv(u.uDyn0, Z.dyn[0]); gl.uniform3fv(u.uDyn1, Z.dyn[1]);
      var s = 0; Z.lights.forEach(function (L) { if (L.shadow) { gl.activeTexture(gl.TEXTURE1 + s); gl.bindTexture(gl.TEXTURE_CUBE_MAP, L.cube); s++; } });
      for (; s < 2; s++) { gl.activeTexture(gl.TEXTURE1 + s); gl.bindTexture(gl.TEXTURE_CUBE_MAP, dummyCube); }
    }
    function drawZone(Z, prog, depthOnly) {
      var u = prog.u; gl.uniformMatrix4fv(u.uModel, false, IDENT);
      gl.bindVertexArray(Z.vC.vao); gl.drawArrays(gl.TRIANGLES, 0, Z.vC.n);
      if (!depthOnly && Z.vF.n) { gl.bindVertexArray(Z.vF.vao); gl.drawArrays(gl.TRIANGLES, 0, Z.vF.n); }
      Z.movers.forEach(function (m) {
        if (m.hidden || (depthOnly && !m.shadow)) return; gl.uniformMatrix4fv(u.uModel, false, m.m);
        if (m.vC.n) { gl.bindVertexArray(m.vC.vao); gl.drawArrays(gl.TRIANGLES, 0, m.vC.n); }
        if (!depthOnly && m.vF.n) { gl.bindVertexArray(m.vF.vao); gl.drawArrays(gl.TRIANGLES, 0, m.vF.n); }
      });
    }
    var IDENT = M4.ident();
    function shadows() {
      var any = false, proj = M4.perspective(Math.PI / 2, 1, 0.05, 14);
      gl.useProgram(P.depth.p); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, shFb); gl.colorMask(false, false, false, false); gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
      W.zones.forEach(function (Z) {
        Z.lights.forEach(function (L) {
          if (!L.shadow || !(L.dirty || Z.shadowDirty)) return; L.dirty = false; any = true;
          gl.viewport(0, 0, SH, SH);
          for (var f = 0; f < 6; f++) {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, L.cube, 0); gl.clear(gl.DEPTH_BUFFER_BIT);
            var d = CUBE[f], vp = M4.mul(proj, M4.lookAt(L.p, [L.p[0] + d[0][0], L.p[1] + d[0][1], L.p[2] + d[0][2]], d[1]));
            gl.uniformMatrix4fv(P.depth.u.uVP, false, vp); drawZone(Z, P.depth, true);
          }
        });
        Z.shadowDirty = false;
      });
      if (moonDirty) {
        moonDirty = false; any = true;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, moonTex, 0); gl.viewport(0, 0, MOON, MOON); gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.uniformMatrix4fv(P.depth.u.uVP, false, moonVP); W.zones.forEach(function (Z) { drawZone(Z, P.depth, true); });
      }
      gl.disable(gl.POLYGON_OFFSET_FILL); gl.colorMask(true, true, true, true);
      return any;
    }
    function fs(prog, target, w, h, texs, set) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target); gl.viewport(0, 0, w, h); prog.use();
      HIC.gl.bind(gl, prog, texs); if (set) set(prog.u); HIC.gl.fullscreen(gl);
    }
    function renderScene() {
      var t0 = performance.now();
      targets(); shadows();
      CM = camMats(cam);
      gl.bindFramebuffer(gl.FRAMEBUFFER, T.scene); gl.viewport(0, 0, tw, th); gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      // sky (moves more slowly than the building)
      gl.disable(gl.DEPTH_TEST); gl.depthMask(false); P.sky.use(); var su = P.sky.u, a = S.W / S.H;
      var sw = cam.hw * 0.55 + home.hw * 0.45, shh = sw / a;
      gl.uniform4f(su.uWin, cam.cx * 0.45 + home.cx * 0.55, cam.cy * 0.45 + home.cy * 0.55, sw, shh);
      var mx = home.cx + sky.moon[0] * home.hw, my = home.cy + sky.moon[1] * home.hw / a;
      gl.uniform4f(su.uMoon, mx, my, sky.moon[2] * Math.min(1.3, home.hw / 10), sky.moonLight == null ? 1 : sky.moonLight);
      ['top', 'mid', 'low', 'glow', 'city'].forEach(function (k) { var c = lin(sky[k]); gl.uniform3f(su['u' + k[0].toUpperCase() + k.slice(1)], c[0], c[1], c[2]); });
      gl.uniform4f(su.uOpt, sky.stars, sky.clouds, sky.skyline, 0); gl.uniform1f(su.uTime, calm ? 0 : time); gl.uniform1f(su.uY0, box.y0); gl.uniform1f(su.uYG, -W.baseH); var gc = lin(sky.ground); gl.uniform3f(su.uGround, gc[0], gc[1], gc[2]); gl.uniform1f(su.uY1, home.cy + home.hw / a);
      HIC.gl.fullscreen(gl);
      // the building, zone by zone
      gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);
      P.lit.use(); var u = P.lit.u;
      gl.uniformMatrix4fv(u.uVP, false, CM.vp); gl.uniformMatrix4fv(u.uView, false, CM.view); gl.uniform3fv(u.uEye, CM.eye);
      gl.uniformMatrix4fv(u.uMoonVP, false, moonVP); gl.uniform3fv(u.uMoonDir, md); gl.uniform1f(u.uTime, time);
      gl.uniform1i(u.uTex, 0); gl.uniform1i(u.uSh0, 1); gl.uniform1i(u.uSh1, 2); gl.uniform1i(u.uMoonSh, 3);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, moonTex);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.white);
      gl.uniform1i(u.uMode, 0);
      W.zones.forEach(function (Z) { zoneUniforms(u, Z); drawZone(Z, P.lit, false); });
      // the live controls, blended over their walls; then flames (additive)
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.NONE]); gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-2, -2);
      gl.uniform1i(u.uMode, 1); gl.bindVertexArray(quad.vao);
      var lastZ = null;
      panels.forEach(function (p) {
        if (!p.tex.w) return;
        if (p.zone !== lastZ) { lastZ = p.zone; zoneUniforms(u, p.zone); }
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, p.tex);
        var e = p.emitNow != null ? p.emitNow : p.emit; gl.uniform1f(u.uEmit, p.unlit ? e * (1 + 0.3 * p.hov) : e + 0.22 * p.hov);
        gl.uniform1f(u.uUnlit, p.unlit ? 1 : 0); gl.uniform1f(u.uRough, p.rough);
        gl.uniformMatrix4fv(u.uModel, false, p.M); gl.drawArrays(gl.TRIANGLES, 0, 6);
      });
      if (W.flames.length) {
        gl.uniform1i(u.uMode, 2); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ZERO, gl.ONE);
        W.flames.forEach(function (fl) {
          var L = fl.light && W.lights[fl.light], lv = L ? L.level : 1; if (lv < 0.02) return;
          gl.uniform1f(u.uEmit, fl.k * lv); gl.uniform1f(u.uSeed, fl.seed); gl.uniformMatrix4fv(u.uModel, false, fl.M); gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
      }
      gl.disable(gl.POLYGON_OFFSET_FILL); gl.disable(gl.BLEND); gl.depthMask(true); gl.disable(gl.DEPTH_TEST);
      // ambient occlusion
      var invP = M4.invert(CM.proj);
      if (look.ao > 0) {
        fs(P.ao, T.aoF, T.ao.w, T.ao.h, { uDepth: T.dep, uNrm: T.nrm }, function (u) { gl.uniformMatrix4fv(u.uProj, false, CM.proj); gl.uniformMatrix4fv(u.uInv, false, invP); gl.uniform1f(u.uRad, 0.35); });
        fs(P.blur, T.ao2F, T.ao.w, T.ao.h, { uTex: T.ao, uDepth: T.dep }, function (u) { gl.uniform2f(u.uPx, 1 / T.ao.w, 1 / T.ao.h); });
      }
      // bloom: a chain of halvings with a soft threshold, added back up
      var src = T.col;
      T.bl.forEach(function (b, i) { fs(P.down, b.f, b.t.w, b.t.h, { uTex: src }, function (u) { gl.uniform2f(u.uPx, 1 / src.w, 1 / src.h); gl.uniform1f(u.uKnee, i === 0 ? 1.0 : 0); }); src = b.t; });
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      for (var i = T.bl.length - 2; i >= 0; i--) { var s2 = T.bl[i + 1].t; fs(P.up, T.bl[i].f, T.bl[i].t.w, T.bl[i].t.h, { uTex: s2 }, function (u) { gl.uniform2f(u.uPx, 1 / s2.w, 1 / s2.h); }); }
      gl.disable(gl.BLEND);
      fs(P.tone, T.ldrF, tw, th, { uHdr: T.col, uAO: look.ao > 0 ? T.ao2 : T.white, uBloom: T.bl[0].t }, function (u) {
        gl.uniform1f(u.uExp, look.exposure); gl.uniform1f(u.uBloomK, look.bloom); gl.uniform1f(u.uAOK, look.ao); gl.uniform1f(u.uGrain, calm ? look.grain * 0.5 : look.grain); gl.uniform1f(u.uSeed, calm ? 0 : (time * 60 % 97));
      });
      renders++; sceneDirty = false; finalDirty = true; placeDirty = true; plainDirty = true;
      if (renders < 4 || renders % 40 === 0) { gl.bindFramebuffer(gl.FRAMEBUFFER, T.ldrF); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1); var c = performance.now() - t0; cost = cost ? cost * 0.5 + c * 0.5 : c; probe.info.sceneMs = Math.round(cost); }
    }
    function renderPlain(target, vp) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target); gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); P.plain.use();
      gl.uniformMatrix4fv(P.plain.u.uVP, false, vp); gl.uniform1i(P.plain.u.uTex, 0); gl.bindVertexArray(quad.vao);
      panels.forEach(function (p) { if (!p.ttex.w) return; gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, p.ttex); gl.uniform1f(P.plain.u.uHov, p.hov); gl.uniformMatrix4fv(P.plain.u.uModel, false, p.TM); gl.drawArrays(gl.TRIANGLES, 0, 6); });
      gl.disable(gl.BLEND);
    }
    function renderFinal() {
      var lensOn = lens.vis > 0.01 && plain < 0.99;
      if (plain > 0.001) renderPlain(T.plF, CM.vp);
      if (lensOn) renderPlain(T.plLF, lensVP());
      var pap = lin(look.paper), ink = lin(look.ink), rim = lin(look.rim);
      fs(P.fin, null, canvas.width, canvas.height, { uLdr: T.ldr, uNrm: T.nrm, uPlain: T.pl, uPlainL: T.plL }, function (u) {
        gl.uniform2f(u.uRes, S.W, S.H); gl.uniform2f(u.uPx, 1 / tw, 1 / th);
        gl.uniform4f(u.uLens, lens.x, lens.y, lens.r, lens.mag); gl.uniform4f(u.uLensK, lensOn ? lens.vis * (1 - plain) : 0, lens.hover, 0, 0);
        gl.uniform1f(u.uFull, plain); gl.uniform3f(u.uPaper, Math.pow(pap[0], 1 / 2.2), Math.pow(pap[1], 1 / 2.2), Math.pow(pap[2], 1 / 2.2));
        gl.uniform3f(u.uInk, Math.pow(ink[0], 1 / 2.2), Math.pow(ink[1], 1 / 2.2), Math.pow(ink[2], 1 / 2.2)); gl.uniform3f(u.uRim, Math.pow(rim[0], 1 / 2.2), Math.pow(rim[1], 1 / 2.2), Math.pow(rim[2], 1 / 2.2));
      });
      finalDirty = false; plainDirty = false;
    }

    // ---- time: springs, animators, light fades, the opening
    function stepSpring(s, dt) { var r = HIC.spring(s.v, s.vel, s.target, s.freq, s.zeta, dt); s.v = r[0]; s.vel = r[1]; var moving = Math.abs(s.v - s.target) > 1e-4 || Math.abs(s.vel) > 1e-4; if (!moving) { s.v = s.target; s.vel = 0; } return moving; }
    var intro = null;
    if (!nointro) {
      intro = { t: 0, order: W.rooms.map(function (R) { return R.zone; }).concat([W.zoneById.ext]) };
      W.zones.forEach(function (Z) { Z.lights.forEach(function (L) { L.saved = L.on; L.on = 0; L.level = 0; }); });
      panels.forEach(function (p) { if (p.unlit) p.emitNow = 0.03; });
    }
    function introStep(dt) {
      intro.t += dt; var t = intro.t;
      intro.order.forEach(function (Z, i) { if (t > 0.5 + i * 0.22) Z.lights.forEach(function (L) { if (L.saved != null) { L.on = L.saved; L.saved = null; } }); });
      var ts = t - (0.5 + intro.order.length * 0.22);
      panels.forEach(function (p) { if (p.unlit) p.emitNow = ts < 0 ? 0.03 : ts < 0.08 ? p.emit * 0.9 : ts < 0.18 ? 0.1 : ts < 0.32 ? p.emit : ts < 0.38 ? 0.3 : null; });
      if (ts > 0.45) { intro = null; panels.forEach(function (p) { p.emitNow = null; }); if (sound && sound.on) sound.play('buzz'); }
      return true;
    }
    function update(dt) {
      var dirty = false;
      if (intro) dirty = introStep(dt) || dirty;
      // camera
      var pc = [cam.cx, cam.cy, cam.hw], k = 1 - Math.exp(-dt * 10);
      cam.cx += (camT.cx - cam.cx) * k; cam.cy += (camT.cy - cam.cy) * k; cam.hw = Math.exp(Math.log(cam.hw) + (Math.log(camT.hw) - Math.log(cam.hw)) * k);
      if (Math.abs(cam.cx - camT.cx) < 1e-3 && Math.abs(cam.cy - camT.cy) < 1e-3 && Math.abs(cam.hw - camT.hw) < 1e-3) { cam.cx = camT.cx; cam.cy = camT.cy; cam.hw = camT.hw; }
      if (pc[0] !== cam.cx || pc[1] !== cam.cy || pc[2] !== cam.hw) dirty = true;
      // lights fade on fast and off a little slower, like a filament
      for (var id in W.lights) { var L = W.lights[id]; if (L.level !== L.on) { var r = L.on > L.level ? 14 : 8; L.level += (L.on - L.level) * (1 - Math.exp(-dt * r)); if (Math.abs(L.level - L.on) < 0.003) L.level = L.on; dirty = true; } if (L.flicker && L.level > 0 && !calm) dirty = dirty || 'idle'; }
      // frozen (a still between advance() calls): poses are set once, then nothing moves
      if (dt > 0 || !frozenSet) {
        frozenSet = dt === 0;
        springs.forEach(function (s) { if (stepSpring(s, dt)) dirty = true; });
        animators.forEach(function (fn) { var r = fn(time, dt); if (r) dirty = dirty === true ? true : (r === 'idle' ? (dirty || 'idle') : true); });
      }
      if (W.flames.length && !calm) dirty = dirty || 'idle';
      panels.forEach(function (p) { var to = p === hovered ? 1 : 0; if (p.hov !== to) { p.hov += (to - p.hov) * (1 - Math.exp(-dt * 14)); if (Math.abs(p.hov - to) < 0.01) p.hov = to; dirty = true; plainDirty = true; } });
      // lens and plain sheet
      var pl = [lens.x, lens.y, lens.r, lens.vis, lens.hover, plain];
      if (!drag || drag.kind !== 'lens') { lens.x += (lens.tx - lens.x) * (1 - Math.exp(-dt * 9)); lens.y += (lens.ty - lens.y) * (1 - Math.exp(-dt * 9)); }
      lens.vis += (lens.visT - lens.vis) * (1 - Math.exp(-dt * 9)); lens.hover += (lens.hoverT - lens.hover) * (1 - Math.exp(-dt * 14));
      plain += (plainT - plain) * (1 - Math.exp(-dt * 6)); if (Math.abs(plain - plainT) < 0.002) plain = plainT;
      [lens.x, lens.y, lens.vis, lens.hover].forEach(function (v, i) { if (Math.abs(v - pl[i]) > 0.01) finalDirty = true; });
      if (plain !== pl[5]) { finalDirty = true; plainDirty = true; }
      if (dirty === true) sceneDirty = true;
      return dirty;
    }
    // ---- the loop: the scene is drawn when something changed; idle motion (flames, breathing) is redrawn only as often as
    // the machine allows (a quarter of its time at most)
    function frame(t, dt) {
      if (still === null) time += dt;
      // a still stands still: only advance() (checks, stills) moves the world on
      var d = update(still === null ? dt : 0);
      if (d === 'idle' && !calm) { var gap = Math.max(1 / 30, cost / 1000 * 3); if (time - idleAt > gap) { idleAt = time; sceneDirty = true; } }
      if (sceneDirty) renderScene();
      if (placeDirty && ready) placeAll();
      if (finalDirty || plainDirty) renderFinal();
    }
    // simulated time for checks and stills: run the world n seconds in fixed steps, then draw once
    function advance(sec) { frozenSet = false; var n = Math.round(sec * 60); for (var i = 0; i < n; i++) { if (still === null) time += 1 / 60; update(1 / 60); } renderScene(); placeAll(); renderFinal(); }

    // ---- input
    function local(e) { var b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }
    function setViaLens(v) { if (v !== viaLens) { viaLens = v; placeDirty = true; } }
    window.addEventListener('pointermove', function (e) {
      var p = local(e); ptr.x = p[0]; ptr.y = p[1]; ptr.in = true;
      if (drag) {
        if (drag.kind === 'lens') { lens.x = lens.tx = HIC.clamp(p[0] - drag.ox, 10, S.W - 10); lens.y = lens.ty = HIC.clamp(p[1] - drag.oy, 10, S.H - 10); drag.moved = true; finalDirty = true; if (viaLens) placeDirty = true; }
        else if (drag.kind === 'pan') { var kk = 2 * cam.hw / S.W; camT.cx = drag.cx - (p[0] - drag.sx) * kk; camT.cy = drag.cy + (p[1] - drag.sy) * kk; clampCam(camT); cam.cx = camT.cx; cam.cy = camT.cy; sceneDirty = true; }
        return;
      }
      var part = plainT < 0.5 ? lensPart(p[0], p[1]) : '';
      lens.hoverT = part === 'rim' ? 1 : 0;
      setViaLens(part === 'glass');
      canvas.style.cursor = part === 'rim' ? 'grab' : '';
      if (viaLens) placeDirty = true;
    }, true);
    window.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || (e.target.closest && e.target.closest('#dh-ui'))) return;
      var p = local(e), part = plainT < 0.5 ? lensPart(p[0], p[1]) : '';
      if (part === 'rim' || (part === 'glass' && e.target === canvas)) {
        e.preventDefault(); e.stopPropagation(); drag = { kind: 'lens', ox: p[0] - lens.x, oy: p[1] - lens.y };
        try { canvas.setPointerCapture(e.pointerId); } catch (x) {} canvas.style.cursor = 'grabbing'; return;
      }
      if (e.target === canvas) {
        var now = performance.now(); if (drag === null && lastTap && now - lastTap.t < 320 && Math.hypot(p[0] - lastTap.x, p[1] - lastTap.y) < 30 && e.pointerType !== 'mouse') { zoomAt(p); lastTap = null; return; }
        lastTap = { t: now, x: p[0], y: p[1] };
        drag = { kind: 'pan', sx: p[0], sy: p[1], cx: camT.cx, cy: camT.cy }; try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
        if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
      }
    }, true);
    var lastTap = null;
    var endDrag = function () { if (drag) { drag = null; canvas.style.cursor = ''; placeDirty = true; } };
    window.addEventListener('pointerup', endDrag, true); window.addEventListener('pointercancel', endDrag, true);
    document.addEventListener('pointerleave', function () { ptr.in = false; setViaLens(false); });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault(); var p = local(e), a = S.W / S.H, nx = p[0] / S.W * 2 - 1, ny = 1 - p[1] / S.H * 2;
      var wx = camT.cx + nx * camT.hw, wy = camT.cy + ny * camT.hw / a, k = Math.exp(e.deltaY * (e.ctrlKey ? 0.006 : 0.0015));
      camT.hw = HIC.clamp(camT.hw * k, 1.6, home.hw); camT.cx = wx - nx * camT.hw; camT.cy = wy - ny * camT.hw / a; clampCam(camT);
    }, { passive: false });
    function roomAt(p) { var hit = null; W.rooms.forEach(function (R) { var a = project(CM.vp, [R.x0, R.y1, 0]), b = project(CM.vp, [R.x1, R.y0, 0]); if (p[0] >= a[0] && p[0] <= b[0] && p[1] >= a[1] && p[1] <= b[1]) hit = R; }); return hit; }
    function zoomAt(p) {
      if (camT.hw < home.hw * 0.8) { Object.assign(camT, home); return; }
      var R = roomAt(p); if (R) { Object.assign(camT, fitRect(R.x0, R.y0, R.x1, R.y1, 1.08)); clampCam(camT); }
    }
    canvas.addEventListener('dblclick', function (e) { if (e.target === canvas && lensPart.apply(null, local(e)) === '') zoomAt(local(e)); });
    canvas.addEventListener('pointerover', function (e) { var p = byEl.get(e.target.closest && e.target.closest('[data-k], .dh-twin')); hovered = p || null; }, true);
    canvas.addEventListener('pointerout', function (e) { if (!e.relatedTarget || !canvas.contains(e.relatedTarget)) hovered = null; }, true);
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !e.target.closest('[data-k]')) Object.assign(camT, home); });
    // focus a control that is off screen (keyboard): bring its room into view
    canvas.addEventListener('focusin', function (e) {
      var p = byEl.get(e.target.closest && e.target.closest('[data-k]')); if (!p || !CM) return; hovered = p;
      var c = project(CM.vp, p.c); if (c[0] < 30 || c[1] < 30 || c[0] > S.W - 30 || c[1] > S.H - 30) { var R = p.zone.room; if (R) { Object.assign(camT, fitRect(R.x0, R.y0, R.x1, R.y1, 1.1)); clampCam(camT); } }
    });
    // default sounds: switches click, sliders tick, dials clunk, keys tap, buttons ring (data-sound="…" or "none" overrides)
    panels.forEach(function (p) {
      var el = p.el, f = fieldOf(el), snd = el.dataset.sound, last = null;
      if (!f && !el.querySelector('button') && el.tagName !== 'BUTTON') return;
      var play = function (n) { if (sound && snd !== 'none') sound.play(snd || n); };
      if (f && f.type === 'checkbox') f.addEventListener('change', function () { play('click'); });
      else if (f && f.type === 'range') f.addEventListener('input', function () { if (p.liftOwned) return; var st = Math.round(+f.value / ((+f.max - +f.min) / 8 || 1)); if (st !== last) { last = st; play('tick'); } });
      else if (f && f.tagName === 'SELECT') f.addEventListener('change', function () { play('clunk'); });
      else if (f && (f.tagName === 'TEXTAREA' || f.tagName === 'INPUT' || f.isContentEditable)) f.addEventListener('keydown', function () { play('key'); });
      var bt = el.tagName === 'BUTTON' ? el : el.querySelector('button'); if (bt) bt.addEventListener('click', function () { play('bell'); });
    });

    // ---- the buttons under the building
    var uiCfg = cfg.ui === false ? null : Object.assign({ plain: 'Show just HTML elements', scene: 'Show the building', lens: 'Lens', sound: 'Sound', home: 'Whole building' }, cfg.ui || {});
    if (uiCfg) {
      var ui = document.getElementById('dh-ui') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'dh-ui' }));
      var mk = function (id, label, fn, pressed) { var b = document.createElement('button'); b.type = 'button'; b.id = id; b.textContent = label; if (pressed != null) b.setAttribute('aria-pressed', String(pressed)); b.addEventListener('click', fn); ui.appendChild(b); return b; };
      var bp = mk('dh-plain', plainT ? uiCfg.scene : uiCfg.plain, function () { api.setPlain(!plainT); }, !!plainT);
      var bl = mk('dh-lens', uiCfg.lens, function () { lens.visT = lens.visT ? 0 : 1; bl.setAttribute('aria-pressed', String(!!lens.visT)); finalDirty = true; }, !!lens.visT);
      if (sound) { var bs = mk('dh-sound', uiCfg.sound, function () { sound.toggle(); bs.setAttribute('aria-pressed', String(sound.on)); }, false); }
      mk('dh-home', uiCfg.home, function () { Object.assign(camT, home); });
    }

    // ---- resize
    function resize() {
      var first = !home; S.resize(); home = homeView();
      if (first) { Object.assign(cam, home); Object.assign(camT, home); } else clampCam(camT);
      lens.r = lensSize(); var rp = lensRest(); if (first || !lens.moved) { lens.x = lens.tx = rp[0]; lens.y = lens.ty = rp[1]; }
      targets(); CM = camMats(cam); sceneDirty = placeDirty = finalDirty = true;
    }
    window.addEventListener('resize', resize);
    resize();

    // ---- the public API (for the page's ready() and for checks)
    Object.assign(api, {
      world: W, stage: S, panels: panels, rooms: W.rooms, lights: W.lights, movers: W.movers, sound: sound,
      el: function (k) { return byKey[k]; }, field: function (k) { return fieldOf(byKey[k]); }, panel: function (k) { return pByKey[k]; },
      on: function (k, ev, fn) { var e = fieldOf(byKey[k]) || byKey[k]; if (!e) { console.warn('dollhouse: no control ' + k); return api; } e.addEventListener(ev, function (x) { fn(valueOf(e), x); }); return api; },
      light: function (id) { var L = W.lights[id]; return { set: function (v) { if (L) L.on = +v; return this; }, power: function (p) { if (L) { L.power = p; sceneDirty = true; } return this; }, color: function (c) { if (L) { L.col = lin(c); sceneDirty = true; } return this; }, get level() { return L ? L.level : 0; } }; },
      setLight: function (id, v) { if (W.lights[id]) W.lights[id].on = +v; return api; },
      tint: function (zone, slot, c) { var Z = W.zoneById[zone]; if (Z) { Z.dyn[slot - 1] = lin(c); sceneDirty = true; } return api; },
      spring: function (v, freq, zeta) { var s = { v: v, vel: 0, target: v, freq: freq || 2, zeta: zeta == null ? 0.7 : zeta, to: function (x) { this.target = x; } }; springs.push(s); return s; },
      animate: function (fn) { animators.push(fn); return api; },
      mover: function (name) { return W.movers[name]; },
      // resize a flame (by the light it belongs to): k scales its height, kw its width (default k)
      flame: function (lightId, k, kw) { W.flames.forEach(function (f) { if (f.light !== lightId) return; var h = f.h * k, w = f.w * (kw == null ? Math.sqrt(k) : kw); f.M = M4.mul(M4.translate(f.c[0], f.c[1] + h / 2, f.c[2]), M4.scale(w, h, 1)); }); sceneDirty = true; return api; },
      touch: touch, sfx: function (n, a) { if (sound) sound.play(n, a); }, time: function () { return time; },
      setPlain: function (v) { plainT = v ? 1 : 0; placeDirty = true; plainDirty = true; var b = document.getElementById('dh-plain'); if (b && uiCfg) { b.textContent = plainT ? uiCfg.scene : uiCfg.plain; b.setAttribute('aria-pressed', String(!!plainT)); } },
      view: function (id) { var R = W.rooms.filter(function (r) { return r.id === id; })[0]; if (!R) Object.assign(camT, home); else { Object.assign(camT, fitRect(R.x0, R.y0, R.x1, R.y1, 1.08)); clampCam(camT); } Object.assign(cam, camT); sceneDirty = true; },
      home: function () { return home; }, camera: function () { return Object.assign({}, cam); },
      lensTo: function (key) { var c = typeof key === 'string' ? lensOver(key) : key; if (!c) return; lens.x = lens.tx = c[0]; lens.y = lens.ty = c[1]; lens.moved = true; lens.visT = lens.vis = 1; finalDirty = true; },
      lens: lens, advance: advance, project: function (p) { return CM ? project(CM.vp, p) : null; },
      roomRect: function (id) { var R = W.rooms.filter(function (r) { return r.id === id; })[0]; if (!R || !CM) return null; var a = project(CM.vp, [R.x0, R.y1, 0]), b = project(CM.vp, [R.x1, R.y0, 0]); return [a[0], a[1], b[0] - a[0], b[1] - a[1]]; },
      state: function () { return { plain: plainT, viaLens: viaLens, lens: { x: lens.x, y: lens.y, r: lens.r, vis: lens.vis }, cam: Object.assign({}, cam), sceneMs: Math.round(cost), renders: renders, rs: rs }; },
      // where an element is on screen as it is placed for hit testing now (styled or twin)
      screenOf: function (el) {
        var p = byEl.get(el.closest('[data-k], .dh-twin')); if (!p) return null;
        var twin = p.twin.contains(el), rootEl = twin ? p.twin : p.el, F = twin ? p.TF : p.F;
        if (!F) { if (!CM) return null; var vp = twin ? (viaLens ? lensVP() : CM.vp) : CM.vp; F = twin ? homog(p.TM, vp, p.twin.offsetWidth, p.twin.offsetHeight) : homog(p.M, CM.vp, p.el.offsetWidth, p.el.offsetHeight); }
        var b = HIC.box(rootEl, el); return apply(F, b[0] + b[2] / 2, b[1] + b[3] / 2);
      },
      // where a point of an element (element-local CSS px) is on screen, as placed now
      screenAt: function (el, lx, ly) { var p = byEl.get(el.closest('[data-k], .dh-twin')); if (!p) return null; var twin = p.twin.contains(el), F = twin ? p.TF : p.F; if (!F) return null; var b = HIC.box(twin ? p.twin : p.el, el); return apply(F, b[0] + lx, b[1] + ly); },
      kick: function () { sceneDirty = true; }
    });
    probe.screenOf = api.screenOf; probe.dh = api;
    // the page's own bindings and the lifts
    W.binds.forEach(function (fn) { fn(api); });
    if (cfg.ready) cfg.ready(api);
    // hash: #view=<room> #lens=<key> #lift handled by lifts; #dark=<light,…>
    var v = HIC.param('view'); if (v) api.view(v);
    var dk = HIC.param('dark'); if (dk) dk.split(',').forEach(function (id) { var L = W.lights[id]; if (L) { L.on = 0; L.level = 0; L.saved = null; } });
    if (lensParam && lensParam !== 'off') { var tryLens = function () { if (CM && pByKey[lensParam]) api.lensTo(lensParam); }; setTimeout(tryLens, 0); }
    S.loop(frame);
    return api;
  }

  // ------------------------------------------------------------------ a lift in a shaft, driven by one vertical range
  // DH.lift(B, R, {key, indicator, names, car(B, w, d, h), carH, gate, light, mass}) inside the shaft room's build.
  // The range (min 0, max stops-1, step .01, vertical by CSS writing-mode) is mounted on the car's gate: its thumb is the
  // lever and rides with the car. Drag it and the car follows on a spring; let go and it glides to the nearest floor,
  // carries past a little, settles and chimes. data-thumb="<px>" on the range element = the thumb's height in CSS px.
  DH.lift = function (B, R, o) {
    var W = B.zone.world, G = W.G, stops = [], names = o.names || [];
    G.Y.forEach(function (y) { if (y[0] >= R.y0 - 0.01 && y[0] < R.y1) stops.push(y[0] - R.y0); });
    var w = R.w, d = R.d, carH = o.carH || Math.min(2.1, (G.Y[0][1] - G.Y[0][0]) * 0.78), cw = w - 0.24, cd = Math.min(d * 0.62, 2.1), zc = -0.12 - cd / 2;
    var brass = mat(o.metal || '#c09347', { metal: 1, rough: 0.33 }), dark = mat('#2f3338', { rough: 0.5, metal: 1 }), iron = mat('#1c2024', { rough: 0.5, metal: 1 });
    // shaft: rails, landing gates on the back wall, a beam at each floor
    [-1, 1].forEach(function (s) { var x = s < 0 ? 0.05 : w - 0.05; B.box(x - 0.025, 0, zc - 0.03, x + 0.025, R.h, zc + 0.03, dark); });
    stops.forEach(function (y, i) {
      var gx0 = w * 0.18, gx1 = w * 0.82, z = -d + 0.01;
      B.box(gx0, y, z, gx1, y + carH * 0.86, z + 0.01, mat('#221e1b', { c2: '#18120e', pat: 'planks', s: 0.18, rough: 0.7 }));
      B.box(gx0 - 0.05, y, z, gx0, y + carH * 0.9, z + 0.07, brass); B.box(gx1, y, z, gx1 + 0.05, y + carH * 0.9, z + 0.07, brass); B.box(gx0 - 0.05, y + carH * 0.86, z, gx1 + 0.05, y + carH * 0.9, z + 0.08, brass);
      for (var x = gx0 + 0.1; x < gx1 - 0.05; x += 0.12) B.bar([x, y + 0.02, z + 0.04], [x, y + carH * 0.86, z + 0.04], 0.014, brass);
    });
    B.light(o.id ? o.id + '.shaft' : 'shaft', { at: [w / 2, R.h - 0.4, -0.6], color: o.shaftLight || '#efdcc0', power: 1.3, range: R.h + 1, shadow: false });
    // the car (a mover)
    var lightId = o.id ? o.id + '.car' : 'lift.car';
    var carBuild = o.car || function (C, cw, cd, ch) {
      var floor = mat('#4a2d1c', { c2: '#331e12', pat: 'wood', rough: 0.5 }), rug = mat(o.carpet || '#7b2333', { c2: '#d4aa5c', pat: 'carpet', s: 0.5, rough: 0.95 });
      C.box(-cw / 2, 0, -cd / 2, cw / 2, 0.09, cd / 2, floor); C.box(-cw / 2 + 0.05, 0.09, -cd / 2 + 0.05, cw / 2 - 0.05, 0.096, cd / 2 - 0.05, rug);
      [-1, 1].forEach(function (sx) { [-1, 1].forEach(function (sz) { C.cyl(sx * (cw / 2 - 0.03), 0.09, sz * (cd / 2 - 0.03), 0.028, ch - 0.09, brass, { seg: 8 }); }); });
      C.box(-cw / 2 - 0.02, ch, -cd / 2 - 0.02, cw / 2 + 0.02, ch + 0.1, cd / 2 + 0.02, brass);
      C.box(-cw / 2 + 0.04, 0.09, -cd / 2 + 0.01, cw / 2 - 0.04, ch * 0.7, -cd / 2 + 0.04, mat(o.back || '#24493b', { c2: '#2f5c4a', pat: 'diamond', s: 0.16, rough: 0.9 }));
      for (var x = -cw / 2 + 0.12; x < cw / 2 - 0.05; x += 0.14) C.bar([x, ch * 0.72, -cd / 2 + 0.02], [x, ch, -cd / 2 + 0.02], 0.012, brass);
      [-1, 1].forEach(function (sx) { for (var z = -cd / 2 + 0.15; z < cd / 2 - 0.05; z += 0.2) C.bar([sx * (cw / 2 - 0.03), 0.1, z], [sx * (cw / 2 - 0.03), ch, z], 0.012, brass); C.bar([sx * (cw / 2 - 0.03), ch * 0.5, -cd / 2], [sx * (cw / 2 - 0.03), ch * 0.5, cd / 2], 0.03, brass); });
      C.bar([-cw / 2, 0.55, cd / 2 - 0.02], [cw / 2, 0.55, cd / 2 - 0.02], 0.04, brass);
      C.ball(0, ch - 0.07, 0, 0.09, mat('#fff0d0', { emit: 5, unlit: true, noShadow: true, glow: lightId }), { sy: 0.7 });
      if (DH.props.doll && o.operator !== false) DH.props.doll(C, cw * 0.22, 0.096, -cd * 0.15, Object.assign({ coat: '#7c1f2b', hat: '#7c1f2b', still: true }, o.operator || {}));
    };
    var lp = B.world([w / 2, stops[0] + carH - 0.3, zc]), L0 = lp.slice();
    B.light(lightId, { at: [w / 2, stops[0] + carH - 0.3, zc], color: o.light || '#ffd9a0', power: o.power || 2.2, range: 5 });   // before the car, so its lamp glass can follow it
    var car = B.mover(function (C) { carBuild(C, cw, cd, carH, brass); }, { at: [w / 2, stops[0], zc], name: (o.id || 'lift') + '.car' });
    var cable = B.mover(function (C) { C.cyl(-0.03, 0, 0, 0.01, 1, iron, { seg: 5 }); C.cyl(0.03, 0, 0, 0.01, 1, iron, { seg: 5 }); }, { at: [w / 2, 0, zc], shadow: false });
    var weight = B.mover(function (C) { C.box(-0.12, 0, -0.08, 0.12, 1.0, 0.08, iron); for (var y = 0.08; y < 1; y += 0.14) C.box(-0.13, y, -0.09, 0.13, y + 0.06, 0.09, brass); }, { at: [w * 0.82, 0, -d + 0.25] });
    var span = stops[stops.length - 1] - stops[0], leverY = o.leverY || 0.5;
    B.panel(o.key, { at: [w / 2, 0, 0.04], w: 1, fit: { y0: stops[0] + leverY, y1: stops[stops.length - 1] + leverY }, emit: 0.12, rough: 0.4 });
    if (o.indicator) B.panel(o.indicator, { at: [w / 2, R.h - 0.22, 0.05], w: Math.min(w * 0.7, 0.9), emit: 0.5 });
    var mass = o.mass || 1;
    W.binds.push(function (D) {
      var el = D.field(o.key), out = o.indicator ? D.field(o.indicator) : null, p = D.panel(o.key); if (!el) return; if (p) p.liftOwned = true;
      el.min = 0; el.max = stops.length - 1; el.step = 0.01;
      var s = D.spring(+el.value || 0, 2.4 / Math.sqrt(mass), 0.85), gliding = false, shown = -1, hum = null, arrived = Math.round(s.v);
      var param = HIC.param('lift'); if (param !== null) { s.v = s.target = HIC.clamp(+param || 0, 0, stops.length - 1); el.value = s.v; arrived = Math.round(s.v); }
      function place() {
        var y = stops[0] + s.v * (span / Math.max(1, stops.length - 1)) * 1;
        var yy = stops.length > 1 ? interp(stops, s.v) : y;
        car.set({ at: [0, yy - stops[0], 0] });
        cable.set({ at: [0, yy + carH + 0.1, 0], s: [1, Math.max(0.01, R.h - yy - carH - 0.1), 1] });
        weight.set({ at: [0, Math.max(0, R.h - 1.4 - (yy - stops[0]) * 0.9), 0] });
        var L = W.lights[lightId]; L.p = [L0[0], L0[1] + yy - stops[0], L0[2]]; L.dirty = true;
        var f = Math.round(s.v); if (f !== shown && out) { shown = f; out.value = out.textContent = names[f] || String(f); out.dataset.stop = f; D.touch(o.indicator); }
      }
      el.addEventListener('input', function () { gliding = false; s.freq = 3.2 / Math.sqrt(mass); s.zeta = 0.9; s.to(+el.value); if (!hum && D.sound && D.sound.on) hum = D.sound.hum(); });
      el.addEventListener('change', function () { gliding = true; s.freq = 1.5 / Math.sqrt(mass); s.zeta = 0.55; s.to(Math.round(+el.value)); });
      D.animate(function () {
        var moving = Math.abs(s.v - s.target) > 1e-4 || Math.abs(s.vel) > 1e-4;
        if (moving || shown < 0) place();
        if (gliding) { el.value = s.v.toFixed(3); D.touch(o.key); if (!moving) { gliding = false; el.value = s.target; if (s.target !== arrived) { arrived = s.target; D.sfx('chime'); } } }
        if (!moving && hum) { hum(); hum = null; }
        return moving;
      });
      place();
    });
    function interp(st, v) { var i = Math.max(0, Math.min(st.length - 2, Math.floor(v))), t = v - i; return st[i] + (st[i + 1] - st[i]) * t; }
    return car;
  };
})(typeof window !== 'undefined' ? window : globalThis);

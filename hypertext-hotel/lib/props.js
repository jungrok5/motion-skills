/* props.js — the prop kit for dollhouse.js: furniture, lamps, hearths and peg-doll people, all built from boxes,
 * cylinders, turned profiles and balls, so they share one toy-like material language and take shadows the same way.
 *
 * Every prop: P.name(B, x, y, z, o) in the room's local coordinates (x right, y up from the floor, z toward the viewer;
 * the back wall is at -R.d). o holds colours and sizes; anything a prop lacks, build in the page with B.box / B.cyl /
 * B.lathe / B.ball / B.bar and Dollhouse.mat. Lamps and hearths create a light and return its id, so a control can
 * switch it: D.setLight(id, on).
 */
(function (root) {
  'use strict';
  var DH = root.Dollhouse = root.Dollhouse || {}; var P = DH.props = DH.props || {};
  var m = function (c, o) { return DH.mat(c, o); };
  var WOOD = function (c) { return m(c || '#6b4128', { c2: '#4a2a18', pat: 'wood', s: 0.5, rough: 0.55 }); };
  var BRASS = function () { return m('#c39a4c', { metal: 1, rough: 0.32 }); };
  P.mats = { wood: WOOD, brass: BRASS, iron: function () { return m('#22262b', { metal: 1, rough: 0.5 }); } };

  // ---- people: a turned peg doll. o: {coat, skin, hair, hat, cap, apron, h (default 1.05), ry, sit, still, mass}
  // Alive at rest: unless o.still, the doll breathes (a slow rise of the body, period 3–4.6 s by weight), sways a little
  // over its planted base and now and then shifts its weight; heavier dolls breathe slower and sway less.
  P.doll = function (B, x, y, z, o) {
    o = o || {}; var h = o.h || 1.05, k = h / 1.05, sit = !!o.sit;
    var coat = m(o.coat || '#35506b', { rough: 0.6 }), skin = m(o.skin || '#e8b896', { rough: 0.55 }), hair = m(o.hair || '#2b1d15', { rough: 0.7 });
    var body = function (G) {
      G.group({ s: k, ry: o.ry || 0 }, function (G) {
        var prof = sit ? [[0.19, 0.0], [0.2, 0.05], [0.17, 0.2], [0.13, 0.33], [0.1, 0.4], [0.06, 0.43]] : [[0.17, 0], [0.19, 0.03], [0.185, 0.13], [0.15, 0.42], [0.125, 0.6], [0.1, 0.68], [0.06, 0.72]];
        var top = sit ? 0.43 : 0.72;
        G.lathe(0, 0, 0, prof, coat, { seg: 16 });
        if (o.apron) G.lathe(0, 0.02, 0.01, sit ? [[0.2, 0], [0.18, 0.2], [0.14, 0.33]] : [[0.195, 0.02], [0.18, 0.2], [0.16, 0.42]], m(o.apron, { rough: 0.8 }), { seg: 16 });
        G.cyl(0, top - 0.02, 0, 0.06, 0.05, skin, { seg: 12 });
        var hy = top + 0.155;
        G.ball(0, hy, 0, 0.145, skin, { seg: 16, rings: 11 });
        [-1, 1].forEach(function (s) { G.ball(s * 0.05, hy + 0.02, 0.13, 0.016, m('#1b130e', { rough: 0.3 }), { seg: 8, rings: 5 }); G.ball(s * 0.085, hy - 0.025, 0.11, 0.02, m('#e0a08c', { rough: 0.8 }), { seg: 8, rings: 5, sy: 0.7 }); });
        G.box(-0.02, hy - 0.05, 0.136, 0.02, hy - 0.04, 0.146, m('#8a3b34'));
        [-1, 1].forEach(function (s) { G.group({ at: [s * 0.115, top - 0.06, 0.01], rz: s * 8, rx: sit ? -50 : -12 }, function (A) { A.lathe(0, -0.26, 0, [[0.024, 0], [0.03, 0.05], [0.033, 0.2], [0.03, 0.26]], coat, { seg: 8 }); A.ball(0, -0.28, 0, 0.032, skin, { seg: 8, rings: 5 }); }); });
        if (o.hat) { G.cyl(0, hy + 0.1, 0, 0.17, 0.02, m(o.hat, { rough: 0.6 }), { seg: 16 }); G.cyl(0, hy + 0.115, 0, 0.11, 0.1, m(o.hat, { rough: 0.6 }), { seg: 16 }); }
        else if (o.cap) { G.ball(0, hy + 0.06, -0.01, 0.15, m(o.cap, { rough: 0.85 }), { seg: 14, rings: 8, sy: 0.75 }); G.ball(0, hy + 0.16, -0.02, 0.12, m(o.cap, { rough: 0.85 }), { seg: 12, rings: 8, sy: 0.7 }); }
        else G.ball(0, hy + 0.03, -0.012, 0.15, hair, { seg: 16, rings: 9, sy: 0.92 });
      });
    };
    if (o.still) { B.group({ at: [x, y, z] }, body); return null; }
    var mv = B.mover(body, { at: [x, y, z] }), mass = o.mass || 1, seed = (x * 7.13 + z * 3.7 + y * 1.9) % 1;
    var period = (3.1 + seed * 1.0) * Math.sqrt(mass), sway = 0.7 / mass;
    B.zone.world.binds.push(function (D) {
      if (D.plain) return;
      // breath: a quick in-breath and a longer out-breath (not a sine), sway on a different, unrelated period
      D.animate(function (t) {
        var ph = ((t + seed * 9) / period) % 1, br = ph < 0.4 ? Math.sin(ph / 0.4 * Math.PI / 2) : Math.cos((ph - 0.4) / 0.6 * Math.PI / 2);
        var shift = Math.sin((t + seed * 20) * 0.37) * Math.sin((t + seed * 5) * 0.23);
        mv.set({ s: [1 - 0.006 * br, 1 + 0.016 * br, 1 - 0.006 * br], rz: sway * shift, rx: 0.35 * br });
        return 'idle';
      });
    });
    return mv;
  };

  // ---- furniture
  P.table = function (B, x, y, z, o) {
    o = o || {}; var w = o.w || 1.1, d = o.d || 0.7, h = o.h || 0.75, top = o.top || WOOD(o.wood), leg = o.leg || WOOD(o.wood);
    if (o.round) { B.cyl(x, y + h - 0.04, z, w / 2, 0.04, top, { seg: 22 }); B.cyl(x, y, z, 0.05, h - 0.04, leg, { seg: 10 }); B.cyl(x, y, z, 0.24, 0.04, leg, { seg: 14, r2: 0.18 }); }
    else { B.block(x, y + h - 0.05, z, w, 0.05, d, top); [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { B.block(x + a * (w / 2 - 0.06), y, z + b * (d / 2 - 0.06), 0.05, h - 0.05, 0.05, leg); }); }); }
    if (o.cloth) B.block(x, y + h, z, (o.round ? w * 0.75 : w * 0.8), 0.006, (o.round ? w * 0.75 : d * 0.8), m(o.cloth, { c2: o.cloth2 || '#ffffff', pat: 'check', s: 0.08, rough: 0.95 }));
    return y + h;
  };
  P.chair = function (B, x, y, z, o) {
    o = o || {}; var c = o.mat || WOOD(o.wood), seat = o.seat ? m(o.seat, { rough: 0.9 }) : c;
    B.group({ at: [x, y, z], ry: o.ry || 0 }, function (G) {
      [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { G.block(a * 0.19, 0, b * 0.19, 0.04, 0.45, 0.04, c); }); });
      G.block(0, 0.45, 0, 0.46, 0.05, 0.46, seat);
      [-1, 1].forEach(function (a) { G.block(a * 0.19, 0.5, -0.21, 0.04, 0.5, 0.04, c); }); G.block(0, 0.86, -0.21, 0.42, 0.12, 0.03, c);
    });
  };
  P.stool = function (B, x, y, z, o) { o = o || {}; var c = BRASS(); B.cyl(x, y, z, 0.03, 0.66, c, { seg: 8 }); B.cyl(x, y, z, 0.18, 0.03, c, { seg: 12 }); B.cyl(x, y + 0.66, z, 0.18, 0.08, m(o.seat || '#8c1f26', { rough: 0.6 }), { seg: 16 }); };
  P.bed = function (B, x, y, z, o) {
    o = o || {}; var w = o.w || 1.9, d = o.d || 1.2, frame = o.frame || BRASS(), quilt = m(o.quilt || '#c45a4a', { c2: o.quilt2 || '#e8d8b0', pat: o.pat || 'quilt', s: 0.18, rough: 0.95 });
    B.block(x, y + 0.2, z, w, 0.22, d, m('#efe8da', { rough: 0.95 }));
    B.box(x - w / 2 + 0.02, y + 0.42, z - d / 2, x + w / 2 - 0.25, y + 0.47, z + d / 2 + 0.02, quilt);
    B.box(x - w / 2 + 0.02, y + 0.12, z + d / 2, x + w / 2 - 0.25, y + 0.47, z + d / 2 + 0.03, quilt);
    B.ball(x + w / 2 - 0.3, y + 0.5, z, 0.22, m('#f6f1e6', { rough: 0.95 }), { sx: 0.7, sy: 0.35, sz: 1.8 });
    [-1, 1].forEach(function (s) { var hx = x + s * w / 2, hh = s > 0 ? 1.05 : 0.75; [-1, 1].forEach(function (b) { B.cyl(hx, y, z + b * d / 2, 0.025, hh, frame, { seg: 8 }); B.ball(hx, y + hh, z + b * d / 2, 0.04, frame); });
      B.bar([hx, y + hh - 0.05, z - d / 2], [hx, y + hh - 0.05, z + d / 2], 0.03, frame); B.bar([hx, y + 0.3, z - d / 2], [hx, y + 0.3, z + d / 2], 0.03, frame);
      for (var k = -d / 2 + 0.2; k < d / 2 - 0.1; k += 0.2) B.bar([hx, y + 0.3, z + k], [hx, y + hh - 0.05, z + k], 0.015, frame); });
    B.block(x, y + 0.08, z, w, 0.12, d, WOOD('#3c2618'));
  };
  P.sofa = function (B, x, y, z, o) {
    o = o || {}; var w = o.w || 1.7, c = m(o.c || '#5a2b3a', { c2: o.c2 || '#4a2030', pat: o.pat || 'stripes', s: 0.08, rough: 0.9 });
    B.block(x, y + 0.08, z, w, 0.34, 0.75, c); B.block(x, y + 0.42, z - 0.3, w, 0.5, 0.18, c);
    [-1, 1].forEach(function (s) { B.block(x + s * (w / 2 - 0.08), y + 0.08, z, 0.18, 0.55, 0.75, c); });
    [-1, 1].forEach(function (s) { B.ball(x + s * w / 4, y + 0.5, z + 0.02, 0.3, c, { sx: 1.2, sy: 0.25, sz: 1 }); });
    [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { B.cyl(x + a * (w / 2 - 0.08), y, z + b * 0.3, 0.03, 0.08, WOOD('#2b1a10'), { seg: 6 }); }); });
  };
  // shelves against the back wall: fill 'books' | 'jars' | 'bottles' | 'loaves' | 'plates' | 'none'
  P.shelf = function (B, x, y, z, o) {
    o = o || {}; var w = o.w || 1.4, h = o.h || 1.9, d = o.d || 0.35, n = o.rows || Math.max(2, Math.round(h / 0.42)), wood = o.wood ? WOOD(o.wood) : WOOD(), fill = o.fill || 'books';
    B.box(x - w / 2, y, z - d / 2, x + w / 2, y + h, z - d / 2 + 0.02, wood); [-1, 1].forEach(function (s) { B.box(x + s * w / 2 - 0.025, y, z - d / 2, x + s * w / 2 + 0.025, y + h, z + d / 2, wood); });
    var row = (h - 0.08) / n;
    for (var i = 0; i <= n; i++) B.box(x - w / 2, y + i * row, z - d / 2, x + w / 2, y + i * row + 0.035, z + d / 2, wood);
    var rng = HIC.rng(Math.round(x * 100 + y * 10 + z * 1000) >>> 0);
    for (i = 0; i < n; i++) {
      var y0 = y + i * row + 0.035;
      if (fill === 'books') B.box(x - w / 2 + 0.04, y0, z - d / 2 + 0.03, x + w / 2 - 0.04, y0 + row * 0.95, z + d / 2 - 0.04, m(o.c || '#a0603a', { c2: '#2a1810', pat: 'books', s: row, rough: 0.8 }), 'Z');
      else for (var xx = x - w / 2 + 0.1; xx < x + w / 2 - 0.08; xx += fill === 'loaves' ? 0.3 : 0.16) {
        var r = rng();
        if (fill === 'jars') { B.cyl(xx, y0, z, 0.055, 0.14 + r * 0.06, m(['#c8783a', '#9fb85a', '#d8b860', '#b8483a'][Math.floor(r * 4)], { rough: 0.35 }), { seg: 10 }); B.cyl(xx, y0 + 0.14 + r * 0.06, z, 0.058, 0.03, BRASS(), { seg: 10 }); }
        else if (fill === 'bottles') { var bc = m(['#2f5a3a', '#6a2a2a', '#c8a050', '#3a3a6a'][Math.floor(r * 4)], { rough: 0.2 }); B.lathe(xx, y0, z, [[0.04, 0], [0.045, 0.02], [0.045, 0.16], [0.02, 0.22], [0.015, 0.3], [0.018, 0.31]], bc, { seg: 10 }); }
        else if (fill === 'loaves') P.loaf(B, xx + 0.04, y0, z, { r: 0.12 + r * 0.03, c: r > 0.5 ? '#b8732e' : '#c98d44' });
        else if (fill === 'plates') B.cyl(xx, y0 + 0.11, z - 0.05, 0.075, 0.015, m('#f1ece0', { rough: 0.3 }), { axis: 'z', seg: 14 });
      }
    }
  };
  P.counter = function (B, x, y, z, o) {
    o = o || {}; var w = o.w || 2, h = o.h || 1, d = o.d || 0.6, front = o.front ? m(o.front, { c2: o.front2 || o.front, pat: o.pat || 'planks', s: 0.25, rough: 0.6 }) : WOOD('#5a3420'), top = o.top ? m(o.top, { pat: o.topPat || 'flat', rough: 0.35 }) : WOOD('#3a2014');
    B.block(x, y, z, w, h - 0.05, d, front); B.block(x, y + h - 0.05, z + 0.02, w + 0.08, 0.05, d + 0.1, top);
    for (var px = x - w / 2 + 0.3; px < x + w / 2 - 0.1; px += 0.6) B.box(px - 0.22, y + 0.15, z + d / 2, px + 0.22, y + h - 0.2, z + d / 2 + 0.02, WOOD(o.panel || '#6e4428'));
    return y + h;
  };
  P.rug = function (B, x, y, z, o) { o = o || {}; var w = o.w || 1.8, d = o.d || 1.1; B.box(x - w / 2, y + 0.006, z - d / 2, x + w / 2, y + 0.016, z + d / 2, m(o.c || '#7a2a2a', { c2: o.c2 || '#d8b060', pat: 'carpet', s: Math.max(w, d), rough: 0.98 }), 'Y'); };
  P.frame = function (B, x, y, z, o) {
    o = o || {}; var w = o.w || 0.6, h = o.h || 0.45, fr = o.frame ? m(o.frame, { metal: 1, rough: 0.4 }) : m('#b08a40', { metal: 1, rough: 0.45 });
    B.box(x - w / 2 - 0.04, y - h / 2 - 0.04, z, x + w / 2 + 0.04, y + h / 2 + 0.04, z + 0.03, fr);
    B.box(x - w / 2, y - h / 2, z + 0.03, x + w / 2, y + h / 2, z + 0.035, m(o.c || '#7b9a96', { c2: o.c2 || '#d8c08a', pat: o.pat || 'hstripes', s: h * 0.5, rough: 0.8 }));
  };
  // a window in the back wall onto the night: o: {w, h, frame, curtain}
  P.window = function (B, x, y, z, o) {
    o = o || {}; var w = o.w || 0.9, h = o.h || 1.1, fr = m(o.frame || '#ece6d8', { rough: 0.6 });
    B.box(x - w / 2, y - h / 2, z, x + w / 2, y + h / 2, z + 0.01, m(o.sky || '#1a2a55', { c2: o.sky2 || '#060a1a', pat: 'night', s: h, emit: 0.8, unlit: true, noShadow: true }));
    B.box(x - w / 2 - 0.06, y - h / 2 - 0.06, z, x - w / 2, y + h / 2 + 0.06, z + 0.06, fr); B.box(x + w / 2, y - h / 2 - 0.06, z, x + w / 2 + 0.06, y + h / 2 + 0.06, z + 0.06, fr);
    B.box(x - w / 2 - 0.06, y + h / 2, z, x + w / 2 + 0.06, y + h / 2 + 0.06, z + 0.06, fr); B.box(x - w / 2 - 0.1, y - h / 2 - 0.08, z, x + w / 2 + 0.1, y - h / 2, z + 0.12, fr);
    B.box(x - 0.015, y - h / 2, z, x + 0.015, y + h / 2, z + 0.03, fr); B.box(x - w / 2, y - 0.015, z, x + w / 2, y + 0.015, z + 0.03, fr);
    if (o.curtain) { var cu = m(o.curtain, { c2: o.curtain2 || o.curtain, pat: 'stripes', s: 0.06, rough: 0.95 }); [-1, 1].forEach(function (s) { B.box(x + s * (w / 2 + 0.05) - 0.12, y - h / 2 - 0.15, z + 0.06, x + s * (w / 2 + 0.05) + 0.12, y + h / 2 + 0.2, z + 0.14, cu); }); B.cyl(x - w / 2 - 0.25, y + h / 2 + 0.24, z + 0.1, 0.018, w + 0.5, BRASS(), { axis: 'x', seg: 8 }); }
  };
  P.plant = function (B, x, y, z, o) {
    o = o || {}; var s = o.s || 1, pot = m(o.pot || '#b5653f', { rough: 0.8 }), leaf = m(o.leaf || '#2f5a3a', { c2: '#467a48', pat: 'plaster', rough: 0.85 });
    B.group({ at: [x, y, z], s: s }, function (G) { G.cyl(0, 0, 0, 0.12, 0.25, pot, { r2: 0.16, seg: 12 }); G.ball(0, 0.55, 0, 0.2, leaf); G.ball(0.12, 0.44, 0.05, 0.13, leaf); G.ball(-0.11, 0.47, -0.04, 0.14, leaf); G.ball(0.02, 0.72, 0.02, 0.12, leaf); });
  };
  P.door = function (B, x, y, z, o) {
    o = o || {}; var w = o.w || 0.9, h = o.h || 2, c = m(o.c || '#2f4a4a', { rough: 0.6 }), fr = m(o.frame || '#ece6d8', { rough: 0.6 });
    B.box(x - w / 2, y, z, x + w / 2, y + h, z + 0.04, c); B.box(x - w / 2 - 0.07, y, z, x - w / 2, y + h + 0.07, z + 0.07, fr); B.box(x + w / 2, y, z, x + w / 2 + 0.07, y + h + 0.07, z + 0.07, fr); B.box(x - w / 2 - 0.07, y + h, z, x + w / 2 + 0.07, y + h + 0.07, z + 0.07, fr);
    [0.25, 0.62].forEach(function (f) { B.box(x - w / 2 + 0.1, y + h * f, z + 0.04, x + w / 2 - 0.1, y + h * f + h * 0.3, z + 0.055, c); });
    B.ball(x + w / 2 - 0.12, y + h * 0.5, z + 0.08, 0.035, BRASS());
  };
  P.trim = function (B, R, o) { o = o || {}; var c = m(o.c || '#ece6d8', { rough: 0.6 }), d = R.d; B.box(0, 0, -d + 0.005, R.w, 0.12, -d + 0.03, c); B.box(0.005, 0, -d, 0.03, 0.12, 0, c); B.box(R.w - 0.03, 0, -d, R.w - 0.005, 0.12, 0, c); if (o.rail) B.box(0, o.rail, -d + 0.005, R.w, o.rail + 0.045, -d + 0.03, c); };
  // a frame or plate on the wall that a control panel sits in: o: {w, h, c, depth}
  P.board = function (B, x, y, z, o) { o = o || {}; var w = o.w || 1, h = o.h || 0.6, t = o.t || 0.05; B.box(x - w / 2 - t, y - h / 2 - t, z, x + w / 2 + t, y + h / 2 + t, z + (o.depth || 0.03), m(o.c || '#5a3a22', { metal: o.metal, rough: 0.5, c2: o.c2 || o.c || '#5a3a22', pat: o.pat || 'wood' })); };

  // ---- lights. Each returns the light's id. o: {color, power, range, on, shade, shadow}
  P.lamp = function (B, id, x, y, z, o) {
    o = o || {}; var kind = o.kind || 'table', col = o.color || '#ffd59a', shade = m(o.shade || '#f3e2bd', { emit: o.glow || 3, glow: id, rough: 0.9 }), brass = BRASS();
    // the light first: the shade's glow is tied to it when the shade is built
    var len = o.len || 0.6, ly = kind === 'table' ? y + 0.42 : kind === 'floor' ? y + 1.5 : kind === 'pendant' ? y - len - 0.3 : kind === 'sconce' ? y + 0.15 : y - 0.05;
    var id2 = B.light(id, { at: [x, ly, z + (kind === 'sconce' ? 0.24 : 0) + (o.dz || 0)], color: col, power: o.power == null ? 2.6 : o.power, range: o.range || 6, on: o.on, shadow: o.shadow, flicker: o.flicker });
    if (kind === 'table') { B.lathe(x, y, z, [[0.08, 0], [0.08, 0.02], [0.03, 0.04], [0.025, 0.2], [0.06, 0.26], [0.02, 0.3], [0.012, 0.4]], o.base ? m(o.base, { rough: 0.3 }) : brass, { seg: 12 }); B.lathe(x, y + 0.34, z, [[0.17, 0], [0.1, 0.22]], shade, { seg: 16 }); }
    else if (kind === 'floor') { B.cyl(x, y, z, 0.15, 0.03, brass, { seg: 12 }); B.cyl(x, y, z, 0.018, 1.45, brass, { seg: 8 }); B.lathe(x, y + 1.4, z, [[0.25, 0], [0.14, 0.3]], shade, { seg: 16 }); }
    else if (kind === 'pendant') { B.cyl(x, y - len, z, 0.006, len, m('#111'), { seg: 4 }); B.lathe(x, y - len - 0.22, z, [[0.24, 0], [0.18, 0.08], [0.06, 0.2], [0.03, 0.23]], m(o.shade || '#d8a63a', { emit: o.glow || 2.5, glow: id, rough: 0.5, metal: o.metalShade }), { seg: 16 }); B.ball(x, y - len - 0.2, z, 0.06, m('#fff2d0', { emit: 6, unlit: true, glow: id, noShadow: true })); }
    else if (kind === 'sconce') { B.box(x - 0.05, y - 0.08, z, x + 0.05, y + 0.08, z + 0.03, brass); B.bar([x, y, z + 0.02], [x, y + 0.05, z + 0.16], 0.02, brass); B.lathe(x, y + 0.05, z + 0.16, [[0.07, 0], [0.11, 0.14]], shade, { seg: 12 }); }
    else { B.ball(x, y, z, 0.07, m('#fff2d0', { emit: 6, unlit: true, glow: id, noShadow: true })); }
    return id2;
  };
  // a fire: 'fireplace' (mantel and hearth), 'oven' (a brick bread oven with an arched mouth), 'stove' (an iron range)
  P.hearth = function (B, id, x, y, z, o) {
    o = o || {}; var kind = o.kind || 'fireplace', brick = m(o.brick || '#8a3e2a', { c2: '#3a2a22', pat: 'brick', s: 0.08, rough: 0.9 }), soot = m('#120c0a', { rough: 1 }), iron = P.mats.iron();
    var fy, fz, fw;
    if (kind === 'oven') {
      var w = o.w || 1.6, h = o.h || 1.5, d = o.d || 1.0;
      B.block(x, y, z, w, 0.7, d, brick); B.ball(x, y + 0.7, z, w / 2, brick, { sy: (h - 0.7) / (w / 2), sz: d / w, seg: 18, rings: 10 });
      B.box(x - 0.34, y + 0.72, z + d / 2 - 0.12, x + 0.34, y + 1.08, z + d / 2 + 0.01, soot); B.cyl(x, y + 1.08, z + d / 2 - 0.12, 0.34, 0.13, soot, { axis: 'z', seg: 14 });
      B.box(x - 0.44, y + 0.66, z + d / 2, x + 0.44, y + 0.72, z + d / 2 + 0.12, m('#6a6058', { rough: 0.8 }));
      B.cyl(x, y + h - 0.1, z - 0.1, 0.13, o.flue == null ? 3.2 : o.flue, m('#5b2f22', { pat: 'brick', c2: '#2a1a14', s: 0.07, rough: 0.9 }), { seg: 10 });
      fy = y + 0.73; fz = z + d / 2 + 0.035; fw = 0.5;
    } else if (kind === 'stove') {
      B.block(x, y, z, 1.0, 0.85, 0.6, iron); B.block(x, y + 0.85, z, 1.06, 0.05, 0.66, m('#3a3f44', { metal: 1, rough: 0.35 }));
      B.box(x - 0.22, y + 0.3, z + 0.3, x + 0.22, y + 0.62, z + 0.31, soot); B.cyl(x + 0.3, y + 0.9, z - 0.15, 0.06, 2, iron, { seg: 8 });
      fy = y + 0.31; fz = z + 0.32; fw = 0.3;
    } else {
      var mw = o.w || 1.3; B.block(x, y, z, mw, 1.1, 0.4, m(o.mantel || '#e6dccb', { pat: 'plaster', rough: 0.6 })); B.box(x - mw / 2 - 0.08, y + 1.1, z - 0.2, x + mw / 2 + 0.08, y + 1.16, z + 0.25, m(o.mantel || '#e6dccb', { rough: 0.5 }));
      B.box(x - 0.36, y + 0.06, z + 0.19, x + 0.36, y + 0.72, z + 0.205, soot); B.box(x - mw / 2, y, z + 0.2, x + mw / 2, y + 0.04, z + 0.5, m('#5a4a40', { rough: 0.7 }));
      for (var k = -0.2; k <= 0.21; k += 0.1) B.cyl(x + k, y + 0.06, z + 0.21, 0.02, 0.3, iron, { seg: 6 });
      fy = y + 0.1; fz = z + 0.24; fw = 0.45;
    }
    B.flame({ at: [x, fy, fz], w: o.flameW || fw, h: o.flameH || fw * 1.1, light: id });
    return B.light(id, { at: [x, fy + 0.25, fz + 0.3], color: o.color || '#ff9a4a', power: o.power == null ? 2.4 : o.power, range: o.range || 5, flicker: o.flicker == null ? 0.18 : o.flicker, on: o.on, shadow: o.shadow });
  };

  // ---- small things
  P.loaf = function (B, x, y, z, o) { o = o || {}; var r = o.r || 0.13, c = m(o.c || '#b8732e', { c2: '#e6b46a', pat: 'plaster', rough: 0.75 }); B.ball(x, y + r * 0.42, z, r, c, { sx: o.round ? 1 : 1.5, sy: 0.6, sz: 0.85, seg: 14, rings: 8 }); if (!o.round) for (var k = -1; k <= 1; k++) B.box(x + k * r * 0.45 - 0.008, y + r * 0.8, z - r * 0.4, x + k * r * 0.45 + 0.008, y + r * 0.86, z + r * 0.4, m('#f0d090', { rough: 0.8 })); };
  P.sack = function (B, x, y, z, o) { o = o || {}; var c = m(o.c || '#d8c8a0', { c2: '#b8a880', pat: 'check', s: 0.02, rough: 1 }); B.lathe(x, y, z, [[0.18, 0], [0.24, 0.08], [0.25, 0.3], [0.2, 0.5], [0.08, 0.58], [0.1, 0.66], [0, 0.68]], c, { seg: 14 }); if (o.label) B.box(x - 0.1, y + 0.2, z + 0.245, x + 0.1, y + 0.34, z + 0.25, m(o.label, { rough: 0.9 })); };
  P.crate = function (B, x, y, z, o) { o = o || {}; var s = o.s || 0.45, c = WOOD(o.c || '#a07448'); B.block(x, y, z, s, s * 0.8, s, c); [-1, 1].forEach(function (k) { B.box(x - s / 2 - 0.01, y + s * 0.4 + k * s * 0.25 - 0.03, z - s / 2 - 0.01, x + s / 2 + 0.01, y + s * 0.4 + k * s * 0.25 + 0.03, z + s / 2 + 0.01, WOOD('#7a5232')); }); return y + s * 0.8; };
  P.barrel = function (B, x, y, z, o) { o = o || {}; var c = WOOD(o.c || '#7a4a28'), iron = P.mats.iron(); B.lathe(x, y, z, [[0.22, 0], [0.27, 0.2], [0.28, 0.35], [0.27, 0.5], [0.22, 0.7]], c, { seg: 16 }); [0.08, 0.62].forEach(function (h) { B.cyl(x, y + h, z, 0.255, 0.04, iron, { seg: 16 }); }); B.cyl(x, y + 0.69, z, 0.22, 0.01, c, { seg: 16 }); };
  P.clock = function (B, x, y, z, o) { o = o || {}; var r = o.r || 0.18; B.cyl(x, y, z, r + 0.03, 0.04, BRASS(), { axis: 'z', seg: 20 }); B.cyl(x, y, z + 0.04, r, 0.005, m(o.face || '#f3ecd8', { rough: 0.5 }), { axis: 'z', seg: 20 }); B.bar([x, y, z + 0.05], [x, y + r * 0.7, z + 0.05], 0.012, m('#111')); B.bar([x, y, z + 0.05], [x + r * 0.5, y - r * 0.2, z + 0.05], 0.014, m('#111')); };
  P.radio = function (B, x, y, z, o) { o = o || {}; B.block(x, y, z, 0.42, 0.3, 0.2, WOOD(o.c || '#6a3a1e')); B.box(x - 0.17, y + 0.05, z + 0.1, x + 0.05, y + 0.25, z + 0.105, m('#c8b088', { pat: 'hstripes', c2: '#5a4630', s: 0.02 })); B.cyl(x + 0.11, y + 0.15, z + 0.1, 0.05, 0.01, m(o.dial || '#ffd88a', { emit: 2, glow: o.glow || null, unlit: true }), { axis: 'z', seg: 14 }); };
  // a ceiling fan: a mover (name it with o.name and turn it from the page: D.mover(name).set({ry: angle}))
  P.fan = function (B, x, y, z, o) {
    o = o || {}; var c = o.c ? m(o.c, { metal: 1, rough: 0.4 }) : BRASS(), blade = WOOD(o.blade || '#5a3420');
    B.cyl(x, y - 0.25, z, 0.015, 0.25, c, { seg: 6 });
    return B.mover(function (F) { F.cyl(0, -0.08, 0, 0.09, 0.08, c, { seg: 12 }); for (var i = 0; i < 4; i++) F.group({ ry: i * 90 }, function (G) { G.box(0.08, -0.07, -0.06, o.r || 0.55, -0.06, 0.06, blade); }); }, { at: [x, y - 0.25, z], name: o.name, shadow: false });
  };
  // a rack of trays (bakery, workshop, pantry): returns the y of each tray top
  P.rack = function (B, x, y, z, o) {
    o = o || {}; var w = o.w || 0.9, d = o.d || 0.5, h = o.h || 1.7, n = o.trays || 5, c = o.metal ? m(o.metal, { metal: 1, rough: 0.4 }) : m('#9aa0a6', { metal: 1, rough: 0.35 }), out = [];
    [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { B.box(x + a * w / 2 - 0.015, y, z + b * d / 2 - 0.015, x + a * w / 2 + 0.015, y + h, z + b * d / 2 + 0.015, c); }); });
    for (var i = 0; i < n; i++) { var ty = y + 0.15 + i * (h - 0.25) / (n - 1 || 1); B.box(x - w / 2, ty - 0.02, z - d / 2, x + w / 2, ty, z + d / 2, m(o.tray || '#6a6e72', { metal: 1, rough: 0.5 })); out.push(ty); }
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);

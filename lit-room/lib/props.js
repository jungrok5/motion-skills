/* props.js — the standard props for lit-room: each a function (b, o, room) of the builder kit (lib/lit-room.js).
 * The prop's local origin is o.at (on the floor or a surface), turned by o.rot degrees about y; local +z faces the room.
 * Colours are '#hex' (sRGB). Add your own in the page: LitRoom.prop('name', function (b, o, room) { … }).
 * Every prop here is an example of the kit, not a menu: a topic designs its own when these do not fit.
 */
(function (root) {
  'use strict';
  var LR = root.LitRoom, P = LR.prop;
  function pick(o, k, d) { return o[k] !== undefined ? o[k] : d; }

  // ---- desk: top, legs, an optional drawer block; registers the lit top as a bounce card (room.bounce) unless given
  P('desk', function (b, o, room) {
    var w = pick(o, 'w', 1.4), d = pick(o, 'd', 0.7), h = pick(o, 'h', 0.74), t = pick(o, 'thick', 0.035), c = o.color || '#8a6240';
    b.mat(o.kind || 'wood', c, { rough: 0.4 });
    b.tess = 0.04;
    b.boxAt(-w / 2, h - t, -d / 2, w, t, d, { r: 0.004, seg: 1 });
    b.tess = 0.08;
    b.mat(o.legKind || o.kind || 'wood', o.legs || c);
    var lw = pick(o, 'leg', 0.045), ins = 0.04;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) { b.boxAt(s[0] * (w / 2 - ins) - lw / 2, 0, s[1] * (d / 2 - ins) - lw / 2, lw, h - t, lw); });
    b.boxAt(-w / 2 + ins, h - t - 0.08, -d / 2 + ins, w - 2 * ins, 0.08, 0.02);          // back apron
    if (o.drawers) {
      b.mat(o.kind || 'wood', c);
      b.boxAt(w / 2 - ins - 0.42, h - t - 0.55, -d / 2 + ins, 0.42, 0.55, d - 2 * ins);
      b.mat('metal', o.handle || '#b9b3a8');
      for (var i = 0; i < 3; i++) b.boxAt(w / 2 - ins - 0.26, h - t - 0.1 - i * 0.18, d / 2 - ins, 0.1, 0.012, 0.015);
    }
    if (!room.bounce) room.bounce = { at: b.here([0, h, 0]), w: w, d: d, albedo: c, k: pick(o, 'bounce', 2) };
  });

  // ---- monitor: the screen. w = width of the picture (m); its height follows the page (room.screen.aspect, default 16:9)
  P('monitor', function (b, o, room) {
    var w = pick(o, 'w', 0.6), asp = (room.screen && room.screen.aspect) || 16 / 9, h = w / asp, bz = pick(o, 'bezel', 0.012), dp = pick(o, 'depth', 0.03);
    var lift = pick(o, 'lift', 0.11), cc = o.color || '#1a1b1e';
    b.noScreenCast = true;   // the monitor does not shadow its own light
    b.at(function () {
      b.move(0, lift + h / 2 + bz, 0); b.rotX(-pick(o, 'tilt', 4));
      b.tess = 0.05;
      b.mat('plastic', cc, { rough: 0.35, spec: 0.5 });
      b.boxAt(-w / 2 - bz, -h / 2 - bz * (o.chin ? 2.2 : 1), -dp, w + 2 * bz, h + bz * (o.chin ? 3.2 : 2), dp, { r: 0.004, seg: 1 });
      b.mat('plastic', o.back || cc, { rough: 0.5 });
      b.at(function () { b.move(0, 0, -dp - 0.012); b.box(w * 0.45, h * 0.45, 0.025, { r: 0.008 }); });
      b.tess = 0.03;
      b.mat('screen', '#000000');
      b.at(function () { b.move(0, 0, 0.0012); b.quad([-w / 2, -h / 2, 0], [w, 0, 0], [0, h, 0], { ao: false }); b.screen(w, h); });
    });
    b.tess = 0.04;
    b.mat(o.standKind || 'metal', o.stand || '#2a2b2e', { rough: 0.45 });
    if ((o.mount || 'foot') === 'foot') {
      b.boxAt(-0.025, 0, -dp - 0.05, 0.05, lift + h * 0.5, 0.022, { r: 0.006 });
      b.at(function () { b.move(0, 0.006, -dp - 0.03); b.box(0.26, 0.012, 0.19, { r: 0.006 }); });
    }
    b.noScreenCast = false;
  });

  // ---- keyboard: real rows of keys, each answering to its KeyboardEvent.code (they sink while you type on the page)
  var ROWS = [
    [['Backquote', '`'], ['Digit1', '1'], ['Digit2', '2'], ['Digit3', '3'], ['Digit4', '4'], ['Digit5', '5'], ['Digit6', '6'], ['Digit7', '7'], ['Digit8', '8'], ['Digit9', '9'], ['Digit0', '0'], ['Minus', '-'], ['Equal', '='], ['Backspace', '⌫', 2]],
    [['Tab', 'tab', 1.5], ['KeyQ'], ['KeyW'], ['KeyE'], ['KeyR'], ['KeyT'], ['KeyY'], ['KeyU'], ['KeyI'], ['KeyO'], ['KeyP'], ['BracketLeft', '['], ['BracketRight', ']'], ['Backslash', '\\', 1.5]],
    [['CapsLock', 'caps', 1.75], ['KeyA'], ['KeyS'], ['KeyD'], ['KeyF'], ['KeyG'], ['KeyH'], ['KeyJ'], ['KeyK'], ['KeyL'], ['Semicolon', ';'], ['Quote', "'"], ['Enter', 'return', 2.25]],
    [['ShiftLeft', 'shift', 2.25], ['KeyZ'], ['KeyX'], ['KeyC'], ['KeyV'], ['KeyB'], ['KeyN'], ['KeyM'], ['Comma', ','], ['Period', '.'], ['Slash', '/'], ['ShiftRight', 'shift', 2.75]],
    [['ControlLeft', 'ctrl', 1.25], ['AltLeft', 'alt', 1.25], ['MetaLeft', 'cmd', 1.5], ['Space', '', 6.5], ['MetaRight', 'cmd', 1.5], ['AltRight', 'alt', 1.25], ['ArrowLeft', '←', 1], ['ArrowRight', '→', 1]]
  ];
  P('keyboard', function (b, o) {
    var U = pick(o, 'unit', 0.0182), W = 15 * U, D = 5 * U, deck = o.color || '#c9c6bf', cap = o.keys || '#ecebe6', ink = o.legend || '#4a4844';
    b.tess = 0.03;
    b.mat('plastic', deck, { rough: 0.45 });
    b.boxAt(-W / 2 - 0.008, 0, -D / 2 - 0.008, W + 0.016, 0.012, D + 0.016, { r: 0.003, seg: 1 });
    var keys = []; ROWS.forEach(function (row) { row.forEach(function (k) { keys.push(k); }); });
    var CELL = 64, cols = 16, rect = b.atlas(cols * CELL, Math.ceil(keys.length / cols) * CELL, function (g, w, h) {
      g.clearRect(0, 0, w, h); g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
      keys.forEach(function (k, i) {
        var t = k[1] !== undefined ? k[1] : k[0].replace('Key', ''), x = (i % cols) * CELL + CELL / 2, y = Math.floor(i / cols) * CELL + CELL / 2;
        g.font = (t.length > 1 ? '600 15px ' : '600 26px ') + 'ui-sans-serif, system-ui, sans-serif'; g.fillText(t, x, y);
      });
    });
    var du = (rect[2] - rect[0]) / cols * (CELL / CELL), cellV = (rect[3] - rect[1]) / Math.ceil(keys.length / cols), n = 0;
    b.tess = 0.02;
    ROWS.forEach(function (row, ri) {
      var x = -W / 2, z = -D / 2 + (ri + 0.5) * U;
      row.forEach(function (k) {
        var kw = (k[2] || 1) * U, i = n++, cu = rect[0] + (i % cols) * du, cv = rect[1] + Math.floor(i / cols) * cellV;
        // the legend cell is square: map the cap's top onto its centre so wide keys keep round letters
        var sw = (k[2] || 1), half = 0.5 / sw;
        b.mat('keycap', cap, { key: b.keyId(k[0]), rough: 0.5 });
        b.at(function () { b.move(x + kw / 2, 0.012 + 0.0045, z); b.box(kw - U * 0.12, 0.009, U * 0.88, { r: 0.0018, seg: 1, decal: { face: 'Y', rect: [cu + du * (0.5 - half), cv, cu + du * (0.5 + half), cv + cellV] }, ao: false }); });
        x += kw;
      });
    });
    b.occluder([-W / 2, 0, -D / 2], [W / 2, 0.022, D / 2]);
  });

  // ---- mouse on an optional pad
  P('mouse', function (b, o) {
    if (o.pad !== false) { b.mat('rubber', o.pad || '#2d2f33'); b.tess = 0.05; b.box(0.26, 0.003, 0.21, { r: 0.0015, seg: 1, ao: false }); b.move(0, 0.003, 0); }
    b.mat('plastic', o.color || '#e8e6e1', { rough: 0.3 });
    b.at(function () { b.scale(0.032, 0.018, 0.055); b.sphere(1, { rings: 10, seg: 18, ao: false }); });
    b.occluder([-0.032, 0, -0.055], [0.032, 0.02, 0.055]);
  });

  // ---- mug (with a drink)
  P('mug', function (b, o) {
    var r = pick(o, 'r', 0.04), h = pick(o, 'h', 0.095), wall = 0.005;
    b.tess = 0.015;
    b.mat('ceramic', o.color || '#e9e4da');
    b.lathe([[0, 0], [r * 0.9, 0], [r, 0.008], [r, h], [r - wall, h + 0.001], [r - wall, 0.014], [0, 0.014]], { seg: 28 });
    if (o.drink !== false) { b.mat('ceramic', o.drink || '#2a170c', { rough: 0.08 }); b.at(function () { b.move(0, h * 0.78, 0); b.cyl(r - wall - 0.0005, 0.002, { seg: 24, ao: false }); }); }
    b.mat('ceramic', o.color || '#e9e4da');
    var pts = []; for (var i = 0; i <= 12; i++) { var a = -Math.PI / 2 + Math.PI * i / 12; pts.push([r + Math.cos(a) * 0.026, h * 0.5 + Math.sin(a) * 0.03, 0]); }
    b.tube(pts, 0.0055, { seg: 8 });
  });

  // ---- a row of books along x (o.n books, o.colors, standing; o.lean tilts the last one)
  P('books', function (b, o) {
    var colors = o.colors || ['#6d2e2a', '#2f4a5c', '#c9b48a', '#3d5a3a', '#7a6a58', '#1f2a36'], x = 0, n = pick(o, 'n', 8);
    b.tess = 0.04;
    for (var i = 0; i < n; i++) {
      var t = 0.018 + b.r() * 0.022, h = (o.h || 0.22) * (0.78 + b.r() * 0.3), d = (o.d || 0.15) * (0.85 + b.r() * 0.15), c = colors[Math.floor(b.r() * colors.length)];
      b.mat(b.r() < 0.3 ? 'fabric' : 'paper', c, { rough: 0.7 });
      var lean = (i === n - 1 && o.lean) ? o.lean : 0;
      (function (x0, t0, h0, d0, l0) { b.at(function () { b.move(x0 + t0 / 2 + (l0 ? Math.sin(l0 * Math.PI / 180) * h0 / 2 : 0), 0, 0); b.rotZ(-l0); b.move(0, h0 / 2, 0); b.box(t0, h0, d0, { r: 0.002, seg: 1 }); }); })(x, t, h, d, lean);
      x += t + 0.002;
    }
  });
  // ---- a stack of books lying flat
  P('bookStack', function (b, o) {
    var colors = o.colors || ['#7b3b2c', '#d8cfb9', '#30475e'], y = 0;
    for (var i = 0; i < pick(o, 'n', 3); i++) {
      var t = 0.025 + b.r() * 0.02, w = (o.w || 0.22) * (0.85 + b.r() * 0.2), d = (o.d || 0.16) * (0.85 + b.r() * 0.2);
      b.mat('paper', colors[i % colors.length]);
      (function (y0, t0, w0, d0, a) { b.at(function () { b.move(0, y0 + t0 / 2, 0); b.rotY(a); b.box(w0, t0, d0, { r: 0.002, seg: 1 }); }); })(y, t, w, d, (b.r() - 0.5) * 14);
      y += t;
    }
  });

  // ---- potted plant: pot, soil, leaves on stems (deterministic scatter)
  P('plant', function (b, o) {
    var r = pick(o, 'r', 0.06), h = pick(o, 'h', 0.09), n = pick(o, 'leaves', 14), s = pick(o, 'size', 0.14);
    b.tess = 0.02;
    b.mat(o.potKind || 'ceramic', o.pot || '#b5644a', { rough: 0.6 });
    b.lathe([[0, 0], [r * 0.78, 0], [r, h], [r * 1.05, h], [r * 1.05, h + 0.012], [r * 0.95, h + 0.012], [r * 0.9, h * 0.6]], { seg: 24 });
    b.mat('soil', '#2b1d14'); b.at(function () { b.move(0, h * 0.85, 0); b.cyl(r * 0.94, 0.002, { ao: false }); });
    b.mat('leaf', o.leaf || '#4f7a3a', { twoSided: true });
    for (var i = 0; i < n; i++) {
      var a = i * 137.5 + b.r() * 20, tilt = 15 + b.r() * 50, l = s * (0.6 + b.r() * 0.6);
      (function (a0, t0, l0, c0) { b.at(function () { b.move(0, h * 0.85, 0); b.rotY(a0); b.rotX(t0 * 0.6); b.leaf(l0, l0 * 0.45, 0.9 + c0, {}); }); })(a, tilt, l, b.r());
    }
    b.occluder([-r, 0, -r], [r, h + s * 0.8, r]);
  });

  // ---- a framed picture on a wall. o.paint(g, w, h, rng) paints the picture with Canvas 2D (the topic designs it)
  P('frame', function (b, o) {
    var w = pick(o, 'w', 0.5), h = pick(o, 'h', 0.4), f = pick(o, 'border', 0.03), mat = pick(o, 'mat', 0.04), dpth = 0.025;
    b.tess = 0.05;
    b.mat(o.frameKind || 'wood', o.frame || '#2b2420');
    b.boxAt(-w / 2, -h / 2, 0, w, f, dpth); b.boxAt(-w / 2, h / 2 - f, 0, w, f, dpth);
    b.boxAt(-w / 2, -h / 2 + f, 0, f, h - 2 * f, dpth); b.boxAt(w / 2 - f, -h / 2 + f, 0, f, h - 2 * f, dpth);
    b.mat('paper', o.matColor || '#ece6da'); b.quad([-w / 2 + f, -h / 2 + f, 0.006], [w - 2 * f, 0, 0], [0, h - 2 * f, 0], { ao: false });
    var aw = w - 2 * f - 2 * mat, ah = h - 2 * f - 2 * mat, px = 700;
    var rect = b.atlas(aw * px, ah * px, o.paint || function (g, W, H, rnd) { g.fillStyle = '#c86b4a'; g.fillRect(0, 0, W, H); g.fillStyle = '#2f4858'; g.beginPath(); g.arc(W * 0.5, H * 0.55, H * 0.3, 0, 7); g.fill(); });
    b.mat('art', '#ffffff');
    // atlas v runs down the picture: the quad goes from its top-left corner
    b.quad([-aw / 2, ah / 2, 0.008], [aw, 0, 0], [0, -ah, 0], { ao: false, decal: rect, flip: true });
  });

  // ---- shelf: a board on two brackets (things on it are separate props)
  P('shelf', function (b, o) {
    var w = pick(o, 'w', 0.9), d = pick(o, 'd', 0.22), t = pick(o, 'thick', 0.025);
    b.tess = 0.05;
    b.mat(o.kind || 'wood', o.color || '#9a7652'); b.boxAt(-w / 2, -t, 0, w, t, d, { r: 0.003, seg: 1 });
    b.mat('metal', o.brackets || '#2c2c2c');
    [-1, 1].forEach(function (s) { b.boxAt(s * (w / 2 - 0.12) - 0.008, -t - 0.12, 0, 0.016, 0.12, 0.012); b.boxAt(s * (w / 2 - 0.12) - 0.008, -t - 0.012, 0, 0.016, 0.012, d * 0.8); });
  });

  // ---- desk lamp: base, two arms, a shade, a bulb, and its light (o.name, o.color, o.power, o.on)
  P('deskLamp', function (b, o) {
    var c = o.body || '#2f3a3a', reach = pick(o, 'reach', 0.22), hgt = pick(o, 'height', 0.36);
    b.tess = 0.02;
    b.mat('metal', c, { rough: 0.35 });
    b.cyl(0.07, 0.018, { seg: 28 });
    var j1 = [0, 0.018, 0], j2 = [0.02, hgt, -0.03], j3 = [reach, hgt + 0.03, 0.01];
    b.tube([j1, j2], 0.007); b.tube([j2, j3], 0.007);
    b.at(function () {
      b.move(j3[0], j3[1], j3[2]); b.rotZ(-pick(o, 'aim', 30));
      b.mat('metal', o.shade || c, { rough: 0.3, twoSided: true });
      b.lathe([[0.012, 0.03], [0.03, 0.01], [0.075, -0.06]], { seg: 28, ao: false });
      b.mat('glow', o.color || '#ffd8a8', { power: 6, noCast: true, lamp: true });
      b.at(function () { b.move(0, -0.02, 0); b.sphere(0.022, { ao: false }); });
      b.move(0, -0.035, 0);
      b.light({ name: o.name || 'desk lamp', color: o.color || '#ffcf96', power: pick(o, 'power', 0.9), cone: pick(o, 'cone', 105), soft: 28, glow: 0.06, size: 0.04, shadow: true, on: o.on !== false, dir: [0, -1, 0] });
    });
  });

  // ---- pendant lamp hanging from the ceiling (o.at = the point on the ceiling)
  P('pendant', function (b, o) {
    var drop = pick(o, 'drop', 0.7), r = pick(o, 'r', 0.17);
    b.tess = 0.03;
    b.mat('rubber', '#111111'); b.tube([[0, 0, 0], [0, -drop, 0]], 0.003);
    b.move(0, -drop, 0);
    b.mat(o.shadeKind || 'fabric', o.shade || '#e9dcc4', { twoSided: true });
    b.lathe([[0.03, 0.02], [r * 0.55, -0.02], [r, -0.16]], { seg: 32, ao: false });
    b.mat('glow', o.color || '#ffd9a8', { power: 8, noCast: true, lamp: true }); b.at(function () { b.move(0, -0.06, 0); b.sphere(0.03, { ao: false }); });
    b.move(0, -0.07, 0);
    b.light({ name: o.name || 'pendant', color: o.color || '#ffd9a8', power: pick(o, 'power', 1.6), cone: 120, soft: 40, glow: pick(o, 'glow', 0.35), size: 0.08, shadow: o.shadow !== false, on: o.on !== false, dir: [0, -1, 0] });
  });

  // ---- lantern: brass cap and foot, a glass chimney, a candle flame; flickers (no shadow: it shines every way)
  P('lantern', function (b, o) {
    var h = pick(o, 'h', 0.24), r = pick(o, 'r', 0.055), br = o.metal || '#b08a46';
    b.tess = 0.02;
    b.mat('brass', br);
    b.lathe([[0, 0], [r * 1.15, 0], [r * 1.15, 0.025], [r * 0.95, 0.03], [0, 0.03]], { seg: 24 });
    b.at(function () { b.move(0, h - 0.04, 0); b.lathe([[0, 0], [r, 0], [r * 1.1, 0.012], [r * 0.5, 0.05], [0.012, 0.06], [0, 0.06]], { seg: 24 }); });
    for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2 + Math.PI / 4; b.tube([[Math.cos(a) * r, 0.03, Math.sin(a) * r], [Math.cos(a) * r, h - 0.04, Math.sin(a) * r]], 0.003); }
    var ring = []; for (i = 0; i <= 16; i++) { var aa = Math.PI * i / 16; ring.push([Math.cos(aa) * 0.035, h + 0.02 + Math.sin(aa) * 0.035, 0]); } b.tube(ring, 0.003);
    b.mat('paper', '#f2ead8'); b.at(function () { b.move(0, 0.03, 0); b.cyl(0.012, h * 0.35, { seg: 12 }); });
    b.mat('glow', o.flame || '#ffb04a', { power: 14, noCast: true, lamp: true });
    b.at(function () { b.move(0, 0.03 + h * 0.35 + 0.018, 0); b.scale(0.008, 0.018, 0.008); b.sphere(1, { ao: false }); });
    b.mat('glass', '#ffffff'); b.at(function () { b.move(0, 0.03, 0); b.cyl(r * 0.85, h - 0.07, { open: true, seg: 24, ao: false }); });
    b.move(0, 0.03 + h * 0.35 + 0.02, 0);
    b.light({ name: o.name || 'lantern', color: o.color || '#ffae5c', power: pick(o, 'power', 0.5), cone: 359, soft: 1, glow: 1, size: 0.02, shadow: false, on: o.on !== false, flicker: pick(o, 'flicker', 0.12) });
  });

  // ---- rug: a thin mat; o.paint(g, w, h, rng) paints its pattern, else stripes from o.colors
  P('rug', function (b, o) {
    var w = pick(o, 'w', 2), d = pick(o, 'd', 1.3);
    var rect = b.atlas(Math.min(1024, w * 300), Math.min(1024, d * 300), o.paint || function (g, W, H) {
      var cs = o.colors || ['#7a2e2a', '#d9c9a8', '#2f4a5c']; g.fillStyle = cs[0]; g.fillRect(0, 0, W, H);
      g.strokeStyle = cs[1]; g.lineWidth = H * 0.04; g.strokeRect(H * 0.06, H * 0.06, W - H * 0.12, H - H * 0.12);
      g.fillStyle = cs[2]; for (var i = 0; i < 5; i++) g.fillRect(W * 0.2 + i * W * 0.13, H * 0.3, W * 0.05, H * 0.4);
    });
    b.tess = 0.1;
    b.mat('rug', '#ffffff');
    b.quad([-w / 2, 0.004, -d / 2], [0, 0, d], [w, 0, 0], { ao: false, uv: function (u, v) { return [rect[0] + (rect[2] - rect[0]) * v, rect[1] + (rect[3] - rect[1]) * u]; } });
  });

  // ---- curtains: two folded panels on a rod (o.w = rod width, o.h = drop from the rod, o.open 0..1)
  P('curtains', function (b, o) {
    var w = pick(o, 'w', 1.6), h = pick(o, 'h', 1.8), open = pick(o, 'open', 0.7), folds = pick(o, 'folds', 7);
    b.tess = 0.04;
    b.mat('metal', o.rod || '#3a3530'); b.tube([[-w / 2 - 0.05, 0, 0.06], [w / 2 + 0.05, 0, 0.06]], 0.01);
    b.mat('fabric', o.color || '#7d3b32', { twoSided: true });
    [-1, 1].forEach(function (s) {
      var pw = w / 2 * (1 - open * 0.75);
      var steps = Math.ceil(folds * 6);
      var us = [], vs = []; for (var i = 0; i <= steps; i++) us.push(i / steps); for (i = 0; i <= 14; i++) vs.push(i / 14);
      b.grid(us, vs, function (u, v) {
        var x = s * (w / 2 - u * pw * (1 - 0.15 * v * v)), y = -0.02 - v * h, ph = u * folds * Math.PI * 2;
        var z = 0.05 + Math.sin(ph) * 0.035 * (1 + 0.4 * v), dz = Math.cos(ph) * 0.035 * folds * Math.PI * 2 / pw;
        var n = [s * -dz * 0.2, 0, 1]; var l = Math.hypot(n[0], n[2]);
        return [x, y, z, n[0] / l, 0, n[2] / l];
      }, { ao: false });
    });
  });

  // ---- chair
  P('chair', function (b, o) {
    var sh = pick(o, 'seat', 0.46), c = o.color || '#3b3f46', f = o.frame || '#25272b';
    b.tess = 0.05;
    b.mat(o.seatKind || 'fabric', c); b.at(function () { b.move(0, sh, 0); b.box(0.46, 0.06, 0.44, { r: 0.02 }); });
    b.at(function () { b.move(0, sh + 0.32, -0.2); b.rotX(-8); b.box(0.44, 0.42, 0.05, { r: 0.02 }); });
    b.mat('metal', f);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) { b.tube([[s[0] * 0.19, sh - 0.03, s[1] * 0.17], [s[0] * 0.22, 0, s[1] * 0.21]], 0.012, { ao: true }); });
    b.occluder([-0.23, 0, -0.22], [0.23, sh, 0.22]);
  });

  // ---- crate / plain box (o.size [w,h,d]); slats when o.slats
  P('crate', function (b, o) {
    var s = o.size || [0.45, 0.35, 0.35], c = o.color || '#9c7a52';
    b.tess = 0.05;
    b.mat(o.kind || 'wood', c); b.boxAt(-s[0] / 2, 0, -s[2] / 2, s[0], s[1], s[2], { r: pick(o, 'r', 0.004), seg: 1 });
    if (o.slats !== false && (o.kind || 'wood') === 'wood') {
      b.mat('wood', o.trim || c);
      for (var i = 0; i < 3; i++) b.boxAt(-s[0] / 2 - 0.004, s[1] * (0.15 + i * 0.33), s[2] / 2 - 0.002, s[0] + 0.008, 0.012, 0.008);
    }
  });

  // ---- bunk / bed: frame, mattress, blanket, pillow (o.w along x, o.d along z)
  P('bunk', function (b, o) {
    var w = pick(o, 'w', 1.9), d = pick(o, 'd', 0.8), h = pick(o, 'h', 0.42);
    b.tess = 0.08;
    b.mat('wood', o.wood || '#6b4a30'); b.boxAt(-w / 2, 0, -d / 2, w, h - 0.14, d, { r: 0.006, seg: 1 });
    if (o.rail !== false) b.boxAt(-w / 2, h - 0.14, d / 2 - 0.04, w, 0.2, 0.04, { r: 0.006, seg: 1 });
    b.mat('fabric', o.mattress || '#d9d2c4'); b.at(function () { b.move(0, h - 0.07, 0); b.box(w - 0.04, 0.14, d - 0.06, { r: 0.04 }); });
    b.mat('fabric', o.blanket || '#3b5068'); b.at(function () { b.move(w * 0.12, h + 0.01, 0); b.box(w * 0.74, 0.04, d - 0.02, { r: 0.018 }); });
    b.mat('fabric', o.pillow || '#ece6da'); b.at(function () { b.move(-w / 2 + 0.25, h + 0.04, 0); b.box(0.36, 0.09, d * 0.7, { r: 0.04 }); });
  });

  // ---- porthole: a brass ring over a square hole in a wall (give the shell a hole of side 2r at the same place)
  P('porthole', function (b, o) {
    var r = pick(o, 'r', 0.22), s = r * 1.0, br = o.metal || '#b08a46';
    b.tess = 0.02;
    b.mat(o.plateKind || 'wood', o.plate || '#6b4a30');
    // a square plate with a round hole: rays from the circle out to the square
    b.grid((function () { var a = []; for (var i = 0; i <= 48; i++) a.push(i / 48); return a; })(), [0, 0.5, 1], function (u, v) {
      var a = u * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), sq = s / Math.max(Math.abs(c), Math.abs(sn)), rr = r * 0.98 + (sq - r * 0.98) * v;
      return [c * rr, sn * rr, 0.004, 0, 0, 1];
    }, { ao: false });
    b.mat('brass', br);
    var ring = []; for (var i = 0; i <= 40; i++) { var a = Math.PI * 2 * i / 40; ring.push([Math.cos(a) * r, Math.sin(a) * r, 0.012]); }
    b.tube(ring, pick(o, 'rim', 0.022), { seg: 10 });
    for (i = 0; i < 6; i++) { var aa = i / 6 * Math.PI * 2 + 0.3; b.at(function () { b.move(Math.cos(aa) * (r + 0.045), Math.sin(aa) * (r + 0.045), 0.006); b.rotX(90); b.cyl(0.01, 0.012, { seg: 10, ao: false }); }); }
  });

  // ---- notebook / sheet of paper: a thin block; o.lines draws ruled lines; o.paint for your own
  P('paper', function (b, o) {
    var w = pick(o, 'w', 0.21), d = pick(o, 'd', 0.29), t = pick(o, 'thick', 0.006);
    var rect = b.atlas(w * 1200, d * 1200, o.paint || function (g, W, H) {
      g.fillStyle = o.color || '#f1ebdd'; g.fillRect(0, 0, W, H);
      if (o.lines !== false) { g.strokeStyle = 'rgba(70,90,140,.35)'; g.lineWidth = 2; for (var y = H * 0.12; y < H; y += H / 24) { g.beginPath(); g.moveTo(W * 0.06, y); g.lineTo(W * 0.94, y); g.stroke(); } }
    });
    b.tess = 0.04;
    b.mat('paper', '#ffffff');
    b.box(w, t, d, { decal: { face: 'Y', rect: rect }, ao: false });
    if (o.cover) { b.mat('paper', o.cover); b.at(function () { b.move(0, -t / 2 - 0.0015, 0); b.box(w + 0.004, 0.003, d + 0.004, { ao: false }); }); }
  });

  // ---- cable: a tube through points (local)
  P('cable', function (b, o) { b.mat('rubber', o.color || '#151515'); b.tess = 0.03; b.tube(o.points, pick(o, 'r', 0.004), { seg: 6 }); });
  // ---- beam / board / any plain box (o.size [w,h,d], o.kind, o.color, o.r)
  P('block', function (b, o) { var s = o.size || [1, 0.1, 0.1]; b.tess = pick(o, 'tess', 0.08); b.mat(o.kind || 'wood', o.color || '#5b3d26', o.mat); b.box(s[0], s[1], s[2], { r: o.r || 0, seg: 1, ao: o.ao }); });
  // ---- a little cylinder thing (jar, candle, tin, pen pot): o.r, o.h, o.kind, o.color
  P('tin', function (b, o) { b.tess = 0.02; b.mat(o.kind || 'metal', o.color || '#8a8f96', o.mat); b.cyl(pick(o, 'r', 0.035), pick(o, 'h', 0.1), { seg: 22, r2: o.r2 }); });
})(typeof window !== 'undefined' ? window : globalThis);

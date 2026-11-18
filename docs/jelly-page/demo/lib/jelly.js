/* jelly.js — a live web page set in a slab of jelly (HTML-in-Canvas + WebGL2).
 *
 * The page is ordinary DOM inside <canvas layoutsubtree content="drawable">. lib/hic.js hands its pixels to WebGL as a
 * texture; this engine draws them as candy letters hanging inside a moulded, wobbling jelly that stands on a plate on a
 * tablecloth, lit by an imagined room. You press and pull the jelly and it wobbles; the page under it stays clickable,
 * typeable and selectable where it is drawn, because the page is placed for hit testing with the warp's local affine at
 * the pointer (S.placeLocal) on every pointer move.
 *
 *   var J = JELLY.create({ canvas, page, mould: {…}, flavours: {…}, table: {…}, plate: {…}, room: {…}, bits: {…} });
 *   J.setFlavour('lime'); J.setTemperature(0.3); J.drop(); J.poke(ex, ey, 1); J.sound.toggle();
 *
 * Every option is documented in DEFAULTS below and in references/ENGINE.md. Nothing here is topic-specific: the page
 * HTML, its controls, the flavours, the mould, the cloth, the plate, the room, the bits set in the jelly and the sound
 * are given by the page's config.
 *
 * Pieces, in order:
 *   1 colour helpers         hex → linear RGB, absorption from a seen colour
 *   2 DEFAULTS               the config, with comments
 *   3 the mould              outline signed distance, flutes, tiers, dome → a height field (CPU, mip-mapped to a texture)
 *   4 the wobble             a displacement field on a grid (springs + waves + volume coupling) plus whole-body modes
 *   5 the camera             a tilted view that fits the plate, leans toward the pointer, goes top-down when melted
 *   6 the shaders            table + plate + coloured shadow (full-screen pass), and the jelly mesh (refraction, candy
 *                            letters with side walls, bits, room reflections, gloss)
 *   7 mapping                pointer ray → displaced surface → refraction → page pixel (for hit testing and screenOf)
 *   8 interaction            grab and pull, poke on press, tremble on brush, jiggle on typing, drop, temperature, flavour
 *   9 stills and acts        #still=<s>&act=pull|release|drop|poke|melt|set|type for deterministic pictures and checks
 *  10 create()               the public object
 *
 * Needs lib/hic.js (window.HIC) and, for sound, lib/squelch.js (window.SQUELCH). No network, no dependencies.
 */
(function (root) {
  'use strict';
  var HIC = root.HIC;
  var JELLY = { version: '1.0.0' };

  // ================================================================== 1 colour helpers
  function hex(h) {
    h = String(h || '#000').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
  }
  function lin(h) { return hex(h).map(function (c) { return Math.pow(c, 2.2); }); }
  // Absorption per unit length so that white light through `depth` units of jelly comes out as colour h (Beer–Lambert).
  function sigmaOf(h, depth) { return lin(h).map(function (c) { return -Math.log(Math.max(c, 0.004)) / depth; }); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  JELLY.color = { hex: hex, lin: lin, sigmaOf: sigmaOf };

  // ================================================================== 2 DEFAULTS
  // World units: the page's long side is 2.5 units. x right, y away from the viewer, z up; the table is z = 0.
  var DEFAULTS = {
    // the mould: the jelly's outline and profile
    mould: {
      shape: 'rect',        // 'rect' (rounded rectangle) or 'oval' (ellipse; 'round' when the page is square)
      margin: [0.46, 0.44], // jelly beyond the page on each side (x, y), world units; keep ≥ shoulder + flute
      corner: 0.36,         // corner radius ('rect')
      height: 0.56,         // height of the set jelly
      shoulder: 0.34,       // how far in from the foot the side rises to the flat top
      flutes: 8,            // flutes per quarter outline ('rect') or around the whole outline ('oval': × 4)
      fluteDepth: 0.075,    // how deep the flutes cut into the foot
      tiers: 1,             // 1 = one smooth shoulder; 2–3 = a stepped, terraced side like an old copper mould
      dome: 0.012           // how much the top swells in the middle (fraction of height)
    },
    // the jelly as a material
    material: {
      ior: 1.34,            // refraction index
      depth: 0.5,           // the flavour colour is what white light looks like through this much jelly
      firmHz: 3.1,          // whole-body wobble frequency when cold and firm
      softHz: 1.35,         // … when warm and loose, just before it melts
      damping: [0.07, 0.1],    // damping ratio firm → loose
      pageDepth: 0.085,     // how far under the top the page hangs
      ink: 0.07,            // how thick the candy letters are
      bend: 1.5             // how much the top leans more than the waist (displacement × (h/H)^bend)
    },
    // flavours: name → { jelly: colour seen through `depth` of it, glow: light scattered inside, bits: [two colours],
    // cloth: tablecloth colour for this flavour (optional) }
    flavours: {
      raspberry: { jelly: '#d8183a', glow: '#ff3a3a', bits: ['#5a0614', '#ffb3c0'], cloth: '#8fcdb8' }
    },
    flavour: null,          // the starting flavour (default: the first)
    candy: '#fff1dc',       // dark ink on the page turns into this candy colour inside the jelly
    paper: '#f3ede2',       // the colour behind the page when it has melted flat (and of the fallback page)
    // the table under the plate
    table: {
      pattern: 'gingham',   // 'gingham', 'stripes', 'dots', 'linen' or 'wood'
      base: '#f1eee6',      // the ground colour of the cloth (the flavour's `cloth` is the pattern colour)
      colour: null,         // pattern colour when the flavour has none
      scale: 0.26,          // pattern period, world units
      angle: 0.0            // pattern rotation, radians
    },
    // the plate the jelly stands on
    plate: {
      kind: 'glass',        // 'glass' (clear, tinted rim, refracts the cloth) or 'china' (white glaze, coloured band)
      shape: 'rect',        // 'rect' or 'round' (follows the mould when omitted)
      margin: 0.36,         // plate beyond the jelly's foot
      corner: 0.9,          // corner radius ('rect')
      band: '#2f6f9f',      // the painted band on a china plate
      tint: '#cfe9df'       // the green of thick glass at the lip
    },
    // the room seen only in reflections, and the light it throws
    room: {
      window: '#fff4e2',    // daylight through the window behind the jelly
      panes: [3, 2],        // window panes across, down
      lamp: '#ffd9a0',      // a pendant lamp overhead
      wall: '#9c978e',      // walls and ceiling, dim
      light: [-0.45, 0.62, 0.66], // the key light (the window), a direction toward it
      pool: true            // a soft pool of window light across the table
    },
    // things set in the jelly under the page
    bits: {
      kind: 'fruit',        // 'fruit' (lit balls in the flavour's two bit colours), 'bubbles' (air), 'mixed', 'none'
      count: 14,
      size: [0.07, 0.12],   // radius range
      seed: 7,
      colours: null         // optional list of colours (overrides the flavour's bits, e.g. sprinkles)
    },
    sound: { pitch: 1, wet: 1, volume: 0.55 }, // lib/squelch.js voice; see references/ENGINE.md
    soundButton: null,      // an element outside the canvas that toggles sound (text is set to "Sound on/off")
    temperature: 0.18,      // 0 cold and firm … 0.72 loose … 1 melted flat
    intro: true,            // live pages start melted and set into jelly (skipped for #still, #calm)
    tilt: 42,               // degrees the view tips from straight down
    fill: 0.9,              // how much of the window the plate fills
    actPoint: [0.62, -0.62],// where acts grab / poke, as a fraction of the page half-size (x, y)
    mesh: 150,              // jelly mesh cells across the long side
    grid: 56,               // wobble grid cells across the long side
    upload: 1.5             // page texture resolution × on-screen size × devicePixelRatio (capped 1…2.5)
  };
  JELLY.DEFAULTS = DEFAULTS;
  function merge(a, b) {
    var o = {}, k;
    for (k in a) o[k] = a[k];
    for (k in (b || {})) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) && k !== 'flavours') o[k] = merge(a[k], b[k]);
      else if (b[k] !== undefined) o[k] = b[k];
    }
    return o;
  }

  // ================================================================== 3 the mould
  // Mould(cfg, PW, PH) → { A, B (outline half size), DX, DY (simulated area), H0, sd(x,y), height(x,y), hw, hh, hdata }
  function Mould(mc, PW, PH) {
    var M = { H0: mc.height };
    var oval = mc.shape === 'oval' || mc.shape === 'round';
    // the page must lie under the flat top: the margin is never less than the shoulder plus the flutes
    var need = mc.shoulder + mc.fluteDepth + 0.03, mx = Math.max(mc.margin[0], need), my = Math.max(mc.margin[1], need);
    if (oval) { M.A = PW * Math.SQRT2 + mx; M.B = PH * Math.SQRT2 + my; }   // an ellipse through the page's corners, plus margin
    else { M.A = PW + mx; M.B = PH + my; }
    var A = M.A, B = M.B, RC = Math.min(mc.corner, Math.min(A, B) * 0.9);
    var LQ = (A - RC) + RC * Math.PI / 2 + (B - RC);       // a quarter of the rounded rectangle's outline
    var NF = Math.max(0, mc.flutes | 0), FL = mc.fluteDepth, W = mc.shoulder, H0 = mc.height;
    M.DX = A + 0.16; M.DY = B + 0.16;
    // signed distance to the plain outline (negative inside) and where along it a point lies (for the flutes)
    function base(x, y) {
      var ax = Math.abs(x), ay = Math.abs(y);
      if (oval) {
        var k = Math.hypot(ax / A, ay / B);
        var d = (k - 1) * Math.min(A, B) * (0.6 + 0.4 * Math.min(A, B) / Math.max(A, B));
        return [d, Math.atan2(ay / B, ax / A) / (Math.PI / 2)];   // 0..1 over a quarter
      }
      var qx = ax - (A - RC), qy = ay - (B - RC);
      var sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - RC, s;
      if (qx > 0 && qy > 0) s = (A - RC) + RC * Math.atan2(qx, qy);
      else if (qy > qx) s = Math.min(ax, A - RC);
      else s = (A - RC) + RC * Math.PI / 2 + ((B - RC) - Math.min(ay, B - RC));
      return [sd, s / LQ];
    }
    function flute(s) { return NF ? 0.5 + 0.5 * Math.cos(2 * Math.PI * NF * (oval ? 1 : 1) * s) : 0; }
    // the outline with flutes cut into it (negative inside)
    M.sd = function (x, y) { var b = base(x, y); return b[0] + FL * flute(b[1]); };
    // the profile across the shoulder: 0 at the foot, 1 at the top; tiers make ledges
    var T = Math.max(1, mc.tiers | 0);
    function profile(t) {
      var p = 1 - Math.pow(1 - t, 3);
      if (T > 1) {
        var u = t * T, k = Math.floor(u), f = u - k;
        var stepped = Math.min(1, (k + HIC.smooth(0.15, 0.75, f)) / T);
        p = 0.35 * p + 0.65 * (1 - Math.pow(1 - stepped, 1.6));
      }
      return p;
    }
    M.height = function (x, y) {
      var e = -M.sd(x, y);
      if (e <= 0) return 0;
      var t = Math.min(1, e / W);
      var u = x / A, v = y / B;
      return H0 * profile(t) * (1 - mc.dome + mc.dome * 2 * Math.max(0, (1 - u * u)) * Math.max(0, (1 - v * v)) * 0.5 + mc.dome * 0.5);
    };
    // the height texture: h, dh/dx, dh/dy, outline distance, at hw × hh texels over the simulated area
    var hw = 384, hh = Math.max(64, Math.round(hw * M.DY / M.DX));
    var hgt = new Float32Array(hw * hh), sdv = new Float32Array(hw * hh);
    for (var j = 0; j < hh; j++) for (var i = 0; i < hw; i++) {
      var x = -M.DX + 2 * M.DX * (i + 0.5) / hw, y = -M.DY + 2 * M.DY * (j + 0.5) / hh;
      hgt[j * hw + i] = M.height(x, y); sdv[j * hw + i] = M.sd(x, y);
    }
    var data = new Float32Array(hw * hh * 4), ex = 2 * M.DX / hw, ey = 2 * M.DY / hh;
    for (j = 0; j < hh; j++) for (i = 0; i < hw; i++) {
      var k = (j * hw + i) * 4, n = j * hw + i;
      var il = Math.max(0, i - 1), ir = Math.min(hw - 1, i + 1), jd = Math.max(0, j - 1), ju = Math.min(hh - 1, j + 1);
      data[k] = hgt[n];
      data[k + 1] = (hgt[j * hw + ir] - hgt[j * hw + il]) / ((ir - il) * ex);
      data[k + 2] = (hgt[ju * hw + i] - hgt[jd * hw + i]) / ((ju - jd) * ey);
      data[k + 3] = sdv[n];
    }
    M.hw = hw; M.hh = hh; M.hdata = data; M.hgt = hgt;
    // bilinear height, the same as the GPU's linear filter (texel centres at (i + .5) / hw)
    M.h = function (x, y) {
      var gx = (x + M.DX) / (2 * M.DX) * hw - 0.5, gy = (y + M.DY) / (2 * M.DY) * hh - 0.5;
      var i0 = Math.floor(gx), j0 = Math.floor(gy), fx = gx - i0, fy = gy - j0;
      var i1 = Math.min(hw - 1, Math.max(0, i0 + 1)), j1 = Math.min(hh - 1, Math.max(0, j0 + 1));
      i0 = Math.min(hw - 1, Math.max(0, i0)); j0 = Math.min(hh - 1, Math.max(0, j0));
      return (hgt[j0 * hw + i0] * (1 - fx) + hgt[j0 * hw + i1] * fx) * (1 - fy) + (hgt[j1 * hw + i0] * (1 - fx) + hgt[j1 * hw + i1] * fx) * fy;
    };
    return M;
  }
  JELLY.Mould = Mould;

  // Box-filtered mip chain of an RGBA float image (made here, so no float-render extension is needed).
  function uploadMips(gl, data, w, h) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.FLOAT, data);
    var src = data, level = 0;
    while (w > 1 || h > 1) {
      var nw = Math.max(1, w >> 1), nh = Math.max(1, h >> 1), dst = new Float32Array(nw * nh * 4);
      for (var j = 0; j < nh; j++) for (var i = 0; i < nw; i++) {
        var i0 = Math.min(w - 1, 2 * i), i1 = Math.min(w - 1, 2 * i + 1), j0 = Math.min(h - 1, 2 * j), j1 = Math.min(h - 1, 2 * j + 1);
        for (var c = 0; c < 4; c++) dst[(j * nw + i) * 4 + c] = 0.25 * (src[(j0 * w + i0) * 4 + c] + src[(j0 * w + i1) * 4 + c] + src[(j1 * w + i0) * 4 + c] + src[(j1 * w + i1) * 4 + c]);
      }
      gl.texImage2D(gl.TEXTURE_2D, ++level, gl.RGBA16F, nw, nh, 0, gl.RGBA, gl.FLOAT, dst);
      src = dst; w = nw; h = nh;
    }
  }

  // ================================================================== 4 the wobble
  // A grid of columns. Each column's top is displaced by d (x, y, z); a point at height fraction s moves by d × s^bend
  // (the foot is stuck to the plate). Columns spring back to rest, pass waves to their neighbours, and are coupled so a
  // dent pushes material outward and spreading lowers the top (volume). On top of that, whole-body modes ring: sway x/y,
  // twist, squash, rock x/y and two swells across the top. Integrated at 240 Hz with semi-implicit Euler.
  var NB = 8, B_RATIO = [1, 1.07, 1.32, 1.85, 1.5, 1.62, 2.35, 2.75], B_LIM = [0.6, 0.6, 0.22, 0.36, 0.16, 0.16, 0.1, 0.1];
  function Wobble(M, cells) {
    var W = {}, gx = cells, cs = 2 * M.DX / gx, gy = Math.max(8, Math.round(2 * M.DY / cs));
    W.gx = gx; W.gy = gy; W.cs = cs;
    var n = gx * gy;
    var cx = new Float32Array(gx), cy = new Float32Array(gy), mask = new Float32Array(n);
    for (var i = 0; i < gx; i++) cx[i] = -M.DX + 2 * M.DX * (i + 0.5) / gx;
    for (var j = 0; j < gy; j++) cy[j] = -M.DY + 2 * M.DY * (j + 0.5) / gy;
    var maskSum = 0;
    for (j = 0; j < gy; j++) for (i = 0; i < gx; i++) { var mm = Math.min(1, M.height(cx[i], cy[j]) / M.H0); mask[j * gx + i] = mm > 0.02 ? mm : 0; maskSum += mask[j * gx + i]; }
    var d = new Float32Array(n * 3), v = new Float32Array(n * 3), U = new Float32Array(n * 4);
    var bu = new Float32Array(NB), bv = new Float32Array(NB);
    W.cx = cx; W.cy = cy; W.mask = mask; W.d = d; W.v = v; W.U = U; W.bu = bu; W.bv = bv;
    W.grab = null; W.bodyTarget = null; W.energy = 0;
    // parameters set by temperature
    W.P = { w0: 6.283 * 3, zeta: 0.05, k: 1000, c2: 8, damp: 4, visc: 10 };
    var NX = 1 / M.A, NY = 1 / M.B, PI = Math.PI;
    // whole-body displacement of the top at (x, y)
    W.body = function (x, y, out) {
      var X = x * NX, Y = y * NY;
      out[0] = bu[0] - bu[2] * y;
      out[1] = bu[1] + bu[2] * x;
      out[2] = -M.H0 * bu[3] + bu[4] * x + bu[5] * y + bu[6] * Math.cos(PI * X) + bu[7] * Math.cos(PI * Y);
      return out;
    };
    W.impulse = function (x, y, sigma, vx, vy, vz) {
      var r2 = sigma * sigma;
      for (var j = 0; j < gy; j++) for (var i = 0; i < gx; i++) {
        var n = j * gx + i; if (!mask[n]) continue;
        var dx = cx[i] - x, dy = cy[j] - y, w = Math.exp(-(dx * dx + dy * dy) / r2);
        if (w < 0.01) continue;
        v[n * 3] += vx * w * 2; v[n * 3 + 1] += vy * w * 2; v[n * 3 + 2] += vz * w * 2;
      }
      var a = Math.min(1, r2 * 3), X = x * NX, Y = y * NY;
      bv[0] += vx * a * 3; bv[1] += vy * a * 3;
      bv[2] += (x * vy - y * vx) * a * 1.1;
      bv[3] += -vz * a * 0.55;
      bv[4] += vz * X * a * 0.7; bv[5] += vz * Y * a * 0.9;
      bv[6] += vz * Math.cos(PI * X) * a * 0.6; bv[7] += vz * Math.cos(PI * Y) * a * 0.6;
    };
    W.reset = function () { d.fill(0); v.fill(0); U.fill(0); bu.fill(0); bv.fill(0); W.grab = null; W.bodyTarget = null; W.energy = 0; };
    W.step = function (h) {
      var P = W.P, k = P.k, c2 = P.c2 / (cs * cs), damp = P.damp, visc = P.visc, Q = 0.7 * P.c2;
      // body modes
      var a0 = 0, a1 = 0, e = 0;
      for (var b = 0; b < NB; b++) {
        var w = P.w0 * B_RATIO[b], a = -w * w * bu[b] - 2 * P.zeta * w * bv[b] * (b > 5 ? 1.4 : 1);
        if (W.bodyTarget && b < 2) a += 240 * (W.bodyTarget[b] - bu[b]) - 20 * bv[b];
        if (b === 0) a0 = a; else if (b === 1) a1 = a;
        else if (b === 4) a += 0.04 * a0; else if (b === 5) a += 0.05 * a1;     // a lurch tips the top
        else if (b === 6) a -= 0.02 * a0; else if (b === 7) a -= 0.02 * a1;
        bv[b] += a * h; bu[b] += bv[b] * h;
        if (bu[b] > B_LIM[b]) { bu[b] = B_LIM[b]; bv[b] *= -0.3; } else if (bu[b] < -B_LIM[b]) { bu[b] = -B_LIM[b]; bv[b] *= -0.3; }
        e += bv[b] * bv[b] + w * w * bu[b] * bu[b] * 0.02;
      }
      // the field
      var mean = 0;
      for (var q = 0; q < n; q++) mean += d[q * 3 + 2] * mask[q];
      mean /= Math.max(1, maskSum);
      var g = W.grab, gr2 = g ? g.sigma * g.sigma : 1;
      for (var j = 0; j < gy; j++) {
        for (var i = 0; i < gx; i++) {
          var c = j * gx + i; if (!mask[c]) continue;
          var l = i > 0 && mask[c - 1] ? c - 1 : c, r = i < gx - 1 && mask[c + 1] ? c + 1 : c;
          var dn = j > 0 && mask[c - gx] ? c - gx : c, up = j < gy - 1 && mask[c + gx] ? c + gx : c;
          var c3 = c * 3, l3 = l * 3, r3 = r * 3, d3 = dn * 3, u3 = up * 3;
          var gzx = (d[r3 + 2] - d[l3 + 2]) / (2 * cs), gzy = (d[u3 + 2] - d[d3 + 2]) / (2 * cs);
          var div = (d[r3] - d[l3]) / (2 * cs) + (d[u3 + 1] - d[d3 + 1]) / (2 * cs);
          for (var ch = 0; ch < 3; ch++) {
            var lap = d[l3 + ch] + d[r3 + ch] + d[d3 + ch] + d[u3 + ch] - 4 * d[c3 + ch];
            var lapv = v[l3 + ch] + v[r3 + ch] + v[d3 + ch] + v[u3 + ch] - 4 * v[c3 + ch];
            var acc = -(ch === 2 ? 2 * k : k) * d[c3 + ch] + c2 * lap - damp * v[c3 + ch] + visc * lapv;
            if (ch === 0) acc += Q * gzx; else if (ch === 1) acc += Q * gzy; else acc += -Q * div - k * mean;
            v[c3 + ch] += acc * h;
          }
          if (g) {
            var gdx = cx[i] - g.x, gdy = cy[j] - g.y, gw = Math.exp(-(gdx * gdx + gdy * gdy) / gr2);
            if (gw > 0.005) {
              var kg = 2400 * gw, dg = 55 * gw;
              v[c3] += (kg * (g.tx - d[c3]) - dg * v[c3]) * h;
              v[c3 + 1] += (kg * (g.ty - d[c3 + 1]) - dg * v[c3 + 1]) * h;
              v[c3 + 2] += (kg * (g.tz - d[c3 + 2]) - dg * v[c3 + 2]) * h;
            }
          }
        }
      }
      for (q = 0; q < n; q++) {
        if (!mask[q]) continue;
        for (ch = 0; ch < 3; ch++) {
          var id = q * 3 + ch, val = d[id] + v[id] * h, lim = ch === 2 ? 0.32 : 0.6;
          if (val > lim) { val = lim; v[id] *= 0.5; } else if (val < -lim) { val = -lim; v[id] *= 0.5; }
          d[id] = val; e += v[id] * v[id] + 30 * val * val;
        }
      }
      W.energy = e;
    };
    // U = field + body, the texture the shaders read
    var bo = [0, 0, 0];
    W.compose = function () {
      for (var j = 0; j < gy; j++) for (var i = 0; i < gx; i++) {
        var c = j * gx + i; W.body(cx[i], cy[j], bo);
        U[c * 4] = d[c * 3] + bo[0]; U[c * 4 + 1] = d[c * 3 + 1] + bo[1]; U[c * 4 + 2] = d[c * 3 + 2] + bo[2];
      }
    };
    // bilinear U at (x, y), the same as the GPU's linear filter
    var su = [0, 0, 0];
    W.sample = function (x, y) {
      var fx = (x + M.DX) / (2 * M.DX) * gx - 0.5, fy = (y + M.DY) / (2 * M.DY) * gy - 0.5;
      var i0 = Math.floor(fx), j0 = Math.floor(fy), tx = fx - i0, ty = fy - j0;
      var i1 = Math.min(gx - 1, Math.max(0, i0 + 1)), j1 = Math.min(gy - 1, Math.max(0, j0 + 1));
      i0 = Math.min(gx - 1, Math.max(0, i0)); j0 = Math.min(gy - 1, Math.max(0, j0));
      for (var c = 0; c < 3; c++) {
        su[c] = (U[(j0 * gx + i0) * 4 + c] * (1 - tx) + U[(j0 * gx + i1) * 4 + c] * tx) * (1 - ty) + (U[(j1 * gx + i0) * 4 + c] * (1 - tx) + U[(j1 * gx + i1) * 4 + c] * tx) * ty;
      }
      return su;
    };
    W.peak = function () { var p = 0; for (var c = 0; c < n; c++) p = Math.max(p, Math.hypot(U[c * 4], U[c * 4 + 1], U[c * 4 + 2])); return p; };
    return W;
  }
  JELLY.Wobble = Wobble;

  // ================================================================== 6 the shaders
  var GLSL_HEAD = [
    '#version 300 es', 'precision highp float;', 'precision highp sampler2D;',
    'uniform sampler2D uH, uU, uPage;',
    'uniform vec3 uEye, uFw, uRt, uUp; uniform vec2 uTan;',
    'uniform vec2 uDom, uPH, uFoot, uPlate;',
    'uniform float uH0, uDepth, uInk, uBend, uM, uScene, uLift, uSq, uIor, uPlateR, uPlateKind, uPlateRound, uPattern, uClothScale, uClothAngle, uPool, uShape;',
    'uniform vec3 uSig, uScat, uCandy, uPaper, uL, uCloth, uClothBase, uBand, uTint, uWin, uLamp, uWall;',
    'uniform vec2 uPanes, uPageTex;',
    'uniform int uBitN; uniform vec4 uBit[24]; uniform vec4 uBitC[24];',
    'uniform sampler2D uGround;',
    ''
  ].join('\n');

  var GLSL_LIB = [
    'vec2 huv(vec2 p){ return (p + uDom) / (2. * uDom); }',
    'vec2 pageUV(vec2 q){ return vec2(q.x / uPH.x * .5 + .5, .5 - q.y / uPH.y * .5); }',
    // the page, premultiplied, faded to nothing just outside its edge
    'vec4 pageAt(vec2 q, float lod){ vec2 uv = pageUV(q); vec2 e = step(vec2(0.), uv) * step(uv, vec2(1.)); return textureLod(uPage, uv, lod) * e.x * e.y; }',
    'float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }',
    'float sdPlate(vec2 q){ if (uPlateRound > .5) { float k = length(q / uPlate); return (k - 1.) * min(uPlate.x, uPlate.y); } return sdRound(q, uPlate, uPlateR); }',
    'float soft(vec2 p, vec2 b, float s){ vec2 d = smoothstep(b + s, b - s, abs(p)); return d.x * d.y; }',
    'vec3 tonemap(vec3 x){ x *= .85; x = (x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14); return pow(clamp(x, 0., 1.), vec3(1. / 2.2)); }',
    // ---- the room, seen only in reflections: dim walls, a paned window behind the jelly, a pendant lamp, a light ceiling
    'vec3 room(vec3 r, float crisp){',
    '  vec3 c = mix(uWall * .22, uWall * .55, smoothstep(-.4, .05, r.z));',
    '  c = mix(c, uWall * .8, smoothstep(.3, .95, r.z));',
    '  vec3 wd = normalize(vec3(uL.x * .4, .78, .6));',
    '  float k = dot(r, wd);',
    '  if (k > .25) {',
    '    vec3 wr = normalize(cross(wd, vec3(0., 0., 1.))), wu = cross(wr, wd);',
    '    vec2 a = vec2(dot(r, wr), dot(r, wu)) / k / vec2(.17, .12);',
    '    vec2 g = (a * .5 + .5) * uPanes; vec2 f = abs(fract(g) - .5) * 2.;',
    '    float inside = soft(a, vec2(1.), .05);',
    '    float bars = mix(1., smoothstep(.985, .92, f.x) * smoothstep(.985, .92, f.y), crisp);',
    '    c = mix(c, uWin * (4. + 2. * a.y), inside * bars);',
    '  }',
    '  vec3 ld = normalize(vec3(.28, .05, 1.));',
    '  c += uLamp * 7. * smoothstep(.9965, .9993, dot(r, ld));',
    '  c += uLamp * .35 * smoothstep(.93, 1., dot(r, ld));',
    // a tall bright cupboard door to the right, so side walls catch a second, narrow reflection
    '  float kr = dot(r, normalize(vec3(.85, .4, .35)));',
    '  if (kr > .3) { vec2 b = vec2(dot(r, normalize(vec3(-.43, .91, 0.))), r.z - .2) / kr; c += uWin * 1.6 * soft(b, vec2(.08, .35), .04); }',
    '  return c;',
    '}',
    // ---- the cloth
    'vec3 cloth(vec2 q){',
    '  float ca = cos(uClothAngle), sa = sin(uClothAngle); vec2 p = vec2(ca * q.x - sa * q.y, sa * q.x + ca * q.y);',
    '  float warp = sin(p.x * 1.3 + sin(p.y * .8) * 1.2) * .5 + sin(p.y * 1.9 + p.x * .5) * .5;',   // soft folds
    '  vec2 g = p / uClothScale + warp * .025; vec2 fw = max(fwidth(g), vec2(1e-4));',
    '  vec3 base = uClothBase, ink = uCloth; float t = 0.;',
    '  if (uPattern < .5) { vec2 s = smoothstep(.25 - fw, .25 + fw, abs(fract(g) - .5)); t = .5 * (s.x + s.y); t = t * t * .9 + t * .1; }',        // gingham: crossed bands, darker where they cross
    '  else if (uPattern < 1.5) { float s = abs(fract(g.x) - .5); t = smoothstep(.2 + fw.x, .2 - fw.x, s) * .85 + smoothstep(.43 + fw.x, .43 - fw.x, s) * .35; }', // stripes: a wide band and a pin stripe
    '  else if (uPattern < 2.5) { vec2 h = vec2(g.x + .5 * floor(g.y), g.y); vec2 c = fract(h) - .5; float r = length(c); t = smoothstep(.22 + fw.x, .22 - fw.x, r); }', // dots
    '  else if (uPattern < 3.5) { float n = sin(g.x * 37.) * sin(g.y * 41.) * .5 + sin(g.x * 13.7 + g.y * 3.1) * .5; t = .18 + .12 * n; }',   // linen
    '  else { float ring = sin((p.y + .35 * sin(p.x * .7) + .1 * sin(p.x * 3.1)) / uClothScale * 6.283 * .9); t = .45 + .35 * ring + .15 * sin(p.x * 23. + p.y * 4.); }', // wood
    '  vec3 col = mix(base, ink, clamp(t, 0., 1.));',
    '  float thread = sin(q.x * 260.) * sin(q.y * 260.);',
    '  col *= 1. + .05 * thread * (1. - smoothstep(0., .03, fw.x)) + .1 * warp;',
    '  return col;',
    '}',
    // window light falling across the table in a soft pool, crossed by the shadow of a glazing bar
    'float pool(vec2 q){',
    '  if (uPool < .5) return .85;',
    '  vec2 p = vec2(q.x * .93 + q.y * .37, -q.x * .37 + q.y * .93) - vec2(-.2, .2);',
    '  float a = soft(p, vec2(uFoot.x + 1.7, uFoot.y + 1.1), .7);',
    '  float bar = smoothstep(.16, .05, abs(p.y - uFoot.y - .5)) + smoothstep(.13, .04, abs(p.x + uFoot.x + .8));',
    '  return mix(.5, 1., a * (1. - .45 * min(bar, 1.)));',
    '}',
    // how much key light reaches table point q through the jelly above it (coloured), and how much jelly it crossed
    'vec3 through(vec2 q, out float len){',
    '  vec2 Lh = uL.xy / uL.z; float zmax = uLift + uM * uH0 * 1.15; len = 0.;',
    '  vec2 far = abs(q + Lh * zmax * .5) - uDom - abs(Lh) * zmax * .5;',
    '  if (max(far.x, far.y) > 0. || uM < .003) return vec3(1.);',
    '  const int N = 5;',
    '  for (int k = 0; k < N; k++) {',
    '    float z = (float(k) + .5) / float(N) * zmax;',
    '    vec2 p = q + Lh * z;',
    '    vec3 Us = texture(uU, huv(p)).xyz;',
    '    p -= Us.xy * uM * clamp((z - uLift) / uH0, 0., 1.);',
    '    vec2 hu = huv(p); float hb = textureLod(uH, hu, 3.2 + uLift * 2.5).x * soft(hu - .5, vec2(.49), .01);',
    '    float top = uLift + uM * (hb + hb / uH0 * Us.z);',
    '    len += smoothstep(-.06, .06, top - z) * step(uLift, z);',
    '  }',
    '  len *= zmax / float(N) / uL.z;',
    '  vec3 T = exp(-uSig * len * 1.25) * exp(-len * .6);',
    '  T = max(T, uScat * .06);',
    '  T *= 1. + 1.7 * smoothstep(0., .06, len) * exp(-len * 7.);',   // a thin edge of jelly focuses the light: a bright coloured fringe
    '  return T;',
    '}',
    'float rimProfile(float e){ return e < .06 ? .085 * sin(e / .06 * 1.5708) : .085 * (1. - smoothstep(.06, .5, e)); }',
    // the table at point q, seen along view ray V
    'vec3 ground(vec2 q, vec3 V){',
    '  float len; vec3 T = through(q, len);',
    '  vec4 hq = textureLod(uH, huv(q), 2.);',
    '  float sd = hq.w;',
    '  float lifted = clamp(uLift * 2.5, 0., 1.);',
    '  float ao = 1. - (.42 * exp(-max(sd, 0.) * 8.) + .3 * exp(-max(sd, 0.) * 34.)) * uM * (1. - lifted) - .25 * smoothstep(.02, -.1, sd) * uM * (1. - lifted);',
    '  float pl = pool(q);',
    '  vec3 key = vec3(2.25, 2.12, 1.95) * T * pl;',
    '  vec3 amb = vec3(.36, .39, .44) * ao * mix(vec3(1.), exp(-uSig * max(len, uM * hq.x * .8) * (1. - lifted)), .8);',
    // the plate
    '  float dp = sdPlate(q), e = -dp, inside = smoothstep(.01, -.01, dp);',
    '  vec2 gp = normalize(vec2(sdPlate(q + vec2(.004, 0.)) - sdPlate(q - vec2(.004, 0.)), sdPlate(q + vec2(0., .004)) - sdPlate(q - vec2(0., .004))) + 1e-6);',
    '  float dh = (rimProfile(e + .004) - rimProfile(e - .004)) / .008;',
    '  vec3 n = normalize(vec3(dh * gp, 1.));',
    '  float steep = clamp(abs(dh) * 4., 0., 1.);',
    '  vec3 base;',
    '  float lit = uL.z;',
    '  if (uPlateKind < .5) {',
    '    base = cloth(q - n.xy * .28 * inside) * mix(vec3(1.), uTint * 1.05, inside * (.18 + .7 * steep));',
    '  } else {',
    '    float band = smoothstep(.055, .07, e) * smoothstep(.16, .145, e);',
    '    base = mix(cloth(q), mix(vec3(.93, .92, .9), uBand, band * .92), inside);',
    '    lit = mix(uL.z, max(dot(n, uL), 0.), inside);',
    '  }',
    '  float sh = 1. - smoothstep(-.05, .14, sdPlate(q + uL.xy / uL.z * .1));',   // the plate's own shadow on the cloth
    '  vec3 col = base * (key * lit * (1. - .3 * sh * (1. - inside)) + amb);',
    // coloured light that came through the jelly spills around its foot, more on the side away from the light
    '  float sb = textureLod(uH, huv(q), 3.4).w;',
    '  float away = clamp(dot(normalize(q + 1e-4), -normalize(uL.xy)), 0., 1.);',
    '  col += base * uScat * .4 * smoothstep(-.06, .08, sb) * exp(-max(sb, 0.) * 3.5) * (.25 + .75 * away) * uM * (1. - lifted) * pl;',
    // glass and glaze show themselves by what they reflect
    '  vec3 r = reflect(V, n);',
    '  float fr = .04 + .96 * pow(1. - max(dot(-V, n), 0.), 5.);',
    '  col += (fr * room(r, 0.) * (uPlateKind < .5 ? 1.8 : 1.1) * ao + T * pl * pow(max(dot(r, uL), 0.), 260.) * 5.) * inside;',
    '  if (uPlateKind < .5) {',
    '    float lip = smoothstep(0., .012, e) * smoothstep(.06, .032, e);',
    '    float toward = clamp(dot(gp, normalize(uL.xy)), 0., 1.);',
    '    col = mix(col, col * uTint, lip * .4 * inside);',
    '    col += uTint * pl * lip * inside * (.3 + 2. * pow(toward, 6.) + .7 * pow(1. - toward, 8.));',
    '  }',
    '  return col;',
    '}',
    // the plain page: what is left when the jelly has melted flat (and what the shaders fade to)
    // the table at world point q, read back from the cached ground pass (projected to the screen)
    'vec3 groundC(vec2 q){ vec3 v = vec3(q, 0.) - uEye; float z = dot(v, uFw); vec2 uv = vec2(dot(v, uRt) / z / uTan.x, dot(v, uUp) / z / uTan.y) * .5 + .5; vec3 e = texture(uGround, clamp(uv, .001, .999)).rgb; return e / max(1. - e, 1e-3); }',
    'vec3 plain(vec2 q){ vec4 c = pageAt(q, 0.); return uPaper * (1. - c.a) + c.rgb; }',
    ''
  ].join('\n');

  var VS_GROUND = '#version 300 es\nout vec2 vN;\nvoid main(){ vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)) * 2. - 1.; vN = p; gl_Position = vec4(p, .9999, 1.); }';
  var FS_GROUND = GLSL_HEAD + 'in vec2 vN; out vec4 o;\n' + GLSL_LIB + [
    'void main(){',
    '  vec3 V = normalize(uFw + uRt * vN.x * uTan.x + uUp * vN.y * uTan.y);',
    '  float t = -uEye.z / min(V.z, -1e-4); vec2 q = uEye.xy + V.xy * t;',
    '  vec3 c = uScene > .001 ? ground(q, V) : vec3(0.);',
    '  o = vec4(c / (1. + c), 1.);',     // linear colour, Reinhard-encoded so 8 bits hold it; the jelly reads it back
    '}'
  ].join('\n');
  // the cached table, shown on screen (tonemapped), faded to the plain page as the jelly melts
  var FS_BLIT = GLSL_HEAD + 'in vec2 vN; out vec4 o;\n' + GLSL_LIB + [
    'void main(){',
    '  vec3 V = normalize(uFw + uRt * vN.x * uTan.x + uUp * vN.y * uTan.y);',
    '  float t = -uEye.z / min(V.z, -1e-4); vec2 q = uEye.xy + V.xy * t;',
    '  vec3 e = texture(uGround, vN * .5 + .5).rgb;',
    '  o = vec4(mix(plain(q), tonemap(e / max(1. - e, 1e-3)), uScene), 1.);',
    '}'
  ].join('\n');

  // The jelly is a mesh over the simulated area; each vertex is lifted to the mould's height and displaced by the wobble.
  var VS_JELLY = GLSL_HEAD + [
    'layout(location=0) in vec2 aXY;',
    'out vec2 vXY; out vec3 vU, vUx, vUy, vW;',
    'uniform vec2 uCell;',   // one wobble cell in world units
    'vec2 huv(vec2 p){ return (p + uDom) / (2. * uDom); }',
    'void main(){',
    '  vec2 uv = huv(aXY);',
    '  vec3 U = texture(uU, uv).xyz;',
    '  vec3 Ux = (texture(uU, huv(aXY + vec2(uCell.x, 0.))).xyz - texture(uU, huv(aXY - vec2(uCell.x, 0.))).xyz) / (2. * uCell.x);',
    '  vec3 Uy = (texture(uU, huv(aXY + vec2(0., uCell.y))).xyz - texture(uU, huv(aXY - vec2(0., uCell.y))).xyz) / (2. * uCell.y);',
    '  float h = textureLod(uH, uv, 0.).x, s = h / uH0;',
    '  vec3 P = vec3(aXY, uLift + uM * h) + uM * vec3(pow(s, uBend) * U.xy, s * U.z);',
    '  P.xy += aXY * uSq * .5 * sin(3.14159 * min(s, 1.)) * uM;',   // squashed jelly bellies out at the waist
    '  vXY = aXY; vU = U; vUx = Ux; vUy = Uy; vW = P;',
    '  vec3 v = P - uEye; float z = dot(v, uFw);',
    '  float n = 1., f = 60.;',
    '  gl_Position = vec4(dot(v, uRt) / uTan.x, dot(v, uUp) / uTan.y, z * (f + n) / (f - n) - 2. * f * n / (f - n), z);',
    '}'
  ].join('\n');

  var FS_JELLY = GLSL_HEAD + 'in vec2 vXY; in vec3 vU, vUx, vUy, vW; out vec4 o;\n' + GLSL_LIB + [
    // dark ink becomes candy; coloured ink keeps its colour (linear, straight alpha)
    'vec3 candy(vec4 c){ vec3 s = c.rgb / max(c.a, 1e-3); float dark = 1. - max(s.r, max(s.g, s.b)); return mix(pow(s, vec3(2.2)), uCandy, smoothstep(.55, .8, dark)); }',
    'void main(){',
    '  vec4 h4 = texture(uH, huv(vXY));',
    '  float Hf = h4.x, sd = h4.w;',
    '  float cover = clamp(-(sd + .012) / max(fwidth(sd), 1e-5) + .5, 0., 1.);',
    '  if (cover <= 0. || Hf <= 1e-4) discard;',
    '  float s = Hf / uH0;',
    '  vec2 g = h4.yz / uH0;',
    '  float sp = pow(s, uBend), dsp = uBend * pow(max(s, 1e-4), uBend - 1.);',
    '  vec3 tx = vec3(1., 0., uM * h4.y) + uM * vec3(dsp * g.x * vU.xy + sp * vUx.xy, g.x * vU.z + s * vUx.z);',
    '  vec3 ty = vec3(0., 1., uM * h4.z) + uM * vec3(dsp * g.y * vU.xy + sp * vUy.xy, g.y * vU.z + s * vUy.z);',
    '  vec3 N = normalize(cross(tx, ty));',
    '  vec3 V = normalize(vW - uEye);',
    '  if (dot(N, V) > -.03) N = normalize(N - V * (dot(N, V) + .03));',
    '  vec3 R = refract(V, N, 1. / uIor);',
    '  float rz = min(R.z, -.08);',
    '  float F = .03 + .97 * pow(1. - max(dot(-V, N), 0.), 5.);',
    '  float lit = .45 + .55 * max(dot(N, uL), 0.);',
    // what lies under the jelly, seen through it: path length in jelly, cut short where the ray leaves through a wall
    '  float hz = vW.z - uLift;',
    '  float Lin = max(hz, .004) / -rz;',
    '  float sdb = texture(uH, huv(vXY + R.xy * Lin)).w;',
    '  if (sdb > 0.) Lin *= clamp(-sd / max(sdb - sd, 1e-3), .05, 1.);',
    '  float wall = 1. - smoothstep(.55, .97, s);',
    '  Lin = mix(Lin, max(Lin, .2), wall * .8);',
    '  vec2 qG = vW.xy + R.xy * (vW.z / -rz);',
    '  vec3 col = groundC(qG) * exp(-uSig * Lin);',
    '  col += uScat * .34 * (1. - exp(-2.4 * Lin)) * lit;',
    '  col += uScat * .3 * exp(-s * 5.) * (1. - exp(-Lin * 3.));',   // light leaking in through the thin foot
    // walls: flanks facing the light take it; flanks facing away glow with light that crossed the jelly
    '  float nh = length(N.xy);',
    '  float back = max(dot(N.xy / max(nh, 1e-4), -normalize(uL.xy)), 0.) * nh;',
    '  col *= 1. + wall * (1.9 * back * back + .55 * max(dot(N, uL), 0.) + .25);',
    '  col += uScat * wall * .18 * back * back;',
    '  float rim = exp(sd * 3.);',
    '  col = col * (.72 + .55 * rim) + uScat * .22 * rim;',
    // bits set in the jelly (under the page): each is a ball the bent ray may hit
    '  float zt = uLift + uM * (uH0 - uDepth + s * 0.);',
    '  {',
    '    vec3 ro = vW, rd = normalize(vec3(R.xy, rz));',
    '    float best = 1e9, cov = 0.; int hit = -1;',
    '    for (int i = 0; i < 24; i++) {',
    '      if (i >= uBitN) break;',
    '      vec4 b = uBit[i]; vec3 oc = ro - b.xyz; float bb = dot(oc, rd), d2 = dot(oc, oc) - bb * bb;',
    '      if (d2 < b.w * b.w && bb < 0.) { float t = -bb - sqrt(b.w * b.w - d2); if (t > 0. && t < best) { best = t; hit = i; cov = smoothstep(b.w, b.w * .9, sqrt(d2)); } }',
    '    }',
    '    if (hit >= 0) {',
    '      vec4 b = uBit[hit], bc = uBitC[hit]; vec3 p = ro + rd * best, n = normalize(p - b.xyz);',
    '      float depthIn = max(vW.z - p.z, 0.) / uL.z;',
    '      vec3 lamp = vec3(2.2, 2.08, 1.92) * exp(-uSig * depthIn * .7);',
    '      vec3 fc;',
    '      if (bc.w < .5) {',   // fruit: a lit ball that takes the jelly's colour the deeper it lies
    '        fc = bc.rgb * (lamp * (max(dot(n, uL), 0.) * .85 + .12) + vec3(.36, .39, .44) * (.5 + .5 * n.z) * exp(-uSig * depthIn * .5));',
    '        fc += lamp * pow(max(dot(reflect(rd, n), uL), 0.), 60.) * .8;',
    '        fc = fc * exp(-uSig * best * 1.4) + uScat * .5 * (1. - exp(-3. * best)) * lit;',
    '      } else {',   // a bubble of air: clear in the middle, a bright rim, a pin highlight
    '        float edge = pow(1. - abs(dot(n, rd)), 3.);',
    '        fc = col * (1.1 + .4 * edge) + (bc.rgb * .5 + .5) * (edge * .9 + pow(max(dot(reflect(rd, n), uL), 0.), 90.) * 3.);',
    '      }',
    '      col = mix(col, fc, cov);',
    '    }',
    '  }',
    // the page: candy letters hanging inside the jelly, with side walls found by stepping down the refracted ray
    '  vec4 topC = vec4(0.);',
    '  float sP = (uH0 - uDepth) / uH0;',
    '  float zP = uLift + uM * (uH0 - uDepth + sP * vU.z);',
    '  if (vW.z > zP && uM > .003) {',
    '    vec2 lag = uM * pow(sP, uBend) * vU.xy;',   // the page is displaced as much as jelly at its depth
    '    float tA = (vW.z - zP) / -rz, tB = (vW.z - zP + uM * uInk) / -rz;',
    '    vec2 uv0 = pageUV(vW.xy) * uPageTex; vec2 ddx = dFdx(uv0), ddy = dFdy(uv0);',
    '    float lod = clamp(.5 * log2(max(dot(ddx, ddx), dot(ddy, ddy))), 0., 5.);',
    '    float lightIn = (vW.z - zP) / uL.z;',
    '    float tHit = -1., tPrev = tA;',
    '    for (int k = 1; k <= 6; k++) { float t = mix(tA, tB, float(k) / 6.); if (pageAt(vW.xy + R.xy * t - lag, lod + .5).a > .5) { tHit = t; break; } tPrev = t; }',
    '    if (tHit > 0.) {',
    '      float a = tPrev, b = tHit;',
    '      for (int k = 0; k < 3; k++) { float m = .5 * (a + b); if (pageAt(vW.xy + R.xy * m - lag, lod + .5).a > .5) b = m; else a = m; }',
    '      vec4 c = pageAt(vW.xy + R.xy * (b + .004) - lag, lod + 1.);',
    '      float dd = clamp((b - tA) / max(tB - tA, 1e-4), 0., 1.);',
    '      col = candy(c) * mix(.5, .2, dd) * exp(-uSig * (b + lightIn) * .8) * (1.7 * uL.z + .35);',
    '    }',
    '    vec4 c = pageAt(vW.xy + R.xy * tA - lag, lod);',
    '    topC = c;',
    '    vec3 lf = exp(-uSig * (tA + lightIn) * .5) * (2.25 * uL.z + .45);',
    '    col = mix(col, candy(c) * lf, c.a);',
    '  }',
    // gloss: the top is never optically flat, so what it mirrors swims a little
    '  vec2 p0 = vXY;',
    '  vec3 Ng = normalize(N + vec3(sin(p0.x * 7. + p0.y * 3.) + .5 * sin(p0.y * 13. - p0.x * 5.), cos(p0.y * 6. - p0.x * 2.) + .5 * sin(p0.x * 11. + p0.y * 4.), 0.) * .0012);',
    '  vec3 Rg = reflect(V, Ng);',
    '  vec3 spec = room(Rg, 1.) + vec3(55.) * pow(max(dot(Rg, uL), 0.), 900.);',
    '  col = mix(col, spec, F);',
    '  col += vec3(.9, .9, .88) * (.08 + .32 * max(dot(N.xy, normalize(uL.xy)), 0.)) * smoothstep(.012, .002, -sd - .012) * cover;',   // the wet line at the foot
    '  float tg = -uEye.z / min(V.z, -1e-4); vec2 qT = uEye.xy + V.xy * tg;',
    '  vec3 outc = tonemap(col);',
    '  if (cover < 1.) outc = mix(tonemap(groundC(qT)), outc, cover);',
    '  o = vec4(mix(plain(qT), outc, uScene), 1.);',
    '}'
  ].join('\n');

  // ================================================================== 10 create()
  JELLY.create = function (opts) {
    var cfg = merge(DEFAULTS, opts || {});
    if (opts && opts.flavours) cfg.flavours = opts.flavours;
    var canvas = cfg.canvas, page = cfg.page;
    var probe = root.__hic;
    var J = { cfg: cfg, canvas: canvas, page: page };

    // ---- the plain page when the feature is missing
    if (!HIC.supported('webgl')) { HIC.fallback(canvas); J.fallback = true; return J; }
    var S = HIC.stage(canvas, { maxDpr: 2, gl: { antialias: false } }), gl = S.gl;   // edges are anti-aliased in the shaders; MSAA costs a lot on software GL
    if (!gl) { HIC.fallback(canvas); J.fallback = true; return J; }
    J.S = S; J.gl = gl;
    var still = HIC.still !== null, calm = HIC.calm;
    var act = HIC.param('act');
    // software GL (SwiftShader, llvmpipe): start live pages at fewer pixels; stills keep full resolution
    var dbgR = gl.getExtension('WEBGL_debug_renderer_info');
    J.renderer = dbgR ? String(gl.getParameter(dbgR.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|llvmpipe|software/i.test(J.renderer) && !still) { S.quality = 0.6; S.resize(); }

    // ---- state
    var dirty = 2;          // frames to draw even if nothing moves (a new upload, a resize, a call from outside)
    J.redraw = function () { dirty = Math.max(dirty, 2); root.__hic.owed = dirty; };
    var st = {
      m: 0, mTarget: 1, lift: 0, liftV: 0, drop: 0, dropT: 0, shake: 0, shakeT: 0,
      px: -1, py: -1, lookX: 0, lookY: 0, lookTX: 0, lookTY: 0, held: false, set: false,
      temperature: cfg.temperature, time: 0
    };
    J.state = st;
    var rng = HIC.rng(cfg.bits.seed * 7919 + 13);

    // ---- geometry that depends on the page's size (rebuilt when the page changes shape)
    var PWpx = 0, PHpx = 0, PW = 1.25, PH = 0.8, M = null, W = null;
    var texH = gl.createTexture(), texU = gl.createTexture();
    var mesh = { vao: null, count: 0 };
    var bits = [], bitU = new Float32Array(24 * 4), bitC = new Float32Array(24 * 4);
    function build() {
      PWpx = page.offsetWidth; PHpx = page.offsetHeight;
      var asp = PWpx / Math.max(1, PHpx);
      if (asp >= 1) { PW = 1.25; PH = 1.25 / asp; } else { PH = 1.25; PW = 1.25 * asp; }
      var old = W;
      M = Mould(cfg.mould, PW, PH);
      W = Wobble(M, cfg.grid);
      W.P = old ? old.P : W.P;
      J.mould = M; J.wobble = W;
      gl.bindTexture(gl.TEXTURE_2D, texH);
      uploadMips(gl, M.hdata, M.hw, M.hh);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindTexture(gl.TEXTURE_2D, texU);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, W.gx, W.gy, 0, gl.RGBA, gl.FLOAT, W.U);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      // the mesh: a grid over the simulated area
      var mx = cfg.mesh, my = Math.max(8, Math.round(mx * M.DY / M.DX));
      var vtx = new Float32Array((mx + 1) * (my + 1) * 2), k = 0;
      for (var j = 0; j <= my; j++) for (var i = 0; i <= mx; i++) { vtx[k++] = -M.DX + 2 * M.DX * i / mx; vtx[k++] = -M.DY + 2 * M.DY * j / my; }
      var idx = new Uint32Array(mx * my * 6); k = 0;
      for (j = 0; j < my; j++) for (i = 0; i < mx; i++) { var a = j * (mx + 1) + i, b = a + 1, c = a + mx + 1, d = c + 1; idx[k++] = a; idx[k++] = b; idx[k++] = c; idx[k++] = b; idx[k++] = d; idx[k++] = c; }
      if (!mesh.vao) mesh.vao = gl.createVertexArray();
      gl.bindVertexArray(mesh.vao);
      if (!mesh.vb) { mesh.vb = gl.createBuffer(); mesh.ib = gl.createBuffer(); }
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vb); gl.bufferData(gl.ARRAY_BUFFER, vtx, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      mesh.count = idx.length; mesh.mx = mx; mesh.my = my;
      placeBits();
    }
    // Bits set in the jelly: scattered with a seeded generator inside the mould, under the page, never touching.
    function placeBits() {
      var b = cfg.bits, n = b.kind === 'none' ? 0 : Math.min(24, b.count | 0), r = HIC.rng(b.seed * 31 + 5), tries = 0;
      bits = [];
      var top = M.H0 - cfg.material.pageDepth - cfg.material.ink - 0.02;
      while (bits.length < n && tries++ < 4000) {
        var rad = b.size[0] + (b.size[1] - b.size[0]) * r();
        var x = (r() * 2 - 1) * (M.A - 0.1), y = (r() * 2 - 1) * (M.B - 0.1);
        var hgt = M.height(x, y), z = rad + 0.03 + r() * Math.max(0, top - 2 * rad - 0.03);
        if (hgt < z + rad + 0.06 || z + rad > top) continue;
        if (-M.sd(x, y) < rad + cfg.mould.shoulder + cfg.mould.fluteDepth) continue;
        var ok = true;
        for (var i = 0; i < bits.length && ok; i++) if (Math.hypot(bits[i].x - x, bits[i].y - y, bits[i].z - z) < bits[i].r + rad + 0.03) ok = false;
        if (!ok) continue;
        var kind = b.kind === 'bubbles' ? 1 : b.kind === 'mixed' ? (bits.length % 3 === 2 ? 1 : 0) : 0;
        if (kind === 1) rad *= 0.6;
        bits.push({ x: x, y: y, z: z, r: rad, kind: kind, c: bits.length });
      }
    }

    // ---- flavours (colours ease between flavours)
    var names = Object.keys(cfg.flavours);
    function flavourLook(name) {
      var f = cfg.flavours[name] || cfg.flavours[names[0]];
      var bitsCol = (cfg.bits.colours || f.bits || [f.jelly, f.glow || f.jelly]).map(lin);
      return {
        sig: sigmaOf(f.jelly, cfg.material.depth),
        scat: lin(f.glow || f.jelly),
        cloth: lin(f.cloth || cfg.table.colour || '#8fcdb8'),
        bits: bitsCol
      };
    }
    var flavour = cfg.flavour || names[0];
    var look = flavourLook(flavour), lookT = look;
    look = JSON.parse(JSON.stringify(look));
    function easeLook(dt) {
      var k = 1 - Math.exp(-dt / 0.22), moving = false;
      ['sig', 'scat', 'cloth'].forEach(function (key) { for (var i = 0; i < 3; i++) { var d = lookT[key][i] - look[key][i]; if (Math.abs(d) > 1e-3) { look[key][i] += d * k; moving = true; } else look[key][i] = lookT[key][i]; } });
      for (var b = 0; b < lookT.bits.length; b++) { if (!look.bits[b]) look.bits[b] = lookT.bits[b].slice(); for (var i = 0; i < 3; i++) look.bits[b][i] += (lookT.bits[b][i] - look.bits[b][i]) * k; }
      look.bits.length = lookT.bits.length;
      return moving;
    }

    // ---- programs, textures
    var progG = HIC.gl.program(gl, VS_GROUND, FS_GROUND);
    var progJ = HIC.gl.program(gl, VS_JELLY, FS_JELLY, ['aXY']);
    var progB = HIC.gl.program(gl, VS_GROUND, FS_BLIT);
    var groundT = null;   // the cached table: redrawn when the jelly or the view changes
    var texPage = HIC.gl.texture(gl, { mips: true });
    var aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    if (aniso) { gl.bindTexture(gl.TEXTURE_2D, texPage); gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4); }
    var pageTW = 0, pageTH = 0, uploaded = false;

    // ================================================================== 5 the camera
    var cam = { eye: [0, -9, 9], fw: [0, 0.7, -0.7], rt: [1, 0, 0], up: [0, 0.7, 0.7], tx: 0.3, ty: 0.2 };
    J.camera = cam;
    function plateHalf() {
      var pm = cfg.plate.margin, round = (cfg.plate.shape || (cfg.mould.shape === 'rect' ? 'rect' : 'round')) === 'round';
      return { x: M.A + pm, y: M.B + pm, round: round };
    }
    function camera() {
      var e = smooth(st.m), asp = S.W / S.H;
      var el = (90 - cfg.tilt * e) * Math.PI / 180 + st.lookY * 0.035 * e;
      var yaw = st.lookX * 0.05 * e;
      var fw = [Math.sin(yaw) * Math.cos(el), Math.cos(yaw) * Math.cos(el), -Math.sin(el)];
      var rt = [Math.cos(yaw), -Math.sin(yaw), 0];
      var up = HIC.vec.cross(rt, fw);
      var D = 10, target = [0, 0, M.H0 * 0.3 * e + st.shake * Math.sin(st.shakeT * 44)];
      // fit: the plate when set, the page when melted flat
      var ph = plateHalf(), pts = [], fx = HIC.mix(PW * 1.06, ph.x, e), fy = HIC.mix(PH * 1.06, ph.y, e);
      for (var a = 0; a < 16; a++) {
        var ang = a / 16 * Math.PI * 2, cx = Math.cos(ang), cy = Math.sin(ang);
        if (!ph.round || e < 0.5) { cx = Math.sign(cx) * Math.min(1, Math.abs(cx) * 1.5); cy = Math.sign(cy) * Math.min(1, Math.abs(cy) * 1.5); }
        pts.push([cx * fx, cy * fy, 0]);
        pts.push([cx * M.A * e, cy * M.B * e, M.H0 * e]);
      }
      for (var pass = 0; pass < 2; pass++) {
        var eye = [target[0] - fw[0] * D, target[1] - fw[1] * D, target[2] - fw[2] * D];
        var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        pts.forEach(function (p) {
          var v = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]], d = HIC.vec.dot(v, fw);
          var x = HIC.vec.dot(v, rt) / d, y = HIC.vec.dot(v, up) / d;
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        });
        var mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        for (var i = 0; i < 3; i++) target[i] += (rt[i] * mx + up[i] * my) * D;
      }
      eye = [target[0] - fw[0] * D, target[1] - fw[1] * D, target[2] - fw[2] * D];
      var tx = Math.max((x1 - x0) / 2, (y1 - y0) / 2 * asp) / (asp < 0.8 ? Math.max(cfg.fill, 0.98) : cfg.fill);   // phones: every pixel of width counts
      cam.eye = eye; cam.fw = fw; cam.rt = rt; cam.up = up; cam.tx = tx; cam.ty = tx / asp;
    }
    function ray(px, py) {
      var nx = px / S.W * 2 - 1, ny = 1 - py / S.H * 2, c = cam;
      return HIC.vec.norm([c.fw[0] + c.rt[0] * nx * c.tx + c.up[0] * ny * c.ty, c.fw[1] + c.rt[1] * nx * c.tx + c.up[1] * ny * c.ty, c.fw[2] + c.rt[2] * nx * c.tx + c.up[2] * ny * c.ty]);
    }
    function project(p) {
      var v = [p[0] - cam.eye[0], p[1] - cam.eye[1], p[2] - cam.eye[2]], d = HIC.vec.dot(v, cam.fw);
      return [(HIC.vec.dot(v, cam.rt) / d / cam.tx * 0.5 + 0.5) * S.W, (0.5 - HIC.vec.dot(v, cam.up) / d / cam.ty * 0.5) * S.H];
    }
    J.project = project;

    // ================================================================== 7 mapping
    var bend = cfg.material.bend, IOR = cfg.material.ior;
    // world position of the jelly's surface point whose rest position is (x, y)
    function surfacePos(x, y, out) {
      var h = M.h(x, y), s = h / M.H0, u = W.sample(x, y), sp = Math.pow(s, bend), m = st.m;
      var belly = W.bu[3] * 0.5 * Math.sin(Math.PI * Math.min(s, 1)) * m;
      out[0] = x + m * sp * u[0] + x * belly; out[1] = y + m * sp * u[1] + y * belly; out[2] = st.lift + m * (h + s * u[2]);
      return out;
    }
    var tmp = [0, 0, 0], rest = [0, 0];
    // the rest position under world (x, y), found by undoing the displacement; returns the surface height there
    function surfaceUnder(x, y) {
      var rx = x, ry = y;
      for (var i = 0; i < 4; i++) { surfacePos(rx, ry, tmp); rx += x - tmp[0]; ry += y - tmp[1]; }
      rest[0] = rx; rest[1] = ry;
      return surfacePos(rx, ry, tmp)[2];
    }
    function pageXY(ex, ey) { return [(ex / PWpx * 2 - 1) * PW, (1 - ey / PHpx * 2) * PH]; }
    function pagePx(x, y) { return [(x / PW * 0.5 + 0.5) * PWpx, (0.5 - y / PH * 0.5) * PHpx]; }
    // Where a screen point lands: { hit (on the jelly), ex, ey (page px, or null where no page is drawn), rx, ry, wz, s }
    function mapPoint(px, py) {
      var d = ray(px, py), o = cam.eye, m = st.m;
      if (m < 0.003 || !uploaded) {
        var t = -o[2] / d[2], q = pagePx(o[0] + d[0] * t, o[1] + d[1] * t);
        return { hit: false, flat: true, ex: q[0], ey: q[1] };
      }
      var zTop = st.lift + m * M.H0 * 1.4 + 0.05, t0 = (zTop - o[2]) / d[2], t1 = (st.lift - 0.01 - o[2]) / d[2];
      var N = 48, prev = t0, hit = false, ta = 0, tb = 0;
      for (var i = 1; i <= N; i++) {
        var tt = t0 + (t1 - t0) * i / N, z = o[2] + d[2] * tt;
        var zs = surfaceUnder(o[0] + d[0] * tt, o[1] + d[1] * tt);
        if (M.h(rest[0], rest[1]) > 0.004 && M.sd(rest[0], rest[1]) < -0.012 && z <= zs) { hit = true; ta = prev; tb = tt; break; }
        prev = tt;
      }
      if (!hit) return { hit: false, ex: null, ey: null };
      for (i = 0; i < 10; i++) {
        var tm = 0.5 * (ta + tb), zm = o[2] + d[2] * tm, zsm = surfaceUnder(o[0] + d[0] * tm, o[1] + d[1] * tm);
        if (M.h(rest[0], rest[1]) > 0.004 && zm <= zsm) tb = tm; else ta = tm;
      }
      var wx = o[0] + d[0] * tb, wy = o[1] + d[1] * tb;
      var wz = surfaceUnder(wx, wy), rx = rest[0], ry = rest[1];
      // the surface normal, from the displaced surface (the shader's tangents, by finite differences)
      var e = 0.004, a = surfacePos(rx + e, ry, [0, 0, 0]), b = surfacePos(rx - e, ry, [0, 0, 0]), c = surfacePos(rx, ry + e, [0, 0, 0]), f = surfacePos(rx, ry - e, [0, 0, 0]);
      var tX = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], tY = [c[0] - f[0], c[1] - f[1], c[2] - f[2]];
      var n = HIC.vec.norm(HIC.vec.cross(tX, tY)), nv = HIC.vec.dot(n, d);
      if (nv > -0.03) { n = HIC.vec.norm([n[0] - d[0] * (nv + 0.03), n[1] - d[1] * (nv + 0.03), n[2] - d[2] * (nv + 0.03)]); nv = HIC.vec.dot(n, d); }
      var eta = 1 / IOR, k = 1 - eta * eta * (1 - nv * nv), ff = eta * nv + Math.sqrt(Math.max(k, 0));
      var R = [eta * d[0] - ff * n[0], eta * d[1] - ff * n[1], eta * d[2] - ff * n[2]], rz = Math.min(R[2], -0.08);
      var u = W.sample(rx, ry), sP = (M.H0 - cfg.material.pageDepth) / M.H0;
      var zP = st.lift + m * (M.H0 - cfg.material.pageDepth + sP * u[2]);
      var s = M.h(rx, ry) / M.H0;
      if (wz <= zP) return { hit: true, ex: null, ey: null, rx: rx, ry: ry, wz: wz, s: s };   // a wall: no page drawn here
      var tA = (wz - zP) / -rz, lag = m * Math.pow(sP, bend);
      var qq = pagePx(wx + R[0] * tA - lag * u[0], wy + R[1] * tA - lag * u[1]);
      return { hit: true, ex: qq[0], ey: qq[1], rx: rx, ry: ry, wz: wz, s: s };
    }
    J.mapPoint = mapPoint;
    // canvas px → page px (for S.placeLocal), null where no page is drawn
    function toPage(x, y) { var p = mapPoint(x, y); return p.ex === null || p.ex === undefined ? null : [p.ex, p.ey]; }
    // where a page point is on screen (inverts the warp: a start from the projected page plane, then Newton steps)
    function screenAt(ex, ey) {
      var q = pageXY(ex, ey), zP = st.lift + st.m * (M.H0 - cfg.material.pageDepth);
      var s = project([q[0], q[1], zP]);
      for (var i = 0; i < 14; i++) {
        var p = toPage(s[0], s[1]), px1 = toPage(s[0] + 1, s[1]), py1 = toPage(s[0], s[1] + 1);
        if (!p || !px1 || !py1) { s = [s[0] + (S.W / 2 - s[0]) * 0.05, s[1] + (S.H / 2 - s[1]) * 0.05]; continue; }
        var a = px1[0] - p[0], b = px1[1] - p[1], c = py1[0] - p[0], d = py1[1] - p[1], det = a * d - b * c;
        if (Math.abs(det) < 1e-6) break;
        var rx = ex - p[0], ry = ey - p[1];
        var dx = (d * rx - c * ry) / det, dy = (-b * rx + a * ry) / det;
        s = [s[0] + dx, s[1] + dy];
        if (Math.abs(rx) + Math.abs(ry) < 0.2) break;
      }
      return s;
    }
    J.screenAt = screenAt;
    J.screenOf = function (el) { var b = HIC.box(page, el); return screenAt(b[0] + b[2] / 2, b[1] + b[3] / 2); };
    J.pageToWorld = pageXY;

    // ---- placement for hit testing: the page under the pointer is where it is drawn
    function place() {
      if (!uploaded || st.px < 0) return;
      S.placeLocal(page, st.px, st.py, toPage);
    }

    // ================================================================== 8 interaction
    var sound = root.SQUELCH ? root.SQUELCH.create(cfg.sound) : null;
    J.sound = sound || { toggle: function () {}, enabled: false, play: function () {} };
    function snd(name, a, b) { if (sound && sound.enabled) { try { sound.play(name, a, b); } catch (e) { /* sound is optional */ } } }
    if (cfg.soundButton && sound) {
      var sb = cfg.soundButton;
      var show = function () { sb.textContent = sound.enabled ? 'Sound on' : 'Sound off'; sb.setAttribute('aria-pressed', String(sound.enabled)); };
      sb.hidden = false; show();
      sb.addEventListener('click', function () { sound.toggle(); show(); snd('flavour'); });
    }
    function emit(name, detail) { if (still) return; try { canvas.dispatchEvent(new CustomEvent('jelly:' + name, { detail: detail || {} })); } catch (e) {} }
    var LIVE = 'input,button,select,textarea,label,a,summary,[contenteditable]:not([contenteditable=false]),[data-live]';
    function liveOf(el) { return el && el.closest && page.contains(el) ? el.closest(LIVE) : null; }

    // firmness from temperature: 0 cold … .72 loose … 1 melted
    function applyTemperature() {
      var T = clamp(st.temperature, 0, 1), loose = clamp(T / 0.72, 0, 1), melt = smooth((T - 0.72) / 0.28);
      st.mTarget = 1 - melt;
      var mat = cfg.material, hz = HIC.mix(mat.firmHz, mat.softHz, loose);
      var P = W.P;
      P.w0 = 2 * Math.PI * hz; P.zeta = HIC.mix(mat.damping[0], mat.damping[1], loose);
      var wl = P.w0 * 1.6; P.k = wl * wl; P.c2 = HIC.mix(10, 5, loose); P.damp = 0.16 * wl; P.visc = 10;
      if (sound) sound.firmness = 1 - loose;
    }
    J.setTemperature = function (v) {
      var was = st.mTarget; st.temperature = +v; applyTemperature();
      if (st.mTarget < was - 0.01) snd('melt', 1 - st.mTarget);
      return J;
    };
    J.setFlavour = function (name) {
      if (!cfg.flavours[name]) return J;
      flavour = name; lookT = flavourLook(name);
      W.impulse(0, 0, 1.3, 0.12, 0.05, 0.45); snd('flavour'); emit('touch');
      return J;
    };
    J.flavour = function () { return flavour; };
    // a prod at page px (ex, ey)
    J.poke = function (ex, ey, strength) {
      var q = pageXY(ex, ey), k = strength === undefined ? 1 : strength;
      W.impulse(q[0], q[1], 0.34, 0, 0.15 * k, -1.4 * k); snd('poke', Math.min(1, 0.5 * k));
      return J;
    };
    // drop: a short gather, lift, a fall under gravity, a fat squash and a lurch on landing
    var dropRng = HIC.rng(cfg.bits.seed * 101 + 9);
    J.drop = function () {
      if (st.drop || st.m < 0.6) return J;
      st.drop = 1; st.dropT = 0; emit('touch'); return J;
    };
    function stepDrop(dt) {
      if (!st.drop) return;
      st.dropT += dt;
      if (st.drop === 1) {                       // gather: it sinks a little before it is lifted
        if (st.dropT <= dt * 1.01) W.bv[3] += 1.2;
        if (st.dropT >= 0.1) { st.drop = 2; st.dropT = 0; W.bv[3] -= 3.4; W.bv[4] += 0.4; snd('lift'); }
      } else if (st.drop === 2) {                // lift
        var T = 0.36, u = Math.min(st.dropT / T, 1), z = 0.75 * (1 - Math.pow(1 - u, 3));
        st.liftV = (z - st.lift) / Math.max(dt, 1e-4); st.lift = z;
        if (u >= 1) { st.drop = 3; st.dropT = 0; st.liftV = 0; }
      } else if (st.drop === 3) {                // fall
        st.liftV -= 17 * dt; st.lift += st.liftV * dt;
        if (st.lift <= 0) {
          var v = -st.liftV; st.lift = 0; st.liftV = 0; st.drop = 0;
          var sx = dropRng() < 0.5 ? -1 : 1;
          W.bv[3] += v * 2.1; W.bv[0] += sx * (2.2 + dropRng()); W.bv[1] += 1.2 + dropRng() * 0.5;
          W.bv[2] += (dropRng() - 0.5) * 0.6; W.bv[4] += (dropRng() - 0.5) * 0.9; W.bv[5] += (dropRng() - 0.5) * 0.9;
          W.bv[6] += sx * 3.8; W.bv[7] += 3.2;
          for (var j = 0; j < W.gy; j++) for (var i = 0; i < W.gx; i++) {
            var n = j * W.gx + i, mk = W.mask[n]; if (!mk) continue;
            var x = W.cx[i] / M.A, y = W.cy[j] / M.B;
            W.v[n * 3 + 2] -= v * 0.32 * mk * (1 - 0.6 * (x * x + y * y));
          }
          st.shake = 0.03; st.shakeT = 0; snd('land', Math.min(1, v / 5)); emit('land', { v: v });
        }
      }
    }
    // grab and pull
    function startGrab(p, id) {
      var g = { x: p.rx, y: p.ry, z: p.wz, s: Math.max(p.s, 0.3), tx: 0, ty: 0, tz: -0.06, sigma: 0.34, pull: 0, id: id };
      W.grab = g; updateGrab(); snd('grab'); emit('touch');
    }
    function updateGrab() {
      var g = W.grab; if (!g) return;
      var d = ray(st.px, st.py), o = cam.eye, t = (g.z - o[2]) / d[2];
      var sc = Math.max(st.m * Math.pow(g.s, bend), 0.25);
      var ux = (o[0] + d[0] * t - g.x) / sc, uy = (o[1] + d[1] * t - g.y) / sc;
      var len = Math.hypot(ux, uy), max = 0.56;
      if (len > max) { var f = max * (1 + 0.25 * Math.tanh((len - max) / max)) / len; ux *= f; uy *= f; }
      W.bodyTarget = [ux * 0.5, uy * 0.5];
      var bo = W.body(g.x, g.y, [0, 0, 0]);
      g.tx = ux - bo[0]; g.ty = uy - bo[1]; g.tz = -0.12 - 0.06 * Math.min(len / max, 1) - bo[2];
      g.pull = Math.min(1, len / max);
    }
    function release() {
      if (!W.grab) return;
      snd('release', W.grab.pull);
      W.grab = null; W.bodyTarget = null; canvas.classList.remove('pulling');
    }
    J.release = release;
    function track(e) { var r = canvas.getBoundingClientRect(); st.px = e.clientX - r.left; st.py = e.clientY - r.top; }
    var lastMove = null;
    root.addEventListener('pointermove', function (e) {
      track(e);
      if (!st.held) { st.lookTX = clamp(st.px / S.W * 2 - 1, -1, 1); st.lookTY = clamp(st.py / S.H * 2 - 1, -1, 1); }
      if (W.grab) updateGrab();
      else if (!st.held && st.m > 0.6 && lastMove && !still) {
        // brushing across the jelly sets it trembling
        var dx = e.clientX - lastMove[0], dy = e.clientY - lastMove[1], sp = Math.hypot(dx, dy);
        if (sp > 6 && !liveOf(e.target)) {
          var p = mapPoint(st.px, st.py);
          if (p.hit) { var gg = Math.min(sp, 50) * 0.0014; W.impulse(p.rx, p.ry, 0.4, dx / sp * gg * 1.5, -dy / sp * gg * 1.5, -gg * 0.5); }
        }
      }
      lastMove = [e.clientX, e.clientY];
      place();
    }, true);
    canvas.addEventListener('pointerdown', function (e) {
      st.held = true; track(e); place();
      if (e.button !== 0) return;
      var live = liveOf(e.target), p = mapPoint(st.px, st.py);
      if (live) {                                 // a control or an editable: the page gets the event, the jelly a gentle prod
        if (p.hit) W.impulse(p.rx, p.ry, 0.32, 0, 0.12, live.isContentEditable ? -1.2 : -0.8);
        if (!live.isContentEditable && live.tagName !== 'INPUT') snd('poke', 0.45);
        emit('touch'); return;
      }
      if (!p.hit || st.m < 0.3) return;
      startGrab(p, e.pointerId); canvas.classList.add('pulling');
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* fine without */ }
    });
    canvas.addEventListener('mousedown', function (e) { if (W.grab) e.preventDefault(); });   // pulling keeps the caret where it is
    function up(e) { st.held = false; if (W.grab && (!e || e.pointerId === undefined || e.pointerId === W.grab.id)) release(); }
    root.addEventListener('pointerup', up, true);
    root.addEventListener('pointercancel', up, true);
    root.addEventListener('blur', function () { up(); });
    // typing jiggles the jelly where the letters are
    page.addEventListener('input', function (e) {
      var el = e.target; if (!el || el === page) return;
      if (el.type === 'range' || el.type === 'radio' || el.type === 'checkbox') return;
      var b = HIC.box(page, el), q = pageXY(b[0] + Math.min(b[2], Math.max(b[2] * 0.5, b[2] - 40)), b[1] + b[3] / 2);
      var del = e.inputType && e.inputType.indexOf('delete') === 0;
      W.impulse(q[0], q[1], 0.32, (rng() - 0.5) * 1.4, 0.35, del ? -1.8 : 2.4);
      snd('type', 0.6, del); emit('touch');
    });

    // ---- sizing
    function sizeUpload() {
      var onScreen = 2 * PW / (cam.tx * 2 * 10) * S.W;       // page width on screen, CSS px (roughly, at the focus distance)
      var k = clamp(onScreen / PWpx * S.dpr * cfg.upload, 1, 2.5);
      pageTW = Math.round(PWpx * k); pageTH = Math.round(PHpx * k);
    }
    function resize() {
      S.resize();
      if (page.offsetWidth !== PWpx || page.offsetHeight !== PHpx) { build(); applyTemperature(); }
      camera(); sizeUpload(); S.requestPaint(); dirty = 2;
    }
    root.addEventListener('resize', resize);

    // ---- per-frame
    var acc = 0, introKick = false, intro = cfg.intro && !still && !calm;
    function advance(dt) {
      st.time += dt;
      var tau = intro && !introKick ? 0.55 : 0.32;
      var mPrev = st.m;
      st.m += (st.mTarget - st.m) * (1 - Math.exp(-dt / tau));
      if (Math.abs(st.mTarget - st.m) < 5e-4) st.m = st.mTarget;
      if (intro && !introKick && st.m > 0.93) {  // it has set: a plop
        introKick = true; W.bv[0] += 2.6; W.bv[1] += 1.0; W.bv[3] += 2.8; W.bv[5] += 0.6; W.impulse(-0.4, -0.1, 0.7, 0, 0, -1.1); snd('land', 0.5);
      }
      if (st.m < mPrev - 1e-4 && st.m > 0.05) W.bv[6] += (mPrev - st.m) * 3;   // melting sloshes
      var moving = easeLook(dt) || st.m !== mPrev;
      if (!st.held && !calm && !still) {
        var a = 1 - Math.exp(-dt / 0.35), lx = st.lookTX - st.lookX, ly = st.lookTY - st.lookY;
        if (Math.abs(lx) + Math.abs(ly) > 0.002) { st.lookX += lx * a; st.lookY += ly * a; moving = true; }
      }
      if (calm || still) { st.lookX = st.lookY = 0; }   // stills never lean toward a stray pointer
      stepDrop(dt);
      if (st.shake > 5e-4) { st.shakeT += dt; st.shake *= Math.exp(-dt * 9); } else st.shake = 0;
      camera();
      if (W.grab) updateGrab();
      acc += dt;
      var h = 1 / 240, n = 0;
      while (acc >= h && n < 16) { W.step(h); acc -= h; n++; }
      if (n === 16) acc = 0;
      W.compose();
      return moving || !!W.grab || !!st.drop || st.shake > 0 || W.energy > 2e-5;
    }
    J.advance = advance;
    // simulate `sec` seconds at once (checks, stills)
    J.tick = function (sec) { var n = Math.round(sec * 60); for (var i = 0; i < n; i++) advance(1 / 60); place(); J.redraw(); return J; };
    J.settle = function () {
      intro = false; introKick = true; W.reset(); st.drop = 0; st.lift = 0; st.liftV = 0; st.shake = 0;
      applyTemperature(); st.m = st.mTarget; camera(); W.compose(); place(); J.redraw(); return J;
    };
    J.energy = function () { return W.energy; };
    J.peak = function () { return W.peak(); };
    // displaced bits: each bit moves with the jelly around it, less near the foot
    function bitsNow() {
      var m = st.m, H0 = M.H0, n = Math.min(bits.length, 24);
      for (var i = 0; i < n; i++) {
        var b = bits[i], u = W.sample(b.x, b.y), s = clamp(b.z / H0, 0, 1), sp = Math.pow(s, bend), r = b.r * smooth((m - 0.15) / 0.6);
        bitU[i * 4] = b.x + m * sp * u[0]; bitU[i * 4 + 1] = b.y + m * sp * u[1]; bitU[i * 4 + 2] = st.lift + m * (b.z + s * u[2]); bitU[i * 4 + 3] = r;
        var col = look.bits[b.c % look.bits.length] || [1, 1, 1];
        bitC[i * 4] = col[0]; bitC[i * 4 + 1] = col[1]; bitC[i * 4 + 2] = col[2]; bitC[i * 4 + 3] = b.kind;
      }
      return n;
    }
    var PAT = { gingham: 0, stripes: 1, dots: 2, linen: 3, wood: 4 };
    var Lw = HIC.vec.norm(cfg.room.light);
    function uniforms(pr) {
      var u = pr.u, c = cam, ph = plateHalf();
      gl.uniform3fv(u.uEye, c.eye); gl.uniform3fv(u.uFw, c.fw); gl.uniform3fv(u.uRt, c.rt); gl.uniform3fv(u.uUp, c.up); gl.uniform2f(u.uTan, c.tx, c.ty);
      gl.uniform2f(u.uDom, M.DX, M.DY); gl.uniform2f(u.uPH, PW, PH); gl.uniform2f(u.uFoot, M.A, M.B); gl.uniform2f(u.uPlate, ph.x, ph.y);
      gl.uniform1f(u.uH0, M.H0); gl.uniform1f(u.uDepth, cfg.material.pageDepth); gl.uniform1f(u.uInk, cfg.material.ink); gl.uniform1f(u.uBend, bend);
      gl.uniform1f(u.uM, st.m); var sc = smooth(st.m / 0.3); gl.uniform1f(u.uScene, sc);
      gl.uniform1f(u.uLift, st.lift); gl.uniform1f(u.uSq, W.bu[3]); gl.uniform1f(u.uIor, IOR);
      gl.uniform1f(u.uPlateR, Math.min(cfg.plate.corner, Math.min(ph.x, ph.y) * 0.95)); gl.uniform1f(u.uPlateKind, cfg.plate.kind === 'china' ? 1 : 0); gl.uniform1f(u.uPlateRound, ph.round ? 1 : 0);
      gl.uniform1f(u.uPattern, PAT[cfg.table.pattern] || 0); gl.uniform1f(u.uClothScale, cfg.table.scale); gl.uniform1f(u.uClothAngle, cfg.table.angle || 0); gl.uniform1f(u.uPool, cfg.room.pool ? 1 : 0);
      gl.uniform3fv(u.uSig, look.sig); gl.uniform3fv(u.uScat, look.scat); gl.uniform3fv(u.uCandy, lin(cfg.candy)); gl.uniform3fv(u.uPaper, hex(cfg.paper));
      gl.uniform3fv(u.uL, Lw); gl.uniform3fv(u.uCloth, look.cloth); gl.uniform3fv(u.uClothBase, lin(cfg.table.base)); gl.uniform3fv(u.uBand, lin(cfg.plate.band)); gl.uniform3fv(u.uTint, lin(cfg.plate.tint));
      gl.uniform3fv(u.uWin, lin(cfg.room.window)); gl.uniform3fv(u.uLamp, lin(cfg.room.lamp)); gl.uniform3fv(u.uWall, lin(cfg.room.wall));
      gl.uniform2f(u.uPanes, cfg.room.panes[0], cfg.room.panes[1]); gl.uniform2f(u.uPageTex, pageTW, pageTH);
      if (u.uBitN) { var n = bitsNow(); gl.uniform1i(u.uBitN, n); gl.uniform4fv(u.uBit, bitU); gl.uniform4fv(u.uBitC, bitC); }
      if (u.uCell) gl.uniform2f(u.uCell, W.cs, 2 * M.DY / W.gy);
      HIC.gl.bind(gl, pr, { uH: texH, uU: texU, uPage: texPage, uGround: groundT ? groundT.tex : texH });
    }
    function draw() {
      gl.bindTexture(gl.TEXTURE_2D, texU);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W.gx, W.gy, gl.RGBA, gl.FLOAT, W.U);
      if (!groundT || groundT.w !== canvas.width || groundT.h !== canvas.height) groundT = HIC.gl.target(gl, canvas.width, canvas.height);
      gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
      gl.bindFramebuffer(gl.FRAMEBUFFER, groundT.fb); gl.viewport(0, 0, canvas.width, canvas.height);
      if (J._skip !== 'ground') { progG.use(); uniforms(progG); HIC.gl.fullscreen(gl); }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      progB.use(); uniforms(progB); HIC.gl.fullscreen(gl);
      if (st.m > 0.003 && J._skip !== 'jelly') {
        gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.clear(gl.DEPTH_BUFFER_BIT);
        progJ.use(); uniforms(progJ);
        gl.bindVertexArray(mesh.vao); gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0); gl.bindVertexArray(null);
      }
    }
    J.draw = draw;

    // ================================================================== 9 stills and acts
    // #still=<s>&act=<name>: the act starts at time 0 from rest and the picture is taken <s> seconds later.
    function runAct(name, sec) {
      J.settle();
      var ap = cfg.actPoint, q = [ap[0] * PW, ap[1] * PH], h = 1 / 60, t = 0;
      var hold = function (until, fn) { while (t < until - 1e-6) { if (fn) fn(t); advance(h); t += h; } };
      if (name === 'pull' || name === 'release') {
        var s0 = project([q[0], q[1], M.H0]);
        st.px = s0[0]; st.py = s0[1];
        var p = mapPoint(st.px, st.py);
        if (p.hit) startGrab(p, 1);
        var pullTo = [s0[0] + S.W * 0.09, s0[1] + S.H * 0.06];
        hold(Math.min(sec, 0.5), function (tt) { var k = smooth(tt / 0.4); st.px = HIC.mix(s0[0], pullTo[0], k); st.py = HIC.mix(s0[1], pullTo[1], k); });
        if (name === 'release') { release(); hold(sec); }
        else hold(sec);
      } else if (name === 'drop') { J.drop(); hold(sec); }
      else if (name === 'poke') { var pp = pagePx(q[0], q[1]); J.poke(pp[0], pp[1], 1.6); hold(sec); }
      else if (name === 'type') { W.impulse(0, PH * 0.4, 0.36, 0.4, 0.3, 2.6); hold(sec); }
      else if (name === 'melt') { J.setTemperature(0.9); hold(sec); }
      else if (name === 'set') { st.m = 0; intro = true; introKick = false; hold(sec); intro = false; }
      else if (name && name.indexOf('flavour:') === 0) { J.setFlavour(name.slice(8)); hold(sec); }
      else hold(sec);
      st.px = -1; W.compose(); J.redraw();
    }
    J.act = runAct;

    // ---- start
    build();
    applyTemperature();
    if (still || !intro) st.m = st.mTarget;
    camera(); sizeUpload();
    var ready = false, actDone = false;
    S.onPaint(function () {
      dirty = 2;
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      var r = S.upload(page, texPage, pageTW, pageTH);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      if (!r) return;
      uploaded = true;
      if (!ready) {
        ready = true;
        S.probe(page, cfg.probeTarget || page.querySelector('[data-hic-edit]') || page.firstElementChild).then(function (mode) {
          if (still && act && !actDone) { actDone = true; runAct(act, HIC.still); }
          S.ready({ mode: mode, mesh: mesh.mx + '×' + mesh.my, grid: W.gx + '×' + W.gy, page: PWpx + '×' + PHpx, upload: pageTW + '×' + pageTH });
        });
      }
    });
    var slow = 0, frames = 0;
    S.loop(function (t, dt) {
      var moving = false;
      if (!still && !st.freeze) moving = advance(dt);   // st.freeze: a check is stepping time by hand
      else { camera(); W.compose(); }
      if (!still && st.px >= 0 && moving) place();
      // nothing moved and nothing new to show: leave the last picture up (it costs nothing)
      if (uploaded && (moving || dirty > 0)) { draw(); probe.draws = (probe.draws || 0) + 1; if (dirty > 0) dirty--; }
      probe.owed = uploaded ? dirty : 1;   // frames still owed (stills and checks wait for 0)
      // slow frames (software GL, weak GPUs): draw fewer pixels
      if (!still) {
        frames++; if (dt > 0.034) slow++;
        if ((frames >= 30 && slow > 20) || (frames >= 4 && slow >= 4)) { if (S.quality > 0.55) { S.quality *= 0.8; S.resize(); dirty = 2; } frames = 0; slow = 0; }
        else if (frames >= 30) { frames = 0; slow = 0; }
      }
    });
    probe.jelly = J;
    root.__jelly = J;
    root.__hic.screenOf = function (el) { return J.screenOf(el); };
    return J;
  };

  root.JELLY = JELLY;
})(typeof window !== 'undefined' ? window : globalThis);

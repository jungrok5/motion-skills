/* terrain.js — height functions and contour lines for exploded-view-map pages.
 *
 * Global `EVTerrain`. No dependencies. A page designs its ground as a plain function height(u, v) over the unit square
 * (u across the map, v down it) in the topic's own unit (metres of altitude, metres of depth as negative numbers, storeys…)
 * and the engine (lib/exploded.js) cuts it into stacked paper plates with these helpers.
 *
 *   EVTerrain.rng(seed)                     seeded random in [0, 1) (mulberry32)
 *   EVTerrain.noise(x, y, seed)             value noise in [0, 1]
 *   EVTerrain.fbm(x, y, octaves, seed)      fractal noise in about [0, 1]
 *   EVTerrain.ridges(list, o)               a height function from crest lines: list of polylines [[u, v, crest], …];
 *                                           o: { fall: height lost per unit distance, shoulder, base, sharp }
 *   EVTerrain.bumps(list, base)             a height function from round hills [{ at:[u,v], r, h }] (or pits: negative h)
 *   EVTerrain.warp(fn, amount, freq, seed)  bends a height function's domain so lines are not ruler straight
 *   EVTerrain.rough(fn, amount, freq, seed, gate)  adds fractal texture (gate(h) in 0..1 says where)
 *   EVTerrain.floor(fn, level, soft)        a soft minimum: a valley floor or a sea bed
 *   EVTerrain.sample(fn, nx, ny)            grid { nx, ny, d: Float32Array } of fn at the grid points (u = i/(nx-1))
 *   EVTerrain.at(grid, x, y)                bilinear value at grid coordinates
 *   EVTerrain.contours(grid, level, closed) marching squares → [{ pts: [[gx, gy], …], loop }] in grid units;
 *                                           closed = true pads the grid so every line closes along the border (fills)
 *   EVTerrain.path(lines, sx, sy, ox, oy)   SVG path data, scaled by sx, sy and shifted by -ox, -oy
 *   EVTerrain.bbox(lines)                   [x0, y0, x1, y1]
 *   EVTerrain.spline(points, step)          Catmull-Rom through points [[x, y], …], a point every `step` units
 *   EVTerrain.inside(pts, x, y)             point in polygon
 */
(function (root) {
  'use strict';
  var T = {};

  T.rng = function (seed) {
    var s = seed >>> 0;
    return function () { s += 0x6D2B79F5; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  function h2(ix, iy, seed) {
    var h = Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul(iy | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b9);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  T.noise = function (x, y, seed) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    var sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), s = seed || 0;
    var a = h2(ix, iy, s), b = h2(ix + 1, iy, s), c = h2(ix, iy + 1, s), d = h2(ix + 1, iy + 1, s);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  T.fbm = function (x, y, oct, seed) {
    var sum = 0, amp = 0.5, f = 1, norm = 0;
    for (var i = 0; i < (oct || 4); i++) { sum += amp * T.noise(x * f, y * f, (seed || 0) + i * 17); norm += amp; amp *= 0.5; f *= 2.07; }
    return sum / norm;
  };

  // Crest lines: each segment is a ridge whose height falls away with distance; the segments are joined by a soft
  // maximum (log-sum-exp), so saddles between two ridges come out rounded instead of creased.
  T.ridges = function (list, o) {
    o = o || {};
    var fall = o.fall || 2400, shoulder = o.shoulder == null ? 800 : o.shoulder, sharp = o.sharp || 0.02, ref = o.base || 0;
    var segs = [];
    list.forEach(function (r) { for (var i = 0; i < r.length - 1; i++) segs.push([r[i], r[i + 1]]); });
    return function (u, v) {
      var acc = 0;
      for (var k = 0; k < segs.length; k++) {
        var a = segs[k][0], b = segs[k][1], dx = b[0] - a[0], dy = b[1] - a[1];
        var t = ((u - a[0]) * dx + (v - a[1]) * dy) / (dx * dx + dy * dy || 1e-9);
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        var d = Math.hypot(u - a[0] - dx * t, v - a[1] - dy * t), crest = a[2] + (b[2] - a[2]) * t;
        var h = crest - fall * d - shoulder * d * d / (0.05 + d);
        acc += Math.exp(sharp * (h - ref));
      }
      return ref + Math.log(acc + 1e-30) / sharp;
    };
  };
  // Round hills (or pits) added to a base value.
  T.bumps = function (list, base) {
    return function (u, v) {
      var h = base || 0;
      for (var i = 0; i < list.length; i++) { var b = list[i], d2 = ((u - b.at[0]) * (u - b.at[0]) + (v - b.at[1]) * (v - b.at[1])) / (b.r * b.r); h += b.h * Math.exp(-d2); }
      return h;
    };
  };
  T.warp = function (fn, amount, freq, seed) {
    var a = amount == null ? 0.03 : amount, f = freq || 3, s = seed || 0;
    return function (u, v) { return fn(u + a * (T.fbm(u * f + 3.1, v * f + 7.7, 3, s) - 0.5) * 2, v + a * (T.fbm(u * f + 9.2, v * f + 1.4, 3, s + 5) - 0.5) * 2); };
  };
  T.rough = function (fn, amount, freq, seed, gate) {
    return function (u, v) {
      var h = fn(u, v), g = gate ? gate(h) : 1;
      return h + (T.fbm(u * (freq || 9), v * (freq || 9), 4, seed || 3) - 0.5) * 2 * amount * g;
    };
  };
  T.floor = function (fn, level, soft) {
    var s = soft || 40;
    return function (u, v) { var h = fn(u, v); return level + s * Math.log(1 + Math.exp((h - level) / s)); };
  };

  T.sample = function (fn, nx, ny) {
    var d = new Float32Array(nx * ny);
    for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) d[j * nx + i] = fn(i / (nx - 1), j / (ny - 1));
    return { nx: nx, ny: ny, d: d };
  };
  T.at = function (g, x, y) {
    x = Math.max(0, Math.min(g.nx - 1.0001, x)); y = Math.max(0, Math.min(g.ny - 1.0001, y));
    var i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, n = g.nx;
    var a = g.d[j * n + i], b = g.d[j * n + i + 1], c = g.d[(j + 1) * n + i], e = g.d[(j + 1) * n + i + 1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + e) * fx * fy;
  };

  // Marching squares. A crossing point is named by the grid edge it lies on, so the cells that share an edge share the
  // point, and walking point → point stitches the cell segments into whole lines.
  T.contours = function (g, level, closed) {
    var P = closed ? 1 : 0, W = g.nx + 2 * P, H = g.ny + 2 * P, LOW = level - 1e6;
    function val(i, j) { i -= P; j -= P; if (i < 0 || j < 0 || i >= g.nx || j >= g.ny) return LOW; return g.d[j * g.nx + i]; }
    function gx(i) { return Math.max(0, Math.min(g.nx - 1, i - P)); }
    function gy(j) { return Math.max(0, Math.min(g.ny - 1, j - P)); }
    var where = new Map(), nbr = new Map();
    function pt(i, j, vert) {
      var k = (j * (W + 1) + i) * 2 + (vert ? 1 : 0);
      if (!where.has(k)) {
        var a = val(i, j), b = vert ? val(i, j + 1) : val(i + 1, j), t = (level - a) / (b - a);
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        var x0 = gx(i), y0 = gy(j), x1 = vert ? x0 : gx(i + 1), y1 = vert ? gy(j + 1) : y0;
        where.set(k, [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
      }
      return k;
    }
    function join(p, q) {
      if (!nbr.has(p)) nbr.set(p, []); if (!nbr.has(q)) nbr.set(q, []);
      nbr.get(p).push(q); nbr.get(q).push(p);
    }
    for (var j = 0; j < H - 1; j++) for (var i = 0; i < W - 1; i++) {
      var a = val(i, j), b = val(i + 1, j), c = val(i + 1, j + 1), d = val(i, j + 1);
      var code = (a >= level ? 8 : 0) | (b >= level ? 4 : 0) | (c >= level ? 2 : 0) | (d >= level ? 1 : 0);
      if (code === 0 || code === 15) continue;
      var Tp = function () { return pt(i, j, false); }, Bp = function () { return pt(i, j + 1, false); };
      var Lp = function () { return pt(i, j, true); }, Rp = function () { return pt(i + 1, j, true); };
      switch (code) {
        case 1: case 14: join(Lp(), Bp()); break;
        case 2: case 13: join(Bp(), Rp()); break;
        case 3: case 12: join(Lp(), Rp()); break;
        case 4: case 11: join(Tp(), Rp()); break;
        case 6: case 9: join(Tp(), Bp()); break;
        case 7: case 8: join(Tp(), Lp()); break;
        case 5: case 10: {
          var high = (a + b + c + d) / 4 >= level;
          // the centre decides which pair of opposite corners is connected
          if ((code === 5) === high) { join(Tp(), Lp()); join(Bp(), Rp()); } else { join(Tp(), Rp()); join(Lp(), Bp()); }
        }
      }
    }
    var used = new Set(), out = [];
    function walk(start) {
      var line = [start], cur = start; used.add(start);
      for (;;) {
        var ns = nbr.get(cur), next = -1;
        for (var k = 0; k < ns.length; k++) if (!used.has(ns[k])) { next = ns[k]; break; }
        if (next < 0) break;
        used.add(next); line.push(next); cur = next;
      }
      var loop = line.length > 2 && nbr.get(cur).indexOf(start) >= 0;
      return { pts: tidy(line.map(function (k) { return where.get(k); }), loop, g), loop: loop };
    }
    nbr.forEach(function (ns, k) { if (ns.length === 1 && !used.has(k)) out.push(walk(k)); });
    nbr.forEach(function (ns, k) { if (!used.has(k)) out.push(walk(k)); });
    return out.filter(function (l) { return l.pts.length > (l.loop ? 4 : 2); });
  };
  // drop near-duplicate points, then one pass of corner cutting (border points stay put so fills meet the edge)
  function tidy(p, loop, g) {
    var q = [];
    for (var i = 0; i < p.length; i++) { var l = q[q.length - 1]; if (!l || Math.abs(p[i][0] - l[0]) + Math.abs(p[i][1] - l[1]) > 0.35) q.push(p[i]); }
    var edge = function (a) { return a[0] < 1e-3 || a[1] < 1e-3 || a[0] > g.nx - 1 - 1e-3 || a[1] > g.ny - 1 - 1e-3; };
    var n = q.length, s = [];
    for (var k = 0; k < n; k++) {
      var a = q[k];
      if (edge(a) || (!loop && (k === 0 || k === n - 1))) { s.push(a); continue; }
      var b = q[(k - 1 + n) % n], c = q[(k + 1) % n];
      s.push([a[0] * 0.5 + (b[0] + c[0]) * 0.25, a[1] * 0.5 + (b[1] + c[1]) * 0.25]);
    }
    return s;
  }
  T.path = function (lines, sx, sy, ox, oy) {
    var d = '';
    lines.forEach(function (l) {
      l.pts.forEach(function (p, i) { d += (i ? 'L' : 'M') + (p[0] * sx - (ox || 0)).toFixed(1) + ' ' + (p[1] * sy - (oy || 0)).toFixed(1); });
      if (l.loop) d += 'Z';
    });
    return d;
  };
  T.bbox = function (lines) {
    var b = [1e9, 1e9, -1e9, -1e9];
    lines.forEach(function (l) { l.pts.forEach(function (p) { b[0] = Math.min(b[0], p[0]); b[1] = Math.min(b[1], p[1]); b[2] = Math.max(b[2], p[0]); b[3] = Math.max(b[3], p[1]); }); });
    return b;
  };
  T.spline = function (c, step) {
    var out = [], at = function (i) { return c[Math.max(0, Math.min(c.length - 1, i))]; };
    for (var i = 0; i < c.length - 1; i++) {
      var p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2), n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / (step || 2)));
      for (var s = 0; s < n; s++) {
        var t = s / n, t2 = t * t, t3 = t2 * t, pt = [];
        for (var k = 0; k < 2; k++) pt.push(0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3));
        out.push(pt);
      }
    }
    out.push(c[c.length - 1].slice(0, 2));
    return out;
  };
  T.inside = function (p, x, y) {
    var c = false;
    for (var i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
    return c;
  };

  root.EVTerrain = T;
})(typeof window !== 'undefined' ? window : globalThis);

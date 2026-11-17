// sprite-stack-short · world.js — the world a stacked object lives in: a painted ground texture (materials, paths, areas),
// stacked props, one mover on a closed path with its motion tables (speed from mass and curvature, heading, body roll and
// pitch through springs, drift for boats), a follow / orbit camera, and the frame renderer (ground turned with the camera,
// trail, shadows, stacks sorted by depth).
(function () {
  'use strict';
  const SS = window.SS, { rgba, hash, mix, mul } = SS;

  // ---------- materials: colour of a ground pixel at world (x, y); anim(x, y, step) → colour or 0 (sparkle, ripples) ----------
  const tone = (cs, v) => cs[Math.min(cs.length - 1, Math.max(0, Math.floor(v * cs.length)))];
  const vnoise = (x, y, s, seed) => {          // value noise, cell size s
    const X = Math.floor(x / s), Y = Math.floor(y / s), fx = x / s - X, fy = y / s - Y, h = (i, j) => hash(X + i, Y + j, seed);
    const sm = t => t * t * (3 - 2 * t), a = h(0, 0) + (h(1, 0) - h(0, 0)) * sm(fx), b = h(0, 1) + (h(1, 1) - h(0, 1)) * sm(fx);
    return a + (b - a) * sm(fy);
  };
  SS.vnoise = vnoise;
  const MAT = {
    grass: (o = {}) => { const cs = (o.colors || ['#3f9b3a', '#4aa83f', '#55b545', '#62c04e']).map(c => rgba(c)), tuft = rgba(o.tuft || '#2f7d31'), lite = rgba(o.lite || '#79cf5c');
      return { base: (x, y) => { const n = vnoise(x, y, 9, 11) * .6 + vnoise(x, y, 3, 12) * .4, h = hash(x, y, 13); return h < .05 ? tuft : h > .985 ? lite : tone(cs, n); } }; },
    asphalt: (o = {}) => { const a = rgba(o.color || '#3b3b40'), b = rgba(o.dark || '#323236'), c = rgba(o.fleck || '#4a4a50');
      return { base: (x, y) => { const h = hash(x, y, 21); return h < .08 ? b : h > .94 ? c : a; } }; },
    water: (o = {}) => { const cs = (o.colors || ['#1f5f9e', '#2468ab', '#2a72b8', '#3180c4']).map(c => rgba(c)), glint = rgba(o.glint || '#9fd3f0'), lite = rgba(o.lite || '#4a95d2');
      return { base: (x, y) => tone(cs, vnoise(x + y * .3, y, 14, 31) * .7 + vnoise(x, y, 5, 32) * .3),
        anim: (x, y, k) => { const xx = (x >> 1) + (k >> 1), yy = y >> 1, h = hash(xx, yy, 33 + (k & 7)); return h < .006 ? glint : h < .02 ? lite : 0; } }; },
    sand: (o = {}) => { const cs = (o.colors || ['#d9c18a', '#e0c994', '#e6d19e']).map(c => rgba(c)), dot = rgba(o.dot || '#c8ad75');
      return { base: (x, y) => hash(x, y, 41) < .06 ? dot : tone(cs, vnoise(x, y, 8, 42)) }; },
    snow: (o = {}) => { const cs = (o.colors || ['#dfe8f2', '#e9f0f7', '#f3f7fb']).map(c => rgba(c)), blue = rgba(o.shadow || '#c5d3e3');
      return { base: (x, y) => hash(x, y, 51) < .04 ? blue : tone(cs, vnoise(x, y, 10, 52)) }; },
    dirt: (o = {}) => { const cs = (o.colors || ['#8a6440', '#946c45', '#9e754b']).map(c => rgba(c)), peb = rgba(o.pebble || '#6f5034');
      return { base: (x, y) => hash(x, y, 61) < .07 ? peb : tone(cs, vnoise(x, y, 6, 62)) }; },
    planks: (o = {}) => { const cs = (o.colors || ['#a77b4f', '#b3865a', '#9c7148']).map(c => rgba(c)), gap = rgba(o.gap || '#5e4228'), n = o.board || 4, len = o.len || 14, vert = !!o.vertical;
      return { base: (x, y) => { const [u, v] = vert ? [y, x] : [x, y], row = Math.floor(v / n); if (((v % n) + n) % n === n - 1) return gap; const off = Math.floor(hash(row, 0, 71) * len); if ((((u + off) % len) + len) % len === 0) return gap; return cs[Math.floor(hash(Math.floor((u + off) / len), row, 72) * cs.length)]; } }; },
    tiles: (o = {}) => { const a = rgba(o.a || '#d8d2c4'), b = rgba(o.b || '#cbc4b4'), g = rgba(o.grout || '#b3ab99'), s = o.size || 8;
      return { base: (x, y) => { const i = ((x % s) + s) % s, j = ((y % s) + s) % s; if (!i || !j) return g; return ((Math.floor(x / s) + Math.floor(y / s)) & 1) ? a : b; } }; },
    flat: (o = {}) => { const c = rgba(o.color || '#888888'); return { base: () => c }; },
  };
  SS.MAT = MAT;
  const mat = (m) => typeof m === 'string' ? MAT[m]() : (m.kind ? MAT[m.kind](m) : m);

  // ---------- paths: closed (or open) Catmull-Rom through points, sampled every ~.5 px with arc length and curvature ----------
  SS.spline = function (pts, closed = true, step = .5) {
    const n = pts.length, P = i => closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    const raw = [];
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), seg = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), k = Math.max(4, Math.ceil(seg / step));
      for (let j = 0; j < k; j++) {
        const t = j / k, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        raw.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    if (!closed) raw.push(P(n - 1));
    const N = raw.length, x = new Float64Array(N), y = new Float64Array(N), s = new Float64Array(N), ang = new Float64Array(N), kap = new Float64Array(N);
    for (let i = 0; i < N; i++) { x[i] = raw[i][0]; y[i] = raw[i][1]; if (i) s[i] = s[i - 1] + Math.hypot(x[i] - x[i - 1], y[i] - y[i - 1]); }
    const len = s[N - 1] + (closed ? Math.hypot(x[0] - x[N - 1], y[0] - y[N - 1]) : 0);
    for (let i = 0; i < N; i++) { const a = closed ? (i + 1) % N : Math.min(N - 1, i + 1), b = closed ? (i - 1 + N) % N : Math.max(0, i - 1); ang[i] = Math.atan2(y[a] - y[b], x[a] - x[b]); }
    for (let i = 0; i < N; i++) {      // curvature: heading change over ±6 px
      const w = 12, a = closed ? (i + w) % N : Math.min(N - 1, i + w), b = closed ? (i - w + N) % N : Math.max(0, i - w);
      let d = ang[a] - ang[b]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      const ds = closed ? ((s[a] - s[b]) + len) % len : s[a] - s[b]; kap[i] = ds > 0 ? d / ds : 0;
    }
    const at = (q) => {             // position, heading, curvature at arc length q
      if (closed) q = ((q % len) + len) % len; else q = Math.max(0, Math.min(len, q));
      let lo = 0, hi = N - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (s[m] <= q) lo = m; else hi = m - 1; }
      const j = closed ? (lo + 1) % N : Math.min(N - 1, lo + 1), sj = j === 0 && closed ? len : s[j], f = sj > s[lo] ? (q - s[lo]) / (sj - s[lo]) : 0;
      let da = ang[j] - ang[lo]; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      return { x: x[lo] + (x[j] - x[lo]) * f, y: y[lo] + (y[j] - y[lo]) * f, a: ang[lo] + da * f, k: kap[lo] + (kap[j] - kap[lo]) * f };
    };
    return { x, y, s, ang, kap, N, len, closed, at, pts };
  };

  // ---------- the world ----------
  SS.world = function (spec) {
    const Wd = spec.size[0], Hd = spec.size[1], ground = mat(spec.ground || 'grass');
    const tex = new Uint32Array(Wd * Hd), mid = new Uint8Array(Wd * Hd), mats = [ground], names = [spec.groundName || (typeof spec.ground === 'string' ? spec.ground : (spec.ground && spec.ground.kind) || 'ground')];
    const addMat = (m, name) => { const i = mats.length; mats.push(mat(m)); names.push(name || (typeof m === 'string' ? m : m.kind || 'custom')); return i; };
    for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) tex[y * Wd + x] = ground.base(x, y);
    const paint = (i, x, y, c) => { const k = y * Wd + x; tex[k] = c != null ? c : mats[i].base(x, y); mid[k] = i; };

    // areas: polygons filled with a material, with an optional edge band outside (shore, kerb, foam)
    const inPoly = (poly, px, py) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) c = !c; } return c; };
    const bandStamp = (sp, wHalf, cb) => {       // distance field around a sampled curve, then cb(x, y, dist, arc)
      const dist = new Float32Array(Wd * Hd).fill(1e9), arc = new Float32Array(Wd * Hd), R = Math.ceil(wHalf) + 1;
      for (let i = 0; i < sp.N; i++) {
        const cx = sp.x[i], cy = sp.y[i];
        for (let y = Math.max(0, Math.floor(cy - R)); y <= Math.min(Hd - 1, Math.ceil(cy + R)); y++) for (let x = Math.max(0, Math.floor(cx - R)); x <= Math.min(Wd - 1, Math.ceil(cx + R)); x++) {
          const d = Math.hypot(x + .5 - cx, y + .5 - cy), k = y * Wd + x; if (d < dist[k]) { dist[k] = d; arc[k] = sp.s[i]; }
        }
      }
      for (let k = 0; k < Wd * Hd; k++) if (dist[k] <= wHalf) cb(k % Wd, (k / Wd) | 0, dist[k], arc[k]);
    };
    const edgeColor = (e, d, arc, x, y, inner) => {
      if (e.kind === 'curb') { const cs = (e.colors || ['#d83a33', '#f1ece2']).map(c => rgba(c)); return cs[Math.floor(arc / (e.dash || 5)) % cs.length]; }
      if (e.kind === 'foam') { const f = (d - inner) / (e.w || 2), h = hash(x, y, 81); return h > f * .9 ? rgba(e.color || '#e9f4fb') : rgba(e.color2 || '#a9d6ef'); }
      if (e.kind === 'line') return rgba(e.color || '#f1ece2');
      return null;
    };
    for (const a of spec.areas || []) {
      const i = addMat(a.fill, a.name);
      let x0 = Wd, y0 = Hd, x1 = 0, y1 = 0; for (const [x, y] of a.poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      if (a.edge) {
        const e = a.edge, ei = e.fill ? addMat(e.fill, e.name || 'edge') : i, sp = SS.spline(a.poly.concat([a.poly[0]]).slice(0, -1), true, .5);
        // an edge band around the polygon outline (straight segments, not a spline: sample the polygon itself)
        const P = a.poly, xs = [], ys = [], ss = []; let acc = 0;
        for (let k = 0; k < P.length; k++) { const p = P[k], q = P[(k + 1) % P.length], n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) * 2)); for (let j = 0; j < n; j++) { xs.push(p[0] + (q[0] - p[0]) * j / n); ys.push(p[1] + (q[1] - p[1]) * j / n); ss.push(acc); acc += Math.hypot(q[0] - p[0], q[1] - p[1]) / n; } }
        void sp;
        bandStamp({ x: xs, y: ys, s: ss, N: xs.length }, e.w || 2, (x, y, d, arc) => { if (!inPoly(P, x + .5, y + .5)) paint(ei, x, y, edgeColor(e, d, arc, x, y, 0)); });
      }
      for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(Hd - 1, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(Wd - 1, Math.ceil(x1)); x++) if (inPoly(a.poly, x + .5, y + .5)) paint(i, x, y);
    }
    // paths: a band of a material along a spline, an edge band (curb, foam, line), an optional centre dash
    const paths = (spec.paths || []).map(p => {
      const sp = SS.spline(p.pts, p.closed !== false), i = addMat(p.fill || 'asphalt', p.name), hw = (p.width || 16) / 2, e = p.edge, ew = e ? (e.w || 2) : 0;
      const ei = e && e.fill ? addMat(e.fill, e.name || 'edge') : i;
      bandStamp(sp, hw + ew, (x, y, d, arc) => {
        if (d <= hw) {
          if (p.centre && d <= (p.centre.w || 1) / 2 + .01 && Math.floor(arc / (p.centre.dash || 6)) % 2 === 0) paint(i, x, y, rgba(p.centre.color || '#efe7cf'));
          else if (p.paint !== false) paint(i, x, y);
        } else if (e) paint(ei, x, y, edgeColor(e, d, arc, x, y, hw));
      });
      return Object.assign({ sp, mat: i }, p);
    });
    for (const d of spec.decals || []) d(tex, Wd, Hd, (x, y, c) => { if (x >= 0 && y >= 0 && x < Wd && y < Hd) tex[y * Wd + x] = rgba(c); });

    const W = { spec, Wd, Hd, tex, mid, mats, names, paths, props: [], ground };
    W.matAt = (x, y) => { x = Math.floor(x); y = Math.floor(y); return (x >= 0 && y >= 0 && x < Wd && y < Hd) ? names[mid[y * Wd + x]] : names[0]; };

    // props: placed and scattered stacked models
    for (const p of spec.props || []) W.props.push(Object.assign({ a: 0 }, p));
    for (const s of spec.scatter || []) {
      const r = SS.rng(s.seed || 7), list = s.models, on = s.on ? [].concat(s.on) : [names[0]], gap = s.gap || 10, area = s.area || [0, 0, Wd, Hd];
      let placed = 0;
      for (let tries = 0; tries < s.n * 40 && placed < s.n; tries++) {
        const x = area[0] + r() * (area[2] - area[0]), y = area[1] + r() * (area[3] - area[1]), m = list[Math.floor(r() * list.length)], a = s.turn === false ? 0 : r() * Math.PI * 2;
        const R = m.R;
        let okc = true; for (let k = 0; k < 8 && okc; k++) { const q = k / 8 * Math.PI * 2; if (!on.includes(W.matAt(x + Math.cos(q) * R * .8, y + Math.sin(q) * R * .8))) okc = false; }
        if (!okc || !on.includes(W.matAt(x, y))) continue;
        if (W.props.some(p => Math.hypot(p.x - x, p.y - y) < (p.m.R + R) * .7 + gap)) continue;
        W.props.push({ m, x, y, a }); placed++;
      }
    }

    // ---------- the mover: speed planned from mass and curvature, heading, roll / pitch springs (tables at 240 Hz) ----------
    W.plan = function (dur) {
      const mv = spec.mover; if (!mv) return null;
      const sp = paths[mv.path || 0].sp, hz = 240, n = Math.ceil(dur * hz) + 2;
      const mass = mv.mass || 1, cruise = mv.speed || 40, accel = mv.accel || (60 / mass), brake = mv.brake || accel * 1.5, lat = mv.lat || 90 / Math.sqrt(mass);
      // the fastest speed allowed at each arc length (curvature, then braking ahead), two laps for a closed loop
      const G = Math.ceil(sp.len), vmax = new Float64Array(G + 1);
      for (let g = 0; g <= G; g++) { const k = Math.abs(sp.at(g).k); vmax[g] = Math.min(cruise, k > 1e-6 ? Math.sqrt(lat / k) : cruise); }
      for (let lap = 0; lap < 2; lap++) for (let g = G - 1; g >= 0; g--) { const nx = vmax[(g + 1) % (G + 1)]; vmax[g] = Math.min(vmax[g], Math.sqrt(nx * nx + 2 * brake)); }
      const vAt = q => vmax[Math.floor(((q % sp.len) + sp.len) % sp.len)];
      const T = { hz, n, s: new Float64Array(n), v: new Float64Array(n), hd: new Float64Array(n), roll: new Float64Array(n), pitch: new Float64Array(n), va: new Float64Array(n), alat: new Float64Array(n), alon: new Float64Array(n), x: new Float64Array(n), y: new Float64Array(n) };
      const stiff = mv.stiff || 26 / Math.sqrt(mass), damp = mv.damp || 2 * Math.sqrt(stiff) * .55, rollK = mv.roll == null ? .03 : mv.roll, pitchK = mv.pitch == null ? .04 : mv.pitch;
      const yawK = mv.drift ? (mv.yaw || 5 / Math.sqrt(mass)) : 0, t0 = mv.start || 0, t1 = mv.stop == null ? 1e9 : mv.stop;
      let s = mv.s0 || 0, v = 0, r = 0, rv = 0, p = 0, pv = 0, hd = sp.at(s).a, prevA = sp.at(s).a, unw = hd;
      for (let i = 0; i < n; i++) {
        const t = i / hz, dt = 1 / hz, here = sp.at(s);
        let target = (t < t0 || t > t1) ? 0 : vAt(s);
        if (t >= t1) target = 0;
        const dv = Math.max(-brake * dt, Math.min(accel * dt, target - v)), alon = dv / dt; v = Math.max(0, v + dv); s += v * dt;
        // unwrapped path heading, then the body heading (equal for wheels; lagging = sliding for boats / drifters)
        let da = here.a - prevA; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; unw += da; prevA = here.a;
        if (yawK) { hd += (unw - hd) * Math.min(1, yawK * dt * (0.4 + v / cruise)); const lim = mv.drift * Math.PI / 180; hd = Math.max(unw - lim, Math.min(unw + lim, hd)); } else hd = unw;
        const alat = v * v * here.k;
        // springs: the top of the body leans out of the turn (roll) and back on acceleration (pitch), overshoots and settles
        const rt = -alat * rollK, pt = -alon * pitchK;
        rv += (stiff * (rt - r) - damp * rv) * dt; r += rv * dt;
        pv += (stiff * (pt - p) - damp * pv) * dt; p += pv * dt;
        T.s[i] = s; T.v[i] = v; T.hd[i] = hd; T.va[i] = unw; T.roll[i] = r; T.pitch[i] = p; T.alat[i] = alat; T.alon[i] = alon; T.x[i] = here.x; T.y[i] = here.y;
      }
      const maxLean = mv.lean == null ? 2 : mv.lean;
      T.at = (t) => { const f = Math.max(0, Math.min(n - 1.001, t * hz)), i = Math.floor(f), u = f - i, L = (A) => A[i] + (A[i + 1] - A[i]) * u, q = sp.at(L(T.s));
        return { x: q.x, y: q.y, a: L(T.hd), va: L(T.va), v: L(T.v), s: L(T.s), roll: Math.max(-maxLean, Math.min(maxLean, L(T.roll))), pitch: Math.max(-maxLean, Math.min(maxLean, L(T.pitch))), alat: L(T.alat), alon: L(T.alon) }; };
      T.sp = sp; T.mv = mv; T.maxLean = maxLean;
      // the camera: a spring follow on position (with look-ahead) and on the turn
      const cam = spec.camera || {}, ck = cam.stiff || 3.2, cTurn = cam.turn == null ? .5 : cam.turn, lead = cam.lead == null ? .35 : cam.lead;
      T.cx = new Float64Array(n); T.cy = new Float64Array(n); T.ca = new Float64Array(n);
      let cxv = T.x[0], cyv = T.y[0], cav = T.hd[0];
      for (let i = 0; i < n; i++) {
        const a = T.hd[i], tx = T.x[i] + Math.cos(a) * T.v[i] * lead, ty = T.y[i] + Math.sin(a) * T.v[i] * lead, dt = 1 / hz;
        cxv += (tx - cxv) * Math.min(1, ck * dt); cyv += (ty - cyv) * Math.min(1, ck * dt); cav += (a - cav) * Math.min(1, ck * .6 * dt);
        T.cx[i] = cxv; T.cy[i] = cyv; T.ca[i] = cav;
      }
      T.cam = (t) => { const f = Math.max(0, Math.min(n - 1.001, t * hz)), i = Math.floor(f), u = f - i, L = (A) => A[i] + (A[i + 1] - A[i]) * u;
        return { x: L(T.cx), y: L(T.cy), rot: (L(T.ca) + Math.PI / 2) * cTurn + (cam.rot0 || 0) }; };
      W.T = T; return T;
    };

    // ---------- the frame ----------
    // R: Raster (art size); t: film time; o: { cam: {x, y, rot}, zoomed art size from R; light; trail; mover visible }
    W.render = function (R, t, o = {}) {
      const T = W.T, cam = o.cam || (T ? T.cam(t) : { x: Wd / 2, y: Hd / 2, rot: 0 }), cr = Math.cos(cam.rot), sr = Math.sin(cam.rot);
      const cx = R.w / 2, cy = R.h / 2 + (o.yoff || 0), step = Math.floor(t * 8), data = R.data;
      // screen → world: w = cam + Rot(rot) · (s − c)
      for (let py = 0; py < R.h; py++) {
        const dy = py + .5 - cy;
        for (let px = 0; px < R.w; px++) {
          const dx = px + .5 - cx, wx = cam.x + dx * cr - dy * sr, wy = cam.y + dx * sr + dy * cr, X = Math.floor(wx), Y = Math.floor(wy);
          let c, m;
          if (X >= 0 && Y >= 0 && X < Wd && Y < Hd) { const k = Y * Wd + X; c = tex[k]; m = mats[mid[k]]; } else { c = ground.base(X, Y); m = ground; }
          if (m.anim) { const a = m.anim(X, Y, step); if (a) c = a; }
          data[py * R.w + px] = c;
        }
      }
      const toScreen = (wx, wy) => { const dx = wx - cam.x, dy = wy - cam.y; return [cx + dx * cr + dy * sr, cy - dx * sr + dy * cr]; };
      const light = o.light == null ? (spec.light == null ? -2.3 : spec.light) : o.light;
      // the trail: foam (wake) or dust behind the mover, thinning with age
      const mv = spec.mover, items = [];
      if (T && mv && o.mover !== false) {
        const now = T.at(t), M = mv.model;
        if (mv.trail) {
          const tr = mv.trail, cs = (tr.colors || (tr.kind === 'dust' ? ['#b59a74', '#cdb791'] : ['#eef7fc', '#bfe2f4'])).map(c => rgba(c)), ages = tr.n || 26;
          for (let k = 1; k <= ages; k++) {
            const tt = t - k * (tr.dt || .07); if (tt < 0) break;
            const p = T.at(tt); if (p.v < 2) continue;
            const ca = Math.cos(p.a), sa = Math.sin(p.a), back = -M.L / 2 + 1, spreadW = M.W / 2 + k * (tr.spread || .35);
            for (let j = -3; j <= 3; j++) {
              const side = j < 0 ? -1 : 1, lat = j === 0 ? 0 : side * spreadW * (Math.abs(j) / 3);
              if (hash(k, j, Math.floor(tt * 30)) > (1 - k / (ages + 1)) * .9) continue;
              const wx = p.x + ca * back - sa * lat, wy = p.y + sa * back + ca * lat, [sx, sy] = toScreen(wx, wy);
              R.px(Math.floor(sx), Math.floor(sy), cs[(k + j) & 1]);
              if (k < ages * .5) R.px(Math.floor(sx) + 1, Math.floor(sy), cs[1]);
            }
          }
        }
        items.push({ m: M, wx: now.x, wy: now.y, a: now.a, lean: [now.pitch, now.roll], mover: true, bob: mv.bob });
      }
      for (const p of W.props) items.push({ m: p.m, wx: p.x, wy: p.y, a: p.a || 0, sway: p.sway });
      const vis = [];
      for (const it of items) {
        const [sx, sy] = toScreen(it.wx, it.wy), R2 = it.m.R + it.m.H + 2;
        if (sx < -R2 || sy < -R2 || sx > R.w + R2 || sy > R.h + R2 + it.m.H) continue;
        vis.push(Object.assign(it, { sx, sy, sa: it.a - cam.rot }));
      }
      for (const it of vis) { const [dx, dy] = SS.shadowOffset(it.m, light); SS.shadow(R, it.m, { x: it.sx, y: it.sy, a: it.sa, dx, dy }); }
      vis.sort((a, b) => a.sy - b.sy);
      for (const it of vis) {
        let lean = it.lean ? [it.lean[0], it.lean[1]] : [0, 0], alt = 0;
        const idle = it.m.idle || {};
        if (idle.roll) lean[1] += idle.roll * Math.sin(t * 2 * Math.PI / (idle.period || 2.6));
        if (idle.pitch) lean[0] += idle.pitch * Math.sin(t * 2 * Math.PI / (idle.period || 2.6) * .73 + 1);
        if (idle.bob) alt += Math.round((Math.sin(t * 2 * Math.PI / (idle.bobPeriod || idle.period || 2.6)) * .5 + .5) * idle.bob);
        if (it.sway) lean[1] += it.sway * Math.sin(t * 1.7 + it.wx * .07);
        SS.draw(R, it.m, { x: it.sx, y: it.sy, a: it.sa, lean, alt, light });
      }
      W.last = { cam, vis, toScreen };
      return W.last;
    };
    return W;
  };
})();

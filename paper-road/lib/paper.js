/* paper-road · lib/paper.js — the engine for papercraft stop-motion road trips. Defines window.PR.
   Classic script (no modules, no dependencies): opens by double-click (file://) and in headless Playwright.

   The world is a paper diorama: a teal paper wall, a cream paper floor (y = 0), stand-up paper cards (mountains,
   clouds, a sun, a car) and a road — a 3D path built like turtle graphics — that is revealed as time goes on: a paper
   ribbon unrolls from a roll, or a fountain pen inks it onto the floor. A small perspective camera (target, distance,
   yaw, elevation, fov keyframes) projects everything; cards are drawn with plain Canvas 2D code under an affine
   transform, so a prop is ordinary 2D drawing.

   Every frame is a pure function of t. Motion is held on twos (steps: 12 → each pose holds two 24 fps frames) and
   every card "boils" (a tiny per-pose jitter), which is what makes it read as stop-motion instead of CG. */
(function (root) {
  'use strict';
  const D2R = Math.PI / 180;

  // ---------- numbers ----------
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, u) => a + (b - a) * u;
  const smooth = (a, b, v) => { const u = clamp((v - a) / (b - a)); return u * u * (3 - 2 * u); };
  const EASE = {
    linear: u => u,
    in: u => u * u * u,
    out: u => 1 - Math.pow(1 - u, 3),
    inOut: u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
    sine: u => 0.5 - 0.5 * Math.cos(Math.PI * u),
    hold: () => 0,
  };
  // back-out: 0 → 1 with one overshoot (k = 1.7 → peak ≈ 1.10), the "springy paper" curve of every pop-up
  function backOut(u, k = 1.7) { u = clamp(u); const c = k + 1; return 1 + c * Math.pow(u - 1, 3) + k * Math.pow(u - 1, 2); }
  function hash(a, b = 0) {
    let h = Math.imul(a | 0, 374761393) ^ Math.imul((b | 0) + 1013, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function rng(seed) {
    let a = (Math.imul(seed | 0, 2654435761) ^ 0x9e3779b9) >>> 0;
    const r = () => {
      a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    r.range = (lo, hi) => lo + (hi - lo) * r();
    r.pick = arr => arr[Math.floor(r() * arr.length)];
    return r;
  }
  const V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)],
  };

  // ---------- colour ----------
  function rgb(c) { const h = c.replace('#', ''); const s = h.length === 3 ? h.split('').map(x => x + x).join('') : h; return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)); }
  const hex = v => '#' + v.map(x => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0')).join('');
  const mix = (c1, c2, u) => { const a = rgb(c1), b = rgb(c2); return hex([0, 1, 2].map(i => lerp(a[i], b[i], u))); };
  const shade = (c, k) => k >= 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k);

  // ---------- keyframe tracks ----------
  // track([[t, v], …]) → v(t): monotone cubic through the keys (no overshoot, smooth speed), held before/after.
  // A key may carry an ease name as a third item ([t, v, 'hold'] holds the previous value until t).
  function track(keys) {
    const k = keys.map(a => a.slice()), n = k.length;
    if (n === 1) return () => k[0][1];
    const d = [], m = [];
    for (let i = 0; i < n - 1; i++) d.push((k[i + 1][1] - k[i][1]) / (k[i + 1][0] - k[i][0] || 1));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
      if (h > 9) { const s = 3 / Math.sqrt(h); m[i] = s * a * d[i]; m[i + 1] = s * b * d[i]; }
    }
    // keys that start or end a stop: zero speed there (a car parks, the pen pauses)
    for (let i = 0; i < n; i++) if (k[i][2] === 'stop') m[i] = 0;
    return t => {
      if (t <= k[0][0]) return k[0][1];
      if (t >= k[n - 1][0]) return k[n - 1][1];
      let i = 0; while (t > k[i + 1][0]) i++;
      const [t0, v0] = k[i], [t1, v1, e] = k[i + 1], h = t1 - t0, u = (t - t0) / h;
      if (e === 'hold') return v0;
      if (e && EASE[e]) return lerp(v0, v1, EASE[e](u));
      const u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * h * m[i + 1];
    };
  }

  // runMax(fn, duration): fn made non-decreasing (a running maximum, sampled at 1/240 s) — for "how far the road
  // exists", which may be written as car + lead but must never shrink back.
  function runMax(fn, dur, rate = 240) {
    const n = Math.ceil(dur * rate) + 1, tab = new Float64Array(n); let m = -Infinity;
    for (let i = 0; i < n; i++) { m = Math.max(m, fn(i / rate)); tab[i] = m; }
    return t => { const x = clamp(t * rate, 0, n - 1), i = Math.floor(x), j = Math.min(n - 1, i + 1); return lerp(tab[i], tab[j], x - i); };
  }

  // ---------- paths: a 3D road built like turtle graphics ----------
  // path({x, y, z}).go(len).pitch(deg, r).yaw(deg, r).style('ink').mark('name').done()
  //   go: straight ahead · pitch: bend up (+) / down (−) in the vertical plane (360 = a loop) · yaw: turn on the floor,
  //   + = away from the camera (into z) · {dz} on go/pitch drifts sideways so a loop does not hit itself.
  //   style applies to what is built after it: 'paper' (a ribbon with a printed road) or 'ink' (a road drawn on the floor).
  function path(o = {}) {
    const step = o.step || 5;
    let x = o.x || 0, y = o.y || 0, z = o.z || 0, p = (o.pitch || 0) * D2R, w = (o.yaw || 0) * D2R, s = 0, style = o.style || 'paper';
    const pts = [], marks = {};
    const push = () => pts.push({ x, y, z, s, p, w, style });
    push();
    function adv(len, n, dp, dw, dz, dy) {
      const ds = len / n;
      for (let i = 0; i < n; i++) {
        const pm = p + dp / 2, wm = w + dw / 2;
        x += Math.cos(pm) * Math.cos(wm) * ds; y += Math.sin(pm) * ds + dy / n; z += Math.cos(pm) * Math.sin(wm) * ds + dz / n;
        p += dp; w += dw; s += ds; push();
      }
    }
    const api = {
      go(len, q = {}) { adv(len, Math.max(1, Math.ceil(len / step)), 0, 0, q.dz || 0, q.dy || 0); return api; },
      pitch(deg, r, q = {}) { const a = deg * D2R, len = Math.abs(a) * r, n = Math.max(2, Math.ceil(len / step)); adv(len, n, a / n, 0, q.dz || 0, 0); return api; },
      yaw(deg, r, q = {}) { const a = deg * D2R, len = Math.abs(a) * r, n = Math.max(2, Math.ceil(len / step)); adv(len, n, 0, a / n, 0, q.dy || 0); return api; },
      style(name) { style = name; return api; },
      mark(name) { marks[name] = s; return api; },
      get s() { return s; },
      done() { return makePath(pts, marks); },
    };
    return api;
  }
  function makePath(pts, marks) {
    const L = pts[pts.length - 1].s;
    const idx = s => { let a = 0, b = pts.length - 1; while (b - a > 1) { const m = (a + b) >> 1; if (pts[m].s <= s) a = m; else b = m; } return a; };
    function at(s) {
      s = clamp(s, 0, L);
      const i = Math.min(idx(s), pts.length - 2), a = pts[i], b = pts[i + 1], u = (s - a.s) / (b.s - a.s || 1);
      const P = [lerp(a.x, b.x, u), lerp(a.y, b.y, u), lerp(a.z, b.z, u)];
      const T = V.norm([b.x - a.x, b.y - a.y, b.z - a.z]);
      const w = lerp(a.w, b.w, u), W = [-Math.sin(w), 0, Math.cos(w)];
      const N = V.norm(V.cross(W, T));            // the road's top side (up on flat ground, inward in a loop)
      return { P, T, W, N, s, style: b.style, pitch: lerp(a.p, b.p, u) };
    }
    const firstOf = name => { for (const q of pts) if (q.style === name) return q.s; return null; };
    return { pts, marks, length: L, at, m: name => { if (!(name in marks)) throw new Error('no mark ' + name); return marks[name]; }, firstOf };
  }

  // ---------- the camera ----------
  function makeView(c, W, H) {
    const yaw = c.yaw * D2R, el = c.elev * D2R;
    const off = [Math.sin(yaw) * Math.cos(el), Math.sin(el), -Math.cos(yaw) * Math.cos(el)];
    const eye = V.add(c.target, V.mul(off, c.dist));
    const fwd = V.norm(V.sub(c.target, eye)), right = V.norm(V.cross([0, 1, 0], fwd)), up = V.cross(fwd, right);
    const roll = (c.roll || 0) * D2R, cr = Math.cos(roll), sr = Math.sin(roll);
    const R = V.add(V.mul(right, cr), V.mul(up, sr)), U = V.sub(V.mul(up, cr), V.mul(right, sr));
    const f = (H / 2) / Math.tan(c.fov * D2R / 2), near = 12;
    const cam = p => { const d = V.sub(p, eye); return [V.dot(d, R), V.dot(d, U), V.dot(d, fwd)]; };
    const fromCam = q => { const k = f / q[2]; return { x: W / 2 + q[0] * k, y: H / 2 - q[1] * k, k, z: q[2] }; };
    const proj = p => { const q = cam(p); return q[2] < near ? null : fromCam(q); };
    // clip a 3D polygon against the near plane, return screen points (for the floor and big quads)
    function poly(ps) {
      const q = ps.map(cam), out = [];
      for (let i = 0; i < q.length; i++) {
        const a = q[i], b = q[(i + 1) % q.length], ia = a[2] >= near, ib = b[2] >= near;
        if (ia) out.push(a);
        if (ia !== ib) { const u = (near - a[2]) / (b[2] - a[2]); out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u), near]); }
      }
      return out.map(fromCam);
    }
    return { ...c, eye, fwd, right: R, up: U, f, W, H, near, cam, proj, poly, depth: p => V.dot(V.sub(p, eye), fwd) };
  }

  // ---------- paper grain: one seeded texture, used as a multiply pattern ----------
  function grain(seed, size = 384, amount = 1) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'), img = x.createImageData(size, size), r = rng(seed);
    // value noise, two octaves, tileable
    const lat = (n, s) => { const g = []; for (let i = 0; i < n * n; i++) g.push(rng(s * 97 + i)()); return (u, v) => {
      const X = u * n, Y = v * n, i0 = Math.floor(X), j0 = Math.floor(Y), fx = X - i0, fy = Y - j0;
      const G = (i, j) => g[((j % n + n) % n) * n + ((i % n + n) % n)], sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      return lerp(lerp(G(i0, j0), G(i0 + 1, j0), sx), lerp(G(i0, j0 + 1), G(i0 + 1, j0 + 1), sx), sy); }; };
    const n1 = lat(12, seed + 1), n2 = lat(48, seed + 2);
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
      const u = i / size, v = j / size, k = (j * size + i) * 4;
      const val = 255 - amount * (10 * n1(u, v) + 9 * n2(u, v) + 7 * r());
      img.data[k] = val; img.data[k + 1] = val - amount * 1.5; img.data[k + 2] = val - amount * 4; img.data[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    // a few fibres
    x.globalAlpha = 0.11 * amount; x.strokeStyle = '#6b5a40'; x.lineWidth = 0.7;
    for (let i = 0; i < 70; i++) {
      const px = r() * size, py = r() * size, a = r() * Math.PI, l = 6 + r() * 18;
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + (r() - 0.5) * 4, py + Math.sin(a) * l * 0.5 + (r() - 0.5) * 4, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
    }
    return c;
  }

  // ======================================================================================================
  function create(o = {}) {
    const W = o.W || 1920, H = o.H || 1080, FPS = o.fps || 24, STEPS = o.steps ?? 12, DURATION = o.duration || 30;
    const q = new URLSearchParams(root.location ? root.location.search : '');
    const off = new Set((q.get('off') || '').split(',').filter(Boolean));
    if (q.has('steps')) o.steps = +q.get('steps');
    const steps = q.has('steps') ? +q.get('steps') : STEPS;
    const render = q.has('render');
    const pal = Object.assign({
      wall: '#3fb0b4', wallTop: '#2c8c93', wallGlow: '#7fd3d0', floor: '#efe6d3', floorFar: '#f6efe0', ink: '#211d1a',
      paper: '#f4ecdc', paperBack: '#ddd2bd', road: '#2a2a2e', dash: '#f4efe4', shadow: 'rgba(52,38,22,0.30)',
    }, o.palette || {});
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
    let S = 1;                                     // device px per design px (1 in render mode)
    const grainTex = grain(o.seed || 7, 384, o.grain ?? 1);
    const pattern = ctx.createPattern(grainTex, 'repeat');
    const noiseTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), img = x.createImageData(256, 256), r = rng(991);
      for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (r() - 0.5) * 120; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } x.putImageData(img, 0, 0); return c; })();

    // soft(g, M, box, blur, fn, alpha, dx, dy): draw fn (local coords under the affine M, device px) into a small
    // scratch canvas at 1/(blur/2) size and scale it back up — a blur that costs almost nothing, unlike ctx.filter,
    // which is slow in a software-rendered (headless) canvas.
    const scratch = document.createElement('canvas'), sx = scratch.getContext('2d');
    function soft(g, M, box, blur, fn, alpha = 1, dx = 0, dy = 0) {
      const [x0, y0, x1, y1] = box, xs = [], ys = [];
      for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) { xs.push(M[0] * x + M[2] * y + M[4] + dx); ys.push(M[1] * x + M[3] * y + M[5] + dy); }
      // the region may run past the screen edges (so an edge never cuts a blurred card), and the scratch always keeps a
      // cleared margin beyond it: smoothing samples one pixel past the source rect, which must be transparent every time
      const pad = blur * 2 + 2, M2 = pad * 2;
      const X0 = Math.max(-M2, Math.floor(Math.min(...xs) - pad)), Y0 = Math.max(-M2, Math.floor(Math.min(...ys) - pad));
      const X1 = Math.min(canvas.width + M2, Math.ceil(Math.max(...xs) + pad)), Y1 = Math.min(canvas.height + M2, Math.ceil(Math.max(...ys) + pad));
      if (X1 <= X0 || Y1 <= Y0) return;
      const d = Math.max(1, blur / 1.4), w = Math.ceil((X1 - X0) / d) + 1, h = Math.ceil((Y1 - Y0) / d) + 1;
      // sized exactly per call: drawing from a larger, reused canvas gave different pixels from frame to frame
      scratch.width = w + 4; scratch.height = h + 4;
      sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalAlpha = 1; sx.globalCompositeOperation = 'source-over'; sx.clearRect(0, 0, scratch.width, scratch.height);
      sx.save(); sx.setTransform(M[0] / d, M[1] / d, M[2] / d, M[3] / d, (M[4] + dx - X0) / d, (M[5] + dy - Y0) / d);
      fn(sx); sx.restore();
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha *= alpha; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(scratch, 0, 0, w, h, X0, Y0, w * d, h * d); g.restore();
    }

    const R = {
      W, H, FPS, DURATION, steps, pal, off, ctx, canvas, q, soft,
      layers: [], cams: null, light: V.norm([-0.45, 0.8, -0.5]), wallZ: o.wallZ ?? 1600,
      grain: pattern,
      view: null, t: 0, T: 0, pose: 0,
    };
    R.held = t => steps > 0 ? Math.floor(t * steps + 1e-6) / steps : t;
    R.poseOf = t => steps > 0 ? Math.floor(t * steps + 1e-6) : Math.floor(t * FPS + 1e-6);
    // boil: a tiny jitter that changes once per pose — hand-placed stop-motion. amp in world units / degrees.
    R.boil = (id, amp = 1) => off.has('boil') ? [0, 0, 0] : [(hash(id, R.pose * 3) - 0.5) * 2 * amp, (hash(id, R.pose * 3 + 1) - 0.5) * 2 * amp, (hash(id, R.pose * 3 + 2) - 0.5) * 2 * amp];

    // ----- camera keys: {t, target: [x,y,z] | t => [x,y,z], dist, yaw, elev, fov, roll, ease} (missing values carry over)
    R.camera = keys => {
      const base = { target: [0, 0, 0], dist: 900, yaw: 0, elev: 8, fov: 32, roll: 0, ease: 'inOut' };
      let prev = base; R.cams = keys.map(k => (prev = Object.assign({}, prev, k)));
      return R;
    };
    const val = (k, t) => typeof k === 'function' ? k(t) : k;
    R.cameraAt = t => {
      const K = R.cams || [{ t: 0, target: [0, 80, 0], dist: 900, yaw: 0, elev: 8, fov: 32, roll: 0 }];
      let i = 0; while (i < K.length - 1 && t >= K[i + 1].t) i++;
      const A = K[i], B = K[Math.min(i + 1, K.length - 1)];
      const u = B === A ? 0 : (EASE[B.ease] || EASE.inOut)(clamp((t - A.t) / (B.t - A.t)));
      const c = {}; for (const n of ['dist', 'yaw', 'elev', 'fov', 'roll']) c[n] = lerp(val(A[n], t), val(B[n], t), u);
      c.target = V.lerp(val(A.target, t), val(B.target, t), u);
      return c;
    };
    // follow(fn, lag): a camera target that trails a moving point (average over the last `lag` seconds) — no state
    R.follow = (fn, lag = 0.5, offset = [0, 0, 0]) => t => {
      let a = [0, 0, 0]; const n = 8;
      for (let i = 0; i < n; i++) a = V.add(a, fn(Math.max(0, t - lag * i / (n - 1))));
      return V.add(V.mul(a, 1 / n), offset);
    };

    // ----- depth of field: cards away from the focus distance (the camera's distance to its target) go soft,
    // like a macro lens on a tabletop set. dof: blur in px per unit of |1 − focus / depth| (0 = off).
    R.dof = o.dof ?? 9;
    R.dofAt = depth => {
      if (!R.dof || off.has('dof') || !R.view) return 0;
      const fz = R.view.dist; return clamp(R.dof * Math.abs(1 - fz / Math.max(depth, 1)), 0, R.dof);
    };

    // ----- layers: fn(t, view, items) pushes {z, draw(ctx)} items; they are drawn far → near
    R.add = (fn, name) => { R.layers.push({ fn, name }); return R; };

    // ----- cards: flat paper cut-outs standing in the world, drawn with ordinary 2D code under an affine transform
    // {at: [x,y,z] | t => …, face: 'front' | 'camera' | t => {U, V}, scale, pop: {t, dur, mode: fold|scale|drop|rise},
    //  out: {t, dur}, shape(ctx, t) (silhouette path, for shadow + grain), paint(ctx, t), box: [x0,y0,x1,y1],
    //  shadow (0–1), texture (0–1), boil (world units), clipFloor (cut below y = 0), mirror: t => bool, from, to}
    let cardId = 0;
    R.card = c => {
      const id = ++cardId, name = c.name || 'card';
      c = Object.assign({ face: 'front', scale: 1, shadow: 1, texture: 1, boil: 0.8, clipFloor: false, box: [-200, -400, 200, 10] }, c);
      R.add((t, view, items) => {
        if (off.has(name)) return;
        if (c.from != null && t < c.from) return; if (c.to != null && t >= c.to) return;
        let at = val(c.at, t).slice(), sc = val(c.scale, t), fold = 0;
        if (c.pop) {
          const u = (t - c.pop.t) / (c.pop.dur || 0.5); if (u < 0) return;
          const m = c.pop.mode || 'fold', b = backOut(u, c.pop.k ?? 1.7);
          if (m === 'scale') sc *= b; else if (m === 'fold') fold = (1 - b) * 88 * D2R;
          else if (m === 'drop') at[1] += (1 - b) * (c.pop.h || 260);
          else if (m === 'rise') at[1] -= (1 - EASE.out(clamp(u))) * (c.pop.h || 300);
          if (sc <= 0.001) return;
        }
        if (c.out) { const u = clamp((t - c.out.t) / (c.out.dur || 0.4)); if (u >= 1) return; if (c.out.mode === 'fold') fold = EASE.in(u) * 88 * D2R; else sc *= 1 - EASE.in(u); }
        let U, Vu;
        const f = typeof c.face === 'function' ? c.face(t, view) : null;
        if (f) { U = f.U; Vu = f.V; }
        else if (c.face === 'camera') { U = V.norm([view.right[0], 0, view.right[2]]); Vu = [0, 1, 0]; }
        else { U = [1, 0, 0]; Vu = [0, 1, 0]; }
        if (fold) { const Z = V.norm(V.cross(U, Vu)); Vu = V.add(V.mul(Vu, Math.cos(fold)), V.mul(Z, -Math.sin(fold))); }
        if (c.boil) { const b = R.boil(id, c.boil); at = V.add(at, [b[0], b[1] * 0.6, 0]); }
        const rot = c.boil ? (R.boil(id + 7777, 0.35)[0]) * D2R : 0;
        const O = view.proj(at); if (!O) return;
        // cull: a card closer than its own size (it would straddle the near plane and blow up) or wholly off screen
        const rad = Math.max(...c.box.map(Math.abs)) * sc;
        if (O.z < rad * 0.8 + view.near) return;
        const rpx = rad * O.k; if (O.x < -rpx || O.x > W + rpx || O.y < -rpx || O.y > H + rpx * 2) return;
        const kk = 40, pu = view.proj(V.add(at, V.mul(U, kk))), pv = view.proj(V.sub(at, V.mul(Vu, kk))); if (!pu || !pv) return;
        let a = (pu.x - O.x) / kk * sc, b = (pu.y - O.y) / kk * sc, cx = (pv.x - O.x) / kk * sc, dy = (pv.y - O.y) / kk * sc;
        if (rot) { const cr = Math.cos(rot), sr = Math.sin(rot); [a, b, cx, dy] = [a * cr + cx * sr, b * cr + dy * sr, cx * cr - a * sr, dy * cr - b * sr]; }
        if (c.mirror && c.mirror(t)) { a = -a; b = -b; }
        const depth = O.z + (c.zBias || 0), k = O.k * sc;
        items.push({ z: depth, name, draw(g) {
          g.save();
          const M = [S * a, S * b, S * cx, S * dy, S * O.x, S * O.y];
          g.setTransform(...M);
          if (c.clipFloor) { const yl = at[1] / sc; g.beginPath(); g.rect(-1e4, -1e4, 2e4, 1e4 + yl); g.clip(); }
          if (c.shadow && !off.has('shadow')) {
            // a soft drop shadow: the silhouette drawn small and scaled up (a cheap blur), offset down-right
            soft(g, M, c.box, Math.max(1.5, 5 * k * S), x => { x.fillStyle = pal.shadow; x.beginPath(); c.shape(x, t); x.fill(); }, 1, 9 * k * S * c.shadow, 7 * k * S * c.shadow);
          }
          const body = x => {
            c.paint(x, t, { k, view });
            if (c.texture && !off.has('texture')) {
              x.beginPath(); c.shape(x, t); x.clip();
              x.globalCompositeOperation = 'multiply'; x.globalAlpha = c.texture; x.fillStyle = pattern;
              const [x0, y0, x1, y1] = c.box; x.fillRect(x0, y0, x1 - x0, y1 - y0);
            }
          };
          const bl = ((c.blur || 0) + R.dofAt(depth)) * S;
          if (bl > 0.8) soft(g, M, c.box, bl, body); else body(g);
          g.restore();
        } });
      }, name);
      return R;
    };

    // ----- the road -----------------------------------------------------------------------------------
    // road(path, {reveal: t => s, width, inkWidth, band, roll: {t, r}, pen: {in, out, ...}})
    R.road = (P, o = {}) => {
      const width = o.width || 120, inkW = o.inkWidth || 60, band = o.band ?? 0.5, dashL = o.dash || [16, 14];
      const reveal = o.reveal || (() => P.length), from = o.from || 0, L = P.length;
      const paperEnd = (() => { let e = 0; for (const q of P.pts) if (q.style === 'paper') e = q.s; return e; })();
      const L_ = R.light;
      R.add((t, view, items) => {
        if (off.has('road')) return;
        const s1 = clamp(reveal(t), 0, L);
        const pts = P.pts.filter(p => p.s > from && p.s < s1);
        const first = P.at(from), last = P.at(s1);
        const seq = [{ ...first, x: first.P[0], y: first.P[1], z: first.P[2], s: from, w: Math.atan2(-first.W[0], first.W[2]), style: first.style }]
          .concat(pts.map(p => ({ ...p, P: [p.x, p.y, p.z] })))
          .concat([{ ...last, x: last.P[0], y: last.P[1], z: last.P[2], s: s1, w: Math.atan2(-last.W[0], last.W[2]), style: last.style }]);
        const CH = 6;
        for (let i0 = 0; i0 < seq.length - 1; i0 += CH) {
          // a chunk paints its own surface but redraws edges and dashes two segments into each neighbour, so whichever
          // neighbour is painted later cannot leave a notch in a dash
          const e0 = Math.max(0, i0 - 2), e1 = Math.min(seq.length, i0 + CH + 3);
          const chunk = seq.slice(e0, e1), core = [i0 - e0, Math.min(seq.length - 1, i0 + CH) - e0];
          const mid = seq[Math.min(seq.length - 1, i0 + (CH >> 1))];
          const dz = view.depth([mid.x, mid.y, mid.z]);
          if (dz < view.near) continue;
          items.push({ z: dz + (seq[i0 + 1].style === 'ink' ? 400 : 0), draw: g => drawStrip(g, view, chunk, core) });
        }
        // head: a paper roll while the ribbon unrolls; a pen while ink is drawn
        if (o.roll && t >= o.roll.t && s1 < paperEnd - 1 && !off.has('roll')) {
          const hd = P.at(s1);
          items.push({ z: view.depth(hd.P) - 2, draw: g => drawRoll(g, view, hd, s1, t) });
        }
      }, 'road');

      function corner(p, side, half, lift) {
        const W = [-Math.sin(p.w), 0, Math.cos(p.w)];
        return [p.x + W[0] * half * side, p.y + lift, p.z + W[2] * half * side];
      }
      function drawStrip(g, view, chunk, core) {
        g.save(); g.setTransform(S, 0, 0, S, 0, 0); g.lineJoin = 'round'; g.lineCap = 'round';
        // project every point once: edges (a, b), band edges (c, d), centre line (m)
        const pr = chunk.map((p, i) => {
          const ink = (chunk[Math.min(i + 1, chunk.length - 1)].style === 'ink' && i < chunk.length - 1) || (i === chunk.length - 1 && p.style === 'ink');
          const half = ink ? inkW / 2 : width / 2, lift = ink ? 0.6 : 0.8, h2 = half * band;
          return { a: view.proj(corner(p, -1, half, lift)), b: view.proj(corner(p, 1, half, lift)), c: view.proj(corner(p, -1, h2, lift + 0.2)),
            d: view.proj(corner(p, 1, h2, lift + 0.2)), m: view.proj([p.x, p.y + lift + 0.4, p.z]) };
        });
        const segs = [];
        for (let i = 0; i < chunk.length - 1; i++) {
          const p0 = chunk[i], p1 = chunk[i + 1], q0 = pr[i], q1 = pr[i + 1];
          if (!q0.a || !q0.b || !q1.a || !q1.b) { segs.push(null); continue; }
          const T = V.norm([p1.x - p0.x, p1.y - p0.y, p1.z - p0.z]), Wv = [-Math.sin(p1.w), 0, Math.cos(p1.w)];
          const N = V.norm(V.cross(Wv, T));
          // which side faces us: the screen winding of the quad (screen y is down)
          const cr = (q1.a.x - q0.a.x) * (q0.b.y - q0.a.y) - (q1.a.y - q0.a.y) * (q0.b.x - q0.a.x);
          const top = cr < 0, lam = clamp(V.dot(top ? N : V.mul(N, -1), L_) * 0.5 + 0.5);
          segs.push({ i, ink: p1.style === 'ink', top, lam, s: (p0.s + p1.s) / 2 });
        }
        const quad = (c0, c1, d1, d0) => { g.beginPath(); g.moveTo(c0.x, c0.y); g.lineTo(c1.x, c1.y); g.lineTo(d1.x, d1.y); g.lineTo(d0.x, d0.y); g.closePath(); };
        // pass 1: the paper (or ink) surface, and the printed road band on the paper's top side
        for (const sg of segs) {
          if (!sg || sg.i < core[0] || sg.i >= core[1]) continue; const q0 = pr[sg.i], q1 = pr[sg.i + 1];
          const col = sg.ink ? pal.road : sg.top ? mix(shade(pal.paper, -0.16), pal.paper, sg.lam) : mix(shade(pal.paperBack, -0.18), pal.paperBack, sg.lam);
          quad(q0.a, q1.a, q1.b, q0.b); g.fillStyle = col; g.fill(); g.strokeStyle = col; g.lineWidth = 1; g.stroke();
          if (!sg.ink && sg.top && !off.has('band') && q0.c && q0.d && q1.c && q1.d) {
            const bc = mix(pal.road, shade(pal.road, 0.12), sg.lam);
            quad(q0.c, q1.c, q1.d, q0.d); g.fillStyle = bc; g.fill(); g.strokeStyle = bc; g.lineWidth = 0.9; g.stroke();
          }
        }
        // pass 2: ink edges of the paper strip, as continuous lines
        g.strokeStyle = pal.ink; g.globalAlpha = 0.85;
        for (const side of ['a', 'b']) {
          let open = false; g.beginPath();
          for (const sg of segs) {
            if (!sg || sg.ink) { open = false; continue; }
            const q0 = pr[sg.i][side], q1 = pr[sg.i + 1][side];
            if (!open) { g.moveTo(q0.x, q0.y); open = true; }
            g.lineTo(q1.x, q1.y);
          }
          const k0 = pr[0].a ? pr[0].a.k : 1; g.lineWidth = Math.max(0.8, 1.6 * k0 * (o.edge ?? 1)); g.stroke();
        }
        g.globalAlpha = 1;
        // pass 3: centre dashes on the visible top side, each dash one stroke
        const per = dashL[0] + dashL[1]; g.strokeStyle = pal.dash; g.lineCap = 'butt';
        let open = false, k0 = 1, inkDash = false; g.beginPath();
        const flush = () => { if (open) { g.lineWidth = Math.max(0.8, (inkDash ? 3.6 : 3.2) * k0); g.stroke(); g.beginPath(); open = false; } };
        for (const sg of segs) {
          const on = sg && sg.top && pr[sg.i].m && pr[sg.i + 1].m && (((sg.s % per) + per) % per < dashL[0]);
          if (!on) { flush(); continue; }
          const m0 = pr[sg.i].m, m1 = pr[sg.i + 1].m;
          if (!open) { g.moveTo(m0.x, m0.y); open = true; k0 = m0.k; inkDash = sg.ink; }
          g.lineTo(m1.x, m1.y);
        }
        flush();
        g.restore();
      }
      function drawRoll(g, view, hd, s1, t) {
        const r0 = o.roll.r || 46, rMin = 10, start = o.roll.from ?? from;
        let r = rMin + (r0 - rMin) * Math.sqrt(clamp((paperEnd - s1) / Math.max(1, paperEnd - start)));
        let drop = 0; if (o.roll.drop !== false) { const u = (t - o.roll.t) / 0.5; drop = (1 - backOut(clamp(u))) * 320; if (u < 0) return; }
        const C = V.add(V.add(hd.P, V.mul(hd.N, r + 0.8)), [0, drop, 0]);
        const half = width / 2 + 2, ring = side => { const out = []; for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2;
          out.push(view.proj(V.add(V.add(C, V.mul(hd.W, half * side)), V.add(V.mul(hd.T, Math.cos(a) * r), V.mul(hd.N, Math.sin(a) * r))))); } return out; };
        const A = ring(-1), B = ring(1); if (A.some(p => !p) || B.some(p => !p)) return;
        const hull = convexHull(A.concat(B));
        g.save(); g.setTransform(S, 0, 0, S, 0, 0); g.lineJoin = 'round';
        g.beginPath(); hull.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath();
        const gy = g.createLinearGradient(0, Math.min(...hull.map(p => p.y)), 0, Math.max(...hull.map(p => p.y)));
        gy.addColorStop(0, shade(pal.paper, 0.25)); gy.addColorStop(1, shade(pal.paper, -0.18));
        g.fillStyle = gy; g.fill(); g.strokeStyle = pal.ink; g.lineWidth = Math.max(1, 1.8 * A[0].k); g.stroke();
        // the near end shows the spiral of rolled paper, turning as it unrolls
        const near = view.depth(V.add(C, V.mul(hd.W, -half))) < view.depth(V.add(C, V.mul(hd.W, half))) ? -1 : 1;
        const E = near < 0 ? A : B, cx = E.reduce((s, p) => s + p.x, 0) / E.length, cy = E.reduce((s, p) => s + p.y, 0) / E.length;
        g.beginPath(); E.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.fillStyle = shade(pal.paperBack, -0.04); g.fill(); g.stroke();
        g.lineWidth = Math.max(0.6, 0.9 * A[0].k); g.globalAlpha = 0.7;
        const turn = -s1 / Math.max(r, 1);
        for (let j = 1; j <= 3; j++) {
          const f = j / 4; g.beginPath();
          E.forEach((p, i) => { const x = cx + (p.x - cx) * f, y = cy + (p.y - cy) * f; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke();
        }
        const tick = E[Math.floor(((turn / (Math.PI * 2)) % 1 + 1) % 1 * E.length) % E.length];
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(tick.x, tick.y); g.stroke();
        g.restore();
      }
      return R;
    };

    // ----- the pen: a fountain pen whose nib is at a world point (normally the head of an ink road) ------
    // pen({at: t => [x,y,z], in: t0, out: t1, size, lift: t => 0..1, lean (deg from vertical), paint(g, t, o)})
    R.pen = o => {
      R.add((t, view, items) => {
        if (off.has('pen')) return;
        if (t < o.in || (o.out != null && t > o.out + 0.8)) return;
        const P = val(o.at, t); const nib = view.proj(P); if (!nib) return;
        const enter = 1 - EASE.out(clamp((t - o.in) / 0.7)), leave = o.out != null ? EASE.in(clamp((t - o.out) / 0.7)) : 0;
        const lift = (o.lift ? o.lift(t) : 0) + enter + leave;
        const k = nib.k * (o.size || 1), b = R.boil(4242, 0.6);
        items.push({ z: nib.z - 300, name: 'pen', draw: g => {
          g.save();
          // the pen leans `lean` degrees from vertical toward the right; lifting moves it back up its own axis
          const lean = (o.lean ?? 30) * D2R, ax = Math.sin(lean), ay = -Math.cos(lean), liftPx = lift * 520 * k;
          const tipX = nib.x + ax * liftPx + b[0] * k, tipY = nib.y + ay * liftPx + b[1] * k;
          // shadow on the paper: falls to the right of the nib, lifts away as the pen lifts
          if (!off.has('shadow')) {
            const bx = nib.x + 8 * k + lift * 160 * k, by = nib.y + 2 * k, ca = Math.cos(-0.22), sa = Math.sin(-0.22);
            const M = [S * k * ca, S * k * sa, -S * k * sa, S * k * ca, S * bx, S * by];
            soft(g, M, [0, -50, 300, 50], 8 * k * S + lift * 20 * S, x => {
              x.fillStyle = '#3a2a18'; x.beginPath(); x.moveTo(0, -3); x.lineTo(280, -20); x.quadraticCurveTo(300, 0, 280, 16); x.lineTo(0, 4); x.closePath(); x.fill();
            }, 0.2 * (1 - clamp(lift)) + 0.04);
          }
          g.setTransform(S * k, 0, 0, S * k, S * tipX, S * tipY);
          g.rotate(lean);                // local −y runs from the nib up the barrel
          (o.paint || paintPen)(g, t, o);
          g.restore();
        } });
      }, 'pen');
      return R;
    };
    function paintPen(g, t, o) {
      // local: nib tip at (0,0), pen runs toward −y. Units ≈ world units at the nib.
      const ink = pal.ink, gold = o.gold || '#d8a94a', goldD = '#9b6e22', barrel = o.barrel || '#16151a';
      g.lineJoin = 'round'; g.lineWidth = 2.2; g.strokeStyle = ink;
      // barrel (long, runs off frame)
      const bw = 34;
      let gr = g.createLinearGradient(-bw, 0, bw, 0); gr.addColorStop(0, '#3a3842'); gr.addColorStop(0.35, '#55525e'); gr.addColorStop(0.5, barrel); gr.addColorStop(1, '#050507');
      g.fillStyle = gr; g.beginPath(); g.moveTo(-26, -150); g.lineTo(-bw, -1400); g.lineTo(bw, -1400); g.lineTo(26, -150); g.closePath(); g.fill(); g.stroke();
      // gold ring
      gr = g.createLinearGradient(-30, 0, 30, 0); gr.addColorStop(0, goldD); gr.addColorStop(0.35, '#f5d98c'); gr.addColorStop(1, goldD);
      g.fillStyle = gr; g.beginPath(); g.rect(-29, -168, 58, 18); g.fill(); g.stroke();
      // grip section
      gr = g.createLinearGradient(-24, 0, 24, 0); gr.addColorStop(0, '#2b2a30'); gr.addColorStop(0.4, '#4b4955'); gr.addColorStop(1, '#0b0b0d');
      g.fillStyle = gr; g.beginPath(); g.moveTo(-26, -150); g.lineTo(-20, -78); g.lineTo(20, -78); g.lineTo(26, -150); g.closePath(); g.fill(); g.stroke();
      // nib
      gr = g.createLinearGradient(-20, 0, 20, 0); gr.addColorStop(0, goldD); gr.addColorStop(0.3, '#f7e2a0'); gr.addColorStop(0.55, gold); gr.addColorStop(1, goldD);
      g.fillStyle = gr; g.beginPath(); g.moveTo(-20, -80); g.bezierCurveTo(-20, -40, -6, -14, 0, 0); g.bezierCurveTo(6, -14, 20, -40, 20, -80); g.closePath(); g.fill(); g.stroke();
      g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, -2); g.lineTo(0, -46); g.stroke();
      g.fillStyle = ink; g.beginPath(); g.arc(0, -50, 4, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 0.5; g.strokeStyle = goldD; g.lineWidth = 1; g.beginPath(); g.moveTo(-11, -70); g.quadraticCurveTo(-3, -62, 0, -58); g.quadraticCurveTo(3, -62, 11, -70); g.stroke(); g.globalAlpha = 1;
    }

    // ----- confetti: paper bits thrown from a point, falling and fluttering ---------------------------------
    // confetti({at: [x,y,z], t, n, speed, colors, life})
    R.confetti = o => {
      const r = rng(o.seed || 31), n = o.n || 70, colors = o.colors || [pal.paper, '#f6a34a', '#ffffff', '#e9d9bb'];
      const bits = Array.from({ length: n }, () => {
        const a = r.range(-0.9, 0.9) + (o.dir || 0), sp = (o.speed || 520) * r.range(0.45, 1.1);
        return { v: [Math.sin(a) * sp, Math.cos(a) * sp * r.range(0.8, 1.2), r.range(-1, 1) * sp * 0.6], c: r.pick(colors), s: r.range(11, 19), spin: r.range(4, 11), ph: r() * 6.28, sway: r.range(20, 60) };
      });
      R.add((t, view, items) => {
        if (off.has('confetti')) return;
        const tau = t - o.t; if (tau < 0 || tau > (o.life || 4)) return;
        const C = o.at;
        items.push({ z: view.depth(C) - 30, draw: g => {
          g.save(); g.setTransform(S, 0, 0, S, 0, 0);
          for (const b of bits) {
            const drag = (1 - Math.exp(-2.2 * tau)) / 2.2, fall = 90 * tau * tau * 0.5 + 0;
            const P = [C[0] + b.v[0] * drag + Math.sin(tau * 2 + b.ph) * b.sway, C[1] + b.v[1] * drag - fall - 60 * tau, C[2] + b.v[2] * drag];
            if (P[1] < 0) continue;
            const p = view.proj(P); if (!p) continue;
            const fl = Math.cos(tau * b.spin + b.ph), w = b.s * p.k, h = b.s * 0.7 * p.k * Math.abs(fl) + 0.6;
            g.translate(p.x, p.y); g.rotate(b.ph + tau * b.spin * 0.3);
            g.fillStyle = fl > 0 ? b.c : shade(b.c, -0.15); g.globalAlpha = clamp(((o.life || 4) - tau) * 2);
            g.fillRect(-w / 2, -h / 2, w, h); g.setTransform(S, 0, 0, S, 0, 0);
          }
          g.restore();
        } });
      }, 'confetti');
      return R;
    };

    // ----- backdrop: the teal paper wall and the cream paper floor ---------------------------------------
    function backdrop(g, view) {
      const C = R.camPos;
      g.setTransform(S, 0, 0, S, 0, 0);
      let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, pal.wallTop); gr.addColorStop(0.75, pal.wall); gr.addColorStop(1, pal.wall);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      gr = g.createRadialGradient(W * 0.38, H * 0.3, 10, W * 0.38, H * 0.3, W * 0.65);
      gr.addColorStop(0, pal.wallGlow + 'aa'); gr.addColorStop(1, pal.wallGlow + '00');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // floor: from the wall to just in front of the camera
      const cx = C.target[0], z1 = R.wallZ, z0 = view.eye[2] + 30;
      const floor = view.poly([[cx - 60000, 0, z0], [cx + 60000, 0, z0], [cx + 60000, 0, z1], [cx - 60000, 0, z1]]);
      if (floor.length > 2) {
        const top = Math.min(...floor.map(p => p.y));
        g.beginPath(); floor.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath();
        gr = g.createLinearGradient(0, top, 0, Math.max(top + 1, H)); gr.addColorStop(0, pal.floorFar); gr.addColorStop(1, shade(pal.floor, -0.05));
        g.fillStyle = gr; g.fill();
        // the sweep: a soft shadow where the floor meets the wall
        const l0 = view.proj([cx - 60000, 0, z1]), l1 = view.proj([cx + 60000, 0, z1]);
        if (l0 && l1) { g.save(); g.strokeStyle = 'rgba(30,60,60,0.09)'; for (const lw of [26, 14, 6]) { g.lineWidth = lw * S; g.beginPath(); g.moveTo(l0.x, l0.y + 3 * S); g.lineTo(l1.x, l1.y + 3 * S); g.stroke(); } g.restore(); }
      }
      if (!off.has('texture')) {
        g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = pattern;
        const o0 = view.proj([0, 0, z1]); const sx = o0 ? -o0.x * 0.25 : 0;
        g.translate(sx % 384, 0); g.fillRect(-384, 0, W + 768, H); g.restore();
      }
    }
    function post(g, t) {
      g.setTransform(S, 0, 0, S, 0, 0);
      if (!off.has('vignette')) {
        const gr = g.createRadialGradient(W / 2, H * 0.48, H * 0.35, W / 2, H * 0.5, W * 0.72);
        gr.addColorStop(0, 'rgba(20,14,8,0)'); gr.addColorStop(1, 'rgba(20,14,8,0.42)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      }
      if (!off.has('flicker')) {                      // stop-motion exposure flicker, per pose
        const f = (hash(77, R.pose) - 0.5) * 0.045;
        g.fillStyle = f > 0 ? `rgba(255,248,235,${f})` : `rgba(0,0,0,${-f})`; g.fillRect(0, 0, W, H);
      }
      if (!off.has('grain')) {
        g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.07;
        const ox = Math.floor(hash(5, R.pose) * 256), oy = Math.floor(hash(6, R.pose) * 256);
        g.translate(-ox, -oy); g.fillStyle = g.createPattern(noiseTex, 'repeat'); g.fillRect(0, 0, W + 256, H + 256); g.restore();
      }
    }

    R.draw = t => {
      R.t = t; R.T = R.held(t); R.pose = R.poseOf(t);
      const T = R.T;
      R.camPos = R.cameraAt(T);
      const view = R.view = makeView(R.camPos, W, H);
      const g = ctx; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
      backdrop(g, view);
      const items = [];
      for (const l of R.layers) l.fn(T, view, items);
      items.sort((a, b) => b.z - a.z);
      for (const it of items) { g.save(); it.draw(g); g.restore(); }
      post(g, t);
      g.restore();
    };

    // ----- checks: rules the scene states about itself, run by scripts/check.mjs over the whole timeline
    // R.check('car stays behind the road head', t => carS(t) + 100 <= reveal(t))
    R.checks = [];
    R.check = (name, fn) => { R.checks.push({ name, fn }); return R; };

    // ----- page contract: seek(t), DURATION, FPS, STEPS, SIZE, frameKey(t), __ready; live loop unless ?render=1
    R.start = (mount = document.body) => {
      const frozen = q.has('t') ? +q.get('t') : null;
      root.DURATION = DURATION; root.FPS = FPS; root.STEPS = steps; root.SIZE = { W, H };
      root.seek = t => R.draw(t);
      root.frameKey = t => R.poseOf(t);           // frames with the same key are identical (held poses)
      root.runChecks = (step = 1 / 24) => R.checks.map(c => {
        const bad = []; for (let t = 0; t <= DURATION + 1e-9; t += step) { let ok; try { ok = c.fn(t); } catch (e) { ok = false; } if (!ok) bad.push(+t.toFixed(3)); }
        return { name: c.name, bad: bad.length, first: bad.slice(0, 6) };
      });
      if (!canvas.parentNode) mount.appendChild(canvas);
      const fit = () => {
        if (render) { S = 1; canvas.width = W; canvas.height = H; canvas.style.cssText = `width:${W}px;height:${H}px`; return; }
        const vw = root.innerWidth, vh = root.innerHeight, k = Math.min(vw / W, vh / H), dpr = Math.min(2, root.devicePixelRatio || 1);
        const cw = Math.floor(W * k), ch = Math.floor(H * k);
        S = Math.min(1, (cw * dpr) / W); canvas.width = Math.round(W * S); canvas.height = Math.round(H * S);
        canvas.style.cssText = `position:absolute;left:50%;top:50%;width:${cw}px;height:${ch}px;transform:translate(-50%,-50%)`;
      };
      fit();
      R.draw(frozen ?? 0);
      root.__ready = true;
      if (render) return R;
      root.addEventListener('resize', () => { fit(); R.draw(last >= 0 ? last / FPS : frozen ?? 0); });
      if (frozen !== null) return R;
      let paused = false, t0 = performance.now(), tp = 0, last = -1;
      const toggle = () => { paused = !paused; if (!paused) t0 = performance.now() - tp * 1000; };
      root.addEventListener('click', toggle);
      root.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); toggle(); } });
      const tick = now => {
        if (!paused) {
          tp = ((now - t0) / 1000) % DURATION;
          const f = Math.floor(tp * FPS), key = R.poseOf(f / FPS);
          if (key !== last) { last = key; R.draw(f / FPS); }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      return R;
    };
    return R;
  }

  function convexHull(ps) {
    const p = ps.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    const cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop(); return lo.concat(up);
  }

  root.PR = { create, path, track, runMax, rng, hash, clamp, lerp, smooth, backOut, EASE, V, mix, shade, rgb };
})(typeof window !== 'undefined' ? window : globalThis);

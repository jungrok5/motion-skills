/* rig.js — Live2D-style parts for keyed character art (needs cutout.js for Cutout.tri).
   A rig (made by tools/layers.py + tools/rigassets.py) is an UNDERLAY (the drawing with the loose parts removed and
   what was behind them painted in) plus PARTS (ponytail, locks…), each with a SPINE (root → tip, in image px).
   - Each part is skinned to its spine (linear-blend skinning over the spine's bones): the hair bends along its bones
     and keeps its width — it does not stretch like rubber. The underlay (face, body, clothes) stays rigid.
   - Each bone is an angular spring: stiff at the root, soft at the tip, damped; wind and gravity are torques. The chain
     is simulated from the shot's start to t at a fixed step, so seek(t) is deterministic in any order.
   Usage:
     const R = await Rig.load('art/rig/', 'back', { parts: [{ k: 60, gain: 1 }] });
     const th = Rig.sim(R.parts[0], t, tt => [fx(tt), fy(tt)], t0);   // force in px/s² (image px), t0 = shot start
     Rig.draw(ctx, R.parts[0], th, X, Y, s);                           // X, Y = screen pos of image (0,0); s = scale */
const Rig = (() => {
  const loadJSON = src => new Promise((ok, no) => { const x = new XMLHttpRequest(); x.open('GET', src);
    x.onload = () => { try { ok(JSON.parse(x.responseText)); } catch (e) { no(e); } }; x.onerror = no; x.send(); });
  const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  async function load(dir, name, opt = {}) {
    const J = await loadJSON(dir + name + '-rig.json');
    const R = { size: J.size, under: await loadImg(dir + J.under), expr: {}, parts: [] };
    for (const [k, f] of Object.entries(J.expr || {})) R.expr[k] = await loadImg(dir + f);
    for (let i = 0; i < J.parts.length; i++) R.parts.push(bind(await loadImg(dir + J.parts[i].file), J.parts[i], (opt.parts || [])[i] || {}));
    if (J.face) { R.face = { base: await loadImg(dir + J.face.base), front: await loadImg(dir + J.face.front), expr: {}, bbox: J.face.bbox };
      for (const [k, f] of Object.entries(J.face.expr || {})) R.face.expr[k] = await loadImg(dir + f); }
    return R;
  }
  function bind(img, p, o) {
    const S = p.spine, n = S.length - 1, L = [], th0 = [];
    for (let j = 0; j < n; j++) { const dx = S[j + 1][0] - S[j][0], dy = S[j + 1][1] - S[j][1]; L.push(Math.hypot(dx, dy)); th0.push(Math.atan2(dy, dx)); }
    const Ltot = L.reduce((a, b) => a + b, 0), step = o.step || 24;
    const [x0, y0, x1, y1] = p.bbox, nx = Math.max(2, Math.ceil((x1 - x0) / step)), ny = Math.max(2, Math.ceil((y1 - y0) / step)), verts = [];
    for (let jy = 0; jy <= ny; jy++) for (let jx = 0; jx <= nx; jx++) {
      const vx = x0 + (x1 - x0) * jx / nx, vy = y0 + (y1 - y0) * jy / ny;
      let best = 1e18, sb = 0;   // spine coordinate (in bones) of the nearest spine point
      for (let j = 0; j < n; j++) { const ax = S[j][0], ay = S[j][1], dx = S[j + 1][0] - ax, dy = S[j + 1][1] - ay;
        const t = ((vx - ax) * dx + (vy - ay) * dy) / (dx * dx + dy * dy), tc = Math.max(j === 0 ? -1 : 0, Math.min(j === n - 1 ? 2 : 1, t));
        const d = (vx - ax - dx * tc) ** 2 + (vy - ay - dy * tc) ** 2; if (d < best) { best = d; sb = j + tc; } }
      const c = Math.min(Math.max(sb, 0), n), w = []; let ws = 0;
      for (let k = 0; k < n; k++) { const dd = c - (k + .5), wk = Math.exp(-dd * dd / (2 * .5 * .5)); w.push(wk); ws += wk; }
      for (let k = 0; k < n; k++) w[k] /= ws;
      verts.push({ x: vx, y: vy, w, lock: Math.max(0, 1 - Math.max(sb, 0) / (o.rootLock ?? .5)) ** 2 });
    }
    const tris = []; for (let jy = 0; jy < ny; jy++) for (let jx = 0; jx < nx; jx++) { const a = jy * (nx + 1) + jx, b = a + 1, c = a + nx + 1, d = c + 1; tris.push([a, b, c], [b, d, c]); }
    const kk = []; for (let j = 0; j < n; j++) { const u = j / Math.max(1, n - 1); kk.push((o.k ?? 40) * (1 + (o.rootStiff ?? 4) * (1 - u) ** 2)); }
    return { img, S, n, L, Ltot, th0, verts, tris, k: kk, o, st: null };
  }
  // angular-spring chain; force(t) → [fx, fy] in px/s² (image px). Gravity is relative to the drawn (rest) pose.
  function sim(P, t, force, t0 = 0) {
    if (api.rest) return P.th0.slice();   // review: the drawn pose
    const n = P.n, o = P.o, G = o.gravity ?? 600, damp = o.damp ?? 5, gain = o.gain ?? 1, dt = 1 / 240;
    let st = P.st;
    if (!st || st.t0 !== t0 || st.t > t + 1e-9) st = P.st = { t0, t: t0, d: new Float64Array(n), v: new Float64Array(n) };
    P.stats = P.stats || { maxTip: 0, maxVel: 0, maxBend: 0 };
    const th = new Float64Array(n);
    while (st.t < t - 1e-9) {
      const h = Math.min(dt, t - st.t), F = force(st.t);
      let acc = 0; for (let j = 0; j < n; j++) { acc += st.d[j]; th[j] = P.th0[j] + acc; }
      for (let j = 0; j < n; j++) {
        let tau = 0;   // load of the bones beyond joint j: cross(dir, F + g) − cross(dir_rest, g)
        for (let m = j; m < n; m++) tau += (Math.cos(th[m]) * (F[1] + G) - Math.sin(th[m]) * F[0] - Math.cos(P.th0[m]) * G) * P.L[m];
        st.v[j] += (-P.k[j] * st.d[j] - damp * st.v[j] + gain * tau / (P.Ltot * P.Ltot) * 2) * h;
      }
      for (let j = 0; j < n; j++) st.d[j] += st.v[j] * h;
      st.t += h;
      let tip = 0; for (let j = 0; j < n; j++) { tip += st.d[j]; P.stats.maxVel = Math.max(P.stats.maxVel, Math.abs(st.v[j])); P.stats.maxBend = Math.max(P.stats.maxBend, Math.abs(st.d[j])); }
      P.stats.maxTip = Math.max(P.stats.maxTip, Math.abs(tip));
    }
    const out = []; let acc = 0; for (let j = 0; j < n; j++) { acc += st.d[j]; out.push(P.th0[j] + acc); } return out;
  }
  function draw(ctx, P, th, X, Y, s) {
    const n = P.n, Q = [[P.S[0][0], P.S[0][1]]], R = [];
    for (let j = 0; j < n; j++) Q.push([Q[j][0] + P.L[j] * Math.cos(th[j]), Q[j][1] + P.L[j] * Math.sin(th[j])]);
    for (let k = 0; k < n; k++) { const a = th[k] - P.th0[k]; R.push([Math.cos(a), Math.sin(a)]); }
    const D = P.verts.map(v => { let x = 0, y = 0;
      for (let k = 0; k < n; k++) { const w = v.w[k]; if (w < 1e-4) continue; const rx = v.x - P.S[k][0], ry = v.y - P.S[k][1];
        x += w * (Q[k][0] + R[k][0] * rx - R[k][1] * ry); y += w * (Q[k][1] + R[k][1] * rx + R[k][0] * ry); }
      x = x * (1 - v.lock) + v.x * v.lock; y = y * (1 - v.lock) + v.y * v.lock; return [X + x * s, Y + y * s]; });
    for (const [a, b, c] of P.tris) { const A = P.verts[a], B = P.verts[b], C = P.verts[c]; Cutout.tri(ctx, P.img, [A.x, A.y], [B.x, B.y], [C.x, C.y], D[a], D[b], D[c]); }
  }
  // a single pendulum spring (skirt): pivot, length (image px), rest angle, stiffness → a part-like object for sim()
  const pendulum = (len, k = 60, o = {}) => ({ n: 1, th0: [Math.PI / 2], L: [len], Ltot: len, k: [k], o });
  const api = { load, sim, draw, pendulum, rest: /[?&]rest=1/.test(location.search) }; return api;
})();

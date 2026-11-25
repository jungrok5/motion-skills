// principle-pass · principles.js — the twelve animation principles as code, and a meter that measures them.
// Pure ES module: no DOM, no state between calls, no Math.random. Any skill may copy this file into its own lib/
// (keep this header) — the shared notes are references/ANIMATION-PRINCIPLES.md at the repo root.
//
//   timing & spacing ..... E (easing), keys(), timeFor()
//   slow in / slow out ... E.inOut / E.out / E.in — never E.linear on a body
//   anticipation ......... anticipate(), dynamics({ r: <0 })
//   follow-through ....... dynamics() (overshoot + settle), lag(), chain()
//   overlapping action ... lag(), chain() (successive breaking of joints)
//   squash & stretch ..... squash(), stretchFromVelocity() (area kept)
//   arcs ................. arc(), catmull(), swing()
//   secondary action ..... breath(), noise(), blinks(), flick()
//   exaggeration ......... exaggerate()
//   staging / solid drawing / appeal — judged on stills (see the rubric); the meter reports what it can measure
//   the meter ............ audit(track), compare(before, after), PRINCIPLES

export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = u => (u = clamp(u), u * u * (3 - 2 * u));
const TAU = Math.PI * 2;

// ---------- timing & spacing: easing ----------
const back = (s = 1.6) => u => { u = clamp(u) - 1; return 1 + u * u * ((s + 1) * u + s); };
export const E = {
  linear: u => clamp(u),
  in: u => (u = clamp(u), u * u),
  out: u => (u = clamp(u), 1 - (1 - u) * (1 - u)),
  inOut: u => (u = clamp(u), u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  in3: u => (u = clamp(u), u * u * u),
  out3: u => (u = clamp(u), 1 - Math.pow(1 - u, 3)),
  sine: u => (u = clamp(u), .5 - .5 * Math.cos(Math.PI * u)),
  snap: u => (u = clamp(u), 1 - Math.pow(1 - u, 5)),          // fast out of the gate, long cushion: a flinch, a strike
  back: back(1.4),                                              // passes the key and comes back: a settle
  backBig: back(2.4),
  inBack: u => (u = clamp(u), u * u * (2.4 * u - 1.4)),         // pulls back first: anticipation inside one move
  hold: u => (u >= 1 ? 1 : 0),
};
export const easeOf = e => typeof e === 'function' ? e : (E[e] || E.inOut);

// ---------- keys: a channel set keyed in time ----------
// list: [{ t, e?, ...channels }] — `e` is the easing used to ARRIVE at that key (default inOut).
// A key may set only some channels; each channel interpolates between the keys that set it.
// Values may be numbers or arrays of numbers. Returns (t) => { channel: value }.
export function keys(list, { ease = null } = {}) {
  const ks = [...list].sort((a, b) => a.t - b.t), chans = {};
  for (const k of ks) for (const c in k) if (c !== 't' && c !== 'e' && c !== 'tag') (chans[c] ||= []).push(k);
  const f = t => {
    const o = {};
    for (const c in chans) {
      const L = chans[c];
      if (t <= L[0].t) { o[c] = L[0][c]; continue; }
      if (t >= L[L.length - 1].t) { o[c] = L[L.length - 1][c]; continue; }
      let i = 1; while (L[i].t < t) i++;
      const a = L[i - 1], b = L[i], u = easeOf(ease || b.e)((t - a.t) / (b.t - a.t));
      o[c] = Array.isArray(a[c]) ? a[c].map((v, j) => lerp(v, b[c][j], u)) : lerp(a[c], b[c], u);
    }
    return o;
  };
  f.keys = ks; f.channels = Object.keys(chans);
  return f;
}

// Weight sets timing: a body `size` times the reference takes ~sqrt(size) as long (pendulum scaling).
export const timeFor = (seconds, size = 1) => seconds * Math.sqrt(size);

// ---------- anticipation / exaggeration ----------
// The pose before a move from a to b: the other way, by `amount` of the move.
export const anticipate = (a, b, amount = .2) => Array.isArray(a) ? a.map((v, i) => v - (b[i] - v) * amount) : a - (b - a) * amount;
export const overshoot = (a, b, amount = .12) => Array.isArray(a) ? b.map((v, i) => v + (v - a[i]) * amount) : b + (b - a) * amount;
export const exaggerate = (v, base, k = 1.25) => base + (v - base) * k;

// ---------- follow-through & overlap: second-order dynamics ----------
// y follows x(t) like a spring: f = natural frequency (Hz, how quick), z = damping (<1 overshoots and settles),
// r = initial response (r < 0 pulls the other way first = built-in anticipation; r > 1 leads).
// Precomputed once on a fixed step from t0 so seek(t) is stateless and every frame is the same on every run.
export function dynamics(x, { f = 2, z = .5, r = 0, t0 = 0, t1 = 20, dt = 1 / 240 } = {}) {
  const k1 = z / (Math.PI * f), k2 = 1 / ((TAU * f) ** 2), k3 = r * z / (TAU * f);
  const n = Math.ceil((t1 - t0) / dt) + 2, ys = new Float64Array(n);
  let xp = x(t0), y = xp, yd = 0;
  for (let i = 0; i < n; i++) {
    const t = t0 + i * dt, xv = x(t), xd = (xv - xp) / dt; xp = xv;
    const k2s = Math.max(k2, dt * dt / 2 + dt * k1 / 2, dt * k1);
    if (i) { y += dt * yd; yd += dt * (xv + k3 * xd - y - k1 * yd) / k2s; }
    ys[i] = y;
  }
  return t => { const p = clamp((t - t0) / dt, 0, n - 1.001), i = Math.floor(p); return lerp(ys[i], ys[i + 1], p - i); };
}
// The same input, `dt` seconds late (overlap: the part starts after the part that drives it).
export const lag = (x, dt) => t => x(t - dt);
// A chain (tail, ear, antenna, scarf): segment i follows the root signal i·delay late through its own spring,
// so the tip moves last and settles last. Returns [f0, f1, …].
export function chain(x, n, { delay = .035, f = 2.2, z = .45, falloff = .85, t0 = 0, t1 = 20 } = {}) {
  return Array.from({ length: n }, (_, i) => dynamics(lag(x, delay * i), { f: f * Math.pow(falloff, i), z, t0, t1 }));
}

// ---------- squash & stretch (area kept) ----------
// s > 1 stretches along the axis, s < 1 squashes; the cross axis is 1/s so the area (the "volume") never changes.
export const squash = s => [1 / s, s];
// From a velocity: stretch along the motion, k per (body lengths / s), capped.
export function stretchFromVelocity(vx, vy, { k = .035, max = 1.25, bodyLen = 1 } = {}) {
  const sp = Math.hypot(vx, vy) / bodyLen;
  return { s: Math.min(max, 1 + k * sp), angle: Math.atan2(vy, vx) };
}

// ---------- arcs ----------
// A point from p0 to p1 on a curve lifted by `lift` (fraction of the distance, + = to the left of travel / up).
export function arc(p0, p1, lift = .25, u = 0) {
  const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2, dx = p1[0] - p0[0], dy = p1[1] - p0[1];
  const cx = mx - dy * lift * 2, cy = my + dx * lift * 2, w = 1 - u;
  return [w * w * p0[0] + 2 * w * u * cx + u * u * p1[0], w * w * p0[1] + 2 * w * u * cy + u * u * p1[1]];
}
// A smooth path through points (Catmull–Rom), u in 0..1 over the whole path.
export function catmull(pts, u) {
  const n = pts.length - 1, f = clamp(u) * n, i = Math.min(n - 1, Math.floor(f)), t = f - i;
  const P = k => pts[Math.max(0, Math.min(n, k))];
  const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)], t2 = t * t, t3 = t2 * t;
  return p1.map((_, j) => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3));
}
// A foot's swing: leaves p0, lands on p1, lifted `h` at the middle, eased so it leaves and lands slowly.
export function swing(p0, p1, h, u) {
  const e = E.inOut(u);
  const l = Math.sin(Math.PI * clamp(u)); return [lerp(p0[0], p1[0], e), lerp(p0[1], p1[1], e) + h * l * l];
}

// ---------- secondary action ----------
export const breath = (t, { period = 2.6, amp = 1, phase = 0 } = {}) => amp * (.5 - .5 * Math.cos(TAU * (t / period + phase)));
// Smooth 1-D value noise in [-1, 1], seeded.
export function noise(t, seed = 1) {
  const h = i => { let x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };
  const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u);
}
// Irregular blinks: returns lid closure 0..1 at t. mean = average seconds between blinks; some blinks are double.
export function blinks(t, { seed = 3, mean = 3.2, dur = .16 } = {}) {
  let at = .7 + (noise(.5, seed) * .5 + .5) * mean * .6, k = 0;
  while (at < t + 1) {
    const d = t - at;
    if (d > -dur / 2 && d < dur / 2) return 1 - Math.abs(d) / (dur / 2);
    const r = noise(k * 1.7 + .3, seed + 7) * .5 + .5;
    at += r < .18 ? dur * 1.6 : mean * (.55 + r * .9); k++;
    if (k > 999) break;
  }
  return 0;
}
// A quick flick (ear, whisker, tail tip) at time tf: out fast, back slow. Returns 0..1..0.
export const flick = (t, tf, { up = .06, down = .28 } = {}) => t < tf ? 0 : t < tf + up ? E.out((t - tf) / up) : t < tf + up + down ? 1 - E.inOut((t - tf - up) / down) : 0;

// ---------- the meter ----------
// A track: { fps, scale (body length, px), points: { name: [[x,y], …] }, squash?: [[sx, sy], …],
//   beats: [{ name, t0, t1, point, big?, parts?: [names] }], chains: [[driver, follower, anchor?], …] (anchor: a point that turns with the driver),
//   planted: [{ point, t0, t1 }], rest: [{ t0, t1, alive?: [names] }], impacts: [t, …], root?: name }
// Points are in screen px (y down or up — only distances and directions are used).
export const PRINCIPLES = [
  ['ease', 'slow in / slow out', 'no speed jumps: a part never goes from still to full speed (or back) in one frame'],
  ['arcs', 'arcs', 'no kinks: a fast part never turns more than 30° in one 60 fps frame (a key without an arc turns 60–100°)'],
  ['anticipation', 'anticipation', 'before each big move the part first goes the other way (≥ 4 % of the move)'],
  ['follow', 'follow-through', 'after the driver comes to rest, the follower keeps moving on its own ≥ 0.08 s (lag reported)'],
  ['overlap', 'overlapping action', 'parts start a big move at different times (spread ≥ 0.05 s)'],
  ['squash', 'squash & stretch', 'the body squashes / stretches ≥ 8 % on big moves and keeps its area within 5 %'],
  ['timing', 'timing & spacing', 'peak speed ≥ 1.8 × average moving speed (fast and slow, not one even pace)'],
  ['alive', 'secondary action (alive at rest)', 'something breathes during every rest; nothing is a still picture'],
  ['planted', 'planted feet', 'a planted foot drifts ≤ 1.5 px'],
  ['teleport', 'no teleport', 'the root never jumps more than 0.2 body lengths in one 60 fps frame'],
];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], len = v => Math.hypot(v[0], v[1]);

export function audit(track) {
  const { fps = 60, scale = 100, points, beats = [], chains = [], planted = [], rest = [], impacts = [] } = track;
  const names = Object.keys(points), N = points[names[0]].length, root = track.root || names[0];
  const fr = t => clamp(Math.round(t * fps), 0, N - 1), near = i => impacts.some(t => Math.abs(i - t * fps) <= 3);
  const vel = n => { const P = points[n]; return P.map((p, i) => i ? [(p[0] - P[i - 1][0]) * fps, (p[1] - P[i - 1][1]) * fps] : [0, 0]); };
  const V = Object.fromEntries(names.map(n => [n, vel(n)])), S = Object.fromEntries(names.map(n => [n, V[n].map(len)]));
  const minSp = .25 * scale, R = [];
  const add = (id, value, unit, pass, note = '') => { const p = PRINCIPLES.find(q => q[0] === id); R.push({ id, name: p[1], target: p[2], value: +(+value).toFixed(3), unit, pass, note }); };

  // ease: speed jumps
  { let worst = 0, where = '';
    for (const n of names) { const s = S[n], pk = Math.max(...s); if (pk < minSp) continue;
      for (let i = 2; i < N; i++) { if (near(i)) continue; const j = Math.abs(s[i] - s[i - 1]) / pk; if (j > worst) { worst = j; where = `${n} @ ${(i / fps).toFixed(2)} s`; } } }
    add('ease', worst * 100, '% of peak speed in one frame', worst <= .35, where); }
  // arcs: kinks
  { let worst = 0, where = '';
    for (const n of names) { const v = V[n], s = S[n], pk = Math.max(...s); if (pk < minSp) continue;
      for (let i = 2; i < N; i++) { if (near(i) || s[i] < .3 * pk || s[i - 1] < .3 * pk) continue;
        const c = (v[i][0] * v[i - 1][0] + v[i][1] * v[i - 1][1]) / (s[i] * s[i - 1]), a = Math.acos(clamp(c, -1, 1)) * 180 / Math.PI * (60 / fps);
        if (a > worst) { worst = a; where = `${n} @ ${(i / fps).toFixed(2)} s`; } } }
    add('arcs', worst, '° turn in one frame (60 fps)', worst <= 30, where); }
  const big = beats.filter(b => b.big);
  // anticipation
  if (big.length) { const vals = big.map(b => {
      const P = points[b.point || root], s = S[b.point || root], a = fr(b.t0), z = fr(b.t1);
      let ip = a; for (let i = a; i <= z; i++) if (s[i] > s[ip]) ip = i;
      const k = Math.max(1, Math.round(fps * .03)), d0 = sub(P[Math.min(N - 1, ip + k)], P[Math.max(0, ip - k)]), dl = len(d0) || 1, d = [d0[0] / dl, d0[1] / dl];
      const w0 = Math.max(a, fr(ip / fps - .9)); let back = 0;
      for (let i = w0; i <= ip; i++) { const q = sub(P[w0], P[i]); back = Math.max(back, q[0] * d[0] + q[1] * d[1]); }
      let travel = 0; for (let i = ip; i <= z; i++) { const q = sub(P[i], P[w0]); travel = Math.max(travel, q[0] * d[0] + q[1] * d[1]); }
      return { b: b.name, v: back / Math.max(travel, .05 * scale) }; });
    const m = vals.reduce((a, b) => b.v < a.v ? b : a);
    add('anticipation', m.v * 100, '% of the move, the other way first (weakest big beat)', m.v >= .04, vals.map(x => `${x.b} ${(x.v * 100).toFixed(1)}%`).join(' · ')); }
  // follow-through on chains, over the big beats (or the whole track)
  if (chains.length) { const wins = big.length ? big : [{ name: 'all', t0: 0, t1: (N - 1) / fps }]; let worst = null;
    for (const w of wins) for (const [dn, fn, an] of chains) {
      const sd = S[dn], a = fr(w.t0), z = fr(w.t1), pk = Math.max(...sd.slice(a, z + 1)); if (pk < minSp) continue;
      // the driver's stop: after its peak, the first moment it stays below 10 % of that peak for 0.15 s
      let ip = a; for (let i = a; i <= z; i++) if (sd[i] > sd[ip]) ip = i;
      let ts = -1, run = 0; for (let i = ip; i < N; i++) { if (sd[i] < .1 * pk) { if (++run >= fps * .15) { ts = i - run + 1; break; } } else run = 0; }
      if (ts < 0) continue;
      // the follower seen from the driver; with an anchor, in a frame that turns with the driver (a rigid part reads 0)
      const rel = points[fn].map((p, i) => { const r = sub(p, points[dn][i]); if (!an) return r; const d = sub(points[dn][i], points[an][i]), a = -Math.atan2(d[1], d[0]), c = Math.cos(a), sn = Math.sin(a); return [r[0] * c - r[1] * sn, r[0] * sn + r[1] * c]; });
      const rs = rel.map((p, i) => i ? len(sub(p, rel[i - 1])) * fps : 0);
      let te = ts; for (let i = ts; i < Math.min(N, ts + fps * 1.2); i++) if (rs[i] > .06 * scale) te = i;
      const sf = S[fn]; let bl = 0, bc = -1;
      for (let L = 0; L <= Math.round(fps * .3); L++) { let c = 0; for (let i = a; i <= z - L; i++) c += sd[i] * sf[i + L]; if (c > bc * 1.02) { bc = c; bl = L; } }
      const settle = (te - ts) / fps, r = { w: w.name, c: `${dn}→${fn}`, settle, lag: bl * 60 / fps };
      if (!worst || settle + r.lag * .01 < worst.settle + worst.lag * .01) worst = r; }
    if (worst) add('follow', worst.settle, `s of settle after ${worst.c} stops (${worst.w}); lag ${worst.lag.toFixed(1)} fr`, worst.settle >= .08, ''); }
  // overlap: onset spread
  if (big.length) { const vals = big.map(b => {
      const a = fr(b.t0), z = fr(b.t1), on = [];
      for (const n of b.parts || names) { const s = S[n], pk = Math.max(...s.slice(a, z + 1)); if (pk < minSp) continue;
        for (let i = a; i <= z; i++) if (s[i] > .3 * scale) { on.push(i); break; } }
      return { b: b.name, v: on.length > 1 ? (Math.max(...on) - Math.min(...on)) / fps : 0 }; });
    const m = vals.reduce((a, b) => b.v < a.v ? b : a);
    add('overlap', m.v, 's between the first and last part to start (weakest big beat)', m.v >= .05, vals.map(x => `${x.b} ${x.v.toFixed(2)} s`).join(' · ')); }
  // squash & stretch
  if (track.squash) { const Q = track.squash; let lo = 9, hi = 0, dev = 0;
    for (const b of big.length ? big : [{ t0: 0, t1: (N - 1) / fps }]) for (let i = fr(b.t0); i <= fr(b.t1); i++) { lo = Math.min(lo, Q[i][1]); hi = Math.max(hi, Q[i][1]); }
    for (const q of Q) dev = Math.max(dev, Math.abs(q[0] * q[1] - 1));
    add('squash', (hi - lo) * 100, `% range (area kept within ${(dev * 100).toFixed(1)} %)`, hi - lo >= .08 && dev <= .05); }
  // timing contrast
  if (big.length) { const vals = big.map(b => { const s = S[b.point || root].slice(fr(b.t0), fr(b.t1) + 1), pk = Math.max(...s), mv = s.filter(v => v > .05 * pk);
      return { b: b.name, v: mv.length ? pk / (mv.reduce((x, y) => x + y, 0) / mv.length) : 0 }; });
    const m = vals.reduce((a, b) => b.v < a.v ? b : a);
    add('timing', m.v, '× peak / average speed (weakest big beat)', m.v >= 1.8, vals.map(x => `${x.b} ${x.v.toFixed(2)}`).join(' · ')); }
  // alive at rest
  if (rest.length) { let worst = Infinity, where = '';
    for (const w of rest) { const a = fr(w.t0), z = fr(w.t1); let mx = 0;
      for (const n of w.alive || names) for (let i = a; i <= z; i++) mx = Math.max(mx, len(sub(points[n][i], points[n][a])));
      if (mx < worst) { worst = mx; where = `${w.t0.toFixed(1)}–${w.t1.toFixed(1)} s`; } }
    add('alive', worst, 'px the liveliest part moves during the stillest rest', worst >= .6, where); }
  // planted feet
  if (planted.length) { let worst = 0, where = '';
    for (const p of planted) { const P = points[p.point], a = fr(p.t0), z = fr(p.t1);
      for (let i = a; i <= z; i++) { const d = len(sub(P[i], P[a])); if (d > worst) { worst = d; where = `${p.point} ${p.t0.toFixed(2)}–${p.t1.toFixed(2)} s`; } } }
    add('planted', worst, 'px drift of a planted foot', worst <= 1.5, where); }
  // teleport
  { const s = S[root]; let mx = 0, at = 0; for (let i = 1; i < N; i++) if (s[i] / fps > mx) { mx = s[i] / fps; at = i; }
    const v = mx * (fps / 60) / scale; add('teleport', v, 'body lengths in one 60 fps frame', v <= .2, `@ ${(at / fps).toFixed(2)} s`); }
  return { pass: R.every(r => r.pass), results: R, passed: R.filter(r => r.pass).length, of: R.length };
}

// Side by side: what the pass changed.
export function compare(before, after) {
  const a = audit(before), b = audit(after);
  return { before: a, after: b, rows: b.results.map(r => { const x = a.results.find(q => q.id === r.id); return { id: r.id, name: r.name, before: x?.value, beforePass: x?.pass, after: r.value, afterPass: r.pass, unit: r.unit }; }) };
}
export function table(rep) {
  return rep.results.map(r => `${r.pass ? 'ok  ' : 'FAIL'}  ${r.name.padEnd(34)} ${String(r.value).padStart(8)}  ${r.unit}${r.note ? '  · ' + r.note : ''}`).join('\n');
}

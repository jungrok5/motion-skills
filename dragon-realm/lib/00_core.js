// dragon-realm · 00_core — the namespace, numbers, seeded noise, tracks and paths.
// Everything in a film is a pure function of film time: nothing here keeps state between frames and nothing reads
// Math.random or the clock.  `DR` is the only global the engine adds; a film's src/*.js files run after lib/*.js.
const DR = { P: new URLSearchParams(typeof location !== 'undefined' ? location.search : ''), t: 0, dt: 1 / 30, frameFns: [], bootFns: [], checks: [], castViews: [], U: {} };
{
  const P = DR.P;
  DR.RENDER = P.has('render');                       // ?render=1 → fixed size, no clock, seek() only
  DR.num = (k, d) => (P.has(k) && isFinite(+P.get(k)) ? +P.get(k) : d);
  DR.off = new Set((P.get('off') || '').split(',').filter(Boolean));   // ?off=clouds,trees … to time or debug a part
  DR.on = (k) => !DR.off.has(k);

  // ── numbers ──
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const sat = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const unlerp = (a, b, x) => (b === a ? 0 : (x - a) / (b - a));
  const remap = (x, a, b, c, d) => c + (d - c) * sat(unlerp(a, b, x));
  const smooth = (a, b, x) => { const t = sat(unlerp(a, b, x)); return t * t * (3 - 2 * t); };
  const smoother = (a, b, x) => { const t = sat(unlerp(a, b, x)); return t * t * t * (t * (t * 6 - 15) + 10); };
  const fract = (x) => x - Math.floor(x);
  const mod = (x, n) => ((x % n) + n) % n;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  // a window: 0 before a, up over `i` seconds, 1, down over `o` seconds to b
  const pulse = (t, a, b, i = 0.5, o = i) => Math.min(smooth(a, a + Math.max(i, 1e-5), t), 1 - smooth(b - Math.max(o, 1e-5), b, t));
  const ease = {
    lin: (t) => t, in2: (t) => t * t, out2: (t) => 1 - (1 - t) * (1 - t), io2: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
    in3: (t) => t * t * t, out3: (t) => 1 - (1 - t) ** 3, io3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - 4 * (1 - t) ** 3),
    out4: (t) => 1 - (1 - t) ** 4, io5: (t) => t * t * t * (t * (t * 6 - 15) + 10), s: (t) => t * t * (3 - 2 * t),
    outBack: (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2, outExpo: (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  };
  Object.assign(DR, { clamp, sat, lerp, unlerp, remap, smooth, smoother, fract, mod, TAU, DEG, pulse, ease });

  // ── seeded numbers ──
  const hash1 = (n) => { let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
  const hash2 = (a, b) => hash1(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663));
  const hash3 = (a, b, c) => hash1(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul(c | 0, 83492791));
  const rng = (seed = 1) => { let a = (seed * 2654435761) >>> 0 || 1; const r = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    r.range = (lo, hi) => lo + (hi - lo) * r(); r.int = (lo, hi) => Math.floor(r.range(lo, hi + 1)); r.pick = (arr) => arr[Math.floor(r() * arr.length)]; r.sign = () => (r() < 0.5 ? -1 : 1);
    r.gauss = () => (r() + r() + r() + r() - 2) / 1.1547; r.disc = () => { const a2 = r() * TAU, q = Math.sqrt(r()); return [Math.cos(a2) * q, Math.sin(a2) * q]; };
    return r; };
  const q5 = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const noise1 = (x, s = 0) => { const i = Math.floor(x), f = x - i; return lerp(hash2(i, s), hash2(i + 1, s), q5(f)) * 2 - 1; };
  const noise2 = (x, y, s = 0) => { const i = Math.floor(x), j = Math.floor(y), u = q5(x - i), v = q5(y - j);
    return lerp(lerp(hash3(i, j, s), hash3(i + 1, j, s), u), lerp(hash3(i, j + 1, s), hash3(i + 1, j + 1, s), u), v) * 2 - 1; };
  const noise3 = (x, y, z, s = 0) => { const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = q5(x - i), v = q5(y - j), w = q5(z - k);
    const h = (a, b, c) => hash3(a, b, c * 131 + s);
    return lerp(lerp(lerp(h(i, j, k), h(i + 1, j, k), u), lerp(h(i, j + 1, k), h(i + 1, j + 1, k), u), v), lerp(lerp(h(i, j, k + 1), h(i + 1, j, k + 1), u), lerp(h(i, j + 1, k + 1), h(i + 1, j + 1, k + 1), u), v), w) * 2 - 1; };
  const fbm2 = (x, y, oct = 5, s = 0, lac = 2.03, gain = 0.5) => { let a = 0.5, f = 1, v = 0, n = 0; for (let o = 0; o < oct; o++) { v += a * noise2(x * f + o * 17.1, y * f - o * 9.7, s + o); n += a; a *= gain; f *= lac; } return v / n; };
  const fbm3 = (x, y, z, oct = 4, s = 0, lac = 2.03, gain = 0.5) => { let a = 0.5, f = 1, v = 0, n = 0; for (let o = 0; o < oct; o++) { v += a * noise3(x * f + o * 17.1, y * f - o * 9.7, z * f + o * 4.3, s + o); n += a; a *= gain; f *= lac; } return v / n; };
  const ridge2 = (x, y, oct = 5, s = 0) => { let a = 0.5, f = 1, v = 0, n = 0, w = 1; for (let o = 0; o < oct; o++) { let r = 1 - Math.abs(noise2(x * f + o * 31.7, y * f + o * 11.3, s + o)); r *= r; v += a * r * w; w = sat(r * 1.6); n += a; a *= 0.5; f *= 2.07; } return v / n; };
  // wobble: a smooth, never-repeating drift for hand-held cameras, breathing, sway. 1-D fbm in time.
  const wobble = (t, seed = 0, oct = 3) => { let a = 1, f = 1, v = 0, n = 0; for (let o = 0; o < oct; o++) { v += a * noise1(t * f + seed * 13.7 + o * 5.1, seed + o); n += a; a *= 0.5; f *= 2.1; } return v / n; };
  Object.assign(DR, { hash1, hash2, hash3, rng, noise1, noise2, noise3, fbm2, fbm3, ridge2, wobble });

  // ── colour: hex → linear numbers (what shaders and lights want) ──
  const s2l = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  DR.rgb = (hex, k = 1) => { if (Array.isArray(hex)) return hex; const n = typeof hex === 'number' ? hex : parseInt(String(hex).replace('#', ''), 16); return [s2l(((n >> 16) & 255) / 255) * k, s2l(((n >> 8) & 255) / 255) * k, s2l((n & 255) / 255) * k]; };
  DR.col = (hex, k = 1) => { const c = DR.rgb(hex, k); return new THREE.Color().setRGB(c[0], c[1], c[2], THREE.LinearSRGBColorSpace); };
  DR.v3 = (x = 0, y = 0, z = 0) => (Array.isArray(x) ? new THREE.Vector3(x[0], x[1], x[2]) : new THREE.Vector3(x, y, z));
  const mixA = (a, b, t) => (typeof a === 'number' ? lerp(a, b, t) : a.map((v, i) => lerp(v, b[i], t)));
  DR.mix = mixA;

  // ── tracks: keyed values over film time.  track([[0, a], [4, b, 'io3'], [9, c]]) → f(t).  Values: numbers or arrays
  //    (colours as '#hex' are converted to linear arrays).  The easing named on a key shapes the way INTO that key. ──
  DR.track = (keys, dflt = 'io2') => {
    const K = keys.map((k) => ({ t: k[0], v: typeof k[1] === 'string' ? DR.rgb(k[1]) : k[1], e: ease[k[2] || dflt] || ease.io2 })).sort((a, b) => a.t - b.t);
    return (t) => { if (t <= K[0].t) return K[0].v; const L = K[K.length - 1]; if (t >= L.t) return L.v;
      let i = 1; while (K[i].t < t) i++; const a = K[i - 1], b = K[i]; return mixA(a.v, b.v, b.e((t - a.t) / (b.t - a.t))); };
  };
  // a monotone cubic through [[x, y], …] (Fritsch–Carlson): never overshoots, so a distance-over-time curve never runs backwards
  DR.mono = (keys) => { const n = keys.length, X = keys.map((k) => k[0]), Y = keys.map((k) => k[1]), d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d.push((Y[i + 1] - Y[i]) / (X[i + 1] - X[i]));
    m[0] = d[0]; m[n - 1] = d[n - 2]; for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const q = 3 / Math.sqrt(s); m[i] = q * a * d[i]; m[i + 1] = q * b * d[i]; } }
    return (x) => { if (x <= X[0]) return Y[0] + m[0] * (x - X[0]); if (x >= X[n - 1]) return Y[n - 1] + m[n - 1] * (x - X[n - 1]); let i = 0; while (X[i + 1] < x) i++; const h = X[i + 1] - X[i], t = (x - X[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * Y[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * Y[i + 1] + (t3 - t2) * h * m[i + 1]; }; };
  // step track: the value of the last key at or before t
  DR.steps = (keys) => (t) => { let v = keys[0][1]; for (const k of keys) if (k[0] <= t) v = k[1]; return v; };

  // ── paths: a Catmull-Rom curve through points, walked by distance.  Used for creature routes and camera rails. ──
  // pts: [[x,y,z], …].  closed: false.  The curve is sampled once into a table; at(d) is a table look-up, so any
  // distance — including one behind the start or past the end (the curve goes on straight) — is cheap and exact enough.
  DR.path = (pts, { tension = 0.5, step = 1.0, closed = false } = {}) => {
    const P3 = pts.map((p) => (Array.isArray(p) ? p : [p.x, p.y, p.z])), n = P3.length;
    const get = (i) => (closed ? P3[mod(i, n)] : P3[clamp(i, 0, n - 1)]);
    const seg = closed ? n : n - 1;
    const cr = (i, u, out) => { // centripetal-ish (uniform with tension) Catmull-Rom
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2), u2 = u * u, u3 = u2 * u;
      for (let k = 0; k < 3; k++) { const m1 = tension * (p2[k] - p0[k]), m2 = tension * (p3[k] - p1[k]);
        out[k] = (2 * u3 - 3 * u2 + 1) * p1[k] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[k] + (u3 - u2) * m2; }
      return out; };
    // dense sampling → arc-length table at fixed step
    const dense = [], tmp = [0, 0, 0]; const SUB = 24;
    for (let i = 0; i < seg; i++) for (let j = 0; j < SUB; j++) dense.push(cr(i, j / SUB, [0, 0, 0]));
    dense.push(closed ? dense[0].slice() : get(n - 1).slice());
    const cum = [0]; for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1], dense[i][2] - dense[i - 1][2]));
    const length = cum[cum.length - 1], N = Math.max(2, Math.ceil(length / step) + 1), tab = new Float32Array(N * 3);
    let j = 0; for (let i = 0; i < N; i++) { const d = (i / (N - 1)) * length; while (j < cum.length - 2 && cum[j + 1] < d) j++; const u = sat(unlerp(cum[j], cum[j + 1], d));
      for (let k = 0; k < 3; k++) tab[i * 3 + k] = lerp(dense[j][k], dense[j + 1][k], u); }
    const d0 = [tab[3] - tab[0], tab[4] - tab[1], tab[5] - tab[2]], e = (N - 1) * 3, d1 = [tab[e] - tab[e - 3], tab[e + 1] - tab[e - 2], tab[e + 2] - tab[e - 1]];
    const l0 = Math.hypot(...d0) || 1, l1 = Math.hypot(...d1) || 1; for (let k = 0; k < 3; k++) { d0[k] /= l0; d1[k] /= l1; }
    const at = (d, out = [0, 0, 0]) => {
      if (closed) d = mod(d, length);
      if (d <= 0) { for (let k = 0; k < 3; k++) out[k] = tab[k] + d0[k] * d; return out; }
      if (d >= length) { for (let k = 0; k < 3; k++) out[k] = tab[e + k] + d1[k] * (d - length); return out; }
      const f = (d / length) * (N - 1), i = Math.min(N - 2, Math.floor(f)), u = f - i;
      for (let k = 0; k < 3; k++) out[k] = lerp(tab[i * 3 + k], tab[i * 3 + 3 + k], u); return out; };
    const dir = (d, out = [0, 0, 0], h = 1.5) => { const a = at(d - h, tmp), ax = a[0], ay = a[1], az = a[2]; const b = at(d + h, tmp);
      out[0] = b[0] - ax; out[1] = b[1] - ay; out[2] = b[2] - az; const l = Math.hypot(out[0], out[1], out[2]) || 1; out[0] /= l; out[1] /= l; out[2] /= l; return out; };
    const ptS = P3.map((_, i) => cum[Math.min(cum.length - 1, i * SUB)]);   // distance along the curve at each control point
    // distance at a fractional control-point index (3.5 = half-way between points 3 and 4)
    const sAt = (f) => { const i = clamp(Math.floor(f), 0, n - 1), j = Math.min(n - 1, i + 1); return lerp(ptS[i], ptS[j], f - i); };
    return { length, at, dir, pts: P3, closed, ptS, sAt };
  };

  // ── small vector helpers on arrays (allocation-free in loops) ──
  DR.vec = {
    add: (a, b, o = [0, 0, 0]) => { o[0] = a[0] + b[0]; o[1] = a[1] + b[1]; o[2] = a[2] + b[2]; return o; },
    sub: (a, b, o = [0, 0, 0]) => { o[0] = a[0] - b[0]; o[1] = a[1] - b[1]; o[2] = a[2] - b[2]; return o; },
    mul: (a, k, o = [0, 0, 0]) => { o[0] = a[0] * k; o[1] = a[1] * k; o[2] = a[2] * k; return o; },
    mad: (a, b, k, o = [0, 0, 0]) => { o[0] = a[0] + b[0] * k; o[1] = a[1] + b[1] * k; o[2] = a[2] + b[2] * k; return o; },
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b, o = [0, 0, 0]) => { const x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0]; o[0] = x; o[1] = y; o[2] = z; return o; },
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a, o = [0, 0, 0]) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; o[0] = a[0] / l; o[1] = a[1] / l; o[2] = a[2] / l; return o; },
    lerp: (a, b, t, o = [0, 0, 0]) => { o[0] = lerp(a[0], b[0], t); o[1] = lerp(a[1], b[1], t); o[2] = lerp(a[2], b[2], t); return o; },
    dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
  };

  // ── hooks ──
  DR.onFrame = (fn, order = 0) => { DR.frameFns.push({ fn, order }); DR.frameFns.sort((a, b) => a.order - b.order); };
  DR.progress = (p, label) => { const b = typeof document !== 'undefined' && document.querySelector('#bar i'); if (b) b.style.width = Math.round(p * 100) + '%'; if (DR.P.has('log') && label) console.log('[boot]', label); };
  DR.fail = (e) => { const el = typeof document !== 'undefined' && document.getElementById('err'); if (el) el.textContent = String((e && e.stack) || e); console.error(e); };
  // yield to the page between heavy build steps so the loading bar can paint (skipped when rendering frames)
  DR.breathe = () => (DR.RENDER ? Promise.resolve() : new Promise((r) => setTimeout(r, 0)));
}

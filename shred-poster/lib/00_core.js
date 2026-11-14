// shred-poster · 00_core — numbers, easing, seeded randomness and smooth noise. Everything here is pure: the same
// inputs give the same numbers on every machine, so a frame is a function of film time and nothing else.
const SP = {};
{
  SP.P = new URLSearchParams(location.search);
  SP.RENDER = SP.P.get('render') === '1';
  SP.num = (k, d) => (SP.P.has(k) ? +SP.P.get(k) : d);
  SP.TAU = Math.PI * 2; SP.DEG = Math.PI / 180;
  SP.clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  SP.sat = (x) => SP.clamp(x, 0, 1);
  SP.lerp = (a, b, u) => a + (b - a) * u;
  SP.unlerp = (a, b, x) => (x - a) / (b - a);
  SP.mix3 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  // sigmoid ease with adjustable hardness: p = 1 linear, 3 a firm ease-in-out (the house ease)
  SP.sease = (u, p = 3) => { u = SP.sat(u); const a = Math.pow(u, p), b = Math.pow(1 - u, p); return a / (a + b || 1); };
  SP.smooth = (u) => { u = SP.sat(u); return u * u * (3 - 2 * u); };
  SP.ease = {
    lin: (u) => SP.sat(u),
    in2: (u) => SP.sat(u) ** 2,
    out2: (u) => 1 - (1 - SP.sat(u)) ** 2,
    out3: (u) => 1 - (1 - SP.sat(u)) ** 3,
    io2: (u) => SP.sease(u, 2),
    io3: (u) => SP.sease(u, 3),
  };
  // damped return after an overshoot of size amp (seconds since the hit); zero slope at s = 0
  SP.spring = (s, amp, tau = 0.06, period = 0.16) => {
    if (s <= 0) return -amp;
    const w = SP.TAU / period;
    return -amp * Math.exp(-s / tau) * (Math.cos(w * s) + Math.sin(w * s) / (tau * w));
  };

  // ── seeded randomness ──
  SP.rng = (seed = 1) => {
    let a = (seed * 2654435761) >>> 0 || 1;
    const next = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const r = () => next();
    r.uni = (lo = 0, hi = 1) => lo + (hi - lo) * next();
    r.norm = (mu = 0, sd = 1) => { const u = Math.max(1e-9, next()), v = next(); return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(SP.TAU * v); };
    r.sign = () => (next() < 0.5 ? -1 : 1);
    r.pick = (arr) => arr[Math.floor(next() * arr.length) % arr.length];
    r.int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
    r.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    return r;
  };
  // integer hash → [0,1)
  SP.hash = (i, j = 0, k = 0) => { let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  // 1D value noise, smooth, about unit range
  SP.noise1 = (x, seed = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return (SP.lerp(SP.hash(i, seed), SP.hash(i + 1, seed), u) * 2 - 1); };
  // hand-held drift: a few incommensurate sines (smooth, bounded, the same every run)
  SP.shake = (t, seed, amp) => { const r = SP.rng(seed * 7 + 3), p = [r() * 6.28, r() * 6.28, r() * 6.28]; return amp * (Math.sin(SP.TAU * 1.3 * t + p[0]) * 0.6 + Math.sin(SP.TAU * 2.9 * t + p[1]) * 0.3 + Math.sin(SP.TAU * 5.3 * t + p[2]) * 0.1); };

  // smoothed random field on a grid (separable box blurs of white noise), unit std. Returns Float32Array ny*nx.
  SP.field = (rng, ny, nx, sy, sx, wrap = false) => {
    const a = new Float32Array(nx * ny);
    for (let i = 0; i < a.length; i++) a[i] = rng.norm();
    const blur = (len, stride, count, step, r) => {
      if (r < 1) return;
      const tmp = new Float32Array(len);
      for (let c = 0; c < count; c++) {
        const o = c * step;
        for (let pass = 0; pass < 3; pass++) {
          for (let i = 0; i < len; i++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { let j = i + k; if (wrap) j = (j + len) % len; if (j >= 0 && j < len) { s += a[o + j * stride]; n++; } } tmp[i] = s / n; }
          for (let i = 0; i < len; i++) a[o + i * stride] = tmp[i];
        }
      }
    };
    blur(nx, 1, ny, nx, Math.round(sx));
    blur(ny, nx, nx, 1, Math.round(sy));
    let m = 0, v = 0; for (const x of a) m += x; m /= a.length; for (const x of a) v += (x - m) ** 2; const sd = Math.sqrt(v / a.length) || 1;
    for (let i = 0; i < a.length; i++) a[i] = (a[i] - m) / sd;
    return a;
  };
  // crumpled paper: a sum of sharp folds |d| along lines, net tilt removed, peak = amp. Facets stay flat between the
  // folds, so the light breaks on crisp lines like real paper. X, Y: Float32Arrays of point coordinates.
  SP.creases = (rng, X, Y, n, amp, across = true, sharp = 0.003, spread = 0.45) => {
    const z = new Float32Array(X.length);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < X.length; i++) { x0 = Math.min(x0, X[i]); x1 = Math.max(x1, X[i]); y0 = Math.min(y0, Y[i]); y1 = Math.max(y1, Y[i]); }
    for (let k = 0; k < n; k++) {
      const ang = across ? rng.norm(0, spread) : rng.uni(0, Math.PI), c = Math.cos(ang), s = Math.sin(ang);
      const px = rng.uni(x0, x1), py = rng.uni(y0, y1), sg = rng.sign() * rng.uni(0.4, 1);
      for (let i = 0; i < X.length; i++) { const d = (X[i] - px) * c + (Y[i] - py) * s; z[i] += sg * Math.sqrt(d * d + sharp * sharp); }
    }
    // remove the best-fit plane (least squares on x, y, 1)
    let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, sz = 0, sxz = 0, syz = 0; const N = X.length;
    for (let i = 0; i < N; i++) { sxx += X[i] * X[i]; sxy += X[i] * Y[i]; syy += Y[i] * Y[i]; sx += X[i]; sy += Y[i]; sz += z[i]; sxz += X[i] * z[i]; syz += Y[i] * z[i]; }
    const M = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, N]], b = [sxz, syz, sz];
    const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det(M) || 1, col = (j) => M.map((r, i) => r.map((v, k) => (k === j ? b[i] : v)));
    const ca = det(col(0)) / D, cb = det(col(1)) / D, cc = det(col(2)) / D;
    let mx = 1e-9; for (let i = 0; i < N; i++) { z[i] -= ca * X[i] + cb * Y[i] + cc; mx = Math.max(mx, Math.abs(z[i])); }
    for (let i = 0; i < N; i++) z[i] = (z[i] / mx) * amp;
    return z;
  };

  // ── colour ──
  SP.hex = (h) => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
  SP.toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  SP.lum = (h) => { const [r, g, b] = SP.hex(h).map(SP.toLin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  SP.contrast = (a, b) => { const x = SP.lum(a), y = SP.lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  SP.color = (h) => new THREE.Color().setRGB(...SP.hex(h).map(SP.toLin), THREE.LinearSRGBColorSpace);

  // loading progress on the veil (live page)
  SP.progress = (u, what) => { const b = document.querySelector('#bar i'); if (b) b.style.width = Math.round(u * 100) + '%'; if (what) SP.stage = what; };
  SP.breathe = () => new Promise((r) => setTimeout(r, 0));
  SP.fail = (e) => { window.FAILED = String((e && e.stack) || e); const el = document.getElementById('err'); if (el) el.textContent = window.FAILED; console.error(e); };
}

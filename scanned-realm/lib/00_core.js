// scanned-realm · 00_core — the namespace, numbers, seeded randomness, CPU noise, tracks, hooks, URL options.
// Sources are plain scripts joined in name order inside one module: everything hangs off LR.
const LR = { VERSION: '1.0', THREE };
{
  const q = new URLSearchParams(location.search);
  LR.q = (k, d) => (q.has(k) ? q.get(k) : d);
  LR.ASSETS = typeof REALM_ASSETS !== 'undefined' ? REALM_ASSETS : null;       // assets/manifest.json: what fetch-assets.mjs downloaded
  LR.qn = (k, d) => (q.has(k) && q.get(k) !== '' && isFinite(+q.get(k)) ? +q.get(k) : d);
  LR.RENDER = q.get('render') === '1';                                   // still mode: no clock, frames on request
  LR.off = new Set((q.get('off') || '').split(',').filter(Boolean));     // ?off=ao,gi,skyshare,vol,shafts,taa,bloom,grass,shadow,contact,mirror,fx,water,ssr,audio

  LR.TAU = Math.PI * 2;
  LR.clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  LR.sat = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  LR.lerp = (a, b, t) => a + (b - a) * t;
  LR.sm = (a, b, x) => { const t = LR.sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  LR.remap = (x, a, b, c, d) => c + (d - c) * LR.sat((x - a) / (b - a));
  LR.ease = (t) => t * t * (3 - 2 * t);
  LR.damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
  LR.wrapPi = (a) => { a = (a + Math.PI) % LR.TAU; if (a < 0) a += LR.TAU; return a - Math.PI; };

  // seeded randomness: r() in [0,1), r.range(a,b), r.int(n), r.pick(list), r.sign(), r.gauss(), r.fork(tag)
  const strHash = (s) => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  LR.rng = (seed = 1) => {
    let a = (typeof seed === 'number' ? seed : strHash(seed)) >>> 0 || 1;
    const r = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    r.range = (lo, hi) => lo + (hi - lo) * r();
    r.int = (n) => Math.floor(r() * n);
    r.pick = (l) => l[Math.floor(r() * l.length)];
    r.sign = () => (r() < 0.5 ? -1 : 1);
    r.chance = (p) => r() < p;
    r.gauss = () => (r() + r() + r() + r() - 2) / 2;                      // ~N(0, .29), clipped to ±1
    r.fork = (tag) => LR.rng(strHash(tag + ':' + a));
    return r;
  };
  LR.strHash = strHash;

  // CPU noise (value noise with quintic fade) — used for land, planting, layout.  Not for shaders.
  const h2 = (x, y) => { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  LR.hash2 = h2;
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  LR.noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), u = fade(x - xi), v = fade(y - yi);
    const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;      // 0..1
  };
  LR.fbm = (x, y, oct = 5, gain = 0.5, lac = 2.03) => { let s = 0, a = 0.5, n = 0; for (let i = 0; i < oct; i++) { s += a * LR.noise(x, y); n += a; x = x * lac + 17.3; y = y * lac - 9.1; a *= gain; } return s / n; };
  LR.ridge = (x, y, oct = 5) => { let s = 0, a = 0.5, n = 0, w = 1; for (let i = 0; i < oct; i++) { let v = 1 - Math.abs(LR.noise(x, y) * 2 - 1); v *= v * w; w = LR.sat(v * 2); s += a * v; n += a; x = x * 2.07 + 5.2; y = y * 2.07 + 1.7; a *= 0.5; } return s / n; };

  // keyframe track: LR.track([[t, v], …]) → f(t); v is a number or an array; smooth between keys
  LR.track = (keys, smooth = true) => (t) => {
    if (t <= keys[0][0]) return keys[0][1]; const L = keys[keys.length - 1]; if (t >= L[0]) return L[1];
    let i = 1; while (keys[i][0] < t) i++; const A = keys[i - 1], B = keys[i]; let u = (t - A[0]) / (B[0] - A[0]); if (smooth) u = LR.ease(u);
    return Array.isArray(A[1]) ? A[1].map((a, k) => a + (B[1][k] - a) * u) : A[1] + (B[1] - A[1]) * u;
  };

  // colour: '#rrggbb' or [r,g,b] 0..1 sRGB → linear [r,g,b]
  LR.rgb = (c) => { if (typeof c === 'string') { const n = parseInt(c.slice(1), 16); c = [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; } return c.map((v) => Math.pow(v, 2.2)); };
  LR.mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  // hooks: LR.on('frame', fn, order) — lower order runs first.  LR.emit('frame', …)
  const hooks = {};
  LR.on = (name, fn, order = 50) => { (hooks[name] = hooks[name] || []).push({ fn, order }); hooks[name].sort((a, b) => a.order - b.order); };
  LR.emit = (name, ...a) => { const l = hooks[name]; if (l) for (let i = 0; i < l.length; i++) l[i].fn(...a); };

  // progress for the veil
  LR.progress = (f, label) => { const b = document.querySelector('#bar i'); if (b) b.style.width = Math.round(f * 100) + '%'; const s = document.getElementById('step'); if (s && label) s.textContent = label; };
  LR.fail = (msg) => { window.FAILED = String(msg); const e = document.getElementById('err'); if (e) e.textContent = String(msg); console.error(msg); };
  // let the page paint between heavy steps
  LR.breath = () => (LR.RENDER ? Promise.resolve() : new Promise((r) => setTimeout(r, 0)));
  LR.log = (...a) => { if (LR.q('log')) console.log('[lr]', ...a); };
}

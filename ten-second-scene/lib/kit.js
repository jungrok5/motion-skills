/* ten-second-scene · kit.js — numbers, seeded randomness, noise, colour, a pinhole camera and the page contract.
   new-scene.mjs inlines this file into every scene, so a scene is ONE html file. Everything here is a pure function
   of its inputs; the only clock is the live player's, and it only ever calls seek(t). */
(function (g) {
  'use strict';
  const TSS = g.TSS = g.TSS || {};
  const PI = Math.PI, TAU = PI * 2;

  // ---------- numbers ----------
  const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const remap = (x, a, b, c, d) => c + (d - c) * clamp((x - a) / (b - a));
  const fract = x => x - Math.floor(x);
  const ease = {
    in: (p, k = 2) => Math.pow(clamp(p), k),
    out: (p, k = 2) => 1 - Math.pow(1 - clamp(p), k),
    inOut: (p, k = 2) => { p = clamp(p); return p < .5 ? Math.pow(2 * p, k) / 2 : 1 - Math.pow(2 - 2 * p, k) / 2; },
    sine: p => .5 - .5 * Math.cos(PI * clamp(p)),
  };
  // Step response of a damped spring: 0 → overshoot → settles at 1. f in Hz, z = damping ratio (<1 overshoots).
  function spring(t, f = 2, z = .45) {
    if (t <= 0) return 0;
    const w = TAU * f, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + z * w / wd * Math.sin(wd * t));
  }
  // Anticipation → action → overshoot/settle → (optional) return with a landing bounce. Value: 0 at rest, 1 at the
  // held pose, dips to -depth during anticipation. Heavier things: longer antic, longer settle (references/CRAFT.md).
  function act(t, o) {
    const { t0, antic = .25, dur = .5, depth = .15, over = .1, settle = .45, back = null } = o;
    let v;
    if (t < t0 - antic) v = 0;
    else if (t < t0) v = -depth * ease.sine((t - (t0 - antic)) / antic);
    else if (t < t0 + dur) v = lerp(-depth, 1, ease.inOut((t - t0) / dur, 2.2));
    else { const s = t - t0 - dur; v = 1 + over * Math.exp(-s * 4 / settle) * Math.sin(s * TAU / settle); }
    if (back && t > back.at) {
      const bd = back.dur || dur, s = t - back.at;
      const k = s < bd ? ease.inOut(s / bd, 2) : 1;
      const land = s > bd ? -(back.bounce ?? over * .7) * Math.exp(-(s - bd) * 5 / (back.settle || settle)) * Math.sin((s - bd) * TAU / (back.settle || settle)) : 0;
      v = lerp(v, 0, k) + land;
    }
    return v;
  }

  // ---------- seeded randomness ----------
  function rng(seed = 1) {
    let a = (seed >>> 0) || 0x9e3779b9;
    const r = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    r.range = (lo, hi) => lo + (hi - lo) * r();
    r.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * r());
    r.pick = arr => arr[Math.floor(r() * arr.length)];
    r.normal = (m = 0, s = 1) => m + s * Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(TAU * r());
    r.chance = p => r() < p;
    return r;
  }
  const hash = (i, j = 0, s = 0) => { let h = (i * 374761393 + j * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

  // ---------- noise (gradient 2D, value 3D) ----------
  const perm = new Uint8Array(512); { const r = rng(1337), p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
  const grad2 = (h, x, y) => { const a = h * TAU / 256; return Math.cos(a) * x + Math.sin(a) * y; };
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  function noise2(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
    const u = fade(xf), v = fade(yf);
    const a = grad2(perm[X + perm[Y]], xf, yf), b = grad2(perm[X + 1 + perm[Y]], xf - 1, yf);
    const c = grad2(perm[X + perm[Y + 1]], xf, yf - 1), d = grad2(perm[X + 1 + perm[Y + 1]], xf - 1, yf - 1);
    return lerp(lerp(a, b, u), lerp(c, d, u), v) * 1.41;
  }
  function noise3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
    const u = fade(xf), v = fade(yf), w = fade(zf);
    const h = (i, j, k) => perm[(perm[(perm[(xi + i) & 255] + yi + j) & 255] + zi + k) & 255] / 127.5 - 1;
    return lerp(lerp(lerp(h(0, 0, 0), h(1, 0, 0), u), lerp(h(0, 1, 0), h(1, 1, 0), u), v),
      lerp(lerp(h(0, 0, 1), h(1, 0, 1), u), lerp(h(0, 1, 1), h(1, 1, 1), u), v), w);
  }
  const fbm = (x, y, oct = 4, lac = 2, gain = .5) => { let s = 0, a = .5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise2(x * f + i * 17.3, y * f - i * 9.1); f *= lac; a *= gain; } return s; };

  // ---------- colour (0..1 rgb arrays; mixes in OKLab) ----------
  const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c); const n = parseInt(h, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const toLin = c => c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
  const toSrgb = c => c <= .0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - .055;
  function toOk([r, g2, b]) {
    r = toLin(r); g2 = toLin(g2); b = toLin(b);
    const l = Math.cbrt(.4122214708 * r + .5363325363 * g2 + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g2 + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g2 + .6299787005 * b);
    return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
  }
  function fromOk([L, a, b]) {
    const l = Math.pow(L + .3963377774 * a + .2158037573 * b, 3), m = Math.pow(L - .1055613458 * a - .0638541728 * b, 3), s = Math.pow(L - .0894841775 * a - 1.291485548 * b, 3);
    return [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s].map(c => clamp(toSrgb(clamp(c, 0, 1))));
  }
  const col = c => typeof c === 'string' ? hex(c) : c;
  const mix = (c1, c2, t) => { const a = toOk(col(c1)), b = toOk(col(c2)); return fromOk([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]); };
  // ramp([[0,'#123'],[.5,'#456'],[1,'#789']], t)
  const ramp = (stops, t) => { t = clamp(t); for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) { const [a, ca] = stops[i - 1], [b, cb] = stops[i]; return mix(ca, cb, (t - a) / (b - a || 1)); } return col(stops[stops.length - 1][1]); };
  const css = (c, a = 1) => { c = col(c); return `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`; };
  const shade = (c, k) => col(c).map(v => clamp(v * k));
  // shift lightness / chroma / hue in OKLab (dl ~ ±0.1, dc multiplies chroma, dh radians)
  const tweak = (c, dl = 0, dc = 1, dh = 0) => { const [L, a, b] = toOk(col(c)); const C = Math.hypot(a, b) * dc, h = Math.atan2(b, a) + dh; return fromOk([clamp(L + dl), C * Math.cos(h), C * Math.sin(h)]); };
  const lum = c => { c = col(c); return .2126 * toLin(c[0]) + .7152 * toLin(c[1]) + .0722 * toLin(c[2]); };

  // ---------- vectors + pinhole camera (y up, metres) ----------
  const v3 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: a => Math.hypot(a[0], a[1], a[2]), norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)],
  };
  // camera({ pos, target, fov (vertical deg), W, H, roll }) → project([x,y,z]) = { x, y (px), z (depth m), s (px per m) }
  function camera({ pos, target, fov = 40, W, H, roll = 0 }) {
    const f = v3.norm(v3.sub(target, pos));
    let r = v3.norm(v3.cross(f, [0, 1, 0])), u = v3.cross(r, f);
    if (roll) { const c = Math.cos(roll), s = Math.sin(roll), r2 = v3.add(v3.mul(r, c), v3.mul(u, s)); u = v3.add(v3.mul(u, c), v3.mul(r, -s)); r = r2; }
    const fy = (H / 2) / Math.tan(fov * PI / 360);
    const project = p => { const d = v3.sub(p, pos), z = v3.dot(d, f), zz = Math.max(z, 1e-3); return { x: W / 2 + fy * v3.dot(d, r) / zz, y: H / 2 - fy * v3.dot(d, u) / zz, z, s: fy / zz }; };
    // ray through pixel → hits the plane y = h (ground) ; returns world point or null
    const unproject = (px, py, h = 0) => { const dx = (px - W / 2) / fy, dy = -(py - H / 2) / fy; const dir = v3.norm(v3.add(f, v3.add(v3.mul(r, dx), v3.mul(u, dy)))); if (Math.abs(dir[1]) < 1e-6) return null; const k = (h - pos[1]) / dir[1]; return k > 0 ? v3.add(pos, v3.mul(dir, k)) : null; };
    return { pos, target, fov, W, H, f, r, u, fy, project, unproject };
  }

  // ---------- film grain (deterministic, per frame) ----------
  let grainTile = null;
  function grain(ctx, W, H, t, amount = .06, fps = 30) {
    if (!grainTile) {
      grainTile = document.createElement('canvas'); grainTile.width = grainTile.height = 256;
      const gx = grainTile.getContext('2d'), im = gx.createImageData(256, 256), r = rng(99);
      for (let i = 0; i < im.data.length; i += 4) { const v = 128 + r.normal(0, 38); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
      gx.putImageData(im, 0, 0);
    }
    const f = Math.round(t * fps), ox = Math.floor(hash(f, 1) * 256), oy = Math.floor(hash(f, 2) * 256);
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = amount;
    for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) ctx.drawImage(grainTile, x, y);
    ctx.restore();
  }

  // ---------- the page contract ----------
  // TSS.scene({ title, W, H, duration, fps, renderer: 'canvas2d'|'webgl'|'three', setup(api), frame(t), probe(t), info(), cast() })
  function scene(def) {
    const q = new URLSearchParams(location.search);
    const W = def.W || 1080, H = def.H || 1920, D = def.duration || 10, FPS = def.fps || 30;
    const scale = +(q.get('scale') || 1), render = q.has('render'), tFix = q.has('t') ? +q.get('t') : null, sheet = q.get('sheet');
    document.title = def.title || 'scene';
    Object.assign(document.body.style, { margin: 0, background: '#0b0b0d', overflow: 'hidden' });
    const canvas = document.createElement('canvas'); canvas.id = 'scene';
    canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
    document.body.appendChild(canvas);
    const api = { W, H, D, FPS, scale, canvas, query: q };
    g.DURATION = D; g.FPS = FPS; g.SIZE = { W, H };
    g.sceneInfo = () => Object.assign({ title: def.title, renderer: def.renderer, W, H, duration: D, fps: FPS }, def.info ? def.info() : {});
    const fit = () => { if (render) return; const k = Math.min(innerWidth / W, (innerHeight - 28) / H); Object.assign(canvas.style, { display: 'block', width: W * k + 'px', height: H * k + 'px', margin: '0 auto' }); };
    if (def.renderer === 'canvas2d') api.ctx = canvas.getContext('2d', { alpha: false });
    if (def.renderer === 'webgl') api.gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: true, alpha: false, premultipliedAlpha: true });
    if (sheet === 'cast') {
      // the cast sheet: run setup (it builds the people), then draw them on a fresh 2D canvas that takes the id
      Promise.resolve(def.setup ? def.setup(api) : null).then(() => {
        if (!def.cast || !TSS.Body) throw new Error('this scene has no cast() — figures need one (see references/BODY.md)');
        const specs = def.cast(), size = TSS.Body.castSize(specs), c2 = document.createElement('canvas');
        canvas.id = 'scene-hidden'; canvas.style.display = 'none'; c2.id = 'scene'; c2.width = size.W; c2.height = size.H;
        document.body.appendChild(c2); TSS.Body.castSheet(c2.getContext('2d'), specs);
        g.SIZE = size; g.seek = () => {}; g.__ready = true;
      });
      return api;
    }
    let last = -1;
    g.seek = t => {
      t = clamp(+t, 0, D - 1e-6);
      if (api.ctx) { api.ctx.setTransform(scale, 0, 0, scale, 0, 0); }
      def.frame(t, api); last = t;
    };
    g.probe = def.probe ? (t => def.probe(clamp(+t, 0, D - 1e-6), api)) : null;
    Promise.resolve(def.setup ? def.setup(api) : null).then(() => {
      if (tFix !== null || render) { g.seek(tFix ?? 0); fit(); g.__ready = true; return; }
      // live player: loops, click/space pauses, ←/→ jump 1 s, the bar scrubs
      fit(); addEventListener('resize', fit);
      const bar = document.createElement('div'), fill = document.createElement('div');
      Object.assign(bar.style, { position: 'fixed', left: 0, right: 0, bottom: 0, height: '28px', background: '#141418', cursor: 'pointer' });
      Object.assign(fill.style, { height: '100%', width: '0', background: 'rgba(212,175,96,.55)' });
      bar.appendChild(fill); document.body.appendChild(bar);
      let t0 = performance.now(), paused = false, at = 0;
      const now = () => paused ? at : ((performance.now() - t0) / 1000) % D;
      const jump = t => { at = (t + D) % D; t0 = performance.now() - at * 1000; };
      canvas.onclick = () => { if (paused) { paused = false; jump(at); } else { at = now(); paused = true; } };
      addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); canvas.onclick(); } if (e.key === 'ArrowRight') jump(now() + 1); if (e.key === 'ArrowLeft') jump(now() - 1); });
      bar.onclick = e => { jump(e.clientX / innerWidth * D); if (paused) at = (e.clientX / innerWidth) * D; };
      const loop = () => { const t = now(); if (t !== last) g.seek(t); fill.style.width = (t / D * 100) + '%'; requestAnimationFrame(loop); };
      g.__ready = true; loop();
    }).catch(e => { console.error(e); throw e; });
    return api;
  }

  Object.assign(TSS, { PI, TAU, clamp, lerp, smooth, remap, fract, ease, spring, act, rng, hash, noise2, noise3, fbm, hex, col, mix, ramp, css, shade, tweak, lum, toOk, fromOk, v3, camera, grain, scene });
})(window);

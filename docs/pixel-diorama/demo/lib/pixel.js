/* pixel-diorama · lib/pixel.js — the engine for looping pixel-art scenes.
   Classic script (no modules, no dependencies): defines window.PD. Works from file:// and from any static server.

   A scene draws into a small canvas (480×270 by default) with integer-only raster helpers, then one post pass adds
   dithered light, lightning flashes and a vignette. The video is that canvas scaled ×4 nearest-neighbour (1920×1080).

   Every frame is a pure function of t, and every period is snapped so that it divides the loop length:
   seek(LOOP) draws exactly the same pixels as seek(0). Use D.phase / D.wave / D.noise / D.flicker / D.particles for
   anything that moves, never Math.random or state carried between frames. */
(function (root) {
  'use strict';

  // ---------- numbers ----------
  const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const bayer = (x, y) => BAYER4[(y & 3) * 4 + (x & 3)];
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (a, b, v) => { const k = clamp((v - a) / (b - a)); return k * k * (3 - 2 * k); };
  const frac = v => v - Math.floor(v);

  function hash(i, s) {
    let h = Math.imul(i | 0, 374761393) ^ Math.imul((s | 0) + 1013, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  // seeded generator: r() in [0,1), r.range(a,b), r.int(a,b) inclusive, r.pick(arr), r.sign()
  function rng(seed) {
    let a = (Math.imul(seed | 0, 2654435761) ^ 0x9e3779b9) >>> 0;
    const r = () => {
      a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    r.range = (lo, hi) => lo + (hi - lo) * r();
    r.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * r());
    r.pick = arr => arr[Math.floor(r() * arr.length)];
    r.sign = () => r() < 0.5 ? -1 : 1;
    return r;
  }

  // ---------- colour ----------
  const rgbCache = new Map();
  function rgb(c) {
    let v = rgbCache.get(c); if (v) return v;
    const h = c.replace('#', ''); const s = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
    v = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
    rgbCache.set(c, v); return v;
  }
  const toHex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  const mix = (c1, c2, k) => { const a = rgb(c1), b = rgb(c2); return toHex(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)); };
  // pick from a ramp (dark → light) with ordered dithering between neighbours: crisp pixel-art shading
  const ramp = (cols, v, x, y) => { const f = clamp(v) * (cols.length - 1); const i = Math.floor(f); return cols[Math.min(cols.length - 1, i + (bayer(x, y) < f - i ? 1 : 0))]; };

  // ---------- raster helpers: integers only, never antialiased ----------
  const R = Math.round;
  function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(R(x), R(y), R(w), R(h)); }
  function px(ctx, x, y, c) { ctx.fillStyle = c; ctx.fillRect(R(x), R(y), 1, 1); }
  function line(ctx, x0, y0, x1, y1, c) {
    x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1); ctx.fillStyle = c;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      ctx.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  function disc(ctx, cx, cy, r, c) {
    cx = R(cx); cy = R(cy); ctx.fillStyle = c; const rr = (r + 0.5) * (r + 0.5);
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) { const h = Math.floor(Math.sqrt(Math.max(0, rr - dy * dy))); if (rr - dy * dy >= 0) ctx.fillRect(cx - h, cy + dy, 2 * h + 1, 1); }
  }
  function ellipse(ctx, cx, cy, rx, ry, c) {
    cx = R(cx); cy = R(cy); ctx.fillStyle = c;
    for (let dy = -R(ry); dy <= R(ry); dy++) { const k = 1 - (dy / (ry + 0.5)) ** 2; if (k < 0) continue; const h = Math.floor(rx * Math.sqrt(k) + 0.5); ctx.fillRect(cx - h, cy + dy, 2 * h + 1, 1); }
  }
  // filled polygon by scanline (pts = [[x,y],…])
  function poly(ctx, pts, c) {
    ctx.fillStyle = c; let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) { const xa = R(xs[i]), xb = R(xs[i + 1]); if (xb > xa) ctx.fillRect(xa, y, xb - xa, 1); }
    }
  }
  // ordered-dither fills: alpha in 0..1 chooses which pixels get the colour (no blending, stays crisp)
  function ditherRect(ctx, x, y, w, h, c, alpha) {
    x = R(x); y = R(y); ctx.fillStyle = c;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (bayer(x + i, y + j) < alpha) ctx.fillRect(x + i, y + j, 1, 1);
  }
  function ditherDisc(ctx, cx, cy, r, c, alpha, soft = 0) {
    cx = R(cx); cy = R(cy); ctx.fillStyle = c; const ir = Math.ceil(r);
    for (let dy = -ir; dy <= ir; dy++) for (let dx = -ir; dx <= ir; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy) / (r + 0.5); if (d > 1) continue;
      const a = soft ? alpha * (1 - smooth(1 - soft, 1, d)) : alpha;
      if (bayer(cx + dx, cy + dy) < a) ctx.fillRect(cx + dx, cy + dy, 1, 1);
    }
  }
  // per-pixel painter for static areas: fn(x,y) → '#rrggbb' | null (null keeps what is there)
  function paint(ctx, x, y, w, h, fn) {
    x = R(x); y = R(y); w = R(w); h = R(h);
    const cx = Math.max(0, x), cy = Math.max(0, y), cw = Math.min(ctx.canvas.width, x + w) - cx, ch = Math.min(ctx.canvas.height, y + h) - cy;
    if (cw <= 0 || ch <= 0) return;
    const img = ctx.getImageData(cx, cy, cw, ch), d = img.data;
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const c = fn(cx + i, cy + j); if (!c) continue; const v = rgb(c), k = (j * cw + i) * 4;
      d[k] = v[0]; d[k + 1] = v[1]; d[k + 2] = v[2]; d[k + 3] = 255;
    }
    ctx.putImageData(img, cx, cy);
  }
  // vertical dithered gradient through a list of colours (top → bottom)
  function gradient(ctx, x, y, w, h, cols) { paint(ctx, x, y, w, h, (px_, py_) => ramp(cols, (py_ - y) / Math.max(1, h - 1), px_, py_)); }
  // character-grid sprite: rows of strings, map { char: colour }, '.' or ' ' is transparent
  function sprite(ctx, x, y, rows, map, flip = false) {
    x = R(x); y = R(y);
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      for (let i = 0; i < row.length; i++) {
        const ch = row[i]; if (ch === '.' || ch === ' ') continue; const c = map[ch]; if (!c) continue;
        ctx.fillStyle = c; ctx.fillRect(flip ? x + row.length - 1 - i : x + i, y + j, 1, 1);
      }
    }
  }

  // ---------- the diorama ----------
  function create(o = {}) {
    const W = o.W || 480, H = o.H || 270, L = o.loop || 60, FPS = o.fps || 30, SCALE = o.scale || 4;
    const q = new URLSearchParams(root.location ? root.location.search : '');
    const off = new Set((q.get('off') || '').split(',').filter(Boolean));
    const pass = q.get('pass') || '';
    const canvas = o.canvas || document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.imageSmoothingEnabled = false;

    const D = {
      W, H, LOOP: L, FPS, SCALE, ctx, canvas, q, off, seed: o.seed || 1,
      bg: o.bg || '#000000',
      lightGain: o.lightGain ?? 2.2,      // how much a light brightens the surface under it
      lightStyle: o.lightStyle || 'bands', // 'bands' = hard concentric steps (classic pixel art) · 'dither' = Bayer-dithered steps
      vignette: o.vignette ?? 0.35,       // 0 = none
      flashColor: o.flashColor || '#b9c4ff',
      layers: [], lights: [], flashes: [], posts: [],
    };

    // ----- loop-safe time -----
    D.cycles = period => Math.max(1, Math.round(L / period));          // whole repeats per loop
    D.phase = (t, period, offset = 0) => frac(t / L * D.cycles(period) + offset);  // 0..1 sawtooth
    D.wave = (t, period, offset = 0) => Math.sin(2 * Math.PI * (t / L * D.cycles(period) + offset)); // -1..1
    // smooth periodic value noise in 0..1; hz is snapped so that hz·LOOP is a whole number
    D.noise = (seed, t, hz = 1) => {
      const n = Math.max(1, Math.round(hz * L)), u = t / L * n, i = Math.floor(u), f = u - i;
      const a = hash(((i % n) + n) % n, seed), b = hash((((i + 1) % n) + n) % n, seed), s = f * f * (3 - 2 * f);
      return a + (b - a) * s;
    };
    // firelight: ~1 ± amt, three octaves of noise
    D.flicker = (seed, t, amt = 0.25, hz = 6) => {
      const v = 0.55 * D.noise(seed, t, hz) + 0.3 * D.noise(seed + 101, t, hz * 2.7) + 0.15 * D.noise(seed + 202, t, hz * 6.1);
      return 1 + amt * (2 * v - 1) * 1.6;
    };
    // stepped time for sprite animation at a lower frame rate (pixel-art "on twos")
    D.step = (t, fps) => Math.floor(t * fps) / fps;

    // ----- layers -----
    // fn(ctx, t, D). static layers are drawn once and cached; consecutive static layers share one cache.
    D.add = (fn, opt = {}) => { D.layers.push({ fn, static: !!opt.static, name: opt.name || '' }); return D; };
    // light: { x, y, r, color, power=1, halo=.35, surface=1, levels=6, falloff=2, style, cone:{ dir, spread, soft, floor } }
    // halo = light added in the air (glow), surface = how much it brightens what is under it. levels = number of steps.
    // x, y, r, power may be functions of t.
    D.light = l => { D.lights.push(Object.assign({ power: 1, halo: 0.35, surface: 1, levels: 6, falloff: 2 }, l)); return l; };
    D.flash = fn => { D.flashes.push(fn); return D; };      // fn(t) → 0..1, brightens everything (lightning)
    D.post = fn => { D.posts.push(fn); return D; };          // fn(imageData, t, D) after lighting

    // ----- particles -----
    // n particles, each repeating with its own period (snapped to the loop). draw(ctx, p, age, k, t) with k = age/life.
    // p.r1..r4 are fixed per particle, p.h(j) is random per particle *per repeat* (still periodic).
    D.particles = o2 => {
      const r = rng(o2.seed || 1), parts = [];
      for (let i = 0; i < o2.n; i++) {
        const per = Array.isArray(o2.period) ? r.range(o2.period[0], o2.period[1]) : o2.period;
        const cyc = D.cycles(per);
        parts.push({ i, cyc, T: L / cyc, off: r(), r1: r(), r2: r(), r3: r(), r4: r(), cycle: 0, h: null });
      }
      return (ctx, t) => {
        for (const p of parts) {
          const u = t / p.T + p.off, k = Math.floor(u), age = (u - k) * p.T;
          const life = Math.min(p.T, typeof o2.life === 'function' ? o2.life(p) : (o2.life ?? p.T));
          if (age > life) continue;
          p.cycle = ((k % p.cyc) + p.cyc) % p.cyc;
          p.h = j => hash(p.i * 131 + p.cycle * 7919 + j * 31, o2.seed || 1);
          o2.draw(ctx, p, age, age / life, t);
        }
      };
    };

    // ----- render -----
    let groups = null;
    function build() {
      groups = [];
      for (const l of D.layers) {
        if (l.name && off.has(l.name)) continue;
        const last = groups[groups.length - 1];
        if (l.static && last && last.static) last.fns.push(l.fn);
        else groups.push({ static: l.static, fns: [l.fn], cache: null });
      }
    }
    const S = new Float32Array(W * H * 3), A = new Float32Array(W * H * 3);
    const val = (v, t) => typeof v === 'function' ? v(t) : v;

    function lighting(t) {
      const img = ctx.getImageData(0, 0, W, H), d = img.data;
      S.fill(0); A.fill(0);
      const useLights = !off.has('light');
      if (useLights) for (const l of D.lights) {
        const p = val(l.power, t); if (!(p > 0.002)) continue;
        const x0 = val(l.x, t), y0 = val(l.y, t), r = val(l.r, t), r2 = r * r;
        const c = rgb(l.color), cr = c[0] / 255, cg = c[1] / 255, cb = c[2] / 255, lv = l.levels;
        const xa = Math.max(0, Math.floor(x0 - r)), xb = Math.min(W - 1, Math.ceil(x0 + r));
        const ya = Math.max(0, Math.floor(y0 - r)), yb = Math.min(H - 1, Math.ceil(y0 + r));
        const cone = l.cone, dith = (l.style || D.lightStyle) === 'dither';
        for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
          const dx = x + 0.5 - x0, dy = y + 0.5 - y0, dd = dx * dx + dy * dy; if (dd >= r2) continue;
          let f = Math.pow(1 - Math.sqrt(dd) / r, l.falloff) * p;
          if (cone) {
            let da = Math.abs(Math.atan2(dy, dx) - cone.dir); if (da > Math.PI) da = 2 * Math.PI - da;
            // inside the beam: full; past its edge: fades over `soft` radians down to `floor` (a little light all around)
            if (da > cone.spread) f *= Math.max(cone.floor || 0, 1 - (da - cone.spread) / (cone.soft || 0.3));
          }
          // surface light in `levels` steps (bands or dithered); the glow in the air in fine dithered steps, so it stays soft
          // steps are even in sqrt(f): small steps at the faint edge (no hard ring), bigger ones near the source
          const bz = bayer(x, y), sv = Math.floor(Math.sqrt(f) * lv + (dith ? bz : 0.5)) / lv, qv = sv * sv, qh = Math.floor(f * 24 + bz) / 24;
          if (qv <= 0 && qh <= 0) continue;
          const i = (y * W + x) * 3, s = qv * l.surface, h = qh * l.halo;
          S[i] += s * cr; S[i + 1] += s * cg; S[i + 2] += s * cb;
          A[i] += h * cr; A[i + 1] += h * cg; A[i + 2] += h * cb;
        }
      }
      let fl = 0; if (!off.has('flash')) for (const f of D.flashes) fl = Math.max(fl, f(t));
      const fc = rgb(D.flashColor), g = D.lightGain, vig = off.has('vignette') ? 0 : D.vignette;
      if (pass === 'light') {
        for (let i = 0, j = 0; i < d.length; i += 4, j += 3) { d[i] = clamp(A[j] * 255 + S[j] * 90, 0, 255); d[i + 1] = clamp(A[j + 1] * 255 + S[j + 1] * 90, 0, 255); d[i + 2] = clamp(A[j + 2] * 255 + S[j + 2] * 90, 0, 255); d[i + 3] = 255; }
        ctx.putImageData(img, 0, 0); return;
      }
      for (let y = 0; y < H; y++) {
        const ey = Math.abs(y + 0.5 - H / 2) / (H / 2);
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4, j = (y * W + x) * 3;
          let r = d[i], gg = d[i + 1], b = d[i + 2];
          r = r * (1 + S[j] * g) + A[j] * 255; gg = gg * (1 + S[j + 1] * g) + A[j + 1] * 255; b = b * (1 + S[j + 2] * g) + A[j + 2] * 255;
          if (fl > 0) { r += fl * (fc[0] * 0.22 + r * 0.6); gg += fl * (fc[1] * 0.22 + gg * 0.6); b += fl * (fc[2] * 0.22 + b * 0.6); }
          if (vig > 0) {
            const ex = Math.abs(x + 0.5 - W / 2) / (W / 2), e = smooth(0.55, 1.35, Math.sqrt(ex * ex * 0.8 + ey * ey));
            const m = Math.floor(e * vig * 8 + bayer(x, y)) / 8; r *= 1 - m; gg *= 1 - m; b *= 1 - m;
          }
          d[i] = r > 255 ? 255 : r; d[i + 1] = gg > 255 ? 255 : gg; d[i + 2] = b > 255 ? 255 : b; d[i + 3] = 255;
        }
      }
      for (const p of D.posts) p(img, t, D);
      ctx.putImageData(img, 0, 0);
    }

    D.render = t => {
      if (!groups) build();
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = D.bg; ctx.fillRect(0, 0, W, H);
      for (const gr of groups) {
        if (gr.static) {
          if (!gr.cache) {
            const c = document.createElement('canvas'); c.width = W; c.height = H;
            const cx = c.getContext('2d', { willReadFrequently: true }); cx.imageSmoothingEnabled = false;
            for (const fn of gr.fns) fn(cx, 0, D);
            gr.cache = c;
          }
          ctx.drawImage(gr.cache, 0, 0);
        } else for (const fn of gr.fns) fn(ctx, t, D);
      }
      if (pass !== 'base' && !off.has('post')) lighting(t);
    };

    // ----- page contract: seek(t), DURATION, FPS, PIXEL, __ready; live loop unless ?render=1 -----
    D.start = (mount = document.body) => {
      if (!canvas.parentNode) mount.appendChild(canvas);
      const render = q.has('render'), frozen = q.has('t') ? +q.get('t') : null;
      root.DURATION = L; root.FPS = FPS; root.PIXEL = { W, H, scale: SCALE };
      root.seek = t => D.render(t);
      const fit = () => {
        if (render) { canvas.style.cssText = `width:${W}px;height:${H}px;image-rendering:pixelated`; return; }
        const vw = root.innerWidth, vh = root.innerHeight, k = Math.min(vw / W, vh / H);
        const ki = k >= 1 ? Math.floor(k) : k, s = k - ki < 0.15 * k ? ki : k;   // integer scale when it nearly fits
        canvas.style.cssText = `position:absolute;left:50%;top:50%;width:${Math.floor(W * s)}px;height:${Math.floor(H * s)}px;transform:translate(-50%,-50%);image-rendering:pixelated;image-rendering:crisp-edges`;
      };
      fit(); root.addEventListener('resize', fit);
      D.render(frozen ?? 0);
      root.__ready = true;
      if (render || frozen !== null) return;
      let paused = false, t0 = performance.now(), tp = 0, last = -1;
      const toggle = () => { paused = !paused; if (!paused) t0 = performance.now() - tp * 1000; };
      root.addEventListener('click', toggle);
      root.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); toggle(); } });
      const tick = now => {
        if (!paused) {
          tp = ((now - t0) / 1000) % L;
          const f = Math.floor(tp * FPS);           // draw on the video's frame grid, like the MP4
          if (f !== last) { last = f; D.render(f / FPS); }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    return D;
  }

  root.PD = {
    create, rng, hash, bayer, clamp, lerp, smooth, frac, rgb, toHex, mix, ramp,
    rect, px, line, disc, ellipse, poly, ditherRect, ditherDisc, paint, gradient, sprite,
  };
})(typeof window !== 'undefined' ? window : globalThis);

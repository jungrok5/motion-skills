/* pixel-diorama · lib/kit.js — props for pixel dioramas, drawn in code (no image files). Needs lib/pixel.js first.
   Every prop is K.<name>(D, opts) — it adds its own layers (static where it can) and lights to the diorama D, and returns
   the anchor points other props need (island top, chimney top, branch tips …). Call them back to front.
   Coordinates are canvas pixels (480×270 by default); y of a standing prop is the ground line it stands on. */
(function (root) {
  'use strict';
  const PD = root.PD, K = {};
  const { rng, hash, bayer, clamp, lerp, smooth, ramp, rect, px, line, disc, ellipse, poly, ditherRect, ditherDisc, paint, sprite } = PD;
  const R = Math.round;

  // ---------- palette: cold night against warm pockets of light ----------
  const PAL = K.PAL = {
    sky: ['#06071a', '#0b0d25', '#121433', '#1a1a41', '#24224f', '#2f2a5b', '#3b3366'],
    star: '#d6dcff', starDim: '#6f74ab',
    moon: ['#6f739c', '#9aa0c4', '#c9cee6', '#eef0fa'],
    cloud: ['#15152f', '#1c1c3c', '#25254a', '#302f59', '#3d3a69'],
    hill: ['#0d0c22', '#13122d', '#1a1838', '#221f45'],
    mist: '#3a3a72',
    rock: ['#0e0a12', '#160f19', '#1f1621', '#2a1d2b', '#372635', '#463141'],
    stone: ['#2a2232', '#3a3043', '#4b4055', '#5d5168'],
    grass: ['#0d2526', '#143a37', '#1d5247', '#2a6b55', '#3a8763'],
    water: ['#081420', '#0c2030', '#123044', '#1b445a', '#2b5f75'],
    wood: ['#170f12', '#24171a', '#352321', '#4a3027', '#623f2f', '#7b5238'],
    plaster: ['#262335', '#322e45', '#403a55', '#4e4764'],
    roof: ['#0f1522', '#151e2e', '#1c293b', '#253548', '#2f4357'],
    brick: ['#2e1517', '#47201f', '#5f2c27', '#763a30'],
    warm: ['#8c2412', '#d9471b', '#ff7b25', '#ffae42', '#ffd27a', '#fff1c1'],
    glass: ['#7a2a10', '#c4561a', '#f08a2a', '#ffbb4d', '#ffe08f'],
    cold: ['#0d4c5c', '#168197', '#33c6dc', '#7ff0ff', '#d6fbff'],
    red: ['#3a1016', '#6a1a20', '#9a2529', '#c93a36', '#e8594a'],
    bone: ['#4f4a40', '#8e8672', '#c9c0a8', '#f2ecdc'],
    pumpkin: ['#4a1f0a', '#8a3a0e', '#c95d14', '#f08423', '#ffa940'],
    leaf: ['#7a2e10', '#b8501a', '#e07a26', '#f5a142'],
    rain: ['#4b5793', '#6877b6', '#8e9dd8', '#b9c6f5'],
    snow: ['#3a4670', '#5d6c98', '#8c9cc6', '#bfcdea', '#eef4ff'],
    pine: ['#08151a', '#0d2224', '#143230', '#1d4540'],
    aurora: ['#0f3a46', '#1b6b63', '#2fa37a', '#62d69a', '#b6f5c8'],
    bat: '#07060d', ink: '#07060d',
  };

  // 1D value noise for shapes (not time): smooth, seeded
  const vnoise = (x, seed) => { const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f); return lerp(hash(i, seed), hash(i + 1, seed), s); };
  const fbm = (x, seed) => 0.6 * vnoise(x, seed) + 0.28 * vnoise(x * 2.1, seed + 7) + 0.12 * vnoise(x * 4.3, seed + 13);
  K.vnoise = vnoise; K.fbm = fbm;

  // ---------- sky ----------
  K.sky = (D, o = {}) => {
    const cols = o.cols || PAL.sky, y = o.y || 0, h = o.h || D.H;
    D.add(ctx => PD.gradient(ctx, 0, y, D.W, h, cols), { static: true, name: 'sky' });
  };

  K.stars = (D, o = {}) => {
    const r = rng(o.seed || 11), n = o.n || 80, a = o.area || [0, 0, D.W, D.H * 0.5];
    const stars = Array.from({ length: n }, () => ({ x: R(a[0] + r() * a[2]), y: R(a[1] + Math.pow(r(), 1.4) * a[3]), big: r() < 0.12, hz: r.range(0.15, 0.9), s: r.int(1, 9999) }));
    D.add((ctx, t) => {
      for (const s of stars) {
        const v = D.noise(s.s, t, s.hz);
        if (v < 0.25) continue;
        px(ctx, s.x, s.y, v > 0.6 ? PAL.star : PAL.starDim);
        if (s.big && v > 0.78) { px(ctx, s.x - 1, s.y, PAL.starDim); px(ctx, s.x + 1, s.y, PAL.starDim); px(ctx, s.x, s.y - 1, PAL.starDim); px(ctx, s.x, s.y + 1, PAL.starDim); }
      }
    }, { name: 'stars' });
  };

  K.moon = (D, o = {}) => {
    const x = o.x ?? D.W * 0.78, y = o.y ?? 46, r = o.r || 16, seed = o.seed || 5, cols = o.cols || PAL.moon;
    D.add(ctx => {
      paint(ctx, x - r - 1, y - r - 1, 2 * r + 3, 2 * r + 3, (px_, py_) => {
        const dx = px_ + 0.5 - x, dy = py_ + 0.5 - y, d = Math.sqrt(dx * dx + dy * dy) / (r + 0.5);
        if (d > 1) return null;
        // lit from the upper left, a soft terminator to the lower right
        let v = 0.8 - 0.45 * smooth(0.2, 1, (dx * 0.6 + dy * 0.5) / r + 0.35) - 0.12 * d * d;
        // craters
        const cr = vnoise(px_ * 0.35, seed) * vnoise(py_ * 0.35, seed + 3);
        if (cr > 0.36) v -= 0.25;
        return ramp(cols, v, px_, py_);
      });
    }, { static: true, name: 'moon' });
    if (o.glow !== 0) D.light({ x: x, y: y, r: r * (o.glowR || 4), color: o.glowColor || '#6f80ff', power: o.glow ?? 0.8, surface: 0.15, halo: 0.16, levels: 5, falloff: 2.2 });
    return { x, y, r };
  };

  // clouds: baked once into sprites, drawn with a slow sway (one period = the whole loop, so it always loops)
  K.clouds = (D, o = {}) => {
    const r = rng(o.seed || 21), n = o.n || 5, cols = o.cols || PAL.cloud, yr = o.y || [20, 90], wr = o.w || [50, 120];
    const sway = o.sway ?? 10, list = [];
    for (let i = 0; i < n; i++) {
      const w = R(r.range(wr[0], wr[1])), h = R(w * r.range(0.18, 0.28)) + 4;
      const c = document.createElement('canvas'); c.width = w + 4; c.height = h + 4;
      const cx = c.getContext('2d', { willReadFrequently: true });
      const puffs = []; const k = Math.max(3, R(w / 9));
      for (let j = 0; j < k; j++) {
        const u = (j + 0.5) / k, pr = (h - 2) * (0.25 + 0.75 * Math.pow(Math.sin(Math.PI * u), 0.9)) * r.range(0.35, 1);
        puffs.push([2 + u * w + r.range(-3, 3), h + 1 - pr * 0.75, pr]);
      }
      const seed = r.int(1, 9999), base = h + 1 - R(h * 0.12);
      paint(cx, 0, 0, w + 4, h + 4, (X, Y) => {
        if (Y > base) return null;
        let inside = false; for (const p of puffs) { const dx = (X + 0.5 - p[0]) / (p[2] * 1.15), dy = (Y + 0.5 - p[1]) / p[2]; if (dx * dx + dy * dy < 1) { inside = true; break; } }
        if (!inside) return null;
        // light from above, darker belly, a lit rim row along the bumpy top
        let top = true; for (const p of puffs) { const dx = (X + 0.5 - p[0]) / (p[2] * 1.15), dy = (Y - 1.5 - p[1]) / p[2]; if (dx * dx + dy * dy < 1) { top = false; break; } }
        const v = top ? 0.95 : 0.78 - (Y / (base + 1)) * 0.6 + (fbm(X * 0.15, seed) - 0.5) * 0.25;
        return ramp(cols, clamp(v), X, Y);
      });
      list.push({ c, x: r.range(-30, D.W - 20), y: R(r.range(yr[0], yr[1])), ph: r(), amp: sway * r.range(0.5, 1.2) });
    }
    D.add((ctx, t) => { for (const cl of list) ctx.drawImage(cl.c, R(cl.x + cl.amp * D.wave(t, D.LOOP, cl.ph)), cl.y); }, { name: o.name || 'clouds' });
  };

  K.hills = (D, o = {}) => {
    const y = o.y ?? D.H * 0.72, amp = o.amp ?? 16, seed = o.seed || 31, cols = o.cols || PAL.hill.slice(1, 3), freq = o.freq || 0.018;
    D.add(ctx => {
      paint(ctx, 0, y - amp - 2, D.W, D.H - (y - amp - 2), (X, Y) => {
        const top = y - amp * fbm(X * freq, seed);
        if (Y < top) return null;
        return Y < top + 1.5 ? cols[cols.length - 1] : cols[0];
      });
    }, { static: true, name: 'hills' });
  };

  // a band of drifting dithered mist
  K.mist = (D, o = {}) => {
    const y = o.y ?? D.H * 0.8, h = o.h || 24, seed = o.seed || 41, col = o.color || PAL.mist, alpha = o.alpha ?? 0.35, sway = o.sway ?? 12;
    D.add((ctx, t) => {
      const sh = sway * D.wave(t, D.LOOP, 0.2);
      ctx.fillStyle = col;
      for (let j = 0; j < h; j++) {
        const vy = Math.sin(Math.PI * (j + 0.5) / h);
        for (let X = 0; X < D.W; X++) {
          const a = alpha * vy * (0.35 + 0.9 * fbm((X + sh) * 0.03 + j * 0.05, seed));
          if (bayer(X, y + j) < a) ctx.fillRect(X, y + j, 1, 1);
        }
      }
    }, { name: o.name || 'mist' });
  };

  // lightning: flashes (lights up the whole frame in the post pass) + a bolt drawn where this layer sits (put it behind hills)
  K.lightning = (D, o = {}) => {
    const times = o.times || [D.LOOP * 0.37], seed = o.seed || 51, xr = o.x || [D.W * 0.1, D.W * 0.5], top = o.top ?? 30, bottom = o.bottom ?? D.H * 0.7;
    const env = tt => tt < 0 ? 0 : tt < 0.07 ? 1 : tt < 0.13 ? 0.2 : tt < 0.21 ? 0.85 : tt < 1.1 ? 0.85 * Math.exp(-(tt - 0.21) * 5) : 0;
    const strength = o.strength ?? 0.4;
    const at = t => { let best = 0, idx = -1; for (let i = 0; i < times.length; i++) { const tt = ((t - times[i]) % D.LOOP + D.LOOP) % D.LOOP; const e = env(tt); if (e > best) { best = e; idx = i; } } return [best, idx]; };
    D.flash(t => at(t)[0] * strength);
    const bolts = times.map((_, i) => {
      const r = rng(seed + i * 17), pts = []; let x = r.range(xr[0], xr[1]), y = top; pts.push([x, y]);
      while (y < bottom) { y += r.range(4, 9); x += r.range(-6, 6); pts.push([x, y]); }
      const br = []; for (let k = 2; k < pts.length - 2; k += r.int(2, 4)) { if (r() < 0.6) { let bx = pts[k][0], by = pts[k][1]; const s = r.sign(); const b = [[bx, by]]; for (let m = 0; m < r.int(2, 4); m++) { bx += s * r.range(3, 7); by += r.range(3, 7); b.push([bx, by]); } br.push(b); } }
      return { pts, br };
    });
    D.add((ctx, t) => {
      const [e, i] = at(t); if (e < 0.5 || i < 0) return;
      const b = bolts[i], drawPath = (p, c) => { for (let k = 0; k + 1 < p.length; k++) line(ctx, p[k][0], p[k][1], p[k + 1][0], p[k + 1][1], c); };
      for (const p of b.br) drawPath(p, '#8f93d8');
      drawPath(b.pts.map(q => [q[0] + 1, q[1]]), '#8f93d8');
      drawPath(b.pts, '#f4f2ff');
    }, { name: 'lightning' });
  };

  // ---------- the floating island ----------
  K.island = (D, o = {}) => {
    const x0 = o.x0 ?? 110, x1 = o.x1 ?? 370, y = o.y ?? 168, depth = o.depth ?? 80, seed = o.seed || 61;
    const tip = o.tip ?? 0.55, rocks = o.rock || PAL.rock, grass = o.grass || PAL.grass, stones = o.stone || PAL.stone;
    const W = x1 - x0;
    const bottom = X => {
      const u = (X - x0) / W; if (u < 0 || u > 1) return y;
      const s = u < tip ? Math.pow(u / tip, 0.7) : Math.pow((1 - u) / (1 - tip), 0.9);
      const jag = (fbm(X * 0.08, seed) - 0.5) * 10 + (hash(Math.floor(X / 3), seed) - 0.5) * 3;
      return y + 3 + Math.max(0, depth * Math.pow(s, 1.1) + jag * s);
    };
    D.add(ctx => {
      paint(ctx, x0 - 2, y, W + 4, depth + 16, (X, Y) => {
        if (X < x0 || X > x1) return null;
        const b = bottom(X); if (Y > b) return null;
        const u = (X - x0) / W, dz = (Y - y) / depth;
        // darker downward and toward the left (the warm light sits on the right side of the top)
        let v = 0.78 - dz * 0.75 + (u - 0.5) * 0.18;
        v += (fbm(Y * 0.25 + X * 0.02, seed + 5) - 0.5) * 0.35;              // strata
        if (b - Y < 2) v -= 0.25;                                              // dark lip under the edge
        return ramp(rocks, clamp(v), X, Y);
      });
      // embedded stones
      const r = rng(seed + 1);
      for (let i = 0; i < (o.stones ?? 34); i++) {
        const X = r.range(x0 + 8, x1 - 8), b = bottom(X), Y = r.range(y + 8, b - 5); if (Y > b - 4) continue;
        const rx = r.int(1, 3), ry = Math.max(1, rx - 1);
        ellipse(ctx, X, Y, rx, ry, stones[0]); ellipse(ctx, X, Y - 1, Math.max(1, rx - 1), Math.max(0, ry - 1), stones[1]);
        if (rx > 1) px(ctx, X - rx + 1, Y - ry, stones[2]);
      }
      // grass lip on top + moss edge hanging over
      paint(ctx, x0 - 1, y - 3, W + 3, 8, (X, Y) => {
        if (X < x0 || X > x1) return null;
        const tuft = hash(X, seed + 9) < 0.35 ? 1 : 0, tuft2 = hash(X, seed + 10) < 0.12 ? 1 : 0;
        if (Y < y - tuft - tuft2) return null;
        if (Y <= y) return ramp(grass, 0.62 + (hash(X, seed + 3) - 0.5) * 0.4, X, Y);
        if (Y <= y + 2) return ramp(grass, 0.35 - (Y - y) * 0.1, X, Y);
        const drip = hash(X, seed + 4) < 0.25 ? 2 : 0;
        if (Y <= y + 2 + drip) return grass[1];
        return null;
      });
    }, { static: true, name: 'island' });
    return { x0, x1, y, depth, bottom };
  };

  // roots hanging under the island, some with glowing tips
  K.roots = (D, isl, o = {}) => {
    const r = rng(o.seed || 71), n = o.n || 14, glow = o.glow ?? 0.4, col = o.color || PAL.rock[3];
    const roots = [];
    for (let i = 0; i < n; i++) {
      const X = R(r.range(isl.x0 + 12, isl.x1 - 12)), b = isl.bottom(X);
      roots.push({ x: X, y: R(b - 1), len: R(r.range(5, 20)), bend: r.range(-0.15, 0.15), ph: r(), glow: r() < glow });
    }
    const tip = (rt, t) => { const s = D.wave(t, 9, rt.ph); return [rt.x + rt.bend * rt.len + s * rt.len * 0.08, rt.y + rt.len]; };
    D.add((ctx, t) => {
      for (const rt of roots) {
        const [tx, ty] = tip(rt, t); line(ctx, rt.x, rt.y, rt.x + rt.bend * rt.len * 0.4, rt.y + rt.len * 0.5, col); line(ctx, rt.x + rt.bend * rt.len * 0.4, rt.y + rt.len * 0.5, tx, ty, col);
        if (rt.glow) { const v = 0.5 + 0.5 * D.wave(t, 4, rt.ph); px(ctx, tx, ty + 1, v > 0.4 ? PAL.cold[3] : PAL.cold[2]); }
      }
    }, { name: 'roots' });
    for (const rt of roots) if (rt.glow) D.light({ x: t => tip(rt, t)[0], y: t => tip(rt, t)[1] + 1, r: 9, color: PAL.cold[3], power: t => 0.55 + 0.35 * D.wave(t, 4, rt.ph), surface: 0.6, halo: 0.45, levels: 4 });
    return roots;
  };

  // glowing crystals set in rock
  K.crystal = (D, o = {}) => {
    const x = o.x, y = o.y, h = o.h || 8, seed = o.seed || 81, cols = o.cols || PAL.cold, r = rng(seed);
    const shards = Array.from({ length: o.n || 3 }, (_, i) => ({ dx: (i - 1) * 3 + r.int(-1, 1), hh: R(h * r.range(0.55, 1)), lean: r.range(-0.4, 0.4) }));
    D.add(ctx => {
      for (const s of shards) {
        const bx = x + s.dx, tx = bx + s.lean * s.hh;
        poly(ctx, [[bx - 1.5, y], [bx + 1.5, y], [tx + 0.5, y - s.hh], [tx - 0.5, y - s.hh]], cols[1]);
        line(ctx, bx, y - 1, tx, y - s.hh + 1, cols[3]);
        px(ctx, tx, y - s.hh, cols[4]);
      }
    }, { static: true, name: 'crystal' });
    const ph = r();                                   // fixed once: anything random inside power(t) would break the loop
    D.light({ x, y: y - h / 2, r: o.r || 22, color: cols[2], power: t => 0.75 + 0.25 * D.wave(t, o.pulse || 6, ph), surface: 0.9, halo: 0.4, levels: 5 });
  };

  // ---------- water ----------
  K.pond = (D, o = {}) => {
    const x0 = o.x0, x1 = o.x1, y = o.y, depth = o.depth || 6, seed = o.seed || 91, cols = o.cols || PAL.water;
    D.add(ctx => {
      paint(ctx, x0, y, x1 - x0, depth, (X, Y) => {
        const e = Math.min(X - x0, x1 - 1 - X); if (Y - y > depth - 1 - (e < 2 ? 2 - e : 0)) return null;
        let v = 0.55 - (Y - y) / depth * 0.45; if (Y === y) v = 0.9; if (hash(X * 7 + Y, seed) < 0.06) v += 0.2;
        return ramp(cols, v, X, Y);
      });
    }, { static: true, name: 'pond' });
    // rain rings
    D.add(D.particles({
      n: o.rings || 8, seed: seed + 1, period: [0.7, 1.6], life: 0.45,
      draw: (ctx, p, age, k) => {
        const X = R(lerp(x0 + 3, x1 - 3, p.h(1))), w = R(1 + k * 5), c = k < 0.5 ? cols[4] : cols[3];
        if (k < 0.2) px(ctx, X, y, cols[4]);
        else { px(ctx, X - w, y, c); px(ctx, X + w, y, c); if (k < 0.7) { px(ctx, X - w + 1, y + 1, cols[3]); px(ctx, X + w - 1, y + 1, cols[3]); } }
      },
    }), { name: 'ripples' });
  };

  K.waterfall = (D, o = {}) => {
    const x = o.x, y0 = o.y0, y1 = o.y1, w = o.w || 3, seed = o.seed || 95, cols = o.cols || PAL.water, len = 24, per = o.period || 1.2;
    D.add((ctx, t) => {
      const off = D.phase(t, per) * len;
      for (let c = 0; c < w; c++) for (let Y = y0; Y < y1; Y++) {
        const k = (Y - y0) / (y1 - y0);
        if (bayer(x + c, Y) > 1.1 - k * 1.05) continue;                    // thins out as it falls
        const v = hash(Math.floor(((Y - off) % len + len) % len / 3) + c * 57, seed);
        px(ctx, x + c, Y, v > 0.6 ? cols[4] : v > 0.25 ? cols[3] : cols[2]);
      }
    }, { name: 'waterfall' });
  };

  // ---------- buildings ----------
  K.house = (D, o = {}) => {
    const x = o.x, y = o.y, w = o.w || 64, h1 = o.h1 || 20, h2 = o.h2 || 18, roofH = o.roofH || 22, seed = o.seed || 101;
    const top = y - h1 - h2, chX = R(x + w * 0.7), chTop = top - roofH - 2;
    const winA = o.windows || [
      { x: x + 8, y: y - h1 + 5, w: 9, h: 9 }, { x: x + w - 17, y: y - h1 + 5, w: 9, h: 9 },
      { x: x + 10, y: top + 5, w: 10, h: 10 }, { x: x + w - 20, y: top + 5, w: 10, h: 10 },
    ];
    const door = { x: x + R(w / 2) - 4, y: y - 14, w: 8, h: 14 };
    D.add(ctx => {
      // chimney (behind the roof)
      rect(ctx, chX, chTop, 7, roofH, PAL.brick[1]);
      for (let j = 0; j < roofH; j += 3) for (let i = (j / 3) % 2 ? 0 : 2; i < 7; i += 4) rect(ctx, chX + i, chTop + j, 2, 1, PAL.brick[2]);
      rect(ctx, chX - 1, chTop - 2, 9, 2, PAL.stone[1]); rect(ctx, chX - 1, chTop - 2, 9, 1, PAL.stone[2]);
      // ground floor: planks
      paint(ctx, x, y - h1, w, h1, (X, Y) => ramp(PAL.wood, 0.42 + ((Y - (y - h1)) % 4 === 0 ? -0.2 : 0) + (hash(Math.floor((X + (Math.floor(Y / 4) * 7)) / 11), seed) - 0.5) * 0.2, X, Y));
      // upper floor: plaster with timber frame, overhanging by 2
      paint(ctx, x - 2, top, w + 4, h2, (X, Y) => ramp(PAL.plaster, 0.5 + (hash(X * 3 + Y * 5, seed) - 0.5) * 0.25, X, Y));
      const tim = PAL.wood[1];
      rect(ctx, x - 2, top, w + 4, 2, tim); rect(ctx, x - 2, top + h2 - 2, w + 4, 2, tim);
      for (const tx of [x - 2, x + R(w / 2) - 1, x + w]) rect(ctx, tx, top, 2, h2, tim);
      line(ctx, x + 24, top + 2, x + R(w / 2) - 1, top + h2 - 3, tim); line(ctx, x + w - 24, top + 2, x + R(w / 2) + 1, top + h2 - 3, tim);
      // roof: gable with shingle rows
      const rl = x - 7, rr = x + w + 7, apex = [x + w / 2, top - roofH];
      poly(ctx, [[rl, top + 1], [rr, top + 1], [apex[0] + 3, apex[1]], [apex[0] - 3, apex[1]]], PAL.roof[1]);
      for (let j = 0; j < roofH; j += 3) {
        const yy = top - j, k = j / roofH, half = lerp((rr - rl) / 2, 3, k);
        for (let X = R(apex[0] - half); X < R(apex[0] + half); X++) {
          const s = ((X + (j % 6 ? 2 : 0)) % 4 === 0);
          px(ctx, X, yy, s ? PAL.roof[0] : PAL.roof[3]); if (!s && hash(X, j + seed) < 0.5) px(ctx, X, yy - 1, PAL.roof[2]);
        }
      }
      line(ctx, rl, top + 1, apex[0] - 3, apex[1], PAL.roof[4]); line(ctx, apex[0] - 3, apex[1], apex[0] + 3, apex[1], PAL.roof[4]);
      line(ctx, rr, top + 1, apex[0] + 3, apex[1], PAL.roof[2]);
      if (o.snow) {                                                        // snow on the slopes, the eaves and the chimney cap
        const sn = PAL.snow;
        for (let k = 0; k < 3; k++) { line(ctx, rl + k, top + 1 - k, apex[0] - 3, apex[1] + k * 0.3, k ? sn[2] : sn[4]); line(ctx, rr - k, top + 1 - k, apex[0] + 3, apex[1] + k * 0.3, k ? sn[1] : sn[3]); }
        rect(ctx, apex[0] - 3, apex[1] - 1, 7, 2, sn[4]);
        for (let X = R(rl); X <= R(rr); X++) { if (hash(X, seed + 40) < 0.5) px(ctx, X, top + 2, sn[3]); if (hash(X, seed + 41) < 0.18) line(ctx, X, top + 2, X, top + 2 + R(1 + 2 * hash(X, seed + 42)), sn[2]); }
        rect(ctx, chX - 1, chTop - 3, 9, 2, sn[4]);
      }
      // attic round window
      disc(ctx, apex[0], top - roofH * 0.45, 2, PAL.wood[0]); px(ctx, apex[0] - 1, top - roofH * 0.45 - 1, PAL.cold[1]);
      // windows: frame, glowing glass brighter in the middle, mullions, sill
      for (const wn of winA) {
        rect(ctx, wn.x - 1, wn.y - 1, wn.w + 2, wn.h + 2, PAL.wood[0]);
        paint(ctx, wn.x, wn.y, wn.w, wn.h, (X, Y) => { const dx = (X + 0.5 - wn.x - wn.w / 2) / wn.w, dy = (Y + 0.5 - wn.y - wn.h * 0.55) / wn.h; return ramp(PAL.glass, 1 - Math.sqrt(dx * dx + dy * dy) * 1.25, X, Y); });
        rect(ctx, wn.x + R(wn.w / 2) - 0, wn.y, 1, wn.h, PAL.wood[1]); rect(ctx, wn.x, wn.y + R(wn.h / 2) - 1, wn.w, 1, PAL.wood[1]);
        rect(ctx, wn.x - 2, wn.y + wn.h + 1, wn.w + 4, 1, o.snow ? PAL.snow[3] : PAL.wood[3]);
      }
      // door, a little open: a warm slit of light on the hinge side
      rect(ctx, door.x - 1, door.y - 1, door.w + 2, door.h + 1, PAL.wood[0]);
      paint(ctx, door.x, door.y, door.w, door.h, (X, Y) => ramp(PAL.wood, 0.55 + ((X - door.x) % 3 === 0 ? -0.2 : 0), X, Y));
      rect(ctx, door.x + door.w - 2, door.y, 2, door.h, PAL.warm[3]); rect(ctx, door.x + door.w - 1, door.y + 2, 1, door.h - 2, PAL.warm[4]);
      px(ctx, door.x + 1, door.y + 7, PAL.warm[3]);
      // step
      rect(ctx, door.x - 2, y - 1, door.w + 4, 1, PAL.stone[2]);
    }, { static: true, name: 'house' });
    winA.forEach((wn, i) => D.light({ x: wn.x + wn.w / 2, y: wn.y + wn.h / 2, r: o.windowR || 30, color: '#ffa43a', power: t => 0.85 * D.flicker(seed + i * 9, t, 0.12, 3), surface: 0.9, halo: 0.2, levels: 6 }));
    D.light({ x: door.x + door.w - 1, y: door.y + door.h - 3, r: 18, color: '#ff9a35', power: 0.8, surface: 1, halo: 0.12, levels: 5 });
    return { chimney: { x: chX + 3, y: chTop - 3 }, door, windows: winA, top: top - roofH, left: x - 7, right: x + w + 7, roofY: top };
  };

  K.smoke = (D, o = {}) => {
    const x = o.x, y = o.y, life = o.life || 5.5, wind = o.wind ?? 3.5, rise = o.rise ?? 7, cols = o.cols || ['#3a3552', '#4f4869', '#6c6488'];
    D.add(D.particles({
      n: o.n || 9, seed: o.seed || 111, period: life * 1.05, life,
      draw: (ctx, p, age, k) => {
        const sx = x + age * wind * (0.8 + 0.4 * p.r1) + Math.sin(age * 1.3 + p.r2 * 6) * (1 + 2 * k), sy = y - age * rise * (0.85 + 0.3 * p.r3);
        const rad = 1 + k * (o.grow ?? 4.5), a = (k < 0.08 ? k / 0.08 : 1) * (1 - k) * (o.alpha ?? 0.9);
        ditherDisc(ctx, sx, sy, rad, cols[0], a, 0.5);
        ditherDisc(ctx, sx - 1, sy - 1, rad * 0.6, cols[1], a * 0.9, 0.6);
        if (k < 0.4) ditherDisc(ctx, sx - 1, sy - 1, rad * 0.3, cols[2], a * 0.8, 0.5);
      },
    }), { name: 'smoke' });
  };

  K.lampPost = (D, o = {}) => {
    const x = o.x, y = o.y, h = o.h || 32;
    D.add(ctx => {
      rect(ctx, x - 1, y - 2, 3, 2, PAL.ink); rect(ctx, x, y - h, 1, h, PAL.wood[1]);
      rect(ctx, x - 2, y - h - 1, 5, 1, PAL.ink); rect(ctx, x - 1, y - h - 5, 3, 4, PAL.warm[4]); px(ctx, x, y - h - 4, PAL.warm[5]);
      rect(ctx, x - 2, y - h - 6, 5, 1, PAL.ink); px(ctx, x, y - h - 7, PAL.ink);
    }, { static: true, name: 'lamp' });
    D.light({ x: x + 0.5, y: y - h - 3, r: o.r || 58, color: o.color || '#ffc46b', power: t => 0.95 * D.flicker(o.seed || 121, t, 0.04, 2), cone: { dir: Math.PI / 2, spread: 0.5, soft: 0.35, floor: 0.3 }, surface: 1, halo: 0.3, levels: 6 });
    D.light({ x: x + 0.5, y: y - h - 3, r: 9, color: '#ffe3a0', power: 0.9, surface: 0, halo: 0.6, levels: 3 });
  };

  // ---------- fire ----------
  K.campfire = (D, o = {}) => {
    const x = o.x, y = o.y, seed = o.seed || 131, size = o.size || 1, W = o.warm || PAL.warm;
    D.add(ctx => {
      for (let i = -4; i <= 4; i += 2) { ellipse(ctx, x + i * 1.2, y - 1, 1, 1, PAL.stone[i % 4 === 0 ? 1 : 2]); }
      line(ctx, x - 5, y - 1, x + 4, y - 3, PAL.wood[3]); line(ctx, x - 4, y - 3, x + 5, y - 1, PAL.wood[4]);
    }, { static: true, name: 'campfire' });
    D.add((ctx, t) => {
      const ts = D.step(t, 12);                                    // flames move on twelves, like hand-drawn fire
      for (let dx = -4; dx <= 4; dx++) {
        const hb = 10 * size * (1 - Math.pow(Math.abs(dx) / 5, 1.6));
        const hh = R(hb * (0.55 + 0.65 * D.noise(seed + dx * 13, ts, 4)));
        for (let j = 0; j < hh; j++) {
          const k = j / Math.max(1, hh), ad = Math.abs(dx);
          const c = ad <= 1 && k < 0.55 ? W[5] : ad <= 2 && k < 0.75 ? W[4] : k < 0.85 ? W[3] : W[2];
          px(ctx, x + dx, y - 3 - j, c);
        }
        // detached licks above the tallest tongues
        if (hh > hb * 0.95 && D.noise(seed + dx * 7 + 3, ts, 6) > 0.6) px(ctx, x + dx, y - 5 - hh, W[1]);
      }
    }, { name: 'fire' });
    D.add(D.particles({
      n: o.sparks || 24, seed: seed + 1, period: [1.0, 1.9], life: p => 0.6 + 0.9 * p.r1,
      draw: (ctx, p, age, k) => {
        const sx = x + (p.h(1) - 0.5) * 6 + age * (o.wind ?? 3) + Math.sin(age * 5 + p.r2 * 6) * 2 * age, sy = y - 6 - age * (16 + 16 * p.r3);
        if (k > 0.7 && bayer(R(sx), R(sy)) < (k - 0.7) * 3) return;
        px(ctx, sx, sy, k < 0.3 ? W[5] : k < 0.6 ? W[3] : W[1]);
      },
    }), { name: 'sparks' });
    D.light({ x: x + 0.5, y: y - 5, r: o.r || 74, color: '#ff9a3a', power: t => 1.05 * D.flicker(seed, t, 0.18, 5), surface: 1, halo: 0.3, levels: 7 });
    D.light({ x: x + 0.5, y: y - 6, r: 12, color: '#ffc46b', power: t => 0.8 * D.flicker(seed + 5, t, 0.25, 7), surface: 0.3, halo: 0.35, levels: 3 });
  };

  // ---------- tree with lanterns ----------
  K.tree = (D, o = {}) => {
    const x = o.x, y = o.y, h = o.h || 46, seed = o.seed || 141, r = rng(seed), col = o.color || PAL.wood[1], hi = o.hi || PAL.wood[2];
    const segs = [], tips = [];
    const grow = (bx, by, ang, len, th, depth) => {
      const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
      segs.push([bx, by, ex, ey, th]);
      if (depth <= 0 || len < 4) { tips.push([ex, ey]); return; }
      const kids = depth > 2 ? 2 : r.int(2, 3);
      for (let k = 0; k < kids; k++) {
        const a = ang + (k - (kids - 1) / 2) * r.range(0.45, 0.8) + r.range(-0.15, 0.15);
        grow(ex, ey, a, len * r.range(0.62, 0.8), Math.max(1, th - 1), depth - 1);
      }
    };
    grow(x, y, -Math.PI / 2 + (o.lean || 0), h * 0.42, o.trunk || 3, o.depth || 5);
    D.add(ctx => {
      for (const s of segs) for (let k = 0; k < s[4]; k++) line(ctx, s[0] + k - (s[4] - 1) / 2, s[1], s[2] + k - (s[4] - 1) / 2, s[3], k === 0 && s[4] > 1 ? hi : col);
      rect(ctx, x - 3, y - 1, 7, 1, col);                                          // root flare
      if (o.leaves !== false) for (const tp of tips) if (r() < 0.65) { px(ctx, tp[0], tp[1], r.pick(PAL.leaf)); if (r() < 0.5) px(ctx, tp[0] + r.sign(), tp[1] + 1, r.pick(PAL.leaf)); }
    }, { static: true, name: 'tree' });
    // lanterns hang from the longer horizontal branches
    const anchors = segs.filter(s => s[4] <= 2 && Math.abs(s[3] - s[1]) < Math.abs(s[2] - s[0]) * 1.3).map(s => [s[2], s[3]]).filter(a => a[1] < y - h * 0.35);
    const lan = [], nL = o.lanterns ?? 3, rl = rng(seed + 3);
    for (let i = 0; i < nL && anchors.length; i++) { const a = anchors.splice(rl.int(0, anchors.length - 1), 1)[0]; lan.push({ ax: R(a[0]), ay: R(a[1]), len: rl.int(5, 9), ph: rl(), per: rl.range(5, 8) }); }
    const pos = (l, t) => { const th = 0.18 * D.wave(t, l.per, l.ph); return [l.ax + Math.sin(th) * l.len, l.ay + Math.cos(th) * l.len]; };
    D.add((ctx, t) => {
      for (const l of lan) {
        const [lx, ly] = pos(l, t); line(ctx, l.ax, l.ay, lx, ly, PAL.ink);
        sprite(ctx, lx - 2, ly, ['.kkk.', 'kyYyk', 'yYwYy', 'yYYYy', 'kyyyk', '.kkk.'], { k: PAL.wood[0], y: PAL.warm[3], Y: PAL.warm[4], w: PAL.warm[5] });
      }
    }, { name: 'lanterns' });
    lan.forEach((l, i) => D.light({ x: t => pos(l, t)[0] + 0.5, y: t => pos(l, t)[1] + 3, r: o.lanternR || 18, color: '#ffa640', power: t => 0.75 * D.flicker(seed + i * 5, t, 0.15, 4), surface: 0.9, halo: 0.22, levels: 4 }));
    return { tips, segs, lanterns: lan };
  };

  // ---------- small props ----------
  K.pumpkin = (D, o = {}) => {
    const x = o.x, y = o.y, s = o.size || 1, seed = o.seed || 151, P = PAL.pumpkin, rx = R(4 * s), ry = R(3 * s);
    D.add(ctx => {
      ellipse(ctx, x, y - ry - 1, rx, ry, P[2]); ellipse(ctx, x - 1, y - ry - 2, rx - 2, ry - 1, P[3]);
      for (const dx of [-R(rx / 2), R(rx / 2)]) line(ctx, x + dx, y - 2 * ry, x + dx, y - 1, P[1]);
      rect(ctx, x - rx + 1, y - 1, 2 * rx - 1, 1, P[1]);
      rect(ctx, x, y - 2 * ry - 3, 1, 2, '#3e5a24'); px(ctx, x + 1, y - 2 * ry - 3, '#3e5a24');
      if (o.face !== false) {
        const ey = y - ry - 2; px(ctx, x - 2, ey, PAL.warm[4]); px(ctx, x + 2, ey, PAL.warm[4]); px(ctx, x - 2, ey - 1, PAL.warm[3]); px(ctx, x + 2, ey - 1, PAL.warm[3]);
        rect(ctx, x - 2, ey + 2, 5, 1, PAL.warm[4]); px(ctx, x - 1, ey + 3, PAL.warm[3]); px(ctx, x + 1, ey + 3, PAL.warm[3]);
      }
    }, { static: true, name: 'pumpkin' });
    if (o.face !== false) D.light({ x: x + 0.5, y: y - ry - 1, r: o.r || 16 * s, color: '#ff8a2a', power: t => 0.7 * D.flicker(seed, t, 0.3, 5), surface: 1, halo: 0.3, levels: 4 });
  };

  K.grave = (D, o = {}) => {
    const x = o.x, y = o.y, w = o.w || 7, h = o.h || 9, S = PAL.stone;
    D.add(ctx => {
      paint(ctx, x - (w >> 1), y - h, w, h, (X, Y) => {
        const dx = X + 0.5 - x, top = y - h + Math.max(0, Math.abs(dx) * 1.2 - (w / 2 - 2)); if (Y < top) return null;
        return ramp(S, 0.7 - (dx + w / 2) / w * 0.5 - (Y - (y - h)) / h * 0.25, X, Y);
      });
      if (o.cross !== false) { rect(ctx, x, y - h + 2, 1, 4, S[0]); rect(ctx, x - 1, y - h + 3, 3, 1, S[0]); }
      rect(ctx, x - (w >> 1) - 1, y - 1, w + 2, 1, PAL.grass[2]);
    }, { static: true, name: 'grave' });
  };

  K.bats = (D, o = {}) => {
    const yr = o.y || [30, 90], per = o.period || 24, cross = o.cross || 9;
    const frames = [['k.....k', 'kk.k.kk', '..kkk..'], ['...k...', '.kkkkk.', 'k..k..k']];
    D.add(D.particles({
      n: o.n || 3, seed: o.seed || 161, period: per, life: cross,
      draw: (ctx, p, age, k) => {
        const dir = p.r4 < 0.5 ? -1 : 1, X = dir < 0 ? lerp(D.W + 10, -10, k) : lerp(-10, D.W + 10, k);
        const Y = lerp(yr[0], yr[1], p.r1) + Math.sin(age * 2.2 + p.r2 * 6) * 6 + p.r3 * 8 * k;
        const f = Math.floor((age + p.r2) * 9) % 2;
        sprite(ctx, X - 3, Y - 1, frames[f], { k: PAL.bat });
      },
    }), { name: 'bats' });
  };

  // will-o'-wisps / fireflies wandering in an area, each one a small light
  K.wisps = (D, o = {}) => {
    const a = o.area, n = o.n || 4, seed = o.seed || 171, col = o.color || PAL.cold;
    const pos = (i, t) => [a[0] + a[2] * D.noise(seed + i * 11, t, o.hz || 0.1), a[1] + a[3] * D.noise(seed + i * 11 + 5, t, (o.hz || 0.1) * 1.3)];
    const pw = (i, t) => 0.55 + 0.45 * D.noise(seed + i * 11 + 9, t, 0.6);
    D.add((ctx, t) => {
      for (let i = 0; i < n; i++) {
        const [X, Y] = pos(i, t), v = pw(i, t);
        px(ctx, X, Y, col[4]); if (v > 0.6) { px(ctx, X - 1, Y, col[2]); px(ctx, X + 1, Y, col[2]); px(ctx, X, Y - 1, col[2]); px(ctx, X, Y + 1, col[2]); }
      }
    }, { name: 'wisps' });
    for (let i = 0; i < n; i++) D.light({ x: t => pos(i, t)[0] + 0.5, y: t => pos(i, t)[1] + 0.5, r: o.r || 11, color: col[2], power: t => 0.8 * pw(i, t), surface: 0.7, halo: 0.3, levels: 3 });
  };

  // ---------- the character: a skeleton on a stump, mug in hand, under an umbrella ----------
  K.skeleton = (D, o = {}) => {
    const x = o.x, y = o.y, f = o.facing ?? -1, B = PAL.bone, seed = o.seed || 181, scarf = o.scarf || PAL.red;
    const sipPer = o.sip || 12, ux = x - f * 4, uy = y - 27, urx = o.umbrellaR || 13;
    D.add(ctx => {
      // stump seat
      rect(ctx, x - 3, y - 5, 7, 5, PAL.wood[2]); rect(ctx, x - 3, y - 5, 7, 1, PAL.wood[4]); px(ctx, x - 2, y - 3, PAL.wood[1]);
      if (o.umbrella !== false) rect(ctx, ux, uy, 1, 27, PAL.wood[1]);
    }, { static: true, name: 'skeleton-seat' });
    D.add((ctx, t) => {
      const ts = D.step(t, 8);
      const bob = D.wave(ts, 4) > 0.3 ? 1 : 0;                         // a slow breath, one pixel
      const sp = D.phase(ts, sipPer), sipK = sp < 0.18 ? smooth(0, 0.06, sp) * (1 - smooth(0.12, 0.18, sp)) : 0;
      const P = (dx, dy) => [x + f * dx, y + dy];
      const pel = P(0, -6), sh = P(0, -12 + bob), head = P(1, -16 + bob);
      // far leg (darker), near leg
      line(ctx, ...P(0, -6), ...P(5, -7), B[1]); line(ctx, ...P(5, -7), ...P(6, -1), B[1]); px(ctx, ...P(7, -1), B[1]);
      line(ctx, ...P(0, -5), ...P(5, -6), B[2]); line(ctx, ...P(5, -6), ...P(5, 0), B[2]); line(ctx, ...P(5, 0), ...P(7, 0), B[2]);
      // spine, pelvis, ribs
      line(ctx, ...pel, ...sh, B[2]); px(ctx, ...P(-1, -6), B[1]); px(ctx, ...P(1, -6), B[2]);
      for (const ry of [-10, -8]) { line(ctx, ...P(0, ry + bob), ...P(3, ry + 1 + bob), B[3]); px(ctx, ...P(-1, ry + bob), B[1]); }
      // scarf
      rect(ctx, Math.min(x, x + f * 3) , y - 13 + bob, 4, 2, scarf[3]); px(ctx, ...P(-1, -11 + bob), scarf[2]); px(ctx, ...P(-1, -10 + bob), scarf[2]); px(ctx, ...P(-2, -10 + bob), scarf[1]);
      // skull: round cranium, dark socket facing forward, jaw
      disc(ctx, head[0], head[1], 3, B[3]); px(ctx, head[0] - f * 2, head[1] + 1, B[2]); px(ctx, head[0] - f * 3, head[1], B[2]);
      rect(ctx, Math.min(head[0] + f * 1, head[0] + f * 2), head[1] - 1, 2, 2, PAL.ink); px(ctx, head[0] + f * 3, head[1] + 1, PAL.ink);
      line(ctx, head[0] - f * 1, head[1] + 3, head[0] + f * 3, head[1] + 3, B[2]); px(ctx, head[0] + f * 2, head[1] + 3, PAL.ink);
      // arm with mug; lifts to the mouth now and then
      const hand = [lerp(x + f * 4, x + f * 4, sipK), lerp(y - 9, head[1] + 2, sipK) + bob * (1 - sipK)], elbow = [x + f * 1, lerp(y - 7, y - 10, sipK) + bob];
      line(ctx, ...sh, ...elbow, B[2]); line(ctx, ...elbow, ...hand, B[3]);
      const mx = R(hand[0] + (f < 0 ? -2 : 0)), my = R(hand[1] - 2);
      rect(ctx, mx, my, 3, 3, PAL.stone[3]); rect(ctx, mx, my, 3, 1, PAL.warm[1]); px(ctx, f < 0 ? mx + 3 : mx - 1, my + 1, PAL.stone[2]);
      // steam from the mug
      if (sipK < 0.1) for (let k = 0; k < 3; k++) { const ph = D.phase(t, 2.4, k / 3); if (ph < 0.8) px(ctx, mx + 1 + R(Math.sin(ph * 6 + k) * 1), my - 2 - R(ph * 6), bayer(mx, my - k) < 1 - ph ? '#7e7896' : '#4c4766'); }
      // umbrella canopy: striped dome, scalloped hem, tip
      if (o.umbrella !== false) {
        for (let dy = -6; dy <= 0; dy++) {
          const half = R(urx * Math.sqrt(1 - (dy / 6.5) ** 2));
          for (let dx = -half; dx <= half; dx++) {
            const panel = Math.floor((dx + urx + 100) / 5) % 2, v = 0.55 + (panel ? 0.2 : -0.1) - dy * 0.03 - (dx * f > 0 ? 0.05 : 0);
            px(ctx, ux + dx, uy + dy, ramp(scarf, v, ux + dx, uy + dy));
          }
        }
        for (let dx = -urx; dx <= urx; dx += 5) px(ctx, ux + dx, uy + 1, scarf[1]);
        px(ctx, ux, uy - 7, PAL.ink);
      }
    }, { name: 'skeleton' });
    // drips off the umbrella hem
    if (o.umbrella !== false) D.add(D.particles({
      n: 6, seed: seed + 3, period: [0.9, 1.6], life: 0.5,
      draw: (ctx, p, age, k) => { const X = ux + (p.r1 < 0.5 ? -urx : urx), Y = uy + 2 + age * age * 60; if (Y < y) px(ctx, X, Y, PAL.rain[2]); },
    }), { name: 'drips' });
    return { umbrella: { x0: ux - urx, x1: ux + urx, y: uy - 6 } };
  };

  // ---------- weather ----------
  // rain: n drops, each falling the full height a whole number of times per loop. shelter = [[x0, x1, y], …] keeps drops out from under a roof.
  K.rain = (D, o = {}) => {
    const r = rng(o.seed || 191), n = o.n || 120, sp = o.speed || [220, 300], ln = o.len || [4, 7], slant = o.slant ?? 0.22, cols = o.cols || PAL.rain.slice(1);
    const shelter = o.shelter || [];
    const drops = Array.from({ length: n }, () => {
      const len = R(r.range(ln[0], ln[1])), dist = D.H + len + 4, k = Math.max(1, Math.round(r.range(sp[0], sp[1]) * D.LOOP / dist));
      return { x: r.range(-slant * D.H, D.W + 4), len, dist, k, off: r(), c: r.pick(cols) };
    });
    D.add((ctx, t) => {
      for (const d of drops) {
        const yy = ((t * d.k / D.LOOP + d.off) % 1) * d.dist - d.len, xx = d.x + slant * yy;
        let skip = false; for (const s of shelter) if (xx >= s[0] && xx <= s[1] && yy + d.len > s[2]) { skip = true; break; }
        if (skip) continue;
        line(ctx, xx, yy, xx + slant * d.len, yy + d.len, d.c);
      }
    }, { name: o.name || 'rain' });
  };

  // splashes on surfaces: segs = [[x0, x1, y], …]
  K.splashes = (D, o = {}) => {
    const segs = o.segs, total = segs.reduce((s, g) => s + (g[1] - g[0]), 0), col = o.color || PAL.rain[3], col2 = o.color2 || PAL.rain[1];
    D.add(D.particles({
      n: o.n || 24, seed: o.seed || 201, period: [0.5, 1.1], life: 0.24,
      draw: (ctx, p, age, k) => {
        let u = p.h(1) * total, g = segs[0]; for (const s of segs) { if (u <= s[1] - s[0]) { g = s; break; } u -= s[1] - s[0]; }
        const X = R(g[0] + u), Y = g[2];
        if (k < 0.33) px(ctx, X, Y - 1, col);
        else if (k < 0.66) { px(ctx, X - 1, Y - 2, col); px(ctx, X + 1, Y - 2, col); }
        else { px(ctx, X - 2, Y - 1, col2); px(ctx, X + 2, Y - 1, col2); }
      },
    }), { name: 'splashes' });
  };

  // ---------- winter ----------
  // snow: like rain, but slow, with a sideways sway; big = 2×2 flakes for the near layer
  K.snow = (D, o = {}) => {
    const r = rng(o.seed || 211), n = o.n || 140, sp = o.speed || [14, 26], sway = o.sway ?? 3, cols = o.cols || PAL.snow.slice(2), big = !!o.big;
    const flakes = Array.from({ length: n }, () => {
      const dist = D.H + 6, k = Math.max(1, Math.round(r.range(sp[0], sp[1]) * D.LOOP / dist));
      return { x: r.range(-4, D.W + 4), dist, k, off: r(), per: r.range(3, 7), ph: r(), amp: sway * r.range(0.5, 1.2), c: r.pick(cols) };
    });
    D.add((ctx, t) => {
      for (const f of flakes) {
        const yy = ((t * f.k / D.LOOP + f.off) % 1) * f.dist - 3, xx = f.x + f.amp * D.wave(t, f.per, f.ph);
        if (big) rect(ctx, xx, yy, 2, 2, f.c); else px(ctx, xx, yy, f.c);
      }
    }, { name: o.name || 'snow' });
  };

  K.pine = (D, o = {}) => {
    const x = o.x, y = o.y, h = o.h || 34, seed = o.seed || 221, cols = o.cols || PAL.pine, tiers = o.tiers || 4, snow = o.snow !== false;
    D.add(ctx => {
      rect(ctx, x - 1, y - 4, 3, 4, PAL.wood[1]);
      for (let i = 0; i < tiers; i++) {
        const k = i / tiers, ty = y - 3 - h * k * 0.82, th = h * (0.42 - k * 0.12), tw = h * (0.36 - k * 0.07);
        poly(ctx, [[x - tw, ty], [x + tw + 1, ty], [x + 0.5, ty - th]], cols[1]);
        poly(ctx, [[x - tw * 0.2, ty], [x + tw + 1, ty], [x + 0.5, ty - th]], cols[2]);
        if (snow) { line(ctx, x - tw + 1, ty - 1, x - tw * 0.3, ty - 2, PAL.snow[3]); line(ctx, x + tw * 0.3, ty - 2, x + tw, ty - 1, PAL.snow[2]); px(ctx, x, ty - th + 1, PAL.snow[4]);
          for (let X = R(x - tw * 0.6); X < x + tw * 0.6; X += 3) if (hash(X + i * 31, seed) < 0.5) px(ctx, X, ty - th * 0.45, PAL.snow[2]); }
      }
    }, { static: true, name: 'pine' });
  };

  K.snowman = (D, o = {}) => {
    const x = o.x, y = o.y, S = PAL.snow, s = o.size || 1;
    D.add(ctx => {
      const r1 = R(5 * s), r2 = R(4 * s), r3 = R(3 * s), y1 = y - r1, y2 = y1 - r1 - r2 + 2, y3 = y2 - r2 - r3 + 1;
      for (const [cy, rr] of [[y1, r1], [y2, r2], [y3, r3]]) { disc(ctx, x, cy, rr, S[2]); disc(ctx, x - 1, cy - 1, rr - 1, S[3]); px(ctx, x - R(rr / 2), cy - R(rr / 2), S[4]); }
      px(ctx, x - 1, y3 - 1, PAL.ink); px(ctx, x + 1, y3 - 1, PAL.ink); rect(ctx, x + 1, y3, 3, 1, PAL.pumpkin[3]);
      rect(ctx, x - r2, y2 - r2 + 1, 2 * r2 + 1, 2, PAL.red[3]); rect(ctx, x + r2 - 2, y2 - r2 + 2, 2, 3, PAL.red[2]);
      px(ctx, x, y2, PAL.ink); px(ctx, x, y2 + 2, PAL.ink);
      line(ctx, x - r2, y2, x - r2 - 5, y2 - 4, PAL.wood[3]); line(ctx, x + r2, y2, x + r2 + 4, y2 - 3, PAL.wood[3]);
      rect(ctx, x - 3, y3 - r3 - 1, 7, 1, PAL.ink); rect(ctx, x - 2, y3 - r3 - 5, 5, 4, PAL.ink);
    }, { static: true, name: 'snowman' });
  };

  // aurora: hanging curtains whose folds roll once per loop (periodic in the loop phase)
  K.aurora = (D, o = {}) => {
    const y = o.y ?? 30, h = o.h || 46, x0 = o.x0 ?? 0, x1 = o.x1 ?? D.W, cols = o.cols || PAL.aurora, seed = o.seed || 231, amt = o.alpha ?? 1.1;
    D.add((ctx, t) => {
      const a = 2 * Math.PI * D.phase(t, D.LOOP), b = 2 * Math.PI * D.phase(t, D.LOOP / 2, 0.3);
      for (let X = x0; X < x1; X++) {
        const u = (X - x0) / (x1 - x0), edge = Math.sin(Math.PI * u);
        const top = y + 10 * Math.sin(X * 0.018 + a) + 5 * Math.sin(X * 0.047 - b);
        const v = Math.sqrt(edge) * clamp(fbm(X * 0.035 + 1.5 * Math.sin(a + X * 0.006), seed) * 2 - 0.4);
        if (v <= 0.02) continue;
        const ray = 0.55 + 0.45 * vnoise(X * 0.45, seed + 3);               // vertical rays: the curtain's folds
        const len = h * (0.45 + 0.55 * v) * (0.7 + 0.3 * ray);
        for (let j = 0; j < len; j++) {
          const k = j / len, al = amt * Math.sqrt(v) * ray * (k < 0.12 ? k / 0.12 : 1) * (1 - k * k);
          const Y = R(top + j); if (bayer(X, Y) >= al) continue;
          px(ctx, X, Y, ramp(cols, 0.9 - k * 0.9 + (v - 0.5) * 0.3, X, Y));
        }
      }
    }, { name: 'aurora' });
  };

  root.K = K;
})(typeof window !== 'undefined' ? window : globalThis);

/* pixel-world-compiler · fw-forms.js
   Growth grammars and built forms. Each form takes a spec in metres and returns a channel sprite
   (material, normal, occlusion, height): no colour. Sizes go through FW.px, so a tent, a pine and a
   person agree by division. A project adds its own forms with FW.forms.register(name, fn) in world.js;
   the library never needs editing for a new topic.

   Projection (cabinet, k = 1/2): a box w × d × h is a front face w × h, a top face w × d/2, and for a
   building a return (east face) d/2 columns wide, its depth axis sheared up and to the right at 45°.
   Depths are even (FW.pxEven). Slopes on exposed edges are 1:0, 1:1, 1:2 or 2:1. */
(function () {
  'use strict';
  const FW = window.FW, N = FW.N, px = FW.px, pe = FW.pxEven;
  const reg = {};
  FW.forms = { reg, register: (name, fn) => { reg[name] = fn; }, make: (name, spec, rng, ctx) => {
    const fn = reg[name]; if (!fn) throw new Error(`no form '${name}' — register it with FW.forms.register`); return fn(spec, rng, ctx);
  } };

  /* ---------- drawing helpers on a channel sprite ---------- */
  const H = {};
  FW.forms.H = H;
  H.rect = (s, x0, y0, w, h, mat, n, ao = 1, z = null, d = 0) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) s.put(x, y, mat, n, ao, z, d); };
  H.line = (s, x0, y0, x1, y1, mat, n, ao = 1, d = 0, z = null) => {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (;;) { s.put(x0, y0, mat, typeof n === 'function' ? n(x0, y0) : n, ao, z, d); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  };
  /* a round cluster: sphere normals about (cx, cy), occlusion deeper toward its lower back */
  H.blob = (s, cx, cy, r, mat, ao = 1, d = 0, ncx = cx, ncy = cy, nr = r, edge = null) => {
    const R = Math.ceil(r);
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
      const q = (x * x + y * y) / (r * r); if (q > 1) continue;
      if (edge && q > 0.55 && edge(cx + x, cy + y)) continue;
      const n = FW.sphereN(cx + x - ncx, cy + y - ncy, nr * 1.05);
      s.put(cx + x, cy + y, mat, n, ao * (0.78 + 0.22 * (1 - q)), null, d + (1 - q));
    }
  };
  /* a vertical cylinder (trunk, post) of width w px from row y0 down to y1 */
  H.cyl = (s, cx, y0, y1, w, mat, ao = 1, d = 0, aoFn = null) => {
    const x0 = Math.round(cx - w / 2);
    for (let y = y0; y <= y1; y++) for (let i = 0; i < w; i++) {
      const sN = w > 1 ? (i + 0.5) / w * 2 - 1 : 0;
      s.put(x0 + i, y, mat, FW.cylN(sN * 0.9), aoFn ? aoFn(x0 + i, y, ao) : ao, null, d + 1 - Math.abs(sN));
    }
  };

  /* ---------- the box under cabinet projection ---------- */
  /* x0, base: front-bottom-left in sprite px. w, h: px; d: even px. Returns the bounds it used.
     mats: { front, top, side }; side = false for a two-face prop (no return). */
  H.box = (s, x0, base, w, d, h, mats, o = {}) => {
    const half = d >> 1, ret = mats.side !== false && o.ret !== false, zb = o.z0 || 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
      s.put(x0 + x, base - y, mats.front, N.FRONT, o.aoFront ? o.aoFront(x, y) : 1, zb + y, 10);
    for (let r = 0; r < half; r++) for (let x = 0; x < w; x++)
      s.put(x0 + x + (ret ? r : 0), base - h - r, mats.top, N.TOP, r === 0 && o.arris ? 0.75 : 1, zb + h, 9);
    if (ret) for (let c = 0; c < half; c++) for (let y = 0; y < h; y++)
      s.put(x0 + w + c, base - y - c - 1, mats.side || mats.front, N.SIDE, o.aoSide ? o.aoSide(c, y) : 1, zb + y, 8);
  };

  /* ---------- trees: one repeated unit, stamped (the way a hand artist builds a pine) ---------- */
  reg.tree = (sp, rng, ctx) => {
    const Hpx = px(sp.height), Wc = Math.max(3, px(sp.crown)), tr = Math.max(1, px(sp.trunk || 0.25));
    const clear = px(sp.clear ?? sp.height * 0.15);
    const w = Wc + 8, h = Hpx + 3, ax = w >> 1, ay = h - 1, s = new FW.Spr(w, h, ax, ay);
    const bark = ctx.m(sp.bark), leaf = sp.leaf ? ctx.m(sp.leaf) : 0, snow = sp.snow ? ctx.m(sp.snow) : 0;
    const form = sp.form || 'broadleaf', droop = sp.droop ?? 0;
    const barkAo = (x, y, a) => (sp.marks && FW.hash(x, y >> 1, 7) < sp.marks ? a * 0.35 : a);
    if (form === 'conifer') {
      H.cyl(s, ax, ay - Hpx + 2, ay, tr, bark, 0.85, 0, barkAo);
      const top = ay - Hpx + 1, span = ay - clear - top;
      /* tiers: denser and longer at the bottom; droop is the season (down = winter, up = summer) */
      for (let yy = 0; yy <= span; yy += 2) {
        const f = yy / Math.max(1, span), y = top + yy, r = (Wc / 2) * Math.pow(f, 0.85) + 0.6;
        for (const side of [-1, 1]) {
          const len = r * (0.75 + 0.25 * rng());
          for (let i = 0; i <= len; i++) {
            const x = ax + side * i, dy = Math.round(-droop * (i / Math.max(1, len)) * len * 0.45);
            const sN = FW.clamp(side * i / (Wc / 2 + 1), -1, 1);
            const n = FW.normalize([sN, -Math.sqrt(1 - sN * sN) * 0.75, 0.55]);
            const ao = (0.55 + 0.45 * (i / Math.max(1, len))) * (0.8 + 0.2 * (1 - f));
            s.put(x, y + dy, leaf, n, ao, null, 2 + i * 0.01);
            if (i < len - 1 || rng() < 0.5) s.put(x, y + dy + 1, leaf, n, ao * 0.8, null, 2);
          }
          /* the dark droop-line at the tip: the detail that sells a pine */
          const tx = Math.round(ax + side * len), ty = y + Math.round(-droop * len * 0.45);
          if (droop > 0 && len > 2) { s.put(tx, ty + 2, leaf, [0, -1, 0], 0.15, null, 2); if (len > 4) s.put(tx - side, ty + 3, leaf, [0, -1, 0], 0.1, null, 2); }
        }
      }
      s.put(ax, top - 1, leaf, N.TOP, 0.9, null, 3);
    } else if (form === 'bamboo') {
      const culms = sp.culms || 7;
      for (let c = 0; c < culms; c++) {
        const off = (c / (culms - 1) - 0.5) * Wc * 0.5, lean = (c / (culms - 1) - 0.5) * 0.35, hh = Hpx * (0.75 + 0.25 * rng());
        let lx = ax + off, ly = ay;
        for (let k = 0; k < hh; k++) {
          const x = Math.round(ax + off + lean * k * (k / hh)), y = ay - k;
          s.put(x, y, bark, FW.cylN(0.3), k % 6 === 0 ? 0.55 : 0.95, null, c * 0.01);
          if (k > hh * 0.45 && k % 3 === 0) {
            const side = (k / 3) & 1 ? 1 : -1, l = 2 + Math.round(rng() * 3);
            for (let i = 1; i <= l; i++) s.put(x + side * i, y + (i >> 1), leaf, FW.normalize([side * 0.6, -0.5, 0.6]), 0.6 + 0.4 * rng(), null, 1);
          }
          lx = x; ly = y;
        }
        H.blob(s, lx, ly + 1, 2.2, leaf, 0.9, 2);
      }
    } else {
      /* broadleaf / birch: a bole, then branches, then leaf clusters stamped along them */
      const crownTop = ay - Hpx + 1, crownH = Math.max(4, ay - clear - crownTop), cy = crownTop + crownH * 0.5;
      H.cyl(s, ax, ay - clear - 2, ay, tr, bark, form === 'birch' ? 1 : 0.85, 0, barkAo);
      const limbs = sp.limbs || (form === 'birch' ? 5 : 6), tips = [];
      for (let i = 0; i < limbs; i++) {
        const a = -Math.PI / 2 + (i / (limbs - 1) - 0.5) * 2.2 + (rng() - 0.5) * 0.3;
        const len = crownH * (0.42 + 0.2 * rng()), sy = ay - clear - 1 - Math.round(rng() * crownH * 0.25);
        const ex = ax + Math.cos(a) * len * (Wc / crownH) * 0.9, ey = sy + Math.sin(a) * len;
        H.line(s, ax, sy, ex, ey, bark, FW.cylN(0), form === 'birch' ? 0.9 : 0.7, 1);
        tips.push([ex, ey]);
        /* a bare winter crown: twigs off each limb */
        if (!leaf) for (let k = 0; k < 3; k++) { const b = a + (rng() - 0.5) * 1.6, l2 = len * 0.4; const mx = FW.lerp(ax, ex, 0.6 + 0.3 * rng()), my = FW.lerp(sy, ey, 0.6 + 0.3 * rng());
          H.line(s, mx, my, mx + Math.cos(b) * l2, my + Math.sin(b) * l2 * 0.8, bark, FW.cylN(0), 0.6, 1); }
      }
      if (leaf) {
        const k = sp.clusters || Math.round((Wc * crownH) / 30);
        for (let i = 0; i < k; i++) {
          /* clusters fill the crown volume (an ellipse), a third of them hugging the limbs so the frame still shows */
          let x, y;
          if (i % 3 === 0) { const t = tips[i % tips.length], q = rng(); x = FW.lerp(ax, t[0], 0.45 + 0.55 * q) + (rng() - 0.5) * 3; y = FW.lerp(cy, t[1], 0.4 + 0.6 * q) + (rng() - 0.5) * 3; }
          else { let u, v; do { u = rng() * 2 - 1; v = rng() * 2 - 1; } while (u * u + v * v > 1); x = ax + u * Wc * 0.46; y = cy + crownH * 0.04 + v * crownH * 0.47; }
          const r = (form === 'birch' ? 1.6 : 2.4) + rng() * (form === 'birch' ? 1.2 : 2.2);
          H.blob(s, x, y, r, leaf, 0.85 + 0.15 * rng(), 2 + i * 0.001, ax, cy, Math.max(Wc / 2, crownH / 2),
            (xx, yy) => FW.hash(xx, yy, 3) < (sp.gaps ?? 0.25));
        }
      }
    }
    /* snow takes the highlight positions: an exposed upward pixel with open sky above it */
    if (snow) for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!s.mat[i] || s.mat[i] === snow) continue;
      if (!s.mat[i - w] && s.nz[i] > 0.25 && FW.hash(x, y, 11) < (sp.snowCover ?? 0.8)) {
        s.mat[i] = snow; s.nx[i] = 0; s.ny[i] = -0.3; s.nz[i] = 0.95; s.ao[i] = 1;
        const j = i + w; if (y + 1 < h && s.mat[j] && s.mat[j] !== bark && FW.hash(x, y, 12) < 0.4) { s.mat[j] = snow; s.ao[j] = 0.7; }
      }
    }
    return s;
  };

  /* ---------- a boulder or a tussock: one rounded mass ---------- */
  reg.boulder = (sp, rng, ctx) => {
    const W = Math.max(3, px(sp.w)), Hh = Math.max(2, px(sp.h)), w = W + 2, h = Hh + 2, s = new FW.Spr(w, h, w >> 1, h - 1);
    const mat = ctx.m(sp.mat), snow = sp.snow ? ctx.m(sp.snow) : 0, cx = w / 2 - 0.5, cy = h - 1 - Hh / 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x - cx) / (W / 2), dy = (y - cy) / (Hh / 2), q = dx * dx + dy * dy;
      const rough = (FW.hash(x, y, 5) - 0.5) * (sp.rough ?? 0.35);
      if (q > 1 + rough || y > h - 1) continue;
      const n = FW.sphereN(dx, dy, 1.1);
      const isSnow = snow && n[2] > 0.55 && dy < -0.2;
      s.put(x, y, isSnow ? snow : mat, isSnow ? [0, -0.3, 0.95] : n, (0.8 + 0.2 * FW.hash(x, y, 9)) * (dy > 0.6 ? 0.8 : 1), (h - 1 - y), 1);
    }
    return s;
  };

  /* ---------- a building: walls, a gable roof with an overhang that casts, a recessed door ----------
     sp: { w, d, h (eave height), pitch (deg), overhang, stilts (m), wall, roof, trim, glass, door:{w,h},
           windows, ridge: 'front' (eaves face the camera) }. The return (east) face is the gable end. */
  reg.house = (sp, rng, ctx) => {
    const W = px(sp.w), D = pe(sp.d), Hw = px(sp.h), half = D >> 1, ov = Math.max(1, px(sp.overhang ?? 0.4));
    const pitch = (sp.pitch ?? 35) * Math.PI / 180, run = sp.d / 2, rise = px(run * Math.tan(pitch)), stilt = px(sp.stilts || 0);
    const roofRows = rise + (half >> 1) + 1;
    const w = W + half + ov * 2 + 2, h = Hw + stilt + roofRows + half + 4, base = h - 1 - stilt, x0 = ov + 1;
    const s = new FW.Spr(w, h, x0 + (W >> 1), h - 1);
    const wall = ctx.m(sp.wall), roof = ctx.m(sp.roof), trim = ctx.m(sp.trim || sp.wall), glass = sp.glass ? ctx.m(sp.glass) : trim;
    const course = sp.course ? Math.max(2, px(sp.course)) : 0; // a log course or a plank is a real member
    if (stilt) {
      for (const fx of [0, W - 1, W >> 1]) H.rect(s, x0 + fx, base + 1, 1, stilt, trim, N.FRONT, 0.8, null, 11);
      for (const fx of [0, W - 1]) H.rect(s, x0 + fx + half, base + 1 - half, 1, stilt, trim, N.FRONT, 0.6, null, 1);
      if (sp.deck) H.rect(s, x0 - 1, base + 1, W + 2, 1, trim, N.TOP, 0.9, stilt, 12);
    }
    H.box(s, x0, base, W, D, Hw, { front: wall, top: roof, side: wall }, {
      z0: stilt,
      aoFront: (x, y) => (y >= Hw - 1 ? 0.55 : 1) * (course && y % course === course - 1 ? 0.7 : 1) * (0.94 + 0.06 * FW.hash(x, y, 2)),
      aoSide: (c, y) => (course && y % course === course - 1 ? 0.7 : 1),
    });
    /* gable triangle over the return */
    for (let c = 0; c < half; c++) {
      const peak = Math.round(rise * (1 - Math.abs((c + 0.5) / half * 2 - 1)));
      for (let y = 0; y < peak; y++) s.put(x0 + W + c, base - Hw - c - 1 - y, wall, N.SIDE, 0.9, stilt + Hw + y, 8);
    }
    /* front roof plane: from the eave (with overhang) up and back to the ridge */
    const nRoof = FW.normalize([0, -Math.sin(pitch), Math.cos(pitch)]);
    const rows = rise + (half >> 1);
    for (let r = 0; r < rows; r++) {
      const back = Math.round((r / rows) * (half >> 1));
      for (let x = -ov; x < W + ov + Math.round((r / rows) * half); x++) {
        /* courses along the slope (thatch layers, tile rows) are what make a flat plane read as pitched */
        const rc = sp.roofCourse ? Math.max(2, FW.px(sp.roofCourse)) : 0, ridge = r >= rows - 1;
        const shade = (r === 0 ? 0.6 : 1) * (ridge ? 0.75 : 1) * (rc && r % rc === rc - 1 ? 0.72 : 1) * (sp.roofMarks && (x + r) % 4 === 0 ? 0.9 : 1);
        s.put(x0 + x + back, base - Hw - r + ov - 1, roof, nRoof, shade, stilt + Hw + r * 0.6, 13);
      }
    }
    /* the eave casts on the wall: one dark row under it */
    for (let x = 0; x < W; x++) { const i = (base - Hw + ov) * w + x0 + x; if (i >= 0 && s.mat[i] === wall) s.ao[i] *= 0.55; }
    /* door: recessed, darker jamb on the lit side */
    const dW = px(sp.door?.w ?? 0.9), dH = px(sp.door?.h ?? 1.9), dx = x0 + Math.round(W * (sp.door?.at ?? 0.35)) - (dW >> 1);
    H.rect(s, dx, base - dH + 1, dW, dH, trim, N.FRONT, 0.35, null, 14);
    H.rect(s, dx, base - dH + 1, 1, dH, trim, N.FRONT, 0.2, null, 14);
    /* windows: glazing is a light, not a hole */
    const nw = sp.windows ?? 1;
    for (let k = 0; k < nw; k++) {
      const wx = x0 + Math.round(W * (0.62 + 0.25 * k / Math.max(1, nw))) - 1, wy = base - Math.round(Hw * 0.6);
      H.rect(s, wx - 1, wy - 1, 4, 4, trim, N.FRONT, 0.5, null, 14);
      H.rect(s, wx, wy, 2, 2, glass, N.FRONT, sp.lit ? 0.9 : 0.25, null, 15);
    }
    return s;
  };

  /* ---------- a cone tent (lavvu, tipi, yurt roof): poles crossing above the smoke hole ---------- */
  reg.cone = (sp, rng, ctx) => {
    const R = px(sp.r), Hh = px(sp.h), Dr = Math.max(2, R >> 1), poles = px(sp.poles ?? 0.6);
    const w = 2 * R + 6, h = Hh + poles + Dr + 3, ax = w >> 1, ay = h - 1 - (Dr >> 1), s = new FW.Spr(w, h, ax, h - 1);
    const hide = ctx.m(sp.cover), pole = ctx.m(sp.pole), snow = sp.snow ? ctx.m(sp.snow) : 0;
    const slope = Math.atan2(R, Hh);
    for (let y = 0; y <= Hh; y++) {
      const f = y / Hh, rx = R * f, row = ay - Hh + y;
      for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
        const sN = FW.clamp(x / (rx + 0.5), -1, 1), c = Math.sqrt(1 - sN * sN);
        const n = FW.normalize([sN * Math.cos(slope), -c * Math.cos(slope), Math.sin(slope)]);
        let ao = 0.95 - 0.1 * FW.hash(x, y, 8);
        if (sp.seams && Math.abs(x) % Math.max(2, Math.round(rx / 2)) === 0 && y > 2) ao *= 0.8;
        if (y < Hh * 0.12) ao *= 0.4; // smoke hole: soot
        s.put(ax + x, row, hide, n, ao, Hh - y, 5 + c);
        /* snow banked against the skirt: a drift line, solid under it */
        const drift = 2 + Math.round(2 * FW.noise(x * 0.35, 0, 21) + (1 - Math.abs(sN)) * 1.5);
        if (snow && Hh - y < drift) s.put(ax + x, row, snow, [sN * 0.4, -0.6, 0.7], 0.95, Hh - y, 6);
      }
      /* the base ellipse's near half reads as ground contact */
      if (y === Hh) for (let k = 1; k <= (Dr >> 1); k++) { const rr = Math.round(R * Math.sqrt(1 - (k / (Dr / 2 + 1)) ** 2)); for (let x = -rr; x <= rr; x++) s.put(ax + x, ay + k, hide, FW.N.FRONT, 0.8, 0, 4); }
    }
    /* door flap */
    const dw = Math.max(2, px(sp.door ?? 0.7));
    for (let y = 0; y < Math.round(Hh * 0.45); y++) for (let x = -dw / 2; x < dw / 2 - y * 0.1; x++) s.put(ax + Math.round(x) + 1, ay - y, hide, FW.N.FRONT, 0.3, y, 9);
    /* poles */
    for (const k of [-2, -1, 1, 2]) H.line(s, ax + k * 0.5, ay - Hh + 2, ax + k * 1.6, ay - Hh - poles, pole, FW.cylN(0), 0.75, 10);
    return s;
  };

  /* ---------- small built things ---------- */
  reg.post = (sp, rng, ctx) => { const Hh = px(sp.h), w = Math.max(1, px(sp.w ?? 0.15)), s = new FW.Spr(w + 2, Hh + 1, (w + 2) >> 1, Hh);
    H.cyl(s, (w + 2) / 2, 0, Hh, w, ctx.m(sp.mat), 0.9); return s; };
  reg.stack = (sp, rng, ctx) => {
    /* a woodpile seen end-on: round log ends in rows, each a ring (the face is end grain) */
    const W = px(sp.w), Hh = px(sp.h), D = pe(sp.d ?? 0.6), r = Math.max(1, px((sp.log ?? 0.16) / 2));
    const s = new FW.Spr(W + (D >> 1) + 2, Hh + (D >> 1) + 2, (W >> 1) + 1, Hh + (D >> 1) + 1), mat = ctx.m(sp.mat), end = ctx.m(sp.end || sp.mat);
    H.box(s, 1, Hh + (D >> 1), W, D, Hh, { front: mat, top: mat, side: mat });
    for (let y = r; y < Hh; y += 2 * r + 1) for (let x = r + ((y / (2 * r + 1)) & 1 ? r : 0); x < W; x += 2 * r + 1)
      H.blob(s, 1 + x, Hh + (D >> 1) - y, r + 0.3, end, 1, 20);
    return s;
  };
  reg.rack = (sp, rng, ctx) => {
    /* a drying rack: two posts, a bar, things hung on it (hides, fish, rice sheaves) */
    const W = px(sp.w), Hh = px(sp.h), s = new FW.Spr(W + 4, Hh + 2, (W + 4) >> 1, Hh + 1), wood = ctx.m(sp.wood), hang = ctx.m(sp.hang);
    H.cyl(s, 2, 0, Hh + 1, 1, wood, 0.8, 2); H.cyl(s, W + 1, 0, Hh + 1, 1, wood, 0.8, 2);
    H.line(s, 1, 1, W + 2, 1, wood, N.TOP, 0.9, 3);
    const n = sp.n ?? Math.max(2, Math.round(W / 4)), len = px(sp.len ?? 0.7);
    for (let i = 0; i < n; i++) { const x = 3 + Math.round((i + 0.5) * (W - 3) / n), l = len - (FW.hash(i, 0, 3) * 3 | 0);
      for (let y = 2; y < 2 + l; y++) for (let k = -1; k <= 0; k++) s.put(x + k, y, hang, FW.cylN(k ? -0.5 : 0.5), 0.7 + 0.3 * (1 - y / (2 + l)), Hh + 1 - y, 4); }
    return s;
  };
  reg.fence = (sp, rng, ctx) => {
    const W = px(sp.w), Hh = px(sp.h ?? 1.1), s = new FW.Spr(W + 2, Hh + 2, 1, Hh + 1), m = ctx.m(sp.mat), gap = px(sp.gap ?? 1.6);
    for (let x = 1; x <= W; x += gap) H.rect(s, x, 1, 1, Hh + 1, m, N.FRONT, 0.85, null, 2);
    for (const y of [3, Hh - 2]) H.line(s, 1, y, W, y, m, N.FRONT, 0.95, 3);
    return s;
  };
  reg.dome = (sp, rng, ctx) => { // a haystack, a turf hut, a kiln
    const R = px(sp.r), Hh = px(sp.h), s = new FW.Spr(2 * R + 3, Hh + (R >> 1) + 3, R + 1, Hh + (R >> 1) + 2), m = ctx.m(sp.mat);
    for (let y = 0; y <= Hh; y++) { const f = Math.sqrt(1 - Math.pow(1 - y / Hh, 2)); const rx = Math.round(R * f);
      for (let x = -rx; x <= rx; x++) s.put(R + 1 + x, 1 + y, m, FW.sphereN(x, y - Hh, Math.max(R, Hh) * 1.05), 0.85 + 0.15 * FW.hash(x, y, 6), Hh - y, 1); }
    return s;
  };
})();

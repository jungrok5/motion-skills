// machine-wilds · 40_arch — buildings from parts: walls with real openings (stone, half-timber, boards), windows with
// leaded glass that lights at dusk, plank doors, roofs with thickness, rafters and sag, chimneys, dormers — and
// LR.arch.house() which puts them together from a few parameters.  Everything is written in the building's own
// frame (x along the ridge, z out of the front, y up from the levelled site) into one LR.Geo per building.
{
  const T = THREE, F = LR.FLAG, A = (LR.arch = { spinners: [] });
  const deg = Math.PI / 180;
  const vary = (hex, r, amt = 0.06) => { const n = parseInt(hex.slice(1), 16); const c = [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; const k = 1 + (r() - 0.5) * 2 * amt; return c.map((v) => LR.sat(v * k * (1 + (r() - 0.5) * amt)) * 0.5); };
  A.vary = vary;

  // ── a window, in a wall's frame (x along the wall, y up, z out), centred at cx, cy ──────────────────────────────
  // o: { w, h, depth, frame:'timber'|'ashlar', shutters:'#hex'|null, box:bool, arch:bool, seed, tint (frame), sill }
  A.window = (g, cx, cy, o = {}) => {
    const w = o.w || 0.9, h = o.h || 1.2, dp = o.depth || 0.16, ft = 0.07, r = o.rng || LR.rng(o.seed || 1), x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, fm = o.frame || 'timber';
    const seed = Math.floor(r() * 250) + 1;
    // glass at the back of the reveal
    g.mat('glass', { flags: F.WINDOW, seed, ao: 0.9 });
    if (o.arch) { const pts = [[x0, y0, -dp], [x1, y0, -dp]], n = 8, yb = y1 - w / 2; for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI; pts.push([cx + Math.cos(a) * w / 2, yb + Math.sin(a) * w / 2 * (o.point ? 1.35 : 1), -dp]); } g.poly(pts); }
    else g.poly([[x0, y0, -dp], [x1, y0, -dp], [x1, y1, -dp], [x0, y1, -dp]]);
    // glazing bars
    g.mat(fm === 'ashlar' ? 'iron' : 'timber', { tint: o.tint, ao: 0.85 });
    g.box(cx, cy, -dp + 0.02, 0.045, h, 0.04, { grain: 'y', skip: '+y-y-z' });
    if (h > 0.9) g.box(cx, o.arch ? y1 - w / 2 : cy + h * 0.12, -dp + 0.02, w, 0.045, 0.04, { grain: 'x', skip: '+x-x-z' });
    // the frame round the opening, standing a little proud of the wall
    if (fm === 'timber') {
      g.mat('timber', { tint: o.tint, soft: 0.25 });
      g.box(x0 - ft / 2, cy, -dp / 2 + 0.035, ft, h + ft * 2, dp + 0.07, { grain: 'y' }); g.box(x1 + ft / 2, cy, -dp / 2 + 0.035, ft, h + ft * 2, dp + 0.07, { grain: 'y' });
      g.box(cx, y1 + ft / 2, -dp / 2 + 0.035, w, ft, dp + 0.07, { grain: 'x', skip: '+x-x' }); g.box(cx, y0 - ft / 2 - 0.01, -dp / 2 + 0.06, w + ft * 2 + 0.1, ft + 0.02, dp + 0.14, { grain: 'x' });
    } else {
      g.mat('ashlar', { tint: o.stone, soft: 0.2, ao: 0.8 });
      // stone reveals and a sill
      g.poly([[x0, y0, 0], [x0, y0, -dp], [x0, y1, -dp], [x0, y1, 0]], { hint: [1, 0, 0] }); g.poly([[x1, y0, 0], [x1, y0, -dp], [x1, y1, -dp], [x1, y1, 0]], { hint: [-1, 0, 0] });
      if (!o.arch) g.box(cx, y1 + 0.09, -dp / 2 + 0.03, w + 0.3, 0.18, dp + 0.06, { grain: 'x' });
      g.box(cx, y0 - 0.05, -dp / 2 + 0.06, w + 0.2, 0.1, dp + 0.12, { grain: 'x' });
    }
    if (o.shutters) {
      const sw = w / 2 + 0.02; g.mat('boards', { tint: o.shutters, ao: 0.95 });
      for (const s of [-1, 1]) { const sx = cx + s * (w / 2 + ft + sw / 2 + 0.015), tilt = (r() - 0.5) * 0.05; g.at(sx, cy, 0.05, 0, 0, tilt); g.box(0, 0, 0, sw, h, 0.035, { grain: 'y', skip: '-z' }); g.pop(); }
      g.mat('iron'); for (const s of [-1, 1]) for (const yy of [-0.3, 0.3]) g.box(cx + s * (w / 2 + ft + sw / 2 + 0.015), cy + yy * h, 0.072, sw - 0.04, 0.035, 0.012, { skip: '-z' });
    }
    if (o.box) {
      g.mat('planks', { tint: '#c8b8a4' }); g.box(cx, y0 - 0.22, 0.13, w + 0.1, 0.2, 0.22, { grain: 'x' });
      const cols = o.blooms || ['#d8453a', '#e8a23a', '#e9e2d0', '#c85a9a']; const nb = Math.round(w / 0.16);
      for (let i = 0; i < nb; i++) { const fx = x0 + (i + 0.5) / nb * w + (r() - 0.5) * 0.05; g.mat('moss', { tint: vary('#7f9a4a', r, 0.2), flags: F.SWAY, weight: 0.15 }); g.blob(fx, y0 - 0.06 + r() * 0.05, 0.13 + (r() - 0.5) * 0.06, 0.11 + r() * 0.04, { seg: 5, rings: 4, amp: 0.3, seed: i + seed });
        if (r() < 0.75) { g.mat('cloth', { tint: vary(r.pick(cols), r, 0.1), flags: F.SWAY, weight: 0.2 }); g.blob(fx + (r() - 0.5) * 0.08, y0 + 0.05 + r() * 0.06, 0.16 + (r() - 0.5) * 0.08, 0.045 + r() * 0.02, { seg: 5, rings: 3, amp: 0.2, seed: i }); } }
    }
    return seed;
  };

  // ── a door: boards, straps, a ring, frame and a step.  the wall frame again; the threshold is at y = 0 ───────────
  A.door = (g, cx, o = {}) => {
    const w = o.w || 1.15, h = o.h || 2.1, dp = o.depth || 0.2, fm = o.frame || 'timber', x0 = cx - w / 2, x1 = cx + w / 2, r = o.rng || LR.rng(o.seed || 3);
    g.mat(o.tint ? 'boards' : 'planks', { tint: o.tint, ao: 0.8 });
    const pts = [[x0, 0, -dp], [x1, 0, -dp]]; if (o.arch) { const n = 8, yb = h - w / 2; for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI; pts.push([cx + Math.cos(a) * w / 2, yb + Math.sin(a) * w / 2, -dp]); } } else pts.push([x1, h, -dp], [x0, h, -dp]);
    g.poly(pts, { u: [0, 1, 0], v: [1, 0, 0], ao: pts.map((p) => 0.55 + 0.4 * LR.sat(p[1] / h)) });
    g.mat('iron'); for (const yy of [0.22, 0.52, 0.82]) g.box(cx - w * 0.08, h * yy * (o.arch ? 0.9 : 1), -dp + 0.012, w * 0.8, 0.06, 0.02, { skip: '-z' });
    g.tube([[cx + w * 0.3, h * 0.5, -dp + 0.02], [cx + w * 0.3, h * 0.5, -dp + 0.07], [cx + w * 0.3, h * 0.44, -dp + 0.07], [cx + w * 0.3, h * 0.44, -dp + 0.03]], 0.014, { sides: 5 });
    if (fm === 'timber') { g.mat('timber', { tint: o.frameTint, soft: 0.25 }); const ft = 0.16; g.box(x0 - ft / 2, h / 2, -dp / 2 + 0.04, ft, h, dp + 0.08, { grain: 'y', skip: '-y' }); g.box(x1 + ft / 2, h / 2, -dp / 2 + 0.04, ft, h, dp + 0.08, { grain: 'y', skip: '-y' }); g.box(cx, h + ft / 2, -dp / 2 + 0.05, w + ft * 2 + 0.2, ft, dp + 0.1, { grain: 'x' }); }
    else { g.mat('ashlar', { tint: o.stone, soft: 0.2, ao: 0.8 }); g.poly([[x0, 0, 0], [x0, 0, -dp], [x0, o.arch ? h - w / 2 : h, -dp], [x0, o.arch ? h - w / 2 : h, 0]], { hint: [1, 0, 0] }); g.poly([[x1, 0, 0], [x1, 0, -dp], [x1, o.arch ? h - w / 2 : h, -dp], [x1, o.arch ? h - w / 2 : h, 0]], { hint: [-1, 0, 0] });
      if (!o.arch) g.box(cx, h + 0.11, -dp / 2 + 0.03, w + 0.4, 0.22, dp + 0.06, { grain: 'x' }); else { const n = 7; for (let i = 0; i < n; i++) { const a = ((i + 0.5) / n) * Math.PI; g.at(cx + Math.cos(a) * (w / 2 + 0.11), h - w / 2 + Math.sin(a) * (w / 2 + 0.11), -dp / 2 + 0.03, 0, 0, a - Math.PI / 2); g.box(0, 0, 0, (Math.PI * (w / 2 + 0.1)) / n - 0.012, 0.22, dp + 0.06, { grain: 'x' }); g.pop(); } } }
    g.mat('ashlar', { soft: 0.2 }); g.box(cx, -0.09, 0.3, w + 0.5, 0.18, 0.7, { grain: 'x' });
  };

  // a lantern on an iron arm; registers its light.  wall frame; (x, y) on the wall.  toWorld: the Geo's current matrix
  A.lantern = (g, x, y, o = {}) => {
    const out = o.out || 0.42; g.mat('iron');
    g.tube([[x, y, 0], [x, y + 0.02, out * 0.6], [x, y - 0.03, out]], 0.014, { sides: 5 }); g.tube([[x, y - 0.03, out], [x, y - 0.12, out]], 0.008, { sides: 4 });
    A.lamp(g, x, y - 0.3, out, o);
  };
  // the lamp body alone, hanging with its top at y + 0.18
  A.lamp = (g, x, y, z, o = {}) => {
    g.mat('iron'); const s = 0.085;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.box(x + sx * s, y, z + sz * s, 0.014, 0.24, 0.014, { skip: '+y-y' });
    g.box(x, y - 0.125, z, 0.2, 0.02, 0.2); g.poly([[x - 0.12, y + 0.12, z + 0.12], [x + 0.12, y + 0.12, z + 0.12], [x, y + 0.2, z]]); g.poly([[x + 0.12, y + 0.12, z - 0.12], [x - 0.12, y + 0.12, z - 0.12], [x, y + 0.2, z]]); g.poly([[x + 0.12, y + 0.12, z + 0.12], [x + 0.12, y + 0.12, z - 0.12], [x, y + 0.2, z]]); g.poly([[x - 0.12, y + 0.12, z - 0.12], [x - 0.12, y + 0.12, z + 0.12], [x, y + 0.2, z]]);
    g.mat('glass', { flags: F.GLOW | F.NOWEATHER, weight: 1 }); g.box(x, y, z, 0.15, 0.22, 0.15, { skip: '+y-y' });
    const p = new T.Vector3(x, y, z).applyMatrix4(g.m);
    LR.world.light({ x: p.x, y: p.y, z: p.z, r: o.r || 12, power: o.power || 5, color: o.color || [1, 0.60, 0.26], kind: 'lamp', glow: 1 });
  };

  // ── walls ───────────────────────────────────────────────────────────────────────────────────────────────────────
  // plain panel with a soft shade under the plate and at the foot
  const panel = (g, x0, x1, y0, y1, z, h) => { if (x1 - x0 < 0.01 || y1 - y0 < 0.01) return; const a = (y) => 0.72 + 0.28 * LR.sm(0, 0.5, y) * LR.sm(h, h - 0.6, y) + 0; g.poly([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], { ao: [a(y0), a(y0), a(y1), a(y1)] }); };
  // items: [{ type:'window'|'door', at: metres along the wall, w, h, y (window centre), …window/door options }]
  // o: { style:'stone'|'timber'|'boards', mat, tint, timberTint, bay, brace, skipCorners }
  A.wall = (g, len, h, items = [], o = {}) => {
    const r = o.rng || LR.rng(o.seed || 5), style = o.style || 'timber';
    if (style === 'timber') {
      const pw = o.post || 0.17, nb = Math.max(1, Math.round(len / (o.bay || 1.35))), bw = len / nb, zf = 0.03, zp = -0.02, plate = 0.18;
      const bayItem = new Array(nb).fill(null); for (const it of items) { const b = LR.clamp(Math.floor(it.at / bw), 0, nb - 1); bayItem[b] = it; }
      for (let i = 0; i < nb; i++) {
        const x0 = i * bw + pw / 2, x1 = (i + 1) * bw - pw / 2, it = bayItem[i];
        g.mat('plaster', { tint: o.tint, uo: (i * 0.37) % 1, vo: (i * 0.61) % 1 });
        if (it && it.type === 'window') {
          const ww = Math.min(it.w || 0.85, x1 - x0 - 0.02), wh = it.h || 1.15, cx = (x0 + x1) / 2, cy = it.y || h * 0.52, wx0 = cx - ww / 2 - 0.07, wx1 = cx + ww / 2 + 0.07;
          panel(g, x0, x1, plate, cy - wh / 2 - 0.1, zp, h); panel(g, x0, x1, cy + wh / 2 + 0.1, h - plate, zp, h); panel(g, x0, wx0, cy - wh / 2 - 0.1, cy + wh / 2 + 0.1, zp, h); panel(g, wx1, x1, cy - wh / 2 - 0.1, cy + wh / 2 + 0.1, zp, h);
          g.mat('timber', { tint: o.timberTint, soft: 0.25 }); g.beam([x0, cy - wh / 2 - 0.16, zf - 0.09], [x1, cy - wh / 2 - 0.16, zf - 0.09], 0.12, 0.18, { caps: false }); g.beam([x0, cy + wh / 2 + 0.16, zf - 0.09], [x1, cy + wh / 2 + 0.16, zf - 0.09], 0.12, 0.18, { caps: false });
          A.window(g, cx, cy, Object.assign({ depth: 0.13, tint: o.timberTint, rng: r }, it, { w: ww, h: wh }));
        } else if (it && it.type === 'door') {
          const dw = Math.min(it.w || 1.1, x1 - x0), dh = Math.min(it.h || 2.05, h - plate - 0.1), cx = (x0 + x1) / 2;
          panel(g, x0, cx - dw / 2 - 0.16, plate * 0, h - plate, zp, h); panel(g, cx + dw / 2 + 0.16, x1, 0, h - plate, zp, h); panel(g, cx - dw / 2 - 0.16, cx + dw / 2 + 0.16, dh + 0.16, h - plate, zp, h);
          A.door(g, cx, Object.assign({ depth: 0.15, frameTint: o.timberTint, rng: r }, it, { w: dw, h: dh })); if (it.lantern !== false) A.lantern(g, cx + dw / 2 + 0.4, Math.min(h - 0.35, dh + 0.25), {});
        } else {
          panel(g, x0, x1, plate, h - plate, zp, h);
          const br = o.brace === undefined ? r.pick(['none', 'none', 'left', 'right', 'rail', 'rail', 'cross', 'studs']) : o.brace; g.mat('timber', { tint: o.timberTint, soft: 0.25 }); const zc = zf - 0.085, bt = 0.13;
          if (br === 'left') g.beam([x0, plate, zc], [x1, h - plate, zc], bt, 0.17, { caps: false, up: [0, 0, 1] });
          else if (br === 'right') g.beam([x1, plate, zc], [x0, h - plate, zc], bt, 0.17, { caps: false, up: [0, 0, 1] });
          else if (br === 'cross') { g.beam([x0, plate, zc], [x1, h - plate, zc], bt, 0.17, { caps: false, up: [0, 0, 1] }); g.beam([x1, plate, zc - 0.004], [x0, h - plate, zc - 0.004], bt, 0.17, { caps: false, up: [0, 0, 1] }); }
          else if (br === 'rail') g.beam([x0, h * 0.5, zc], [x1, h * 0.5, zc], bt, 0.17, { caps: false });
          else if (br === 'studs') { g.beam([(x0 + x1) / 2, plate, zc], [(x0 + x1) / 2, h - plate, zc], bt, 0.17, { caps: false, up: [0, 0, 1] }); g.beam([x0, h * 0.5, zc], [x1, h * 0.5, zc], bt, 0.17, { caps: false }); }
        }
      }
      g.mat('timber', { tint: o.timberTint, soft: 0.25 });
      for (let i = 0; i <= nb; i++) { if ((i === 0 || i === nb) && o.skipCorners) continue; const x = i * bw, cw = i === 0 || i === nb ? pw * 1.25 : pw; g.box(x, h / 2, zf - 0.1, cw, h, 0.2, { grain: 'y', skip: '+y-y-z' }); }
      g.box(len / 2, plate / 2, zf - 0.095, len + pw, plate, 0.21, { grain: 'x', skip: '-z' }); g.box(len / 2, h - plate / 2, zf - 0.095, len + pw, plate, 0.21, { grain: 'x', skip: '-z' });
      return;
    }
    // stone or boards: one surface cut round the openings
    const its = items.slice().sort((a, b) => a.at - b.at), mat = o.mat || (style === 'boards' ? 'planks' : 'rubble'); let x = 0;
    const face = () => g.mat(mat, { tint: o.tint, ao: 1 });
    const vert = style === 'boards' ? { u: [0, 1, 0], v: [1, 0, 0] } : {};
    const pn = (x0, x1, y0, y1) => { if (x1 - x0 < 0.01 || y1 - y0 < 0.01) return; const a = (y) => 0.7 + 0.3 * LR.sm(0, 0.6, y) * LR.sm(h + 0.05, h - 0.7, y); g.poly([[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]], Object.assign({ ao: [a(y0), a(y0), a(y1), a(y1)] }, vert)); };
    for (const it of its) {
      const isDoor = it.type === 'door', w = it.w || (isDoor ? 1.15 : 0.9), hh = it.h || (isDoor ? 2.1 : 1.2), cy = isDoor ? hh / 2 : it.y || h * 0.55, x0 = it.at - w / 2, x1 = it.at + w / 2, top = isDoor ? hh : cy + hh / 2, archTop = it.arch ? top : top;
      face(); pn(x, x0, 0, h); if (!isDoor) pn(x0, x1, 0, cy - hh / 2); pn(x0, x1, archTop, h);
      if (it.arch) { face(); const n = 8, yb = top - w / 2; for (let i = 0; i < n; i++) { const a0 = (i / n) * Math.PI, a1 = ((i + 1) / n) * Math.PI, k = it.point && !isDoor ? 1.35 : 1; const p0 = [it.at + Math.cos(a0) * w / 2, yb + Math.sin(a0) * w / 2 * k, 0], p1 = [it.at + Math.cos(a1) * w / 2, yb + Math.sin(a1) * w / 2 * k, 0]; const tp = Math.max(top, yb + w / 2 * k); g.poly([p0, [p0[0], tp, 0], [p1[0], tp, 0], p1], vert); if (k > 1) { /* the wall above a pointed head */ } } if (it.point && !isDoor) pn(x0, x1, yb + (w / 2) * 1.35, h); }
      if (isDoor) { A.door(g, it.at, Object.assign({ frame: style === 'boards' ? 'timber' : 'ashlar', rng: r }, it)); if (it.lantern !== false) A.lantern(g, x1 + 0.45, Math.min(h - 0.3, hh + 0.2), {}); }
      else A.window(g, it.at, cy, Object.assign({ frame: style === 'boards' ? 'timber' : 'ashlar', depth: style === 'boards' ? 0.1 : 0.22, rng: r }, it));
      x = x1;
    }
    face(); pn(x, len, 0, h);
    if (style === 'stone' && !o.skipCorners) {                                                 // quoins: dressed blocks binding the corners
      g.mat('ashlar', { tint: o.quoinTint, soft: 0.22 }); const ch = 0.34; let k = o.quoinPhase || 0;
      // no two blocks alike: lengths, heights and how far each stands proud all wander, so the corner is not a ruled edge
      for (let y = 0; y + ch <= h + 0.01; y += ch, k++) { const l0 = (k % 2 ? 0.5 : 0.3) + (r() - 0.5) * 0.12, l1 = (k % 2 ? 0.3 : 0.5) + (r() - 0.5) * 0.12, p0 = (r() - 0.5) * 0.035, p1 = (r() - 0.5) * 0.035, h0 = ch - 0.02 - r() * 0.035, h1 = ch - 0.02 - r() * 0.035;
        g.box(l0 / 2 - 0.02 - r() * 0.02, y + ch / 2, -0.06 + p0, l0, h0, 0.2, { grain: 'x', skip: '-z' }); g.box(len - l1 / 2 + 0.02 + r() * 0.02, y + ch / 2, -0.06 + p1, l1, h1, 0.2, { grain: 'x', skip: '-z' }); }
    }
    if (style === 'boards') { g.mat('timber', { tint: o.timberTint, soft: 0.25 }); g.box(0, h / 2, -0.04, 0.16, h, 0.16, { grain: 'y', skip: '+y-y' }); g.box(len, h / 2, -0.04, 0.16, h, 0.16, { grain: 'y', skip: '+y-y' }); g.box(len / 2, h - 0.07, -0.03, len, 0.14, 0.14, { grain: 'x', skip: '+x-x' }); }
  };
  // run fn in the frame of one side of a w × d box: '+z' front, '-z' back, '+x' right, '-x' left; out = how far the wall stands out
  A.side = (g, side, w, d, y, out, fn) => {
    const hw = w / 2 + (side[1] === 'x' ? out : 0), hd = d / 2 + (side[1] === 'z' ? out : 0);
    if (side === '+z') g.at(-w / 2, y, hd, 0); else if (side === '-z') g.at(w / 2, y, -hd, Math.PI); else if (side === '+x') g.at(hw, y, d / 2, Math.PI / 2); else g.at(-hw, y, -d / 2, -Math.PI / 2);
    fn(side[1] === 'z' ? w : d); g.pop();
  };

  // ── a gable roof over a w × d box whose wall tops are at y.  ridge along x.  returns { ridgeY, slope } ──────────
  // o: { pitch (deg), mat, tint, eave: overhang at the eaves, verge: overhang at the gables, thick, sag, rafters, timberTint, gables: 'timber'|'stone'|'boards'|null, gableTint }
  A.gableRoof = (g, w, d, y, o = {}) => {
    const r = o.rng || LR.rng(o.seed || 9), pitch = (o.pitch || 50) * deg, tan = Math.tan(pitch), cos = Math.cos(pitch), sin = Math.sin(pitch), eave = o.eave === undefined ? 0.55 : o.eave, verge = o.verge === undefined ? 0.4 : o.verge, mat = o.mat || 'tiles';
    const th = o.thick || (mat === 'thatch' ? 0.34 : 0.1), hd = d / 2, ridgeY = y + hd * tan, sag = o.sag === undefined ? 0.05 + r() * 0.11 : o.sag, nx = Math.max(2, Math.ceil((w + verge * 2) / 1.4));
    const X = (i) => -w / 2 - verge + (i / nx) * (w + verge * 2), dip = (i) => -sag * Math.sin((i / nx) * Math.PI) * (0.6 + 0.4 * r()) - (mat === 'thatch' ? 0.03 * r() : 0);
    const dips = []; for (let i = 0; i <= nx; i++) dips.push(dip(i));
    for (const s of [1, -1]) {
      // top surface: from the eave edge up to the ridge, in strips along the ridge
      const ez = s * (hd + eave), ey = y - eave * tan, n = [0, cos, s * sin];
      for (let i = 0; i < nx; i++) {
        const x0 = X(i), x1 = X(i + 1), d0 = dips[i], d1 = dips[i + 1];
        const a = [x0, ey + th / cos + d0 * 0.4, ez], b = [x1, ey + th / cos + d1 * 0.4, ez], c = [x1, ridgeY + th / cos + d1, 0], e = [x0, ridgeY + th / cos + d0, 0];
        g.mat(mat, { tint: o.tint, uv: i === 0 }); g.poly(s > 0 ? [a, b, c, e] : [b, a, e, c], { hint: n });
      }
      // the edge at the eave, and the soffit boards under the overhang
      g.mat(mat === 'thatch' ? 'thatch' : 'planks', { tint: mat === 'thatch' ? o.tint : '#b8a898', ao: 0.7 });
      g.poly([[X(0), ey, ez], [X(nx), ey, ez], [X(nx), ey + th / cos, ez], [X(0), ey + th / cos, ez]], { hint: [0, -0.3, s] });
      g.mat('planks', { tint: '#b0a090', ao: 0.55 }); g.poly([[X(0), ey, ez], [X(nx), ey, ez], [X(nx), ridgeY, 0], [X(0), ridgeY, 0]], { hint: [0, -cos, -s * sin] });
      // gable-end edges (the verge)
      for (const gx of [X(0), X(nx)]) { g.mat(mat === 'thatch' ? 'thatch' : 'timber', { tint: mat === 'thatch' ? o.tint : o.timberTint, ao: 0.8 }); g.poly([[gx, ey, ez], [gx, ey + th / cos, ez], [gx, ridgeY + th / cos + (gx < 0 ? dips[0] : dips[nx]), 0], [gx, ridgeY, 0]], { hint: [gx < 0 ? -1 : 1, 0, 0] }); }
      // rafter tails under the eave
      if (o.rafters !== false && mat !== 'thatch') { g.mat('timber', { tint: o.timberTint, soft: 0.2, ao: 0.6 }); const nr = Math.max(2, Math.round(w / 0.75)); for (let i = 0; i <= nr; i++) { const x = -w / 2 + 0.1 + (i / nr) * (w - 0.2); g.beam([x, y - 0.02, s * (hd - 0.05)], [x, ey + 0.03, s * (hd + eave - 0.06)], 0.09, 0.13, { up: [0, 1, 0] }); } }
      // barge boards on the gables
      if (o.barge !== false && mat !== 'thatch') { g.mat('timber', { tint: o.timberTint, soft: 0.2 }); for (const gx of [X(0) + 0.03, X(nx) - 0.03]) g.beam([gx, ey + 0.02, ez], [gx, ridgeY + 0.02, 0], 0.07, 0.2, { up: [0, cos, s * sin] }); }
    }
    // ridge: a cap row
    g.mat(mat === 'thatch' ? 'thatch' : mat, { tint: o.ridgeTint || o.tint });
    const rp = []; for (let i = 0; i <= nx; i++) rp.push([X(i), ridgeY + th / cos + dips[i] + (mat === 'thatch' ? 0.02 : 0.0), 0]);
    g.tube(rp, mat === 'thatch' ? 0.2 : 0.085, { sides: 6, caps: true });
    // the outline against the sky is never a ruled line: single cap tiles along the ridge, tile ends of uneven length at
    // the eaves and the verges (a thatch gets a shaggy fringe instead).  o.ragged: false leaves the roof clean.
    if (o.ragged !== false) {
      const thatch = mat === 'thatch', dipAt = (x) => { const f = LR.clamp((x - X(0)) / (X(nx) - X(0)), 0, 1) * nx, i = Math.min(nx - 1, Math.floor(f)); return dips[i] + (dips[i + 1] - dips[i]) * (f - i); };
      if (!thatch) for (let x = X(0) + 0.2; x < X(nx) - 0.1; x += 0.36 + r() * 0.05) {                 // ridge tiles, each a little askew, one in a dozen slipped
        const slip = r() < 0.08 ? -0.035 : 0; g.mat(mat, { tint: A.vary(o.ridgeTint || o.tint || '#808080', r, 0.07), uv: false });
        g.at(x, ridgeY + th / cos + dipAt(x) + 0.085 + slip, (r() - 0.5) * 0.03, (r() - 0.5) * 0.09, 0, (r() - 0.5) * 0.08); g.box(0, 0, 0, 0.37, 0.07, 0.25, { skip: '-y' }); g.pop(); }
      for (const s of [1, -1]) {
        const ez = s * (hd + eave), ey = y - eave * tan, up = [0, cos, s * sin], us = [0, sin, -s * cos], step = thatch ? 0.16 : 0.2;
        for (let x = X(0) + step / 2; x < X(nx); x += step * (0.9 + 0.2 * r())) {                       // eave: tile butts (or straw) of uneven length
          const ext = thatch ? 0.04 + r() * 0.2 : r() < 0.06 ? 0.13 : 0.015 + r() * 0.06, lift = (thatch ? -0.1 : 0.012) + r() * 0.014, E = [x, ey + th / cos + dipAt(x) * 0.4, ez], k = 0.16;
          g.mat(mat, { tint: A.vary(o.tint || '#808080', r, thatch ? 0.12 : 0.08), uv: false });
          g.beam([E[0], E[1] + us[1] * k + up[1] * lift, E[2] + us[2] * k + up[2] * lift], [E[0], E[1] - us[1] * ext + up[1] * (lift - 0.01), E[2] - us[2] * ext + up[2] * (lift - 0.01)], step * (thatch ? 1.15 : 0.92), thatch ? 0.16 : 0.034, { up }); }
        if (!thatch) for (const gx of [X(0), X(nx)]) { const sg = gx < 0 ? -1 : 1, L = Math.hypot(hd + eave, ridgeY - ey), nt = Math.round(L / 0.26);   // verge: tiles that overhang the gable unevenly
          for (let i = 0; i < nt; i++) { const t = (i + 0.5) / nt, yy = ey + th / cos + (ridgeY - ey + (sg < 0 ? dips[0] : dips[nx])) * t, zz = ez * (1 - t), ext = r() < 0.05 ? 0.1 : 0.012 + r() * 0.045, lift = 0.014 + r() * 0.012;
            g.mat(mat, { tint: A.vary(o.tint || '#808080', r, 0.08), uv: false }); g.beam([gx - sg * 0.14, yy + up[1] * lift, zz + up[2] * lift], [gx + sg * ext, yy + up[1] * lift, zz + up[2] * lift], 0.25, 0.034, { up }); } }
      }
    }
    // the gable walls
    if (o.gables) for (const s of [-1, 1]) {
      g.at(s * w / 2, y, s < 0 ? -hd : hd, s < 0 ? -Math.PI / 2 : Math.PI / 2);
      const gh = hd * tan;
      if (o.gables === 'timber') {
        g.mat('plaster', { tint: o.gableTint }); g.poly([[0, 0, -0.02], [d, 0, -0.02], [d / 2, gh, -0.02]], { ao: [0.85, 0.85, 0.6] });
        g.mat('timber', { tint: o.timberTint, soft: 0.25 }); const zc = -0.055;
        g.beam([0, 0.09, zc], [d, 0.09, zc], 0.2, 0.18, { caps: false }); g.beam([0.02, 0.05, zc], [d / 2, gh - 0.04, zc], 0.2, 0.17, { up: [0, 0, 1], caps: false }); g.beam([d - 0.02, 0.05, zc], [d / 2, gh - 0.04, zc], 0.2, 0.17, { up: [0, 0, 1], caps: false });
        const ns = Math.max(1, Math.round(d / 1.5)); for (let i = 1; i < ns; i++) { const x = (i / ns) * d, top = (1 - Math.abs(x - d / 2) / (d / 2)) * gh; if (top > 0.5) g.beam([x, 0.1, zc], [x, top - 0.12, zc], 0.2, 0.15, { up: [0, 0, 1], caps: false }); }
        if (gh > 2.2) { g.beam([d * 0.25, gh * 0.5, zc], [d * 0.75, gh * 0.5, zc], 0.2, 0.15, { caps: false }); if (o.atticWindow !== false) A.window(g, d / 2, gh * 0.28 + 0.2, { w: 0.55, h: 0.6, depth: 0.1, tint: o.timberTint, rng: r, shutters: null }); }
      } else {
        g.mat(o.gables === 'boards' ? 'planks' : o.gableMat || 'rubble', { tint: o.gableTint }); g.poly([[0, 0, 0], [d, 0, 0], [d / 2, gh, 0]], Object.assign({ ao: [0.85, 0.85, 0.6] }, o.gables === 'boards' ? { u: [0, 1, 0], v: [1, 0, 0] } : {}));
        if (gh > 2 && o.atticWindow !== false) A.window(g, d / 2, gh * 0.3, { w: 0.5, h: 0.7, depth: 0.16, frame: o.gables === 'boards' ? 'timber' : 'ashlar', rng: r, arch: o.gables !== 'boards' });
      }
      g.pop();
    }
    return { ridgeY: ridgeY + th / cos, tan, eaveY: y - eave * tan };
  };

  // a brick stack with a cap and pots; registers a smoke point.  at (x, z) in the building frame, from y0 to y1
  A.chimney = (g, x, z, y0, y1, o = {}) => {
    const s = o.size || 0.62; g.mat(o.mat || 'brick', { tint: o.tint, soft: 0.12 }); g.box(x, (y0 + y1) / 2, z, s, y1 - y0, s * 0.82, { grain: 'x', skip: '-y' });
    g.mat('ashlar', { soft: 0.2 }); g.box(x, y1 + 0.05, z, s + 0.14, 0.1, s * 0.82 + 0.14);
    g.mat('tiles', { tint: '#d8c8b8' }); for (const dx of [-0.14, 0.14]) g.lathe(x + dx, z, [[0.085, y1 + 0.1], [0.075, y1 + 0.34], [0.09, y1 + 0.36]], { sides: 7 });
    const p = new T.Vector3(x, y1 + 0.4, z).applyMatrix4(g.m); if (o.smoke !== false) LR.world.smokers.push({ x: p.x, y: p.y, z: p.z, amount: o.smoke || 1 });
  };
  // a small gabled dormer sitting on the front (+z) or back slope
  A.dormer = (g, x, d, yEave, tan, side, o = {}) => {
    const w = o.w || 1.25, h = o.h || 1.15, zs = side * (d / 2) * 0.62, yb = yEave + (d / 2 - Math.abs(zs)) * tan, depth = (h + w * 0.45) / tan;
    g.at(x, yb - 0.05, zs, side > 0 ? 0 : Math.PI);
    g.mat('plaster', { tint: o.tint }); g.box(0, h / 2, -depth / 2 + 0.12, w, h, depth, { skip: '-y-z+z' });
    g.mat('timber', { tint: o.timberTint, soft: 0.25 }); g.box(-w / 2, h / 2, 0.1, 0.12, h, 0.12, { grain: 'y' }); g.box(w / 2, h / 2, 0.1, 0.12, h, 0.12, { grain: 'y' }); g.box(0, h, 0.1, w + 0.12, 0.12, 0.12, { grain: 'x' });
    g.mat('plaster', { tint: o.tint }); g.poly([[-w / 2, 0, 0.1], [w / 2, 0, 0.1], [w / 2, h, 0.1], [-w / 2, h, 0.1]]); g.poly([[-w / 2, h, 0.1], [w / 2, h, 0.1], [0, h + w * 0.42, 0.1]]);
    A.window(g, 0, h * 0.52, { w: w * 0.5, h: h * 0.62, depth: 0.08, tint: o.timberTint, rng: o.rng, shutters: null });
    g.at(0, 0, 0.1 - 0.0, 0); const rw = w / 2 + 0.16, rh = (w / 2 + 0.16) * 0.84;
    for (const s of [-1, 1]) { g.mat(o.mat || 'tiles', { tint: o.roofTint }); g.poly([[s * rw, h - 0.12, 0.2], [0, h + rh - 0.12, 0.2], [0, h + rh - 0.12, -depth], [s * rw, h - 0.12, -depth]], { hint: [s * 0.6, 0.8, 0] }); g.mat('planks', { tint: '#b0a090', ao: 0.55 }); g.poly([[s * rw, h - 0.14, 0.2], [0, h + rh - 0.14, 0.2], [0, h + rh - 0.14, -depth * 0.3], [s * rw, h - 0.14, -depth * 0.3]], { hint: [-s * 0.6, -0.8, 0] }); }
    g.pop(); g.pop();
  };

  // ── a house ─────────────────────────────────────────────────────────────────────────────────────────────────────
  // o: { x, z, yaw, w, d, floors, floorH, plinth, ground:'stone'|'timber'|'boards', upper:'timber'|'boards'|'stone', jetty,
  //      roof:{ mat, pitch, tint, eave, verge }, plaster, timber, shutters, stone, door:{ side, at }, windows:{ front, back, sides } per floor,
  //      chimneys:[[fx, fz]] (fractions −.5….5), dormers, boxes (flower boxes), seed, y (site height; default levels the ground) }
  A.house = (o) => {
    const r = LR.rng(o.seed || 'house' + o.x + ':' + o.z), g = o.geo || new LR.Geo(8192), w = o.w || 8, d = o.d || 6.5, floors = o.floors || 2, fh = o.floorH || 2.75, pl = o.plinth === undefined ? 0.45 : o.plinth, jet = o.jetty === undefined ? 0.3 : o.jetty;
    const y0 = o.y !== undefined ? o.y : LR.land.level(o.x, o.z, w / 2 + 1.2, d / 2 + 1.2, o.yaw || 0);
    if (o.apron !== false) LR.land.apron(o.x, o.z, w / 2, d / 2 + (o.jetty === undefined ? 0.3 : o.jetty), o.yaw || 0);
    if (o.garden !== false) LR.land.border(o.x, o.z, w / 2 + 1.2, d / 2 + 1.5, o.yaw || 0, { width: 2.4, flowers: o.garden === undefined ? 0.5 : o.garden });
    const plaster = o.plaster || r.pick(['#ffffff', '#f6efdf', '#f2e6cf', '#efe9dc', '#ecdcc0', '#f4e4d2']), timber = o.timber || r.pick(['#ffffff', '#e2d6c8', '#d2c4b4', '#f0e2d0', '#c2b6aa']), shut = o.shutters === undefined ? r.pick(['#5f8a58', '#5f7f9e', '#a24a3c', '#8a7446', '#4f7a7c', '#b08a3c']) : o.shutters;
    const roof = Object.assign({ mat: 'tiles', pitch: 50 + r() * 6 }, o.roof || {});
    // no old house stands plumb: each leans a little its own way (o.lean: [pitch, roll] in radians, or 0 for a new one)
    { const lr = LR.rng('lean' + (o.seed || o.x + ':' + o.z)), ln = o.lean === 0 ? [0, 0] : o.lean || [(lr() - 0.5) * 0.022, (lr() - 0.5) * 0.022]; g.at(o.x, y0, o.z, o.yaw || 0, ln[0], ln[1]); }
    // the plinth the house stands on
    g.mat(o.plinthMat || 'rubble', { tint: o.stone }); g.aoFn = (x, y) => 0.6 + 0.4 * LR.sm(-0.2, 0.5, y);
    g.box(0, pl / 2 - 0.3, 0, w + 0.14, pl + 0.6, d + 0.14, { skip: '-y', grain: 'x' }); g.aoFn = null;
    const door = Object.assign({ side: '+z', at: 0.5 }, o.door || {});
    let y = pl; const styleOf = (f) => (f === 0 ? o.ground || 'stone' : o.upper || 'timber');
    for (let f = 0; f < floors; f++) {
      const st = styleOf(f), out = f > 0 ? jet * Math.min(f, 2) : 0, wf = w + (f > 0 ? 0 : 0), h = fh - (f > 0 ? 0.12 : 0);
      for (const side of ['+z', '-z', '+x', '-x']) {
        const isZ = side[1] === 'z', so = isZ ? out : 0;
        A.side(g, side, wf, d, y, so, (len) => {
          const items = [], nbay = Math.max(1, Math.round(len / 1.35)), bw = len / nbay; const want = (o.windows && o.windows[side] !== undefined ? o.windows[side] : isZ ? 0.62 : 0.42);
          let doorBay = -1; if (f === 0 && door.side === side) { doorBay = LR.clamp(Math.floor(door.at * nbay), 0, nbay - 1); items.push(Object.assign({ type: 'door', at: (doorBay + 0.5) * bw, seed: r.int(999) }, door)); }
          for (let b = 0; b < nbay; b++) { if (b === doorBay) continue; const edge = b === 0 || b === nbay - 1; if (r() < want * (edge && nbay > 3 ? 0.5 : 1) * (f === 0 && st === 'stone' ? 0.8 : 1)) items.push({ type: 'window', at: (b + 0.5) * bw, w: st === 'stone' ? 0.8 : 0.82, h: st === 'stone' ? 1.05 : 1.15, y: h * (st === 'stone' ? 0.56 : 0.54), shutters: r() < 0.8 ? shut : null, box: o.boxes !== false && f > 0 && isZ && r() < 0.45, seed: r.int(999) }); }
          A.wall(g, len, h, items, { style: st === 'stone' ? 'stone' : st, mat: st === 'stone' ? o.groundMat || 'rubble' : undefined, tint: st === 'timber' ? plaster : st === 'stone' ? o.stone : o.boardTint || '#7d6650', timberTint: timber, quoinPhase: isZ ? 0 : 1, rng: r, bay: 1.35, skipCorners: st === 'timber' && !isZ });
        });
      }
      // the jetty: joist ends carrying the floor above
      if (f > 0 && jet > 0 && f <= 2) { g.mat('timber', { tint: timber, soft: 0.2, ao: 0.6 }); const nj = Math.round(w / 0.6); for (const s of [-1, 1]) for (let i = 0; i <= nj; i++) { const x = -w / 2 + (i / nj) * w; g.box(x, y - 0.1, s * (d / 2 + out / 2 + 0.02), 0.13, 0.17, out + 0.14, { grain: 'z' }); } g.mat('planks', { tint: '#b0a090', ao: 0.55 }); for (const s of [-1, 1]) g.poly([[-w / 2, y - 0.02, s * d / 2], [w / 2, y - 0.02, s * d / 2], [w / 2, y - 0.02, s * (d / 2 + out)], [-w / 2, y - 0.02, s * (d / 2 + out)]], { hint: [0, -1, 0] }); }
      y += h + (f < floors - 1 ? 0.12 : 0);
      if (f < floors - 1) { g.mat('timber', { tint: timber, soft: 0.2 }); const o2 = jet * Math.min(f + 1, 2); g.box(0, y - 0.06, 0, w + 0.1, 0.14, d + o2 * 2 + 0.1, { grain: 'x', skip: '+y-y' }); }
    }
    const topOut = floors > 1 ? jet * Math.min(floors - 1, 2) : 0, dRoof = d + topOut * 2;
    const R = A.gableRoof(g, w, dRoof, y, Object.assign({ gables: styleOf(floors - 1) === 'stone' ? 'stone' : styleOf(floors - 1), gableTint: styleOf(floors - 1) === 'timber' ? plaster : styleOf(floors - 1) === 'stone' ? o.stone : o.boardTint, gableMat: o.groundMat, timberTint: timber, rng: r }, roof));
    for (const c of o.chimneys || [[r.pick([-0.28, 0.25, 0.3]), r.pick([-0.18, 0.15])]]) { const cx = c[0] * w, cz = c[1] * dRoof; A.chimney(g, cx, cz, y + (dRoof / 2 - Math.abs(cz)) * R.tan - 0.4, R.ridgeY + 0.75 + r() * 0.3, { smoke: c[2] }); }
    const nd = o.dormers === undefined ? (w > 8.5 && r() < 0.5 ? 1 : 0) : o.dormers; for (let i = 0; i < nd; i++) A.dormer(g, (nd === 1 ? 0 : (i / (nd - 1) - 0.5) * w * 0.55) + (r() - 0.5) * 0.4, dRoof, y, R.tan, door.side === '-z' ? -1 : 1, { tint: plaster, timberTint: timber, mat: roof.mat, roofTint: roof.tint, rng: r });
    const top = R.ridgeY; g.pop();
    const yaw = o.yaw || 0;
    if (!o.geo) LR.world.add(g, { name: o.name || 'house' });
    LR.world.solidBox(o.x, o.z, w / 2 + 0.25, dRoof / 2 + 0.1, yaw);
    // where the door is, in the world (for paths, signs, the walker's spawn)
    const dl = door.side === '+z' ? [(door.at - 0.5) * w, d / 2] : door.side === '-z' ? [-(door.at - 0.5) * w, -d / 2] : door.side === '+x' ? [w / 2, -(door.at - 0.5) * d] : [-w / 2, (door.at - 0.5) * d];
    const c = Math.cos(yaw), s = Math.sin(yaw), toW = (lx, lz) => [o.x + lx * c + lz * s, o.z - lx * s + lz * c];
    return { g, y: y0, w, d: dRoof, top: y0 + top, door: toW(dl[0], dl[1]), toW, plaster, timber, roof };
  };
}

/* pixel-world-compiler · fw-world.js
   The world model: analytic fields (elevation, water depth, moisture, trail distance), a ground raster with
   real relief (risers show as faces), affordance-gated placement of flora, sited places, and the bake.
   Terrain is queried from functions, never painted. A world is a table: FW.compile(world) reads it.

   Coordinates: X metres east, Y metres north (0 = the near edge). Static things project cabinet:
   screen row = (Ymax − Y)·P/2 − z·P. Every ground pixel remembers its Y and the sun term it saw. */
(function () {
  'use strict';
  const FW = window.FW, P = FW.SCALE.PX_PER_M;

  /* ---------- fields from the plan ---------- */
  function makeFields(W) {
    const T = W.terrain || {}, seed = W.seed || 1, [Wm, Dm] = W.size;
    const relief = T.relief ?? 2, sc = T.scale ?? 40;
    const river = T.river, lakes = T.lakes, ter = T.terraces;
    const trails = [];
    const segDist = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = FW.clamp(((x - a[0]) * dx + (y - a[1]) * dy) / L, 0, 1); return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); };
    function at(X, Y) {
      let elev = (FW.fbm(X, Y, sc, 3, seed) - 0.5) * 2 * relief;
      if (T.rise) elev += T.rise * (Y / Dm); // a hillside rising away from the camera
      let depth = 0, shore = 99, kind = '', frozen = false, step = 0, bund = 0;
      if (river) {
        const cy = river.y + river.amp * Math.sin((2 * Math.PI * X) / river.wave + (river.phase || 0)) + river.amp * 0.35 * Math.sin((2 * Math.PI * X) / (river.wave * 0.43) + 1.7);
        const d = Math.abs(Y - cy) - (FW.fbm(X, 0, 9, 2, seed + 5) - 0.5) * river.width * 0.3, hw = river.width / 2;
        const valley = FW.smooth(hw, hw + (river.valley ?? 14), d);
        elev = FW.lerp(-(river.bank ?? 0.4), elev, valley);
        shore = d - hw;
        if (d < hw) { depth = river.depth * (1 - (d / hw) ** 2); kind = 'river'; frozen = !!river.frozen; elev = -(river.bank ?? 0.4) - 0.05; }
      }
      if (lakes) {
        const n = FW.fbm(X, Y, lakes.scale ?? 30, 3, seed + 11), e = lakes.level - n;
        shore = Math.min(shore, -e * (lakes.scale ?? 30) * 0.8);
        if (e > 0) { depth = Math.max(depth, Math.min(lakes.depth, e * (lakes.scale ?? 30) * 0.5)); kind = 'lake'; frozen = !!lakes.frozen; elev = Math.min(elev, -0.2); }
      }
      if (ter) {
        /* paddies: the slope is cut into flats; each flat is flooded behind a bund on its downhill edge */
        const s = ter.step, raw = elev + (ter.warp ? (FW.fbm(X, Y, ter.warp, 2, seed + 3) - 0.5) * s * 1.6 : 0), lev = Math.floor(raw / s), frac = raw / s - lev;
        step = lev; const within = ter.from == null || (Y > ter.from && Y < (ter.to ?? 1e9));
        if (within && elev > (ter.below ?? -1e9)) {
          elev = lev * s;
          if (frac < (ter.bund ?? 0.06)) { bund = 1; elev += ter.bundH ?? 0.25; }
          else { depth = ter.depth ?? 0.08; kind = 'paddy'; }
        }
      }
      let trail = 99; for (const t of trails) for (let i = 1; i < t.pts.length; i++) trail = Math.min(trail, segDist(X, Y, t.pts[i - 1], t.pts[i]) - t.width / 2);
      const moist = FW.clamp(1 - shore / 25, 0, 1) * 0.6 + FW.fbm(X, Y, 17, 2, seed + 21) * 0.4;
      return { X, Y, elev, depth, kind, frozen, shore, moist, trail, step, bund, n: FW.fbm(X, Y, 3.1, 2, seed + 31) };
    }
    return { at, trails, Wm, Dm };
  }
  FW.makeFields = makeFields;

  /* ---------- compile a world ---------- */
  FW.compile = function (W) {
    const t0 = performance.now();
    FW.floors.length = 0;
    const sun = FW.sun(W.sun), pal = FW.buildPalette(W, sun), res = FW.makeResolver(pal);
    const ids = {}; for (const k in pal.ramps) ids[k] = pal.ramps[k].id;
    const ctx = { m: (k) => { if (!(k in ids)) throw new Error(`material '${k}' is not in world.materials`); return ids[k]; }, pal, sun, W };
    const F = makeFields(W), [Wm, Dm] = W.size, rng = FW.rng(W.seed || 1);
    const maxZ = (W.terrain?.relief ?? 2) + (W.terrain?.rise ?? 0) + 2;
    const GW = Math.round(Wm * P), top = Math.ceil(maxZ * P) + 40, GH = Math.round((Dm * P) / 2) + top + 4;
    const rowOf = (X, Y, z) => top + ((Dm - Y) * P) / 2 - z * P;

    /* --- places: site each by its score over candidates, a pure search --- */
    const places = {};
    for (const pl of W.places || []) {
      let best = null;
      const step = pl.grid ?? 4;
      for (let Y = 6; Y < Dm - 6; Y += step) for (let X = 6; X < Wm - 6; X += step) {
        const f = F.at(X, Y); if (f.depth > 0) continue;
        const sc = pl.site(f, X, Y); if (sc == null || !isFinite(sc)) continue;
        /* flat enough to build: elevation spread over the footprint */
        const r = pl.clear ?? 8; let lo = 1e9, hi = -1e9, wet = false;
        for (const [dx, dy] of [[-r, 0], [r, 0], [0, -r * 0.6], [0, r * 0.6], [0, 0]]) { const g = F.at(X + dx, Y + dy); lo = Math.min(lo, g.elev); hi = Math.max(hi, g.elev); wet = wet || g.depth > 0; }
        if (wet || hi - lo > (pl.flat ?? 0.8)) continue;
        if (!best || sc > best.sc) best = { X, Y, sc };
      }
      if (!best) throw new Error(`place '${pl.id}': no site passes its rule — loosen the site score or the flat limit`);
      places[pl.id] = { ...pl, X: best.X, Y: best.Y, score: best.sc };
    }
    const where = (a) => (Array.isArray(a) && typeof a[0] === 'string' ? [places[a[0]].X + (a[1] || 0), places[a[0]].Y + (a[2] || 0)] : a);
    for (const tr of W.trails || []) F.trails.push({ ...tr, pts: tr.pts.map(where) });

    /* --- the ground raster: march each column from the near edge to the far one, a row buffer keeps the
       highest row drawn so far; rows a step uncovers between two samples are a riser (a front face) --- */
    const n = GW * GH;
    const g = { W: GW, H: GH, top, mat: new Uint8Array(n), lit: new Uint8Array(n), shade: new Uint8Array(n), Y: new Float32Array(n).fill(-1),
      water: new Uint8Array(n), wdepth: new Float32Array(n), rule: new Uint8Array(n) };
    const rules = W.ground;
    const pick = (f) => { for (const r of rules) if (r[1](f)) return r; return rules[rules.length - 1]; };
    const L = sun.L, dY = 1 / (P * 1.2);
    for (let x = 0; x < GW; x++) {
      const X = (x + 0.5) / P; let hiRow = GH; let prevE = null;
      for (let Y = 0; Y <= Dm; Y += dY) {
        const f = F.at(X, Y), z = f.depth > 0 && !f.frozen ? f.elev : f.elev, row = Math.floor(rowOf(X, Y, z));
        if (row >= hiRow) { prevE = f.elev; continue; }
        /* the normal of the ground from the gradient, in metres */
        const ex = F.at(X + 0.3, Y).elev - F.at(X - 0.3, Y).elev, ey = F.at(X, Y + 0.3).elev - F.at(X, Y - 0.3).elev;
        const nG = FW.normalize([-ex / 0.6, -ey / 0.6, 1]);
        const r = pick(f), mat = ctx.m(r[0]), o = r[2] || {};
        for (let yy = Math.max(0, row); yy < hiRow; yy++) {
          const riser = yy > row && prevE != null && f.elev - prevE > 0.05;
          const i = yy * GW + x;
          const nrm = riser ? FW.N.FRONT : nG;
          /* a riser is a cut face of soil: never water. It takes the rule's riser material, or the last rule's */
          const rmat = riser ? ctx.m(o.riser || (W.materials[r[0]].kind === 'water' ? rules[rules.length - 1][0] : r[0])) : mat;
          const ramp = pal.byId[rmat];
          /* surface grain: smooth noise, so value changes run along contours (wind ripples, ruts), never as square cells */
          let ao = 1 - (o.grain ?? 0.1) * FW.noise(X * (o.grainScale ?? 1.2), Y * (o.grainScale ?? 1.2) * 1.7, 17);
          /* a riser darkens toward its foot (less sky reaches the base of a wall), with no column grain */
          if (riser) ao = (o.riserAo ?? 0.95) * (1 - 0.3 * (yy - row) / Math.max(1, hiRow - row));
          if (o.ao) ao *= o.ao(f);
          g.mat[i] = rmat; g.Y[i] = Y; g.rule[i] = rules.indexOf(r) + 1;
          if (ramp.kind === 'water') {
            const dmax = W.materials[r[0]].depth || 2, u = 1 - FW.clamp(f.depth / dmax, 0, 1);
            g.lit[i] = g.shade[i] = res(mat, u, 0, 1, x, yy); g.water[i] = 1; g.wdepth[i] = f.depth;
          } else {
            const ndl = Math.max(0, nrm[0] * L[0] + nrm[1] * L[1] + nrm[2] * L[2]);
            g.lit[i] = res(g.mat[i], ao, ndl, 1, x, yy); g.shade[i] = res(g.mat[i], ao * 0.92, ndl, 0, x, yy);
          }
        }
        hiRow = Math.max(0, row); prevE = f.elev;
      }
      /* beyond the far edge the last surface continues, so a camera at the edge never sees an unbaked band */
      if (hiRow > 0) { const j = hiRow * GW + x; for (let yy = 0; yy < hiRow; yy++) { const i = yy * GW + x;
        g.mat[i] = g.mat[j]; g.lit[i] = g.lit[j]; g.shade[i] = g.shade[j]; g.Y[i] = g.Y[j]; g.water[i] = g.water[j]; g.rule[i] = g.rule[j]; } }
    }
    /* tufts: short upright strokes painted far-to-near over the ground (sedge through snow, rice in a paddy) */
    for (const r of rules) {
      const tf = r[2]?.tuft; if (!tf) continue;
      const rid = rules.indexOf(r) + 1, tm = ctx.m(tf.mat), cell = tf.cell ?? 0.5, h = Math.max(1, FW.px(tf.h ?? 0.2));
      for (let yy = 0; yy < GH; yy++) for (let x = 0; x < GW; x++) {
        const i = yy * GW + x; if (g.rule[i] !== rid) continue;
        const Y = g.Y[i], X = (x + 0.5) / P, cx = Math.floor(X / cell), cy = Math.floor(Y / cell);
        if (FW.hash(cx, cy, 77) > (tf.density ?? 0.3)) continue;
        /* rows: true puts each tuft on its planting grid (transplanted rice); otherwise jittered in its cell */
        const jx = tf.rows ? 0.5 : FW.hash(cx, cy, 78), jy = tf.rows ? 0.5 : FW.hash(cx, cy, 79);
        if (Math.floor((jx + cx) * cell * P) !== x) continue;
        if (Math.abs(Y - (cy + jy) * cell) > 1.2 / P) continue;
        const hh = h - (FW.hash(cx, cy, 80) < 0.4 ? 1 : 0);
        for (let k = 1; k <= hh; k++) { const j = (yy - k) * GW + x; if (j < 0) break;
          const n = FW.normalize([FW.hash(cx, cy, 81) - 0.5, -0.6, 0.6]), ndl = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
          g.mat[j] = tm; g.water[j] = 0; g.lit[j] = res(tm, 0.65 + 0.35 * k / hh, ndl, 1, x, yy - k); g.shade[j] = res(tm, 0.6 + 0.3 * k / hh, ndl, 0, x, yy - k); }
      }
    }

    /* --- props (sited places) and flora (affordance-gated jittered grid) --- */
    const props = [], cache = {};
    const variant = (form, spec, k) => { const key = form + JSON.stringify(spec) + ':' + k; if (!cache[key]) cache[key] = FW.forms.make(form, spec, FW.rng((W.seed || 1) * 977 + k * 131 + key.length), ctx).resolve(res, L); return cache[key]; };
    const addProp = (form, spec, X, Y, k, extra = {}) => {
      const f = F.at(X, Y), spr = variant(form, spec, k);
      props.push({ form, spec, X, Y, z: f.elev, gx: Math.round(X * P), gy: Math.round(rowOf(X, Y, f.elev)), spr, ...extra });
    };
    const clearOf = [];
    for (const id in places) {
      const pl = places[id]; clearOf.push([pl.X, pl.Y, pl.clear ?? 8]);
      (pl.props || []).forEach((p, k) => addProp(p.form, p.spec, pl.X + p.at[0], pl.Y + p.at[1], k, { place: id, sway: p.sway, light: p.light, tag: p.tag }));
    }
    for (const p of W.props || []) { const [X, Y] = where(p.at); addProp(p.form, p.spec, X, Y, 0, { tag: p.tag, sway: p.sway }); }
    for (const fl of W.flora || []) {
      const cell = fl.cell, jit = fl.jitter ?? 0.8, nv = fl.variants ?? 4;
      for (let cy = 0; cy * cell < Dm; cy++) for (let cx = 0; cx * cell < Wm; cx++) {
        const h1 = FW.hash(cx, cy, fl.seed ?? 401), h2 = FW.hash(cx, cy, (fl.seed ?? 401) + 1), h3 = FW.hash(cx, cy, (fl.seed ?? 401) + 2);
        const X = (cx + 0.5 + (h1 - 0.5) * jit) * cell, Y = (cy + 0.5 + (h2 - 0.5) * jit) * cell;
        if (X < 1 || Y < 1 || X > Wm - 1 || Y > Dm - 1) continue;
        const f = F.at(X, Y); if (!fl.where(f)) continue;
        const dens = typeof fl.density === 'function' ? fl.density(f) : fl.density ?? 1; if (h3 > dens) continue;
        if (clearOf.some(([px, py, r]) => Math.hypot(X - px, (Y - py) * 1.4) < r)) continue;
        if (f.trail < (fl.trailGap ?? 1)) continue;
        addProp(fl.form || 'tree', fl.spec, X, Y, Math.floor(FW.hash(cx, cy, 9) * nv), { sway: fl.sway ?? 1, flora: fl.id });
      }
    }
    /* --- static shadows: every prop pixel throws along the one sun vector onto the ground --- */
    const sh = sun.shadow;
    const castInto = (mask, MW, MH, spr, ox, oy) => {
      for (let y = 0; y < spr.h; y++) for (let x = 0; x < spr.w; x++) {
        const i = y * spr.w + x; if (!spr.mat[i]) continue;
        const z = spr.z[i]; if (z < 0.5) continue;
        const bx = ox + x, by = oy + y + z; // the ground under this pixel
        const x1 = Math.round(bx + sh.dx * z), y1 = Math.round(by + sh.dy * z), x2 = Math.round(bx + sh.dx * (z + 1)), y2 = Math.round(by + sh.dy * (z + 1));
        const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
        for (let k = 0; k <= steps; k++) { const xx = Math.round(FW.lerp(x1, x2, k / steps)), yy = Math.round(FW.lerp(y1, y2, k / steps));
          if (xx >= 0 && yy >= 0 && xx < MW && yy < MH) mask[yy * MW + xx] = 1; }
      }
    };
    const smask = new Uint8Array(n);
    for (const p of props) castInto(smask, GW, GH, p.spr, p.gx - p.spr.ax, p.gy - p.spr.ay);
    for (let i = 0; i < n; i++) if (smask[i] && !g.water[i]) g.lit[i] = g.shade[i];
    props.sort((a, b) => a.gy - b.gy);
    const out = { W, sun, pal, res, ctx, F, g, props, places, rowOf, P, top, castInto, ms: Math.round(performance.now() - t0), floors: FW.floors.slice() };
    out.ground = (X, Y) => { const f = F.at(X, Y); return [X * P, rowOf(X, Y, f.elev)]; };
    out.where = where;
    return out;
  };
})();

/* pixel-world-compiler · fw-run.js
   The resident scene: compiles the world table, builds the cast, and composes frames. Every frame is a pure
   function of t (seek), so stills, the tour MP4 and check.mjs see the same pixels. Every pixel comes out of
   the palette LUT; nothing here writes a colour of its own.

   Page contract: window.seek(t) · DURATION · FPS · PIXEL {W,H,scale} · __ready · FW_CHECK().
   Query: ?render=1 (no live loop) · ?t=12 (frozen) · ?sheet=cast (the cast sheet) · ?pass=flat (no light:
   every material at its middle rung) · ?off=shadows,reflect,particles,sway,clouds. Live: arrows/WASD walk
   the traveller (the camera follows); Space pauses. */
(function () {
  'use strict';
  const FW = window.FW, B = FW.body, P = FW.SCALE.PX_PER_M;
  const Q = new URLSearchParams(location.search), OFF = new Set((Q.get('off') || '').split(',').filter(Boolean));
  const VW = 480, VH = 270, FPS = 30;
  const TAU = Math.PI * 2;

  FW.world = function (W) { FW._W = W; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot(W)); else boot(W); };

  function boot(W) {
    const C = FW.compile(W), lut = C.pal.lut, g = C.g;
    FW.C = C;
    const canvas = document.querySelector('canvas') || document.body.appendChild(document.createElement('canvas'));
    const sheet = Q.get('sheet') === 'cast';
    /* --- the cast --- */
    const bodies = {}, actors = [];
    /* actors plan on the flat ground plane (no elevation); the relief lifts them at draw time */
    const [Wm, Dm] = W.size, plane = (X, Y) => [X * P, C.top + ((Dm - Y) * P) / 2];
    const gpt = (a) => { const [X, Y] = C.where(a); return plane(X, Y); };
    const liftAt = (x, y) => { const X = x / P, Y = Dm - ((y - C.top) * 2) / P; const f = C.F.at(X, Y); return f.elev * P; };
    for (const row of W.cast || []) {
      const body = B.make(row, C.ctx); bodies[row.id] = body;
      if (!row.at) continue;
      const plan = (row.plan || [['idle', 10]]).map((it) => it[0] === 'walk' ? ['walk', it[1].map(gpt), it[2]] : it[0] === 'face' ? ['face', (it[1] * Math.PI) / 180] : it);
      const a = B.actor(body, gpt(row.at), ((row.face ?? 0) * Math.PI) / 180, plan, { loop: row.loop !== false, seed: row.seed ?? actors.length + 1 });
      a.row = row; a.id = row.id; a.lift = liftAt; actors.push(a);
    }
    const byId = Object.fromEntries(actors.map((a) => [a.id, a]));
    const tour = W.tour || { duration: 20 };
    const DURATION = tour.duration;

    /* --- live traveller: input chains plans, each a pure actor from its start time --- */
    const live = { on: false, a: null, t0: 0, dir: null, plan: null };
    const pid = W.player || (tour.follow);

    /* --- particles, fires, sway, clouds: pure functions of t --- */
    const wind = W.wind || { toward: 90, speed: 3 }, wr = (wind.toward * Math.PI) / 180;
    const windPx = [Math.sin(wr) * wind.speed * P, -Math.cos(wr) * wind.speed * P * 0.5];
    const life = W.life || {};
    const id = (k) => C.ctx.m(k);

    const frame = new ImageData(sheet ? VW : VW, sheet ? 10 : VH), buf = new Uint32Array(frame.data.buffer);
    let F = { img: frame, buf, w: VW, h: VH };
    const shadowMask = new Uint8Array(VW * VH);

    function blit(Fr, spr, x0, y0, rowShift, flat) {
      const { w, h, mat, rung } = spr;
      for (let y = 0; y < h; y++) {
        const yy = y0 + y; if (yy < 0 || yy >= Fr.h) continue;
        const sx = rowShift ? rowShift(y) : 0;
        for (let x = 0; x < w; x++) {
          const i = y * w + x, m = mat[i]; if (!m) continue;
          const xx = x0 + x + sx; if (xx < 0 || xx >= Fr.w) continue;
          const L = lut[m]; Fr.buf[yy * Fr.w + xx] = L[flat ? (L.length - 1) >> 1 : rung[i]];
        }
      }
    }
    function reflect(Fr, spr, x0, y0, camX, camY, t) {
      const { w, h, mat, rung, z } = spr;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, m = mat[i]; if (!m) continue;
        const sx = x0 + x, sy = Math.round(y0 + y + 2 * z[i] + 1); if (sx < 0 || sx >= Fr.w || sy < 0 || sy >= Fr.h) continue;
        const gi = (sy + camY) * g.W + sx + camX; if (gi < 0 || gi >= g.mat.length || !g.water[gi]) continue;
        /* wind breaks the image: a row drops out on a beat set by the wind speed */
        if (wind.speed > 0.5 && FW.hash(sy + camY, Math.floor(t * (1 + wind.speed * 0.4)), 5) < 0.18 + wind.speed * 0.02) continue;
        const L = lut[m]; Fr.buf[sy * Fr.w + sx] = L[Math.max(0, rung[i] - 1)];
      }
    }
    const swayFn = (p, t) => {
      if (OFF.has('sway') || !p.sway || p.form !== 'tree') return null;
      const hpx = p.spr.h, amp = (wind.speed / 8) * p.sway * (1.2 + hpx / 40), per = 2.4 + hpx / 30, ph = (p.gx * 0.13) % TAU;
      const gust = 0.6 + 0.4 * Math.sin((TAU * t) / 9.7 + p.gx * 0.01);
      return (y) => { const f = 1 - y / hpx; return Math.round(amp * gust * Math.sin((TAU * t) / per + ph) * f * f * Math.sign(windPx[0] || 1)); };
    };
    function drawFire(Fr, fire, sx, sy, t) {
      const flame = id(fire.mat || 'flame'), n = lut[flame].length, r = Math.max(2, FW.px(fire.r ?? 0.4));
      for (let k = -r; k <= r; k++) {
        const hgt = Math.round((r * 2.2) * (1 - Math.abs(k) / (r + 1)) * (0.55 + 0.45 * FW.noise(k * 0.7, t * 6, 3)));
        for (let y = 0; y < hgt; y++) {
          const xx = sx + k + Math.round(Math.sin(t * 9 + y * 0.8) * (y / (hgt + 1)) * 1.2), yy = sy - y;
          if (xx < 0 || yy < 0 || xx >= Fr.w || yy >= Fr.h) continue;
          const inten = FW.clamp(1 - y / (hgt + 0.5) - Math.abs(k) / (r + 2) * 0.5, 0, 1);
          Fr.buf[yy * Fr.w + xx] = lut[flame][Math.min(n - 1, Math.floor(inten * n))];
        }
      }
    }
    function drawSmoke(Fr, src, sx, sy, t) {
      const mat = id(src.mat || 'smoke'), L = lut[mat], every = src.every ?? 0.7, life_ = src.life ?? 7, rise = (src.rise ?? 0.5) * P;
      for (let k = Math.floor((t - life_) / every); k <= Math.floor(t / every); k++) {
        const age = t - k * every; if (age < 0 || age > life_) continue;
        const a = age / life_, drift = Math.min(1, age / 2.5);
        const x = sx + windPx[0] * age * 0.35 * drift + (FW.hash(k, 1, 7) - 0.5) * 3, y = sy - rise * age + windPx[1] * age * 0.3 * drift;
        const r = 1 + a * (src.spread ?? 3.5), dens = 1 - a;
        for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++) {
          if ((xx - x) ** 2 + (yy - y) ** 2 > r * r || xx < 0 || yy < 0 || xx >= Fr.w || yy >= Fr.h) continue;
          /* density as ordered dither, never alpha */
          if (FW.hash(xx, yy, 3) * 0.6 + (((xx + yy) & 1) ? 0.4 : 0) > dens * 0.9) continue;
          Fr.buf[yy * Fr.w + xx] = L[Math.min(L.length - 1, 1 + ((yy - y) < 0 ? 1 : 0))];
        }
      }
    }
    function drawDrift(Fr, d, camX, camY, t) {
      /* blown or falling particles: a fixed population, each wrapping across the view on the wind */
      const L = lut[id(d.mat)], n = d.count ?? 120, fall = (d.fall ?? 0) * P;
      for (let k = 0; k < n; k++) {
        const hx = FW.hash(k, 0, 51), hy = FW.hash(k, 1, 51), sp = 0.6 + 0.8 * FW.hash(k, 2, 51);
        const x = ((((hx * (VW + 40) + windPx[0] * sp * t * (d.carry ?? 1) - camX * (d.parallax ?? 1)) % (VW + 40)) + VW + 40) % (VW + 40)) - 20;
        const y = ((((hy * (VH + 40) + (fall * sp + windPx[1]) * t - camY * (d.parallax ?? 1)) % (VH + 40)) + VH + 40) % (VH + 40)) - 20;
        const xi = Math.round(x + Math.sin(t * 2 + k) * 1.5), yi = Math.round(y);
        if (xi < 0 || yi < 0 || xi >= Fr.w || yi >= Fr.h) continue;
        if (d.low && FW.hash(k, 3, 51) > 0.3 && yi < VH * 0.4) continue;
        Fr.buf[yi * Fr.w + xi] = L[L.length - 1 - (k % 3 === 0 ? 1 : 0)];
        if (d.streak && wind.speed > 4) { const x2 = xi - Math.sign(windPx[0]); if (x2 >= 0 && x2 < Fr.w) Fr.buf[yi * Fr.w + x2] = L[L.length - 2]; }
      }
    }

    /* --- camera: tour keys, or following an actor (a window average, so it stays a pure function of t) --- */
    function rootAt(a, t) { const r = a.state(t).root; return [r[0], r[1] - liftAt(r[0], r[1])]; }
    function camAt(t) {
      let cx, cy;
      if (live.on && live.a) { const r = rootAt(live.a, liveT(t)); cx = r[0]; cy = r[1] - 14; }
      else if (tour.keys) {
        const k = tour.keys; let i = 1; while (i < k.length - 1 && k[i][0] < t) i++;
        const [t0, a] = k[i - 1], [t1, b] = k[i], u = FW.clamp((t - t0) / (t1 - t0 || 1), 0, 1), e = u * u * (3 - 2 * u);
        const pa = C.ground(...C.where(a)), pb = C.ground(...C.where(b)); cx = FW.lerp(pa[0], pb[0], e); cy = FW.lerp(pa[1], pb[1], e);
      } else if (tour.follow && byId[tour.follow]) {
        let sx = 0, sy = 0; const N = 12, a = byId[tour.follow];
        for (let i = 0; i < N; i++) { const r = rootAt(a, t - (i / N) * 1.2); sx += r[0]; sy += r[1]; } cx = sx / N; cy = sy / N - 14;
      } else { cx = g.W / 2; cy = g.H / 2; }
      return [FW.clamp(Math.round(cx - VW / 2), 0, g.W - VW), FW.clamp(Math.round(cy - VH / 2), 0, g.H - VH)];
    }
    const liveT = (t) => t - live.t0;

    const flat = Q.get('pass') === 'flat';
    function compose(t, stats) {
      const [camX, camY] = camAt(t);
      shadowMask.fill(0);
      /* the cast this frame */
      const drawn = [];
      const list = actors.slice(); if (live.on && live.a) { const k = list.findIndex((a) => a.id === pid); if (k >= 0) list.splice(k, 1); }
      for (const a of list) drawn.push({ a, tt: t });
      if (live.on && live.a) drawn.push({ a: live.a, tt: liveT(t) });
      const sprites = [];
      for (const { a, tt } of drawn) {
        const st0 = stats ? (stats[a.id] = stats[a.id] || {}) : null;
        const { st, spr } = a.draw(tt, st0); const rs = spr.resolve(C.res, C.sun.L);
        const x0 = Math.floor(st.root[0]) - camX - rs.ax, y0 = Math.floor(st.root[1]) - camY - rs.ay;
        if (x0 > VW || y0 > VH || x0 + rs.w < 0 || y0 + rs.h < 0) continue;
        sprites.push({ base: st.root[1], rs, x0, y0, actor: true });
        if (!OFF.has('shadows')) C.castInto(shadowMask, VW, VH, rs, x0, y0);
      }
      /* clouds: their shadows cross the ground on the wind */
      if (life.clouds && !OFF.has('clouds')) {
        const cl = life.clouds;
        for (let y = 0; y < VH; y += 1) for (let x = 0; x < VW; x++) {
          const X = (x + camX) / P - (wind.speed * Math.sin(wr) * t) * (cl.speed ?? 1), Y = (y + camY) / P * 2 + (wind.speed * Math.cos(wr) * t) * (cl.speed ?? 1);
          const v = FW.fbm(X, Y, cl.scale ?? 40, 2, 99), edge = 1 - (cl.cover ?? 0.3) * 0.6 - 0.2;
          /* a thin cloud passes part of the beam: its shadow is ordered dither, never a flat fill */
          if (v > edge && (v > edge + (cl.core ?? 0.06) || ((x + camX + y + camY) & 1))) shadowMask[y * VW + x] = (cl.transmit ?? 0.5) > 0.3 ? ((x + camX + y + camY) & 1) : 1;
        }
      }
      /* ground */
      for (let y = 0; y < VH; y++) {
        const gr = (y + camY) * g.W + camX, fr = y * VW;
        for (let x = 0; x < VW; x++) {
          const gi = gr + x, m = g.mat[gi];
          if (!m) { buf[fr + x] = lut[1][0]; continue; }
          const L = lut[m];
          if (flat) { buf[fr + x] = L[(L.length - 1) >> 1]; continue; }
          let r = shadowMask[fr + x] && !g.water[gi] ? g.shade[gi] : g.lit[gi];
          /* glints on open water, on the wind's beat */
          if (g.water[gi] && wind.speed > 0.3 && FW.hash(x + camX, y + camY, Math.floor(t * 2.5) + ((x + camX) >> 3)) < 0.012 * wind.speed) r = Math.min(L.length - 1, r + 1);
          buf[fr + x] = L[r];
        }
      }
      if (!OFF.has('reflect') && !flat) {
        for (const p of C.props) { if (!p.nearWater) continue; const x0 = p.gx - camX - p.spr.ax, y0 = p.gy - camY - p.spr.ay; if (x0 > VW || x0 + p.spr.w < 0 || y0 > VH + 10 || y0 + p.spr.h * 3 < 0) continue; reflect(F, p.spr, x0, y0, camX, camY, t); }
        for (const s of sprites) reflect(F, s.rs, s.x0, s.y0, camX, camY, t);
      }
      /* props in view, sorted with the cast by base row */
      for (const p of C.props) {
        const x0 = p.gx - camX - p.spr.ax, y0 = p.gy - camY - p.spr.ay;
        if (x0 > VW + 4 || y0 > VH || x0 + p.spr.w < -4 || y0 + p.spr.h < 0) continue;
        sprites.push({ base: p.gy, p, x0, y0 });
      }
      sprites.sort((a, b) => a.base - b.base);
      for (const s of sprites) {
        if (s.actor) blit(F, s.rs, s.x0, s.y0, null, flat);
        else blit(F, s.p.spr, s.x0, s.y0, swayFn(s.p, t), flat);
        if (s.p && s.p.tag && life.fires) for (const f of life.fires) if (f.on === s.p.tag) drawFire(F, f, s.p.gx - camX + FW.px(f.dx ?? 0), s.p.gy - camY - FW.px(f.dy ?? 0), t);
      }
      if (!OFF.has('particles') && !flat) {
        for (const sm of life.smoke || []) { const p = C.props.find((q) => q.tag === sm.on); if (!p) continue;
          drawSmoke(F, sm, p.gx - camX + FW.px(sm.dx ?? 0), p.gy - camY - p.spr.ay + (sm.top ? 2 : p.spr.ay - FW.px(sm.dy ?? 0)), t); }
        for (const d of life.drift || []) drawDrift(F, d, camX, camY, t);
      }
      return [camX, camY];
    }

    /* --- the cast sheet: every body turned all eight ways, walking both ways, idling, turning on the spot,
       and its big move both ways — the page the rig is judged on before any scene --- */
    function drawSheet() {
      const cells = 8, cw = VW / cells;
      const seenT = new Set(), blocks = [];
      for (const row of W.cast || []) { const k = row.type || row.id; if (seenT.has(k)) continue; seenT.add(k); const b = bodies[row.id]; blocks.push({ b, ch: Math.max(44, b.size.h + 6) }); }
      const rowsPer = 6, H = blocks.reduce((s, k) => s + k.ch * rowsPer, 0);
      canvas.width = VW; canvas.height = H;
      const img = new ImageData(VW, H), b32 = new Uint32Array(img.data.buffer), Fr = { img, buf: b32, w: VW, h: H };
      const groundMat = id(W.sheetGround || Object.keys(W.cover || W.materials)[0]), GL = lut[groundMat];
      for (let y = 0; y < H; y++) for (let x = 0; x < VW; x++) b32[y * VW + x] = GL[((x + y) & 1) ? 1 : 2] ?? GL[0];
      let oy = 0;
      for (const { b, ch } of blocks) {
        const put = (row, col, st) => {
          const spr = (b.kind === 'human' ? B.drawHuman : B.drawQuad)(b, st, null).resolve(C.res, C.sun.L);
          const x0 = Math.round(col * cw + cw / 2) - spr.ax, y0 = oy + row * ch + ch - 4 - spr.ay;
          const sm = new Uint8Array(VW * H); C.castInto(sm, VW, H, spr, x0, y0);
          for (let i = 0; i < sm.length; i++) if (sm[i]) b32[i] = GL[0];
          blit(Fr, spr, x0, y0);
        };
        const at = (phi) => ({ root: [0, 0], phi, feet: b.feet.map((ft) => { const gp = B.toGround([0, 0], phi, ft.f0, ft.l); return { x: gp[0], y: gp[1], lift: 0, planted: true, name: ft.name }; }), ...B.idleParams(b, 0.3, 1), blink: false });
        for (let k = 0; k < 8; k++) put(0, k, at((k * Math.PI) / 4));
        for (const [row, dir] of [[1, 0], [2, Math.PI]]) {
          const far = [Math.cos(dir) * 4000, -Math.sin(dir) * 4000], a = B.actor(b, [0, 0], dir, [['walk', [far]]], { loop: false });
          const tStart = a.segs.find((s) => s.type === 'walk').t0 + b.accel * 2 + 1;
          for (let k = 0; k < 8; k++) { const st = a.state(tStart + (k / 8) * (b.stride / b.v)); st.root = [0, 0].map((v, i) => st.root[i] - a.state(tStart + (k / 8) * (b.stride / b.v)).root[i]);
            const r = a.state(tStart + (k / 8) * (b.stride / b.v)).root; st.feet = st.feet.map((f) => ({ ...f, x: f.x - r[0], y: f.y - r[1] })); st.root = [0, 0]; put(row, k, st); }
        }
        { const a = B.actor(b, [0, 0], 0, [['idle', 4], ['face', 180]], { loop: false });
          for (let k = 0; k < 3; k++) put(3, k, a.state(k * 1.2));
          const tr = a.segs.find((s) => s.type === 'turn'); for (let k = 0; k < 5; k++) put(3, 3 + k, a.state(tr.t0 + (k / 4) * (tr.dur - 0.001))); }
        const big = b.kind === 'human' ? 'lift' : 'toss', bm = B.BIG[big];
        for (const [row, dir] of [[4, 0], [5, Math.PI]]) { const a = B.actor(b, [0, 0], dir, [['big', big]], { loop: false });
          for (let k = 0; k < 8; k++) put(row, k, a.state((k / 7) * (bm.dur - 0.001))); }
        oy += ch * rowsPer;
      }
      canvas.getContext('2d').putImageData(img, 0, 0);
    }

    /* --- contract --- */
    const ctx2 = canvas.getContext('2d');
    function seek(t) { if (sheet) return; canvas.width = VW; canvas.height = VH; compose(t); ctx2.putImageData(frame, 0, 0); }
    window.seek = seek; window.DURATION = DURATION; window.FPS = FPS; window.PIXEL = { W: VW, H: VH, scale: 4 };
    if (sheet) drawSheet(); else seek(+(Q.get('t') || 0));
    /* everything check.mjs needs to measure, without reading pixels */
    for (const p of C.props) { p.nearWater = false; for (let dy = 0; dy < p.spr.h * 2 + 4 && !p.nearWater; dy += 2) for (let dx = 0; dx < p.spr.w; dx += 3) { const gi = (p.gy + dy) * g.W + p.gx - p.spr.ax + dx; if (gi > 0 && gi < g.water.length && g.water[gi]) { p.nearWater = true; break; } } }
    window.FW_CHECK = (opts = {}) => {
      const fps = opts.fps || FPS, out = { name: W.name, ms: C.ms, sun: { altDeg: +C.sun.altDeg.toFixed(2), az: +C.sun.az.toFixed(1), shadow: [+C.sun.shadow.dx.toFixed(3), +C.sun.shadow.dy.toFixed(3)], diffuse: +C.sun.diffuse.toFixed(3) },
        palette: { count: C.pal.list.length, ramps: C.pal.info }, floors: C.floors, places: Object.fromEntries(Object.entries(C.places).map(([k, v]) => [k, { X: v.X, Y: v.Y, score: +(+v.score).toFixed(3) }])),
        props: C.props.length, bake: [g.W, g.H], scale: [], actors: [] };
      const seenForms = new Set();
      for (const p of C.props) { const key = p.form + JSON.stringify(p.spec); if (seenForms.has(key)) continue; seenForms.add(key);
        out.scale.push({ form: p.form, id: p.flora || p.tag || p.place, metres: p.spec.height ?? p.spec.h, px: p.spr.h, w: p.spr.w }); }
      out.scale.push({ form: 'person', metres: FW.SCALE.HUMAN_M, px: FW.SCALE.PLAYER_H });
      for (const a of actors) {
        const T = a.T, n = Math.ceil(T * fps), b = a.body;
        const rec = { id: a.id, kind: b.kind, T: +T.toFixed(2), v_ms: +(b.v / P).toFixed(2), stride_m: +(b.stride / P).toFixed(2), duty: b.duty, gait: b.gaitName || 'biped walk',
          slideMax: 0, slideFrames: 0, idleChanged: null, idleFrames: 0, big: [], jointErr: 0, reachMax: 0, minKnee: 999, facingErr: 0, loopGap: 0 };
        let prevFeet = null, prevRoot = null, idleHashes = new Set();
        let bigTrack = null;
        for (let i = 0; i <= n; i++) {
          const t = i / fps, stats = {}, { st, spr } = a.draw(t, stats);
          if (stats.feet) {
            if (prevFeet && prevFeet.length === stats.feet.length) stats.feet.forEach((f, k) => { const p0 = prevFeet[k];
              if (f.planted && p0.planted) { const dd = Math.max(Math.abs(f.x - p0.x), Math.abs(f.y - p0.y)); if (dd > 0) rec.slideFrames++; rec.slideMax = Math.max(rec.slideMax, dd); } });
            prevFeet = stats.feet;
          }
          rec.jointErr += (stats.kneeBack || 0) + (stats.elbowFwd || 0) + (stats.legWrong || 0);
          rec.reachMax = Math.max(rec.reachMax, stats.reach || 0); rec.minKnee = Math.min(rec.minKnee, stats.knee ?? stats.minLegAngle ?? 999);
          const pr = a.state(t).root; // facing is judged on the plan plane, before relief lifts the root
          if (st.mode === 'walk' && prevRoot) { const dx = pr[0] - prevRoot[0], dy = pr[1] - prevRoot[1]; if (Math.hypot(dx, dy) > 0.3) {
            const tr = Math.atan2(-dy, dx); rec.facingErr = Math.max(rec.facingErr, Math.abs(Math.atan2(Math.sin(tr - st.phi), Math.cos(tr - st.phi))) * 180 / Math.PI); } }
          prevRoot = pr;
          if (st.mode === 'idle') { rec.idleFrames++; let h = 0; const rs = spr.resolve(C.res, C.sun.L); for (let k = 0; k < rs.mat.length; k++) h = (Math.imul(h, 31) + rs.mat[k] * 7 + rs.rung[k]) | 0; idleHashes.add(h); }
          if (st.mode === 'big') {
            const metric = b.kind === 'human' ? stats.hipU : stats.headU;
            if (!bigTrack || bigTrack.name !== st.big || st.bigT < bigTrack.last) { if (bigTrack) rec.big.push(bigTrack); bigTrack = { name: st.big, samples: [] }; }
            bigTrack.samples.push([st.bigT, metric]); bigTrack.last = st.bigT;
          }
        }
        if (bigTrack) rec.big.push(bigTrack);
        rec.idleChanged = rec.idleFrames ? idleHashes.size : null;
        rec.big = rec.big.map((bt) => {
          const ph = B.BIG[bt.name].phases, val = (t) => { let best = bt.samples[0]; for (const s of bt.samples) if (Math.abs(s[0] - t) < Math.abs(best[0] - t)) best = s; return best[1]; };
          const range = (a, z) => bt.samples.filter((s) => s[0] >= a && s[0] <= z).map((s) => s[1]);
          const v0 = val(0), vA = val(ph.action[0]), vB = val(ph.action[1]), dir = Math.sign(vB - vA) || 1;
          const ant = range(...ph.anticipation), gather = dir > 0 ? v0 - Math.min(...ant) : Math.max(...ant) - v0;
          const rec2 = range(...ph.recovery), over = Math.max(...rec2) - Math.min(...rec2); // the body settles: overshoot or brace
          return { name: bt.name, actionPx: +((vB - vA) * dir).toFixed(2), gatherPx: +gather.toFixed(2), overshootPx: +over.toFixed(2) };
        });
        const s0 = a.state(0).root, s1 = a.state(a.T - 1e-4).root; rec.loopGap = a.loop ? +Math.hypot(s0[0] - s1[0], s0[1] - s1[1]).toFixed(2) : 0;
        rec.minKnee = +rec.minKnee.toFixed(1); rec.reachMax = +rec.reachMax.toFixed(2); rec.facingErr = +rec.facingErr.toFixed(1);
        out.actors.push(rec);
      }
      return out;
    };
    window.__ready = true;

    /* --- the live page: integer scale to the window, the tour on a loop, arrows take the traveller --- */
    if (Q.get('render') === '1' || Q.has('t')) return;
    const fit = () => { const k = Math.max(1, Math.floor(Math.min(innerWidth / canvas.width, innerHeight / canvas.height))); canvas.style.width = canvas.width * k + 'px'; canvas.style.height = canvas.height * k + 'px'; };
    addEventListener('resize', fit); fit();
    if (sheet) return;
    let paused = false, t = 0, last = performance.now();
    const keys = new Set();
    const DIRS = { ArrowRight: 0, d: 0, ArrowUp: 90, w: 90, ArrowLeft: 180, a: 180, ArrowDown: 270, s: 270 };
    addEventListener('keydown', (e) => { if (e.key === ' ') { paused = !paused; e.preventDefault(); return; } if (e.key in DIRS) { keys.add(e.key); e.preventDefault(); } });
    addEventListener('keyup', (e) => keys.delete(e.key));
    canvas.addEventListener('click', () => { paused = !paused; });
    function steer() {
      const held = [...keys].map((k) => DIRS[k]); if (!held.length || !pid || !bodies[pid]) return;
      const dir = (held[held.length - 1] * Math.PI) / 180, body = bodies[pid];
      if (!live.on) { const a0 = byId[pid]; const st = a0 ? a0.state(t) : null; live.on = true; live.pos = st ? st.root : [g.W / 2, g.H / 2]; live.phi = st ? st.phi : 0; live.a = null; }
      const lt = live.a ? liveT(t) : 0, busy = live.a && lt < live.a.T - 0.05;
      const step = 3 * P, vec = [Math.cos(dir) * step, -Math.sin(dir) * step];
      if (!busy) {
        const st = live.a ? live.a.state(live.a.T - 1e-3) : null, pos = st ? st.root : live.pos, phi = st ? st.phi : live.phi;
        const to = [FW.clamp(pos[0] + vec[0], 20, g.W - 20), FW.clamp(pos[1] + vec[1], g.top + 20, g.H - 10)];
        live.plan = { pos, phi, pts: [to], dir }; live.a = B.actor(body, pos, phi, [['walk', [to]]], { loop: false, seed: 3 }); live.a.lift = liftAt; live.t0 = t;
      } else if (live.plan && live.plan.dir === dir) {
        const seg = live.a.segs.find((s) => s.type === 'walk');
        if (seg && lt > seg.t0 && seg.t0 + seg.walk - lt < 1.2) {
          const lastP = live.plan.pts[live.plan.pts.length - 1], to = [FW.clamp(lastP[0] + vec[0], 20, g.W - 20), FW.clamp(lastP[1] + vec[1], g.top + 20, g.H - 10)];
          if (Math.hypot(to[0] - lastP[0], to[1] - lastP[1]) > 4) { live.plan.pts = [to]; live.a = B.actor(body, live.plan.pos, live.plan.phi, [['walk', [to]]], { loop: false, seed: 3 }); live.a.lift = liftAt; }
        }
      }
    }
    function loop(now) {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (!paused) { t += dt; steer(); compose(live.on ? t : t % DURATION); ctx2.putImageData(frame, 0, 0); }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
})();

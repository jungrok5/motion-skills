// sprite-stack-short · film.js — the short: beats on a timeline (views → slices → stack → turn → world → title), the pixel
// canvas at an integer block size, captions and labels at full resolution, shard transitions, the render contract, the live
// player with sound, the per-frame rules, the numbers check.mjs reads, and the model sheet.
(function () {
  'use strict';
  const SS = window.SS, { rgba, mix, mul } = SS;
  const ART_W = 480, ART_H = 270;                    // art pixels at zoom 1; the 1080p output is ×4
  const Q = new URLSearchParams(location.search), OFF = new Set((Q.get('off') || '').split(',').filter(Boolean));

  const rasters = new Map();
  const raster = (w, h) => { const k = w + 'x' + h; if (!rasters.has(k)) rasters.set(k, new SS.Raster(w, h)); return rasters.get(k); };
  const artSize = z => [Math.ceil(ART_W / z), Math.ceil(ART_H / z)];

  // the largest integer zoom at which a layout of (w, h) art px fits inside a share of the frame
  const fitZoom = (w, h, sw = .88, sh = .72, max = 6) => { for (let z = max; z >= 1; z--) { const [aw, ah] = artSize(z); if (w <= aw * sw && h <= ah * sh) return z; } return 1; };

  SS.film = function (spec) {
    const F = Object.assign({ paper: '#f7f5ef', ink: '#1d1b24', accent: '#2f6bff', fps: 30, light: -2.3, font: '"ALF Sans", system-ui, sans-serif' }, spec);
    F.off = OFF; F.paperC = rgba(F.paper); F.inkC = rgba(F.ink); F.accentC = rgba(F.accent); F.shadowF = .86;
    let t0 = 0; F.beats = spec.beats.map((b, i) => { const o = Object.assign({ i, start: t0 }, b); t0 += b.dur; return o; });
    F.dur = +t0.toFixed(3);
    F.hero = spec.hero; F.models = spec.models || [spec.hero];
    if (F.world && F.world.spec.mover) F.world.plan(F.dur + 1);
    F.beatAt = t => { for (const b of F.beats) if (t < b.start + b.dur) return b; return F.beats[F.beats.length - 1]; };

    // ---------- beats ----------
    const idleOf = (M, u) => { const id = M.idle || {}, per = id.period || 2.6; let lean = [0, 0], alt = 0;
      if (id.roll) lean[1] += id.roll * Math.sin(u * 2 * Math.PI / per); if (id.pitch) lean[0] += id.pitch * Math.sin(u * 2 * Math.PI / per * .73 + 1);
      if (id.bob) alt += Math.round((Math.sin(u * 2 * Math.PI / (id.bobPeriod || per)) * .5 + .5) * id.bob);
      return { lean, alt }; };
    const ground = (R, M, x, y, a, extra = {}) => { const [dx, dy] = SS.shadowOffset(M, F.light, extra.lift || 1); SS.shadow(R, M, { x, y, a, dx, dy, f: F.shadowF }); };
    const V = M => M.views;
    const dims = M => ({ top: [M.L, M.W], side: [M.L, M.H], front: [M.W, M.H], back: [M.W, M.H] });

    const BEAT = {};
    BEAT.views = (b, u) => {
      const M = b.model || F.hero, d = dims(M), gap = Math.max(6, Math.round(M.L * .25)), order = ['top', 'side', 'front', 'back'];
      const total = order.reduce((s, k) => s + d[k][0], 0) + gap * 3, z = b.zoom && b.zoom !== 'auto' ? b.zoom : fitZoom(total, Math.max(M.W, M.H) + 16);
      const [w, h] = artSize(z), R = raster(w, h).fill(F.paperC), labels = [], names = b.labels || { top: 'TOP', side: 'SIDE', front: 'FRONT', back: 'BACK' };
      let x = Math.round((w - total) / 2); const cy = Math.round(h * .54), dv = Math.min(.9, b.dur * .14);
      order.forEach((k, i) => {
        const [vw, vh] = d[k], y = Math.round(cy - vh / 2), s0 = (i ? b.dur * .1 : -dv * .35) + i * (b.dur * .62 - dv) / 3, p = SS.clamp((u - s0) / dv, 0, 1);
        if (p > 0) {
          const rows = Math.ceil(p * vh);
          R.grid(V(M)[k], vw, vh, x, y, rows);
          if (p < 1) for (let i2 = -1; i2 <= vw; i2++) R.px(x + i2, y + rows - 1, F.accentC);       // the pen row
          labels.push({ x: x + vw / 2, y: y + vh, text: names[k], a: Math.min(1, p * 3), arrow: (k === 'top' || k === 'side') && p === 1 });
        }
        x += vw + gap;
      });
      return { R, z, labels, paper: true };
    };
    BEAT.slices = (b, u) => {
      const M = b.model || F.hero, spread = b.spread == null ? 2 : b.spread, a = b.angle == null ? -.62 : b.angle, gap = Math.max(8, Math.round(M.L * .3));
      const total = M.L + gap + M.L + gap + M.R * 2, z = b.zoom && b.zoom !== 'auto' ? b.zoom : fitZoom(total, M.H * (1 + spread) + M.R * 1.2);
      const [w, h] = artSize(z), R = raster(w, h).fill(F.paperC), labels = [];
      const p = SS.clamp((u - b.dur * .08) / (b.dur * .74), 0, 1), zf = p * M.H, zc = Math.min(M.H - 1, Math.floor(zf)), frac = zf - Math.floor(zf), done = p >= 1;
      let x = Math.round((w - total) / 2); const cy = Math.round(h * .55);
      // the side view with the scan line on the current row
      const sy = Math.round(cy - M.H / 2), row = M.H - 1 - zc;
      for (let i = -4; i < M.L + 4; i++) if (!(i >= 0 && i < M.L && V(M).side[row * M.L + i])) R.px(x + i, sy + row, F.accentC);
      R.grid(V(M).side, M.L, M.H, x, sy, M.H, (c, i, j) => j === row && !done ? mul(c, 1.25) : c);
      labels.push({ x: x + M.L / 2, y: sy + M.H, text: b.sideLabel || 'SIDE' });
      x += M.L + gap;
      // the top view, dimmed except the pixels of this slice
      const ty = Math.round(cy - M.W / 2), sl = SS.slice(M, zc);
      R.grid(V(M).top, M.L, M.W, x, ty, M.W, (c, i, j) => (!done && sl[j * M.L + i]) ? c : mix(c, F.paperC, done ? 0 : .72));
      if (!done) for (let j = 0; j < M.W; j++) for (let i = 0; i < M.L; i++) if (sl[j * M.L + i] && !V(M).top[j * M.L + i]) R.px(x + i, ty + j, F.accentC);
      labels.push({ x: x + M.L / 2, y: ty + M.W, text: (b.sliceLabel || 'slice') + ` ${zc + 1}/${M.H}` });
      x += M.L + gap;
      // the stack building up: placed slices, the current one dropping in
      const scx = x + M.R, scy = Math.round(h * .5 + M.H * (1 + spread) / 2);
      ground(R, M, scx, scy, a);
      SS.draw(R, M, { x: scx, y: scy, a, spread, light: F.light, cap: done ? -1 : (frac > .02 ? zc : zc - 1), zfn: zz => done || zz < zc ? 0 : zz === zc ? -Math.round((1 - SS.ease.out(frac)) * 10) : null });
      return { R, z, labels, paper: true };
    };
    BEAT.stack = (b, u) => {
      const M = b.model || F.hero, s0 = b.spread == null ? 2 : b.spread, a0 = b.angle == null ? -.62 : b.angle;
      const z = b.zoom && b.zoom !== 'auto' ? b.zoom : fitZoom(M.R * 2.4, M.H * (1 + s0) + M.R * 1.2);
      const [w, h] = artSize(z), R = raster(w, h).fill(F.paperC);
      const p1 = SS.ease.io(SS.clamp(u / (b.dur * .45), 0, 1)), p2 = SS.ease.io(SS.clamp((u - b.dur * .45) / (b.dur * .55), 0, 1));
      const spread = Math.round(s0 * (1 - p1) * 4) / 4, a = a0 + (b.turn == null ? .9 : b.turn) * p2, idle = idleOf(M, u);
      const cx = Math.round(w / 2), cy = Math.round(h * .5 + (M.H * (1 + spread)) / 2);
      ground(R, M, cx, cy, a);
      SS.draw(R, M, { x: cx, y: cy, a, spread: Math.round(spread), lean: p1 >= 1 ? idle.lean : [0, 0], alt: p1 >= 1 ? idle.alt : 0, light: F.light });
      return { R, z, labels: [], paper: true };
    };
    BEAT.turn = (b, u) => {
      const M = b.model || F.hero, z = b.zoom && b.zoom !== 'auto' ? b.zoom : fitZoom(M.R * 2.2, M.H + M.R * 1.4);
      const [w, h] = artSize(z), R = raster(w, h).fill(F.paperC), a = (b.angle == null ? -.62 : b.angle) + Math.PI * 2 * (b.turns || 1) * SS.ease.io(SS.clamp(u / b.dur, 0, 1)) * (b.dir || 1);
      const idle = idleOf(M, u), cx = Math.round(w / 2), cy = Math.round(h * .5 + M.H / 2);
      ground(R, M, cx, cy, a);
      SS.draw(R, M, { x: cx, y: cy, a, lean: idle.lean, alt: idle.alt, light: F.light });
      return { R, z, labels: [], paper: true };
    };
    BEAT.world = (b, u, t) => {
      const z = b.zoom || 1, [w, h] = artSize(z), R = raster(w, h), Wd = F.world, c = b.camera;
      let cam = null;
      if (c && c.orbit) cam = { x: c.orbit[0], y: c.orbit[1], rot: (c.rot0 || 0) + (c.rate || .15) * t };
      else if (c && c.at) cam = { x: c.at[0], y: c.at[1], rot: c.rot || 0 };
      Wd.render(R, t, { cam, light: F.light, mover: !OFF.has('mover') });
      return { R, z, labels: [], paper: false };
    };
    BEAT.title = (b, u, t) => {
      const base = b.over === 'paper' ? { R: raster(...artSize(1)).fill(F.paperC), z: 1, labels: [], paper: true } : BEAT.world(Object.assign({}, b, { zoom: b.zoom || 1 }), u, t);
      base.title = { text: b.text || F.title, sub: b.sub, a: SS.clamp(u / .5, 0, 1) };
      return base;
    };
    F.BEAT = BEAT;

    // ---------- the frame ----------
    const off = document.createElement('canvas'), offc = off.getContext('2d');
    F.scene = (b, t) => { const u = t - b.start; const s = (BEAT[b.kind] || BEAT.world)(b, u, t); s.beat = b; s.u = u; return s; };
    function blit(ctx, s, OW, OH, bs) {
      const { R, z } = s; if (off.width !== R.w || off.height !== R.h) { off.width = R.w; off.height = R.h; }
      offc.putImageData(R.toImageData(offc), 0, 0);
      const k = bs * z, x0 = -Math.floor((R.w * z - ART_W) / 2) * bs, y0 = -Math.floor((R.h * z - ART_H) / 2) * bs;
      ctx.imageSmoothingEnabled = false; ctx.drawImage(off, x0, y0, R.w * k, R.h * k);
      s.map = (x, y) => [x0 + x * k, y0 + y * k];
    }
    function text(ctx, s, OW, OH, t) {
      const b = s.beat, fs = Math.round(OH * .042);
      if (!OFF.has('labels')) for (const l of s.labels || []) {
        const [X, Y0] = s.map(l.x, l.y), Y = Y0 + OH * .022, fz = Math.round(OH * .025); ctx.globalAlpha = l.a == null ? 1 : l.a; ctx.fillStyle = F.ink; ctx.font = `600 ${fz}px ${F.font}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(l.text, X, Y);
        if (l.arrow) {        // "the front points this way": a small arrow after the label, at full resolution
          const w = ctx.measureText(l.text).width, ax = X + w / 2 + fz * .5, ay = Y + fz * .55, L = fz * 1.5;
          ctx.strokeStyle = F.accent; ctx.lineWidth = Math.max(1.5, fz * .12); ctx.lineCap = 'round'; ctx.beginPath();
          ctx.moveTo(ax, ay); ctx.lineTo(ax + L, ay); ctx.moveTo(ax + L - fz * .4, ay - fz * .35); ctx.lineTo(ax + L, ay); ctx.lineTo(ax + L - fz * .4, ay + fz * .35); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      if (b.caption && !OFF.has('captions')) {
        const tin = b.in === 'tiles' ? (b.tin || .6) : 0, a = SS.clamp((s.u - tin) / .25, 0, 1) * SS.clamp((b.dur - s.u) / .2, 0, 1);
        if (a > 0) {
          ctx.globalAlpha = a; ctx.font = `700 ${fs}px ${F.font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const y = OH * .1;
          if (!s.paper) { ctx.lineWidth = fs * .16; ctx.strokeStyle = 'rgba(16,14,24,.85)'; ctx.lineJoin = 'round'; ctx.strokeText(b.caption, OW / 2, y); ctx.fillStyle = '#fbf8f0'; }
          else ctx.fillStyle = F.ink;
          ctx.fillText(b.caption, OW / 2, y); ctx.globalAlpha = 1;
        }
      }
      if (s.title && !OFF.has('captions')) {
        const a = s.title.a; ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (!s.paper) { ctx.fillStyle = 'rgba(14,12,22,.38)'; ctx.fillRect(0, OH * .36, OW, OH * .28); }
        ctx.fillStyle = s.paper ? F.ink : '#fbf8f0'; ctx.font = `800 ${Math.round(OH * .085)}px ${F.font}`; ctx.fillText(s.title.text, OW / 2, OH * (s.title.sub ? .47 : .5));
        if (s.title.sub) { ctx.font = `500 ${Math.round(OH * .03)}px ${F.font}`; ctx.fillText(s.title.sub, OW / 2, OH * .565); }
        ctx.globalAlpha = 1;
      }
    }
    // shard transition: triangles of a grid switch to the new beat, from the middle outward with a little scatter
    function shards(ctx, OW, OH, p) {
      const n = 12, cw = OW / n, rows = Math.ceil(OH / cw); ctx.beginPath();
      for (let j = 0; j < rows; j++) for (let i = 0; i < n; i++) for (let half = 0; half < 2; half++) {
        const cx = (i + .5) / n - .5, cy = ((j + .5) * cw / OH - .5) * OH / OW, d = Math.hypot(cx, cy) / .58, th = .06 + .7 * (.65 * d + .35 * SS.hash(i, j, half + 5));
        if (p < th) continue;
        const x = i * cw, y = j * cw, flip = (i + j) & 1;
        if (!flip) { if (half) { ctx.moveTo(x, y); ctx.lineTo(x + cw, y); ctx.lineTo(x, y + cw); } else { ctx.moveTo(x + cw, y); ctx.lineTo(x + cw, y + cw); ctx.lineTo(x, y + cw); } }
        else { if (half) { ctx.moveTo(x, y); ctx.lineTo(x + cw, y); ctx.lineTo(x + cw, y + cw); } else { ctx.moveTo(x, y); ctx.lineTo(x + cw, y + cw); ctx.lineTo(x, y + cw); } }
        ctx.closePath();
      }
      ctx.clip();
    }
    F.draw = function (ctx, t, bs) {
      const OW = ctx.canvas.width, OH = ctx.canvas.height;
      t = SS.clamp(t, 0, F.dur - 1e-6);
      const b = F.beatAt(t), s = F.scene(b, t), tin = b.in === 'tiles' ? (b.tin || .6) : 0;
      if (tin && t - b.start < tin && b.i > 0) {
        const pb = F.beats[b.i - 1], ps = F.scene(pb, Math.min(t, pb.start + pb.dur - 1e-4));
        blit(ctx, ps, OW, OH, bs);
        ctx.save(); shards(ctx, OW, OH, (t - b.start) / tin); blit(ctx, s, OW, OH, bs); ctx.restore();
      } else blit(ctx, s, OW, OH, bs);
      text(ctx, s, OW, OH, t);
      F.last = s; return s;
    };

    // ---------- rules at time t, and the numbers for check.mjs ----------
    F.rules = function (t, ctx) {
      const bad = [], b = F.beatAt(t), W = F.world, mv = W && W.spec.mover;
      if (mv && W.T) {
        const p = W.T.at(t), on = [].concat(mv.on || []);
        if (on.length && !on.includes(W.matAt(p.x, p.y))) bad.push(`mover on its surface (${on.join('/')}; at ${p.x.toFixed(0)},${p.y.toFixed(0)} it is on ${W.matAt(p.x, p.y)})`);
        if (b.kind === 'world' && W.last && !(b.camera && (b.camera.orbit || b.camera.at))) {
          const it = W.last.vis.find(v => v.mover), [aw, ah] = artSize(b.zoom || 1);
          if (!it || it.sx < aw * .1 || it.sx > aw * .9 || it.sy < ah * .18 || it.sy > ah * .92) bad.push('mover in frame (inside the safe area in world beats)');
        }
      }
      if (b.caption && ctx) { ctx.font = `700 ${Math.round(ctx.canvas.height * .042)}px ${F.font}`; if (ctx.measureText(b.caption).width > ctx.canvas.width * .9) bad.push(`caption fits ("${b.caption.slice(0, 30)}…" is wider than 90 % of the frame)`); }
      return bad;
    };
    F.audit = function () {
      const out = { models: F.models.map(M => Object.assign({ name: M.name, L: M.L, W: M.W, H: M.H, voxels: M.count, kind: M.kind }, SS.audit(M))), motion: null };
      const W = F.world, T = W && W.T;
      if (T) {
        const mv = T.mv, hz = T.hz, n = Math.min(T.n - 1, Math.floor(F.dur * hz)); let turn = 0, skid = 0, acc = 0, roll = 0, stopped = 0, maxV = 0;
        for (let i = 1; i < n; i++) {
          turn = Math.max(turn, Math.abs(T.hd[i] - T.hd[i - 1]) * hz * 180 / Math.PI);
          if (T.v[i] > 1) skid = Math.max(skid, Math.abs(T.hd[i] - T.va[i]) * 180 / Math.PI);
          acc = Math.max(acc, Math.abs(T.v[i] - T.v[i - 1]) * hz); roll = Math.max(roll, Math.abs(T.roll[i])); maxV = Math.max(maxV, T.v[i]);
        }
        // lag: how far behind the lateral acceleration the roll peaks (cross-correlation over 0–0.6 s)
        let best = -1e9, lag = 0; for (let L = 0; L < .6 * hz; L += 2) { let c = 0; for (let i = 0; i + L < n; i += 4) c += -T.alat[i] * T.roll[i + L]; if (c > best) { best = c; lag = L / hz; } }
        const mass = mv.mass || 1;
        out.motion = { turnRate: turn, skid, drift: mv.drift || 0, accel: acc, accelLimit: Math.max(mv.accel || 60 / mass, (mv.brake || (mv.accel || 60 / mass) * 1.5)), roll, maxLean: T.maxLean, lag, maxV, cruise: mv.speed || 40, mass, len: T.sp.len };
      }
      return out;
    };

    // ---------- page contract + live player ----------
    F.start = function () {
      const render = Q.has('render'), tq = Q.get('t'), sc = +(Q.get('scale') || 1);
      document.body.style.cssText = 'margin:0;background:#0d0c12;display:flex;align-items:center;justify-content:center;min-height:100vh;overflow:hidden';
      const cv = document.createElement('canvas'), ctx = cv.getContext('2d'); document.body.appendChild(cv);
      let bs = 4 * sc;
      const size = () => {
        if (!render) { const dpr = Math.min(2, window.devicePixelRatio || 1); bs = Math.max(1, Math.floor(Math.min(innerWidth / ART_W, innerHeight / ART_H) * dpr)); }
        cv.width = Math.round(ART_W * bs); cv.height = Math.round(ART_H * bs);
        if (!render) { const k = Math.min(innerWidth / cv.width, innerHeight / cv.height); cv.style.width = cv.width * k + 'px'; cv.style.height = cv.height * k + 'px'; cv.style.imageRendering = 'pixelated'; }
      };
      size();
      window.seek = t => F.draw(ctx, t, bs);
      window.DURATION = F.dur; window.FPS = F.fps; window.film = F; window.PIXEL = { W: ART_W, H: ART_H, block: bs };
      window.runChecks = t => { F.draw(ctx, t, bs); return F.rules(t, ctx); };
      window.shotAt = t => { const b = F.beatAt(t); return { i: b.i, name: b.name || b.kind, kind: b.kind, zoom: (F.last && F.last.z) || 1 }; };
      const ready = () => {
        if (tq != null) window.seek(+tq); else window.seek(0);
        window.__ready = true;
        if (render || tq != null) return;
        // live: loop, click = sound on / off, space = pause
        let playing = true, tNow = 0, last = performance.now(), audio = null, src = null;
        const hint = document.createElement('div'); hint.textContent = '클릭하면 소리가 켜집니다 · click for sound · space = pause';
        hint.style.cssText = 'position:fixed;left:50%;bottom:10px;transform:translateX(-50%);font:11px system-ui;white-space:nowrap;color:#cfc8b8;background:rgba(0,0,0,.45);padding:3px 9px;border-radius:12px;pointer-events:none;transition:opacity .6s';
        document.body.appendChild(hint); setTimeout(() => hint.style.opacity = 0, 4500);
        const startAudio = () => { if (!audio) return; if (src) { try { src.stop(); } catch (e) { /* stopped */ } } src = audio.ctx.createBufferSource(); src.buffer = audio.buf; src.connect(audio.ctx.destination); src.start(0, tNow % F.dur); src.onended = null; audio.t0 = audio.ctx.currentTime - tNow; };
        addEventListener('click', () => {
          if (!window.SSScore || !F.score) return;
          if (!audio) { const ac = new (window.AudioContext || window.webkitAudioContext)(), sr = ac.sampleRate, [L, R] = SSScore.render(F.score, sr, F.dur), buf = ac.createBuffer(2, L.length, sr); buf.copyToChannel(L, 0); buf.copyToChannel(R, 1); audio = { ctx: ac, buf, on: true }; startAudio(); }
          else { audio.on = !audio.on; if (audio.on) startAudio(); else if (src) { src.stop(); src = null; } }
        });
        addEventListener('keydown', e => { if (e.code === 'Space') { playing = !playing; e.preventDefault(); if (audio && audio.on) { if (playing) startAudio(); else if (src) { src.stop(); src = null; } } } });
        addEventListener('resize', () => { size(); window.seek(tNow); });
        const loop = (now) => {
          const dt = Math.min(.1, (now - last) / 1000); last = now;
          if (playing) { tNow += dt; if (tNow >= F.dur) { tNow -= F.dur; if (audio && audio.on) startAudio(); } }
          window.seek(Math.floor(tNow * F.fps) / F.fps); requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      };
      if (window.SSScore && F.scoreSpec !== false) F.score = SSScore.arrange(F, spec.score || {});
      F.wav = (sr = 48000) => SSScore.wav(F.score, sr, F.dur);
      (document.fonts ? Promise.all([document.fonts.load(`700 20px ${F.font}`), document.fonts.load(`600 20px ${F.font}`), document.fonts.load(`800 20px ${F.font}`)]).catch(() => 0) : Promise.resolve()).then(ready);
      return F;
    };
    return F;
  };

  // ---------- the model sheet: every model's views, its slices exploded, eight angles, and its lean poses ----------
  SS.sheet = function (models, o = {}) {
    const paper = rgba(o.paper || '#f7f5ef'), ink = o.ink || '#1d1b24', light = o.light == null ? -2.3 : o.light, z = o.zoom || 2;
    const movers = new Set(o.movers || [models[0]]);
    const bands = models.map(M => { const rowA = Math.max(M.W, M.H) + 16, rowB = M.H * 3 + M.R * 2 + 18, rowC = movers.has(M) ? M.H + M.R * 2 + 18 : 0; return { M, rowA, rowB, rowC, h: rowA + rowB + rowC + 14 }; });
    const W = Math.ceil(ART_W * 2 / z), H = bands.reduce((s, b) => s + b.h, 0) + 8, R = new SS.Raster(W, H).fill(paper), labels = [];
    let y = 6;
    for (const { M, rowA, rowB, rowC, h } of bands) {
      labels.push({ x: 4, y: y, text: `${M.name} · ${M.L}×${M.W}×${M.H} · ${M.count} voxels · ${M.kind}`, align: 'left', bold: true });
      const v = M.views, d = { top: [M.L, M.W], side: [M.L, M.H], front: [M.W, M.H], back: [M.W, M.H] };
      let x = 6; const vy = y + 12;
      for (const k of ['top', 'side', 'front', 'back']) { R.grid(v[k], d[k][0], d[k][1], x, vy); labels.push({ x: x + d[k][0] / 2, y: vy + d[k][1] + 2, text: k }); x += d[k][0] + 10; }
      if (v.left) { R.grid(v.left, M.L, M.H, x, vy); labels.push({ x: x + M.L / 2, y: vy + M.H + 2, text: 'left (front ←)' }); x += M.L + 10; }
      // exploded slices, then 8 angles (0, 45, … 315; screen clockwise) with what each one shows
      let yb = y + rowA + 8, xb = 6 + M.R;
      SS.draw(R, M, { x: xb, y: yb + M.H * 3 + M.R, a: -.62, spread: 2, light }); labels.push({ x: xb, y: yb + M.H * 3 + M.R * 2 + 1, text: 'slices' });
      xb += M.R * 2 + 10;
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4, cx = xb + M.R, cy = yb + M.H * 3 + M.R; const [dx, dy] = SS.shadowOffset(M, light);
        SS.shadow(R, M, { x: cx, y: cy, a, dx, dy, f: .86 }); SS.draw(R, M, { x: cx, y: cy, a, light });
        labels.push({ x: cx, y: cy + M.R + 1, text: `${k * 45}°` + ({ 0: ' · right side', 2: ' · front', 4: ' · left side', 6: ' · back' }[k] || '') });
        xb += M.R * 2 + 6; if (xb + M.R * 2 > W) break;
      }
      // lean poses (body roll and pitch, the idle extremes)
      const yc = yb + rowB, mx = o.lean == null ? 2 : o.lean; let xc = 6 + M.R;
      const poses = [['roll left', [0, -mx]], ['upright', [0, 0]], ['roll right', [0, mx]], ['squat (accelerate)', [-mx, 0]], ['dive (brake)', [mx, 0]]];
      if (movers.has(M)) for (const [nm, lean] of poses) { const cx = xc, cy = yc + M.H + M.R; SS.draw(R, M, { x: cx, y: cy, a: -.3, lean, light }); labels.push({ x: cx, y: cy + M.R + 1, text: nm }); xc += M.R * 2 + 12; }
      y += h;
    }
    return { R, z, labels, ink, W, H };
  };
  SS.sheetPage = function (models, o = {}) {
    const S = SS.sheet(models, o), bs = 4, cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    cv.width = S.W * S.z * bs / 2; cv.height = S.H * S.z * bs / 2; const k = S.z * bs / 2;
    document.body.style.cssText = 'margin:0;background:#0d0c12'; cv.style.cssText = 'width:100%;image-rendering:pixelated;display:block'; document.body.appendChild(cv);
    const off = document.createElement('canvas'); off.width = S.W; off.height = S.H; const oc = off.getContext('2d'); oc.putImageData(S.R.toImageData(oc), 0, 0);
    const paint = () => {
      ctx.imageSmoothingEnabled = false; ctx.drawImage(off, 0, 0, S.W * k, S.H * k);
      for (const l of S.labels) { ctx.fillStyle = S.ink; ctx.font = `${l.bold ? 700 : 500} ${Math.round(k * (l.bold ? 5 : 3.6))}px "ALF Sans", system-ui, sans-serif`; ctx.textAlign = l.align || 'center'; ctx.textBaseline = 'top'; ctx.fillText(l.text, l.x * k, l.y * k); }
    };
    window.film = { sheet: true, models };
    window.runChecks = () => models.flatMap(M => SS.audit(M).problems);
    window.auditAll = () => models.map(M => Object.assign({ name: M.name }, SS.audit(M)));
    window.seek = () => paint(); window.DURATION = 0.001; window.FPS = 1;
    (document.fonts ? document.fonts.load('700 20px "ALF Sans"').catch(() => 0) : Promise.resolve()).then(() => { paint(); window.__ready = true; });
  };
})();

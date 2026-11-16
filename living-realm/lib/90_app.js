// living-realm · 90_app — boot, the loop, the render API.  A realm's last source calls LR.start({ … }).
{
  const T = THREE;
  // LR.start({ materials(LR), build(LR) → may be async, tour:[{x,z,look:[x,z]}…], strings:{…}, weather:{ tod, weather, auto } })
  LR.start = async (cfg = {}) => {
    try {
      LR.cfg = cfg;
      const canvas = document.getElementById('view'); LR.watchContext(canvas, cfg); const G = LR.initGPU(canvas), r = G.renderer;
      if (LR.RENDER) document.body.classList.add('render');
      const size = () => { if (LR.RENDER) return [LR.qn('w', 1280), LR.qn('h', 720)]; const d = Math.min(window.devicePixelRatio || 1, G.tier.dprCap); return [Math.round(window.innerWidth * d), Math.round(window.innerHeight * d)]; };
      LR.progress(0.02, 'materials'); await LR.breath();
      LR.makeNoise(256);
      if (cfg.materials) cfg.materials(LR);
      await LR.mat.bake((i, n, name) => LR.progress(0.02 + 0.3 * (i + 1) / n, name));
      if (LR.q('view') === 'mats') { const [w, h] = size(); r.setSize(w, h, false); const sh = LR.mat.sheet(6); r.setRenderTarget(null); r.setViewport(0, 0, w, h); LR.blit(sh.material, null); window.realm = { canvas, info: () => ({ names: sh.names }) }; document.getElementById('veil').classList.add('gone'); window.READY = true; return; }
      LR.sky.init(); LR.render.initShadow(); LR.render.initPost();
      const cam = (LR.cam = new T.PerspectiveCamera(58, 16 / 9, 0.15, 9000)); cam.rotation.order = 'YXZ';
      const [w0, h0] = size(); LR.render.scale = LR.RENDER ? LR.qn('scale', 1) : LR.qn('scale', G.mobile || G.auto ? (G.tier.scaleMin + G.tier.scaleMax) / 2 : G.tier.scaleMax);      /* a guessed tier starts in the middle of its range: the governor raises it if the frames allow */ LR.render.resize(w0, h0);
      LR.progress(0.34, 'land'); await LR.breath();
      if (cfg.build) await cfg.build(LR);
      LR.progress(0.8, 'plants'); await LR.breath();
      if (LR.land.H && !LR.land.built) LR.land.build();
      LR.emit('built');
      if (LR.flora && LR.flora.build && !LR.flora.built) { await LR.flora.build(); LR.flora.built = true; }
      LR.progress(0.92, 'light'); await LR.breath();
      LR.render.bakeTopo(LR.world.topoHalf || 192);
      LR.wx.baseY = LR.world.baseY !== undefined ? LR.world.baseY : LR.land.h(0, 0);
      LR.emit('init');
      if (!LR.RENDER && LR.q('warm') !== '0') { LR.progress(0.95, 'shaders'); await LR.breath(); await LR.warm([LR.world.scene, LR.world.shadowScene, LR.world.forward], cam, (i, n) => LR.progress(0.95 + 0.05 * (i / n), 'shaders')); }
      const fit = () => { const [w, h] = size(); if (w !== LR.render.W || h !== LR.render.H) LR.render.resize(w, h); cam.aspect = LR.render.W / LR.render.H; cam.fov = cam.aspect >= 1.25 ? 58 : LR.clamp((2 * Math.atan(Math.tan((58 * Math.PI) / 360) * (1.25 / cam.aspect)) * 180) / Math.PI, 58, 86); cam.updateProjectionMatrix(); };
      fit(); if (!LR.RENDER) window.addEventListener('resize', fit);
      const P = LR.player, sp = LR.world.spawn;
      // put the eye somewhere by hand (stills): x, z, compass yaw°, pitch°, y
      const place = (x, z, yawDeg, pitchDeg = 0, y) => { const gy = P.groundAt(x, z).y; /* the deck of a bridge or a pier, ice in winter, else the land */ cam.position.set(x, y === undefined || isNaN(y) ? gy + P.eye : y, z); cam.rotation.set((pitchDeg * Math.PI) / 180, (-yawDeg * Math.PI) / 180, 0); };
      let time = 0;
      const info = () => Object.assign({ gpu: G.name, tier: G.tierName, size: [LR.render.W, LR.render.H], inner: [LR.render.w, LR.render.h], tod: +LR.wx.tod.toFixed(2), wx: LR.wx.label(), worldTris: LR.world.stats.tris, solids: LR.world.solids.length, lightsAll: LR.world.lights.length }, LR.render.info);
      // still mode: realm.shot({ cam:[x,z,yaw,pitch,y], tod, weather, snow, wet, season, frames, t })
      const shot = (o = {}) => {
        if (o.cam) place(o.cam[0], o.cam[1], o.cam[2] || 0, o.cam[3] || 0, o.cam[4]);
        LR.wx.snap(o); if (o.t !== undefined) time = o.t;
        const n = o.frames || 10; LR.render.histValid = false; LR.render.frame = 0;
        for (let i = 0; i < n; i++) { time += 1 / 60; LR.wx.time = time; LR.wx.frame++; LR.wx.apply(); if (LR.qn('dbg', 0)) LR.render.U.uExposure.value = 0.33; LR.emit('frame', time, 1 / 60, cam); LR.render.draw(cam, time, 1 / 60); }
        return info();
      };
      window.realm = { canvas, shot, info, place, LR };
      // film: the tour with the automatic round, one frame per call (render.mjs --film)
      let fdt = 1 / 30;
      window.realm.filmStart = (fps = 30) => { fdt = 1 / fps; time = 0; P.place(sp.x, sp.z, sp.yaw || 0); P.startTour(); LR.wx.snap({ weather: 'clear', tod: (cfg.weather && cfg.weather.tod) || 16.6 }); LR.wx.set({ auto: true }); LR.render.histValid = false; LR.render.film = true; };
      window.realm.filmFrame = () => { time += fdt; P.update(fdt, cam); LR.wx.update(fdt, time); LR.emit('frame', time, fdt, cam); LR.render.draw(cam, time, fdt); };
      P.setTour(cfg.tour);
      if (LR.RENDER) {
        place(sp.x, sp.z, sp.yaw || 0);
        const c = (LR.q('cam', '') || '').split(',').map(Number);
        shot({ cam: c.length >= 2 && !isNaN(c[0]) ? c : null, tod: LR.qn('tod', undefined), weather: LR.q('wx', undefined), snow: LR.qn('snow', undefined), wet: LR.qn('wet', undefined), season: LR.qn('season', undefined), flash: LR.qn('flash', undefined), frames: LR.qn('frames', 10), t: LR.qn('t', 20) });
        document.getElementById('veil').classList.add('gone'); window.READY = true; return;
      }
      // live: start where the realm says (or ?at=x,z,yaw), on the tour and the automatic round unless asked otherwise
      const at = (LR.q('at', '') || '').split(',').map(Number);
      if (at.length >= 2 && !isNaN(at[0])) P.place(at[0], at[1], at[2] || 0); else P.place(sp.x, sp.z, sp.yaw || 0);
      const wx0 = cfg.weather || {};
      LR.wx.snap({ weather: LR.q('wx', wx0.weather || 'clear'), tod: LR.qn('tod', wx0.tod !== undefined ? wx0.tod : LR.wx.tod), wet: LR.qn('wet', undefined), puddle: LR.qn('puddle', undefined) });   /* ?wet=1&puddle=1: just after rain (it dries as you watch) */
      if (LR.q('auto', wx0.auto === false ? '0' : '1') !== '0' && LR.q('wx') === undefined && LR.q('tod') === undefined) LR.wx.set({ auto: true });
      P.bind(canvas); if (P.tour && LR.q('tour', '1') !== '0') P.startTour();
      let last = performance.now();
      const loop = (now) => { requestAnimationFrame(loop); const dt = Math.min(0.1, Math.max(0.0005, (now - last) / 1000)); last = now; if (document.hidden) return; time += dt; LR.emit('input', dt, cam); LR.wx.update(dt, time); LR.emit('frame', time, dt, cam); LR.render.draw(cam, time, dt); LR.emit('after', time, dt); };
      LR.progress(1, ''); document.getElementById('veil').classList.add('gone'); window.READY = true; LR.readyAt = performance.now(); requestAnimationFrame(loop);
    } catch (e) { if (e && e.trouble) LR.trouble(e.trouble, cfg); else LR.fail(e.stack || e.message || e); }
  };
  // ── when the graphics will not start, or stop ────────────────────────────────────────────────────────────────────
  // 'nogl': no WebGL 2 context could be made.  'lost': the context was lost (the graphics process crashed or was reset).
  // A lost context reopens the page once in safe mode (?safe=1: lowest tier, optional passes
  // off — the smallest shaders); otherwise a panel says what happened and offers the ways on.
  LR.trouble = (kind, cfg = {}) => {
    if (LR.RENDER) { LR.fail(kind === 'nogl' ? 'no WebGL 2 context' : 'the WebGL context was lost'); return; }
    const t = Object.assign({ noglTitle: 'The 3D view could not start', nogl: 'This browser did not give the page WebGL 2. Turn on hardware acceleration in its settings, or — if a 3D page crashed a moment ago — close and reopen the browser, then load this page again.',
      lostTitle: 'The graphics stopped', lost: 'The browser lost its graphics context (the graphics driver was reset or ran out of memory).', again: 'Try again', safe: 'Open in safe mode (lowest quality)', gpu: 'graphics' }, cfg.strings || {});
    const u = (q) => { const x = new URL(location.href); for (const k in q) x.searchParams.set(k, q[k]); return x.href; };
    let box = document.getElementById('trouble'); if (!box) { box = document.createElement('div'); box.id = 'trouble'; document.body.appendChild(box); }
    const veil = document.getElementById('veil'); if (veil) veil.classList.add('gone');
    box.innerHTML = '<div><b></b><p></p><span class="btns"><a class="b1"></a><a class="b2"></a></span><small></small></div>';
    box.querySelector('b').textContent = kind === 'nogl' ? t.noglTitle : t.lostTitle; box.querySelector('p').textContent = kind === 'nogl' ? t.nogl : t.lost;
    const b1 = box.querySelector('.b1'), b2 = box.querySelector('.b2'); b1.textContent = t.again; b1.href = u({}); b2.textContent = t.safe; b2.href = u({ safe: '1', go: '1' }); if (LR.q('safe') === '1') b2.remove();
    box.querySelector('small').textContent = LR.gpu ? `${t.gpu}: ${LR.gpu.name} · ${LR.gpu.tierName}${LR.gpu.safe ? ' · safe' : ''}` : '';
    window.FAILED = kind; };
  LR.watchContext = (canvas, cfg) => {
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (LR.RENDER) { LR.fail('the WebGL context was lost'); return; }
      let tried = false; try { tried = sessionStorage.getItem('lr-safe-tried') === location.pathname; } catch (err) { /* storage may be shut */ }
      // not yet in safe mode and not tried before in this tab: reopen once, small (the gear button leaves safe mode again)
      if (LR.q('safe') !== '1' && !tried) { try { sessionStorage.setItem('lr-safe-tried', location.pathname); } catch (err) { /* then it is offered by hand */ }
        const x = new URL(location.href); x.searchParams.set('safe', '1'); x.searchParams.set('go', '1'); location.replace(x.href); return; }
      LR.trouble('lost', cfg); }, false); };
}

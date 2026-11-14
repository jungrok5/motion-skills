// dragon-realm · 90_film — the runtime: renderer, shots and cameras, the frame, the live loop and the render API.
// A film calls DR.film({...}) once, as the last thing its sources do.
{
  const V = THREE.Vector3;
  // ── camera rails ──
  // DR.rail([[u, [px,py,pz], [lx,ly,lz], fov, roll°], …], ease?) → cam(u): position / look-at / lens through keys
  // (Catmull-Rom in u, so a move has no corners).  u runs 0..1 over the shot.  A position or target may be a
  // function (t) → [x,y,z] to follow something that moves.
  DR.rail = (keys, easing = 'io2') => {
    const K = keys.map((k) => ({ u: k[0], p: k[1], l: k[2], fov: k[3] ?? 40, roll: k[4] ?? 0 })), e = DR.ease[easing] || DR.ease.io2, n = K.length;
    const val = (x, t) => (typeof x === 'function' ? x(t) : x);
    const cr = (a, b, c, d, s) => 0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s * s + (-a + 3 * b - 3 * c + d) * s * s * s);
    return (u, t) => { const x = e(DR.sat(u)); let i = 0; while (i < n - 2 && K[i + 1].u < x) i++; const k0 = K[Math.max(0, i - 1)], k1 = K[i], k2 = K[Math.min(n - 1, i + 1)], k3 = K[Math.min(n - 1, i + 2)], s = DR.sat(DR.unlerp(k1.u, k2.u, x));
      const P = [k0, k1, k2, k3].map((k) => val(k.p, t)), L = [k0, k1, k2, k3].map((k) => val(k.l, t)), o = { p: [0, 0, 0], l: [0, 0, 0] };
      for (let c = 0; c < 3; c++) { o.p[c] = cr(P[0][c], P[1][c], P[2][c], P[3][c], s); o.l[c] = cr(L[0][c], L[1][c], L[2][c], L[3][c], s); }
      o.fov = cr(k0.fov, k1.fov, k2.fov, k3.fov, s); o.roll = cr(k0.roll, k1.roll, k2.roll, k3.roll, s); return o; };
  };

  DR.film = async (F) => {
    try {
      DR.F = F; DR.DURATION = F.duration; DR.FPS = F.fps || 30; DR.SEED = F.seed || 1;
      const canvas = document.getElementById('frame');
      const scaleQ = DR.num('scale', 1), BW = F.width || 1920, BH = F.height || 1080;
      if (DR.RENDER) document.body.classList.add('render');
      const renderer = (DR.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: DR.RENDER }));
      renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = DR.on('shadow'); renderer.shadowMap.type = DR.P.get('pcf') === 'soft' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = true;
      const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
      DR.gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'WebGL'; DR.soft = /SwiftShader|llvmpipe|Software/i.test(DR.gpu);
      const Q = (DR.Q = { scale: scaleQ, airDiv: DR.num('air', 3), steps: DR.num('steps', DR.soft ? 44 : 64), shadow: DR.num('shadow', DR.soft ? 2048 : 4096), mirror: DR.num('mirror', 0.5), dens: DR.num('q', 1) });
      DR.U.uNoise.value = DR.makeNoiseTex(); DR.U.uNoise3.value = DR.makeNoise3(64);
      DR.progress(0.05, 'noise');
      const scene = (DR.scene = new THREE.Scene()), fx = (DR.fxScene = new THREE.Scene());
      const cam = (DR.cam = new THREE.PerspectiveCamera(40, BW / BH, F.near || 0.5, F.far || 9000));
      const sun = (DR.sun = new THREE.DirectionalLight(0xffffff, 1)); sun.castShadow = true; sun.shadow.mapSize.set(Q.shadow, Q.shadow); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.2; sun.shadow.radius = 2.2;
      scene.add(sun, sun.target); scene.add(DR.makeSky());
      let W = 0, H = 0, view, post;
      const resize = (w, h) => { w = Math.round(w); h = Math.round(h); if (w === W && h === H) return; W = w; H = h; renderer.setSize(w, h, false); if (view) { view.size(w, h); post.size(w, h); } else { view = DR.view = new DR.View(w, h, { airDiv: Q.airDiv, steps: Q.steps }); post = DR.post = new DR.Post(w, h); } DR.U.uRes.value.set(w, h); };
      resize(BW * Q.scale, BH * Q.scale);

      // ── the film builds its world ──
      await F.build({ scene, fx, cam, renderer });
      for (const b of DR.bootFns) { await b(); await DR.breathe(); }
      const shots = (DR.shots = F.shots.map((s, i) => ({ ...s, i, t1: s.t1 ?? (F.shots[i + 1] ? F.shots[i + 1].t0 : F.duration) })));
      const shotAt = (t) => { let s = shots[0]; for (const x of shots) if (x.t0 <= t + 1e-6) s = x; return s; };
      DR.shotAt = shotAt;

      const up = new V(0, 1, 0), tp = new V(), tl = new V(), tq = new THREE.Quaternion(), fw = new V(), nudge = { x: 0, y: 0 };
      const lightM = new THREE.Matrix4(), lightI = new THREE.Matrix4(), ctr = new V();
      const setCamera = (t) => {
        const s = shotAt(t), uu = DR.sat((t - s.t0) / Math.max(1e-6, s.t1 - s.t0)), c = DR.camOverride ? DR.camOverride(t) : s.cam(uu, t);
        const sh = DR.camOverride ? 0 : s.shake ?? 0.25; // hand-held drift, metres at the lens / fraction of the view at the target
        tp.set(c.p[0] + DR.wobble(t * 0.33, 11 + s.i) * sh * 0.5, c.p[1] + DR.wobble(t * 0.29, 12 + s.i) * sh * 0.35, c.p[2] + DR.wobble(t * 0.31, 13 + s.i) * sh * 0.5);
        const dist = Math.hypot(c.l[0] - c.p[0], c.l[1] - c.p[1], c.l[2] - c.p[2]), k = dist * 0.004 * (sh / 0.25);
        tl.set(c.l[0] + DR.wobble(t * 0.47, 14 + s.i) * k, c.l[1] + DR.wobble(t * 0.41, 15 + s.i) * k, c.l[2] + DR.wobble(t * 0.44, 16 + s.i) * k);
        const kick = DR.camKick ? DR.camKick(t) : 0; if (kick) { tl.x += DR.noise1(t * 31, 5) * kick * dist * 0.01; tl.y += DR.noise1(t * 37, 6) * kick * dist * 0.01; }
        cam.position.copy(tp); cam.up.copy(up); cam.lookAt(tl);
        if (!DR.RENDER) { cam.rotateY(-nudge.x * 0.035); cam.rotateX(-nudge.y * 0.02); }
        const roll = (c.roll || 0) * DR.DEG + DR.wobble(t * 0.23, 17 + s.i) * 0.004 * (sh / 0.25) + (kick ? DR.noise1(t * 29, 7) * kick * 0.01 : 0); if (roll) cam.rotateZ(roll);
        cam.fov = c.fov || 40; cam.aspect = BW / BH; cam.near = s.near || F.near || 0.5; cam.far = F.far || 9000; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
        DR.U.uPx.value = (2 * Math.tan((cam.fov * DR.DEG) / 2)) / H;   // radians per pixel
        // the shadow box: `span` metres round a point ahead of the lens (or the shot's own centre), snapped to texels
        const span = s.shadow?.span ?? 170, at = s.shadow?.at; cam.getWorldDirection(fw);
        if (at) { const a = typeof at === 'function' ? at(t) : at; ctr.set(a[0], a[1], a[2]); } else ctr.copy(cam.position).addScaledVector(fw, Math.min(span * 0.42, dist));
        const kd = DR.U.uKeyDir.value; const sc = sun.shadow.camera;
        lightM.lookAt(new V().copy(kd), new V(0, 0, 0), up); lightI.copy(lightM).invert();
        const texel = span / Q.shadow, lc = ctr.clone().applyMatrix4(lightI); lc.x = Math.round(lc.x / texel) * texel; lc.y = Math.round(lc.y / texel) * texel; lc.applyMatrix4(lightM);
        sun.target.position.copy(lc); sun.position.copy(lc).addScaledVector(kd, 700); sun.target.updateMatrixWorld(); sun.updateMatrixWorld();
        sc.left = sc.bottom = -span / 2; sc.right = sc.top = span / 2; sc.near = 1; sc.far = 1500; sc.updateProjectionMatrix();
        return s;
      };

      const fadeOf = (t) => { const f = F.fade ? F.fade(t) : null; return f && f[3] > 0 ? f : null; };
      let frames = 0;
      const renderAt = (DR.renderAt = (t) => {
        t = DR.clamp(t, 0, F.duration - 1e-4); DR.t = t;
        for (const f of DR.frameFns) if (f.order < 50) f.fn(t);       // creatures pose first: the light may follow them (a glow, a flash)
        DR.applyLight(t);
        const s = setCamera(t); DR.shot = s;
        for (const f of DR.frameFns) if (f.order >= 50) f.fn(t, cam);
        renderer.shadowMap.needsUpdate = true;
        if (DR.mirrorPass) DR.mirrorPass(renderer, scene, cam, t);
        const out = view.render(renderer, scene, cam, true);
        if (fx.children.length && DR.on('fx')) { DR.U.uRes.value.set(W, H); if (DR.fxU) { DR.fxU.tDepth.value = view.scene.depthTexture; DR.fxU.uNF.value.set(cam.near, cam.far); } renderer.setRenderTarget(out); renderer.render(fx, cam); }
        post.render(renderer, out, view.scene.depthTexture, cam, DR.look, null, fadeOf(t));
        frames++;
      });

      // checks a film's parts register (DR.checks.push(() => ({ fail: [], warn: [], info: [] }))) and the cast sheet views
      const runChecks = () => { const out = { fail: [], warn: [], info: [] }; for (const c of DR.checks) { const r = c() || {}; for (const k of ['fail', 'warn', 'info']) out[k].push(...(r[k] || [])); } return out; };
      const cast = (i) => { const v = DR.castViews[i]; if (!v) { DR.camOverride = null; return null; } DR.camOverride = () => v.cam(v.t); renderAt(v.t); DR.camOverride = null; return v.label; };
      const film = (window.film = { DURATION: F.duration, FPS: DR.FPS, canvas, renderAt, shots, title: F.title, runChecks, cast, audio: DR.audio, get gpu() { return DR.gpu; }, info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, programs: renderer.info.programs.length, frames }), DR });
      window.DURATION = F.duration; window.FPS = DR.FPS; window.seek = renderAt;
      // warm every program behind the veil so the first frame is like the others
      renderAt(DR.num('t', 0)); await DR.breathe(); renderAt(DR.num('t', 0));
      DR.progress(1, 'ready');
      document.getElementById('veil').classList.add('gone'); window.READY = true;
      if (DR.RENDER) return;

      // ── live ──
      const fit = () => { const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2); const w = Math.min(BW, Math.max(320, r.width * dpr)) * live.q; resize(w, (w * BH) / BW); };
      const live = { q: 1, t0: performance.now() / 1000 - DR.num('t', 0), paused: false, at: DR.num('t', 0), acc: 0, n: 0, last: 0 };
      window.addEventListener('resize', fit); fit();
      const hint = document.getElementById('hint'); if (DR.audio) { hint.classList.add('on'); }
      const now = () => (DR.audio && DR.audio.playing() ? DR.audio.time() : DR.mod(performance.now() / 1000 - live.t0, F.duration));
      const start = async () => { if (!DR.audio || DR.audio.started) return; hint.textContent = 'starting sound…'; await DR.audio.start(now()); live.t0 = performance.now() / 1000 - DR.audio.time(); hint.classList.remove('on'); };
      window.addEventListener('pointerdown', start); window.addEventListener('keydown', (e) => { if (e.key === 'm' || e.key === 'M') start();
        if (e.code === 'Space') { e.preventDefault(); live.paused = !live.paused; if (live.paused) { live.at = now(); DR.audio && DR.audio.pause(); } else { live.t0 = performance.now() / 1000 - live.at; DR.audio && DR.audio.resume(live.at); } } });
      window.addEventListener('pointermove', (e) => { nudge.x = (e.clientX / innerWidth) * 2 - 1; nudge.y = (e.clientY / innerHeight) * 2 - 1; });
      const loop = (ms) => { requestAnimationFrame(loop); const t = live.paused ? live.at : now(); const a = performance.now(); renderAt(t); gl.flush();
        const dt = ms - live.last; live.last = ms; if (dt > 0 && dt < 500) { live.acc += dt; live.n++; }
        if (live.n >= 40) { const avg = live.acc / live.n; live.acc = live.n = 0; const q0 = live.q; if (avg > 24 && live.q > 0.45) live.q = Math.max(0.45, live.q * 0.86); else if (avg < 17.2 && live.q < 1) live.q = Math.min(1, live.q * 1.08); if (q0 !== live.q) fit(); } };
      requestAnimationFrame(loop);
    } catch (e) { DR.fail(e); window.FAILED = String((e && e.stack) || e); throw e; }
  };
}

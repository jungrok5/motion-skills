// shred-poster · 90_film — the runtime: renderer, the four shots on one timeline, the frame, the live loop, the sound and
// the render API. A film calls SP.film({...}) once, as the last thing its sources do.
//
//   SP.film({
//     title, fps: 60, width: 1080, height: 1920,
//     cuts: { cascade: 0.5, machine: 2.37, rebuild: 4.4, end: 8.0 },   // the beat sheet (seconds)
//     poster: () => SP.poster({...}),                                    // this topic's poster
//     sheet:   { strips, jitter, seed, floor, order, lifts, lunge, camY, scale, key, fill },
//     cascade: { width, printScale, heroScale, layers, floor, roll, key, back, sky, dof },
//     machine: { lanes, feed, bite, body, steel, backdrop, inset, bg, key, rim, cameraKeys },
//     studio:  { top, horizon, ground },  grade: { exposure, grain, vignette, glow, warm },
//     sound:   { on, lufs, character: { bright, body }, extra: (cues, T) => {} },
//   })
{
  SP.film = async (F) => {
    try {
      const fps = (SP.FPS = F.fps || 60), BW = F.width || 1080, BH = F.height || 1920;
      const C = { cascade: 0.5, machine: 2.37, rebuild: 4.4, end: 8.0, ...(F.cuts || {}) }, DUR = (SP.DURATION = C.end);
      const canvas = document.getElementById('frame');
      if (SP.RENDER) document.body.classList.add('render');
      const renderer = (SP.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: SP.RENDER, powerPreference: 'high-performance' }));
      renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping; renderer.setPixelRatio(1); renderer.autoClear = false;   // the post pass clears what it needs (sub-frames accumulate)
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
      SP.gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'WebGL'; SP.soft = /SwiftShader|llvmpipe|Software/i.test(SP.gpu);
      // render mode: the asked scale; live: as many pixels as the display shows (between 35 % and 100 %)
      const liveScale = SP.clamp((Math.min(innerHeight, innerWidth * BH / BW) * (devicePixelRatio || 1)) / BH, 0.35, 1);
      const scale = SP.num('scale', SP.RENDER ? 1 : liveScale), W = Math.round(BW * scale), H = Math.round(BH * scale);
      renderer.setSize(W, H, false);
      const MB = SP.RENDER ? Math.max(1, SP.num('mb', 4)) : 1;   // sub-frames per frame (motion blur + antialiasing)
      const post = new SP.Post(renderer, W, H, { msaa: SP.RENDER ? 0 : SP.num('msaa', 4) });
      SP.progress(0.1, 'fonts');
      await SP.loadFonts();
      SP.progress(0.25, 'poster'); await SP.breathe();
      const poster = (SP.posterData = await (typeof F.poster === 'function' ? F.poster() : F.poster));
      const texHero = SP.canvasTex(poster.hero), texPlain = SP.canvasTex(poster.plain);
      const env = SP.envMap(renderer, F.studio || {});
      const ctx = { poster, texHero, texPlain, env, aspect: BW / BH };
      SP.progress(0.4, 'sheet'); await SP.breathe();
      const hookDur = C.cascade, rebuildDur = DUR - C.rebuild;
      const sheet = SP.sheetShots(ctx, { ...(F.sheet || {}), hookDur, rebuildDur });
      sheet.scene.environment = env; sheet.scene.environmentIntensity = 0.25;
      SP.progress(0.55, 'cascade'); await SP.breathe();
      const cascade = SP.cascadeShot(ctx, { ...(F.cascade || {}), dur: C.machine - C.cascade });
      cascade.scene.environment = env; cascade.scene.environmentIntensity = 0.3;
      SP.progress(0.7, 'machine'); await SP.breathe();
      const MD = C.rebuild - C.machine, machine = SP.machineShot(ctx, { ...(F.machine || {}), dur: MD });
      const shots = [
        { name: 'hook', t0: 0, t1: C.cascade, set: (u) => sheet.hook(u), scene: sheet.scene, cam: sheet.cam },
        { name: 'cascade', t0: C.cascade, t1: C.machine, set: (u) => cascade.update(u), scene: cascade.scene, cam: cascade.cam, dof: cascade.dof },
        { name: 'machine', t0: C.machine, t1: C.rebuild, set: (u) => machine.update(u), scene: machine.scene, cam: machine.cam, inset: true },
        { name: 'rebuild', t0: C.rebuild, t1: DUR, set: (u) => sheet.rebuild(u), scene: sheet.scene, cam: sheet.cam },
      ];
      const shotAt = (t) => { let s = shots[0]; for (const x of shots) if (x.t0 <= t + 1e-9) s = x; return s; };
      const G = { exposure: 1, grain: 0.012, vignette: 0.13, glow: 0.35, warm: 1, ...(F.grade || {}) };
      const M = { inset: 0.78, bg: '#ffffff', ...(F.machine || {}) };
      const frameDur = 1 / fps;

      // ── the edit: whips either side of a cut, punches on the rip and on the final click, the inset growing in ──
      const cutDirs = [[C.cascade, [1, 0], [-0.77, 0.64]], [C.machine, [-0.77, 0.64], [0, 1]], [C.rebuild, [1, 0], [1, 0]]];
      const OUT = [4, 10, 20, 34], IN = [24, 10];
      const whip = (t) => {
        const f = Math.round(t * fps);
        for (const [tc, dOut, dIn] of cutDirs) {
          const fc = Math.round(tc * fps), k = fc - 1 - f;
          if (k >= 0 && k < OUT.length) return [dOut[0] * OUT[OUT.length - 1 - k], -dOut[1] * OUT[OUT.length - 1 - k]];
          const j = f - fc; if (j >= 0 && j < IN.length) return [dIn[0] * IN[j], -dIn[1] * IN[j]];
        }
        return [0, 0];
      };
      const H_RIP = Math.round((F.sheet?.hookHold ?? 4 / 60) * fps), HP = [[1.012, 6, -4, 0.8], [1.008, -4, 3, 0.5], [1.004, 2, -2, 0.25], [1.001, 0, 0, 0]];
      const CP = [1.004, 1.007, 1.005, 1.003, 1.0015, 1.0005], cClick = Math.round((C.rebuild + sheet.tLast) * fps);
      const punch = (t) => {
        const f = Math.round(t * fps), sc = BW / 1080;
        if (f - H_RIP >= 0 && f - H_RIP < HP.length) { const p = HP[f - H_RIP]; return { s: p[0], dx: p[1] * sc, dy: -p[2] * sc, sharp: p[3] }; }
        if (f - cClick >= 0 && f - cClick < CP.length) return { s: CP[f - cClick], dx: 0, dy: 0, sharp: 0 };
        return { s: 1, dx: 0, dy: 0, sharp: 0 };
      };
      const insetAt = (t) => { const f = Math.round((t - C.machine) * fps); return f < 0 || t >= C.rebuild ? 1 : 1 - (1 - M.inset) * SP.sease(f / 8, 2.2); };

      // ── one frame: N sub-frames across a 180° shutter, kept inside the shot, each with a sub-pixel jitter ──
      const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
      let lastShot = null;
      const renderAt = (t) => {
        t = ((t % DUR) + DUR) % DUR;
        const s = shotAt(t);
        for (let k = 0; k < MB; k++) {
          const tk = MB > 1 ? SP.clamp(t + ((k + 0.5) / MB - 0.5) * 0.5 * frameDur, s.t0, s.t1 - 1e-5) : t;
          s.set(tk - s.t0);
          if (MB > 1) s.cam.setViewOffset(W, H, (halton(k + 1, 2) - 0.5), (halton(k + 1, 3) - 0.5), W, H);
          post.add(s.scene, s.cam, 1 / MB, k === 0);
          if (MB > 1) s.cam.clearViewOffset();
        }
        const p = punch(t), w = whip(t);
        post.finish({ uNear: s.cam.near, uFar: s.cam.far, uDofK: s.dof ? s.dof.k : 0, uDofFocus: s.dof ? s.dof.focus : 1, uWhip: [w[0] * scale, w[1] * scale], uPunch: [p.s, p.dx * scale, p.dy * scale], uSharp: p.sharp,
          uInset: s.inset ? insetAt(t) : 1, uBg: SP.color(M.bg), uExposure: G.exposure, uGrain: G.grain, uVig: G.vignette, uGlow: G.glow, uWarm: G.warm, uFrame: Math.round(t * fps) % 997 });
        lastShot = s.name;
      };

      // ── the sound, from the film's own timings ──
      SP.progress(0.82, 'sound'); await SP.breathe();
      const cues = [], NS = sheet.strips.length;
      sheet.strips.forEach((st, i) => { const tt = (F.sheet?.hookHold ?? 4 / 60) + 0.01 * i; if (i % 2 === 0) cues.push({ t: tt, kind: 'rip', dur: 0.14, gain: 0.32, pan: SP.hash(i, 3) - 0.5 }); });
      cues.push({ t: 0.04, kind: 'whoosh', dur: C.cascade + 0.1, f0: 250, f1: 2600, gain: 0.3 });
      cues.push({ t: C.cascade - 0.02, kind: 'thump', gain: 0.25 });
      for (const lt of cascade.landTimes) { const t = C.cascade + lt; cues.push({ t, kind: 'swish', dur: 0.28, pan: SP.hash(Math.round(lt * 100)) - 0.5 }, { t, kind: 'pat', gain: 0.32, pan: SP.hash(Math.round(lt * 100), 2) - 0.5 }); }
      cues.push({ t: C.machine - 0.25, kind: 'whoosh', dur: 0.45, f0: 2200, f1: 400, gain: 0.22 });
      const tIn = C.machine + machine.tIn;
      const load = (tt) => { const lt = tt - C.machine, f = machine.fed(lt); return f <= 0 || f >= SP.PH ? 0 : SP.sat((tt - tIn) / 0.05); };
      cues.push({ t: C.machine - 0.05, kind: 'motor', dur: MD + 0.35, load, spin: (tt) => (tt < C.rebuild ? 1 : Math.max(0.15, 1 - (tt - C.rebuild) / 0.35)), gain: 0.15 });
      cues.push({ t: tIn, kind: 'grain', dur: C.rebuild - tIn, load, gain: 0.3 });
      cues.push({ t: C.machine + machine.tBite, kind: 'rip', dur: 0.2, gain: 0.35 });
      sheet.plan.forEach((p, i) => { const tl = C.rebuild + p.t2 + p.d2; cues.push({ t: C.rebuild + Math.max(0, p.t2 - 0.25), kind: 'slide', dur: Math.min(0.25, p.t2) + p.d2 * 0.8, pan: Math.sign(p.o0) * 0.4 }); });
      sheet.lands.forEach((l, n) => cues.push({ t: C.rebuild + l.t, kind: 'click', big: n === sheet.lands.length - 1, gain: n === sheet.lands.length - 1 ? 0.6 : 0.42, pan: Math.sign(sheet.plan[l.i].o0) * 0.25, f: 2200 + 900 * SP.hash(n, 9) }));
      if (F.sound?.extra) F.sound.extra(cues, C);
      const soundOn = F.sound?.on !== false;
      const snd = soundOn ? SP.sound(cues, { duration: DUR, lufs: F.sound?.lufs ?? -14, character: F.sound?.character }) : null;

      // ── the API (render scripts, check.mjs) ──
      const film = (window.film = {
        DURATION: DUR, FPS: fps, canvas, W, H, MB, cuts: C, gpu: SP.gpu,
        shots: shots.map(({ name, t0, t1 }) => ({ name, t0, t1 })),
        renderAt, issues: poster.issues, marks: poster.marks,
        info: () => ({ shot: lastShot }),
        cues: () => cues.map((c) => ({ t: +c.t.toFixed(4), frame: +(c.t * fps).toFixed(1), kind: c.kind, ...(c.dur ? { dur: +c.dur.toFixed(3) } : {}), ...(c.big ? { big: true } : {}) })).sort((a, b) => a.t - b.t),
        sound: () => (snd ? { lufs: snd.lufs, peak: snd.peak, b64: SP.wavB64(snd) } : null),
        soundStats: () => (snd ? { lufs: snd.lufs, peak: snd.peak, target: F.sound?.lufs ?? -14 } : null),
        posterPNG: (which = 'hero') => poster[which].toDataURL('image/png'),
        landings: () => ({ rebuild: sheet.lands.map((l) => C.rebuild + l.t), cascade: cascade.landTimes.map((x) => C.cascade + x) }),
      });
      SP.progress(1, 'ready');
      if (SP.RENDER) { renderAt(SP.num('t', 0)); window.READY = true; return; }

      // ── live: loops in the browser; click for sound, space pauses, ←/→ step ──
      const veil = document.getElementById('veil'), hint = document.getElementById('hint');
      let playing = true, t = SP.num('t', 0), last = performance.now(), actx = null, src = null, t0Audio = 0;
      const startAudio = () => {
        if (!snd) return; actx = actx || new AudioContext(); if (src) { try { src.stop(); } catch {} }
        const buf = actx.createBuffer(2, snd.L.length, snd.rate); buf.copyToChannel(snd.L, 0); buf.copyToChannel(snd.R, 1);
        src = actx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(actx.destination); src.start(0, t % DUR); t0Audio = actx.currentTime - (t % DUR);
      };
      const stopAudio = () => { if (src) { try { src.stop(); } catch {} src = null; } };
      canvas.addEventListener('click', () => { if (src) stopAudio(); else { startAudio(); hint.classList.remove('on'); } });
      addEventListener('keydown', (e) => {
        if (e.code === 'Space') { playing = !playing; if (!playing) stopAudio(); e.preventDefault(); }
        if (e.code === 'ArrowRight') { t += 1 / fps; stopAudio(); } if (e.code === 'ArrowLeft') { t -= 1 / fps; stopAudio(); }
      });
      const loop = (now) => {
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        if (playing) t = src && actx ? actx.currentTime - t0Audio : t + dt;
        renderAt(t); requestAnimationFrame(loop);
      };
      renderAt(t); veil.classList.add('gone'); if (snd) { hint.classList.add('on'); setTimeout(() => hint.classList.remove('on'), 4000); }
      window.READY = true; requestAnimationFrame(loop);
    } catch (e) { SP.fail(e); }
  };
}

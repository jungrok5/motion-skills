// machine-wilds · 10_gpu — the renderer, render targets, full-screen passes, quality tiers, the runtime noise texture.
{
  const T = THREE;
  // quality tiers.  scale = internal render scale range (the picture is temporally upsampled to the canvas).
  // dprCap = canvas pixels a CSS pixel at most, on a desktop (a phone's canvas has its own rule: 90_app).
  // `low` is the phone's tier.  It was drawn at 0.4–0.8 of a canvas of 1.5 pixels a CSS pixel and stretched: 350
  // pixels across a 1170-pixel screen at the start, 230 once the governor had chased sixty frames a second — it
  // looked out of focus.  A phone now has a canvas of two pixels a CSS pixel, 0.4–1.0 of it drawn and the rest
  // resolved from the frames before (75_post), and its governor holds thirty frames a second, not sixty (88_hud).
  // ssr = steps of the water's screen-space reflection march (0: the water mirrors the sky only).
  // mirror = steps of the wet ground's reflection march (75_post): only smooth pixels pay, so a dry day pays nothing.
  // contact = steps of the screen-space contact shadow toward the sun (0: cascades only).
  // gi = rays per half-size pixel of the screen-space bounce (0: sky light and occlusion only).
  LR.TIERS = {
    low:    { name: 'low',    mat: 512,  aniso: 4, shadow: 1024, cascades: 2, shadowDist: 70,  shadowTaps: 4, ao: 0, vol: 8,  scaleMin: 0.4,  scaleMax: 1.0,  dprCap: 1.5,  grass: 0.4, grassDist: 40, treeNear: 22, treeMid: 70,  fx: 0.5, bloom: 4, pom: 0, gi: 0, contact: 0, ssr: 0, mirror: 8, lights: 8,  topo: 1024, env: 64,  taaSharp: 0.5 },
    medium: { name: 'medium', mat: 512,  aniso: 4, shadow: 2048, cascades: 3, shadowDist: 110, shadowTaps: 5, ao: 1, vol: 12, scaleMin: 0.5,  scaleMax: 0.85, dprCap: 1.25, grass: 0.7, grassDist: 55, treeNear: 30, treeMid: 95,  fx: 0.75, bloom: 5, pom: 0, gi: 2, contact: 0, ssr: 12, mirror: 12, lights: 12, topo: 2048, env: 128, taaSharp: 0.5 },
    high:   { name: 'high',   mat: 768,  aniso: 8, shadow: 2048, cascades: 3, shadowDist: 140, shadowTaps: 8, ao: 2, vol: 16, scaleMin: 0.6,  scaleMax: 1.0,  dprCap: 1.5,  grass: 1.0, grassDist: 70, treeNear: 38, treeMid: 120, fx: 1, bloom: 6, pom: 1, gi: 3, contact: 8, ssr: 18, mirror: 18, lights: 16, topo: 2048, env: 128, taaSharp: 0.45 },
    ultra:  { name: 'ultra',  mat: 1024, aniso: 16, shadow: 4096, cascades: 3, shadowDist: 170, shadowTaps: 8, ao: 3, vol: 24, scaleMin: 0.75, scaleMax: 1.0,  dprCap: 2,    grass: 1.4, grassDist: 85, treeNear: 48, treeMid: 150, fx: 1.25, bloom: 6, pom: 1, gi: 5, contact: 12, ssr: 26, mirror: 24, lights: 24, topo: 2048, env: 256, taaSharp: 0.4 },
  };

  LR.initGPU = (canvas) => {
    // no context (hardware acceleration off, a blocked driver, or the browser has shut WebGL after a graphics crash): say
    // that, not a stack trace — LR.trouble() shows what to do
    let renderer; try { renderer = new T.WebGLRenderer({ canvas, antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: LR.RENDER }); } catch (e) { const err = new Error('no WebGL'); err.trouble = 'nogl'; throw err; }
    const gl = renderer.getContext();
    if (!renderer.capabilities.isWebGL2) { const err = new Error('WebGL 2 is needed'); err.trouble = 'nogl'; throw err; }
    renderer.autoClear = false; renderer.outputColorSpace = T.LinearSRGBColorSpace; renderer.info.autoReset = false;
    renderer.debug.checkShaderErrors = true;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const G = (LR.gpu = { renderer, gl, name: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown' });
    G.software = /swiftshader|llvmpipe|software/i.test(G.name);
    G.mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
    G.halfFloat = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
    G.timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    G.maxAniso = renderer.capabilities.getMaxAnisotropy();
    // tier: ?q= wins, then a guess from the device
    const want = LR.q('q', '');
    // integrated and old or small discrete chips start on `medium` (the G button raises it); only what is plainly a current
    // discrete card starts on `high`.  A wrong guess downward costs a press; a wrong guess upward can cost the page.
    const small = /Intel|Iris|UHD|HD Graphics|Mali|Adreno|PowerVR/i.test(G.name) && !/Arc/i.test(G.name), weak = /Radeon(\(TM\))? (Graphics|R\d|HD|Vega)|Vega \d|GeForce (GT |MX|\d{3}M|[6-9]\d{2}\b|GTX (6|7|9)\d{2}\b|GTX 10[0-5]0\b)|Quadro (K|M|P[4-6]\d{2}\b)|FirePro|Microsoft Basic|llvmpipe/i.test(G.name);
    const guess = G.mobile ? 'low' : G.software ? 'medium' : small || weak ? 'medium' : 'high';
    // ?safe=1: the lowest tier with every optional pass off — the smallest shaders and buffers the engine has.  The page
    // reopens itself this way once if the graphics context is lost while it starts (LR.trouble)
    G.safe = LR.q('safe') === '1';
    if (G.safe) for (const k of ['gi', 'contact', 'mirror', 'shafts', 'ssr', 'pcss', 'skyshare', 'ao']) LR.off.add(k);
    G.tierName = G.safe ? 'low' : LR.TIERS[want] ? want : guess; G.auto = !LR.TIERS[want] && !G.safe;
    G.tier = Object.assign({}, LR.TIERS[G.tierName]);
    if (LR.qn('mat', 0)) G.tier.mat = LR.qn('mat', 512);
    G.hdrType = G.halfFloat ? T.HalfFloatType : T.UnsignedByteType;
    return G;
  };

  // render target helper
  LR.rt = (w, h, o = {}) => {
    const rt = new T.WebGLRenderTarget(Math.max(1, w | 0), Math.max(1, h | 0), {
      format: o.format || T.RGBAFormat, type: o.type || T.UnsignedByteType, internalFormat: o.internalFormat || null,
      minFilter: o.min || o.filter || T.LinearFilter, magFilter: o.filter || T.LinearFilter, wrapS: o.wrap || T.ClampToEdgeWrapping, wrapT: o.wrap || T.ClampToEdgeWrapping,
      depthBuffer: !!o.depth, stencilBuffer: false, generateMipmaps: !!o.mips, count: o.count || 1, colorSpace: T.NoColorSpace,
    });
    if (o.depthTexture) { rt.depthTexture = o.depthTexture; }
    return rt;
  };

  // full-screen passes: one triangle, an orthographic camera, a RawShaderMaterial per pass
  const tri = new T.BufferGeometry(); tri.setAttribute('position', new T.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const fsScene = new T.Scene(), fsCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), fsMesh = new T.Mesh(tri, null); fsMesh.frustumCulled = false; fsScene.add(fsMesh);
  LR.triGeo = tri;
  LR.passes = [];                                                                    // every full-screen pass made, so their programs can be prepared before the first frame (LR.warm)
  LR.pass = (frag, uniforms = {}, o = {}) => {
    const p = { glslVersion: T.GLSL3, vertexShader: LR.sh(o.vert || LR.chunk.fsvs), fragmentShader: LR.sh(frag), uniforms, defines: o.defines || {}, depthTest: false, depthWrite: false, blending: o.blending || T.NoBlending, transparent: !!o.blending };
    for (const k of ['blendSrc', 'blendDst', 'blendEquation', 'blendSrcAlpha', 'blendDstAlpha']) if (o[k] !== undefined) p[k] = o[k];
    const m = new T.RawShaderMaterial(p); LR.passes.push(m); m.addEventListener('dispose', () => { const k = LR.passes.indexOf(m); if (k >= 0) LR.passes.splice(k, 1); }); return m;
  };
  // Prepare every program the first frame will need, without holding the graphics thread: each is compiled and linked
  // in the background (KHR_parallel_shader_compile) and waited for.  Compiled on first use instead, one large shader can
  // hold the graphics process for longer than the browser's watchdog allows (Direct3D's compiler on Windows is slow on
  // long shaders) — the browser then kills it and the page is left with a dead canvas.  step(done, total) reports.
  LR.warm = async (scenes, cam, step) => { const r = LR.gpu.renderer, tmp = new T.Scene(), hidden = [];
    for (const m of LR.passes) { const q = new T.Mesh(tri, m); q.frustumCulled = false; tmp.add(q); }
    for (const sc of scenes) sc.traverse((o) => { if (o.visible === false && o.material) { o.visible = true; hidden.push(o); } });       // what is not in view yet will be
    const all = [tmp, ...scenes]; let done = 0;
    try { for (const sc of all) { await r.compileAsync(sc, sc === tmp ? fsCam : cam); if (step) step(++done, all.length); await LR.breath(); } }
    finally { for (const o of hidden) o.visible = false; tmp.clear(); } };
  // the same for meshes that join the world after it has started (a scan that has just arrived): resolve when their
  // programs are ready, so their first frame does not compile
  LR.warmMeshes = async (meshes, cam) => { if (LR.RENDER || !meshes.length) return; const tmp = new T.Scene(); for (const o of meshes) { const q = new T.Mesh(o.geometry, o.material); q.frustumCulled = false; tmp.add(q); }
    try { await LR.gpu.renderer.compileAsync(tmp, cam || LR.cam); } catch (e) { /* then they compile on first use */ } finally { tmp.clear(); } };
  // Freeing a texture (or a program) right after the pass that read it: WebGL promises the pass is carried out first,
  // but a software renderer under a heavy load of uploads was seen to lose such passes — whole material layers came out
  // empty once fifty models were baked before them.  So what a bake has read is freed through here: where stills are
  // made the passes are finished first; on the live page the freeing waits a moment instead of stalling a frame.
  LR.settle = (free) => { const gl = LR.gpu.renderer.getContext(); if (LR.RENDER) { gl.finish(); if (free) free(); } else { gl.flush(); if (free) setTimeout(free, 1500); } };
  LR.blit = (mat, target, layer) => { const r = LR.gpu.renderer; fsMesh.material = mat; if (layer === undefined) r.setRenderTarget(target || null); else r.setRenderTarget(target, layer); r.render(fsScene, fsCam); };
  // world material helper (RawShaderMaterial, GLSL3)
  LR.material = (o) => new T.RawShaderMaterial(Object.assign({ glslVersion: T.GLSL3 }, o, { vertexShader: LR.sh(o.vertexShader), fragmentShader: LR.sh(o.fragmentShader) }));

  // a small tileable RGBA noise (four independent value-noise fields, 3 octaves each) for runtime detail, clouds, puddles
  LR.makeNoise = (size = 256) => {
    const d = new Uint8Array(size * size * 4), r = LR.rng(77);
    for (let c = 0; c < 4; c++) {
      const acc = new Float32Array(size * size);
      let amp = 0.5, tot = 0;
      for (const cells of [4, 8, 16, 32, 64]) {
        const g = new Float32Array(cells * cells); for (let i = 0; i < g.length; i++) g[i] = r();
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
          const fx = x / size * cells, fy = y / size * cells, xi = Math.floor(fx), yi = Math.floor(fy);
          let u = fx - xi, v = fy - yi; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
          const x1 = (xi + 1) % cells, y1 = (yi + 1) % cells;
          const a = g[yi * cells + xi], b = g[yi * cells + x1], cc = g[y1 * cells + xi], dd = g[y1 * cells + x1];
          acc[y * size + x] += amp * (a + (b - a) * u + (cc - a) * v + (a - b - cc + dd) * u * v);
        }
        tot += amp; amp *= 0.5;
      }
      // stretch to the full range so thresholds behave
      let lo = 1, hi = 0; for (let i = 0; i < acc.length; i++) { const v = acc[i] / tot; if (v < lo) lo = v; if (v > hi) hi = v; }
      for (let i = 0; i < acc.length; i++) d[i * 4 + c] = Math.round(LR.sat((acc[i] / tot - lo) / (hi - lo)) * 255);
    }
    const t = new T.DataTexture(d, size, size, T.RGBAFormat, T.UnsignedByteType);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
    LR.U.uNoise.value = t; return t;
  };

  // halton jitter
  LR.halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
}

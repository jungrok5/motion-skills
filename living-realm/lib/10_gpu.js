// living-realm · 10_gpu — the renderer, render targets, full-screen passes, quality tiers, the runtime noise texture.
{
  const T = THREE;
  // quality tiers.  scale = internal render scale range (the picture is temporally upsampled to the canvas).
  LR.TIERS = {
    low:    { name: 'low',    mat: 512,  aniso: 2, shadow: 1024, cascades: 2, shadowDist: 70,  shadowTaps: 4, ao: 0, vol: 8,  scaleMin: 0.4,  scaleMax: 0.8,  dprCap: 1.5,  grass: 0.4, grassDist: 40, treeNear: 22, treeMid: 70,  fx: 0.5, bloom: 4, pom: 0, ssr: 0, lights: 8,  topo: 1024, env: 64,  taaSharp: 0.5 },
    medium: { name: 'medium', mat: 512,  aniso: 4, shadow: 2048, cascades: 3, shadowDist: 110, shadowTaps: 5, ao: 1, vol: 12, scaleMin: 0.5,  scaleMax: 0.85, dprCap: 1.25, grass: 0.7, grassDist: 55, treeNear: 30, treeMid: 95,  fx: 0.75, bloom: 5, pom: 0, ssr: 0, lights: 12, topo: 2048, env: 128, taaSharp: 0.5 },
    high:   { name: 'high',   mat: 768,  aniso: 8, shadow: 2048, cascades: 3, shadowDist: 140, shadowTaps: 8, ao: 2, vol: 16, scaleMin: 0.6,  scaleMax: 1.0,  dprCap: 1.5,  grass: 1.0, grassDist: 70, treeNear: 38, treeMid: 120, fx: 1, bloom: 6, pom: 1, ssr: 1, lights: 16, topo: 2048, env: 128, taaSharp: 0.45 },
    ultra:  { name: 'ultra',  mat: 1024, aniso: 16, shadow: 4096, cascades: 3, shadowDist: 170, shadowTaps: 8, ao: 3, vol: 24, scaleMin: 0.75, scaleMax: 1.0,  dprCap: 2,    grass: 1.4, grassDist: 85, treeNear: 48, treeMid: 150, fx: 1.25, bloom: 6, pom: 1, ssr: 1, lights: 24, topo: 2048, env: 256, taaSharp: 0.4 },
  };

  LR.initGPU = (canvas) => {
    const renderer = new T.WebGLRenderer({ canvas, antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: LR.RENDER });
    const gl = renderer.getContext();
    if (!renderer.capabilities.isWebGL2) throw new Error('WebGL 2 is needed');
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
    const guess = G.mobile ? 'low' : G.software ? 'medium' : /Intel|Iris|UHD|HD Graphics|Mali|Adreno|PowerVR/i.test(G.name) && !/Arc/i.test(G.name) ? 'medium' : 'high';
    G.tierName = LR.TIERS[want] ? want : guess; G.auto = !LR.TIERS[want];
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
  LR.pass = (frag, uniforms = {}, o = {}) => {
    const p = { glslVersion: T.GLSL3, vertexShader: LR.sh(o.vert || LR.chunk.fsvs), fragmentShader: LR.sh(frag), uniforms, defines: o.defines || {}, depthTest: false, depthWrite: false, blending: o.blending || T.NoBlending, transparent: !!o.blending };
    for (const k of ['blendSrc', 'blendDst', 'blendEquation', 'blendSrcAlpha', 'blendDstAlpha']) if (o[k] !== undefined) p[k] = o[k];
    return new T.RawShaderMaterial(p);
  };
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

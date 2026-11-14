// dragon-realm · 80_post — the frame graph.  A "view" renders the world into an HDR target with depth, marches the
// air (clouds + mist) at a fraction of the size, and joins them.  The main view then gets the effects layer, bloom,
// sun shafts, the grade and anti-aliasing.  The lake's mirror is a second, smaller view.
{
  const u = (v) => ({ value: v });
  const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), fsScene = new THREE.Scene(), fsMesh = new THREE.Mesh(tri, null); fsMesh.frustumCulled = false; fsScene.add(fsMesh);
  const VS = 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const pass = (fragment, uniforms = {}, extra = {}) => new THREE.ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: fragment, depthTest: false, depthWrite: false, ...extra });
  DR.fsPass = pass;
  DR.blit = (renderer, mat, target) => { fsMesh.material = mat; renderer.setRenderTarget(target || null); renderer.render(fsScene, fsCam); };
  const rt = (w, h, o = {}) => new THREE.WebGLRenderTarget(Math.max(2, Math.round(w)), Math.max(2, Math.round(h)), { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, ...o });

  // ── a view: scene (+depth) → air → joined ──
  DR.View = class {
    constructor(w, h, { airDiv = 3, steps = 48 } = {}) { this.airDiv = airDiv; this.steps = steps; this.size(w, h);
      this.airMat = new THREE.ShaderMaterial({ uniforms: { ...DR.U, ...DR.cloudU, tDepth: u(null), uNoise3: DR.U.uNoise3, uInvProj: u(new THREE.Matrix4()), uCamW: u(new THREE.Matrix4()), uNF: u(new THREE.Vector2()), uEye: u(new THREE.Vector3()) },
        vertexShader: VS, fragmentShader: `${DR.GLSL.uniforms}\n${DR.GLSL.common}\n${DR.airFrag}`, depthTest: false, depthWrite: false });
      this.joinMat = pass(/* glsl */`
        uniform sampler2D tScene, tAir, tDepth, tAirDepth; uniform vec2 uAirRes; varying vec2 vUv;
        void main(){
          vec3 c = texture2D(tScene, vUv).rgb; float z = texture2D(tDepth, vUv).r;
          // depth-aware upsample: of the four air texels round this pixel, trust those whose depth matches
          vec2 f = vUv * uAirRes - 0.5, b = floor(f), w = f - b; vec4 a = vec4(0.0); float ws = 0.0;
          for (int j = -1; j < 3; j++) for (int i = -1; i < 3; i++) {
            vec2 o = vec2(float(i), float(j)), q = (b + o + 0.5) / uAirRes; float zz = texture2D(tDepth, q).r;
            vec2 dd = o - w; float wt = exp(-dot(dd, dd) * 0.9) / (1.0e-5 + abs(zz - z) * 4000.0 + 0.02);
            a += texture2D(tAir, q) * wt; ws += wt; }
          a /= ws;
          gl_FragColor = vec4(c * a.a + a.rgb, 1.0);
        }`, { tScene: u(null), tAir: u(null), tDepth: u(null), uAirRes: u(new THREE.Vector2()) });
    }
    size(w, h) { if (this.w === w && this.h === h) return; this.w = w; this.h = h; for (const k of ['scene', 'air', 'out']) this[k] && this[k].dispose();
      this.scene = rt(w, h, { depthBuffer: true, samples: DR.num('msaa', 4) }); this.scene.depthTexture = new THREE.DepthTexture(w, h, THREE.UnsignedIntType); this.scene.depthTexture.minFilter = this.scene.depthTexture.magFilter = THREE.NearestFilter;
      this.air = rt(w / this.airDiv, h / this.airDiv); this.out = rt(w, h); }
    render(renderer, scene, cam, air = true) {
      renderer.setRenderTarget(this.scene); renderer.clear();
      // depth first for the big static things (objects on layer 1), so their costly surfaces are shaded once per pixel
      if (DR.P.has('prepass')) { const m = cam.layers.mask; cam.layers.set(1); scene.overrideMaterial = DR.View.depthOnly; renderer.render(scene, cam); scene.overrideMaterial = null; cam.layers.mask = m; }
      renderer.render(scene, cam);
      if (air && DR.on('air')) {
        const m = this.airMat, U2 = m.uniforms; U2.tDepth.value = this.scene.depthTexture; U2.uInvProj.value.copy(cam.projectionMatrixInverse); U2.uCamW.value.copy(cam.matrixWorld); U2.uNF.value.set(cam.near, cam.far); cam.getWorldPosition(U2.uEye.value); DR.cloudU.uSteps.value = this.steps;
        DR.blit(renderer, m, this.air);
        const j = this.joinMat.uniforms; j.tScene.value = this.scene.texture; j.tAir.value = this.air.texture; j.tDepth.value = this.scene.depthTexture; j.uAirRes.value.set(this.air.width, this.air.height);
        DR.blit(renderer, this.joinMat, this.out); return this.out;
      }
      return this.scene;
    }
  };

  DR.View.depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false });
  DR.prepass = (mesh) => { mesh.layers.enable(1); return mesh; };

  // ── the finishing chain ──
  DR.Post = class {
    constructor(w, h) { this.size(w, h);
      this.down = pass(/* glsl */`uniform sampler2D t; uniform vec2 px; uniform float knee; varying vec2 vUv;
        void main(){ vec3 a = texture2D(t, vUv + px * vec2(-1.0, -1.0)).rgb, b = texture2D(t, vUv + px * vec2(1.0, -1.0)).rgb, c = texture2D(t, vUv + px * vec2(-1.0, 1.0)).rgb, d = texture2D(t, vUv + px * vec2(1.0, 1.0)).rgb, e = texture2D(t, vUv).rgb;
          vec3 s = (a + b + c + d) * 0.2 + e * 0.2; if (knee > 0.0) { float l = max(s.r, max(s.g, s.b)); s *= smoothstep(knee * 0.6, knee * 2.2, l) * 0.85 + 0.15; s = min(s, vec3(24.0)); } gl_FragColor = vec4(s, 1.0); }`, { t: u(null), px: u(new THREE.Vector2()), knee: u(0) });
      this.up = pass(/* glsl */`uniform sampler2D t, tAdd; uniform vec2 px; varying vec2 vUv;
        void main(){ vec3 s = texture2D(t, vUv).rgb * 4.0; s += (texture2D(t, vUv + px * vec2(1.0, 0.0)).rgb + texture2D(t, vUv - px * vec2(1.0, 0.0)).rgb + texture2D(t, vUv + px * vec2(0.0, 1.0)).rgb + texture2D(t, vUv - px * vec2(0.0, 1.0)).rgb) * 2.0;
          s += texture2D(t, vUv + px).rgb + texture2D(t, vUv - px).rgb + texture2D(t, vUv + px * vec2(1.0, -1.0)).rgb + texture2D(t, vUv + px * vec2(-1.0, 1.0)).rgb; gl_FragColor = vec4(s / 16.0 + texture2D(tAdd, vUv).rgb, 1.0); }`, { t: u(null), tAdd: u(null), px: u(new THREE.Vector2()) });
      this.rays = pass(/* glsl */`uniform sampler2D t, tDepth; uniform vec2 sunUv; uniform float aspect, k; varying vec2 vUv;
        void main(){ vec2 d = (sunUv - vUv); float len = length(d * vec2(aspect, 1.0)); vec2 st = d / 22.0 * min(1.0, 0.9 / max(len, 1e-3)); vec3 s = vec3(0.0); float w = 1.0, ws = 0.0; vec2 p = vUv;
          float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))); p += st * j;
          for (int i = 0; i < 22; i++) { vec3 c = texture2D(t, p).rgb; float sky = step(0.99999, texture2D(tDepth, p).r); s += c * w * (0.15 + 0.85 * sky); ws += w; w *= 0.955; p += st; }
          gl_FragColor = vec4(s / ws * k * smoothstep(1.5, 0.2, len), 1.0); }`, { t: u(null), tDepth: u(null), sunUv: u(new THREE.Vector2()), aspect: u(16 / 9), k: u(0) });
      this.grade = pass(/* glsl */`
        uniform sampler2D t, tBloom, tRays; uniform float exposure, bloom, vig, sat, contrast, time, fade, grain; uniform vec3 lift, gain, fadeCol; uniform vec2 res; varying vec2 vUv;
        vec3 aces(vec3 v){ // Stephen Hill's fit of the ACES RRT + ODT
          v = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777) * v;
          vec3 a = v * (v + 0.0245786) - 0.000090537, b = v * (0.983729 * v + 0.4329510) + 0.238081; v = a / b;
          return clamp(mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602) * v, 0.0, 1.0); }
        void main(){
          vec2 c2 = vUv - 0.5; float r2 = dot(c2, c2);
          vec2 ca = c2 * r2 * 0.006;
          vec3 c = vec3(texture2D(t, vUv + ca).r, texture2D(t, vUv).g, texture2D(t, vUv - ca).b);
          vec3 bl = texture2D(tBloom, vUv).rgb; c = mix(c, bl, bloom) + texture2D(tRays, vUv).rgb;
          c *= exposure * (1.0 - vig * smoothstep(0.12, 0.85, r2 * 1.5));
          c = aces(c * 1.25);
          c = pow(c, vec3(1.0 / 2.2));
          c = c * gain + lift * (1.0 - c);
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, sat);
          c = mix(c, c * c * (3.0 - 2.0 * c), contrast - 1.0);
          c = mix(c, fadeCol, fade);
          float g = fract(sin(dot(gl_FragCoord.xy + fract(time * 7.13) * 91.7, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
          c += g * grain * (1.0 - 0.6 * l);
          gl_FragColor = vec4(clamp(c, 0.0, 1.0), dot(clamp(c, 0.0, 1.0), vec3(0.299, 0.587, 0.114)));
        }`, { t: u(null), tBloom: u(null), tRays: u(null), exposure: u(1), bloom: u(0.07), vig: u(0.3), sat: u(1), contrast: u(1), time: u(0), fade: u(0), fadeCol: u(new THREE.Vector3()), grain: u(0.035), lift: u(new THREE.Vector3()), gain: u(new THREE.Vector3(1, 1, 1)), res: u(new THREE.Vector2()) });
      this.fxaa = pass(/* glsl */`uniform sampler2D t; uniform vec2 px; varying vec2 vUv;
        void main(){ vec4 m = texture2D(t, vUv); float lM = m.a, lN = texture2D(t, vUv + vec2(0.0, px.y)).a, lS = texture2D(t, vUv - vec2(0.0, px.y)).a, lE = texture2D(t, vUv + vec2(px.x, 0.0)).a, lW = texture2D(t, vUv - vec2(px.x, 0.0)).a;
          float mx = max(lM, max(max(lN, lS), max(lE, lW))), mn = min(lM, min(min(lN, lS), min(lE, lW))), range = mx - mn;
          if (range < max(0.04, mx * 0.12)) { gl_FragColor = vec4(m.rgb, 1.0); return; }
          float lNW = texture2D(t, vUv + vec2(-px.x, px.y)).a, lNE = texture2D(t, vUv + px).a, lSW = texture2D(t, vUv - px).a, lSE = texture2D(t, vUv + vec2(px.x, -px.y)).a;
          vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
          float rd = 1.0 / (min(abs(dir.x), abs(dir.y)) + max((lNW + lNE + lSW + lSE) * 0.03125, 0.0078125));
          dir = clamp(dir * rd, -8.0, 8.0) * px;
          vec3 a = 0.5 * (texture2D(t, vUv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(t, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);
          vec3 b = a * 0.5 + 0.25 * (texture2D(t, vUv - dir * 0.5).rgb + texture2D(t, vUv + dir * 0.5).rgb);
          float lB = dot(b, vec3(0.299, 0.587, 0.114));
          gl_FragColor = vec4((lB < mn || lB > mx) ? a : b, 1.0); }`, { t: u(null), px: u(new THREE.Vector2()) });
      this.black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); this.black.needsUpdate = true;
    }
    size(w, h) { if (this.w === w && this.h === h) return; this.w = w; this.h = h; (this.mips || []).forEach((m) => m.dispose()); (this.ups || []).forEach((m) => m.dispose()); this.raysRT && this.raysRT.dispose(); this.ldr && this.ldr.dispose();
      this.mips = []; this.ups = []; let mw = w / 2, mh = h / 2; for (let i = 0; i < 5 && mh > 20; i++) { this.mips.push(rt(mw, mh)); this.ups.push(rt(mw, mh)); mw /= 2; mh /= 2; }
      this.raysRT = rt(w / 4, h / 4); this.ldr = new THREE.WebGLRenderTarget(w, h, { type: THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }); }
    render(renderer, src, depthTex, cam, look, out, fade) {
      // bloom: soft-knee bright pass on the way down, tent filter on the way up
      let prev = src;
      for (let i = 0; i < this.mips.length; i++) { const m = this.mips[i], U2 = this.down.uniforms; U2.t.value = prev.texture; U2.px.value.set(1 / prev.width, 1 / prev.height); U2.knee.value = i === 0 ? 1.0 : 0; DR.blit(renderer, this.down, m); prev = m; }
      let acc = this.mips[this.mips.length - 1];
      for (let i = this.mips.length - 2; i >= 0; i--) { const U2 = this.up.uniforms; U2.t.value = acc.texture; U2.tAdd.value = this.mips[i].texture; U2.px.value.set(1 / acc.width, 1 / acc.height); DR.blit(renderer, this.up, this.ups[i]); acc = this.ups[i]; }
      // sun shafts: smear the bright sky away from the sun
      let raysTex = this.black;
      const sd = DR.U.uSunDir.value, sp = new THREE.Vector3().copy(sd).multiplyScalar(1e5).add(cam.position).project(cam), fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
      if (look.rays > 0 && DR.on('rays') && fwd.dot(sd) > 0.05 && Math.abs(sp.x) < 2.2 && Math.abs(sp.y) < 2.2) { const U2 = this.rays.uniforms; U2.t.value = this.mips[0].texture; U2.tDepth.value = depthTex; U2.sunUv.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5); U2.aspect.value = this.w / this.h; U2.k.value = look.rays * DR.smooth(0.05, 0.4, fwd.dot(sd)); DR.blit(renderer, this.rays, this.raysRT); raysTex = this.raysRT.texture; }
      const G = this.grade.uniforms, g = look.grade; G.t.value = src.texture; G.tBloom.value = acc.texture; G.tRays.value = raysTex; G.exposure.value = look.exposure * (DR.exposureMul || 1); G.bloom.value = look.bloom; G.vig.value = look.vignette; G.sat.value = g.sat; G.contrast.value = g.contrast; G.lift.value.fromArray(g.lift); G.gain.value.fromArray(g.gain); G.time.value = DR.t; G.fade.value = fade ? fade[3] : 0; if (fade) G.fadeCol.value.set(fade[0], fade[1], fade[2]);
      DR.blit(renderer, this.grade, this.ldr);
      this.fxaa.uniforms.t.value = this.ldr.texture; this.fxaa.uniforms.px.value.set(1 / this.w, 1 / this.h);
      DR.blit(renderer, this.fxaa, out || null);
    }
  };
}

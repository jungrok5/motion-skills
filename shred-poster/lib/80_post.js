// shred-poster · 80_post — the frame graph and the finish.
//   scene → sceneRT (HDR + depth)  ×N sub-frames across the shutter, each with a sub-pixel jitter
//         → accRT (their average: true motion blur for everything, and antialiasing)
//         → the finish pass to the canvas: depth of field, whip blur on cuts, punches (zoom bump + shake + sharpen),
//           the inset on a plain ground, highlight glow, Khronos PBR Neutral tone map, a grade (deeper black point,
//           gentle S, cool shadows / warm highlights), a soft vignette and fine moving grain on the picture only.
{
  const VS = 'out vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const quad = () => new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  SP.Post = class {
    constructor(renderer, W, H, o = {}) {
      this.r = renderer; this.W = W; this.H = H;
      const dt = new THREE.DepthTexture(W, H); dt.type = THREE.UnsignedIntType;
      this.sceneRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthTexture: dt, samples: o.msaa || 0 });
      this.accRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
      this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.accMat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: { tSrc: { value: null }, uW: { value: 1 } }, vertexShader: VS,
        fragmentShader: 'precision highp float; in vec2 vUv; uniform sampler2D tSrc; uniform float uW; out vec4 o; void main(){ o = vec4(texture(tSrc, vUv).rgb * uW, uW); }',
        blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, depthTest: false, depthWrite: false });
      this.accScene = new THREE.Scene(); const qa = quad(); qa.material = this.accMat; this.accScene.add(qa);
      this.U = {
        tAcc: { value: this.accRT.texture }, tDepth: { value: dt }, uRes: { value: new THREE.Vector2(W, H) }, uNear: { value: 0.1 }, uFar: { value: 60 },
        uDofFocus: { value: 3 }, uDofK: { value: 0 }, uWhip: { value: new THREE.Vector2() }, uPunch: { value: new THREE.Vector3(1, 0, 0) }, uSharp: { value: 0 },
        uInset: { value: 1 }, uBg: { value: new THREE.Color(1, 1, 1) }, uExposure: { value: 1 }, uGrain: { value: 0.012 }, uVig: { value: 0.13 }, uGlow: { value: 0.35 },
        uFrame: { value: 0 }, uWarm: { value: 1 },
      };
      this.finMat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: this.U, vertexShader: VS, depthTest: false, depthWrite: false, fragmentShader: /* glsl */ `
        precision highp float; in vec2 vUv; out vec4 outC;
        uniform sampler2D tAcc, tDepth; uniform vec2 uRes, uWhip; uniform vec3 uPunch, uBg; uniform float uNear, uFar, uDofFocus, uDofK, uSharp, uInset, uExposure, uGrain, uVig, uGlow, uFrame, uWarm;
        float linDepth(vec2 uv){ float d = texture(tDepth, uv).r; return uNear * uFar / (uFar - d * (uFar - uNear)); }
        vec3 tap(vec2 uv){ return texture(tAcc, clamp(uv, vec2(0.0005), vec2(0.9995))).rgb; }
        vec3 picture(vec2 uv){
          vec2 px = 1.0 / uRes; float k = uRes.x / 1080.0;
          if (length(uWhip) > 0.5) {                       // a short directional whip on the frames either side of a cut
            vec3 s = vec3(0.0); for (int i = 0; i < 16; i++) { float f = float(i) / 15.0 - 0.5; s += tap(uv + uWhip * k * f * px); } return s / 16.0;
          }
          vec3 c = tap(uv);
          if (uDofK > 0.0) {                               // depth of field: a golden-angle gather, radius from the circle of confusion
            float coc = clamp(uDofK * abs(1.0 - uDofFocus / linDepth(uv)), 0.0, 13.0) * k;
            if (coc > 0.7) { vec3 s = c; float ws = 1.0; for (int i = 1; i < 24; i++) { float a = float(i) * 2.39996, rr = sqrt(float(i) / 23.0) * coc; vec2 o = vec2(cos(a), sin(a)) * rr * px; float cc = clamp(uDofK * abs(1.0 - uDofFocus / linDepth(uv + o)), 0.0, 13.0) * k; float w = smoothstep(rr - 1.0, rr + 1.0, max(cc, coc * 0.6)); s += tap(uv + o) * w; ws += w; } c = s / ws; }
          }
          if (uSharp > 0.0) { vec3 b = (tap(uv + vec2(px.x, 0.0) * 1.3 * k) + tap(uv - vec2(px.x, 0.0) * 1.3 * k) + tap(uv + vec2(0.0, px.y) * 1.3 * k) + tap(uv - vec2(0.0, px.y) * 1.3 * k)) * 0.25; c = max(c + uSharp * (c - b), 0.0); }
          return c;
        }
        vec3 neutral(vec3 color){ const float sc = 0.76, de = 0.15; float x = min(color.r, min(color.g, color.b)); float off = x < 0.08 ? x - 6.25 * x * x : 0.04; color -= off;
          float peak = max(color.r, max(color.g, color.b)); if (peak < sc) return color; float d = 1.0 - sc; float np = 1.0 - d * d / (peak + d - sc); color *= np / peak; float g = 1.0 - 1.0 / (de * (peak - np) + 1.0); return mix(color, vec3(np), g); }
        vec3 toSRGB(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
        float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
        void main(){
          vec2 uv = (vUv - 0.5) / uPunch.x + 0.5 - uPunch.yz / uRes;
          vec2 suv = (uv - 0.5) / uInset + 0.5;
          if (uInset < 0.999 && (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0)) { outC = vec4(toSRGB(uBg), 1.0); return; }
          vec3 c = picture(suv) * uExposure;
          vec3 g = textureLod(tAcc, suv, 5.0).rgb * uExposure;   // highlight glow from a far mip
          c = neutral(c); vec3 gn = neutral(g);
          c += uGlow * max(dot(gn, vec3(0.333)) - 0.8, 0.0) * 1.6;
          vec3 f = toSRGB(c);
          f = clamp((f - 0.015) / 0.985, 0.0, 1.0);                     // a slightly deeper black point
          f = f + 0.25 * f * (1.0 - f) * (2.0 * f - 1.0);               // gentle S
          float lum = dot(f, vec3(0.333));
          f += uWarm * ((1.0 - lum) * (1.0 - lum) * vec3(-0.008, 0.003, 0.012) + lum * lum * vec3(0.008, 0.0, -0.008));   // cool shadows, warm highlights
          vec2 q = (suv - 0.5) * 2.0; float rr = length(q) / 1.41421; f *= 1.0 - uVig * pow(rr, 2.2);
          float n = (hash(gl_FragCoord.xy + uFrame * 17.31) + hash(gl_FragCoord.xy * 1.37 + uFrame * 3.7) - 1.0);
          f += n * uGrain * (0.6 + 0.4 * (1.0 - abs(lum - 0.5) * 2.0));
          outC = vec4(clamp(f, 0.0, 1.0), 1.0);
        }` });
      this.finScene = new THREE.Scene(); const qf = quad(); qf.material = this.finMat; this.finScene.add(qf);
    }
    // render one sub-frame of `scene` and add it to the average with weight w (first: clear)
    add(scene, cam, w, first) {
      const r = this.r;
      r.setRenderTarget(this.sceneRT); r.setClearColor(0x000000, 1); r.clear(true, true, true); r.render(scene, cam);
      this.accMat.uniforms.tSrc.value = this.sceneRT.texture; this.accMat.uniforms.uW.value = w;
      r.setRenderTarget(this.accRT); if (first) { r.setClearColor(0x000000, 0); r.clear(true, false, false); } r.render(this.accScene, this.cam);
    }
    finish(o) {
      const U = this.U, r = this.r;
      for (const k of Object.keys(o)) if (U[k]) { if (U[k].value && U[k].value.set && Array.isArray(o[k])) U[k].value.set(...o[k]); else if (U[k].value && U[k].value.isColor) U[k].value.copy(o[k]); else U[k].value = o[k]; }
      r.setRenderTarget(null); r.render(this.finScene, this.cam);
    }
  };
}

// landmark-map-3d · look.js — the light of the film: time-of-day presets (day, morning, golden, dusk, night, overcast),
// how they blend, the sky dome, the sun / moon with stable soft shadows, and the post chain (MSAA → tilt-shift miniature
// blur, bloom for lit windows and lamps, a soft highlight shoulder, grade, vignette, grain, rain streaks).
import { THREE, col, clamp, lerp, mixc } from './core.js';

// sRGB hex in; light intensities are three.js units with physically-correct lights off (legacy-like scale)
export const PRESETS = {
  day: {
    sunEl: 50, sunAz: 205, sun: '#fff0d8', sunI: 3.1, hemiSky: '#b8c8f2', ground: '#d9c7b4', hemiI: .95,
    fog: '#cfdff2', fogD: .0001, skyTop: '#6fa8ee', skyHz: '#d8e8fa', exposure: 1, sat: 1.12, contrast: 1.07,
    lift: '#000000', gain: '#ffffff', windows: .03, lamps: 0, glow: 0, bloom: .12, bloomThr: 1.25,
    water: '#3b86cf', shallow: '#7cc0e2', waterRefl: .15, shadow: 1, stars: 0, neon: .25,
  },
  morning: {
    sunEl: 22, sunAz: 115, sun: '#ffe2bd', sunI: 2.8, hemiSky: '#b4c6ef', ground: '#e0c8b0', hemiI: .9,
    fog: '#e6e2ec', fogD: .00016, skyTop: '#86aee8', skyHz: '#f3dfd3', exposure: 1.02, sat: 1.04, contrast: 1.02,
    lift: '#04030a', gain: '#fff8f0', windows: .06, lamps: 0, glow: 0, bloom: .16, bloomThr: 1.2,
    water: '#4a8fcc', shallow: '#9ccde3', waterRefl: .28, shadow: 1, stars: 0, neon: .3,
  },
  golden: {
    sunEl: 11, sunAz: 255, sun: '#ffc285', sunI: 3.2, hemiSky: '#9fb0e8', ground: '#d9ab8c', hemiI: .8,
    fog: '#eac6b4', fogD: .0001, skyTop: '#7f98d8', skyHz: '#ffcf9f', exposure: 1.02, sat: 1.12, contrast: 1.07,
    lift: '#0a0612', gain: '#fff4ea', windows: .14, lamps: .15, glow: .1, bloom: .3, bloomThr: 1.05,
    water: '#3f78c4', shallow: '#86a9da', waterRefl: .3, shadow: 1, stars: 0, neon: .5,
  },
  dusk: {
    sunEl: -3, sunAz: 265, sun: '#ff9f86', sunI: .55, hemiSky: '#7478cc', ground: '#8a6690', hemiI: 1.05,
    fog: '#7a72b6', fogD: .00013, skyTop: '#29377a', skyHz: '#e7929a', exposure: 1.08, sat: 1.08, contrast: 1.03,
    lift: '#0b0820', gain: '#fff0f4', windows: .55, lamps: 1, glow: .8, bloom: .62, bloomThr: .9,
    water: '#2c3f86', shallow: '#7d6fb4', waterRefl: .7, shadow: .5, stars: .2, neon: 1,
  },
  night: {
    sunEl: 40, sunAz: 140, sun: '#a9b2ff', sunI: .38, hemiSky: '#6c6ad0', ground: '#4a3a62', hemiI: 1.05,
    fog: '#3a3672', fogD: .00015, skyTop: '#110f3a', skyHz: '#4a3f86', exposure: 1.2, sat: 1.05, contrast: 1.04,
    lift: '#0c0820', gain: '#f6f0ff', windows: .7, lamps: 1, glow: 1, bloom: .8, bloomThr: .85,
    water: '#1d2464', shallow: '#3a3f8e', waterRefl: .75, shadow: .4, stars: 1, neon: 1,
  },
  overcast: {
    sunEl: 55, sunAz: 200, sun: '#eef0f6', sunI: .9, hemiSky: '#d6dcea', ground: '#c9c4bc', hemiI: 1.55,
    fog: '#c7ccd8', fogD: .0003, skyTop: '#a9b4c9', skyHz: '#d4d9e3', exposure: 1.04, sat: .88, contrast: .98,
    lift: '#05060a', gain: '#f6f8ff', windows: .12, lamps: .2, glow: .15, bloom: .2, bloomThr: 1.1,
    water: '#4d6f96', shallow: '#8ea7bf', waterRefl: .55, shadow: .35, stars: 0, neon: .5,
  },
};
const NUM = Object.keys(PRESETS.day).filter(k => typeof PRESETS.day[k] === 'number');
const COL = Object.keys(PRESETS.day).filter(k => typeof PRESETS.day[k] === 'string');
// one look from a key { sky: 'golden', mix: { night: .3 }, ...overrides }; blend(a, b, u) between two looks
export function lookOf(k) {
  const base = { ...(PRESETS[k.sky || 'day'] || PRESETS.day) };
  for (const [name, w] of Object.entries(k.mix || {})) Object.assign(base, blend(base, PRESETS[name], w));
  for (const f of [...NUM, ...COL]) if (k[f] !== undefined) base[f] = k[f];
  return base;
}
export function blend(a, b, u) {
  const o = {};
  for (const f of NUM) o[f] = f === 'sunAz' ? a[f] + (((b[f] - a[f] + 540) % 360) - 180) * u : lerp(a[f], b[f], u);
  for (const f of COL) o[f] = '#' + mixc(a[f], b[f], u).getHexString();
  return o;
}
export const sunDir = (el, az) => { const e = el * Math.PI / 180, a = az * Math.PI / 180; return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)); };

// ------------------------------------------------------------------ sky dome
export function makeSky() {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, hz: { value: new THREE.Color() }, sunD: { value: new THREE.Vector3() }, sunC: { value: new THREE.Color() }, stars: { value: 0 } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 top, hz, sunD, sunC; uniform float stars; varying vec3 vD;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){ vec3 d = normalize(vD); float y = clamp(d.y, -.2, 1.);
        vec3 c = mix(hz, top, pow(clamp(y, 0., 1.), .55));
        float s = max(dot(d, normalize(sunD)), 0.); c += sunC * (pow(s, 600.) * 2. + pow(s, 12.) * .25);
        vec2 g = vec2(atan(d.z, d.x) * 180., d.y * 260.); vec2 ci = floor(g); float r = h(ci);
        float st = step(.985, r) * smoothstep(.12, .0, length(fract(g) - .5)) * smoothstep(.05, .3, y) * stars;
        c += vec3(st) * (.6 + .4 * h(ci + 3.));
        gl_FragColor = vec4(c, 1.); }`,
  });
  const s = new THREE.Mesh(new THREE.SphereGeometry(9000, 32, 16), m); s.renderOrder = -10; s.frustumCulled = false;
  return s;
}

// ------------------------------------------------------------------ post: tilt-shift + bloom + grade
const FS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
export class Post {
  constructor(renderer, W, H, { msaa = 4, levels = 5 } = {}) {
    this.r = renderer; this.W = W; this.H = H;
    const rt = (w, h, o = {}) => new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, ...o });
    this.scene = rt(W, H, { samples: msaa, depthBuffer: true });
    this.down = []; this.bright = []; this.up = [];
    for (let i = 1; i <= levels; i++) { this.down.push(rt(W >> i, H >> i)); this.bright.push(rt(W >> i, H >> i)); this.up.push(rt(W >> i, H >> i)); }
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.quad.frustumCulled = false;
    this.sc = new THREE.Scene(); this.sc.add(this.quad);
    this.mDown = new THREE.ShaderMaterial({
      uniforms: { src: { value: null }, px: { value: new THREE.Vector2() }, thr: { value: -1 } }, vertexShader: FS,
      fragmentShader: `uniform sampler2D src; uniform vec2 px; uniform float thr; varying vec2 vUv;
        vec3 k(vec3 c){ if (thr < 0.) return c; float b = max(c.r, max(c.g, c.b)); float s = clamp(b - thr + .25, 0., .5); s = s * s * 2.; return c * max(s, b - thr) / max(b, 1e-4); }
        vec3 ok(vec3 c){ return (any(isnan(c)) || any(isinf(c))) ? vec3(0.) : min(c, vec3(64.)); }   // one bad pixel must not spread into a block
        void main(){ vec3 c = ok(texture2D(src, vUv).rgb) * 4.;
          c += ok(texture2D(src, vUv + px * vec2(-1., -1.)).rgb) + ok(texture2D(src, vUv + px * vec2(1., -1.)).rgb) + ok(texture2D(src, vUv + px * vec2(-1., 1.)).rgb) + ok(texture2D(src, vUv + px * vec2(1., 1.)).rgb);
          gl_FragColor = vec4(k(c / 8.), 1.); }`,
    });
    this.mUp = new THREE.ShaderMaterial({
      uniforms: { src: { value: null }, add: { value: null }, px: { value: new THREE.Vector2() } }, vertexShader: FS,
      fragmentShader: `uniform sampler2D src, add; uniform vec2 px; varying vec2 vUv;
        void main(){ vec3 c = vec3(0.);
          c += texture2D(src, vUv + px * vec2(-1., 0.)).rgb * 2. + texture2D(src, vUv + px * vec2(1., 0.)).rgb * 2. + texture2D(src, vUv + px * vec2(0., -1.)).rgb * 2. + texture2D(src, vUv + px * vec2(0., 1.)).rgb * 2.;
          c += texture2D(src, vUv + px * vec2(-1., -1.)).rgb + texture2D(src, vUv + px * vec2(1., -1.)).rgb + texture2D(src, vUv + px * vec2(-1., 1.)).rgb + texture2D(src, vUv + px * vec2(1., 1.)).rgb;
          c += texture2D(src, vUv).rgb * 4.;
          gl_FragColor = vec4(c / 16. + texture2D(add, vUv).rgb, 1.); }`,
    });
    this.mComp = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null }, tD1: { value: null }, tD2: { value: null }, tD3: { value: null }, tD4: { value: null }, tBloom: { value: null },
        res: { value: new THREE.Vector2(W, H) }, focus: { value: new THREE.Vector4(.52, .16, .34, 1) }, bloom: { value: .2 },
        exposure: { value: 1 }, contrast: { value: 1 }, sat: { value: 1 }, lift: { value: new THREE.Color(0) }, gain: { value: new THREE.Color(1, 1, 1) },
        vignette: { value: .22 }, grain: { value: .018 }, frame: { value: 0 }, rain: { value: 0 }, rainT: { value: 0 }, fade: { value: new THREE.Vector4(0, 0, 0, 0) },
      },
      vertexShader: FS,
      fragmentShader: `uniform sampler2D tScene, tD1, tD2, tD3, tD4, tBloom; uniform vec2 res; uniform vec4 focus, fade; uniform float bloom, exposure, contrast, sat, vignette, grain, frame, rain, rainT; uniform vec3 lift, gain; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        vec3 tent(sampler2D t, vec2 uv, vec2 px){ return (texture2D(t, uv + px * vec2(-.5, -.5)).rgb + texture2D(t, uv + px * vec2(.5, -.5)).rgb + texture2D(t, uv + px * vec2(-.5, .5)).rgb + texture2D(t, uv + px * vec2(.5, .5)).rgb) * .25; }
        vec3 shoulder(vec3 x){ vec3 k = vec3(.9); vec3 o = k + (1. - k) * (1. - exp(-(x - k) / (1. - k))); return mix(x, o, step(k, x)); }
        float streaks(vec2 uv, float sc, float sp, float seed){
          vec2 p = vec2(uv.x * res.x / res.y, uv.y); p.x += p.y * .22; p *= sc; p.y += rainT * sp;
          vec2 c = floor(vec2(p.x * 6., p.y)); vec2 f = fract(vec2(p.x * 6., p.y));
          float r = h(c + seed); float x = abs(f.x - (.2 + .6 * h(c + seed + 7.)));
          return step(.72, r) * smoothstep(.05, .0, x) * smoothstep(0., .25, f.y) * smoothstep(.6, .25, f.y); }
        void main(){
          vec2 uv = vUv; vec3 c = texture2D(tScene, uv).rgb; if (any(isnan(c)) || any(isinf(c))) c = tent(tD1, uv, 1. / res * 2.);
          // tilt-shift: sharp in a band around focus.x (screen height), blurring toward top and bottom
          float d = max(abs(uv.y - focus.x) - focus.y, 0.) / focus.z; float b = clamp(d, 0., 1.) * focus.w;
          if (b > .001) {
            vec3 l1 = tent(tD1, uv, 1. / res * 2.), l2 = tent(tD2, uv, 1. / res * 4.), l3 = tent(tD3, uv, 1. / res * 8.), l4 = tent(tD4, uv, 1. / res * 16.);
            float lv = b * 3.2; vec3 bl = lv < 1. ? mix(c, l1, lv) : lv < 2. ? mix(l1, l2, lv - 1.) : lv < 3. ? mix(l2, l3, lv - 2.) : mix(l3, l4, lv - 3.);
            c = bl; }
          c += texture2D(tBloom, uv).rgb * bloom;
          c *= exposure;
          c = shoulder(c);
          float L = dot(c, vec3(.2126, .7152, .0722));
          c = mix(vec3(L), c, sat);
          c = (c - .5) * contrast + .5;
          c = c * gain + lift * (1. - c);
          // rain: three layers of streaks
          if (rain > .001) { float s = streaks(uv, 1.6, 2.6, 1.) * .55 + streaks(uv, 2.6, 3.4, 9.) * .35 + streaks(uv, 4.2, 4.4, 17.) * .22; c = mix(c, c * .9 + vec3(.78, .82, .95) * .3, s * rain); }
          vec2 v = uv - .5; c *= 1. - vignette * dot(v * vec2(.9, 1.15), v * vec2(.9, 1.15)) * 1.6;
          c = mix(c, fade.rgb, fade.a);
          c = clamp(c, 0., 1.);
          c = mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c));
          c += (h(uv * res + frame * 1.37) - .5) * grain;
          gl_FragColor = vec4(c, 1.); }`,
    });
  }
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.sc, this.cam); }
  run(o) {
    const { down, bright, up } = this;
    let src = this.scene.texture;
    for (let i = 0; i < down.length; i++) {         // plain chain (tilt-shift)
      this.mDown.uniforms.src.value = src; this.mDown.uniforms.px.value.set(1 / (this.W >> i), 1 / (this.H >> i)); this.mDown.uniforms.thr.value = -1;
      this.pass(this.mDown, down[i]); src = down[i].texture;
    }
    if (o.bloom > .001) {
      src = this.scene.texture;
      for (let i = 0; i < bright.length; i++) {      // bright chain
        this.mDown.uniforms.src.value = src; this.mDown.uniforms.px.value.set(1 / (this.W >> i), 1 / (this.H >> i)); this.mDown.uniforms.thr.value = i === 0 ? o.bloomThr : -1;
        this.pass(this.mDown, bright[i]); src = bright[i].texture;
      }
      let acc = bright.at(-1).texture;
      for (let i = bright.length - 2; i >= 0; i--) {
        this.mUp.uniforms.src.value = acc; this.mUp.uniforms.add.value = bright[i].texture; this.mUp.uniforms.px.value.set(1 / (this.W >> (i + 2)), 1 / (this.H >> (i + 2)));
        this.pass(this.mUp, up[i]); acc = up[i].texture;
      }
      this.mComp.uniforms.tBloom.value = acc;
    } else this.mComp.uniforms.tBloom.value = down.at(-1).texture;
    const u = this.mComp.uniforms;
    u.tScene.value = this.scene.texture; u.tD1.value = down[0].texture; u.tD2.value = down[1].texture; u.tD3.value = down[2].texture; u.tD4.value = down[3].texture;
    u.bloom.value = o.bloom > .001 ? o.bloom : 0;
    u.focus.value.set(o.focusY, o.focusBand, o.focusFall, o.tilt);
    u.exposure.value = o.exposure; u.contrast.value = o.contrast; u.sat.value = o.sat; u.lift.value.copy(col(o.lift)); u.gain.value.copy(col(o.gain));
    u.vignette.value = o.vignette; u.grain.value = o.grain; u.frame.value = o.frame; u.rain.value = o.rain; u.rainT.value = o.t;
    u.fade.value.set(...(o.fadeColor || [0, 0, 0]), o.fade || 0);
    this.pass(this.mComp, null);
  }
}

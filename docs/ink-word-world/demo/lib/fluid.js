// Ink on paper, on the GPU (WebGL2). A stable-fluids solver carries *wet* ink; wet ink that stops moving sinks into the
// paper as a *stain* that no longer moves and fades slowly. Ink is stored as absorbance (how much of red, green and blue
// light the pigment takes away), so pigments mix the way washes do and the display is paper × exp(−ink). Everything the
// world draws with Canvas 2D (things, light) is composited in the same shader, so day and night treat it as one sheet.
//
// All positions here are in uv (0…1, y down, like the canvas); velocities are in paper-heights per second.

const VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * .5 + .5; gl_Position = vec4(aPos, 0., 1.); }`;

// a quad placed over part of the target (uCenter/uHalf in clip space) — splats only touch the pixels they change
const VERT_QUAD = `#version 300 es
in vec2 aPos; out vec2 vUv; out vec2 vLocal; uniform vec2 uCenter, uHalf;
void main(){ vLocal = aPos; vec2 p = uCenter + aPos * uHalf; vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

const H = `#version 300 es
precision highp float; precision highp sampler2D; in vec2 vUv; out vec4 o;`;

const FRAG = {
  advect: H + `uniform sampler2D uVel, uSrc; uniform vec2 uAsp; uniform float uDt, uKeep;
    void main(){ vec2 c = vUv - uDt * texture(uVel, vUv).xy * uAsp; o = texture(uSrc, c) * uKeep; }`,
  curl: H + `uniform sampler2D uVel; uniform vec2 uPx;
    void main(){ float L = texture(uVel, vUv - vec2(uPx.x, 0.)).y, R = texture(uVel, vUv + vec2(uPx.x, 0.)).y,
      B = texture(uVel, vUv - vec2(0., uPx.y)).x, T = texture(uVel, vUv + vec2(0., uPx.y)).x; o = vec4(.5 * (R - L - T + B), 0., 0., 1.); }`,
  vorticity: H + `uniform sampler2D uVel, uCurl; uniform vec2 uPx; uniform float uAmt, uDt;
    void main(){ float L = texture(uCurl, vUv - vec2(uPx.x, 0.)).x, R = texture(uCurl, vUv + vec2(uPx.x, 0.)).x,
      B = texture(uCurl, vUv - vec2(0., uPx.y)).x, T = texture(uCurl, vUv + vec2(0., uPx.y)).x, C = texture(uCurl, vUv).x;
      vec2 f = .5 * vec2(abs(T) - abs(B), abs(R) - abs(L)); f /= length(f) + 1e-4; f *= uAmt * C; f.y *= -1.;
      vec2 v = texture(uVel, vUv).xy + f * uDt; o = vec4(clamp(v, -4., 4.), 0., 1.); }`,
  divergence: H + `uniform sampler2D uVel; uniform vec2 uPx;
    void main(){ vec2 C = texture(uVel, vUv).xy;
      float L = texture(uVel, vUv - vec2(uPx.x, 0.)).x, R = texture(uVel, vUv + vec2(uPx.x, 0.)).x,
            B = texture(uVel, vUv - vec2(0., uPx.y)).y, T = texture(uVel, vUv + vec2(0., uPx.y)).y;
      if (vUv.x - uPx.x < 0.) L = -C.x; if (vUv.x + uPx.x > 1.) R = -C.x;
      if (vUv.y - uPx.y < 0.) B = -C.y; if (vUv.y + uPx.y > 1.) T = -C.y;
      o = vec4(.5 * (R - L + T - B), 0., 0., 1.); }`,
  pressure: H + `uniform sampler2D uP, uDiv; uniform vec2 uPx;
    void main(){ float L = texture(uP, vUv - vec2(uPx.x, 0.)).x, R = texture(uP, vUv + vec2(uPx.x, 0.)).x,
      B = texture(uP, vUv - vec2(0., uPx.y)).x, T = texture(uP, vUv + vec2(0., uPx.y)).x;
      o = vec4((L + R + B + T - texture(uDiv, vUv).x) * .25, 0., 0., 1.); }`,
  gradient: H + `uniform sampler2D uP, uVel; uniform vec2 uPx;
    void main(){ float L = texture(uP, vUv - vec2(uPx.x, 0.)).x, R = texture(uP, vUv + vec2(uPx.x, 0.)).x,
      B = texture(uP, vUv - vec2(0., uPx.y)).x, T = texture(uP, vUv + vec2(0., uPx.y)).x;
      o = vec4(texture(uVel, vUv).xy - vec2(R - L, T - B), 0., 1.); }`,
  scale: H + `uniform sampler2D uSrc; uniform float uK; void main(){ o = texture(uSrc, vUv) * uK; }`,
  // wet ink that has stopped moving sinks into the paper
  settle: H + `uniform sampler2D uWet, uVel; uniform float uK;
    void main(){ float still = 1. - smoothstep(.01, .12, length(texture(uVel, vUv).xy)); o = vec4(texture(uWet, vUv).rgb * uK * (.25 + .75 * still), 1.); }`,
  // splats (drawn on a quad, blended)
  splat: `#version 300 es
    precision highp float; in vec2 vLocal; out vec4 o; uniform vec4 uValue; uniform float uSoft;
    void main(){ float d = dot(vLocal, vLocal); o = uValue * exp(-d * uSoft); }`,
  vortex: `#version 300 es
    precision highp float; in vec2 vLocal; out vec4 o; uniform float uSpin; uniform vec2 uAspHalf;
    void main(){ float d = dot(vLocal, vLocal); vec2 r = vLocal * uAspHalf; o = vec4(vec2(-r.y, r.x) * uSpin * exp(-d * 3.5), 0., 0.); }`,
  stamp: `#version 300 es
    precision highp float; precision highp sampler2D; in vec2 vLocal; out vec4 o; uniform sampler2D uTex; uniform vec3 uInk;
    void main(){ vec2 uv = vLocal * .5 + .5; o = vec4(uInk * texture(uTex, vec2(uv.x, uv.y)).a, 0.); }`,
  lift: `#version 300 es
    precision highp float; precision highp sampler2D; in vec2 vUv; in vec2 vLocal; out vec4 o; uniform sampler2D uSrc; uniform float uK;
    void main(){ float g = exp(-dot(vLocal, vLocal) * 3.) * uK; o = vec4(texture(uSrc, vUv).rgb * g, g); }`,
  // the sheet: paper × exp(−ink) × things, turned over into night where uNight says so, plus light
  display: H + `uniform sampler2D uWet, uStain, uThings, uLight, uPaper;
    uniform vec3 uPaperDay, uPaperNight, uPale; uniform vec2 uRes, uPaperScale; uniform float uGrain, uEdge;
    uniform vec3 uNight; /* from, to, radius */ uniform vec2 uNightAt; uniform float uAspect, uFlash, uDusk;
    void main(){
      vec2 uv = vec2(vUv.x, 1. - vUv.y);                         // canvas-style, y down
      vec3 g = texture(uPaper, uv * uPaperScale).rgb;              // r fibre, g cloud, b speckle
      vec3 ink = texture(uWet, vUv).rgb + texture(uStain, vUv).rgb;
      vec2 px = 1.5 / uRes;
      vec3 nb = texture(uWet, vUv + vec2(px.x, 0.)).rgb + texture(uWet, vUv - vec2(px.x, 0.)).rgb + texture(uWet, vUv + vec2(0., px.y)).rgb + texture(uWet, vUv - vec2(0., px.y)).rgb
              + texture(uStain, vUv + vec2(px.x, 0.)).rgb + texture(uStain, vUv - vec2(px.x, 0.)).rgb + texture(uStain, vUv + vec2(0., px.y)).rgb + texture(uStain, vUv - vec2(0., px.y)).rgb;
      ink += max(ink - nb * .25, 0.) * uEdge;                     // ink pools at its edges
      ink *= 1. + uGrain * (g.r - .5) * 2.;                       // and granulates in the paper's tooth
      vec3 T = exp(-ink);
      vec4 th = texture(uThings, vUv); T *= clamp(1. - th.a + th.rgb, 0., 1.);
      float d = distance(vec2(uv.x * uAspect, uv.y), vec2(uNightAt.x * uAspect, uNightAt.y));
      float n = mix(uNight.x, uNight.y, 1. - smoothstep(uNight.z - .22, uNight.z, d + (g.g - .5) * .16));
      vec3 paper = uPaperDay * (1. + (g.r - .5) * .035 + (g.g - .5) * .06) * (1. - uDusk * .12);
      vec2 q = uv - .5; paper *= 1. - dot(q, q) * .16;
      vec3 day = paper * T;
      float a = 1. - min(T.r, min(T.g, T.b)); vec3 hue = T / max(max(T.r, max(T.g, T.b)), 1e-3);
      vec3 np = uPaperNight * (1. + (g.r - .5) * .2 + (g.g - .5) * .35) * (1. - dot(q, q) * .5);
      vec3 night = mix(np, uPale * mix(vec3(dot(hue, vec3(.33))), hue, .62), min(1., pow(a, 1.05) * .9));   // ink turns pale on the dark sheet and keeps a little of its hue
      vec3 c = mix(day, night, n);
      vec4 L = texture(uLight, vUv);
      c = mix(c + L.rgb * (1. - c) * .85, c + L.rgb * 1.15, n);
      c += uFlash * mix(vec3(.25), vec3(.75, .8, .9), n);
      c += (g.b - .5) * .012;
      o = vec4(c, 1.); }`
};

export class Fluid {
  /** @param canvas the visible canvas  @param o { simH, dyeH, pressure, curl, velKeep, dry, fade } */
  constructor(canvas, o = {}) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 is not available');
    if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('float render targets are not available');
    gl.getExtension('OES_texture_float_linear');
    this.gl = gl; this.canvas = canvas;
    this.o = Object.assign({ simH: 144, dyeH: 540, pressure: 18, curl: 9, velKeep: .5, dry: .5, fade: .07 }, o);
    this.prog = {};
    for (const k in FRAG) this.prog[k] = this._program(['splat', 'vortex', 'stamp', 'lift'].includes(k) ? VERT_QUAD : VERT, FRAG[k]);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.tex = { things: this._canvasTex(), light: this._canvasTex(), stamp: this._canvasTex(), paper: this._canvasTex(true) };
    this.night = { from: 0, to: 0, r: 9, at: [.5, .5] }; this.flash = 0; this.dusk = 0;
    this.look = { paperDay: [.925, .9, .835], paperNight: [.035, .045, .06], pale: [.93, .93, .88], grain: .35, edge: .5 };
    this.flowW = 64; this.flowH = 36; this.flow = new Float32Array(this.flowW * this.flowH * 4);
    this.resize();
  }
  _program(vs, fs) {
    const gl = this.gl, p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src);
      gl.attachShader(p, s);
    }
    gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  }
  _canvasTex(repeat) {
    const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    return t;
  }
  _target(w, h, linear = true) {
    const gl = this.gl, tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    const f = linear ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fbo, w, h };
  }
  _pair(w, h) { return { a: this._target(w, h), b: this._target(w, h), w, h, swap() { const t = this.a; this.a = this.b; this.b = t; } }; }
  _free(t) { if (!t) return; const gl = this.gl; for (const x of t.a ? [t.a, t.b] : [t]) { gl.deleteTexture(x.tex); gl.deleteFramebuffer(x.fbo); } }

  /** (re)build the grids for the canvas's current pixel size; ink on the paper is lost */
  resize() {
    const c = this.canvas, asp = c.width / c.height; this.aspect = asp;
    const simH = this.o.simH, simW = Math.max(8, Math.round(simH * asp)), dyeH = Math.min(this.o.dyeH, c.height), dyeW = Math.max(8, Math.round(dyeH * asp));
    for (const k of ['vel', 'wet', 'stain', 'pres', 'div', 'curlT', 'flowT']) this._free(this[k]);
    this.vel = this._pair(simW, simH); this.pres = this._pair(simW, simH);
    this.div = this._target(simW, simH, false); this.curlT = this._target(simW, simH, false);
    this.wet = this._pair(dyeW, dyeH); this.stain = this._target(dyeW, dyeH);
    this.flowT = this._target(this.flowW, this.flowH);
  }
  /** wipe the sheet: all ink and all motion */
  clear() {
    const gl = this.gl;
    for (const t of [this.vel.a, this.vel.b, this.pres.a, this.pres.b, this.wet.a, this.wet.b, this.stain]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo); gl.viewport(0, 0, t.w, t.h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }
  _use(name, uniforms) {
    const gl = this.gl, pr = this.prog[name]; gl.useProgram(pr.p); let unit = 0;
    for (const k in uniforms) {
      const v = uniforms[k], loc = pr.u[k]; if (loc == null) continue;
      if (v instanceof WebGLTexture) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v); gl.uniform1i(loc, unit++); }
      else if (typeof v === 'number') gl.uniform1f(loc, v);
      else if (v.length === 2) gl.uniform2f(loc, v[0], v[1]);
      else if (v.length === 3) gl.uniform3f(loc, v[0], v[1], v[2]);
      else gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
    }
    return pr;
  }
  _draw() { this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4); }
  _pass(name, target, uniforms) {
    const gl = this.gl; gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
    gl.viewport(0, 0, target ? target.w : this.canvas.width, target ? target.h : this.canvas.height);
    this._use(name, uniforms); this._draw();
  }
  // a blended quad centred on (x, y) uv with half-size (rx, ry) uv
  _quad(name, target, x, y, rx, ry, uniforms, blend = 'add') {
    const gl = this.gl; gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); gl.viewport(0, 0, target.w, target.h);
    gl.enable(gl.BLEND);
    if (blend === 'add') gl.blendFunc(gl.ONE, gl.ONE); else gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
    this._use(name, Object.assign({ uCenter: [x * 2 - 1, 1 - y * 2], uHalf: [rx * 2, ry * 2] }, uniforms)); this._draw();
    gl.disable(gl.BLEND);
  }

  /** push the fluid: (x, y) uv, (vx, vy) paper-heights per second, r radius in paper-heights */
  push(x, y, vx, vy, r = .05) { const R = r * 2.2; this._quad('splat', this.vel.a, x, y, R / this.aspect, R, { uValue: [vx, -vy, 0, 0], uSoft: 4.8 }); }
  /** spin the fluid around a point; spin > 0 turns clockwise on screen */
  swirl(x, y, spin, r = .1) { this._quad('vortex', this.vel.a, x, y, r / this.aspect, r, { uSpin: -spin, uAspHalf: [1, 1] }); }
  /** drop ink: absorbance [r, g, b] (see pigment()), r radius in paper-heights */
  ink(x, y, abs, r = .03) { const R = r * 2.2; this._quad('splat', this.wet.a, x, y, R / this.aspect, R, { uValue: [abs[0], abs[1], abs[2], 0], uSoft: 4.8 }); }
  /** ink that goes straight into the paper (does not flow): for marks that must stay where they are put */
  mark(x, y, abs, r = .03) { const R = r * 2.2; this._quad('splat', this.stain, x, y, R / this.aspect, R, { uValue: [abs[0], abs[1], abs[2], 0], uSoft: 4.8 }); }
  /** drop ink in the shape of a canvas's alpha (a written word): centre (x, y) uv, size (w, h) in paper-heights */
  stamp(source, x, y, w, h, abs) {
    const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, this.tex.stamp); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    this._quad('stamp', this.wet.a, x, y, w / 2 / this.aspect, h / 2, { uTex: this.tex.stamp, uInk: abs });
  }
  /** clean water: lifts dried ink back into the flow and thins it; amount 0…1 */
  water(x, y, r = .08, amount = .5) {
    const R = r * 1.8;
    this._quad('lift', this.wet.a, x, y, R / this.aspect, R, { uSrc: this.stain.tex, uK: amount * .8 });                // stain → wet
    this._quad('lift', this.stain, x, y, R / this.aspect, R, { uSrc: this.stain.tex, uK: amount }, 'erase');
    this._quad('lift', this.wet.a, x, y, R / this.aspect, R, { uSrc: this.stain.tex, uK: amount * .12 }, 'erase');       // and a little runs off the sheet
  }

  step(dt) {
    const gl = this.gl, o = this.o, v = this.vel, px = [1 / v.w, 1 / v.h];
    gl.disable(gl.BLEND);
    this._pass('curl', this.curlT, { uVel: v.a.tex, uPx: px });
    this._pass('vorticity', v.b, { uVel: v.a.tex, uCurl: this.curlT.tex, uPx: px, uAmt: o.curl, uDt: dt }); v.swap();
    this._pass('divergence', this.div, { uVel: v.a.tex, uPx: px });
    this._pass('scale', this.pres.b, { uSrc: this.pres.a.tex, uK: .8 }); this.pres.swap();
    for (let i = 0; i < o.pressure; i++) { this._pass('pressure', this.pres.b, { uP: this.pres.a.tex, uDiv: this.div.tex, uPx: px }); this.pres.swap(); }
    this._pass('gradient', v.b, { uP: this.pres.a.tex, uVel: v.a.tex, uPx: px }); v.swap();
    const asp = [1 / this.aspect, 1];
    this._pass('advect', v.b, { uVel: v.a.tex, uSrc: v.a.tex, uAsp: asp, uDt: dt, uKeep: Math.pow(o.velKeep, dt) }); v.swap();
    // wet ink dries into the stain layer; the stain fades a little so the sheet never fills up
    const k = 1 - Math.exp(-o.dry * dt);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.stain.fbo); gl.viewport(0, 0, this.stain.w, this.stain.h);
    gl.enable(gl.BLEND); const f = Math.exp(-o.fade * dt); gl.blendColor(f, f, f, f); gl.blendFunc(gl.ONE, gl.CONSTANT_COLOR);
    this._use('settle', { uWet: this.wet.a.tex, uVel: v.a.tex, uK: k }); this._draw(); gl.disable(gl.BLEND);
    this._pass('advect', this.wet.b, { uVel: v.a.tex, uSrc: this.wet.a.tex, uAsp: asp, uDt: dt, uKeep: 1 - k * .62 }); this.wet.swap();
  }
  /** copy the velocity field to the CPU (64 × 36 cells) so things on the paper can be carried by it */
  readFlow() {
    const gl = this.gl; this._pass('scale', this.flowT, { uSrc: this.vel.a.tex, uK: 1 });
    gl.readPixels(0, 0, this.flowW, this.flowH, gl.RGBA, gl.FLOAT, this.flow);
  }
  /** velocity at (x, y) uv → [vx, vy] in paper-heights per second (y down) */
  flowAt(x, y, out = [0, 0]) {
    const i = Math.max(0, Math.min(this.flowW - 1, Math.floor(x * this.flowW))), j = Math.max(0, Math.min(this.flowH - 1, Math.floor((1 - y) * this.flowH))), k = (j * this.flowW + i) * 4;
    out[0] = this.flow[k]; out[1] = -this.flow[k + 1]; return out;
  }
  /** a small greyscale copy of the ink on the sheet (for checks): Float32Array of wet + stain, flowW × flowH × 4 */
  readInk() {
    const gl = this.gl, out = new Float32Array(this.flowW * this.flowH * 4), tmp = new Float32Array(out.length);
    this._pass('scale', this.flowT, { uSrc: this.wet.a.tex, uK: 1 }); gl.readPixels(0, 0, this.flowW, this.flowH, gl.RGBA, gl.FLOAT, out);
    this._pass('scale', this.flowT, { uSrc: this.stain.tex, uK: 1 }); gl.readPixels(0, 0, this.flowW, this.flowH, gl.RGBA, gl.FLOAT, tmp);
    for (let i = 0; i < out.length; i++) out[i] += tmp[i];
    return out;
  }
  _upload(tex, source) {
    const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }
  setPaper(canvas) { const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, this.tex.paper); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas); this.paperSize = canvas.width; }
  /** draw the sheet: things and light are the world's two Canvas 2D layers */
  render(things, light) {
    const gl = this.gl, c = this.canvas, L = this.look, n = this.night;
    this._upload(this.tex.things, things); this._upload(this.tex.light, light);
    this._pass('display', null, {
      uWet: this.wet.a.tex, uStain: this.stain.tex, uThings: this.tex.things, uLight: this.tex.light, uPaper: this.tex.paper,
      uPaperDay: L.paperDay, uPaperNight: L.paperNight, uPale: L.pale, uGrain: L.grain, uEdge: L.edge, uRes: [this.wet.w, this.wet.h],
      uPaperScale: [c.width / (this.paperSize || 512) / (c.height / 1080), c.height / (this.paperSize || 512) / (c.height / 1080)],
      uNight: [n.from, n.to, n.r], uNightAt: n.at, uAspect: this.aspect, uFlash: this.flash, uDusk: this.dusk
    });
  }
}

/** a pigment as you see it on white paper ('#rrggbb' or [r, g, b] 0…1) → absorbance per unit of ink */
export function pigment(color, strength = 1) {
  const c = typeof color === 'string' ? [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255) : color;
  return c.map(v => -Math.log(Math.max(.02, Math.min(.995, v))) * strength);
}

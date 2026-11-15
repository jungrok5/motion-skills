// ink-water-emergence · water.js — the WebGL2 renderer that turns a painted "form" into ink drifting in still water.
//
// Input every frame: a Canvas 2D "form" (lib/paint.js) covering the screen plus a margin, whose channels are
//   R = ink density the finished form will have (0 … 1)      G = body coverage (1 inside the creature, 0 outside)
//   B = emission (how much smoke this part sheds: manes, tails, edges more than flanks)
// and a few numbers (the emergence state). Three passes:
//   1. flow   (¼ res)  the water: the curl of a slowly evolving 3-octave noise potential in WORLD units + a buoyant rise.
//                       Divergence-free, so ink stretches into filaments and curls instead of blurring.
//   2. smoke  (½ res)  for every pixel, walk BACKWARD along the flow and collect the ink the form emitted upstream — ink
//                       carried away from the form as tendrils (a line-integral along the flow). Long walk = fluid, short
//                       walk = the form holds.
//   3. compose (full)  the body (form sampled through a small flow warp, washed, wet-edged), the smoke, the paper/water
//                       ground with a soft floor, specks, grade, grain. Ink absorbs blue a little more than red, so thin
//                       ink reads as warm grey and thick ink as near-black, like sumi in water.
// Nothing here keeps state between frames: the same inputs give the same picture (every frame is a function of t).

const VS = `#version 300 es
in vec2 p; out vec2 uv; void main(){ uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

const NOISE = `
float h31(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm3(vec3 x){ float s = 0., a = .5; for (int i = 0; i < 3; i++){ s += a * vn(x); x = x * 2.03 + vec3(17.1, 9.2, 3.7); a *= .5; } return s; }
float fbm4(vec2 x){ float s = 0., a = .5; for (int i = 0; i < 4; i++){ s += a * vn(vec3(x, 1.7 * float(i))); x = x * 2.07 + 13.1; a *= .5; } return s; }
`;

// screen uv (0..1, y up) ↔ extended "form" uv (the form canvas has a margin M on every side) ↔ world units
const COMMON = `
uniform float M;          // margin as a fraction of the screen
uniform vec2 RES;         // screen size in px
uniform vec4 CAM;         // world x, world y at screen centre, world units per screen height, roll (unused)
uniform float DETAIL;     // scales every texture frequency (wash, strands, fine warp): 1 for a ~2 m animal, .25 for a whale
vec2 toForm(vec2 uv){ return (uv + M) / (1. + 2. * M); }
vec2 fromForm(vec2 f){ return f * (1. + 2. * M) - M; }
vec2 toWorld(vec2 uv){ float a = RES.x / RES.y; return CAM.xy + vec2((uv.x - .5) * a, uv.y - .5) * CAM.z; }
`;

const FLOW = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
${NOISE}${COMMON}
uniform float T, SCALE, SPEED, RISE, SEED;
float psi(vec2 w){ return fbm3(vec3(w * SCALE + SEED, T * SPEED)); }
void main(){
  vec2 s = fromForm(uv), w = toWorld(s);
  float e = .02 / SCALE;
  vec2 v = vec2(psi(w + vec2(0, e)) - psi(w - vec2(0, e)), -(psi(w + vec2(e, 0)) - psi(w - vec2(e, 0)))) / (2. * e);
  // v is in world units per unit time; convert to screen-uv units and add the buoyant rise
  v = v / (SCALE * SCALE) * .56; v.y += RISE;   // big eddies (small SCALE) move proportionally faster
  v /= CAM.z; v.x *= RES.y / RES.x;
  o = vec4(clamp(v * .5 + .5, 0., 1.), 0., 1.);
}`;

const SMOKE = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
${NOISE}${COMMON}
uniform sampler2D FORM, FLOWT;
uniform float T, LEN, SMOKE_LOD, SEED, WISP;
void main(){
  vec2 f = toForm(uv);               // this pass draws the screen area only
  vec2 q = f; float acc = 0., wsum = 0.;
  const int N = 28;
  for (int k = 0; k < N; k++){
    float kk = float(k) / float(N);
    vec2 v = (texture(FLOWT, q).xy - .5) * 2.;     // screen-uv units per unit time
    q -= v / (1. + 2. * M) * LEN / float(N);      // walk upstream
    vec4 s = textureLod(FORM, q, SMOKE_LOD);
    // ink sheds where the body is (G) in proportion to its density (R) and emission (B); broken up by noise so it leaves
    // in strands, not as a halo
    vec2 w = toWorld(fromForm(q));
    float strand = smoothstep(.35, .75, fbm3(vec3(w * 9. * DETAIL + SEED, T * .25 + kk * .6)));
    float em = s.g * (.25 + .75 * s.r) * (.35 + 1.4 * s.b) * mix(1., strand, WISP);
    float wk = exp(-kk * 2.2) * smoothstep(0., .12, kk);   // fresh ink near the source is the body itself, so ramp in
    acc += em * wk; wsum += wk;
  }
  o = vec4(acc / wsum, 0., 0., 1.);
}`;

const COMPOSE = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
${NOISE}${COMMON}
uniform sampler2D FORM, FLOWT, SMOKET;
uniform float T, WARP, BODY, SMOKEAMT, INK, HORIZON, FLOOR, GRAIN, SEED, VIG, SPECKS, FADE;
uniform vec3 PAPER, FLOORC;
void main(){
  vec2 f = toForm(uv);
  vec2 v = (texture(FLOWT, f).xy - .5) * 2.;
  vec2 w = toWorld(uv);
  // the body, seen through a little of the water's motion (fine detail warps more than the silhouette)
  float fine = fbm3(vec3(w * 14. * DETAIL + SEED, T * .5)) - .5;
  vec2 fw = f - (v * .9 + vec2(fine, -fine) * .6) * WARP / (1. + 2. * M);
  vec4 b = texture(FORM, fw);
  vec4 bb = textureLod(FORM, fw, 3.5);
  float wash = .5 + .65 * fbm4(w * 5. * DETAIL + SEED) + .45 * (fbm4(w * 19. * DETAIL + SEED * 2.) - .5);   // uneven wash, pooling, blooms
  float gran = .85 + .3 * vn(vec3(uv * RES / 2.2, 3.));                // pigment granulation
  float edge = clamp((b.g - bb.g) * 1.6, 0., 1.);                       // wet edge: ink gathers at the rim of a wash
  // rim shading: ink thickens toward the silhouette (a porcelain-like volume in wash), the middle stays pale
  float rim = clamp(1. - textureLod(FORM, fw, 4.5).g * 1.15, 0., 1.) * b.g;
  float body = (b.r * wash * gran + edge * .35 * b.g * b.r + rim * .28 * smoothstep(.0, .2, b.r)) * BODY;
  float smoke = texture(SMOKET, uv).r * SMOKEAMT;
  // stray specks of ink drifting with the water
  vec2 gp = w * 38. * DETAIL; vec2 gi = floor(gp); float hs = h31(vec3(gi, 7.));
  float spk = hs > .985 ? smoothstep(.22, .0, length(fract(gp) - .5 - (vec2(h31(vec3(gi,1.)), h31(vec3(gi,2.))) - .5) * .5)) : 0.;
  float D = body + smoke + spk * SPECKS * smoothstep(.1, .3, smoke + body * .2);
  D *= INK;
  // ground: a seamless studio tank — paper-grey water, a soft floor below the horizon, a contact-dark falloff, vignette
  float hz = smoothstep(HORIZON + .12, HORIZON - .3, uv.y);
  vec3 g = mix(PAPER, FLOORC, hz * FLOOR);
  g *= 1. - VIG * pow(length((uv - .5) * vec2(1., .9)) * 1.25, 2.4);
  g += (fbm4(w * 1.3 * DETAIL + T * .02) - .5) * .025;                           // faint murk in the water
  vec3 absorb = vec3(1., 1.07, 1.2) * 2.6;
  vec3 c = g * exp(-absorb * D);
  c = mix(c, vec3(.035, .035, .04), smoothstep(1.4, 3.2, D) * .8);       // thick ink goes to a deep, slightly cool black
  c += (h31(vec3(uv * RES, T * 60.)) - .5) * GRAIN;
  c = mix(c, PAPER, FADE);
  o = vec4(pow(clamp(c, 0., 1.), vec3(1. / 1.0)), 1.);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => i + 1 + ' ' + l).join('\n'));
  return s;
}
function program(gl, fs) {
  const p = gl.createProgram(); gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
  return { p, u };
}
function target(gl, w, h) {
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { tex, fb, w, h };
}

export const WATER_DEFAULTS = {
  scale: 1.6,      // flow features per world unit (bigger = finer eddies)
  speed: .22,      // how fast the eddies evolve
  rise: .22,       // buoyant drift upward (world units / s)
  len: .5,         // smoke trail length: how far ink is carried (the fluidity)
  warp: .02,       // how far the body itself is bent by the water (screen fraction)
  body: 1,         // body opacity
  smoke: .8,       // smoke amount
  wisp: .8,        // 0 = smoke sheds evenly, 1 = in strands
  ink: 1,          // overall darkness
  specks: .5,
  detail: 1,       // texture size: 1 for a ~2 m animal; scale by 2 m / animal length (a 5 m whale → .4)
  paper: [.915, .915, .92], floor: [.84, .84, .845], floorAmt: 1, horizon: .32, vignette: .22, grain: .018, fade: 0,
};

export function createWater(canvas, { W, H, margin = .12 }) {
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
  if (!gl) throw new Error('WebGL2 is not available');
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const P = { flow: program(gl, FLOW), smoke: program(gl, SMOKE), compose: program(gl, COMPOSE) };
  const ext = 1 + 2 * margin;
  const flow = target(gl, Math.ceil(W * ext / 4), Math.ceil(H * ext / 4));
  const smoke = target(gl, Math.ceil(W / 2), Math.ceil(H / 2));
  const form = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, form);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const set = (pr, name, v) => { const l = pr.u[name]; if (l == null) return; if (Array.isArray(v)) (v.length === 4 ? gl.uniform4fv : v.length === 3 ? gl.uniform3fv : gl.uniform2fv).call(gl, l, v); else gl.uniform1f(l, v); };
  const common = (pr, s) => { set(pr, 'DETAIL', s.detail); set(pr, 'M', margin); set(pr, 'RES', [W, H]); set(pr, 'CAM', [s.cam.x, s.cam.y, s.cam.h, 0]); set(pr, 'T', s.t); set(pr, 'SEED', s.seed || 0); };
  const bind = (pr, name, unit, tex) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(pr.u[name], unit); };
  const draw = () => gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  return {
    gl,
    /** formCanvas: the painted form (W·ext × H·ext); s: { t, cam:{x,y,h}, seed, …WATER_DEFAULTS overrides } */
    render(formCanvas, s) {
      s = { ...WATER_DEFAULTS, ...s };
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, form);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, formCanvas);
      gl.generateMipmap(gl.TEXTURE_2D);
      // 1 · flow
      gl.bindFramebuffer(gl.FRAMEBUFFER, flow.fb); gl.viewport(0, 0, flow.w, flow.h);
      let pr = P.flow; gl.useProgram(pr.p); common(pr, s);
      set(pr, 'SCALE', s.scale); set(pr, 'SPEED', s.speed); set(pr, 'RISE', s.rise); draw();
      // 2 · smoke
      gl.bindFramebuffer(gl.FRAMEBUFFER, smoke.fb); gl.viewport(0, 0, smoke.w, smoke.h);
      pr = P.smoke; gl.useProgram(pr.p); common(pr, s);
      bind(pr, 'FORM', 0, form); bind(pr, 'FLOWT', 1, flow.tex);
      set(pr, 'LEN', s.len); set(pr, 'SMOKE_LOD', 1.2); set(pr, 'WISP', s.wisp); draw();
      // 3 · compose
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
      pr = P.compose; gl.useProgram(pr.p); common(pr, s);
      bind(pr, 'FORM', 0, form); bind(pr, 'FLOWT', 1, flow.tex); bind(pr, 'SMOKET', 2, smoke.tex);
      set(pr, 'WARP', s.warp); set(pr, 'BODY', s.body); set(pr, 'SMOKEAMT', s.smoke); set(pr, 'INK', s.ink);
      set(pr, 'HORIZON', s.horizon); set(pr, 'FLOOR', s.floorAmt); set(pr, 'GRAIN', s.grain); set(pr, 'VIG', s.vignette);
      set(pr, 'SPECKS', s.specks); set(pr, 'FADE', s.fade); set(pr, 'PAPER', s.paper); set(pr, 'FLOORC', s.floor);
      draw();
    },
  };
}

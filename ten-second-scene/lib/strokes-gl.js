/* ten-second-scene · strokes-gl.js — tens of thousands of painted strokes in WebGL2, one instanced draw.
   Each stroke is a bent strip with a rounded head and a thinning tail; the fragment shader adds bristle streaks, a dry
   broken tail and an impasto ridge lit from u_light, so overlaps build up like paint. Motion is your GLSL: a
   `motion()` function moves / turns / bends each stroke from its own attributes and u_time (pure function of t). */
(function (g) {
  'use strict';
  const T = g.TSS;

  const VS = (motion) => `#version 300 es
precision highp float;
layout(location=0) in vec2 a_uv;          // u along 0..1 (head→tail), v across -1..1
layout(location=1) in vec4 a_geo;         // x, y (px), angle (rad), length (px)
layout(location=2) in vec4 a_shape;       // width (px), bend (-1..1), taper, seed
layout(location=3) in vec4 a_col;         // rgb, alpha
layout(location=4) in vec4 a_anim;        // kind, phase, amp, extra (yours to use in motion())
uniform vec2 u_res; uniform float u_time;
out vec2 v_uv; out vec4 v_col; out float v_seed; out vec2 v_dir; out float v_w;
// motion(pos, angle, length, anim, t) → vec4(dx, dy, dAngle, dBend)
${motion || 'vec4 motion(vec2 p, float ang, float len, vec4 anim, float t){ return vec4(0.0); }'}
void main(){
  vec4 m = motion(a_geo.xy, a_geo.z, a_geo.w, a_anim, u_time);
  float ang = a_geo.z + m.z, len = a_geo.w, w = a_shape.x, bend = (a_shape.y + m.w) * len * 0.35;
  vec2 d = vec2(cos(ang), sin(ang)), n = vec2(-d.y, d.x);
  float u = a_uv.x, v = a_uv.y;
  float hw = 0.5 * w * sqrt(clamp(u / 0.1, 0.0, 1.0)) * (1.0 - a_shape.z * pow(u, 1.4));
  hw = max(hw, 0.35) + 0.75;                         // AA margin
  vec2 c = a_geo.xy + m.xy + d * (u - 0.5) * len + n * bend * (1.0 - (2.0 * u - 1.0) * (2.0 * u - 1.0));
  // head cap: push the first ring forward so the head is round
  c -= d * (1.0 - smoothstep(0.0, 0.1, u)) * w * 0.35;
  vec2 p = c + n * v * hw;
  gl_Position = vec4(p / u_res * 2.0 - 1.0, 0.0, 1.0); gl_Position.y = -gl_Position.y;
  v_uv = vec2(u, v * hw / max(0.5 * w, 0.5)); v_col = a_col; v_seed = a_shape.w; v_dir = n; v_w = w;
}`;

  const FS = `#version 300 es
precision highp float;
in vec2 v_uv; in vec4 v_col; in float v_seed; in vec2 v_dir; in float v_w;
uniform vec3 u_light; uniform float u_impasto; uniform float u_bristle; uniform float u_dry;
out vec4 o;
float h1(float x){ return fract(sin(x * 127.1) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float a = h1(i.x + i.y*57.0), b = h1(i.x+1.0 + i.y*57.0), c = h1(i.x + (i.y+1.0)*57.0), d = h1(i.x+1.0 + (i.y+1.0)*57.0);
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
void main(){
  float u = v_uv.x, v = v_uv.y;
  float headR = 1.0 - smoothstep(0.0, 0.1, u);
  float r = length(vec2(v, headR * 1.2));
  float aa = fwidth(r) * 1.2 + 0.02;
  float edge = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r);
  // bristles: streaks across v, broken towards a dry tail
  float s = v_seed * 37.0;
  float streak = vnoise(vec2(v * (6.0 + 5.0 * h1(s)) + s, u * 1.5));
  float dry = smoothstep(1.0 - u_dry * pow(u, 1.6), 1.0, vnoise(vec2(u * 18.0 + s, v * 7.0)) + 0.25 * pow(u, 3.0));
  float alpha = v_col.a * edge * (1.0 - dry);
  if (alpha < 0.004) discard;
  // impasto ridge: height across the stroke, thicker at the head; lit by u_light (x, y in screen space, z up)
  float ht = sqrt(max(0.0, 1.0 - v * v)) * (1.0 - 0.6 * u);
  vec3 nrm = normalize(vec3(v_dir * v * 1.4 * u_impasto, 1.0));
  float lit = dot(nrm, normalize(u_light));
  vec3 c = v_col.rgb * (0.9 + 0.3 * (streak - 0.5) * u_bristle);
  c *= 0.78 + 0.32 * lit;
  c += vec3(1.0, 0.97, 0.88) * pow(max(0.0, lit), 18.0) * 0.22 * u_impasto * ht;
  o = vec4(c * alpha, alpha);
}`;

  function compile(gl, type, src) { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) + '\n' + src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n')); return sh; }
  function program(gl, vs, fs) { const p = gl.createProgram(); gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }

  // Strokes(gl, { W, H, motion: 'glsl vec4 motion(...)' , segments }) → { set(list), count, draw({ time, light, impasto, bristle, dry, from, to }) }
  // list item: { x, y, angle, len, width, bend, taper, seed, color:[r,g,b], alpha, anim:[kind, phase, amp, extra] }
  function Strokes(gl, o) {
    const prog = program(gl, VS(o.motion), FS), seg = o.segments || 8;
    const uv = []; for (let i = 0; i <= seg; i++) { const u = i / seg; uv.push(u, -1, u, 1); }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const b0 = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b0); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const inst = gl.createBuffer(); let count = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    for (let i = 1; i <= 4; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 64, (i - 1) * 16); gl.vertexAttribDivisor(i, 1); }
    gl.bindVertexArray(null);
    const U = n => gl.getUniformLocation(prog, n);
    const loc = { res: U('u_res'), time: U('u_time'), light: U('u_light'), imp: U('u_impasto'), bri: U('u_bristle'), dry: U('u_dry') };
    function set(list) {
      const d = new Float32Array(list.length * 16);
      list.forEach((s, i) => { const k = i * 16, c = s.color; d.set([s.x, s.y, s.angle, s.len, s.width, s.bend || 0, s.taper ?? .7, s.seed ?? i * .618 % 1, c[0], c[1], c[2], s.alpha ?? 1, ...(s.anim || [0, 0, 0, 0])], k); });
      gl.bindBuffer(gl.ARRAY_BUFFER, inst); gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW); count = list.length;
    }
    function draw(p = {}) {
      gl.useProgram(prog); gl.bindVertexArray(vao);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform2f(loc.res, o.W, o.H); gl.uniform1f(loc.time, p.time || 0);
      gl.uniform3fv(loc.light, p.light || [-.5, -.6, .8]); gl.uniform1f(loc.imp, p.impasto ?? 1); gl.uniform1f(loc.bri, p.bristle ?? 1); gl.uniform1f(loc.dry, p.dry ?? .35);
      const from = p.from || 0, to = Math.min(count, p.to ?? count);
      // instanced draw of a sub-range: rebind the attribute offsets to `from`
      gl.bindBuffer(gl.ARRAY_BUFFER, inst);
      for (let i = 1; i <= 4; i++) gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 64, from * 64 + (i - 1) * 16);
      if (to > from) gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (seg + 1) * 2, to - from);
      gl.bindVertexArray(null);
    }
    return { set, draw, get count() { return count; } };
  }

  // A full-screen pass: fullscreen(gl, 'vec4 shade(vec2 px, vec2 res, float t) { ... }') → draw({ time, blend: 'normal'|'multiply'|'add', uniforms })
  function fullscreen(gl, body, W, H) {
    const vs = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
    const fs = `#version 300 es
precision highp float; uniform vec2 u_res; uniform float u_time; uniform vec2 u_scale; out vec4 o;
${body}
void main(){ vec2 px = vec2(gl_FragCoord.x, u_res.y * u_scale.y - gl_FragCoord.y) / u_scale; o = shade(px, u_res, u_time); }`;
    const prog = program(gl, vs, fs), vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const pl = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(pl); gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
    return function draw(p = {}) {
      gl.useProgram(prog); gl.bindVertexArray(vao);
      gl.uniform2f(gl.getUniformLocation(prog, 'u_res'), W, H); gl.uniform1f(gl.getUniformLocation(prog, 'u_time'), p.time || 0);
      gl.uniform2f(gl.getUniformLocation(prog, 'u_scale'), gl.drawingBufferWidth / W, gl.drawingBufferHeight / H);
      if (p.blend === 'multiply') { gl.enable(gl.BLEND); gl.blendFunc(gl.DST_COLOR, gl.ZERO); }
      else if (p.blend === 'add') { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); }
      else if (p.blend === 'over') { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }
      else gl.disable(gl.BLEND);
      for (const [k, v] of Object.entries(p.uniforms || {})) { const l = gl.getUniformLocation(prog, k); if (Array.isArray(v)) gl['uniform' + v.length + 'fv'](l, v); else gl.uniform1f(l, v); }
      gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null);
    };
  }

  T.Strokes = Strokes; T.fullscreen = fullscreen; T.glProgram = program;
})(window);

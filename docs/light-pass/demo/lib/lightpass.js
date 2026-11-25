// light-pass · lightpass.js — art-directed sunlight laid over a finished picture (a canvas, a video, an image).
// One WebGL 2 context of its own; the host keeps drawing its piece as it always did and hands each frame here.
//
//   const lp = LightPass.create(outCanvas);              // outCanvas: where the lit picture goes (any size)
//   lp.draw(source, plan, t);                            // source: canvas | video | image | ImageBitmap; t: seconds
//   lp.view = 'lit' | 'mask' | 'off';                    // 'mask' draws the beams and pools as outlines, like a mask view
//
// The plan (JSON, see references/PLAN.md) says where the light comes from and what it does:
//   { sun:{x,y}, color, auto:{amount,threshold,decay,length}, beams:[…], pools:[…], halo:{…}, haze, grade:{…} }
// Any number or point in it may be keyframed: [[t0, v0], [t1, v1], …] — eased between keys, held before the first and
// after the last. Everything is a function of t: the same plan and t give the same picture, frame by frame.
(function (root) {
  'use strict';
  const MAXB = 16, MAXP = 8;

  // ── keyframes ─────────────────────────────────────────────────────────────────────────────────────────────────
  const ease = (u) => u * u * (3 - 2 * u);
  const lerp = (a, b, u) => (Array.isArray(a) ? a.map((x, i) => x + (b[i] - x) * u) : a + (b - a) * u);
  const isKeys = (v) => Array.isArray(v) && v.length > 0 && Array.isArray(v[0]) && v[0].length === 2 && typeof v[0][0] === 'number' && (typeof v[0][1] === 'number' || Array.isArray(v[0][1]));
  function at(v, t, d) {
    if (v === undefined || v === null) return d;
    if (!isKeys(v)) return v;
    if (t <= v[0][0]) return v[0][1];
    for (let i = 1; i < v.length; i++) if (t <= v[i][0]) { const [t0, a] = v[i - 1], [t1, b] = v[i]; return lerp(a, b, ease((t - t0) / Math.max(1e-6, t1 - t0))); }
    return v[v.length - 1][1];
  }
  const pt = (v, t, d) => { const p = at(v, t, d); return Array.isArray(p) ? p : [p.x, p.y]; };

  // ── shaders ───────────────────────────────────────────────────────────────────────────────────────────────────
  const VS = `#version 300 es
in vec2 p; out vec2 uv; void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
  const HEAD = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }`;
  // 1. where the light gets through: bright, pale, high in the picture (sky between trunks and leaves)
  const MASK = HEAD + `
uniform sampler2D src; uniform vec2 thr; uniform float pale, high; uniform vec4 region;
void main(){ vec3 c = texture(src, vec2(uv.x, 1.0 - uv.y)).rgb; float l = luma(c), s = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
  float m = smoothstep(thr.x, thr.y, l) * (1.0 - pale * smoothstep(0.08, 0.45, s));
  m *= mix(1.0, smoothstep(1.0 - high, 1.0 - high * 0.25, uv.y), step(0.001, high));
  vec2 q = vec2(uv.x, 1.0 - uv.y); m *= step(region.x, q.x) * step(q.x, region.z) * step(region.y, q.y) * step(q.y, region.w);
  o = vec4(m, m, m, 1.0); }`;
  // 2. the light carried from those gaps away from the sun (screen-space scattering: march toward the sun, sum the gaps)
  const SCATTER = HEAD + `
uniform sampler2D mask; uniform vec2 sun, res; uniform float decay, len, frame; const int N = 72;
void main(){ vec2 q = vec2(uv.x, 1.0 - uv.y); vec2 d = (sun - q) * len / float(N); float j = ign(gl_FragCoord.xy + frame * 7.0);
  vec2 s = q + d * j; float w = 1.0, acc = 0.0, wsum = 0.0;
  for (int i = 0; i < N; i++){ acc += texture(mask, vec2(s.x, 1.0 - s.y)).r * w; wsum += w; w *= decay; s += d; }
  o = vec4(vec3(acc / max(wsum, 1e-4)), 1.0); }`;
  // 3. everything on the picture: scattered light, drawn beams, pools, halo, haze, grade — or the mask view
  const COMP = HEAD + `
uniform sampler2D src, scat; uniform vec2 res, sun; uniform vec3 sunCol; uniform float autoAmt, time, view, haze, occl, shade;
uniform int nb, np;
uniform vec4 bA[${MAXB}], bB[${MAXB}], bC[${MAXB}];   // A: from.xy, to.xy (px) · B: w0, w1, soft, gain · C: drift, shimmer, phase, taper
uniform vec4 pA[${MAXP}], pB[${MAXP}];                // A: cx, cy, rx, ry (px) · B: rot, soft, gain, warmth
uniform vec4 halo; uniform vec4 gA, gB;               // halo: size (px), gain, -, - · grade A: warm, lift, contrast, sat · B: vignette, exposure, -, -
float beam(vec2 p, int i){ vec2 a = bA[i].xy, b = bA[i].zw; vec2 ab = b - a; float L = length(ab); vec2 dir = ab / L, nor = vec2(-dir.y, dir.x);
  float drift = sin(time * bC[i].x + bC[i].z) * 0.5 * (bB[i].x + bB[i].y) * 0.08;
  vec2 r = p - a; float u = dot(r, dir) / L, v = dot(r, nor) - drift * u; if (u < 0.0 || u > 1.0) return 0.0;
  float hw = 0.5 * mix(bB[i].x, bB[i].y, u), q = abs(v) / max(hw, 1.0), e = exp(-q * q * mix(4.0, 1.4, bB[i].z)) * (1.0 - smoothstep(1.2, 1.6, q));
  float along = smoothstep(0.0, 0.05, u) * pow(1.0 - u, bC[i].w);
  float sh = 1.0 - bC[i].y * (0.5 + 0.5 * sin(time * 1.7 + bC[i].z * 3.1 + u * 5.0));
  return e * along * sh * bB[i].w; }
float beamEdge(vec2 p, int i){ vec2 a = bA[i].xy, b = bA[i].zw; vec2 ab = b - a; float L = length(ab); vec2 dir = ab / L, nor = vec2(-dir.y, dir.x);
  vec2 r = p - a; float u = dot(r, dir) / L, v = dot(r, nor); float hw = 0.5 * mix(bB[i].x, bB[i].y, clamp(u, 0.0, 1.0));
  float side = (u >= 0.0 && u <= 1.0) ? 1.0 - smoothstep(0.8, 1.8, abs(abs(v) - hw)) : 0.0;
  float ends = (abs(v) <= hw + 1.0) ? max(1.0 - smoothstep(0.8, 1.8, abs(u * L)), 1.0 - smoothstep(0.8, 1.8, abs((u - 1.0) * L))) : 0.0;
  return max(side, ends); }
vec2 poolQ(vec2 p, int i){ vec2 d = p - pA[i].xy; float c = cos(pB[i].x), s = sin(pB[i].x); d = vec2(c * d.x + s * d.y, -s * d.x + c * d.y); return d / pA[i].zw; }
void main(){ vec2 px = vec2(uv.x, 1.0 - uv.y) * res; vec3 c = texture(src, vec2(uv.x, 1.0 - uv.y)).rgb;
  if (view > 1.5) { o = vec4(c, 1.0); return; }
  if (view > 0.5) {     // mask view: the picture dimmed, the light's shapes drawn as outlines
    vec3 m = c * 0.55; float line = 0.0;
    for (int i = 0; i < ${MAXB}; i++){ if (i >= nb) break; line = max(line, beamEdge(px, i)); }
    for (int i = 0; i < ${MAXP}; i++){ if (i >= np) break; float r = length(poolQ(px, i)); line = max(line, 1.0 - smoothstep(0.0, 1.6 / min(pA[i].z, pA[i].w), abs(r - 1.0))); }
    float ds = length(px - sun * res); line = max(line, 1.0 - smoothstep(0.8, 2.0, abs(ds - 14.0)));
    line = max(line, (1.0 - smoothstep(0.8, 2.0, abs(px.x - sun.x * res.x))) * step(ds, 26.0)); line = max(line, (1.0 - smoothstep(0.8, 2.0, abs(px.y - sun.y * res.y))) * step(ds, 26.0));
    vec3 g = texture(scat, vec2(uv.x, uv.y)).rgb * autoAmt; m += sunCol * g * 0.6;
    o = vec4(mix(m, vec3(1.0, 0.92, 0.55), line), 1.0); return; }
  float l = luma(c), behind = mix(1.0, smoothstep(0.04, 0.4, l), occl);      // a beam dims across dark trunks, as if it passed behind them
  vec3 L = sunCol * texture(scat, vec2(uv.x, uv.y)).r * autoAmt;
  float B = 0.0; for (int i = 0; i < ${MAXB}; i++){ if (i >= nb) break; B += beam(px, i); }
  L += sunCol * B * behind;
  float ds = length(px - sun * res); L += sunCol * halo.y * exp(-ds / max(1.0, halo.x));
  c *= 1.0 - shade * (1.0 - clamp(luma(L) * 2.5, 0.0, 1.0));                 // what the light misses sinks a little, so the light reads
  vec3 lit = 1.0 - (1.0 - c) * (1.0 - clamp(L, 0.0, 1.0));                   // screen: light adds without blowing out what is already bright
  for (int i = 0; i < ${MAXP}; i++){ if (i >= np) break; float r = length(poolQ(px, i)), e = 1.0 - smoothstep(1.0 - pB[i].y, 1.0, r);
    vec3 warm = mix(vec3(1.0), sunCol, pB[i].w); lit += lit * warm * e * pB[i].z + warm * e * pB[i].z * 0.08; }
  lit = mix(lit, sunCol, haze * texture(scat, vec2(uv.x, uv.y)).r);
  // grade: exposure, warmth, lift, contrast, saturation, vignette
  lit *= gB.y; lit *= mix(vec3(1.0), vec3(1.06, 1.0, 0.9), gA.x); lit = lit + gA.y * (1.0 - lit);
  lit = clamp((lit - 0.5) * gA.z + 0.5, 0.0, 1.5); float ll = luma(lit); lit = mix(vec3(ll), lit, gA.w);
  vec2 vq = uv - 0.5; lit *= 1.0 - gB.x * smoothstep(0.25, 0.85, dot(vq, vq) * 2.2);
  o = vec4(clamp(lit, 0.0, 1.0), 1.0); }`;

  function create(canvas, opts = {}) {
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false, preserveDrawingBuffer: !!opts.preserve, antialias: false });
    if (!gl) throw new Error('light-pass: WebGL 2 is not available');
    const prog = (fs) => { const p = gl.createProgram(); for (const [t, s] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]]) { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error('light-pass shader: ' + gl.getShaderInfoLog(sh)); gl.attachShader(p, sh); }
      gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i), name = a.name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, a.name); } return { p, u }; };
    const P = { mask: prog(MASK), scat: prog(SCATTER), comp: prog(COMP) };
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const va = gl.createVertexArray(); gl.bindVertexArray(va); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const tex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
    const srcT = tex(); const rts = {};
    const rt = (name, w, h) => { let r = rts[name]; if (r && r.w === w && r.h === h) return r; if (r) { gl.deleteTexture(r.t); gl.deleteFramebuffer(r.f); }
      const t = tex(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return (rts[name] = { t, f, w, h }); };
    const self = { canvas, gl, view: 'lit', frame: 0 };
    const pass = (pr, target, w, h) => { gl.useProgram(pr.p); gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.f : null); gl.viewport(0, 0, w, h); };
    const draw3 = () => gl.drawArrays(gl.TRIANGLES, 0, 3);

    self.draw = function (source, plan, t = 0) {
      const sw = source.videoWidth || source.naturalWidth || source.width, sh = source.videoHeight || source.naturalHeight || source.height;
      const W = canvas.width || sw, H = canvas.height || sh; if (!canvas.width) { canvas.width = W; canvas.height = H; }
      gl.bindTexture(gl.TEXTURE_2D, srcT); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
      const hw = Math.max(64, Math.round(W / 2)), hh = Math.max(36, Math.round(H / 2)), A = plan.auto || {}, sun = pt(plan.sun, t, [0.5, -0.1]);
      // 1 mask
      const mk = rt('mask', hw, hh); pass(P.mask, mk, hw, hh); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, srcT); gl.uniform1i(P.mask.u.src, 0);
      const th = at(A.threshold, t, [0.55, 0.85]); gl.uniform2f(P.mask.u.thr, th[0], th[1]); gl.uniform1f(P.mask.u.pale, at(A.pale, t, 0.6)); gl.uniform1f(P.mask.u.high, at(A.high, t, 0.0));
      const rg = at(A.region, t, [0, 0, 1, 1]); gl.uniform4f(P.mask.u.region, rg[0], rg[1], rg[2], rg[3]); draw3();
      // 2 scatter
      const sc = rt('scat', hw, hh); pass(P.scat, sc, hw, hh); gl.bindTexture(gl.TEXTURE_2D, mk.t); gl.uniform1i(P.scat.u.mask, 0);
      gl.uniform2f(P.scat.u.sun, sun[0], sun[1]); gl.uniform2f(P.scat.u.res, hw, hh); gl.uniform1f(P.scat.u.decay, at(A.decay, t, 0.965)); gl.uniform1f(P.scat.u.len, at(A.length, t, 0.85)); gl.uniform1f(P.scat.u.frame, self.frame++ % 64); draw3();
      // 3 composite
      const C = P.comp.u; pass(P.comp, null, W, H); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, srcT); gl.uniform1i(C.src, 0); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, sc.t); gl.uniform1i(C.scat, 1);
      gl.uniform2f(C.res, W, H); gl.uniform2f(C.sun, sun[0], sun[1]); const col = at(plan.color, t, [1.0, 0.86, 0.62]); gl.uniform3f(C.sunCol, col[0], col[1], col[2]);
      gl.uniform1f(C.autoAmt, at(A.amount, t, 0.6)); gl.uniform1f(C.time, t); gl.uniform1f(C.view, self.view === 'mask' ? 1 : self.view === 'off' ? 2 : 0); gl.uniform1f(C.haze, at(plan.haze, t, 0.06)); gl.uniform1f(C.occl, at(plan.occlusion, t, 0.75)); gl.uniform1f(C.shade, at(plan.shade, t, 0.18));
      const beams = (plan.beams || []).slice(0, MAXB), pools = (plan.pools || []).slice(0, MAXP), fa = new Float32Array(MAXB * 4), fb = new Float32Array(MAXB * 4), fc = new Float32Array(MAXB * 4);
      beams.forEach((b, i) => { const f = pt(b.from, t), to = pt(b.to, t), w = at(b.width, t, [0.01, 0.06]); fa.set([f[0] * W, f[1] * H, to[0] * W, to[1] * H], i * 4); fb.set([w[0] * W, w[1] * W, at(b.soft, t, 0.7), at(b.gain, t, 0.45)], i * 4); fc.set([at(b.drift, t, 0.35), at(b.shimmer, t, 0.15), b.phase !== undefined ? b.phase : i * 1.618, at(b.falloff, t, 1.4)], i * 4); });
      gl.uniform4fv(C.bA, fa); gl.uniform4fv(C.bB, fb); gl.uniform4fv(C.bC, fc); gl.uniform1i(C.nb, beams.length);
      const pa = new Float32Array(MAXP * 4), pb = new Float32Array(MAXP * 4);
      pools.forEach((p, i) => { const c = pt(p.at, t), r = at(p.radius, t, [0.08, 0.03]); pa.set([c[0] * W, c[1] * H, r[0] * W, r[1] * W], i * 4); pb.set([at(p.rotate, t, 0) * Math.PI / 180, at(p.soft, t, 0.8), at(p.gain, t, 0.25), at(p.warmth, t, 0.6)], i * 4); });
      gl.uniform4fv(C.pA, pa); gl.uniform4fv(C.pB, pb); gl.uniform1i(C.np, pools.length);
      const hl = plan.halo || {}; gl.uniform4f(C.halo, at(hl.size, t, 0.12) * W, at(hl.gain, t, 0.25), 0, 0);
      const g = plan.grade || {}; gl.uniform4f(C.gA, at(g.warm, t, 0.4), at(g.lift, t, 0.02), at(g.contrast, t, 1.05), at(g.saturation, t, 1.08)); gl.uniform4f(C.gB, at(g.vignette, t, 0.25), at(g.exposure, t, 1.0), 0, 0);
      draw3(); return self; };
    // a host that draws into a canvas of its own: put the lit picture on a canvas laid over it, and call after each frame
    self.overlay = function (host) { canvas.style.position = 'absolute'; canvas.style.pointerEvents = 'none'; const r = () => { canvas.style.left = host.offsetLeft + 'px'; canvas.style.top = host.offsetTop + 'px'; canvas.style.width = host.clientWidth + 'px'; canvas.style.height = host.clientHeight + 'px'; canvas.width = host.width; canvas.height = host.height; };
      r(); host.parentNode.insertBefore(canvas, host.nextSibling); addEventListener('resize', r); return self; };
    return self;
  }
  const api = { create, at, version: '1.0.0' };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.LightPass = api;
})(typeof window !== 'undefined' ? window : globalThis);

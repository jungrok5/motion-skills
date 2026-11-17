/* hic.js — a small runtime for HTML-in-Canvas pages: live, ordinary DOM laid out inside a <canvas> and drawn by WebGL
 * as a texture, while it stays clickable, selectable, typeable and findable.
 *
 * Master copy: tools/hic/hic.js in motion-skills. Every live-page skill carries an identical copy in <skill>/lib/hic.js
 * (tools/sync-hic.mjs copies it and --check proves the copies match). Change the master, then sync.
 *
 * Two generations of the browser API exist; this file finds whichever is present by probing, never by browser version:
 *   current  <canvas content="drawable">, children [drawable], gl.texElementSubImage2D, canvas.updateElementGeometry
 *   earlier  <canvas layoutsubtree>, gl.texElementImage2D, hit testing placed by a CSS transform on the child
 * Both: canvas.onpaint (fires when a drawable child's pixels change) and canvas.requestPaint().
 * Markup that works in both:
 *   <canvas id="stage" layoutsubtree content="drawable"><div id="page" drawable> …ordinary HTML… </div></canvas>
 *
 * No dependencies, no network. Read references/HTML-IN-CANVAS.md (repo root) or the skill's references/HIC.md.
 */
(function (root) {
  'use strict';
  var HIC = { version: '1.0.0' };
  var doc = root.document;

  // ------------------------------------------------------------------ test hook (read by scripts/check.mjs)
  var probe = root.__hic = root.__hic || {
    ready: false, fallback: false, way: '', mode: '', uploads: 0, frames: 0, paints: 0, errors: [], info: {}
  };
  root.addEventListener('error', function (e) { probe.errors.push(String(e.message || e)); });

  // ------------------------------------------------------------------ the page's address: #still=2.5 &calm &fallback
  var hash = (root.location && root.location.hash) || '';
  function hashVal(k) { var m = new RegExp('[#&]' + k + '(?:=([^&]*))?(?:&|$)').exec(hash); return m ? (m[1] === undefined ? '' : decodeURIComponent(m[1])) : null; }
  HIC.param = hashVal;
  // #still=<seconds>: time stands at that value (stills, checks). #calm: reduced motion. #fallback: force the plain page.
  var stillAt = hashVal('still');
  HIC.still = stillAt !== null ? (parseFloat(stillAt) || 0) : null;
  HIC.calm = hashVal('calm') !== null || !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ------------------------------------------------------------------ feature detection
  function proto(name) { var c = root[name]; return (c && c.prototype) || null; }
  function firstIn(protos, names) {
    for (var i = 0; i < protos.length; i++) for (var j = 0; protos[i] && j < names.length; j++) if (names[j] in protos[i]) return names[j];
    return null;
  }
  HIC.features = function () {
    var f = { markup: null, paint: false, geometry: false, canvas2d: null, webgl: null, webgpu: null };
    try {
      var cp = proto('HTMLCanvasElement'), c = doc.createElement('canvas');
      c.setAttribute('content', 'drawable');
      if (c.content === 'drawable') f.markup = 'drawable';
      else if (cp && 'layoutSubtree' in cp) f.markup = 'layoutsubtree';
      f.paint = !!cp && ('requestPaint' in cp || 'onpaint' in cp);
      f.geometry = !!cp && 'updateElementGeometry' in cp;
      f.canvas2d = firstIn([proto('CanvasRenderingContext2D')], ['drawElementImage', 'drawElement']);
      f.webgl = firstIn([proto('WebGL2RenderingContext'), proto('WebGLRenderingContext')], ['texElementSubImage2D', 'texElementImage2D']);
      f.webgpu = firstIn([proto('GPUQueue')], ['copyElementImageToTexture', 'drawElementImageToTexture']);
    } catch (e) {}
    return f;
  };
  // needs: 'webgl' (default), 'canvas2d' or 'webgpu'
  HIC.supported = function (needs) {
    if (hashVal('fallback') !== null) return false;
    var f = HIC.features();
    if (!(f.markup || f.paint)) return false;
    var list = needs ? [].concat(needs) : ['webgl'];
    for (var i = 0; i < list.length; i++) if (!f[list[i]]) return false;
    return true;
  };

  // ------------------------------------------------------------------ fallback: the same HTML as an ordinary page
  // Children of a <canvas> are hidden fallback content unless the feature is on, so they are moved out into a wrapper.
  // opts.note: one line shown above the page (false for none). opts.poster: an image shown instead of the canvas.
  HIC.fallback = function (canvas, opts) {
    opts = opts || {};
    var wrap = doc.createElement('div');
    wrap.className = 'hic-fallback';
    wrap.setAttribute('data-hic-fallback', '');
    if (opts.note !== false) {
      var n = doc.createElement('p');
      n.className = 'hic-note';
      n.setAttribute('role', 'note');
      n.textContent = opts.note || 'This page is drawn with HTML-in-Canvas (Chrome or Edge 157+, or the Claude desktop app). Here it is as an ordinary page.';
      n.style.cssText = 'margin:0;padding:10px 16px;font:13px/1.4 system-ui,sans-serif;background:#111;color:#eee;text-align:center';
      wrap.appendChild(n);
    }
    if (opts.poster) {
      var img = doc.createElement('img');
      img.src = opts.poster; img.alt = opts.posterAlt || '';
      img.style.cssText = 'display:block;max-width:100%;height:auto;margin:0 auto';
      wrap.appendChild(img);
    }
    var kids = [].slice.call(canvas.children);
    kids.forEach(function (k) { k.style.transform = ''; wrap.appendChild(k); });
    canvas.parentNode.insertBefore(wrap, canvas);
    canvas.remove();
    probe.fallback = true; probe.ready = true; probe.way = 'none';
    return wrap;
  };

  // ------------------------------------------------------------------ small WebGL2 helpers
  var G = HIC.gl = {};
  G.VS_FULL = '#version 300 es\nout vec2 vUv;\nvoid main(){ vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); vUv = p; gl_Position = vec4(p*2.-1., 0., 1.); }';
  G.shader = function (gl, type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(s), lines = src.split('\n').map(function (l, i) { return (i + 1) + ': ' + l; }).join('\n');
      throw new Error('shader: ' + log + '\n' + lines);
    }
    return s;
  };
  // program(gl, vs, fs, attribs?) -> { p, u: {name: location}, use() }
  G.program = function (gl, vs, fs, attribs) {
    var p = gl.createProgram();
    gl.attachShader(p, G.shader(gl, gl.VERTEX_SHADER, vs || G.VS_FULL));
    gl.attachShader(p, G.shader(gl, gl.FRAGMENT_SHADER, fs));
    (attribs || []).forEach(function (a, i) { gl.bindAttribLocation(p, i, a); });
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var info = gl.getActiveUniform(p, i), name = info.name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, info.name); }
    return { p: p, u: u, use: function () { gl.useProgram(p); return this; } };
  };
  // A texture with sane defaults. opts: {w, h, internal, format, type, filter, wrap, mips}
  G.texture = function (gl, opts) {
    opts = opts || {};
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    var lin = opts.filter !== 'nearest';
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, opts.mips ? gl.LINEAR_MIPMAP_LINEAR : (lin ? gl.LINEAR : gl.NEAREST));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, lin ? gl.LINEAR : gl.NEAREST);
    var wr = opts.wrap === 'repeat' ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wr);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wr);
    if (opts.w && opts.h) gl.texImage2D(gl.TEXTURE_2D, 0, opts.internal || gl.RGBA8, opts.w, opts.h, 0, opts.format || gl.RGBA, opts.type || gl.UNSIGNED_BYTE, opts.data || null);
    t.w = opts.w || 0; t.h = opts.h || 0;
    return t;
  };
  // A framebuffer with one colour texture. opts as texture(); float targets need EXT_color_buffer_float.
  G.target = function (gl, w, h, opts) {
    opts = opts || {};
    var o = { w: w, h: h, tex: G.texture(gl, { w: w, h: h, internal: opts.internal, format: opts.format, type: opts.type, filter: opts.filter, wrap: opts.wrap }) };
    o.fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, o.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, o.tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return o;
  };
  // Two targets swapped each step (simulations: ripples, fluid, ink).
  G.pingpong = function (gl, w, h, opts) {
    var a = G.target(gl, w, h, opts), b = G.target(gl, w, h, opts);
    return { get read() { return a; }, get write() { return b; }, swap: function () { var t = a; a = b; b = t; }, w: w, h: h };
  };
  // Binds textures to units and sets sampler uniforms: bind(gl, prog, {uPage: tex, uMap: tex2})
  G.bind = function (gl, prog, texs) {
    var unit = 0;
    for (var k in texs) {
      if (!(k in prog.u)) continue;
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, texs[k]); gl.uniform1i(prog.u[k], unit); unit++;
    }
  };
  // Draw the full-screen triangle (with G.VS_FULL). An empty VAO is bound once.
  G.fullscreen = function (gl) {
    if (!gl.__hicVao) gl.__hicVao = gl.createVertexArray();
    gl.bindVertexArray(gl.__hicVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  // Matrices (column-major Float32Array(16)), enough for a camera and model transforms.
  var M = HIC.mat4 = {
    ident: function () { var m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
    mul: function (a, b) { var o = new Float32Array(16); for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
    perspective: function (fovy, asp, n, f) { var t = 1 / Math.tan(fovy / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m; },
    translate: function (x, y, z) { var m = M.ident(); m[12] = x; m[13] = y; m[14] = z; return m; },
    scale: function (x, y, z) { var m = M.ident(); m[0] = x; m[5] = y; m[10] = z; return m; },
    rotX: function (a) { var m = M.ident(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; },
    rotY: function (a) { var m = M.ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; },
    rotZ: function (a) { var m = M.ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; },
    lookAt: function (e, t, up) {
      var z = norm([e[0] - t[0], e[1] - t[1], e[2] - t[2]]), x = norm(cross(up, z)), y = cross(z, x), m = M.ident();
      m[0] = x[0]; m[4] = x[1]; m[8] = x[2]; m[1] = y[0]; m[5] = y[1]; m[9] = y[2]; m[2] = z[0]; m[6] = z[1]; m[10] = z[2];
      m[12] = -dot(x, e); m[13] = -dot(y, e); m[14] = -dot(z, e); return m;
    },
    invert: function (m) {
      var inv = new Float32Array(16), i;
      inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
      inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
      inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
      inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
      inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
      inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
      inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
      inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
      inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
      inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
      inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
      inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
      inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
      inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
      inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
      inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];
      var det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
      if (!det) return M.ident();
      for (i = 0; i < 16; i++) inv[i] /= det;
      return inv;
    }
  };
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  HIC.vec = { dot: dot, cross: cross, norm: norm };

  // ------------------------------------------------------------------ the stage
  // HIC.stage(canvas, opts) — opts: { gl: WebGL2 context options or false, quality: 1, maxDpr: 2, animates: false }
  //   animates: the drawable HTML itself moves (CSS animation, video, caret blink matters): upload on every paint.
  // Returns S:
  //   S.gl                  the WebGL2 context (null if opts.gl === false)
  //   S.W, S.H, S.dpr       canvas size in CSS px and the backing scale; S.resize() refreshes them (call on 'resize')
  //   S.upload(el, tex, w, h)  the element's pixels into tex at w×h device px (defaults: element size × dpr); returns {w,h}
  //   S.onPaint(fn)         fn(S) when drawable content changed (pure hit-test moves are filtered out in CSS mode)
  //   S.requestPaint()      ask for a paint (after you changed something that the browser did not see as a change)
  //   S.place(el, m)        where el is drawn, for hit testing: m maps element-local CSS px → canvas CSS px.
  //                         m: DOMMatrix, [a,b,c,d,e,f] (2D) or 16 numbers (column-major, CSS matrix3d order); null hides el
  //   S.placeLocal(el, x, y, toPage)  for a non-affine warp: toPage(x, y) → [px, py] element-local or null. The element is
  //                         placed with the warp's local affine at the pointer, so what is under the pointer is what is clicked
  //   S.probe(el, target)   async: decides how placement reaches hit testing here ('geo' or 'css'); call once after the
  //                         first upload. target: an element inside el (default el.firstElementChild)
  //   S.loop(fn)            fn(t, dt) every frame while visible (t in s; fixed at HIC.still for stills); returns stop()
  //   S.ready(info)         marks the page ready for checks (__hic.ready) and records info
  HIC.stage = function (canvas, opts) {
    opts = opts || {};
    var S = { canvas: canvas, gl: null, W: 0, H: 0, dpr: 1, quality: opts.quality || 1, mode: '', way: '' };
    var f = HIC.features();
    if (opts.gl !== false) {
      S.gl = canvas.getContext('webgl2', Object.assign({ alpha: false, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: false }, opts.gl || {}));
      if (S.gl) {
        S.way = typeof S.gl.texElementSubImage2D === 'function' ? 'scaled' : (typeof S.gl.texElementImage2D === 'function' ? 'earlier' : '');
        S.gl.getExtension('EXT_color_buffer_float'); S.gl.getExtension('OES_texture_float_linear');
      }
    }
    S.mode = f.geometry ? 'geo' : 'css';
    probe.way = S.way; probe.mode = S.mode;

    S.resize = function () {
      var r = canvas.getBoundingClientRect();
      S.W = Math.max(1, r.width); S.H = Math.max(1, r.height);
      S.dpr = Math.min(opts.maxDpr || 2, root.devicePixelRatio || 1) * S.quality;
      var bw = Math.max(1, Math.round(S.W * S.dpr)), bh = Math.max(1, Math.round(S.H * S.dpr));
      if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
      if (S.gl) S.gl.viewport(0, 0, bw, bh);
      return S;
    };

    // ---- upload
    var wayChecked = false;
    S.upload = function (el, tex, w, h) {
      var gl = S.gl;
      if (!gl || !S.way) return null;
      var r = el.getBoundingClientRect ? { width: el.offsetWidth, height: el.offsetHeight } : { width: S.W, height: S.H };
      w = Math.max(2, Math.round(w || r.width * S.dpr)); h = Math.max(2, Math.round(h || r.height * S.dpr));
      var max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      if (w > max || h > max) { var k = max / Math.max(w, h); w = Math.floor(w * k); h = Math.floor(h * k); }
      gl.bindTexture(gl.TEXTURE_2D, tex);
      try {
        if (S.way === 'scaled') {
          if (tex.w !== w || tex.h !== h) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); tex.w = w; tex.h = h; }
          gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, el, { width: w, height: h });
          if (!wayChecked) { wayChecked = true; if (gl.getError() !== gl.NO_ERROR) { S.way = 'plain'; tex.w = tex.h = 0; } }
        }
        if (S.way === 'plain') {
          var d = canvas.getElementImageDefaultSize ? canvas.getElementImageDefaultSize(el) : { width: w, height: h };
          w = Math.max(2, Math.round(d.width)); h = Math.max(2, Math.round(d.height));
          if (tex.w !== w || tex.h !== h) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); tex.w = w; tex.h = h; }
          gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, el);
        } else if (S.way === 'earlier') {
          gl.texElementImage2D(gl.TEXTURE_2D, gl.RGBA8, el, { width: w, height: h });
          tex.w = w; tex.h = h;
        }
      } catch (err) {
        if (!probe.uploads) { probe.errors.push('upload: ' + err.message); console.warn(err); }
        return null;
      }
      var mips = gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER);
      if (mips === gl.LINEAR_MIPMAP_LINEAR || mips === gl.NEAREST_MIPMAP_LINEAR || mips === gl.LINEAR_MIPMAP_NEAREST) gl.generateMipmap(gl.TEXTURE_2D);
      probe.uploads++;
      probe.way = S.way;
      return { w: tex.w, h: tex.h };
    };

    // ---- paints
    var paintFn = null, ownMove = false, contentDirty = true, settle = 0;
    function markContent() { contentDirty = true; }
    ['input', 'change', 'click', 'keydown', 'keyup', 'focusin', 'focusout', 'pointerdown', 'pointerup', 'selectionchange', 'scroll', 'transitionend', 'animationend', 'load']
      .forEach(function (t) { root.addEventListener(t, markContent, true); doc.addEventListener(t, markContent, true); });
    canvas.onpaint = function () {
      probe.paints++;
      if (!paintFn) return;
      // In CSS mode every transform we set for hit testing is reported as a paint with no new pixels: skip those,
      // and upload once the pointer rests in case something did change.
      if (S.mode === 'css' && ownMove && !contentDirty && !opts.animates) {
        ownMove = false; clearTimeout(settle);
        settle = setTimeout(function () { contentDirty = true; S.requestPaint(); }, 150);
        return;
      }
      ownMove = false; contentDirty = false;
      paintFn(S);
    };
    S.onPaint = function (fn) { paintFn = fn; S.requestPaint(); return S; };
    S.requestPaint = function () { contentDirty = true; if (canvas.requestPaint) canvas.requestPaint(); };

    // ---- placement for hit testing
    function cssMatrix(m) {
      if (m && typeof m.toFloat64Array === 'function') return m.is2D ? 'matrix(' + [m.a, m.b, m.c, m.d, m.e, m.f].join(',') + ')' : 'matrix3d(' + Array.from(m.toFloat64Array()).join(',') + ')';
      if (m.length === 6) return 'matrix(' + Array.prototype.join.call(m, ',') + ')';
      return 'matrix3d(' + Array.prototype.join.call(m, ',') + ')';
    }
    function domMatrix(m) {
      if (m && typeof m.toFloat64Array === 'function') return m;
      return new DOMMatrix(Array.prototype.slice.call(m));
    }
    var HIDE = [1, 0, 0, 1, -100000, -100000];
    S.place = function (el, m) {
      if (!m) m = HIDE;
      for (var i = 0; i < m.length; i++) if (!isFinite(m[i])) { m = HIDE; break; }
      if (S.mode === 'geo') {
        try { canvas.updateElementGeometry(el, { canvasTransform: domMatrix(m) }); } catch (e) { S.mode = 'css'; }
      }
      if (S.mode === 'css') {
        var css = cssMatrix(m);
        if (el.__hicCss !== css) { el.__hicCss = css; el.style.transformOrigin = '0 0'; el.style.transform = css; ownMove = true; }
      }
    };
    S.placeLocal = function (el, x, y, toPage) {
      var q0 = toPage(x, y), qx = toPage(x + 1, y), qy = toPage(x, y + 1);
      if (!q0 || !qx || !qy) { S.place(el, null); return null; }
      // J = d(page)/d(screen); the element is placed with J^-1 so the page point under the pointer lands under it
      var j00 = qx[0] - q0[0], j10 = qx[1] - q0[1], j01 = qy[0] - q0[0], j11 = qy[1] - q0[1];
      var det = j00 * j11 - j01 * j10;
      if (!(Math.abs(det) > 1e-6)) { S.place(el, null); return null; }
      var a = j11 / det, b = -j10 / det, c = -j01 / det, d = j00 / det;
      S.place(el, [a, b, c, d, x - (a * q0[0] + c * q0[1]), y - (b * q0[0] + d * q0[1])]);
      return q0;
    };
    S.probe = function (el, target) {
      target = target || el.firstElementChild || el;
      var frames = function () { return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); }); };
      var modes = HIC.features().geometry ? ['geo', 'css'] : ['css'];
      var cr = canvas.getBoundingClientRect();
      return (async function () {
        var found = '';
        for (var i = 0; i < modes.length; i++) {
          S.mode = modes[i]; el.__hicCss = '';
          if (S.mode === 'css' && HIC.features().geometry) { try { canvas.updateElementGeometry(el, { canvasTransform: new DOMMatrix() }); } catch (e) {} }
          if (S.mode === 'geo') el.style.transform = '';
          var tb = target.getBoundingClientRect(), eb = el.getBoundingClientRect();
          // put the target's centre at the canvas centre, then ask the browser what is there
          var lx = tb.left - eb.left + tb.width / 2, ly = tb.top - eb.top + tb.height / 2;
          S.place(el, [1, 0, 0, 1, Math.round(cr.width / 2 - lx), Math.round(cr.height / 2 - ly)]);
          await frames();
          var hit = doc.elementFromPoint(cr.left + cr.width / 2, cr.top + cr.height / 2);
          if (hit && (hit === target || target.contains(hit))) { found = S.mode; break; }
        }
        S.mode = found || 'css'; probe.mode = S.mode + (found ? '' : '?');
        el.__hicCss = '';
        return S.mode;
      })();
    };

    // ---- time
    S.loop = function (fn) {
      var stopped = false, last = 0, t0 = 0;
      function frame(now) {
        if (stopped) return;
        if (!t0) t0 = now;
        var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
        var t = HIC.still !== null ? HIC.still : (now - t0) / 1000;
        if (HIC.still !== null) dt = 1 / 60;
        try { fn(t, dt); } catch (e) { probe.errors.push(String(e && e.message || e)); stopped = true; throw e; }
        probe.frames++;
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
      return function () { stopped = true; };
    };
    S.ready = function (info) { probe.ready = true; probe.info = Object.assign(probe.info || {}, info || {}); };
    S.resize();
    return S;
  };

  // ------------------------------------------------------------------ helpers for pages
  // Element-local box of a descendant (CSS px, relative to the drawable root): [x, y, w, h]
  HIC.box = function (rootEl, el) {
    var a = rootEl.getBoundingClientRect(), b = el.getBoundingClientRect();
    // undo a CSS-mode transform on the root by using offsets when possible
    var x = 0, y = 0, n = el;
    while (n && n !== rootEl) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    if (n === rootEl) return [x, y, el.offsetWidth, el.offsetHeight];
    return [b.left - a.left, b.top - a.top, b.width, b.height];
  };
  // A seeded random generator (mulberry32) so a page looks the same on every load and in every still.
  HIC.rng = function (seed) {
    var s = seed >>> 0;
    return function () { s += 0x6D2B79F5; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  HIC.clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  HIC.mix = function (a, b, t) { return a + (b - a) * t; };
  HIC.smooth = function (a, b, x) { var t = HIC.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  // A critically damped spring step toward a target (no overshoot unless zeta < 1). Returns [x, v].
  HIC.spring = function (x, v, target, freq, zeta, dt) {
    var w = 2 * Math.PI * freq, f = 1 + 2 * dt * zeta * w, oo = w * w, hoo = dt * oo, hhoo = dt * hoo, det = 1 / (f + hhoo);
    var nx = (f * x + dt * v + hhoo * target) * det, nv = (v + hoo * (target - x)) * det;
    return [nx, nv];
  };

  if (typeof module === 'object' && module.exports) module.exports = HIC;
  root.HIC = HIC;
})(typeof window !== 'undefined' ? window : globalThis);

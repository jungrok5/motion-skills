/* time-machine.js — one live web page, many eras. The same DOM (real text, a form, an editable headline) is restyled
 * for each era by CSS and drawn by WebGL through HTML-in-Canvas through that era's shader passes (passes.js): letterpress
 * and halftone on a desk, film grain and gate weave in a cinema, phosphor and scanlines on a monitor, … A dial at the
 * bottom turns the page through time: the camera dives into the page's material until the dots, grain or scanlines are
 * the whole view, the material changes into the next era's, and the camera rises out into the new era. The page stays
 * clickable, typeable and selectable in every era, and what the reader types travels with it.
 *
 *   <canvas id="stage" layoutsubtree content="drawable"><main id="page" drawable> …slots… </main></canvas>
 *   <div id="dial"></div>
 *   <script src="lib/hic.js"></script><script src="lib/passes.js"></script><script src="lib/time-machine.js"></script>
 *   <script> TimeMachine.start({ eras: [ {id, year, label, page, passes, content, sound, …}, … ], … }); </script>
 *
 * Page conventions (all optional except #page):
 *   [data-slot=key]              filled from era.content[key] on every era change: a string → text; an array → <p>s, or
 *                                <li>s in a list, or [dt, dd] pairs in a <dl>; {html: '…'} → markup you wrote
 *   [data-slot-placeholder=key]  sets the placeholder attribute from era.content[key]
 *   contenteditable [data-slot]  the reader's edits are kept per era (come back and they are still there)
 *   [data-log-list] [data-log-input] [data-log-add]  a log: the input + button (or Enter) add <li><time>YEAR</time><span>…
 *                                to the list, stamped with the era the note was written in; the notes travel with the page
 *
 * Hash: #era=<id> start in an era · #still=<s> fixed time · #calm no motion, travel is a short crossfade ·
 *       #fallback the plain page · #q=0.5 render at half resolution (checks) · #travel=<fromId>,<0..1> a frozen moment of a
 *       journey (stills) · #zoom=<z>,<u>,<v> magnified at page point (u, v) · #xray the raw page · #nohint
 * Test hook: window.__tm (era, index, busy, zoom, zoomPeak, travels, audio, xray, go(i, {instant}), advance(s), state()),
 *            window.__hic.screenOf(el).
 * Read references/ENGINE.md for the config and how to add a pass, a surround or a sound bed in a project.
 */
(function (root) {
  'use strict';
  var HIC = root.HIC, doc = root.document;
  var TM = root.TimeMachine = root.TimeMachine || { passes: {} };
  TM.version = '1.0.0';
  var STAGES = ['warp', 'page', 'surround', 'post'];

  // ------------------------------------------------------------------ GLSL shared by every era
  var HEAD = [
    '#version 300 es',
    'precision highp float;',
    'uniform vec2 uRes;        // drawing buffer, device px',
    'uniform vec4 uRect;       // the page rectangle on screen, device px (x, y, w, h), y down',
    'uniform vec2 uPageCss;    // the page, CSS px',
    'uniform float uTime, uAlpha, uSheet, uSeed, uRaw;',
    'uniform sampler2D uPage;',
    'out vec4 fragColor;',
    'struct Ctx { vec2 sp; vec2 suv; vec2 uv; vec2 px; float u; float t; vec3 src; };',
    'float hash11(float n) { n = fract(n * 0.1031); n *= n + 33.33; n *= n + n; return fract(n); }',
    'float hash12(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }',
    'vec2 hash22(vec2 p) { vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }',
    'float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y); }',
    'float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.7); a *= 0.5; } return s / 0.9375; }',
    'float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }',
    'float sdRoundBox(vec2 p, vec2 b, float r) { vec2 d = abs(p) - b + r; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r; }',
    'float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }',
    'float toneOf(vec3 c) { float w = c.r - c.b; return smoothstep(0.03, 0.08, w) * smoothstep(0.15, 0.3, (c.g - c.b) / max(w, 1e-3)); }   // sepia-like (r > g > b) = a picture to screen; red type (g ≈ b) is not',
    'vec3 page(vec2 uv) { return texture(uPage, clamp(uv, vec2(0.0), vec2(1.0))).rgb; }',
    'vec3 pageLod(vec2 uv, float l) { return textureLod(uPage, clamp(uv, vec2(0.0), vec2(1.0)), l).rgb; }',
    'float bayer4(vec2 p) { ivec2 i = ivec2(mod(p, 4.0)); int b[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5); return (float(b[i.y * 4 + i.x]) + 0.5) / 16.0; }'
  ].join('\n');
  var MAIN = [
    'void main() {',
    '  Ctx x;',
    '  x.sp = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);',
    '  x.suv = (x.sp - uRect.xy) / uRect.zw; x.uv = x.suv; x.t = uTime; x.u = uRect.z / uPageCss.x;',
    '/*WARP*/',
    '  x.px = x.uv * uPageCss;',
    '  vec3 c = page(x.uv); x.src = c;',
    '  if (uRaw > 0.5) {',
    '    vec2 iq = (x.suv - 0.5) * uPageCss; float on = 1.0 - smoothstep(-0.7 / x.u, 0.7 / x.u, sdBox(iq, 0.5 * uPageCss));',
    '    vec2 g = fract(x.sp / 24.0); float grid = step(0.96, max(g.x, g.y));',
    '    c = mix(vec3(0.07, 0.08, 0.1) + grid * 0.03, page(x.suv), on);',
    '  } else {',
    '/*PAGE*/',
    '/*SURROUND*/',
    '/*POST*/',
    '  }',
    '  float d = fract(52.98 * fract(dot(gl_FragCoord.xy, vec2(0.0671, 0.00584)))) - 0.5;   // one 8-bit step of dither',
    '  fragColor = vec4(c + d / 255.0, uAlpha);',
    '}'].join('\n');
  var FLASH = '#version 300 es\nprecision highp float; uniform vec2 uRes; uniform float uA; uniform vec3 uCol; out vec4 o;\n' +
    'void main() { vec2 q = gl_FragCoord.xy / uRes - 0.5; o = vec4(uCol, uA * (1.0 - 1.4 * dot(q, q))); }';

  // ------------------------------------------------------------------ small helpers
  function q(s) { return typeof s === 'string' ? doc.querySelector(s) : s; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function mix(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function rgb(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    var n = parseInt(h, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  function glslValue(v) { // → { type, value[] }
    if (typeof v === 'boolean') v = v ? 1 : 0;
    if (typeof v === 'number') return { type: 'float', value: [v] };
    if (typeof v === 'string' && /^#/.test(v)) return { type: 'vec3', value: rgb(v) };
    if (Array.isArray(v) && v.length >= 2 && v.length <= 4) return { type: 'vec' + v.length, value: v.map(Number) };
    throw new Error('time-machine: a pass parameter must be a number, a #colour or [2–4 numbers], got ' + JSON.stringify(v));
  }
  function editable(el) { return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)); }

  // ------------------------------------------------------------------ an era's shader from its passes
  function itemsOf(era) {
    return (era.passes || []).map(function (p, k) {
      var name = Array.isArray(p) ? p[0] : p, params = (Array.isArray(p) ? p[1] : null) || {};
      var def = TM.passes[name];
      if (!def) throw new Error('time-machine: era "' + era.id + '" uses an unknown pass "' + name + '" (define it with TimeMachine.pass before start)');
      var merged = {}; Object.keys(def.params).forEach(function (key) { merged[key] = def.params[key]; });
      Object.keys(params).forEach(function (key) {
        if (!(key in def.params)) throw new Error('time-machine: pass "' + name + '" has no parameter "' + key + '" (it has: ' + Object.keys(def.params).join(', ') + ')');
        merged[key] = params[key];
      });
      return { name: name, def: def, params: merged, order: STAGES.indexOf(def.stage) * 1000 + k };
    }).sort(function (a, b) { return a.order - b.order; });
  }
  function shaderOf(era, items) {
    var seen = {}, decl = [], code = [], calls = { warp: [], page: [], surround: [], post: [] };
    items.forEach(function (it) {
      if (seen[it.name]) throw new Error('time-machine: era "' + era.id + '" uses pass "' + it.name + '" twice');
      seen[it.name] = true;
      Object.keys(it.params).forEach(function (key) { decl.push('uniform ' + glslValue(it.params[key]).type + ' u_' + it.name + '_' + key + ';'); });
      code.push(it.def.glsl.replace(/\$([A-Za-z_]\w*)/g, function (m, key) {
        if (!(key in it.params)) throw new Error('time-machine: pass "' + it.name + '" uses $' + key + ' but declares no such parameter');
        return 'u_' + it.name + '_' + key;
      }));
      calls[it.def.stage].push(it.def.stage === 'warp' ? '  x.uv = pass_' + it.name + '(x.uv, x);' : '    c = pass_' + it.name + '(c, x);');
    });
    return HEAD + '\n' + decl.join('\n') + '\n' + code.join('\n') + '\n' +
      MAIN.replace('/*WARP*/', calls.warp.join('\n')).replace('/*PAGE*/', calls.page.join('\n'))
        .replace('/*SURROUND*/', calls.surround.join('\n')).replace('/*POST*/', calls.post.join('\n'));
  }

  // ------------------------------------------------------------------ the dial, the hint and the stage (injected CSS)
  var CSS = [
    ':root{--tm-dial-h:86px;--tm-accent:#f3b45c;--tm-sp:104px}',
    '@media (max-width:640px){:root{--tm-dial-h:72px;--tm-sp:80px}}',
    'html,body{margin:0;height:100%;background:#0b0b0c}',
    'body.tm-live{overflow:hidden}',
    '.tm-stage{position:fixed;left:0;top:0;width:100%;height:calc(100% - var(--tm-dial-h));display:block;touch-action:none;outline:none}',
    '.tm-dial{position:fixed;left:0;right:0;bottom:0;height:var(--tm-dial-h);box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:12px;padding:0 16px;z-index:5;',
    '  background:linear-gradient(#2c2b2a,#171615 38%,#0e0d0c);border-top:1px solid #000;box-shadow:inset 0 1px 0 #ffffff1f;',
    '  font:600 10px/1 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#cfc8b8;user-select:none;-webkit-user-select:none}',
    '.tm-dial button{font:inherit;color:inherit;letter-spacing:inherit;text-transform:inherit;margin:0;cursor:pointer}',
    '.tm-knob{flex:none;width:42px;height:42px;border-radius:50%;border:0;padding:0;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,#4a4844,#1d1c1a 70%);',
    '  box-shadow:0 2px 3px #000,inset 0 1px 0 #ffffff26,inset 0 -2px 3px #0009}',
    '.tm-knob svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}',
    '.tm-knob[aria-pressed=true]{color:var(--tm-accent);box-shadow:0 2px 3px #000,inset 0 1px 0 #ffffff26,0 0 0 2px var(--tm-accent),0 0 14px -2px var(--tm-accent)}',
    '.tm-knob:focus-visible,.tm-drum:focus-visible,.tm-arrow:focus-visible{outline:2px solid var(--tm-accent);outline-offset:2px}',
    '.tm-group{display:flex;flex-direction:column;align-items:center;gap:5px;flex:none}',
    '.tm-group small{font-size:8.5px;opacity:.7}',
    '.tm-arrow{flex:none;width:30px;height:46px;border-radius:7px;border:0;background:linear-gradient(#3a3936,#1b1a18);box-shadow:0 2px 3px #000,inset 0 1px 0 #ffffff22;font-size:18px !important;letter-spacing:0 !important}',
    '.tm-arrow:active{transform:translateY(1px)}',
    '.tm-drum{position:relative;flex:0 1 460px;min-width:0;height:60px;border-radius:10px;overflow:hidden;cursor:grab;touch-action:none;',
    '  background:linear-gradient(#030303,#1b1a18 22%,#34322e 50%,#1b1a18 78%,#030303);box-shadow:inset 0 2px 7px #000,inset 0 -2px 7px #000,0 1px 0 #ffffff17}',
    '.tm-drum.grab{cursor:grabbing}',
    '.tm-strip{position:absolute;inset:0}',
    '.tm-year{position:absolute;top:0;left:50%;width:var(--tm-sp);height:100%;border:0;padding:0;background:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:#bdb5a3;will-change:transform}',
    '.tm-year b{font:500 27px/1 ui-monospace,"SFMono-Regular",Menlo,Consolas,"Liberation Mono",monospace;letter-spacing:.02em}',
    '.tm-year span{font-size:9px;white-space:nowrap}',
    '.tm-year.on{color:var(--tm-accent);text-shadow:0 0 10px var(--tm-accent)}',
    '.tm-window{position:absolute;top:5px;bottom:5px;left:50%;width:calc(var(--tm-sp) + 8px);transform:translateX(-50%);border-radius:8px;pointer-events:none;',
    '  box-shadow:0 0 0 1.5px #8a7650,inset 0 0 0 1px #000,inset 0 8px 12px -8px #ffffff40,inset 0 -6px 10px -6px #0008}',
    '.tm-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,#000d,#0000 30%,#0000 70%,#000d)}',
    '.tm-hint{position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:4;pointer-events:none;white-space:nowrap;padding:8px 6px;border-radius:999px;',
    '  background:#0e0e10a6;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font:600 10.5px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#ffffffc4;transition:opacity .8s}',
    '.tm-hint span{margin:0 .9em;transition:opacity .6s}.tm-hint span.done{opacity:.3}.tm-hint.gone{opacity:0}',
    '@media (max-width:640px){.tm-group small,.tm-hint span[data-h=zoom]{display:none}.tm-dial{gap:7px;padding:0 8px}.tm-knob{width:36px;height:36px}.tm-arrow{width:26px}.tm-year b{font-size:22px}}',
    '.hic-fallback{position:fixed;inset:0 0 var(--tm-dial-h) 0;overflow:auto;background:#1a1917}',
    '.hic-fallback #page{margin:16px auto;max-width:calc(100vw - 32px)}'
  ].join('\n');
  var ICON_SOUND = '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="w" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
  var ICON_XRAY = '<svg viewBox="0 0 24 24"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14"/></svg>';

  // ------------------------------------------------------------------ sound: everything synthesised, off until asked
  function Sound() {
    var A = { ctx: null, on: false, out: null, noise: null, bed: null };
    A.ensure = function () {
      if (A.ctx) return true;
      var C = root.AudioContext || root.webkitAudioContext; if (!C) return false;
      A.ctx = new C();
      var comp = A.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
      A.out = A.ctx.createGain(); A.out.gain.value = 0;
      A.out.connect(comp); comp.connect(A.ctx.destination);
      var len = A.ctx.sampleRate * 2, buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate), d = buf.getChannelData(0), r = HIC.rng(7);
      for (var i = 0; i < len; i++) d[i] = r() * 2 - 1;
      A.noise = buf;
      return true;
    };
    A.set = function (on, recipe) {
      if (on && !A.ensure()) return;
      A.on = !!on;
      if (!A.ctx) return;
      if (A.on && A.ctx.state === 'suspended') A.ctx.resume();
      var t = A.ctx.currentTime;
      A.out.gain.cancelScheduledValues(t); A.out.gain.setTargetAtTime(A.on ? 0.9 : 0, t, 0.08);
      A.setBed(A.on ? recipe : null);
    };
    function src() { var s = A.ctx.createBufferSource(); s.buffer = A.noise; s.loop = true; s.loopStart = Math.random(); return s; }
    function env(g, t, a, peak, d) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
    function filt(type, f, qv) { var b = A.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = qv || 0.7; return b; }
    function burst(type, f, qv, peak, d, at) {
      var t = at || A.ctx.currentTime, s = src(), b = filt(type, f, qv), g = A.ctx.createGain();
      env(g, t, 0.003, peak, d); s.connect(b); b.connect(g); g.connect(A.out); s.start(t, Math.random() * 1.5); s.stop(t + d + 0.1);
    }
    function tone(f, peak, d, at, type, f2) {
      var t = at || A.ctx.currentTime, o = A.ctx.createOscillator(), g = A.ctx.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      env(g, t, 0.004, peak, d); o.connect(g); g.connect(A.out); o.start(t); o.stop(t + d + 0.1);
    }
    // the dial: a detent click per year, a heavier clunk when it is let go
    A.tick = function () { if (!A.on) return; burst('bandpass', 3400, 5, 0.22, 0.025); tone(1900, 0.03, 0.02); };
    A.clunk = function () { if (!A.on) return; tone(110, 0.3, 0.16, 0, 'sine', 55); burst('lowpass', 500, 0.7, 0.2, 0.08); };
    // the dive: air rushing up through a sweeping filter, a rising tone under it; the arrival: a low bloom and a bell
    A.dive = function (dur) {
      if (!A.on) return;
      var t = A.ctx.currentTime, s = src(), b = filt('bandpass', 220, 1.6), g = A.ctx.createGain();
      b.frequency.setValueAtTime(220, t); b.frequency.exponentialRampToValueAtTime(5200, t + dur * 0.55); b.frequency.exponentialRampToValueAtTime(300, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32, t + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(b); b.connect(g); g.connect(A.out); s.start(t); s.stop(t + dur + 0.1);
      tone(90, 0.12, dur * 0.55, t, 'triangle', 640);
    };
    A.arrive = function (f) { if (!A.on) return; tone(70, 0.35, 0.5, 0, 'sine', 42); tone(f || 660, 0.07, 1.1); tone((f || 660) * 1.5, 0.035, 0.9); };
    // an era's room tone, from a recipe: { hum:[f,g], noise:[type,f,q,g], gate:[rate,depth], whine:[f,g], pulse:[every,f,g], pad:[[f…],g] }
    A.setBed = function (r) {
      var t = A.ctx.currentTime;
      if (A.bed) { var old = A.bed; old.gain.gain.setTargetAtTime(0, t, 0.25); clearInterval(old.timer); setTimeout(function () { old.nodes.forEach(function (n) { try { n.stop(); } catch (e) {} }); old.gain.disconnect(); }, 1500); A.bed = null; }
      if (!r) return;
      var bed = { gain: A.ctx.createGain(), nodes: [], timer: 0 };
      bed.gain.gain.setValueAtTime(0, t); bed.gain.gain.setTargetAtTime(1, t + 0.2, 0.4); bed.gain.connect(A.out);
      function osc(f, g, type) { var o = A.ctx.createOscillator(), gg = A.ctx.createGain(); o.type = type || 'sine'; o.frequency.value = f; gg.gain.value = g; o.connect(gg); gg.connect(bed.gain); o.start(); bed.nodes.push(o); return gg; }
      if (r.hum) { osc(r.hum[0], r.hum[1]); osc(r.hum[0] * 2, r.hum[1] * 0.5); osc(r.hum[0] * 3, r.hum[1] * 0.2); }
      if (r.whine) osc(r.whine[0], r.whine[1]);
      if (r.noise) {
        var s = src(), b = filt(r.noise[0], r.noise[1], r.noise[2]), g = A.ctx.createGain();
        g.gain.value = r.noise[3] * (r.gate ? 1 - r.gate[1] * 0.5 : 1);
        s.connect(b); b.connect(g); g.connect(bed.gain); s.start(); bed.nodes.push(s);
        if (r.gate) { var lfo = A.ctx.createOscillator(), lg = A.ctx.createGain(); lfo.type = 'square'; lfo.frequency.value = r.gate[0]; lg.gain.value = r.noise[3] * r.gate[1] * 0.5; lfo.connect(lg); lg.connect(g.gain); lfo.start(); bed.nodes.push(lfo); }
      }
      if (r.pad) r.pad[0].forEach(function (f, i) {
        var gg = osc(f * (1 + (i % 2 ? 0.003 : -0.002)), r.pad[1]);
        var lfo = A.ctx.createOscillator(), lg = A.ctx.createGain(); lfo.frequency.value = 0.13 + i * 0.07; lg.gain.value = r.pad[1] * 0.6; lfo.connect(lg); lg.connect(gg.gain); lfo.start(); bed.nodes.push(lfo);
      });
      if (r.pulse) {
        var next = A.ctx.currentTime + 0.3;
        bed.timer = setInterval(function () {
          while (next < A.ctx.currentTime + 0.25) {
            var tt = next, o = A.ctx.createOscillator(), g2 = A.ctx.createGain();
            o.frequency.setValueAtTime(r.pulse[1], tt); o.frequency.exponentialRampToValueAtTime(r.pulse[1] * 0.5, tt + 0.12);
            env(g2, tt, 0.004, r.pulse[2], 0.14); o.connect(g2); g2.connect(bed.gain); o.start(tt); o.stop(tt + 0.3);
            var n2 = src(), bb = filt('bandpass', 1600, 2), g3 = A.ctx.createGain(); env(g3, tt + 0.01, 0.002, r.pulse[2] * 0.6, 0.05);
            n2.connect(bb); bb.connect(g3); g3.connect(bed.gain); n2.start(tt); n2.stop(tt + 0.2);
            next += r.pulse[0];
          }
        }, 90);
      }
      A.bed = bed;
    };
    return A;
  }

  // ======================================================================================== start
  TM.start = function (cfg) {
    cfg = cfg || {};
    var canvas = q(cfg.canvas || '#stage'), page = q(cfg.page || '#page');
    if (!canvas || !page) throw new Error('time-machine: no #stage canvas or #page');
    if (!cfg.eras || cfg.eras.length < 2) throw new Error('time-machine: give at least two eras');
    var eras = cfg.eras.map(function (e, i) {
      if (!e.id || e.year === undefined) throw new Error('time-machine: era ' + i + ' needs an id and a year');
      e.index = i; e.label = e.label || String(e.id).toUpperCase();
      e.page = e.page || { w: 900, h: 620 }; e.frame = e.frame || [24, 24, 24, 24];
      e.focus = e.focus || [0.5, 0.42]; e.dive = e.dive || 16; e.maxZoom = e.maxZoom || 8; e.maxScale = e.maxScale || 1.6;
      e.sheet = e.sheet || 0; e.content = e.content || {}; e.items = itemsOf(e);
      e.animated = e.items.some(function (it) { return it.def.animated; });
      e.warps = e.items.filter(function (it) { return it.def.stage === 'warp' && it.def.toPage; });
      return e;
    });
    var byId = {}; eras.forEach(function (e) { byId[e.id] = e.index; });
    var probe = root.__hic = root.__hic || {};
    var calm = HIC.calm, still = HIC.still;
    var cur = clamp(byId[HIC.param('era')] !== undefined ? byId[HIC.param('era')] : (byId[cfg.start] !== undefined ? byId[cfg.start] : 0), 0, eras.length - 1);
    var listeners = {};
    function emit(name, data) { (listeners[name] || []).forEach(function (fn) { try { fn(data); } catch (e) { console.error(e); } }); }
    var api = {
      eras: eras, config: cfg,
      on: function (name, fn) { (listeners[name] = listeners[name] || []).push(fn); return api; },
      get era() { return eras[cur]; }, get index() { return cur; }
    };

    // ---- styles and the dial (they work in the fallback too)
    var st = doc.createElement('style'); st.textContent = CSS; doc.head.insertBefore(st, doc.head.firstChild);
    canvas.classList.add('tm-stage');
    var narrow = function () { return (root.innerWidth || 1000) < 521; };
    function pageSize(e) { return narrow() && e.phone ? e.phone : e.page; }
    function focusOf(e) { return narrow() && e.phoneFocus ? e.phoneFocus : e.focus; }

    // ---- content: slots, the reader's edits (per era), the log (shared)
    var edits = {};
    page.addEventListener('input', function (ev) {
      var el = ev.target.closest && ev.target.closest('[data-slot]');
      if (el && el.isContentEditable) (edits[eras[cur].id] = edits[eras[cur].id] || {})[el.getAttribute('data-slot')] = el.textContent;
      hintDone('type');
    });
    function fill(el, v) {
      if (v === undefined || v === null) return;
      if (typeof v === 'object' && !Array.isArray(v) && v.html !== undefined) { el.innerHTML = v.html; return; }
      if (!Array.isArray(v)) { el.textContent = String(v); return; }
      el.textContent = '';
      var tag = el.tagName;
      v.forEach(function (item) {
        if (tag === 'DL') { var dv = doc.createElement('div'), dt = doc.createElement('dt'), dd = doc.createElement('dd'); dt.textContent = item[0]; dd.textContent = item[1]; dv.appendChild(dt); dv.appendChild(dd); el.appendChild(dv); return; }
        var c = doc.createElement(tag === 'UL' || tag === 'OL' ? 'li' : 'p');
        if (Array.isArray(item)) item.forEach(function (part, k) { var s = doc.createElement('span'); s.className = 'c' + k; s.textContent = part; c.appendChild(s); });
        else c.textContent = String(item);
        el.appendChild(c);
      });
    }
    function sizePage(i) { var sz = pageSize(eras[i]); page.style.width = sz.w + 'px'; page.style.height = sz.h + 'px'; }
    function applyEra(i) {
      var e = eras[i], mine = edits[e.id] || {};
      page.setAttribute('data-era', e.id);
      sizePage(i);
      [].forEach.call(page.querySelectorAll('[data-slot]'), function (el) {
        var key = el.getAttribute('data-slot');
        fill(el, mine[key] !== undefined ? mine[key] : e.content[key]);
      });
      [].forEach.call(page.querySelectorAll('[data-slot-placeholder]'), function (el) {
        var v = e.content[el.getAttribute('data-slot-placeholder')]; if (v !== undefined) el.setAttribute('placeholder', v);
      });
      doc.documentElement.style.setProperty('--tm-accent', e.accent || cfg.accent || '#f3b45c');
      emit('era', { era: e, index: i });
    }
    // the log
    var logList = page.querySelector('[data-log-list]'), logInput = page.querySelector('[data-log-input]'), logAdd = page.querySelector('[data-log-add]');
    function addNote(year, text) {
      if (!logList || !text) return;
      var li = doc.createElement('li'), t = doc.createElement('time'), s = doc.createElement('span');
      t.textContent = String(year); s.textContent = text; li.appendChild(t); li.appendChild(doc.createTextNode(' ')); li.appendChild(s);
      logList.insertBefore(li, logList.firstChild);
      while (logList.children.length > (cfg.logMax || 12)) logList.removeChild(logList.lastChild);
    }
    (cfg.notes || []).slice().reverse().forEach(function (n) { addNote(n.year, n.text); });
    function fileNote() {
      if (!logInput) return;
      var v = logInput.value.trim(); if (!v) return;
      addNote(eras[cur].year, v.slice(0, cfg.noteMax || 80)); logInput.value = '';
      emit('note', { text: v, era: eras[cur] });
    }
    if (logAdd) logAdd.addEventListener('click', fileNote);
    if (logInput) logInput.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); fileNote(); } });
    var form = page.querySelector('form'); if (form) form.addEventListener('submit', function (ev) { ev.preventDefault(); });

    // ---- the dial
    var dialEl = q(cfg.dial || '#dial');
    if (!dialEl) { dialEl = doc.createElement('div'); doc.body.appendChild(dialEl); }
    dialEl.className = 'tm-dial'; dialEl.setAttribute('role', 'group'); dialEl.setAttribute('aria-label', cfg.dialLabel || 'Time dial');
    var words = Object.assign({ sound: 'Sound', earlier: 'Earlier', later: 'Later', xray: 'X-ray', xrayNote: 'the page inside', dial: 'Year' }, cfg.words || {});
    dialEl.innerHTML =
      '<div class="tm-group"><button class="tm-knob tm-sound" type="button" aria-pressed="false">' + ICON_SOUND + '</button><small class="tm-w-sound"></small></div>' +
      '<button class="tm-arrow tm-prev" type="button">‹</button>' +
      '<div class="tm-drum" role="slider" tabindex="0" aria-valuemin="0"><div class="tm-strip"></div><div class="tm-shade"></div><div class="tm-window"></div></div>' +
      '<button class="tm-arrow tm-next" type="button">›</button>' +
      '<div class="tm-group"><button class="tm-knob tm-xray" type="button" aria-pressed="false">' + ICON_XRAY + '</button><small class="tm-w-xray"></small></div>';
    var drum = dialEl.querySelector('.tm-drum'), strip = dialEl.querySelector('.tm-strip');
    var soundBtn = dialEl.querySelector('.tm-sound'), xrayBtn = dialEl.querySelector('.tm-xray');
    dialEl.querySelector('.tm-w-sound').textContent = words.sound; dialEl.querySelector('.tm-w-xray').textContent = words.xray;
    soundBtn.setAttribute('aria-label', words.sound); xrayBtn.setAttribute('aria-label', words.xray + ': ' + words.xrayNote);
    dialEl.querySelector('.tm-prev').setAttribute('aria-label', words.earlier); dialEl.querySelector('.tm-next').setAttribute('aria-label', words.later);
    drum.setAttribute('aria-label', words.dial); drum.setAttribute('aria-valuemax', String(eras.length - 1));
    var yearEls = eras.map(function (e, i) {
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'tm-year'; b.tabIndex = -1; b.setAttribute('data-i', i);
      var y = doc.createElement('b'), l = doc.createElement('span'); y.textContent = e.year; l.textContent = e.label; b.appendChild(y); b.appendChild(l);
      strip.appendChild(b); return b;
    });
    var dial = { pos: cur, v: 0, target: cur, drag: null, last: Math.round(cur) };
    function spacing() { return parseFloat(getComputedStyle(doc.documentElement).getPropertyValue('--tm-sp')) || 104; }
    function drawDial() {
      var sp = spacing();
      yearEls.forEach(function (b, i) {
        var d = i - dial.pos, a = Math.abs(d);
        b.style.transform = 'translateX(' + (d * sp - sp / 2).toFixed(1) + 'px) scale(' + (1 - 0.3 * Math.min(1, a)).toFixed(3) + ')';
        b.style.opacity = (1 - 0.55 * Math.min(1, a) - 0.3 * Math.max(0, a - 1)).toFixed(3);
        b.classList.toggle('on', a < 0.5);
      });
      var n = Math.round(dial.pos);
      if (n !== dial.last) { dial.last = n; snd.tick(); }
      drum.setAttribute('aria-valuenow', String(cur)); drum.setAttribute('aria-valuetext', eras[cur].year + ' ' + eras[cur].label);
    }
    function stepDial(dt) {
      if (dial.drag) return drawDial();
      var r = HIC.spring(dial.pos, dial.v, dial.target, calm ? 4 : 2.2, calm ? 1 : 0.55, dt);   // a heavy drum: it overshoots and settles
      dial.pos = r[0]; dial.v = r[1];
      if (Math.abs(dial.pos - dial.target) < 0.0005 && Math.abs(dial.v) < 0.001) { dial.pos = dial.target; dial.v = 0; }
      drawDial();
    }
    drum.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0) return;
      drum.setPointerCapture(ev.pointerId); drum.classList.add('grab');
      dial.drag = { x0: ev.clientX, p0: dial.pos, lx: ev.clientX, lt: ev.timeStamp, v: 0, moved: 0, target: ev.target.closest('.tm-year') };
      snd.clunk();
    });
    drum.addEventListener('pointermove', function (ev) {
      var D = dial.drag; if (!D) return;
      var sp = spacing(), dx = ev.clientX - D.x0;
      D.moved = Math.max(D.moved, Math.abs(dx));
      var dtm = Math.max(1, ev.timeStamp - D.lt); D.v = mix(D.v, -(ev.clientX - D.lx) / sp / (dtm / 1000), 0.4); D.lx = ev.clientX; D.lt = ev.timeStamp;
      var p = D.p0 - dx / sp;
      if (p < 0) p = p * 0.35; if (p > eras.length - 1) p = eras.length - 1 + (p - eras.length + 1) * 0.35;   // rubber ends
      dial.pos = p;
    });
    function release(ev) {
      var D = dial.drag; if (!D) return;
      dial.drag = null; drum.classList.remove('grab');
      var to;
      if (D.moved < 5 && D.target) to = +D.target.getAttribute('data-i');
      else to = Math.round(clamp(dial.pos + clamp(D.v * 0.08, -0.6, 0.6), 0, eras.length - 1));   // a flick carries it on, a little
      dial.v = D.v; snd.clunk(); hintDone('dial');
      go(to);
    }
    drum.addEventListener('pointerup', release); drum.addEventListener('pointercancel', release);
    drum.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') { ev.preventDefault(); go(want() - 1); }
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') { ev.preventDefault(); go(want() + 1); }
      if (ev.key === 'Home') { ev.preventDefault(); go(0); }
      if (ev.key === 'End') { ev.preventDefault(); go(eras.length - 1); }
    });
    dialEl.querySelector('.tm-prev').addEventListener('click', function () { hintDone('dial'); go(want() - 1); });
    dialEl.querySelector('.tm-next').addEventListener('click', function () { hintDone('dial'); go(want() + 1); });
    doc.addEventListener('keydown', function (ev) {
      if (editable(doc.activeElement) || ev.target === drum || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (ev.key === 'ArrowLeft') { go(want() - 1); hintDone('dial'); }
      if (ev.key === 'ArrowRight') { go(want() + 1); hintDone('dial'); }
      if (ev.key === 'Escape') resetZoom();
    });
    var snd = Sound();
    soundBtn.addEventListener('click', function () {
      snd.set(!snd.on, eras[cur].sound);
      soundBtn.setAttribute('aria-pressed', String(snd.on));
    });

    // ---- the hint
    var hint = null;
    if (cfg.hints !== false && still === null && HIC.param('nohint') === null) {
      hint = doc.createElement('div'); hint.className = 'tm-hint'; hint.setAttribute('aria-hidden', 'true');
      var hw = cfg.hints || ['Turn the dial', 'Click the page and type', 'Scroll to magnify'];
      ['dial', 'type', 'zoom'].forEach(function (k, i) { var s = doc.createElement('span'); s.setAttribute('data-h', k); s.textContent = hw[i]; hint.appendChild(s); });
      doc.body.appendChild(hint);
    }
    function hintDone(k) {
      if (!hint) return;
      var s = hint.querySelector('[data-h=' + k + ']'); if (s) s.classList.add('done');
      if (!hint.querySelector('span:not(.done)')) setTimeout(function () { hint.classList.add('gone'); }, 1200);
    }

    // ---- state shared by both modes
    var travel = null, pending = null, xray = HIC.param('xray') !== null, travels = 0, zoomPeak = 1;
    function want() { return pending !== null ? pending : travel ? travel.path[travel.path.length - 1] : cur; }
    var test = root.__tm = {
      get era() { return eras[cur].id; }, get index() { return cur; }, get busy() { return !!travel; },
      get zoom() { return cam.z; }, get zoomPeak() { return zoomPeak; }, set zoomPeak(v) { zoomPeak = v; },
      get travels() { return travels; }, get audio() { return snd.ctx ? (snd.on ? 'on' : 'muted') : 'off'; },
      get xray() { return xray; }, ids: eras.map(function (e) { return e.id; }),
      animated: eras.map(function (e) { return e.animated; }),
      go: function (i, o) { go(i, o); }, advance: function (s) { simAdvance += s; },
      state: function () { return { era: eras[cur].id, busy: !!travel, zoom: cam.z, dial: dial.pos, xray: xray, texReady: texReady.slice() }; }
    };
    var cam = { z: 1, ox: 0, oy: 0, tz: 1, tox: 0, toy: 0 }, simAdvance = 0;
    function resetZoom() { cam.tz = 1; cam.tox = 0; cam.toy = 0; }
    var texReady = eras.map(function () { return false; });

    // ======================================================================================== fallback
    if (!HIC.supported('webgl')) {
      applyEra(cur);
      HIC.fallback(canvas, { note: cfg.fallbackNote });
      var wrap = doc.querySelector('[data-hic-fallback]');
      page.style.width = Math.min(pageSize(eras[cur]).w, (root.innerWidth || 900) - 32) + 'px'; page.style.height = 'auto'; page.style.minHeight = pageSize(eras[cur]).h + 'px';
      // in the plain page the dial still changes the era: CSS only, no journey
      go = function (i) {
        i = clamp(i, 0, eras.length - 1); if (i === cur) return;
        cur = i; applyEra(i); dial.target = i;
        page.style.width = Math.min(pageSize(eras[i]).w, (root.innerWidth || 900) - 32) + 'px'; page.style.height = 'auto'; page.style.minHeight = pageSize(eras[i]).h + 'px';
        if (wrap) wrap.scrollTop = 0;
      };
      (function spin(now) { stepDial(1 / 60); requestAnimationFrame(spin); })();
      xrayBtn.disabled = true;
      return api;
    }
    function go(i, o) { return goLive(i, o); }
    api.go = function (i, o) { go(typeof i === 'string' ? byId[i] : i, o); };

    // ======================================================================================== live
    doc.body.classList.add('tm-live');
    var qual = parseFloat(HIC.param('q')) || 1;
    var S = HIC.stage(canvas, { gl: { antialias: false }, maxDpr: cfg.maxDpr || 2, quality: qual }), gl = S.gl;
    if (!gl) { HIC.fallback(canvas); return api; }
    var progs = eras.map(function (e) {
      var src = shaderOf(e, e.items);
      var p = HIC.gl.program(gl, null, src);
      return { p: p, era: e };
    });
    var flash = HIC.gl.program(gl, null, FLASH);
    var texs = eras.map(function (e) { return HIC.gl.texture(gl, { mips: true, filter: e.filter === 'nearest' ? 'nearest' : 'linear' }); });
    if (eras.some(function (e) { return e.filter === 'nearest'; })) eras.forEach(function (e, i) { if (e.filter === 'nearest') { gl.bindTexture(gl.TEXTURE_2D, texs[i]); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR); } });
    probe.info = probe.info || {}; probe.info.eras = eras.map(function (e) { return e.id; });

    // ---- layout: the era's page plus its frame (page px) fitted into the canvas
    function rest(i) {
      var e = eras[i], sz = pageSize(e), f = narrow() && e.phoneFrame ? e.phoneFrame : e.frame, g = cfg.gutter === undefined ? 12 : cfg.gutter;
      var bw = sz.w + f[1] + f[3], bh = sz.h + f[0] + f[2];
      var s = Math.min((S.W - 2 * g) / bw, (S.H - 2 * g) / bh, e.maxScale);
      var x = (S.W - bw * s) / 2 + f[3] * s, y = (S.H - bh * s) / 2 + f[0] * s;
      return { x: x, y: y, w: sz.w * s, h: sz.h * s, s: s, pw: sz.w, ph: sz.h };
    }
    function view(i) { var r = rest(i); return { x: r.x * cam.z + cam.ox, y: r.y * cam.z + cam.oy, w: r.w * cam.z, h: r.h * cam.z, s: r.s * cam.z, pw: r.pw, ph: r.ph }; }
    function rectAt(i, z, f, Q) { var r = rest(i), w = r.w * z, h = r.h * z; return { x: Q[0] - f[0] * w, y: Q[1] - f[1] * h, w: w, h: h, s: r.s * z, pw: r.pw, ph: r.ph }; }

    // screen (canvas CSS px) → page uv through the era's warps (same maths as its shader)
    function toUV(i, rect, x, y) {
      var uv = [(x - rect.x) / rect.w, (y - rect.y) / rect.h];
      eras[i].warps.forEach(function (it) { uv = it.def.toPage(uv[0], uv[1], it.params); });
      return uv;
    }
    var shown = { i: cur, rect: null };   // the layer hit testing follows
    function toPage(x, y) {
      if (!shown.rect) return null;
      var uv = toUV(shown.i, shown.rect, x, y);
      if (uv[0] < 0 || uv[0] > 1 || uv[1] < 0 || uv[1] > 1) return null;
      return [uv[0] * shown.rect.pw, uv[1] * shown.rect.ph];
    }
    probe.screenOf = function (el) {
      var r = shown.rect || view(cur), b = HIC.box(page, el), tu = [(b[0] + b[2] / 2) / r.pw, (b[1] + b[3] / 2) / r.ph];
      var s = [r.x + tu[0] * r.w, r.y + tu[1] * r.h];
      for (var k = 0; k < 30; k++) { var uv = toUV(shown.i, r, s[0], s[1]); s[0] += (tu[0] - uv[0]) * r.w; s[1] += (tu[1] - uv[1]) * r.h; }
      return s;
    };

    // ---- input on the canvas: pointer for hit testing, wheel to magnify
    var pointer = null;
    canvas.addEventListener('pointermove', function (ev) { var b = canvas.getBoundingClientRect(); pointer = [ev.clientX - b.left, ev.clientY - b.top]; });
    canvas.addEventListener('pointerleave', function () { pointer = null; });
    canvas.addEventListener('wheel', function (ev) {
      if (travel) return;
      ev.preventDefault();
      var b = canvas.getBoundingClientRect(), mx = ev.clientX - b.left, my = ev.clientY - b.top;
      var k = Math.exp(-clamp(ev.deltaY * (ev.deltaMode === 1 ? 16 : 1), -120, 120) * 0.0022);
      var nz = clamp(cam.tz * k, 1, eras[cur].maxZoom), kk = nz / cam.tz;
      cam.tox = mx - (mx - cam.tox) * kk; cam.toy = my - (my - cam.toy) * kk; cam.tz = nz;
      if (nz <= 1.001) { cam.tz = 1; cam.tox = 0; cam.toy = 0; }
      hintDone('zoom'); dirty = 2;
    }, { passive: false });
    root.addEventListener('resize', function () { S.resize(); sizePage(cur); S.requestPaint(); dirty = 2; });

    // ---- uploads: the live page into this era's texture whenever its pixels change
    var ready = false, dirty = 3;
    S.onPaint(function () {
      var sz = pageSize(eras[cur]), r = rest(cur), k = clamp(r.s, 1, 2) * (cfg.texScale || 1.25) * S.dpr;
      var w = eras[cur].raster ? sz.w * eras[cur].raster : Math.round(sz.w * k), h = eras[cur].raster ? sz.h * eras[cur].raster : Math.round(sz.h * k);
      if (!S.upload(page, texs[cur], w, h)) return;
      texs[cur].era = cur; texReady[cur] = true; dirty = 2;
      if (!ready) {
        ready = true;
        S.probe(page, page.querySelector('[data-hic-edit]') || page.firstElementChild).then(function (mode) {
          placeShown(true);   // the probe leaves the page at its test offset: put it back where it is drawn
          S.ready({ mode: mode, eras: eras.length });
        });
      }
    });

    // ---- journeys
    var DIVE = 0.62, RISE = 1.0;
    function goLive(i, o) {
      o = o || {};
      i = clamp(Math.round(i), 0, eras.length - 1);
      if (travel) { if (i !== travel.path[travel.path.length - 1]) { pending = i; dial.target = i; } return; }
      pending = null;
      dial.target = i;
      if (i === cur) return;
      var from = cur;
      if (o.instant) { cur = i; applyEra(i); resetZoom(); cam.z = 1; cam.ox = cam.oy = 0; dial.pos = i; S.requestPaint(); dirty = 3; return; }
      var r = view(from), fA;
      if (cam.z > 1.05) fA = [clamp((S.W / 2 - r.x) / r.w, 0.02, 0.98), clamp((S.H / 2 - r.y) / r.h, 0.02, 0.98)];
      else fA = focusOf(eras[from]);
      var path = [], step = i > from ? 1 : -1;
      for (var k = from; k !== i; k += step) path.push(k);
      path.push(i);
      travel = { path: path, t: 0, z0: cam.z, fA: fA, P: [r.x + fA[0] * r.w, r.y + fA[1] * r.h], dive: eras[from].dive, held: 0 };
      travels++;
      cur = i; texReady[i] = false; applyEra(i); S.requestPaint();
      resetZoom();
      snd.dive(DIVE + hopTime(path.length - 1) + 0.4);
      if (snd.on) snd.setBed(null);
      emit('leave', { from: eras[from], to: eras[i] });
    }
    function hopTime(n) { return n * (n > 1 ? 0.28 : 0.4); }
    function texFor(i) { return texReady[i] || texs[i].era === i ? i : (texReady[cur] ? cur : travel ? travel.path[0] : cur); }
    // the layers to draw at this moment of the journey: [{i, rect, a}], plus a flash
    function journey(dt) {
      var T = travel, n = T.path.length - 1, target = T.path[n], HOP = n > 1 ? 0.28 : 0.4;
      if (calm) {
        T.t += dt; var p = clamp(T.t / 0.45, 0, 1);
        if (p >= 1) return arrive();
        return { layers: [{ i: T.path[0], rect: rest(T.path[0]), a: 1 }, { i: target, rect: rest(target), a: smooth(p) }], flash: 0 };
      }
      var riseAt = DIVE + n * HOP;
      // hold at the bottom of the dive until the new era's page has been drawn once (slow machines)
      if (T.t + dt >= riseAt && !texReady[target] && T.held < 2.5) { T.held += dt; dt = Math.max(0, riseAt - 0.001 - T.t); }
      T.t += dt;
      var t = T.t, zD = T.dive, P = T.P;
      if (t < DIVE) {
        var e = 1 - Math.cos(t / DIVE * Math.PI / 2);   // eases in: it gathers speed as it falls into the page
        var z = Math.exp(mix(Math.log(T.z0), Math.log(zD), e));
        return { layers: [{ i: T.path[0], rect: rectAt(T.path[0], z, T.fA, P), a: 1, z: z }], flash: 0 };
      }
      if (t < riseAt) {
        var h = (t - DIVE) / HOP, k = Math.floor(h), f = h - k, zz = zD * Math.exp(0.3 * (t - DIVE));
        var a = T.path[k], b = T.path[k + 1], fa = k === 0 ? T.fA : focusOf(eras[a]);
        var L = [{ i: a, rect: rectAt(a, zz, fa, P), a: 1, z: zz }], x = smooth((f - 0.2) / 0.6);
        if (x > 0) L.push({ i: b, rect: rectAt(b, zz, focusOf(eras[b]), P), a: x, z: zz });
        return { layers: L, flash: 0.1 * Math.sin(Math.PI * f) };
      }
      var pr = clamp((t - riseAt) / RISE, 0, 1), eo = 1 - Math.pow(1 - pr, 3);
      var zs = zD * Math.exp(0.3 * n * HOP);
      var zr = Math.exp(mix(Math.log(zs), 0, eo)) * (1 - 0.035 * Math.sin(Math.PI * clamp((pr - 0.6) / 0.4, 0, 1)));   // a dip past 1 and back: it lands
      var ft = focusOf(eras[target]), rb = rest(target), Qr = [rb.x + ft[0] * rb.w, rb.y + ft[1] * rb.h];
      var Q = [mix(P[0], Qr[0], eo), mix(P[1], Qr[1], eo)];
      if (pr >= 1) return arrive();
      return { layers: [{ i: target, rect: rectAt(target, zr, ft, Q), a: 1, z: zr }], flash: 0, rising: true };
    }
    function arrive() {
      travel = null; dirty = 3;
      snd.arrive(eras[cur].tone); if (snd.on) snd.setBed(eras[cur].sound);
      emit('arrive', { era: eras[cur], index: cur });
      if (pending !== null && pending !== cur) { var p = pending; pending = null; go(p); return journey(0); }
      pending = null;
      return null;
    }

    // a frozen journey for stills: #travel=<fromId>,<progress 0..1>
    var frozen = HIC.param('travel');
    if (frozen) {
      var fp = frozen.split(','), fi = byId[fp[0]];
      if (fi !== undefined && fi !== cur) { var tgt = cur; cur = fi; applyEra(fi); frozen = { from: fi, to: tgt, p: parseFloat(fp[1]) || 0.5, stage: 0 }; }
      else frozen = null;
    }
    var zp = HIC.param('zoom');
    if (zp) { var zq = zp.split(',').map(Number); zp = { z: zq[0] || 2, u: zq[1] === undefined ? 0.5 : zq[1], v: zq[2] === undefined ? 0.5 : zq[2] }; }

    // ---- placement for hit testing
    function placeShown(force) {
      if (!ready) return;
      if (!shown.rect) { S.place(page, null); return; }
      var r = shown.rect;
      if (eras[shown.i].warps.length && pointer && !travel) S.placeLocal(page, pointer[0], pointer[1], toPage);
      else S.place(page, [r.w / r.pw, 0, 0, r.h / r.ph, r.x, r.y]);
    }

    // ---- drawing
    function setParams(prog, e) {
      e.items.forEach(function (it) {
        Object.keys(it.params).forEach(function (key) {
          var loc = prog.u['u_' + it.name + '_' + key]; if (!loc) return;
          var v = glslValue(it.params[key]).value;
          if (v.length === 1) gl.uniform1f(loc, v[0]); else if (v.length === 2) gl.uniform2fv(loc, v); else if (v.length === 3) gl.uniform3fv(loc, v); else gl.uniform4fv(loc, v);
        });
      });
    }
    function drawLayer(L, time) {
      var P = progs[L.i].p, e = eras[L.i], d = S.dpr, r = L.rect, tex = texs[texFor(L.i)];
      P.use();
      HIC.gl.bind(gl, P, { uPage: tex });
      gl.uniform2f(P.u.uRes, canvas.width, canvas.height);
      gl.uniform4f(P.u.uRect, r.x * d, r.y * d, r.w * d, r.h * d);
      gl.uniform2f(P.u.uPageCss, r.pw, r.ph);
      if (P.u.uTime) gl.uniform1f(P.u.uTime, time);
      if (P.u.uSheet) gl.uniform1f(P.u.uSheet, e.sheet);
      if (P.u.uSeed) gl.uniform1f(P.u.uSeed, e.index * 17.3);
      gl.uniform1f(P.u.uRaw, xray ? 1 : 0);
      gl.uniform1f(P.u.uAlpha, L.a);
      setParams(P, e);
      if (L.a < 1) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); } else gl.disable(gl.BLEND);
      HIC.gl.fullscreen(gl);
    }
    var clock = 0;
    S.loop(function (t, dt) {
      if (simAdvance > 0) { dt += simAdvance; simAdvance = 0; }
      clock += dt;
      var time = calm ? 0 : (still !== null ? still : clock);
      stepDial(Math.min(dt, 0.05));
      // camera: magnify eases to its target
      if (!travel) {
        if (zp) { var r0 = rest(cur); cam.z = cam.tz = zp.z; cam.ox = cam.tox = S.W / 2 - (r0.x + zp.u * r0.w) * zp.z; cam.oy = cam.toy = S.H / 2 - (r0.y + zp.v * r0.h) * zp.z; zp = null; }
        var kz = 1 - Math.exp(-Math.min(dt, 0.1) * 12);
        if (Math.abs(cam.z - cam.tz) > 1e-4 || Math.abs(cam.ox - cam.tox) > 0.05 || Math.abs(cam.oy - cam.toy) > 0.05) {
          cam.z = mix(cam.z, cam.tz, kz); cam.ox = mix(cam.ox, cam.tox, kz); cam.oy = mix(cam.oy, cam.toy, kz); dirty = 2;
        }
      }
      var J = null;
      if (frozen) {
        // a journey held at a fixed moment (stills): the dive, the hops and the rise laid end to end
        if (!travel && ready && !frozen.started) { frozen.started = true; go(frozen.to); }
        if (travel) {
          var total = DIVE + hopTime(travel.path.length - 1) + RISE;
          if (texReady[travel.path[travel.path.length - 1]]) { travel.t = 0; travel.held = 0; J = journey(Math.min(frozen.p, 0.999) * total); }
          else J = { layers: [{ i: travel.path[0], rect: view(travel.path[0]), a: 1 }], flash: 0 };
          dirty = 2;
        }
      } else if (travel) { J = journey(dt); dirty = 2; }
      var layers;
      if (J) layers = J.layers;
      else layers = [{ i: cur, rect: view(cur), a: 1, z: cam.z }];
      layers.forEach(function (L) { zoomPeak = Math.max(zoomPeak, L.z || 1); });
      // hit testing follows the layer of the current era when it is the one on top, else the page is hidden
      var top = layers[layers.length - 1];
      if (top.i === cur && top.a > 0.5) { shown.i = cur; shown.rect = top.rect; } else shown.rect = null;
      placeShown();
      if (!(eras.some(function (e) { return e.animated; }) && layers.some(function (L) { return eras[L.i].animated; }) && !calm) && dirty <= 0 && still === null) return;
      dirty = Math.max(0, dirty - 1);
      if (!ready && !texReady[cur]) { gl.clearColor(0.04, 0.04, 0.045, 1); gl.clear(gl.COLOR_BUFFER_BIT); return; }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
      layers.forEach(function (L) { drawLayer(L, time); });
      if (J && J.flash > 0.003) {
        flash.use(); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.uniform2f(flash.u.uRes, canvas.width, canvas.height); gl.uniform1f(flash.u.uA, J.flash);
        var fc = rgb(eras[cur].accent || cfg.accent || '#fff1d6'); gl.uniform3f(flash.u.uCol, mix(1, fc[0], 0.3), mix(1, fc[1], 0.3), mix(1, fc[2], 0.3));
        HIC.gl.fullscreen(gl);
      }
      gl.disable(gl.BLEND);
    });

    xrayBtn.addEventListener('click', function () { xray = !xray; xrayBtn.setAttribute('aria-pressed', String(xray)); dirty = 2; });
    if (xray) xrayBtn.setAttribute('aria-pressed', 'true');
    applyEra(cur);
    dial.pos = dial.target = cur;
    if (snd.on) snd.setBed(eras[cur].sound);
    return api;
  };
})(typeof window !== 'undefined' ? window : globalThis);

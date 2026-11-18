/* sound.js — small synthesised sounds for dollhouse pages. Nothing is loaded: every sound is oscillators and shaped noise.
 * Off until the reader presses the Sound button (a user gesture), so a page never makes a noise on its own.
 *   var s = DHSound.create({ volume: .7, voices: { bell: fn(ctx, t, out) } })
 *   s.toggle(); s.on; s.play('click' | 'tick' | 'clunk' | 'key' | 'bell' | 'chime' | 'buzz' | 'whoosh' | 'note', arg); s.hum() → stop()
 * A page designs its own sounds per topic by passing voices (they get the context, the start time and the output bus).
 */
(function (root) {
  'use strict';
  var DHSound = root.DHSound = {};
  DHSound.create = function (opts) {
    opts = opts || {};
    var ac = null, out = null, wet = null, S = { on: false };
    function ctx() {
      if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
      var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return null;
      ac = new AC(); out = ac.createGain(); out.gain.value = opts.volume == null ? 0.7 : opts.volume;
      var comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; out.connect(comp); comp.connect(ac.destination);
      // a small room: a decaying noise impulse
      var len = Math.floor(ac.sampleRate * 1.3), ir = ac.createBuffer(2, len, ac.sampleRate), seed = 7;
      for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c), lp = 0; for (var i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; var n = seed / 1073741823.5 - 1; lp += (n - lp) * (0.6 - 0.45 * i / len); d[i] = lp * Math.pow(1 - i / len, 2.8); } }
      var cv = ac.createConvolver(); cv.buffer = ir; wet = ac.createGain(); wet.gain.value = 0.2; wet.connect(cv); cv.connect(out);
      return ac;
    }
    function bus(w) { var g = ac.createGain(); g.connect(out); if (w) { var s = ac.createGain(); s.gain.value = w; g.connect(s); s.connect(wet); } return g; }
    function tone(f, t, a, peak, dec, type, dest) { var o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(0.0001, t + a, dec / 4); o.connect(g); g.connect(dest); o.start(t); o.stop(t + a + dec * 1.5); return o; }
    function noise(t, dur, peak, f, q, dest, type) {
      var n = Math.max(1, Math.floor(ac.sampleRate * dur)), b = ac.createBuffer(1, n, ac.sampleRate), x = b.getChannelData(0), s = 99;
      for (var i = 0; i < n; i++) { s = (s * 16807) % 2147483647; x[i] = (s / 1073741823.5 - 1) * Math.pow(1 - i / n, 3); }
      var src = ac.createBufferSource(); src.buffer = b; var fl = ac.createBiquadFilter(); fl.type = type || 'bandpass'; fl.frequency.value = f; fl.Q.value = q; var g = ac.createGain(); g.gain.value = peak;
      src.connect(fl); fl.connect(g); g.connect(dest); src.start(t);
    }
    var mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
    var V = {
      click: function (t) { var b = bus(0.2); noise(t, 0.02, 0.5, 2800, 1.4, b); noise(t + 0.014, 0.03, 0.3, 900, 2, b); tone(170, t, 0.001, 0.1, 0.03, 'sine', b); },
      tick: function (t) { var b = bus(0.1); noise(t, 0.008, 0.25, 4200, 3, b); },
      clunk: function (t) { var b = bus(0.3); noise(t, 0.05, 0.4, 600, 1.2, b, 'lowpass'); tone(110, t, 0.002, 0.16, 0.08, 'triangle', b); },
      key: function (t) { var b = bus(0.1); noise(t, 0.012, 0.2, 3000 + Math.random() * 1500, 2, b); },
      bell: function (t) { var b = bus(0.45), f = 1975; [[1, 0.26, 1.8], [2.76, 0.14, 1], [5.4, 0.07, 0.5], [0.5, 0.04, 0.6]].forEach(function (p) { tone(f * p[0], t, 0.001, p[1], p[2], 'sine', b); }); noise(t, 0.01, 0.3, 5000, 1, b); },
      chime: function (t, arg) { var b = bus(0.55), notes = arg || [76, 72]; notes.forEach(function (n, i) { var f = mtof(n); tone(f, t + i * 0.32, 0.004, 0.18, 1.3, 'sine', b); tone(f * 4.02, t + i * 0.32, 0.002, 0.035, 0.25, 'sine', b); }); },
      buzz: function (t) { var b = bus(0); var o = tone(120, t, 0.01, 0.04, 0.5, 'sawtooth', b); noise(t, 0.08, 0.15, 4000, 0.7, b); return o; },
      whoosh: function (t) { var b = bus(0.3); noise(t, 0.6, 0.35, 500, 0.7, b, 'lowpass'); },
      note: function (t, m) { var b = bus(0.4), f = mtof(m || 72); tone(f, t, 0.004, 0.16, 1.1, 'triangle', b); tone(f * 2, t, 0.003, 0.04, 0.4, 'sine', b); }
    };
    Object.assign(V, opts.voices || {});
    S.toggle = function () { S.on = !S.on; if (S.on) ctx(); else if (ac) ac.suspend(); return S.on; };
    S.play = function (name, arg) { if (!S.on || !ctx()) return; var v = V[name]; if (v) v.call(S, ac.currentTime + 0.005, arg, { ac: ac, bus: bus, tone: tone, noise: noise, mtof: mtof }); };
    // a low motor while something heavy moves; returns stop()
    S.hum = function () {
      if (!S.on || !ctx()) return function () {};
      var t = ac.currentTime, g = ac.createGain(), b = bus(0.15); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.25); g.connect(b);
      var o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = 55; o2.frequency.value = 111; f.type = 'lowpass'; f.frequency.value = 240;
      o.connect(f); o2.connect(f); f.connect(g); o.start(t); o2.start(t);
      return function () { var e = ac.currentTime; g.gain.cancelScheduledValues(e); g.gain.setTargetAtTime(0.0001, e, 0.12); o.stop(e + 0.8); o2.stop(e + 0.8); };
    };
    S.context = function () { return ac; };
    return S;
  };
})(typeof window !== 'undefined' ? window : globalThis);

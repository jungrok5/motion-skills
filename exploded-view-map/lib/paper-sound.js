/* paper-sound.js — paper and card on a wooden desk, synthesised with Web Audio. No samples, no network.
 *
 * Global `PaperSound`. Everything is silent until enable() is called from a user gesture (the page's sound toggle).
 *   PaperSound.enable() / .disable() / .on       start or stop (the AudioContext is made on the first enable)
 *   PaperSound.riffle(amount, speed)             every frame: the stack moving; speed = d(amount)/dt (+ apart, - together)
 *   PaperSound.land(weight)                      the stack comes down on the desk (a soft thud and two little taps)
 *   PaperSound.flick()                           a paper flag springs up (a crisp flick, a little different each time)
 *   PaperSound.lift()                            one sheet picked up (a short slide and a tap)
 *   PaperSound.tick(v01)                         a slider moved: soft detent clicks, pitched by the value
 *   PaperSound.touch()                           the pointer brushes a sheet (very quiet, rate-limited)
 *   PaperSound.voice(o)                          per-topic colour: { desk: Hz of the desk's knock, paper: brightness 0..1 }
 * Never throws. Calls before enable() do nothing.
 */
(function (root) {
  'use strict';
  var ctx = null, out = null, on = false, noise = null, riffleSrc = null, riffleGain = null, riffleBP = null;
  var seed = 7, last = { touch: 0, tick: 0, tickV: -1 }, voice = { desk: 92, paper: 0.6 };
  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  function now() { return ctx.currentTime; }

  function build() {
    var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
    out = ctx.createGain(); out.gain.value = 0;
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 30;
    out.connect(hp); hp.connect(comp); comp.connect(ctx.destination);
    // one second of white noise, and one of "riffle": noise chopped into fibre crackles
    var n = ctx.sampleRate, a = ctx.createBuffer(1, n, n), b = ctx.createBuffer(1, n, n), da = a.getChannelData(0), db = b.getChannelData(0), env = 0;
    for (var i = 0; i < n; i++) {
      da[i] = rnd() * 2 - 1;
      if (rnd() < 0.0016) env = 0.5 + rnd() * 0.5;
      env *= 0.9965; db[i] = (rnd() * 2 - 1) * (0.12 + env);
    }
    noise = a;
    riffleSrc = ctx.createBufferSource(); riffleSrc.buffer = b; riffleSrc.loop = true;
    riffleBP = ctx.createBiquadFilter(); riffleBP.type = 'bandpass'; riffleBP.frequency.value = 2400; riffleBP.Q.value = 0.8;
    riffleGain = ctx.createGain(); riffleGain.gain.value = 0;
    riffleSrc.connect(riffleBP); riffleBP.connect(riffleGain); riffleGain.connect(out); riffleSrc.start();
    return true;
  }
  // a filtered noise burst: type, centre Hz, Q, peak, attack s, decay s
  function burst(type, f, q, peak, att, dec, when) {
    if (!ctx) return;
    var t = (when || now()), s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; bp.type = type; bp.frequency.value = f; bp.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + att + dec);
    s.connect(bp); bp.connect(g); g.connect(out); s.start(t, rnd() * 0.8); s.stop(t + att + dec + 0.05);
    s.onended = function () { g.disconnect(); };
  }
  function thud(f0, f1, peak, dec, when) {
    if (!ctx) return;
    var t = when || now(), o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dec);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dec + 0.05); o.onended = function () { g.disconnect(); };
  }

  var P = {
    get on() { return on; },
    enable: function () {
      try {
        if (!ctx && !build()) return false;
        if (ctx.state === 'suspended') ctx.resume();
        on = true; out.gain.setTargetAtTime(0.9, now(), 0.05);
      } catch (e) { on = false; }
      return on;
    },
    disable: function () { on = false; if (ctx) out.gain.setTargetAtTime(0, now(), 0.05); },
    voice: function (o) { for (var k in o) voice[k] = o[k]; },
    riffle: function (amount, speed) {
      if (!on) return;
      var s = Math.min(1, Math.abs(speed) * 0.9), lvl = s * (0.25 + 0.5 * Math.min(1, amount + 0.2));
      riffleGain.gain.setTargetAtTime(lvl * 0.5, now(), 0.04);
      riffleBP.frequency.setTargetAtTime(1500 + 2600 * voice.paper + 1200 * s * (speed > 0 ? 1 : 0.6), now(), 0.05);
      riffleSrc.playbackRate.setTargetAtTime(0.8 + 0.6 * s, now(), 0.05);
    },
    land: function (w) {
      if (!on) return; w = w == null ? 1 : w; var t = now();
      thud(voice.desk * 1.4, voice.desk * 0.7, 0.55 * w, 0.18);
      burst('lowpass', 900, 0.7, 0.35 * w, 0.002, 0.07, t);
      burst('bandpass', 3200, 1.5, 0.12 * w, 0.001, 0.03, t + 0.07 + rnd() * 0.02);
      burst('bandpass', 2600, 1.5, 0.08 * w, 0.001, 0.03, t + 0.13 + rnd() * 0.03);
    },
    flick: function () {
      if (!on) return;
      burst('highpass', 3500 + 1500 * rnd(), 0.9, 0.22, 0.001, 0.035 + rnd() * 0.02);
      burst('bandpass', 1300 + 400 * rnd(), 2, 0.08, 0.002, 0.05);
    },
    lift: function () {
      if (!on) return; var t = now();
      burst('bandpass', 2000, 0.8, 0.12, 0.05, 0.12, t);
      burst('bandpass', 3800, 1.2, 0.1, 0.001, 0.025, t + 0.16);
    },
    tick: function (v) {
      if (!on) return; var t = now(), step = Math.round(v * 40);
      if (step === last.tickV || t - last.tick < 0.03) return; last.tickV = step; last.tick = t;
      burst('bandpass', 2200 + 1800 * v, 6, 0.07, 0.001, 0.018);
    },
    touch: function () {
      if (!on) return; var t = now(); if (t - last.touch < 0.12) return; last.touch = t;
      burst('bandpass', 2800 + 1200 * voice.paper, 1, 0.03, 0.01, 0.06);
    }
  };
  root.PaperSound = P;
})(typeof window !== 'undefined' ? window : globalThis);

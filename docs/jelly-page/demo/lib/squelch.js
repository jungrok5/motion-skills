/* squelch.js — synthesised jelly sounds for jelly.js (Web Audio only: oscillators, generated noise, filters, envelopes).
 * No samples, no network. Off until a user gesture turns it on (the page's sound button calls toggle()).
 *
 *   var snd = SQUELCH.create({ pitch: 1, wet: 1, volume: .55 });
 *   snd.toggle();                       // from a click: creates the AudioContext and turns sound on / off
 *   snd.firmness = .8;                  // 0 loose … 1 firm: firmer jelly is higher and shorter
 *   snd.play('poke' | 'grab' | 'release' | 'type' | 'lift' | 'land' | 'melt' | 'flavour', amount, flag);
 *
 * Voice per topic: pitch (× all pitches: a big party jelly .8, a tiny shot glass 1.3), wet (× noise and filter sweep:
 * how sloppy), volume. See references/ENGINE.md.
 */
(function (root) {
  'use strict';
  var SQUELCH = {};
  SQUELCH.create = function (opts) {
    opts = opts || {};
    var pitch = opts.pitch || 1, wet = opts.wet === undefined ? 1 : opts.wet, vol = opts.volume === undefined ? 0.55 : opts.volume;
    var ctx = null, out = null, noise = null, lastType = 0;
    var S = { enabled: false, firmness: 0.8, ctx: function () { return ctx; } };
    function init() {
      if (ctx) return;
      var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return;
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
      out = ctx.createGain(); out.gain.value = vol;
      out.connect(comp); comp.connect(ctx.destination);
      // one second of seeded noise, reused by every wet sound
      var len = ctx.sampleRate, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0), s = 12345;
      for (var i = 0; i < len; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = s / 0x3fffffff - 1; }
      noise = buf;
    }
    S.toggle = function () {
      init(); if (!ctx) return S;
      S.enabled = !S.enabled;
      if (S.enabled && ctx.state !== 'running') ctx.resume();
      return S;
    };
    function now() { return ctx.currentTime + 0.005; }
    function env(g, t, peak, a, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
    // a pitched blob: a sine (plus a little triangle) whose pitch falls (or rises) like a bubble
    function bloop(t, f0, f1, dur, peak, type) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f0 * pitch, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * pitch), t + dur);
      env(g, t, peak, 0.006, dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
    }
    // a wet noise burst through a moving band-pass: the squelch
    function slosh(t, fA, fB, q, dur, peak) {
      var n = ctx.createBufferSource(); n.buffer = noise; n.playbackRate.value = 0.7 + Math.random() * 0.3;
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
      f.frequency.setValueAtTime(fA * pitch, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, fB * pitch), t + dur);
      var g = ctx.createGain(); env(g, t, peak * wet, 0.01, dur);
      n.connect(f); f.connect(g); g.connect(out); n.start(t, Math.random() * 0.5); n.stop(t + dur + 0.05);
    }
    S.play = function (name, a, flag) {
      if (!S.enabled || !ctx) return;
      var t = now(), fm = 0.8 + 0.4 * S.firmness, short = 1.3 - 0.5 * S.firmness;
      a = a === undefined ? 0.6 : a;
      switch (name) {
        case 'poke': bloop(t, 340 * fm, 150 * fm, 0.12 * short, 0.25 * a + 0.05); slosh(t, 900, 300, 3, 0.08, 0.12 * a); break;
        case 'grab': slosh(t, 300, 1400, 4, 0.22 * short, 0.22); bloop(t, 120, 220, 0.18, 0.08); break;
        case 'release': {
          var k = Math.max(0.15, a);
          slosh(t, 1600, 260, 2.5, 0.16, 0.28 * k); bloop(t + 0.01, 260 * fm, 90 * fm, 0.3 * short, 0.32 * k);
          bloop(t + 0.12 * short, 210 * fm, 120 * fm, 0.22 * short, 0.14 * k); break;
        }
        case 'type': {
          if (t - lastType < 0.04) return; lastType = t;
          var f = (flag ? 260 : 420) * fm * (0.92 + Math.random() * 0.16);
          bloop(t, f, f * (flag ? 0.55 : 0.7), 0.07 * short, 0.12 * a + 0.03); break;
        }
        case 'lift': slosh(t, 250, 1100, 5, 0.3, 0.14); bloop(t, 140, 300, 0.3, 0.06); break;
        case 'land': {
          var k2 = Math.max(0.2, a);
          bloop(t, 95, 42, 0.32, 0.5 * k2); slosh(t, 1800, 220, 1.8, 0.28 * short, 0.4 * k2);
          bloop(t + 0.03, 300 * fm, 110 * fm, 0.35 * short, 0.22 * k2); bloop(t + 0.18 * short, 230 * fm, 140 * fm, 0.25 * short, 0.1 * k2); break;
        }
        case 'melt': slosh(t, 500, 160, 1.2, 0.9, 0.12 * Math.max(0.3, a)); bloop(t + 0.1, 180, 70, 0.6, 0.06); break;
        case 'flavour': bloop(t, 660 * fm, 990 * fm, 0.09, 0.12, 'triangle'); bloop(t + 0.07, 880 * fm, 1320 * fm, 0.12, 0.09, 'triangle'); slosh(t, 700, 400, 3, 0.15, 0.06); break;
      }
    };
    return S;
  };
  root.SQUELCH = SQUELCH;
})(typeof window !== 'undefined' ? window : globalThis);

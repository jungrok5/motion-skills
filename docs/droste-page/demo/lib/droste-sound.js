/* droste-sound.js — synthesised sounds for droste-page (Web Audio only; no samples, no network).
 *
 *   var snd = DrosteSound.create('ceramic' | 'glass' | 'wood' | 'card' | { ...a preset of your own })
 *   snd.wake()                      make / resume the AudioContext (only ever called from a user gesture)
 *   snd.tap({ note, level, pan })   something on the page struck: a modal "tink" of the material; deeper copies are
 *                                   smaller objects, so each level sounds a step higher
 *   snd.pass(dir)                   the camera passes one copy (+1 in, −1 out): a short airy fall and a soft knock
 *   snd.heal()                      a part-wound spiral closes into a whole turn: a slow bowl tone
 *
 * A preset: { base: Hz of note 0, scale: semitone steps, modes: [[ratio, gain], …], decay: s of the lowest mode,
 *             click: noise click gain, clickHz, room: reverb send 0..1, roomSize: s, air: whoosh colour Hz, gain }
 * Everything goes through a limiter. Deterministic noise (seeded), so two loads sound the same.
 */
(function (root) {
  'use strict';

  var PRESETS = {
    // a glazed tile struck with a fingernail: plate modes, bright, short
    ceramic: { base: 880, scale: [0, 2, 4, 7, 9], modes: [[1, 1], [1.46, .5], [1.8, .4], [2.59, .35], [2.61, .22], [4.52, .24], [5.1, .14], [7.8, .06]], decay: .42, click: .35, clickHz: 5200, room: .32, roomSize: .8, air: 1800, gain: .55 },
    // a glass screen tapped: fewer, purer modes, longer ring
    glass: { base: 1320, scale: [0, 3, 5, 7, 10], modes: [[1, 1], [2.76, .38], [5.4, .18], [8.93, .07]], decay: .9, click: .18, clickHz: 7000, room: .4, roomSize: 1.2, air: 2600, gain: .45 },
    // a knuckle on a wooden shelf: low, damped, woody
    wood: { base: 330, scale: [0, 2, 5, 7, 9], modes: [[1, 1], [2.3, .45], [3.9, .25], [5.6, .12]], decay: .12, click: .5, clickHz: 2400, room: .22, roomSize: .6, air: 900, gain: .7 },
    // a fingertip on a cereal box: a papery tick with a hollow box body and a rattle of what is inside
    card: { base: 440, scale: [0, 2, 4, 7, 9], modes: [[1, .7], [1.7, .4], [2.9, .2]], decay: .09, click: .8, clickHz: 3000, rattle: .5, room: .15, roomSize: .5, air: 1200, gain: .7 }
  };

  function mulberry(a) { return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function create(preset) {
    var P = typeof preset === 'string' ? PRESETS[preset] || PRESETS.ceramic : Object.assign({}, PRESETS.ceramic, preset || {});
    var ctx = null, out = null, verb = null, noise = null, rnd = mulberry(7177);
    function build() {
      var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return false;
      ctx = new AC();
      var lim = ctx.createDynamicsCompressor();
      lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.002; lim.release.value = 0.15;
      out = ctx.createGain(); out.gain.value = P.gain;
      out.connect(lim); lim.connect(ctx.destination);
      // a small room: decaying, slowly darkening noise, different per channel
      var sr = ctx.sampleRate, len = Math.floor(sr * P.roomSize), buf = ctx.createBuffer(2, len, sr);
      for (var c = 0; c < 2; c++) {
        var d = buf.getChannelData(c), R = mulberry(901 + c * 31), lp = 0;
        for (var i = 0; i < len; i++) {
          var t = i / sr, k = Math.exp(-t * 6.9 / P.roomSize), cut = 0.5 * Math.exp(-t * 3);
          lp += (R() * 2 - 1 - lp) * Math.max(0.03, cut);
          d[i] = lp * k * (i < sr * 0.01 ? i / (sr * 0.01) : 1);
        }
      }
      verb = ctx.createConvolver(); verb.buffer = buf;
      var vg = ctx.createGain(); vg.gain.value = P.room; verb.connect(vg); vg.connect(out);
      // one second of seeded white noise for clicks, rattles and air
      noise = ctx.createBuffer(1, sr, sr);
      var nd = noise.getChannelData(0), NR = mulberry(4242);
      for (var j = 0; j < sr; j++) nd[j] = NR() * 2 - 1;
      return true;
    }
    function wake() { if (!ctx && !build()) return; if (ctx.state === 'suspended') ctx.resume(); }
    function bus(pan) {
      var g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (p) { p.pan.value = pan || 0; g.connect(p); p.connect(out); p.connect(verb); } else { g.connect(out); g.connect(verb); }
      return g;
    }
    function noiseBurst(dest, t, dur, hz, q, gain) {
      var s = ctx.createBufferSource(); s.buffer = noise; s.playbackRate.value = 0.8 + rnd() * 0.4;
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hz; f.Q.value = q;
      var g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(dest); s.start(t, rnd() * 0.5); s.stop(t + dur + 0.02);
    }
    function freq(note, level) {
      var n = (note | 0) + (level | 0), sc = P.scale;
      var oct = Math.floor(n / sc.length), deg = ((n % sc.length) + sc.length) % sc.length;
      return P.base * Math.pow(2, (12 * oct + sc[deg]) / 12);
    }
    function tap(o) {
      if (!ctx) return; o = o || {};
      var t = ctx.currentTime + 0.005, f0 = freq(o.note || 0, Math.round((o.level || 0) / 2)), dest = bus(o.pan);
      var vel = 0.75 + rnd() * 0.25;
      P.modes.forEach(function (m, i) {
        var f = f0 * m[0] * (1 + (rnd() - 0.5) * 0.004); if (f > ctx.sampleRate * 0.45) return;
        var osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = f;
        var g = ctx.createGain(), dec = P.decay / Math.pow(m[0], 0.7);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(m[1] * 0.22 * vel, t + 0.0015); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
        osc.connect(g); g.connect(dest); osc.start(t); osc.stop(t + dec + 0.05);
      });
      if (P.click) noiseBurst(dest, t, 0.018, P.clickHz, 1.2, P.click * 0.3 * vel);
      if (P.rattle) for (var k = 0; k < 7; k++) noiseBurst(dest, t + 0.03 + k * 0.022 + rnd() * 0.02, 0.02, 2500 + rnd() * 2500, 3, P.rattle * 0.12 * (1 - k / 8));
    }
    function pass(dir) {
      if (!ctx) return;
      var t = ctx.currentTime + 0.005, dest = bus(0);
      var s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
      var a = dir > 0 ? P.air * 1.6 : P.air * 0.6, b = dir > 0 ? P.air * 0.6 : P.air * 1.6;
      f.frequency.setValueAtTime(a, t); f.frequency.exponentialRampToValueAtTime(b, t + 0.45);
      var g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + 0.6);
      var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(P.base / 8, t + 0.3); o.frequency.exponentialRampToValueAtTime(P.base / 11, t + 0.5);
      var og = ctx.createGain(); og.gain.setValueAtTime(0, t + 0.3); og.gain.linearRampToValueAtTime(0.12, t + 0.31); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(og); og.connect(dest); o.start(t + 0.3); o.stop(t + 0.65);
    }
    function heal() {
      if (!ctx) return;
      var t = ctx.currentTime + 0.01, dest = bus(0), f0 = P.base / 2;
      [[1, 1], [2.71, .4], [5.2, .16], [1.004, .5]].forEach(function (m) {
        var o = ctx.createOscillator(); o.frequency.value = f0 * m[0];
        var g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(m[1] * 0.07, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4 / Math.sqrt(m[0]));
        o.connect(g); g.connect(dest); o.start(t); o.stop(t + 2.6);
      });
    }
    return { wake: wake, tap: tap, pass: pass, heal: heal, preset: P, get context() { return ctx; } };
  }

  root.DrosteSound = { create: create, PRESETS: PRESETS };
})(typeof window !== 'undefined' ? window : globalThis);

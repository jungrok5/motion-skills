/* sound.js — synthesised sounds for sheet-city pages (Web Audio only; no samples, no network).
 *
 *   const snd = CitySound({ scale: [0, 2, 4, 7, 9], base: 220, timbre: 'marimba', level: 0.5 });
 *   snd.enable()            create / resume the context (call from a user gesture); snd.disable()
 *   snd.tick()              a key press in a cell        snd.tap()        a cell selected
 *   snd.grow(level, delay, up)  a building arrives at a new height; level 0..1 picks the note (taller = higher)
 *   snd.slide(level)        the slider moved (thinned so a drag is a calm run, not a buzz)
 *
 * Off until enable() is called from a gesture; the page shows a toggle. Per topic: the scale, the base pitch, the
 * timbre ('marimba' wooden bar, 'glass' struck glass, 'pluck' a soft string) and the room size.
 */
(function (root) {
  'use strict';
  function CitySound(o) {
    o = Object.assign({ scale: [0, 2, 4, 7, 9], base: 220, octaves: 2.6, timbre: 'marimba', level: 0.5, room: 0.35 }, o || {});
    var C = null, out = null, wet = null, on = false, voices = [], lastAt = 0, lastNote = -1, slideAt = 0, slideNote = -1, seed = 11;
    function rnd() { seed = (seed * 48271) % 2147483647; return seed / 2147483647; }
    var NOTES = Math.round(o.scale.length * o.octaves);
    function freq(n) { var oct = Math.floor(n / o.scale.length); return o.base * Math.pow(2, oct + o.scale[n % o.scale.length] / 12); }

    function build() {
      var A = root.AudioContext || root.webkitAudioContext; if (!A) return false;
      C = new A();
      // a small room: decaying filtered noise as the impulse (generated, seeded)
      var sr = C.sampleRate, len = Math.floor(sr * (0.25 + o.room)), ir = C.createBuffer(2, len, sr);
      for (var ch = 0; ch < 2; ch++) {
        var d = ir.getChannelData(ch), y = 0;
        for (var i = 0; i < len; i++) { var t = i / sr; y += 0.35 * ((rnd() * 2 - 1) - y); d[i] = y * Math.exp(-t / (0.06 + o.room * 0.2)) * (1 - Math.exp(-t / 0.004)); }
      }
      var conv = C.createConvolver(); conv.buffer = ir;
      var comp = C.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 8; comp.attack.value = 0.004; comp.release.value = 0.15;
      var hp = C.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 80;
      out = C.createGain(); out.gain.value = o.level;
      wet = C.createGain(); wet.gain.value = 0.28;
      out.connect(hp); hp.connect(comp); out.connect(conv); conv.connect(wet); wet.connect(comp); comp.connect(C.destination);
      return true;
    }
    // one partial: sine at f, peak a, attack, exponential decay to silence
    function partial(f, t, a, att, dec, dest) {
      var osc = C.createOscillator(), g = C.createGain();
      osc.frequency.value = f; g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(a, t + att);
      g.gain.exponentialRampToValueAtTime(Math.max(1e-4, a * 0.001), t + att + dec);
      g.gain.linearRampToValueAtTime(0, t + att + dec + 0.02);
      osc.connect(g); g.connect(dest || out); osc.start(t); osc.stop(t + att + dec + 0.05);
      return { osc: osc, g: g, end: t + att + dec + 0.05 };
    }
    // a struck note in the page's timbre
    function strike(f, t, a, up) {
      var v = [], lv = Math.min(1, Math.max(0, Math.log2(f / o.base) / o.octaves));
      var dec = 1.1 - 0.55 * lv;
      if (o.timbre === 'glass') {
        v.push(partial(f, t, a * 0.6, 0.003, dec * 1.4), partial(f * 2.76, t, a * 0.22, 0.002, dec * 0.5), partial(f * 5.4, t, a * 0.08, 0.001, dec * 0.22));
      } else if (o.timbre === 'pluck') {
        v.push(partial(f, t, a * 0.6, 0.006, dec * 0.9), partial(f * 2, t, a * 0.2, 0.004, dec * 0.35), partial(f * 3, t, a * 0.08, 0.003, dec * 0.18));
      } else {  // marimba: a wooden bar, the 4th harmonic dies fast
        v.push(partial(f, t, a * 0.62, 0.004, dec), partial(f * 4, t, a * 0.18, 0.002, dec * 0.18), partial(f * 10, t, a * 0.04, 0.001, 0.05));
      }
      // growing scoops up into the pitch, shrinking settles down into it
      v[0].osc.frequency.setValueAtTime(f * (up ? 0.985 : 1.015), t);
      v[0].osc.frequency.exponentialRampToValueAtTime(f, t + (up ? 0.03 : 0.07));
      voices = voices.concat(v).filter(function (x) { return x.end > C.currentTime; });
      while (voices.length > 24) { var old = voices.shift(); try { old.g.gain.cancelScheduledValues(C.currentTime); old.g.gain.setTargetAtTime(0, C.currentTime, 0.02); } catch (e) {} }
    }
    function note(level, delay, up, amp) {
      if (!on || !C) return;
      var n = Math.round(Math.max(0, Math.min(1, level)) * (NOTES - 1));
      var t = C.currentTime + 0.01 + Math.max(0, Math.min(0.8, delay || 0));
      if (n === lastNote && t < lastAt + 0.12) return;          // no machine-gun repeats
      if (t < lastAt + 0.035) t = lastAt + 0.035;                // a crowd becomes a quick roll
      if (t - C.currentTime > 1.2) return;
      lastAt = t; lastNote = n;
      strike(freq(n), t, amp || 0.3, up);
    }
    var api = {
      get on() { return on; },
      enable: function () { try { if (!C && !build()) return false; if (C.state === 'suspended') C.resume(); on = true; } catch (e) { on = false; } return on; },
      disable: function () { on = false; if (C && C.state === 'running') C.suspend(); },
      tick: function () { if (!on || !C) return; var t = C.currentTime + 0.003; partial(1800 + rnd() * 500, t, 0.05, 0.001, 0.035); partial(320, t, 0.04, 0.001, 0.05); },
      tap: function () { if (!on || !C) return; var t = C.currentTime + 0.003; partial(o.base * 2, t, 0.06, 0.002, 0.09); partial(o.base * 6.1, t, 0.02, 0.001, 0.03); },
      grow: function (level, delay, up) { note(level, delay, up, 0.3); },
      slide: function (level) {
        if (!on || !C) return;
        var now = C.currentTime, n = Math.round(Math.max(0, Math.min(1, level)) * (NOTES - 1));
        if (now - slideAt < 0.07 || (n === slideNote && now - slideAt < 0.3)) return;
        slideAt = now; slideNote = n; strike(freq(n), now + 0.005, 0.14, true);
      }
    };
    return api;
  }
  root.CitySound = CitySound;
})(typeof window !== 'undefined' ? window : globalThis);

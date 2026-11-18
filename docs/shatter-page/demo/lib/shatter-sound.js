/* shatter-sound.js — every sound of a shatter page, synthesised: no samples, nothing loaded.
 * Modal synthesis (decaying sines from a two-pole recurrence) plus shaped noise, rendered into AudioBuffers in plain JS
 * once, the first time sound is switched on, and played with small variations of rate, gain and pan.
 *
 *   var snd = ShatterSound.create(material.sound)   // { pitch, ring, crunch, body } — designed per material
 *   snd.unlock(); snd.setOn(true)                    // only after a user gesture; off until the visitor turns it on
 *   snd.shatter({strength, pieces, pan}) · snd.clink({size, speed}) · snd.thump() · snd.tick() · snd.grain()
 *   snd.rewind(true|false) · snd.mend()
 *   ShatterSound.test(params) → { peak, rms, finite } of every buffer (used by scripts/check.mjs)
 * pitch scales every mode (glass 1, ice ~.55, porcelain ~.6), ring the decay of the modes (how long it sings), crunch
 * the amount of noise grit, body the low knock of a thick material.
 */
(function (root) {
  'use strict';
  function rng(seed) { var s = seed >>> 0; return function () { s += 0x6D2B79F5; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

  // a decaying sine that starts at zero phase (no click); t60 in seconds, att = soft onset in seconds
  function mode(buf, sr, start, f, t60, amp, att) {
    if (f >= sr * 0.45) return;
    var w = 2 * Math.PI * f / sr, r = Math.pow(0.001, 1 / Math.max(1, t60 * sr)), c = 2 * r * Math.cos(w), y1 = 0, y2 = amp * Math.sin(w);
    var n0 = Math.floor(start * sr), n1 = Math.min(buf.length, n0 + Math.ceil(t60 * sr)), a = (att || 0) * sr;
    for (var n = n0 + 1; n < n1; n++) { var y = c * y1 - r * r * y2; y2 = y1; y1 = y; var k = n - n0; buf[n] += a > 0 && k < a * 4 ? y * (1 - Math.exp(-k / a)) : y; }
  }
  // band-limited noise burst: one-pole low-pass then a differencer (bright grit), exponential envelope tau
  function noise(buf, sr, start, dur, amp, tau, lp, R) {
    var n0 = Math.floor(start * sr), n1 = Math.min(buf.length, n0 + Math.floor(dur * sr)), z = 0, prev = 0, a = clamp(lp || 0.5, 0.02, 1);
    for (var n = n0; n < n1; n++) { z += a * ((R() * 2 - 1) - z); var d = z - prev; prev = z; buf[n] += d * amp * Math.exp(-(n - n0) / (tau * sr)); }
  }
  function normalise(buf, peak) { var m = 0, i; for (i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i])); if (m > 0) for (i = 0; i < buf.length; i++) buf[i] *= peak / m; var f = Math.min(buf.length, 256); for (i = 0; i < f; i++) buf[buf.length - 1 - i] *= i / f; return buf; }

  // the renders: each returns a Float32Array at sample rate sr
  function renderShatter(sr, p, R) {
    var b = new Float32Array(Math.floor(sr * (0.6 + 1.2 * p.ring))), i;
    noise(b, sr, 0, 0.012, 1.0, 0.0025, 0.95, R);                                   // the snap
    noise(b, sr, 0.004, 0.25, 0.35 * p.crunch, 0.05, 0.6, R);                       // fracture hiss
    for (i = 0; i < 4; i++) mode(b, sr, 0, (90 + 60 * i) * (0.6 + 0.6 * p.body) * (1 + 0.3 * R()), 0.08 + 0.1 * p.body, 0.5 * p.body, 0.0008);   // the knock
    for (i = 0; i < 46; i++) {                                                       // the spray of pieces, each one a plate ringing
      var at = 0.003 + Math.pow(R(), 1.8) * 0.5, f = (1400 + 7600 * Math.pow(R(), 1.4)) * p.pitch, t60 = (0.04 + 0.5 * R() * R()) * p.ring + 0.02;
      mode(b, sr, at, f, t60, 0.12 + 0.2 * R(), 0.0003); if (R() < 0.6) mode(b, sr, at, f * (2.31 + 0.5 * R()), t60 * 0.6, 0.08, 0.0003);
      noise(b, sr, at, 0.006, 0.18 * p.crunch, 0.0015, 0.9, R);
    }
    for (i = 0; i < 30 * p.crunch; i++) noise(b, sr, 0.05 + R() * 0.7, 0.004, 0.08 + 0.12 * R(), 0.001, 0.8, R);   // grit settling
    return normalise(b, 0.9);
  }
  function renderClink(sr, p, R, size) {
    var b = new Float32Array(Math.floor(sr * (0.2 + 0.5 * p.ring))), f0 = (2600 + 2400 * R()) * p.pitch / (0.7 + size * 3);
    noise(b, sr, 0, 0.004, 0.5 * (0.4 + p.crunch), 0.0008, 0.9, R);
    for (var i = 0; i < 4; i++) mode(b, sr, 0, f0 * [1, 1.59 + 0.2 * R(), 2.71 + 0.3 * R(), 4.2 + 0.4 * R()][i], (0.05 + 0.25 * R()) * p.ring + 0.015, [1, 0.6, 0.35, 0.2][i], 0.0002);
    if (R() < 0.5) { mode(b, sr, 0.04 + 0.05 * R(), f0 * 1.02, 0.08 * p.ring + 0.02, 0.35, 0.0002); noise(b, sr, 0.045, 0.003, 0.3, 0.0008, 0.9, R); }   // it rocks and taps again
    return normalise(b, 0.8);
  }
  function renderThump(sr, R) {
    var b = new Float32Array(Math.floor(sr * 0.25));
    for (var n = 0; n < b.length; n++) { var t = n / sr, f = 140 - 60 * Math.min(1, t / 0.05); b[n] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.035); }
    noise(b, sr, 0, 0.01, 0.4, 0.002, 0.3, R);
    return normalise(b, 0.8);
  }
  function renderTick(sr, p, R) { var b = new Float32Array(Math.floor(sr * 0.25)); noise(b, sr, 0, 0.004, 0.6, 0.001, 0.9, R); mode(b, sr, 0, 1900 * p.pitch, 0.12 * p.ring + 0.03, 0.4, 0.0002); return normalise(b, 0.6); }
  function renderGrain(sr, p, R) { var b = new Float32Array(Math.floor(sr * 0.09)); mode(b, sr, 0, (3000 + 2000 * R()) * p.pitch, 0.07, 0.6, 0.004); return normalise(b, 0.4); }
  function renderMend(sr, p, R) {
    var b = new Float32Array(Math.floor(sr * 1.4));
    noise(b, sr, 0, 0.004, 0.3, 0.0008, 0.9, R);
    mode(b, sr, 0, 2480 * p.pitch, 0.9, 1, 0.001); mode(b, sr, 0, 2480 * 2.76 * p.pitch, 0.45, 0.35, 0.001); mode(b, sr, 0, 330 * (0.6 + 0.6 * p.body), 0.1, 0.5, 0.002);
    return normalise(b, 0.7);
  }
  // time running backwards: the spray reversed, swelling into the moment of the break
  function renderRewind(sr, p, R) {
    var a = renderShatter(sr, p, R), b = new Float32Array(Math.floor(sr * 1.6)), n = Math.min(a.length, b.length);
    for (var i = 0; i < n; i++) b[b.length - 1 - i] = a[i] * (0.4 + 0.6 * i / n);
    return normalise(b, 0.6);
  }
  function params(p) { p = p || {}; return { pitch: p.pitch || 1, ring: p.ring === undefined ? 1 : p.ring, crunch: p.crunch === undefined ? 0.5 : p.crunch, body: p.body === undefined ? 0.3 : p.body }; }

  function create(p0) {
    var p = params(p0), ctx = null, master = null, B = null, R = rng(91), on = false, lastClink = 0, voices = 0, rew = null;
    function build() {
      var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return false;
      ctx = new AC(); var sr = ctx.sampleRate;
      function buf(data) { var x = ctx.createBuffer(1, data.length, sr); x.getChannelData(0).set(data); return x; }
      B = { shatter: [buf(renderShatter(sr, p, R)), buf(renderShatter(sr, p, R))], clink: [], thump: buf(renderThump(sr, R)), tick: buf(renderTick(sr, p, R)),
        grain: buf(renderGrain(sr, p, R)), mend: buf(renderMend(sr, p, R)), rewind: buf(renderRewind(sr, p, R)) };
      for (var i = 0; i < 6; i++) B.clink.push(buf(renderClink(sr, p, R, i / 5)));
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
      master = ctx.createGain(); master.gain.value = on ? 0.8 : 0; master.connect(comp); comp.connect(ctx.destination);
      return true;
    }
    function play(b, gain, rate, pan) {
      if (!ctx || !on || voices > 24) return null;
      var s = ctx.createBufferSource(), g = ctx.createGain(), pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      s.buffer = b; s.playbackRate.value = rate || 1; g.gain.value = gain;
      s.connect(g); if (pn) { pn.pan.value = clamp(pan || 0, -1, 1); g.connect(pn); pn.connect(master); } else g.connect(master);
      voices++; s.onended = function () { voices--; }; s.start(); return { s: s, g: g };
    }
    var api = {
      get on() { return on; },
      unlock: function () { try { if (!ctx) build(); if (ctx && ctx.state === 'suspended') ctx.resume(); } catch (e) {} },
      setOn: function (b) { on = !!b; if (!ctx && on) api.unlock(); if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.02); },
      shatter: function (o) { if (!B) return; play(B.shatter[R() < 0.5 ? 0 : 1], 0.35 + 0.6 * clamp(o.strength || 0.8, 0, 1), 0.92 + 0.16 * R(), o.pan); },
      clink: function (o) {
        if (!B || !ctx) return; var now = ctx.currentTime; if (now - lastClink < 0.018) return; lastClink = now;
        var sz = clamp((o.size || 0.1) / 0.3, 0, 1), g = clamp((o.speed || 1) / 3, 0.08, 1) * 0.5;
        play(B.clink[Math.min(5, Math.floor(sz * 6))], g, 0.9 + 0.25 * R(), (R() - 0.5) * 1.2);
      },
      thump: function () { if (B) play(B.thump, 0.5, 0.9 + 0.2 * R(), 0); },
      tick: function () { if (B) play(B.tick, 0.5, 1, 0); },
      grain: function () { if (B && ctx && ctx.currentTime - lastClink > 0.05) { lastClink = ctx.currentTime; play(B.grain, 0.12, 0.8 + 0.5 * R(), (R() - 0.5)); } },
      rewind: function (start) { if (!B) return; if (start) { if (rew) rew.s.stop(); rew = play(B.rewind, 0.5, 1, 0); } else if (rew) { try { rew.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); } catch (e) {} rew = null; } },
      mend: function () { if (B) play(B.mend, 0.45, 1, 0); }
    };
    return api;
  }
  // renders every buffer at 44.1 kHz and reports levels (no audio device needed)
  function test(p0) {
    var p = params(p0), R = rng(5), sr = 44100, all = [renderShatter(sr, p, R), renderClink(sr, p, R, 0), renderClink(sr, p, R, 1), renderThump(sr, R), renderTick(sr, p, R), renderGrain(sr, p, R), renderMend(sr, p, R), renderRewind(sr, p, R)];
    var peak = 0, sq = 0, n = 0, finite = true;
    all.forEach(function (b) { for (var i = 0; i < b.length; i++) { var x = b[i]; if (!isFinite(x)) finite = false; peak = Math.max(peak, Math.abs(x)); sq += x * x; n++; } });
    return { peak: +peak.toFixed(3), rms: +Math.sqrt(sq / n).toFixed(4), finite: finite, buffers: all.length };
  }
  root.ShatterSound = { create: create, test: test };
})(typeof window !== 'undefined' ? window : globalThis);

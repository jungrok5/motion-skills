// sprite-stack-short · score.js — window.SSScore: a small chiptune score resolved from the film (one tune in the brief's
// key and tempo, softer under the explainer beats, drums in the world), the beat sounds (a pop per view drawn, a blip per
// slice placed — rising up the scale, a click chord when the stack closes, a whoosh for the turn, a sparkle for each shard
// transition, a last chord on the title) and the mover's engine following its speed table. Rendered sample by sample.
(function () {
  'use strict';
  const MAJ = [0, 2, 4, 5, 7, 9, 11], PENTA = [0, 2, 4, 7, 9];
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const deg = (root, d, scale = MAJ) => { const i = d - 1, o = Math.floor(i / scale.length); return root + scale[((i % scale.length) + scale.length) % scale.length] + 12 * o; };

  // arrange: film → { notes, sfx, engine, dur }
  function arrange(F, o) {
    const bpm = o.bpm || 116, root = o.key == null ? 62 : o.key, beat = 60 / bpm, notes = [], sfx = [];
    const melody = (o.melody || '1 3 5 6 5 3 2 . 1 2 3 5 3 2 1 .').split(/\s+/).filter(Boolean);
    const chords = (o.chords || '1 6 4 5').split(/\s+/).map(Number);
    const isWorld = t => { const b = F.beatAt(t); return b.kind === 'world' || (b.kind === 'title' && b.over !== 'paper'); };
    const lv = o.level || 1;
    // the tune: eighth notes of the melody, bass on the chord root, hats + kick only in world beats
    const e8 = beat / 2;
    for (let k = 0, t = 0; t < F.dur; k++, t = k * e8) {
      const m = melody[k % melody.length], w = isWorld(t), bar = Math.floor(k / 8), ch = chords[bar % chords.length];
      if (m !== '.' && m !== '-') notes.push({ t, d: e8 * .9, f: midi(deg(root + 12, +m)), v: (w ? .085 : .05) * lv, wave: 'sq25', pan: -.15 });
      if (k % 2 === 0) notes.push({ t, d: e8 * 1.6, f: midi(deg(root - 12, ch)), v: (w ? .14 : .09) * lv, wave: 'tri', pan: 0 });
      if (k % 8 === 4) notes.push({ t, d: e8 * 1.2, f: midi(deg(root - 12, ch) + 7), v: (w ? .1 : .06) * lv, wave: 'tri', pan: 0 });
      if (w && k % 2 === 1) sfx.push({ t, kind: 'hat', v: .05 * lv });
      if (w && k % 4 === 0) sfx.push({ t, kind: 'kick', v: .22 * lv });
      if (w && k % 8 === 6) sfx.push({ t, kind: 'snare', v: .08 * lv });
    }
    // beat sounds
    for (const b of F.beats) {
      const s = b.start, M = b.model || F.hero;
      if (b.in === 'tiles' && b.i > 0) for (let j = 0; j < 6; j++) sfx.push({ t: s + j * .06, kind: 'blip', f: midi(root + 36 - PENTA[j % 5] - 12 * Math.floor(j / 5)), v: .05, d: .07 });
      if (b.kind === 'views') { const dv = Math.min(.9, b.dur * .14); for (let i = 0; i < 4; i++) { const s0 = s + Math.max(0, (i ? b.dur * .1 : -dv * .35) + i * (b.dur * .62 - dv) / 3); sfx.push({ t: s0, kind: 'pop', f: midi(deg(root + 12, [1, 3, 5, 8][i])), v: .1 }); sfx.push({ t: s0, kind: 'scratch', d: dv, v: .03 }); } }
      if (b.kind === 'slices') for (let z = 0; z < M.H; z++) { const t = s + b.dur * .08 + (z / M.H) * b.dur * .74; sfx.push({ t, kind: 'blip', f: midi(deg(root + 12, 1 + z % 10, MAJ) + (z >= 10 ? 0 : 0)), v: .07, d: .06 }); }
      if (b.kind === 'stack') { const t = s + b.dur * .45; [1, 3, 5, 8].forEach((d, i) => sfx.push({ t: t + i * .045, kind: 'blip', f: midi(deg(root + 12, d)), v: .07, d: .22 })); sfx.push({ t, kind: 'click', v: .12 }); }
      if (b.kind === 'turn') sfx.push({ t: s + b.dur * .15, kind: 'whoosh', d: b.dur * .6, v: .07 });
      if (b.kind === 'title') [1, 3, 5, 8].forEach((d, i) => notes.push({ t: s + .1 + i * .03, d: Math.max(.6, b.dur - .3), f: midi(deg(root, d)), v: .06, wave: 'sq50', pan: (i - 1.5) * .2 }));
    }
    // engine: control points at 50 Hz (gain follows world beats, pitch / rate follow the speed table)
    let engine = null; const W = F.world, kind = o.engine || (W && W.spec.mover && W.spec.mover.engine) || 'none';
    if (W && W.T && kind !== 'none') {
      const pts = [], cruise = W.T.mv.speed || 40; let g = 0;
      for (let t = 0; t <= F.dur; t += .02) { const want = isWorld(t) ? 1 : .0; g += (want - g) * .12; const v = W.T.at(t).v; pts.push([g, v / cruise]); }
      engine = { kind, pts, hz: 50, v: (o.engineLevel || 1) * .12 };
    }
    return { notes, sfx, engine, dur: F.dur };
  }

  // ---------- the synth ----------
  function render(spec, sr, dur) {
    const n = Math.ceil(dur * sr), L = new Float32Array(n), R = new Float32Array(n), rv = new Float32Array(n);
    let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };
    const add = (i, v, pan = 0, send = .25) => { if (i < 0 || i >= n) return; L[i] += v * (1 - pan) * .7; R[i] += v * (1 + pan) * .7; rv[i] += v * send; };
    const osc = (wave, ph) => { const p = ph - Math.floor(ph); switch (wave) { case 'sq25': return p < .25 ? 1 : -1; case 'sq12': return p < .125 ? 1 : -1; case 'sq50': return p < .5 ? 1 : -1; case 'tri': return 4 * Math.abs(p - .5) - 1; case 'saw': return 2 * p - 1; default: return Math.sin(2 * Math.PI * p); } };
    for (const nt of spec.notes) {
      const i0 = Math.floor(nt.t * sr), len = Math.floor((nt.d + .08) * sr), at = .005 * sr, rel = .06 * sr, dl = Math.floor(nt.d * sr);
      let ph = 0, lp = 0;
      for (let k = 0; k < len; k++) {
        const env = k < at ? k / at : k < dl ? 1 - .35 * (k / dl) : Math.max(0, (1 - .35) * (1 - (k - dl) / rel));
        ph += nt.f / sr; let s = osc(nt.wave, ph); lp += (s - lp) * .35; s = lp;
        add(i0 + k, s * env * nt.v, nt.pan || 0, .3);
      }
    }
    for (const e of spec.sfx) {
      const i0 = Math.floor(e.t * sr);
      if (e.kind === 'hat') { let hp = 0, pr = 0; for (let k = 0; k < .05 * sr; k++) { const x = rnd(); hp = .7 * (hp + x - pr); pr = x; add(i0 + k, hp * Math.exp(-k / (.012 * sr)) * e.v, .25, .1); } }
      else if (e.kind === 'kick') { let ph = 0; for (let k = 0; k < .22 * sr; k++) { const f = 50 + 110 * Math.exp(-k / (.025 * sr)); ph += f / sr; add(i0 + k, Math.sin(2 * Math.PI * ph) * Math.exp(-k / (.07 * sr)) * e.v, 0, .05); } }
      else if (e.kind === 'snare') { let lp = 0; for (let k = 0; k < .15 * sr; k++) { lp += (rnd() - lp) * .5; add(i0 + k, (lp * .8 + Math.sin(k / sr * 2 * Math.PI * 190) * .3) * Math.exp(-k / (.04 * sr)) * e.v, -.1, .2); } }
      else if (e.kind === 'blip' || e.kind === 'pop') { let ph = 0; const d = (e.d || .09) * sr; for (let k = 0; k < d + .05 * sr; k++) { const f = e.kind === 'pop' ? e.f * (1 + .5 * Math.exp(-k / (.01 * sr))) : e.f; ph += f / sr; const env = Math.min(1, k / (.002 * sr)) * Math.exp(-k / (d * .45)); add(i0 + k, osc(e.kind === 'pop' ? 'sq50' : 'sq25', ph) * env * e.v, .2, .35); } }
      else if (e.kind === 'click') { for (let k = 0; k < .03 * sr; k++) add(i0 + k, rnd() * Math.exp(-k / (.004 * sr)) * e.v, 0, .2); }
      else if (e.kind === 'scratch') { let bp = 0, lp = 0; for (let k = 0; k < e.d * sr; k++) { const x = rnd(); lp += (x - lp) * .3; bp = x - lp; const g = .6 + .4 * Math.sin(k / sr * 2 * Math.PI * 9); add(i0 + k, bp * g * e.v * Math.min(1, k / (.02 * sr)) * Math.min(1, (e.d * sr - k) / (.05 * sr)), -.2, .05); } }
      else if (e.kind === 'whoosh') { let lp = 0, lp2 = 0; const D = e.d * sr; for (let k = 0; k < D; k++) { const p = k / D, c = .02 + .25 * Math.sin(Math.PI * p); lp += (rnd() - lp) * c; lp2 += (lp - lp2) * c; add(i0 + k, (lp - lp2) * Math.sin(Math.PI * p) * e.v * 3, Math.sin(p * 6) * .4, .3); } }
    }
    if (spec.engine) {
      const E = spec.engine, pts = E.pts; let ph = 0, ph2 = 0, lp = 0, thump = 0, tph = 0;
      for (let i = 0; i < n; i++) {
        const f = Math.min(pts.length - 1.001, i / sr * E.hz), j = Math.floor(f), u = f - j, g = pts[j][0] + (pts[j + 1][0] - pts[j][0]) * u, v = pts[j][1] + (pts[j + 1][1] - pts[j][1]) * u;
        if (g < .002) continue;
        let s;
        if (E.kind === 'diesel') { const rate = 7 + v * 13; tph += rate / sr; if (tph >= 1) { tph -= 1; thump = 1; } thump *= Math.exp(-1 / (.03 * sr)); ph += (48 + v * 20) / sr; s = Math.sin(2 * Math.PI * ph) * thump * 1.2 + osc('saw', ph * 2) * .15; }
        else if (E.kind === 'electric') { ph += (220 + v * 380) / sr; ph2 += (221.5 + v * 383) / sr; s = (Math.sin(2 * Math.PI * ph) + Math.sin(2 * Math.PI * ph2)) * .3; }
        else { ph += (62 + v * 120) / sr; ph2 += (62.7 + v * 121) / sr; s = (osc('saw', ph) + osc('saw', ph2)) * .5; }
        lp += (s - lp) * (.05 + v * .08);
        add(i, lp * g * E.v * (.5 + v * .5), 0, .05);
      }
    }
    // a small room: four combs and two allpasses on the send
    const comb = [1557, 1617, 1491, 1422].map(d => Math.round(d * sr / 44100)), ap = [225, 556].map(d => Math.round(d * sr / 44100)), wet = new Float32Array(n);
    for (const d of comb) { const buf = new Float32Array(d); let p = 0, f = 0; for (let i = 0; i < n; i++) { const y = buf[p]; f = y * .8 + f * .2; buf[p] = rv[i] + f * .78; p = (p + 1) % d; wet[i] += y * .25; } }
    for (const d of ap) { const buf = new Float32Array(d); let p = 0; for (let i = 0; i < n; i++) { const b = buf[p], y = -wet[i] + b; buf[p] = wet[i] + b * .5; p = (p + 1) % d; wet[i] = y; } }
    let peak = 0; for (let i = 0; i < n; i++) { L[i] += wet[i] * .35; R[i] += wet[i] * .35; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
    const g = peak > 1e-6 ? .8 / peak : 1, fo = Math.floor(.4 * sr);
    for (let i = 0; i < n; i++) { const k = i > n - fo ? (n - i) / fo : 1; L[i] = Math.tanh(L[i] * g * 1.05) * k; R[i] = Math.tanh(R[i] * g * 1.05) * k; }
    return [L, R];
  }
  // 16-bit stereo WAV as base64 (for score.mjs)
  function wav(spec, sr, dur) {
    const [L, R] = render(spec, sr, dur), n = L.length, buf = new DataView(new ArrayBuffer(44 + n * 4)), w = (o, s) => { for (let i = 0; i < s.length; i++) buf.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); buf.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); buf.setUint32(16, 16, true); buf.setUint16(20, 1, true); buf.setUint16(22, 2, true);
    buf.setUint32(24, sr, true); buf.setUint32(28, sr * 4, true); buf.setUint16(32, 4, true); buf.setUint16(34, 16, true); w(36, 'data'); buf.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { buf.setInt16(44 + i * 4, Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), true); buf.setInt16(46 + i * 4, Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), true); }
    const u8 = new Uint8Array(buf.buffer); let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
    return btoa(s);
  }
  window.SSScore = { arrange, render, wav, midi, deg };
})();

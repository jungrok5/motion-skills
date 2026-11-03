// holo-pass · music.js — four original loops synthesised with Web Audio (no audio files). The same scheduler plays
// live (HP.music.play) and renders offline for the MP4 (HP.music.render → AudioBuffer, HP.music.wav → WAV bytes).
//   bells  Christmas: music-box bells, sleigh jingles, pizzicato bass          112 bpm
//   koto   New Year: plucked yo-scale melody over a drone and taiko             84 bpm
//   cafe   date night / events: lo-fi electric piano, brushed beat, walking bass 80 bpm
//   party  home party / birthday: four-on-the-floor, octave bass, bell hook     118 bpm
(function () {
  const HP = (window.HP = window.HP || {});
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = s => { const m = /^([A-G])([#b]?)(\d)$/.exec(s); return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // "E5 G5 - A5 . ..." in eighths: note, '-' holds the previous note, '.' rests
  const line = (bars, inst, vel = 0.6, step = 0.5) => { const ev = []; bars.forEach((bar, b) => { let last = null; bar.split(/\s+/).forEach((tok, i) => { const t = b * 4 + i * step; if (tok === '-') { if (last) last.dur += step; return; } if (tok === '.') { last = null; return; } last = { t, dur: step, inst, m: midi(tok), vel }; ev.push(last); }); }); return ev; };
  const chordsOf = names => names.map(n => n.split(' ').map(midi));

  const TRACKS = {
    bells: { name: 'Snow Globe', bpm: 112, bars: 8, build() {
      const ch = chordsOf(['C4 E4 G4', 'A3 C4 E4', 'F3 A3 C4', 'G3 B3 D4', 'C4 E4 G4', 'A3 C4 E4', 'D4 F4 A4', 'G3 B3 D4']); const ev = [];
      ev.push(...line(['E5 G5 G5 A5 G5 - E5 -', 'C5 E5 E5 G5 A5 - - -', 'A5 C6 A5 G5 F5 - A5 -', 'G5 - D5 E5 G5 - - -', 'E5 G5 C6 B5 C6 - G5 -', 'A5 G5 E5 G5 A5 - C6 -', 'D6 C6 A5 F5 E5 - D5 -', 'D5 E5 F5 B4 C5 - - -'], 'bell', 0.5));
      ch.forEach((c, b) => { c.forEach(m => ev.push({ t: b * 4, dur: 4, inst: 'pad', m, vel: 0.22 })); ev.push({ t: b * 4, dur: 1, inst: 'bass', m: c[0] - 12, vel: 0.6 }, { t: b * 4 + 2, dur: 1, inst: 'bass', m: c[2] - 24, vel: 0.5 }); for (let i = 0; i < 8; i++) ev.push({ t: b * 4 + i * 0.5, dur: 0.2, inst: 'jingle', vel: i % 2 ? 0.25 : 0.45 }); });
      return ev; } },
    koto: { name: 'First Light', bpm: 84, bars: 8, build() {
      const ev = line(['D5 E5 G5 A5 B5 - A5 -', 'G5 A5 E5 - D5 - - -', 'A5 B5 D6 - B5 A5 G5 -', 'E5 G5 A5 - - - - -', 'D6 B5 A5 G5 A5 - B5 -', 'G5 E5 D5 E5 G5 - - -', 'A5 G5 E5 G5 A5 B5 A5 G5', 'E5 - D5 - - - - -'], 'pluck', 0.55);
      for (let b = 0; b < 8; b++) { ['D4', 'A4', 'D5', 'A4'].forEach((n, i) => ev.push({ t: b * 4 + i, dur: 1, inst: 'pluck', m: midi(n) - (b % 4 === 3 ? 2 : 0), vel: 0.28 })); ev.push({ t: b * 4, dur: 4, inst: 'pad', m: midi('D3'), vel: 0.2 }, { t: b * 4, dur: 4, inst: 'pad', m: midi('A3'), vel: 0.16 }); ev.push({ t: b * 4, dur: 1, inst: 'taiko', vel: 0.8 }, { t: b * 4 + 2.5, dur: 1, inst: 'taiko', vel: 0.45 }); if (b % 2) ev.push({ t: b * 4 + 3, dur: 1, inst: 'taiko', vel: 0.55 }); for (let i = 0; i < 4; i++) ev.push({ t: b * 4 + i + 0.5, dur: 0.2, inst: 'shaker', vel: 0.25 }); }
      return ev; } },
    cafe: { name: 'Two Cups', bpm: 80, bars: 8, build() {
      const ch = chordsOf(['F3 A3 C4 E4', 'E3 G3 B3 D4', 'D3 F3 A3 C4', 'C3 E3 G3 B3', 'F3 A3 C4 E4', 'E3 G3 B3 D4', 'D3 F3 A3 C4', 'G3 B3 D4 F4']); const ev = [];
      ev.push(...line(['. . E5 F5 G5 - E5 -', 'D5 - - - B4 - D5 -', 'C5 - A4 - F5 - E5 D5', 'E5 - - - - - - -', '. . A5 G5 E5 - C5 -', 'D5 - E5 - G5 - - -', 'F5 E5 D5 - A4 - C5 -', 'B4 - C5 - - - - -'], 'vibes', 0.4));
      const sw = 0.08;
      ch.forEach((c, b) => { const o = b * 4; c.forEach(m => ev.push({ t: o, dur: 1.4, inst: 'keys', m, vel: 0.32 }, { t: o + 2.5 + sw, dur: 1.2, inst: 'keys', m, vel: 0.24 })); ev.push({ t: o, dur: 1.2, inst: 'bass', m: c[0] - 12, vel: 0.65 }, { t: o + 1.5 + sw, dur: 0.5, inst: 'bass', m: c[0] - 12, vel: 0.4 }, { t: o + 2.5 + sw, dur: 1.2, inst: 'bass', m: c[2] - 12, vel: 0.55 });
        ev.push({ t: o, inst: 'kick', vel: 0.7 }, { t: o + 2.5 + sw, inst: 'kick', vel: 0.5 }, { t: o + 1, inst: 'snare', vel: 0.35 }, { t: o + 3, inst: 'snare', vel: 0.4 }); for (let i = 0; i < 8; i++) ev.push({ t: o + i * 0.5 + (i % 2 ? sw : 0), inst: 'hat', vel: i % 2 ? 0.16 : 0.22 }); });
      return ev; } },
    party: { name: 'Confetti', bpm: 118, bars: 8, build() {
      const ch = chordsOf(['A3 C4 E4', 'F3 A3 C4', 'C4 E4 G4', 'G3 B3 D4', 'A3 C4 E4', 'F3 A3 C4', 'C4 E4 G4', 'G3 B3 D4']); const ev = [];
      ev.push(...line(['A5 - C6 - E6 - C6 -', 'A5 - F5 - A5 C6 - -', 'G5 - E5 - G5 - C6 -', 'B5 - D6 - B5 - G5 -', 'E6 - D6 C6 - A5 - -', 'C6 - A5 - F5 - A5 -', 'G5 E5 G5 - C6 - E6 -', 'D6 - B5 - G5 - - -'], 'bell', 0.42));
      ch.forEach((c, b) => { const o = b * 4; for (let i = 0; i < 4; i++) { ev.push({ t: o + i, inst: 'kick', vel: 0.8 }, { t: o + i + 0.5, inst: 'hat', vel: 0.3 }); c.forEach(m => ev.push({ t: o + i + 0.5, dur: 0.25, inst: 'keys', m: m + 12, vel: 0.16 })); } ev.push({ t: o + 1, inst: 'clap', vel: 0.5 }, { t: o + 3, inst: 'clap', vel: 0.5 }); for (let i = 0; i < 8; i++) ev.push({ t: o + i * 0.5, dur: 0.4, inst: 'bass', m: c[0] - (i % 2 ? 12 : 24), vel: 0.55 }); });
      return ev; } },
  };
  for (const k in TRACKS) TRACKS[k].id = k;
  HP.TRACKS = TRACKS;
  const HELP = { line, midi, chords: chordsOf };
  // a track composed for one topic: HP.addTrack('march', { name, bpm, bars: 8, build({ line, midi, chords }) { return events } })
  HP.addTrack = (id, def) => { TRACKS[id] = { ...def, id }; return TRACKS[id]; };

  // ---------- instruments ----------
  function kit(ctx) {
    if (ctx.__hp) return ctx.__hp;
    const r = HP.rng(99), len = ctx.sampleRate * 1.5, nb = ctx.createBuffer(1, len, ctx.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = r() * 2 - 1;
    const ir = ctx.createBuffer(2, ctx.sampleRate * 2.2, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const x = ir.getChannelData(ch); for (let i = 0; i < x.length; i++) x[i] = (r() * 2 - 1) * Math.pow(1 - i / x.length, 3.2); }
    const master = ctx.createGain(); master.gain.value = 0.0001;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
    const verb = ctx.createConvolver(); verb.buffer = ir; const send = ctx.createGain(); send.gain.value = 0.22;
    const dry = ctx.createGain(); dry.gain.value = 1;
    dry.connect(comp); send.connect(verb); verb.connect(comp); comp.connect(master); master.connect(ctx.destination);
    return (ctx.__hp = { noise: nb, master, dry, send });
  }
  function env(g, t, a, peak, dec, end) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); return t + a + dec + (end || 0.05); }
  function out(k, node, wet = 1) { node.connect(k.dry); const s = node.context.createGain(); s.gain.value = wet; node.connect(s); s.connect(k.send); }
  function osc(ctx, type, f, t, stop) { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(stop); return o; }
  function noise(ctx, k, t, stop, type, f, Q = 1) { const s = ctx.createBufferSource(); s.buffer = k.noise; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = Q; s.connect(fl); s.start(t, (t * 7.31) % 1); s.stop(stop); return fl; }
  const VOICE = {
    bell(ctx, k, t, e) { const f = hz(e.m), g = ctx.createGain(), stop = env(g, t, 0.004, e.vel * 0.35, 1.8); const c = osc(ctx, 'sine', f, t, stop), m = osc(ctx, 'sine', f * 3.5, t, stop), mg = ctx.createGain(); mg.gain.setValueAtTime(f * 1.6 * e.vel, t); mg.gain.exponentialRampToValueAtTime(1, t + 0.5); m.connect(mg); mg.connect(c.frequency); c.connect(g); const p = osc(ctx, 'sine', f * 2, t, stop), pg = ctx.createGain(); pg.gain.value = 0.18; p.connect(pg); pg.connect(g); out(k, g, 1.2); },
    vibes(ctx, k, t, e) { const f = hz(e.m), g = ctx.createGain(), stop = env(g, t, 0.006, e.vel * 0.3, 1.3); const c = osc(ctx, 'sine', f, t, stop), m = osc(ctx, 'sine', f * 4, t, stop), mg = ctx.createGain(); mg.gain.setValueAtTime(f * 0.6, t); mg.gain.exponentialRampToValueAtTime(1, t + 0.25); m.connect(mg); mg.connect(c.frequency); const trem = osc(ctx, 'sine', 5.5, t, stop), tg = ctx.createGain(); tg.gain.value = 0.25; trem.connect(tg); const vg = ctx.createGain(); vg.gain.value = 0.75; tg.connect(vg.gain); c.connect(vg); vg.connect(g); out(k, g, 1.4); },
    pluck(ctx, k, t, e) { const f = hz(e.m), g = ctx.createGain(), stop = env(g, t, 0.003, e.vel * 0.4, 1.4); const o = osc(ctx, 'sawtooth', f * 1.015, t, stop); o.frequency.exponentialRampToValueAtTime(f, t + 0.06); const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 3; fl.frequency.setValueAtTime(5200, t); fl.frequency.exponentialRampToValueAtTime(500, t + 0.35); o.connect(fl); fl.connect(g); out(k, g, 1); },
    keys(ctx, k, t, e, spb) { const f = hz(e.m), d = (e.dur || 1) * spb, g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(e.vel * 0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(e.vel * 0.12, t + Math.min(d, 0.8)); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.35); const stop = t + d + 0.4; const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 2400; for (const [mul, typ, lv] of [[1, 'sine', 1], [2, 'sine', 0.25], [1, 'triangle', 0.3]]) { const o = osc(ctx, typ, f * mul, t, stop), og = ctx.createGain(); og.gain.value = lv; o.connect(og); og.connect(fl); } fl.connect(g); out(k, g, 0.8); },
    pad(ctx, k, t, e, spb) { const f = hz(e.m), d = (e.dur || 4) * spb, g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(e.vel * 0.14, t + 0.5); g.gain.setValueAtTime(e.vel * 0.14, t + d - 0.1); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.6); const stop = t + d + 0.7; const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1100; for (const det of [-8, 8]) { const o = osc(ctx, 'sawtooth', f, t, stop); o.detune.value = det; o.connect(fl); } fl.connect(g); out(k, g, 1.5); },
    bass(ctx, k, t, e, spb) { const f = hz(e.m), d = (e.dur || 1) * spb, g = ctx.createGain(), stop = env(g, t, 0.008, e.vel * 0.55, Math.min(0.9, d + 0.1)); const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 900; const o = osc(ctx, 'triangle', f, t, stop), s = osc(ctx, 'sine', f, t, stop); o.connect(fl); s.connect(fl); fl.connect(g); out(k, g, 0.1); },
    kick(ctx, k, t, e) { const g = ctx.createGain(), stop = env(g, t, 0.002, e.vel * 0.9, 0.38); const o = osc(ctx, 'sine', 150, t, stop); o.frequency.exponentialRampToValueAtTime(44, t + 0.13); o.connect(g); out(k, g, 0.05); },
    taiko(ctx, k, t, e) { const g = ctx.createGain(), stop = env(g, t, 0.003, e.vel * 0.9, 0.7); const o = osc(ctx, 'sine', 110, t, stop); o.frequency.exponentialRampToValueAtTime(52, t + 0.25); o.connect(g); const n = noise(ctx, k, t, t + 0.12, 'lowpass', 600), ng = ctx.createGain(); env(ng, t, 0.002, e.vel * 0.4, 0.1); n.connect(ng); ng.connect(g); out(k, g, 0.5); },
    snare(ctx, k, t, e) { const g = ctx.createGain(), stop = env(g, t, 0.002, e.vel * 0.5, 0.2); const n = noise(ctx, k, t, stop, 'bandpass', 1900, 0.8); n.connect(g); const o = osc(ctx, 'triangle', 190, t, t + 0.08), og = ctx.createGain(); env(og, t, 0.002, e.vel * 0.3, 0.07); o.connect(og); og.connect(g); out(k, g, 0.6); },
    clap(ctx, k, t, e) { const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); for (let i = 0; i < 3; i++) { g.gain.setValueAtTime(e.vel * 0.5, t + i * 0.011); g.gain.exponentialRampToValueAtTime(0.02, t + i * 0.011 + 0.009); } g.gain.setValueAtTime(e.vel * 0.45, t + 0.034); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); const n = noise(ctx, k, t, t + 0.25, 'bandpass', 1300, 1.2); n.connect(g); out(k, g, 0.9); },
    hat(ctx, k, t, e) { const g = ctx.createGain(), stop = env(g, t, 0.001, e.vel * 0.25, 0.05); noise(ctx, k, t, stop, 'highpass', 7500).connect(g); out(k, g, 0.3); },
    shaker(ctx, k, t, e) { const g = ctx.createGain(), stop = env(g, t, 0.01, e.vel * 0.22, 0.08); noise(ctx, k, t, stop, 'bandpass', 6200, 1.5).connect(g); out(k, g, 0.4); },
    jingle(ctx, k, t, e) { const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); for (let i = 0; i < 4; i++) { g.gain.setValueAtTime(e.vel * 0.22 * (1 - i * 0.2), t + i * 0.025); g.gain.exponentialRampToValueAtTime(0.004, t + i * 0.025 + 0.022); } g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); noise(ctx, k, t, t + 0.18, 'bandpass', 8200, 4).connect(g); out(k, g, 0.6); },
  };

  // schedule every event with start time in [from, to) seconds (song time), song time 0 = ctx time t0
  function schedule(ctx, id, t0, from, to) {
    const tr = TRACKS[id]; if (!tr) return; const k = kit(ctx), spb = 60 / tr.bpm, loop = tr.bars * 4 * spb, ev = tr.__ev || (tr.__ev = tr.build(HELP));
    for (let n = Math.floor(from / loop); n * loop < to; n++) for (const e of ev) { const s = n * loop + e.t * spb; if (s >= from && s < to) VOICE[e.inst](ctx, k, t0 + s, e, spb); }
  }
  let live = null;
  HP.music = {
    tracks: TRACKS,
    play(id) {
      this.stop(); if (!TRACKS[id]) return;
      const ctx = new (window.AudioContext || window.webkitAudioContext)(), k = kit(ctx), t0 = ctx.currentTime + 0.08;
      k.master.gain.setValueAtTime(0.0001, ctx.currentTime); k.master.gain.exponentialRampToValueAtTime(0.75, ctx.currentTime + 1.2);
      let done = 0; const tick = () => { const ahead = ctx.currentTime - t0 + 0.8; if (ahead > done) { schedule(ctx, id, t0, done, ahead); done = ahead; } };
      tick(); live = { ctx, k, timer: setInterval(tick, 200), id }; ctx.resume && ctx.resume();
    },
    stop() { if (!live) return; const { ctx, k, timer } = live; live = null; clearInterval(timer); const n = ctx.currentTime; k.master.gain.cancelScheduledValues(n); k.master.gain.setValueAtTime(k.master.gain.value, n); k.master.gain.exponentialRampToValueAtTime(0.0001, n + 0.4); setTimeout(() => ctx.close(), 600); },
    get playing() { return live ? live.id : null; },
    async render(id, dur, sr = 44100, fadeIn = 0.6) {
      const ctx = new OfflineAudioContext(2, Math.ceil(sr * dur), sr), k = kit(ctx);
      k.master.gain.setValueAtTime(0.0001, 0); k.master.gain.exponentialRampToValueAtTime(0.75, fadeIn); k.master.gain.setValueAtTime(0.75, Math.max(fadeIn, dur - 1.2)); k.master.gain.linearRampToValueAtTime(0.0001, dur);
      schedule(ctx, id, 0, 0, dur); return ctx.startRendering();
    },
    wav(buf) {
      const n = buf.length, ch = buf.numberOfChannels, out = new DataView(new ArrayBuffer(44 + n * ch * 2)); let p = 0;
      const s = str => { for (const c of str) out.setUint8(p++, c.charCodeAt(0)); }, u32 = v => { out.setUint32(p, v, true); p += 4; }, u16 = v => { out.setUint16(p, v, true); p += 2; };
      s('RIFF'); u32(36 + n * ch * 2); s('WAVEfmt '); u32(16); u16(1); u16(ch); u32(buf.sampleRate); u32(buf.sampleRate * ch * 2); u16(ch * 2); u16(16); s('data'); u32(n * ch * 2);
      const data = Array.from({ length: ch }, (_, i) => buf.getChannelData(i));
      for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, data[c][i])); out.setInt16(p, v < 0 ? v * 0x8000 : v * 0x7fff, true); p += 2; }
      return new Uint8Array(out.buffer);
    },
  };
})();

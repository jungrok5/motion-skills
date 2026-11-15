// Sound, all synthesised: every word, stroke and event on the sheet is a *cue* ({ t, name, p }) and the music is cues too
// (a small composer that listens to what is on the sheet). Live, cues play as they happen; for a film the same list is
// rendered offline to a WAV — so the page and the MP4 sound the same and nothing is recorded or downloaded.
//
// A world adds its own voices with `sound.voice(name, (au, t, p) => …)` built from `au.tone`, `au.noise`, `au.pluck`.
import { rng, clamp } from './brush.js';

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

/** the instruments: one of these per AudioContext (live or offline) */
class Kit {
  constructor(ctx, seed = 3) {
    this.ctx = ctx; this.out = ctx.createGain(); this.out.gain.value = .9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = .004; comp.release.value = .22;
    this.out.connect(comp); comp.connect(ctx.destination);
    // a room: seeded noise that dies away, so live and offline reverbs are the same
    const r = rng(seed), len = Math.floor(ctx.sampleRate * 2.8), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp = 0; for (let i = 0; i < len; i++) { const t = i / len; lp += ((r() * 2 - 1) - lp) * (.55 - t * .4); d[i] = lp * Math.pow(1 - t, 2.6) * (i < 400 ? i / 400 : 1); } }
    this.verb = ctx.createConvolver(); this.verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = .5; this.verb.connect(vg); vg.connect(this.out);
    const nl = ctx.sampleRate * 2, nb = ctx.createBuffer(1, nl, ctx.sampleRate), nd = nb.getChannelData(0), r2 = rng(seed + 1); for (let i = 0; i < nl; i++) nd[i] = r2() * 2 - 1;
    this.noiseBuf = nb; this.loops = {};
  }
  _env(g, t, a, d, peak, sustain = 0, hold = 0) {
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t + a);
    if (hold) g.gain.setValueAtTime(Math.max(.0002, peak), t + a + hold);
    g.gain.exponentialRampToValueAtTime(Math.max(.0001, sustain || .0001), t + a + hold + d);
  }
  _send(node, wet = .3, pan = 0) {
    let n = node; if (pan && this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); n.connect(p); n = p; }
    n.connect(this.out); if (wet > 0) { const s = this.ctx.createGain(); s.gain.value = wet; n.connect(s); s.connect(this.verb); }
  }
  /** a pitched tone. o: { f | m (midi), type, a, d, v, to (glide to Hz), vib, wet, pan, hold } */
  tone(t, o = {}) {
    const c = this.ctx, f = o.f || mtof(o.m || 69), a = o.a ?? .01, d = o.d ?? .6, osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + a + (o.hold || 0) + d * (o.glide || .8));
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vibRate || 5; lg.gain.value = f * o.vib; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + a + (o.hold || 0) + d + .1); }
    this._env(g, t, a, d, o.v ?? .2, 0, o.hold || 0); osc.connect(g); this._send(g, o.wet ?? .3, o.pan || 0);
    osc.start(t); osc.stop(t + a + (o.hold || 0) + d + .05);
  }
  /** a plucked string (silk, gut, steel by `bright`): two detuned partial stacks through a closing filter */
  pluck(t, o = {}) {
    const c = this.ctx, f = o.f || mtof(o.m || 69), v = o.v ?? .22, d = o.d ?? 1.6, lp = c.createBiquadFilter(), g = c.createGain();
    lp.type = 'lowpass'; lp.Q.value = 1.2; lp.frequency.setValueAtTime(Math.min(12000, f * (o.bright ?? 7)), t); lp.frequency.exponentialRampToValueAtTime(Math.max(120, f * 1.2), t + d * .7);
    for (const [mul, type, k] of [[1, 'triangle', 1], [2.003, 'sine', .32], [1.004, 'sawtooth', .12], [3.01, 'sine', .1]]) {
      const osc = c.createOscillator(), og = c.createGain(); osc.type = type; osc.frequency.setValueAtTime(f * mul, t);
      if (o.bend) { osc.frequency.setValueAtTime(f * mul * (1 + o.bend), t); osc.frequency.exponentialRampToValueAtTime(f * mul, t + .12); }
      og.gain.value = k; osc.connect(og); og.connect(lp); osc.start(t); osc.stop(t + d + .1);
    }
    this._env(g, t, .004, d, v); lp.connect(g); this._send(g, o.wet ?? .45, o.pan || 0);
  }
  /** shaped noise. o: { type: band|low|high, f, to, q, a, d, v, wet, pan, hold } */
  noise(t, o = {}) {
    const c = this.ctx, src = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(), a = o.a ?? .01, d = o.d ?? .3;
    src.buffer = this.noiseBuf; src.loop = true; fl.type = { band: 'bandpass', low: 'lowpass', high: 'highpass' }[o.type || 'band']; fl.Q.value = o.q ?? 1;
    fl.frequency.setValueAtTime(o.f || 1200, t); if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t + a + (o.hold || 0) + d);
    this._env(g, t, a, d, o.v ?? .2, 0, o.hold || 0); src.connect(fl); fl.connect(g); this._send(g, o.wet ?? .2, o.pan || 0);
    src.start(t, (o.at || 0) % 1.9); src.stop(t + a + (o.hold || 0) + d + .05);
  }
  /** a held bed that is switched on and off by cues (rain, wind, sea): o: { on, type, f, q, v, lfo, wet } */
  loop(t, id, o = {}) {
    const c = this.ctx; let L = this.loops[id];
    if (!L) {
      const src = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); src.buffer = this.noiseBuf; src.loop = true;
      fl.type = { band: 'bandpass', low: 'lowpass', high: 'highpass' }[o.type || 'band']; fl.frequency.value = o.f || 800; fl.Q.value = o.q ?? .7; g.gain.value = 0;
      if (o.lfo) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.lfo; lg.gain.value = (o.f || 800) * .45; l.connect(lg); lg.connect(fl.frequency); l.start(t); }
      src.connect(fl); fl.connect(g); this._send(g, o.wet ?? .15, 0); src.start(t); L = this.loops[id] = { g };
    }
    L.g.gain.cancelScheduledValues(t); L.g.gain.setTargetAtTime(o.on === false ? 0 : (o.v ?? .1), t, o.on === false ? .9 : .5);
  }
}

const VOICES = {
  // the engine's own cues; a world can replace any of them with sound.voice(name, fn)
  note: (au, t, p) => au.pluck(t, { m: p.m, v: p.v ?? .2, d: p.d ?? 1.8, pan: p.pan, bright: p.bright, bend: p.bend }),
  pad: (au, t, p) => { for (const dm of [0, .07]) au.tone(t, { m: p.m + dm, type: 'sine', a: 1.2, d: p.d ?? 4, v: (p.v ?? .05), wet: .6, hold: .6 }); },
  brush: (au, t, p) => au.noise(t, { type: 'band', f: 900 + (p.k || 0) * 1400, to: 380, q: .8, a: .03, d: .32 + (p.k || 0) * .2, v: .05 + (p.k || 0) * .09, pan: p.pan, wet: .25 }),
  stir: (au, t, p) => au.noise(t, { type: 'low', f: 260 + (p.k || 0) * 500, to: 140, q: .4, a: .05, d: .5, v: .03 + (p.k || 0) * .05, pan: p.pan, wet: .3 }),
  drop: (au, t, p) => { au.tone(t, { f: (p.f || 620), to: (p.f || 620) * 1.9, a: .004, d: .09, v: p.v ?? .12, wet: .55, pan: p.pan, glide: .5 }); },
  water: (au, t, p) => { au.noise(t, { type: 'band', f: 1800, to: 500, q: .6, a: .04, d: .7, v: .09, pan: p.pan, wet: .4 }); au.tone(t + .05, { f: 420, to: 900, a: .01, d: .12, v: .06, wet: .6 }); },
  word: (au, t, p) => { au.noise(t, { type: 'band', f: 1500, to: 420, q: .9, a: .02, d: .4, v: .1, pan: p.pan, wet: .3 }); au.pluck(t + .03, { m: p.m ?? 62, v: .26, d: 2.4, pan: p.pan, bend: .012 }); },
  melt: (au, t, p) => au.noise(t, { type: 'low', f: 700, to: 160, q: .5, a: .08, d: .9, v: .07, pan: p.pan, wet: .45 }),
  verse: (au, t, p) => { au.tone(t, { m: (p.m ?? 74), type: 'sine', a: .01, d: 3.2, v: .09, wet: .7 }); au.tone(t, { m: (p.m ?? 74) + 12.02, type: 'sine', a: .01, d: 2.2, v: .03, wet: .7 }); },
  gong: (au, t, p) => { for (const [k, v] of [[1, .2], [1.48, .09], [2.02, .07], [2.74, .04]]) au.tone(t, { f: (p.f || 98) * k, a: .01, d: 5 / k + 1, v: v * (p.v ?? 1), wet: .6 }); },
  thunder: (au, t, p) => { au.noise(t, { type: 'low', f: 2600, to: 90, q: .3, a: .008, d: .5, v: .5, wet: .5 }); au.noise(t + .12, { type: 'low', f: 240, to: 50, q: .5, a: .3, d: 3.2, v: .42, wet: .65, at: .7 }); },
  flap: (au, t, p) => au.noise(t, { type: 'band', f: 700, to: 300, q: 1.5, a: .01, d: .1, v: .05 * (p.v ?? 1), pan: p.pan, wet: .3 }),
  rain: (au, t, p) => au.loop(t, 'rain', { on: p.on, type: 'high', f: 2600, q: .3, v: .06 * (p.v ?? 1), wet: .2 }),
  wind: (au, t, p) => au.loop(t, 'wind', { on: p.on, type: 'band', f: 420, q: 1.6, v: .11 * (p.v ?? 1), lfo: .17, wet: .3 }),
  clear: (au, t, p) => { VOICES.gong(au, t, { f: 73, v: .8 }); au.noise(t, { type: 'band', f: 2400, to: 300, q: .5, a: .2, d: 1.6, v: .1, wet: .5 }); }
};

export class Sound {
  constructor(o = {}) {
    this.voices = Object.assign({}, VOICES); this.on = false; this.kit = null; this.volume = o.volume ?? .9;
    // the composer: scales as semitones above `root` (midi); `night` replaces `day` while it is dark
    this.music = Object.assign({ root: 50, day: [0, 2, 4, 7, 9], night: [0, 2, 3, 7, 8], bpm: 66, density: .5, pad: true, bright: 7 }, o.music || {});
    this._bar = -1;
  }
  /** add or replace a voice: fn(kit, time, params) */
  voice(name, fn) { this.voices[name] = fn; }
  /** switch live sound on (must be called from a user gesture the first time) */
  async enable(on = true) {
    if (on && !this.kit) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return false; this.kit = new Kit(new C()); this.kit.out.gain.value = this.volume; }
    if (this.kit) { if (on) await this.kit.ctx.resume(); this.kit.out.gain.setTargetAtTime(on ? this.volume : 0, this.kit.ctx.currentTime, .08); }
    this.on = on; return on;
  }
  /** play a cue now (live) */
  play(name, p = {}) { if (!this.on || !this.kit) return; const v = this.voices[name]; if (v) try { v(this.kit, this.kit.ctx.currentTime + .03, p); } catch (e) { /* a voice must never stop the sheet */ } }
  /** the degree of the current scale → midi */
  degree(w, d, oct = 0) { const m = this.music, sc = w.dark > .5 ? m.night : m.day, n = sc.length; return m.root + sc[((d % n) + n) % n] + 12 * (Math.floor(d / n) + oct); }
  /**
   * The composer, called once per step by the world. It plays more when there is more on the sheet, darker at night,
   * thinner in rain; it never repeats a bar exactly but always returns to the root. Emits `note` and `pad` cues.
   */
  compose(w) {
    const m = this.music, beat = 60 / m.bpm, step = beat / 2, i = Math.floor(w.t / step); if (i === this._i) return; this._i = i;
    const r = this._r || (this._r = w.rand.fork(77)), pos = i % 16, bar = Math.floor(i / 16);
    const life = clamp(w.things.length / 9, .15, 1), busy = m.density * (.35 + .65 * life) * (w.quiet ? .35 : 1);
    if (pos === 0 && m.pad) { this._chord = r.pick([0, 0, 3, 2, 4]); w.cue('pad', { m: this.degree(w, this._chord, -1), d: beat * 6, v: .035 }); w.cue('pad', { m: this.degree(w, this._chord + 2, 0), d: beat * 6, v: .022 }); }
    const strong = pos % 4 === 0, p = strong ? busy * .85 : pos % 2 === 0 ? busy * .5 : busy * .22;
    if (r() < p) {
      const walk = this._last == null ? 0 : this._last + r.pick([-2, -1, -1, 1, 1, 2, 3]); this._last = clamp(pos === 0 && bar % 4 === 0 ? this._chord || 0 : walk, -3, 9);
      w.cue('note', { m: this.degree(w, this._last, 1), v: (strong ? .15 : .1) * (.8 + r() * .4), d: 1.4 + r() * 1.4, pan: (r() - .5) * .8, bright: m.bright });
    }
    if (pos === 0 && r() < .6 * busy) w.cue('note', { m: this.degree(w, this._chord || 0, -1), v: .16, d: 3.5, pan: 0, bright: m.bright * .6 });
  }
  /** render a cue list to a WAV (ArrayBuffer), offline: cues [{ t, name, p }], seconds long */
  async render(cues, seconds, rate = 44100) {
    const C = window.OfflineAudioContext || window.webkitOfflineAudioContext, ctx = new C(2, Math.ceil(seconds * rate), rate), kit = new Kit(ctx);
    kit.out.gain.value = this.volume;
    for (const c of cues) { const v = this.voices[c.name]; if (v && c.t < seconds) v(kit, Math.max(0, c.t) + .03, c.p || {}); }
    const buf = await ctx.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1), n = buf.length;
    let peak = 0, sum = 0; for (let i = 0; i < n; i++) { const a = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (a > peak) peak = a; sum += L[i] * L[i]; }
    const gain = peak > .97 ? .97 / peak : 1, fade = Math.min(n, rate * 1.2);
    const out = new DataView(new ArrayBuffer(44 + n * 4)), wr = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    wr(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); wr(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
    out.setUint32(24, rate, true); out.setUint32(28, rate * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); wr(36, 'data'); out.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { const k = gain * (i > n - fade ? (n - i) / fade : 1); out.setInt16(44 + i * 4, clamp(L[i] * k, -1, 1) * 32767, true); out.setInt16(46 + i * 4, clamp(R[i] * k, -1, 1) * 32767, true); }
    return { wav: out.buffer, peak, rms: Math.sqrt(sum / n), seconds: n / rate };
  }
}

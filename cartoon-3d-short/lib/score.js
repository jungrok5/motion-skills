// cartoon-3d-short · score.js — a light, bouncy "story short" score plus a library of cartoon SFX, synthesised from a
// small spec in plain JS (no Web Audio, no files, no imports), so the same bed plays on a live page and is written to a
// WAV by scripts/score.mjs for the MP4. Deterministic: every random choice comes from a seeded generator.
// Sound design ported from mromidev/claude-animated-shorts templates/audio (MIT): the additive brass (tuba, after-beat
// horns, stabs), fife, glockenspiel / vibes / music-box modes, field snare, cymbal, timpani, pizzicato, stick-slip
// creaks, bubbles and formant voices follow that code; the tunes, moods and cartoon SFX are this skill's own.
//
// spec = {
//   bpm: 112, key: 'C',              root name (C, F#, Bb …), major; add 'm' ('Am') for minor — moods pick their own
//                                    major/minor colour on that root either way
//   sections: [{ at: 0, mood, gain: 1 }]   mood ∈ MOODS. Each section restarts the bar grid at `at`, loops 4-bar
//                                    phrases until the next section, and plays a one-beat pickup / fill into it.
//                                    march   oom-pah: tuba on 1 & 3, horn after-beats, field snare, fife + glock tune
//                                    bouncy  swung: bouncing tuba octaves, woodblock tick-tock, glock + pizz tune
//                                    sneaky  minor tiptoe: staccato pizz walk, clarinet line, clock ticks, brushes
//                                    tense   tremolo strings on a dark climb, low pulse, ticking, snare-roll swells
//                                    wonder  half-time: warm pad, music-box arpeggios, vibes, harp glisses, no drums
//                                    explain sparse bed for talking: pizz on 1 & 3, marimba off-beats, soft shaker
//                                    payoff  full band tutti (cymbals, bass drum, doubled tune); if it is the last
//                                            section it ends on a button: final chord hit at `button`, ringing to dur
//                                    silence nothing (the section before it ends on a short tonic button)
//   stops: [t, …]                    hard music stop at t (10 ms cut, reverb too); music resumes at the next section
//   sfx: [{ at, kind, gain: 1, dur, pitch: 1, pan: 0, seed }]   kind ∈ SFX_KINDS (see SFX below for defaults).
//                                    `at` is the hit / start, except riser and drumroll, which END on `at` (they
//                                    build for `dur` before it). whistle takes dir: 'up' | 'down'.
//   duck: [[t0, t1], …]              voice spans (word times): music −9 dB, SFX −3 dB, attack 60 ms, release 250 ms
//   music: 1, sfxGain: 1             stem gains (linear)
//   seed: 1, button: dur − 1.2, reverb: 0.22, duckDb: −9, sfxDuckDb: −3   (optional extras)
// }
// renderScore(spec, sampleRate, duration) → [Float32Array L, Float32Array R], the music + SFX bed (no voice).
// Levels are calibrated for a voice at about −16 LUFS: each mood plays at −19 (payoff) … −22 (explain) LUFS un-ducked,
// each SFX peaks at about −23 LUFS momentary (impacts −21, clicks −26.5); a narrated short lands ~9 LU under the voice.

export const MOODS = ['march', 'bouncy', 'sneaky', 'tense', 'wonder', 'explain', 'payoff', 'silence'];
export const SFX_KINDS = ['whoosh', 'pop', 'boing', 'thud', 'crash', 'snap', 'splash', 'creak', 'ding', 'whistle', 'drumroll',
  'footsteps', 'bell', 'zip', 'rumble', 'cheer', 'laugh', 'gasp-sting', 'riser', 'glint', 'clack', 'squeak'];

const TAU = Math.PI * 2;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const dbg = db => Math.pow(10, db / 20);
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
// xorshift32 → uniform in [−1, 1)
function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; }; }
const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

// ---------------------------------------------------------------------------------------------------- DSP helpers
// TPT state-variable filter (stable at any cutoff). step() returns the unity-peak band-pass; .lp / .hp after a step.
class SVF {
  constructor(sr, fc = 1000, q = .7) { this.sr = sr; this.a = 0; this.b = 0; this.set(fc, q); }
  set(fc, q) { const g = Math.tan(Math.PI * clamp(fc, 10, this.sr * .45) / this.sr); this.k = 1 / q; this.a1 = 1 / (1 + g * (g + this.k)); this.a2 = g * this.a1; this.a3 = g * this.a2; }
  step(x) { const v3 = x - this.b, v1 = this.a1 * this.a + this.a2 * v3, v2 = this.b + this.a2 * this.a + this.a3 * v3; this.a = 2 * v1 - this.a; this.b = 2 * v2 - this.b; this.lp = v2; this.hp = x - this.k * v1 - v2; return this.k * v1; }
}
// sum of exponentially decaying sines, modes = [[freq, amp, tau]] (rotation oscillator: no Math.sin per sample)
function modal(sr, n, modes, out = new Float32Array(n), r) {
  for (const [f, a, tau] of modes) {
    if (f >= sr * .45 || !a) continue;
    const w = TAU * f / sr, c = Math.cos(w), s = Math.sin(w), d = Math.exp(-1 / (tau * sr)), ph = r ? (r() + 1) * Math.PI : 0;
    let x = Math.cos(ph), y = Math.sin(ph); const m = Math.min(n, Math.ceil(tau * sr * 9));
    for (let i = 0; i < m; i++) { out[i] += a * y; const nx = d * (c * x - s * y); y = d * (s * x + c * y); x = nx; }
  }
  return out;
}
// 2048-point harmonic wavetable built from an exact sine table (integer harmonics index it exactly)
const TN = 2048, SIN = new Float32Array(TN); for (let i = 0; i < TN; i++) SIN[i] = Math.sin(TAU * i / TN);
function harm(K, amp) { const t = new Float32Array(TN + 1); for (let k = 1; k <= K; k++) { const a = amp(k), o = (k * 389) & (TN - 1); if (a) for (let i = 0; i < TN; i++) t[i] += a * SIN[(k * i + o) & (TN - 1)]; } t[TN] = t[0]; return t; }
const look = (t, ph) => { const x = ph * TN, i = x | 0, f = x - i; return t[i] + (t[i + 1] - t[i]) * f; };
const peakOf = t => { let m = 1e-9; for (const v of t) m = Math.max(m, Math.abs(v)); return m; };
const PAD = harm(6, k => [1, .45, .22, .12, .06, .03][k - 1]);
const STR = harm(14, k => 1 / k * (k % 2 ? 1 : .8));
const PADn = 1 / peakOf(PAD), STRn = 1 / peakOf(STR);
// Schroeder / Freeverb-lite room: 4 damped combs + 2 all-passes (different delays per channel)
function verb(x, off, room = .8) {
  const N = x.length, out = new Float32Array(N), combs = [1557, 1617, 1491, 1422].map(d => ({ b: new Float32Array(d + off), i: 0, lp: 0 }));
  for (const c of combs) { const b = c.b, L = b.length; let i = 0, lp = 0; for (let n = 0; n < N; n++) { const y = b[i]; lp = y * .65 + lp * .35; b[i] = x[n] * .5 + lp * room; if (++i === L) i = 0; out[n] += y * .25; } }
  for (const d of [556 + off, 341 + off]) { const b = new Float32Array(d); let i = 0; for (let n = 0; n < N; n++) { const y = b[i], v = out[n] + y * .5; b[i] = v; out[n] = y - v * .5; if (++i === d) i = 0; } }
  return out;
}

// ---------------------------------------------------------------------------------------------------- instruments
// Each returns a mono Float32Array for one note (midi m, held d s, velocity v). Notes are cached per render.
const BRASS = {   // after instruments.py brass(): louder = brighter, lip scoop, a formant per instrument
  tuba: { att: .035, form: [420, 260], top: 2400, bc: 1, bump: .14, sus: .85, susT: .16, scoop: -22, rel: .07 },
  horn: { att: .025, form: [900, 450], top: 5000, bc: 1, bump: .14, sus: .85, susT: .16, scoop: -12, rel: .07 },
  stab: { att: .012, form: [1100, 700], top: 7000, bc: 1.3, bump: .25, sus: .72, susT: .09, scoop: -22, rel: .14 },
  reed: { att: .022, form: [520, 300], top: 3600, bc: .9, bump: .08, sus: .8, susT: .2, scoop: -10, rel: .05, odd: true },   // clarinet-ish
};
function brass(sr, m, d, v, r, kind) {
  const P = BRASS[kind], f = mtof(m), n = Math.ceil((d + P.rel) * sr), y = new Float32Array(n), dn = Math.ceil(d * sr);
  const K = Math.max(1, Math.min(40, Math.floor(P.top / f)));
  const ak = (k, bc) => Math.pow(k, -.75) / (1 + Math.pow(k / bc, 3)) * (1 + 1.2 * Math.exp(-(((k * f - P.form[0]) / P.form[1]) ** 2))) * (P.odd && !(k % 2) ? .3 : 1);
  const dark = harm(K, k => ak(k, 1.8)), bright = harm(K, k => ak(k, (1.8 + 6.5 * v) * P.bc)), g = 1 / peakOf(bright);
  const nz = new SVF(sr, 1000, .6), dph = (r() + 1) * 3, drift = 4 * 5.78e-4;
  let ph = (r() + 1) / 2;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let e = t < P.att ? Math.pow(t / P.att, 1.5) : 1;
    if (i > dn) e *= ((n - i) / (n - dn)) ** 2;
    e *= (1 + P.bump * v * Math.exp(-(((t - P.att) / .035) ** 2))) * (P.sus + (1 - P.sus) * Math.exp(-t / P.susT));
    const cents = P.scoop * Math.exp(-t / .03);
    ph += f * (1 + cents * 5.78e-4 + drift * Math.sin(TAU * .7 * t + dph)) / sr; ph -= ph | 0;
    const mx = Math.min(1, Math.pow(e, 1.4)), s = look(dark, ph) * (1 - mx) + look(bright, ph) * mx;
    y[i] = (s * g * e + nz.step(r()) * Math.exp(-t / .02) * .05) * v;
  }
  return y;
}
function fife(sr, m, d, v, r) {   // fife / piccolo lead: near-sine with chiff, breath and delayed vibrato
  const f = mtof(m), rel = .05, n = Math.ceil((d + rel) * sr), dn = Math.ceil(d * sr), y = new Float32Array(n);
  const ch = new SVF(sr, f * 1.5, .8), br = new SVF(sr, f, 5), vp = (r() + 1) * 3; let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr; let e = t < .018 ? Math.pow(t / .018, 1.2) : 1; if (i > dn) e *= ((n - i) / (n - dn)) ** 2;
    e *= 1 + .1 * Math.exp(-(((t - .02) / .02) ** 2));
    const cents = 18 * Math.exp(-t / .015) + 11 * clamp((t - .18) / .2, 0, 1) * Math.sin(TAU * 5.6 * t + vp);
    ph += f * (1 + cents * 5.78e-4) / sr; ph -= ph | 0;
    const p = TAU * ph, w = r();
    y[i] = ((Math.sin(p) + .2 * Math.sin(2 * p + .5) + .1 * Math.sin(3 * p + 1.1)) * e + br.step(w) * .1 * e + ch.step(w) * Math.exp(-t / .012) * .25) * v;
  }
  return y;
}
const click = (sr, y, r, hpf, tau, a) => { const f = new SVF(sr, hpf, .7), m = Math.min(y.length, Math.ceil(tau * sr * 8)); for (let i = 0; i < m; i++) { f.step(r()); y[i] += f.hp * Math.exp(-i / sr / tau) * a; } return y; };
function glock(sr, m, d, v, r) { const f = mtof(m), k = Math.pow(880 / f, .35), n = Math.ceil(1.8 * sr); return scale(click(sr, modal(sr, n, [[f, 1, 1.25 * k], [f * 2.756, .3 * v, .22 * k], [f * 5.404, .12 * v, .07], [f * 8.933, .05 * v, .025]], undefined, r), r, 3000, .0007, .25 * v), v); }
function vibes(sr, m, d, v, r) {
  const f = mtof(m), n = Math.ceil((d + .5) * sr), y = modal(sr, n, [[f, 1, 2.2], [f * 3.98, .16 * v, .32], [f * 9.9, .04 * v, .06]], undefined, r), tp = (r() + 1) * 3;
  for (let i = 0; i < n; i++) { const t = i / sr; y[i] *= (1 - .25 * (.5 + .5 * Math.sin(TAU * 5.2 * t + tp))) * (t > d ? Math.exp(-(t - d) / .09) : 1) * v; }
  return y;
}
function musicbox(sr, m, d, v, r) { const f = mtof(m), n = Math.ceil(1.6 * sr); return scale(click(sr, modal(sr, n, [[f, 1, 1.1], [f * 2, .04, .4], [f * 6.27, .13 * v, .08], [f * 17.55, .05 * v, .02]], undefined, r), r, 4000, .0006, .12 * v), v); }
function marimba(sr, m, d, v, r) { const f = mtof(m), n = Math.ceil(.8 * sr); const y = modal(sr, n, [[f, 1, .32 * Math.pow(440 / f, .3)], [f * 3.93, .25 * v, .05], [f * 9.2, .06 * v, .012]], undefined, r); return scale(click(sr, y, r, 800, .002, .15), v); }
function triangle(sr, m, d, v, r) { const f = 1320, n = Math.ceil(1.6 * sr); return scale(click(sr, modal(sr, n, [[f, 1, 1.4], [f * 2.71, .6, .9], [f * 4.63, .45, .7], [f * 6.02, .3, .5], [f * 7.75, .2, .35], [f * 9.4, .12, .25]], undefined, r), r, 5000, .001, .3), v * .4); }
function timpani(sr, m, d, v, r) {
  const f = mtof(m), n = Math.ceil(2.2 * sr), y = modal(sr, n, [[f, 1, 1.5], [f * 1.504, .55, .9], [f * 1.742, .3, .6], [f * 2, .35, .5], [f * 2.245, .18, .4], [f * 2.494, .12, .3]], undefined, r);
  const lp = new SVF(sr, 400, .7); for (let i = 0; i < Math.ceil(.15 * sr); i++) { lp.step(r()); y[i] += lp.lp * Math.exp(-i / sr / .018) * 2.5; }
  for (let i = Math.ceil(d * sr); i < n; i++) y[i] *= Math.exp(-(i / sr - d) / .1);   // hand-damped after d
  return scale(y, v);
}
function pluck(sr, m, d, v, r, harp = false) {   // pizzicato / harp: partials with frequency-dependent decay
  const f = mtof(m), pos = harp ? .12 : .17, bright = harp ? .7 : .5, K = Math.max(1, Math.min(12, Math.floor(6000 / f)));
  const tau0 = .55 * Math.pow(110 / f, .35) * (harp ? 2.2 : 1), modes = [];
  for (let k = 1; k <= K; k++) modes.push([k * f * Math.sqrt(1 + 2e-5 * k * k), Math.abs(Math.sin(Math.PI * k * pos)) / Math.pow(k, 1.3 - .6 * bright), tau0 / (1 + .45 * (k - 1) * Math.pow(f / 150, .4))]);
  const len = harp ? 1.8 : Math.min(1.4, d + .25), n = Math.ceil(len * sr), y = modal(sr, n, modes, undefined, r), lp = new SVF(sr, 700, .7);
  for (let i = 0; i < n; i++) { const t = i / sr; if (i < .05 * sr) { lp.step(r()); y[i] += lp.lp * Math.exp(-t / .008) * .3; } y[i] *= (1 - Math.exp(-t / .0015)) * (!harp && t > d ? Math.exp(-(t - d) / .05) : 1) * v; }
  return y;
}
function snare(sr, m, d, v, r) {   // field snare: tensioned head modes + wires + stick click; m = 1 → buzz stroke
  const buzz = m === 1, n = Math.ceil((buzz ? .14 : .34) * sr), y = modal(sr, n, [[196, .9, .05], [312, .5, .035], [419, .3, .028], [450, .22, .022], [520, .14, .018]].map(([f, a, t]) => [f, a * .55 * Math.pow(v, 1.2), t]), undefined, r);
  const w = new SVF(sr, 4500, .45), tail = buzz ? .035 : .055 + .07 * v;
  for (let i = 0; i < n; i++) { const t = i / sr, x = r(); y[i] += w.step(x) * Math.exp(-t / tail) * (1 - Math.exp(-t / .0012)) * 1.4 * Math.pow(v, 1.15) + (t < .006 ? x * Math.exp(-t / .0007) * .3 * v : 0); }
  return y;
}
function kick(sr, m, d, v, r) { const n = Math.ceil(.4 * sr), y = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr; ph += (52 + 70 * Math.exp(-t / .03)) / sr; y[i] = (Math.sin(TAU * ph) * Math.exp(-t / .16) + (t < .004 ? r() * .3 : 0)) * v; } return y; }
function woodblock(sr, m, d, v, r) { const f = mtof(m), n = Math.ceil(.15 * sr); return scale(click(sr, modal(sr, n, [[f, 1, .04], [f * 2.57, .5, .018], [f * 4.1, .25, .008]], undefined, r), r, 2500, .0008, .4), v); }
function shaker(sr, m, d, v, r) { const n = Math.ceil(.09 * sr), y = new Float32Array(n), f = new SVF(sr, 6000, .7); for (let i = 0; i < n; i++) { const t = i / sr; f.step(r()); y[i] = f.hp * Math.min(1, t / .006) * Math.exp(-t / .025) * v; } return y; }
function brush(sr, m, d, v, r) {   // m = 1 → swish over d, else a tap
  const swish = m === 1, n = Math.ceil((swish ? d : .3) * sr), y = new Float32Array(n), f = new SVF(sr, 3000, .45);
  for (let i = 0; i < n; i++) { const t = i / sr, e = swish ? Math.pow(Math.sin(Math.PI * t / d), 1.5) : Math.exp(-t / .045) * (1 - Math.exp(-t / .003)); y[i] = f.step(r()) * e * v; }
  return y;
}
function cymbal(sr, m, d, v, r) {   // clash cymbal: inharmonic partials + hiss, highs fade first
  const n = Math.ceil(2.4 * sr), modes = [];
  for (let k = 0; k < 28; k++) { const f = Math.exp(Math.log(380) + (r() + 1) / 2 * Math.log(12500 / 380)); modes.push([f, (.3 + .35 * (r() + 1)) / 5.3, 1.6 * Math.pow(900 / f, .45)]); }
  const y = modal(sr, n, modes, undefined, r), h = new SVF(sr, 5200, .7), b = new SVF(sr, 4500, .5);
  for (let i = 0; i < n; i++) { const t = i / sr, x = r(); h.step(x); y[i] = (y[i] * (1 - Math.exp(-t / .002)) + h.hp * Math.exp(-t / .7) * .6 + b.step(x) * Math.exp(-t / .006) * .8) * v; }
  return y;
}
function pad(sr, m, d, v, r, trem = false) {   // warm pad (wonder) or tremolo strings (tense): two detuned table voices
  const f = mtof(m), tb = trem ? STR : PAD, nm = trem ? STRn : PADn, att = trem ? .12 : .6, rel = trem ? .35 : 1, n = Math.ceil((d + rel) * sr), dn = Math.ceil(d * sr);
  const y = new Float32Array(n), c = 1 - Math.exp(-TAU * (trem ? 3200 : 1400) / sr), dt = Math.pow(2, 6 / 1200), tp = (r() + 1) * 3;
  let p1 = (r() + 1) / 2, p2 = (r() + 1) / 2, lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, vib = 1 + (trem ? .003 : .001) * Math.sin(TAU * 5.1 * t + tp);
    p1 += f * vib * dt / sr; p2 += f * vib / dt / sr; p1 -= p1 | 0; p2 -= p2 | 0;
    lp += c * ((look(tb, p1) + look(tb, p2)) * .5 * nm - lp);
    let e = t < att ? t / att : 1; if (i > dn) e *= 1 - (i - dn) / (n - dn);
    if (trem) e *= .55 + .45 * Math.pow(Math.sin(TAU * 6.2 * t + tp), 2);
    y[i] = lp * e * v;
  }
  return y;
}
function scale(y, g) { for (let i = 0; i < y.length; i++) y[i] *= g; return y; }
const INST = {   // synth, mix gain, reverb send
  tuba: [(sr, m, d, v, r) => brass(sr, m, d, v, r, 'tuba'), .7, .08], horn: [(sr, m, d, v, r) => brass(sr, m, d, v, r, 'horn'), .32, .2],
  stab: [(sr, m, d, v, r) => brass(sr, m, d, v, r, 'stab'), .3, .25], reed: [(sr, m, d, v, r) => brass(sr, m, d, v, r, 'reed'), .3, .18],
  fife: [fife, .25, .22], glock: [glock, .17, .25], vibes: [vibes, .42, .3], musicbox: [musicbox, .18, .35], marimba: [marimba, .3, .15],
  pluck: [pluck, .42, .15], harp: [(sr, m, d, v, r) => pluck(sr, m, d, v, r, true), .2, .4], snare: [snare, .5, .12], kick: [kick, .6, .04],
  cymbal: [cymbal, .22, .2], woodblock: [woodblock, .55, .12], shaker: [shaker, .6, .05], brush: [brush, .5, .1], timpani: [timpani, .2, .2],
  triangle: [triangle, .15, .3], pad: [pad, .25, .35], strings: [(sr, m, d, v, r) => pad(sr, m, d, v, r, true), .33, .3],
};

// ---------------------------------------------------------------------------------------------------- harmony + tunes
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function parseKey(k = 'C') { const m = /^([A-Ga-g])([#b]?)(m?)/.exec(String(k).trim()) || ['', 'C', '', '']; return (NOTE[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12; }
const CH = {   // [root above the tonic, chord intervals]
  I: [0, [0, 4, 7]], ii: [2, [0, 3, 7]], iii: [4, [0, 3, 7]], IV: [5, [0, 4, 7]], V: [7, [0, 4, 7]], V7: [7, [0, 4, 7, 10]], vi: [9, [0, 3, 7]],
  Imaj7: [0, [0, 4, 7, 11]], vi7: [9, [0, 3, 7, 10]], IVmaj7: [5, [0, 4, 7, 11]], iv6: [5, [0, 3, 7, 9]],
  i: [0, [0, 3, 7]], iv: [5, [0, 3, 7]], bVI: [8, [0, 4, 7]], bII: [1, [0, 4, 7]], ivo7: [6, [0, 3, 6, 9]],
};
// tunes: [beat, length in beats, semitones above the tonic] over 8 bars (two 4-bar phrases), looping
const TUNE = {
  march: [[0, 1, 7], [1, .5, 4], [1.5, .5, 7], [2, 1.5, 12], [3.5, .5, 11], [4, .75, 14], [4.75, .25, 12], [5, .5, 11], [5.5, .5, 9], [6, 1, 7], [7, 1, 2],
    [8, 1, 5], [9, .5, 7], [9.5, .5, 11], [10, 1, 14], [11, .5, 12], [11.5, .5, 11], [12, 2, 12], [14, 1, 7],
    [16, 1, 4], [17, 1, 7], [18, .5, 12], [18.5, .5, 11], [19, 1, 9], [20, 1, 9], [21, .5, 12], [21.5, .5, 9], [22, 1.5, 5], [23.5, .5, 4],
    [24, .75, 2], [24.75, .25, 4], [25, .5, 5], [25.5, .5, 7], [26, 1, 11], [27, 1, 14], [28, 1, 12], [29, 1, 7], [30, 1, 12]],
  bouncy: [[0, .5, 12], [.5, .5, 16], [1, .5, 19], [1.5, .5, 16], [2, .5, 21], [2.5, .5, 19], [3, 1, 16], [4, .5, 14], [4.5, .5, 17], [5, .5, 21], [5.5, .5, 17], [6, .5, 19], [6.5, .5, 23], [7, 1, 26],
    [8, .5, 24], [8.5, .5, 19], [9, .5, 16], [9.5, .5, 12], [10, .5, 21], [10.5, .5, 16], [11, 1, 12], [12, .5, 14], [12.5, .5, 17], [13, .5, 14], [13.5, .5, 11], [14, 1, 7],
    [16, .5, 12], [16.5, .5, 16], [17, .5, 19], [17.5, .5, 24], [18, 1, 21], [19, .5, 19], [19.5, .5, 16], [20, .5, 17], [20.5, .5, 21], [21, .5, 17], [21.5, .5, 14], [22, .5, 11], [22.5, .5, 14], [23, 1, 19],
    [24, .5, 16], [24.5, .5, 19], [25, .5, 24], [25.5, .5, 19], [26, .5, 16], [26.5, .5, 21], [27, 1, 24], [28, .5, 26], [28.5, .5, 24], [29, .5, 21], [29.5, .5, 17], [30, 1, 19]],
  sneaky: [[0, .4, 0], [1, .4, 3], [2, .4, 7], [2.75, .25, 6], [3, .4, 7], [4, .4, 8], [4.5, .4, 7], [5, .4, 6], [5.5, .4, 5], [6, .8, 3],
    [8, .4, 5], [9, .4, 8], [10, .4, 12], [10.75, .25, 11], [11, .4, 12], [12, .4, 11], [12.5, .4, 14], [13, .4, 17], [13.5, .4, 14], [14, .6, 11],
    [16, .4, 12], [16.5, .4, 11], [17, .4, 10], [17.5, .4, 9], [18, .4, 8], [19, .4, 7], [20, .4, 8], [21, .4, 12], [22, .4, 15], [22.75, .25, 14], [23, .4, 15],
    [24, .4, 17], [24.5, .4, 15], [25, .4, 12], [25.5, .4, 8], [26, .8, 5], [28, .4, 7], [28.5, .4, 11], [29, .4, 14], [29.5, .25, 13], [29.75, .25, 14], [30, .6, 7]],
  wonder: [[0, 2, 16], [2, 1, 19], [3, 1, 23], [4, 3, 19], [7, 1, 14], [8, 3, 16], [11, 1, 19], [12, 2, 21], [14, 2, 24],   // 8-beat bars
    [16, 2, 21], [18, 1, 24], [19, 1, 28], [20, 4, 24], [24, 2, 24], [26, 2, 20], [28, 4, 17]],
};
// mood = { prog: 8 bars of [chord, …] (two chords → two beats each), barBeats, swing, minor }
const MOOD = {
  march: { prog: [['I'], ['V7'], ['V7'], ['I'], ['I'], ['IV'], ['V7'], ['I']] },
  payoff: { prog: [['I'], ['IV'], ['V7'], ['I'], ['I'], ['IV'], ['V7'], ['I']] },
  bouncy: { prog: [['I', 'vi'], ['ii', 'V'], ['I', 'vi'], ['ii', 'V7']], swing: true },
  sneaky: { prog: [['i'], ['i'], ['iv'], ['V7'], ['i'], ['bVI'], ['iv'], ['V7']] },
  tense: { prog: [['i'], ['bVI'], ['ivo7'], ['V7'], ['i'], ['bII'], ['ivo7'], ['V7']] },
  wonder: { prog: [['Imaj7'], ['vi7'], ['IVmaj7'], ['iv6']], barBeats: 8 },
  explain: { prog: [['I'], ['vi'], ['IV'], ['V'], ['I'], ['vi'], ['ii'], ['V7']] },
  silence: { prog: [[]] },
};
const TRIM = { march: 0.558, payoff: 0.461, bouncy: 0.63, sneaky: 0.887, tense: 0.708, wonder: 0.5, explain: 0.952 };   // per-mood loudness trims (calibrated)

// ---------------------------------------------------------------------------------------------------- the score
export function renderScore(spec = {}, sr = 48000, dur = 60) {
  const N = Math.max(1, Math.ceil(dur * sr)), seed = spec.seed ?? 1;
  const bpm = spec.bpm || 112, beat = 60 / bpm, tonic = parseKey(spec.key);
  const L = new Float32Array(N), R = new Float32Array(N), S = new Float32Array(N);       // music dry L/R + reverb send
  const XL = new Float32Array(N), XR = new Float32Array(N), XS = new Float32Array(N);    // SFX dry L/R + send
  const R0 = rng(hash('music') ^ seed);
  // cached note renders: key inst|midi|dur|vel (velocity quantised; the exact velocity scales the cached copy)
  const cache = new Map();
  const note = (inst, m, d, v) => {
    const dq = Math.max(.05, Math.round(d * 20) / 20), vq = clamp(Math.round(v * 6) / 6, 1 / 6, 1.5), key = `${inst}|${m}|${dq}|${vq}`;
    let b = cache.get(key); if (!b) { b = INST[inst][0](sr, m, dq, vq, rng(hash(key) ^ seed)); cache.set(key, b); }
    return [b, v / vq];
  };
  const put = (bl, br, bs, x, t, g, pan, send) => {
    const i0 = Math.round(t * sr), a = (clamp(pan, -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), gs = g * send, n = Math.min(x.length, N - i0);
    for (let i = Math.max(0, -i0); i < n; i++) { const v = x[i]; bl[i0 + i] += v * gl; br[i0 + i] += v * gr; bs[i0 + i] += v * gs; }
  };
  const play = (inst, t, m, d, v, pan = 0, g = 1) => { if (t < 0 || t >= dur || v <= 0) return; const [b, k] = note(inst, Math.round(m), d, v); put(L, R, S, b, t, k * g * INST[inst][1], pan, INST[inst][2]); };

  // ---- sections, stops, button
  const secs = (spec.sections && spec.sections.length ? spec.sections : [{ at: 0, mood: 'bouncy' }])
    .map(s => ({ at: Math.max(0, +s.at || 0), mood: MOOD[s.mood] ? s.mood : 'explain', gain: s.gain ?? 1 })).sort((a, b) => a.at - b.at).filter(s => s.at < dur);
  secs.forEach((s, i) => { s.end = i + 1 < secs.length ? secs[i + 1].at : dur; s.next = secs[i + 1]; });
  const stops = (spec.stops || []).map(Number).filter(t => t >= 0 && t < dur).sort((a, b) => a - b);
  const last = secs[secs.length - 1], button = last && last.mood === 'payoff' ? clamp(spec.button ?? dur - 1.2, last.at, dur) : null;

  const bass0 = 34 + ((tonic - 34) % 12 + 12) % 12;   // tonic in the tuba / pizz register (34 … 45)
  const mel0 = 67 + ((tonic - 67) % 12 + 12) % 12;    // tonic in the tune register (67 … 78)
  const voicing = (ch, lo) => ch[1].map(iv => lo + (((tonic + ch[0] + iv - lo) % 12) + 12) % 12).sort((a, b) => a - b);
  const bassOf = ch => bass0 + ((ch[0] % 12) + (bass0 + ch[0] % 12 > 45 ? -12 : 0));
  const hum = (x = .004) => R0() * x;                    // timing humanisation (s)
  const vh = v => v * (1 + .06 * R0());                  // velocity humanisation

  for (const sec of secs) {
    if (sec.mood === 'silence') continue;
    const M = MOOD[sec.mood], bb = M.barBeats || 4, barLen = bb * beat, g = sec.gain * (TRIM[sec.mood] || 1);
    const nextMood = sec.next ? sec.next.mood : null, len = sec.end - sec.at;
    // the last beat before the next section (or the button) is the pickup / fill
    const endT = button !== null && sec === last ? button : sec.end;
    const stopT = stops.find(t => t >= sec.at && t < endT);   // a hard stop inside the section cancels its pickup
    const fill = (sec.next || button !== null && sec === last) && endT - sec.at >= 2 * beat && stopT === undefined;
    const into = sec === last && button !== null ? 'button' : nextMood;
    const limit = fill ? (into === 'silence' ? endT - beat / 2 : endT - beat) : endT;
    const P = (inst, t, m, d, v, pan) => { if (t < limit - 1e-6 && !(t >= stopT)) play(inst, t, m, Math.min(d, endT - t + .05), v, pan, g); };
    const swing = x => M.swing ? Math.floor(x) + ((x % 1) === .5 ? 2 / 3 : (x % 1)) : x;
    // downbeat accents on section entry
    if (sec.mood === 'march' || sec.mood === 'payoff') play('cymbal', sec.at, 0, 2, sec.mood === 'payoff' ? .6 : .35, .2, g);
    if (sec.mood === 'wonder') play('triangle', sec.at, 0, 1, .5, .35, g);
    if (sec.mood === 'tense') play('timpani', sec.at, bass0 + 12 > 52 ? bass0 : bass0 + 12, 1, .7, 0, g);
    for (let k = 0; sec.at + k * barLen < limit; k++) {
      const tb = sec.at + k * barLen, bar = M.prog[k % M.prog.length], at = b => tb + swing(b) * beat;
      const chAt = b => CH[bar[Math.min(bar.length - 1, Math.floor(b / (bb / bar.length)))]];
      const loopBeat0 = (k % (M.barBeats ? 4 : 8)) * bb, phraseEnd = k % 4 === 3;
      const tune = (inst, transpose, v, pan, staccato = 1) => { for (const [b, d, s] of TUNE[sec.mood === 'payoff' ? 'march' : sec.mood]) if (b >= loopBeat0 && b < loopBeat0 + bb) P(inst, at(b - loopBeat0) + hum(), mel0 + s + transpose, d * beat * staccato, vh(v), pan); };
      switch (sec.mood) {
        case 'march': case 'payoff': {
          const full = sec.mood === 'payoff';
          for (let b = 0; b < 4; b++) {
            const ch = chAt(b), root = bassOf(ch), fifth = root + 7 > 47 ? root - 5 : root + 7;
            if (full || b % 2 === 0) P('tuba', at(b), b % 2 ? fifth : root, .55 * beat, vh(b % 2 ? .62 : .72), -.1);
            if (phraseEnd && !full && b === 3) P('tuba', at(b), root - 1, .4 * beat, .55, -.1);   // walk-up into the next phrase
            const offs = full ? [b + .5] : (b % 2 ? [b] : []);
            for (const o of offs) voicing(ch, 55).forEach((m, j) => P('horn', at(o) + .004 * j, m, .32 * beat, vh(full ? .5 : .42), .3 - .15 * j));
            if (full || b % 2 === 0) P('kick', at(b), 0, .3, full ? .6 : .4, 0);
          }
          // field snare: 16 steps (3 = flam accent, 2 = accent, 1 = tap); phrase ends get a 16th-note fill
          const pat = full ? [3, 0, 1, 1, 2, 0, 1, 0, 3, 0, 1, 1, 2, 1, 1, 1] : [3, 0, 0, 0, 2, 0, 1, 0, 2, 0, 0, 0, 2, 0, 1, 1];
          pat.forEach((s, i) => { const v = phraseEnd && i >= 12 ? .35 + .1 * (i - 12) : s ? [0, .32, .6, .7][s] : 0; if (!v) return; const t = at(i / 4) + hum(.002); if (s === 3) P('snare', t - .026, 0, .3, .25, .05); P('snare', t, 0, .3, vh(v), .05); });
          tune('fife', 0, full ? .75 : .65, -.15); tune('glock', 12, full ? .6 : .45, .25);
          if (full) { tune('horn', -12, .45, .1); if (k % 4 === 0 && k) P('cymbal', tb, 0, 2, .4, -.2); P('triangle', at(0), 0, 1, .3, .4); }
          break;
        }
        case 'bouncy': {
          for (let b = 0; b < 4; b++) {
            const ch = chAt(b), root = bassOf(ch), lo = root < 38 ? root + 12 : root;
            P('tuba', at(b), lo, .3 * beat, vh(.62), -.1); P('tuba', at(b + .5), lo + 12, .22 * beat, vh(.45), -.1);   // bouncing octaves
            P('woodblock', at(b), b % 2 ? 84 : 79, .1, vh(.42), b % 2 ? .45 : -.45);                               // tick-tock
            if (b % 2) voicing(ch, 60).forEach((m, j) => P('pluck', at(b + .5) + .006 * j, m, .2 * beat, vh(.35), .25 - .12 * j));
            P('shaker', at(b + .5), 0, .1, vh(.3), .3);
          }
          tune('glock', 0, .55, .2, .8); tune('pluck', -12, .4, -.25, .6);
          if (phraseEnd && k % 8 === 7) P('brush', at(3), 1, .4 * beat, .5, .3);
          break;
        }
        case 'sneaky': {
          for (let b = 0; b < 4; b++) {   // tiptoe walk: root, fifth, octave, chromatic approach to the next bar's root
            const ch = chAt(b), root = bassOf(ch), nxt = bassOf(CH[M.prog[(k + 1) % M.prog.length][0]]);
            P('pluck', at(b), [root, root + 7, root + 12, nxt + 1][b], .28 * beat, vh(b === 0 ? .8 : .6), -.15);
            P('woodblock', at(b + .5), b % 2 ? 91 : 88, .1, vh(.22), .5);   // clock ticks on the &s
            if (b % 2) P('brush', at(b), 0, .2, vh(.4), .2);
          }
          tune('reed', -12, .55, -.2, .75);
          if (k % 8 === 7) P('glock', at(3.5), mel0 + 13, .3, .25, .4), P('glock', at(3.75), mel0 + 12, .3, .3, .4);
          break;
        }
        case 'tense': {
          const ch = chAt(0), root = bassOf(ch), cres = .35 + .08 * (k % 4), top = mel0 + 12 + (k % 4);   // chromatic rising top line
          voicing(ch, 55).forEach((m, j) => P('strings', tb + .01 * j, m, barLen, cres, -.4 + .25 * j));
          P('strings', tb, top, barLen, cres * .8, .35);
          for (let e = 0; e < 8; e++) P('tuba', at(e / 2) + hum(.002), root, .2 * beat, vh(e % 2 ? .45 : .62), -.1);   // low eighth pulse
          for (let e = 0; e < 8; e++) P('woodblock', at(e / 2), e % 2 ? 86 : 91, .1, vh(.2), .45);                     // ticking
          if (k) P('timpani', tb, bass0 + 12 > 52 ? bass0 : bass0 + 12, 1, .5, 0);
          if (phraseEnd) for (let t = at(2), i = 0; t < at(4) - .02; t += 1 / 24, i++) P('snare', t, 1, .14, .1 + .38 * (t - at(2)) / (2 * beat), .05);
          break;
        }
        case 'wonder': {   // 8-beat bars: one chord per long bar
          const ch = chAt(0), vo = voicing(ch, 55), ladder = [...voicing(ch, mel0), ...voicing(ch, mel0 + 12)].sort((a, b) => a - b);
          vo.forEach((m, j) => P('pad', tb + .02 * j, m, barLen, .45, -.5 + .33 * j));
          P('pluck', tb, bassOf(ch), barLen, .45, -.1);
          const path = [0, 1, 2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 6, 5, 4, 3];
          path.forEach((p, i) => P('musicbox', at(i / 2) + hum(.006), ladder[Math.min(p, ladder.length - 1)] + 12, .5, vh(i % 4 ? .35 : .5), .35 * Math.sin(i * .8)));
          tune('vibes', -12, .55, -.2);
          if (k % 4 === 0) { [0, 2, 4, 7, 9, 12, 14, 16].forEach((s, i) => P('harp', tb + i * beat / 8, mel0 - 12 + s, 1, .45 + .03 * i, -.3 + .08 * i)); P('triangle', tb, 0, 1, .4, .35); }
          break;
        }
        case 'explain': {
          for (let b = 0; b < 4; b++) {
            const ch = chAt(b), root = bassOf(ch);
            if (b % 2 === 0) P('pluck', at(b), b ? root + 7 : root, .5 * beat, vh(.7), -.1);
            if (b === 1 || b === 3) voicing(ch, 60).forEach((m, j) => P('marimba', at(b + .5) + .008 * j, m, .2, vh(.4), .15 + .1 * j));
            P('shaker', at(b + .5), 0, .1, vh(.28), .3); P('shaker', at(b), 0, .1, vh(.12), .3);
          }
          if (k % 4 === 0) [[2.5, 7], [3, 9], [3.5, 12]].forEach(([b, s]) => P('glock', at(b), mel0 + s, .3, .3, .3));
          if (phraseEnd) P('pluck', at(3.5), bassOf(chAt(3)) + 4, .3 * beat, .5, -.1);
          break;
        }
      }
    }
    // pickup / fill into what comes next, at this section's level
    if (fill) {
      const tf = endT - beat, F = (inst, t, m, d, v, pan = 0) => play(inst, t, m, d, v, pan, g), V = bassOf(CH.V);
      switch (into) {
        case 'march': case 'payoff': case 'button':
          for (let i = 0; i < 4; i++) F('snare', tf + i * beat / 4, 0, .3, .35 + .12 * i, .05);
          F('tuba', tf, V, .4 * beat, .6, -.1); F('tuba', tf + beat / 2, bass0 - 1, .4 * beat, .65, -.1); break;
        case 'bouncy': [5, 7, 11].forEach((s, i) => F('glock', tf + i * beat / 3, mel0 + s, .3, .5, .2)); F('woodblock', tf, 84, .1, .4, .4); F('woodblock', tf + beat * 2 / 3, 79, .1, .4, -.4); break;
        case 'sneaky': [3, 2, 1].forEach((s, i) => F('pluck', tf + i * beat / 3, bass0 + s, .25 * beat, .6, -.1)); F('woodblock', tf + beat / 2, 91, .1, .3, .5); break;
        case 'tense': for (let i = 0; i < 8; i++) F('timpani', tf + i * beat / 8, V > 47 ? V - 12 : V, i < 7 ? .1 : .4, .2 + .05 * i, 0); F('tuba', tf + beat / 2, bass0 + 1, .4 * beat, .5, -.1); break;
        case 'wonder': [0, 2, 4, 7, 9, 12].forEach((s, i) => F('harp', tf + i * beat / 6, mel0 + s, 1, .4 + .05 * i, -.2 + .1 * i)); break;
        case 'explain': F('pluck', tf, V, .4 * beat, .6, -.1); F('pluck', tf + beat / 2, bass0 - 1, .4 * beat, .6, -.1); F('brush', tf, 1, beat, .45, .2); break;
        case 'silence': F('pluck', endT, bass0, .4, .8, -.1); F('glock', endT, mel0 + 12, .3, .5, .2); F('tuba', endT, bass0, .25, .6, -.1); voicing(CH.I, 60).forEach((m, j) => F('pluck', endT + .006 * j, m, .3, .45, .2 - .1 * j)); break;
      }
    }
    if (into === 'button') {   // final chord hit: brass stab + tuba + timpani + cymbal + glock + bass drum
      const F = (inst, t, m, d, v, pan = 0) => play(inst, t, m, d, v, pan, g);
      voicing(CH.I, 55).concat(voicing(CH.I, 67)).forEach((m, j) => F('stab', button + .005 * j, m, .45, .8, -.4 + .16 * j));
      F('tuba', button, bass0, .5, .85, -.1); F('tuba', button, bass0 + 12, .5, .6, -.1); F('timpani', button, bass0 + 12 > 52 ? bass0 : bass0 + 12, 1, .9, 0);
      F('cymbal', button, 0, 2, .75, .2); F('kick', button, 0, .3, .8, 0); F('glock', button, mel0 + 12, .5, .7, .3); F('glock', button, mel0 + 19, .5, .5, .35);
    }
  }

  // ---- sound effects
  const sfxList = (spec.sfx || []).filter(e => e && SFX[e.kind]);
  sfxList.forEach((e, idx) => {
    const r = rng(hash(e.kind) ^ (e.seed ?? (idx * 7919 + seed))), u = () => (r() + 1) / 2, P = SFX[e.kind];
    const d = e.dur ?? P.dur, pitch = e.pitch ?? 1, pan0 = e.pan ?? 0, g = (e.gain ?? 1) * P.trim;
    const t0 = P.ends ? e.at - d : e.at, i0 = Math.round(t0 * sr), cl = [1, 1], sendAmt = P.send ?? .12;
    let lp = NaN;
    const add = (i, v, pan = pan0) => {   // sample i of this effect, constant-power pan
      const j = i0 + i; if (j < 0 || j >= N) return;
      if (pan !== lp) { lp = pan; const a = (clamp(pan, -1, 1) + 1) * Math.PI / 4; cl[0] = Math.cos(a); cl[1] = Math.sin(a); }
      v *= g; XL[j] += v * cl[0]; XR[j] += v * cl[1]; XS[j] += v * sendAmt;
    };
    const addBuf = (x, t, gain, pan = pan0) => { const o = Math.round(t * sr); for (let i = 0; i < x.length; i++) add(o + i, x[i] * gain, pan); };
    const inst = (name, m, dd, v) => { const [b, k] = note(name, m, dd, v); return scale(Float32Array.from(b), k * INST[name][1]); };
    P.fn({ sr, r, u, d, pitch, pan: pan0, add, addBuf, inst, tonic, e });
  });

  // ---- reverb, stops, end, ducking, sum
  const rv = spec.reverb ?? .22;
  const mL = verb(S, 0), mR = verb(S, 23), xL = verb(XS, 0, .7), xR = verb(XS, 23, .7);
  const gate = new Float32Array(N).fill(1);   // music gate: hard stops, intro silence, end fade
  for (const t of stops) {
    const res = secs.find(s => s.at > t + 1e-6 && s.mood !== 'silence'), t1 = res ? res.at : dur, a = Math.round(t * sr), b = Math.round(t1 * sr), fd = Math.round(.01 * sr), fu = Math.round(.006 * sr);
    for (let i = a; i < Math.min(N, b + fu); i++) gate[i] *= i < a + fd ? 1 - (i - a) / fd : i >= b ? (i - b) / fu : 0;
  }
  const endFade = button !== null ? [button + .9, dur] : [dur - 1.5, dur];
  for (let i = Math.max(0, Math.round(endFade[0] * sr)); i < N; i++) gate[i] *= Math.pow(clamp((dur - i / sr) / Math.max(.05, endFade[1] - endFade[0]), 0, 1), 1.5);
  // duck: merged voice spans (pre-roll 60 ms) → smoothed amount 0…1 (attack 60 ms, release 250 ms)
  const spans = (spec.duck || []).map(([a, b]) => [a - .06, b + .04]).sort((p, q) => p[0] - q[0]), merged = [];
  for (const s of spans) { const m = merged[merged.length - 1]; if (m && s[0] - m[1] < .3) m[1] = Math.max(m[1], s[1]); else merged.push([...s]); }
  const mDb = spec.duckDb ?? -9, xDb = spec.sfxDuckDb ?? -3, aA = 1 - Math.exp(-1 / (.06 * sr)), aR = 1 - Math.exp(-1 / (.25 * sr));
  const mG = (spec.music ?? 1), xG = (spec.sfxGain ?? 1);
  let amt = 0, si = 0;
  const outL = new Float32Array(N), outR = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    const t = n / sr; while (si < merged.length && merged[si][1] < t) si++;
    const tgt = si < merged.length && merged[si][0] <= t ? 1 : 0; amt += (tgt - amt) * (tgt > amt ? aA : aR);
    const gm = (amt > 1e-4 ? dbg(mDb * amt) : 1) * mG * gate[n], gx = (amt > 1e-4 ? dbg(xDb * amt) : 1) * xG;
    outL[n] = (L[n] + mL[n] * rv * 2.2) * gm + (XL[n] + xL[n] * rv * 1.6) * gx;
    outR[n] = (R[n] + mR[n] * rv * 2.2) * gm + (XR[n] + xR[n] * rv * 1.6) * gx;
  }
  // DC block, soft safety knee above −1 dBFS, 5 ms fade in / 20 ms fade out
  const knee = .89, fi = Math.round(.005 * sr), fo = Math.round(.02 * sr);
  for (const ch of [outL, outR]) {
    let x1 = 0, y1 = 0; const c = 1 - TAU * 15 / sr;
    for (let n = 0; n < N; n++) {
      const x = ch[n], y = x - x1 + c * y1; x1 = x; y1 = y; let v = y; const a = Math.abs(v);
      if (a > knee) v = Math.sign(v) * (knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee)));
      ch[n] = v * Math.min(1, n / fi, (N - 1 - n) / fo);
    }
  }
  return [outL, outR];
}

// ---------------------------------------------------------------------------------------------------- cartoon SFX
// Each: { dur (default s), trim (calibrated level), ends (anchored at its end), send (reverb), fn(o) } where o.add(i, v,
// pan) writes sample i of the effect, o.addBuf(buffer, t, gain, pan) places a buffer, o.inst(name, midi, d, v) renders
// a band instrument note, o.r()/o.u() are the effect's seeded randoms (−1…1 / 0…1).
const VOW = { a: [730, 1090, 2440], o: [570, 840, 2410], u: [300, 870, 2240], e: [530, 1840, 2480], i: [270, 2290, 3010], E: [580, 1700, 2500], A: [640, 1190, 2390], h: [600, 1400, 2500] };
// tiny source–filter voice: glottal buzz (+ breath) through three formant band-passes. f0(k), vow(k) → [F1,F2,F3],
// amp(k), breath(k) are functions of k = 0…1 across the syllable. Writes len seconds at offset t.
function voice(o, t, len, f0, vow, amp, breath, pan) {
  const { sr, r } = o, n = Math.ceil(len * sr), i0 = Math.round(t * sr), F = [new SVF(sr), new SVF(sr), new SVF(sr)], gains = [1, .55, .3];
  let ph = 0, tilt = 0, jit = 0;
  for (let i = 0; i < n; i++) {
    const k = i / n;
    if (!(i & 31)) { const v = vow(k); for (let j = 0; j < 3; j++) F[j].set(v[j], 6 + 4 * j); jit += (r() * .03 - jit) * .2; }
    ph += f0(k) * (1 + jit) / sr; ph -= ph | 0;
    tilt += .35 * ((1 - 2 * ph) - tilt);
    const b = breath(k), src = tilt * (1 - b) + r() * b * .9;
    let y = 0; for (let j = 0; j < 3; j++) y += F[j].step(src) * gains[j];
    o.add(i0 + i, y * amp(k) * 2.2, pan);
  }
}
const lerpV = (a, b, k) => [0, 1, 2].map(j => a[j] + (b[j] - a[j]) * k);
const bell3 = (k, a, r) => k < a ? k / a : k > 1 - r ? (1 - k) / r : 1;   // attack / hold / release shape on 0…1

const SFX = {
  whoosh: { dur: .5, trim: 0.402, send: .1, fn(o) {   // band-passed air: centre + level swell up then fall, pan sweep
    const { sr, r, d, pitch, pan } = o, n = Math.ceil(d * sr), a = new SVF(sr), b = new SVF(sr), pk = .42;
    for (let i = 0; i < n; i++) {
      const k = i / n, sh = k < pk ? k / pk : Math.pow((1 - k) / (1 - pk), .8), e = k < pk ? Math.pow(k / pk, 2) : Math.pow((1 - k) / (1 - pk), 1.6), fc = pitch * (320 + 2600 * sh);
      if (!(i & 15)) { a.set(fc, .9); b.set(fc * 1.6, 5); }
      const x = r(); o.add(i, (a.step(x) + b.step(x) * .5) * e * .9, pan + (k - .5) * 1.1);
    }
  } },
  pop: { dur: .12, trim: 0.443, fn(o) {   // mouth pop "bloop": fast upward sine chirp + a lip click
    const { sr, r, pitch } = o, n = Math.ceil(.12 * sr); let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / sr, f = pitch * (380 + 1100 * (1 - Math.exp(-t / .018))); ph += f / sr; o.add(i, Math.sin(TAU * ph) * Math.min(1, t / .002) * Math.exp(-t / .035) + (t < .003 ? r() * .5 * (1 - t / .003) : 0)); }
  } },
  boing: { dur: .9, trim: 0.507, send: .08, fn(o) {   // jaw-harp spring: buzzy tone, wobbling pitch + wah formant, rising
    const { sr, d, pitch } = o, n = Math.ceil(d * sr), f = new SVF(sr); let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, k = i / n, wob = Math.sin(TAU * 11 * t) * Math.exp(-t / (d * .45)), fr = pitch * 150 * (1 + .25 * k) * (1 + .22 * wob);
      ph += fr / sr; ph -= ph | 0; if (!(i & 15)) f.set(fr * (4 + 3 * wob), 4);
      const saw = 2 * ph - 1; o.add(i, (f.step(saw) * 1.4 + saw * .15) * Math.min(1, t / .004) * Math.exp(-t / (d * .4)));
    }
  } },
  thud: { dur: .35, trim: 0.414, send: .05, fn(o) {   // body hitting the floor: pitch-dropping sine + low noise + a mid knock
    const { sr, r, pitch } = o, n = Math.ceil(.4 * sr), lp = new SVF(sr, 300, .7); let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / sr; ph += pitch * (48 + 70 * Math.exp(-t / .03)) / sr; lp.step(r()); o.add(i, Math.sin(TAU * ph) * Math.exp(-t / .12) + lp.lp * Math.exp(-t / .03) * 2 + Math.sin(TAU * 190 * pitch * t) * Math.exp(-t / .025) * .4); }
  } },
  crash: { dur: 1.2, trim: 0.31, send: .15, fn(o) {   // junk pile: impact + cymbal + clanks and tin bounces, accelerating
    const { sr, r, u, pitch, pan, inst, addBuf } = o;
    addBuf(inst('cymbal', 0, 2, .7), 0, 1.4, pan + .2); addBuf(inst('kick', 0, .3, .8), 0, .9, pan);
    let t = .02, gap = .16;
    for (let j = 0; j < 11 && t < o.d; j++) {
      const f = pitch * (500 + u() * 2200), m = Math.ceil(.25 * sr), x = modal(sr, m, [[f, 1, .06], [f * 2.31, .6, .04], [f * 3.9, .4, .02], [f * 5.7, .2, .01]], undefined, r);
      click(sr, x, r, 2000, .001, .6); addBuf(x, t, .5 * (1 - j / 14), pan + r() * .7); t += gap * (.7 + .5 * u()); gap *= .8;
    }
  } },
  snap: { dur: .1, trim: 0.499, send: .08, fn(o) {   // twig / finger snap: bright crack + woody ring + two splinters
    const { sr, r, pitch } = o;
    for (const [dt, a] of [[0, 1], [.018, .35], [.037, .2]]) {
      const n = Math.ceil(.06 * sr), x = modal(sr, n, [[1400 * pitch, .5, .02], [2900 * pitch, .4, .01], [4700 * pitch, .25, .005]], undefined, r), b = new SVF(sr, 3200 * pitch, 1.2);
      for (let i = 0; i < n; i++) x[i] += b.step(r()) * Math.exp(-i / sr / .004) * 2.4;
      o.addBuf(x, dt, a);
    }
  } },
  splash: { dur: 1.1, trim: 0.233, send: .15, fn(o) {   // slap + thump + falling body + bubble plinks + droplets
    const { sr, r, u, d, pitch, pan } = o, n = Math.ceil(d * sr), s = new SVF(sr, 1500, .5), body = new SVF(sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr, x = r(); if (!(i & 15)) body.set(pitch * (700 + 1600 * Math.exp(-t / .3)), 1);
      o.add(i, s.step(x) * Math.exp(-t / .035) * 1.6 + Math.sin(TAU * 58 * t * (1 + .5 * Math.exp(-t / .025))) * Math.exp(-t / .15) * 1.2 + body.step(r()) * (1 - Math.exp(-t / .02)) * (.6 * Math.exp(-t / .18) + .3 * Math.exp(-t / .5)) * 1.2);
    }
    for (let j = 0; j < 28; j++) {   // Minnaert bubbles: short sines gliding up
      const t = Math.pow(u(), 1.8) * d * .85, f = pitch * Math.exp(Math.log(300) + u() * Math.log(2600 / 300)), ta = .006 + u() * .025, m = Math.ceil(ta * 6 * sr), x = new Float32Array(m); let ph = 0;
      for (let i = 0; i < m; i++) { const tt = i / sr; ph += f * (1 + (4 + 8 * u()) * tt) / sr; x[i] = Math.sin(TAU * ph) * Math.exp(-tt / ta); }
      o.addBuf(x, t, (.25 + .5 * u()) * Math.pow(600 / f, .3) * Math.exp(-t / (d * .5)), pan + r() * .6);
    }
  } },
  creak: { dur: .8, trim: 0.679, send: .12, fn(o) {   // stick-slip friction impulses through a wooden resonator bank
    const { sr, r, u, d, pitch } = o, n = Math.ceil(d * sr), x = new Float32Array(n), r0 = 90 * pitch, r1 = 180 * pitch, bend = r() * .15;
    for (let t = u() / r0; t < d;) { const k = t / d, rate = (r0 + (r1 - r0) * k) * (1 + bend * Math.sin(Math.PI * k)), e = k < .15 ? k / .15 : k < .7 ? 1 - .15 * (k - .15) / .55 : .85 * (1 - k) / .3; x[Math.floor(t * sr)] += e * (.55 + .45 * u()); t += (1 / rate) * (1 + .12 * r()); }
    for (const [f, q, a] of [[230, 9, 1], [520, 12, .8], [940, 14, .55], [1650, 16, .35], [2800, 18, .18]]) {   // two-pole resonators
      const fr = f * pitch * (.94 + .12 * u()), rr = Math.exp(-Math.PI * fr / (q * sr)), c1 = 2 * rr * Math.cos(TAU * fr / sr), c2 = -rr * rr; let y1 = 0, y2 = 0;
      for (let i = 0; i < n; i++) { const y = x[i] * (1 - rr) * 4 + c1 * y1 + c2 * y2; y2 = y1; y1 = y; o.add(i, y * a); }
    }
  } },
  ding: { dur: 1.2, trim: 0.09, send: .25, fn(o) {   // desk-bell "idea!" ding
    const { sr, r, pitch } = o, f = 1760 * pitch; o.addBuf(click(sr, modal(sr, Math.ceil(1.4 * sr), [[f, 1, 1.1], [f * 2.32, .4, .5], [f * 4.25, .2, .2], [f * 6.63, .08, .08]], undefined, r), r, 4000, .0006, .3), 0, 1);
  } },
  whistle: { dur: .6, trim: 0.123, send: .15, fn(o) {   // slide whistle: breathy sine gliding up (dir: 'down' to fall), wobble at the end
    const { sr, r, d, pitch, e } = o, n = Math.ceil(d * sr), up = e.dir !== 'down', b = new SVF(sr); let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, k = i / n, kk = up ? k : 1 - k, f = pitch * 550 * Math.pow(3.2, kk * kk * (3 - 2 * kk)) * (1 + .012 * Math.sin(TAU * 7 * t) * k);
      ph += f / sr; if (!(i & 15)) b.set(f, 8);
      o.add(i, (Math.sin(TAU * ph) + .12 * Math.sin(2 * TAU * ph) + b.step(r()) * .25) * bell3(k, .06, .12) * .8);
    }
  } },
  drumroll: { dur: 1.6, trim: 0.408, ends: true, send: .15, fn(o) {   // snare buzz roll crescendo, accent + cymbal on `at`
    const { d, r, inst, addBuf } = o, a = Math.round(d * 26);
    for (let i = 0; i < a; i++) { const k = i / a, v = (.12 + .55 * Math.pow(k, 1.3)) * (.88 + .24 * (i % 2)); addBuf(inst('snare', 1, .14, v), i / 26 + r() * .002, 1); }
    addBuf(inst('snare', 0, .3, .9), d, 1.2); addBuf(inst('cymbal', 0, 2, .7), d, 1.1, o.pan + .2); addBuf(inst('kick', 0, .3, .8), d, .8);
  } },
  footsteps: { dur: 1.2, trim: 0.413, send: .08, fn(o) {   // cartoon tiptoe steps: "pik-pok" wood + soft heel + scuff, alternating
    const { sr, r, u, d, pitch, pan } = o, steps = Math.max(1, Math.round(d * 4));
    for (let j = 0; j < steps; j++) {
      const f = pitch * (j % 2 ? 820 : 1040) * (.97 + .06 * u()), n = Math.ceil(.12 * sr), x = modal(sr, n, [[f, .7, .025], [f * 2.4, .25, .01], [180 * pitch, .8, .03]], undefined, r), s = new SVF(sr, 2000, .6);
      for (let i = 0; i < n; i++) x[i] += s.step(r()) * Math.min(1, i / sr / .01) * Math.exp(-i / sr / .03) * .35;
      o.addBuf(x, j * d / steps + r() * .01, .85 + .15 * u(), pan + (j % 2 ? .15 : -.15));
    }
  } },
  bell: { dur: 2.5, trim: 0.102, send: .3, fn(o) {   // handbell: hum / prime / tierce / quint / nominal partials, long ring
    const { sr, r, d, pitch } = o, f = 523.25 * pitch;
    o.addBuf(click(sr, modal(sr, Math.ceil(d * sr), [[f * .5, .5, d * .9], [f, 1, d * .6], [f * 1.19, .45, d * .4], [f * 1.5, .3, d * .3], [f * 2, .5, d * .25], [f * 2.52, .2, d * .15], [f * 3.01, .12, d * .1]], undefined, r), r, 3000, .001, .3), 0, .9);
  } },
  zip: { dur: .28, trim: 0.322, send: .05, fn(o) {   // dash-off zip: accelerating ratchet clicks + a fast upward chirp
    const { sr, r, d, pitch, pan } = o, n = Math.ceil(d * sr), b = new SVF(sr); let ph = 0, cp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, k = i / n, rate = 60 + 500 * k * k; cp += rate / sr; const tick = cp >= 1; if (tick) cp -= 1;
      if (!(i & 15)) b.set(pitch * (2000 + 3500 * k), 2); ph += pitch * (450 + 2400 * k * k) / sr;
      o.add(i, (b.step(tick ? 1 : r() * .05) * 2.5 + Math.sin(TAU * ph) * .35) * bell3(k, .1, .08), pan + (k - .5) * .8);
    }
  } },
  rumble: { dur: 2, trim: 0.584, send: .05, fn(o) {   // earthquake / tummy: low tones with tremolo + low noise + grit for phones
    const { sr, r, d, pitch } = o, n = Math.ceil(d * sr), lp = new SVF(sr, 110 * pitch, .8), gr = new SVF(sr, 260 * pitch, 1.5);
    for (let i = 0; i < n; i++) { const t = i / sr, k = i / n, e = Math.min(1, t / .3) * Math.pow(1 - k, .6), tr = .6 + .4 * Math.sin(TAU * 9 * t), x = r(); lp.step(x);
      o.add(i, (Math.sin(TAU * 44 * pitch * t) * .5 + Math.sin(TAU * 67 * pitch * t) * .25 + lp.lp * 3 + gr.step(x) * .8 * (.5 + .5 * Math.sin(TAU * 3.3 * t))) * e * tr); }
  } },
  cheer: { dur: 1.8, trim: 0.092, send: .2, fn(o) {   // stylised crowd: voiced "yay!" / "hooray!" / "woo!" + murmur + claps + whistle blips
    const { r, u, d, pitch, pan } = o;
    for (let v = 0; v < 10; v++) {
      const kind = v % 3, base = pitch * [130, 220, 300][v % 3] * (.92 + .16 * u()), t = u() * .45, len = (.35 + .25 * u()) * Math.min(1.3, d / 1.8), rise = 1.35 + .2 * u();
      const vw = kind === 0 ? k => lerpV(VOW.E, VOW.i, k) : kind === 1 ? k => k < .4 ? lerpV(VOW.u, VOW.e, k / .4) : lerpV(VOW.e, VOW.i, (k - .4) / .6) : k => lerpV(VOW.u, VOW.o, k);
      voice(o, t, len, k => base * (k < .3 ? 1 + (rise - 1) * k / .3 : rise - (rise - 1.15) * (k - .3) / .7), vw, k => bell3(k, .08, .25) * (.5 + .5 * u()), k => k < .06 ? .8 : .12, pan + r() * .8);
    }
    for (let v = 0; v < 5; v++) {   // murmur bed under it
      const base = pitch * (110 + 120 * u()), t = .05 + u() * .2, vs = Object.values(VOW), a = vs[v % vs.length], b = vs[(v * 3 + 2) % vs.length];
      voice(o, t, d * .85, k => base * (1 + .08 * Math.sin(TAU * 4 * k)), k => lerpV(a, b, .5 + .5 * Math.sin(TAU * 3.5 * k * d)), k => bell3(k, .15, .4) * .18 * (.6 + .4 * Math.abs(Math.sin(TAU * 4.3 * k * d))), () => .25, pan + r() * .8);
    }
    for (let c = 0; c < 12; c++) {   // claps: short resonant noise ticks, each clapper at its own rate
      const rate = 3.8 + 2 * u(), fc = 1000 + 1500 * u(), p = pan + r() * .9;
      for (let t = .15 + u() * .2; t < d * .9; t += (1 / rate) * (.9 + .2 * u())) {
        const m = Math.ceil(.03 * o.sr), x = new Float32Array(m), f = new SVF(o.sr, fc, 1.4);
        for (let i = 0; i < m; i++) x[i] = f.step(r()) * Math.exp(-i / o.sr / .007);
        o.addBuf(x, t, .35 * Math.min(1, (t - .1) / .3) * Math.min(1, (d - t) / .6), p);
      }
    }
    for (let w = 0; w < 2; w++) { const t0 = .3 + u() * .5, n = Math.ceil(.35 * o.sr), x = new Float32Array(n), f0 = pitch * (1700 + 500 * u()); let ph = 0;   // "woo-hoo" whistle blips
      for (let i = 0; i < n; i++) { const k = i / n; ph += f0 * (1 + .35 * Math.sin(Math.PI * k)) / o.sr; x[i] = Math.sin(TAU * ph) * bell3(k, .1, .3) * .25; } o.addBuf(x, t0, 1, pan + r() * .7); }
  } },
  laugh: { dur: 1.4, trim: 0.307, send: .15, fn(o) {   // stylised "ha-ha-ha": aspirated formant syllables falling in pitch, 3 voices
    const { u, d, pitch, pan } = o;
    for (const [base, vw, off, lvl, pn] of [[200, 'a', 0, 1, 0], [300, 'i', .05, .55, .35], [125, 'o', .1, .6, -.35]]) {
      const syl = Math.max(2, Math.round(d * 6.5));
      for (let j = 0; j < syl; j++) {
        const t = off + j / 6.5 + (u() - .5) * .02, p0 = pitch * base * (1.3 - .35 * j / syl), F = VOW[vw], a = lvl * (j ? 1 - .45 * j / syl : 1.1);
        voice(o, t, .11, k => p0 * (1 - .12 * k), k => k < .25 ? lerpV(VOW.h, F, k / .25) : F, k => bell3(k, .2, .3) * a, k => k < .25 ? .85 : .08, pan + pn);
      }
    }
  } },
  'gasp-sting': { dur: 1.2, trim: 0.351, send: .3, fn(o) {   // a sharp inhaled "hah!" + diminished brass stab, timpani, string shiver
    const { tonic, pitch, inst, addBuf, pan } = o, m0 = 55 + ((tonic - 55) % 12 + 12) % 12 + Math.round(12 * Math.log2(pitch));
    voice(o, 0, .3, k => 160 * pitch, k => lerpV(VOW.a, VOW.o, k), k => Math.pow(k, 1.5) * (k > .92 ? (1 - k) / .08 : 1) * .7, () => .95, pan);
    for (const [j, iv] of [0, 3, 6, 9, 12].entries()) addBuf(inst('stab', m0 + iv, .32, .9), .28 + .004 * j, 1.1, -.4 + .2 * j);
    addBuf(inst('timpani', m0 - 12, 1, .9), .28, 1); for (const iv of [13, 18]) addBuf(inst('strings', m0 + 12 + iv, .8, .6), .28, 1.2, .3);
  } },
  riser: { dur: 2, trim: 0.327, ends: true, send: .2, fn(o) {   // swelling noise with a rising band + a rising tone, tremolo speeding up
    const { sr, r, d, pitch, pan } = o, n = Math.ceil(d * sr), b = new SVF(sr), b2 = new SVF(sr); let ph = 0, tp = 0;
    for (let i = 0; i < n; i++) {
      const k = i / n, fc = pitch * 300 * Math.pow(20, k); if (!(i & 15)) { b.set(fc, 1 + 3 * k); b2.set(fc * 1.5, 6); }
      ph += pitch * 150 * Math.pow(8, k) / sr; tp += (4 + 14 * k * k) / sr; const x = r();
      const tone = Math.sin(TAU * ph) + .3 * Math.sin(TAU * 2 * ph) + .15 * Math.sin(TAU * 3 * ph);
      o.add(i, ((b.step(x) + b2.step(x) * .5) * .9 + tone * .35 * (.7 + .3 * Math.sin(TAU * tp))) * Math.pow(k, 2) * Math.min(1, (n - i) / (.012 * sr)), pan + .3 * Math.sin(TAU * k * 1.5));
    }
  } },
  glint: { dur: .5, trim: 0.106, send: .35, fn(o) {   // sparkle: quick ascending high pings with shimmer, sweeping across
    const { sr, r, pitch, pan } = o;
    [2637, 3136, 3520, 4186, 5274].forEach((f, j) => { const n = Math.ceil(.35 * sr), x = modal(sr, n, [[f * pitch, 1, .12], [f * pitch * 2.01, .2, .05]], undefined, r); for (let i = 0; i < n; i++) x[i] *= .75 + .25 * Math.sin(TAU * 18 * i / sr); o.addBuf(x, j * .035, .6 + .1 * j, pan - .5 + .25 * j); });
  } },
  clack: { dur: .1, trim: 0.319, send: .08, fn(o) {   // wooden clack (castanet / clapper): two sharp hits
    const { sr, r, pitch } = o;
    for (const [dt, a] of [[0, 1], [.045, .5]]) { const f = pitch * 1200 * (dt ? 1.06 : 1); o.addBuf(click(sr, modal(sr, Math.ceil(.08 * sr), [[f, 1, .018], [f * 2.4, .6, .009], [f * 3.6, .4, .005]], undefined, r), r, 2500, .0006, .9), dt, a); }
  } },
  squeak: { dur: .2, trim: 0.205, send: .08, fn(o) {   // rubber-toy squeak: nasal buzz, pitch arching up and settling
    const { sr, d, pitch } = o, n = Math.ceil(d * sr), f = new SVF(sr, 2200 * pitch, 3); let ph = 0;
    for (let i = 0; i < n; i++) { const k = i / n, fr = pitch * (950 + 700 * Math.sin(Math.PI * Math.min(1, k * 1.4)) + 120 * Math.sin(TAU * 30 * k * d)); ph += fr / sr; ph -= ph | 0; const p = ph < .3 ? 1 : -.43; o.add(i, (f.step(p) * 1.2 + Math.sin(TAU * ph) * .4) * bell3(k, .08, .2)); }
  } },
};

// sight-gag-short · score.js — the sound: a strolling street-funk groove (swung drums, finger bass, Rhodes chords,
// brass stabs, a whistled hook) and a library of cartoon foley for the gags (rubber stretch, finger flick, clang,
// boing, splash, squeak, steam …), synthesised in plain JS from a small spec — no files, no Web Audio, no imports —
// so the same mix plays on the live page and is written to a WAV by scripts/score.mjs. Deterministic: every random
// choice comes from a seeded generator. The reference clip runs one continuous ~130 bpm groove under all its gags with
// the foley on top; this score does the same, cut to the film's beat grid.
//
// spec = {
//   bpm: 120, key: "D",            the groove's root (minor/dorian colour). swing: 0.58 (0.5 = straight 16ths)
//   sections: [{ at, mood, gain }]  mood ∈ MOODS:
//      intro   kick + hats + bass only, a filtered hook        groove  the full band
//      tiptoe  pizzicato bass + woodblock ticks (a sneaky setup) break   drums + bass, keys out (room for foley)
//      hit     one brass stab + cymbal, then silence until the next section
//      outro   full band for one phrase, ending on a stab at `end` (default: section end)   silence  nothing
//   stops: [t, …]                   music drops out for one beat at t (a cartoon freeze before the punchline)
//   cues: [{ t, kind, gain, pitch, pan, dur }]   foley (the film's F.cues()); kind ∈ SFX_KINDS
//   music: 1, sfx: 1, reverb: 0.18, seed: 1, hook: true
// }
// renderScore(spec, sr, dur) → { L, R } mastered to ~−14 LUFS with a −1 dBFS ceiling (see master()).

export const MOODS = ["intro", "groove", "tiptoe", "break", "hit", "outro", "silence"];
export const SFX_KINDS = ["stretch", "retract", "snap", "flick", "whoosh", "boing", "thwack", "clang", "splash", "squeak", "puff", "pop", "ding", "thud", "crash", "honk", "zoom", "skid", "slide-up", "slide-down", "plop", "crinkle", "sparkle", "tick", "rattle", "stab", "cymbal", "scratch", "step", "swish", "gulp", "tada", "wobble", "knock", "beep"];

const TAU = Math.PI * 2;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const dbg = (db) => Math.pow(10, db / 20);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s / 4294967296) * 2 - 1; }; }
const KEYS = { C: 48, "C#": 49, Db: 49, D: 50, "D#": 51, Eb: 51, E: 52, F: 53, "F#": 54, Gb: 54, G: 55, "G#": 56, Ab: 56, A: 45, "A#": 46, Bb: 46, B: 47 };

// one-pole and state-variable filters
class SVF {
  constructor(sr, fc = 1000, q = 0.7) { this.sr = sr; this.a = 0; this.b = 0; this.set(fc, q); }
  set(fc, q = this.q) { this.q = q; const g = Math.tan((Math.PI * clamp(fc, 20, this.sr * 0.45)) / this.sr); this.k = 1 / q; this.a1 = 1 / (1 + g * (g + this.k)); this.a2 = g * this.a1; this.a3 = g * this.a2; }
  step(x) { const v3 = x - this.b, v1 = this.a1 * this.a + this.a2 * v3, v2 = this.b + this.a2 * this.a + this.a3 * v3; this.a = 2 * v1 - this.a; this.b = 2 * v2 - this.b; this.lp = v2; this.hp = x - this.k * v1 - v2; this.bp = v1; return v1; }
}

// ------------------------------------------------------------------------------------------------ the bus
class Bus {
  constructor(sr, n) { this.sr = sr; this.n = n; this.L = new Float32Array(n); this.R = new Float32Array(n); }
  /** add a mono buffer at time t (s) with gain and pan (−1 … 1, equal power) */
  add(buf, t, gain = 1, pan = 0) {
    const i0 = Math.round(t * this.sr), a = ((clamp(pan, -1, 1) + 1) * Math.PI) / 4, gl = Math.cos(a) * gain * Math.SQRT2, gr = Math.sin(a) * gain * Math.SQRT2;
    for (let i = 0; i < buf.length; i++) { const j = i0 + i; if (j < 0) continue; if (j >= this.n) break; this.L[j] += buf[i] * gl; this.R[j] += buf[i] * gr; }
  }
}
const env = (i, sr, a, d) => { const t = i / sr; return t < a ? t / a : Math.exp(-(t - a) / d); };

// ------------------------------------------------------------------------------------------------ instruments
function kick(sr, r) { const n = Math.round(sr * 0.42), b = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr, f = 46 + 110 * Math.exp(-t / 0.035); ph += (TAU * f) / sr; b[i] = Math.sin(ph) * Math.exp(-t / 0.16) * 0.95 + (i < sr * 0.004 ? r() * 0.35 * (1 - i / (sr * 0.004)) : 0); b[i] = Math.tanh(b[i] * 1.6) * 0.8; } return b; }
function snare(sr, r, ghost = false) {
  const n = Math.round(sr * 0.3), b = new Float32Array(n), bp = new SVF(sr, 2100, 0.9), hp = new SVF(sr, 900, 0.7); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, nz = r(); bp.step(nz); hp.step(nz); ph += (TAU * (195 - 30 * Math.min(1, t * 20))) / sr;
    const clap = [0, 0.011, 0.022].reduce((s, o) => s + (t > o && t < o + 0.012 ? 1 - (t - o) / 0.012 : 0), 0) * 0.5;
    b[i] = (bp.bp * 0.9 + hp.hp * 0.5) * (Math.exp(-t / 0.11) + clap) * 0.55 + Math.sin(ph) * Math.exp(-t / 0.05) * 0.5;
    if (ghost) b[i] *= 0.28;
  }
  return b;
}
function hat(sr, r, open = false) { const n = Math.round(sr * (open ? 0.32 : 0.06)), b = new Float32Array(n), hp = new SVF(sr, 7600, 0.8), bp = new SVF(sr, 10500, 1.2); for (let i = 0; i < n; i++) { const t = i / sr, x = r(); hp.step(x); bp.step(x); b[i] = (hp.hp * 0.6 + bp.bp * 0.5) * Math.exp(-t / (open ? 0.12 : 0.016)) * 0.32; } return b; }
function shaker(sr, r) { const n = Math.round(sr * 0.07), b = new Float32Array(n), hp = new SVF(sr, 5200, 0.7); for (let i = 0; i < n; i++) { const t = i / sr; hp.step(r()); b[i] = hp.hp * Math.sin(Math.PI * Math.min(1, t / 0.07)) * 0.12; } return b; }
function wood(sr, f = 1250) { const n = Math.round(sr * 0.09), b = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr; b[i] = (Math.sin(TAU * f * t) + 0.4 * Math.sin(TAU * f * 2.7 * t)) * Math.exp(-t / 0.018) * 0.5; } return b; }
/** finger bass: sine + rounded saw through a closing low-pass, a little growl */
function bass(sr, midi, dur, r, pluck = 1) {
  const n = Math.round(sr * (dur + 0.08)), b = new Float32Array(n), f = mtof(midi), lp = new SVF(sr, 900, 1.1); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr; ph += f / sr; const p = ph % 1;
    const saw = 2 * p - 1, x = Math.sin(TAU * p) * 0.85 + saw * 0.35;
    lp.set(220 + 1600 * Math.exp(-t / (0.06 * pluck)), 1.1); lp.step(x);
    const g = (t < 0.004 ? t / 0.004 : 1) * Math.exp(-t / 0.6) * (t > dur ? Math.exp(-(t - dur) / 0.015) : 1);
    b[i] = Math.tanh(lp.lp * 1.8) * g * 0.6;
  }
  return b;
}
/** Rhodes-ish electric piano: 1:1 FM with a decaying index, bell partial, slow tremolo */
function epiano(sr, midis, dur, r) {
  const n = Math.round(sr * (dur + 0.35)), b = new Float32Array(n);
  for (const m of midis) {
    const f = mtof(m), ph0 = (r() + 1) * Math.PI;
    for (let i = 0; i < n; i++) {
      const t = i / sr, idx = 1.4 * Math.exp(-t / 0.35) + 0.2, mod = Math.sin(TAU * f * t + ph0) * idx;
      const g = Math.min(1, t / 0.003) * Math.exp(-t / 1.1) * (t > dur ? Math.exp(-(t - dur) / 0.09) : 1);
      b[i] += (Math.sin(TAU * f * t + mod) + 0.12 * Math.sin(TAU * f * 7.1 * t) * Math.exp(-t / 0.05)) * g * (1 + 0.08 * Math.sin(TAU * 4.6 * t)) * 0.16;
    }
  }
  return b;
}
/** brass stab: detuned saws, low-pass envelope, a fall-off */
function stab(sr, midis, dur = 0.22, r, fall = 0) {
  const n = Math.round(sr * (dur + 0.25)), b = new Float32Array(n), lp = new SVF(sr, 1200, 0.9);
  const ph = midis.flatMap((m) => [-7, 0, 8].map((c) => [mtof(m) * Math.pow(2, c / 1200), (r() + 1) / 2]));
  for (let i = 0; i < n; i++) {
    const t = i / sr, bend = fall ? Math.pow(2, (-fall * Math.max(0, t - dur * 0.5) * 6) / 12) : 1; let x = 0;
    for (const p of ph) { p[1] += (p[0] * bend) / sr; x += 2 * (p[1] % 1) - 1; }
    lp.set(600 + 3600 * Math.exp(-t / 0.08) * (t < dur ? 1 : 0.5), 0.9); lp.step(x / ph.length);
    b[i] = Math.tanh(lp.lp * 2.2) * Math.min(1, t / 0.008) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.05)) * 0.55;
  }
  return b;
}
/** a whistled note: sine with breath noise and vibrato that grows */
function whistle(sr, midi, dur, r, slideFrom = null) {
  const n = Math.round(sr * (dur + 0.06)), b = new Float32Array(n), f = mtof(midi), bp = new SVF(sr, f, 6); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, vib = 1 + 0.012 * Math.sin(TAU * 5.4 * t) * Math.min(1, t / 0.25), fs = slideFrom ? mtof(slideFrom) + (f - mtof(slideFrom)) * Math.min(1, t / 0.07) : f;
    ph += (fs * vib) / sr; bp.set(fs * vib, 6); bp.step(r());
    const g = Math.min(1, t / 0.025) * (t > dur ? Math.exp(-(t - dur) / 0.03) : 1);
    b[i] = (Math.sin(TAU * ph) * 0.8 + bp.bp * 0.25) * g * 0.22;
  }
  return b;
}
function pizz(sr, midi, r) { const n = Math.round(sr * 0.35), b = new Float32Array(n), f = mtof(midi), lp = new SVF(sr, 2400, 0.8); let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr; ph += f / sr; lp.step(2 * (ph % 1) - 1); b[i] = lp.lp * Math.exp(-t / 0.09) * 0.5; } return b; }
function cymbal(sr, r, dur = 1.6) { const n = Math.round(sr * dur), b = new Float32Array(n), hp = new SVF(sr, 5000, 0.6), bp = new SVF(sr, 8000, 0.9); for (let i = 0; i < n; i++) { const t = i / sr, x = r(); hp.step(x); bp.step(x); b[i] = (hp.hp * 0.5 + bp.bp * 0.4) * Math.exp(-t / (dur * 0.35)) * 0.4; } return b; }

// ------------------------------------------------------------------------------------------------ foley (cartoon SFX)
function sweep(sr, dur, f0, f1, o = {}) {
  // a pitched sweep: o.wave sine|saw|square, o.curve exponent, o.vib, o.noise, o.q formant
  const n = Math.round(sr * dur), b = new Float32Array(n), r = rng(o.seed || 7), bp = new SVF(sr, f0, o.q || 3); let ph = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n, f = f0 * Math.pow(f1 / f0, Math.pow(u, o.curve || 1)) * (1 + (o.vib || 0) * Math.sin(TAU * (o.vibHz || 14) * i / sr));
    ph += f / sr; const p = ph % 1;
    let x = o.wave === "saw" ? 2 * p - 1 : o.wave === "square" ? (p < 0.5 ? 0.7 : -0.7) : o.wave === "tri" ? 1 - 4 * Math.abs(p - 0.5) : Math.sin(TAU * p);
    if (o.noise) { bp.set(f * 1.5, o.q || 3); bp.step(r()); x = x * (1 - o.noise) + bp.bp * o.noise * 2; }
    const g = Math.min(1, i / (sr * (o.a ?? 0.01))) * (o.decay ? Math.exp(-(i / sr) / o.decay) : Math.min(1, (n - i) / (sr * (o.r ?? 0.03))));
    b[i] = x * g * (o.gain ?? 0.5);
  }
  return b;
}
function noiseBurst(sr, dur, fc, q, o = {}) {
  const n = Math.round(sr * dur), b = new Float32Array(n), r = rng(o.seed || 11), f = new SVF(sr, fc, q);
  for (let i = 0; i < n; i++) { const u = i / n; if (o.fc1) f.set(fc * Math.pow(o.fc1 / fc, u), q); f.step(r()); const g = o.shape === "swell" ? Math.sin(Math.PI * Math.pow(u, o.skew || 1)) : Math.min(1, i / (sr * (o.a ?? 0.002))) * Math.exp(-(i / sr) / (o.decay ?? dur / 4)); b[i] = (o.lp ? f.lp : o.hp ? f.hp : f.bp) * g * (o.gain ?? 0.6); }
  return b;
}
function mixInto(a, b, k = 1, off = 0) { for (let i = 0; i < b.length && i + off < a.length; i++) a[i + off] += b[i] * k; return a; }
function modalHit(sr, dur, modes, seed = 3) { const n = Math.round(sr * dur), b = new Float32Array(n), r = rng(seed); for (const [f, a, tau] of modes) { const ph = (r() + 1) * Math.PI; for (let i = 0; i < n; i++) b[i] += a * Math.sin(TAU * f * i / sr + ph) * Math.exp(-i / sr / tau); } return b; }

/** SFX[kind](sr, o) → mono Float32Array. o.pitch scales pitch, o.dur stretches where it makes sense. */
export const SFX = {
  // the rubber arm shooting out: a rising rubbery zip with a squeaky formant
  stretch: (sr, o) => mixInto(sweep(sr, 0.32 * (o.dur || 1), 180 * o.pitch, 1400 * o.pitch, { wave: "saw", curve: 0.7, noise: 0.35, q: 5, gain: 0.45, r: 0.05 }), sweep(sr, 0.3 * (o.dur || 1), 600 * o.pitch, 2600 * o.pitch, { vib: 0.04, vibHz: 30, gain: 0.18 })),
  retract: (sr, o) => mixInto(sweep(sr, 0.3 * (o.dur || 1), 1300 * o.pitch, 200 * o.pitch, { wave: "saw", curve: 1.4, noise: 0.35, q: 5, gain: 0.4 }), sweep(sr, 0.28, 2400 * o.pitch, 500 * o.pitch, { vib: 0.04, vibHz: 30, gain: 0.15 })),
  // finger flick: a tight click + a short high "thwip"
  snap: (sr, o) => mixInto(noiseBurst(sr, 0.05, 3200 * o.pitch, 1.2, { decay: 0.008, gain: 1.1 }), sweep(sr, 0.06, 2200 * o.pitch, 900 * o.pitch, { decay: 0.02, gain: 0.3 })),
  flick: (sr, o) => mixInto(mixInto(noiseBurst(sr, 0.05, 3000 * o.pitch, 1.2, { decay: 0.008, gain: 1.0 }), noiseBurst(sr, 0.28, 900, 0.8, { fc1: 4000, shape: "swell", skew: 0.4, gain: 0.5, seed: 3 }), 1, Math.round(sr * 0.01)), sweep(sr, 0.12, 1800, 600, { decay: 0.05, gain: 0.2 }), 1, Math.round(sr * 0.01)),
  whoosh: (sr, o) => noiseBurst(sr, 0.38 * (o.dur || 1), 500 * o.pitch, 1.1, { fc1: 2600 * o.pitch, shape: "swell", skew: 0.6, gain: 0.75 }),
  swish: (sr, o) => noiseBurst(sr, 0.2 * (o.dur || 1), 1800 * o.pitch, 1.4, { fc1: 4200 * o.pitch, shape: "swell", skew: 0.5, gain: 0.45 }),
  boing: (sr, o) => sweep(sr, 0.55 * (o.dur || 1), 140 * o.pitch, 260 * o.pitch, { wave: "tri", vib: 0.16, vibHz: 18, decay: 0.22, gain: 0.55 }),
  wobble: (sr, o) => sweep(sr, 0.6 * (o.dur || 1), 220 * o.pitch, 210 * o.pitch, { wave: "sine", vib: 0.12, vibHz: 9, decay: 0.3, gain: 0.45 }),
  // a gloved slap / punch: low body + a slap of noise
  thwack: (sr, o) => mixInto(sweep(sr, 0.18, 160 * o.pitch, 60 * o.pitch, { decay: 0.06, gain: 0.9 }), noiseBurst(sr, 0.12, 1400 * o.pitch, 0.9, { decay: 0.02, gain: 0.9 })),
  thud: (sr, o) => mixInto(sweep(sr, 0.3, 110 * o.pitch, 45 * o.pitch, { decay: 0.09, gain: 1.0 }), noiseBurst(sr, 0.12, 400, 0.7, { decay: 0.03, gain: 0.5, lp: true })),
  knock: (sr, o) => mixInto(modalHit(sr, 0.2, [[320 * o.pitch, 0.5, 0.03], [700 * o.pitch, 0.3, 0.02], [1150 * o.pitch, 0.15, 0.012]]), noiseBurst(sr, 0.04, 2000, 1, { decay: 0.006, gain: 0.4 })),
  // a municipal metal bin: inharmonic ringing partials, a rattle, the body thump
  clang: (sr, o) => mixInto(mixInto(modalHit(sr, 1.2, [[412 * o.pitch, 0.32, 0.4], [1003 * o.pitch, 0.22, 0.3], [1559 * o.pitch, 0.16, 0.22], [2213 * o.pitch, 0.1, 0.15], [3170 * o.pitch, 0.07, 0.1]], 5), noiseBurst(sr, 0.4, 3000, 0.8, { decay: 0.05, gain: 0.45 })), sweep(sr, 0.25, 120, 55, { decay: 0.08, gain: 0.7 })),
  rattle: (sr, o) => { const b = new Float32Array(Math.round(sr * 0.5)); const r = rng(9); for (let k = 0; k < 9; k++) mixInto(b, modalHit(sr, 0.08, [[900 + r() * 300, 0.12, 0.02], [2100 + r() * 500, 0.08, 0.015]], k), 0.8 * Math.exp(-k / 4), Math.round(sr * (k * 0.045 + (r() + 1) * 0.01))); return b; },
  splash: (sr, o) => { const b = noiseBurst(sr, 0.7, 1400 * o.pitch, 0.6, { decay: 0.16, gain: 0.85, seed: 4 }); const r = rng(12); for (let k = 0; k < 10; k++) mixInto(b, sweep(sr, 0.05, 900 + (r() + 1) * 900, 2400 + (r() + 1) * 600, { decay: 0.015, gain: 0.25 }), 1, Math.round(sr * (0.04 + (r() + 1) * 0.2))); return b; },
  squeak: (sr, o) => sweep(sr, 0.14 * (o.dur || 1), 1500 * o.pitch, 2100 * o.pitch, { wave: "saw", noise: 0.25, q: 8, vib: 0.05, vibHz: 40, gain: 0.25 }),
  puff: (sr, o) => noiseBurst(sr, 0.55 * (o.dur || 1), 2400 * o.pitch, 0.6, { shape: "swell", skew: 0.25, gain: 0.35, hp: true }),
  pop: (sr, o) => sweep(sr, 0.07, 500 * o.pitch, 1500 * o.pitch, { decay: 0.02, gain: 0.7 }),
  plop: (sr, o) => mixInto(sweep(sr, 0.12, 700 * o.pitch, 220 * o.pitch, { decay: 0.04, gain: 0.7 }), noiseBurst(sr, 0.06, 500, 0.8, { decay: 0.01, gain: 0.4, lp: true })),
  gulp: (sr, o) => mixInto(sweep(sr, 0.1, 300 * o.pitch, 140 * o.pitch, { decay: 0.04, gain: 0.6 }), sweep(sr, 0.1, 260 * o.pitch, 120 * o.pitch, { decay: 0.04, gain: 0.5 }), 1, Math.round(sr * 0.09)),
  ding: (sr, o) => modalHit(sr, 1.4, [[1568 * o.pitch, 0.32, 0.6], [3920 * o.pitch, 0.1, 0.25], [4704 * o.pitch, 0.05, 0.15]], 2),
  sparkle: (sr, o) => { const b = new Float32Array(Math.round(sr * 1.0)); [84, 88, 91, 96].forEach((m, k) => mixInto(b, modalHit(sr, 0.6, [[mtof(m) * o.pitch, 0.18, 0.25], [mtof(m) * 2.76 * o.pitch, 0.05, 0.1]], k), 1, Math.round(sr * k * 0.06))); return b; },
  tada: (sr, o) => { const b = new Float32Array(Math.round(sr * 1.3)); const r = rng(5); mixInto(b, stab(sr, [62, 66, 69].map((m) => m + 12 * Math.log2(o.pitch)), 0.09, r), 0.8); mixInto(b, stab(sr, [64, 67, 71, 76].map((m) => m + 12 * Math.log2(o.pitch)), 0.5, r), 1, Math.round(sr * 0.13)); return b; },
  tick: (sr, o) => wood(sr, 1700 * o.pitch),
  crinkle: (sr, o) => { const b = new Float32Array(Math.round(sr * 0.4 * (o.dur || 1))); const r = rng(21); for (let k = 0; k < 26; k++) mixInto(b, noiseBurst(sr, 0.03, 3000 + (r() + 1) * 2500, 1.5, { decay: 0.004, gain: 0.35, seed: k + 3 }), 1, Math.round((r() + 1) / 2 * (b.length - sr * 0.03))); return b; },
  crash: (sr, o) => mixInto(mixInto(noiseBurst(sr, 0.9, 1800, 0.5, { decay: 0.2, gain: 0.8 }), sweep(sr, 0.3, 120, 50, { decay: 0.1, gain: 0.8 })), SFX.rattle(sr, o), 0.7, Math.round(sr * 0.05)),
  honk: (sr, o) => { const b = new Float32Array(Math.round(sr * 0.32 * (o.dur || 1))); for (const f of [392, 494]) { const s = sweep(sr, b.length / sr, f * o.pitch, f * o.pitch * 0.99, { wave: "square", noise: 0.15, q: 2, gain: 0.25, r: 0.02 }); mixInto(b, s); } const lp = new SVF(sr, 1800, 0.8); for (let i = 0; i < b.length; i++) { lp.step(b[i]); b[i] = lp.lp; } return b; },
  beep: (sr, o) => sweep(sr, 0.12, 1200 * o.pitch, 1200 * o.pitch, { wave: "square", gain: 0.2, r: 0.01 }),
  zoom: (sr, o) => mixInto(sweep(sr, 0.8 * (o.dur || 1), 260 * o.pitch, 120 * o.pitch, { wave: "saw", noise: 0.3, q: 2, a: 0.25, r: 0.3, gain: 0.35 }), noiseBurst(sr, 0.8 * (o.dur || 1), 800, 0.8, { shape: "swell", skew: 0.5, gain: 0.35 })),
  skid: (sr, o) => sweep(sr, 0.5 * (o.dur || 1), 1900 * o.pitch, 1500 * o.pitch, { wave: "saw", noise: 0.6, q: 9, vib: 0.03, vibHz: 50, gain: 0.32, r: 0.08 }),
  "slide-up": (sr, o) => sweep(sr, 0.45 * (o.dur || 1), 500 * o.pitch, 1800 * o.pitch, { vib: 0.02, vibHz: 7, gain: 0.3, curve: 0.8 }),
  "slide-down": (sr, o) => sweep(sr, 0.5 * (o.dur || 1), 1700 * o.pitch, 380 * o.pitch, { vib: 0.02, vibHz: 7, gain: 0.3, curve: 1.2 }),
  stab: (sr, o) => stab(sr, [62, 65, 69, 72].map((m) => m + 12 * Math.log2(o.pitch)), 0.16, rng(31), o.fall ? 1 : 0),
  cymbal: (sr, o) => cymbal(sr, rng(41), 1.8),
  scratch: (sr, o) => sweep(sr, 0.22, 900 * o.pitch, 250 * o.pitch, { wave: "saw", noise: 0.5, q: 3, vib: 0.3, vibHz: 22, gain: 0.35 }),
  step: (sr, o) => mixInto(sweep(sr, 0.09, 150 * o.pitch, 70 * o.pitch, { decay: 0.025, gain: 0.55 }), noiseBurst(sr, 0.05, 900 * o.pitch, 0.9, { decay: 0.01, gain: 0.25 })),
};
const SFX_GAIN = { stretch: 0.9, retract: 0.8, snap: 0.9, flick: 0.9, whoosh: 0.7, swish: 0.6, boing: 0.8, wobble: 0.7, thwack: 1, thud: 0.9, knock: 0.8, clang: 0.85, rattle: 0.8, splash: 0.8, squeak: 0.6, puff: 0.5, pop: 0.6, plop: 0.75, gulp: 0.6, ding: 0.55, sparkle: 0.6, tada: 0.7, tick: 0.5, crinkle: 0.7, crash: 0.9, honk: 0.6, beep: 0.5, zoom: 0.7, skid: 0.6, "slide-up": 0.6, "slide-down": 0.6, stab: 0.7, cymbal: 0.6, scratch: 0.6, step: 0.45 };

// ------------------------------------------------------------------------------------------------ the groove
// chords as semitones above the root (dorian funk): i9 → IV13, and a turnaround bVImaj7 → V7#9
const PROG = [[[0, 3, 7, 10, 14], [5, 9, 12, 16, 19]], [[0, 3, 7, 10, 14], [5, 9, 12, 16, 19]], [[0, 3, 7, 10, 14], [5, 9, 12, 16, 19]], [[-4, 0, 3, 7, 11], [-5, -1, 2, 5, 10]]];
// 16-step patterns: kick, snare (2 = backbeat, 1 = ghost), hats (2 = open), bass [step, semis, len16]
const KICK = [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0], SNARE = [0, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 1], HAT = [1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1];
const BASS = [[[0, 0, 2], [3, 0, 1], [6, 12, 1], [7, 10, 1], [10, 7, 2], [14, 3, 1]], [[0, 5, 2], [3, 5, 1], [6, 17, 1], [8, 15, 1], [10, 12, 2], [13, 10, 1], [14, 7, 1]]];
const HOOK = [[0, 12, 2], [3, 15, 1], [4, 17, 3], [8, 15, 1], [10, 12, 2], [14, 10, 2], [16, 12, 4], [24, 7, 2], [27, 10, 2], [30, 12, 2]]; // [16th, semis over root+12, len]

export function renderScore(spec = {}, sr = 48000, dur = 30) {
  const S = { bpm: 120, key: "D", swing: 0.58, sections: [{ at: 0, mood: "groove" }], stops: [], cues: [], music: 1, sfx: 1, reverb: 0.18, seed: 1, hook: true, ...spec };
  const n = Math.ceil(sr * dur), M = new Bus(sr, n), X = new Bus(sr, n), r = rng(S.seed * 7919 + 13);
  const beat = 60 / S.bpm, s16 = beat / 4, root = KEYS[S.key] ?? 50;
  const at16 = (k) => k * s16 + (k % 2 ? (S.swing - 0.5) * 2 * s16 : 0);
  const kickB = kick(sr, r), snB = snare(sr, r), ghB = snare(sr, r, true), hatB = hat(sr, r), ohB = hat(sr, r, true), shB = shaker(sr, r);
  const secs = [...S.sections].sort((a, b) => a.at - b.at);
  const stopped = (t) => S.stops.some((s) => t >= s && t < s + beat);
  for (let si = 0; si < secs.length; si++) {
    const sec = secs[si], t0 = sec.at, t1 = si + 1 < secs.length ? secs[si + 1].at : dur, g = (sec.gain ?? 1) * S.music, mood = sec.mood;
    if (mood === "silence") continue;
    if (mood === "hit") { M.add(stab(sr, [root + 12, root + 15, root + 19, root + 22], 0.2, r), t0, 0.5 * g); M.add(cymbal(sr, r), t0, 0.35 * g); M.add(kickB, t0, 0.8 * g); continue; }
    const bars = Math.ceil((t1 - t0) / (beat * 4) - 1e-6);
    for (let bar = 0; bar < bars; bar++) {
      const tb = t0 + bar * beat * 4, ch = PROG[Math.floor(bar / 2) % 4][bar % 2], bp = BASS[bar % 2];
      const last = mood === "outro" && tb + beat * 4 >= t1 - 1e-6;
      for (let k = 0; k < 16; k++) {
        const t = tb + at16(k); if (t >= t1 || stopped(t)) continue;
        if (last && k >= 1) break;
        const v = 0.85 + 0.15 * (r() + 1) / 2;
        if (mood !== "tiptoe") {
          if (KICK[k]) M.add(kickB, t, 0.9 * g * v);
          if (mood !== "intro" && SNARE[k] === 2) M.add(snB, t, 0.6 * g * v, 0.05);
          if (mood !== "intro" && SNARE[k] === 1) M.add(ghB, t, 0.6 * g * v, 0.05);
          if (HAT[k]) M.add(HAT[k] === 2 ? ohB : hatB, t, (k % 2 ? 0.55 : 0.8) * g * v, 0.3);
          if (mood === "groove" || mood === "outro") M.add(shB, t, 0.6 * g * v, -0.4);
        } else {
          if (k % 4 === 0) M.add(wood(sr, k % 8 ? 1450 : 1150), t, 0.5 * g, 0.4);
          if (k === 4 || k === 12) M.add(hatB, t, 0.4 * g, 0.3);
        }
      }
      // bass
      for (const [k, semi, l] of bp) {
        const t = tb + at16(k); if (t >= t1 || stopped(t) || (last && k > 0)) continue;
        const note = root - 12 + semi + (ch[0] < 0 ? ch[0] : 0);
        M.add(mood === "tiptoe" ? pizz(sr, note + 12, r) : bass(sr, note, l * s16 * 0.9, r), t, (mood === "tiptoe" ? 0.55 : 0.75) * g, -0.05);
      }
      // keys: off-beat chord stabs ("chank") on the and of 2 and 4; held in the last bar of an outro
      if (mood === "groove" || mood === "outro") {
        const voic = ch.map((c) => root + 12 + c);
        for (const k of last ? [0] : [2, 6, 10, 14]) { const t = tb + at16(k); if (t < t1 && !stopped(t)) M.add(epiano(sr, voic, last ? 1.6 : k === 6 || k === 14 ? s16 * 1.6 : s16 * 0.9, r), t, (last ? 0.7 : 0.45) * g, 0.25); }
      }
      if (last) { M.add(stab(sr, [root + 12, root + 15, root + 19, root + 22, root + 26], 0.35, r), tb, 0.55 * g); M.add(cymbal(sr, r, 2.2), tb, 0.4 * g); }
      // the whistled hook over every other phrase of a groove
      if (S.hook && (mood === "groove" || mood === "intro") && bar % 4 < 2) {
        const off = (bar % 4) * 16;
        for (const [k, semi, l] of HOOK) { if (k < off || k >= off + 16) continue; const t = tb + at16(k - off); if (t >= t1 - 0.05 || stopped(t)) continue; M.add(whistle(sr, root + 12 + semi + (ch[0] < 0 ? ch[0] : 0), l * s16 * 0.92, r, k === 4 ? root + 12 + semi - 2 : null), t, (mood === "intro" ? 0.35 : 0.55) * g, -0.15); }
      }
    }
    // a one-beat fill into the next section
    if (si + 1 < secs.length && secs[si + 1].mood !== "silence" && mood !== "hit") { const tf = t1 - beat; for (let k = 0; k < 4; k++) M.add(snB, tf + k * s16, (0.3 + k * 0.12) * g, 0.05); }
  }
  // foley
  for (const c of S.cues) {
    const fn = SFX[c.kind]; if (!fn) { if (typeof console !== "undefined") console.warn("unknown sfx", c.kind); continue; }
    const buf = fn(sr, { pitch: c.pitch ?? 1, dur: c.dur, fall: c.fall });
    X.add(buf, c.t, (c.gain ?? 1) * (SFX_GAIN[c.kind] ?? 0.7) * S.sfx, c.pan ?? 0);
  }
  // reverb send (both buses) + sum
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = M.L[i] + X.L[i]; R[i] = M.R[i] + X.R[i]; }
  if (S.reverb > 0) reverb(L, R, sr, S.reverb);
  master(L, R, sr, -14, -1);
  return { L, R };
}

// Schroeder/Freeverb-style stereo room
function reverb(L, R, sr, wet) {
  const combs = [1557, 1617, 1491, 1422].map((d) => Math.round((d * sr) / 44100)), aps = [556, 441].map((d) => Math.round((d * sr) / 44100));
  for (const [ch, spread] of [[L, 0], [R, 23]]) {
    const inp = Float32Array.from(ch), out = new Float32Array(ch.length);
    for (const d0 of combs) { const d = d0 + spread, buf = new Float32Array(d); let j = 0, lp = 0; for (let i = 0; i < inp.length; i++) { const y = buf[j]; lp = y * 0.7 + lp * 0.3; buf[j] = inp[i] * 0.25 + lp * 0.8; out[i] += y; j = (j + 1) % d; } }
    for (const d0 of aps) { const d = d0 + spread, buf = new Float32Array(d); let j = 0; for (let i = 0; i < out.length; i++) { const b = buf[j], y = -out[i] + b; buf[j] = out[i] + b * 0.5; out[i] = y; j = (j + 1) % d; } }
    for (let i = 0; i < ch.length; i++) ch[i] = ch[i] * (1 - wet * 0.4) + out[i] * wet * 0.25;
  }
}

/** BS.1770 integrated loudness (K-weighting, 400 ms blocks, −70 / −10 gates) of a stereo pair, in LUFS */
export function lufs(L, R, sr) {
  const kw = (x) => { // high shelf + RLB high-pass (48 kHz coefficients, close enough at 44.1)
    const bq = (x, b, a) => { const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; };
    return bq(bq(x, [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]), [1, -2, 1], [1, -1.99004745483398, 0.99007225036621]);
  };
  const a = kw(L), b = kw(R), blk = Math.round(sr * 0.4), hop = Math.round(sr * 0.1), z = [];
  for (let i = 0; i + blk <= a.length; i += hop) { let s = 0; for (let j = i; j < i + blk; j++) s += a[j] * a[j] + b[j] * b[j]; z.push(s / blk); }
  const L0 = (m) => -0.691 + 10 * Math.log10(m + 1e-12), abs = z.filter((m) => L0(m) > -70); if (!abs.length) return -70;
  const rel = L0(abs.reduce((x, y) => x + y, 0) / abs.length) - 10, g = abs.filter((m) => L0(m) > rel);
  return L0(g.reduce((x, y) => x + y, 0) / g.length);
}
/** normalise to target LUFS, then a soft-knee peak limiter at ceil dBFS (lookahead 5 ms) */
export function master(L, R, sr, target = -14, ceil = -1) {
  const k = dbg(target - lufs(L, R, sr)); for (let i = 0; i < L.length; i++) { L[i] *= k; R[i] *= k; }
  const c = dbg(ceil), look = Math.round(sr * 0.005), rel = Math.exp(-1 / (sr * 0.08)); let gEnv = 1;
  const peak = new Float32Array(L.length); for (let i = 0; i < L.length; i++) peak[i] = Math.max(Math.abs(L[i]), Math.abs(R[i]));
  for (let i = 0; i < L.length; i++) {
    let p = 0; for (let j = i; j < Math.min(L.length, i + look); j += 4) p = Math.max(p, peak[j]);
    const want = p > c ? c / p : 1; gEnv = want < gEnv ? want : gEnv * rel + want * (1 - rel); L[i] *= gEnv; R[i] *= gEnv;
    L[i] = clamp(L[i], -c, c); R[i] = clamp(R[i], -c, c);
  }
}

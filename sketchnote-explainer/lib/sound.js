// sketchnote-explainer · sound.js — the soundtrack, synthesised in plain JS (no files, no Web Audio graph), so the live page
// and scripts/render.mjs make the same audio: a soft felt-piano bed (I–V–vi–IV, slow) with a small chime on every beat and
// a warm chord at the finale, plus the pencil itself — a dry scratch while a line or a word is drawn, a softer swish while
// colour goes in, a squeak for the highlighter.
//
//   renderScore({ cues, dur, finaleAt, beats, music }, sampleRate) → [Float32Array L, Float32Array R]
//   cues  = film.cues  ([{ t, dur, type: 'line' | 'guide' | 'text' | 'wash' | 'mark' | 'anim', len }])
//   beats = film.shots ([{ start }]) · music = { key: 'F', bpm: 76, volume: 1, pencil: 1 } or false (pencil only)

const TAU = Math.PI * 2;
const KEYS = { C: 60, 'C#': 61, Db: 61, D: 62, Eb: 63, E: 64, F: 65, 'F#': 66, Gb: 66, G: 67, Ab: 68, A: 69, Bb: 70, B: 71 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function rnd(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; }; }
function noise1(x, seed) { const i = Math.floor(x), f = x - i, h = n => { let v = Math.imul((n | 0) ^ seed, 0x9E3779B1); v ^= v >>> 15; v = Math.imul(v, 0x85EBCA6B); v ^= v >>> 13; return (v >>> 0) / 4294967296; }; const u = f * f * (3 - 2 * f); return h(i) * (1 - u) + h(i + 1) * u; }
/** RBJ biquad band-pass / low-pass / high-pass */
function biquad(type, f, q, sr) {
  const w = TAU * f / sr, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
  let b0, b1, b2; const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
  if (type === 'bp') { b0 = a; b1 = 0; b2 = -a; } else if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return x => { const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}

export function renderScore(spec, sr = 48000) {
  const dur = spec.dur || 30, N = Math.ceil(dur * sr), L = new Float32Array(N), R = new Float32Array(N);
  const mL = new Float32Array(N), mR = new Float32Array(N);
  const music = spec.music === false ? null : { key: 'F', bpm: 76, volume: 1, pencil: 1, ...(spec.music || {}) };
  const pencilVol = (spec.music && spec.music.pencil != null) ? spec.music.pencil : 1;
  const put = (A, B, i, v, pan) => { if (i >= 0 && i < N) { A[i] += v * Math.cos((pan + 1) * Math.PI / 4); B[i] += v * Math.sin((pan + 1) * Math.PI / 4); } };

  // ── the felt piano: a few harmonics, a soft hammer, a decay that is faster for high notes ──
  const note = (t, m, v, len = 2.2, pan = 0) => {
    const f = mtof(m), i0 = Math.floor(t * sr), n = Math.floor(len * sr), dec = 1.1 + 40 / f, H = [[1, 1], [2, .42], [3, .16], [4, .07]];
    for (let i = 0; i < n; i++) {
      const tt = i / sr, a = Math.min(1, tt / .008) * Math.exp(-tt / dec) * (1 - Math.max(0, (tt - len + .3) / .3));
      let s = 0; for (const [h, g] of H) s += g * Math.sin(TAU * f * h * tt * (1 + (h - 1) * .0007)) * Math.exp(-tt * h * .9);
      put(mL, mR, i0 + i, s * a * v, pan);
    }
  };
  if (music) {
    const root = KEYS[music.key] ?? 65, spb = 60 / music.bpm, bar = spb * 4, vol = .16 * music.volume;
    const prog = [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]];               // I V vi IV
    const arp = [0, 2, 1, 2, 0, 1, 2, 1], r = rnd(9);
    const end = spec.finaleAt != null ? spec.finaleAt : dur - 2;
    for (let b = 0, t = .4; t < end; b++, t += bar) {
      const ch = prog[b % 4];
      note(t, root - 24 + (ch[0] % 12), vol * 1.1, bar * 1.05, 0);                 // bass
      ch.forEach((d, j) => note(t + j * .012, root - 12 + d, vol * .55, bar * .95, (j - 1) * .3));
      for (let e = 0; e < 8; e++) { if (b === 0 && e < 2) continue; const d = ch[arp[(e + b) % 8]] + (e % 4 === 3 ? 12 : 0); if (r() > .82) continue; note(t + e * spb / 2, root + d, vol * (e % 2 ? .32 : .45), spb * 2.2, (r() * .8)); }
    }
    // a chime at each beat's start (pentatonic, stepping upward)
    const penta = [0, 2, 4, 7, 9, 12, 14, 16];
    (spec.beats || []).forEach((b, i) => { if (b.start > .2 && (spec.finaleAt == null || b.start < spec.finaleAt)) note(b.start + .05, root + 12 + penta[i % penta.length], vol * .5, 1.8, .35); });
    // the finale: a long warm chord, then a last high note
    if (spec.finaleAt != null) {
      const t = spec.finaleAt;
      [0, 4, 7, 12, 16].forEach((d, j) => note(t + j * .06, root - 12 + d, vol * .9, Math.max(3, dur - t), (j - 2) * .25));
      note(t, root - 24, vol * 1.2, Math.max(3, dur - t), 0);
      note(t + 1.6, root + 24, vol * .45, 2.5, .2);
    }
    // a plain Schroeder reverb on the music
    const room = (A, off) => {
      const combs = [1557, 1617, 1491, 1422].map(d => ({ b: new Float32Array(Math.round((d + off) * sr / 44100)), i: 0 })), aps = [225, 556].map(d => ({ b: new Float32Array(Math.round(d * sr / 44100)), i: 0 }));
      const out = new Float32Array(N);
      for (let n = 0; n < N; n++) {
        let s = 0; const x = A[n] * .3;
        for (const c of combs) { const y = c.b[c.i]; c.b[c.i] = x + y * .8; c.i = (c.i + 1) % c.b.length; s += y; }
        for (const a of aps) { const y = a.b[a.i]; a.b[a.i] = s + y * .5; a.i = (a.i + 1) % a.b.length; s = y - s; }
        out[n] = A[n] + s * .32;
      }
      return out;
    };
    const rl = room(mL, 0), rr = room(mR, 23);
    // fade the bed in and out
    for (let n = 0; n < N; n++) { const t = n / sr, f = Math.min(1, t / 1.2) * Math.min(1, (dur - t) / 1.5); L[n] += rl[n] * f; R[n] += rr[n] * f; }
  }

  // ── the pencil ──
  const r = rnd(4242);
  for (const c of spec.cues || []) {
    if (c.type === 'anim') continue;
    const type = c.type, i0 = Math.floor(c.t * sr), n = Math.floor(c.dur * sr), seed = (i0 * 31) | 0;
    const f = type === 'wash' ? biquad('lp', 1100, .7, sr) : type === 'mark' ? biquad('bp', 1700, 2.5, sr) : biquad('bp', type === 'guide' ? 4200 : 3300, .9, sr);
    const hp = biquad('hp', 500, .7, sr);
    const lvl = (type === 'line' ? .5 : type === 'text' ? .42 : type === 'guide' ? .22 : type === 'wash' ? .5 : .3) * pencilVol;
    const rate = type === 'text' ? 16 : type === 'wash' ? 9 : 28;
    for (let i = 0; i < n; i++) {
      const tt = i / sr, env = Math.min(1, tt / .012, (c.dur - tt) / .03);
      const grit = type === 'wash' ? .6 + .4 * Math.sin(TAU * rate * tt) : .35 + .65 * noise1(tt * rate, seed);
      const v = hp(f(r())) * env * grit * lvl;
      put(L, R, i0 + i, v, .25);
    }
    // the tap of the tip touching down
    if (type === 'line' || type === 'text') for (let i = 0; i < sr * .012; i++) put(L, R, i0 + i, Math.sin(TAU * 1900 * i / sr) * Math.exp(-i / (sr * .002)) * .05 * pencilVol, .25);
  }
  // peak-normalise to −1 dBFS
  let pk = 0; for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  if (pk > 0) { const g = .89 / pk; for (let i = 0; i < N; i++) { L[i] *= g; R[i] *= g; } }
  return [L, R];
}

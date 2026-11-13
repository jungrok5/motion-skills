// lineage-glow · score.js — the synthesised score, rendered offline to two Float32Arrays (pure: no DOM, no Web Audio,
// so the same code plays live in the page and writes the WAV in Node). Seeded, deterministic.
// A score is plain data; every list is optional:
//   { gain: .8, reverb: .45, key: 62, scale: [0, 2, 4, 7, 9],
//     pad:     [[t, dur, [midi, …], vel], …]   warm slow chord (attack ~1.5 s) — the bed, one chord per caption or two
//     bell:    [[t, midi, vel], …]             glassy bell / felt-piano note — a node lights, a name appears
//     sub:     [[t, dur, midi, vel], …]        low sine swell — weight under a reveal
//     rise:    [[t, dur, vel], …]              airy noise riser ending at t + dur — into a climax
//     hit:     [[t, vel], …]                   soft boom + bloom of bells — the reveal itself
//     shimmer: [[t0, t1, vel, density], …]     scattered high bells from the scale — countless lights turning on
//     tick:    [[t, vel], …]                   tiny tick — a counter step
//     air:     [[t0, t1, vel], …] }            breath of filtered noise — silence that is not empty
import { rng, clamp } from './core.js';

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

export function renderScore(S, sr = 44100, dur = 60) {
  const n = Math.ceil(dur * sr), L = new Float32Array(n), R = new Float32Array(n), r = rng(1234);
  const span = (t, d) => [Math.max(0, Math.floor(t * sr)), Math.min(n, Math.ceil((t + d) * sr))];
  const add = (i, v, pan = 0) => { L[i] += v * (1 - pan) * .5 * 2 ** .5; R[i] += v * (1 + pan) * .5 * 2 ** .5; };

  // pad: 3 partials × 2 detuned voices panned apart, slow attack and release
  for (const [t, d, notes, vel = .5] of S.pad || []) {
    const atk = Math.min(1.6, d * .4), rel = 1.8, [a, b] = span(t, d + rel);
    for (const m of notes) {
      const f = mtof(m), amp = vel * .06 / Math.sqrt(notes.length) * (m < 50 ? 1.3 : 1);
      for (const [det, pan] of [[.9985, -.6], [1.0015, .6]]) {
        const parts = [[1, 1], [2, .32], [3, .1], [4, .04]];
        for (const [h, ha] of parts) {
          const w = 2 * Math.PI * f * h * det / sr; let ph = r() * 6.28;
          for (let i = a; i < b; i++) {
            const tt = i / sr - t, e = tt < atk ? Math.sin(tt / atk * Math.PI / 2) ** 2 : tt < d ? 1 : Math.max(0, 1 - (tt - d) / rel) ** 2;
            const trem = 1 + .06 * Math.sin(tt * 1.3 + h);
            add(i, Math.sin(ph) * amp * ha * e * trem, pan); ph += w;
          }
        }
      }
    }
  }
  // bell: inharmonic partials with separate decays
  const bell = (t, m, vel = .5, pan = 0) => {
    const f = mtof(m), parts = [[1, 1, 2.6], [2.0, .42, 1.4], [3.01, .14, .8], [4.18, .1, .5], [5.43, .05, .3]], [a, b] = span(t, 4);
    for (const [h, ha, dk] of parts) {
      const w = 2 * Math.PI * f * h / sr; let ph = 0;
      for (let i = a; i < b; i++) { const tt = i / sr - t, e = Math.exp(-tt / dk) * Math.min(1, tt * 400); add(i, Math.sin(ph) * vel * .09 * ha * e, pan); ph += w; }
    }
  };
  for (const [t, m, vel] of S.bell || []) bell(t, m, vel, (r() - .5) * .5);
  // sub swell
  for (const [t, d, m, vel = .5] of S.sub || []) {
    const f = mtof(m), [a, b] = span(t, d), w = 2 * Math.PI * f / sr; let ph = 0;
    for (let i = a; i < b; i++) { const u = clamp((i / sr - t) / d), e = Math.sin(Math.PI * u) ** 1.5; add(i, Math.sin(ph) * vel * .16 * e); ph += w; }
  }
  // noise riser: one-pole low-pass sweeping up, amplitude rising, cut at the end
  for (const [t, d, vel = .5] of S.rise || []) {
    const [a, b] = span(t, d); let y1 = 0, y2 = 0;
    for (let i = a; i < b; i++) {
      const u = clamp((i / sr - t) / d), fc = 200 + 5000 * u * u, k = 1 - Math.exp(-2 * Math.PI * fc / sr), x = r() * 2 - 1;
      y1 += k * (x - y1); y2 += k * (r() * 2 - 1 - y2);
      const e = u ** 2.2 * vel * .12; L[i] += y1 * e; R[i] += y2 * e;
    }
  }
  // hit: falling sine boom + a bloom of bells on the scale
  const key = S.key ?? 62, scale = S.scale ?? [0, 2, 4, 7, 9];
  for (const [t, vel = .7] of S.hit || []) {
    const [a, b] = span(t, 3.5); let ph = 0;
    for (let i = a; i < b; i++) { const tt = i / sr - t, f = 38 + 50 * Math.exp(-tt * 5); ph += 2 * Math.PI * f / sr; add(i, Math.sin(ph) * vel * .32 * Math.exp(-tt * 1.4) * Math.min(1, tt * 200)); }
    [0, 7, 12, 16, 19, 24].forEach((iv, j) => bell(t + j * .045, key + iv, vel * .35, (j % 2 ? 1 : -1) * .4));
  }
  // shimmer: scattered high notes from the scale
  for (const [t0, t1, vel = .3, dens = 6] of S.shimmer || []) {
    const count = Math.round((t1 - t0) * dens);
    for (let j = 0; j < count; j++) { const tt = t0 + r() * (t1 - t0), oct = 12 * (1 + Math.floor(r() * 2)), m = key + oct + scale[Math.floor(r() * scale.length)]; bell(tt, m, vel * (.4 + r() * .6), (r() - .5) * 1.4); }
  }
  // tick
  for (const [t, vel = .3] of S.tick || []) {
    const [a, b] = span(t, .06), w = 2 * Math.PI * 2400 / sr; let ph = 0;
    for (let i = a; i < b; i++) { const tt = i / sr - t; add(i, Math.sin(ph) * vel * .08 * Math.exp(-tt * 90), .1); ph += w; }
  }
  // air
  for (const [t0, t1, vel = .3] of S.air || []) {
    const [a, b] = span(t0, t1 - t0); let y1 = 0, y2 = 0; const k = 1 - Math.exp(-2 * Math.PI * 900 / sr);
    for (let i = a; i < b; i++) { const u = clamp((i / sr - t0) / (t1 - t0)), e = Math.sin(Math.PI * u) * vel * .05; y1 += k * (r() * 2 - 1 - y1); y2 += k * (r() * 2 - 1 - y2); L[i] += y1 * e; R[i] += y2 * e; }
  }
  // reverb (Freeverb-lite: 4 damped combs + 2 allpasses per channel)
  const wet = S.reverb ?? .45;
  if (wet > 0) {
    const sc = sr / 44100, verb = (src, off) => {
      const out = new Float32Array(n), combs = [1557, 1617, 1491, 1422].map(l => ({ b: new Float32Array(Math.round((l + off) * sc)), i: 0, f: 0 }));
      for (let i = 0; i < n; i++) {
        const x = src[i] * .25; let y = 0;
        for (const c of combs) { const o = c.b[c.i]; c.f = o * .75 + c.f * .25; c.b[c.i] = x + c.f * .86; c.i = (c.i + 1) % c.b.length; y += o; }
        out[i] = y;
      }
      for (const l of [556, 441]) { const b = new Float32Array(Math.round((l + off) * sc)); let j = 0; for (let i = 0; i < n; i++) { const o = b[j], x = out[i]; b[j] = x + o * .5; out[i] = o - x; j = (j + 1) % b.length; } }
      return out;
    };
    const wl = verb(L, 0), wr = verb(R, 23);
    for (let i = 0; i < n; i++) { L[i] = L[i] * (1 - wet * .5) + wl[i] * wet; R[i] = R[i] * (1 - wet * .5) + wr[i] * wet; }
  }
  // master: gain, fades, peak ≤ .9
  const g = S.gain ?? .8; let peak = 0;
  for (let i = 0; i < n; i++) { const u = i / sr, f = Math.min(1, u / .5, (dur - u) / 1.5); L[i] *= g * f; R[i] *= g * f; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
  if (peak > .9) { const k = .9 / peak; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } }
  return [L, R];
}

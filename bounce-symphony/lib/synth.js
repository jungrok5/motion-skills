// bounce-symphony · synth.js — every strike rendered to stereo PCM, deterministically (same hits → same samples).
// The same file runs in the page (live sound) and in Node (scripts/audio.mjs → WAV), so picture and sound share one clock.
// A hit: { t, kind, midi, vel (0–1, from the ball's impact speed), pan (−1…1) }. Kinds are struck, ringing things:
// modal synthesis (a sum of decaying partials at each instrument's own ratios) plus a short contact noise.
// Extra kinds for the machine itself: 'latch' (a dropper opening) and 'catch' (a ball landing in its cup).
export const KINDS = ['marimba', 'xylophone', 'vibraphone', 'glockenspiel', 'steelpan', 'bowl', 'gong', 'cymbal', 'drum', 'woodblock', 'kalimba', 'latch', 'catch'];

function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// an exponentially decaying sine by recurrence (cheap and exact)
function partial(out, sr, f, amp, T, phase, n0 = 0) {
  if (f >= 0.47 * sr || f <= 0 || amp === 0) return;
  const n = Math.min(out.length - n0, Math.ceil(T * 7 * sr));
  const w = (2 * Math.PI * f) / sr, r = Math.exp(-1 / (T * sr)), c = 2 * r * Math.cos(w), r2 = r * r;
  let y1 = (amp * Math.sin(phase - w)) / r, y2 = (amp * Math.sin(phase - 2 * w)) / r2;
  for (let i = 0; i < n; i++) { const y = c * y1 - r2 * y2; y2 = y1; y1 = y; out[n0 + i] += y; }
}
// a short burst of filtered noise: the contact of ball on pad
function noise(out, sr, rand, amp, T, lp = 0.3, hp = 0) {
  const n = Math.min(out.length, Math.ceil(T * 6 * sr)), k = Math.exp(-1 / (T * sr));
  let e = amp, y = 0, x1 = 0, h = 0;
  for (let i = 0; i < n; i++) { const x = rand() * 2 - 1; y += lp * (x - y); h = hp ? y - x1 : y; x1 = y; out[i] += h * e; e *= k; }
}
const modes = (out, sr, rand, f, list, vel) => { for (const [r, a, T, det] of list) { partial(out, sr, f * r, a, T, rand() * 6.28); if (det) partial(out, sr, f * r * det, a * 0.7, T, rand() * 6.28); } };

const INST = {
  marimba(o, sr, rand, f, v) { const T = clamp(0.9 * Math.sqrt(262 / f), 0.22, 2.2); modes(o, sr, rand, f, [[1, 1, T], [3.99, 0.32 * v, T * 0.22], [10.65, 0.1 * v, T * 0.07]]); noise(o, sr, rand, 0.12 * v, 0.004, 0.25); },
  xylophone(o, sr, rand, f, v) { const T = clamp(0.42 * Math.sqrt(262 / f), 0.12, 0.8); modes(o, sr, rand, f, [[1, 1, T], [3.0, 0.5 * v, T * 0.45], [6.1, 0.18 * v, T * 0.2]]); noise(o, sr, rand, 0.2 * v, 0.003, 0.6); },
  vibraphone(o, sr, rand, f, v) { modes(o, sr, rand, f, [[1, 1, 2.6], [4, 0.22 * v, 0.6], [10, 0.05 * v, 0.12]]); noise(o, sr, rand, 0.08 * v, 0.003, 0.4); for (let i = 0; i < o.length; i++) o[i] *= 1 - 0.28 * (0.5 - 0.5 * Math.cos((2 * Math.PI * 5.2 * i) / sr)); },
  glockenspiel(o, sr, rand, f, v) { modes(o, sr, rand, f, [[1, 1, 2.0], [2.76, 0.4 * v, 0.9], [5.4, 0.18 * v, 0.45], [8.93, 0.08 * v, 0.22]]); noise(o, sr, rand, 0.1 * v, 0.002, 0.8); },
  steelpan(o, sr, rand, f, v) { modes(o, sr, rand, f, [[1, 1, 1.1, 1.003], [2, 0.55 * v, 0.7], [3, 0.22 * v, 0.45, 1.004], [4.03, 0.1 * v, 0.25]]); noise(o, sr, rand, 0.06 * v, 0.003, 0.3); },
  bowl(o, sr, rand, f, v) { modes(o, sr, rand, f, [[1, 1, 5.5, 1.0018], [2.71, 0.45, 3.2, 1.0012], [5.15, 0.22 * v, 1.8], [8.43, 0.08 * v, 0.9]]); noise(o, sr, rand, 0.05 * v, 0.003, 0.5); },
  gong(o, sr, rand, f, v) { modes(o, sr, rand, f, [[1, 1, 4.5], [1.47, 0.55, 3.4, 1.002], [2.09, 0.45, 2.6], [2.56, 0.32 * v, 2.0, 1.003], [3.21, 0.22 * v, 1.5], [4.32, 0.14 * v, 1.0], [5.8, 0.08 * v, 0.6]]); noise(o, sr, rand, 0.1 * v, 0.01, 0.15); },
  cymbal(o, sr, rand, f, v) { noise(o, sr, rand, 0.6 * v, 0.55 + 0.4 * v, 0.9, 1); modes(o, sr, rand, f * 4, [[1, 0.25, 1.4], [1.37, 0.2, 1.1], [2.13, 0.15, 0.9], [2.9, 0.1, 0.7]]); },
  drum(o, sr, rand, f, v) {
    const n = Math.min(o.length, Math.ceil(0.9 * sr)); let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / sr, ff = f * (1 + 1.2 * Math.exp(-t / 0.025)); ph += (2 * Math.PI * ff) / sr; o[i] += Math.sin(ph) * Math.exp(-t / 0.28); }
    modes(o, sr, rand, f, [[1.59, 0.25, 0.15], [2.14, 0.15, 0.1]]); noise(o, sr, rand, 0.3 * v, 0.012, 0.35);
  },
  woodblock(o, sr, rand, f, v) { modes(o, sr, rand, f, [[1, 1, 0.07], [2.31, 0.45, 0.045], [3.72, 0.2, 0.025]]); noise(o, sr, rand, 0.25 * v, 0.002, 0.7); },
  kalimba(o, sr, rand, f, v) { modes(o, sr, rand, f, [[1, 1, 1.6], [5.4, 0.25 * v, 0.14], [13.2, 0.08 * v, 0.05]]); noise(o, sr, rand, 0.05 * v, 0.002, 0.5); },
  latch(o, sr, rand) { noise(o, sr, rand, 0.5, 0.004, 0.8, 1); partial(o, sr, 2400, 0.25, 0.012, 0); },
  catch(o, sr, rand) { partial(o, sr, 190, 0.8, 0.05, 0); partial(o, sr, 610, 0.3, 0.03, 0); noise(o, sr, rand, 0.3, 0.008, 0.3); for (const [d, a] of [[0.07, 0.25], [0.12, 0.1]]) partial(o, sr, 640, a, 0.02, 0, Math.round(d * sr)); },
};
const TAIL = { marimba: 3, xylophone: 2, vibraphone: 9, glockenspiel: 7, steelpan: 4, bowl: 14, gong: 12, cymbal: 6, drum: 2, woodblock: 0.6, kalimba: 5, latch: 0.2, catch: 0.5 };
const LEVEL = { marimba: 1, xylophone: 0.8, vibraphone: 0.8, glockenspiel: 0.55, steelpan: 0.8, bowl: 0.7, gong: 0.9, cymbal: 0.5, drum: 1.1, woodblock: 0.7, kalimba: 0.8, latch: 0.08, catch: 0.15 };

function freeverb(L, R, sr, { mix = 0.22, size = 0.84, damp = 0.4 } = {}) {
  const sc = sr / 44100, combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], aps = [556, 441, 341, 225];
  const n = L.length, wl = new Float32Array(n), wr = new Float32Array(n);
  for (const [out, spread] of [[wl, 0], [wr, 23]]) {
    for (const c of combs) {
      const N = Math.round((c + spread) * sc), buf = new Float32Array(N); let idx = 0, f = 0;
      for (let i = 0; i < n; i++) { const y = buf[idx]; f = y * (1 - damp) + f * damp; buf[idx] = (L[i] + R[i]) * 0.015 + f * size; out[i] += y; idx = idx + 1 === N ? 0 : idx + 1; }
    }
    for (const a of aps) {
      const N = Math.round((a + spread) * sc), buf = new Float32Array(N); let idx = 0;
      for (let i = 0; i < n; i++) { const b = buf[idx], x = out[i]; out[i] = -x + b; buf[idx] = x + b * 0.5; idx = idx + 1 === N ? 0 : idx + 1; }
    }
  }
  for (let i = 0; i < n; i++) { L[i] = L[i] * (1 - mix * 0.5) + wl[i] * mix; R[i] = R[i] * (1 - mix * 0.5) + wr[i] * mix; }
}

// spec: { duration, hits: [{ t, kind, midi, vel, pan, gain }], gains: { kind: g }, reverb: { mix, size, damp }, peak }
export function renderAudio(spec, { sampleRate = 44100 } = {}) {
  const sr = sampleRate, N = Math.ceil(spec.duration * sr) + 1, L = new Float32Array(N), R = new Float32Array(N);
  const scratch = new Float32Array(Math.ceil(15 * sr));
  spec.hits.forEach((h, idx) => {
    const fn = INST[h.kind]; if (!fn) throw new Error(`unknown sound kind "${h.kind}" (have ${KINDS.join(', ')})`);
    const i0 = Math.round(h.t * sr); if (i0 >= N || i0 < 0) return;
    const used = Math.min(Math.ceil((TAIL[h.kind] || 3) * sr), N - i0), o = scratch.subarray(0, used); o.fill(0);
    const v = clamp(h.vel ?? 0.7, 0.05, 1);
    fn(o, sr, rng(1 + idx * 7919 + (h.midi | 0) * 131), mtof(h.midi ?? 60), v);
    const fade = Math.min(used, Math.round(0.05 * sr)); for (let i = 0; i < fade; i++) o[used - 1 - i] *= i / fade;
    const amp = 0.14 * (LEVEL[h.kind] ?? 1) * (spec.gains?.[h.kind] ?? 1) * (h.gain ?? 1) * v ** 1.2;
    const pan = clamp(h.pan ?? 0, -1, 1), gl = Math.cos(((pan + 1) * Math.PI) / 4) * amp, gr = Math.sin(((pan + 1) * Math.PI) / 4) * amp;
    for (let i = 0; i < used; i++) { const s = o[i]; if (s) { L[i0 + i] += s * gl; R[i0 + i] += s * gr; } }
  });
  freeverb(L, R, sr, spec.reverb);
  let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = peak > 0 ? (spec.peak ?? 0.85) / peak : 1;
  for (let i = 0; i < N; i++) { L[i] *= g; R[i] *= g; }
  const fade = Math.min(N, Math.round(0.4 * sr)); for (let i = 0; i < fade; i++) { const k = i / fade; L[N - 1 - i] *= k; R[N - 1 - i] *= k; }
  return { sampleRate: sr, L, R };
}

export function wav({ sampleRate, L, R }) {
  const n = L.length, buf = new ArrayBuffer(44 + n * 4), dv = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
  dv.setUint32(24, sampleRate, true); dv.setUint32(28, sampleRate * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) { dv.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); dv.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
  return new Uint8Array(buf);
}

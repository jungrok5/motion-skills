// luminous-score · synth.js — renders the notes to stereo PCM, deterministically (same notes → same samples).
// The same file runs in the page (live sound) and in Node (scripts/audio.mjs → WAV), so picture and sound share one clock.
// Instruments: strings (violin / viola / cello / bass / section), piano, pluck (harpsichord, harp, guitar), flute, organ,
// celesta / bell, horn. Each note: { voice, midi, t0, t1, vel, orn: ['tr','st','ac'] }.
export const INSTRUMENTS = ['strings', 'piano', 'pluck', 'flute', 'organ', 'celesta', 'bell', 'horn'];

function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const TABLES = new Map(), TN = 2048;
function table(amps) {
  const key = amps.map((a) => a.toFixed(4)).join(','); if (TABLES.has(key)) return TABLES.get(key);
  const t = new Float32Array(TN + 1); let peak = 0;
  for (let i = 0; i <= TN; i++) { let s = 0; for (let h = 0; h < amps.length; h++) if (amps[h]) s += amps[h] * Math.sin((2 * Math.PI * (h + 1) * i) / TN); t[i] = s; peak = Math.max(peak, Math.abs(s)); }
  for (let i = 0; i <= TN; i++) t[i] /= peak || 1;
  TABLES.set(key, t); return t;
}
const harmonics = (f, sr, fn, max = 40) => { const n = Math.max(1, Math.min(max, Math.floor((0.45 * sr) / f))); return Array.from({ length: n }, (_, i) => fn(i + 1)); };

// wavetable voice with vibrato, optional trill and a one-pole low-pass
function wt(out, i0, n, sr, { f, amps, env, vib = 0, vibRate = 5.4, vibDelay = 0.2, trill = 0, lp = 8000, detune = 0, phase = 0, noise = 0, rand }) {
  const t = table(amps); let ph = phase, y = 0; const a = Math.exp((-2 * Math.PI * lp) / sr), vr = vibRate + (rand() - 0.5) * 0.6, vp = rand() * 6.28;
  const det = 2 ** (detune / 1200);
  for (let i = 0; i < n; i++) {
    const tt = i / sr, e = env(tt); if (e <= 0 && tt > 0.05) { if (i > n - 2) break; continue; }
    let ff = f * det * (1 + vib * Math.min(1, Math.max(0, (tt - vibDelay) / 0.3)) * Math.sin(2 * Math.PI * vr * tt + vp));
    if (trill) ff *= Math.sin(2 * Math.PI * 7 * tt) > 0 ? trill : 1;
    ph += (ff * TN) / sr; ph %= TN;
    const j = ph | 0, fr = ph - j; let s = t[j] + (t[j + 1] - t[j]) * fr;
    if (noise) s += noise * (rand() * 2 - 1);
    y = (1 - a) * s + a * y;
    out[i0 + i] += y * e;
  }
}
// exponentially decaying sine by recurrence (cheap): piano, bells
function partial(out, i0, n, sr, f, amp, T, phase, gate, rel) {
  if (f >= 0.48 * sr) return;
  const w = (2 * Math.PI * f) / sr, r = Math.exp(-1 / (T * sr)), c = 2 * r * Math.cos(w), r2 = r * r;
  let y1 = amp * Math.sin(phase - w) / r, y2 = amp * Math.sin(phase - 2 * w) / r2;
  const gN = Math.round(gate * sr), rr = Math.exp(-1 / (rel * sr)); let g = 1;
  for (let i = 0; i < n; i++) {
    const y = c * y1 - r2 * y2; y2 = y1; y1 = y;
    if (i > gN) { g *= rr; if (g < 1e-4) break; }
    out[i0 + i] += y * g;
  }
}
function adsr(a, d, s, len, rel) {
  return (t) => (t < a ? t / a : t < a + d ? 1 - ((1 - s) * (t - a)) / d : t < len ? s : s * Math.max(0, 1 - (t - len) / rel));
}

const INST = {
  strings(out, i0, sr, nt, rand, o) {
    const f = o.f, len = o.len, low = f < 200;
    const a = Math.min(o.accent ? 0.025 : 0.07, len * 0.35), rel = low ? 0.25 : 0.18;
    const hold = (t) => (t < a ? t / a : 1 - 0.12 * Math.min(1, (t - a) / 0.5) + 0.08 * Math.min(1, t / 1.5)), end = hold(len);
    const env = (t) => { const base = t < len ? hold(t) : end * Math.max(0, 1 - (t - len) / rel); return o.accent && t < 0.08 ? base * (1 + 0.5 * (1 - t / 0.08)) : base; };
    const amps = harmonics(f, sr, (h) => (1 / h ** 1.05) * (1 + 0.5 * Math.exp(-(((h * f - 2600) / 1400) ** 2))) * (h === 1 ? 0.8 : 1));
    const n = Math.ceil((len + rel + 0.02) * sr), lp = 2500 + 4500 * o.vel;
    const vib = len > 0.2 ? 0.0042 : 0.0015;
    for (const det of o.section ? [-5, 4] : [0]) wt(out, i0, n, sr, { f, amps, env, vib, vibDelay: 0.15, trill: o.trill, lp, detune: det, phase: rand() * TN, noise: 0.015, rand });
  },
  piano(out, i0, sr, nt, rand, o) {
    const f = o.f, B = 0.00035, T1 = Math.max(0.5, Math.min(9, 4.2 * Math.sqrt(262 / f)));
    const bright = 0.5 + 0.7 * o.vel, n = Math.ceil((o.len + 0.6) * sr);
    for (let k = 1; k <= 12; k++) {
      const fk = k * f * Math.sqrt(1 + B * k * k); if (fk > 0.45 * sr) break;
      const amp = (1 / k ** (1.5 - 0.6 * bright)) * (k === 1 ? 1 : 0.7) * Math.exp(-(((k * f) / 5000) ** 2));
      const T = T1 / (1 + 0.55 * (k - 1));
      for (const d of [1, 1.0007]) partial(out, i0, n, sr, fk * d, amp * 0.5, T, rand() * 6.28, o.len, 0.11);
    }
    for (let i = 0; i < Math.min(n, sr * 0.006); i++) out[i0 + i] += (rand() * 2 - 1) * 0.08 * o.vel * (1 - i / (sr * 0.006));
  },
  pluck(out, i0, sr, nt, rand, o) {
    const f = o.f, P = sr / f, N = Math.max(2, Math.floor(P - 0.5)), fr = P - 0.5 - N, C = (1 - fr) / (1 + fr);
    const buf = new Float32Array(N); let lp = 0;
    for (let i = 0; i < N; i++) { lp = 0.5 * lp + 0.5 * (rand() * 2 - 1); buf[i] = lp * 0.9 + (rand() * 2 - 1) * 0.1; }
    const ring = Math.max(0.25, Math.min(4, 2.4 * Math.sqrt(262 / f))), rho = Math.exp(-1 / (ring * f)) ** 1, n = Math.ceil(Math.min(o.len + 0.15, ring * 2.5) * sr);
    let idx = 0, x1 = 0, y1 = 0, damp = 1; const rel = Math.exp(-1 / (0.08 * sr)), gate = Math.round(o.len * sr);
    for (let i = 0; i < n; i++) {
      const cur = buf[idx], nxt = buf[(idx + 1) % N], x = rho * 0.5 * (cur + nxt);
      const y = C * x + x1 - C * y1; x1 = x; y1 = y; buf[idx] = y; idx = (idx + 1) % N;
      if (i > gate) { damp *= rel; if (damp < 1e-4) break; }
      out[i0 + i] += cur * damp * 0.9;
    }
  },
  flute(out, i0, sr, nt, rand, o) {
    const len = o.len, a = Math.min(0.06, len * 0.3), env = adsr(a, 0.1, 0.85, len, 0.12);
    wt(out, i0, Math.ceil((len + 0.14) * sr), sr, { f: o.f, amps: harmonics(o.f, sr, (h) => [1, 0.22, 0.09, 0.04][h - 1] || 0, 4), env, vib: 0.004, vibRate: 5, vibDelay: 0.25, trill: o.trill, lp: 6000, noise: 0.05, rand });
  },
  organ(out, i0, sr, nt, rand, o) {
    const env = adsr(0.015, 0.05, 0.95, o.len, 0.08);
    wt(out, i0, Math.ceil((o.len + 0.1) * sr), sr, { f: o.f, amps: harmonics(o.f, sr, (h) => [1, 0.6, 0.3, 0.25, 0, 0.18, 0, 0.12][h - 1] || 0, 8), env, lp: 7000, rand });
  },
  horn(out, i0, sr, nt, rand, o) {
    const len = o.len, env = adsr(Math.min(0.08, len * 0.4), 0.15, 0.85, len, 0.18);
    wt(out, i0, Math.ceil((len + 0.2) * sr), sr, { f: o.f, amps: harmonics(o.f, sr, (h) => 1 / h ** 1.6, 16), env, vib: 0.002, lp: 1200 + 2000 * o.vel, rand });
  },
  celesta(out, i0, sr, nt, rand, o) {
    const n = Math.ceil((o.len + 1.2) * sr);
    [[1, 1, 1.6], [2, 0.35, 0.7], [3, 0.12, 0.4], [4.1, 0.08, 0.25]].forEach(([r, a, T]) => partial(out, i0, n, sr, o.f * r, a * 0.6, T, rand() * 6.28, o.len + 0.4, 0.3));
  },
  bell(out, i0, sr, nt, rand, o) {
    const n = Math.ceil(4 * sr);
    [[0.5, 0.5, 3.5], [1, 1, 2.6], [1.19, 0.5, 2], [1.56, 0.4, 1.5], [2, 0.5, 1.2], [2.74, 0.3, 0.8], [3.76, 0.15, 0.5]].forEach(([r, a, T]) => partial(out, i0, n, sr, o.f * r, a * 0.35, T, rand() * 6.28, 3.6, 0.3));
  },
};
INST.harpsichord = INST.pluck;

function freeverb(L, R, sr, { mix = 0.25, size = 0.82, damp = 0.35 } = {}) {
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

// spec: { duration, voices: { id: { synth, gain, pan, section, ring, transpose } }, notes, reverb: { mix, size, damp }, peak }
export function renderAudio(spec, { sampleRate = 44100 } = {}) {
  const sr = sampleRate, N = Math.ceil(spec.duration * sr) + 1, L = new Float32Array(N), R = new Float32Array(N);
  let maxLen = 0; for (const n of spec.notes) maxLen = Math.max(maxLen, n.t1 - n.t0);
  const scratch = new Float32Array(Math.ceil((maxLen + 4.5) * sr));
  spec.notes.forEach((nt, idx) => {
    const v = spec.voices[nt.voice] || {}, kind = v.synth || 'strings', fn = INST[kind];
    if (!fn) throw new Error(`voice ${nt.voice}: unknown synth "${kind}" (have ${Object.keys(INST).join(', ')})`);
    const rand = rng(1 + idx * 7919 + nt.midi * 131), orn = nt.orn || [];
    let len = Math.max(0.03, nt.t1 - nt.t0); if (orn.includes('st')) len *= 0.45; len += v.ring || 0; // ring: let it sound on (a pedal)
    const o = { f: mtof(nt.midi + (v.transpose || 0)), len, vel: Math.min(1, (nt.vel ?? 0.7) * (orn.includes('ac') ? 1.2 : 1)), accent: orn.includes('ac'), trill: orn.includes('tr') ? 2 ** (2 / 12) : 0, section: !!v.section };
    const i0 = Math.round(nt.t0 * sr); if (i0 >= N) return;
    const used = Math.min(scratch.length, N - i0); scratch.fill(0, 0, used);
    fn(scratch, 0, sr, nt, rand, o);
    const amp = 0.16 * (v.gain ?? 1) * o.vel ** 1.3, pan = Math.max(-1, Math.min(1, v.pan ?? 0)), gl = Math.cos(((pan + 1) * Math.PI) / 4) * amp, gr = Math.sin(((pan + 1) * Math.PI) / 4) * amp;
    for (let i = 0; i < used; i++) { const s = scratch[i]; if (s) { L[i0 + i] += s * gl; R[i0 + i] += s * gr; } }
  });
  freeverb(L, R, sr, spec.reverb);
  let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = peak > 0 ? (spec.peak ?? 0.85) / peak : 1;
  for (let i = 0; i < N; i++) { L[i] *= g; R[i] *= g; }
  const fade = Math.min(N, Math.round(0.03 * sr)); for (let i = 0; i < fade; i++) { const k = i / fade; L[N - 1 - i] *= k; R[N - 1 - i] *= k; }
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

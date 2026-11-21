// manga-background-3d · sound.mjs — a quiet synthesised track from the film's events (no samples, no network):
// a felt-piano arpeggio under everything, a pen-on-paper scratch through each wipe, a soft paper tap on cuts and a
// small bell chord on the closing card. Deterministic: the same events give the same WAV.
const SR = 44100;

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const midi = m => 440 * Math.pow(2, (m - 69) / 12);

export function synth(events, dur, o = {}) {
  const n = Math.ceil((dur + 0.5) * SR), L = new Float32Array(n), R = new Float32Array(n), r = rng(7);
  const add = (i, l, rr) => { if (i >= 0 && i < n) { L[i] += l; R[i] += rr; } };
  // felt piano: soft attack, two partials, long decay, slight stereo spread
  const note = (t, m, vel, pan = 0) => {
    const f = midi(m), i0 = Math.round(t * SR), len = Math.round(2.6 * SR);
    for (let k = 0; k < len; k++) {
      const tt = k / SR, env = Math.min(1, tt / 0.012) * Math.exp(-tt * 1.9);
      const s = (Math.sin(2 * Math.PI * f * tt) + 0.32 * Math.sin(2 * Math.PI * 2 * f * tt) * Math.exp(-tt * 3) + 0.08 * Math.sin(2 * Math.PI * 3 * f * tt) * Math.exp(-tt * 6)) * env * vel;
      add(i0 + k, s * (1 - pan) * 0.5, s * (1 + pan) * 0.5);
    }
  };
  const bpm = o.bpm ?? 72, beat = 60 / bpm;
  const prog = o.chords ?? [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67], [52, 55, 60, 64]];   // Am7 · Fmaj7 · G · C/E
  for (let b = 0, t = 0.2; t < dur - 1; b++, t += beat / 2) {
    const ch = prog[Math.floor(b / 16) % prog.length], m = ch[[0, 2, 1, 3, 2, 1, 3, 2][b % 8]] + 12;
    note(t, m, 0.05 * (b % 8 === 0 ? 1.25 : 1) * (0.85 + 0.3 * r()), (r() - 0.5) * 0.6);
    if (b % 16 === 0) note(t, ch[0] - 12, 0.06, 0);
  }
  for (const e of events) {
    const i0 = Math.round(e.t * SR);
    if (e.kind === 'wipe') {   // pen scratch: band-limited noise with stroke-like bursts
      const len = Math.round((e.dur ?? 1.5) * SR); let y1 = 0, y2 = 0;
      for (let k = 0; k < len; k++) {
        const u = k / len, burst = 0.55 + 0.45 * Math.sin(u * 2 * Math.PI * (7 + 3 * Math.sin(u * 5))) ** 2;
        const x = r() * 2 - 1; y1 += 0.35 * (x - y1); y2 += 0.5 * (y1 - y2);
        const s = (y1 - y2) * 0.16 * Math.sin(Math.PI * u) * burst;
        add(i0 + k, s * (1.2 - u), s * (0.2 + u));
      }
    } else if (e.kind === 'cut') {
      for (let k = 0; k < SR * 0.12; k++) { const tt = k / SR, s = (Math.sin(2 * Math.PI * 140 * tt) * 0.5 + (r() - 0.5) * 0.4 * Math.exp(-tt * 60)) * Math.exp(-tt * 30) * 0.12; add(i0 + k, s, s); }
    } else if (e.kind === 'card') {
      [76, 79, 83, 88].forEach((m, j) => note(e.t + 0.25 + j * 0.06, m, 0.05, (j - 1.5) * 0.3));
    }
  }
  // gentle fade out, normalise, 16-bit stereo WAV
  const fo = Math.round(1.2 * SR);
  let peak = 0; for (let i = 0; i < n; i++) { const g = i > n - fo ? (n - i) / fo : 1; L[i] *= g; R[i] *= g; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
  const gain = peak > 0 ? 0.75 / peak : 1;   // normalise: quiet underneath, never clipping
  const out = Buffer.alloc(44 + n * 4);
  out.write('RIFF', 0); out.writeUInt32LE(36 + n * 4, 4); out.write('WAVE', 8); out.write('fmt ', 12); out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
  out.write('data', 36); out.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * gain)) * 32767), 44 + i * 4); out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * gain)) * 32767), 46 + i * 4); }
  return out;
}

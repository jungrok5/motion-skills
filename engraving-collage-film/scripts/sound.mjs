// engraving-collage-film · sound.mjs — a synthesised score from the film's events (no samples, no network): a little
// chamber piece of plucked strings and a celesta over a soft bowed pad (bpm / key / mood from the page's score), paper
// sounds for the collage — a paper flip on every cut, a card flap when a card hinges up — and the cast's foley: light taps
// for footsteps (heavier bodies, lower taps), a hop and a landing, a small chime on a wave. Deterministic.
const SR = 44100;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const midi = m => 440 * Math.pow(2, (m - 69) / 12);
const KEYS = { C: 60, D: 62, E: 64, F: 65, G: 55, A: 57, Bb: 58, Eb: 63 };

export function synth(events, dur, o = {}) {
  const n = Math.ceil((dur + 0.5) * SR), L = new Float32Array(n), R = new Float32Array(n), r = rng(11);
  const add = (i, l, rr) => { if (i >= 0 && i < n) { L[i] += l; R[i] += rr; } };
  const pluck = (t, m, vel, pan = 0, decay = 3.2) => {   // a Karplus-Strong-ish plucked string
    const f = midi(m), i0 = Math.round(t * SR), len = Math.round(1.6 * SR), per = Math.max(2, Math.round(SR / f)), buf = new Float32Array(per);
    for (let k = 0; k < per; k++) buf[k] = (r() * 2 - 1);
    let p = 0;
    for (let k = 0; k < len; k++) { const y = buf[p], nx = buf[(p + 1) % per]; buf[p] = (y + nx) * 0.5 * (1 - decay * 0.0004); p = (p + 1) % per; const s = y * vel * Math.min(1, k / 30); add(i0 + k, s * (1 - pan) * 0.5, s * (1 + pan) * 0.5); }
  };
  const celesta = (t, m, vel, pan = 0) => {
    const f = midi(m), i0 = Math.round(t * SR), len = Math.round(1.8 * SR);
    for (let k = 0; k < len; k++) { const tt = k / SR, env = Math.min(1, tt / 0.004) * Math.exp(-tt * 3.2); const s = (Math.sin(6.2832 * f * tt) + 0.4 * Math.sin(6.2832 * f * 4 * tt) * Math.exp(-tt * 9)) * env * vel; add(i0 + k, s * (1 - pan) * 0.5, s * (1 + pan) * 0.5); }
  };
  const pad = (t, ms, d, vel) => {
    const i0 = Math.round(t * SR), len = Math.round(d * SR);
    for (const m of ms) { const f = midi(m); for (let k = 0; k < len; k++) { const tt = k / SR, env = Math.min(1, tt / 0.5) * Math.min(1, (d - tt) / 0.6); const s = (Math.sin(6.2832 * f * tt) + 0.3 * Math.sin(6.2832 * f * 2.003 * tt) + 0.15 * Math.sin(6.2832 * f * 3.01 * tt)) * env * vel * (1 + 0.05 * Math.sin(tt * 5)); add(i0 + k, s * 0.5, s * 0.5); } }
  };
  const noise = (t, d, vel, o2 = {}) => {   // filtered noise bursts: paper, steps
    const i0 = Math.round(t * SR), len = Math.round(d * SR); let y1 = 0, y2 = 0; const a = o2.bright ?? 0.35;
    for (let k = 0; k < len; k++) { const u = k / len, x = r() * 2 - 1; y1 += a * (x - y1); y2 += 0.5 * (y1 - y2); const env = o2.env ? o2.env(u) : Math.exp(-u * 6); const s = (y1 - y2 * (o2.hp ?? 1)) * env * vel; add(i0 + k, s * (1 - (o2.pan ?? 0)), s * (1 + (o2.pan ?? 0))); }
  };
  // the music: I – vi – IV – V in the key, a bar of 3 (a small waltz) or 4 by mood
  const root = KEYS[o.key] ?? 62, bpm = o.bpm ?? 92, beat = 60 / bpm, bar = o.mood === 'busy' ? 4 : 3;
  const prog = [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], scale = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
  let b = 0;
  for (let t = 0.15; t < dur - 0.6; t += beat, b++) {
    const ch = prog[Math.floor(b / bar) % 4], bi = b % bar;
    if (bi === 0) { pluck(t, root - 24 + ch[0], 0.35, 0, 2); if (b % (bar * 2) === 0) pad(t, ch.map(c => root - 12 + c), beat * bar * 2 + 0.3, 0.012); }
    else pluck(t, root - 12 + ch[bi % 3], 0.18, bi % 2 ? -0.4 : 0.4, 3);
    if (r() < 0.62) { const m = root + 12 + scale[Math.floor(r() * 7)], hit = ch.map(c => (c % 12)).includes((m - root) % 12) || r() < 0.4; if (hit) celesta(t + (r() < 0.3 ? beat / 2 : 0), m, 0.06, (r() - 0.5) * 0.8); }
  }
  for (const e of events) {
    if (e.kind === 'cut') noise(e.t - 0.06, 0.22, 0.45, { bright: 0.55, env: u => Math.sin(Math.PI * u) ** 2 * (1 - u) });
    else if (e.kind === 'rise') { noise(e.t, 0.5, 0.35, { bright: 0.3, env: u => Math.sin(Math.PI * u) * (1 - u * 0.6) }); noise(e.t + 0.62, 0.08, 0.6, { bright: 0.15 }); }
    else if (e.kind === 'step') noise(e.t, 0.07, (e.gait === 'run' ? 0.5 : 0.32) * (e.mass ?? 1), { bright: 0.18 / (e.mass ?? 1), env: u => Math.exp(-u * 9) });
    else if (e.kind === 'hop') noise(e.t, 0.18, 0.35, { bright: 0.4, env: u => Math.exp(-u * 4) });
    else if (e.kind === 'land') noise(e.t, 0.12, 0.8, { bright: 0.12, env: u => Math.exp(-u * 7) });
    else if (e.kind === 'chime') [0, 4, 7, 12].forEach((d, j) => celesta(e.t + j * 0.07, root + 24 + d, 0.05, (j - 1.5) * 0.3));
  }
  const fo = Math.round(1.0 * SR); let peak = 0;
  for (let i = 0; i < n; i++) { const g = i > n - fo ? (n - i) / fo : 1; L[i] *= g; R[i] *= g; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
  const gain = peak > 0 ? 0.7 / peak : 1, out = Buffer.alloc(44 + n * 4);
  out.write('RIFF', 0); out.writeUInt32LE(36 + n * 4, 4); out.write('WAVE', 8); out.write('fmt ', 12); out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
  out.write('data', 36); out.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * gain)) * 32767), 44 + i * 4); out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * gain)) * 32767), 46 + i * 4); }
  return out;
}

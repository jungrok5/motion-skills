// parallax-facade · score.mjs — the loop's sound, synthesised from the film's cues (no samples, no downloads):
//   node <skill>/scripts/check.mjs film.html          → out/cues.json (beats, moves, the page's sound spec)
//   node <skill>/scripts/score.mjs                     → out/loop.wav (+ out/loop.mp3 for the live page with --mp3)
// The reference's sound: a soft beat under the picture and an air whoosh on every camera move, landing on a tick.
// Everything is written modulo the loop length, so tails wrap and the loop is seamless.
// Spec (new Film({ sound: { … } }), all optional):
//   bpm        default 120 / beat (two beats per camera beat)
//   key        root note of the chords, e.g. "F", "Eb"           chords  ["Fmaj7", "Em7", "Dm7", "Cmaj7"] (one per bar)
//   mood       "citypop" (EP stabs + bass + kick/clap/hats) | "lofi" (dusty, slower hats, no clap) | "calm" (pad only) | "none"
//   whoosh     "air" (default) | "soft" | "none"               tick  true (a soft click when a move lands)
//   ambience   any of "waves", "birds", "bell", "water", "wind", "city", "cicadas"
//   gain       overall level (dB, default 0)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const cuesPath = resolve(opt('cues', 'out/cues.json'));
if (!existsSync(cuesPath)) { console.error('no out/cues.json — run check.mjs on the film first'); process.exit(1); }
const C = JSON.parse(readFileSync(cuesPath, 'utf8')), S = C.sound ?? {};
const SR = 48000, DUR = C.duration, N = Math.round(DUR * SR);
const L = new Float32Array(N), R = new Float32Array(N);
let seed = S.seed ?? 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const noise = () => rnd() * 2 - 1;
const put = (i, l, r = l) => { const k = ((i % N) + N) % N; L[k] += l; R[k] += r; };
const db = (x) => 10 ** (x / 20);
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
// RBJ biquad
function biquad(type, f, q) {
  let b0, b1, b2, a1, a2, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const set = (f, q) => {
    const w = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
    let B0, B1, B2; const A0 = 1 + a;
    if (type === 'lp') { B0 = (1 - c) / 2; B1 = 1 - c; B2 = (1 - c) / 2; }
    else if (type === 'hp') { B0 = (1 + c) / 2; B1 = -(1 + c); B2 = (1 + c) / 2; }
    else { B0 = a; B1 = 0; B2 = -a; }
    b0 = B0 / A0; b1 = B1 / A0; b2 = B2 / A0; a1 = (-2 * c) / A0; a2 = (1 - a) / A0;
  };
  set(f, q);
  const run = (x) => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  run.set = set; return run;
}

// ---------- harmony ----------
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUAL = [['maj9', [0, 4, 7, 11, 14]], ['maj7', [0, 4, 7, 11]], ['m9', [0, 3, 7, 10, 14]], ['m7', [0, 3, 7, 10]], ['add9', [0, 4, 7, 14]], ['sus2', [0, 2, 7]], ['sus4', [0, 5, 7]], ['7', [0, 4, 7, 10]], ['m', [0, 3, 7]], ['', [0, 4, 7]]];
function chord(name) {
  const m = name.match(/^([A-G])([#b]?)(.*)$/); if (!m) throw new Error('bad chord ' + name);
  const root = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0), q = QUAL.find(([k]) => m[3] === k) ?? QUAL[QUAL.length - 1];
  return { root, tones: q[1].map((x) => x + root) };
}
const bpm = S.bpm ?? 120 / (C.beat ?? 1), spb = 60 / bpm, mood = S.mood ?? 'citypop';
const chords = (S.chords ?? ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7']).map(chord);
const bar = DUR / chords.length;

// ---------- instruments ----------
function pad(t0, dur, ch, gain) {
  const n0 = Math.round(t0 * SR), n = Math.round(dur * SR), lp = biquad('lp', 1400, 0.7), lp2 = biquad('lp', 1400, 0.7);
  const notes = ch.tones.map((x) => hz(57 + ((x + 12) % 12) + (x >= 12 ? 12 : 0)));
  for (let i = 0; i < n + SR * 0.8; i++) {
    const t = i / SR, env = Math.min(1, t / 0.25) * (i < n ? 1 : Math.exp(-(i - n) / (SR * 0.25)));
    let l = 0, r = 0;
    notes.forEach((f, k) => { const a = Math.sin(2 * Math.PI * f * 1.003 * t + k), b = Math.sin(2 * Math.PI * f * 0.997 * t + k * 2); const tri = (x) => (2 / Math.PI) * Math.asin(Math.sin(x)); l += a * 0.6 + tri(2 * Math.PI * f * t) * 0.25; r += b * 0.6 + tri(2 * Math.PI * f * t + 1) * 0.25; });
    put(n0 + i, lp(l) * env * gain / notes.length, lp2(r) * env * gain / notes.length);
  }
}
function ep(t0, ch, gain) { // electric-piano stab (2-op FM, fast decay)
  const n0 = Math.round(t0 * SR);
  const notes = ch.tones.slice(1).map((x) => hz(64 + ((x + 12) % 12)));
  for (let i = 0; i < SR * 0.9; i++) {
    const t = i / SR, env = Math.exp(-t / 0.28), I = 1.6 * Math.exp(-t / 0.08);
    let s = 0; for (const f of notes) s += Math.sin(2 * Math.PI * f * t + I * Math.sin(2 * Math.PI * f * 2 * t));
    s *= env * gain / notes.length; put(n0 + i, s * 0.9, s * 1.1);
  }
}
function bass(t0, dur, midi, gain) {
  const n0 = Math.round(t0 * SR), n = Math.round(dur * SR), f = hz(midi), lp = biquad('lp', 500, 0.8);
  for (let i = 0; i < n; i++) { const t = i / SR, env = Math.min(1, t / 0.01) * Math.exp(-t / (dur * 0.9)) * Math.min(1, (n - i) / (SR * 0.02)); const s = Math.tanh(1.5 * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t))); put(n0 + i, lp(s) * env * gain); }
}
function kick(t0, gain) { const n0 = Math.round(t0 * SR); let ph = 0; for (let i = 0; i < SR * 0.35; i++) { const t = i / SR, f = 45 + 80 * Math.exp(-t / 0.04); ph += (2 * Math.PI * f) / SR; put(n0 + i, Math.sin(ph) * Math.exp(-t / 0.12) * gain); } }
function clap(t0, gain) { const n0 = Math.round(t0 * SR), bp = biquad('bp', 1600, 0.9); for (let i = 0; i < SR * 0.25; i++) { const t = i / SR, env = Math.exp(-t / 0.06) * (t < 0.02 ? 0.6 + 0.4 * Math.sin(t * 900) : 1); const s = bp(noise()) * env * gain; put(n0 + i, s * 0.9, s * 1.1); } }
function hat(t0, gain, open = false) { const n0 = Math.round(t0 * SR), hp = biquad('hp', 7000, 0.7); for (let i = 0; i < SR * (open ? 0.2 : 0.05); i++) { const t = i / SR, s = hp(noise()) * Math.exp(-t / (open ? 0.07 : 0.015)) * gain; put(n0 + i, s * 1.1, s * 0.9); } }
function whoosh(t0, t1, pan, gain, soft) {
  // noise through a band-pass that rises and falls with the move; louder in the middle, panned with the swing
  const pre = 0.12, post = 0.18, n0 = Math.round((t0 - pre) * SR), n = Math.round((t1 - t0 + pre + post) * SR), bp = biquad('bp', 400, 0.8), lp = biquad('lp', soft ? 2500 : 6000, 0.7);
  for (let i = 0; i < n; i++) {
    const u = i / n, env = Math.sin(Math.PI * u) ** (soft ? 2 : 1.4);
    if (i % 32 === 0) bp.set(250 + 2600 * Math.sin(Math.PI * u) ** 2, 0.9);
    const s = lp(bp(noise())) * env * gain * 2.2;
    const p = Math.max(-1, Math.min(1, pan * (u * 2 - 1)));
    put(n0 + i, s * Math.sqrt((1 - p) / 2) * 1.4, s * Math.sqrt((1 + p) / 2) * 1.4);
  }
}
function tick(t0, gain) { const n0 = Math.round(t0 * SR); for (let i = 0; i < SR * 0.06; i++) { const t = i / SR, s = (Math.sin(2 * Math.PI * 1800 * t) * 0.5 + Math.sin(2 * Math.PI * 90 * t)) * Math.exp(-t / 0.012) * gain; put(n0 + i, s); } }
// ambience beds (all loop-periodic: their slow swells complete whole cycles per loop)
const AMB = {
  waves(g) { const lp = biquad('lp', 600, 0.6), lp2 = biquad('lp', 600, 0.6); for (let i = 0; i < N; i++) { const t = i / SR, sw = 0.5 + 0.5 * Math.sin((2 * Math.PI * t * 2) / DUR - 1.2); put(i, lp(noise()) * sw * sw * g * 3, lp2(noise()) * (0.5 + 0.5 * Math.sin((2 * Math.PI * t * 2) / DUR - 0.6)) ** 2 * g * 3); } },
  wind(g) { const bp = biquad('bp', 500, 0.5); for (let i = 0; i < N; i++) { const t = i / SR; if (i % 64 === 0) bp.set(400 + 250 * Math.sin((2 * Math.PI * t) / DUR), 0.5); const s = bp(noise()) * (0.6 + 0.4 * Math.sin((4 * Math.PI * t) / DUR)) * g * 2; put(i, s, s * 0.9); } },
  city(g) { const lp = biquad('lp', 300, 0.5); for (let i = 0; i < N; i++) put(i, lp(noise()) * g * 2.5); },
  birds(g) { const n = Math.round(DUR * 0.9); for (let k = 0; k < n; k++) { const t0 = rnd() * DUR, f0 = 2600 + rnd() * 1800, pan = noise() * 0.7, chirps = 2 + Math.floor(rnd() * 3); for (let c = 0; c < chirps; c++) { const n0 = Math.round((t0 + c * 0.09) * SR); let ph = 0; for (let i = 0; i < SR * 0.06; i++) { const t = i / SR, f = f0 * (1 + 0.35 * Math.sin(t * 60)); ph += (2 * Math.PI * f) / SR; const s = Math.sin(ph) * Math.sin(Math.PI * t / 0.06) * g * 0.5; put(n0 + i, s * (1 - pan), s * (1 + pan)); } } } },
  bell(g) { for (const t0 of [0.02]) { const n0 = Math.round(t0 * SR), f = hz(chords[0].root + 60 - 12); for (let i = 0; i < N; i++) { const t = i / SR; let s = 0; [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]].forEach(([m, a]) => { s += a * Math.sin(2 * Math.PI * f * m * t) * Math.exp(-t / (2.6 / m)); }); put(n0 + i, s * g * 0.35); } } },
  water(g) { const n = Math.round(DUR * 6); for (let k = 0; k < n; k++) { const n0 = Math.round(rnd() * N), f0 = 500 + rnd() * 900; let ph = 0; for (let i = 0; i < SR * 0.04; i++) { const t = i / SR; ph += (2 * Math.PI * f0 * (1 + t * 25)) / SR; put(n0 + i, Math.sin(ph) * Math.sin(Math.PI * t / 0.04) * g * 0.25); } } },
  cicadas(g) { const bp = biquad('bp', 5200, 4); for (let i = 0; i < N; i++) { const t = i / SR, am = 0.5 + 0.5 * Math.sin(2 * Math.PI * 60 * t); put(i, bp(noise()) * am * g * 1.2); } },
};

// ---------- arrangement ----------
const G = db(S.gain ?? 0);
if (mood !== 'none') {
  chords.forEach((ch, b) => {
    const t0 = b * bar;
    pad(t0, bar, ch, (mood === 'calm' ? 0.22 : 0.13) * G);
    if (mood === 'calm') return;
    for (let k = 0; k * spb < bar - 1e-6; k++) {
      const t = t0 + k * spb;
      if (k % 2 === 0) kick(t, 0.5 * G);
      if (mood === 'citypop' && k % 2 === 1) clap(t, 0.16 * G);
      hat(t + spb / 2, (mood === 'lofi' ? 0.05 : 0.07) * G, k % 4 === 3);
      if (mood === 'citypop') hat(t, 0.035 * G);
      bass(t, spb * 0.9, 36 + ((ch.root + 12) % 12) + (k % 4 === 3 ? 7 : 0), 0.22 * G);
      if (k % 2 === 1 || (mood === 'citypop' && k % 4 === 2)) ep(t + (k % 2 ? spb / 2 : 0), ch, (mood === 'lofi' ? 0.08 : 0.1) * G);
    }
  });
}
for (const a of S.ambience ?? []) { if (!AMB[a]) { console.error(`unknown ambience "${a}" (${Object.keys(AMB).join(', ')})`); process.exit(1); } AMB[a](0.05 * G); }
if ((S.whoosh ?? 'air') !== 'none') for (const m of C.moves ?? []) {
  whoosh(m.from, m.to, Math.sign(m.yaw || 0) * 0.8, (S.whoosh === 'soft' ? 0.18 : 0.3) * G, S.whoosh === 'soft');
  if (S.tick !== false) tick(m.to - 0.01, 0.12 * G);
}

// ---------- level: RMS to −18 dBFS, soft-limit peaks under −1 dBFS ----------
let ss = 0; for (let i = 0; i < N; i++) ss += L[i] * L[i] + R[i] * R[i];
const rms = Math.sqrt(ss / (2 * N)) || 1, k = db(-18) / rms, ceil = db(-1);
const pcm = Buffer.alloc(44 + N * 4);
pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + N * 4, 4); pcm.write('WAVEfmt ', 8); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) for (const [c, x] of [[0, L[i]], [1, R[i]]]) { const y = ceil * Math.tanh((x * k) / ceil); pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, y)) * 32767), 44 + i * 4 + c * 2); }
const out = resolve(opt('out', 'out/loop.wav'));
writeFileSync(out, pcm);
console.log(`${out}  (${DUR.toFixed(2)} s, ${bpm.toFixed(0)} bpm, ${mood}, ${chords.length} chords, ${(C.moves ?? []).length} whooshes${(S.ambience ?? []).length ? ', ' + S.ambience.join(' + ') : ''})`);
if (args.includes('--mp3')) { const mp3 = out.replace(/\.wav$/, '.mp3'); execSync(`ffmpeg -y -loglevel error -i "${out}" -c:a libmp3lame -b:a 128k "${mp3}"`); console.log(mp3); }

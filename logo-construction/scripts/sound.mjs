// logo-construction · sound.mjs — the film's sound, synthesised from its events (no audio files):
// mouse clicks on every press and release, a soft "thock" when the shape builder fills a region, a tick when the
// align panel snaps lines into place, a short swish when guides are deleted, a low thump on each mockup cut,
// over a quiet warm pad (four slow chords) and room tone. Deterministic: same events → same WAV.
//   import { synth } from './sound.mjs'; writeFileSync('clicks.wav', synth(events, duration))
export function synth(events, dur, { rate = 44100, pad = true } = {}) {
  const n = Math.ceil((dur + .2) * rate), L = new Float32Array(n), R = new Float32Array(n);
  let s = 12345; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 * 2 - 1; };
  const put = (t, fn, len, pan = 0) => { const a = Math.floor(t * rate); for (let i = 0; i < len * rate && a + i < n; i++) { if (a + i < 0) continue; const v = fn(i / rate); L[a + i] += v * (1 - pan) ; R[a + i] += v * (1 + pan); } };
  const click = (t, hi) => { let lp = 0; put(t, x => { const e = Math.exp(-x * (hi ? 900 : 1300)); lp += (rnd() - lp) * .55; return (lp * .5 + Math.sin(2 * Math.PI * (hi ? 3100 : 2300) * x) * .35) * e * (hi ? .32 : .2); }, .03, .1); };
  for (const e of events) {
    if (e.type === 'click') click(e.t, true);
    if (e.type === 'release') click(e.t, false);
    if (e.type === 'fill') { click(e.t, true); put(e.t + .005, x => Math.sin(2 * Math.PI * (180 - 60 * x) * x) * Math.exp(-x * 26) * .22, .25); }
    if (e.type === 'snap') { click(e.t, false); click(e.t + .06, false); put(e.t, x => Math.sin(2 * Math.PI * 1320 * x) * Math.exp(-x * 40) * .06, .15); }
    if (e.type === 'delete') { let lp = 0; put(e.t, x => { lp += (rnd() - lp) * (.05 + x * .6); return lp * Math.sin(Math.PI * Math.min(1, x / .22)) * .35; }, .22); }
    if (e.type === 'cut') put(e.t, x => Math.sin(2 * Math.PI * (72 - 20 * x) * x) * Math.exp(-x * 9) * .32, .5);
  }
  if (pad) {
    // four chords (Fmaj7 · Am7 · Dm9 · Cmaj7), each ~4 s, soft attack, a little detune for width
    const chords = [[174.6, 220, 261.6, 329.6], [220, 261.6, 329.6, 392], [146.8, 220, 261.6, 329.6], [130.8, 196, 246.9, 329.6]];
    const len = 4.2;
    for (let i = 0; i * rate < n; i++) {
      const t = i / rate, ci = Math.floor(t / len) % 4, k = (t % len) / len, env = Math.min(1, k * 4) * Math.min(1, (1 - k) * 5) * Math.min(1, t / 1.5) * Math.min(1, (dur - t) / 1.2);
      let v = 0; for (const f of chords[ci]) v += Math.sin(2 * Math.PI * f * t) * .5 + Math.sin(2 * Math.PI * f * 1.003 * t) * .5;
      const room = rnd() * .004;
      L[i] += v * .026 * Math.max(0, env) + room; R[i] += v * .026 * Math.max(0, env) + room;
    }
  }
  // soft limiter → 16-bit stereo WAV
  const pcm = Buffer.alloc(44 + n * 4);
  pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + n * 4, 4); pcm.write('WAVEfmt ', 8); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22);
  pcm.writeUInt32LE(rate, 24); pcm.writeUInt32LE(rate * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { pcm.writeInt16LE(Math.round(Math.tanh(L[i] * 1.2) * 30000), 44 + i * 4); pcm.writeInt16LE(Math.round(Math.tanh(R[i] * 1.2) * 30000), 46 + i * 4); }
  return pcm;
}

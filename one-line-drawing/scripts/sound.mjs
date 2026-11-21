// one-line-drawing · sound.mjs — the film's sound, synthesised from the pen (no audio files): the soft hiss of a nib
// on glass that follows the pen's speed, a tap each time it touches down, quiet felt-piano notes that drift under the
// drawing and resolve on the reveal, and room tone. Deterministic: the same film → the same WAV.
//   import { synth } from './sound.mjs'; writeFileSync('pen.wav', synth(window.soundEvents(), duration))
export function synth(ev, dur, { rate = 44100, from = 0, music = true } = {}) {
  const n = Math.ceil((dur + .3) * rate), L = new Float32Array(n), R = new Float32Array(n);
  let s = 24680; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 * 2 - 1; };
  const at = t => Math.floor((t - from) * rate);
  // the nib: noise through two band-passes (a bright hiss and a low drag), loudness from speed
  const bp = (f, q) => { const w = 2 * Math.PI * f / rate, al = Math.sin(w) / (2 * q), a0 = 1 + al; return { b0: al / a0, b2: -al / a0, a1: -2 * Math.cos(w) / a0, a2: (1 - al) / a0, x1: 0, x2: 0, y1: 0, y2: 0 }; };
  const run = (f, x) => { const y = f.b0 * x + f.b2 * f.x2 - f.a1 * f.y1 - f.a2 * f.y2; f.x2 = f.x1; f.x1 = x; f.y2 = f.y1; f.y1 = y; return y; };
  const hi = bp(3600, .7), lo = bp(820, 1.1), pen = ev.pen;
  let k = 0, env = 0;
  for (let i = 0; i < n; i++) {
    const t = from + i / rate;
    while (k < pen.length - 1 && pen[k + 1][0] <= t) k++;
    const e = pen.length && t >= pen[0][0] && t <= pen[pen.length - 1][0] + .01 ? (pen[k][2] ? (.12 + Math.min(1.4, pen[k][1])) ** .8 : 0) : 0;
    env += (e - env) * .004;
    const x = rnd();
    const v = (run(hi, x) * .55 + run(lo, x) * .3) * env * .22;
    L[i] += v; R[i] += v * .92;
  }
  const put = (t, fn, len, pan = 0) => { const a = at(t); for (let i = 0; i < len * rate && a + i < n; i++) { if (a + i < 0) continue; const v = fn(i / rate); L[a + i] += v * (1 - pan); R[a + i] += v * (1 + pan); } };
  // a tap when the nib touches the glass
  for (const t of ev.taps) put(t, x => (Math.sin(2 * Math.PI * 2400 * x) * .5 + rnd() * .5) * Math.exp(-x * 700) * .16, .03, .05);
  // the signature: a quicker, lighter scribble
  if (ev.sign) { const [a, b] = ev.sign, f = bp(4200, .8); put(a, x => run(f, rnd()) * Math.sin(Math.PI * Math.min(1, x / ((b - a) * .6))) * .05, (b - a) * .6); }
  if (music) {
    // felt piano: a slow pentatonic walk, one note every ~1.7 s, a chord when the photo fades
    const notes = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3], r = (() => { let q = 7; return () => { q = (q * 1103515245 + 12345) >>> 0; return q / 4294967296; }; })();
    const pluck = (t, f, amp) => put(t, x => { const e = Math.exp(-x * 2.2) * Math.min(1, x / .012); return (Math.sin(2 * Math.PI * f * x) + Math.sin(2 * Math.PI * f * 2.003 * x) * .28 + Math.sin(2 * Math.PI * f * 3.01 * x) * .08) * e * amp; }, 3.2, (r() - .5) * .5);
    let idx = 2;
    const end = ev.lifts[0];
    for (let t = ev.taps[0] + .4; t < end; t += 1.55 + r() * .4) { idx = Math.max(0, Math.min(notes.length - 1, idx + Math.round((r() - .5) * 3))); pluck(t, notes[idx], .05); if (r() < .3) pluck(t + .02, notes[idx] / 2, .03); }
    for (const [j, f] of [130.8, 196, 261.6, 329.6, 392].entries()) pluck(end + 1.4 + j * .09, f, .045);
  }
  // a simple echo for space, then room tone
  const d = Math.floor(.21 * rate);
  for (let i = d; i < n; i++) { L[i] += R[i - d] * .18; R[i] += L[i - d] * .16; }
  for (let i = 0; i < n; i++) { const room = rnd() * .0025; L[i] += room; R[i] += room; }
  // fade the tail, soft limiter → 16-bit stereo WAV
  const pcm = Buffer.alloc(44 + n * 4);
  pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + n * 4, 4); pcm.write('WAVEfmt ', 8); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22);
  pcm.writeUInt32LE(rate, 24); pcm.writeUInt32LE(rate * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const f = Math.min(1, (n - i) / (rate * 1.2));
    pcm.writeInt16LE(Math.round(Math.tanh(L[i] * 3.2 * f) * 30000), 44 + i * 4); pcm.writeInt16LE(Math.round(Math.tanh(R[i] * 3.2 * f) * 30000), 46 + i * 4);
  }
  return pcm;
}

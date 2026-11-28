// latte-art-pour · audio.mjs — the pour, heard: a WAV synthesised from the score (no samples, no generated audio).
// The page gives one row per 1/60 s: flow q, height h, spout speed v, pin, pitcher presence. From that:
//   the stream   band-passed noise — louder with flow, brighter and splashier when high, a low glug when the spout
//                is on the surface (wobbling with the wiggle)
//   the pin      a faint scratch while it drags
//   the saucer   one soft ceramic tick as the cup is set down at the start
//   the room     a very low brown-noise bed
// Deterministic (seeded noise), normalised to −3 dBFS, 48 kHz mono 16-bit.
import { writeFileSync } from 'node:fs';

export function synth(rows, { fps = 60, duration, rate = 48000, seed = 7, tick = .25 } = {}) {
  const n = Math.ceil(duration * rate), out = new Float32Array(n);
  let s = seed >>> 0 || 1; const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; };
  // state-variable filters
  const svf = () => ({ lp: 0, bp: 0 });
  const run = (f, x, fc, q) => { const F = 2 * Math.sin(Math.PI * Math.min(fc, rate / 6) / rate); f.lp += F * f.bp; const hp = x - f.lp - q * f.bp; f.bp += F * hp; return { lp: f.lp, bp: f.bp, hp }; };
  const A = svf(), B = svf(), C = svf(), D = svf();
  let q = 0, h = 1, v = 0, pin = 0, brown = 0, glugPh = 0;
  const at = i => rows[Math.min(rows.length - 1, Math.floor(i / rate * fps))] || { q: 0, h: 1, v: 0, pin: 0 };
  for (let i = 0; i < n; i++) {
    const r = at(i), k = 1 - Math.exp(-1 / (rate * .025));
    q += (r.q - q) * k; h += (r.h - h) * k; v += (Math.min(4, r.v) - v) * k; pin += (r.pin - pin) * k;
    const w = rnd();
    // stream: a body band + a splash band (high) + a glug (low)
    const body = run(A, w, 520 + 900 * h + 260 * q, 1.1).bp;
    const splash = run(B, w, 2600 + 2400 * h, .7).bp * h * h;
    glugPh += 2 * Math.PI * (7 + 5 * v) / rate;
    const glug = run(C, w, 180 + 120 * (1 - h) + 60 * v, .35).bp * (1 - h) * (.55 + .45 * Math.sin(glugPh));
    let y = q > .002 ? Math.pow(q, .8) * (.55 * body + .45 * splash + .9 * glug) : 0;
    y += run(D, w, 5200, .9).hp * .05 * pin;
    brown = (brown + .02 * w) / 1.02; y += brown * .05;
    out[i] = y;
  }
  // the saucer tick
  const t0 = Math.floor(tick * rate);
  for (const [f, a, d] of [[2140, 1, .09], [3410, .6, .06], [5230, .35, .04], [890, .3, .12]])
    for (let i = 0; i < rate * .4 && t0 + i < n; i++) out[t0 + i] += .35 * a * Math.sin(2 * Math.PI * f * i / rate) * Math.exp(-i / (rate * d));
  // fades + normalise
  const fi = rate * .05, fo = rate * .6;
  for (let i = 0; i < n; i++) { if (i < fi) out[i] *= i / fi; if (i > n - fo) out[i] *= (n - i) / fo; }
  let peak = 0; for (const x of out) peak = Math.max(peak, Math.abs(x));
  const g = peak ? Math.pow(10, -3 / 20) / peak : 1; for (let i = 0; i < n; i++) out[i] *= g;
  return { samples: out, rate, peak: peak * g };
}

export function writeWav(file, { samples, rate }) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples.length * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  writeFileSync(file, b);
}

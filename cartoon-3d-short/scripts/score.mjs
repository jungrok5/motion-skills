// cartoon-3d-short · score.mjs — render the music + SFX bed to a WAV, and (with --voice) the final mix.
//   node <skill>/scripts/score.mjs score.js --dur 64                         → out/score.wav (48 kHz, 16-bit stereo)
//   node <skill>/scripts/score.mjs score.js --dur 64 --voice voice/voice.mp3 --words voice/words.json [--mix out/mix.wav]
// score.js exports SCORE (or a default export) with the spec documented in lib/score.js. With --words and no
// spec.duck, the duck spans are built from the word times (gaps < 0.35 s merged). With --voice (any format ffmpeg
// reads), the voice goes on top at unity, the bed is placed for a voice at −16 LUFS (it follows the voice's measured
// loudness), and the whole mix is normalised to −14 LUFS integrated with a soft peak limiter at −1 dBFS.
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const spec$ = args.find((a, i) => !a.startsWith('--') && !(i && args[i - 1].startsWith('--')));
if (!spec$ || !opt('dur')) { console.error('usage: score.mjs score.js --dur <s> [--out out/score.wav] [--voice v.mp3] [--words words.json] [--mix out/mix.wav]'); process.exit(1); }
const mod = await import(pathToFileURL(resolve(spec$)).href), spec = { ...(mod.SCORE || mod.default) };
const { renderScore } = await import(pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'score.js')).href);
const SR = 48000, dur = +opt('dur'), out = resolve(opt('out', 'out/score.wav'));
const VOICE_REF = -16, TARGET = -14, CEIL = Math.pow(10, -1 / 20);

// ---- duck spans from words.json ([{ s, e }] / [{ start, end }] / { words: […] })
if (opt('words') && !spec.duck) {
  const raw = JSON.parse(readFileSync(resolve(opt('words')), 'utf8')), list = Array.isArray(raw) ? raw : raw.words || raw.segments || [];
  const spans = list.map(w => [+(w.s ?? w.start ?? w.t0), +(w.e ?? w.end ?? w.t1)]).filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]), m = [];
  for (const s of spans) { const l = m[m.length - 1]; if (l && s[0] - l[1] < .35) l[1] = Math.max(l[1], s[1]); else m.push([...s]); }
  spec.duck = m; console.log(`duck: ${m.length} spans from ${list.length} words`);
}

// ---- BS.1770 integrated loudness: K-weighting (high shelf + RLB high-pass), 400 ms blocks / 100 ms hop, gates −70 / −10
function biquad(x, b, a) { const y = new Float64Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; }
function kweight(x, sr) {
  let w = 2 * Math.PI * 1681.974450955533 / sr, A = Math.pow(10, 3.99984385397 / 40), al = Math.sin(w) / (2 * 0.7071752369554193), c = Math.cos(w), sA = 2 * Math.sqrt(A) * al;
  let a0 = (A + 1) - (A - 1) * c + sA;
  const s1 = biquad(x, [A * ((A + 1) + (A - 1) * c + sA) / a0, -2 * A * ((A - 1) + (A + 1) * c) / a0, A * ((A + 1) + (A - 1) * c - sA) / a0], [1, 2 * ((A - 1) - (A + 1) * c) / a0, ((A + 1) - (A - 1) * c - sA) / a0]);
  w = 2 * Math.PI * 38.13547087613982 / sr; al = Math.sin(w) / (2 * 0.5003270373253953); c = Math.cos(w); a0 = 1 + al;
  return biquad(s1, [1, -2, 1], [1, -2 * c / a0, (1 - al) / a0]);
}
function lufs(chs, sr = SR) {
  const z = chs.map(x => kweight(x, sr)), B = Math.round(.4 * sr), H = Math.round(.1 * sr), blocks = [];
  const cum = z.map(y => { const c = new Float64Array(y.length + 1); for (let i = 0; i < y.length; i++) c[i + 1] = c[i] + y[i] * y[i]; return c; });
  for (let i = 0; i + B <= z[0].length; i += H) { let e = 0; for (const c of cum) e += (c[i + B] - c[i]) / B; blocks.push(e); }
  const ld = e => -0.691 + 10 * Math.log10(e), abs = blocks.filter(e => ld(e) > -70); if (!abs.length) return -Infinity;
  const rel = ld(abs.reduce((s, e) => s + e, 0) / abs.length) - 10, g = abs.filter(e => ld(e) > rel);
  return ld(g.reduce((s, e) => s + e, 0) / g.length);
}
// soft peak limiter: gain = windowed min of the needed gain (look-ahead ±2.5 ms), slow release, then box-smoothed
function limit(chs, ceil, sr = SR) {
  const N = chs[0].length, W = Math.round(.0025 * sr), need = new Float32Array(N);
  for (let i = 0; i < N; i++) { let p = 0; for (const x of chs) p = Math.max(p, Math.abs(x[i])); need[i] = p > ceil ? ceil / p : 1; }
  const h = new Float32Array(N), q = new Int32Array(N); let qh = 0, qt = 0;   // sliding-window minimum (monotonic deque)
  for (let i = 0; i < N + W; i++) {
    if (i < N) { while (qt > qh && need[q[qt - 1]] >= need[i]) qt--; q[qt++] = i; }
    const c = i - W; if (c < 0) continue; while (q[qh] < c - W) qh++; h[c] = need[q[qh]];
  }
  const rel = 1 - Math.exp(-1 / (.08 * sr)); let g = 1;
  for (let i = 0; i < N; i++) { g = Math.min(h[i], g + (1 - g) * rel); h[i] = g; }
  const H = i => i < 0 || i >= N ? 1 : h[i], sm = new Float32Array(N); let s = 0, red = 0;   // box over ±W keeps g ≤ need at peaks
  for (let i = -W; i <= W; i++) s += H(i);
  for (let i = 0; i < N; i++) { sm[i] = s / (2 * W + 1); s += H(i + W + 1) - H(i - W); }
  for (let i = 0; i < N; i++) { const gi = sm[i]; red = Math.max(red, -20 * Math.log10(gi)); for (const x of chs) x[i] = Math.max(-ceil, Math.min(ceil, x[i] * gi)); }
  return red;
}
function wav(path, chs, sr = SR) {
  const n = chs[0].length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  const pcm = new Int16Array(buf.buffer, buf.byteOffset + 44, n * 2);   // little-endian hosts (all Node targets)
  for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) pcm[i * 2 + c] = Math.round(Math.max(-1, Math.min(1, chs[c][i])) * 32767);
  mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, buf);
}

const t0 = Date.now(), [L, R] = renderScore(spec, SR, dur);
wav(out, [L, R]);
const bedL = lufs([L, R]);
console.log(`${out}  (${dur} s, ${SR} Hz, ${((Date.now() - t0) / 1000).toFixed(1)} s)  bed ${bedL.toFixed(1)} LUFS`);

if (opt('voice')) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', resolve(opt('voice')), '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  const v = new Float32Array(raw.buffer, raw.byteOffset, raw.length >> 2), N = L.length, vl = lufs([v, v]);
  if (v.length > N) console.warn(`warning: voice is ${(v.length / SR).toFixed(2)} s, longer than --dur ${dur}; cut`);
  const kb = Math.pow(10, ((isFinite(vl) ? vl : VOICE_REF) - VOICE_REF) / 20);   // bed follows the voice's loudness
  const bL = L.map(x => x * kb), bR = R.map(x => x * kb), vv = new Float32Array(N); vv.set(v.subarray(0, N));
  const ml = Float32Array.from(bL, (x, i) => x + vv[i]), mr = Float32Array.from(bR, (x, i) => x + vv[i]);
  const g = Math.pow(10, (TARGET - lufs([ml, mr])) / 20);
  for (let i = 0; i < N; i++) { ml[i] *= g; mr[i] *= g; }
  const red = limit([ml, mr], CEIL), mixOut = resolve(opt('mix', 'out/mix.wav'));
  wav(mixOut, [ml, mr]);
  const bl = lufs([bL, bR]), mixL = lufs([ml, mr]);
  console.log(`${mixOut}\n  voice ${vl.toFixed(1)} LUFS · bed ${bl.toFixed(1)} LUFS (bed trim ${(20 * Math.log10(kb)).toFixed(1)} dB) · mix ${mixL.toFixed(1)} LUFS (gain ${(20 * Math.log10(g)).toFixed(1)} dB, limiter max ${red.toFixed(1)} dB)`);
  console.log(`  voice over bed: ${(vl - bl).toFixed(1)} LU (aim 8–10; raise/lower spec.music / sfxGain to adjust)`);
}

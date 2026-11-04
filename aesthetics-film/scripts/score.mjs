// aesthetics-film · score.mjs — render the film's score to a WAV for the MP4 (the live page synthesises the same score).
//   node <skill>/scripts/score.mjs film.html [--out out/score.wav] [--lufs -18]     ← reads the spec and DURATION from the page
//   node <skill>/scripts/score.mjs score.js --dur <s>                               ← a static SCORE object, no page
// The spec is documented in lib/score.js; score.js usually exports score(F) so sections follow the film's chapters. The bed is normalised to --lufs (default −18 LUFS integrated:
// quiet, contemplative; there is no voice to sit under) with a soft limiter at −1 dBFS.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const spec$ = args.find((a, i) => !a.startsWith('--') && !(i && args[i - 1].startsWith('--')));
if (!spec$ || (!spec$.endsWith('.html') && !opt('dur'))) { console.error('usage: score.mjs film.html | score.js --dur <s>  [--out out/score.wav] [--lufs -18]'); process.exit(1); }
let spec, pageDur;
if (spec$.endsWith('.html')) {
  const { openFilm } = await import('./_browser.mjs');
  const { browser, page } = await openFilm(resolve(spec$), 'render=1&scale=.2&msaa=0');
  ({ spec, dur: pageDur } = await page.evaluate(() => ({ spec: window.film.scoreSpec(), dur: window.DURATION })));
  await browser.close();
  if (!spec) { console.error('the film has no score (new Film({ score }))'); process.exit(1); }
} else { const mod = await import(pathToFileURL(resolve(spec$)).href); spec = { ...(mod.SCORE || mod.default) }; }
const local = join(dirname(resolve(spec$)), 'lib', 'score.js'), skill = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'score.js');
const { renderScore } = await import(pathToFileURL(existsSync(local) ? local : skill).href);
const SR = 48000, dur = +(opt('dur') ?? pageDur), out = resolve(opt('out', 'out/score.wav')), TARGET = +opt('lufs', -18), CEIL = Math.pow(10, -1 / 20);

// BS.1770 integrated loudness (K-weighting, 400 ms blocks, gates −70 / −10)
function biquad(x, b, a) { const y = new Float64Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; }
function kweight(x, sr) {
  let w = 2 * Math.PI * 1681.974450955533 / sr, A = Math.pow(10, 3.99984385397 / 40), al = Math.sin(w) / (2 * 0.7071752369554193), c = Math.cos(w), sA = 2 * Math.sqrt(A) * al;
  let a0 = (A + 1) - (A - 1) * c + sA;
  const s1 = biquad(x, [A * ((A + 1) + (A - 1) * c + sA) / a0, -2 * A * ((A - 1) + (A + 1) * c) / a0, A * ((A + 1) + (A - 1) * c - sA) / a0], [1, 2 * ((A - 1) - (A + 1) * c) / a0, ((A + 1) - (A - 1) * c - sA) / a0]);
  w = 2 * Math.PI * 38.13547087613982 / sr; al = Math.sin(w) / (2 * 0.5003270373253953); c = Math.cos(w); a0 = 1 + al;
  return biquad(s1, [1, -2, 1], [1, -2 * c / a0, (1 - al) / a0]);
}
function lufs(chs, sr = SR) {
  const z = chs.map((x) => kweight(x, sr)), B = Math.round(0.4 * sr), H = Math.round(0.1 * sr), blocks = [];
  const cum = z.map((y) => { const c = new Float64Array(y.length + 1); for (let i = 0; i < y.length; i++) c[i + 1] = c[i] + y[i] * y[i]; return c; });
  for (let i = 0; i + B <= z[0].length; i += H) { let e = 0; for (const c of cum) e += (c[i + B] - c[i]) / B; blocks.push(e); }
  const ld = (e) => -0.691 + 10 * Math.log10(e), abs = blocks.filter((e) => ld(e) > -70); if (!abs.length) return -Infinity;
  const rel = ld(abs.reduce((s, e) => s + e, 0) / abs.length) - 10, g = abs.filter((e) => ld(e) > rel);
  return ld(g.reduce((s, e) => s + e, 0) / g.length);
}
function wav(path, chs, sr = SR) {
  const n = chs[0].length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, chs[c][i])) * 32767), 44 + (i * 2 + c) * 2);
  mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, buf);
}
const t0 = Date.now(), [L, R] = renderScore(spec, SR, dur);
const before = lufs([L, R]), g = Math.pow(10, (TARGET - before) / 20);
let peak = 0, clipped = 0;
for (let i = 0; i < L.length; i++) { for (const x of [L, R]) { let v = x[i] * g; if (Math.abs(v) > CEIL) { clipped++; v = Math.sign(v) * (CEIL + (1 - CEIL) * Math.tanh((Math.abs(v) - CEIL) / (1 - CEIL))); v = Math.max(-CEIL, Math.min(CEIL, v)); } x[i] = v; peak = Math.max(peak, Math.abs(v)); } }
wav(out, [L, R]);
console.log(`${out}  (${dur} s, ${SR} Hz, ${((Date.now() - t0) / 1000).toFixed(1)} s)  ${lufs([L, R]).toFixed(1)} LUFS, peak ${(20 * Math.log10(peak)).toFixed(1)} dBFS${clipped ? `, ${clipped} samples limited` : ''}`);

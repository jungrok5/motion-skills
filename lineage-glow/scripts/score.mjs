// lineage-glow · score.mjs — a project's score.js → 16-bit stereo WAV (the same synth the page plays live).
//   node <skill>/scripts/score.mjs score.js --dur 16 --out out/film.wav [--sr 44100]
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const src = args.find(a => a.endsWith('.js'));
if (!src || !opt('dur')) { console.error('usage: score.mjs score.js --dur <seconds> [--out out/film.wav]'); process.exit(1); }
const here = dirname(fileURLToPath(import.meta.url));
const { renderScore } = await import(pathToFileURL(join(here, '..', 'lib', 'score.js')).href);
const { SCORE } = await import(pathToFileURL(resolve(src)).href);
const sr = +opt('sr', 44100), dur = +opt('dur'), out = resolve(opt('out', 'out/film.wav'));
const t0 = Date.now(), [L, R] = renderScore(SCORE, sr, dur), n = L.length;
const buf = Buffer.alloc(44 + n * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
let peak = 0;
for (let i = 0; i < n; i++) {
  const l = Math.max(-1, Math.min(1, L[i])), r = Math.max(-1, Math.min(1, R[i])); peak = Math.max(peak, Math.abs(l), Math.abs(r));
  buf.writeInt16LE(Math.round(l * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(r * 32767), 46 + i * 4);
}
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, buf);
console.log(`${out}  ${dur} s, peak ${peak.toFixed(2)}  (${Date.now() - t0} ms)`);

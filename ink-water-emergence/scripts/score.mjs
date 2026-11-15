// ink-water-emergence · score.mjs — render a film's score to a WAV for the MP4 (the live page plays the same score itself).
//   node <skill>/scripts/score.mjs score.js --dur 13            → out/score.wav  (48 kHz, 16-bit stereo)
//   node <skill>/scripts/score.mjs score.js --dur 13 --out out/film.wav
// score.js exports SCORE; --dur is the film's DURATION (check.mjs prints it). Uses the project's lib/score.js if there is
// one (a project made by new-film.mjs), else the skill's.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const spec$ = args.find(a => a.endsWith('.js') || a.endsWith('.mjs'));
if (!spec$ || !opt('dur')) { console.error('usage: score.mjs score.js --dur <seconds> [--out out/score.wav] [--rate 48000]'); process.exit(1); }
const spec = (await import(pathToFileURL(resolve(spec$)).href)).SCORE;
const local = join(dirname(resolve(spec$)), 'lib', 'score.js');
const lib$ = existsSync(local) ? local : join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'score.js');
const { renderScore } = await import(pathToFileURL(lib$).href);
const sr = +opt('rate', 48000), dur = +opt('dur'), out = resolve(opt('out', 'out/score.wav'));
const t0 = Date.now(), [L, R] = renderScore(spec, sr, dur), n = L.length;
const buf = Buffer.alloc(44 + n * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
let clip = 0;
for (let i = 0; i < n; i++) { for (const [c, o] of [[L, 44], [R, 46]]) { const v = c[i]; if (!Number.isFinite(v)) throw new Error('score produced NaN at ' + (i / sr).toFixed(2) + ' s'); if (Math.abs(v) > 1) clip++; buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), o + i * 4); } }
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, buf);
console.log(`${out}  (${dur} s, ${sr} Hz, ${((Date.now() - t0) / 1000).toFixed(1)} s${clip ? `, ${clip} clipped samples` : ''})`);

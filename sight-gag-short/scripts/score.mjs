// sight-gag-short · score.mjs — render the film's sound (its score.js groove + every foley cue the shots declare) to a
// WAV, from the film page itself so picture and sound can never disagree:
//   node <skill>/scripts/score.mjs film.html [--out out/film.wav]
// The page exposes window.SCORE (the spec it was started with), window.cues() (the shots' sfx marks on the absolute
// timeline) and window.DURATION. Output: 48 kHz 16-bit stereo, ~−14 LUFS integrated, peaks ≤ −1 dBFS.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { openFilm } from './_browser.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const film = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(film)) { console.error('usage: score.mjs film.html [--out out/film.wav]'); process.exit(1); }
const { browser, page, errors } = await openFilm(film, 'scale=.25&mb=1');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const { spec, cues, dur } = await page.evaluate(() => ({ spec: window.SCORE || {}, cues: window.cues(), dur: window.DURATION }));
await browser.close();
// the lib next to the page (a project's own lib/ copy) or the skill's
const here = dirname(fileURLToPath(import.meta.url));
const libScore = existsSync(join(dirname(film), 'lib', 'score.js')) ? join(dirname(film), 'lib', 'score.js') : join(here, '..', 'lib', 'score.js');
const { renderScore, lufs, SFX_KINDS } = await import(pathToFileURL(libScore).href);
const bad = cues.filter(c => !SFX_KINDS.includes(c.kind)); if (bad.length) { console.error('unknown sfx kinds:', [...new Set(bad.map(c => c.kind))].join(', ')); process.exit(1); }
const SR = 48000, t0 = Date.now();
const { L, R } = renderScore({ ...spec, cues }, SR, dur);
const out = resolve(opt('out', 'out/film.wav')); mkdirSync(dirname(out), { recursive: true });
const n = L.length, buf = Buffer.alloc(44 + n * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
let peak = 0;
for (let i = 0; i < n; i++) { peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4); }
writeFileSync(out, buf);
console.log(`${out}  ${dur.toFixed(2)} s · ${cues.length} cues · ${lufs(L, R, SR).toFixed(1)} LUFS · peak ${(20 * Math.log10(peak)).toFixed(1)} dBFS · ${((Date.now() - t0) / 1000).toFixed(1)} s`);

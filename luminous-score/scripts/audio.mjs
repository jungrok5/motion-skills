// luminous-score · audio.mjs — the piece's sound: reads window.audioSpec() from the page and renders it with lib/synth.js → WAV.
//   node <skill>/scripts/audio.mjs piece.html --out out/piece.wav [--rate 44100]
// The page and this script use the same synth, so the live page and the MP4 sound the same.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openPiece } from './browser.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const file = resolve(args.find((a) => a.endsWith('.html')) || '');
if (!existsSync(file)) { console.error('usage: audio.mjs <piece.html> --out out/piece.wav'); process.exit(1); }
const out = resolve(opt('out', join('out', basename(file).replace(/\.html$/, '').replace(/^index$/, 'piece') + '.wav')));
const { browser, page } = await openPiece(file, { query: 'render=1&scale=.25', quiet: true });
const spec = await page.evaluate(() => window.audioSpec());
await browser.close();
// the page's own lib if it has one (a project), else the skill's
const local = join(dirname(file), 'lib', 'synth.js'), skillLib = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'synth.js');
const { renderAudio, wav } = await import(pathToFileURL(existsSync(local) ? local : skillLib).href);
const t0 = Date.now(), a = renderAudio(spec, { sampleRate: +opt('rate', 44100) });
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, wav(a));
console.log(`${out}  (${spec.notes.length} notes, ${spec.duration.toFixed(2)} s, ${((Date.now() - t0) / 1000).toFixed(1)} s to synthesise)`);

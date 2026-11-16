// torn-page-journey · score.mjs — the page's score → a WAV for the MP4. The score is a function of the journey (chapter
// starts, moods, gestures, coasting), so it is resolved by the page itself and rendered here with the same lib/score.js.
//   node <skill>/scripts/score.mjs index.html                      → out/<name>.wav (48 kHz, 16-bit stereo)
//   node <skill>/scripts/score.mjs index.html --out out/film.wav --rate 44100
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: score.mjs <index.html> [--out out/x.wav] [--rate 48000]'); process.exit(1); }
const name = basename(page$) === 'index.html' ? basename(dirname(page$)) : basename(page$, '.html');
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.goto(pathToFileURL(page$).href + '?render=1&scale=.1', { waitUntil: 'commit', timeout: 0 });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
const { spec, dur } = await page.evaluate(() => ({ spec: window.film.score, dur: window.film.dur }));
await browser.close();
if (!spec) { console.error('this page has no score'); process.exit(1); }
const { renderScore } = await import(pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'score.js')).href);
const sr = +opt('rate', 48000), out = resolve(opt('out', `out/${name}.wav`)), t0 = Date.now();
const [L, R] = renderScore(spec, sr, dur), n = L.length, buf = Buffer.alloc(44 + n * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4); }
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, buf);
console.log(`${out}  (${dur} s, ${sr} Hz, ${spec.notes.length} notes, ${spec.sfx.length} effects, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);

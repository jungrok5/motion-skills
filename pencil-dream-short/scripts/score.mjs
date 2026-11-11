// pencil-dream-short · score.mjs — render a film's score to a WAV for the MP4 (the live page plays the same score itself).
//   node <skill>/scripts/score.mjs film.html                     → out/<name>.wav  (48 kHz, 16-bit stereo)
//   node <skill>/scripts/score.mjs film.html --out out/film.wav
// It opens the page to read the score AND the pencil scratches the film derives from its own drawing (every stroke being
// drawn makes a sound), so the sound is synced to the strokes without writing them by hand.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: score.mjs <film.html> [--out out/film.wav] [--rate 48000]'); process.exit(1); }
const name = basename(page$) === 'index.html' ? basename(resolve(page$, '..')) : basename(page$).replace(/\.html$/, '');
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto(pathToFileURL(page$).href + '?render=1&scale=.25', { waitUntil: 'commit', timeout: 0 });
for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) { if (Date.now() - t0 > 60000) { console.error('never ready'); process.exit(1); } await new Promise(r => setTimeout(r, 100)); }
const { spec, dur } = await page.evaluate(() => { const f = window.film; if (!f.score) return { spec: null, dur: f.dur }; return { spec: { ...f.score, sfx: [...(f.score.sfx || []), ...(f.score.pen === false ? [] : f.penSfx())] }, dur: f.dur }; });
await browser.close();
if (!spec) { console.error('this film has no score (new Film({ score }))'); process.exit(1); }
const { renderScore } = await import(pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'score.js')).href);
const sr = +opt('rate', 48000), out = resolve(opt('out', `out/${name}.wav`));
const t0 = Date.now(), [L, R] = renderScore(spec, sr, dur), n = L.length, buf = Buffer.alloc(44 + n * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4); }
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, buf);
console.log(`${out}  (${dur} s, ${sr} Hz, ${spec.sfx.filter(s => s.type === 'pencil').length} pencil scratches from the drawing, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);

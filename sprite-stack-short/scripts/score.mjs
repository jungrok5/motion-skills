// sprite-stack-short · score.mjs — the page's score → a WAV for the MP4. The score is resolved by the page from its beats
// (views drawn, slices placed, the stack closing, the turn, the shard transitions) and the mover's speed (the engine).
//   node <skill>/scripts/score.mjs index.html                       → out/<name>.wav (48 kHz, 16-bit stereo)
//   node <skill>/scripts/score.mjs index.html --out out/short.wav --rate 44100
// then: node <skill>/scripts/render.mjs index.html --audio out/<name>.wav
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
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
const sr = +opt('rate', 48000), t0 = Date.now();
const r = await page.evaluate(sr => window.film.score ? { b64: window.film.wav(sr), dur: window.film.dur, notes: window.film.score.notes.length, sfx: window.film.score.sfx.length } : null, sr);
await browser.close();
if (!r) { console.error('this page has no score (lib/score.js not loaded?)'); process.exit(1); }
const out = resolve(opt('out', `out/${name}.wav`)); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, Buffer.from(r.b64, 'base64'));
console.log(`${out}  (${r.dur} s, ${sr} Hz, ${r.notes} notes, ${r.sfx} sounds, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);

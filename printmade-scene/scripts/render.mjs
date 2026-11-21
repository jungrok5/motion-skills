// printmade-scene · render.mjs — the MP4 (picture + the Web Audio score rendered offline), stills, a poster, a contact sheet,
// the cast sheet. Every frame is window.seek(t); the sound is the page's own score rendered offline.
//   node <skill>/scripts/render.mjs index.html                       → out/<name>.mp4 (1440×1080, 24 fps, AAC)
//   node <skill>/scripts/render.mjs index.html --scale .5            → 720×540 preview
//   node <skill>/scripts/render.mjs index.html --still 3,12.5        → out/<name>-3.png …
//   node <skill>/scripts/render.mjs index.html --sheet 12            → out/<name>-sheet.jpg (12 moments)
//   node <skill>/scripts/render.mjs index.html --cast                → out/<name>-cast.png
//   node <skill>/scripts/render.mjs index.html --poster 11           → out/<name>-poster.png + .jpg (1200 px, the plate at t = 11)
//   node <skill>/scripts/render.mjs index.html --wav                 → out/<name>.wav only
// Options: --out out/ · --workers 3 · --crf 20 · --from / --to (seconds) · --name x
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: render.mjs <index.html> [--still t] [--sheet 16] [--cast] [--wav] [--scale .5]'); process.exit(1); }
const name = opt('name', ['index.html', 'film.html'].includes(basename(page$)) ? basename(dirname(page$)) : basename(page$).replace(/\.html$/, ''));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = String(opt('scale', '1'));

const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'] });
async function open(query) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  let failed = null;
  page.on('pageerror', e => { failed = failed || e; console.error('page error:', e.message); });
  page.on('console', m => { if (m.type() === 'error') console.error('console error:', m.text().slice(0, 300)); });
  await page.goto(pathToFileURL(page$).href + '?' + query, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
    if (failed) throw new Error('page failed: ' + failed.message);
    if (Date.now() - t0 > 300000) throw new Error('page never set window.__ready');
    await new Promise(r => setTimeout(r, 100));
  }
  return page;
}
const grab = (page, t) => page.evaluate(t => { window.seek(t); return document.querySelector('canvas').toDataURL('image/png'); }, t);
const png = d => Buffer.from(d.split(',')[1], 'base64');
const done = () => browser.close().then(() => process.exit(0));

if (opt('cast')) {
  const page = await open('cast&cell=' + opt('cell', '220'));
  const f = join(outDir, `${name}-cast.png`); writeFileSync(f, png(await page.evaluate(() => window.__film.cast.toDataURL('image/png')))); console.log(f); await done();
}
const page = await open(`render=1&scale=${scale}`);
const DUR = await page.evaluate(() => window.DURATION), FPS = await page.evaluate(() => window.FPS || 24);
const poster = opt('poster');
if (poster) { const t = poster === true ? DUR - 1.6 : +poster, f = join(outDir, `${name}-poster.png`); writeFileSync(f, png(await grab(page, t))); execSync(`ffmpeg -y -loglevel error -i "${f}" -vf scale=1200:-1 -q:v 4 "${f.replace(/\.png$/, '.jpg')}"`); console.log(f + '  t = ' + t); await done(); }
const still = opt('still');
if (still && still !== true) { for (const s of String(still).split(',').map(Number)) { const f = join(outDir, `${name}-${s}.png`); writeFileSync(f, png(await grab(page, s))); console.log(f); } await done(); }
if (opt('sheet')) {
  const n = +opt('sheet') || 12, cols = n <= 9 ? 3 : n <= 12 ? 6 : 8, from = +opt('from', .4), to = +opt('to', DUR - .4), tmp = join(outDir, `.sheet-${name}`);
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp);
  const ts = Array.from({ length: n }, (_, i) => +(from + (to - from) * i / Math.max(1, n - 1)).toFixed(2));
  for (const [i, t] of ts.entries()) writeFileSync(join(tmp, `${String(i).padStart(3, '0')}.png`), png(await grab(page, t)));
  const f = join(outDir, `${name}-sheet.jpg`);
  execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${join(tmp, '%03d.png')}" -vf "scale=360:-1,tile=${cols}x${Math.ceil(n / cols)}:padding=6:color=0xe9e4da" -frames:v 1 -q:v 3 "${f}"`);
  rmSync(tmp, { recursive: true, force: true }); console.log(f + '  t = ' + ts.join(', ')); await done();
}
// the sound: the page renders its own score offline
const wavF = join(outDir, `${name}.wav`);
const audio = await page.evaluate(async () => { const F = window.__film; if (!F.score) return null; const r = await F.score.renderWav(F.film); return r; });
if (audio) { writeFileSync(wavF, Buffer.from(audio.wav, 'base64')); console.log(`${wavF}  peak ${audio.peak.toFixed(3)} · rms ${audio.rms.toFixed(4)}${audio.nan ? ' · NaN ' + audio.nan : ''}`); }
if (opt('wav')) await done();
await page.close();

const workers = +opt('workers', 3), crf = String(opt('crf', '20')), from = +opt('from', 0), to = +opt('to', DUR), n = Math.round((to - from) * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames @ ${FPS} fps, ${workers} workers`);
const t0 = Date.now(); let count = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const pg = await open(`render=1&scale=${scale}`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', join(tmp, `${String(w).padStart(2, '0')}.mp4`)]);
  for (let i = a; i < b; i++) { const buf = png(await grab(pg, from + i / FPS)); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); if (++count % 30 === 0) process.stdout.write(`  ${count}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)} s\r`); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await pg.close();
}));
const list = join(tmp, 'list.txt'), video = join(tmp, 'video.mp4'), f = join(outDir, `${name}.mp4`);
writeFileSync(list, Array.from({ length: workers }, (_, w) => w * per < n ? `file '${join(tmp, `${String(w).padStart(2, '0')}.mp4`)}'` : null).filter(Boolean).join('\n'));
execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy "${video}"`);
if (audio) execSync(`ffmpeg -y -loglevel error -i "${video}" -ss ${from} -t ${to - from} -i "${wavF}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${f}"`);
else execSync(`ffmpeg -y -loglevel error -i "${video}" -c copy -movflags +faststart "${f}"`);
rmSync(tmp, { recursive: true, force: true }); console.log(`\n${f}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
await done();

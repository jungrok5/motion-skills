// pencil-dream-short · render.mjs — stills, a contact sheet, or the MP4 of one film page, frame by frame (every frame is seek(t)).
// Run from the project root:
//   node <skill>/scripts/render.mjs film.html --stills 2,7,12         → out/film-2.png …   (look at these a lot)
//   node <skill>/scripts/render.mjs film.html --sheet 12              → out/film-sheet.jpg  (12 moments, 4 × 3)
//   node <skill>/scripts/render.mjs film.html --sheet 8 --from 2 --to 6    (a closer look at one stretch)
//   node <skill>/scripts/render.mjs film.html                         → out/film.mp4 (1920×1080, H.264)
// Options: --scale .5 (preview size) · --q "off=grain,bloom" (any page query) · --workers 3 · --fps 30 · --from/--to
//          --crf 20 · --audio out/film.wav (from score.mjs; muxed, trimmed) · --out out/
// Canvas 2D: ~0.1–0.3 s a 1080p frame on a CPU box (PNG encoding included); the plates are painted once per worker.
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: render.mjs <film.html> [--stills 2,7] [--sheet 12] [--workers 3]'); process.exit(1); }
const name = opt('name', basename(page$) === 'index.html' ? basename(resolve(page$, '..')) : basename(page$).replace(/\.html$/, ''));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = opt('scale', ''), extra = opt('q', '');
const url = pathToFileURL(page$).href + '?render=1' + (scale ? '&scale=' + scale : '') + (extra ? '&' + extra : '');

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
async function open() {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  let failed = null;
  page.on('pageerror', e => { failed = failed || e; console.error('page error:', e.message); });
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall|GL Driver Message/.test(m.text())) console.error(`console ${m.type()}:`, m.text().slice(0, 400)); });
  await page.goto(url, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
    if (failed) throw new Error('film failed to load: ' + failed.message);
    if (Date.now() - t0 > 240000) throw new Error('film never set window.__ready');
    await new Promise(r => setTimeout(r, 100));
  }
  return page;
}
const grab = (page, t) => page.evaluate(t => { window.seek(t); return document.querySelector('canvas').toDataURL('image/png'); }, t);
const png = d => Buffer.from(d.split(',')[1], 'base64');

const probe = await open();
const DUR = await probe.evaluate(() => window.DURATION), FPS = +opt('fps', await probe.evaluate(() => window.FPS || 30));
const from = +opt('from', 0), to = +opt('to', DUR);

const stills = opt('stills');
if (stills) {
  for (const s of stills.split(',').map(Number)) {
    const t0 = Date.now(), f = join(outDir, `${name}-${s}.png`);
    writeFileSync(f, png(await grab(probe, s))); console.log(`${f}  (${Date.now() - t0} ms)`);
  }
  await browser.close(); process.exit(0);
}
const sheet = opt('sheet');
if (sheet) {
  const n = +sheet, cols = n <= 6 ? 3 : 4, tmp = join(outDir, `.sheet-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp);
  for (let i = 0; i < n; i++) { const t = from + (to - from) * (n === 1 ? 0 : i / (n - 1)) * (to === DUR && from === 0 ? (DUR - 1 / FPS) / DUR : 1); writeFileSync(join(tmp, `${String(i).padStart(3, '0')}.png`), png(await grab(probe, +t.toFixed(3)))); process.stdout.write(`  ${i + 1}/${n} t=${t.toFixed(2)}\r`); }
  const f = join(outDir, `${name}-sheet.jpg`), rows = Math.ceil(n / cols);
  execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${join(tmp, '%03d.png')}" -vf "scale=640:-1,drawtext=text='%{eif\\:n*${((to - from) / Math.max(1, n - 1)).toFixed(4)}+${from}\\:d}s':x=12:y=10:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.45,tile=${cols}x${rows}:padding=4:color=white" -frames:v 1 -q:v 3 "${f}"`);
  rmSync(tmp, { recursive: true, force: true }); console.log(`\n${f}`);
  await browser.close(); process.exit(0);
}
await probe.close();

// the MP4: each worker owns a contiguous run of frames and pipes PNGs into its own ffmpeg; chunks are joined losslessly
const workers = +opt('workers', 3), crf = opt('crf', '20');
const n = Math.round((to - from) * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames @ ${FPS} fps, ${workers} workers`);
const t0 = Date.now(); let done = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const page = await open();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', String(FPS * 2),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise(r => ff.on('close', r));
  for (let f = a; f < b; f++) {
    if (!ff.stdin.write(png(await grab(page, from + f / FPS)))) await new Promise(r => ff.stdin.once('drain', r));
    if (++done % 15 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${done}/${n}  ${(s / done).toFixed(2)} s/frame  eta ${Math.round(s / done * (n - done))} s`); }
  }
  ff.stdin.end(); await closed; await page.close();
}));
await browser.close();
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map(f => `file '${f}'`).join('\n'));
const out = join(outDir, `${name}.mp4`), audio = opt('audio');
if (audio) execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -i "${resolve(audio)}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -af "afade=t=out:st=${(to - from - .6).toFixed(2)}:d=0.6" -t ${to - from} -movflags +faststart "${out}"`);
else execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy -movflags +faststart "${out}"`);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);

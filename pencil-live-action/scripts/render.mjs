// pencil-live-action · render.mjs — stills, a contact sheet, or the MP4 of one film page, frame by frame (every frame is seek(t)).
// Run from the project root (or the skill folder for its examples):
//   node <skill>/scripts/render.mjs film.html --stills 2,7,12        → out/film-2.png …   (look at these a lot)
//   node <skill>/scripts/render.mjs film.html --sheet 16             → out/film-sheet.jpg  (16 moments, 4 × 4)
//   node <skill>/scripts/render.mjs film.html --sheet 8 --from 12 --to 16      (a closer look at one stretch)
//   node <skill>/scripts/render.mjs film.html --workers 4 --audio out/film.wav  → out/film.mp4 (1920×1080, H.264)
// Options: --scale .5 (preview size) · --q "cdn=1&off=dof" (any page query) · --fps · --from/--to · --crf 20 · --out out/ · --root <dir>
// WebGL runs on the CPU here (SwiftShader): ~1–3 s a 1080p frame; 30 s ≈ 10–20 min with 4 workers. Preview at --scale .5 first.
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { serve, rootFor, openFilm, launch } from './_page.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: render.mjs <film.html> [--stills 2,7] [--sheet 16] [--workers 4] [--audio out/x.wav]'); process.exit(1); }
const name = opt('name', basename(page$) === 'index.html' ? basename(resolve(page$, '..')) : basename(page$).replace(/\.html$/, ''));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = opt('scale', ''), extra = opt('q', '');
const server = await serve(rootFor(page$, opt('root')));
const url = server.url(page$) + '?render=1' + (scale ? '&scale=' + scale : '') + (extra ? '&' + extra : '');
const browser = await launch();
const grab = (page, t) => page.evaluate(t => { window.seek(t); return document.querySelector('canvas').toDataURL('image/png'); }, t);
const png = d => Buffer.from(d.split(',')[1], 'base64');
const done = async () => { await browser.close(); server.close(); };

const probe = await openFilm(browser, url);
const DUR = await probe.evaluate(() => window.DURATION), FPS = +opt('fps', await probe.evaluate(() => window.FPS || 24));
const notes = await probe.evaluate(() => window.film.plate.notes); if (notes.length) console.log('note:', [...new Set(notes)].join(' · '));
const from = +opt('from', 0), to = +opt('to', DUR);

const stills = opt('stills');
if (stills) {
  for (const s of stills.split(',').map(Number)) { const t0 = Date.now(), f = join(outDir, `${name}-${s}.png`); writeFileSync(f, png(await grab(probe, s))); console.log(`${f}  (${Date.now() - t0} ms)`); }
  await done(); process.exit(0);
}
const sheet = opt('sheet');
if (sheet) {
  const n = +sheet, cols = n <= 6 ? 3 : 4, tmp = join(outDir, `.sheet-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp);
  const step = (to - from - (to === DUR ? 1 / FPS : 0)) / Math.max(1, n - 1);
  for (let i = 0; i < n; i++) { const t = +(from + step * i).toFixed(3); writeFileSync(join(tmp, `${String(i).padStart(3, '0')}.png`), png(await grab(probe, t))); process.stdout.write(`  ${i + 1}/${n} t=${t.toFixed(2)}\r`); }
  const f = join(outDir, `${name}-sheet.jpg`), rows = Math.ceil(n / cols);
  execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${join(tmp, '%03d.png')}" -vf "scale=640:-1,drawtext=text='%{eif\\:n*${step.toFixed(4)}+${from}\\:d}.%{eif\\:mod(n*${(step * 10).toFixed(4)}+${from * 10}\\,10)\\:d}s':x=12:y=10:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.45,tile=${cols}x${rows}:padding=4:color=white" -frames:v 1 -q:v 3 "${f}"`);
  rmSync(tmp, { recursive: true, force: true }); console.log(`\n${f}`);
  await done(); process.exit(0);
}
await probe.close();

// the MP4: each worker owns a contiguous run of frames and pipes PNGs into its own ffmpeg; chunks are joined losslessly
const workers = +opt('workers', 3), crf = opt('crf', '20');
const n = Math.round((to - from) * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames @ ${FPS} fps, ${workers} workers`);
const t0 = Date.now(); let count = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const page = await openFilm(browser, url);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', String(FPS * 2),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise(r => ff.on('close', r));
  for (let f = a; f < b; f++) {
    if (!ff.stdin.write(png(await grab(page, from + f / FPS)))) await new Promise(r => ff.stdin.once('drain', r));
    if (++count % 24 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${count}/${n}  ${(s / count).toFixed(2)} s/frame  eta ${Math.round(s / count * (n - count))} s`); }
  }
  ff.stdin.end(); await closed; await page.close();
}));
await done();
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map(f => `file '${f}'`).join('\n'));
const out = join(outDir, `${name}.mp4`), audio = opt('audio');
if (audio) execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -i "${resolve(audio)}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -af "afade=t=out:st=${(to - from - .6).toFixed(2)}:d=0.6" -t ${to - from} -movflags +faststart "${out}"`);
else execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy -movflags +faststart "${out}"`);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);

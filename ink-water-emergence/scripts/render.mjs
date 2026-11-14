// ink-water-emergence · render.mjs — stills, a contact sheet, or the MP4 of a film page, frame by frame (every frame is
// seek(t)). Run from the project root:
//   node <skill>/scripts/render.mjs film.html --stills 1.5,4,7.2      → out/film-1.5.png …   (look at these a lot)
//   node <skill>/scripts/render.mjs film.html --sheet 12              → out/film-sheet.jpg  (12 moments)
//   node <skill>/scripts/render.mjs film.html --sheet 8 --from 2 --to 5
//   node <skill>/scripts/render.mjs film.html --audio out/film.wav    → out/film.mp4 (H.264 + AAC)
// Options: --scale .5 (preview) · --q "off=smoke" (any page query) · --workers 3 · --from/--to · --crf 18 · --out out/
// WebGL2 runs on SwiftShader when there is no GPU: ~0.6–1.5 s a 1080p frame per worker on a CPU box.
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { args, openFilm, pageOf, rootOf, serve, browser, grab, png } from './_lib.mjs';

const { a, opt } = args(process.argv);
const target = a.find(x => x.endsWith('.html') || (existsSync(x) && !x.startsWith('--') && existsSync(join(x, 'index.html'))));
if (!target) { console.error('usage: render.mjs <film.html | project dir> [--stills 2,7] [--sheet 12] [--workers 3]'); process.exit(1); }
const page$ = resolve(pageOf(target));
const name = opt('name', basename(page$) === 'index.html' ? basename(resolve(page$, '..')) : basename(page$).replace(/\.html$/, ''));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const query = 'render=1' + (opt('scale') ? '&scale=' + opt('scale') : '') + (opt('q') ? '&' + opt('q') : '');
const server = serve(rootOf(page$)), br = await browser();
const probe = await openFilm(page$, query, { b: br, server });
const DUR = await probe.page.evaluate(() => window.DURATION), FPS = +opt('fps', await probe.page.evaluate(() => window.FPS));
const from = +opt('from', 0), to = +opt('to', DUR);
const done$ = async (code = 0) => { await br.close(); server.server.close(); if (server.misses.length) console.error('404:', server.misses.join(' ')); process.exit(code); };

if (opt('stills')) {
  for (const s of opt('stills').split(',').map(Number)) {
    const t0 = Date.now(), f = join(outDir, `${name}-${s}.png`);
    writeFileSync(f, png(await grab(probe.page, s))); console.log(`${f}  (${Date.now() - t0} ms)`);
  }
  await done$();
}
if (opt('sheet')) {
  const n = +opt('sheet'), cols = n <= 6 ? 3 : 4, tmp = join(outDir, `.sheet-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp);
  const span = (to - from) - (to === DUR ? 1 / FPS : 0);
  for (let i = 0; i < n; i++) { const t = +(from + span * (n === 1 ? 0 : i / (n - 1))).toFixed(3); writeFileSync(join(tmp, `${String(i).padStart(3, '0')}.png`), png(await grab(probe.page, t))); process.stdout.write(`  ${i + 1}/${n} t=${t}\r`); }
  const f = join(outDir, `${name}-sheet.jpg`), rows = Math.ceil(n / cols);
  execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${join(tmp, '%03d.png')}" -vf "scale=640:-1,drawtext=text='%{eif\\:n*${(span / Math.max(1, n - 1)).toFixed(4)}+${from}\\:d}s':x=12:y=10:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.45,tile=${cols}x${rows}:padding=4:color=white" -frames:v 1 -q:v 3 "${f}"`);
  rmSync(tmp, { recursive: true, force: true }); console.log(`\n${f}`);
  await done$();
}
await probe.close();
// the MP4: each worker owns a contiguous run of frames and pipes PNGs into its own ffmpeg; chunks are joined losslessly
const workers = +opt('workers', 3), crf = opt('crf', '18');
const n = Math.round((to - from) * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames @ ${FPS} fps, ${workers} workers`);
const t0 = Date.now(); let done = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const A = w * per, B = Math.min(n, A + per); if (A >= B) return;
  const f = await openFilm(page$, query, { b: br, server });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', String(FPS * 2),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise(r => ff.on('close', r));
  for (let k = A; k < B; k++) {
    if (!ff.stdin.write(png(await grab(f.page, from + k / FPS)))) await new Promise(r => ff.stdin.once('drain', r));
    if (++done % 24 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${done}/${n}  ${(s / done).toFixed(2)} s/frame  eta ${Math.round(s / done * (n - done))} s`); }
  }
  ff.stdin.end(); await closed; await f.close();
}));
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map(f => `file '${f}'`).join('\n'));
const out = join(outDir, `${name}.mp4`), audio = opt('audio');
if (audio) execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -i "${resolve(audio)}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -af "afade=t=out:st=${(to - from - .6).toFixed(2)}:d=0.6" -t ${to - from} -movflags +faststart "${out}"`);
else execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy -movflags +faststart "${out}"`);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
await done$();

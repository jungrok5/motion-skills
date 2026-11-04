// aesthetics-film · render.mjs — stills, a contact sheet, or the MP4 of a film page, frame by frame (every frame is
// seek(t), so any worker can render any frame). Run from the project root:
//   node <skill>/scripts/render.mjs film.html --stills 2,14.5,40 --scale .5   → out/film-2.png …
//   node <skill>/scripts/render.mjs film.html --sheet 16 --scale .4           → out/film-sheet.jpg (16 moments)
//   node <skill>/scripts/render.mjs film.html --audio out/score.wav           → out/film.mp4 (1920×1080, 30 fps)
// Options: --workers 2  --from 0 --to <dur>  --crf 17  --out out/  --name film  --q "msaa=2" (any page query)
// Without a GPU, SwiftShader already spreads one browser over every core: more than 2 workers is slower, not faster.
// Measured on 4 cores: ~1–1.8 s a 1920×1080 frame (shadowed interiors are the slow ones), ~0.3–0.8 s at --scale .5.
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { openFilm } from './_browser.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find((a) => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: render.mjs <film.html> [--stills 1,2 | --sheet 16] [--scale .5] [--audio score.wav]'); process.exit(1); }
const name = opt('name', basename(page$).replace(/\.html$/, '').replace(/^index$/, 'film'));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const workers = +opt('workers', 2), crf = opt('crf', '17'), scale = opt('scale', ''), extra = opt('q', '');
const query = 'render=1' + (scale ? '&scale=' + scale : '') + (extra ? '&' + extra : '');
const browsers = [];
async function open() { const { browser, page, errors } = await openFilm(page$, query); browsers.push(browser); page.on('pageerror', (e) => console.error('page error:', e.message)); if (errors.length) console.error(errors.join('\n')); return page; }
const grab = (page, t, type = 'image/png') => page.evaluate(([t, type]) => { window.seek(t); return window.film.canvas.toDataURL(type, 0.92); }, [t, type]);
const save = (f, d) => writeFileSync(f, Buffer.from(d.split(',')[1], 'base64'));

const probe = await open();
const DUR = await probe.evaluate(() => window.DURATION), FPS = await probe.evaluate(() => window.FPS || 30);
const stills = opt('stills'), sheet = opt('sheet');
if (stills || sheet) {
  const ts = stills ? stills.split(',').map(Number) : Array.from({ length: +sheet }, (_, i) => +((i + 0.5) * DUR / +sheet).toFixed(2));
  const tmp = join(outDir, `.sheet-${name}`);
  if (sheet) { rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true }); }
  for (const [i, s] of ts.entries()) {
    const t0 = Date.now(), d = await grab(probe, s);
    const f = sheet ? join(tmp, `${String(i).padStart(3, '0')}.png`) : join(outDir, `${name}-${s}.png`);
    save(f, d); console.log(`${f}  (${Date.now() - t0} ms)`);
  }
  if (sheet) {
    const cols = Math.ceil(Math.sqrt(ts.length)), rows = Math.ceil(ts.length / cols), out = join(outDir, `${name}-sheet.jpg`);
    execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${tmp}/%03d.png" -vf "scale=480:-1,drawtext=text='%{n}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.5,tile=${cols}x${rows}:padding=4:color=0x111111" -frames:v 1 -q:v 3 "${out}"`);
    console.log(`${out}  (${ts.map((t, i) => `${i}=${t}s`).join(' ')})`);
    rmSync(tmp, { recursive: true, force: true });
  }
  for (const b of browsers) await b.close(); process.exit(0);
}
await probe.close();

const from = +opt('from', 0), to = +opt('to', DUR);
const n = Math.round((to - from) * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames @ ${FPS} fps, ${workers} workers`);
const t0 = Date.now(); let done = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const page = await open();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', String(FPS * 2), '-bf', '2',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise((r) => ff.on('close', r));
  for (let f = a; f < b; f++) {
    const d = await grab(page, from + f / FPS);
    if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    if (++done % 60 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${done}/${n}  ${(s / done).toFixed(2)} s/frame  eta ${Math.round(s / done * (n - done))} s`); }
  }
  ff.stdin.end(); await closed; await page.close();
}));
for (const b of browsers) await b.close();
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map((f) => `file '${f}'`).join('\n'));
const silent = join(tmp, 'video.mp4'), out = join(outDir, `${name}.mp4`), audio = opt('audio');
execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy "${silent}"`);
if (audio && existsSync(resolve(audio))) execSync(`ffmpeg -y -loglevel error -i "${silent}" -ss ${from} -i "${resolve(audio)}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 -t ${(to - from).toFixed(3)} -movflags +faststart "${out}"`);
else { if (audio) console.error(`no audio at ${audio} — writing a silent MP4`); execSync(`ffmpeg -y -loglevel error -i "${silent}" -c copy -movflags +faststart "${out}"`); }
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s, ${((Date.now() - t0) / 1000 / n).toFixed(2)} s/frame)`);

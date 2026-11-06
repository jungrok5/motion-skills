// parallax-facade · render.mjs — stills, a contact sheet, or the MP4 of a film page, frame by frame (every frame is
// seek(t), so any worker can render any frame). Run from the project root:
//   node <skill>/scripts/render.mjs film.html --stills 0.3,1.2,4.5 --scale .5     → out/film-0.3.png …
//   node <skill>/scripts/render.mjs film.html --sheet 16 --scale .4                → out/film-sheet.jpg (16 moments, 4 x 4)
//   node <skill>/scripts/render.mjs film.html --audio out/loop.wav                 → out/film.mp4 (1920 x 1080, 30 fps)
//   node <skill>/scripts/render.mjs film.html --audio out/loop.wav --loops 3       → the loop played 3 times (for posting)
//   node <skill>/scripts/render.mjs film.html --q "fps=60"                         → 60 fps like the reference
// Options: --workers 4  --from 0 --to <dur>  --crf 16  --out out/  --name film  --q "ar=9:16&finish=ink" (any page query)
// WebGL runs on SwiftShader when there is no GPU: a held 1920 x 1080 frame takes ~0.5-1 s, a moving one (8 blur
// sub-frames) ~4-8 s per worker. Previews at --scale .5 with --q blur=3 are ~6x faster.
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
if (!existsSync(page$)) { console.error('usage: render.mjs <film.html> [--stills 1,2 | --sheet 16] [--scale .5] [--audio loop.wav] [--loops 3]'); process.exit(1); }
const name = opt('name', basename(page$).replace(/\.html$/, '').replace(/^index$/, 'film'));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const workers = +opt('workers', 4), crf = opt('crf', '16'), scale = opt('scale', ''), extra = opt('q', '');
const url = pathToFileURL(page$).href + '?render=1' + (scale ? '&scale=' + scale : '') + (extra ? '&' + extra : '');

// one browser per worker: pages of one browser share a single GPU process, so they would render one after another
const ARGS = ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--autoplay-policy=no-user-gesture-required'];
const browsers = [];
async function open() {
  const browser = await chromium.launch({ args: ARGS }); browsers.push(browser);
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  let failed = null;
  page.on('pageerror', e => { failed = failed || e; console.error('page error:', e.message); });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error(`console ${m.type()}:`, m.text().slice(0, 400)); });
  await page.goto(url, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
    if (failed) throw new Error('film failed to load: ' + failed.message);
    if (Date.now() - t0 > 300000) throw new Error('film never set window.__ready');
    await new Promise(r => setTimeout(r, 150));
  }
  return page;
}
const grab = (page, t, type = 'image/png') => page.evaluate(([t, type]) => { window.seek(t); return document.querySelector('canvas').toDataURL(type, 0.9); }, [t, type]);
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
    execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${tmp}/%03d.png" -vf "scale=480:-1,drawtext=text='%{n}':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.5,tile=${cols}x${rows}:padding=4:color=0x111111" -frames:v 1 -q:v 3 "${out}"`);
    console.log(`${out}  (${ts.map((t, i) => `${i}=${t}s`).join(' ')})`);
    rmSync(tmp, { recursive: true, force: true });
  }
  for (const b of browsers) await b.close(); process.exit(0);
}
await probe.close();

const from = +opt('from', 0), to = +opt('to', DUR);
// frames 0 … n−1: frame n would equal frame 0 (the loop wraps), so it is never rendered
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
  const closed = new Promise(r => ff.on('close', r));
  for (let f = a; f < b; f++) {
    const d = await grab(page, from + f / FPS);
    if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (++done % 30 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${done}/${n}  ${(s / done).toFixed(2)} s/frame  eta ${Math.round(s / done * (n - done))} s`); }
  }
  ff.stdin.end(); await closed; await page.close();
}));
for (const b of browsers) await b.close();
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map(f => `file '${f}'`).join('\n'));
const silent = join(tmp, 'video.mp4'), out = join(outDir, `${name}.mp4`), audio = opt('audio'), loops = +opt('loops', 1);
execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy "${silent}"`);
let video = silent;
if (loops > 1) { video = join(tmp, 'looped.mp4'); execSync(`ffmpeg -y -loglevel error -stream_loop ${loops - 1} -i "${silent}" -c copy "${video}"`); }
const len = ((to - from) * loops).toFixed(3);
if (audio && existsSync(resolve(audio))) {
  // the loop's sound is looped with the picture and cut to its length; AAC 192k at 48 kHz
  execSync(`ffmpeg -y -loglevel error -i "${video}" -stream_loop ${loops - 1} -i "${resolve(audio)}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 -t ${len} -movflags +faststart "${out}"`);
} else {
  if (audio) console.error(`no audio at ${audio} — writing a silent MP4`);
  execSync(`ffmpeg -y -loglevel error -i "${video}" -c copy -movflags +faststart "${out}"`);
}
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s, ${((Date.now() - t0) / 1000 / n).toFixed(2)} s/frame)`);

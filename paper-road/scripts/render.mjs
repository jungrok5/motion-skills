// paper-road · render.mjs — stills, a contact sheet, or the MP4 of one scene page (every frame is seek(t)).
// Run from the project root:
//   node <skill>/scripts/render.mjs scene.html --stills 2,9.5,14       → out/scene-9.5.png … (1920×1080, look at these)
//   node <skill>/scripts/render.mjs scene.html --sheet 12               → out/scene-sheet.png (12 moments, half size)
//   node <skill>/scripts/render.mjs scene.html                          → out/scene.mp4 (1920×1080, H.264)
//   node <skill>/scripts/render.mjs scene.html --audio music.mp3        (mux a soundtrack, trimmed to the video)
//   node <skill>/scripts/render.mjs scene.html --q "off=grain,boil"     (any page query: off=…, steps=0 for smooth motion)
// Options: --from 0 --to 30 (a range, seconds)  --workers 3  --crf 17  --out out/  --name scene
// Poses are held on twos (STEPS = 12 at 24 fps), so a frame whose frameKey(t) equals the previous one is reused,
// not redrawn: half the frames cost nothing.
import { createRequire } from 'node:module';
import { spawn, execFileSync, execSync } from 'node:child_process';
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
if (!existsSync(page$)) { console.error('usage: render.mjs <scene.html> [--stills 0,5] [--sheet 12] [--audio file] [--q query]'); process.exit(1); }
const name = opt('name', basename(page$) === 'index.html' ? basename(resolve(page$, '..')) : basename(page$).replace(/\.html$/, ''));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const workers = +opt('workers', 3), crf = opt('crf', '17'), extra = opt('q', '');
const url = pathToFileURL(page$).href + '?render=1' + (extra ? '&' + extra : '');

const browser = await chromium.launch();
async function open() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  let failed = null;
  page.on('pageerror', e => { failed = failed || e; console.error('page error:', e.message); });
  page.on('console', m => { if (m.type() === 'error') console.error('console error:', m.text().slice(0, 400)); });
  await page.goto(url, { waitUntil: 'load', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
    if (failed) throw new Error('scene failed to load: ' + failed.message);
    if (Date.now() - t0 > 60000) throw new Error('scene never set window.__ready');
    await new Promise(r => setTimeout(r, 50));
  }
  return page;
}
const grab = (page, t, type = 'png', half = false) => page.evaluate(([t, type, half]) => {
  window.seek(t); let c = document.querySelector('canvas');
  if (half) { const o = document.createElement('canvas'); o.width = c.width / 2; o.height = c.height / 2; o.getContext('2d').drawImage(c, 0, 0, o.width, o.height); c = o; }
  return c.toDataURL(type === 'png' ? 'image/png' : 'image/jpeg', 0.92);
}, [t, type, half]).then(d => Buffer.from(d.split(',')[1], 'base64'));

const probe = await open();
const { DUR, FPS, W, H } = await probe.evaluate(() => ({ DUR: window.DURATION, FPS: window.FPS, W: window.SIZE.W, H: window.SIZE.H }));
const tag = extra ? '-' + extra.replace(/[^a-z0-9]+/gi, '') : '';

if (opt('stills')) {
  for (const s of opt('stills').split(',').map(Number)) {
    const f = join(outDir, `${name}${tag}-${s}.png`); writeFileSync(f, await grab(probe, s)); console.log(f);
  }
  await browser.close(); process.exit(0);
}
if (opt('sheet')) {
  const n = +opt('sheet'), cols = n > 8 ? 4 : n > 4 ? 3 : n, a = +opt('from', 0), b = +opt('to', DUR);
  const times = Array.from({ length: n }, (_, i) => +(a + (b - a) * (i + 0.5) / n).toFixed(2));
  const shots = []; for (const t of times) shots.push((await grab(probe, t, 'jpeg', true)).toString('base64'));
  const jpg = await probe.evaluate(async ([shots, times, cols]) => {
    const imgs = await Promise.all(shots.map(s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/jpeg;base64,' + s; })));
    const w = imgs[0].width, h = imgs[0].height, rows = Math.ceil(imgs.length / cols), c = document.createElement('canvas');
    c.width = cols * w + (cols - 1) * 8; c.height = rows * h + (rows - 1) * 8; const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
    imgs.forEach((im, i) => { const X = (i % cols) * (w + 8), Y = Math.floor(i / cols) * (h + 8); x.drawImage(im, X, Y); x.fillStyle = '#000a'; x.fillRect(X, Y, 110, 34); x.fillStyle = '#fff'; x.font = '24px monospace'; x.fillText(times[i] + ' s', X + 10, Y + 25); });
    return c.toDataURL('image/jpeg', 0.88);
  }, [shots, times, cols]);
  const f = join(outDir, `${name}${tag}-sheet.jpg`); writeFileSync(f, Buffer.from(jpg.split(',')[1], 'base64')); console.log(f);
  await browser.close(); process.exit(0);
}
await probe.close();

// ---- the MP4: frames from..to, split across workers, each worker encodes a chunk, then concat (stream copy) ----
const f0 = Math.round(+opt('from', 0) * FPS), f1 = Math.round(+opt('to', DUR) * FPS), n = f1 - f0, per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames (${(n / FPS).toFixed(2)} s @ ${FPS} fps), ${W}×${H}, ${workers} workers`);
const t0 = Date.now(); let done = 0, drawn = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = f0 + w * per, b = Math.min(f1, a + per); if (a >= b) return;
  const page = await open();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', String(FPS * 2),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart',
    join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise(r => ff.on('close', r));
  let lastKey = null, lastBuf = null;
  for (let f = a; f < b; f++) {
    const key = await page.evaluate(t => window.frameKey ? window.frameKey(t) : t, f / FPS);
    if (key !== lastKey || !lastBuf) { lastBuf = await grab(page, f / FPS); lastKey = key; drawn++; }
    if (!ff.stdin.write(lastBuf)) await new Promise(r => ff.stdin.once('drain', r));
    if (++done % 120 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${done}/${n}  ${(s / done * 1000).toFixed(0)} ms/frame  eta ${Math.round(s / done * (n - done))} s`); }
  }
  ff.stdin.end(); await closed; await page.close();
}));
await browser.close();
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map(f => `file '${f}'`).join('\n'));
const out = join(outDir, `${name}.mp4`), audio = opt('audio');
if (audio) {
  const silent = join(tmp, 'video.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', resolve(audio), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-af', `afade=t=out:st=${Math.max(0, n / FPS - 1.2)}:d=1.2`, '-shortest', '-movflags', '+faststart', out]);
} else {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
}
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s, ${drawn} poses drawn for ${n} frames)`);

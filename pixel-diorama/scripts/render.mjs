// pixel-diorama · render.mjs — stills, a contact sheet, or the loop MP4 of one scene page (every frame is seek(t)).
// Run from the project root:
//   node <skill>/scripts/render.mjs scene.html --stills 0,17.3,30     → out/scene-17.3.png … (scaled ×4, look at these)
//   node <skill>/scripts/render.mjs scene.html --sheet 8               → out/scene-sheet.png (8 moments across the loop)
//   node <skill>/scripts/render.mjs scene.html                         → out/scene.mp4 (one loop, 1920×1080, H.264)
//   node <skill>/scripts/render.mjs scene.html --q "pass=light"        (any page query: pass=base|light, off=rain,light,…)
// Options: --scale 4 (8 = 4K from 480×270)  --workers 2  --crf 16  --out out/  --gif 6 (also a short preview GIF, seconds)
// The page canvas is tiny (480×270), so frames are cheap; ffmpeg scales them up nearest-neighbour, so pixels stay square
// and sharp. An integer scale ≥ 2 also keeps the 4:2:0 chroma blocks inside one pixel, so colours do not bleed.
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
if (!existsSync(page$)) { console.error('usage: render.mjs <scene.html> [--stills 0,5] [--sheet 8] [--scale 4] [--gif 6]'); process.exit(1); }
const name = opt('name', basename(page$) === 'index.html' ? basename(resolve(page$, '..')) : basename(page$).replace(/\.html$/, ''));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const workers = +opt('workers', 2), crf = opt('crf', '16'), extra = opt('q', '');
const url = pathToFileURL(page$).href + '?render=1' + (extra ? '&' + extra : '');

const browser = await chromium.launch();
async function open() {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
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
// one frame as PNG bytes, upscaled in the page (nearest) when k > 1
const grab = (page, t, k = 1) => page.evaluate(([t, k]) => {
  window.seek(t); const c = document.querySelector('canvas');
  if (k === 1) return c.toDataURL('image/png');
  const o = document.createElement('canvas'); o.width = c.width * k; o.height = c.height * k;
  const x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, o.width, o.height); return o.toDataURL('image/png');
}, [t, k]).then(d => Buffer.from(d.split(',')[1], 'base64'));

const probe = await open();
const { LOOP, FPS, W, H, SCALE } = await probe.evaluate(() => ({ LOOP: window.DURATION, FPS: window.FPS, W: window.PIXEL.W, H: window.PIXEL.H, SCALE: window.PIXEL.scale }));
const scale = +opt('scale', SCALE), tag = extra ? '-' + extra.replace(/[^a-z0-9]+/gi, '') : '';

if (opt('stills')) {
  for (const s of opt('stills').split(',').map(Number)) {
    const f = join(outDir, `${name}${tag}-${s}.png`); writeFileSync(f, await grab(probe, s, scale)); console.log(f);
  }
  await browser.close(); process.exit(0);
}
if (opt('sheet')) {
  // a grid of moments across the loop, each at ×2, labelled with its time
  const n = +opt('sheet'), cols = n > 4 ? 4 : n, times = Array.from({ length: n }, (_, i) => +(LOOP * i / n).toFixed(2));
  const shots = []; for (const t of times) shots.push((await grab(probe, t, 2)).toString('base64'));
  const png = await probe.evaluate(async ([shots, times, cols]) => {
    const imgs = await Promise.all(shots.map(s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; })));
    const w = imgs[0].width, h = imgs[0].height, rows = Math.ceil(imgs.length / cols), c = document.createElement('canvas');
    c.width = cols * w + (cols - 1) * 8; c.height = rows * h + (rows - 1) * 8; const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
    imgs.forEach((im, i) => { const X = (i % cols) * (w + 8), Y = Math.floor(i / cols) * (h + 8); x.drawImage(im, X, Y); x.fillStyle = '#000a'; x.fillRect(X, Y, 86, 26); x.fillStyle = '#fff'; x.font = '18px monospace'; x.fillText(times[i] + ' s', X + 8, Y + 19); });
    return c.toDataURL('image/png');
  }, [shots, times, cols]);
  const f = join(outDir, `${name}${tag}-sheet.png`); writeFileSync(f, Buffer.from(png.split(',')[1], 'base64')); console.log(f);
  await browser.close(); process.exit(0);
}
await probe.close();

// ---- the loop MP4: frames 0 … n-1 (frame n would be frame 0 again) ----
const n = Math.round(LOOP * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames (${LOOP} s @ ${FPS} fps), ${W}×${H} → ${W * scale}×${H * scale}, ${workers} workers`);
const t0 = Date.now(); let done = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const page = await open();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-vf', `scale=${W * scale}:${H * scale}:flags=neighbor`, '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-tune', 'animation',
    '-pix_fmt', 'yuv420p', '-g', String(FPS * 2), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-movflags', '+faststart', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise(r => ff.on('close', r));
  for (let f = a; f < b; f++) {
    const buf = await grab(page, f / FPS);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (++done % 150 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${done}/${n}  ${(s / done * 1000).toFixed(0)} ms/frame  eta ${Math.round(s / done * (n - done))} s`); }
  }
  ff.stdin.end(); await closed; await page.close();
}));
await browser.close();
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map(f => `file '${f}'`).join('\n'));
const out = join(outDir, `${name}.mp4`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
const gif = opt('gif');
if (gif) {
  const g = join(outDir, `${name}.gif`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-t', gif, '-i', out, '-vf', `fps=15,scale=${W * 2}:${H * 2}:flags=neighbor,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=none`, g]);
  console.log(g);
}

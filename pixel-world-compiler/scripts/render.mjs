// pixel-world-compiler · render.mjs — stills, a contact sheet, the cast sheet, or the tour MP4 of one world page.
// Run from the project root:
//   node <skill>/scripts/render.mjs index.html --stills 0,8.5,16      → out/<name>-8.5.png (×4, look at these)
//   node <skill>/scripts/render.mjs index.html --sheet 8              → out/<name>-sheet.png (8 moments of the tour)
//   node <skill>/scripts/render.mjs index.html --cast                 → out/<name>-cast.png (every body, both ways)
//   node <skill>/scripts/render.mjs index.html                        → out/<name>.mp4 (the tour, 1920×1080 H.264)
//   node <skill>/scripts/render.mjs index.html --q "pass=flat"        (any page query: pass=flat, off=shadows,reflect,…)
// Options: --scale 4 (8 = 4K)  --workers 2  --crf 16  --out out/  --name x
// The page is 480×270; ffmpeg scales nearest-neighbour, so pixels stay square and every colour stays a palette entry.
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
const has = (k) => args.includes('--' + k);
const page$ = resolve(args.find((a) => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: render.mjs <index.html> [--stills 0,5] [--sheet 8] [--cast] [--scale 4]'); process.exit(1); }
const name = opt('name', basename(page$) === 'index.html' ? basename(resolve(page$, '..')) : basename(page$).replace(/\.html$/, ''));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const workers = +opt('workers', 2), crf = opt('crf', '16'), extra = [opt('q', ''), has('cast') ? 'sheet=cast' : ''].filter(Boolean).join('&');
const url = pathToFileURL(page$).href + '?render=1' + (extra ? '&' + extra : '');

const browser = await chromium.launch();
async function open() {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  let failed = null;
  page.on('pageerror', (e) => { failed = failed || e; console.error('page error:', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') console.error('console error:', m.text().slice(0, 400)); });
  await page.goto(url, { waitUntil: 'load', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
    if (failed) throw new Error('world failed to compile: ' + failed.message);
    if (Date.now() - t0 > 120000) throw new Error('world never set window.__ready');
    await new Promise((r) => setTimeout(r, 50));
  }
  return page;
}
const grab = (page, t, k = 1) => page.evaluate(([t, k]) => {
  if (t != null) window.seek(t); const c = document.querySelector('canvas');
  if (k === 1) return c.toDataURL('image/png');
  const o = document.createElement('canvas'); o.width = c.width * k; o.height = c.height * k;
  const x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, o.width, o.height); return o.toDataURL('image/png');
}, [t, k]).then((d) => Buffer.from(d.split(',')[1], 'base64'));

const probe = await open();
const { DUR, FPS, W, H, SCALE } = await probe.evaluate(() => ({ DUR: window.DURATION, FPS: window.FPS, W: window.PIXEL.W, H: window.PIXEL.H, SCALE: window.PIXEL.scale }));
const scale = +opt('scale', SCALE), tag = opt('q', '') ? '-' + opt('q', '').replace(/[^a-z0-9]+/gi, '') : '';

if (has('cast')) {
  const f = join(outDir, `${name}${tag}-cast.png`); writeFileSync(f, await grab(probe, null, +opt('scale', 3))); console.log(f);
  await browser.close(); process.exit(0);
}
if (opt('stills')) {
  for (const s of opt('stills').split(',').map(Number)) { const f = join(outDir, `${name}${tag}-${s}.png`); writeFileSync(f, await grab(probe, s, scale)); console.log(f); }
  await browser.close(); process.exit(0);
}
if (opt('sheet')) {
  const n = +opt('sheet'), cols = n > 4 ? 4 : n, times = Array.from({ length: n }, (_, i) => +((DUR * i) / n).toFixed(2));
  const shots = []; for (const t of times) shots.push((await grab(probe, t, 2)).toString('base64'));
  const png = await probe.evaluate(async ([shots, times, cols]) => {
    const imgs = await Promise.all(shots.map((s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; })));
    const w = imgs[0].width, h = imgs[0].height, rows = Math.ceil(imgs.length / cols), c = document.createElement('canvas');
    c.width = cols * w + (cols - 1) * 8; c.height = rows * h + (rows - 1) * 8; const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
    imgs.forEach((im, i) => { const X = (i % cols) * (w + 8), Y = Math.floor(i / cols) * (h + 8); x.drawImage(im, X, Y); x.fillStyle = '#000a'; x.fillRect(X, Y, 86, 26); x.fillStyle = '#fff'; x.font = '18px monospace'; x.fillText(times[i] + ' s', X + 8, Y + 19); });
    return c.toDataURL('image/png');
  }, [shots, times, cols]);
  const f = join(outDir, `${name}${tag}-sheet.png`); writeFileSync(f, Buffer.from(png.split(',')[1], 'base64')); console.log(f);
  await browser.close(); process.exit(0);
}
await probe.close();

const n = Math.round(DUR * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames (${DUR} s @ ${FPS} fps), ${W}×${H} → ${W * scale}×${H * scale}, ${workers} workers`);
const t0 = Date.now(); let done = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const page = await open();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-vf', `scale=${W * scale}:${H * scale}:flags=neighbor`, '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-tune', 'animation',
    '-pix_fmt', 'yuv420p', '-g', String(FPS * 2), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-movflags', '+faststart', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise((r) => ff.on('close', r));
  for (let f = a; f < b; f++) {
    const buf = await grab(page, f / FPS);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (++done % 150 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${done}/${n}  ${((s / done) * 1000).toFixed(0)} ms/frame  eta ${Math.round((s / done) * (n - done))} s`); }
  }
  ff.stdin.end(); await closed; await page.close();
}));
await browser.close();
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map((f) => `file '${f}'`).join('\n'));
const out = join(outDir, `${name}.mp4`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);

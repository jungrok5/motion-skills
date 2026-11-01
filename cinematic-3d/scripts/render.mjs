// cinematic-3d · render.mjs — stills or an MP4 of one shot page, frame by frame (deterministic: every frame is seek(t)).
// Run from the project root:
//   node <skill>/scripts/render.mjs shots/rain.html --stills 0,2.5,5      → out/rain-0.png …  (look at these a lot)
//   node <skill>/scripts/render.mjs shots/rain.html                        → out/rain.mp4 (1080×1920, H.264 high quality, tune grain)
//   node <skill>/scripts/render.mjs shots/rain.html --q "pass=atmos" --stills 2   (any page query: pass=scene|atmos|mirror|coc, scale=.5)
// Options: --workers 2  --fps <page FPS>  --from 0 --to <dur>  --crf 15  --out out/  --scale 1 (preview renders: 0.5)
// Shot chunks are near-lossless (CRF 15, grain makes them ~150 Mbps); film.mjs re-encodes to sane rates.
// Each worker owns a contiguous run of frames and pipes PNGs into its own ffmpeg; the chunks are joined without re-encoding.
// WebGL runs wherever Chromium puts it: on a GPU box it is fast, on a CPU box SwiftShader takes ~1–4 s a frame at 1080×1920.
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
if (!existsSync(page$)) { console.error('usage: render.mjs <shot.html> [--stills 1,2] [--workers 2]'); process.exit(1); }
const name = opt('name', basename(page$).replace(/\.html$/, ''));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const workers = +opt('workers', 2), crf = opt('crf', '15'), scale = opt('scale', '');
const extra = opt('q', '');
const url = pathToFileURL(page$).href + '?render=1' + (scale ? '&scale=' + scale : '') + (extra ? '&' + extra : '');

const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
async function open() {
  const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('page error:', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error(`console ${m.type()}:`, m.text().slice(0, 400)); });
  let failed = null; page.on('pageerror', e => { failed = failed || e; });
  await page.goto(url);
  // wait for __ready, but stop at once if the page threw while loading
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
    if (failed) throw new Error('shot failed to load: ' + failed.message);
    if (Date.now() - t0 > 180000) throw new Error('shot never set window.__ready');
    await new Promise(r => setTimeout(r, 100));
  }
  return page;
}
const grab = (page, t) => page.evaluate(t => { window.seek(t); return document.querySelector('canvas').toDataURL('image/png'); }, t);

const probe = await open();
const DUR = await probe.evaluate(() => window.DURATION), FPS = +opt('fps', await probe.evaluate(() => window.FPS || 30));
const stills = opt('stills');
if (stills) {
  for (const s of stills.split(',').map(Number)) {
    const t0 = Date.now(); const d = await grab(probe, s);
    const f = join(outDir, `${name}${extra ? '-' + extra.replace(/[^a-z0-9]+/gi, '') : ''}-${s}.png`); writeFileSync(f, Buffer.from(d.split(',')[1], 'base64'));
    console.log(`${f}  (${Date.now() - t0} ms)`);
  }
  await browser.close(); process.exit(0);
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
    '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-tune', 'grain', '-pix_fmt', 'yuv420p', '-g', String(FPS * 2), '-bf', '2',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise(r => ff.on('close', r));
  for (let f = a; f < b; f++) {
    const d = await grab(page, from + f / FPS);
    if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (++done % 15 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${done}/${n}  ${(s / done).toFixed(2)} s/frame  eta ${Math.round(s / done * (n - done))} s`); }
  }
  ff.stdin.end(); await closed; await page.close();
}));
await browser.close();
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map(f => `file '${f}'`).join('\n'));
const out = join(outDir, `${name}.mp4`);
execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy -movflags +faststart "${out}"`);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);

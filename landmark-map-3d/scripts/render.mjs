// landmark-map-3d · render.mjs — stills, a contact sheet, a quick preview or the MP4 of one film page, frame by frame
// (every frame is seek(t), grabbed from the composited #frame canvas). Run from the project root:
//   node <skill>/scripts/render.mjs film.html --stills 1,6,12          → out/film-1.png …  (look at these a lot)
//   node <skill>/scripts/render.mjs film.html --sheet 12 --scale .4    → out/film-sheet.jpg (12 moments, 6 × 2)
//   node <skill>/scripts/render.mjs film.html --preview                → out/film-preview.mp4 (half size, 15 fps, fast)
//   node <skill>/scripts/render.mjs film.html --audio out/film.wav     → out/film.mp4 (1080×1920, H.264 + AAC)
// Options: --scale .5 · --q "off=labels" or "msaa=2" (any page query) · --workers 3 · --fps 30 · --from/--to · --crf 17
//          --out out/ · --name film
// WebGL runs wherever Chromium puts it: fast on a GPU; on a CPU box (SwiftShader) a 1080×1920 frame takes a few seconds.
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const flag = k => args.includes('--' + k);
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: render.mjs <film.html> [--stills 2,7] [--sheet 12] [--preview] [--workers 3]'); process.exit(1); }
const name = opt('name', basename(page$) === 'index.html' ? basename(resolve(page$, '..')) : basename(page$).replace(/\.html$/, ''));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const preview = flag('preview');
const scale = opt('scale', preview ? '.5' : ''), extra = opt('q', '');

import { serve, CHROME_ARGS } from './serve.mjs';
const { srv, url } = await serve(page$, '?render=1' + (scale ? '&scale=' + scale : '') + (extra ? '&' + extra : ''), opt('root') ? resolve(opt('root')) : undefined);
const browser = await chromium.launch({ args: CHROME_ARGS });
async function open() {
  const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 });
  let failed = null;
  page.on('pageerror', e => { failed = failed || e; console.error('page error:', e.message); });
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall|GL Driver Message|ReadPixels|texImage/.test(m.text())) console.error(`console ${m.type()}:`, m.text().slice(0, 400)); });
  await page.goto(url, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
    if (failed) throw new Error('film failed to load: ' + failed.message);
    if (Date.now() - t0 > 300000) throw new Error('film never set window.__ready');
    await new Promise(r => setTimeout(r, 150));
  }
  return page;
}
const grab = (page, t, type = 'image/png') => page.evaluate(([t, type]) => { window.seek(t); return document.getElementById('frame').toDataURL(type, .92); }, [t, type]);
const bin = d => Buffer.from(d.split(',')[1], 'base64');

try {
  const probe = await open();
  const DUR = await probe.evaluate(() => window.DURATION), FPS = +opt('fps', preview ? 15 : await probe.evaluate(() => window.FPS || 30));
  const from = +opt('from', 0), to = +opt('to', DUR);
  const stills = opt('stills');
  if (stills) {
    for (const s of stills.split(',').map(Number)) {
      const t0 = Date.now(), f = join(outDir, `${name}-${s}.png`);
      writeFileSync(f, bin(await grab(probe, s))); console.log(`${f}  (${Date.now() - t0} ms)`);
    }
  } else if (opt('sheet')) {
    const n = +opt('sheet'), cols = n <= 6 ? n : Math.ceil(n / 2), tmp = join(outDir, `.sheet-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp);
    const ts = Array.from({ length: n }, (_, i) => +(from + (to - from - 1 / FPS) * (n === 1 ? 0 : i / (n - 1))).toFixed(2));
    for (let i = 0; i < n; i++) { writeFileSync(join(tmp, `${String(i).padStart(3, '0')}.png`), bin(await grab(probe, ts[i]))); process.stdout.write(`  ${i + 1}/${n} t=${ts[i]}\r`); }
    const f = join(outDir, `${name}-sheet.jpg`), rows = Math.ceil(n / cols);
    const step = n > 1 ? (to - from - 1 / FPS) / (n - 1) : 0;
    execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${join(tmp, '%03d.png')}" -vf "scale=360:-1,drawtext=text='%{eif\\:n*${step.toFixed(4)}+${from}\\:d}.%{eif\\:mod(n*${(step * 10).toFixed(4)}+${from * 10}\\,10)\\:d}s':x=10:y=10:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.45,tile=${cols}x${rows}:padding=4:color=white" -frames:v 1 -q:v 3 "${f}"`);
    rmSync(tmp, { recursive: true, force: true }); console.log(`\n${f}`);
  } else {
    await probe.close();
    // each worker owns a contiguous run of frames and pipes PNGs to its own ffmpeg; chunks are joined losslessly
    const workers = +opt('workers', 3), crf = opt('crf', preview ? '24' : '17');
    const n = Math.round((to - from) * FPS), per = Math.ceil(n / workers);
    const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
    console.log(`${name}: ${n} frames @ ${FPS} fps, ${workers} workers${preview ? ' (preview)' : ''}`);
    const t0 = Date.now(); let done = 0;
    await Promise.all(Array.from({ length: workers }, async (_, w) => {
      const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
      const page = await open();
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', preview ? 'mjpeg' : 'png', '-i', '-',
        '-c:v', 'libx264', '-preset', preview ? 'veryfast' : 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', String(FPS * 2),
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
      const closed = new Promise(r => ff.on('close', r));
      for (let f = a; f < b; f++) {
        if (!ff.stdin.write(bin(await grab(page, from + f / FPS, preview ? 'image/jpeg' : 'image/png')))) await new Promise(r => ff.stdin.once('drain', r));
        if (++done % 15 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${done}/${n}  ${(s / done).toFixed(2)} s/frame  eta ${Math.round(s / done * (n - done))} s`); }
      }
      ff.stdin.end(); await closed; await page.close();
    }));
    const list = join(tmp, 'list.txt');
    writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map(f => `file '${f}'`).join('\n'));
    const out = join(outDir, `${name}${preview ? '-preview' : ''}.mp4`), audio = opt('audio');
    if (audio) execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -i "${resolve(audio)}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -af "afade=t=out:st=${(to - from - .8).toFixed(2)}:d=0.8" -t ${to - from} -movflags +faststart "${out}"`);
    else execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy -movflags +faststart "${out}"`);
    rmSync(tmp, { recursive: true, force: true });
    console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
} finally { await browser.close(); srv.close(); }

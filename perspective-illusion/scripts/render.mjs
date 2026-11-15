// perspective-illusion · render.mjs — stills, a contact sheet, a preview or the final MP4 of a scene page. Every frame is
// window.frame(ms): jittered sub-renders averaged on the GPU inside the page (4 for anti-aliasing, up to 32 on fast moves
// for gapless motion blur, sized by how far window.probe points move), so one image per frame leaves the browser.
// Run from the project root:
//   node <skill>/scripts/render.mjs scene.html --stills 0.3,2.4,5            → out/scene-0.3.png …
//   node <skill>/scripts/render.mjs scene.html --sheet                       → out/scene-sheet.jpg (every key + every move's middle)
//   node <skill>/scripts/render.mjs scene.html --sheet 12 --scale .5         → 12 even moments
//   node <skill>/scripts/render.mjs scene.html --preview                     → out/scene-preview.mp4 (960 × 540, 30 fps, light AA)
//   node <skill>/scripts/render.mjs scene.html                               → out/scene.mp4 (1920 × 1080, 30 fps, full AA + blur)
// Options: --ss 1.5 (render the passes at 1.5× and filter down: steadier lines where details stack a pixel apart, ~2× slower)
//          --fps 60  --workers 4  --from 0 --to <s>  --crf 15  --mink 4 --maxk 32 --step 2  --out out/  --name scene
//          --loops 3 (play the loop 3 times, re-encoded so every player loops it)  --q "k=v&…" (extra page query)
// Without a GPU, WebGL runs on SwiftShader: a full-size frame takes ~1–3 s per sub-render; previews are ~10× faster.
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
const has = (k) => args.includes('--' + k);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const page$ = resolve(args.find((a) => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: render.mjs <scene.html> [--stills 0.3,2 | --sheet [n] | --preview] [--fps 60] [--workers 4]'); process.exit(1); }
const PREVIEW = has('preview');
const name = opt('name', basename(page$).replace(/\.html$/, '').replace(/^index$/, 'scene'));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = opt('scale', PREVIEW ? '.5' : ''), extra = opt('q', ''), ss = opt('ss', '');
const FPSo = opt('fps', PREVIEW ? '30' : '');
const url = pathToFileURL(page$).href + '?render=1' + (scale ? '&scale=' + scale : '') + (ss ? '&ss=' + ss : '') + (extra ? '&' + extra : '');
const AA = { mink: +opt('mink', PREVIEW ? 1 : 4), maxk: +opt('maxk', PREVIEW ? 8 : 32), step: +opt('step', PREVIEW ? 6 : 2) };

// one browser per worker: pages of one browser share one GPU process and would render one after another
const ARGS = ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
const browsers = [];
async function open() {
  const browser = await chromium.launch({ args: ARGS }); browsers.push(browser);
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  let failed = null;
  page.on('pageerror', (e) => { failed = failed || e; console.error('page error:', e.message); });
  page.on('console', (m) => {
    const t = m.text(); if (/GPU stall|ReadPixels/.test(t)) return;
    if (m.type() === 'error' || m.type() === 'warning') console.error(`console ${m.type()}:`, t.slice(0, 600));
    if (/not compiled|program not valid|THREE\.WebGLProgram/.test(t)) failed = failed || new Error('a shader failed to compile (see above)');
  });
  await page.goto(url, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.READY === true));) {
    if (failed) throw new Error('scene failed to load: ' + failed.message);
    if (Date.now() - t0 > 300000) throw new Error('scene never set window.READY');
    await new Promise((r) => setTimeout(r, 150));
  }
  return page;
}
const grab = (page, ms, o, type = 'image/png') => page.evaluate(([ms, o, type]) => { const k = window.frame(ms, o); return [k, document.querySelector('#frame').toDataURL(type, 0.92)]; }, [ms, o, type]);
const save = (f, d) => writeFileSync(f, Buffer.from(d.split(',')[1], 'base64'));

const probe = await open();
const LOOP = await probe.evaluate(() => window.LOOP), FPS = +(FPSo || (await probe.evaluate(() => window.FPS)) || 30);
const stills = opt('stills'), sheet = has('sheet');
if (stills || sheet) {
  let ts;
  if (stills) ts = stills.split(',').map((s) => +s * 1000);
  else {
    const n = opt('sheet');
    if (n) ts = Array.from({ length: +n }, (_, i) => Math.round(((i + 0.5) * LOOP) / +n));
    else {
      // every key (just before it, so holds read) and the middle of every move between different shots
      const keys = await probe.evaluate(() => window.film.keyList.map((k) => ({ t: k.t, name: k.name })));
      ts = []; for (let i = 0; i < keys.length - 1; i++) { ts.push(Math.max(0, keys[i].t)); if (keys[i + 1].name.replace(/\d+$/, '').replace(/D$/, '') !== keys[i].name.replace(/\d+$/, '').replace(/D$/, '')) ts.push((keys[i].t + keys[i + 1].t) / 2); }
    }
  }
  const tmp = join(outDir, `.sheet-${name}`);
  if (sheet) { rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true }); }
  const o = { ...AA, fps: FPS, mink: +opt('mink', sheet ? 1 : 4), maxk: +opt('maxk', sheet ? 1 : AA.maxk) };
  for (const [i, ms] of ts.entries()) {
    const t0 = Date.now(), [k, d] = await grab(probe, ms, o);
    const f = sheet ? join(tmp, `${String(i).padStart(3, '0')}.png`) : join(outDir, `${name}-${+(ms / 1000).toFixed(3)}.png`);
    save(f, d); console.log(`${f}  ${(ms / 1000).toFixed(2)} s · ${k} renders · ${Date.now() - t0} ms`);
  }
  if (sheet) {
    const cols = Math.ceil(Math.sqrt(ts.length * 16 / 9 / 1.8)), rows = Math.ceil(ts.length / cols), out = join(outDir, `${name}-sheet.jpg`);
    const lab = ts.map((t) => (t / 1000).toFixed(2)).join(' ');
    execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${tmp}/%03d.png" -vf "scale=560:-1,drawtext=text='%{n}':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.55,tile=${cols}x${rows}:padding=4:color=0x111111" -frames:v 1 -q:v 3 "${out}"`);
    console.log(`${out}  (${ts.map((t, i) => `${i}=${(t / 1000).toFixed(2)}s`).join(' ')})`);
    rmSync(tmp, { recursive: true, force: true }); void lab;
  }
  for (const b of browsers) await b.close(); process.exit(0);
}
await probe.close();

const from = +opt('from', 0), to = +opt('to', LOOP / 1000), workers = +opt('workers', 4), crf = opt('crf', PREVIEW ? '21' : '15');
// frames 0 … n−1: frame n would equal frame 0 (the loop wraps), so it is never rendered
const n = Math.round((to - from) * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}${PREVIEW ? '-p' : ''}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames @ ${FPS} fps, ${workers} workers, AA ${AA.mink}–${AA.maxk} renders${PREVIEW ? ' (preview)' : ''}`);
const t0 = Date.now(); let done = 0, renders = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const page = await open();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', PREVIEW ? 'veryfast' : 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', String(FPS * 2),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise((r) => ff.on('close', r));
  for (let f = a; f < b; f++) {
    const [k, d] = await grab(page, (from + f / FPS) * 1000, { ...AA, fps: FPS }, PREVIEW ? 'image/jpeg' : 'image/png'); renders += k;
    if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    if (++done % 30 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${done}/${n}  ${(s / done).toFixed(2)} s/frame  eta ${Math.round((s / done) * (n - done))} s`); }
  }
  ff.stdin.end(); await closed; await page.close();
}));
for (const b of browsers) await b.close();
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map((f) => `file '${f}'`).join('\n'));
const out = join(outDir, `${name}${PREVIEW ? '-preview' : ''}.mp4`), loops = +opt('loops', 1), joined = join(tmp, 'joined.mp4');
execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy "${joined}"`);
// re-encode when looping: "-stream_loop … -c copy" makes files some players stop early
if (loops > 1) execSync(`ffmpeg -y -loglevel error -stream_loop ${loops - 1} -i "${joined}" -c:v libx264 -preset slow -crf ${crf} -pix_fmt yuv420p -movflags +faststart "${out}"`);
else execSync(`ffmpeg -y -loglevel error -i "${joined}" -c copy -movflags +faststart "${out}"`);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s, ${((Date.now() - t0) / 1000 / n).toFixed(2)} s/frame, ${(renders / n).toFixed(1)} renders/frame)`);

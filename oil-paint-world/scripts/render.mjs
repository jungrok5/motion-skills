// oil-paint-world · render.mjs — stills, a contact sheet, the cast sheet, a preview or the final MP4 of a world page.
// Every frame is window.seek(t) on a ?render=1 page; the picture is the canvas #frame. Run from the project root:
//   node <skill>/scripts/render.mjs world.html --stills 1.5,6,9.2        → out/world-1.5.png …
//   node <skill>/scripts/render.mjs world.html --sheet [12] --scale .5   → out/world-sheet.jpg (every shot: start, middle, end — or n even moments)
//   node <skill>/scripts/render.mjs world.html --cast --scale .5         → out/world-cast.jpg (the wanderer from every side, in every gait)
//   node <skill>/scripts/render.mjs world.html --preview                 → out/world-preview.mp4 (960 × 540, less paint, fast)
//   node <skill>/scripts/render.mjs world.html                           → out/world.mp4 (1920 × 1080, 30 fps)
// Options: --fps 24  --workers 3  --from 0 --to <s>  --crf 18  --scale .5  --out out/  --name world  --q "q=.6&off=shafts"  --audio x.wav
// Without a GPU, WebGL runs on the CPU (SwiftShader): about 4–6 s a 1080p frame for 300,000 dabs in view; three workers
// on four cores roughly halve the wall time. A preview (half size, q=.5) is about 1 s a frame.
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const args = process.argv.slice(2);
const has = (k) => args.includes('--' + k);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const page$ = resolve(args.find((a) => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: render.mjs <world.html> [--stills 1,2 | --sheet [n] | --cast | --preview] [--workers 3] [--q "q=.6"]'); process.exit(1); }
const PREVIEW = has('preview');
const name = opt('name', basename(page$).replace(/\.html$/, '').replace(/^index$/, 'world'));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = opt('scale', PREVIEW ? '.5' : '1'), extra = opt('q', PREVIEW ? 'q=.5' : '');
const url = pathToFileURL(page$).href + '?render=1&scale=' + scale + (extra ? '&' + extra : '');
const ARGS = ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
const browsers = [];
async function open() {
  const browser = await chromium.launch({ args: ARGS }); browsers.push(browser);
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  let failed = null;
  page.on('pageerror', (e) => { failed = failed || e; console.error('page error:', e.message); });
  page.on('console', (m) => { const t = m.text(); if (/GPU stall|ReadPixels/.test(t)) return; if (m.type() === 'error' || m.type() === 'warning') console.error(`console ${m.type()}:`, t.slice(0, 900)); if (/not compiled|program not valid|THREE\.WebGLProgram/.test(t)) failed = failed || new Error('a shader failed to compile'); });
  await page.goto(url, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.READY === true));) {
    if (failed) throw new Error('the world failed to load: ' + failed.message);
    if (Date.now() - t0 > 300000) throw new Error('the page never set window.READY');
    await new Promise((r) => setTimeout(r, 150));
  }
  return page;
}
const grab = (page, t, type = 'image/png') => page.evaluate(([t, type]) => { window.seek(t); return document.querySelector('#frame').toDataURL(type, 0.93); }, [t, type]);
const save = (f, d) => writeFileSync(f, Buffer.from(d.split(',')[1], 'base64'));
const tile = (dir, n, out, labels, crop = '') => {
  const cols = Math.ceil(Math.sqrt((n * 16) / 9 / (crop ? 0.75 : 1.8))), rows = Math.ceil(n / cols);
  execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${dir}/%03d.png" -vf "${crop}scale=${crop ? 380 : 560}:-1,drawtext=text='%{n}':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.55,tile=${cols}x${rows}:padding=4:color=0x111111" -frames:v 1 -q:v 3 "${out}"`);
  console.log(`${out}\n  ${labels.map((l, i) => `${i} = ${l}`).join('\n  ')}`);
};

const probe = await open();
const DUR = await probe.evaluate(() => window.DURATION), FPS = +opt('fps', (await probe.evaluate(() => window.FPS)) || 30);
if (has('cast')) {
  const tmp = join(outDir, `.cast-${name}`), labels = [];
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  for (let i = 0; ; i++) {
    const r = await probe.evaluate((i) => { const label = window.showCast(i); return label && { label, url: document.querySelector('#frame').toDataURL('image/png') }; }, i);
    if (!r) break;
    save(join(tmp, `${String(i).padStart(3, '0')}.png`), r.url); labels.push(r.label);
  }
  if (!labels.length) console.error('this world has no wanderer (W.figure)');
  else tile(tmp, labels.length, join(outDir, `${name}-cast.jpg`), labels, 'crop=ih*0.62:ih,');
  rmSync(tmp, { recursive: true, force: true });
  for (const b of browsers) await b.close(); process.exit(0);
}
const stills = opt('stills'), sheet = has('sheet');
if (stills || sheet) {
  let ts;
  if (stills) ts = stills.split(',').map(Number);
  else if (opt('sheet')) { const n = +opt('sheet'); ts = Array.from({ length: n }, (_, i) => +(((i + 0.5) * DUR) / n).toFixed(2)); }
  else ts = (await probe.evaluate(() => window.film.list.map((s) => [s.t0 + 0.15, (s.t0 + s.t1) / 2, s.t1 - 0.1]))).flat().map((t) => +t.toFixed(2));
  const tmp = join(outDir, `.sheet-${name}`);
  if (sheet) { rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true }); }
  for (const [i, t] of ts.entries()) {
    const t0 = Date.now(), d = await grab(probe, t);
    const f = sheet ? join(tmp, `${String(i).padStart(3, '0')}.png`) : join(outDir, `${name}-${t}.png`);
    save(f, d); if (!sheet) console.log(`${f}  ${t.toFixed(2)} s · ${Date.now() - t0} ms · ${(await probe.evaluate(() => window.film.drawn())).toLocaleString('en')} dabs in view`);
  }
  if (sheet) { tile(tmp, ts.length, join(outDir, `${name}-sheet.jpg`), ts.map((t) => t.toFixed(2) + ' s')); rmSync(tmp, { recursive: true, force: true }); }
  for (const b of browsers) await b.close(); process.exit(0);
}
await probe.close();

const from = +opt('from', 0), to = +opt('to', DUR), workers = +opt('workers', 3), crf = opt('crf', PREVIEW ? '23' : '18');
const n = Math.round((to - from) * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}${PREVIEW ? '-p' : ''}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames @ ${FPS} fps, ${workers} workers${PREVIEW ? ' (preview)' : ''}`);
const t0 = Date.now(); let done = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const page = await open();
  // broken colour and brush relief are fine detail: CRF 18 keeps the strokes crisp (about 6–9 Mb/s at 1080p); --crf 22 for the web
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', PREVIEW ? 'veryfast' : 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', String(FPS * 2), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise((r) => ff.on('close', r));
  for (let f = a; f < b; f++) {
    const d = await grab(page, from + f / FPS, PREVIEW ? 'image/jpeg' : 'image/png');
    if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    if (++done % 30 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${done}/${n}  ${(s / done).toFixed(2)} s/frame  eta ${Math.round((s / done) * (n - done))} s`); }
  }
  ff.stdin.end(); await closed; await page.close();
}));
for (const b of browsers) await b.close();
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map((f) => `file '${f}'`).join('\n'));
const out = join(outDir, `${name}${PREVIEW ? '-preview' : ''}.mp4`), joined = join(tmp, 'joined.mp4'), audio = opt('audio');
execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy "${joined}"`);
if (audio && existsSync(audio)) execSync(`ffmpeg -y -loglevel error -i "${joined}" -ss ${from} -i "${resolve(audio)}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${out}"`);
else execSync(`ffmpeg -y -loglevel error -i "${joined}" -c copy -movflags +faststart "${out}"`);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s, ${((Date.now() - t0) / 1000 / n).toFixed(2)} s/frame${audio ? ', with ' + basename(audio) : ''})`);

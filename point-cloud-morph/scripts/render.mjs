// point-cloud-morph · render.mjs — stills, a contact sheet, the form sheet, a preview or the final MP4 of a film page.
// Every frame is window.seek(t) on a ?render=1 page; the cloud and the HUD are composited on #frame, so one PNG per frame
// leaves the browser. Run from the project root:
//   node <skill>/scripts/render.mjs film.html --stills 1.5,6,9.2        → out/film-1.5.png …
//   node <skill>/scripts/render.mjs film.html --sheet [12] --scale .5   → out/film-sheet.jpg (every shot: mid-morph, settled, end — or n even moments)
//   node <skill>/scripts/render.mjs film.html --forms --scale .5        → out/film-forms.jpg (each form alone: front, right, back, left)
//   node <skill>/scripts/render.mjs film.html --preview                 → out/film-preview.mp4 (960 × 540, fast)
//   node <skill>/scripts/render.mjs film.html --audio out/film.wav      → out/film.mp4 (1920 × 1080, 30 fps, with sound)
// Options: --fps 60  --workers 4  --from 0 --to <s>  --crf 20  --scale .5  --out out/  --name film  --q "n=200000&off=hud"
// Without a GPU, WebGL runs on SwiftShader: ~0.15–0.4 s a 1080p frame for 150k points.
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
if (!existsSync(page$)) { console.error('usage: render.mjs <film.html> [--stills 1,2 | --sheet [n] | --forms | --preview] [--audio x.wav] [--workers 4]'); process.exit(1); }
const PREVIEW = has('preview');
const name = opt('name', basename(page$).replace(/\.html$/, '').replace(/^index$/, 'film'));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = opt('scale', PREVIEW ? '.5' : '1'), extra = opt('q', '');
const url = pathToFileURL(page$).href + '?render=1&scale=' + scale + (extra ? '&' + extra : '');
const ARGS = ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
const browsers = [];
async function open() {
  const browser = await chromium.launch({ args: ARGS }); browsers.push(browser);
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  let failed = null;
  page.on('pageerror', (e) => { failed = failed || e; console.error('page error:', e.message); });
  page.on('console', (m) => { const t = m.text(); if (/GPU stall|ReadPixels/.test(t)) return; if (m.type() === 'error' || m.type() === 'warning') console.error(`console ${m.type()}:`, t.slice(0, 600)); if (/not compiled|program not valid|THREE\.WebGLProgram/.test(t)) failed = failed || new Error('a shader failed to compile'); });
  await page.goto(url, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.READY === true));) {
    if (failed) throw new Error('film failed to load: ' + failed.message);
    if (Date.now() - t0 > 300000) throw new Error('film never set window.READY');
    await new Promise((r) => setTimeout(r, 150));
  }
  return page;
}
const grab = (page, t, type = 'image/png') => page.evaluate(([t, type]) => { window.seek(t); return document.querySelector('#frame').toDataURL(type, 0.92); }, [t, type]);
const save = (f, d) => writeFileSync(f, Buffer.from(d.split(',')[1], 'base64'));
const tile = (dir, n, out, labels) => {
  const cols = Math.ceil(Math.sqrt((n * 16) / 9 / 1.8)), rows = Math.ceil(n / cols);
  execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${dir}/%03d.png" -vf "scale=560:-1,drawtext=text='%{n}':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.55,tile=${cols}x${rows}:padding=4:color=0x111111" -frames:v 1 -q:v 3 "${out}"`);
  console.log(`${out}  (${labels.map((l, i) => `${i}=${l}`).join(' ')})`);
};

const probe = await open();
const DUR = await probe.evaluate(() => window.DURATION), FPS = +opt('fps', (await probe.evaluate(() => window.FPS)) || 30);
if (has('forms')) {
  const names = await probe.evaluate(() => [...window.film.forms.keys()]), tmp = join(outDir, `.forms-${name}`), labels = [];
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true }); let i = 0;
  for (const n of names) for (const yaw of [0, 90, 180, 270]) {
    const d = await probe.evaluate(([n, yaw]) => { window.showForm(n, yaw, 18); return document.querySelector('#frame').toDataURL('image/png'); }, [n, yaw]);
    save(join(tmp, `${String(i++).padStart(3, '0')}.png`), d); labels.push(`${n}@${yaw}`);
  }
  tile(tmp, i, join(outDir, `${name}-forms.jpg`), labels); rmSync(tmp, { recursive: true, force: true });
  for (const b of browsers) await b.close(); process.exit(0);
}
const stills = opt('stills'), sheet = has('sheet');
if (stills || sheet) {
  let ts;
  if (stills) ts = stills.split(',').map(Number);
  else if (opt('sheet')) { const n = +opt('sheet'); ts = Array.from({ length: n }, (_, i) => +(((i + 0.5) * DUR) / n).toFixed(2)); }
  else ts = (await probe.evaluate(() => window.film.shots.map((s) => [s.t0 + s.in.dur * 0.5, s.t0 + s.in.dur + Math.min(1, (s.dur - s.in.dur) * 0.4), s.t1 - 0.1]))).flat().map((t) => +t.toFixed(2));
  const tmp = join(outDir, `.sheet-${name}`);
  if (sheet) { rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true }); }
  for (const [i, t] of ts.entries()) {
    const t0 = Date.now(), d = await grab(probe, t);
    const f = sheet ? join(tmp, `${String(i).padStart(3, '0')}.png`) : join(outDir, `${name}-${t}.png`);
    save(f, d); if (!sheet) console.log(`${f}  ${t.toFixed(2)} s · ${Date.now() - t0} ms`);
  }
  if (sheet) { tile(tmp, ts.length, join(outDir, `${name}-sheet.jpg`), ts.map((t) => t.toFixed(2) + 's')); rmSync(tmp, { recursive: true, force: true }); }
  for (const b of browsers) await b.close(); process.exit(0);
}
await probe.close();

const from = +opt('from', 0), to = +opt('to', DUR), workers = +opt('workers', 4), crf = opt('crf', PREVIEW ? '23' : '20');
const n = Math.round((to - from) * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}${PREVIEW ? '-p' : ''}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames @ ${FPS} fps, ${workers} workers${PREVIEW ? ' (preview)' : ''}`);
const t0 = Date.now(); let done = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const page = await open();
  // 160k twinkling specks are near-noise to x264: CRF 20 keeps them crisp (~2 MB/s at 1080p); --crf 23 for the web
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', PREVIEW ? 'veryfast' : 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', String(FPS * 2), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise((r) => ff.on('close', r));
  for (let f = a; f < b; f++) {
    const d = await grab(page, from + f / FPS, PREVIEW ? 'image/jpeg' : 'image/png');
    if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    if (++done % 60 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${done}/${n}  ${(s / done).toFixed(2)} s/frame  eta ${Math.round((s / done) * (n - done))} s`); }
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

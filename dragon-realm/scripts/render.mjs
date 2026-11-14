// dragon-realm · render.mjs — stills, a contact sheet, a preview or the final MP4 of a film folder.
// Builds index.html first, then every frame is film.renderAt(t) on the ?render=1 page.  Run from anywhere:
//   node <skill>/scripts/render.mjs <film-dir> --stills 3,12.5,40        → out/still-0003.00.png …
//   node <skill>/scripts/render.mjs <film-dir> --sheet [n] [--scale .5]  → out/sheet.jpg (n even moments, or every shot's start/middle/end)
//   node <skill>/scripts/render.mjs <film-dir> --cast [--scale .5]       → out/cast.jpg (the creature from every side)
//   node <skill>/scripts/render.mjs <film-dir> --preview                 → out/preview.mp4 (half size, 15 fps)
//   node <skill>/scripts/render.mjs <film-dir>                           → out/film.mp4 (1920×1080; + the score if out/score.wav exists)
// Options: --fps 30 --workers 3 --from 0 --to <s> --crf 17 --scale 1 --q "steps=64&air=2" --out out --name film --keep --no-build
// Without a GPU WebGL runs on the CPU (SwiftShader): expect seconds per 1080p frame; workers split the frames.
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from './build.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2);
const has = (k) => args.includes('--' + k);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const dir = resolve(args[0] && !args[0].startsWith('--') ? args[0] : '.');
if (!existsSync(join(dir, 'src'))) { console.error('usage: render.mjs <film-dir> [--stills 1,2 | --sheet [n] | --preview] [--workers 3] [--scale .5] [--q "steps=32"]'); process.exit(1); }
if (!has('no-build')) build(dir, { quiet: true });
const PREVIEW = has('preview');
const outDir = resolve(dir, opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = opt('scale', PREVIEW ? '.5' : '1'), extra = opt('q', '');
const url = pathToFileURL(join(dir, 'index.html')).href + '?render=1&scale=' + scale + (extra ? '&' + extra : '');
const ARGS = ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-dev-shm-usage'];
const browsers = [];
export async function open(u = url, quiet = false) {
  const browser = await chromium.launch({ args: ARGS }); browsers.push(browser);
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  let failed = null;
  page.on('pageerror', (e) => { failed = failed || e; console.error('page error:', e.message); });
  page.on('console', (m) => { const t = m.text(); if (/GPU stall|ReadPixels|Automatic fallback/.test(t)) return; if (m.type() === 'error' || m.type() === 'warning') { if (!quiet) console.error(`console ${m.type()}:`, t.slice(0, 1400)); } else if (/^\[/.test(t)) console.log(t); if (/not compiled|program not valid|THREE\.WebGLProgram|anchor not found/.test(t)) failed = failed || new Error('a shader failed: ' + t.slice(0, 300)); });
  await page.goto(u, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.READY === true));) {
    const f = await page.evaluate(() => window.FAILED || null); if (f) throw new Error('the film failed to load: ' + f);
    if (failed) throw new Error('the film failed to load: ' + failed.message);
    if (Date.now() - t0 > 600000) throw new Error('the page never set window.READY');
    await new Promise((r) => setTimeout(r, 200));
  }
  return page;
}
const grab = (page, t, type = 'image/png') => page.evaluate(([t, type]) => { window.film.renderAt(t); return window.film.canvas.toDataURL(type, 0.93); }, [t, type]);
const save = (f, d) => writeFileSync(f, Buffer.from(d.split(',')[1], 'base64'));

const t00 = Date.now();
const probe = await open();
const DUR = await probe.evaluate(() => window.film.DURATION), FPS = +opt('fps', PREVIEW ? 15 : await probe.evaluate(() => window.film.FPS));
const shots = await probe.evaluate(() => window.film.shots.map((s) => ({ name: s.name, t0: s.t0, t1: s.t1 })));
console.log(`${await probe.evaluate(() => window.film.gpu)} · loaded in ${((Date.now() - t00) / 1000).toFixed(1)} s`);
if (has('stills')) {
  for (const s of opt('stills', '0').split(',')) { const t = +s, f = join(outDir, `still-${t.toFixed(2).padStart(7, '0')}.png`), a = Date.now(); save(f, await grab(probe, t)); console.log(f, `${((Date.now() - a) / 1000).toFixed(1)} s`, JSON.stringify(await probe.evaluate(() => window.film.info()))); }
} else if (has('cast')) {
  // the cast sheet: the creature from every side (front, 3/4 and profile both ways, above, below, behind)
  const tmp = join(outDir, '.cast'); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true }); const labels = [];
  for (let i = 0; ; i++) { const r = await probe.evaluate((i) => { const label = window.film.cast(i); return label && { label, url: window.film.canvas.toDataURL('image/jpeg', 0.92) }; }, i); if (!r) break; labels.push(r.label); save(join(tmp, String(i).padStart(3, '0') + '.jpg'), r.url); }
  if (!labels.length) { console.error('this film registers no cast views (DR.creature adds them)'); } else { const cols = 4, rows = Math.ceil(labels.length / cols), out = join(outDir, 'cast.jpg');
    execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${tmp}/%03d.jpg" -vf "scale=640:-1,drawtext=text='%{n}':x=10:y=8:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.55,tile=${cols}x${rows}:padding=4:color=0x111111" -frames:v 1 -q:v 3 "${out}"`);
    console.log(out + '\n  ' + labels.map((l, i) => `${i}: ${l}`).join('\n  ')); }
  rmSync(tmp, { recursive: true, force: true });
} else if (has('sheet')) {
  const n = +opt('sheet', 0), times = n ? Array.from({ length: n }, (_, i) => ((i + 0.5) / n) * DUR) : shots.flatMap((s) => [s.t0 + 0.05, (s.t0 + s.t1) / 2, s.t1 - 0.05]);
  const tmp = join(outDir, '.sheet'); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  for (let i = 0; i < times.length; i++) save(join(tmp, String(i).padStart(3, '0') + '.jpg'), await grab(probe, times[i], 'image/jpeg'));
  const cols = n ? Math.ceil(Math.sqrt(times.length)) : 3, rows = Math.ceil(times.length / cols), out = join(outDir, opt('name', 'sheet') + '.jpg');
  execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${tmp}/%03d.jpg" -vf "scale=640:-1,tile=${cols}x${rows}:padding=4:color=0x111111" -frames:v 1 -q:v 3 "${out}"`);
  rmSync(tmp, { recursive: true, force: true });
  console.log(out + '\n  ' + times.map((t, i) => `${i}: ${t.toFixed(2)} s${n ? '' : ' ' + shots[Math.floor(i / 3)].name}`).join('\n  '));
} else {
  const from = +opt('from', 0), to = +opt('to', DUR), f0 = Math.round(from * FPS), f1 = Math.round(to * FPS), total = f1 - f0;
  const workers = Math.max(1, +opt('workers', 3)), name = opt('name', PREVIEW ? 'preview' : 'film'), frames = join(outDir, `.frames-${name}`);
  if (!has('resume')) rmSync(frames, { recursive: true, force: true }); mkdirSync(frames, { recursive: true });
  const have = new Set(readdirSync(frames)); let next = f0, done = 0; const tA = Date.now();
  const work = async (page) => { for (;;) { const f = next++; if (f >= f1) return; const fn = String(f - f0).padStart(6, '0') + '.jpg'; if (!have.has(fn)) save(join(frames, fn), await grab(page, f / FPS, 'image/jpeg')); done++;
      if (done % 20 === 0 || done === total) { const el = (Date.now() - tA) / 1000; process.stdout.write(`\r  ${done}/${total} frames · ${(el / done).toFixed(2)} s/frame · ${((el / done) * (total - done) / 60).toFixed(1)} min left   `); } } };
  const pages = [probe]; for (let i = 1; i < workers; i++) pages.push(await open(url, true));
  await Promise.all(pages.map(work)); console.log();
  const wav = opt('audio', existsSync(join(outDir, 'score.wav')) ? join(outDir, 'score.wav') : ''), mp4 = join(outDir, name + '.mp4');
  const ff = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(frames, '%06d.jpg')];
  if (wav && !PREVIEW && from === 0) ff.push('-i', wav);
  ff.push('-c:v', 'libx264', '-preset', 'slow', '-crf', opt('crf', PREVIEW ? '23' : '17'), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos');
  if (wav && !PREVIEW && from === 0) ff.push('-c:a', 'aac', '-b:a', '256k', '-shortest');
  ff.push(mp4);
  await new Promise((res, rej) => spawn('ffmpeg', ff, { stdio: 'inherit' }).on('exit', (c) => (c ? rej(new Error('ffmpeg ' + c)) : res())));
  if (!has('keep')) rmSync(frames, { recursive: true, force: true });
  console.log(mp4, wav ? '(with sound)' : '(silent — run score.mjs first for sound)');
}
for (const b of browsers) await b.close();

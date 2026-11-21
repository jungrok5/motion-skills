// manga-background-3d · render.mjs — stills, contact sheets, background plates, a manga page, or the MP4 of one
// film page (every frame is seek(t)). Run from the project root:
//   node <skill>/scripts/render.mjs piece.html --shots              → out/piece-shot-*.png (each shot: model, mid-wipe, manga)
//   node <skill>/scripts/render.mjs piece.html --stills 3,9.5       → out/piece-3.png …
//   node <skill>/scripts/render.mjs piece.html --sheet 24           → out/piece-sheet.jpg (24 moments)
//   node <skill>/scripts/render.mjs piece.html --plates             → out/plates/piece-<shot>-{lines,tone,full}.png (2400 px; --w 3600)
//   node <skill>/scripts/render.mjs piece.html --page               → out/piece-page.png (a manga page laid out from the sets)
//   node <skill>/scripts/render.mjs piece.html                      → out/piece.mp4 (1920×1080, H.264, with the synthesised sound)
// Options: --scale .5 (preview) · --workers 4 · --fps · --from/--to · --crf 20 · --silent · --audio music.wav · --out out/
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { synth } from './sound.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
export const CHROME_ARGS = ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-angle=swiftshader'];

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: render.mjs <piece.html> [--shots] [--stills 2,7] [--sheet 24] [--plates] [--page]'); process.exit(1); }
const name = opt('name', basename(page$) === 'index.html' ? basename(resolve(page$, '..')) : basename(page$).replace(/\.html$/, ''));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = opt('scale', '');
const url = (extra = '') => pathToFileURL(page$).href + '?render=1' + (scale ? '&scale=' + scale : '') + extra;

const browser = await chromium.launch({ args: CHROME_ARGS });
async function open(extra = '') {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  let failed = null;
  page.on('pageerror', e => { failed = failed || e; console.error('page error:', e.message); });
  page.on('console', m => { if (m.type() === 'error' && !/GPU stall|GL Driver|WebGL/.test(m.text())) console.error('console error:', m.text().slice(0, 400)); });
  await page.goto(url(extra), { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true).catch(() => false));) {
    if (failed) throw new Error('page failed to load: ' + failed.message);
    if (Date.now() - t0 > 180000) throw new Error('page never set window.__ready');
    await new Promise(r => setTimeout(r, 100));
  }
  return page;
}
const grab = (page, t, type = 'image/png') => page.evaluate(([t, type]) => { if (t !== null) window.seek(t); return document.querySelector('canvas').toDataURL(type, 0.92); }, [t, type]);
const buf = d => Buffer.from(d.split(',')[1], 'base64');
const done = async () => { await browser.close(); process.exit(0); };

if (args.includes('--page')) {
  const p = await open('&sheet=page'), f = join(outDir, `${name}-page.png`);
  writeFileSync(f, buf(await grab(p, null))); console.log(f); await done();
}
const probe = await open();
const info = await probe.evaluate(() => window.filmInfo());
const DUR = info.duration, FPS = +opt('fps', info.fps);
const from = +opt('from', 0), to = +opt('to', DUR);

if (args.includes('--plates')) {
  const dir = join(outDir, 'plates'); mkdirSync(dir, { recursive: true });
  const w = opt('w', '2400');
  for (const s of info.shots.filter(s => !s.card)) for (const layer of ['lines', 'tone', 'full']) {
    const p = await open(`&plate=${s.i}&layer=${layer}&w=${w}`), f = join(dir, `${name}-${String(s.i).padStart(2, '0')}-${s.scene}-${layer}.png`);
    writeFileSync(f, buf(await grab(p, null))); await p.close(); console.log(f);
  }
  await done();
}
if (opt('stills')) {
  for (const s of opt('stills').split(',').map(Number)) { const f = join(outDir, `${name}-${s}.png`); writeFileSync(f, buf(await grab(probe, s))); console.log(f); }
  await done();
}
if (args.includes('--shots')) {
  for (const s of info.shots) {
    const marks = s.card ? [['card', 0.8]] : s.mode === 'wipe' ? [['model', (s.wipe?.[0] ?? 0.28) * 0.5], ['wipe', ((s.wipe?.[0] ?? 0.28) + (s.wipe?.[1] ?? 0.72)) / 2], ['manga', 0.93]] : [[s.mode, 0.5]];
    for (const [tag, u] of marks) { const t = +(s.start + u * s.dur).toFixed(3), f = join(outDir, `${name}-shot-${String(s.i).padStart(2, '0')}-${tag}.png`); writeFileSync(f, buf(await grab(probe, t))); console.log(`${f}  t=${t}`); }
  }
  await done();
}
if (opt('sheet')) {
  const n = +opt('sheet'), cols = n <= 6 ? n : n <= 16 ? Math.ceil(n / 2) : 6, tmp = join(outDir, `.sheet-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp);
  const ts = Array.from({ length: n }, (_, i) => from + (to - from - 1 / FPS) * (n === 1 ? 0 : i / (n - 1)));
  for (let i = 0; i < n; i++) { writeFileSync(join(tmp, `${String(i).padStart(3, '0')}.png`), buf(await grab(probe, +ts[i].toFixed(3)))); process.stdout.write(`  ${i + 1}/${n}\r`); }
  const f = join(outDir, `${name}-sheet.jpg`), rows = Math.ceil(n / cols), step = (to - from - 1 / FPS) / Math.max(1, n - 1);
  execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${join(tmp, '%03d.png')}" -vf "scale=400:-1,drawtext=text='%{eif\\:n*${step.toFixed(4)}+${from}\\:d}s':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.5,tile=${cols}x${rows}:padding=4:color=white" -frames:v 1 -q:v 3 "${f}"`);
  rmSync(tmp, { recursive: true, force: true }); console.log(`\n${f}`); await done();
}
const events = await probe.evaluate(() => window.soundEvents());
await probe.close();

// the MP4: each worker renders a contiguous run of frames into its own ffmpeg; chunks are joined losslessly
const workers = +opt('workers', 4), crf = opt('crf', '20');
const n = Math.round((to - from) * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames @ ${FPS} fps, ${workers} workers`);
const t0 = Date.now(); let count = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const page = await open();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-threads', '2', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', String(FPS * 2),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise(r => ff.on('close', r));
  for (let f = a; f < b; f++) {
    if (!ff.stdin.write(buf(await grab(page, from + f / FPS, 'image/jpeg')))) await new Promise(r => ff.stdin.once('drain', r));
    if (++count % 48 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${count}/${n}  eta ${Math.round(s / count * (n - count))} s`); }
  }
  ff.stdin.end(); await closed; await page.close();
}));
await browser.close();
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map(f => `file '${f}'`).join('\n'));
const out = join(outDir, `${name}.mp4`);
if (args.includes('--silent')) execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy -movflags +faststart "${out}"`);
else {
  const wav = join(tmp, 'sound.wav'); writeFileSync(wav, synth(events.map(e => ({ ...e, t: e.t - from })).filter(e => e.t >= 0), to - from));
  const music = opt('audio');
  const mixIn = music ? `-i "${resolve(music)}" -filter_complex "[1:a]volume=1[a1];[2:a]volume=.6,afade=t=out:st=${(to - from - 1.5).toFixed(2)}:d=1.5[a2];[a1][a2]amix=inputs=2:duration=first:normalize=0[a]" -map 0:v -map "[a]"` : `-map 0:v -map 1:a`;
  execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -i "${wav}" ${mixIn} -c:v copy -c:a aac -b:a 160k -t ${to - from} -movflags +faststart "${out}"`);
}
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);

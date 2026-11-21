// engraving-collage-film · render.mjs — stills, contact sheets, the cast sheet, or the MP4 of one film page (every frame
// is seek(t)). Run from the project root:
//   node <skill>/scripts/render.mjs piece.html --shots              → out/piece-shot-*.png (each shot at 15 %, 50 %, 85 %)
//   node <skill>/scripts/render.mjs piece.html --stills 3,9.5       → out/piece-3.png …
//   node <skill>/scripts/render.mjs piece.html --sheet 12           → out/piece-sheet.jpg
//   node <skill>/scripts/render.mjs cast.html --cast                → out/cast.png (the cast sheet)
//   node <skill>/scripts/render.mjs piece.html                      → out/piece.mp4 (the making-of: comp over breakdown, with sound)
//   node <skill>/scripts/render.mjs piece.html --view film          → out/piece-film.mp4 (the comp alone, 1920×804)
// Options: --scale .5 (preview) · --workers 4 · --from/--to · --crf 20 · --silent · --audio music.wav · --out out/
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
if (!existsSync(page$)) { console.error('usage: render.mjs <piece.html> [--shots] [--stills 2,7] [--sheet 12] [--cast] [--view film]'); process.exit(1); }
const view = opt('view', '');
const name = opt('name', (basename(page$) === 'index.html' ? basename(resolve(page$, '..')) : basename(page$).replace(/\.html$/, '')) + (view === 'film' ? '-film' : ''));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = opt('scale', '');
const url = (extra = '') => pathToFileURL(page$).href + '?render=1' + (scale ? '&scale=' + scale : '') + (view ? '&view=' + view : '') + extra;

const browser = await chromium.launch({ args: CHROME_ARGS });
async function open(extra = '') {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  let failed = null;
  page.on('pageerror', e => { failed = failed || e; console.error('page error:', e.message); });
  page.on('console', m => { if (m.type() === 'error' && !/GPU stall|GL Driver|WebGL|GroupMarker/.test(m.text())) console.error('console error:', m.text().slice(0, 400)); });
  await page.goto(url(extra), { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true).catch(() => false));) {
    if (failed) throw new Error('page failed to load: ' + failed.message);
    if (Date.now() - t0 > 240000) throw new Error('page never set window.__ready');
    await new Promise(r => setTimeout(r, 100));
  }
  return page;
}
const grab = (page, t, type = 'image/png') => page.evaluate(([t, type]) => { if (t !== null) window.seek(t); return document.querySelector('canvas').toDataURL(type, 0.92); }, [t, type]);
const buf = d => Buffer.from(d.split(',')[1], 'base64');
const done = async () => { await browser.close(); process.exit(0); };

if (args.includes('--cast')) {
  const p = await open(), f = join(outDir, `${name}.png`);
  writeFileSync(f, buf(await grab(p, null))); console.log(f);
  console.log(JSON.stringify(await p.evaluate(() => window.castReport), null, 1)); await done();
}
const probe = await open();
const info = await probe.evaluate(() => window.filmInfo());
const DUR = info.duration, FPS = +opt('fps', info.fps);
const from = +opt('from', 0), to = +opt('to', DUR);

if (opt('stills')) {
  for (const s of opt('stills').split(',').map(Number)) { const f = join(outDir, `${name}-${s}.png`); writeFileSync(f, buf(await grab(probe, s))); console.log(f); }
  await done();
}
if (args.includes('--shots')) {
  for (const s of info.shots) for (const [tag, u] of [['a', 0.15], ['b', 0.5], ['c', 0.85]]) {
    const t = +(s.start + u * s.dur).toFixed(3), f = join(outDir, `${name}-shot-${String(s.i).padStart(2, '0')}${tag}.png`);
    writeFileSync(f, buf(await grab(probe, t))); console.log(`${f}  t=${t}`);
  }
  await done();
}
if (opt('sheet')) {
  const n = +opt('sheet'), cols = n <= 4 ? n : n <= 9 ? 3 : 4, tmp = join(outDir, `.sheet-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp);
  const ts = Array.from({ length: n }, (_, i) => from + (to - from - 1 / FPS) * (n === 1 ? 0 : i / (n - 1)));
  for (let i = 0; i < n; i++) { writeFileSync(join(tmp, `${String(i).padStart(3, '0')}.png`), buf(await grab(probe, +ts[i].toFixed(3)))); process.stdout.write(`  ${i + 1}/${n}\r`); }
  const f = join(outDir, `${name}-sheet.jpg`), rows = Math.ceil(n / cols);
  execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${join(tmp, '%03d.png')}" -vf "scale=640:-1,tile=${cols}x${rows}:padding=6:color=white" -frames:v 1 -q:v 3 "${f}"`);
  rmSync(tmp, { recursive: true, force: true }); console.log(`\n${f}`); await done();
}
const events = await probe.evaluate(() => window.soundEvents());
const score = await probe.evaluate(() => window.scoreInfo());
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
  const wav = join(tmp, 'sound.wav'); writeFileSync(wav, synth(events.map(e => ({ ...e, t: e.t - from })).filter(e => e.t >= 0), to - from, score));
  const music = opt('audio');
  const mixIn = music ? `-i "${resolve(music)}" -filter_complex "[1:a]volume=1[a1];[2:a]volume=.6,afade=t=out:st=${(to - from - 1.5).toFixed(2)}:d=1.5[a2];[a1][a2]amix=inputs=2:duration=first:normalize=0[a]" -map 0:v -map "[a]"` : `-map 0:v -map 1:a`;
  execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -i "${wav}" ${mixIn} -c:v copy -c:a aac -b:a 160k -t ${to - from} -movflags +faststart "${out}"`);
}
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);

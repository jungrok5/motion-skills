// storybook-portrait · render.mjs — stills, a stage sheet, the cast sheet, a contact sheet of the live loop, or the MP4.
// Every frame is window.seek(t) on the page, so a frame never depends on the one before it.
//   node <skill>/scripts/render.mjs piece.html                     → out/<name>.png       the finished portrait (1080×1350)
//   node <skill>/scripts/render.mjs piece.html --scale 2           → out/<name>.png       2160×2700
//   node <skill>/scripts/render.mjs piece.html --still 9.4         → out/<name>-9.4.png   any moment
//   node <skill>/scripts/render.mjs piece.html --stages 6          → out/<name>-stages.jpg  the drawing being made, 6 moments
//   node <skill>/scripts/render.mjs piece.html --cast              → out/<name>-cast.png  turns both ways, expressions, glances
//   node <skill>/scripts/render.mjs piece.html --sheet 10 --from 8 --to 12   → out/<name>-sheet.jpg (a stretch of the live loop)
//   node <skill>/scripts/render.mjs piece.html --film              → out/<name>.mp4  (the drawing, then alive; H.264, 30 fps)
// Options: --out out/ · --fps 30 · --crf 20 · --workers 3 · --name x
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: render.mjs <piece.html> [--still t] [--stages 6] [--cast] [--sheet 10] [--film] [--scale 2]'); process.exit(1); }
const name = opt('name', basename(page$) === 'piece.html' || basename(page$) === 'index.html' ? basename(dirname(page$)) : basename(page$).replace(/\.html$/, ''));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = opt('scale', '1');

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
async function open(query) {
  const page = await browser.newPage({ viewport: { width: 900, height: 1100 }, deviceScaleFactor: 1 });
  let failed = null;
  page.on('pageerror', e => { failed = failed || e; console.error('page error:', e.message); });
  page.on('console', m => { if (m.type() === 'error') console.error('console error:', m.text().slice(0, 300)); });
  await page.goto(pathToFileURL(page$).href + '?' + query, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
    if (failed) throw new Error('page failed: ' + failed.message);
    if (Date.now() - t0 > 300000) throw new Error('page never set window.__ready');
    await new Promise(r => setTimeout(r, 100));
  }
  return page;
}
const grab = (page, t) => page.evaluate(t => { window.seek(t); return document.querySelector('canvas').toDataURL('image/png'); }, t);
const png = d => Buffer.from(d.split(',')[1], 'base64');
const done = () => browser.close().then(() => process.exit(0));

if (opt('cast')) {
  const page = await open('cast&cell=' + (opt('cell', '.3')));
  const f = join(outDir, `${name}-cast.png`); writeFileSync(f, png(await page.evaluate(() => window.__sp.cast.toDataURL('image/png')))); console.log(f);
  await done();
}
const page = await open(`render=1&scale=${scale}`);
const DUR = await page.evaluate(() => window.DURATION), drawT = await page.evaluate(() => window.__sp.drawT), FPS = +opt('fps', 30);

const still = opt('still');
if (still !== undefined && still !== true) {
  for (const s of String(still).split(',').map(Number)) { const f = join(outDir, `${name}-${s}.png`); writeFileSync(f, png(await grab(page, s))); console.log(f); }
  await done();
}
const tile = (frames, label, file, cols) => {
  const tmp = join(outDir, `.tile-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp);
  frames.forEach((b, i) => writeFileSync(join(tmp, `${String(i).padStart(3, '0')}.png`), b));
  const rows = Math.ceil(frames.length / cols);
  execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${join(tmp, '%03d.png')}" -vf "scale=432:-1,tile=${cols}x${rows}:padding=6:color=0xe9e4da" -frames:v 1 -q:v 3 "${file}"`);
  rmSync(tmp, { recursive: true, force: true }); console.log(file + (label ? '  ' + label : ''));
};
if (opt('stages')) {
  const n = +opt('stages') || 6, ts = Array.from({ length: n }, (_, i) => +(drawT * (i + 1) / (n + 1)).toFixed(2)).concat([+(drawT + .05).toFixed(2)]);
  const frames = []; for (const t of ts) frames.push(png(await grab(page, t)));
  tile(frames, 't = ' + ts.join(', '), join(outDir, `${name}-stages.jpg`), frames.length <= 6 ? 3 : 4); await done();
}
if (opt('sheet')) {
  const n = +opt('sheet') || 10, from = +opt('from', drawT), to = +opt('to', DUR - .01);
  const ts = Array.from({ length: n }, (_, i) => +(from + (to - from) * i / Math.max(1, n - 1)).toFixed(3));
  const frames = []; for (const t of ts) frames.push(png(await grab(page, t)));
  tile(frames, 't = ' + ts.join(', '), join(outDir, `${name}-sheet.jpg`), Math.min(5, n)); await done();
}
if (opt('film')) {
  await page.close();
  const workers = +opt('workers', 3), crf = String(opt('crf', '20')), n = Math.round(DUR * FPS), per = Math.ceil(n / workers);
  const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  console.log(`${name}: ${n} frames @ ${FPS} fps, ${workers} workers`);
  const t0 = Date.now(); let count = 0;
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
    const pg = await open(`render=1&scale=${scale}`);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', join(tmp, `${String(w).padStart(2, '0')}.mp4`)]);
    for (let i = a; i < b; i++) {
      const buf = png(await grab(pg, i / FPS));
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (++count % 30 === 0) process.stdout.write(`  ${count}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)} s\r`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r)); await pg.close();
  }));
  const list = join(tmp, 'list.txt'), f = join(outDir, `${name}.mp4`);
  writeFileSync(list, Array.from({ length: workers }, (_, w) => `file '${join(tmp, `${String(w).padStart(2, '0')}.mp4`)}'`).filter((l, w) => w * per < n).join('\n'));
  execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy -movflags +faststart "${f}"`);
  rmSync(tmp, { recursive: true, force: true }); console.log(`\n${f}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  await done();
}
// default: the finished portrait, just after the drawing ends (rest pose)
const f = join(outDir, `${name}.png`); writeFileSync(f, png(await grab(page, +(drawT + .02).toFixed(3)))); console.log(f);
await done();

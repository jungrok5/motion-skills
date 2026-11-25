// principle-pass · render.mjs — the MP4, stills, a contact sheet, the cast sheet and the audit table.
// Every frame is window.seek(t) in headless Chromium; nothing depends on wall-clock time.
//   node <skill>/scripts/render.mjs index.html                  → out/<name>.mp4 (1080×1350, 30 fps, silent)
//   node <skill>/scripts/render.mjs index.html --scale .5       → 540×675 preview
//   node <skill>/scripts/render.mjs index.html --still 2.9,3.2  → out/<name>-2.9.png …
//   node <skill>/scripts/render.mjs index.html --sheet 12       → out/<name>-sheet.jpg
//   node <skill>/scripts/render.mjs index.html --cast           → out/<name>-cast.png
//   node <skill>/scripts/render.mjs index.html --gif            → out/<name>.gif (480 px, for a post or a README)
// Options: --out out/ · --workers 3 · --crf 20 · --from / --to (seconds) · --name x
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
if (!existsSync(page$)) { console.error('usage: render.mjs <index.html> [--still t] [--sheet 12] [--cast] [--gif] [--scale .5]'); process.exit(1); }
const name = opt('name', basename(page$) === 'index.html' ? basename(dirname(page$)) : basename(page$).replace(/\.html$/, ''));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = String(opt('scale', '1'));

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
async function open(query) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1400 }, deviceScaleFactor: 1 });
  let failed = null;
  page.on('pageerror', e => { failed = failed || e; console.error('page error:', e.message); });
  page.on('console', m => { if (m.type() === 'error') console.error('console error:', m.text().slice(0, 300)); });
  await page.goto(pathToFileURL(page$).href + '?' + query, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
    if (failed) throw new Error('page failed: ' + failed.message);
    if (Date.now() - t0 > 120000) throw new Error('page never set window.__ready');
    await new Promise(r => setTimeout(r, 100));
  }
  return page;
}
const grab = (page, t) => page.evaluate(t => { window.seek(t); return document.querySelector('canvas').toDataURL('image/png'); }, t);
const png = d => Buffer.from(d.split(',')[1], 'base64');
const done = () => browser.close().then(() => process.exit(0));

if (opt('cast')) {
  const page = await open('cast&cell=' + opt('cell', '220'));
  const f = join(outDir, `${name}-cast.png`); writeFileSync(f, png(await page.evaluate(() => window.__film.cast.toDataURL('image/png')))); console.log(f); await done();
}
const page = await open(`render=1&scale=${scale}`);
const DUR = await page.evaluate(() => window.DURATION), FPS = await page.evaluate(() => window.FPS || 30);
const still = opt('still');
if (still && still !== true) { for (const s of String(still).split(',').map(Number)) { const f = join(outDir, `${name}-${s}.png`); writeFileSync(f, png(await grab(page, s))); console.log(f); } await done(); }
if (opt('sheet')) {
  const n = +opt('sheet') || 12, cols = n <= 8 ? 4 : 6, from = +opt('from', .2), to = +opt('to', DUR - .2), tmp = join(outDir, `.sheet-${name}`);
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp);
  const ts = Array.from({ length: n }, (_, i) => +(from + (to - from) * i / Math.max(1, n - 1)).toFixed(2));
  for (const [i, t] of ts.entries()) writeFileSync(join(tmp, `${String(i).padStart(3, '0')}.png`), png(await grab(page, t)));
  const f = join(outDir, `${name}-sheet.jpg`);
  execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${join(tmp, '%03d.png')}" -vf "scale=300:-1,tile=${cols}x${Math.ceil(n / cols)}:padding=6:color=0x2a2826" -frames:v 1 -q:v 3 "${f}"`);
  rmSync(tmp, { recursive: true, force: true }); console.log(f + '  t = ' + ts.join(', ')); await done();
}
{ const a = await page.evaluate(() => window.__film.audit()); writeFileSync(join(outDir, `${name}-audit.json`), JSON.stringify(a.rows, null, 1)); }
await page.close();

const workers = +opt('workers', 3), crf = String(opt('crf', '20')), from = +opt('from', 0), to = +opt('to', DUR), n = Math.round((to - from) * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames @ ${FPS} fps, ${workers} workers`);
const t0 = Date.now(); let count = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const pg = await open(`render=1&scale=${scale}`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', join(tmp, `${String(w).padStart(2, '0')}.mp4`)]);
  for (let i = a; i < b; i++) { const buf = png(await grab(pg, from + i / FPS)); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); if (++count % 30 === 0) process.stdout.write(`  ${count}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)} s\r`); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await pg.close();
}));
const list = join(tmp, 'list.txt'), f = join(outDir, `${name}.mp4`);
writeFileSync(list, Array.from({ length: workers }, (_, w) => w * per < n ? `file '${join(tmp, `${String(w).padStart(2, '0')}.mp4`)}'` : null).filter(Boolean).join('\n'));
execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy -movflags +faststart "${f}"`);
if (opt('gif')) { const gif = join(outDir, `${name}.gif`); execSync(`ffmpeg -y -loglevel error -i "${f}" -vf "fps=15,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer" "${gif}"`); console.log(gif); }
rmSync(tmp, { recursive: true, force: true }); console.log(`\n${f}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
await done();

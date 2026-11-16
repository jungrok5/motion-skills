// agent-launch-film · render.mjs — the contact sheet, a strip of one scene, the mascot sheet, stills, a preview or the MP4.
// Every frame is window.seek(t) on a ?render=1 page, captured as a screenshot of #frame. Run from the project root:
//   node <skill>/scripts/render.mjs film.html --sheet --scale .4          → out/film-sheet.jpg   (two moments of every scene, numbered)
//   node <skill>/scripts/render.mjs film.html --strip sort --scale .4     → out/film-sort.jpg    (8 frames across one scene: is the move there?)
//   node <skill>/scripts/render.mjs film.html --mascot                    → out/film-mascot.jpg  (the mascot with every screen it shows, big + avatar, turned both ways)
//   node <skill>/scripts/render.mjs film.html --stills 1.5,6,9.2          → out/film-1.5.png …
//   node <skill>/scripts/render.mjs film.html --preview                   → out/film-preview.mp4 (half size, fast)
//   node <skill>/scripts/render.mjs film.html --audio out/film.wav        → out/film.mp4         (full size, 30 fps, with sound)
// Options: --workers 4  --from 0 --to <s>  --crf 18  --scale .5  --fps 30  --out out/  --name film
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
if (!existsSync(page$)) { console.error('usage: render.mjs <film.html> [--sheet | --strip <scene> | --mascot | --stills 1,2 | --preview] [--audio x.wav] [--workers 4]'); process.exit(1); }
const PREVIEW = has('preview');
const name = opt('name', basename(page$).replace(/\.html$/, '').replace(/^index$/, 'film'));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = +opt('scale', PREVIEW ? '.5' : '1');
const url = pathToFileURL(page$).href + '?render=1';
const ARGS = ['--allow-file-access-from-files', '--font-render-hinting=none', '--disable-lcd-text'];
const browser = await chromium.launch({ args: ARGS });
async function open(size) {
  const ctx = await browser.newContext({ viewport: size ? { width: size.W, height: size.H } : { width: 1920, height: 1080 }, deviceScaleFactor: size ? scale : 1 });
  const page = await ctx.newPage();
  let failed = null;
  page.on('pageerror', (e) => { failed = failed || e; console.error('page error:', e.message); });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error(`console ${m.type()}:`, m.text().slice(0, 600)); });
  page.on('requestfailed', (r) => console.error('404/failed:', r.url()));
  await page.goto(url, { waitUntil: 'load', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.READY === true));) {
    if (failed) throw new Error('film failed to load: ' + failed.message);
    if (Date.now() - t0 > 120000) throw new Error('film never set window.READY');
    await new Promise((r) => setTimeout(r, 100));
  }
  return page;
}
let SIZE;
const grab = async (page, t, type = 'png') => { await page.evaluate((t) => window.seek(t), t); return page.screenshot({ clip: { x: 0, y: 0, width: SIZE.W, height: SIZE.H }, type, ...(type === 'jpeg' ? { quality: 90 } : {}) }); };
const tile = (dir, n, out, labels, cols) => {
  cols = cols || Math.min(4, Math.ceil(Math.sqrt(n))); const rows = Math.ceil(n / cols);
  execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${dir}/%03d.png" -vf "scale=480:-1,drawtext=text='%{n}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6,tile=${cols}x${rows}:padding=4:color=0x777777" -frames:v 1 -q:v 3 "${out}"`);
  console.log(`${out}  (${labels.map((l, i) => `${i}=${l}`).join(' ')})`);
};
const done = async () => { await browser.close(); process.exit(0); };
const fresh = (k) => { const d = join(outDir, `.${k}-${name}`); rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); return d; };

const probe0 = await open(null);
SIZE = await probe0.evaluate(() => window.SIZE);
const DUR = await probe0.evaluate(() => window.DURATION), FPS = +opt('fps', (await probe0.evaluate(() => window.FPS)) || 30);
await probe0.context().close();
const probe = await open(SIZE);

if (has('mascot')) {
  const n = await probe.evaluate(() => window.film.mascotSheet());
  if (!n) { console.log('no mascot in this film'); await done(); }
  const f = join(outDir, `${name}-mascot.jpg`);
  writeFileSync(f, await probe.screenshot({ clip: { x: 0, y: 0, width: SIZE.W, height: SIZE.H }, type: 'jpeg', quality: 88 }));
  console.log(`${f}  (${n} screens)`); await done();
}
const stills = opt('stills'), sheet = has('sheet'), strip = opt('strip');
if (stills || sheet || strip) {
  const scenes = await probe.evaluate(() => window.film.scenes.map((s) => ({ name: s.name, t0: s.t0, dur: s.dur, xf: s.xf })));
  let ts, labels;
  if (stills) ts = stills.split(',').map(Number);
  else if (strip) { const s = scenes.find((x) => x.name === strip) || scenes[+strip]; if (!s) { console.error(`no scene "${strip}" (scenes: ${scenes.map((x) => x.name).join(', ')})`); process.exit(1); } ts = Array.from({ length: 8 }, (_, i) => s.t0 + (s.dur - 1 / FPS) * (i / 7)); labels = ts.map((t) => (t - s.t0).toFixed(2) + 's'); }
  else { ts = []; labels = []; for (const s of scenes) for (const p of [0.38, 0.8]) { ts.push(s.t0 + Math.min(s.dur * p, s.dur - s.xf - 0.1)); labels.push(`${s.name}@${p}`); } }
  const tmp = stills ? null : fresh('sheet');
  for (const [i, t] of ts.entries()) { const d = await grab(probe, t), f = stills ? join(outDir, `${name}-${t}.png`) : join(tmp, `${String(i).padStart(3, '0')}.png`); writeFileSync(f, d); if (stills) console.log(f); }
  if (!stills) { tile(tmp, ts.length, join(outDir, `${name}-${strip ? strip : 'sheet'}.jpg`), labels, 4); rmSync(tmp, { recursive: true, force: true }); }
  await done();
}
await probe.context().close();

const from = +opt('from', 0), to = +opt('to', DUR), workers = +opt('workers', 4), crf = opt('crf', PREVIEW ? '23' : '18');
const n = Math.round((to - from) * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}${PREVIEW ? '-p' : ''}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames @ ${FPS} fps, ${SIZE.W * scale}×${SIZE.H * scale}, ${workers} workers${PREVIEW ? ' (preview)' : ''}`);
const t0 = Date.now(); let count = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const page = await open(SIZE);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-c:v', 'libx264', '-preset', PREVIEW ? 'veryfast' : 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise((r) => ff.on('close', r));
  for (let f = a; f < b; f++) {
    const d = await grab(page, from + (f + 0.01) / FPS, PREVIEW ? 'jpeg' : 'png');
    if (!ff.stdin.write(d)) await new Promise((r) => ff.stdin.once('drain', r));
    if (++count % 60 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${count}/${n}  ${(s / count).toFixed(2)} s/frame  eta ${Math.round((s / count) * (n - count))} s`); }
  }
  ff.stdin.end(); await closed; await page.context().close();
}));
await browser.close();
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map((f) => `file '${f}'`).join('\n'));
const out = join(outDir, `${name}${PREVIEW ? '-preview' : ''}.mp4`), joined = join(tmp, 'joined.mp4'), audio = opt('audio');
execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy "${joined}"`);
if (audio && existsSync(audio)) execSync(`ffmpeg -y -loglevel error -i "${joined}" -ss ${from} -i "${resolve(audio)}" -map 0:v -map 1:a -c:v copy -af apad -c:a aac -b:a 192k -t ${(n / FPS).toFixed(4)} -movflags +faststart "${out}"`);
else execSync(`ffmpeg -y -loglevel error -i "${joined}" -c copy -movflags +faststart "${out}"`);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s, ${((Date.now() - t0) / 1000 / n).toFixed(2)} s/frame${audio ? ', with ' + basename(audio) : ''})`);

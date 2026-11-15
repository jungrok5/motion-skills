// kinetic-type-collage · render.mjs — stills, the shot sheet, a strip of one shot, the prop sheet, a preview or the final MP4.
// Every frame is window.seek(t) on a ?render=1 page; one PNG per frame leaves the browser. Run from the project root:
//   node <skill>/scripts/render.mjs film.html --sheet --scale .4          → out/film-sheet.jpg   (every shot at 60 % of its length, numbered)
//   node <skill>/scripts/render.mjs film.html --strip pour --scale .4     → out/film-pour.jpg    (8 frames across one shot: is the move there?)
//   node <skill>/scripts/render.mjs film.html --props --scale .4          → out/film-props.jpg   (each prop alone from 4 sides)
//   node <skill>/scripts/render.mjs film.html --stills 1.5,6,9.2          → out/film-1.5.png …
//   node <skill>/scripts/render.mjs film.html --preview                   → out/film-preview.mp4 (half size, fast)
//   node <skill>/scripts/render.mjs film.html --audio out/film.wav        → out/film.mp4         (full size, 30 fps, with sound)
// Options: --workers 4  --from 0 --to <s>  --crf 18  --scale .5  --out out/  --name film  --q "off=over"
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
if (!existsSync(page$)) { console.error('usage: render.mjs <film.html> [--sheet | --strip <shot> | --props | --stills 1,2 | --preview] [--audio x.wav] [--workers 4]'); process.exit(1); }
const PREVIEW = has('preview');
const name = opt('name', basename(page$).replace(/\.html$/, '').replace(/^index$/, 'film'));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = opt('scale', PREVIEW ? '.5' : '1'), extra = opt('q', '');
const url = pathToFileURL(page$).href + '?render=1&scale=' + scale + (extra ? '&' + extra : '');
const ARGS = ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
const browsers = [];
async function open() {
  const browser = await chromium.launch({ args: ARGS }); browsers.push(browser);
  const page = await browser.newPage({ viewport: { width: 960, height: 768 }, deviceScaleFactor: 1 });
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
const tile = (dir, n, out, labels, cols) => {
  cols = cols || Math.ceil(Math.sqrt(n * 1.5)); const rows = Math.ceil(n / cols);
  execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${dir}/%03d.png" -vf "scale=420:-1,drawtext=text='%{n}':x=6:y=6:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6,tile=${cols}x${rows}:padding=4:color=0x777777" -frames:v 1 -q:v 3 "${out}"`);
  console.log(`${out}  (${labels.map((l, i) => `${i}=${l}`).join(' ')})`);
};
const done = async () => { for (const b of browsers) await b.close(); process.exit(0); };

const probe = await open();
const DUR = await probe.evaluate(() => window.DURATION), FPS = +opt('fps', (await probe.evaluate(() => window.FPS)) || 30);
const fresh = (k) => { const d = join(outDir, `.${k}-${name}`); rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); return d; };
if (has('props')) {
  const names = await probe.evaluate(() => [...window.film.props.keys()]), tmp = fresh('props'), labels = []; let i = 0;
  if (!names.length) { console.log('no props registered (F.prop)'); await done(); }
  for (const n of names) for (const yaw of [25, 115, 205, 295]) {
    save(join(tmp, `${String(i++).padStart(3, '0')}.png`), await probe.evaluate(([n, yaw]) => { window.showProp(n, yaw, 16); return document.querySelector('#frame').toDataURL('image/png'); }, [n, yaw])); labels.push(`${n}@${yaw}`);
  }
  tile(tmp, i, join(outDir, `${name}-props.jpg`), labels, 4); rmSync(tmp, { recursive: true, force: true }); await done();
}
const stills = opt('stills'), sheet = has('sheet'), strip = opt('strip');
if (stills || sheet || strip) {
  const shots = await probe.evaluate(() => window.film.shots.map((s) => ({ name: s.name, t0: s.t0, dur: s.dur })));
  let ts, labels;
  if (stills) ts = stills.split(',').map(Number);
  else if (strip) { const s = shots.find((x) => x.name === strip) || shots[+strip]; if (!s) { console.error(`no shot "${strip}" (shots: ${shots.map((x) => x.name).join(', ')})`); process.exit(1); } ts = Array.from({ length: 8 }, (_, i) => s.t0 + (s.dur - 1 / FPS) * (i / 7)); labels = ts.map((t) => (t - s.t0).toFixed(2) + 's'); }
  else if (opt('sheet')) { const n = +opt('sheet'); ts = Array.from({ length: n }, (_, i) => ((i + 0.5) * DUR) / n); labels = ts.map((t) => t.toFixed(2) + 's'); }
  else { ts = shots.map((s) => s.t0 + s.dur * 0.6); labels = shots.map((s) => s.name); }
  const tmp = stills ? null : fresh('sheet');
  for (const [i, t] of ts.entries()) { const d = await grab(probe, t), f = stills ? join(outDir, `${name}-${t}.png`) : join(tmp, `${String(i).padStart(3, '0')}.png`); save(f, d); if (stills) console.log(f); }
  if (!stills) { tile(tmp, ts.length, join(outDir, `${name}-${strip ? strip : 'sheet'}.jpg`), labels, strip ? 4 : 0); rmSync(tmp, { recursive: true, force: true }); }
  await done();
}
await probe.close();

const from = +opt('from', 0), to = +opt('to', DUR), workers = +opt('workers', 4), crf = opt('crf', PREVIEW ? '23' : '18');
const n = Math.round((to - from) * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}${PREVIEW ? '-p' : ''}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames @ ${FPS} fps, ${workers} workers${PREVIEW ? ' (preview)' : ''}`);
const t0 = Date.now(); let count = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const page = await open();
  // hard cuts every few frames: a short GOP keeps each cut a clean keyframe
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-c:v', 'libx264', '-preset', PREVIEW ? 'veryfast' : 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', String(FPS), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise((r) => ff.on('close', r));
  for (let f = a; f < b; f++) {
    const d = await grab(page, from + (f + 0.01) / FPS, PREVIEW ? 'image/jpeg' : 'image/png');
    if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    if (++count % 60 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${count}/${n}  ${(s / count).toFixed(2)} s/frame  eta ${Math.round((s / count) * (n - count))} s`); }
  }
  ff.stdin.end(); await closed; await page.close();
}));
for (const b of browsers) await b.close();
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map((f) => `file '${f}'`).join('\n'));
const out = join(outDir, `${name}${PREVIEW ? '-preview' : ''}.mp4`), joined = join(tmp, 'joined.mp4'), audio = opt('audio');
execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy "${joined}"`);
if (audio && existsSync(audio)) execSync(`ffmpeg -y -loglevel error -i "${joined}" -ss ${from} -i "${resolve(audio)}" -map 0:v -map 1:a -c:v copy -af apad -c:a aac -b:a 192k -t ${(n / FPS).toFixed(4)} -movflags +faststart "${out}"`);   // pad the sound to the picture: -shortest would drop the last frames
else execSync(`ffmpeg -y -loglevel error -i "${joined}" -c copy -movflags +faststart "${out}"`);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s, ${((Date.now() - t0) / 1000 / n).toFixed(2)} s/frame${audio ? ', with ' + basename(audio) : ''})`);

// luminous-score · render.mjs — stills, a contact sheet, a preview or the final MP4 of a piece page.
// Every frame is window.seek(t) on a ?render=1 page, read from #frame. Run from the project root:
//   node <skill>/scripts/render.mjs piece.html --stills 2,9.5,20      → out/piece-2.png …
//   node <skill>/scripts/render.mjs piece.html --sheet [12] --scale .5 → out/piece-sheet.jpg (each shot just after it starts and settled, or n even moments)
//   node <skill>/scripts/render.mjs piece.html --preview              → out/piece-preview.mp4 (960 × 540, with sound)
//   node <skill>/scripts/render.mjs piece.html                        → out/piece.mp4 (1920 × 1080, 30 fps, with sound from audio.mjs)
// Options: --workers 4  --from 0 --to <s>  --fps 30  --crf 19  --scale .5  --out out/  --name piece  --no-audio
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPiece, grab, b64 } from './browser.mjs';

const args = process.argv.slice(2), has = (k) => args.includes('--' + k);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const file = resolve(args.find((a) => a.endsWith('.html')) || '');
if (!existsSync(file)) { console.error('usage: render.mjs <piece.html> [--stills 1,2 | --sheet [n] | --preview] [--workers 4]'); process.exit(1); }
const PREVIEW = has('preview'), name = opt('name', basename(file).replace(/\.html$/, '').replace(/^index$/, 'piece'));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = opt('scale', PREVIEW ? '.5' : '1'), query = `render=1&scale=${scale}`;
const tile = (dir, n, out, labels) => {
  const cols = Math.min(4, Math.ceil(Math.sqrt(n * 1.2))), rows = Math.ceil(n / cols);
  execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${dir}/%03d.png" -vf "scale=640:-1,drawtext=text='%{n}':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.55,tile=${cols}x${rows}:padding=4:color=0x111111" -frames:v 1 -q:v 3 "${out}"`);
  console.log(`${out}  (${labels.map((l, i) => `${i}=${l}`).join(' ')})`);
};

const probe = await openPiece(file, { query });
const DUR = await probe.page.evaluate(() => window.DURATION), FPS = +opt('fps', await probe.page.evaluate(() => window.FPS));
const stills = opt('stills'), sheet = has('sheet');
if (stills || sheet) {
  let ts;
  if (stills) ts = stills.split(',').map(Number);
  else if (opt('sheet')) { const n = +opt('sheet'); ts = Array.from({ length: n }, (_, i) => +(((i + 0.5) * DUR) / n).toFixed(2)); }
  else ts = (await probe.page.evaluate(() => { const s = window.piece.shots, D = window.DURATION; return s.flatMap((x, i) => { const end = i + 1 < s.length ? s[i + 1].at : D; return [Math.min(end - 0.05, x.at + 0.4), Math.min(end - 0.05, x.at + Math.max(x.blend, (end - x.at) * 0.6))]; }); })).map((t) => +t.toFixed(2));
  const tmp = join(outDir, `.sheet-${name}`);
  if (sheet) { rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true }); }
  for (const [i, t] of ts.entries()) {
    const t0 = Date.now(), d = await grab(probe.page, t);
    const f = sheet ? join(tmp, `${String(i).padStart(3, '0')}.png`) : join(outDir, `${name}-${t}.png`);
    writeFileSync(f, b64(d)); if (!sheet) console.log(`${f}  ${t.toFixed(2)} s · ${Date.now() - t0} ms`);
  }
  if (sheet) { tile(tmp, ts.length, join(outDir, `${name}-sheet.jpg`), ts.map((t) => t.toFixed(2) + 's')); rmSync(tmp, { recursive: true, force: true }); }
  await probe.browser.close(); process.exit(0);
}
await probe.browser.close();

// sound first (audio.mjs), unless --no-audio
let audio = null;
if (!has('no-audio')) {
  audio = join(outDir, `${name}.wav`);
  execSync(`node "${join(dirname(fileURLToPath(import.meta.url)), 'audio.mjs')}" "${file}" --out "${audio}"`, { stdio: 'inherit' });
}
const from = +opt('from', 0), to = +opt('to', DUR), workers = +opt('workers', 4), crf = opt('crf', PREVIEW ? '23' : '19');
const n = Math.round((to - from) * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}${PREVIEW ? '-p' : ''}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames @ ${FPS} fps, ${workers} workers${PREVIEW ? ' (preview)' : ''}`);
const t0 = Date.now(); let done = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const { browser, page } = await openPiece(file, { query });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', PREVIEW ? 'veryfast' : 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', String(FPS * 2), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise((r) => ff.on('close', r));
  for (let f = a; f < b; f++) {
    const d = await grab(page, from + f / FPS, PREVIEW ? 'image/jpeg' : 'image/png');
    if (!ff.stdin.write(b64(d))) await new Promise((r) => ff.stdin.once('drain', r));
    if (++done % 60 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${done}/${n}  ${(s / done).toFixed(2)} s/frame  eta ${Math.round((s / done) * (n - done))} s`); }
  }
  ff.stdin.end(); await closed; await browser.close();
}));
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map((f) => `file '${f}'`).join('\n'));
const out = join(outDir, `${name}${PREVIEW ? '-preview' : ''}.mp4`), joined = join(tmp, 'joined.mp4');
execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy "${joined}"`);
if (audio && existsSync(audio)) execSync(`ffmpeg -y -loglevel error -i "${joined}" -ss ${from} -i "${audio}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${out}"`);
else execSync(`ffmpeg -y -loglevel error -i "${joined}" -c copy -movflags +faststart "${out}"`);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s, ${((Date.now() - t0) / 1000 / n).toFixed(2)} s/frame${audio ? ', with sound' : ''})`);

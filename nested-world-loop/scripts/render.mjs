// nested-world-loop · render.mjs — the MP4, stills, a contact sheet, or the seam strips (every frame is seek(t)).
// Run from the project root:
//   node <skill>/scripts/render.mjs my-loop                         → out/my-loop.mp4 (1920×1080, H.264, silent, one loop)
//   node <skill>/scripts/render.mjs my-loop --stills 2,7.5,13       → out/my-loop-2.png …
//   node <skill>/scripts/render.mjs my-loop --sheet 12              → out/my-loop-sheet.jpg (labels = seconds)
//   node <skill>/scripts/render.mjs my-loop --seams                 → out/my-loop-seams.jpg (each hand-off and the loop wrap, 3 frames each)
// Options: --scale .5 (preview) · --ss 1.5 (supersampling; default 1.5 for the MP4, 1 otherwise) · --workers 4 · --fps 30
//          --crf 18 · --loops 3 (repeat the loop in the MP4) · --audio track.wav · --out out/
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { opt, flag, pagePath, loopName, launch, open, grab, buf } from './_lib.mjs';

const file = pagePath('usage: render.mjs <loop folder | index.html> [--stills 2,5] [--sheet 12] [--seams]');
const name = opt('name', loopName(file)), outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = opt('scale', ''), still = opt('stills') || opt('sheet') || flag('seams');
const ss = opt('ss', still ? '' : '1.5');
const browser = await launch();
const done = async () => { await browser.close(); process.exit(0); };
const { page: probe } = await open(browser, file, { scale, ss });
const DUR = await probe.evaluate(() => window.DURATION), FPS = +opt('fps', await probe.evaluate(() => window.FPS || 30));
const fmt = x => +(+x).toFixed(3);

if (opt('stills')) {
  for (const s of opt('stills').split(',').map(Number)) { const f = join(outDir, `${name}-${s}.png`); writeFileSync(f, buf(await grab(probe, s))); console.log(f); }
  await done();
}
async function sheet(ts, label, cols, f) {
  const tmp = join(outDir, `.sheet-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp);
  for (let i = 0; i < ts.length; i++) writeFileSync(join(tmp, `${String(i).padStart(3, '0')}.jpg`), buf(await grab(probe, ts[i], 'image/jpeg', .9)));
  const labels = ts.map((t, i) => `drawtext=text='${label(t, i).replace(/:/g, '\\:')}':x=10:y=10:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.55`);
  const parts = ts.map((_, i) => `[${i}:v]scale=480:-1,${labels[i]}[v${i}]`).join(';');
  const inputs = ts.map((_, i) => `-i "${join(tmp, String(i).padStart(3, '0') + '.jpg')}"`).join(' ');
  const rows = Math.ceil(ts.length / cols), lay = ts.map((_, i) => `${(i % cols) ? Array.from({ length: i % cols }, () => 'w0').join('+') : '0'}_${Math.floor(i / cols) ? Array.from({ length: Math.floor(i / cols) }, () => 'h0').join('+') : '0'}`).join('|');
  execSync(`ffmpeg -y -loglevel error ${inputs} -filter_complex "${parts};${ts.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${ts.length}:layout=${lay}:fill=white" -frames:v 1 -q:v 3 "${f}"`);
  rmSync(tmp, { recursive: true, force: true }); console.log(f); void rows;
}
if (opt('sheet')) {
  const n = +opt('sheet'), ts = Array.from({ length: n }, (_, i) => fmt(DUR * i / n));
  await sheet(ts, t => `${t.toFixed(1)} s`, n <= 6 ? n : Math.ceil(n / 2), join(outDir, `${name}-sheet.jpg`)); await done();
}
if (flag('seams')) {
  const seams = await probe.evaluate(() => window.__nwl.seams), info = await probe.evaluate(() => window.filmInfo());
  const ts = [], lab = [];
  seams.forEach((s, i) => { for (const d of [-3, 0, 3]) { const t = s === 0 ? (d < 0 ? DUR + d / FPS : d / FPS) : s + d / FPS; ts.push(fmt(t)); lab.push(`${i ? info.worlds[i - 1].id + ' → ' + info.worlds[i].id : 'loop wrap'}  ${d >= 0 ? '+' : ''}${d}f`); } });
  await sheet(ts, (t, i) => lab[i], 3, join(outDir, `${name}-seams.jpg`)); await done();
}
await probe.close();
const workers = +opt('workers', 4), crf = opt('crf', '18'), n = Math.round(DUR * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames @ ${FPS} fps, ${workers} workers, ss ${ss || 1}`);
const t0 = Date.now(); let count = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const { page } = await open(browser, file, { scale, ss });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-threads', '2', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', String(FPS * 2),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise(r => ff.on('close', r));
  for (let f = a; f < b; f++) {
    if (!ff.stdin.write(buf(await grab(page, f / FPS, 'image/jpeg', .95)))) await new Promise(r => ff.stdin.once('drain', r));
    if (++count % 30 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${count}/${n}  eta ${Math.round(s / count * (n - count))} s`); }
  }
  ff.stdin.end(); await closed; await page.close();
}));
await browser.close();
const list = join(tmp, 'list.txt'), loops = +opt('loops', 1);
const chunks = Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync);
writeFileSync(list, Array.from({ length: loops }, () => chunks.map(f => `file '${f}'`).join('\n')).join('\n'));
const out = join(outDir, `${name}.mp4`), audio = opt('audio'), total = DUR * loops;
execSync(audio
  ? `ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -i "${resolve(audio)}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -t ${total} -movflags +faststart "${out}"`
  : `ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy -movflags +faststart "${out}"`);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${loops} loop${loops > 1 ? 's' : ''}, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);

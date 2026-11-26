// embroidery-reel · render.mjs — the MP4, stills or a contact sheet (every frame is seek(t), so workers split the film).
// Run from the project's parent:
//   node <skill>/scripts/render.mjs my-reel                       → out/my-reel.mp4 (1080×1350 by default, H.264, silent)
//   node <skill>/scripts/render.mjs my-reel --stills 2,7.5,13     → out/my-reel-2.png …
//   node <skill>/scripts/render.mjs my-reel --sheet 12            → out/my-reel-sheet.jpg (labels = seconds)
//   node <skill>/scripts/render.mjs my-reel --items               → out/my-reel-items.jpg (each item when its tag has landed)
// Options: --scale .5 (preview) · --ss 1.5 (supersampling; default 1.5 for the MP4, 1 otherwise) · --workers 4 · --fps 30
//          --crf 18 · --audio track.wav · --out out/ · --msaa 4
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { opt, flag, pagePath, reelName, launch, open, grab, buf } from './_lib.mjs';

const file = pagePath('usage: render.mjs <reel folder | index.html> [--stills 2,5] [--sheet 12] [--items]');
const name = opt('name', reelName(file)), outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = opt('scale', ''), still = opt('stills') || opt('sheet') || flag('items');
const ss = opt('ss', still ? '' : '1.5'), extra = opt('msaa') ? '&msaa=' + opt('msaa') : '';
const browser = await launch();
const done = async () => { await browser.close(); process.exit(0); };
const { page: probe } = await open(browser, file, { scale, ss, extra });
const DUR = await probe.evaluate(() => window.DURATION), FPS = +opt('fps', await probe.evaluate(() => window.FPS || 30));
const fmt = x => +(+x).toFixed(3);

if (opt('stills')) {
  for (const s of opt('stills').split(',').map(Number)) { const f = join(outDir, `${name}-${s}.png`); writeFileSync(f, buf(await grab(probe, s))); console.log(f); }
  await done();
}
async function sheet(ts, label, cols, f) {
  const tmp = join(outDir, `.sheet-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp);
  for (let i = 0; i < ts.length; i++) writeFileSync(join(tmp, `${String(i).padStart(3, '0')}.jpg`), buf(await grab(probe, ts[i], 'image/jpeg', .9)));
  const labels = ts.map((t, i) => `drawtext=text='${label(t, i).replace(/:/g, '\\:').replace(/'/g, '')}':x=10:y=10:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.55`);
  const parts = ts.map((_, i) => `[${i}:v]scale=360:-1,${labels[i]}[v${i}]`).join(';');
  const inputs = ts.map((_, i) => `-i "${join(tmp, String(i).padStart(3, '0') + '.jpg')}"`).join(' ');
  const lay = ts.map((_, i) => `${(i % cols) ? Array.from({ length: i % cols }, () => 'w0').join('+') : '0'}_${Math.floor(i / cols) ? Array.from({ length: Math.floor(i / cols) }, () => 'h0').join('+') : '0'}`).join('|');
  execSync(`ffmpeg -y -loglevel error ${inputs} -filter_complex "${parts};${ts.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${ts.length}:layout=${lay}:fill=white" -frames:v 1 -q:v 3 "${f}"`);
  rmSync(tmp, { recursive: true, force: true }); console.log(f);
}
if (opt('sheet')) {
  const n = +opt('sheet'), ts = Array.from({ length: n }, (_, i) => fmt(DUR * (i + .5) / n));
  await sheet(ts, t => `${t.toFixed(1)} s`, Math.min(6, Math.ceil(Math.sqrt(n * 1.3))), join(outDir, `${name}-sheet.jpg`)); await done();
}
if (flag('items')) {
  const info = await probe.evaluate(() => window.filmInfo());
  const ts = info.items.map(it => fmt(Math.min(it.leave - .05, it.Dl + .3))), lab = info.items.map((it, i) => `item ${i + 1}`);
  if (info.outro) { ts.push(fmt(info.outro.c0 + .8)); lab.push('outro · cord'); ts.push(fmt(DUR - .1)); lab.push('end card'); }
  await sheet(ts, (t, i) => lab[i], Math.min(6, Math.ceil(Math.sqrt(ts.length * 1.3))), join(outDir, `${name}-items.jpg`)); await done();
}
await probe.close();
const workers = +opt('workers', 4), crf = opt('crf', '18'), n = Math.round(DUR * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames @ ${FPS} fps, ${workers} workers, ss ${ss || 1}`);
const t0 = Date.now(); let count = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const { page } = await open(browser, file, { scale, ss, extra });
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
const list = join(tmp, 'list.txt');
const chunks = Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync);
writeFileSync(list, chunks.map(f => `file '${f}'`).join('\n'));
const out = join(outDir, `${name}.mp4`), audio = opt('audio');
execSync(audio
  ? `ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -i "${resolve(audio)}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -t ${DUR} -movflags +faststart "${out}"`
  : `ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy -movflags +faststart "${out}"`);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${DUR} s, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);

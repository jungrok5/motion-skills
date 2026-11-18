// ten-second-scene · render.mjs — stills, a contact sheet, the cast sheet, or the MP4 (every frame is seek(t)).
// Run from the project root:
//   node <skill>/scripts/render.mjs my-scene/scene.html                    → out/my-scene.mp4 (W×H, 30 fps, H.264, silent)
//   node <skill>/scripts/render.mjs my-scene/scene.html --stills 2,5.5,9   → out/my-scene-2.png …
//   node <skill>/scripts/render.mjs my-scene/scene.html --sheet 12         → out/my-scene-sheet.jpg
//   node <skill>/scripts/render.mjs my-scene/scene.html --cast             → out/my-scene-cast.png (figures turned round + motion rows)
// Options: --scale .5 · --workers 4 · --fps 30 · --crf 18 · --audio track.wav (muxed under the picture) · --out out/
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { args, opt, flag, scenePath, sceneName, launch, open, grab, buf } from './_lib.mjs';

const file = scenePath('usage: render.mjs <scene.html> [--stills 2,5] [--sheet 12] [--cast]');
const name = opt('name', sceneName(file)), outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = opt('scale', '');
const browser = await launch();
const done = async () => { await browser.close(); process.exit(0); };

if (flag('cast')) {
  const { page } = await open(browser, file, '&sheet=cast');
  const f = join(outDir, `${name}-cast.png`); writeFileSync(f, buf(await grab(page, null)));
  const rep = await page.evaluate(() => window.castReport ? window.castReport() : { violations: [] });
  console.log(f); console.log(rep.violations.length ? `joint limits: ${rep.violations.length} out of range\n  ` + rep.violations.slice(0, 8).join('\n  ') : 'joint limits: all in range');
  await done();
}
const { page: probe } = await open(browser, file, '', { scale });
const DUR = await probe.evaluate(() => window.DURATION), FPS = +opt('fps', await probe.evaluate(() => window.FPS || 30));
if (opt('stills')) {
  for (const s of opt('stills').split(',').map(Number)) { const f = join(outDir, `${name}-${s}.png`); writeFileSync(f, buf(await grab(probe, s))); console.log(f); }
  await done();
}
if (opt('sheet')) {
  const n = +opt('sheet'), cols = n <= 6 ? n : Math.ceil(n / 2), tmp = join(outDir, `.sheet-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp);
  const ts = Array.from({ length: n }, (_, i) => (DUR - 1 / FPS) * (n === 1 ? 0 : i / (n - 1)));
  for (let i = 0; i < n; i++) writeFileSync(join(tmp, `${String(i).padStart(3, '0')}.png`), buf(await grab(probe, +ts[i].toFixed(3))));
  const f = join(outDir, `${name}-sheet.jpg`), step = (DUR - 1 / FPS) / Math.max(1, n - 1);
  execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${join(tmp, '%03d.png')}" -vf "scale=270:-1,drawtext=text='%{eif\\:n*${step.toFixed(4)}*10\\:d}':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.5,tile=${cols}x${Math.ceil(n / cols)}:padding=4:color=white" -frames:v 1 -q:v 3 "${f}"`);
  rmSync(tmp, { recursive: true, force: true }); console.log(f + '  (labels are tenths of a second)'); await done();
}
await probe.close();
const workers = +opt('workers', 4), crf = opt('crf', '18'), n = Math.round(DUR * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames @ ${FPS} fps, ${workers} workers`);
const t0 = Date.now(); let count = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const { page } = await open(browser, file, '', { scale });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-threads', '2', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', String(FPS * 2),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise(r => ff.on('close', r));
  for (let f = a; f < b; f++) {
    if (!ff.stdin.write(buf(await grab(page, f / FPS, 'image/jpeg', .96)))) await new Promise(r => ff.stdin.once('drain', r));
    if (++count % 30 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${count}/${n}  eta ${Math.round(s / count * (n - count))} s`); }
  }
  ff.stdin.end(); await closed; await page.close();
}));
await browser.close();
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map(f => `file '${f}'`).join('\n'));
const out = join(outDir, `${name}.mp4`), audio = opt('audio');
execSync(audio
  ? `ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -i "${resolve(audio)}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -af "afade=t=out:st=${DUR - .8}:d=.8" -t ${DUR} -movflags +faststart "${out}"`
  : `ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy -movflags +faststart "${out}"`);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);

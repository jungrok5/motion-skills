// color-cycle-breakdown · render.mjs — the MP4, stills or contact sheets (every frame is seek(t), so workers split it).
// Run from the project's parent:
//   node <skill>/scripts/render.mjs my-film                     → out/my-film.mp4 (1920×1080 by default, H.264, silent)
//   node <skill>/scripts/render.mjs my-film --stills 2,7.5,13   → out/my-film-2.png …
//   node <skill>/scripts/render.mjs my-film --sheet 12          → out/my-film-sheet.jpg (labels = seconds)
//   node <skill>/scripts/render.mjs my-film --shots             → out/my-film-shots.jpg (held picture, exploded layers,
//                                                                  every panel once its parts are in, the reassembled end)
// Options: --scale .5 (preview) · --workers 4 · --fps 30 · --crf 18 · --audio track.wav · --out out/
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { opt, flag, pagePath, filmName, launch, open, grab, buf } from './_lib.mjs';

const file = pagePath('usage: render.mjs <film folder | index.html> [--stills 2,5] [--sheet 12] [--shots]');
const name = opt('name', filmName(file)), outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = opt('scale', '');
const browser = await launch();
const done = async () => { await browser.close(); process.exit(0); };
const { page: probe } = await open(browser, file, { scale });
const DUR = await probe.evaluate(() => window.DURATION), FPS = +opt('fps', await probe.evaluate(() => window.FPS || 30));
const fmt = x => +(+x).toFixed(3);

if (opt('stills')) {
  for (const s of opt('stills').split(',').map(Number)) { const f = join(outDir, `${name}-${s}.png`); writeFileSync(f, buf(await grab(probe, s))); console.log(f); }
  await done();
}
async function sheet(ts, label, cols, f) {
  const tmp = join(outDir, `.sheet-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp);
  for (let i = 0; i < ts.length; i++) writeFileSync(join(tmp, `${String(i).padStart(3, '0')}.jpg`), buf(await grab(probe, ts[i], 'image/jpeg', .9)));
  const labels = ts.map((t, i) => `drawtext=text='${label(t, i).replace(/:/g, '\\:').replace(/'/g, '')}':x=10:y=10:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.55`);
  const parts = ts.map((_, i) => `[${i}:v]scale=${+opt('w', 480)}:-1,${labels[i]}[v${i}]`).join(';');
  const inputs = ts.map((_, i) => `-i "${join(tmp, String(i).padStart(3, '0') + '.jpg')}"`).join(' ');
  const lay = ts.map((_, i) => `${(i % cols) ? Array.from({ length: i % cols }, () => 'w0').join('+') : '0'}_${Math.floor(i / cols) ? Array.from({ length: Math.floor(i / cols) }, () => 'h0').join('+') : '0'}`).join('|');
  execSync(`ffmpeg -y -loglevel error ${inputs} -filter_complex "${parts};${ts.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${ts.length}:layout=${lay}:fill=black" -frames:v 1 -q:v 3 "${f}"`);
  rmSync(tmp, { recursive: true, force: true }); console.log(f);
}
if (opt('sheet')) {
  const n = +opt('sheet'), ts = Array.from({ length: n }, (_, i) => fmt(DUR * (i + .5) / n));
  await sheet(ts, t => `${t.toFixed(1)} s`, Math.min(4, Math.ceil(Math.sqrt(n))), join(outDir, `${name}-sheet.jpg`)); await done();
}
if (flag('shots')) {
  const info = await probe.evaluate(() => window.filmInfo());
  const ts = [fmt(info.explode.e0 * .5)], lab = ['picture'];
  ts.push(fmt(info.explode.e1 + .6)); lab.push('layers apart');
  info.shots.filter(s => s.kind === 'panel').forEach(s => { ts.push(fmt(s.t0 + Math.min(2.2, (s.t1 - s.t0) * .7))); lab.push(`panel ${s.panel.n} · ${s.panel.kind}`); });
  ts.push(fmt((info.explode.c0 + info.explode.c1) / 2)); lab.push('coming together');
  ts.push(fmt(info.duration - .2)); lab.push('end');
  await sheet(ts, (t, i) => `${lab[i]} · ${t}s`, Math.min(4, Math.ceil(Math.sqrt(ts.length))), join(outDir, `${name}-shots.jpg`)); await done();
}
await probe.close();
const workers = +opt('workers', 4), crf = opt('crf', '18'), n = Math.round(DUR * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames @ ${FPS} fps, ${workers} workers`);
const t0 = Date.now(); let count = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const { page } = await open(browser, file, { scale });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-threads', '2', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', String(FPS * 2),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise(r => ff.on('close', r));
  for (let f = a; f < b; f++) {
    // PNG frames: pixel art keeps its hard edges until the one H.264 encode
    if (!ff.stdin.write(buf(await grab(page, f / FPS, 'image/png')))) await new Promise(r => ff.stdin.once('drain', r));
    if (++count % 60 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${count}/${n}  eta ${Math.round(s / count * (n - count))} s`); }
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

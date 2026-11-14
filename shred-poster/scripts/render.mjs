// shred-poster · render.mjs — the poster, stills, a contact sheet, a draft or the final MP4 (with its sound) of a project.
// Builds index.html first; every frame is film.renderAt(t) on the ?render=1 page. Run from anywhere:
//   node <skill>/scripts/render.mjs <project> --poster                 → out/poster.png (the print itself, seconds)
//   node <skill>/scripts/render.mjs <project> --stills 0,1.2,3,6       → out/still-0001.20.png …
//   node <skill>/scripts/render.mjs <project> --sheet [n]              → out/sheet.jpg (n even moments, or 3 per shot)
//   node <skill>/scripts/render.mjs <project> --draft                  → out/draft.mp4 (half size, 30 fps, 2 sub-frames)
//   node <skill>/scripts/render.mjs <project>                          → out/film.mp4 (1080×1920, 60 fps) + out/sound.wav + out/cues.csv + out/cover.jpg
// Options: --fps 60 --mb 4 (sub-frames: motion blur + antialiasing) --scale 1 --workers 3 --from 0 --to <s> --crf 16 --name film --keep --resume --no-build
// Without a GPU, WebGL runs on the CPU (SwiftShader): about a second or two per sub-frame at 1080×1920. Workers split frames.
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from './build.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2);
const has = (k) => args.includes('--' + k);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const dir = resolve(args[0] && !args[0].startsWith('--') ? args[0] : '.');
if (!existsSync(join(dir, 'src'))) { console.error('usage: render.mjs <project> [--poster | --stills 0,2 | --sheet [n] | --draft] [--workers 3] [--scale .5] [--mb 4]'); process.exit(1); }
if (!has('no-build')) build(dir, { quiet: true });
const DRAFT = has('draft');
const outDir = resolve(dir, opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = opt('scale', DRAFT ? '.5' : '1'), mb = opt('mb', DRAFT ? '2' : has('stills') || has('sheet') ? '3' : '4');
const url = pathToFileURL(join(dir, 'index.html')).href + `?render=1&scale=${scale}&mb=${mb}`;
const ARGS = ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage'];
const browsers = [];
export async function open(u = url, quiet = false) {
  const browser = await chromium.launch({ args: ARGS }); browsers.push(browser);
  const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 });
  let failed = null;
  page.on('pageerror', (e) => { failed = failed || e; console.error('page error:', e.message); });
  page.on('console', (m) => { const t = m.text(); if (/GPU stall|ReadPixels|Automatic fallback/.test(t)) return; if ((m.type() === 'error' || m.type() === 'warning') && !quiet) console.error(`console ${m.type()}:`, t.slice(0, 1200)); if (/not compiled|program not valid|THREE\.WebGLProgram/.test(t)) failed = failed || new Error('a shader failed: ' + t.slice(0, 400)); });
  await page.goto(u, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.READY === true));) {
    const f = await page.evaluate(() => window.FAILED || null); if (f) throw new Error('the film failed to load: ' + f);
    if (failed) throw new Error('the film failed to load: ' + failed.message);
    if (Date.now() - t0 > 600000) throw new Error('the page never set window.READY');
    await new Promise((r) => setTimeout(r, 200));
  }
  return page;
}
const grab = (page, t, type = 'image/png') => page.evaluate(([t, type]) => { window.film.renderAt(t); return window.film.canvas.toDataURL(type, 0.93); }, [t, type]);
const save = (f, d) => writeFileSync(f, Buffer.from(d.split(',')[1], 'base64'));

const t00 = Date.now();
const probe = await open();
const DUR = await probe.evaluate(() => window.film.DURATION), FPS = +opt('fps', DRAFT ? 30 : await probe.evaluate(() => window.film.FPS));
const shots = await probe.evaluate(() => window.film.shots);
const issues = await probe.evaluate(() => window.film.issues);
console.log(`${await probe.evaluate(() => window.film.gpu)} · loaded in ${((Date.now() - t00) / 1000).toFixed(1)} s`);
if (issues.length) console.log('poster issues:\n  ' + issues.join('\n  '));
if (has('poster')) {
  const f = join(outDir, 'poster.png'); save(f, await probe.evaluate(() => window.film.posterPNG('hero'))); console.log(f);
} else if (has('stills')) {
  for (const s of opt('stills', '0').split(',')) { const t = +s, f = join(outDir, `still-${t.toFixed(2).padStart(7, '0')}.png`), a = Date.now(); save(f, await grab(probe, t)); console.log(f, `${((Date.now() - a) / 1000).toFixed(1)} s`, JSON.stringify(await probe.evaluate(() => window.film.info()))); }
} else if (has('sheet')) {
  const n = +opt('sheet', 0), times = n ? Array.from({ length: n }, (_, i) => ((i + 0.5) / n) * DUR) : shots.flatMap((s) => [s.t0 + 0.03, (s.t0 + s.t1) / 2, s.t1 - 0.03]);
  const tmp = join(outDir, '.sheet'); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  for (let i = 0; i < times.length; i++) save(join(tmp, String(i).padStart(3, '0') + '.jpg'), await grab(probe, times[i], 'image/jpeg'));
  const cols = n ? Math.min(6, Math.ceil(Math.sqrt(times.length * 1.8))) : 6, rows = Math.ceil(times.length / cols), out = join(outDir, opt('name', 'sheet') + '.jpg');
  execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${tmp}/%03d.jpg" -vf "scale=360:-1,drawtext=text='%{eif\\:n\\:d}':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.5,tile=${cols}x${rows}:padding=4:color=0x111111" -frames:v 1 -q:v 3 "${out}"`);
  rmSync(tmp, { recursive: true, force: true });
  console.log(out + '\n  ' + times.map((t, i) => `${i}: ${t.toFixed(2)} s`).join('  '));
} else {
  const from = +opt('from', 0), to = +opt('to', DUR), f0 = Math.round(from * FPS), f1 = Math.round(to * FPS), total = f1 - f0;
  const workers = Math.max(1, +opt('workers', 3)), name = opt('name', DRAFT ? 'draft' : 'film'), frames = join(outDir, `.frames-${name}`);
  if (!has('resume')) rmSync(frames, { recursive: true, force: true }); mkdirSync(frames, { recursive: true });
  // the sound, the cue sheet
  const snd = await probe.evaluate(() => window.film.sound()), wav = join(outDir, 'sound.wav');
  if (snd) { save(wav, 'data:audio/wav;base64,' + snd.b64); console.log(`sound: ${snd.lufs.toFixed(1)} LUFS, peak ${snd.peak.toFixed(1)} dBFS → ${wav}`); }
  const cues = await probe.evaluate(() => window.film.cues());
  writeFileSync(join(outDir, 'cues.csv'), 'time_s,frame_60fps,kind,dur_s,big\n' + cues.map((c) => `${c.t},${(c.t * 60).toFixed(1)},${c.kind},${c.dur ?? ''},${c.big ? 1 : ''}`).join('\n') + '\n');
  const have = new Set(readdirSync(frames)); let next = f0, done = 0; const tA = Date.now();
  const work = async (page) => { for (;;) { const f = next++; if (f >= f1) return; const fn = String(f - f0).padStart(6, '0') + '.jpg'; if (!have.has(fn)) save(join(frames, fn), await grab(page, f / FPS, 'image/jpeg')); done++;
    if (done % 10 === 0 || done === total) { const el = (Date.now() - tA) / 1000; process.stdout.write(`\r  ${done}/${total} frames · ${(el / done).toFixed(2)} s/frame · ${((el / done) * (total - done) / 60).toFixed(1)} min left   `); } } };
  const pages = [probe]; for (let i = 1; i < workers; i++) pages.push(await open(url, true));
  await Promise.all(pages.map(work)); console.log();
  const mp4 = join(outDir, name + '.mp4'), withSound = snd && from === 0 && Math.abs(to - DUR) < 1e-6;
  const ff = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(frames, '%06d.jpg')];
  if (withSound) ff.push('-i', wav);
  ff.push('-c:v', 'libx264', '-preset', DRAFT ? 'medium' : 'slow', '-crf', opt('crf', DRAFT ? '22' : '16'), '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos:out_color_matrix=bt709');
  if (withSound) ff.push('-c:a', 'aac', '-b:a', '256k', '-shortest');
  ff.push(mp4);
  await new Promise((res, rej) => spawn('ffmpeg', ff, { stdio: 'inherit' }).on('exit', (c) => (c ? rej(new Error('ffmpeg ' + c)) : res())));
  if (!DRAFT && from === 0) { const last = readdirSync(frames).sort().pop(); execSync(`cp "${join(frames, last)}" "${join(outDir, 'cover.jpg')}"`); }
  if (!has('keep')) rmSync(frames, { recursive: true, force: true });
  console.log(mp4, withSound ? '(with sound)' : '(silent)');
}
for (const b of browsers) await b.close();

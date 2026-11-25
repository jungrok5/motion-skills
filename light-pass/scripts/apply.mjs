// light-pass · apply.mjs — lay a light plan over finished pictures: stills, a folder of frames, or a video.
//   node <skill>/scripts/apply.mjs <in.jpg|in.png|in.mp4|frames-dir> <plan.json> <out.jpg|out.png|out.mp4|out-dir>
//        [--view lit|mask|off] [--t 2.5] [--fps 24] [--crf 18] [--from 0 --to 5] [--width 1280]
// A still is lit at --t (default 0). A video is lit frame by frame at its own time (t = frame / fps), so keyframed
// plans follow the shot; its sound is copied across. Runs in headless Chromium (WebGL 2; no GPU needed).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync, existsSync, mkdtempSync } from 'node:fs';
import { join, resolve, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(spawnSync('npm', ['root', '-g']).stdout.toString().trim(), 'playwright'))); }
const here = dirname(fileURLToPath(import.meta.url)), LIB = join(here, '..', 'lib', 'lightpass.js');
const args = process.argv.slice(2), pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !args[i - 1].includes('=')));
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const [inp, planFile, outp] = pos; if (!inp || !planFile || !outp) { console.error('usage: apply.mjs <in> <plan.json> <out> [--view lit|mask|off] [--t s] [--fps n]'); process.exit(2); }
const plan = JSON.parse(readFileSync(planFile, 'utf8')), view = opt('view', 'lit');
const ff = (a) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' }); if (r.status) throw new Error('ffmpeg failed: ' + a.join(' ')); };
const isVideo = (f) => /\.(mp4|mov|webm|mkv)$/i.test(f), isImg = (f) => /\.(jpe?g|png|webp)$/i.test(f);

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); page.on('pageerror', (e) => console.error('page:', e.message));
await page.setContent('<!doctype html><canvas id=c></canvas>'); await page.addScriptTag({ path: LIB });
const light = async (file, t, outFile) => {
  const b64 = readFileSync(file).toString('base64'), mime = /png$/i.test(file) ? 'image/png' : 'image/jpeg', png = /png$/i.test(outFile);
  const url = await page.evaluate(async ([b64, mime, plan, t, view, png, width]) => {
    const img = new Image(); img.src = `data:${mime};base64,${b64}`; await img.decode();
    const c = document.getElementById('c'), w = width ? +width : img.naturalWidth; c.width = w; c.height = Math.round(img.naturalHeight * w / img.naturalWidth);
    if (!window.lp) window.lp = LightPass.create(c); lp.view = view; lp.frame = 0; lp.draw(img, plan, t);
    return c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.95); }, [b64, mime, plan, t, view, png, opt('width', 0)]);
  writeFileSync(outFile, Buffer.from(url.split(',')[1], 'base64')); };

const t0 = Date.now();
if (isImg(inp)) { await light(inp, +opt('t', 0), outp); console.log(outp); }
else {
  const fps = +opt('fps', 24); let frames = inp, tmp = null;
  if (isVideo(inp)) { tmp = mkdtempSync(join(tmpdir(), 'lightpass-')); frames = join(tmp, 'in'); mkdirSync(frames);
    const cut = []; if (opt('from')) cut.push('-ss', opt('from')); if (opt('to')) cut.push('-to', opt('to'));
    ff([...cut, '-i', inp, '-vf', `fps=${fps}`, '-q:v', '2', join(frames, 'f_%05d.jpg')]); }
  const list = readdirSync(frames).filter(isImg).sort(); const outDir = isVideo(outp) ? join(tmp || mkdtempSync(join(tmpdir(), 'lightpass-')), 'out') : outp; mkdirSync(outDir, { recursive: true });
  for (let i = 0; i < list.length; i++) { await light(join(frames, list[i]), i / fps, join(outDir, list[i].replace(/\.\w+$/, '.jpg'))); if (i % 24 === 0) process.stdout.write(`\r${i + 1}/${list.length}`); }
  process.stdout.write(`\r${list.length}/${list.length}\n`);
  if (isVideo(outp)) { const a = ['-framerate', String(fps), '-i', join(outDir, 'f_%05d.jpg')]; const hasAudio = isVideo(inp) && spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', inp]).stdout.toString().trim();
    if (hasAudio) { if (opt('from')) a.push('-ss', opt('from')); a.push('-i', inp, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-shortest'); }
    ff([...a, '-c:v', 'libx264', '-crf', opt('crf', '18'), '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outp]); console.log(outp); }
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s`); await browser.close();

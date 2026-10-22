// Record a scene to MP4 frame by frame (deterministic: every frame is seek(t) + a read of the scene's canvas), or grab stills.
// Output is already the upload format (H.264 faster CRF 18 ≤ 12 Mbps, closed GOP, keyframe every 2 s, no B-frames, tagged
// 'osb-upload'), so assemble.py only joins. --venc x265 for smaller HEVC files; --cap shot for page screenshots instead of the
// canvas read; --venc x264master for the old H.264 master (assemble.py then encodes once).
// A scene whose most expensive layer is language-independent (a WebGL sky, a simulation) can expose __glFrame() (that layer as
// a PNG data URL) and __prepare(t) (load the cached frame before seek): render.mjs then stores that layer once per
// orientation (out/glcache/<scene>-<h|v>-<hash of the scene file>/, lossless) and every language reuses it (--glcache auto|build|off).
// Run from the film project root (the folder with film.json):
//   node <skill>/scripts/render.mjs h --scene cross                 → out/cross-h.mp4 (1920×1080)
//   node <skill>/scripts/render.mjs v --scene cross                 → out/cross-v.mp4 (1080×1920)
//   node <skill>/scripts/render.mjs h --scene cross --stills 3,12   → out/still-cross-h-3.png … (for checking — use these a lot)
//   node <skill>/scripts/render.mjs h --scene cross --lang en       → the English version (scenes/i18n/en.json)
//   node <skill>/scripts/render.mjs v --scene seed --cut short      → the SCRIPT.cuts.short version (out/seed-short-v.mp4)
// A sibling scenes/<scene>.wav (from mix.py) is muxed in automatically.
// Options: --root <dir> --page <path.html> --fps 30 --workers 4 --from 0 --to <sec>
// Needs: Playwright (Chromium) + ffmpeg, and the scene fonts installed locally (Google Fonts is blocked while
// recording, so the output never depends on the network).
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const args = process.argv.slice(2);
const ori = args[0] === 'v' ? 'v' : 'h';
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const root = resolve(opt('root', '.'));
const fps = +opt('fps', 30), workers = +opt('workers', 4), lang = opt('lang', '');
// The canvas read happens in the same task as the draw: pixel-identical to a screenshot (checked on 42 frames, WebGL
// included) and ~3x cheaper to capture. Encoding straight to the upload format costs no extra render time and removes a
// whole second encode (~20 min per 14-min orientation). Measured: 179 s -> 114 s for the same two scenes. Workers 3/4/6: same.
const cap = opt('cap', 'canvas'), venc = opt('venc', 'x264'), glmode = opt('glcache', 'auto');
// Measured on a 4-core CPU box, busiest scene: x264 faster CRF 18 ≤ 12 Mbps = 39.6 dB at half the CPU of x265 fast; an HEVC
// 3.6 Mbps cap (for a 400 MB transfer limit) held the same scene at 36 dB. x265 superfast/ultrafast lose 1.8–3 dB. YouTube
// recommends 8–12 Mbps for 1080p — anything above is re-encoded away.
const VENC = {
  x264: ['-c:v', 'libx264', '-preset', 'faster', '-crf', '18', '-maxrate', '12M', '-bufsize', '24M', '-g', '60', '-keyint_min', '60', '-sc_threshold', '0', '-bf', '0', '-metadata', 'comment=osb-upload'],
  x265: ['-c:v', 'libx265', '-preset', 'fast', '-x265-params', 'crf=20:bframes=0:open-gop=0:keyint=60:min-keyint=60:vbv-maxrate=3600:vbv-bufsize=7200:log-level=error', '-tag:v', 'hvc1', '-metadata', 'comment=osb-upload'],
  x264master: ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18'],
}[venc];
if (!VENC) { console.error('unknown --venc', venc); process.exit(1); }
const cut = opt('cut', '');   // --cut short → the SCRIPT.cuts.short version (scene-short-v.mp4, muxes scenes/<scene>-short.wav)
const [W, H] = ori === 'h' ? [1920, 1080] : [1080, 1920];
const out = join(root, 'out'); mkdirSync(out, { recursive: true });
const page$ = opt('page') ? resolve(root, opt('page')) : join(root, 'scenes', opt('scene', 'scene') + '.html');
const name = basename(page$).replace(/\.html$/, '') + (cut ? '-' + cut : '') + (lang ? '-' + lang : '');
let url = pathToFileURL(page$).href + `?render=1&o=${ori}` + (lang ? `&lang=${lang}` : '') + (cut ? `&cut=${cut}` : '');
const pageSrc = readFileSync(page$, 'utf8');
const glAble = glmode !== 'off' && /__glFrame/.test(pageSrc);
let glDir = null, glReady = false;   // set after the probe page: the scene may name its own cache key (__glFrame.key)
const wav = page$.replace(/\.html$/, cut ? `-${cut}.wav` : '.wav');

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  return page;
}

const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text', '--allow-file-access-from-files'] });
const probe = await openPage(browser);
const DUR = await probe.evaluate(() => window.DURATION);
if (glAble) {   // the cache key: what the scene says its layer depends on (__glFrame.key), else the whole scene file
  const key = (await probe.evaluate(() => window.__glFrame && window.__glFrame.key || null)) || createHash('sha1').update(pageSrc).digest('hex').slice(0, 8);
  glDir = join(out, 'glcache', `${basename(page$).replace(/\.html$/, '')}${cut ? '-' + cut : ''}-${ori}-${key}`); glReady = existsSync(join(glDir, 'done'));
  if (glReady && glmode !== 'build') url += '&glcache=' + encodeURIComponent(pathToFileURL(glDir).href + '/');
}
await probe.close();

if (glAble && !glReady) {   // build the scene's cached layer first (all frames at the 30 fps grid), then use it
  const n = Math.round(DUR * fps), per = Math.ceil(n / workers); mkdirSync(glDir, { recursive: true });
  console.log(`building ${basename(glDir)}: ${n} frames (once per orientation; every language reuses it)`);
  let done = 0;
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const a = w * per, b = Math.min(n, a + per); const page = await openPage(browser);
    for (let f = a; f < b; f++) {
      const file = join(glDir, String(f).padStart(5, '0') + '.png'); if (existsSync(file)) { done++; continue; }
      const d = await page.evaluate(f => { window.seek(f / 30); return window.__glFrame(); }, f);
      if (d) writeFileSync(file, Buffer.from(d.split(',')[1], 'base64'));
      if (++done % 100 === 0) console.log(`  ${done}/${n}`);
    }
    await page.close();
  }));
  writeFileSync(join(glDir, 'done'), new Date().toISOString());
  if (glmode === 'build') { await browser.close(); process.exit(0); }
  url += '&glcache=' + encodeURIComponent(pathToFileURL(glDir).href + '/');
}

const stills = opt('stills');
if (stills) {
  const page = await openPage(browser);
  for (const t of stills.split(',').map(Number)) {
    await page.evaluate(async t => { if (window.__prepare) await window.__prepare(t); window.seek(t); }, t);
    const f = join(out, `still-${name}-${ori}-${String(t).replace('.', '_')}.png`);
    await page.screenshot({ path: f }); console.log(f);
  }
  await browser.close(); process.exit(0);
}

const t0 = +opt('from', 0), t1 = Math.min(DUR, +opt('to', DUR));
const total = Math.round((t1 - t0) * fps);
console.log(`${name} ${ori}: ${W}×${H}, ${(t1 - t0).toFixed(1)}s, ${total} frames, ${workers} workers`);
const per = Math.ceil(total / workers);
let done = 0;
const segs = await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(total, a + per); if (a >= b) return null;
  const seg = join(out, `seg-${name}-${ori}-${w}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    ...VENC, '-pix_fmt', 'yuv420p', '-r', String(fps), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
  const page = await openPage(browser);
  for (let f = a; f < b; f++) {
    let buf;
    if (cap === 'canvas') buf = Buffer.from((await page.evaluate(async t => { if (window.__prepare) await window.__prepare(t); window.seek(t); return document.querySelector('canvas').toDataURL('image/jpeg', .95); }, t0 + f / fps)).split(',')[1], 'base64');
    else { await page.evaluate(async t => { if (window.__prepare) await window.__prepare(t); window.seek(t); }, t0 + f / fps); buf = await page.screenshot({ type: 'jpeg', quality: 95 }); }
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (++done % 300 === 0) console.log(`  ${done}/${total}`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await page.close();
  return seg;
}));
await browser.close();

const list = join(out, `list-${name}-${ori}.txt`);
writeFileSync(list, segs.filter(Boolean).map(s => `file '${s}'`).join('\n'));
const final = join(out, `${name}-${ori}.mp4`);
const audioIn = existsSync(wav) ? `-i "${wav}" -map 0:v -map 1:a -c:a aac -b:a 192k -shortest` : '';
const tag = venc === 'x264master' ? '' : '-metadata comment=osb-upload';   // marks the upload format for assemble.py (the concat mux drops the segments' tags)
execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" ${audioIn} -c:v copy ${tag} -movflags +faststart "${final}"`);
segs.filter(Boolean).forEach(s => rmSync(s)); rmSync(list);
console.log('→', final);

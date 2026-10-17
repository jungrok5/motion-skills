// Record a scene to MP4 frame by frame (deterministic: every frame is seek(t) + screenshot), or grab stills.
// Run from the film project root (the folder with film.json):
//   node <skill>/scripts/render.mjs h --scene cross                 → out/cross-h.mp4 (1920×1080)
//   node <skill>/scripts/render.mjs v --scene cross                 → out/cross-v.mp4 (1080×1920)
//   node <skill>/scripts/render.mjs h --scene cross --stills 3,12   → out/still-cross-h-3.png … (for checking — use these a lot)
//   node <skill>/scripts/render.mjs h --scene cross --lang en       → the English version (scenes/i18n/en.json)
// A sibling scenes/<scene>.wav (from mix.py) is muxed in automatically.
// Options: --root <dir> --page <path.html> --fps 30 --workers 4 --from 0 --to <sec>
// Needs: Playwright (Chromium) + ffmpeg, and the scene fonts installed locally (Google Fonts is blocked while
// recording, so the output never depends on the network).
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
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
const [W, H] = ori === 'h' ? [1920, 1080] : [1080, 1920];
const out = join(root, 'out'); mkdirSync(out, { recursive: true });
const page$ = opt('page') ? resolve(root, opt('page')) : join(root, 'scenes', opt('scene', 'scene') + '.html');
const name = basename(page$).replace(/\.html$/, '') + (lang ? '-' + lang : '');
const url = pathToFileURL(page$).href + `?render=1&o=${ori}` + (lang ? `&lang=${lang}` : '');
const wav = page$.replace(/\.html$/, '.wav');

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
await probe.close();

const stills = opt('stills');
if (stills) {
  const page = await openPage(browser);
  for (const t of stills.split(',').map(Number)) {
    await page.evaluate(t => window.seek(t), t);
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
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
  const page = await openPage(browser);
  for (let f = a; f < b; f++) {
    await page.evaluate(t => window.seek(t), t0 + f / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
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
execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" ${audioIn} -c:v copy -movflags +faststart "${final}"`);
segs.filter(Boolean).forEach(s => rmSync(s)); rmSync(list);
console.log('→', final);

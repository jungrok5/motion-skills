// render.mjs — record a promo-video page to MP4 (or PNG stills), frame by frame, deterministically.
//
// Usage (from the project root):
//   node <skill>/scripts/render.mjs <page.html> [--fmt l|p|both] [--out out/name-{fmt}.mp4] [--stills 1,6.5,12] [--fps 30]
//     --fmt     l = 1920×1080 landscape, p = 1080×1920 portrait (page gets ?f=p), both (default)
//     --out     output path; {fmt} → landscape|portrait. Default: out/<page folder name>-{fmt}.mp4
//     --stills  write PNG stills at these seconds instead of a video (out/still-<name>-<fmt>-<t>.png)
// The page must define window.DUR (seconds) and window.render(t) (draws the frame for time t, no clocks, no randomness).
// Needs: playwright (Chromium; local or global `npm i -g playwright`) and ffmpeg on PATH.
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const argv = process.argv.slice(2);
const arg = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const page0 = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
if (!page0) { console.error('usage: node render.mjs <page.html> [--fmt l|p|both] [--out out/x-{fmt}.mp4] [--stills 1,2]'); process.exit(1); }
const pageFile = path.resolve(page0);
const name = path.basename(path.dirname(pageFile));
const fmts = { l: ['l'], p: ['p'], both: ['l', 'p'] }[arg('--fmt', 'both')];
const stills = arg('--stills') ? arg('--stills').split(',').map(Number) : null;
const FPS = Number(arg('--fps', 30));
const outTpl = arg('--out', `out/${name}-{fmt}.mp4`);

async function open(browser, fmt) {
  const [W, H] = fmt === 'l' ? [1920, 1080] : [1080, 1920];
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('page error:', e.message));
  const url = pathToFileURL(pageFile).href + `?f=${fmt}&render=1`;
  await page.goto(url);
  // load every declared @font-face before the first frame (a late font swap shows up as a jump in the video)
  await page.evaluate(async () => {
    await Promise.all([...document.fonts].map(f => f.load().catch(() => {})));
    await document.fonts.ready;
    if ('__ready' in window) while (!window.__ready) await new Promise(r => setTimeout(r, 50));
  });
  const dur = await page.evaluate(() => window.DUR);
  if (!(dur > 0)) throw new Error('page has no window.DUR');
  return { page, dur };
}

const browser = await chromium.launch();
for (const fmt of fmts) {
  const label = fmt === 'l' ? 'landscape' : 'portrait';
  const { page, dur } = await open(browser, fmt);
  if (stills) {
    fs.mkdirSync('out', { recursive: true });
    for (const t of stills) {
      await page.evaluate(t => window.render(t), t);
      const f = path.join('out', `still-${name}-${label}-${String(t).replace('.', '_')}.png`);
      await page.screenshot({ path: f });
      console.log(f);
    }
    await page.close();
    continue;
  }
  const out = path.resolve(outTpl.replace('{fmt}', label));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(dur * FPS);
  for (let i = 0; i < total; i++) {
    await page.evaluate(t => window.render(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`${label}: ${i}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await page.close();
  console.log(out, `(${total} frames)`);
}
await browser.close();

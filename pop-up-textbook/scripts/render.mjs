// Render a pop-up-textbook page (its tour) to MP4 or to stills. The whole page is captured — 3D canvas, HUD,
// callouts, cards, the loupe and the tour cursor — so what you see live is what gets baked.
// Usage (from the project root; files are served from the current directory, so ../kit/ must be under it):
//   node <skill>/scripts/render.mjs <page.html> <out.mp4> [--fps 30] [--crf 18] [--from s --to s] [--size 1920x1080]
//   node <skill>/scripts/render.mjs <page.html> <dir> --stills 1.5,6,12     → <dir>/t001.5.png …
//   --query k=v&k2=v2 adds URL params. --jpeg pipes JPEG frames (faster, slightly softer).
//   The page must expose window.ready (Promise), window.renderAt(t) and window.DURATION (kit/book.js does).
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const args = process.argv.slice(2);
const flag = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : def; };
const bool = name => { const i = args.indexOf(name); if (i >= 0) args.splice(i, 1); return i >= 0; };
const fps = Number(flag('--fps', 30));
const stills = flag('--stills', null);
const crf = flag('--crf', '18');
const from = Number(flag('--from', 0)), to = flag('--to', null);
const query = flag('--query', '');
const size = flag('--size', '1920x1080').split('x').map(Number);
const jpeg = bool('--jpeg');
const [page, out] = args;
if (!page || !out) { console.error('usage: render.mjs <page.html> <out.mp4|dir> [--stills t1,t2] [--size WxH] [--fps 30]'); process.exit(1); }

const root = process.cwd();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  let file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/${path.relative(root, path.resolve(page)).split(path.sep).join('/')}?render${query ? '&' + query : ''}`;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const tab = await browser.newPage({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 });
tab.on('console', m => m.type() === 'error' && console.log('[page]', m.text()));
tab.on('pageerror', e => { console.error('[page error]', e); process.exitCode = 1; });
tab.on('requestfailed', r => console.log('[404]', r.url()));
await tab.goto(url);
await tab.evaluate(() => window.ready);
const duration = await tab.evaluate(() => window.DURATION);
const grab = async t => { await tab.evaluate(t => window.renderAt(t), t); return tab.screenshot({ type: jpeg ? 'jpeg' : 'png', quality: jpeg ? 92 : undefined }); };

if (stills) {
  fs.mkdirSync(out, { recursive: true });
  for (const t of stills.split(',').map(Number)) fs.writeFileSync(path.join(out, `t${t.toFixed(1).padStart(5, '0')}.png`), await grab(t));
  console.log(`wrote ${stills.split(',').length} stills to ${out}`);
} else {
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round((to === null ? duration : Math.min(Number(to), duration)) * fps);
  for (let f = Math.round(from * fps); f < total; f++) {
    const buf = await grab(f / fps);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % fps === 0) process.stdout.write(`\r${f}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log(`\nwrote ${out}`);
}
const layout = await tab.evaluate(() => window.book?.overflow || []);   // text that did not fit its page
for (const l of layout) console.log(l);
await browser.close();
server.close();

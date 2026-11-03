// holo-pass · render.mjs — stills, a contact sheet, or the MP4 of the reveal (envelope → pass → tilt → flip), frame by
// frame through invite.html?render=1 (every frame is seek(t), screenshotted). The music is rendered in the page with the
// same synth (OfflineAudioContext) and muxed in.
//   node <skill>/scripts/render.mjs invite.json                      → out/<name>.mp4 (1920×1080, with music)
//   node <skill>/scripts/render.mjs invite.json --size 1080x1920     → 9:16 (title, date and place under the card)
//   node <skill>/scripts/render.mjs invite.json --stills 2,4.2,6,9.6  → out/<name>-<t>.png
//   node <skill>/scripts/render.mjs invite.json --sheet 12           → out/<name>-sheet.jpg
// Options: --page pass/invite.html (default: the project's, else the skill's) · --themes themes.js (default: one next to
//          the invite.json) · --workers 3 · --fps 30 · --from/--to · --crf 18 · --mute
//          --out out/ · --name <name> · --scale .5 (preview: half-size frames)
// The invite can also be a theme id instead of a file (`render.mjs birthday --stills 6`) for a quick look at a template.
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const src = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1]?.startsWith('--') !== true) || '';
const page$ = resolve(opt('page', existsSync('pass/invite.html') ? 'pass/invite.html' : join(here, '../pass/invite.html')));
let invite, name;
if (src.endsWith('.json')) { invite = JSON.parse(readFileSync(src, 'utf8')); name = basename(src) === 'invite.json' ? basename(resolve(src, '..')) : basename(src, '.json'); }
else if (src) { invite = { theme: src }; name = src; }
else { console.error('usage: render.mjs <invite.json | theme> [--size 1920x1080] [--stills 2,6] [--sheet 12] [--workers 3]'); process.exit(1); }
name = opt('name', name);
let [SW, SH] = opt('size', '1920x1080').split('x').map(Number);
const scale = +opt('scale', 1); SW = Math.round(SW * scale / 2) * 2; SH = Math.round(SH * scale / 2) * 2;
if (SH > SW) name += '-9x16';
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const b64 = Buffer.from(JSON.stringify(invite)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
// a theme designed for this invite: themes.js next to invite.json (or --themes file.js) is loaded into the page
const themes$ = opt('themes') || (src.endsWith('.json') && existsSync(join(dirname(resolve(src)), 'themes.js')) ? join(dirname(resolve(src)), 'themes.js') : '');
const url = pathToFileURL(page$).href + `?render=1&size=${SW}x${SH}` + (src.endsWith('.json') ? '' : `&theme=${src}`)
  + (themes$ ? '&themes=' + encodeURIComponent(pathToFileURL(resolve(themes$)).href) : '') + (src.endsWith('.json') ? '#p=' + b64 : '');

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
async function open() {
  const page = await browser.newPage({ viewport: { width: SW, height: SH }, deviceScaleFactor: 1 });
  let failed = null;
  page.on('pageerror', e => { failed = failed || e; console.error('page error:', e.message); });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error(`console ${m.type()}:`, m.text().slice(0, 300)); });
  await page.goto(url, { waitUntil: 'load', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
    if (failed) throw new Error('page failed to load: ' + failed.message);
    if (Date.now() - t0 > 60000) throw new Error('page never set window.__ready');
    await new Promise(r => setTimeout(r, 100));
  }
  return page;
}
const grab = async (page, t) => { await page.evaluate(t => window.seek(t), t); return page.screenshot({ type: 'png' }); };

const probe = await open();
const DUR = await probe.evaluate(() => window.DURATION), FPS = +opt('fps', 30);
const from = +opt('from', 0), to = +opt('to', DUR);

const stills = opt('stills');
if (stills) {
  for (const s of stills.split(',').map(Number)) { const f = join(outDir, `${name}-${s}.png`); writeFileSync(f, await grab(probe, s)); console.log(f); }
  await browser.close(); process.exit(0);
}
const sheet = opt('sheet');
if (sheet) {
  const n = +sheet, cols = n <= 6 ? 3 : 4, rows = Math.ceil(n / cols), tmp = join(outDir, `.sheet-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp);
  const times = Array.from({ length: n }, (_, i) => from + (to - from - 0.05) * (n === 1 ? 0 : i / (n - 1)));
  for (const [i, t] of times.entries()) writeFileSync(join(tmp, `${String(i).padStart(3, '0')}.png`), await grab(probe, +t.toFixed(3)));
  const f = join(outDir, `${name}-sheet.jpg`), tw = SH > SW ? 360 : 640;
  execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${join(tmp, '%03d.png')}" -vf "scale=${tw}:-1,drawtext=text='%{eif\\:n*${((to - from - 0.05) / Math.max(1, n - 1)).toFixed(4)}+${from}\\:d}.%{eif\\:mod(n*${Math.round((to - from - 0.05) / Math.max(1, n - 1) * 10)}\\,10)\\:d}s':x=10:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.5,tile=${cols}x${rows}:padding=4:color=white" -frames:v 1 -q:v 3 "${f}"`);
  rmSync(tmp, { recursive: true, force: true }); console.log(f);
  await browser.close(); process.exit(0);
}

// music first (in the page, same synth as live), then frames in parallel chunks
let wav = null;
if (!args.includes('--mute')) {
  const music = await probe.evaluate(() => window.invite.music);
  if (music && music !== 'none') { wav = join(outDir, `${name}.wav`); writeFileSync(wav, Buffer.from(await probe.evaluate(d => window.renderWav(d), to - from), 'base64')); console.log(`${wav}  (${music})`); }
}
await probe.close();
const workers = +opt('workers', 3), crf = opt('crf', '18');
const n = Math.round((to - from) * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames @ ${FPS} fps, ${SW}×${SH}, ${workers} workers`);
const t0 = Date.now(); let done = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const page = await open();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', String(FPS * 2),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise(r => ff.on('close', r));
  for (let f = a; f < b; f++) {
    if (!ff.stdin.write(await grab(page, from + f / FPS))) await new Promise(r => ff.stdin.once('drain', r));
    if (++done % 30 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${done}/${n}  ${(s / done).toFixed(2)} s/frame  eta ${Math.round(s / done * (n - done))} s`); }
  }
  ff.stdin.end(); await closed; await page.close();
}));
await browser.close();
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map(f => `file '${f}'`).join('\n'));
const out = join(outDir, `${name}.mp4`);
if (wav) execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -i "${wav}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -t ${to - from} -movflags +faststart "${out}"`);
else execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy -movflags +faststart "${out}"`);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);

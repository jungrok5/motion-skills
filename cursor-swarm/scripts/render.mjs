// cursor-swarm · render.mjs — stills, a contact sheet, or the MP4 of one build page, frame by frame (every frame is seek(t)).
// Run from the project root:
//   node <skill>/scripts/render.mjs site.html --stills 7,12.5,21        → out/site-7.png …   (look at these a lot)
//   node <skill>/scripts/render.mjs site.html --sheet 16 --scale .5      → out/site-sheet.jpg (16 moments, 4 × 4)
//   node <skill>/scripts/render.mjs site.html --sheet 8 --from 5 --to 12 (a closer look at one stretch)
//   node <skill>/scripts/render.mjs site.html --sfx                      → out/site.mp4 with the build's own sound
//   node <skill>/scripts/render.mjs site.html --audio music.wav          → out/site.mp4 with your track
// Options: --scale .5 · --workers 4 · --fps 30 · --from/--to · --crf 20 · --sfx (clicks, typing, drops, ticks, a soft
//          pad and the publish chime, synthesised from window.film.events) · --sfx-only (just out/site-sfx.wav) · --out out/
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
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: render.mjs <site.html> [--stills 7,12] [--sheet 16] [--sfx] [--workers 4]'); process.exit(1); }
const name = opt('name', basename(page$) === 'index.html' ? basename(resolve(page$, '..')) : basename(page$).replace(/\.html$/, ''));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const scale = opt('scale', ''), extra = opt('q', '');
const url = pathToFileURL(page$).href + '?render=1' + (scale ? '&scale=' + scale : '') + (extra ? '&' + extra : '');

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
async function open() {
  const page = await browser.newPage({ viewport: { width: 540, height: 675 }, deviceScaleFactor: 1 });
  let failed = null;
  page.on('pageerror', e => { failed = failed || e; console.error('page error:', e.message); });
  page.on('console', m => { if (m.type() === 'error') console.error('console error:', m.text().slice(0, 400)); });
  await page.goto(url, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
    if (failed) throw new Error('page failed to load: ' + failed.message);
    if (Date.now() - t0 > 240000) throw new Error('page never set window.__ready');
    await new Promise(r => setTimeout(r, 100));
  }
  return page;
}
const grab = (page, t) => page.evaluate(t => { window.seek(t); return document.querySelector('canvas').toDataURL('image/png'); }, t);
const png = d => Buffer.from(d.split(',')[1], 'base64');

const probe = await open();
const DUR = await probe.evaluate(() => window.DURATION), FPS = +opt('fps', await probe.evaluate(() => window.FPS || 30));
const from = +opt('from', 0), to = +opt('to', DUR);

const stills = opt('stills');
if (stills) {
  for (const s of stills.split(',').map(Number)) {
    const t0 = Date.now(), f = join(outDir, `${name}-${s}.png`);
    writeFileSync(f, png(await grab(probe, s))); console.log(`${f}  (${Date.now() - t0} ms)`);
  }
  await browser.close(); process.exit(0);
}
const sheet = opt('sheet');
if (sheet) {
  const n = +sheet, cols = n <= 6 ? 3 : 4, tmp = join(outDir, `.sheet-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp);
  const ts = Array.from({ length: n }, (_, i) => from + (to - from - (to === DUR ? 1 / FPS : 0)) * (n === 1 ? 0 : i / (n - 1)));
  for (let i = 0; i < n; i++) { writeFileSync(join(tmp, `${String(i).padStart(3, '0')}.png`), png(await grab(probe, +ts[i].toFixed(3)))); process.stdout.write(`  ${i + 1}/${n} t=${ts[i].toFixed(2)}\r`); }
  const f = join(outDir, `${name}-sheet.jpg`), rows = Math.ceil(n / cols), step = (ts[1] ?? ts[0]) - ts[0];
  execSync(`ffmpeg -y -loglevel error -framerate 1 -i "${join(tmp, '%03d.png')}" -vf "scale=480:-1,drawtext=text='%{eif\\:n*${step.toFixed(4)}+${from}\\:d}s':x=10:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.5,tile=${cols}x${rows}:padding=4:color=white" -frames:v 1 -q:v 3 "${f}"`);
  rmSync(tmp, { recursive: true, force: true }); console.log(`\n${f}`);
  await browser.close(); process.exit(0);
}

// ── the sound of the build: every click, key, drop and painted cell in window.film.events becomes a short synthesised sound ──
async function sfx() {
  const ev = await probe.evaluate(() => window.film.events), SR = 48000, n = Math.ceil((to - from) * SR), L = new Float32Array(n), Rr = new Float32Array(n);
  let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const add = (t, dur, fn, gain, pan = 0) => { const i0 = Math.round((t - from) * SR); for (let i = 0; i < dur * SR; i++) { const j = i0 + i; if (j < 0 || j >= n) continue; const v = fn(i / SR) * gain; L[j] += v * (1 - pan) ; Rr[j] += v * (1 + pan); } };
  const blip = (f0, f1, d) => x => Math.sin(2 * Math.PI * (f0 * x + (f1 - f0) * x * x / (2 * d))) * Math.exp(-x / (d * .35));
  const noise = d => x => (rnd() * 2 - 1) * Math.exp(-x / (d * .25));
  const PENTA = [880, 988, 1175, 1319, 1480, 1760, 1976];
  let lastTick = -1;
  for (const e of ev) {
    if (e.t < from || e.t > to) continue;
    const pan = (rnd() - .5) * .6;
    if (e.k === 'key') { add(e.t, .03, noise(.03), .05 + rnd() * .03, pan); add(e.t, .02, blip(3200 + rnd() * 900, 2600, .02), .025, pan); }
    else if (e.k === 'click') { add(e.t, .05, blip(1900, 1500, .05), .16, pan); add(e.t, .02, noise(.02), .08, pan); }
    else if (e.k === 'release') add(e.t, .04, blip(1300, 1100, .04), .1, pan);
    else if (e.k === 'pop') add(e.t, .09, blip(620, 980, .09), .16, pan);
    else if (e.k === 'drop') { add(e.t, .22, blip(110, 48, .22), .5); add(e.t, .06, noise(.06), .07); }
    else if (e.k === 'whoosh') { let lp = 0; add(e.t, .5, x => { lp += ((rnd() * 2 - 1) - lp) * .08; return lp * Math.sin(Math.PI * x / .5) ** 2; }, .5, pan); }
    else if (e.k === 'tick') { if (e.t - lastTick < .014) continue; lastTick = e.t; add(e.t, .05, blip(PENTA[(e.a * 3) % PENTA.length], PENTA[(e.a * 3) % PENTA.length] * .98, .05), .045, ((e.a % 7) / 3 - 1) * .5); }
    else if (e.k === 'spawn') add(e.t, .06, blip(500 + (e.a % 12) * 60, 900 + (e.a % 12) * 60, .06), .05, pan);
    else if (e.k === 'publish') [523, 659, 784].forEach((f, i) => add(e.t + i * .09, .25, blip(f, f, .25), .12));
    else if (e.k === 'live') [523, 659, 784, 1047].forEach(f => add(e.t, 1.8, x => Math.sin(2 * Math.PI * f * x) * Math.exp(-x / .6) * (1 - Math.exp(-x * 200)), .09));
  }
  // a soft pad under it all
  const D = to - from; for (let i = 0; i < n; i++) { const x = i / SR, env = Math.min(1, x / 1.5, (D - x) / 1.5) * (.6 + .4 * Math.sin(x * .7)); const v = (Math.sin(2 * Math.PI * 130.8 * x) + .7 * Math.sin(2 * Math.PI * 196 * x) + .45 * Math.sin(2 * Math.PI * 329.6 * x + Math.sin(x * 1.3))) * .018 * env; L[i] += v; Rr[i] += v; }
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rr[i]));
  const k = .89 / Math.max(1e-6, peak), buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * k)) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, Rr[i] * k)) * 32767), 46 + i * 4); }
  const f = join(outDir, `${name}-sfx.wav`); writeFileSync(f, buf); console.log(`${f}  (${ev.length} events, peak ${(peak * k).toFixed(2)})`); return f;
}
let audio = opt('audio') ? resolve(opt('audio')) : null;
if (args.includes('--sfx') || args.includes('--sfx-only')) audio = await sfx();
if (args.includes('--sfx-only')) { await browser.close(); process.exit(0); }
await probe.close();

// the MP4: each worker owns a contiguous run of frames and pipes PNGs into its own ffmpeg; chunks are joined losslessly
const workers = +opt('workers', 3), crf = opt('crf', '20');
const n = Math.round((to - from) * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames @ ${FPS} fps, ${workers} workers`);
const t0 = Date.now(); let done = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const page = await open();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', String(FPS * 2),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise(r => ff.on('close', r));
  for (let f = a; f < b; f++) {
    if (!ff.stdin.write(png(await grab(page, from + f / FPS)))) await new Promise(r => ff.stdin.once('drain', r));
    if (++done % 30 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${done}/${n}  ${(s / done).toFixed(2)} s/frame  eta ${Math.round(s / done * (n - done))} s`); }
  }
  ff.stdin.end(); await closed; await page.close();
}));
await browser.close();
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map(f => `file '${f}'`).join('\n'));
const out = join(outDir, `${name}.mp4`);
if (audio) execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -i "${audio}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -af "afade=t=out:st=${(to - from - .6).toFixed(2)}:d=0.6" -t ${to - from} -movflags +faststart "${out}"`);
else execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy -movflags +faststart "${out}"`);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);

// sprite-stack-flight · render.mjs — stills, a contact sheet, or the loop MP4 of one scene page (every frame is seek(t)).
// Run from the project root:
//   node <skill>/scripts/render.mjs scene.html --stills 0,17.3,30     → out/scene-17.3.png … (scaled ×4, look at these)
//   node <skill>/scripts/render.mjs scene.html --sheet 8               → out/scene-sheet.png (8 moments across the loop)
//   node <skill>/scripts/render.mjs scene.html                         → out/scene.mp4 (one loop, 1920×1080, H.264)
//   node <skill>/scripts/render.mjs scene.html --q "pass=light"        (any page query: pass=base|light, off=rain,light,…)
// Options: --scale 4 (8 = 4K from 480×270)  --workers 2  --crf 16  --out out/  --gif 6 (also a short preview GIF, seconds)
//          --mute (no sound). By default the MP4 gets a synthesised track from the flight itself: engine (pitch follows
//          the throttle, louder in the cockpit), wind (follows the speed), a whoosh in rolls. Same t → same samples.
//   node <skill>/scripts/render.mjs index.html --q map=1 --stills 0   → the plan map;  --q sheet=craft --stills 0 → craft sheet
// The page canvas is tiny (480×270), so frames are cheap; ffmpeg scales them up nearest-neighbour, so pixels stay square
// and sharp. An integer scale ≥ 2 also keeps the 4:2:0 chroma blocks inside one pixel, so colours do not bleed.
import { createRequire } from 'node:module';
import { spawn, execFileSync, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: render.mjs <scene.html> [--stills 0,5] [--sheet 8] [--scale 4] [--gif 6]'); process.exit(1); }
const name = opt('name', basename(page$) === 'index.html' ? basename(resolve(page$, '..')) : basename(page$).replace(/\.html$/, ''));
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const workers = +opt('workers', 2), crf = opt('crf', '16'), extra = opt('q', '');
const url = pathToFileURL(page$).href + '?render=1' + (extra ? '&' + extra : '');

const browser = await chromium.launch();
async function open() {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  let failed = null;
  page.on('pageerror', e => { failed = failed || e; console.error('page error:', e.message); });
  page.on('console', m => { if (m.type() === 'error') console.error('console error:', m.text().slice(0, 400)); });
  await page.goto(url, { waitUntil: 'load', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
    if (failed) throw new Error('scene failed to load: ' + failed.message);
    if (Date.now() - t0 > 60000) throw new Error('scene never set window.__ready');
    await new Promise(r => setTimeout(r, 50));
  }
  return page;
}
// one frame as PNG bytes, upscaled in the page (nearest) when k > 1
const grab = (page, t, k = 1) => page.evaluate(([t, k]) => {
  window.seek(t); const c = document.querySelector('canvas');
  if (k === 1) return c.toDataURL('image/png');
  const o = document.createElement('canvas'); o.width = c.width * k; o.height = c.height * k;
  const x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, o.width, o.height); return o.toDataURL('image/png');
}, [t, k]).then(d => Buffer.from(d.split(',')[1], 'base64'));

const probe = await open();
const { LOOP, FPS, W, H, SCALE } = await probe.evaluate(() => ({ LOOP: window.DURATION, FPS: window.FPS, W: window.PIXEL.W, H: window.PIXEL.H, SCALE: window.PIXEL.scale }));
const scale = +opt('scale', SCALE), tag = extra ? '-' + extra.replace(/[^a-z0-9]+/gi, '') : '';

if (opt('stills')) {
  for (const s of opt('stills').split(',').map(Number)) {
    const f = join(outDir, `${name}${tag}-${s}.png`); writeFileSync(f, await grab(probe, s, scale)); console.log(f);
  }
  await browser.close(); process.exit(0);
}
if (opt('sheet')) {
  // a grid of moments across the loop, each at ×2, labelled with its time
  const n = +opt('sheet'), cols = n > 4 ? 4 : n, times = Array.from({ length: n }, (_, i) => +(LOOP * i / n).toFixed(2));
  const shots = []; for (const t of times) shots.push((await grab(probe, t, 2)).toString('base64'));
  const png = await probe.evaluate(async ([shots, times, cols]) => {
    const imgs = await Promise.all(shots.map(s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; })));
    const w = imgs[0].width, h = imgs[0].height, rows = Math.ceil(imgs.length / cols), c = document.createElement('canvas');
    c.width = cols * w + (cols - 1) * 8; c.height = rows * h + (rows - 1) * 8; const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
    imgs.forEach((im, i) => { const X = (i % cols) * (w + 8), Y = Math.floor(i / cols) * (h + 8); x.drawImage(im, X, Y); x.fillStyle = '#000a'; x.fillRect(X, Y, 86, 26); x.fillStyle = '#fff'; x.font = '18px monospace'; x.fillText(times[i] + ' s', X + 8, Y + 19); });
    return c.toDataURL('image/png');
  }, [shots, times, cols]);
  const f = join(outDir, `${name}${tag}-sheet.png`); writeFileSync(f, Buffer.from(png.split(',')[1], 'base64')); console.log(f);
  await browser.close(); process.exit(0);
}
await probe.close();

// ---- the loop MP4: frames 0 … n-1 (frame n would be frame 0 again) ----
const n = Math.round(LOOP * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames (${LOOP} s @ ${FPS} fps), ${W}×${H} → ${W * scale}×${H * scale}, ${workers} workers`);
const t0 = Date.now(); let done = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const page = await open();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-vf', `scale=${W * scale}:${H * scale}:flags=neighbor`, '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-tune', 'animation',
    '-pix_fmt', 'yuv420p', '-g', String(FPS * 2), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-movflags', '+faststart', join(tmp, `${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise(r => ff.on('close', r));
  for (let f = a; f < b; f++) {
    const buf = await grab(page, f / FPS);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (++done % 150 === 0) { const s = (Date.now() - t0) / 1000; console.log(`  ${done}/${n}  ${(s / done * 1000).toFixed(0)} ms/frame  eta ${Math.round(s / done * (n - done))} s`); }
  }
  ff.stdin.end(); await closed; await page.close();
}));
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map(f => `file '${f}'`).join('\n'));
const out = join(outDir, `${name}.mp4`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
// ---- the sound: synthesised from the flight (deterministic), muxed under the video ----
if (!args.includes('--mute')) {
  const sp = await (await open()).evaluate(([n, fps]) => { const out = [], snd = window.FLIGHT.sound, steps = window.FLIGHT.steps;
    for (let f = 0; f <= n; f++) { const t = f / fps, s = window.FLIGHT.sample(t), st = steps.find(x => t < x.t1) || steps[steps.length - 1]; out.push([s.v, s.thr, s.rolling, ['over', 'chase', 'cockpit'].indexOf(st.cam), s.bank]); }
    return { out, snd }; }, [n, FPS]);
  const SR = 48000, total = Math.round(LOOP * SR), pcm = new Float32Array(total), snd = sp.snd, v0 = sp.out.reduce((a, r) => a + r[0], 0) / sp.out.length;
  let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 2147483648 - 1;
  let ph = 0, lw = 0, lw2 = 0, lr = 0, le = 0, gE = 0, gW = 0, peak = 1e-9;
  const camGain = [[.35, .55], [.6, .6], [.95, .35]];             // [engine, wind] per camera: over, chase, cockpit
  for (let i = 0; i < total; i++) {
    const fpos = i / SR * FPS, k = Math.min(sp.out.length - 2, Math.floor(fpos)), u = fpos - k, a = sp.out[k], b = sp.out[k + 1];
    const v = a[0] + (b[0] - a[0]) * u, thr = a[1] + (b[1] - a[1]) * u, roll = a[2] + (b[2] - a[2]) * u, cg = camGain[a[3]] || camGain[1];
    gE += ((cg[0] * snd.level) - gE) * .0004; gW += ((cg[1] * snd.wind) - gW) * .0004;
    const f0 = snd.hz * (.8 + .55 * thr); ph += f0 / SR;
    let eng = 0; if (snd.engine === 'jet') { lr += (rnd() - lr) * (.02 + .1 * thr); eng = lr * 2.2 + Math.sin(ph * 6.283 * 7) * .08; }
    else { for (let h = 1; h <= 7; h++) eng += Math.sin(ph * 6.283 * h + h) / h; if (snd.engine === 'prop') eng *= .65 + .35 * Math.sin(ph * 6.283 * .5) ** 2; eng *= .32; }
    le += (eng - le) * (a[3] === 2 ? .5 : .18);                         // muffled outside, bright in the cockpit
    const n0 = rnd(); lw += (n0 - lw) * (.012 + .03 * v / Math.max(1, v0)); lw2 += (lw - lw2) * .3;
    const wind = lw2 * 3.2 * (v / Math.max(1, v0)) * (1 + Math.abs(a[4]) * .4);
    const whoosh = roll > 0 ? (rnd() * .5 + lw * 2) * roll * .5 : 0;
    const t = i / SR, fade = Math.min(1, t / .6, (LOOP - t) / .8);
    pcm[i] = (le * gE + wind * gW + whoosh) * fade; peak = Math.max(peak, Math.abs(pcm[i]));
  }
  const g = .8 / peak, wav = Buffer.alloc(44 + total * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + total * 2, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(total * 2, 40);
  for (let i = 0; i < total; i++) wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, pcm[i] * g)) * 32767), 44 + i * 2);
  const wf = join(outDir, `${name}.wav`), mf = join(outDir, `${name}.av.mp4`); writeFileSync(wf, wav);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-i', wf, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', mf]);
  execFileSync('mv', [mf, out]); rmSync(wf);
  console.log(`${out}  (+ synthesised sound, peak normalised)`);
}
const gif = opt('gif');
if (gif) {
  const g = join(outDir, `${name}.gif`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-t', gif, '-i', out, '-vf', `fps=15,scale=${W * 2}:${H * 2}:flags=neighbor,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=none`, g]);
  console.log(g);
}
await browser.close();

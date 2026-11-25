// trail-texture-world · render.mjs — stills, a contact sheet, the cast sheet / route map, or the MP4 (every frame is seek(t)).
// Run from the project root:
//   node <skill>/scripts/render.mjs index.html --stills 3,12.5,20      → out/<name>-12.5.png … (scaled ×6 = 1920×1080; look at these)
//   node <skill>/scripts/render.mjs index.html --sheet 8                → out/<name>-sheet.png (8 moments across the film, ×2)
//   node <skill>/scripts/render.mjs index.html --q sheet=cast --stills 0 → the cast sheet (640×360 page, ×3)
//   node <skill>/scripts/render.mjs index.html --q map=1 --stills 0      → the route map
//   node <skill>/scripts/render.mjs index.html                          → out/<name>.mp4 (1920×1080, H.264, with sound)
//   node <skill>/scripts/render.mjs index.html --q "view=split"         (any page query: view=world|split|trail, off=trail,blades,light …)
// Options: --scale 6 (12 = 4K from 320×180)  --workers 2  --crf 16  --out out/  --gif 6 (also a short GIF preview)  --mute
// The sound is synthesised from the walk itself, deterministically: every footprint makes the sound of the ground it lands on
// (snow crunch, reed swish, splash, mud squelch, sand hiss, leaf crackle, soft moss, tap on hard ground), landings thump,
// and under it a bed of wind, water near the walker, and crickets at night.
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
if (!existsSync(page$)) { console.error('usage: render.mjs <index.html> [--stills 0,5] [--sheet 8] [--scale 6] [--q view=split] [--gif 6] [--mute]'); process.exit(1); }
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
    if (failed) throw new Error('page failed to load: ' + failed.message);
    if (Date.now() - t0 > 60000) throw new Error('page never set window.__ready');
    await new Promise(r => setTimeout(r, 50));
  }
  return page;
}
const grab = (page, t, k = 1) => page.evaluate(([t, k]) => {
  window.seek(t); const c = document.querySelector('canvas');
  if (k === 1) return c.toDataURL('image/png');
  const o = document.createElement('canvas'); o.width = c.width * k; o.height = c.height * k;
  const x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, o.width, o.height); return o.toDataURL('image/png');
}, [t, k]).then(d => Buffer.from(d.split(',')[1], 'base64'));

const probe = await open();
const { DUR, FPS, W, H, SCALE } = await probe.evaluate(() => ({ DUR: window.DURATION, FPS: window.FPS, W: window.PIXEL.W, H: window.PIXEL.H, SCALE: window.PIXEL.scale }));
const scale = +opt('scale', SCALE), tag = extra ? '-' + extra.replace(/[^a-z0-9]+/gi, '') : '';

if (opt('stills')) {
  for (const s of opt('stills').split(',').map(Number)) { const f = join(outDir, `${name}${tag}-${s}.png`); writeFileSync(f, await grab(probe, s, scale)); console.log(f); }
  await browser.close(); process.exit(0);
}
if (opt('sheet')) {
  const n = +opt('sheet'), cols = n > 4 ? 4 : n, times = Array.from({ length: n }, (_, i) => +(DUR * (i + .5) / n).toFixed(2));
  const shots = []; for (const t of times) shots.push((await grab(probe, t, 2)).toString('base64'));
  const png = await probe.evaluate(async ([shots, times, cols]) => {
    const imgs = await Promise.all(shots.map(s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; })));
    const w = imgs[0].width, h = imgs[0].height, rows = Math.ceil(imgs.length / cols), c = document.createElement('canvas');
    c.width = cols * w + (cols - 1) * 6; c.height = rows * h + (rows - 1) * 6; const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
    imgs.forEach((im, i) => { const X = (i % cols) * (w + 6), Y = Math.floor(i / cols) * (h + 6); x.drawImage(im, X, Y); x.fillStyle = '#000a'; x.fillRect(X, Y, 70, 22); x.fillStyle = '#fff'; x.font = '15px monospace'; x.fillText(times[i] + ' s', X + 6, Y + 16); });
    return c.toDataURL('image/png');
  }, [shots, times, cols]);
  const f = join(outDir, `${name}${tag}-sheet.png`); writeFileSync(f, Buffer.from(png.split(',')[1], 'base64')); console.log(f);
  await browser.close(); process.exit(0);
}

// ---- the MP4 ----
const n = Math.round(DUR * FPS), per = Math.ceil(n / workers);
const tmp = join(outDir, `.chunks-${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`${name}: ${n} frames (${DUR} s @ ${FPS} fps), ${W}×${H} → ${W * scale}×${H * scale}, ${workers} workers`);
const t0 = Date.now(); let done = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
  const page = w === 0 ? probe : await open();
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
  ff.stdin.end(); await closed;
}));
const list = join(tmp, 'list.txt');
writeFileSync(list, Array.from({ length: workers }, (_, w) => join(tmp, `${String(w).padStart(2, '0')}.mp4`)).filter(existsSync).map(f => `file '${f}'`).join('\n'));
const out = join(outDir, `${name}.mp4`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);

// ---- the sound, from the walk (deterministic) ----
if (!args.includes('--mute')) {
  const info = await probe.evaluate(([n, fps]) => {
    const T = window.TRAIL, mats = Object.fromEntries(T.world.materials.map(m => [m.name, m])), out = [];
    // how much water is round the walker, per frame (for the water bed)
    for (let f = 0; f <= n; f++) { const s = T.samples[Math.min(T.samples.length - 1, Math.round(f / fps * T.HZ))]; let w = 0, k = 0;
      for (let a = 0; a < 12; a++) for (const r of [10, 30, 55]) { k++; const m = mats[T.matAt(s.x + Math.cos(a / 12 * 6.283) * r, s.y + Math.sin(a / 12 * 6.283) * r)]; if (m && m.kind === 'water') w += 1; }
      out.push([w / k, Math.hypot(s.vx, s.vy)]); }
    const ev = T.stamps.filter(s => s.kind === 'foot' || s.kind === 'land').map(s => ({ t: s.t, s: s.s, kind: s.kind, sound: (mats[s.mat] || {}).sound || 'tap' }));
    return { out, ev, night: T.night };
  }, [n, FPS]);
  const SR = 48000, total = Math.round(DUR * SR), pcm = new Float32Array(total);
  let seed = 9871; const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 2147483648 - 1;
  const add = (i, v) => { if (i >= 0 && i < total) pcm[i] += v; };
  // one footstep: a few recipes made of filtered noise, clicks and short tones
  function step(t, kind, gain, land) {
    const i0 = Math.round(t * SR); let lp = 0, lp2 = 0;
    const env = (u, a, d) => u < a ? u / a : Math.exp(-(u - a) / d);
    const noise = (len, a, d, lpk, hpk, g) => { lp = 0; lp2 = 0; for (let j = 0; j < len * SR; j++) { const x = rnd(); lp += (x - lp) * lpk; lp2 += (lp - lp2) * hpk; add(i0 + j, (lp - lp2) * env(j / SR, a, d) * g * gain); } };
    const clicks = (nc, spread, len, lpk, g) => { for (let c = 0; c < nc; c++) { const o = Math.round((rnd() * .5 + .5) * spread * SR * (c / nc)); let l = 0; for (let j = 0; j < len * SR; j++) { l += (rnd() - l) * lpk; add(i0 + o + j, l * Math.exp(-j / (len * SR * .3)) * g * gain * (1 - c / nc * .5)); } } };
    const tone = (f0, f1, len, g) => { let ph = 0; for (let j = 0; j < len * SR; j++) { const u = j / (len * SR); ph += (f0 + (f1 - f0) * u) / SR; add(i0 + j, Math.sin(ph * 6.283) * Math.exp(-u * 5) * g * gain); } };
    if (kind === 'crunch') { clicks(9, .09, .006, .5, .9); noise(.1, .004, .03, .35, .08, .35); }
    else if (kind === 'swish') noise(.2, .03, .06, .55, .25, .6);
    else if (kind === 'hiss') noise(.12, .01, .035, .7, .3, .45);
    else if (kind === 'splash') { noise(.28, .005, .07, .3, .03, .9); tone(700, 220, .07, .25); for (let b = 0; b < 3; b++) { const o = (.03 + rnd() * .1 + .05) * SR; let ph = 0, f = 900 + rnd() * 700; for (let j = 0; j < .04 * SR; j++) { ph += (f * (1 + j / SR * 8)) / SR; add(i0 + o + j, Math.sin(ph * 6.283) * Math.exp(-j / (.012 * SR)) * .12 * gain); } } }
    else if (kind === 'squelch') { noise(.16, .01, .05, .12, .02, 1.1); tone(190, 80, .12, .3); }
    else if (kind === 'crackle') { clicks(12, .16, .004, .8, .7); noise(.14, .01, .04, .5, .2, .25); }
    else if (kind === 'soft') noise(.09, .006, .03, .08, .01, 1.0);
    else { clicks(1, .001, .004, .9, .9); tone(880 + rnd() * 120, 700, .05, .2); }
    if (land) { tone(90, 50, .16, .55); noise(.12, .002, .04, .06, .005, 1.2); }
  }
  for (const e of info.ev) step(e.t, e.sound, (e.kind === 'land' ? .6 : .55) * (e.s > 1 ? 1.2 : 1), e.kind === 'land');
  // the bed: wind (always), water (near water), crickets (at night)
  let wl = 0, wl2 = 0, bl = 0, bl2 = 0, gW = 0;
  for (let i = 0; i < total; i++) {
    const t = i / SR, fpos = t * FPS, k = Math.min(info.out.length - 2, Math.floor(fpos)), u = fpos - k, water = info.out[k][0] * (1 - u) + info.out[k + 1][0] * u;
    const x = rnd(); wl += (x - wl) * .006; wl2 += (wl - wl2) * .3;
    const wind = wl2 * 2.2 * (.55 + .45 * Math.sin(t * .37 + Math.sin(t * .11) * 2));
    bl += (rnd() - bl) * .08; bl2 += (bl - bl2) * .02; gW += (water - gW) * .0005;
    const babble = (bl - bl2) * 1.4 * gW * (.6 + .4 * Math.sin(t * 7.3 + Math.sin(t * 2.1) * 3));
    let cr = 0; if (info.night) { const ph = (t * 2.3) % 1; if (ph < .35 && Math.floor(t * 2.3) % 3 !== 2) cr = Math.sin(t * 4600 * 6.283) * (Math.sin(ph / .35 * Math.PI * 6) > 0 ? .018 : 0); }
    const fade = Math.min(1, t / .8, (DUR - t) / 1);
    pcm[i] = (pcm[i] + wind * .35 + babble * .8 + cr) * fade;
  }
  // level: footsteps should carry, so normalise to the loud end of the steps (99.7th percentile), not the one landing, and
  // let a soft limiter (tanh) round off the peaks above it
  const mags = []; for (let i = 0; i < total; i += 7) mags.push(Math.abs(pcm[i])); mags.sort((a, b) => a - b);
  const ref = Math.max(1e-6, mags[Math.floor(mags.length * .997)]), g0 = .55 / ref;
  for (let i = 0; i < total; i++) pcm[i] = Math.tanh(pcm[i] * g0 * 1.1) / 1.1;
  const g = .92, wav = Buffer.alloc(44 + total * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + total * 2, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(total * 2, 40);
  for (let i = 0; i < total; i++) wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, pcm[i] * g)) * 32767), 44 + i * 2);
  const wf = join(outDir, `${name}.wav`), mf = join(outDir, `${name}.av.mp4`); writeFileSync(wf, wav);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-i', wf, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', mf]);
  execFileSync('mv', [mf, out]); rmSync(wf);
  console.log(`${out}  (+ ${info.ev.length} synthesised footsteps, wind${info.out.some(r => r[0] > 0) ? ', water' : ''}${info.night ? ', crickets' : ''})`);
}
const gif = opt('gif');
if (gif) {
  const g = join(outDir, `${name}.gif`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-t', gif, '-i', out, '-vf', `fps=15,scale=${W * 2}:${H * 2}:flags=neighbor,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=none`, g]);
  console.log(g);
}
await browser.close();

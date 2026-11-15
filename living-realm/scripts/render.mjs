// living-realm · render.mjs — stills, a contact sheet of every view in every state, or a film of the tour.
// Builds index.html first.  Run from anywhere:
//   node <skill>/scripts/render.mjs <realm-dir> --shot "cam=0,60,0,0;tod=16.6" [--shot "…;wx=rain"]   → out/shot-1.jpg …
//   node <skill>/scripts/render.mjs <realm-dir> --views                    → out/<view>.jpg for each of the realm's views
//   node <skill>/scripts/render.mjs <realm-dir> --sheet [--scale .5]       → out/sheet.jpg: every view × day, dusk, night, rain, snow
//   node <skill>/scripts/render.mjs <realm-dir> --film [--seconds 60] [--fps 30]   → out/film.mp4: the tour with the automatic round
// A shot is `key=value;…`: cam=x,z,yaw°,pitch°[,y]  tod=hours  wx=clear|rain|snow|winter|autumn  season=0..1  snow=0..1  wet=0..1  frames=n  t=seconds
// Options: --size 1280x720  --q "q=high&mat=1024" (page options)  --frames 12  --out out  --name <file stem>  --no-build  --png
// Without a GPU WebGL runs on the CPU (SwiftShader): expect 10–40 s per 720p still.  On a machine with a GPU add --gpu.
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from './build.mjs';

const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2);
const has = (k) => args.includes('--' + k);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 && args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const all = (k) => args.map((a, i) => (a === '--' + k ? args[i + 1] : null)).filter(Boolean);
const dir = resolve(args[0] && !args[0].startsWith('--') ? args[0] : '.');
if (!existsSync(join(dir, 'src'))) { console.error('usage: render.mjs <realm-dir> [--shot "cam=…;tod=…" | --views | --sheet | --film] [--size 1280x720] [--q "q=high"]'); process.exit(1); }
if (!has('no-build')) build(dir, { quiet: true });
const outDir = resolve(dir, opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const [W, H] = opt('size', '1280x720').split('x').map(Number), scale = +opt('scale', '1'), w = Math.round(W * scale), h = Math.round(H * scale);
const frames = +opt('frames', '12'), ext = has('png') ? 'png' : 'jpg', mime = has('png') ? 'image/png' : 'image/jpeg';
const ARGS = has('gpu') ? ['--allow-file-access-from-files', '--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=default'] : ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-dev-shm-usage'];
export async function open(query = '', quiet = false) {
  const browser = await chromium.launch({ args: ARGS });
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  let failed = null; const seen = new Set();
  page.on('pageerror', (e) => { failed = failed || e; console.error('page error:', e.message.slice(0, 2000)); });
  page.on('console', (m) => { const t = m.text(); if (/GPU stall|ReadPixels|Automatic fallback|useProgram: program not valid/.test(t)) return; const k = t.slice(0, 200); if (seen.has(k)) return; seen.add(k); if (m.type() === 'error' || m.type() === 'warning') { if (!quiet && seen.size < 8) console.error(`console ${m.type()}:`, t.replace(/\n\s*\n/g, '\n').slice(0, 1800)); if (/Shader Error|not compiled|program not valid/.test(t)) failed = failed || new Error('a shader failed: ' + t.slice(0, 400)); } });
  const url = pathToFileURL(join(dir, 'index.html')).href + `?render=1&w=${w}&h=${h}&frames=2` + (opt('q', '') ? '&' + opt('q', '') : '') + (query ? '&' + query : '');
  await page.goto(url, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); ;) {
    const s = await page.evaluate(() => [window.READY === true, window.FAILED || null]);
    if (s[1]) { await browser.close(); throw new Error('the realm failed to load: ' + s[1]); } if (failed) { await browser.close(); throw new Error('the realm failed to load: ' + failed.message); }
    if (s[0]) break; if (Date.now() - t0 > 1200000) { await browser.close(); throw new Error('the page never set window.READY'); }
    await new Promise((r) => setTimeout(r, 250));
  }
  return { browser, page };
}
export const parseShot = (s) => { const o = {}; for (const kv of s.split(';')) { const [k, v] = kv.split('=').map((x) => x.trim()); if (!k) continue; if (k === 'cam') o.cam = v.split(',').map(Number); else if (k === 'wx' || k === 'weather') o.weather = v; else o[k] = +v; } return o; };
export const shoot = (page, o, type = mime) => page.evaluate(([o, type]) => { const info = window.realm.shot(o); return { info, url: window.realm.canvas.toDataURL(type, 0.92) }; }, [o, type]);
const save = (f, url) => writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
const ff = (a) => new Promise((res, rej) => { const p = spawn('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' }); p.on('exit', (c) => (c ? rej(new Error('ffmpeg failed')) : res())); });
export const STATES = [['day', { tod: 13.5, weather: 'clear' }], ['dusk', { tod: 19.6, weather: 'clear' }], ['night', { tod: 23, weather: 'clear' }], ['rain', { tod: 14.5, weather: 'rain' }], ['snow', { tod: 11, weather: 'snow' }]];

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const t00 = Date.now(), { browser, page } = await open();
  const base = await page.evaluate(() => ({ gpu: window.realm.info().gpu, views: (window.realm.LR.cfg.views || []).map((v) => ({ name: v.name, cam: v.cam, tod: v.tod, weather: v.weather })) }));
  console.log(`${base.gpu} · loaded in ${((Date.now() - t00) / 1000).toFixed(1)} s`);
  try {
    if (has('film')) {
      const fps = +opt('fps', '30'), secs = +opt('seconds', '60'), tmp = join(outDir, '.film'); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
      await page.evaluate(([fps]) => window.realm.filmStart(fps), [fps]);
      for (let i = 0, n = Math.round(fps * secs); i < n; i++) { const url = await page.evaluate(() => { window.realm.filmFrame(); return window.realm.canvas.toDataURL('image/jpeg', 0.95); }); save(join(tmp, String(i).padStart(6, '0') + '.jpg'), url); if (i % fps === 0) console.log(`  ${i}/${n} frames · ${((Date.now() - t00) / 1000).toFixed(0)} s`); }
      const out = join(outDir, opt('name', 'film') + '.mp4'); await ff(['-framerate', String(fps), '-i', join(tmp, '%06d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', opt('crf', '17'), '-movflags', '+faststart', out]); if (!has('keep')) rmSync(tmp, { recursive: true, force: true }); console.log(out);
    } else if (has('sheet')) {
      if (!base.views.length) throw new Error('the realm has no views: add views:[{ name, cam:[x,z,yaw,pitch] }] to LR.start({ … })');
      const tmp = join(outDir, '.sheet'); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true }); let k = 0; const names = (opt('only', '') || '').split(',').filter(Boolean), views = base.views.filter((v) => !names.length || names.includes(v.name));
      for (const v of views) for (const [sn, st] of STATES) { const a = Date.now(), r = await shoot(page, Object.assign({ cam: v.cam, frames }, st), 'image/jpeg'); save(join(tmp, String(k++).padStart(3, '0') + '.jpg'), r.url); console.log(`  ${v.name} · ${sn}  ${((Date.now() - a) / 1000).toFixed(1)} s  ${r.info.calls} calls ${(r.info.tris / 1e6).toFixed(2)} M tris`); }
      const out = join(outDir, opt('name', 'sheet') + '.jpg'), tw = Math.round(1600 / STATES.length); await ff(['-framerate', '1', '-i', join(tmp, '%03d.jpg'), '-vf', `scale=${tw}:-1,tile=${STATES.length}x${views.length}:padding=4:color=black`, '-frames:v', '1', '-q:v', '3', out]); if (!has('keep')) rmSync(tmp, { recursive: true, force: true }); console.log(out, '(columns: ' + STATES.map((s) => s[0]).join(', ') + ')');
    } else {
      const shots = has('views') ? base.views.map((v) => ({ name: v.name, o: { cam: v.cam, tod: v.tod, weather: v.weather } })) : all('shot').map((s, i) => ({ name: opt('name', 'shot') + (all('shot').length > 1 ? '-' + (i + 1) : ''), o: parseShot(s) }));
      if (!shots.length) throw new Error('nothing to render: --shot "cam=…", --views, --sheet or --film');
      for (const s of shots) { const a = Date.now(), r = await shoot(page, Object.assign({ frames }, s.o)); const f = join(outDir, s.name + '.' + ext); save(f, r.url); console.log(f, `${((Date.now() - a) / 1000).toFixed(1)} s`, JSON.stringify({ calls: r.info.calls, allCalls: r.info.allCalls, tris: r.info.tris, lights: r.info.lights, tod: r.info.tod, wx: r.info.wx })); }
    }
  } finally { await browser.close(); }
}

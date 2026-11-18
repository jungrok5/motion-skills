// machine-wilds · render.mjs — stills, a contact sheet of every view in every state, or a film of the tour.
// Builds index.html first.  Run from anywhere:
//   node <skill>/scripts/render.mjs <realm-dir> --shot "cam=0,60,0,0;tod=16.6" [--shot "…;wx=rain"]   → out/shot-1.jpg …
//   node <skill>/scripts/render.mjs <realm-dir> --views                    → out/<view>.jpg for each of the realm's views
//   node <skill>/scripts/render.mjs <realm-dir> --sheet [--scale .5]       → out/sheet.jpg: every view × day, dusk, night, rain, snow
//   node <skill>/scripts/render.mjs <realm-dir> --tour 12 [--scale .5]     → out/tour.jpg: 12 stills along the tour, as its camera sees them
//   node <skill>/scripts/render.mjs <realm-dir> --film [--seconds 60] [--fps 30]   → out/film.mp4: the tour with the automatic round
//   node <skill>/scripts/render.mjs <realm-dir> --phone [--seconds 2.5]    → out/phone.jpg: what a phone shows — the tour at a phone's canvas, tier and
//                                                                            starting scale, as its 1170-pixel screen stretches it (judge sharpness here)
//   node <skill>/scripts/render.mjs <realm-dir> --mats                     → out/mats.jpg: every material layer, scan or recipe, under a raking light
//   node <skill>/scripts/render.mjs <realm-dir> --cast [kind,…] [--size 640x480]   → out/cast-<kind>.jpg: each machine alone in a studio beside a 1.75 m figure —
//                                                                            front, back, both sides, the four three-quarters, then the walk from both sides, standing, its move (gather, peak, recover)
// A shot is `key=value;…`: cam=x,z,yaw°,pitch°[,y]  tod=hours  wx=clear|rain|snow|winter|autumn|mist  season=0..1  snow=0..1  wet=0..1  frames=n  t=seconds
//   up=metres (the eye that far above the ground: a look from above)  dof=amount (the lens: 1 is the tour's, 0 none)  focus=metres (else the middle of the picture)
// Options: --state "tod=17;wx=rain" (for --tour)  --size 1280x720  --q "q=high&mat=1024" (page options)  --frames 12  --out out  --name <file stem>  --no-build  --png
// The page is opened from disk with file access allowed, so it can read its scans from assets/ (--q "scan=0" to leave them out).
// Without a GPU WebGL runs on the CPU (SwiftShader): expect 1–4 minutes per 720p still on `high`.  On a machine with a GPU add --gpu.
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
if (!existsSync(join(dir, 'src'))) { console.error('usage: render.mjs <realm-dir> [--shot "cam=…;tod=…" | --views | --sheet | --tour 12 | --film | --phone | --mats] [--size 1280x720] [--q "q=high"]'); process.exit(1); }
if (!has('no-build')) build(dir, { quiet: true });
const outDir = resolve(dir, opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const PHONE = has('phone'), Q = opt('q', PHONE ? 'q=low&scale=0.7&heavy=0' : '');      // --phone: a 390 × 844 screen at two canvas pixels a CSS pixel, the `low` tier where it starts
const [W, H] = opt('size', PHONE ? '780x1688' : '1280x720').split('x').map(Number), scale = +opt('scale', '1'), w = Math.round(W * scale), h = Math.round(H * scale);
const frames = +opt('frames', '12'), ext = has('png') ? 'png' : 'jpg', mime = has('png') ? 'image/png' : 'image/jpeg';
const ARGS = has('gpu') ? ['--allow-file-access-from-files', '--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=default'] : ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-dev-shm-usage'];
export async function open(query = '', quiet = false) {
  const browser = await chromium.launch({ args: ARGS });
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  let failed = null; const seen = new Set();
  page.on('pageerror', (e) => { failed = failed || e; console.error('page error:', e.message.slice(0, 2000)); });
  page.on('console', (m) => { const t = m.text(); if (/GPU stall|ReadPixels|Automatic fallback|useProgram: program not valid/.test(t)) return; const k = t.slice(0, 200); if (seen.has(k)) return; seen.add(k); if (m.type() === 'error' || m.type() === 'warning') { if (!quiet && seen.size < 8) console.error(`console ${m.type()}:`, t.replace(/\n\s*\n/g, '\n').slice(0, 1800)); if (/Shader Error|not compiled|program not valid/.test(t)) failed = failed || new Error('a shader failed: ' + t.slice(0, 400)); } });
  const url = pathToFileURL(join(dir, 'index.html')).href + `?render=1&w=${w}&h=${h}&frames=2` + (Q ? '&' + Q : '') + (query ? '&' + query : '');
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
export const STATES = [['day', { tod: 13.5, weather: 'clear' }], ['dusk', { tod: 19.6, weather: 'clear' }], ['night', { tod: 23, weather: 'clear' }], ['rain', { tod: 14.5, weather: 'rain' }], ['snow', { tod: 11, weather: 'snow' }], ['mist', { tod: 20.4, weather: 'mist' }]];

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  if (has('mats')) {   // the material sheet: every layer — scan or recipe — under a raking light, six to a row, in the order printed
    const { browser, page } = await open('view=mats'), names = await page.evaluate(() => { const v = document.getElementById('veil'); if (v) v.remove(); return window.realm.info().names; }), out = join(outDir, opt('name', 'mats') + '.jpg');
    await page.screenshot({ path: out, type: 'jpeg', quality: 92, timeout: 240000 }); await browser.close(); console.log(out + '\n' + names.map((n, i) => `${i + 1} ${n}`).join(' · ')); process.exit(0);
  }
  if (has('cast')) {   // the cast sheet: each kind alone in a studio — turned every way (front, back, both sides, the four three-quarters), then its motion
    const { load } = await import('./gym.mjs'), GL = load(dir); GL.gym({ studio: true }); const kinds = (opt('cast', '') || Object.keys(GL.mech.kinds).join(',')).split(',').filter(Boolean);
    for (const kind of kinds) { const t0 = Date.now(), { browser, page } = await open('cast=' + kind + '&hud=0');
      try {
        const I = await page.evaluate(() => { const LR = window.realm.LR, M = LR.mech, u = M.units[0], K = u.K, G = M.geometry(u.kind, 0); let tw = 0, best = 1e9; for (let t = 0; t < u.lap; t += 0.25) { const c = M.cmd(u, t), b = c.body.p, d = Math.hypot(b[0], b[2] - u.R.at(0)[1]); if (c.rate > 0.99 && d < best) { best = d; tw = t; } }
          const h = u.haltList[0], mv = h && h.move, keys = mv ? mv.keys[mv.main] : null; let tg = 0, tp = 0, tr = 0; if (keys) { const base = keys[0][1]; let pk = 0; keys.forEach((k) => { if (Math.abs(k[1] - base) > Math.abs(pk)) { pk = k[1] - base; tp = k[0]; } }); let g = 0, r = 0; keys.forEach((k) => { const v = (k[1] - base) / pk; if (k[0] < tp && v < g) { g = v; tg = k[0]; } if (k[0] > tp && v < r) { r = v; tr = k[0]; } }); const last = keys.filter((k) => Math.abs((k[1] - base) / pk - 1) < 0.02).pop(); if (last) tp = (tp + last[0]) / 2; }
          return { T: u.T, lap: u.lap, tw, size: [G.max[0] - G.min[0], G.max[1] - G.min[1], G.max[2] - G.min[2]], top: G.max[1], title: K.spec.title || u.kind, tonnes: K.spec.tonnes, halt: h ? { t0: h.t0, hold: h.hold, move: h.name, tg, tp, tr } : null, tris: K.tris, bones: u.kin.nb, lamps: u.lampDefs.length }; });
        const at = (t) => page.evaluate((t) => { const M = window.realm.LR.mech, r = M.poseAt(M.units[0], t); return { p: r.W.body.p, h: r.cmd.h, g: window.realm.LR.land.h(r.W.body.p[0], r.W.body.p[2]) }; }, t);
        const tiles = [], snap = async (label, t, az, o = {}) => { const b = await at(t), H = I.size[1], Lx = I.size[0], Lz = I.size[2], wide = Math.abs(Math.cos(az)) * Lz + Math.abs(Math.sin(az)) * Lx, D = (Math.max((H / 2) / Math.tan((29 * Math.PI) / 180), (wide / 2) / Math.tan((29 * Math.PI) / 180) / (w / h)) * 1.2 + Math.max(Lx, Lz) * 0.35) * (o.k || 1), ty = b.g + H * 0.47, a = b.h + az, cx = b.p[0] + Math.cos(a) * D, cz = b.p[2] + Math.sin(a) * D, cy = ty + H * (o.up === undefined ? 0.06 : o.up);
          const yaw = (Math.atan2(b.p[0] - cx, -(b.p[2] - cz)) * 180) / Math.PI, pitch = (Math.atan2(ty - cy, D) * 180) / Math.PI, r = await shoot(page, { cam: [cx, cz, yaw, pitch, cy], t, frames, tod: 12.6, weather: 'clear' }, 'image/jpeg'); tiles.push([label, r.url]); console.log(`  ${kind} · ${label}  ${((Date.now() - t0) / 1000).toFixed(0)} s`); };
        const PI = Math.PI, tw = I.tw;
        for (const [l, az] of [['front', 0], ['three-quarter, front right', PI / 4], ['right side', PI / 2], ['three-quarter, back right', (3 * PI) / 4], ['back', PI], ['three-quarter, back left', (-3 * PI) / 4], ['left side', -PI / 2], ['three-quarter, front left', -PI / 4]]) await snap(l, tw, az);
        for (let i = 0; i < 4; i++) await snap(`walk ${i + 1}/4 · left side`, tw + (i * I.T) / 4, -PI / 2); for (let i = 0; i < 2; i++) await snap(`walk ${i * 2 + 2}/4 · right side`, tw + ((i * 2 + 1) * I.T) / 4, PI / 2);
        if (I.halt) { const h = I.halt, m0 = h.t0 + 2.5; await snap('standing (idle): breath out', h.t0 + 1.2, -PI / 3); await snap(`${h.move}: gather`, m0 + h.tg, -PI / 3); await snap(`${h.move}: peak`, m0 + h.tp, -PI / 3); await snap(`${h.move}: recover`, m0 + h.tr, -PI / 3); await snap('leaving: gathered to step off', h.t0 + h.hold - 0.8, -PI / 2); await snap('turn: stepping round the bend', tw + I.lap * 0.25, -PI / 2, { up: 0.5, k: 1.15 }); }
        const pg = await browser.newPage({ viewport: { width: 1640, height: 400 } }), cols = 4, out = join(outDir, 'cast-' + kind + '.jpg');
        await pg.setContent(`<body style="margin:0;background:#16181a;color:#e8e6e0;font:15px/1.3 sans-serif"><div style="padding:14px 18px 6px;font-size:22px">${I.title} <span style="opacity:.6;font-size:15px">· ${kind} · ${I.size.map((v) => v.toFixed(1)).join(' × ')} m (long × high × wide) · ${I.tonnes || '?'} t · ${I.bones} bones · ${I.tris.map((v) => (v / 1000).toFixed(0) + 'k').join(' / ')} triangles · the figure is 1.75 m</span></div><div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px;padding:8px">${tiles.map((t) => `<figure style="margin:0"><img src="${t[1]}" style="width:100%;display:block"><figcaption style="padding:3px 4px 8px;opacity:.85">${t[0]}</figcaption></figure>`).join('')}</div></body>`);
        await pg.screenshot({ path: out, type: 'jpeg', quality: 88, fullPage: true }); console.log(out, `${((Date.now() - t0) / 1000).toFixed(0)} s`);
      } finally { await browser.close(); } }
    process.exit(0);
  }
  const t00 = Date.now(), { browser, page } = await open();
  const base = await page.evaluate(() => ({ gpu: window.realm.info().gpu, views: (window.realm.LR.cfg.views || []).map((v) => ({ name: v.name, cam: v.cam, tod: v.tod, weather: v.weather })) }));
  console.log(`${base.gpu} · loaded in ${((Date.now() - t00) / 1000).toFixed(1)} s`);
  try {
    if (PHONE) {
      // The stills are 1280 × 720 at full scale; a phone draws fewer pixels than its canvas has and resolves them up over the
      // frames, while walking.  So: the tour's own frames, sixty a second, with the live blend — then the canvas stretched
      // to the screen's pixels, as the browser does it.  This is the picture to judge "is it sharp on a phone" by.
      const n = Math.round(60 * +opt('seconds', '2.5')), tmp = join(outDir, '.phone.png'), out = join(outDir, opt('name', 'phone') + '.jpg');
      const size = await page.evaluate(() => { const R = window.realm.LR.render; return `${R.w}×${R.h} drawn, resolved to ${R.W}×${R.H}`; });
      await page.evaluate(() => window.realm.filmStart(60)); for (let i = 0; i < n; i++) await page.evaluate(() => window.realm.filmFrame());
      save(tmp, await page.evaluate(() => window.realm.canvas.toDataURL('image/png'))); await ff(['-i', tmp, '-vf', 'scale=1170:-2:flags=bilinear', '-q:v', '2', out]); rmSync(tmp, { force: true });
      console.log(out, `(${size}; frame ${n} of the tour, as a 1170-pixel screen shows it)`);
    } else if (has('film')) {
      const fps = +opt('fps', '30'), secs = +opt('seconds', '60'), tmp = join(outDir, '.film'); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
      await page.evaluate(([fps]) => window.realm.filmStart(fps), [fps]);
      for (let i = 0, n = Math.round(fps * secs); i < n; i++) { const url = await page.evaluate(() => { window.realm.filmFrame(); return window.realm.canvas.toDataURL('image/jpeg', 0.95); }); save(join(tmp, String(i).padStart(6, '0') + '.jpg'), url); if (i % fps === 0) console.log(`  ${i}/${n} frames · ${((Date.now() - t00) / 1000).toFixed(0)} s`); }
      const out = join(outDir, opt('name', 'film') + '.mp4'); await ff(['-framerate', String(fps), '-i', join(tmp, '%06d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', opt('crf', '17'), '-movflags', '+faststart', out]); if (!has('keep')) rmSync(tmp, { recursive: true, force: true }); console.log(out);
    } else if (has('tour')) {
      // what the page shows before anyone touches it: n stills at equal steps along the tour, each as the tour's camera looks
      const n = +opt('tour', '12') || 12, o = parseShot(opt('state', '')), poses = await page.evaluate((n) => { const P = window.realm.LR.player; return P.tour ? Array.from({ length: n }, (_, i) => P.tourPose(((i + 0.5) / n) * P.tour.total)) : []; }, n);
      if (!poses.length) throw new Error('the realm has no tour: add tour:[{ x, z, look:[x, z] }, …] to LR.start({ … })');
      const tmp = join(outDir, '.tour'); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true }); let k = 0;
      for (const p of poses) { const a = Date.now(), r = await shoot(page, Object.assign({ frames }, o, { cam: p.cam }), 'image/jpeg'); save(join(tmp, String(k++).padStart(3, '0') + '.jpg'), r.url); console.log(`  ${String(k).padStart(2)} · ${p.s.toFixed(0)} m · at ${p.cam[0].toFixed(1)}, ${p.cam[1].toFixed(1)} looking ${p.cam[2].toFixed(0)}°  ${((Date.now() - a) / 1000).toFixed(1)} s`); }
      const cols = Math.min(4, n), out = join(outDir, opt('name', 'tour') + '.jpg'); await ff(['-framerate', '1', '-i', join(tmp, '%03d.jpg'), '-vf', `scale=${Math.round(1600 / cols)}:-1,tile=${cols}x${Math.ceil(n / cols)}:padding=4:color=black`, '-frames:v', '1', '-q:v', '3', out]); if (!has('keep')) rmSync(tmp, { recursive: true, force: true }); console.log(out, '(left to right, top to bottom: the walk from its start)');
    } else if (has('sheet')) {
      if (!base.views.length) throw new Error('the realm has no views: add views:[{ name, cam:[x,z,yaw,pitch] }] to LR.start({ … })');
      const tmp = join(outDir, '.sheet'); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true }); let k = 0; const names = (opt('only', '') || '').split(',').filter(Boolean), views = base.views.filter((v) => !names.length || names.includes(v.name));
      for (const v of views) for (const [sn, st] of STATES) { const a = Date.now(), r = await shoot(page, Object.assign({ cam: v.cam, frames }, st), 'image/jpeg'); save(join(tmp, String(k++).padStart(3, '0') + '.jpg'), r.url); console.log(`  ${v.name} · ${sn}  ${((Date.now() - a) / 1000).toFixed(1)} s  ${r.info.calls} calls ${(r.info.tris / 1e6).toFixed(2)} M tris`); }
      const out = join(outDir, opt('name', 'sheet') + '.jpg'), tw = Math.round(1600 / STATES.length); await ff(['-framerate', '1', '-i', join(tmp, '%03d.jpg'), '-vf', `scale=${tw}:-1,tile=${STATES.length}x${views.length}:padding=4:color=black`, '-frames:v', '1', '-q:v', '3', out]); if (!has('keep')) rmSync(tmp, { recursive: true, force: true }); console.log(out, '(columns: ' + STATES.map((s) => s[0]).join(', ') + ')');
    } else {
      const shots = has('views') ? base.views.map((v) => ({ name: v.name, o: { cam: v.cam, tod: v.tod, weather: v.weather } })) : all('shot').map((s, i) => ({ name: opt('name', 'shot') + (all('shot').length > 1 ? '-' + (i + 1) : ''), o: parseShot(s) }));
      if (!shots.length) throw new Error('nothing to render: --shot "cam=…", --views, --sheet, --tour or --film');
      for (const s of shots) { const a = Date.now(), r = await shoot(page, Object.assign({ frames }, s.o)); const f = join(outDir, s.name + '.' + ext); save(f, r.url); console.log(f, `${((Date.now() - a) / 1000).toFixed(1)} s`, JSON.stringify({ calls: r.info.calls, allCalls: r.info.allCalls, tris: r.info.tris, lights: r.info.lights, tod: r.info.tod, wx: r.info.wx , scans: r.info.scans && r.info.scans.inst ? `${r.info.scans.inst} copies ${(r.info.scans.tris / 1e6).toFixed(2)} M tris ${r.info.scans.calls} calls` : undefined })); }
    }
  } finally { await browser.close(); }
}

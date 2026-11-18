// machine-wilds · film.mjs — a film of a realm from the shots it declares (LR.start({ film: [{ name, dur, tod, weather, t, cam }] })).
// Every frame's camera and clock are functions of time, so the frames are written one by one and a render that stops (hours on
// a CPU) goes on where it was: frames already on disk are kept.
//   node <skill>/scripts/film.mjs <realm-dir> [--size 960x540] [--fps 24] [--q "q=high"] [--only name,…] [--still] [--no-build]
//     → out/film/<shot>/f_00000.jpg …, out/film.mp4 (with out/film.wav if it is there: see --sound)
//   --still     one frame from the middle of each shot → out/film-<shot>.jpg (look at these before the hours)
//   --sound     only the sound: the footfalls and calls of every shot placed from the same functions → out/film.wav
// Never commit the film; never put it in docs/.
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from './build.mjs';
const require = createRequire(import.meta.url); let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2), has = (k) => args.includes('--' + k), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 && args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const dir = resolve(args[0] && !args[0].startsWith('--') ? args[0] : '.'), [W, H] = opt('size', '960x540').split('x').map(Number), fps = +opt('fps', '24'), Q = opt('q', ''), only = (opt('only', '') || '').split(',').filter(Boolean);
if (!existsSync(join(dir, 'src'))) { console.error('usage: film.mjs <realm-dir> [--size 960x540] [--fps 24] [--q "q=high"] [--only shot] [--still] [--sound]'); process.exit(1); }
if (!has('no-build')) build(dir, { quiet: true });
const out = join(dir, 'out'), fdir = join(out, 'film'); mkdirSync(fdir, { recursive: true });
const ARGS = has('gpu') ? ['--allow-file-access-from-files', '--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=default'] : ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-dev-shm-usage'];
const ff = (a) => new Promise((res, rej) => { const p = spawn('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' }); p.on('exit', (c) => (c ? rej(new Error('ffmpeg failed')) : res())); });
const open = async () => { const browser = await chromium.launch({ args: ARGS }), page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }); page.on('pageerror', (e) => console.error('page error:', e.message.slice(0, 800)));
  await page.goto(pathToFileURL(join(dir, 'index.html')).href + `?render=1&w=${W}&h=${H}&frames=2&hud=0` + (has('sound') ? '&sound=1' : '') + (Q ? '&' + Q : ''), { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); ;) { const s = await page.evaluate(() => [window.READY === true, window.FAILED || null]); if (s[1]) throw new Error('the realm failed to load: ' + s[1]); if (s[0]) break; if (Date.now() - t0 > 1500000) throw new Error('the page never set window.READY'); await new Promise((r) => setTimeout(r, 300)); }
  return { browser, page }; };
const save = (f, url) => writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
const t00 = Date.now(); let { browser, page } = await open();
const shots = (await page.evaluate(() => window.realm.reel.shots)).map((s, i) => Object.assign(s, { i, n: Math.round(s.dur * fps) })).filter((s) => !only.length || only.includes(s.name));
if (!shots.length) { console.error('the realm declares no film: LR.start({ film: [{ name, dur, tod, weather, t, cam(u, LR) }] })'); await browser.close(); process.exit(1); }
console.log(`${shots.length} shots, ${shots.reduce((a, s) => a + s.dur, 0).toFixed(1)} s, ${shots.reduce((a, s) => a + s.n, 0)} frames at ${W} × ${H} · loaded in ${((Date.now() - t00) / 1000).toFixed(0)} s`);
if (has('sound')) {   // footfalls and calls, where each shot's camera hears them, on a bed of the hour's own air
  const wav = await page.evaluate(async ([list, fps]) => { const LR = window.realm.LR, M = LR.mech, R = window.realm.reel, ev = []; let T = 0, first = null;
    for (const s of list) { const seen = new Map(); for (let k = 0; k < s.n * 2; k++) { const q = R.pose(s.i, k / 2, fps), tt = T + k / 2 / fps, yaw = (q.cam[2] * Math.PI) / 180, rx = Math.cos(yaw), rz = Math.sin(yaw); first = first || q;
          for (const u of M.units) { const r = M.poseAt(u, q.t), c = r.cmd; if (c.move && c.move.sound && Math.abs(c.mt - c.move.sound[0]) < 0.26 / fps * 12 && !seen.has(u.name + 'call')) { seen.set(u.name + 'call', 1); const p = (r.W.head || r.W.body).p, d = Math.hypot(p[0] - q.cam[0], p[1] - q.cam[4], p[2] - q.cam[1]); ev.push({ at: tt, kind: 'call', d, side: ((p[0] - q.cam[0]) * rx + (p[2] - q.cam[1]) * rz) / Math.max(4, d), f: c.move.sound[1], len: c.move.sound[2], gain: c.move.sound[3] || 1 }); }
            { const cr = u.fly && u.K.spec.cry; if (cr) { const kk = Math.floor((q.t + (u.phase || 0) * cr[0]) / cr[0]), key = u.name + 'cry'; if (seen.has(key) && seen.get(key) !== kk) { const p = r.W.body.p, d = Math.hypot(p[0] - q.cam[0], p[1] - q.cam[4], p[2] - q.cam[1]); ev.push({ at: tt, kind: 'call', d, side: ((p[0] - q.cam[0]) * rx + (p[2] - q.cam[1]) * rz) / Math.max(4, d), f: cr[1], len: cr[2], gain: cr[3] || 0.6 }); } seen.set(key, kk); } }      // a flyer's cry, at the instants the live page gives it
            if (u.post || c.rate < 0.02) continue; for (const l of u.kin.limbs) { const lq = c.limbs[l.name], key = u.name + l.name; if (lq.sw) { seen.set(key, -1e9); continue; } if (seen.get(key) === lq.k) continue; const fresh = seen.has(key); seen.set(key, lq.k); if (!fresh) continue; const d = Math.hypot(lq.p[0] - q.cam[0], lq.p[1] - q.cam[4], lq.p[2] - q.cam[1]); ev.push({ at: tt, kind: 'footfall', d, side: ((lq.p[0] - q.cam[0]) * rx + (lq.p[2] - q.cam[1]) * rz) / Math.max(4, d), tonnes: u.K.spec.tonnes || 50 }); } } }
      T += s.dur; }
    const res = await LR.audio.renderOffline(T + 1.5, { tod: first.state.tod === undefined ? 20 : first.state.tod, wind: 0.2, x: first.cam[0], y: first.cam[4], z: first.cam[1], yaw: 0, sources: LR.world.sounds, events: ev, keep: true, volume: 0.9 });
    if (!res.buffer) return { none: JSON.stringify(Object.assign({}, res, { buffer: undefined })) };
    const b = res.buffer, n = b.length, ch = [b.getChannelData(0), b.getChannelData(1)], pcm = new Int16Array(n * 2); for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) pcm[i * 2 + c] = Math.max(-32767, Math.min(32767, Math.round(ch[c][i] * 32767)));
    const u8 = new Uint8Array(pcm.buffer); let bin = ''; for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return { sr: b.sampleRate, n, b64: btoa(bin), events: ev.length, peak: res.peak }; }, [shots, fps]);
  if (wav.none) console.log('no sound: ' + wav.none); else { const pcm = Buffer.from(wav.b64, 'base64'), h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(wav.sr, 24); h.writeUInt32LE(wav.sr * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40); writeFileSync(join(out, 'film.wav'), Buffer.concat([h, pcm])); console.log(join(out, 'film.wav'), `${(wav.n / wav.sr).toFixed(1)} s · ${wav.events} footfalls and calls · peak ${wav.peak.toFixed(2)}`); }
  await browser.close(); process.exit(0);
}
if (has('still')) { for (const s of shots) for (const [tag, k] of [['a', Math.round(s.n * 0.15)], ['b', Math.round(s.n * 0.7)]]) { const t0 = Date.now(); await page.evaluate(([i, k, fps]) => { window.realm.reel.warm(i, k, fps); window.realm.reel.frame(i, k, fps); }, [s.i, k, fps]); const f = join(out, `film-${s.name}-${tag}.jpg`); save(f, await page.evaluate(() => window.realm.canvas.toDataURL('image/jpeg', 0.92))); console.log(f, `${((Date.now() - t0) / 1000).toFixed(0)} s`); } await browser.close(); process.exit(0); }
let done = 0, drawn = 0; const total = shots.reduce((a, s) => a + s.n, 0), tR = Date.now();
for (const s of shots) { const sd = join(fdir, s.name); mkdirSync(sd, { recursive: true }); let warm = false;
  for (let k = 0; k < s.n; k++) { const f = join(sd, 'f_' + String(k).padStart(5, '0') + '.jpg'); done++; if (existsSync(f)) { warm = false; continue; }
    for (let tries = 0; ; tries++) { try { if (!warm) { await page.evaluate(([i, k, fps]) => window.realm.reel.warm(i, k, fps), [s.i, k, fps]); warm = true; }
        save(f, await page.evaluate(([i, k, fps]) => { window.realm.reel.frame(i, k, fps); return window.realm.canvas.toDataURL('image/jpeg', 0.95); }, [s.i, k, fps])); break; }
      catch (e) { if (tries > 2) throw e; console.error('  the page was lost (' + e.message.split('\n')[0] + ') — opening it again'); try { await browser.close(); } catch (e2) { /* gone */ } ({ browser, page } = await open()); warm = false; } }
    drawn++; if (drawn % 12 === 0) { const per = (Date.now() - tR) / 1000 / drawn; console.log(`  ${s.name} ${k + 1}/${s.n} · ${done}/${total} · ${per.toFixed(1)} s a frame · about ${(((total - done) * per) / 60).toFixed(0)} min left`); } } }
await browser.close();
// join: each shot's frames, then the shots end to end, with the sound if it has been made
const list = join(fdir, 'list.txt'), parts = []; for (const s of shots) { const p = join(fdir, s.name + '.mp4'); await ff(['-framerate', String(fps), '-i', join(fdir, s.name, 'f_%05d.jpg'), '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-vf', 'fade=t=in:st=0:d=0.25,fade=t=out:st=' + (s.dur - 0.25).toFixed(2) + ':d=0.25', p]); parts.push(p); }
writeFileSync(list, parts.map((p) => `file '${p}'`).join('\n') + '\n'); const mp4 = join(out, 'film.mp4'), wav = join(out, 'film.wav');
await ff(['-f', 'concat', '-safe', '0', '-i', list, ...(existsSync(wav) ? ['-i', wav, '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []), '-c:v', 'copy', '-movflags', '+faststart', mp4]);
console.log(mp4, `${((Date.now() - t00) / 60000).toFixed(0)} min`);

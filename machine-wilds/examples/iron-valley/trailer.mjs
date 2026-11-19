// 쇠울림 골짜기 · the trailer: a short film with the walker's body in it.  The camera is free (not the walker's eye): it rides
// behind a kite, comes down to the body, follows it under the turtle and the relic; the body is driven by keys, frame by frame.
//   node trailer.mjs . --dry                    every shot stepped without drawing: where the body goes
//   node trailer.mjs . --keys [--only B,D1]     three frames a shot → out/cine/key-<shot>-<n>.jpg (look before the long render)
//   node trailer.mjs . --only K,D1,D2           frames → out/cine/<shot>/f_00000.jpg (kept: a stopped render goes on)
//   node trailer.mjs . --sound                  out/cine/cine.wav from the machines' footfalls and calls, heard from the camera
//   node trailer.mjs . --join                   out/cine.mp4 (shots in ORDER, each cut to RANGE, the sound, out/cine/title.png last)
// Needs the built page (scripts/build.mjs) and the scans (scripts/fetch-assets.mjs).  Nothing it writes is committed.
// A camera inside a lamp's cone sees the cone's edge as a hard line across the picture: keep the camera outside the beams.
import { createRequire } from 'node:module'; import { pathToFileURL } from 'node:url'; import { writeFileSync, existsSync, mkdirSync } from 'node:fs'; import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const args = process.argv.slice(2), dir = args[0], has = (k) => args.includes('--' + k), opt = (k) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : null; };
const W = 960, H = 540, FPS = 24, out = dir + '/out/cine'; mkdirSync(out, { recursive: true });
// the cut that is joined: every machine in it is walking (B, D1–D3 and C are an earlier cut's shots, where the turtle stands, the
// relic has stopped to call and the crayfish rears — kept for `--only`)
const ORDER = ['K', 'B0', 'G', 'T', 'R1', 'R2', 'R3', 'C2', 'A'], only = opt('only') ? opt('only').split(',') : ORDER;
// the cut: which frames of each shot are in the film [from, to)
const RANGE = { K: [0, 144], B0: [0, 72], G: [0, 72], T: [0, 132], R1: [0, 82], R2: [0, 101], R3: [0, 101], C2: [0, 132], A: [60, 221], B: [36, 168], D1: [0, 77], D2: [0, 158], D3: [0, 77], C: [0, 120] };
if (has('join')) { const parts = []; let Ts = 0;
  for (const n of ORDER) { const p = `${out}/${n}.mp4`, len = (RANGE[n][1] - RANGE[n][0]) / FPS, vf = n === ORDER[0] ? 'fade=t=in:st=0:d=0.8' : n === ORDER[ORDER.length - 1] ? `fade=t=out:st=${(len - 1.3).toFixed(2)}:d=1.3` : 'null';
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-start_number', String(RANGE[n][0]), '-i', `${out}/${n}/f_%05d.jpg`, '-frames:v', String(RANGE[n][1] - RANGE[n][0]), '-vf', vf, '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', p], { stdio: 'inherit' }); if (r.status) process.exit(1); parts.push(p); Ts += len; }
  let T = Ts; if (existsSync(out + '/title.png')) { const p = `${out}/title.mp4`; spawnSync('ffmpeg', ['-v', 'error', '-y', '-loop', '1', '-framerate', String(FPS), '-i', out + '/title.png', '-t', '3.2', '-vf', 'fade=t=in:st=0:d=0.7,fade=t=out:st=2.5:d=0.7', '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', p], { stdio: 'inherit' }); parts.push(p); T += 3.2; }
  writeFileSync(out + '/list.txt', parts.map((p) => `file '${p.split('/').pop()}'`).join('\n'));
  const wav = existsSync(out + '/cine.wav'), a = ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', out + '/list.txt']; if (wav) a.push('-i', out + '/cine.wav');
  if (wav) a.push('-af', `afade=t=in:st=0:d=0.8,afade=t=out:st=${(Ts - 0.6).toFixed(2)}:d=2.4,apad`, '-c:a', 'aac', '-b:a', '192k');
  a.push('-t', T.toFixed(2), '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', dir + '/out/cine.mp4'); const r = spawnSync('ffmpeg', a, { stdio: 'inherit' }); console.log(r.status === 0 ? `${dir}/out/cine.mp4 · ${T.toFixed(1)} s${wav ? ' · with sound' : ''}` : 'ffmpeg failed'); process.exit(0); }
const dry = has('dry'), keys = has('keys'), sound = has('sound');
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] }), page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(pathToFileURL(dir + '/index.html').href + `?render=1&w=${W}&h=${H}&frames=2&hud=0&torch=1${sound ? '&sound=1' : ''}`, { waitUntil: 'commit', timeout: 0 });
for (const t0 = Date.now(); ;) { const s = await page.evaluate(() => [window.READY === true, window.FAILED || null]); if (s[1]) throw new Error(s[1]); if (s[0]) break; if (Date.now() - t0 > 400000) throw new Error('never ready'); await new Promise((r) => setTimeout(r, 1000)); } console.log('ready');
await page.evaluate(([FPS]) => {
  const R = window.realm, LR = R.LR, P = LR.player, cam = LR.cam, M = LR.mech, dt = 1 / FPS; R.filmStart(FPS); P.stopTour(); LR.wx.set({ auto: false });
  const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }, lerp = (a, b, k) => a + (b - a) * k, wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const F = () => [Math.sin(P.yaw), -Math.cos(P.yaw)], Rt = () => [Math.cos(P.yaw), Math.sin(P.yaw)], floor = (x, z, y) => P.groundAt(x, z, y === undefined ? P.y + 1.2 : y).y;
  const at = (f, r, up) => { const a = F(), b = Rt(); return [P.x + a[0] * f + b[0] * r, P.y + up, P.z + a[1] * f + b[1] * r]; };      /* a point by the body: ahead, to its right, above its feet */
  const low = (p, h) => { p[1] = floor(p[0], p[2], P.y + 3) + h; return p; };
  const goTo = (tx, tz, K, run) => { const dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz); if (d < 0.45) return true; P.yaw += wrap(Math.atan2(dx, -dz) - P.yaw) * Math.min(1, 5 * dt); K.KeyW = true; if (run) K.ShiftLeft = true; return false; };
  const B0 = [100.5, -226], fw = [0.956, 0.292], rt = [-0.292, 0.956], under = [B0[0] + fw[0] * 4, B0[1] + fw[1] * 4], TB = [97, 82];
  const kite = M.units.find((u) => u.name === '솔개 3'), kp = (t) => M.cmd(kite, t).body.p, tarn0 = { x: 99, z: 102.5, yaw: 167 };
  // a walking machine at a moment: where its body is, which way it goes, which way is its right
  const U = (n) => M.units.find((u) => u.name === n), pose = (u, t) => { const c = M.cmd(u, t), h = c.h; return { p: c.body.p, h, fw: [Math.cos(h), Math.sin(h)], rt: [-Math.sin(h), Math.cos(h)] }; };
  const rel = (q, f, r) => [q.p[0] + q.fw[0] * f + q.rt[0] * r, q.p[2] + q.fw[1] * f + q.rt[1] * r], yawOf = (q) => (q.h * 180) / Math.PI + 90;
  const relic = U('마루'), jara = U('자라 1'), gajae = U('가재'), q1 = pose(relic, 142.0), q2 = pose(relic, 145.4), q3 = pose(relic, 149.6), far = rel(q1, 220, 0), c3 = rel(q3, 78, 7);
  const qt = pose(jara, 106), sg = qt.rt[1] > 0 ? 1 : -1, tGoal = rel(qt, 30, sg * 9.5);
  const SH = {
    // the woodlice come down their track in file; it stands aside
    G: { dur: 3, tod: 18.7, weather: 'clear', T0: 57, start: [-89.5, 51.4, 270], st: {},
      act() {},
      cam(s) { return [low([-86.2 - 0.25 * s, 0, 49.9], 0.6), [-100, floor(-100, 47, 30) + 0.9, 47.2], 50]; } },
    // it walks beside the turtle as the turtle walks into the evening
    T: { dur: 5.5, tod: 18.75, weather: 'clear', T0: 106, start: [rel(qt, -12, sg * 10.5)[0], rel(qt, -12, sg * 10.5)[1], yawOf(qt)], st: {},
      act(s, K) { if (s > 0.2) goTo(tGoal[0], tGoal[1], K); P.pitch = LR.damp(P.pitch, 0.22, 1.2, dt); },
      cam(s) { const q = pose(jara, 106 + s), f = rel(q, 3.5, 0); return [low(at(-5.6, sg * 2.2, 0), 1.9), [lerp(P.x, f[0], 0.62), lerp(P.y + 1.6, q.p[1] - 1.2, 0.62), lerp(P.z, f[1], 0.62)], 56]; } },
    // sunset on the rim, the relic walking: it runs in under it from behind …
    R1: { dur: 3.45, tod: 19.4, weather: 'clear', T0: 142.0, start: [rel(q1, -26, 0)[0], rel(q1, -26, 0)[1], yawOf(q1)], st: {},
      act(s, K) { if (s > 0.1) goTo(far[0], far[1], K, true); },
      cam(s) { return [low(at(-5.5, 1.8, 0), 1.0), at(16, 0, 9), 62]; } },
    // … runs between its legs as they come down …
    R2: { dur: 4.25, tod: 19.4, weather: 'clear', T0: 145.4, start: [rel(q2, -11, 0)[0], rel(q2, -11, 0)[1], yawOf(q2)], st: {},
      act(s, K) { goTo(far[0], far[1], K, true); },
      cam(s) { return [low(at(3.5 - 0.3 * s, -5.5, 0), 0.6), at(0.5, 2, 3.4), 75]; } },
    // … and out ahead of it: the whole of it coming on
    R3: { dur: 4.25, tod: 19.4, weather: 'clear', T0: 149.6, start: [rel(q3, 7, 0)[0], rel(q3, 7, 0)[1], yawOf(q3)], st: {},
      act(s, K) { goTo(far[0], far[1], K, true); },
      cam(s) { const q = pose(relic, 149.6 + s); return [low([c3[0], 0, c3[1]], 1.5), [q.p[0], q.p[1] - 14, q.p[2]], 52]; } },
    // dusk mist: across the brook the crayfish goes by on its eight legs
    C2: { dur: 5.5, tod: 19.75, weather: 'mist', T0: 103, start: [-61.6, -24.4, 0], st: {},
      act(s, K) { P.pitch = LR.damp(P.pitch, 0.2, 1.4, dt); if (s > 3.4 && s < 4.2) K.KeyS = true; },
      cam(s) { const q = pose(gajae, 103 + s); return [low([-60.4 + 0.15 * s, 0, -19.4], 1.7), [q.p[0] + 2, q.p[1] - 1.8, q.p[2]], 46]; } },
    // the opening: behind a kite as it glides in over the old road and the viaduct, a crane walking the floor below
    K: { dur: 6, tod: 18.6, weather: 'clear', T0: 116.5, start: [-22, 54, 0], st: {},
      act() {},
      cam(s) { const t = 116.5 + s, p = kp(t), a = kp(t - 0.35), b = kp(t + 0.35); let d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const l = Math.hypot(d[0], d[1], d[2]) || 1; d = d.map((v) => v / l); const hl = Math.hypot(d[0], d[2]) || 1, r = [-d[2] / hl, 0, d[0] / hl], back = 12.5 - 1.5 * ease(s / 6);
        return [[p[0] - d[0] * back + r[0] * 2.6, p[1] - d[1] * back + 3.4, p[2] - d[2] * back + r[2] * 2.6], [p[0] + d[0] * 30, p[1] - 15, p[2] + d[2] * 30], 62]; } },
    // … the camera comes down through the evening to the one who walks here
    B0: { dur: 3, tod: 18.75, weather: 'clear', T0: 18.5, start: [98.0, 106.4, 14], st: {},
      act(s, K) { if (s > 0.2) goTo(101.6, 92.2, K); },
      cam(s) { const u = ease(s / 2.8), e = at(6.5 + 14 * (1 - u), -2.2 - 6 * (1 - u), 0), g = floor(e[0], e[2], P.y + 3); return [[e[0], g + 1.3 + 13 * (1 - u) * (1 - u), e[2]], at(0, 0, 1.3), 52]; } },
    // golden hour at the tarn: it walks in under the turtle and looks up
    B: { dur: 8.2, tod: 18.75, weather: 'clear', T0: 20, start: [99, 102.5, 167], st: {},
      act(s, K, st) { if (s > 0.4 && !st.there) st.there = goTo(101.6, 92.2, K) ? s : 0; if (st.there) P.pitch = LR.damp(P.pitch, 0.5, 1.5, dt); },
      cam(s) { const u = ease((s - 4.6) / 2.6), b = at(-4.8 + 0.4 * u, 1.7 + 0.4 * u, 0); return [low(b, 2.0), [lerp(P.x, 100.5, 0.45), P.y + 2.5 + u * 0.9, lerp(P.z, 88.5, 0.45)], 54]; } },
    // sunset on the rim: it runs toward the relic
    D1: { dur: 3.2, tod: 19.4, weather: 'clear', T0: 252.6, start: [B0[0] + fw[0] * 50, B0[1] + fw[1] * 50, -73], st: {},
      act(s, K) { if (s > 0.15) goTo(under[0], under[1], K, true); },
      cam(s) { return [low(at(-5.4, 1.8, 0), 1.0), [B0[0] + fw[0] * 6, P.y + 9.5 - s * 0.4, B0[1] + fw[1] * 6], 58]; } },
    // … walks in between its legs, stops under the deck and looks up as it calls
    D2: { dur: 6.6, tod: 19.4, weather: 'clear', T0: 257.6, start: [B0[0] + fw[0] * 12.5, B0[1] + fw[1] * 12.5, -73], st: {},
      act(s, K, st) { if (s > 0.3 && !st.there) st.there = goTo(under[0], under[1], K) ? s : 0; if (st.there) P.pitch = LR.damp(P.pitch, 0.95, 1.4, dt); },
      cam(s) { if (s < 2.5) return [low(at(3.8 - 0.15 * s, -1.7, 0), 0.5), at(0, 0, 3.0 + 0.5 * s), 72]; const u = ease((s - 3.4) / 2.4); return [low(at(-5.6, 1.7, 0), 1.0), at(3, 0, 2.2 + u * 7.2), 74]; } },
    // … and from far off: the whole of it, and a point of light under it
    D3: { dur: 3.8, tod: 19.4, weather: 'clear', T0: 263.4, start: [under[0], under[1], -73], st: {}, pitch: 0.95,
      act() { P.pitch = 0.95; },
      cam(s) { const k = 60 + 1.2 * s; return [low([B0[0] + fw[0] * k + rt[0] * 5, 0, B0[1] + fw[1] * k + rt[1] * 5], 1.3), [B0[0], floor(B0[0], B0[1], 60) + 19, B0[1]], 50]; } },
    // night mist on the viaduct: it walks out along the deck, stops and looks up; the kites come over
    A: { dur: 9.2, tod: 20.4, weather: 'mist', T0: 46.0, start: [-22, 64, 0], st: {},
      act(s, K) { if (s > 0.3 && s < 4.5) K.KeyW = true; if (s > 4.9) P.pitch = LR.damp(P.pitch, 0.62, 1.6, dt); },
      cam(s) { const u = ease((s - 5.0) / 2.6), v = ease(s / 4.6); return [at(-5.2 + 0.6 * v, -1.4, 1.0 - 0.55 * v), at(7, 0, 1.5 + 0.4 * v + u * 6.6), 60]; } },
    // … and down by the brook the crayfish rears
    C: { dur: 6.0, tod: 19.75, weather: 'mist', T0: 57.4, start: [-91.3, -29.4, -13], st: {},
      act(s, K) { if (s > 0.3 && s < 0.75) K.KeyW = true; if (s > 2.2) P.pitch = LR.damp(P.pitch, 0.28, 1.6, dt); if (s > 3.7 && s < 4.3) K.KeyS = true; },
      cam(s) { const k = 0.3 * s; return [low([-89.2 - 0.233 * k, 0, -25.6 - 0.973 * k], 2.1), [-94.6, 6.2 + ease((s - 3) / 2) * 0.9, -50], 38]; } } };
  let cur = null, time = 0, f = 0;
  const tick = (draw) => { const s = f / FPS, K = {}; cur.act(s, K, cur.st); P.keys = K; P.update(dt, cam); const c = cur.cam(s), p = c[0], q = c[1], dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2];
    cam.position.set(p[0], p[1], p[2]); cam.rotation.set(Math.atan2(dy, Math.hypot(dx, dz)), -Math.atan2(dx, -dz), Math.sin(s * 0.9) * 0.003); if (Math.abs(cam.fov - c[2]) > 0.01) { cam.fov = c[2]; cam.updateProjectionMatrix(); }
    time += dt; LR.wx.update(dt, time); LR.emit('frame', time, dt, cam); if (draw) LR.render.draw(cam, time, dt); f++; return { s: +s.toFixed(2), x: +P.x.toFixed(1), y: +P.y.toFixed(1), z: +P.z.toFixed(1), pitch: +P.pitch.toFixed(2), cam: p.map((v) => +v.toFixed(1)), there: cur.st.there || 0 }; };
  window.cine = { names: Object.keys(SH), frames: (n) => Math.round(SH[n].dur * FPS), dur: (n) => SH[n].dur, T0: (n) => SH[n].T0,
    begin(n, draw) { cur = SH[n]; cur.st = {}; LR.wx.snap({ tod: cur.tod, weather: cur.weather }); P.place(cur.start[0], cur.start[1], cur.start[2]); P.pitch = cur.pitch || 0; P.setView('third'); P.keys = {}; time = cur.T0 - 1.0; f = 0;
      for (let i = 0; i < FPS; i++) { P.update(dt, cam); time += dt; LR.wx.update(dt, time); LR.emit('frame', time, dt, cam); }      /* a second of standing before the shot: the body settles, the machines are where the clock says */
      LR.render.histValid = false; if (draw) { const s0 = f; for (let i = 0; i < 6; i++) { const c = cur.cam(0), p = c[0], q = c[1]; cam.position.set(p[0], p[1], p[2]); cam.rotation.set(Math.atan2(q[1] - p[1], Math.hypot(q[0] - p[0], q[2] - p[2])), -Math.atan2(q[0] - p[0], -(q[2] - p[2])), 0); cam.fov = c[2]; cam.updateProjectionMatrix(); LR.emit('frame', time, 1e-4, cam); LR.render.draw(cam, time, 1e-4); } f = s0; } },
    tick, time: () => time, camNow: () => [cam.position.x, cam.position.y, cam.position.z, cam.rotation.y] };
}, [FPS]);
const save = async (f) => writeFileSync(f, Buffer.from((await page.evaluate(() => window.realm.canvas.toDataURL('image/jpeg', 0.95))).split(',')[1], 'base64'));
if (sound) {
  // the sound: every shot stepped dry, the machines' footfalls and calls heard from where the camera is, then one offline render
  const wav = await page.evaluate(async ([ORDER, FPS, RANGE]) => { const LR = window.realm.LR, M = LR.mech, C = window.cine, ev = []; let T = 0, first = null; const seen = new Map();
    for (const n of ORDER) { C.begin(n, false); seen.clear(); const N = RANGE[n][1]; for (let k = 0; k < N; k++) { C.tick(false); if (k < RANGE[n][0]) continue; const cp = C.camNow(), yaw = -cp[3], rx = Math.cos(yaw), rz = Math.sin(yaw), tt = T + (k - RANGE[n][0]) / FPS, t = C.time(); if (!first) first = cp;
        for (const u of M.units) { if (u.avatar) continue; const c = M.cmd(u, t);
          { const mv = c.move, key = u.name + 'mv'; if (mv && mv.sound && seen.get(key) !== mv && c.mt >= mv.sound[0]) { seen.set(key, mv); const p = c.body.p, d = Math.hypot(p[0] - cp[0], p[1] - cp[1], p[2] - cp[2]); ev.push({ at: tt, kind: 'call', d, side: ((p[0] - cp[0]) * rx + (p[2] - cp[2]) * rz) / Math.max(4, d), f: mv.sound[1], len: mv.sound[2], gain: mv.sound[3] }); } }
          { const cr = u.fly && u.K.spec.cry; if (cr) { const kk = Math.floor((t + (u.phase || 0) * cr[0]) / cr[0]), key = u.name + 'cry'; if (seen.has(key) && seen.get(key) !== kk) { const p = c.body.p, d = Math.hypot(p[0] - cp[0], p[1] - cp[1], p[2] - cp[2]); ev.push({ at: tt, kind: 'call', d, side: ((p[0] - cp[0]) * rx + (p[2] - cp[2]) * rz) / Math.max(4, d), f: cr[1], len: cr[2], gain: cr[3] || 0.6 }); } seen.set(key, kk); } }
          if (u.fly || u.post || c.rate < 0.02) continue; for (const l of u.kin.limbs) { const lq = c.limbs[l.name], key = u.name + l.name; if (lq.sw) { seen.set(key, -1e9); continue; } if (seen.get(key) === lq.k) continue; const fresh = seen.has(key); seen.set(key, lq.k); if (!fresh) continue; const d = Math.hypot(lq.p[0] - cp[0], lq.p[1] - cp[1], lq.p[2] - cp[2]); ev.push({ at: tt, kind: 'footfall', d, side: ((lq.p[0] - cp[0]) * rx + (lq.p[2] - cp[2]) * rz) / Math.max(4, d), tonnes: u.K.spec.tonnes || 50 }); } }
        const av = M.units.find((u) => u.avatar); if (av && av.av) { const on = av.av.feet.map((q) => q.on).join(''), key = 'av'; if (seen.has(key) && seen.get(key) !== on && !av.av.air) { const d = Math.hypot(av.av.x - cp[0], av.av.z - cp[2]); ev.push({ at: tt, kind: 'footfall', d: Math.max(3, d), side: 0, tonnes: 0.6 }); } seen.set(key, on); } }
      T += (RANGE[n][1] - RANGE[n][0]) / FPS; }
    const res = await LR.audio.renderOffline(T + 0.5, { tod: 20, wind: 0.25, x: first[0], y: first[1], z: first[2], yaw: 0, sources: LR.world.sounds, events: ev, keep: true, volume: 0.9 }); if (!res.buffer) return { none: JSON.stringify(Object.assign({}, res, { buffer: undefined })), events: ev.length };
    const b = res.buffer, nn = b.length, ch = [b.getChannelData(0), b.getChannelData(1)], pcm = new Int16Array(nn * 2); for (let i = 0; i < nn; i++) for (let c = 0; c < 2; c++) pcm[i * 2 + c] = Math.max(-32767, Math.min(32767, Math.round(ch[c][i] * 32767)));
    const u8 = new Uint8Array(pcm.buffer); let bin = ''; for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return { sr: b.sampleRate, n: nn, b64: btoa(bin), events: ev.length, kinds: ev.reduce((a, e) => { a[e.kind + (e.tonnes < 1 ? '-own' : '')] = (a[e.kind + (e.tonnes < 1 ? '-own' : '')] || 0) + 1; return a; }, {}), peak: res.peak }; }, [ORDER, FPS, RANGE]);
  if (wav.none) console.log('no sound:', wav.none, wav.events); else { const pcm = Buffer.from(wav.b64, 'base64'), h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(wav.sr, 24); h.writeUInt32LE(wav.sr * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40); writeFileSync(out + '/cine.wav', Buffer.concat([h, pcm])); console.log(out + '/cine.wav', (wav.n / wav.sr).toFixed(1) + ' s', JSON.stringify(wav.kinds), 'peak', wav.peak.toFixed(2)); }
  await browser.close(); process.exit(0); }
for (const n of only) { const N = await page.evaluate((n) => window.cine.frames(n), n);
  if (dry) { await page.evaluate((n) => window.cine.begin(n, false), n); for (let k = 0; k < N; k++) { const r = await page.evaluate(() => window.cine.tick(false)); if (k % 12 === 0 || k === N - 1) console.log(n, JSON.stringify(r)); } continue; }
  if (keys) { const want = (opt('at') ? opt('at').split(',').map(Number) : [0.12, 0.55, 0.95]).map((q) => Math.round(q * (N - 1))); await page.evaluate((n) => window.cine.begin(n, true), n); for (let k = 0; k < N; k++) { const near = want.some((w) => k >= w - 3 && k <= w); const r = await page.evaluate((d) => window.cine.tick(d), near); if (want.includes(k)) { const f = `${out}/key-${n}-${want.indexOf(k) + 1}.jpg`; await save(f); console.log(f, JSON.stringify(r)); } } continue; }
  const sd = `${out}/${n}`; mkdirSync(sd, { recursive: true }); const t0 = Date.now(); await page.evaluate((n) => window.cine.begin(n, true), n);
  const [r0, r1] = RANGE[n] || [0, N]; for (let k = 0; k < Math.min(N, r1); k++) { const f = `${sd}/f_${String(k).padStart(5, '0')}.jpg`, skip = k < r0, have = skip || existsSync(f), soon = k >= r0 - 4 && !existsSync(`${sd}/f_${String(Math.min(N - 1, k + 4)).padStart(5, '0')}.jpg`); await page.evaluate((d) => window.cine.tick(d), !have || soon); if (!have) await save(f); if (k % 24 === 0) console.log(n, k, '/', N, ((Date.now() - t0) / 1000).toFixed(0) + ' s'); } }
await browser.close(); console.log('done', only.join(','));

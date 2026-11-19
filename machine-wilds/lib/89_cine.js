// machine-wilds · 89_cine — a film played in the page.  Shots with a free camera (not the walker's eye) and the walker's body
// driven by keys, frame by frame; each shot sets its own hour, weather and machines' clock.  The same shots play live
// (?film=1, or realm.cine.play()) and are stepped offline to draw a film's frames (a realm's trailer.mjs).
//   LR.start({ cine: (h) => ({ fps: 24, order: ['A', 'B'], range: { A: [0, 144] }, title: { big, small, line }, shots: {
//     A: { dur, tod, weather, T0, start: [x, z, yaw°], pitch, tod1 (the hour at the shot's end: time passes), view: 'first' | 'top' (the
//          walker's own camera instead of cam), zoom, rate (how fast the machines' clock runs: 3 for time passing), act(s, keys, state),
//          cam(s) → [[x, y, z], [look x, y, z], fov°] } } }) })
//   h: { LR, P (the walker), M (the machines), dt(), ease, lerp, damp(a, b, rate), at(ahead, right, up) (a point by the body),
//        low(point, height over the ground), floor(x, z, y), goTo(x, z, keys, run) (steer the body there; true when there),
//        U(name) (a machine), pose(unit, t) → { p, h, fw, rt }, rel(pose, ahead, right) → [x, z], yawOf(pose) }
// A camera inside a lamp's cone sees the cone's edge as a hard line across the picture: keep cameras out of the beams.
(() => {
  const C = (LR.cine = { on: false, ready: false });
  let make = null, cam = null, def = null, cur = null, name = '', dt = 1 / 24, clock = 0, f = 0, live = null;
  C.init = (fn, camera) => { make = fn || null; cam = camera; C.has = !!fn; };
  const ensure = () => { if (def || !make) return !!def; const P = LR.player, M = LR.mech;
    const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }, lerp = (a, b, k) => a + (b - a) * k, wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const F = () => [Math.sin(P.yaw), -Math.cos(P.yaw)], Rt = () => [Math.cos(P.yaw), Math.sin(P.yaw)], floor = (x, z, y) => P.groundAt(x, z, y === undefined ? P.y + 1.2 : y).y;
    const at = (a, r, up) => { const u = F(), v = Rt(); return [P.x + u[0] * a + v[0] * r, P.y + up, P.z + u[1] * a + v[1] * r]; };
    const low = (p, h) => { p[1] = floor(p[0], p[2], P.y + 3) + h; return p; };
    const goTo = (tx, tz, K, run) => { const dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz); if (d < 0.45) return true; P.yaw += wrap(Math.atan2(dx, -dz) - P.yaw) * Math.min(1, 5 * dt); K.KeyW = true; if (run) K.ShiftLeft = true; return false; };
    const U = (n) => M.units.find((u) => u.name === n), pose = (u, t) => { const c = M.cmd(u, t), h = c.h; return { p: c.body.p, h, fw: [Math.cos(h), Math.sin(h)], rt: [-Math.sin(h), Math.cos(h)] }; };
    const rel = (q, a, r) => [q.p[0] + q.fw[0] * a + q.rt[0] * r, q.p[2] + q.fw[1] * a + q.rt[1] * r], yawOf = (q) => (q.h * 180) / Math.PI + 90;
    def = make({ LR, P, M, dt: () => dt, ease, lerp, damp: (a, b, k) => LR.damp(a, b, k, dt), at, low, floor, goTo, U, pose, rel, yawOf });
    C.fps = def.fps || 24; C.order = def.order || Object.keys(def.shots); C.range = {}; for (const n in def.shots) C.range[n] = (def.range && def.range[n]) || [0, Math.round(def.shots[n].dur * C.fps)]; C.title = def.title || null; C.ready = true; return true; };
  const aim = (c, roll) => { const p = c[0], q = c[1], dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2]; cam.position.set(p[0], p[1], p[2]); cam.rotation.set(Math.atan2(dy, Math.hypot(dx, dz)), -Math.atan2(dx, -dz), roll || 0); if (Math.abs(cam.fov - c[2]) > 0.01) { cam.fov = c[2]; cam.updateProjectionMatrix(); } };
  const hour = (s) => { if (cur.tod1 !== undefined) LR.wx.snap({ tod: cur.tod + (cur.tod1 - cur.tod) * Math.max(0, Math.min(1, s / cur.dur)) }); };
  const start = (n) => { const P = LR.player; cur = def.shots[n]; name = n; cur.st = {}; LR.wx.set({ auto: false }); LR.wx.snap({ tod: cur.tod, weather: cur.weather }); P.stopTour(); P.place(cur.start[0], cur.start[1], cur.start[2]); P.pitch = cur.pitch || 0; P.setView(cur.view || 'third'); if (cur.zoom) P.zoom[P.view] = cur.zoom; if (cur.view && LR.fit) { LR.fit(); P.fovSet = false; } P.keys = {}; clock = cur.T0 - 1.0; f = 0; };
  // one frame of the shot at the film's own rate: the hand, the body, the camera, the world — drawn or not
  const step = (draw) => { const P = LR.player, s = f / C.fps, K = {}; cur.act(s, K, cur.st); P.keys = K; P.update(dt, cam); hour(s); if (!cur.view) aim(cur.cam(s), Math.sin(s * 0.9) * 0.003);
    clock += dt * (cur.rate || 1); LR.wx.update(dt, clock); LR.emit('frame', clock, dt, cam); if (draw) LR.render.draw(cam, clock, dt); f++; return s; };
  const settle = () => { const P = LR.player; for (let i = 0; i < C.fps; i++) { P.update(dt, cam); clock += dt; LR.wx.update(dt, clock); LR.emit('frame', clock, dt, cam); } };      /* a second of standing before the shot: the body settles, the machines are where the clock says */
  // ── offline: a script steps the shots and saves what is drawn ──
  C.names = () => (ensure() ? Object.keys(def.shots) : []); C.frames = (n) => (ensure(), Math.round(def.shots[n].dur * C.fps)); C.dur = (n) => (ensure(), def.shots[n].dur); C.T0 = (n) => (ensure(), def.shots[n].T0);
  C.info = () => (ensure() ? { fps: C.fps, order: C.order, range: C.range, title: C.title } : null);
  C.begin = (n, draw) => { ensure(); dt = 1 / C.fps; start(n); settle(); LR.render.histValid = false;
    if (draw) for (let i = 0; i < 6; i++) { if (!cur.view) aim(cur.cam(0)); LR.emit('frame', clock, 1e-4, cam); LR.render.draw(cam, clock, 1e-4); } };
  C.tick = (draw) => { const P = LR.player, s = step(draw); return { s: +s.toFixed(2), x: +P.x.toFixed(1), y: +P.y.toFixed(1), z: +P.z.toFixed(1), pitch: +P.pitch.toFixed(2), cam: [cam.position.x, cam.position.y, cam.position.z].map((v) => +v.toFixed(1)), there: cur.st.there || 0, air: !!P.air }; };
  C.time = () => clock; C.camNow = () => [cam.position.x, cam.position.y, cam.position.z, cam.rotation.y];
  // ── live: the page plays the film itself; Esc (or a click on "walk") hands the walker back ──
  let veil = null, hint = null, card = null;
  const dom = () => { if (veil) return; const mk = (css, html) => { const e = document.createElement('div'); e.style.cssText = css; if (html) e.innerHTML = html; document.body.appendChild(e); return e; };
    veil = mk('position:fixed;inset:0;background:#07090b;opacity:1;transition:opacity .9s;pointer-events:none;z-index:40');
    const t = C.title || {}; card = mk('position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#e9e4d6;font-family:system-ui,sans-serif;opacity:0;transition:opacity 1s;pointer-events:none;z-index:41;text-align:center',
      `<div style="font-size:min(9vw,64px);font-weight:700;letter-spacing:.14em">${t.big || ''}</div><div style="width:120px;height:2px;background:#c8532e;margin:22px 0 18px"></div><div style="font-size:min(3.4vw,20px);letter-spacing:.42em;opacity:.78">${t.small || ''}</div><div style="font-size:min(2.8vw,15px);letter-spacing:.2em;opacity:.5;margin-top:14px">${t.line || ''}</div>`);
    hint = mk('position:fixed;right:14px;bottom:12px;z-index:42;font:12px system-ui,sans-serif;color:#e9e4d6;opacity:.55;cursor:pointer;padding:6px 10px;border:1px solid rgba(233,228,214,.35);border-radius:6px;background:rgba(7,9,11,.35)', t.skip || 'Esc · walk');
    hint.addEventListener('click', () => C.stop()); window.addEventListener('keydown', (e) => { if (C.on && e.code === 'Escape') C.stop(); }); };
  const cut = (i) => { live.i = i; const n = C.order[i]; dt = 1 / C.fps; start(n); settle(); for (let k = 0; k < C.range[n][0]; k++) step(false); live.s = f / C.fps; live.end = C.range[n][1] / C.fps; LR.render.histValid = false; };
  C.play = () => { if (!ensure() || !C.order.length) return false; dom(); const hud = document.getElementById('hud'); if (hud) { C.hudWas = hud.style.display; hud.style.display = 'none'; } hint.style.display = ''; card.style.opacity = 0; C.on = true; live = { i: 0, s: 0, end: 0, tail: -1 }; C.auto = LR.wx.auto; cut(0); requestAnimationFrame(() => { veil.style.opacity = 0; }); return true; };
  C.stop = () => { if (!C.on) return; C.on = false; const P = LR.player, sp = LR.world.spawn, hud = document.getElementById('hud'); if (hud) hud.style.display = C.hudWas || ''; if (hint) hint.style.display = 'none'; if (card) card.style.opacity = 0; if (veil) veil.style.opacity = 0;
    P.keys = {}; P.place(sp.x, sp.z, sp.yaw || 0); P.setView('third'); if (LR.fit) LR.fit(); const w = (LR.cfg && LR.cfg.weather) || {}; LR.wx.snap({ weather: w.weather || 'clear', tod: w.tod === undefined ? 16.6 : w.tod }); if (C.auto) LR.wx.set({ auto: true }); LR.render.histValid = false; LR.emit('cine', false); };
  // called by the page's loop once a frame while the film is on: returns the machines' clock for this frame
  C.live = (rdt, time) => { if (!C.on || !cur) return time; const P = LR.player; dt = Math.min(rdt, 1 / 12);
    if (live.tail >= 0) { live.tail += rdt; if (live.tail > 5.2) C.stop(); return clock; }      /* the title card, then the walker is handed the world */
    live.s += dt; f = Math.round(live.s * C.fps);
    if (live.s >= live.end) { if (live.i + 1 < C.order.length) cut(live.i + 1); else { live.tail = 0; veil.style.opacity = 1; card.style.opacity = 1; return clock; } }
    if (live.i === C.order.length - 1 && live.end - live.s < 1.2) veil.style.opacity = 1;
    const K = {}; cur.act(live.s, K, cur.st); P.keys = K; hour(live.s); if (!cur.view) aim(cur.cam(live.s), Math.sin(live.s * 0.9) * 0.003); clock += dt * (cur.rate || 1); return clock; };
})();

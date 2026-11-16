// living-realm · 80_player — walking.  Keyboard (W A S D / arrows, Q E or ← → to turn, Shift to run, Space to hop),
// mouse (click to look freely, or drag), touch (left thumb moves, right thumb looks), a gamepad (left stick walks,
// right stick looks, a trigger or a pressed stick runs, A hops).  The walker stands on the land,
// on bridges and piers, on the frozen pond; cannot pass walls, trunks, fences or deep water.  Until the first input
// the eye strolls a tour on its own.
{
  const T = THREE;
  const P = (LR.player = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, vy: 0, air: false, eye: 1.68, radius: 0.34, walk: 2.5, run: 5.8, bob: 0, speed: 0, moving: false, running: false, surface: 'grass', touring: false, tourS: 0, idle: 0, keys: {}, look: { dx: 0, dy: 0 }, stick: { x: 0, y: 0, active: false }, pad: { x: 0, y: 0, run: false, hop: false }, locked: false, enabled: true });
  const W = LR.world;
  // the floor under a point: land, or a deck within a step of where we stand
  P.groundAt = (x, z, yNow) => {
    let y = LR.land.h(x, z), surf = null;
    for (const f of W.floors) { const dx = x - f.x, dz = z - f.z, lx = dx * f.c - dz * f.s, lz = dx * f.s + dz * f.c; if (Math.abs(lx) <= f.hx && Math.abs(lz) <= f.hz) { const fy = f.h(lx, lz); if (fy > y && (yNow === undefined || fy - yNow < 0.75)) { y = fy; surf = f.surface || 'stone'; } } }
    const wl = LR.water ? LR.water.levelAt(x, z) : -1e9, depth = wl - y;
    const ice = LR.wx.season > 0.86 && depth > 0.02;
    if (ice) { y = wl; surf = 'snow'; }
    return { y, surf, depth: ice ? 0 : depth };
  };
  const collide = (x, z, r) => {
    for (let it = 0; it < 3; it++) { let hit = false;
      for (const s of W.solids) {
        if (s.r !== undefined) { const dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz), m = s.r + r; if (d < m) { if (d < 1e-5) { x += m; } else { x = s.x + (dx / d) * m; z = s.z + (dz / d) * m; } hit = true; } }
        else { const dx = x - s.x, dz = z - s.z, lx = dx * s.c - dz * s.s, lz = dx * s.s + dz * s.c, ex = s.hx + r, ez = s.hz + r; if (Math.abs(lx) < ex && Math.abs(lz) < ez) { const px = ex - Math.abs(lx), pz = ez - Math.abs(lz); let nlx = lx, nlz = lz; if (px < pz) nlx = Math.sign(lx || 1) * ex; else nlz = Math.sign(lz || 1) * ez; x = s.x + nlx * s.c + nlz * s.s; z = s.z - nlx * s.s + nlz * s.c; hit = true; } }
      }
      if (!hit) break; }
    return [x, z];
  };
  P.collide = collide;
  P.place = (x, z, yawDeg = 0) => { P.x = x; P.z = z; P.yaw = (yawDeg * Math.PI) / 180; P.pitch = 0; P.y = P.groundAt(x, z).y; P.vx = P.vz = P.vy = 0; };
  // ── the tour: a smooth closed walk through way-points [{ x, z, look:[x,z] }] ────────────────────────────────────
  P.setTour = (pts) => { if (!pts || pts.length < 3) { P.tour = null; return; } const n = pts.length, seg = [], len = [0]; const cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    const at = (u) => { const i = Math.floor(u), t = u - i, p = (k) => pts[((i + k) % n + n) % n]; return [cr(p(-1).x, p(0).x, p(1).x, p(2).x, t), cr(p(-1).z, p(0).z, p(1).z, p(2).z, t)]; };
    const N = n * 24; let prev = at(0), total = 0; const tab = [[0, 0]]; for (let i = 1; i <= N; i++) { const q = at((i / N) * n); total += Math.hypot(q[0] - prev[0], q[1] - prev[1]); tab.push([total, (i / N) * n]); prev = q; }
    P.tour = { at, tab, total, pts }; };
  const tourU = (s) => { const t = P.tour.tab; s = ((s % P.tour.total) + P.tour.total) % P.tour.total; let lo = 0, hi = t.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (t[m][0] <= s) lo = m; else hi = m; } const f = (s - t[lo][0]) / (t[hi][0] - t[lo][0] || 1); return t[lo][1] + (t[hi][1] - t[lo][1]) * f; };
  // where the tour stands and looks at s metres along it (undamped): for stills along the walk (render.mjs --tour)
  P.tourPose = (s) => { const u = tourU(s), q = P.tour.at(u), a = P.tour.at(tourU(s + 7)), n = P.tour.pts.length, i = Math.floor(u) % n, wp = P.tour.pts[i], wn = P.tour.pts[(i + 1) % n], f = u - Math.floor(u);
    let tx = a[0], tz = a[1]; const la = wp.look, lb = wn.look || la; if (la) { const k = wp.pull === undefined ? 0.55 : wp.pull; tx = LR.lerp(tx, la[0] + (lb[0] - la[0]) * f, k); tz = LR.lerp(tz, la[1] + (lb[1] - la[1]) * f, k); }
    return { s, cam: [q[0], q[1], (Math.atan2(tx - q[0], -(tz - q[1])) * 180) / Math.PI, (((wp.pitch || 0) + 0.03) * 180) / Math.PI] }; };
  P.startTour = () => { if (!P.tour) return; P.touring = true; // join the tour at its nearest point
    let best = 0, bd = 1e9; for (let s = 0; s < P.tour.total; s += 2) { const q = P.tour.at(tourU(s)); const d = Math.hypot(q[0] - P.x, q[1] - P.z); if (d < bd) { bd = d; best = s; } } P.tourS = best; LR.emit('tour', true); };
  P.stopTour = () => { if (P.touring) { P.touring = false; LR.emit('tour', false); } };

  // ── input ───────────────────────────────────────────────────────────────────────────────────────────────────────
  P.bind = (canvas) => {
    const K = P.keys, move = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE', 'Space']);
    window.addEventListener('keydown', (e) => { if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; K[e.code] = true; if (move.has(e.code)) { e.preventDefault(); P.stopTour(); } LR.emit('key', e.code, e); });
    window.addEventListener('keyup', (e) => { K[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in K) K[k] = false; });
    // mouse: click captures the pointer where the browser allows it; otherwise drag
    let drag = false, lx = 0, ly = 0;
    canvas.addEventListener('mousedown', (e) => { if (e.button !== 0) return; canvas.focus(); drag = true; lx = e.clientX; ly = e.clientY; if (canvas.requestPointerLock && !P.locked && !LR.q('nolock')) { try { const pr = canvas.requestPointerLock(); if (pr && pr.catch) pr.catch(() => {}); } catch (err) { /* stays in drag mode */ } } });
    window.addEventListener('mouseup', () => { drag = false; });
    document.addEventListener('pointerlockchange', () => { P.locked = document.pointerLockElement === canvas; LR.emit('lock', P.locked); });
    window.addEventListener('mousemove', (e) => { if (P.locked) { P.look.dx += e.movementX; P.look.dy += e.movementY; P.stopTourLook(); } else if (drag) { P.look.dx += (e.clientX - lx) * 1.6; P.look.dy += (e.clientY - ly) * 1.6; lx = e.clientX; ly = e.clientY; P.stopTourLook(); } });
    // touch: the left half is a stick, the right half turns the head
    const touches = new Map();
    const tdown = (e) => { for (const t of e.changedTouches) { const left = t.clientX < window.innerWidth * 0.45; touches.set(t.identifier, { left, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY }); if (left) { P.stick.active = true; P.stick.ox = t.clientX; P.stick.oy = t.clientY; P.stick.x = P.stick.y = 0; P.stopTour(); LR.emit('stick', P.stick); } } e.preventDefault(); };
    const tmove = (e) => { for (const t of e.changedTouches) { const s = touches.get(t.identifier); if (!s) continue; if (s.left) { const R = 56, dx = (t.clientX - s.x0) / R, dy = (t.clientY - s.y0) / R, l = Math.hypot(dx, dy); P.stick.x = l > 1 ? dx / l : dx; P.stick.y = l > 1 ? dy / l : dy; LR.emit('stick', P.stick); } else { P.look.dx += (t.clientX - s.x) * 2.4; P.look.dy += (t.clientY - s.y) * 2.4; P.stopTourLook(); } s.x = t.clientX; s.y = t.clientY; } e.preventDefault(); };
    const tup = (e) => { for (const t of e.changedTouches) { const s = touches.get(t.identifier); if (s && s.left) { P.stick.active = false; P.stick.x = P.stick.y = 0; LR.emit('stick', P.stick); } touches.delete(t.identifier); } e.preventDefault(); };
    canvas.addEventListener('touchstart', tdown, { passive: false }); canvas.addEventListener('touchmove', tmove, { passive: false }); canvas.addEventListener('touchend', tup, { passive: false }); canvas.addEventListener('touchcancel', tup, { passive: false });
  };
  // looking about during the tour only pauses its own head movement; walking input ends it
  P.stopTourLook = () => { P.lookHold = 4; };

  const tmp = new T.Vector3();
  P.update = (dt, cam) => {
    const K = P.keys;
    // head
    const sens = 0.0022; P.yaw += P.look.dx * sens; P.pitch = LR.clamp(P.pitch - P.look.dy * sens, -1.35, 1.35); P.look.dx = P.look.dy = 0;
    const turn = (K.ArrowRight || K.KeyE ? 1 : 0) - (K.ArrowLeft || K.KeyQ ? 1 : 0); P.yaw += turn * 1.9 * dt;
    if (K.PageUp) P.pitch = Math.min(1.3, P.pitch + dt); if (K.PageDown) P.pitch = Math.max(-1.3, P.pitch - dt);
    // a gamepad, if one is plugged in: read each frame (the browser has no events for sticks).  Left stick walks, right
    // stick looks, either trigger or a pressed left stick runs, the bottom face button hops.
    const pad = P.pad; pad.x = pad.y = 0; pad.run = pad.hop = false;
    if (navigator.getGamepads) { const dz = (v) => (Math.abs(v) < 0.16 ? 0 : (v - Math.sign(v) * 0.16) / 0.84);
      for (const gp of navigator.getGamepads()) { if (!gp || !gp.connected || gp.axes.length < 2) continue;
        const ax = dz(gp.axes[0]), ay = dz(gp.axes[1]), rx = dz(gp.axes[2] || 0), ry = dz(gp.axes[3] || 0), b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
        if (ax || ay) { pad.x += ax; pad.y += ay; P.stopTour(); }
        if (rx || ry) { P.yaw += rx * Math.abs(rx) * 2.6 * dt; P.pitch = LR.clamp(P.pitch - ry * Math.abs(ry) * 1.9 * dt, -1.35, 1.35); P.stopTourLook(); }
        if (b(6) || b(7) || b(10)) pad.run = true; if (b(0)) { pad.hop = true; P.stopTour(); } } }
    if (P.lookHold > 0) P.lookHold -= dt;
    if (P.touring && P.tour) {
      P.tourS += 1.55 * dt; const u = tourU(P.tourS), q = P.tour.at(u), a = P.tour.at(tourU(P.tourS + 7)), i = Math.floor(u) % P.tour.pts.length, wp = P.tour.pts[i], wn = P.tour.pts[(i + 1) % P.tour.pts.length], f = u - Math.floor(u);
      P.x = q[0]; P.z = q[1]; const g = P.groundAt(P.x, P.z, P.y); P.y = LR.damp(P.y, g.y, 8, dt);
      // look where we are going, drawn toward whatever this stretch of the walk is about
      let tx = a[0], tz = a[1]; const la = wp.look, lb = wn.look || la; if (la) { const lx = la[0] + ((lb ? lb[0] : la[0]) - la[0]) * f, lz = la[1] + ((lb ? lb[1] : la[1]) - la[1]) * f, k = wp.pull === undefined ? 0.55 : wp.pull; tx = LR.lerp(tx, lx, k); tz = LR.lerp(tz, lz, k); }
      if (!(P.lookHold > 0)) { const want = Math.atan2(tx - P.x, -(tz - P.z)); P.yaw += LR.wrapPi(want - P.yaw) * (1 - Math.exp(-dt * 1.1)); P.pitch = LR.damp(P.pitch, (wp.pitch || 0) + 0.03, 1.2, dt); }
      P.speed = 1.55; P.moving = true; P.running = false; P.surface = g.surf || P.surfaceAt(P.x, P.z, g);
    } else {
      // legs
      let fwd = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0), side = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0);
      if (P.stick.active) { fwd += -P.stick.y; side += P.stick.x; }
      fwd += -P.pad.y; side += P.pad.x;
      const mag = Math.min(1, Math.hypot(fwd, side)); P.running = !!(K.ShiftLeft || K.ShiftRight) || P.pad.run || (P.stick.active && Math.hypot(P.stick.x, P.stick.y) > 0.96);
      const g0 = P.groundAt(P.x, P.z, P.y), slow = g0.depth > 0.2 ? 0.55 : 1;
      const top = (P.running ? P.run : P.walk) * slow * (fwd < 0 ? 0.7 : 1), sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
      let wx = 0, wz = 0; if (mag > 0.01) { const fx = fwd / Math.max(mag, 1e-6) * mag, sx = side / Math.max(mag, 1e-6) * mag; wx = (sy * fx + cy * sx) * top; wz = (-cy * fx + sy * sx) * top; }
      const acc = mag > 0.01 ? 10 : 12; P.vx = LR.damp(P.vx, wx, acc, dt); P.vz = LR.damp(P.vz, wz, acc, dt);
      let nx = P.x + P.vx * dt, nz = P.z + P.vz * dt;
      [nx, nz] = collide(nx, nz, P.radius);
      // stay out of deep water and inside the world
      const g1 = P.groundAt(nx, nz, P.y); if (g1.depth > 1.0 && g1.depth > g0.depth) { nx = P.x; nz = P.z; P.vx *= 0.3; P.vz *= 0.3; }
      const rr = Math.hypot(nx, nz), R = W.radius; if (rr > R) { nx *= R / rr; nz *= R / rr; }
      P.x = nx; P.z = nz; const g = P.groundAt(P.x, P.z, P.y);
      if ((K.Space || P.pad.hop) && !P.air) { P.vy = 4.3; P.air = true; }
      if (P.air) { P.vy -= 13 * dt; P.y += P.vy * dt; if (P.y <= g.y) { P.y = g.y; P.air = false; P.vy = 0; } } else P.y = g.y > P.y ? LR.damp(P.y, g.y, 18, dt) : LR.damp(P.y, g.y, 12, dt);
      P.speed = Math.hypot(P.vx, P.vz); P.moving = P.speed > 0.25 && !P.air; P.surface = g.depth > 0.12 ? 'water' : g.surf || P.surfaceAt(P.x, P.z, g);
      P.idle = P.moving || turn ? 0 : P.idle + dt;
    }
    // the eye, with a little of the step in it
    P.bob += P.speed * dt * (P.running ? 0.95 : 1.25); const amp = P.moving ? (P.running ? 0.055 : 0.032) : 0;
    P.bobAmp = LR.damp(P.bobAmp || 0, amp, 8, dt);
    cam.position.set(P.x, P.y + P.eye + Math.sin(P.bob * LR.TAU) * P.bobAmp, P.z); cam.rotation.set(P.pitch, -P.yaw, Math.cos(P.bob * Math.PI) * P.bobAmp * 0.12);
  };
  P.surfaceAt = (x, z, g) => { const L = LR.land; if (LR.wx.snow > 0.55) return 'snow'; if (L.coverAt('paved', x, z) > 0.5) return 'stone'; if (L.coverAt('shore', x, z) > 0.5) return 'gravel'; if (L.coverAt('dirt', x, z) > 0.45) return 'dirt'; return 'grass'; };
  LR.on('input', (dt, cam) => { if (P.enabled) P.update(dt, cam); }, 10);
}

// ink-water-emergence · film.js — shots, creature tracks, the emergence → water mapping, the live player and the page
// contract (seek(t), DURATION, FPS, SIZE, shotAt, runChecks, __ready).
//
// Film({
//   W: 1920, H: 1080, fps: 24, seed: 3,
//   water: { …WATER_DEFAULTS overrides for the whole film (paper, floor, horizon, scale, speed …) },
//   cast: { lion: { body: quadruped({...}), look: {...}, at: [x, z], heading: deg,
//                   track: [{ t, e, s, crouch, rear, look, nod, roar, tailSwish }] } },   ← film time, continuous across cuts
//   shots: [{ name, d: 2.4, cam: [{ t, at, yaw, pitch, dist, fov, roll }],                   ← shot time
//             water: [{ t, fluid, len, warp, smoke, body, ink, rise, fade }],                   ← optional overrides
//             track: { lion: [{ t, … }] } }]                                                    ← optional per-shot override
//   score: SCORE (lib/score.js spec), checks: (t, frame) => [problems],
// })
//
// THE TWO DIALS (from the reference: "keep the fluidity, keep the form"): every creature has an emergence `e` (0 → 1) and
// every shot a `fluid` (0 → 1, default .5). From these the water gets its state:
//   e ≈ 0     nothing but drifting wisps          e ≈ .3  a translucent pre-form: the shape, only suggested, in smoke
//   e ≈ .6    a pale body you can read, smoking   e = 1   dense ink, every detail, still shedding ink at the edges
//   fluid scales how far ink is carried and how much the body bends, at every e — the form never fully freezes.
import { clamp, lerp, smooth, keys, v3 } from './core.js';
import { createWater, WATER_DEFAULTS } from './water.js';
import { camera, paintForm } from './paint.js';
import { checkPose } from './body.js';

const q = new URLSearchParams(location.search);

export function waterState(e, fluid = .5) {
  const f = .45 + fluid * 1.1, open = 1 - e;
  return {
    len: (.42 + .8 * open) * f,                       // how far ink travels from where it was shed
    warp: (.011 + .07 * open ** 1.6) * f,              // how much the body itself bends
    smoke: (.75 + .5 * Math.sin(Math.PI * clamp(e * 1.1)) ** .7 + .3 * open) * (.7 + .6 * fluid),
    body: smooth(.12, .85, e),
    wisp: lerp(.95, .7, e),
  };
}

export function Film(spec) {
  const W0 = spec.W || 1920, H0 = spec.H || 1080, FPS = spec.fps || 24;
  const render = q.has('render'), scaleQ = +(q.get('scale') || 1);
  const W = Math.round(W0 * scaleQ), H = Math.round(H0 * scaleQ), M = .12;
  const shots = []; let t0 = 0;
  for (const s of spec.shots) { shots.push({ ...s, t0, t1: t0 + s.d }); t0 += s.d; }
  const DURATION = +t0.toFixed(4);
  const off = new Set((q.get('off') || '').split(',').filter(Boolean));

  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const form = document.createElement('canvas'); form.width = Math.round(W * (1 + 2 * M)); form.height = Math.round(H * (1 + 2 * M));
  const fctx = form.getContext('2d', { willReadFrequently: false });
  const water = createWater(canvas, { W, H, margin: M });

  const shotAt = (t) => { t = clamp(t, 0, DURATION - 1e-6); return shots.find(s => t >= s.t0 && t < s.t1) || shots[shots.length - 1]; };
  const kv = (list, t, prop, def) => (list && list.some(k => k[prop] !== undefined)) ? keys(list, t, prop, def) : def;
  // camera keys orbit `at`, or a point on a creature: on: 'lion.head' | 'lion.body' | 'lion.withers' | 'lion.paws' | 'lion.tail',
  // plus `off` [x, y, z]. The point is read at the start of the shot (a steady aim, no jitter from the walk).
  const camAt = (shot, lt) => {
    const c = shot.cam;
    let at = c.some(k => k.at) ? [0, 1, 2].map(i => keys(c.filter(k => k.at).map(k => ({ t: k.t, v: k.at[i], e: k.e })), lt, 'v')) : [0, .6, 0];
    const on = c.find(k => k.on);
    if (on) {
      const [who, where] = on.on.split('.'), cr = spec.cast[who];
      const p = cr.body.pose(creatureState(who, cr, shot, shot.t0 + (on.t || 0)));
      const pt = where === 'head' ? p.headPos : where === 'withers' ? p.withers : where === 'tail' ? (p.parts.find(x => x.type === 'tail') || {}).pts?.at(-1) || p.root
        : where === 'paws' ? v3.lerp(p.parts.find(x => x.name === 'FL')?.pts[3] || p.root, p.parts.find(x => x.name === 'FR')?.pts[3] || p.root, .5)
        : v3.lerp(p.root, p.withers || p.root, .5);
      const off = c.some(k => k.off) ? [0, 1, 2].map(i => keys(c.filter(k => k.off).map(k => ({ t: k.t, v: k.off[i] })), lt, 'v')) : [0, 0, 0];
      at = v3.add(pt, off);
    }
    return { at, yaw: kv(c, lt, 'yaw', 0), pitch: kv(c, lt, 'pitch', 0), dist: kv(c, lt, 'dist', 4), fov: kv(c, lt, 'fov', 30), roll: kv(c, lt, 'roll', 0) };
  };
  const PROPS = { e: 1, s: 0, crouch: 0, rear: 0, look: 0, nod: 0, roar: 0, jaw: null, tailSwish: .4, fluid: null, beat: 1, finFlap: 0, y: null, pitch: 0, roll: 0, heading: null, x: null, z: null };
  function creatureState(name, c, shot, t) {
    const lt = t - shot.t0, own = shot.track && shot.track[name];
    const list = own || c.track || [], tt = own ? lt : t;
    const st = {}; for (const [k, d] of Object.entries(PROPS)) st[k] = kv(list, tt, k, d);
    const dt = 1 / 120; const s1 = kv(list, tt + dt, 's', 0), s0 = kv(list, tt - dt, 's', 0);
    st.speed = (s1 - s0) / (2 * dt);
    const hd = (st.heading ?? c.heading ?? 0) * Math.PI / 180, at = c.at || [0, 0];
    st.heading = hd;
    st.x = st.x ?? at[0] + Math.cos(hd) * st.s; st.z = st.z ?? at[1] - Math.sin(hd) * st.s;
    if (st.y == null) delete st.y;
    st.pitch = st.pitch * Math.PI / 180; st.roll = st.roll * Math.PI / 180;
    st.t = t;
    return st;
  }
  function frameAt(t) {
    const shot = shotAt(t), lt = t - shot.t0;
    const cam = camera(camAt(shot, lt), W, H, M);
    const creatures = [];
    for (const [name, c] of Object.entries(spec.cast)) {
      const st = creatureState(name, c, shot, t);
      if (q.has('e')) st.e = +q.get('e');            // refs.mjs: freeze the emergence (the translucent pre-form reference)
      // (with a frozen e the whole body is at the same stage, so a reference frame shows the WHOLE pre-form)
      const look = q.has('e') ? { ...(c.look || {}), sweep: { from: 'all' } } : c.look;
      creatures.push({ name, c, st, pose: c.body.pose(st), look, e: st.e, seed: c.seed || 1 });
    }
    // water: start from the film defaults, then the emergence mapping of the most-emerged creature, then shot keys
    const lead = creatures.reduce((a, b) => (b.e > (a ? a.e : -1) ? b : a), null);
    const w = spec.water || {}, sw = shot.water || [];
    const fluid = q.has('fluid') ? +q.get('fluid') : kv(sw, lt, 'fluid', w.fluid ?? .5);
    const ws = { ...WATER_DEFAULTS, ...w, ...waterState(lead ? lead.e : 0, fluid) };
    for (const k of ['len', 'warp', 'smoke', 'body', 'ink', 'rise', 'speed', 'scale', 'fade', 'specks', 'wisp', 'detail']) if (sw.some(o => o[k] !== undefined)) ws[k] = keys(sw, lt, k);
    if (off.has('smoke')) ws.smoke = 0;
    if (off.has('flow')) { ws.len = 0; ws.warp = 0; }
    if (off.has('grain')) ws.grain = 0;
    // a horizon that follows the camera: where the ground plane at infinity lands on screen
    const hz = clamp(.5 + Math.tan((camAt(shot, lt).pitch) * Math.PI / 180) / Math.tan(camAt(shot, lt).fov * Math.PI / 360) * .5, -.5, 1.5);
    return { shot, lt, cam, creatures, ws: { ...ws, horizon: w.horizon ?? hz, t, seed: spec.seed || 0, cam: cam.uni } };
  }
  let last = -1;
  function seek(t) {
    t = clamp(+t, 0, DURATION - 1e-6); last = t;
    const fr = frameAt(t);
    paintForm(fctx, { cam: fr.cam, creatures: fr.creatures, ground: spec.ground });
    water.render(form, fr.ws);
    return fr;
  }
  function runChecks(t) {
    const out = [], fr = frameAt(t), prev = t >= 1 / FPS ? frameAt(t - 1 / FPS) : null;
    for (const c of fr.creatures) {
      const p = prev && prev.shot === fr.shot ? prev.creatures.find(d => d.name === c.name) : null;
      for (const e of checkPose(c.c.body, c.pose, p && p.pose, c.c.tolerance || {})) out.push(`${c.name}: ${e}`);
    }
    if (spec.checks) for (const e of spec.checks(t, fr) || []) out.push(e);
    return out;
  }

  // ---------- page ----------
  const film = { spec, shots, DURATION, FPS, W, H, seek, frameAt, runChecks, canvas, form, water };
  function start() {
    document.body.style.cssText = 'margin:0;background:#0d0d0e;overflow:hidden;';
    document.body.appendChild(canvas);
    if (q.has('form')) { document.body.appendChild(form); form.style.cssText = 'position:fixed;left:0;top:0;width:30vw;opacity:.9;border:1px solid #444'; }
    Object.assign(window, { seek, DURATION, FPS, SIZE: { W, H }, film, runChecks, shotAt: (t) => { const s = shotAt(t); return { name: s.name, t0: s.t0, t1: s.t1, index: shots.indexOf(s) }; } });
    if (render || q.has('t')) {
      canvas.style.cssText = 'display:block;';
      if (q.has('t')) seek(+q.get('t'));
      window.__ready = true; return film;
    }
    // live: fit the window, loop, space/click pause, ← → by shot, ♪ plays the score in sync
    const fit = () => { const k = Math.min(innerWidth / W, innerHeight / H); canvas.style.cssText = `display:block;position:absolute;left:${(innerWidth - W * k) / 2}px;top:${(innerHeight - H * k) / 2}px;width:${W * k}px;height:${H * k}px;cursor:pointer`; };
    fit(); addEventListener('resize', fit);
    const ui = document.createElement('div');
    ui.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:22px;display:flex;align-items:center;gap:8px;padding:0 10px;font:12px system-ui;color:#bbb;background:linear-gradient(transparent,rgba(0,0,0,.45))';
    ui.innerHTML = '<button aria-label="소리" style="font:12px system-ui;background:none;border:1px solid #777;color:#ddd;border-radius:3px;padding:0 6px;cursor:pointer">♪</button><div style="flex:1;height:3px;background:rgba(255,255,255,.18);position:relative;cursor:pointer"><i style="position:absolute;left:0;top:0;bottom:0;background:#ddd;width:0"></i></div><span>0.0</span>';
    document.body.appendChild(ui);
    const [btn, bar, lab] = ui.children, fill = bar.firstChild;
    let playing = true, clock = 0, prevNow = null, actx = null, src = null, abuf = null;
    const sound = async (on) => {
      if (src) { try { src.stop(); } catch { } src = null; }
      if (!on || !spec.score) return;
      if (!actx) { actx = new AudioContext(); const { renderScore } = await import('./score.js'); const [L, R] = renderScore(spec.score, actx.sampleRate, DURATION); abuf = actx.createBuffer(2, L.length, actx.sampleRate); abuf.copyToChannel(L, 0); abuf.copyToChannel(R, 1); }
      src = actx.createBufferSource(); src.buffer = abuf; src.loop = true; src.connect(actx.destination); src.start(0, clock % DURATION);
    };
    let soundOn = false;
    btn.onclick = (e) => { e.stopPropagation(); soundOn = !soundOn; btn.style.background = soundOn ? '#ddd' : 'none'; btn.style.color = soundOn ? '#111' : '#ddd'; sound(soundOn && playing); };
    bar.onclick = (e) => { e.stopPropagation(); const r = bar.getBoundingClientRect(); clock = (e.clientX - r.left) / r.width * DURATION; if (soundOn && playing) sound(true); };
    const toggle = () => { playing = !playing; if (soundOn) sound(playing); };
    canvas.onclick = toggle;
    addEventListener('keydown', (e) => {
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { const s = shotAt(clock), i = shots.indexOf(s) + (e.code === 'ArrowRight' ? 1 : -1); clock = shots[(i + shots.length) % shots.length].t0; if (soundOn && playing) sound(true); }
    });
    const loop = (now) => {
      if (prevNow != null && playing) clock = (clock + Math.min(.1, (now - prevNow) / 1000)) % DURATION;
      prevNow = now;
      seek(clock); fill.style.width = (clock / DURATION * 100) + '%'; lab.textContent = clock.toFixed(1) + ' / ' + DURATION.toFixed(1);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    window.__ready = true;
    return film;
  }
  film.start = start;
  return film;
}

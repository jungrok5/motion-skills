// shadow-critter-vignette · vignette.js — one locked shot, a few beats, the clock, the checks, the page contract.
// A vignette is a painted room (plates painted once), live bits of the room (dust in the light, a blinking lamp, a thing
// that moves when pressed), and a cast of critters whose pose is a function of time. Every frame is seek(t): nothing
// carries from one frame to the next, so any frame renders alone and the same t is the same picture.
import * as P from './paint.js';
import { drawCritter, JOINTS } from './critter.js';
import * as K from './room.js';

export const EASE = {
  smooth: P.smooth,
  in: t => t * t * t,
  out: t => 1 - Math.pow(1 - t, 3),
  snap: t => 1 - Math.pow(1 - t, 5),           // a press, a flinch: there almost at once
  back: t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }, // overshoot and settle
  hold: t => (t < 1 ? 0 : 1),
};
const facingOf = (dX, dZ) => Math.atan2(dX, -dZ);
let UID = 0; // each pose function names its plants uniquely, so the drift check never mixes two walks
const rightOf = yaw => [-Math.cos(yaw), -Math.sin(yaw)];   // the critter's own right, on the floor (X, Z)

/**
 * walk(C, o) — walk on the floor from o.from [X, Z] to o.to [X, Z] between o.t0 and o.t1.
 * Distance-based gait: the stride is snapped so both feet finish planted; easing the speed never slides a foot.
 * o: stride (world, two steps; default 1.25 a), lift, bob, swing, easeIn, easeOut, yaw (override facing, e.g. a back-step)
 * Returns pose(t) with .contacts [{ t, foot, X, Z }] (heel strikes) and .spec.
 */
export function walk(C, o) {
  const a = C.a, [X0, Z0] = o.from, [X1, Z1] = o.to, dX = X1 - X0, dZ = Z1 - Z0, L = Math.hypot(dX, dZ) || 1, ux = dX / L, uz = dZ / L;
  const yaw = o.yaw ?? facingOf(ux, uz), [rx, rz] = rightOf(yaw), gap = C.geom().hipGap;
  const n = Math.max(2, Math.round(L / ((o.stride ?? 1.6 * a) / 2))), h = L / n, stride = 2 * h, id = 'w' + (++UID);
  // the pelvis sits low enough that both legs reach the floor at double support (feet half a step either side)
  const G = C.geom(), legL = (C.spec.legs.thigh + C.spec.legs.shin) * a, sink = Math.max(0, -G.hipY - Math.sqrt(Math.max(0, (legL * .975) ** 2 - (h * .8) ** 2)));
  const lift = o.lift ?? .22 * a, bob = o.bob ?? .07 * a, easeIn = o.easeIn ?? .2, easeOut = o.easeOut ?? .22;
  const dAt = t => { const u = P.clamp((t - o.t0) / (o.t1 - o.t0)), vmax = 1 / (1 - (easeIn + easeOut) / 2); let s;
    if (u < easeIn) s = vmax * u * u / (2 * easeIn); else if (u > 1 - easeOut) { const w = 1 - u; s = 1 - vmax * w * w / (2 * easeOut); } else s = vmax * (u - easeIn / 2);
    return P.clamp(s) * L; };
  // the steps: a short first step (right foot), alternating full steps, then the trailing foot closes beside the other.
  // Step m swings while the pelvis travels from a to b; the foot lands half a step ahead of the pelvis.
  const steps = [];
  for (let m = 0; m <= n; m++) steps.push({ foot: m % 2 === 0 ? 1 : 0, from: m === 0 ? 0 : (m - 1) * h, to: m === n ? L : (m + 1) * h, a: Math.max(0, (m - .3) * h), b: m === n ? L : (m + .5) * h, m });
  // fix the closing step: it starts where that foot last landed
  steps[n].from = (n - 1) * h; steps[n].a = (n - .42) * h;
  const footAt = (d, i) => {
    let along = 0, lf = 0, planted = true, key = id + 'start' + i;
    for (const S of steps) { if (S.foot !== i) continue; if (d >= S.b) { along = S.to; key = id + 'm' + S.m; } else if (d > S.a) { const w = (d - S.a) / (S.b - S.a); along = P.lerp(S.from, S.to, P.smooth(w)); lf = Math.sin(Math.PI * w) * lift * (S.m === n || S.m === 0 ? .7 : 1); planted = false; break; } else break; }
    const side = i ? 1 : -1;
    return { X: X0 + ux * along + rx * gap * side, Z: Z0 + uz * along + rz * gap * side, lift: lf, planted, k: key };
  };
  const pose = t => {
    const d = dAt(t), feet = [footAt(d, 0), footAt(d, 1)];
    const ph = d / stride, m = P.clamp(Math.min(d, L - d) / (stride * .35)), sw = Math.sin((d / h) * Math.PI) * (o.swing ?? .45) * m;
    const bb = (.5 + .5 * Math.cos(2 * Math.PI * (d / h - .5))) * bob * m; void ph; // lowest (largest y) at each heel strike
    return { X: X0 + ux * d, Z: Z0 + uz * d, yaw, feet, pelvis: [0, bb - bob * m * .5 + sink * P.smooth(P.clamp(Math.min(t - o.t0 + .12, o.t1 + .12 - t) / .24))], lean: .07 * m, arms: { L: { a: sw, e: .5, out: .12 }, R: { a: -sw, e: .5, out: .12 } }, walking: t > o.t0 && t < o.t1, moveDir: [ux, uz] };
  };
  const contacts = []; let prev = null;
  for (let t = o.t0; t <= o.t1 + 1 / 240; t += 1 / 240) { const p = pose(t); if (prev) p.feet.forEach((f, i) => { const q = prev.feet[i]; if (f.planted && !q.planted) contacts.push({ t: +t.toFixed(4), foot: i, X: f.X, Z: f.Z }); }); prev = p; }
  pose.contacts = contacts; pose.spec = { kind: 'walk', ...o, yaw, stride, dir: [ux, uz], steps: n + 1 };
  return pose;
}

/** stand(C, o) — standing at [X, Z] facing yaw; the weight drifts a little over planted feet */
export function stand(C, o) {
  const gap = C.geom().hipGap, yaw = o.yaw ?? 0, [rx, rz] = rightOf(yaw), [X, Z] = o.at;
  const feet = o.feet || [0, 1].map(i => ({ X: X + rx * gap * (i ? 1 : -1) * (o.wide ?? 1), Z: Z + rz * gap * (i ? 1 : -1) * (o.wide ?? 1), lift: 0, planted: true, k: 'stand' + (++UID) + i }));
  const pose = t => ({ X, Z, yaw, feet, pelvis: [Math.sin(t * .7 + (o.seed || 0)) * .025 * C.a, 0], arms: { L: { a: .1, e: .65, out: .16 }, R: { a: .1, e: .65, out: .16 } } });
  pose.spec = { kind: 'stand', ...o, yaw }; pose.contacts = [];
  return pose;
}

/**
 * turn(C, o) — turn on the spot at [X, Z] from yaw o.from to o.to between t0 and t1, in o.steps steps (one foot at a time;
 * the planted foot never moves). Default steps: one per ~70°. Heel strikes become footsteps.
 */
export function turn(C, o) {
  const gap = C.geom().hipGap, [X, Z] = o.at, d = o.to - o.from, n = o.steps ?? Math.max(2, Math.ceil(Math.abs(d) / 1.2)), T = o.t1 - o.t0;
  const yawAfter = k => o.from + d * Math.min(1, k / n), id = 't' + (++UID);
  const footPos = (i, yaw) => { const [rx, rz] = rightOf(yaw); return { X: X + rx * gap * (i ? 1 : -1), Z: Z + rz * gap * (i ? 1 : -1) }; };
  // step k moves foot (first + k) % 2; the foot on the side we turn towards goes first
  const first = d > 0 ? 1 : 0;
  const pose = t => {
    const u = P.clamp((t - o.t0) / T) * n, k = Math.min(n - 1, Math.floor(u)), w = u - k, mover = (first + k) % 2;
    const feet = [0, 1].map(i => {
      // this foot's yaw: after its last completed step
      let last = -1; for (let j = 0; j < (u >= n ? n : k); j++) if ((first + j) % 2 === i) last = j;
      if (u >= n) { const p = footPos(i, o.to); return { ...p, lift: 0, planted: true, k: id + 'end' + i }; }
      const yi = last < 0 ? o.from : yawAfter(last + 1);
      if (i === mover) { const e = P.smooth(w), y2 = P.lerp(yi, yawAfter(k + 1), e), p = footPos(i, y2); return { ...p, lift: Math.sin(Math.PI * w) * .14 * C.a, planted: w <= 0 || w >= 1, k: id + k + i }; }
      return { ...footPos(i, yi), lift: 0, planted: true, k: id + (last + 1) + i };
    });
    const yaw = P.lerp(o.from, o.to, P.smooth(P.clamp((t - o.t0) / T)));
    return { X, Z, yaw, feet, pelvis: [0, Math.sin(Math.PI * (u % 1)) * .04 * C.a * (u < n ? 1 : 0)], arms: { L: { a: .14, e: .6, out: .2 }, R: { a: .14, e: .6, out: .2 } }, turning: t > o.t0 && t < o.t1 };
  };
  const contacts = []; for (let k = 0; k < n; k++) contacts.push({ t: +(o.t0 + (k + 1) * T / n).toFixed(4), foot: (first + k) % 2, X, Z });
  pose.contacts = contacts; pose.spec = { kind: 'turn', ...o, steps: n };
  return pose;
}

/**
 * keyed(base, keys) — layer keyed body moves over a base pose. keys: [{ t, ease, lean, crouch, hop, tiptoe, squash,
 * arms: { L, R }, head: { turn, tilt, nod, gaze, lid }, antic, big, settle }]. Values ease into each key with its `ease`
 * (EASE name; default smooth). A big move is antic (the gather, the other way) → big → settle (past rest and back):
 * check.mjs fails a `big` key with no `antic` key in the 0.6 s before or no `settle` key after.
 */
export function keyed(base, keys) {
  const at = (t, get) => {
    if (t <= keys[0].t) return get(keys[0]);
    for (let i = 1; i < keys.length; i++) if (t <= keys[i].t) { const A = keys[i - 1], B = keys[i], e = EASE[B.ease || 'smooth'] || P.smooth; return lerpAny(get(A), get(B), e(P.clamp((t - A.t) / (B.t - A.t)))); }
    return get(keys[keys.length - 1]);
  };
  const pose = t => {
    const p = base(t), out = { ...p };
    out.lean = (p.lean || 0) + at(t, k => k.lean ?? 0);
    const cr = at(t, k => k.crouch ?? 0), hop = at(t, k => k.hop ?? 0);
    out.pelvis = [(p.pelvis?.[0] || 0) + at(t, k => k.shift ?? 0), (p.pelvis?.[1] || 0) + cr - hop];
    out.tiptoe = Math.max(p.tiptoe || 0, at(t, k => k.tiptoe ?? 0)); out.squash = at(t, k => k.squash ?? 0);
    if (hop > .01) { out.feet = out.feet.map(f => ({ ...f, lift: (f.lift || 0) + hop, planted: false, airborne: true })); }
    // a hand target may be a function of time (a hand that rides a moving thing: a book being pulled, a lever going down)
    const arms = at(t, k => k.arms ? Object.fromEntries(Object.entries(k.arms).map(([w, A]) => [w, A && typeof A.target === 'function' ? { ...A, target: A.target(t) } : A])) : null);
    if (arms) {
      out.arms = { L: { ...(p.arms?.L || {}), ...(arms.L || {}) }, R: { ...(p.arms?.R || {}), ...(arms.R || {}) } };
      // a hand is "on" its target (and checked for reaching it) only between two keys that both put it there
      let i = keys.findIndex(k => k.t >= t); if (i < 0) i = keys.length - 1; const KA = keys[Math.max(0, i - 1)], KB = keys[i];
      for (const w of ['L', 'R']) { const on = k => !!(k.arms?.[w]?.target) && (k.arms[w].w ?? 1) >= .98; if (out.arms[w].target) out.arms[w].on = on(KA) && on(KB); }
    }
    const head = at(t, k => k.head || null); if (head) out.head = { ...(p.head || {}), ...head };
    return out;
  };
  pose.spec = { ...base.spec, keys }; pose.contacts = base.contacts;
  return pose;
}
function lerpAny(a, b, u) {
  if (a == null) return b; if (b == null) return a;
  if (typeof a === 'number' && typeof b === 'number') return P.lerp(a, b, u);
  if (Array.isArray(a) && Array.isArray(b)) return a.map((x, i) => lerpAny(x, b[i], u));
  if (typeof a !== 'object' || typeof b !== 'object') return u < .5 ? a : b;
  const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k], y = b[k];
    if (k === 'w' || typeof x === 'number' || typeof y === 'number') o[k] = lerpAny(x ?? (k === 'w' ? 0 : typeof y === 'number' ? 0 : y), y ?? (k === 'w' ? 0 : typeof x === 'number' ? 0 : x), u);
    else if (k === 'target') o[k] = x && y ? lerpAny(x, y, u) : (x || y);
    else o[k] = lerpAny(x, y, u);
  }
  return o;
}
/** run poses in sequence: [[tEnd, pose], …] — the next takes over after tEnd */
export function seq(parts) {
  const f = t => { for (const [te, fn] of parts) if (t <= te) return fn(t); return parts[parts.length - 1][1](t); };
  f.contacts = parts.flatMap(([, fn]) => fn.contacts || []); f.parts = parts; f.spec = { kind: 'seq' };
  return f;
}

/** life(o) — what keeps a critter alive at rest: breath, irregular blinks. o: seed, period (s), blinkEvery [min, max] */
export function life(o = {}) {
  const r = P.rng((o.seed || 1) * 977 + 3), blinks = [];
  for (let t = .6 + r() * 1.2; t < 120; t += (o.blinkEvery?.[0] ?? 1.6) + r() * ((o.blinkEvery?.[1] ?? 4.2) - (o.blinkEvery?.[0] ?? 1.6))) { blinks.push(t); if (r() < .18) blinks.push(t + .28); }
  const period = o.period ?? 2.7;
  return { blinks, period, at: t => { let blink = 0; for (const b of blinks) { const d = t - b; if (d > -.02 && d < .16) blink = Math.max(blink, Math.sin(P.clamp((d + .02) / .18) * Math.PI)); } return { breath: Math.sin(t * 2 * Math.PI / period) + .25 * Math.sin(t * 2 * Math.PI / (period * 2.3) + 1), blink }; } };
}

export class Vignette {
  constructor(o = {}) {
    this.W = o.W || 1080; this.H = o.H || 1440; this.FPS = o.fps || 24; this.title = o.title || ''; this.caption = o.caption || ''; this.seed = o.seed || 1;
    this.dur = o.dur || 10; this.room = o.room; this.plates = (o.plates || []).map(p => ({ z: 0, ...p })); this.fx = (o.fx || []).map(f => ({ z: 1, ...f }));
    this.cast = (o.cast || []).map((c, i) => ({ z: 5, id: 'c' + i, life: life({ seed: i + 1 + this.seed }), ...c, life: c.life || life({ seed: i + 1 + this.seed }) }));
    this.light = o.light; this.sound = o.sound || {}; this.beats = o.beats || []; this.grade = o.grade ?? {}; this.fadeIn = o.fadeIn ?? .5; this.fadeOut = o.fadeOut ?? .9; this.bg = o.bg || '#2a1e18';
    this.shadow = o.shadow ?? .55; this.rim = o.rim ?? .55; this.scale = 1;
  }
  get DURATION() { return this.dur; }
  setScale(s) { this.scale = s; for (const p of this.plates) p._c = null; this._grade = null; }
  plate(p) {
    if (p._c) return p._c; const sc = this.scale * (p.res || 1), c = P.canvas(this.W * sc, this.H * sc), g = c.getContext('2d');
    g.setTransform(sc, 0, 0, sc, 0, 0); p.paint(g, { R: this.room, K, P, W: this.W, H: this.H }); p._c = c; return c;
  }
  /** the full pose at t: base pose + life (breath, blinks) + lagging head (eyes lead, head follows) + tail / cloth lag */
  poseAt(cm, t) {
    const p = { ...cm.pose(t) }, L = cm.life.at(t);
    p.breath = L.breath; p.head = { ...(p.head || {}) }; p.head.blink = Math.max(L.blink, p.head.blink || 0);
    // the head follows the eyes: its turn / tilt are the keyed values averaged over the last 0.2 s
    let tu = 0, ti = 0, n = 0; for (let k = 0; k < 6; k++) { const q = cm.pose(t - k * .04).head || {}; tu += q.turn || 0; ti += q.tilt || 0; n++; }
    p.head.rawTurn = p.head.turn || 0; p.head.turn = tu / n; p.head.tilt = ti / n;
    if (p.head.gaze == null) p.head.gaze = [P.clamp((p.head.rawTurn - p.head.turn) * 2, -1, 1), 0];
    // secondary: tail and cloth trail the pelvis
    const q0 = cm.pose(t - .08), q1 = cm.pose(t - .16), R = this.room;
    const sx = o => R.floor(o.X, o.Z)[0] + (o.pelvis?.[0] || 0), sy = o => (o.pelvis?.[1] || 0);
    const vx = (sx(p) - sx(q0)) / .08, vx2 = (sx(q0) - sx(q1)) / .08, vy = (sy(p) - sy(q0)) / .08;
    p.tail = (p.tail || 0) + P.clamp(-(vx * .6 + vx2 * .4) / 260, -.8, .8) * (Math.sign(Math.sin(p.yaw)) || 1) + P.clamp(vy / 300, -.5, .5) + Math.sin(t * 1.9 + cm.life.period) * .12;
    p.flare = P.clamp(-(vx2) / 40, -12, 12) + P.clamp(vy / 30, -6, 6);
    return p;
  }
  draw(ctx, T) {
    const sc = this.scale, t = Math.max(0, Math.min(this.dur, T));
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = this.bg; ctx.fillRect(0, 0, this.W * sc, this.H * sc);
    const layers = [...this.plates.map(p => ({ kind: 'plate', z: p.z, p })), ...this.fx.map(f => ({ kind: 'fx', z: f.z, f })), ...this.cast.map(c => ({ kind: 'cast', z: typeof c.z === 'function' ? c.z(t) : c.z, c }))].sort((a, b) => a.z - b.z);
    const joints = [];
    for (const L of layers) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (L.kind === 'plate') ctx.drawImage(this.plate(L.p), 0, 0);
      else if (L.kind === 'fx') { ctx.setTransform(sc, 0, 0, sc, 0, 0); L.f.draw(ctx, t, { R: this.room, P, K, W: this.W, H: this.H, film: this }); }
      else { ctx.setTransform(sc, 0, 0, sc, 0, 0); const p = this.poseAt(L.c, t); const j = drawCritter(ctx, L.c.actor, p, { room: this.room, light: this.light, shadow: this.shadow, rim: this.rim, scale: sc }); joints.push({ c: L.c, p, j }); }
    }
    // one light over everything (the critter included): warm, darker corners
    if (this.grade) { if (!this._grade) { const c = P.canvas(this.W * sc, this.H * sc), g = c.getContext('2d'); g.setTransform(sc, 0, 0, sc, 0, 0); g.fillStyle = '#fff'; g.fillRect(0, 0, this.W, this.H); K.grade(g, this.W, this.H, this.grade); this._grade = c; } ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(this._grade, 0, 0); ctx.restore(); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const fade = t < this.fadeIn ? 1 - P.smooth(t / this.fadeIn) : this.dur - t < this.fadeOut ? 1 - (this.dur - t) / this.fadeOut : 0;
    if (fade > 0) { ctx.globalAlpha = fade; ctx.fillStyle = this.bg; ctx.fillRect(0, 0, this.W * sc, this.H * sc); ctx.globalAlpha = 1; }
    return joints;
  }
  /** footsteps + the piece's sound events, in time order */
  events() {
    const ev = [];
    for (const cm of this.cast) for (const k of (cm.pose.contacts || [])) if (k.t >= 0 && k.t < this.dur) ev.push({ t: k.t, type: 'step', surface: this.sound.surface || 'wood', gain: cm.stepGain ?? .6, who: cm.actor.name, x: this.room.floor(k.X, k.Z)[0] });
    for (const [t, type, opt] of (this.sound.events || [])) ev.push({ t, type, ...(opt || {}) });
    return ev.sort((a, b) => a.t - b.t);
  }

  // ── checks ──
  /** body rules every frame: knees fold back in profile and stay in range, elbows in range, feet reached, planted feet do
   *  not drift on screen, the neck turns within range, walkers face the way they move, hands reach the targets they key */
  rig(step = 1 / 24) {
    const out = [], add = (name, value, limit, ok) => out.push({ name, value: +(+value).toFixed(3), limit, ok });
    const c = P.canvas(this.W, this.H), ctx = c.getContext('2d');
    for (const cm of this.cast) {
      const who = cm.actor.name; let handT = '', kneeBad = 0, kneeMax = 0, elbowMax = 0, reachMax = 0, reachT = 0, driftT = 0, drift = 0, neckMax = 0, faceBad = 0, handMiss = 0; const plant = [new Map(), new Map()];
      for (let t = 0; t < this.dur; t += step) {
        const p = this.poseAt(cm, t), j = drawCritter(ctx, cm.actor, p, { room: this.room, light: this.light, shadow: 0, rim: 0 });
        for (let i = 0; i < 2; i++) {
          kneeMax = Math.max(kneeMax, j.kneeBend[i]); if (j.prof > .55 && j.kneeBend[i] > .12 && j.kneeCross[i] < 0) kneeBad++;
          if (j.reach[i] > reachMax) { reachMax = j.reach[i]; reachT = t; }
          const f = p.feet?.[i]; if (f && f.planted && !f.airborne) { const key = String(f.k), a = j.toes[i], m = plant[i]; if (m.has(key)) { const b = m.get(key), dd = Math.hypot(a[0] - b[0], a[1] - b[1]); if (dd > drift) { drift = dd; driftT = t; } } else m.set(key, a); }
        }
        elbowMax = Math.max(elbowMax, ...j.elbowBend);
        neckMax = Math.max(neckMax, Math.abs(p.head?.rawTurn || 0));
        if (p.walking && p.moveDir) { const [ux, uz] = p.moveDir, fx = Math.sin(p.yaw), fz = -Math.cos(p.yaw); if (ux * fx + uz * fz < .5) faceBad++; }
        for (const w of ['L', 'R']) { const A = p.arms?.[w]; if (A?.target && (A.w ?? 1) > .98 && A.on !== false) { const h = j.hands[w === 'L' ? 0 : 1]; const miss = Math.hypot(h[0] - A.target[0], h[1] - A.target[1]); if (miss > handMiss) { handMiss = miss; handT = `${w} at ${t.toFixed(2)} s`; } } }
      }
      add(`${who}: knees fold back in profile (frames wrong)`, kneeBad, '0', kneeBad === 0);
      add(`${who}: knee bend max (rad)`, kneeMax, `≤ ${JOINTS.knee[1]}`, kneeMax <= JOINTS.knee[1]);
      add(`${who}: elbow bend max (rad)`, elbowMax, `≤ ${JOINTS.elbow[1]}`, elbowMax <= JOINTS.elbow[1]);
      add(`${who}: legs reach their feet (max reach / leg length, worst at ${reachT.toFixed(2)} s)`, reachMax, '≤ 1.0', reachMax <= 1.0 + 1e-6);
      add(`${who}: planted foot drift on screen (px, worst at ${driftT.toFixed(2)} s)`, drift, '≤ 1.5', drift <= 1.5);
      add(`${who}: neck turn max (rad)`, neckMax, `≤ ${JOINTS.neckTurn}`, neckMax <= JOINTS.neckTurn);
      add(`${who}: walks the way it faces (frames wrong)`, faceBad, '0', faceBad === 0);
      add(`${who}: hands reach their keyed targets (px off${handT ? ', worst ' + handT : ''})`, handMiss, '≤ 3', handMiss <= 3);
    }
    return out;
  }
  /** motion rules: an idle that breathes and blinks, big moves gather and recover, turns are stepped, walks make steps,
   *  and the beats of the gag are there */
  motionReport() {
    const out = [], add = (name, value, limit, ok) => out.push({ name, value: +(+value).toFixed(3), limit, ok });
    for (const cm of this.cast) {
      const who = cm.actor.name, bl = cm.life.blinks.filter(t => t < this.dur).length, need = Math.max(1, Math.floor(this.dur / 4.5));
      add(`${who}: blinks`, bl, `≥ ${need}`, bl >= need);
      const parts = cm.pose.parts ? cm.pose.parts.map(x => x[1]) : [cm.pose];
      for (const fn of parts) {
        const keys = fn.spec?.keys || [];
        for (const k of keys.filter(k => k.big)) {
          const antic = keys.some(q => q.antic && q.t < k.t && k.t - q.t <= .6 + 1e-6), settle = keys.some(q => q.settle && q.t > k.t);
          add(`${who}: big move at ${k.t}s gathers first (antic ≤ 0.6 s before)`, antic ? 1 : 0, '1', antic);
          add(`${who}: big move at ${k.t}s recovers (settle after)`, settle ? 1 : 0, '1', settle);
        }
        if (fn.spec?.kind === 'turn') { const need2 = Math.ceil(Math.abs(fn.spec.to - fn.spec.from) / 1.25); add(`${who}: turn at ${fn.spec.t0}s is stepped (steps)`, fn.spec.steps, `≥ ${need2}`, fn.spec.steps >= need2); }
      }
      const c = (cm.pose.contacts || []).filter(k => k.t < this.dur).sort((a, b) => a.t - b.t), iv = c.slice(1).map((x, i) => x.t - c[i].t).filter(x => x > 1e-3);
      add(`${who}: footsteps`, c.length, '≥ 2', c.length >= 2);
      if (iv.length) add(`${who}: steps never closer than 0.16 s`, Math.min(...iv), '≥ 0.16', Math.min(...iv) >= .16);
    }
    const names = this.beats.map(b => b.name);
    for (const need of ['try', 'wait', 'after']) add(`gag has a "${need}" beat`, names.includes(need) ? 1 : 0, '1', names.includes(need));
    const big = this.cast.some(cm => (cm.pose.parts || [[0, cm.pose]]).some(([, fn]) => (fn.spec?.keys || []).some(k => k.big)));
    add('the second try is bigger (a keyed big move exists)', big ? 1 : 0, '1', big);
    add('one line of caption', this.caption ? this.caption.length : 0, '1–60 chars', !!this.caption && this.caption.length <= 60 && !/\n/.test(this.caption));
    add('length (s)', this.dur, '7–16', this.dur >= 7 && this.dur <= 16);
    return out;
  }
  /** style rules measured on the painted room alone: the window is the brightest place, the paint is never flat */
  styleReport() {
    const out = [], add = (name, value, limit, ok) => out.push({ name, value: +(+value).toFixed(3), limit, ok });
    const sc = .25, c = P.canvas(this.W * sc, this.H * sc), g = c.getContext('2d'); const old = this.scale; this.setScale(sc);
    for (const p of this.plates) g.drawImage(this.plate(p), 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; this.setScale(old);
    let blocks = 0, flat = 0; for (let y = 0; y + 6 < c.height; y += 9) for (let x = 0; x + 6 < c.width; x += 9) { let lo = 1e9, hi = -1e9; for (let yy = 0; yy < 6; yy++) for (let xx = 0; xx < 6; xx++) { const i = ((y + yy) * c.width + x + xx) * 4, L = d[i] + d[i + 1] + d[i + 2]; lo = Math.min(lo, L); hi = Math.max(hi, L); } if (lo > 740) continue; blocks++; if (hi - lo < 3) flat++; }
    add('room paint: flat blocks', flat / Math.max(1, blocks), '≤ 0.06', flat / Math.max(1, blocks) <= .06);
    if (this.light) { const lx = Math.round(this.light[0] * sc), ly = Math.round(this.light[1] * sc); let near = 0, n = 0, all = 0, m = 0; for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) { const i = (y * c.width + x) * 4, L = (d[i] + d[i + 1] + d[i + 2]) / 3; all += L; m++; if (Math.hypot(x - lx, y - ly) < c.width * .08) { near += L; n++; } } add('backlight: the window is brighter than the room (ratio)', (near / n) / (all / m), '≥ 1.5', (near / n) / (all / m) >= 1.5); }
    for (const cm of this.cast) { const [r, g2, b] = P.rgb(cm.actor.spec.ink), Y = (.2126 * r + .7152 * g2 + .0722 * b) / 255; add(`${cm.actor.name}: body is ink (luminance)`, Y, '≤ 0.1', Y <= .1); const wear = cm.actor.spec.wear; add(`${cm.actor.name}: one accent colour`, wear && wear.type !== 'none' && typeof wear.color === 'string' ? 1 : 0, '1', !!(wear && (wear.type === 'none' || typeof wear.color === 'string'))); }
    return out;
  }
}

/** cast sheet: the critter turned all the way round, walks both ways, a stepped turn, the big move both ways, faces */
export function castSheet(film, actors, o = {}) {
  const cw = o.cell || 220, ch = Math.round(cw * 1.3), pad = 10, head = 26, rows = [];
  for (const A of actors) {
    const a = A.a, sc = (ch * .6) / (a * 4.7), Z = 1000 / sc, X = 0;
    // a camera per actor: the floor line sits low in the cell, the critter fills about 60 % of its height
    const R = K.makeRoom({ W: cw, H: ch, horizon: ch * .3, vpX: cw / 2, eye: (ch * .86 - ch * .3) / sc, refZ: 1000 });
    const base = { X, Z, arms: { L: { a: .06, e: .2 }, R: { a: .06, e: .2 } } };
    const at = (yaw, extra = {}) => ({ ...stand(A, { at: [X, Z], yaw })(0), ...extra });
    rows.push({ title: `${A.name} · turnaround (front → right → back → left)`, cells: [0, .6, 1.57, 2.4, 3.14, -2.4, -1.57, -.6].map(y => ({ A, Z, R, label: `yaw ${y}`, pose: at(y) })) });
    for (const dir of [1, -1]) { const w = walk(A, { from: [X - dir * 3 * a, Z], to: [X + dir * 3 * a, Z], t0: 0, t1: 4, easeIn: 0, easeOut: 0 }); rows.push({ title: `${A.name} · walk ${dir > 0 ? '→ right' : '← left'} (phases)`, cells: [1.6, 1.75, 1.9, 2.05, 2.2].map(t => ({ A, Z, R, label: `t ${t}`, pose: w(t) })) }); }
    const tr = turn(A, { at: [X, Z], from: 1.57, to: -1.57, t0: 0, t1: 1.6, steps: 3 });
    rows.push({ title: `${A.name} · stepped turn on the spot (right → left, 3 steps; feet stay planted)`, cells: [0, .3, .55, .8, 1.05, 1.3, 1.6].map(t => ({ A, Z, R, label: `t ${t}`, pose: tr(t) })) });
    for (const dir of [1, -1]) {
      const yaw = dir * 2.5, tg = R.proj(dir * 1.75 * a, a * 2.85, Z), H = dir > 0 ? 'R' : 'L'; // up and out, clear of the head; the near hand
      const mv = keyed(stand(A, { at: [X, Z], yaw }), [{ t: 0 }, { t: .4, crouch: .25 * a, lean: .1, antic: true, arms: { [H]: { a: -.3, e: .6 } } }, { t: .6, ease: 'snap', hop: .3 * a, tiptoe: 1, big: true, arms: { [H]: { target: tg, w: 1 } }, head: { nod: -.4 } }, { t: 1.0, ease: 'back', crouch: .12 * a, settle: true, arms: { [H]: { a: .2, e: .6, w: 0 } } }, { t: 1.4 }]);
      rows.push({ title: `${A.name} · big move ${dir > 0 ? 'right' : 'left'}: rest → gather → jump-reach → land → settle`, cells: [0, .4, .6, 1.0, 1.4].map(t => ({ A, Z, R, label: `t ${t}`, pose: mv(t) })) });
    }
    rows.push({ title: `${A.name} · faces: open · blink · look up · glum lid · side glance`, cells: [{}, { blink: 1 }, { nod: -.5, gaze: [0, -1] }, { lid: .55, gaze: [0, .6] }, { turn: .9, gaze: [1, 0] }].map((h, i) => ({ A, Z, R, label: ['open', 'blink', 'look up', 'glum', 'glance'][i], pose: { ...at(.25), head: h } })) });
  }
  const cols = Math.max(...rows.map(r => r.cells.length)), c = P.canvas(cols * (cw + pad) + pad, rows.length * (ch + head + pad) + pad), g = c.getContext('2d');
  g.fillStyle = '#efe7da'; g.fillRect(0, 0, c.width, c.height);
  rows.forEach((row, ri) => {
    const y = pad + ri * (ch + head + pad); g.fillStyle = '#3a3036'; g.font = '600 14px system-ui, sans-serif'; g.fillText(row.title, pad, y + 18);
    row.cells.forEach((cl, ci) => {
      const x = pad + ci * (cw + pad), cell = P.canvas(cw, ch), cg = cell.getContext('2d');
      cg.drawImage(P.paper(cw, ch, '#f3e9d6', 3), 0, 0);
      const R = cl.R, gy = R.floor(0, cl.Z)[1]; cg.strokeStyle = 'rgba(60,40,30,.25)'; cg.beginPath(); cg.moveTo(0, gy); cg.lineTo(cw, gy); cg.stroke();
      const p = { breath: 0, ...cl.pose }; drawCritter(cg, cl.A, p, { room: R, light: [cw * .5, ch * .05], shadow: .35, rim: 0 });
      g.drawImage(cell, x, y + head); g.strokeStyle = 'rgba(0,0,0,.15)'; g.strokeRect(x + .5, y + head + .5, cw - 1, ch - 1);
      g.fillStyle = 'rgba(40,30,36,.8)'; g.font = '12px system-ui, sans-serif'; g.fillText(cl.label, x + 6, y + head + 15);
    });
  });
  return c;
}

/** mount the vignette on the page. Query: ?render=1 ?scale=.5 ?t=3 ?cast */
export function mount(film, opt = {}) {
  const q = new URLSearchParams(location.search), scale = +(q.get('scale') || (q.has('render') ? 1 : .6));
  film.setScale(scale); document.title = film.title || document.title;
  const st = document.createElement('style');
  st.textContent = 'html,body{margin:0;min-height:100%;background:#1d1612;color:#efe3cf;font:15px/1.5 system-ui,sans-serif}body{display:flex;flex-direction:column;align-items:center;gap:10px;padding:12px 0}canvas{width:min(100vw,calc((100vh - 70px)*3/4));height:auto;display:block}#cap{max-width:min(100vw - 32px,calc((100vh - 70px)*3/4));padding:0 16px;box-sizing:border-box;opacity:.9}#play{position:fixed;left:50%;top:45%;transform:translate(-50%,-50%);font:600 17px system-ui,sans-serif;padding:13px 22px;border-radius:999px;border:0;background:rgba(20,14,12,.82);color:#fff;cursor:pointer}';
  document.head.appendChild(st);
  if (q.has('cast')) { film.setScale(1); const c = castSheet(film, opt.actors || film.cast.map(c => c.actor), { cell: +(q.get('cell') || 220) }); c.style.width = 'min(100vw, ' + c.width + 'px)'; document.body.appendChild(c); window.__film = { film, cast: c }; window.DURATION = 0; window.seek = () => {}; window.__ready = true; return; }
  const cv = P.canvas(film.W * scale, film.H * scale), ctx = cv.getContext('2d'); document.body.appendChild(cv);
  window.DURATION = film.DURATION; window.FPS = film.FPS;
  window.seek = t => film.draw(ctx, Math.max(0, Math.min(film.DURATION - 1e-3, t)));
  window.__film = { film, rig: () => film.rig(), motion: () => film.motionReport(), style: () => film.styleReport(), events: () => film.events(), caption: film.caption, score: opt.score };
  if (q.has('render')) { window.seek(+(q.get('t') || 0)); window.__ready = true; return; }
  if (film.caption) { const p = document.createElement('div'); p.id = 'cap'; p.textContent = film.caption; document.body.appendChild(p); }
  let t0 = performance.now() - (+(q.get('t') || 0)) * 1000, ac = null, acT0 = 0;
  const btn = document.createElement('button'); btn.id = 'play'; btn.textContent = '▶ 소리와 함께 처음부터'; document.body.appendChild(btn);
  btn.onclick = async () => { btn.remove(); if (opt.score) { ac = new AudioContext(); await opt.score.play(ac, film); acT0 = ac.currentTime + .05; } else t0 = performance.now(); };
  const now = () => ac ? ac.currentTime - acT0 : (performance.now() - t0) / 1000;
  const tick = () => { let t = now(); if (t > film.DURATION + 1.2) { if (ac) { ac.close(); ac = null; } t0 = performance.now(); t = 0; } window.seek(t); requestAnimationFrame(tick); };
  window.__ready = true; tick();
}

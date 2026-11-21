// printmade-scene · scene.js — one printed plate brought to life, printed twice.
// A scene is one place in the folded view, painted twice from the same block: plate A (now) and plate B (then, or the
// other state the brief chooses). It holds on A while life moves in it, an ink roller sweeps across and re-prints the
// plate as B, B plays, the roller sweeps back, and A returns with one thing changed — the clue, in the accent colour.
// Every frame is seek(t): nothing carries over between frames, so any frame renders alone and the same t is the same picture.
import * as P from './print.js';
import * as K from './plate.js';
import { drawFigure, JOINTS, KD } from './figure.js';

export const EASE = {
  linear: t => t, smooth: P.smooth, in: t => t * t * t, out: t => 1 - Math.pow(1 - t, 3),
  snap: t => 1 - Math.pow(1 - t, 5),
  back: t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};
let UID = 0;
const rightOf = yaw => [-Math.cos(yaw), Math.sin(yaw)];                 // the figure's own right on the floor (X, D toward viewer)
const trap = (u, a) => { u = P.clamp(u); a = P.clamp(a, .01, .49); return u < a ? u * u / (2 * a) / (1 - a) : u > 1 - a ? (1 - a - (1 - u) * (1 - u) / (2 * a)) / (1 - a) : (a / 2 + u - a) / (1 - a); };
const invert = (f, v) => { let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; f(m) < v ? lo = m : hi = m; } return (lo + hi) / 2; };

/** stance(F, X, G, yaw) — both feet planted under a pelvis at (X, G) facing yaw. The one formula every pose starts and ends on. */
export function stance(F, X, G, yaw) { const [rx, rd] = rightOf(yaw), w = F.geom().hipW / 2; return { L: { X: X - rx * w, G: G - rd * w * KD, lift: 0, yaw }, R: { X: X + rx * w, G: G + rd * w * KD, lift: 0, yaw } }; }
const hang = () => ({ L: { sh: 0, ab: .07, el: .18 }, R: { sh: 0, ab: .07, el: .18 } });

/**
 * walk(F, o) — walk across the floor from o.from [X, G] to o.to [X, G] between o.t0 and o.t1. Distance-based: the feet
 * are planted at fixed points and the body is carried between them, so easing the speed never slides a foot.
 * o: step (px per step, default 0.34 h), lift, lead ('R' | 'L'), accel (0–.45 of the time spent speeding up and slowing
 * down; heavier figures take longer), yaw (override facing; set o.backward: true when a back-step is meant).
 * Returns pose(t) with .contacts (heel strikes), .plants (planted intervals), .kind 'walk'.
 */
export function walk(F, o) {
  const [X0, G0] = o.from, [X1, G1] = o.to, dX = X1 - X0, dD = (G1 - G0) / KD, L = Math.hypot(dX, dD) || 1, ux = dX / L, ud = dD / L;
  const yaw = o.yaw ?? Math.atan2(ux, ud), [rx, rd] = rightOf(yaw), w = F.geom().hipW / 2, lift = o.lift ?? F.h * .045;
  const n = Math.max(1, Math.round(L / (o.step ?? F.h * .34))), h = L / n, N = n + 1, lead = o.lead ?? 'R', other = lead === 'R' ? 'L' : 'R';
  const accel = o.accel ?? (.16 + .06 * (F.mass - 1)), T = o.t1 - o.t0, phi = t => N * trap((t - o.t0) / T, accel), id = 'w' + (++UID);
  const at = (s, side) => { const k = side === 'R' ? 1 : -1; return { X: X0 + ux * s + rx * w * k, G: G0 + (ud * s + rd * w * k) * KD }; };
  // plant s-values per step: step k (1..N) moves foot (k odd → lead) to min(L, k h); the last step closes beside the other
  const plantS = { R: [0], L: [0] }, mover = k => (k % 2 ? lead : other);
  for (let k = 1; k <= N; k++) plantS[mover(k)].push(Math.min(L, k * h));
  const footS = (side, ph) => {        // where that foot is at phase ph, and its lift
    const list = plantS[side]; let idx = 0;
    for (let k = 1; k <= N; k++) { if (mover(k) !== side) continue; if (ph >= k) idx++; else if (ph > k - 1) { const f = ph - (k - 1), w2 = P.smooth(P.clamp((f - .12) / .76)); return { s: P.lerp(list[idx], list[idx + 1], w2), lift: Math.sin(Math.PI * P.clamp((f - .12) / .76)) * lift, swing: true }; } else break; }
    return { s: list[idx], lift: 0, swing: false };
  };
  const pose = t => {
    const ph = P.clamp(phi(t), 0, N), fL = footS('L', ph), fR = footS('R', ph), a = at(fL.s, 'L'), b = at(fR.s, 'R');
    const k = Math.min(N, Math.floor(ph)), f = ph - k, mid = s => s; void mid;
    const pk = kk => { const pL = footS('L', kk), pR = footS('R', kk); return (pL.s + pR.s) / 2; }, sP = P.lerp(pk(k), pk(Math.min(N, k + 1)), f);
    const env = P.smooth(ph / .8) * P.smooth((N - ph) / .8), amp = .32 * env;
    const sL = (lead === 'R' ? -1 : 1) * amp * Math.cos(Math.PI * ph), sR = -sL;
    return { X: X0 + ux * sP, G: G0 + ud * sP * KD, yaw, lean: .05 * env, drop: 0, moving: env > .05,
      feet: { L: { ...a, lift: fL.lift, yaw }, R: { ...b, lift: fR.lift, yaw } },
      arms: { L: { sh: sL, ab: .06, el: .2 + Math.max(0, sL) * .5 }, R: { sh: sR, ab: .06, el: .2 + Math.max(0, sR) * .5 } }, head: { yaw: 0, pitch: .03 * env } };
  };
  pose.kind = 'walk'; pose.t0 = o.t0; pose.t1 = o.t1; pose.spec = { ...o, yaw, steps: N }; pose.F = F;
  pose.contacts = []; pose.plants = [];
  const tAt = ph => o.t0 + T * invert(u => N * trap(u, accel), ph);
  let last = { R: { t: -1e9, s: 0 }, L: { t: -1e9, s: 0 } };
  for (let k = 1; k <= N; k++) {
    const side = mover(k), tc = tAt(k - 1 + .88), s = Math.min(L, k * h), q = at(s, side);
    pose.plants.push({ id: id + side + (k - 2), foot: side, ...at(last[side].s, side), t0: last[side].t, t1: tAt(k - 1 + .12) });
    pose.contacts.push({ t: tc, foot: side, X: q.X, G: q.G }); last[side] = { t: tc, s };
  }
  for (const side of ['L', 'R']) pose.plants.push({ id: id + side + 'end', foot: side, ...at(last[side].s, side), t0: last[side].t, t1: 1e9 });
  return pose;
}

/**
 * turn(F, o) — a stepped turn on the spot: the body turns from o.from to o.to (radians) between o.t0 and o.t1 while each
 * foot lifts and re-plants under the new facing, one after the other. Planted feet never pivot or slide.
 * o: at [X, G], from, to, t0, t1, first ('L' | 'R').
 */
export function turn(F, o) {
  const [X, G] = o.at, a0 = stance(F, X, G, o.from), a1 = stance(F, X, G, o.to), T = o.t1 - o.t0, first = o.first ?? (o.to > o.from ? 'L' : 'R'), second = first === 'R' ? 'L' : 'R', id = 't' + (++UID);
  const win = { [first]: [0, .58], [second]: [.42, 1] }, lift = F.h * .03;
  const pose = t => {
    const u = P.clamp((t - o.t0) / T), yaw = P.lerp(o.from, o.to, P.smooth(u)), feet = {};
    for (const s of ['L', 'R']) { const [w0, w1] = win[s], f = P.clamp((u - w0) / (w1 - w0)), e = P.smooth(f); feet[s] = { X: P.lerp(a0[s].X, a1[s].X, e), G: P.lerp(a0[s].G, a1[s].G, e), lift: Math.sin(Math.PI * f) * lift, yaw: P.lerp(o.from, o.to, e) }; }
    return { X, G, yaw, lean: .02, drop: Math.sin(Math.PI * u) * 3, feet, arms: hang(), head: { yaw: P.clamp((o.to - yaw) * .6, -.8, .8), pitch: 0 } };
  };
  pose.kind = 'turn'; pose.t0 = o.t0; pose.t1 = o.t1; pose.spec = o; pose.F = F;
  const tc = s => o.t0 + T * win[s][1] * .97;
  pose.contacts = [first, second].map(s => ({ t: tc(s), foot: s, X: a1[s].X, G: a1[s].G }));
  pose.plants = [first, second].flatMap(s => [{ id: id + s + 'a', foot: s, ...a0[s], t0: -1e9, t1: o.t0 + T * win[s][0] }, { id: id + s + 'b', foot: s, ...a1[s], t0: tc(s), t1: 1e9 }]);
  return pose;
}

/** stand(F, o) — stand planted at o.at [X, G] facing o.yaw from o.t0 to o.t1, arms hanging. Use with keyed() for gestures. */
export function stand(F, o) {
  const [X, G] = o.at, feet = stance(F, X, G, o.yaw ?? 0), id = 's' + (++UID);
  const pose = () => ({ X, G, yaw: o.yaw ?? 0, lean: o.lean ?? 0, drop: o.drop ?? 0, feet: { L: { ...feet.L }, R: { ...feet.R } }, arms: o.arms ?? hang(), head: { yaw: 0, pitch: 0, ...(o.head || {}) }, reach: o.reach });
  pose.kind = 'stand'; pose.t0 = o.t0 ?? 0; pose.t1 = o.t1 ?? 1e9; pose.spec = o; pose.F = F; pose.contacts = [];
  pose.plants = ['L', 'R'].map(s => ({ id: id + s, foot: s, ...feet[s], t0: -1e9, t1: 1e9 }));
  return pose;
}

/**
 * keyed(base, keys) — gestures on top of a planted pose. keys: [{ t, ease, tag, drop, lean, shift: [f, l], head: { yaw,
 * pitch }, arms: { L: { sh, ab, el } }, reach: { R: [f, l, u] | null } }]. Each key eases from the one before (its own
 * ease). Arms are interpolated as hand targets, so FK angles and reaches mix. tag a big move's keys 'antic' (the gather,
 * the other way, ≤ 0.6 s before), 'big' (the move) and 'settle' (the recovery) — the checks look for all three.
 */
export function keyed(base, keys) {
  const F = base.F, g = F.geom(), ks = [...keys].sort((a, b) => a.t - b.t);
  const fk = (side, a) => { const A = a.sh ?? 0, ab = a.ab ?? .07, E = Math.max(0, a.el ?? .18), sd = side === 'R' ? 1 : -1; const d1 = [Math.sin(A) * Math.cos(ab), sd * Math.sin(ab), -Math.cos(A) * Math.cos(ab)], d2 = [Math.sin(A + E) * Math.cos(ab * .6), sd * Math.sin(ab * .6), -Math.cos(A + E) * Math.cos(ab * .6)]; return [d1[0] * g.upper + d2[0] * g.fore, d1[1] * g.upper + d2[1] * g.fore, d1[2] * g.upper + d2[2] * g.fore]; };
  const state = (k, b) => { const s = { drop: k.drop ?? b.drop ?? 0, lean: k.lean ?? b.lean ?? 0, shift: k.shift ?? b.shift ?? [0, 0], head: { yaw: 0, pitch: 0, ...(b.head || {}), ...(k.head || {}) }, hand: {} }; for (const side of ['L', 'R']) s.hand[side] = k.reach?.[side] ?? (k.arms?.[side] ? fk(side, k.arms[side]) : b.hand?.[side] ?? (base.spec?.reach?.[side] ?? fk(side, (base.spec?.arms ?? hang())[side]))); return s; };
  const states = []; let prev = state({}, {}); states.push(prev); for (const k of ks) { prev = state(k, prev); states.push(prev); }
  const mixS = (a, b, e) => ({ drop: P.lerp(a.drop, b.drop, e), lean: P.lerp(a.lean, b.lean, e), shift: [P.lerp(a.shift[0], b.shift[0], e), P.lerp(a.shift[1], b.shift[1], e)], head: { yaw: P.lerp(a.head.yaw, b.head.yaw, e), pitch: P.lerp(a.head.pitch, b.head.pitch, e) }, hand: { L: a.hand.L.map((v, i) => P.lerp(v, b.hand.L[i], e)), R: a.hand.R.map((v, i) => P.lerp(v, b.hand.R[i], e)) } });
  const pose = t => {
    const p = base(t); let s = states[0];
    if (ks.length) { let i = ks.findIndex(k => k.t > t); if (i === -1) s = states[ks.length]; else { const k0 = i ? ks[i - 1].t : (base.t0 ?? ks[0].t - .5), k1 = ks[i].t, e = (EASE[ks[i].ease] || EASE.smooth)(P.clamp((t - k0) / Math.max(1e-3, k1 - k0))); s = mixS(states[i], states[i + 1], e); } }
    const [rx, rd] = rightOf(p.yaw), fx = Math.sin(p.yaw), fd = Math.cos(p.yaw);
    return { ...p, X: p.X + fx * s.shift[0] + rx * s.shift[1], G: p.G + (fd * s.shift[0] + rd * s.shift[1]) * KD, drop: (p.drop || 0) + s.drop, lean: (p.lean || 0) + s.lean, head: s.head, reach: { L: s.hand.L, R: s.hand.R }, arms: undefined };
  };
  Object.assign(pose, { kind: 'keyed', t0: base.t0, t1: base.t1, spec: base.spec, F, contacts: base.contacts, plants: base.plants, keys: ks });
  return pose;
}

/** seq(...poses) — one figure's poses in time order. Between two poses the earlier one holds its last frame. */
export function seq(...poses) {
  const ps = poses.flat().sort((a, b) => a.t0 - b.t0);
  const pose = t => { let cur = ps[0]; for (const p of ps) if (p.t0 <= t) cur = p; return cur(Math.min(t, cur.t1)); };
  pose.parts = ps; pose.F = ps[0].F; pose.kind = 'seq'; pose.t0 = ps[0].t0; pose.t1 = ps[ps.length - 1].t1;
  pose.contacts = ps.flatMap(p => p.contacts || []);
  // a part's plants hold only while that part is the one playing
  pose.plants = ps.flatMap((p, i) => { const a = i ? p.t0 : -1e9, b = i < ps.length - 1 ? ps[i + 1].t0 : 1e9; return (p.plants || []).map(q => ({ ...q, t0: Math.max(q.t0, a), t1: Math.min(q.t1, b) })).filter(q => q.t1 > q.t0); });
  pose.keys = ps.flatMap(p => p.keys || []); pose.walks = ps.filter(p => p.kind === 'walk'); pose.turns = ps.filter(p => p.kind === 'turn');
  return pose;
}

/** life(F, seed) — what keeps a figure alive while it stands: breath (chest), irregular blinks, a small weight sway. */
export function life(F, seed = 1) {
  const r = P.rng(seed * 131 + 7), blinks = []; for (let t = .6 + r() * 1.4; t < 60; t += 2 + r() * 2.8) { blinks.push(t); if (r() < .2) blinks.push(t + .28); }
  const period = 3.2 + .5 * F.mass + r() * .5, ph = r() * 6;
  return { blinks, period, breath: t => Math.sin(t / period * P.TAU + ph), blink: t => { for (const b of blinks) { const d = t - b; if (d >= 0 && d < .16) return Math.sin(d / .16 * Math.PI); } return 0; }, sway: t => Math.sin(t * .9 + ph) * 1.1 + Math.sin(t * .37 + ph * 2) * .8 };
}

// ── the scene ──
/**
 * new Scene(spec):
 *   title, label (vertical place name), caption (the small title line), W 1440, H 1080, FPS 24, dur, seed
 *   plate: makePlate options (floorY, pal, accent, paper)
 *   A: { paint(ctx, K), front?(ctx, K), live?(ctx, K, t), label? }       the plate now
 *   B: { paint(ctx, K), front?(ctx, K), live?(ctx, K, t), label? }       the same plate printed again: then / the other state
 *   shifts: [{ t, dur }, { t, dur }]                                      roller over A → B, then back B → A
 *   change: { dur, draw(ctx, K, k, t) }                                   what is different when A returns (k 0 → 1)
 *   cast: [{ fig, pose, state: 'A' | 'B' | 'both', seed }]
 *   sound: { amb: [...], surface, events: [{ t, type, x, … }] }
 *   fadeIn, fadeOut
 */
export class Scene {
  constructor(s) {
    Object.assign(this, { W: 1440, H: 1080, FPS: 24, fadeIn: .6, fadeOut: .9, seed: 1, scale: 1 }, s);
    this.K = K.makePlate({ W: this.W, H: this.H, seed: this.seed, ...(s.plate || {}) });
    this.DURATION = this.dur;
    this.cast = (s.cast || []).map((c, i) => ({ state: 'A', ...c, life: life(c.fig, c.seed ?? i + 1) }));
    this.shifts = (s.shifts || []).map((x, i) => ({ dur: .9, dir: i % 2 ? -1 : 1, to: i % 2 ? 'A' : 'B', ...x }));
    this.beats = s.beats || (this.shifts.length >= 2 ? [{ name: 'now', t: 0 }, { name: 'shift', t: this.shifts[0].t }, { name: 'then', t: this.shifts[0].t + this.shifts[0].dur }, { name: 'return', t: this.shifts[1].t }, { name: 'after', t: this.shifts[1].t + this.shifts[1].dur }] : [{ name: 'now', t: 0 }]);
    this.plates = {}; this.sound = s.sound || {};
    this.grainC = P.grainTile(this.seed + 5);
  }
  async ready() {
    try { const f = new FontFace(K.FONT, `url(${new URL('./fonts/Pretendard-Bold.subset.woff2', import.meta.url)})`, { weight: '700' }); document.fonts.add(f); await f.load(); } catch (e) { console.warn('font', e.message); }
    this.setScale(this.scale);
  }
  setScale(sc) {
    this.scale = sc; this.plates = {};
    for (const key of ['A', 'B']) { const st = this[key]; if (!st) continue; const c = P.canvas(this.W * sc, this.H * sc), g = c.getContext('2d'); g.setTransform(sc, 0, 0, sc, 0, 0); g.fillStyle = this.K.paper; g.fillRect(0, 0, this.W, this.H); st.paint(g, this.K); g.setTransform(1, 0, 0, 1, 0, 0); P.printPass(g, c.width, c.height, { seed: this.seed + (key === 'B' ? 3 : 0), paper: this.K.paper, ...(st.print || {}) }); this.plates[key] = c;
      if (st.front) { const f = P.canvas(this.W * sc, this.H * sc), fg = f.getContext('2d'); fg.setTransform(sc, 0, 0, sc, 0, 0); st.front(fg, this.K); this.plates[key + 'front'] = f; } }
    this.buf = P.canvas(this.W * sc, this.H * sc); this.fig = P.canvas(this.W * sc, this.H * sc);
  }
  /** which plate is showing at t: { from, to, k (roller progress) } */
  stateAt(t) {
    let cur = 'A';
    for (const s of this.shifts) { if (t < s.t) break; if (t < s.t + s.dur) return { from: cur, to: s.to, k: P.smooth((t - s.t) / s.dur), dir: s.dir, shift: s }; cur = s.to; }
    return { from: cur, to: cur, k: 1 };
  }
  returned(t) { const s = this.shifts[1]; return s ? P.clamp((t - s.t) / ((this.change?.dur ?? 1.2))) : 0; }
  visible(c, key) { return c.state === 'both' || c.state === key; }
  poseAt(c, t) {
    const p = { ...c.pose(t) }, L = c.life;
    p.breath = L.breath(t); p.blink = Math.max(p.blink || 0, L.blink(t));
    if (!p.moving) { const sw = L.sway(t), [rx, rd] = rightOf(p.yaw); p.X += rx * sw * .8; p.G += rd * sw * .8 * KD; }
    const q = c.pose(Math.max(0, t - .1)), q2 = c.pose(Math.max(0, t - .2)); p.flow = P.clamp(-((p.X - q.X) * .6 + (q.X - q2.X) * .4) / .1 * .045, -12, 12);
    return p;
  }
  drawState(ctx, key, t) {
    const sc = this.scale; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this.plates[key], 0, 0);
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    const st = this[key]; st.live?.(ctx, this.K, t);
    if (key === 'A' && this.change && this.returned(t) > 0) this.change.draw(ctx, this.K, this.returned(t), t);
    const who = this.cast.filter(c => this.visible(c, key)).map(c => ({ c, p: this.poseAt(c, t) })).sort((a, b) => a.p.G - b.p.G);
    for (const { c, p } of who) {
      ctx.setTransform(sc, 0, 0, sc, 0, 0); drawFigure(ctx, c.fig, p, { only: 'shadow' });
      const fg = this.fig.getContext('2d'); fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, this.fig.width, this.fig.height); fg.setTransform(sc, 0, 0, sc, 0, 0);
      drawFigure(fg, c.fig, p, { shadow: false });
      const pat = fg.createPattern(this.grainC, 'repeat'); pat.setTransform(new DOMMatrix().translate(p.X * sc, p.G * sc).scale(sc)); fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalCompositeOperation = 'source-atop'; fg.fillStyle = pat; fg.fillRect(0, 0, this.fig.width, this.fig.height); fg.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this.fig, 0, 0);
    }
    if (this.plates[key + 'front']) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this.plates[key + 'front'], 0, 0); }
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    if (this.label) K.label(ctx, this.K, st.label ?? this.label, st.labelStyle || this.labelStyle || {});
    if (this.caption) K.caption(ctx, this.K, this.caption, this.captionStyle || {});
  }
  draw(ctx, T) {
    const t = P.clamp(T, 0, this.dur), sc = this.scale, S = this.stateAt(t);
    this.drawState(ctx, S.from, t);
    if (S.k < 1 || S.from !== S.to) {
      const b = this.buf.getContext('2d'); this.drawState(b, S.to, t);
      const x = S.dir > 0 ? P.lerp(-70, this.W + 70, S.k) : P.lerp(this.W + 70, -70, S.k), edge = [];
      for (let y = -10; y <= this.H + 10; y += 12) edge.push([x + (P.noise(y * .03, S.shift.t, 7) - .5) * 26, y]);
      const poly = S.dir > 0 ? [[-10, -10], ...edge, [-10, this.H + 10]] : [[this.W + 10, -10], ...edge, [this.W + 10, this.H + 10]];
      ctx.save(); ctx.setTransform(sc, 0, 0, sc, 0, 0); P.path(ctx, poly); ctx.clip(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this.buf, 0, 0); ctx.restore();
      ctx.setTransform(sc, 0, 0, sc, 0, 0); roller(ctx, this, x, S);
    }
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    const fade = Math.max(1 - P.clamp(t / this.fadeIn), P.clamp((t - (this.dur - this.fadeOut)) / this.fadeOut));
    if (fade > 0) { ctx.fillStyle = P.alpha(this.K.paper, fade); ctx.fillRect(0, 0, this.W, this.H); }
  }
  /** sound events: footsteps from the visible figures' heel strikes, the roller, and the brief's own events */
  events() {
    const ev = [];
    for (const c of this.cast) for (const k of c.pose.contacts || []) { if (k.t < 0 || k.t >= this.dur) continue; const S = this.stateAt(k.t), showing = S.k < 1 ? (this.visible(c, S.from) || this.visible(c, S.to)) : this.visible(c, S.to); if (showing) ev.push({ t: k.t, type: 'step', x: k.X, surface: this.sound.surface, who: c.fig.name }); }
    for (const s of this.shifts) ev.push({ t: s.t, type: 'roll', dur: s.dur, dir: s.dir, to: s.to });
    for (const e of this.sound.events || []) ev.push(e);
    return ev.sort((a, b) => a.t - b.t);
  }
  // ── reports for check.mjs ──
  frames(step = 1 / 24) { const out = []; for (let t = 0; t < this.dur; t += step) out.push(+t.toFixed(4)); return out; }
  rig() {
    const rows = [], lim = JOINTS, worst = { knee: [1e9, -1e9], hip: [1e9, -1e9], elbow: [1e9, -1e9], neck: 0, lean: [1e9, -1e9], err: 0, drift: 0, handErr: 0 }, ctx = this.fig.getContext('2d');
    let driftAt = '';
    for (const c of this.cast) {
      const ts = this.frames(), byPlant = {};
      for (const t of ts) {
        const p = this.poseAt(c, t), J = drawFigure(ctx, c.fig, p, { measure: true });
        for (const s of ['L', 'R']) { worst.knee[0] = Math.min(worst.knee[0], J.angles.knee[s]); worst.knee[1] = Math.max(worst.knee[1], J.angles.knee[s]); worst.hip[0] = Math.min(worst.hip[0], J.angles.hip[s]); worst.hip[1] = Math.max(worst.hip[1], J.angles.hip[s]); worst.elbow[0] = Math.min(worst.elbow[0], J.angles.elbow[s]); worst.elbow[1] = Math.max(worst.elbow[1], J.angles.elbow[s]); worst.err = Math.max(worst.err, J.err[s]); worst.handErr = Math.max(worst.handErr, J.err['hand' + s] || 0); }
        worst.neck = Math.max(worst.neck, Math.abs(J.head.neckYaw)); worst.lean[0] = Math.min(worst.lean[0], J.angles.lean); worst.lean[1] = Math.max(worst.lean[1], J.angles.lean);
        for (const pl of c.pose.plants || []) if (t > pl.t0 + .02 && t < pl.t1 - .02) { const f = J.screen.feet[pl.foot], q = byPlant[pl.id] || (byPlant[pl.id] = { x0: f[0], y0: f[1], d: 0 }); q.d = Math.max(q.d, Math.hypot(f[0] - q.x0, f[1] - q.y0)); if (q.d > worst.drift) { worst.drift = q.d; driftAt = `${c.fig.name} ${pl.id} @${t.toFixed(2)}s`; } }
      }
    }
    const f = v => v.toFixed(1);
    rows.push({ name: 'knees fold back, in range', value: `${f(worst.knee[0])}…${f(worst.knee[1])}°`, limit: `${lim.knee[0]}…${lim.knee[1]}°`, ok: worst.knee[0] >= lim.knee[0] - .01 && worst.knee[1] <= lim.knee[1] });
    rows.push({ name: 'hips in range', value: `${f(worst.hip[0])}…${f(worst.hip[1])}°`, limit: `${lim.hip[0]}…${lim.hip[1]}°`, ok: worst.hip[0] >= lim.hip[0] && worst.hip[1] <= lim.hip[1] });
    rows.push({ name: 'elbows bend forward, in range', value: `${f(worst.elbow[0])}…${f(worst.elbow[1])}°`, limit: `${lim.elbow[0]}…${lim.elbow[1]}°`, ok: worst.elbow[0] >= lim.elbow[0] - .01 && worst.elbow[1] <= lim.elbow[1] });
    rows.push({ name: 'neck turn', value: `${f(worst.neck)}°`, limit: `≤ ${lim.neckYaw[1]}°`, ok: worst.neck <= lim.neckYaw[1] });
    rows.push({ name: 'torso lean', value: `${f(worst.lean[0])}…${f(worst.lean[1])}°`, limit: `${lim.lean[0]}…${lim.lean[1]}°`, ok: worst.lean[0] >= lim.lean[0] && worst.lean[1] <= lim.lean[1] });
    rows.push({ name: 'legs reach their feet', value: `${f(worst.err)} px short`, limit: '≤ 1 px', ok: worst.err <= 1 });
    rows.push({ name: 'hands reach their targets', value: `${f(worst.handErr)} px short`, limit: '≤ 2 px', ok: worst.handErr <= 2 });
    rows.push({ name: 'planted feet stay put', value: `${worst.drift.toFixed(2)} px${driftAt ? ' (' + driftAt + ')' : ''}`, limit: '≤ 1.5 px', ok: worst.drift <= 1.5 });
    const wrongWay = this.cast.flatMap(c => (c.pose.walks || (c.pose.kind === 'walk' ? [c.pose] : [])).filter(w => w.spec.yaw != null && Math.abs(Math.sin(w.spec.yaw - Math.atan2(w.spec.to[0] - w.spec.from[0], (w.spec.to[1] - w.spec.from[1]) / KD))) > .3 && !w.spec.backward));
    rows.push({ name: 'walkers face their way', value: `${wrongWay.length} walk(s) facing off their path`, limit: '0 (or backward: true)', ok: !wrongWay.length });
    return rows;
  }
  motionReport() {
    const rows = [];
    for (const c of this.cast) {
      const vis = this.frames(.1).filter(t => { const S = this.stateAt(t); return this.visible(c, S.to) || this.visible(c, S.from); }), secs = vis.length * .1;
      const bl = c.life.blinks.filter(b => vis.some(t => Math.abs(t - b) < .06)).length;
      rows.push({ name: `${c.fig.name}: blinks while on screen`, value: `${bl} in ${secs.toFixed(1)} s`, limit: '≥ 1 per 5 s', ok: secs < 2 || bl >= Math.floor(secs / 5) });
      const keys = c.pose.keys || [], bigs = keys.filter(k => k.tag === 'big');
      for (const b of bigs) { const an = keys.find(k => k.tag === 'antic' && k.t < b.t && b.t - k.t <= .6), se = keys.find(k => k.tag === 'settle' && k.t > b.t && k.t - b.t <= 1.2); rows.push({ name: `${c.fig.name}: big move @${b.t}s gathers and recovers`, value: `${an ? 'antic ' + (b.t - an.t).toFixed(2) + ' s before' : 'no antic'} · ${se ? 'settle ' + (se.t - b.t).toFixed(2) + ' s after' : 'no settle'}`, limit: 'antic ≤ 0.6 s before, settle ≤ 1.2 s after', ok: !!(an && se) }); }
      for (const tr of c.pose.turns || []) rows.push({ name: `${c.fig.name}: turn @${tr.t0}s is stepped`, value: `${tr.contacts.length} steps`, limit: '2 (each foot re-planted)', ok: tr.contacts.length === 2 });
      for (const w of c.pose.walks || (c.pose.kind === 'walk' ? [c.pose] : [])) { const r = w.spec.steps / (w.t1 - w.t0); rows.push({ name: `${c.fig.name}: walk @${w.t0}s pace`, value: `${r.toFixed(2)} steps/s`, limit: '1.3–2.6 (unhurried, long legs)', ok: r >= 1.3 && r <= 2.6 }); }
    }
    const s = this.shifts;
    rows.push({ name: 'two printings: A → B → A', value: s.map(x => `${x.to}@${x.t}s`).join(' · ') || 'none', limit: 'exactly 2 shifts, the second back to A', ok: s.length === 2 && s[0].to === 'B' && s[1].to === 'A' });
    if (s.length === 2) { rows.push({ name: 'time on the other plate', value: `${(s[1].t - s[0].t - s[0].dur).toFixed(2)} s`, limit: '≥ 2.5 s', ok: s[1].t - s[0].t - s[0].dur >= 2.5 }); rows.push({ name: 'hold after the return', value: `${(this.dur - s[1].t - s[1].dur).toFixed(2)} s`, limit: '≥ 2 s', ok: this.dur - s[1].t - s[1].dur >= 2 }); rows.push({ name: 'opening hold before the first shift', value: `${s[0].t.toFixed(2)} s`, limit: '≥ 2.5 s', ok: s[0].t >= 2.5 }); }
    rows.push({ name: 'A returns changed', value: this.change ? 'change layer' : 'none', limit: 'a change: draw(ctx, K, k, t)', ok: !!this.change });
    rows.push({ name: 'length', value: `${this.dur} s`, limit: '9–18 s', ok: this.dur >= 9 && this.dur <= 18 });
    rows.push({ name: 'label and caption', value: `「${this.label || ''}」 · 「${this.caption || ''}」`, limit: 'label 1–6 syllables, caption set', ok: !!this.label && [...this.label].length <= 6 && !!this.caption });
    return rows;
  }
  styleReport() {
    const rows = [], acc = P.hsl(this.K.accent);
    const stat = c => { const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data, W = c.width, r = P.rng(5); let sat = 0, n = 0, accN = 0, loud = 0, hf = 0, hn = 0;
      for (let k = 0; k < 40000; k++) { const x = 1 + (r() * (W - 2) | 0), y = 1 + (r() * (c.height - 2) | 0), i = (y * W + x) * 4, R = d[i] / 255, G = d[i + 1] / 255, B = d[i + 2] / 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 2, s = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
        let h = 0; if (mx !== mn) { const dd = mx - mn; h = mx === R ? ((G - B) / dd + 6) % 6 : mx === G ? (B - R) / dd + 2 : (R - G) / dd + 4; h *= 60; }
        const near = Math.min(Math.abs(h - acc[0]), 360 - Math.abs(h - acc[0])) < 20;
        if (s > .45 && l > .2 && l < .62 && near) accN++; else { sat += s * (1 - Math.abs(2 * l - 1)); n++; if (s > .55 && l > .25 && l < .7) loud++; }
        const j = i + 4; hf += Math.abs(d[i] - d[j]) + Math.abs(d[i + 1] - d[j + 1]) + Math.abs(d[i + 2] - d[j + 2]); hn++; }
      return { sat: sat / n, acc: accN / 40000, loud: loud / 40000, hf: hf / hn / 3 }; };
    const A = stat(this.plates.A), B = this.plates.B ? stat(this.plates.B) : null;
    const end = P.canvas(this.plates.A.width, this.plates.A.height); this.draw(end.getContext('2d'), this.dur - this.fadeOut - .05); const E = stat(end);
    rows.push({ name: 'printed, not filled (grain between neighbours)', value: `A ${A.hf.toFixed(1)}${B ? ' · B ' + B.hf.toFixed(1) : ''}`, limit: '3–30', ok: A.hf >= 3 && A.hf <= 30 && (!B || (B.hf >= 3 && B.hf <= 30)) });
    rows.push({ name: 'muted colour (chroma outside the accent)', value: `A ${A.sat.toFixed(3)}${B ? ' · B ' + B.sat.toFixed(3) : ''}`, limit: '≤ 0.26', ok: A.sat <= .26 && (!B || B.sat <= .26) });
    rows.push({ name: 'one accent, small: the clue at the end', value: `${(E.acc * 100).toFixed(2)} % of the plate`, limit: '0.02–7 %', ok: E.acc >= .0002 && E.acc <= .07 });
    rows.push({ name: 'no second loud colour', value: `${(Math.max(A.loud, B ? B.loud : 0) * 100).toFixed(2)} % saturated non-accent`, limit: '≤ 3 %', ok: Math.max(A.loud, B ? B.loud : 0) <= .03 });
    if (B) { const a = this.plates.A.getContext('2d').getImageData(0, 0, this.plates.A.width, this.plates.A.height).data, b = this.plates.B.getContext('2d').getImageData(0, 0, this.plates.B.width, this.plates.B.height).data; let dsum = 0, n = 0; for (let i = 0; i < a.length; i += 4 * 97) { dsum += (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3; n++; } rows.push({ name: 'B is a real second printing', value: `mean difference ${(dsum / n).toFixed(1)}`, limit: '≥ 8', ok: dsum / n >= 8 }); }
    rows.push({ name: 'folded view: wall meets floor in the frame', value: `floorY ${this.K.floorY} of ${this.H}`, limit: '0.3–0.78 H', ok: this.K.floorY >= .3 * this.H && this.K.floorY <= .78 * this.H });
    return rows;
  }
}

function roller(ctx, S, x, st) {
  const H = S.H, w = 38, tilt = st.dir * 10, dk = '#1f1b1d';
  const g = ctx.createLinearGradient(x - w * 2.5 * st.dir, 0, x, 0); g.addColorStop(0, 'rgba(25,20,22,0)'); g.addColorStop(1, 'rgba(25,20,22,.35)');
  ctx.fillStyle = g; ctx.fillRect(Math.min(x, x - w * 2.5 * st.dir), 0, w * 2.5, H);
  const r = P.rng(Math.round(st.shift.t * 10)); ctx.strokeStyle = 'rgba(20,16,18,.35)'; ctx.lineWidth = 1;
  for (let i = 0; i < 60; i++) { const y = r() * H, L = 20 + r() * 70; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - L * st.dir, y + (r() - .5) * 2); ctx.stroke(); }
  P.path(ctx, [[x - w / 2 + tilt, -20], [x + w / 2 + tilt, -20], [x + w / 2 - tilt, H + 20], [x - w / 2 - tilt, H + 20]]); ctx.fillStyle = dk; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - w * .18 + tilt, -20); ctx.lineTo(x - w * .18 - tilt, H + 20); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x + w * .2 + tilt, -20); ctx.lineTo(x + w * .2 - tilt, H + 20); ctx.stroke();
}

/** castSheet(scene, figs, o) — every figure turned all the way round, walking both ways, a stepped turn, a big move both ways, faces. */
export function castSheet(scene, figs, o = {}) {
  const cw = o.cell ?? 210, chH = Math.round(cw * 2.05), cols = 6, rowsPer = 4, sc = cw / 210;
  const c = P.canvas(cols * cw, figs.length * rowsPer * chH + figs.length * 40), g = c.getContext('2d');
  g.fillStyle = scene.K.paper; g.fillRect(0, 0, c.width, c.height);
  figs.forEach((F, fi) => {
    const y0 = fi * (rowsPer * chH + 40); g.fillStyle = '#2a2422'; g.font = `700 ${20 * sc}px ${K.FONT}`; g.textBaseline = 'top'; g.fillText(F.name, 12, y0 + 10);
    const cell = (col, row, pose, label) => {
      const X = col * cw + cw / 2, G = y0 + 40 + row * chH + chH - 40 * sc; g.save(); g.translate(X, G); g.scale(sc * .62, sc * .62); g.translate(-X, -G);
      const p = { X, G, drop: 0, lean: 0, head: { yaw: 0, pitch: 0 }, arms: hang(), ...pose(X, G) }; if (!p.feet) p.feet = stance(F, X, G, p.yaw); drawFigure(g, F, p); g.restore();
      g.fillStyle = 'rgba(42,36,34,.7)'; g.font = `700 ${12 * sc}px ${K.FONT}`; g.fillText(label, col * cw + 8, y0 + 40 + row * chH + 6);
    };
    [[0, 'front'], [Math.PI / 4, '3/4 right'], [Math.PI / 2, 'side right'], [Math.PI, 'back'], [-Math.PI / 2, 'side left'], [-Math.PI / 4, '3/4 left']].forEach(([yw, l], i) => cell(i, 0, () => ({ yaw: yw }), l));
    for (const [i, dir] of [[0, 1], [3, -1]]) { const w = walk(F, { from: [0, 0], to: [dir * 600, 0], t0: 0, t1: 3 }); [.85, 1.1, 1.35].forEach((t, k) => cell(i + k, 1, (X, G) => { const p = w(t); const dx = X - p.X, dg = G - p.G; return { ...p, X, G, feet: { L: { ...p.feet.L, X: p.feet.L.X + dx, G: p.feet.L.G + dg }, R: { ...p.feet.R, X: p.feet.R.X + dx, G: p.feet.R.G + dg } } }; }, `walk ${dir > 0 ? 'right' : 'left'} ${k + 1}`)); }
    const tr = turn(F, { at: [0, 0], from: Math.PI / 2, to: 0, t0: 0, t1: 1 });
    [.15, .5, .85].forEach((t, k) => cell(k, 2, (X, G) => { const p = tr(t); return { ...p, X, G, feet: { L: { ...p.feet.L, X: p.feet.L.X + X, G: p.feet.L.G + G }, R: { ...p.feet.R, X: p.feet.R.X + X, G: p.feet.R.G + G } } }; }, `stepped turn ${k + 1}`));
    const big = [{ d: 24, lean: .18, R: [-30, 6, -120], L: [-30, -6, -120], tag: 'antic' }, { d: -2, lean: -.06, R: [70, 4, 60], L: [50, -4, 40], tag: 'big' }, { d: 6, lean: .04, R: [20, 4, -110], L: [10, -4, -120], tag: 'settle' }];
    big.forEach((k, i) => cell(3 + i, 2, () => ({ yaw: Math.PI / 2, drop: k.d, lean: k.lean, reach: { R: k.R, L: k.L } }), `big R · ${k.tag}`));
    big.forEach((k, i) => cell(i, 3, () => ({ yaw: -Math.PI / 2, drop: k.d, lean: k.lean, reach: { R: k.R, L: k.L } }), `big L · ${k.tag}`));
    [-Math.PI / 2, 0, Math.PI / 2].forEach((hy, i) => {
      const col = 3 + i, cx = col * cw + cw / 2, cyy = y0 + 40 + 3 * chH, X = 0, G = 0, gg = F.geom(), headUp = F.hipH() + gg.torso + gg.neck + gg.headRy * .8, z = cw * .9 / (gg.headRy * 5);
      g.save(); g.beginPath(); g.rect(col * cw, cyy, cw, chH); g.clip(); g.translate(cx, cyy + chH * .42); g.scale(z, z); g.translate(0, headUp);
      const p = { X, G, yaw: 0, head: { yaw: hy * .95, pitch: 0 }, arms: hang() }; p.feet = stance(F, X, G, 0); drawFigure(g, F, p, { shadow: false }); g.restore();
      g.fillStyle = 'rgba(42,36,34,.7)'; g.font = `700 ${12 * sc}px ${K.FONT}`; g.fillText(['face: turned to its right', 'face: front', 'face: turned to its left'][i], col * cw + 8, cyy + 6);
    });
  });
  return c;
}

/** mount(scene, opt) — the page contract: window.seek / DURATION / FPS / __ready / __film; ?cast for the cast sheet. */
export async function mount(scene, opt = {}) {
  const q = new URLSearchParams(location.search), scale = +(q.get('scale') || (q.has('render') ? 1 : .6));
  scene.scale = scale; document.title = scene.title || document.title;
  const st = document.createElement('style');
  st.textContent = 'html,body{margin:0;min-height:100%;background:#1b1918;color:#ece4d0;font:15px/1.5 system-ui,sans-serif}body{display:flex;flex-direction:column;align-items:center;gap:10px;padding:12px 0}canvas{width:min(100vw,calc((100vh - 70px)*4/3));height:auto;display:block}#play{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);padding:12px 20px;border-radius:999px;border:1px solid #ece4d0;background:rgba(27,25,24,.82);color:#ece4d0;font:inherit;cursor:pointer;white-space:nowrap}';
  document.head.appendChild(st);
  await scene.ready();
  if (q.has('cast')) { scene.setScale(1); const c = castSheet(scene, opt.actors || [...new Set(scene.cast.map(c => c.fig))], { cell: +(q.get('cell') || 210) }); c.style.width = 'min(100vw, ' + c.width + 'px)'; c.style.height = 'auto'; document.body.appendChild(c); window.__film = { film: scene, cast: c }; window.DURATION = 0; window.seek = () => {}; window.__ready = true; return; }
  const cv = P.canvas(scene.W * scale, scene.H * scale), ctx = cv.getContext('2d'); document.body.appendChild(cv);
  window.DURATION = scene.DURATION; window.FPS = scene.FPS;
  window.seek = t => scene.draw(ctx, Math.max(0, Math.min(scene.DURATION - 1e-3, t)));
  window.__film = { film: scene, rig: () => scene.rig(), motion: () => scene.motionReport(), style: () => scene.styleReport(), events: () => scene.events(), caption: scene.caption, label: scene.label, score: opt.score };
  if (q.has('render')) { window.seek(+(q.get('t') || 0)); window.__ready = true; return; }
  let t0 = performance.now() - (+(q.get('t') || 0)) * 1000, ac = null, acT0 = 0;
  const btn = document.createElement('button'); btn.id = 'play'; btn.textContent = '▶ 소리와 함께 처음부터'; document.body.appendChild(btn);
  btn.onclick = async () => { btn.remove(); if (opt.score) { ac = new AudioContext(); await opt.score.play(ac, scene); acT0 = ac.currentTime + .05; } else t0 = performance.now(); };
  const now = () => ac ? ac.currentTime - acT0 : (performance.now() - t0) / 1000;
  const tick = () => { let t = now(); if (t > scene.DURATION + 1.2) { if (ac) { ac.close(); ac = null; } t0 = performance.now(); t = 0; } window.seek(t); requestAnimationFrame(tick); };
  window.__ready = true; tick();
}

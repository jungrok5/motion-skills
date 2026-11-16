// storybook-portrait · motion.js — the live loop: a pose for every moment, simulated, never tweened limb by limb.
// What moves and why (references/MOTION.md):
//   breath  — the chest rises (body scales up from its planted bottom edge), the head rides up a beat later
//   blink   — on an irregular beat from a seeded schedule, plus one at the start of every real head turn
//   gaze    — saccades: the eyes jump first (fast spring with a little overshoot) …
//   head    — … then the head follows: a small counter-move (anticipation), the turn on a spring set by the character's
//             mass (overshoot and settle), the shoulders a touch behind it
//   hair    — hangs from the crown and lags the head (follow-through), flyaways pick up the head's speed
//   earrings— pendulums driven by the head's sideways acceleration
// Keys (beats) are numbers taken from a reference: a video-model clip of the character, or observed timing (BRIEF.md).
// pose(τ) re-simulates from τ = 0 at a fixed step, so any τ gives the same pose (deterministic, seekable).
import { rng, clamp, lerp } from './paint.js';

export const MASS = {
  //            head spring ω, ζ   anticipation s   eye lead s   hair ω, ζ   breath depth
  light:  { w: 13, z: .48, antic: .1, lead: .08, hw: 7.5, hz: .28, depth: 1.0, amt: .22 },
  medium: { w: 9.5, z: .52, antic: .15, lead: .1, hw: 6, hz: .3, depth: 1.0, amt: .26 },
  heavy:  { w: 6.5, z: .62, antic: .22, lead: .14, hw: 4.6, hz: .34, depth: 1.25, amt: .3 },
};
export const EXPRESSIONS = {
  // brow tilt + = inner ends up (worry); lift + = raised (surprise); mouth curve − = frown, + = smile
  wary:      { browTilt: .25, browLift: .1, mouthCurve: -.55, mouthOpen: 0, lids: .08 },
  calm:      { browTilt: .05, browLift: 0, mouthCurve: .15, mouthOpen: 0, lids: .18 },
  pleased:   { browTilt: .1, browLift: .15, mouthCurve: .75, mouthOpen: 0, lids: .12 },
  surprised: { browTilt: .3, browLift: .8, mouthCurve: 0, mouthOpen: .6, lids: 0 },
  sleepy:    { browTilt: .1, browLift: -.1, mouthCurve: .05, mouthOpen: 0, lids: .55 },
  stern:     { browTilt: -.45, browLift: -.2, mouthCurve: -.25, mouthOpen: 0, lids: .2 },
  shy:       { browTilt: .35, browLift: .05, mouthCurve: .35, mouthOpen: 0, lids: .3 },
};
const EXPR_KEYS = ['browTilt', 'browLift', 'mouthCurve', 'mouthOpen', 'lids'];

export function makeMotion(M = {}, design = {}) {
  const m = MASS[M.mass || 'medium'] || MASS.medium;
  const period = M.breath?.period || 4.2, depth = (M.breath?.depth ?? 1) * m.depth;
  const live = M.live || 10, loop = M.loop || live;
  const face = design.face || {};
  const base = { ...EXPRESSIONS[M.expression || 'wary'], ...(M.face || {}) };
  const beats = (M.beats || []).map(b => ({ ...b })).sort((x, y) => x.t - y.t);
  const gaze0 = M.gaze || face.gaze || [.6, 0];

  // blinks: irregular, seeded; a few doubles; never closer than .9 s; plus one at each head turn
  const r = rng((M.seed || 7) * 977 + 3), blinks = [];
  for (let t = .6 + r() * 1.2; t < loop - .4; ) { blinks.push(t); if (r() < .18 && t + .5 < loop) blinks.push(t + .32 + r() * .1); t += Math.max(.9, (M.blink?.mean || 3.4) * (.35 + r() * 1.3)); }
  let prevYaw = 0;
  for (const b of beats) if (b.head) { const y = b.head.yaw ?? prevYaw; if (b.blink !== false && Math.abs(y - prevYaw) > .06 && !blinks.some(t => Math.abs(t - b.t) < .5)) blinks.push(b.t + .02); prevYaw = y; }
  blinks.sort((x, y) => x - y);

  const targetAt = (τ) => { // the keyed targets in force at τ (beats repeat every `loop` seconds on a live page)
    const k = Math.floor(τ / loop), local = τ - k * loop;
    let g = gaze0, head = { yaw: 0, tilt: M.tilt || 0 }, ex = { ...base }, since = 1e9, prevHead = head, headT = -1e9, ease = .09, breathe = 1;
    const consider = (b, off) => { const t = b.t + off; if (t > τ) return; if (b.gaze) g = b.gaze; if (b.head) { prevHead = head; head = { yaw: b.head.yaw ?? head.yaw, tilt: b.head.tilt ?? head.tilt }; headT = t; } if (b.expression) ex = { ...ex, ...EXPRESSIONS[b.expression] }; if (b.face) ex = { ...ex, ...b.face }; ease = b.ease ?? .09; breathe = b.breathe ?? 1; since = τ - t; };
    for (let kk = 0; kk <= k; kk++) for (const b of beats) consider(b, kk * loop);
    void local;
    return { g, head, prevHead, headT, ex, since, ease, breathe };
  };

  const blinkAt = τ => { // 0 open … 1 shut: close 70 ms, hold 30 ms, open 110 ms
    let v = 0;
    const local = τ % loop;
    for (const t0 of blinks) { const d = local - t0; if (d < 0) break; if (d < .07) v = Math.max(v, d / .07); else if (d < .1) v = 1; else if (d < .21) v = Math.max(v, 1 - (d - .1) / .11); }
    return v;
  };

  const DT = 1 / 120;
  let cache = { τ: -1, s: null };
  const init = () => ({ τ: 0, gx: gaze0[0], gy: gaze0[1], gvx: 0, gvy: 0, yaw: 0, vy: 0, tilt: M.tilt || 0, vt: 0, hair: M.tilt || 0, vh: 0, hairY: 0, vhy: 0,
    swL: 0, vL: 0, swR: 0, vR: 0, ex: { ...base }, sh: 0, vsh: 0, acc: 0, deep: 1 });
  const spring = (x, v, target, w, z, dt) => { const a = -w * w * (x - target) - 2 * z * w * v; v += a * dt; return [x + v * dt, v, a]; };

  function step(s, dt) {
    const T = targetAt(s.τ);
    // eyes: fast, a little overshoot
    [s.gx, s.gvx] = spring(s.gx, s.gvx, T.g[0], 34, .62, dt);
    [s.gy, s.gvy] = spring(s.gy, s.gvy, T.g[1], 34, .62, dt);
    // head: waits for the eyes (lead), then a counter-move (anticipation), then the turn on the mass's spring
    const since = s.τ - T.headT;
    let ty = T.head.yaw, tt = T.head.tilt;
    if (since < m.lead) { ty = T.prevHead.yaw; tt = T.prevHead.tilt; }
    else if (since < m.lead + m.antic) { const k = Math.sin((since - m.lead) / m.antic * Math.PI); ty = T.prevHead.yaw - (T.head.yaw - T.prevHead.yaw) * m.amt * k; tt = T.prevHead.tilt - (T.head.tilt - T.prevHead.tilt) * m.amt * k; }
    let ay, at;
    [s.yaw, s.vy, ay] = spring(s.yaw, s.vy, ty, m.w, m.z, dt);
    [s.tilt, s.vt, at] = spring(s.tilt, s.vt, tt, m.w, m.z, dt);
    // shoulders: a third of the head's turn, later
    [s.sh, s.vsh] = spring(s.sh, s.vsh, s.yaw * .3 + s.tilt * .15, m.w * .6, .7, dt);
    // hair: hangs from the crown, follows the head's tilt late and swings past
    [s.hair, s.vh] = spring(s.hair, s.vh, s.tilt, m.hw, m.hz, dt);
    [s.hairY, s.vhy] = spring(s.hairY, s.vhy, s.yaw, m.hw, m.hz, dt);
    // earrings: pendulums pushed by the head's sideways acceleration
    const push = (at * 1 + ay * .6);
    s.vL += (-28 * Math.sin(s.swL) - 1.6 * s.vL - push * .9) * dt; s.swL += s.vL * dt;
    s.vR += (-26 * Math.sin(s.swR) - 1.5 * s.vR - push * .9) * dt; s.swR += s.vR * dt;
    // expression: eased towards the keyed face in ~.25 s
    for (const k of EXPR_KEYS) s.ex[k] = lerp(s.ex[k] ?? 0, T.ex[k] ?? 0, 1 - Math.exp(-dt / T.ease));
    // a beat can ask for a deeper breath (a yawn, a sigh): the depth eases there and back
    s.deep = lerp(s.deep ?? 1, T.breathe, 1 - Math.exp(-dt / .5));
    s.acc = ay;
    s.τ += dt;
    return s;
  }

  function stateAt(τ) {
    τ = Math.max(0, τ);
    const s = cache.s && cache.τ <= τ + 1e-9 ? { ...cache.s, ex: { ...cache.s.ex } } : init();
    while (s.τ + DT <= τ + 1e-9) step(s, DT);
    cache = { τ: s.τ, s: { ...s, ex: { ...s.ex } } };
    return s;
  }

  /** the pose at live time τ (seconds since the drawing finished) */
  function pose(τ) {
    const s = stateAt(τ);
    // breath: in quicker than out; a slow drift in depth so no two breaths are the same
    const ph = (τ / period) % 1, b = (ph < .42 ? Math.sin(ph / .42 * Math.PI / 2) : Math.cos((ph - .42) / .58 * Math.PI / 2)) * 2 - 1;
    const dd = depth * (.85 + .15 * Math.sin(τ * .37)) * s.deep;
    const lag = ((τ - .25) / period) % 1, bh = (lag < .42 ? Math.sin(lag / .42 * Math.PI / 2) : Math.cos((lag - .42) / .58 * Math.PI / 2)) * 2 - 1;
    return {
      τ, breath: b * dd, rise: (bh * .5 + .5) * 3.2 * dd,
      yaw: clamp(s.yaw, -.4, .4), tilt: s.tilt, hairLag: s.hair - s.tilt, hairYaw: s.hairY - s.yaw, hairVel: s.vh * .08,
      shoulder: s.sh, gaze: [clamp(s.gx, -1.1, 1.1), clamp(s.gy, -1.1, 1.1)], blink: blinkAt(τ),
      swingL: s.swL, swingR: s.swR, ...s.ex,
    };
  }
  return { pose, blinks, beats, mass: m, period, live, loop, rest: () => pose(0) };
}

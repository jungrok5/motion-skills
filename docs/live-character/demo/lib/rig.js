// lib/rig.js — the motion engine of live-character: a 2.5D rig for vector-drawn characters (people and animals).
//
// The recipe (studied from LivLiv Player, github.com/livliv-dev/player, Apache-2.0: runtime/idle.ts, actions.ts,
// puppet.ts; re-implemented and re-tuned for vector drawing, with limbs, planted feet and angular chains added):
//  - the head sits on a paraboloid bulge; yaw / pitch rotate it and every drawn point has a depth (back hair < face
//    < eyes < nose / muzzle < bangs), so a turn is parallax, not a slide. Depth fades out at the skull edge
//  - head and torso wander on smooth value noise and follow their targets through damped springs: the eyes lead, the
//    head overshoots a little, the torso trails ~0.25 s behind
//  - breaths are uneven (in 40 %, out 48 %, a pause), blinks close fast and open slow, one in six doubles
//  - every 10–20 s a small idle move (several params and limb poses at once, mirrored at random)
//  - limbs are two bones with numeric joint limits, following pose targets through springs, hanging under gravity,
//    thrown by the torso's acceleration; planted feet stay on the ground by IK
//  - chains (hair locks, ears, tails, cords) are ropes of joints: length kept, thrown by the root's acceleration,
//    hanging under gravity, driven by params (a wag, perked ears)
// Everything is deterministic: a seeded RNG and a fixed 120 Hz step, so renderAt(t) gives the same frame twice.

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
export const lerp = (a, b, t) => a + (b - a) * t
/** v as it is up to k, then easing toward cap, never past it */
export const knee = (v, k, cap) => { const a = Math.abs(v); return a <= k ? v : Math.sign(v) * (k + (cap - k) * Math.tanh((a - k) / (cap - k))) }
/** an envelope s seconds after an event: up over a, held h, down over d */
export const env = (s, a, h, d) => (s < 0 || s > a + h + d ? 0 : s < a ? smooth(0, a, s) : 1 - smooth(a + h, a + h + d, s))
/** an action's fade: in over 0.18 s, out over the last 0.22 s of dur */
export const fade = (t, dur) => smooth(0, 0.18, t) * (1 - smooth(dur - 0.22, dur, t))
const D2R = Math.PI / 180
/** a direction from an angle measured from straight down (0 = down, +90 = screen right) */
export const dir = (a) => [Math.sin(a), Math.cos(a)]

export function mulberry32(seed) {
  let s = seed >>> 0
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const hash = (n, seed) => { const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return x - Math.floor(x) }
export function noise(t, seed) { const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return (hash(i, seed) * (1 - u) + hash(i + 1, seed) * u) * 2 - 1 }
export const fbm = (t, seed) => noise(t, seed) * 0.7 + noise(t * 2.3, seed + 17) * 0.3

/** a keyframed track [[s, v], ...]: cubic through the keys, flat at both ends */
export function sample(k, t) {
  if (t <= k[0][0]) return k[0][1]
  const n = k.length - 1
  if (t >= k[n][0]) return k[n][1]
  let i = 0
  while (t > k[i + 1][0]) i++
  const slope = (j) => (j <= 0 || j >= n ? 0 : (k[j + 1][1] - k[j - 1][1]) / (k[j + 1][0] - k[j - 1][0]))
  const h = k[i + 1][0] - k[i][0], u = (t - k[i][0]) / h, u2 = u * u, u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * k[i][1] + (u3 - 2 * u2 + u) * slope(i) * h + (-2 * u3 + 3 * u2) * k[i + 1][1] + (u3 - u2) * slope(i + 1) * h
}

// ------------------------------------------------------------------ params
/** [min, max, rest, mode]: mode 'max' combines by the larger value (a face), the default adds (a pose) */
export const CORE_PARAMS = {
  angleX: [-30, 30, 0], angleY: [-30, 30, 0], angleZ: [-30, 30, 0], bodyX: [-10, 10, 0], bodyZ: [-10, 10, 0], breath: [0, 1, 0],
  eyeLOpen: [0, 1.25, 1], eyeROpen: [0, 1.25, 1], eyeBallX: [-1, 1, 0], eyeBallY: [-1, 1, 0], brow: [-1, 1, 0],
  mouthOpen: [0, 1, 0], vowel: [-1, 1, 0], smile: [0, 1, 0, 'max'], surprise: [0, 1, 0, 'max'], sad: [0, 1, 0, 'max'],
  blush: [0, 1, 0, 'max'], hop: [-0.1, 0.1, 0],
}
/** params that flip sign when a move is mirrored; pairs that swap */
const MIRROR = new Set(['angleX', 'angleZ', 'bodyX', 'bodyZ', 'eyeBallX'])
const CORE_PAIRS = [['eyeLOpen', 'eyeROpen']]

// ------------------------------------------------------------------ idle moves
// tracks: head / body angles add to the wander's targets (so the springs smooth them); eyeBallX/Y add to the gaze; eye
// multiplies both eyes; breath replaces the breathing; anything else adds (or maxes) on the param. limbs: { armR:
// { pose: 'tuck', w: track } } blends a pose in. A move is mirrored at random (signs flip, L / R swap).
export const HUMAN_MOVES = {
  glance: { dur: 4.0, tracks: {
    eyeBallX: [[0, 0], [0.15, 0.8], [2.5, 0.75], [2.8, 0]], eyeBallY: [[0, 0], [0.15, 0.25], [2.5, 0.2], [2.8, 0]],
    angleX: [[0, 0], [0.6, 11], [2.5, 10], [3.4, 0]], angleY: [[0, 0], [0.6, 4], [2.5, 3], [3.4, 0]], angleZ: [[0, 0], [0.7, -4], [2.5, -3], [3.4, 0]],
    bodyX: [[0, 0], [1.0, 2], [2.6, 1.5], [3.8, 0]], brow: [[0, 0], [0.4, 0.25], [2.5, 0.2], [3.2, 0]],
    breath: [[0, 0.1], [0.6, 0.7], [2.6, 0.6], [3.6, 0], [4.0, 0.15]] } },
  lookAround: { dur: 5.0, tracks: {
    eyeBallX: [[0, 0], [0.2, -0.8], [1.4, -0.75], [1.7, 0.1], [2.0, 0.8], [3.2, 0.75], [3.5, 0]],
    angleX: [[0, 0], [0.7, -15], [1.5, -14], [2.4, 15], [3.3, 14], [4.2, 0]], angleY: [[0, 0], [0.8, 3], [2.4, 3], [4.2, 0]],
    angleZ: [[0, 0], [0.8, 3], [1.7, 0], [2.5, -3], [4.2, 0]], bodyX: [[0, 0], [1.0, -3], [2.7, 3], [4.4, 0]],
    brow: [[0, 0], [0.5, 0.3], [3.4, 0.25], [4.2, 0]] } },
  sway: { dur: 6.0, tracks: {
    bodyZ: [[0, 0], [1.5, 3.5], [3.0, -3.5], [4.5, 3], [6.0, 0]], bodyX: [[0, 0], [1.5, 2], [3.0, -2], [4.5, 1.5], [6.0, 0]],
    angleZ: [[0, 0], [1.6, -7], [3.1, 7], [4.6, -6], [6.0, 0]], angleX: [[0, 0], [1.6, 4], [3.1, -4], [4.6, 3], [6.0, 0]],
    eyeBallX: [[0, 0], [1.6, -0.25], [3.1, 0.25], [4.6, -0.2], [6.0, 0]], eye: [[0, 1], [0.8, 0.88], [5.2, 0.88], [6.0, 1]] } },
  think: { dur: 4.4, tracks: {
    eyeBallX: [[0, 0], [0.3, -0.6], [3.4, -0.55], [3.8, 0]], eyeBallY: [[0, 0], [0.3, 0.6], [3.4, 0.55], [3.8, 0]],
    angleX: [[0, 0], [0.8, -9], [3.4, -8], [4.2, 0]], angleY: [[0, 0], [0.8, 6], [3.4, 5], [4.2, 0]], angleZ: [[0, 0], [0.9, 6], [3.4, 5], [4.2, 0]],
    brow: [[0, 0], [0.6, 0.35], [3.4, 0.3], [4.2, 0]], eye: [[0, 1], [0.6, 0.92], [3.4, 0.92], [4.0, 1]] } },
  lookDown: { dur: 2.4, tracks: {
    eyeBallY: [[0, 0], [0.2, -0.85], [1.4, -0.8], [1.65, 0]], eyeBallX: [[0, 0], [0.2, -0.1], [1.4, -0.1], [1.65, 0]],
    angleY: [[0, 0], [0.45, -8], [1.4, -7], [1.9, 1], [2.4, 0]], angleZ: [[0, 0], [0.5, 2], [1.5, 2], [2.4, 0]],
    eye: [[0, 1], [0.3, 0.8], [1.4, 0.8], [1.65, 1]] } },
  hum: { dur: 4.2, tracks: {
    smile: [[0, 0], [0.4, 0.8], [3.6, 0.8], [4.1, 0]], angleZ: [[0, 0], [0.7, 6], [1.5, -6], [2.3, 6], [3.1, -5], [4.0, 0]],
    angleX: [[0, 0], [0.7, 3], [1.5, -3], [2.3, 3], [3.1, -2], [4.0, 0]], bodyZ: [[0, 0], [0.9, 2], [1.7, -2], [2.5, 2], [3.3, -1.5], [4.2, 0]] } },
}
/** a four-legged animal's idle: ears and nose do more of the work than the eyes */
export const ANIMAL_MOVES = {
  lookAround: HUMAN_MOVES.lookAround,
  glance: HUMAN_MOVES.glance,
  lookDown: HUMAN_MOVES.lookDown,
  earFlick: { dur: 1.2, tracks: { earL: [[0, 0], [0.08, -0.7], [0.2, 0.15], [0.45, -0.3], [0.7, 0]], angleZ: [[0, 0], [0.12, -2], [0.5, 0]] } },
  sniff: { dur: 2.6, tracks: {
    angleY: [[0, 0], [0.3, 6], [0.5, 4], [0.65, 6.5], [0.8, 4.5], [0.95, 6.5], [1.1, 4.5], [1.25, 6], [1.9, 5], [2.6, 0]],
    mouthOpen: [[0, 0], [0.5, 0.08], [0.65, 0], [0.8, 0.08], [0.95, 0], [1.1, 0.08], [1.3, 0]], eyeBallY: [[0, 0], [0.3, 0.4], [2.0, 0.3], [2.4, 0]],
    earL: [[0, 0], [0.3, 0.5], [2.2, 0.4], [2.6, 0]], earR: [[0, 0], [0.3, 0.5], [2.2, 0.4], [2.6, 0]] } },
  tilt: { dur: 3.0, tracks: {
    angleZ: [[0, 0], [0.35, 15], [2.2, 13], [2.9, 0]], angleX: [[0, 0], [0.35, 4], [2.2, 3], [2.9, 0]], brow: [[0, 0], [0.3, 0.4], [2.2, 0.35], [2.8, 0]],
    earL: [[0, 0], [0.3, 0.6], [2.2, 0.5], [2.8, 0]], earR: [[0, 0], [0.3, -0.2], [2.2, -0.1], [2.8, 0]] } },
  pant: { dur: 5.0, tracks: { pant: [[0, 0], [0.5, 1], [4.4, 1], [5.0, 0]], smile: [[0, 0], [0.5, 0.5], [4.4, 0.5], [5.0, 0]], eye: [[0, 1], [0.5, 0.85], [4.4, 0.85], [5.0, 1]] } },
  yawn: { dur: 3.0, tracks: {
    mouthOpen: [[0, 0], [0.8, 1], [1.8, 1], [2.3, 0]], vowel: [[0, -0.3]], eye: [[0, 1], [0.6, 0.1], [2.0, 0.1], [2.5, 1]],
    angleY: [[0, 0], [0.8, 10], [1.8, 9], [2.6, 0]], earL: [[0, 0], [0.8, -0.6], [1.9, -0.5], [2.6, 0]], earR: [[0, 0], [0.8, -0.6], [1.9, -0.5], [2.6, 0]] } },
}

// [stiffness, damping ratio]: the head overshoots a little, the torso trails
const SPRING = { angleX: [55, 0.72], angleY: [55, 0.72], angleZ: [45, 0.75], bodyX: [14, 0.9], bodyZ: [12, 0.9] }
const ATTEND = { yaw: 10, yawKnee: 11, yawCap: 15, pitch: 6, pitchKnee: 7, pitchCap: 11, roll: 2.5, rollKnee: 8, rollCap: 12,
  bodyTurn: 1.5, eyeX: 1, eyeY: 0.8, eyeXCap: 0.8, eyeYCap: 0.6, eyeKnee: 0.7, hold: 2.2 }
/** how a character carries itself: 1 = the defaults. wander: the head's / torso's drift; bounce: livelier springs
 *  (less damping); blink: blinks per second; breath: breaths per second; moves: [min, max] s between idle moves */
export const TEMPER = { wander: 1, bounce: 1, blink: 1, breath: 1, moves: [10, 20], look: 1 }

/** the natural idle: noise wander through springs, uneven breath, blinks with doubles, saccades, idle moves, and
 *  attention to a pointer (the eyes lead, the head follows only so far, the brows say it noticed) */
export class LivelyIdle {
  constructor(rand, moves, temper) {
    this.r = rand; this.seed = rand() * 100; this.M = moves; this.T = temper
    this.nextBlink = 1.2 + rand() * 2; this.blinkT = -1; this.blinkAt = -99; this.double = false
    this.nextSaccade = 0.8; this.jitter = { x: 0, y: 0 }
    this.move = null; this.nextMove = 6 + rand() * 4; this.last = ''
    this.breathPhase = 0; this.breathPeriod = 3.8 / temper.breath
    this.s = Object.fromEntries(Object.keys(SPRING).map((k) => [k, { x: 0, v: 0 }])); this.aim = null
    this.att = { px: 0, py: 0, on: false, moved: -99, speed: 0, engaged: false, since: 0, x: 0, y: 0, slow: { x: 0, y: 0 }, soft: 0, side: 1, notice: -99, back: -99 }
    this.gx = 0; this.gy = 0; this.brow = 0
  }
  breath(dt) {
    this.breathPhase += dt / this.breathPeriod
    if (this.breathPhase >= 1) { this.breathPhase -= 1; this.breathPeriod = (3.2 + this.r() * 1.4) / this.T.breath }
    const x = this.breathPhase
    return x < 0.4 ? smooth(0, 0.4, x) : x < 0.88 ? 1 - smooth(0.4, 0.88, x) : 0
  }
  blinkNow(t) { if (this.blinkT < 0 && t - this.blinkAt > 0.5) this.nextBlink = Math.min(this.nextBlink, t) }
  attend(t, dt, q) {
    const a = this.att
    if (q.on && !a.on) { a.notice = t; a.moved = t; a.px = q.x; a.py = q.y; a.side = this.r() < 0.5 ? -1 : 1 }
    if (q.on) {
      const step = Math.hypot(q.x - a.px, q.y - a.py)
      a.speed += (step / Math.max(dt, 1e-3) - a.speed) * Math.min(1, dt / 0.15)
      if (step > 0.003) a.moved = t
      a.px = q.x; a.py = q.y
    } else a.speed *= Math.max(0, 1 - dt / 0.15)
    a.on = q.on
    const onFace = q.on && q.d < 1
    const engaged = q.on && (onFace || t - a.moved < ATTEND.hold)
    if (engaged !== a.engaged) {
      if (!engaged && t - a.since > 0.8) { a.back = t; this.nextMove = Math.max(this.nextMove, t + 6) }
      a.since = t; a.engaged = engaged
    }
    const soft = Math.max(onFace && t - a.moved > 0.5 ? 1 : 0, env(t - a.back, 0.2, 0.6, 0.6))
    a.soft += (soft - a.soft) * Math.min(1, dt / 0.25)
    a.x = engaged ? q.x : 0; a.y = engaged ? q.y : 0
  }
  /** writes the pose and face into P; the move's extra tracks and limb poses into out */
  apply(P, t, dt, ctx, out) {
    const a = this.att, K = ATTEND, T = this.T
    this.attend(t, dt, ctx.pointer)
    const quiet = ctx.busy || a.engaged
    if (this.move) {
      this.move.t += dt
      if (quiet) this.move.fade = Math.max(0, this.move.fade - dt / 0.4)
      if (this.move.t >= this.M[this.move.id].dur || this.move.fade <= 0) this.move = null
    } else if (quiet) this.nextMove = Math.max(this.nextMove, t + 3)
    else if (ctx.moves > 0 && t > this.nextMove) {
      const ids = Object.keys(this.M).filter((k) => k !== this.last)
      const id = ids[Math.floor(this.r() * ids.length)]
      this.move = { id, t: 0, side: this.r() < 0.5 ? -1 : 1, fade: 1 }
      this.last = id; this.nextMove = t + this.M[id].dur + T.moves[0] + this.r() * (T.moves[1] - T.moves[0])
    }
    const m = this.move, M = m ? this.M[m.id] : null
    const w = m ? m.fade * smooth(0, 0.15, m.t) * (1 - smooth(M.dur - 0.25, M.dur, m.t)) * ctx.moves : 0
    const mv = (k, rest = 0) => {
      const tr = M?.tracks[ctx.mirrorKey(k, m.side)]
      if (!tr) return rest
      return rest + (sample(tr, m.t) * (MIRROR.has(k) || ctx.mirror.has(k) ? m.side : 1) - rest) * w
    }
    out.move = m ? { id: m.id, t: m.t, side: m.side, w } : null
    if (M) {
      for (const k of Object.keys(M.tracks)) {
        const kk = ctx.mirrorKey(k, m.side)
        if (!(kk in SPRING) && !/^(eye|breath|eyeBallX|eyeBallY|brow)$/.test(kk)) out.params[kk] = sample(M.tracks[k], m.t) * (MIRROR.has(kk) || ctx.mirror.has(kk) ? m.side : 1) * w
      }
      for (const [lid, L] of Object.entries(M.limbs || {})) out.limbs.push([ctx.mirrorKey(lid, m.side), L.pose, sample(L.w, m.t) * w])
    }
    // blinks: close 75 ms, open 120 ms; one in six doubles
    let open = 1
    if (this.blinkT < 0 && t > this.nextBlink) { this.blinkT = 0; this.blinkAt = t }
    if (this.blinkT >= 0) {
      this.blinkT += dt
      const b = this.blinkT / 0.075
      open = clamp(b < 1 ? 1 - b : b < 2.6 ? (b - 1) / 1.6 : 1, 0, 1)
      if (b >= 2.6) {
        this.blinkT = -1
        if (!this.double && this.r() < 0.18) { this.double = true; this.nextBlink = t + 0.08 }
        else { this.double = false; this.nextBlink = t + (1.8 + this.r() * 3.8) / T.blink }
      }
    }
    P.eyeLOpen = P.eyeROpen = clamp(mv('eye', 1), 0, 1) * open * (1 - 0.14 * a.soft)
    if (t > this.nextSaccade) { this.jitter = { x: (this.r() - 0.5) * 0.22, y: (this.r() - 0.5) * 0.16 }; this.nextSaccade = t + 0.6 + this.r() * 1.6 }
    const gzx = K.eyeX * a.x + this.jitter.x, gzy = K.eyeY * a.y + this.jitter.y
    const ex = gzx + mv('eyeBallX'), ey = gzy + mv('eyeBallY'), e = Math.hypot(ex / K.eyeXCap, ey / K.eyeYCap)
    const kk = e > K.eyeKnee ? knee(e, K.eyeKnee, 1) / e : 1
    const gx = ex * kk, gy = ey * kk
    const s = a.slow
    if (Math.hypot(gx - s.x, gy - s.y) > 0.5) { if (this.blinkT < 0 && t - this.blinkAt > 1.2) this.nextBlink = Math.min(this.nextBlink, t); s.x = gx; s.y = gy }
    s.x += (gx - s.x) * Math.min(1, dt / 0.35); s.y += (gy - s.y) * Math.min(1, dt / 0.35)
    const nod = 3 * env(t - a.notice, 0.12, 0.15, 0.5) - 2.5 * env(t - a.back, 0.15, 0.1, 0.45)
    const sd = this.seed, wd = ctx.wander * T.wander, lk = T.look
    const target = {
      angleX: knee(a.x * K.yaw * lk + fbm(t * 0.17, sd) * 4 * wd + gzx * 2 + mv('angleX'), K.yawKnee, K.yawCap),
      angleY: knee(a.y * K.pitch * lk + fbm(t * 0.13, sd + 1) * 3 * wd + gzy * 2 + nod + mv('angleY'), K.pitchKnee, K.pitchCap),
      angleZ: knee(a.x * K.roll * lk + a.side * 3 * a.soft + fbm(t * 0.11, sd + 2) * 5 * wd + mv('angleZ'), K.rollKnee, K.rollCap),
      bodyX: a.x * K.bodyTurn + fbm(t * 0.09, sd + 3) * 3 * wd + mv('bodyX'),
      bodyZ: fbm(t * 0.08, sd + 4) * 2.5 * wd + mv('bodyZ'),
    }
    this.gx += (gx - this.gx) * Math.min(1, dt * 18); this.gy += (gy - this.gy) * Math.min(1, dt * 18)
    P.eyeBallX = this.gx; P.eyeBallY = this.gy
    const aim = this.aim ??= { ...target }
    const bo = T.bounce
    for (const k of Object.keys(SPRING)) {
      const [Ks0, z0] = SPRING[k], Ks = Ks0 * bo, z = z0 / Math.sqrt(bo), c = 2 * Math.sqrt(Ks) * z, st = this.s[k]
      aim[k] += (target[k] - aim[k]) * Math.min(1, dt / 0.12)
      st.v += (Ks * (aim[k] - st.x) - c * st.v) * dt; st.x += st.v * dt
      P[k] = st.x
    }
    P.breath = clamp(mv('breath', this.breath(dt)), 0, 1)
    const q = ctx.pointer, near = q.on && t - a.moved < 0.3 ? 1 - smooth(1, 2.2, q.d) : 0
    const bt = Math.min(0.7, 0.4 * smooth(0.35, 0.9, a.y) + 0.3 * smooth(1.5, 5, a.speed) + 0.15 * near
      + 0.45 * env(t - a.notice, 0.08, 0.25, 0.35) + 0.2 * env(t - a.back, 0.15, 0.3, 0.5) + 0.12 * a.soft) - (1 - open) * 0.15 + mv('brow')
    this.brow += (bt - this.brow) * Math.min(1, dt * 10)
    P.brow = this.brow
  }
}

/** the "before" idle, for comparison: a few sines, a blink every 3 s, the eyes snapping to the pointer */
export class SineIdle {
  blinkNow() {}
  apply(P, t, dt, ctx) {
    const q = ctx.pointer
    P.angleX = Math.sin(t * 0.7) * 8 + (q.on ? q.x * 12 : 0)
    P.angleY = Math.sin(t * 0.9) * 4 + (q.on ? q.y * 8 : 0)
    P.angleZ = Math.sin(t * 0.5) * 5
    P.bodyX = P.angleX * 0.2; P.bodyZ = 0
    P.breath = 0.5 + 0.5 * Math.sin(t * 2.1)
    const b = t % 3; P.eyeLOpen = P.eyeROpen = b < 0.2 ? Math.abs(b - 0.1) / 0.1 : 1
    P.eyeBallX = q.on ? clamp(q.x, -0.8, 0.8) : 0; P.eyeBallY = q.on ? clamp(q.y, -0.6, 0.6) : 0
  }
}

// ------------------------------------------------------------------ actions
// curve(t, e) -> { param: value, limbs: { armR: { pose, w, sh, el, wr } } }; e is the fade envelope. Values add to the
// pose (or max, for 'max' params). Characters pick these and add their own (character.actions).
export const ACTIONS = {
  nod: { label: '끄덕', dur: 0.95, curve: (t, e) => ({ angleY: -(t < 0.45 ? 11 * Math.sin((Math.PI * t) / 0.45) : 6 * Math.sin((Math.PI * Math.min(t - 0.45, 0.45)) / 0.45)) * e }) },
  shake: { label: '도리도리', dur: 1.05, curve: (t, e) => { const x = 13 * Math.sin((2 * Math.PI * t) / 0.5) * e; return { angleX: x, bodyX: x * 0.15 } } },
  tilt: { label: '갸웃', dur: 1.8, curve: (t, e) => ({ angleZ: 11 * e, angleX: 3 * e, angleY: 2 * e, brow: 0.25 * e }) },
  hop: { label: '깡총', dur: 0.7, curve: (t, e) => ({
    hop: t < 0.2 ? -0.022 * Math.sin((Math.PI * t) / 0.2) : t < 0.6 ? 0.045 * Math.sin((Math.PI * (t - 0.2)) / 0.4) : 0,
    angleY: t > 0.2 && t < 0.6 ? 5 * Math.sin((Math.PI * (t - 0.2)) / 0.4) * e : 0, smile: 0.5 * e }) },
  shy: { label: '수줍', dur: 2.4, curve: (t, e) => ({ angleY: -12 * e, angleX: 9 * e, angleZ: -4 * e, eyeBallX: 0.7 * e, eyeBallY: -0.5 * e, blush: 0.9 * e, smile: 0.25 * e }) },
  wow: { label: '깜짝', dur: 1.6, curve: (t) => { const k = env(t, 0.08, 0.9, 0.5); return { surprise: k, angleY: 5 * k - 2 * env(t, 0.05, 0.05, 0.2), brow: 0.6 * k, mouthOpen: 0.35 * k, vowel: -0.8 * k, hop: 0.012 * env(t, 0.06, 0.04, 0.25) } } },
  pat: { label: '쓰담', dur: 1.9, blink: true, curve: (t, e) => ({ smile: e, blush: 0.7 * e, angleZ: 6 * e, angleY: -4 * e + 2 * Math.sin(t * 9) * e }) },
}

// ------------------------------------------------------------------ talking
// Hangul medial vowels -> how open and how round (-1) / wide (+1)
const JUNG = [[1, 0], [0.75, 0.6], [0.95, 0.1], [0.75, 0.6], [0.8, -0.3], [0.7, 0.7], [0.8, -0.2], [0.7, 0.7], [0.6, -1], [0.9, -0.3],
  [0.75, 0.2], [0.65, 0.3], [0.6, -1], [0.45, -1], [0.75, -0.6], [0.7, -0.2], [0.45, 0.6], [0.45, -1], [0.3, 0.8], [0.4, 0.8], [0.35, 1]]
const LATIN = { a: [1, 0], e: [0.7, 0.7], i: [0.35, 1], o: [0.6, -1], u: [0.45, -1], y: [0.35, 1] }
/** text -> syllables [{t, d, open, vowel, close}] (seconds from the start) */
export function syllables(text, rand) {
  const out = []
  let t = 0.05
  for (const ch of text) {
    const c = ch.codePointAt(0)
    if (c >= 0xac00 && c <= 0xd7a3) {
      const code = c - 0xac00, jung = Math.floor((code % 588) / 28), jong = code % 28
      const d = 0.15 + rand() * 0.05 + (jong ? 0.035 : 0)
      const [open, vowel] = JUNG[jung]
      out.push({ t, d, open: open * (0.75 + rand() * 0.3), vowel, close: jong === 16 || jong === 17 ? 1 : jong ? 0.5 : 0 })
      t += d
    } else if (/[a-z]/i.test(ch)) {
      const v = LATIN[ch.toLowerCase()]
      if (v) { out.push({ t, d: 0.12, open: v[0] * (0.75 + rand() * 0.3), vowel: v[1], close: 0 }); t += 0.12 } else t += 0.035
    } else if (/[.!?~…]/.test(ch)) t += 0.38
    else if (/[,]/.test(ch)) t += 0.22
    else if (/\s/.test(ch)) t += 0.07
  }
  return { list: out, dur: t + 0.1 }
}

// ------------------------------------------------------------------ the deformer
/** maps model points to the canvas for this frame's pose. anchors: head {cx, cy, rx, ry}, extent [side, up, down],
 *  headScale, neckY (roll pivot), chinY, neckBaseY, bottomY (the cut edge or the ground), faceW */
export class Deformer {
  constructor(A, rig) { this.A = A; this.R = rig; this.c = {}; this.neckOff = [0, 0]; this.lift = 0 }
  pose(P, body) {
    const R = this.R, py = P.angleY / 30
    const yaw = (P.angleX / 30) * R.yaw, pitch = py * (1 - 0.25 * py * py) * R.pitch, roll = P.angleZ * D2R * R.roll
    this.P = P; this.body = body
    Object.assign(this.c, { cy: Math.cos(yaw), sy: Math.sin(yaw), cp: Math.cos(pitch), sp: Math.sin(pitch), cr: Math.cos(roll), sr: Math.sin(roll), roll })
    this.lift = -P.hop * 1000
    const o = [0, 0]
    this.bodyRaw(this.A.head.cx, this.A.neckY, o)
    this.neckOff = [o[0], o[1] * 0.7]   // the head rides on the torso
    this.bodyRoll = body.roll * D2R
  }
  /** a head point at `depth`: bulge, turn, nod, drift, roll about the neck */
  head(x, y, depth, out) {
    const A = this.A, h = A.head, E = A.extent, R = this.R
    const u = (x - h.cx) / h.rx, v = (y - h.cy) / h.ry
    const bu = u / E[0], bv = v / (v < 0 ? E[1] : E[2])
    const r2 = bu * bu + bv * bv
    const d = depth * (1 - smooth(0.85, 1.3, Math.sqrt(r2)))  // depth fades out at the skull edge: no tearing
    const z = R.bulge * Math.max(0, 1 - r2) + d
    const { cy, sy, cp, sp, cr, sr } = this.c
    let u2 = u * cy + z * sy
    const z2 = -u * sy + z * cy
    let v2 = v * cp - z2 * sp
    u2 += R.drift[0] * sy; v2 -= R.drift[1] * sp
    const X = h.cx + u2 * h.rx, Y = h.cy + v2 * h.ry
    const nx = h.cx, ny = A.neckY, dx = X - nx, dy = Y - ny, k = A.headScale || 1
    out[0] = nx + (dx * cr - dy * sr) * k + this.neckOff[0]
    out[1] = ny + (dx * sr + dy * cr) * k + this.neckOff[1] + this.lift
    return out
  }
  /** the torso's own motion at (x, y): breath, turn-follow, lean */
  bodyRaw(x, y, out) {
    const A = this.A, h = A.head, P = this.P, R = this.R
    const t = smooth(A.bottomY, A.neckY, y)
    const br = P.breath * R.breath
    let dx = (x - h.cx) * 0.012 * br * t
    let dy = -br * 0.03 * h.ry * Math.pow(t, 1.3)
    const yaw = this.body.yaw / 30, bw = 1.4 * A.faceW
    const u = clamp((x - h.cx) / bw, -1.6, 1.6)
    dx += yaw * bw * 0.16 * Math.pow(t, 1.2) * (1 - 0.18 * u * u) + yaw * (x - h.cx) * -0.04 * Math.sign(u) * t
    const a = this.body.roll * D2R * t
    if (a !== 0) {
      const px = h.cx, py = A.bottomY + 0.4 * (A.bottomY - A.neckY), rx = x - px, ry = y - py, c = Math.cos(a), s = Math.sin(a)
      dx += rx * (c - 1) - ry * s; dy += rx * s + ry * (c - 1)
    }
    out[0] = dx; out[1] = dy
    return out
  }
  body2(x, y, out) { this.bodyRaw(x, y, out); out[0] += x; out[1] += y + this.lift; return out }
  /** with the head under the chin, with the torso at its base */
  neck(x, y, out) {
    const w = 1 - smooth(this.A.chinY - 30, this.A.neckBaseY, y)
    const a = this.head(x, y, 0, [0, 0]), b = this.body2(x, y, [0, 0])
    out[0] = lerp(b[0], a[0], w); out[1] = lerp(b[1], a[1], w)
    return out
  }
  /** ground: a point that never moves (shadows, the floor) */
  ground(x, y, out) { out[0] = x; out[1] = y; return out }
}

// ------------------------------------------------------------------ chains: hair locks, ears, tails, cords
/** spring presets: k (1/s², root; the tip takes k * tip), damping (1/s), drive (how far the root's acceleration
 *  throws it), wind (rad), hang (0: turns with what it hangs from, 1: keeps hanging straight down), tip, limit (rad) */
export const CHAIN = {
  bangs: { k: 170, damp: 12, drive: 1.1, wind: 0.006, hang: 0.08, tip: 0.8, limit: 0.35 },
  side: { k: 70, damp: 6.5, drive: 1.4, wind: 0.012, hang: 0.6, tip: 0.7, limit: 0.5 },
  back: { k: 50, damp: 5.5, drive: 1.4, wind: 0.01, hang: 0.6, tip: 0.7, limit: 0.45 },
  ahoge: { k: 70, damp: 3.6, drive: 1.6, wind: 0.035, hang: 0.1, tip: 0.8, limit: 0.9 },
  cord: { k: 30, damp: 3, drive: 1.3, wind: 0.008, hang: 0.9, tip: 0.8, limit: 0.9 },
  ear: { k: 260, damp: 11, drive: 0.5, wind: 0.004, hang: 0, tip: 0.9, limit: 0.7 },
  floppyEar: { k: 45, damp: 4.5, drive: 1.4, wind: 0.01, hang: 0.75, tip: 0.7, limit: 0.9 },
  tail: { k: 55, damp: 4.2, drive: 1.0, wind: 0.02, hang: 0.05, tip: 0.75, limit: 1.1 },
  tag: { k: 20, damp: 2.2, drive: 1.6, wind: 0.01, hang: 1, tip: 1, limit: 1.2 },
}

/** a rope of joints along a rest polyline (root first, model px). Each segment's angle is a damped spring toward its
 *  rest (plus a param-driven target: a wag, a perk), thrown by the root's acceleration; points of a shape near the
 *  rope are carried by the nearest segment, so the shape bends without stretching */
export class Chain {
  constructor(def, rand) {
    const p = CHAIN[def.preset || 'side']
    Object.assign(this, { depth: 0, attach: 'head', bodyBlend: 0, swing: 1 }, p, def)
    const v = 0.88 + rand() * 0.24
    this.k *= v; this.damp *= Math.sqrt(v)
    this.phase = rand() * 6.28; this.freq = 0.9 + rand() * 0.5
    const P = this.points
    this.n = P.length - 1
    this.L = []; this.phi = []; this.cum = [0]
    for (let i = 0; i < this.n; i++) {
      const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1]
      this.L.push(Math.hypot(dx, dy)); this.phi.push(Math.atan2(dx, dy)); this.cum.push(this.cum[i] + this.L[i])
    }
    this.len = this.cum[this.n]
    this.a = new Array(this.n).fill(0); this.v = new Array(this.n).fill(0)
    this.prev = null; this.vel = [0, 0]; this.acc = [0, 0]
    this.Q = P.map((q) => [...q]); this.th = [...this.phi]
  }
  rootAt(D, out) { return this.attach === 'body' ? D.body2(this.points[0][0], this.points[0][1], out) : D.head(this.points[0][0], this.points[0][1], this.depth, out) }
  roll(D) { return this.attach === 'body' ? D.bodyRoll * 0.6 : D.c.roll }
  step(D, dt, time, scale, P) {
    const p = this.rootAt(D, [0, 0])
    if (!this.prev) this.prev = p
    const inv = 1 / dt, kk = Math.min(1, dt * 30)
    const vx = (p[0] - this.prev[0]) * inv, vy = (p[1] - this.prev[1]) * inv
    this.acc[0] += ((vx - this.vel[0]) * inv - this.acc[0]) * kk; this.acc[1] += ((vy - this.vel[1]) * inv - this.acc[1]) * kk
    this.vel = [vx, vy]; this.prev = p
    const s = scale * this.swing, rho = this.roll(D)
    const drive = this.target ? this.target(P, time) : null   // radians per joint (a number: spread over the joints)
    let abs = rho
    for (let i = 0; i < this.n; i++) {
      const f = i / Math.max(1, this.n - 1), k = this.k * lerp(1, this.tip, f), c = this.damp
      const tg = (drive == null ? 0 : Array.isArray(drive) ? drive[i] ?? 0 : drive / this.n) + (i === 0 ? -rho * this.hang : 0)
      const wind = (Math.sin(time * 1.3 * this.freq + this.phase + i * 0.7) * 0.7 + Math.sin(time * 2.9 * this.freq + this.phase * 1.7 + i) * 0.3) * this.wind * s
      abs += this.a[i]
      const th = this.phi[i] + abs
      // the root's acceleration as a pseudo-force across the segment (a hanging piece lags, then swings back)
      const tx = Math.cos(th), ty = -Math.sin(th)
      const ang = -(this.acc[0] * tx + this.acc[1] * ty) / Math.max(30, this.cum[i + 1]) * this.drive * s * (i === 0 ? 1 : 0.5)
      this.v[i] += (-k * (this.a[i] - tg - wind) - c * this.v[i] + ang) * dt
      this.a[i] += this.v[i] * dt
      const lim = this.limit + (drive != null && !Array.isArray(drive) ? Math.abs(drive) : 0)
      this.a[i] = knee(this.a[i], lim * 0.8, lim)
    }
    // the rope in model space, root fixed, not yet rolled
    let th = 0
    for (let i = 0; i < this.n; i++) {
      th += this.a[i]
      this.th[i] = this.phi[i] + th
      this.Q[i + 1][0] = this.Q[i][0] + this.L[i] * Math.sin(this.th[i]); this.Q[i + 1][1] = this.Q[i][1] + this.L[i] * Math.cos(this.th[i])
    }
  }
  /** a point of a shape on this chain */
  map(D, x, y, out) {
    const P = this.points
    let best = 0, bu = 0, bw = 0, bd = Infinity
    for (let i = 0; i < this.n; i++) {
      const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], L = this.L[i] || 1
      let u = ((x - P[i][0]) * dx + (y - P[i][1]) * dy) / (L * L)
      const w = ((x - P[i][0]) * -dy + (y - P[i][1]) * dx) / L
      const uc = i === 0 ? Math.min(u, 1) : i === this.n - 1 ? Math.max(u, 0) : clamp(u, 0, 1)
      const d = Math.abs(w) + Math.abs(u - uc) * L
      if (d < bd) { bd = d; best = i; bu = i === 0 || i === this.n - 1 ? u : uc; bw = w }
    }
    const i = best, L = this.L[i]
    const dl = (j) => this.th[clamp(j, 0, this.n - 1)] - this.phi[clamp(j, 0, this.n - 1)]
    // the rotation blends across the joints, so a shape bends round them instead of creasing
    const d0 = dl(i), dm = bu < 0.5 ? lerp((dl(i - 1) + d0) / 2, d0, smooth(0, 0.5, bu) * 1) : lerp(d0, (d0 + dl(i + 1)) / 2, smooth(0.5, 1, bu))
    const th = this.th[i], Bx = this.Q[i][0] + bu * L * Math.sin(th), By = this.Q[i][1] + bu * L * Math.cos(th)
    const nx = -Math.cos(this.phi[i] + dm), ny = Math.sin(this.phi[i] + dm)
    const lx = Bx + bw * -nx * -1, ly = By + bw * -ny * -1
    let ddx = lx - x, ddy = ly - y
    const rho = this.roll(D) * 0   // the attach transform already rolls the point
    // carried by what it hangs from
    if (this.attach === 'body') D.body2(x, y, out)
    else {
      D.head(x, y, this.depth, out)
      if (this.bodyBlend > 0) {
        const w = this.bodyBlend * smooth(D.A.chinY - 20, D.A.chinY + 160, y)
        if (w > 0) { const b = D.body2(x, y, [0, 0]); out[0] = lerp(out[0], b[0], w); out[1] = lerp(out[1], b[1], w) }
      }
      const k = D.A.headScale || 1; ddx *= k; ddy *= k
    }
    const r = this.roll(D), c = Math.cos(r - rho), s = Math.sin(r - rho)
    out[0] += ddx * c - ddy * s; out[1] += ddx * s + ddy * c
    return out
  }
  /** a point at arc length share f (0 root .. 1 tip) of the rope, in canvas px */
  at(D, f, out) { const P = this.points, i = Math.min(this.n - 1, Math.floor(f * this.n)), u = f * this.n - i; return this.map(D, lerp(P[i][0], P[i + 1][0], u), lerp(P[i][1], P[i + 1][1], u), out) }
  poke(fx) { for (let i = 0; i < this.n; i++) this.v[i] += fx * (0.6 + 0.4 * i / Math.max(1, this.n - 1)) }
}

// ------------------------------------------------------------------ limbs
/** a two-bone limb on the torso. Angles in degrees: sh — the upper bone from straight down, + outward (away from the
 *  body's middle); el — the lower bone relative to the upper, + further outward / up, - inward toward the body;
 *  wr — the hand / paw; pu, pl — the bones pitched toward the viewer (0: in the picture plane), which shortens them.
 *  A planted limb (a standing leg, a sitting dog's front leg) keeps its end on the ground by IK unless a pose lifts it */
export class Limb {
  constructor(def) {
    Object.assign(this, { spring: [70, 0.7], hang: 0.7, drive: 0.6, breathe: 1.2, bend: 1 }, def)
    const r = this.rest
    this.x = { sh: r.sh, el: r.el, wr: r.wr || 0, pu: r.pu || 0, pl: r.pl || 0 }
    this.v = { sh: 0, el: 0, wr: 0, pu: 0, pl: 0 }
    this.hand = r.hand || 'relaxed'; this.front = 0; this.over = []
    this.prev = null; this.vel = [0, 0]; this.acc = [0, 0]
  }
  shoulder(D, out) { return D.body2(this.root[0], this.root[1], out) }
  /** joint angles -> canvas points */
  solve(D, a = this.x) {
    const s = this.side, S = this.shoulder(D, [0, 0]), roll = D.bodyRoll * 0.8
    const au = s * a.sh * D2R + roll, al = s * (a.sh + a.el) * D2R + roll, ah = s * (a.sh + a.el + a.wr) * D2R + roll
    const fu = Math.cos(a.pu * D2R), fl = Math.cos(a.pl * D2R)
    const E = [S[0] + this.len[0] * fu * Math.sin(au), S[1] + this.len[0] * fu * Math.cos(au)]
    const W = [E[0] + this.len[1] * fl * Math.sin(al), E[1] + this.len[1] * fl * Math.cos(al)]
    return { S, E, W, au, al, ah, fu, fl, hand: this.hand, side: s, lift: this.liftW || 0 }
  }
  step(D, dt, poses, adds, P, report, t) {
    const s = this.side, r = this.rest
    const S = this.shoulder(D, [0, 0])
    if (!this.prev) this.prev = S
    const inv = 1 / dt, kk = Math.min(1, dt * 30), vx = (S[0] - this.prev[0]) * inv, vy = (S[1] - this.prev[1]) * inv
    this.acc[0] += ((vx - this.vel[0]) * inv - this.acc[0]) * kk; this.acc[1] += ((vy - this.vel[1]) * inv - this.acc[1]) * kk
    this.vel = [vx, vy]; this.prev = S
    // the target: the rest pose blended with the poses asked for, plus offsets
    let W = 0
    for (const [, w] of poses) W += w
    const k = W > 1 ? 1 / W : 1
    const tg = {}
    for (const j of ['sh', 'el', 'wr', 'pu', 'pl']) tg[j] = (r[j] || 0) * (1 - Math.min(1, W))
    let hand = r.hand || 'relaxed', hw = 0.5, front = 0, lift = 0
    for (const [pose, w] of poses) {
      for (const j of ['sh', 'el', 'wr', 'pu', 'pl']) tg[j] += (pose[j] ?? r[j] ?? 0) * w * k
      if (w * k > hw) { hand = pose.hand || hand; hw = w * k }
      if (pose.front) front = Math.max(front, w * k)
      if (pose.lift) lift = Math.max(lift, w * k)
    }
    for (const [j, v] of Object.entries(adds)) tg[j] += v
    // hanging: the free arm stays plumb as the torso leans; breathing opens it a little
    const free = 1 - Math.min(1, W)
    tg.sh -= s * D.body.roll * 0.8 * this.hang * free
    tg.sh += P.breath * this.breathe * free
    // joint limits: a pose past them is reported (the checks fail), the rig never goes past them
    for (const [j, [a, b]] of Object.entries(this.lim)) {
      if (tg[j] < a - 1 || tg[j] > b + 1) report?.(`${this.id}.${j} ${tg[j].toFixed(0)}° outside [${a}, ${b}] at ${t.toFixed(2)} s`)
      tg[j] = clamp(tg[j], a, b)
    }
    const [K, z] = this.spring, c = 2 * Math.sqrt(K) * z
    const cur = this.solve(D)
    for (const j of ['sh', 'el', 'wr', 'pu', 'pl']) {
      let f = K * (tg[j] - this.x[j]) - c * this.v[j]
      if (j === 'sh' || j === 'el') {  // thrown by the torso's acceleration, more when hanging free
        const a = j === 'sh' ? cur.au : cur.al, L = this.len[0] + (j === 'el' ? this.len[1] : 0)
        f += (-s * (this.acc[0] * Math.cos(a) - this.acc[1] * Math.sin(a)) / L) / D2R * this.drive * (0.4 + 0.6 * free) * (j === 'el' ? 0.5 : 1)
      }
      this.v[j] += f * dt; this.x[j] += this.v[j] * dt
    }
    for (const [j, [a, b]] of Object.entries(this.lim)) { if (this.x[j] < a || this.x[j] > b) this.v[j] = 0; this.x[j] = clamp(this.x[j], a, b) }
    this.hand = hand; this.front = front
    // planted: IK to the ground point unless a pose lifts it (or the body is in the air)
    const air = Math.abs(P.hop) > 0.002 ? 1 : 0
    // a leg still pitched toward the viewer is still in the air: it lands as it comes down, not when the pose ends
    this.liftW = Math.max(lift, air, smooth(1.5, 12, Math.max(this.x.pu, this.x.pl)))
    if (this.planted && this.liftW < 1) {
      const ik = this.ik(D)
      if (ik) { const w = 1 - this.liftW; this.x.sh = lerp(this.x.sh, ik.sh, w); this.x.el = lerp(this.x.el, ik.el, w) }
    }
  }
  /** two-bone IK from the shoulder to the planted point (lengths kept, the knee bends one way only) */
  ik(D) {
    const s = this.side, S = this.shoulder(D, [0, 0]), T = this.planted, roll = D.bodyRoll * 0.8
    const L1 = this.len[0] * Math.cos(this.x.pu * D2R), L2 = this.len[1] * Math.cos(this.x.pl * D2R)   // the bones as seen, foreshortened
    let dx = T[0] - S[0], dy = T[1] - S[1]
    const d = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + 1, L1 + L2 - 0.01)
    const at = Math.atan2(dx, dy), A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1))
    const au = at + this.bend * s * A
    const E = [S[0] + L1 * Math.sin(au), S[1] + L1 * Math.cos(au)]
    const al = Math.atan2(T[0] - E[0], T[1] - E[1])
    const sh = s * (au - roll) / D2R, el = s * (al - roll) / D2R - sh
    return { sh, el }
  }
}

// ------------------------------------------------------------------ the simulation
/** one character, stepped at a fixed 120 Hz. Inputs are timed, so a scripted run plays back exactly */
export class Sim {
  constructor(ch, seed = 7) {
    this.ch = ch; this.seed = seed
    this.spec = { ...CORE_PARAMS, ...(ch.params || {}) }
    this.pairs = [...CORE_PAIRS, ...(ch.pairs || [])]
    this.mirror = new Set(ch.mirror || [])
    this.temper = { ...TEMPER, ...(ch.temper || {}) }
    this.actionDefs = ch.actions || ACTIONS
    this.mode = 'lively'
    this.settings = { physics: 1, wander: 1, moves: 1 }
    this.reset()
  }
  rest() { return Object.fromEntries(Object.entries(this.spec).map(([k, v]) => [k, v[2]])) }
  mirrorKey(k, side) {
    if (side > 0) return k
    for (const [a, b] of this.pairs) { if (k === a) return b; if (k === b) return a }
    if (/L$/.test(k) && this.limbById?.[k.slice(0, -1) + 'R']) return k.slice(0, -1) + 'R'
    if (/R$/.test(k) && this.limbById?.[k.slice(0, -1) + 'L']) return k.slice(0, -1) + 'L'
    return k
  }
  reset() {
    const r = this.rand = mulberry32(this.seed)
    this.snapped = false
    this.t = 0; this.P = this.rest()
    this.idle = this.mode === 'lively' ? new LivelyIdle(r, this.ch.moves || HUMAN_MOVES, this.temper) : new SineIdle()
    this.D = new Deformer(this.ch.anchors, this.ch.rig)
    this.chains = (this.ch.chains || []).map((d) => new Chain(d, r))
    this.chainById = Object.fromEntries(this.chains.map((c) => [c.id, c]))
    this.limbs = (this.ch.limbs || []).map((d) => new Limb(d))
    this.limbById = Object.fromEntries(this.limbs.map((l) => [l.id, l]))
    this.body = { yaw: 0, roll: 0 }
    this.pointer = { x: 0, y: 0, d: 99, on: false }
    this.exprKeys = [...new Set(Object.values(this.ch.expressions || {}).flatMap((e) => Object.keys(e.set || {})))]
    this.expr = Object.fromEntries(this.exprKeys.map((k) => [k, 0])); this.exprT = { ...this.expr }; this.exprPose = {}; this.exprW = 0; this.exprId = 'none'
    this.actions = []; this.talk = null; this.mouth = 0; this.vowel = 0
    this.acc = 0; this.violations = []
    this.D.pose(this.P, this.body)
    for (const l of this.limbs) l.liftW = 0
  }
  setMode(m) { this.mode = m; this.reset() }
  /** a named pose's angles for one limb (poses: { wave: { armR: {...} } }) */
  poseFor(name, lid) { return this.ch.poses?.[name]?.[lid] }
  express(id) {
    const e = this.ch.expressions?.[id]
    for (const k of this.exprKeys) this.exprT[k] = e?.set?.[k] ?? 0
    this.exprPose = e?.limbs || {}; this.exprId = e ? id : 'none'
  }
  act(id) { const a = this.actionDefs[id]; if (!a) return; this.actions.push({ id, t: 0 }); if (a.blink) this.idle.blinkNow(this.t) }
  say(text) { this.talk = { ...syllables(text, this.rand), t: 0, text } }
  /** pointer in look units (-1..1 round the face, +y up), d: distance from the face centre in face radii */
  point(x, y, d, on) { Object.assign(this.pointer, { x, y, d, on }) }
  /** a tap at a model point flicks the chains near it */
  poke(mx, my, strength = 1) {
    for (const c of this.chains) {
      const m = c.points[Math.floor(c.points.length / 2)], d = Math.hypot(m[0] - mx, m[1] - my)
      const w = Math.exp(-(d * d) / (2 * 120 * 120))
      if (w > 0.05) c.poke((mx < m[0] ? 1 : -1) * 6 * w * strength)
    }
  }
  get busy() { return this.actions.length > 0 || !!this.talk }
  combine(k, v) {
    const P = this.P, sp = this.spec[k]
    if (!sp) return
    P[k] = sp[3] === 'max' ? Math.max(P[k], v) : P[k] + v
  }
  step(dt) {
    const t = (this.t += dt), S = this.spec
    const P = this.P = Object.assign(this.P, this.rest())
    const extra = { params: {}, limbs: [], move: null }
    this.idle.apply(P, t, dt, { pointer: this.pointer, busy: this.busy, moves: this.settings.moves, wander: this.settings.wander, mirror: this.mirror, mirrorKey: (k, s) => this.mirrorKey(k, s) }, extra)
    for (const [k, v] of Object.entries(extra.params)) this.combine(k, v)
    // expressions ease in and out (0.18 s)
    for (const k of this.exprKeys) { this.expr[k] += (this.exprT[k] - this.expr[k]) * Math.min(1, dt / 0.18); this.combine(k, this.expr[k]) }
    // talking: syllables move the mouth; phrases bring small nods and brow lifts
    let open = 0, vowel = 0
    if (this.talk) {
      const T = this.talk; T.t += dt
      for (const s of T.list) {
        const u = T.t - s.t
        if (u < -0.02 || u > s.d + 0.06) continue
        const shape = smooth(-0.02, 0.05, u) * (1 - smooth(s.d * (s.close ? 0.55 : 0.75), s.d + 0.06, u))
        if (shape * s.open > open) { open = shape * s.open; vowel = s.vowel }
      }
      let emph = 0
      for (let i = 0; i < T.list.length; i++) {
        const s = T.list[i], gap = i === 0 ? 1 : s.t - (T.list[i - 1].t + T.list[i - 1].d)
        if (gap > 0.05) emph += env(T.t - s.t, 0.1, 0.08, 0.4)
      }
      P.angleY -= 4 * emph; P.brow += 0.25 * emph; P.angleX += 2.5 * Math.sin(T.t * 1.7) * smooth(0, 0.4, T.t)
      if (T.t > T.dur) this.talk = null
    }
    this.mouth += (open - this.mouth) * Math.min(1, dt / (open > this.mouth ? 0.035 : 0.07))
    this.vowel += (vowel - this.vowel) * Math.min(1, dt / 0.06)
    P.mouthOpen += this.mouth; P.vowel += this.vowel
    // one-shot actions on top
    const limbPose = Object.fromEntries(this.limbs.map((l) => [l.id, []])), limbAdd = Object.fromEntries(this.limbs.map((l) => [l.id, {}]))
    for (const a of this.actions) {
      a.t += dt
      const def = this.actionDefs[a.id], tt = Math.min(a.t, def.dur)
      const o = def.curve(tt, fade(tt, def.dur), this)
      for (const [k, v] of Object.entries(o)) if (k !== 'limbs') this.combine(k, v)
      for (const [lid, L] of Object.entries(o.limbs || {})) {
        if (!limbPose[lid]) continue
        if (L.pose) limbPose[lid].push([this.poseFor(L.pose, lid), L.w ?? 1])
        for (const j of ['sh', 'el', 'wr', 'pu', 'pl']) if (L[j]) limbAdd[lid][j] = (limbAdd[lid][j] || 0) + L[j]
      }
    }
    this.actions = this.actions.filter((a) => a.t < this.actionDefs[a.id].dur)
    for (const [lid, pose, w] of extra.limbs) if (limbPose[lid]) limbPose[lid].push([this.poseFor(pose, lid), w])
    this.exprW += ((Object.keys(this.exprPose).length ? 1 : 0) - this.exprW) * Math.min(1, dt / 0.25)
    for (const [lid, pose] of Object.entries(this.exprPose)) if (limbPose[lid]) limbPose[lid].push([this.poseFor(pose, lid), this.exprW])
    for (const [k, [a, b]] of Object.entries(S)) P[k] = clamp(P[k], a, b)
    // the torso follows the head a quarter second behind, inside its joint limits
    const kb = this.mode === 'lively' ? Math.min(1, dt * 5) : 1
    const [ty, tr] = this.bodyTarget()
    this.body.yaw += (ty - this.body.yaw) * kb
    this.body.roll += (tr - this.body.roll) * kb
    this.D.pose(P, this.body)
    const ps = this.mode === 'lively' ? this.settings.physics : 0
    const report = (msg) => { if (this.violations.length < 50) this.violations.push(msg) }
    for (const l of this.limbs) l.step(this.D, dt, limbPose[l.id].filter(([p]) => p), limbAdd[l.id], P, report, t)
    for (const c of this.chains) {
      if (ps > 0 || c.target) c.step(this.D, dt, t, Math.max(ps, 0.0001), P)
    }
  }
  bodyTarget() {
    const P = this.P, R = this.ch.rig.body, L = this.ch.rig.limits || { yaw: 12, roll: 5 }
    return [clamp(P.bodyX + P.angleX * R.yaw, -L.yaw, L.yaw), clamp(P.bodyZ + P.angleZ * R.roll, -L.roll, L.roll)]
  }
  /** set params by hand and show them at once (pose sheets, tests); limbs: { armR: 'wave' } */
  snap(p = {}, limbs = {}, settle = 1.2) {
    const keep = { ...p }
    this.reset()
    this.snapped = true
    // settle the limbs and chains with the pose held (no idle)
    this.idle = { apply: () => {}, blinkNow: () => {} }
    for (const k of Object.keys(this.expr)) this.expr[k] = 0
    for (let i = 0; i < settle * 120; i++) {
      this.t += 1 / 120
      Object.assign(this.P, this.rest(), keep)
      for (const [k, [a, b]] of Object.entries(this.spec)) this.P[k] = clamp(this.P[k], a, b)
      const [y, r] = this.bodyTarget(); this.body.yaw = y; this.body.roll = r
      this.D.pose(this.P, this.body)
      for (const l of this.limbs) {
        const pose = limbs[l.id] ? [[this.poseFor(limbs[l.id], l.id), 1]] : []
        l.step(this.D, 1 / 120, pose.filter(([q]) => q), {}, this.P, (m) => this.violations.push(m), this.t)
      }
      for (const c of this.chains) c.step(this.D, 1 / 120, this.t, 1, this.P)
    }
  }
  /** real time in, fixed steps out */
  advance(dt) {
    this.acc += Math.min(dt, 0.1)
    const h = 1 / 120
    while (this.acc >= h) { this.step(h); this.acc -= h }
  }
}

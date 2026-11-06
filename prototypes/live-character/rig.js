// rig.js — a 2.5D "living character" rig for vector-drawn busts.
//
// What makes the motion read as alive (studied from LivLiv Player, livliv-dev/player, Apache-2.0:
// runtime/idle.ts, actions.ts, puppet.ts — curves and numbers here are re-tuned for vector drawing):
//  - the head sits on a paraboloid "bulge"; yaw / pitch rotate it and every path point takes a depth
//    (back hair < face < eyes < nose < bangs), so a turn is parallax, not a slide. Depth fades out at the skull
//    edge, so the silhouette never tears
//  - head and body wander on smooth value noise (never a loop of sines) and follow their targets through
//    damped springs: the eyes lead, the head overshoots a little, the body trails ~0.25 s behind
//  - breaths are uneven (in 40 %, out 48 %, a pause; 3.2–4.6 s), blinks close fast / open slow, one in six is double
//  - every 10–20 s a small idle move (glance, look around, sway, think, look down, hum) — several params at once
//  - hair is a two-segment spring per lock, thrown by the root's acceleration, hanging under gravity on a tilt
// Everything is deterministic: a seeded RNG and a fixed 120 Hz step, so renderAt(t) gives the same frame twice.

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
export const lerp = (a, b, t) => a + (b - a) * t
/** v as it is up to k, then easing toward cap, never past it: a soft limit */
const knee = (v, k, cap) => { const a = Math.abs(v); return a <= k ? v : Math.sign(v) * (k + (cap - k) * Math.tanh((a - k) / (cap - k))) }
/** an envelope s seconds after an event: up over a, held h, down over d */
const env = (s, a, h, d) => (s < 0 || s > a + h + d ? 0 : s < a ? smooth(0, a, s) : 1 - smooth(a + h, a + h + d, s))

export function mulberry32(seed) {
  let s = seed >>> 0
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const hash = (n, seed) => { const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return x - Math.floor(x) }
/** smooth 1D value noise in -1..1 */
export function noise(t, seed) { const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return (hash(i, seed) * (1 - u) + hash(i + 1, seed) * u) * 2 - 1 }
export const fbm = (t, seed) => noise(t, seed) * 0.7 + noise(t * 2.3, seed + 17) * 0.3

/** a keyframed track [[s, v], ...]: cubic through the keys, flat at both ends */
function sample(k, t) {
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
/** the pose and face. Angles in degrees (the rig maps ±30 to a modest 2D turn), the rest 0..1 or -1..1 */
export const defaultParams = () => ({
  angleX: 0, angleY: 0, angleZ: 0, bodyX: 0, bodyZ: 0, breath: 0,
  eyeLOpen: 1, eyeROpen: 1, eyeBallX: 0, eyeBallY: 0, brow: 0,
  mouthOpen: 0, vowel: 0, smile: 0, surprise: 0, sad: 0, blush: 0, hop: 0,
})
const RANGES = {
  angleX: [-30, 30], angleY: [-30, 30], angleZ: [-30, 30], bodyX: [-10, 10], bodyZ: [-10, 10], breath: [0, 1],
  eyeLOpen: [0, 1.2], eyeROpen: [0, 1.2], eyeBallX: [-1, 1], eyeBallY: [-1, 1], brow: [-1, 1],
  mouthOpen: [0, 1], vowel: [-1, 1], smile: [0, 1], surprise: [0, 1], sad: [0, 1], blush: [0, 1], hop: [-0.1, 0.1],
}

// ------------------------------------------------------------------ idle moves
// head / body tracks add to the wander's targets (so the springs smooth them too); eyeBall adds to the gaze;
// eye multiplies the eye opening; brow adds; breath replaces the breathing; smile adds. Mirrored at random.
export const IDLE_MOVES = {
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
  // eyes close happily, the head rocks to a tune
  hum: { dur: 4.2, tracks: {
    smile: [[0, 0], [0.4, 0.8], [3.6, 0.8], [4.1, 0]], angleZ: [[0, 0], [0.7, 6], [1.5, -6], [2.3, 6], [3.1, -5], [4.0, 0]],
    angleX: [[0, 0], [0.7, 3], [1.5, -3], [2.3, 3], [3.1, -2], [4.0, 0]], bodyZ: [[0, 0], [0.9, 2], [1.7, -2], [2.5, 2], [3.3, -1.5], [4.2, 0]] } },
}

// [stiffness, damping ratio]: the head overshoots a little, the body trails
const SPRING = { angleX: [55, 0.72], angleY: [55, 0.72], angleZ: [45, 0.75], bodyX: [14, 0.9], bodyZ: [12, 0.9] }
const ATTEND = { yaw: 10, yawKnee: 11, yawCap: 15, pitch: 6, pitchKnee: 7, pitchCap: 11, roll: 2.5, rollKnee: 8, rollCap: 12,
  bodyTurn: 1.5, eyeX: 1, eyeY: 0.8, eyeXCap: 0.8, eyeYCap: 0.6, eyeKnee: 0.7, hold: 2.2 }

/** the natural idle: noise wander through springs, uneven breath, blinks with doubles, saccades, idle moves, and
 *  attention to a pointer (the eyes lead, the head follows only so far, the brows say it noticed) */
export class LivelyIdle {
  constructor(rand) {
    this.r = rand; this.seed = rand() * 100
    this.nextBlink = 1.2 + rand() * 2; this.blinkT = -1; this.blinkAt = -99; this.double = false
    this.nextSaccade = 0.8; this.jitter = { x: 0, y: 0 }
    this.move = null; this.nextMove = 7 + rand() * 4; this.last = ''
    this.breathPhase = 0; this.breathPeriod = 3.8
    this.s = Object.fromEntries(Object.keys(SPRING).map((k) => [k, { x: 0, v: 0 }])); this.aim = null
    this.att = { px: 0, py: 0, on: false, moved: -99, speed: 0, engaged: false, since: 0, x: 0, y: 0, slow: { x: 0, y: 0 },
      soft: 0, side: 1, notice: -99, back: -99 }
    this.gaze = { x: 0, y: 0 }
  }
  breath(dt) {
    this.breathPhase += dt / this.breathPeriod
    if (this.breathPhase >= 1) { this.breathPhase -= 1; this.breathPeriod = 3.2 + this.r() * 1.4 }
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
  apply(P, t, dt, ctx) {
    const a = this.att, K = ATTEND
    this.attend(t, dt, ctx.pointer)
    const quiet = ctx.busy || a.engaged
    // idle move: started now and then, faded out (0.4 s) when something else takes over
    if (this.move) {
      this.move.t += dt
      if (quiet) this.move.fade = Math.max(0, this.move.fade - dt / 0.4)
      if (this.move.t >= IDLE_MOVES[this.move.id].dur || this.move.fade <= 0) this.move = null
    } else if (quiet) this.nextMove = Math.max(this.nextMove, t + 3)
    else if (ctx.moves > 0 && t > this.nextMove) {
      const ids = Object.keys(IDLE_MOVES).filter((k) => k !== this.last)
      const id = ids[Math.floor(this.r() * ids.length)]
      this.move = { id, t: 0, side: this.r() < 0.5 ? -1 : 1, fade: 1 }
      this.last = id; this.nextMove = t + IDLE_MOVES[id].dur + 10 + this.r() * 10
    }
    const m = this.move, M = m ? IDLE_MOVES[m.id] : null
    const w = m ? m.fade * smooth(0, 0.15, m.t) * (1 - smooth(M.dur - 0.25, M.dur, m.t)) : 0
    const mv = (k, rest = 0) => {
      const tr = M?.tracks[k]
      if (!tr) return rest
      const mir = /^(angleX|angleZ|bodyX|bodyZ|eyeBallX)$/.test(k) ? m.side : 1
      return rest + (sample(tr, m.t) * mir - rest) * w
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
        else { this.double = false; this.nextBlink = t + 1.8 + this.r() * 3.8 }
      }
    }
    const eye = clamp(mv('eye', 1), 0, 1) * open * (1 - 0.14 * a.soft)
    P.eyeLOpen = P.eyeROpen = eye
    // gaze: the eyes go straight to the attention, with a small drift at saccades, inside an ellipse
    if (t > this.nextSaccade) { this.jitter = { x: (this.r() - 0.5) * 0.22, y: (this.r() - 0.5) * 0.16 }; this.nextSaccade = t + 0.6 + this.r() * 1.6 }
    this.gaze = { x: K.eyeX * a.x + this.jitter.x, y: K.eyeY * a.y + this.jitter.y }
    const ex = this.gaze.x + mv('eyeBallX'), ey = this.gaze.y + mv('eyeBallY'), e = Math.hypot(ex / K.eyeXCap, ey / K.eyeYCap)
    const kk = e > K.eyeKnee ? knee(e, K.eyeKnee, 1) / e : 1
    const gx = ex * kk, gy = ey * kk
    // a big quick gaze shift comes with a blink
    const s = a.slow
    if (Math.hypot(gx - s.x, gy - s.y) > 0.5) { if (this.blinkT < 0 && t - this.blinkAt > 1.2) this.nextBlink = Math.min(this.nextBlink, t); s.x = gx; s.y = gy }
    s.x += (gx - s.x) * Math.min(1, dt / 0.35); s.y += (gy - s.y) * Math.min(1, dt / 0.35)
    const nod = 3 * env(t - a.notice, 0.12, 0.15, 0.5) - 2.5 * env(t - a.back, 0.15, 0.1, 0.45)
    const sd = this.seed, wd = ctx.wander
    const target = {
      angleX: knee(a.x * K.yaw + fbm(t * 0.17, sd) * 4 * wd + this.gaze.x * 2 + mv('angleX'), K.yawKnee, K.yawCap),
      angleY: knee(a.y * K.pitch + fbm(t * 0.13, sd + 1) * 3 * wd + this.gaze.y * 2 + nod + mv('angleY'), K.pitchKnee, K.pitchCap),
      angleZ: knee(a.x * K.roll + a.side * 3 * a.soft + fbm(t * 0.11, sd + 2) * 5 * wd + mv('angleZ'), K.rollKnee, K.rollCap),
      bodyX: a.x * K.bodyTurn + fbm(t * 0.09, sd + 3) * 3 * wd + mv('bodyX'),
      bodyZ: fbm(t * 0.08, sd + 4) * 2.5 * wd + mv('bodyZ'),
    }
    P.eyeBallX += (gx - P.eyeBallX) * Math.min(1, dt * 18)
    P.eyeBallY += (gy - P.eyeBallY) * Math.min(1, dt * 18)
    // targets eased 0.12 s first (a stepped target would jolt the spring), then the springs
    const aim = this.aim ??= { ...target }
    for (const k of Object.keys(SPRING)) {
      const [Ks, z] = SPRING[k], c = 2 * Math.sqrt(Ks) * z, st = this.s[k]
      aim[k] += (target[k] - aim[k]) * Math.min(1, dt / 0.12)
      st.v += (Ks * (aim[k] - st.x) - c * st.v) * dt; st.x += st.v * dt
      P[k] = st.x
    }
    P.breath = clamp(mv('breath', this.breath(dt)), 0, 1)
    P.smile = mv('smile', 0)
    const near = ctx.pointer.on && t - a.moved < 0.3 ? 1 - smooth(1, 2.2, ctx.pointer.d) : 0
    const bt = Math.min(0.7, 0.4 * smooth(0.35, 0.9, a.y) + 0.3 * smooth(1.5, 5, a.speed) + 0.15 * near
      + 0.45 * env(t - a.notice, 0.08, 0.25, 0.35) + 0.2 * env(t - a.back, 0.15, 0.3, 0.5) + 0.12 * a.soft) - (1 - open) * 0.15 + mv('brow')
    P.brow += (bt - P.brow) * Math.min(1, dt * 10)
  }
}

/** the "before" idle, for comparison: a few sines, a blink every 3 s, the eyes snapping to the pointer */
export class SineIdle {
  constructor() { this.gaze = { x: 0, y: 0 } }
  blinkNow() {}
  apply(P, t, dt, ctx) {
    P.angleX = Math.sin(t * 0.7) * 8 + (ctx.pointer.on ? ctx.pointer.x * 12 : 0)
    P.angleY = Math.sin(t * 0.9) * 4 + (ctx.pointer.on ? ctx.pointer.y * 8 : 0)
    P.angleZ = Math.sin(t * 0.5) * 5
    P.bodyX = P.angleX * 0.2; P.bodyZ = 0
    P.breath = 0.5 + 0.5 * Math.sin(t * 2.1)
    const b = t % 3; P.eyeLOpen = P.eyeROpen = b < 0.2 ? Math.abs(b - 0.1) / 0.1 : 1
    P.eyeBallX = ctx.pointer.on ? clamp(ctx.pointer.x, -0.8, 0.8) : 0; P.eyeBallY = ctx.pointer.on ? clamp(ctx.pointer.y, -0.6, 0.6) : 0
    P.brow = 0; P.smile = 0
  }
}

// ------------------------------------------------------------------ actions
const ADUR = { nod: 0.95, shake: 1.05, tilt: 1.8, hop: 0.7, shy: 2.4, wow: 1.6, pat: 1.9 }
const aenv = (t, d) => smooth(0, 0.18, t) * (1 - smooth(d - 0.22, d, t))
/** offsets t seconds into a one-shot move (they fade in and out, so pressing one mid-move never jumps) */
function actionCurve(id, t) {
  const d = ADUR[id], e = aenv(t, d), o = {}
  if (id === 'nod') o.angleY = -(t < 0.45 ? 11 * Math.sin((Math.PI * t) / 0.45) : 6 * Math.sin((Math.PI * Math.min(t - 0.45, 0.45)) / 0.45)) * e
  if (id === 'shake') { o.angleX = 13 * Math.sin((2 * Math.PI * t) / 0.5) * e; o.bodyX = o.angleX * 0.15 }
  if (id === 'tilt') { o.angleZ = 11 * e; o.angleX = 3 * e; o.angleY = 2 * e; o.brow = 0.25 * e }
  if (id === 'hop') {  // crouch, then up: a bust can't leave its cut edge, so it is a bob
    o.hop = t < 0.2 ? -0.022 * Math.sin((Math.PI * t) / 0.2) : t < 0.6 ? 0.045 * Math.sin((Math.PI * (t - 0.2)) / 0.4) : 0
    o.angleY = t > 0.2 && t < 0.6 ? 5 * Math.sin((Math.PI * (t - 0.2)) / 0.4) * e : 0
    o.smile = 0.5 * e
  }
  if (id === 'shy') { o.angleY = -12 * e; o.angleX = 9 * e; o.angleZ = -4 * e; o.eyeBallX = 0.7 * e; o.eyeBallY = -0.5 * e; o.blush = 0.9 * e; o.smile = 0.25 * e }
  if (id === 'wow') { const k = env(t, 0.08, 0.9, 0.5); o.surprise = k; o.angleY = 5 * k - 2 * env(t, 0.05, 0.05, 0.2); o.brow = 0.6 * k; o.mouthOpen = 0.35 * k; o.vowel = -0.8 * k; o.hop = 0.012 * env(t, 0.06, 0.04, 0.25) }
  if (id === 'pat') { o.smile = e; o.blush = 0.7 * e; o.angleZ = 6 * e; o.angleY = -4 * e + 2 * Math.sin(t * 9) * e; o.eyeMul = 1 - 0.0 * e }
  return o
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
/** maps model points to the canvas for this frame's pose. A character gives its anchors:
 *  head {cx, cy, rx, ry}, extent [side, up, down], neckY (roll pivot), chinY, bottomY, faceW */
export class Deformer {
  constructor(A, rig) { this.A = A; this.R = rig; this.o = [0, 0]; this.c = {}; this.neckOff = [0, 0]; this.lift = 0 }
  pose(P, body) {
    const R = this.R, py = P.angleY / 30
    const yaw = (P.angleX / 30) * R.yaw, pitch = py * (1 - 0.25 * py * py) * R.pitch, roll = (P.angleZ * Math.PI) / 180 * R.roll
    this.P = P; this.body = body
    Object.assign(this.c, { cy: Math.cos(yaw), sy: Math.sin(yaw), cp: Math.cos(pitch), sp: Math.sin(pitch), cr: Math.cos(roll), sr: Math.sin(roll), roll })
    this.lift = -P.hop * 1000
    // the head rides on the torso: what the torso does at the neck, the head does too
    const o = [0, 0]
    this.bodyRaw(this.A.head.cx, this.A.neckY, o)
    this.neckOff = [o[0], o[1] * 0.7]
  }
  /** a head point at `depth` (bangs > 0 > back hair): bulge, turn, nod, drift, roll about the neck */
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
    let X = h.cx + u2 * h.rx, Y = h.cy + v2 * h.ry
    const nx = h.cx, ny = A.neckY, dx = X - nx, dy = Y - ny
    const k = A.headScale || 1
    out[0] = nx + (dx * cr - dy * sr) * k + this.neckOff[0]
    out[1] = ny + (dx * sr + dy * cr) * k + this.neckOff[1] + this.lift
    return out
  }
  /** the torso's own motion at (x, y): breath, turn-follow, lean (no lift) */
  bodyRaw(x, y, out) {
    const A = this.A, h = A.head, P = this.P, R = this.R
    const t = smooth(A.bottomY, A.neckY, y)
    const br = P.breath * R.breath
    let dx = (x - h.cx) * 0.012 * br * t
    let dy = -br * 0.03 * h.ry * Math.pow(t, 1.3)
    const yaw = this.body.yaw / 30, bw = 1.4 * A.faceW
    const u = clamp((x - h.cx) / bw, -1.6, 1.6)
    dx += yaw * bw * 0.16 * Math.pow(t, 1.2) * (1 - 0.18 * u * u) + yaw * (x - h.cx) * -0.04 * Math.sign(u) * t
    const a = (this.body.roll * Math.PI / 180) * t
    if (a !== 0) {
      const px = h.cx, py = A.bottomY + 0.4 * (A.bottomY - A.neckY), rx = x - px, ry = y - py, c = Math.cos(a), s = Math.sin(a)
      dx += rx * (c - 1) - ry * s; dy += rx * s + ry * (c - 1)
    }
    out[0] = dx; out[1] = dy
    return out
  }
  body2(x, y, out) { this.bodyRaw(x, y, out); out[0] += x; out[1] += y + this.lift; return out }
  /** the neck: with the head under the chin, with the torso at its base */
  neck(x, y, out) {
    const w = 1 - smooth(this.A.chinY - 30, this.A.neckBaseY, y)
    const a = this.head(x, y, 0, [0, 0]), b = this.body2(x, y, [0, 0])
    out[0] = lerp(b[0], a[0], w); out[1] = lerp(b[1], a[1], w)
    return out
  }
}

// ------------------------------------------------------------------ hair & swinging pieces
/** spring groups [k1, c1, k2, c2, drive, wind, hang]: roots stiffer than tips, bangs stiffer than long hair */
export const HAIR = {
  front: [150, 11, 80, 8, 1.1, 0.7, 0.08],
  side: [70, 6.5, 40, 5, 2.2, 1.6, 0.35],
  back: [45, 5.5, 26, 3.8, 2.4, 2.2, 0.4],
  ahoge: [55, 3.2, 45, 3.0, 1.6, 3.0, 0.15],
  cord: [26, 2.6, 22, 2.4, 1.3, 1.2, 0.85],
}

/** a lock: one swinging piece. root/tip in model px; attach 'head' (at depth) or 'body'. Each gets its own spring,
 *  scaled a little at random, so neighbouring locks never move in lockstep */
export class Lock {
  constructor(def, rand) {
    Object.assign(this, { depth: 0, attach: 'head', bodyBlend: 0, swing: 1 }, def)
    const g = HAIR[this.group]
    const v = 0.88 + rand() * 0.24
    this.k1 = g[0] * v; this.c1 = g[1] * Math.sqrt(v); this.k2 = g[2] * v; this.c2 = g[3] * Math.sqrt(v)
    this.drive = g[4]; this.wind = g[5]; this.hang = g[6]
    this.phase = rand() * 6.28; this.freq = 0.9 + rand() * 0.5
    this.len = Math.hypot(this.tip[0] - this.root[0], this.tip[1] - this.root[1])
    this.a = { x: 0, y: 0, vx: 0, vy: 0 }; this.b = { x: 0, y: 0, vx: 0, vy: 0 }
    this.prev = null; this.vel = { x: 0, y: 0 }; this.acc = { x: 0, y: 0 }
    this.limit = Math.min(60, this.len * 0.35)
  }
  /** where the root is now (canvas px) */
  rootAt(D, out) { return this.attach === 'body' ? D.body2(this.root[0], this.root[1], out) : D.head(this.root[0], this.root[1], this.depth, out) }
  step(D, dt, time, scale) {
    const p = this.rootAt(D, [0, 0])
    if (!this.prev) this.prev = p
    const inv = 1 / dt, k = Math.min(1, dt * 30)
    const vx = (p[0] - this.prev[0]) * inv, vy = (p[1] - this.prev[1]) * inv
    // the root's acceleration, low-passed (~33 ms) so a jittery input does not shake the hair
    this.acc.x += ((vx - this.vel.x) * inv - this.acc.x) * k; this.acc.y += ((vy - this.vel.y) * inv - this.acc.y) * k
    this.vel.x = vx; this.vel.y = vy; this.prev = p
    const s = scale * this.swing
    const roll = this.attach === 'body' ? (D.body.roll * Math.PI) / 180 * 0.5 : D.c.roll
    const wind = (Math.sin(time * 1.3 * this.freq + this.phase) * 0.7 + Math.sin(time * 2.9 * this.freq + this.phase * 1.7) * 0.3) * this.wind * s
    const grav = Math.sin(roll) * this.len * 0.5 * this.hang
    const a = this.a, b = this.b
    a.vx += (-this.k1 * (a.x - wind - grav) - this.c1 * a.vx - this.acc.x * this.drive * s * 0.5) * dt
    a.vy += (-this.k1 * a.y - this.c1 * a.vy - this.acc.y * this.drive * s * 0.35) * dt
    a.x += a.vx * dt; a.y += a.vy * dt
    b.vx += (-this.k2 * (b.x - a.x * 1.7) - this.c2 * b.vx) * dt
    b.vy += (-this.k2 * (b.y - a.y * 1.4) - this.c2 * b.vy) * dt
    b.x += b.vx * dt; b.y += b.vy * dt
    const L = this.limit
    for (const q of [a, b]) { q.x = clamp(q.x, -L, L); q.y = clamp(q.y, -L * 0.6, L * 0.6) }
  }
  /** a point of this lock: carried by what it hangs from, bent by the springs along its length */
  map(D, x, y, out) {
    const dx = this.tip[0] - this.root[0], dy = this.tip[1] - this.root[1]
    const t = clamp(((x - this.root[0]) * dx + (y - this.root[1]) * dy) / (this.len * this.len), 0, 1)
    if (this.attach === 'body') D.body2(x, y, out)
    else {
      D.head(x, y, this.depth, out)
      if (this.bodyBlend > 0) {  // long hair below the jaw rests partly on the shoulders
        const w = this.bodyBlend * smooth(D.A.chinY - 20, D.A.chinY + 160, y)
        if (w > 0) { const b = D.body2(x, y, [0, 0]); out[0] = lerp(out[0], b[0], w); out[1] = lerp(out[1], b[1], w) }
      }
    }
    // a quadratic through 0 at the root, a at the middle, b at the tip
    const ax = 2 * this.a.x - 0.5 * this.b.x, ay = 2 * this.a.y - 0.5 * this.b.y
    out[0] += 2 * (1 - t) * t * ax + t * t * this.b.x
    out[1] += 2 * (1 - t) * t * ay + t * t * this.b.y
    return out
  }
  poke(fx, fy) { this.a.vx += fx * 0.6; this.a.vy += fy * 0.6; this.b.vx += fx; this.b.vy += fy }
}

// ------------------------------------------------------------------ the simulation
/** one character, stepped at a fixed 120 Hz. Inputs are timed, so a scripted run plays back exactly */
export class Sim {
  constructor(character, seed = 7) { this.ch = character; this.seed = seed; this.reset() }
  reset() {
    const r = this.rand = mulberry32(this.seed)
    this.t = 0; this.P = defaultParams()
    this.mode = this.mode || 'lively'
    this.idle = this.mode === 'lively' ? new LivelyIdle(r) : new SineIdle()
    this.D = new Deformer(this.ch.anchors, this.ch.rig)
    this.locks = this.ch.locks.map((d) => new Lock(d, r))
    this.lockById = Object.fromEntries(this.locks.map((l) => [l.id, l]))
    this.body = { yaw: 0, roll: 0 }
    this.pointer = { x: 0, y: 0, d: 99, on: false }
    this.expr = { smile: 0, surprise: 0, sad: 0, blush: 0 }; this.exprT = { smile: 0, surprise: 0, sad: 0, blush: 0 }
    this.actions = []; this.talk = null; this.mouth = 0; this.vowel = 0
    this.settings = this.settings || { physics: 1, wander: 1, moves: 1 }
    this.acc = 0
    this.D.pose(this.P, this.body)
  }
  setMode(m) { this.mode = m; this.reset() }
  express(id) { for (const k of Object.keys(this.exprT)) this.exprT[k] = 0; if (id === 'smile') { this.exprT.smile = 1; this.exprT.blush = 0.25 } if (id === 'sad') this.exprT.sad = 1; if (id === 'surprise') this.exprT.surprise = 1; if (id === 'shy') { this.exprT.blush = 1; this.exprT.smile = 0.35 } }
  act(id) { this.actions.push({ id, t: 0 }); if (id === 'pat') this.idle.blinkNow(this.t) }
  say(text) { this.talk = { ...syllables(text, this.rand), t: 0, text, nods: [] } }
  /** pointer in look units (-1..1 round the face, +y up), d: distance from the face centre in face radii */
  point(x, y, d, on) { Object.assign(this.pointer, { x, y, d, on }) }
  poke(mx, my, strength = 1) {
    for (const l of this.locks) {
      const dx = this.tip0(l, 0) - mx, dy = this.tip0(l, 1) - my, d = Math.hypot(dx, dy)
      const w = Math.exp(-(d * d) / (2 * 110 * 110))
      if (w > 0.05) l.poke((mx < l.root[0] ? 1 : -1) * 260 * w * strength, -60 * w * strength)
    }
  }
  tip0(l, i) { return (l.root[i] + l.tip[i]) / 2 }
  get busy() { return this.actions.length > 0 || !!this.talk }
  step(dt) {
    const P = this.P, t = (this.t += dt)
    this.idle.apply(P, t, dt, { pointer: this.pointer, busy: this.busy, moves: this.settings.moves, wander: this.settings.wander })
    // expressions ease in and out (0.18 s)
    for (const k of Object.keys(this.expr)) this.expr[k] += (this.exprT[k] - this.expr[k]) * Math.min(1, dt / 0.18)
    P.smile = Math.max(P.smile, this.expr.smile); P.surprise = this.expr.surprise; P.sad = this.expr.sad; P.blush = this.expr.blush
    P.hop = 0
    // talking: the mouth follows syllables (fast attack, slower release); phrases bring small nods and brow lifts
    let open = 0, vowel = 0
    if (this.talk) {
      const T = this.talk; T.t += dt
      for (const s of T.list) {
        const u = T.t - s.t
        if (u < -0.02 || u > s.d + 0.06) continue
        const shape = smooth(-0.02, 0.05, u) * (1 - smooth(s.d * (s.close ? 0.55 : 0.75), s.d + 0.06, u))
        if (shape * s.open > open) { open = shape * s.open; vowel = s.vowel }
      }
      // emphasis: a nod and a brow lift at the start of each phrase (a syllable after a pause)
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
    P.mouthOpen = this.mouth; P.vowel = this.vowel
    // one-shot actions add on top
    for (const a of this.actions) {
      a.t += dt
      const o = actionCurve(a.id, Math.min(a.t, ADUR[a.id]))
      for (const [k, v] of Object.entries(o)) if (k in P) P[k] = k === 'smile' || k === 'blush' || k === 'surprise' ? Math.max(P[k], v) : P[k] + v
    }
    this.actions = this.actions.filter((a) => a.t < ADUR[a.id])
    for (const [k, [a, b]] of Object.entries(RANGES)) P[k] = clamp(P[k], a, b)
    // the torso follows the head's turn and tilt a quarter second behind
    const kb = this.mode === 'lively' ? Math.min(1, dt * 5) : 1
    const [ty, tr] = this.bodyTarget()
    this.body.yaw += (ty - this.body.yaw) * kb
    this.body.roll += (tr - this.body.roll) * kb
    this.D.pose(P, this.body)
    const ps = this.mode === 'lively' ? this.settings.physics : 0
    if (ps > 0) for (const l of this.locks) l.step(this.D, dt, t, ps)
    else for (const l of this.locks) { l.a.x = l.a.y = l.b.x = l.b.y = 0 }
  }
  /** where the torso heads: its own sway plus a share of the head's turn and tilt, inside the torso's joint limits
   *  (the torso turns at most 12 degrees and leans at most 5: past that a bust reads as falling over) */
  bodyTarget() {
    const P = this.P, R = this.ch.rig.body, L = this.ch.rig.limits || { yaw: 12, roll: 5 }
    return [clamp(P.bodyX + P.angleX * R.yaw, -L.yaw, L.yaw), clamp(P.bodyZ + P.angleZ * R.roll, -L.roll, L.roll)]
  }
  /** set params by hand and show them at once (pose sheets, tests) */
  snap(p = {}) {
    Object.assign(this.P, p)
    for (const [k, [a, b]] of Object.entries(RANGES)) this.P[k] = clamp(this.P[k], a, b)
    const [y, r] = this.bodyTarget(); this.body.yaw = y; this.body.roll = r
    this.D.pose(this.P, this.body)
  }
  /** real time in, fixed steps out */
  advance(dt) {
    this.acc += Math.min(dt, 0.1)
    const h = 1 / 120
    while (this.acc >= h) { this.step(h); this.acc -= h }
  }
}

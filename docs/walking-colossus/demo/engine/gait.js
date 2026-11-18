// Stateless walking gait: everything is a pure function of time t (seconds),
// so any frame can be rendered deterministically in any order.
// The numbers come from the project's colossus.js (GAIT, CFG); see engine/config.js for the defaults.
import { CFG, GAIT } from './config.js';
export { GAIT };
export const SPEED = GAIT.stride / (GAIT.duty * GAIT.T); // m/s (~2.9)
export const NSIDE = CFG.LEG_X.length;
export const NLEGS = NSIDE * 2;

const fract = (x) => x - Math.floor(x);
const TAU = Math.PI * 2;

// leg index i: 0..NSIDE-1 => +Z side (side=+1), NSIDE..2*NSIDE-1 => -Z side (side=-1)
export function legInfo(i) {
  const side = i < NSIDE ? 1 : -1;
  const k = i % NSIDE;
  const group = (k + (side > 0 ? 0 : 1)) % 2;          // alternating tetrapod
  const phase = fract(group * 0.5 + k * 0.035 + (side < 0 ? 0.02 : 0));
  return {
    i, side, k, group, phase,
    hip: [CFG.LEG_X[k], CFG.HIP_Y, side * CFG.HIP_Z],     // walker-local
    // foot home x (path frame): CFG.FOOT_X (feet splay away from the centre for a wide A-frame stance)
    homeX: CFG.FOOT_X[k],
    homeZ: side * CFG.FOOT_Z,
  };
}
export const LEGS = Array.from({ length: NLEGS }, (_, i) => legInfo(i));

// Foot (ankle joint) state for leg i at time t.
// Returns world-space ankle position + swing info.
//   swing: 0 while planted, (0..1] progress while in the air
//   plantAge: seconds since this foot last touched down
//   liftAge: seconds since lift-off (only meaningful while swinging)
//   pitch: foot pitch (rad) around Z-ish axis, toe-down positive, for swing animation
export function footState(i, t, out = {}) {
  const L = LEGS[i];
  const { T, duty, stride, lift } = GAIT;
  const u = fract(t / T + L.phase);
  let rx, y = 0, swing = 0, pitch = 0;
  if (u < duty) {
    rx = stride * (0.5 - u / duty);
  } else {
    const s = (u - duty) / (1 - duty);
    swing = s;
    // horizontal: slow start (peeling the foot off), fast middle, decelerate before slam
    const e = s * s * (3 - 2 * s);
    rx = stride * (-0.5 + e);
    // vertical: quick rise, hang, then a heavy drop
    const up = Math.min(1, s / 0.38), dn = Math.max(0, (s - 0.62) / 0.38);
    const rise = 1 - (1 - up) * (1 - up);
    const fall = dn * dn * dn;
    y = lift * (rise - fall) * (1 - 0.0);
    y = Math.max(0, y);
    pitch = Math.sin(Math.PI * Math.min(1, s * 1.5)) * 0.22 - dn * 0.10;
  }
  out.x = SPEED * t + L.homeX + rx;
  out.y = CFG.ANKLE_H + y;
  out.z = L.homeZ;
  out.swing = swing;
  out.pitch = pitch;
  out.plantAge = u * T;
  out.liftAge = swing > 0 ? (u - duty) * T : -1;
  out.plantX = SPEED * (t - u * T) + L.homeX + stride * 0.5; // where it last planted
  return out;
}

// Body (walker root) pose at time t, world space.
export function bodyPose(t, out = {}) {
  const { T } = GAIT;
  const ph2 = 2 * t / T;
  // two group touchdowns per cycle; body sinks a little just after each
  const { bob, shudder, surge, sway, roll } = GAIT;
  let y = CFG.RIDE_H - bob * Math.cos(TAU * (ph2 - 0.13));
  // damped shudder after each touchdown (the structure rings, then settles)
  const age = fract(ph2) * (T / 2);
  y += shudder * Math.exp(-age * 2.6) * Math.sin(age * 15.0);
  out.x = SPEED * t + surge * Math.sin(TAU * (ph2 - 0.3)); // slight surge
  out.y = y;
  out.z = sway * Math.sin(TAU * (t / T) + 0.4);
  out.roll = roll * Math.sin(TAU * (t / T) - 0.5) + roll * 0.3 * Math.exp(-age * 2.0) * Math.sin(age * 11.0);
  out.pitch = 0.006 * Math.sin(TAU * ph2 + 1.0);
  out.yaw = 0.004 * Math.sin(TAU * (t / T) + 2.0);
  return out;
}

// Recent footfalls: [{x, z, age, i}] world-space plant positions, age in seconds.
const _fs = {};
export function impacts(t) {
  const res = [];
  for (let i = 0; i < NLEGS; i++) {
    footState(i, t, _fs);
    res.push({ i, x: _fs.plantX, z: _fs.z, age: _fs.plantAge });
  }
  return res;
}

// Camera shake offset (meters) from footfalls near the camera.
export function shake(t, cx, cz, out = [0, 0, 0]) {
  let sx = 0, sy = 0;
  for (let i = 0; i < NLEGS; i++) {
    footState(i, t, _fs);
    const a = _fs.plantAge;
    if (a > 2.5) continue;
    const d = Math.hypot(_fs.plantX - cx, _fs.z - cz);
    const amp = GAIT.shake / (1 + d / 14) * Math.exp(-a * 2.8);
    sy += amp * Math.sin(a * 34 + i);
    sx += amp * 0.5 * Math.sin(a * 27 + i * 2.1);
  }
  out[0] = sx; out[1] = sy; out[2] = sx * 0.6;
  return out;
}

// Analytic two-bone IK. hip, foot: [x,y,z]; pole: direction the knee should bend toward.
// Returns knee position [x,y,z]. Clamps reach.
export function solveKnee(hip, foot, pole, l1, l2, out = [0, 0, 0]) {
  let dx = foot[0] - hip[0], dy = foot[1] - hip[1], dz = foot[2] - hip[2];
  let d = Math.hypot(dx, dy, dz);
  const maxR = (l1 + l2) * 0.999, minR = Math.abs(l1 - l2) * 1.001 + 1e-3;
  const dc = Math.min(maxR, Math.max(minR, d));
  dx /= d; dy /= d; dz /= d;
  // distance along hip->foot axis to the knee projection
  const a = (l1 * l1 - l2 * l2 + dc * dc) / (2 * dc);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  // pole component perpendicular to the axis
  const pd = pole[0] * dx + pole[1] * dy + pole[2] * dz;
  let px = pole[0] - pd * dx, py = pole[1] - pd * dy, pz = pole[2] - pd * dz;
  const pl = Math.hypot(px, py, pz) || 1;
  px /= pl; py /= pl; pz /= pl;
  out[0] = hip[0] + dx * a + px * h;
  out[1] = hip[1] + dy * a + py * h;
  out[2] = hip[2] + dz * a + pz * h;
  return out;
}

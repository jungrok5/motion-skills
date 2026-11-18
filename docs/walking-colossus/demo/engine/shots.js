// Camera shots. Positions are in the PATH FRAME: the origin travels with the walker at constant speed
// (x = SPEED * t), y = ground, so [0, RIDE_H, 0] is the base centre of the structure. A shot with `world: true`
// gives world coordinates instead (use it for anything that must stay put on the ground: a puddle, a foot).
// cam(tl, t) -> { pos:[x,y,z], tgt:[x,y,z], fov, roll?, dof?:{focus,aperture,maxBlur}, shake?:mult, post?:{fade,...} }
//   tl = local time inside the shot (s), t = global time.
// The shots and the film timeline live in the project's colossus.js (`shots(h)`, `TIMELINE`, `DURATION`).
import { SPEED } from './gait.js';
import { CFG, TIMELINE, DURATION, shotsFactory } from './config.js';

const lerp = (a, b, k) => a + (b - a) * k;
const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const ease = (k) => { k = Math.min(1, Math.max(0, k)); return k * k * (3 - 2 * k); };
const P = (t) => SPEED * t;               // walker x at time t (path origin)

// built-in inspection views, framed from the structure's box; the project can override any of them
const L2 = CFG.BODY_LEN / 2, H = CFG.BODY_H, R = CFG.RIDE_H, FZ = CFG.FOOT_Z;
const BASE = {
  hero: { cam: () => ({ pos: [-L2 * 1.8, 2.0, L2 * 1.3], tgt: [-2, R + H * 0.2, 0], fov: 44 }) },
  side: { cam: () => ({ pos: [0, 5.0, L2 * 4.6], tgt: [0, R + H * 0.2, 0], fov: 27 }) },
  far: { cam: () => ({ pos: [L2 * 2.1, 2.6, L2 * 2.0], tgt: [-4, R + H * 0.25, 0], fov: 36 }) },
  worm: { cam: () => ({ pos: [-L2 * 1.05, 0.55, FZ + 3.5], tgt: [-L2 * 0.4, R - 1.5, 6], fov: 58, dof: { focus: 14, aperture: 2.2 } }) },
  belly: { cam: () => ({ pos: [-L2 * 0.2, 3, 4], tgt: [6, R, 0], fov: 60 }) },
  facade: { cam: () => ({ pos: [-8, R + H * 0.5, L2 * 0.8], tgt: [-8, R + H * 0.55, 0], fov: 40 }) },
  roof: { cam: () => ({ pos: [-L2 * 1.4, R + H * 1.8, L2 * 0.9], tgt: [0, R + H, 0], fov: 40 }) },
  leg: { cam: () => ({ pos: [CFG.LEG_X[0] * 0.1 - 2, 9, FZ * 2], tgt: [CFG.LEG_X[Math.min(2, CFG.LEG_X.length - 1)], 13, FZ * 0.6], fov: 38 }) },
  foot: { cam: () => ({ pos: [CFG.FOOT_X[Math.min(2, CFG.FOOT_X.length - 1)] + 6, 2.2, FZ + 8], tgt: [CFG.FOOT_X[Math.min(2, CFG.FOOT_X.length - 1)] - 2, 3.5, FZ - 5], fov: 42 }) },
  back: { cam: () => ({ pos: [L2 * 1.4, 4, -L2 * 1.6], tgt: [0, R + H * 0.15, 0], fov: 44 }) },
};
export const SHOTS = { ...BASE, ...shotsFactory({ P, lerp, mix3, ease, SPEED, CFG }) };
export { TIMELINE, DURATION };

export function evalShot(name, t) {
  let s = SHOTS[name], tl = t;
  if (s) { const seg = TIMELINE.find((g) => g.shot === name); if (seg) tl = t - seg.start; }
  if (!s) {
    // timeline lookup
    for (const seg of TIMELINE) if (t >= seg.start && t < seg.end) { s = SHOTS[seg.shot]; tl = t - seg.start; name = seg.shot; break; }
    if (!s && TIMELINE.length && t >= DURATION) { const seg = TIMELINE[TIMELINE.length - 1]; s = SHOTS[seg.shot]; tl = t - seg.start; name = seg.shot; }
    if (!s) { s = SHOTS.hero; name = 'hero'; }
  }
  const c = s.cam(tl, t);
  const px = SPEED * (s.fixed ? (s.fixedT ?? 0) : t);
  return {
    name,
    pos: [c.pos[0] + (c.world ? 0 : px), c.pos[1], c.pos[2]],
    tgt: [c.tgt[0] + (c.world ? 0 : px), c.tgt[1], c.tgt[2]],
    fov: c.fov ?? 45, roll: c.roll ?? 0, dof: c.dof ?? null, shake: c.shake ?? 1, handheld: c.handheld ?? (TIMELINE.some((g) => g.shot === name) ? 1 : 0),
    post: { ...(s.post || {}), ...(c.post || {}) },
    near: c.near ?? 0.3,
  };
}
export { lerp, mix3, ease, P };

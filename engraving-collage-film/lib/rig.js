// engraving-collage-film · rig.js — the cel-painted characters: the only colour in an engraved world. A character is
// a 2-D rig (hip → torso → head; thighs → shins → feet; arms → forearms + hands) drawn in flat cel paint — one base
// colour and one shade per material, a crisp shade edge away from the light, a thin warm-dark outline — and posed by
// KEY POSES: every motion here is a table of poses at times, interpolated (Catmull-Rom, eased), never limbs tweened
// one by one. Walks and runs advance their cycle by the distance travelled, so planted feet stay planted whatever the
// speed curve. Idles breathe and blink; big moves (jump, wave, point) carry their anticipation and recovery inside
// their key tables; hair and hems follow the body late (sway from the root's past velocity).
//
//   const ADA = character({ name: 'Ada', height: 1.32, heads: 5, colors: {…}, head(ctx, v) {…}, torso(ctx, v) {…} })
//   drawCharacter(ctx, ADA, { x, ground, facing: 1, view: 'threeq', angles: walkPose(0.3), blink: 0, expr: 'smile', sway: 4 })
//
// Rig px, facing right (+x), y down, origin at the hip. Angles in degrees, + = clockwise on screen (for facing right):
// thigh − = forward, shin + = knee folds back, arm − = forward / up, forearm − = elbow folds forward.
// Views: 'side' (profile), 'threeq' (three-quarter), 'front', 'back'. Walk, run and jump are side / threeq only.
import { clamp, lerp, ease, hash01, sid } from './core.js';

const RAD = Math.PI / 180;
const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
const T = (x, y) => [1, 0, 0, 1, x, y], R = a => { const c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, 0, 0]; }, Sc = (x, y) => [x, 0, 0, y, 0, 0];
const app = (M, [x, y]) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];

/** joint ranges (deg, facing right). check.mjs fails a pose outside them. */
export const LIM = {
  torso: [-25, 30], head: [-35, 30],
  thighN: [-115, 60], thighF: [-115, 60], shinN: [0, 150], shinF: [0, 150], footN: [-35, 45], footF: [-35, 45],
  armN: [-190, 70], armF: [-190, 70], foreN: [-150, 0], foreF: [-150, 0],
};
export const audit = [];   // "body: …" messages from every draw; the film exposes them, check.mjs fails on any

export const LIGHT = [-0.78, -0.62];   // the light comes from the upper left of the screen, always (it does not flip with the character)

/**
 * cel(ctx, path, base, shade, o) — fill a shape in cel paint under the current transform: the shade colour, then the base
 * colour shifted toward the light (clipped to the shape), so the shade edge sits on the side away from the light whatever
 * the part's rotation or mirroring; then the outline. o = { k: shade width px (screen), lw: outline px, line, noLine }
 */
export function cel(ctx, path, base, shade, o = {}) {
  const m = ctx.getTransform(), det = m.a * m.d - m.b * m.c, sc = Math.sqrt(Math.abs(det)) || 1;
  // screen → local direction: inverse of the linear part
  const ia = m.d / det, ib = -m.b / det, ic = -m.c / det, id = m.a / det;
  const k = (o.k ?? 5) / sc, lx = (ia * LIGHT[0] + ic * LIGHT[1]) * sc, ly = (ib * LIGHT[0] + id * LIGHT[1]) * sc, ll = Math.hypot(lx, ly) || 1;
  ctx.fillStyle = shade || base; ctx.fill(path);
  if (shade) { ctx.save(); ctx.clip(path); ctx.translate((lx / ll) * k, (ly / ll) * k); ctx.fillStyle = base; ctx.fill(path); ctx.restore(); }
  if (!o.noLine) { ctx.lineWidth = (o.lw ?? 2.2) / sc; ctx.strokeStyle = o.line || ctx.__line || '#2a201e'; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(path); }
}
/** a tapered capsule from (0,0) down to (0,len): half-widths w0 at the top, w1 at the bottom */
export function capsule(len, w0, w1) {
  const p = new Path2D(); p.moveTo(-w0, 0); p.arc(0, 0, w0, Math.PI, 0); p.lineTo(w1, len); p.arc(0, len, w1, 0, Math.PI); p.closePath(); return p;
}
export const ell = (cx, cy, rx, ry, rot = 0) => { const p = new Path2D(); p.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); return p; };
export const poly = (pts, close = true) => { const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); if (close) p.closePath(); return p; };
export const line = (ctx, pts, lw = 2, col) => { const m = ctx.getTransform(), sc = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; ctx.lineWidth = lw / sc; ctx.strokeStyle = col || ctx.__line || '#2a201e'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(poly(pts, false)); };
/** an anime-ish eye: white, iris, pupil, a highlight; squash with blink (0 open … 1 shut); w < 1 narrows it (the far eye in 3/4) */
export function eye(ctx, x, y, s, o = {}) {
  const b = clamp(o.blink ?? 0), w = o.w ?? 1, lc = ctx.__line || '#2a201e';
  if (b > 0.75) { line(ctx, [[x - s * 0.55 * w, y], [x, y + s * 0.18], [x + s * 0.55 * w, y]], 2); return; }
  const h = s * (1 - b * 0.9);
  ctx.fillStyle = '#fbf7f1'; ctx.fill(ell(x, y, s * 0.5 * w, h * 0.62));
  ctx.fillStyle = o.iris || '#4a3426'; ctx.fill(ell(x + (o.look ?? 0) * s * 0.18 * w, y + h * 0.05, s * 0.34 * w, h * 0.52));
  ctx.fillStyle = '#1c1412'; ctx.fill(ell(x + (o.look ?? 0) * s * 0.2 * w, y + h * 0.08, s * 0.17 * w, h * 0.3));
  ctx.fillStyle = '#ffffff'; ctx.fill(ell(x + (o.look ?? 0) * s * 0.18 * w - s * 0.1 * w, y - h * 0.16, s * 0.08, h * 0.11));
  line(ctx, [[x - s * 0.55 * w, y - h * 0.42], [x - s * 0.1 * w, y - h * 0.66], [x + s * 0.45 * w, y - h * 0.5]], 2.4, lc);
}

/**
 * character(spec) — build a rig. spec = {
 *   name, height: metres (top of head to sole), heads: 5 (head units in the height; children 4.5–5.5, adults 6.5–7.5),
 *   px: 640 (rig height in px; the card texture resolution follows), mass: 'light' | 'medium' | 'heavy' (sets timing),
 *   colors: { skin, skinShade, top, topShade, sleeve?, sleeveShade?, hand? (gloves, mittens), leg, legShade, shoe, shoeShade, line },
 *   head(ctx, v), torso(ctx, v)  — the designed parts (see below), over?(ctx, v) — drawn over the near leg (a skirt hem, a coat tail)
 *   sleeves: 'long' | 'short', legs: 'trousers' | 'bare' | 'stockings' }
 * Painters get v = { u (head unit px), view, turn (0 front … 0.5 three-quarter … 1 side), back, facing, expr, blink,
 *   look (-1…1 eye direction), sway (deg, hair / hem follow-through), breath (0…1), mouth (0…1 open), torsoLen, shoulderW, hipW }
 * The head painter draws around its pin at the neck (0, 0), upward; the torso painter from the hip (0, 0) up to the neck
 * (0, −torsoLen). Draw the face side toward +x (the character faces right; the rig mirrors for facing −1).
 */
export function character(spec) {
  const px = spec.px ?? 640, heads = spec.heads ?? 5, u = px / heads;
  const L = { torso: 1.55 * u, thigh: 1.16 * u, shin: 1.06 * u, footH: 0.16 * u, foot: 0.62 * u, arm: 0.92 * u, fore: 0.72 * u, hand: 0.26 * u,
    hipW: 0.52 * u, shoulderW: 0.78 * u, limbW: 0.17 * u, ...(spec.lengths || {}) };
  const C = { skin: '#f3d3b6', skinShade: '#dcae90', top: '#5b7fa6', leg: '#4b4a5c', shoe: '#4a3428', line: '#2a201e', ...spec.colors };
  for (const k of ['top', 'leg', 'shoe', 'skin']) C[k + 'Shade'] ??= shadeOf(C[k], 0.17);
  C.sleeve ??= C.top; C.sleeveShade ??= C.topShade; C.hand ??= C.skin; C.handShade ??= C.hand === C.skin ? C.skinShade : shadeOf(C.hand, 0.17);   // hand: mittens / gloves
  const mass = { light: 0.85, medium: 1, heavy: 1.3 }[spec.mass || 'light'];
  return { ...spec, px, heads, u, L, C, mass, id: sid(spec.name) };
}
export function shadeOf(hex, k = 0.17) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => Math.round(v * (1 - k));
  // a slightly cooler, darker shade (cel shadows lean toward violet)
  return '#' + [f(r) - 6, f(g) - 4, f(b) + 6].map(v => clamp(v, 0, 255).toString(16).padStart(2, '0')).join('');
}

const VIEW_TURN = { front: 0, threeq: 0.5, side: 1, back: 0 };
/** world matrices of every joint for a pose (no drawing) */
export function solve(ch, pose = {}) {
  const A = pose.angles || {}, f = pose.facing ?? 1, s = pose.scale ?? 1, L = ch.L, view = pose.view || 'side', turn = VIEW_TURN[view];
  const breath = pose.breath ?? 0, M = {};
  // pins: how far the near / far hip and shoulder sit from the centre line, by view (3/4: the near side is the BACK side)
  const hp = view === 'front' || view === 'back' ? L.hipW * 0.5 : view === 'threeq' ? L.hipW * 0.32 : L.hipW * 0.06;
  const sp = view === 'front' || view === 'back' ? L.shoulderW * 0.5 : view === 'threeq' ? L.shoulderW * 0.3 : L.shoulderW * 0.05;
  const nSide = view === 'front' ? -1 : view === 'back' ? 1 : -1;   // front: the near (screen-left when facing right) limbs are the character's right
  const base = mul(mul(T(pose.x ?? 0, pose.y ?? 0), Sc(f * s, s)), R((pose.rot || 0) * RAD));
  M.hip = mul(base, T(0, -(pose.lift ?? 0)));
  M.torso = mul(M.hip, R((A.torso || 0) * RAD));
  const neck = [0, -L.torso * (1 + breath * 0.012)];
  M.head = mul(mul(M.torso, T(neck[0], neck[1])), R((A.head || 0) * RAD));
  const leg = (side, pin) => {
    M['thigh' + side] = mul(mul(M.hip, T(pin, 0)), R((A['thigh' + side] || 0) * RAD));
    M['shin' + side] = mul(mul(M['thigh' + side], T(0, L.thigh)), R((A['shin' + side] || 0) * RAD));
    M['foot' + side] = mul(mul(M['shin' + side], T(0, L.shin)), R((A['foot' + side] || 0) * RAD));
  };
  leg('N', nSide * hp); leg('F', -nSide * hp);
  const arm = (side, pin) => {
    M['arm' + side] = mul(mul(M.torso, T(pin, neck[1] + 0.22 * ch.u)), R((A['arm' + side] || 0) * RAD));
    M['fore' + side] = mul(mul(M['arm' + side], T(0, L.arm)), R((A['fore' + side] || 0) * RAD));
  };
  arm('N', nSide * sp); arm('F', -nSide * sp);
  // plant: the lowest sole point (heel / toe of either foot) sits on the ground line, unless airborne
  if (pose.ground != null) {
    let low = -1e9; for (const k of ['footN', 'footF']) for (const q of soleLocal(ch, view)) low = Math.max(low, app(M[k], q)[1]);
    const dy = pose.ground - low - (pose.air ?? 0); for (const k in M) M[k][5] += dy;
  }
  M._turn = turn; M._view = view;
  return M;
}
const soleLocal = (ch, view) => { const L = ch.L; return view === 'front' || view === 'back' ? [[-L.limbW, L.footH], [L.limbW, L.footH]] : [[-L.limbW * 0.9, L.footH], [L.foot * 0.92, L.footH]]; };
/** the screen points of both feet's sole ends (for "feet on the ground" and "planted foot" checks) */
export function soles(ch, pose) {
  const M = solve(ch, pose), out = {};
  for (const k of ['footN', 'footF']) out[k] = soleLocal(ch, pose.view || 'side').map(q => app(M[k], q));
  return out;
}
export function where(ch, pose, joint, pt = [0, 0]) { return app(solve(ch, pose)[joint], pt); }

export function auditPose(ch, pose) {
  const A = pose.angles || {};
  for (const [k, [lo, hi]] of Object.entries(LIM)) { const a = A[k] ?? 0; if (a < lo - 0.5 || a > hi + 0.5) audit.push(`body: ${ch.name} ${k} out of range (${a.toFixed(0)}°, allowed ${lo}…${hi})`); }
  // the knee / elbow fold directions are part of LIM (shin ≥ 0, fore ≤ 0); a front / back view may not stride
  if ((pose.view === 'front' || pose.view === 'back') && (Math.abs((A.thighN || 0) - (A.thighF || 0)) > 30)) audit.push(`body: ${ch.name} strides in a ${pose.view} view (walk / run are side or threeq)`);
}

/** draw a character. pose = { x, ground, facing, view, angles, lift, air, breath, blink, expr, look, sway, mouth, scale } */
export function drawCharacter(ctx, ch, pose = {}) {
  auditPose(ch, pose);
  const M = solve(ch, pose), L = ch.L, C = ch.C, view = pose.view || 'side', back = view === 'back', f = pose.facing ?? 1;
  const v = { u: ch.u, view, turn: VIEW_TURN[view], back, facing: f, expr: pose.expr || 'neutral', blink: pose.blink ?? 0, look: pose.look ?? 0,
    sway: pose.sway ?? 0, breath: pose.breath ?? 0, mouth: pose.mouth ?? 0, torsoLen: L.torso, shoulderW: L.shoulderW, hipW: L.hipW, C, L, cel, ell, poly, line, eye, capsule };
  ctx.save(); ctx.__line = C.line;
  const at = (k, fn) => { ctx.save(); ctx.setTransform(...mulCtx(ctx.__base || ctx.getTransform(), M[k])); fn(); ctx.restore(); };
  ctx.__base = ctx.getTransform();
  const w = L.limbW, legC = (near) => [near ? C.leg : shadeOf(C.leg, 0.08), near ? C.legShade : shadeOf(C.legShade, 0.08)];
  const armC = (near) => [near ? C.sleeve : shadeOf(C.sleeve, 0.08), near ? C.sleeveShade : shadeOf(C.sleeveShade, 0.08)];
  const legDraw = (s, near) => {
    const [b, sh] = legC(near), bare = ch.legs === 'bare';
    at('thigh' + s, () => cel(ctx, capsule(L.thigh, w * 1.25, w * 1.0), b, sh));
    at('shin' + s, () => cel(ctx, capsule(L.shin, w * 1.0, w * 0.8), bare ? C.skin : b, bare ? C.skinShade : sh));
    at('foot' + s, () => {
      const fl = view === 'front' || view === 'back' ? [[-w * 1.05, -w * 0.3], [w * 1.05, -w * 0.3], [w * 1.15, L.footH], [-w * 1.15, L.footH]]
        : [[-w * 0.95, -w * 0.5], [w * 0.7, -w * 0.4], [L.foot * 0.9, L.footH * 0.1], [L.foot, L.footH * 0.75], [L.foot * 0.92, L.footH], [-w * 0.95, L.footH]];
      cel(ctx, poly(fl), near ? C.shoe : shadeOf(C.shoe, 0.1), C.shoeShade);
    });
  };
  const armDraw = (s, near) => {
    const [b, sh] = armC(near);
    at('arm' + s, () => cel(ctx, capsule(L.arm, w * 1.05, w * 0.9), b, sh));
    at('fore' + s, () => {
      const short = ch.sleeves === 'short';
      cel(ctx, capsule(L.fore - L.hand * 0.5, w * 0.9, w * 0.78), short ? C.skin : b, short ? C.skinShade : sh);
      const hp = new Path2D(); hp.ellipse(w * 0.15, L.fore + L.hand * 0.15, w * 0.95, L.hand * 0.62, 0, 0, Math.PI * 2);
      cel(ctx, hp, near ? C.hand : shadeOf(C.hand, 0.06), C.handShade, { k: 3 });
      if (!short) cel(ctx, ell(0, L.fore - L.hand * 0.55, w * 1.0, w * 0.42), b, sh, { k: 2 });   // the cuff
    });
  };
  // draw order (facing right): far arm, far leg, near leg, torso, (over), head, near arm. Back view: arms drawn under the torso edge.
  if (!back) armDraw('F', false);
  legDraw('F', false); legDraw('N', true);
  if (back) { armDraw('F', false); armDraw('N', true); }
  at('torso', () => ch.torso(ctx, v));
  if (ch.over) at('torso', () => ch.over(ctx, v));
  at('head', () => ch.head(ctx, v));
  if (!back) armDraw('N', true);
  if (pose.hold) at(pose.hold.on || 'foreN', () => pose.hold.draw(ctx, v));
  ctx.restore();
  return M;
}
const mulCtx = (m, B) => { const A = [m.a, m.b, m.c, m.d, m.e, m.f]; return mul(A, B); };

// ── key poses ─────────────────────────────────────────────────────────────────────────────────────────────
// A pose is an angle map. Tables of key poses are interpolated (periodic for cycles, eased for actions).
const IDS = ['torso', 'head', 'thighN', 'shinN', 'footN', 'thighF', 'shinF', 'footF', 'armN', 'foreN', 'armF', 'foreF'];
export const STAND = { torso: 0, head: 0, thighN: -2, shinN: 3, footN: -1, thighF: 3, shinF: 3, footF: -6, armN: 6, foreN: -12, armF: -4, foreF: -14 };
export const FRONT_STAND = { torso: 0, head: 0, thighN: 3, shinN: 2, footN: 0, thighF: -3, shinF: 2, footF: 0, armN: 8, foreN: -8, armF: -8, foreF: -8 };
export function blend(a, b, k) { const o = { ...a }; for (const id of IDS) o[id] = (a[id] ?? 0) + ((b[id] ?? 0) - (a[id] ?? 0)) * k; for (const x of ['lift', 'air']) if (a[x] != null || b[x] != null) o[x] = lerp(a[x] ?? 0, b[x] ?? 0, k); return o; }
const cr = (p0, p1, p2, p3, s) => 0.5 * (2 * p1 + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s * s + (-p0 + 3 * p1 - 3 * p2 + p3) * s * s * s);
/** a periodic key table [[phase, {arm: [arm, fore], torso, head}] …] → the upper body at phase p (the far arm runs half a cycle later) */
function upper(keys, p) {
  const n = keys.length, ph = ((p % 1) + 1) % 1;
  const get = (q, fn) => {
    q = ((q % 1) + 1) % 1; let i = 0; while (i < n - 1 && q >= keys[i + 1][0]) i++;
    const t0 = keys[i][0], t1 = i === n - 1 ? 1 + keys[0][0] : keys[i + 1][0], s = (q - t0) / (t1 - t0), k = j => fn(keys[((i + j) % n + n) % n][1]);
    return cr(k(-1), k(0), k(1), k(2), s);
  };
  const o = {};
  for (const [side, off] of [['N', 0], ['F', 0.5]]) { o['arm' + side] = get(ph + off, k => k.arm[0]); o['fore' + side] = Math.min(0, get(ph + off, k => k.arm[1])); }
  o.torso = get(ph, k => k.torso ?? 0); o.head = get(ph, k => k.head ?? 0);
  return o;
}
/**
 * GAITS — a walk or a run is keyed as: the upper body's key poses (arms swing against the legs, torso lean, head bob) and
 * the FOOT PATH's keys (stride, share of the cycle on the ground, heel-strike toe-up, toe-off heel-rise, swing lift, hip
 * bob). The legs are then solved by two-bone IK onto that path: on the ground the foot pivots on its heel, lies flat, then
 * pivots on its toe, and its pivot moves back exactly as fast as the hip moves forward — so a planted foot never slides.
 * stride / lift / bob are in leg lengths (thigh + shin); phase 0 = the near heel strikes.
 */
export const GAITS = {
  walk: { stride: 1.0, stance: 0.6, lift: 0.09, bob: 0.014, height: 0.995, toeUp: -14, heelRise: 24, upper: [
    [0.00, { arm: [20, -12], torso: 3, head: -1 }], [0.25, { arm: [2, -14], torso: 3.5, head: 1 }],
    [0.50, { arm: [-18, -26], torso: 3, head: -1 }], [0.75, { arm: [0, -16], torso: 3.5, head: 1 }]] },
  run: { stride: 2.1, stance: 0.36, lift: 0.32, bob: 0.04, height: 0.95, toeUp: -8, heelRise: 34, upper: [
    [0.00, { arm: [38, -74], torso: 10, head: -4 }], [0.25, { arm: [4, -82], torso: 11, head: -3 }],
    [0.50, { arm: [-36, -92], torso: 10, head: -4 }], [0.75, { arm: [2, -80], torso: 11, head: -3 }]] },
};
const footPts = ch => { const L = ch.L, w = L.limbW; return { heel: [-w * 0.9, L.footH], toe: [L.foot * 0.92, L.footH] }; };
const rot = (a, [x, y]) => { const c = Math.cos(a * RAD), s = Math.sin(a * RAD); return [c * x - s * y, s * x + c * y]; };
/** two-bone IK: hip at (0,0), ankle target (dx, dy) → [thigh, shin] (knee forward, i.e. it folds back) */
export function legIK(ch, dx, dy) {
  const t = ch.L.thigh, s = ch.L.shin, d = Math.min(Math.hypot(dx, dy), (t + s) * 0.9995);
  const phi = Math.atan2(-dx, dy), al = Math.acos(clamp((t * t + d * d - s * s) / (2 * t * d), -1, 1)), ga = Math.acos(clamp((t * t + s * s - d * d) / (2 * t * s), -1, 1));
  return [(phi - al) / RAD, (Math.PI - ga) / RAD];
}
/** the pose of a gait at phase p (one full cycle = two steps), legs solved onto the keyed foot path */
export function gaitPose(ch, gait, p) {
  const G = GAITS[gait], L = ch.L, leg = L.thigh + L.shin, S = G.stride * leg, A = S * G.stance / 2, { heel, toe } = footPts(ch);
  const q1 = G.stance * 0.16, q2 = G.stance * 0.72, span = toe[0] - heel[0];
  // the ankle (relative to the hip, ground at y = hipH) and the foot's world angle for one leg at its own phase q
  const anklePlanted = (q, hipH) => {
    const hx = A - S * q;                                                       // where the heel would be if the foot were flat
    if (q < q1) { const a = G.toeUp * (1 - q / q1), pv = [hx, hipH], r = rot(a, heel); return [[pv[0] - r[0], pv[1] - r[1]], a]; }
    if (q > q2) { const a = G.heelRise * ((q - q2) / (G.stance - q2)), pv = [hx + span, hipH], r = rot(a, toe); return [[pv[0] - r[0], pv[1] - r[1]], a]; }
    return [[hx - heel[0], hipH - heel[1]], 0];
  };
  const footAt = (q, hipH) => {
    if (q < G.stance) return anklePlanted(q, hipH);
    const sw = (q - G.stance) / (1 - G.stance), e = ease.sine(sw), [a0, f0] = anklePlanted(G.stance, hipH), [a1, f1] = anklePlanted(0, hipH);
    return [[lerp(a0[0], a1[0], e), lerp(a0[1], a1[1], e) - G.lift * leg * Math.sin(Math.PI * sw) ** 0.8], lerp(f0, f1, ease.inOut(sw)) + 12 * Math.sin(Math.PI * sw)];
  };
  const qN = ((p % 1) + 1) % 1, qF = (qN + 0.5) % 1;
  // hip height: lowest at the double support / mid-stance, highest when the legs pass; never over-reaching
  const bobPh = gait === 'run' ? Math.cos(((qN % 0.5) / 0.5 - 0.18) * 2 * Math.PI) : -Math.cos(4 * Math.PI * qN);
  let hipH = leg * G.height + L.footH * 0.5 + G.bob * leg * bobPh;
  for (let it = 0; it < 12; it++) {
    let over = 0;
    for (const q of [qN, qF]) if (q < G.stance) { const [an] = footAt(q, hipH); over = Math.max(over, Math.hypot(an[0], an[1]) - (L.thigh + L.shin) * 0.995); }
    if (over <= 0) break; hipH -= over + 0.5;
  }
  const o = upper(G.upper, qN);
  const relAt = (q) => { const [an, fa] = footAt(q, hipH), [th, sh] = legIK(ch, an[0], an[1]); return [th, sh, fa - th - sh]; };
  const rel0 = relAt(G.stance)[2], rel1 = relAt(0)[2];
  for (const [side, q] of [['N', qN], ['F', qF]]) {
    let [th, sh, rel] = relAt(q);
    // in the swing the ankle relaxes: blend the foot's angle to the shin from toe-off to the next heel strike
    if (q >= G.stance) { const sw = (q - G.stance) / (1 - G.stance); rel = lerp(rel0, rel1, ease.inOut(sw)) + 6 * Math.sin(Math.PI * sw); }
    o['thigh' + side] = th; o['shin' + side] = sh; o['foot' + side] = clamp(rel, LIM.footN[0], LIM.footN[1]);
  }
  // airborne (run flight): how far the lowest sole is above the ground line
  let low = -1e9;
  for (const side of ['N', 'F']) {
    const q = side === 'N' ? qN : qF, [an] = footAt(q, hipH), fa = o['thigh' + side] + o['shin' + side] + o['foot' + side];
    for (const pt of [heel, toe]) { const r = rot(fa, pt); low = Math.max(low, an[1] + r[1]); }
  }
  o.air = Math.max(0, hipH - low);
  o.stanceN = qN < G.stance; o.stanceF = qF < G.stance;   // which feet are planted (the audits only hold those still)
  return o;
}
export const walkPose = (p, ch) => gaitPose(ch || DEFAULT_CH, 'walk', p);
export const runPose = (p, ch) => gaitPose(ch || DEFAULT_CH, 'run', p);
/** hip travel per full cycle (two steps) — exact by construction */
export const strideOf = (ch, gait = 'walk') => GAITS[gait].stride * (ch.L.thigh + ch.L.shin);

const DEFAULT_CH = character({ name: 'default', head() { }, torso() { } });

// idle: breathing, a slow weight shift, the head settling late; blinks at irregular moments
export function idlePose(ch, t, o = {}) {
  const m = ch.mass, br = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / (3.1 * m) + ch.id % 7);
  const shift = Math.sin(t * Math.PI * 2 / (5.3 * m) + 1.3), base = o.view === 'front' || o.view === 'back' ? FRONT_STAND : STAND;
  return { ...base, torso: base.torso + (br - 0.5) * 1.6 + shift * 0.8, head: base.head + Math.sin(t * Math.PI * 2 / (3.1 * m) - 0.9 + ch.id % 7) * 1.4 + shift * -0.6,
    armN: base.armN + (br - 0.5) * 2.4, armF: base.armF + (br - 0.5) * -2, thighN: base.thighN + shift * 1.8, thighF: base.thighF - shift * 1.8, breath: br };
}
export function blinkAt(ch, t) {
  const slot = Math.floor(t / 0.41), local = t - slot * 0.41;
  return hash01(slot, ch.id) < 0.13 && local < 0.14 ? Math.sin(local / 0.14 * Math.PI) : 0;
}

/**
 * ACTIONS — big moves as key tables over their own time (seconds, scaled by the character's mass). Each carries its
 * anticipation (the wind-up the opposite way) and its recovery (overshoot, settle). `antic` names the window check.mjs reads.
 * keys: [time, pose-delta over the stand, ease into this key]. Poses are deltas added to the current base pose.
 */
export const ACTIONS = {
  wave: { dur: 1.7, antic: [0, 0.18], keys: [   // the FAR arm (face side in 3/4): the near arm raised would cover the face
    [0, {}], [0.18, { armF: 22, foreF: -6, torso: 2 }],                  // anticipation: the arm drops back
    [0.42, { armF: -168, foreF: -36, torso: 4, head: -4 }, 'back'],       // up, overshooting a hair
    [0.62, { armF: -160, foreF: -72, torso: 4, head: -4 }], [0.82, { armF: -162, foreF: -30, torso: 4, head: -4 }],
    [1.02, { armF: -160, foreF: -74, torso: 4, head: -4 }], [1.22, { armF: -162, foreF: -34, torso: 3, head: -3 }],
    [1.5, { armF: 10, foreF: -10, torso: -1 }, 'back'], [1.7, {}] ] },
  point: { dur: 1.5, antic: [0, 0.16], keys: [
    [0, {}], [0.16, { armN: 24, foreN: -40, torso: 3 }],
    [0.36, { armN: -92, foreN: -4, torso: -4, head: -3 }, 'back'], [1.15, { armN: -88, foreN: -6, torso: -3, head: -3 }],
    [1.38, { armN: 8, foreN: -16 }, 'back'], [1.5, {}] ] },
  lookUp: { dur: 1.6, antic: [0, 0.14], keys: [
    [0, {}], [0.14, { head: 6, torso: 2 }], [0.45, { head: -28, torso: -6, armN: 4, armF: -2 }, 'back'], [1.3, { head: -26, torso: -5 }], [1.6, {}] ] },
  jump: { dur: 1.35, antic: [0, 0.3], big: true, keys: [
    [0, {}],
    [0.3, { thighN: -48, shinN: 92, footN: 44, thighF: -44, shinF: 88, footF: 44, torso: 22, head: -10, armN: 48, foreN: -24, armF: 44, foreF: -24 }, 'out'],   // crouch: wind up
    [0.42, { thighN: 6, shinN: 2, footN: 34, thighF: 10, shinF: 6, footF: 34, torso: -4, head: -6, armN: -150, foreN: -20, armF: -140, foreF: -24, rise: 0.0 }, 'in'],
    [0.62, { thighN: -30, shinN: 50, footN: 20, thighF: -10, shinF: 70, footF: 24, torso: -2, head: -4, armN: -120, foreN: -40, armF: -110, foreF: -40, rise: 0.24 }, 'out'],
    [0.86, { thighN: -18, shinN: 30, footN: 6, thighF: -12, shinF: 34, footF: 8, torso: 4, head: 0, armN: -60, foreN: -30, armF: -50, foreF: -30, rise: 0.0 }, 'in'],
    [1.02, { thighN: -40, shinN: 80, footN: 40, thighF: -38, shinF: 78, footF: 40, torso: 18, head: 4, armN: 30, foreN: -30, armF: 26, foreF: -30 }, 'out'],   // land: absorb
    [1.35, {}, 'out'] ] },   // legs settle with ease-out: a knee cannot overshoot past straight
  turnStep: { dur: 0.5, antic: [0, 0.15], keys: [
    [0, {}], [0.15, { thighN: -10, shinN: 22, footN: 10, thighF: -8, shinF: 20, footF: 10, torso: 4 }],
    [0.28, { thighN: -22, shinN: 46, footN: 8, torso: 2 }], [0.5, {}, 'out'] ] },
};
/** the pose delta (and air) of an action at local time s (seconds), for a character of mass m */
export function actionDelta(name, s, m = 1) {
  const A = ACTIONS[name]; if (!A) throw new Error(`unknown action "${name}" (have: ${Object.keys(ACTIONS).join(', ')})`);
  const k = A.keys, t = s / m;
  if (t <= 0) return {}; if (t >= k[k.length - 1][0]) return {};
  let i = 0; while (i < k.length - 2 && t > k[i + 1][0]) i++;
  const a = k[i], b = k[i + 1], e = ease[b[2] || 'inOut'] || ease.inOut, w = e(clamp((t - a[0]) / (b[0] - a[0])));
  const o = {}; for (const id of [...IDS, 'rise']) { const va = a[1][id] ?? 0, vb = b[1][id] ?? 0; if (va || vb) o[id] = lerp(va, vb, w); }
  return o;
}
export const actionDur = (name, m = 1) => ACTIONS[name].dur * m;
export function addPose(base, d) { const o = { ...base }; for (const k in d) o[k] = (o[k] ?? 0) + d[k]; return o; }

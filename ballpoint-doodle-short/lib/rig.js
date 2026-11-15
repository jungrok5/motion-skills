// ballpoint-doodle-short · rig.js — round doodle creatures from data. One body (an egg of crayon with a ballpoint outline)
// and parts placed on it as if it were a ball, so a single number — yaw — turns the whole creature: 0 faces you, +90 faces
// screen right (its right side toward you), −90 faces left, 180 shows its back. Eyes, beak, cheeks, arms, feet, ears and tail
// all move round the ball together, so front / 3/4 / profile / back can never disagree. The joint ranges (LIM) are audited
// on every draw: a pose outside them adds "body: <name> …" to P.audit, which check.mjs reports.
//
//   R.critter(ctx, SPEC, { x, y, yaw: 90, walk: t * 2, stride: 1, armR: { a: .3, f: 1.2 }, eyes: 'open', brow: 'angry' })
//   R.where(SPEC, pose) → { head, top, hand: { R, L }, feet, w, h } in the same coordinates (aim catches and props with it)
//
// SPEC = { name, ink, body: { rx, ry, col, shade, egg }, belly: { col, w, h, y }, fur: n (tuft strands on top),
//          eyes: { size, gap (deg), y }, nose: { type: 'beak' | 'snout' | 'button' | 'none', col, size }, cheeks: col,
//          ears: { type: 'point' | 'round' | 'long' | 'none', col, inner, size }, arms: { type: 'wing' | 'paw', col, len },
//          (arms.rest = { a, f }: the pose of an arm the pose leaves out; arms.pad = the colour of a paw's pad)
//          feet: { col, w, h }, tail: { type: 'feather' | 'curl' | 'puff' | 'none', col, size }, wear(ctx, info) }
// POSE = { x, y (ground under the feet), s (scale), yaw, lift (px off the ground), squash (+ flat, − tall), tilt (lean, rad,
//          about the feet), roll (a whole-body spin for tumbles, rad, about the middle), walk (phase in steps), stride (0…1.2),
//          armR / armL: number (raise sideways) or { a: raise sideways, f: swing forward } in rad (0 = hanging),
//          eyes: open | half | happy | shut | squeeze | wide | dizzy | sad, look: [dx, dy], brow: none | angry | worried | up,
//          mouth: none | smile | open | frown | o | tongue | grin, blush (0…1), hold: { arm: 'R' | 'L', draw(ctx, info), ang } }
import * as P from './pen.js';
const { TAU, clamp, ink, crayon, shape, blot, INK, CRAYON, mix, rgba } = P;
const D2R = Math.PI / 180;

/** joint ranges (rad unless noted). Arms are short wings / paws on a ball: they lift sideways to overhead and swing forward. */
export const LIM = { armA: [-.35, 2.95], armF: [-1.0, 3.05], tilt: [-.7, .7], squash: [-.45, .45], stride: [0, 1.25], yaw: [-180, 180] };

const armOf = (v, rest) => v == null ? { a: rest?.a ?? .12, f: rest?.f ?? 0 } : typeof v === 'number' ? { a: v, f: 0 } : { a: v.a || 0, f: v.f || 0 };
function check(spec, pose) {
  const n = spec.name || 'critter', bad = m => P.audit.push(`body: ${n} ${m}`);
  for (const side of ['R', 'L']) { const A = armOf(pose['arm' + side], spec.arms?.rest); if (A.a < LIM.armA[0] - 1e-6 || A.a > LIM.armA[1] + 1e-6) bad(`arm${side} raise ${A.a.toFixed(2)} out of range`); if (A.f < LIM.armF[0] - 1e-6 || A.f > LIM.armF[1] + 1e-6) bad(`arm${side} swing ${A.f.toFixed(2)} out of range`); }
  const t = pose.tilt || 0, q = pose.squash || 0, st = pose.stride ?? 0, y = pose.yaw || 0;
  if (t < LIM.tilt[0] || t > LIM.tilt[1]) bad(`tilt ${t.toFixed(2)} out of range (use roll for a tumble)`);
  if (q < LIM.squash[0] || q > LIM.squash[1]) bad(`squash ${q.toFixed(2)} out of range`);
  if (st < LIM.stride[0] || st > LIM.stride[1]) bad(`stride ${st.toFixed(2)} out of range`);
  if (y < LIM.yaw[0] || y > LIM.yaw[1]) bad(`yaw ${y} out of range`);
}

/** the geometry of a pose, without drawing: in the pose's own local frame (origin = ground under the middle) */
function build(spec, pose) {
  const B = spec.body, rx = B.rx, ry = B.ry, psi = (pose.yaw || 0) * D2R, cs = Math.cos(psi), sn = Math.sin(psi);
  const fh = (spec.feet?.h ?? 16) * .55, ph = (pose.walk || 0) * Math.PI, st = pose.stride ?? (pose.walk != null ? 1 : 0);
  const bob = pose.walk != null ? -Math.abs(Math.sin(ph)) * 7 * st : 0;
  const sq = pose.squash || 0, cy = -fh - ry * (1 - sq) + bob;   // body centre above the ground
  // a point on the ball: lateral X (+ = its left), up Y (+ = down), forward Z → screen x, y and depth z
  const onBall = (X, Y, Z) => ({ x: (X * cs + Z * sn) * rx * (1 + sq * .6), y: cy + Y * ry * (1 - sq), z: -X * sn + Z * cs });
  const dir3 = (X, Y, Z) => ({ x: X * cs + Z * sn, y: Y, z: -X * sn + Z * cs });
  const arms = {};
  for (const [side, sx] of [['R', -1], ['L', 1]]) {
    const A = armOf(pose['arm' + side], spec.arms?.rest), sh = onBall(sx * .97, .16, .05);
    const d = dir3(sx * Math.sin(A.a), Math.cos(A.a) * Math.cos(A.f), Math.cos(A.a) * Math.sin(A.f));
    const len = (spec.arms?.len ?? .45) * rx;
    arms[side] = { sh, d, len, hand: { x: sh.x + d.x * len, y: sh.y + d.y * len }, z: sh.z + d.z * .5 };
  }
  const feet = {};
  for (const [side, sx, off] of [['R', -1, 0], ['L', 1, 1]]) {
    const p = ph + off * Math.PI, lift = Math.max(0, Math.sin(p)) * 16 * st, fw = Math.cos(p) * 20 * st;
    const base = onBall(sx * .42, 0, 0), fx = base.x + sn * fw;
    feet[side] = { x: fx, y: -lift, z: base.z, fwd: sn, side: sx };
  }
  return { rx, ry, cy, psi, cs, sn, onBall, dir3, arms, feet, top: cy - ry * (1 - sq), sq };
}

/** where things are, in the caller's coordinates (same transform as critter() uses) */
export function where(spec, pose) {
  const g = build(spec, pose), s = pose.s ?? 1, X = pose.x || 0, Y = (pose.y || 0) - (pose.lift || 0) * 1;
  const tr = (x, y) => {   // apply tilt about the feet and roll about the middle, then scale + place
    let px = x, py = y;
    if (pose.roll) { const c = Math.cos(pose.roll), sN = Math.sin(pose.roll), oy = g.cy; const dx = px, dy = py - oy; px = dx * c - dy * sN; py = oy + dx * sN + dy * c; }
    if (pose.tilt) { const c = Math.cos(pose.tilt), sN = Math.sin(pose.tilt); [px, py] = [px * c - py * sN, px * sN + py * c]; }
    return [X + px * s, Y + py * s];
  };
  return { head: tr(0, g.cy - g.ry * .2), mid: tr(0, g.cy), top: tr(0, g.top), hand: { R: tr(g.arms.R.hand.x, g.arms.R.hand.y), L: tr(g.arms.L.hand.x, g.arms.L.hand.y) },
    feet: { R: tr(g.feet.R.x, g.feet.R.y), L: tr(g.feet.L.x, g.feet.L.y) }, w: g.rx * 2 * s, h: (-g.top) * s, facing: Math.sign(Math.round(Math.sin(g.psi) * 100) / 100) };
}

export function critter(ctx, spec, pose = {}) {
  check(spec, pose);
  const g = build(spec, pose), s = pose.s ?? 1, inkc = spec.ink || INK.blue, B = spec.body, { rx, ry, cy, onBall, sn, cs } = g;
  ctx.save();
  ctx.translate(pose.x || 0, (pose.y || 0) - (pose.lift || 0)); ctx.scale(s, s);
  if (pose.tilt) ctx.rotate(pose.tilt);
  if (pose.roll) { ctx.translate(0, cy); ctx.rotate(pose.roll); ctx.translate(0, -cy); }
  const info = { g, spec, pose, cy, rx, ry };
  const layers = [];   // [z, fn]: drawn far to near, the body at z = 0
  // ears (always behind the outline, they stand on top of the head)
  const E = spec.ears;
  if (E && E.type !== 'none') for (const sx of [-1, 1]) {
    const base = onBall(sx * .45, -.82, .05), es = (E.size ?? 1) * rx;
    layers.push([-2 + base.z * .1, () => ear(ctx, E, base, sx * (Math.abs(cs) > .3 ? Math.sign(cs) : 1), es, inkc, g)]);
  }
  // tail at the back
  const T = spec.tail;
  if (T && T.type !== 'none') { const tp = onBall(0, .35, -1.02); layers.push([tp.z < 0 ? -1 : 1, () => tail(ctx, T, tp, -sn, rx, inkc)]); }
  // arms
  for (const side of ['R', 'L']) {
    const A = g.arms[side], z = A.z;
    layers.push([z < -.05 ? -.5 : .5 + z, () => { arm(ctx, spec, A, inkc); if (pose.hold && (pose.hold.arm || 'R') === side) holdAt(ctx, pose.hold, A, info); }]);
  }
  // the body + face
  layers.push([0, () => {
    const pts = P.egg(0, cy, rx * (1 + g.sq * .6), ry * (1 - g.sq), B.egg ?? .1, 34);
    shape(ctx, pts, { fill: B.col, shade: B.shade || true, line: inkc, gap: B.gap ?? 4.6, sdir: [.5, .8], sk: .3 });
    if (spec.fur) fur(ctx, spec.fur, g, inkc);
    if (spec.belly) { const be = spec.belly, c = onBall(0, be.y ?? .25, 1); ctx.save(); ctx.beginPath(); P.trace(ctx, P.scale(pts, .96, .96, 0, cy), true); ctx.clip(); if (c.z > .15) shape(ctx, P.ellipse(c.x * .9, c.y, rx * (be.w ?? .55) * Math.max(.3, c.z), ry * (be.h ?? .5), 22), { fill: be.col, line: be.line === false ? false : inkc, w: 1.8, second: .2 }); ctx.restore(); }
    face(ctx, spec, pose, g, inkc);
    if (spec.wear) spec.wear(ctx, info, 'body');
  }]);
  // feet in front of the body's bottom edge
  for (const side of ['R', 'L']) { const F = g.feet[side]; layers.push([.3 + F.z * .05, () => foot(ctx, spec, F, inkc)]); }
  if (spec.wear) layers.push([5, () => spec.wear(ctx, info, 'top')]);
  layers.sort((a, b) => a[0] - b[0]).forEach(l => l[1]());
  ctx.restore();
  return where(spec, pose);
}

function ear(ctx, E, base, sx, es, inkc, g) {
  const h = E.type === 'long' ? es * 1.25 : E.type === 'round' ? es * .42 : es * .6, w = E.type === 'long' ? es * .32 : es * .42;
  const lean = (base.x / g.rx) * .5 + (E.lean ?? 0) * sx;
  let pts;
  if (E.type === 'round') pts = P.ellipse(0, -h * .5, w * .55, h * .55, 16);
  else if (E.type === 'long') pts = [[-w * .5, 0], [-w * .55, -h * .6], [-w * .2, -h], [w * .2, -h], [w * .55, -h * .6], [w * .5, 0]];
  else pts = [[-w * .6, 4], [-w * .2, -h * .6], [w * .05, -h], [w * .35, -h * .55], [w * .6, 4]];
  pts = P.move(P.rot(pts, lean), base.x, base.y + 6);
  shape(ctx, pts, { fill: E.col, line: inkc, gap: 4.4 });
  if (E.inner) crayon(ctx, P.scale(pts, .55, .7, base.x, base.y + 6), { knock: false, col: E.inner, gap: 3.6, base: .3 });
}
function tail(ctx, T, tp, back, rx, inkc) {
  const s = (T.size ?? 1) * rx, dir = Math.sign(back) || -1, x = tp.x, y = tp.y;
  if (T.type === 'puff') { shape(ctx, P.ellipse(x + dir * s * .1, y, s * .2, s * .18, 14), { fill: T.col, line: inkc, gap: 3.8 }); return; }
  if (T.type === 'feather') {   // a tuft of three feathers sticking out of the back
    for (const k of [-1, 0, 1]) { const a = (dir > 0 ? 0 : Math.PI) + k * .35 - dir * .25; const pts = P.move(P.rot(P.ellipse(s * .2, 0, s * .2, s * .07, 12), a), x, y + k * 4); shape(ctx, pts, { fill: T.col, line: inkc, gap: 3.6, w: 2 }); }
    return;
  }
  // curl: a stroke with a loop
  const pts = []; for (let i = 0; i <= 18; i++) { const k = i / 18, a = k * TAU * .9; pts.push([x + dir * (k * s * .45 + Math.sin(a) * s * .1 * k), y - Math.sin(k * Math.PI) * s * .25 - (1 - Math.cos(a)) * s * .06 * k]); }
  ink(ctx, pts, { col: inkc, w: 11, second: .2, over: 0 }); ink(ctx, pts, { col: T.col, w: 7, second: 0, amp: .4, over: 0 });
}
function arm(ctx, spec, A, inkc) {
  const Ar = spec.arms || {}, col = Ar.col || spec.body.col, w = (Ar.w ?? .2) * spec.body.rx, L = A.len * Math.max(.35, Math.hypot(A.d.x, A.d.y));
  const ang = Math.atan2(A.d.y, A.d.x);
  let pts = Ar.type === 'paw' ? P.egg(L * .55, 0, L * .5, w * .5, -.15, 18)
    : [[0, -w * .5], [L * .35, -w * .62], [L * .75, -w * .4], [L, 0], [L * .7, w * .38], [L * .3, w * .55], [0, w * .45]];
  pts = P.move(P.rot(pts, ang), A.sh.x, A.sh.y);
  shape(ctx, pts, { fill: col, shade: mix(col, '#1d1d40', .35), line: inkc, gap: 4.2, sk: .5 });
  if (Ar.type === 'paw' && Ar.pad) crayon(ctx, P.move(P.rot(P.ellipse(L * .8, 0, L * .22, w * .36, 12), ang), A.sh.x, A.sh.y), { knock: false, col: Ar.pad, gap: 3, base: .35, inset: 1, off: [0, 0] });
  if (Ar.type !== 'paw') for (const k of [-.2, .15]) { const f = P.move(P.rot([[L * .5, w * k], [L * .85, w * k * .5]], ang), A.sh.x, A.sh.y); ink(ctx, f, { col: inkc, w: 1.4, second: 0, over: 0 }); }
}
function holdAt(ctx, hold, A, info) {
  ctx.save(); ctx.translate(A.hand.x, A.hand.y); ctx.rotate((hold.ang || 0)); hold.draw(ctx, info, A); ctx.restore();
}
function foot(ctx, spec, F, inkc) {
  const Fs = spec.feet || {}, w = Fs.w ?? 30, h = Fs.h ?? 16, len = w * (.55 + .45 * Math.abs(F.fwd));
  const cx = F.x + F.fwd * w * .25, pts = P.egg(cx, F.y - h * .5, len * .55, h * .55, -.2, 18);
  shape(ctx, pts, { fill: Fs.col || CRAYON.gold, line: inkc, gap: 4, w: 2.2 });
  if (Math.abs(F.fwd) < .7) ink(ctx, [[cx - len * .12, F.y - h * .45], [cx - len * .1, F.y - h * .05]], { col: inkc, w: 1.4, second: 0 });   // a toe split seen from the front
}
function fur(ctx, n, g, inkc) {
  const top = g.onBall(0, -1, 0).y;
  for (let i = 0; i < n; i++) { const k = (i - (n - 1) / 2), x0 = g.onBall(k * .07, -.98, .1).x; ink(ctx, [[x0, top + 4], [x0 + k * 5 + 2, top - 12 - (i % 2) * 5], [x0 + k * 7 + 5, top - 16]], { col: inkc, w: 2, second: .2 }); }
}

function face(ctx, spec, pose, g, inkc) {
  const Ey = spec.eyes || {}, gap = (Ey.gap ?? 26) * D2R, ey = Ey.y ?? -.18, es = (Ey.size ?? 1) * g.rx * .2;
  const style = pose.eyes || 'open', [lx, ly] = pose.look || [0, 0];
  const eyeAt = sx => { const c = Math.cos(sx * gap + g.psi), x = Math.sin(sx * gap + g.psi) * g.rx * Math.cos(ey) * (1 + g.sq * .6) * .98, y = g.cy + ey * g.ry * (1 - g.sq); return { x, y, c }; };
  const eyes = [eyeAt(-1), eyeAt(1)];
  if (eyes.every(e => e.c < .08)) return;   // facing away: the back of the head
  // cheeks
  if (spec.cheeks && (pose.blush ?? 1) > 0) for (const [i, e] of eyes.entries()) {
    const c = Math.cos((i ? 1 : -1) * gap * 1.6 + g.psi); if (c < .12) continue;
    const x = Math.sin((i ? 1 : -1) * gap * 1.6 + g.psi) * g.rx * .92;
    crayon(ctx, P.ellipse(x, e.y + es * 1.55, es * 1.1 * c, es * .62, 16), { knock: false, col: spec.cheeks, gap: 3.2, a: .55 * (pose.blush ?? 1), base: .28, ang: -.6, inset: 1, off: [0, 0] });
  }
  for (const [i, e] of eyes.entries()) if (e.c > .08) eye(ctx, style, e.x, e.y, es, Math.max(.28, e.c), lx, ly, inkc, spec, i ? 1 : -1, g);
  // brows
  const br = pose.brow || 'none';
  if (br !== 'none') for (const [i, e] of eyes.entries()) {
    if (e.c < .15) continue; const sx = i ? 1 : -1, w = es * 1.2 * e.c, y = e.y - es * 1.55;
    const up = br === 'up' ? -es * .4 : 0;
    // the inner end (toward the middle of the face) drops for angry, lifts for worried
    const inner = [e.x - sx * w, y + up + (br === 'angry' ? es * .35 : br === 'worried' ? -es * .3 : 0)], outer = [e.x + sx * w, y + up + (br === 'angry' ? -es * .2 : br === 'worried' ? es * .25 : 0)];
    ink(ctx, br === 'up' ? P.arc(e.x, y + es * .3, w, es * .45, Math.PI * 1.15, Math.PI * 1.85, 6) : [inner, outer], { col: inkc, w: 3.2, second: .25 });
  }
  // nose / beak + mouth
  const N = spec.nose || { type: 'none' }, nc = Math.cos(g.psi), nx = Math.sin(g.psi) * g.rx * (.97 + .08 * Math.abs(Math.sin(g.psi))), ny = g.cy + (N.y ?? .02) * g.ry, ns = (N.size ?? 1) * g.rx;
  const m = pose.mouth || 'none';
  if (nc > -.1 && N.type === 'beak') beak(ctx, N, nx, ny, ns, g.sn, nc, m, inkc);
  else if (nc > -.1) {
    if (N.type === 'snout') { const pts = P.move([[-ns * .09, -ns * .03], [ns * .09, -ns * .03], [0, ns * .07]], nx + g.sn * ns * .06, ny); shape(ctx, pts, { fill: N.col || CRAYON.pink, line: inkc, gap: 3, w: 2 }); }
    else if (N.type === 'button') shape(ctx, P.ellipse(nx + g.sn * ns * .05, ny, ns * (.1 - .03 * Math.abs(g.sn)), ns * .075, 14), { fill: N.col || CRAYON.pink, line: inkc, gap: 3, w: 2 });
    mouth(ctx, m, nx + g.sn * ns * .04, ny + ns * .16, ns * .2 * Math.max(.45, nc), inkc);
  }
}
function eye(ctx, style, x, y, es, c, lx, ly, inkc, spec, sx, g) {
  const w = es * .78 * c, h = es;
  if (style === 'happy') { ink(ctx, P.arc(x, y + h * .35, w * 1.05, h * .7, Math.PI * 1.1, Math.PI * 1.9, 8), { col: inkc, w: 3.4, second: .25 }); return; }
  if (style === 'shut') { ink(ctx, P.arc(x, y - h * .1, w * 1.05, h * .45, Math.PI * .1, Math.PI * .9, 8), { col: inkc, w: 3.2, second: .25 }); return; }
  if (style === 'squeeze') { const d = sx * (g.sn < 0 ? -1 : 1); ink(ctx, [[x - w * d, y - h * .6], [x + w * d * .9, y], [x - w * d, y + h * .6]], { col: inkc, w: 3.4, second: .25 }); return; }
  if (style === 'dizzy') { const pts = []; for (let i = 0; i < 30; i++) { const a = i * .55, r = (i / 30) * h; pts.push([x + Math.cos(a) * r * c, y + Math.sin(a) * r]); } ink(ctx, pts, { col: inkc, w: 2.2, second: .2 }); return; }
  if (style === 'wide') {
    shape(ctx, P.ellipse(x, y, w * 1.2, h * 1.15, 18), { fill: CRAYON.white, line: inkc, gap: 3, w: 2.4 });
    blot(ctx, P.ellipse(x + lx * w * .5, y + ly * h * .4, w * .38, h * .38, 12), INK.black); return;
  }
  // open / half / sad: a glossy black bean with two highlights
  const ox = lx * w * .25, oy = ly * h * .2;
  blot(ctx, P.ellipse(x + ox, y + oy, w, h, 20), INK.black);
  ctx.save(); ctx.fillStyle = rgba('#ffffff', .95);
  ctx.beginPath(); ctx.ellipse(x + ox - w * .3, y + oy - h * .38, w * .32, h * .26, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + ox + w * .3, y + oy + h * .35, w * .14, h * .12, 0, 0, TAU); ctx.fill();
  if (style === 'sad') { ctx.beginPath(); ctx.ellipse(x + ox + w * .1, y + oy + h * .1, w * .2, h * .17, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
  if (style === 'half') {   // the heavy, unimpressed lid: body colour over the top half, a flat ballpoint line across it
    const lid = [[x - w * 1.25, y - h * 1.25], [x + w * 1.25, y - h * 1.25], [x + w * 1.25, y - h * .1], [x - w * 1.25, y - h * .1]];
    ctx.save(); ctx.beginPath(); P.trace(ctx, P.ellipse(x + ox, y + oy, w * 1.06, h * 1.06, 20), true); ctx.clip();
    ctx.fillStyle = mix(spec.body.col, P.PAPER, .25); ctx.fillRect(x - w * 1.3, y - h * 1.3, w * 2.6, h * 1.2);
    crayon(ctx, lid, { knock: false, col: spec.body.col, gap: 3.4, base: .5, inset: 1, off: [0, 0] });
    ctx.restore();
    ink(ctx, [[x - w * 1.05, y - h * .1], [x + w * 1.05, y - h * .1]], { col: inkc, w: 2.6, second: .2 });
  }
}
function beak(ctx, N, x, y, s, sn, nc, m, inkc) {
  const col = N.col || CRAYON.gold, w = s * .3 * (.55 + .45 * Math.abs(nc)), h = s * .2, tip = sn * s * .26, open = m === 'open' || m === 'tongue' || m === 'o' ? 1 : m === 'grin' ? .5 : 0;
  // upper beak: a rounded triangle pointing down when seen from the front, toward the face when in profile
  const up = [[x - w * .5 + sn * w * .3, y - h * .4], [x + w * .5 + sn * w * .3, y - h * .4], [x + w * .45 + tip, y + h * .05], [x + tip, y + h * (.55 - .25 * Math.abs(sn))], [x - w * .45 + tip * .6, y + h * .05]];
  if (open) {
    const lo = [[x - w * .38 + tip * .5, y + h * .2], [x + w * .38 + tip * .7, y + h * .2], [x + tip * .8, y + h * (.75 + .6 * open)]];
    shape(ctx, lo, { fill: col, line: inkc, gap: 3.6, w: 2.2 });
    if (m === 'tongue' || m === 'open') crayon(ctx, P.ellipse(x + tip * .6, y + h * .5, w * .22, h * .3, 12), { knock: false, col: CRAYON.pink, gap: 3, base: .4, inset: 1 });
  }
  shape(ctx, up, { fill: col, shade: mix(col, '#7a3d10', .4), line: inkc, gap: 3.8, w: 2.4, sk: .55 });
  if (m === 'frown' && !open) ink(ctx, P.arc(x + tip * .5, y + h * .95, w * .4, h * .25, Math.PI * 1.15, Math.PI * 1.85, 6), { col: inkc, w: 2, second: 0 });
}
function mouth(ctx, m, x, y, w, inkc) {
  if (m === 'none') return;
  if (m === 'smile') ink(ctx, P.arc(x, y - w * .3, w * .8, w * .6, Math.PI * .15, Math.PI * .85, 8), { col: inkc, w: 2.4, second: .2 });
  else if (m === 'grin') { const pts = P.arc(x, y - w * .2, w, w * .8, 0, Math.PI, 10); shape(ctx, pts, { fill: CRAYON.white, line: inkc, gap: 3, w: 2.4 }); }
  else if (m === 'frown') ink(ctx, P.arc(x, y + w * .5, w * .7, w * .5, Math.PI * 1.15, Math.PI * 1.85, 8), { col: inkc, w: 2.4, second: .2 });
  else if (m === 'o') shape(ctx, P.ellipse(x, y + w * .2, w * .35, w * .45, 12), { fill: '#6b2a2a', line: inkc, gap: 3, w: 2.2 });
  else if (m === 'open' || m === 'tongue') { shape(ctx, P.arc(x, y - w * .1, w * .75, w * 1.1, 0, Math.PI, 10), { fill: '#7a2e2e', line: inkc, gap: 3, w: 2.4 }); crayon(ctx, P.ellipse(x, y + w * .65, w * .4, w * .28, 10), { knock: false, col: CRAYON.pink, base: .5, gap: 3, inset: 1 }); }
  else if (m === 'w') { ink(ctx, [[x - w * .7, y], [x - w * .35, y + w * .35], [x, y], [x + w * .35, y + w * .35], [x + w * .7, y]], { col: inkc, w: 2.2, second: .2 }); }
}

/** the yaws a cast sheet shows: both profiles, both 3/4s, front, back */
export const TURNS = [-90, -45, 0, 45, 90, 180];
/** blend two poses (numbers lerp, the rest switch at k = .5) */
export function blend(a, b, k) {
  const o = {}; for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key], y = b[key];
    if (typeof x === 'number' && typeof y === 'number') o[key] = x + (y - x) * k;
    else if (x && y && typeof x === 'object' && !Array.isArray(x) && typeof x.a === 'number') o[key] = { a: x.a + (y.a - x.a) * k, f: (x.f || 0) + ((y.f || 0) - (x.f || 0)) * k };
    else o[key] = k < .5 ? (x ?? y) : (y ?? x);
  }
  return o;
}

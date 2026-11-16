// torn-page-journey · rider.js — the traveller: a character on a bicycle, built from a spec (data) and drawn through any
// medium. The same rider crosses every page; only the medium that draws it changes.
//
//   R.draw(ctx, M, SPEC, st)   draw; returns the joints (world space) and appends broken body rules to R.audit
//   R.where(SPEC, st)          the joints without drawing (aim things at the rider, write checks)
//   st = { x, ground(x), f: 1 | -1, wheel, crank, t, vs, acc, mood, gesture: { kind, u } | null, boil, coast }
//
// Geometry is in units of the wheel radius R, in a local frame facing right (+x forward, y down) with the rear hub at 0,0;
// facing left mirrors the frame, so the rider shows its RIGHT side and the drive side (chainring) comes to the front.
// Rules the rig keeps (and audits): feet locked on the pedals (unless a gesture lifts them while coasting); legs and arms
// solved by two-bone IK with fixed bone lengths, knees forward, elbows down; the neck within ±45°; wheels roll the distance
// travelled (the journey checks it); a gesture always gathers (anticipation) before it acts and settles after (recovery).
import { TAU, clamp, lerp, hash, n1, ease, keys, spring, ellipse, arc, shade, mix } from './core.js';

export const audit = [];
export const LIM = { knee: [38, 178], elbow: [28, 178], neck: 45 * Math.PI / 180 };

// ── moods: posture and face for a chapter (a gesture adds to these) ──
export const MOODS = {
  joy:       { lean: .30, head: -.10, eyes: 'happy', mouth: 'smile' },
  curiosity: { lean: .28, head: .02, eyes: 'open', mouth: 'flat', tilt: .12 },
  bustle:    { lean: .26, head: -.04, eyes: 'open', mouth: 'smile' },
  triumph:   { lean: .52, head: -.06, eyes: 'determined', mouth: 'grin', stand: .8 },
  sorrow:    { lean: .44, head: .30, eyes: 'sad', mouth: 'frown', hunch: .5 },
  fear:      { lean: .5, head: .12, eyes: 'wide', mouth: 'o', hunch: .7 },
  relief:    { lean: .24, head: -.16, eyes: 'soft', mouth: 'smile' },
  awe:       { lean: .2, head: -.2, eyes: 'wide', mouth: 'o' },
  wonder:    { lean: .22, head: -.26, eyes: 'wide', mouth: 'smile' },
  calm:      { lean: .24, head: 0, eyes: 'soft', mouth: 'smile' },
  lonely:    { lean: .36, head: .18, eyes: 'soft', mouth: 'flat', hunch: .3 },
  pride:     { lean: .22, head: -.14, eyes: 'happy', mouth: 'grin' },
};

// ── gestures: big actions keyed over u (0…1) with an anticipation, an action and a recovery phase ──
// channels: far / near (hand offset from its grip, in R), head (pitch, + = down), lean (+ = forward), stand, mouth (0…1),
// wings (bird: spread 0…1), legs (feet-off 0…1). check: anticipation ≥ .12 s and moving AGAINST the action.
export const GESTURES = {
  wave:  { dur: 2.0, antic: [0, .18], act: [.18, .78], main: 'far', ch: {
    far: [{ u: 0, x: 0, y: 0 }, { u: .18, x: -.1, y: .14 }, { u: .32, x: .1, y: -1.0, e: 'out' }, { u: .44, x: .3, y: -1.08 }, { u: .54, x: .04, y: -1.02 }, { u: .64, x: .3, y: -1.08 }, { u: .78, x: .1, y: -.96 }, { u: .92, x: 0, y: .05, e: 'inOut' }, { u: 1, x: 0, y: 0 }],
    head: [{ u: 0, v: 0 }, { u: .18, v: .06 }, { u: .36, v: -.14, e: 'out' }, { u: .8, v: -.1 }, { u: 1, v: 0 }],
    lean: [{ u: 0, v: 0 }, { u: .18, v: .06 }, { u: .36, v: -.08 }, { u: .85, v: -.04 }, { u: 1, v: 0, e: 'back' }],
    mouth: [{ u: 0, v: 0 }, { u: .3, v: .6 }, { u: .8, v: .5 }, { u: 1, v: 0 }] } },
  flap:  { dur: 2.2, antic: [0, .2], act: [.2, .72], main: 'far', ch: {   // no hands: both arms (wings) up, then back to the bars
    far: [{ u: 0, x: 0, y: 0 }, { u: .2, x: -.06, y: .2 }, { u: .36, x: -.2, y: -1.25, e: 'out' }, { u: .5, x: -.1, y: -1.05 }, { u: .6, x: -.2, y: -1.25 }, { u: .74, x: -.1, y: -1.0 }, { u: .9, x: 0, y: .06, e: 'inOut' }, { u: 1, x: 0, y: 0 }],
    near: [{ u: 0, x: 0, y: 0 }, { u: .2, x: -.06, y: .2 }, { u: .36, x: -.3, y: -1.15, e: 'out' }, { u: .5, x: -.2, y: -.95 }, { u: .6, x: -.3, y: -1.15 }, { u: .74, x: -.2, y: -.9 }, { u: .9, x: 0, y: .06, e: 'inOut' }, { u: 1, x: 0, y: 0 }],
    wings: [{ u: 0, v: 0 }, { u: .2, v: 0 }, { u: .36, v: 1, e: 'out' }, { u: .74, v: .9 }, { u: .9, v: 0 }, { u: 1, v: 0 }],
    lean: [{ u: 0, v: 0 }, { u: .2, v: .12 }, { u: .36, v: -.18, e: 'out' }, { u: .74, v: -.12 }, { u: .9, v: .04 }, { u: 1, v: 0, e: 'back' }],
    head: [{ u: 0, v: 0 }, { u: .2, v: .1 }, { u: .36, v: -.22 }, { u: .8, v: -.16 }, { u: 1, v: 0 }],
    mouth: [{ u: 0, v: 0 }, { u: .36, v: 1 }, { u: .74, v: .8 }, { u: 1, v: 0 }] } },
  look:  { dur: 2.4, antic: [0, .16], act: [.16, .7], main: 'head', ch: {   // looks up at something (a kite, a moon)
    head: [{ u: 0, v: 0 }, { u: .16, v: .08 }, { u: .34, v: -.46, e: 'out' }, { u: .7, v: -.42 }, { u: .9, v: .04, e: 'inOut' }, { u: 1, v: 0 }],
    lean: [{ u: 0, v: 0 }, { u: .16, v: .04 }, { u: .34, v: -.1 }, { u: .9, v: .02 }, { u: 1, v: 0 }],
    mouth: [{ u: 0, v: 0 }, { u: .34, v: .5 }, { u: .7, v: .4 }, { u: 1, v: 0 }] } },
  catch: { dur: 1.6, antic: [0, .25], act: [.25, .55], main: 'head', ch: {  // snaps at a butterfly / a leaf / a drop
    head: [{ u: 0, v: 0 }, { u: .25, v: .2 }, { u: .38, v: -.4, e: 'out' }, { u: .55, v: -.32 }, { u: .8, v: .06 }, { u: 1, v: 0 }],
    lean: [{ u: 0, v: 0 }, { u: .25, v: -.1 }, { u: .38, v: .16, e: 'out' }, { u: .55, v: .1 }, { u: 1, v: 0, e: 'back' }],
    mouth: [{ u: 0, v: 0 }, { u: .25, v: .3 }, { u: .36, v: 1 }, { u: .42, v: 0 }, { u: 1, v: 0 }] } },
  bell:  { dur: 1.1, antic: [0, .22], act: [.22, .6], main: 'near', ch: {
    near: [{ u: 0, x: 0, y: 0 }, { u: .22, x: -.05, y: .08 }, { u: .34, x: .14, y: -.12, e: 'out' }, { u: .44, x: .06, y: -.04 }, { u: .54, x: .14, y: -.12 }, { u: .7, x: 0, y: .02 }, { u: 1, x: 0, y: 0 }] } },
  shiver: { dur: 1.6, antic: [0, .2], act: [.2, .8], main: 'lean', ch: {
    lean: [{ u: 0, v: 0 }, { u: .2, v: .15 }, ...Array.from({ length: 9 }, (_, i) => ({ u: .26 + i * .06, v: i % 2 ? .02 : -.12 })), { u: .86, v: -.04 }, { u: 1, v: 0, e: 'back' }],
    head: [{ u: 0, v: 0 }, { u: .2, v: .18 }, { u: .5, v: -.1 }, { u: 1, v: 0 }] } },
  feetup: { dur: 2.4, antic: [0, .18], act: [.18, .8], main: 'legs', feetOff: true, ch: {   // coasting downhill, feet off the pedals
    legs: [{ u: 0, v: 0 }, { u: .18, v: -.15 }, { u: .32, v: 1, e: 'out' }, { u: .8, v: .92 }, { u: .94, v: 0, e: 'inOut' }, { u: 1, v: 0 }],
    lean: [{ u: 0, v: 0 }, { u: .18, v: .1 }, { u: .32, v: -.14 }, { u: .8, v: -.1 }, { u: 1, v: 0, e: 'back' }],
    mouth: [{ u: 0, v: 0 }, { u: .32, v: 1 }, { u: .8, v: .8 }, { u: 1, v: 0 }], head: [{ u: 0, v: 0 }, { u: .32, v: -.18 }, { u: 1, v: 0 }] } },
};
/** proves a gesture gathers before it acts: returns null or a reason */
export function gestureProblem(g, name) {
  const ch0 = g.ch[g.main]; if (!ch0 || !g.antic) return `gesture "${name}" has no main channel / anticipation phase`;
  const ch = ch0.map(k => ({ ...k, t: k.u }));
  if ((g.antic[1] - g.antic[0]) * g.dur < .12) return `gesture "${name}" anticipation shorter than .12 s`;
  const val = u => { const x = keys(ch, u, 'x', 0), y = keys(ch, u, 'y', 0), v = keys(ch, u, 'v', 0); return [x, y + v]; };
  const a = val(g.antic[1]); let p = [0, 0], pm = 0;
  for (let u = g.antic[1] + .04; u <= g.act[1]; u += .02) { const q = val(u), m = Math.hypot(q[0], q[1]); if (m > pm) { pm = m; p = q; } }
  if (Math.hypot(a[0], a[1]) < .02 || a[0] * p[0] + a[1] * p[1] >= 0) return `gesture "${name}" anticipation does not move against the action`;
  const end = val(1); if (Math.hypot(end[0], end[1]) > .02) return `gesture "${name}" does not settle back to its start`;
  return null;
}

// ── bike geometry (local, ×R) ──
const BIKE = { wb: 3.05, bb: [1.18, .12], saddle: [.66, -1.66], htB: [2.62, -.95], htT: [2.52, -1.45], bar: [2.46, -1.78], grip: [2.22, -1.74], crank: .38, ring: .3 };

function ik(A, B, L1, L2, prefer) {
  const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy), dd = clamp(d, Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3);
  const a = Math.atan2(dy, dx), al = Math.acos(clamp((L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd), -1, 1));
  const c1 = [A[0] + Math.cos(a + al) * L1, A[1] + Math.sin(a + al) * L1], c2 = [A[0] + Math.cos(a - al) * L1, A[1] + Math.sin(a - al) * L1];
  const K = prefer(c1) >= prefer(c2) ? c1 : c2, ex = B[0] - K[0], ey = B[1] - K[1], el = Math.hypot(ex, ey) || 1, E = [K[0] + ex / el * L2, K[1] + ey / el * L2];
  const v1 = [A[0] - K[0], A[1] - K[1]], v2 = [E[0] - K[0], E[1] - K[1]];
  const bend = Math.acos(clamp((v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2)), -1, 1)) * 180 / Math.PI;
  return { K, E, reach: d <= L1 + L2 + .01, miss: Math.max(0, d - (L1 + L2)), bend };
}
const capsule = (A, B, wa, wb, n = 7) => {
  const a = Math.atan2(B[1] - A[1], B[0] - A[0]), P = [];
  for (let i = 0; i <= n; i++) { const t = a + Math.PI / 2 + i / n * Math.PI; P.push([A[0] + Math.cos(t) * wa, A[1] + Math.sin(t) * wa]); }
  for (let i = 0; i <= n; i++) { const t = a - Math.PI / 2 + i / n * Math.PI; P.push([B[0] + Math.cos(t) * wb, B[1] + Math.sin(t) * wb]); }
  return P;
};
const ribbon = (pts, w0, w1) => {   // a tapering strip along a centreline
  const L = [], Rr = [];
  pts.forEach((p, i) => { const q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)], a = Math.atan2(q[1] - o[1], q[0] - o[0]), w = lerp(w0, w1, i / (pts.length - 1)) / 2; L.push([p[0] - Math.sin(a) * w, p[1] + Math.cos(a) * w]); Rr.push([p[0] + Math.sin(a) * w, p[1] - Math.cos(a) * w]); });
  return [...L, ...Rr.reverse()];
};
/** a strip whose width follows a profile (one width per centreline point) */
const ribbonW = (pts, ws) => { const L = [], Rr = []; pts.forEach((p, i) => { const q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)], a = Math.atan2(q[1] - o[1], q[0] - o[0]), w = ws[i] / 2; L.push([p[0] - Math.sin(a) * w, p[1] + Math.cos(a) * w]); Rr.push([p[0] + Math.sin(a) * w, p[1] - Math.cos(a) * w]); }); return [...L, ...Rr.reverse()]; };
const lerpP = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const pol = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];

/** the rider's pose in LOCAL units (×R), then mapped to world — shared by where() and draw() */
export function where(spec, st) {
  const R = spec.R || 70, f = st.f || 1, t = st.t || 0, B = BIKE;
  const mood = { ...MOODS.calm, ...(MOODS[st.mood] || {}), ...(spec.moods?.[st.mood] || {}), ...(st.pose || {}) };
  const G = st.gesture ? (spec.gestures?.[st.gesture.kind] || GESTURES[st.gesture.kind]) : null, gu = st.gesture ? clamp(st.gesture.u) : 0;
  const gc = (name, prop = 'v') => G && G.ch[name] ? keys(G.ch[name].map(k => ({ ...k, t: k.u })), gu, prop, 0) : 0;
  // world placement: rear hub on the ground, front hub on the ground ahead, the frame tilts with the slope
  const g = st.ground || (() => 900); let xr = st.x, xf = xr + f * B.wb * R;
  for (let i = 0; i < 2; i++) { const a = Math.atan2(g(xf) - g(xr), xf - xr); xf = xr + Math.cos(a) * B.wb * R * f; }
  const yr = g(xr) - R, yf = g(xf) - R, tilt = Math.atan2(yf - yr, xf - xr) - (f < 0 ? Math.PI : 0);
  const ct = Math.cos(tilt), sn = Math.sin(tilt);
  const W = p => { const x = p[0] * R * f, y = p[1] * R; return [xr + x * ct - y * sn, yr + x * sn + y * ct]; };
  // body
  const breath = Math.sin(t * TAU / (3.1 + .4 * Math.sin(t * .23)) + 1.3);                   // ~3 s, never quite regular
  const rock = st.coast ? 0 : Math.sin(2 * st.crank) * .012;                                  // hips rock with the pedal stroke
  const stand = clamp((mood.stand || 0) + gc('stand')), lean = mood.lean + gc('lean') + (mood.hunch || 0) * .08 + rock * 2;
  const hip = add(add(B.saddle, [0, -.1 + rock]), [.26 * stand, -.42 * stand]);
  const torso = spec.torso || 1.2, sh = add(hip, pol(-Math.PI / 2 + lean, torso));
  // legs: lengths fitted to the frame (seated), feet on the pedals, knees forward
  const L = spec._leg || (spec._leg = (Math.hypot(B.saddle[0] - .0 - B.bb[0], B.saddle[1] - .1 - B.bb[1]) + B.crank + .06) / 2 * 1.04);
  const foot = spec.footLen || .42, legsUp = clamp(gc('legs')), feetOff = G?.feetOff && legsUp > .02;
  const leg = side => {
    const ca = st.crank + (side === 'near' ? 0 : Math.PI), P = add(B.bb, pol(ca, B.crank));
    const heel = .1 + .08 * Math.sin(ca + .6);                                               // the heel drops through the down stroke
    let ank = add(P, [-foot * .55, -.12 - heel * .2]);
    if (feetOff) { const up = add(hip, side === 'near' ? [L * 1.5, L * .95] : [L * 1.35, L * 1.15]); ank = [lerp(ank[0], up[0], legsUp), lerp(ank[1], up[1], legsUp)]; }
    const s = ik(hip, ank, L, L, k => k[0] - k[1] * .1);
    const ball = feetOff ? add(s.E, [foot * .55, .12 + heel * .2]) : P;
    return { pedal: P, ank: s.E, knee: s.K, ball, toe: add(ball, [foot * .45, .04]), heel: add(s.E, [-foot * .15, .1]), s, ca };
  };
  const legs = { near: leg('near'), far: leg('far') };
  // arms: hands on the grips unless a gesture takes them; elbows down
  // arm length fitted to an UPRIGHT rider (the farthest the grips ever get), so sitting up never pulls the hands off the bars
  const armL = spec._arm || (spec._arm = Math.hypot(B.grip[0] - (B.saddle[0] - .02), B.grip[1] - (B.saddle[1] - .06 - torso)) / 2 * 1.03);
  const arm = side => {
    const off = side === 'far' ? [-.03, -.04] : [0, 0], S0 = add(sh, side === 'far' ? [.04, .02] : [-.02, .04]);
    const tgt = add(add(B.grip, off), [gc(side, 'x'), gc(side, 'y')]);
    const s = ik(S0, tgt, armL, armL, k => k[1] - k[0] * .2);
    return { sh: S0, elbow: s.K, hand: s.E, s, free: Math.hypot(gc(side, 'x'), gc(side, 'y')) > .05 };
  };
  const arms = { near: arm('near'), far: arm('far') };
  // head: on a neck from the shoulders, pitched by mood + gesture (+ = down), bobs a little with the stroke
  const pitch = clamp(mood.head + gc('head'), -1.2, 1.2), neck = spec.neck ?? .3;
  const hd = add(add(sh, pol(-Math.PI / 2 + lean * .35 + .2, neck)), [.06, (rock * .6) + (mood.hunch || 0) * .1]);
  const blinkK = (t + hash(7, spec.seed || 1) * 3) % (2.7 + hash(Math.floor(t / 3.3), 9) * 2.2);
  const J = { R, f, tilt, W, hip, sh, hd, pitch, lean, legs, arms, breath, stand, mood, gu, G, gc, blink: blinkK < .13, mouth: clamp(gc('mouth')), wings: clamp(gc('wings')), feetOff, B, L, armL };
  // world-space joints for checks
  J.world = { hip: W(hip), sh: W(sh), hd: W(hd), rearHub: W([0, 0]), frontHub: W([B.wb, 0]), rearContact: [xr, g(xr)], frontContact: [xf, g(xf)],
    pedal: { near: W(legs.near.pedal), far: W(legs.far.pedal) }, ball: { near: W(legs.near.ball), far: W(legs.far.ball) } };
  return J;
}

/** check a pose: pushes 'body: …' / 'feet: …' into audit, returns numbers */
function check(spec, J, st) {
  const nm = spec.name || 'rider', out = { foot: 0 };
  for (const side of ['near', 'far']) {
    const l = J.legs[side];
    if (!l.s.reach) audit.push(`body: ${nm} ${side} leg cannot reach (${(l.s.miss * J.R).toFixed(1)} px short)`);
    if (l.s.bend < LIM.knee[0] || l.s.bend > LIM.knee[1]) audit.push(`body: ${nm} ${side} knee bend ${l.s.bend.toFixed(0)}° out of range`);
    if (l.knee[0] < Math.min(J.hip[0], l.ank[0]) - .02) audit.push(`body: ${nm} ${side} knee folds backwards`);
    const e = Math.hypot(J.world.ball[side][0] - J.world.pedal[side][0], J.world.ball[side][1] - J.world.pedal[side][1]); out.foot = Math.max(out.foot, J.feetOff ? 0 : e);
    if (!J.feetOff && e > 1) audit.push(`feet: ${nm} ${side} foot off its pedal by ${e.toFixed(1)} px`);
    const a = J.arms[side];
    if (!a.s.reach) audit.push(`body: ${nm} ${side} arm cannot reach (${(a.s.miss * J.R).toFixed(1)} px short)`);
    if (a.s.bend < LIM.elbow[0] || a.s.bend > LIM.elbow[1]) audit.push(`body: ${nm} ${side} elbow bend ${a.s.bend.toFixed(0)}° out of range`);
  }
  if (J.feetOff && !st.coast) audit.push(`feet: ${nm} lifts the feet off the pedals while pedalling`);
  if (Math.abs(J.pitch) > LIM.neck + 1e-6) audit.push(`body: ${nm} neck pitch ${(J.pitch * 180 / Math.PI).toFixed(0)}° beyond ±45°`);
  return out;
}

/** draw the rider in medium M. Returns J (with J.world). */
export function draw(ctx, M, spec, st) {
  const J = where(spec, st), { W, R, f, B } = J, sd = (st.boil || 0) * 17 + (spec.seed || 1) * 1000;
  J.numbers = check(spec, J, st);
  const H = { role: 'hero' }, w = (pts) => pts.map(W), r = x => x * R;
  const bk = spec.bike || {}, col = { frame: bk.col || '#c8432b', tyre: bk.tyre || '#2b2a28', saddle: bk.saddle || '#4a3326', metal: bk.metal || '#8c8c88' };
  const vs = st.vs ?? 1, acc = st.acc || 0, t = st.t || 0;

  // trailing things (scarf, tail, ears) lag the motion: angle from smoothed speed + spring on acceleration + flutter
  const trail = (base, n, segL, droop, ph) => { const P = [base]; let a = Math.PI + (1 - vs) * droop + acc * .5; for (let i = 0; i < n; i++) { a += (.08 + (1 - vs) * .25) + Math.sin(t * 9 + i * 1.3 + ph) * .14 * vs; P.push(add(P[i], pol(a, segL))); } return P; };
  const scarf = spec.scarf && { base: add(J.hd, [-.1, (spec.neck ?? .3) * .7]), col: spec.scarf.col || '#2f6fb3' };

  // 1 · scarf tails and tail behind everything
  if (scarf) for (const k of [0, 1]) { const P = trail(add(scarf.base, [-.05, k * .06]), 4, (spec.scarf.len || 1.2) / 4 * (k ? .85 : 1), 1.1, k * 2); M.shape(ctx, w(ribbon(P, .13, .09)), { fill: shade(scarf.col, k ? -.12 : 0), seed: sd + 1 + k, ...H }); }
  if (spec.tail && spec.tail.kind !== 'none') {
    const tl = spec.tail, base = add(J.hip, [-.42, -.08]), n = 4, P = [base]; let a = Math.PI - .35 + (1 - vs) * .5 + acc * .4;
    for (let i = 0; i < n; i++) { a += .12 + Math.sin(t * 2.2 + i) * .05; P.push(add(P[i], pol(a, (tl.len || 1.2) / n))); }
    if (tl.kind === 'feathers') M.shape(ctx, w([add(base, [0, -.1]), add(P[n], [0, -.08]), add(P[n], [0, .1]), add(base, [0, .14])]), { fill: tl.col || spec.body, seed: sd + 3, ...H, smooth: false });
    else { const prof = [.16, .4, .5, .42, .06]; M.shape(ctx, w(ribbonW(P, prof)), { fill: tl.col || spec.body, seed: sd + 3, ...H }); if (tl.tip) { const q = [lerpP(P[3], P[4], .35), lerpP(P[3], P[4], .7), P[4]]; M.shape(ctx, w(ribbonW(q, [.36, .26, .06])), { fill: tl.tip, seed: sd + 4, ...H }); } }
  }
  // 2 · far arm, far leg + crank (behind the frame)
  const drawArm = (side) => {
    const a = J.arms[side], c = spec.arm?.col || spec.body, dk = side === 'far' ? -.12 : 0;
    if (spec.kind === 'bird') {   // a wing from the shoulder to the hand, scalloped along its trailing edge
      const sp = J.wings, tip = a.hand, root = a.sh, mid = a.elbow;
      const P = [add(root, [-.15, -.12]), add(mid, [0, -.12 - sp * .1]), add(tip, [.06, -.04]), add(tip, [-.04, .08]), ...Array.from({ length: 5 }, (_, i) => { const k = 1 - (i + 1) / 6; return add([lerp(root[0] - .1, tip[0], k), lerp(root[1] + .2, tip[1], k)], [0, .1 + .08 * (i % 2)]); }), add(root, [-.2, .16])];
      M.shape(ctx, w(P), { fill: shade(c, dk), seed: sd + 10 + (side === 'far' ? 0 : 1), ...H });
      return;
    }
    M.shape(ctx, w(capsule(a.sh, a.elbow, .12, .1)), { fill: shade(spec.arm?.sleeve || c, dk), seed: sd + 11, ...H });
    M.shape(ctx, w(capsule(a.elbow, a.hand, .1, .08)), { fill: shade(spec.arm?.sleeve || c, dk), seed: sd + 12, ...H });
    M.shape(ctx, w(ellipse(a.hand[0], a.hand[1], .1, .09, 10)), { fill: shade(spec.arm?.hand || c, dk), seed: sd + 13, ...H });
  };
  const drawLeg = (side) => {
    const l = J.legs[side], c = spec.legs?.col || spec.body, dk = side === 'far' ? -.14 : 0, pedal = l.pedal;
    // crank arm and pedal of this side
    M.line(ctx, w([B.bb, pedal]), { col: col.metal, w: r(.07), seed: sd + 20, role: 'hero' });
    M.shape(ctx, w([add(pedal, [-.14, -.03]), add(pedal, [.14, -.03]), add(pedal, [.14, .04]), add(pedal, [-.14, .04])]), { fill: '#3a3936', seed: sd + 21, smooth: false, lw: 1.6, ...H });
    if (spec.legs?.thin) {   // bird legs: thin, a webbed foot
      M.line(ctx, w([J.hip, l.knee, l.ank]), { col: shade(c, dk), w: r(.06), seed: sd + 22, role: 'hero', smooth: false });
      M.shape(ctx, w([add(l.ank, [-.04, -.02]), add(l.toe, [.06, -.06]), add(l.toe, [.08, .03]), add(l.heel, [0, .02])]), { fill: shade(c, dk), seed: sd + 23, ...H, smooth: false });
      return;
    }
    M.shape(ctx, w(capsule(J.hip, l.knee, .17, .13)), { fill: shade(spec.legs?.trousers || c, dk), seed: sd + 24, ...H });
    M.shape(ctx, w(capsule(l.knee, l.ank, .12, .09)), { fill: shade(spec.legs?.trousers || c, dk), seed: sd + 25, ...H });
    M.shape(ctx, w([add(l.heel, [-.04, -.1]), add(l.ank, [.06, -.08]), add(l.toe, [0, -.08]), add(l.toe, [.06, .02]), add(l.heel, [-.04, .04])]), { fill: shade(spec.legs?.shoe || '#2d2a27', dk), seed: sd + 26, ...H });
  };
  drawArm('far');
  drawLeg('far');
  // 3 · the bicycle
  const wheel = (cx) => {
    const ring = ellipse(cx, 0, .93, .93, 32), hub = [cx, 0];
    for (let i = 0; i < 8; i++) { const a = (st.wheel || 0) + i / 8 * TAU; M.line(ctx, w([hub, add(hub, pol(a, .9))]), { col: col.metal, w: 1.4, seed: sd + 30 + i, a: .8, role: 'hero' }); }
    M.line(ctx, w(ring), { col: col.tyre, w: r(.1), closed: true, seed: sd + 40 + cx, role: 'hero' });
    M.line(ctx, w(ellipse(cx, 0, .83, .83, 28)), { col: col.metal, w: r(.03), closed: true, seed: sd + 41 + cx, role: 'hero' });
    M.shape(ctx, w(ellipse(cx, 0, .08, .08, 10)), { fill: col.metal, seed: sd + 42, lw: 1.4, ...H });
    const v = add(hub, pol((st.wheel || 0) + .3, .86)); M.shape(ctx, w(ellipse(v[0], v[1], .04, .04, 6)), { fill: '#d9d4c8', seed: sd + 43, line: false, ...H });   // the valve: you can see the wheel turn
  };
  const ringNear = f < 0;   // the chainring is on the bike's right: in front only when the rider faces left
  const chainring = () => { M.shape(ctx, w(ellipse(B.bb[0], B.bb[1], B.ring, B.ring, 18)), { fill: col.metal, seed: sd + 50, lw: 1.6, ...H }); M.line(ctx, w([add(B.bb, [0, -B.ring]), [0, -.1], [0, .1], add(B.bb, [0, B.ring])]), { col: '#44423e', w: 1.6, seed: sd + 51, smooth: false, role: 'hero' }); };
  wheel(0); wheel(B.wb);
  if (!ringNear) chainring();
  const tube = (a, b, k = .085) => M.line(ctx, w([a, b]), { col: col.frame, w: r(k), seed: sd + 60 + a[0] * 10 + b[0], role: 'hero' });
  tube([0, 0], B.bb); tube([0, 0], add(B.saddle, [.04, .14])); tube(B.bb, add(B.saddle, [0, .12]));
  if (bk.frame === 'step') tube(B.bb, B.htB, .1); else { tube(add(B.saddle, [0, .2]), B.htT); tube(B.bb, B.htB, .095); }
  tube(B.htB, B.htT, .1); tube(B.htB, [B.wb, 0], .075);
  M.line(ctx, w([B.htT, B.bar, B.grip]), { col: col.metal, w: r(.07), seed: sd + 70, role: 'hero' });
  M.shape(ctx, w([add(B.saddle, [-.26, -.06]), add(B.saddle, [.22, -.08]), add(B.saddle, [.26, 0]), add(B.saddle, [-.2, .06])]), { fill: col.saddle, seed: sd + 71, ...H });
  if (bk.basket) {   // a front basket and whatever the story puts in it
    const b0 = add(B.bar, [.08, .16]); M.shape(ctx, w([b0, add(b0, [.62, 0]), add(b0, [.56, .44]), add(b0, [.06, .44])]), { fill: bk.basket, seed: sd + 72, smooth: false, lw: 2, ...H });
    for (let i = 1; i < 4; i++) M.line(ctx, w([add(b0, [i * .155, .02]), add(b0, [i * .14 + .02, .42])]), { col: shade(bk.basket, -.35), w: 1.4, seed: sd + 73 + i, role: 'hero' });
    if (spec.cargo) spec.cargo(ctx, M, W, add(b0, [.31, 0]), st, J);
  }
  if (ringNear) chainring();
  // 4 · body
  const br = 1 + .018 * J.breath, mid = [(J.hip[0] + J.sh[0]) / 2, (J.hip[1] + J.sh[1]) / 2], torsoL = Math.hypot(J.sh[0] - J.hip[0], J.sh[1] - J.hip[1]);
  const ang = Math.atan2(J.sh[1] - J.hip[1], J.sh[0] - J.hip[0]), girth = (spec.girth || .55) * br;
  M.shape(ctx, w(ellipse(mid[0], mid[1], torsoL * .62, girth, 26, ang)), { fill: spec.coat || spec.body, seed: sd + 80, ...H, dir: ang + Math.PI / 2 });
  // the chest / belly is on the FRONT (the side the face points to); a pack sits on the back
  if (spec.belly) M.shape(ctx, w(ellipse(mid[0] + Math.cos(ang + Math.PI / 2) * girth * .38, mid[1] + Math.sin(ang + Math.PI / 2) * girth * .38, torsoL * .45, girth * .55, 20, ang)), { fill: spec.belly, seed: sd + 81, line: false, ...H });
  if (spec.pack) M.shape(ctx, w(ellipse(mid[0] - Math.cos(ang + Math.PI / 2) * girth * .9, mid[1] - Math.sin(ang + Math.PI / 2) * girth * .9, torsoL * .36, girth * .45, 16, ang)), { fill: spec.pack, seed: sd + 82, ...H });
  // 5 · near leg + crank, near arm
  drawLeg('near');
  drawArm('near');
  // 6 · head
  drawHead(ctx, M, spec, J, w, sd, H, st, scarf);
  if (spec.extra) spec.extra(ctx, M, W, J, st);
  return J;
}

function drawHead(ctx, M, spec, J, w, sd, H, st, scarf) {
  const h = spec.head || .5, c = J.hd, p = J.pitch, kind = spec.kind || 'snout', t = st.t || 0;
  const rot = (pt) => { const dx = pt[0] - c[0], dy = pt[1] - c[1], cs = Math.cos(p * .9), sn = Math.sin(p * .9); return [c[0] + dx * cs - dy * sn, c[1] + dx * sn + dy * cs]; };
  const R = pts => w(pts.map(rot)), mood = J.mood, eyes = J.blink ? 'closed' : mood.eyes, tilt = mood.tilt || 0;
  const fur = spec.headCol || spec.body;
  // scarf wrap at the neck
  if (scarf) M.shape(ctx, w(ellipse(c[0] - .04, c[1] + h * .95, h * .62, h * .26, 16, -.15)), { fill: scarf.col, seed: sd + 90, ...H });
  if (kind === 'snout' && spec.ears !== 'none') {   // far ear first, behind the head
    const ear = (dx, k, dk) => { const b = [c[0] + dx * h, c[1] - h * .7], lag = (st.acc || 0) * .15 + Math.sin(t * 1.7) * .02 * (hash(Math.floor(t * .8), 3) > .85 ? 4 : 0);
      if (spec.ears === 'round') return M.shape(ctx, R(ellipse(b[0], b[1] - h * .15, h * .26 * k, h * .26 * k, 12)), { fill: shade(fur, dk), seed: sd + 91 + dx, ...H });
      const L = spec.ears === 'long' ? h * 1.4 : h * .62; M.shape(ctx, R([[b[0] - h * .2 * k, b[1] + h * .1], [b[0] - h * .1 - lag * h, b[1] - L * k], [b[0] + h * .22 * k, b[1] + h * .05]]), { fill: shade(fur, dk), seed: sd + 91 + dx, ...H });
      if (spec.earIn) M.shape(ctx, R([[b[0] - h * .08 * k, b[1] + h * .02], [b[0] - h * .08 - lag * h, b[1] - L * k * .7], [b[0] + h * .1 * k, b[1]]]), { fill: spec.earIn, seed: sd + 93 + dx, line: false, ...H }); };
    ear(.05, .9, -.15); ear(-.28, 1, 0);
  }
  if (kind === 'human' && spec.hair) M.shape(ctx, R(ellipse(c[0] - h * .2, c[1] - h * .1, h * 1.02, h * .98, 18)), { fill: spec.hair, seed: sd + 94, ...H });
  M.shape(ctx, R(ellipse(c[0], c[1], h, h * .94, 22, tilt)), { fill: fur, seed: sd + 95, ...H });
  const eye = [c[0] + h * .32, c[1] - h * .22];
  if (kind === 'bird') {   // a bill: upper mandible to the tip; a throat pouch that opens with the mouth (spec.beak = length, ×R)
    const L = (spec.beak || 1) , m = J.mouth * .35, bc = spec.beakCol || '#e8a53a';
    const up = [[c[0] + h * .55, c[1] - h * .3], [c[0] + h * .9 + L * .5, c[1] - h * .18], [c[0] + h * .7 + L, c[1] + h * .02], [c[0] + h * .7 + L - .06, c[1] + h * .12], [c[0] + h * .6, c[1] + h * .12]];
    if (spec.pouch) M.shape(ctx, R([[c[0] + h * .55, c[1] + h * .1], [c[0] + h * .7 + L - .1, c[1] + h * .14 + m * .3], [c[0] + h * .2 + L * .6, c[1] + h * .55 + m + .1 * Math.sin(t * 2)], [c[0] + h * .2, c[1] + h * .55]]), { fill: spec.pouch, seed: sd + 96, ...H });
    else M.shape(ctx, R([[c[0] + h * .6, c[1] + h * .12], [c[0] + h * .7 + L - .06, c[1] + h * .14 + m * .4], [c[0] + h * .6, c[1] + h * .28 + m * .2]]), { fill: shade(bc, -.1), seed: sd + 96, ...H, smooth: false });
    M.shape(ctx, R(up), { fill: bc, seed: sd + 97, ...H });
    if (spec.crest) M.shape(ctx, R([[c[0] - h * .2, c[1] - h * .85], [c[0] - h * .55, c[1] - h * 1.35 - .05 * Math.sin(t * 3)], [c[0] - h * .05, c[1] - h * .95], [c[0] - h * .1, c[1] - h * 1.4], [c[0] + h * .2, c[1] - h * .9]]), { fill: spec.crest, seed: sd + 98, ...H, smooth: false });
  } else if (kind === 'snout') {
    const L = spec.snout || .5, sc = spec.snoutCol || fur;
    M.shape(ctx, R([[c[0] + h * .4, c[1] - h * .35], [c[0] + h * .7 + L, c[1] + h * .05], [c[0] + h * .7 + L * .9, c[1] + h * .3], [c[0] + h * .3, c[1] + h * .5]]), { fill: sc, seed: sd + 96, ...H });
    if (spec.muzzle) M.shape(ctx, R([[c[0] + h * .5, c[1] + h * .12], [c[0] + h * .7 + L * .8, c[1] + h * .2], [c[0] + h * .6 + L * .7, c[1] + h * .38], [c[0] + h * .3, c[1] + h * .48]]), { fill: spec.muzzle, seed: sd + 97, line: false, ...H });
    M.shape(ctx, R(ellipse(c[0] + h * .72 + L, c[1] + h * .08, h * .13, h * .11, 10)), { fill: spec.nose || '#1f1b18', seed: sd + 98, lw: 1.4, ...H });
    const mx = c[0] + h * .55 + L * .6, my = c[1] + h * .34;
    const mouth = mood.mouth, mo = J.mouth;
    if (mo > .3 || mouth === 'o') M.shape(ctx, R(ellipse(mx, my, h * .08, h * (.05 + mo * .07), 8)), { fill: '#5a2a24', seed: sd + 99, lw: 1.4, ...H });
    else M.line(ctx, R(mouth === 'frown' ? arc(mx, my + h * .1, h * .14, Math.PI * 1.2, Math.PI * 1.8, 6) : mouth === 'flat' ? [[mx - h * .12, my], [mx + h * .1, my]] : arc(mx, my - h * .06, h * .14, Math.PI * .2, Math.PI * .8, 6)), { w: 2, seed: sd + 99 });
  } else {   // human: a nose bump, a mouth
    M.shape(ctx, R([[c[0] + h * .9, c[1] - h * .1], [c[0] + h * 1.15, c[1] + h * .15], [c[0] + h * .92, c[1] + h * .22]]), { fill: fur, seed: sd + 96, ...H });
    const mx = c[0] + h * .7, my = c[1] + h * .45;
    M.line(ctx, R(mood.mouth === 'frown' ? arc(mx, my + h * .1, h * .14, Math.PI * 1.2, Math.PI * 1.8, 6) : arc(mx, my - h * .08, h * .14, Math.PI * .2, Math.PI * .8, 6)), { w: 2, seed: sd + 99 });
  }
  // the eye (the far eye is hidden in profile) and a brow that acts
  const er = h * (eyes === 'wide' ? .2 : .15);
  if (eyes === 'closed' || eyes === 'soft' && J.blink) M.line(ctx, R([[eye[0] - er, eye[1]], [eye[0] + er, eye[1] + er * .2]]), { w: 2.2, seed: sd + 100 });
  else if (eyes === 'happy') M.line(ctx, R(arc(eye[0], eye[1] + er * .5, er, Math.PI * 1.15, Math.PI * 1.85, 6)), { w: 2.6, seed: sd + 100 });
  else {
    if (spec.eyeWhite !== false) M.shape(ctx, R(ellipse(eye[0], eye[1], er * 1.3, er * 1.35, 12)), { fill: '#fbf8ef', seed: sd + 100, lw: 1.4, ...H });
    const look = eyes === 'wide' || J.pitch < -.3 ? -er * .35 : 0;
    M.shape(ctx, R(ellipse(eye[0] + er * .3, eye[1] + look, er * .7, er * (eyes === 'soft' ? .45 : .8), 10)), { fill: spec.eye || '#1d1a17', seed: sd + 101, line: false, ...H });
    if (eyes === 'sad') M.line(ctx, R([[eye[0] - er * 1.2, eye[1] - er * 1.4], [eye[0] + er * 1.4, eye[1] - er * 2.2]]), { w: 2.4, seed: sd + 102 });
    if (eyes === 'determined') M.line(ctx, R([[eye[0] - er * 1.3, eye[1] - er * 2.2], [eye[0] + er * 1.4, eye[1] - er * 1.2]]), { w: 3, seed: sd + 102 });
  }
  if (spec.hat?.kind === 'beanie') { M.shape(ctx, R([...arc(c[0] - h * .05, c[1] - h * .25, h * .98, Math.PI * 1.05, Math.PI * 1.98, 12)]), { fill: spec.hat.col, seed: sd + 103, ...H }); M.shape(ctx, R(ellipse(c[0] - h * .45, c[1] - h * 1.12, h * .2, h * .2, 10)), { fill: spec.hat.pom || shade(spec.hat.col, .2), seed: sd + 104, ...H }); }
  if (spec.hat?.kind === 'cap') { M.shape(ctx, R([...arc(c[0], c[1] - h * .3, h * .9, Math.PI * 1.08, Math.PI * 1.95, 10)]), { fill: spec.hat.col, seed: sd + 103, ...H }); M.shape(ctx, R([[c[0] + h * .6, c[1] - h * .62], [c[0] + h * 1.35, c[1] - h * .5], [c[0] + h * .7, c[1] - h * .42]]), { fill: shade(spec.hat.col, -.15), seed: sd + 104, ...H, smooth: false }); }
}

export const geometry = BIKE;

// 「The Keeper's Whale」 · whale.js — the giant and the props this topic needs, drawn in the same pencil as the kit:
// loose double lines that overshoot, spot-colour fills coloured in, a paper knock-out so the whale hides what is behind it.
//   whale(t, o)       a humpback breaching out of the horizon, built along a spine (bezier) with a thickness profile
//   lighthouse(x, y)  a striped tower on a rock (stripes in the spot colour)
//   boat(x, y, s)     the keeper's first mark: a little coral boat
//   rock(x, y, w)     the rock he stands on
import * as S from '../../lib/pencil.js';
const { line, fill, part, hand, curve, arc, ellipse, bez, clamp, lerp, smooth01, span, rng } = S;

const L = (pts, w = 3, seed = 1, o = {}) => line(hand(pts, o.amp ?? 3, seed, o.over ?? 10), { w, passes: o.passes ?? 2, a: o.a ?? .92, seed: seed * 17 + 5 });

/** the whale at time t. o: { eye: 0…1 open, blink: 0…1, flip: radians (flipper wave), smile: 0…1, spout: 0…1 } */
export function whale(o = {}) {
  const A = [-1100, 520], B = [-1080, -20], C = [-640, -480], D = [-70, -610];
  const N = 40, spine = bez(A, B, C, D, N);
  const th = s => 150 + 330 * smooth01(s / .55) - 40 * smooth01((s - .9) / .1);
  const at = s => { const i = clamp(s * N, 0, N - 1e-6), k = Math.floor(i), f = i - k, p = [lerp(spine[k][0], spine[Math.min(N, k + 1)][0], f), lerp(spine[k][1], spine[Math.min(N, k + 1)][1], f)]; const a = spine[Math.max(0, k - 1)], b = spine[Math.min(N, k + 2)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = [(b[0] - a[0]) / d, (b[1] - a[1]) / d]; return { p, t, n: [t[1], -t[0]] }; };
  const off = (s, k) => { const q = at(s), w = th(s) / 2 * k; return [q.p[0] + q.n[0] * w, q.p[1] + q.n[1] * w]; };
  const back = [], belly = [];
  for (let i = 0; i <= 30; i++) { const s = i / 30; back.push(off(s, 1)); belly.push(off(s, -1)); }
  // the blunt head: a cap around the snout
  const sn = at(1), r0 = th(1) / 2, a0 = Math.atan2(sn.n[1], sn.n[0]), cap = arc(sn.p[0], sn.p[1], r0, r0 * .92, a0, a0 + Math.PI, 14, 0).map(([x, y]) => [x + sn.t[0] * r0 * .25, y + sn.t[1] * r0 * .25]);
  const body = [...back, ...cap.slice(1, -1), ...belly.slice().reverse()];
  const parts = [part([L(back, 4.2, 1, { over: 30 }), L(cap, 3.6, 2, { over: 6 }), L(belly.slice().reverse(), 3.6, 3, { over: 20 })], body)];
  // flipper (humpback: long, knobbly leading edge) — waves with o.flip
  const fb = off(.66, -.75), fa = .6 + (o.flip || 0), fl = 560, fw = 120, fd = [Math.cos(fa), Math.sin(fa)], fn = [-fd[1], fd[0]];
  const edge = [], trail = [];
  for (let i = 0; i <= 12; i++) { const k = i / 12, w = fw * Math.sin(Math.PI * Math.min(1, k * 1.1 + .05)) * (1 - k * .35), bump = i % 3 === 1 ? 14 : 0; const p = [fb[0] + fd[0] * fl * k, fb[1] + fd[1] * fl * k]; edge.push([p[0] - fn[0] * (w * .55 + bump), p[1] - fn[1] * (w * .55 + bump)]); trail.push([p[0] + fn[0] * w * .45, p[1] + fn[1] * w * .45]); }
  const flipper = [...edge, ...trail.reverse()];
  parts.push(part([L(curve(flipper, 3), 3, 9, { over: 6 })], flipper));
  // throat grooves along the belly, barnacle doodles on the snout
  const ops = [];
  for (let j = 0; j < 5; j++) { const k = -.2 - j * .065, g = []; for (let i = 0; i <= 16; i++) g.push(off(lerp(.62 + j * .02, .97 - j * .015, i / 16), k)); ops.push(L(g, 1.6, 20 + j, { passes: 1, a: .7, over: 6 })); }
  const rb = rng(7); for (let i = 0; i < 7; i++) { const s = .86 + rb() * .12, k = .25 + rb() * .55, p = off(s, k); ops.push(L(ellipse(p[0], p[1], 9 + rb() * 9, 7 + rb() * 6, rb(), 8), 1.3, 30 + i, { passes: 1, over: 0, amp: 1 })); }
  // dorsal hump
  const h0 = off(.32, 1), h1 = off(.4, 1.25), h2 = off(.46, 1); ops.push(L(curve([h0, h1, h2], 6), 3, 40, { over: 4 }));
  // eye: a lid line, then the coral iris coloured in as it opens
  const eye = off(.86, -.12), eo = clamp((o.eye ?? 1) * (1 - (o.blink || 0))), er = 34;
  ops.push(L(arc(eye[0], eye[1] - 2, er * 1.25, er * .9, Math.PI * 1.05, Math.PI * 1.95, 10), 2.6, 41, { over: 4, passes: 1 }));
  ops.push(L(ellipse(eye[0], eye[1], er, Math.max(2, er * .95 * eo), -.5, 18), 2.4, 42, { passes: 1, over: 2, amp: 1 }));
  ops.push(fill(ellipse(eye[0] + 3, eye[1] + 2, er * .72, Math.max(1.5, er * .7 * eo), -.5, 14), { gap: 6, a: .95 }));
  ops.push(fill(ellipse(eye[0] + 8, eye[1] + 4, er * .3, Math.max(1, er * .3 * eo), 0, 10), { col: 'lead', gap: 4, edge: false }));
  // mouth: a long line from under the snout back toward the eye, turning up into a smile
  const sm = o.smile ?? .5, m0 = off(.995, -.3), m1 = off(.9, -.42), m2 = off(.8, -.38 + .12 * sm), m3 = off(.76, -.25 + .2 * sm);
  ops.push(L(curve([[m0[0] + sn.t[0] * 60, m0[1] + sn.t[1] * 60], m1, m2, m3], 8), 2.8, 43, { over: 6 }));
  parts.push(part(ops));
  return parts;
}
/** where things are on the whale (for the swarm and the camera) */
export const WHALE = { centre: [-620, -180], spout: [-430, -720], eye: [-210, -470] };
/** the spout: a fan of spray lines from the blowhole, drawn on when the whale blows */
export function spout(k = 1) {
  const [x, y] = WHALE.spout, ops = [];
  for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * .16, l = 260 + (i % 3) * 70; ops.push(L(curve([[x, y + 40], [x + Math.cos(a) * l * .5, y + Math.sin(a) * l * .55], [x + Math.cos(a) * l + (i - 4) * 18, y + Math.sin(a) * l * .9 + l * .15]], 6), 1.8, 60 + i, { passes: 1, over: 4 })); }
  return [part(ops)];
}
export function lighthouse(x, y, h = 560) {
  const w0 = 70, w1 = 46, top = y - h, ops = [], body = [[x - w0, y], [x - w1, top], [x + w1, top], [x + w0, y]];
  for (let i = 0; i < 3; i++) { const k0 = .14 + i * .28, k1 = k0 + .14, yy0 = lerp(y, top, k0), yy1 = lerp(y, top, k1), wa = lerp(w0, w1, k0), wb = lerp(w0, w1, k1); ops.push(fill([[x - wa, yy0], [x - wb, yy1], [x + wb, yy1], [x + wa, yy0]], { gap: 8, angle: -.5 })); }
  ops.push(L(body, 2.6, 70, { over: 8 }));
  for (let i = 0; i < 6; i++) { const yy = lerp(y, top, (i + 1) / 7); ops.push(L([[x - lerp(w0, w1, (i + 1) / 7), yy], [x + lerp(w0, w1, (i + 1) / 7), yy]], 1.1, 71 + i, { passes: 1, a: .5, over: 2 })); }
  ops.push(L([[x - 14, y], [x - 14, y - 60], [x + 14, y - 60], [x + 14, y]], 1.8, 78, { over: 2 }));
  // gallery, lantern, dome
  ops.push(L([[x - w1 - 18, top], [x + w1 + 18, top]], 2.4, 79), L([[x - w1 - 14, top - 22], [x + w1 + 14, top - 22]], 1.4, 80, { passes: 1 }));
  for (let i = -2; i <= 2; i++) ops.push(L([[x + i * 15, top], [x + i * 15, top - 22]], 1, 81 + i, { passes: 1, over: 0 }));
  ops.push(L([[x - 30, top - 22], [x - 30, top - 80], [x + 30, top - 80], [x + 30, top - 22]], 2, 86), L([[x, top - 22], [x, top - 80]], 1.1, 87, { passes: 1 }));
  ops.push(fill([[x - 38, top - 80], [x, top - 130], [x + 38, top - 80]], { gap: 7 }), L([[x - 42, top - 80], [x, top - 132], [x + 42, top - 80]], 2.4, 88), L([[x, top - 132], [x, top - 160]], 1.6, 89));
  return [part(ops, [...body, [x + 42, top - 80], [x, top - 160], [x - 42, top - 80]])];
}
/** the lighthouse beam: two long faint rays sweeping slowly (a live mark) */
export function beam(x, y, a) { const ops = []; for (const da of [-.06, .06]) ops.push(line(hand([[x, y], [x + Math.cos(a + da) * 900, y + Math.sin(a + da) * 900]], 2, 90, 0), { w: 1.2, a: .45, passes: 1 })); return [part(ops)]; }
export function boat(x, y, s = 1) {
  const hull = [[x - 24 * s, y - 8 * s], [x + 26 * s, y - 8 * s], [x + 16 * s, y + 5 * s], [x - 16 * s, y + 5 * s]], sail = [[x + 2 * s, y - 13 * s], [x + 2 * s, y - 56 * s], [x + 24 * s, y - 13 * s]];
  return [part([L(hull.concat([hull[0]]), 2, 101, { amp: 1, over: 3 }), fill(hull, { gap: 3 * s }), L([[x, y - 8 * s], [x, y - 64 * s]], 1.8, 102, { amp: .8, over: 2 }),
    L(sail.concat([sail[0]]), 1.8, 103, { amp: .8, over: 2 }), fill(sail, { gap: 3 * s, angle: .9 }), L([[x, y - 64 * s], [x - 12 * s, y - 60 * s], [x, y - 56 * s]], 1.4, 104, { amp: .6, over: 0, passes: 1 })], [...hull, ...sail])];
}
export function rock(x, y, w = 200) {
  const r = rng(x), pts = []; for (let i = 0; i <= 10; i++) { const k = i / 10; pts.push([x - w / 2 + w * k, y + 4 - Math.sin(Math.PI * k) * 26 * (.8 + r() * .4)]); }
  const top = curve(pts, 4), body = [...top, [x + w / 2 + 20, y + 120], [x - w / 2 - 20, y + 120]];
  return [part([L(top, 2.4, 110, { amp: 2, over: 8 }), L([[x - w / 2, y + 4], [x - w / 2 - 20, y + 110]], 2, 111, { amp: 2 }), L([[x + w / 2, y + 4], [x + w / 2 + 20, y + 110]], 2, 112, { amp: 2 }), ...S.hatch([[x - w * .45, y + 10], [x + w * .45, y + 10], [x + w * .5, y + 100], [x - w * .5, y + 100]], { angle: .8, gap: 12, w: 1.1, a: .5, seed: 113 })], body)];
}

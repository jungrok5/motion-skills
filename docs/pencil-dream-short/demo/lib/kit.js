// pencil-dream-short · kit.js — marks for the world the hero draws, as parts (world units), plus the swarm.
// Every builder returns an array of parts [{ knock, ops }] and takes a seed, so the same call always draws the same doodle.
// These are EXAMPLES of the style's vocabulary — draw what the topic needs in the same hand (S.stroke / S.line / S.fill /
// S.hatch with the same loose double lines, overshoot and spot-colour fills); the giant is always designed per topic.
//
//   flower(x, y, s, o)  house(x, y, s, o)  tree(x, y, s, o: kind 'bare' | 'round' | 'pine' | 'poplar')  bush(x, y, s)
//   hill(x0, x1, y, h, o)  ground(x0, x1, y, o)  fence(x0, x1, y, s)  grass(x, y, s)  bird(x, y, s)  cloud(x, y, s)
//   wave(x0, x1, y, amp, o)  sun(x, y, r, o)  star(x, y, r, o)  glyph('?' | '!' | '*' | '♪', x, y, s)  rays(x, y, r, n)
//   swarm shapes: butterfly · fish · petal · star · leaf · ember  (swarmParts drives them; see Film.swarm)
import { TAU, clamp, lerp, hash, n1, rng, curve, arc, ellipse, hand, line, fill, part, hatch, bez, tf, ease } from './pencil.js';

const L = (pts, o = {}) => line(hand(pts, o.amp ?? 1.4, o.seed ?? 1, o.over ?? 3), { w: o.w ?? 2.2, a: o.a ?? .92, passes: o.passes ?? 2, col: o.col, taper: o.taper, seed: Math.round((o.seed ?? 1) * 1000) });
const C = (ctrl, o = {}) => L(curve(ctrl, o.n ?? 8, o.closed), o);

/** a flower: stem, 5–7 spot petals coloured in, a graphite centre and outline, one leaf */
export function flower(x, y, s = 40, o = {}) {
  const r = rng(o.seed ?? (x * 3 + y)), n = o.petals ?? 5 + Math.floor(r() * 2), hx = x + (r() - .5) * s * .3, hy = y - s * (o.stem ?? 1.1), pr = s * .34, rot = r() * TAU;
  const ops = [C([[x, y], [x + (hx - x) * .3 + s * .06, lerp(y, hy, .5)], [hx, hy + pr * .6]], { seed: r() * 99, w: 1.6, over: 1 })];
  if (o.leaf !== false) { const ly = lerp(y, hy, .45), sd = r() > .5 ? 1 : -1; ops.push(C([[x + sd * s * .02, ly], [x + sd * s * .25, ly - s * .18], [x + sd * s * .4, ly - s * .12], [x + sd * s * .2, ly + s * .02], [x + sd * s * .02, ly]], { seed: r() * 99, w: 1.4, over: 0, passes: 1 })); }
  const petals = [], outl = [];
  for (let i = 0; i < n; i++) {
    const a = rot + i / n * TAU, c = [hx + Math.cos(a) * pr * .85, hy + Math.sin(a) * pr * .85], pe = ellipse(c[0], c[1], pr * .62, pr * .38, a, 12);
    petals.push(fill(pe, { gap: pr * .16, angle: a + .4, off: [s * .02, -s * .015] }));
    outl.push(L(pe.slice(0, -2), { seed: r() * 99, w: 1.5, over: 1.5, passes: 1, a: .8 }));
  }
  const cen = ellipse(hx, hy, pr * .3, pr * .28, 0, 10);
  return [part(ops), part([...outl, ...petals, fill(cen, { col: 'lead', gap: pr * .1, a: .75, edge: false }), L(cen, { seed: 5, w: 1.4, over: 0, passes: 1 })], ellipse(hx, hy, pr * 1.45, pr * 1.45, 0, 14))];
}
/** a little house: walls, a hatched roof, door, window, chimney with a curl of smoke */
export function house(x, y, s = 120, o = {}) {
  const r = rng(o.seed ?? x + y), w = s * (o.w ?? 1), h = s * (o.h ?? .7), rh = s * (o.roof ?? .55), x0 = x - w / 2, x1 = x + w / 2, top = y - h, peak = [x + (r() - .5) * w * .1, top - rh];
  const wall = [[x0, y], [x0, top], [x1, top], [x1, y]], roof = [[x0 - w * .08, top + 2], peak, [x1 + w * .08, top + 2]];
  const sil = [[x0, y], [x0, top], [x0 - w * .08, top], peak, [x1 + w * .08, top], [x1, top], [x1, y]];
  const ops = [L(wall, { seed: r() * 99, over: 4 }), L(roof, { seed: r() * 99, over: 5, w: 2.2 }), L([[x0 - 3, y], [x1 + 3, y]], { seed: r() * 99, w: 1.6 })];
  ops.push(...hatch([[x0 - w * .02, top - 2], peak, [x1 + w * .02, top - 2]], { angle: .9, gap: s * .05, w: 1.1, a: .6, seed: r() * 99 }));
  const dx = x + w * (r() > .5 ? .2 : -.2); ops.push(L([[dx - w * .1, y], [dx - w * .1, y - h * .55], [dx + w * .1, y - h * .55], [dx + w * .1, y]], { seed: r() * 99, w: 1.6, over: 2 }));
  const wx = x - (dx - x) * 1.1, wy = y - h * .62; ops.push(L([[wx - w * .1, wy], [wx + w * .1, wy], [wx + w * .1, wy + h * .26], [wx - w * .1, wy + h * .26], [wx - w * .1, wy]], { seed: r() * 99, w: 1.4, over: 1 }), L([[wx, wy], [wx, wy + h * .26]], { seed: r() * 99, w: 1, passes: 1 }));
  if (o.chimney !== false) { const cx = lerp(peak[0], x1, .55), cy = lerp(peak[1], top, .55); ops.push(L([[cx - w * .05, cy + 2], [cx - w * .05, cy - s * .22], [cx + w * .06, cy - s * .22], [cx + w * .06, cy - s * .06]], { seed: r() * 99, w: 1.5 }), C([[cx, cy - s * .27], [cx + s * .1, cy - s * .4], [cx - s * .02, cy - s * .5], [cx + s * .12, cy - s * .62]], { seed: r() * 99, w: 1.1, passes: 1, a: .6 })); }
  if (o.spot) ops.push(fill([[dx - w * .1, y], [dx - w * .1, y - h * .55], [dx + w * .1, y - h * .55], [dx + w * .1, y]], { gap: s * .03 }));
  return [part(ops, sil)];
}
/** a tree. kind: 'bare' (branching), 'round' (loopy canopy), 'pine', 'poplar' */
export function tree(x, y, s = 160, o = {}) {
  const r = rng(o.seed ?? x * 7 + y), kind = o.kind || 'round', ops = [];
  if (kind === 'bare') {
    const br = (p, a, l, d) => { if (d > (o.depth ?? 4) || l < s * .04) return; const q = [p[0] + Math.sin(a) * l, p[1] - Math.cos(a) * l]; ops.push(C([p, [lerp(p[0], q[0], .5) + (r() - .5) * l * .15, lerp(p[1], q[1], .5)], q], { seed: r() * 999, w: Math.max(.9, 2.6 - d * .45), passes: d < 2 ? 2 : 1, over: 1 })); const k = 2 + (r() > .6 ? 1 : 0); for (let i = 0; i < k; i++) br(q, a + (i - (k - 1) / 2) * (.5 + r() * .3) + (r() - .5) * .2, l * (.62 + r() * .15), d + 1); };
    ops.push(L([[x - s * .05, y], [x - s * .03, y - s * .35]], { seed: r() * 99, w: 2.4 }), L([[x + s * .05, y], [x + s * .03, y - s * .35]], { seed: r() * 99, w: 2.4 }));
    br([x, y - s * .33], 0, s * .3, 0);
    if (o.hollow) ops.push(L(ellipse(x, y - s * .15, s * .02, s * .04, 0, 8), { seed: 3, w: 1.2, passes: 1 }));
    return [part(ops, [[x - s * .07, y], [x - s * .05, y - s * .35], [x + s * .05, y - s * .35], [x + s * .07, y]])];
  }
  if (kind === 'pine') {
    const pts = []; const n = 5; for (let i = 0; i <= n; i++) { const k = i / n, w = s * .28 * (1 - k * .85); pts.push([x - w, y - s * .15 - k * s * .8], [x - w * .45, y - s * .15 - (k + .5 / n) * s * .8]); }
    const right = pts.map(([px, py]) => [2 * x - px, py]).reverse(), poly = [...pts, [x, y - s], ...right];
    ops.push(L([[x, y], [x, y - s * .18]], { seed: 2, w: 2.2 }), L(poly, { seed: r() * 99, w: 1.6, over: 1 }));
    return [part(ops, poly)];
  }
  const cw = s * (kind === 'poplar' ? .2 : .38), ch = s * (kind === 'poplar' ? .5 : .36), cy = y - s * (kind === 'poplar' ? .55 : .62);
  const blob = []; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, k = 1 + (r() - .5) * .25; blob.push([x + Math.cos(a) * cw * k, cy + Math.sin(a) * ch * k]); }
  const canopy = curve(blob, 5, true);
  ops.push(L([[x - s * .03, y], [x - s * .02, cy + ch * .6]], { seed: r() * 99, w: 2.2 }), L([[x + s * .03, y], [x + s * .025, cy + ch * .6]], { seed: r() * 99, w: 2.2 }), L(canopy, { seed: r() * 99, w: 1.8, over: 2 }));
  for (let i = 0; i < (o.loops ?? 5); i++) { const a = r() * TAU, k = r() * .6; ops.push(L(arc(x + Math.cos(a) * cw * k, cy + Math.sin(a) * ch * k, cw * .2, ch * .18, a, a + 3.5, 8), { seed: r() * 99, w: 1, passes: 1, a: .6, over: 0 })); }
  if (o.spot) ops.push(fill(canopy, { gap: s * .04, a: .5 }));
  return [part(ops, canopy)];
}
export const bush = (x, y, s = 50, o = {}) => tree(x, y + s * .55, s * 1.4, { ...o, kind: 'round', loops: 2 }).map(p => ({ ...p, ops: p.ops.slice(2) }));
/** a rolling hill line from x0 to x1 at base y, height h; knock fills down to `bottom` so what is behind is hidden */
export function hill(x0, x1, y, h, o = {}) {
  const r = rng(o.seed ?? x0 + y), n = o.bumps ?? 3, pts = [];
  for (let i = 0; i <= n * 4; i++) { const k = i / (n * 4), bump = Math.sin(k * Math.PI) * h * (.75 + .25 * Math.sin(k * n * Math.PI * 2 + r() * 6)); pts.push([lerp(x0, x1, k), y - bump]); }
  const c = curve(pts, 4), bottom = o.bottom ?? y + 2000, ops = [L(c, { seed: r() * 99, w: o.w ?? 2, over: 6 })];
  if (o.rows) for (let j = 1; j <= o.rows; j++) { const yy = j / (o.rows + 1); ops.push(L(c.map(([px, py]) => [px, lerp(py, y, yy) + h * .08 * yy]).filter((_, i) => i % 2 === 0), { seed: r() * 99, w: 1, passes: 1, a: .45, over: 0 })); }
  return [part(ops, [...c, [x1, bottom], [x0, bottom]])];
}
export const ground = (x0, x1, y, o = {}) => [part([C([[x0, y], [lerp(x0, x1, .3), y + (o.dip ?? 4)], [lerp(x0, x1, .7), y - (o.dip ?? 4)], [x1, y]], { seed: o.seed ?? 7, w: o.w ?? 2.2, over: 10 })], o.knock ? [[x0, y], [x1, y], [x1, y + 3000], [x0, y + 3000]] : null)];
export function fence(x0, x1, y, s = 40, o = {}) {
  const ops = [], n = Math.max(2, Math.round((x1 - x0) / (s * .9))), r = rng(o.seed ?? x0);
  for (let i = 0; i <= n; i++) { const px = lerp(x0, x1, i / n) + (r() - .5) * s * .1; ops.push(L([[px, y + 2], [px + (r() - .5) * 3, y - s]], { seed: r() * 99, w: 1.5, passes: 1, over: 2 })); }
  ops.push(L([[x0 - 6, y - s * .7], [x1 + 6, y - s * .72]], { seed: r() * 99, w: 1.3, passes: 1 }), L([[x0 - 6, y - s * .35], [x1 + 6, y - s * .33]], { seed: r() * 99, w: 1.3, passes: 1 }));
  return [part(ops)];
}
export function grass(x, y, s = 20, o = {}) { const r = rng(o.seed ?? x + y), ops = []; for (let i = 0; i < 4; i++) { const a = -.6 + i * .4 + (r() - .5) * .2; ops.push(L([[x + i * s * .12, y], [x + i * s * .12 + Math.sin(a) * s, y - Math.cos(a) * s]], { seed: r() * 99, w: 1.1, passes: 1, over: 0 })); } return [part(ops)]; }
export function bird(x, y, s = 20, o = {}) { const f = o.flap ?? 0; return [part([C([[x - s, y - s * (.2 + f * .3)], [x - s * .45, y - s * (.45 - f * .2)], [x, y]], { seed: o.seed ?? 1, w: 1.3, passes: 1, over: 1 }), C([[x, y], [x + s * .45, y - s * (.45 - f * .2)], [x + s, y - s * (.2 + f * .3)]], { seed: (o.seed ?? 1) + 1, w: 1.3, passes: 1, over: 1 })])]; }
export function cloud(x, y, s = 100, o = {}) {
  const r = rng(o.seed ?? x), n = o.bumps ?? 4, top = [];
  for (let i = 0; i < n; i++) { const cx = x - s + (i + .5) * s * 2 / n, rr = s / n * (1.05 + r() * .35), lift = Math.sin((i + .5) / n * Math.PI) * s * .22; top.push(...arc(cx, y - lift * .5, rr, rr * .9, Math.PI * 1.05, Math.PI * 1.95, 7)); }
  const outline = curve([[x - s * 1.12, y + s * .08], ...top.filter((_, i) => i % 2 === 0), [x + s * 1.12, y + s * .08]], 3);
  return [part([L(outline, { seed: r() * 99, w: 1.6, over: 3 }), L([[x - s * 1.05, y + s * .12], [x + s * 1.05, y + s * .1]], { seed: r() * 99, w: 1.2, passes: 1, a: .6 })], [...outline, [x + s, y + s * .12], [x - s, y + s * .12]])];
}
/** a curly sea line: crests that curl over, from x0 to x1 */
export function wave(x0, x1, y, amp = 20, o = {}) {
  const r = rng(o.seed ?? x0 + y), n = Math.max(2, Math.round((x1 - x0) / (amp * (o.len ?? 5)))), ops = [];
  for (let i = 0; i < n; i++) {
    const a = lerp(x0, x1, i / n), b = lerp(x0, x1, (i + 1) / n), m = lerp(a, b, .62), h = amp * (.7 + r() * .5);
    ops.push(C([[a, y], [lerp(a, m, .5), y - h * .25], [m, y - h], [m + h * .35, y - h * .7], [m + h * .1, y - h * .45], [b, y]], { seed: r() * 99, w: o.w ?? 1.6, passes: 1, over: 2 }));
  }
  return [part(ops, o.knock ? [[x0, y - amp * .6], [x1, y - amp * .6], [x1, y + 3000], [x0, y + 3000]] : null)];
}
export function sun(x, y, r = 80, o = {}) { const ops = [L(ellipse(x, y, r, r, 0, 28), { seed: o.seed ?? 3, w: 2, over: r * .1 })]; if (o.rays !== false) ops.push(...rays(x, y, r * 1.25, o.n ?? 12, r * .35)); if (o.spot) ops.unshift(fill(ellipse(x, y, r, r, 0, 24), { gap: r * .08 })); return [part(ops, ellipse(x, y, r, r, 0, 20))]; }
export function rays(x, y, r, n = 12, l = 30) { const ops = []; for (let i = 0; i < n; i++) { const a = i / n * TAU + .1; ops.push(L([[x + Math.cos(a) * r, y + Math.sin(a) * r], [x + Math.cos(a) * (r + l), y + Math.sin(a) * (r + l)]], { seed: 40 + i, w: 1.3, passes: 1, over: 1 })); } return ops; }
export function starShape(x, y, r, rot = 0, k = .45) { const p = []; for (let i = 0; i < 10; i++) { const a = rot - Math.PI / 2 + i / 10 * TAU, rr = i % 2 ? r * k : r; p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } return p; }
export function star(x, y, r = 20, o = {}) { const p = starShape(x, y, r, o.rot ?? 0); return [part([fill(p, { gap: r * .18 }), L([...p, p[0]], { seed: o.seed ?? 9, w: 1.2, passes: 1, over: 0, a: .7 })])]; }
/** a doodled glyph: '?', '!', '*', '♪' (the hero's thought marks) */
export function glyph(ch, x, y, s = 40, o = {}) {
  const w = o.w ?? 2.4, ops = [];
  if (ch === '?') { ops.push(C([[x - s * .3, y - s * .55], [x - s * .15, y - s * .85], [x + s * .2, y - s * .82], [x + s * .28, y - s * .5], [x, y - s * .25], [x, y]], { seed: 1, w, over: 0 })); ops.push(L(ellipse(x, y + s * .22, s * .05, s * .05, 0, 8), { seed: 2, w, over: 0, passes: 1 })); }
  if (ch === '!') { ops.push(L([[x, y - s * .85], [x - s * .03, y]], { seed: 3, w, over: 0 })); ops.push(L(ellipse(x - s * .03, y + s * .22, s * .05, s * .05, 0, 8), { seed: 4, w, over: 0, passes: 1 })); }
  if (ch === '*') for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI; ops.push(L([[x - Math.cos(a) * s * .3, y - Math.sin(a) * s * .3], [x + Math.cos(a) * s * .3, y + Math.sin(a) * s * .3]], { seed: 5 + i, w, over: 0, passes: 1 })); }
  if (ch === '♪') { ops.push(L([[x + s * .2, y - s * .8], [x + s * .2, y]], { seed: 8, w, over: 0 }), L([[x + s * .2, y - s * .8], [x + s * .5, y - s * .6]], { seed: 9, w, over: 0 })); ops.push(fill(ellipse(x + s * .05, y, s * .17, s * .12, -.4, 10), { col: 'lead', gap: s * .05, edge: false })); }
  return [part(ops)];
}

// ── the swarm ────────────────────────────────────────────────────────────────────────────────────────────────────────
/** swarm shapes in local units (size 1, heading +x), phase = flap / wiggle; each returns ops */
export const SHAPES = {
  butterfly(ph) { const f = .25 + .75 * Math.abs(Math.cos(ph)), ops = []; for (const s of [-1, 1]) { ops.push(fill(ellipse(.15, s * .42 * f, .38, .36 * f, s * .5, 10), { gap: .14, angle: .3 }), fill(ellipse(-.22, s * .3 * f, .26, .26 * f, -s * .4, 8), { gap: .14, angle: .3 })); } ops.push(line([[-.4, 0], [.35, 0]], { w: 1.1, passes: 1, a: .7 })); return ops; },
  fish(ph) { const wg = Math.sin(ph) * .35; return [fill(ellipse(0, 0, .55, .26, 0, 12), { gap: .12 }), fill([[-.45, 0], [-.9, -.3 + wg * .4], [-.85, .3 + wg * .4]], { gap: .12 }), fill(ellipse(.3, -.05, .05, .05, 0, 6), { col: 'lead', gap: .04, edge: false })]; },
  petal(ph) { return [fill(ellipse(0, 0, .5, .24 + .1 * Math.sin(ph), 0, 10), { gap: .12, angle: .8 })]; },
  star(ph) { return [fill(starShape(0, 0, .55, ph * .3), { gap: .12 })]; },
  leaf(ph) { const k = Math.cos(ph * .5); return [fill([[-.5, 0], [0, -.28 * k], [.5, 0], [0, .28 * k]], { gap: .12 }), line([[-.5, 0], [.5, 0]], { w: .9, passes: 1, a: .6 })]; },
  ember(ph) { return [fill(ellipse(0, 0, .3 + .1 * Math.sin(ph), .3, 0, 8), { gap: .1, a: .9 })]; },
};
/** place shape ops: local → world (position p, heading a, size s) */
function place(ops, p, a, s) {
  const c = Math.cos(a), n = Math.sin(a), T = pts => pts.map(([x, y]) => [p[0] + (x * c - y * n) * s, p[1] + (x * n + y * c) * s]);
  return ops.map(op => op.type === 'fill' ? { ...op, pts: T(op.pts), gap: op.gap * s, angle: op.angle + a, seed: op.seed, _zz: null } : { ...op, pts: T(op.pts) });
}
/** a swarm at t → { back: parts, front: parts }. o = { n, at, spawn (s over which they are born), from: [[x, y]…] | i => [x, y],
 *  centre: [x, y] | t => [x, y], radius: [rx, ry], spin (rad/s), rise (world/s), size, shape (name | (phase, i) => ops),
 *  flap (Hz), out: [t0, t1] (fade), seed } — particles lift off their source, then orbit the centre (in front when sin > 0) */
export function swarmParts(o, t, film) {
  const back = [], front = [], n = o.n || 60, seed = o.seed || 11, rx = o.radius?.[0] ?? 600, ry = o.radius?.[1] ?? 300, spin = o.spin ?? .7, size = o.size ?? 22;
  const shape = typeof o.shape === 'function' ? o.shape : SHAPES[o.shape || 'butterfly'], fade = o.out ? 1 - clamp((t - o.out[0]) / (o.out[1] - o.out[0])) : 1;
  if (fade <= 0) return { back, front };
  const cen = tt => typeof o.centre === 'function' ? o.centre(tt) : (o.centre || [0, 0]);
  const src = i => typeof o.from === 'function' ? o.from(i) : o.from ? o.from[i % o.from.length] : cen(o.at);
  for (let i = 0; i < n; i++) {
    const h1 = hash(i, seed, 1), h2 = hash(i, seed, 2), h3 = hash(i, seed, 3), ti = o.at + (o.spawn ?? 2) * Math.pow(i / n, .85) + h1 * .2;
    if (t < ti) continue;
    const pos = tt => {
      const a = Math.max(0, tt - ti), s0 = src(i), c = cen(tt), lift = [s0[0] + (h2 - .5) * 30, s0[1] - Math.min(a, 1.2) * (90 + h3 * 60)];
      const th = h1 * TAU + spin * (.75 + h2 * .5) * a * (h3 > .2 ? 1 : -1), R = [rx * (.45 + .65 * h2), ry * (.4 + .7 * h3)];
      const orb = [c[0] + Math.cos(th) * R[0], c[1] - (o.rise ?? 20) * a + Math.sin(th) * R[1] * .35 + (h1 - .5) * ry * 1.2 + n1(a * .8, i) * 30];
      const k = ease.inOut(a / (o.blend ?? 2.2));
      return { p: [lerp(lift[0], orb[0], k), lerp(lift[1], orb[1], k)], depth: Math.sin(th) * k };
    };
    const A = pos(t), B = pos(t - .04), head = Math.atan2(A.p[1] - B.p[1], A.p[0] - B.p[0]);
    const age = t - ti, born = clamp(age / .25), sz = size * (.7 + .6 * h3) * (1 + .22 * A.depth) * born;
    const ops = place(shape(age * TAU * (o.flap ?? 3) + i, i), A.p, head, sz);
    if (fade < 1) ops.forEach(op => op.a = (op.a ?? .85) * fade);
    (A.depth >= 0 ? front : back).push(part(ops));
  }
  return { back, front };
}

// painted-anime-short · kit.js — small characters and props that recur in the genre, drawn in the same hand.
//   bird(ctx, x, y, s, pose)        a little blue songbird: perched, hopping, looking, flying (flat cel colours, thin ink)
//   puff(ctx, x, y, r, k, R, pal)   a dust / spore puff that grows and fades over k ∈ [0,1]
//   sapling(ctx, x, y, h, R, o)     a young tree (trunk + a few clumps) — on a roof, a rock, a shoulder
//   mossCap(ctx, pts, R, o)         moss cushions, grass tufts and flowers along a top edge (polyline of [x, y])
//   rock(ctx, x, y, w, h, R, o)     a mossy boulder
import { TAU, dab, ribbon, curve, clump, scrub, spray, flower, streak, vary, shade, rgba, blob, LEAF } from './paint.js';

export const BIRD = { back: '#3d66a8', body: '#5f97d6', belly: '#f2efe4', cheek: '#e58a4a', beak: '#2b2a2e', ink: '#252a3a', leg: '#3a3236' };
// pose: { dir: 1 right / -1 left, flap: wing phase in radians (undefined = folded), look: head turn −1…1, tilt, crouch 0…1 }
export function bird(ctx, x, y, s, pose = {}, pal = BIRD) {
  const dir = pose.dir || 1, flying = pose.flap !== undefined, crouch = pose.crouch || 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * s / 40, s / 40); ctx.rotate(pose.tilt || 0);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const ink = (w = 1.4) => { ctx.strokeStyle = pal.ink; ctx.lineWidth = w; ctx.stroke(); };
  if (!flying) { // legs
    ctx.strokeStyle = pal.leg; ctx.lineWidth = 1.6;
    for (const lx of [-3, 3]) { ctx.beginPath(); ctx.moveTo(lx, -10 + crouch * 3); ctx.lineTo(lx + 1, 0); ctx.lineTo(lx + 5, 0); ctx.stroke(); }
  }
  const by = flying ? -2 : -16 + crouch * 4;
  // tail
  ctx.fillStyle = pal.back; ctx.beginPath(); ctx.moveTo(-12, by - 2); ctx.lineTo(-34, by + (flying ? -2 : 8)); ctx.lineTo(-33, by + (flying ? 4 : 13)); ctx.lineTo(-10, by + 5); ctx.closePath(); ctx.fill(); ink(1.2);
  // body
  ctx.fillStyle = pal.body; ctx.beginPath(); ctx.ellipse(0, by, 16, 11, -.1, 0, TAU); ctx.fill(); ink();
  ctx.fillStyle = pal.belly; ctx.beginPath(); ctx.ellipse(3, by + 4, 12, 7, -.15, 0, Math.PI); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3, by + 4.5, 12.5, 6.5, -.15, .1, Math.PI - .1); ctx.lineWidth = .8; ctx.strokeStyle = rgba(pal.ink, .5); ctx.stroke();
  ctx.fillStyle = pal.cheek; ctx.beginPath(); ctx.ellipse(6, by + 3, 2.2, 1.6, 0, 0, TAU); ctx.fill();
  // head
  const hx = 13 + (pose.look || 0) * 1.5, hy = by - 9 - crouch * 2;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate((pose.look || 0) * .25);
  ctx.fillStyle = pal.body; ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, TAU); ctx.fill(); ink();
  ctx.fillStyle = pal.back; ctx.beginPath(); ctx.arc(0, -1, 8.5, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  ctx.fillStyle = pal.belly; ctx.beginPath(); ctx.ellipse(2.5, 4.5, 5, 3.2, .2, 0, TAU); ctx.fill();
  ctx.fillStyle = pal.beak; ctx.beginPath(); ctx.moveTo(7, -1); ctx.lineTo(14, 0.5); ctx.lineTo(7, 2.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#16161c'; ctx.beginPath(); ctx.arc(3.5, -1.5, 1.9, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(4.1, -2.2, .7, 0, TAU); ctx.fill();
  ctx.restore();
  // wing
  ctx.fillStyle = pal.back;
  if (flying) {
    const f = Math.sin(pose.flap), up = f * 26;
    ctx.beginPath(); ctx.moveTo(-6, by - 3); ctx.quadraticCurveTo(-4, by - 6 - up * .6, 4 - f * 6, by - 8 - up); ctx.quadraticCurveTo(8, by - 4 - up * .4, 6, by - 2); ctx.closePath(); ctx.fill(); ink(1.2);
  } else {
    ctx.beginPath(); ctx.moveTo(-10, by - 4); ctx.quadraticCurveTo(2, by - 9, 8, by - 2); ctx.quadraticCurveTo(-2, by + 5, -14, by + 4); ctx.closePath(); ctx.fill(); ink(1.1);
    ctx.strokeStyle = rgba(pal.ink, .45); ctx.lineWidth = .8; for (const k of [0, 4]) { ctx.beginPath(); ctx.moveTo(-12 + k, by + 1); ctx.lineTo(-2 + k, by - 3); ctx.stroke(); }
  }
  ctx.restore();
}

// a dust / spore puff at age k ∈ [0,1]: a few soft dabs that swell, rise a little and fade
export function puff(ctx, x, y, r, k, R, pal = ['#d8c3a0', '#b9a589', '#efe0c3']) {
  if (k <= 0 || k >= 1) return;
  const a = Math.sin(Math.PI * Math.min(1, k * 1.6)) * (1 - k);
  for (let i = 0; i < 7; i++) {
    const ang = Math.PI + (i / 6) * Math.PI + (R() - .5) * .4, d = r * (.2 + k * .9) * (.6 + R() * .5);
    dab(ctx, x + Math.cos(ang) * d * 1.4, y + Math.sin(ang) * d * .5 - k * r * .4, r * (.35 + k * .6) * (.7 + R() * .5), pal[i % pal.length], R, { jag: .25, a: a * .8 });
  }
}

// a young tree: a leaning trunk with two forks and 4–6 clumps on top
export function sapling(ctx, x, y, h, R, o = {}) {
  const lean = o.lean ?? (R() - .5) * .3, pal = o.pal || LEAF, bark = o.bark || '#5a4a3a';
  const tx = x + Math.sin(lean) * h, ty = y - h;
  ctx.fillStyle = bark; ribbon(ctx, curve(x, y, x + (tx - x) * .3 + h * .05, y - h * .5, tx, ty, 10), k => h * .07 * (1 - k * .65) + 1);
  for (let i = 0; i < 2; i++) { const s = i ? 1 : -1, bx = lerp2(x, tx, .6), byy = lerp2(y, ty, .6); ribbon(ctx, curve(bx, byy, bx + s * h * .15, byy - h * .15, bx + s * h * .28, byy - h * .32, 6), k => h * .035 * (1 - k * .7) + .6); }
  const n = o.clumps || 5;
  // the crown: an irregular cloud of clumps, wider than tall, lower clumps darker (in their own shade)
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / Math.max(1, n - 1) - .5) * 2.6 + (R() - .5) * .3, d = h * (.18 + R() * .2), y = ty + Math.sin(a) * d * .75 + h * .08;
    clump(ctx, tx + Math.cos(a) * d * 1.35, y, h * (.13 + R() * .09), R, y > ty ? { ...pal, light: pal.mid } : pal, { spray: 16 });
  }
  clump(ctx, tx - h * .04, ty - h * .1, h * .2, R, pal, { spray: 20 });
  clump(ctx, tx + h * .12, ty - h * .02, h * .15, R, pal, { spray: 14 });
}
const lerp2 = (a, b, k) => a + (b - a) * k;

// moss cushions along a top edge, with grass tufts and white / lavender flowers. pts: polyline [[x, y], …] (the edge)
export const MOSS = { dark: '#5b7a3a', mid: '#8fae4a', light: '#c4d46a', hi: '#e7eaa0' };
export function mossCap(ctx, pts, R, o = {}) {
  const pal = o.pal || MOSS, size = o.size || 18, grassCol = o.grass || ['#4f7a35', '#76a144', '#a9c860'];
  const L = []; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], d = Math.hypot(bx - ax, by - ay); for (let s = 0; s < d; s += size * .55) L.push([ax + (bx - ax) * s / d, ay + (by - ay) * s / d]); }
  for (const [x, y] of L) if (R() < (o.cover ?? .85)) {
    const r = size * (.6 + R() * .7);
    dab(ctx, x, y - r * .1, r, vary(pal.dark, R), R, { sy: .65, jag: .35, n: 11 });
    dab(ctx, x - r * .15, y - r * .35, r * .75, vary(pal.mid, R), R, { sy: .55, jag: .35, n: 10 });
    scrub(ctx, x - r * .2, y - r * .5, r * .5, pal.light, R, { n: 4, ang: -.35, w: r * .14, len: r * .55, sy: .5 });
    if (R() < .3) scrub(ctx, x - r * .3, y - r * .6, r * .3, pal.hi, R, { n: 2, ang: -.35, w: r * .1, len: r * .35 });
  }
  for (const [x, y] of L) {
    if (R() < (o.tufts ?? .3)) for (let j = 0; j < 6; j++) { const hh = size * (.8 + R() * 1.4), lx = (R() - .5) * .8; ctx.fillStyle = grassCol[(R() * grassCol.length) | 0]; ribbon(ctx, curve(x + (R() - .5) * size * .5, y - size * .3, x + lx * hh * .4, y - hh * .6, x + lx * hh, y - hh, 5), k => size * .12 * (1 - k) + .2); }
    if (R() < (o.flowers ?? .18)) flower(ctx, x + (R() - .5) * size, y - size * (.5 + R() * .9), size * (.16 + R() * .08), R() < .7 ? '#f6f3ea' : '#b9a7e0', '#e9c44f', R);
  }
}

// a mossy boulder
export function rock(ctx, x, y, w, h, R, o = {}) {
  const base = o.base || '#7d7b74', dark = shade(base, -.35);
  dab(ctx, x, y - h * .45, w * .5, base, R, { sy: h / w * 1.1, jag: .18, n: 12 });
  ctx.save(); ctx.beginPath(); blob(ctx, x, y - h * .45, w * .5, R, { sy: h / w * 1.1, jag: .18, n: 12 }); ctx.clip();
  dab(ctx, x + w * .25, y - h * .2, w * .45, dark, R, { sy: .7, a: .6 });
  ctx.restore();
  if (o.moss !== false) mossCap(ctx, [[x - w * .42, y - h * .55], [x - w * .1, y - h * .9], [x + w * .25, y - h * .8]], R, { size: w * .1, flowers: .1, tufts: .2 });
}

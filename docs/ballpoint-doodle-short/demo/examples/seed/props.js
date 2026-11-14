// examples/seed · props.js — the things this topic needed that the kit does not have, drawn with pen.js in the same two
// hands: the striped seed (the precious thing), the soil mound, the sunflower that grows, and Momo's sunflower hat.
import * as P from '../../lib/pen.js';
const { CRAYON, INK, ink, shape, crayon, clamp, ease, lerp } = P;

/** the seed: a striped sunflower seed, centre (x, y), rolled by rot, s = scale. Rests on the ground at y = ground − 15·s */
export function seed(ctx, x, y, rot = 0, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  const pts = [[-26, 0], [-20, -12], [-4, -16], [14, -12], [27, -3], [28, 2], [14, 11], [-4, 15], [-20, 12]];
  shape(ctx, pts, { fill: CRAYON.grey, shade: '#4d4d57', gap: 3.4, line: INK.navy, w: 2.4, sk: .5 });
  for (const k of [-8, 0, 8]) ink(ctx, [[-22, k * .9], [-6, k * 1.1], [12, k * .8], [24, k * .25]], { col: INK.navy, w: 2, second: 0, over: 0, amp: .6 });
  crayon(ctx, [[18, -8], [28, -2], [28, 3], [18, 8]], { knock: false, col: CRAYON.cream, gap: 2.6, base: .6, inset: 1, off: [0, 0] });
  ctx.restore();
}
export const SEED_R = 15;   // its rolling radius

/** a soil mound at (x, ground y), w wide, with `seeds` sunflower seeds sitting on it (offsets in px) */
export function mound(ctx, x, y, w = 130, h = 30) {
  const pts = [...P.arc(x, y, w / 2, h, Math.PI, Math.PI * 2, 14)];
  shape(ctx, [...pts, [x + w / 2, y + 2], [x - w / 2, y + 2]], { fill: CRAYON.brown, shade: '#5d3b1d', line: INK.brown, gap: 3.8, sk: .5 });
  for (const [dx, dy] of [[-.3, -.4], [0, -.7], [.25, -.35], [-.05, -.2]]) P.blot(ctx, P.ellipse(x + dx * w / 2, y + dy * h, 3, 2, 6), INK.brown, .7);
}

/** the sunflower: grows from the ground at (x, y); k 0…1 (stem → leaves → bud → open head); t for a little sway */
export function sunflower(ctx, x, y, k, t = 0, H = 400) {
  if (k <= 0) return;
  const h = H * ease.out(clamp(k / .55)), sway = Math.sin(t * 2.2) * 6 * clamp((k - .5) * 2);
  const stem = []; for (let i = 0; i <= 8; i++) { const u = i / 8; stem.push([x + Math.sin(u * 2.2) * 10 + sway * u * u, y - u * h]); }
  ink(ctx, stem, { col: INK.green, w: 5, second: .3 }); ink(ctx, stem, { col: CRAYON.green, w: 2.6, second: 0, amp: .5 });
  const lk = clamp((k - .35) / .25);
  for (const [u, sd] of [[.38, -1], [.58, 1]]) if (lk > 0) {
    const p = stem[Math.round(u * 8)], L = 80 * ease.back(lk);
    shape(ctx, P.move(P.rot([[0, 0], [L * .5, -L * .32], [L, 0], [L * .5, L * .2]], sd > 0 ? -.35 : Math.PI + .35), p[0], p[1]), { fill: CRAYON.leaf, line: INK.green, gap: 3.6 });
  }
  const top = stem[8], hk = clamp((k - .62) / .38);
  if (k > .5) {
    const bud = 18 + 46 * ease.back(hk);
    if (hk > 0) for (let i = 0; i < 14; i++) {   // petals
      const a = i / 14 * Math.PI * 2 + .1, r0 = bud * .8, r1 = bud * (.8 + 1.0 * ease.back(hk));
      const pts = [[top[0] + Math.cos(a - .18) * r0, top[1] + Math.sin(a - .18) * r0], [top[0] + Math.cos(a) * r1, top[1] + Math.sin(a) * r1], [top[0] + Math.cos(a + .18) * r0, top[1] + Math.sin(a + .18) * r0]];
      shape(ctx, pts, { fill: CRAYON.yellow, line: INK.orange, gap: 3, w: 1.8, second: .15 });
    }
    shape(ctx, P.ellipse(top[0], top[1], bud, bud, 22), { fill: hk > 0 ? CRAYON.brown : CRAYON.leaf, shade: true, line: hk > 0 ? INK.brown : INK.green, gap: 3.4 });
    if (hk > .5) for (let i = 0; i < 9; i++) { const a = i * 2.4, r = Math.sqrt(i / 9) * bud * .7; P.blot(ctx, P.ellipse(top[0] + Math.cos(a) * r, top[1] + Math.sin(a) * r, 3, 2.4, 6), INK.brown, .6); }
  }
  return top;
}

/** Momo's sunflower hat (a wear hook for the rig): a flower head sitting on top of the ball, tilted back */
export function sunHat(ctx, info, layer) {
  if (layer !== 'top') return;
  const g = info.g, x = -g.sn * 6, y = g.top + 8, r = 34;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, pts = [[x + Math.cos(a - .22) * r * .8, y + Math.sin(a - .22) * r * .45], [x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * .9], [x + Math.cos(a + .22) * r * .8, y + Math.sin(a + .22) * r * .45]]; shape(ctx, pts, { fill: CRAYON.yellow, line: INK.orange, gap: 3, w: 1.8, second: .15 }); }
  shape(ctx, P.ellipse(x, y, r, r * .55, 20), { fill: CRAYON.brown, shade: true, line: INK.brown, gap: 3.4 });
}

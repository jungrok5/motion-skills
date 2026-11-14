// templates · cast.js — the cast as data. REPLACE these with creatures designed for your topic (references/BRIEF.md).
// Spec fields (lib/rig.js):
//   name (shown in body-check messages) · ink (outline pen colour)
//   body:  { rx, ry (half width / height, px), col (crayon), shade (the pressed-harder side), egg (0 = ellipse, .1–.2 = wider bottom), gap (hatch spacing) }
//   belly: { col, w, h, y, line } · fur: n hairs on top · cheeks: blush colour (or omit)
//   eyes:  { size, gap (deg apart on the ball), y (−.2 = a little above the middle) }
//   nose:  { type: 'beak' | 'snout' | 'button' | 'none', col, size, y }
//   ears:  { type: 'point' | 'round' | 'long' | 'none', col, inner, size, lean }
//   arms:  { type: 'wing' | 'paw', col, pad, len, w, rest: { a, f } (the pose arms take when a pose leaves them out) }
//   feet:  { col, w, h } · tail: { type: 'feather' | 'curl' | 'puff' | 'none', col, size }
//   wear(ctx, info, layer): hats, scarves, glasses — drawn on the ball (info.g.psi = yaw in rad) so they turn with it
import * as P from '../lib/pen.js';
const { CRAYON, INK } = P;

/** an example hero: a round ginger kitten (topic of the template: "a kitten and a runaway ball of yarn") */
export const HERO = {
  name: 'Kit', ink: INK.blue,
  body: { rx: 80, ry: 86, col: CRAYON.orange, shade: '#b8551f', egg: .12 },
  belly: { col: CRAYON.cream, w: .5, h: .4, y: .4, line: false },
  fur: 2, eyes: { size: 1.05, gap: 27, y: -.18 }, cheeks: CRAYON.blush,
  nose: { type: 'snout', col: CRAYON.pink, size: 1, y: .05 },
  ears: { type: 'point', col: CRAYON.orange, inner: CRAYON.pink, size: .8 },
  arms: { type: 'paw', col: CRAYON.orange, pad: CRAYON.cream, len: .44, w: .22, rest: { a: .2, f: .2 } },
  feet: { col: CRAYON.cream, w: 32, h: 16 },
  tail: { type: 'curl', col: CRAYON.orange, size: 1.1 },
};

/** the thing that gets away: a ball of yarn (props are plain functions drawn with pen.js, centred on x, y) */
export function yarn(ctx, x, y, rot = 0, r = 26) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  P.shape(ctx, P.ellipse(0, 0, r, r, 20), { fill: CRAYON.red, shade: true, line: INK.red, gap: 3.4 });
  for (const k of [-.5, 0, .5]) P.ink(ctx, P.arc(0, 0, r * .9, r * (.3 + Math.abs(k) * .4), Math.PI * (1.1 + k * .2), Math.PI * (1.9 + k * .2), 8), { col: INK.red, w: 1.6, second: 0, over: 0 });
  ctx.restore();
}
export const YARN_R = 26;

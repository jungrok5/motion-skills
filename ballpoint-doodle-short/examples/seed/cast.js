// examples/seed · cast.js — the cast of 「Water the Seed」, designed for this topic (references/BRIEF.md → the cast).
// MOMO, a small round mole who carries a tin watering can; GRAN, the bigger mole who gives the job; CROW, the thief.
import * as P from '../../lib/pen.js';
const { CRAYON, INK, mix } = P;

export const MOMO = {
  name: 'Momo', ink: INK.blue,
  body: { rx: 84, ry: 92, col: '#9b6b45', shade: '#6e4528', egg: .12 },
  belly: { col: CRAYON.tan, w: .5, h: .42, y: .38, line: false },
  fur: 3, eyes: { size: 1.05, gap: 27, y: -.2 }, cheeks: CRAYON.blush,
  nose: { type: 'button', col: CRAYON.pink, size: 1.1, y: .04 },
  ears: { type: 'round', col: '#9b6b45', inner: CRAYON.pink, size: .7 },
  arms: { type: 'paw', col: '#9b6b45', pad: CRAYON.pink, len: .46, w: .22, rest: { a: .2, f: .15 } },
  feet: { col: CRAYON.pink, w: 34, h: 18 },
  tail: { type: 'puff', col: '#9b6b45', size: .9 },
};

export const GRAN = {
  name: 'Gran', ink: INK.blue,
  body: { rx: 104, ry: 112, col: '#a99184', shade: '#7a6458', egg: .16 },
  belly: { col: CRAYON.cream, w: .5, h: .42, y: .38, line: false },
  eyes: { size: .9, gap: 26, y: -.22 }, cheeks: CRAYON.blush,
  nose: { type: 'button', col: CRAYON.pink, size: 1.1, y: .02 },
  ears: { type: 'none' },   // under the scarf
  arms: { type: 'paw', col: '#a99184', pad: CRAYON.pink, len: .44, w: .22, rest: { a: .18, f: .3 } },
  feet: { col: CRAYON.pink, w: 38, h: 18 },
  tail: { type: 'puff', col: '#a99184', size: .8 },
  // a headscarf knotted under the chin and round glasses — drawn on the ball so they turn with the face
  wear(ctx, info, layer) {
    const g = info.g; if (layer !== 'top') return;
    const front = Math.cos(g.psi);
    // the scarf: a cap over the top of the ball, its hem bowing down over the brow
    const top = P.arc(0, g.cy, g.rx * 1.05, g.ry * 1.05, Math.PI * 1.1, Math.PI * 1.9, 18), hem = [];
    for (let i = 0; i <= 10; i++) { const k = i / 10, x = P.lerp(top[top.length - 1][0], top[0][0], k); hem.push([x, P.lerp(top[top.length - 1][1], top[0][1], k) + Math.sin(Math.PI * k) * g.ry * .16]); }
    P.shape(ctx, [...top, ...hem.slice(1, -1)], { fill: CRAYON.red, shade: true, line: INK.red, gap: 4 });
    for (const [dx, dy] of [[-.45, -.72], [.05, -.86], [.5, -.68], [-.1, -.62]]) P.shape(ctx, P.ellipse(dx * g.rx, g.cy + dy * g.ry, 6, 6, 8), { fill: CRAYON.white, line: false, gap: 2.4 });
    // knot at the back of the head (the side away from the face)
    const kx = -Math.sin(g.psi) * g.rx * .95; if (Math.abs(Math.sin(g.psi)) > .25) P.shape(ctx, P.move([[0, 0], [-g.sn * 30, -14], [-g.sn * 36, 10]], kx, g.cy - g.ry * .42), { fill: CRAYON.red, line: INK.red, gap: 3.4 });
    // glasses
    if (front > .1) {
      const ey = g.cy - .22 * g.ry;
      for (const sx of [-1, 1]) { const a = sx * 26 * Math.PI / 180 + g.psi, c = Math.cos(a); if (c < .5) continue; /* a lens past the edge of the face is not drawn */ const x = Math.sin(a) * g.rx * .97; P.ink(ctx, P.ellipse(x, ey, 20 * c, 20, 16), { col: INK.black, w: 2.2, closed: true, second: .2 }); }
      const xa = Math.sin(-26 * Math.PI / 180 + g.psi) * g.rx * .97, xb = Math.sin(26 * Math.PI / 180 + g.psi) * g.rx * .97;
      if (Math.cos(-26 * Math.PI / 180 + g.psi) > .5 && Math.cos(26 * Math.PI / 180 + g.psi) > .5) P.ink(ctx, [[xa + 18, ey - 2], [xb - 18, ey - 2]], { col: INK.black, w: 2, second: 0, over: 0 });
    }
  },
};

export const CROW = {
  name: 'Crow', ink: INK.navy,
  body: { rx: 70, ry: 78, col: '#55597e', shade: '#2e3150', egg: .08, gap: 5.2 },
  fur: 4, eyes: { size: 1, gap: 30, y: -.25 },
  nose: { type: 'beak', col: CRAYON.gold, size: 1.15, y: -.02 },
  arms: { type: 'wing', col: '#6a6e96', len: .7, w: .32, rest: { a: .25, f: -.7 } },
  feet: { col: CRAYON.gold, w: 28, h: 14 },
  tail: { type: 'feather', col: '#55597e', size: 1.5 },
};

/** the tin watering can Momo carries (drawn at the hand, in the hand's frame: +x = forward when facing right) */
export function can(ctx, dir = 1, tilt = 0, water = 0) {
  ctx.save(); ctx.scale(dir, 1); ctx.rotate(tilt);
  const body = [[-34, -6], [-30, 46], [30, 46], [34, -6]];
  P.ink(ctx, [[-22, -6], [-10, -40], [14, -40], [24, -6]], { col: INK.blue, w: 3, second: .2 });   // the handle hoop
  P.shape(ctx, [[30, 10], [78, -26], [84, -20], [34, 26]], { fill: CRAYON.teal, line: INK.blue, gap: 3.4 });   // spout
  P.shape(ctx, P.ellipse(82, -24, 9, 6, 10), { fill: CRAYON.stone, line: INK.blue, gap: 2.6, w: 1.8 });
  P.shape(ctx, body, { fill: CRAYON.teal, shade: true, line: INK.blue, gap: 4 });
  P.ink(ctx, [[-31, 14], [31, 14]], { col: INK.blue, w: 1.6, second: 0 });
  ctx.restore();
}

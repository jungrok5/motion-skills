// The cast of 「Market Day」 (BRIEF.md): Mina, seven, and her grandfather, on a summer Saturday. Each is designed once and
// built at two sizes where the film needs a close-up; the close-up and the wide shots are the same design.
import { Actor } from '../../lib/body.js';
import * as W from '../../lib/wear.js';
import * as P from '../../lib/paint.js';

const INK = '#241c22';
const minaHead = {
  seed: 31,
  head: { skin: '#f4d0bc', shadow: '#dba591', jaw: .2 },
  face: { eyeR: .16, pupil: .38, gaze: [.5, 0], freckles: 10, nose: { type: 'button', color: '#ee8a96' }, mouth: { curve: .4, w: .13 }, brows: { thick: .9, tilt: .12 }, blush: { strength: 1.3 } },
  ears: { color: '#ee957f', earring: { type: 'stud', color: '#f2c94c', size: 1.1 } },
  hair: { style: 'straight', bangs: 'full', length: 1.05, volume: .12, flare: .1, base: '#1d1416', colors: [['#150f11', 6], ['#2a1c20', 2], ['#cf4f7d', 2], ['#ef86a8', .7]], strays: 14 },
  extras: [W.bucket({ colors: ['#f2c94c', '#f08a3a'], brim: '#e0503a' })],
};
const minaBody = {
  coat: { color: '#4f86c6', pattern: { type: 'dots', colors: ['#fbf6ea'], width: .07, gap: .38 }, length: 2.45, width: 1.55, placket: false, pockets: true, collar: '#fbf6ea' },
  legs: { color: '#f1c6ae', w: .19 }, shoes: { color: '#e0503a', size: .95 }, arms: { color: '#f1c6ae', mitten: '#f1c6ae', w: .3 },
};
export const MINA = new Actor({ name: 'Mina', seed: 31, head: minaHead, body: { ...minaBody, a: 56 } });
export const MINA_CLOSE = new Actor({ name: 'Mina (close)', seed: 31, head: minaHead, body: { ...minaBody, a: 215 } }, { res: 1.2 });
// the last shot: the same Mina with a dab of strawberry ice cream on her nose
export const MINA_NOSE = new Actor({ name: 'Mina (close, ice cream)', seed: 31, head: { ...minaHead, extras: [...minaHead.extras, { layer: 'head', ops: A => [{ name: 'ice cream on the nose', bb: [A.nose[0] - 40, A.nose[1] - 40, A.nose[0] + 40, A.nose[1] + 40], draw: (ctx, s) => { P.gouache(ctx, P.ellipse(A.nose[0] + 4, A.nose[1] - 10, A.a * .13, A.a * .09, 20), { color: '#fbc4d4', seed: s, mottle: .4, edge: .6 }); P.ink(ctx, P.ellipse(A.nose[0] + 4, A.nose[1] - 10, A.a * .13, A.a * .09, 20).slice(10, 20), { width: 1.4, color: '#c0607a', seed: s + 1 }); P.dabs(ctx, [[A.nose[0] - A.a * .02, A.nose[1] - A.a * .08, .8]], { color: '#ffffff', r: A.a * .02, seed: s + 2 }); } }] }] }, body: { ...minaBody, a: 215 } }, { res: 1.2 });

// Grandpa: grey curls under a red beret, round glasses, a white moustache, a long checked cardigan, a basket
const moustache = { layer: 'head', ops: A => { const [nx, ny] = A.nose, a = A.a; return [{ name: 'moustache', bb: [nx - a * .45, ny - a * .1, nx + a * .45, ny + a * .3], draw: (ctx, s) => {
  const m = P.spline([[nx - a * .38, ny + a * .2], [nx - a * .2, ny + a * .04], [nx, ny + a * .1], [nx + a * .2, ny + a * .04], [nx + a * .38, ny + a * .2], [nx + a * .2, ny + a * .17], [nx, ny + a * .2], [nx - a * .2, ny + a * .17]], 3, true);
  P.gouache(ctx, m, { color: '#f4f1ea', seed: s, mottle: .3, edge: .3, shadow: [nx, ny + a * .25, .25, a * .3] }); P.ink(ctx, m.slice(0, Math.floor(m.length * .6)), { width: 1.2, color: '#8d8a93', seed: s + 1, alpha: .7 });
} }]; } };
const grandpaHead = {
  seed: 44,
  head: { skin: '#efc8b2', shadow: '#d39b86', jaw: .28, chin: .95 },
  face: { eyeR: .12, pupil: .45, lids: .3, gaze: [.4, .1], nose: { type: 'button', size: 1.4, color: '#e47f8a' }, mouth: { curve: .3, w: .12, y: .74 }, brows: { thick: 1.1, color: '#c9c6cf', tilt: .25, y: .75 }, blush: { strength: 1.1 } },
  ears: { color: '#e88f80', size: 1.15, earring: { type: 'none' } },
  hair: { style: 'curly', volume: .12, base: '#b6b2bf', colors: [['#a29eae', 4], ['#e8e5ec', 3], ['#6f6a80', 1.5]], strays: 8 },
  extras: [W.beret({ color: '#c8402e', band: '#8a2a20', side: -1 }), W.glasses({ color: '#3a2a22' }), moustache],
};
const basket = { draw: (ctx, hand, actor, pose, t) => { // a wicker basket with leeks and a loaf, hanging from the near hand
  const a = actor.a, [hx, hy] = hand, sw = Math.sin(t * 2.4) * .04;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(sw);
  ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, a * .25, a * .42, a * .32, 0, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = '#5f9e4a'; for (const [dx, h] of [[-.2, .9], [-.05, 1.1]]) { ctx.save(); ctx.translate(dx * a, a * .3); ctx.rotate(-.25 + dx); ctx.fillRect(-4, -h * a, 8, h * a); ctx.fillStyle = '#f4f1e2'; ctx.fillRect(-4, -h * a * .35, 8, h * a * .35); ctx.restore(); }
  ctx.fillStyle = '#d99a4a'; ctx.beginPath(); ctx.ellipse(a * .16, a * .22, a * .26, a * .12, -.3, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#c99a5a'; ctx.beginPath(); ctx.moveTo(-a * .45, a * .25); ctx.lineTo(a * .45, a * .25); ctx.lineTo(a * .36, a * .62); ctx.lineTo(-a * .36, a * .62); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 1.3; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-a * .42 + i * .01 * a, a * (.25 + i * .09)); ctx.lineTo(a * .42 - i * .01 * a, a * (.25 + i * .09)); ctx.stroke(); }
  ctx.restore();
} };
const grandpaBody = {
  coat: { color: '#7d8a3a', pattern: { type: 'checks', colors: ['#e9b13a', '#5b6a2a'], gap: .32 }, length: 2.95, width: 1.85, shoulder: .95, buttons: '#e9b13a' },
  legs: { color: '#6a4a3a', w: .22 }, shoes: { color: '#3a2a22', size: 1.1 }, arms: { mitten: '#efc8b2' },
};
export const GRANDPA = new Actor({ name: 'Grandpa', seed: 44, head: grandpaHead, body: { ...grandpaBody, a: 62, held: basket } });
export const GRANDPA_SIT = new Actor({ name: 'Grandpa (bench)', seed: 44, head: grandpaHead, body: { ...grandpaBody, a: 62 } });
export const ACTORS = [MINA, GRANDPA];

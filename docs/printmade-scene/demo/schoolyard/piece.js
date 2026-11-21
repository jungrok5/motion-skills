// printmade-scene · worked example 「폐교 운동장」 — a topic the starter doesn't cover, made through the whole flow
// (BRIEF.md → place → two printings → cast → beats → check → stills). An exterior this time: the school stands in
// elevation along the top, the playground is laid out flat below it, the iron fence runs across the front (a front layer).
// Now (A): rain at dusk, a closed school; a father with an umbrella walks to the swings and turns his back to us.
// Then (B): a summer afternoon on the same plate; a small girl walks out and throws a red ball toward the swings.
// Back to A: the red ball lies under the swing. He crouches.
import * as P from '../lib/print.js';
import * as K from '../lib/plate.js';
import { Figure, drawFigure } from '../lib/figure.js';
import { Scene, walk, turn, stand, keyed, seq } from '../lib/scene.js';
import { makeScore } from '../lib/score.js';

const PI = Math.PI, CRIMSON = '#b3161d';

const father = new Figure({
  name: '아빠', h: 384, mass: 1.25, skin: '#e3bc9f', blush: '#cf7a70',
  hair: { style: 'short', color: '#2a2220' },
  top: { kind: 'coat', color: '#33393b', inner: '#b9c2c4', pattern: 'plain', length: .2 },
  bottom: { kind: 'pants', color: '#4b4945', pattern: 'speckle' }, shoes: '#1f1b1a',
});
const girl = new Figure({
  name: '어린 딸', h: 236, mass: .55, headScale: 1.3, skin: '#efcdb2', blush: '#e07f76',
  hair: { style: 'bob', color: '#3a2a24' },
  top: { kind: 'dress', color: '#cdb06c', sleeve: '#cdb06c', sleeves: 'short', skirt: .2, pattern: 'plain' },
  bottom: { kind: 'skirt', color: '#cdb06c' }, legs: '#ece6d8', shoes: '#5a3a2e',
});
export const ACTORS = [father, girl];

// ── painted parts the kit doesn't have ──
function school(ctx, k, then) {
  const x0 = 290, x1 = 1150, top = 130, base = k.floorY, wc = then ? '#d6c9a6' : '#7f8b8c';
  K.wall(ctx, k, { x0, x1, y0: top, y1: base, color: wc, kind: 'brick', color2: P.shade(wc, -.18), size: 56, seed: 301 });
  P.ink(ctx, P.rect(x0 - 14, top - 18, x1 - x0 + 28, 22), then ? '#8a6c4c' : '#3c4244', { seed: 302 });
  P.ink(ctx, P.rect(650, top - 70, 140, 56), wc, { seed: 303 });                          // the clock gable
  const r = P.rng(then ? 31 : 30);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) {
    const wx = x0 + 40 + i * 140 + (i >= 3 ? 30 : 0), wy = top + 30 + row * 150, ww = 92, wh = 110; if (i === 3 && row === 1) continue;
    const broken = !then && r() < .35, glass = then ? '#c9d7d6' : broken ? '#23262f' : '#4b5466';
    K.win(ctx, k, { x: wx, y: wy, w: ww, h: wh, cols: 2, rows: 3, frame: then ? '#8a6c4c' : '#3c4244', fw: 6, seed: 310 + row * 9 + i, view: (c, b) => { P.ink(c, P.rect(b.x, b.y, b.w, b.h), glass, { seed: 320 + i + row * 7 }); if (then) { c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(b.x + 8, b.y + 6, 4, b.h - 12); P.ink(c, P.rect(b.x, b.y, b.w * .3, b.h), '#e8dfc6', { seed: 330 + i }); } } });
    if (!then && broken) { ctx.strokeStyle = '#6d5c4a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(wx - 6, wy + 20); ctx.lineTo(wx + ww + 6, wy + wh - 30); ctx.moveTo(wx - 6, wy + wh - 20); ctx.lineTo(wx + ww + 6, wy + 30); ctx.stroke(); }
  }
  K.door(ctx, k, { x: 670, y: base, w: 100, h: 150, color: then ? '#6e4f37' : '#2f3436', seed: 340 });
}
function clockFace(ctx, x, y, t, then) {
  P.ink(ctx, P.ellipsePts(x, y, 20, 20, 24), then ? '#efe8d6' : '#b7b6a8', { seed: 341, mottle: .2 });
  const m = then ? t * .8 : 2.1, h = then ? 4.2 + t * .01 : 4.2;       // stopped at ten past four
  ctx.strokeStyle = '#2a2422'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(h / 12 * P.TAU) * 10, y - Math.cos(h / 12 * P.TAU) * 10); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(m) * 15, y - Math.cos(m) * 15); ctx.stroke();
}
const SW = { x0: 900, x1: 1190, G: 760, seats: [990, 1110] };
function swingFrame(ctx, k, then) {
  const c = then ? '#7d6f5c' : '#4f4a46', { x0, x1, G } = SW, top = G - 270;
  ctx.save(); ctx.globalAlpha = .4; P.blot(ctx, (x0 + x1) / 2, G + 6, 170, 16, '#1d1715', { seed: 350 }); ctx.restore();
  for (const x of [x0, x1]) { P.ink(ctx, [[x - 40, G], [x - 6, top], [x + 6, top], [x - 28, G]], c, { seed: 351 + x }); P.ink(ctx, [[x + 40, G], [x + 6, top], [x - 6, top], [x + 28, G]], P.shade(c, -.15), { seed: 352 + x }); }
  P.ink(ctx, P.rect(x0 - 8, top - 8, x1 - x0 + 16, 14), c, { seed: 353 });
}
function swing(ctx, k, x, t, a0, then) {       // one swing, its chains from the bar, the seat; a0 = how far it still moves
  const { G } = SW, top = G - 262, L = 190, a = a0 * Math.sin(t * 2.1 + x), sx = x + Math.sin(a) * L, sy = top + Math.cos(a) * L;
  ctx.strokeStyle = then ? '#8d8a80' : '#6f6a62'; ctx.lineWidth = 1.6; ctx.setLineDash([3, 2]);
  ctx.beginPath(); ctx.moveTo(x - 24, top); ctx.lineTo(sx - 24, sy); ctx.moveTo(x + 24, top); ctx.lineTo(sx + 24, sy); ctx.stroke(); ctx.setLineDash([]);
  P.ink(ctx, P.rect(sx - 30, sy, 60, 9), then ? '#6e4f37' : '#3d3633', { seed: 360 + x, rough: false, mottle: .3 });
}
function track(ctx, k) {
  ctx.save(); ctx.strokeStyle = 'rgba(240,236,224,.7)'; ctx.lineWidth = 4;
  for (const [ix, iy] of [[0, 0], [26, 18]]) { const pts = []; for (let i = 0; i <= 60; i++) { const a = i / 60 * P.TAU, x = 720 + Math.cos(a) * (560 - ix) + (Math.abs(Math.cos(a)) > .3 ? 0 : 0), y = 760 + Math.sin(a) * (230 - iy); pts.push([x, y]); } P.path(ctx, P.rough(pts, { amp: 2, step: 20, seed: 370 + ix, closed: false }), false); ctx.stroke(); }
  ctx.restore();
}
const BALL = { x: 1008, G: 778 };
const PUDDLES = [[460, 856, 150], [800, 936, 110], [1220, 896, 130]];
function ball(ctx, x, y, r = 13) { ctx.fillStyle = CRIMSON; ctx.beginPath(); ctx.arc(x, y, r, 0, P.TAU); ctx.fill(); ctx.strokeStyle = 'rgba(60,8,10,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, r * .62, -1.2, .6); ctx.stroke(); ctx.fillStyle = 'rgba(255,240,230,.5)'; ctx.fillRect(x - r * .45, y - r * .5, 3, 3); }

const yard = (ctx, k, then) => {
  K.wall(ctx, k, { y0: 0, y1: k.floorY, color: then ? '#c7d4cf' : '#4a4a66', kind: 'sky', color2: then ? '#f3f0e6' : '#6a6884', seed: 380 });
  K.floor(ctx, k, { kind: 'earth', color: then ? '#c6b088' : '#8f8a78', seed: 381 });
  K.floor(ctx, k, { kind: 'grass', y0: k.floorY, y1: k.floorY + 40, color: then ? '#93a072' : '#59634a', seed: 382 });
  track(ctx, k);
  school(ctx, k, then);
  for (const [x, h, s] of [[90, 760, 1], [210, 600, 2], [1296, 700, 3], [1446, 820, 4]]) K.tree(ctx, k, { x, y: k.floorY + 30, h, w: 30 + s * 4, bare: !then, color: then ? '#4d4436' : '#262536', leaf: '#5d6b45', seed: 390 + s });
  swingFrame(ctx, k, then);
  if (!then) { for (const [x, y, w] of PUDDLES) P.blot(ctx, x + w / 2, y + w * .13, w / 2, w * .15, '#5d6878', { alpha: .9, seed: 400 + x, amp: 6 }); K.slip(ctx, k, { x: 1352, y: 470, text: '여기서 기다릴게', seed: 405 }); }
  else { for (let i = 0; i < 4; i++) K.plant(ctx, k, { x: 360 + i * 90, y: k.floorY + 30, kind: 'pot', h: 50, color: '#b8846a', seed: 410 + i }); }
};
const front = (ctx, k, then) => { K.fence(ctx, k, { x0: -10, x1: 560, y: 1050, h: 92, color: then ? '#3f3a35' : '#1e1c1f', seed: 420 }); K.fence(ctx, k, { x0: 900, x1: 1450, y: 1050, h: 92, color: then ? '#3f3a35' : '#1e1c1f', seed: 421 }); for (const x of [560, 900]) P.ink(ctx, P.rect(x - 22, 920, 44, 135), then ? '#b4ae9f' : '#7d7c78', { seed: 422 + x }); };

// ── the cast's beats ──
const T = { w0: .9, w1: 2.7, tr0: 3.1, tr1: 3.9, s1: 4.6, s2: 9.0, dur: 14 };
const umbrellaArm = pose => Object.assign(t => { const p = pose(t); return { ...p, arms: { ...(p.arms || {}), R: { sh: .5, ab: .14, el: 1.25 } }, reach: p.reach ? { ...p.reach, R: undefined } : undefined, hold: { R: umbrella } }; }, pose);
function umbrella(ctx, hand, F) {
  const g = F.geom(), topY = hand.y - g.torso - g.neck - g.headRy * 2.1 - 30, x = hand.x;
  ctx.strokeStyle = '#1b1a1c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, hand.y + 16); ctx.lineTo(x, topY); ctx.stroke();
  P.ink(ctx, [[x - 92, topY + 34], [x - 70, topY + 6], [x, topY - 14], [x + 70, topY + 6], [x + 92, topY + 34], [x + 60, topY + 26], [x + 30, topY + 34], [x, topY + 26], [x - 30, topY + 34], [x - 60, topY + 26]], '#211f22', { seed: 430, mottle: .3, speck: .3 });
}
const fStand = stand(father, { at: [1112, 880], yaw: -PI / 2, t0: T.w1, t1: T.tr0 });
const fEnd = stand(father, { at: [1112, 880], yaw: -2.5, t0: T.tr1, t1: T.dur + 1 });
const fatherPose = umbrellaArm(seq(
  walk(father, { from: [1390, 880], to: [1112, 880], t0: T.w0, t1: T.w1 }),
  keyed(fStand, [{ t: 2.95, head: { pitch: -.08, yaw: -.25 } }]),
  turn(father, { at: [1112, 880], from: -PI / 2, to: -2.5, t0: T.tr0, t1: T.tr1 }),
  keyed(fEnd, [
    { t: 9.7, head: { pitch: .1 } },
    { t: 10.0, tag: 'antic', drop: -3, lean: -.06, head: { pitch: .05 } },
    { t: 10.45, tag: 'big', ease: 'out', drop: 78, lean: .3, head: { pitch: .25 }, reach: { L: [44, -4, -118] } },
    { t: 11.25, tag: 'settle', ease: 'back', drop: 66, lean: .22, head: { pitch: .2 }, reach: { L: [34, -6, -112] } },
  ]),
));
const gWalk = walk(girl, { from: [470, 806], to: [748, 806], t0: 5.5, t1: 7.1 });
const gStand = stand(girl, { at: [748, 806], yaw: PI / 2, t0: 7.1, t1: T.dur + 1 });
const throwKeys = [
  { t: 7.25, reach: { R: [20, 6, -70] } },
  { t: 7.7, tag: 'antic', drop: 8, lean: -.1, reach: { R: [-44, 8, 34] }, head: { pitch: -.1 } },
  { t: 8.02, tag: 'big', ease: 'snap', drop: -2, lean: .16, reach: { R: [76, 4, 26] }, head: { pitch: -.12 } },
  { t: 8.7, tag: 'settle', ease: 'back', drop: 3, lean: .03, reach: { R: [34, 4, -66] }, head: { pitch: -.05 } },
];
const gKeyed = keyed(gStand, throwKeys);
const RELEASE = 8.0, LAND = 8.55, REST = 9.0;
const girlBase = seq(gWalk, gKeyed);
const girlPose = Object.assign(t => { const p = girlBase(t); return t < RELEASE ? { ...p, hold: { R: (c, h) => ball(c, h.x + 4, h.y - 4, 11) } } : p; }, girlBase);
let releaseAt = null;
function ballInFlight(ctx, k, t) {
  if (t < RELEASE) return;
  if (!releaseAt) { const J = drawFigure(null, girl, gKeyed(RELEASE), { measure: true }); releaseAt = J.screen.hands.R; }
  const [x0, y0] = releaseAt;
  if (t < LAND) { const u = (t - RELEASE) / (LAND - RELEASE), x = P.lerp(x0, 960, u), y = P.lerp(y0, BALL.G, u) - Math.sin(u * PI) * 140; P.blot(ctx, x, P.lerp(806, BALL.G, u) + 6, 12, 4, '#1d1715', { alpha: .3, seed: 3 }); ball(ctx, x, y, 11); }
  else { const u = P.smooth((t - LAND) / (REST - LAND)), x = P.lerp(960, BALL.x, u), hop = Math.abs(Math.sin(u * PI * 2)) * 18 * (1 - u); P.blot(ctx, x, BALL.G + 6, 12, 4, '#1d1715', { alpha: .3, seed: 3 }); ball(ctx, x, BALL.G - hop, 11); }
}

export const film = new Scene({
  title: '폐교 운동장', label: '운동장', labelStyle: { color: '#ece4d0' }, caption: '가족 미스터리 · 폐교', dur: T.dur, seed: 11,
  plate: { floorY: 470 },
  A: { paint: (c, k) => yard(c, k, false), front: (c, k) => front(c, k, false),
       live: (c, k, t) => { clockFace(c, 720, 72, t, false); for (const x of SW.seats) swing(c, k, x, t, .03, false); K.rain(c, { x: 0, y: 0, w: k.W, h: k.H }, t, { seed: 440, n: 520, len: 30, color: 'rgba(235,235,245,.42)' }); for (const [x, y, w] of PUDDLES) K.ripple(c, { x: x + w * .15, y: y + w * .04, w: w * .7, h: w * .18 }, t, { n: 5, seed: x }); } },
  B: { paint: (c, k) => yard(c, k, true), front: (c, k) => front(c, k, true), labelStyle: { color: '#2a2422' },
       live: (c, k, t) => { clockFace(c, 720, 72, t, true); for (const x of SW.seats) swing(c, k, x, t, x === SW.seats[1] ? .22 : .06, true); ballInFlight(c, k, t); } },
  shifts: [{ t: T.s1, dur: .9 }, { t: T.s2, dur: .9 }],
  change: { dur: 1.2, draw: (c, k, kk) => { if (kk > 0) { c.save(); c.globalAlpha = P.smooth(kk * 1.4); P.blot(c, BALL.x, BALL.G + 7, 13, 4, '#1d1715', { alpha: .35, seed: 3 }); ball(c, BALL.x, BALL.G, 14 * (.6 + .4 * P.smooth(kk))); c.restore(); } } },
  cast: [{ fig: father, pose: fatherPose, state: 'A', seed: 3 }, { fig: girl, pose: girlPose, state: 'B', seed: 8 }],
  sound: { amb: ['room', 'wind', { type: 'rain', from: 0, to: 5.0 }, { type: 'cicadas', from: 4.9, to: 9.4 }, { type: 'birds', from: 4.9, to: 9.4 }, { type: 'rain', from: 9.1, to: 14 }],
    surface: 'gravel', events: [
      { t: 8.02, type: 'rustle', x: 760, gain: .5 }, { t: LAND, type: 'thud', x: 960, gain: .35 }, { t: 8.75, type: 'thud', x: 985, gain: .18 },
      { t: 9.6, type: 'chain', x: 1000, gain: .6 }, { t: 10.45, type: 'sigh', x: 1110, dur: .7, gain: .7 },
    ] },
});
export const score = makeScore({ seed: 11, music: 'piano', key: 174.6 });

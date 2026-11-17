// The starter 「누르면 토스트가 나오는 줄 알았다」 — a mouse-eared critter presses the toaster's lever in a morning kitchen,
// waits, presses harder, and peeks into the empty slot. It is ONE example of the style: write BRIEF.md for your topic,
// then replace the critter, the room, the thing being tried, the beats and the sound with what the brief designs.
import * as P from 'scv/paint.js';
import * as K from 'scv/room.js';
import { Critter } from 'scv/critter.js';
import { Vignette, walk, stand, turn, keyed, seq } from 'scv/vignette.js';
import { makeScore } from 'scv/score.js';

// ── the room: a small kitchen in the morning, the window on the back wall ──
export const room = K.makeRoom({ W: 1080, H: 1440, horizon: 660, vpX: 560, eye: 500, refZ: 1000, left: -700, right: 640, back: 2300, ceiling: 1400, near: 480, light: { color: '#ffe3a6' } });
const R = room;
const WIN = K.sub(R.walls.back, .5, .22, .88, .7);
const BENCH = { x0: 160, x1: 500, y0: 0, y1: 110, z0: 1240, z1: 1460 };
const TOAST = { x0: 262, x1: 410, y0: 110, y1: 236, z0: 1300, z1: 1390 };
const KNOB = { X: TOAST.x0 - 26, Z: 1345 };                // the lever sticks out of the side, towards the critter
// the lever's height over time: down when pressed, it springs back up with a little bounce (and no toast)
const LEVER = [[0, 206], [3.95, 206], [4.15, 150], [5.9, 150], [5.96, 212], [6.04, 204], [6.62, 206], [6.72, 150], [8.0, 150], [8.06, 212], [8.14, 204], [99, 206]];
const leverY = t => { for (let i = 1; i < LEVER.length; i++) if (t <= LEVER[i][0]) { const [ta, a] = LEVER[i - 1], [tb, b] = LEVER[i]; return P.lerp(a, b, P.smooth(P.clamp((t - ta) / (tb - ta)))); } return 206; };
const knob = (dy = 10) => t => R.proj(KNOB.X - 4, leverY(t) + dy, KNOB.Z);

const plates = [{
  z: 0, paint(g) {
    K.shell(g, R, { wall: '#6a5a44', back: '#7a6a4e', floor: '#8a6448', ceiling: '#33281e', boards: 11, beams: 3, seed: 7, dark: .4 });
    K.windowLight(g, R, WIN, { cols: 3, rows: 2, seed: 9, outside: ['#fffbe6', '#f2e2a0', '#a8b870'], frame: '#4e4030' });
    // back wall, left: a shelf of jars and a hanging pan; under the window, a sill plant
    K.shelf(g, R, -620, -120, 760, R.back - 140, R.back, { seed: 11, color: '#5a4030', items: (g2, top, s) => { for (let i = 0; i < 5; i++) { const p = top(.1 + i * .19, .5), sc = R.scaleAt(R.back - 70); K.jar(g2, p[0], p[1], 40 * sc * 1.6, 58 * sc * 1.6, { seed: s + i, fill: ['#c98a3a', '#8aa05a', null, '#b85a3a', '#e8d8a8'][i], level: .55 }); } } });
    { const p = R.proj(-380, 560, R.back - 10), sc = R.scaleAt(R.back); P.pen(g, [R.proj(-380, 700, R.back - 10), p], { seed: 13, width: 2 }); P.wash(g, P.ellipse(p[0], p[1] + 46 * sc, 52 * sc, 52 * sc, 24), { color: '#4a4040', seed: 14, alpha: .97, edge: .5 }); P.ink(g, [[p[0], p[1] + 98 * sc], [p[0] + 4, p[1] + 150 * sc]], { width: 6 * sc, color: '#3a2a22', seed: 15 }); }
    K.plant(g, ...WIN(.5, 1.03), R.scaleAt(R.back) * 1.3, { seed: 17, pot: '#b0603e', n: 7, height: 120 });
    // left wall: a calendar; the floor: the window's light, a mat
    K.note(g, K.sub(R.walls.left, .45, .3, .62, .55), { seed: 19, color: '#ece0c4', lines: 4 });
    const mat = R.face([[-260, 0, 1700], [240, 0, 1700], [240, 0, 1300], [-260, 0, 1300]]);
    P.wash(g, K.quad(mat, 0, 0, 1, 1, 6), { color: '#5a7a6a', seed: 21, alpha: .8 });
    K.lightShaft(g, R, WIN, { dz: 1000, dx: -260, k: .8, cols: 3, rows: 2, color: '#ffd27a' });
    // the low bench with the toaster on it
    K.box(g, R, BENCH, { seed: 23, color: '#7a5236' });
    K.box(g, R, TOAST, { seed: 25, faces: {
      front: (g2, m, s) => { K.faceWash(g2, m, '#b8c4c0', s, { bloom: .5 }); P.glow(g2, ...m(.3, .3), 26, '#ffffff', .25); },
      left: (g2, m, s) => { K.faceWash(g2, m, '#98a6a2', s); P.wash(g2, K.quad(m, .3, .15, .7, .78, 3), { color: '#3a3430', seed: s + 3, alpha: .9, rough: .6 }); },
      top: (g2, m, s) => { K.faceWash(g2, m, '#d0dad6', s); for (const v of [.3, .65]) P.wash(g2, K.quad(m, .12, v - .08, .88, v + .08, 3), { color: '#2a2422', seed: s + v * 10, alpha: .95, rough: .4 }); },
    } });
    K.stool(g, R, -470, 1650, { seed: 27, h: 190, color: '#6a4a30' });
    K.grade(g, 1080, 1440, { k: .3, warmK: .1, light: R.proj(380, 760, R.back), fallK: .65, fall: '#6a4a2a', warm: '#ffa850', warmK: .2 });
  },
}];

const fx = [
  { z: 1, draw(ctx, t) { const r = P.rng(3); ctx.save(); ctx.globalCompositeOperation = 'screen'; for (let i = 0; i < 40; i++) { const x0 = 520 + r() * 420, y0 = 400 + r() * 560, sp = .3 + r() * .5, ph = r() * 9; const x = x0 + Math.sin(t * sp + ph) * 20 - t * 3, y = y0 + Math.cos(t * sp * .8 + ph) * 16 - t * 2; ctx.fillStyle = P.css('#fff6d8', Math.max(0, (.25 + .35 * Math.sin(t * 1.4 + ph)) * .55)); ctx.beginPath(); ctx.arc(x, y, 1.3 + r() * 1.4, 0, 7); ctx.fill(); } ctx.restore(); } },
  { z: 2, draw(ctx, t) { // the lever: a black handle from the slot in the toaster's side, ending in a round knob
    const y = leverY(t), sc = R.scaleAt(KNOB.Z), a = R.proj(TOAST.x0, y + 6, KNOB.Z), b = R.proj(KNOB.X, y + 6, KNOB.Z);
    P.ink(ctx, [a, b], { width: 12 * sc, color: '#2a2422', alpha: .97, seed: 31, taper: [0, 0] });
    P.wash(ctx, P.ellipse(b[0], b[1], 13 * sc, 10 * sc, 16), { color: '#3a3230', seed: 33, alpha: .97, rough: .4, tooth: 0 });
    P.pen(ctx, [...P.ellipse(b[0], b[1], 13 * sc, 10 * sc, 12), [b[0] + 13 * sc, b[1]]], { seed: 35, alpha: .6 });
  } },
];

// ── the critter ──
export const chu = new Critter({ name: 'Chu', a: 80, seed: 2, ears: { type: 'mouse', size: .95 }, eyes: { w: .23, h: .3, gap: .42, y: .06, pupil: 'dot' }, whiskers: 2, tail: { type: 'cat', len: 1.7, w: .09 }, wear: { type: 'shorts', color: '#e0b23a' } });
const A = chu.a;
const SPOT = [132, 1350], FROM = [-300, 1820], AWAY = [-260, 1760];
const yIn = Math.atan2(SPOT[0] - FROM[0], -(SPOT[1] - FROM[1])), yT = 1.72, yOut = Math.atan2(AWAY[0] - SPOT[0], -(AWAY[1] - SPOT[1])) + Math.PI * 2;
const at = keyed(stand(chu, { at: SPOT, yaw: yT, seed: 1 }), [
  { t: 3.25 },
  { t: 3.55, head: { nod: .2, gaze: [.4, .4] }, arms: { R: { a: .5, e: .8 } } },                                                 // look: this one has a lever
  { t: 3.85, tiptoe: .9, arms: { R: { target: knob(8), w: 1 } }, head: { nod: .25, gaze: [.6, .5] } }, // try: up on its toes, hand on the knob
  { t: 4.15, tiptoe: .2, crouch: .03 * A, arms: { R: { target: knob(8), w: 1 } } },              //   …and down it goes
  { t: 4.45, arms: { R: { a: .15, e: .65, w: 0 } }, head: { nod: .1, gaze: [.4, .2] } },
  { t: 4.9, head: { tilt: .22, nod: .15, gaze: [.5, .3] } },                                      // wait: here it comes…
  { t: 5.8, head: { tilt: .28, nod: .2, gaze: [.6, .4] } },
  { t: 5.98, ease: 'snap', head: { tilt: 0, nod: -.15, gaze: [.6, 0] }, lean: -.08 },             // the lever pops up: empty
  { t: 6.3, lean: 0, head: { nod: .2, gaze: [.6, .4] } },
  { t: 6.5, crouch: .2 * A, lean: .16, squash: .25, antic: true, arms: { R: { a: -.3, e: .9 }, L: { a: -.2, e: .9 } } }, // again: gather…
  { t: 6.72, ease: 'snap', hop: .18 * A, big: true, arms: { R: { target: knob(8), w: 1 }, L: { target: knob(20), w: 1 } } }, // …both hands, down it goes
  { t: 6.95, ease: 'in', crouch: .12 * A, squash: .18, arms: { R: { target: knob(8), w: .5 }, L: { a: .2, e: .6, w: 0 } } },
  { t: 7.3, ease: 'back', settle: true, arms: { R: { a: .1, e: .65, w: 0 }, L: { a: .1, e: .65, w: 0 } }, head: { nod: .2, gaze: [.6, .4] } },
  { t: 7.95, head: { tilt: .2, nod: .2, gaze: [.6, .4] } },
  { t: 8.08, ease: 'snap', head: { tilt: 0, nod: -.1, gaze: [.6, 0], lid: .3 } },                  // nothing: up it pops, empty again
  { t: 8.6, lean: .22, crouch: .03 * A, head: { nod: .45, gaze: [.4, 1], lid: .4 } },               // after: peeks into the slot
  { t: 9.2, lean: .2, head: { nod: .5, gaze: [.3, 1], lid: .5 } },
  { t: 9.5, lean: 0, head: { nod: .05, lid: .5, gaze: [0, .3] } },
]);
const pose = seq([
  [2.8, walk(chu, { from: FROM, to: SPOT, t0: .3, t1: 2.8 })],
  [3.25, turn(chu, { at: SPOT, from: yIn, to: yT, t0: 2.8, t1: 3.25 })],
  [9.55, at],
  [10.1, keyed(turn(chu, { at: SPOT, from: yT, to: yOut, t0: 9.55, t1: 10.1 }), [{ t: 9.55, head: { lid: .5 } }])],
  [99, keyed(walk(chu, { from: SPOT, to: AWAY, t0: 10.22, t1: 12.9, stride: 1.5 * A }), [{ t: 10, head: { lid: .4 } }])],
]);

export const film = new Vignette({
  W: 1080, H: 1440, fps: 24, dur: 11.4, seed: 2, title: '누르면 토스트가 나오는 줄 알았다 — shadow-critter-vignette',
  caption: '누르면 토스트가 나오는 줄 알았다',
  room, plates, fx, light: R.proj(380, 760, R.back), shadow: .6, rim: .55,
  cast: [{ actor: chu, pose, z: 5 }],
  beats: [{ t: .3, name: 'arrive' }, { t: 3.55, name: 'look' }, { t: 3.85, name: 'try' }, { t: 4.6, name: 'wait' }, { t: 6.4, name: 'again' }, { t: 8.08, name: 'nothing' }, { t: 8.4, name: 'after' }, { t: 9.55, name: 'leave' }],
  sound: { surface: 'wood', amb: ['room', 'birds', 'hum'], events: [[4.12, 'press', { gain: .8 }], [4.16, 'clunk', { gain: .4 }], [5.96, 'ding', { f: 1500, gain: .6 }], [5.97, 'pop', { gain: .5 }], [6.7, 'press', { gain: 1 }], [6.73, 'clunk', { gain: .6 }], [6.95, 'thud', { gain: .5 }], [8.06, 'ding', { f: 1500, gain: .6 }], [8.07, 'pop', { gain: .5 }], [8.7, 'hm', { f: 380, gain: .7 }]] },
  grade: { k: .45, warmK: .1, cx: .55, cy: .42 },
});
export const score = makeScore({ seed: 3 });
export const ACTORS = [chu];

// 「책을 당기면 비밀 문이 열리는 줄 알았다」 — the worked example: a bear-eared critter in an old reading room pulls the one
// book that sticks out, waits for the shelf to swing open, pulls harder, and puts it back. Topic → BRIEF.md → this file.
import * as P from 'scv/paint.js';
import * as K from 'scv/room.js';
import { Critter } from 'scv/critter.js';
import { Vignette, walk, stand, turn, keyed, seq } from 'scv/vignette.js';
import { makeScore } from 'scv/score.js';

// ── the room: a reading room in an old house, late afternoon, the window at the back ──
export const room = K.makeRoom({ W: 1080, H: 1440, horizon: 650, vpX: 470, eye: 520, refZ: 1000, left: -760, right: 600, back: 2500, ceiling: 1500, near: 480, light: { color: '#ffd98c' } });
const R = room;
const WIN = K.sub(R.walls.back, .1, .2, .56, .76);      // the window, on the back wall
const SHELF = { x0: 380, x1: 600, y0: 0, y1: 1180, z0: 1120, z1: 2350 };
const ROWS = 8, BROW = 6;                                 // shelf rows; the red book stands on row 6 (counted from the top)
const BOOK = { Y: SHELF.y1 * (1 - ((BROW + 1) / ROWS - .035)), Z: 1330, h: 82, w: 30 }; // the red book on the shelf face (X = SHELF.x0)
const BU = (SHELF.z1 - BOOK.Z) / (SHELF.z1 - SHELF.z0);    // where it sits along the face (u: 0 at the far end)
const tiltAt = t => {                                      // how far its top is pulled out (radians), keyed with the beats
  const keys = [[0, .06], [4.55, .06], [5.0, .27], [7.05, .27], [7.35, .62], [9.55, .62], [10.05, .06]];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [ta, a] = keys[i - 1], [tb, b] = keys[i]; return P.lerp(a, b, P.smooth(P.clamp((t - ta) / (tb - ta)))); }
  return keys[keys.length - 1][1];
};
const bookTop = (t, k = 1) => { const a = tiltAt(t), X = SHELF.x0 - Math.sin(a) * BOOK.h * k, Y = BOOK.Y + Math.cos(a) * BOOK.h * k; return R.proj(X, Y, BOOK.Z); };

const plates = [{
  // in front of everything: a low crate in the near corner, dark against the room, a jar and books on it
  z: 10, paint(g) {
    const T = { x0: -430, x1: -210, y0: 0, y1: 190, z0: 720, z1: 930 };
    const top = K.box(g, R, T, { seed: 171, color: '#3e2a1c', faces: { right: (g2, m, s) => { K.faceWash(g2, m, '#2e1e14', s); P.pen(g2, [m(.5, .1), m(.5, .9)], { seed: s + 1, alpha: .35 }); }, front: (g2, m, s) => K.faceWash(g2, m, '#38261a', s), top: (g2, m, s) => K.faceWash(g2, m, '#5a3e28', s, { bloom: .9 }) } }).top;
    const sc = R.scaleAt(820), p = top(.62, .45); K.jar(g, p[0], p[1], 46 * sc, 70 * sc, { seed: 173, fill: '#6a8a4a', level: .55, glass: '#a9bdb2' });
    K.books(g, ...top(.3, .65), sc * .8, { seed: 175, n: 3 });
  },
}, {
  z: 0, paint(g) {
    K.shell(g, R, { wall: '#5a3e2a', back: '#6c4b32', floor: '#86593a', ceiling: '#2a1c14', boards: 13, beams: 4, seed: 12, dark: .45 });
    // back wall: frames, notes, the window with a little table under it
    K.frame(g, K.sub(R.walls.back, .62, .14, .8, .36), { frame: '#4a3524', color: '#7f9a8e', seed: 3, paint: (g2, m, s) => { P.wash(g2, K.quad(m, 0, .55, 1, 1, 4), { color: '#5d7a52', seed: s + 4, alpha: .8 }); P.wash(g2, P.ellipse(...m(.3, .35), 14, 10, 12), { color: '#e9d8a0', seed: s + 5, alpha: .8 }); } });
    K.frame(g, K.sub(R.walls.back, .66, .42, .84, .56), { frame: '#5a4030', color: '#c9b48c', seed: 4 });
    K.note(g, K.sub(R.walls.back, .86, .3, .95, .4), { seed: 5, lines: 3 });
    const open = K.windowLight(g, R, WIN, { cols: 2, rows: 3, seed: 21, outside: ['#fff6d6', '#f3d27a', '#b8b25e'], frame: '#4e3a28' });
    void open;
    K.box(g, R, { x0: -620, x1: -170, y0: 0, y1: 300, z0: 2250, z1: 2480 }, { color: '#6c4e36', seed: 31 });
    K.plant(g, ...R.floor(-520, 2330).map((v, i) => i ? v - 300 * R.scaleAt(2330) : v), R.scaleAt(2330) * 1.6, { seed: 33, pot: '#9a5e3e' });
    for (let i = 0; i < 3; i++) { const p = R.proj(-330 + i * 52, 300, 2330); K.jar(g, p[0], p[1], 30 * R.scaleAt(2330) * 1.7, 46 * R.scaleAt(2330) * 1.7, { seed: 40 + i, fill: ['#7a9a5a', '#c9893a', null][i], level: .5 }); }
    // left wall: a tall clock and coat hooks
    const clock = K.box(g, R, { x0: -760, x1: -600, y0: 0, y1: 860, z0: 1300, z1: 1520 }, { color: '#5c4030', seed: 51, faces: { right: false } });
    { const m = K.sub(R.walls.left, .32, .22, .44, .34); void m; const c = clock.front(.5, .2), sc = R.scaleAt(1300); P.wash(g, P.ellipse(c[0], c[1], 44 * sc, 44 * sc, 24), { color: '#efe2c0', seed: 52, alpha: .95 }); P.pen(g, [c, [c[0] + 4, c[1] - 30 * sc]], { seed: 53, width: 2 }); P.pen(g, [c, [c[0] + 22 * sc, c[1] + 6]], { seed: 54, width: 2 }); }
    for (let i = 0; i < 3; i++) { const p = R.proj(-760, 1000, 1700 + i * 160); P.pen(g, [p, [p[0] + 14, p[1] + 6]], { seed: 60 + i, width: 3, alpha: .8 }); }
    P.wash(g, [R.proj(-760, 1000, 1880), R.proj(-760, 1000, 1960), R.proj(-760, 620, 1990), R.proj(-760, 640, 1840)].map(p => [p[0] + 10, p[1]]), { color: '#6a5a7a', seed: 64, alpha: .9 });
    // a rug, and the light from the window across the floor
    const rug = R.face([[-420, 0, 2050], [180, 0, 2050], [180, 0, 1250], [-420, 0, 1250]]);
    P.wash(g, K.quad(rug, 0, 0, 1, 1, 8), { color: '#8e4a3a', seed: 70, alpha: .85, bloom: .8 });
    P.wash(g, K.quad(rug, .08, .1, .92, .9, 8), { color: '#b8784a', seed: 71, alpha: .5, edge: .6 });
    K.lightShaft(g, R, WIN, { dz: 1150, dx: 140, k: .85, cols: 2, rows: 3, color: '#ffc46a' });
    // things on the floor: a stack of books by the shelf, a stool by the window
    K.stool(g, R, -470, 1900, { seed: 141 });
    K.books(g, ...R.floor(250, 1180), R.scaleAt(1180) * 1.15, { seed: 151, n: 4 });
    K.books(g, ...R.floor(-560, 1500), R.scaleAt(1500) * 1.1, { seed: 157, n: 3 });
    // the hanging lamp (unlit)
    K.lamp(g, R, -60, 1500, { y: 1080, w: 170, h: 80, color: '#6e4c38', seed: 81 });
    // the tall bookshelf on the right wall: its face looks into the room
    K.box(g, R, SHELF, { seed: 91, color: '#5a3e2a', faces: {
      left: (g2, m, s) => {
        K.faceWash(g2, m, '#4a3222', s, { bloom: .8 });
        const rows = ROWS, r = P.rng(s);
        for (let j = 0; j < rows; j++) {
          const v0 = j / rows + .02, v1 = (j + 1) / rows - .035;
          K.faceWash(g2, K.sub(m, .02, v0, .98, v1), '#2c1d14', s + j, { line: false, edge: .2 });
          // books: spines of different heights and colours, a gap where the red one sits
          let u = .04; while (u < .95) { const bw = .018 + r() * .02, ht = .5 + r() * .38; const col = P.pick([['#7a3a2e', 2], ['#3e5a4a', 2], ['#8a6a3a', 2], ['#4a4a6a', 1], ['#a8905a', 1], ['#5e2e3a', 1]], r);
            const isGap = j === BROW && u > BU - .035 && u < BU + .03; if (!isGap) { K.faceWash(g2, K.sub(m, u, v1 - (v1 - v0) * ht, u + bw, v1), col, s + 100 + j * 50 + Math.floor(u * 100), { edge: .5, bloom: .4, lineAlpha: .35 }); if (r() < .4) P.pen(g2, [m(u + .002, v1 - (v1 - v0) * ht * .7), m(u + bw - .002, v1 - (v1 - v0) * ht * .7)], { seed: s + j + u, alpha: .4, color: '#e0c890' }); }
            u += bw + .003; }
        }
      },
      front: (g2, m, s) => K.faceWash(g2, m, '#5e4230', s),
      top: (g2, m, s) => K.faceWash(g2, m, '#6a4a34', s),
    } });
    K.grade(g, 1080, 1440, { k: .35, warmK: .1, cx: .4, cy: .4, light: R.proj(-160, 820, 2500), fallK: .7, fall: '#7a4a2a', warm: '#ff9a40', warmK: .22 });
  },
}];

// live bits: dust turning in the light, the red book (it moves when pulled)
const fx = [
  { z: 1, draw(ctx, t) { const r = P.rng(5); ctx.save(); ctx.globalCompositeOperation = 'screen'; for (let i = 0; i < 46; i++) { const x0 = 300 + r() * 360, y0 = 420 + r() * 600, sp = .3 + r() * .5, ph = r() * 9; const x = x0 + Math.sin(t * sp + ph) * 22 + t * 3, y = y0 + Math.cos(t * sp * .8 + ph) * 18 - t * 2; const a = (.25 + .35 * Math.sin(t * 1.3 + ph)) * .55; ctx.fillStyle = P.css('#fff2c8', Math.max(0, a)); ctx.beginPath(); ctx.arc(x, y, 1.3 + r() * 1.5, 0, 7); ctx.fill(); } ctx.restore(); } },
  { z: 2, draw(ctx, t) {
    // the red book: its foot stays on the shelf, its top comes out into the room
    const a = tiltAt(t), base = [R.proj(SHELF.x0, BOOK.Y, BOOK.Z - BOOK.w / 2), R.proj(SHELF.x0, BOOK.Y, BOOK.Z + BOOK.w / 2)];
    const tp = z => R.proj(SHELF.x0 - Math.sin(a) * BOOK.h, BOOK.Y + Math.cos(a) * BOOK.h, z);
    const top = [tp(BOOK.Z - BOOK.w / 2), tp(BOOK.Z + BOOK.w / 2)];
    const spine = [base[0], top[0], top[1], base[1]];
    P.wash(ctx, spine, { color: '#b23a2a', seed: 7, alpha: .97, edge: .5, rough: .6, bloom: .3, tooth: 0 });
    const band = k => P.lp(base[0], top[0], k), band2 = k => P.lp(base[1], top[1], k);
    for (const k of [.2, .8]) P.pen(ctx, [band(k), band2(k)], { seed: 9 + k, color: '#f0c860', alpha: .8, width: 2 });
    P.pen(ctx, [...spine, spine[0]], { seed: 11, alpha: .55 });
  } },
];

// ── the critter ──
export const kuma = new Critter({ name: 'Kuma', a: 88, seed: 4, ears: { type: 'bear', size: 1.05, spread: .7 }, eyes: { w: .24, h: .33, gap: .4, y: .08, pupil: 'oval' }, whiskers: 0, tail: { type: 'puff' }, wear: { type: 'scarf', color: '#c0473a' } });
const A = kuma.a;
const SPOT = [292, 1400], FROM = [-170, 2000], AWAY = [-130, 1990];
const yIn = Math.atan2(SPOT[0] - FROM[0], -(SPOT[1] - FROM[1])), yShelf = 2.05, yOut = Math.atan2(AWAY[0] - SPOT[0], -(AWAY[1] - SPOT[1])) + Math.PI * 2;
const hand = t => bookTop(t, .9);
const atShelf = keyed(stand(kuma, { at: SPOT, yaw: yShelf, seed: 2 }), [
  { t: 3.6 },
  { t: 3.95, head: { nod: -.55, gaze: [0, -1] } },                                               // look: there it is
  { t: 4.25, head: { nod: -.5, gaze: [.2, -1] }, arms: { R: { a: .3, e: .5 } } },
  { t: 4.55, tiptoe: 1, lean: .06, arms: { R: { target: hand, w: 1 } } },                          // try: up on its toes
  { t: 5.0, tiptoe: 1, lean: -.1, shift: -.05 * A, arms: { R: { target: hand, w: 1 } } },                          //   …and pull
  { t: 5.35, tiptoe: 0, ease: 'out', arms: { R: { a: .1, e: .65, w: 0 } }, head: { nod: -.3, gaze: [.6, -.3] } },
  { t: 5.8, head: { turn: .75, nod: -.1, gaze: [1, 0] } },                                       // wait: the wall, any moment now
  { t: 6.7, head: { turn: .7, nod: -.12, gaze: [1, .1] } },
  { t: 7.0, head: { nod: -.5, gaze: [0, -1] } },
  { t: 7.15, crouch: .22 * A, lean: .14, squash: .25, antic: true, head: { nod: -.55, gaze: [0, -1] }, arms: { R: { a: -.25, e: .7 } } }, // again: gather…
  { t: 7.35, ease: 'snap', hop: .32 * A, tiptoe: 1, lean: -.12, big: true, arms: { R: { target: hand, w: 1 } } },          //   …jump and yank
  { t: 7.6, ease: 'in', crouch: .14 * A, squash: .2, arms: { R: { target: hand, w: .6 } } },                                   //   land
  { t: 7.95, ease: 'back', settle: true, arms: { R: { a: .12, e: .65, w: 0 } }, head: { nod: -.35, gaze: [0, -.6] } },
  { t: 8.4, head: { turn: .8, nod: -.1, gaze: [1, 0] } },                                        // nothing: the wall again
  { t: 9.0, head: { turn: .75, nod: 0, gaze: [.8, .2], lid: .45 } },
  { t: 9.3, crouch: .04 * A, lean: .1, head: { nod: -.3, gaze: [0, -.6], lid: .5 } },            // after: glum, put it back
  { t: 9.55, tiptoe: .6, arms: { R: { target: hand, w: 1 } }, head: { nod: -.45, lid: .45 } },
  { t: 10.05, tiptoe: .6, arms: { R: { target: hand, w: 1 } }, head: { nod: -.4, lid: .5 } },
  { t: 10.4, tiptoe: 0, arms: { R: { a: .1, e: .65, w: 0 } }, head: { nod: 0, lid: .5, gaze: [0, .3] } },
]);
const pose = seq([
  [3.0, walk(kuma, { from: FROM, to: SPOT, t0: .3, t1: 3.0 })],
  [3.6, turn(kuma, { at: SPOT, from: yIn, to: yShelf, t0: 3.0, t1: 3.6 })],
  [10.45, atShelf],
  [11.05, keyed(turn(kuma, { at: SPOT, from: yShelf, to: yOut, t0: 10.45, t1: 11.05 }), [{ t: 10.45, head: { lid: .5 } }, { t: 11.05, head: { lid: .3 } }])],
  [99, keyed(walk(kuma, { from: SPOT, to: AWAY, t0: 11.05, t1: 13.6, stride: 1.4 * A }), [{ t: 11, head: { lid: .3, nod: .1 } }])],
]);

export const film = new Vignette({
  W: 1080, H: 1440, fps: 24, dur: 12.8, seed: 3, title: '책을 당기면 비밀 문이 열리는 줄 알았다 — shadow-critter-vignette',
  caption: '책을 당기면 비밀 문이 열리는 줄 알았다',
  room, plates, fx, light: R.proj(-160, 820, 2500), shadow: .6, rim: .55,
  cast: [{ actor: kuma, pose, z: 5 }],
  beats: [{ t: .3, name: 'arrive' }, { t: 3.9, name: 'look' }, { t: 4.4, name: 'try' }, { t: 5.6, name: 'wait' }, { t: 7.0, name: 'again' }, { t: 8.2, name: 'nothing' }, { t: 9.3, name: 'after' }, { t: 11.05, name: 'leave' }],
  sound: { surface: 'wood', amb: ['room', 'clock', 'birds'], events: [[4.7, 'slide', { dur: .3, gain: .6 }], [4.95, 'creak', { f: 160, dur: .3, gain: .5 }], [7.36, 'slide', { dur: .25, gain: .9 }], [7.6, 'thud', { gain: .8 }], [9.15, 'sigh', { dur: .7, gain: .7 }], [9.95, 'slide', { dur: .35, gain: .6 }], [10.05, 'tap', { gain: .7 }]] },
  grade: { k: .5, warmK: .12, cx: .42, cy: .42 },
});
export const score = makeScore({ seed: 5, amb: ['room', 'clock'] });
export const ACTORS = [kuma];

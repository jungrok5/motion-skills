// 「Market Day」 — worked example of storybook-short (BRIEF.md). Five shots, 42 s, 1920×1080, every sound Web Audio.
// Mina wakes to a market Saturday → the street market with Grandpa → the walk home along the canal → ice cream on the
// bench (the big move: her scoop topples, Grandpa offers his) → her grin, ice cream on her nose.
import { Film, walk, stand, sit, keyed } from '../lib/film.js';
import { Actor } from '../lib/body.js';
import * as K from '../lib/kit.js';
import * as C from '../lib/critters.js';
import * as P from '../lib/paint.js';
import { makeScore } from '../lib/score.js';
import { MINA, MINA_CLOSE, MINA_NOSE, GRANDPA, GRANDPA_SIT, ACTORS } from './cast.js';

export const film = new Film({ W: 1920, H: 1080, seed: 52, title: 'Market Day', paper: '#fbf7ee', fadeOut: 1.4 });
export const score = makeScore({ key: 'G', tempo: 100, progression: ['I', 'IV', 'vi', 'V'], seed: 52 });
export { ACTORS };
const SKY = { top: '#79b0de', bottom: '#f1f0e4' };
const INK = '#241c22';

// the far bank of the canal: houses with gables, poplars, used by three shots
const farBank = (g, x0, x1, y, seed) => {
  const cols = [['#f0b36a', '#c0573a'], ['#e88a7a', '#7a4a8a'], ['#f2d06a', '#c0573a'], ['#9cc0d8', '#3f5f8a'], ['#e9c8a0', '#a0503a'], ['#c6a0d8', '#5a3a7a']];
  let x = x0, i = 0;
  while (x < x1) { const w = 120 + P.rng(seed + i)() * 70, h = 150 + P.rng(seed + i + 50)() * 110, [wall, roof] = cols[i % cols.length]; K.house(g, x, y, w, h, { wall, roofColor: roof, rows: 2, cols: 2, shutters: i % 2 ? '#5f9e6a' : null, seed: seed + i * 7, boxes: i % 3 === 0 ? ['#e0503a', '#f2c94c'] : null }); if (i % 3 === 1) K.tree(g, x + w + 14, y + 4, 300, { kind: 'poplar', seed: seed + 90 + i, colors: ['#5f9e4a', '#4a8a3a', '#8cc05a'] }); x += w + (i % 3 === 1 ? 40 : 6); i++; }
};

// ── 1 · window: Mina at her window on a market morning; the cat on the sill; she looks out, then at us ──
const WIN = [1160, 150, 560, 500];
film.shot({
  name: 'window', dur: 7.2, in: 'paper', res: 1.1,
  cam: [[0, { x: 960, y: 540, zoom: 1.03 }], [7.2, { x: 940, y: 540, zoom: 1.0 }]],
  plates: [{ depth: .6, bb: [-150, -100, 2070, 1180], paint: (g) => {
    K.wall(g, [-150, -100, 2070, 1180], { color: '#f4d9a0', stripe: '#e9b98a', seed: 3 });
    const sill = K.window_(g, ...WIN, { seed: 4, curtain: ['#e9867a', '#fbf1e2'], view: (v, bb) => { K.sky(v, bb, { ...SKY, seed: 5 }); K.cloud(v, bb[0] + 150, bb[1] + 110, 200, { seed: 6 }); farBank(v, bb[0] - 40, bb[2] + 40, bb[3] - 30, 70); K.ground(v, [[bb[0], bb[3] - 32], [bb[2], bb[3] - 32], [bb[2], bb[3]], [bb[0], bb[3]]], { seed: 7, n: 30 }); } });
    K.pot(g, WIN[0] + 60, sill, 70, { seed: 8, flowers: ['#e0503a', '#f2c94c'] }); K.pot(g, WIN[0] + WIN[2] - 40, sill, 56, { seed: 9, pot: '#4f86c6' });
    // a shelf with jars on the left wall
    const sh = [[-60, 360], [430, 360], [430, 378], [-60, 378]]; P.gouache(g, sh, { color: '#c98d4f', seed: 10, mottle: .4, edge: .4 }); P.ink(g, [...sh, sh[0]], { width: 1.2, color: INK, seed: 11, alpha: .5, taper: [0, 0] });
    [[40, '#e0503a'], [130, '#f2c94c'], [230, '#5fae6a'], [330, '#4f86c6']].forEach(([x, c], i) => { const j = P.spline([[x - 32, 360], [x - 34, 300], [x - 24, 286], [x + 24, 286], [x + 34, 300], [x + 32, 360]], 4, true); P.gouache(g, j, { color: '#e9f0ec', seed: 12 + i, mottle: .3, edge: .4 }); P.gouache(g, P.ellipse(x, 335, 26, 22, 18), { color: c, seed: 20 + i, mottle: .4 }); P.ink(g, j, { width: 1.1, color: INK, seed: 30 + i, alpha: .5 }); });
  } }],
  fx: [
    { depth: .6, z: .5, draw: (g, t) => { g.save(); g.beginPath(); g.rect(WIN[0], WIN[1], WIN[2], WIN[3] - 40); g.clip(); C.birds(g, t, { n: 3, seed: 4, x0: WIN[0] - 80, x1: WIN[0] + WIN[2] + 80, y: WIN[1] + 120, speed: 60, span: 10 }); g.restore(); } },
    { depth: .6, z: 1, draw: (g, t) => C.cat(g, WIN[0] + 300, WIN[1] + WIN[3] + 14, 105, t, { dir: -1, look: t > 3.2 ? 1 : 0 }) },
  ],
  cast: [{ actor: MINA_CLOSE, pose: stand(MINA_CLOSE, { x: 720, y: MINA_CLOSE.groundFor(560), seed: 1 }),
    motion: { mass: 'light', expression: 'calm', seed: 11, gaze: [.9, -.2], breath: { period: 3.5 },
      beats: [{ t: .5, gaze: [.95, -.35], head: { yaw: .1, tilt: .05 } }, { t: 3.4, gaze: [.6, .3] }, { t: 4.3, gaze: [0, 0], head: { yaw: 0, tilt: -.03 }, expression: 'pleased' }, { t: 6.0, gaze: [-.2, -.1] }] } }],
  sound: { amb: ['room', 'birds'], music: 'soft', events: [[3.3, 'meow', { x: 1460 }]] },
});

// ── 2 · market: the street market, a painted spread with the paper at its edges; Grandpa buys peaches ──
const MG = 930;
film.shot({
  name: 'market', dur: 8.4, in: 'dissolve', vignette: { inset: 34 },
  cam: [[0, { x: 960, y: 540, zoom: 1.0 }], [8.4, { x: 1010, y: 580, zoom: 1.08 }]],
  plates: [
    { depth: .3, bb: [-200, -150, 2120, 600], paint: g => { K.sky(g, [-200, -150, 2120, 600], { ...SKY, seed: 40 }); K.cloud(g, 400, 120, 320, { seed: 41 }); K.cloud(g, 1500, 90, 260, { seed: 42 }); } },
    { depth: .7, bb: [-300, 120, 2300, 900], paint: g => { farBank(g, -300, 2300, 800, 140); K.ground(g, [[-300, 795], [2300, 795], [2300, 900], [-300, 900]], { seed: 43, colors: ['#e3cfa6', '#d2b98a'] }); } },
    { depth: 1, bb: [-200, 380, 2200, 1200], paint: g => {
      K.ground(g, [[-200, 880], [2200, 880], [2200, 1200], [-200, 1200]], { seed: 44, colors: ['#e8d6b0', '#d6be92'], n: 260 });
      K.stall(g, 120, MG - 10, 300, { seed: 45, awning: ['#3f74ad', '#fbf3e3'], cloth: '#e0503a', fruit: [['#9cc34a', '#7fae3a'], ['#d6402e', '#b83226'], ['#f2d24a', '#e9b13a']] });
      K.stall(g, 1240, MG - 10, 340, { seed: 46, awning: ['#e0503a', '#fbf3e3'], cloth: '#3f74ad', fruit: [['#f6a26a', '#f08a5a'], ['#f08a24', '#e9b13a'], ['#7a3f8a', '#5a2f6a']] });
      K.stall(g, 1660, MG - 10, 260, { seed: 47, awning: ['#5fae6a', '#fbf3e3'], cloth: '#f2c94c', fruit: [['#e0503a', '#f2d24a'], ['#5f9e4a', '#9cc34a']] });
      K.lamp(g, 560, MG, 300, { seed: 48 });
    } },
  ],
  fx: [
    { depth: .3, z: .5, draw: (g, t) => C.birds(g, t + 3, { n: 4, seed: 5, y: 160, speed: 70 }) },
    { depth: .7, z: 2, draw: (g, t) => C.bunting(g, [-100, 300], [2100, 330], t, { n: 22, sag: 70 }) },
    { depth: 1, z: 7, draw: (g, t) => { const d = Math.max(0, t - 1) * 190; C.dog(g, -150 + d, 1010, 70, d, { t, color: '#f2f0ea', ear: '#3a2a22' }); } },
  ],
  cast: [
    { actor: GRANDPA, pose: keyed(stand(GRANDPA, { x: 1130, y: MG, yaw: .45, seed: 2 }), [{ t: 0 }, { t: 2.6, arms: { far: { a: .9, e: .8 } } }, { t: 3.4, arms: { far: { a: .9, e: .8 } } }, { t: 4.2 }]),
      motion: { mass: 'heavy', expression: 'calm', seed: 21, gaze: [.6, .3], beats: [{ t: 4.8, gaze: [-.7, .4], head: { yaw: -.1, tilt: -.05 }, expression: 'pleased' }, { t: 6.8, gaze: [.6, .3], head: { yaw: 0, tilt: 0 } }] } },
    { actor: MINA, z: 6, pose: stand(MINA, { x: 930, y: MG + 30, yaw: .45, seed: 3 }),
      motion: { mass: 'light', expression: 'pleased', seed: 22, gaze: [.7, -.4], beats: [{ t: 1.2, gaze: [-.8, .5], head: { yaw: -.12, tilt: -.05 } }, { t: 2.6, gaze: [.6, -.6], head: { yaw: .05, tilt: .04 } }, { t: 5.0, gaze: [.9, -.7], expression: 'surprised' }, { t: 5.6, expression: 'pleased' }] } },
  ],
  sound: { amb: ['crowd', 'birds'], music: 'full', surface: 'stone', events: [[1.4, 'woof', { x: 200 }], [4.6, 'bell', { x: 1500 }]] },
});

// ── 3 · canal: the walk home along the canal; Mina in front, Grandpa behind with the basket; ducks on the water ──
const CG = 950, minaWalk = walk(MINA, { from: 420, to: 1560, y: CG, t0: .4, t1: 9.6 }), gpWalk = walk(GRANDPA, { from: 170, to: 1330, y: CG - 12, t0: .7, t1: 9.9, yaw: .45 });
const canalBg = (g, seedBase, x0 = -400, x1 = 2600) => {
  K.sky(g, [x0, -150, x1, 560], { ...SKY, seed: seedBase }); K.cloud(g, x0 + 600, 130, 360, { seed: seedBase + 1 }); K.cloud(g, x0 + 1700, 90, 300, { seed: seedBase + 2 }); K.cloud(g, x0 + 2500, 150, 240, { seed: seedBase + 3 });
  farBank(g, x0, x1, 640, seedBase + 10);
  K.ground(g, [[x0, 636], [x1, 636], [x1, 668], [x0, 668]], { seed: seedBase + 4, colors: ['#c9b38a', '#b89f78'], n: 60 });
};
film.shot({
  name: 'canal', dur: 10.4, in: 'dissolve',
  cam: t => { const p = minaWalk(t); return { x: P.clamp(p.x - 60, 760, 1400), y: 560, zoom: 1.0 }; },
  plates: [
    { depth: .55, bb: [-400, 60, 2700, 700], paint: g => canalBg(g, 60) },
    { depth: .8, bb: [-400, 660, 2700, 860], paint: g => { K.water(g, [-400, 668, 2700, 860], { seed: 61, glints: 160 }); } },
    { depth: 1, bb: [-300, 520, 2600, 1200], paint: g => { const curb = [[-300, 846], [2600, 846], [2600, 878], [-300, 878]]; P.gouache(g, curb, { color: '#c9c0b0', seed: 62, mottle: .4, edge: .3 }); P.crayon(g, curb, { color: '#b7ad9c', angle: .1, gap: 3, alpha: .6, under: false, seed: 63 }); for (let x = -300; x < 2600; x += 90) P.ink(g, [[x, 848], [x + 4, 876]], { width: 1.2, color: INK, seed: 64 + x, alpha: .4 }); K.ground(g, [[-300, 878], [2600, 878], [2600, 1200], [-300, 1200]], { seed: 65, colors: ['#e3d3b0', '#cfbb94'], n: 400 }); for (const x of [300, 1250, 2200]) K.lamp(g, x, 900, 320, { seed: 66 + x }); } },
    { depth: 1.18, z: 9, front: true, bb: [-500, 1000, 2900, 1200], paint: g => K.hill(g, [[-500, 1050], [500, 1030], [1400, 1060], [2900, 1035]], 1200, { colors: ['#8cbf5a', '#6aa14a'], seed: 67, density: 1.4 }) },
  ],
  fx: [
    { depth: .8, z: 1, draw: (g, t) => { for (const [x, sp, s] of [[300, 18, 44], [380, 22, 36], [1500, -14, 44], [2100, 16, 40]]) C.duck(g, x + sp * t, 760 + (s - 40) * 2, s, t, { dir: Math.sign(sp) }); } },
    { depth: .55, z: .5, draw: (g, t) => C.birds(g, t + 9, { n: 4, seed: 6, y: 180, speed: 75 }) },
  ],
  cast: [
    { actor: GRANDPA, pose: gpWalk, z: 4, stepGain: .8, motion: { mass: 'heavy', expression: 'calm', seed: 23, gaze: [.7, .1], beats: [{ t: 5.2, gaze: [.9, -.1], expression: 'pleased' }] } },
    { actor: MINA, pose: minaWalk, z: 5, stepGain: .55, motion: { mass: 'light', expression: 'pleased', seed: 24, gaze: [.7, 0], beats: [{ t: 3.6, gaze: [-.9, .1], head: { yaw: -.13, tilt: -.06 } }, { t: 5.0, gaze: [.6, .6], head: { yaw: .04, tilt: .05 } }, { t: 6.8, gaze: [.8, 0], head: { yaw: 0, tilt: 0 } }] } },
  ],
  sound: { amb: ['water', 'birds'], music: 'full', surface: 'stone', events: [[2.2, 'quack', { n: 2, x: 400 }], [7.4, 'quack', { n: 3, x: 1600 }]] },
});

// ── 4 · bench: ice cream by the canal. The big move: Mina lifts her cone (gather), leans in for a lick (action), the scoop
//    topples and falls (plop), she sags (recovery) — then Grandpa holds his cone out to her ──
const FALL = 5.0, BX = 760, BG = 960;
const cone = (scoop, fallAt) => ({ draw: (ctx, hand, actor, pose, T) => {
  const a = actor.a, t = T - film.shots.find(s => s.name === 'bench').start, [hx, hy] = hand;
  ctx.save(); ctx.translate(hx, hy - a * .08);
  const tri = [[-a * .19, -a * .05], [a * .19, -a * .05], [0, a * .55]]; ctx.fillStyle = '#e2b26a'; ctx.beginPath(); tri.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.stroke();
  ctx.strokeStyle = 'rgba(140,90,40,.8)'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * a * .06 - a * .08, -a * .03); ctx.lineTo(i * a * .06 + a * .06, a * .3); ctx.stroke(); }
  const fallen = fallAt != null && t > fallAt;
  if (!fallen) { const wob = fallAt != null && t > fallAt - .5 ? Math.sin((t - fallAt + .5) * 30) * (t - fallAt + .5) * .25 : 0; ctx.rotate(wob); ctx.fillStyle = scoop; ctx.beginPath(); ctx.arc(0, -a * .2, a * .25, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,250,.7)'; ctx.beginPath(); ctx.arc(-a * .08, -a * .28, a * .06, 0, 7); ctx.fill(); }
  ctx.restore();
  if (fallen) { // the scoop drops to the ground and splats where it lands
    const u = t - fallAt, y = Math.min(BG - 4, hy - a * .22 + 900 * u * u), x = hx + 40 * u, landed = y >= BG - 4;
    ctx.save(); ctx.fillStyle = scoop; ctx.strokeStyle = INK; ctx.lineWidth = 1.1;
    if (!landed) { ctx.beginPath(); ctx.arc(x, y, a * .25, 0, 7); ctx.fill(); ctx.stroke(); }
    else { const lx = hx + 40 * Math.sqrt((BG - 4 - hy + a * .22) / 900); ctx.beginPath(); ctx.ellipse(lx, BG - 2, a * .4, a * .11, 0, 0, 7); ctx.fill(); ctx.stroke(); for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(lx + d * a * .38, BG - 4, a * .04, 0, 7); ctx.fill(); } }
    ctx.restore();
  }
} });
const MINA_ICE = new Actor({ ...MINA.spec, name: 'Mina (bench)', body: { ...MINA.spec.body, held: cone('#f7a6be', FALL) } });
const GP_ICE = new Actor({ ...GRANDPA_SIT.spec, body: { ...GRANDPA_SIT.spec.body, held: cone('#f3e0a0', null) } });
const SEAT = 104;
film.shot({
  name: 'bench', dur: 10.6, in: 'dissolve', res: 1.8,
  cam: [[0, { x: 960, y: 790, zoom: 1.55 }], [10.6, { x: 965, y: 800, zoom: 1.65 }]],
  plates: [
    { depth: .55, bb: [-400, 60, 2400, 700], paint: g => canalBg(g, 80, -400, 2400) },
    { depth: .8, bb: [-400, 660, 2400, 880], paint: g => K.water(g, [-400, 668, 2400, 880], { seed: 81, glints: 120 }) },
    { depth: 1, bb: [-200, 700, 2200, 1250], paint: g => { K.ground(g, [[-200, 870], [2200, 870], [2200, 1250], [-200, 1250]], { seed: 82, colors: ['#e3d3b0', '#cfbb94'], n: 300 }); K.pot(g, 560, BG, 110, { seed: 83, pot: '#c0573a', flowers: ['#f2a7c3', '#fbf3e0'] }); K.bench(g, BX - 30, BG, 460, { seed: 84, seat: 92 }); } },
  ],
  fx: [{ depth: .8, z: 1, draw: (g, t) => { const near = Math.min(1, Math.max(0, (t - FALL - .5) / 2.5)); C.duck(g, 1400 - near * 380, 800, 46, t, { dir: -1 }); C.duck(g, 300 + t * 10, 790, 40, t, { dir: 1 }); } }],
  cast: [
    { actor: GP_ICE, z: 5, pose: keyed(sit(GP_ICE, { x: BX + 290, y: BG, seat: SEAT, arms: { near: { a: .55, e: 1.6 }, far: { a: .15, e: .6 } } }), [
      { t: 0 }, { t: 6.6 }, { t: 7.2, lean: .04, arms: { near: { a: .75, e: 2.0 } }, antic: true }, { t: 7.7, lean: -.08, arms: { near: { a: -1.45, e: .15 } }, big: true }, { t: 8.4, lean: -.05, arms: { near: { a: -1.4, e: .2 } }, settle: true }]),
      motion: { mass: 'heavy', expression: 'calm', seed: 25, gaze: [-.3, .2], beats: [{ t: 5.3, gaze: [-.9, .5], expression: 'surprised' }, { t: 6.4, gaze: [-.8, .2], head: { yaw: -.1, tilt: -.06 }, expression: 'pleased' }, { t: 9.4, gaze: [-.3, .1], head: { yaw: 0, tilt: 0 } }] } },
    { actor: MINA_ICE, z: 6, pose: keyed(sit(MINA_ICE, { x: BX + 110, y: BG, seat: SEAT, arms: { near: { a: .45, e: 1.9 }, far: { a: .1, e: .5 } } }), [
      { t: 0 }, { t: 3.8 }, { t: 4.4, lean: -.07, crouch: -2, arms: { near: { a: .6, e: 2.25 } }, antic: true }, { t: 4.9, lean: .12, crouch: 4, arms: { near: { a: .45, e: 2.0 } }, big: true },
      { t: 5.6, lean: -.03, crouch: 0, settle: true }, { t: 6.2, lean: .02 }, { t: 7.9 }, { t: 8.6, lean: .1, arms: { far: { a: .5, e: 1.2 } } }, { t: 9.8, lean: .03 }]),
      motion: { mass: 'light', expression: 'pleased', seed: 26, gaze: [.1, -.5], beats: [{ t: 2.2, gaze: [.9, .2], head: { yaw: .1, tilt: .04 } }, { t: 3.6, gaze: [.05, -.8], head: { yaw: 0, tilt: 0 } }, { t: 5.1, gaze: [.2, .95], expression: 'surprised' }, { t: 5.9, expression: 'shy' }, { t: 7.0, gaze: [.9, .1], head: { yaw: .12, tilt: .06 } }, { t: 8.0, expression: 'pleased' }] } },
  ],
  sound: { amb: ['water', 'birds'], music: 'soft', events: [[4.9, 'swish', { x: 870 }], [FALL + .38, 'plop', { x: 900 }], [FALL + .42, 'splat', { x: 900 }], [6.4, 'quack', { n: 2, x: 1200 }], [7.7, 'chime']] },
});

// ── 5 · grin: Mina, ice cream on her nose, laughing at us ──
film.shot({
  name: 'grin', dur: 5.6, in: 'dissolve', res: 1.1,
  cam: [[0, { x: 960, y: 540, zoom: 1.0 }], [5.6, { x: 960, y: 530, zoom: 1.05 }]],
  plates: [{ depth: .4, bb: [-300, -150, 2300, 1250], paint: g => { canalBg(g, 90, -300, 2300); K.water(g, [-300, 668, 2300, 900], { seed: 91, glints: 90 }); K.ground(g, [[-300, 900], [2300, 900], [2300, 1250], [-300, 1250]], { seed: 92, colors: ['#e3d3b0', '#cfbb94'] }); } }],
  fx: [{ depth: .4, z: .5, draw: (g, t) => C.birds(g, t + 30, { n: 3, seed: 8, y: 200, speed: 80 }) }],
  cast: [{ actor: MINA_NOSE, pose: stand(MINA_NOSE, { x: 960, y: MINA_NOSE.groundFor(560), seed: 4 }),
    motion: { mass: 'light', expression: 'pleased', seed: 27, gaze: [-.6, -.8], beats: [{ t: .8, gaze: [-.1, -.95] }, { t: 1.6, gaze: [0, 0], head: { yaw: 0, tilt: .07 }, face: { mouthOpen: .45, mouthCurve: .9, lids: .25 }, ease: .15 }, { t: 3.4, face: { mouthOpen: 0, mouthCurve: .8 }, head: { yaw: .04, tilt: -.03 } }] } }],
  sound: { amb: ['water', 'birds'], music: 'full', events: [[1.6, 'pop']] },
});

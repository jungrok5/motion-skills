// 「Windy Walk」 — the starter of storybook-short (BRIEF.md). Two shots, 16 s: a close-up on a windy hilltop, then the
// walk home along the ridge path with the dog. One example of the style, not a menu: for a new topic write the brief,
// then design the cast (cast.js), the places (plates), the beats and the sound from it.
import { Film, walk, stand, keyed } from '../lib/film.js';
import * as K from '../lib/kit.js';
import * as C from '../lib/critters.js';
import { makeScore } from '../lib/score.js';
import { ROWAN, ROWAN_CLOSE, ACTORS } from './cast.js';

export const film = new Film({ W: 1920, H: 1080, seed: 21, title: 'Windy Walk', paper: '#fbf8f1' });
export const score = makeScore({ key: 'F', tempo: 92, progression: ['I', 'V', 'vi', 'IV'], seed: 21 });
export { ACTORS };

const SKY = { top: '#86b8e2', bottom: '#eef2ec' };

// ── 1 · hilltop, close-up: the wind in his scarf and hair; he looks up at the gulls, then at us ──
film.shot({
  name: 'hilltop', dur: 7, in: 'paper',
  cam: [[0, { x: 960, y: 560, zoom: 1.04 }], [7, { x: 975, y: 545, zoom: 1.0 }]],
  plates: [
    { depth: .2, bb: [-200, -150, 2120, 760], paint: (g) => { K.sky(g, [-200, -150, 2120, 760], { ...SKY, seed: 3 }); K.cloud(g, 300, 160, 340, { seed: 4 }); K.cloud(g, 1500, 120, 420, { seed: 5 }); K.cloud(g, 1050, 260, 220, { seed: 6 }); } },
    { depth: .45, bb: [-200, 300, 2120, 1230], paint: (g) => { K.hill(g, [[-200, 640], [300, 600], [800, 650], [1300, 590], [2120, 640]], 1230, { colors: ['#9fca68', '#7fb455'], seed: 7, density: .6 }); K.tree(g, 1650, 640, 260, { kind: 'round', seed: 8 }); K.tree(g, 230, 630, 200, { kind: 'poplar', seed: 9, colors: ['#5f9e4a', '#4a8a3a', '#8cc05a'] }); } },
    { depth: .8, bb: [-200, 700, 2120, 1300], paint: (g) => K.hill(g, [[-200, 860], [600, 820], [1400, 880], [2120, 830]], 1300, { colors: ['#8cbf5a', '#6aa14a'], seed: 10, density: 1.2 }) },
  ],
  fx: [
    { depth: .3, z: .5, draw: (g, t) => C.birds(g, t, { n: 4, seed: 2, y: 230, speed: 70 }) },
    { depth: 1, z: 6, front: true, draw: (g, t) => C.falling(g, t, { bb: [-100, -50, 2020, 1130], n: 14, kind: 'leaf', colors: ['#9cc95e', '#e9b13a', '#6aa84f'], speed: 140, size: 9, seed: 4 }) },
  ],
  cast: [{ actor: ROWAN_CLOSE, pose: stand(ROWAN_CLOSE, { x: 960, y: ROWAN_CLOSE.groundFor(500), yaw: 0, seed: 1 }),
    motion: { mass: 'light', expression: 'pleased', seed: 5, gaze: [.3, -.6], breath: { period: 3.4 },
      beats: [{ t: .8, gaze: [.6, -.9] }, { t: 2.2, gaze: [.85, -.6], head: { yaw: .12, tilt: .08 } }, { t: 4.4, gaze: [0, .05], head: { yaw: 0, tilt: -.02 }, expression: 'calm' }, { t: 5.6, gaze: [-.1, 0], expression: 'pleased' }] } }],
  sound: { amb: ['wind', 'birds'], music: 'soft' },
});

// ── 2 · the ridge path, wide: he walks home to the right; the dog trots after him and catches up ──
const GROUND = 905;
const rowanWalk = walk(ROWAN, { from: 360, to: 1560, y: GROUND, t0: .6, t1: 8.6 });
film.shot({
  name: 'ridge path', dur: 9.4, in: 'dissolve',
  cam: [[0, { x: 900, y: 560, zoom: 1.0 }], [9.4, { x: 1080, y: 560, zoom: 1.0 }]],
  plates: [
    { depth: .15, bb: [-300, -150, 2220, 720], paint: (g) => { K.sky(g, [-300, -150, 2220, 720], { ...SKY, seed: 13 }); K.cloud(g, 500, 180, 380, { seed: 14 }); K.cloud(g, 1450, 140, 300, { seed: 15 }); } },
    { depth: .4, bb: [-300, 300, 2220, 1100], paint: (g) => { K.hill(g, [[-300, 600], [400, 540], [1100, 620], [1700, 560], [2220, 600]], 1100, { colors: ['#a8cf72', '#8ebd5e'], seed: 16, density: .5 }); for (const [x, h, k] of [[120, 230, 'poplar'], [250, 200, 'poplar'], [1300, 210, 'round'], [1900, 240, 'poplar']]) K.tree(g, x, 600, h, { kind: k, seed: x }); } },
    { depth: 1, bb: [-200, 700, 2300, 1180], paint: (g) => { K.hill(g, [[-200, 840], [700, 820], [1500, 850], [2300, 830]], 1180, { seed: 17, density: 1 }); K.ground(g, [[-200, 880], [2300, 880], [2300, 935], [-200, 935]], { seed: 18 }); K.fence(g, -150, 2250, 860, { seed: 19 }); } },
    { depth: 1.15, z: 9, front: true, bb: [-300, 960, 2400, 1180], paint: (g) => K.hill(g, [[-300, 1010], [600, 980], [1400, 1020], [2400, 990]], 1180, { colors: ['#7fb455', '#5f9a44'], seed: 20, density: 1.5 }) },
  ],
  fx: [
    { depth: .25, z: .5, draw: (g, t) => C.birds(g, t + 7, { n: 5, seed: 3, y: 210, speed: 80 }) },
    { depth: 1, z: 4, draw: (g, t) => { const x0 = 120, d = Math.min(1500, Math.max(0, t - 1.4) * 175); C.dog(g, x0 + d, GROUND, 72, d, { t }); } },
  ],
  cast: [{ actor: ROWAN, pose: rowanWalk, step: 'step', motion: { mass: 'light', expression: 'pleased', seed: 6, gaze: [.6, 0], beats: [{ t: 3.2, gaze: [-.8, .2], head: { yaw: -.1, tilt: -.05 } }, { t: 4.6, gaze: [.7, 0], head: { yaw: 0, tilt: 0 } }] } }],
  sound: { amb: ['wind', 'birds'], surface: 'grass', music: 'full', events: [[3.1, 'woof', { n: 2, x: 600 }]] },
});

// tugboat-dawn · cast.js — every model of the film. The hero is drawn as four views (the show draws them on screen);
// props come from the generators (lathe = round things, voxels / box = anything else), in the same palette family.
// Axes: front = +x (pointing RIGHT in the top and side views); the side view is the RIGHT side; see lib/stack.js.
(function () {
  const C = window.CAST = {};

  // the hero: a harbour tug — navy hull, red bottom, white wheelhouse, a yellow funnel with a red band, fenders (tyres)
  C.tug = SS.model('tug', {
    palette: {
      k: '#1c1a2b', K: '#3a3a48', r: '#b23a3a', w: '#ecebe4', n: '#27407a', N: '#3657a0', d: '#c08f5a', D: '#9e6f42',
      c: '#f2eee3', C: '#cfc8b8', g: '#5fc1d6', G: '#2f7891', e: '#8a95a3', E: '#a7b1bd', f: '#f0b63c', F: '#c98f25',
      m: '#6b6f7a', L: '#ff6a3d', t: '#26252c',
    },
    top: [
      '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....',
      '.kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwkk...',
      'kwddddddddddddkkkkkkkkkkkkkkdddwwk..',
      'kwDDDDDDDDDDDDkEEEeEEEEEEeEkDDDDDwk.',
      'kwddddddddddddkEEeEEEEEEeEEkddddddwk',
      'kwdddddddkkkddkEeEEEEKKeEEEkdddddddk',
      'kwDDDDDDkKKKkDkeEEEEEKKEEEEkDDDDDDDk',
      'kwdKddddkKKKkdkEEEEEELLEEEEkdddKdddk',
      'kwdKddddkKKKkdkEEEEEeLLEEEEkdddKdddk',
      'kwDDDDDDkKKKkDkEEEEeEKKEEEekDDDDDDDk',
      'kwdddddddkkkddkEEEeEEKKEEeEkdddddddk',
      'kwddddddddddddkEEeEEEEEEeEEkddddddwk',
      'kwDDDDDDDDDDDDkEeEEEEEEeEEEkDDDDDwk.',
      'kwddddddddddddkkkkkkkkkkkkkkdddwwk..',
      '.kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwkk...',
      '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....',
    ],
    side: [
      '.....................LL.............',
      '.....................mm.............',
      '.....................mm.............',
      '........kkkkk........KK.............',
      '........kkkkk.keeeeeeeeeeeek........',
      '........FfffF..kcccccccccck.........',
      '........rrrrr..kcGgcGgcGgck.........',
      '........FfffF..kcggcggcggck.........',
      '........FfffF..kcccccccccck.....wwwk',
      '........FfffF..kCCCCCCCCCCk...wwkkkk',
      'kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwkknnnk',
      'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkknnnnnk',
      'knnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnk',
      'knnnnnttnnnnttnnnnttnnnnttnnnnnnnnnk',
      'knnNNNttNNNNttNNNNttNNNNttNNNNNNNNnk',
      '.kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk.',
      '..krrrrrrrrrrrrrrrrrrrrrrrrrrrrrrk..',
      '...kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk...',
    ],
    front: [
      '.......LL.......',
      '.......mm.......',
      '.......mm.......',
      '.....KKKKKK.....',
      '..keeeeeeeeeek..',
      '...kcccccccck...',
      '...kcGgccGgck...',
      '...kcggccggck...',
      '.kwwwwwwwwwwwwk.',
      '.knnnnnnnnnnnnk.',
      'kwwwwwwwwwwwwwwk',
      'knnnnnnnnnnnnnnk',
      'knnnnnnnnnnnnnnk',
      'knnnnnnnnnnnnnnk',
      'kNNNNNNNNNNNNNNk',
      '.kwwwwwwwwwwwwk.',
      '..krrrrrrrrrrk..',
      '...krrrrrrrrk...',
    ],
    back: [
      '.......LL.......',
      '.......mm.......',
      '.......mm.......',
      '.....kkkkkk.....',
      '..keekkkkkkeek..',
      '...kCFffffFCk...',
      '...kCrrrrrrCk...',
      '...kCFffffFCk...',
      '.kwkCFffffFCkwk.',
      '.knkCFffffFCknk.',
      'kwwwwwwwwwwwwwwk',
      'knnnnnnnnnnnnnnk',
      'knnnnnnwwnnnnnnk',
      'knnnnnnnnnnnnnnk',
      'kNNNNNNNNNNNNNNk',
      '.kwwwwwwwwwwwwk.',
      '..krrrrrrrrrrk..',
      '...krrrrrrrrk...',
    ],
    idle: { roll: .8, period: 3.2 },          // afloat: it rocks a little even when still
  });

  // props — designed for this topic (a harbour at dawn), not taken from a menu
  const band = (z, a, b, n) => (Math.floor(z / n) % 2 ? a : b);
  C.lighthouse = SS.lathe('lighthouse', {
    h: 36, r: z => z < 3 ? 6 : z < 27 ? 5 - (z - 3) * .06 : z < 28 ? 4.6 : z < 32 ? 3 : z < 33 ? 4 : 4 - (z - 32) * 1.2,
    col: (z, ang, dx, dy, rr) => {
      const lit = Math.cos(ang + 2.3) > .2;                       // the side toward the light (upper left) a step lighter
      if (z < 3) return lit ? '#8f8a80' : '#77726a';            // stone base
      if (z < 27) return band(z - 3, lit ? '#d84a3c' : '#b23a30', lit ? '#f4efe4' : '#d9d2c4', 5);
      if (z < 28) return '#2a2733';                               // gallery
      if (z < 32) return rr > .8 ? '#2a2733' : '#ffd76a';         // lantern room: glass and frame
      return lit ? '#c0443a' : '#9a3330';                         // cap
    },
    top: (z, ang, dx, dy) => z < 3 ? '#9a958b' : z < 27 ? '#f4efe4' : z === 27 ? '#3a3742' : z < 32 ? '#ffe9a6' : '#cf4c40',
  });
  C.pine = SS.lathe('pine', {
    h: 17, r: z => z < 3 ? 1 : 1 + 4.6 * (1 - (z - 3) / 14) - ((z - 3) % 4 === 3 ? .9 : 0),
    col: (z, ang) => z < 3 ? '#5e4228' : (Math.cos(ang + 2.3) > .3 ? '#3f8a4a' : (z % 4 === 0 ? '#2a5e3a' : '#33704a')),
    top: (z, ang) => z < 3 ? '#6e5032' : (Math.cos(ang + 2.3) > 0 ? '#58a85c' : '#3f8a4a'),
  });
  C.buoyR = SS.lathe('buoy-red', { h: 8, r: z => z < 5 ? 2.4 : z < 7 ? 1 : .6, col: z => z < 5 ? (z === 2 ? '#f4efe4' : '#cf3b33') : z < 7 ? '#2a2733' : '#ffd76a' });
  C.buoyG = SS.lathe('buoy-green', { h: 8, r: z => z < 5 ? 2.4 : z < 7 ? 1 : .6, col: z => z < 5 ? (z === 2 ? '#f4efe4' : '#2f9a55') : z < 7 ? '#2a2733' : '#9dffb0' });
  C.crate = SS.box('crate', { l: 7, w: 6, h: 5, col: (x, y, z) => (x === 0 || x === 6 || y === 0 || y === 5 || z === 4 || z === 0) ? '#7a5532' : ((x + z) % 3 ? '#b2834f' : '#9c6f40') });
  C.bollard = SS.lathe('bollard', { h: 4, r: z => z < 3 ? 1.2 : 1.6, col: () => '#2e2c36' });
  // a harbour house: white walls, a red pitched roof (ridge along x), a door and windows on the long sides
  C.house = SS.voxels('house', {
    l: 16, w: 12, h: 13,
    fill: (x, y, z) => {
      if (z < 7) { const edge = x === 0 || x === 15 || y === 0 || y === 11; if (!edge) return '#ece5d6'; if ((y === 0 || y === 11) && z >= 2 && z <= 4 && x % 5 === 2) return '#5fa9c4'; if (y === 11 && x === 8 && z < 5) return '#7a4a2c'; return z === 0 ? '#bdb4a2' : '#ece5d6'; }
      const k = z - 7, half = 6 - k; if (Math.abs(y - 5.5) > half + .5) return null;
      return Math.abs(y - 5.5) > half - .5 ? '#9a2f2a' : '#c4473c';
    },
    top: (x, y, z) => z >= 7 ? (y < 6 ? '#d9584a' : '#b03c33') : null,
  });
})();

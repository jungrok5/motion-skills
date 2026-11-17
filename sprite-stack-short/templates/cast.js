// cast.js — every model of the short. REPLACE THIS with models designed for your topic (BRIEF.md → "the hero", "props").
// The hero is drawn as four views (the film draws them on screen, so they are part of the show); props can come from the
// generators. Axes (lib/stack.js): front = +x, pointing RIGHT in the top and side views; the side view is the RIGHT side;
// the front view is seen from the front (the object's right side on YOUR left); the back view from behind.
// Sizes: hero 10–48 long, 6–24 wide, 8–28 tall (one character = one pixel = one voxel). Check with sheet.html + check.mjs.
(function () {
  const C = window.CAST = {};

  // EXAMPLE hero (style example only): a red post box on a stone plinth — slot on the front, a door on the back
  C.hero = SS.model('postbox', {
    palette: { k: '#1d1b26', r: '#c8362e', R: '#e0493d', w: '#efe9dc', K: '#0f0e14', p: '#8d8a84', P: '#6f6c67', d: '#a32b25', y: '#f2c14e' },
    top: [                      // 8 rows (width) × 10 columns (length); row 0 = the LEFT side, front → right
      'pppppppppp',
      'pkkkkkkkkp',
      'pkRRRRRRkp',
      'pkRrrrrRkp',
      'pkRrrrrRkp',
      'pkRRRRRRkp',
      'pkkkkkkkkp',
      'pppppppppp',
    ],
    side: [                     // 14 rows (height, top first) × 10 columns; the RIGHT side, front → right
      '..kkkkkk..',
      '.kRRRRRRk.',
      '.krrrrrrk.',
      '.krrrrrrk.',
      '.krwwwwrk.',
      '.krwyywrk.',
      '.krwwwwrk.',
      '.krrrrrrk.',
      '.krrrrrrk.',
      '.krrrrrrk.',
      '.kkkkkkkk.',
      'PPPPPPPPPP',
      'pppppppppp',
      'kkkkkkkkkk',
    ],
    front: [                    // 14 rows × 8 columns: the front, with the letter slot
      '..kkkk..',
      '.kRRRRk.',
      '.krrrrk.',
      '.kKKKKk.',
      '.krrrrk.',
      '.krrrrk.',
      '.krrrrk.',
      '.krrrrk.',
      '.krrrrk.',
      '.krrrrk.',
      '.kkkkkk.',
      'PPPPPPPP',
      'pppppppp',
      'kkkkkkkk',
    ],
    back: [                     // 14 rows × 8 columns: the back, with the collection door
      '..kkkk..',
      '.kRRRRk.',
      '.krrrrk.',
      '.krddrk.',
      '.krddrk.',
      '.krdyrk.',
      '.krddrk.',
      '.krddrk.',
      '.krrrrk.',
      '.krrrrk.',
      '.kkkkkk.',
      'PPPPPPPP',
      'pppppppp',
      'kkkkkkkk',
    ],
    idle: { bob: 0, roll: 0 },  // a still object: the turn and the camera carry the motion (a vehicle rocks: roll .5–1)
  });

  // EXAMPLE props from the generators
  C.tree = SS.lathe('tree', {
    h: 15, r: z => z < 4 ? 1 : 4.5 * Math.sin(Math.PI * (z - 3) / 12) + .8,
    col: (z, ang) => z < 4 ? '#6b4a2f' : (Math.cos(ang + 2.3) > .3 ? '#5aa55a' : '#3f8a4a'),
    top: (z, ang) => z < 4 ? '#7a5636' : (Math.cos(ang + 2.3) > 0 ? '#74bd6a' : '#58a85c'),
  });
  C.bench = SS.box('bench', { l: 12, w: 4, h: 4, col: (x, y, z) => z === 3 ? (y === 0 ? '#8a6038' : '#a87a4c') : (x === 1 || x === 10) && y === 1 ? '#2e2c36' : null });
})();

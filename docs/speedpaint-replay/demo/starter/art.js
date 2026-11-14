// 「아침 커피」 — the starter piece: a mug of coffee on a saucer, morning light from a window at the upper left.
// A small, complete example of every stage. It is an example of the style, not a menu: write BRIEF.md for your topic
// and draw your own subject (references/BRIEF.md, references/DRAWING.md).
import { Sketch } from 'sp/sketch.js';
import { arc, P } from 'sp/core.js';

export function art() {
  const s = new Sketch({ seed: 11, ink: '#2e2420', meta: { title: '아침 커피' } });
  const PI = Math.PI;
  // palette (BRIEF.md → palette)
  const C = { wall: '#efe2cf', wall2: '#e6d3ba', table: '#b88a62', table2: '#a37650', mug: '#f4efe7', inside: '#e9dfd2', coffee: '#5b3423',
    saucer: '#efe8de', shade: '#c3b2cc', warm: '#ffe2ac' };
  const mx = 470, top = 430, bot = 735, rx = 150, ry = 40;

  // ── 1. rough: the cylinder, the saucer, the handle, where the steam goes ──
  s.rough([[mx, 170], [mx, 840]], { alpha: .6 });
  s.ellipse(mx, top, rx, ry);
  s.ellipse(mx, bot, rx - 8, ry - 2);
  s.rough([[mx - rx, top], [mx - rx + 8, bot]]); s.rough([[mx + rx, top], [mx + rx - 8, bot]]);
  s.ellipse(mx + 20, 768, 270, 64);
  s.ellipse(mx + rx + 45, 585, 62, 95, { rot: .1 });
  s.rough('440,400 420,330 455,260 430,190', { alpha: .55 });
  s.rough([[0, 690], [1000, 655]], { alpha: .5 });

  // ── 2. line art ──
  s.ink(arc(mx, top, rx, ry, PI, 2 * PI, 40), { raw: true, w: 3.2, taper: [.1, .1] });           // rim, back
  s.ink(arc(mx, top, rx, ry, 0, PI, 40), { raw: true, w: 3.6, taper: [.1, .1] });                // rim, front
  s.ink(arc(mx, top + 6, rx - 12, ry - 8, PI * 1.05, PI * 1.95, 30), { raw: true, w: 2, taper: [.3, .3] }); // coffee line
  s.ink([[mx - rx, top + 2], [mx - rx + 3, 600], [mx - rx + 9, bot]], { w: 3.6, taper: [.05, .2] });
  s.ink([[mx + rx, top + 2], [mx + rx - 3, 600], [mx + rx - 9, bot]], { w: 4, taper: [.05, .2] });
  s.ink(arc(mx, bot, rx - 9, ry - 4, 0, PI, 36), { raw: true, w: 4, taper: [.1, .1] });
  s.ink('620,488 690,478 728,530 722,640 680,690 612,688', { w: 4.2, taper: [.1, .15] });          // handle out
  s.ink('619,520 668,516 690,560 684,630 655,656 616,652', { w: 2.6, taper: [.15, .2] });           // handle in
  s.ink(arc(mx + 20, 768, 270, 64, -PI * .08, PI * 1.08, 50), { raw: true, w: 3.4, taper: [.2, .2] });  // saucer front
  s.ink(arc(mx + 20, 768, 270, 64, PI * 1.2, PI * 1.38, 12), { raw: true, w: 2.4, taper: [.3, .5] });   // saucer back, left
  s.ink(arc(mx + 20, 768, 270, 64, PI * 1.66, PI * 1.85, 12), { raw: true, w: 2.4, taper: [.5, .3] });  // saucer back, right
  s.ink(arc(mx + 20, 790, 254, 55, PI * .1, PI * .9, 40), { raw: true, w: 2, taper: [.3, .3], alpha: .8 });    // saucer thickness
  s.ink([[0, 688], [240, 680], [205, 681]], { w: 2.4, taper: [.05, .6], alpha: .7 });              // table edge, left
  s.ink([[790, 664], [1000, 656]], { w: 2.4, taper: [.6, .05], alpha: .7 });                       // table edge, right

  // ── 3. flats (z: paint order; time order = the order written) ──
  s.flat('wall', [[0, 0], [1000, 0], [1000, 660], [0, 692]], { fill: { linear: [0, 0, 1000, 700], stops: [[0, C.wall], [1, C.wall2]] }, raw: true, z: 0, brush: 70 });
  s.flat('table', [[0, 688], [1000, 656], [1000, 1000], [0, 1000]], { fill: { linear: [0, 660, 0, 1000], stops: [[0, C.table], [1, C.table2]] }, raw: true, z: 1, brush: 70 });
  s.flat('saucer', arc(mx + 20, 768, 270, 64, 0, 2 * PI, 60).concat(), { fill: C.saucer, raw: true, z: 2 });
  s.flat('saucer', arc(mx + 20, 790, 256, 56, 0, PI, 40).concat(arc(mx + 20, 768, 270, 64, PI, 0, 40)), { fill: '#cdbfae', raw: true, z: 1.5, weight: .3 });
  s.flat('mug', [...arc(mx, top, rx, ry, PI, 2 * PI, 30), [mx + rx - 3, 600], ...arc(mx, bot, rx - 9, ry - 4, 0, PI, 36), [mx - rx + 3, 600]], { fill: C.mug, raw: true, z: 3 });
  s.flat('mug', P('620,488 690,478 728,530 722,640 680,690 612,688 616,652 655,656 684,630 690,560 668,516 619,520'), { fill: C.mug, z: 3, weight: .4 });
  s.flat('inside', arc(mx, top, rx - 3, ry - 3, 0, 2 * PI, 50), { fill: C.inside, raw: true, z: 4, weight: .4 });
  s.flat('coffee', arc(mx, top + 8, rx - 13, ry - 9, 0, 2 * PI, 50), { fill: C.coffee, raw: true, z: 5, weight: .4 });

  // ── 4. shadow (multiply, clipped like a clipping layer) ──
  s.shadow('560,0 760,0 360,692 150,692', { fill: '#d9bfa4', clip: 'wall', alpha: .55, blur: 10 });   // window-frame shadow on the wall
  s.shadow('900,0 1000,0 1000,240 660,692 520,692', { fill: '#d9bfa4', clip: 'wall', alpha: .55, blur: 10 });
  s.shadow([[560, 700], [1000, 690], [1000, 905], [700, 880]], { fill: '#8a5d3d', clip: 'table', alpha: .7, blur: 14 });   // cast shadow on the table
  s.shadow([[520, 760], [790, 742], [800, 800], [560, 812]], { fill: C.shade, clip: 'saucer', alpha: .85, blur: 8 });     // cast shadow on the saucer
  s.shadow([[540, 420], [mx + rx + 8, 420], [mx + rx, 760], [540, 780]], { fill: { linear: [520, 0, 625, 0], stops: [[0, 'rgba(200,184,206,0)'], [.4, '#d3c4d6'], [1, '#b9a6c4']] }, clip: 'mug', blur: 3 });
  s.shadow(P('640,520 700,500 726,560 720,640 680,690 640,690'), { fill: C.shade, clip: 'mug', blur: 3, alpha: .8 });
  s.shadow(arc(mx - 10, top - 4, rx - 2, ry - 6, 0, 2 * PI, 40), { fill: '#c9b6a8', clip: 'inside', raw: true, blur: 5 });
  s.shadow(arc(mx + 30, top + 2, rx - 30, ry - 14, 0, 2 * PI, 40), { fill: '#3a1f14', clip: 'coffee', raw: true, blur: 6, alpha: .8 });

  // ── 5. highlight ──
  s.light([[mx - rx + 22, top + 30], [mx - rx + 48, top + 30], [mx - rx + 52, bot - 20], [mx - rx + 28, bot - 18]], { fill: '#ffffff', clip: 'mug', blur: 6, alpha: .9 });
  s.light(arc(mx, top, rx - 2, ry - 2, PI * 1.05, PI * 1.6, 20).concat(arc(mx, top, rx - 7, ry - 6, PI * 1.6, PI * 1.05, 20)), { fill: '#ffffff', mode: 'source-over', raw: true, alpha: .9 });
  s.light(arc(mx - 40, top + 8, 34, 7, 0, 2 * PI, 20), { fill: '#e9b48a', clip: 'coffee', raw: true, blur: 2, alpha: .8 });
  s.light(arc(mx - 20, 762, 240, 50, PI * .55, PI * .95, 20).concat(arc(mx - 20, 762, 228, 44, PI * .95, PI * .55, 20)), { fill: '#ffffff', clip: 'saucer', raw: true, blur: 3, alpha: .8 });
  for (const [x0, ph] of [[430, 0], [470, 1.4], [508, 2.6]]) {   // steam: soft white wisps
    const pts = []; for (let y = 400; y > 150; y -= 18) pts.push([x0 + Math.sin(y / 45 + ph) * 18 - (400 - y) * .1, y]);
    s.light(pts.concat(pts.slice().reverse().map(([x, y]) => [x + 14, y])), { fill: 'rgba(255,255,255,.75)', blur: 7, mode: 'screen' });
  }

  // ── 6. finish: morning light, warm lines, glow ──
  s.glow([[0, 0], [1000, 0], [1000, 1000], [0, 1000]], { fill: { linear: [0, 0, 600, 600], stops: [[0, 'rgba(255,226,172,.8)'], [1, 'rgba(255,226,172,0)']] }, raw: true });
  s.inkTint('#5a3a28', .55);
  s.bloom(mx - 150, 470, 150, { color: 'rgba(255,240,215,.35)', over: true });
  s.fx((c, u) => {   // vignette
    const g = c.createRadialGradient(500, 520, 380, 500, 520, 760); g.addColorStop(0, 'rgba(60,35,20,0)'); g.addColorStop(1, `rgba(60,35,20,${.28 * u})`);
    c.fillStyle = g; c.fillRect(0, 0, 1000, 1000);
  }, { over: true, name: 'vignette' });
  return s;
}

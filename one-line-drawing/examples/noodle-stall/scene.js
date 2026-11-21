// 「Last Bowl」 — worked example designed from its brief (BRIEF.md): a noodle stall at the end of a rainy alley,
// a walker under an umbrella heading for it, an overhead wire, a lamp, steam, a wet street full of reflections.
// The stall is drawn here, in the piece — new subjects are plain canvas paths; the kit is only a start.
// A silhouette's holes are not on its outline, so things seen through a hole (lanterns under the awning, the pot on
// the counter) are their own shapes, reached by detours from the outline they hang on.

const X0 = 650, X1 = 1004, TOP = 840, EAVE = 922;
// the awning: a sloping roof, a scalloped valance, two posts
function awning(g, { poly, bar }) {
  poly(g, [[X0 - 30, EAVE], [X0 + 20, TOP], [X1 - 10, TOP - 18], [X1 + 24, EAVE - 14]]);
  const a0 = X0 - 30, span = X1 + 24 - a0;
  g.beginPath(); g.moveTo(a0, EAVE);
  for (let i = 0; i < 6; i++) { const a = a0 + span * i / 6, b = a0 + span * (i + 1) / 6; g.quadraticCurveTo((a + b) / 2, EAVE + 44 - 14 * (i + .5) / 6, b, EAVE - 14 * (i + 1) / 6); }
  g.lineTo(X1 + 24, EAVE - 30); g.lineTo(a0, EAVE - 10); g.closePath(); g.fill();
  bar(g, [X0 - 4, EAVE], [X0 - 4, 1300], 14); bar(g, [X1, EAVE - 12], [X1, 1290], 14);
}
// the counter with the pot and a menu board standing on it
function counter(g, { poly, bar }) {
  g.fillRect(X0 - 14, 1110, X1 - X0 + 28, 24); g.fillRect(X0 + 6, 1134, X1 - X0 - 12, 160);
  poly(g, [[X0 + 70, 1112], [X0 + 80, 1050], [X0 + 180, 1050], [X0 + 190, 1112]]); bar(g, [X0 + 62, 1060], [X0 + 198, 1060], 8);
  g.fillRect(X0 + 250, 1000, 110, 112);
}
const lantern = (x, y) => (g, { bar, ell }) => { bar(g, [x, EAVE + 24], [x, y - 30], 3); ell(g, [x, y], 26, 34); g.fillRect(x - 13, y + 30, 26, 10); };
// the alley wall: a tall block with a stepped parapet and a balcony
function block(g, { poly }) {
  poly(g, [[40, 1340], [40, 520], [120, 520], [120, 470], [205, 470], [205, 560], [262, 560], [262, 1310]]);
  g.fillRect(252, 860, 46, 14); g.fillRect(258, 818, 36, 42);
}

export function scene(S) {
  const k = S.kit, { skyline, lamp, umbrella, ell, bar } = k;
  S.setting({ horizon: 1000, ground: 'wet', fog: '#d4d5d6', sky: '#dcdddf', earth: '#8f9092' });
  S.shape('city', { depth: .9, draw: skyline({ x0: 262, x1: 600, base: 1002, h: [50, 120], seed: 11, spires: [430] }) });
  S.shape('block', { depth: .42, draw: g => block(g, k), ground: 1340 });
  S.shape('awning', { depth: .3, draw: g => awning(g, k), ground: 1300 });
  S.shape('lantern-a', { depth: .3, draw: g => lantern(722, 1010)(g, k), reflect: false });
  S.shape('lantern-b', { depth: .3, draw: g => lantern(950, 1000)(g, k), reflect: false });
  S.shape('counter', { depth: .3, draw: g => counter(g, k), ground: 1294 });
  S.shape('stools', { depth: .26, draw: g => { for (const x of [752, 902]) { g.fillRect(x - 32, 1330, 64, 14); bar(g, [x - 22, 1344], [x - 28, 1400], 8); bar(g, [x + 22, 1344], [x + 28, 1400], 8); } }, ground: 1400 });
  S.shape('lamp', { depth: .36, draw: lamp(286, 1340, 470, { dir: 1, w: 10 }), ground: 1340 });
  // the walker, seen from behind, mid-stride toward the stall, umbrella up in the right hand
  const w = S.figure('walker', {
    x: 395, ground: 1610, h: 600, facing: 'away', stride: .3, coat: 'long', depth: .14,
    reach: { right: [530, 1150] }, arms: { left: { sh: 10, el: 12 } },
  });
  S.shape('umbrella', { depth: .14, draw: umbrella(w.joints['right hand'], { r: 150, up: 190, tilt: -16 }), ground: 1610 });
  S.shape('puddle', { depth: .2, draw: g => ell(g, [200, 1720], 130, 24), reflect: false, trace: false });
}

export function line(L, S) {
  const hand = S.figures.get('walker').joints['right hand'];
  // the alley wall: up its edge, along the stepped parapet, partway down the far side
  L.start([40, 1338]);
  L.tag('block').contour('block', { from: [40, 1340], until: [262, 640], dir: 'cw', curl: 7, corner: 80, gap: 70, maxCurls: 4 });
  const blk = L.last;
  // an overhead wire across the alley to the awning, sagging in steps with hooks
  L.tag('wire').steps([626, 900], { n: 3, first: 'h', hook: 6 });
  // the awning, with detours down to each lantern from the valance
  L.tag('awning').contour('awning', { from: 'near', until: [950, 945], dir: 'cw', curl: 8, corner: 72, gap: 90, maxCurls: 4 });
  const aw = L.last;
  L.tag('lanterns').contour('lantern-b', { from: 'near', curl: 5, corner: 80, maxCurls: 2 });
  L.tag('awning').contour('awning', { from: 'near', until: [722, 948], dir: aw.dir });
  L.tag('lanterns').contour('lantern-a', { from: 'near', curl: 5, corner: 80, maxCurls: 2 });
  L.tag('awning').contour('awning', { from: 'near', until: aw.start, dir: aw.dir, curl: 7, corner: 80, maxCurls: 2 }).pause(.4);
  // down the left post to the counter; round it, with steam curling up from the pot and back
  L.tag('counter').to([636, 1110]).contour('counter', { from: 'near', until: [810, 1052], dir: 'cw', curl: 6, corner: 80, gap: 80, maxCurls: 3 });
  const ct = L.last;
  L.tag('steam').curls([790, 968], { n: 3, r: 10 }).back(110).to([810, 1052]);
  L.tag('counter').contour('counter', { from: 'near', until: ct.start, dir: ct.dir, curl: 6, corner: 80, gap: 80, maxCurls: 3 });
  // across to the canopy's tip: under it to the shaft and the hand, round the walker, back up, the rest of the canopy
  const tip = S.bounds('umbrella');
  L.tag('umbrella').contour('umbrella', { from: [tip.x1, tip.y0 + tip.h * .3], until: hand, dir: 'cw', curl: 6, corner: 85, gap: 80, maxCurls: 3 });
  const um = L.last;
  L.tag('walker').contour('walker', { from: 'near', curl: 7, corner: 75, gap: 110, maxCurls: 6 }).pause(.4);
  L.tag('umbrella').contour('umbrella', { from: 'near', until: um.start, dir: um.dir });
  // the far city between wall and stall, the lamp, then the rest of the wall down to the kerb
  L.tag('city').to([598, 1000]).contour('city', { from: [598, 1002], until: [264, 1002], dir: 'ccw' });
  L.tag('lamp').contour('lamp', { from: 'near', curl: 7, corner: 80, maxCurls: 3 });
  L.tag('block').contour('block', { from: 'near', until: blk.start, dir: blk.dir });
  // the wet street: down the margin, zigzags to the walker's reflection, up it, across to the stall's light
  L.tag('street').to([60, 1640]).sweep([[60, 1640], [360, 1640], [380, 1810], [60, 1810]], { step: 36, jitter: .3, round: .35 });
  L.tag('reflections').reflect('walker', { step: 30, squash: 1.04, pad: 4, round: .3, rows: [1616, 1810], from: 'bottom' });
  L.tag('stools').contour('stools', { from: 'near', curl: 6, corner: 80, gap: 60, maxCurls: 4 }).to([870, 1344]).contour('stools', { loop: 1, from: 'near', curl: 6, corner: 80, gap: 60, maxCurls: 4 });
  L.tag('reflections').reflect('counter', { step: 34, squash: 1.1, round: .3, rows: [1410, 1580], x: [660, 1000] });
  // down the right edge and the base rule back under everything
  L.tag('street').path([[1010, 1640], [1012, 1836], [140, 1840]]);
}

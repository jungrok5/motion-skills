// 「Last Cast」 — the starter piece (an example of the style, not a template to fill in).
// An angler at the end of a jetty in lake fog: far ridge, pines on the far shore, a rowing boat, gulls, reflections.
// scene(S) builds the picture under the pen; line(L, S) is the one line, in drawing order.

export function scene(S) {
  const { hills, treeline, jetty, boat, bird, rod, pole } = S.kit;
  S.setting({ horizon: 800, ground: 'water', fog: '#d9d9d6', sky: '#e2e2df', earth: '#a3a39f' });
  S.shape('ridge', { depth: .92, draw: hills(60, 1020, 802, { amp: 120, seed: 4, freq: .0035 }) });
  S.shape('pines', { depth: .72, draw: treeline(600, 1020, 804, { h: 96, kind: 'pine', seed: 8 }) });
  S.shape('gull-a', { depth: .55, draw: bird(520, 470, 46, { flap: .5 }), reflect: false });
  S.shape('gull-b', { depth: .6, draw: bird(668, 528, 34, { flap: .3 }), reflect: false });
  // the jetty and its mooring post are one silhouette for the line; the post alone casts its own reflection
  S.shape('jetty', { depth: .28, draw: g => { jetty(100, 830, 1330, 1420, { th: 20, every: 104, w: 14 })(g); pole(812, 1236, 1432, { w: 18 })(g); }, ground: 1420 });
  S.shape('mooring', { depth: .28, draw: pole(812, 1236, 1432, { w: 18 }), ground: 1432, trace: false }); // painted only
  // the angler stands at the end of the jetty facing out over the water, rod held out in both hands
  const a = S.figure('angler', {
    x: 600, ground: 1310, h: 500, facing: 'right', stride: .15, lean: 6, hat: 'cap', coat: 'short', bag: 'back', depth: .18,
    reach: { near: [700, 1040], far: [682, 1004] },
  });
  S.shape('rod', { depth: .18, draw: rod(a.joints['near hand'], [962, 560], { w: 7 }), reflect: true, ground: 1310 });
  S.shape('boat', { depth: .22, draw: boat(300, 1610, 300, { h: 58, dir: -1 }), ground: 1610 });
  S.shape('sail', { depth: .62, draw: boat(250, 1030, 130, { h: 22, mast: 1.15, dir: 1 }), ground: 1030 });
}

export function line(L, S) {
  // a ruled top edge with stepped hooks; it drops to pick up the two gulls and climbs back
  L.start([130, 350]);
  L.tag('sky').steps([440, 380], { n: 2, first: 'h', hook: 6 }).hook({ len: 70, r: 6 });
  L.contour('gull-a', { part: .95 }).to([640, 528]).contour('gull-b', { part: .95 }).steps([950, 380], { n: 1, first: 'v', hook: 6 });
  // down the right edge, over the pines to the left, up onto the far ridge and along its crest to the left edge
  L.tag('far shore').hook({ len: 40, r: 7 }).to([1014, 760]).contour('pines', { from: [1016, 806], until: [602, 806], dir: 'ccw' });
  L.contour('ridge', { from: [600, 740], until: [62, 802], dir: 'ccw' }).pause(.5);
  // down the left edge to the sailing boat far out, and its reflection
  L.tag('sail').to([74, 960], { bow: .02 }).contour('sail', { curl: 6, corner: 70 }).reflect('sail', { step: 20, squash: 1.2, round: .3 });
  // onto the jetty, along the deck to the angler's back foot; round the figure to the near hand, up the rod, the
  // fishing line to the float and back, down to the hand, the rest of the figure; then the rest of the jetty
  L.tag('jetty').to([104, 1312]).contour('jetty', { from: 'near', until: [560, 1310], dir: 'cw' });
  const deck = L.last;
  L.tag('angler').contour('angler', { from: 'near', until: [700, 1040], dir: 'cw', curl: 8, corner: 75, gap: 110, maxCurls: 4 });
  const fig = L.last;
  L.tag('rod').to([962, 560]).curve([1010, 900], [1000, 1318]).curl(10, { side: 1 }).back(790).to([700, 1040]);
  L.tag('angler').contour('angler', { from: 'near', until: fig.start, dir: fig.dir, curl: 8, corner: 75, gap: 110, maxCurls: 4 }).pause(.4);
  L.tag('jetty').contour('jetty', { from: 'near', until: deck.start, dir: deck.dir, curl: 7, corner: 80, gap: 90, maxCurls: 9 });
  // the waterline under the posts to the angler's reflection, down it, across to the boat and its reflection
  L.tag('reflections').path([[96, 1436], [520, 1440]]).reflect('angler', { step: 30, squash: 1.15, pad: 4, round: .3, rows: [1440, 1680] });
  L.tag('boat').contour('boat', { curl: 8, corner: 60 }).reflect('boat', { step: 24, squash: 1.1, round: .35 });
  // open water: long soft zigzags across the bottom, then the base line
  L.tag('water').sweep([[110, 1716], [970, 1716], [990, 1800], [100, 1800]], { step: 36, jitter: .3, round: .4 });
  L.to([970, 1812], { bow: .01 });
}

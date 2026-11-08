// cast.js — the template's cast: one puppet (a child) and one prop (a kite). Rewrite this from YOUR brief: new silhouette,
// head, clothes, colours, lengths, props. Pup.biped gives the standard joints (and their checked ranges); you paint the look.
//   biped spec: name · torso, thigh, shin, foot, arm, fore, limbW, hipW, shoulder (px) · colours { leg, sleeve, hand, shoe, …Far }
//               paintHead(ctx) (pin = neck, draw upward, face to +x) · paintTorso(ctx) (pin = hip, neck at [0, -torso])
//               headBounds / torsoBounds [x0, y0, x1, y1] · alts { head: { blink } } · z overrides · extraParts (tails, ears, scarves)
// Cut-from-a-sheet instead? See references/PARTS.md (P.parts + Pup.bipedParts).
import * as P from '../lib/paper.js';
import * as Pup from '../lib/puppet.js';

export const PAL = { skin: '#f2cfae', hair: '#6a3e2e', coat: '#e0663e', scarf: '#f2c14e', trouser: '#405a8a', boot: '#5a3a2e', kite: '#4fa3a5', kite2: '#f2c14e' };

function head(c, o = {}) {
  P.piece(c, P.blob(-6, -62, 44, 46, 6, 3), PAL.hair, { lift: 0 });                      // hair mass behind
  P.piece(c, P.ellipse(6, -54, 38, 42), PAL.skin);                                       // face, nose side to +x
  P.piece(c, [[40, -56], [50, -48], [40, -44]], PAL.skin, { rim: 1.4 });                  // nose
  P.piece(c, [[-40, -70], [-20, -100], [20, -102], [44, -80], [10, -78], [-10, -66]], PAL.hair, { lift: 2 });   // fringe
  P.dab(c, 22, -38, 11, '#e8806a', .55);
  if (o.blink) P.ink(c, [[18, -58], [24, -55], [30, -58]], { w: 2.6 }); else P.dot(c, 24, -58, 4.5);
  P.ink(c, [[30, -36], [36, -34]], { w: 2, a: .6 });
}
function torso(c) {
  P.piece(c, [[-28, -112], [24, -112], [32, -60], [36, 18], [-36, 18], [-32, -60]], PAL.coat);
  P.piece(c, [[-26, -116], [28, -116], [30, -100], [-28, -98]], PAL.scarf, { lift: 2, rim: 2 });        // scarf
  P.piece(c, [[-30, -104], [-50, -70], [-40, -66], [-22, -96]], PAL.scarf, { lift: 2, rim: 2 });        // scarf end, flying back
  for (const y of [-80, -52, -24]) P.dot(c, 22, y, 3.5, '#7a3a2a');                                     // buttons on the front
}
export function cast() {
  const KID = Pup.biped({
    name: 'Kid', torso: 104, thigh: 52, shin: 50, foot: 30, arm: 46, fore: 42, limbW: 11, shoulder: [2, 12],
    colours: { leg: PAL.trouser, sleeve: PAL.coat, hand: PAL.skin, shoe: PAL.boot },
    headBounds: [-56, -112, 56, 4], torsoBounds: [-56, -122, 44, 26],
    paintHead: c => head(c), paintTorso: torso, alts: { head: { blink: c => head(c, { blink: true }) } },
  });
  // the kite: a diamond of two papers with a tail of bows; pin = where the string ties on
  const kite = P.sprite([-60, -80, 60, 160], c => {
    P.piece(c, [[0, -76], [50, -6], [0, 70], [-50, -6]], PAL.kite);
    P.piece(c, [[0, -76], [50, -6], [0, -6]], PAL.kite2, { rim: 1.6, lift: 2 });
    P.ink(c, [[0, 70], [8, 100], [-6, 128], [4, 154]], { col: '#efe2c8', w: 1.6 });
    for (const [x, y] of [[6, 96], [-4, 124], [4, 150]]) P.piece(c, [[x - 10, y - 6], [x + 10, y + 6], [x + 10, y - 6], [x - 10, y + 6]], '#e0663e', { rim: 1.2, edge: 'cut' });
  }, { shadow: 6 });
  return { KID, kite };
}

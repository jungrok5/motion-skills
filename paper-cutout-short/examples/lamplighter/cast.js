// cast.js — 「The Lamplighter」: designed from BRIEF.md. One puppet (Ember, a fox lamplighter) and the props she carries.
// Ember is the standard biped (P.biped) with her own head, coat, tail and paws; everything is cut from paper in code.
// Facing right is her drawn side; facing left is the same puppet flipped (the stage keeps the light where it is).
import * as P from 'pcs/paper.js';
import * as Pup from 'pcs/puppet.js';

export const PAL = {
  fur: '#d0683a', furDark: '#a94f2e', cream: '#f4e3c8', nose: '#3a2a2e', eye: '#2f2228',
  coat: '#2f4a74', coatDark: '#25395c', brass: '#d8a94a', cap: '#27375a', trouser: '#3b3550', boot: '#3a2a2c', paw: '#4a3030',
};

// the head, pin = the neck (0, 0), drawn upward, facing right (+x)
function head(c, o = {}) {
  // far ear (behind the head, darker), near ear
  P.piece(c, [[-30, -86], [-44, -142], [-6, -100]], P.tone(PAL.furDark, -.08), { rim: 2.2 });
  P.piece(c, [[-14, -92], [-14, -150], [16, -100]], PAL.fur, { rim: 2.4 });
  P.piece(c, [[-11, -101], [-11, -136], [7, -104]], '#5a3436', { edge: 'cut', light: .1 });
  // skull and snout: one torn piece, snout pointing forward
  P.piece(c, [[-40, -40], [-44, -78], [-24, -104], [8, -108], [32, -92], [50, -66], [76, -50], [80, -40], [60, -26], [24, -12], [-14, -10], [-34, -20]], PAL.fur, { light: .45 });
  // cream cheek and jaw, a little lifted
  P.piece(c, [[-6, -14], [24, -14], [62, -28], [78, -40], [52, -40], [26, -50], [6, -46], [-10, -32]], PAL.cream, { rim: 1.8, lift: 2 });
  P.dot(c, 79, -46, 6.5, PAL.nose);
  P.dab(c, 14, -42, 12, '#e47a62', .45);
  if (o.blink) P.ink(c, [[14, -66], [21, -63], [28, -66]], { col: PAL.eye, w: 3 });
  else { P.piece(c, P.ellipse(21, -66, 5.5, 7, 16), PAL.eye, { edge: 'cut', rough: .3, light: 0, tex: 0 }); P.dot(c, 23, -69, 1.7, '#fff6e6'); }
  P.ink(c, [[12, -78], [24, -80], [32, -76]], { col: PAL.furDark, w: 2.6, a: .8 });   // brow
  P.ink(c, [[58, -32], [66, -30]], { col: PAL.nose, w: 2, a: .6 });                     // mouth line
  // the lamplighter's cap: crown and a forward brim, ears behind it
  P.piece(c, [[-34, -96], [-28, -118], [6, -126], [32, -114], [34, -98]], PAL.cap, { lift: 3 });
  P.piece(c, [[14, -102], [56, -98], [60, -92], [14, -94]], P.tone(PAL.cap, -.15), { lift: 2, rim: 2 });
  P.piece(c, P.rect(-30, -104, 62, 8), PAL.brass, { edge: 'cut', light: .4 });
}
// the coat, pin = the hip (0, 0); the neck is at (0, -110); hem flares below the hip so it hides the top of the legs
function coat(c) {
  P.piece(c, [[-30, -116], [26, -118], [34, -84], [36, -20], [48, 34], [-46, 36], [-36, -20], [-38, -84]], PAL.coat, { light: .45 });
  // cream chest fur at the collar (front = +x), lapel and buttons on the front edge
  P.piece(c, [[6, -118], [28, -118], [32, -98], [16, -84]], PAL.cream, { rim: 1.8, lift: 2 });
  P.piece(c, [[2, -116], [14, -84], [24, -40], [12, -40], [-2, -86]], PAL.coatDark, { rim: 1.6, lift: 2 });
  for (const y of [-76, -52, -28]) P.piece(c, P.ellipse(26, y, 4.6, 4.6, 12), PAL.brass, { edge: 'cut', light: .5, lift: 1.5 });
  P.piece(c, P.rect(-36, -30, 72, 10), P.tone(PAL.coat, -.2), { edge: 'cut', light: .2 });       // belt
  P.piece(c, P.rect(-6, -32, 14, 14), PAL.brass, { edge: 'cut', light: .5 });
}
// the tail: pin at the hip's back, bushy, white tip, drawn behind everything
function tail(c) {
  P.piece(c, [[0, -6], [-30, -18], [-74, -12], [-104, 6], [-110, 26], [-84, 30], [-46, 24], [-10, 12]], PAL.fur, { light: .45 });
  P.piece(c, [[-84, 0], [-104, 6], [-112, 26], [-86, 30], [-80, 16]], PAL.cream, { rim: 1.8 });
}
const paw = (c, near, L) => {   // forearm: coat sleeve with a cuff, a dark paw
  const col = near ? PAL.coat : PAL.coatDark;
  P.piece(c, P.capsule(0, 0, 0, L - 8, 11, 10), col, { rim: 2.2, light: .3 });
  P.piece(c, P.rect(-11, L - 16, 22, 9), near ? PAL.brass : P.tone(PAL.brass, -.25), { edge: 'cut', light: .4 });
  P.piece(c, P.capsule(0, L - 6, 3, L + 8, 9, 8), near ? PAL.paw : P.tone(PAL.paw, -.2), { rim: 1.6, light: .3 });
};

// build after the stage exists (sprites are cut at the stage's resolution): const { EMBER, pole, flames } = cast();
export const POLE_LEN = 250;
export function cast() {
const EMBER = Pup.biped({
  name: 'Ember', torso: 110, thigh: 56, shin: 54, foot: 34, arm: 50, fore: 46, limbW: 12, hipW: 14, shoulder: [2, 14],
  colours: { leg: PAL.trouser, sleeve: PAL.coat, sleeveFar: PAL.coatDark, hand: PAL.paw, shoe: PAL.boot },
  z: { thighN: -6, shinN: -5, footN: -4 },          // the long coat hides the top of the near leg
  headBounds: [-52, -156, 86, 4], torsoBounds: [-52, -126, 56, 42],
  paintHead: c => head(c), paintTorso: coat,
  alts: { head: { blink: c => head(c, { blink: true }) } },
  paintFore: (c, near) => paw(c, near, 46),
  extraParts: [{ id: 'tail', parent: 'hip', at: [-30, 12], z: -40, bounds: [-118, -26, 6, 36], paint: tail, lim: [-35, 35] }],
});

// props: the lighting pole (pin = the paw that holds it, pointing +x along the pole) and its flame (two drawings, alternating)
const pole = P.sprite([-30, -14, POLE_LEN + 20, 14], c => {
  P.piece(c, P.rect(-26, -3.5, POLE_LEN + 22, 7), '#8a6440', { edge: 'cut', rough: .4, light: .5, tex: .4 });
  P.piece(c, P.rect(POLE_LEN - 30, -5, 30, 10), PAL.brass, { edge: 'cut', light: .5 });
  P.ink(c, [[POLE_LEN - 4, 0], [POLE_LEN + 8, -6], [POLE_LEN + 14, 2]], { col: '#6a4a2a', w: 3 });   // the hook
}, { shadow: 6, pad: 6 });
const flames = [0, 1].map(i => P.sprite([-20, -50, 20, 4], c => { c.rotate(i ? .08 : -.06); P.piece(c, [[-9, 0], [-11, -14], [-4, -26], [0, -38 - i * 6], [5, -24], [10, -12], [9, 0]], '#f39a3a', { rim: 1.6, light: .2 }); P.piece(c, [[-4, 0], [-5, -10], [0, -22], [5, -10], [4, 0]], '#ffe08a', { edge: 'cut', light: 0 }); }, { shadow: 0, pad: 4 }));
return { EMBER, pole, flames };
}

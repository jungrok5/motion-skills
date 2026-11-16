// The traveller, as data — DESIGN A NEW ONE FOR EVERY TOPIC (this is only an example of the fields).
// kind: 'snout' (fox, dog, bear, mouse, rabbit: ears 'pointed' | 'round' | 'long') · 'bird' (beak, pouch, crest; legs.thin) ·
// 'human' (hair). R = wheel radius in px (the whole rider scales with it; 90–110 fills a third of the frame).
// Mass sets timing: write it in BRIEF.md (light rider → quick follow-through; heavy → slower, longer settle).
export const RIDER = {
  name: 'Mina', kind: 'human', R: 96, seed: 5,
  body: '#e9b48e', headCol: '#e9b48e', hair: '#3a2a22', head: .5, neck: .26, torso: 1.2, girth: .46,
  coat: '#e0574a',                                          // a red raincoat
  arm: { col: '#e0574a', sleeve: '#e0574a', hand: '#e9b48e' },
  legs: { col: '#3b4a6b', trousers: '#3b4a6b', shoe: '#2b2522' },
  pack: '#f2c14e',                                          // a yellow backpack (it sits on the BACK)
  scarf: { col: '#f2efe2', len: 1.1 },
  hat: { kind: 'cap', col: '#2f6fb3' },
  bike: { col: '#2d9a8a', tyre: '#2a2826', saddle: '#4a3326', metal: '#8f8d88', basket: '#c09356' },
  // what the story carries, drawn in the basket through the medium (W maps rider units → world)
  cargo(ctx, M, W, [x, y], st) {
    M.shape(ctx, [[x - .22, y - .02], [x + .22, y - .02], [x + .2, y - .3], [x - .2, y - .3]].map(W), { fill: '#f4ede0', seed: 600 + (st.boil || 0), smooth: false, role: 'hero' });   // a parcel
    M.line(ctx, [[x, y - .02], [x, y - .3]].map(W), { col: '#c4432a', w: 3, seed: 601, role: 'hero' });
  },
};

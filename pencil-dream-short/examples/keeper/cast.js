// 「The Keeper's Whale」 · cast.js — designed from BRIEF.md: an old lighthouse keeper, round and slow, beard and side tufts,
// a knitted beanie in the film's one spot colour (coral), a ribbed sweater, boots. The whale (the giant) is in whale.js.
export const PAPER = '#f1ece0', SPOT = '#de5a3f', LEAD = '#34343a';
export const HERO = {
  name: 'Keeper', H: 250, hand: 'R', ink: 2.2,
  head: { r: .135, jaw: .9, chin: .08 },
  hair: { style: 'tufts', seed: 4 },
  face: { eye: 'dot', nose: 'round', beard: 'full', brows: 1.5 },
  items: [{ type: 'beanie', pom: true }],
  top: { kind: 'sweater', collar: 'roll' }, legs: { kind: 'trousers', boots: true },
  pencil: { len: .17 },
};

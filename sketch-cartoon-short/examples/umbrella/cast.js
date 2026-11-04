// 「The Runaway Umbrella」 · cast.js — the people and animals of this film, as data for lib/rig.js (person / critter).
// Designed from BRIEF.md: a lanky kid you can read at a glance in the rain, his scruffy dog, one warm accent kept for the umbrella.
export const JUNO = {            // a lanky boy in an open ochre raincoat over a mustard sweater, rolled trousers, rubber boots, a mop of hair
  name: 'Juno', h: 640, skin: '#cf9f7e', hair: { style: 'mop', col: '#3a2b21', vol: 1.15 }, eyes: { col: '#45503e', size: 1.05 },
  top: { col: '#d4ca94', len: 1 }, jacket: { col: '#b9a564', len: .62 }, pants: { col: '#5d726e', baggy: 1.15 }, shoes: { col: '#4e5a4c', boot: true },
};
export const BISCUIT = { name: 'Biscuit', len: 175, h: 140, col: '#cdbfa3', ear: { style: 'point', len: 1 }, tail: { style: 'fluffy', len: .9 }, snout: .75 };
export const CAST = { people: { JUNO }, critters: { BISCUIT }, paper: '#b7b996' };

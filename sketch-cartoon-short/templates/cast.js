// cast.js — the people and animals of this film, as data for lib/rig.js. DESIGN THESE FROM THE BRIEF: every field below is an
// example of the style, not a menu. What carries identity in this style: the silhouette (hair mass, coat length, trouser width,
// how long the legs are), one or two garment colours in the muted palette, the eyes. Render cast.html after every change.
//
// person spec (all optional): h (height px at s = 1), head / legs / torso / neck / shoulders / hips / arm / foot (proportions of h),
//   skin, eyes { col, size, lashes }, nose 'tick' | 'long', brows (colour), glasses (colour), blush (0…1),
//   hair { style: 'wild' | 'mop' | 'bob' | 'tied' | 'spiky' | 'bun' | 'buzz' | 'none', col, vol, len, seed },
//   top { col, len (0…1 of the torso it covers: < 1 shows the midriff), sleeves }, jacket { col, len } | null (an open overshirt / coat),
//   pants { col, baggy (1 straight … 1.8 very wide), skirt }, shoes { col, boot, size }, lw (line weight)
// critter spec: len, h, col, belly, ear { style: 'long' | 'point' | 'round', len, w }, tail { style: 'thin' | 'fluffy', len }, snout, head, legs
export const HERO = {
  h: 620, skin: '#c8987a', hair: { style: 'tied', col: '#2c2520', len: 1.1 }, eyes: { col: '#3e4a3a', lashes: true },
  top: { col: '#e4dfcb', len: .7 }, jacket: { col: '#9fb08a', len: .5 }, pants: { col: '#8a7a58', baggy: 1.4 }, shoes: { col: '#5b4634', boot: true },
};
export const PAL = { len: 160, h: 130, col: '#b7a9a2', ear: { style: 'long', len: 1.1 }, tail: { len: 1 } };
export const CAST = { people: { HERO }, critters: { PAL }, paper: '#b8ba97' };

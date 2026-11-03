// Score for the template (12 s): shots start at 0 dawn · 4 clearing · 8.5 close. A pad bed in D, a music-box phrase,
// a chirp and wing flutter for the bird, a chime when the lantern lights. See SKILL.md → Sound for the event types.
export const SCORE = {
  pad: [{ t: 0, d: 4, notes: [50, 57, 61, 66], v: .45 }, { t: 4, d: 4.4, notes: [47, 54, 57, 62], v: .5 }, { t: 8.4, d: 3.6, notes: [43, 55, 59, 62], v: .5 }],
  bass: [{ t: 4, d: 4.3, n: 35, v: .35 }, { t: 8.4, d: 3.5, n: 31, v: .35 }],
  bell: [{ t: 1.5, n: 78, v: .3 }, { t: 2.4, n: 76, v: .28 }, { t: 5, n: 74, v: .35 }, { t: 5.6, n: 76, v: .35 }, { t: 6.2, n: 78, v: .4 }, { t: 7.2, n: 81, v: .4 }, { t: 10.6, n: 78, v: .4 }, { t: 11.2, n: 74, v: .35 }],
  air: [{ t: 0, v: .45 }, { t: 12, v: .35 }],
  sfx: [{ t: 1, type: 'chirp', v: .15, pan: -.5 }, { t: 8.4, type: 'flutter', d: 1.3, v: .35, pan: -.4 }, { t: 9.9, type: 'chirp', v: .4 }, { t: 10.2, type: 'chime', v: .45 }],
  reverb: { mix: .3, room: .86 },
};

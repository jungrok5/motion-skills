// 「Handle With Care」 · score — the starting groove: one 120 bpm D-dorian groove under both gags, a beat of silence on
// the slap, the full band and a brass button for the title. Change bpm/key/sections per topic; the foley comes from
// the shots' sfx marks (window.cues()), so it always lands on the frame.
export const SCORE = {
  bpm: 120, key: "D", swing: 0.58, seed: 5, hook: true,
  sections: [
    { at: 0, mood: "groove" },
    { at: 8.5, mood: "outro" },
  ],
  stops: [1.55],
};

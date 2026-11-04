// 「Hands Down」 · score — one strolling D-dorian groove at 120 bpm under all five gags (the reference runs one
// continuous ~130 bpm groove), a filtered intro, a beat of silence on the two big impacts, a tiptoe while Granny
// shuffles across, the full band back for the balloon, and a brass button on the title. The foley comes from the
// shots' sfx marks (window.cues()), so it always lands on the frame.
export const SCORE = {
  bpm: 120, key: "D", swing: 0.58, seed: 3, hook: true, reverb: 0.16,
  sections: [
    { at: 0, mood: "intro" },
    { at: 2.0, mood: "groove" },
    { at: 16.5, mood: "tiptoe", gain: 1.6 },
    { at: 19.5, mood: "groove" },
    { at: 23.5, mood: "outro" },
  ],
  stops: [11.2, 16.1],
};

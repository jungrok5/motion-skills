// The starting film's bed (lib/score.js spec). Times are seconds; once voice/words.json exists, compute them from
// the words like examples/leaning-tower/score.js does, so the sound moves with the voice.
// Render: node <skill>/scripts/score.mjs score.js --dur <DURATION from check.mjs> [--voice voice/voice.mp3 --words voice/words.json]
export const SCORE = {
  bpm: 112, key: "C",
  sections: [
    { at: 0, mood: "bouncy" },
    { at: 3.56, mood: "tense", gain: 0.9 },    // "You knock it off the table" — the toast spins
    { at: 7.11, mood: "explain" },             // "You see,"
    { at: 14.75, mood: "payoff" },             // "Want it to land butter side up?" — ends on a button
  ],
  sfx: [
    { at: 2.81, kind: "gasp-sting" },          // "physics"
    { at: 3.82, kind: "whoosh" },              // "knock"
    { at: 6.4, kind: "riser", dur: 1.4 },      // ends on the cut to "You see"
    { at: 12.95, kind: "thud" },               // "down" — the toast lands
    { at: 17.48, kind: "ding" },               // "taller"
  ],
};

// The starting film's score (spec: lib/score.js). A function of the film, so every section starts on its chapter and
// the closing cadence lands on the card. Render: node <skill>/scripts/score.mjs film.html  → out/score.wav
export const score = (F) => {
  const ch = (n) => F.chapters.find((c) => c.n === n).from, card = F.cards[0].from;
  return {
    tonic: "D", scale: "yu", bpm: 54, seed: 7, reverb: 0.6,
    sections: [
      { at: 0, mood: "night" },              // 01 夜湖 — low plucks over wind
      { at: ch(2), mood: "flute" },          // 02 竹骨与纸 — a flute line as the lantern lights
      { at: card, mood: "close" },           // the card — a slow run up to the tonic and a bell
    ],
    hits: [
      { at: 0.4, kind: "gong", gain: 0.6 },
      { at: ch(2) - 0.1, kind: "wood" },
      { at: ch(2) + 1.6, kind: "chime" },    // the flame catches
    ],
  };
};

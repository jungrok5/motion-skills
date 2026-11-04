// 비움의 미학 — score (spec: lib/score.js). Pyeongjo pentatonic on E: gayageum-like plucks with slides, a daegeum-like
// flute, a wooden clapper knock at each chapter, a bell as the moon rises, a closing cadence on the card.
// Render: node <skill>/scripts/score.mjs index.html → out/score.wav
export const score = (F) => {
  const ch = (n) => F.chapters.find((c) => c.n === n).from, card = F.cards[0].from, lastLine = F.lines[F.lines.length - 1];
  return {
    tonic: "E", scale: "pyeongjo", bpm: 52, seed: 12, reverb: 0.65,
    sections: [
      { at: 0, mood: "mist" },                     // 01 여백 — wind, a few slow plucks
      { at: ch(2), mood: "walk" },                 // 02 처마 — a melody walks with the camera
      { at: ch(3), mood: "still", gain: 0.9 },     // 03 창호 — bells, breath
      { at: ch(4), mood: "flute" },                // 04 달항아리 — the flute
      { at: card, mood: "close" },                 // the card — a slow run up, the tonic, a bell
    ],
    hits: [
      { at: 0.3, kind: "gong", gain: 0.55 },
      { at: ch(2) - 0.15, kind: "wood" }, { at: ch(3) - 0.15, kind: "wood" }, { at: ch(4) - 0.15, kind: "wood" },
      { at: ch(3) + 1.5, kind: "chime", gain: 0.8 },  // the paper starts to glow
      { at: lastLine.from - 1.0, kind: "bell", deg: 2 }, // the moon
    ],
  };
};

/* script.js — THE STORY of one film: beats, on-screen words, end card. Scenes read window.SCRIPT.
   Placeholder for the mograph template (the same template story as every house-style kit): the character walks in, kneels,
   plants a seed, waits, a sprout rises in the accent light at 14, she stands and looks at it at 18, end card at 26.
   Mograph cuts its worlds on bar lines: BPM sets the grid (120 BPM → a bar is 2 s, so every beat below sits on a bar or a beat).
   `scenes` = which world plays when (ids the template knows: grid, draft, bubble, stage, manga, keys, card). */
window.SCRIPT = {
  DUR: 30,
  BPM: 120,
  beat: { walk: [0, 4], kneel: 4.6, plant: 6.0, wait: [8, 13], sprout: 14.0, rise: 18.0, end: 26.0 },
  scenes: [
    { id: 'grid',   at: 0 },     // ① window grid — she walks in inside the gold window
    { id: 'draft',  at: 4 },     // ② drafting sheet — drawn in line, kneels, plants (compass circle on the seed)
    { id: 'bubble', at: 8 },     // ③ pink bubbles — '기다리는 중…', neon '기다림'
    { id: 'stage',  at: 14 },    // ④ red stage — the sprout rises in the accent light, '쑥!'
    { id: 'manga',  at: 18 },    // ⑤ manga panels — she stands and looks at it, '반짝!'
    { id: 'keys',   at: 22 },    // ⑥ 3-D keyboard — happy steps press ㅆ ㅏ ㄱ → '싹!'
    { id: 'card',   at: 26 },    // ⑦ kaleidoscope of the worlds + the end card in a gold window
  ],
  // [from, to, text, source?] — ≤ 2 lines, ≥ ~2 s each; scripture verbatim (개역개정) with its source line
  lines: [[0.3, 3.8, '아무것도\n보이지 않아도'], [6.0, 9.5, '묻어 둔 것은'], [14.0, 17.6, '자라고 있었다']],
  endCard: { title: '여기에\n제목', passage: '본문 1:1', by: '교회 · 설교자', compact: true },
};

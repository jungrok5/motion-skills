/* script.js — THE STORY of one film: beats, on-screen words, end card. Scenes read window.SCRIPT.
   Placeholder shared by every house-style template (so templates are comparable): walk in, kneel, plant, wait, a sprout
   rises in the accent at 14, stands at 18, end card at 26. In the recipecard kit the same story is told as a recipe
   ("싹 한 포기"): the planter arrives and is filled (walk), a hole is pressed (kneel), the seed goes in (plant), water and
   days pass (wait), the sprout rises in the accent (sprout), it straightens up and opens its leaves (rise), 완성, end card.
   Replace every line with this film's words (scripture verbatim from 개역개정, with its source line). Beats are seconds. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    walk: [0, 4],      // STEP 1 — the planter is on screen at frame 0; three scoops of soil go in
    kneel: 4.6,        // STEP 2 — a dibber presses a hole (≈ .35 s down, back up)
    plant: 6.0,        // STEP 3 — the seed drops into the hole and is covered
    wait: [8, 13],     // STEP 4 — water, light, days: the checklist ticks; under the soil a root draws itself
    sprout: 14.0,      // STEP 5 — the sprout rises in the accent (a bent hook)
    rise: 18.0,        // STEP 6 — it straightens up and opens its leaves
    leaves: 20.0,      // a second pair unfolds
    done: 22.0,        // 완성 — the last rail dot ticks
    end: 26.0,         // end card (~4 s), then the loop seam into frame 0
  },
  // the recipe's words (the template draws them on the step cards, the rail and the checklist)
  title: '싹 한 포기', sub: '오늘의 레시피',
  rail: ['흙', '자리', '씨앗', '기다림', '싹', '일어서기'],
  cards: [
    { amount: '3 스푼', name: '흙 담기', note: '포슬포슬하게, 꾹 누르지 말고' },
    { amount: '1 cm', name: '자리 잡기', note: '손가락 한 마디만큼' },
    { amount: '1 알', name: '씨앗 심기', note: '살짝 덮어 주기' },
    { amount: '5 일', name: '기다리기', note: '아무 일도 없어 보여도' },
    { amount: '1 포기', name: '싹', note: '드디어, 흙을 밀고' },
    { amount: '쑥!', name: '일어서기', note: '고개를 들고 잎을 펴고' },
  ],
  checklist: [['2 큰술', '물'], ['하루', '햇볕'], ['5 일', '기다림']],
  final: { kicker: '다 됐다!', amount: '완성!', name: '싹 한 포기', note: '물은 이틀에 한 번' },
  // [from, to, text, source?] — ≤ 2 lines, ≥ ~1.6 s each (drawn in the subtitle slot under the title)
  lines: [
    [0.3, 3.8, '아무것도\n보이지 않아도'],
    [6.0, 9.5, '묻어 둔 것은'],
    [14.0, 17.6, '자라고 있었다'],
  ],
  // end card placeholder — new-film.py replaces it with Story.card(SOURCE) (title + two small lines, compact ~4 s)
  endCard: { title: '제목을\n여기에', passage: '본문 1:1', by: '교회 · 설교자', compact: true },
  loop: 0.6,
};

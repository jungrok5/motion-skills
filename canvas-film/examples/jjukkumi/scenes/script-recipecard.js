/* script-recipecard.js — scene 2 of 「쭈꾸미 한 접시」 (cook-recipecard, 24 s): beats and every word on screen.
   The step cards carry the words (no captions): title → 6 steps → 완성!. Beats are seconds. */
window.SCRIPT = {
  DUR: 24,
  beat: {
    tip: .3,               // the bucket of red 쭈꾸미 (from the sea scene) tips over the bowl
    pour: [.8, 1.55],      // the pieces drop out one by one
    title: .35, sub: .8,   // 「쭈꾸미볶음」 pops in, the small line under it
    rail: 1.9,             // the progress rail draws on
    step: [2.6, 6.0, 9.0, 13.6, 16.8, 19.0],   // each step becomes current (and the one before is ticked)
    flour: 2.75, salt: 3.35, rub: [3.9, 5.0], rinse: [5.0, 5.8],
    drop2: 6.45, timer: [6.9, 8.6],
    spoons: [9.45, 10.27, 11.09, 11.91, 12.73],
    drop4: 13.8, onion: 14.45, leek: 14.85, toss: [15.3, 15.95],
    heatOff: 17.0, oil: [17.35, 18.45],
    msgs: [19.7, 20.3], typing: [20.8, 21.6], reply: 21.6,
    done: 22.4,            // 완성! — the last dot ticks, the dish gets its dashes
  },
  title: '쭈꾸미볶음', sub: '바다에서 바로 온',
  rail: ['손질', '데치기', '양념', '볶기', '참기름', '초대'],
  cards: [
    { step: 1, amount: '2 큰술', name: '밀가루 + 굵은소금', note: '바락바락 주무르고, 헹구기', bar: [3.9, 5.0], unit: '{n} / 30번', n: 30 },
    { step: 2, amount: '30초', name: '끓는 물에 데치기', note: '살짝만 — 오래 삶으면 질겨요', bar: [6.9, 8.6], unit: '{n} / 30초', n: 30 },
    { step: 3, sauce: true },
    { step: 4, amount: '센 불', name: '볶기 + 양파 · 대파', note: '물 생기기 전에, 빠르게', bar: [14.0, 16.6], unit: '{n}분', n: 2 },
    { step: 5, amount: '한 바퀴', name: '참기름', note: '불 끄고 마지막에 휘—', bar: [17.35, 18.45], unit: '{n}°', n: 360 },
    { step: 6, amount: '2 명', name: '친구 부부 초대', note: '갓 잡은 쭈꾸미로 저녁 한 끼', bar: [19.7, 21.6], wait: '답장 기다리는 중', got: '답장 왔다!' },
  ],
  // step 3: one spoon per beat (amount, name, note) — the checklist ticks them off as they land
  sauce: [
    ['2 큰술', '고추장', '양념의 바탕'],
    ['1 큰술', '고춧가루', '색과 매운맛'],
    ['1 큰술', '간장', '간은 여기서'],
    ['1 큰술', '다진마늘', '듬뿍 한 큰술'],
    ['1 큰술', '설탕', '매운맛을 둥글게'],
  ],
  sauceUnit: '{n} / 6 큰술',
  phone: { name: '친구 부부', me: ['쭈꾸미 잡았어!', '저녁 먹으러 와'], reply: '콜! 7시에 갈게' },
  final: { kicker: '다 됐다!', amount: '완성!', name: '쭈꾸미볶음', note: '넷이 먹을 저녁 한 접시' },
  lines: [],
};

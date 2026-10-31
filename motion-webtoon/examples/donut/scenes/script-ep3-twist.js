/* script-ep3-twist.js — 「마지막 도넛」 scene 3 (반전): beats (seconds) and every on-screen word. window.SCRIPT for ep3-twist.html.
   Strip, top → bottom: A freeze flash + the fourth hand → B 하늘 eating (punchline 1) → C silent beat 「……」 → D stone + crumble →
   E door, 사장님 with three boxes → F tears of joy → G 「지금 회의 시작!」 (punchline 2) → H dragged off → I 하늘 「다녀오세요~」 → end card.
   Reading time (BRIEF): 1.2 s + .07 s per character; every balloon below is up at least that long. */
window.SCRIPT = {
  DUR: 24,
  beat: {
    flash: 0.0,       // white freeze flash over the frozen lunge (번쩍)
    hand: [0.55, 0.95, 1.7],   // the fourth hand enters → pinches the donut (쏙) → gone with it
    close: 1.45,      // the three hands close on air
    bite: 2.55,       // 하늘 bites (바삭) — B
    offer: 4.55,      // she holds the half-eaten donut out: 「드실래요?」
    beat: 7.4,        // C: the silent beat (the three frozen, hands still out)
    stone: 8.52,      // D: hard cut — SD stone (flash + poof)
    crumble: 9.15,    // …the statues crack and fall (털썩 ≈ .5 s later)
    door: 10.45,      // E: 끼익 — the door opens, 사장님 glowing with three full boxes
    joy: 13.55,       // F: three SD faces, tears of joy
    meeting: 16.6,    // G: 「지금 회의 시작!」 (punch)
    drag: 18.55,      // H: dragged off by the collar, looking back at the boxes
    bye: 20.25,       // I: the empty pantry, 하늘 waves 「다녀오세요~」
    end: 22.0,        // end card
  },
  // [at, out, text]
  lines: {
    sfxFlash: '번쩍', sfxPluck: '쏙', sfxBite: '바삭', sfxCrumble: '털썩', sfxDoor: '끼익', sfxDrag: '질질', sfxWow: '와아…',
    mine: [2.75, 6.35, '아, 이거 제가 아까 사 온 건데…'],
    offer: [4.6, 6.35, '드실래요?'],
    dots: [7.55, 8.5, '……'],
    boss: [10.95, 13.3, '다들 고생 많지? 도넛 사 왔어~'],
    later: [15.0, 18.35, '근데 회의 끝나고 먹자.'],
    now: [16.6, 18.35, '지금 회의 시작!'],
    bye: [20.3, 22.0, '다녀오세요~'],
    sign: '회의실',
  },
  endCard: { title: '마지막 도넛', end: '끝', next: '다음 화: 회의는 길었다' },
};

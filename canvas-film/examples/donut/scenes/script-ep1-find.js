/* script-ep1-find.js — 「마지막 도넛」 scene 1 · 발견 (24 s). Beats (seconds) and every on-screen word for ep1-find.html.
   The camera is timed to these beats (see CAMERA in the scene); each balloon shows [at, out] and out − at ≥ Webtoon.readTime(text).
   Strings are Korean source text; the kit passes them through Pilot.tr. */
window.SCRIPT = {
  DUR: 24,
  beat: {
    title: .3,          // title card pops
    office: 2.6,        // camera on the office (narration 2.5 → 5.0)
    slump: 5.6,         // 박대리 melted on the desk
    growl: 5.95,        // SFX 꼬르륵
    mono: 6.55,         // 「…단 거.」 (pen-script monologue)
    walk: [8.0, 10.6],  // the zombie walk to the pantry (wide, borderless)
    gutter: 10.9,       // the silent black gutter (camera pauses before the reveal)
    donut: 11.42,       // HIT: the over-dramatic donut close-up (snap, punch, flash, rays)
    reach: 14.1,        // his hand creeps toward the donut
    shadow: 15.05,      // a shadow falls over hand and box
    kim: 16.15,         // 김과장 in the doorway (smile → glint at kimGlint)
    kimGlint: 17.45,
    choi: 19.05,        // 최주임 pops out from behind the fridge, hand up
    eyes: 21.45,        // the three-eye strip; 두근 at heart, sweat at sweat
    heart: 21.9,
    sweat: 22.35,
  },
  words: {
    title: '마지막 도넛',
    sub: '제1화 · 발견',
    narr1: [2.5, 5.0, '오후 3시. 당이 떨어지는 시간.'],
    mono: [6.55, 8.2, '…단 거.'],
    narr2: [11.75, 13.7, '마지막, 하나.'],
    kim: [16.3, 18.6, '어? 박대리도 출출했나 봐?'],
    choi: [19.2, 20.9, '저도요!'],
    sfx: { growl: '꼬르륵', step: '터벅', twinkle: '반짝', flinch: '움찔', heart: '두근' },
  },
};

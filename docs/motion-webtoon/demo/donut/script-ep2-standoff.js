/* script-ep2-standoff.js — 「마지막 도넛」 scene 2 「눈치 싸움」 (26 s): beats (seconds) and words. window.SCRIPT for ep2-standoff.html.
   The camera stops are keyed to these beats (stop[i] = [arrive, leave] on panel i); every balloon holds ≥ Webtoon.readTime(text)
   (the page warns in the console if one does not). Pass Korean; the kit translates inside balloons / SFX. */
window.SCRIPT = {
  DUR: 26,
  // camera: [panel id, arrive, leave] — the glide is the time between one leave and the next arrive
  stops: [
    ['p1', 0, 2.9],        // the pantry: three round the last donut, all smiles
    ['p2', 3.35, 5.6],     // 김과장 smiles… the aura rises
    ['p3', 6.05, 8.0],     // 박대리 → 최주임, two auras
    ['p4', 8.5, 10.9],     // three inner voices (split panel)
    ['p5', 11.2, 13.15],   // 최주임: 그럼… 가위바위보! (register switch → shōnen)
    ['p6', 13.5, 15.25],   // 가위! 바위! 보! — all 보
    ['p7', 15.6, 17.0],    // again — all 보 (smaller, same framing)
    ['p8', 17.35, 18.45],  // deadpan SD 「…」
    ['p9', 18.8, 20.95],   // 박대리: 하나, 둘, 셋 하면 동시에!
    ['p10', 21.65, 22.45], // the silent beat: the donut (long gutter before it)
    ['p11', 22.8, 26],     // 하나 · 둘 · 셋! → the slow-motion lunge, ends an instant before contact
  ],
  beat: {
    polite: 1.0,                        // the eye strip (scene 1's last panel) snaps from glints to polite smiles
    aura2: 3.7, rumble2: 4.3,           // 김과장's aura + 쿠구구구
    aura3a: 6.3, aura3b: 6.9, rumble3: 7.1,
    think: [8.62, 8.86, 9.1],           // the three thought clouds pop (one per column)
    shout: 11.25,                       // 최주임's shout (zoom punch)
    rps1: [13.6, 14.05, 14.5],          // 가위! 바위! 보! (the reveal on 보)
    sweat1: 14.85,
    rps2: 15.7, rps2Reveal: 16.22, sweat2: 16.5,
    dead: 17.45,
    plan: 18.9, glint: 19.05,
    count: [22.9, 23.25, 23.6],         // 하나 · 둘 · 셋!
    lunge: [23.62, 25.6],               // slow motion; the hands stop a hair short of the donut
  },
  // [at, out, text, who] — who: speaker key (park / kim / choi) or a list for the three thoughts
  lines: {
    offer1: [1.1, 2.85, '과장님 드세요~', 'park'],
    offer2: [3.45, 5.58, '아냐, 젊은 사람이 먹어야지', 'kim'],
    offer3: [6.15, 7.98, '주임님 드세요~', 'park'],
    think: [8.62, 10.88, '(절대 양보 못 해)', ['park', 'kim', 'choi']],
    shout: [11.25, 13.13, '그럼… 가위바위보!', 'choi'],
    plan: [18.85, 20.93, '하나, 둘, 셋 하면 동시에!', 'park'],
  },
  tag: ['눈치 싸움 중…', '가위바위보 중…'],   // the ✱ caption tag (before / after the shout)
  sfx: {
    rumble: '쿠구구구', polite: '방긋', rps: ['가위!', '바위!', '보!'], rps2: '가위바위보!', dots: '……', count: ['하나', '둘', '셋!'], whoosh: '휘이익',
  },
};

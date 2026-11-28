// 「벚꽃 찻집의 말차 튤립」 — the worked example: a spring tea house's matcha latte, a four-stack tulip poured upward (the
// pitcher held below the cup), in a dark stoneware cup on a pink-chip terrazzo counter. Korean.
// Designed from its brief (BRIEF.md): the source clips pour rosettas on espresso; this one is a tulip, on matcha, from
// another direction.
import { film } from 'latte/film.js';

film({
  title: '벚꽃 찻집의 말차 튤립',
  kicker: '봄 한정 · 세 번째 잔',
  caption: '높이서 부어 바탕을 채우고, 낮게 내려 한 송이씩 밀어 넣은 뒤 단번에 그어 줄기를 세웁니다.',
  lang: 'ko',
  size: [1080, 1920],
  seed: 23,
  drink: 'matcha',
  dir: 270,                                   // poured upward: the pitcher below, the flower opens toward the top
  cup: { color: '#2e3a43', rim: '#3a4852', inner: '#ece5d8', saucer: '#d6ccbf', handle: 0 },
  table: { kind: 'terrazzo', color: '#efe7de', accent: '#d68f9d' },
  ink: '#3b2f2c',
  accent: '#b4566b',
  pour: [
    { do: 'fill', dur: 2.4, at: [0, -.15], swirl: .15, say: '높이서 부어 바탕을 채운다' },
    { do: 'drop', dur: .6, at: [0, -.3], say: '낮게 내려 첫 송이를 피운다' },
    { do: 'pour', dur: 1.4, to: [0, -.3] },
    { do: 'punch', dur: .5, to: [0, -.12], say: '끊고, 뒤에서 밀어 넣는다' },
    { do: 'drop', dur: .4, at: [0, -.12] },
    { do: 'pour', dur: 1.0 },
    { do: 'punch', dur: .5, to: [0, .04] },
    { do: 'drop', dur: .4, at: [0, .04] },
    { do: 'pour', dur: .8 },
    { do: 'punch', dur: .5, to: [0, .18] },
    { do: 'drop', dur: .4, at: [0, .18] },
    { do: 'pour', dur: .6 },
    { do: 'lift', dur: .3, q: .35, say: '들어 올려 줄기를 긋는다' },
    { do: 'cut', dur: .5, to: [0, -.86] },
  ],
});

/* script.js — THE STORY of one film: beats, on-screen words, end card. Scenes read window.SCRIPT.
   Placeholder for the inkmap template (a journey across one map): replace every line with this film's words (scripture
   verbatim from 개역개정, with its source line). Place names on the map come from `places` (translatable; write each
   language's Bible spelling in its i18n file). The route is a list of InkMap.MED.city names or [lon, lat] points. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    map: 0.0,      // the map, close on the start
    go: 2.6,       // the trail sets out (a dashed ink line with a red head)
    arrive: 17.0,  // it reaches the end of the route
    light: 18.4,   // light runs back along the whole route: every place on it lights
    pull: 19.6,    // the camera pulls back to the whole region
    end: 25.8,     // end card
  },
  route: ['ur', [45.2, 31.9], 'babylon', [42.0, 34.4], [40.2, 35.6], 'haran', [37.5, 36.4], [36.6, 34.8], 'damascus', 'shechem', 'bethel', 'hebron'],
  stops: ['ur', 'haran', 'shechem', 'hebron'],                     // labelled and lit when the trail reaches them (keep stops apart at the zoom they're seen)
  places: { ur: '출발지', haran: '두 번째 땅', shechem: '도착지', hebron: '마지막 장막', sea: '바다 이름' },
  // the camera: [t, lon, lat, zoom] — eased between keys (portrait / landscape)
  cam: {
    v: [[0, 45.6, 31.6, 2.0], [2.6, 45.6, 31.6, 2.0], [9.0, 40.6, 35.6, 1.5], [12.0, 38.6, 35.8, 1.5], [17.0, 35.8, 32.4, 1.7], [19.6, 35.8, 32.4, 1.7], [23.0, 40.4, 33.6, .78]],
    h: [[0, 45.0, 31.8, 2.2], [2.6, 45.0, 31.8, 2.2], [9.0, 40.6, 35.4, 1.7], [12.0, 38.6, 35.4, 1.7], [17.0, 36.4, 32.6, 1.9], [19.6, 36.4, 32.6, 1.9], [23.0, 40.6, 33.8, 1.05]],
  },
  // [from, to, text, source?] — ≤ 2 lines, ≥ ~3.5 s each (captions at the top, over the dark band)
  lines: [
    [0.6, 4.4, '지도 위의 한 점에서'],
    [4.8, 9.2, '길이 시작됩니다'],
    [9.6, 14.6, '여기에 성경 구절 한 줄', '책 1:1 (개역개정)'],
    [18.6, 25.2, '그 길 전체가\n하나의 이야기입니다'],
  ],
  endCard: { title: '영상 제목을\n여기에', passage: '본문 장:절', by: '채널 이름', cta: '이 장을 직접 읽어 보세요' },
};

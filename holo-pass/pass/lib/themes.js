// holo-pass · themes.js — the templates. A theme = default words (in ko/en/ja), an animated picture (art.js), a stage
// background, a palette and a music track. Add one by copying an entry; references/THEMES.md walks through it.
(function () {
  const HP = (window.HP = window.HP || {});
  HP.THEMES = {
    'christmas': {
      name: { ko: '크리스마스', en: 'Christmas', ja: 'クリスマス' },
      title: 'MERRY\nCHRISTMAS',
      subtitle: { ko: '즐거운 성탄, 행복한 새해', en: 'Merry Christmas and a happy new year', ja: 'よいクリスマスと新年を' },
      message: { ko: '올해도 고마웠어요. 따뜻한 연말 보내요!', en: 'Thank you for this year. Have a warm holiday!', ja: '今年もありがとう。あたたかい年末を!' },
      art: 'tree', bg: 'night', music: 'bells',
      pal: { paper: '#fbf7ee', ink: '#2a2233', sub: '#8a7f8f', accent: '#e8a21b', line: '#2b2340',
        sky: ['#3a2a5c', '#1e1636'], a: ['#2f9e5b', '#1f7a45', '#ffd34d', '#e5484d', '#7fc8ff'], bg: ['#120d1f', '#05030a'], glow: '#ffd98a' },
    },
    'new-year': {
      name: { ko: '새해 인사', en: 'New Year', ja: '年賀' },
      title: 'NEW YEAR\n2027',
      subtitle: { ko: '새해 복 많이 받으세요', en: 'Wishing you a bright new year', ja: '謹賀新年' },
      message: { ko: '새해에도 건강하고 웃는 일 가득하길!', en: 'Wishing you health and lots of laughter.', ja: '新しい年も笑顔いっぱいの一年に!' },
      art: 'sunrise', bg: 'rays', music: 'koto',
      pal: { paper: '#fbf5ea', ink: '#3a1d1d', sub: '#9a7b72', accent: '#d8382f', line: '#4a1f1f',
        sky: ['#f7c1a6', '#f08a6a'], a: ['#e5483f', '#fff4e4', '#3c6e8f', '#f6c445', '#2f4f6b'], bg: ['#c8231d', '#7c0d0d'], glow: '#ffe2b0' },
    },
    'home-party': {
      name: { ko: '홈파티', en: 'Home party', ja: 'ホームパーティ' },
      title: 'HOME\nPARTY',
      subtitle: { ko: '우리 집에 놀러 올래요?', en: 'Come over to our place', ja: 'うちに遊びに来ませんか' },
      message: { ko: '주말에 우리 집에서 놀아요. 맛있는 거랑 보드게임 준비해 둘게요!', en: 'Come over this weekend — snacks and board games are on us!', ja: '週末、うちで遊ぼう。ごはんとボードゲームを用意して待ってます!' },
      art: 'house', bg: 'warm', music: 'party',
      pal: { paper: '#fcf6ea', ink: '#3b2a1e', sub: '#9c8670', accent: '#f0702c', line: '#3b2418',
        sky: ['#ffcf6b', '#ff9f43'], a: ['#ff7a59', '#fff1d6', '#7a4a2e', '#ffd25e', '#5bb98c'], bg: ['#3a2213', '#120904'], glow: '#ffc56b' },
    },
    'date-night': {
      name: { ko: '데이트', en: 'Date night', ja: 'デート' },
      title: 'DATE\nNIGHT',
      subtitle: { ko: '우리 같이 보낼래요?', en: 'Spend the evening with me?', ja: '一緒に過ごしませんか' },
      message: { ko: '그날 저녁, 비워 둬요. 좋은 데 예약해 둘게요.', en: 'Keep that evening free. I booked somewhere nice.', ja: 'その夜は空けておいてね。素敵なお店を予約しておくね。' },
      art: 'coffee', bg: 'dusk', music: 'cafe',
      pal: { paper: '#fcf4f2', ink: '#3a2030', sub: '#a08090', accent: '#e0457b', line: '#40203a',
        sky: ['#ffd6e4', '#f6a9c6'], a: ['#ffffff', '#ff7aa8', '#8b5a3c', '#ffd1dc', '#c6a4ff'], bg: ['#2a1238', '#0b0412'], glow: '#ffb3d0' },
    },
    'birthday': {
      name: { ko: '생일', en: 'Birthday', ja: '誕生日' },
      title: 'BIRTHDAY\nPARTY',
      subtitle: { ko: '생일 파티에 초대합니다', en: "You're invited to my birthday", ja: '誕生日パーティーへのご招待' },
      message: { ko: '케이크는 내가 준비할게요. 몸만 와요!', en: "I've got the cake. Just bring yourself!", ja: 'ケーキは用意しておくよ。手ぶらで来てね!' },
      art: 'cake', bg: 'confetti', music: 'party',
      pal: { paper: '#fbf8f0', ink: '#24304a', sub: '#7f8aa0', accent: '#2f9fd8', line: '#22304a',
        sky: ['#c9f0e4', '#8fdcc7'], a: ['#ff8fb1', '#fff6e8', '#ffd25e', '#7fd1ff', '#b48cff'], bg: ['#1b2440', '#070a14'], glow: '#ffe6a6' },
    },
    'event': {
      name: { ko: '행사 · 부스', en: 'Event · booth', ja: 'イベント' },
      title: 'MARKET\nDAY',
      subtitle: { ko: '부스에 놀러 오세요', en: 'Come see us at our booth', ja: 'ブースでお待ちしています' },
      message: { ko: '부스에서 기다리고 있을게요. 들러서 인사해요!', en: "We'll be at the booth all day — come say hi!", ja: 'ブースでお待ちしています。ぜひ声をかけてください!' },
      art: 'tent', bg: 'warm', music: 'cafe',
      pal: { paper: '#fbf7ee', ink: '#202a3a', sub: '#8790a0', accent: '#e9542f', line: '#1f2a3d',
        sky: ['#bfe6ff', '#8ccfff'], a: ['#e9542f', '#fff8ec', '#ffcf3f', '#3aa6a0', '#ffffff'], bg: ['#24170e', '#0b0603'], glow: '#ffd27a' },
    },
  };
  HP.THEME_ORDER = Object.keys(HP.THEMES);
  for (const id of HP.THEME_ORDER) HP.THEMES[id].id = id;
  // a theme designed for one topic (pass/themes/custom.js): HP.addTheme({ id, name, title, subtitle, message, bg, music, pal }, art)
  HP.addTheme = (def, art) => {
    const id = def.id; if (!id) throw new Error('addTheme: id is required');
    const th = { art: id, ...def }; th.name = th.name || { ko: id, en: id, ja: id };
    for (const k of ['subtitle', 'message']) if (typeof th[k] === 'string') th[k] = { ko: th[k], en: th[k], ja: th[k] };
    if (art) HP.ART[th.art] = art;
    HP.THEMES[id] = th; if (!HP.THEME_ORDER.includes(id)) HP.THEME_ORDER.push(id);
    return th;
  };
})();

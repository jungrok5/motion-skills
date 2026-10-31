/* script.js — 「도넛 가게 마감까지 3분」 (a silent sketch-anime short, portrait). Beats in seconds, every on-screen string here.
   After the long meeting (「회의는 길었다」) 하늘 drives the old delivery bike, 최주임 clings on, 박대리 holds the empty donut box
   up like a flag — three minutes to the donut shop's closing time. */
window.SCRIPT = {
  DUR: 19,
  beat: {
    title: 0.3,      // 「도넛 가게 마감까지」 / 「3분」 lettered in
    note: [0.9, 3.8],// the small pen note under it
    bump: 3.6,       // a pothole: the bike hops, everyone lifts off the seat
    two: 5.9,        // 3 struck out → 2
    throttle: 5.7,   // 하늘 opens the throttle: faster, more dust, more wind
    one: 10.2,       // 2 struck out → 1!
    shop: 11.6,      // the donut shop slides in from the left; its shutter starts down
    brake: 12.3,     // brakes: the rear wheel locks, skid, the nose dips
    stop: 13.7,      // stopped in front of the shop
    shut: 14.0,      // the shutter clunks shut with 「품절」 taped on it
    engulf: 14.5,    // the dust cloud catches up and swallows them
    pull: 16.0,      // pull back: three tiny heads in a huge cloud
    end: 16.6,       // the closing words
  },
  words: {
    title: '도넛 가게 마감까지',
    count: ['3분', '2분', '1분!'],
    note: '회의 끝. 오후 7시 57분.',
    close: '내일 또 오자…',
    kicker: '마지막 도넛 · 번외편',
  },
  lines: [],
};

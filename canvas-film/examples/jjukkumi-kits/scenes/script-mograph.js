/* script-mograph.js — 「쭈꾸미 한 접시」 scene 2 (cook-mograph): beats, on-screen words. Read by scenes/cook-mograph.html.
   120 BPM → a beat = .5 s, a bar = 2 s; 11 bars. Every world cut sits on a bar line, every word on a beat.
   The cooks are the couple 경찬 · 명현 (명현 caught the 쭈꾸미; BRIEF.md → CAST), side by side through every world.
   ① window grid (bars 1–2): the wooden tub of red 쭈꾸미 from scene 1, tipped out on the counter — 「경찬 · 명현 부부의」「손질 시작!」
   ② manga (bar 3): 경찬 pours the flour, 명현 rubs while he holds the bowl — 「밀가루로 박박」 / 박박!
   ③ drafting sheet (bar 4): pot cross-section, 명현 dips the strainer, 경찬 times it (a 30-second dial) — 「끓는 물 30초」
   ④ yellow (bars 5–6): 경찬 tips a measuring spoon into the bowl on every beat (its amount pops), 명현 stirs → 양념
   ⑤ navy stage (bars 7–8): 명현 tosses the wok on the beat, 경찬 pours the sauce, it coats deep red — 「센 불에 휘리릭」
   ⑥ bubbles (bars 9–10): 명현's phone, the chat to 「정록 · 세진」 — 「쭈꾸미 잡았어!」「저녁 먹으러 와」 … 「콜! 7시에 갈게」; 경찬 leans in
   ⑦ kaleidoscope (bar 11): they set the plate down together — 「완성!」, fade to black. */
window.SCRIPT = {
  DUR: 22,
  BPM: 120,
  beat: { tip: 2.0, dive: 3.55, pourEnd: 4.75, rub: 4.95, dip: 6.4, lift: 7.5, jamo: 10.5, assemble: 11.0, set: 20.5 },
  scenes: [
    { id: 'counter', at: 0 },    // ① window grid — the bucket, tipped out
    { id: 'flour',   at: 4 },    // ② manga panels — flour, rub
    { id: 'blanch',  at: 6 },    // ③ drafting sheet — blanch 30 s
    { id: 'season',  at: 8 },    // ④ yellow — the seasoning, spoon by spoon
    { id: 'wok',     at: 12 },   // ⑤ navy stage — high flame
    { id: 'chat',    at: 16 },   // ⑥ pink bubbles — the invitation
    { id: 'done',    at: 20 },   // ⑦ kaleidoscope — 완성
  ],
  // the seasoning: [beat (s), label, ingredient kind, spoonfuls]
  season: [[8.0, '고추장 2', 'gochujang', 2], [8.5, '고춧가루 1', 'gochugaru', 1], [9.0, '간장 1', 'ganjang', 1], [9.5, '마늘 1', 'garlic', 1], [10.0, '설탕 1', 'sugar', 1]],
  // the chat, sent by 명현 to the group 정록 · 세진: [at, who ('me' = 명현 | 'them' | 'photo' | 'dots'), text, until]
  chat: [[16.5, 'me', '쭈꾸미 잡았어!'], [17.0, 'photo', ''], [17.5, 'me', '저녁 먹으러 와'], [18.0, 'dots', '', 18.5], [18.5, 'them', '콜! 7시에 갈게']],
  group: '정록 · 세진',
  intro: ['경찬 · 명현 부부의', '손질 시작!'],   // the names line, then the first step (popped at .5 and 1.5, out at 3.9)
  // [from, to, text] — chunky words in the top band (y 300)
  lines: [[4.1, 5.95, '밀가루로 박박'], [6.1, 7.95, '끓는 물 30초'], [12.1, 15.8, '센 불에 휘리릭'], [20.5, 21.95, '완성!']],
};

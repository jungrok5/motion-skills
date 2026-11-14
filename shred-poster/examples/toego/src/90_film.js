// 「퇴고」 · 90_film — chosen for this topic (BRIEF.md): 28 strips (thin manuscript stock tears into more, narrower
// bands), the rebuild lands from the middle outwards (a sentence fixed in the middle first, then the lines around it),
// a warm wooden desk instead of concrete, a deep green shredder (the other colour of 원고지), the inset on the
// poster's own cream, a warmer grade and a brighter, lighter paper sound.
SP.film({
  title: '퇴고',
  fps: 60,
  cuts: { cascade: 0.5, machine: 2.37, rebuild: 4.4, end: 8.0 },
  poster: POSTER,
  sheet: { strips: 28, jitter: 0.18, seed: 21, order: 'middle', floor: { lo: 0.2, hi: 0.33, tint: '#f2dcc0', relief: 0.35 } },
  cascade: { width: 0.25, floor: { lo: 0.3, hi: 0.37, tint: '#f6e8d4' } },
  machine: { body: '#1f3a2e', steel: '#a8a49c', bg: '#F3EEDF' },
  studio: { top: '#f6efe2', horizon: '#ada496', ground: '#3d362e' },
  grade: { warm: 1.4 },
  sound: { character: { bright: 1.15, body: 0.85 } },
});

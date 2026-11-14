// Tarn Wyrm — ⑦ the score.  One self-contained function (it runs in a worker): a drone, a low flute, a drum, a gong,
// the water and the wind.  K = the synth kit (lib/85_audio.js), B = the beat sheet.  D dorian.
DR.score(function (K, B, o) {
  K.group('bed', { fade: false }); K.group('music', { fadeOut: 2 }); K.group('hero');
  K.bus('air', { group: 'bed', gain: 1 }); K.bus('drone', { group: 'music', gain: 0.5, rev: 0.3 }); K.bus('flute', { group: 'music', gain: 1.3, pan: -0.1, rev: 0.4, dly: 0.1 });
  K.bus('drum', { group: 'music', gain: 0.9, rev: 0.25 }); K.bus('gong', { group: 'music', gain: 1.1, rev: 0.4 }); K.bus('fx', { group: 'hero', gain: 0.7, rev: 0.3 }); K.bus('roar', { group: 'hero', gain: 1.4, rev: 0.4 });
  K.bed('air', { colour: 'brown', filters: [['hp', 60, 0.7], ['lp', 500, 0.6]], gain: 0.2, flutter: 0.3, width: 1 });
  K.drone('drone', 0.2, { n: 38, dur: o.duration - 1, vel: 0.5, att: 3, rel: 2 });
  K.gong('gong', B.OPEN + 0.25, { vel: 0.35 });
  K.flute('flute', 1.2, [{ t: 0, d: 1.2, n: 62, v: 0.4, from: -1 }, { t: 1.2, d: 0.6, n: 65, v: 0.42 }, { t: 1.8, d: 1.6, n: 69, v: 0.5, vib: 40, vibAt: 0.6 }], { breath: 0.25 });
  K.splash('fx', B.RISE, { size: 1 }); K.drum('drum', B.RISE, 'taiko', 1); K.gong('gong', B.RISE, { vel: 0.7 });
  for (let i = 0; i < 6; i++) K.drum('drum', B.RISE + o.beat * (2 + i), 'taiko', i % 2 ? 0.45 : 0.7);
  K.flute('flute', B.TURN - 0.6, [{ t: 0, d: 0.6, n: 69, v: 0.5 }, { t: 0.6, d: 0.6, n: 72, v: 0.55 }, { t: 1.2, d: 2.2, n: 74, v: 0.6, vib: 50, vibAt: 0.5 }], { breath: 0.2 });
  K.roar('roar', B.CALL, { dur: 1.8 }); K.gong('gong', B.CALL + 0.1, { vel: 0.5 });
}, { beats: B, bar: BAR, beat: BEAT, duration: B.END, master: { lufs: -16, reverb: 'valley' } });

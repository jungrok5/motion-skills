// 청룡 · 여의주 — the score and every sound effect, written against the beat sheet (00_beats.js): 80 bpm in 12/8, a bar = 3 s.
// One function, run once off-line by lib/85_audio.js (in a worker): it must not touch anything outside itself.
//
// Key: E♭ (황종).  The dark half is 계면조 (E♭ G♭ A♭ B♭ D♭: B♭ below the tonic is the trembling tone, G♭ "breaks" down to F);
// at DAWN the same tune is sung in 평조 (E♭ F A♭ B♭ C).  THE THEME — eight bars of 6/8 (1.5 s each), written as scale steps
// (0 = tonic, eighths in brackets), in 평조 from E♭5:
//   1  E♭(2) F(1) A♭(3)        2  B♭(2) A♭(1) F(3)        3  E♭(2) F(1) A♭(2) C(1)     4  B♭(6)
//   5  C(2) B♭(1) A♭(2) F(1)   6  A♭(2) F(1) E♭(3)        7  C↓(2) E♭(1) F(2) A♭(1)    8  F(2) E♭(4)
// Hinted by the 대금 in the opening (bar 1, slow and low, in 계면조), by the 해금 at THUNDER1 (bars 1–2), fought over in the
// storm (해금 + 아쟁, 계면조, squared into the duple 휘모리), sung in full at DAWN, lifted at RAINBOW (bars 1–2 with bells an
// octave up), and its last two bars close the film at half speed in TABLEAU.
// 장단: 자진모리 in 12/8 — 덩 · · 쿵 · · 쿵 · 덕 쿵 · · — from OMEN and again at DAWN; 휘모리 — 덩 덩 쿵덕쿵, a cycle every 1.5 s — in the storm.
DR.score(function (K, B, o) {
  const BEAT = o.beat, E = BEAT / 3, DUR = o.duration, mtof = K.mtof;     // E: an eighth of the 12/8 = 0.25 s
  const GYE = [0, 3, 5, 7, 10], PYEONG = [0, 2, 5, 7, 9];
  const deg = (d, sc, base) => base + 12 * Math.floor(d / 5) + sc[((d % 5) + 5) % 5];
  const THEME = [[[0, 2], [1, 1], [2, 3]], [[3, 2], [2, 1], [1, 3]], [[0, 2], [1, 1], [2, 2], [4, 1]], [[3, 6]], [[4, 2], [3, 1], [2, 2], [1, 1]], [[2, 2], [1, 1], [0, 3]], [[-1, 2], [0, 1], [1, 2], [2, 1]], [[1, 2], [0, 4]]];
  const DUP = [0, 0.375, 0.5625, 0.75, 1.125, 1.3125, 1.5];              // where the six eighths of a bar fall when the bar is squared (휘모리)
  const line = (bars, sc, base, duple, f) => { const out = []; bars.forEach((bar, bi) => { let p = 0; for (const [d, len] of bar) { const t0 = duple ? DUP[p] : p * E, t1 = duple ? DUP[p + len] : (p + len) * E, q = { t: bi * 1.5 + t0, d: t1 - t0, n: deg(d, sc, base), bar: bi, first: p === 0, step: d }; out.push(Object.assign(q, f ? f(q) : null)); p += len; } }); return out; };

  // ── groups (automation first), buses ──
  K.group('bed', { fade: false }); K.group('music', { fadeOut: 2.4 }); K.group('perc'); K.group('wx', { fadeOut: 3 }); K.group('sfx'); K.group('hero');
  for (const t of [B.BOLT1, B.BOLT2, B.BOLT3]) { K.duck('music', t, -3.5, 0.03, 0.3, 0.3); K.duck('perc', t, -3, 0.03, 0.3, 0.3); }   // the music gives way under each bolt
  K.duck('music', B.ROAR, -4.5, 0.1, 1.8, 0.7); K.duck('wx', B.ROAR, -5, 0.1, 1.8, 0.7);
  for (const g of ['music', 'perc', 'sfx']) { K.gap(g, B.BURST - 0.08, B.BURST); K.gap(g, B.SEIZE - 0.4, B.SEIZE); }                // a breath before the two great hits
  K.gap('wx', B.SEIZE - 0.4, B.SEIZE, 0.45);
  const bus = (n, group, p) => K.bus(n, Object.assign({ group }, p));
  bus('water', 'bed', { gain: 1 }); bus('air', 'bed', { gain: 1 });
  bus('daegeum', 'music', { gain: 1.45, pan: -0.08, rev: 0.34, dly: 0.07 }); bus('haegeum', 'music', { gain: 1.4, pan: 0.22, rev: 0.26, dly: 0.04 }); bus('ajaeng', 'music', { gain: 1.0, pan: -0.22, rev: 0.2 });
  bus('gaya', 'music', { gain: 1.15, pan: -0.28, rev: 0.22, dly: 0.1 }); bus('strings', 'music', { gain: 0.8, rev: 0.28 }); bus('choir', 'music', { gain: 0.9, rev: 0.45 }); bus('drone', 'music', { gain: 0.45, rev: 0.2 }); bus('sub', 'music', { gain: 0.55 });
  bus('pearl', 'music', { gain: 0.8, pan: 0.1, rev: 0.5, dly: 0.2 }); bus('shimmer', 'music', { gain: 0.6, rev: 0.5 });
  bus('jing', 'perc', { gain: 1.3, pan: -0.1, rev: 0.36 }); bus('kkwaeng', 'perc', { gain: 0.75, pan: 0.32, rev: 0.25 }); bus('janggu', 'perc', { gain: 0.75, pan: 0.1, rev: 0.16 }); bus('buk', 'perc', { gain: 0.85, pan: -0.14, rev: 0.2 });
  bus('chime', 'sfx', { gain: 1.2, pan: -0.35, rev: 0.4, dly: 0.12 });      // the pavilion stands a little to the left
  bus('fx', 'sfx', { gain: 0.5, rev: 0.25 }); bus('wind', 'wx', { gain: 0.3, rev: 0.1 }); bus('rain', 'wx', { gain: 0.3, rev: 0.06 });
  bus('thunder', 'hero', { gain: 1.25, rev: 0.3 }); bus('burst', 'hero', { gain: 0.8, rev: 0.3 }); bus('roar', 'hero', { gain: 1.6, rev: 0.4 });
  const Eb = 63, gong = (t, vel, p) => K.gong('jing', t, Object.assign({ vel }, p));

  // ── beds: the far waterfall and the air before dawn run under everything and loop without a seam ──
  K.bed('water', { colour: 'pink', filters: [['hp', 260, 0.7], ['lp', 2600, 0.6], ['peak', 800, 1, 3]], level: [[0, 1], [36, 1], [40, 0.4], [55, 0.4], [63, 1], [DUR, 1]], gain: 0.11, flutter: 0.25, width: 0.9 });
  K.bed('air', { colour: 'brown', filters: [['hp', 55, 0.7], ['lp', 420, 0.6]], gain: 0.2, flutter: 0.3, width: 1, seed: 2 });
  K.wind('wind', 0, { dur: DUR, level: [[0, 0.07], [12, 0.1], [21, 0.14], [27, 0.32], [30, 0.55], [36, 0.7], [39, 1], [50, 1], [55, 0.6], [60, 0.3], [66, 0.2], [78, 0.1], [DUR, 0.07]], whistle: 0.3 });
  K.rain('rain', B.THUNDER1, { dur: 32.5, level: [[30, 0], [33, 0.15], [38.8, 0.55], [39.3, 1], [50.5, 1], [55, 0.8], [60, 0.22], [62.3, 0]] });

  // ── OPEN 0–12: one soft 징, a low drone, the 대금 alone: the first bar of the theme, then the trembling B♭ ──
  gong(B.OPEN + E, 0.3);                                                  // an eighth in, so the loop joint is pure air
  K.drone('drone', 0.3, { n: 39, dur: 34.5, vel: 0.55, att: 5, rel: 2.5 }); K.drone('drone', 0.3, { n: 46, dur: 26, vel: 0.22, att: 8, rel: 4, harm: 4 });
  K.flute('daegeum', 1.5, [{ t: 0, d: 1.0, n: 63, v: 0.4, from: -1.5, glide: 0.2 }, { t: 1.0, d: 0.5, n: 66, v: 0.44 }, { t: 1.5, d: 2.4, n: 68, v: 0.5, vib: 62, vibAt: 0.7 }], { breath: 0.24 });
  K.flute('daegeum', 6.75, [{ t: 0, d: 0.75, n: 68, v: 0.46, from: -0.8 }, { t: 0.75, d: 0.75, n: 66, v: 0.44, bend: [[0, 0], [0.3, 0], [0.62, -1], [1, -1]] }, { t: 1.5, d: 1.3, n: 63, v: 0.4, vib: 30 },
    { t: 3.0, d: 2.15, n: 58, v: 0.42, tongue: true, from: -0.4, vib: 88, vibAt: 0.35, vibHz: 4.1 }], { breath: 0.26 });                                                                       // 꺾는 음 G♭↘F, then 떠는 음 B♭
  K.bell('chime', 4.9, { n: 99, vel: 0.22 }); K.bell('chime', 8.8, { n: 96, vel: 0.18 }); K.bell('chime', 11.3, { n: 101, vel: 0.2 });
  K.drip('fx', 3.3, { f: [900, 1000], vel: 0.25 }); K.drip('fx', 7.2, { f: [1200, 1300], vel: 0.2 }); K.drip('fx', 10.5, { f: [800, 900], vel: 0.22 });

  // ── STIR 12: something long moves under the lake; the 가야금 begins its ostinato (계면조, 12/8) ──
  K.surge('fx', B.STIR, { dur: 4.6, vel: 0.8 });
  K.strings('strings', B.STIR, { notes: [27, 39, 46], dur: 5, vel: 0.5, att: 2.6, rel: 3, cut: [[0, 180], [3, 650], [8, 220]] });
  K.chimes('chime', B.STIR + 0.4, { count: 3, dur: 2.2, vel: 0.3, seed: 1 });
  const OST = [[[0, 51], [2, 58], [3, 63], [5, 61], [6, 58], [8, 63], [9, 66, 'break'], [11, 58]], [[0, 51], [2, 58], [3, 61], [5, 63], [6, 68], [8, 66], [9, 63, 'vib'], [11, 58]]];
  const ostVel = [0.34, 0.42, 0.48, 0.42, 0.42, 0.52, 0.58, 0.3];        // bars 4 … 11
  for (let b = 4; b <= 11; b++) for (const [i, n, orn] of OST[b & 1]) { if (b === 4 && i % 3) continue; if (b === 11 && i % 6) continue;
    K.pluck('gaya', b * 3 + i * E, { n, vel: ostVel[b - 4] * (i % 3 ? 0.72 : 1), bend: orn === 'break' ? [[0, 0], [0.13, 0], [0.3, -1]] : null, vib: orn === 'vib' ? [38, 4.8, 0.12, 0.3] : null }); }

  // ── EYE 21: a hushed breath, a heartbeat on the 북, the 해금's lament ──
  K.breath('fx', 21.0, { dur: 2.7, vel: 0.55 }); K.breath('fx', 24.1, { dur: 2.5, vel: 0.4, seed: 1 });
  for (let b = 7; b <= 9; b++) { K.drum('buk', b * 3, 'buk', b === 9 ? 0.4 : 0.32); K.drum('buk', b * 3 + 0.4, 'buk', b === 9 ? 0.28 : 0.22); }
  K.bowed('haegeum', 21.75, [{ t: 0, d: 0.75, n: 70, v: 0.6, from: -2, glide: 0.2 }, { t: 0.75, d: 0.5, n: 73, v: 0.66 }, { t: 1.25, d: 0.25, n: 70, v: 0.6 }, { t: 1.5, d: 0.75, n: 68, v: 0.6 },
    { t: 2.25, d: 0.5, n: 66, v: 0.48, bend: [[0, 0], [0.35, 0], [0.7, -1], [1, -1]] }, { t: 2.75, d: 1.2, n: 63, v: 0.42, vib: 45 },
    { t: 4.0, d: 0.5, n: 63, v: 0.45, tongue: true }, { t: 4.5, d: 0.25, n: 66, v: 0.5 }, { t: 4.75, d: 0.5, n: 68, v: 0.55 }, { t: 5.25, d: 2.4, n: 70, v: 0.62, vib: 75, vibAt: 0.4, vibHz: 4.6, sw: [[0, 0.7], [0.7, 1], [1, 0.5]] }]);

  // ── OMEN 27 · THUNDER1 30: wind, a quiet 자진모리, low strings; the 해금 tries the theme ──
  const JAJIN = { A: 'D..k..k.tk..', B: 'D.tk..k.tk.g', C: 'D..k.tk.tk.t' };
  const stroke = { D: 'deong', k: 'kung', t: 'deok', g: 'gideok', r: 'deoreo' };
  const jangdan = (pat, t0, step, vel) => K.pattern(pat, t0, step, (c, t, i) => K.janggu('janggu', t, stroke[c], vel * (i === 0 ? 1 : c === 'k' ? 0.85 : 0.75)));
  jangdan(JAJIN.A, 27, E, 0.34); jangdan(JAJIN.B, 30, E, 0.42); jangdan(JAJIN.A, 33, E, 0.4);
  K.bowed('ajaeng', 27, [{ t: 0, d: 2.9, n: 39, v: 0.5, vib: 25 }, { t: 3, d: 2.9, n: 37, v: 0.58, tongue: true, vib: 25 }, { t: 6, d: 2.9, n: 39, v: 0.55, tongue: true, vib: 30 }], { preset: 'ajaeng' });
  K.strings('strings', 27, { notes: [39, 46, 54], dur: 2.9, vel: 0.4, att: 1.5, rel: 0.8, cut: 700 }); K.strings('strings', 30, { notes: [37, 44, 56], dur: 2.9, vel: 0.5, att: 0.8, rel: 0.8, cut: 900 }); K.strings('strings', 33, { notes: [39, 46, 51], dur: 2.9, vel: 0.4, att: 0.8, rel: 0.6, cut: 800 });
  K.thunder('thunder', B.THUNDER1, { dist: 0.85, dur: 6, vel: 0.55 }); K.thunder('thunder', 34.6, { dist: 0.95, dur: 4.5, vel: 0.32, seed: 4 });
  K.bowed('haegeum', 30, line(THEME.slice(0, 2), GYE, 63, false, (q) => ({ v: 0.6, tongue: q.first, vib: q.d > 0.6 ? 55 : 0 })));

  // ── PEARL 33: a clear high tone comes down (glass, a bell on every step of 평조, a far choir) — light, and not of this key ──
  K.glass('pearl', 33, { n: 96, to: [[0, 96], [0.2, 96], [0.9, 87], [1, 87]], dur: 4.6, vel: 0.5, att: 1.0, rel: 1.2 }); K.glass('pearl', 33.4, { n: 89, to: [[0, 89], [0.3, 89], [1, 82]], dur: 4.2, vel: 0.28, att: 1.4, rel: 1.2, beat: 1.4 });
  [[0, 101], [0.04, 96], [0.75, 94], [1.5, 92], [2.25, 89], [3.0, 87]].forEach(([t, n], i) => K.metal('pearl', 33 + t, { preset: 'glass', n, vel: 0.5 - i * 0.03 }));
  K.choir('choir', 33.2, { notes: [75, 82], dur: 4.4, vel: 0.75, att: 1.6, rel: 1.2, vowel: 'oo' });
  K.shimmer('shimmer', 33, { dur: 5.6, notes: [87, 89, 92, 94, 96], range: [[0, 1], [1, -1]], density: 9, vel: 0.3, env: [[0, 0], [0.15, 1], [0.8, 0.8], [1, 0]] });

  // ── 36–39: the roll — 북 and 장구 doubling their speed on every beat, the 징 swelling, everything rising to the hit ──
  for (let bt = 0; bt < 4; bt++) { const div = 3 << bt, step = BEAT / div; for (let i = 0; i < div; i++) { const t = 36 + bt * BEAT + i * step, u = (t - 36) / 3, v = 0.22 + 0.8 * u * Math.sqrt(u); if (t > B.BURST - 0.07) break;
      K.janggu('janggu', t, i % 2 ? 'deok' : 'kung', v * (i === 0 ? 1 : 0.8)); if (i % (bt > 1 ? 2 : 1) === 0) K.drum('buk', t, 'buk', v * (i === 0 ? 1 : 0.75)); } gong(36 + bt * BEAT, 0.28 + bt * 0.14, { len: 4 }); }
  K.gong('jing', 36, { vel: 0.95, att: 2.9, len: 3.3, seed: 2 });
  K.sweep('fx', 36, { dur: 2.94, colour: 'pink', mode: 'bp', f: [[0, 260], [1, 3600]], q: 2, env: [[0, 0], [0.97, 1], [1, 0]], shape: 2.2, width: 0.8, gain: 4 });
  K.strings('strings', 36, { notes: [34, 46, 58], dur: 2.88, vel: 0.8, att: 2.6, rel: 0.05, trem: [13, 0.6], cut: [[0, 300], [2.9, 2600]] });

  // ── BURST 39: the biggest hit — 징, 북, a falling sub, the lake exploding, the 이무기's growl ──
  gong(B.BURST, 1.1); K.gong('jing', B.BURST, { vel: 1.0, f: 77.78, seed: 3 }); K.metal('kkwaeng', B.BURST, { preset: 'kkwaenggwari', vel: 1 });
  K.drum('buk', B.BURST, 'buk', 1.15); K.drum('buk', B.BURST, 'taiko', 1.1, { tune: -2 }); K.janggu('janggu', B.BURST, 'deong', 1);
  K.sub('sub', B.BURST, { f: 84, to: 31, glide: 0.5, dur: 1.5, vel: 1.6, rel: 1 });
  K.splash('burst', B.BURST, { size: 1.4, dur: 3.4 });
  K.roar('burst', B.BURST, { dur: 1.5, f: 49, contour: [[0, 3], [0.2, 0], [1, -6]], rough: 0.9, tail: 0.12, tailDur: 1, vel: 1 });
  K.thunder('thunder', B.BURST + 0.06, { dist: 0.4, dur: 5, vel: 0.6, seed: 9 });
  K.choir('choir', B.BURST, { notes: [51, 58, 63, 66], dur: 2.6, vel: 0.75, att: 0.05, rel: 0.6 });

  // ── 39–51 the storm: 휘모리 (덩 덩 쿵덕쿵) every 1.5 s, the theme in 계면조 on 해금 over 아쟁, 꽹과리 on the turns, a bolt on bars 4, 6, 8 ──
  const HWI = ['D.D.ktk.', 'D.Dtk.kt', 'DtktDtkt', 'D.D.ktk.', 'DtktDtkt', 'D.Dtk.kt', 'DtktDtkt', 'DtDtkt'], S16 = BEAT / 4;
  const roots = [39, 42, 44, 46, 42, 44, 37, 39], pads = [[51, 58, 66], [54, 61, 70], [56, 61, 63], [58, 63, 68], [54, 61, 70], [56, 63, 68], [49, 56, 66], [51, 58, 66]];
  for (let c = 0; c < 8; c++) { const t0 = 39 + c * 1.5, last = c === 7, len = last ? 1.08 : 1.5;
    jangdan(HWI[c], t0, S16, 0.82);
    if (c > 0) K.drum('buk', t0, 'buk', 0.92); K.drum('buk', t0 + 0.75, 'buk', 0.72); if (!last) K.drum('buk', t0 + 1.125, 'buk', 0.55);
    if (c && c % 2 === 0) gong(t0, 0.72, { len: 5 });
    if (c % 2 === 1 || c === 6) K.pattern('G.g.gG.', t0, S16, (ch, t) => K.metal('kkwaeng', t, { preset: 'kkwaenggwari', vel: ch === 'G' ? 0.75 : 0.5, choke: ch === 'G' ? 0 : 0.08 }));
    for (let i = 0; i < (last ? 6 : 8); i++) K.strings('strings', t0 + i * S16, { notes: [roots[c], roots[c] + 12, roots[c] + 7], dur: 0.11, att: 0.008, rel: 0.09, cut: 1500, vel: [1, 0.5, 0.65, 0.5, 0.85, 0.5, 0.65, 0.55][i] * 0.95, vib: 0 });
    K.strings('strings', t0, { notes: [roots[c]].concat(pads[c]), dur: len - 0.1, att: 0.06, rel: 0.12, cut: 2600, vel: 0.62 });
    K.sub('sub', t0, { f: mtof(roots[c] - 12), dur: len - 0.2, vel: 0.9, att: 0.01, rel: 0.15 }); }
  if (true) { const t = 50.25; for (let i = 0; i < 11; i++) K.janggu('janggu', t + i * 0.03125, i % 2 ? 'deok' : 'kung', 0.6 + i * 0.04); }                 // the last roll runs into the silence
  const stormBars = THEME.slice(0, 7), art = (q) => ({ v: 0.82 + 0.03 * q.bar, tongue: q.first, vib: q.d > 0.7 ? 60 : 0, glide: 0.07 });
  const tail8 = (base) => [{ t: 10.5, d: 0.375, n: deg(1, GYE, base), v: 0.92, tongue: true }, { t: 10.875, d: 0.375, n: deg(2, GYE, base), v: 0.96 }, { t: 11.25, d: 0.34, n: deg(3, GYE, base), v: 1.0 }];   // bar 8 never closes: G♭ A♭ B♭ ↗ … cut
  K.bowed('haegeum', 39, line(stormBars, GYE, 75, true, art).concat(tail8(75)));
  K.bowed('ajaeng', 39, line(stormBars, GYE, 51, true, (q) => ({ v: 0.9, tongue: q.first, vib: q.d > 0.7 ? 30 : 0 })).concat(tail8(51)), { preset: 'ajaeng' });
  K.flute('daegeum', 45, line(THEME.slice(4, 7), GYE, 75, true, (q) => ({ v: 0.95, tongue: q.first, vib: q.d > 0.7 ? 55 : 0 })).concat(tail8(75).map((q) => Object.assign(q, { t: q.t - 6 }))), { buzz: 0.75 });
  K.choir('choir', 45, { notes: [63, 66, 70, 75], dur: 5.5, vel: 0.5, att: 0.6, rel: 0.1, env: [[0, 0.6], [1, 1]] });
  [B.BOLT1, B.BOLT2, B.BOLT3].forEach((t, i) => { K.thunder('thunder', t, { dist: [0.08, 0.03, 0.0][i], dur: 4.6, vel: [0.9, 0.95, 1.05][i], seed: i + 1 }); K.sub('sub', t + 0.02, { f: 62, to: 33, glide: 0.15, dur: 0.45, vel: 0.9, rel: 0.3 }); });

  // ── SEIZE 51: after the breath of silence, light — 징, bells, a choir on A♭ then B♭ (IV – V of the dawn), a shimmer that climbs ──
  gong(B.SEIZE, 1.15); [[0, 87], [0.06, 94], [0.12, 96], [0.2, 101]].forEach(([t, n]) => K.metal('pearl', B.SEIZE + t, { preset: 'glass', n, vel: 0.6 }));
  K.chimes('chime', B.SEIZE, { count: 10, dur: 2.6, notes: [94, 96, 99, 101, 106], vel: 0.5, seed: 2, spread: 0.5 });
  K.choir('choir', B.SEIZE, { notes: [56, 63, 68, 72, 75], dur: 2.9, vel: 0.92, att: 0.12, rel: 0.5 }); K.choir('choir', B.ROAR, { notes: [58, 65, 70, 75, 77], dur: 2.9, vel: 0.95, att: 0.3, rel: 0.4, env: [[0, 0.7], [1, 1]] });
  K.strings('strings', B.SEIZE, { notes: [44, 56, 63, 68], dur: 2.9, vel: 0.95, att: 0.08, rel: 0.4, cut: [[0, 3200], [1, 1600], [3, 2400]] }); K.strings('strings', B.ROAR, { notes: [46, 58, 65, 70], dur: 2.9, vel: 0.75, att: 0.3, rel: 0.3, cut: [[0, 1500], [3, 3600]] });
  K.sub('sub', B.SEIZE, { f: mtof(32), dur: 2.8, vel: 1, att: 0.02, rel: 0.3 }); K.sub('sub', B.ROAR, { f: mtof(34), dur: 2.8, vel: 1, att: 0.1, rel: 0.25 });
  K.shimmer('shimmer', B.SEIZE, { dur: 6, notes: [75, 77, 80, 82, 84], range: [[0, 0], [1, 2.4]], density: 18, vel: 0.36, env: [[0, 0.5], [0.8, 1], [1, 0.6]], ring: 0.4 });
  K.sweep('fx', 55, { dur: 2, colour: 'pink', mode: 'bp', f: [[0, 500], [1, 5000]], q: 1.5, env: [[0, 0], [0.95, 1], [1, 0]], shape: 2.5, width: 0.9, gain: 2 });
  for (let i = 0; i < 12; i++) { const u = i / 12; K.drum('buk', 55.5 + i * 0.125, 'buk', 0.3 + 0.6 * u); } gong(55.5, 0.5, { att: 1.45, len: 1.6, seed: 2 });

  // ── ROAR 54: the dragon's first voice — deep, on the dominant, with a ring of bright harmonics after it ──
  K.roar('roar', B.ROAR, { dur: 2.2, f: 58.27, vel: 1, rough: 0.55, tail: 0.6, tailDur: 2.8 });

  // ── DAWN 57: the theme in full, 평조 — 대금 over 해금 in octaves, strings and choir, a broad 자진모리 ──
  const dawn = (q) => ({ v: 0.84 + (q.bar === 2 || q.bar === 3 || q.bar === 4 ? 0.12 : 0.04), tongue: q.first && q.bar % 2 === 0, vib: q.d >= 1.4 ? 68 : q.d > 0.7 ? 50 : 6, vibAt: q.d >= 1.4 ? 0.5 : undefined });
  const pick = (base) => [{ t: -0.5, d: 0.25, n: deg(-2, PYEONG, base), v: 0.7, tongue: true }, { t: -0.25, d: 0.25, n: deg(-1, PYEONG, base), v: 0.78 }];
  K.flute('daegeum', B.DAWN, pick(75).concat(line(THEME, PYEONG, 75, false, dawn)), { buzz: 0.62 });
  K.bowed('haegeum', B.DAWN, pick(63).concat(line(THEME, PYEONG, 63, false, (q) => ({ v: 0.8, tongue: q.first && q.bar % 2 === 0, vib: q.d > 0.7 ? 50 : 0 }))));
  const CH = [[39, 51, 58, 65], [44, 56, 63, 72], [41, 53, 60, 68], [46, 58, 63, 65], [44, 56, 60, 63], [41, 56, 60, 65], [44, 56, 63, 68], [46, 58, 63, 65]];
  CH.forEach((c, i) => { const t = B.DAWN + i * 1.5, split = i === 5 || i === 7, d = split ? 0.75 : 1.5;
    K.strings('strings', t, { notes: c, dur: d - 0.06, vel: 0.72, att: 0.1, rel: 0.22, cut: 3200 }); K.sub('sub', t, { f: mtof(c[0] - 12), dur: d - 0.1, vel: 0.85, att: 0.02, rel: 0.12 });
    if (split) { const e = [39, 51, 58, 63, 65]; K.strings('strings', t + 0.75, { notes: e, dur: 0.7, vel: 0.72, att: 0.08, rel: 0.25, cut: 3200 }); K.sub('sub', t + 0.75, { f: mtof(27), dur: 0.65, vel: 0.85, att: 0.02, rel: 0.12 }); }
    K.choir('choir', t, { notes: [c[1] + 12, c[2] + 12, c[3] + 12], dur: 1.4, vel: 0.6, att: 0.18, rel: 0.3 });
    [c[1], c[2], c[3], c[1] + 12, c[3], c[2]].forEach((n, j) => K.pluck('gaya', t + j * E, { n, vel: j % 3 ? 0.42 : 0.6 })); });
  ['A', 'B', 'A', 'C'].forEach((p, i) => { const t = B.DAWN + i * 3; jangdan(JAJIN[p], t, E, 0.95); K.drum('buk', t, 'buk', 1.0); K.drum('buk', t + 6 * E, 'buk', 0.78); K.drum('buk', t + 9 * E, 'buk', 0.55); gong(t, i % 2 ? 0.45 : i ? 0.6 : 0.85, { len: 7 }); });
  K.shimmer('shimmer', B.DAWN, { dur: 12, notes: [87, 89, 92, 94, 96], density: 4, vel: 0.22, env: [[0, 1], [1, 1]] });
  K.thunder('thunder', 59.2, { dist: 1, dur: 5, vel: 0.22, seed: 7 });

  // ── PASS 63 · SKIM 66: the dragon sweeps past the pavilion (left → right), then throws a curtain of spray off the lake ──
  K.whoosh('fx', B.PASS - 0.6, { dur: 1.5, from: -1, to: 1, vel: 1, peak: 0.4 }); K.chimes('chime', B.PASS + 0.05, { count: 16, dur: 2.6, vel: 0.6, seed: 3 });
  K.whoosh('fx', B.SKIM - 0.4, { dur: 1.2, from: 0.6, to: -0.5, f: 520, vel: 0.6, peak: 0.35, seed: 5 }); K.spray('fx', B.SKIM, { dur: 3, vel: 0.45, from: 0.4, to: -0.4 });

  // ── RAINBOW 69: the lift — bars 1–2 again, bells and voices an octave above ──
  const lift = line(THEME.slice(0, 2), PYEONG, 75, false, (q) => ({ v: 0.98, tongue: q.first, vib: q.d > 0.7 ? 55 : 6 }));
  K.flute('daegeum', B.RAINBOW, lift, { buzz: 0.7 }); K.bowed('haegeum', B.RAINBOW, line(THEME.slice(0, 2), PYEONG, 63, false, (q) => ({ v: 0.85, tongue: q.first, vib: q.d > 0.7 ? 50 : 0 })));
  lift.forEach((q) => K.metal('pearl', B.RAINBOW + q.t, { preset: 'glass', n: q.n + 12, vel: 0.5 }));
  [[44, 56, 63, 72], [46, 58, 63, 65, 70]].forEach((c, i) => { const t = B.RAINBOW + i * 1.5; K.strings('strings', t, { notes: c, dur: 1.44, vel: 0.68, att: 0.1, rel: 0.3, cut: 3600 }); K.sub('sub', t, { f: mtof(c[0] - 12), dur: 1.4, vel: 0.85, att: 0.02, rel: 0.15 });
    K.choir('choir', t, { notes: [c[2] + 12, c[3] + 12, 87], dur: 1.4, vel: 0.58, att: 0.15, rel: 0.5 }); [c[1], c[2], c[3], c[1] + 12, c[3], c[2]].forEach((n, j) => K.pluck('gaya', t + j * E, { n, vel: j % 3 ? 0.45 : 0.62 })); });
  jangdan(JAJIN.B, B.RAINBOW, E, 0.85); K.drum('buk', B.RAINBOW, 'buk', 0.9); K.drum('buk', B.RAINBOW + 6 * E, 'buk', 0.7); gong(B.RAINBOW, 0.7, { len: 7 }); K.chimes('chime', B.RAINBOW, { count: 8, dur: 2.5, vel: 0.4, seed: 4 });

  // ── TABLEAU 72: the last two bars at half speed, low on the 대금, with 가야금 and the drone; GONG 78; OUT: back to the air ──
  K.drone('drone', 71.4, { n: 39, dur: 8.6, vel: 0.6, att: 1.6, rel: 3.5 }); K.drone('drone', 71.4, { n: 46, dur: 8, vel: 0.25, att: 2.5, rel: 3.5, harm: 4 });
  K.strings('strings', B.TABLEAU, { notes: [39, 51, 58], dur: 0.6, vel: 0.5, att: 0.03, rel: 2.2, cut: [[0, 2200], [2.5, 500]] });
  K.flute('daegeum', B.TABLEAU, [{ t: 0, d: 1.0, n: 60, v: 0.5, from: -1 }, { t: 1.0, d: 0.5, n: 63, v: 0.52 }, { t: 1.5, d: 1.0, n: 65, v: 0.56, vib: 30 }, { t: 2.5, d: 0.5, n: 68, v: 0.56 },
    { t: 3.0, d: 1.0, n: 65, v: 0.5, vib: 28 }, { t: 4.0, d: 2.3, n: 63, v: 0.46, vib: 58, vibAt: 0.8, sw: [[0, 0.9], [0.35, 1], [1, 0.35]] }], { breath: 0.24 });
  [[0, 51], [0.75, 58], [1.5, 65], [2.25, 60], [3.0, 56], [3.75, 63], [4.5, 51], [5.25, 58]].forEach(([t, n]) => K.pluck('gaya', B.TABLEAU + t, { n, vel: 0.42 }));
  K.pluck('gaya', 77.0, { n: 51, vel: 0.45 }); K.pluck('gaya', 77.03, { n: 63, vel: 0.42, vib: [30, 4.6, 0.15, 0.4] });
  K.bell('chime', 74.6, { n: 101, vel: 0.2 }); K.bell('chime', 76.9, { n: 96, vel: 0.16 });
  gong(B.GONG, 0.72); K.gong('jing', B.GONG, { vel: 0.55, f: 77.78, seed: 3 });
  K.bell('chime', 80.6, { n: 99, vel: 0.14 });
}, { beats: B, bar: BAR, beat: BEAT, duration: B.END, master: { lufs: -15, reverb: 'valley', revLevel: 1, delay: { time: BEAT / 2, ratio: 1.5, fb: 0.3, level: 0.8 }, tilt: 1.5 } });

// ---- graduation — designed from BRIEF.md: a diploma in a mortarboard hops, its tassel swings, caps are tossed every 3 s ----
// render.mjs / check.mjs load this file automatically because it sits next to invite.json. In a project, the same block
// goes in pass/themes/custom.js so the deployed pages have it.
(() => {
  const { W, H, TAU, ol, fill, rr, circle, frac, face, star, rays, glow, confetti, twinkles, cloud } = HP.KIT;

  // a mortarboard: skull band, the board seen from the front, a gold button and a tassel on a pendulum
  function cap(c, pal, x, y, s, rot, swing, tassel = true) {
    const [navy, board, , , gold] = pal.a;
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    c.beginPath(); c.moveTo(-44, -4); c.lineTo(-44, 22); c.quadraticCurveTo(0, 38, 44, 22); c.lineTo(44, -4); c.closePath(); fill(c, navy); ol(c, pal);
    c.beginPath(); c.moveTo(0, -32); c.lineTo(84, -6); c.lineTo(0, 20); c.lineTo(-84, -6); c.closePath(); fill(c, board); ol(c, pal);
    if (tassel) {
      const ex = 66 + Math.sin(swing) * 30, ey = -2 + Math.cos(swing) * 34 + 16;
      c.beginPath(); c.moveTo(0, -6); c.lineTo(62, -2); c.quadraticCurveTo(64, 8, ex, ey); c.lineWidth = 4; c.strokeStyle = gold; c.stroke();
      c.save(); c.translate(ex, ey); c.rotate(-Math.sin(swing) * 0.6);
      c.beginPath(); c.moveTo(-5, 0); c.lineTo(5, 0); c.lineTo(8, 22); c.lineTo(-8, 22); c.closePath(); fill(c, gold); ol(c, pal, 3); c.restore();
    }
    circle(c, 0, -6, 7); fill(c, gold); ol(c, pal, 3);
    c.restore();
  }

  HP.addTheme({
    id: 'graduation',
    name: { ko: '졸업', en: 'Graduation', ja: '卒業' },
    title: 'CLASS OF\n2027',
    subtitle: { ko: '졸업을 축하해 주세요', en: 'Come celebrate my graduation', ja: '卒業をお祝いしてください' },
    message: { ko: '졸업식 끝나고 다 같이 저녁 먹어요.\n그동안 정말 고마웠어요!', en: 'Dinner together after the ceremony —\nthank you for these years!', ja: '卒業式のあと、みんなで夜ごはんを食べよう。\n今までありがとう!' },
    bg: 'spot', music: 'march',
    pal: { paper: '#fbf7ee', ink: '#1d2547', sub: '#8a8fa6', accent: '#c8374a', line: '#1b2244',
      sky: ['#d4e8ff', '#a8cdfb'], a: ['#22346e', '#30488f', '#fff6e2', '#d6455b', '#f2b631'], floor: '#c58f5c',
      bg: ['#1a2350', '#070a1a'], glow: '#ffd98a' },
  }, (c, t, pal) => {
    const [navy, board, cream, red, gold] = pal.a;
    rays(c, 240, 170, 18, t * 0.08, pal.sky[0], pal.sky[1]);
    for (const [x0, y, s, sp] of [[70, 60, 40, 9], [400, 96, 34, 6]]) cloud(c, pal, ((x0 + t * sp) % (W + 120)) - 60, y, s, '#fff');
    twinkles(c, t, 12, 41, '#fff', H * 0.5);
    // the cap toss: every 3 s three small caps go up spinning and fall back
    const k = frac(t / 3), tau = k * 3;
    if (tau < 2.5) [[110, -38], [370, 42], [250, 8]].forEach(([x0, vx], i) => {
      const x = x0 + vx * tau, y = 350 - (430 * tau - 175 * tau * tau);
      cap(c, pal, x, y, 0.42, tau * (i % 2 ? 4 : -4), 0, false);
    });
    if (tau < 0.5) for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.32, d = 30 + tau * 160; c.globalAlpha = 1 - tau * 2; star(c, 240 + Math.cos(a) * d, 330 + Math.sin(a) * d, 9, 0, 4, 0.35); fill(c, gold); c.globalAlpha = 1; }
    rr(c, -10, 330, W + 20, 70, 0); fill(c, pal.floor); ol(c, pal);
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 2; for (let x = 20; x < W; x += 60) { c.beginPath(); c.moveTo(x, 334); c.lineTo(x - 30, H); c.stroke(); }
    // the diploma: hops on the beat (1.5 s), squashes on landing
    const ph = frac(t / 1.5), hop = Math.abs(Math.sin(ph * Math.PI)) * 14, land = ph < 0.1 ? 1 - ph / 0.1 : 0;
    c.globalAlpha = 0.25; c.beginPath(); c.ellipse(240, 336, 56 - hop, 8, 0, 0, TAU); fill(c, pal.line); c.globalAlpha = 1;
    c.save(); c.translate(240, 334 - hop); c.scale(1.14 * (1 + land * 0.06), 1.14 * (1 - land * 0.07)); c.translate(-240, -334);
    rr(c, 194, 150, 92, 178, 24); fill(c, cream); ol(c, pal);
    c.beginPath(); c.ellipse(240, 318, 46, 12, 0, 0, Math.PI); c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.25)'; c.stroke();
    rr(c, 194, 268, 92, 18, 0); fill(c, red); ol(c, pal, 4);
    for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(292 + sx * 12, 270, 13, 8, sx * 0.5, 0, TAU); fill(c, red); ol(c, pal, 3.5); }
    c.beginPath(); c.moveTo(292, 276); c.lineTo(284, 302); c.lineTo(292, 296); c.lineTo(300, 304); c.closePath(); fill(c, red); ol(c, pal, 3);
    circle(c, 292, 272, 6); fill(c, red); ol(c, pal, 3);
    face(c, pal, 240, 214, 66, t, 8);
    cap(c, pal, 240, 150, 1, -0.1 + Math.sin(t * 4.2) * 0.04, Math.sin(t * 4.2) * 0.9);
    c.restore();
    confetti(c, t, 22, [gold, '#fff', red], 12, 44);
  });

  // the hall: two spotlights sway from the top corners, gold glitter falls
  HP.BG.spot = (c, W, H, t, pal) => {
    const { radial, bokeh, flakes, vignette } = HP.BGKIT;
    radial(c, W, H, pal.bg[0], pal.bg[1], 0.35);
    for (const [x0, base, ph] of [[0.12, -0.42, 0], [0.88, 0.42, 1.9]]) {
      const L = Math.hypot(W, H) * 1.1, a = base + Math.sin(t * 0.45 + ph) * 0.18;
      c.save(); c.translate(W * x0, -30); c.rotate(a); c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(0, 0, 0, L); g.addColorStop(0, 'rgba(255,214,140,.22)'); g.addColorStop(0.6, 'rgba(255,214,140,.05)'); g.addColorStop(1, 'rgba(255,214,140,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(-16, 0); c.lineTo(16, 0); c.lineTo(L * 0.22, L); c.lineTo(-L * 0.22, L); c.closePath(); c.fill(); c.restore();
    }
    bokeh(c, W, H, t, 14, [pal.glow, '#ffffff'], 21, Math.min(W, H) * 0.06, 0.3);
    flakes(c, W, H, t, 80, 13, pal.glow, 28);
    vignette(c, W, H, 0.6);
  };

  // "Cap Toss" — an original light processional in D major
  HP.addTrack('march', { name: 'Cap Toss', bpm: 100, bars: 8, build({ line, chords }) {
    const ev = line(['A4 - D5 - F#5 - E5 D5', 'B4 - D5 - G5 - - -', 'A4 C#5 E5 - A5 - G5 F#5', 'F#5 - - - D5 - - -',
      'F#5 - D5 - B4 - D5 -', 'G5 F#5 E5 - D5 - B4 -', 'C#5 D5 E5 - A5 - C#5 -', 'D5 - - - - - - -'], 'bell', 0.45);
    chords(['D3 F#3 A3', 'G3 B3 D4', 'A3 C#4 E4', 'D3 F#3 A3', 'B2 D3 F#3', 'G3 B3 D4', 'A3 C#4 E4', 'D3 F#3 A3']).forEach((ch, b) => {
      const o = b * 4;
      ch.forEach(m => ev.push({ t: o, dur: 4, inst: 'pad', m, vel: 0.22 }, { t: o + 1, dur: 0.5, inst: 'keys', m: m + 12, vel: 0.13 }, { t: o + 3, dur: 0.5, inst: 'keys', m: m + 12, vel: 0.13 }));
      ev.push({ t: o, dur: 2, inst: 'bass', m: ch[0] - 12, vel: 0.6 }, { t: o + 2, dur: 2, inst: 'bass', m: ch[2] - 12, vel: 0.5 });
      ev.push({ t: o, inst: 'taiko', vel: 0.65 }, { t: o + 2, inst: 'taiko', vel: 0.35 });
      for (let i = 0; i < 4; i++) ev.push({ t: o + i, inst: 'snare', vel: i % 2 ? 0.22 : 0.1 });
      for (let i = 0; i < 8; i++) ev.push({ t: o + i * 0.5, inst: 'hat', vel: 0.12 });
    });
    return ev; } });
})();

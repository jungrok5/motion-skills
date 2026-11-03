// holo-pass · art.js — the animated picture in the ticket's stamp window. Each art is a pure function of t:
//   HP.ART[name](ctx, t, pal)   draws into a 480 × 380 box (the caller scales and clips)
// Flat shapes, one dark outline colour, a face that blinks, and a loop of 2–4 s of motion.
(function () {
  const HP = (window.HP = window.HP || {});
  const W = 480, H = 380, TAU = Math.PI * 2;
  const sin = Math.sin, cos = Math.cos;

  // ---------- helpers ----------
  const ol = (c, pal, w = 5) => { c.lineWidth = w; c.strokeStyle = pal.line; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); };
  const fill = (c, col) => { c.fillStyle = col; c.fill(); };
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
  const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
  const frac = x => x - Math.floor(x);

  // a face: eyes that blink every few seconds, pink cheeks, a smile (or an "o" when mood = 'o')
  function face(c, pal, x, y, s, t, seed = 0, mood = 'smile') {
    const per = 3.1 + (seed % 7) * 0.23, ph = frac(t / per + seed * 0.37), blink = ph < 0.05 ? Math.abs(sin(ph / 0.05 * Math.PI)) : 0;
    c.fillStyle = pal.line;
    for (const k of [-1, 1]) {
      c.beginPath(); c.ellipse(x + k * s * 0.32, y, s * 0.075, s * 0.1 * (1 - blink * 0.9) + 0.6, 0, 0, TAU); c.fill();
      c.beginPath(); c.arc(x + k * s * 0.32 + s * 0.025, y - s * 0.035, s * 0.025 * (1 - blink), 0, TAU); c.fillStyle = '#fff'; c.fill(); c.fillStyle = pal.line;
    }
    c.fillStyle = 'rgba(255,120,140,.55)';
    for (const k of [-1, 1]) { c.beginPath(); c.ellipse(x + k * s * 0.52, y + s * 0.17, s * 0.11, s * 0.065, 0, 0, TAU); c.fill(); }
    c.beginPath();
    if (mood === 'o') { c.ellipse(x, y + s * 0.2, s * 0.07, s * 0.09, 0, 0, TAU); c.fillStyle = pal.line; c.fill(); }
    else { c.arc(x, y + s * 0.08, s * 0.14, 0.15 * Math.PI, 0.85 * Math.PI); c.lineWidth = Math.max(2, s * 0.055); c.strokeStyle = pal.line; c.lineCap = 'round'; c.stroke(); }
  }
  function star(c, x, y, r, rot = 0, n = 5, inner = 0.48) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = rot - Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * inner : r; c.lineTo(x + cos(a) * rr, y + sin(a) * rr); }
    c.closePath();
  }
  function rays(c, x, y, n, rot, c1, c2) {
    c.fillStyle = c1; c.fillRect(0, 0, W, H); c.fillStyle = c2;
    for (let i = 0; i < n; i++) { const a = rot + i * TAU / n; c.beginPath(); c.moveTo(x, y); c.arc(x, y, 900, a, a + TAU / n / 2); c.closePath(); c.fill(); }
  }
  function sky(c, a, b) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  function glow(c, x, y, r, col, a = 1) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)'); c.globalAlpha = a; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalAlpha = 1; }
  function confetti(c, t, n, cols, seed, speed = 60) {
    const r = HP.rng(seed);
    for (let i = 0; i < n; i++) {
      const x0 = r() * W, y0 = r() * H, sp = speed * (0.6 + r() * 0.8), sw = r() * TAU, col = cols[i % cols.length], w = 5 + r() * 5;
      const y = ((y0 + t * sp) % (H + 30)) - 15, x = x0 + sin(t * 1.7 + sw) * 12, a = t * 3 + sw;
      c.save(); c.translate(x, y); c.rotate(a); c.scale(1, Math.abs(cos(t * 4 + sw)) * 0.8 + 0.2); c.fillStyle = col; c.fillRect(-w / 2, -w * 0.3, w, w * 0.6); c.restore();
    }
  }
  function twinkles(c, t, n, seed, col = '#fff', top = H) {
    const r = HP.rng(seed);
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * top, s = 1 + r() * 2.2, ph = r() * TAU, a = 0.35 + 0.65 * Math.abs(sin(t * (0.8 + r()) + ph));
      c.globalAlpha = a; c.fillStyle = col;
      if (s > 2.6) { star(c, x, y, s * 2.2, 0, 4, 0.25); c.fill(); } else { circle(c, x, y, s * 0.7); c.fill(); }
    }
    c.globalAlpha = 1;
  }
  function cloud(c, pal, x, y, s, col = '#fff') {
    c.beginPath(); c.arc(x - s * 0.5, y, s * 0.42, Math.PI * 0.5, Math.PI * 1.5); c.arc(x - s * 0.1, y - s * 0.32, s * 0.45, Math.PI, 0); c.arc(x + s * 0.42, y - s * 0.08, s * 0.38, Math.PI * 1.3, Math.PI * 0.5); c.closePath();
    fill(c, col); ol(c, pal, 4);
  }

  const ART = (HP.ART = {});

  // Christmas — a tree that sways, ornaments that blink in turn, a glowing star, snow and a crescent moon
  ART.tree = (c, t, pal) => {
    const [g1, g2, gold, red, blue] = pal.a;
    sky(c, pal.sky[0], pal.sky[1]); twinkles(c, t, 46, 11, '#fff', H * 0.75);
    c.save(); circle(c, 400, 72, 30); fill(c, '#fff3c4'); circle(c, 414, 62, 27); fill(c, pal.sky[0]); c.restore();
    c.beginPath(); c.ellipse(240, 400, 330, 92, 0, 0, TAU); fill(c, '#f4f6ff'); ol(c, pal);
    c.save(); c.translate(240, 318); c.rotate(sin(t * 1.3) * 0.035); c.translate(-240, -318);
    rr(c, 222, 288, 36, 40, 6); fill(c, '#8a5a3b'); ol(c, pal);
    const tiers = [[190, 300, 128], [142, 240, 104], [98, 182, 76]];
    tiers.forEach(([top, bot, hw], i) => {
      c.beginPath(); c.moveTo(240, top - 12);
      c.quadraticCurveTo(240 + hw * 0.35, top + (bot - top) * 0.4, 240 + hw, bot - 6);
      c.quadraticCurveTo(240 + hw * 0.5, bot + 10, 240, bot + 2); c.quadraticCurveTo(240 - hw * 0.5, bot + 10, 240 - hw, bot - 6);
      c.quadraticCurveTo(240 - hw * 0.35, top + (bot - top) * 0.4, 240, top - 12); c.closePath(); fill(c, i % 2 ? g1 : g2); ol(c, pal);
      c.beginPath(); c.moveTo(240 - hw * 0.8, bot - 22); c.quadraticCurveTo(240, bot - 2, 240 + hw * 0.8, bot - 30); c.lineWidth = 4; c.strokeStyle = gold; c.setLineDash([2, 9]); c.stroke(); c.setLineDash([]);
    });
    face(c, pal, 240, 224, 64, t, 1);
    const orn = [[170, 282, red], [306, 276, blue], [196, 205, gold], [290, 168, red], [212, 150, blue], [322, 230, gold], [160, 248, blue]];
    orn.forEach(([x, y, col], i) => { const on = frac(t * 0.9 - i / orn.length) < 0.5; glow(c, x, y, 26, col, on ? 0.55 : 0); circle(c, x, y, 9); fill(c, col); ol(c, pal, 3.5); circle(c, x - 3, y - 3, 2.5); fill(c, 'rgba(255,255,255,.8)'); });
    const sp = 0.85 + 0.15 * sin(t * 3); glow(c, 240, 80, 70 * sp, pal.glow, 0.85);
    c.save(); c.translate(240, 80); c.rotate(sin(t * 1.1) * 0.12); star(c, 0, 0, 30 * sp, 0); fill(c, gold); ol(c, pal); c.restore();
    c.restore();
    const r = HP.rng(5);
    for (let i = 0; i < 42; i++) { const x0 = r() * W, y0 = r() * H, sp2 = 18 + r() * 26, s = 1.5 + r() * 2.5; const y = (y0 + t * sp2) % H, x = x0 + sin(t * 0.9 + i) * 10; c.globalAlpha = 0.85; circle(c, x, y, s); fill(c, '#fff'); }
    c.globalAlpha = 1;
  };

  // New Year — sunburst, a smiling sun rising behind a snow-capped mountain, cranes, rolling waves
  ART.sunrise = (c, t, pal) => {
    const [red, cream, blue, gold, navy] = pal.a;
    rays(c, 330, 170, 18, t * 0.12, pal.sky[0], pal.sky[1]);
    for (const [x0, y, s, sp] of [[60, 70, 46, 9], [420, 110, 38, 7]]) cloud(c, pal, ((x0 + t * sp) % (W + 120)) - 60, y, s, cream);
    const sy = 150 + sin(t * 1.2) * 7;
    glow(c, 330, sy, 120, pal.glow, 0.8); circle(c, 330, sy, 66); fill(c, red); ol(c, pal); face(c, { ...pal, line: pal.line }, 330, sy - 4, 70, t, 2);
    c.beginPath(); c.moveTo(-10, 330); c.lineTo(110, 200); c.quadraticCurveTo(170, 140, 230, 205); c.lineTo(360, 330); c.closePath(); fill(c, blue); ol(c, pal);
    c.beginPath(); c.moveTo(143, 166); c.quadraticCurveTo(170, 140, 202, 172); c.lineTo(190, 186); c.lineTo(178, 174); c.lineTo(166, 190); c.lineTo(154, 176); c.lineTo(138, 188); c.closePath(); fill(c, cream); ol(c, pal, 4);
    for (let i = 0; i < 2; i++) {
      const x = ((i * 230 + t * 34) % (W + 120)) - 60, y = 64 + i * 30 + sin(t * 2 + i) * 6, f = sin(t * 7 + i * 2) * 14;
      c.beginPath(); c.moveTo(x - 22, y + f * 0.6); c.quadraticCurveTo(x - 10, y - 6 + f * 0.3, x, y + 3); c.quadraticCurveTo(x + 10, y - 6 + f * 0.3, x + 22, y + f * 0.6); c.lineWidth = 4; c.strokeStyle = pal.line; c.stroke();
    }
    const row = (y, off, col) => { for (let x = -60 + (off % 48); x < W + 60; x += 48) { for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x, y, 26 - k * 8, Math.PI, 0); c.closePath(); fill(c, k % 2 ? cream : col); if (k === 0) ol(c, pal, 3); } } };
    row(316, t * 14, navy); row(340, 24 - t * 10, blue); row(364, t * 14, navy); row(388, 24 - t * 10, blue);
  };

  // Home party — a house with a face on its roof that bobs to the beat, lit windows, chimney smoke, bunting, confetti
  ART.house = (c, t, pal) => {
    const [red, cream, brown, yellow, green] = pal.a, beat = Math.abs(sin(t * Math.PI * 1.97));
    rays(c, 240, 200, 16, -t * 0.1, pal.sky[0], pal.sky[1]);
    for (let i = 0; i < 4; i++) { const k = frac(t / 2.4 + i / 4); circle(c, 302 + sin(k * 6 + i) * 10 + k * 20, 92 - k * 90, 9 + k * 16); c.globalAlpha = 1 - k; fill(c, '#fff'); ol(c, pal, 3); c.globalAlpha = 1; }
    c.beginPath(); c.ellipse(240, 400, 340, 86, 0, 0, TAU); fill(c, green); ol(c, pal);
    c.save(); c.translate(240, 328); c.scale(1 + beat * 0.025, 1 - beat * 0.04); c.translate(-240, -328 - beat * 4);
    rr(c, 288, 84, 28, 60, 4); fill(c, brown); ol(c, pal);
    rr(c, 152, 170, 176, 158, 8); fill(c, cream); ol(c, pal);
    for (const x of [172, 268]) { const on = 0.75 + 0.25 * sin(t * 5 + x); rr(c, x, 196, 42, 40, 6); fill(c, yellow); c.globalAlpha = on; glow(c, x + 21, 216, 40, pal.glow, 0.5); c.globalAlpha = 1; ol(c, pal, 4); c.beginPath(); c.moveTo(x + 21, 196); c.lineTo(x + 21, 236); c.moveTo(x, 216); c.lineTo(x + 42, 216); c.lineWidth = 3; c.stroke(); }
    rr(c, 218, 250, 46, 78, [22, 22, 4, 4]); fill(c, brown); ol(c, pal); circle(c, 254, 292, 4); fill(c, yellow);
    c.beginPath(); c.moveTo(128, 182); c.lineTo(240, 70); c.lineTo(352, 182); c.closePath(); fill(c, red); ol(c, pal);
    face(c, pal, 240, 140, 58, t, 3);
    c.restore();
    const flags = 11, cols = [red, yellow, green, cream];
    c.beginPath(); for (let i = 0; i <= 40; i++) { const x = i / 40 * W, y = 14 + sin(i / 40 * Math.PI) * 34; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.lineWidth = 2.5; c.strokeStyle = pal.line; c.stroke();
    for (let i = 0; i < flags; i++) { const u = (i + 0.5) / flags, x = u * W, y = 14 + sin(u * Math.PI) * 34, sw = sin(t * 3 + i) * 0.18; c.save(); c.translate(x, y); c.rotate(sw); c.beginPath(); c.moveTo(-14, 0); c.lineTo(14, 0); c.lineTo(0, 26); c.closePath(); fill(c, cols[i % 4]); ol(c, pal, 2.5); c.restore(); }
    confetti(c, t, 26, [red, yellow, green, '#fff'], 9, 50);
  };

  // Date night — two mugs that clink every 4 s; their steam rises and becomes a heart
  ART.coffee = (c, t, pal) => {
    const [white, pink, brown, blush, lilac] = pal.a;
    sky(c, pal.sky[0], pal.sky[1]);
    c.fillStyle = 'rgba(255,255,255,.4)';
    for (let y = -40; y < H + 40; y += 40) for (let x = -40; x < W + 40; x += 40) { const o = (Math.floor(y / 40) % 2) * 20; circle(c, x + o + (t * 8) % 40, y + (t * 8) % 40, 5); c.fill(); }
    twinkles(c, t, 14, 21, '#fff', H * 0.5);
    rr(c, -10, 318, W + 20, 80, 0); fill(c, '#b98263'); ol(c, pal);
    const per = 4, k = frac(t / per), clink = k < 0.3 ? sin(HP.seg(k, 0, 0.3) * Math.PI) : 0;
    const mug = (x, col, dir, seed) => {
      c.save(); c.translate(x + dir * 18 * clink, 322); c.rotate(dir * 0.2 * clink); c.translate(-x, -322);
      c.beginPath(); c.ellipse(x - dir * 62, 262, 26, 30, 0, 0, TAU); c.lineWidth = 14; c.strokeStyle = pal.line; c.stroke(); c.lineWidth = 7; c.strokeStyle = col; c.stroke();
      rr(c, x - 58, 196, 116, 126, [10, 10, 30, 30]); fill(c, col); ol(c, pal);
      c.beginPath(); c.ellipse(x, 200, 54, 12, 0, 0, TAU); fill(c, brown); ol(c, pal, 4);
      face(c, pal, x, 258, 66, t, seed, clink > 0.5 ? 'o' : 'smile');
      c.restore();
    };
    mug(150, pink, 1, 4); mug(330, lilac, -1, 6);
    if (clink > 0.2) { c.globalAlpha = clink; c.save(); c.translate(240, 210); for (let i = 0; i < 6; i++) { c.rotate(TAU / 6); c.fillStyle = '#fff'; star(c, 0, -26 - clink * 10, 7, 0, 4, 0.3); c.fill(); } c.restore(); c.globalAlpha = 1; }
    for (const [x, ph] of [[150, 0], [330, 0.5]]) for (let j = 0; j < 2; j++) {
      const kk = frac(t / 2.2 + ph + j / 2); c.beginPath();
      for (let i = 0; i <= 12; i++) { const u = i / 12, y = 186 - u * 70 - kk * 30, xx = x + sin(u * 5 + t * 2 + j) * 8 + (240 - x) * u * 0.35; i ? c.lineTo(xx, y) : c.moveTo(xx, y); }
      c.globalAlpha = sin(kk * Math.PI) * 0.9; c.lineWidth = 5; c.strokeStyle = '#fff'; c.stroke(); c.globalAlpha = 1;
    }
    const hk = frac((t - 1.1) / per), hs = HP.ease.back(HP.seg(hk, 0, 0.25)) * (1 + 0.06 * sin(t * 8)), hy = 120 - hk * 70;
    if (hk < 0.9) {
      c.globalAlpha = 1 - HP.seg(hk, 0.65, 0.9); c.save(); c.translate(240, hy); c.scale(hs, hs);
      c.beginPath(); c.moveTo(0, 22); c.bezierCurveTo(-44, -6, -24, -40, 0, -20); c.bezierCurveTo(24, -40, 44, -6, 0, 22); c.closePath(); fill(c, pink); ol(c, pal, 4);
      c.restore(); c.globalAlpha = 1;
    }
  };

  // Birthday — a two-tier cake with a face, flickering candles, sprinkles, confetti
  ART.cake = (c, t, pal) => {
    const [pink, cream, yellow, blue, purple] = pal.a, wob = sin(t * 3.2);
    rays(c, 240, 230, 20, t * 0.1, pal.sky[0], pal.sky[1]);
    c.beginPath(); c.ellipse(240, 330, 170, 24, 0, 0, TAU); fill(c, '#fff'); ol(c, pal);
    c.save(); c.translate(240, 326); c.scale(1 + wob * 0.012, 1 - wob * 0.02); c.translate(-240, -326);
    const tier = (x0, x1, y0, y1, col, drip, seed) => {
      rr(c, x0, y0, x1 - x0, y1 - y0, 12); fill(c, col); ol(c, pal);
      c.beginPath(); c.moveTo(x0 + 2, y0 + 10); const n = 7, w = (x1 - x0) / n, r = HP.rng(seed);
      for (let i = 0; i < n; i++) { const xa = x0 + i * w, d = 14 + r() * 18; c.quadraticCurveTo(xa + w * 0.25, y0 + d + 8, xa + w * 0.5, y0 + d); c.quadraticCurveTo(xa + w * 0.75, y0 + d - 10, xa + w, y0 + 12); }
      c.lineTo(x1 - 2, y0 + 2); c.lineTo(x0 + 2, y0 + 2); c.closePath(); fill(c, drip); ol(c, pal, 4);
      const rs = HP.rng(seed + 1); for (let i = 0; i < 9; i++) { const sx = x0 + 14 + rs() * (x1 - x0 - 28), sy = y0 + 40 + rs() * (y1 - y0 - 50); c.save(); c.translate(sx, sy); c.rotate(rs() * 3); rr(c, -5, -2, 10, 4, 2); fill(c, [yellow, blue, purple][i % 3]); c.restore(); }
    };
    tier(126, 354, 228, 326, pink, cream, 3); tier(170, 310, 160, 232, cream, pink, 8);
    face(c, pal, 240, 284, 70, t, 5);
    for (const [i, x] of [[0, 205], [1, 240], [2, 275]]) {
      rr(c, x - 7, 112, 14, 50, 4); fill(c, [blue, yellow, purple][i]); ol(c, pal, 3.5);
      const fl = 1 + 0.18 * sin(t * 13 + i * 2) + 0.1 * sin(t * 21 + i);
      glow(c, x, 96, 34, pal.glow, 0.9);
      c.save(); c.translate(x, 110); c.scale(1, fl); c.rotate(sin(t * 6 + i) * 0.12);
      c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-11, -6, -8, -20, 0, -30); c.bezierCurveTo(8, -20, 11, -6, 0, 0); fill(c, yellow); ol(c, pal, 3); c.restore();
    }
    c.restore();
    confetti(c, t, 30, [pink, yellow, blue, purple], 4, 45);
  };

  // Event · booth — a striped market tent with a waving flag, bunting, drifting clouds and a star that hops
  ART.tent = (c, t, pal) => {
    const [red, cream, yellow, teal, white] = pal.a;
    sky(c, pal.sky[0], pal.sky[1]);
    for (const [x0, y, s, sp] of [[80, 64, 40, 10], [330, 96, 50, 7], [520, 44, 34, 12]]) cloud(c, pal, ((x0 + t * sp) % (W + 140)) - 70, y, s, white);
    c.beginPath(); c.ellipse(240, 410, 360, 100, 0, 0, TAU); fill(c, teal); ol(c, pal);
    const fx = 300, ftop = 52;
    c.beginPath(); c.moveTo(fx, 120); c.lineTo(fx, ftop); c.lineWidth = 5; c.strokeStyle = pal.line; c.stroke();
    c.beginPath(); c.moveTo(fx, ftop); for (let i = 0; i <= 10; i++) { const u = i / 10; c.lineTo(fx + u * 52, ftop + 2 + sin(u * 4 - t * 6) * 5 * u); } for (let i = 10; i >= 0; i--) { const u = i / 10; c.lineTo(fx + u * 52, ftop + 26 + sin(u * 4 - t * 6) * 5 * u); } c.closePath(); fill(c, yellow); ol(c, pal, 4);
    rr(c, 168, 196, 264, 130, 4); c.save(); c.clip(); for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? cream : red; c.fillRect(168 + i * 24, 196, 24, 130); } c.restore(); rr(c, 168, 196, 264, 130, 4); ol(c, pal);
    c.beginPath(); c.moveTo(270, 326); c.quadraticCurveTo(300, 236, 330, 326); c.closePath(); fill(c, '#3a2a2a'); ol(c, pal, 4);
    c.beginPath(); c.moveTo(300, 112); c.lineTo(150, 200); c.lineTo(450, 200); c.closePath(); c.save(); c.clip(); for (let i = -6; i < 8; i++) { c.beginPath(); c.moveTo(300, 112); c.lineTo(300 + i * 26, 210); c.lineTo(300 + (i + 1) * 26, 210); c.closePath(); fill(c, (i + 6) % 2 ? red : cream); } c.restore();
    c.beginPath(); c.moveTo(300, 112); c.lineTo(150, 200); c.lineTo(450, 200); c.closePath(); ol(c, pal);
    c.beginPath(); c.moveTo(150, 200); for (let i = 0; i < 10; i++) { const x = 150 + i * 30; c.quadraticCurveTo(x + 15, 226, x + 30, 200); } fill(c, red); ol(c, pal, 4);
    const ph = frac(t / 1.1), hop = Math.abs(sin(ph * Math.PI)), land = ph < 0.12 || ph > 0.88 ? 1 - Math.min(ph, 1 - ph) / 0.12 : 0;
    c.save(); c.translate(110, 318 - hop * 70); c.scale(1 + land * 0.18, 1 - land * 0.16); c.rotate(sin(t * 2.9) * 0.15);
    star(c, 0, -46, 56, 0, 5, 0.55); fill(c, yellow); ol(c, pal); face(c, pal, 0, -40, 48, t, 7); c.restore();
    c.globalAlpha = 0.25 + 0.2 * (1 - hop); c.beginPath(); c.ellipse(110, 322, 40 * (1 - hop * 0.4), 7, 0, 0, TAU); fill(c, pal.line); c.globalAlpha = 1;
  };

  // a photo or picture from a URL instead of an art: cover-fit with a slow push-in
  HP.drawImageArt = (c, img, t) => {
    const s = Math.max(W / img.width, H / img.height) * (1.04 + 0.03 * sin(t * 0.4)), w = img.width * s, h = img.height * s;
    c.drawImage(img, (W - w) / 2 + sin(t * 0.3) * 6, (H - h) / 2, w, h);
  };
  HP.ART_SIZE = { W, H };
  // the kit a new picture is drawn with (references/THEMES.md) — same helpers the built-in pictures use
  HP.KIT = { W, H, TAU, ol, fill, rr, circle, frac, face, star, rays, sky, glow, confetti, twinkles, cloud };
})();

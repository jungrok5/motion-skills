/* table-diorama-food.js — the film's own props for table-diorama, drawn in the diorama kit's manner (flat pastel,
   thin darker outline, gentle top light): the pan of 쭈꾸미볶음 (the one accent: Diorama.ACCENT), rice bowls,
   chopsticks, glasses, the lettuce plate, the guests' gift box. Global: window.Food. Load after kit-diorama.js. */
(function () {
  const D = Diorama, C = D.C, { rng, clamp } = Pilot;
  const F = {};
  const RED = () => D.ACCENT;

  // one curly octopus arm lying in the sauce: a tapering curl (flattened by the table's view angle), a row of pale
  // suckers along its inner side, a glossy top line. r = curl radius, curl = turns, w = base width (px).
  F.arm = function (ctx, x, y, r, rot, curl, s = 1, flat = .68, w = 10) {
    const pts = [], N = 22;
    for (let i = 0; i <= N; i++) { const u = i / N, a = rot + u * curl * Math.PI * 2, rad = r * (1 - .72 * u); pts.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad * flat, Math.max(2.2, (w - (w - 2.5) * u) * s), a]); }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const pass of [0, 1]) { for (let i = 1; i <= N; i++) {
      const p = pts[i - 1], q = pts[i]; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
      ctx.strokeStyle = pass ? RED() : D.tone(RED(), -.55); ctx.lineWidth = pass ? q[2] : q[2] + 3.5; ctx.stroke(); } }
    ctx.fillStyle = 'rgba(255,222,205,.95)';   // suckers on the inside of the curl
    for (let i = 2; i < N - 2; i += 2) { const q = pts[i], k = q[2] * .32; ctx.beginPath(); ctx.arc(x + (q[0] - x) * .9, y + (q[1] - y) * .9, Math.max(1, k), 0, 7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,200,180,.7)'; ctx.lineWidth = 1.6; ctx.beginPath();   // gloss on the outside
    for (let i = 1; i <= N * .55; i++) { const q = pts[i], k = 1 + q[2] * .38 / Math.hypot(q[0] - x, q[1] - y || 1); const X = x + (q[0] - x) * k, Y = y + (q[1] - y) * k; i > 1 ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke();
  };
  // a mantle (the round head) — a small glossy red oval
  F.mantle = function (ctx, x, y, s = 1) {
    D.flat(ctx, c => D.ell(c, x, y, 17 * s, 12 * s), RED(), { y0: y - 12 * s, y1: y + 12 * s, light: .12 });
    ctx.fillStyle = 'rgba(255,215,200,.7)'; ctx.beginPath(); ctx.ellipse(x - 5 * s, y - 5 * s, 5 * s, 2.5 * s, -.3, 0, 7); ctx.fill();
  };
  // one bite-sized curly piece (what the chopsticks lift): a short curled arm around (x, y)
  F.piece = function (ctx, x, y, s = 1, rot = 0) { F.arm(ctx, x + 6 * s, y, 15 * s, rot, 1.25, s, .85, 9); };

  // the dish: pieces are laid out once (seeded); picked = Set of piece ids already lifted out
  const PAN = { x: 540, y: 1372, rx: 120, ry: 52 };
  F.PAN = PAN;
  const r = rng(41), BITS = [];
  for (let i = 0; i < 30; i++) {   // everything in the sauce, back to front
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * .82, x = PAN.x + Math.cos(a) * PAN.rx * d, y = PAN.y + Math.sin(a) * PAN.ry * d;
    const k = r(); BITS.push({ x, y, kind: k < .6 ? 'arm' : k < .68 ? 'mantle' : k < .8 ? 'onion' : 'scallion', rot: r() * 6.28, curl: (.85 + r() * .6) * (r() < .5 ? -1 : 1), s: .85 + r() * .35, id: i });
  }
  // the three pieces that get eaten — placed where each eater's chopsticks go in (their side of the pan)
  F.PICK = { b: [500, 1352], c: [560, 1346], d: [604, 1362] };
  for (const [k, p] of Object.entries(F.PICK)) BITS.push({ x: p[0], y: p[1], kind: 'pick', id: k, rot: .4, s: 1 });
  BITS.sort((a, b) => a.y - b.y);
  // pan(ctx, t, picked): the cast-iron pan with two handles, red sauce, curly arms, onion, scallion, sesame; picked = ids gone.
  F.pan = function (ctx, t, picked) {
    const { x, y, rx, ry } = PAN, iron = '#3b3040';
    ctx.fillStyle = 'rgba(60,20,50,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 14, rx + 30, ry + 16, 0, 0, 7); ctx.fill();
    for (const sd of [-1, 1]) D.flat(ctx, c => { D.rr(c, sd > 0 ? x + rx + 4 : x - rx - 36, y - 10, 32, 18, 8); }, iron, { lw: 2.5 });
    D.flat(ctx, c => D.ell(c, x, y + 6, rx + 14, ry + 12), iron, { y0: y - ry, y1: y + ry + 18, light: .2 });
    D.flat(ctx, c => D.ell(c, x, y, rx + 6, ry + 5), D.tone(iron, .15), { lw: 2 });
    D.flat(ctx, c => D.ell(c, x, y + 2, rx, ry), D.tone(RED(), -.3), { lw: 2, line: D.tone(RED(), -.55) });
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y + 2, rx, ry, 0, 0, 7); ctx.clip();
    ctx.fillStyle = D.tone(RED(), -.42); ctx.beginPath(); ctx.ellipse(x, y - ry * .55, rx, ry * .7, 0, 0, 7); ctx.fill();   // the far wall in shade
    ctx.fillStyle = D.tone(RED(), -.26); ctx.beginPath(); ctx.ellipse(x, y + 6, rx * .96, ry * .9, 0, 0, 7); ctx.fill();
    ctx.restore();
    for (const b of BITS) {
      if (b.kind === 'pick') { if (!picked.has(b.id)) F.piece(ctx, b.x, b.y, 1, b.rot); continue; }
      if (b.kind === 'arm') F.arm(ctx, b.x, b.y, 24 * b.s, b.rot, b.curl, b.s);
      else if (b.kind === 'mantle') F.mantle(ctx, b.x, b.y, b.s);
      else if (b.kind === 'onion') { ctx.strokeStyle = '#d9c9b0'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(b.x, b.y, 16 * b.s, 8 * b.s, b.rot * .2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        ctx.strokeStyle = '#fbf1e0'; ctx.lineWidth = 4; ctx.stroke(); }
      else { D.flat(ctx, c => D.ell(c, b.x, b.y, 7 * b.s, 4.5 * b.s, b.rot * .3), '#8fc070', { lw: 1.8, line: '#4f7a3c' });
        ctx.fillStyle = '#d6efb8'; ctx.beginPath(); ctx.ellipse(b.x, b.y, 3 * b.s, 1.8 * b.s, b.rot * .3, 0, 7); ctx.fill(); }
    }
    const rs = rng(77); ctx.fillStyle = '#fff4dc';   // sesame + sauce gloss
    for (let i = 0; i < 34; i++) { const a = rs() * 6.28, d = Math.sqrt(rs()) * .9; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d, 2.4, 1.3, rs() * 3, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,235,225,.5)';
    for (let i = 0; i < 6; i++) { const a = rs() * 6.28, d = Math.sqrt(rs()) * .8, tw = .6 + .4 * Math.sin(t * 1.7 + i * 2); ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d, 5 * tw, 2, 0, 0, 7); ctx.fill(); }
    const sh = ctx.createLinearGradient(0, y - ry, 0, y + ry); sh.addColorStop(0, 'rgba(40,10,30,.25)'); sh.addColorStop(.35, 'rgba(40,10,30,0)');
    ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(x, y + 2, rx, ry, 0, 0, 7); ctx.fill();   // the rim's shade on the far side
  };

  // bowl(ctx, x, y): a cream rice bowl with a pastel-blue band and a dome of rice. y = the rim's centre.
  F.bowl = function (ctx, x, y) {
    ctx.fillStyle = 'rgba(60,20,50,.18)'; ctx.beginPath(); ctx.ellipse(x, y + 30, 32, 8, 0, 0, 7); ctx.fill();
    D.flat(ctx, c => { c.moveTo(x - 36, y); c.bezierCurveTo(x - 34, y + 30, x + 34, y + 30, x + 36, y); c.closePath(); }, '#f6f0e6', { y0: y, y1: y + 28, light: .3 });
    ctx.fillStyle = '#9db8d6'; ctx.fillRect(x - 31, y + 10, 62, 4);
    D.flat(ctx, c => { c.moveTo(x - 33, y); c.bezierCurveTo(x - 26, y - 22, x + 26, y - 22, x + 33, y); c.closePath(); }, '#fffdf8', { lw: 1.8, line: '#cfc3bd' });
    ctx.fillStyle = 'rgba(200,190,185,.6)'; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.ellipse(x - 20 + i * 6, y - 6 - Math.sin(i * .45) * 7, 2.6, 1.4, .4, 0, 7); ctx.fill(); }
  };
  // chopsticks from a to b (two thin silver sticks; gap = tip opening px)
  F.chop = function (ctx, a, b, gap = 3) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    ctx.lineCap = 'round';
    for (const sd of [-1, 1]) { const o0 = sd * 2.2, o1 = sd * gap / 2;
      ctx.beginPath(); ctx.moveTo(a[0] + nx * o0, a[1] + ny * o0); ctx.lineTo(b[0] + nx * o1, b[1] + ny * o1);
      ctx.strokeStyle = '#6f6670'; ctx.lineWidth = 5.5; ctx.stroke(); ctx.strokeStyle = '#d8d6dc'; ctx.lineWidth = 3; ctx.stroke(); }
  };
  // glass(ctx, x, y, tilt = 0, fill = 1): a tumbler of pale beer held/standing with its grip point at (x, y)
  // (40 % up from its base); tilt rotates it about the grip.
  F.glass = function (ctx, x, y, tilt = 0, fill = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
    const b = 26, top = -44, w0 = 15, w1 = 19;
    const shape = c => { c.moveTo(-w1, top); c.lineTo(w1, top); c.lineTo(w0, b); c.quadraticCurveTo(0, b + 4, -w0, b); c.closePath(); };
    ctx.fillStyle = 'rgba(235,240,250,.55)'; ctx.beginPath(); shape(ctx); ctx.fill();
    ctx.save(); ctx.beginPath(); shape(ctx); ctx.clip(); ctx.rotate(-tilt);   // the drink stays level
    const lvl = 30 - 62 * fill * .82; ctx.fillStyle = '#f2d483'; ctx.fillRect(-40, lvl, 80, 80);
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(-40, lvl - 7, 80, 8);
    ctx.restore();
    ctx.strokeStyle = '#a7a3b8'; ctx.lineWidth = 2; ctx.beginPath(); shape(ctx); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-w1 + 6, top + 6); ctx.lineTo(-w0 + 5, b - 6); ctx.stroke();
    ctx.restore();
  };
  // lettuce(ctx, x, y): a mint plate of ruffled lettuce leaves
  F.lettuce = function (ctx, x, y) {
    ctx.fillStyle = 'rgba(60,20,50,.18)'; ctx.beginPath(); ctx.ellipse(x, y + 10, 62, 18, 0, 0, 7); ctx.fill();
    D.flat(ctx, c => D.ell(c, x, y, 62, 22), '#cfe6da', { y0: y - 22, y1: y + 22, light: .4, lw: 2 });
    D.flat(ctx, c => D.ell(c, x, y, 46, 15), '#b8d8c8', { lw: 1.5 });
    for (const [dx, dy, rt, col] of [[-22, -6, -.3, '#9fcb7c'], [18, -8, .3, '#8dbf6a'], [-4, -2, 0, '#b3d98c'], [8, 2, .15, '#a3cf7e']]) {
      D.flat(ctx, c => { const px = x + dx, py = y + dy; c.moveTo(px - 30, py + 6);
        for (let i = 0; i <= 8; i++) { const a = Math.PI + Math.PI * i / 8, R = 30 + (i % 2) * 5; c.lineTo(px + Math.cos(a + rt) * R, py + 6 + Math.sin(a + rt) * R * .5); } c.closePath(); }, col, { lw: 1.8, line: '#5b8a45' });
      ctx.strokeStyle = 'rgba(240,255,220,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + dx, y + dy + 6); ctx.lineTo(x + dx + Math.sin(rt) * 18, y + dy - 8); ctx.stroke();
    }
  };
  // gift(ctx, x, y): the guests' gift — a lilac box with a pale-pink ribbon and bow; (x, y) = bottom centre
  F.gift = function (ctx, x, y) {
    const w = 84, h = 54, d = 14;
    ctx.fillStyle = 'rgba(60,20,50,.2)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 52, 9, 0, 0, 7); ctx.fill();
    D.flat(ctx, c => c.rect(x - w / 2, y - h, w, h), '#c9b8e0', { y0: y - h, y1: y, light: .15 });
    D.flat(ctx, c => { c.moveTo(x - w / 2, y - h); c.lineTo(x - w / 2 + 6, y - h - d); c.lineTo(x + w / 2 - 6, y - h - d); c.lineTo(x + w / 2, y - h); c.closePath(); }, '#ddd0ee', { lw: 2 });
    D.flat(ctx, c => c.rect(x - 7, y - h, 14, h), '#f5c4cf', { lw: 1.6 });
    D.flat(ctx, c => { c.moveTo(x - 7, y - h); c.lineTo(x - 5, y - h - d); c.lineTo(x + 5, y - h - d); c.lineTo(x + 7, y - h); c.closePath(); }, '#f5c4cf', { lw: 1.4 });
    for (const sd of [-1, 1]) D.flat(ctx, c => { c.moveTo(x, y - h - d + 2); c.bezierCurveTo(x + sd * 28, y - h - d - 22, x + sd * 30, y - h - d + 8, x, y - h - d + 2); }, '#f5c4cf', { lw: 1.6 });
    D.flat(ctx, c => D.ell(c, x, y - h - d + 1, 6, 5), '#f0b0bf', { lw: 1.4 });
  };
  window.Food = F;
})();

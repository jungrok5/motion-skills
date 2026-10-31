/* table-risoline-draw.js — the film's own drawing for scene 4 (the dinner table seen from above), on top of the risoline kit.
   World = screen px at camera zoom 1 (table centre = frame centre). Heights z (px above the table top) are projected by
   a mild perspective from a camera DCAM above the table centre, so raised hands/glasses and heads read a little nearer.
   Arms are 2-bone IK in 3D (fixed bone lengths, elbows bend down and outward), projected; hands are drawn AT the grip.
   Global: window.Table. Load after kit-risoline.js. */
(function () {
  const { clamp, lerp, ss, eo, rng } = Pilot;
  const R = Riso, C = R.C, { ink, ell, tube, tone, resample, pathOf, wob, spark4 } = R;
  const TAU = Math.PI * 2;
  const K = {
    RED: '#e0452e', REDD: '#b8381f',                  // THE accent: 쭈꾸미 and its sauce (nothing else is this red)
    NAVY: '#2f3c5a', MUST: '#e2a93b', SAGE: '#6f8a6a', BLUE: '#5f7fa8', CTOP: '#f6f1e3',
    SKIN: '#f0d3b3', HAIR: '#2a2624', BROWN: '#4d3b30', ASH: '#a07e5c',
    GREEN: '#86aa5c', STEEL: '#d3d6d0', GLASS: '#d9eaec', FOAM: '#fbf6e7', PAN: '#2a2e30', PAN2: '#454b4d',
    TABLE: '#e3d6bb', WARM: '#f6e8c6', JANG: '#86603f', PLATE: '#f8f4e9', RICE: '#fdfbf4',
  };
  const CX = 540, CY = 960, DCAM = 4000;
  const prj = p => { const k = DCAM / (DCAM - (p[2] || 0)); return [CX + (p[0] - CX) * k, CY + (p[1] - CY) * k, k]; };
  const TB = { x0: 170, x1: 910, y0: 570, y1: 1350, r: 46 };
  const PAN = { x: 540, y: 960, r: 200, ri: 182 };
  const n2 = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
  const n3 = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, (a[2] || 0) + (b[2] || 0) * k];
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], (a[2] || 0) - (b[2] || 0)];
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2] || 0, b[2] || 0, k)];

  /* ---------------------------------------------------------------- the four, one per side (local u = toward the table centre, v = their right) */
  const PEOPLE = [
    { id: 'me', E: [540, TB.y1], f: [0, -1], top: K.NAVY, hair: 'bun', arrive: 2.7 },
    { id: 'spouse', E: [TB.x0, 960], f: [1, 0], top: K.SAGE, hair: 'short', arrive: 3.05 },
    { id: 'cream', E: [540, TB.y0], f: [0, 1], top: K.CTOP, hair: 'ash', arrive: 3.4 },
    { id: 'blue', E: [TB.x1, 960], f: [-1, 0], top: K.BLUE, hair: 'pony', arrive: 3.75 },
  ];
  PEOPLE.forEach(P => { P.r = [-P.f[1], P.f[0]]; });
  const loc = (P, u, v, z = 0) => [P.E[0] + P.f[0] * u + P.r[0] * v, P.E[1] + P.f[1] * u + P.r[1] * v, z];
  const PLACE = { bowl: [100, -100, 55], chopBack: [50, 112], chopTip: [220, 112], spoon: [60, 148, 212], glass: [150, 205, 40] };
  const ARM1 = 182, ARM2 = 172, SH = [-105, 140, 200];

  /* 3D two-bone IK: root S → target T, bone lengths l1/l2, the elbow on the pole side. → [elbow, reached end] */
  function ik3(S, T, l1, l2, pole) {
    const d = sub3(T, S), L = Math.hypot(d[0], d[1], d[2]) || 1e-6, Lc = clamp(L, Math.abs(l1 - l2) + 1, l1 + l2 - 1), dn = [d[0] / L, d[1] / L, d[2] / L];
    const Tt = add3(S, dn, Lc), a = (l1 * l1 - l2 * l2 + Lc * Lc) / (2 * Lc), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const p = n3(sub3(pole, [dn[0] * dot3(pole, dn), dn[1] * dot3(pole, dn), dn[2] * dot3(pole, dn)]));
    return [add3(add3(S, dn, a), p, h), Tt];
  }

  /* ---------------------------------------------------------------- the octopus pieces (seeded once) */
  const PIECES = (() => {
    const r = rng(41), o = [];
    for (let i = 0; i < 15; i++) {
      const rr = 128 * Math.sqrt((i + .55) / 15) + (r() - .5) * 14, a = i * 2.39996 + .4;
      o.push({ i, x: PAN.x + Math.cos(a) * rr, y: PAN.y + Math.sin(a) * rr * .96, rot: r() * TAU, s: .92 + r() * .2, type: i % 4 === 1 ? 'head' : 'arm', curl: r() < .5 ? 1 : -1 });
    }
    return o;
  })();
  const BITS = (() => {   // onion slivers, scallion, sesame — in the sauce between the pieces
    const r = rng(9), o = [];
    for (let i = 0; i < 26; i++) { const a = r() * TAU, rr = 158 * Math.sqrt(r()); o.push({ x: PAN.x + Math.cos(a) * rr, y: PAN.y + Math.sin(a) * rr, rot: r() * TAU, k: i % 3 === 0 ? 'onion' : i % 3 === 1 ? 'scal' : 'ring', s: .8 + r() * .4, u: r() }); }
    for (let i = 0; i < 34; i++) { const a = r() * TAU, rr = 165 * Math.sqrt(r()); o.push({ x: PAN.x + Math.cos(a) * rr, y: PAN.y + Math.sin(a) * rr, rot: r() * TAU, k: 'sesame', s: 1, u: r() }); }
    return o;
  })();

  /* one curly arm: a spiral tube, red, suckers on the inner side. (x, y) centre, k scale, rot */
  function tentacle(ctx, x, y, k, rot, curl, len = 1) {
    const pts = [], n = 12;
    for (let j = 0; j <= n; j++) { const s = j / n, an = rot + curl * s * 3.9 * len, rad = (40 - 27 * s) * k; pts.push([x + Math.cos(an) * rad, y + Math.sin(an) * rad]); }
    const w = pts.map((_, j) => (12.5 - 8 * j / n) * k);
    ink(ctx, tube(pts, w), { fill: K.RED, lw: 4.6, step: 7 });
    ctx.fillStyle = C.cream;
    for (let j = 1; j < n - 1; j++) { const a = pts[j], b = pts[j + 1], d = n2([b[0] - a[0], b[1] - a[1]]), nn = [-d[1] * curl, d[0] * curl], sr = (3.4 - 1.6 * j / n) * k;
      ctx.beginPath(); ctx.arc(a[0] + nn[0] * w[j] * .45, a[1] + nn[1] * w[j] * .45, sr, 0, TAU); ctx.fill(); }
  }
  /* one piece of 쭈꾸미: a curly arm, or a little mantle (head) with three short curls */
  function piece(ctx, pc, x, y, k = 1) {
    const s = pc.s * k;
    if (pc.type === 'arm') { tentacle(ctx, x, y, s, pc.rot, pc.curl); return; }
    const d = [Math.cos(pc.rot), Math.sin(pc.rot)];
    for (let j = -1; j <= 1; j++) { const a = pc.rot + Math.PI + j * .7; tentacle(ctx, x - d[0] * 22 * s + Math.cos(a) * 18 * s, y - d[1] * 22 * s + Math.sin(a) * 18 * s, s * .55, a, j >= 0 ? 1 : -1, .8); }
    ink(ctx, ell(x + d[0] * 6 * s, y + d[1] * 6 * s, 34 * s, 25 * s, 18, pc.rot), { fill: K.RED, tone: tone(true, x, y), lw: 5 });
    ink(ctx, ell(x + d[0] * 9 * s, y + d[1] * 9 * s, 27 * s, 18 * s, 16, pc.rot), { fill: K.RED, lw: 0, mx: 0, my: 0 });
    ink(ctx, [[x + d[0] * 26 * s - d[1] * 8 * s, y + d[1] * 26 * s + d[0] * 8 * s], [x + d[0] * 12 * s - d[1] * 12 * s, y + d[1] * 12 * s + d[0] * 12 * s]], { closed: false, lw: 3.2, single: true });
  }
  /* a whole little octopus (for the end-card stamp): mantle + eight curls, centred at 0,0 */
  function octoIcon(ctx) {
    for (let j = 0; j < 8; j++) {   // eight arms fanning out from under the mantle, each ending in a curl
      const a = Math.PI * (.02 + .96 * j / 7), cu = j < 4 ? -1 : 1, pts = []; let p = [Math.cos(a) * 26, 18 + Math.sin(a) * 10], an = Math.atan2(Math.sin(a) * .7 + .5, Math.cos(a));
      for (let i = 0; i <= 11; i++) { pts.push(p.slice()); p = [p[0] + Math.cos(an) * 7.5, p[1] + Math.sin(an) * 7.5]; an += cu * (.04 + i * .05); }
      ink(ctx, tube(pts, pts.map((_, i) => 9 - i * .55)), { fill: K.RED, lw: 4.4, step: 7 }); }
    ink(ctx, ell(0, -18, 46, 52, 22), { fill: K.RED, lw: 5.5 });
    ink(ctx, ell(-14, -36, 12, 16, 12, -.4), { fill: K.RED, tone: tone(false, 0, 0), lw: 0, mx: 0, my: 0 });
    ctx.fillStyle = C.ink; for (const sx of [-17, 17]) { ctx.beginPath(); ctx.arc(sx, 6, 6, 0, TAU); ctx.fill(); }
    ink(ctx, [[-10, 20], [0, 26], [10, 20]], { closed: false, lw: 3.5, single: true });
  }

  /* ---------------------------------------------------------------- the table and what is on it */
  function rrect(x0, y0, x1, y1, r) { const o = [], q = (cx, cy, a0) => { for (let i = 0; i <= 5; i++) { const a = a0 + i / 5 * Math.PI / 2; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
    q(x1 - r, y0 + r, -Math.PI / 2); q(x1 - r, y1 - r, 0); q(x0 + r, y1 - r, Math.PI / 2); q(x0 + r, y0 + r, Math.PI); return o; }
  function table(ctx, light) {
    const pts = rrect(TB.x0, TB.y0, TB.x1, TB.y1, TB.r);
    ctx.save(); ctx.globalAlpha *= .55; ink(ctx, pts.map(p => [p[0] + 18, p[1] + 22]), { tone: tone(true, 0, 0), lw: 0, mx: 0, my: 0 }); ctx.restore();   // its shadow on the floor
    const path = ink(ctx, pts, { fill: K.TABLE, tone: tone(false, 0, 0), lw: 7, smooth: false, step: 14 });
    if (light > 0) {   // the lamp's pool: the dots drop away where the light falls (a second, warm ink)
      ctx.save(); ctx.clip(path); ctx.globalAlpha *= light;
      ink(ctx, ell(CX, CY, 395, 430, 30), { fill: K.WARM, lw: 0, mx: 0, my: 0, amp: 3 });
      ctx.restore();
    }
    ink(ctx, rrect(TB.x0 + 16, TB.y0 + 16, TB.x1 - 16, TB.y1 - 16, TB.r - 14), { closed: true, lw: 2.6, single: true, smooth: false, step: 16 });   // the bevel
  }
  function bowl(ctx, x, y, r) {
    ink(ctx, ell(x, y, r, r, 22), { fill: C.cream, lw: 5.5 });
    ink(ctx, ell(x, y, r * .8, r * .8, 20), { fill: K.RICE, lw: 3, single: true });
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + .4, rr = r * .42 * (i % 2 ? 1 : .55); ink(ctx, [[x + Math.cos(a) * rr, y + Math.sin(a) * rr], [x + Math.cos(a) * rr + 6, y + Math.sin(a) * rr - 3]], { closed: false, lw: 2.4, single: true }); }
  }
  function sticks(ctx, back, tip, sep, k = 1) {   // a pair of steel chopsticks from the back end to the (projected) tips
    const d = n2([tip[0] - back[0], tip[1] - back[1]]), nn = [-d[1], d[0]];
    for (const s of [-1, 1]) {
      const a = [back[0] + nn[0] * s * 5 * k, back[1] + nn[1] * s * 5 * k], b = [tip[0] + nn[0] * s * sep / 2, tip[1] + nn[1] * s * sep / 2];
      ink(ctx, tube([a, [lerp(a[0], b[0], .5), lerp(a[1], b[1], .5)], b], [4.6 * k, 3.6 * k, 2.4 * k]), { fill: K.STEEL, lw: 2.8, single: true, step: 9 });
    }
  }
  function spoon(ctx, P) {
    const [u0, v, u1] = PLACE.spoon, a = loc(P, u0, v), b = loc(P, u1 - 30, v), c = loc(P, u1, v), d = Math.atan2(P.f[1], P.f[0]);
    ink(ctx, tube([a, [lerp(a[0], b[0], .5), lerp(a[1], b[1], .5)], b], [4, 3.4, 3]), { fill: K.STEEL, lw: 2.8, single: true });
    ink(ctx, ell(c[0], c[1], 24, 15, 14, d), { fill: K.STEEL, lw: 3.6, single: true });
  }
  function glass(ctx, x, y, k = 1) {   // a beer glass from above: rim, foam, a few bubbles, a highlight
    const r = PLACE.glass[2] * k;
    ink(ctx, ell(x, y, r, r, 20), { fill: K.GLASS, lw: 5 });
    ink(ctx, ell(x + 1, y + 1, r * .76, r * .76, 18), { fill: K.FOAM, lw: 2.6, single: true });
    ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2 * R.lwk();
    for (const [dx, dy, rr] of [[-.3, .2, .12], [.22, -.1, .09], [.05, .38, .08]]) { ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, rr * r, 0, TAU); ctx.stroke(); }
    ctx.restore();
    ink(ctx, Array.from({ length: 6 }, (_, i) => { const a = -2.6 + i * .17; return [x + Math.cos(a) * r * .9, y + Math.sin(a) * r * .9]; }), { closed: false, lw: 3, col: C.cream, single: true });
  }
  function lettuce(ctx) {
    const x = 828, y = 652;
    ink(ctx, ell(x, y, 74, 70, 22), { fill: K.PLATE, lw: 5.5 });
    for (const [dx, dy, a, s] of [[-18, 10, .6, 1], [20, -14, -.5, .95], [6, 22, 2.2, .85]]) {
      const pts = []; for (let i = 0; i < 22; i++) { const q = i / 22 * TAU, rr = (1 + .1 * Math.sin(q * 9)) * s; pts.push([x + dx + Math.cos(q + a) * 44 * rr, y + dy + Math.sin(q + a) * 30 * rr]); }
      ink(ctx, pts, { fill: K.GREEN, lw: 4 });
      ink(ctx, [[x + dx - Math.cos(a) * 34 * s, y + dy - Math.sin(a) * 34 * s], [x + dx + Math.cos(a) * 34 * s, y + dy + Math.sin(a) * 34 * s]], { closed: false, lw: 2.6, single: true });
    }
  }
  function jang(ctx) {   // 쌈장 (brown, not red) in a small dish
    const x = 242, y = 1288;
    ink(ctx, ell(x, y, 42, 40, 18), { fill: K.PLATE, lw: 5 });
    ink(ctx, ell(x, y + 2, 27, 24, 16), { fill: K.JANG, lw: 3.2, single: true });
    ink(ctx, [[x - 12, y + 2], [x - 2, y - 9], [x + 10, y], [x, y + 9]], { closed: false, lw: 2.4, col: C.cream, single: true });
  }
  /* the pan, its sauce and what's left in it. eaten 0…1 (sauce + bits thin out), gone(pc) → true once a piece is taken */
  function pan(ctx, t, eaten, gone) {
    ctx.save(); ctx.globalAlpha *= .5; ink(ctx, ell(PAN.x + 16, PAN.y + 20, PAN.r + 4, PAN.r + 2, 28), { tone: tone(true, 0, 0), lw: 0, mx: 0, my: 0 }); ctx.restore();
    for (const s of [-1, 1]) ink(ctx, [[PAN.x + s * (PAN.r - 8), PAN.y - 30], [PAN.x + s * (PAN.r + 34), PAN.y - 24], [PAN.x + s * (PAN.r + 34), PAN.y + 24], [PAN.x + s * (PAN.r - 8), PAN.y + 30]], { fill: K.PAN, lw: 5 });   // ear handles
    ink(ctx, ell(PAN.x, PAN.y, PAN.r, PAN.r, 30), { fill: K.PAN, lw: 6.5 });
    ink(ctx, ell(PAN.x, PAN.y, PAN.ri, PAN.ri, 28), { fill: K.PAN2, lw: 3.4, single: true });
    ink(ctx, Array.from({ length: 9 }, (_, i) => { const a = -2.75 + i * .14; return [PAN.x + Math.cos(a) * (PAN.r - 9), PAN.y + Math.sin(a) * (PAN.r - 9)]; }), { closed: false, lw: 3.4, col: '#8d969a', single: true });
    const e2 = Math.pow(eaten, 1.4), sr = lerp(1, .52, e2), sauce = [];
    for (let i = 0; i < 30; i++) { const a = i / 30 * TAU, rr = (166 + 8 * Math.sin(a * 3 + 1) + 5 * Math.sin(a * 7)) * sr * (1 - e2 * (.12 * Math.sin(a * 3 + .6) + .1 * Math.sin(a * 5 + 2))); sauce.push([PAN.x + 18 * e2 + Math.cos(a) * rr, PAN.y + 10 * e2 + Math.sin(a) * rr]); }
    for (const [a, d, r0] of [[-2.2, 128, 30], [-.4, 136, 24], [1.2, 132, 34], [2.7, 126, 22]]) {   // leftover smears where the sauce was
      const k = clamp(e2 * 1.6 - .2); if (k <= 0) continue; const pts = [];
      for (let i = 0; i < 14; i++) { const q = i / 14 * TAU; pts.push([PAN.x + Math.cos(a) * d + Math.cos(q + a) * r0 * 1.5 * k, PAN.y + Math.sin(a) * d + Math.sin(q + a) * r0 * .7 * k]); }
      ink(ctx, pts, { fill: K.REDD, lw: 2.4, single: true }); }
    const sp = ink(ctx, sauce, { fill: K.REDD, lw: 3, single: true });
    ctx.save(); ctx.clip(sp); ctx.globalAlpha *= .55; ink(ctx, ell(PAN.x + 70, PAN.y + 80, 150, 120, 20), { tone: tone(false, 0, 0), lw: 0, mx: 0, my: 0 }); ctx.restore();
    for (const b of BITS) {
      if (b.u < eaten * .8 || Math.hypot(b.x - PAN.x - 18 * e2, b.y - PAN.y - 10 * e2) > 160 * sr) continue;
      const c = [Math.cos(b.rot), Math.sin(b.rot)];
      if (b.k === 'sesame') { ctx.fillStyle = C.cream; ctx.beginPath(); ctx.ellipse(b.x, b.y, 3.2, 1.9, b.rot, 0, TAU); ctx.fill(); continue; }
      if (b.k === 'onion') { const pts = []; for (let i = 0; i <= 8; i++) { const a = b.rot + i / 8 * 1.9; pts.push([b.x + Math.cos(a) * 26 * b.s, b.y + Math.sin(a) * 26 * b.s]); } for (let i = 8; i >= 0; i--) { const a = b.rot + i / 8 * 1.9; pts.push([b.x + Math.cos(a) * 18 * b.s, b.y + Math.sin(a) * 18 * b.s]); }
        ink(ctx, pts, { fill: C.cream, lw: 3, single: true }); continue; }
      if (b.k === 'scal') { ink(ctx, [[b.x - c[0] * 15 * b.s - c[1] * 5, b.y - c[1] * 15 * b.s + c[0] * 5], [b.x + c[0] * 15 * b.s - c[1] * 5, b.y + c[1] * 15 * b.s + c[0] * 5], [b.x + c[0] * 15 * b.s + c[1] * 5, b.y + c[1] * 15 * b.s - c[0] * 5], [b.x - c[0] * 15 * b.s + c[1] * 5, b.y - c[1] * 15 * b.s - c[0] * 5]], { fill: K.GREEN, lw: 3, single: true, smooth: false }); continue; }
      ink(ctx, ell(b.x, b.y, 9 * b.s, 7 * b.s, 10, b.rot), { fill: K.GREEN, lw: 3, single: true });
      ctx.fillStyle = '#5f7f3f'; ctx.beginPath(); ctx.arc(b.x, b.y, 3 * b.s, 0, TAU); ctx.fill();
    }
    for (const pc of PIECES) if (!gone(pc)) piece(ctx, pc, pc.x, pc.y, 1);
    for (const [a, rr, l] of [[-2.3, 120, 26], [-1.2, 70, 20], [.5, 132, 24], [2.6, 90, 22], [1.5, 30, 18]]) {   // gloss on the sauce
      if (rr > 150 * sr) continue; const x = PAN.x + Math.cos(a) * rr, y = PAN.y + Math.sin(a) * rr;
      ink(ctx, [[x - l / 2, y - 3], [x + l / 2, y - 7]], { closed: false, lw: 3.6, col: '#f7d9c8', single: true });
    }
  }
  /* steam: three wavy lines rising off the sauce (comic steam), k = amount */
  function steam(ctx, t, k) {
    if (k <= .02) return;
    for (let i = 0; i < 3; i++) {
      const ph = (t * .55 + i / 3) % 1, x0 = PAN.x - 80 + i * 80 + Math.sin(i * 4.1) * 16, y0 = PAN.y + 10 - ph * 170, al = k * Math.sin(Math.PI * ph);
      if (al <= .03) continue; const pts = [];
      for (let j = 0; j <= 10; j++) { const u = j / 10; pts.push([x0 + Math.sin(u * 6.2 + t * 2.4 + i) * 13, y0 - u * 150]); }
      ctx.save(); ctx.globalAlpha *= al;
      ink(ctx, tube(pts, pts.map((_, j) => 6.5 - j * .35)), { fill: C.cream, lw: 3, single: true, step: 8, mx: 0, my: 0 });
      ctx.restore();
    }
  }
  /* sizzle: little ink ticks bursting off the pan rim (comic "지글") */
  function sizzle(ctx, t, k) {
    if (k <= .02) return; ctx.save(); ctx.globalAlpha *= k;
    for (const [a, ph] of [[-2.5, 0], [-.6, .33], [1.0, .66], [2.55, .2]]) {
      const p = (t * 2.2 + ph) % 1; if (p > .6) continue;
      for (let j = -1; j <= 1; j++) { const an = a + j * .2, r0 = PAN.r + 16 + p * 20, r1 = r0 + 24;
        ink(ctx, [[PAN.x + Math.cos(an) * r0, PAN.y + Math.sin(an) * r0], [PAN.x + Math.cos(an) * r1, PAN.y + Math.sin(an) * r1]], { closed: false, lw: 4, single: true }); }
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------------- people from above */
  /* hand from above: a mitten at H (projected), pointing along dir; thumb on the side toward the person's midline */
  function handTop(ctx, H, dir, k, side, type) {
    const a = Math.atan2(dir[1], dir[0]), th = side > 0 ? [dir[1], -dir[0]] : [-dir[1], dir[0]];
    ink(ctx, ell(H[0] + th[0] * 15 * k - dir[0] * 4 * k, H[1] + th[1] * 15 * k - dir[1] * 4 * k, 15 * k, 10 * k, 12, a + side * .7), { fill: K.SKIN, lw: 4.2, single: true });
    ink(ctx, ell(H[0], H[1], 27 * k, 22 * k, 16, a), { fill: K.SKIN, lw: 5 });
    if (type === 'grip') ink(ctx, [[H[0] + dir[0] * 14 * k - th[0] * 12 * k, H[1] + dir[1] * 14 * k - th[1] * 12 * k], [H[0] + dir[0] * 20 * k + th[0] * 4 * k, H[1] + dir[1] * 20 * k + th[1] * 4 * k]], { closed: false, lw: 3, single: true });
    else for (const s of [-8, 2, 12]) ink(ctx, [[H[0] + dir[0] * 12 * k - th[0] * s * k, H[1] + dir[1] * 12 * k - th[1] * s * k], [H[0] + dir[0] * 22 * k - th[0] * s * k, H[1] + dir[1] * 22 * k - th[1] * s * k]], { closed: false, lw: 2.4, single: true });
  }
  /* one arm: shoulder S, elbow El, wrist Wr (3D), hand H (3D) — sleeve, cuff, hand. side +1 right, −1 left */
  function arm(ctx, P, A, side, type) {
    const s = prj(A.S), e = prj(A.El), w = prj(A.Wr), h = prj(A.H), k = h[2];
    const m1 = [lerp(s[0], e[0], .5), lerp(s[1], e[1], .5)], m2 = [lerp(e[0], w[0], .55), lerp(e[1], w[1], .55)];
    ink(ctx, tube([s, m1, e, m2, w], [37, 35, 32, 29, 26].map(v => v * k)), { fill: P.top, tone: P.top === K.CTOP ? tone(false, s[0], s[1]) : null, lw: 5.5 });
    const d = n2([h[0] - w[0], h[1] - w[1]]);
    handTop(ctx, h, d, k, side, type);
  }
  /* torso from above (shoulders + upper back), at shoulder height; B.off = slide/lean along u */
  function torso(ctx, P, B) {
    const z = 200 - B.lean * .25, Q = (u, v) => prj(loc(P, u + B.off, v + B.sway, z));
    const sh = [[-58, -146], [-50, -96], [-46, 0], [-50, 96], [-58, 146], [-84, 170], [-126, 176], [-170, 164], [-204, 118], [-214, 0], [-204, -118], [-170, -164], [-126, -176], [-84, -170]];
    const pts = sh.map(q => Q(q[0], q[1]));
    ink(ctx, pts, { fill: P.top, tone: P.top === K.CTOP ? tone(false, pts[0][0], pts[0][1]) : null, lw: 6.5 });
    ctx.save(); ctx.clip(pathOf(pts, true, true)); ctx.globalAlpha *= .45;   // the far side of the back in shade
    ink(ctx, [Q(-150, -200), Q(-150, 200), Q(-300, 200), Q(-300, -200)], { tone: tone(true, 0, 0), lw: 0, smooth: false, mx: 0, my: 0 }); ctx.restore();
    if (P.id === 'me') for (const v of [-74, 74]) ink(ctx, [Q(-48, v - 15), Q(-48, v + 15), Q(-212, v * .6 + 13), Q(-212, v * .6 - 13)], { fill: K.MUST, lw: 4.5, smooth: false });   // apron straps (mustard)
    if (P.id === 'cream') ink(ctx, [Q(-80, -60), Q(-60, 0), Q(-80, 60)], { closed: false, lw: 3, single: true });
  }
  /* head from above at hc (projected), facing f; who = hair style */
  function headTop(ctx, P, B, t) {
    const z = 300 - B.bow * 40, hu = -88 + B.off * .9 + B.bow * 16 + B.bob[0], hv = B.sway + B.bob[1];
    const Q = (u, v) => prj(loc(P, hu + u, hv + v, z)), k = prj([0, 0, z])[2];
    const fa = Math.atan2(P.f[1], P.f[0]), E = (cu, cv, ru, rv, n = 20) => { const c = Q(cu, cv); return ell(c[0], c[1], ru * k, rv * k, n, fa); };
    for (const s of [-1, 1]) ink(ctx, E(6, s * 60, 13, 10, 10), { fill: K.SKIN, lw: 4.4, single: true });   // ears
    ink(ctx, E(4, 0, 72, 62), { fill: K.SKIN, lw: 5.5 });
    ink(ctx, E(70, 0, 9, 9, 10), { fill: K.SKIN, lw: 3.4, single: true });   // the nose tip, peeking
    if (P.hair === 'bun') {   // 명현: dark hair pulled back into a low bun, a mustard tie
      ink(ctx, E(-6, 0, 70, 64), { fill: K.HAIR, lw: 5 });
      ink(ctx, E(-82, 0, 30, 32, 16), { fill: K.HAIR, lw: 5 });
      ink(ctx, E(-62, 0, 9, 20, 10), { fill: K.MUST, lw: 3.6, single: true });
      for (const v of [-34, -12, 12, 34]) ink(ctx, [Q(52, v * 1.2), Q(0, v), Q(-50, v * .5)], { closed: false, lw: 2.6, col: '#5a5450', single: true });   // combed back
    } else if (P.hair === 'short') {   // 경찬: short dark hair
      ink(ctx, E(-8, 0, 68, 63), { fill: K.HAIR, lw: 5 });
      ink(ctx, [Q(46, -40), Q(56, -16), Q(50, 6), Q(58, 26), Q(48, 44)], { closed: false, lw: 3.4, col: '#5a5450', single: true });
    } else if (P.hair === 'ash') {
      ink(ctx, E(-10, 0, 66, 62), { fill: K.ASH, lw: 5 });
      for (const s of [-1, 1]) ink(ctx, [Q(62, s * 50), Q(12, s * 64)], { closed: false, lw: 3.6, single: true });   // glasses' arms over the ears
    } else {
      ink(ctx, E(-10, 0, 67, 62), { fill: K.HAIR, lw: 5 });
      const tail = [Q(-74, 0), Q(-100, 6), Q(-122, -2), Q(-142, 10)];
      ink(ctx, tube(tail, [16, 15, 12, 7].map(v => v * k)), { fill: K.HAIR, lw: 4.4 });
      ink(ctx, E(-72, 0, 10, 14, 10), { fill: K.BLUE, lw: 3.6, single: true });   // the tie
    }
    if (P.hair === 'bun') return;
    const wh = Q(-26, 8), sp = []; for (let i = 0; i < 9; i++) { const a = i * .8, r = (2 + i * 2.3) * k; sp.push([wh[0] + Math.cos(a + fa) * r, wh[1] + Math.sin(a + fa) * r]); }
    ink(ctx, sp, { closed: false, lw: 2.6, col: P.hair === 'ash' ? C.ink : '#6a625c', single: true, raw: true });   // the crown whorl
  }

  /* ---------------------------------------------------------------- faces for the comic inserts (front view; origin = head centre) */
  const FACE_OF = { me: { top: K.NAVY, hair: K.HAIR }, spouse: { top: K.SAGE, hair: K.HAIR }, cream: { top: K.CTOP, hair: K.ASH }, blue: { top: K.BLUE, hair: K.HAIR } };
  function face(ctx, who, x, y, s, expr, t, tilt = 0) {
    const F = FACE_OF[who], Q = (u, v) => [x + (u * Math.cos(tilt) - v * Math.sin(tilt)) * s, y + (u * Math.sin(tilt) + v * Math.cos(tilt)) * s];
    const E = (cx, cy, rx, ry, n = 20, rot = 0) => ell(...Q(cx, cy), rx * s, ry * s, n, rot + tilt);
    const ph = Math.floor(t * 6) % 2;
    // shoulders + top
    ink(ctx, [Q(-250, 420), Q(-236, 236), Q(-170, 178), Q(-60, 156), Q(60, 156), Q(170, 178), Q(236, 236), Q(250, 420)], { fill: F.top, tone: who === 'cream' ? tone(false, x, y) : null, lw: 6 });
    if (who === 'me') { ink(ctx, [Q(-92, 420), Q(-80, 236), Q(80, 236), Q(92, 420)], { fill: K.MUST, lw: 5.5, smooth: false });   // apron bib + straps
      for (const sx of [-1, 1]) ink(ctx, [Q(sx * 80, 240), Q(sx * 54, 160), Q(sx * 36, 160), Q(sx * 62, 240)], { fill: K.MUST, lw: 4.5, smooth: false }); }
    if (who === 'cream') ink(ctx, [Q(-56, 160), Q(0, 236), Q(56, 160)], { closed: false, lw: 4.5, single: true });
    if (who === 'spouse' || who === 'blue') ink(ctx, [Q(-62, 158), Q(-30, 196), Q(30, 196), Q(62, 158)], { closed: false, lw: 4.5, single: true });
    ink(ctx, [Q(-38, 92), Q(-36, 168), Q(36, 168), Q(38, 92)], { fill: K.SKIN, lw: 5 });   // neck
    if (who === 'me') { ink(ctx, E(66, -118, 44, 40, 16), { fill: F.hair, lw: 5.5 }); ink(ctx, E(48, -96, 12, 20, 10, .8), { fill: K.MUST, lw: 4 }); }   // 명현's bun + mustard tie, behind
    if (who === 'blue') { ink(ctx, tube([Q(96, -60), Q(134, -20), Q(144, 40), Q(128, 96)], [24, 22, 18, 10].map(v => v * s)), { fill: F.hair, lw: 5 }); ink(ctx, E(104, -58, 14, 18, 10), { fill: K.BLUE, lw: 4 }); }
    for (const sx of [-1, 1]) ink(ctx, E(sx * 96, 8, 18, 26, 12), { fill: K.SKIN, lw: 5 });
    const cheek = expr === 'chew' ? (ph ? 1 : -1) : 0, fp = [];
    for (let i = 0; i < 28; i++) { const a = i / 28 * TAU, bul = cheek && Math.cos(a) * cheek > .3 && Math.sin(a) > -.1 ? 12 * (Math.cos(a) * cheek - .3) : 0; fp.push(Q(Math.cos(a) * (94 + bul), Math.sin(a) * (110 + (Math.sin(a) > 0 ? 6 : 0)))); }
    ink(ctx, fp, { fill: K.SKIN, lw: 6 });
    // hair (front)
    if (who === 'spouse') ink(ctx, [Q(-98, 0), Q(-104, -64), Q(-74, -112), Q(-20, -130), Q(40, -128), Q(86, -104), Q(104, -60), Q(98, 0), Q(84, -36), Q(54, -56), Q(30, -42), Q(4, -60), Q(-30, -48), Q(-60, -58), Q(-84, -30)], { fill: F.hair, lw: 5.5 });
    else if (who === 'me') { ink(ctx, [Q(-100, 4), Q(-102, -70), Q(-60, -118), Q(10, -130), Q(76, -112), Q(102, -64), Q(100, 4), Q(90, -40), Q(60, -66), Q(-6, -78), Q(-34, -70), Q(-70, -50), Q(-90, -24)], { fill: F.hair, lw: 5.5 });
      ink(ctx, [Q(-34, -70), Q(-14, -104), Q(20, -122)], { closed: false, lw: 3, col: '#5a5450', single: true });
      ink(ctx, tube([Q(-96, -10), Q(-104, 30), Q(-98, 62)], [7, 5, 2].map(v => v * s)), { fill: F.hair, lw: 3.4, single: true }); }   // side part, a loose strand
    else if (who === 'cream') ink(ctx, [Q(-98, -6), Q(-100, -70), Q(-60, -118), Q(10, -128), Q(70, -112), Q(100, -66), Q(98, -6), Q(82, -52), Q(30, -70), Q(-40, -66), Q(-82, -46)], { fill: F.hair, lw: 5.5 });
    else ink(ctx, [Q(-98, -4), Q(-100, -74), Q(-56, -122), Q(16, -130), Q(80, -110), Q(102, -62), Q(98, -4), Q(70, -56), Q(10, -76), Q(-30, -60), Q(-80, -40)], { fill: F.hair, lw: 5.5 });
    // brows, eyes, nose, mouth
    const eyeY = 2;
    for (const sx of [-1, 1]) {
      ink(ctx, [Q(sx * 54, -30), Q(sx * 38, -38), Q(sx * 22, -32)], { closed: false, lw: 4.6, single: true });
      if (expr === 'yum') { ctx.fillStyle = C.ink; const c = Q(sx * 38, eyeY); ctx.beginPath(); ctx.ellipse(c[0], c[1], 11 * s, 14 * s, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = C.cream; ctx.beginPath(); ctx.arc(c[0] + 4 * s, c[1] - 5 * s, 4.5 * s, 0, TAU); ctx.fill(); }
      else if (expr === 'chew') ink(ctx, [Q(sx * 38 - 15, eyeY - 2), Q(sx * 38, eyeY + 9), Q(sx * 38 + 15, eyeY - 2)], { closed: false, lw: 5, single: true });
      else ink(ctx, [Q(sx * 38 - 16, eyeY + 6), Q(sx * 38, eyeY - 10), Q(sx * 38 + 16, eyeY + 6)], { closed: false, lw: 5, single: true });
    }
    if (who === 'me' || who === 'blue') for (const sx of [-1, 1]) ink(ctx, [Q(sx * 54, eyeY - 2), Q(sx * 64, eyeY - 10)], { closed: false, lw: 3.6, single: true });   // a lash
    if (who === 'cream') for (const sx of [-1, 1]) { ink(ctx, E(sx * 38, eyeY, 30, 26, 16), { closed: true, lw: 4.2, single: true }); if (sx > 0) ink(ctx, [Q(-8, eyeY - 4), Q(8, eyeY - 4)], { closed: false, lw: 4, single: true }); }
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) ink(ctx, [Q(sx * 62 - 14 + i * 11, 46), Q(sx * 62 - 8 + i * 11, 32)], { closed: false, lw: 3.4, single: true });   // blush (hatch)
    ink(ctx, [Q(-4, 14), Q(-10, 34), Q(4, 38)], { closed: false, lw: 4, single: true });
    if (expr === 'laugh') {
      const open = ph ? 1 : .82, m = [Q(-40, 54), Q(40, 54), Q(30, 54 + 40 * open), Q(0, 58 + 46 * open), Q(-30, 54 + 40 * open)];
      ink(ctx, m, { fill: C.ink, lw: 4.5 });
      ink(ctx, [Q(-34, 56), Q(34, 56), Q(30, 66), Q(-30, 66)], { fill: C.cream, lw: 0, smooth: false, mx: 0, my: 0 });
    } else if (expr === 'chew') ink(ctx, [Q(-18 + cheek * 8, 64), Q(-6 + cheek * 8, 60), Q(6 + cheek * 8, 66), Q(18 + cheek * 8, 61)], { closed: false, lw: 4.5, single: true });
    else ink(ctx, E(0, 64, 13, 16, 12), { fill: C.ink, lw: 4, single: true });
  }
  /* laugh marks: little arcs beside a head (screen space) */
  function laughMarks(ctx, x, y, s, t) {
    const ph = Math.floor(t * 6) % 2;
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const a = (sx > 0 ? -.5 : Math.PI + .5) + (i - 1) * .42 * sx, r0 = (150 + ph * 6) * s, r1 = r0 + 30 * s;
      ink(ctx, [[x + Math.cos(a) * r0, y - 20 * s + Math.sin(a) * r0], [x + Math.cos(a) * r1, y - 20 * s + Math.sin(a) * r1]], { closed: false, lw: 4.5, single: true }); }
  }

  /* ---------------------------------------------------------------- comic panels, captions, marks (screen space) */
  /* a pop-in panel of any outline (pts), shown a0…a1: tiny overshoot on the pop, fades out whole; content(ctx) inside */
  function panel(ctx, t, a0, a1, pts, content) {
    if (t < a0 || t >= a1) return;
    const u = clamp((t - a0) / .22), pop = eo(u) * (1 + .05 * Math.sin(Math.PI * u)), fade = 1 - ss(a1 - .3, a1 - .06, t);
    if (pop <= .05 || fade <= .02) return;
    let cx = 0, cy = 0; for (const p of pts) { cx += p[0] / pts.length; cy += p[1] / pts.length; }
    ctx.save(); ctx.globalAlpha *= Math.min(1, pop * 1.6) * fade; ctx.translate(cx, cy); ctx.scale(pop, pop); ctx.translate(-cx, -cy);
    const path = pathOf(resample(pts, true, 16).map(p => wob(p, 1.6)), true, false);
    ctx.save(); ctx.translate(10, 12); ctx.fillStyle = tone(true, 0, 0); ctx.fill(path); ctx.restore();
    ctx.save(); ctx.fillStyle = C.panel; ctx.fill(path); ctx.clip(path); content(ctx); ctx.restore();
    ctx.lineWidth = 7; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.stroke(path);
    ctx.restore();
  }
  /* a comic narration box with a caption in it; a = alpha */
  function captionBox(ctx, s, y, a, o = {}) {
    if (a <= 0) return;
    const size = o.size || 66, font = `400 ${size}px ${Table.FONT}`;
    ctx.save(); ctx.font = font; const w = ctx.measureText(Pilot.tr(s)).width; ctx.restore();
    const x0 = 540 - w / 2 - 44, x1 = 540 + w / 2 + 44, y0 = y - size * .98, y1 = y + size * .42;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, (1 - a) * -10);
    const box = [[x0, y0], [x1, y0 + 4], [x1 - 4, y1], [x0 + 3, y1 - 3]];
    ctx.save(); ctx.translate(9, 10); ctx.fillStyle = tone(true, 0, 0); ctx.fill(pathOf(box, true, false)); ctx.restore();
    ink(ctx, resample(box, true, 18), { fill: C.cream, smooth: false, lw: 6, raw: true });
    Pilot.text(ctx, s, 540, y, { size, weight: 400, font: Table.FONT, color: C.ink });
    ctx.restore();
  }
  /* the 짠! balloon: a spiky comic burst with the word in it */
  function burst(ctx, s, x, y, u, a) {
    if (a <= 0 || u <= 0) return;
    const pop = eo(u) * (1 + .06 * Math.sin(Math.PI * u)), pts = [], n = 22;
    for (let i = 0; i < n * 2; i++) { const an = i / (n * 2) * TAU, r = i % 2 ? 1 : 1.26 + .08 * Math.sin(i * 2.7); pts.push([x + Math.cos(an) * 170 * r * pop, y - 30 + Math.sin(an) * 88 * r * pop]); }
    ctx.save(); ctx.globalAlpha *= Math.min(1, a * 2);
    ctx.save(); ctx.translate(10, 12); ctx.fillStyle = tone(true, 0, 0); ctx.fill(pathOf(pts, true, false)); ctx.restore();
    ink(ctx, pts, { fill: C.cream, smooth: false, raw: false, lw: 6.5, step: 14 });
    Pilot.text(ctx, s, x, y + 6, { size: 104 * pop, weight: 400, font: Table.FONT, color: C.ink });
    ctx.restore();
  }
  /* impact marks round the meeting glasses (world): short strokes outward + four cream ting-stars where rims touch */
  function impact(ctx, x, y, k, kk) {
    if (k <= 0) return; ctx.save(); ctx.globalAlpha *= k;
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + .26, r0 = 132 + 26 * kk, r1 = r0 + 34 + (i % 2) * 18;
      ink(ctx, [[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]], { closed: false, lw: 6, single: true }); }
    for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2, r = 104;
      ink(ctx, spark4(x + Math.cos(a) * r, y + Math.sin(a) * r, 24 + 8 * kk), { fill: C.cream, lw: 3.6, smooth: false, raw: true, amp: .8, single: true }); }
    ctx.restore();
  }
  /* the end plate: a cream comic plate dropped into the top band (lands with a tiny settle); stamp = a little octopus */
  function endPlate(ctx, t, at) {
    const k = t - (at - .2); if (k <= 0) return;
    const drop = k < .32 ? eo(k / .32) : 1, settle = k < .32 ? 0 : Math.exp(-(k - .32) * 10) * Math.sin((k - .32) * 24) * 6;
    const x0 = 110, x1 = 970, y0 = 252 - (1 - drop) * 760 + settle, y1 = 770 - (1 - drop) * 760 + settle;
    const rect = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    ctx.save(); ctx.translate(12, 14); ctx.fillStyle = tone(true, 0, 0); ctx.fill(pathOf(rect, true, false)); ctx.restore();
    ink(ctx, resample(rect, true, 18), { fill: C.cream, smooth: false, lw: 7, raw: true });
    R.stamp(ctx, 540, y0 + 288, .62, -.06, octoIcon);
    return y0;
  }

  /* a name tag (a small cream label straddling a panel's rim), screen space */
  function nameTag(ctx, s, x, y, a = 1) {
    if (a <= 0) return; const size = 38, font = `400 ${size}px ${Table.FONT}`;
    ctx.save(); ctx.font = font; const w = ctx.measureText(Pilot.tr(s)).width; ctx.restore();
    const x0 = x - w / 2 - 20, x1 = x + w / 2 + 20, y0 = y - 30, y1 = y + 26, box = [[x0, y0], [x1, y0 + 2], [x1 - 2, y1], [x0 + 2, y1 - 2]];
    ctx.save(); ctx.globalAlpha *= a; ink(ctx, resample(box, true, 14), { fill: C.cream, smooth: false, lw: 5, raw: true });
    Pilot.text(ctx, s, x, y + 13, { size, weight: 400, font: Table.FONT, color: C.ink }); ctx.restore();
  }
  window.Table = { K, CX, CY, DCAM, prj, TB, PAN, PEOPLE, loc, PLACE, ARM1, ARM2, SH, ik3, PIECES, n2, n3, add3, sub3, lerp3,
    piece, octoIcon, table, bowl, sticks, spoon, glass, lettuce, jang, pan, steam, sizzle, arm, torso, headTop, handTop, face, laughMarks,
    panel, nameTag, captionBox, burst, impact, endPlate, FONT: "'Do Hyeon',sans-serif" };
})();

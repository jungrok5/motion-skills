/* cook-mograph-art.js — film-specific drawing for scene 2 (cook-mograph) of 「쭈꾸미 한 접시」. Global: window.CookArt
   - the cook (나): the kit's code-figure rig (Mograph.rig / ik2, same bone lengths) re-dressed — short dark hair, navy top,
     mustard #e2a93b apron, dark trousers. Installed by wrapping Mograph.drawFigure for actors made with colors.cook = 1
     (the kit file itself is not edited).
   - props drawn as chunky cel shapes with the kit's dark outline: 쭈꾸미 (the one accent red), bucket, bowl, flour bag,
     measuring spoon, wooden spoon, pot cross-section + strainer, wok + burner flames, phone + chat window, plate.
   All coordinates are screen px unless a function says "local" (the actor's rig frame: x forward of the hip's ground point,
   y up, × place().s). Deterministic: seeded Pilot.rng only. */
(function () {
  const { clamp, lerp, ss, eo, eio, rng } = Pilot, TAU = Math.PI * 2, MG = Mograph;
  const LINE = '#2b1d1a', LW = 5;
  const A = {};
  A.RED = '#e2452b';           // 쭈꾸미 red (the kit accent for this film)
  A.MUSTARD = '#e2a93b';
  A.NAVY = '#34497a';          // lum just above the line-art filter's solid-ink threshold, so the drafting look reads it as line work
  // 명현 (she caught the 쭈꾸미): dark hair tied back in a low bun, navy top, the mustard apron (her mark)
  A.MH = { cook: 1, bun: 1, line: LINE, skin: '#ffe3d2', skin2: '#f1c2a8', blush: '#ff9e9e', hair: '#2a2321', hair2: '#4a3e3a', eye: '#2a1c16',
    top: A.NAVY, top2: '#2a3b64', cuff: '#41598f', apron: A.MUSTARD, apron2: '#c48d27', pants: '#5d5a68', pants2: '#4b4856', shoe: '#f6f1e8', shoe2: A.NAVY };
  // 경찬: short dark hair, green-grey top, a plain cream apron
  A.KC = { cook: 1, line: LINE, skin: '#f9dcc6', skin2: '#e9b99c', blush: '#f2a08e', hair: '#231e1c', hair2: '#453a36', eye: '#2a1c16', brow: 7,
    top: '#6f8a6a', top2: '#5a7356', cuff: '#809b7a', apron: '#ece4d2', apron2: '#cfc4ac', pants: '#4f5360', pants2: '#40434f', shoe: '#f6f1e8', shoe2: '#5a7356' };
  A.COOK = A.MH;

  // ---------------------------------------------------------------- the cook (fork of Mograph.drawFigure)
  const BODY = MG.BODY;
  function drawCook(ctx, r, C, ax, ay) {
    const L = C.line;
    ctx.save(); ctx.translate(ax, ay); ctx.scale(r.face, -1);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const cap = (pts, fill) => {
      for (const pass of [0, 1]) {
        for (let i = 0; i < pts.length - 1; i++) { const [x0, y0, w0] = pts[i], [x1, y1, w1] = pts[i + 1], a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a);
          const e = pass ? 0 : LW; ctx.fillStyle = pass ? fill : L; ctx.beginPath();
          ctx.moveTo(x0 + nx * (w0 / 2 + e), y0 + ny * (w0 / 2 + e)); ctx.lineTo(x1 + nx * (w1 / 2 + e), y1 + ny * (w1 / 2 + e));
          ctx.lineTo(x1 - nx * (w1 / 2 + e), y1 - ny * (w1 / 2 + e)); ctx.lineTo(x0 - nx * (w0 / 2 + e), y0 - ny * (w0 / 2 + e)); ctx.closePath(); ctx.fill();
          for (const [x, y, ww, flat] of [pts[i], pts[i + 1]]) if (!flat) { ctx.beginPath(); ctx.arc(x, y, ww / 2 + e, 0, TAU); ctx.fill(); } } }
    };
    const shoe = (a, far) => {
      const tilt = clamp((a[1] - BODY.ankle) / 60, 0, 1) * -.35, c = Math.cos(tilt), s = Math.sin(tilt), P = (x, y) => [a[0] + x * c - y * s, a[1] - 10 + x * s + y * c];
      ctx.fillStyle = far ? '#dcd6cc' : C.shoe; ctx.strokeStyle = L; ctx.lineWidth = LW; MG.poly(ctx, [P(-34, -4), P(86, -4), P(94, 16), P(72, 40), P(18, 46), P(-34, 32)]); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = C.shoe2; ctx.lineWidth = 6; ctx.beginPath(); const q0 = P(30, 12), q1 = P(70, 28); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke();
      ctx.strokeStyle = L; ctx.lineWidth = 3; ctx.beginPath(); const z0 = P(-32, 6), z1 = P(88, 6); ctx.moveTo(z0[0], z0[1]); ctx.lineTo(z1[0], z1[1]); ctx.stroke();
    };
    const leg = (k, a, far) => { shoe(a, far); cap([[r.hip[0], r.hip[1], 80], [k[0], k[1], 72], [a[0] - 4, a[1] + 18, 76, 1]], far ? C.pants2 : C.pants); };
    const armDraw = (Ar, far) => {
      const dx = Ar.h[0] - Ar.e[0], dy = Ar.h[1] - Ar.e[1], dl = Math.hypot(dx, dy) || 1, wr = [Ar.h[0] - dx / dl * (BODY.hand * .5 + 4), Ar.h[1] - dy / dl * (BODY.hand * .5 + 4)];
      const cf = [wr[0] - dx / dl * 30, wr[1] - dy / dl * 30];   // sleeve pushed up: skin forearm below a rolled cuff
      cap([[Ar.s[0], Ar.s[1], 58], [Ar.e[0], Ar.e[1], 50], [cf[0], cf[1], 46]], far ? C.top2 : C.top);
      cap([[cf[0], cf[1], 40], [wr[0], wr[1], 36]], far ? C.skin2 : C.skin);
      cap([[cf[0] + dx / dl * 2, cf[1] + dy / dl * 2, 50], [cf[0] - dx / dl * 8, cf[1] - dy / dl * 8, 50]], far ? C.top2 : C.cuff);
      ctx.fillStyle = far ? C.skin2 : C.skin; ctx.strokeStyle = L; ctx.lineWidth = LW; ctx.beginPath(); ctx.arc(Ar.h[0], Ar.h[1], BODY.hand * .66, 0, TAU); ctx.fill(); ctx.stroke();
    };
    armDraw(r.aFar, 1); leg(r.kF, r.aF, 1); leg(r.kN, r.aN, 0);
    const T = (v, u) => [r.hip[0] + r.td[0] * u + r.td[1] * v, r.hip[1] + r.td[1] * u - r.td[0] * v];
    const curve = pts => { ctx.beginPath(); ctx.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } ctx.closePath(); };
    // navy top
    curve([T(-74, -30), T(80, -30), T(84, 20), T(74, 170), T(50, 228), T(14, 246), T(-40, 248), T(-76, 212), T(-82, 120)]);
    ctx.fillStyle = C.top; ctx.strokeStyle = L; ctx.lineWidth = LW; ctx.fill(); ctx.stroke();
    // apron: neck strap, bib, waist tie with a bow at the back, skirt hanging over the thighs (vertical in the world)
    ctx.strokeStyle = C.apron2; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(...T(44, 214)); ctx.quadraticCurveTo(...T(10, 262), ...T(-30, 238)); ctx.stroke();
    const wf = T(84, 112), wb = T(-80, 112), hem = r.hip[1] - 175;
    const bib = [T(40, 214), T(70, 206), T(88, 150), T(90, 112)];
    ctx.fillStyle = C.apron; ctx.strokeStyle = L; ctx.lineWidth = LW;
    ctx.beginPath(); ctx.moveTo(...bib[0]); ctx.lineTo(...bib[1]); ctx.quadraticCurveTo(...bib[2], ...bib[3]);
    ctx.lineTo(wf[0] + 22, hem + 4); ctx.quadraticCurveTo(wf[0] - 30, hem - 10, wf[0] - 92, hem - 2); ctx.lineTo(...T(-6, 112)); ctx.lineTo(...T(18, 140)); ctx.lineTo(...T(28, 200)); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.apron2; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(wf[0] - 50, (wf[1] + hem) / 2 + 6); ctx.lineTo(wf[0] + 6, (wf[1] + hem) / 2 + 10); ctx.stroke();   // pocket seam
    ctx.strokeStyle = L; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wf[0] - 50, (wf[1] + hem) / 2 + 6); ctx.lineTo(wf[0] - 50, (wf[1] + hem) / 2 - 22); ctx.stroke();
    ctx.strokeStyle = L; ctx.lineWidth = 16 + LW; ctx.beginPath(); ctx.moveTo(...T(-6, 112)); ctx.lineTo(...wb); ctx.stroke();       // waist tie
    ctx.strokeStyle = C.apron2; ctx.lineWidth = 14; ctx.stroke();
    ctx.fillStyle = C.apron2; ctx.strokeStyle = L; ctx.lineWidth = 4;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(wb[0] - 18, wb[1] + s * 14, 20, 11, s * .7, 0, TAU); ctx.fill(); ctx.stroke(); }   // the bow
    ctx.beginPath(); ctx.moveTo(wb[0] - 10, wb[1]); ctx.lineTo(wb[0] - 30, wb[1] - 50); ctx.lineTo(wb[0] - 14, wb[1] - 52); ctx.closePath(); ctx.fill(); ctx.stroke();
    // collar
    ctx.fillStyle = C.top2; ctx.strokeStyle = L; ctx.lineWidth = LW; ctx.beginPath(); ctx.ellipse(...T(-6, 246), 46, 16, Math.atan2(r.td[1], r.td[0]) - Math.PI / 2, 0, TAU); ctx.fill(); ctx.stroke();
    // head
    const hdA = Math.atan2(r.hd[0], r.hd[1]);
    ctx.save(); ctx.translate(r.head[0], r.head[1]); ctx.rotate(-hdA);
    ctx.fillStyle = C.skin; ctx.strokeStyle = L; ctx.lineWidth = LW;
    ctx.beginPath(); ctx.ellipse(10, -54, 21, 24, 0, 0, TAU); ctx.fill();                                        // neck
    ctx.beginPath(); ctx.ellipse(4, 8, 64, 70, 0, 0, TAU); ctx.fill(); ctx.stroke();                              // skull
    ctx.beginPath(); ctx.moveTo(-8, 40); ctx.quadraticCurveTo(66, 52, 70, 0); ctx.quadraticCurveTo(72, -42, 40, -60); ctx.quadraticCurveTo(0, -70, -14, -40); ctx.closePath(); ctx.fill(); ctx.stroke();   // face, chin forward
    ctx.beginPath(); ctx.ellipse(4, 8, 60, 66, 0, 0, TAU); ctx.fill();                                            // clean the skull/face seam
    if (C.bun) {   // a low bun at the back of the head, with a mustard tie
      ctx.fillStyle = C.hair; ctx.beginPath(); ctx.ellipse(-70, -24, 30, 27, .3, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = C.hair2; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-74, -22, 16, 2.2, 4.2); ctx.stroke();
      ctx.fillStyle = A.MUSTARD; ctx.strokeStyle = L; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(-52, -18, 8, 16, .35, 0, TAU); ctx.fill(); ctx.stroke(); ctx.lineWidth = LW; }
    ctx.fillStyle = C.hair; ctx.strokeStyle = L; ctx.lineWidth = LW; ctx.beginPath();                              // hair: cap over the crown and back (to the nape for the bun)
    if (C.bun) ctx.moveTo(-40, -44), ctx.quadraticCurveTo(-70, -30, -66, 10), ctx.quadraticCurveTo(-74, 34, -62, 50); else { ctx.moveTo(-50, -26); ctx.quadraticCurveTo(-78, 10, -62, 50); } ctx.quadraticCurveTo(-30, 96, 22, 90); ctx.quadraticCurveTo(64, 82, 72, 40);
    ctx.lineTo(56, 46); ctx.lineTo(50, 30); ctx.lineTo(36, 42); ctx.lineTo(26, 30); ctx.lineTo(8, 40); ctx.quadraticCurveTo(-6, 30, -16, 6); if (C.bun) ctx.quadraticCurveTo(-24, -26, -40, -44); else ctx.quadraticCurveTo(-26, -14, -50, -26); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.hair2; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-40, 64); ctx.quadraticCurveTo(-8, 84, 24, 80); ctx.stroke();   // shine
    ctx.fillStyle = C.skin; ctx.strokeStyle = L; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(-12, 0, 13, 17, .1, 0, TAU); ctx.fill(); ctx.stroke();   // ear
    ctx.fillStyle = C.blush; ctx.globalAlpha = .45; ctx.beginPath(); ctx.ellipse(46, -22, 13, 7, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    const bl = r.blink; ctx.fillStyle = C.eye; ctx.beginPath(); ctx.ellipse(42, 6, 9, 14 * (1 - .9 * bl), 0, 0, TAU); ctx.fill();
    if (bl < .5) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(45, 12, 3.6, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = L; ctx.lineWidth = C.brow || 5; ctx.beginPath(); ctx.moveTo(28, 30); ctx.lineTo(54, 32); ctx.stroke();   // brow
    ctx.fillStyle = '#b8505a'; ctx.beginPath(); ctx.ellipse(56, -36, 7, 2.5 + 7 * r.mouth, 0, 0, TAU); ctx.fill();
    ctx.restore();
    armDraw(r.aNear, 0);
    ctx.restore();
  }
  const kitDraw = MG.drawFigure;
  MG.drawFigure = function (ctx, r, C, ax, ay) { return C && C.cook ? drawCook(ctx, r, C, ax, ay) : kitDraw(ctx, r, C, ax, ay); };

  // ---------------------------------------------------------------- local ↔ screen for an actor placed at (x, y, h)
  // L(p, [lx, ly]) → screen point of a rig-local point (p.f = the actor's facing)
  A.L = (p, q) => [p.x + (p.f || 1) * q[0] * p.s, p.y - q[1] * p.s];
  A.toLocal = (p, q) => [(q[0] - p.x) / ((p.f || 1) * p.s), (p.y - q[1]) / p.s];
  // at(x, y, h, f): an actor anchored at (x, y), figure h px tall, facing f = +1 (right) | −1 (left)
  A.at = (x, y, h, f = 1, figH = 820) => ({ x, y, s: h / figH, f, h });

  // ---------------------------------------------------------------- 쭈꾸미 (palm-sized, round mantle, eight curled arms)
  // octo(ctx, x, y, R, o): mantle centre (x, y), mantle radius R; o = { col, rot, t (wiggle time), seed, flour 0..1, gloss 0..1,
  //   mode 'color'|'ink'|'line', spread 0..1 (arms splayed on a surface vs hanging), squash }
  A.octo = function (ctx, x, y, R, o = {}) {
    const col = o.col || A.RED, t = o.t || 0, r = rng(o.seed || 1), mode = o.mode || 'color', sp = o.spread ?? .6, sq = o.squash || 0;
    const line = mode === 'line' ? MG.BLUE : LINE, fill = mode === 'line' ? '#f3ecdc' : mode === 'ink' ? '#fff' : col;
    const shade = mode === 'color' ? Pilot.rgb(Pilot.mix(Pilot.hex(col), [60, 10, 10], .28)) : fill;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(1 + .18 * sq, 1 - .18 * sq);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const arms = [];
    for (let k = 0; k < 8; k++) { const a0 = Math.PI / 2 + (k - 3.5) / 3.5 * lerp(.5, 1.35, sp), len = R * (1.0 + .3 * r()), cv = (k < 4 ? -1 : 1) * (1.6 + .8 * r());
      const pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8, ang = a0 + cv * u * u * 1.5 + .22 * Math.sin(t * 5 + k * 1.3 + u * 3) * u, d = R * .4 + len * u;
        pts.push([Math.cos(ang) * d * (k % 2 ? .92 : 1), R * .3 + Math.sin(ang) * d * .75, R * .56 * (1 - u * .7)]); }
      arms.push({ pts, back: k % 2 === 0 }); }
    const armPath = (pts, grow) => { for (let i = 0; i < pts.length - 1; i++) { const [x0, y0, w0] = pts[i], [x1, y1, w1] = pts[i + 1]; ctx.lineWidth = (w0 + w1) / 2 + grow; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); } };
    for (const pass of ['back', 'front']) for (const a of arms) { if ((pass === 'back') !== a.back) continue;
      ctx.strokeStyle = line; armPath(a.pts, 9); ctx.strokeStyle = a.back ? shade : fill; armPath(a.pts, 0);
      if (mode === 'color') { ctx.fillStyle = 'rgba(255,230,210,.85)'; for (let i = 3; i < 8; i += 2) { const [px, py, w] = a.pts[i]; ctx.beginPath(); ctx.arc(px, py, Math.max(1.5, w * .2), 0, TAU); ctx.fill(); } } }
    // mantle
    ctx.fillStyle = fill; ctx.strokeStyle = line; ctx.lineWidth = Math.max(4, R * .09);
    ctx.beginPath(); ctx.ellipse(0, -R * .35, R * .9, R * 1.05, 0, 0, TAU); ctx.fill(); ctx.stroke();
    if (mode === 'color') { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-R * .32, -R * .8, R * .2, R * .34, -.35, 0, TAU); ctx.fill(); }
    // eyes
    for (const s of [-1, 1]) { ctx.fillStyle = '#fff6ea'; ctx.strokeStyle = line; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(s * R * .34, R * .28, R * .2, R * .17, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = mode === 'line' ? MG.BLUE : '#241614'; ctx.beginPath(); ctx.ellipse(s * R * .34, R * .3, R * .07, R * .11, 0, 0, TAU); ctx.fill(); }
    if (o.flour > 0) { ctx.globalAlpha = .8 * o.flour; ctx.fillStyle = '#fbf7ef'; const fr = rng(o.seed * 7 + 3);
      for (let k = 0; k < 22; k++) { const px = (fr() - .5) * R * 2.6, py = -R * .9 + fr() * R * 2.2; ctx.beginPath(); ctx.arc(px, py, R * (.08 + .14 * fr()), 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
    if (o.gloss > 0) { ctx.globalAlpha = o.gloss; ctx.strokeStyle = 'rgba(255,240,225,.9)'; ctx.lineWidth = Math.max(2, R * .07);
      ctx.beginPath(); ctx.arc(0, -R * .35, R * .62, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.restore();
  };
  A.RAW = '#b9533c'; A.BLANCHED = A.RED; A.SAUCED = '#c4291a';

  // ---------------------------------------------------------------- counter (a wooden worktop with a cabinet front)
  A.counter = function (ctx, x0, x1, y, h = 420, top = '#d9a86c', front = '#efe3cc', line = LINE) {
    ctx.save(); ctx.lineJoin = 'round';
    ctx.fillStyle = front; ctx.strokeStyle = line; ctx.lineWidth = LW; ctx.fillRect(x0, y + 18, x1 - x0, h); ctx.strokeRect(x0, y + 18, x1 - x0, h);
    ctx.lineWidth = 3; for (let k = 1; k < 3; k++) { const xx = lerp(x0, x1, k / 3); ctx.beginPath(); ctx.moveTo(xx, y + 40); ctx.lineTo(xx, y + h); ctx.stroke(); }
    ctx.fillStyle = top; ctx.lineWidth = LW; ctx.beginPath(); ctx.roundRect(x0 - 14, y, x1 - x0 + 28, 26, 6); ctx.fill(); ctx.stroke();
    ctx.restore();
  };

  // ---------------------------------------------------------------- bucket (wooden tub, matching scene 1) — rotates about its front-bottom corner
  // bucket(ctx, p, rot, o): p = actor place, local frame: bottom from x 230 to 400 at y 380 (counter top), height 170.
  // rot (rad, clockwise = tipping forward). o.inner / o.over (ctx, cx, top) draw its contents (bucket-local px, origin at
  // the mouth centre) — inner clipped inside the mouth, over on top (arms draped over the rim).
  A.BKT = { x0: 230, x1: 400, y0: 380, h: 170 };
  A.WOOD = { stave: '#c19c69', stave2: '#b08a58', seam: '#7d603c', hoop: '#cba862', inside: '#7d603c' };
  A.bucketPt = (rot, lx, ly) => { const B = A.BKT, px = B.x1, py = B.y0, dx = lx - px, dy = ly - py, c = Math.cos(-rot), s = Math.sin(-rot); return [px + dx * c - dy * s, py + dx * s + dy * c]; };
  // tub(ctx, cx, by, w, h, o): a wooden tub drawn upright with its bottom centre at (cx, by), bottom width w, height h
  A.tub = function (ctx, cx, by, w, h, o = {}) {
    const C = A.WOOD, fl = w * .09, top = by - h, L = (u, v) => [cx + lerp(-w / 2, w / 2, u) + lerp(0, (u - .5) * 2 * fl, v), by - h * v];   // u across, v up
    ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = LINE; ctx.lineWidth = LW;
    ctx.fillStyle = C.inside; ctx.beginPath(); ctx.ellipse(cx, top, w / 2 + fl, w * .13, 0, 0, TAU); ctx.fill(); ctx.stroke();   // mouth (inside)
    if (o.inner) { ctx.save(); ctx.beginPath(); ctx.ellipse(cx, top, w / 2 + fl - 4, w * .13 - 3, 0, Math.PI, TAU); ctx.rect(cx - w, top, 2 * w, h + 40); ctx.clip(); o.inner(ctx, cx, top); ctx.restore(); }
    const body = () => { ctx.beginPath(); const a = L(0, 1), b = L(0, 0), c = L(1, 0), d = L(1, 1); ctx.moveTo(...a); ctx.lineTo(...b); ctx.quadraticCurveTo(cx, by + w * .1, ...c); ctx.lineTo(...d); ctx.quadraticCurveTo(cx, top + w * .13, ...a); ctx.closePath(); };
    body(); ctx.fillStyle = C.stave; ctx.fill();
    ctx.save(); body(); ctx.clip();
    for (let k = 0; k < 7; k++) { if (k % 2) { ctx.fillStyle = C.stave2; const a = L(k / 7, 1.05), b = L(k / 7, -.1), c = L((k + 1) / 7, -.1), d = L((k + 1) / 7, 1.05); M4(ctx, a, b, c, d); ctx.fill(); } }
    ctx.strokeStyle = C.seam; ctx.lineWidth = 3; for (let k = 1; k < 7; k++) { const a = L(k / 7, 1.05), b = L(k / 7, -.1); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }
    for (const v of [.2, .78]) { const hh = h * .1, a = L(-.05, v + .05), b = L(1.05, v + .05), c = L(1.05, v - .05), d = L(-.05, v - .05);   // the hoops
      ctx.fillStyle = C.hoop; ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo(cx, a[1] + w * .1, ...b); ctx.lineTo(...c); ctx.quadraticCurveTo(cx, c[1] + w * .1, ...d); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = LINE; ctx.lineWidth = 4; ctx.stroke(); }
    ctx.restore();
    body(); ctx.strokeStyle = LINE; ctx.lineWidth = LW; ctx.stroke();
    if (o.over) o.over(ctx, cx, top);
    ctx.restore();
  };
  function M4(ctx, a, b, c, d) { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.lineTo(...d); ctx.closePath(); }
  A.bucket = function (ctx, p, rot, o = {}) {
    const B = A.BKT, s = p.s, [px, py] = A.L(p, [B.x1, B.y0]), w0 = B.x1 - B.x0;
    ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.scale(s, s);
    A.tub(ctx, -w0 / 2, 0, w0, B.h, o);
    ctx.restore();
  };

  // ---------------------------------------------------------------- bowl (cream ceramic, side view with an inner ellipse)
  // bowl(ctx, x, y, w, part, o): rim centre (x, y), rim width w. part 'back' (inside) | 'front' (outer wall). o.fill = contents colour
  A.bowl = function (ctx, x, y, w, part, o = {}) {
    const rh = w * .14, d = w * .42, line = o.line || LINE, body = o.body || '#f4ede0', inside = o.inside || '#e3d6c0';
    ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = line; ctx.lineWidth = LW;
    if (part === 'back') { ctx.fillStyle = inside; ctx.beginPath(); ctx.ellipse(x, y, w / 2, rh, 0, 0, TAU); ctx.fill(); ctx.stroke();
      if (o.fill) { ctx.fillStyle = o.fill; ctx.beginPath(); ctx.ellipse(x, y + rh * .25, w / 2 * .82 * (o.level ?? 1), rh * .7 * (o.level ?? 1), 0, 0, TAU); ctx.fill(); } }
    else { ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.bezierCurveTo(x - w / 2, y + d * 1.1, x + w / 2, y + d * 1.1, x + w / 2, y); ctx.ellipse(x, y, w / 2, rh, 0, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = o.band || '#8fb3c9'; ctx.beginPath(); ctx.moveTo(x - w * .46, y + d * .32); ctx.bezierCurveTo(x - w * .3, y + d * .5, x + w * .3, y + d * .5, x + w * .46, y + d * .32); ctx.lineTo(x + w * .43, y + d * .45); ctx.bezierCurveTo(x + w * .3, y + d * .62, x - w * .3, y + d * .62, x - w * .43, y + d * .45); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(x - w * .3, y + d * .25, w * .03, d * .14, .5, 0, TAU); ctx.fill(); }
    ctx.restore();
  };

  // ---------------------------------------------------------------- flour bag (held by its top corner), pour stream
  // flourBag(ctx, x, y, s, rot): held by the bottom centre at (x, y); rot 0 = upright (mouth up), rot ≈ 2.2 = mouth down-right
  A.flourBag = function (ctx, x, y, s, rot, line = LINE, fill = '#f7f2e6') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.translate(-50, -160); ctx.lineJoin = 'round'; ctx.strokeStyle = line; ctx.lineWidth = LW;
    ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(110, -10); ctx.lineTo(120, 160); ctx.lineTo(-30, 160); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7fa9d6'; ctx.fillRect(-22, 40, 138, 46); ctx.strokeRect(-22, 40, 138, 46);
    ctx.fillStyle = line === LINE ? '#1d2a4a' : line; ctx.font = `400 34px ${MG.DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(Pilot.tr('밀가루'), 47, 64);
    ctx.restore();
  };

  // ---------------------------------------------------------------- spoons
  // measuring spoon (steel) with contents: tip 0 = level, 1 = poured out (rotated, empty)
  A.mspoon = function (ctx, x, y, s, rot, content, amt = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.strokeStyle = LINE; ctx.lineWidth = LW;
    ctx.fillStyle = '#c9d0d8'; ctx.beginPath(); ctx.roundRect(36, -9, 170, 18, 9); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 50, 34, 0, 0, TAU); ctx.fillStyle = '#dfe5ea'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#aab3bd'; ctx.beginPath(); ctx.ellipse(0, 0, 40, 25, 0, 0, TAU); ctx.fill();
    if (content && amt > 0) { ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 40, 25, 0, 0, TAU); ctx.clip(); A.stuff(ctx, 0, 2, 40 * amt, 22 * amt, content); ctx.restore(); }
    ctx.restore();
  };
  // stuff(ctx, x, y, rx, ry, kind): a dollop of an ingredient
  A.INGR = { gochujang: '#b82a1c', gochugaru: '#d33a22', ganjang: '#4a2a1c', garlic: '#f1e6c4', sugar: '#ffffff' };
  A.stuff = function (ctx, x, y, rx, ry, kind) {
    const c = A.INGR[kind] || kind, r = rng(kind.length * 13);
    ctx.save(); ctx.fillStyle = c; ctx.strokeStyle = LINE; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
    if (kind === 'gochugaru') { ctx.fillStyle = '#8f1d10'; for (let k = 0; k < 14; k++) { ctx.fillRect(x + (r() - .5) * rx * 1.6, y + (r() - .5) * ry * 1.4, 4, 3); } }
    if (kind === 'garlic') { ctx.fillStyle = '#d9c78f'; for (let k = 0; k < 10; k++) { ctx.beginPath(); ctx.arc(x + (r() - .5) * rx * 1.5, y + (r() - .5) * ry * 1.2, 3.5, 0, TAU); ctx.fill(); } }
    if (kind === 'sugar') { ctx.fillStyle = '#d8dde6'; for (let k = 0; k < 12; k++) ctx.fillRect(x + (r() - .5) * rx * 1.5, y + (r() - .5) * ry * 1.2, 4, 4); }
    if (kind === 'ganjang' || kind === 'gochujang') { ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(x - rx * .3, y - ry * .3, rx * .25, ry * .2, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  };
  // wooden spoon held at (hx, hy) (the grip), pointing at angle ang (rad, screen), length len
  A.woodSpoon = function (ctx, hx, hy, ang, len, line = LINE) {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang); ctx.lineCap = 'round'; ctx.strokeStyle = line; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(len - 40, 0); ctx.stroke();
    ctx.strokeStyle = '#d8a463'; ctx.lineWidth = 12; ctx.stroke();
    ctx.fillStyle = '#d8a463'; ctx.strokeStyle = line; ctx.lineWidth = LW; ctx.beginPath(); ctx.ellipse(len - 10, 0, 36, 22, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  };

  // ---------------------------------------------------------------- the pot, cross-section, drafting look
  A.potSection = function (ctx, x0, x1, yb, h, t, water, col = MG.BLUE) {
    const wall = 22, yt = yb - h, wl = yb - h * water;
    ctx.save(); ctx.strokeStyle = col; ctx.lineJoin = 'round';
    // water (hatched) + surface
    ctx.save(); ctx.beginPath(); ctx.rect(x0 + wall, wl - 6, x1 - x0 - 2 * wall, yb - wall - wl + 6); ctx.clip();
    ctx.globalAlpha = .35; ctx.lineWidth = 2; for (let k = -40; k < 40; k++) { const xx = x0 + k * 26; ctx.beginPath(); ctx.moveTo(xx, yb); ctx.lineTo(xx + h, yb - h); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.restore();
    ctx.lineWidth = 4; ctx.beginPath(); for (let xx = x0 + wall; xx <= x1 - wall; xx += 8) { const yy = wl + 6 * Math.sin(xx * .05 + t * 9); xx === x0 + wall ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); } ctx.stroke();
    // section walls: double line with 45° hatch (the cut)
    const sec = (xa, xb, ya, yb2) => { ctx.lineWidth = 4; ctx.strokeRect(xa, ya, xb - xa, yb2 - ya); ctx.save(); ctx.beginPath(); ctx.rect(xa, ya, xb - xa, yb2 - ya); ctx.clip(); ctx.lineWidth = 2.5;
      for (let k = -30; k < 60; k++) { ctx.beginPath(); ctx.moveTo(xa + k * 10, ya); ctx.lineTo(xa + k * 10 - 400, ya + 400); ctx.stroke(); } ctx.restore(); };
    sec(x0, x0 + wall, yt, yb); sec(x1 - wall, x1, yt, yb); sec(x0, x1, yb - wall, yb);
    // handles
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x0, yt + 30); ctx.lineTo(x0 - 50, yt + 24); ctx.lineTo(x0 - 50, yt + 50); ctx.lineTo(x0, yt + 56); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, yt + 30); ctx.lineTo(x1 + 50, yt + 24); ctx.lineTo(x1 + 50, yt + 50); ctx.lineTo(x1, yt + 56); ctx.stroke();
    // boiling bubbles rising from the bottom (seeded, looping)
    const r = rng(31); ctx.lineWidth = 3;
    for (let k = 0; k < 16; k++) { const bx = lerp(x0 + wall + 20, x1 - wall - 20, r()), sp = .7 + r() * .8, ph = r(), u = ((t * sp + ph) % 1), by = lerp(yb - wall - 10, wl + 10, u), br = 6 + 12 * u * r() + 4;
      if (by > wl) { ctx.beginPath(); ctx.arc(bx + 6 * Math.sin(t * 7 + k), by, br, 0, TAU); ctx.stroke(); } }
    ctx.restore();
  };
  // burner flames (line or colour): n tongues along x0..x1 at base y
  A.flames = function (ctx, x0, x1, y, hgt, t, mode = 'color', seed = 5) {
    const r = rng(seed), n = 7; ctx.save(); ctx.lineJoin = 'round';
    for (let k = 0; k < n; k++) { const cx = lerp(x0, x1, (k + .5) / n), h = hgt * (.7 + .3 * r()) * (.85 + .15 * Math.sin(t * 17 + k * 2.1)), w = (x1 - x0) / n * .62, lean = 8 * Math.sin(t * 11 + k);
      const tongue = (sc) => { ctx.beginPath(); ctx.moveTo(cx - w * sc, y); ctx.quadraticCurveTo(cx - w * sc * 1.1, y - h * sc * .5, cx + lean * sc, y - h * sc); ctx.quadraticCurveTo(cx + w * sc * 1.1, y - h * sc * .5, cx + w * sc, y); ctx.closePath(); };
      if (mode === 'line') { ctx.strokeStyle = MG.BLUE; ctx.lineWidth = 3; tongue(1); ctx.stroke(); }
      else { tongue(1); ctx.fillStyle = '#ff9d1c'; ctx.fill(); ctx.strokeStyle = LINE; ctx.lineWidth = 4; ctx.stroke(); tongue(.58); ctx.fillStyle = '#ffe36b'; ctx.fill(); } }
    ctx.restore();
  };

  // ---------------------------------------------------------------- wok (side view): rim from (x0) to (x1) at y, depth d; handle to grip
  A.wok = function (ctx, x0, x1, y, d, part, grip) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = LINE; ctx.lineWidth = LW;
    const cx = (x0 + x1) / 2, w = x1 - x0, rh = w * .1;
    if (part === 'back') { ctx.fillStyle = '#3a3a42'; ctx.beginPath(); ctx.ellipse(cx, y, w / 2, rh, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    else {
      // handle: from the near rim to the grip (wooden grip end)
      const hx = x0 + 8, hy = y + 6, gx = grip[0], gy = grip[1], a = Math.atan2(gy - hy, gx - hx), mx = lerp(hx, gx, .45), my = lerp(hy, gy, .45);
      ctx.strokeStyle = LINE; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(gx - Math.cos(a) * -10, gy - Math.sin(a) * -10); ctx.stroke();
      ctx.strokeStyle = '#4a4a54'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(mx, my); ctx.stroke();
      ctx.strokeStyle = LINE; ctx.lineWidth = 32; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(gx + Math.cos(a) * 14, gy + Math.sin(a) * 14); ctx.stroke();
      ctx.strokeStyle = '#a8703c'; ctx.lineWidth = 22; ctx.stroke();
      ctx.fillStyle = '#2c2c33'; ctx.strokeStyle = LINE; ctx.lineWidth = LW;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.bezierCurveTo(x0 + w * .08, y + d * 1.25, x1 - w * .08, y + d * 1.25, x1, y); ctx.ellipse(cx, y, w / 2, rh, 0, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0 + w * .16, y + d * .3); ctx.quadraticCurveTo(cx - w * .1, y + d * .8, cx + w * .1, y + d * .82); ctx.stroke();
    }
    ctx.restore();
  };
  A.burner = function (ctx, cx, y, w) {
    ctx.save(); ctx.fillStyle = '#2a2e3c'; ctx.strokeStyle = LINE; ctx.lineWidth = LW; ctx.beginPath(); ctx.roundRect(cx - w / 2, y, w, 34, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4a5064'; ctx.beginPath(); ctx.roundRect(cx - w * .3, y - 12, w * .6, 16, 5); ctx.fill(); ctx.stroke(); ctx.restore();
  };

  // ---------------------------------------------------------------- pieces in the pan (onion, green onion)
  A.onion = function (ctx, x, y, s, rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.strokeStyle = LINE; ctx.lineWidth = 4; ctx.fillStyle = '#fbf3df';
    ctx.beginPath(); ctx.arc(0, 0, 26 * s, Math.PI * 1.05, Math.PI * 1.95); ctx.arc(0, 0, 14 * s, Math.PI * 1.95, Math.PI * 1.05, true); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); };
  A.scallion = function (ctx, x, y, s, rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.strokeStyle = LINE; ctx.lineWidth = 4; ctx.fillStyle = '#5fae4a';
    ctx.beginPath(); ctx.roundRect(-22 * s, -8 * s, 44 * s, 16 * s, 7 * s); ctx.fill(); ctx.stroke(); ctx.restore(); };

  // ---------------------------------------------------------------- phone in the hand (screen px, centre, rotation)
  A.phone = function (ctx, x, y, s, rot, lit) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.strokeStyle = LINE; ctx.lineWidth = LW; ctx.fillStyle = '#2d3140';
    ctx.beginPath(); ctx.roundRect(-34, -62, 68, 124, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = lit ? '#fff7e8' : '#4a5066'; ctx.beginPath(); ctx.roundRect(-27, -52, 54, 104, 8); ctx.fill();
    if (lit) { ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.roundRect(-4, -36, 26, 12, 6); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-22, -16, 26, 12, 6); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  };

  // ---------------------------------------------------------------- the finished dish on a plate
  A.dish = function (ctx, x, y, w, t, seed = 9) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = LINE; ctx.lineWidth = LW;
    ctx.fillStyle = '#d9d4ca'; ctx.beginPath(); ctx.ellipse(x, y + 12, w / 2, w * .2, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fbf8f1'; ctx.beginPath(); ctx.ellipse(x, y, w / 2, w * .19, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#8fb3c9'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y, w * .43, w * .155, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = A.SAUCED; ctx.strokeStyle = LINE; ctx.lineWidth = 4; ctx.beginPath();   // a heaped mound of sauce, not a flat pool
    ctx.moveTo(x - w * .34, y - 2); ctx.quadraticCurveTo(x - w * .3, y - w * .2, x, y - w * .21); ctx.quadraticCurveTo(x + w * .3, y - w * .2, x + w * .34, y - 2); ctx.quadraticCurveTo(x, y + w * .1, x - w * .34, y - 2); ctx.fill(); ctx.stroke();
    const r = rng(seed);
    const items = []; for (let k = 0; k < 12; k++) { const a = r() * TAU, rr = Math.sqrt(r()); items.push({ k, x: x + Math.cos(a) * rr * w * .27, y: y - w * .08 + Math.sin(a) * rr * w * .08 - (1 - rr) * w * .07, rot: (r() - .5) * .9, kind: k % 2 ? 0 : (k % 4 ? 1 : 2) }); }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) { if (it.kind === 0) A.octo(ctx, it.x, it.y - 6, w * .062, { col: A.SAUCED, rot: it.rot, t: 0, seed: 40 + it.k, spread: .9, gloss: .9 });
      else if (it.kind === 1) A.onion(ctx, it.x, it.y, w / 520, it.rot); else A.scallion(ctx, it.x, it.y, w / 520, it.rot); }
    ctx.fillStyle = '#fff7da'; for (let k = 0; k < 22; k++) { ctx.beginPath(); ctx.ellipse(x + (r() - .5) * w * .5, y - w * .05 - r() * w * .13, 3.5, 2.2, r(), 0, TAU); ctx.fill(); }   // sesame
    ctx.restore();
  };
  // steam curls above a hot thing (tied to it): three S-curves rising and fading
  A.steam = function (ctx, x, y, h, t, a = 1, col = 'rgba(255,255,255,.85)') {
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.lineWidth = 9;
    for (let k = 0; k < 3; k++) { const u = (t * .7 + k / 3) % 1, x0 = x + (k - 1) * 46, y0 = y - u * h * .5; ctx.globalAlpha = a * Math.sin(Math.PI * u) * .9;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.bezierCurveTo(x0 + 26, y0 - h * .15, x0 - 26, y0 - h * .3, x0, y0 - h * .45); ctx.stroke(); }
    ctx.restore();
  };

  window.CookArt = A;
})();

/* ep2-standoff-fx.js — scene-2 helpers the kit / cast do not have yet (candidates to move into donut-cast.js / donut-manga.js).
   Global: window.EP2. Load after lib.js, kit-webtoon.js, donut-manga.js, donut-cast.js. Monochrome manga finish: paper, ink, dot tone.
     EP2.camera(S, stops)              a Webtoon.camera from [panelId | {at}|{panel, off}, arrive, leave] (glide = gap between leave and arrive)
     EP2.arm(ctx, t, who, pose, o)     a big close-up arm + hand in the cast's construction: shoulder o.sh (fixed, usually off-panel) → elbow
                                       (Cast.ik3, FIXED upper-arm / forearm lengths, elbow toward o.pole) → wrist at o.wrist (clamped to reach)
                                       → Cast.drawHand at the wrist, its angle clamped ≤ 80° off the forearm. The sleeve follows the bones
                                       (박대리: shirt to a roll below the elbow, skin forearm; 김과장: white shirt + cuff; 최주임: black blazer,
                                       hoodie cuff, black wristband). o { sh, wrist, ang, sz, flip, pole [x, y], L1, L2 (× sz), halo (paper outline
                                       px, for black panels) } → { grip, tip, elbow, wrist, reach }
     EP2.flame(ctx, t, o)              a solid black flame aura (fake-epic menace) rising behind a figure: o { x, y (base centre), w, h, k (0…1),
                                       n (tongues), seed, edge (paper edge line, for black panels), licks (white flame licks) }
     EP2.rumble(ctx, t, o)             쿠구구구 as chunky white Manga.sfx letters that tremble (o as Manga.sfx + lines, dx, dy, tremble)
     EP2.menace(ctx, G, k)             the shadow over the eyes: a hard-edged band of fine dot tone over the top of a head (G from the cast)
     EP2.drop(ctx, t, x, y, r, at, o)  a big gag sweat drop (paper fill, ink line, one highlight) that pops and slides
     EP2.spark(ctx, t, x, y, r, at)    a 4-point sparkle: white with an ink outline (reads on paper and on skin)
     EP2.shards(ctx, t, x, y, ang, at, o) border fragments where an arm bursts through a panel edge
     EP2.streaks(ctx, t, x, y, ang, o) a few tapered black speed streaks trailing behind a moving thing
     EP2.eyeBand(ctx, t, who, x, y, w, h, s, o)  a clipped eye close-up strip of one face (the three-eye call-back) */
(function () {
  const WT = window.Webtoon, C = window.Cast, MG = window.Manga, { clamp, lerp, ss, eo, rng } = Pilot, TAU = Math.PI * 2, E = {};
  const INK = () => MG.C.ink, PAP = () => MG.C.paper, PAPL = () => MG.C.paperL;

  E.camera = function (S, stops, o = {}) {
    const list = []; let prevLeave = null;
    for (const [k, a, l] of stops) {
      const st = typeof k === 'string' ? { panel: k } : Object.assign({}, k);
      if (prevLeave != null) st.glide = Math.max(0, a - prevLeave);
      st.hold = Math.max(0, l - a); list.push(st); prevLeave = l;
    }
    return WT.camera(S, list, Object.assign({ t0: stops[0][1] }, o));
  };

  // the cast's garment values, mirrored from donut-cast.js paint() (manga style): ink, or paper + dot tone + a shade band
  function paintOf(S, key, dx, dy) {
    const m = (S.look && S.look[key]) || {};
    if (C.style === 'riso') return { fill: (S.pal && S.pal[key]) || '#ddd', shade: { tone: .2, dx, dy } };
    if (m.ink) return { fill: INK(), rim: { dx: -dx * .35, dy: -dy * .35, w: .5 } };
    const tn = m.tone || 0, sh = key === 'skin' ? 0 : (m.sh ?? .25);
    return { fill: m.white || key === 'skin' ? PAPL() : PAP(), tone: tn, shade: sh > 0 ? { tone: Math.min(.92, tn + sh), dx, dy } : null };
  }
  const MAXW = 80 * Math.PI / 180;
  E.arm = function (ctx, t, who, pose, o) {
    const S = C.SPEC[who], sz = o.sz, L1 = (o.L1 || 3.1) * sz, L2 = (o.L2 || 2.75) * sz, sh = o.sh, pole = o.pole || [0, 1];
    const sol = C.ik3([sh[0], sh[1], 0], [o.wrist[0], o.wrist[1], 0], L1, L2, [pole[0], pole[1], 0]);
    const el = [sol.e[0], sol.e[1]], wr = [sol.w[0], sol.w[1]], fa = Math.atan2(wr[1] - el[1], wr[0] - el[0]);
    let ang = o.ang ?? fa; const dA = ((ang - fa + 3 * Math.PI) % TAU) - Math.PI; ang = fa + clamp(dA, -MAXW, MAXW);   // wrist ≤ 80°
    const old = MG.figure(5.2 * Math.pow(sz / 33, .5)); MG.boil(t);
    const sleeveKey = S.outer && S.outer.kind !== 'vest' ? 'outer' : 'shirt', roll = S.shirt.roll && sleeveKey === 'shirt';
    const ux = Math.cos(fa), uy = Math.sin(fa), lx = -uy * sz * .08, ly = ux * sz * .08;
    const tube = (pts, ws) => MG.tube(pts, ws.map(w => w * sz));
    const lp = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
    const upper = tube([sh, lp(sh, el, .5), el], [.6, .56, .5]);
    const rollAt = lp(el, wr, .3), fore = roll ? tube([rollAt, lp(rollAt, wr, .5), wr], [.44, .4, .35]) : tube([el, lp(el, wr, .5), wr], [.5, .45, .4]);
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.halo) {   // a paper outline round the sleeve so a black sleeve reads on a black panel
      ctx.save(); ctx.strokeStyle = PAP(); ctx.fillStyle = PAP(); ctx.lineJoin = 'round'; ctx.lineWidth = (o.halo + MG.lwScreen() * .45) * 2;
      const bk = k => [wr[0] - ux * sz * k, wr[1] - uy * sz * k], outer = sleeveKey === 'outer' ? tube([el, bk(1.45)], [.5, .5]) : null;
      for (const p of [upper, roll ? tube([el, rollAt], [.5, .48]) : null, outer || fore]) if (p) { const q = MG.pathOf(p, true, true); ctx.stroke(q); ctx.fill(q); } ctx.restore();
    }
    const sp = paintOf(S, sleeveKey, lx, ly);
    if (roll) {
      MG.ink(ctx, tube([sh, el, rollAt], [.6, .5, .48]), Object.assign({ lw: 1 }, sp));
      MG.ink(ctx, fore, Object.assign({ lw: 1 }, paintOf(S, 'skin', 0, 0)));
      const a = lp(el, wr, .22), b = lp(el, wr, .36);   // the rolled cuff band
      MG.ink(ctx, tube([a, b], [.56, .54]), Object.assign({ lw: .9 }, paintOf(S, 'shirt', lx, ly)));
    } else {
      const back = k => [wr[0] - ux * sz * k, wr[1] - uy * sz * k];
      MG.ink(ctx, upper, Object.assign({ lw: 1 }, sp));
      if (sleeveKey === 'outer') {   // blazer sleeve ends short of the wrist: hoodie cuff peeking out, then bare wrist (+ 최주임's wristband)
        MG.ink(ctx, tube([back(.9), back(.05)], [.36, .34]), Object.assign({ lw: 1 }, paintOf(S, 'skin', 0, 0)));
        MG.ink(ctx, tube([el, lp(el, back(1.2), .5), back(1.2)], [.5, .47, .45]), Object.assign({ lw: 1 }, sp));
        MG.ink(ctx, tube([back(1.28), back(.86)], [.42, .4]), Object.assign({ lw: .9 }, paintOf(S, 'shirt', lx, ly)));
        MG.ink(ctx, tube([back(1.45), back(1.1)], [.5, .49]), Object.assign({ lw: .9 }, sp));
        if (S.band) MG.ink(ctx, tube([back(.62), back(.3)], [.4, .39]), Object.assign({ lw: .9 }, paintOf(S, 'band', lx, ly)));
      } else {
        MG.ink(ctx, fore, Object.assign({ lw: 1 }, sp));
        MG.ink(ctx, tube([back(.7), back(.16)], [.47, .45]), Object.assign({ lw: .9 }, sp));   // shirt cuff
      }
    }
    const H = C.drawHand(ctx, pose, wr[0], wr[1], ang, sz, o.flip ?? 1, S, {});
    ctx.restore(); MG.figure(old);
    return Object.assign(H, { elbow: el, wrist: wr, reach: sol.reach, ang });
  };

  E.flame = function (ctx, t, o) {
    const k = clamp(o.k ?? 1); if (k <= 0) return; const r = rng(o.seed ?? 3), n = o.n || 7, w = o.w, h = o.h * (.35 + .65 * eo(k)), x0 = o.x - w / 2, yb = o.y;
    const tips = []; for (let i = 0; i < n; i++) { const u = (i + .5) / n, edge = Math.sin(Math.PI * u);
      tips.push({ u, h: h * (.45 + .55 * edge) * (.75 + .35 * r()) * (1 + .1 * Math.sin(t * 7 + i * 2.1)), sway: (r() - .5) * .5 + .35 * Math.sin(t * 4.3 + i * 1.7), ph: r() }); }
    const p = new Path2D(), vy = u => yb - h * (.28 + .22 * Math.sin(Math.PI * u));
    p.moveTo(x0, yb + 400); p.lineTo(x0, vy(0));
    for (let i = 0; i < n; i++) { const T = tips[i], tw = w / n, tx = x0 + T.u * w + T.sway * tw * .7, ty = yb - T.h, va = x0 + i * tw, vb = va + tw;
      p.quadraticCurveTo(va + tw * .1, ty + (vy(i / n) - ty) * .5, tx, ty); p.quadraticCurveTo(vb - tw * .05 + T.sway * tw * .3, ty + (vy((i + 1) / n) - ty) * .55, vb, vy((i + 1) / n)); }
    p.lineTo(x0 + w, yb + 400); p.closePath();
    ctx.save();
    if (o.edge) { ctx.strokeStyle = PAP(); ctx.lineWidth = 10; ctx.lineJoin = 'round'; ctx.stroke(p); }
    ctx.fillStyle = INK(); ctx.fill(p);
    if (o.licks !== false) { ctx.save(); ctx.clip(p); const old = MG.figure(5); MG.boil(t);
      for (let i = 0; i < n; i++) { const T = tips[i], tw = w / n, tx = x0 + T.u * w + T.sway * tw * .7, u = (t * .9 + T.ph) % 1;
        const y0 = yb - T.h * (.15 + .5 * u), pts = [[tx + Math.sin(i + t * 3) * 12, y0 + T.h * .35], [tx + T.sway * 20, y0 + T.h * .12], [tx + T.sway * 30, y0]];
        MG.taper(ctx, pts, .2, 1.2, { col: PAPL() }); }
      MG.figure(old); ctx.restore(); }
    ctx.restore();
  };
  E.rumble = function (ctx, t, o) {
    const lines = o.lines || 1;
    for (let i = 0; i < lines; i++) { const at = (o.at || 0) + i * .25; if (t < at) continue; const [jx, jy] = WT.tremble(t, o.tremble ?? 3, 12, i * 7 + (o.seed || 0));
      MG.sfx(ctx, t, Object.assign({ gap: -.04, rot: .06 }, o, { x: o.x + i * (o.dx ?? 60) + jx, y: o.y + i * (o.dy ?? 110) + jy, at, seed: (o.seed || 5) + i })); }
  };

  E.menace = function (ctx, G, k = 1) {
    if (k <= 0) return; const h = G.head, r = h.r, ey = G.eyes ? Math.max(G.eyes[0][1], G.eyes[1][1]) : h.y;
    ctx.save(); ctx.beginPath(); ctx.ellipse(h.x, h.y - r * .1, r * .97, r * 1.12, h.tilt || 0, 0, TAU); ctx.clip();   // inside the face outline only
    const yb = ey + r * .12, p = new Path2D(); p.moveTo(h.x - r * 2, h.y - r * 2.5); p.lineTo(h.x + r * 2, h.y - r * 2.5); p.lineTo(h.x + r * 2, yb - r * .05);
    for (let i = 8; i >= 0; i--) p.lineTo(h.x - r * 2 + i * r * .5, yb + (i % 2 ? r * .06 : -r * .04));
    p.closePath(); ctx.fillStyle = MG.tone(ctx, .55 * k); ctx.fill(p); ctx.restore();
  };

  E.drop = function (ctx, t, x, y, r, at, o = {}) {
    if (t < at) return; const u = t - at, sc = WT.pop(t, at, .25, .3, 2.4), sl = (o.slide ?? .6) * r * eo(clamp((u - .3) / 1.2));
    ctx.save(); ctx.translate(x, y + sl); ctx.rotate(o.ang || 0); ctx.scale(sc, sc);
    const p = new Path2D(); p.moveTo(0, -r * 1.25); p.bezierCurveTo(r * .35, -r * .55, r * .78, -r * .1, r * .72, r * .3); p.bezierCurveTo(r * .66, r * .78, -r * .66, r * .78, -r * .72, r * .3);
    p.bezierCurveTo(-r * .78, -r * .1, -r * .35, -r * .55, 0, -r * 1.25); p.closePath();
    ctx.lineJoin = 'round'; ctx.strokeStyle = INK(); ctx.lineWidth = Math.max(4, r * .16); ctx.stroke(p); ctx.fillStyle = PAPL(); ctx.fill(p);
    ctx.fillStyle = INK(); ctx.beginPath(); ctx.ellipse(-r * .28, r * .12, r * .1, r * .24, .3, 0, TAU); ctx.fill();
    ctx.restore();
  };
  E.spark = function (ctx, t, x, y, r, at = -1e9) {
    const k = t < at ? 0 : WT.popPeak(clamp((t - at) / .3)); if (k <= 0) return; const R = r * k;
    const star = (rr, w) => { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, d = i % 2 ? rr * w : rr; ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); } ctx.closePath(); };
    ctx.save(); ctx.lineJoin = 'round'; star(R, .22); ctx.strokeStyle = INK(); ctx.lineWidth = Math.max(3, R * .16); ctx.stroke(); ctx.fillStyle = PAPL(); ctx.fill(); ctx.restore();
  };

  E.shards = function (ctx, t, x, y, ang, at, o = {}) {
    if (t < at) return; const u = t - at, r = WT.rnd(o.seed || 5), n = o.n || 6, sz = o.size || 26;
    ctx.save(); ctx.globalAlpha *= 1 - ss(.6, 1.2, u);
    for (let i = 0; i < n; i++) { const a = ang + (r() - .5) * 2.2, v = (180 + r() * 380) * (o.k || 1), d = v * eo(clamp(u / .9)), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d + 300 * u * u, rot = r() * TAU + u * (r() - .5) * 8, w = sz * (.5 + r());
      ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.fillStyle = PAPL(); ctx.strokeStyle = INK(); ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-w, -w * .2); ctx.lineTo(w * .7, -w * .4); ctx.lineTo(w * .2, w * .5); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore(); }
    ctx.restore();
  };
  E.streaks = function (ctx, t, x, y, ang, o = {}) {
    const r = rng(o.seed || 9), n = o.n || 5, len = o.len || 260, spread = o.spread || 120, wMax = o.w || 12, c = Math.cos(ang), s = Math.sin(ang);
    ctx.save(); ctx.fillStyle = o.col || INK(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    for (let i = 0; i < n; i++) { const off = (r() - .5) * 2 * spread, L = len * (.5 + r() * .7), b0 = len * .15 * r() + ((t * 900 + r() * 400) % 120);
      const a = [x - c * b0 - s * off, y - s * b0 + c * off], b = [a[0] - c * L, a[1] - s * L], ww = wMax * (.4 + r() * .8);
      ctx.beginPath(); ctx.moveTo(a[0] - s * ww / 2, a[1] + c * ww / 2); ctx.lineTo(a[0] + s * ww / 2, a[1] - c * ww / 2); ctx.lineTo(b[0], b[1]); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  };

  E.eyeBand = function (ctx, t, who, x, y, w, h, s, o = {}) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (o.bg) { ctx.fillStyle = o.bg; ctx.fillRect(x, y, w, h); }
    const G = C.face(ctx, t, who, x + w / 2 + (o.dx || 0), y + h / 2 + (o.dy ?? s * 18), s, Object.assign({ sway: false }, o.face || {}));
    ctx.restore(); return G;
  };

  window.EP2 = E;
})();

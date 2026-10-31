/* ep2-standoff-fx.js — scene-2 helpers the kit / cast do not have yet (candidates to move into kit-webtoon.js / donut-cast.js).
   Global: window.EP2. Load after lib.js, kit-webtoon.js, donut-cast.js.
     EP2.camera(S, stops)            a Webtoon.camera from [panelId | {at}|{y}, arrive, leave] triples (glide = gap between leave and arrive)
     EP2.arm(ctx, who, pose, wrist, ang, sz, o)   a big close-up hand + a sleeve that runs back o.reach palm-lengths (off-panel arms that
                                     break the border). 박대리's rolled sleeve gets the upper shirt sleeve behind the roll. o { flip, reach, ghost }
     EP2.menace(ctx, G, k)           the manga "shadowed brow" — a violet multiply gradient over the top of a head (G from the rig), k 0…1
     EP2.drop(ctx, t, x, y, r, at, o) a big gag sweat drop that pops and slides (no head needed) — o { ang, slide, col }
     EP2.shards(ctx, t, x, y, ang, at, o) border fragments where something bursts through a panel edge
     EP2.eyeBand(ctx, t, who, x, y, w, h, s, o)  a clipped close-up strip of one face (eyes only) for the three-eye call-back */
(function () {
  const WT = window.Webtoon, C = window.Cast, { clamp, lerp, ss, eo } = Pilot, TAU = Math.PI * 2, E = {};

  E.camera = function (S, stops, o = {}) {
    const list = []; let prevLeave = null;
    for (const [k, a, l] of stops) {
      const st = typeof k === 'string' ? { panel: k } : Object.assign({}, k);
      if (prevLeave != null) st.glide = Math.max(0, a - prevLeave);
      st.hold = Math.max(0, l - a); list.push(st); prevLeave = l;
    }
    return WT.camera(S, list, Object.assign({ t0: stops[0][1] }, o));
  };

  E.arm = function (ctx, who, pose, wrist, ang, sz, o = {}) {
    const S = C.SPEC[who], P = WT.Rig.palOf(S, {}), c = Math.cos(ang), s = Math.sin(ang), [x, y] = wrist, reach = o.reach || 9;
    const back = k => [x - c * sz * k, y - s * sz * k], lw = sz * .085;
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    let len = reach;
    if (S.shirt.roll && !S.outer) {   // rolled sleeve: shirt sleeve from the roll back to the shoulder, skin forearm in front
      const sl = WT.capsule(back(reach), back(3.1), sz * .56, sz * .5); WT.inked(ctx, sl, P.shirt, lw, P.line); WT.cel(ctx, sl, P.shirt, WT.shadeOf(P.shirt), sz * .12 * s, -sz * .12 * c);
      len = 3.2;
    }
    const H = C.hand(ctx, who, pose, x, y, ang, sz, { flip: o.flip ?? 1, len });
    ctx.restore();
    return H;
  };

  E.menace = function (ctx, G, k = 1, col = '#2b1840') {
    if (k <= 0) return; const h = G.head, r = h.r;
    ctx.save(); ctx.beginPath(); ctx.ellipse(h.x, h.y - r * .1, r * 1.25, r * 1.45, h.tilt || 0, 0, TAU); ctx.clip();
    const g = ctx.createLinearGradient(0, h.y - r * 1.6, 0, h.y + r * .35); g.addColorStop(0, WT.rgba(col, .78 * k)); g.addColorStop(.55, WT.rgba(col, .5 * k)); g.addColorStop(1, WT.rgba(col, 0));
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(h.x - r * 2, h.y - r * 2, r * 4, r * 3); ctx.restore();
  };

  E.drop = function (ctx, t, x, y, r, at, o = {}) {
    if (t < at) return; const u = t - at, sc = WT.pop(t, at, .25, .3, 2.4), sl = (o.slide ?? .6) * r * eo(clamp((u - .3) / 1.2));
    ctx.save(); ctx.translate(x, y + sl); ctx.rotate(o.ang || 0); ctx.scale(sc, sc);
    const p = new Path2D(); p.moveTo(0, -r * 1.25); p.bezierCurveTo(r * .35, -r * .55, r * .78, -r * .1, r * .72, r * .3); p.bezierCurveTo(r * .66, r * .78, -r * .66, r * .78, -r * .72, r * .3);
    p.bezierCurveTo(-r * .78, -r * .1, -r * .35, -r * .55, 0, -r * 1.25); p.closePath();
    WT.inked(ctx, p, o.col || WT.C.sweat, Math.max(2.5, r * .09), WT.C.ink);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(-r * .3, r * .1, r * .12, r * .26, .3, 0, TAU); ctx.fill();
    ctx.restore();
  };

  E.shards = function (ctx, t, x, y, ang, at, o = {}) {
    if (t < at) return; const u = t - at, r = WT.rnd(o.seed || 5), n = o.n || 6, col = o.col || '#ffffff', sz = o.size || 26;
    ctx.save(); ctx.globalAlpha *= 1 - ss(.6, 1.4, u);
    for (let i = 0; i < n; i++) { const a = ang + (r() - .5) * 2.2, v = (180 + r() * 380) * (o.k || 1), d = v * eo(clamp(u / .9)), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d + 300 * u * u, rot = r() * TAU + u * (r() - .5) * 8, w = sz * (.5 + r());
      ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.fillStyle = col; ctx.strokeStyle = WT.C.black; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-w, -w * .2); ctx.lineTo(w * .7, -w * .4); ctx.lineTo(w * .2, w * .5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
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

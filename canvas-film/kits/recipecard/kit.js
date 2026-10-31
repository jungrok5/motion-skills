/* kit-recipecard.js — the recipe explainer card, as a reusable canvas-film style.  Global: window.RecipeCard
   Borrowed craft (own renderer): prompt-motion.com/ror-fly-9950f1 "Negroni recipe animation" by @ror_fly (cream paper,
   one vessel dead-centre with measurement ticks, a "STEP n OF N" card with a big amount + ingredient name, a progress
   rail of numbered dots, bottles that tip and pour) and prompt-motion.com/sarut0bisasuke-cefa43 "White Russian recipe
   animation" by @sarut0bisasuke (script subtitle, an ingredient checklist that ticks off).
   Warm cream paper with a faint tooth, thin hand-wobbled ink lines (static per shape, never boiling), soft flat fills,
   ONE accent for the hero contents (and the marks that count them), chunky Do Hyeon type with an ink extrusion.
   Things enter from above and pour/drop with a small settle; cards swap with a crisp slide; nothing glows.
   Load after lib.js and story.js:  <script src="lib.js"></script><script src="story.js"></script><script src="kit-recipecard.js"></script>
   Design space is the portrait frame 1080×1920 (RecipeCard.W × .H); in landscape RecipeCard.begin pillarboxes it.
   Pure and deterministic: the only state is the paper sheet built by init; seeded noise only. */
(function () {
  const { clamp, lerp, ss, eo, rng, noise, fbm, canvas } = Pilot;
  const K = {};
  K.W = 1080; K.H = 1920;
  const TAU = Math.PI * 2;

  // ---------------- palette & type ----------------
  // Ink and cream do all the work; the accent is for the hero contents (and the marks that count them: amounts, rail,
  // bars, ticks that are "on"). Light ingredient colours (flour, water, oil, a leaf) are muted and small.
  K.C = {
    paper: '#f6efe2',    // the ground: warm cream paper (tooth added in init)
    card: '#fffaf1',     // step card, phone screen, plate
    ink: '#3a2a2a',      // every line and the body type (a warm brown-black)
    soft: '#8b7a70',     // notes, tick labels, pending rail labels
    faint: '#d9ccb8',    // empty rail line, pending dots, guides
    wash: '#ece3d3',     // soft fill of a pot / pan / bucket
    glass: 'rgba(214,226,226,.45)',   // a clear vessel's tint (contents show through)
    inner: 'rgba(58,42,42,.06)',      // the inside of a rim (a vessel's opening)
    shade: 'rgba(58,42,42,.10)',      // the flat contact shadow under a vessel
    water: '#d7e6e6',    // water / clear liquid
    flour: '#fbf7ee',    // flour, sugar, salt (with an ink edge)
    oil: '#d9a542',      // a thin oil stream (small; never a second accent)
    leaf: '#9bb07a',     // a green ingredient (spring onion, a leaf) — muted, small
    flame: '#f7dcae',    // a burner flame's fill (with an ink outline)
  };
  K.ACCENT = '#d9432b';  // THE accent — the hero contents (change with init({ accent }))
  K.DEEP = '#a8261b';    // the accent fully cooked / reduced (deep sauce)
  K.MARK = K.ACCENT;     // UI marks: big amounts, the rail, bars, ticks that are on (init({ mark: K.C.ink }) to keep UI ink-only)
  K.PALE = '#f1c8bc';    // the card's hard offset shadow (accent mixed into paper)
  K.DISPLAY = "'Do Hyeon',sans-serif";       // chunky title / amounts / names
  K.SANS = "'Noto Sans KR',sans-serif";      // notes, labels, chat
  K.SERIF = "'Noto Serif KR',serif";
  K.HAND = "'Noto Serif KR',serif";          // the small "script" subtitle face (init({ hand }) for a handwriting face)
  K.HANDW = 600;                             // its weight
  // pass to Pilot.run({ fonts: RecipeCard.FONTS }) so every face is loaded before the first frame
  K.FONTS = [`400 60px ${K.DISPLAY}`, `400 30px ${K.SANS}`, `500 30px ${K.SANS}`, `700 30px ${K.SANS}`, `600 40px ${K.SERIF}`];

  // ---------------- setup ----------------
  let paper = null;
  // init({ accent, deep, mark, pale, hand, handWeight, paperSeed = 7 }): builds the cream paper sheet (full res, ~120 ms):
  // low-frequency mottling + a fine tooth + faint fibres. Call once from Pilot.run({ init }).
  K.init = function (o = {}) {
    if (o.accent) { K.ACCENT = o.accent; K.PALE = Pilot.rgb(Pilot.mix(Pilot.hex(o.accent), Pilot.hex(K.C.paper), .7)); }
    if (o.deep) K.DEEP = o.deep;
    K.MARK = o.mark || K.ACCENT;
    if (o.pale) K.PALE = o.pale;
    if (o.hand) K.HAND = o.hand; if (o.handWeight) K.HANDW = o.handWeight;
    if (o.hand) K.FONTS = K.FONTS.concat([`${K.HANDW} 40px ${K.HAND}`]);
    const seed = o.paperSeed ?? 7, W = K.W, H = K.H;
    const lw = 135, lh = 240, low = canvas(lw, lh), lx = low.getContext('2d'), ld = lx.createImageData(lw, lh);
    for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) {   // mottling, ±5 levels
      const v = 128 + (fbm(i * .045 + seed, j * .045, 3) - .5) * 16, p = (j * lw + i) * 4;
      ld.data[p] = ld.data[p + 1] = ld.data[p + 2] = v; ld.data[p + 3] = 255;
    }
    lx.putImageData(ld, 0, 0);
    paper = canvas(W, H); const x = paper.getContext('2d');
    x.imageSmoothingEnabled = true; x.drawImage(low, 0, 0, W, H);
    const m = x.getImageData(0, 0, W, H), d = m.data, r = rng(seed * 97 + 3), base = Pilot.hex(K.C.paper);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const p = (j * W + i) * 4, mott = d[p] - 128;
      const tooth = (r() - .5) * 7 + (r() < .004 ? -10 : 0);                  // fine tooth + rare darker pits
      const fib = ((i * 7 + j * 3) % 97 === 0 && r() < .25) ? -4 : 0;         // a few faint fibres
      const v = mott + tooth + fib;
      d[p] = base[0] + v; d[p + 1] = base[1] + v; d[p + 2] = base[2] + v * 1.1; d[p + 3] = 255;
    }
    x.putImageData(m, 0, 0);
  };

  // rgbOf(color) → [r, g, b] of a '#rrggbb' or 'rgb(a)(…)' string (to mix colours with Pilot.mix).
  K.rgbOf = col => col[0] === '#' ? Pilot.hex(col) : (String(col).match(/[\d.]+/g) || [128, 128, 128]).slice(0, 3).map(Number);

  // ---------------- timing ----------------
  // k(t, at, dur): linear 0..1 progress of a move that starts at `at` and lasts `dur` s.
  K.k = (t, at, dur) => clamp((t - at) / dur);
  // eo4(x): quartic ease-out — the crisp landing of a card or a sliding vessel.
  K.eo4 = x => { x = clamp(x); return 1 - Math.pow(1 - x, 4); };
  // spring(x, s = 1.1): ease-out with ONE tiny overshoot (~4 % for s 1.1) — the house pop. Never a cartoon bounce.
  K.spring = (x, s = 1.1) => { x = clamp(x); const u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u; };
  // fall(t, at, y0, y1, dur = .32) → { y, k, landed, sq } — something dropped from y0 lands at y1 under gravity, then
  // settles with one small dip (sq: 0..1 squash amount right after landing). Before `at`: k = 0, y = y0.
  K.fall = function (t, at, y0, y1, dur = .32) {
    const k = clamp((t - at) / dur);
    if (k < 1) return { y: lerp(y0, y1, k * k), k, landed: false, sq: 0 };
    const s = clamp((t - at - dur) / .22), dip = Math.sin(s * Math.PI) * (1 - s) * 7;
    return { y: y1 + dip, k: 1, landed: true, sq: Math.sin(s * Math.PI) * (1 - s * .6) };
  };

  // ---------------- hand-wobbled ink ----------------
  // wob(pts, { amp = 1.1, seed = 1, step = 9, closed }) → a resampled point list pushed along its normal by smooth noise of
  // the distance along the path: the slightly uneven pen line. Same seed + same local shape = same line, so draw moving
  // things in local coordinates and translate/rotate the context (the line never crawls).
  K.wob = function (pts, o = {}) {
    const amp = o.amp ?? 1.1, seed = o.seed ?? 1, step = o.step ?? 9, P = o.closed ? pts.concat([pts[0]]) : pts, out = [];
    let d = 0;
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      if (len < 1e-6) continue;
      const nx = -dy / len, ny = dx / len, m = Math.max(1, Math.ceil(len / step));
      for (let j = 0; j < m; j++) {
        const s = j / m, dd = d + s * len;
        const e = amp * ((noise(dd * .017 + seed * 3.7, seed * 1.31) - .5) * 2 + (noise(dd * .08 + 9, seed + 5.5) - .5) * .7);
        out.push([a[0] + dx * s + nx * e, a[1] + dy * s + ny * e]);
      }
      d += len;
    }
    if (!o.closed && P.length) { const l = P[P.length - 1]; out.push([l[0], l[1]]); }
    return out;
  };
  // path(c, pts, closed): beginPath + the polyline (closePath if closed). Follow with fill/stroke/clip.
  K.path = function (c, pts, closed) { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); if (closed) c.closePath(); };
  // ink(c, pts, { w = 3, color = ink, fill, closed, amp, seed, step, wob = true }): fill (optional) then stroke a shape
  // with the wobbled pen line, round joins and caps. The workhorse for every outline in the kit.
  K.ink = function (c, pts, o = {}) {
    const q = o.wob === false ? pts : K.wob(pts, o);
    K.path(c, q, o.closed);
    if (o.fill) { c.fillStyle = o.fill; c.fill(); }
    if (o.w !== 0) { c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = o.w ?? 3; c.strokeStyle = o.color || K.C.ink; c.stroke(); }
  };
  // line(c, x0, y0, x1, y1, o): one wobbled pen stroke (o as ink()).
  K.line = (c, x0, y0, x1, y1, o = {}) => K.ink(c, [[x0, y0], [x1, y1]], o);
  // ell(cx, cy, rx, ry, a0 = 0, a1 = 2π, n = 48) → points on an ellipse arc (y down: a0 = 0 is the right end, π/2 the bottom).
  K.ell = function (cx, cy, rx, ry, a0 = 0, a1 = TAU, n = 48) {
    const out = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return out;
  };
  // rrect(x, y, w, h, r) → points of a rounded rectangle (closed shape; pass closed: true to ink()).
  K.rrect = function (x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); const out = [], arc = (cx, cy, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + i / 6 * Math.PI / 2; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
    arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI);
    return out;
  };
  // shadow(c, x, y, rx, ry = rx * .14): the flat contact shadow under a vessel or plate (a soft ink-tinted ellipse, no blur).
  K.shadow = function (c, x, y, rx, ry) { c.fillStyle = K.C.shade; c.beginPath(); c.ellipse(x, y, rx, ry ?? rx * .14, 0, 0, TAU); c.fill(); };

  // ---------------- words ----------------
  // say(c, s, x, y, { font = SANS, size = 30, weight = 500, color = ink, align = 'center', ls, alpha, maxW, raw }) → width.
  // One line of type through Pilot.tr (raw: true skips the lookup — for strings already translated, e.g. Pilot.trn).
  // Shrinks to maxW.
  K.say = function (c, s, x, y, o = {}) {
    if (s == null || s === '') return 0;
    s = o.raw ? String(s) : Pilot.tr(s);
    let size = o.size || 30; const f = o.font || K.SANS, wt = o.weight ?? 500;
    c.save(); c.font = `${wt} ${size}px ${f}`; c.letterSpacing = (o.ls || 0) + 'px';
    let w = c.measureText(s).width;
    if (o.maxW && w > o.maxW) { size *= o.maxW / w; c.font = `${wt} ${size}px ${f}`; w = c.measureText(s).width; }
    c.textAlign = o.align || 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = o.color || K.C.ink;
    if (o.alpha != null) c.globalAlpha *= clamp(o.alpha);
    c.fillText(s, x, y); c.restore(); return w;
  };
  // wordmark(c, s, x, y, { size = 128, fill = MARK, depth, k = 1, align = 'center', ls, raw }): the chunky title — Do Hyeon
  // with an ink extrusion down-right, an ink outline and the accent face. k 0..1 pops it in (scale .86 → 1 with the house
  // spring). '\n' makes a second line.
  K.wordmark = function (c, s, x, y, o = {}) {
    const k = o.k ?? 1; if (k <= 0) return;
    const size = o.size || 128, depth = o.depth ?? Math.max(2, Math.round(size * .055)), lines = (o.raw ? String(s) : Pilot.tr(s)).split('\n');
    c.save(); c.translate(x, y); const sc = lerp(.86, 1, K.spring(k)); c.scale(sc, sc); c.globalAlpha *= clamp(k * 4);
    c.font = `400 ${size}px ${K.DISPLAY}`; c.textAlign = o.align || 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
    c.letterSpacing = (o.ls ?? 0) + 'px';
    lines.forEach((l, i) => {
      const ly = i * size * 1.02;
      c.fillStyle = K.C.ink; c.strokeStyle = K.C.ink; c.lineWidth = size * .075;
      for (let d = depth; d >= 1; d--) { c.strokeText(l, d * .75, ly + d); c.fillText(l, d * .75, ly + d); }
      c.strokeText(l, 0, ly); c.fillStyle = o.fill || K.MARK; c.fillText(l, 0, ly);
    });
    c.restore();
  };
  // subtitle(c, s, x, y, { size = 38, color = soft, k = 1, rule = true }): the small script line under the title, with a
  // short pen rule each side that draws on with k.
  K.subtitle = function (c, s, x, y, o = {}) {
    const k = o.k ?? 1; if (k <= 0) return;
    const w = K.say(c, s, x, y, { font: K.HAND, weight: K.HANDW, size: o.size || 38, color: o.color || K.C.soft, alpha: clamp(k * 2) });
    if (o.rule !== false) {
      const L = 46 * K.eo4(k), g = 22;
      K.line(c, x - w / 2 - g, y - 12, x - w / 2 - g - L, y - 12, { w: 2.5, color: K.C.soft, seed: 41, amp: .6 });
      K.line(c, x + w / 2 + g, y - 12, x + w / 2 + g + L, y - 12, { w: 2.5, color: K.C.soft, seed: 42, amp: .6 });
    }
  };
  // captions(ctx, t, lines, { y = 420, size = 42, color = ink, font = HAND }): SCRIPT.lines in the quiet subtitle face,
  // fading in .35 s / out .45 s, centred at y (≤ 2 lines; keep them out of the vessel band and the bottom 380 px).
  K.captions = function (ctx, t, lines, o = {}) {
    for (const [a, b, s] of lines) {
      const al = Pilot.win(t, a, b, .35, .45); if (al <= 0) continue;
      const ls = Pilot.tr(s).split('\n'), size = o.size || 42;
      ls.forEach((l, i) => K.say(ctx, l, K.W / 2, (o.y || 420) + i * size * 1.4, { raw: true, font: o.font || K.HAND, weight: K.HANDW, size, color: o.color || K.C.ink, alpha: al, maxW: 860 }));
    }
  };

  // ---------------- the hero vessel ----------------
  // vessel({ kind, x, y, w, h, ry, clear, handle, fill, seed }) → V, one vessel seen slightly from above. (x, y) is the
  // centre of the rim ellipse, w its width, h the depth to the bottom. kinds:
  //   'bowl'  round-bellied mixing bowl on a little foot      'pot'   straight-sided pot with two loop handles
  //   'pan'   shallow flared frying pan + long handle (handle: -1 left / +1 right)   'glass' tapered tumbler / jug
  //   'planter' tapered flowerpot with a rim band             'plate' a wide shallow plate (h small)
  // clear (default: true except pan/plate) = the contents show through the walls (the explainer look).
  // Draw order: V.back(c) → contents inside c.save(); V.clip(c); …; c.restore() → V.front(c, { ticks, guide }).
  // V.levelY(f) → screen y of the fill level f (0 bottom … 1 rim); V.halfW(y) → the inner half-width at row y;
  // V.liquid(c, f, color, o) fills to level f (call inside the clip). Move a vessel by translating the context.
  const PROF = {   // [half-width / rx, depth / h] from the rim down
    bowl: (() => { const o = []; for (let i = 0; i <= 12; i++) { const u = i / 12, a = 1 - u; o.push([a * a * a * 1 + 3 * a * a * u * 1 + 3 * a * u * u * .74 + u * u * u * .42, 3 * a * u * u * 1 + 3 * a * a * u * .62 + u * u * u]); } return o; })(),
    pot: [[1, 0], [1, .9], [.985, 1]],
    pan: [[1, 0], [.84, 1]],
    glass: [[1, 0], [.8, 1]],
    planter: [[1, 0], [1, .14], [.95, .14], [.74, 1]],
    plate: [[1, 0], [.86, .55], [.6, 1]],
  };
  K.vessel = function (o = {}) {
    const kind = o.kind || 'bowl', V = { kind, x: o.x ?? 540, y: o.y ?? 760, w: o.w ?? 520, h: o.h ?? 300, seed: o.seed ?? 31 };
    const rx = V.w / 2, ry = o.ry ?? rx * (kind === 'plate' ? .32 : kind === 'pan' ? .3 : .2), prof = PROF[kind] || PROF.bowl;
    V.rx = rx; V.ry = ry; V.clear = o.clear ?? !(kind === 'pan' || kind === 'plate'); V.handle = o.handle ?? -1;
    V.bottomY = V.y + V.h;
    V.halfW = yy => {
      const u = clamp((yy - V.y) / V.h);
      for (let i = 1; i < prof.length; i++) if (u <= prof[i][1] + 1e-9) { const a = prof[i - 1], b = prof[i], f = (u - a[1]) / Math.max(1e-6, b[1] - a[1]); return rx * lerp(a[0], b[0], f); }
      return rx * prof[prof.length - 1][0];
    };
    V.levelY = f => V.y + V.h * (1 - clamp(f));
    const hb = prof[prof.length - 1][0];
    // silhouette (local, rim centre at 0,0): back rim arc → right wall → bottom front arc → left wall
    const sil = K.ell(0, 0, rx, ry, Math.PI, TAU, 40)
      .concat(prof.slice(1).map(([a, u]) => [rx * a, V.h * u]))
      .concat(K.ell(0, V.h, rx * hb, ry * hb, 0, Math.PI, 28))
      .concat(prof.slice(1).reverse().map(([a, u]) => [-rx * a, V.h * u]));
    V.sil = sil;
    // back(c): the contact shadow, any handle behind, the body's soft fill and the inside of the rim
    V.back = function (c) {
      c.save(); c.translate(V.x, V.y);
      K.shadow(c, 0, V.h + (kind === 'bowl' ? 22 : 6), rx * (kind === 'plate' ? 1.02 : .9), ry * .55);
      if (kind === 'bowl') K.ink(c, K.rrect(-rx * .3, V.h - 4, rx * .6, 24, 8), { closed: true, fill: o.fill || K.C.wash, w: 3, seed: V.seed + 9 });
      K.path(c, sil, true); c.fillStyle = V.clear ? K.C.glass : (o.fill || K.C.wash); c.fill();
      if (!V.clear) { c.beginPath(); c.ellipse(0, 0, rx * .96, ry * .9, 0, 0, TAU); c.fillStyle = K.C.inner; c.fill(); }
      c.restore();
    };
    // clip(c, { top }): clip to what can be seen of the contents (clear: the whole silhouette; opaque: the opening + the
    // space above the rim up to screen row `top`, default the frame top — set it under the rail so drops enter from there)
    V.clip = function (c, co = {}) {
      c.beginPath();
      if (V.clear) { const q = sil.map(([x, y]) => [x + V.x, y + V.y]); q.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); }
      else { const top = co.top ?? V.y - 2000; c.ellipse(V.x, V.y, rx * .97, ry * .93, 0, 0, TAU); c.rect(V.x - rx * 1.6, top, rx * 3.2, V.y - top); }
      c.clip();
    };
    // band(c, top, bottom = K.H): clip to the picture band between two screen rows — things dropped "from above" enter
    // through its top edge instead of crossing the title and the rail. Wrap in save/restore.
    V.band = function (c, top, bottom = K.H) { c.beginPath(); c.rect(-K.W, top, K.W * 3, bottom - top); c.clip(); };
    // liquid(c, f, color, { top, line = true }): fill the vessel up to level f (inside the clip): the body of liquid in
    // `color`, its surface ellipse in `top` (default: color lifted toward paper) with a thin ink meniscus.
    V.liquid = function (c, f, color, lo = {}) {
      if (f <= 0) return;
      const yl = V.levelY(f), hw = V.halfW(yl), rl = ry * hw / rx;
      c.fillStyle = color; c.beginPath(); c.rect(V.x - rx * 1.2, yl, rx * 2.4, V.h * 1.5 + ry); c.fill();
      c.fillStyle = lo.top || Pilot.rgb(Pilot.mix(K.rgbOf(color), Pilot.hex(K.C.paper), .22));
      c.beginPath(); c.ellipse(V.x, yl, hw, rl, 0, 0, TAU); c.fill();
      if (lo.line !== false) { c.save(); c.globalAlpha *= .55; K.ink(c, K.ell(V.x, yl, hw * .995, rl, 0, TAU, 36), { closed: true, w: 2, seed: V.seed + 3, amp: .5 }); c.restore(); }
    };
    // front(c, { ticks: [{ f, label, on }], side = +1, guide: { f, label }, shine = true }): outline, front rim, handles,
    // glass shine and the measurement ticks on its side (label in soft ink, the "on" one in MARK).
    V.front = function (c, fo = {}) {
      c.save(); c.translate(V.x, V.y);
      if (kind === 'pot') [-1, 1].forEach(sg => K.ink(c, [[sg * rx, V.h * .12], [sg * (rx + 34), V.h * .1], [sg * (rx + 40), V.h * .2], [sg * (rx + 34), V.h * .3], [sg * rx, V.h * .29]], { w: 3.5, seed: V.seed + 20 + sg }));
      if (kind === 'pan') { const s = V.handle, hy = V.h * .38;
        K.ink(c, [[s * rx * .97, hy - 9], [s * (rx + 250), hy - 44], [s * (rx + 262), hy - 30], [s * (rx + 252), hy - 18], [s * rx * .96, hy + 11]], { closed: true, fill: K.C.ink, w: 3, seed: V.seed + 22 }); }
      if (kind === 'planter') K.ink(c, [[-rx, 0], [rx, 0], [rx, V.h * .14], [-rx, V.h * .14]], { closed: true, w: 3.5, seed: V.seed + 24 });
      K.ink(c, sil, { closed: true, w: 3.5, seed: V.seed });
      K.ink(c, K.ell(0, 0, rx, ry, 0, Math.PI, 40), { w: 3.5, seed: V.seed + 1 });
      if (kind === 'plate') K.ink(c, K.ell(0, ry * .1, rx * .7, ry * .62, 0, TAU, 40), { closed: true, w: 2.5, seed: V.seed + 2, color: K.C.soft });
      if (V.clear && fo.shine !== false) {
        c.save(); c.globalAlpha *= .75;
        const y0 = V.h * .22, y1 = V.h * .62, x0 = -V.halfW(V.y + y0) * .8, x1 = -V.halfW(V.y + y1) * .8;
        K.line(c, x0, y0, x1, y1, { w: 7, color: '#ffffff', seed: V.seed + 5, amp: .5 });
        K.line(c, x0 + 22, y0 + 6, x0 + 18, y0 + 46, { w: 5, color: '#ffffff', seed: V.seed + 6, amp: .4 });
        c.restore();
      }
      if (fo.guide) {   // a dashed line across at the next target level
        const yy = V.levelY(fo.guide.f) - V.y, hw = V.halfW(V.levelY(fo.guide.f));
        c.save(); c.setLineDash([10, 9]); c.strokeStyle = K.C.soft; c.lineWidth = 2; c.globalAlpha *= .8;
        c.beginPath(); c.moveTo(-hw * .96, yy); c.lineTo(hw * .96, yy); c.stroke(); c.restore();
      }
      const side = fo.side ?? 1;
      (fo.ticks || []).forEach((tk, i) => {
        const yy = V.levelY(tk.f) - V.y, xr = side * (V.halfW(V.levelY(tk.f)) + 14), col = tk.on ? K.MARK : K.C.soft;
        K.line(c, xr, yy, xr + side * 30, yy, { w: tk.on ? 4 : 3, color: col, seed: V.seed + 40 + i, amp: .5 });
        if (tk.label) K.say(c, tk.label, xr + side * 42, yy + 9, { size: 26, weight: tk.on ? 700 : 500, color: col, align: side > 0 ? 'left' : 'right' });
      });
      c.restore();
    };
    return V;
  };
  // slideX(t, inAt, outAt, d = 1100, dur = .42) → x offset of a vessel/prop that slides in from the right at inAt (with
  // the house spring) and out to the left at outAt (eo4). Hard slides only — the kit never crossfades.
  K.slideX = function (t, inAt, outAt, d = 1100, dur = .42) {
    if (outAt != null && t >= outAt) return -d * K.eo4((t - outAt) / dur);
    return inAt == null ? 0 : d * (1 - K.spring((t - inAt) / dur, .8));
  };

  // ---------------- things that pour and drop ----------------
  // bottle(c, x, y, ang, { w = 104, h = 290, fill, glass, label, labelSize, seed }): a bottle whose spout tip is at (x, y),
  // rotated by ang about it (0 = upright, body below the spout; ~2.2 = pouring to the right, body up-left). fill = its
  // contents' colour (lower body), label = a word on a paper label that turns with the bottle.
  K.bottle = function (c, x, y, ang, o = {}) {
    const w = o.w || 104, h = o.h || 290, nw = w * .3, nl = h * .26, sh = h * .14, bl = h - nl - sh, sd = o.seed ?? 51;
    c.save(); c.translate(x, y); c.rotate(ang);
    const out = [[-nw / 2, 0], [nw / 2, 0], [nw / 2, nl], [w / 2, nl + sh], [w / 2, h - 14], [w / 2 - 14, h], [-w / 2 + 14, h], [-w / 2, h - 14], [-w / 2, nl + sh], [-nw / 2, nl]];
    K.path(c, out, true); c.fillStyle = o.glass || '#efe9dc'; c.fill();
    if (o.fill) { c.save(); K.path(c, out, true); c.clip(); c.fillStyle = o.fill; c.fillRect(-w, nl + sh * .6, 2 * w, h); c.restore(); }
    K.ink(c, out, { closed: true, w: 3.5, seed: sd });
    K.ink(c, K.rrect(-nw / 2 - 5, -4, nw + 10, 16, 4), { closed: true, fill: K.C.ink, w: 2, seed: sd + 1 });
    if (o.label) {
      const ly = nl + sh + bl * .18, lh = bl * .62;
      K.ink(c, K.rrect(-w / 2 + 12, ly, w - 24, lh, 6), { closed: true, fill: K.C.card, w: 2.5, seed: sd + 2 });
      c.save(); c.translate(0, ly + lh / 2); c.rotate(-Math.PI / 2);
      K.say(c, o.label, 0, (o.labelSize || 30) * .36, { font: K.DISPLAY, weight: 400, size: o.labelSize || 30, color: K.C.ink, maxW: lh - 16 });
      c.restore();
    }
    c.save(); c.globalAlpha *= .7; K.line(c, -w / 2 + 12, nl + sh + 10, -w / 2 + 12, nl + sh + bl * .15, { w: 5, color: '#ffffff', seed: sd + 3, amp: .3 }); c.restore();
    c.restore();
  };
  // tilt(t, at, { lift = .3, hold, back = .3, to = 2.15 }) → bottle angle: tips from upright to `to` over `lift` s from
  // `at`, holds for `hold` s (the pour), tips back over `back` s. Spring on the way in (one small overshoot).
  K.tilt = function (t, at, o = {}) {
    const lift = o.lift ?? .3, hold = o.hold ?? .8, back = o.back ?? .3, to = o.to ?? 2.15;
    if (t < at) return 0; if (t < at + lift + hold) return to * K.spring((t - at) / lift, .7);
    return to * (1 - K.eo4((t - at - lift - hold) / back));
  };
  // stream(c, x0, y0, x1, y1, { w = 10, color, head = 1, tail = 0, bow = .25, ink = true }): a falling stream from a spout
  // (x0, y0) to where it lands (x1, y1), as a slight arc (bow), drawn from the spout down to `head` (0..1) and gone above
  // `tail` (0..1) — head grows as the pour starts, tail drops as it ends. An ink edge keeps it legible on paper.
  K.stream = function (c, x0, y0, x1, y1, o = {}) {
    const head = clamp(o.head ?? 1), tail = clamp(o.tail ?? 0); if (head <= tail) return;
    const w = o.w ?? 10, bow = o.bow ?? .25, mx = lerp(x0, x1, .15) + (x1 - x0) * bow, my = lerp(y0, y1, .35);
    const P = s => [(1 - s) * (1 - s) * x0 + 2 * (1 - s) * s * mx + s * s * x1, (1 - s) * (1 - s) * y0 + 2 * (1 - s) * s * my + s * s * y1];
    const pts = []; for (let i = 0; i <= 20; i++) pts.push(P(lerp(tail, head, i / 20)));
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    if (o.ink !== false) { K.path(c, pts); c.strokeStyle = K.C.ink; c.lineWidth = w + 5; c.stroke(); }
    K.path(c, pts); c.strokeStyle = o.color || K.ACCENT; c.lineWidth = w; c.stroke(); c.restore();
  };
  // spoon(c, x, y, ang, { r = 38, len = 150, fill, full = 1, seed }): a measuring spoon (큰술) — the bowl centred on (x, y),
  // a handle `len` px long up-right; ang tips it about the bowl (negative = tips its contents out to the left; the handle
  // then rises — keep it clear of the rail). fill = what is heaped in it, full 0..1 how much is left (draw what falls
  // separately: fall() + blob()/grains()).
  K.spoon = function (c, x, y, ang, o = {}) {
    const r = o.r || 38, sd = o.seed ?? 61, L = o.len ?? 150, hx = L, hy = -L * .63;
    c.save(); c.translate(x, y); c.rotate(ang);
    K.ink(c, [[r * .8, -r * .12], [r * 1.2 + hx, -r * .12 + hy], [r * 1.2 + hx + 12, -r * .12 + hy + 11], [r * .95, r * .18]], { closed: true, fill: '#e2ddd3', w: 3, seed: sd + 1 });
    const cup = K.ell(0, 0, r, r * .62, 0, Math.PI, 24);
    K.ink(c, cup, { closed: true, fill: '#e2ddd3', w: 3.2, seed: sd });
    if (o.fill && (o.full ?? 1) > 0) {
      const f = o.full ?? 1;
      K.ink(c, K.ell(0, 1, r * .94, r * .34 + r * .3 * f, Math.PI, TAU, 20).concat([[r * .94, 1]]), { closed: true, fill: o.fill, w: 2.5, seed: sd + 2 });
    }
    K.ink(c, K.ell(0, 0, r, r * .22, 0, TAU, 28), { closed: true, w: 2.5, seed: sd + 3 });
    c.restore();
  };
  // blob(c, x, y, r, color, { seed, sq = 0 }): a dollop of paste (고추장, butter, soil) — an uneven round lump with an ink
  // edge and one paper highlight; sq squashes it on landing (from fall().sq).
  K.blob = function (c, x, y, r, color, o = {}) {
    const sd = o.seed ?? 71, sq = o.sq || 0, pts = [];
    for (let i = 0; i < 22; i++) { const a = i / 22 * TAU, rr = r * (1 + (noise(i * .7, sd) - .5) * .35); pts.push([x + Math.cos(a) * rr * (1 + sq * .35), y + Math.sin(a) * rr * (1 - sq * .3)]); }
    K.ink(c, pts, { closed: true, fill: color, w: 2.5, seed: sd });
    c.fillStyle = 'rgba(255,250,240,.55)'; c.beginPath(); c.ellipse(x - r * .3, y - r * .32, r * .26, r * .14, -.5, 0, TAU); c.fill();
  };
  // grains(c, t, { x, y0, y1, at, dur = .45, n = 24, spread = 26, size = 6, color, ink = true, seed, shape = 'sq'|'dot'|'flake' }):
  // a small column of grains poured from a spoon or bag at (x, y0) falling to the surface at y1 (salt, sugar, flour,
  // chilli flakes, seeds). Each grain leaves at its own seeded moment and vanishes as it lands.
  K.grains = function (c, t, o) {
    const r = rng(o.seed ?? 81), n = o.n ?? 24, dur = o.dur ?? .45, sp = o.spread ?? 26, sz = o.size ?? 6, fallT = .3;
    for (let i = 0; i < n; i++) {
      const d = r() * dur, dx = (r() - .5) * sp, rot = r() * TAU, s = sz * (.7 + r() * .6), dt = t - o.at - d;
      if (dt < 0 || dt > fallT) continue;
      const k = dt / fallT, x = o.x + dx * (1 + k * .8), y = lerp(o.y0, o.y1, k * k);
      c.save(); c.translate(x, y); c.rotate(rot + k * 3); c.fillStyle = o.color || K.C.flour;
      c.beginPath();
      if (o.shape === 'dot') c.arc(0, 0, s / 2, 0, TAU);
      else if (o.shape === 'flake') { c.moveTo(-s * .6, -s * .2); c.lineTo(s * .5, -s * .4); c.lineTo(s * .3, s * .4); c.closePath(); }
      else c.rect(-s / 2, -s / 2, s, s);
      c.fill(); if (o.ink !== false) { c.lineWidth = 1.6; c.strokeStyle = K.C.ink; c.stroke(); }
      c.restore();
    }
  };
  // ripple(c, x, y, rx, k): the ring a drop or stream makes on a liquid surface (k 0..1 after the impact; an ink ring that
  // widens and fades). Tied to an impact — never decoration.
  K.ripple = function (c, x, y, rx, k) {
    if (k <= 0 || k >= 1) return;
    c.save(); c.globalAlpha *= (1 - k) * .8; c.strokeStyle = K.C.ink; c.lineWidth = 2;
    c.beginPath(); c.ellipse(x, y, rx * (.35 + .9 * eo(k)), rx * .28 * (.35 + .9 * eo(k)), 0, 0, TAU); c.stroke(); c.restore();
  };
  // steam(c, x, y, t, { n = 3, spread = 70, h = 150, w = 3, speed = .55, a = .55 }): wisps of steam rising from a hot
  // surface at (x, y) — thin soft-ink S-curves that rise, sway and fade on a loop. Only over something hot.
  K.steam = function (c, x, y, t, o = {}) {
    const n = o.n ?? 3, sp = o.spread ?? 70, h = o.h ?? 150, sd = o.seed ?? 3;
    c.save(); c.lineCap = 'round'; c.strokeStyle = K.C.soft; c.lineWidth = o.w ?? 3;
    for (let i = 0; i < n; i++) {
      const ph = (t * (o.speed ?? .55) + i / n + noise(i, sd) * .3) % 1, x0 = x + (i - (n - 1) / 2) * sp / Math.max(1, n - 1) * 2;
      const al = Math.sin(ph * Math.PI) * (o.a ?? .55); if (al <= .01) continue;
      c.globalAlpha = al; c.beginPath();
      for (let j = 0; j <= 14; j++) { const u = j / 14, yy = y - (ph * .5 + u * .55) * h, xx = x0 + Math.sin(u * 5 + t * 2.2 + i * 2) * 11 * (.4 + u); j ? c.lineTo(xx, yy) : c.moveTo(xx, yy); }
      c.stroke();
    }
    c.restore();
  };
  // flames(c, x, y, w, t, { n = 7, h = 46, k = 1 }): a burner row of flames under a pot or pan — ink-outlined teardrops
  // in a pale warm fill that flicker (seeded by t); k 0..1 scales them (turn the heat up/off).
  K.flames = function (c, x, y, w, t, o = {}) {
    const n = o.n ?? 7, k = o.k ?? 1; if (k <= 0) return;
    K.ink(c, [[x - w / 2 - 20, y + 4], [x + w / 2 + 20, y + 4]], { w: 5, seed: 91 });
    for (let i = 0; i < n; i++) {
      const fx = x + (i / (n - 1) - .5) * w, hh = (o.h ?? 46) * k * (.8 + .35 * noise(t * 7 + i * 3.1, i)), ww = 13 * (.6 + .4 * k), lean = (noise(t * 5, i * 2.3) - .5) * 8;
      K.ink(c, [[fx - ww, y], [fx - ww * .8, y - hh * .45], [fx + lean, y - hh], [fx + ww * .8, y - hh * .45], [fx + ww, y]], { closed: true, fill: K.C.flame, w: 2.5, seed: 93 + i, amp: .6 });
    }
  };
  // dial(c, x, y, r, k, { label, k0 = 1 }): a kitchen timer face — ring, 12 ticks, a MARK wedge swept to fraction k and
  // a hand; label (already-translated string) in the middle. k0 0..1 pops it in.
  K.dial = function (c, x, y, r, k, o = {}) {
    const k0 = o.k0 ?? 1; if (k0 <= 0) return;
    c.save(); c.translate(x, y); c.scale(K.spring(k0), K.spring(k0));
    K.ink(c, K.ell(0, 0, r, r, 0, TAU, 40), { closed: true, fill: K.C.card, w: 3.5, seed: 101 });
    if (k > 0) { c.fillStyle = K.MARK; c.globalAlpha *= .9; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r * .84, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(k)); c.closePath(); c.fill(); c.globalAlpha = 1; }
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; K.line(c, Math.sin(a) * r * .86, -Math.cos(a) * r * .86, Math.sin(a) * r * .97, -Math.cos(a) * r * .97, { w: 2.5, wob: false }); }
    const a = TAU * clamp(k); K.line(c, 0, 0, Math.sin(a) * r * .8, -Math.cos(a) * r * .8, { w: 4, wob: false });
    K.ink(c, K.rrect(-9, -r - 16, 18, 14, 3), { closed: true, fill: K.C.ink, w: 2, wob: false });
    c.restore();
    if (o.label) K.say(c, o.label, x, y + r + 44, { raw: true, font: K.DISPLAY, weight: 400, size: 40, color: K.C.ink, alpha: k0 });
  };
  // dashes(c, x, y, r, k, { n = 7, a0 = -2.7, a1 = -.45, len = 26 }): the little "ta-da" pen dashes around something that
  // is finished (radiating over its top, a0..a1 radians); k 0..1 shoots them out and holds.
  K.dashes = function (c, x, y, r, k, o = {}) {
    if (k <= 0) return; const n = o.n ?? 7, a0 = o.a0 ?? -2.7, a1 = o.a1 ?? -.45, L = (o.len ?? 26) * K.spring(k);
    for (let i = 0; i < n; i++) { const a = lerp(a0, a1, i / (n - 1)), r0 = r + 10 * K.eo4(k); K.line(c, x + Math.cos(a) * r0, y + Math.sin(a) * r0 * .8, x + Math.cos(a) * (r0 + L), y + Math.sin(a) * (r0 + L) * .8, { w: 4, seed: 111 + i, color: o.color || K.C.ink }); }
  };

  // ---------------- the step card ----------------
  // CARD = default box (x, y, w, h) of the step card in the portrait frame: under the vessel band, clear of the bottom
  // 380 px and the right 140 px.
  K.CARD = { x: 150, y: 1160, w: 780, h: 350 };
  // cardFace(c, q, w, h, dy): draw a card's words at offset dy (inside the card's clip). q = { kicker | step + of, amount,
  // name, note, bar: [t0, t1] | k, barLabel(k) → string (already translated), t }.
  function cardFace(c, q, w, h, dy, t) {
    const kick = q.kicker != null ? Pilot.tr(q.kicker) : `STEP ${q.step} OF ${q.of}`;
    K.say(c, kick, 46, 66 + dy, { raw: true, size: 25, weight: 700, color: K.MARK, align: 'left', ls: 3 });
    if (q.amount) K.wordmark(c, q.amount, 42, 178 + dy, { size: 106, align: 'left', depth: 4 });
    if (q.name) K.say(c, q.name, 46, 248 + dy, { font: K.DISPLAY, weight: 400, size: 56, color: K.C.ink, align: 'left', maxW: w - 90 });
    if (q.note) K.say(c, q.note, 48, 296 + dy, { size: 27, weight: 500, color: K.C.soft, align: 'left', maxW: w - 96 });
    if (q.bar != null) {
      const k = Array.isArray(q.bar) ? clamp((t - q.bar[0]) / (q.bar[1] - q.bar[0])) : clamp(q.bar), bx = 46, by = h - 36, bw = w - 280, bh = 14;
      if (k > 0) { K.path(c, K.rrect(bx, by, bw * k, bh, 7), true); c.fillStyle = K.MARK; c.fill(); }
      K.ink(c, K.rrect(bx, by, bw, bh, 7), { closed: true, w: 2.5, seed: 131, amp: .6 });
      if (q.barLabel) K.say(c, q.barLabel(k), w - 44, by + 14, { raw: true, size: 25, weight: 500, color: K.C.soft, align: 'right', maxW: 210 });
    }
  }
  // card(c, q, { x, y, w, h, dx = 0, t }): one step card at CARD (or the given box), shifted dx: cream card, wobbled ink
  // outline, a hard offset shadow in PALE, and its words (see cardFace above).
  K.card = function (c, q, o = {}) {
    const x = o.x ?? K.CARD.x, y = o.y ?? K.CARD.y, w = o.w ?? K.CARD.w, h = o.h ?? K.CARD.h;
    c.save(); c.translate(x + (o.dx || 0), y);
    const box = K.rrect(0, 0, w, h, 22);
    c.save(); c.translate(10, 11); K.path(c, K.wob(box, { closed: true, seed: 121, amp: 1 }), true); c.fillStyle = K.PALE; c.fill(); c.restore();
    K.ink(c, box, { closed: true, fill: K.C.card, w: 3.5, seed: 122 });
    c.save(); K.path(c, box, true); c.clip();
    if (o.swap) { cardFace(c, o.swap.prev, w, h, o.swap.dyPrev, o.t); cardFace(c, q, w, h, o.swap.dy, o.t); }
    else cardFace(c, q, w, h, 0, o.t);
    c.restore(); c.restore();
  };
  // deck(c, t, cards, { x, y, w, h, until, swap = .38 }): the card that is current at t from a list sorted by `at`
  // (cards = [{ at, step, of, amount, name, note, bar, barLabel, kicker }]). The first slides in from the right; a card
  // with a new step slides the old one out left as it comes in (the crisp slide, one tiny overshoot); a card with the
  // same step only swaps its words (old ones up and out, new ones up from below, inside the card). `until` slides the
  // last one out.
  K.deck = function (c, t, cards, o = {}) {
    let i = -1; for (let j = 0; j < cards.length; j++) if (t >= cards[j].at) i = j;
    if (i < 0) return;
    const dur = o.swap ?? .38, cur = cards[i], prev = cards[i - 1], k = clamp((t - cur.at) / dur), D = 1080, base = { ...o, t };
    if (o.until != null && t >= o.until) { const e = K.eo4((t - o.until) / dur); if (e < 1) K.card(c, cur, { ...base, dx: -D * e }); return; }
    if (!prev) { K.card(c, cur, { ...base, dx: D * (1 - K.spring(k, .8)) }); return; }
    if (k >= 1) { K.card(c, cur, base); return; }
    if (cur.step === prev.step && !cur.fresh) {
      const h = o.h ?? K.CARD.h, e = K.eo4(k);
      K.card(c, cur, { ...base, swap: { prev, dyPrev: -h * e, dy: h * (1 - K.spring(k, .8)) } });
    } else {
      const s = K.spring(k, .8);
      K.card(c, prev, { ...base, dx: -D * s }); K.card(c, cur, { ...base, dx: D * (1 - s) });
    }
  };

  // ---------------- the progress rail ----------------
  // rail(c, t, { labels, at, done, appear = 0, x0 = 180, x1 = 900, y = 500, r = 24 }): numbered dots joined by a line,
  // a label under each. at[i] = when step i becomes current, done[i] = when it is complete. Pending: faint ring; current:
  // bold ink ring, label in MARK; done: MARK disc with a cream check drawn on, the line to the next dot fills in MARK.
  // The whole rail draws on from `appear` (line left → right, dots pop in one after another).
  K.rail = function (c, t, o) {
    const L = o.labels, n = L.length, x0 = o.x0 ?? 180, x1 = o.x1 ?? 900, y = o.y ?? 500, r = o.r ?? 24, ap = o.appear ?? 0;
    const X = i => n === 1 ? (x0 + x1) / 2 : lerp(x0, x1, i / (n - 1)), kA = K.eo4((t - ap) / .6);
    if (kA <= 0) return;
    K.line(c, X(0), y, lerp(X(0), X(n - 1), kA), y, { w: 3, color: K.C.faint, seed: 141, amp: .5 });
    for (let i = 0; i < n - 1; i++) {
      const kf = o.done && t >= o.done[i] ? K.eo4((t - o.done[i]) / .35) : 0;
      if (kf > 0) K.line(c, X(i) + r, y, lerp(X(i) + r, X(i + 1) - r, kf), y, { w: 5, color: K.MARK, seed: 142 + i, amp: .5 });
    }
    for (let i = 0; i < n; i++) {
      const kd = K.spring((t - ap - .06 * i) / .3); if (kd <= 0) continue;
      const done = o.done && t >= o.done[i], cur = !done && o.at && t >= o.at[i];
      c.save(); c.translate(X(i), y);
      const pop = done ? 1 + .14 * Math.sin(Math.PI * clamp((t - o.done[i]) / .25)) : 1; c.scale(kd * pop, kd * pop);
      if (done) {
        K.ink(c, K.ell(0, 0, r, r, 0, TAU, 28), { closed: true, fill: K.MARK, w: 3, seed: 150 + i });
        const kc = clamp((t - o.done[i]) / .22), ck = [[-r * .42, 0], [-r * .1, r * .32], [r * .45, -r * .34]];
        c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = K.C.card; c.lineWidth = 5; c.beginPath(); c.moveTo(ck[0][0], ck[0][1]);
        if (kc < .4) c.lineTo(lerp(ck[0][0], ck[1][0], kc / .4), lerp(ck[0][1], ck[1][1], kc / .4));
        else { c.lineTo(ck[1][0], ck[1][1]); c.lineTo(lerp(ck[1][0], ck[2][0], (kc - .4) / .6), lerp(ck[1][1], ck[2][1], (kc - .4) / .6)); }
        c.stroke(); c.restore();
      } else {
        K.ink(c, K.ell(0, 0, r, r, 0, TAU, 28), { closed: true, fill: cur ? K.C.card : K.C.paper, w: cur ? 4.5 : 3, color: cur ? K.C.ink : K.C.faint, seed: 150 + i });
        K.say(c, String(i + 1), 0, 11, { raw: true, font: K.DISPLAY, weight: 400, size: 30, color: cur ? K.C.ink : K.C.faint });
      }
      c.restore();
      K.say(c, L[i], X(i), y + r + 38, { size: 25, weight: cur ? 700 : 500, color: cur ? K.MARK : done ? K.C.ink : K.C.soft, alpha: clamp(kd), maxW: (x1 - x0) / Math.max(1, n - 1) - 8 });
    }
  };

  // ---------------- the checklist ----------------
  // checklist(c, t, { x, y, items: [{ amount, name, at }], lh = 58, col = 120, size = 30, appear = 0, arrow = true }):
  // the ingredient list that ticks off (White-Russian style): a ring per row, a MARK check drawn on at `at`, the amount
  // in Do Hyeon, the name in Sans; an arrow points at the next row due. Rows pop in from `appear`, .07 s apart.
  K.checklist = function (c, t, o) {
    const lh = o.lh ?? 58, col = o.col ?? 120, sz = o.size ?? 30, ap = o.appear ?? 0, items = o.items;
    const next = items.findIndex(it => t < it.at);
    items.forEach((it, i) => {
      const kr = K.eo4((t - ap - .07 * i) / .3); if (kr <= 0) return;
      const y = o.y + i * lh, x = o.x + (1 - kr) * 40;
      c.save(); c.globalAlpha *= kr;
      const done = t >= it.at;
      K.ink(c, K.ell(x, y - 10, 14, 14, 0, TAU, 20), { closed: true, w: 2.5, color: done ? K.MARK : K.C.soft, seed: 161 + i, amp: .5 });
      if (done) { const kc = clamp((t - it.at) / .2);
        c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = K.MARK; c.lineWidth = 4.5; c.beginPath(); c.moveTo(x - 9, y - 12);
        if (kc < .4) c.lineTo(x - 9 + 8 * kc / .4, y - 12 + 9 * kc / .4); else { c.lineTo(x - 1, y - 3); c.lineTo(x - 1 + 20 * (kc - .4) / .6, y - 3 - 22 * (kc - .4) / .6); }
        c.stroke(); c.restore(); }
      if (o.arrow !== false && i === next && t >= ap) K.say(c, '→', x - 40, y, { raw: true, size: sz, weight: 700, color: K.MARK });
      K.say(c, it.amount, x + 32, y, { font: K.DISPLAY, weight: 400, size: sz + 2, color: done ? K.C.ink : K.C.soft, align: 'left' });
      K.say(c, it.name, x + 32 + col, y, { size: sz - 2, weight: done ? 700 : 500, color: done ? K.C.ink : K.C.soft, align: 'left', maxW: o.maxW });
      c.restore();
    });
  };

  // ---------------- the phone card ----------------
  // phone(c, { x, y, w = 330, h = 560, name, k = 1, seed }) → the screen box { x0, y0, x1, y1 } (screen coords): a rounded
  // phone in ink line on a cream screen with a notch and a header (an avatar ring + `name`). k 0..1 springs it up from
  // below. Draw chat() into the returned box.
  K.phone = function (c, o = {}) {
    const w = o.w ?? 330, h = o.h ?? 560, k = o.k ?? 1, x = o.x ?? 540, y = o.y ?? 860, sd = o.seed ?? 171;
    const dy = (1 - K.spring(k, .8)) * 1200, X = x - w / 2, Y = y - h / 2 + dy;
    K.path(c, K.wob(K.rrect(X + 10, Y + 11, w, h, 46), { closed: true, seed: sd + 9 }), true); c.fillStyle = K.PALE; c.fill();
    K.ink(c, K.rrect(X, Y, w, h, 46), { closed: true, fill: K.C.ink, w: 3.5, seed: sd });
    const s = { x0: X + 14, y0: Y + 14, x1: X + w - 14, y1: Y + h - 14 };
    K.path(c, K.rrect(s.x0, s.y0, s.x1 - s.x0, s.y1 - s.y0, 34), true); c.fillStyle = K.C.card; c.fill();
    K.path(c, K.rrect(x - 44, s.y0 + 10, 88, 22, 11), true); c.fillStyle = K.C.ink; c.fill();
    const hy = s.y0 + 78;
    K.ink(c, K.ell(s.x0 + 46, hy - 8, 18, 18, 0, TAU, 20), { closed: true, fill: K.C.wash, w: 2.5, seed: sd + 1 });
    if (o.name) K.say(c, o.name, s.x0 + 76, hy, { size: 26, weight: 700, color: K.C.ink, align: 'left', maxW: s.x1 - s.x0 - 96 });
    K.line(c, s.x0 + 14, hy + 28, s.x1 - 14, hy + 28, { w: 2, color: K.C.faint, seed: sd + 2, amp: .4 });
    s.top = hy + 52; s.dy = dy;
    return s;
  };
  // bubble(c, x, y, s, { me, k = 1, size = 28, maxW = 250, raw }) → its height: one chat bubble whose top sits at y.
  // me: right-aligned at x (x = its right edge), ink fill with cream words; otherwise left-aligned at x, cream with an ink
  // edge. k 0..1 pops it from its tail corner (house spring).
  K.bubble = function (c, x, y, s, o = {}) {
    const k = o.k ?? 1, size = o.size ?? 28; s = o.raw ? String(s) : Pilot.tr(s);
    c.save(); c.font = `500 ${size}px ${K.SANS}`; const tw = Math.min(c.measureText(s).width, (o.maxW ?? 250) - 36); c.restore();
    const bw = tw + 36, bh = size + 30; if (k <= 0) return bh;
    const me = !!o.me, bx = me ? x - bw : x, ax = me ? x : x, ay = y + bh;
    c.save(); c.translate(ax, ay); const sc = K.spring(k, 1.3); c.scale(sc, sc); c.translate(-ax, -ay);
    const box = K.rrect(bx, y, bw, bh, 20), tail = me ? [[x - 14, y + bh - 2], [x + 8, y + bh + 6], [x - 4, y + bh - 16]] : [[x + 14, y + bh - 2], [x - 8, y + bh + 6], [x + 4, y + bh - 16]];
    K.ink(c, tail, { closed: true, fill: me ? K.C.ink : K.C.card, w: me ? 0 : 2.5, seed: 181 });
    K.ink(c, box, { closed: true, fill: me ? K.C.ink : K.C.card, w: me ? 2 : 2.5, seed: me ? 182 : 183 });
    K.say(c, s, bx + bw / 2, y + bh / 2 + size * .36, { raw: true, size, weight: 500, color: me ? K.C.card : K.C.ink, maxW: bw - 30 });
    c.restore();
    return bh;
  };
  // typing(c, x, y, t, { k = 1 }) → height: the "…" bubble (left side) with three dots bobbing in turn.
  K.typing = function (c, x, y, t, o = {}) {
    const k = o.k ?? 1, bw = 96, bh = 58; if (k <= 0) return bh;
    c.save(); c.translate(x, y + bh); c.scale(K.spring(k, 1.3), K.spring(k, 1.3)); c.translate(-x, -y - bh);
    K.ink(c, [[x + 14, y + bh - 2], [x - 8, y + bh + 6], [x + 4, y + bh - 16]], { closed: true, fill: K.C.card, w: 2.5, seed: 181 });
    K.ink(c, K.rrect(x, y, bw, bh, 20), { closed: true, fill: K.C.card, w: 2.5, seed: 184 });
    for (let i = 0; i < 3; i++) { const b = Math.max(0, Math.sin((t * 5.5 - i * .9))) * 7; c.fillStyle = K.C.soft; c.beginPath(); c.arc(x + 26 + i * 22, y + bh / 2 - b, 6, 0, TAU); c.fill(); }
    c.restore(); return bh;
  };
  // chat(c, t, scr, msgs, { gap = 18, pad = 22 }): lay out a conversation in a phone() screen box from its top: msgs =
  // [{ at, s, me }] (a bubble pops in at `at`) and [{ typing: [from, to] }] (the dots show between from and to, then
  // give their place to the next message). Bubbles stack downward.
  K.chat = function (c, t, scr, msgs, o = {}) {
    const gap = o.gap ?? 18, pad = o.pad ?? 22, maxW = scr.x1 - scr.x0 - 2 * pad - 20; let y = scr.top;
    for (const m of msgs) {
      if (m.typing) { if (t >= m.typing[0] && t < m.typing[1]) y += K.typing(c, scr.x0 + pad, y, t, { k: (t - m.typing[0]) / .25 }) + gap; continue; }
      if (t < m.at) continue;
      y += K.bubble(c, m.me ? scr.x1 - pad : scr.x0 + pad, y, m.s, { me: m.me, k: (t - m.at) / .3, maxW, size: o.size }) + gap;
    }
  };

  // ---------------- frame, fades, end card ----------------
  // begin(ctx): black, pillarbox the portrait frame in landscape (?o=h), lay the cream paper. Call first in draw().
  K.begin = function (ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, Pilot.W, Pilot.H);
    if (Pilot.ori !== 'v') { ctx.translate((Pilot.W - K.W * Pilot.H / K.H) / 2, 0); ctx.scale(Pilot.H / K.H, Pilot.H / K.H); ctx.beginPath(); ctx.rect(0, 0, K.W, K.H); ctx.clip(); }
    if (paper) ctx.drawImage(paper, 0, 0); else { ctx.fillStyle = K.C.paper; ctx.fillRect(0, 0, K.W, K.H); }
  };
  // fade(ctx, t, dur, fi = .5, fo = .5): from black over the first fi s and to black over the last fo s (scenes join).
  K.fade = function (ctx, t, dur, fi = .5, fo = .5) {
    const k = 1 - ss(0, fi, t) * (1 - ss(dur - fo, dur, t)); if (k <= 0) return;
    ctx.save(); ctx.fillStyle = `rgba(0,0,0,${k})`; ctx.fillRect(-K.W, -K.H, K.W * 3, K.H * 3); ctx.restore();
  };
  // endCard(ctx, t, card, at, { y = 700, w = 820, h = 640 }): the shared end card (kicker · title · passage · by · cta) as
  // one last recipe card that springs up from below and stops at y (its top); the title in the wordmark, small lines in
  // Sans. Everything in within ~.5 s and held (card.compact as in Story.endCard).
  K.endCard = function (ctx, t, card, at, o = {}) {
    const k = clamp((t - at) / .45); if (k <= 0) return;
    const w = o.w ?? 820, h = o.h ?? 640, x = (K.W - w) / 2, y = (o.y ?? 700) + (1 - K.spring(k, .8)) * 1300, cx = K.W / 2;
    ctx.save();
    K.path(ctx, K.wob(K.rrect(x + 12, y + 13, w, h, 28), { closed: true, seed: 191 }), true); ctx.fillStyle = K.PALE; ctx.fill();
    K.ink(ctx, K.rrect(x, y, w, h, 28), { closed: true, fill: K.C.card, w: 4, seed: 192 });
    const lines = Pilot.tr(card.title || '').split('\n'), ts = lines.length > 1 ? 92 : 108, ty = y + (card.kicker ? 210 : 190);
    if (card.kicker) K.say(ctx, card.kicker, cx, y + 92, { size: 28, weight: 700, color: K.MARK, ls: 2 });
    K.wordmark(ctx, lines.join('\n'), cx, ty, { raw: true, size: ts, k: (t - at - .1) / .35 });
    const yb = ty + (lines.length - 1) * ts * 1.02;
    K.line(ctx, cx - 120 * K.eo4((t - at - .3) / .4), yb + 52, cx + 120 * K.eo4((t - at - .3) / .4), yb + 52, { w: 3, color: K.C.faint, seed: 193, amp: .5 });
    const q = card.compact ? .3 : 1;
    K.say(ctx, card.passage, cx, yb + 118, { size: 34, weight: 500, color: K.C.ink, alpha: ss(at + .4 * q, at + 1.3 * q, t), maxW: w - 80 });
    K.say(ctx, card.by, cx, yb + 172, { font: K.HAND, weight: K.HANDW, size: 32, color: K.C.soft, alpha: ss(at + .6 * q, at + 1.5 * q, t), maxW: w - 80 });
    if (card.cta) K.say(ctx, card.cta, cx, y + h - 50, { size: 28, weight: 700, color: K.MARK, alpha: ss(at + 1.2, at + 2.1, t), ls: 2 });
    ctx.restore();
  };

  window.RecipeCard = K;
})();

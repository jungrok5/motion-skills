/* Vendored from motion-skills canvas-film/kits/webtoon/kit.js (unchanged below this line) — global Webtoon: strip + camera, balloons,
   SFX lettering, focus/speed lines, screentone, mood backgrounds, emotion symbols, SD/stone/crumble, and the colour cel rig Webtoon.Rig.
   Provenance and the full API: references/STYLE.md and references/RESEARCH.md. */
/* kit-webtoon.js — a Korean colour webtoon that moves (세로 스크롤 무빙툰), as a canvas-film style kit.  Global: window.Webtoon
   One long vertical STRIP of panels on off-white paper, read by a camera that scrolls DOWN it (stop on a panel, glide
   through the gutters — gutters are time). Clean dark-brown lineart, flat colour with ONE hard cel-shade band, big
   expressive eyes, balloons and lettering drawn into the art (round / spiky shout / thought cloud / dashed whisper /
   narration box / pen-script monologue), SFX letters per syllable, and the manga effect vocabulary: focus lines, speed
   lines, 45° screentone, gradient tone, light rays, sparkles, dark aura + 쿠구구구, white freeze-flash, zoom punch, emotion
   symbols, tears, a figure turning to stone and crumbling. A generic webtoon person rig (normal ~1:6 and SD 1:1.5, front
   and 3/4, 2-bone IK arms, hand poses incl. 가위·바위·보) — a film's cast file only supplies looks (colours, hair, extras).
   Provenance (ideas, numbers and formulas only — own renderer, no code copied; see STYLE.md + RESEARCH.md):
     balloon tails / thought & shout outlines / merged families after BloomBooks/comical-js (MIT); balloon & lettering
     defaults after drnachio/postext (MIT); focus lines after hitode909/speedline + sugyan/speedline.js (MIT); tone levels
     and the 45° screen after ashukae/ComfyUI-MangaScreen (MIT) + the sqrt dot rule (Observable halftone); cut/slant panels
     after bmad4ever/comfyui_panels (MIT); toon band / rim / spring formulas after the VRM spec (MToon, SpringBone);
     blink and breath timings referenced from Live2D Cubism samples (numbers only); cel model after
     EXPWorlds/Godot-Cel-Shader (MIT); expression vocabulary after gramener/comicgen; reader conventions after
     mihonapp/mihon (Apache-2.0); gutters / pacing after SamDreamsMaker/webtoon-creation-guide (MIT) + Clip Studio guides.
   Load after lib.js (and story.js):  <script src="lib.js"></script><script src="kit-webtoon.js"></script>
   Design space is the portrait frame 1080×1920 (Webtoon.W × Webtoon.H); in landscape Webtoon.begin pillarboxes it.
   Pure and deterministic: every frame is a function of t; seeded randomness only; caches are rebuildable. */
(function () {
  const { clamp, lerp, ss, eo, eio, rng } = Pilot;
  const K = {}, TAU = Math.PI * 2, W = 1080, H = 1920;
  K.W = W; K.H = H; K.TAU = TAU;

  // ================================================================ palette & type
  // Calm office daylight: warm paper, dark warm-brown line (never pure black on characters), soft blue-grey shadows.
  // ONE accent (K.ACCENT) for the thing the story is about — nothing else carries that hue.
  K.C = {
    ink: '#2a2127',      // character + balloon line (dark warm brown)
    black: '#151216',    // solid black (drama panels, screentone, borders)
    border: '#1d1a1f',   // panel border
    paper: '#fbf8f2',    // the strip / gutter (off-white)
    white: '#ffffff',    // balloons
    tone: '#2a2430',     // screentone dots
    skin: '#ffe3d2', skinS: '#f2b6a4', skinL: '#fff4ec',
    blush: '#ff8a97', mouth: '#8e3a48', tongue: '#e9707e',
    sweat: '#bfe6ff', tear: '#9bd6ff', tearL: '#e7f7ff', vein: '#e2333f',
    spark: '#fff7cf', gold: '#ffd65c', rays: '#fff3c4',
    wall: '#f6efe5', wall2: '#ece2d3', wood: '#e3c8a2', woodS: '#c7a57d', floor: '#e8ddcc', shadow: '#c5ccda',
    aura: '#2e1b40', auraL: '#7b4fae', night: '#1a1c2b', gloom: '#4b5a8a',
    stone: '#a3a4a8', stoneS: '#7c7d84', stoneL: '#c8c8cb',
  };
  K.ACCENT = '#ff6fa3';
  // Fonts (SIL OFL, loaded by name): dialogue Jua (or Do Hyeon), thought/monologue Nanum Pen Script (or Gaegu),
  // shout + SFX Black Han Sans, narration Noto Sans KR, titles Noto Serif KR.
  K.F = {
    talk: "'Jua',sans-serif", talk2: "'Do Hyeon',sans-serif", think: "'Nanum Pen Script',cursive", think2: "'Gaegu',cursive",
    shout: "'Black Han Sans',sans-serif", sfx: "'Black Han Sans',sans-serif", sans: "'Noto Sans KR',sans-serif", serif: "'Noto Serif KR',serif",
  };
  // pass to Pilot.run({ fonts: Webtoon.FONTS }) so every face is loaded before the first frame
  K.FONTS = ["400 46px 'Jua'", "400 46px 'Do Hyeon'", "400 56px 'Nanum Pen Script'", "400 46px 'Gaegu'", "400 60px 'Black Han Sans'",
    "400 30px 'Noto Sans KR'", "700 30px 'Noto Sans KR'", "600 60px 'Noto Serif KR'"];
  K.FONT_LINK = 'https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Do+Hyeon&family=Gaegu:wght@400;700&family=Jua&family=Nanum+Pen+Script&family=Noto+Sans+KR:wght@400;700&family=Noto+Serif+KR:wght@600&display=swap';
  // Gutter presets in strip px at 1080 wide (RESEARCH §A.2, Clip Studio / Comistitch ×1.35): seq 40–70, action 135–200,
  // beat 270–400, scene 540–810, cliff 810–1080.
  K.GAP = { tight: 24, seq: 56, action: 160, beat: 320, scene: 640, cliff: 900 };
  // Reading zone: the frame minus phone UI (top 140, bottom 300) → centre y 880. Stops frame panels here.
  K.SAFE = { top: 140, bottom: 300, mid: 880 };

  // ================================================================ small utilities
  // hash(...parts) → uint32 from numbers/strings (seeds: hash('balloon', i), boil: hash(seed, floor(t·10)))
  K.hash = function (...a) {
    let h = 2166136261 >>> 0;
    for (const v of a) { const s = typeof v === 'number' ? String(Math.round(v * 1000)) : String(v);
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } h ^= 0x9e37; h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  };
  // rnd(...parts) → a seeded () => [0,1) generator (Pilot.rng over hash)
  K.rnd = (...a) => rng(K.hash(...a));
  // boil(t, fps = 10) → integer frame index for re-randomising lines (speedline.js redraws every 100 ms)
  K.boil = (t, fps = 10) => Math.floor(t * fps + 1e-6);
  // backOut(x, s = 1.70158): ease-out with overshoot (peak ≈ 1 + s·0.06 for small s); pop(t, at, dur, from, s): a scale that is
  // 0 before `at`, then from → ~1.08 → 1 over dur (balloon/SFX entrances).
  K.backOut = (x, s = 1.70158) => { x = clamp(x); const c = s + 1; return 1 + c * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
  K.pop = (t, at, dur = .22, from = .6, s = 2.2) => t < at ? 0 : from + (1 - from) * K.backOut((t - at) / dur, s);
  // popPeak(k): 0 → 1.25 → 1 over k ∈ [0,1] (SFX syllables, RESEARCH §19)
  K.popPeak = k => k <= 0 ? 0 : k < .6 ? 1.25 * eo(k / .6) : lerp(1.25, 1, eio((k - .6) / .4));
  K.lerpP = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  K.dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  // readTime(str): seconds a reader needs for a balloon (BRIEF: 1.2 s + 0.07 s per character)
  K.readTime = s => 1.2 + .07 * Pilot.chars(Pilot.tr(String(s)).replace(/\s/g, '')).length;
  // freeze(t, t0, len): animation time that stops at t0 for `len` s (the freeze-frame), then runs on (shifted)
  K.freeze = (t, t0, len) => t < t0 ? t : t < t0 + len ? t0 : t - len;
  // register(t, ranges, base = 'normal'): which drawing register is on — ranges [[t0, t1, 'sd'|'drama'|…], …]. Switch on a HARD
  // CUT (no morph) — RESEARCH §31.
  K.register = (t, ranges, base = 'normal') => { for (const [a, b, n] of ranges) if (t >= a && t < b) return n; return base; };

  // ---------------- colour helpers
  const HEXC = new Map();
  const rgbOf = c => { let v = HEXC.get(c); if (v) return v;
    if (c[0] === '#') v = Pilot.hex(c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c); else v = c.match(/[\d.]+/g).slice(0, 3).map(Number);
    HEXC.set(c, v); return v; };
  K.rgbOf = rgbOf;
  const hexOf = v => '#' + v.map(x => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('');
  // rgba(c, a): any colour at alpha a.   mixC(a, b, k): blend two colours → hex.
  K.rgba = (c, a) => { const v = rgbOf(c); return `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${a})`; };
  K.mixC = (a, b, k) => hexOf(Pilot.mix(rgbOf(a), rgbOf(b), k));
  // shadeOf(c, k = 1): the cel shade colour = base × (.80, .76, .88) — a slightly cool/purple multiply (RESEARCH §27)
  const SH = new Map();
  K.shadeOf = (c, k = 1) => { const key = c + k; let v = SH.get(key); if (v) return v; const a = rgbOf(c);
    v = hexOf([a[0] * lerp(1, .80, k), a[1] * lerp(1, .76, k), a[2] * lerp(1, .88, k)]); SH.set(key, v); return v; };
  K.lightOf = (c, k = .35) => K.mixC(c, '#ffffff', k);
  // stoneCol(c, k): the colour turned to grey stone (luminance → cool grey, contrast squeezed), k 0…1
  K.stoneCol = (c, k = 1) => { if (k <= 0) return c; const a = rgbOf(c), l = .3 * a[0] + .59 * a[1] + .11 * a[2], g = 112 + (l - 112) * .62;
    return hexOf(Pilot.mix(a, [g - 3, g - 1, g + 5], k)); };

  // ---------------- path helpers (Path2D)
  // poly(pts, closed = true) · smooth(pts, closed = true) (quadratic through midpoints) · ell(x, y, rx, ry, rot) · rr(x, y, w, h, r)
  // capsule(a, b, r0, r1): a tapered tube a → b with round ends (limbs, fingers)
  K.poly = (pts, closed = true) => { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); if (closed) p.closePath(); return p; };
  K.smooth = (pts, closed = true) => {
    const p = new Path2D(), n = pts.length; if (n < 3) return K.poly(pts, closed);
    if (closed) { const m0 = K.lerpP(pts[n - 1], pts[0], .5); p.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], m = K.lerpP(a, b, .5); p.quadraticCurveTo(a[0], a[1], m[0], m[1]); } p.closePath(); }
    else { p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n - 1; i++) { const a = pts[i], m = K.lerpP(a, pts[i + 1], .5); p.quadraticCurveTo(a[0], a[1], m[0], m[1]); }
      p.lineTo(pts[n - 1][0], pts[n - 1][1]); }
    return p;
  };
  K.ell = (x, y, rx, ry, rot = 0) => { const p = new Path2D(); p.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), rot, 0, TAU); return p; };
  K.rr = (x, y, w, h, r) => { const p = new Path2D(); r = Math.min(r, w / 2, h / 2); p.roundRect ? p.roundRect(x, y, w, h, r) : (p.rect(x, y, w, h)); return p; };
  K.capsule = (a, b, r0, r1 = r0) => {
    const p = new Path2D(), an = Math.atan2(b[1] - a[1], b[0] - a[0]);
    p.arc(a[0], a[1], r0, an + Math.PI / 2, an - Math.PI / 2); p.arc(b[0], b[1], r1, an - Math.PI / 2, an + Math.PI / 2); p.closePath(); return p;
  };

  // ---------------- ink & cel (the look)
  // inked(ctx, path, fill, lw, ink = C.ink): the outline stroked UNDER the fill at 2·lw (so lw shows outside) — overlapping
  //   shapes drawn with inkGroup merge into one silhouette (comical-js's stroke-then-fill trick).
  // inkGroup(ctx, parts, lw, ink): parts [{ p: Path2D, fill, line?: true, w? }] — pass 1 strokes every outline, pass 2 fills all.
  //   A part with `line: true` is an open Path2D drawn as a thick stroke of width w (fingers, straps).
  K.inked = function (ctx, p, fill, lw, ink = K.C.ink) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = ink; ctx.lineWidth = lw * 2; ctx.stroke(p); ctx.fillStyle = fill; ctx.fill(p);
  };
  K.inkGroup = function (ctx, parts, lw, ink = K.C.ink) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = ink;
    for (const q of parts) { if (!q) continue; ctx.lineWidth = q.line ? q.w + lw * 2 : lw * 2; ctx.stroke(q.p); }
    for (const q of parts) { if (!q) continue; if (q.line) { ctx.strokeStyle = q.fill; ctx.lineWidth = q.w; ctx.stroke(q.p); ctx.strokeStyle = ink; } else { ctx.fillStyle = q.fill; ctx.fill(q.p); } }
  };
  // cel(ctx, path, base, shade, dx, dy, soft = 0): ONE hard cel band — fill the shade, clip, fill the same shape moved TOWARD
  //   the light (dx, dy) in the base colour; a crescent of shade stays on the far side (MToon toony ≈ .9 as a 2-D trick).
  //   soft > 0 blurs that edge a little (px). Light defaults to upper-left: pass dx, dy > 0 for a shade on the lower-right.
  K.cel = function (ctx, p, base, shade, dx, dy, soft = 0) {
    ctx.fillStyle = shade; ctx.fill(p); ctx.save(); ctx.clip(p); if (soft) ctx.filter = `blur(${soft}px)`;
    ctx.translate(-dx, -dy); ctx.fillStyle = base; ctx.fill(p); ctx.restore();
  };
  // rim(ctx, path, col, dx, dy, a = .8): a thin rim light on the edge facing a back light (MToon rim, power 5 → a sliver): inside the shape but
  //   outside the same shape moved (dx, dy) AWAY from the light, filled with col. Draw it over the finished figure (silhouette path), drama/night.
  K.rim = function (ctx, p, col, dx, dy, a = .8) {
    const q = new Path2D(); q.rect(-1e5, -1e5, 2e5, 2e5); q.addPath(p, new DOMMatrix().translate(dx, dy));
    ctx.save(); ctx.clip(p); ctx.clip(q, 'evenodd'); ctx.globalAlpha *= a; ctx.fillStyle = col; ctx.fill(p); ctx.restore();
  };
  // taper(ctx, pts, w0, w1, col): a filled stroke along a polyline whose width runs w0 → w1 (ink lines with taper, hair strands, lashes)
  K.taper = function (ctx, pts, w0, w1, col) {
    const n = pts.length; if (n < 2) return; const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const w = lerp(w0, w1, i / (n - 1)) / 2, nx = -dy / d * w, ny = dx / d * w; L.push([pts[i][0] + nx, pts[i][1] + ny]); R.push([pts[i][0] - nx, pts[i][1] - ny]);
    }
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    if (w0 > .5) { ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], w0 / 2, 0, TAU); ctx.fill(); }
    if (w1 > .5) { ctx.beginPath(); ctx.arc(pts[n - 1][0], pts[n - 1][1], w1 / 2, 0, TAU); ctx.fill(); }
  };
  // bez(p0, c1, c2, p1, n = 12) → points on a cubic Bézier (feed to taper)
  K.bez = (p0, c1, c2, p1, n = 12) => { const o = []; for (let i = 0; i <= n; i++) { const u = i / n, v = 1 - u;
    o.push([v * v * v * p0[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * p1[0], v * v * v * p0[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * p1[1]]); } return o; };
  // qb(p0, c, p1, n) → points on a quadratic Bézier
  K.qb = (p0, c, p1, n = 10) => { const o = []; for (let i = 0; i <= n; i++) { const u = i / n, v = 1 - u; o.push([v * v * p0[0] + 2 * v * u * c[0] + u * u * p1[0], v * v * p0[1] + 2 * v * u * c[1] + u * u * p1[1]]); } return o; };
  // line weight for a rig drawn at scale s: ≈ 5 px at s = 2, 8.7 px at s = 5, 3 px at s = 1 (in rig units — divide by nothing)
  K.lwFor = s => 2.5 * Math.pow(2 / Math.max(.15, s), .38);

  // ================================================================ page frame
  // begin(ctx, bg = C.paper): black, pillarbox the portrait design frame in landscape (?o=h), fill the paper. Call first in draw().
  K.begin = function (ctx, bg = K.C.paper) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, Pilot.W, Pilot.H);
    if (Pilot.ori !== 'v') { const k = Pilot.H / H; ctx.translate((Pilot.W - W * k) / 2, 0); ctx.scale(k, k); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); }
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  };
  // fade(ctx, t, dur, fi = .4, fo = .4): from black over the first fi s, to black over the last fo s (scenes join cleanly)
  K.fade = function (ctx, t, dur, fi = .4, fo = .4) {
    const k = Math.max(fi > 0 ? 1 - clamp(t / fi) : 0, fo > 0 ? clamp((t - (dur - fo)) / fo) : 0); if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = `rgba(0,0,0,${k})`; ctx.fillRect(-10, -10, W + 20, H + 20); ctx.restore();
  };
  // paper(ctx, x, y, w, h, col = C.paper, grain = .5): an off-white sheet with a very faint fibre grain (seeded, cached pattern)
  let GRAIN = null;
  K.paper = function (ctx, x, y, w, h, col = K.C.paper, grain = .5) {
    ctx.fillStyle = col; ctx.fillRect(x, y, w, h); if (grain <= 0) return;
    if (!GRAIN) { const c = Pilot.canvas(256, 256), g = c.getContext('2d'), d = g.createImageData(256, 256), r = rng(77);
      for (let i = 0; i < 256 * 256; i++) { const v = r() < .5 ? 0 : 255; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = (r() * 10) | 0; }
      g.putImageData(d, 0, 0); GRAIN = ctx.createPattern(c, 'repeat'); }
    ctx.save(); ctx.globalAlpha *= grain; ctx.fillStyle = GRAIN; ctx.fillRect(x, y, w, h); ctx.restore();
  };
  // titleCard(ctx, t, o): an episode title block — o { title, kicker ('1화'), sub, x = 540, y, at = 0, size = 112, color, accent }
  //   the title pops in on a soft brush stripe of the accent colour; kicker above, sub below.
  K.titleCard = function (ctx, t, o) {
    const x = o.x ?? 540, y = o.y ?? 760, at = o.at || 0, a = ss(at, at + .5, t); if (a <= 0) return;
    const sc = K.pop(t, at, .45, .7, 1.6), size = o.size || 112, ac = o.accent || K.ACCENT;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.save(); ctx.rotate(-.03); const sw = (o.stripe || 600) * ss(at + .1, at + .6, t);   // the brush stripe under the title
    ctx.fillStyle = K.rgba(ac, .85); ctx.beginPath(); ctx.moveTo(-sw / 2, -size * .05); ctx.quadraticCurveTo(0, -size * .2, sw / 2, -size * .08);
    ctx.lineTo(sw / 2 - 12, size * .36); ctx.quadraticCurveTo(0, size * .28, -sw / 2 + 10, size * .4); ctx.closePath(); ctx.fill(); ctx.restore();
    if (o.kicker) Pilot.text(ctx, o.kicker, 0, -size * .95, { size: size * .3, font: K.F.sans, weight: 700, color: o.color || K.C.ink, ls: 6 });
    ctx.lineJoin = 'round'; ctx.font = `400 ${size}px ${o.font || K.F.shout}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const s = Pilot.tr(o.title); ctx.strokeStyle = '#fff'; ctx.lineWidth = size * .16; ctx.strokeText(s, 0, size * .32);
    ctx.fillStyle = o.color || K.C.ink; ctx.fillText(s, 0, size * .32);
    if (o.sub) Pilot.text(ctx, o.sub, 0, size * .95, { size: size * .3, font: K.F.sans, weight: 400, color: o.subColor || '#6b6168' });
    ctx.restore();
  };
  // endCard(ctx, t, at, card, o): the webtoon "끝" card — the frame fades to paper, the title in a frame, a round 끝 stamp that
  //   pops, a small "다음 화" line. card { title, end = '끝', next, by }. o { bg, accent }. Draw last (screen space).
  K.endCard = function (ctx, t, at, card, o = {}) {
    const a = ss(at, at + .6, t); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; K.paper(ctx, 0, 0, W, H, o.bg || K.C.paper, .4); ctx.restore();
    const y = o.y || 820;
    ctx.save(); ctx.globalAlpha = a;
    ctx.strokeStyle = K.C.border; ctx.lineWidth = 5; ctx.strokeRect(120, y - 250, 840, 420);
    ctx.lineWidth = 2; ctx.strokeRect(138, y - 232, 804, 384);
    ctx.restore();
    Pilot.text(ctx, card.title, 540, y - 30, { size: 96, font: K.F.shout, color: K.C.ink, alpha: a });
    if (card.by) Pilot.text(ctx, card.by, 540, y + 70, { size: 30, font: K.F.sans, color: '#7a6f76', alpha: a * ss(at + .3, at + .9, t) });
    const sc = K.pop(t, at + .5, .35, .3, 3);
    if (sc > 0) { ctx.save(); ctx.translate(540, y + 330); ctx.rotate(-.12); ctx.scale(sc, sc);
      ctx.fillStyle = o.accent || K.ACCENT; ctx.beginPath(); ctx.arc(0, 0, 92, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 78, 0, TAU); ctx.stroke();
      Pilot.text(ctx, card.end || '끝', 0, 30, { size: 92, font: K.F.shout, color: '#fff' }); ctx.restore(); }
    if (card.next) Pilot.text(ctx, card.next, 540, y + 540, { size: 36, font: K.F.talk, color: '#5d545a', alpha: ss(at + 1, at + 1.6, t) });
  };

  // ================================================================ strip, panels, scroll camera
  // strip(def) → S. The episode as one tall strip, 1080 wide, laid out top → bottom.
  //   def = { top = 0, side = 48 (panel side margin), gap = 'seq', bottom = 400, bg = C.paper | [[y | 'panelId' | 'id:end', col], …],
  //           panels: [ P, … ] }
  //   P = { id, h, gap (before it: px or a K.GAP name), x, w (default side margins), y (absolute; default after the previous),
  //         row: true (same top as the previous panel — side by side), dy (nudge),
  //         shape: 'rect' | 'round' | 'slant', cut: [tl, tr, br, bl] (corner y offsets for slanted panels), r (round radius), poly (own local polygon),
  //         border: 'ink' (5 px) | 'thin' | 'none' | 'fade' (borderless, soft edges) | 'bleed' (full width, top/bottom lines) | 'rough' (boiling),
  //         lw, ink, feather (fade px, 90), bg: colour | fn(ctx, t, P) (before cam), draw(ctx, t, P) (content, panel-local, clipped, under P.cam),
  //         over(ctx, t, P) (unclipped, after ALL panels — panel breaks; same cam unless overCam: false), cam(t, P) → { z, fx, fy, dx, dy, r } }
  //   Panel-local coords: (0, 0) = the panel's top-left, (P.w, P.h) its bottom-right. Per frame P.rel = panel centre − frame centre
  //   (strip px; for parallax: offset = P.rel · k) and P.on (visible). S.P[id] → panel, S.H → strip height, S.panels.
  K.strip = function (def) {
    const S = { panels: [], P: {}, side: def.side ?? 48 };
    let y = def.top || 0, prev = null;
    for (const p of def.panels) {
      const P = Object.assign({}, p);
      const g = P.gap == null ? (def.gap ?? 'seq') : P.gap; const gap = typeof g === 'string' ? K.GAP[g] : g;
      if (P.border === 'bleed') { P.x = 0; P.w = W; }
      P.x = P.x ?? S.side; P.w = P.w ?? W - 2 * S.side;
      if (P.y == null) P.y = P.row && prev ? prev.y : (prev ? prev.y + prev.h : y) + (P.row ? 0 : (prev ? gap : 0));
      P.y += P.dy || 0;
      const c = P.cut || [0, 0, 0, 0];
      P.poly = P.poly || [[0, c[0]], [P.w, c[1]], [P.w, P.h + c[2]], [0, P.h + c[3]]];
      if (P.shape === 'round') P.path = K.rr(0, 0, P.w, P.h, P.r ?? 28); else P.path = K.poly(P.poly);
      S.panels.push(P); if (P.id) S.P[P.id] = P; prev = P;
    }
    S.H = Math.max(...S.panels.map(P => P.y + P.h)) + (def.bottom ?? 400);
    const bg = Array.isArray(def.bg) ? def.bg : [[0, def.bg || K.C.paper]];
    S.bg = bg.map(([k, c]) => [typeof k === 'number' ? k : (() => { const [id, e] = String(k).split(':'), P = S.P[id]; return e === 'end' ? P.y + P.h : P.y; })(), c]).sort((a, b) => a[0] - b[0]);
    return S;
  };
  // gutterAt(S, y) → the strip background colour at strip y (mood changes happen in gutters, RESEARCH §8)
  K.gutterAt = function (S, y) { const b = S.bg; if (y <= b[0][0] || b.length === 1) return b[0][1]; for (let i = 1; i < b.length; i++) if (y < b[i][0]) return b[i][0] > b[i - 1][0] ? K.mixC(b[i - 1][1], b[i][1], ss(b[i - 1][0], b[i][0], y)) : b[i][1]; return b[b.length - 1][1]; };
  // panelStop(S, id, align = 'mid', off = 0) → camera y (frame top in strip px) that frames the panel: 'mid' centres it in the reading
  //   zone (y 880), 'top' puts its top at 160, 'bottom' its bottom at 1600, 'fit' = mid but keeps the top ≥ 140.
  K.panelStop = function (S, id, align = 'mid', off = 0) {
    const P = typeof id === 'string' ? S.P[id] : id; if (!P) throw new Error('no panel ' + id);
    if (align === 'top') return P.y - 160 + off; if (align === 'bottom') return P.y + P.h - 1600 + off;
    let y = P.y + P.h / 2 - K.SAFE.mid + off; if (align === 'fit') y = Math.min(y, P.y - K.SAFE.top); return y;
  };
  // camera(S, stops, o) → cam: the scroll. stops (top → bottom, in time order):
  //   { panel: 'id', align, off } | { at: stripY (centred in the reading zone) } | { y: frame-top },
  //   + hold (s, after arriving), glide (s; default clamp(.35 + gap/1400, .4, 1.6) — RESEARCH §1), cut: true (hard cut, no glide),
  //     ease: 'io' (default) | 'out' | 'back' (lands with a small overshoot), drift (px crept down during the hold, reading feel).
  //   o { t0 = 0, clamp = true }. cam.y(t) → frame-top strip y; cam.arrive[i] / cam.leave[i] → when stop i is reached / left;
  //   cam.end → time of the last leave; cam.segs (inspect). Every value is a pure function of t.
  K.camera = function (S, stops, o = {}) {
    const segs = [], arrive = [], leave = []; let t = o.t0 || 0, prevY = null;
    const lo = o.lo ?? -700, hi = Math.max(0, S.H - H) + (o.hiPad ?? 0);
    for (const st of stops) {
      let y = st.y != null ? st.y : st.at != null ? st.at - K.SAFE.mid : K.panelStop(S, st.panel, st.align, st.off);
      if (o.clamp !== false) y = clamp(y, lo, hi);
      if (prevY != null) {
        const g = st.cut ? 0 : st.glide != null ? st.glide : clamp(.35 + Math.abs(y - prevY) / 1400, .4, 1.6);
        if (g > 0) segs.push({ t0: t, t1: t + g, y0: prevY, y1: y, ease: st.ease || 'io' }); t += g;
      }
      arrive.push(t); const hd = st.hold || 0, dr = st.drift || 0;
      segs.push({ t0: t, t1: t + hd, y0: y, y1: y + dr, ease: 'lin' }); t += hd; leave.push(t); prevY = y + dr;
    }
    const EZ = { io: eio, out: eo, lin: x => x, back: x => K.backOut(x, 1.2) };
    const cam = { segs, arrive, leave, end: t,
      y(tt) { if (!segs.length) return 0; if (tt <= segs[0].t0) return segs[0].y0;
        for (const s of segs) if (tt < s.t1) return s.t1 <= s.t0 ? s.y1 : lerp(s.y0, s.y1, EZ[s.ease]((tt - s.t0) / (s.t1 - s.t0)));
        const l = segs[segs.length - 1]; return l.y1; } };
    return cam;
  };
  // drawStrip(ctx, t, S, camY, o): draws the visible part of the strip in the frame. o { shake: [dx, dy] (frame shake), over(ctx, t)
  //   (strip coords, after panels — balloons/SFX living in the scroll space), cull = 260 }. Order: gutter → every visible panel
  //   (clip, bg, cam, draw, edge fade, border) → every panel's over (panel breaks) → o.over. Returns the visible panels.
  K.drawStrip = function (ctx, t, S, camY, o = {}) {
    const [sx, sy] = o.shake || [0, 0], cull = o.cull ?? 260, y0 = camY - cull, y1 = camY + H + cull;
    ctx.save(); ctx.translate(sx, sy - camY);
    // gutter: the strip background ramp over the visible range
    const b = S.bg;
    if (b.length === 1) { ctx.fillStyle = b[0][1]; ctx.fillRect(-40, camY - 40, W + 80, H + 80); }
    else { const g = ctx.createLinearGradient(0, camY - 40, 0, camY + H + 40), span = H + 80;
      g.addColorStop(0, K.gutterAt(S, camY - 40)); for (const [y, c] of b) if (y > camY - 40 && y < camY + H + 40) g.addColorStop((y - camY + 40) / span, c);
      g.addColorStop(1, K.gutterAt(S, camY + H + 40)); ctx.fillStyle = g; ctx.fillRect(-40, camY - 40, W + 80, H + 80); }
    const vis = [];
    for (const P of S.panels) {
      if (P.y + P.h + 80 < y0 || P.y - 80 > y1) { P.on = false; continue; }
      P.on = true; P.rel = (P.y + P.h / 2) - (camY + H / 2); P.camY = camY; vis.push(P);
      K.drawPanel(ctx, t, P, S);
    }
    for (const P of vis) if (P.over) { ctx.save(); ctx.translate(P.x, P.y); if (P.overCam !== false) applyCam(ctx, t, P); P.over(ctx, t, P); ctx.restore(); }
    if (o.over) o.over(ctx, t);
    ctx.restore();
    return vis;
  };
  function applyCam(ctx, t, P) {
    if (!P.cam) return; const c = P.cam(t, P); if (!c) return;
    const z = c.z ?? 1, fx = c.fx ?? P.w / 2, fy = c.fy ?? P.h / 2;
    ctx.translate(fx + (c.dx || 0), fy + (c.dy || 0)); if (c.r) ctx.rotate(c.r); ctx.scale(z, z); ctx.translate(-fx, -fy);
  }
  K.applyCam = applyCam;
  // toStrip(P, t, p) → strip coords of a panel-local point p seen through the panel's cam (aim a balloon tail at a mouth)
  K.toStrip = function (P, t, p) {
    let x = p[0], y = p[1];
    if (P.cam) { const c = P.cam(t, P); if (c) { const z = c.z ?? 1, fx = c.fx ?? P.w / 2, fy = c.fy ?? P.h / 2, r = c.r || 0;
      let ux = (x - fx) * z, uy = (y - fy) * z; const cs = Math.cos(r), sn = Math.sin(r); x = fx + (c.dx || 0) + ux * cs - uy * sn; y = fy + (c.dy || 0) + ux * sn + uy * cs; } }
    return [P.x + x, P.y + y];
  };
  // drawPanel(ctx, t, P, S): one panel (drawStrip calls it; call it yourself for a panel outside a strip, ctx in strip/screen coords)
  K.drawPanel = function (ctx, t, P, S) {
    ctx.save(); ctx.translate(P.x, P.y);
    ctx.save(); ctx.clip(P.path);
    if (P.bg) { if (typeof P.bg === 'function') P.bg(ctx, t, P); else { ctx.fillStyle = P.bg; ctx.fillRect(-2, Math.min(0, ...P.poly.map(q => q[1])) - 2, P.w + 4, P.h + 80); } }
    if (P.draw) { ctx.save(); applyCam(ctx, t, P); P.draw(ctx, t, P); ctx.restore(); }
    if (P.border === 'fade' || P.border === 'none' && P.feather) {   // borderless: soft edges into the gutter colour
      const f = P.feather || 90, gt = S ? K.gutterAt(S, P.y) : K.C.paper, gb = S ? K.gutterAt(S, P.y + P.h) : K.C.paper;
      let g = ctx.createLinearGradient(0, 0, 0, f); g.addColorStop(0, gt); g.addColorStop(1, K.rgba(gt, 0)); ctx.fillStyle = g; ctx.fillRect(-2, -2, P.w + 4, f + 2);
      g = ctx.createLinearGradient(0, P.h - f, 0, P.h); g.addColorStop(0, K.rgba(gb, 0)); g.addColorStop(1, gb); ctx.fillStyle = g; ctx.fillRect(-2, P.h - f, P.w + 4, f + 2);
      if (P.x > 0 && !P.noSideFade) { const gs = K.gutterAt(S || { bg: [[0, K.C.paper]] }, P.y + P.h / 2), f2 = f * .6;
        g = ctx.createLinearGradient(0, 0, f2, 0); g.addColorStop(0, gs); g.addColorStop(1, K.rgba(gs, 0)); ctx.fillStyle = g; ctx.fillRect(-2, 0, f2, P.h);
        g = ctx.createLinearGradient(P.w - f2, 0, P.w, 0); g.addColorStop(0, K.rgba(gs, 0)); g.addColorStop(1, gs); ctx.fillStyle = g; ctx.fillRect(P.w - f2, 0, f2 + 2, P.h); }
    }
    ctx.restore();
    const bd = P.border || 'ink';
    if (bd === 'ink' || bd === 'thin') { ctx.strokeStyle = P.ink || K.C.border; ctx.lineWidth = P.lw || (bd === 'thin' ? 2.5 : 5); ctx.lineJoin = 'miter'; ctx.stroke(P.path); }
    else if (bd === 'bleed') { ctx.strokeStyle = P.ink || K.C.border; ctx.lineWidth = P.lw || 5; ctx.beginPath(); ctx.moveTo(0, P.poly[0][1]); ctx.lineTo(P.w, P.poly[1][1]); ctx.moveTo(0, P.h + (P.cut ? P.cut[3] : 0)); ctx.lineTo(P.w, P.h + (P.cut ? P.cut[2] : 0)); ctx.stroke(); }
    else if (bd === 'rough') K.roughPoly(ctx, P.poly, K.hash(P.id || 'p', K.boil(t, 8)), P.lw || 5, P.ink || K.C.border);
    ctx.restore();
  };
  // roughPoly(ctx, pts, seed, lw, col): a hand-drawn closed border — each edge one bowed cubic, drawn twice (Rough.js idea:
  //   control points at 0.2–0.4 / 2×, offset gain 1 → 0.4 with length). Boil it by changing the seed at 8 fps (gags only).
  K.roughPoly = function (ctx, pts, seed, lw, col) {
    const r = rng(seed); ctx.strokeStyle = col; ctx.lineWidth = lw * .7; ctx.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], len = K.dist(a, b), gain = len < 200 ? 1 : len > 500 ? .4 : -.0016668 * len + 1.233334;
      const off = Math.min(len / 10, 2) * gain * 2.2, j = () => (r() - .5) * 2 * off, d1 = .2 + .2 * r(), d2 = 2 * d1;
      ctx.beginPath(); ctx.moveTo(a[0] + j(), a[1] + j());
      ctx.bezierCurveTo(lerp(a[0], b[0], d1) + j(), lerp(a[1], b[1], d1) + j(), lerp(a[0], b[0], Math.min(.95, d2)) + j(), lerp(a[1], b[1], Math.min(.95, d2)) + j(), b[0] + j(), b[1] + j()); ctx.stroke();
    }
  };
  // breakGap(ctx, path, w = 12, col = C.paper): a paper-coloured halo stroked round a shape that breaks out of its panel, so it reads
  //   as in front of the border (RESEARCH §5). Call in P.over before drawing the breaking shape.
  K.breakGap = function (ctx, p, w = 12, col = K.C.paper) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w * 2; ctx.lineJoin = 'round'; ctx.stroke(p); ctx.restore(); };
  // kenBurns(t, t0, t1, z1 = 1.06, fx, fy, ease = eio) → a P.cam value: a slow push-in over the hold (never > 1.12, RESEARCH §6)
  K.kenBurns = (t, t0, t1, z1 = 1.06, fx, fy, ease = eio) => ({ z: lerp(1, Math.min(1.12, z1), ease((t - t0) / (t1 - t0))), fx, fy });
  // punch(t, t0, o) → { z, dx, dy }: the zoom punch — content 1.25 → 1 with easeOutBack over .18 s, plus a decaying shake
  //   A·e^(−τ/.12)·sin(2π·28τ), A = 14 (RESEARCH §7). o { z0, dur, A, tau, f }. Merge into a P.cam with mixCam.
  K.punch = function (t, t0, o = {}) {
    if (t < t0) return { z: 1, dx: 0, dy: 0 }; const u = t - t0, d = o.dur ?? .18, z0 = o.z0 ?? 1.25, A = o.A ?? 14, tau = o.tau ?? .12, f = o.f ?? 28;
    const z = u < d ? lerp(z0, 1, K.backOut(u / d, 1.4)) : 1, e = A * Math.exp(-u / tau);
    return { z, dx: e * Math.sin(TAU * f * u), dy: e * .7 * Math.cos(TAU * f * 1.13 * u + 1) };
  };
  // shake(t, t0, A = 14, tau = .14, f = 26) → [dx, dy]: a decaying frame shake (pass to drawStrip's o.shake)
  K.shake = function (t, t0, A = 14, tau = .14, f = 26) { if (t < t0) return [0, 0]; const u = t - t0, e = A * Math.exp(-u / tau); if (e < .3) return [0, 0];
    return [e * Math.sin(TAU * f * u), e * .8 * Math.cos(TAU * f * 1.21 * u + .7)]; };
  // tremble(t, A = 3, fps = 12, seed = 1) → [dx, dy]: a stepped nervous jitter (rumble, fear, a held shout)
  K.tremble = (t, A = 3, fps = 12, seed = 1) => { const r = K.rnd(seed, K.boil(t, fps)); return [(r() - .5) * 2 * A, (r() - .5) * 2 * A]; };
  // mixCam(...cams) → one cam: zooms multiply, offsets add, the first focal point wins
  K.mixCam = (...cs) => { const o = { z: 1, dx: 0, dy: 0, r: 0 }; for (const c of cs) { if (!c) continue; o.z *= c.z ?? 1; o.dx += c.dx || 0; o.dy += c.dy || 0; o.r += c.r || 0;
    if (o.fx == null && c.fx != null) { o.fx = c.fx; o.fy = c.fy; } } return o; };

  // ================================================================ text layout (Korean, 어절 breaks)
  // layout(ctx, s, font, size, maxW, o) → { lines, w, h, lh, size }: s is ALREADY translated. Breaks only at spaces (어절, `keep-all`),
  //   choosing the split that minimises the longest line (balanced, ≤ 3 lines; '\n' forces a break); shrinks the size if a line still
  //   does not fit. Drops one final '.' (webtoon practice) unless o.keepDot. o.lh = line height (1.25), o.weight.
  K.layout = function (ctx, s, font, size, maxW, o = {}) {
    s = String(s); if (!o.keepDot && /[^.]\.$/.test(s)) s = s.slice(0, -1);
    const wt = o.weight || 400, lhK = o.lh || 1.25;
    for (let pass = 0; pass < 6; pass++) {
      ctx.font = `${wt} ${size}px ${font}`; if (o.ls) ctx.letterSpacing = o.ls + 'px';
      const mw = x => ctx.measureText(x).width, lines = [];
      for (const para of s.split('\n')) {
        const tok = para.split(' ').filter(x => x.length);
        if (tok.length <= 1) { lines.push(para); continue; }
        let best = null;
        for (let n = 1; n <= Math.min(3, tok.length); n++) {
          // all ways to cut tok into n lines (n − 1 cut points); tokens are few in a balloon
          const cuts = [], rec = (start, left, acc) => { if (left === 0) { cuts.push(acc); return; } for (let i = start; i <= tok.length - left; i++) rec(i + 1, left - 1, acc.concat(i)); };
          rec(1, n - 1, []);
          for (const c of cuts) { const ls = []; let a = 0; for (const b of c.concat(tok.length)) { ls.push(tok.slice(a, b).join(' ')); a = b; }
            const m = Math.max(...ls.map(mw)), score = m + (n - 1) * size * .35; if (!best || (best.m > maxW && m < best.m) || (m <= maxW && score < best.score && (best.m > maxW || n <= best.n || m < best.m * .82))) best = { ls, m, score, n }; }
          if (best && best.m <= maxW && n >= 1 && best.n === n) break;
        }
        lines.push(...best.ls);
      }
      const w = Math.max(...lines.map(mw));
      ctx.letterSpacing = '0px';
      if (w <= maxW * 1.02 || pass === 5) return { lines, w, h: lines.length * size * lhK, lh: size * lhK, size, font, weight: wt };
      size *= Math.max(.8, maxW / w);
    }
  };
  // textBlock(ctx, L, x, y, o): draw a layout L centred (or o.align 'left') at (x, y) = centre of the block; o { color, halo, haloW, n (chars
  //   shown, for type-in), alpha }. Uses fillText directly (the string was translated before layout).
  K.textBlock = function (ctx, L, x, y, o = {}) {
    ctx.font = `${L.weight || 400} ${L.size}px ${L.font}`; ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'alphabetic';
    const x0 = o.align === 'left' ? x - L.w / 2 : x; let left = o.n ?? 1e9;
    for (let i = 0; i < L.lines.length; i++) {
      let s = L.lines[i]; if (left <= 0) break; const ch = Pilot.chars(s); if (ch.length > left) { s = ch.slice(0, left).join(''); } left -= ch.length;
      const yy = y - L.h / 2 + i * L.lh + L.lh / 2 + L.size * .36;
      if (o.halo) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.halo; ctx.lineWidth = o.haloW || L.size * .22; ctx.strokeText(s, x0, yy); }
      ctx.fillStyle = o.color || K.C.ink; ctx.fillText(s, x0, yy);
    }
  };

  // ================================================================ balloons (말풍선)
  // balloon(ctx, t, b) / balloons(ctx, t, [b…]) → geometry { x, y, a, b, w, h } per balloon (null when hidden).
  //   b = { kind: 'talk' | 'shout' | 'think' | 'whisper' | 'narr' | 'mono' | 'wobble', text (Korean; translated inside),
  //         x, y (centre, current coords), tail: [x, y] (the speaker's mouth — head for 'think'; omit = no tail), at (pop-in time),
  //         out (gone by), dur (alternative to out), size (46 talk / 54 shout / 60 think / 40 narr), font, color, maxW (520),
  //         w, h (fixed body size), pad, lw (4), fill, ink, reach (tail length factor .55), bend (tail curve ±1), seed,
  //         type: chars per second (typed in; default instant — webtoon text appears all at once), align (narr), dark (narr: black box),
  //         join: i (linked to balloon i of the same list: merged outline if they overlap, a joiner bar if not) }
  //   A list drawn with balloons() merges every outline that overlaps (one silhouette): pass 1 strokes all at 2·lw, pass 2 fills all.
  //   Pop-in: .6 → ~1.08 → 1 over .22 s (shout: .6 → 1.12 → 1 + 3 px shake for .3 s); out: .15 s fade.
  const BCACHE = new Map();
  function bGeom(ctx, b) {
    const kind = b.kind || 'talk', tr = Pilot.tr(b.text || '');
    const key = [kind, tr, b.size, b.font, b.maxW, b.w, b.h, b.pad, b.seed, Pilot.lang].join('|'); let g = BCACHE.get(key);
    if (g) return g;
    const size = b.size || { talk: 46, shout: 56, think: 58, whisper: 40, narr: 38, mono: 60, wobble: 46 }[kind] || 46;
    const font = b.font || { talk: K.F.talk, shout: K.F.shout, think: K.F.think, whisper: K.F.talk, narr: K.F.sans, mono: K.F.think, wobble: K.F.talk }[kind];
    const L = tr ? K.layout(ctx, tr, font, size, b.maxW || (kind === 'narr' ? 760 : 520), { weight: kind === 'narr' ? 500 : 400, keepDot: kind === 'narr' && b.keepDot !== false || b.keepDot })
      : { lines: [], w: 0, h: 0, lh: 0, size, font };
    const pad = b.pad ?? L.size * .42, n = kind === 'shout' ? 2.1 : 2.35, f = Math.pow(2, 1 / n);
    let A = b.w ? b.w / 2 : (L.w / 2 + pad) * f, B = b.h ? b.h / 2 : (L.h / 2 + pad * .9) * f;
    if (kind === 'narr') { A = b.w ? b.w / 2 : L.w / 2 + pad * 1.2; B = b.h ? b.h / 2 : L.h / 2 + pad; }
    if (kind === 'think') { A *= 1.06; B *= 1.12; }
    A = Math.max(A, B * 1.15);
    const seed = b.seed ?? K.hash(tr, kind);
    let pts = null;
    if (kind === 'shout') pts = burstPts(A, B, seed);
    else if (kind === 'think') pts = cloudPts(A, B, seed);
    else if (kind !== 'narr' && kind !== 'mono') pts = sePts(A, B, n, 72);
    g = { kind, L, A, B, pts, seed, n, body: pts && kind !== 'think' ? K.poly(pts) : null };
    if (kind === 'think') g.body = cloudPath(pts, A, B, seed);
    if (kind === 'narr') g.body = K.rr(-A, -B, A * 2, B * 2, b.r ?? 6);
    BCACHE.set(key, g); if (BCACHE.size > 400) BCACHE.delete(BCACHE.keys().next().value);
    return g;
  }
  function sePts(a, b, n, N) { const o = []; for (let i = 0; i < N; i++) { const th = i / N * TAU, c = Math.cos(th), s = Math.sin(th);
    o.push([a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)]); } return o; }
  // the shout burst: ~14–26 spikes (postext 14, depth .22), seeded ±25 % jitter on angle and depth
  function burstPts(a, b, seed) { const r = rng(seed), per = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))), N = clamp(Math.round(per / 62), 12, 26), o = [];
    for (let i = 0; i < N * 2; i++) { const th = (i + (r() - .5) * .5) / (N * 2) * TAU, c = Math.cos(th), s = Math.sin(th), spike = i % 2 === 0;
      const k = spike ? 1.22 + .18 * (r() - .3) : .98 + .04 * r(); o.push([a * k * Math.sign(c) * Math.pow(Math.abs(c), 2 / 2.1), b * k * Math.sign(s) * Math.pow(Math.abs(s), 2 / 2.1)]); } return o; }
  // the thought cloud: outline points every ~44 px with seeded jitter ≤ ½ spacing, joined by OUTWARD arcs (comical-js thoughtBubble)
  function cloudPts(a, b, seed) { const r = rng(seed), per = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))), N = Math.max(7, Math.round(per / 58)), o = [];
    for (let i = 0; i < N; i++) { const th = (i + (r() - .5) * .45) / N * TAU; o.push([Math.cos(th) * a * .93, Math.sin(th) * b * .9]); } return o; }
  function cloudPath(pts, a, b, seed) { const r = rng(seed + 1), p = new Path2D(), n = pts.length;
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < n; i++) { const q0 = pts[i], q1 = pts[(i + 1) % n], m = K.lerpP(q0, q1, .5), d = K.dist(q0, q1), ln = Math.hypot(m[0] / a, m[1] / b) || 1;
      const dep = d * (.42 - .12 * r()); p.quadraticCurveTo(m[0] + m[0] / ln / a * dep * 1.0 * a / Math.max(a, 1) , m[1] + m[1] / ln / b * dep * b / Math.max(b, 1), q1[0], q1[1]); }
    p.closePath(); return p; }
  // tail geometry (comical-js arc tail): root on the outline where centre→target crosses it, base ±bw along the outline,
  //   a quadratic each side through a mid point bowed by 0.2·dist (straightening near the axes), tip short of the target
  function tailPath(g, tx, ty, b) {
    const pts = g.pts || sePts(g.A, g.B, 2.35, 72), n = pts.length, ang = Math.atan2(ty, tx);
    let bi = 0, bd = 1e9; for (let i = 0; i < n; i++) { const d = Math.abs(((Math.atan2(pts[i][1], pts[i][0]) - ang + 3 * Math.PI) % TAU) - Math.PI); if (d < bd) { bd = d; bi = i; } }
    const root = pts[bi], dist = Math.hypot(tx - root[0], ty - root[1]); if (dist < 8) return null;
    const bw = (b.tailW ?? (g.kind === 'shout' ? 26 : 19)), step = K.dist(pts[0], pts[1]) || 10, k = Math.max(1, Math.round(bw / step));
    const b1 = pts[(bi - k + n) % n], b2 = pts[(bi + k) % n];
    const len = b.reach === 1 ? dist - 18 : Math.min(dist - 22, Math.max(64, dist * (b.reach ?? .55)), b.tailMax ?? 190);
    if (len < 10) return null;
    const ux = (tx - root[0]) / dist, uy = (ty - root[1]) / dist, tip = [root[0] + ux * len, root[1] + uy * len];
    const p = new Path2D();
    if (g.kind === 'shout') { p.moveTo(b1[0] - ux * 4, b1[1] - uy * 4); p.lineTo(tip[0], tip[1]); p.lineTo(b2[0] - ux * 4, b2[1] - uy * 4); p.closePath(); return { p, tip }; }
    const bend = (b.bend ?? 1) * .2 * len * Math.min(1, Math.abs(ux * uy) * 2.4 + .25), mx = root[0] + ux * len * .5 - uy * bend, my = root[1] + uy * len * .5 + ux * bend;
    const ins = 6;   // start a little inside the body so the merge is clean
    p.moveTo(b1[0] - ux * ins, b1[1] - uy * ins); p.quadraticCurveTo(mx + (b1[0] - root[0]) * .35, my + (b1[1] - root[1]) * .35, tip[0], tip[1]);
    p.quadraticCurveTo(mx + (b2[0] - root[0]) * .35, my + (b2[1] - root[1]) * .35, b2[0] - ux * ins, b2[1] - uy * ins); p.closePath();
    return { p, tip };
  }
  // thought tail: shrinking bubbles from the cloud toward the head (radius 7 → 20 ×1.35 tip → root, gaps growing), popping in sequence
  function thoughtTail(g, tx, ty, t, at) {
    const d = Math.hypot(tx, ty), ux = tx / d, uy = ty / d, edge = Math.min(Math.abs(g.A / (ux || 1e-6)), Math.abs(g.B / (uy || 1e-6))) * .92;
    const out = []; let s = edge + 8, r = 17, i = 0; const end = d - 14;
    while (s + r < end && i < 4) { out.push({ x: ux * (s + r), y: uy * (s + r), r, on: K.pop(t, at + i * .06, .16, .4, 2) }); s += 2 * r + 6 + i * 2; r = Math.max(7, r * .7); i++; }
    return out.reverse();
  }
  function bState(t, b) {
    const at = b.at ?? -1e9, out = b.out ?? (b.dur != null ? at + b.dur : 1e9);
    if (t < at || t > out) return null;
    const kind = b.kind || 'talk', sh = kind === 'shout';
    let sc = b.noPop ? 1 : K.pop(t, at, sh ? .2 : .22, .6, sh ? 4 : 2.6), a = 1 - ss(out - .15, out, t);
    if (kind === 'mono' || kind === 'narr') { sc = b.noPop ? 1 : lerp(.92, 1, eo((t - at) / .25)); a *= ss(at, at + .2, t); }
    let dx = 0, dy = 0; if (sh && t - at < .3) { const [x, y] = K.tremble(t, 3 * (1 - (t - at) / .3), 30, b.seed || 3); dx = x; dy = y; }
    return { sc, a, dx, dy, at };
  }
  K.balloons = function (ctx, t, list) {
    const items = [];
    for (const b of list) { if (!b) { items.push(null); continue; } const st = bState(t, b); if (!st) { items.push(null); continue; }
      const g = bGeom(ctx, b); items.push({ b, g, st }); }
    const lw = it => it.b.lw ?? (it.g.kind === 'narr' ? 3 : 4), ink = it => it.b.ink || K.C.ink;
    const xf = (it) => { ctx.translate(it.b.x + it.st.dx, it.b.y + it.st.dy); ctx.scale(it.st.sc, it.st.sc); };
    const tails = items.map(it => (it && it.b.tail && it.g.kind !== 'think' && it.g.kind !== 'narr' && it.g.kind !== 'mono') ? tailPath(it.g, it.b.tail[0] - it.b.x, it.b.tail[1] - it.b.y, it.b) : null);
    // joiners between linked balloons that do not overlap (constant width bar)
    const joins = []; items.forEach((it, i) => { if (!it || it.b.join == null) return; const o = items[it.b.join]; if (!o) return;
      joins.push({ a: [it.b.x, it.b.y], c: [o.b.x, o.b.y], w: Math.min(it.g.B, o.g.B) * .55, al: Math.min(it.st.a, o.st.a) * Math.min(1, it.st.sc, o.st.sc) }); });
    // pass 1: outlines
    for (const j of joins) { ctx.save(); ctx.globalAlpha *= j.al; ctx.strokeStyle = K.C.ink; ctx.lineCap = 'round'; ctx.lineWidth = j.w + 8; ctx.beginPath(); ctx.moveTo(...j.a); ctx.lineTo(...j.c); ctx.stroke(); ctx.restore(); }
    items.forEach((it, i) => { if (!it || it.g.kind === 'mono') return; const { g, b, st } = it;
      ctx.save(); ctx.globalAlpha *= st.a; xf(it); ctx.lineJoin = 'round'; ctx.strokeStyle = ink(it); ctx.lineWidth = lw(it) * 2;
      if (g.kind === 'whisper') ctx.setLineDash([14, 10]);
      if (g.body) ctx.stroke(g.body); if (tails[i]) ctx.stroke(tails[i].p);
      if (g.kind === 'think' && b.tail) for (const q of thoughtTail(g, b.tail[0] - b.x, b.tail[1] - b.y, t, st.at)) if (q.on > 0) { ctx.beginPath(); ctx.ellipse(q.x, q.y, (q.r + 3) * q.on, q.r * q.on, 0, 0, TAU); ctx.stroke(); }
      ctx.restore(); });
    // pass 2: fills (covers the inner half of every stroke → overlapping balloons merge into one outline)
    for (const j of joins) { ctx.save(); ctx.globalAlpha *= j.al; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineWidth = j.w; ctx.beginPath(); ctx.moveTo(...j.a); ctx.lineTo(...j.c); ctx.stroke(); ctx.restore(); }
    items.forEach((it, i) => { if (!it || it.g.kind === 'mono') return; const { g, b, st } = it;
      ctx.save(); ctx.globalAlpha *= st.a; xf(it);
      ctx.fillStyle = b.fill || (g.kind === 'narr' ? (b.dark ? K.C.black : '#fff') : '#fff');
      if (g.body) ctx.fill(g.body); if (tails[i]) ctx.fill(tails[i].p);
      if (g.kind === 'think' && b.tail) for (const q of thoughtTail(g, b.tail[0] - b.x, b.tail[1] - b.y, t, st.at)) if (q.on > 0) { ctx.beginPath(); ctx.ellipse(q.x, q.y, (q.r + 3) * q.on, q.r * q.on, 0, 0, TAU); ctx.fill(); }
      ctx.restore(); });
    // pass 3: words
    const geo = [];
    items.forEach((it) => { if (!it) { geo.push(null); return; } const { g, b, st } = it;
      ctx.save(); ctx.globalAlpha *= st.a; xf(it);
      const n = b.type ? Math.floor(Math.max(0, t - st.at - .08) * b.type) : undefined;
      const col = b.color || (g.kind === 'whisper' ? '#5a5258' : g.kind === 'narr' && b.dark ? '#fff' : K.C.ink);
      if (g.kind === 'mono') K.textBlock(ctx, g.L, 0, 0, { color: col, halo: b.halo ?? 'rgba(255,255,255,.92)', haloW: g.L.size * .24, n });
      else K.textBlock(ctx, g.L, g.kind === 'narr' && b.align === 'left' ? 0 : 0, g.kind === 'think' ? -2 : 0, { color: col, n, align: g.kind === 'narr' ? b.align : undefined });
      ctx.restore(); geo.push({ x: b.x, y: b.y, a: g.A, b: g.B, w: g.A * 2, h: g.B * 2 }); });
    return geo;
  };
  K.balloon = (ctx, t, b) => K.balloons(ctx, t, [b])[0];
  // balloonSize(ctx, b) → { w, h } of the body at rest (lay out balloons before showing them)
  K.balloonSize = (ctx, b) => { const g = bGeom(ctx, b); return { w: g.A * 2, h: g.B * 2 }; };

  // ================================================================ lettering: SFX (효과음)
  // sfx(ctx, t, o) → bbox: onomatopoeia drawn into the art, laid out PER SYLLABLE (RESEARCH §19).
  //   o = { text, x, y (start of the word baseline centre-left… see align), size = 130, at = 0, out, font = F.sfx, align: 'center'|'left',
  //         fill = '#fff' (or [top, bottom] gradient), ink = C.black, halo = '#fff' (null = none), haloW = .2·size, inkW = .09·size,
  //         rot = −.1 (word angle), step = .82 (advance per syllable × size), grow = [1, 1.3] (size along the word), wild = .3
  //         (± rad per syllable), skew = −.15, bob = .1 (baseline jitter × size), stagger = .05, popDur = .16, shake = 5 (px after pop),
  //         shakeDur = .3, beat (Hz: heartbeat pulse 1 + .08·max(0, sin)²), echo: n (ghost copies at α .5/.25), echoDir = [dx, dy],
  //         tremble (px, 12 fps jitter forever — rumbles), arc (bend of the baseline, px), seed, alpha, shadow (drop offset px) }
  K.sfx = function (ctx, t, o) {
    const at = o.at || 0; if (t < at) return null; const out = o.out ?? 1e9; if (t > out) return null;
    const s = Pilot.tr(o.text), ch = Pilot.chars(s), n = ch.length, r = rng(o.seed ?? K.hash(s, 'sfx'));
    const size = o.size || 130, font = o.font || K.F.sfx, rot = o.rot ?? -.1, step = o.step ?? .82, gr = o.grow || [1, 1.3], wild = o.wild ?? .3;
    const glyphs = []; let adv = 0;
    for (let i = 0; i < n; i++) { const k = n > 1 ? i / (n - 1) : 0, sc = lerp(gr[0], gr[1], k); const g = { c: ch[i], sc, rot: (r() - .5) * 2 * wild, by: (r() - .5) * 2 * (o.bob ?? .1) * size, ox: adv };
      adv += size * sc * step; glyphs.push(g); }
    const total = adv - size * glyphs[n - 1].sc * step * .5;
    const ax = o.align === 'left' ? 0 : -total / 2 + size * glyphs[0].sc * step * .5 - size * .1;
    const al = (o.alpha ?? 1) * (1 - ss(out - .2, out, t));
    const beat = o.beat ? 1 + .08 * Math.pow(Math.max(0, Math.sin(TAU * o.beat * (t - at))), 2) : 1;
    ctx.save(); ctx.globalAlpha *= al; ctx.translate(o.x, o.y); ctx.rotate(rot); ctx.scale(beat, beat);
    const draw = (ex, ey, ea) => {
      for (let i = 0; i < n; i++) { const g = glyphs[i], k0 = at + i * (o.stagger ?? .05), k = (t - k0) / (o.popDur ?? .16); if (k <= 0) continue;
        const pk = o.noPop ? 1 : K.popPeak(clamp(k)), shk = (o.shake ?? 5) * (1 - clamp((t - k0 - (o.popDur ?? .16)) / (o.shakeDur ?? .3)));
        let jx = 0, jy = 0; if (shk > 0 && k > 1) { const q = K.rnd(i, K.boil(t, 30), o.seed || 1); jx = (q() - .5) * 2 * shk; jy = (q() - .5) * 2 * shk; }
        if (o.tremble) { const [a, b] = K.tremble(t, o.tremble, 12, i * 7 + (o.seed || 0)); jx += a; jy += b; }
        const x = ax + g.ox + jx + ex, arcY = o.arc ? -o.arc * Math.sin(Math.PI * (n > 1 ? i / (n - 1) : .5)) : 0, y = g.by + arcY + jy + ey;
        ctx.save(); ctx.globalAlpha *= ea; ctx.translate(x, y); ctx.rotate(g.rot); ctx.transform(1, 0, o.skew ?? -.15, 1, 0, 0); ctx.scale(g.sc * pk, g.sc * pk);
        ctx.font = `400 ${size}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
        if (o.shadow) { ctx.fillStyle = K.rgba(o.ink || K.C.black, .35); ctx.fillText(g.c, o.shadow, o.shadow); }
        if (o.halo !== null) { ctx.strokeStyle = o.halo || '#fff'; ctx.lineWidth = o.haloW ?? size * .2; ctx.strokeText(g.c, 0, 0); }
        ctx.strokeStyle = o.ink || K.C.black; ctx.lineWidth = o.inkW ?? size * .09; ctx.strokeText(g.c, 0, 0);
        if (Array.isArray(o.fill)) { const gg = ctx.createLinearGradient(0, -size * .45, 0, size * .45); gg.addColorStop(0, o.fill[0]); gg.addColorStop(1, o.fill[1]); ctx.fillStyle = gg; }
        else ctx.fillStyle = o.fill || '#fff';
        ctx.fillText(g.c, 0, 0); ctx.restore(); }
    };
    if (o.echo) { const [ex, ey] = o.echoDir || [-size * .12, size * .1]; for (let e = o.echo; e >= 1; e--) draw(ex * e, ey * e, e === 1 ? .5 : .25); }
    draw(0, 0, 1);
    ctx.restore();
    return { x: o.x + ax, y: o.y - size * .6, w: total, h: size * 1.2 };
  };
  // rumble(ctx, t, o): the "ゴゴゴ" menace lettering as 쿠구구구 — dark violet letters with a thin pale halo, trembling forever,
  //   staggered down a diagonal (o.lines = 2 copies). Same options as sfx (defaults changed).
  K.rumble = function (ctx, t, o) {
    const base = { size: 96, fill: ['#5b3a7e', '#24142f'], ink: '#0e0912', halo: 'rgba(240,230,255,.9)', haloW: 10, inkW: 7, rot: .08, wild: .06, grow: [.9, 1.15],
      tremble: 3, stagger: .09, step: .78, bob: .04, skew: -.05, shake: 0 };
    const lines = o.lines ?? 1;
    for (let i = 0; i < lines; i++) K.sfx(ctx, t, Object.assign({}, base, o, { x: o.x + i * (o.dx ?? 60), y: o.y + i * (o.dy ?? 120), at: (o.at || 0) + i * .25, seed: (o.seed || 0) + i }));
  };

  // ================================================================ effect lines, tones, mood backgrounds
  // focus(ctx, t, o): concentration lines (집중선) — hitode909/speedline: θ += .02·(.5 + rnd); a filled TRIANGLE per step, apex on the inner
  //   ellipse .75·(1 + .3·rnd)·(rx, ry), base on the outer ellipse 2·(rx, ry) spanning .02·bold·(.3 + .7·rnd). ~314 wedges, re-randomised
  //   (boiled) at fps = 10. o { x, y, w, h (clip rect; omit = no clip), cx, cy (centre), rx, ry (default w/2, h/2), inner = .75, bold = 1.1,
  //   step = .02, color = C.black, alpha = 1, fps = 10, seed, at (lines rush in: inner 1.25 → .75 over .15 s), jitter = .3 }
  K.focus = function (ctx, t, o = {}) {
    const x = o.x ?? 0, y = o.y ?? 0, w = o.w ?? W, h = o.h ?? H, cx = o.cx ?? x + w / 2, cy = o.cy ?? y + h / 2, rx = o.rx ?? w / 2, ry = o.ry ?? h / 2;
    const r = K.rnd(o.seed ?? 1, o.fps === 0 ? 0 : K.boil(t, o.fps ?? 10)), step = o.step ?? .02, bold = o.bold ?? 1.1, jit = o.jitter ?? .3;
    let inner = o.inner ?? .75; if (o.at != null) { if (t < o.at) return; inner = lerp(1.25, inner, eo((t - o.at) / .15)); }
    ctx.save(); if (o.w != null) { ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); }
    ctx.globalAlpha *= o.alpha ?? 1; ctx.fillStyle = o.color || K.C.black; ctx.beginPath();
    for (let th = 0; th < TAU; th += step * (.5 + r())) {
      const ri = inner * (1 + jit * r()), t2 = th + step * bold * (.3 + .7 * r());
      ctx.moveTo(cx + Math.sin(th) * rx * ri, cy + Math.cos(th) * ry * ri); ctx.lineTo(cx + Math.sin(th) * rx * 2.2, cy + Math.cos(th) * ry * 2.2); ctx.lineTo(cx + Math.sin(t2) * rx * 2.2, cy + Math.cos(t2) * ry * 2.2); ctx.closePath();
    }
    ctx.fill(); ctx.restore();
  };
  // speed(ctx, t, o): parallel speed lines (속도선) along the motion — o { x, y, w, h (region, clipped), ang (direction of motion, rad),
  //   n = 80, v = 2600 (px/s scroll of the streaks), len = [200, 900], th = [2, 10], color, alpha, seed, gap: { cx, cy, rx, ry } (kept clear
  //   round the subject), taper: the thick end leads }
  K.speed = function (ctx, t, o = {}) {
    const x = o.x ?? 0, y = o.y ?? 0, w = o.w ?? W, h = o.h ?? H, ang = o.ang ?? 0, D = Math.hypot(w, h), r = rng(o.seed ?? 5), n = o.n ?? 80;
    const len = o.len || [200, 900], th = o.th || [2, 10], v = o.v ?? 2600;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); if (o.gap) { const g = o.gap; ctx.moveTo(g.cx + g.rx, g.cy); ctx.ellipse(g.cx, g.cy, g.rx, g.ry, 0, 0, TAU); ctx.clip('evenodd'); } else ctx.clip();
    ctx.translate(x + w / 2, y + h / 2); ctx.rotate(ang); ctx.globalAlpha *= o.alpha ?? 1; ctx.fillStyle = o.color || K.C.black; ctx.beginPath();
    for (let i = 0; i < n; i++) { const ly = (r() - .5) * D, L = lerp(len[0], len[1], r()), T = lerp(th[0], th[1], r() * r()), sp = v * (.7 + .6 * r()), span = D + L;
      const hx = (((r() * span + sp * t) % span) + span) % span - D / 2;   // the leading (thick) end
      ctx.moveTo(hx, ly - T / 2); ctx.lineTo(hx, ly + T / 2); ctx.lineTo(hx - L, ly); ctx.closePath(); }
    ctx.fill(); ctx.restore();
  };
  // tone levels (ComfyUI-MangaScreen): paper, light 18 %, dark 42 %, black — toneLevel(v) quantises a darkness 0…1 (white point .2, black point .7)
  K.TONE = { light: .18, dark: .42 };
  K.toneLevel = v => v < .2 ? 0 : v < .45 ? .18 : v < .7 ? .42 : 1;
  const TP = new Map();
  // tonePattern(ctx, cov, pitch = 12, color = C.tone) → a cached CanvasPattern: a 45° AM dot screen (dots at the cell centre + corners of a
  //   pitch·√2 tile = a 45° grid of pitch `pitch`), dot radius by the sqrt rule (area ∝ coverage, ×1.13 so dots merge near 80 %). Keep pitch ≥ 8.
  K.tonePattern = function (ctx, cov, pitch = 12, color = K.C.tone) {
    cov = clamp(cov, 0, 1); const key = [Math.round(cov * 100), pitch, color].join('|'); let p = TP.get(key); if (p) return p;
    const s = Math.max(4, Math.round(pitch * Math.SQRT2)), c = Pilot.canvas(s, s), g = c.getContext('2d'), rad = s / (2 * Math.SQRT2) * Math.sqrt(cov) * 1.13;
    g.fillStyle = color; for (const [qx, qy] of [[s / 2, s / 2], [0, 0], [s, 0], [0, s], [s, s]]) { g.beginPath(); g.arc(qx, qy, rad, 0, TAU); g.fill(); }
    p = ctx.createPattern(c, 'repeat'); TP.set(key, p); return p;
  };
  // tone(ctx, cov, region, o): fill a region with screentone — region = Path2D | [x, y, w, h]; o { pitch, color, alpha }
  K.tone = function (ctx, cov, region, o = {}) {
    if (cov <= 0) return; ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.fillStyle = K.tonePattern(ctx, cov, o.pitch || 12, o.color || K.C.tone);
    if (region instanceof Path2D) ctx.fill(region); else ctx.fillRect(...region); ctx.restore();
  };
  // toneGrad(ctx, x, y, w, h, o): gradient tone (그라데이션 톤) — dots on a 45° grid whose coverage runs from o.from (at y0) to o.to (at y1),
  //   sqrt radius; o { from = 0, to = .6, y0 = y, y1 = y + h, pitch = 14, color, alpha, dir: 'y' | 'r' (radial from cx, cy, r0 → r1) }
  K.toneGrad = function (ctx, x, y, w, h, o = {}) {
    const p = o.pitch || 14, y0 = o.y0 ?? y, y1 = o.y1 ?? y + h, a = o.from ?? 0, b = o.to ?? .6;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.globalAlpha *= o.alpha ?? 1; ctx.fillStyle = o.color || K.C.tone; ctx.beginPath();
    const c = Math.SQRT1_2, ox = x + w / 2, oy = y + h / 2, R = Math.hypot(w, h) / 2 + p;
    for (let v = -R; v <= R; v += p) for (let u = -R; u <= R; u += p) {
      const px = ox + (u - v) * c, py = oy + (u + v) * c; if (px < x - p || px > x + w + p || py < y - p || py > y + h + p) continue;
      const cov = o.dir === 'r' ? lerp(a, b, ss(o.r0 ?? 0, o.r1 ?? R, Math.hypot(px - (o.cx ?? ox), py - (o.cy ?? oy)))) : lerp(a, b, ss(y0, y1, py));
      if (cov <= .01) continue; const rad = p / 2 * Math.sqrt(cov) * 1.13; ctx.moveTo(px + rad, py); ctx.arc(px, py, rad, 0, TAU);
    }
    ctx.fill(); ctx.restore();
  };
  // star4(ctx, x, y, r, rot = 0, col = '#fff', waist = .2): a 4-point sparkle made of two pinched diamonds
  K.star4 = function (ctx, x, y, r, rot = 0, col = '#fff', waist = .2) {
    if (r <= .3) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(r, 0);
    for (let k = 1; k <= 4; k++) { const a0 = (k - .5) * Math.PI / 2, a1 = k * Math.PI / 2; ctx.quadraticCurveTo(Math.cos(a0) * r * waist, Math.sin(a0) * r * waist, Math.cos(a1) * r, Math.sin(a1) * r); }
    ctx.fill(); ctx.restore();
  };
  // sparkles(ctx, t, o): twinkling 4-point stars scattered round a centre — o { cx, cy, rx, ry, n = 10, r = [10, 34], f = 1.4 (Hz), col, seed,
  //   alpha, glow: true (a soft halo) }. Twinkle = max(0, sin(2πft + φ)).
  K.sparkles = function (ctx, t, o) {
    const r = rng(o.seed ?? 9), n = o.n ?? 10, R = o.r || [10, 34];
    for (let i = 0; i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()), x = o.cx + Math.cos(a) * o.rx * d, y = o.cy + Math.sin(a) * (o.ry ?? o.rx) * d, ph = r() * TAU, sz = lerp(R[0], R[1], r());
      const k = Math.max(0, Math.sin(TAU * (o.f ?? 1.4) * t * (.7 + .6 * r()) + ph)); if (k <= .02) continue;
      ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1) * k;
      if (o.glow !== false) { const g = ctx.createRadialGradient(x, y, 0, x, y, sz * 1.3); g.addColorStop(0, K.rgba(o.col || '#fff', .7)); g.addColorStop(1, K.rgba(o.col || '#fff', 0)); ctx.fillStyle = g; ctx.fillRect(x - sz * 1.3, y - sz * 1.3, sz * 2.6, sz * 2.6); }
      K.star4(ctx, x, y, sz * k, .26, o.col || '#fff'); ctx.restore(); }
  };
  // rays(ctx, t, cx, cy, o): light rays from a point (the over-dramatic reveal) — o { n = 16, r0 = 40, r1 = 1500, col = C.rays, alpha = .55,
  //   spin (rad/s) = .04, width = .5 (fraction of each sector lit), seed, pulse (0…1 breathing) }
  K.rays = function (ctx, t, cx, cy, o = {}) {
    const n = o.n ?? 16, r0 = o.r0 ?? 40, r1 = o.r1 ?? 1500, r = rng(o.seed ?? 3), sp = (o.spin ?? .04) * t, wd = o.width ?? .5;
    const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1); g.addColorStop(0, K.rgba(o.col || K.C.rays, 1)); g.addColorStop(.55, K.rgba(o.col || K.C.rays, .45)); g.addColorStop(1, K.rgba(o.col || K.C.rays, 0));
    ctx.save(); ctx.globalAlpha *= (o.alpha ?? .55) * (1 + (o.pulse || 0) * .15 * Math.sin(t * 3)); ctx.fillStyle = g; ctx.beginPath();
    for (let i = 0; i < n; i++) { const a = sp + (i + (r() - .5) * .3) / n * TAU, hw = Math.PI / n * wd * (.6 + .8 * r());
      ctx.moveTo(cx + Math.cos(a - hw * .2) * r0, cy + Math.sin(a - hw * .2) * r0); ctx.lineTo(cx + Math.cos(a - hw) * r1, cy + Math.sin(a - hw) * r1); ctx.lineTo(cx + Math.cos(a + hw) * r1, cy + Math.sin(a + hw) * r1); ctx.lineTo(cx + Math.cos(a + hw * .2) * r0, cy + Math.sin(a + hw * .2) * r0); ctx.closePath(); }
    ctx.fill(); ctx.restore();
  };
  // glow(ctx, x, y, r, col, a = 1): a soft radial light
  K.glow = function (ctx, x, y, r, col, a = 1) { if (a <= 0 || r <= 0) return; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, K.rgba(col, a)); g.addColorStop(.45, K.rgba(col, a * .45)); g.addColorStop(1, K.rgba(col, 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
  // moodBg(ctx, t, kind, x, y, w, h, o): a symbolic background replacing the setting (RESEARCH §25):
  //   'sparkle' (soft peach/pink glow + twinkles + bubbles — "pretty", wonder), 'gloom' (blue-grey + hanging vertical lines — 우울, cringe),
  //   'swirl' (confusion), 'burst' (white urchin flash on black — reveal/shock), 'flat' (one saturated flat colour + speed lines — gag),
  //   'dread' (dark gradient tone rising from the top), 'drama' (black + white focus lines), 'joy' (warm yellow + rays).
  //   o { col, col2, seed, k (intensity 0…1), cx, cy }
  K.moodBg = function (ctx, t, kind, x, y, w, h, o = {}) {
    const cx = o.cx ?? x + w / 2, cy = o.cy ?? y + h / 2, k = o.k ?? 1;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (kind === 'sparkle') { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * .8); g.addColorStop(0, o.col || '#fff4f0'); g.addColorStop(1, o.col2 || '#ffd3dd'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      const r = rng(o.seed ?? 4); for (let i = 0; i < 14; i++) { const bx = x + r() * w, by = y + ((r() * h - t * 30 * (.5 + r())) % h + h) % h, br = 14 + r() * 46; ctx.strokeStyle = K.rgba('#ffffff', .8); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.stroke(); ctx.fillStyle = K.rgba('#ffffff', .25); ctx.fill(); }
      K.sparkles(ctx, t, { cx, cy, rx: w * .5, ry: h * .5, n: 18, r: [12, 40], seed: (o.seed ?? 4) + 1, col: '#fff' }); }
    else if (kind === 'gloom') { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, o.col || '#5a6a96'); g.addColorStop(1, o.col2 || '#a8b2cc'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      K.gloomLines(ctx, t, x, y, w, h * .75, { n: 34, col: o.lineCol || '#26304f', seed: o.seed }); }
    else if (kind === 'swirl') { ctx.fillStyle = o.col || '#efe7ff'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = o.col2 || '#b9a6e6'; ctx.lineWidth = 6;
      const r = rng(o.seed ?? 2); for (let i = 0; i < 6; i++) K.spiral(ctx, x + r() * w, y + r() * h, 30 + r() * 70, t * (r() < .5 ? 1 : -1) * 2, 2.5); }
    else if (kind === 'burst') { ctx.fillStyle = o.col || K.C.black; ctx.fillRect(x, y, w, h);
      K.focus(ctx, t, { cx, cy, rx: w * .55, ry: h * .45, inner: .5 * (1 + .04 * Math.sin(TAU * 3 * t)), color: o.col2 || '#fff', seed: o.seed ?? 7, bold: 1.6, step: .03 }); }
    else if (kind === 'flat') { ctx.fillStyle = o.col || '#ffd84a'; ctx.fillRect(x, y, w, h); K.speed(ctx, t, { x, y, w, h, ang: o.ang ?? 0, color: K.rgba(o.col2 || '#ffffff', .8), n: 50, seed: o.seed, v: o.v ?? 1800 }); }
    else if (kind === 'dread') { ctx.fillStyle = o.col || '#d9d6e3'; ctx.fillRect(x, y, w, h); K.toneGrad(ctx, x, y, w, h, { from: .9 * k, to: 0, y0: y, y1: y + h * (.45 + .25 * k), pitch: 14, color: o.col2 || K.C.tone }); }
    else if (kind === 'drama') { ctx.fillStyle = o.col || K.C.black; ctx.fillRect(x, y, w, h); K.focus(ctx, t, { cx, cy, rx: w / 2, ry: h / 2, inner: .62, color: o.col2 || '#f4f1f7', seed: o.seed ?? 11, bold: .9 }); }
    else if (kind === 'joy') { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h)); g.addColorStop(0, '#fffbe6'); g.addColorStop(1, o.col || '#ffd970'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      K.rays(ctx, t, cx, cy, { col: '#ffffff', alpha: .6, n: 18, r1: Math.max(w, h) }); }
    ctx.restore();
  };
  // gloomLines(ctx, t, x, y, w, h, o): vertical gloom lines hanging from the top (tate-sen), fading down, ends swaying at 0.5 Hz
  K.gloomLines = function (ctx, t, x, y, w, h, o = {}) {
    const r = rng(o.seed ?? 6), n = o.n ?? 14, g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, K.rgba(o.col || '#2f3a5c', o.alpha ?? .9)); g.addColorStop(1, K.rgba(o.col || '#2f3a5c', 0));
    ctx.save(); ctx.strokeStyle = g; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) { const lx = x + (i + .5 + (r() - .5) * .6) / n * w, len = h * (.4 + .6 * r()), sw = Math.sin(TAU * .5 * t + i) * 4; ctx.lineWidth = o.lw ? o.lw * (.7 + .6 * r()) : 3 + r() * 3;
      ctx.beginPath(); ctx.moveTo(lx, y); ctx.quadraticCurveTo(lx, y + len * .6, lx + sw, y + len); ctx.stroke(); }
    ctx.restore();
  };
  // spiral(ctx, x, y, r, rot, turns = 2.5): an Archimedean swirl (r = bθ) — stroke style from ctx
  K.spiral = function (ctx, x, y, r, rot = 0, turns = 2.5) { ctx.beginPath(); const N = 60 * turns; for (let i = 0; i <= N; i++) { const a = i / N * turns * TAU, rr = r * i / N; const px = x + Math.cos(a + rot) * rr, py = y + Math.sin(a + rot) * rr; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); };
  // aura(ctx, t, o): a dark wavy aura (fake-epic menace) rising behind a figure — o { x, y (centre of the figure box), w, h, col = C.aura,
  //   edge = C.auraL, k = 1 (strength/entry), seed, wisps = 8 }. Draw BEFORE the figure. Pair with rumble('쿠구구구').
  K.aura = function (ctx, t, o) {
    const k = clamp(o.k ?? 1); if (k <= 0) return; const r = rng(o.seed ?? 13), cx = o.x, cy = o.y, rx = o.w / 2, ry = o.h / 2;
    const layer = (sc, col, a, ph) => {
      ctx.beginPath(); const N = 72;
      for (let i = 0; i <= N; i++) { const th = i / N * TAU, up = Math.max(0, -Math.sin(th));   // flames only on the upper half
        const fl = up * (.28 * Math.abs(Pilot.noise(Math.cos(th) * 3 + ph, t * 1.6 - i * .02)) + .2 * Math.pow(Math.abs(Math.sin(th * 7 + t * 2.4 + ph)), 6)) * 1.6;
        const rr = (1 + fl) * sc * (.85 + .15 * k), px = cx + Math.cos(th) * rx * rr * (1 + .05 * Math.sin(t * 5 + i)), py = cy + Math.sin(th) * ry * rr * (th > Math.PI ? 1 : .9) - up * 20 * Math.sin(t * 4 + i);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.closePath(); ctx.fillStyle = K.rgba(col, a * k); ctx.fill(); };
    ctx.save(); layer(1.18, o.edge || K.C.auraL, .55, 0); layer(1.08, o.col || K.C.aura, .82, 2.1); layer(.95, o.col || K.C.aura, .9, 4.2);
    // wavy aura lines (ゴゴゴ-style trembling outline strokes) and rising wisps
    ctx.strokeStyle = K.rgba(o.edge || K.C.auraL, .85 * k); ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < (o.wisps ?? 8); i++) { const ph = r(), u = ((t * .6 + ph) % 1), wx = cx + (r() - .5) * rx * 2.2, wy = cy - ry * .2 - u * ry * 1.4;
      ctx.globalAlpha = Math.sin(Math.PI * u) * k; ctx.beginPath(); for (let j = 0; j <= 10; j++) { const yy = wy - j * 9, xx = wx + Math.sin(j * .9 + t * 6 + ph * 9) * 7; j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
    ctx.restore();
  };
  // flash(ctx, t, t0, o): the white freeze-flash — the frame (or o.rect [x,y,w,h]) white at α 1 for o.hold (.06 s), fading over o.dur (.35 s);
  //   o.col. Pair with freeze(t, t0, len) for a frozen frame under it.
  K.flash = function (ctx, t, t0, o = {}) {
    if (t < t0) return; const hold = o.hold ?? .06, dur = o.dur ?? .35, a = t < t0 + hold ? 1 : 1 - eo((t - t0 - hold) / dur); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = o.col || '#fff'; const r = o.rect || [-20, -20, W + 40, H + 40]; ctx.fillRect(...r); ctx.restore();
  };
  // poof(ctx, t, t0, x, y, r = 80, col = '#fff'): a register-switch puff — 6 cloud circles scaling out and fading over .25 s (SD switch)
  K.poof = function (ctx, t, t0, x, y, r = 80, col = '#fff') {
    const u = (t - t0) / .28; if (u < 0 || u > 1) return; ctx.save(); ctx.globalAlpha *= 1 - u; ctx.fillStyle = col; ctx.strokeStyle = K.C.ink; ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .3, d = r * eo(u), rr = r * .35 * (1 - u * .4); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * .7, rr, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  };
  // grade(ctx, rect, mood, k = 1): colour script pass over a panel — mood 'daily' | 'tension' | 'sad' | 'horror' | 'gag' | 'romance' | 'flashback'
  //   (multiply for shade, screen for light; sepia for flashback). rect = [x, y, w, h].
  K.MOOD = { daily: ['#fff6ea', 'screen', .25], tension: ['#5f7f8a', 'multiply', .35], sad: ['#7f8fb0', 'multiply', .4], horror: ['#3a1820', 'multiply', .55],
    gag: ['#ffe36a', 'overlay', .25], romance: ['#ffc2cf', 'screen', .3], flashback: ['#a07850', 'color', .85] };
  K.grade = function (ctx, rect, mood, k = 1) { const m = K.MOOD[mood]; if (!m || k <= 0) return; ctx.save(); ctx.globalCompositeOperation = m[1]; ctx.globalAlpha *= m[2] * k; ctx.fillStyle = m[0]; ctx.fillRect(...rect); ctx.restore(); };

  // ================================================================ emotion symbols (만화 기호), tears
  // emote(ctx, t, kind, h, o): a symbol parented to a head h = { x, y, r, dir (+1 faces right), tilt } (rig geometry: G.head).
  //   kinds: 'sweat' (temple, slides down), 'vein' (anger 💢, forehead corner, pulses 3.5 Hz), 'blush' (hatching on the cheeks), 'sparkle',
  //   'gloom' (lines over the head), 'swirl' (dizzy, above), 'shock' (3 ticks popping out above), 'steam' (huffs from the sides),
  //   'q' (?), 'ex' (!), 'qex' (?!), 'heart', 'dots' (…), 'note' (♪). o { at (entry), side (+1/−1 override), k (size), col }.
  //   One symbol per face unless the stack IS the joke (RESEARCH §4.4).
  K.emote = function (ctx, t, kind, h, o = {}) {
    const at = o.at ?? -1e9; if (t < at) return; const u = t - at, r = h.r * (o.k || 1), dir = o.side ?? (h.dir || 1), lw = Math.max(2, r * .045);
    ctx.save(); ctx.translate(h.x, h.y); if (h.tilt) ctx.rotate(h.tilt); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const inkS = K.C.ink;
    if (kind === 'sweat') { const sl = Math.min(1, u / .6), x = dir * r * 1.0, y = -r * .45 + r * .35 * eio(sl), s = r * .3 * K.pop(t, at, .2, .3, 2), sy = 1 + .15 * sl;
      ctx.translate(x, y); ctx.scale(s, s * sy); const p = new Path2D(); p.moveTo(0, -1.25); p.bezierCurveTo(.25, -.6, .78, -.1, .78, .32); p.arc(0, .32, .78, 0, Math.PI); p.bezierCurveTo(-.78, -.1, -.25, -.6, 0, -1.25);
      ctx.lineWidth = lw * 2 / s; ctx.strokeStyle = inkS; ctx.stroke(p); ctx.fillStyle = o.col || K.C.sweat; ctx.fill(p); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-.3, .25, .16, .3, -.3, 0, TAU); ctx.fill(); }
    else if (kind === 'vein') { const s = r * .3 * (1 + .12 * Math.abs(Math.sin(TAU * 3.5 * u))) * K.pop(t, at, .18, .2, 3); ctx.translate(-dir * r * .62, -r * 1.12); ctx.scale(s, s);
      ctx.strokeStyle = o.col || K.C.vein; ctx.lineWidth = .3;
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { ctx.beginPath(); ctx.moveTo(sx * .22, sy * 1); ctx.quadraticCurveTo(sx * .25, sy * .25, sx * 1, sy * .22); ctx.stroke(); } }
    else if (kind === 'blush') { const n = Math.min(5, Math.floor(u / .06) + 1), col = o.col || K.C.blush; ctx.strokeStyle = col; ctx.lineWidth = r * .07;
      for (const sx of [-1, 1]) { const cx = sx * r * .55 + (h.dir ? h.dir * r * .1 : 0), cy = r * .38; ctx.fillStyle = K.rgba(col, .3); ctx.beginPath(); ctx.ellipse(cx, cy, r * .26, r * .14, 0, 0, TAU); ctx.fill();
        for (let i = 0; i < n; i++) { const x = cx - r * .2 + i * r * .1; ctx.beginPath(); ctx.moveTo(x + r * .05, cy - r * .1); ctx.lineTo(x - r * .05, cy + r * .1); ctx.stroke(); } } }
    else if (kind === 'sparkle') { for (let i = 0; i < 3; i++) { const k = Math.max(0, Math.sin(TAU * 1.3 * u + i * 2.1)), x = dir * r * (1.05 + i * .25), y = -r * (1.0 - i * .45);
      ctx.save(); ctx.globalAlpha *= .5 + .5 * k; K.star4(ctx, x, y, r * (.2 + .12 * k) * (i === 1 ? 1.3 : 1), .2, o.col || '#fff4a8'); ctx.strokeStyle = K.rgba(inkS, .5); ctx.restore(); } }
    else if (kind === 'gloom') { K.gloomLines(ctx, t, -r * 1.1, -r * 1.6, r * 2.2, r * 1.5, { n: 8, col: o.col || '#3b4870', lw: r * .05 }); }
    else if (kind === 'swirl') { ctx.strokeStyle = o.col || inkS; ctx.lineWidth = lw * 1.2; K.spiral(ctx, 0, -r * 1.75, r * .35, u * TAU, 2.5); }
    else if (kind === 'shock') { const k = eo(u / .12); ctx.strokeStyle = inkS; ctx.lineWidth = lw * 1.6;
      for (const a of [-.55, 0, .55]) { const a0 = -Math.PI / 2 + a, r0 = r * 1.55, r1 = r0 + r * .45 * k; ctx.beginPath(); ctx.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0 - r * .1); ctx.lineTo(Math.cos(a0) * r1, Math.sin(a0) * r1 - r * .1); ctx.stroke(); } }
    else if (kind === 'steam') { for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) { const v = ((u * 1.6 + i * .5) % 1), x = sx * r * (1.1 + v * .5), y = -r * .1 - v * r * .5, rr = r * (.14 + v * .18);
      ctx.save(); ctx.globalAlpha *= 1 - v; ctx.fillStyle = '#fff'; ctx.strokeStyle = inkS; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.arc(x + sx * rr * .8, y - rr * .4, rr * .7, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); } }
    else if (kind === 'q' || kind === 'ex' || kind === 'qex' || kind === 'note') { const s = { q: '?', ex: '!', qex: '?!', note: '♪' }[kind], sc = K.pop(t, at, .22, .3, 3);
      ctx.translate(dir * r * .9, -r * 1.55); ctx.rotate(dir * .18); ctx.scale(sc, sc); ctx.font = `400 ${r * 1.0}px ${K.F.shout}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#fff'; ctx.lineWidth = r * .2; ctx.strokeText(Pilot.tr(s), 0, 0); ctx.strokeStyle = inkS; ctx.lineWidth = r * .08; ctx.strokeText(Pilot.tr(s), 0, 0); ctx.fillStyle = o.col || (kind === 'note' ? '#5aa7e8' : '#fff'); ctx.fillText(Pilot.tr(s), 0, 0); }
    else if (kind === 'heart') { for (let i = 0; i < 3; i++) { const v = (u * .8 + i / 3) % 1, x = dir * r * (.8 + .3 * Math.sin(v * 6 + i)), y = -r * (1 + v * 1.2), s = r * .22 * Math.sin(Math.PI * v);
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(0, .35); ctx.bezierCurveTo(-1.1, -.4, -.5, -1.1, 0, -.45); ctx.bezierCurveTo(.5, -1.1, 1.1, -.4, 0, .35); ctx.fillStyle = o.col || '#ff7d9b'; ctx.fill(); ctx.restore(); } }
    else if (kind === 'dots') { for (let i = 0; i < 3; i++) if (u > i * .25) { ctx.fillStyle = inkS; ctx.beginPath(); ctx.arc(dir * r * .6 + i * r * .32 * dir, -r * 1.6, r * .09, 0, TAU); ctx.fill(); } }
    ctx.restore();
  };
  // tears(ctx, t, eyes, kind, o): crying — eyes = [[x, y], [x, y]] (rig G.eyes, current coords), kind 'stream' (two ribbons down the cheeks,
  //   flowing highlights), 'fall' (SD waterfall: arcs of water spraying out and down, droplets, splashes at o.floor), 'well' (a pooled drop).
  //   o { r (scale ≈ head radius), at, dir, floor, len (stream length × r, 1.2) }
  K.tears = function (ctx, t, eyes, kind = 'stream', o = {}) {
    const at = o.at ?? -1e9; if (t < at) return; const u = t - at, r = o.r || 60, k = clamp(u / .4);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    eyes.forEach(([ex, ey], i) => { const sx = i === 0 ? -1 : 1;
      if (kind === 'stream') { const L = r * (o.len ?? 1.2) * k, N = 14, cl = [];
        for (let j = 0; j <= N; j++) { const v = j / N; cl.push([ex + sx * r * (.08 + .14 * v) + Math.sin(v * 6 - t * 7 + i) * r * .025 * v, ey + r * .14 + L * v]); }
        const wd = v => r * (.07 + .07 * v), Lh = [], Rh = [];
        for (let j = 0; j <= N; j++) { const a = cl[Math.max(0, j - 1)], b = cl[Math.min(N, j + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, w = wd(j / N); Lh.push([cl[j][0] - dy / d * w, cl[j][1] + dx / d * w]); Rh.push([cl[j][0] + dy / d * w, cl[j][1] - dx / d * w]); }
        const p = new Path2D(); p.moveTo(...Lh[0]); for (const q of Lh) p.lineTo(...q); const e = cl[N]; p.arc(e[0], e[1], wd(1), Math.PI, 0, true); for (let j = N; j >= 0; j--) p.lineTo(...Rh[j]); p.closePath();
        ctx.strokeStyle = K.C.ink; ctx.lineWidth = Math.max(2, r * .045); ctx.stroke(p); ctx.fillStyle = K.rgba(K.C.tear, .92); ctx.fill(p);
        ctx.save(); ctx.clip(p); ctx.strokeStyle = K.C.tearL; ctx.lineWidth = r * .035; ctx.setLineDash([r * .12, r * .16]); ctx.lineDashOffset = -t * r * 2.4; ctx.beginPath(); cl.forEach((q, j) => j ? ctx.lineTo(q[0] - sx * r * .03, q[1]) : ctx.moveTo(q[0] - sx * r * .03, q[1])); ctx.stroke(); ctx.restore(); }
      else if (kind === 'fall') { const fl = o.floor ?? ey + r * 3, N = 14, pts = [];
        for (let j = 0; j <= N; j++) { const v = j / N, x = ex + sx * r * (.2 + 1.6 * v), y = ey + r * .1 - r * .5 * v + (fl - ey) * v * v * 1.0; pts.push([x, Math.min(fl, y)]); }
        const cut = Math.max(2, Math.round(N * k)); const P = pts.slice(0, cut + 1);
        ctx.strokeStyle = K.C.ink; ctx.lineWidth = r * .34 + 4; ctx.beginPath(); P.forEach((p, j) => j ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.stroke();
        ctx.strokeStyle = K.C.tear; ctx.lineWidth = r * .34; ctx.stroke(); ctx.strokeStyle = K.C.tearL; ctx.lineWidth = r * .08; ctx.setLineDash([r * .2, r * .25]); ctx.lineDashOffset = -t * r * 4; ctx.stroke(); ctx.setLineDash([]);
        if (k >= 1) { const rr = rng(i + 5); for (let j = 0; j < 7; j++) { const v = ((t * 1.5 + rr()) % 1), x = pts[N][0] + sx * (rr() * r * .8) * v, y = fl - Math.sin(Math.PI * v) * r * .5 * (.5 + rr());
          ctx.fillStyle = K.C.tear; ctx.strokeStyle = K.C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * .06, 0, TAU); ctx.fill(); ctx.stroke(); } } }
      else if (kind === 'well') { const s = r * .12 * k; ctx.fillStyle = K.C.tear; ctx.strokeStyle = K.C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(ex + sx * r * .18, ey + r * .14, s, s * 1.3, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    });
    ctx.restore();
  };

  // ================================================================ stone & crumble (석화)
  // crumble(ctx, t, box, draw, o): a figure that has turned to stone cracks and falls apart. box { x, y, w, h } (current coords; the area
  //   the figure covers), draw(c) draws it in the SAME coords (use the rig with o.stone = 1). o { id (cache key), t0 (crumble start),
  //   crack = .45 (s of cracks spreading before), dur = 1.1 (spread of chunk release, top first), cols = 6, rows = 8, floor (landing y,
  //   default box bottom), seed, g (gravity, px/s² in these coords, 2600), dust = true }. Before t0 − crack: just draw().
  //   Cracks are painted 'source-atop' into an offscreen copy, so they only land on the figure; chunks are cells of a jittered grid.
  const CR = new Map();
  K.crumble = function (ctx, t, box, draw, o = {}) {
    const t0 = o.t0 ?? 0, lead = o.crack ?? .45; if (t < t0 - lead) { draw(ctx); return; }
    const m = ctx.getTransform(), sc = Math.max(.25, Math.min(2, Math.hypot(m.a, m.b))), cw = Math.ceil(box.w * sc) + 4, ch = Math.ceil(box.h * sc) + 4;
    let E = CR.get(o.id || 'c'); if (!E || E.c.width < cw || E.c.height < ch) { E = { c: Pilot.canvas(cw, ch) }; CR.set(o.id || 'c', E); }
    const oc = E.c.getContext('2d'); oc.setTransform(1, 0, 0, 1, 0, 0); oc.clearRect(0, 0, E.c.width, E.c.height); oc.setTransform(sc, 0, 0, sc, -box.x * sc + 2, -box.y * sc + 2); draw(oc);
    const cols = o.cols ?? 6, rows = o.rows ?? 8, r = rng(o.seed ?? 21), G = [];
    for (let j = 0; j <= rows; j++) { const row = []; for (let i = 0; i <= cols; i++) { const jx = i > 0 && i < cols ? (r() - .5) * .7 : 0, jy = j > 0 && j < rows ? (r() - .5) * .7 : 0;
      row.push([box.x + (i + jx) / cols * box.w, box.y + (j + jy) / rows * box.h]); } G.push(row); }
    // cracks: grid edges (a random subset) spreading over `lead`, painted onto the figure only
    const ck = clamp((t - (t0 - lead)) / lead); oc.save(); oc.globalCompositeOperation = 'source-atop'; oc.strokeStyle = o.ink || '#3d3c42'; oc.lineWidth = 3 / sc * Math.max(1, sc); oc.lineCap = 'round';
    const rc = rng((o.seed ?? 21) + 7);
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { const p = G[j][i];
      if (i < cols && rc() < .75 && rc() < ck * 1.3) { const q = G[j][i + 1]; oc.beginPath(); oc.moveTo(...p); oc.lineTo(lerp(p[0], q[0], .5) + (rc() - .5) * 8, lerp(p[1], q[1], .5) + (rc() - .5) * 8); oc.lineTo(...q); oc.stroke(); }
      if (j < rows && rc() < .75 && rc() < ck * 1.3) { const q = G[j + 1][i]; oc.beginPath(); oc.moveTo(...p); oc.lineTo(lerp(p[0], q[0], .5) + (rc() - .5) * 8, lerp(p[1], q[1], .5) + (rc() - .5) * 8); oc.lineTo(...q); oc.stroke(); } }
    oc.restore();
    const floor = o.floor ?? box.y + box.h, g = o.g ?? 2600, dur = o.dur ?? 1.1, dust = [];
    const rp = rng((o.seed ?? 21) + 3);
    const pieces = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const poly = [G[j][i], G[j][i + 1], G[j + 1][i + 1], G[j + 1][i]], cx = poly.reduce((s, p) => s + p[0], 0) / 4, cy = poly.reduce((s, p) => s + p[1], 0) / 4;
      const rel = t0 + dur * (j / rows) * .85 + rp() * dur * .25, vx = (rp() - .5) * box.w * .9 + (cx - (box.x + box.w / 2)) * .8, w0 = (rp() - .5) * 6, settle = floor - (rows - j) * box.h / rows * .18 - rp() * 10;
      let dx = 0, dy = 0, a = 0;
      if (t > rel) { const u = t - rel, fallT = Math.sqrt(Math.max(0, 2 * (settle - cy) / g)), uu = Math.min(u, fallT || 0); dy = .5 * g * uu * uu; dx = vx * uu; a = w0 * uu;
        if (u > fallT && fallT > 0) { dust.push([cx + dx, settle, u - fallT]); } }
      pieces.push({ poly, cx, cy, dx, dy, a });
    }
    for (const P of pieces) { ctx.save(); ctx.translate(P.cx + P.dx, P.cy + P.dy); ctx.rotate(P.a); ctx.scale(.985, .985); ctx.translate(-P.cx, -P.cy);
      ctx.beginPath(); P.poly.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); ctx.clip();
      ctx.drawImage(E.c, 0, 0, cw, ch, box.x - 2 / sc, box.y - 2 / sc, cw / sc, ch / sc); ctx.restore(); }
    if (o.dust !== false) for (const [x, y, u] of dust) if (u < .5) { ctx.save(); ctx.globalAlpha *= (1 - u / .5) * .6; ctx.fillStyle = '#d9d8dc'; ctx.beginPath(); ctx.arc(x, y - 6, 10 + u * 60, 0, TAU); ctx.fill(); ctx.restore(); }
  };

  // ================================================================ character helpers (motion-toon micro animation)
  // ik(a, target, L1, L2, bend = 1) → { e (elbow/knee), w (wrist/ankle, = target when reachable), reach, a1, a2 }: 2-bone IK with fixed bone
  //   lengths (BODY-CHECK), bend = ±1 picks the side the joint goes. A target out of reach → the limb straight toward it.
  K.ik = function (a, b, L1, L2, bend = 1) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-6, dd = clamp(d, Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3);
    const base = Math.atan2(dy, dx), A = Math.acos(clamp((L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd), -1, 1)), a1 = base + bend * A;
    const e = [a[0] + Math.cos(a1) * L1, a[1] + Math.sin(a1) * L1], w = [a[0] + Math.cos(base) * dd, a[1] + Math.sin(base) * dd];
    return { e, w, reach: d <= L1 + L2, a1, a2: Math.atan2(w[1] - e[1], w[0] - e[0]) };
  };
  // blink(seed, t) → eye openness 1 … .05: a seeded blink schedule (Live2D timings: close .10 s, closed .05, open .15; next blink 1.2–7 s
  //   later; 15 % double blinks). Pure: the schedule is precomputed per seed, eyeOpen(t) looks up the last blink.
  const BL = new Map();
  K.blink = function (seed, t) {
    let L = BL.get(seed); if (!L) { L = []; const r = rng(K.hash('blink', seed)); let x = .4 + r() * 2.4; while (x < 600) { L.push(x); if (r() < .15) L.push(x + .34); x += 1.2 + r() * 5.8; } BL.set(seed, L); }
    let lo = 0, hi = L.length - 1, b = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (L[m] <= t) { b = L[m]; lo = m + 1; } else hi = m - 1; }
    if (b < 0) return 1; const d = t - b; if (d > .3) return 1; if (d < .1) return 1 - .95 * (d / .1) * (d / .1); if (d < .15) return .05; return .05 + .95 * eo((d - .15) / .15);
  };
  // sway(t, seed, amp = 1) → { head (rad), nod (px-ish), body (rad), breath (scaleY − 1) }: idle motion as a sum of sines with incommensurate
  //   periods (Live2D sample cycles 6.5345 / 3.5345 / 15.5345 / 3.2345 s) — it never visibly loops. Peaks: head ±1.2°, body ±.4°, breath ±.8 %.
  K.sway = function (t, seed = 1, amp = 1) {
    const p = (seed * 2.399) % TAU, d = Math.PI / 180;
    return { head: amp * 1.2 * d * Math.sin(TAU * t / 6.5345 + p) + amp * .5 * d * Math.sin(TAU * t / 5.5345 + p * 2),
      nod: amp * 3 * Math.sin(TAU * t / 3.5345 + p * 1.7), body: amp * .4 * d * Math.sin(TAU * t / 15.5345 + p * .6), breath: amp * .008 * Math.sin(TAU * t / 3.2345 + p * 1.3) };
  };
  // spring(t, events, o) → an angle offset (rad) for hair / ahoge / ties: a closed-form damped spring (replaces VRM SpringBone's verlet so a frame
  //   is a pure function of t): Σ A·e^(−(t−tₑ)/τ)·sin(ω(t−tₑ)) over events (times, or [time, A]) + a gentle wind (periods 1.7 / 2.9 s).
  //   o { tau = .35, f = 1.8 (Hz), A = .35, lag (s, per segment), wind = .05, ph }
  K.spring = function (t, ev = [], o = {}) {
    const tau = o.tau ?? .35, w = (o.f ?? 1.8) * TAU, A = o.A ?? .35, lag = o.lag || 0, ph = o.ph || 0; let v = 0;
    for (const e of ev) { const te = Array.isArray(e) ? e[0] : e, a = Array.isArray(e) ? e[1] : A, d = t - te - lag; if (d > 0 && d < tau * 9) v += a * Math.exp(-d / tau) * Math.sin(w * d); }
    const wd = o.wind ?? .05; return v + wd * (.6 * Math.sin(TAU * (t - lag) / 1.7 + ph) + .4 * Math.sin(TAU * (t - lag) / 2.9 + 1.3 + ph));
  };

  // ================================================================ the person rig (Webtoon.Rig)
  // A generic colour-webtoon person, front ↔ 3/4 by one turn angle, drawn with the kit's inked + cel look. A film's cast file passes a SPEC:
  //   spec = { name, seed, h (height ×, 1 = 640 rig px), head (head size ×), build: { sh (shoulder half-width 62), waist 44, hip 48, belly 0, arm 1, leg 1 },
  //     pal: { skin, skinS?, hair, hairS?, hairL?, eye, brow?, line?, shirt, outer?, pants, shoes, tie?, band?, socks?, skirt? },
  //     shirt: { collar: 'shirt' | 'round' | 'hood', open (top button open), roll (rolled sleeves), tuck },
  //     outer: { kind: 'vest' | 'jacket' | 'cardigan', open (front opening, rig px at the hem) } | null, tie: { loose } | null, lanyard: { card } | null,
  //     hood: true (a hood bunched at the neck), skirt: { len } | null, band (a wristband on the left wrist), glasses: { r, col } | null,
  //     moustache: true, bags (eye bags), wrinkles, browW (brow weight), lashes,
  //     hairBack(ctx, G), hairFront(ctx, G) — the hair, drawn in HEAD UNITS (see below), sdHair?: same for the SD head (default: the same fns) }
  //   HEAD UNITS: origin at the eye line, 1 unit = the face half-width (R.HW = 40 rig px); crown −1.5, chin +1.16, cheeks ±1.0.
  //   G (passed to hair fns) = { th, sn (sin turn), fx(x) (a FRONT-SURFACE x — fringe tips, a part — turned with the face), ox(x, y) (an x on
  //     the face OUTLINE — temples, side locks), bx(x) (a back-hair x: the mass slides away from the turn), lw, lwi (line widths in head units),
  //     ink, pal, t, sd, spring(i) (ahoge/strand sway, i = segment lag), inked(path, fill, shade?) (outline-under + cel), shine(path), stone,
  //     shadow } — hairFront is ALSO called once with G.shadow = true, moved down and clipped to the face: that draws the fringe's cast
  //     shadow on the forehead. In that pass G.inked fills skin-shade only; skip strands / highlights / clips yourself (`if (G.shadow) return`).
  const R = K.Rig = {};
  R.HW = 40;
  const ZS = { head: 0, nod: 0, body: 0, breath: 0 };
  const PALC = new Map();
  function palOf(spec, o) {
    const st = Math.round(clamp(o.stone || 0) * 20) / 20, key = (spec.name || '') + '|' + st + '|' + (o.palKey || ''); let p = PALC.get(key); if (p) return p;
    const b = Object.assign({ line: K.C.ink, skinS: K.shadeOf(spec.pal.skin || K.C.skin), hairS: K.shadeOf(spec.pal.hair || '#333', 1.15), hairL: K.lightOf(spec.pal.hair || '#333', .3),
      brow: spec.pal.hair, eye: '#3b2c2c', mouth: K.C.mouth, tongue: K.C.tongue, blush: K.C.blush, white: '#ffffff', sock: '#3a3a44' }, spec.pal);
    p = {}; for (const k in b) p[k] = typeof b[k] === 'string' ? (st ? (k === 'line' ? K.mixC(b[k], '#3a3a42', st) : K.stoneCol(b[k], st)) : b[k]) : b[k];
    PALC.set(key, p); return p;
  }
  R.palOf = palOf;
  const EXPR = R.EXPR = {
    neutral: { eyes: 'open', brows: 'neutral', mouth: 'small' },
    smile: { eyes: 'happy', brows: 'soft', mouth: 'smile' },               // closed-eye smile (^ ^)
    glint: { eyes: 'sharp', brows: 'angry', mouth: 'smirk', glint: 1 },    // serious: narrowed eyes with a glint (glasses go white)
    shock: { eyes: 'shock', brows: 'up', mouth: 'o', shade: 1 },
    cry: { eyes: 'squeeze', brows: 'sad', mouth: 'wail', tears: 'stream' },
    joy: { eyes: 'squeeze', brows: 'soft', mouth: 'grin', tears: 'stream' }, // tears of joy
    chew: { eyes: 'content', brows: 'soft', mouth: 'chew', cheek: 1 },
    determined: { eyes: 'focus', brows: 'angry', mouth: 'teeth' },
    dead: { eyes: 'dead', brows: 'flat', mouth: 'flat', shade: 1 },        // dead-eyed (empty, no highlight)
    talk: { eyes: 'open', brows: 'neutral', mouth: 'talk' },
    happy: { eyes: 'open', brows: 'soft', mouth: 'grin' },
    worried: { eyes: 'open', brows: 'sad', mouth: 'wavy' },
    tired: { eyes: 'tired', brows: 'flat', mouth: 'small' },
    angry: { eyes: 'focus', brows: 'angry', mouth: 'frown' },
    blank: { eyes: 'blank', brows: 'flat', mouth: 'flat' },                // stone / white-out
  };
  const toDeg = a => a * 180 / Math.PI;
  // (internal) the face outline in head units, turned by sn (chin and features slide toward the turn; the far side compresses)
  function facePath(sn, sd) {
    const cs = .42 * sn, fr = 1 - .16 * Math.max(0, sn), fl = 1 - .16 * Math.max(0, -sn), nr = 1 + .04 * Math.max(0, -sn), nl = 1 + .04 * Math.max(0, sn);
    const X = (x, y) => { const f = x > 0 ? fr * nr : x < 0 ? fl * nl : 1, w = clamp((y + .3) / 1.4); return x * f + cs * w + .05 * sn * (1 - w); };
    const p = new Path2D(), c = sd ? [[0, -1.5], [.66, -1.5], [1.06, -1.12], [1.06, -.5], [1.07, .1], [1.04, .55], [.82, .86], [.6, 1.1], [.3, 1.18], [0, 1.18]]
      : [[0, -1.5], [.62, -1.5], [1.04, -1.14], [1.04, -.5], [1.04, .08], [1.0, .45], [.8, .76], [.56, 1.04], [.27, 1.16], [0, 1.17]];
    p.moveTo(X(c[0][0], c[0][1]), c[0][1]);
    for (let i = 1; i < 10; i += 3) p.bezierCurveTo(X(c[i][0], c[i][1]), c[i][1], X(c[i + 1][0], c[i + 1][1]), c[i + 1][1], X(c[i + 2][0], c[i + 2][1]), c[i + 2][1]);
    for (let i = 8; i >= 0; i -= 3) { const a = c[i], b = c[i - 1], d = c[i - 2]; p.bezierCurveTo(X(-a[0], a[1]), a[1], X(-b[0], b[1]), b[1], X(-d[0], d[1]), d[1]); }
    p.closePath(); return { p, X };
  }
  R.facePath = facePath;
  // (internal) cylinder projection for features: front x (−.95….95) → turned x, and the width factor there
  const fxOf = (x, th) => { const a = Math.asin(clamp(x / .95, -1, 1)); return .95 * Math.sin(clamp(a + th, -1.45, 1.45)); };
  const fwOf = (x, th) => { const a = Math.asin(clamp(x / .95, -1, 1)); return Math.max(.25, Math.cos(clamp(a + th, -1.45, 1.45)) / Math.max(.3, Math.cos(a))); };

  // eye(ctx, kind, cx, cy, sz, side, o): one eye in head units. side −1 = the screen-left eye. o { open (blink), look [gx, gy], pal, lw, wf (width factor), sd, t }
  function eye(ctx, kind, cx, cy, sz, side, o) {
    const P = o.pal, lw = o.lw, wf = o.wf || 1;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sz * wf * (side < 0 ? -1 : 1), sz);   // eye-local: x toward the OUTER corner, 1 unit = eye half-width
    const L = lw / sz; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const lash = (w = 1) => { ctx.strokeStyle = P.line; ctx.lineWidth = L * 1.7 * w; ctx.beginPath(); ctx.moveTo(-1.02, .02); ctx.bezierCurveTo(-.85, -1.05, .55, -1.3, 1.08, -.38); ctx.stroke();
      ctx.lineWidth = L * 1.2 * w; ctx.beginPath(); ctx.moveTo(.98, -.48); ctx.lineTo(1.3, -.62); ctx.stroke(); };
    const closedArc = (dn) => { ctx.strokeStyle = P.line; ctx.lineWidth = L * 1.6; ctx.beginPath(); ctx.moveTo(-1, .1); ctx.quadraticCurveTo(0, dn, 1.05, .05); ctx.stroke(); };
    const open = clamp(o.open ?? 1), look = o.look || [0, 0];
    if (kind === 'happy') { ctx.strokeStyle = P.line; ctx.lineWidth = L * 1.9; ctx.beginPath(); ctx.moveTo(-1, .45); ctx.quadraticCurveTo(0, -.75, 1.05, .45); ctx.stroke(); }
    else if (kind === 'content') closedArc(.75);
    else if (kind === 'squeeze') { ctx.strokeStyle = P.line; ctx.lineWidth = L * 1.9; ctx.beginPath(); ctx.moveTo(1.05, -.55); ctx.lineTo(-.7, .05); ctx.lineTo(1.05, .6); ctx.stroke(); }
    else if (kind === 'line') { ctx.strokeStyle = P.line; ctx.lineWidth = L * 1.8; ctx.beginPath(); ctx.moveTo(-1, .1); ctx.lineTo(1.05, .1); ctx.stroke(); }
    else if (open < .2 && kind !== 'shock' && kind !== 'blank') closedArc(.55);
    else {
      // eye white (almond, rounder top), lids by kind
      let top = -1.25, flat = null, irisR = [.62, .92], pupil = .42, hl = true, irisCol = P.eye, whiteK = 1;
      if (kind === 'sharp') { flat = -.25; irisR = [.6, .85]; }
      else if (kind === 'focus') { flat = -.5; }
      else if (kind === 'tired') { flat = -.62; }
      else if (kind === 'dead') { flat = -.3; hl = false; irisCol = K.mixC(P.eye, '#8a8496', .55); pupil = 0; }
      else if (kind === 'shock') { whiteK = 1.12; }
      else if (kind === 'blank') { hl = false; }
      ctx.save(); ctx.scale(whiteK, whiteK);
      const wp = new Path2D(); wp.moveTo(-1.02, .05); wp.bezierCurveTo(-.88, top * .85, .55, top * 1.05, 1.08, -.38); wp.bezierCurveTo(1.05, .5, .45, .95, -.15, .92); wp.bezierCurveTo(-.6, .9, -.95, .55, -1.02, .05); wp.closePath();
      ctx.save(); ctx.translate(0, .6); ctx.scale(1, open); ctx.translate(0, -.6);
      ctx.fillStyle = P.white; ctx.fill(wp);
      ctx.save(); ctx.clip(wp);
      if (flat != null) { /* upper lid lowered: cut the top (the lid in skin) */ }
      if (kind === 'shock') { ctx.fillStyle = P.line; ctx.beginPath(); ctx.arc(.02 + look[0] * .2, .05 + look[1] * .15, .16, 0, TAU); ctx.fill(); }
      else if (kind !== 'blank') {
        const ix = .02 + look[0] * .32, iy = .08 + look[1] * .22, g = ctx.createLinearGradient(0, iy - irisR[1], 0, iy + irisR[1]);
        g.addColorStop(0, K.mixC(irisCol, '#000000', .35)); g.addColorStop(1, K.mixC(irisCol, '#ffffff', kind === 'dead' ? .1 : .32));
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(ix, iy, irisR[0], irisR[1], 0, 0, TAU); ctx.fill();
        if (pupil) { ctx.fillStyle = K.mixC(irisCol, '#000000', .6); ctx.beginPath(); ctx.ellipse(ix, iy + .02, pupil * .7, pupil, 0, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = K.mixC(irisCol, '#000000', .5); ctx.lineWidth = L * .5; ctx.beginPath(); ctx.ellipse(ix, iy, irisR[0], irisR[1], 0, 0, TAU); ctx.stroke();
        if (hl) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ix - .24, iy - .42, .22, .25, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(ix + .26, iy + .38, .1, 0, TAU); ctx.fill(); }
        if (kind === 'sharp' && o.glint) K.star4(ctx, ix - .22, iy - .38, .65, .3, '#fff', .16);
      }
      // top-lid shadow inside the white
      ctx.fillStyle = K.rgba(P.line, .16); ctx.beginPath(); ctx.ellipse(0, top * .9, 1.3, .55, 0, 0, TAU); ctx.fill();
      if (flat != null) { ctx.fillStyle = P.skin; ctx.beginPath(); ctx.moveTo(-1.3, -2); ctx.lineTo(1.3, -2); ctx.lineTo(1.3, flat + (kind === 'focus' ? -.18 : kind === 'sharp' ? -.05 : 0)); ctx.lineTo(-1.3, flat + (kind === 'focus' ? .22 : kind === 'sharp' ? .1 : 0)); ctx.closePath(); ctx.fill(); }
      ctx.restore();   // clip
      // lash line (follows the lowered lid when flat)
      if (flat != null) { const yo = kind === 'focus' ? [.22, -.18] : kind === 'sharp' ? [.1, -.05] : [0, 0];
        ctx.strokeStyle = P.line; ctx.lineWidth = L * 1.7; ctx.beginPath(); ctx.moveTo(-1.02, Math.max(.02, flat + yo[0])); ctx.quadraticCurveTo(0, flat + (yo[0] + yo[1]) / 2 - .12, 1.08, Math.max(-.38, flat + yo[1])); ctx.stroke();
        ctx.lineWidth = L * 1.1; ctx.beginPath(); ctx.moveTo(1.0, Math.max(-.42, flat + yo[1]) - .02); ctx.lineTo(1.3, Math.max(-.42, flat + yo[1]) - .2); ctx.stroke(); }
      else lash(kind === 'shock' ? .7 : 1);
      // lower lid: a short thin line on the outer half
      ctx.strokeStyle = K.rgba(P.line, .8); ctx.lineWidth = L * .7; ctx.beginPath(); ctx.moveTo(.2, .93); ctx.quadraticCurveTo(.75, .82, 1.02, .42); ctx.stroke();
      ctx.restore(); ctx.restore();
      if (kind === 'dead') { ctx.strokeStyle = K.rgba(P.line, .55); ctx.lineWidth = L * .6; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-.6 + i * .35, 1.15); ctx.lineTo(-.45 + i * .35, 1.5); ctx.stroke(); } }
    }
    ctx.restore();
  }
  R.eye = eye;
  // brow(ctx, kind, cx, cy, side, o): one eyebrow (a tapered stroke). kinds neutral | soft | up | sad | angry | flat
  function brow(ctx, kind, cx, cy, side, o) {
    const s = side < 0 ? -1 : 1, wf = o.wf || 1, w = (o.browW || 1) * o.lw * 1.9;
    const shp = { neutral: [[-.28, .02], [.05, -.1], [.32, -.02]], soft: [[-.28, -.02], [.05, -.16], [.32, -.06]], up: [[-.27, -.12], [.05, -.26], [.32, -.12]],
      sad: [[-.28, -.18], [.05, -.1], [.32, .06]], angry: [[-.28, .14], [.05, .0], [.34, -.12]], flat: [[-.28, .02], [.05, 0], [.32, .02]] }[kind] || [[-.28, 0], [.05, -.1], [.32, 0]];
    const P = shp.map(([x, y]) => [cx + s * x * .95 * wf, cy + y]);
    K.taper(ctx, K.qb(P[0], P[1], P[2], 8), w * 1.25, w * .45, o.col);
  }
  // mouth(ctx, kind, mx, my, o): the mouth in head units. o { t, talk (0…1 open), pal, lw, wf, sn, seed }
  function mouth(ctx, kind, mx, my, o) {
    const P = o.pal, L = o.lw, wf = o.wf || 1, t = o.t || 0; ctx.save(); ctx.translate(mx, my); ctx.scale(wf, 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = P.line;
    const openShape = (w, h, yb = 0) => { const p = new Path2D(); p.moveTo(-w, 0); p.quadraticCurveTo(0, -h * .25, w, 0); p.quadraticCurveTo(w * .7, h + yb, 0, h + yb); p.quadraticCurveTo(-w * .7, h + yb, -w, 0); p.closePath();
      ctx.lineWidth = L * 1.4; ctx.stroke(p); ctx.fillStyle = P.mouth; ctx.fill(p); ctx.save(); ctx.clip(p); ctx.fillStyle = P.tongue; ctx.beginPath(); ctx.ellipse(0, h + yb, w * .6, h * .45, 0, 0, TAU); ctx.fill(); ctx.restore(); return p; };
    if (kind === 'small') { ctx.lineWidth = L * 1.1; ctx.beginPath(); ctx.moveTo(-.1, 0); ctx.quadraticCurveTo(0, .03, .1, 0); ctx.stroke(); }
    else if (kind === 'smile') { ctx.lineWidth = L * 1.25; ctx.beginPath(); ctx.moveTo(-.22, -.04); ctx.quadraticCurveTo(0, .17, .22, -.04); ctx.stroke(); }
    else if (kind === 'smirk') { ctx.lineWidth = L * 1.2; ctx.beginPath(); ctx.moveTo(-.12, .03); ctx.quadraticCurveTo(.06, .07, .18, -.05); ctx.stroke(); }
    else if (kind === 'grin') { const p = new Path2D(); p.moveTo(-.25, -.03); p.quadraticCurveTo(0, .02, .25, -.03); p.quadraticCurveTo(.2, .26, 0, .27); p.quadraticCurveTo(-.2, .26, -.25, -.03); p.closePath();
      ctx.lineWidth = L * 1.3; ctx.stroke(p); ctx.fillStyle = P.mouth; ctx.fill(p); ctx.save(); ctx.clip(p); ctx.fillStyle = '#fff'; ctx.fillRect(-.3, -.1, .6, .1); ctx.fillStyle = P.tongue; ctx.beginPath(); ctx.ellipse(0, .27, .14, .09, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    else if (kind === 'talk') { const k = o.talk ?? (.5 + .5 * Math.abs(Math.sin(t * 11))); openShape(.13 + .04 * k, .05 + .16 * k); }
    else if (kind === 'o') { const p = new Path2D(); p.ellipse(0, .06, .1, .14, 0, 0, TAU); ctx.lineWidth = L * 1.3; ctx.stroke(p); ctx.fillStyle = P.mouth; ctx.fill(p); }
    else if (kind === 'wail') { const k = .85 + .15 * Math.sin(t * 9); const p = new Path2D(); p.moveTo(-.3, -.05); p.lineTo(.3, -.05); p.quadraticCurveTo(.24, .36 * k, 0, .4 * k); p.quadraticCurveTo(-.24, .36 * k, -.3, -.05); p.closePath();
      ctx.lineWidth = L * 1.4; ctx.stroke(p); ctx.fillStyle = P.mouth; ctx.fill(p); ctx.save(); ctx.clip(p); ctx.fillStyle = P.tongue; ctx.beginPath(); ctx.ellipse(0, .38 * k, .18, .1, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-.3, -.1, .6, .08); ctx.restore(); }
    else if (kind === 'chew') { const ph = Math.sin(t * TAU * 2.2), dy = .03 * ph; ctx.lineWidth = L * 1.2; ctx.beginPath(); ctx.moveTo(-.16, dy); ctx.quadraticCurveTo(-.06, .06 + dy, 0, dy); ctx.quadraticCurveTo(.06, -.05 - dy, .16, dy * .5); ctx.stroke(); }
    else if (kind === 'flat') { ctx.lineWidth = L * 1.1; ctx.beginPath(); ctx.moveTo(-.13, 0); ctx.lineTo(.13, 0); ctx.stroke(); }
    else if (kind === 'frown') { ctx.lineWidth = L * 1.2; ctx.beginPath(); ctx.moveTo(-.17, .06); ctx.quadraticCurveTo(0, -.08, .17, .06); ctx.stroke(); }
    else if (kind === 'teeth') { const p = K.rr(-.24, -.08, .48, .18, .06); ctx.lineWidth = L * 1.3; ctx.stroke(p); ctx.fillStyle = '#fff'; ctx.fill(p);
      ctx.lineWidth = L * .6; ctx.beginPath(); ctx.moveTo(-.22, .01); ctx.lineTo(.22, .01); for (const x of [-.12, 0, .12]) { ctx.moveTo(x, -.07); ctx.lineTo(x, .09); } ctx.stroke(); }
    else if (kind === 'wavy') { ctx.lineWidth = L * 1.1; ctx.beginPath(); for (let i = 0; i <= 8; i++) { const x = -.18 + i * .045, y = Math.sin(i * 1.6) * .025; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
    else if (kind === 'cat') { ctx.lineWidth = L * 1.1; ctx.beginPath(); ctx.moveTo(-.18, -.02); ctx.quadraticCurveTo(-.09, .1, 0, 0); ctx.quadraticCurveTo(.09, .1, .18, -.02); ctx.stroke(); }
    else if (kind === 'eat') { openShape(.15, .2); }
    ctx.restore();
  }
  R.mouth = mouth;

  // headG(t, spec, pal, o, th, lw) → G for the hair callbacks (head units)
  function headG(t, spec, pal, o, th, lwU, sd) {
    const sn = Math.sin(th), ev = o.hairEv || [];
    const G = { th, sn, t, sd, pal, ink: pal.line, lw: lwU, lwi: lwU * .55, stone: o.stone || 0, spec,
      fx: x => fxOf(x, th), ox: facePath(sn, sd).X, bx: x => x * (1 - .06 * Math.abs(sn)) - .11 * sn, spring: (i = 0) => K.spring(t, ev, { lag: i * .06, ph: (spec.seed || 1) * .7, wind: o.wind ?? .06 }) };
    G.inked = (ctx, p, fill, shade, dx = .1, dy = .14) => { if (G.shadow) { ctx.fillStyle = pal.skinS; ctx.fill(p); return; } ctx.lineJoin = 'round'; ctx.strokeStyle = pal.line; ctx.lineWidth = lwU * 2; ctx.stroke(p); if (shade) K.cel(ctx, p, fill, shade, dx, dy); else { ctx.fillStyle = fill; ctx.fill(p); } };
    G.shine = (ctx, p, a = .9) => { if (G.shadow) return; ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = pal.hairL; ctx.fill(p); ctx.restore(); };
    return G;
  }
  // drawHead(ctx, t, spec, o, E) — the head in head units at the current transform; returns face-feature points (head units)
  function drawHead(ctx, t, spec, pal, o, E, th, lwU, sd) {
    const sn = Math.sin(th), G = headG(t, spec, pal, o, th, lwU, sd), seed = spec.seed || 1;
    const open = o.blink === false ? 1 : (o.open ?? K.blink(seed, t)), look = o.look || [sn * .5, 0];
    const eyeY = sd ? .28 : .1, eyeX = sd ? .44 : .43, eyeS = sd ? .3 : .265, mY = sd ? .78 : .8, nY = sd ? .6 : .5;
    const fp = facePath(sn, sd);
    if (o.back !== false && spec.hairBack) { ctx.save(); (sd && spec.sdHairBack || spec.hairBack)(ctx, G); ctx.restore(); }
    // ears (the near one in 3/4)
    const ear = (side) => { const ex = side * 1.0 + .62 * sn + (side * sn > 0 ? -.05 : 0); if (side * sn > .32) return; const p = new Path2D(); p.moveTo(ex - side * .1, -.12); p.bezierCurveTo(ex + side * .26, -.32, ex + side * .32, .32, ex - side * .02, .46); p.closePath();
      ctx.lineJoin = 'round'; ctx.strokeStyle = pal.line; ctx.lineWidth = lwU * 2; ctx.stroke(p); ctx.fillStyle = pal.skin; ctx.fill(p); ctx.strokeStyle = K.rgba(pal.skinS, 1); ctx.lineWidth = lwU * .8; ctx.beginPath(); ctx.moveTo(ex + side * .02, -.05); ctx.quadraticCurveTo(ex + side * .16, .08, ex + side * .02, .3); ctx.stroke(); };
    ear(-1); ear(1);
    // face: outline under, flat skin, one cel band on the far side + the fringe shadow on the forehead
    ctx.lineJoin = 'round'; ctx.strokeStyle = pal.line; ctx.lineWidth = lwU * 2; ctx.stroke(fp.p); K.cel(ctx, fp.p, pal.skin, pal.skinS, -.1 - .1 * sn, .06);
    ctx.save(); ctx.clip(fp.p);
    if (spec.hairFront && o.front !== false) { ctx.save(); ctx.translate(.03, .13); G.shadow = true; spec.hairFront(ctx, G); G.shadow = false; ctx.restore(); }   // the fringe's cast shadow
    if (E.shade || o.gloom) { const g = ctx.createLinearGradient(0, -1.5, 0, .6); g.addColorStop(0, K.rgba(K.C.gloom, .55 * (o.gloom ?? 1))); g.addColorStop(1, K.rgba(K.C.gloom, 0)); ctx.fillStyle = g; ctx.fillRect(-2, -2, 4, 2.6); }
    // cheeks: a faint warm flush always; o.blush adds hatching
    const ckx = sd ? .62 : .56, cky = sd ? .62 : .48;
    for (const s of [-1, 1]) { const x = fxOf(s * ckx, th); if (s * sn > .5) continue; ctx.fillStyle = K.rgba(pal.blush, .16 + .3 * (o.blush || 0)); ctx.beginPath(); ctx.ellipse(x, cky, .2 * fwOf(s * ckx, th), .1, 0, 0, TAU); ctx.fill();
      if (o.blush) { ctx.strokeStyle = K.rgba(pal.blush, .9); ctx.lineWidth = lwU * .7; for (let i = 0; i < 3; i++) { const hx = x - .1 + i * .08; ctx.beginPath(); ctx.moveTo(hx + .04, cky - .07); ctx.lineTo(hx - .03, cky + .07); ctx.stroke(); } } }
    if (E.cheek) { const s = sn >= 0 ? 1 : -1, ph = .5 + .5 * Math.sin(t * TAU * 2.2); ctx.fillStyle = K.rgba(pal.skinS, .5); ctx.beginPath(); ctx.ellipse(fxOf(s * .55, th), .62, .18 + .03 * ph, .14 + .03 * ph, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    if (E.cheek) { const s = sn >= 0 ? 1 : -1, ph = .5 + .5 * Math.sin(t * TAU * 2.2), x = fp.X(s * .98, .55); ctx.strokeStyle = pal.line; ctx.lineWidth = lwU * 1.1; ctx.beginPath(); ctx.arc(x - s * .12, .55, .16 + .04 * ph, -.9, .9, false); if (s < 0) { ctx.beginPath(); ctx.arc(x + .12, .55, .16 + .04 * ph, Math.PI - .9, Math.PI + .9); } ctx.fillStyle = pal.skin; ctx.fill(); ctx.stroke(); }
    // features
    const nod = o.nod || 0, fy = nod * .18;
    const eyes = [];
    for (const side of [-1, 1]) {
      const x0 = side * eyeX, x = fxOf(x0, th), wf = fwOf(x0, th);
      eyes.push([x, eyeY + fy]);
      if (side * sn > .62) continue;
      eye(ctx, E.eyes, x, eyeY + fy, eyeS * (sd ? 1.15 : 1), side, { open, look, pal, lw: lwU, wf, glint: E.glint, t });
      if (spec.bags && !sd && E.eyes !== 'happy' && E.eyes !== 'squeeze') { ctx.strokeStyle = K.rgba(K.mixC(pal.skinS, '#7a5a8a', .35), .9); ctx.lineWidth = lwU * .65; ctx.beginPath(); ctx.moveTo(x - side * .08 * wf, eyeY + .31 + fy); ctx.quadraticCurveTo(x + side * .1 * wf, eyeY + .4 + fy, x + side * .24 * wf, eyeY + .28 + fy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - side * .0, eyeY + .4 + fy); ctx.quadraticCurveTo(x + side * .12 * wf, eyeY + .46 + fy, x + side * .2 * wf, eyeY + .38 + fy); ctx.stroke(); }
      if (spec.wrinkles && !sd) { ctx.strokeStyle = K.rgba(pal.skinS, 1); ctx.lineWidth = lwU * .6; ctx.beginPath(); ctx.moveTo(x + side * .32 * wf, eyeY - .02 + fy); ctx.lineTo(x + side * .44 * wf, eyeY - .08 + fy); ctx.moveTo(x + side * .33 * wf, eyeY + .1 + fy); ctx.lineTo(x + side * .45 * wf, eyeY + .14 + fy); ctx.stroke(); }
    }
    // nose: a small tick (3/4: pointing to the turn, with a shade)
    const nx = fxOf(0, th) * 1.06;
    if (!sd) { ctx.strokeStyle = K.rgba(pal.line, .85); ctx.lineWidth = lwU * .8; ctx.beginPath(); ctx.moveTo(nx - .01, nY - .14 + fy); ctx.quadraticCurveTo(nx + .07 * (sn >= 0 ? 1 : -1) + .04 * sn, nY + fy, nx - .03, nY + .05 + fy); ctx.stroke(); }
    else { ctx.fillStyle = K.rgba(pal.skinS, 1); ctx.beginPath(); ctx.ellipse(nx, nY + fy, .05, .035, 0, 0, TAU); ctx.fill(); }
    const mx = fxOf(0, th) * .98, mw = fwOf(0, th);
    if (spec.wrinkles && !sd) { ctx.strokeStyle = K.rgba(pal.skinS, 1); ctx.lineWidth = lwU * .7; for (const s of [-1, 1]) { const x = fxOf(s * .3, th); ctx.beginPath(); ctx.moveTo(x, mY - .22 + fy); ctx.quadraticCurveTo(x + s * .07, mY - .05 + fy, x + s * .02, mY + .1 + fy); ctx.stroke(); } }
    mouth(ctx, o.mouth || E.mouth, mx, mY + fy, { pal, lw: lwU, wf: mw, t, talk: o.talk });
    if (spec.moustache && !sd) { const M = spec.moustache === true ? {} : spec.moustache, y = mY - .19 + fy, p = new Path2D(), w2 = (M.w || .36) * mw, mc = M.col ? (o.stone ? K.stoneCol(M.col, o.stone) : M.col) : pal.hair;
      p.moveTo(mx, y - .02); p.bezierCurveTo(mx - .14 * mw, y - .08, mx - w2 * .8, y - .04, mx - w2, y + .02); p.quadraticCurveTo(mx - w2 * 1.08, y + .1, mx - w2 * .9, y + .1);
      p.quadraticCurveTo(mx - w2 * .5, y + .14, mx, y + .08); p.quadraticCurveTo(mx + w2 * .5, y + .14, mx + w2 * .9, y + .1); p.quadraticCurveTo(mx + w2 * 1.08, y + .1, mx + w2, y + .02);
      p.bezierCurveTo(mx + w2 * .8, y - .04, mx + .14 * mw, y - .08, mx, y - .02); p.closePath();
      ctx.lineJoin = 'round'; ctx.strokeStyle = pal.line; ctx.lineWidth = lwU * 1.1; ctx.stroke(p); ctx.fillStyle = mc; ctx.fill(p);
      ctx.save(); ctx.clip(p); ctx.strokeStyle = K.rgba(K.lightOf(mc, .35), .9); ctx.lineWidth = lwU * .45; for (let i = -3; i <= 3; i++) { if (!i) continue; const x = mx + i * w2 * .26; ctx.beginPath(); ctx.moveTo(x, y - .02); ctx.lineTo(x + i * .015, y + .1); ctx.stroke(); } ctx.restore(); }
    // glasses (round frames; white glare when the expression glints)
    if (spec.glasses) { const gr = (spec.glasses.r || .34) * (sd ? 1.1 : 1), col = spec.glasses.col ? (o.stone ? K.stoneCol(spec.glasses.col, o.stone) : spec.glasses.col) : '#3b3a4a';
      const C2 = eyes.map(([x, y], i) => [x, y + .02, gr * fwOf((i ? 1 : -1) * eyeX, th)]);
      ctx.strokeStyle = col; ctx.lineWidth = lwU * 1.05;
      C2.forEach(([x, y, rx], i) => { const side = i ? 1 : -1; if (side * sn > .7) return; ctx.beginPath(); ctx.ellipse(x, y, rx, gr, 0, 0, TAU);
        if (E.glint) { ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = K.rgba('#b9d7ff', .7); ctx.fillRect(x - rx, y - gr, rx * 2, gr * .35); ctx.restore(); }
        else { ctx.fillStyle = K.rgba('#cfe6ff', .18); ctx.fill(); }
        ctx.stroke();
        ctx.save(); ctx.strokeStyle = K.rgba('#ffffff', E.glint ? 1 : .75); ctx.lineWidth = lwU * (E.glint ? 1.2 : .7); ctx.beginPath(); ctx.moveTo(x - rx * .55, y - gr * .1); ctx.lineTo(x - rx * .1, y - gr * .6); ctx.stroke(); ctx.restore(); });
      ctx.beginPath(); ctx.moveTo(C2[0][0] + C2[0][2], C2[0][1] - .03); ctx.quadraticCurveTo((C2[0][0] + C2[1][0]) / 2, C2[0][1] - .12, C2[1][0] - C2[1][2], C2[1][1] - .03); ctx.stroke();
      const far = sn >= 0 ? 1 : -1, nearI = sn >= 0 ? 0 : 1; ctx.beginPath(); ctx.moveTo(C2[nearI][0] - far * C2[nearI][2], C2[nearI][1] - .05); ctx.lineTo(-far * (1.0 - .4 * Math.abs(sn)) + .55 * sn, -.05); ctx.stroke();
      if (Math.abs(sn) < .3) { ctx.beginPath(); ctx.moveTo(C2[1 - nearI][0] + far * C2[1 - nearI][2], C2[1 - nearI][1] - .05); ctx.lineTo(far * 1.02 + .5 * sn, -.05); ctx.stroke(); }
      if (E.glint) for (const [x, y, rx] of C2) K.star4(ctx, x + rx * .55, y - gr * .55, .32, .2, '#fff', .15);
    }
    if (o.front !== false && spec.hairFront) { ctx.save(); (sd && spec.sdHairFront || spec.hairFront)(ctx, G); ctx.restore(); }
    // brows over the hair (webtoon convention: brows read through the fringe)
    const bk = o.brows || E.brows, bcol = pal.brow;
    for (const side of [-1, 1]) { const x0 = side * eyeX, x = fxOf(x0, th); if (side * sn > .6) continue; brow(ctx, bk, x, (sd ? -.18 : -.36) + fy * .6, side, { lw: lwU, wf: fwOf(x0, th), browW: spec.browW, col: bcol }); }
    if (o.stone && o.crack) { const r = rng(K.hash(spec.name, 'crack')); ctx.strokeStyle = K.rgba('#2f2f36', .8 * clamp(o.crack)); ctx.lineWidth = lwU * .8;
      for (let i = 0; i < 3; i++) { let x = (r() - .5) * 1.4, y = -1.4 + r() * .3; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (r() - .5) * .5; y += .3 + r() * .2; ctx.lineTo(x, y); } ctx.stroke(); } }
    return { eyes, mouth: [mx, mY + fy], nose: [nx, nY], fp };
  }
  R.drawHead = drawHead;

  // hand(ctx, pose, x, y, ang, sz, flip, o) → { grip: [x, y], tip: [x, y] } (current coords): a hand at the wrist (x, y) pointing along ang, sz = palm
  //   length in current units, flip = ±1 (thumb side: −y of the hand when +1). poses: 'open' (relaxed), 'cup' (palm up), 'fist' (= 'rock' 바위,
  //   'hold' — draw the held thing BEFORE the hand so the fingers wrap it), 'point', 'scissors' (가위), 'paper' (보, = 'wave'), 'grab' (a reaching
  //   claw), 'pinch' (thumb + index), 'thumb' (thumbs up), 'mitt' (SD mitten). o { skin, skinS, line, lw }. Fingers + palm share one inked outline.
  const GRIP = { open: [.95, .05], cup: [.85, -.25], fist: [.82, 0], rock: [.82, 0], hold: [.82, 0], point: [1.85, -.32], scissors: [1.7, -.3], paper: [1, 0], wave: [1, 0], grab: [1.1, 0], pinch: [1.36, -.44], thumb: [.8, 0], mitt: [.55, 0] };
  R.GRIP = GRIP;
  function hand(ctx, pose, x, y, ang, sz, flip, o) {
    const lw = (o.lw || 2.5) / sz, sk = o.skin || K.C.skin, sh = o.skinS || K.shadeOf(sk), ln = o.line || K.C.ink, fw = .23;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sz, sz * (flip < 0 ? -1 : 1));
    const parts = [], fing = (pts, w = fw) => { parts.push({ p: K.smooth(pts, false), fill: sk, line: true, w }); };
    const palm = (x1 = .95, wt = .34, wb = .3) => { const p = new Path2D(); p.moveTo(-.08, -wb); p.quadraticCurveTo(x1 * .5, -wt - .04, x1, -wt); p.quadraticCurveTo(x1 + .12, 0, x1, wt * .95); p.quadraticCurveTo(x1 * .5, wt + .05, -.08, wb); p.closePath(); parts.push({ p, fill: sk }); return p; };
    const folded = (x0 = .72, x1 = 1.12, y0 = -.4, y1 = .38) => { const p = K.rr(x0, y0, x1 - x0, y1 - y0, .16); parts.push({ p, fill: sk }); return p; };
    let creases = null;
    if (pose === 'mitt') { parts.push({ p: K.ell(.5, 0, .55, .48), fill: sk }); parts.push({ p: K.ell(.42, -.42, .2, .16, -.5), fill: sk }); }
    else if (pose === 'open' || pose === 'cup') { const c = pose === 'cup' ? -.18 : .06; palm(); fing([[.9, -.27], [1.4, -.3 + c * .5], [1.7, -.26 + c]], .21); fing([[.92, -.08], [1.5, -.08 + c * .5], [1.82, -.03 + c]], .22); fing([[.92, .1], [1.45, .12 + c * .5], [1.72, .16 + c]], .21); fing([[.88, .27], [1.3, .3 + c * .5], [1.5, .33 + c]], .18);
      fing([[.15, -.28], [.55, -.5], [.85, -.55]], .23); }
    else if (pose === 'paper' || pose === 'wave') { palm(); const fan = [[-.36, .78, -.27], [-.12, .86, -.09], [.12, .8, .1], [.36, .62, .27]];
      for (const [a, L, y0] of fan) fing([[.88, y0], [.88 + Math.cos(a) * L * .55, y0 + Math.sin(a) * L * .55], [.88 + Math.cos(a) * L, y0 + Math.sin(a) * L * 1.05]], .22);
      fing([[.15, -.3], [.35, -.68], [.42, -1.02]], .24); }
    else if (pose === 'fist' || pose === 'rock' || pose === 'hold' || pose === 'thumb') { palm(.8, .36, .32); folded(); creases = [[.74, -.2], [1.1, -.2], [.74, .0], [1.1, .0], [.74, .19], [1.1, .19]];
      if (pose === 'thumb') fing([[.3, -.36], [.36, -.75], [.38, -1.05]], .25); else fing([[.18, -.36], [.62, -.5], [.98, -.42]], .25); }
    else if (pose === 'point') { palm(.8, .36, .32); folded(.72, 1.08, -.18, .38); fing([[.8, -.3], [1.3, -.33], [1.85, -.32]], .22); fing([[.18, -.36], [.55, -.44], [.85, -.3]], .24); creases = [[.74, .0], [1.06, .0], [.74, .19], [1.06, .19]]; }
    else if (pose === 'scissors') { palm(.8, .36, .32); folded(.72, 1.06, .02, .38); fing([[.8, -.32], [1.25, -.5], [1.68, -.66]], .22); fing([[.82, -.1], [1.3, -.1], [1.8, -.06]], .22); fing([[.18, -.36], [.55, -.2], [.8, .06]], .24); creases = [[.74, .2], [1.04, .2]]; }
    else if (pose === 'grab') { palm(.85, .38, .32); const fs = [[-.3, -.42], [-.1, -.14], [.1, .12], [.3, .36]];
      fs.forEach(([a, y0], i) => fing([[.85, y0 * .85], [1.25, y0 + a * .2], [1.5, y0 + .12 + a * .1], [1.55, y0 + .3]], i === 3 ? .19 : .22)); fing([[.2, -.32], [.55, -.72], [.95, -.82], [1.15, -.68]], .24); }
    else if (pose === 'pinch') { palm(.85, .35, .3); folded(.74, 1.08, -.12, .38); fing([[.84, -.3], [1.2, -.42], [1.36, -.46]], .21); fing([[.18, -.32], [.7, -.55], [1.3, -.5]], .23); creases = [[.76, .08], [1.06, .08], [.76, .24], [1.06, .24]]; }
    K.inkGroup(ctx, parts, lw, ln);
    // one cel band: the far edge of the palm
    if (pose !== 'mitt') { ctx.save(); ctx.clip(parts[0].p); ctx.fillStyle = K.rgba(sh, .85); ctx.beginPath(); ctx.ellipse(.4, .45, .9, .22, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    if (creases) { ctx.strokeStyle = K.rgba(ln, .75); ctx.lineWidth = lw * .9; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i < creases.length; i += 2) { ctx.moveTo(...creases[i]); ctx.lineTo(...creases[i + 1]); } ctx.stroke(); }
    ctx.restore();
    const g = GRIP[pose] || GRIP.open, c = Math.cos(ang), s = Math.sin(ang), fy = flip < 0 ? -1 : 1, P = (u, v) => [x + (u * c - v * fy * s) * sz, y + (u * s + v * fy * c) * sz];
    return { grip: P(g[0], g[1]), tip: P(pose === 'point' ? 1.85 : 1.6, pose === 'point' ? -.32 : 0), P };
  }
  R.hand = hand;
  // gripOffset(pose, ang, sz, flip) → the vector wrist → grip point (so an IK can aim the wrist so that the GRIP lands on a target)
  R.gripOffset = (pose, ang, sz, flip) => { const g = GRIP[pose] || GRIP.open, c = Math.cos(ang), s = Math.sin(ang), fy = flip < 0 ? -1 : 1; return [(g[0] * c - g[1] * fy * s) * sz, (g[0] * s + g[1] * fy * c) * sz]; };

  // person(ctx, t, spec, o) → G: draws a normal-proportion person (ctx = null → geometry only).
  //   o = { x, y (feet on the ground, current coords), s (scale: 1 → 640 px tall; ~2.4 full body in a frame, ~5–7 bust), turn (rad, −.75….75:
  //     0 front, ±.55 the 3/4 view, + faces screen-right), headTurn (extra), tilt (head roll rad), nod (−1…1 look down), lean (rad toward the facing),
  //     pose: 'stand' | 'walk' | 'sit' | 'kneel' | 'crouch', ph (walk phase, cycles), crouch (0…1), bob,
  //     expr (R.EXPR name) + overrides eyes / brows / mouth / talk (0…1) / look [gx, gy] / blush (0…1) / open (blink override, false = no blink),
  //     arms: { L, R } — screen-left / screen-right arm: { to: [x, y] (world target for the GRIP point), hand: pose, ang (world hand angle, clamped
  //       ≤ 80° off the forearm), bend: ±1 (elbow side; default: down/out), thumb: ±1, front: true (draw a far arm in front of the body),
  //       prop(ctx, H) / propFront(ctx, H) (a held thing drawn behind / in front of the fingers, H = { grip, x, y, ang, sz, P(u, v) }) }
  //       an arm without `to` hangs (relaxed, swinging on a walk), `hand` alone changes the hanging hand.
  //     sway (amp, default 1; false = still), hairEv ([t…] hair kicks: turns, stops), wind, stone (0…1 grey), crack (0…1), alpha,
  //     light: [dx, dy] (cel offset), rim: { col, dx, dy, a } (a rim light over the figure), only: 'head' (head + neck only) }
  //   Returns G = { head: { x, y, r, dir, tilt }, eyes: [[x, y]…], mouth, hands: { L, R } ({ x, y, ang, grip, reach }), shoulders: { L, R },
  //     neck, hip, top (crown y), box { x, y, w, h } } — all in the caller's coords (aim tails at G.mouth, emotes at G.head, tears at G.eyes).
  R.person = function (ctx, t, spec, o = {}) {
    const s = o.s || 1, h = spec.h || 1, B = spec.build || {}, pal = palOf(spec, o), hw = R.HW * (spec.head || 1);
    const th = clamp(o.turn || 0, -.8, .8), sn = Math.sin(th), fwd = Math.abs(sn) > .08 ? Math.sign(sn) : 0;
    const sw = o.sway === false ? ZS : K.sway(t, spec.seed || 1, o.sway ?? 1), lw = K.lwFor(s), lwi = lw * .6;
    const shW = (B.sh || 62), waist = (B.waist || 44) + (B.belly || 0) * .5, hipW = B.hip || 48, belly = B.belly || 0, armK = B.arm || 1, legK = B.leg || 1;
    const pose = o.pose || 'stand', ph = o.ph || 0;
    let hipY = -300 * h * legK + (o.bob || 0);
    const legSpan = 300 * h * legK - 26, Lt = legSpan * .512, Ls = legSpan * .5, hipJ = hipW * .48;
    // ---- legs (rig-local targets for the ankles)
    let ank = [[-hipJ - 3 + fwd * 4, -16], [hipJ + 3 + fwd * 4, -16]], kneeFwd = fwd || 0, lift = [0, 0];
    if (pose === 'walk') { const st = 46 * h * legK; for (let i = 0; i < 2; i++) { const a = TAU * ph + i * Math.PI, sw2 = Math.sin(a); ank[i][0] += (fwd || 0) * st * sw2; lift[i] = Math.max(0, Math.cos(a)) * 22 * h; if (!fwd) ank[i][1] -= lift[i] * .5; else ank[i][1] -= lift[i]; }
      hipY += -6 * Math.abs(Math.cos(TAU * ph)) * h + 4 * h; }
    else if (pose === 'sit') { hipY = -232 * h; ank = [[-hipJ - 6 + fwd * 92, -16], [hipJ + 6 + fwd * 98, -16]]; }
    else if (pose === 'kneel') { hipY = -188 * h; const f = fwd || 1; ank = f > 0 ? [[-hipJ - 70, -14], [hipJ + 60, -16]] : [[-hipJ - 60, -16], [hipJ + 70, -14]]; }
    else if (pose === 'crouch') { const k = clamp(o.crouch ?? 1); hipY = lerp(hipY, -165 * h, k); ank = [[-hipJ - 8 * k + fwd * 6, -16], [hipJ + 8 * k + fwd * 6, -16]]; }
    const bodyRot = (o.lean || 0) * (fwd || 1) + sw.body;
    const shY = hipY - 200 * h, waistY = hipY - 92 * h, neckY = shY - 6 * h, neckTop = neckY - 26 * h;
    const cxS = .46 * sn * shW, cxN = .34 * sn * shW;
    const xl = -shW * (1 - .34 * Math.max(0, -sn)) + .12 * sn * shW, xr = shW * (1 - .34 * Math.max(0, sn)) + .12 * sn * shW;
    const Mb = new DOMMatrix().translate(0, hipY).rotate(toDeg(bodyRot)).translate(0, -hipY);
    const Mr = new DOMMatrix().translate(o.x || 0, o.y || 0).scale(s);
    const toW = (M, p) => { const q = M.transformPoint({ x: p[0], y: p[1] }); return [q.x, q.y]; };
    const MbW = Mr.multiply(Mb);
    const headRot = sw.head + (o.tilt || 0), thH = clamp(th + (o.headTurn || 0), -.85, .85), snH = Math.sin(thH);
    const breath = 1 + sw.breath;
    const Mh = Mb.translate(cxN, neckTop + 4 * h).rotate(toDeg(headRot)).translate(0, -hw * 1.02).scale(hw);   // rig-local → head units
    const MhW = Mr.multiply(Mh);
    // ---- shoulders & arms (rig-local)
    const shJ = [toW(Mb, [xl + 13, shY + 14]), toW(Mb, [xr - 13, shY + 14])];
    const Lu = 104 * h * armK, Lf = 97 * h * armK, hsz = 29 * h * armK;
    const inv = Mr.inverse(), arms = o.arms || {};
    const armSol = ['L', 'R'].map((k, i) => {
      const A = arms[k] || {}, side = i ? 1 : -1, S0 = shJ[i];
      const pose2 = A.hand || 'open';
      let target, ang;
      if (A.to) { const q = inv.transformPoint({ x: A.to[0], y: A.to[1] }); target = [q.x, q.y]; }
      else { const swing = pose === 'walk' ? Math.sin(TAU * ph + (i ? 0 : Math.PI)) * .3 * (fwd || 0) : 0, a = Math.PI / 2 - side * .05 - swing;
        target = [S0[0] + Math.cos(a) * (Lu + Lf) * .985 + side * 2, S0[1] + Math.sin(a) * (Lu + Lf) * .985]; }
      const wantAng = A.ang != null ? A.ang - Math.atan2(Mr.b, Mr.a) : null;
      let flip = A.thumb ?? 1, sol = null, wrist = target;
      for (let it = 0; it < 3; it++) {
        const dir0 = sol ? sol.a2 : Math.atan2(target[1] - S0[1], target[0] - S0[0]);
        ang = wantAng == null ? dir0 + (A.to ? 0 : side * -.12) : dir0 + clamp(((wantAng - dir0 + 3 * Math.PI) % TAU) - Math.PI, -1.4, 1.4);
        if (A.thumb == null) { const c = Math.cos(ang); flip = Math.abs(c) > .35 ? (c > 0 ? 1 : -1) : (side < 0 ? 1 : -1); }
        if (A.to) { const off = R.gripOffset(pose2, ang, hsz, flip); wrist = [target[0] - off[0], target[1] - off[1]]; } else wrist = target;
        let bend = A.bend;
        if (bend == null) { const c1 = K.ik(S0, wrist, Lu, Lf, 1), c2 = K.ik(S0, wrist, Lu, Lf, -1), sc1 = c1.e[1] + side * (c1.e[0] - S0[0]) * .9, sc2 = c2.e[1] + side * (c2.e[0] - S0[0]) * .9; bend = sc1 >= sc2 ? 1 : -1; }
        sol = K.ik(S0, wrist, Lu, Lf, bend); sol.bend = bend;
      }
      return { side, S: S0, e: sol.e, w: sol.w, ang, flip, pose: pose2, A, reach: sol.reach };
    });
    // ---- legs IK (knees toward the facing, or outward in front view)
    const legSol = [0, 1].map(i => { const side = i ? 1 : -1, a = [side * hipJ, hipY + 10], b = ank[i];
      const c1 = K.ik(a, b, Lt, Ls, 1), c2 = K.ik(a, b, Lt, Ls, -1), pref = kneeFwd ? kneeFwd : side * .4;
      const pick = (c1.e[0] - a[0]) * pref >= (c2.e[0] - a[0]) * pref ? c1 : c2; return { a, k: pick.e, b: pick.w, side }; });
    // ---- geometry out
    const hC = toW(MhW, [0, 0]), hR = hw * s * 1.25;
    const Gout = { head: { x: hC[0], y: hC[1] - hw * s * .2, r: hR, dir: fwd || 1, tilt: headRot + bodyRot }, hands: {}, shoulders: {}, s };
    Gout.top = toW(MhW, [0, -1.9])[1];
    Gout.neck = toW(MbW, [cxN, neckY]); Gout.hip = toW(Mr, [0, hipY]);
    Gout.box = { x: (o.x || 0) - 110 * s, y: Gout.top - 20 * s, w: 220 * s, h: (o.y || 0) - Gout.top + 30 * s };
    const turnF = x => fxOf(x, thH);
    Gout.eyes = [toW(MhW, [turnF(-.42), .1]), toW(MhW, [turnF(.42), .1])]; Gout.mouth = toW(MhW, [turnF(0), .85]);
    armSol.forEach((a, i) => { const k = i ? 'R' : 'L'; const gp = R.gripOffset(a.pose, a.ang, hsz, a.flip), wq = toW(Mr, a.w);
      Gout.hands[k] = { x: wq[0], y: wq[1], ang: a.ang + Math.atan2(Mr.b, Mr.a), grip: toW(Mr, [a.w[0] + gp[0], a.w[1] + gp[1]]), reach: a.reach, elbow: toW(Mr, a.e) }; Gout.shoulders[k] = toW(Mr, a.S); });
    if (!ctx) return Gout;

    // ================= draw
    const base = ctx.getTransform(); ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const setM = M => ctx.setTransform(base.multiply(M));
    const ink = pal.line, L = lw, lightDx = (o.light || [-8, -6])[0], lightDy = (o.light || [-8, -6])[1];
    const cel = (p, base2) => K.cel(ctx, p, base2, K.shadeOf(base2), lightDx, lightDy);
    const sleeveCol = spec.outer && spec.outer.kind !== 'vest' ? pal.outer : pal.shirt;
    // -- arm drawing (rig-local coords)
    const drawArm = (a) => {
      const S0 = a.S, E = a.e, Wr = a.w, roll = spec.shirt && spec.shirt.roll && !(spec.outer && spec.outer.kind !== 'vest');
      const up = K.capsule(S0, E, 15 * armK * h, 13 * armK * h), fa = K.capsule(E, Wr, 13 * armK * h, 10.5 * armK * h);
      const H = { x: Wr[0], y: Wr[1], ang: a.ang, sz: hsz }; const gp = R.gripOffset(a.pose, a.ang, hsz, a.flip); H.grip = [Wr[0] + gp[0], Wr[1] + gp[1]];
      if (a.A.prop) a.A.prop(ctx, H);
      if (roll) {   // rolled sleeves: bare forearm (skin) + hand share an outline, the roll band over the elbow
        K.inkGroup(ctx, [{ p: up, fill: sleeveCol }], L, ink); cel(up, sleeveCol);
        K.inkGroup(ctx, [{ p: fa, fill: pal.skin }], L, ink); cel(fa, pal.skin);
        hand(ctx, a.pose, Wr[0], Wr[1], a.ang, hsz, a.flip, { skin: pal.skin, skinS: pal.skinS, line: ink, lw: L });
        const rb = K.capsule(K.lerpP(S0, E, .82), K.lerpP(E, Wr, .22), 16.5 * armK * h, 15 * armK * h); K.inked(ctx, rb, K.mixC(sleeveCol, '#ffffff', .25), L, ink);
        ctx.strokeStyle = K.rgba(ink, .5); ctx.lineWidth = lwi; ctx.beginPath(); const m = K.lerpP(K.lerpP(S0, E, .82), K.lerpP(E, Wr, .22), .5), an = Math.atan2(Wr[1] - S0[1], Wr[0] - S0[0]) + Math.PI / 2; ctx.moveTo(m[0] + Math.cos(an) * 14, m[1] + Math.sin(an) * 14); ctx.lineTo(m[0] - Math.cos(an) * 14, m[1] - Math.sin(an) * 14); ctx.stroke();
      } else {
        hand(ctx, a.pose, Wr[0], Wr[1], a.ang, hsz, a.flip, { skin: pal.skin, skinS: pal.skinS, line: ink, lw: L });
        K.inkGroup(ctx, [{ p: up, fill: sleeveCol }, { p: fa, fill: sleeveCol }], L, ink); cel(up, sleeveCol); cel(fa, sleeveCol);
        // cuff (+ the inner shirt cuff peeking out of a jacket / cardigan sleeve)
        const c0 = K.lerpP(E, Wr, .8), c1 = K.lerpP(E, Wr, 1.02);
        if (spec.outer && spec.outer.kind !== 'vest') { const sc = K.capsule(K.lerpP(E, Wr, .9), K.lerpP(E, Wr, 1.04), 10.5 * armK * h, 10 * armK * h); K.inked(ctx, sc, spec.hood ? pal.shirt : K.mixC(pal.shirt, '#ffffff', .2), lwi, ink); }
        const cf = K.capsule(c0, c1, 11.5 * armK * h, 11 * armK * h); K.inked(ctx, cf, spec.outer && spec.outer.kind === 'cardigan' ? K.shadeOf(sleeveCol, .5) : sleeveCol, lwi, ink);
        if (spec.outer && spec.outer.kind === 'cardigan') { ctx.strokeStyle = K.rgba(ink, .35); ctx.lineWidth = lwi * .6; for (let k = 1; k < 4; k++) { const q = K.lerpP(c0, c1, k / 4), an = Math.atan2(Wr[1] - E[1], Wr[0] - E[0]); ctx.beginPath(); ctx.moveTo(q[0] + Math.cos(an + 1.57) * 10, q[1] + Math.sin(an + 1.57) * 10); ctx.lineTo(q[0] - Math.cos(an + 1.57) * 10, q[1] - Math.sin(an + 1.57) * 10); ctx.stroke(); } }
      }
      if (spec.band && a.side < 0) { const b0 = K.lerpP(E, Wr, .84), b1 = K.lerpP(E, Wr, .97); K.inked(ctx, K.capsule(b0, b1, 12 * armK * h, 11.5 * armK * h), pal.band, lwi, ink); ctx.fillStyle = '#fff'; ctx.globalAlpha *= .9; const bm = K.lerpP(b0, b1, .5); ctx.beginPath(); ctx.arc(bm[0], bm[1], 3, 0, TAU); ctx.fill(); ctx.globalAlpha = o.alpha ?? 1; }
      if (a.A.propFront) a.A.propFront(ctx, H);
    };
    const farFirst = fwd !== 0 ? (fwd > 0 ? 1 : 0) : -1;   // index of the far arm (behind the body) in 3/4, −1 in front view
    // -- far arm (behind)
    setM(Mr);
    if (o.only !== 'head' && farFirst >= 0 && !(armSol[farFirst].A.front)) drawArm(armSol[farFirst]);
    // -- back hair (behind the body)
    setM(MhW); if (spec.hairBack) { ctx.save(); spec.hairBack(ctx, headG(t, spec, pal, o, thH, L / hw, false)); ctx.restore(); }
    // -- hood bunched at the neck (behind)
    setM(MbW);
    if (spec.hood && o.only !== 'head') { const p = new Path2D(); p.moveTo(cxN - 48, neckY + 6); p.bezierCurveTo(cxN - 62, neckY - 34, cxN + 62, neckY - 34, cxN + 48, neckY + 6); p.closePath(); K.inked(ctx, p, pal.shirt, L, ink); cel(p, pal.shirt); }
    // -- legs + shoes
    setM(Mr);
    if (o.only !== 'head') {
      const legParts = [], shoes = [];
      const order = fwd > 0 ? [1, 0] : [0, 1];   // far leg first
      for (const i of order) { const lg = legSol[i];
        const th1 = K.capsule(lg.a, lg.k, 23 * h, 19 * h), sh1 = K.capsule(lg.k, lg.b, 19 * h, 15 * h);
        const legCol = spec.skirt ? pal.sock || pal.skin : pal.pants;
        legParts.push({ i, parts: [{ p: th1, fill: legCol }, { p: sh1, fill: legCol }] });
        const toe = fwd || (i ? .35 : -.35), sp = new Path2D(); const bx = lg.b[0], by = lg.b[1] + 4;
        sp.moveTo(bx - 16 + Math.min(0, toe) * 14, by - 12); sp.quadraticCurveTo(bx + toe * 34, by - 16, bx + toe * 40 + (toe > 0 ? 8 : -8) * Math.abs(toe), by + 4); sp.quadraticCurveTo(bx + toe * 30, by + 16, bx, by + 14); sp.quadraticCurveTo(bx - 20 - Math.max(0, -toe) * 0, by + 14, bx - 18, by); sp.closePath();
        shoes.push({ i, p: sp });
      }
      const pelvis = K.rr(-hipW * (1 - .2 * Math.abs(sn)), waistY + 22 * h, hipW * 2 * (1 - .2 * Math.abs(sn)), hipY - waistY - 4, 22 * h);
      for (const lg of legParts) { K.inkGroup(ctx, lg.parts, L, ink); for (const q of lg.parts) cel(q.p, q.fill);
        const shp = shoes.find(z => z.i === lg.i).p; K.inked(ctx, shp, pal.shoes, L, ink); ctx.save(); ctx.clip(shp); ctx.fillStyle = K.rgba('#ffffff', .25); ctx.fillRect(lg.parts[1] ? -1e3 : 0, -40, 2e3, 14); ctx.restore(); }
      if (!spec.skirt) { setM(MbW); K.inkGroup(ctx, [{ p: pelvis, fill: pal.pants }], L, ink); cel(pelvis, pal.pants); setM(Mr);
        // re-draw the top of each thigh over the pelvis outline so the legs join it
        for (const lg of legParts) { ctx.save(); const cl = new Path2D(); cl.rect(-300, hipY - 10, 600, 60); ctx.clip(cl); ctx.fillStyle = pal.pants; ctx.fill(lg.parts[0].p); ctx.restore(); }
        ctx.strokeStyle = K.rgba(ink, .6); ctx.lineWidth = lwi; ctx.beginPath(); ctx.moveTo(fwd * 8, hipY - 6); ctx.lineTo(fwd * 4, hipY + 34); ctx.stroke(); }
      else { setM(MbW); const len = spec.skirt.len || 130, sk = new Path2D(), fl = 1 + .12 * Math.sin(t * 2 + 1) * .2;
        sk.moveTo(-waist + 2, waistY + 14); sk.lineTo(waist - 2, waistY + 14); sk.quadraticCurveTo(hipW + 20, hipY + len * .4, hipW * 1.35 * fl, hipY + len); sk.quadraticCurveTo(0, hipY + len + 12, -hipW * 1.35 * fl, hipY + len); sk.quadraticCurveTo(-hipW - 20, hipY + len * .4, -waist + 2, waistY + 14); sk.closePath();
        K.inked(ctx, sk, pal.skirt, L, ink); cel(sk, pal.skirt); ctx.strokeStyle = K.rgba(ink, .4); ctx.lineWidth = lwi; for (const x of [-.5, 0, .5]) { ctx.beginPath(); ctx.moveTo(x * hipW * .6, hipY + 10); ctx.lineTo(x * hipW * 1.2, hipY + len - 4); ctx.stroke(); } }
    }
    // -- neck
    setM(MbW);
    const nw = (B.neck || 13) * h;
    { const np = K.rr(cxN - nw, neckTop - 6, nw * 2, neckY - neckTop + 14, nw * .6); K.inked(ctx, np, pal.skin, L, ink); ctx.save(); ctx.clip(np); ctx.fillStyle = pal.skinS; ctx.beginPath(); ctx.ellipse(cxN + 6 * sn, neckTop - 4, nw * 1.6, 14 * h, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    // -- torso (shirt), breathing on the chest
    if (o.only !== 'head') {
      ctx.save(); ctx.translate(0, waistY); ctx.scale(1, breath); ctx.translate(0, -waistY);
      const wl = -waist * (1 - .22 * Math.max(0, -sn)), wr = waist * (1 - .22 * Math.max(0, sn)), hl = -hipW * (1 - .2 * Math.max(0, -sn)) - belly * .3, hr = hipW * (1 - .2 * Math.max(0, sn)) + belly * .3;
      const bl = belly * (fwd >= 0 ? .4 : 1), br = belly * (fwd <= 0 ? .4 : 1);
      const tp = new Path2D();
      tp.moveTo(cxN - nw - 4, neckY - 2); tp.quadraticCurveTo(xl + 22, shY - 8, xl + 4, shY + 16); tp.quadraticCurveTo(xl - 2, shY + 40, xl + 4, shY + 76);
      tp.quadraticCurveTo(wl - bl - 2, waistY - 30, wl - bl, waistY + 4); tp.quadraticCurveTo(hl - 2, hipY - 34, hl, hipY - 22); tp.lineTo(hr, hipY - 22); tp.quadraticCurveTo(hr + 2, hipY - 34, wr + br, waistY + 4);
      tp.quadraticCurveTo(wr + br + 2, waistY - 30, xr - 4, shY + 76); tp.quadraticCurveTo(xr + 2, shY + 40, xr - 4, shY + 16); tp.quadraticCurveTo(xr - 22, shY - 8, cxN + nw + 4, neckY - 2); tp.closePath();
      const torsoTop = spec.hood ? pal.shirt : pal.shirt;
      K.inked(ctx, tp, torsoTop, L, ink); cel(tp, torsoTop);
      ctx.save(); ctx.clip(tp);
      // tucked belt line for shirts without an outer layer
      if (!spec.outer || spec.outer.kind === 'vest') { ctx.fillStyle = K.shadeOf(pal.pants, .6); ctx.fillRect(-200, hipY - 34, 400, 14); ctx.strokeStyle = K.rgba(ink, .7); ctx.lineWidth = lwi; ctx.beginPath(); ctx.moveTo(-200, hipY - 34); ctx.lineTo(200, hipY - 34); ctx.stroke();
        ctx.fillStyle = '#c9b48a'; ctx.fillRect(cxS - 8, hipY - 35, 16, 15); }
      // shirt placket / hoodie front
      ctx.strokeStyle = K.rgba(ink, .55); ctx.lineWidth = lwi;
      if (!spec.hood) { ctx.beginPath(); ctx.moveTo(cxS, neckY + 30); ctx.lineTo(cxS + 2 * sn, hipY - 36); ctx.stroke(); for (let k = 0; k < 4; k++) { ctx.fillStyle = K.rgba(ink, .5); ctx.beginPath(); ctx.arc(cxS + 5, neckY + 48 + k * 34, 2.4, 0, TAU); ctx.fill(); } }
      else { ctx.beginPath(); ctx.moveTo(cxS - 9, neckY + 6); ctx.lineTo(cxS - 11, neckY + 56); ctx.moveTo(cxS + 9, neckY + 6); ctx.lineTo(cxS + 11, neckY + 52); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cxS - 11, neckY + 58, 3, 0, TAU); ctx.arc(cxS + 11, neckY + 54, 3, 0, TAU); ctx.fill();
        ctx.strokeStyle = K.rgba(ink, .4); ctx.beginPath(); ctx.moveTo(cxS - 40, waistY + 10); ctx.quadraticCurveTo(cxS, waistY + 2, cxS + 40, waistY + 10); ctx.stroke(); }
      ctx.restore();
      // the outer layer: vest / jacket / cardigan (two front panels leaving the opening)
      if (spec.outer) { const k = spec.outer.kind, op = spec.outer.open ?? (k === 'vest' ? 10 : 34), vy = k === 'vest' ? shY + 96 : k === 'cardigan' ? shY + 120 : shY + 70;
        const side = (sg) => { const p = new Path2D(), xs = sg < 0 ? xl : xr, ws = sg < 0 ? wl - bl : wr + br, hs = sg < 0 ? hl : hr, inset = k === 'vest' ? 14 : 0;
          p.moveTo(cxN + sg * (nw + 2), neckY - 2); p.quadraticCurveTo(xs - sg * (22 + inset), shY - 8 + inset * .3, xs - sg * (4 + inset), shY + 16 + inset);
          if (k === 'vest') { p.quadraticCurveTo(xs - sg * (inset + 18), shY + 52, xs - sg * 2, shY + 82); } else p.quadraticCurveTo(xs + sg * 2, shY + 40, xs - sg * 4, shY + 76);
          p.quadraticCurveTo(ws + sg * 2, waistY - 30, ws + sg * 1, waistY + 4); p.quadraticCurveTo(hs + sg * 2, hipY - 34, hs + sg * 2, hipY - 12 + (k === 'vest' ? -14 : 0));
          p.lineTo(cxS + sg * op + (k === 'vest' ? 0 : sg * 6), hipY - (k === 'vest' ? 18 : 10)); p.lineTo(cxS + sg * (k === 'vest' ? 4 : op * .7), vy); p.closePath(); return p; };
        for (const sg of [-1, 1]) { const p = side(sg); K.inked(ctx, p, pal.outer, L, ink); cel(p, pal.outer); }
        if (k === 'jacket') for (const sg of [-1, 1]) { const lp = new Path2D(); lp.moveTo(cxN + sg * (nw + 2), neckY - 2); lp.lineTo(cxS + sg * (op * .7), vy); lp.lineTo(cxS + sg * (op * .7 + 26), vy - 40); lp.lineTo(cxS + sg * (op * .7 + 16), vy - 52); lp.lineTo(cxN + sg * (nw + 18), neckY + 6); lp.closePath(); K.inked(ctx, lp, K.shadeOf(pal.outer, .55), lwi, ink); }
        if (k === 'cardigan') { ctx.strokeStyle = K.rgba(ink, .35); ctx.lineWidth = lwi * .7; for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cxS + sg * (op * .7 + 6), vy); ctx.lineTo(cxS + sg * (op + 10), hipY - 12); ctx.stroke(); }
          ctx.save(); ctx.fillStyle = K.shadeOf(pal.outer, .4); for (const sg of [-1, 1]) { const p = side(sg); ctx.save(); ctx.clip(p); ctx.fillRect(-300, hipY - 36, 600, 26); ctx.restore(); } ctx.restore(); }
        for (let b = 0; b < (k === 'vest' ? 3 : k === 'cardigan' ? 4 : 1); b++) { const by = vy + 18 + b * (k === 'vest' ? 34 : 30), bx = cxS - (k === 'vest' ? 4 : op * .7 + 4) + (by - vy) * (op - op * .7) / (hipY - vy) * -1;
          ctx.fillStyle = K.shadeOf(pal.outer, 1.6); ctx.strokeStyle = ink; ctx.lineWidth = lwi * .7; ctx.beginPath(); ctx.arc(bx - 6, by, 4.2, 0, TAU); ctx.fill(); ctx.stroke(); } }
      // collar
      const col = spec.shirt && spec.shirt.collar || 'shirt';
      if (col === 'shirt') { const open = spec.shirt.open, cw = K.mixC(pal.shirt, '#ffffff', .3);
        if (open) { const v = new Path2D(); v.moveTo(cxN - 9, neckY - 2); v.lineTo(cxN + 9, neckY - 2); v.lineTo(cxS + 1, neckY + 26); v.closePath(); ctx.fillStyle = pal.skin; ctx.fill(v); }
        for (const sg of [-1, 1]) { const p = new Path2D(); p.moveTo(cxN + sg * (nw + 3), neckY - 10); p.lineTo(cxN + sg * (nw + 22), neckY + 14); p.lineTo(cxS + sg * (open ? 9 : 3), neckY + 22); p.lineTo(cxN + sg * (open ? 8 : 1), neckY + 2); p.closePath(); K.inked(ctx, p, cw, lwi, ink); } }
      else if (col === 'round') { ctx.strokeStyle = ink; ctx.lineWidth = lwi; ctx.beginPath(); ctx.ellipse(cxN, neckY + 2, nw + 6, 9, 0, 0, Math.PI); ctx.stroke(); }
      // tie (loose: knot lower, swinging)
      if (spec.tie) { const lo = spec.tie.loose ? 1 : 0, ky = neckY + 16 + lo * 14, kx = cxS + lo * 4, swing = K.spring(t, o.hairEv || [], { A: .25, wind: .02 }) * 20 + sw.body * 300, tc = pal.tie;
        const kn = new Path2D(); kn.moveTo(kx - 9, ky - 7); kn.lineTo(kx + 9, ky - 7); kn.lineTo(kx + 6, ky + 9); kn.lineTo(kx - 6, ky + 9); kn.closePath();
        const bl2 = new Path2D(); const by = waistY - 6 - lo * 8; bl2.moveTo(kx - 6, ky + 8); bl2.lineTo(kx + 6, ky + 8); bl2.lineTo(kx + 13 + swing * .5, by); bl2.lineTo(kx + swing, by + 16); bl2.lineTo(kx - 13 + swing * .5, by); bl2.closePath();
        K.inked(ctx, bl2, tc, lwi, ink); cel(bl2, tc); K.inked(ctx, kn, K.shadeOf(tc, .6), lwi, ink);
        ctx.strokeStyle = K.rgba('#ffffff', .25); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(kx - 3, ky + 30); ctx.lineTo(kx + 6, ky + 22); ctx.moveTo(kx - 4, ky + 60); ctx.lineTo(kx + 7, ky + 52); ctx.stroke(); }
      // lanyard + ID card
      if (spec.lanyard) { const sway2 = sw.body * 400; ctx.strokeStyle = pal.lanyard || '#4b7bd0'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        const cy = shY + 118, cx = cxS + sway2; ctx.beginPath(); ctx.moveTo(cxN - nw - 2, neckY + 2); ctx.quadraticCurveTo(cxS - 22, shY + 70, cx - 4, cy - 8); ctx.moveTo(cxN + nw + 2, neckY + 2); ctx.quadraticCurveTo(cxS + 22, shY + 70, cx + 4, cy - 8); ctx.stroke();
        const card = K.rr(cx - 22, cy - 6, 44, 58, 5); K.inked(ctx, card, '#ffffff', lwi, ink); ctx.save(); ctx.clip(card); ctx.fillStyle = pal.lanyard || '#4b7bd0'; ctx.fillRect(cx - 24, cy - 8, 48, 14); ctx.fillStyle = '#d7dbe3'; ctx.fillRect(cx - 14, cy + 14, 14, 16); ctx.fillRect(cx + 4, cy + 16, 12, 4); ctx.fillRect(cx + 4, cy + 24, 12, 4); ctx.restore(); }
      ctx.restore();   // breath
    }
    // -- head
    setM(MhW);
    const E = Object.assign({}, EXPR[o.expr || 'neutral'] || EXPR.neutral); if (o.eyes) E.eyes = o.eyes; if (o.brows) E.brows = o.brows; if (o.mouth) E.mouth = o.mouth;
    if (o.glint != null) E.glint = o.glint;
    const hd = drawHead(ctx, t, spec, pal, Object.assign({}, o, { back: false }), E, thH, L / hw, false);
    Gout.eyes = hd.eyes.map(p => toW(MhW, p)); Gout.mouth = toW(MhW, hd.mouth);
    // -- near arm(s)
    setM(Mr);
    if (o.only !== 'head') { if (farFirst < 0) { drawArm(armSol[0]); drawArm(armSol[1]); } else { if (armSol[farFirst].A.front) drawArm(armSol[farFirst]); drawArm(armSol[1 - farFirst]); } }
    ctx.restore(); ctx.setTransform(base);
    if (E.tears && o.tears !== false) K.tears(ctx, t, Gout.eyes, E.tears, { r: hw * s * .9, at: o.tearAt });
    return Gout;
  };
  // fitReach(t, spec, o, side, target, max = 1.1) → a copy of o whose lean is raised (binary search) until arm `side` ('L'|'R') reaches
  //   `target` with its grip — the BODY-CHECK rule "lean until the hand gets there" instead of a hand floating short. For a crouch/kneel,
  //   pass o.pose first. Returns o unchanged when it already reaches.
  R.fitReach = function (t, spec, o, side, target, max = 1.1) {
    const arms = o.arms || {}, mk = l => Object.assign({}, o, { lean: l, arms: Object.assign({}, arms, { [side]: Object.assign({}, arms[side] || {}, { to: target }) }) });
    const ok = l => R.person(null, t, spec, mk(l)).hands[side].reach; let lo = o.lean || 0, hi = max;
    if (ok(lo)) return mk(lo); if (!ok(hi)) return mk(hi);
    for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; }
    return mk(hi);
  };
  // face(ctx, t, spec, x, y, s, o) → G: just the head (+ neck) of a person, centred so (x, y) is the face centre — close-ups, the eye strip.
  R.face = function (ctx, t, spec, x, y, s, o = {}) {
    const g0 = R.person(null, t, spec, Object.assign({}, o, { x: 0, y: 0, s })); const dx = x - g0.head.x, dy = y - g0.head.y;
    return R.person(ctx, t, spec, Object.assign({}, o, { x: dx, y: dy, s, only: 'head' }));
  };

  // chibi(ctx, t, spec, o) → G: the SD / chibi version (head : body ≈ 1 : 1.5, mitten hands, thicker line, flat colour — no cel by default).
  //   o = { x, y (feet), s (1 → ~370 px tall), turn, tilt, lean, bob, expr + eyes/mouth/brows overrides (SD eyes: 'open' big ovals, 'happy',
  //     'shock' (white circles, dot pupils), 'squeeze' (> <), 'blank' (empty white), 'dead', 'focus' (flaming sharp), 'sparkle' (star eyes),
  //     'line' (− −), 'content'), pose: 'stand' | 'run' | 'sit' | 'flail' | 'slump' | 'kneel', ph (run phase), arms: { L: { to, hand: 'mitt' |
  //     any hand pose } , R }, stone (0…1), crack (0…1), tears ('fall' | 'stream'), cel (true = add the shade band), sway, alpha }
  //   Returns { head, eyes, mouth, hands, box } like person().
  R.chibi = function (ctx, t, spec, o = {}) {
    const s = o.s || 1, pal = palOf(spec, o), hw = 58 * (spec.sdHead || 1), th = clamp(o.turn || 0, -.8, .8), sn = Math.sin(th), fwd = Math.abs(sn) > .08 ? Math.sign(sn) : 0;
    const sw = o.sway === false ? ZS : K.sway(t, spec.seed || 1, (o.sway ?? 1) * 1.6), lw = K.lwFor(s) * 1.3, L = lw;
    const pose = o.pose || 'stand', ph = o.ph || 0, B = spec.build || {}, wide = (B.sh || 62) / 62, belly = (B.belly || 0) / 20, hk = spec.h || 1;
    let hipY = -78 * (.9 + .1 * hk) + (o.bob || 0); const shY = hipY - 96 - belly * 6;
    if (pose === 'run') hipY += -10 * Math.abs(Math.sin(TAU * ph));
    if (pose === 'sit' || pose === 'slump') hipY = -40; if (pose === 'kneel') hipY = -46;
    const bodyRot = (o.lean || 0) * (fwd || 1) + sw.body * 2;
    const Mr = new DOMMatrix().translate(o.x || 0, o.y || 0).scale(s), Mb = new DOMMatrix().translate(0, hipY).rotate(toDeg(bodyRot)).translate(0, -hipY);
    const headRot = sw.head * 1.5 + (o.tilt || 0) + (pose === 'slump' ? .25 * (fwd || 1) : 0);
    const Mh = Mb.translate(.18 * sn * 40, shY + 8).rotate(toDeg(headRot)).translate(0, -hw * 1.0).scale(hw);
    const MhW = Mr.multiply(Mh), MbW = Mr.multiply(Mb), toW = (M, p) => { const q = M.transformPoint({ x: p[0], y: p[1] }); return [q.x, q.y]; };
    const torW = 40 * wide + belly * 4, cx = .25 * sn * torW;
    const shJ = [toW(Mb, [-torW + 8, shY + 18]), toW(Mb, [torW - 8, shY + 18])];
    const inv = Mr.inverse(), arms = o.arms || {}, AL = 62;
    const armSol = ['L', 'R'].map((k, i) => { const A = arms[k] || {}, side = i ? 1 : -1, S0 = shJ[i];
      let tg; if (A.to) { const q = inv.transformPoint({ x: A.to[0], y: A.to[1] }); tg = [q.x, q.y]; }
      else if (pose === 'flail') { const a = -Math.PI / 2 + side * (.7 + .4 * Math.sin(t * 14 + i)); tg = [S0[0] + Math.cos(a) * AL, S0[1] + Math.sin(a) * AL]; }
      else if (pose === 'run') { const a = Math.PI / 2 + Math.sin(TAU * ph + i * Math.PI) * .9 * (fwd || 1) - side * .2; tg = [S0[0] + Math.cos(a) * AL, S0[1] + Math.sin(a) * AL]; }
      else tg = [S0[0] + side * 16, S0[1] + AL - 6];
      const d = Math.hypot(tg[0] - S0[0], tg[1] - S0[1]) || 1, k2 = Math.min(1, AL / d), w = [S0[0] + (tg[0] - S0[0]) * k2, S0[1] + (tg[1] - S0[1]) * k2];
      return { S: S0, w, ang: Math.atan2(w[1] - S0[1], w[0] - S0[0]), A, side, reach: d <= AL }; });
    const hC = toW(MhW, [0, 0]);
    const G = { head: { x: hC[0], y: hC[1], r: hw * s * 1.15, dir: fwd || 1, tilt: headRot + bodyRot }, hands: {}, s };
    G.top = toW(MhW, [0, -1.9])[1]; G.box = { x: (o.x || 0) - 95 * s, y: G.top - 10 * s, w: 190 * s, h: (o.y || 0) - G.top + 24 * s };
    armSol.forEach((a, i) => { const q = toW(Mr, a.w); G.hands[i ? 'R' : 'L'] = { x: q[0], y: q[1], ang: a.ang, reach: a.reach }; });
    G.eyes = [toW(MhW, [fxOf(-.44, th), .28]), toW(MhW, [fxOf(.44, th), .28])]; G.mouth = toW(MhW, [fxOf(0, th), .78]);
    if (!ctx) return G;
    const base = ctx.getTransform(); ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha; const setM = M => ctx.setTransform(base.multiply(M)); const ink = pal.line;
    const fillC = (p, c) => { K.inked(ctx, p, c, L, ink); if (o.cel) K.cel(ctx, p, c, K.shadeOf(c), -6, -5); };
    const sleeve = spec.outer && spec.outer.kind !== 'vest' ? pal.outer : (spec.shirt && spec.shirt.roll ? pal.skin : pal.shirt);
    const drawArm = a => { const pz = a.A.hand || 'mitt', p = K.capsule(a.S, K.lerpP(a.S, a.w, .8), 11, 10); if (a.A.prop) a.A.prop(ctx, { x: a.w[0], y: a.w[1], ang: a.ang, sz: 20, grip: a.w });
      if (spec.shirt && spec.shirt.roll && !(spec.outer && spec.outer.kind !== 'vest')) { K.inkGroup(ctx, [{ p: K.capsule(a.S, K.lerpP(a.S, a.w, .45), 11, 10.5), fill: pal.shirt }, { p: K.capsule(K.lerpP(a.S, a.w, .4), K.lerpP(a.S, a.w, .8), 10, 9.5), fill: pal.skin }], L, ink); }
      else fillC(p, sleeve);
      if (spec.band && a.side < 0) K.inked(ctx, K.capsule(K.lerpP(a.S, a.w, .66), K.lerpP(a.S, a.w, .78), 11, 11), pal.band, L * .6, ink);
      hand(ctx, pz, a.w[0] - Math.cos(a.ang) * 8, a.w[1] - Math.sin(a.ang) * 8, a.ang, pz === 'mitt' ? 22 : 17, a.side < 0 ? 1 : -1, { skin: pal.skin, line: ink, lw: L });
      if (a.A.propFront) a.A.propFront(ctx, { x: a.w[0], y: a.w[1], ang: a.ang, sz: 20, grip: a.w }); };
    const far = fwd > 0 ? 1 : fwd < 0 ? 0 : -1;
    setM(Mr); if (far >= 0 && !armSol[far].A.front) drawArm(armSol[far]);
    // back hair
    const G2 = headG(t, spec, pal, o, th, L / hw, true);
    setM(MhW.scale(1.08, .92)); if (spec.hairBack) { ctx.save(); (spec.sdHairBack || spec.hairBack)(ctx, G2); ctx.restore(); }
    // legs
    setM(Mr);
    { const legs = [0, 1].map(i => { const side = i ? 1 : -1; let a = [side * 16 * wide, hipY], b;
        if (pose === 'run') { const q = Math.sin(TAU * ph + i * Math.PI); b = [a[0] + q * 26 * (fwd || 1), -6 - Math.max(0, Math.cos(TAU * ph + i * Math.PI)) * 18]; }
        else if (pose === 'sit' || pose === 'slump') b = [a[0] + (fwd || side * .4) * 40, -8];
        else if (pose === 'kneel') b = [a[0] + (i ? 30 : -34) * (fwd || 1), -6];
        else if (pose === 'flail') b = [a[0] + side * 12 + Math.sin(t * 16 + i * 2) * 10, -6 - Math.abs(Math.sin(t * 16 + i * 2)) * 12];
        else b = [a[0] + side * 4, -8];
        return { a, b, i }; });
      const legCol = spec.skirt ? (pal.sock || pal.skin) : pal.pants;
      for (const lg of (fwd > 0 ? [legs[1], legs[0]] : legs)) { K.inkGroup(ctx, [{ p: K.capsule(lg.a, lg.b, 13, 11), fill: legCol }], L, ink);
        const toe = fwd || (lg.i ? .5 : -.5), sp = K.ell(lg.b[0] + toe * 8, lg.b[1] + 2, 17, 11); K.inked(ctx, sp, pal.shoes, L, ink); } }
    // torso: a soft trapezoid in the top colour, the shirt showing in the opening
    setM(MbW);
    if (spec.hood) { const p = K.ell(cx, shY + 2, 30, 14); K.inked(ctx, p, pal.shirt, L, ink); }
    { const top = spec.outer ? pal.outer : pal.shirt, p = new Path2D(); const tw = torW, bw2 = torW + 8 + belly * 6;
      p.moveTo(cx - tw + 10, shY + 4); p.quadraticCurveTo(cx, shY - 6, cx + tw - 10, shY + 4); p.quadraticCurveTo(cx + tw + 2, shY + 20, cx + bw2 - 2, hipY - 4); p.quadraticCurveTo(cx + bw2, hipY + 12, cx + bw2 - 12, hipY + 14);
      p.lineTo(cx - bw2 + 12, hipY + 14); p.quadraticCurveTo(cx - bw2, hipY + 12, cx - bw2 + 2, hipY - 4); p.quadraticCurveTo(cx - tw - 2, shY + 20, cx - tw + 10, shY + 4); p.closePath();
      if (spec.skirt) { const sk = new Path2D(); sk.moveTo(cx - bw2 + 4, hipY - 8); sk.lineTo(cx + bw2 - 4, hipY - 8); sk.lineTo(cx + bw2 + 8, hipY + 30); sk.quadraticCurveTo(cx, hipY + 38, cx - bw2 - 8, hipY + 30); sk.closePath(); K.inked(ctx, sk, pal.skirt, L, ink); }
      fillC(p, top);
      ctx.save(); ctx.clip(p);
      if (spec.outer) { const op = spec.outer.kind === 'vest' ? 9 : 15; ctx.fillStyle = pal.shirt; ctx.beginPath(); ctx.moveTo(cx - 14, shY - 2); ctx.lineTo(cx + 14, shY - 2); ctx.lineTo(cx + op, hipY + 20); ctx.lineTo(cx - op, hipY + 20); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = ink; ctx.lineWidth = L * .7; ctx.stroke(); }
      if (!spec.outer || spec.outer.kind === 'vest') { ctx.fillStyle = K.shadeOf(pal.pants, .6); ctx.fillRect(-200, hipY + 2, 400, 12); }
      if (spec.tie) { ctx.fillStyle = pal.tie; ctx.strokeStyle = ink; ctx.lineWidth = L * .6; ctx.beginPath(); ctx.moveTo(cx - 5 + (spec.tie.loose ? 3 : 0), shY + 6); ctx.lineTo(cx + 5 + (spec.tie.loose ? 3 : 0), shY + 6); ctx.lineTo(cx + 9 + 3, hipY - 10); ctx.lineTo(cx + 2, hipY); ctx.lineTo(cx - 6, hipY - 10); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      if (spec.lanyard) { ctx.strokeStyle = pal.lanyard || '#4b7bd0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 14, shY); ctx.lineTo(cx - 3, shY + 44); ctx.moveTo(cx + 14, shY); ctx.lineTo(cx + 3, shY + 44); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = L * .6; ctx.fillRect(cx - 11, shY + 42, 22, 26); ctx.strokeRect(cx - 11, shY + 42, 22, 26); ctx.fillStyle = pal.lanyard || '#4b7bd0'; ctx.fillRect(cx - 11, shY + 42, 22, 7); }
      ctx.restore(); }
    // head (SD face: rounder skull, big eyes low on the face)
    setM(MhW.scale(1.08, .92));
    const E = Object.assign({}, EXPR[o.expr || 'neutral'] || EXPR.neutral); if (o.eyes) E.eyes = o.eyes; if (o.brows) E.brows = o.brows; if (o.mouth) E.mouth = o.mouth;
    if (o.stone) { E.eyes = o.eyes || 'blank'; }
    drawChibiHead(ctx, t, spec, pal, o, E, th, L / hw);
    setM(Mr);
    if (far < 0) { drawArm(armSol[0]); drawArm(armSol[1]); } else { if (armSol[far].A.front) drawArm(armSol[far]); drawArm(armSol[1 - far]); }
    if (o.stone && o.crack) { setM(MbW); const r = rng(K.hash(spec.name, 'sdcrack')); ctx.strokeStyle = K.rgba('#2f2f36', .85 * clamp(o.crack)); ctx.lineWidth = L * .8; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) { let x = (r() - .5) * torW * 1.4, y = shY + 6; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (r() - .5) * 18; y += 18 + r() * 10; ctx.lineTo(x, y); } ctx.stroke(); } }
    ctx.restore(); ctx.setTransform(base);
    const tk = o.tears || E.tears && (E.tears === 'stream' ? 'fall' : E.tears);
    if (tk && !o.stone) K.tears(ctx, t, G.eyes, tk === true ? 'fall' : tk, { r: hw * s * .9, at: o.tearAt, floor: o.tearFloor });
    return G;
  };
  function drawChibiHead(ctx, t, spec, pal, o, E, th, lwU) {
    const sn = Math.sin(th), fp = facePath(sn, true), G = headG(t, spec, pal, o, th, lwU, true), open = o.blink === false ? 1 : (o.open ?? K.blink(spec.seed || 1, t));
    ctx.lineJoin = 'round'; ctx.strokeStyle = pal.line; ctx.lineWidth = lwU * 2; ctx.stroke(fp.p); ctx.fillStyle = pal.skin; ctx.fill(fp.p);
    ctx.save(); ctx.clip(fp.p); if (spec.hairFront && o.front !== false) { ctx.save(); ctx.translate(.03, .13); G.shadow = true; (spec.sdHairFront || spec.hairFront)(ctx, G); G.shadow = false; ctx.restore(); }
    if (o.stone) { ctx.fillStyle = K.rgba('#ffffff', .0); }
    for (const sd of [-1, 1]) { const x = fxOf(sd * .64, th); ctx.fillStyle = K.rgba(pal.blush, .4 + .3 * (o.blush || 0)); ctx.beginPath(); ctx.ellipse(x, .6, .2, .11, 0, 0, TAU); ctx.fill(); }
    if (E.shade || o.gloom) { const g = ctx.createLinearGradient(0, -1.5, 0, .5); g.addColorStop(0, K.rgba(K.C.gloom, .6)); g.addColorStop(1, K.rgba(K.C.gloom, 0)); ctx.fillStyle = g; ctx.fillRect(-2, -2, 4, 2.5); }
    ctx.restore();
    const ey = .3, ex = .43, ln = pal.line;
    for (const sd of [-1, 1]) { const x = fxOf(sd * ex, th), wf = fwOf(sd * ex, th); if (sd * sn > .62) continue; ctx.save(); ctx.translate(x, ey); ctx.scale(wf * (sd < 0 ? -1 : 1), 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const k = E.eyes;
      if (k === 'happy' || k === 'content') { ctx.strokeStyle = ln; ctx.lineWidth = lwU * 2; ctx.beginPath(); if (k === 'happy') { ctx.moveTo(-.2, .08); ctx.quadraticCurveTo(0, -.22, .2, .08); } else { ctx.moveTo(-.2, -.02); ctx.quadraticCurveTo(0, .16, .2, -.02); } ctx.stroke(); }
      else if (k === 'squeeze') { ctx.strokeStyle = ln; ctx.lineWidth = lwU * 2; ctx.beginPath(); ctx.moveTo(.2, -.16); ctx.lineTo(-.14, 0); ctx.lineTo(.2, .16); ctx.stroke(); }
      else if (k === 'line' || k === 'dead' && o.stone) { ctx.strokeStyle = ln; ctx.lineWidth = lwU * 1.8; ctx.beginPath(); ctx.moveTo(-.2, 0); ctx.lineTo(.2, 0); ctx.stroke(); }
      else if (k === 'shock' || k === 'blank') { ctx.fillStyle = '#fff'; ctx.strokeStyle = ln; ctx.lineWidth = lwU * 1.3; ctx.beginPath(); ctx.ellipse(0, 0, .2, .25, 0, 0, TAU); ctx.fill(); ctx.stroke(); if (k === 'shock') { ctx.fillStyle = ln; ctx.beginPath(); ctx.arc(0, .02, .055, 0, TAU); ctx.fill(); } }
      else if (k === 'sparkle') { ctx.fillStyle = K.mixC(pal.eye, '#000', .2); ctx.beginPath(); ctx.ellipse(0, 0, .19, .25, 0, 0, TAU); ctx.fill(); K.star4(ctx, -.02, -.02, .2 * (1 + .15 * Math.sin(t * 8)), .2, '#fff', .2); }
      else if (k === 'focus' || k === 'sharp') { ctx.fillStyle = '#fff'; ctx.strokeStyle = ln; ctx.lineWidth = lwU * 1.3; ctx.beginPath(); ctx.moveTo(-.22, -.02); ctx.lineTo(.24, -.16); ctx.quadraticCurveTo(.22, .14, 0, .16); ctx.quadraticCurveTo(-.2, .12, -.22, -.02); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ln; ctx.beginPath(); ctx.arc(.02, .03, .08, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-.01, 0, .025, 0, TAU); ctx.fill(); if (E.glint) K.star4(ctx, -.06, -.06, .2, .3, '#fff', .16); }
      else if (k === 'dead') { ctx.fillStyle = '#fff'; ctx.strokeStyle = ln; ctx.lineWidth = lwU * 1.2; ctx.beginPath(); ctx.ellipse(0, .03, .19, .17, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = K.mixC(pal.eye, '#9a95a3', .6); ctx.beginPath(); ctx.arc(0, .05, .07, 0, TAU); ctx.fill(); ctx.strokeStyle = ln; ctx.beginPath(); ctx.moveTo(-.22, -.07); ctx.lineTo(.22, -.07); ctx.stroke(); }
      else { if (open < .2) { ctx.strokeStyle = ln; ctx.lineWidth = lwU * 1.8; ctx.beginPath(); ctx.moveTo(-.2, .04); ctx.quadraticCurveTo(0, .14, .2, .04); ctx.stroke(); }
        else { ctx.save(); ctx.scale(1, open); const g = ctx.createLinearGradient(0, -.26, 0, .26); g.addColorStop(0, K.mixC(pal.eye, '#000', .45)); g.addColorStop(1, K.mixC(pal.eye, '#fff', .3)); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, .18, .26, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-.06, -.1, .07, .08, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(.07, .1, .035, 0, TAU); ctx.fill(); ctx.restore();
          ctx.strokeStyle = ln; ctx.lineWidth = lwU * 1.6; ctx.beginPath(); ctx.moveTo(-.2, -.18 * open); ctx.quadraticCurveTo(0, -.32 * open, .22, -.16 * open); ctx.stroke(); } }
      ctx.restore(); }
    if (spec.glasses) { const col = o.stone ? K.stoneCol(spec.glasses.col || '#3b3a4a', o.stone) : spec.glasses.col || '#3b3a4a'; ctx.strokeStyle = col; ctx.lineWidth = lwU * 1.3;
      const gx = [fxOf(-ex, th), fxOf(ex, th)]; for (let i = 0; i < 2; i++) { const side = i ? 1 : -1; if (side * sn > .7) continue; ctx.beginPath(); ctx.ellipse(gx[i], ey, .3 * fwOf(side * ex, th), .3, 0, 0, TAU); if (E.glint) { ctx.fillStyle = '#fff'; ctx.fill(); } ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(gx[0] + .28, ey - .04); ctx.lineTo(gx[1] - .28, ey - .04); ctx.stroke(); }
    const mx = fxOf(0, th);
    let mk = o.mouth || E.mouth; if (o.stone && !o.mouth) mk = 'flat';
    mouth(ctx, mk === 'talk' ? 'talk' : mk, mx, .78, { pal, lw: lwU * 1.1, wf: 1.2, t, talk: o.talk });
    if (o.front !== false && spec.hairFront) { ctx.save(); (spec.sdHairFront || spec.hairFront)(ctx, G); ctx.restore(); }
    const bk = o.brows || E.brows; for (const sd of [-1, 1]) { if (sd * sn > .6) continue; brow(ctx, bk, fxOf(sd * ex, th), -.1, sd, { lw: lwU * .9, wf: fwOf(sd * ex, th), browW: spec.browW, col: pal.brow }); }
    if (o.stone && o.crack) { const r = rng(K.hash(spec.name, 'sdhc')); ctx.strokeStyle = K.rgba('#2f2f36', .85 * clamp(o.crack)); ctx.lineWidth = lwU * .9;
      for (let i = 0; i < 3; i++) { let x = (r() - .5) * 1.4, y = -1.45; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (r() - .5) * .45; y += .28 + r() * .15; ctx.lineTo(x, y); } ctx.stroke(); } }
  }

  window.Webtoon = K;
})();

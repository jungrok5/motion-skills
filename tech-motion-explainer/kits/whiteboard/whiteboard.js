/* whiteboard.js — "그려 가며 설명" (draw while reasoning) board kit for tech-motion-explainer, Canvas 2D.
 *
 * Classic script (the board pages are classic inline scripts). Load it before the page script:
 *   <script src="../assets/kits/whiteboard.js"></script>
 * It defines one global, `Whiteboard`. A page makes one board per canvas:
 *   const wb = Whiteboard.create(ctx, { W, H, ink: {...}, markers: [...], surface: 'whiteboard' });
 * and destructures the drawing tools it needs from `wb`.
 *
 * MATERIALS AND MACHINERY ONLY. The kit has no scene, no layout, no header, no chapter structure and no default ink
 * palette: `ink` and `markers` are required and come from the topic. The two surfaces ('whiteboard', 'glass') are
 * materials with tunable colours (see Whiteboard.SURFACES); override any field per page.
 *
 * Determinism: every drawing call is a pure function of its arguments. Wobble is seeded from each stroke's id
 * (the same id draws the same line every frame, at any seek order). The only cached thing is the static board image,
 * rebuilt whenever the surface changes. No Math.random, Date, performance.now or network.
 *
 * Source: mmo-server-explained nagle-nodelay-board-wide/index.html (lines 171–425, light whiteboard + markers) and
 * tcp-retransmission-board-wide/index.html (lines 181–474, dark glass + liquid chalk), plus the portrait variants
 * nagle-nodelay-board/ and tcp-retransmission-board/ (vertical zone wipes). See STYLE.md.
 */
(function (root) {
  'use strict';

  // ── pure helpers (no canvas) ──────────────────────────────────────────
  /** clamp(x, a=0, b=1) */
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  /** lerp(a, b, t) */
  const lerp = (a, b, t) => a + (b - a) * t;
  /** p(t, start, dur): 0→1 progress of t through [start, start+dur], clamped */
  const p = (t, s, d) => clamp((t - s) / d);
  /** ease-out cubic */
  const eo = t => 1 - Math.pow(1 - t, 3);
  /** ease-in-out cubic */
  const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  /** rng(seed) → () => [0,1). mulberry32; same seed, same sequence. */
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
  /** hash(string) → uint32 (FNV-1a). Used to seed a stroke's wobble from its id. */
  function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  /** rgba('#rrggbb', a) → css string */
  function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
  /** shade('#rrggbb', f): f < 0 darkens, f > 0 lightens (multiplicative) → 'rgb(...)' */
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16); const c = v => Math.round(clamp(v + v * f, 0, 255)); return `rgb(${c(n >> 16 & 255)},${c(n >> 8 & 255)},${c(n & 255)})`; }

  // ── surfaces: the board material. Colours only; no topic, no layout. ─────────
  // Override a field per page:  surface: { ...Whiteboard.SURFACES.whiteboard, board: '#eef2ee' }
  // Fields marked (land/port) pick the landscape or portrait value by W >= H unless you pass a value.
  const SURFACES = {
    // Light dry-erase board with an aluminium frame and tray; black-ish markers with a dry streak.
    whiteboard: {
      kind: 'whiteboard', dark: false,
      board: '#f3f2ec',                                     // board colour (also wb.boardColor, for masking)
      ghost: {                                              // faint marks earlier sessions left (seeded); false = none
        color: '#7d828c', amp: 3,
        land: { seed: 42, count: 16, x: [160, 320], y: [160, 340], L: [140, 380], ang: .5 },
        port: { seed: 17, count: 14, x: [80, 300], y: [200, 500], L: [140, 320], ang: .6 },
      },
      halo: null,                                           // no glow on a matte board
      sheen: { plain: .2, halo: .2, w: .22, off: .16 },     // dry-marker streak inside each line
      hatch: { fill: .08, line: .8 },
      smear: { color: '#8a8f98', alpha: .045 },             // what the eraser leaves behind
      sticky: { col: '#ffe45e', shadow: 'rgba(40,36,20,.22)', blur: 14, offY: 6, shade: -.06 },
      paper: { col: '#fdfcf8', shadow: 'rgba(30,30,30,.18)', blur: 16, offY: 6, edge: 'rgba(0,0,0,.06)', tape: 'rgba(226,212,170,.82)' },
      pen: { shadow: 'rgba(20,20,20,.13)', shadowOff: [10, 22], body: [[0, '#ffffff'], [.55, '#e9eaee'], [1, '#b9bcc3']], ferrule: '#c9ccd1', band2: false, gloss: 'rgba(255,255,255,.35)', glossBar: false },
      eraser: { shadow: 'rgba(0,0,0,.16)', shadowXY: [-44, -100], felt: '#cfcdc6', body: ['#3a4049', '#262a31'], gloss: 'rgba(255,255,255,.08)' },
      frame: { rail: ['#d9dcdf', '#aeb3b9', '#8c9198'], railW: 14, tray: [[0, '#e3e5e8'], [.25, '#b8bdc3'], [1, '#7f858c']], trayLine: 'rgba(0,0,0,.12)', trayLineH: 2 },
      trayPen: { shadow: 'rgba(0,0,0,.18)', body: ['#fff', '#c4c7cc'], band2: false },
    },
    // Dark glass board on a wall, liquid-chalk markers with a faint halo, standoff caps, floating tray.
    glass: {
      kind: 'glass', dark: true,
      board: '#161d25',                                     // flat stand-in for masking (the real board is a gradient)
      wall: { land: ['#1c242e', '#0f141a', .35], port: ['#1c242e', '#0f141a', .5] },   // [top-left, bottom-right, gradient x reach × W]
      reflections: [],                                      // [[x, y, w, h, '#rrggbb', alpha], …] blurred shapes of the room behind the viewer
      lightStrip: {                                         // a blurred diagonal light band; null = none
        land: [[1100, -40], [1300, -40], [760, 'H+40'], [560, 'H+40']],
        port: [[760, -40], [940, -40], [300, 'H+40'], [120, 'H+40']], color: 'rgba(210,230,240,.05)', blur: 40,
      },
      wallSheen: { land: .035, port: 0 },                   // broad diagonal sheen across the glass
      ghost: {
        color: [200, 215, 230], blur: 2,
        land: { seed: 42, count: 22, x: [160, 320], y: [150, 320], L: [120, 380], ang: .6 },
        port: { seed: 42, count: 22, x: [80, 260], y: [160, 400], L: [120, 300], ang: .6 },
      },
      halo: { alpha: .13, w: 2.8 },                         // glow around board ink (never around paper ink)
      sheen: { plain: .16, halo: .28, w: .2, off: .14 },
      hatch: { fill: .1, line: .85 },
      smear: { color: '#b5c0cc', alpha: .035 },
      sticky: { col: '#ffe45e', shadow: 'rgba(0,0,0,.5)', blur: 16, offY: 7, shade: -.07 },
      paper: { col: '#f7f6f1', shadow: 'rgba(0,0,0,.55)', blur: 22, offY: 8, edge: 'rgba(0,0,0,.08)', tape: 'rgba(226,212,170,.85)' },
      pen: { shadow: 'rgba(0,0,0,.35)', shadowOff: [12, 24], body: [[0, '#5a616b'], [.5, '#3a4048'], [1, '#22262c']], ferrule: '#c9ccd1', band2: true, gloss: 'rgba(255,255,255,.25)', glossBar: true },
      eraser: { shadow: 'rgba(0,0,0,.4)', shadowXY: [-40, -96], felt: '#d8d5cb', body: ['#6a7480', '#46505b'], gloss: 'rgba(255,255,255,.12)' },
      frame: { glass: true, edge: 'rgba(170,215,205,.16)', inner: 'rgba(255,255,255,.05)', standoffs: true, inset: { land: 44, port: 40 },
        tray: [[0, '#9aa1a9'], [.3, '#5e656e'], [1, '#2c3137']], trayLine: 'rgba(0,0,0,.4)', trayLineH: 3 },
      trayPen: { shadow: 'rgba(0,0,0,.35)', body: ['#5a616b', '#262a30'], band2: true },
    },
  };

  const DEFAULT_FONTS = {
    sans: 'Pretendard, "WenQuanYi Zen Hei", "DejaVu Sans", sans-serif',
    mono: '"JetBrains Mono", Pretendard, "DejaVu Sans Mono", monospace',
  };

  /**
   * create(ctx, opts) → board instance.
   * opts:
   *   W, H          canvas size in px (default ctx.canvas size). W >= H = landscape defaults, else portrait.
   *   ink           REQUIRED. { role: '#rrggbb', … } the topic's marker set (one meaning per colour). Returned as wb.ink.
   *   markers       REQUIRED. ink colours that are real markers (shown in the tray, held as the pen), in tray order.
   *                 markers[0] is the default pen: any other colour (grey notes, paper ink) is written with it.
   *   paperInk      { role: '#rrggbb' } darker inks for writing on paper/stickies on a dark board. Same role keys as ink;
   *                 paper ink draws no halo, and the pen shows the matching board marker.
   *   surface       'whiteboard' | 'glass' | a full surface object (spread a preset and override fields).
   *   fonts         { sans, mono, hand } families. `hand` (default = sans) is what wr/say write with.
   *   hand          { tilt: .012 (rad, max hand tilt of a written line), cps: 26 (chars/s written) }
   *   line          { lw: 6, amp: 1.8 } default stroke width and wobble amplitude (px)
   *   wipe          eraser motion. { dir: 'x' | 'y' (default by orientation), lead, dur, peelLead, peelDur, fade,
   *                 smearW, swing, center, rot, scale } — see STYLE.md for the defaults.
   *   tray          { top (y of the tray), y (marker centre y), xs (marker x per markers[i]), scale, eraser: [x, y, scale] }
   *   cache         true (default): paint the static board once into an offscreen canvas.
   */
  function create(ctx, opts = {}) {
    if (!opts.ink || !opts.markers) throw new Error('Whiteboard.create: pass ink {role: colour} and markers [colour, …] from the topic');
    const W = opts.W ?? ctx.canvas.width, H = opts.H ?? ctx.canvas.height, land = W >= H;
    const pick = v => (v && typeof v === 'object' && !Array.isArray(v) && ('land' in v || 'port' in v)) ? (land ? v.land : v.port) : v;
    const INK = opts.ink, MARKERS = opts.markers.slice();
    const S = typeof opts.surface === 'object' ? opts.surface : SURFACES[opts.surface || 'whiteboard'];
    if (!S) throw new Error('Whiteboard.create: unknown surface ' + opts.surface);
    const F = { ...DEFAULT_FONTS, ...(opts.fonts || {}) }; F.hand = F.hand || F.sans;
    const HAND = { tilt: .012, cps: 26, ...(opts.hand || {}) };
    const LINE = { lw: 6, amp: 1.8, ...(opts.line || {}) };
    const PAPER = opts.paperInk || {};
    const PAPER_SET = new Set(Object.values(PAPER));
    const TO_MARKER = {}; for (const k in PAPER) if (INK[k]) TO_MARKER[PAPER[k]] = INK[k];
    const penOf = col => { const m = TO_MARKER[col] || col; return MARKERS.includes(m) ? m : MARKERS[0]; };

    const dir = (opts.wipe && opts.wipe.dir) || (land ? 'x' : 'y');
    const WIPE = Object.assign(dir === 'x'
      ? { lead: .85, dur: .75, peelLead: 1.15, peelDur: .3, fade: 1.6, smearW: 200, swing: 300, center: H / 2 - 40, rot: 0, scale: 1 }
      : { lead: .75, dur: .65, peelLead: .92, peelDur: .2, fade: 1.4, smearW: 230, swing: 330, center: W / 2, rot: Math.PI / 2, scale: 1.2 },
    opts.wipe || {}, { dir });
    const trayTop = (opts.tray && opts.tray.top) ?? (land ? H - 32 : H - 48);
    const TRAY = Object.assign({
      top: trayTop, y: land ? trayTop + 14 : trayTop + 20, scale: land ? 1 : 1.3,
      xs: MARKERS.map((_, i) => land ? W - 325 - (MARKERS.length - 1 - i) * 115 : 150 + i * 150),
      eraser: land ? [W - 130, trayTop + 12, .42] : [W - 180, trayTop + 18, .5],
    }, opts.tray || {});

    // instance state, reset by begin()
    let PEN = null;   // the marker in hand: { x, y, col } in canvas space, or null
    let PEEL = 1;     // 1 → 0 while stickies/paper come off just before a wipe
    let WIPES = [];   // [{ at, zone: [a0, a1] | null }]

    // ── canvas helpers ──
    /** rr(x, y, w, h, r): begin a rounded-rect path (fill/stroke it yourself) */
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
    /** font(size, weight=500, mono=false): set ctx.font. mono may also be a family key: 'sans' | 'mono' | 'hand'. */
    function font(sz, wt = 500, mono = false) { ctx.font = `${wt} ${sz}px ${typeof mono === 'string' ? F[mono] : mono ? F.mono : F.sans}`; }
    /** tw(text, size, weight=500, mono=false) → width in px */
    function tw(s, size, weight = 500, mono = false) { font(size, weight, mono); return ctx.measureText(s).width; }
    /** txt(text, x, y, {size=30, weight=600, color=ink[markers[0]], align, alpha, mono, ls}): plain printed text, no reveal */
    function txt(s, x, y, o = {}) {
      const { size = 30, weight = 600, color = MARKERS[0], align = 'left', alpha = 1, mono = false, ls = 0 } = o;
      if (alpha <= 0) return;
      ctx.save(); ctx.globalAlpha *= alpha; font(size, weight, mono); if (ls) ctx.letterSpacing = ls + 'px';
      ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, x, y); ctx.restore();
    }

    // ── strokes ──
    // Shared core: draw a wobbled polyline on context c up to fraction k; returns the tip (or null).
    function strokeOn(c, id, pts, k, col, o) {
      if (k <= 0 || pts.length < 2) return null;
      const { lw = LINE.lw, amp = LINE.amp, alpha = 1, dash = null, halo = !!S.halo && !PAPER_SET.has(col) } = o;
      const r = rng(hash(id)), f1 = .007 + r() * .009, f2 = .024 + r() * .018, p1 = r() * 6.283, p2 = r() * 6.283, A = amp * (.6 + r() * .8);
      const segs = []; let total = 0;
      for (let i = 0; i < pts.length - 1; i++) { const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); segs.push(L); total += L; }
      if (total < .5) return null;
      const lim = total * clamp(k), path = new Path2D();
      let s = 0, first = true, tip = null;
      for (let i = 0; i < segs.length && s < lim; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = segs[i];
        if (L < 1e-6) continue;
        const nx = -(y1 - y0) / L, ny = (x1 - x0) / L, n = Math.max(1, Math.ceil(L / 6));
        for (let j = 0; j <= n; j++) {
          let d = L * j / n; const last = s + d >= lim; if (last) d = lim - s;
          const ss = s + d, off = A * (.65 * Math.sin(ss * f1 + p1) + .35 * Math.sin(ss * f2 + p2));
          const x = x0 + (x1 - x0) * d / L + nx * off, y = y0 + (y1 - y0) * d / L + ny * off;
          if (first) { path.moveTo(x, y); first = false; } else path.lineTo(x, y);
          tip = [x, y];
          if (last) break;
        }
        s += L;
      }
      c.save(); c.globalAlpha *= alpha; c.lineCap = 'round'; c.lineJoin = 'round';
      if (dash) c.setLineDash(dash);
      if (halo) { c.save(); c.globalAlpha *= S.halo.alpha; c.strokeStyle = col; c.lineWidth = lw * S.halo.w; c.stroke(path); c.restore(); }
      c.strokeStyle = col; c.lineWidth = lw; c.stroke(path);
      // the streak / sheen inside the line
      const sh = S.sheen;
      c.globalAlpha *= halo ? sh.halo : sh.plain; c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(1, lw * sh.w);
      c.translate(lw * sh.off, -lw * sh.off); c.stroke(path);
      c.restore();
      return tip;
    }
    /**
     * stroke(id, points, k, colour, {lw, amp, alpha, dash, pen=true, halo}): a marker line along [[x,y],…] drawn up to
     * fraction k (0..1) of its length, with a hand wobble seeded by id. While k < 1 the pen sits at the tip.
     */
    function stroke(id, pts, k, col, o = {}) {
      const tip = strokeOn(ctx, id, pts, k, col, o);
      if (tip && k < 1 && o.pen !== false) setPen(tip[0], tip[1], col);
    }
    /** setPen(x, y, colour): put the marker in hand at (x, y) in the current transform; colour picks the marker. */
    function setPen(x, y, col) {
      const m = ctx.getTransform();
      PEN = { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f, col: penOf(col) };
    }
    /** arrowS(id, x0, y0, x1, y1, k, colour, {…stroke opts, head=22}): straight arrow; shaft to k=.86, then the two head strokes */
    function arrowS(id, x0, y0, x1, y1, k, col, o = {}) {
      if (k <= 0) return;
      const kl = clamp(k / .86), kh = clamp((k - .86) / .14 + 1e-9), L = o.head || 22, a = Math.atan2(y1 - y0, x1 - x0);
      stroke(id, [[x0, y0], [x1, y1]], kl, col, o);
      head(id, x1, y1, a, L, kh, col, o);
    }
    /** pathArrow(id, points, k, colour, {…stroke opts, head=22}): polyline arrow, head on its last leg (shaft to k=.9) */
    function pathArrow(id, pts, k, col, o = {}) {
      if (k <= 0) return;
      stroke(id, pts, clamp(k / .9), col, o);
      const kh = clamp((k - .9) / .1 + 1e-9), [x0, y0] = pts[pts.length - 2], [x1, y1] = pts[pts.length - 1];
      head(id, x1, y1, Math.atan2(y1 - y0, x1 - x0), o.head || 22, kh, col, o);
    }
    function head(id, x1, y1, a, L, kh, col, o) {
      const oh = { ...o, dash: null, amp: .5 };
      stroke(id + 'h1', [[x1, y1], [x1 - L * Math.cos(a - .44), y1 - L * Math.sin(a - .44)]], clamp(kh * 2), col, oh);
      stroke(id + 'h2', [[x1, y1], [x1 - L * Math.cos(a + .44), y1 - L * Math.sin(a + .44)]], clamp(kh * 2 - 1), col, oh);
    }
    /** boxS(id, x, y, w, h, k, colour, opts): hand-drawn rectangle, one continuous stroke with an overshoot at the close */
    function boxS(id, x, y, w, h, k, col, o = {}) {
      const r = rng(hash(id + 'b')), j = () => (r() - .5) * 5;
      stroke(id, [[x - 5 + j(), y + j()], [x + w + j(), y + j()], [x + w + j(), y + h + j()], [x + j(), y + h + j()], [x + 2, y - 9]], k, col, o);
    }
    /** ringS(id, cx, cy, rx, ry, k, colour, opts): hand-drawn ellipse that overshoots its start (circling something) */
    function ringS(id, cx, cy, rx, ry, k, col, o = {}) {
      const r = rng(hash(id + 'r')), a0 = -2.4 + r() * .8, ph = r() * 6, pts = [];
      for (let i = 0; i <= 80; i++) { const a = a0 + i / 80 * Math.PI * 2 * 1.1, q = 1 + .035 * Math.sin(a * 2 + ph) + i / 80 * .06; pts.push([cx + Math.cos(a) * rx * q, cy + Math.sin(a) * ry * q]); }
      stroke(id, pts, k, col, { amp: .8, ...o });
    }
    /** xmark(id, x, y, half, k, colour, lw=6): a hand-drawn X (two strokes) */
    function xmark(id, x, y, s, k, col, lw = 6) {
      stroke(id + 'a', [[x - s, y - s], [x + s, y + s]], clamp(k * 2), col, { lw, amp: .6 });
      stroke(id + 'b', [[x + s, y - s], [x - s, y + s]], clamp(k * 2 - 1), col, { lw, amp: .6 });
    }
    /** checkS(id, x, y, size, k, colour, lw=6): a check mark */
    function checkS(id, x, y, s, k, col, lw = 6) { stroke(id, [[x - s * .45, y], [x - s * .1, y + s * .35], [x + s * .5, y - s * .4]], k, col, { lw, amp: .5 }); }
    /** dotS(x, y, r, colour, alpha=1): a filled marker dot */
    function dotS(x, y, r, col, a = 1) { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore(); }
    /** strike(id, x0, x1, y, k, colour, opts): strike a written line through ("this no longer holds") */
    function strike(id, x0, x1, y, k, col, o = {}) { stroke(id, [[x0, y + 3], [x1, y - 3]], k, col, { lw: 5, ...o }); }
    /** hatch(x, y, w, h, colour, alpha=1, step=15): diagonal hatching (waiting time). Lines are anchored to the board, so a growing region does not make them slide. */
    function hatch(x, y, w, h, col, a = 1, step = 15) {
      if (w <= 0 || h <= 0 || a <= 0) return;
      ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.fillStyle = rgba(col, S.hatch.fill); ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = rgba(col, S.hatch.line); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
      const c0 = Math.floor((x - y - h) / step) * step;
      for (let c = c0; c < x + w - y; c += step) { ctx.moveTo(c + y, y); ctx.lineTo(c + y + h, y + h); }
      ctx.stroke(); ctx.restore();
    }

    // ── writing ──
    /**
     * wr(text, x, y, k, {size=30, weight=700, color, align, mono, alpha, rot, ls}) → width.
     * Text written left to right up to fraction k (a clip that follows the pen), placed with a slight seeded hand tilt
     * (rot overrides it). Uses fonts.hand unless mono.
     */
    function wr(s, x, y, k, o = {}) {
      if (k <= 0 || !s) return 0;
      const { size = 30, weight = 700, color = MARKERS[0], align = 'left', mono = false, alpha = 1, rot = null, ls = 0 } = o;
      ctx.save(); font(size, weight, mono || 'hand'); if (ls) ctx.letterSpacing = ls + 'px';
      const w = ctx.measureText(s).width, X = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
      const r = rot ?? ((hash(s) % 1000) / 1000 - .5) * HAND.tilt;
      ctx.globalAlpha *= alpha; ctx.translate(X, y); ctx.rotate(r);
      if (k < 1) { ctx.beginPath(); ctx.rect(-8, -size * 1.2, (w + 16) * k, size * 1.75); ctx.clip(); }
      ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, 0, 0);
      ctx.restore();
      if (k < 1) setPen(X + w * k, y - size * .2, color);
      return w;
    }
    /** wk(u, t0, text, cps=hand.cps) → 0..1 writing progress of text started at local time t0 */
    const wk = (u, t0, s, cps = HAND.cps) => clamp((u - t0) / Math.max(.22, s.length / cps));
    /** say(text, x, y, u, t0, opts): wr() timed — starts at t0 (same clock as u), writes at opts.cps chars/s */
    function say(s, x, y, u, t0, o = {}) { return wr(s, x, y, wk(u, t0, s, o.cps || HAND.cps), o); }
    /** sayParts([[text, colour], …], x, y, u, t0, opts) → [left x, total width]: several coloured runs on one line, written in sequence */
    function sayParts(parts, x, y, u, t0, o = {}) {
      const { size = 30, weight = 700, align = 'left', cps = HAND.cps, mono = false } = o;
      font(size, weight, mono || 'hand');
      const ws = parts.map(([s]) => ctx.measureText(s).width), tot = ws.reduce((a, b) => a + b, 0);
      let X = align === 'center' ? x - tot / 2 : align === 'right' ? x - tot : x, tt = t0;
      parts.forEach(([s, col], i) => { const d = Math.max(.1, s.length / cps); wr(s, X, y, clamp((u - tt) / d), { ...o, align: 'left', color: col, rot: 0 }); X += ws[i]; tt += d; });
      return [x - (align === 'center' ? tot / 2 : align === 'right' ? tot : 0), tot];
    }

    // ── things stuck on the board ──
    /**
     * sticky(x, y, w, h, k, {rot=-.02, col}, fn(w, h)): a sticky note slapped on (scale overshoot, shadow settles).
     * fn draws its content in local coords (0,0 = top-left). Peels off with the next wipe.
     */
    function sticky(x, y, w, h, k, o, fn) {
      if (k <= 0 || PEEL <= 0) return;
      const st = S.sticky, { rot = -.02, col = st.col } = o || {};
      const kk = eo(clamp(k)), sc = 1 + (1 - kk) * .1;
      ctx.save(); ctx.globalAlpha *= clamp(k * 3) * PEEL; ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.scale(sc, sc);
      ctx.save(); ctx.shadowColor = st.shadow; ctx.shadowBlur = st.blur + (1 - kk) * 24; ctx.shadowOffsetY = st.offY + (1 - kk) * 16; ctx.shadowOffsetX = 3;
      ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2 - 10);
      ctx.quadraticCurveTo(w / 2 - 6, h / 2 + 1, w / 2 - 30, h / 2 + 3); ctx.lineTo(-w / 2, h / 2); ctx.closePath();
      const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, col); g.addColorStop(1, shade(col, st.shade));
      ctx.fillStyle = g; ctx.fill(); ctx.restore();
      ctx.fillStyle = 'rgba(120,90,0,.06)'; ctx.fillRect(-w / 2, -h / 2, w, h * .16);
      ctx.translate(-w / 2, -h / 2); fn(w, h); ctx.restore();
    }
    /** paper(x, y, w, h, k, {rot=-.008, col, tape=true}, fn(w, h)): a taped printout/card sliding on; content in local coords. Peels off with the next wipe. */
    function paper(x, y, w, h, k, o, fn) {
      if (k <= 0 || PEEL <= 0) return;
      const pp = S.paper, { rot = -.008, col = pp.col, tape = true } = o || {};
      const kk = eo(clamp(k));
      ctx.save(); ctx.globalAlpha *= clamp(k * 2.5) * PEEL; ctx.translate(x + w / 2, y + h / 2 + (1 - kk) * 24); ctx.rotate(rot);
      ctx.save(); ctx.shadowColor = pp.shadow; ctx.shadowBlur = pp.blur; ctx.shadowOffsetY = pp.offY;
      ctx.fillStyle = col; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore();
      ctx.strokeStyle = pp.edge; ctx.lineWidth = 1; ctx.strokeRect(-w / 2, -h / 2, w, h);
      if (tape) [[-w / 2 + 18, -h / 2 + 2, -.5], [w / 2 - 18, -h / 2 + 2, .5]].forEach(([tx, ty, a]) => {
        ctx.save(); ctx.translate(tx, ty); ctx.rotate(a); ctx.fillStyle = pp.tape; ctx.fillRect(-46, -15, 92, 30);
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-46, -15, 92, 8); ctx.restore();
      });
      ctx.translate(-w / 2, -h / 2); fn(w, h); ctx.restore();
    }

    // ── props: pen, eraser ──
    /** drawPen(scale=1): the marker in hand at the tip of whatever is being drawn this frame (no-op when nothing is) */
    function drawPen(sc = 1) {
      if (!PEN) return;
      const { x, y, col } = PEN, P = S.pen;
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.rotate(.62);
      ctx.save(); ctx.translate(P.shadowOff[0], P.shadowOff[1]); ctx.rotate(-.05); ctx.fillStyle = P.shadow; rr(20, -14, 220, 30, 13); ctx.fill(); ctx.restore();
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(15, -6); ctx.lineTo(15, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = P.ferrule; ctx.beginPath(); ctx.moveTo(13, -7); ctx.lineTo(36, -14); ctx.lineTo(36, 14); ctx.lineTo(13, 7); ctx.closePath(); ctx.fill();
      const g = ctx.createLinearGradient(0, -14, 0, 14); P.body.forEach(([o, c]) => g.addColorStop(o, c));
      ctx.fillStyle = g; rr(34, -14, 172, 28, 5); ctx.fill();
      ctx.fillStyle = col; ctx.fillRect(46, -14, 9, 28); if (P.band2) ctx.fillRect(150, -14, 40, 28);
      rr(200, -15, 44, 30, 8); ctx.fill();
      ctx.fillStyle = P.gloss; ctx.fillRect(204, -12, 36, 6); if (P.glossBar) ctx.fillRect(40, -12, 160, 4);
      ctx.restore();
    }
    /** eraserAt(x, y, rot=.06, scale=1): the board eraser prop (felt down), centred at (x, y) */
    function eraserAt(x, y, rot = .06, sc = 1) {
      const E = S.eraser;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
      ctx.fillStyle = E.shadow; rr(E.shadowXY[0], E.shadowXY[1], 110, 222, 16); ctx.fill();
      ctx.fillStyle = E.felt; rr(-62, -112, 26, 224, 6); ctx.fill();
      const g = ctx.createLinearGradient(-40, 0, 52, 0); g.addColorStop(0, E.body[0]); g.addColorStop(1, E.body[1]);
      ctx.fillStyle = g; rr(-44, -114, 96, 228, 14); ctx.fill();
      ctx.fillStyle = E.gloss; rr(-36, -104, 14, 208, 6); ctx.fill();
      ctx.restore();
    }

    // ── the board itself ──
    function ghostMarks(c) {
      const G = S.ghost; if (!G) return;
      const R = pick(G); if (!R) return;
      const r = rng(R.seed), [xa, xs] = R.x, [ya, ys] = R.y, [La, Ls] = R.L;
      if (S.kind === 'glass') {
        c.save(); c.filter = `blur(${G.blur}px)`; c.lineCap = 'round';
        for (let i = 0; i < R.count; i++) {
          const x = xa + r() * (W - xs), y = ya + r() * (H - ys), L = La + r() * Ls, a = (r() - .5) * R.ang, bend = (r() - .5) * 70;
          c.strokeStyle = `rgba(${G.color.join(',')},${.025 + r() * .03})`; c.lineWidth = 6 + r() * 10;
          c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + L * .5, y + L * .5 * Math.sin(a) + bend, x + L, y + L * Math.sin(a)); c.stroke();
        }
        c.restore();
      } else {
        for (let i = 0; i < R.count; i++) {
          const x = xa + r() * (W - xs), y = ya + r() * (H - ys), L = La + r() * Ls, a = (r() - .5) * R.ang, bend = (r() - .5) * 60;
          const pts = [[x, y], [x + L * .5, y + L * .5 * Math.sin(a) + bend], [x + L, y + L * Math.sin(a)]], lw = 7 + r() * 8, al = .03 + r() * .03;
          strokeOn(c, 'g' + i, pts, 1, G.color, { lw, alpha: al, amp: G.amp, halo: false });
        }
      }
    }
    function paintBoard(c) {
      if (S.kind === 'glass') {
        const [c0, c1, reach] = pick(S.wall);
        let g = c.createLinearGradient(0, 0, W * reach, H); g.addColorStop(0, c0); g.addColorStop(1, c1);
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.save(); c.filter = 'blur(28px)';
        (S.reflections || []).forEach(([x, y, w, h, col, a]) => { c.fillStyle = rgba(col, a); c.fillRect(x, y, w, h); c.fillStyle = rgba(col, a * .9); c.fillRect(x + 24, y + h - 70, w * .55, 26); });
        c.restore();
        const LS = S.lightStrip, poly = LS && pick(LS);
        if (poly) {
          const v = q => q === 'H+40' ? H + 40 : q;
          c.save(); c.filter = `blur(${LS.blur}px)`; c.fillStyle = LS.color; c.beginPath();
          poly.forEach(([x, y], i) => i ? c.lineTo(v(x), v(y)) : c.moveTo(v(x), v(y))); c.fill(); c.restore();
        }
        const ws = pick(S.wallSheen) || 0;
        if (ws > 0) {
          g = c.createLinearGradient(W * .5, 0, W * .9, H); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, `rgba(255,255,255,${ws})`); g.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = g; c.fillRect(0, 0, W, H);
        }
        ghostMarks(c);
      } else {
        c.fillStyle = S.board; c.fillRect(0, 0, W, H);
        let g = land ? c.createLinearGradient(0, 0, W * .6, H) : c.createLinearGradient(0, 0, W, H * .7);
        g.addColorStop(0, 'rgba(255,255,255,.6)'); g.addColorStop(.6, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(70,70,60,.06)');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        g = land ? c.createLinearGradient(W * .58, 0, W * .86, H) : c.createLinearGradient(W * .3, H * .45, W, H * .8);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, `rgba(255,255,255,${land ? .32 : .3})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        ghostMarks(c);
      }
    }
    let BG = null;
    /** board(): paint the empty board (call first each frame). Cached in an offscreen canvas unless opts.cache === false. */
    function board() {
      if (opts.cache === false) { paintBoard(ctx); return; }
      if (!BG) { BG = document.createElement('canvas'); BG.width = W; BG.height = H; paintBoard(BG.getContext('2d')); }
      ctx.drawImage(BG, 0, 0);
    }
    /** frame(): the board's edge and tray rail (draw after the content and eraser) */
    function frame() {
      const Fr = S.frame, top = TRAY.top;
      if (Fr.glass) {
        ctx.save(); ctx.strokeStyle = Fr.edge; ctx.lineWidth = 3; ctx.strokeRect(10, 10, W - 20, top - 14);
        ctx.strokeStyle = Fr.inner; ctx.lineWidth = 1; ctx.strokeRect(16, 16, W - 32, top - 26); ctx.restore();
        if (Fr.standoffs) {
          const n = pick(Fr.inset);
          [[n, n], [W - n, n], [n, top - n], [W - n, top - n]].forEach(([x, y]) => {
            ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(x + 3, y + 5, 19, 0, 7); ctx.fill();
            const g = ctx.createRadialGradient(x - 6, y - 6, 2, x, y, 18); g.addColorStop(0, '#f2f4f6'); g.addColorStop(.5, '#a9b0b8'); g.addColorStop(1, '#5d646c');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 17, 0, 7); ctx.fill(); ctx.restore();
          });
        }
      } else {
        const rw = Fr.railW, al = (x, y, w, h, vert) => { const g = vert ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
          g.addColorStop(0, Fr.rail[0]); g.addColorStop(.5, Fr.rail[1]); g.addColorStop(1, Fr.rail[2]); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); };
        al(0, 0, W, rw, false); al(0, 0, rw, H, true); al(W - rw, 0, rw, H, true);
      }
      const g = ctx.createLinearGradient(0, top, 0, H); Fr.tray.forEach(([o, c]) => g.addColorStop(o, c));
      ctx.fillStyle = g; ctx.fillRect(0, top, W, H - top);
      ctx.fillStyle = Fr.trayLine; ctx.fillRect(0, top - Fr.trayLineH, W, Fr.trayLineH);
    }
    /** tray(erasing): markers lying in the tray (the one in hand is missing) and the eraser (missing while it wipes) */
    function tray(erasing) {
      const T = S.trayPen;
      MARKERS.forEach((col, i) => {
        if (PEN && PEN.col === col) return;
        ctx.save(); ctx.translate(TRAY.xs[i], TRAY.y); if (TRAY.scale !== 1) ctx.scale(TRAY.scale, TRAY.scale);
        ctx.fillStyle = T.shadow; rr(4, 3, 104, 14, 7); ctx.fill();
        const g = ctx.createLinearGradient(0, -8, 0, 8); g.addColorStop(0, T.body[0]); g.addColorStop(1, T.body[1]);
        ctx.fillStyle = g; rr(0, -8, 80, 16, 4); ctx.fill(); ctx.fillStyle = col; rr(76, -9, 30, 18, 6); ctx.fill(); ctx.fillRect(8, -8, 6, 16); if (T.band2) ctx.fillRect(50, -8, 16, 16);
        ctx.restore();
      });
      if (!erasing && TRAY.eraser) { const [x, y, s] = TRAY.eraser; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 2); ctx.scale(s, s); eraserAt(0, 0, 0); ctx.restore(); }
    }

    // ── wipes: the eraser clears a chapter (or one zone) ──
    /** setWipes([E, …] or [[E, a0, a1], …]): the times the eraser finishes a pass, with an optional zone along the sweep axis (y range for dir 'y', x range for 'x') */
    function setWipes(list) { WIPES = list.map(w => Array.isArray(w) ? { at: w[0], zone: [w[1], w[2]] } : { at: w, zone: null }); }
    /** eraseK(t, E) → 0..1 eraser progress of the pass that finishes at E */
    const eraseK = (t, E) => eio(p(t, E - WIPE.lead, WIPE.dur));
    /** eraserPos(e, zone) → [x, y] of the eraser at progress e: sweeps along wipe.dir with a seeded-free sinusoidal swing */
    function eraserPos(e, zone) {
      const sw = Math.sin(e * Math.PI * 5) * WIPE.swing;
      if (WIPE.dir === 'x') { const [a0, a1] = zone || [0, W]; return [lerp(a0 - 150, a1 + 150, e), WIPE.center + sw]; }
      const [a0, a1] = zone || [0, H]; return [WIPE.center + sw, lerp(a0 - 150, a1 + 150, e)];
    }
    /**
     * onBoard(t, S, E, fn(u), zone?): draw one chapter's content while S <= t < E; u = t - S. At E the eraser wipes it
     * (clip follows the eraser); stickies and paper peel off just before. zone = [a0, a1] limits the wipe to that band
     * (content before a0 stays). Pass the same E (and zone) to setWipes.
     */
    function onBoard(t, S0, E, fn, zone) {
      if (t < S0 || t >= E) return;
      const e = eraseK(t, E);
      ctx.save();
      if (e > 0) {
        const [ex, ey] = eraserPos(e, zone); ctx.beginPath();
        if (WIPE.dir === 'x') { if (zone && zone[0] > 0) ctx.rect(0, 0, zone[0], H); ctx.rect(ex - 30, 0, W, H); }
        else { ctx.rect(0, 0, W, zone ? zone[0] : 0); ctx.rect(0, ey - 30, W, H); }
        ctx.clip();
      }
      PEEL = 1 - p(t, E - WIPE.peelLead, WIPE.peelDur);
      fn(t - S0);
      PEEL = 1;
      ctx.restore();
    }
    /** eraser(t) → true while a wipe is in progress: draws the smear and the moving eraser, and lifts the pen */
    function eraser(t) {
      let any = false;
      for (const { at: E, zone } of WIPES) {
        const e = eraseK(t, E), fade = 1 - p(t, E, WIPE.fade);
        if (e <= 0 || fade <= 0) continue;
        const pts = []; for (let q = 0; q <= e + 1e-6; q += .01) pts.push(eraserPos(Math.min(q, e), zone));
        if (pts.length > 1) strokeOn(ctx, 'smear' + E, pts, 1, S.smear.color, { lw: WIPE.smearW, alpha: S.smear.alpha * fade, amp: 6, halo: false });
        if (e < 1) { any = true; const [x, y] = eraserPos(e, zone); eraserAt(x, y, WIPE.rot + .08 + Math.sin(e * 30) * .05, WIPE.scale); }
      }
      if (any) PEN = null;
      return any;
    }
    /** begin(): reset transform, alpha, pen and peel — call at the top of renderAt */
    function begin() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; PEN = null; PEEL = 1; }

    return {
      W, H, ink: INK, paperInk: PAPER, markers: MARKERS, surface: S, fonts: F, wipe: WIPE, trayLayout: TRAY,
      boardColor: S.board,
      get pen() { return PEN; }, set pen(v) { PEN = v ? { ...v, col: penOf(v.col) } : null; },
      get peel() { return PEEL; },
      begin, board, frame, tray, drawPen, eraserAt, eraser, onBoard, setWipes, eraseK, eraserPos,
      stroke, setPen, arrowS, pathArrow, boxS, ringS, xmark, checkS, dotS, strike, hatch,
      wr, wk, say, sayParts, sticky, paper, txt, tw, font, rr,
      clamp, lerp, p, eo, eio, rng, hash, rgba, shade,
    };
  }

  root.Whiteboard = { create, SURFACES, clamp, lerp, p, eo, eio, rng, hash, rgba, shade };
})(typeof window !== 'undefined' ? window : globalThis);

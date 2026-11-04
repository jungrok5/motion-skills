// sketchnote-explainer · board.js — the film: a pencil sketches one drawing at a time on a single sheet of cream paper,
// colour washes come in a little off the line, handwritten labels and red arrows explain it, a two-line subtitle card
// says each beat, the camera glides from drawing to drawing — and at the end pulls back to show the whole sheet as one
// infographic.
//
//   const F = new Board({ title: 'From Flower to Honey', W: 1920, H: 1080 });
//   F.beat('꿀은 꽃에서 시작됩니다.', 'Honey begins in a flower.');   // a beat: subtitle (main line, second line)
//     F.sketch('flower', { x: 360, y: 520, s: 1.2 });                 // what the pencil draws in this beat, in order
//     F.label('nectar', 420, 600, { sub: '꽃꿀' });
//   F.beat(…) …
//   F.finale('…', '…'); F.title('From Flower to Honey', 80, 60, { marks: ['Flower', 'Honey'] });
//   F.start();
//
// Everything drawn at time t is a pure function of t, so the same page plays live and renders frame by frame to MP4.
import { C, clamp, lerp, easeInOut, smooth, hash, bbox, length, area, pencil, guide, wash, marker, write, measure, paper, grain, roundRect, curve, mix, font } from './hand.js';
import { SKETCHES } from './kit.js';
import { renderScore } from './sound.js';

const Q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const FONTS = [['Caveat', 'Caveat-500', '500'], ['Caveat', 'Caveat-700', '700'], ['Gaegu', 'Gaegu-700', '700'], ['Gaegu', 'Gaegu-700', '500'], ['Noto Sans KR', 'NotoSansKR-500', '500'], ['Noto Sans KR', 'NotoSansKR-500', '700']];
const LAYER = { guide: 0, under: 1, wash: 2, mark: 3, line: 4, anim: 5, text: 6, top: 7 };
const PEN = new Set(['line', 'guide', 'wash', 'text', 'mark']);

export class Board {
  /**
   * @param o.title  tab title
   * @param o.W,o.H  the sheet = the frame, in design px (1920×1080 by default; 1080×1440 (3:4) and 1080×1920 work too)
   * @param o.zoom   how close the camera comes to a beat's drawing (1.9; a beat can set its own)
   * @param o.pace   multiplies every stroke's drawing time (1)
   * @param o.tail   seconds held on the last frame (3)
   * @param o.music  soundtrack options for sound.js ({ key: 'F', bpm: 78, mood: 'warm' } · false = pencil sounds only)
   */
  constructor(o = {}) {
    Object.assign(this, { name: o.title || 'sketchnote', W: o.W || 1920, H: o.H || 1080, zoom: o.zoom || 1.9, pace: o.pace || 1, tail: o.tail ?? 3, fps: o.fps || 30, music: o.music ?? {} });
    this.u = Math.min(this.W, this.H) / 1080;
    this.beats = []; this.groups = []; this.rules = []; this._n = 0;
    for (const k of ['beat', 'finale', 'sketch', 'draw', 'line', 'guide', 'wash', 'label', 'arrow', 'title', 'note', 'mark']) this[k] = this[k].bind(this);
  }

  // ── authoring ──
  /** a beat: the subtitle card's main line and second line; o.zoom, o.focus (box or ids), o.hold (s after the drawing), o.dur (minimum), o.card ('left' | 'right') */
  beat(say = '', sub = '', o = {}) { const b = { i: this.beats.length, say, sub, o, groups: [] }; this.beats.push(b); return b; }
  /** the last beat: the camera pulls back to the whole sheet; whatever follows (a title, a note card) is drawn at full view */
  finale(say = '', sub = '', o = {}) { return this.beat(say, sub, { ...o, cam: 'all' }); }
  _group(kind, id, strokes, o = {}) {
    if (!this.beats.length) this.beat();
    id = id || `${kind}-${++this._n}`;
    if (this.groups.some(g => g.id === id)) throw new Error(`duplicate id "${id}"`);
    if (!strokes.length) throw new Error(`${kind} "${id}" draws nothing`);
    const b = this.beats.at(-1), g = { kind, id, strokes, o, beat: b.i, overlap: !!o.overlap, focus: o.focus !== false };
    strokes.forEach((s, j) => { s.group = g; s.seed = s.seed ?? hash(id) + j * 7; s.layer = s.layer ?? s.type; });
    b.groups.push(g); this.groups.push(g); return g;
  }
  /** a drawing from the kit (kit.js) or one you defined with defineSketch: { x, y, s, flip, id, …its own options } */
  sketch(name, o = {}) {
    const fn = SKETCHES[name]; if (!fn) throw new Error(`unknown sketch "${name}" — defineSketch it first`);
    return this._group('sketch', o.id || `${name}-${++this._n}`, place(fn({ ...o }, K), o), o);
  }
  /** a one-off drawing: F.draw((o, K) => [K.line(…), K.wash(…)], { x, y, s }) */
  draw(fn, o = {}) { return this._group('sketch', o.id, place(fn({ ...o }, K), o), o); }
  line(pts, o = {}) { return this._group('line', o.id, [K.line(pts, o)], o); }
  guide(pts, o = {}) { return this._group('guide', o.id, [K.guide(pts, o)], { ...o, focus: false }); }
  wash(pts, color, o = {}) { return this._group('wash', o.id, [K.wash(pts, color, o)], o); }
  mark(x, y, w, h, o = {}) { return this._group('mark', o.id, [K.mark(x, y, w, h, o)], o); }
  /** a handwritten label; o.sub = a smaller second line under it (e.g. the word in the other language), o.size, o.color, o.align */
  label(str, x, y, o = {}) {
    const size = o.size || 34, st = [K.text(str, x, y, { ...o, size })];
    if (o.sub) st.push(K.text(o.sub, o.align === 'center' ? x : o.align === 'right' ? x : x + (o.subIndent ?? size * .2), y + size * 1.12, { size: o.subSize || size * .78, font: 'k', color: o.subColor || C.soft, align: o.align, weight: 700 }));
    return this._group('label', o.id, st, o);
  }
  /** a hand-drawn arrow from a to b; o.bend (−1…1), o.color (red), o.head (true), o.w, o.label (text near the middle) */
  arrow(a, b, o = {}) {
    const [ax, ay] = a, [bx, by] = b, dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, bend = o.bend ?? .25;
    const mx = (ax + bx) / 2 - dy / L * L * bend * .5, my = (ay + by) / 2 + dx / L * L * bend * .5;
    const pts = curve([[ax, ay], [mx, my], [bx, by]], false, 14), color = o.color || C.red, w = o.w || 3;
    const st = [K.line(pts, { color, w })];
    if (o.head !== false) {
      const [px, py] = pts.at(-4), ang = Math.atan2(by - py, bx - px), hl = o.headLen || 16;
      st.push(K.line([[bx + Math.cos(ang + 2.6) * hl, by + Math.sin(ang + 2.6) * hl], [bx, by], [bx + Math.cos(ang - 2.6) * hl, by + Math.sin(ang - 2.6) * hl]], { color, w, dur: .16 }));
    }
    if (o.label) st.push(K.text(o.label, mx + (o.lx || 0), my - (o.size || 30) * 1.3 + (o.ly || 0), { size: o.size || 30, align: 'center', color: o.labelColor || C.line }));
    return this._group('arrow', o.id, st, { ...o, overlap: o.overlap ?? true });
  }
  /** the board's title: written large, highlighter behind o.marks (words), a red underline, o.sub (a smaller line under it) */
  title(str, x, y, o = {}) {
    const size = o.size || 76, st = [K.text(str, x, y, { size, weight: 700, font: o.font })], f = { size, weight: 700, font: o.font };
    // positions that depend on the font are worked out at build time, once the fonts have loaded
    for (const word of o.marks || []) {
      const i = str.indexOf(word); if (i < 0) throw new Error(`title: no "${word}" in "${str}"`);
      st.push({ ...K.mark(0, 0, 1, 1, { color: o.markColor || C.mark }), fit: (g, s) => { const x0 = x + measure(g, str.slice(0, i), f).w, w = measure(g, word, f).w; Object.assign(s, { x: x0 - size * .06, y: y + size * .24, w: w + size * .12, h: size * .74 }); } });
    }
    if (o.underline !== false) st.push({ ...K.line([[0, 0], [1, 0]], { color: C.red, w: 3.4 }), fit: (g, s) => { const tw = measure(g, str, f).w; s.pts = [[x - size * .05, y + size * 1.14], [x + tw * .55, y + size * 1.1], [x + tw + size * .1, y + size * 1.12]]; } });
    if (o.sub) st.push(K.text(o.sub, x + size * .04, y + size * 1.36, { size: o.subSize || size * .44, font: 'k', color: C.line }));
    return this._group('title', o.id || 'title', st, o);
  }
  /** a pinned note card: a coloured card with a double edge and handwritten lines (credits, a key number, a legend) */
  note(x, y, w, h, lines, o = {}) {
    const color = o.color || C.card, size = o.size || 32;
    const st = [K.wash([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], color, { off: [0, 0], alpha: .85 }),
      K.line([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { closed: true, w: 2.2 }),
      K.line([[x + 6, y - 5], [x + w + 6, y - 5], [x + w + 6, y + h - 5]], { w: 1.4, color: C.soft, dur: .25 })];
    [].concat(lines).forEach((l, i) => st.push(K.text(l, x + size * .7, y + size * .55 + i * size * 1.3, { size, font: /[가-힣]/.test(l) ? 'k' : undefined })));
    return this._group('note', o.id, st, o);
  }
  /** a rule checked at every sampled t by check.mjs: fn(t) → true when fine */
  check(name, fn) { this.rules.push({ name, fn }); }
  /** the soundtrack (sound.js) for this film → [L, R] */
  score(sr = 48000) { return renderScore({ cues: this.cues, dur: this.dur, finaleAt: this.finaleAt, beats: this.shots, music: this.music }, sr); }

  // ── build: boxes, timing, camera ──
  _build(g) {
    for (const gr of this.groups) {
      for (const s of gr.strokes) {
        if (s.fit) s.fit(g, s);
        s.box = strokeBox(g, s);
        if (s.type === 'line' || s.type === 'guide') { s.len = length(s.pts, s.closed); s.p0 = s.pts[0]; s.p1 = s.closed ? s.pts[0] : s.pts.at(-1); }
        if (s.type === 'wash') { const [x0, y0, x1, y1] = s.box; s.p0 = [x0, (y0 + y1) / 2]; s.p1 = [x1, (y0 + y1) / 2]; }
        if (s.type === 'text') { const [x0, y0, x1, y1] = s.box; s.p0 = [x0, y1 - s.size * .3]; s.p1 = [x1, y1 - s.size * .3]; }
        if (s.type === 'mark') { s.p0 = [s.x, s.y + s.h / 2]; s.p1 = [s.x + s.w, s.y + s.h / 2]; }
        s.dur = (s.dur ?? (
          s.type === 'line' ? clamp(s.len / 1000, .1, 1.1) :
          s.type === 'guide' ? clamp(s.len / 1700, .1, .45) :
          s.type === 'wash' ? clamp(.2 + Math.sqrt(area(s.pts)) / 800, .22, .6) :
          s.type === 'text' ? clamp(.12 + [...s.str].length * .045, .25, 1.5) :
          s.type === 'mark' ? clamp(.2 + s.w / 900, .3, .7) : (s.reveal ?? .45))) * (s.type === 'anim' ? 1 : this.pace);
      }
      const bs = gr.strokes.filter(s => s.type !== 'guide' && !s.nobox).map(s => s.box);
      gr.box = bs.length ? [Math.min(...bs.map(b => b[0])), Math.min(...bs.map(b => b[1])), Math.max(...bs.map(b => b[2])), Math.max(...bs.map(b => b[3]))] : gr.strokes[0].box;
    }
    // timing: a beat's strokes are drawn one after another, in the order they were written
    let t = 0;
    for (const b of this.beats) {
      b.t = t; b.all = b.o.cam === 'all'; b.move = b.o.move ?? (b.all ? 2.2 : b.i ? 1.05 : 0);
      let cur = t + (b.o.lead ?? (b.i === 0 ? .5 : b.all ? b.move * .85 : .62)), prev = null, end = cur;
      for (const gr of b.groups) {
        if (gr.o.wait) cur += gr.o.wait;
        const gStart = gr.o.together && prev ? prev.t0 : cur;
        gr.strokes.forEach((s, j) => {
          s.t0 = (s.with && prev ? prev.t0 : j === 0 ? gStart : cur) + (s.wait || 0);
          cur = Math.max(j === 0 && gr.o.together ? cur : s.t0, s.t0 + (s.type === 'anim' ? Math.min(s.dur, .4) : s.dur) + .05);
          if (s.type === 'anim' && s.hold) cur = Math.max(cur, s.t0 + s.hold);
          end = Math.max(end, cur); prev = s;
        });
      }
      const chars = [...(b.say || '')].length + [...(b.sub || '')].length * .35;
      b.dur = Math.max(b.o.dur || 0, end - t + (b.o.hold ?? .5), chars ? .9 + chars * .08 : 0, b.move + .4);
      t += b.dur;
    }
    this.dur = +(t + this.tail).toFixed(3);
    this.strokes = this.groups.flatMap(gr => gr.strokes).sort((a, b) => a.t0 - b.t0);
    this.penStrokes = this.strokes.filter(s => PEN.has(s.type) && s.pen !== false);
    this.drawOrder = [...this.strokes].sort((a, b) => (LAYER[a.layer] ?? 4) - (LAYER[b.layer] ?? 4) || a.t0 - b.t0);
    // the subtitle card: its size per beat, and the band it covers at the bottom of the frame
    const u = this.u; this.cardBand = 0;
    for (const b of this.beats) {
      if (!b.say && !b.sub) continue;
      const w1 = measure(g, b.say, { size: 34 * u, font: 'sans', weight: 500 }).w, w2 = b.sub ? measure(g, b.sub, { size: 30 * u, weight: 500 }).w : 0;
      b.card = { w: Math.max(w1, w2) + 52 * u, h: (b.sub ? 104 : 66) * u };
      this.cardBand = Math.max(this.cardBand, b.card.h + 56 * u);
    }
    // camera: each beat centres its new drawing above the subtitle card, as close as o.zoom (or the board's zoom) allows
    let cam = { cx: this.W / 2, cy: this.H / 2, z: 1 };
    const W = this.W, H = this.H, safe = H - this.cardBand, m = 60 * u;
    for (const b of this.beats) {
      if (b.all) cam = { cx: W / 2, cy: H / 2, z: 1 };
      else {
        const fb = this._focusBox(b);
        if (fb) {
          const bw = fb[2] - fb[0], bh = fb[3] - fb[1];
          let z = b.o.zoom ?? Math.min(this.zoom, (W - 2 * m) / bw, (safe - 2 * m) / bh); z = Math.max(1, z);
          let cx = (fb[0] + fb[2]) / 2, cy = (fb[1] + fb[3]) / 2 + (H / 2 - safe / 2) / z;
          const hw = W / 2 / z, hh = H / 2 / z;
          cx = clamp(cx, hw, W - hw); cy = clamp(cy, hh, H - hh);
          cam = { cx, cy, z };
        }
      }
      b.cam = cam;
      // the card goes where it covers least of this beat's drawing
      if (b.card) {
        const fb = this._focusBox(b), sb = fb && this.toScreen(cam, fb);
        const L = this._cardRect(b, 'left'), R = this._cardRect(b, 'right');
        b.cardSide = b.o.card || (sb && overlapArea(sb, L) > overlapArea(sb, R) ? 'right' : 'left');
      }
    }
    this.startCam = { ...this.beats[0].cam, z: this.beats[0].cam.z * 1.06 };
  }
  _focusBox(b) {
    let bs;
    if (Array.isArray(b.o.focus) && typeof b.o.focus[0] === 'number') return b.o.focus;
    if (Array.isArray(b.o.focus)) bs = b.o.focus.map(id => { const gr = this.groups.find(g => g.id === id); if (!gr) throw new Error(`beat ${b.i + 1}: focus on unknown id "${id}"`); return gr.box; });
    else bs = b.groups.filter(g => g.focus).map(g => g.box);
    if (!bs.length) return null;
    return [Math.min(...bs.map(x => x[0])), Math.min(...bs.map(x => x[1])), Math.max(...bs.map(x => x[2])), Math.max(...bs.map(x => x[3]))];
  }
  _cardRect(b, side) {
    const u = this.u, { w, h } = b.card, x = side === 'right' ? this.W - 56 * u - w : 56 * u, y = this.H - 56 * u - h;
    return [x, y, x + w, y + h];
  }
  toScreen(cam, [x0, y0, x1, y1]) { const f = (x, y) => [(x - cam.cx) * cam.z + this.W / 2, (y - cam.cy) * cam.z + this.H / 2]; const a = f(x0, y0), b = f(x1, y1); return [a[0], a[1], b[0], b[1]]; }
  beatIndex(t) { let i = 0; while (i < this.beats.length - 1 && t >= this.beats[i + 1].t) i++; return i; }
  camAt(t) {
    const i = this.beatIndex(t), b = this.beats[i], P = i ? this.beats[i - 1].cam : this.startCam, Qc = b.cam;
    const u = b.move ? easeInOut((t - b.t) / b.move) : 1;
    let z = Math.exp(lerp(Math.log(P.z), Math.log(Qc.z), u));
    // a wide move breathes out a little in the middle, like a hand sliding the canvas
    const far = Math.hypot(Qc.cx - P.cx, Qc.cy - P.cy) / this.W;
    if (!b.all) z /= 1 + Math.sin(Math.PI * u) * clamp(far * .5, 0, .18);
    const drift = b.all ? 0 : .018 * smooth((t - b.t - b.move) / Math.max(1, b.dur - b.move));
    z *= 1 + drift;
    return { cx: lerp(P.cx, Qc.cx, u), cy: lerp(P.cy, Qc.cy, u), z };
  }

  // ── drawing ──
  frame(t, sc = 1) {
    const g = this.ctx, W = this.W, H = this.H, cam = this.camAt(t);
    g.setTransform(sc, 0, 0, sc, 0, 0);
    g.drawImage(paper(Math.round(W * sc), Math.round(H * sc)), 0, 0, W, H);
    g.save();
    g.translate(W / 2, H / 2); g.scale(cam.z, cam.z); g.translate(-cam.cx, -cam.cy);
    const vx0 = cam.cx - W / 2 / cam.z - 40, vx1 = cam.cx + W / 2 / cam.z + 40, vy0 = cam.cy - H / 2 / cam.z - 40, vy1 = cam.cy + H / 2 / cam.z + 40;
    let tip = null, active = null;
    for (const s of this.drawOrder) {
      if (t < s.t0 || s.box[2] < vx0 || s.box[0] > vx1 || s.box[3] < vy0 || s.box[1] > vy1) continue;
      const k = clamp((t - s.t0) / s.dur), p = drawStroke(g, s, k, t);
      if (k < 1 && PEN.has(s.type) && s.pen !== false && (!active || s.t0 >= active.t0)) { active = s; tip = p; }
    }
    g.restore();
    this._pencil(g, t, cam, active, tip);
    this._card(g, t);
    g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = .45; g.drawImage(grain(Math.round(W * sc / 2), Math.round(H * sc / 2)), 0, 0, W, H); g.restore();
  }
  /** where the pencil tip is (screen px) and how high it is lifted (0 drawing … 1 away) */
  penAt(t, cam, active, tip) {
    const W = this.W, H = this.H, u = this.u, S = p => [(p[0] - cam.cx) * cam.z + W / 2, (p[1] - cam.cy) * cam.z + H / 2];
    const park = [W + 260 * u, H + 520 * u];
    if (active) {
      let p = tip || active.p1;
      if (active.type === 'wash') { const r = Math.min(40, (active.box[3] - active.box[1]) * .35), a = (t - active.t0) * 34; p = [p[0] - Math.sin(a) * r * .3, p[1] + Math.sin(a) * r]; }
      return { p: S(p), lift: 0 };
    }
    let prev = null, next = null;
    for (const s of this.penStrokes) { if (s.t0 + s.dur <= t) prev = s; else if (s.t0 > t) { next = s; break; } }
    const pe = prev && S(prev.p1), ns = next && S(next.p0), te = prev ? prev.t0 + prev.dur : -9, ts = next ? next.t0 : 1e9;
    const hop = (a, b, u) => { const e = easeInOut(u); return { p: [lerp(a[0], b[0], e), lerp(a[1], b[1], e) - Math.sin(Math.PI * e) * 26 * u], lift: Math.sin(Math.PI * clamp(u)) }; };
    if (prev && next && ts - te < .9) return hop(pe, ns, (t - te) / (ts - te));
    if (prev && t - te < .6) return hop(pe, park, (t - te) / .6);
    if (next && ts - t < .6) return hop(park, ns, 1 - (ts - t) / .6);
    return { p: park, lift: 1 };
  }
  _pencil(g, t, cam, active, tip) {
    const { p, lift } = this.penAt(t, cam, active, tip), u = this.u;
    if (p[0] > this.W + 200 * u && p[1] > this.H + 100 * u) return;
    const ang = 1.02, ca = Math.cos(ang), sa = Math.sin(ang), L = 500 * u, R = 15 * u;
    const at = (d, s) => [p[0] + ca * d - sa * s, p[1] + sa * d + ca * s];
    const body = [at(46 * u, -R), at(L, -R), at(L + 6 * u, -R * .6), at(L + 6 * u, R * .6), at(L, R), at(46 * u, R)];
    const cone = [at(4 * u, -2.4 * u), at(46 * u, -R), at(46 * u, R), at(4 * u, 2.4 * u)];
    const poly = (pts, fill, stroke, lw = 1.2 * u) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
    g.save();
    // shadow on the paper: further away when the pencil is lifted
    g.save(); g.translate((10 + lift * 26) * u, (12 + lift * 30) * u); g.globalAlpha = .13 - lift * .04; g.filter = `blur(${(3 + lift * 5) * u}px)`;
    poly([...cone.slice(0, 2), ...body.slice(1, 5), ...cone.slice(2)], '#3a2a1a'); g.restore();
    poly(body, '#fbfbf9', '#c9c4bc');
    // a soft cylinder shade along the far side, a highlight on the near side
    g.save(); poly(body); g.clip(); g.globalAlpha = .55;
    poly([at(46 * u, R * .35), at(L + 8 * u, R * .35), at(L + 8 * u, R + 2), at(46 * u, R + 2)], '#e2ded7');
    g.globalAlpha = .9; poly([at(46 * u, -R * .55), at(L, -R * .55), at(L, -R * .2), at(46 * u, -R * .2)], '#ffffff'); g.restore();
    poly(cone, '#f4f2ee', '#c9c4bc');
    poly([at(0, 0), at(9 * u, -2.6 * u), at(9 * u, 2.6 * u)], '#6a6560');
    // the flat band where the Pencil's name would be: a thin grey ring
    g.strokeStyle = '#d8d3cb'; g.lineWidth = 1.4 * u; g.beginPath(); const a1 = at(L - 70 * u, -R), a2 = at(L - 70 * u, R); g.moveTo(...a1); g.lineTo(...a2); g.stroke();
    g.restore();
  }
  _card(g, t) {
    const i = this.beatIndex(t), b = this.beats[i];
    if (!b.card) return;
    const a = clamp((t - b.t - .1) / .3) * clamp((b.t + b.dur + (i === this.beats.length - 1 ? this.tail : 0) - .12 - t) / .25);
    if (a <= 0) return;
    const u = this.u, [x0, y0, x1, y1] = this._cardRect(b, b.cardSide);
    g.save(); g.globalAlpha = a;
    g.save(); g.shadowColor = 'rgba(90,70,45,.22)'; g.shadowBlur = 16 * u; g.shadowOffsetY = 4 * u;
    g.fillStyle = '#fbf7ee'; g.beginPath(); roundRect(x0, y0, x1 - x0, y1 - y0, 7 * u, 3).forEach(([x, y], j) => j ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); g.restore();
    g.fillStyle = '#2f2925'; g.font = `500 ${34 * u}px 'Noto Sans KR', sans-serif`; g.textBaseline = 'alphabetic';
    g.fillText(b.say, x0 + 26 * u, y0 + 48 * u);
    if (b.sub) { g.fillStyle = '#5a5048'; g.font = `500 ${30 * u}px Caveat, Gaegu, cursive`; g.fillText(b.sub, x0 + 28 * u, y0 + 86 * u); }
    g.restore();
  }

  // ── layout problems (static): overlaps, off the sheet, a card over the drawing, text too small ──
  problems() {
    const out = [], ix = (a, b, p = 0) => a[0] < b[2] - p && b[0] < a[2] - p && a[1] < b[3] - p && b[1] < a[3] - p, u = this.u;
    const solid = this.groups.filter(g => !g.overlap && g.kind !== 'guide');
    for (let a = 0; a < solid.length; a++) for (let b = a + 1; b < solid.length; b++) if (ix(solid[a].box, solid[b].box, 2)) out.push(`overlap: ${solid[a].id} × ${solid[b].id}`);
    const texts = this.groups.filter(g => g.kind !== 'arrow').flatMap(g => g.strokes.filter(s => s.type === 'text').map(s => ({ g, s })));
    for (const ar of this.groups.filter(g => g.kind === 'arrow')) for (const s of ar.strokes.filter(s => s.type === 'line')) for (let i = 1; i < s.pts.length; i++) {
      const [a, b] = [s.pts[i - 1], s.pts[i]], sb = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
      for (const { g, s: ts } of texts) if (ix(sb, ts.box, 3)) out.push(`arrow ${ar.id} runs through the text of ${g.id}`);
    }
    for (const gr of this.groups) { const [x0, y0, x1, y1] = gr.box; if (x0 < 6 || y0 < 6 || x1 > this.W - 6 || y1 > this.H - 6) out.push(`${gr.id} is off the sheet (${[x0, y0, x1, y1].map(Math.round).join(', ')} on ${this.W}×${this.H})`); }
    const finale = this.beats.some(b => b.all);
    for (const b of this.beats) {
      if (b.card && b.card.w > this.W - 112 * u) out.push(`beat ${b.i + 1}: the subtitle is too long for one line ("${b.say.slice(0, 20)}…")`);
      const fb = b.all ? null : this._focusBox(b);
      if (fb) {
        const sb = this.toScreen(b.cam, fb);
        if (sb[0] < -2 || sb[1] < -2 || sb[2] > this.W + 2 || sb[3] > this.H + 2) out.push(`beat ${b.i + 1}: its drawing does not fit in the frame (zoom ${b.cam.z.toFixed(2)})`);
        if (b.card && ix(sb, this._cardRect(b, b.cardSide), 4)) out.push(`beat ${b.i + 1}: the subtitle card covers its drawing — move the drawing, set { card: 'right' } or a lower zoom`);
      }
      if (finale) for (const gr of b.groups) for (const s of gr.strokes) if (s.type === 'text' && s.size < 22 * u) out.push(`${gr.id}: "${s.str.slice(0, 16)}" is too small to read on the whole sheet (${Math.round(s.size)} px; 22+)`);
    }
    return [...new Set(out)];
  }

  // ── start: fonts, canvas, contract, live player ──
  async start() {
    const render = Q.has('render'), sc = +(Q.get('scale') || 1);
    document.title = document.title || this.name;
    const base = new URL('./fonts/', import.meta.url);
    await Promise.all(FONTS.map(([fam, file, weight]) => new FontFace(fam, `url(${new URL(file + '.woff2', base)})`, { weight }).load().then(f => document.fonts.add(f)).catch(e => console.error('font failed: ' + file, e.message))));
    const cv = document.createElement('canvas'); cv.width = Math.round(this.W * sc); cv.height = Math.round(this.H * sc);
    document.body.style.cssText = `margin:0;background:${C.paper};overflow:hidden;height:100vh;display:grid;place-items:center`;
    document.body.appendChild(cv); this.ctx = cv.getContext('2d'); this.canvas = cv;
    this._build(this.ctx);
    const probs = this.problems(); if (probs.length) console.warn('layout:\n  ' + probs.join('\n  '));
    const shots = this.beats.map(b => ({ name: b.say || b.sub || `beat ${b.i + 1}`, start: b.t, dur: b.dur }));
    Object.assign(this, { shots, cues: this.strokes.map(s => ({ t: +s.t0.toFixed(3), dur: +s.dur.toFixed(3), type: s.type, len: s.len || 0 })), finaleAt: this.beats.find(b => b.all)?.t ?? null });
    Object.assign(window, {
      film: this, DURATION: this.dur, FPS: this.fps, SIZE: { W: cv.width, H: cv.height },
      seek: t => this.frame(clamp(t, 0, this.dur), sc),
      shotAt: t => shots[this.beatIndex(t)],
      runChecks: t => [...probs.map(p => 'layout · ' + p), ...this.rules.filter(r => !r.fn(t)).map(r => r.name)],
    });
    if (Q.has('t')) { window.seek(+Q.get('t')); window.__ready = true; return; }
    if (render) { window.seek(0); window.__ready = true; return; }
    this._live(cv);
  }
  _live(cv) {
    const fit = () => { const k = Math.min(innerWidth / this.W, innerHeight / this.H); cv.style.width = `${this.W * k}px`; cv.style.height = `${this.H * k}px`; };
    fit(); addEventListener('resize', fit);
    const dpr = Math.min(2, devicePixelRatio || 1), k0 = () => Math.min(innerWidth / this.W, innerHeight / this.H) * dpr;
    const live = this.live = { playing: true, t: 0 }, loop = Q.has('loop');
    let last = performance.now(), lsc = 0, ac = null, buf = null, src = null, muted = Q.has('mute');
    // sound: the same score the MP4 gets, built in the page; browsers start audio only after a click or a key
    const stopSound = () => { if (src) { try { src.stop(); } catch { } src = null; } };
    const playSound = () => {
      stopSound(); if (muted || !live.playing) return;
      if (!ac) { ac = new AudioContext(); const [L, R] = this.score(ac.sampleRate); buf = ac.createBuffer(2, L.length, ac.sampleRate); buf.copyToChannel(L, 0); buf.copyToChannel(R, 1); }
      src = ac.createBufferSource(); src.buffer = buf; src.connect(ac.destination); src.start(0, live.t);
    };
    const go = t => { live.t = clamp(t, 0, this.dur); playSound(); };
    const act = a => {
      const i = this.beatIndex(live.t);
      if (a === 'restart') { live.playing = true; go(0); }
      else if (a === 'prev') go(live.t - this.beats[i].t > .8 || !i ? this.beats[i].t : this.beats[i - 1].t);
      else if (a === 'next') go(i < this.beats.length - 1 ? this.beats[i + 1].t : this.dur);
      else if (a === 'toggle') { if (live.t >= this.dur - .01) live.t = 0; live.playing = !live.playing; live.playing ? playSound() : stopSound(); }
      else if (a === 'mute') { muted = !muted; playSound(); }
    };
    cv.addEventListener('click', ev => {
      const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
      if (y > .94) { live.t = clamp(x, 0, 1) * this.dur; playSound(); return; }   // the progress line: jump
      if (!ac && live.playing) { playSound(); return; }                            // the first click only turns the sound on
      act('toggle');
    });
    addEventListener('keydown', ev => { const a = { ' ': 'toggle', ArrowRight: 'next', ArrowLeft: 'prev', r: 'restart', m: 'mute' }[ev.key]; if (a) { ev.preventDefault(); act(a); } });
    const frame = now => {
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      if (live.playing) { live.t += dt; if (live.t >= this.dur) { if (loop) go(0); else { live.t = this.dur; live.playing = false; stopSound(); } } }
      const want = Math.min(2, k0()); if (Math.abs(want - lsc) > .01) { lsc = want; cv.width = Math.round(this.W * lsc); cv.height = Math.round(this.H * lsc); }
      this.frame(live.t, lsc);
      // the live overlay: a thin progress line, and a play mark / sound hint while paused or silent
      const g = this.ctx, u = this.u; g.save(); g.setTransform(lsc, 0, 0, lsc, 0, 0);
      g.fillStyle = 'rgba(58,48,42,.12)'; g.fillRect(0, this.H - 6 * u, this.W, 6 * u); g.fillStyle = C.red; g.fillRect(0, this.H - 6 * u, this.W * live.t / this.dur, 6 * u);
      if (!live.playing) { g.globalAlpha = .82; g.fillStyle = C.line; g.beginPath(); g.arc(this.W / 2, this.H / 2, 54 * u, 0, Math.PI * 2); g.fill(); g.fillStyle = C.paper; g.beginPath(); g.moveTo(this.W / 2 - 16 * u, this.H / 2 - 24 * u); g.lineTo(this.W / 2 + 26 * u, this.H / 2); g.lineTo(this.W / 2 - 16 * u, this.H / 2 + 24 * u); g.fill(); }
      else if (!ac && !muted && live.t < 6) { g.globalAlpha = .7 * clamp((6 - live.t) / 1); g.font = `700 ${30 * u}px Caveat, cursive`; g.fillStyle = C.soft; g.textAlign = 'right'; g.fillText('click for sound ♪', this.W - 30 * u, 50 * u); }
      g.restore();
      requestAnimationFrame(frame);
    };
    window.__ready = true; requestAnimationFrame(frame);
  }
}

// ── strokes: the toolkit a sketch is written with (local coordinates; F.sketch places them) ──
export const K = {
  /** a pencil line: w (2.6), color, closed, dash (px), dur, wait, with (start with the previous stroke), pen: false (no pencil) */
  line: (pts, o = {}) => ({ type: 'line', pts, w: o.w ?? 2.6, color: o.color || C.line, closed: !!o.closed, dash: o.dash || 0, alpha: o.alpha ?? 1, dur: o.dur, wait: o.wait, with: o.with, pen: o.pen, layer: o.layer }),
  /** a smooth pencil line through control points */
  curve: (ctrl, o = {}) => K.line(curve(ctrl, !!o.closed), o),
  /** a faint construction line, drawn before the shape it guides (left on the sheet, like the reference) */
  guide: (pts, o = {}) => ({ type: 'guide', pts, closed: !!o.closed, dur: o.dur, wait: o.wait, with: o.with, layer: 'guide' }),
  /** a watercolour wash: color, off ([4, 3] — set off the line), angle (wipe direction), alpha */
  wash: (pts, color, o = {}) => ({ type: 'wash', pts, color, off: o.off || [4, 3], angle: o.angle ?? -.6, alpha: o.alpha ?? .92, dur: o.dur, wait: o.wait, with: o.with, pen: o.pen, layer: o.layer }),
  /** handwriting: size, color, align, font ('hand' Caveat · 'k' Gaegu · 'sans'), weight */
  text: (str, x, y, o = {}) => ({ type: 'text', str: String(str), x, y, size: o.size || 34, color: o.color || C.line, align: o.align || 'left', font: o.font, weight: o.weight || 700, lh: o.lh, dur: o.dur, wait: o.wait, with: o.with, pen: o.pen }),
  mark: (x, y, w, h, o = {}) => ({ type: 'mark', x, y, w, h, color: o.color || C.mark, dur: o.dur, wait: o.wait, with: o.with }),
  /** a filled dot (no outline): a quick wash */
  dot: (x, y, r, color, o = {}) => K.wash(circlePts(x, y, r), color, { off: [0, 0], dur: o.dur ?? .14, pen: false, ...o }),
  /** something that moves: draw(g, lt, k, o) in local coordinates, lt = seconds since it appeared, k = its reveal (0…1).
   *  box [x0, y0, x1, y1] (local) for the camera and the layout checks; reveal (s); hold (s the beat waits for it); layer */
  anim: (box, draw, o = {}) => ({ type: 'anim', box0: box, draw, reveal: o.reveal ?? .45, hold: o.hold, wait: o.wait, with: o.with ?? true, layer: o.layer || 'anim', nobox: o.nobox }),
};
const circlePts = (x, y, r) => Array.from({ length: 24 }, (_, i) => [x + Math.cos(i / 24 * Math.PI * 2) * r, y + Math.sin(i / 24 * Math.PI * 2) * r]);

/** register a drawing: defineSketch('bee', (o, K) => [K.line(…), K.wash(…), …]) — local coordinates around (0, 0) */
export function defineSketch(name, fn) { SKETCHES[name] = fn; return fn; }

// move a sketch's strokes from local coordinates to the sheet: x, y, s (scale), flip (mirror), rot (radians)
function place(strokes, o) {
  const x = o.x || 0, y = o.y || 0, s = o.s ?? 1, f = o.flip ? -1 : 1, r = o.rot || 0, cr = Math.cos(r), sr = Math.sin(r);
  const T = ([px, py]) => { const qx = px * f * s, qy = py * s; return [x + qx * cr - qy * sr, y + qx * sr + qy * cr]; };
  return strokes.flat(Infinity).filter(Boolean).map(st => {
    const q = { ...st };
    if (q.pts) q.pts = q.pts.map(T);
    if (q.type === 'line') q.w = q.w * Math.sqrt(s);
    if (q.type === 'wash') q.off = q.off.map(v => v * Math.sqrt(s));
    if (q.type === 'text') { [q.x, q.y] = T([q.x, q.y]); q.size *= s; if (f < 0 && q.align !== 'center') q.align = q.align === 'right' ? 'left' : 'right'; }
    if (q.type === 'mark') { [q.x, q.y] = T([q.x, q.y]); q.w *= s; q.h *= s; }
    if (q.type === 'anim') { q.tf = { x, y, s, f, r }; const [a, b] = [T([q.box0[0], q.box0[1]]), T([q.box0[2], q.box0[3]])]; q.box = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; }
    return q;
  });
}
function drawStroke(g, s, k, t) {
  switch (s.type) {
    case 'line': return pencil(g, s.pts, { w: s.w, color: s.color, closed: s.closed, k, seed: s.seed, dash: s.dash, alpha: s.alpha });
    case 'guide': return guide(g, s.pts, { k, seed: s.seed, closed: s.closed });
    case 'wash': return wash(g, s.pts, { color: s.color, k, seed: s.seed, off: s.off, angle: s.angle, alpha: s.alpha });
    case 'text': return write(g, s.str, s.x, s.y, { size: s.size, color: s.color, align: s.align, font: s.font, weight: s.weight, lh: s.lh, k });
    case 'mark': return marker(g, s.x, s.y, s.w, s.h, { color: s.color, k, seed: s.seed });
    case 'anim': { const { x, y, s: sc, f, r } = s.tf; g.save(); g.translate(x, y); g.rotate(r); g.scale(sc * f, sc); s.draw(g, t - s.t0, k, s); g.restore(); return null; }
  }
}
function strokeBox(g, s) {
  if (s.type === 'anim') return s.box;
  if (s.type === 'text') { const m = measure(g, s.str, { size: s.size, font: s.font, weight: s.weight, lh: s.lh }), x0 = s.align === 'center' ? s.x - m.w / 2 : s.align === 'right' ? s.x - m.w : s.x; return [x0, s.y, x0 + m.w, s.y + Math.max(m.h, s.size * 1.05)]; }
  if (s.type === 'mark') return [s.x, s.y, s.x + s.w, s.y + s.h];
  const [x0, y0, x1, y1] = bbox(s.pts), p = (s.w || 2) / 2 + (s.type === 'wash' ? Math.max(...s.off.map(Math.abs)) + 2 : 1);
  return [x0 - p, y0 - p, x1 + p, y1 + p];
}
function overlapArea(a, b) { return Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1])); }

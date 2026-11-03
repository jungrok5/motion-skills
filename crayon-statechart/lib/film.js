// crayon-statechart · film.js — the film: a statechart that draws itself one step at a time on a long sheet of paper,
// a camera that scrolls down to keep the newest part in view, crayon props beside it, and a player bar with a caption.
//
//   const F = new Film({ title: 'the making of …', W: 1350, H: 1080 });
//   F.step('whole cabbages come in from the field', { at: 'cabbage' });   // a step: caption + the active state(s)
//     F.chapter({ … }); F.init('i1', …); F.state('cabbage', …); F.edge('i1', 'cabbage'); F.prop('person', { … });
//   F.step(…) …
//   F.start();
//
// Everything drawn at time t is a pure function of t, so the same page plays live and renders frame by frame to MP4.
import { C, clamp, lerp, smooth, easeInOut, easeOut, paper, grain, ink, text, measure, roundRectPts, hash, shape } from './sketch.js';
import { layout, route, labelOf, drawState, drawDot, drawInit, drawEdge, drawGroup, drawDivider, drawChapter, drawNote } from './chart.js';
import { drawProp, propBox, PROPS } from './props.js';

const Q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const FONTS = [['Courier Prime', 'CourierPrime-400', '400', 'normal'], ['Courier Prime', 'CourierPrime-700', '700', 'normal'], ['Courier Prime', 'CourierPrime-400i', '400', 'italic'], ['Courier Prime', 'CourierPrime-700i', '700', 'italic'],
  ['Nanum Gothic Coding', 'NanumGothicCoding-400', '400', 'normal'], ['Nanum Gothic Coding', 'NanumGothicCoding-700', '700', 'normal']];

export class Film {
  /**
   * @param o.title   shown in the tab; also the default chapter kicker prefix
   * @param o.W,o.H   frame size in design px (1350×1080 = 5:4 by default; 1920×1080, 1080×1350, 1080×1920 work too)
   * @param o.step    seconds a step lasts at 1× (it grows to fit its reveals) · o.hold  seconds held on the last frame
   * @param o.bar     false hides the player bar (then the caption is not shown either)
   * @param o.number  false stops "II.3 — " being put in front of captions
   */
  constructor(o = {}) {
    Object.assign(this, { title: o.title || 'crayon statechart', W: o.W || 1350, H: o.H || 1080, stepDur: o.step || 1.5, hold: o.hold ?? 2.5, bar: o.bar !== false, number: o.number !== false, fps: o.fps || 30 });
    this.barH = this.bar ? Math.round(this.H * .1) : 0;
    this.els = []; this.steps = []; this.chapters = 0; this.inChapter = 0; this.rules = [];
    this.fadeIn = 0; this.fadeOut = 0;
    for (const k of ['chapter', 'state', 'init', 'final', 'edge', 'group', 'region', 'divider', 'note', 'prop']) this[k] = this[k].bind(this);
  }

  // ── authoring ──
  /** start a step: its caption, and the state(s) that are active during it (a string or an array for parallel regions) */
  step(caption, o = {}) {
    if (typeof o === 'string' || Array.isArray(o)) o = { at: o };
    const s = { i: this.steps.length, caption, at: [].concat(o.at || []), dur: o.dur, cam: o.cam, focus: o.focus, chapter: this.chapters, els: [] };
    this.steps.push(s); this.inChapter++; s.n = this.inChapter; return s;
  }
  _add(el) {
    if (!this.steps.length) this.step('');
    if (el.id && this.els.some(e => e.id === el.id)) throw new Error(`duplicate id "${el.id}"`);
    const s = el.stepIndex != null ? this.steps[el.stepIndex] : this.steps[this.steps.length - 1];
    el.step = s.i; el.order = s.els.length; s.els.push(el); this.els.push(el); return el;
  }
  /** a chapter heading: kicker ("the making of … · II"), a big title, an italic subtitle, a small red second-language line */
  chapter(o) {
    this.chapters++; this.inChapter = 0; const s = this.steps[this.steps.length - 1]; if (s) { s.chapter = this.chapters; s.n = (this.inChapter = 1); }
    return this._add({ kind: 'chapter', id: o.id || `chapter${this.chapters}`, kicker: o.kicker ?? `${this.title} · ${ROMAN[this.chapters] || this.chapters}`, ...o });
  }
  /** a state: label (main line), tag (small red line above it, e.g. the word in another language); x = centre, y = top */
  state(id, o) { return this._add({ kind: 'state', id, ...o }); }
  init(id, o) { return this._add({ kind: 'init', id, ...o }); }
  final(id, o) { return this._add({ kind: 'final', id, ...o }); }
  /** a transition. o: text (the action, blue), guard (red, shown in [brackets]), exit/enter ('t' 'b' 'l' 'r'), ex/en (−1..1 along
   *  that side), via [[x, y] …] corner points, midY / midX, out (how far a back edge or self-loop swings out), side 'l' (label on
   *  the left), lx/ly (label position), r (corner radius) */
  edge(from, to, o = {}) { return this._add({ kind: 'edge', id: o.id || `${from}->${to}${this.els.filter(e => e.kind === 'edge' && e.from === from && e.to === to).length || ''}`, from, to, ...o }); }
  /** a container (compound or parallel state): x, y (top-left), w, h, title (italic header line) */
  group(id, o) { return this._add({ kind: 'group', id, ...o }); }
  /** a tinted region inside a parallel group: tint 'sky' | 'blush' | 'cream' | 'mint' | 'paper', title (bold) */
  region(id, o) { return this._add({ kind: 'region', id, ...o }); }
  /** a dashed line: vertical { x, y, h } or horizontal { x, y, x1 } */
  divider(id, o) { return this._add({ kind: 'divider', id, ...o }); }
  note(id, o) { return this._add({ kind: 'note', id, ...o }); }
  /** an illustration from props.js: F.prop('person', { x, y, s, flip, pose, act, … }); bg: true draws it behind the chart */
  prop(name, o = {}) { this._np = (this._np || 0) + 1; return this._add({ kind: 'prop', ...o, id: o.id || `${name}-${this._np}`, name }); }
  /** a rule checked at every sampled t by check.mjs: fn(t) → true when fine */
  check(name, fn) { this.rules.push({ name, fn }); }

  // ── build: layout, routes, reveal times, camera ──
  _build(g) {
    const byId = this.byId = new Map(this.els.map(e => [e.id, e]));
    for (const e of this.els) {
      if (e.kind === 'prop') { if (!PROPS[e.name]) throw new Error(`unknown prop "${e.name}"`); e.box = propBox(e); }
      else if (e.kind !== 'edge') layout(e, g);
    }
    for (const e of this.els) if (e.kind === 'edge') {
      const A = byId.get(e.from), B = byId.get(e.to);
      if (!A || !B) throw new Error(`edge ${e.id}: no element "${!A ? e.from : e.to}"`);
      route(e, A, B); e.lab = labelOf(e, g, A === B);
      const xs = e.raw.map(p => p[0]), ys = e.raw.map(p => p[1]);
      e.box = [Math.min(...xs) - 6, Math.min(...ys) - 6, Math.max(...xs) + 6, Math.max(...ys) + 6];
      e.len = e.pts.reduce((L, p, i, a) => i ? L + Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) : 0, 0);
    }
    // reveal times: a step's elements come in one after another, in the order they were written
    let t = 0;
    for (const s of this.steps) {
      s.start = t; let cur = t + .12, end = cur;
      for (const e of s.els) {
        e.rd = e.kind === 'edge' ? clamp(.25 + e.len / 900, .3, 1) : e.kind === 'chapter' ? .5 + e.rows.length * .25 : e.kind === 'state' ? .45 : e.kind === 'prop' ? .7 : e.kind === 'group' || e.kind === 'region' ? .7 : .4;
        e.t0 = e.delay != null ? t + e.delay : cur; end = Math.max(end, e.t0 + e.rd);
        cur = e.t0 + (e.kind === 'edge' ? e.rd * .8 : e.kind === 'chapter' ? e.rd * .7 : e.kind === 'prop' ? .12 : .2);
      }
      s.activeAt = Math.max(t + .1, ...s.at.map(id => { const e = byId.get(id); if (!e) throw new Error(`step "${s.caption}": no state "${id}"`); return e.step === s.i ? e.t0 + e.rd * .6 : t + .1; }));
      s.dur = Math.max(s.dur || this.stepDur, end - t + .55);
      t += s.dur;
    }
    this.dur = +(t + this.hold).toFixed(3);
    // camera: scroll only as far as needed to keep each step's new elements (or its focus) in view
    const VH = this.H - this.barH, m = 36; let y = 0;
    for (const s of this.steps) {
      if (s.cam != null) y = s.cam;
      else {
        const ids = s.focus || s.els.filter(e => e.kind !== 'prop' || e.focus).map(e => e.id).concat(s.at);
        const bs = ids.map(id => byId.get(id)).filter(Boolean).map(e => e.box);
        if (bs.length) {
          const top = Math.min(...bs.map(b => b[1])), bot = Math.max(...bs.map(b => b[3]));
          const ch = s.els.find(e => e.kind === 'chapter');
          if (ch) y = Math.max(0, ch.box[1] - m);
          else { if (bot > y + VH - m) y = bot - VH + m; if (top < y + m) y = Math.max(0, top - m); }
        }
      }
      s.camY = y;
    }
    this.worldH = Math.max(...this.els.map(e => e.box[3])) + 60;
  }
  camAt(t) {
    const i = this.stepIndex(t), s = this.steps[i], prev = i ? this.steps[i - 1].camY : 0;
    return lerp(prev, s.camY, easeInOut((t - s.start) / .9));
  }
  stepIndex(t) { let i = 0; while (i < this.steps.length - 1 && t >= this.steps[i + 1].start) i++; return i; }
  stateAt(t) {
    const i = this.stepIndex(t), s = this.steps[i], active = new Set(t >= s.activeAt ? s.at : i ? this.steps[i - 1].at : []), visited = new Set();
    for (let j = 0; j <= i; j++) for (const id of this.steps[j].at) if (!active.has(id) && (j < i || t >= s.activeAt)) visited.add(id);
    return { active, visited, pop: (t - s.activeAt) / .35, i };
  }

  // ── drawing ──
  draw(t, sc = 1) {
    const g = this.ctx, W = this.W, H = this.H;
    g.setTransform(sc, 0, 0, sc, 0, 0);
    g.drawImage(paper(Math.round(W * sc), Math.round(H * sc)), 0, 0, W, H);
    const cam = this.camAt(t), st = this.stateAt(t), VH = H - this.barH;
    g.save(); g.beginPath(); g.rect(0, 0, W, VH); g.clip(); g.translate(0, -cam);
    const vis = e => e.box[3] > cam - 40 && e.box[1] < cam + VH + 40;
    const k = e => clamp((t - e.t0) / e.rd);
    const pass = (pred, fn) => { for (const e of this.els) if (pred(e) && t >= e.t0 && vis(e)) fn(e, k(e)); };
    pass(e => e.kind === 'group' || e.kind === 'region', (e, kk) => drawGroup(g, e, kk));
    pass(e => e.kind === 'divider', (e, kk) => drawDivider(g, e, kk));
    pass(e => e.kind === 'prop' && e.bg, (e, kk) => this._prop(g, e, kk, t));
    pass(e => e.kind === 'prop' && !e.bg && !e.front, (e, kk) => this._prop(g, e, kk, t));
    pass(e => e.kind === 'edge', (e, kk) => drawEdge(g, e, kk, g));
    pass(e => e.kind === 'init' || e.kind === 'final', (e, kk) => drawInit(g, e, kk));
    pass(e => e.kind === 'state', (e, kk) => { drawState(g, e, kk, st, sc); drawDot(g, e, kk, st); });
    pass(e => e.kind === 'chapter', (e, kk) => drawChapter(g, e, kk));
    pass(e => e.kind === 'note', (e, kk) => drawNote(g, e, kk));
    pass(e => e.kind === 'prop' && e.front, (e, kk) => this._prop(g, e, kk, t));
    g.restore();
    if (this.bar) this._bar(g, t, st.i);
    g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = .5; g.drawImage(grain(Math.round(W * sc / 2), Math.round(H * sc / 2)), 0, 0, W, H); g.restore();
  }
  _prop(g, e, k, t) {
    const [x0, y0, x1, y1] = e.box, u = easeOut(k);
    g.save();
    if (k < 1) { g.globalAlpha *= clamp(k * 1.8); g.beginPath(); g.rect(x0 - 30, y0 - 30, x1 - x0 + 60, (y1 - y0 + 60) * u); g.clip(); }
    const lt = e.still ? 0 : t - e.t0;
    drawProp(g, e, lt, hash(e.id));
    g.restore();
  }
  _bar(g, t, i) {
    const W = this.W, y0 = this.H - this.barH, h = this.barH, s = this.steps[i], u = h / 108;
    g.save();
    g.fillStyle = C.paper; g.globalAlpha = .96; g.fillRect(0, y0, W, h); g.globalAlpha = 1;
    ink(g, [[0, y0 + 1], [W, y0 + 1]], { w: 2.4, seed: 3, amp: .3 });
    const playing = this.live ? this.live.playing : true, speed = this.live ? this.live.speed : 1;
    const btns = [['restart', 'restart'], ['prev', 'prev'], [playing && t < this.dur - .01 ? 'pause' : 'play', 'toggle'], ['next', 'next'], [`${speed}×`, 'speed']];
    const fs = 20 * u, pad = 16 * u, gap = 12 * u, bh = 40 * u, by = y0 + 16 * u;
    g.font = `700 ${fs}px 'Courier Prime', monospace`;
    const ws = btns.map(([l]) => g.measureText(l).width + pad * 2 + 22 * u);
    const cw = measure(g, `${this.steps.length}/${this.steps.length}`, { size: 17 * u }).w;
    let x = W / 2 - (ws.reduce((a, b) => a + b, 0) + gap * (btns.length - 1) + cw + 20 * u) / 2;
    this._hits = [];
    btns.forEach(([l, act], j) => {
      const w = ws[j], pts = roundRectPts(x, by, w, bh, 9 * u, 4), sd = 50 + j * 7;
      shape(g, roundRectPts(x + 3 * u, by + 3 * u, w, bh, 9 * u, 4), { fill: C.ink, base: C.ink, baseA: .25, gap: 2.4, a: .5, outline: null, seed: sd });
      shape(g, pts, { fill: C.white, base: C.white, baseA: 1, hatchColor: C.creamHatch, a: .25, w: 2.1, seed: sd + 1 });
      this._icon(g, act, l, x + pad + 6 * u, by + bh / 2, 7 * u);
      text(g, l, x + pad + 20 * u, by + bh / 2 - fs * .58, { size: fs, bold: true, color: C.navy });
      this._hits.push({ act, x0: x, x1: x + w, y0: by, y1: by + bh });
      x += w + gap;
    });
    text(g, `${i + 1}/${this.steps.length}`, x + 8 * u, by + bh / 2 - 9 * u, { size: 17 * u, bold: true, color: C.red });
    const cap = this.capOf(s);
    text(g, cap, W / 2, by + bh + 12 * u, { size: 17 * u, italic: true, color: C.navy, align: 'center' });
    g.restore();
  }
  _icon(g, act, l, x, y, r) {
    g.save(); g.fillStyle = C.navy; g.strokeStyle = C.navy; g.lineWidth = r * .32; g.lineCap = 'round';
    const tri = (dir) => { g.beginPath(); g.moveTo(x + dir * r * .8, y); g.lineTo(x - dir * r * .6, y - r * .75); g.lineTo(x - dir * r * .6, y + r * .75); g.closePath(); g.fill(); };
    if (act === 'restart') { g.beginPath(); g.arc(x, y, r * .75, -.4, Math.PI * 1.45); g.stroke(); g.beginPath(); g.moveTo(x + r * .95, y - r * .7); g.lineTo(x + r * .75, y - r * .05); g.lineTo(x + r * .1, y - r * .4); g.closePath(); g.fill(); }
    else if (act === 'prev') tri(-1);
    else if (act === 'next') tri(1);
    else if (act === 'toggle' && l === 'pause') { g.fillRect(x - r * .7, y - r * .75, r * .45, r * 1.5); g.fillRect(x + r * .15, y - r * .75, r * .45, r * 1.5); }
    else if (act === 'toggle') tri(1);
    else if (act === 'speed') { g.beginPath(); g.moveTo(x + r * .3, y - r); g.lineTo(x - r * .55, y + r * .15); g.lineTo(x, y + r * .15); g.lineTo(x - r * .3, y + r); g.lineTo(x + r * .55, y - r * .15); g.lineTo(x, y - r * .15); g.closePath(); g.fill(); }
    g.restore();
  }
  capOf(s) { return !s.caption ? '' : this.number && s.chapter ? `${ROMAN[s.chapter] || s.chapter}.${s.n} — ${s.caption}` : s.caption; }

  // ── layout problems (static): overlaps, edges through boxes, out of the frame, captions too long ──
  problems() {
    const out = [], ix = (a, b, p = 0) => a[0] < b[2] - p && b[0] < a[2] - p && a[1] < b[3] - p && b[1] < a[3] - p;
    const solid = this.els.filter(e => ['state', 'chapter', 'note', 'init', 'final'].includes(e.kind) || (e.kind === 'prop' && !e.bg && !e.overlap));
    const labs = this.els.filter(e => e.kind === 'edge' && e.lab).flatMap(e => e.lab.parts.map((p, j) => ({ id: `label of ${e.id}${j ? ' (2)' : ''}`, box: p.box, edge: e })));
    const items = [...solid.map(e => ({ id: e.id, box: e.box, el: e })), ...labs];
    for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
      const A = items[a], B = items[b];
      if ((A.el?.kind === 'prop' || B.el?.kind === 'prop') && (A.el?.kind === 'prop' && B.el?.kind === 'prop')) continue; // props may touch each other
      if (ix(A.box, B.box, 2)) out.push(`overlap: ${A.id} × ${B.id}`);
    }
    const states = this.els.filter(e => e.kind === 'state' || e.kind === 'prop' && !e.bg && !e.overlap || e.kind === 'chapter' || e.kind === 'note');
    for (const e of this.els.filter(e => e.kind === 'edge')) for (const [a, b] of e.segs) {
      const sb = [Math.min(a[0], b[0]) - 1, Math.min(a[1], b[1]) - 1, Math.max(a[0], b[0]) + 1, Math.max(a[1], b[1]) + 1];
      for (const s of states) if (s.id !== e.from && s.id !== e.to && ix(sb, s.box, 3)) out.push(`edge ${e.id} runs through ${s.id}`);
      for (const l of labs) if (l.edge !== e && ix(sb, l.box, 2)) out.push(`edge ${e.id} runs through ${l.id}`);
    }
    for (const e of this.els) if (e.box[0] < 8 || e.box[2] > this.W - 8) out.push(`${e.id} is outside the frame (x ${Math.round(e.box[0])}…${Math.round(e.box[2])}, frame 0…${this.W})`);
    const g = this.ctx;
    for (const s of this.steps) { const w = measure(g, this.capOf(s), { size: 17 * this.barH / 108, italic: true }).w; if (w > this.W - 40) out.push(`caption of step ${s.i + 1} is too long for the bar`); }
    const VH = this.H - this.barH;
    for (const s of this.steps) for (const id of s.at) { const e = this.byId.get(id); if (e && (e.box[3] > s.camY + VH || e.box[1] < s.camY)) out.push(`step ${s.i + 1}: active state ${id} is out of view`); }
    return [...new Set(out)];
  }

  // ── start: fonts, canvas, contract, live player ──
  async start() {
    const render = Q.has('render'), sc = +(Q.get('scale') || 1);
    document.title = document.title || this.title;
    const base = new URL('./fonts/', import.meta.url);
    await Promise.all(FONTS.map(([fam, file, weight, style]) => new FontFace(fam, `url(${new URL(file + '.woff2', base)})`, { weight, style }).load().then(f => document.fonts.add(f)).catch(e => console.error('font failed: ' + file, e.message))));
    const cv = document.createElement('canvas'); cv.width = Math.round(this.W * sc); cv.height = Math.round(this.H * sc);
    document.body.style.cssText = `margin:0;background:${C.paper};overflow:hidden;height:100vh;display:grid;place-items:center`;
    document.body.appendChild(cv); this.ctx = cv.getContext('2d'); this.canvas = cv;
    this._build(this.ctx);
    const probs = this.problems(); if (probs.length) console.warn('layout:\n  ' + probs.join('\n  '));
    Object.assign(window, {
      film: Object.assign(this, { shots: this.steps.map(s => ({ name: this.capOf(s) || `step ${s.i + 1}`, start: s.start, dur: s.dur })) }),
      DURATION: this.dur, FPS: this.fps, SIZE: { W: cv.width, H: cv.height },
      seek: t => this.draw(clamp(t, 0, this.dur), sc),
      shotAt: t => this.film?.shots?.[this.stepIndex(t)] || { name: this.capOf(this.steps[this.stepIndex(t)]) },
      runChecks: t => [...probs.map(p => 'layout · ' + p), ...this.rules.filter(r => !r.fn(t)).map(r => r.name)],
    });
    this.film = window.film;
    if (Q.has('t')) { window.seek(+Q.get('t')); window.__ready = true; return; }
    if (render) { window.seek(0); window.__ready = true; return; }
    // live: fit the window, play, the bar's buttons work, keys too
    const fit = () => { const k = Math.min(innerWidth / this.W, innerHeight / this.H); cv.style.width = `${this.W * k}px`; cv.style.height = `${this.H * k}px`; };
    fit(); addEventListener('resize', fit);
    const dpr = Math.min(2, devicePixelRatio || 1), k0 = () => Math.min(innerWidth / this.W, innerHeight / this.H) * dpr;
    let live = this.live = { playing: true, speed: 1, t: 0 }, last = performance.now(), lsc = 0;
    const loop = Q.has('loop');
    const go = t => { live.t = clamp(t, 0, this.dur); };
    const act = a => {
      const i = this.stepIndex(live.t);
      if (a === 'restart') { go(0); live.playing = true; }
      else if (a === 'prev') go(live.t - this.steps[i].start > .6 || !i ? this.steps[i].start : this.steps[i - 1].start);
      else if (a === 'next') go(i < this.steps.length - 1 ? this.steps[i + 1].start : this.dur);
      else if (a === 'toggle') { if (live.t >= this.dur - .01) go(0); live.playing = !live.playing || live.t === 0; }
      else if (a === 'speed') live.speed = live.speed >= 3 ? 1 : live.speed + 1;
    };
    cv.addEventListener('click', ev => {
      const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * this.W, y = (ev.clientY - r.top) / r.height * this.H;
      const h = (this._hits || []).find(h => x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1);
      act(h ? h.act : 'toggle');
    });
    addEventListener('keydown', ev => { const a = { ' ': 'toggle', ArrowRight: 'next', ArrowLeft: 'prev', r: 'restart', s: 'speed' }[ev.key]; if (a) { ev.preventDefault(); act(a); } });
    const frame = now => {
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      if (live.playing) { live.t += dt * live.speed; if (live.t >= this.dur) { if (loop) live.t = 0; else { live.t = this.dur; live.playing = false; } } }
      const want = Math.min(2, k0()); if (Math.abs(want - lsc) > .01) { lsc = want; cv.width = Math.round(this.W * lsc); cv.height = Math.round(this.H * lsc); }
      this.draw(live.t, lsc);
      requestAnimationFrame(frame);
    };
    window.__ready = true; requestAnimationFrame(frame);
  }
}

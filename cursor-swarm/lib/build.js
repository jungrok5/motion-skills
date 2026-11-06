// cursor-swarm · build.js — a web page built in front of you by a swarm of agent cursors, in a dark design editor.
//
//   const B = new Build({ title, url, prompt, page: { w: 860, bg: '#f5ede0' }, agents: 28 });
//   B.section('hero');
//   B.rect('hero-bg', { x: 0, y: 64, w: 860, h: 320, fill: '#2b1d12', r: 18 });
//   B.text('headline', { x: 48, y: 420, w: 640, text: 'Fresh at five', font: 'serif', size: 48, color: '#2b1d12' });
//   B.paint('banner', { x: 24, y: 88, w: 812, h: 272, art: 'my-pixel-scene', px: 8 });   // the swarm paints it
//   B.sync();                                                                            // wait for the section
//   B.start();
//
// Each call queues one "op" at the time cursor B.t and moves B.t a little (ops overlap: many agents work at once).
// At start() the ops are measured, every job is given to the nearest free agent, the camera follows the newest work,
// and everything drawn at time t is a pure function of t — the page plays live and renders frame by frame to MP4.
import { ED, AGENT_COLORS, FONT_FILES, clamp, lerp, smooth, easeInOut, easeOut, easeIn, easeOutBack, hash, rng, n1,
  rgbOf, mix, alpha, luma, fontOf, setFont, measure, wrap, pixelText, pixelWidth, rrect, drawArrow, drawBeam, drawTag } from './core.js';
import { ART, defineArt, renderArt } from './art.js';

export { defineArt, ART };
export * from './core.js';

const Q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const SEL_KINDS = new Set(['rect', 'text', 'image', 'paint', 'cells', 'chips', 'line']);

export class Build {
  /**
   * @param o.title   the site's name (tab title)        @param o.url     shown in the HUD ("live — url" at the end)
   * @param o.prompt  the request typed into the HUD at the start ("build a website for …")
   * @param o.page    { w: page width in page px (860), bg, h (auto), name ('index.html') }
   * @param o.agents  how many cursors (24)              @param o.names   their names (shown on tags while they type / drop)
   * @param o.W,o.H   frame size (1080×1350 = 4:5; 1080×1920, 1920×1080 work)
   * @param o.finale  'zoom' (zoom out to the whole page) | 'top' (scroll back to the top) | 'none'
   * @param o.intro   seconds before the first op (grows to fit the prompt) · o.hold · o.end (seconds held at the end)
   */
  constructor(o = {}) {
    Object.assign(this, {
      title: o.title || 'cursor swarm', url: o.url || 'my-site.dev', prompt: o.prompt || `build a website for ${o.title || 'my project'}`,
      W: o.W || 1080, H: o.H || 1350, fps: o.fps || 30, N: o.agents || 24, names: o.names || null,
      finale: o.finale || 'zoom', holdDur: o.hold ?? .9, endHold: o.end ?? 2.4, zoomDur: o.zoomDur ?? 2.6, zoomOpt: o.zoom, tagsOn: o.tags !== false,
      labels: { agents: 'agents', layers: 'layers', building: 'building', publishing: 'publishing', live: 'live', generating: 'generating', ...(o.labels || {}) },
    });
    const p = o.page || {};
    Object.assign(this, { PW: p.w || 860, pageBg: p.bg || '#121217', pageH0: p.h, pageName: p.name || 'index.html' });
    this.u = Math.min(this.W, this.H) / 1080;
    this.promptEnd = .45 + this.prompt.length / 34;
    this.introDur = Math.max(o.intro ?? 3.4, this.promptEnd + 2.1);
    this.ops = []; this.sections = []; this.rules = []; this.t = this.introDur;
  }

  // ── authoring ──
  _op(kind, id, o, dur, next) {
    if (id && typeof id === 'object') { o = id; id = o.id; }
    id = id || `${kind}${this.ops.length + 1}`;
    if (this.ops.some(p => p.id === id)) throw new Error(`duplicate id "${id}"`);
    let at = o.at ?? this.t;
    if (o.after) { const a = this.get(o.after); at = a.start + a.dur + (o.delay ?? 0); }
    if (o.with) { const a = this.get(o.with); at = a.start + (o.delay ?? 0); }
    const op = { ...o, kind, id, start: at, dur: o.dur ?? dur, i: this.ops.length, sec: Math.max(0, this.sections.length - 1) };
    this.ops.push(op); this.t = at + (o.next ?? next); return op;
  }
  get(id) { const o = this.ops.find(p => p.id === id); if (!o) throw new Error(`no op "${id}"`); return o; }
  /** start a named section (used for checks, the step list and sound cues). o.scroll = a page y the camera must reach */
  section(name, o = {}) { this.sections.push({ name, t: this.t, scroll: o.scroll }); return this; }
  wait(s) { this.t += s; return this; }
  /** wait until everything queued so far is finished (+ extra seconds) */
  sync(extra = 0) { this.t = Math.max(this.t, ...this.ops.map(o => o.start + o.dur)) + extra; return this; }
  /** a box: drag-to-draw, then it fills. fill: colour | { stops: [...], angle } · r · line (border) · lw · shadow · alpha */
  rect(id, o) { if (typeof id === 'object') [o, id] = [id, id.id]; const dd = clamp(.32 + Math.sqrt(o.w * o.h) / 1500, .38, .95); return this._op('rect', id, { dd, ...o }, .12 + dd + .5, .32); }
  /** text, typed in. w = wrap width (or the box for align centre/right) · font sans|serif|mono|hand|kr|pixel · size · weight
   *  · italic · color · lh (line height × size, 1.3) · align · track (letter spacing × size) · cps (characters a second) */
  text(id, o) {
    if (typeof id === 'object') [o, id] = [id, id.id];
    const n = Array.from(String(o.text).replace(/\n/g, '')).length, cps = o.cps || (o.size >= 30 ? 15 : o.size >= 20 ? 26 : 46);
    return this._op('text', id, { cps, ...o }, .3 + n / cps + .35, .3);
  }
  /** an image dropped in: an agent fetches a file card from off-screen and drops it; the picture resolves from blocks.
   *  art: a name from ART (or defineArt) · args · r · reveal 'mosaic' | 'scan' | 'fade' · file (the card's file name) */
  image(id, o) { if (typeof id === 'object') [o, id] = [id, id.id]; return this._op('image', id, { reveal: 'mosaic', ...o }, 1.75, .45); }
  /** the swarm paints an art pixel by pixel. px = pixel size in page px (10) · by = how many agents (all) */
  paint(id, o) { if (typeof id === 'object') [o, id] = [id, id.id]; const d = o.dur ?? 3.2; return this._op('paint', id, { px: 10, ...o }, d, d * .85); }
  /** the swarm fills a grid of cells. cols, rows, cell, gap, r · color(i, j, R) → colour or null · or values + ramp · empty (slot colour) */
  cells(id, o) { if (typeof id === 'object') [o, id] = [id, id.id]; const d = o.dur ?? 2.6; return this._op('cells', id, { gap: 3, r: 2, ...o }, d, d * .85); }
  /** a row of pills placed one by one (wraps inside w). items: ['text' | { text, dot, bg, fg }] · font · size · h · pad · gap · bg · fg · line · dot */
  chips(id, o) { if (typeof id === 'object') [o, id] = [id, id.id]; const n = o.items.length, st = o.stagger ?? .17; return this._op('chips', id, { stagger: st, ...o }, (n - 1) * st + .7, .45); }
  /** a straight line drawn from (x1, y1) to (x2, y2). color · width · dash */
  line(id, o) { if (typeof id === 'object') [o, id] = [id, id.id]; return this._op('line', id, o, .6, .2); }
  /** a button: a box, then its label. label · fill · color · r · font · size · weight · line */
  button(id, o) {
    if (typeof id === 'object') [o, id] = [id, id.id];
    const { label, color, font = 'sans', size = 16, weight = 600, ...box } = o;
    const r = this.rect(id + '-box', { ...box, r: o.r ?? o.h / 2 });
    return this.text(id, { x: o.x, y: o.y + (o.h - size * 1.3) / 2, w: o.w, align: 'center', text: label, color, font, size, weight, with: r.id, delay: r.dur * .75, next: o.next ?? .3 });
  }
  /** a rule check.mjs tests at every sampled t: fn(t) → true when fine */
  check(name, fn) { this.rules.push({ name, fn }); }

  // ── geometry ──
  _geom() {
    const u = this.u;
    this.RH = Math.round(26 * u); this.RW = Math.round(26 * u);
    this.VT = this.RH; this.VB = this.H - Math.round(108 * u); this.VHs = this.VB - this.VT;
    this.z0 = this.zoomOpt ?? Math.min((this.W - 2 * 76 * u) / this.PW, 1.3 * u * (this.W > this.H ? 1 : 1.2));
    this.VHp = this.VHs / this.z0; this.camMin = -48 * u / this.z0;
    this.hud = { x: this.W / 2, y: this.H - 52 * u, h: 42 * u };
  }
  ox(z) { return (this.W - this.PW * z) / 2; }
  toScreen(p, cam) { return [this.ox(cam.z) + p[0] * cam.z, this.VT + (p[1] - cam.y) * cam.z]; }
  toPage(s, cam) { return [(s[0] - this.ox(cam.z)) / cam.z, cam.y + (s[1] - this.VT) / cam.z]; }

  // ── build: measure, schedule agents, camera ──
  _build(g) {
    this._geom();
    const R = rng('layout:' + this.title);
    for (const op of this.ops) this._measure(g, op);
    this.pageH = this.pageH0 || Math.ceil(Math.max(400, ...this.ops.map(o => o.box[3])) + 56);
    this._schedule();
    this._camera();
    this._paths();
    this.events.sort((a, b) => a.t - b.t);
  }

  _measure(g, op) {
    if (op.kind === 'rect') op.box = [op.x, op.y, op.x + op.w, op.y + op.h];
    else if (op.kind === 'text') {
      const st = op.st = { font: op.font || 'sans', size: op.size || 16, weight: op.weight, italic: op.italic, track: op.track };
      op.lhp = (op.lh || (op.font === 'pixel' ? 1.5 : 1.32)) * st.size;
      op.lines = op.font === 'pixel' ? String(op.text).toUpperCase().split('\n') : wrap(g, op.text, st, op.w);
      op.lw = op.lines.map(l => measure(g, l, st));
      op.pre = op.lines.map(l => { const cs = Array.from(l), a = [0]; for (let k = 1; k <= cs.length; k++) a.push(measure(g, cs.slice(0, k).join(''), st)); return a; });
      op.nChars = op.lines.reduce((s, l) => s + Array.from(l).length, 0);
      op.bw = op.w || Math.max(...op.lw); op.bh = op.lines.length * op.lhp;
      op.box = [op.x, op.y, op.x + op.bw, op.y + op.bh];
      op.lx = op.lines.map((l, i) => op.x + (op.align === 'center' ? (op.bw - op.lw[i]) / 2 : op.align === 'right' ? op.bw - op.lw[i] : 0));
    } else if (op.kind === 'image' || op.kind === 'paint') op.box = [op.x, op.y, op.x + op.w, op.y + op.h];
    else if (op.kind === 'cells') { op.cw = op.cols * (op.cell + op.gap) - op.gap; op.ch = op.rows * (op.cell + op.gap) - op.gap; op.box = [op.x, op.y, op.x + op.cw, op.y + op.ch]; }
    else if (op.kind === 'chips') {
      const st = op.st = { font: op.font || 'sans', size: op.size || 14, weight: op.weight || 600 };
      const h = op.h || Math.round(st.size * 2.1), pad = op.pad ?? st.size * .9, gap = op.gap ?? 8, W = op.w || this.PW - op.x;
      let x = op.x, y = op.y; op.items = op.items.map(it => typeof it === 'string' ? { text: it } : it);
      op.chips = op.items.map(it => {
        const dot = it.dot ?? op.dot, w = measure(g, it.text, st) + pad * 2 + (dot ? st.size * .9 : 0);
        if (x + w > op.x + W && x > op.x) { x = op.x; y += h + gap; }
        const c = { ...it, x, y, w, h, dot }; x += w + gap; return c;
      });
      op.box = [op.x, op.y, Math.max(...op.chips.map(c => c.x + c.w)), y + h];
    } else if (op.kind === 'line') { const w = (op.width || 2) / 2; op.box = [Math.min(op.x1, op.x2) - w, Math.min(op.y1, op.y2) - w, Math.max(op.x1, op.x2) + w, Math.max(op.y1, op.y2) + w]; }
    op.x0 = op.box[0]; op.y0 = op.box[1]; op.x1 = op.box[2]; op.y1 = op.box[3];
  }

  /** every op becomes jobs; each job goes to the nearest agent that can get there in time */
  _schedule() {
    const N = this.N, cam0 = { y: this.camMin, z: this.z0 };
    this.events = []; this.clicks = [];
    const hudP = this.toPage([this.hud.x, this.hud.y], cam0), R = rng('spawn:' + this.title);
    this.agents = Array.from({ length: N }, (_, a) => {
      const ang = R() * Math.PI * 2, rad = (.25 + R() * .75) * Math.min(this.PW * .32, this.VHp * .26);
      const rest = [this.PW / 2 + Math.cos(ang) * rad * 1.25, this.camMin + this.VHp * .42 + Math.sin(ang) * rad];
      const spawn = this.introDur - 1.05 + a * (.6 / N);
      this.events.push({ t: spawn, k: 'spawn', a });
      return { i: a, color: AGENT_COLORS[a % AGENT_COLORS.length], name: this.names ? this.names[a % this.names.length] : `agent-${String(a + 1).padStart(2, '0')}`,
        spawn, hudP, rest, freeAt: spawn + .75, pos: rest, jobs: [], seed: hash('agent' + a) };
    });
    const travel = d => clamp(.3 + d / 1500, .32, 1.05), dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const assign = (job) => {
      let best = null, bestCost = Infinity;
      for (const ag of this.agents) { const d = dist(ag.pos, job.from); if (ag.freeAt + travel(d) <= job.t0 && d < bestCost) { best = ag; bestCost = d; } }
      if (!best) for (const ag of this.agents) { const c = ag.freeAt + travel(dist(ag.pos, job.from)); if (c < bestCost) { best = ag; bestCost = c; } }
      const ready = best.freeAt + travel(dist(best.pos, job.from));
      job.delay = Math.max(0, ready - job.t0); job.t0 += job.delay; job.t1 += job.delay; job.agent = best;
      best.jobs.push(job); best.freeAt = job.t1; best.pos = job.to; return job;
    };
    const ops = [...this.ops].sort((a, b) => a.start - b.start || a.i - b.i);
    for (const op of ops) {
      op.jobs = [];
      if (op.kind === 'rect') op.jobs.push(assign({ op, t0: op.start, t1: op.start + op.dur, from: [op.x, op.y], to: [op.x + op.w + 6, op.y + op.h + 8] }));
      else if (op.kind === 'text') {
        const L = op.lines.length - 1; op.jobs.push(assign({ op, t0: op.start, t1: op.start + op.dur, from: [op.lx[0] - 3, op.y + op.lhp / 2], to: [op.lx[L] + op.lw[L] + 4, op.y + L * op.lhp + op.lhp / 2], beam: true }));
      } else if (op.kind === 'image') {
        const side = op.from === 'right' ? 1 : -1, sx = side < 0 ? (-60 * this.u - this.ox(this.z0)) / this.z0 : (this.W + 60 * this.u - this.ox(this.z0)) / this.z0;
        op.src = [sx, clamp(op.y + op.h * .5, op.y, op.y + op.h)];
        op.jobs.push(assign({ op, t0: op.start, t1: op.start + op.dur, from: op.src, to: [op.x + op.w * .9, op.y + op.h * .9] }));
      } else if (op.kind === 'line') op.jobs.push(assign({ op, t0: op.start, t1: op.start + op.dur, from: [op.x1, op.y1], to: [op.x2, op.y2] }));
      else if (op.kind === 'chips') op.chips.forEach((c, i) => { const t0 = op.start + i * op.stagger; c.job = assign({ op, t0, t1: t0 + .55, from: [c.x + c.w * .5, c.y + c.h * .55], to: [c.x + c.w * .7, c.y + c.h + 6], chip: c }); op.jobs.push(c.job); });
      else if (op.kind === 'paint' || op.kind === 'cells') this._swarm(op, assign, travel, dist);
      op.s = Math.min(...op.jobs.map(j => j.t0)); op.e = Math.max(...op.jobs.map(j => j.t1)); op.delay = Math.max(...op.jobs.map(j => j.delay));
    }
    this.F0 = Math.max(...this.ops.map(o => o.e)) + this.holdDur;
    this.Z0 = this.F0 + .75;
    this.dur = this.finale === 'none' ? this.F0 + this.endHold : this.Z0 + this.zoomDur + this.endHold;
  }

  /** paint / cells: the grid is cut into tiles, one tile per free agent; each agent hops its tile cell by cell */
  _swarm(op, assign, travel, dist) {
    let cells = [];
    if (op.kind === 'paint') {
      const cols = Math.floor(op.w / op.px), rows = Math.floor(op.h / op.px);
      const src = renderArt(op.art, op.args, op.w, op.h, 1, hash(op.id)), d = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const sx = Math.min(src.width - 1, Math.floor((i + .5) * op.px)), sy = Math.min(src.height - 1, Math.floor((j + .5) * op.px)), k = (sy * src.width + sx) * 4;
        if (d[k + 3] < 40) continue;
        cells.push({ i, j, x: op.x + i * op.px, y: op.y + j * op.px, s: op.px, rgb: [d[k], d[k + 1], d[k + 2]] });
      }
      op.cols = cols; op.rows = rows;
    } else {
      const R = rng(op.id), ramp = op.ramp || ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
      for (let j = 0; j < op.rows; j++) for (let i = 0; i < op.cols; i++) {
        let c = null;
        if (op.color) c = op.color(i, j, R);
        else if (op.values) { const v = Array.isArray(op.values[0]) ? op.values[j]?.[i] : op.values[j * op.cols + i]; if (v != null) c = ramp[Math.min(ramp.length - 1, Math.floor(clamp(v) * (ramp.length - 1) + .5))]; }
        if (!c) continue;
        cells.push({ i, j, x: op.x + i * (op.cell + op.gap), y: op.y + j * (op.cell + op.gap), s: op.cell, rgb: rgbOf(c) });
      }
    }
    for (const c of cells) c.col = `rgb(${c.rgb.join(',')})`;
    op.cellList = cells;
    // how many agents can be there in time?
    const want = Math.min(op.by || this.N, this.N, Math.max(1, cells.length));
    const mid = [(op.x0 + op.x1) / 2, (op.y0 + op.y1) / 2];
    const free = this.agents.filter(a => a.freeAt + travel(dist(a.pos, mid)) <= op.start + .25).length;
    const k = clamp(free, Math.min(want, 4), want);
    // tiles: a grid of tc × tr roughly-square tiles
    const C = op.cols, Rw = op.rows, tc = clamp(Math.round(Math.sqrt(k * C / Rw)), 1, k), tr = Math.max(1, Math.floor(k / tc));
    const tiles = Array.from({ length: tc * tr }, () => []);
    for (const c of cells) tiles[Math.min(tr - 1, Math.floor(c.j / Rw * tr)) * tc + Math.min(tc - 1, Math.floor(c.i / C * tc))].push(c);
    const used = tiles.filter(t => t.length);
    used.forEach((tile, ti) => {
      tile.sort((a, b) => a.j - b.j || ((a.j % 2) ? b.i - a.i : a.i - b.i)); // serpentine
      const t0 = op.start + (ti % 5) * .05, t1 = op.start + op.dur, dt = (t1 - t0 - .15) / tile.length;
      tile.forEach((c, n) => { c.ta = t0 + .1 + n * dt; });
      const first = tile[0], last = tile[tile.length - 1];
      const job = assign({ op, t0, t1, from: [first.x + first.s / 2, first.y + first.s / 2], to: [last.x + last.s / 2 + 8, last.y + last.s / 2 + 10], tile, dt });
      const shift = job.t0 - t0; if (shift) tile.forEach(c => { c.ta += shift; });
      tile.forEach(c => { c.agent = job.agent; });
      op.jobs.push(job);
    });
  }

  /** the camera follows the newest work (it only moves down), then the finale */
  _camera() {
    const hz = 60, T = this.Z0, n = Math.ceil(T * hz) + 2, ys = new Float32Array(n), bg = new Float32Array(n);
    const maxY = Math.max(this.camMin, this.pageH + 36 - this.VHp);
    const foc = this.ops.map(o => ({ t: o.s - .75, f: Math.min(o.y1 + 54 - this.VHp, o.y0 - 70), b: o.y1 + 28, s: o.s }));
    const floors = this.sections.filter(s => s.scroll != null).map(s => ({ t: s.t, f: s.scroll }));
    let y1 = this.camMin, y2 = this.camMin, b1 = 0;
    for (let i = 0; i < n; i++) {
      const t = i / hz; let tgt = this.camMin, bt = 0;
      for (const f of foc) { if (f.t <= t && f.f > tgt) tgt = f.f; if (f.s <= t && f.b > bt) bt = f.b; }
      for (const f of floors) if (f.t <= t && f.f > tgt) tgt = f.f;
      tgt = clamp(tgt, this.camMin, maxY);
      const k = 1 - Math.exp(-3.1 / hz); y1 += (tgt - y1) * k; y2 += (y1 - y2) * k; ys[i] = y2;
      b1 += (Math.min(this.pageH, bt) - b1) * (1 - Math.exp(-5 / hz)); bg[i] = b1;
    }
    this._cy = ys; this._bg = bg; this._hz = hz;
  }
  cam(t) {
    const hz = this._hz, at = a => { const i = clamp(t * hz, 0, a.length - 1), i0 = Math.floor(i), i1 = Math.min(a.length - 1, i0 + 1); return lerp(a[i0], a[i1], i - i0); };
    if (t <= this.Z0 || this.finale === 'none') return { y: at(this._cy), z: this.z0 };
    const y0 = this._cy[this._cy.length - 1], k = easeInOut((t - this.Z0) / this.zoomDur);
    if (this.finale === 'top') return { y: lerp(y0, this.camMin, k), z: this.z0 };
    const zf = Math.min(this.z0, this.VHs / (this.pageH + 110 * this.u)), z = Math.exp(lerp(Math.log(this.z0), Math.log(zf), k));
    const c0 = y0 + this.VHs / (2 * this.z0), c = lerp(c0, this.pageH / 2, k);
    return { y: c - this.VHs / (2 * z), z };
  }
  bgBottom(t) { if (t > this.F0) return lerp(this._bg[this._bg.length - 1], this.pageH, smooth(this.F0, this.F0 + .6, t)); const i = clamp(Math.round(t * this._hz), 0, this._bg.length - 1); return this._bg[i]; }

  /** per agent: spawn → (idle → travel → job)* → idle → into the HUD */
  _paths() {
    for (const ag of this.agents) {
      ag.jobs.sort((a, b) => a.t0 - b.t0);
      const segs = []; let prevEnd = ag.spawn + .75, anchor = ag.rest;
      for (const job of ag.jobs) {
        const d = Math.hypot(anchor[0] - job.from[0], anchor[1] - job.from[1]), tr = clamp(.3 + d / 1500, .32, 1.05);
        const td = Math.max(prevEnd, job.t0 - tr);
        segs.push({ k: 'idle', t0: prevEnd, t1: td, p: anchor });
        segs.push({ k: 'trip', t0: td, t1: job.t0, a: anchor, b: job.from, seed: hash(ag.i + ':' + job.t0.toFixed(3)) });
        segs.push({ k: 'job', t0: job.t0, t1: job.t1, job });
        prevEnd = job.t1; anchor = job.to;
      }
      ag.fin = this.F0 + ag.i * (.55 / this.N);
      segs.push({ k: 'idle', t0: prevEnd, t1: Math.max(prevEnd, ag.fin), p: anchor });
      ag.segs = segs;
    }
  }
  _clampView(p, t) {
    const c = this.cam(t), z = c.z, top = c.y + 26 / z, bot = c.y + (this.VHs - 70 * this.u) / z;
    const left = -this.ox(z) / z + 34 * this.u / z, right = (this.W - this.ox(z)) / z - 40 * this.u / z;
    return [clamp(p[0], left, right), clamp(p[1], top, bot)];
  }
  /** where agent `ag` is at t: { x, y (screen px), mode: 'arrow'|'beam'|'grab', a (alpha), job } or null */
  agentAt(ag, t) {
    if (t < ag.spawn) return null;
    const c = this.cam(Math.min(t, this.F0)), scr = p => this.toScreen(p, c);
    if (t < ag.spawn + .75) { // burst out of the HUD
      const k = easeOut((t - ag.spawn) / .75), h = [this.hud.x, this.hud.y], r = this.toScreen(ag.rest, { y: this.camMin, z: this.z0 });
      const mid = [lerp(h[0], r[0], .5) + (r[0] - h[0]) * .25, Math.min(h[1], r[1]) - 60 * this.u];
      const q = (a, b, cc) => (1 - k) * (1 - k) * a + 2 * (1 - k) * k * cc + k * k * b;
      return { x: q(h[0], r[0], mid[0]), y: q(h[1], r[1], mid[1]), mode: 'arrow', a: smooth(0, .15, k) };
    }
    if (t >= ag.fin) { // into the HUD
      const p0 = this._posPage(ag, ag.fin), s0 = this.toScreen(p0.p, this.cam(ag.fin)), k = easeIn((t - ag.fin) / .6);
      if (k >= 1) return null;
      return { x: lerp(s0[0], this.hud.x, k), y: lerp(s0[1], this.hud.y, k), mode: 'arrow', a: 1 - smooth(.6, 1, k) };
    }
    const r = this._posPage(ag, t), s = scr(r.p);
    return { x: s[0], y: s[1], mode: r.mode, a: 1, job: r.job };
  }
  _posPage(ag, t) {
    const segs = ag.segs; let lo = 0, hi = segs.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (segs[m].t0 <= t) lo = m; else hi = m - 1; }
    const s = segs[lo];
    if (s.k === 'idle') return { p: this._idle(ag, s, t), mode: 'arrow' };
    if (s.k === 'trip') {
      const a = this._idle(ag, { ...segs[lo - 1], t1: s.t0 }, s.t0), b = s.b, k = easeInOut((t - s.t0) / Math.max(1e-3, s.t1 - s.t0));
      const R = rng(s.seed), dx = b[0] - a[0], dy = b[1] - a[1], bend = (R() - .5) * .5;
      const cx = (a[0] + b[0]) / 2 - dy * bend, cy = (a[1] + b[1]) / 2 + dx * bend;
      return { p: [(1 - k) * (1 - k) * a[0] + 2 * (1 - k) * k * cx + k * k * b[0], (1 - k) * (1 - k) * a[1] + 2 * (1 - k) * k * cy + k * k * b[1]], mode: s.b && segs[lo + 1]?.job?.op.kind === 'image' ? 'arrow' : 'arrow' };
    }
    return { ...this._jobPos(s.job, t), job: s.job };
  }
  _idle(ag, s, t) {
    const e = smooth(s.t0, s.t0 + .7, t) * (1 - smooth(s.t1 - .45, s.t1, t)), A = 12;
    const p = [s.p[0] + (n1(t * .55, ag.seed) - .5) * 2 * A * e, s.p[1] + (n1(t * .55 + 40, ag.seed) - .5) * 2 * A * e];
    return this._clampView(p, t);
  }
  _jobPos(job, t) {
    const op = job.op;
    if (op.kind === 'rect') {
      const ds = job.t0 + .12, k = easeInOut((t - ds) / op.dd), after = smooth(ds + op.dd + .05, ds + op.dd + .45, t);
      return { p: [op.x + op.w * k + 6 * after, op.y + op.h * k + 8 * after], mode: 'arrow' };
    }
    if (op.kind === 'text') { const c = this._caret(op, t); return { p: [c[0] + 2, c[1]], mode: 'beam' }; }
    if (op.kind === 'image') {
      const carry = .7, k = easeInOut((t - job.t0) / carry), tgt = [op.x + op.w * .5, op.y + op.h * .5];
      if (t < job.t0 + carry) return { p: [lerp(op.src[0], tgt[0], k), lerp(op.src[1], tgt[1], k) - Math.sin(k * Math.PI) * 40], mode: 'grab' };
      const a = smooth(job.t0 + carry + .1, job.t0 + carry + .6, t);
      return { p: [lerp(tgt[0], job.to[0], a), lerp(tgt[1], job.to[1], a)], mode: 'arrow' };
    }
    if (op.kind === 'line') { const k = easeInOut((t - job.t0 - .08) / (op.dur * .8)); return { p: [lerp(op.x1, op.x2, k), lerp(op.y1, op.y2, k)], mode: 'arrow' }; }
    if (op.kind === 'chips') { const c = job.chip, k = smooth(job.t0 + .2, job.t0 + .55, t); return { p: [lerp(c.x + c.w * .5, job.to[0], k), lerp(c.y + c.h * .55, job.to[1], k)], mode: 'arrow' }; }
    // paint / cells: hop from cell to cell, arriving at each one's time
    const tile = job.tile; let n = 0, lo = 0, hi = tile.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (tile[m].ta <= t) lo = m; else hi = m - 1; } n = lo;
    const cc = c => [c.x + c.s * .5, c.y + c.s * .5];
    if (t < tile[0].ta) return { p: cc(tile[0]), mode: 'arrow' };
    if (n >= tile.length - 1) { const k = smooth(tile[n].ta, tile[n].ta + .4, t), a = cc(tile[n]); return { p: [lerp(a[0], job.to[0], k), lerp(a[1], job.to[1], k)], mode: 'arrow' }; }
    const a = cc(tile[n]), b = cc(tile[n + 1]), k = smooth(tile[n].ta + job.dt * .35, tile[n + 1].ta, t);
    return { p: [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], mode: 'arrow' };
  }
  _typed(op, t) { return clamp(Math.floor((t - op.s - .3) * op.cps), 0, op.nChars); }
  _caret(op, t) {
    let n = this._typed(op, t), li = 0;
    while (li < op.lines.length - 1 && n > Array.from(op.lines[li]).length) { n -= Array.from(op.lines[li]).length; li++; }
    n = Math.min(n, op.pre[li].length - 1);
    return [op.lx[li] + op.pre[li][n], op.y + li * op.lhp + op.lhp / 2];
  }

  // ── drawing ──
  draw(t, sc = 1) {
    const g = this.ctx, W = this.W, H = this.H, u = this.u, c = this.cam(t), z = c.z, ox = this.ox(z);
    g.setTransform(sc, 0, 0, sc, 0, 0); g.globalAlpha = 1;
    g.fillStyle = ED.bg; g.fillRect(0, 0, W, H);
    // dot grid in page space (it scrolls with the page)
    const step = 24 * z; if (step > 9) {
      g.fillStyle = ED.dot; const y0 = this.VT + ((-c.y * z) % step + step) % step, x0 = (ox % step + step) % step;
      for (let y = y0; y < H; y += step) for (let x = x0; x < W; x += step) g.fillRect(x - .9, y - .9, 1.8, 1.8);
    }
    const P = () => g.setTransform(sc * z, 0, 0, sc * z, sc * ox, sc * (this.VT - c.y * z));
    P();
    // the artboard: label, outline, shadow, and the page background revealed as the build grows
    const a0 = .35 + .65 * smooth(.1, .8, t), fin = smooth(this.F0, this.F0 + .5, t);
    g.save(); g.globalAlpha = a0;
    setFont(g, { font: 'mono', size: 11 * u / z, weight: 500 }); g.fillStyle = ED.frameText; g.textBaseline = 'bottom';
    g.fillText(`▢ ${this.pageName}`, 0, -9 * u / z);
    g.textAlign = 'right'; g.fillText(`${this.PW} × ${Math.round(t > this.F0 ? this.pageH : Math.max(0, this.bgBottom(t)))}`, this.PW, -9 * u / z); g.textAlign = 'left';
    g.setLineDash([5 / z, 5 / z]); g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1 / z; g.strokeRect(0, 0, this.PW, this.pageH); g.setLineDash([]);
    g.restore();
    const bb = this.bgBottom(t);
    if (bb > 1) {
      g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 40 * z * sc * fin; g.fillStyle = this.pageBg; g.fillRect(0, 0, this.PW, bb); g.restore();
    }
    // the page content, in definition order
    g.save(); g.beginPath(); g.rect(-2, -2, this.PW + 4, this.pageH + 4); g.clip();
    for (const op of this.ops) if (t >= op.s) this._drawOp(g, op, t, z, sc);
    g.restore();
    // editor overlays: selections, size tags, guides, click marks
    const over = 1 - fin;
    if (over > 0) { g.save(); g.globalAlpha = over; for (const op of this.ops) if (t >= op.s && t <= op.e + .8) this._overlay(g, op, t, c); this._marks(g, t, z); g.restore(); }
    // screen space: rulers, tool rail, agents, HUD
    g.setTransform(sc, 0, 0, sc, 0, 0);
    this._rulers(g, t, c);
    this._rail(g, t);
    for (const ag of this.agents) { const p = this.agentAt(ag, t); if (p) this._cursor(g, ag, p, t); }
    this._hud(g, t);
  }

  _drawOp(g, op, t, z, sc) {
    const k = op.kind;
    if (k === 'rect') {
      const fs = op.s + .12 + op.dd, a = easeOut((t - fs) / .42); if (a <= 0) return;
      g.save(); g.globalAlpha = a * (op.alpha ?? 1);
      if (op.shadow) { g.shadowColor = typeof op.shadow === 'string' ? op.shadow : 'rgba(0,0,0,.16)'; g.shadowBlur = 22 * z * sc; g.shadowOffsetY = 8 * z * sc; }
      rrect(g, op.x, op.y, op.w, op.h, op.r || 0);
      if (op.fill) { g.fillStyle = this._fill(g, op.fill, op); g.fill(); }
      g.shadowColor = 'transparent';
      if (op.line) { g.strokeStyle = op.line; g.lineWidth = op.lw || 1; g.stroke(); }
      g.restore();
    } else if (k === 'text') {
      let n = this._typed(op, t); if (!n) return;
      g.save(); g.fillStyle = op.color || '#111'; g.textBaseline = 'alphabetic'; if (op.font !== 'pixel') setFont(g, op.st);
      for (let i = 0; i < op.lines.length && n > 0; i++) {
        const cs = Array.from(op.lines[i]), s = cs.slice(0, n).join(''); n -= cs.length;
        if (op.font === 'pixel') pixelText(g, s, op.lx[i], op.y + i * op.lhp + (op.lhp - op.st.size) / 2, op.st.size / 7, op.color || '#111');
        else g.fillText(s, op.lx[i], op.y + i * op.lhp + op.lhp / 2 + op.st.size * .35);
      }
      // caret while typing and just after
      const typing = t < op.s + .3 + op.nChars / op.cps + .5;
      if (typing && ((t * 2.4) % 1 < .62 || t < op.s + .3 + op.nChars / op.cps)) {
        const cp = this._caret(op, t), ag = op.jobs[0].agent; g.fillStyle = ag.color;
        g.fillRect(cp[0] + 1, cp[1] - op.st.size * .55, Math.max(1.5 / z, op.st.size * .06), op.st.size * 1.1);
      }
      g.restore();
    } else if (k === 'image') {
      const drop = op.s + .7; if (t < drop) return;
      const art = this._art(op, z * sc), rk = easeOut((t - drop) / .95);
      g.save(); rrect(g, op.x, op.y, op.w, op.h, op.r || 0); g.clip();
      if (op.reveal === 'fade') { g.globalAlpha = rk; g.drawImage(art, op.x, op.y, op.w, op.h); }
      else if (op.reveal === 'scan') { const y = op.y + op.h * rk; g.drawImage(art, 0, 0, art.width, art.height * rk, op.x, op.y, op.w, op.h * rk); if (rk < 1) { g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(op.x, y - 1.5 / z, op.w, 3 / z); } }
      else {
        const levels = [36, 28, 20, 14, 10, 7, 5, 3.5, 2.4, 1.6, 1], bs = levels[Math.min(levels.length - 1, Math.floor(rk * levels.length))];
        if (bs <= 1) g.drawImage(art, op.x, op.y, op.w, op.h);
        else {
          const tw = Math.max(1, Math.round(op.w / bs)), th = Math.max(1, Math.round(op.h / bs)), tmp = this._tmp || (this._tmp = document.createElement('canvas'));
          tmp.width = tw; tmp.height = th; const tg = tmp.getContext('2d'); tg.imageSmoothingEnabled = true; tg.drawImage(art, 0, 0, tw, th);
          g.imageSmoothingEnabled = false; g.drawImage(tmp, op.x, op.y, op.w, op.h); g.imageSmoothingEnabled = true;
        }
      }
      const fl = 1 - smooth(drop, drop + .25, t); if (fl > 0) { g.fillStyle = alpha(ED.sel, .28 * fl); g.fillRect(op.x, op.y, op.w, op.h); }
      g.restore();
    } else if (k === 'paint' || k === 'cells') {
      if (k === 'cells' && op.empty) { g.fillStyle = op.empty; g.globalAlpha = smooth(op.s, op.s + .4, t); for (let j = 0; j < op.rows; j++) for (let i = 0; i < op.cols; i++) { rrect(g, op.x + i * (op.cell + op.gap), op.y + j * (op.cell + op.gap), op.cell, op.cell, op.r); g.fill(); } g.globalAlpha = 1; }
      const round = k === 'cells' && op.r > 0, gap = k === 'paint' ? (op.inset || 0) : 0;
      for (const cl of op.cellList) {
        if (t < cl.ta) continue;
        const q = (t - cl.ta) / .5;
        let s = cl.s - gap * 2, x = cl.x + gap, y = cl.y + gap;
        if (q < 1) { const m = .35 + .65 * easeOutBack(Math.min(1, q * 2.2)); x += s * (1 - m) / 2; y += s * (1 - m) / 2; s *= m; g.fillStyle = mix(cl.agent.color, cl.rgb, easeOut(q)); }
        else g.fillStyle = cl.col;
        if (round) { rrect(g, x, y, s, s, op.r); g.fill(); } else g.fillRect(x, y, s + .25, s + .25);
      }
    } else if (k === 'chips') {
      for (const c of op.chips) {
        const ta = c.job.t0 + .14; if (t < ta) continue;
        const m = easeOutBack((t - ta) / .38), st = op.st; g.save();
        g.translate(c.x + c.w / 2, c.y + c.h / 2); g.scale(m, m); g.translate(-c.w / 2, -c.h / 2);
        rrect(g, 0, 0, c.w, c.h, op.r ?? c.h / 2); g.fillStyle = c.bg || op.bg || '#f1f1f4'; g.fill();
        if (c.line || op.line) { g.strokeStyle = c.line || op.line; g.lineWidth = 1; g.stroke(); }
        const pad = op.pad ?? st.size * .9; let tx = pad;
        if (c.dot) { g.fillStyle = typeof c.dot === 'string' ? c.dot : (c.fg || op.fg || '#333'); g.beginPath(); g.arc(pad + st.size * .25, c.h / 2, st.size * .26, 0, 7); g.fill(); tx += st.size * .9; }
        setFont(g, st); g.fillStyle = c.fg || op.fg || '#222'; g.textBaseline = 'alphabetic'; g.fillText(c.text, tx, c.h / 2 + st.size * .35);
        g.restore();
      }
    } else if (k === 'line') {
      const q = easeInOut((t - op.s - .08) / (op.dur * .8)); if (q <= 0) return;
      g.save(); g.strokeStyle = op.color || '#222'; g.lineWidth = op.width || 2; g.lineCap = 'round'; if (op.dash) g.setLineDash(op.dash);
      g.beginPath(); g.moveTo(op.x1, op.y1); g.lineTo(lerp(op.x1, op.x2, q), lerp(op.y1, op.y2, q)); g.stroke(); g.restore();
    }
  }
  _fill(g, f, op) {
    if (typeof f === 'string') return f;
    const ang = (f.angle ?? 90) * Math.PI / 180, cx = op.x + op.w / 2, cy = op.y + op.h / 2, L = Math.abs(op.w * Math.cos(ang)) / 2 + Math.abs(op.h * Math.sin(ang)) / 2;
    const gr = g.createLinearGradient(cx - Math.cos(ang) * L, cy - Math.sin(ang) * L, cx + Math.cos(ang) * L, cy + Math.sin(ang) * L);
    f.stops.forEach((c, i) => gr.addColorStop(i / (f.stops.length - 1), c)); return gr;
  }
  _art(op, res) {
    const r = Math.max(.5, Math.ceil(Math.min(3, res) * 4) / 4), key = op.id + '@' + r;
    this._arts = this._arts || new Map();
    if (!this._arts.has(key)) this._arts.set(key, renderArt(op.art, op.args, op.w, op.h, r, hash(op.id)));
    return this._arts.get(key);
  }

  _overlay(g, op, t, c) {
    const z = c.z, u = this.u, lw = 1.5 / z;
    const frame = (x, y, w, h, a, handles = true, tag = null) => {
      if (a <= 0) return; g.save(); g.globalAlpha *= a; g.strokeStyle = ED.sel; g.lineWidth = lw; g.strokeRect(x, y, w, h);
      if (handles) { const s = 6.5 / z; g.fillStyle = '#fff'; for (const [hx, hy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) { g.fillRect(hx - s / 2, hy - s / 2, s, s); g.strokeRect(hx - s / 2, hy - s / 2, s, s); } }
      if (tag) this._sizeTag(g, tag, x + w / 2, y + h + 9 / z, z);
      g.restore();
    };
    if (op.kind === 'rect') {
      const ds = op.s + .12, de = ds + op.dd, q = easeInOut((t - ds) / op.dd); if (t < ds) return;
      const w = op.w * q, h = op.h * q, a = 1 - smooth(de + .35, de + .7, t);
      if (t < de) { g.fillStyle = ED.selSoft; g.fillRect(op.x, op.y, w, h); }
      frame(op.x, op.y, w, h, a, true, `${Math.round(w)} × ${Math.round(h)}`);
      this._guides(g, op.x0, op.y0, op.x1, op.y1, t, de, c);
    } else if (op.kind === 'text') {
      const a = smooth(op.s + .15, op.s + .3, t) * (1 - smooth(op.e - .1, op.e + .3, t));
      frame(op.x - 4, op.y - 2, op.bw + 8, op.bh + 4, a * .9, false);
    } else if (op.kind === 'image') {
      const drop = op.s + .7, a = smooth(drop - .05, drop + .05, t) * (1 - smooth(drop + .9, drop + 1.25, t));
      frame(op.x, op.y, op.w, op.h, a, true, `${Math.round(op.w)} × ${Math.round(op.h)}`);
      this._guides(g, op.x0, op.y0, op.x1, op.y1, t, drop, c);
    } else if (op.kind === 'paint' || op.kind === 'cells') {
      const a = smooth(op.s, op.s + .25, t) * (1 - smooth(op.e, op.e + .45, t));
      frame(op.x0 - 3 / z, op.y0 - 3 / z, op.x1 - op.x0 + 6 / z, op.y1 - op.y0 + 6 / z, a, true, op.kind === 'paint' ? `${op.cols} × ${op.rows} px` : `${op.cols} × ${op.rows}`);
    } else if (op.kind === 'chips') {
      for (const ch of op.chips) { const ta = ch.job.t0 + .14, a = smooth(ta - .05, ta, t) * (1 - smooth(ta + .3, ta + .6, t)); frame(ch.x - 2 / z, ch.y - 2 / z, ch.w + 4 / z, ch.h + 4 / z, a, false); }
    }
  }
  _guides(g, x0, y0, x1, y1, t, at, c) {
    const a = smooth(at - .25, at - .05, t) * (1 - smooth(at + .2, at + .55, t)); if (a <= 0) return;
    const z = c.z, L = -this.ox(z) / z, Rr = (this.W - this.ox(z)) / z, T = c.y, B = c.y + this.VHs / z;
    g.save(); g.globalAlpha *= a * .85; g.strokeStyle = ED.guide; g.lineWidth = 1 / z; g.beginPath();
    for (const y of [y0, y1]) { g.moveTo(L, y); g.lineTo(Rr, y); }
    for (const x of [x0, x1]) { g.moveTo(x, T); g.lineTo(x, B); }
    g.stroke(); g.restore();
  }
  _sizeTag(g, label, x, y, z, color = ED.tag, align = 'center') {
    const st = { font: 'mono', size: 10.5 * this.u / z, weight: 600 }; setFont(g, st);
    const w = g.measureText(label).width + 10 * this.u / z, h = 16 * this.u / z, x0 = align === 'center' ? x - w / 2 : x;
    rrect(g, x0, y, w, h, 3.5 * this.u / z); g.fillStyle = color; g.fill();
    g.fillStyle = luma(color) > .6 ? '#111118' : ED.tagText; g.textBaseline = 'middle'; g.fillText(label, x0 + 5 * this.u / z, y + h / 2 + .5 / z);
  }
  _marks(g, t, z) {
    for (const m of this.clicks) {
      if (t < m.t || t > m.t + 1.7) continue;
      const a = 1 - smooth(m.t + .6, m.t + 1.7, t), s = 6.5 * this.u / z, r = lerp(3, 16, easeOut((t - m.t) / .4)) * this.u / z;
      g.save(); g.globalAlpha *= a; g.strokeStyle = m.color; g.lineWidth = 1.6 / z;
      g.beginPath(); g.moveTo(m.x - s, m.y); g.lineTo(m.x + s, m.y); g.moveTo(m.x, m.y - s); g.lineTo(m.x, m.y + s); g.stroke();
      if (t < m.t + .4) { g.globalAlpha *= 1 - (t - m.t) / .4; g.beginPath(); g.arc(m.x, m.y, r, 0, 7); g.stroke(); }
      g.restore();
    }
  }

  _rulers(g, t, c) {
    const u = this.u, z = c.z, ox = this.ox(z), RH = this.RH, RW = this.RW, W = this.W, VT = this.VT, VB = this.VB;
    const majors = [50, 100, 200, 500, 1000, 2000], major = majors.find(m => m * z >= 72 * u) || 2000, minor = major / 10 * z >= 5 * u ? major / 10 : major / 5;
    const active = this.ops.filter(o => SEL_KINDS.has(o.kind) && t >= o.s && t <= o.e + .2).pop();
    const fin = 1 - smooth(this.F0, this.F0 + .5, t);
    g.save();
    g.fillStyle = ED.ruler; g.fillRect(0, 0, W, RH); g.fillRect(0, VT, RW, this.H - VT);
    g.fillStyle = ED.rulerLine; g.fillRect(0, RH - 1, W, 1); g.fillRect(RW - 1, VT, 1, this.H - VT);
    if (active && fin > 0) {
      g.fillStyle = alpha(ED.sel, .28 * fin);
      g.fillRect(ox + active.x0 * z, 0, (active.x1 - active.x0) * z, RH - 1);
      g.fillRect(0, Math.max(VT, VT + (active.y0 - c.y) * z), RW - 1, Math.max(0, Math.min(this.H, VT + (active.y1 - c.y) * z) - Math.max(VT, VT + (active.y0 - c.y) * z)));
    }
    setFont(g, { font: 'mono', size: 9.5 * u, weight: 500 }); g.fillStyle = ED.rulerText; g.textBaseline = 'top';
    const p0 = Math.floor(-ox / z / minor) * minor, p1 = (W - ox) / z;
    for (let p = p0; p <= p1; p += minor) {
      const x = ox + p * z; if (x < RW) continue; const M = Math.abs(p % major) < 1e-6;
      g.fillStyle = M ? ED.rulerText : ED.rulerTick; g.fillRect(Math.round(x), RH - (M ? 11 : 5) * u, 1, (M ? 11 : 5) * u);
      if (M) g.fillText(String(Math.round(p)), x + 3 * u, 4 * u);
    }
    const q0 = Math.floor(c.y / minor) * minor, q1 = c.y + (this.H - VT) / z;
    for (let p = q0; p <= q1; p += minor) {
      const y = VT + (p - c.y) * z; if (y < VT) continue; const M = Math.abs(p % major) < 1e-6;
      g.fillStyle = M ? ED.rulerText : ED.rulerTick; g.fillRect(RW - (M ? 11 : 5) * u, Math.round(y), (M ? 11 : 5) * u, 1);
      if (M && y + 14 * u < this.H) { setFont(g, { font: 'mono', size: 8.5 * u, weight: 500 }); g.fillText(String(Math.round(p)), Math.round(3 * u), Math.round(y + 3 * u)); setFont(g, { font: 'mono', size: 9.5 * u, weight: 500 }); }
    }
    g.fillStyle = ED.ruler; g.fillRect(0, 0, RW, RH); g.fillStyle = ED.rulerLine; g.fillRect(RW - 1, 0, 1, RH);
    g.restore();
  }
  _rail(g, t) {
    const u = this.u, x = this.W - 24 * u, y0 = this.VT + this.VHs * .3, n = 6, s = 26 * u, a = smooth(.3, .9, t) * (1 - smooth(this.F0, this.F0 + .5, t));
    if (a <= 0) return;
    g.save(); g.globalAlpha = a; rrect(g, x - 15 * u, y0 - 6 * u, 30 * u, n * s + 12 * u, 9 * u); g.fillStyle = ED.hud; g.fill(); g.strokeStyle = ED.hudLine; g.lineWidth = 1; g.stroke();
    g.strokeStyle = ED.hudDim; g.fillStyle = ED.hudDim; g.lineWidth = 1.4 * u; g.lineJoin = 'round';
    const busy = this.ops.filter(o => t >= o.s && t <= o.e).map(o => o.kind), on = ['rect', 'text', 'image', 'line', 'paint'].map(k => busy.includes(k) || (k === 'paint' && busy.includes('cells')));
    for (let i = 0; i < n; i++) {
      const cy = y0 + i * s + s / 2, k = 5.5 * u; g.save(); g.translate(x, cy);
      if ([false, on[0], on[1], on[2], on[3], on[4]][i]) { g.strokeStyle = ED.sel; g.fillStyle = ED.sel; }
      g.beginPath();
      if (i === 0) { g.moveTo(-k * .6, -k); g.lineTo(-k * .6, k * .7); g.lineTo(-k * .1, k * .25); g.lineTo(k * .5, k * .3); g.closePath(); g.fill(); }
      else if (i === 1) g.strokeRect(-k, -k * .8, k * 2, k * 1.6);
      else if (i === 2) { setFont(g, { font: 'serif', size: 15 * u, weight: 600 }); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('T', 0, 1 * u); }
      else if (i === 3) { g.strokeRect(-k, -k * .8, k * 2, k * 1.6); g.beginPath(); g.moveTo(-k, k * .6); g.lineTo(-k * .2, -k * .1); g.lineTo(k * .3, k * .3); g.lineTo(k, -k * .3); g.stroke(); }
      else if (i === 4) { g.moveTo(-k, k); g.lineTo(k, -k); g.stroke(); }
      else { for (let a2 = 0; a2 < 4; a2++) g.fillRect(-k + (a2 % 2) * k * 1.1, -k + Math.floor(a2 / 2) * k * 1.1, k * .9, k * .9); }
      g.restore();
    }
    g.restore();
  }
  _cursor(g, ag, p, t) {
    const s = 1.12 * this.u;
    if (p.mode === 'grab' && p.job) { // the file card it carries
      const op = p.job.op, cw = 84 * this.u, ch = 62 * this.u, x = p.x - cw * .35, y = p.y - ch * .55, art = this._art(op, 1);
      g.save(); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 14 * this.u; g.shadowOffsetY = 4 * this.u;
      rrect(g, x, y, cw, ch, 10 * this.u); g.fillStyle = '#5aa9ff'; g.fill(); g.shadowColor = 'transparent';
      g.save(); rrect(g, x + 6 * this.u, y + 6 * this.u, cw - 12 * this.u, ch - 12 * this.u, 6 * this.u); g.clip(); g.globalAlpha = .9;
      g.drawImage(art, x + 6 * this.u, y + 6 * this.u, cw - 12 * this.u, ch - 12 * this.u); g.restore();
      if (op.file) drawTag(g, x + 4 * this.u, y + ch + 5 * this.u, op.file, '#2f7bf5', this.u);
      g.restore();
    }
    if (p.mode === 'beam') drawBeam(g, p.x, p.y, ag.color, s, p.a);
    else drawArrow(g, p.x, p.y, ag.color, s, p.a);
    if (this.tagsOn && p.job && (p.job.op.kind === 'image' || p.job.op.kind === 'text') && p.mode !== 'grab') drawTag(g, p.x + (p.mode === 'beam' ? 8 : 13) * this.u, p.y + (p.mode === 'beam' ? 10 : 19) * this.u, ag.name, ag.color, this.u, p.a);
  }

  _hud(g, t) {
    const u = this.u, h = this.hud.h, cy = this.hud.y, k = smooth(this.introDur - 1.25, this.introDur - .85, t);
    const pill = (w, fill = ED.hud) => { const x = this.W / 2 - w / 2; g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 18 * u; rrect(g, x, cy - h / 2, w, h, h / 2); g.fillStyle = fill; g.fill(); g.restore(); rrect(g, x, cy - h / 2, w, h, h / 2); g.strokeStyle = ED.hudLine; g.lineWidth = 1; g.stroke(); return x; };
    const mono = (size, weight = 500) => setFont(g, { font: 'mono', size: size * u, weight });
    g.save(); g.textBaseline = 'middle';
    if (k < 1) { // the prompt
      g.globalAlpha = (.55 + .45 * smooth(0, .3, t)) * (1 - k);
      const n = clamp(Math.floor((t - .45) * 34) + 3, 0, this.prompt.length), s = this.prompt.slice(0, n), done = t > this.promptEnd + .15;
      mono(14); const tw = Math.max(g.measureText(this.prompt).width, 200 * u), w = tw + 150 * u, x = pill(w);
      g.fillStyle = ED.sel; g.fillText('›', x + 18 * u, cy); g.fillStyle = ED.hudText; g.fillText(s, x + 34 * u, cy);
      if (!done && (t * 2.2) % 1 < .6) g.fillRect(x + 34 * u + g.measureText(s).width + 2 * u, cy - 8 * u, 2 * u, 16 * u);
      if (done) { mono(12, 600); const lab = this.labels.generating + '.'.repeat(1 + Math.floor(t * 3) % 3); g.fillStyle = ED.sel; g.fillText(lab, x + w - 104 * u, cy); }
      else { g.fillStyle = ED.hudDim; mono(12); g.fillText('↵', x + w - 30 * u, cy); }
    }
    if (k > 0) {
      g.globalAlpha = k;
      const total = this.ops.length, done = this.ops.filter(o => t >= o.e).length, spawned = this.agents.filter(a => t >= a.spawn).length;
      const phase = t < this.F0 ? 'building' : t < this.Z0 + .5 ? 'publishing' : 'live';
      const stCol = phase === 'building' ? ED.build : phase === 'publishing' ? '#ffb02e' : ED.ok;
      mono(13, 600); const a1 = `${spawned} ${this.labels.agents}`, a2 = `${done}/${total} ${this.labels.layers}`, lab = phase === 'live' ? `● ${this.labels.live}` : this.labels[phase];
      mono(12, 600); const lw = g.measureText(lab).width + 20 * u; mono(12); const uw = g.measureText(this.url).width;
      mono(13, 600); const w = 18 * u + 58 * u + g.measureText(a1).width + 26 * u + g.measureText(a2).width + 20 * u + 70 * u + 16 * u + lw + 14 * u + uw + 22 * u;
      const x = pill(w); let cx = x + 20 * u;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(cx + i * 10 * u, cy, 7 * u, 0, 7); g.fillStyle = AGENT_COLORS[(i * 3) % AGENT_COLORS.length]; g.fill(); g.strokeStyle = ED.hud; g.lineWidth = 2 * u; g.stroke(); }
      cx += 58 * u; g.fillStyle = ED.hudText; mono(13, 600); g.fillText(a1, cx, cy); cx += g.measureText(a1).width + 10 * u;
      g.fillStyle = ED.hudDim; g.fillText('·', cx, cy); cx += 16 * u; g.fillStyle = ED.hudText; g.fillText(a2, cx, cy); cx += g.measureText(a2).width + 20 * u;
      const pk = phase === 'building' ? done / total : phase === 'publishing' ? smooth(this.F0, this.Z0 + .5, t) : 1;
      rrect(g, cx, cy - 2.5 * u, 70 * u, 5 * u, 2.5 * u); g.fillStyle = 'rgba(255,255,255,.1)'; g.fill(); rrect(g, cx, cy - 2.5 * u, 70 * u * pk, 5 * u, 2.5 * u); g.fillStyle = stCol; g.fill(); cx += 86 * u;
      rrect(g, cx, cy - 11 * u, lw, 22 * u, 11 * u); g.fillStyle = alpha(stCol, .18); g.fill(); g.fillStyle = stCol; mono(12, 600); g.fillText(lab, cx + 10 * u, cy + .5 * u); cx += lw + 14 * u;
      g.fillStyle = phase === 'live' ? ED.hudText : ED.hudDim; mono(12); g.fillText(this.url, cx, cy);
    }
    g.restore();
  }

  // ── layout problems (static) ──
  problems() {
    const out = [], ix = (a, b, p = 0) => a[0] < b[2] - p && b[0] < a[2] - p && a[1] < b[3] - p && b[1] < a[3] - p;
    const solid = this.ops.filter(o => ['text', 'image', 'chips', 'cells', 'paint'].includes(o.kind) && !o.overlap);
    for (let a = 0; a < solid.length; a++) for (let b = a + 1; b < solid.length; b++) if (ix(solid[a].box, solid[b].box, 1)) out.push(`overlap: ${solid[a].id} × ${solid[b].id}`);
    for (const o of this.ops) {
      if (o.x0 < -.5 || o.x1 > this.PW + .5) out.push(`${o.id} sticks out of the page (x ${Math.round(o.x0)}…${Math.round(o.x1)}, page 0…${this.PW})`);
      if (o.kind === 'text') {
        if (o.st.size * this.z0 < 12) out.push(`${o.id}: ${o.st.size}px text is ${(o.st.size * this.z0).toFixed(1)} px on screen — too small to read (12+)`);
        if (o.h && o.bh > o.h + 1) out.push(`${o.id}: text needs ${Math.round(o.bh)} px but has h ${o.h}`);
        if (o.w && Math.max(...o.lw) > o.w + 1) out.push(`${o.id}: a line is wider than w ${o.w}`);
        if (/[가-힣]/.test(o.text)) { const miss = [...new Set(Array.from(o.text).filter(ch => /[가-힣]/.test(ch) && !KS.has(ch)))]; if (miss.length) out.push(`${o.id}: ${miss.join('')} not in the bundled Korean font (falls back to a system font) — reword`); }
        if (o.font === 'pixel' && /[^A-Za-z0-9 .,!?:\-+'/&#*%()♥·×$"=<>\n]/.test(o.text)) out.push(`${o.id}: the pixel font has no glyph for some characters`);
      }
      if (o.delay > .45) out.push(`${o.id} waited ${o.delay.toFixed(2)} s for a free agent — add agents, or start it later`);
      const mid = (o.s + o.e) / 2, c = this.cam(mid), top = c.y, bot = c.y + this.VHp - 30;
      const vis = (Math.min(o.y1, bot) - Math.max(o.y0, top)) / Math.max(1, Math.min(o.y1 - o.y0, this.VHp - 60));
      if (o.y0 < top - 2 || vis < .8) out.push(`${o.id} is off screen while it is built (t ${mid.toFixed(1)}, y ${Math.round(o.y0)}…${Math.round(o.y1)}, view ${Math.round(top)}…${Math.round(bot)}) — build top-down, or sync() before a new section`);
    }
    const idle = this.agents.filter(a => !a.jobs.length).length;
    if (idle > this.N * .4) out.push(`${idle} of ${this.N} agents never work — use fewer agents or more swarm ops`);
    return [...new Set(out)];
  }

  // ── start: fonts, canvas, contract, live player ──
  async start() {
    const render = Q.has('render'), sc = +(Q.get('scale') || 1);
    document.title = document.title || this.title;
    const base = new URL('./fonts/', import.meta.url);
    await Promise.all(FONT_FILES.map(([fam, file, weight, style]) => new FontFace(fam, `url(${new URL(file + '.woff2', base)})`, { weight, style }).load().then(f => document.fonts.add(f)).catch(e => console.error('font failed: ' + file, e.message))));
    const cv = document.createElement('canvas'); cv.width = Math.round(this.W * sc); cv.height = Math.round(this.H * sc);
    document.body.style.cssText = `margin:0;background:${ED.bg};overflow:hidden;height:100vh;display:grid;place-items:center`;
    document.body.appendChild(cv); this.ctx = cv.getContext('2d'); this.canvas = cv;
    this._build(this.ctx);
    for (const op of this.ops) { // sound + click marks
      const add = (t, k, x, y, ag, extra) => { this.events.push({ t, k, ...extra }); if (x != null) this.clicks.push({ t, x, y, color: ag.color }); };
      for (const j of op.jobs) {
        const ag = j.agent;
        if (op.kind === 'rect') { add(j.t0 + .12, 'click', op.x, op.y, ag); add(j.t0 + .12 + op.dd, 'release', op.x + op.w, op.y + op.h, ag); }
        else if (op.kind === 'text') { add(j.t0 + .2, 'click', j.from[0], j.from[1], ag); for (let n = 0; n < op.nChars; n++) this.events.push({ t: op.s + .3 + n / op.cps, k: 'key' }); }
        else if (op.kind === 'image') { this.events.push({ t: j.t0, k: 'whoosh' }); add(j.t0 + .7, 'drop', op.x + op.w / 2, op.y + op.h / 2, ag); }
        else if (op.kind === 'chips') add(j.t0 + .14, 'pop', j.chip.x + j.chip.w / 2, j.chip.y + j.chip.h / 2, ag);
        else if (op.kind === 'line') add(j.t0 + .08, 'click', op.x1, op.y1, ag);
        else for (const c of j.tile) this.events.push({ t: c.ta, k: 'tick', a: ag.i });
      }
    }
    this.events.push({ t: this.F0, k: 'publish' }, { t: this.Z0 + .5, k: 'live' });
    for (const s of this.sections) { const ops = this.ops.filter(o => this.sections[o.sec] === s); s.start = ops.length ? Math.min(...ops.map(o => o.s)) : s.t; }
    this.events.sort((a, b) => a.t - b.t);
    const probs = this.problems(); if (probs.length) console.warn('layout:\n  ' + probs.join('\n  '));
    const shots = [{ name: 'prompt', start: 0, dur: this.introDur }, ...this.sections.map((s, i) => ({ name: s.name, start: s.start, dur: (this.sections[i + 1]?.start ?? this.F0) - s.start })), { name: 'publish', start: this.F0, dur: this.dur - this.F0 }];
    Object.assign(window, {
      film: Object.assign(this, { shots, fadeIn: 0, fadeOut: 0 }),
      DURATION: this.dur, FPS: this.fps, SIZE: { W: cv.width, H: cv.height },
      seek: t => this.draw(clamp(t, 0, this.dur), sc),
      shotAt: t => { let s = shots[0]; for (const x of shots) if (x.start <= t) s = x; return s; },
      runChecks: t => [...probs.map(p => 'layout · ' + p), ...this.rules.filter(r => !r.fn(t)).map(r => r.name)],
    });
    if (Q.has('t')) { window.seek(+Q.get('t')); window.__ready = true; return; }
    if (render) { window.seek(0); window.__ready = true; return; }
    // live: fit the window, play; click = pause/play, space, ← → (5 s), r = restart
    const fit = () => { const k = Math.min(innerWidth / this.W, innerHeight / this.H); cv.style.width = `${this.W * k}px`; cv.style.height = `${this.H * k}px`; };
    fit(); addEventListener('resize', fit);
    const live = this.live = { playing: true, t: 0 }; let last = performance.now(), lsc = 0; const loop = Q.has('loop');
    const act = a => { if (a === 'toggle') { if (live.t >= this.dur - .01) live.t = 0; live.playing = !live.playing || live.t === 0; } else if (a === 'restart') { live.t = 0; live.playing = true; } else if (a === 'next') live.t = Math.min(this.dur, live.t + 5); else if (a === 'prev') live.t = Math.max(0, live.t - 5); };
    cv.addEventListener('click', () => act('toggle'));
    addEventListener('keydown', ev => { const a = { ' ': 'toggle', ArrowRight: 'next', ArrowLeft: 'prev', r: 'restart' }[ev.key]; if (a) { ev.preventDefault(); act(a); } });
    const frame = now => {
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      if (live.playing) { live.t += dt; if (live.t >= this.dur) { if (loop) live.t = 0; else { live.t = this.dur; live.playing = false; } } }
      const want = Math.min(2, Math.min(innerWidth / this.W, innerHeight / this.H) * Math.min(2, devicePixelRatio || 1));
      if (Math.abs(want - lsc) > .01) { lsc = want; cv.width = Math.round(this.W * lsc); cv.height = Math.round(this.H * lsc); this._arts?.clear(); }
      this.draw(live.t, lsc); requestAnimationFrame(frame);
    };
    window.__ready = true; requestAnimationFrame(frame);
  }
}

// the 2,350 Hangul syllables of KS X 1001 (what the bundled Noto Sans KR subset covers)
const KS = (() => { const s = new Set(); try { const d = new TextDecoder('euc-kr'); for (let a = 0xB0; a <= 0xC8; a++) for (let b = 0xA1; b <= 0xFE; b++) s.add(d.decode(new Uint8Array([a, b]))); } catch { } return s; })();

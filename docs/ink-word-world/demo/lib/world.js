// The sheet and what happens on it. An InkWorld owns the paper (a Fluid), the things living on it, the words that
// summon them, the rules by which they affect each other, the hand that writes (keyboard, pointer, or the performance
// that plays by itself), the page chrome and the clock. A project describes a world with word() / rule() / perform()
// and calls start(); see templates/world.js.
//
// Time only moves in fixed steps of 1/60 s and every random number comes from the world's seed, so a performance
// plays the same every time: that is what lets scripts/check.mjs test a world and scripts/render.mjs film it.
import { Fluid, pigment } from './fluid.js';
import { Sound } from './sound.js';
import { rng, clamp, lerp, ease, curve, paperTile, INK, hash } from './brush.js';

const STEP = 1 / 60;
const DEFAULTS = {
  seed: 7, title: '墨', subtitle: '', lang: 'ko',
  font: { family: 'InkBrush', url: new URL('./fonts/YeonSung.woff2', import.meta.url).href },
  paper: {}, fluid: {},
  labels: { auto: '저절로', sound: '소리', keep: '남기기', hint: '글자를 치면 살아납니다 · 끌어서 먹을 젓기 · Shift 누르고 끌면 물 · 1 먹 2 주 3 청',
    unsupported: '이 브라우저에서는 먹을 풀 수 없습니다 (WebGL2와 부동소수점 렌더 타깃이 필요합니다)' },
  glyph: 150, autoAfter: 14, chips: true
};

export class InkWorld {
  constructor(o = {}) {
    if (o.ink) Object.assign(INK, o.ink);                   // a world's own palette: things draw with INK.black, INK.red, INK.blue …
    this.o = Object.assign({}, DEFAULTS, { pigments: [{ name: 'ink', label: '먹', color: INK.black }, { name: 'red', label: '주', color: INK.red }, { name: 'blue', label: '청', color: INK.blue }] }, o);
    this.o.labels = Object.assign({}, DEFAULTS.labels, o.labels || {});
    this.q = new URLSearchParams(location.search);
    this.drive = this.q.has('drive');                       // a script moves the clock (check / render)
    this.words = new Map(); this.keys = new Map(); this.rules = []; this.script = []; this.sound = new Sound(this.o.sound || {});
    this.env = {};                                          // anything a world wants its things to share (a waterline, a season…)
    this._reset(this.o.seed);
  }
  _reset(seed) {
    this.seed = seed; this.rand = rng(seed); this.t = 0; this.frame = 0; this.things = []; this.cues = []; this.lines = []; this.violations = {}; this.bodies = {};
    this.wind = { x: 0, y: 0 }; this.dark = 0; this.night = false; this.quiet = false; this.fired = {}; this._ruleOn = {}; this._ruleT = 0; this._cueT = {};
    this.ptr = Object.assign(this.ptr || {}, { x: -1, y: -1, px: -1, py: -1, down: false, water: false, seen: false }); this.pig = 0; this.buf = ''; this.armed = null;
    this.play = { i: 0, on: false, t0: 0 }; this.summoned = []; this.sound._i = -1; this.sound._r = null; this.sound._last = null;
    for (const k of Object.keys(this.env)) delete this.env[k];
    if (this.o.env) Object.assign(this.env, typeof this.o.env === 'function' ? this.o.env(this) : this.o.env);
  }

  // ───────── describing a world ─────────
  /**
   * A word and what it becomes. def: { keys: ['dal', 'moon'] other ways to type it, home: [fx, fy] where it goes when
   * no place is given, spawn(w, x, y) → thing | things | nothing, unique: only one at a time, max: at most this many
   * (the oldest leaves), pigment: index of the ink the word is written in, note: scale degree it sounds,
   * size: glyph height in units, chip: false to leave it off the row of chips, about: one line for the cast sheet }
   */
  word(id, def) {
    def = Object.assign({ id, keys: [], home: [.5, .5], pigment: 0, note: this.words.size, chip: true }, def);
    this.words.set(id, def);
    for (const k of [id, ...def.keys]) { const key = k.toLowerCase(); if (this.keys.has(key)) console.error(`ink-word-world: "${k}" is typed for both ${this.keys.get(key)} and ${id}`); this.keys.set(key, id); }
    return this;
  }
  /**
   * How things affect each other. def: { id, when: ['달', '갈매기'] (all on the sheet) or (w) => bool,
   * line: 'a short line shown at the side', then(w): what happens, again: seconds before it may happen again while the
   * condition still holds (default: once each time the condition becomes true) }
   */
  rule(def) { this.rules.push(Object.assign({ id: 'rule' + this.rules.length }, def)); return this; }
  /**
   * The performance the sheet plays by itself (and that scripts check and film). A list of
   *   ['달', fx, fy, { wait: seconds after }]      write a word at a place (fractions of the sheet)
   *   ['stir', [[fx, fy], …], seconds, { ink: true, water: false, pigment: 0 }]   move the brush along a path
   *   ['wait', seconds]
   */
  perform(list) { this.script = list; return this; }

  // ───────── what things may ask of the world ─────────
  /** add a thing: { z, grow, update(w, dt), draw(w, ink, light), tags: [] }. Returns it. */
  add(thing) { thing.age = 0; thing.word = thing.word || this._spawning || null; thing.z = thing.z || 0; thing.id = ++this._ids; this.things.push(thing); this._sort = true; return thing; }
  all(word) { return this.things.filter(t => (t.word === word || (t.tags && t.tags.includes(word))) && t.leaving == null); }
  first(word) { for (const t of this.things) if ((t.word === word || (t.tags && t.tags.includes(word))) && t.leaving == null) return t; return null; }
  has(word) { return !!this.first(word); }
  /** let a thing go: it fades over its `fade` seconds (default 1.2) and is removed */
  dismiss(thing) { if (thing && thing.leaving == null) { thing.leaving = 0; if (thing.leave) thing.leave(this); } }
  pigmentOf(p) { const P = this.o.pigments; return this._abs[typeof p === 'number' ? clamp(p | 0, 0, P.length - 1) : Math.max(0, P.findIndex(x => x.name === p))]; }
  /** drop wet ink at (x, y): { r radius (units), amount, pigment (index or name) } — it flows, then dries */
  ink(x, y, { r = 30, amount = 1, pigment: p = 0 } = {}) { const a = this.pigmentOf(p); this.fluid.ink(x / this.W, y / this.H, [a[0] * amount, a[1] * amount, a[2] * amount], r / this.H); }
  /** ink that stays exactly where it is put (a footprint, a scar, a shadow) */
  mark(x, y, { r = 30, amount = 1, pigment: p = 0 } = {}) { const a = this.pigmentOf(p); this.fluid.mark(x / this.W, y / this.H, [a[0] * amount, a[1] * amount, a[2] * amount], r / this.H); }
  /** push the fluid at (x, y) with velocity (vx, vy) units/s over radius r */
  push(x, y, vx, vy, r = 40) { this.fluid.push(x / this.W, y / this.H, vx / this.H, vy / this.H, r / this.H); }
  /** spin the fluid around (x, y); spin > 0 is clockwise */
  swirl(x, y, spin, r = 90) { this.fluid.swirl(x / this.W, y / this.H, spin, r / this.H); }
  /** clean water at (x, y): lifts and thins what has dried there */
  water(x, y, r = 70, amount = .5) { this.fluid.water(x / this.W, y / this.H, r / this.H, amount); }
  /** the fluid's velocity at (x, y) in units/s — things let it carry them */
  flow(x, y, out = [0, 0]) { this.fluid.flowAt(x / this.W, y / this.H, out); out[0] *= this.H; out[1] *= this.H; return out; }
  /** make a sound: a voice name and its parameters (see sound.js); `every` seconds limits how often this name sounds */
  cue(name, p = {}, every = 0) {
    if (every) { if (this.t - (this._cueT[name] ?? -9) < every) return; this._cueT[name] = this.t; }
    if (p.x != null) { p = Object.assign({ pan: clamp((p.x / this.W - .5) * 1.4, -1, 1) }, p); delete p.x; }
    if (this.keepCues) this.cues.push({ t: this.t, name, p }); this._cueCount = (this._cueCount || 0) + 1; this.cueNames[name] = (this.cueNames[name] || 0) + 1;
    this.sound.play(name, p);
  }
  /** show a line at the side of the sheet */
  say(line, rule) { this.lines.push({ t: this.t, line, rule }); this._verseT = this.t; if (this.dom) this.dom.verse.textContent = line; }
  /** a flash of light over the whole sheet (lightning) */
  flash(k = 1) { this._flash = Math.max(this._flash || 0, k); }
  /** turn the sheet over to night (or back), spreading from (x, y) */
  setNight(on, x = this.W / 2, y = this.H / 2) {
    if (on === this.night) return; this.night = on; const n = this.fluid.night; n.from = on ? 0 : 1; n.to = on ? 1 : 0; n.r = 0; n.at = [x / this.W, y / this.H]; this._nightT = 0;
  }
  /** write a word on the sheet and let it melt into the fluid; `then` runs as it melts. Returns the glyph thing. */
  write(text, x, y, { size = this.o.glyph, pigment: p = 0, hold = .62, then, spin = 1 } = {}) {
    const w = this; let melted = false;
    return this.add({
      z: 90, word: null, tags: ['glyph'], grow: .12, fade: .5, text, x, y,
      update() { if (!melted && this.age >= hold) { melted = true; w._melt(text, x, y, size, p, spin); if (then) then(); w.dismiss(this); } },
      draw(w, ink) { const k = .86 + .14 * ease(this.age / .16); ink.font = `${size * k}px "${w.o.font.family}", serif`; ink.textAlign = 'center'; ink.textBaseline = 'middle'; ink.fillStyle = w.o.pigments[p].color; ink.fillText(text, x, y); }
    });
  }
  _melt(text, x, y, size, p, spin) {
    const c = this._gc || (this._gc = document.createElement('canvas')), px = 160, g = c.getContext('2d');
    g.font = `${px}px "${this.o.font.family}", serif`; const tw = Math.ceil(g.measureText(text).width) + 40; c.width = tw; c.height = px + 60;
    g.font = `${px}px "${this.o.font.family}", serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(text, tw / 2, c.height / 2);
    const a = this.pigmentOf(p), k = .7 * (size > this.o.glyph ? 1.3 : 1), s = size / px;
    this.fluid.stamp(c, x / this.W, y / this.H, tw * s / this.H, c.height * s / this.H, [a[0] * k, a[1] * k, a[2] * k]);
    const r = size * (.5 + text.length * .18), sg = this.rand.sign() * spin;
    this.swirl(x - r * .5, y, 1.35 * sg, r); this.swirl(x + r * .5, y, -1.35 * sg, r);
    for (let i = 0; i < 4; i++) { const an = this.rand() * 6.283; this.push(x + Math.cos(an) * r * .4, y + Math.sin(an) * r * .4, Math.cos(an) * 110, Math.sin(an) * 110, size * .4); }
    this.cue('melt', { x });
  }
  /** write the word `id` at (x, y) (units; default: the pointer, or the word's home) and bring what it means to life */
  summon(id, x, y) {
    const def = this.words.get(id); if (!def) return null;
    if (x == null) { if (this.ptr.seen) { x = this.ptr.x; y = this.ptr.y; } else { x = def.home[0] * this.W; y = def.home[1] * this.H; } }
    x = clamp(x, 40, this.W - 40); y = clamp(y, 40, this.H - 40);
    this.summoned.push({ t: this.t, id, x, y }); this.cue('word', { x, m: this.sound.degree(this, def.note % 10, 0) });
    this._hit = { id, t: this.t };
    return this.write(id, x, y, { size: def.size || this.o.glyph, pigment: def.pigment, then: () => {
      if (def.unique) for (const t of this.all(id)) this.dismiss(t);
      if (def.max) { const old = this.all(id); while (old.length >= def.max) this.dismiss(old.shift()); }
      this._spawning = id; const made = def.spawn ? def.spawn(this, x, y) : null; this._spawning = null;
      for (const t of [].concat(made || [])) if (t && !t.id) { t.word = id; this.add(t); }
    } });
  }
  /** wash the sheet clean: every thing leaves and a band of water crosses the paper */
  clear() {
    for (const t of this.things) if (!(t.tags && t.tags.includes('glyph'))) this.dismiss(t);
    this.setNight(false); this.wind.x = this.wind.y = 0; this.quiet = false; this._wash = 0; this._ruleOn = {}; this.cue('clear', {});
  }

  // ───────── the clock ─────────
  step() {
    const dt = STEP, f = this.fluid; this.t += dt; this.frame++; this.dt = dt;
    this._intro(); this._perform(dt); this._hand(dt);
    if (this.o.tick) this.o.tick(this, dt);                   // the world's own clockwork (a tide, a season) before its things move
    if (this._wash != null) {                                 // the clearing wash: a column of water sweeping across
      this._wash += dt / 1.5; const x = this._wash * (this.W + 300) - 150;
      for (let i = 0; i < 6; i++) { const y = (i + .5) / 6 * this.H; this.water(x, y, 150, .9); this.push(x, y, 900, (hash(this.frame, i) - .5) * 300, 120); }
      if (this._wash >= 1) { this._wash = null; }
    }
    if (this.t - this._ruleT >= .2) { this._ruleT = this.t; this._rules(); }
    const T = this.things;
    for (let i = 0; i < T.length; i++) { const th = T[i]; th.age += dt; if (th.leaving != null) th.leaving += dt; if (th.update) th.update(this, dt); }
    for (let i = T.length - 1; i >= 0; i--) { const th = T[i]; if (th.dead || (th.leaving != null && th.leaving >= (th.fade ?? 1.2))) { if (th.gone) th.gone(this); T.splice(i, 1); } }
    this.sound.compose(this);
    // night spreads from where it was written
    if (this._nightT != null) { this._nightT += dt; f.night.r = this._nightT * 1.15; if (f.night.r > 2.8) { this._nightT = null; f.night.from = f.night.to; } }
    this.dark = lerp(this.dark, this.night ? 1 : 0, 1 - Math.exp(-dt * 1.6));
    this._flash = (this._flash || 0) * Math.exp(-dt * 9); f.flash = this._flash;
    f.step(dt); if (this.frame % 2 === 0) f.readFlow();
  }
  _intro() {
    if (this._introDone || this.t < .35) return; this._introDone = true;
    if (this.o.title) this.write(this.o.title, this.W / 2, this.H * .42, { size: this.o.glyph * 1.5, hold: 1.25 });
    this.cue('word', { m: this.sound.music.root + 12 });
  }
  _rules() {
    for (const r of this.rules) {
      const on = typeof r.when === 'function' ? !!r.when(this) : r.when.every(id => this.has(id)), was = this._ruleOn[r.id];
      if (on && (!was || (r.again && this.t - was >= r.again))) {
        this._ruleOn[r.id] = this.t; this.fired[r.id] = (this.fired[r.id] || 0) + 1;
        if (r.line) { this.say(r.line, r.id); this.cue('verse', { m: this.sound.degree(this, 2 + (this.rules.indexOf(r) % 4), 1) }); }
        if (r.then) r.then(this);
      } else if (!on) this._ruleOn[r.id] = 0;
    }
  }
  // the brush: whatever moves the pointer (a person or the performance) stirs the fluid; held down it lays ink, with water it washes
  _hand(dt) {
    const p = this.ptr; if (!p.seen) return; if (p.px < 0) { p.px = p.x; p.py = p.y; }
    const dx = p.x - p.px, dy = p.y - p.py, d = Math.hypot(dx, dy);
    if (d > .5) {
      const sp = Math.min(d / dt, 2600), k = (p.down ? .5 : .26) * sp / d, n = Math.max(1, Math.ceil(d / 16));
      for (let i = 1; i <= n; i++) {
        const x = p.px + dx * i / n, y = p.py + dy * i / n; this.push(x, y, dx * k, dy * k, p.down ? 48 : 38);
        if (p.down && p.water) this.water(x, y, 85, .35); else if (p.down) this.ink(x, y, { r: 15 + Math.min(16, sp * .012), amount: .22, pigment: this.pig });
      }
      if (p.down) this.cue(p.water ? 'water' : 'brush', { x: p.x, k: clamp(sp / 1800) }, p.water ? .45 : .16); else if (sp > 260) this.cue('stir', { x: p.x, k: clamp(sp / 1800) }, .5);
    }
    p.px = p.x; p.py = p.y;
  }

  // ───────── the performance ─────────
  _compile() {
    const ops = []; let t = 3.4, at = [.5, .46];
    for (const s of this.script) {
      if (s[0] === 'wait') { t += s[1]; continue; }
      if (s[0] === 'stir') { const o = s[3] || {}, dur = s[2] || 2; ops.push({ type: 'stir', t0: t + .6, t1: t + .6 + dur, from: at, path: curve(s[1], 8), o }); at = s[1][s[1].length - 1]; t += .6 + dur + (o.wait ?? .5); continue; }
      const def = this.words.get(s[0]); if (!def) { console.error('ink-word-world: perform() uses an unknown word', s[0]); continue; }
      const o = s[3] || {}, to = [s[1] ?? def.home[0], s[2] ?? def.home[1]];
      ops.push({ type: 'word', t0: t, t1: t + 1.5, from: at, to, id: s[0], keys: (def.keys[0] || s[0]) }); at = to; t += 1.5 + (o.wait ?? 2.3);
    }
    this.ops = ops; this.DURATION = Math.ceil(t + 4.5);
  }
  _perform() {
    const P = this.play; if (!P.on || !this.ops) return; const t = this.t - P.t0, p = this.ptr;
    while (P.i < this.ops.length && t >= this.ops[P.i].t1) { const op = this.ops[P.i++]; if (op.type === 'word') { this.summon(op.id, op.to[0] * this.W, op.to[1] * this.H); this._keys(op.keys, true); } p.down = false; }
    const op = this.ops[P.i];
    if (!op) { p.down = false; if (!this.drive && t > this.DURATION + 3) this.restart(true); return; }
    if (t < op.t0) return;
    p.seen = true;
    if (op.type === 'word') {
      const k = ease((t - op.t0) / .85); p.x = lerp(op.from[0], op.to[0], k) * this.W; p.y = lerp(op.from[1], op.to[1], k) * this.H; p.down = false;
      const typed = clamp((t - op.t0 - .75) / .6), n = Math.floor(typed * (op.keys.length + .999)); if (n !== P.n || op !== P.op) { P.n = n; P.op = op; if (n > 0) { this._keys(op.keys.slice(0, n), false); this.cue('drop', { x: p.x, f: 500 + n * 40, v: .05 }); } }
    } else {
      const head = .35, k = (t - op.t0) / (op.t1 - op.t0), o = op.o;
      if (t < op.t0 + head) { const e = ease((t - op.t0) / head); p.x = lerp(op.from[0], op.path[0][0], e) * this.W; p.y = lerp(op.from[1], op.path[0][1], e) * this.H; p.down = false; }
      else { const u = clamp((t - op.t0 - head) / (op.t1 - op.t0 - head)) * (op.path.length - 1), i = Math.min(op.path.length - 2, Math.floor(u)), f = u - i;
        p.x = lerp(op.path[i][0], op.path[i + 1][0], f) * this.W; p.y = lerp(op.path[i][1], op.path[i + 1][1], f) * this.H; p.down = o.ink !== false || !!o.water; p.water = !!o.water; if (o.pigment != null) this._pigment(o.pigment); }
      void k;
    }
  }
  /** start the performance from an empty sheet (auto) */
  restart(auto = true) {
    if (this.fluid) this.fluid.clear(); this._reset(this.seed); this._introDone = false; this._ids = 0; this.cueNames = {};
    if (this.fluid) { this.fluid.night.from = this.fluid.night.to = 0; this.fluid.flash = 0; }
    this.play.on = auto; this._ui();
  }

  // ───────── page, input ─────────
  async start(el = document.body) {
    const o = this.o; this.el = el; this._ids = 0; this.cueNames = {}; this.keepCues = this.drive;
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = new URL('./inkworld.css', import.meta.url).href; document.head.appendChild(link);
    const root = this.root = document.createElement('div'); root.className = 'iw'; root.lang = o.lang;
    root.innerHTML = `<canvas class="iw-sheet"></canvas>
      <div class="iw-seal"><b></b><span></span></div>
      <div class="iw-btns"><button type="button" data-a="auto"></button><button type="button" data-a="sound"></button><button type="button" data-a="keep"></button></div>
      <div class="iw-verse" aria-live="polite"></div><div class="iw-keys"></div>
      <div class="iw-foot"><div class="iw-pigs"></div><div class="iw-chips"></div><p class="iw-hint"></p></div>
      <div class="iw-brush"></div><input class="iw-type" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${o.labels.hint}">`;
    el.appendChild(root); root.style.setProperty('--iw-font', `"${o.font.family}"`); if (this.drive) root.classList.add('iw-drive');
    const $ = s => root.querySelector(s);
    this.dom = { sheet: $('.iw-sheet'), seal: $('.iw-seal'), verse: $('.iw-verse'), keys: $('.iw-keys'), chips: $('.iw-chips'), pigs: $('.iw-pigs'), hint: $('.iw-hint'), brush: $('.iw-brush'), type: $('.iw-type'), btn: {} };
    for (const b of root.querySelectorAll('.iw-btns button')) { this.dom.btn[b.dataset.a] = b; b.textContent = o.labels[b.dataset.a]; }
    $('.iw-seal b').textContent = o.title; $('.iw-seal span').textContent = o.subtitle; this.dom.hint.textContent = o.labels.hint;
    for (const [id, def] of this.words) if (def.chip && o.chips) { const b = document.createElement('button'); b.type = 'button'; b.dataset.w = id; b.textContent = id; b.title = def.keys.join(' · '); this.dom.chips.appendChild(b); }
    o.pigments.forEach((p, i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.p = i; b.style.setProperty('--c', p.color); b.title = `${i + 1} · ${p.label}`; b.setAttribute('aria-label', p.label); this.dom.pigs.appendChild(b); });
    try { const ff = new FontFace(o.font.family, `url(${o.font.url})`); document.fonts.add(await ff.load()); } catch (e) { console.error('ink-word-world: the brush font did not load', o.font.url); }
    try { this.fluid = new Fluid(this.dom.sheet, Object.assign({}, o.fluid, this.q.get('q') === 'low' ? { simH: 96, dyeH: 300, pressure: 10 } : null)); Object.assign(this.fluid.look, o.paper); }   // ?q=low: a coarser sheet for quick checks
    catch (e) { root.classList.add('iw-off'); this.dom.hint.textContent = o.labels.unsupported; console.error('ink-word-world:', e.message); return this; }
    this.fluid.setPaper(paperTile(512, o.seed));
    this._abs = o.pigments.map(p => pigment(p.color, p.strength || 1));
    this.inkC = document.createElement('canvas'); this.lightC = document.createElement('canvas'); this.inkX = this.inkC.getContext('2d'); this.lightX = this.lightC.getContext('2d');
    this._size(); this._compile(); this._listen(); this._ui();
    this.play.on = this.drive || this.q.has('auto') || !!o.auto; this._idle = 0; this._ui();
    window.__inkworld = this._contract();
    const from = this.drive ? 0 : +this.q.get('t') || 0;      // ?t=40: open the page 40 s into the performance (it is played forward to there, fast)
    if (from > 0) { this.play.on = true; this._ui(); root.classList.add('iw-drive'); await new Promise(done => { const go = () => { const end = performance.now() + 22; while (this.frame < from * 60 && performance.now() < end) this.step(); this.draw(); if (this.frame < from * 60) requestAnimationFrame(go); else done(); }; go(); }); root.classList.remove('iw-drive'); }
    if (!this.drive) { let last = performance.now(), acc = 0; const loop = now => { acc = Math.min(acc + (now - last) / 1000, .1); last = now; if (!document.hidden) { let n = 0; while (acc >= STEP && n++ < 3) { this.step(); acc -= STEP; } if (n) this.draw(); if (!this.play.on && !this._touched && this.o.autoAfter && this.t > this.o.autoAfter) { this.play.on = true; this.play.t0 = this.t - 3.2; this._ui(); } } requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
    else { this.step(); this.draw(); }
    return this;
  }
  _size() {
    const cw = this.root.clientWidth || innerWidth, ch = this.root.clientHeight || innerHeight, cap = +(this.q.get('px') || 1920);
    const pr = Math.min(window.devicePixelRatio || 1, 2, cap / Math.max(cw, ch)), bw = Math.round(cw * pr), bh = Math.round(ch * pr);
    this.scale = Math.sqrt(cw * ch) / 1333; this.W = cw / this.scale; this.H = ch / this.scale; this.cw = cw; this.ch = ch;
    for (const c of [this.dom.sheet, this.inkC, this.lightC]) { c.width = bw; c.height = bh; }
    this.pxPerUnit = pr * this.scale; this.fluid.resize(); this.fluid.readFlow();
  }
  draw() {
    const ink = this.inkX, light = this.lightX, s = this.pxPerUnit;
    if (this._sort) { this.things.sort((a, b) => a.z - b.z || a.id - b.id); this._sort = false; }
    for (const c of [ink, light]) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.inkC.width, this.inkC.height); c.setTransform(s, 0, 0, s, 0, 0); }
    light.globalCompositeOperation = 'lighter';
    for (const th of this.things) {
      if (!th.draw) continue; const a = clamp(th.age / (th.grow || .9)) * (th.leaving != null ? clamp(1 - th.leaving / (th.fade ?? 1.2)) : 1); if (a <= 0) continue;
      th.presence = a; ink.globalAlpha = a; light.globalAlpha = a; ink.save(); light.save(); th.draw(this, ink, light); ink.restore(); light.restore();
    }
    if (this.armed && this.ptr.seen) { ink.globalAlpha = .28; ink.font = `${this.o.glyph}px "${this.o.font.family}", serif`; ink.textAlign = 'center'; ink.textBaseline = 'middle'; ink.fillStyle = INK.black; ink.fillText(this.armed, this.ptr.x, this.ptr.y); }
    this.fluid.render(this.inkC, this.lightC);
    const d = this.dom, dark = this.dark > .5; if (dark !== this._dk) { this._dk = dark; this.root.classList.toggle('iw-night', dark); }
    // the chrome runs on the sheet's clock, not the wall's, so a filmed performance shows it exactly as a live one
    const vt = this._verseT == null ? 9 : this.t - this._verseT, vo = clamp(vt / .8) * clamp((7 - vt) / 1.5) * .85; if (vo !== this._vo) { this._vo = vo; d.verse.style.opacity = vo.toFixed(3); d.verse.style.transform = `translateY(${-46 - 4 * clamp(vt / .8)}%)`; }
    const hit = this._hit && this.t - this._hit.t < .8 ? this._hit.id : null; if (hit !== this._hitOn) { this._hitOn = hit; for (const c of d.chips.children) c.classList.toggle('hit', c.dataset.w === hit); }
    if (this._keysOff != null && this.t > this._keysOff) { this._keysOff = null; d.keys.classList.remove('on'); }
    const b = d.brush; if (this.play.on && this.ptr.seen) { b.style.transform = `translate(${this.ptr.x * this.scale}px, ${this.ptr.y * this.scale}px)`; b.classList.add('on'); b.classList.toggle('down', this.ptr.down); } else b.classList.remove('on');
  }
  _keys(text, done) {
    const k = this.dom.keys; k.innerHTML = '';
    for (const ch of text) { const s = document.createElement('kbd'); s.textContent = /[a-z]/i.test(ch) ? ch.toUpperCase() : ch; k.appendChild(s); }
    if (done && text) { const s = document.createElement('kbd'); s.className = 'sp'; s.textContent = 'space'; k.appendChild(s); }
    k.classList.toggle('on', !!text); k.classList.toggle('done', !!done); this._keysOff = done ? this.t + 1 : null;
  }
  _pigment(i) { this.pig = clamp(i | 0, 0, this.o.pigments.length - 1); if (this.dom) [...this.dom.pigs.children].forEach((b, j) => b.setAttribute('aria-pressed', j === this.pig)); }
  _ui() { if (!this.dom) return; const b = this.dom.btn; b.auto.setAttribute('aria-pressed', !!this.play.on); b.sound.setAttribute('aria-pressed', !!this.sound.on); this._pigment(this.pig); }
  _take() { this._touched = true; if (this.play.on) { this.play.on = false; this.ptr.down = false; this._keys('', false); this._ui(); } }
  // typing: the buffer is matched against every word and every other way to type it; a word fires as soon as nothing longer can follow
  _typed(buf, commit) {
    buf = buf.toLowerCase().replace(/\s+/g, ''); clearTimeout(this._tt);
    const starts = b => { for (const k of this.keys.keys()) if (k.startsWith(b)) return true; return false; };
    while (buf && !starts(buf)) buf = buf.slice(1);                // a mistype falls off the front
    const fire = () => { const id = this.keys.get(buf); this._keys(buf, true); this.buf = ''; this._resetType(); this.summon(id); };
    this.buf = buf; this._keys(buf, false);
    if (!buf) return;
    if (this.keys.has(buf)) { let longer = false; for (const k of this.keys.keys()) if (k !== buf && k.startsWith(buf)) longer = true; if (commit || !longer) fire(); else this._tt = setTimeout(fire, 700); }
  }
  _resetType() { const i = this.dom.type; i.value = ''; if (this._composing) { i.blur(); if (!this._coarse) i.focus({ preventScroll: true }); } }
  _listen() {
    const d = this.dom, sheet = d.sheet, p = this.ptr, at = e => { const r = sheet.getBoundingClientRect(); p.x = (e.clientX - r.left) / this.scale; p.y = (e.clientY - r.top) / this.scale; p.seen = true; };
    this._coarse = matchMedia('(pointer: coarse)').matches;
    const focus = () => { if (!this._coarse) d.type.focus({ preventScroll: true }); };
    sheet.addEventListener('pointerdown', e => { this._take(); at(e); p.px = p.x; p.py = p.y; sheet.setPointerCapture(e.pointerId); focus(); e.preventDefault();
      if (this.armed) { const id = this.armed; this.armed = null; for (const b of d.chips.children) b.classList.remove('armed'); this.summon(id, p.x, p.y); return; }
      p.down = true; p.water = e.shiftKey; });
    sheet.addEventListener('pointermove', e => { if (this.play.on) return; at(e); if (p.down) p.water = e.shiftKey; });
    const up = () => { p.down = false; }; sheet.addEventListener('pointerup', up); sheet.addEventListener('pointercancel', up);
    sheet.addEventListener('pointerleave', () => { if (!p.down && !this.play.on) p.px = -1; });
    d.chips.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; this._take(); const id = b.dataset.w;
      if (this.armed === id) { this.armed = null; b.classList.remove('armed'); const def = this.words.get(id); this.summon(id, def.home[0] * this.W, def.home[1] * this.H); }
      else { for (const c of d.chips.children) c.classList.remove('armed'); this.armed = id; b.classList.add('armed'); } focus(); });
    d.pigs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { this._pigment(+b.dataset.p); focus(); } });
    d.btn.auto.addEventListener('click', () => { if (this.play.on) this._take(); else { this.restart(true); } focus(); });
    d.btn.sound.addEventListener('click', async () => { await this.sound.enable(!this.sound.on); this._ui(); if (this.sound.on) this.sound.play('verse', { m: 74 }); focus(); });
    d.btn.keep.addEventListener('click', () => { this.draw(); sheet.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${this.o.title || 'ink'}-${Math.round(this.t)}s.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }); });
    d.type.addEventListener('compositionstart', () => { this._composing = true; }); d.type.addEventListener('compositionend', () => { this._composing = false; this._typed(d.type.value, false); });
    d.type.addEventListener('input', () => { this._take(); this._typed(d.type.value, false); if (!this._composing && !this.buf) d.type.value = ''; else if (!this._composing && d.type.value.length > 24) d.type.value = this.buf; });
    d.type.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (this.buf) this._typed(this.buf, true); return; }
      if (e.key === 'Escape') { this.buf = ''; this.armed = null; this._resetType(); this._keys('', false); return; }
      if (!this.buf && !e.isComposing && /^[1-9]$/.test(e.key) && +e.key <= this.o.pigments.length) { e.preventDefault(); this._pigment(+e.key - 1); }
    });
    addEventListener('keydown', e => { if (e.target !== d.type && !e.metaKey && !e.ctrlKey && e.key.length === 1) focus(); });
    focus();
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { const W0 = this.W, H0 = this.H; this._size(); for (const t of this.things) if (t.resized) t.resized(this, this.W / W0, this.H / H0); this.draw(); }, 200); });
  }

  // ───────── what scripts drive (window.__inkworld) ─────────
  _contract() {
    const w = this;
    return {
      world: w, FPS: 60, get DURATION() { return w.DURATION; }, get t() { return w.t; },
      words: [...w.words.values()].map(d => ({ id: d.id, keys: d.keys, home: d.home, still: !!d.still, unique: !!d.unique })),
      rules: w.rules.map(r => ({ id: r.id, when: typeof r.when === 'function' ? null : r.when, needs: r.needs || null, line: r.line || '' })),
      /** an empty sheet at t = 0; perform = false leaves the hand to the script */
      reset(perform = true) { w.restart(perform); w.keepCues = true; w.step(); w.draw(); },
      /** move the clock n steps (1/60 s each) and draw once */
      advance(n = 1, draw = true) { for (let i = 0; i < n; i++) w.step(); if (draw) w.draw(); return w.t; },
      /** go to time t of the performance (forward only; earlier times start over) */
      seek(t) { const f = Math.round(t * 60); if (f < w.frame) this.reset(true); while (w.frame < f) w.step(); w.draw(); return w.t; },
      summon(id, fx, fy) { const d = w.words.get(id); w.summon(id, (fx ?? d.home[0]) * w.W, (fy ?? d.home[1]) * w.H); },
      /** what is on the sheet now */
      /** a 64 × 36 picture of the sheet as luminance 0…1 (what a script compares to see that something changed) */
      thumb() { const c = w._tc || (w._tc = document.createElement('canvas')); c.width = 64; c.height = 36; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(w.dom.sheet, 0, 0, 64, 36); const d = g.getImageData(0, 0, 64, 36).data, out = []; for (let i = 0; i < d.length; i += 4) out.push(Math.round((d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 2.55) / 100); return out; },
      /** which characters of the words, title and lines the brush font cannot draw (they would fall back to another font) */
      missingGlyphs() {
        const c = document.createElement('canvas'); c.width = 80; c.height = 80; const g = c.getContext('2d', { willReadFrequently: true }), miss = new Set(), px = f => { g.clearRect(0, 0, 80, 80); g.font = `48px ${f}`; g.textBaseline = 'middle'; return f; };
        const pic = (ch, f) => { px(f); g.fillText(ch, 8, 40); return g.getImageData(0, 0, 80, 80).data.join(''); };
        for (const ch of new Set([...w.words.keys()].join('') + (w.o.title || '') + w.rules.map(r => r.line || '').join(''))) if (ch.trim() && pic(ch, `"${w.o.font.family}", monospace`) === pic(ch, 'monospace')) miss.add(ch);
        return [...miss];
      },
      /** when the performance writes each word: [{ t, id }] */
      get timeline() { return (w.ops || []).filter(o => o.type === 'word').map(o => ({ t: o.t1, id: o.id })); },
      state() {
        const ink = w.fluid.readInk(); let sum = 0, h = 2166136261; for (let i = 0; i < ink.length; i += 4) { sum += ink[i] + ink[i + 1] + ink[i + 2]; h = Math.imul(h ^ Math.round(ink[i] * 512), 16777619); }
        const things = {}; for (const t of w.things) if (t.word) things[t.word] = (things[t.word] || 0) + 1; let nan = 0; for (const t of w.things) if (!Number.isFinite(t.x ?? 0) || !Number.isFinite(t.y ?? 0)) nan++;
        for (const t of w.things) { h = Math.imul(h ^ Math.round((t.x || 0) * 8), 16777619); h = Math.imul(h ^ Math.round((t.y || 0) * 8), 16777619); }
        return { t: w.t, things, ink: sum / (ink.length / 4) / 3, lines: w.lines.slice(), fired: Object.assign({}, w.fired), cues: Object.assign({}, w.cueNames), violations: w.violations, bodies: w.bodies, night: w.night, hash: h >>> 0, W: w.W, H: w.H, nan, summoned: w.summoned.map(s => s.id) };
      },
      /** the performance's sound as a WAV (base64), rendered offline from the cues collected so far */
      async audio(seconds = w.t) { const r = await w.sound.render(w.cues, seconds); const b = new Uint8Array(r.wav); let s = ''; for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768)); return { wav: btoa(s), peak: r.peak, rms: r.rms, seconds: r.seconds, cues: w.cues.length }; }
    };
  }
}

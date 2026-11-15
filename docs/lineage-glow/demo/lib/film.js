// lineage-glow · film.js — the film: a 1080×1920 canvas of warm light on black, a camera over a world of glowing
// lines (world layers), and the type that rides above it (captions, the counter, the timeline axis, drifting words).
// Every frame is a pure function of t: seek(t) draws it. The same page plays live (with the synthesised score) and is
// rendered frame by frame to MP4 by scripts/render.mjs.
import { clamp, lerp, keys, steps, env, win, ease, fmt, rgba, hash, noise1 } from './core.js';
import { Glow, PALETTE, makeSprites } from './glow.js';
import { renderScore } from './score.js';
export * from './core.js';
export { PALETTE } from './glow.js';

const Q = new URLSearchParams(location.search);
const FONT = 'LG Sans';

export class Film {
  // opts: { dur, fps = 30, W = 1080, H = 1920, center = [540, 1240] (screen point the camera looks through — the root
  //   sits here at the start), palette, bloom = .85, grain = .05, dust = 1, fadeIn = .8, fadeOut = 1.5, score, title }
  constructor(o = {}) {
    Object.assign(this, { dur: o.dur ?? 12, fps: o.fps ?? 30, W: o.W ?? 1080, H: o.H ?? 1920, title: o.title ?? 'lineage-glow' });
    this.center = o.center ?? [this.W / 2, this.H * .645];
    this.P = { ...PALETTE, ...(o.palette || {}) };
    this.bloomA = o.bloom ?? .85; this.grainA = o.grain ?? .05; this.dustA = o.dust ?? 1;
    this.fadeIn = o.fadeIn ?? .8; this.fadeOut = o.fadeOut ?? 1.5; this.score = o.score ?? null;
    this.off = new Set((Q.get('off') || '').split(',').filter(Boolean));
    this.scale = +(Q.get('scale') || 1);
    this.worlds = []; this.captions = []; this.counters = []; this.axes = []; this.wordsets = []; this.overlays = []; this.rules = []; this.beats = [];
    this.cam = () => ({ x: 0, y: 0, zoom: 1 });
    this._cache = new Map(); this._texts = new Set();
    this.renderScore = renderScore;
  }
  // ── authoring API ─────────────────────────────────────────────────────────────────────────────────────────────────
  // camera keys: [[t, {x, y, zoom}, ease?], …] — y: the world row seen at the center point; zoom < 1 pulls back
  // or a function t => {x, y, zoom} (e.g. following a growing tip)
  camera(list) { if (typeof list === 'function') { this.cam = t => ({ x: 0, y: 0, zoom: 1, ...list(t), ...this._shake(t) }); return this; } const f = keys(list.map(([t, v, e]) => [t, { x: 0, y: 0, zoom: 1, ...v }, e])); this.cam = t => { const c = f(t); return { ...c, ...this._shake(t) }; }; return this; }
  _shake() { return {}; }
  // a world layer: fn(g, t) draws with the Glow painter in world coordinates (additive light)
  world(fn) { this.worlds.push(fn); return this; }
  // a screen overlay drawn after bloom (ctx in 1080×1920 px): fn(ctx, t, film)
  overlay(fn) { this.overlays.push(fn); return this; }
  // a named stretch of the film (for sheets and check.mjs output). Beats should tile the film.
  beat(name, t0, t1) { this.beats.push({ name, start: t0, dur: +(t1 - t0).toFixed(3) }); return this; }
  // a two-line caption at the top: text with '\n' line breaks and *gold* words. o: { y = 330, size = 46, fi, fo, color, dim }
  caption(t0, t1, text, o = {}) { this.captions.push({ t0, t1, text, y: o.y ?? 330, size: o.size ?? 46, lh: o.lh ?? 1.42, fi: o.fi ?? .5, fo: o.fo ?? .5, color: o.color, dim: o.dim ?? 1, name: o.name ?? text.split('\n')[0] }); return this; }
  // the counter: a small gold label over a big number that steps, each change blurring the old value away.
  // o: { t0, t1, steps: [[t, value, label?], …], label: 'text' (default label), y = 250, size = 96, labelSize = 27,
  //      gold: t (from here the number turns gold and glows), format: v => string }
  counter(o) { this.counters.push({ y: 275, size: 96, labelSize: 27, fi: .5, fo: .5, blur: .34, format: fmt, ...o, st: steps(o.steps) }); return this; }
  // the timeline axis: small grey ticks pinned to world rows on the left edge. ticks: [[worldY, 'label'], …] or t => ticks
  axis(t0, t1, ticks, o = {}) { this.axes.push({ t0, t1, ticks, x: o.x ?? 52, size: o.size ?? 19, a: o.a ?? .55, fi: o.fi ?? .8, fo: o.fo ?? .8, top: o.top ?? 470, bottom: o.bottom ?? this.H * .78 }); return this; }
  // words that drift in around the subject and fade (the things that do not define a person, the names of a crowd …)
  // items: [{ text, x, y }] in screen px. o: { size = 34, stagger = .3, drift = 14, a = .8 }
  words(t0, t1, items, o = {}) { this.wordsets.push({ t0, t1, items, size: o.size ?? 34, stagger: o.stagger ?? .3, drift: o.drift ?? 14, a: o.a ?? .8, fi: o.fi ?? .7, fo: o.fo ?? .9 }); return this; }
  // a rule the film must keep (check.mjs samples it): fn(t) → true when fine
  check(name, fn) { this.rules.push({ name, fn }); return this; }
  // a camera shake / hit (rarely: the style is calm). fn(t) → {x, y}
  shake(fn) { this._shake = fn; return this; }

  // ── rendering ─────────────────────────────────────────────────────────────────────────────────────────────────────
  async start() {
    const render = Q.has('render') || Q.has('t');
    const cv = this.canvas = document.createElement('canvas');
    cv.width = Math.round(this.W * this.scale); cv.height = Math.round(this.H * this.scale);
    this.ctx = cv.getContext('2d', { alpha: false });
    document.body.style.cssText = 'margin:0;background:#000;overflow:hidden;height:100vh;display:flex;align-items:center;justify-content:center';
    document.body.appendChild(cv);
    await this._fonts();
    this.sprites = makeSprites(this.P);
    const sw = Math.round(cv.width / 4), sh = Math.round(cv.height / 4);
    this._b1 = new OffscreenCanvas(sw, sh); this._b2 = new OffscreenCanvas(Math.round(sw / 2), Math.round(sh / 2));
    this._grain = Array.from({ length: 4 }, (_, i) => noiseTile(256, 256, 11 + i));
    this._vig = vignette(this.W, this.H);
    Object.assign(window, {
      film: this, DURATION: this.dur, FPS: this.fps, SIZE: { W: this.W, H: this.H },
      seek: t => this.render(t), runChecks: t => this.runChecks(t), shotAt: t => this.beatAt(t), textCheck: t => this.textCheck(t),
      glyphCheck: () => this.glyphCheck(),
    });
    if (render) { cv.style.width = Math.min(innerWidth, innerHeight * 9 / 16) + 'px'; this.render(+(Q.get('t') || 0)); }
    else this._player();
    window.__ready = true;
  }
  async _fonts() {
    const base = new URL('./fonts/', import.meta.url).href;
    for (const [w, f] of [[600, 'Pretendard-SemiBold.subset.woff2'], [800, 'Pretendard-Bold.subset.woff2']]) {
      const face = new FontFace(FONT, `url(${base}${f})`, { weight: String(w) }); await face.load(); document.fonts.add(face);
    }
  }
  beatAt(t) { return this.beats.find(b => t >= b.start && t < b.start + b.dur) || this.beats[this.beats.length - 1] || { name: '—', start: 0, dur: this.dur }; }
  runChecks(t) { const bad = []; for (const r of this.rules) { let ok; try { ok = r.fn(t); } catch (e) { ok = false; } if (!ok) bad.push(r.name); } return bad; }

  render(t, o = {}) {
    t = clamp(t, 0, this.dur); this.t = t;
    const c = this.ctx, s = this.scale, W = this.W, H = this.H;
    c.setTransform(s, 0, 0, s, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.filter = 'none';
    // ground: near-black with a warm pool where the root sits
    c.fillStyle = this.P.bg; c.fillRect(0, 0, W, H);
    const cam = this.cam(t), g = new Glow(this, c, cam, { t });
    const pool = c.createRadialGradient(this.center[0], this.center[1], 0, this.center[0], this.center[1], H * .62);
    pool.addColorStop(0, rgba(this.P.bg2, .9)); pool.addColorStop(1, rgba(this.P.bg2, 0)); c.fillStyle = pool; c.fillRect(0, 0, W, H);
    if (!this.off.has('dust')) this._dust(c, t);
    c.globalCompositeOperation = 'lighter';
    for (const w of this.worlds) w(g, t, this);
    c.globalCompositeOperation = 'source-over';
    if (!this.off.has('bloom')) this._bloom(c);
    // type and labels: crisp, after bloom
    if (!this.off.has('text') && !o.noText) {
      this._labels(c, g.labels); this._axes(c, t, g); this._words(c, t); this._counters(c, t); this._captions(c, t);
      for (const f of this.overlays) { c.save(); f(c, t, this); c.restore(); }
    }
    if (!this.off.has('grain')) { c.globalCompositeOperation = 'overlay'; c.globalAlpha = this.grainA * 4; const tile = this._grain[Math.floor(t * this.fps) % 4]; c.fillStyle = c.createPattern(tile, 'repeat'); c.fillRect(0, 0, W, H); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    if (!this.off.has('vignette')) c.drawImage(this._vig, 0, 0, W, H);
    const fade = Math.min(win(t, 0, this.fadeIn, 'sine'), win(this.dur - t, 0, this.fadeOut, 'sine'));
    if (fade < 1) { c.fillStyle = `rgba(0,0,0,${1 - fade})`; c.fillRect(0, 0, W, H); }
    return this;
  }
  _bloom(c) {
    const a = this.bloomA; if (a <= 0) return;
    const b1 = this._b1.getContext('2d'), b2 = this._b2.getContext('2d');
    b1.filter = `blur(${Math.max(1, 5 * this.scale)}px)`; b1.globalCompositeOperation = 'copy'; b1.drawImage(this.canvas, 0, 0, this._b1.width, this._b1.height);
    b2.filter = `blur(${Math.max(1, 7 * this.scale)}px)`; b2.globalCompositeOperation = 'copy'; b2.drawImage(this._b1, 0, 0, this._b2.width, this._b2.height);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'lighter';
    c.globalAlpha = a * .55; c.drawImage(this._b1, 0, 0, this.canvas.width, this.canvas.height);
    c.globalAlpha = a * .75; c.drawImage(this._b2, 0, 0, this.canvas.width, this.canvas.height);
    c.restore();
  }
  _dust(c, t) {
    const n = Math.round(46 * this.dustA);
    for (let i = 0; i < n; i++) {
      const x = (hash(i, 1) * this.W + noise1(t * .05 + i, 3) * 60 + t * (hash(i, 4) - .5) * 6 + this.W) % this.W;
      const y = (hash(i, 2) * this.H - t * (4 + hash(i, 5) * 8) + this.H * 4) % this.H;
      const r = 1.2 + hash(i, 6) ** 3 * 9, a = (.05 + hash(i, 7) * .12) * (.6 + .4 * Math.sin(t * .7 + i));
      c.fillStyle = rgba(this.P.halo, a * (r > 6 ? .35 : 1)); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    }
  }
  _font(size, weight = 600) { return `${weight} ${size}px "${FONT}"`; }
  _labels(c, list) {
    c.textBaseline = 'middle';
    for (const L of list) {
      c.font = this._font(L.size, L.weight); c.textAlign = L.align; c.globalAlpha = clamp(L.a);
      c.shadowColor = 'rgba(0,0,0,.85)'; c.shadowBlur = 10; c.fillStyle = L.color; c.fillText(L.text, L.x, L.y);
      if (L.glow) { c.shadowColor = rgba(this.P.halo, .9); c.shadowBlur = 18 * L.glow; c.fillText(L.text, L.x, L.y); }
      c.shadowBlur = 0;
    }
    c.globalAlpha = 1;
  }
  _axes(c, t, g) {
    for (const A of this.axes) {
      const e = env(t, A.t0, A.t1, A.fi, A.fo); if (e <= 0) continue;
      const ticks = typeof A.ticks === 'function' ? A.ticks(t) : A.ticks;
      c.font = this._font(A.size); c.textAlign = 'left'; c.textBaseline = 'middle';
      let lastY = Infinity;                                   // bottom → top, skip a tick closer than 1.6 × size to the last one
      for (const [wy, text] of ticks.slice().sort((a, b) => b[0] - a[0])) {
        const sy = g.Y(wy); if (sy < A.top - 30 || sy > A.bottom + 30 || lastY - sy < A.size * 1.6) continue; lastY = sy;
        const edge = Math.min(clamp((sy - A.top) / 60 + .5), clamp((A.bottom - sy) / 60 + .5));
        c.globalAlpha = e * A.a * edge; c.fillStyle = this.P.mute; c.fillRect(A.x, sy - .75, 16, 1.5); c.fillText(text, A.x + 24, sy + 1);
        this._texts.add(String(text));
      }
    }
    c.globalAlpha = 1;
  }
  _words(c, t) {
    for (const S of this.wordsets) {
      if (t < S.t0 || t > S.t1) continue;
      c.font = this._font(S.size); c.textAlign = 'center'; c.textBaseline = 'middle';
      S.items.forEach((w, i) => {
        const t0 = S.t0 + i * S.stagger, e = env(t, t0, S.t1 - (S.items.length - 1 - i) * S.stagger * .5, S.fi, S.fo); if (e <= 0) return;
        const out = t > S.t1 - S.fo - (S.items.length - 1 - i) * S.stagger * .5;
        c.globalAlpha = e * S.a; c.filter = out ? `blur(${(1 - e) * 6}px)` : 'none';
        c.fillStyle = this.P.text; c.fillText(w.text, w.x, w.y - (t - t0) * S.drift / 3);
        c.filter = 'none'; this._texts.add(w.text);
      });
    }
    c.globalAlpha = 1;
  }
  _counterLayout(K) { return { lx: this.W / 2, ly: K.y - K.size * .62, nx: this.W / 2, ny: K.y + K.size * .1 }; }
  _counters(c, t) {
    for (const K of this.counters) {
      const e = env(t, K.t0, K.t1, K.fi, K.fo); if (e <= 0) continue;
      const s = K.st(t); if (s.v == null) continue;
      const L = this._counterLayout(K), gold = K.gold != null ? win(t, K.gold, K.gold + .6, 'sine') : 0;
      const p = clamp(s.since / K.blur), entries = p < 1 && s.prev != null ? [[s.v, s.i, p, 1], [s.prev, s.i - 1, 1 - p, -1]] : [[s.v, s.i, 1, 1]];
      for (const [v, idx, a, dir] of entries) {
        const label = (K.steps[idx] && K.steps[idx][2]) ?? K.label ?? '', off = (1 - a) * 22 * dir;
        c.globalAlpha = e * a; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.filter = a < 1 ? `blur(${(1 - a) * 7}px)` : 'none';
        c.font = this._font(K.labelSize); c.fillStyle = this.P.gold; letterSpaced(c, label, L.lx, L.ly + off * .6, K.labelSize * .12);
        c.font = this._font(K.size, 800);
        const num = K.format(v);
        if (gold > 0) { c.shadowColor = rgba(this.P.halo, .95); c.shadowBlur = 30 * gold; c.fillStyle = rgba(this.P.gold, 1); c.globalAlpha = e * a * gold; c.fillText(num, L.nx, L.ny + off); c.shadowBlur = 0; }
        c.globalAlpha = e * a * (1 - gold * .999); c.fillStyle = this.P.text; c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 14; c.fillText(num, L.nx, L.ny + off); c.shadowBlur = 0;
        c.filter = 'none'; this._texts.add(String(label)); this._texts.add(num);
      }
    }
    c.globalAlpha = 1;
  }
  _captionLines(C) { return C.text.split('\n').map(l => l.split(/(\*[^*]+\*)/).filter(Boolean).map(seg => seg[0] === '*' ? { s: seg.slice(1, -1), gold: true } : { s: seg })); }
  _captionBox(C) {
    const c = this.ctx; c.font = this._font(C.size); const lines = this._captionLines(C);
    const ws = lines.map(l => l.reduce((w, seg) => w + c.measureText(seg.s).width, 0)), w = Math.max(...ws), h = C.size * C.lh * lines.length;
    return { x: this.W / 2 - w / 2, y: C.y - C.size * C.lh / 2, w, h, lines, ws };
  }
  _captions(c, t) {
    for (const C of this.captions) {
      const e = env(t, C.t0, C.t1, C.fi, C.fo); if (e <= 0) continue;
      const B = this._captionBox(C), rise = (1 - ease.out(clamp((t - C.t0) / C.fi))) * 12;
      c.font = this._font(C.size); c.textBaseline = 'middle'; c.textAlign = 'left';
      c.filter = e < 1 ? `blur(${(1 - e) * 5}px)` : 'none';
      B.lines.forEach((line, i) => {
        let x = this.W / 2 - B.ws[i] / 2; const y = C.y + i * C.size * C.lh + rise;
        for (const seg of line) {
          c.globalAlpha = e * C.dim; c.shadowColor = 'rgba(0,0,0,.9)'; c.shadowBlur = 16;
          c.fillStyle = seg.gold ? this.P.gold : (C.color ?? this.P.text); c.fillText(seg.s, x, y);
          if (seg.gold) { c.shadowColor = rgba(this.P.halo, .8); c.shadowBlur = 20; c.fillText(seg.s, x, y); }
          c.shadowBlur = 0; x += c.measureText(seg.s).width; this._texts.add(seg.s);
        }
      });
      c.filter = 'none';
    }
    c.globalAlpha = 1;
  }
  // every caption and counter visible at t: its box and the mean luminance of the PICTURE under it (drawn without type)
  textCheck(t) {
    const boxes = [];
    for (const C of this.captions) if (env(t, C.t0, C.t1, C.fi, C.fo) > .5) { const B = this._captionBox(C); boxes.push({ name: C.name, kind: 'caption', x: B.x, y: B.y, w: B.w, h: B.h }); }
    for (const K of this.counters) if (env(t, K.t0, K.t1, K.fi, K.fo) > .5 && K.st(t).v != null) {
      const L = this._counterLayout(K); this.ctx.font = this._font(K.size, 800); const w = this.ctx.measureText(K.format(K.st(t).v)).width;
      boxes.push({ name: 'counter', kind: 'counter', x: L.nx - w / 2, y: L.ly - K.labelSize, w, h: (L.ny + K.size * .55) - (L.ly - K.labelSize) });
    }
    this.render(t, { noText: true });
    const s = this.scale, d = this.ctx;
    for (const b of boxes) {
      const x = Math.max(0, Math.round(b.x * s)), y = Math.max(0, Math.round(b.y * s)), w = Math.max(1, Math.round(b.w * s)), h = Math.max(1, Math.round(b.h * s));
      const px = d.getImageData(x, y, Math.min(w, this.canvas.width - x), Math.min(h, this.canvas.height - y)).data; let L = 0, n = 0;
      for (let i = 0; i < px.length; i += 16) { L += (.2126 * px[i] + .7152 * px[i + 1] + .0722 * px[i + 2]) / 255; n++; }
      b.lum = L / Math.max(1, n);
    }
    this.render(t);
    return boxes;
  }
  // characters drawn so far that the bundled font does not have (they would fall back to a system font)
  glyphCheck() {
    const c = this.ctx, miss = new Set();
    for (const s of this._texts) for (const ch of s) {
      if (ch.trim() === '' || ch.charCodeAt(0) < 128) continue;
      c.font = `600 40px "${FONT}", monospace`; const a = c.measureText(ch).width; c.font = `600 40px "${FONT}", serif`; const b = c.measureText(ch).width;
      if (Math.abs(a - b) > .01) miss.add(ch);
    }
    return [...miss];
  }

  // ── live player ──────────────────────────────────────────────────────────────────────────────────────────────────
  _player() {
    const cv = this.canvas, fit = () => { const h = Math.min(innerHeight - 52, (innerWidth - 16) * 16 / 9); cv.style.height = h + 'px'; cv.style.width = h * 9 / 16 + 'px'; };
    document.body.style.flexDirection = 'column'; fit(); addEventListener('resize', fit);
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:10px;align-items:center;width:min(92vw,520px);height:44px;font:13px system-ui;color:#cbb79a';
    bar.innerHTML = '<button data-k=play style="all:unset;cursor:pointer;width:24px;text-align:center">❚❚</button><input data-k=bar type=range min=0 max=1000 value=0 style="flex:1;accent-color:#e0a24a"><span data-k=time style="width:74px;text-align:right;font-variant-numeric:tabular-nums"></span><button data-k=snd title="score" style="all:unset;cursor:pointer;width:22px;text-align:center">♪</button>';
    document.body.appendChild(bar);
    const $ = k => bar.querySelector(`[data-k=${k}]`);
    let t = +(Q.get('t') || 0), playing = true, last = performance.now(), audio = null;
    const setPlay = p => { playing = p; $('play').textContent = p ? '❚❚' : '▶'; syncAudio(); };
    const syncAudio = () => {
      if (!audio) return; try { audio.src?.stop(); } catch { }
      audio.src = null; if (!playing || !audio.on) return;
      const s = audio.ctx.createBufferSource(); s.buffer = audio.buf; s.connect(audio.ctx.destination); s.start(0, t); audio.src = s;
    };
    $('play').onclick = () => setPlay(!playing);
    cv.onclick = () => setPlay(!playing);
    $('bar').oninput = e => { t = e.target.value / 1000 * this.dur; syncAudio(); };
    $('snd').onclick = async () => {
      if (!this.score) { $('snd').textContent = '–'; return; }
      if (!audio) {
        $('snd').textContent = '…'; const ctx = new AudioContext({ sampleRate: 24000 }), sr = ctx.sampleRate;   // 24 kHz live: renders in half the time await new Promise(r => setTimeout(r, 30));
        const [L, R] = renderScore(this.score, sr, this.dur), buf = ctx.createBuffer(2, L.length, sr); buf.copyToChannel(L, 0); buf.copyToChannel(R, 1);
        audio = { ctx, buf, on: false };
      }
      audio.on = !audio.on; $('snd').style.color = audio.on ? '#ffd27a' : ''; $('snd').textContent = '♪'; syncAudio();
    };
    addEventListener('keydown', e => {
      if (e.code === 'Space') { e.preventDefault(); setPlay(!playing); }
      if (e.code === 'ArrowRight') { t = Math.min(this.dur, t + 3); syncAudio(); }
      if (e.code === 'ArrowLeft') { t = Math.max(0, t - 3); syncAudio(); }
    });
    const loop = now => {
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      if (playing) { t += dt; if (t >= this.dur) { t = 0; syncAudio(); } }
      this.render(t); $('bar').value = t / this.dur * 1000; $('time').textContent = `${t.toFixed(1)} / ${this.dur}`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

function letterSpaced(c, text, x, y, sp) {
  if (!sp) return c.fillText(text, x, y);
  const chars = [...text], ws = chars.map(ch => c.measureText(ch).width), total = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
  const al = c.textAlign; c.textAlign = 'left'; let cx = x - total / 2;
  chars.forEach((ch, i) => { c.fillText(ch, cx, y); cx += ws[i] + sp; }); c.textAlign = al;
}
function noiseTile(w, h, seed) {
  const cv = new OffscreenCanvas(w, h), c = cv.getContext('2d'), img = c.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const v = 128 + (hash(i, seed) - .5) * 90; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  c.putImageData(img, 0, 0); return cv;
}
function vignette(W, H) {
  const cv = new OffscreenCanvas(W, H), c = cv.getContext('2d'), g = c.createRadialGradient(W / 2, H * .55, H * .28, W / 2, H * .55, H * .78);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.62)'); c.fillStyle = g; c.fillRect(0, 0, W, H); return cv;
}
